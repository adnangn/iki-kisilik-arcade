import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DATASET_GROUPS, DATASET_NAMES, resolveDatasetId } from '../js/datasets.js';
import { createAuction, passTurn } from '../js/auction.js';

const root = new URL('../', import.meta.url);
const datasets = JSON.parse(await readFile(new URL('veri.json', root), 'utf8'));

async function verifyCards(cards, count) {
  assert.equal(cards.length, count);
  for (const field of ['id', 'isim', 'gorsel']) assert.equal(new Set(cards.map(card => card[field])).size, count, `Duplicate ${field}`);
  for (const card of cards) {
    assert.ok(Number.isSafeInteger(card.id) && card.id > 0 && card.id <= 1000000);
    assert.ok(card.isim.trim() && card.etiket.trim());
    assert.match(card.gorsel, /^assets\/images\/[a-z0-9/-]+\.svg$/);
    assert.ok(!card.gorsel.includes('..'));
    const image = await readFile(new URL(card.gorsel, root), 'utf8');
    assert.match(image, /<svg\b/);
    assert.match(image, /shape-rendering="crispEdges"/);
    assert.doesNotMatch(image, /<script|<foreignObject|(?:href|src)="https?:/i);
  }
}

for (const key of ['futbol', 'superlig']) {
  test(`${key}: 100 unique playable football cards with team metadata and local portraits`, async () => {
    const cards = datasets[key];
    await verifyCards(cards, 100);
    for (const card of cards) {
      assert.ok(['FV', 'OF', 'DF', 'KL'].includes(card.etiket), card.isim);
      assert.ok(card.takim.length > 1, card.isim);
      assert.equal(card.takimTuru, key === 'futbol' ? 'milli' : 'kulup');
      assert.match(card.gorsel, /^assets\/images\/(legends|superlig)\/[a-z0-9-]+\.svg$/);
    }
  });
}

for (const key of ['tatli', 'yemek', 'dizi', 'film']) {
  test(`${key}: exactly 50 unique cards with original local pixel art`, async () => verifyCards(datasets[key], 50));
}

test('1990–2015 additions keep earlier legends and include the requested era', () => {
  assert.equal(datasets.futbol.find(card => card.id === 1).isim, 'Lionel Messi');
  assert.equal(datasets.futbol.find(card => card.id === 50).isim, 'Oliver Kahn');
  assert.equal(datasets.futbol.filter(card => card.id >= 51 && card.id <= 80 && card.donem === '1990–2015').length, 30);
  for (const isim of ['Steven Gerrard', 'Frank Lampard', 'Francesco Totti', 'Gheorghe Hagi', 'Alex de Souza', 'Pavel Nedvěd']) {
    assert.ok(datasets.futbol.some(card => card.isim === isim && card.donem === '1990–2015'), isim);
  }
});

test('requested current stars use their verified club and every club card has a source', async () => {
  for (const [isim, takim] of [['Dušan Vlahović', 'Beşiktaş'], ['Mason Greenwood', 'Fenerbahçe'], ['Mohamed Salah', 'Trabzonspor'], ['Dia Saba', 'Amed FK']]) {
    assert.equal(datasets.superlig.find(card => card.isim === isim)?.takim, takim, isim);
  }
  assert.equal(datasets.superlig.filter(card => card.id <= 80 && card.takim === 'Amed FK').length, 8);
  const sources = JSON.parse(await readFile(new URL('tools/football-sources.json', root), 'utf8'));
  for (const card of datasets.superlig) {
    assert.ok(sources.kaynaklar.some(source => source.kulup === card.takim && source.kartIdleri.includes(card.id)), card.isim);
  }
});

test('main category and subset resolve to six separate pools, including category switches', () => {
  assert.deepEqual(Object.keys(DATASET_NAMES).sort(), Object.keys(datasets).sort());
  assert.equal(resolveDatasetId('futbol', 'superlig'), 'superlig');
  assert.equal(resolveDatasetId('yemek', 'tatli'), 'tatli');
  assert.equal(resolveDatasetId('yemek', 'yemek'), 'yemek');
  assert.equal(resolveDatasetId('dizi', 'film'), 'film');
  assert.equal(resolveDatasetId('dizi', 'dizi'), 'dizi');
  assert.equal(resolveDatasetId('yemek', 'superlig'), 'tatli');
  assert.equal(resolveDatasetId('dizi', 'yemek'), 'dizi');
  assert.equal(resolveDatasetId('futbol', 'film'), 'futbol');
  assert.throws(() => resolveDatasetId('unknown', 'film'));
  assert.equal(Object.values(DATASET_GROUPS).every(group => group.sets.length === 2), true);
});

test('all six pools open and award through an auction, including nonconsecutive meal IDs', () => {
  for (const cards of Object.values(datasets)) {
    const game = createAuction(cards.map(card => card.id), 'p1');
    assert.equal(game.highestBid, 1);
    assert.equal(game.awardCount, 0);
    assert.deepEqual(game.budgets, { p1: 20, p2: 20 });
    const afterPass = passTurn(game, 'p2');
    assert.equal(afterPass.rosters.p1[0].id, cards[0].id);
    assert.equal(afterPass.currentCardId, cards[1].id);
    assert.equal(afterPass.budgets.p1, 19);
    assert.equal(afterPass.bidderSeat, 'p2');
  }
});
