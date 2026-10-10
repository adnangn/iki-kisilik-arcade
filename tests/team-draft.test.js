import test from 'node:test';
import assert from 'node:assert/strict';
import { TeamDraftError, createTeamDraft, normalizeTeamDraft, assignTeamCard } from '../js/team-draft.js';
import { changeRoom, RoomError } from '../js/room-state.js';

const HOST = 'owner-uid';
const GUEST = 'guest-uid';
// A 30-card pool supplies ten unique groups; the eleventh reuses cards only
// after that pool is exhausted. Reuse never creates duplicates within a group.
const triplets = Array.from({ length: 11 }, (_, index) => ({
  etiket: 'FV', cards: index === 10 ? [1, 2, 3] : [index * 3 + 1, index * 3 + 2, index * 3 + 3],
}));
function waitingRoom(mode = 'team-draft') {
  return { code: '123456', ownerUid: HOST, datasetId: 'futbol', mode,
    players: { p1: { uid: HOST, name: 'Ada' }, p2: { uid: GUEST, name: 'Deniz' } },
    status: 'waiting', starterSeat: 'p1', round: 1, revision: 0 };
}
function finishPlayer(game, seat) {
  let next = game;
  while (!next.players[seat].done) {
    const cards = next.triplets[next.players[seat].roundIndex].cards;
    for (const [index, role] of ['start', 'bench', 'cut'].entries()) next = assignTeamCard(next, seat, role, cards[index]);
  }
  return next;
}
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}

test('team draft creates eleven shared tagged groups and two independent players', () => {
  const game = createTeamDraft(triplets);
  assert.equal(game.phase, 'playing'); assert.equal(game.reusePolicy, 'pool-reset');
  assert.equal(game.assignmentCount, 0); assert.equal(game.lastAssignment, null);
  assert.deepEqual(game.players.p1, { roundIndex: 0, pending: {}, selections: {}, done: false });
  assert.deepEqual(game.players.p1, game.players.p2);
  assert.notEqual(game.players.p1, game.players.p2);
  assert.notEqual(game.players.p1.pending, game.players.p2.pending);
  game.triplets[0].cards[0] = 999;
  assert.equal(triplets[0].cards[0], 1);
});

test('malformed groups, duplicate candidates and changing reused labels are rejected', () => {
  for (const input of [null, triplets.slice(0, 10), [...triplets, triplets[0]]]) {
    assert.throws(() => createTeamDraft(input), TeamDraftError);
  }
  for (const edit of [
    groups => { groups[0].etiket = ''; },
    groups => { groups[0].cards = [1, 1, 2]; },
    groups => { groups[0].cards = [1, 2]; },
    groups => { groups[0].cards = [1, 2, '3']; },
    groups => { groups[0].cards = [1, 2, 0]; },
    groups => { groups[10].etiket = 'DF'; },
  ]) {
    const groups = structuredClone(triplets); edit(groups);
    assert.throws(() => createTeamDraft(groups), TeamDraftError);
  }
});

test('role and card are assigned atomically; neither may be changed or reused this round', () => {
  const initial = createTeamDraft(triplets);
  const game = assignTeamCard(initial, 'p1', 'bench', 2);
  assert.deepEqual(game.players.p1.pending, { bench: 2 });
  assert.equal(game.players.p1.roundIndex, 0);
  assert.equal(game.assignmentCount, 1);
  assert.deepEqual(game.lastAssignment, { seat: 'p1', role: 'bench', cardId: 2, roundIndex: 0, sequence: 1 });
  assert.throws(() => assignTeamCard(game, 'p1', 'bench', 3), error => error.code === 'ROLE_OCCUPIED');
  assert.throws(() => assignTeamCard(game, 'p1', 'start', 2), error => error.code === 'CARD_ASSIGNED');
  assert.throws(() => assignTeamCard(game, 'p1', 'start', 4), error => error.code === 'INVALID_CARD');
  assert.throws(() => assignTeamCard(game, 'p1', 'captain', 1), error => error.code === 'INVALID_ROLE');
  assert.throws(() => assignTeamCard(game, 'p3', 'start', 1), error => error.code === 'INVALID_SEAT');
  assert.deepEqual(initial.players.p1.pending, {});
});

test('three roles advance only their owner; the other player retains the original shared group', () => {
  let game = createTeamDraft(triplets);
  game = assignTeamCard(game, 'p2', 'cut', 3);
  const opponent = structuredClone(game.players.p2);
  game = assignTeamCard(game, 'p1', 'cut', 1);
  game = assignTeamCard(game, 'p1', 'start', 3);
  game = assignTeamCard(game, 'p1', 'bench', 2);
  assert.equal(game.players.p1.roundIndex, 1);
  assert.deepEqual(game.players.p1.pending, {});
  assert.deepEqual(game.players.p1.selections, { r1: { start: 3, bench: 2, cut: 1 } });
  assert.deepEqual(game.players.p2, opponent);
  assert.equal(game.assignmentCount, 4);
  assert.deepEqual(game.lastAssignment, { seat: 'p1', role: 'bench', cardId: 2, roundIndex: 0, sequence: 4 });
  assert.throws(() => assignTeamCard(game, 'p1', 'start', 1), error => error.code === 'INVALID_CARD');
  game = assignTeamCard(game, 'p2', 'bench', 1);
  game = assignTeamCard(game, 'p2', 'start', 2);
  assert.equal(game.players.p2.roundIndex, 1);
  assert.deepEqual(game.players.p2.selections.r1, { start: 2, bench: 1, cut: 3 });
});

test('one completed eleven cannot end the game; the second completes both starting teams', () => {
  let game = finishPlayer(createTeamDraft(triplets), 'p1');
  assert.equal(game.phase, 'playing'); assert.equal(game.assignmentCount, 33);
  assert.equal(game.players.p1.done, true); assert.equal(game.players.p2.done, false);
  assert.equal(game.players.p2.roundIndex, 0);
  assert.throws(() => assignTeamCard(game, 'p1', 'start', 1), error => error.code === 'PLAYER_FINISHED');
  game = finishPlayer(game, 'p2');
  assert.equal(game.phase, 'finished'); assert.equal(game.assignmentCount, 66);
  for (const seat of ['p1', 'p2']) {
    assert.equal(game.players[seat].done, true); assert.equal(game.players[seat].roundIndex, 11);
    assert.equal(Object.keys(game.players[seat].selections).length, 11);
    assert.deepEqual(game.players[seat].pending, {});
    assert.equal(game.players[seat].selections.r11.start, 1);
  }
  assert.deepEqual(normalizeTeamDraft(game), game);
  assert.throws(() => assignTeamCard(game, 'p2', 'start', 1), error => error.code === 'GAME_FINISHED');
});

test('normalization restores RTDB empty objects/nulls at start, between rounds and completion', () => {
  const initial = createTeamDraft(triplets);
  delete initial.lastAssignment;
  for (const seat of ['p1', 'p2']) { delete initial.players[seat].pending; delete initial.players[seat].selections; }
  assert.deepEqual(normalizeTeamDraft(initial), createTeamDraft(triplets));
  let game = createTeamDraft(triplets);
  for (const [index, role] of ['start', 'bench', 'cut'].entries()) game = assignTeamCard(game, 'p1', role, index + 1);
  delete game.players.p1.pending; delete game.players.p2.pending; delete game.players.p2.selections;
  const normalized = normalizeTeamDraft(game);
  assert.deepEqual(normalized.players.p1.pending, {});
  assert.deepEqual(normalized.players.p2.selections, {});
  game = finishPlayer(finishPlayer(normalized, 'p1'), 'p2');
  delete game.players.p1.pending; delete game.players.p2.pending;
  assert.equal(normalizeTeamDraft(game).phase, 'finished');
});

test('normalization rejects forged rounds, unchosen cards, duplicate roles and progress', () => {
  let valid = createTeamDraft(triplets);
  for (const [index, role] of ['start', 'bench', 'cut'].entries()) valid = assignTeamCard(valid, 'p1', role, index + 1);
  valid = assignTeamCard(valid, 'p2', 'start', 3);
  const edits = [
    game => { game.players.p1.roundIndex = 2; },
    game => { game.players.p1.done = true; },
    game => { game.players.p1.selections.r1.start = 4; },
    game => { game.players.p1.selections.r1.bench = 1; },
    game => { delete game.players.p1.selections.r1.cut; },
    game => { game.players.p1.selections.r2 = game.players.p1.selections.r1; delete game.players.p1.selections.r1; },
    game => { game.players.p2.pending.start = 4; },
    game => { game.players.p2.pending.bench = 3; },
    game => { game.players.p2.pending = { start: 1, bench: 2, cut: 3 }; },
    game => { game.assignmentCount += 1; },
    game => { game.lastAssignment.sequence -= 1; },
    game => { game.lastAssignment.cardId = 2; },
    game => { game.lastAssignment.roundIndex = 1; },
    game => { game.phase = 'finished'; },
    game => { delete game.lastAssignment; },
    game => { game.reusePolicy = 'unlimited'; },
  ];
  for (const edit of edits) {
    const altered = structuredClone(valid); edit(altered);
    assert.throws(() => normalizeTeamDraft(altered), TeamDraftError);
  }
  assert.deepEqual(normalizeTeamDraft(valid), valid);
});

test('assignments and transaction retries leave all input groups/player states untouched', () => {
  const game = freeze(createTeamDraft(triplets));
  const saved = structuredClone(game);
  const next = assignTeamCard(game, 'p1', 'start', 1);
  const retry = assignTeamCard(game, 'p1', 'start', 1);
  assert.deepEqual(next, retry);
  next.triplets[0].cards[0] = 999; next.players.p1.pending.start = 999;
  next.players.p2.roundIndex = 9; next.lastAssignment.cardId = 999;
  assert.deepEqual(game, saved); assert.equal(retry.players.p1.pending.start, 1);
});

test('team room start/assign enforce owner, membership, mode and a shared revision', () => {
  const waiting = waitingRoom();
  assert.throws(() => changeRoom(waiting, GUEST, 0, 'start', { triplets }), RoomError);
  const alone = waitingRoom(); delete alone.players.p2;
  assert.throws(() => changeRoom(alone, HOST, 0, 'start', { triplets }), RoomError);
  const before = changeRoom(waiting, HOST, 0, 'start', { triplets });
  assert.equal(before.game.activeSeat, undefined);
  assert.throws(() => changeRoom(before, 'stranger', before.revision, 'assign', { role: 'start', cardId: 1 }), RoomError);
  const after = changeRoom(before, HOST, before.revision, 'assign', { role: 'start', cardId: 1 });
  assert.throws(() => changeRoom(after, GUEST, before.revision, 'assign', { role: 'start', cardId: 2 }), RoomError);
  const updated = changeRoom(after, GUEST, after.revision, 'assign', { role: 'start', cardId: 2 });
  assert.deepEqual(updated.game.players.p1.pending, { start: 1 });
  assert.deepEqual(updated.game.players.p2.pending, { start: 2 });
  assert.deepEqual(updated.lastAction, { kind: 'assign', seat: 'p2' });
  for (const command of ['bid', 'pass', 'rank', 'choose']) {
    assert.throws(() => changeRoom(updated, HOST, updated.revision, command, { amount: 3, slot: 1, cardId: 3 }), RoomError);
  }
  const auction = changeRoom(waitingRoom('auction'), HOST, 0, 'start', { deck: Array.from({ length: 30 }, (_, index) => index + 1) });
  assert.throws(() => changeRoom(auction, HOST, auction.revision, 'assign', { role: 'start', cardId: 1 }), RoomError);
});

test('team room finishes only after both elevens, then rematch resets without changing seats', () => {
  let room = changeRoom(waitingRoom(), HOST, 0, 'start', { triplets });
  for (const uid of [HOST, GUEST]) {
    const seat = uid === HOST ? 'p1' : 'p2';
    while (!room.game.players[seat].done) {
      const cards = room.game.triplets[room.game.players[seat].roundIndex].cards;
      for (const [index, role] of ['start', 'bench', 'cut'].entries()) {
        room = changeRoom(room, uid, room.revision, 'assign', { role, cardId: cards[index] });
      }
    }
    assert.equal(room.status, uid === HOST ? 'playing' : 'finished');
  }
  const saved = structuredClone(room);
  const next = changeRoom(room, GUEST, room.revision, 'rematch', { triplets });
  assert.equal(next.code, room.code); assert.deepEqual(next.players, room.players);
  assert.equal(next.mode, 'team-draft'); assert.equal(next.round, 2); assert.equal(next.starterSeat, 'p2');
  assert.equal(next.status, 'playing'); assert.equal(next.game.assignmentCount, 0);
  assert.equal(next.game.lastAssignment, null);
  assert.deepEqual(next.game.players.p1, { roundIndex: 0, pending: {}, selections: {}, done: false });
  assert.deepEqual(next.game.players.p1, next.game.players.p2);
  assert.equal(changeRoom(next, HOST, next.revision, 'assign', { role: 'start', cardId: 1 }).game.players.p1.pending.start, 1);
  assert.deepEqual(room, saved);
});
