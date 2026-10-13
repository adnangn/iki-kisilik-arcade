import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CooperativeError,
  isCooperativeMode,
  createCooperative,
  normalizeCooperative,
  revealFrequency,
  advanceFrequency,
  createPrivateRank,
  placePrivateRank,
  revealDoubleRanking,
} from '../js/cooperative.js';

const pool = Array.from({ length: 40 }, (_, index) => index + 1);
const deck = pool.slice(0, 8);
const slots = ids => Object.fromEntries(ids.map((id, index) => [`s${index + 1}`, id]));
const errorCode = code => error => error instanceof CooperativeError && error.code === code;
function freeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
function playFrequency(matches) {
  let game = createCooperative('frequency', pool);
  for (const match of matches) {
    const [left, right] = game.deck.slice(game.roundIndex * 2, game.roundIndex * 2 + 2);
    game = revealFrequency(game, { p1: left, p2: match ? left : right });
    if (game.phase === 'playing') game = advanceFrequency(game);
  }
  return game;
}

test('both modes select deterministic, separate decks without mutating the shuffled pool', () => {
  assert.equal(isCooperativeMode('frequency'), true);
  assert.equal(isCooperativeMode('double-ranking'), true);
  for (const mode of ['auction', 'blind-ranking', null, {}, 'Frequency']) assert.equal(isCooperativeMode(mode), false);
  const frequency = createCooperative('frequency', pool);
  const ranking = createCooperative('double-ranking', pool);
  assert.deepEqual(frequency, { phase: 'playing', stage: 'choosing', deck: pool.slice(0, 20),
    roundIndex: 0, score: 0, matches: 0, streak: 0, bestStreak: 0, results: {} });
  assert.deepEqual(ranking, { phase: 'playing', deck, rankings: {}, result: null });
  frequency.deck[0] = 900;
  ranking.deck[0] = 800;
  assert.equal(pool[0], 1);
});

test('short, duplicate, nonpositive, unsafe and nonnumeric decks cannot start', () => {
  assert.throws(() => createCooperative('unknown', pool), errorCode('INVALID_MODE'));
  for (const mode of ['frequency', 'double-ranking']) {
    const size = mode === 'frequency' ? 20 : 8;
    for (const bad of [null, {}, [], pool.slice(0, size - 1), [...pool, 1], [...pool, 0],
      [...pool, 1.5], [...pool, '41'], [...pool, Number.MAX_SAFE_INTEGER + 1], Array(size)]) {
      assert.throws(() => createCooperative(mode, bad), errorCode('INVALID_DECK'));
    }
  }
});

test('a frequency round accepts only two choices from its current pair', () => {
  const game = createCooperative('frequency', pool);
  for (const choices of [null, {}, { p1: 1 }, { p1: 1, p2: 3 }, { p1: '1', p2: 1 },
    { p1: 1, p2: 1, p3: 1 }, { p1: 1, other: 1 }, Object.assign(Object.create({ p1: 1, p2: 1 }), { a: 1, b: 2 })]) {
    assert.throws(() => revealFrequency(game, choices), errorCode('INVALID_CHOICE'));
  }
  const reveal = revealFrequency(game, { p1: 2, p2: 2 });
  assert.equal(reveal.score, 100);
  assert.equal(reveal.streak, 1);
  assert.deepEqual(reveal.results.r1, { p1: 2, p2: 2, match: true, points: 100, bonus: 0, streak: 1 });
  assert.throws(() => revealFrequency(reveal, { p1: 2, p2: 2 }), errorCode('ROUND_LOCKED'));
  assert.throws(() => advanceFrequency(game), errorCode('ROUND_NOT_REVEALED'));
  const next = advanceFrequency(reveal);
  assert.equal(next.roundIndex, 1);
  assert.equal(next.stage, 'choosing');
  assert.equal(next.score, 100);
  assert.throws(() => revealFrequency(next, { p1: 1, p2: 1 }), errorCode('INVALID_CHOICE'));
});

test('ten consecutive matches award bonuses once at five and ten and finish with 1,500 points', () => {
  const game = playFrequency(Array(10).fill(true));
  assert.equal(game.phase, 'finished');
  assert.equal(game.stage, 'reveal');
  assert.equal(game.roundIndex, 9);
  assert.equal(game.matches, 10);
  assert.equal(game.score, 1500);
  assert.equal(game.bestStreak, 10);
  assert.equal(game.streak, 10);
  assert.deepEqual(Object.values(game.results).map(round => round.bonus), [0, 0, 0, 0, 250, 0, 0, 0, 0, 250]);
  assert.throws(() => advanceFrequency(game), errorCode('GAME_FINISHED'));
  assert.throws(() => revealFrequency(game, { p1: 19, p2: 19 }), errorCode('GAME_FINISHED'));
  assert.deepEqual(normalizeCooperative('frequency', game), game);
});

test('a mismatch clears the current streak, preserves the best streak and permits a new five-round bonus', () => {
  const game = playFrequency([true, true, true, true, false, true, true, true, true, true]);
  assert.equal(game.matches, 9);
  assert.equal(game.score, 1150);
  assert.equal(game.results.r5.streak, 0);
  assert.equal(game.results.r5.points, 0);
  assert.equal(game.results.r5.bonus, 0);
  assert.equal(game.bestStreak, 5);
  assert.equal(game.streak, 5);
  assert.equal(game.results.r10.bonus, 250);
  assert.equal(playFrequency(Array(10).fill(false)).score, 0);
  assert.equal(playFrequency([true, true, true, true, true, true, false, false, false, false]).bestStreak, 6);
});

test('frequency restores RTDB empty results but rejects missing, forged or replayed round history', () => {
  const initial = createCooperative('frequency', pool);
  delete initial.results;
  assert.deepEqual(normalizeCooperative('frequency', initial), createCooperative('frequency', pool));
  initial.results = null;
  assert.deepEqual(normalizeCooperative('frequency', initial).results, {});
  const valid = playFrequency([true, false, true]);
  const edits = [game => { delete game.results; }, game => { game.results.r1.points = 500; },
    game => { game.results.r2.match = true; }, game => { game.results.r3.bonus = 250; },
    game => { game.results.r1.p1 = 3; }, game => { game.results.r1.streak = 7; },
    game => { game.score += 100; }, game => { game.matches += 1; },
    game => { game.streak = 8; }, game => { game.bestStreak = 10; },
    game => { game.results.r4 = game.results.r3; }, game => { delete game.results.r2; },
    game => { game.roundIndex -= 1; }, game => { game.stage = 'reveal'; },
    game => { game.phase = 'finished'; }, game => { game.deck.push(21); }];
  for (const edit of edits) {
    const altered = structuredClone(valid);
    edit(altered);
    assert.throws(() => normalizeCooperative('frequency', altered), CooperativeError);
  }
});

test('frequency reveals and advances are immutable and deterministic under transaction retries', () => {
  const game = freeze(createCooperative('frequency', pool));
  const saved = structuredClone(game);
  const next = revealFrequency(game, { p1: 1, p2: 1 });
  assert.deepEqual(next, revealFrequency(game, { p1: 1, p2: 1 }));
  assert.deepEqual(game, saved);
  const locked = freeze(next);
  assert.deepEqual(advanceFrequency(locked), advanceFrequency(locked));
  const copy = normalizeCooperative('frequency', locked);
  copy.deck[0] = 500;
  copy.results.r1.p1 = 500;
  assert.equal(locked.deck[0], 1);
  assert.equal(locked.results.r1.p1, 1);
});

test('private ranking locks exactly one next card and never overwrites an occupied slot', () => {
  const first = createPrivateRank();
  const second = placePrivateRank(deck, first, 8);
  assert.deepEqual(first, { count: 0, slots: {} });
  assert.deepEqual(second, { count: 1, slots: { s8: 1 } });
  assert.throws(() => placePrivateRank(deck, second, 8), errorCode('SLOT_OCCUPIED'));
  assert.deepEqual(placePrivateRank(deck, second, 1), { count: 2, slots: { s8: 1, s1: 2 } });
  for (const slot of [0, 9, 1.5, '1', null, NaN]) {
    assert.throws(() => placePrivateRank(deck, first, slot), errorCode('INVALID_SLOT'));
  }
});

test('eight private placements finish, retain the exact deck and cannot accept a ninth', () => {
  let record = createPrivateRank();
  for (let slot = 8; slot >= 1; slot -= 1) record = placePrivateRank(deck, record, slot);
  assert.equal(record.count, 8);
  assert.deepEqual(record.slots, slots([...deck].reverse()));
  assert.throws(() => placePrivateRank(deck, record, 1), errorCode('GAME_FINISHED'));
});

test('private ranking rejects forged progress, duplicate cards and cards from the future', () => {
  for (const record of [null, {}, { count: '0' }, { count: -1 }, { count: 9 },
    { count: 1, slots: {} }, { count: 0, slots: [] }, { count: 1, slots: { s9: 1 } },
    { count: 1, slots: { s1: 2 } }, { count: 2, slots: { s1: 1, s2: 1 } },
    { count: 1, slots: { s1: '1' } }, { count: 2, slots: { s1: 1, s2: 3 } }]) {
    assert.throws(() => placePrivateRank(deck, record, 3), errorCode('INVALID_RANKING'));
  }
  assert.deepEqual(placePrivateRank(deck, { count: 0 }, 1), { count: 1, slots: { s1: 1 } });
  assert.deepEqual(placePrivateRank(deck, { count: 0, slots: null }, 1), { count: 1, slots: { s1: 1 } });
});

test('private players can progress independently and transaction retries do not mutate their records', () => {
  const record = freeze(createPrivateRank());
  const left = placePrivateRank(deck, record, 1);
  const right = placePrivateRank(deck, record, 8);
  assert.deepEqual(placePrivateRank(deck, record, 1), left);
  const advanced = placePrivateRank(deck, freeze(left), 4);
  assert.equal(advanced.count, 2);
  assert.equal(right.count, 1);
  assert.deepEqual(record, { count: 0, slots: {} });
  assert.deepEqual(right.slots, { s8: 1 });
});

test('complete identical rankings score 100 percent and reversed rankings score zero', () => {
  const game = createCooperative('double-ranking', pool);
  const identical = revealDoubleRanking(game, { p1: slots(deck), p2: slots(deck) });
  assert.equal(identical.phase, 'finished');
  assert.equal(identical.result.compatibility, 100);
  assert.equal(identical.result.distance, 0);
  assert.equal(identical.result.exactMatches, 8);
  const reversed = revealDoubleRanking(game, { p1: slots(deck), p2: slots([...deck].reverse()) });
  assert.equal(reversed.result.compatibility, 0);
  assert.equal(reversed.result.distance, 32);
  assert.equal(reversed.result.exactMatches, 0);
  assert.deepEqual(reversed.result.differences.map(item => item.difference), [7, 7, 5, 5, 3, 3, 1, 1]);
  assert.deepEqual(normalizeCooperative('double-ranking', reversed), reversed);
  assert.throws(() => revealDoubleRanking(identical, identical.rankings), errorCode('GAME_FINISHED'));
});

test('an adjacent swap keeps high compatibility while sorting the two disagreements first', () => {
  const swapped = [2, 1, ...deck.slice(2)];
  const game = revealDoubleRanking(createCooperative('double-ranking', pool), { p1: slots(deck), p2: slots(swapped) });
  assert.equal(game.result.compatibility, 94);
  assert.equal(game.result.distance, 2);
  assert.equal(game.result.exactMatches, 6);
  assert.deepEqual(game.result.differences.slice(0, 2), [
    { id: 1, p1: 1, p2: 2, difference: 1 }, { id: 2, p1: 2, p2: 1, difference: 1 },
  ]);
});

test('double ranking stays private until both exact eight-card rankings are supplied', () => {
  const game = createCooperative('double-ranking', pool);
  for (const rankings of [null, {}, { p1: slots(deck) }, { p1: slots(deck), p2: slots(deck.slice(0, 7)) },
    { p1: slots(deck), p2: slots([1, 1, 3, 4, 5, 6, 7, 8]) },
    { p1: slots(deck), p2: slots([1, 2, 3, 4, 5, 6, 7, 9]) },
    { p1: slots(deck), p2: slots(deck), other: slots(deck) }]) {
    assert.throws(() => revealDoubleRanking(game, rankings), errorCode('INVALID_RANKING'));
  }
  assert.deepEqual(game.rankings, {});
  assert.equal(game.result, null);
  assert.throws(() => normalizeCooperative('double-ranking', { ...game, rankings: { p1: slots(deck) } }), CooperativeError);
});

test('double ranking restores RTDB omissions but verifies every finished comparison and percentage', () => {
  const game = createCooperative('double-ranking', pool);
  delete game.rankings;
  delete game.result;
  assert.deepEqual(normalizeCooperative('double-ranking', game), createCooperative('double-ranking', pool));
  const finished = revealDoubleRanking(game, { p1: slots(deck), p2: slots([...deck].reverse()) });
  const edits = [value => { delete value.rankings; }, value => { delete value.result; },
    value => { value.result.compatibility = 100; }, value => { value.result.distance = 0; },
    value => { value.result.exactMatches = 8; }, value => { value.result.differences.reverse(); },
    value => { value.result.differences[0].p1 = 8; }, value => { value.result.differences[0].difference = 0; },
    value => { value.result.differences.pop(); }, value => { delete value.result.differences[0]; }, value => { value.rankings.p1.s1 = 9; },
    value => { value.phase = 'playing'; }];
  for (const edit of edits) {
    const altered = structuredClone(finished);
    edit(altered);
    assert.throws(() => normalizeCooperative('double-ranking', altered), CooperativeError);
  }
});

test('double-ranking reveal and normalization detach all result and ranking objects', () => {
  const game = freeze(createCooperative('double-ranking', pool));
  const rankings = freeze({ p1: slots(deck), p2: slots([...deck].reverse()) });
  const next = revealDoubleRanking(game, rankings);
  assert.deepEqual(next, revealDoubleRanking(game, rankings));
  const normal = normalizeCooperative('double-ranking', freeze(next));
  normal.deck[0] = 900;
  normal.rankings.p1.s1 = 900;
  normal.result.differences[0].id = 900;
  assert.equal(next.deck[0], 1);
  assert.equal(next.rankings.p1.s1, 1);
  assert.equal(next.result.differences[0].id, 1);
  assert.equal(game.result, null);
});
