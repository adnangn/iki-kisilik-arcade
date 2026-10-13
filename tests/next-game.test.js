import test from 'node:test';
import assert from 'node:assert/strict';
import { changeRoom, nextGameConfig, nextGameReady, RoomError } from '../js/room-state.js';

const HOST = 'owner-uid', GUEST = 'guest-uid';
const modes = ['auction', 'blind-ranking', 'bracket', 'team-draft', 'frequency', 'double-ranking'];
const deck = Array.from({ length: 40 }, (_, index) => index + 1);
const triplets = Array.from({ length: 11 }, (_, index) => ({ etiket: 'FV', cards: deck.slice(index * 3, index * 3 + 3) }));
const setup = () => ({ deck: [...deck], triplets: structuredClone(triplets) });
const move = (room, seat, command, payload) => changeRoom(room, room.players[seat].uid, room.revision, command, payload);

function waiting(mode = 'auction', solo = false) {
  return { code: '123456', createdAt: 100, ownerUid: HOST, datasetId: 'futbol', mode,
    players: { p1: { uid: HOST, name: 'Ada' }, ...(!solo && { p2: { uid: GUEST, name: 'Deniz' } }) },
    status: 'waiting', starterSeat: 'p1', round: 1, revision: 0,
    ...(mode === 'bracket' && { bracketSize: 16 }) };
}

function finished(mode = 'auction', solo = false) {
  let room = move(waiting(mode, solo), 'p1', 'start', setup());
  while (room.status === 'playing') {
    if (mode === 'auction') room = move(room, room.game.turnSeat, 'pass');
    else if (mode === 'blind-ranking') room = move(room, room.game.activeSeat, 'rank', { slot: room.game.deckIndex + 1 });
    else if (mode === 'bracket') room = move(room, room.game.activeSeat, 'choose', { cardId: room.game.currentPair.left });
    else if (mode === 'team-draft') {
      for (const seat of ['p1', 'p2']) {
        const player = room.game.players[seat];
        if (player.done) continue;
        const trio = room.game.triplets[player.roundIndex].cards;
        for (const [index, role] of ['start', 'bench', 'cut'].entries()) room = move(room, seat, 'assign', { role, cardId: trio[index] });
      }
    } else if (mode === 'frequency') {
      if (room.game.stage === 'choosing') {
        const cardId = room.game.deck[room.game.roundIndex * 2];
        room = move(room, 'p1', 'frequency-reveal', { choices: { p1: cardId, p2: cardId } });
      } else room = move(room, 'p1', 'frequency-next');
    } else {
      const slots = Object.fromEntries(room.game.deck.map((id, index) => [`s${index + 1}`, id]));
      room = move(room, 'p1', 'double-reveal', { rankings: { p1: slots, p2: slots } });
    }
  }
  return room;
}

function propose(room, mode = 'frequency', extra = {}, seat = 'p1') {
  return move(room, seat, 'propose-next', { datasetId: 'yemek-vol1', mode, ...extra });
}

function ready(room, seat, value = true, extra = {}) {
  return move(room, seat, 'ready-next', { id: room.nextGame.id, ready: value, ...setup(), ...extra });
}

test('a proposal preserves the completed match, code, identities and roles until both approve', () => {
  const source = finished();
  const saved = structuredClone(source);
  const proposed = propose(source, 'frequency', {}, 'p2');
  assert.deepEqual(source, saved);
  assert.equal(proposed.revision, source.revision + 1);
  assert.deepEqual(proposed.nextGame, { id: proposed.revision, datasetId: 'yemek-vol1', mode: 'frequency',
    proposedBySeat: 'p2', ready: { p1: false, p2: false } });
  for (const key of ['code', 'createdAt', 'ownerUid', 'datasetId', 'mode', 'players', 'round', 'starterSeat', 'status', 'game']) {
    assert.deepEqual(proposed[key], source[key]);
  }
  const first = ready(proposed, 'p1');
  assert.equal(first.status, 'finished');
  assert.deepEqual(first.game, source.game);
  assert.deepEqual(first.nextGame.ready, { p1: true, p2: false });
  assert.equal(nextGameReady(first), false);
});

test('second approval changes the game atomically and keeps the room connection', () => {
  const first = ready(propose(finished()), 'p2');
  const saved = structuredClone(first);
  const started = ready(first, 'p1');
  assert.equal(started.code, first.code);
  assert.equal(started.createdAt, first.createdAt);
  assert.equal(started.ownerUid, first.ownerUid);
  assert.deepEqual(started.players, first.players);
  assert.equal(started.datasetId, 'yemek-vol1');
  assert.equal(started.mode, 'frequency');
  assert.equal(started.round, first.round + 1);
  assert.equal(started.revision, first.revision + 1);
  assert.equal(started.starterSeat, 'p2');
  assert.equal(started.status, 'playing');
  assert.equal(started.nextGame, undefined);
  assert.deepEqual(started.lastAction, { kind: 'next-game', seat: 'p1' });
  assert.equal(started.game.score, 0);
  assert.equal(started.game.roundIndex, 0);
  assert.deepEqual(first, saved);
});

test('every completed mode can switch to every other mode with fresh state and swapped starter', () => {
  for (const oldMode of modes) {
    const source = finished(oldMode);
    for (const mode of modes) {
      const proposal = propose(source, mode, mode === 'bracket' ? { bracketSize: 32 } : {});
      const started = ready(ready(proposal, 'p1'), 'p2');
      assert.equal(started.mode, mode, `${oldMode} → ${mode}`);
      assert.equal(started.round, 2);
      assert.equal(started.starterSeat, 'p2');
      assert.equal(started.status, 'playing');
      assert.equal(started.game.phase, 'playing');
      assert.equal(started.game.activeSeat, ['bracket', 'blind-ranking'].includes(mode) ? 'p2' : undefined);
      if (mode === 'bracket') {
        assert.equal(started.bracketSize, 32);
        assert.equal(started.game.deck.length, 32);
        assert.equal(started.game.matchIndex, 0);
        assert.deepEqual(started.game.choices, {});
      } else assert.equal(started.bracketSize, undefined);
      if (mode === 'auction') {
        assert.deepEqual(started.game.budgets, { p1: 20, p2: 20 });
        assert.deepEqual(started.game.rosters, { p1: [], p2: [] });
      }
      if (mode === 'team-draft') assert.equal(started.game.assignmentCount, 0);
      if (mode === 'frequency') assert.deepEqual(started.game.results, {});
      if (mode === 'double-ranking') {
        assert.deepEqual(started.game.rankings, {});
        assert.equal(started.game.result, null);
      }
    }
  }
});

test('a new proposal invalidates old consent and stale ready clicks, even for the same config', () => {
  const first = ready(propose(finished()), 'p1');
  for (const mode of ['frequency', 'bracket']) {
    const updated = propose(first, mode, mode === 'bracket' ? { bracketSize: 32 } : {}, 'p2');
    assert.deepEqual(updated.nextGame.ready, { p1: false, p2: false });
    assert.equal(updated.nextGame.id, updated.revision);
    assert.notEqual(updated.nextGame.id, first.nextGame.id);
    assert.throws(() => ready(updated, 'p2', true, { id: first.nextGame.id }), /seçimi değişti/);
    assert.deepEqual(updated.game, first.game);
  }
});

test('competing ready commands from one snapshot cannot apply twice or silently start a different proposal', () => {
  const proposed = propose(finished());
  const first = ready(proposed, 'p1');
  assert.throws(() => changeRoom(first, GUEST, proposed.revision, 'ready-next', {
    id: proposed.nextGame.id, ready: true, ...setup() }), /Oda güncellendi/);
  const started = ready(first, 'p2');
  assert.throws(() => changeRoom(started, HOST, started.revision, 'ready-next', {
    id: proposed.nextGame.id, ready: true, ...setup() }), /seçimi bulunamadı/);
  assert.equal(started.round, 2);
});

test('players can withdraw their own consent; duplicate ready values do not produce new revisions', () => {
  for (const seat of ['p1', 'p2']) {
    const proposed = propose(finished());
    const first = ready(proposed, seat);
    const withdrawn = ready(first, seat, false);
    assert.deepEqual(withdrawn.nextGame.ready, { p1: false, p2: false });
    assert.equal(withdrawn.nextGame.id, proposed.nextGame.id);
    assert.equal(withdrawn.status, 'finished');
    assert.throws(() => ready(withdrawn, seat, false), /zaten güncel/);
    assert.throws(() => ready(withdrawn, seat, 'true'), /Hazır durumunu/);
  }
});

test('a solo player may switch between single-active modes without waiting for a spectator', () => {
  for (const oldMode of ['blind-ranking', 'bracket']) for (const mode of ['blind-ranking', 'bracket']) {
    const proposed = propose(finished(oldMode, true), mode);
    const started = ready(proposed, 'p1');
    assert.equal(started.status, 'playing');
    assert.equal(started.round, 2);
    assert.equal(started.starterSeat, 'p1');
    assert.equal(started.game.activeSeat, 'p1');
    assert.equal(started.players.p2, undefined);
  }
});

test('a solo proposal for a two-active mode stays at results until another player joins and approves', () => {
  for (const mode of ['auction', 'team-draft', 'frequency', 'double-ranking']) {
    const proposed = propose(finished('blind-ranking', true), mode);
    const first = ready(proposed, 'p1');
    assert.equal(first.status, 'finished');
    assert.equal(first.round, 1);
    assert.equal(first.nextGame.ready.p1, true);
    assert.equal(nextGameReady(first), false);
    first.players.p2 = { uid: GUEST, name: 'Deniz' };
    const started = ready(first, 'p2');
    assert.equal(started.status, 'playing');
    assert.equal(started.round, 2);
    assert.equal(started.starterSeat, 'p2');
  }
});

test('seated spectators must also approve when changing a single-active game', () => {
  const proposed = propose(finished('bracket'), 'blind-ranking');
  assert.equal(ready(proposed, 'p1').status, 'finished');
  assert.equal(ready(proposed, 'p2').status, 'finished');
  assert.equal(ready(ready(proposed, 'p1'), 'p2').game.activeSeat, 'p2');
});

test('proposals are available only at results and reject nonmembers without mutating state', () => {
  const active = move(waiting(), 'p1', 'start', setup());
  for (const source of [waiting(), active]) {
    assert.throws(() => propose(source), /turun bitmesi/);
    assert.equal(source.nextGame, undefined);
  }
  const source = finished(), saved = structuredClone(source);
  assert.throws(() => changeRoom(source, 'outsider', source.revision, 'propose-next', {
    datasetId: 'film', mode: 'bracket' }), /oyuncusu değilsiniz/);
  const proposed = propose(source);
  assert.throws(() => changeRoom(proposed, 'outsider', proposed.revision, 'ready-next', {
    id: proposed.nextGame.id, ready: true, ...setup() }), /oyuncusu değilsiniz/);
  assert.deepEqual(source, saved);
});

test('configuration validates available collections, modes and bracket-only sizes', () => {
  assert.deepEqual(nextGameConfig({ datasetId: 'film', mode: 'bracket' }), { datasetId: 'film', mode: 'bracket', bracketSize: 16 });
  for (const config of [null, undefined, [], 'film']) assert.throws(() => nextGameConfig(config), RoomError);
  for (const config of [
    { datasetId: 'oyun-evreni', mode: 'auction' },
    { datasetId: '__proto__', mode: 'auction' },
    { datasetId: 'film', mode: 'unknown' },
    { datasetId: 'film', mode: 'bracket', bracketSize: 64 },
    { datasetId: 'film', mode: 'bracket', bracketSize: '32' },
    { datasetId: 'film', mode: 'auction', bracketSize: 16 },
  ]) assert.throws(() => propose(finished(), config.mode, config), RoomError);
});

test('the deciding consent requires a valid prepared setup and leaves the proposal intact on failure', () => {
  const first = ready(propose(finished(), 'bracket', { bracketSize: 32 }), 'p1');
  const saved = structuredClone(first);
  assert.throws(() => ready(first, 'p2', true, { deck: deck.slice(0, 16) }));
  assert.deepEqual(first, saved);
  const valid = ready(first, 'p2');
  assert.equal(valid.game.deck.length, 32);
  assert.equal(valid.round, 2);
});

test('pending proposals cannot be bypassed by the one-click rematch action', () => {
  const source = finished();
  assert.equal(move(source, 'p2', 'rematch', setup()).round, 2);
  const proposed = propose(source);
  assert.throws(() => move(proposed, 'p1', 'rematch', setup()), /seçilen yeni oyunu/);
  assert.throws(() => ready({ ...proposed, nextGame: { ...proposed.nextGame, ready: { p1: 'true', p2: false } } }, 'p2'), RoomError);
});

test('prepared arrays are reused deterministically across transaction retries and never changed', () => {
  const first = ready(propose(finished(), 'team-draft'), 'p1');
  const payload = { id: first.nextGame.id, ready: true, ...setup() };
  const saved = structuredClone(payload);
  const one = changeRoom(first, GUEST, first.revision, 'ready-next', payload);
  const retry = changeRoom(first, GUEST, first.revision, 'ready-next', payload);
  assert.deepEqual(one, retry);
  assert.deepEqual(payload, saved);
  one.game.triplets[0].cards[0] = 999;
  assert.deepEqual(payload, saved);
});
