import test from 'node:test';
import assert from 'node:assert/strict';
import { compactSnapshotPathExpression, compactSnapshotPaths } from '../tools/compact-snapshot-paths.mjs';

class Snapshot {
  constructor(value) { this.value = value; }
  child(path) { return new Snapshot(path.split('/').reduce((value, part) => value?.[part], this.value)); }
  val() { return this.value ?? null; }
  exists() { return this.val() !== null; }
  hasChild(path) { return this.child(path).exists(); }
}
const evaluate = (source, value) => Function('newData', 'data', 'root', 'key', `return ${source}`)(new Snapshot(value), new Snapshot(value), new Snapshot(value), 'p1');

test('literal child path compaction preserves existing, missing, numeric and dynamic snapshot nodes', () => {
  const expressions = [
    "newData.child('ranking').child('p1/count').val()===3",
    "data.child('ranking').child('p1').child('slots').child('0').val()===7",
    "root.child('ranking').child(key).child('slots').child('0').exists()",
    "!newData.child('ranking').child('p2/count').exists()",
    "newData.child('ranking').child('p1').hasChild('count')",
  ];
  for (const source of expressions) {
    const compacted = compactSnapshotPathExpression(source);
    assert.ok(compacted.length < source.length);
    for (const value of [{ ranking: { p1: { count: 3, slots: [7] } } }, { ranking: { p1: null } }, { ranking: [] }, {}])
      assert.equal(evaluate(compacted, value), evaluate(source, value));
    assert.equal(compactSnapshotPathExpression(compacted), compacted);
  }
});

test('path compaction treats strings, regexes, dynamic paths, parent traversal and unusual literals as opaque', () => {
  for (const source of [
    `newData.val()===".child('a').child('b')"`,
    "newData.val()==='escaped\\\' .child(\'a\').child(\'b\')'",
    "newData.val().matches(/^\\.child\\('a'\\)\\.child\\('b'\\)$/)",
    "newData.child('a').child(key)",
    "newData.child('a').parent().child('b')",
    "newData.child('a/').child('b')",
    "newData.child('').child('b')",
    "newData.child('a//b').child('c')",
  ]) assert.equal(compactSnapshotPathExpression(source), source);
});

test('tree compaction changes only rule expressions and leaves indexes and metadata intact', () => {
  const source = "newData.child('ranking').child('p1/count').val()===3";
  const document = { rules: { data: { '.validate': source, '.indexOn': ['ranking/p1/count'], description: source } } };
  assert.equal(compactSnapshotPaths(document), document);
  assert.equal(document.rules.data['.validate'], "newData.child('ranking/p1/count').val()===3");
  assert.deepEqual(document.rules.data['.indexOn'], ['ranking/p1/count']);
  assert.equal(document.rules.data.description, source);
});
