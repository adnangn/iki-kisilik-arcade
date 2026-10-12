// Merge reviewed development feeds. The browser still reads only veri.json.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const data = JSON.parse(await readFile(new URL('veri.json', root), 'utf8'));
const canonicalName = name => name.normalize('NFC').trim().toLocaleLowerCase('tr');
for (const filename of ['expansion-football.json', 'expansion-menu.json', 'expansion-culture.json']) {
  const feed = JSON.parse(await readFile(new URL(`tools/${filename}`, root), 'utf8'));
  for (const [datasetId, additions] of Object.entries(feed)) {
    const pool = data[datasetId] ||= [];
    for (const card of additions) {
      const existing = pool.find(value => value.id === card.id);
      if (existing && datasetId === 'turkiye-efsaneleri') {
        // These same players now wear their historic Turkey club colours.
        // Their stable ID/name/image path cannot be reassigned to someone else.
        for (const key of ['id', 'isim', 'gorsel', 'etiket']) assert.equal(existing[key], card[key], `${datasetId}/${card.id}: kart kimliği değiştirilemez.`);
      } else if (existing) assert.deepEqual(existing, card, `${datasetId}/${card.id}: eski kart değiştirilemez.`);
      else pool.push(card);
    }
    assert.equal(new Set(pool.map(card => card.id)).size, pool.length, `${datasetId}: tekrar eden ID.`);
    assert.equal(new Set(pool.map(card => canonicalName(card.isim))).size, pool.length, `${datasetId}: tekrar eden isim.`);
  }
}

const turkeyIcons = JSON.parse(await readFile(new URL('tools/turkey-icons.json', root), 'utf8'))['turkiye-efsaneleri'];
assert.equal(turkeyIcons.length, 120);
const iconsById = new Map(turkeyIcons.map(card => [card.id, card]));
for (const old of data['turkiye-efsaneleri']) {
  const revised = iconsById.get(old.id);
  assert.ok(revised, `Türkiye kartı silinemez: ${old.id}`);
  for (const key of ['id', 'isim', 'gorsel', 'etiket']) assert.equal(revised[key], old[key], `${old.id}: kart kimliği değiştirilemez.`);
}
data['turkiye-efsaneleri'] = turkeyIcons;

for (const filename of ['world-stars-extra.json', 'culture-extra.json', 'nostalgia-sets.json', 'games-geo.json', 'valorant-agents.json', 'lol-champions.json']) {
  const feed = JSON.parse(await readFile(new URL(`tools/${filename}`, root), 'utf8'));
  for (const [datasetId, additions] of Object.entries(feed)) {
    const pool = data[datasetId] ||= [];
    for (const card of additions) {
      const existing = pool.find(value => value.id === card.id);
      if (existing && datasetId === 'cocukluk-cizgifilmleri' && card.id === 11011 && existing.isim === 'Looney Tunes') {
        // The requested series-to-character revision keeps its original ID.
        assert.equal(card.isim, 'Bugs Bunny');
        pool[pool.indexOf(existing)] = card;
      } else if (existing && datasetId === 'cocukluk-cizgifilmleri' && card.evren === 'Looney Tunes') {
        const { evren: oldSeries, ...oldIdentity } = existing;
        const { evren: newSeries, ...newIdentity } = card;
        assert.deepEqual(oldIdentity, newIdentity, `${datasetId}/${card.id}: yalnız seri arama metadata alanı eklenebilir.`);
        pool[pool.indexOf(existing)] = card;
      } else if (existing) assert.deepEqual(existing, card, `${datasetId}/${card.id}: eski kart değiştirilemez.`);
      else pool.push(card);
    }
  }
}
const volumes = JSON.parse(await readFile(new URL('tools/collection-volumes.json', root), 'utf8'));
for (const [datasetId, volume] of Object.entries(volumes)) {
  assert.equal(new Set(volume.ids).size, volume.ids.length, `${datasetId}: tekrar eden seçim.`);
  data[datasetId] = volume.ids.map(id => {
    const original = data[volume.source].find(card => card.id === id);
    assert.ok(original, `${datasetId}: ana koleksiyonda olmayan kart ${id}`);
    return { ...original };
  });
}
// Keep the old mixed pool for rooms created before this release. The lobby
// only exposes the two typed copies; card IDs and image paths stay unchanged.
data['oyun-karakterleri'] = data['oyun-evreni'].filter(card => card.tip === 'karakter').map(card => ({ ...card }));
data.oyunlar = data['oyun-evreni'].filter(card => card.tip === 'oyun').map(card => ({ ...card }));
const expected = { futbol: 100, superlig: 100, tatli: 100, yemek: 100, dizi: 50, film: 50,
  'turkiye-efsaneleri': 120, 'dunya-yildizlari': 100, 'yerli-sanatcilar': 100, 'ankara-ilceleri': 25, icecek: 50, 'istanbul-ilceleri': 39,
  'cocukluk-cizgifilmleri': 60, 'doksanlar-nostalji': 35, 'kantin-bakkal': 35,
  'turkiye-sehirleri': 81, 'oyun-evreni': 100, ulkeler: 80,
  'tatli-vol1': 35, 'yemek-vol1': 50, 'oyun-karakterleri': 60, oyunlar: 40,
  'valorant-ajanlari': 29, 'lol-sampiyonlari': 173 };
assert.deepEqual(Object.keys(data).sort(), Object.keys(expected).sort());
for (const [key, count] of Object.entries(expected)) {
  assert.equal(data[key].length, count, key);
  assert.equal(new Set(data[key].map(card => card.id)).size, count, `${key}: tekrar eden ID.`);
  assert.equal(new Set(data[key].map(card => canonicalName(card.isim))).size, count, `${key}: tekrar eden isim.`);
}
await writeFile(new URL('veri.json', root), JSON.stringify(data, null, 2) + '\n', 'utf8');
const rulesUrl = new URL('firebase.rules.json', root);
const rules = JSON.parse(await readFile(rulesUrl, 'utf8'));
const allowedDatasets = Object.keys(data).map(id => `newData.val() === '${id}'`).join(' || ');
rules.rules.rooms.$code.datasetId['.validate'] = `(${allowedDatasets}) && (!data.exists() || newData.val() === data.val())`;
await writeFile(rulesUrl, JSON.stringify(rules, null, 2) + '\n', 'utf8');
console.log(`${Object.keys(data).length} veri havuzu (23 lobi seçimi + eski odalar için 1 arşiv havuzu) tek veri.json dosyasına birleştirildi.`);
