import test from 'node:test';
import assert from 'node:assert/strict';
import { rankingAgreement, rankingPairSummary, rankingDifferences, partyModeLimits } from '../js/party-view.js';
import { rankingMatrix } from '../js/party-games.js';

const slots = ids => Object.fromEntries(ids.map((id, index) => [`s${index + 1}`, id]));
const ids = Array.from({ length: 10 }, (_, index) => index + 1);
const first = slots(ids), reverse = slots([...ids].reverse());

test('ranking results display the same compatibility as the authoritative engine', () => {
  const rankings = { p1: first, p2: reverse, p3: slots([2, 1, 3, 4, 5, 6, 7, 8, 9, 10]), p4: slots([10, 1, 2, 3, 4, 5, 6, 7, 8, 9]) };
  const result = rankingMatrix(ids, rankings, ['p1', 'p2', 'p3', 'p4']);
  const summary = rankingPairSummary(rankings);
  assert.equal(summary.pairs.length, 6);
  for (const pair of summary.pairs) assert.equal(pair.percent, result.matrix[pair.first][pair.second]);
  assert.equal(summary.closest.percent, result.mostCompatible.compatibility);
  assert.equal(summary.furthest.percent, result.mostDifferent.compatibility);
  assert.equal(rankingAgreement(first, first), 100);
  assert.equal(rankingAgreement(first, reverse), 0);
});

test('incomplete, duplicate, and mismatched rankings never show a fabricated percentage', () => {
  assert.equal(rankingAgreement(first, { s1: 1 }), null);
  assert.equal(rankingAgreement(first, slots([1, 1, 3, 4, 5, 6, 7, 8, 9, 10])), null);
  assert.equal(rankingAgreement(first, slots([1, 2, 3, 4, 5, 6, 7, 8, 9, 11])), null);
  assert.deepEqual(rankingDifferences(first, { s1: 1 }), []);
});

test('highlighted differences explain both actual positions and the largest gaps first', () => {
  const rows = rankingDifferences(first, reverse);
  assert.deepEqual(rows[0], { id: 1, first: 1, second: 10, distance: 9 });
  assert.deepEqual(rows[1], { id: 10, first: 10, second: 1, distance: 9 });
  assert.equal(rows.length, 10);
  assert.deepEqual(rankingDifferences(first, first), []);
});

test('party mode selection respects solo, duel, and four-player requirements', () => {
  assert.deepEqual(partyModeLimits('chameleon'), { min: 3, max: 4 });
  for (const mode of ['auction', 'sealed-auction', 'telepathy', 'simultaneous-ranking']) assert.deepEqual(partyModeLimits(mode), { min: 2, max: 4 });
  for (const mode of ['blind-ranking', 'bracket']) assert.deepEqual(partyModeLimits(mode), { min: 1, max: 2 });
  for (const mode of ['detective', 'team-draft', 'frequency', 'double-ranking']) assert.deepEqual(partyModeLimits(mode), { min: 2, max: 2 });
});
