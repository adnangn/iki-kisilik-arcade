import test from 'node:test';
import assert from 'node:assert/strict';
import { changeRoom, RoomError, seatFor, hasOptionalSpectator, rematchStarter } from '../js/room-state.js';

const deck = Array.from({ length: 20 }, (_, index) => index + 1);
const HOST = 'owner-uid';
const GUEST = 'guest-uid';

function waitingRoom() {
  return {
    code: '123456',
    ownerUid: HOST,
    datasetId: 'futbol',
    mode: 'auction',
    players: {
      p1: { uid: HOST, name: 'Ada' },
      p2: { uid: GUEST, name: 'Deniz' },
    },
    status: 'waiting',
    starterSeat: 'p1',
    round: 1,
    revision: 0,
  };
}

function playingRoom() {
  return changeRoom(waitingRoom(), HOST, 0, 'start', { deck });
}

function completedRoom() {
  let room = playingRoom();
  while (room.status === 'playing') {
    const uid = room.players[room.game.turnSeat].uid;
    room = changeRoom(room, uid, room.revision, 'pass');
  }
  return room;
}

test('only the owner can start a waiting room with two seated players', () => {
  const waiting = waitingRoom();
  assert.throws(() => changeRoom(waiting, GUEST, 0, 'start', { deck }), RoomError);
  const alone = waitingRoom();
  delete alone.players.p2;
  assert.throws(() => changeRoom(alone, HOST, 0, 'start', { deck }), RoomError);
  const started = changeRoom(waiting, HOST, 0, 'start', { deck });
  assert.equal(started.status, 'playing');
  assert.equal(started.revision, 1);
  assert.equal(started.game.highestBid, 1);
  assert.equal(started.game.bidderSeat, 'p1');
  assert.equal(started.game.turnSeat, 'p2');
  assert.throws(() => changeRoom(started, HOST, 1, 'start', { deck }), RoomError);
});

test('both players bid and pass through the room reducer with correct budgets', () => {
  let room = playingRoom();
  room = changeRoom(room, GUEST, room.revision, 'bid', { amount: 4 });
  assert.equal(room.game.bidderSeat, 'p2');
  assert.equal(room.game.turnSeat, 'p1');
  assert.deepEqual(room.game.budgets, { p1: 20, p2: 20 });
  room = changeRoom(room, HOST, room.revision, 'bid', { amount: 7 });
  room = changeRoom(room, GUEST, room.revision, 'pass');
  assert.equal(room.game.budgets.p1, 13);
  assert.deepEqual(room.game.rosters.p1, [{ id: 1, price: 7 }]);
  assert.equal(room.game.openerSeat, 'p2');
  assert.equal(room.revision, 4);
});

test('a competing command makes the original snapshot revision stale', () => {
  const before = playingRoom();
  const capturedRevision = before.revision;
  const after = changeRoom(before, GUEST, capturedRevision, 'bid', { amount: 4 });
  const saved = structuredClone(after);
  assert.throws(() => changeRoom(after, GUEST, capturedRevision, 'pass'), RoomError);
  // Host now has the turn, but a host command from the stale revision also fails.
  assert.throws(() => changeRoom(after, HOST, capturedRevision, 'pass'), RoomError);
  assert.deepEqual(after, saved);
  assert.equal(after.game.awardCount, 0);
  assert.equal(after.game.highestBid, 4);
  const committed = changeRoom(after, HOST, after.revision, 'pass');
  assert.equal(committed.game.awardCount, 1);
  assert.deepEqual(committed.game.rosters.p2, [{ id: 1, price: 4 }]);
});

test('rematch keeps code and seats, flips the starter, and resets round budgets and rosters', () => {
  const finished = completedRoom();
  assert.equal(finished.status, 'finished');
  assert.equal(finished.game.rosters.p1.length, 5);
  assert.equal(finished.game.rosters.p2.length, 5);
  const saved = structuredClone(finished);
  const rematch = changeRoom(finished, GUEST, finished.revision, 'rematch', { deck: [...deck].reverse() });
  assert.equal(rematch.code, finished.code);
  assert.equal(rematch.ownerUid, HOST);
  assert.deepEqual(rematch.players, finished.players);
  assert.equal(rematch.round, 2);
  assert.equal(rematch.revision, finished.revision + 1);
  assert.equal(rematch.starterSeat, 'p2');
  assert.equal(rematch.status, 'playing');
  assert.deepEqual(rematch.game.budgets, { p1: 20, p2: 20 });
  assert.deepEqual(rematch.game.rosters, { p1: [], p2: [] });
  assert.equal(rematch.game.awardCount, 0);
  assert.equal(rematch.game.currentCardId, 20);
  assert.equal(rematch.game.bidderSeat, 'p2');
  assert.equal(rematch.game.turnSeat, 'p1');
  assert.deepEqual(finished, saved);
});

test('a rematch cannot be started while the current round is still active', () => {
  const playing = playingRoom();
  assert.throws(() => changeRoom(playing, HOST, playing.revision, 'rematch', { deck }), RoomError);
  const waiting = waitingRoom();
  assert.throws(() => changeRoom(waiting, GUEST, waiting.revision, 'rematch', { deck }), RoomError);
});

test('an unseated spectator cannot start, bid, pass, or rematch', () => {
  const examples = [
    [waitingRoom(), 'start', { deck }],
    [playingRoom(), 'bid', { amount: 4 }],
    [playingRoom(), 'pass', {}],
    [completedRoom(), 'rematch', { deck }],
  ];
  for (const [room, command, payload] of examples) {
    const saved = structuredClone(room);
    assert.throws(() => changeRoom(room, 'spectator-uid', room.revision, command, payload), RoomError);
    assert.deepEqual(room, saved);
  }
  assert.equal(seatFor(waitingRoom(), HOST), 'p1');
  assert.equal(seatFor(waitingRoom(), GUEST), 'p2');
  assert.equal(seatFor(waitingRoom(), 'spectator-uid'), null);
});

test('room transitions leave source rooms and caller-owned deck arrays untouched', () => {
  const waiting = waitingRoom();
  const saved = structuredClone(waiting);
  const localDeck = [...deck];
  const first = changeRoom(waiting, HOST, 0, 'start', { deck: localDeck });
  const retry = changeRoom(waiting, HOST, 0, 'start', { deck: localDeck });
  assert.deepEqual(first, retry);
  assert.deepEqual(waiting, saved);
  first.players.p1.name = 'Changed';
  first.game.deck[0] = 99;
  assert.deepEqual(waiting, saved);
  assert.deepEqual(localDeck, deck);
});

test('single-active modes start, finish and rematch while the spectator seat is empty', () => {
  for (const mode of ['blind-ranking', 'bracket']) {
    const waiting = waitingRoom();
    waiting.mode = mode;
    delete waiting.players.p2;
    const payload = { deck: deck.slice(0, mode === 'blind-ranking' ? 10 : 16) };
    assert.equal(hasOptionalSpectator(waiting), true);
    let room = changeRoom(waiting, HOST, waiting.revision, 'start', payload);
    assert.equal(room.game.activeSeat, 'p1');
    while (room.status === 'playing') {
      const move = mode === 'blind-ranking' ? ['rank', { slot: room.game.deckIndex + 1 }] : ['choose', { cardId: room.game.currentPair.left }];
      room = changeRoom(room, HOST, room.revision, ...move);
    }
    assert.equal(rematchStarter(room), 'p1');
    const rematch = changeRoom(room, HOST, room.revision, 'rematch', payload);
    assert.equal(rematch.round, 2);
    assert.equal(rematch.game.activeSeat, 'p1');
    assert.equal(rematch.starterSeat, 'p1');
    assert.equal(rematch.players.p2, undefined);
    assert.equal(rematch.code, waiting.code);
  }
});

test('late spectators do not alter the current role or revision and cannot play; the next round swaps roles', () => {
  for (const mode of ['blind-ranking', 'bracket']) {
    const waiting = waitingRoom(); waiting.mode = mode; delete waiting.players.p2;
    const payload = { deck: deck.slice(0, mode === 'blind-ranking' ? 10 : 16) };
    let current = changeRoom(waiting, HOST, 0, 'start', payload);
    const move = game => mode === 'blind-ranking' ? ['rank', { slot: game.deckIndex + 1 }] : ['choose', { cardId: game.currentPair.left }];
    current = changeRoom(current, HOST, current.revision, ...move(current.game));
    const gameBeforeJoin = structuredClone(current.game);
    const revisionBeforeJoin = current.revision;
    current.players.p2 = { uid: GUEST, name: 'Deniz' };
    assert.throws(() => changeRoom(current, GUEST, current.revision, ...move(current.game)), /izleyicisin/);
    assert.deepEqual(current.game, gameBeforeJoin);
    assert.equal(current.revision, revisionBeforeJoin);
    current = changeRoom(current, HOST, revisionBeforeJoin, ...move(current.game));
    while (current.status === 'playing') current = changeRoom(current, HOST, current.revision, ...move(current.game));
    const rematch = changeRoom(current, HOST, current.revision, 'rematch', payload);
    assert.equal(rematch.starterSeat, 'p2');
    assert.equal(rematch.game.activeSeat, 'p2');
  }
});

test('two-active modes still require both seats before starting', () => {
  for (const mode of ['auction', 'team-draft']) {
    const room = waitingRoom(); room.mode = mode; delete room.players.p2;
    assert.equal(hasOptionalSpectator(room), false);
    assert.throws(() => changeRoom(room, HOST, 0, 'start', { deck }), RoomError);
  }
});
