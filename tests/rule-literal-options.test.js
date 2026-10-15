import test from 'node:test';
import assert from 'node:assert/strict';
import { ruleLiteralOptions } from '../tools/rule-literal-options.mjs';
test('preflight recognizes exact compact and original string allowlists', () => {
  assert.deepEqual([...ruleLiteralOptions("newData.val()==='auction'||newData.val().matches(/^(telepathy|sealed-auction|chameleon)$/)")], ['auction', 'telepathy', 'sealed-auction', 'chameleon']);
});
test('metadata names and broad or unanchored regexes cannot masquerade as exact allowed values', () => {
  for (const source of ["newData.child('mode').val()==='auction'", "newData.val().matches(/auction/)", "newData.val().matches(/^(auction|.*)$/)", "newData.val().matches(/^(auction|)$/)"])
    assert.equal(ruleLiteralOptions(source).size, 0);
});
