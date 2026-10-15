import test from 'node:test';
import assert from 'node:assert/strict';
import { compactRuleExpression } from '../tools/compact-rule-expressions.mjs';
test('both distributive boolean duals preserve every permission truth assignment', () => {
  const sources = ['(a||b)&&(a||c)&&(a||d)', '(a&&b)||(a&&c)||(a&&d)', '(a||b)&&(a||c)&&d', '(a&&b)||(a&&c)||d', '(a||b||c)&&(a||b||d)', '(a&&b&&c)||(a&&b&&d)', '(a||b)&&(b||c)&&(c||d)&&(a||d)', '(a||b)&&(a||c)?(a&&d)||(b&&d):(a||c)&&(b||c)'];
  for (const source of sources) {
    const result = compactRuleExpression(source);
    for (let bits = 0; bits < 16; bits++) {
      const args = [0, 1, 2, 3].map(bit => Boolean(bits & (1 << bit)));
      assert.equal(Function('a', 'b', 'c', 'd', `return ${result}`)(...args), Function('a', 'b', 'c', 'd', `return ${source}`)(...args), `${source}: ${bits}`);
    }
    assert.ok(result.length <= source.length);
  }
});
