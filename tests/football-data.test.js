import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { TEXT_CATALOG } from '../js/text-catalog.js';
import { DATASET_GROUPS, DATASET_NAMES, LEGACY_DATASET_IDS, resolveDatasetId } from '../js/datasets.js';
import { createAuction, passTurn } from '../js/auction.js';
import { changeRoom } from '../js/room-state.js';
import { draftTriplets } from '../js/game-setup.js';
import { playableCollections } from '../js/consolation.js';

const root = new URL('../', import.meta.url);
const datasets = playableCollections(JSON.parse(await readFile(new URL('veri.json', root), 'utf8')));

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

for (const [key, count] of Object.entries({ 'tatli-vol1': 35, tatli: 100, 'yemek-vol1': 50, yemek: 100, dizi: 50, film: 50 })) {
  test(`${key}: exactly ${count} unique cards with original local pixel art`, async () => verifyCards(datasets[key], count));
}

test('familiar food volumes reuse complete card records and local images from the full collections', () => {
  for (const [selectedId, fullId, count] of [['tatli-vol1', 'tatli', 35], ['yemek-vol1', 'yemek', 50]]) {
    const selected = datasets[selectedId];
    const full = datasets[fullId];
    assert.equal(selected.length, count);
    assert.equal(full.length, 100);
    for (const card of selected) {
      const original = full.find(value => value.id === card.id);
      assert.ok(original, `${selectedId}/${card.id} must already exist in ${fullId}`);
      assert.deepEqual(card, original, `${selectedId}/${card.id} must retain every original field`);
      assert.equal(card.gorsel, original.gorsel, 'Vol. 1 must use the existing image file.');
    }
  }
  assert.deepEqual(DATASET_GROUPS.yemek.families.map(family => [family.id, family.sets]), [
    ['tatli', ['tatli-vol1', 'tatli']],
    ['yemek', ['yemek-vol1', 'yemek']],
    ['icecek', ['icecek']],
    ['sokak', ['sokak-lezzetleri']]
  ]);
});

for (const [key, count] of Object.entries({ 'cocukluk-cizgifilmleri': 60, 'doksanlar-nostalji': 35, 'kantin-bakkal': 35, 'turkiye-sehirleri': 81, 'oyun-karakterleri': 60, oyunlar: 40, 'oyun-evreni': 100, 'valorant-ajanlari': 29, 'lol-sampiyonlari': 173, ulkeler: 80 })) {
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

test('cartoons use individual Looney Tunes characters instead of the generic franchise card', () => {
  const cards = datasets['cocukluk-cizgifilmleri'];
  assert.ok(cards.length > 50);
  assert.ok(!cards.some(card => card.isim === 'Looney Tunes'));
  for (const aliases of [['Bugs Bunny'], ['Daffy Duck'], ['Tweety'], ['Sylvester', 'Sylvester (Sylvester Kedi)'], ['Road Runner', 'Road Runner (Bip Bip)', 'Bip Bip'], ['Taz', 'Tazmanya Canavarı']]) {
    assert.ok(cards.some(card => aliases.includes(card.isim)), `Missing individual cartoon character: ${aliases[0]}`);
  }
});

test('characters and games are exclusive pools that preserve the archived mixed deck identities', async () => {
  const legacy = datasets['oyun-evreni'];
  const characters = datasets['oyun-karakterleri'];
  const games = datasets.oyunlar;
  assert.equal(characters.length, 60);
  assert.equal(games.length, 40);
  assert.ok(characters.every(card => card.tip === 'karakter'));
  assert.ok(games.every(card => card.tip === 'oyun'));
  assert.deepEqual(characters, legacy.filter(card => card.tip === 'karakter'));
  assert.deepEqual(games, legacy.filter(card => card.tip === 'oyun'));
  assert.ok(!characters.some(card => games.some(game => game.id === card.id)));
  const original = JSON.parse(await readFile(new URL('tools/games-geo.json', root), 'utf8'))['oyun-evreni'];
  assert.deepEqual(legacy, original, 'Existing mixed-deck rooms must keep all original card records.');
  assert.deepEqual(LEGACY_DATASET_IDS, ['oyun-evreni']);
  const visibleIds = Object.values(DATASET_GROUPS).flatMap(group => group.sets.map(set => set.id));
  assert.ok(!visibleIds.includes('oyun-evreni'), 'New rooms cannot select the archived mixed deck.');
  for (const name of ['Mario', 'Sonic', 'Pikachu', 'Pac-Man', 'Lara Croft', 'Kratos', 'Steve', 'CJ (Carl Johnson)', 'Scorpion']) {
    assert.ok(characters.some(card => card.isim === name), name);
  }
  for (const name of ['Minecraft', 'Grand Theft Auto V', 'PES 2013', 'Counter-Strike 2', 'Tetris', 'League of Legends', 'Valorant']) {
    assert.ok(games.some(card => card.isim === name), name);
  }
});

test('Valorant and League of Legends use separate complete character pools with stable feed identities', async () => {
  const expectations = [
    ['valorant-ajanlari', 'Valorant', 'valorant-agents.json', 17001, 29,
      ['Jett', 'Reyna', 'Sage', 'Phoenix', 'Miks', 'Veto']],
    ['lol-sampiyonlari', 'League of Legends', 'lol-champions.json', 18001, 173,
      ['Ahri', 'Ashe', 'Jinx', 'Yasuo', 'Lux', 'Locke', 'Yunara', 'Zaahen']]
  ];
  const gameIds = new Set([...datasets['oyun-karakterleri'], ...datasets.oyunlar].map(card => card.id));
  for (const [key, universe, filename, firstId, count, requested] of expectations) {
    const cards = datasets[key];
    const feed = JSON.parse(await readFile(new URL(`tools/${filename}`, root), 'utf8'));
    assert.deepEqual(cards, feed[key], `${key}: all published records must match the reproducible source feed`);
    assert.equal(cards.length, count);
    assert.ok(cards.every(card => card.tip === 'karakter' && card.evren === universe), key);
    assert.deepEqual(cards.map(card => card.id).sort((a, b) => a - b), Array.from({ length: count }, (_, index) => firstId + index));
    assert.ok(cards.every(card => !gameIds.has(card.id)), `${key}: new IDs must not collide with the existing game decks`);
    for (const name of requested) assert.ok(cards.some(card => card.isim === name), `${key}: ${name}`);
    assert.ok(new Set(cards.map(card => card.etiket)).size >= 4, `${key}: classes/roles should remain available to draft matching trios`);
  }
  assert.deepEqual([...new Set(datasets['valorant-ajanlari'].map(card => card.etiket))].sort(),
    ['Düellocu', 'Kontrol Uzmanı', 'Gözcü', 'Öncü'].sort());
  const riotClasses = { Fighter: 'Dövüşçü', Mage: 'Büyücü', Marksman: 'Nişancı', Assassin: 'Suikastçı', Tank: 'Tank', Support: 'Destek' };
  assert.equal(new Set(datasets['lol-sampiyonlari'].map(card => card.riotId)).size, 173);
  for (const card of datasets['lol-sampiyonlari']) {
    assert.ok(card.riotId && Array.isArray(card.riotSiniflar) && card.riotSiniflar.length >= 1, card.isim);
    assert.equal(card.etiket, riotClasses[card.riotSiniflar[0]], `${card.isim}: draft classes must use the official first class`);
  }
  const valorantNames = new Set(datasets['valorant-ajanlari'].map(card => card.isim));
  assert.ok(datasets['lol-sampiyonlari'].every(card => !valorantNames.has(card.isim)), 'League of Legends champions must not be mixed with Valorant agents.');
});

test('each of the four Oyun collections finishes every mode and rematches without mixing its cards', () => {
  for (const datasetId of ['oyunlar', 'oyun-karakterleri', 'valorant-ajanlari', 'lol-sampiyonlari']) {
    const cards = datasets[datasetId];
    const ids = new Set(cards.map(card => card.id));
    const deck = cards.map(card => card.id);
    const triplets = draftTriplets(cards, () => 0);
    for (const mode of ['auction', 'blind-ranking', 'bracket', 'team-draft']) {
      const payload = mode === 'team-draft' ? { triplets } : { deck };
      let room = { code: '918002', ownerUid: 'p1', datasetId, mode, status: 'waiting', round: 1,
        starterSeat: 'p1', revision: 0, players: { p1: { uid: 'p1', name: 'Alice' }, p2: { uid: 'p2', name: 'Bob' } } };
      room = changeRoom(room, 'p1', room.revision, 'start', payload);
      if (mode === 'team-draft') {
        for (const triplet of room.game.triplets) assert.ok(triplet.cards.every(id => ids.has(id)));
      } else assert.ok(room.game.deck.every(id => ids.has(id)));
      let rank = 1;
      while (room.status === 'playing') {
        if (mode === 'auction') room = changeRoom(room, room.game.turnSeat, room.revision, 'pass');
        else if (mode === 'blind-ranking') room = changeRoom(room, 'p1', room.revision, 'rank', { slot: rank++ });
        else if (mode === 'bracket') room = changeRoom(room, 'p1', room.revision, 'choose', { cardId: room.game.currentPair.left });
        else {
          const seat = ['p1', 'p2'].find(seat => !room.game.players[seat].done);
          const player = room.game.players[seat];
          const role = ['start', 'bench', 'cut'].find(role => !player.pending?.[role]);
          const cardId = room.game.triplets[player.roundIndex].cards.find(id => !Object.values(player.pending || {}).includes(id));
          room = changeRoom(room, seat, room.revision, 'assign', { role, cardId });
        }
      }
      assert.equal(room.status, 'finished', `${datasetId}/${mode}`);
      const rematch = changeRoom(room, 'p2', room.revision, 'rematch', payload);
      assert.equal(rematch.code, room.code);
      assert.equal(rematch.datasetId, datasetId);
      assert.equal(rematch.mode, mode);
      assert.equal(rematch.round, 2);
      assert.equal(rematch.starterSeat, 'p2');
      assert.equal(rematch.status, 'playing');
      if (mode === 'team-draft') assert.equal(rematch.game.assignmentCount, 0);
      else assert.ok(rematch.game.deck.every(id => ids.has(id)));
    }
  }
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

test('eight categories resolve to twenty-eight visible pools with four distinct Oyun choices and one archived deck', async () => {
  assert.deepEqual(Object.keys(DATASET_NAMES).sort(), Object.keys(datasets).sort());
  assert.equal(Object.keys(DATASET_GROUPS).length, 8);
  assert.equal(Object.keys(DATASET_NAMES).length, 29);
  assert.equal(resolveDatasetId('futbol', 'superlig'), 'superlig');
  assert.equal(resolveDatasetId('yemek', 'tatli'), 'tatli');
  assert.equal(resolveDatasetId('yemek', 'yemek'), 'yemek');
  assert.equal(resolveDatasetId('dizi', 'film'), 'film');
  assert.equal(resolveDatasetId('dizi', 'dizi'), 'dizi');
  assert.equal(resolveDatasetId('yemek', 'superlig'), 'tatli-vol1');
  assert.equal(resolveDatasetId('yemek', 'tatli-vol1'), 'tatli-vol1');
  assert.equal(resolveDatasetId('yemek', 'yemek-vol1'), 'yemek-vol1');
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
  assert.equal(resolveDatasetId('oyun', 'futbol'), 'oyunlar');
  assert.equal(resolveDatasetId('oyun', 'oyun-evreni'), 'oyunlar');
  for (const id of ['oyunlar', 'oyun-karakterleri', 'valorant-ajanlari', 'lol-sampiyonlari']) assert.equal(resolveDatasetId('oyun', id), id);
  assert.ok(!Object.hasOwn(DATASET_GROUPS, 'video-oyunlari'));
  assert.throws(() => resolveDatasetId('video-oyunlari', 'futbol'));
  assert.deepEqual(DATASET_GROUPS.oyun.sets.map(set => set.id), ['oyunlar', 'oyun-karakterleri', 'valorant-ajanlari', 'lol-sampiyonlari']);
  assert.deepEqual(Object.values(DATASET_GROUPS).map(group => group.sets.length), [4, 6, 3, 1, 6, 3, 4, 1]);
  const visibleIds = Object.values(DATASET_GROUPS).flatMap(group => group.sets.map(set => set.id));
  assert.equal(visibleIds.length, 28);
  assert.equal(new Set(visibleIds).size, 28);
  const html = await readFile(new URL('index.html', root), 'utf8');
  assert.equal((html.match(/<option\b[^>]*value="oyun"/g) || []).length, 1, 'The lobby must provide one Oyun parent category.');
  assert.doesNotMatch(html, /<option\b[^>]*value="video-oyunlari"/);
  for (const group of Object.values(DATASET_GROUPS)) {
    for (const set of group.sets) assert.ok(Object.hasOwn(TEXT_CATALOG, set.searchKey), set.id);
  }
});

test('every pool opens and awards through an auction, including volume and archived decks', () => {
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
