import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { installCompatibility } from '../js/compat.js';

// These exercise missing-API fallbacks in isolated realms, not a Safari engine.
function legacy() {
  const target = vm.runInNewContext('({ Object, Array, structuredClone: undefined })');
  delete target.Object.hasOwn; delete target.Array.prototype.at;
  return installCompatibility(target);
}

test('compatibility installation preserves existing implementations and is idempotent', () => {
  const target = vm.runInNewContext('({ Object, Array, structuredClone() {} })');
  const original = [target.Object.hasOwn, target.Array.prototype.at, target.structuredClone];
  installCompatibility(target);
  assert.deepEqual([target.Object.hasOwn, target.Array.prototype.at, target.structuredClone], original);
  const old = legacy(), installed = [old.Object.hasOwn, old.Array.prototype.at, old.structuredClone];
  installCompatibility(old);
  assert.deepEqual([old.Object.hasOwn, old.Array.prototype.at, old.structuredClone], installed);
  assert.equal(Object.getOwnPropertyDescriptor(old.Array.prototype, 'at').enumerable, false);
});

test('hasOwn supports null prototypes, shadowed names, primitive receivers and symbols', () => {
  const { Object: { hasOwn } } = legacy(), key = Symbol('card');
  const record = Object.assign(Object.create(null), { hasOwnProperty: false, card: undefined, [key]: 1 });
  assert.equal(hasOwn(record, 'card'), true); assert.equal(hasOwn(record, key), true);
  assert.equal(hasOwn(Object.create({ card: 1 }), 'card'), false);
  assert.equal(hasOwn('arcade', 0), true); assert.equal(hasOwn(3, 'card'), false);
  assert.throws(() => hasOwn(null, 'card'), TypeError); assert.throws(() => hasOwn(undefined, 'card'), TypeError);
});

test('at matches relative indexing, sparse arrays, conversion and array-like receivers', () => {
  const at = legacy().Array.prototype.at;
  const values = [10, , 30];
  assert.equal(at.call(values, -1), 30); assert.equal(at.call(values, -2), undefined);
  assert.equal(at.call(values, '2.9'), 30); assert.equal(at.call(values, NaN), 10);
  assert.equal(at.call(values, undefined), 10); assert.equal(at.call(values, -Infinity), undefined);
  assert.equal(at.call(values, Infinity), undefined); assert.equal(at.call(values, -4), undefined);
  assert.equal(at.call({ 0: 'A', 1: 'B', length: 2.8 }, -1), 'B');
  assert.equal(at.call('retro', -1), 'o');
  assert.throws(() => at.call(null, 0), TypeError); assert.throws(() => at.call(values, 1n), TypeError);
  assert.throws(() => at.call(values, Symbol()), TypeError);
});

test('clone preserves state primitives, undefined, sparse slots, cycles and shared references', () => {
  const { structuredClone: clone } = legacy(), shared = { card: 42 };
  const source = { score: NaN, budget: Infinity, negativeZero: -0, omitted: undefined,
    big: 12n, first: shared, second: shared, slots: new Array(3) };
  source.slots[1] = undefined; source.self = source;
  const result = clone(source);
  assert.notEqual(result, source); assert.ok(Number.isNaN(result.score)); assert.equal(result.budget, Infinity);
  assert.ok(Object.is(result.negativeZero, -0)); assert.equal(Object.hasOwn(result, 'omitted'), true);
  assert.equal(result.big, 12n); assert.equal(result.self, result);
  assert.equal(result.first, result.second); assert.notEqual(result.first, shared);
  assert.equal(result.slots.length, 3); assert.equal(0 in result.slots, false);
  assert.equal(1 in result.slots, true); assert.equal(2 in result.slots, false);
  result.first.card = 7; assert.equal(shared.card, 42);
});

test('clone safely keeps prototype-named data and ignores nonenumerable and symbol properties', () => {
  const { structuredClone: clone } = legacy();
  const source = JSON.parse('{"__proto__":{"polluted":true},"constructor":"card","prototype":2}');
  source[Symbol('private')] = 3; Object.defineProperty(source, 'hidden', { value: 4 });
  const result = clone(source);
  assert.equal(Object.getPrototypeOf(result), Object.prototype);
  assert.equal(Object.hasOwn(result, '__proto__'), true); assert.deepEqual(result.__proto__, { polluted: true });
  assert.equal(result.polluted, undefined); assert.equal({}.polluted, undefined);
  assert.equal(result.constructor, 'card'); assert.equal(result.prototype, 2);
  assert.equal(Object.hasOwn(result, 'hidden'), false); assert.equal(Object.getOwnPropertySymbols(result).length, 0);
  assert.deepEqual(clone(Object.assign(Object.create(null), { card: 1 })), { card: 1 });
});

test('clone supports dates, maps, sets and shared binary views without sharing mutable storage', () => {
  const { structuredClone: clone } = legacy(), map = new Map(), set = new Set();
  map.set(map, set); set.add(map);
  const buffer = new ArrayBuffer(8), bytes = new Uint8Array(buffer); bytes[2] = 91;
  const source = { valid: new Date(1234), invalid: new Date(NaN), map, set, bytes, view: new DataView(buffer), buffer, pattern: /card/gi };
  source.pattern.lastIndex = 3;
  const result = clone(source);
  assert.equal(result.valid.getTime(), 1234); assert.ok(Number.isNaN(result.invalid.getTime()));
  assert.equal(result.map.get(result.map), result.set); assert.equal(result.set.has(result.map), true);
  assert.equal(result.bytes.buffer, result.buffer); assert.equal(result.view.buffer, result.buffer);
  assert.equal(result.bytes[2], 91); result.bytes[2] = 17; assert.equal(bytes[2], 91);
  assert.equal(result.pattern.source, 'card'); assert.equal(result.pattern.flags, 'gi'); assert.equal(result.pattern.lastIndex, 0);
});

test('clone rejects uncloneable values and unsupported transfers explicitly', () => {
  const { structuredClone: clone } = legacy();
  for (const value of [() => {}, Symbol(), { callback() {} }, new WeakMap(), Promise.resolve(1)]) {
    assert.throws(() => clone(value), error => error.name === 'DataCloneError');
  }
  const buffer = new ArrayBuffer(8);
  assert.throws(() => clone(buffer, { transfer: [buffer] }), error => error.name === 'DataCloneError');
  assert.equal(buffer.byteLength, 8); assert.equal(clone(undefined), undefined);
  assert.deepEqual(clone({ card: 1 }, { transfer: [] }), { card: 1 });
});
