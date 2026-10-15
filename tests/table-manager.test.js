import test from 'node:test';
import assert from 'node:assert/strict';
import { tablePlan } from '../js/table-manager.js';
const room = { players: { p1: { uid: 'host' }, p2: { uid: 'two' }, p3: { uid: 'three' }, p4: { uid: 'four' } } };
test('host draft removes occupied nonhost seats once without mutating the room', () => {
  const original = structuredClone(room);
  const plan = tablePlan(room, ['p1', 'p2', 'p2', 'p4', 'p8'], { datasetId: 'futbol', mode: 'auction' });
  assert.deepEqual(plan.removeSeats, ['p2', 'p4']); assert.deepEqual(plan.survivors, ['p1', 'p3']);
  assert.equal(plan.count, 2); assert.equal(plan.overCapacity, false); assert.deepEqual(room, original);
});
test('table draft reports mode capacity and allows an underfilled waiting table', () => {
  assert.equal(tablePlan(room, [], { mode: 'bracket' }).overCapacity, true);
  const plan = tablePlan(room, ['p2', 'p3', 'p4'], { mode: 'chameleon' });
  assert.equal(plan.underMinimum, true); assert.equal(plan.overCapacity, false);
});
test('bracket size is included only for bracket configurations', () => {
  assert.deepEqual(tablePlan(room, ['p3', 'p4'], { mode: 'bracket', datasetId: 'futbol', bracketSize: 32 }).config,
    { mode: 'bracket', datasetId: 'futbol', bracketSize: 32 });
  assert.equal('bracketSize' in tablePlan(room, [], { mode: 'auction', bracketSize: 32 }).config, false);
});
