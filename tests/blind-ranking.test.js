import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BlindRankingError,
  createBlindRanking,
  normalizeBlindRanking,
  placeBlindCard,
} from '../js/blind-ranking.js';
import { changeRoom, RoomError } from '../js/room-state.js';

const deck = Array.from({ length: 20 }, (_, index) => index + 1);
const HOST = 'owner-uid';
const GUEST = 'guest-uid';

function waitingRoom(mode = 'blind-ranking') {
  return {
    code: '123456',
    ownerUid: HOST,
    datasetId: 'superlig',
    mode,
    players: { p1: { uid: HOST, name: 'Ada' }, p2: { uid: GUEST, name: 'Deniz' } },
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
  for (let slot = 1; slot <= 10; slot += 1) {
    room = changeRoom(room, HOST, room.revision, 'rank', { slot });
  }
  return room;
}

function freeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

test('creation takes exactly the first ten shuffled IDs and assigns the active seat', () => {
  const pool = [...deck].reverse();
  const game = createBlindRanking(pool, 'p2');
  assert.deepEqual(game, {
    phase: 'playing', deck: pool.slice(0, 10), deckIndex: 0, activeSeat: 'p2',
    currentCardId: 20, slots: {}, lastPlacement: null,
  });
  game.deck[0] = 999;
  assert.equal(pool[0], 20);
  assert.equal(createBlindRanking(deck).activeSeat, 'p1');
});

test('creation rejects malformed, duplicate, short and oversized pools', () => {
  const badPools = [null, [], deck.slice(0, 9), [...deck, 1], [...deck, 0],
    [...deck, 1.5], [...deck, '21'], [...deck, Number.MAX_SAFE_INTEGER + 1],
    Array.from({ length: 201 }, (_, index) => index + 1)];
  for (const pool of badPools) assert.throws(() => createBlindRanking(pool), BlindRankingError);
  assert.throws(() => createBlindRanking(deck, 'p3'), BlindRankingError);
  assert.equal(createBlindRanking(Array.from({ length: 200 }, (_, index) => index + 1)).deck.length, 10);
});

test('one placement locks a slot, advances the card, and records its sequence', () => {
  const first = createBlindRanking(deck);
  const second = placeBlindCard(first, 'p1', 7);
  assert.deepEqual(second.slots, { s7: 1 });
  assert.equal(second.deckIndex, 1);
  assert.equal(second.currentCardId, 2);
  assert.deepEqual(second.lastPlacement, { slot: 7, id: 1, sequence: 1 });
  assert.throws(() => placeBlindCard(second, 'p1', 7), error => error.code === 'SLOT_OCCUPIED');
  assert.equal(second.deckIndex, 1);
});

test('the spectator and invalid slot arguments cannot place a card', () => {
  const game = createBlindRanking(deck, 'p2');
  assert.throws(() => placeBlindCard(game, 'p1', 1), error => error.code === 'NOT_ACTIVE_PLAYER');
  assert.throws(() => placeBlindCard(game, 'p3', 1), error => error.code === 'INVALID_SEAT');
  for (const slot of [0, 11, 1.5, '1', null, NaN]) {
    assert.throws(() => placeBlindCard(game, 'p2', slot), error => error.code === 'INVALID_SLOT');
  }
  assert.deepEqual(game.slots, {});
});

test('ten placements finish the ranking without revealing an eleventh card', () => {
  let game = createBlindRanking(deck);
  for (let slot = 10; slot >= 1; slot -= 1) {
    game = placeBlindCard(game, 'p1', slot);
    assert.equal(game.deckIndex, 11 - slot);
    assert.equal(game.phase, slot === 1 ? 'finished' : 'playing');
  }
  assert.equal(game.currentCardId, null);
  assert.equal(game.deck.length, 10);
  assert.deepEqual(game.lastPlacement, { slot: 1, id: 10, sequence: 10 });
  assert.equal(game.slots.s10, 1);
  assert.equal(game.slots.s1, 10);
  assert.throws(() => placeBlindCard(game, 'p1', 1), error => error.code === 'GAME_FINISHED');
});

test('placements and transaction retries are immutable and deterministic', () => {
  const game = freeze(createBlindRanking(deck));
  const saved = structuredClone(game);
  const next = placeBlindCard(game, 'p1', 3);
  const retry = placeBlindCard(game, 'p1', 3);
  assert.deepEqual(next, retry);
  assert.deepEqual(game, saved);
  next.deck[0] = 99;
  next.slots.s4 = 99;
  next.lastPlacement.id = 99;
  assert.deepEqual(game, saved);
  assert.equal(retry.deck[0], 1);
  assert.deepEqual(retry.slots, { s3: 1 });
});

test('normalization restores only RTDB omissions of empty slots and null fields', () => {
  const initial = createBlindRanking(deck);
  delete initial.slots;
  delete initial.lastPlacement;
  assert.deepEqual(normalizeBlindRanking(initial), createBlindRanking(deck));
  initial.slots = null;
  assert.deepEqual(normalizeBlindRanking(initial).slots, {});
  let finished = createBlindRanking(deck);
  for (let slot = 1; slot <= 10; slot += 1) finished = placeBlindCard(finished, 'p1', slot);
  delete finished.currentCardId;
  assert.equal(normalizeBlindRanking(finished).currentCardId, null);
});

test('normalization rejects cards outside the placed prefix and inconsistent state', () => {
  const valid = placeBlindCard(placeBlindCard(createBlindRanking(deck), 'p1', 4), 'p1', 8);
  const edits = [
    game => { game.deck[1] = game.deck[0]; },
    game => { game.deckIndex = 1; },
    game => { game.phase = 'finished'; },
    game => { game.currentCardId = 4; },
    game => { delete game.currentCardId; },
    game => { delete game.slots; },
    game => { game.slots.s8 = 1; },
    game => { game.slots.s8 = 3; },
    game => { game.slots.s11 = game.slots.s8; delete game.slots.s8; },
    game => { game.slots.s8 = '2'; },
    game => { delete game.lastPlacement; },
    game => { game.lastPlacement.sequence = 1; },
    game => { game.lastPlacement.slot = 4; },
    game => { game.activeSeat = 'p3'; },
  ];
  for (const edit of edits) {
    const altered = structuredClone(valid);
    edit(altered);
    assert.throws(() => normalizeBlindRanking(altered), BlindRankingError);
  }
  assert.deepEqual(normalizeBlindRanking(valid), valid);
});

test('the owner starts the selected mode with or without a spectator', () => {
  const waiting = waitingRoom();
  assert.throws(() => changeRoom(waiting, GUEST, 0, 'start', { deck }), RoomError);
  const alone = waitingRoom();
  delete alone.players.p2;
  const solo = changeRoom(alone, HOST, 0, 'start', { deck });
  assert.equal(solo.game.activeSeat, 'p1');
  assert.equal(solo.players.p2, undefined);
  const started = playingRoom();
  assert.equal(started.mode, 'blind-ranking');
  assert.equal(started.game.activeSeat, 'p1');
  assert.equal(started.game.deck.length, 10);
  assert.equal(started.status, 'playing');
  assert.equal(started.revision, 1);
  assert.equal(started.game.budgets, undefined);
});

test('room rank rejects spectator, outsiders, filled slots and stale revisions', () => {
  const before = playingRoom();
  assert.throws(() => changeRoom(before, GUEST, before.revision, 'rank', { slot: 1 }),
    error => error.code === 'NOT_ACTIVE_PLAYER');
  assert.throws(() => changeRoom(before, 'stranger', before.revision, 'rank', { slot: 1 }), RoomError);
  const after = changeRoom(before, HOST, before.revision, 'rank', { slot: 1 });
  assert.throws(() => changeRoom(after, HOST, before.revision, 'rank', { slot: 2 }), RoomError);
  assert.throws(() => changeRoom(after, HOST, after.revision, 'rank', { slot: 1 }),
    error => error.code === 'SLOT_OCCUPIED');
  assert.equal(after.revision, before.revision + 1);
  assert.deepEqual(after.lastAction, { kind: 'rank', seat: 'p1' });
  assert.deepEqual(after.game.slots, { s1: 1 });
  assert.deepEqual(before.game.slots, {});
});

test('commands cannot cross mode boundaries and old rooms default to auction', () => {
  const blind = playingRoom();
  for (const command of ['bid', 'pass']) {
    assert.throws(() => changeRoom(blind, HOST, blind.revision, command, { amount: 2 }), RoomError);
  }
  const waiting = waitingRoom('auction');
  const auction = changeRoom(waiting, HOST, 0, 'start', { deck });
  assert.throws(() => changeRoom(auction, HOST, auction.revision, 'rank', { slot: 1 }), RoomError);
  delete waiting.mode;
  assert.equal(changeRoom(waiting, HOST, 0, 'start', { deck }).game.highestBid, 1);
  assert.throws(() => changeRoom(waitingRoom('unknown'), HOST, 0, 'start', { deck }), RoomError);
});

test('finished room rematch retains room identity and swaps the active and spectator roles', () => {
  const finished = completedRoom();
  const saved = structuredClone(finished);
  assert.equal(finished.status, 'finished');
  assert.equal(finished.revision, 11);
  assert.throws(() => changeRoom(finished, HOST, finished.revision, 'rank', { slot: 1 }), RoomError);
  const next = changeRoom(finished, GUEST, finished.revision, 'rematch', { deck: [...deck].reverse() });
  assert.equal(next.code, finished.code);
  assert.deepEqual(next.players, finished.players);
  assert.equal(next.mode, 'blind-ranking');
  assert.equal(next.round, 2);
  assert.equal(next.revision, 12);
  assert.equal(next.starterSeat, 'p2');
  assert.equal(next.game.activeSeat, 'p2');
  assert.equal(next.game.currentCardId, 20);
  assert.deepEqual(next.game.slots, {});
  assert.equal(next.game.lastPlacement, null);
  assert.throws(() => changeRoom(next, HOST, next.revision, 'rank', { slot: 1 }),
    error => error.code === 'NOT_ACTIVE_PLAYER');
  assert.equal(changeRoom(next, GUEST, next.revision, 'rank', { slot: 10 }).game.slots.s10, 20);
  assert.deepEqual(finished, saved);
});
