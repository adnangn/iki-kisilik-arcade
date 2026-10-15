import test from 'node:test';
import assert from 'node:assert/strict';
import { TELEPATHY_QUESTIONS, TELEPATHY_QUESTION_COUNT, shuffledTelepathyCriteria, validTelepathyCriteria } from '../js/telepathy-questions.js';
import { createPartyGame, normalizePartyGame, resolvePartyRound, changePartyGame, partyCards } from '../js/party-games.js';
const deck = Array.from({ length: 40 }, (_, index) => index + 1);

test('forty distinct collection-neutral questions are available as editable catalog fields', async () => {
  const { TEXT_CATALOG } = await import('../js/text-catalog.js');
  assert.equal(TELEPATHY_QUESTION_COUNT, 40);
  assert.equal(new Set(TELEPATHY_QUESTIONS).size, 40);
  for (const [index, question] of TELEPATHY_QUESTIONS.entries()) {
    assert.ok(question.endsWith('?'));
    assert.doesNotMatch(question, /(?:futbol|takım|gol|yemek|tatlı|lezzet|şarkı|konser|film|ülke|şehir|karakter)/iu);
    assert.equal(TEXT_CATALOG[`party.telepathy.question.${index}`].value, question);
  }
});
test('each draw uses ten different questions even with constant random sources', () => {
  for (const random of [() => 0, length => length - 1, length => Math.floor(length / 2)]) {
    const criteria = shuffledTelepathyCriteria(random);
    assert.equal(criteria.length, 10); assert.equal(new Set(criteria).size, 10);
    assert.ok(validTelepathyCriteria(criteria));
  }
  assert.ok(shuffledTelepathyCriteria(length => length - 1).some(value => value > 9));
  for (const random of [() => -1, length => length, () => .5, () => NaN]) assert.throws(() => shuffledTelepathyCriteria(random));
});
test('new games reject repeated or invalid criteria while old repeat-containing rooms can finish', () => {
  const options = { seats: ['p1', 'p2'], deck };
  const repeats = Array(10).fill(2);
  assert.throws(() => createPartyGame('telepathy', { ...options, criteria: repeats }));
  assert.throws(() => createPartyGame('telepathy', { ...options, criteria: [40, 1, 2, 3, 4, 5, 6, 7, 8, 9] }));
  let legacy = createPartyGame('telepathy', options); legacy.criteria = repeats;
  assert.deepEqual(normalizePartyGame(legacy).criteria, repeats);
  for (let round = 0; round < 10; round++) {
    const cardId = partyCards(legacy)[0];
    legacy = resolvePartyRound(legacy, { p1: { cardId }, p2: { cardId } });
    if (legacy.phase !== 'finished') legacy = changePartyGame(legacy, 'p1', 'next');
  }
  assert.equal(legacy.phase, 'finished'); assert.equal(Object.keys(legacy.results).length, 10);
});
test('all forty question indices survive a full game and retain a unique results mapping', () => {
  for (let block = 0; block < 4; block++) {
    const criteria = Array.from({ length: 10 }, (_, index) => block * 10 + index);
    let game = createPartyGame('telepathy', { seats: ['p1', 'p2', 'p3', 'p4'], deck, criteria });
    for (let round = 0; round < 10; round++) {
      const cardId = partyCards(game)[0];
      game = resolvePartyRound(game, Object.fromEntries(game.seats.map(seat => [seat, { cardId }])));
      assert.equal(game.criteria[round], criteria[round]);
      if (game.phase !== 'finished') game = changePartyGame(game, 'p1', 'next');
    }
    assert.equal(Object.keys(game.results).length, 10); assert.deepEqual(normalizePartyGame(game).criteria, criteria);
  }
});
