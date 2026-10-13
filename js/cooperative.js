const SEATS = ['p1', 'p2'];
export const FREQUENCY_ROUNDS = 10;
export const DOUBLE_RANKING_SLOTS = 8;

export class CooperativeError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'CooperativeError';
    this.code = code;
  }
}

function reject(code, message) { throw new CooperativeError(code, message); }
function isRecord(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function assertMode(mode) {
  if (!isCooperativeMode(mode)) reject('INVALID_MODE', 'Geçerli bir birlikte oynama modu seç.');
}
function validateDeck(deck, minimum, maximum = minimum) {
  if (!Array.isArray(deck) || deck.length < minimum || deck.length > maximum ||
      Array.from(deck).some(id => !Number.isSafeInteger(id) || id < 1) || new Set(deck).size !== deck.length) {
    reject('INVALID_DECK', 'Kart destesi benzersiz pozitif tam sayı kimliklerinden oluşmalıdır.');
  }
}

export function isCooperativeMode(mode) {
  return mode === 'frequency' || mode === 'double-ranking';
}

/** Shuffle once in the caller. Transaction retries never generate randomness. */
export function createCooperative(mode, deckIds) {
  assertMode(mode);
  const size = mode === 'frequency' ? FREQUENCY_ROUNDS * 2 : DOUBLE_RANKING_SLOTS;
  validateDeck(deckIds, size, Number.MAX_SAFE_INTEGER);
  const deck = deckIds.slice(0, size);
  if (mode === 'frequency') {
    return { phase: 'playing', stage: 'choosing', deck, roundIndex: 0,
      score: 0, matches: 0, streak: 0, bestStreak: 0, results: {} };
  }
  return { phase: 'playing', deck, rankings: {}, result: null };
}

function roundResult(deck, index, choices, previousStreak) {
  if (!isRecord(choices) || Object.keys(choices).length !== 2 ||
      !SEATS.every(seat => Object.hasOwn(choices, seat) && deck.slice(index * 2, index * 2 + 2).includes(choices[seat]))) {
    reject('INVALID_CHOICE', 'İki oyuncu da ekrandaki eşleşmeden bir kart seçmelidir.');
  }
  const match = choices.p1 === choices.p2;
  const streak = match ? previousStreak + 1 : 0;
  const bonus = match && streak % 5 === 0 ? 250 : 0;
  return { p1: choices.p1, p2: choices.p2, match, points: match ? 100 : 0, bonus, streak };
}

function normalizeFrequency(game) {
  validateDeck(game.deck, FREQUENCY_ROUNDS * 2);
  if (!Number.isSafeInteger(game.roundIndex) || game.roundIndex < 0 || game.roundIndex >= FREQUENCY_ROUNDS ||
      !['choosing', 'reveal'].includes(game.stage) ||
      game.phase !== (game.roundIndex === FREQUENCY_ROUNDS - 1 && game.stage === 'reveal' ? 'finished' : 'playing')) {
    reject('INVALID_GAME', 'Frekans turu veya oyun evresi geçersiz.');
  }
  const completed = game.roundIndex + (game.stage === 'reveal' ? 1 : 0);
  const source = game.results ?? {};
  if (!isRecord(source) || Object.keys(source).length !== completed ||
      Object.keys(source).some(key => !/^r([1-9]|10)$/.test(key))) {
    reject('INVALID_GAME', 'Tamamlanan Frekans turları geçersiz.');
  }
  const results = {};
  let score = 0;
  let matches = 0;
  let streak = 0;
  let bestStreak = 0;
  for (let index = 0; index < completed; index += 1) {
    const stored = source[`r${index + 1}`];
    if (!isRecord(stored)) reject('INVALID_GAME', 'Tamamlanan turun seçimleri bulunamadı.');
    const result = roundResult(game.deck, index, { p1: stored.p1, p2: stored.p2 }, streak);
    if (!Object.entries(result).every(([key, value]) => stored[key] === value)) {
      reject('INVALID_GAME', 'Tur puanı veya seri geçmişi seçimlerle uyuşmuyor.');
    }
    results[`r${index + 1}`] = result;
    score += result.points + result.bonus;
    matches += Number(result.match);
    streak = result.streak;
    bestStreak = Math.max(bestStreak, streak);
  }
  if (game.score !== score || game.matches !== matches || game.streak !== streak || game.bestStreak !== bestStreak) {
    reject('INVALID_GAME', 'Ortak puan veya seri bilgisi tamamlanan turlarla uyuşmuyor.');
  }
  return { phase: game.phase, stage: game.stage, deck: [...game.deck], roundIndex: game.roundIndex,
    score, matches, streak, bestStreak, results };
}

function normalizeRankRecord(deck, record) {
  if (!isRecord(record) || !Number.isSafeInteger(record.count) || record.count < 0 || record.count > DOUBLE_RANKING_SLOTS) {
    reject('INVALID_RANKING', 'Özel sıralama ilerlemesi geçersiz.');
  }
  const source = record.slots ?? {};
  if (!isRecord(source) || Object.keys(source).length !== record.count ||
      Object.entries(source).some(([key, id]) => !/^s[1-8]$/.test(key) || !Number.isSafeInteger(id) || id < 1)) {
    reject('INVALID_RANKING', 'Özel sıralama yuvaları geçersiz.');
  }
  const ids = Object.values(source);
  if (new Set(ids).size !== record.count || deck.slice(0, record.count).some(id => !ids.includes(id))) {
    reject('INVALID_RANKING', 'Sıralanan kartlar gösterilen kartların sırasıyla uyuşmuyor.');
  }
  return { count: record.count, slots: { ...source } };
}

function normalizeCompleteRanking(deck, slots) {
  return normalizeRankRecord(deck, { count: DOUBLE_RANKING_SLOTS, slots }).slots;
}

function rankingResult(deck, rankings) {
  const positions = Object.fromEntries(SEATS.map(seat => [seat,
    new Map(Object.entries(rankings[seat]).map(([slot, id]) => [id, Number(slot.slice(1))]))]));
  const differences = deck.map(id => ({ id, p1: positions.p1.get(id), p2: positions.p2.get(id),
    difference: Math.abs(positions.p1.get(id) - positions.p2.get(id)) }));
  const distance = differences.reduce((sum, item) => sum + item.difference, 0);
  const exactMatches = differences.filter(item => item.difference === 0).length;
  // The maximum footrule distance for eight cards is floor(8² / 2) = 32.
  const compatibility = Math.round(100 * (1 - distance / 32));
  // Stable ties preserve deck order so both clients show the same comparison.
  differences.sort((left, right) => right.difference - left.difference);
  return { compatibility, distance, differences, exactMatches };
}

function normalizeDoubleRanking(game) {
  validateDeck(game.deck, DOUBLE_RANKING_SLOTS);
  if (!['playing', 'finished'].includes(game.phase)) reject('INVALID_GAME', 'Çifte Sıralama evresi geçersiz.');
  const source = game.rankings ?? {};
  const storedResult = game.result ?? null;
  if (!isRecord(source)) reject('INVALID_RANKING', 'Oyuncu sıralamaları geçersiz.');
  if (game.phase === 'playing') {
    if (Object.keys(source).length || storedResult !== null) {
      reject('INVALID_GAME', 'İki oyuncu bitirmeden gizli sıralamalar açığa çıkarılamaz.');
    }
    return { phase: 'playing', deck: [...game.deck], rankings: {}, result: null };
  }
  if (Object.keys(source).length !== 2 || !SEATS.every(seat => Object.hasOwn(source, seat))) {
    reject('INVALID_RANKING', 'Sonuç için iki oyuncunun sıralaması da tamamlanmalıdır.');
  }
  const rankings = Object.fromEntries(SEATS.map(seat => [seat, normalizeCompleteRanking(game.deck, source[seat])]));
  const result = rankingResult(game.deck, rankings);
  if (!isRecord(storedResult) || storedResult.compatibility !== result.compatibility ||
      storedResult.distance !== result.distance || storedResult.exactMatches !== result.exactMatches ||
      !Array.isArray(storedResult.differences) || storedResult.differences.length !== DOUBLE_RANKING_SLOTS ||
      Array.from(storedResult.differences).some((item, index) => !isRecord(item) ||
        !Object.entries(result.differences[index]).every(([key, value]) => item[key] === value))) {
    reject('INVALID_GAME', 'Uyum sonucu oyuncuların sıralamalarıyla uyuşmuyor.');
  }
  return { phase: 'finished', deck: [...game.deck], rankings, result };
}

/** RTDB removes empty objects and nulls; restore those without accepting forged results. */
export function normalizeCooperative(mode, game) {
  assertMode(mode);
  if (!isRecord(game)) reject('INVALID_GAME', 'Birlikte oynama durumu bulunamadı.');
  return mode === 'frequency' ? normalizeFrequency(game) : normalizeDoubleRanking(game);
}

export function revealFrequency(game, choices) {
  const next = normalizeCooperative('frequency', game);
  if (next.phase === 'finished') reject('GAME_FINISHED', 'Frekans tamamlandı.');
  if (next.stage !== 'choosing') reject('ROUND_LOCKED', 'Bu turun seçimleri zaten açıldı.');
  const result = roundResult(next.deck, next.roundIndex, choices, next.streak);
  next.results[`r${next.roundIndex + 1}`] = result;
  next.score += result.points + result.bonus;
  next.matches += Number(result.match);
  next.streak = result.streak;
  next.bestStreak = Math.max(next.bestStreak, next.streak);
  next.stage = 'reveal';
  if (next.roundIndex === FREQUENCY_ROUNDS - 1) next.phase = 'finished';
  return next;
}

export function advanceFrequency(game) {
  const next = normalizeCooperative('frequency', game);
  if (next.phase === 'finished') reject('GAME_FINISHED', 'Frekans tamamlandı.');
  if (next.stage !== 'reveal') reject('ROUND_NOT_REVEALED', 'Önce iki oyuncunun seçimi de tamamlanmalı.');
  next.roundIndex += 1;
  next.stage = 'choosing';
  return next;
}

export function createPrivateRank() { return { count: 0, slots: {} }; }

/** Each placement locks the next unseen card into one empty private slot. */
export function placePrivateRank(deck, record, slot) {
  validateDeck(deck, DOUBLE_RANKING_SLOTS);
  const next = normalizeRankRecord(deck, record);
  if (next.count === DOUBLE_RANKING_SLOTS) reject('GAME_FINISHED', 'Sıralaman tamamlandı.');
  if (!Number.isInteger(slot) || slot < 1 || slot > DOUBLE_RANKING_SLOTS) {
    reject('INVALID_SLOT', '1 ile 8 arasında bir sıralama yuvası seç.');
  }
  const key = `s${slot}`;
  if (Object.hasOwn(next.slots, key)) reject('SLOT_OCCUPIED', 'Bu sıralama yuvası kilitli.');
  next.slots[key] = deck[next.count];
  next.count += 1;
  return next;
}

export function revealDoubleRanking(game, rankings) {
  const next = normalizeCooperative('double-ranking', game);
  if (next.phase === 'finished') reject('GAME_FINISHED', 'Çifte Sıralama tamamlandı.');
  if (!isRecord(rankings) || Object.keys(rankings).length !== 2 || !SEATS.every(seat => Object.hasOwn(rankings, seat))) {
    reject('INVALID_RANKING', 'Sonuç için iki oyuncunun sıralaması da tamamlanmalıdır.');
  }
  next.rankings = Object.fromEntries(SEATS.map(seat => [seat, normalizeCompleteRanking(next.deck, rankings[seat])]));
  next.result = rankingResult(next.deck, next.rankings);
  next.phase = 'finished';
  return next;
}
