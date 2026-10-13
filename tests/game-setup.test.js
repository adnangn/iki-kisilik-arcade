import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { shuffledIds, draftTriplets } from '../js/game-setup.js';
const data = JSON.parse(await readFile(new URL('../veri.json', import.meta.url), 'utf8'));

test('all collections supply eleven matching-tag trios without changing source data', () => {
  for (const cards of Object.values(data)) {
    const before = structuredClone(cards);
    const triples = draftTriplets(cards, length => length - 1);
    assert.equal(triples.length, 11);
    for (const triple of triples) {
      assert.equal(new Set(triple.cards).size, 3);
      assert.ok(triple.cards.every(id => cards.find(card => card.id === id)?.etiket === triple.etiket));
    }
    assert.deepEqual(cards, before);
  }
});
test('small eligible pool cycles only after available matching trios run out', () => {
  const cards = [1, 2, 3, 4, 5, 6].map(id => ({ id, etiket: 'Tatlı' }));
  const triples = draftTriplets(cards, () => 0);
  assert.equal(new Set(triples.slice(0, 2).flatMap(triple => triple.cards)).size, 6);
  assert.equal(new Set(triples.flatMap(triple => triple.cards)).size, 6);
});
test('setup rejects unavailable trios and invalid random indices', () => {
  assert.throws(() => draftTriplets([{ id: 1, etiket: 'A' }]), /üçlü/);
  assert.throws(() => shuffledIds([{ id: 1 }, { id: 2 }], () => 9), /rastgele/);
});

test('every football collection supplies exactly one goalkeeper round across shuffled seeds', () => {
  for (const dataset of ['futbol', 'superlig', 'turkiye-efsaneleri', 'dunya-yildizlari']) {
    for (let seed = 1; seed <= 100; seed++) {
      let state = seed;
      const pick = length => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state % length; };
      const triples = draftTriplets(data[dataset], pick);
      assert.equal(triples.length, 11, dataset);
      assert.equal(triples.filter(triple => triple.etiket === 'KL').length, 1, `${dataset}, seed ${seed}`);
      assert.equal(triples.filter(triple => triple.etiket !== 'KL').length, 10);
      for (const triple of triples) assert.equal(new Set(triple.cards).size, 3);
    }
  }
});

test('football pool resets cannot add a second goalkeeper trio', () => {
  const cards = [1, 2, 3].map(id => ({ id, etiket: 'KL' })).concat([4, 5, 6].map(id => ({ id, etiket: 'FV' })));
  const triples = draftTriplets(cards, () => 0);
  assert.equal(triples.filter(triple => triple.etiket === 'KL').length, 1);
  assert.equal(triples.filter(triple => triple.etiket === 'FV').length, 10);
  assert.throws(() => draftTriplets(cards.slice(0, 3), () => 0), /kaleci dışında/);
});
