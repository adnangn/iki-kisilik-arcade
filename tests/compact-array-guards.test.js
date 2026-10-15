import test from 'node:test';
import assert from 'node:assert/strict';
import { decimalKeyExpression } from '../tools/compact-array-guards.mjs';
test('bounded decimal path decoder matches every supported deck and action index', () => {
  const evaluate = Function('$index', `return ${decimalKeyExpression('$index')}`);
  for (let index = 0; index < 200; index++) {
    const key = String(index), rulesString = Object(key);
    rulesString.matches = expression => expression.test(key);
    assert.equal(evaluate(rulesString), index);
  }
});
test('frozen contiguous decks cannot change or truncate under the boundary guard', () => {
  const allowed = (oldDeck, nextDeck) => nextDeck.length >= 10 && nextDeck.every((id, index) => id === oldDeck[index]
    && (index + 1 < nextDeck.length || index + 1 >= oldDeck.length));
  for (let size = 10; size <= 173; size++) {
    const original = Array.from({ length: size }, (_, index) => index + 1);
    assert.ok(allowed(original, [...original]));
    for (let length = 10; length < size; length++) assert.equal(allowed(original, original.slice(0, length)), false);
    assert.equal(allowed(original, [...original, 9999]), false);
    assert.equal(allowed(original, original.map((id, index) => index === 0 ? 9999 : id)), false);
  }
});
