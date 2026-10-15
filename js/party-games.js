import { TELEPATHY_ROUNDS, validTelepathyCriteria } from './telepathy-questions.js';
import { CONSOLATION_DATASET_IDS, consolationRange } from './consolation.js';

/**
 * Deterministic 2–4 player engines. Shuffle/setup belongs to the caller.
 * Public snapshots never contain current private submissions or hidden roles.
 * resolvePartyRound consumes already locked private records. Optional record
 * roundIndex/stage cursors reject stale submissions, and room revisions must
 * also be checked by the room transaction before committing these snapshots.
 */
export class PartyGameError extends Error {
  constructor(code, message) { super(message); this.name = 'PartyGameError'; this.code = code; }
}
const fail = (code, message) => { throw new PartyGameError(code, message); };
const SEATS = ['p1', 'p2', 'p3', 'p4'];
const RESERVE_MIN = consolationRange(CONSOLATION_DATASET_IDS[0]).min;
const RESERVE_MAX = consolationRange(CONSOLATION_DATASET_IDS[CONSOLATION_DATASET_IDS.length - 1]).max;
const MODES = {
  auction: { minPlayers: 2, maxPlayers: 4, cards: 1, rounds: null, private: false },
  'sealed-auction': { minPlayers: 2, maxPlayers: 4, cards: 1, rounds: null, private: true },
  'simultaneous-ranking': { minPlayers: 2, maxPlayers: 4, cards: 1, rounds: 10, private: true },
  telepathy: { minPlayers: 2, maxPlayers: 4, cards: 4, rounds: 10, private: true },
  detective: { minPlayers: 2, maxPlayers: 2, cards: 6, rounds: 6, private: true },
  chameleon: { minPlayers: 3, maxPlayers: 4, cards: 9, rounds: 5, private: true },
};
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const map = (seats, value) => Object.fromEntries(seats.map(seat => [seat, typeof value === 'function' ? value(seat) : value]));
const copy = value => structuredClone(value);
const validId = id => Number.isSafeInteger(id) && id > 0;
const integer = (value, minimum, maximum) => Number.isSafeInteger(value) && value >= minimum && value <= maximum;
const clockwise = (seats, seat, predicate = () => true) => {
  for (let step = 1; step <= seats.length; step += 1) {
    const next = seats[(seats.indexOf(seat) + step) % seats.length];
    if (predicate(next)) return next;
  }
  return null;
};

export function partyGameSpec(mode) {
  if (!Object.hasOwn(MODES, mode)) fail('INVALID_MODE', 'Bu masa oyunu desteklenmiyor.');
  return { mode, ...MODES[mode] };
}

function validateSetup(mode, options) {
  const spec = partyGameSpec(mode);
  if (!record(options) || !Array.isArray(options.seats) || !integer(options.seats.length, spec.minPlayers, spec.maxPlayers) ||
      Array.from(options.seats).some((seat, index) => seat !== SEATS[index])) fail('INVALID_SEATS', 'Oyuncu koltukları p1’den başlayarak sıralı olmalıdır.');
  const minimum = mode === 'auction' || mode === 'sealed-auction' ? options.seats.length * 5 : mode === 'simultaneous-ranking' ? 10 : spec.cards;
  if (!Array.isArray(options.deck) || options.deck.length < minimum || options.deck.length > 2000 ||
      Array.from(options.deck).some(id => !validId(id) || (id >= RESERVE_MIN && id <= RESERVE_MAX)) || new Set(options.deck).size !== options.deck.length) fail('INVALID_DECK', 'Yeterli sayıda benzersiz kart seçilmelidir.');
  const starterSeat = options.starterSeat ?? options.seats[0];
  if (!options.seats.includes(starterSeat)) fail('INVALID_SEAT', 'Başlayan oyuncu masada bulunmalıdır.');
  let maximum = options.deck.length;
  if (mode === 'auction' || mode === 'sealed-auction') maximum = options.seats.length === 2 ? 20 : 30;
  if (mode === 'simultaneous-ranking') maximum = 10;
  if (['telepathy', 'detective', 'chameleon'].includes(mode)) maximum = spec.cards * spec.rounds;
  const setup = { mode, seats: [...options.seats], deck: options.deck.slice(0, maximum), starterSeat };
  if (options.completionDeck !== undefined) {
    const reserve = options.completionDeck;
    if (mode !== 'auction' || !Array.isArray(reserve) || ![8, 10].includes(reserve.length) ||
        Array.from(reserve).some(id => !validId(id) || setup.deck.includes(id)) || new Set(reserve).size !== reserve.length) {
      fail('INVALID_COMPLETION_DECK', 'Bütçe tamamlaması için ana desteden ayrı sekiz benzersiz kart seçilmelidir.');
    }
    setup.completionDeck = [...reserve];
  }
  return setup;
}

function emptyGame(setup) {
  const game = { ...setup, phase: 'playing', stage: 'choosing', roundIndex: 0, results: {} };
  if (setup.mode === 'auction' || setup.mode === 'sealed-auction') {
    Object.assign(game, { budgets: map(game.seats, 20), rosters: map(game.seats, () => []), deckIndex: 0,
      currentCardId: game.deck[0], completionAwards: [], lastAward: null });
    if (setup.mode === 'auction') Object.assign(game, { stage: 'bidding', openerSeat: setup.starterSeat,
      highestBid: 0, bidderSeat: null, turnSeat: null, passed: map(game.seats, false), actions: [] });
  } else if (setup.mode === 'simultaneous-ranking') {
    Object.assign(game, { progress: map(game.seats, 0), rankings: {}, result: null });
  } else if (setup.mode === 'telepathy') {
    Object.assign(game, { scores: map(game.seats, 0), score: 0, pairScores: {}, pairStreaks: {}, streak: 0, bestStreak: 0 });
    for (const [left, right] of pairs(game.seats)) {
      game.pairScores[`${left}_${right}`] = 0;
      game.pairStreaks[`${left}_${right}`] = 0;
    }
    game.criteria = Array.isArray(setup.criteria) ? [...setup.criteria] : Array.from({ length: 10 }, (_, index) => index);
  } else if (setup.mode === 'detective') {
    Object.assign(game, { stage: 'clue', clueGiverSeat: setup.starterSeat,
      guesserSeat: clockwise(game.seats, setup.starterSeat), clue: '', scores: map(game.seats, 0) });
  } else {
    Object.assign(game, { stage: 'clues', turnSeat: setup.starterSeat, clues: {}, votes: {}, caughtSeat: null, scores: map(game.seats, 0) });
  }
  return game;
}

/** Auction pools use 20/30 cards; a smaller pool may use all available cards. */
export function createPartyGame(mode, options) {
  const setup = validateSetup(mode, options);
  if (mode === 'telepathy') {
    const criteria = options.criteria ?? Array.from({ length: TELEPATHY_ROUNDS }, (_, index) => index);
    if (!validTelepathyCriteria(criteria)) fail('INVALID_CRITERIA', 'Telepati için on farklı ve geçerli soru seçilmelidir.');
    setup.criteria = [...criteria];
  }
  const game = emptyGame(setup);
  if (mode === 'auction') openAuction(game, setup.starterSeat);
  return game;
}

/** Current visible cards; modulo traversal supports small collections safely. */
export function partyCards(game) {
  const spec = partyGameSpec(game?.mode);
  if (!Array.isArray(game.deck) || !integer(game.roundIndex, 0, 2000)) fail('INVALID_GAME', 'Kart ekranı geçersiz.');
  if (game.mode === 'auction' || game.mode === 'sealed-auction') return game.currentCardId == null ? [] : [game.currentCardId];
  if (game.mode === 'simultaneous-ranking') return game.phase === 'finished' ? [] : [game.deck[game.roundIndex]];
  return Array.from({ length: spec.cards }, (_, index) => game.deck[(game.roundIndex * spec.cards + index) % game.deck.length]);
}

export function partyRoundContext(game) {
  return { mode: game.mode, phase: game.phase, stage: game.stage, roundIndex: game.roundIndex,
    cards: partyCards(game), ...(game.mode === 'telepathy' ? { criterionIndex: game.criteria[game.roundIndex] } : {}) };
}

function pairs(seats) {
  const result = [];
  for (let left = 0; left < seats.length; left += 1) for (let right = left + 1; right < seats.length; right += 1) result.push([seats[left], seats[right]]);
  return result;
}

function canonicalEqual(actual, expected) {
  // RTDB drops nulls and empty collections. Only these omissions are accepted.
  if (actual === undefined || actual === null) return expected == null || expected === '' || (Array.isArray(expected) && expected.length === 0) || (record(expected) && Object.values(expected).every(child => canonicalEqual(undefined, child)));
  if (expected === null || typeof expected !== 'object') return actual === expected;
  if (Array.isArray(expected)) {
    // A one-item RTDB array remains an array, but sparse maps are not accepted.
    return Array.isArray(actual) && actual.length === expected.length && expected.every((item, index) => canonicalEqual(actual[index], item));
  }
  return record(actual) && Object.keys(actual).every(key => Object.hasOwn(expected, key)) && Object.entries(expected).every(([key, value]) => canonicalEqual(actual[key], value));
}

function requireCanonical(actual, expected) {
  if (!canonicalEqual(actual, expected)) fail('INVALID_GAME', 'Oyun durumu hamle geçmişiyle uyuşmuyor.');
  return expected;
}

function resultSource(game) {
  const source = game.results ?? {};
  if (!record(source) || Object.keys(source).some(key => !/^r[1-9][0-9]*$/.test(key))) fail('INVALID_GAME', 'Tur geçmişi geçersiz.');
  return source;
}

function exactRecords(game, records, seats = game.seats) {
  if (!record(records) || Object.keys(records).length !== seats.length || !seats.every(seat => Object.hasOwn(records, seat) && record(records[seat]))) fail('MISSING_SUBMISSIONS', 'Gerekli oyuncuların seçimleri tamamlanmalıdır.');
  for (const seat of seats) {
    const value = records[seat];
    if (value.roundIndex != null && value.roundIndex !== game.roundIndex) fail('STALE_SUBMISSION', 'Bu seçim eski bir tura ait.');
    if (value.stage != null && value.stage !== game.stage) fail('STALE_SUBMISSION', 'Bu seçim eski bir oyun evresine ait.');
  }
}

function canBuy(game, seat) { return game.budgets[seat] > 0 && game.rosters[seat].length < 5; }
function hasSpace(game, seat) { return game.rosters[seat].length < 5; }

function finishAuction(game) {
  game.phase = 'finished'; game.stage = 'finished'; game.currentCardId = null;
  if (game.mode === 'auction') { game.turnSeat = null; game.bidderSeat = null; game.highestBid = 0; }
}

function completeRosters(game) {
  if (game.mode === 'auction' && game.completionDeck) {
    // A four-player table can need sixteen gifts from an eight-card reserve.
    // Persisted ten-card reserves retain the same order and cycle length.
    // Cycle across seats while keeping each player's own gifts distinct.
    let reserveIndex = 0;
    for (const seat of game.seats) while (game.budgets[seat] === 0 && hasSpace(game, seat)) {
      const id = game.completionDeck[reserveIndex++ % game.completionDeck.length];
      game.rosters[seat].push({ id, price: 0, source: 'completion' });
      game.completionAwards.push({ id, seat, price: 0 });
    }
    finishAuction(game);
    return;
  }
  // Consume only the unseen shuffled tail. Burnt sealed-bid cards stay burnt.
  const owned = new Set(game.seats.flatMap(seat => game.rosters[seat].map(entry => entry.id)));
  const reserve = game.deck.slice(game.deckIndex).filter(id => !owned.has(id));
  for (const seat of game.seats) while (hasSpace(game, seat) && reserve.length) {
    const id = reserve.shift();
    game.rosters[seat].push({ id, price: 0, source: 'completion' });
    game.completionAwards.push({ id, seat, price: 0 });
  }
  finishAuction(game);
}

function award(game, seat, price) {
  const id = game.currentCardId;
  game.budgets[seat] -= price;
  game.rosters[seat].push({ id, price });
  game.lastAward = { id, seat, price, sequence: game.deckIndex + 1 };
}

function openAuction(game, preferredSeat) {
  const buyers = game.seats.filter(seat => canBuy(game, seat));
  if (!buyers.length || game.deckIndex >= game.deck.length) { completeRosters(game); return; }
  const opener = buyers.includes(preferredSeat) ? preferredSeat : clockwise(game.seats, preferredSeat, seat => canBuy(game, seat));
  game.openerSeat = opener;
  game.phase = 'playing'; game.stage = 'bidding'; game.currentCardId = game.deck[game.deckIndex];
  game.highestBid = 1; game.bidderSeat = opener; game.passed = map(game.seats, false);
  // Every other seat explicitly responds, including full/zero-budget seats.
  // An automatic opening bid must never silently purchase a new card.
  game.turnSeat = clockwise(game.seats, opener);
}

function auctionMove(game, seat, command, payload) {
  if (game.phase !== 'playing' || game.stage !== 'bidding') fail('GAME_FINISHED', 'Açık artırma tamamlandı.');
  if (seat !== game.turnSeat) fail('NOT_YOUR_TURN', 'Hamle sırası başka bir oyuncuda.');
  if (game.passed[seat]) fail('ALREADY_PASSED', 'Bu kart için ihaleden çekildin.');
  if (command === 'bid') {
    if (!canBuy(game, seat)) fail('CANNOT_BUY', 'Bütçen veya kadro kontenjanın doldu.');
    if (!integer(payload.amount, game.highestBid + 1, game.budgets[seat])) fail('INVALID_BID', 'Teklif mevcut fiyatı geçmeli ve bütçeni aşmamalıdır.');
    game.highestBid = payload.amount; game.bidderSeat = seat;
    game.turnSeat = clockwise(game.seats, seat, candidate => !game.passed[candidate]);
  } else if (command === 'pass') {
    game.passed[seat] = true;
    const rivals = game.seats.filter(candidate => candidate !== game.bidderSeat && !game.passed[candidate]);
    if (!rivals.length) {
      const result = { id: game.currentCardId, seat: game.bidderSeat, price: game.highestBid };
      game.results[`r${game.deckIndex + 1}`] = result;
      award(game, result.seat, result.price);
      const preferred = clockwise(game.seats, game.openerSeat);
      game.deckIndex += 1; game.roundIndex = game.deckIndex;
      openAuction(game, preferred);
    } else game.turnSeat = clockwise(game.seats, seat, candidate => candidate !== game.bidderSeat && !game.passed[candidate]);
  } else fail('INVALID_COMMAND', 'Geçerli bir açık artırma hamlesi seç.');
}

function normalizeAuction(game) {
  const setup = validateSetup('auction', game);
  const expected = emptyGame(setup);
  openAuction(expected, setup.starterSeat);
  const actions = game.actions ?? [];
  if (!Array.isArray(actions) || actions.length > 1000) fail('INVALID_GAME', 'Açık artırma hamle geçmişi geçersiz.');
  for (const action of actions) {
    if (!record(action) || !setup.seats.includes(action.seat) || !['bid', 'pass'].includes(action.command) ||
        Object.keys(action).some(key => !['seat', 'command', 'amount'].includes(key)) ||
        (action.command === 'pass' && action.amount != null)) fail('INVALID_GAME', 'Açık artırma hamlesi geçersiz.');
    auctionMove(expected, action.seat, action.command, action);
    expected.actions.push(copy(action));
  }
  return requireCanonical(game, expected);
}

function sealedResult(game, records) {
  exactRecords(game, records);
  const bids = map(game.seats, seat => {
    const amount = records[seat].amount;
    if (!integer(amount, 0, game.budgets[seat]) || (!hasSpace(game, seat) && amount !== 0)) fail('INVALID_BID', 'Gizli teklif bütçeyi aşamaz; dolu kadro yalnızca 0 teklif verebilir.');
    return amount;
  });
  // Full rosters participate in the reveal but cannot win another card.
  const candidates = game.seats.filter(seat => hasSpace(game, seat));
  const highestBid = Math.max(...candidates.map(seat => bids[seat]));
  const leaders = candidates.filter(seat => bids[seat] === highestBid);
  const winnerSeat = leaders.length === 1 ? leaders[0] : null;
  return { id: game.currentCardId, bids, highestBid, winnerSeat, burned: !winnerSeat };
}

function applySealedResult(game, result) {
  const checked = sealedResult(game, map(game.seats, seat => ({ amount: result.bids?.[seat] })));
  if (!canonicalEqual(result, checked)) fail('INVALID_GAME', 'Zarf sonucu tekliflerle uyuşmuyor.');
  game.results[`r${game.deckIndex + 1}`] = checked;
  if (checked.winnerSeat) award(game, checked.winnerSeat, checked.highestBid);
  game.stage = 'reveal';
  // Complete from unused cards when paid bidding ends, if any reserve remains.
  if (game.deckIndex === game.deck.length - 1 || !game.seats.some(seat => hasSpace(game, seat)) || !game.seats.some(seat => canBuy(game, seat))) {
    game.deckIndex += 1; game.roundIndex = game.deckIndex;
    completeRosters(game);
  }
}

function advanceSealed(game) {
  game.deckIndex += 1; game.roundIndex = game.deckIndex;
  if (game.deckIndex >= game.deck.length) { completeRosters(game); return; }
  game.currentCardId = game.deck[game.deckIndex]; game.stage = 'choosing';
}

function normalizeSealed(game) {
  const expected = emptyGame(validateSetup('sealed-auction', game));
  const results = resultSource(game);
  const keys = Object.keys(results);
  for (let index = 0; index < keys.length; index += 1) {
    if (expected.phase === 'finished') fail('INVALID_GAME', 'Oyun bittikten sonra zarf açılamaz.');
    if (index > 0) advanceSealed(expected);
    if (!results[`r${index + 1}`]) fail('INVALID_GAME', 'Zarf geçmişi atlanamaz.');
    applySealedResult(expected, results[`r${index + 1}`]);
  }
  if (expected.phase === 'playing' && game.stage === 'choosing' && keys.length) advanceSealed(expected);
  return requireCanonical(game, expected);
}

function rankingSlots(deck, slots, count) {
  const source = slots ?? {};
  if (!record(source) || Object.keys(source).length !== count || Object.entries(source).some(([key, id]) => !/^s([1-9]|10)$/.test(key) || !validId(id))) fail('INVALID_RANKING', 'Sıralama yuvaları geçersiz.');
  const ids = Object.values(source);
  if (new Set(ids).size !== count || deck.slice(0, count).some(id => !ids.includes(id))) fail('INVALID_RANKING', 'Sıralanan kartlar gösterilen desteyle uyuşmuyor.');
  return { ...source };
}

/** Complete rankings are s1..s10 maps. Maximum footrule distance is 50. */
export function rankingMatrix(deck, rankings, seats = Object.keys(rankings ?? {})) {
  if (!Array.isArray(deck) || deck.length !== 10 || new Set(deck).size !== 10 || Array.from(deck).some(id => !validId(id)) ||
      !Array.isArray(seats) || seats.length < 2 || seats.length > 4 || new Set(seats).size !== seats.length || seats.some(seat => !SEATS.includes(seat)) ||
      !record(rankings) || Object.keys(rankings).length !== seats.length || seats.some(seat => !Object.hasOwn(rankings, seat))) fail('INVALID_RANKING', 'Uyum matrisi için tam sıralamalar gerekir.');
  const positions = map(seats, seat => new Map(Object.entries(rankingSlots(deck, rankings[seat], 10)).map(([slot, id]) => [id, Number(slot.slice(1))])));
  const matrix = map(seats, () => ({}));
  for (const seat of seats) matrix[seat][seat] = 100;
  const comparisons = pairs(seats).map(([left, right]) => {
    const differences = deck.map(id => ({ id, leftPosition: positions[left].get(id), rightPosition: positions[right].get(id),
      difference: Math.abs(positions[left].get(id) - positions[right].get(id)) }));
    const distance = differences.reduce((sum, item) => sum + item.difference, 0);
    const compatibility = Math.round(100 * (1 - distance / 50));
    matrix[left][right] = compatibility; matrix[right][left] = compatibility;
    differences.sort((a, b) => b.difference - a.difference);
    return { left, right, distance, compatibility, exactMatches: differences.filter(item => item.difference === 0).length, differences };
  });
  return { matrix, comparisons, mostCompatible: comparisons.reduce((best, item) => item.compatibility > best.compatibility ? item : best),
    mostDifferent: comparisons.reduce((best, item) => item.compatibility < best.compatibility ? item : best) };
}

function normalizeRanking(game) {
  const expected = emptyGame(validateSetup('simultaneous-ranking', game));
  if (!integer(game.roundIndex, 0, 9) || !['playing', 'finished'].includes(game.phase)) fail('INVALID_GAME', 'Ortak sıralama evresi geçersiz.');
  expected.roundIndex = game.roundIndex;
  expected.progress = map(expected.seats, game.phase === 'finished' ? 10 : game.roundIndex);
  if (game.phase === 'finished') {
    if (game.roundIndex !== 9 || !record(game.rankings) || Object.keys(game.rankings).length !== expected.seats.length) fail('INVALID_GAME', 'Tüm sıralamalar tamamlanmalıdır.');
    expected.phase = 'finished'; expected.stage = 'finished';
    expected.rankings = map(expected.seats, seat => rankingSlots(expected.deck, game.rankings[seat], 10));
    expected.result = rankingMatrix(expected.deck, expected.rankings, expected.seats);
  }
  return requireCanonical(game, expected);
}

function telepathyResult(game, records) {
  exactRecords(game, records);
  const cards = partyCards(game);
  const choices = map(game.seats, seat => {
    if (!cards.includes(records[seat].cardId)) fail('INVALID_CHOICE', 'Ekrandaki dört karttan birini seç.');
    return records[seat].cardId;
  });
  const pairResults = {};
  const scores = map(game.seats, 0);
  let points = 0;
  for (const [left, right] of pairs(game.seats)) {
    const key = `${left}_${right}`;
    const match = choices[left] === choices[right];
    const streak = match ? game.pairStreaks[key] + 1 : 0;
    const bonus = match && streak % 5 === 0 ? 250 : 0;
    const earned = match ? 100 + bonus : 0;
    pairResults[key] = { match, streak, points: earned, bonus };
    scores[left] += earned; scores[right] += earned; points += earned;
  }
  const allMatch = new Set(Object.values(choices)).size === 1;
  return { choices, pairResults, scores, points, allMatch, streak: allMatch ? game.streak + 1 : 0 };
}

function applyTelepathyResult(game, result) {
  const checked = telepathyResult(game, map(game.seats, seat => ({ cardId: result.choices?.[seat] })));
  if (!canonicalEqual(result, checked)) fail('INVALID_GAME', 'Telepati puanları seçimlerle uyuşmuyor.');
  game.results[`r${game.roundIndex + 1}`] = checked;
  for (const seat of game.seats) game.scores[seat] += checked.scores[seat];
  for (const [key, value] of Object.entries(checked.pairResults)) { game.pairScores[key] += value.points; game.pairStreaks[key] = value.streak; }
  game.score += checked.points; game.streak = checked.streak; game.bestStreak = Math.max(game.bestStreak, checked.streak);
  game.stage = 'reveal';
  if (game.roundIndex === 9) game.phase = 'finished';
}

function normalizeTelepathy(game) {
  // Older rooms drew with replacement from indices 0–9. They can finish with
  // their original questions; only creation requires a fresh unique sequence.
  if (!validTelepathyCriteria(game.criteria, { allowLegacyRepeated: true })) fail('INVALID_CRITERIA', 'Telepati soruları geçersiz.');
  const expected = emptyGame({ ...validateSetup('telepathy', game), criteria: [...game.criteria] });
  const results = resultSource(game);
  for (let index = 0; index < Object.keys(results).length; index += 1) {
    if (index >= 10 || !results[`r${index + 1}`]) fail('INVALID_GAME', 'Telepati tur geçmişi geçersiz.');
    if (index > 0) { expected.roundIndex += 1; expected.stage = 'choosing'; }
    applyTelepathyResult(expected, results[`r${index + 1}`]);
  }
  if (expected.phase === 'playing' && expected.stage === 'reveal' && game.stage === 'choosing') { expected.roundIndex += 1; expected.stage = 'choosing'; }
  return requireCanonical(game, expected);
}

/** One whitespace-free Unicode word, 1..24 code points. */
export function partyClue(word) {
  if (typeof word !== 'string') fail('INVALID_CLUE', 'Tek kelimelik bir ipucu yaz.');
  const value = word.normalize('NFC').trim();
  if (!value || value.length > 24 || /[^\u0000-\uffff]/u.test(value) || /\s|[\u0000-\u001f\u007f-\u009f\u1100-\u11ff\u200b-\u200f\u202a-\u202e\u2060-\u206f\ua960-\ua97f\ud7b0-\ud7ff]/u.test(value) || !/^[\p{L}\p{N}][\p{L}\p{N}'’-]*$/u.test(value)) fail('INVALID_CLUE', 'İpucu en fazla 24 karakterlik tek kelime olmalıdır.');
  return value;
}

function target(game, secrets) {
  if (!record(secrets) || !partyCards(game).includes(secrets.targetId)) fail('INVALID_SECRET', 'Gizli hedef bu turun kartları arasında bulunmalıdır.');
  return secrets.targetId;
}

function detectiveResult(game, guess, targetId) {
  if (!partyCards(game).includes(guess) || !partyCards(game).includes(targetId)) fail('INVALID_CHOICE', 'Bu turun altı kartından birini seç.');
  const correct = guess === targetId;
  return { clueGiverSeat: game.clueGiverSeat, guesserSeat: game.guesserSeat, clue: partyClue(game.clue), targetId, guessId: guess, correct, points: correct ? 100 : 0 };
}

function applyDetectiveResult(game, result) {
  const checked = detectiveResult(game, result.guessId, result.targetId);
  if (!canonicalEqual(result, checked)) fail('INVALID_GAME', 'Dedektif sonucu hedef ve ipucuyla uyuşmuyor.');
  game.results[`r${game.roundIndex + 1}`] = checked;
  if (checked.correct) for (const seat of game.seats) game.scores[seat] += 100;
  game.stage = 'reveal';
  if (game.roundIndex === 5) game.phase = 'finished';
}

function advanceDetective(game) {
  game.roundIndex += 1; game.stage = 'clue'; game.clue = '';
  game.clueGiverSeat = clockwise(game.seats, game.clueGiverSeat); game.guesserSeat = clockwise(game.seats, game.clueGiverSeat);
}

function normalizeDetective(game) {
  const expected = emptyGame(validateSetup('detective', game));
  const results = resultSource(game);
  for (let index = 0; index < Object.keys(results).length; index += 1) {
    if (index >= 6 || !results[`r${index + 1}`]) fail('INVALID_GAME', 'Dedektif tur geçmişi geçersiz.');
    if (index > 0) advanceDetective(expected);
    expected.clue = partyClue(results[`r${index + 1}`].clue); expected.stage = 'guess';
    applyDetectiveResult(expected, results[`r${index + 1}`]);
  }
  if (expected.phase === 'playing' && expected.stage === 'reveal' && game.stage !== 'reveal') advanceDetective(expected);
  if (expected.stage === 'clue' && game.stage === 'guess') { expected.clue = partyClue(game.clue); expected.stage = 'guess'; }
  return requireCanonical(game, expected);
}

function checkedVotes(game, votes) {
  if (!record(votes) || Object.keys(votes).length !== game.seats.length || game.seats.some(seat => !Object.hasOwn(votes, seat))) fail('MISSING_SUBMISSIONS', 'Herkes gizli oyunu kilitlemelidir.');
  const result = map(game.seats, seat => {
    if (!game.seats.includes(votes[seat]) || votes[seat] === seat) fail('INVALID_VOTE', 'Kendin dışında bir oyuncuya oy ver.');
    return votes[seat];
  });
  const counts = map(game.seats, seat => Object.values(result).filter(vote => vote === seat).length);
  const maximum = Math.max(...Object.values(counts));
  const leaders = game.seats.filter(seat => counts[seat] === maximum);
  return { votes: result, counts, suspectSeat: leaders.length === 1 ? leaders[0] : null };
}

function chameleonResult(game, votes, secrets, guessId = null) {
  const targetId = target(game, secrets);
  if (!game.seats.includes(secrets.moleSeat)) fail('INVALID_SECRET', 'Bukalemun masadaki bir oyuncu olmalıdır.');
  const checked = checkedVotes(game, votes);
  const caught = checked.suspectSeat === secrets.moleSeat;
  if (caught && !partyCards(game).includes(guessId)) fail('INVALID_CHOICE', 'Yakalanan Bukalemun son tahminini yapmalıdır.');
  if (!caught && guessId != null) fail('INVALID_CHOICE', 'Yakalanmayan Bukalemun tahmin yapamaz.');
  const guessed = caught && guessId === targetId;
  const points = map(game.seats, seat => seat === secrets.moleSeat ? (!caught ? 200 : guessed ? 100 : 0) : caught && !guessed ? 100 : 0);
  return { clues: { ...game.clues }, ...checked, moleSeat: secrets.moleSeat, targetId, caught, guessId, guessed, points };
}

function applyChameleonResult(game, result) {
  const checked = chameleonResult(game, result.votes, { targetId: result.targetId, moleSeat: result.moleSeat }, result.guessId ?? null);
  if (!canonicalEqual(result, checked)) fail('INVALID_GAME', 'Bukalemun sonucu oylarla uyuşmuyor.');
  game.results[`r${game.roundIndex + 1}`] = checked;
  for (const seat of game.seats) game.scores[seat] += checked.points[seat];
  game.votes = checked.votes; game.caughtSeat = checked.caught ? checked.moleSeat : null;
  game.turnSeat = null; game.stage = 'reveal';
  if (game.roundIndex === 4) game.phase = 'finished';
}

function advanceChameleon(game) {
  game.roundIndex += 1; game.stage = 'clues'; game.clues = {}; game.votes = {}; game.caughtSeat = null;
  game.turnSeat = game.seats[(game.seats.indexOf(game.starterSeat) + game.roundIndex) % game.seats.length];
}

function applyClues(game, clues) {
  if (!record(clues) || Object.keys(clues).length > game.seats.length) fail('INVALID_GAME', 'İpucu sırası geçersiz.');
  const opener = game.seats[(game.seats.indexOf(game.starterSeat) + game.roundIndex) % game.seats.length];
  for (let index = 0; index < Object.keys(clues).length; index += 1) {
    const seat = game.seats[(game.seats.indexOf(opener) + index) % game.seats.length];
    if (!Object.hasOwn(clues, seat)) fail('INVALID_GAME', 'İpucu veren oyuncu atlanamaz.');
    game.clues[seat] = partyClue(clues[seat]);
    game.turnSeat = clockwise(game.seats, seat);
  }
  if (Object.keys(game.clues).length === game.seats.length) { game.stage = 'voting'; game.turnSeat = null; }
}

function normalizeChameleon(game) {
  const expected = emptyGame(validateSetup('chameleon', game));
  const results = resultSource(game);
  for (let index = 0; index < Object.keys(results).length; index += 1) {
    if (index >= 5 || !results[`r${index + 1}`]) fail('INVALID_GAME', 'Bukalemun tur geçmişi geçersiz.');
    if (index > 0) advanceChameleon(expected);
    applyClues(expected, results[`r${index + 1}`].clues);
    if (expected.stage !== 'voting') fail('INVALID_GAME', 'Sonuçtan önce herkes ipucu vermelidir.');
    applyChameleonResult(expected, results[`r${index + 1}`]);
  }
  if (expected.phase === 'playing' && expected.stage === 'reveal' && game.stage !== 'reveal') advanceChameleon(expected);
  if (expected.stage === 'clues') applyClues(expected, game.clues ?? {});
  if (expected.stage === 'voting' && game.stage === 'last-guess') {
    const checked = checkedVotes(expected, game.votes);
    if (checked.suspectSeat !== game.caughtSeat || !expected.seats.includes(game.caughtSeat)) fail('INVALID_GAME', 'Son tahmin yalnız yakalanan oyuncuya aittir.');
    expected.votes = checked.votes; expected.caughtSeat = checked.suspectSeat; expected.stage = 'last-guess'; expected.turnSeat = checked.suspectSeat;
  }
  return requireCanonical(game, expected);
}

/** Normalize RTDB omissions while recomputing every public score/result. */
export function normalizePartyGame(game) {
  if (!record(game)) fail('INVALID_GAME', 'Masa oyunu durumu bulunamadı.');
  partyGameSpec(game.mode);
  if (game.mode === 'auction') return normalizeAuction(game);
  if (game.mode === 'sealed-auction') return normalizeSealed(game);
  if (game.mode === 'simultaneous-ranking') return normalizeRanking(game);
  if (game.mode === 'telepathy') return normalizeTelepathy(game);
  if (game.mode === 'detective') return normalizeDetective(game);
  return normalizeChameleon(game);
}

/** First nine rounds advance from public lock counts, never private slot maps. */
export function advancePartyRanking(game, progress) {
  const next = normalizePartyGame(game);
  if (next.mode !== 'simultaneous-ranking' || next.phase !== 'playing' || next.roundIndex >= 9) fail('ROUND_LOCKED', 'Son turda tam sıralamalar birlikte açılmalıdır.');
  const count = next.roundIndex + 1;
  if (!record(progress) || Object.keys(progress).length !== next.seats.length || next.seats.some(seat => progress[seat] !== count)) fail('MISSING_SUBMISSIONS', 'Herkes mevcut kartı kilitlemeden yeni kart açılamaz.');
  next.progress = map(next.seats, count);
  next.roundIndex += 1;
  return next;
}

/** Public commands: auction bid/pass; next after a revealed completed round. */
export function changePartyGame(game, seat, command, payload = {}) {
  const next = normalizePartyGame(game);
  if (!next.seats.includes(seat)) fail('INVALID_SEAT', 'Bu masanın oyuncusu değilsin.');
  if (next.phase === 'finished') fail('GAME_FINISHED', 'Bu oyun tamamlandı.');
  if (!record(payload)) fail('INVALID_COMMAND', 'Hamle içeriği geçersiz.');
  if ((payload.roundIndex != null && payload.roundIndex !== next.roundIndex) || (payload.stage != null && payload.stage !== next.stage)) fail('STALE_SUBMISSION', 'Bu hamle eski bir tura ait.');
  if (next.mode === 'auction') {
    auctionMove(next, seat, command, payload);
    next.actions.push(command === 'bid' ? { seat, command, amount: payload.amount } : { seat, command });
    return next;
  }
  if (command !== 'next' || next.stage !== 'reveal') fail('ROUND_LOCKED', 'Önce bu turun seçimleri tamamlanmalıdır.');
  if (next.mode === 'sealed-auction') advanceSealed(next);
  else if (next.mode === 'telepathy') { next.roundIndex += 1; next.stage = 'choosing'; }
  else if (next.mode === 'detective') advanceDetective(next);
  else if (next.mode === 'chameleon') advanceChameleon(next);
  else fail('INVALID_COMMAND', 'Ortak sıralama otomatik ilerler.');
  return next;
}

/**
 * Locked private records, keyed by seats:
 * sealed {amount}; telepathy {cardId}; ranking {slot,slots:{s1:id,...}};
 * detective clue/guess records only its current actor {word}/{cardId};
 * chameleon clue record only turnSeat {word}, all votes {seat}, last {cardId}.
 * No partial simultaneous submissions are returned publicly.
 */
export function resolvePartyRound(game, records, secrets = {}) {
  const next = normalizePartyGame(game);
  if (next.phase === 'finished') fail('GAME_FINISHED', 'Bu oyun tamamlandı.');
  if (next.mode === 'auction') fail('INVALID_COMMAND', 'Açık artırma sırayla teklif ve pas hamleleriyle oynanır.');
  if (next.stage === 'reveal') fail('ROUND_LOCKED', 'Bu turun seçimleri zaten açıldı.');
  if (next.mode === 'sealed-auction') {
    exactRecords(next, records); applySealedResult(next, sealedResult(next, records));
  } else if (next.mode === 'telepathy') {
    applyTelepathyResult(next, telepathyResult(next, records));
  } else if (next.mode === 'simultaneous-ranking') {
    exactRecords(next, records);
    const count = next.roundIndex + 1;
    if (count < 10 && next.seats.every(seat => records[seat].slots == null)) {
      if (next.seats.some(seat => records[seat].locked !== true || records[seat].count !== count)) fail('MISSING_SUBMISSIONS', 'Herkes mevcut kartı kilitlemeden yeni kart açılamaz.');
      return advancePartyRanking(next, map(next.seats, seat => records[seat].count));
    }
    const rankings = map(next.seats, seat => {
      const entry = records[seat];
      if (!integer(entry.slot, 1, 10)) fail('INVALID_SLOT', '1 ile 10 arasında boş bir yuva seç.');
      const slots = rankingSlots(next.deck, entry.slots, count);
      if (slots[`s${entry.slot}`] !== next.deck[next.roundIndex]) fail('INVALID_RANKING', 'Yeni kart seçilen yuvaya yerleştirilmelidir.');
      return slots;
    });
    next.progress = map(next.seats, count);
    if (count === 10) { next.phase = 'finished'; next.stage = 'finished'; next.rankings = rankings; next.result = rankingMatrix(next.deck, rankings, next.seats); }
    else next.roundIndex += 1;
  } else if (next.mode === 'detective') {
    const actor = next.stage === 'clue' ? next.clueGiverSeat : next.guesserSeat;
    exactRecords(next, records, [actor]);
    if (next.stage === 'clue') { next.clue = partyClue(records[actor].word); next.stage = 'guess'; }
    else applyDetectiveResult(next, detectiveResult(next, records[actor].cardId, target(next, secrets)));
  } else if (next.stage === 'clues') {
    exactRecords(next, records, [next.turnSeat]);
    next.clues[next.turnSeat] = partyClue(records[next.turnSeat].word);
    if (Object.keys(next.clues).length === next.seats.length) { next.turnSeat = null; next.stage = 'voting'; }
    else next.turnSeat = clockwise(next.seats, next.turnSeat);
  } else if (next.stage === 'voting') {
    exactRecords(next, records);
    const votes = map(next.seats, seat => records[seat].seat);
    const checked = checkedVotes(next, votes);
    if (!next.seats.includes(secrets.moleSeat)) fail('INVALID_SECRET', 'Bukalemun masadaki bir oyuncu olmalıdır.');
    if (checked.suspectSeat === secrets.moleSeat) {
      next.votes = checked.votes; next.caughtSeat = checked.suspectSeat; next.turnSeat = checked.suspectSeat; next.stage = 'last-guess';
    } else applyChameleonResult(next, chameleonResult(next, votes, secrets));
  } else if (next.stage === 'last-guess') {
    exactRecords(next, records, [next.caughtSeat]);
    if (secrets.moleSeat !== next.caughtSeat) fail('INVALID_SECRET', 'Son tahmin yakalanan Bukalemun’a aittir.');
    applyChameleonResult(next, chameleonResult(next, next.votes, secrets, records[next.caughtSeat].cardId));
  } else fail('INVALID_GAME', 'Masa oyununun evresi geçersiz.');
  return next;
}
