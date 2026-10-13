import test from 'node:test';
import assert from 'node:assert/strict';
import { BracketError, createBracket, normalizeBracket, chooseBracketCard, bracketRoundSizes } from '../js/bracket.js';
import { changeRoom, RoomError } from '../js/room-state.js';
import { getBracketRoundNames, renderBracketHistory } from '../js/game-view.js';

const deck = Array.from({ length: 30 }, (_, index) => index + 1);
const largeDeck = Array.from({ length: 60 }, (_, index) => index + 1);
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

test('32-card bracket starts sixteen distinct duels and retains the existing room game shape', () => {
  const pool = [...largeDeck].reverse();
  let game = createBracket(pool, 'p2', 32);
  assert.deepEqual(Object.keys(game), Object.keys(createBracket(deck)));
  assert.deepEqual(game.deck, pool.slice(0, 32));
  assert.deepEqual(bracketRoundSizes(game), [16, 8, 4, 2, 1]);
  assert.deepEqual(bracketRoundSizes(16), [8, 4, 2, 1]);
  for (let match = 0; match < 16; match += 1) {
    assert.equal(game.round, 1);
    assert.deepEqual(game.currentPair, { left: pool[match * 2], right: pool[match * 2 + 1] });
    game = chooseBracketCard(game, 'p2', game.currentPair.left);
  }
  assert.equal(game.round, 2);
  assert.deepEqual(game.currentPair, { left: 60, right: 58 });
  assert.equal(game.choices.m16, 30);
  assert.equal(game.activeSeat, 'p2');
});

test('32-card winners advance through five rounds and the champion wins exactly five matches', () => {
  let game = createBracket(largeDeck, 'p1', 32);
  const boundaries = new Map([[16, 2], [24, 3], [28, 4], [30, 5], [31, 5]]);
  const duels = [];
  while (game.phase === 'playing') {
    duels.push({ round: game.round, pair: game.currentPair });
    game = chooseBracketCard(game, 'p1', game.currentPair.right);
    if (boundaries.has(game.matchIndex)) assert.equal(game.round, boundaries.get(game.matchIndex));
    assert.deepEqual(normalizeBracket(game), game);
  }
  assert.equal(duels.length, 31);
  assert.deepEqual([1, 2, 3, 4, 5].map(round => duels.filter(match => match.round === round).length), [16, 8, 4, 2, 1]);
  assert.deepEqual(duels.filter(match => Object.values(match.pair).includes(32)).map(match => match.pair), [
    { left: 31, right: 32 }, { left: 30, right: 32 }, { left: 28, right: 32 },
    { left: 24, right: 32 }, { left: 16, right: 32 },
  ]);
  assert.equal(game.winnerId, 32);
  assert.equal(game.choices.m31, 32);
  assert.equal(game.matchIndex, 31);
  assert.equal(game.currentPair, null);
  assert.deepEqual(game.lastChoice, { cardId: 32, loserId: 16, matchIndex: 30, round: 5, sequence: 31 });
  assert.throws(() => chooseBracketCard(game, 'p1', 32), error => error.code === 'GAME_FINISHED');
});

test('bracket sizes are explicitly limited to 16 or 32 and need enough unique cards', () => {
  for (const size of [8, 24, 64, '32', null, 31, 16.5]) {
    assert.throws(() => createBracket(largeDeck, 'p1', size), error => error.code === 'INVALID_SIZE');
    assert.throws(() => bracketRoundSizes(size), error => error.code === 'INVALID_SIZE');
  }
  assert.throws(() => createBracket(largeDeck.slice(0, 31), 'p1', 32), error => error.code === 'INVALID_DECK');
  assert.throws(() => createBracket([...largeDeck, 32], 'p1', 32), error => error.code === 'INVALID_DECK');
  for (const size of [15, 17, 30, 31, 33]) {
    const game = createBracket(largeDeck, 'p1', 32);
    game.deck = largeDeck.slice(0, size);
    assert.throws(() => normalizeBracket(game), BracketError);
  }
});

test('32-card normalization reconstructs RTDB omissions and rejects forged advancement or round history', () => {
  const omitted = createBracket(largeDeck, 'p1', 32);
  delete omitted.choices; delete omitted.lastChoice; delete omitted.winnerId;
  assert.deepEqual(normalizeBracket(omitted), createBracket(largeDeck, 'p1', 32));
  let valid = createBracket(largeDeck, 'p1', 32);
  for (let match = 0; match < 25; match += 1) valid = chooseBracketCard(valid, 'p1', valid.currentPair.left);
  assert.equal(valid.round, 3);
  const edits = [
    game => { game.choices.m16 = 30; },
    game => { game.choices.m17 = 2; },
    game => { game.choices.m25 = 3; },
    game => { delete game.choices.m9; game.choices.m26 = 9; },
    game => { game.choices.m32 = 1; },
    game => { game.choices.m01 = game.choices.m1; delete game.choices.m1; },
    game => { game.currentPair.right = 16; },
    game => { game.round = 2; },
    game => { game.lastChoice.round = 2; },
    game => { game.lastChoice.sequence = 24; },
    game => { game.winnerId = 1; },
  ];
  for (const edit of edits) {
    const corrupted = structuredClone(valid); edit(corrupted);
    assert.throws(() => normalizeBracket(corrupted), BracketError);
  }
  while (valid.phase === 'playing') valid = chooseBracketCard(valid, 'p1', valid.currentPair.left);
  delete valid.currentPair;
  assert.equal(normalizeBracket(valid).winnerId, 1);
  const wrongWinner = structuredClone(valid); wrongWinner.winnerId = wrongWinner.choices.m15;
  assert.throws(() => normalizeBracket(wrongWinner), BracketError);
});

test('32-card active-player checks and duplicate choices preserve the original immutable state', () => {
  const initial = freeze(createBracket(largeDeck, 'p2', 32));
  assert.throws(() => chooseBracketCard(initial, 'p1', 1), error => error.code === 'NOT_ACTIVE_PLAYER');
  assert.throws(() => chooseBracketCard(initial, 'p2', 33), error => error.code === 'INVALID_CHOICE');
  const next = chooseBracketCard(initial, 'p2', 2);
  assert.throws(() => chooseBracketCard(next, 'p2', 2), error => error.code === 'INVALID_CHOICE');
  assert.deepEqual(chooseBracketCard(initial, 'p2', 2), next);
  assert.deepEqual(initial.choices, {});
  assert.equal(initial.matchIndex, 0);
});

test('32-card rooms enforce stale revisions and keep their chosen size when rematching', () => {
  const waiting = { ...waitingRoom(), bracketSize: 32 };
  let room = changeRoom(waiting, HOST, 0, 'start', { deck: largeDeck });
  assert.equal(room.game.deck.length, 32);
  const startedRevision = room.revision;
  room = changeRoom(room, HOST, room.revision, 'choose', { cardId: 1 });
  assert.throws(() => changeRoom(room, HOST, startedRevision, 'choose', { cardId: 3 }), RoomError);
  assert.throws(() => changeRoom(room, GUEST, room.revision, 'choose', { cardId: 3 }),
    error => error.code === 'NOT_ACTIVE_PLAYER');
  while (room.status === 'playing') room = changeRoom(room, HOST, room.revision, 'choose', { cardId: room.game.currentPair.right });
  const rematch = changeRoom(room, GUEST, room.revision, 'rematch', { deck: [...largeDeck].reverse() });
  assert.equal(rematch.code, waiting.code);
  assert.equal(rematch.bracketSize, 32);
  assert.equal(rematch.game.deck.length, 32);
  assert.equal(rematch.game.activeSeat, 'p2');
  assert.equal(rematch.game.matchIndex, 0);
  assert.deepEqual(rematch.game.currentPair, { left: 60, right: 59 });
  assert.deepEqual(rematch.players, room.players);
});

test('history renders all five 32-card rounds with thirty-one match slots and keeps legacy headings', () => {
  class Node {
    constructor() { this.dataset = {}; this.children = []; this.classList = { add() {} }; }
    append(...children) { this.children.push(...children); }
    replaceChildren(...children) { this.children = children; }
  }
  const originalDocument = globalThis.document;
  globalThis.document = { createElement: () => new Node() };
  try {
    const container = new Node();
    let game = createBracket(largeDeck, 'p1', 32);
    game = chooseBracketCard(game, 'p1', 2);
    renderBracketHistory(container, game, id => ({ id, isim: `Kart ${id}`, gorsel: 'assets/images/placeholder.svg' }));
    assert.equal(container.children.length, 5);
    assert.deepEqual(container.children.map(section => section.children[1].children.length), [16, 8, 4, 2, 1]);
    assert.deepEqual(container.children.map(section => section.children[0].textContent), getBracketRoundNames(32));
    assert.deepEqual(getBracketRoundNames(32).slice(1), getBracketRoundNames(16));
    assert.equal(container.children[0].children[1].children[0].children[1].textContent, 'Kart 2');
    const firstRender = container.children;
    renderBracketHistory(container, game, () => { throw new Error('Unchanged history was rebuilt.'); });
    assert.equal(container.children, firstRender);
    renderBracketHistory(container, createBracket(deck), id => ({ id, isim: `Kart ${id}` }));
    assert.equal(container.children.length, 4);
    assert.deepEqual(container.children.map(section => section.children[1].children.length), [8, 4, 2, 1]);
  } finally {
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
  }
});
