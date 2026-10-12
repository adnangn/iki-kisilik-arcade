import test from 'node:test';
import assert from 'node:assert/strict';
import { BracketError, createBracket, normalizeBracket, chooseBracketCard } from '../js/bracket.js';
import { changeRoom, RoomError } from '../js/room-state.js';

const deck = Array.from({ length: 30 }, (_, index) => index + 1);
const HOST = 'owner-uid';
const GUEST = 'guest-uid';
function waitingRoom(mode = 'bracket') {
  return { code: '123456', ownerUid: HOST, datasetId: 'futbol', mode,
    players: { p1: { uid: HOST, name: 'Ada' }, p2: { uid: GUEST, name: 'Deniz' } },
    status: 'waiting', starterSeat: 'p1', round: 1, revision: 0 };
}
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}

test('bracket uses the first sixteen shuffled IDs and starts the first pair', () => {
  const pool = [...deck].reverse();
  const game = createBracket(pool, 'p2');
  assert.equal(game.activeSeat, 'p2');
  assert.deepEqual(game.deck, pool.slice(0, 16));
  assert.deepEqual(game.currentPair, { left: 30, right: 29 });
  assert.equal(game.matchIndex, 0);
  assert.equal(game.round, 1);
  assert.deepEqual(game.choices, {});
  assert.equal(game.winnerId, null);
  game.deck[0] = 999;
  assert.equal(pool[0], 30);
});

test('bracket rejects duplicate, short, nonnumeric and oversized seed pools', () => {
  for (const pool of [null, deck.slice(0, 15), [...deck, 1], [...deck, '31'], [...deck, 0],
    [...deck, 1.5], Array.from({ length: 201 }, (_, index) => index + 1)]) {
    assert.throws(() => createBracket(pool), BracketError);
  }
  assert.throws(() => createBracket(deck, 'p3'), error => error.code === 'INVALID_SEAT');
});

test('winners feed quarterfinals, semifinals and the final in knockout order', () => {
  let game = createBracket(deck);
  const firstWinners = [2, 3, 6, 7, 10, 11, 14, 15];
  for (const winner of firstWinners) game = chooseBracketCard(game, 'p1', winner);
  assert.equal(game.matchIndex, 8);
  assert.equal(game.round, 2);
  assert.deepEqual(game.currentPair, { left: 2, right: 3 });
  assert.deepEqual(game.lastChoice, { cardId: 15, loserId: 16, matchIndex: 7, round: 1, sequence: 8 });
  for (const winner of [3, 6, 11, 14]) game = chooseBracketCard(game, 'p1', winner);
  assert.equal(game.matchIndex, 12);
  assert.equal(game.round, 3);
  assert.deepEqual(game.currentPair, { left: 3, right: 6 });
  game = chooseBracketCard(game, 'p1', 6);
  game = chooseBracketCard(game, 'p1', 11);
  assert.equal(game.round, 4);
  assert.deepEqual(game.currentPair, { left: 6, right: 11 });
  game = chooseBracketCard(game, 'p1', 11);
  assert.equal(game.phase, 'finished');
  assert.equal(game.matchIndex, 15);
  assert.equal(game.currentPair, null);
  assert.equal(game.winnerId, 11);
  assert.equal(Object.keys(game.choices).length, 15);
  assert.deepEqual(game.lastChoice, { cardId: 11, loserId: 6, matchIndex: 14, round: 4, sequence: 15 });
  assert.deepEqual(normalizeBracket(game), game);
  assert.throws(() => chooseBracketCard(game, 'p1', 11), error => error.code === 'GAME_FINISHED');
});

test('only the active player can choose a card from the current pair', () => {
  const game = createBracket(deck);
  assert.throws(() => chooseBracketCard(game, 'p2', 1), error => error.code === 'NOT_ACTIVE_PLAYER');
  assert.throws(() => chooseBracketCard(game, 'p3', 1), error => error.code === 'INVALID_SEAT');
  for (const id of [3, '1', null, 0]) {
    assert.throws(() => chooseBracketCard(game, 'p1', id), error => error.code === 'INVALID_CHOICE');
  }
  const next = chooseBracketCard(game, 'p1', 2);
  assert.throws(() => chooseBracketCard(next, 'p1', 2), error => error.code === 'INVALID_CHOICE');
  assert.deepEqual(game.choices, {});
});

test('normalization restores Firebase omissions and rejects tampered knockout history', () => {
  const initial = createBracket(deck);
  delete initial.choices; delete initial.lastChoice; delete initial.winnerId;
  assert.deepEqual(normalizeBracket(initial), createBracket(deck));
  let valid = createBracket(deck);
  for (let match = 0; match < 9; match += 1) valid = chooseBracketCard(valid, 'p1', valid.currentPair.left);
  const edits = [
    game => { game.choices.m1 = 3; },
    game => { game.choices.m9 = 2; },
    game => { delete game.choices.m2; game.choices.m10 = 5; },
    game => { game.round = 1; },
    game => { game.matchIndex = 8; },
    game => { game.currentPair.left = 2; },
    game => { game.winnerId = 1; },
    game => { game.lastChoice.loserId = 16; },
    game => { game.lastChoice.sequence -= 1; },
    game => { delete game.lastChoice; },
    game => { game.phase = 'finished'; },
  ];
  for (const edit of edits) {
    const altered = structuredClone(valid); edit(altered);
    assert.throws(() => normalizeBracket(altered), BracketError);
  }
  while (valid.phase === 'playing') valid = chooseBracketCard(valid, 'p1', valid.currentPair.left);
  delete valid.currentPair;
  assert.equal(normalizeBracket(valid).currentPair, null);
});

test('bracket retries are deterministic and deeply independent of their input', () => {
  const game = freeze(createBracket(deck));
  const saved = structuredClone(game);
  const next = chooseBracketCard(game, 'p1', 2);
  const retry = chooseBracketCard(game, 'p1', 2);
  assert.deepEqual(next, retry);
  next.deck[0] = 999; next.currentPair.left = 999; next.choices.m1 = 999; next.lastChoice.cardId = 999;
  assert.deepEqual(game, saved);
  assert.equal(retry.choices.m1, 2);
});

test('bracket room commands enforce start ownership, mode, membership and stale revisions', () => {
  const waiting = waitingRoom();
  assert.throws(() => changeRoom(waiting, GUEST, 0, 'start', { deck }), RoomError);
  const alone = waitingRoom(); delete alone.players.p2;
  const solo = changeRoom(alone, HOST, 0, 'start', { deck });
  assert.equal(solo.game.activeSeat, 'p1');
  assert.equal(solo.players.p2, undefined);
  const before = changeRoom(waiting, HOST, 0, 'start', { deck });
  assert.throws(() => changeRoom(before, GUEST, before.revision, 'choose', { cardId: 1 }),
    error => error.code === 'NOT_ACTIVE_PLAYER');
  assert.throws(() => changeRoom(before, 'stranger', before.revision, 'choose', { cardId: 1 }), RoomError);
  const after = changeRoom(before, HOST, before.revision, 'choose', { cardId: 2 });
  assert.throws(() => changeRoom(after, HOST, before.revision, 'choose', { cardId: 3 }), RoomError);
  assert.deepEqual(after.lastAction, { kind: 'choose', seat: 'p1' });
  assert.equal(after.revision, before.revision + 1);
  for (const command of ['bid', 'pass', 'rank', 'assign']) {
    assert.throws(() => changeRoom(after, HOST, after.revision, command, { amount: 3, slot: 1, role: 'start', cardId: 3 }), RoomError);
  }
  const auction = changeRoom(waitingRoom('auction'), HOST, 0, 'start', { deck });
  assert.throws(() => changeRoom(auction, HOST, auction.revision, 'choose', { cardId: 1 }), RoomError);
});

test('bracket rematch retains identity and flips the active and spectator roles', () => {
  let room = changeRoom(waitingRoom(), HOST, 0, 'start', { deck });
  assert.throws(() => changeRoom(room, HOST, room.revision, 'rematch', { deck }), RoomError);
  while (room.status === 'playing') room = changeRoom(room, HOST, room.revision, 'choose', { cardId: room.game.currentPair.right });
  const saved = structuredClone(room);
  const next = changeRoom(room, GUEST, room.revision, 'rematch', { deck: [...deck].reverse() });
  assert.equal(next.code, room.code); assert.deepEqual(next.players, room.players);
  assert.equal(next.round, 2); assert.equal(next.starterSeat, 'p2'); assert.equal(next.game.activeSeat, 'p2');
  assert.equal(next.status, 'playing'); assert.equal(next.game.matchIndex, 0);
  assert.deepEqual(next.game.choices, {}); assert.equal(next.game.winnerId, null);
  assert.deepEqual(next.game.currentPair, { left: 30, right: 29 });
  assert.throws(() => changeRoom(next, HOST, next.revision, 'choose', { cardId: 30 }), error => error.code === 'NOT_ACTIVE_PLAYER');
  assert.equal(changeRoom(next, GUEST, next.revision, 'choose', { cardId: 30 }).game.choices.m1, 30);
  assert.deepEqual(room, saved);
});
