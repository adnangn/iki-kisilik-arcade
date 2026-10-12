import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { TEXT_CATALOG } from '../js/text-catalog.js';
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

for (const [key, count] of Object.entries({ tatli: 100, yemek: 100, dizi: 50, film: 50 })) {
  test(`${key}: exactly ${count} unique cards with original local pixel art`, async () => verifyCards(datasets[key], count));
}

for (const key of ['turkiye-efsaneleri', 'dunya-yildizlari']) {
  test(`${key}: 50 football cards use country metadata and local pixel portraits`, async () => {
    await verifyCards(datasets[key], 50);
    for (const card of datasets[key]) {
      assert.ok(['FV', 'OF', 'DF', 'KL'].includes(card.etiket), card.isim);
      assert.ok(card.takim.length > 1, card.isim);
      assert.equal(card.takimTuru, 'milli');
    }
  });
}

test('yerli-sanatcilar: 50 performers include bands and playable genre trios', async () => {
  const cards = datasets['yerli-sanatcilar'];
  await verifyCards(cards, 50);
  assert.ok(cards.filter(card => card.tip === 'grup').length >= 8);
  assert.ok(cards.every(card => ['grup', 'sanatci'].includes(card.tip)));
  assert.ok(new Set(cards.map(card => card.etiket)).size >= 4);
});

test('ankara-ilceleri: all 25 official districts have distinct local landscapes', async () => {
  const cards = datasets['ankara-ilceleri'];
  await verifyCards(cards, 25);
  const names = ['Akyurt', 'Altındağ', 'Ayaş', 'Bala', 'Beypazarı', 'Çamlıdere', 'Çankaya', 'Çubuk', 'Elmadağ', 'Etimesgut', 'Evren', 'Gölbaşı', 'Güdül', 'Haymana', 'Kalecik', 'Kahramankazan', 'Keçiören', 'Kızılcahamam', 'Mamak', 'Nallıhan', 'Polatlı', 'Pursaklar', 'Sincan', 'Şereflikoçhisar', 'Yenimahalle'];
  assert.deepEqual(cards.map(card => card.isim).sort(), names.sort());
});

test('icecek: 50 drinks keep alcoholic options in the minority', async () => {
  await verifyCards(datasets.icecek, 50);
  assert.ok(datasets.icecek.every(card => typeof card.alkol === 'boolean'));
  assert.equal(datasets.icecek.filter(card => card.alkol).length, 8);
  assert.equal(datasets.icecek.filter(card => !card.alkol).length, 42);
});

test('the original 400 card records stay identical for ongoing rooms', () => {
  const baseline = {
    futbol: [100, '810cd07c0f073f0627d4fb836a4eb81952889b0ac5a18b2b8582f608b4012f8c'],
    superlig: [100, 'a3135485d9857991c4beb38be69805b49c59c6384647730fd03dbe0886c86121'],
    tatli: [50, 'c778e3e4d3de6657216a60f8fa2663773539ff84b8433f73e5b4c9d21b4dc9a4'],
    yemek: [50, '810feb85946ed6191560e5ccac2ed3ff439fd1898cc90163f407782778fa12de'],
    dizi: [50, '82df4fdcd85314d196b62f81870246a7422df948a7d57c81a3869346983b7d0e'],
    film: [50, 'f8876eed2dbdc4fb8b6f0e37c49c6c67c37758a31e497336cb12b400082e4256']
  };
  for (const [key, [count, digest]] of Object.entries(baseline)) {
    assert.equal(createHash('sha256').update(JSON.stringify(datasets[key].slice(0, count))).digest('hex'), digest, key);
  }
});

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

test('five categories resolve to eleven separate pools, including category switches', () => {
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
  assert.equal(resolveDatasetId('futbol', 'turkiye-efsaneleri'), 'turkiye-efsaneleri');
  assert.equal(resolveDatasetId('futbol', 'dunya-yildizlari'), 'dunya-yildizlari');
  assert.equal(resolveDatasetId('yemek', 'icecek'), 'icecek');
  assert.equal(resolveDatasetId('muzik', 'film'), 'yerli-sanatcilar');
  assert.equal(resolveDatasetId('ankara', 'icecek'), 'ankara-ilceleri');
  assert.deepEqual(Object.values(DATASET_GROUPS).map(group => group.sets.length), [4, 3, 2, 1, 1]);
  for (const group of Object.values(DATASET_GROUPS)) {
    for (const set of group.sets) assert.ok(Object.hasOwn(TEXT_CATALOG, set.searchKey), set.id);
  }
});

test('all eleven pools open and award through an auction, including nonconsecutive meal IDs', () => {
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
