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

for (const [key, count] of Object.entries({ 'cocukluk-cizgifilmleri': 35, 'doksanlar-nostalji': 35, 'kantin-bakkal': 35, 'turkiye-sehirleri': 81, 'oyun-evreni': 100, ulkeler: 80 })) {
  test(`${key}: exactly ${count} unique cards with safe local SVG images`, async () => verifyCards(datasets[key], count));
}

test('new nostalgia pools include the requested childhood titles and snacks', () => {
  for (const name of ['Heidi', 'Pepee', 'Rafadan Tayfa', 'Kaptan Tsubasa', 'Pokémon']) {
    assert.ok(datasets['cocukluk-cizgifilmleri'].some(card => card.isim === name), name);
  }
  for (const name of ['Tadelle', 'Metro', 'Çokokrem']) {
    assert.ok(datasets['kantin-bakkal'].some(card => card.isim.includes(name)), name);
  }
  assert.ok(datasets['doksanlar-nostalji'].some(card => card.isim.includes('Tamagotchi')));
});

test('game universe distinguishes sixty characters from forty game titles', () => {
  const cards = datasets['oyun-evreni'];
  assert.equal(cards.filter(card => card.tip === 'karakter').length, 60);
  assert.equal(cards.filter(card => card.tip === 'oyun').length, 40);
  assert.ok(cards.some(card => card.isim === 'Mario'));
  assert.ok(cards.some(card => card.isim === 'Kratos'));
});

for (const [key, count] of Object.entries({ 'turkiye-efsaneleri': 120, 'dunya-yildizlari': 100 })) {
  test(`${key}: ${count} football cards use historic club or national metadata and local portraits`, async () => {
    await verifyCards(datasets[key], count);
    for (const card of datasets[key]) {
      assert.ok(['FV', 'OF', 'DF', 'KL'].includes(card.etiket), card.isim);
      assert.ok(card.takim.length > 1, card.isim);
      assert.equal(card.takimTuru, key === 'turkiye-efsaneleri' ? 'kulup' : 'milli');
    }
  });
}

test('yerli-sanatcilar: 100 performers include bands and playable genre trios', async () => {
  const cards = datasets['yerli-sanatcilar'];
  await verifyCards(cards, 100);
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

test('istanbul-ilceleri: all 39 official districts have distinct local landscapes', async () => {
  const cards = datasets['istanbul-ilceleri'];
  await verifyCards(cards, 39);
  const names = ['Adalar', 'Arnavutköy', 'Ataşehir', 'Avcılar', 'Bağcılar', 'Bahçelievler', 'Bakırköy', 'Başakşehir', 'Bayrampaşa', 'Beşiktaş', 'Beykoz', 'Beylikdüzü', 'Beyoğlu', 'Büyükçekmece', 'Çatalca', 'Çekmeköy', 'Esenler', 'Esenyurt', 'Eyüpsultan', 'Fatih', 'Gaziosmanpaşa', 'Güngören', 'Kadıköy', 'Kağıthane', 'Kartal', 'Küçükçekmece', 'Maltepe', 'Pendik', 'Sancaktepe', 'Sarıyer', 'Silivri', 'Sultanbeyli', 'Sultangazi', 'Şile', 'Şişli', 'Tuzla', 'Ümraniye', 'Üsküdar', 'Zeytinburnu'];
  assert.deepEqual(cards.map(card => card.isim).sort(), names.sort());
  assert.ok(cards.every(card => card.etiket === 'İstanbul'));
});

test('Turkey club icons include the requested players in the first preview', () => {
  const cards = datasets['turkiye-efsaneleri'];
  const clubs = { 'İbrahima Yattara': 'Trabzonspor', 'Didier Drogba': 'Galatasaray', 'Gheorghe Hagi': 'Galatasaray', 'Alex de Souza': 'Fenerbahçe' };
  assert.deepEqual(new Set(cards.slice(0, 4).map(card => card.isim)), new Set(Object.keys(clubs)));
  for (const [name, club] of Object.entries(clubs)) assert.equal(cards.find(card => card.isim === name)?.takim, club, name);
});

test('all 725 previously published card identities survive the expansion', async () => {
  for (const filename of ['expansion-football.json', 'expansion-menu.json', 'expansion-culture.json']) {
    const earlier = JSON.parse(await readFile(new URL(`tools/${filename}`, root), 'utf8'));
    for (const [key, cards] of Object.entries(earlier)) {
      for (const old of cards) {
        const card = datasets[key].find(value => value.id === old.id);
        assert.ok(card, `${key}/${old.id}`);
        if (key === 'turkiye-efsaneleri') {
          for (const field of ['id', 'isim', 'etiket', 'gorsel']) assert.equal(card[field], old[field], `${key}/${old.id}/${field}`);
        } else assert.deepEqual(card, old, `${key}/${old.id}`);
      }
    }
  }
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

test('seven categories resolve to eighteen separate pools, including category switches', () => {
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
  assert.equal(resolveDatasetId('ankara', 'istanbul-ilceleri'), 'istanbul-ilceleri');
  assert.equal(resolveDatasetId('ankara', 'turkiye-sehirleri'), 'turkiye-sehirleri');
  assert.equal(resolveDatasetId('ankara', 'ulkeler'), 'ulkeler');
  assert.equal(resolveDatasetId('nostalji', 'kantin-bakkal'), 'kantin-bakkal');
  assert.equal(resolveDatasetId('nostalji', 'doksanlar-nostalji'), 'doksanlar-nostalji');
  assert.equal(resolveDatasetId('oyun', 'futbol'), 'oyun-evreni');
  assert.deepEqual(Object.values(DATASET_GROUPS).map(group => group.sets.length), [4, 3, 2, 1, 4, 3, 1]);
  for (const group of Object.values(DATASET_GROUPS)) {
    for (const set of group.sets) assert.ok(Object.hasOwn(TEXT_CATALOG, set.searchKey), set.id);
  }
});

test('all eighteen pools open and award through an auction, including nonconsecutive meal IDs', () => {
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
