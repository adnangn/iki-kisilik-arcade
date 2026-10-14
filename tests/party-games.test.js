import test from 'node:test';
import assert from 'node:assert/strict';
import { createPartyGame, changePartyGame, resolvePartyRound, normalizePartyGame,
  partyGameSpec, partyCards, partyRoundContext, rankingMatrix, partyClue, advancePartyRanking, PartyGameError } from '../js/party-games.js';

const deck = Array.from({ length: 60 }, (_, index) => index + 1);
const seats = ['p1', 'p2', 'p3', 'p4'];
const create = (mode, count = mode === 'detective' ? 2 : 4, extra = {}) => createPartyGame(mode, { seats: seats.slice(0, count), deck, ...extra });
const submissions = (game, value) => Object.fromEntries(game.seats.map(seat => [seat, typeof value === 'function' ? value(seat) : value]));
function omitted(value) {
  if (Array.isArray(value)) return value.length ? value.map(omitted) : undefined;
  if (value && typeof value === 'object') {
    const output = Object.fromEntries(Object.entries(value).map(([key, child]) => [key, omitted(child)]).filter(([, child]) => child !== undefined));
    return Object.keys(output).length ? output : undefined;
  }
  return value === null ? undefined : value;
}
function accepted(game) { assert.deepEqual(normalizePartyGame(game), game); assert.deepEqual(normalizePartyGame(omitted(game)), game); }
function clues(game) {
  let next = game;
  while (next.stage === 'clues') next = resolvePartyRound(next, { [next.turnSeat]: { word: `İpucu${next.turnSeat}` } });
  return next;
}

test('all six engines start with deterministic public snapshots and safe RTDB normalization', () => {
  for (const mode of ['auction', 'sealed-auction', 'simultaneous-ranking', 'telepathy', 'detective', 'chameleon']) {
    const game = create(mode);
    accepted(game);
    assert.deepEqual(create(mode), game);
    assert.equal(game.phase, 'playing');
    assert.equal(game.roundIndex, 0);
    assert.equal(Object.hasOwn(game, 'targetId'), false);
    assert.equal(Object.hasOwn(game, 'moleSeat'), false);
  }
});

test('player limits, seat order, sparse/duplicate decks and malformed criteria are rejected', () => {
  assert.throws(() => create('detective', 3), PartyGameError);
  assert.throws(() => create('chameleon', 2), PartyGameError);
  assert.throws(() => createPartyGame('telepathy', { seats: ['p2', 'p1'], deck }), PartyGameError);
  assert.throws(() => createPartyGame('telepathy', { seats: ['p1', 'p2'], deck: [1, 2, 3, 3] }), PartyGameError);
  const sparse = [1, 2, 3, 4]; delete sparse[2];
  assert.throws(() => create('telepathy', 2, { deck: sparse }), PartyGameError);
  assert.throws(() => create('telepathy', 2, { criteria: [0] }), PartyGameError);
  assert.throws(() => partyGameSpec('missing'), PartyGameError);
});

test('auction and sealed decks adapt to 20/30 cards and smaller eligible collections', () => {
  for (const mode of ['auction', 'sealed-auction']) {
    assert.equal(create(mode, 2).deck.length, 20);
    assert.equal(create(mode, 3).deck.length, 30);
    assert.equal(create(mode, 4).deck.length, 30);
    assert.equal(create(mode, 4, { deck: deck.slice(0, 25) }).deck.length, 25);
    assert.throws(() => create(mode, 4, { deck: deck.slice(0, 19) }), PartyGameError);
  }
});

test('four-player opening bid waits for three explicit passes and then rotates opener', () => {
  let game = create('auction');
  assert.equal(game.highestBid, 1); assert.equal(game.bidderSeat, 'p1'); assert.equal(game.turnSeat, 'p2');
  const original = structuredClone(game);
  game = changePartyGame(game, 'p2', 'pass');
  assert.equal(game.currentCardId, 1); assert.equal(game.turnSeat, 'p3');
  game = changePartyGame(game, 'p3', 'pass');
  assert.equal(game.currentCardId, 1); assert.equal(game.turnSeat, 'p4');
  game = changePartyGame(game, 'p4', 'pass');
  assert.deepEqual(game.rosters.p1, [{ id: 1, price: 1 }]);
  assert.equal(game.currentCardId, 2); assert.equal(game.openerSeat, 'p2'); assert.equal(game.turnSeat, 'p3');
  assert.deepEqual(original.rosters.p1, []); accepted(game);
});

test('a pass permanently withdraws a seat from this auction while raises circle remaining players', () => {
  let game = create('auction');
  game = changePartyGame(game, 'p2', 'pass');
  game = changePartyGame(game, 'p3', 'bid', { amount: 5 });
  assert.equal(game.turnSeat, 'p4');
  game = changePartyGame(game, 'p4', 'bid', { amount: 7 });
  assert.equal(game.turnSeat, 'p1');
  game = changePartyGame(game, 'p1', 'pass');
  assert.equal(game.turnSeat, 'p3');
  assert.throws(() => changePartyGame(game, 'p2', 'bid', { amount: 8 }), PartyGameError);
  game = changePartyGame(game, 'p3', 'pass');
  assert.deepEqual(game.rosters.p4, [{ id: 1, price: 7 }]); accepted(game);
});

test('wrong-turn, fractional, repeated and over-budget bids preserve their input', () => {
  const game = create('auction', 2);
  for (const [seat, payload] of [['p1', { amount: 2 }], ['p2', { amount: 1 }], ['p2', { amount: 2.5 }], ['p2', { amount: 21 }]]) {
    const before = structuredClone(game);
    assert.throws(() => changePartyGame(game, seat, 'bid', payload), PartyGameError);
    assert.deepEqual(game, before);
  }
  assert.throws(() => changePartyGame(game, 'p2', 'pass', { roundIndex: 1 }), PartyGameError);
});

test('an exhausted player still explicitly passes and every auction roster finishes at five', () => {
  let game = create('auction', 2);
  game = changePartyGame(game, 'p2', 'bid', { amount: 20 });
  game = changePartyGame(game, 'p1', 'pass');
  assert.equal(game.budgets.p2, 0); assert.equal(game.currentCardId, 2); assert.equal(game.turnSeat, 'p2');
  assert.equal(game.rosters.p1.length, 0);
  while (game.phase === 'playing') game = changePartyGame(game, game.turnSeat, 'pass');
  assert.equal(game.rosters.p1.length, 5); assert.equal(game.rosters.p2.length, 5);
  assert.equal(game.completionAwards.length, 4);
  assert.equal(new Set(Object.values(game.rosters).flat().map(item => item.id)).size, 10);
  accepted(game);
});

test('all four players receive five roster cards even after budgets are exhausted early', () => {
  let game = create('auction');
  let guard = 0;
  while (game.phase === 'playing') {
    if (++guard > 200) assert.fail('Auction did not finish');
    const actor = game.turnSeat;
    game = game.budgets[actor] === 20 && game.highestBid < 20
      ? changePartyGame(game, actor, 'bid', { amount: 20 }) : changePartyGame(game, actor, 'pass');
  }
  for (const seat of seats) assert.equal(game.rosters[seat].length, 5);
  assert.equal(Object.values(game.rosters).flat().length, 20); accepted(game);
});

test('forged auction budgets, turn, history or early secret data are rejected', () => {
  const game = create('auction');
  for (const revise of [value => value.budgets.p1 = 19, value => value.turnSeat = 'p4',
    value => value.passed.p2 = true, value => value.targetId = 1,
    value => value.actions = [{ seat: 'p3', command: 'pass' }]]) {
    const forged = structuredClone(game); revise(forged); assert.throws(() => normalizePartyGame(forged), PartyGameError);
  }
});

test('sealed auction reveals only after all submissions and uniquely highest bid wins', () => {
  const game = create('sealed-auction');
  assert.equal(Object.hasOwn(game, 'bids'), false);
  assert.throws(() => resolvePartyRound(game, { p1: { amount: 5 } }), PartyGameError);
  const next = resolvePartyRound(game, { p1: { amount: 3 }, p2: { amount: 8 }, p3: { amount: 0 }, p4: { amount: 6 } });
  assert.equal(next.stage, 'reveal'); assert.equal(next.results.r1.winnerSeat, 'p2');
  assert.equal(next.budgets.p2, 12); assert.deepEqual(next.rosters.p2, [{ id: 1, price: 8 }]);
  assert.throws(() => resolvePartyRound(next, submissions(next, { amount: 1 })), PartyGameError);
  const advanced = changePartyGame(next, 'p3', 'next'); assert.equal(advanced.currentCardId, 2); accepted(advanced);
});

test('sealed top ties burn the card and zero-TL bids are valid', () => {
  let game = create('sealed-auction', 2);
  game = resolvePartyRound(game, { p1: { amount: 0 }, p2: { amount: 0 } });
  assert.equal(game.results.r1.burned, true); assert.equal(game.results.r1.winnerSeat, null);
  assert.deepEqual(game.budgets, { p1: 20, p2: 20 });
  game = changePartyGame(game, 'p1', 'next');
  game = resolvePartyRound(game, { p1: { amount: 4 }, p2: { amount: 4 } });
  assert.equal(game.results.r2.burned, true); accepted(game);
});

test('sealed invalid amounts and stale cursors fail without revealing partial bids', () => {
  const game = create('sealed-auction', 2);
  for (const amount of [-1, 21, 0.5, '3']) assert.throws(() => resolvePartyRound(game, { p1: { amount }, p2: { amount: 0 } }), PartyGameError);
  assert.throws(() => resolvePartyRound(game, { p1: { amount: 1, roundIndex: 1 }, p2: { amount: 0 } }), PartyGameError);
  assert.deepEqual(game.rosters, { p1: [], p2: [] });
});

test('sealed exhausted buyers complete from unused tail and burnt cards are never recycled', () => {
  let game = create('sealed-auction', 2);
  game = resolvePartyRound(game, { p1: { amount: 5 }, p2: { amount: 5 } });
  game = changePartyGame(game, 'p1', 'next');
  game = resolvePartyRound(game, { p1: { amount: 20 }, p2: { amount: 0 } });
  game = changePartyGame(game, 'p1', 'next');
  game = resolvePartyRound(game, { p1: { amount: 0 }, p2: { amount: 20 } });
  assert.equal(game.phase, 'finished');
  for (const seat of game.seats) assert.equal(game.rosters[seat].length, 5);
  assert.equal(Object.values(game.rosters).flat().some(item => item.id === 1), false); accepted(game);
});

test('twenty consecutive tied envelopes terminate and report burnt cards without fabricated rosters', () => {
  let game = create('sealed-auction', 2);
  while (game.phase === 'playing') {
    game = resolvePartyRound(game, submissions(game, { amount: 0 }));
    if (game.phase === 'playing') game = changePartyGame(game, 'p1', 'next');
  }
  assert.equal(Object.keys(game.results).length, 20); assert.equal(game.completionAwards.length, 0);
  assert.equal(game.rosters.p1.length, 0); accepted(game);
});

test('telepathy uses exactly four distinct visible cards even when a 25-card pool wraps', () => {
  let game = create('telepathy', 2, { deck: deck.slice(0, 25) });
  for (let round = 0; round < 10; round += 1) {
    const cards = partyCards(game); assert.equal(cards.length, 4); assert.equal(new Set(cards).size, 4);
    assert.equal(partyRoundContext(game).criterionIndex, round);
    game = resolvePartyRound(game, submissions(game, { cardId: cards[0] }));
    if (game.phase === 'playing') game = changePartyGame(game, 'p2', 'next');
    accepted(game);
  }
});

test('telepathy awards every matching pair, including separate matched groups', () => {
  const game = create('telepathy');
  const next = resolvePartyRound(game, { p1: { cardId: 1 }, p2: { cardId: 1 }, p3: { cardId: 2 }, p4: { cardId: 2 } });
  assert.equal(next.score, 200); assert.deepEqual(next.scores, { p1: 100, p2: 100, p3: 100, p4: 100 });
  assert.equal(next.results.r1.allMatch, false); assert.equal(next.streak, 0); accepted(next);
});

test('five unanimous rounds award pair bonuses and preserve all-player streak', () => {
  let game = create('telepathy');
  for (let index = 0; index < 5; index += 1) {
    game = resolvePartyRound(game, submissions(game, { cardId: partyCards(game)[0] }));
    if (index < 4) game = changePartyGame(game, 'p1', 'next');
  }
  assert.equal(game.streak, 5); assert.equal(game.bestStreak, 5); assert.equal(game.score, 4500);
  assert.equal(game.results.r5.pairResults.p1_p2.bonus, 250);
  assert.equal(game.pairScores.p1_p2, 750); accepted(game);
});

test('telepathy private choices and manipulated points cannot leak into public choosing snapshots', () => {
  const game = create('telepathy');
  assert.throws(() => resolvePartyRound(game, submissions(game, { cardId: 60 })), PartyGameError);
  assert.throws(() => normalizePartyGame({ ...game, choices: { p1: 1 } }), PartyGameError);
  const next = resolvePartyRound(game, submissions(game, { cardId: 1 }));
  next.score += 100; assert.throws(() => normalizePartyGame(next), PartyGameError);
});

test('simultaneous ranking waits for everyone and keeps all ten slot maps hidden until completion', () => {
  let game = create('simultaneous-ranking');
  const privateSlots = submissions(game, () => ({}));
  for (let round = 0; round < 10; round += 1) {
    const records = submissions(game, seat => {
      const slot = seat === 'p4' ? 10 - round : round + 1;
      privateSlots[seat][`s${slot}`] = game.deck[round];
      return { slot, slots: { ...privateSlots[seat] }, roundIndex: round };
    });
    if (round === 0) assert.throws(() => resolvePartyRound(game, { p1: records.p1 }), PartyGameError);
    game = resolvePartyRound(game, records);
    if (round < 9) { assert.deepEqual(game.rankings, {}); assert.equal(game.result, null); assert.equal(game.roundIndex, round + 1); }
    accepted(game);
  }
  assert.equal(game.phase, 'finished');
  assert.equal(game.result.matrix.p1.p2, 100); assert.equal(game.result.matrix.p1.p4, 0);
  assert.equal(game.result.mostCompatible.left, 'p1'); assert.equal(game.result.mostDifferent.right, 'p4');
});

test('rankings reject occupied/wrong current slots, duplicate cards and forged early public maps', () => {
  const game = create('simultaneous-ranking', 2);
  assert.throws(() => resolvePartyRound(game, { p1: { slot: 1, slots: { s1: 2 } }, p2: { slot: 1, slots: { s1: 1 } } }), PartyGameError);
  assert.throws(() => resolvePartyRound(game, submissions(game, { slot: 11, slots: { s1: 1 } })), PartyGameError);
  assert.throws(() => normalizePartyGame({ ...game, rankings: { p1: { s1: 1 } } }), PartyGameError);
  const after = resolvePartyRound(game, submissions(game, { slot: 1, slots: { s1: 1 } }));
  assert.throws(() => resolvePartyRound(after, submissions(after, { slot: 1, slots: { s1: 2, s2: 1 } , roundIndex: 0 })), PartyGameError);
});

test('first nine ranking rounds advance only from public lock counts, without seeing private slots', () => {
  let game = create('simultaneous-ranking');
  for (let count = 1; count <= 9; count += 1) {
    game = advancePartyRanking(game, submissions(game, count));
    assert.equal(game.roundIndex, count); assert.deepEqual(game.rankings, {}); assert.equal(game.result, null); accepted(game);
  }
  assert.throws(() => advancePartyRanking(game, submissions(game, 10)), PartyGameError);
});

test('public ranking locks must include every current player with the exact current count', () => {
  const game = create('simultaneous-ranking');
  assert.throws(() => advancePartyRanking(game, { p1: 1, p2: 1 }), PartyGameError);
  assert.throws(() => advancePartyRanking(game, { p1: 1, p2: 1, p3: 1, p4: 0 }), PartyGameError);
  assert.throws(() => advancePartyRanking(game, submissions(game, 2)), PartyGameError);
  const next = resolvePartyRound(game, submissions(game, { locked: true, count: 1, roundIndex: 0 }));
  assert.equal(next.roundIndex, 1); accepted(next);
  assert.throws(() => resolvePartyRound(game, submissions(game, { locked: false, count: 1 })), PartyGameError);
});

test('final ranking reveal validates full permutations after nine opaque advances', () => {
  let game = create('simultaneous-ranking', 2);
  for (let count = 1; count <= 9; count += 1) game = advancePartyRanking(game, submissions(game, count));
  const slots = Object.fromEntries(game.deck.map((id, index) => [`s${index + 1}`, id]));
  game = resolvePartyRound(game, submissions(game, { slot: 10, slots, roundIndex: 9 }));
  assert.equal(game.phase, 'finished'); assert.equal(game.result.matrix.p1.p2, 100); accepted(game);
});

test('footrule percentage is symmetric, bounded and stable for tied best/worst pairs', () => {
  const ids = deck.slice(0, 10);
  const ascending = Object.fromEntries(ids.map((id, index) => [`s${index + 1}`, id]));
  const descending = Object.fromEntries(ids.map((id, index) => [`s${10 - index}`, id]));
  const result = rankingMatrix(ids, { p1: ascending, p2: descending, p3: ascending });
  assert.equal(result.matrix.p1.p2, 0); assert.equal(result.matrix.p2.p1, 0); assert.equal(result.matrix.p1.p3, 100);
  assert.equal(result.mostDifferent.left, 'p1'); assert.equal(result.mostCompatible.right, 'p3');
});

test('one-word clues permit Turkish characters while blocking whitespace, invisibles and long text', () => {
  assert.equal(partyClue('  Çağrışım  '), 'Çağrışım');
  assert.equal(partyClue('Kadıköy’lü'), 'Kadıköy’lü');
  for (const text of ['Çağrışım', 'Привет', '中文', 'İstanbul-Ankara', 'A'.repeat(24)]) assert.equal(partyClue(text), text);
  assert.equal(partyClue('가'), '가');
  for (const text of ['', 'iki kelime', 'A\u200bB', '<script>', 'A'.repeat(25), '𐌀', '😀', 'ᄀ', 'ꥠ', 'ힰ', 1]) assert.throws(() => partyClue(text), PartyGameError);
});

test('detective alternates private clue giver, target never appears before locked guess', () => {
  let game = create('detective');
  assert.equal(game.clueGiverSeat, 'p1');
  assert.throws(() => resolvePartyRound(game, { p2: { word: 'Tatlı' } }), PartyGameError);
  game = resolvePartyRound(game, { p1: { word: 'Tatlı' } });
  assert.equal(game.stage, 'guess'); assert.equal(game.clue, 'Tatlı'); assert.equal(Object.hasOwn(game, 'targetId'), false);
  accepted(game);
  game = resolvePartyRound(game, { p2: { cardId: 2 } }, { targetId: 2 });
  assert.equal(game.results.r1.correct, true); assert.deepEqual(game.scores, { p1: 100, p2: 100 });
  game = changePartyGame(game, 'p1', 'next');
  assert.equal(game.clueGiverSeat, 'p2'); assert.equal(game.guesserSeat, 'p1'); assert.equal(game.clue, ''); accepted(game);
});

test('detective six rounds score only correct guesses and reject already resolved guesses', () => {
  let game = create('detective');
  for (let index = 0; index < 6; index += 1) {
    const cards = partyCards(game);
    game = resolvePartyRound(game, { [game.clueGiverSeat]: { word: 'Nostalji' } });
    game = resolvePartyRound(game, { [game.guesserSeat]: { cardId: cards[index % 2] } }, { targetId: cards[0] });
    accepted(game);
    if (game.phase === 'playing') game = changePartyGame(game, 'p2', 'next');
  }
  assert.equal(game.phase, 'finished'); assert.equal(game.scores.p1, 300);
  assert.throws(() => resolvePartyRound(game, { p1: { cardId: 1 } }, { targetId: 1 }), PartyGameError);
});

test('chameleon clues are clockwise, every player speaks once and self-votes are rejected', () => {
  let game = create('chameleon', 4, { starterSeat: 'p3' });
  assert.equal(game.turnSeat, 'p3');
  assert.throws(() => resolvePartyRound(game, { p1: { word: 'Sıcak' } }), PartyGameError);
  game = resolvePartyRound(game, { p3: { word: 'Sıcak' } }); assert.equal(game.turnSeat, 'p4');
  game = clues(game); assert.equal(game.stage, 'voting'); assert.equal(Object.keys(game.clues).length, 4); accepted(game);
  assert.throws(() => resolvePartyRound(game, submissions(game, seat => ({ seat })), { moleSeat: 'p4', targetId: 1 }), PartyGameError);
});

test('caught chameleon gets a final private guess without public target disclosure', () => {
  let game = clues(create('chameleon'));
  game = resolvePartyRound(game, { p1: { seat: 'p4' }, p2: { seat: 'p4' }, p3: { seat: 'p4' }, p4: { seat: 'p1' } }, { moleSeat: 'p4' });
  assert.equal(game.stage, 'last-guess'); assert.equal(game.caughtSeat, 'p4'); assert.equal(Object.hasOwn(game, 'targetId'), false);
  accepted(game);
  assert.throws(() => resolvePartyRound(game, { p1: { cardId: 1 } }, { moleSeat: 'p4', targetId: 2 }), PartyGameError);
  game = resolvePartyRound(game, { p4: { cardId: 1 } }, { moleSeat: 'p4', targetId: 2 });
  assert.deepEqual(game.scores, { p1: 100, p2: 100, p3: 100, p4: 0 }); accepted(game);
});

test('correct final mole guess steals victory while tied votes let the mole escape', () => {
  let game = clues(create('chameleon'));
  game = resolvePartyRound(game, { p1: { seat: 'p4' }, p2: { seat: 'p4' }, p3: { seat: 'p4' }, p4: { seat: 'p1' } }, { moleSeat: 'p4' });
  game = resolvePartyRound(game, { p4: { cardId: 2 } }, { moleSeat: 'p4', targetId: 2 });
  assert.deepEqual(game.scores, { p1: 0, p2: 0, p3: 0, p4: 100 }); accepted(game);
  let tied = clues(create('chameleon'));
  tied = resolvePartyRound(tied, { p1: { seat: 'p2' }, p2: { seat: 'p1' }, p3: { seat: 'p4' }, p4: { seat: 'p3' } }, { moleSeat: 'p4', targetId: 2 });
  assert.equal(tied.results.r1.suspectSeat, null); assert.equal(tied.scores.p4, 200); accepted(tied);
});

test('wrong accused player makes the mole escape and five-round play rotates starting clue seat', () => {
  let game = create('chameleon', 3);
  for (let index = 0; index < 5; index += 1) {
    assert.equal(game.turnSeat, game.seats[index % 3]);
    game = clues(game);
    game = resolvePartyRound(game, { p1: { seat: 'p2' }, p2: { seat: 'p1' }, p3: { seat: 'p2' } }, { moleSeat: 'p3', targetId: partyCards(game)[0] });
    accepted(game);
    if (game.phase === 'playing') game = changePartyGame(game, 'p2', 'next');
  }
  assert.equal(game.phase, 'finished'); assert.equal(game.scores.p3, 1000);
});

test('normalization rejects forged detective and mole results or secret leakage', () => {
  for (const mode of ['detective', 'chameleon', 'telepathy', 'simultaneous-ranking', 'sealed-auction']) {
    const game = create(mode);
    for (const key of ['targetId', 'moleSeat', 'choices', 'bids']) assert.throws(() => normalizePartyGame({ ...game, [key]: 1 }), PartyGameError);
  }
  let game = clues(create('chameleon'));
  game = resolvePartyRound(game, { p1: { seat: 'p2' }, p2: { seat: 'p1' }, p3: { seat: 'p2' }, p4: { seat: 'p2' } }, { moleSeat: 'p4', targetId: 1 });
  game.results.r1.points.p4 = 900;
  assert.throws(() => normalizePartyGame(game), PartyGameError);
});

test('reveal advance is once only and stale stage/round cursor never advances twice', () => {
  let game = resolvePartyRound(create('telepathy', 2), { p1: { cardId: 1 }, p2: { cardId: 1 } });
  game = changePartyGame(game, 'p1', 'next', { roundIndex: 0, stage: 'reveal' });
  assert.throws(() => changePartyGame(game, 'p2', 'next', { roundIndex: 0, stage: 'reveal' }), PartyGameError);
  assert.throws(() => resolvePartyRound(game, submissions(game, { cardId: 5, roundIndex: 0 })), PartyGameError);
});

test('inherited private seats cannot impersonate locked submissions or final rankings', () => {
  const game = create('telepathy', 2);
  const records = Object.assign(Object.create({ p2: { cardId: 1 } }), { p1: { cardId: 1 }, unrelated: {} });
  assert.throws(() => resolvePartyRound(game, records), PartyGameError);
  const ids = deck.slice(0, 10), slots = Object.fromEntries(ids.map((id, index) => [`s${index + 1}`, id]));
  const rankings = Object.assign(Object.create({ p2: slots }), { p1: slots, unrelated: slots });
  assert.throws(() => rankingMatrix(ids, rankings, ['p1', 'p2']), PartyGameError);
});
