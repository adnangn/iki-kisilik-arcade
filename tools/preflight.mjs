import assert from 'node:assert/strict';
import { lstat, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { firebaseConfig, emulatorConfig } from '../firebase-config.js';
import { DATASET_GROUPS, DATASET_NAMES } from '../js/datasets.js';
import { shuffledIds, draftTriplets } from '../js/game-setup.js';
import { createAuction, passTurn } from '../js/auction.js';
import { createBlindRanking, placeBlindCard } from '../js/blind-ranking.js';
import { createBracket, chooseBracketCard } from '../js/bracket.js';
import { createTeamDraft, assignTeamCard } from '../js/team-draft.js';
import { createCooperative, revealFrequency, advanceFrequency, createPrivateRank, placePrivateRank, revealDoubleRanking } from '../js/cooperative.js';
import { normalizeTexts } from '../js/texts.js';
import { TEXT_CATALOG } from '../js/text-catalog.js';

export const PROJECT_ROOT = fileURLToPath(new URL('../', import.meta.url));
export const RUNTIME_FILES = ['index.html', 'styles.css', 'cooperative.css', 'app.js', 'firebase-config.js', 'veri.json', 'metinler.json', 'metin-duzenleyici.html', 'editor.css', '.nojekyll'];
export const RUNTIME_DIRECTORIES = ['js', 'assets'];

// Keep exact filename case: Windows accepts case mismatches that Pages rejects.
export async function listFiles(directory, prefix = '') {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    assert.ok(!entry.isSymbolicLink(), `Sembolik bağlantı paketlenemez: ${relative}`);
    if (entry.isDirectory()) result.push(...await listFiles(path.join(directory, entry.name), relative));
    else {
      assert.ok(entry.isFile(), `Normal dosya gerekli: ${relative}`);
      result.push(relative);
    }
  }
  return result.sort();
}

function finishAllModes(cards, datasetId) {
  // A fixed picker makes this check reproducible without changing game data.
  const pick = () => 0;
  const deck = shuffledIds(cards, pick);
  let auction = createAuction(deck, 'p1');
  while (auction.phase === 'playing') auction = passTurn(auction, auction.turnSeat);
  assert.equal(auction.awardCount, 10, `${datasetId}: açık artırma 10 ayrı Pas ile bitmeli.`);
  for (const seat of ['p1', 'p2']) assert.equal(auction.rosters[seat].length, 5);

  let blind = createBlindRanking(deck, 'p1');
  for (let slot = 1; slot <= 10; slot++) blind = placeBlindCard(blind, 'p1', slot);
  assert.equal(blind.phase, 'finished');
  assert.equal(Object.keys(blind.slots).length, 10);

  let bracket = createBracket(deck, 'p1');
  for (let match = 0; match < 15; match++) bracket = chooseBracketCard(bracket, 'p1', bracket.currentPair.left);
  assert.equal(bracket.phase, 'finished');
  assert.equal(bracket.winnerId, deck[0]);

  const triplets = draftTriplets(cards, pick);
  const byId = new Map(cards.map(card => [card.id, card]));
  for (const triple of triplets) {
    assert.equal(new Set(triple.cards).size, 3);
    assert.ok(triple.cards.every(id => byId.get(id)?.etiket === triple.etiket), `${datasetId}: üçlü etiketleri uyuşmuyor.`);
  }
  let team = createTeamDraft(triplets);
  for (let round = 0; round < 11; round++) {
    for (const seat of ['p1', 'p2']) {
      for (const [index, role] of ['start', 'bench', 'cut'].entries()) {
        team = assignTeamCard(team, seat, role, triplets[round].cards[index]);
      }
    }
  }
  assert.equal(team.phase, 'finished');
  assert.equal(team.assignmentCount, 66);
  for (const seat of ['p1', 'p2']) assert.equal(Object.keys(team.players[seat].selections).length, 11);

  let frequency = createCooperative('frequency', deck);
  for (let round = 0; round < 10; round++) {
    const cardId = frequency.deck[round * 2];
    frequency = revealFrequency(frequency, { p1: cardId, p2: cardId });
    if (round < 9) frequency = advanceFrequency(frequency);
  }
  assert.equal(frequency.phase, 'finished', `${datasetId}: Frekans 10 turda bitmeli.`);
  assert.equal(frequency.score, 1500, `${datasetId}: tam uyum iki seri bonusu kazanmalı.`);
  assert.equal(Object.keys(frequency.results).length, 10);

  let double = createCooperative('double-ranking', deck);
  const rankings = {};
  for (const seat of ['p1', 'p2']) {
    let record = createPrivateRank();
    for (let step = 1; step <= 8; step++) record = placePrivateRank(double.deck, record, seat === 'p1' ? step : 9 - step);
    assert.equal(record.count, 8);
    rankings[seat] = record.slots;
  }
  double = revealDoubleRanking(double, rankings);
  assert.equal(double.phase, 'finished', `${datasetId}: Çifte Sıralama iki tam listeyle bitmeli.`);
  assert.equal(double.result.compatibility, 0);
  assert.equal(double.result.distance, 32);
  assert.equal(double.result.differences.length, 8);
}

function checkOnlineConfig() {
  const required = ['apiKey', 'authDomain', 'databaseURL', 'projectId', 'appId'];
  const missing = required.filter(key => typeof firebaseConfig[key] !== 'string' || !firebaseConfig[key].trim());
  if (missing.length) throw new Error(`Çevrim içi oyun için firebase-config.js alanlarını doldurun: ${missing.join(', ')}.`);
  assert.equal(emulatorConfig.enabled, false, 'GitHub Pages için emulatorConfig.enabled false olmalı.');
  const url = new URL(firebaseConfig.databaseURL);
  assert.equal(url.protocol, 'https:', 'Çevrim içi Realtime Database adresi HTTPS olmalı.');
  assert.ok(!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname), 'Çevrim içi yapılandırma yerel emülatöre işaret edemez.');
}

export async function preflight({ online = false, quiet = false } = {}) {
  const files = [...RUNTIME_FILES];
  for (const name of RUNTIME_FILES) {
    const info = await lstat(path.join(PROJECT_ROOT, name));
    assert.ok(info.isFile() && !info.isSymbolicLink(), `Çalışma dosyası bulunamadı: ${name}`);
  }
  for (const name of RUNTIME_DIRECTORIES) {
    const directory = path.join(PROJECT_ROOT, name);
    const info = await lstat(directory);
    assert.ok(info.isDirectory() && !info.isSymbolicLink(), `Çalışma klasörü bulunamadı: ${name}`);
    files.push(...await listFiles(directory, name));
  }
  files.sort();
  const allowed = new Set(files);
  const directories = new Set(['']);
  for (const file of files) {
    let directory = path.posix.dirname(file);
    while (directory !== '.') {
      directories.add(directory);
      const parent = path.posix.dirname(directory);
      if (parent === directory) break;
      directory = parent;
    }
  }
  const contents = new Map();
  const read = async file => {
    if (!contents.has(file)) contents.set(file, await readFile(path.join(PROJECT_ROOT, file), 'utf8'));
    return contents.get(file);
  };
  const datasets = JSON.parse(await read('veri.json'));
  normalizeTexts(JSON.parse(await read('metinler.json')));
  for (const [key, field] of Object.entries(TEXT_CATALOG)) {
    assert.ok(field.group && field.label && typeof field.value === 'string' && field.value.trim(), `Metin kataloğu alanı geçersiz: ${key}`);
  }
  assert.deepEqual(Object.keys(datasets).sort(), Object.keys(DATASET_NAMES).sort(), 'Koleksiyonlar lobi seçenekleriyle uyuşmuyor.');
  const images = new Set();
  let cardCount = 0;
  for (const [datasetId, cards] of Object.entries(datasets)) {
    assert.ok(Array.isArray(cards) && cards.length >= 20 && cards.length <= 200, `${datasetId}: altı mod için 20–200 kart gerekir.`);
    assert.equal(new Set(cards.map(card => card.id)).size, cards.length, `${datasetId}: kart kimlikleri tekrarlanıyor.`);
    for (const card of cards) {
      assert.ok(Number.isSafeInteger(card.id) && card.id >= 1 && card.id <= 1000000, `${datasetId}: geçersiz kart kimliği.`);
      for (const key of ['isim', 'etiket']) assert.ok(typeof card[key] === 'string' && card[key].trim(), `${datasetId}/${card.id}: ${key} boş.`);
      assert.ok(typeof card.gorsel === 'string' && /^assets\/images\/[a-zA-Z0-9_./-]+$/.test(card.gorsel) && !card.gorsel.includes('..'), `${datasetId}/${card.id}: yerel görsel yolu gerekli.`);
      assert.ok(allowed.has(card.gorsel), `${datasetId}/${card.id}: görsel eksik veya harf büyüklüğü yanlış: ${card.gorsel}`);
      images.add(card.gorsel);
    }
    cardCount += cards.length;
    finishAllModes(cards, datasetId);
  }

  let referenceCount = 0;
  const checkReference = async (source, raw, documentRelative = false) => {
    const reference = raw.trim();
    if (!reference || /^(https?:|data:|mailto:|tel:)/i.test(reference)) return;
    assert.ok(!reference.startsWith('/') && !reference.includes('\\'), `${source}: GitHub Pages için göreli yol gerekli: ${reference}`);
    const [withoutQuery, fragment] = reference.split('#', 2);
    const filename = withoutQuery.split('?', 1)[0];
    if (!filename) {
      if (fragment) assert.ok(new RegExp(`\\bid\\s*=\\s*["']${fragment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`).test(await read(source)), `${source}: bulunamayan simge #${fragment}`);
      return;
    }
    const base = documentRelative ? '' : path.posix.dirname(source);
    const target = path.posix.normalize(path.posix.join(base, filename)).replace(/\/$/, '');
    assert.ok(target !== '..' && !target.startsWith('../'), `${source}: proje dışına çıkan yol: ${reference}`);
    if (filename.includes('${')) {
      // Dynamic icons use a fixed relative prefix. Validate concrete icons below.
      const prefix = target.slice(0, target.indexOf('${'));
      assert.ok([...allowed].some(file => file.startsWith(prefix)), `${source}: dinamik yolun klasörü bulunamadı: ${reference}`);
      return;
    }
    assert.ok(target === '.' || allowed.has(target) || directories.has(target), `${source}: başvuru eksik veya harf büyüklüğü yanlış: ${reference}`);
    if (fragment && allowed.has(target) && /\.(?:svg|html)$/.test(target)) {
      const ids = new Set([...String(await read(target)).matchAll(/\bid\s*=\s*["']([^"']+)["']/g)].map(match => match[1]));
      assert.ok(ids.has(fragment), `${source}: simge bulunamadı: ${reference}`);
    }
    referenceCount++;
  };
  for (const source of files.filter(file => /\.(?:html|css|js)$/.test(file))) {
    const text = await read(source);
    const references = [];
    if (source.endsWith('.html')) {
      references.push(...[...text.matchAll(/\b(?:href|src)\s*=\s*(["'])(.*?)\1/g)].map(match => match[2]));
    } else if (source.endsWith('.css')) {
      references.push(...[...text.matchAll(/url\(\s*(["']?)([^)'"\s]+)\1\s*\)/g)].map(match => match[2]));
    } else {
      const imports = new Set([...text.matchAll(/\b(?:from\s+|import(?:\s*\(\s*|\s+))(["'])([^"']+)\1/g)].map(match => match[2]));
      for (const reference of imports) await checkReference(source, reference);
      references.push(...[...text.matchAll(/\bfetch\(\s*(["'])([^"']+)\1/g)].map(match => match[2]));
      references.push(...[...text.matchAll(/(["'`])((?:\.\/|\.\.\/|assets\/|\/)[^"'`\r\n]*)\1/g)].map(match => match[2]));
      // DOM src/href assignments and fetch resolve against index.html; module
      // imports resolve against their module file, so check them separately.
      for (const reference of new Set(references)) {
        if (!imports.has(reference)) await checkReference(source, reference, true);
      }
      continue;
    }
    for (const reference of new Set(references)) await checkReference(source, reference);
  }
  for (const group of Object.values(DATASET_GROUPS)) assert.ok(allowed.has(`assets/images/${group.icon}-icon.svg`), `Kategori simgesi eksik: ${group.icon}`);
  for (const name of ['laugh', 'angry', 'womp', 'heart']) await checkReference('index.html', `./assets/images/reactions.svg#${name}`);
  const rules = JSON.parse(await readFile(path.join(PROJECT_ROOT, 'firebase.rules.json'), 'utf8')).rules.rooms.$code;
  for (const datasetId of Object.keys(datasets)) assert.ok(rules.datasetId['.validate'].includes(`'${datasetId}'`), `Firebase koleksiyon izni eksik: ${datasetId}`);
  for (const mode of ['auction', 'blind-ranking', 'bracket', 'team-draft', 'frequency', 'double-ranking']) assert.ok(rules.mode['.validate'].includes(`'${mode}'`), `Firebase mod izni eksik: ${mode}`);
  if (online) checkOnlineConfig();
  const result = { files, datasets, cardCount, imageCount: images.size, referenceCount };
  if (!quiet) console.log(`Hazırlık kontrolü geçti: ${Object.keys(datasets).length} koleksiyon, ${cardCount} kart, ${images.size} yerel kart görseli, 6 mod, ${referenceCount} göreli başvuru${online ? ', Firebase web ayarları dolu' : ''}.`);
  return result;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    assert.ok(process.argv.slice(2).every(argument => argument === '--online'), 'Kullanım: node tools/preflight.mjs [--online]');
    await preflight({ online: process.argv.includes('--online') });
  } catch (error) {
    console.error(`Hazırlık kontrolü başarısız: ${error.message}`);
    process.exitCode = 1;
  }
}
