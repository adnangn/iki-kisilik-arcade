const SEATS = ['p1', 'p2'];
const DECK_SIZE = 16;
const MATCH_COUNT = 15;

export class BracketError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'BracketError';
    this.code = code;
  }
}

function reject(code, message) { throw new BracketError(code, message); }
function assertSeat(seat) {
  if (!SEATS.includes(seat)) reject('INVALID_SEAT', 'Geçerli bir oyuncu koltuğu seçilmedi.');
}
function validateDeck(deck, maximum = DECK_SIZE) {
  if (!Array.isArray(deck) || deck.length < DECK_SIZE || deck.length > maximum ||
      deck.some(id => !Number.isSafeInteger(id) || id < 1) || new Set(deck).size !== deck.length) {
    reject('INVALID_DECK', 'Eleme destesi benzersiz pozitif kart kimliklerinden oluşmalıdır.');
  }
}
function roundFor(index) { return index < 8 ? 1 : index < 12 ? 2 : index < 14 ? 3 : 4; }
function pairFor(index, deck, choices) {
  if (index < 8) return { left: deck[index * 2], right: deck[index * 2 + 1] };
  const first = index < 12 ? (index - 8) * 2 + 1 : index < 14 ? (index - 12) * 2 + 9 : 13;
  return { left: choices[`m${first}`], right: choices[`m${first + 1}`] };
}

/** The caller shuffles once before entering a transaction; no RNG runs here. */
export function createBracket(deckIds, activeSeat = 'p1') {
  validateDeck(deckIds, 200);
  assertSeat(activeSeat);
  const deck = deckIds.slice(0, DECK_SIZE);
  return {
    phase: 'playing', deck, activeSeat, matchIndex: 0, round: 1,
    currentPair: pairFor(0, deck, {}), choices: {}, winnerId: null, lastChoice: null,
  };
}

/** Rebuild RTDB's omitted empty objects/nulls and verify every knockout path. */
export function normalizeBracket(game) {
  if (!game || typeof game !== 'object' || Array.isArray(game)) reject('INVALID_GAME', 'Eleme durumu bulunamadı.');
  validateDeck(game.deck);
  assertSeat(game.activeSeat);
  const index = game.matchIndex;
  const finished = index === MATCH_COUNT;
  if (!Number.isSafeInteger(index) || index < 0 || index > MATCH_COUNT ||
      game.phase !== (finished ? 'finished' : 'playing') || game.round !== roundFor(index)) {
    reject('INVALID_GAME', 'Eleme turu veya maç sırası geçersiz.');
  }
  const source = game.choices ?? {};
  if (typeof source !== 'object' || Array.isArray(source)) reject('INVALID_GAME', 'Eleme seçimleri geçersiz.');
  const choices = {};
  for (const [key, id] of Object.entries(source)) {
    if (!/^m([1-9]|1[0-5])$/.test(key) || !Number.isSafeInteger(id) || id < 1) {
      reject('INVALID_GAME', 'Eleme seçimi veya kart kimliği geçersiz.');
    }
    choices[key] = id;
  }
  if (Object.keys(choices).length !== index) reject('INVALID_GAME', 'Tamamlanan maç sayısı uyuşmuyor.');
  for (let match = 0; match < index; match += 1) {
    const pair = pairFor(match, game.deck, choices);
    if (![pair.left, pair.right].includes(choices[`m${match + 1}`])) {
      reject('INVALID_GAME', 'Bir kart kazanmadığı maçtan üst tura çıkarılamaz.');
    }
  }
  const pair = finished ? null : pairFor(index, game.deck, choices);
  if (finished ? (game.currentPair ?? null) !== null :
      !game.currentPair || game.currentPair.left !== pair.left || game.currentPair.right !== pair.right) {
    reject('INVALID_GAME', 'Ekrandaki eşleşme eleme ağacıyla uyuşmuyor.');
  }
  const winnerId = game.winnerId ?? null;
  if (winnerId !== (finished ? choices.m15 : null)) reject('INVALID_GAME', 'Turnuva galibi geçersiz.');
  const last = game.lastChoice ?? null;
  if (index === 0) {
    if (last !== null) reject('INVALID_GAME', 'İlk maçtan önce seçim olamaz.');
  } else {
    const previousPair = pairFor(index - 1, game.deck, choices);
    const winner = choices[`m${index}`];
    const loser = previousPair.left === winner ? previousPair.right : previousPair.left;
    if (!last || last.matchIndex !== index - 1 || last.sequence !== index ||
        last.round !== roundFor(index - 1) || last.cardId !== winner || last.loserId !== loser) {
      reject('INVALID_GAME', 'Son eleme seçimi maç sırasıyla uyuşmuyor.');
    }
  }
  return {
    phase: game.phase, deck: [...game.deck], activeSeat: game.activeSeat, matchIndex: index,
    round: game.round, currentPair: pair, choices, winnerId,
    lastChoice: last ? { cardId: last.cardId, loserId: last.loserId, matchIndex: last.matchIndex,
      round: last.round, sequence: last.sequence } : null,
  };
}

export function chooseBracketCard(game, seat, cardId) {
  assertSeat(seat);
  const next = normalizeBracket(game);
  if (next.phase !== 'playing') reject('GAME_FINISHED', 'Turnuva tamamlandı.');
  if (seat !== next.activeSeat) reject('NOT_ACTIVE_PLAYER', 'Bu turda izleyicisin.');
  const pair = next.currentPair;
  if (![pair.left, pair.right].includes(cardId)) reject('INVALID_CHOICE', 'Bu eşleşmedeki iki karttan birini seç.');
  const index = next.matchIndex;
  next.choices[`m${index + 1}`] = cardId;
  next.lastChoice = { cardId, loserId: pair.left === cardId ? pair.right : pair.left,
    matchIndex: index, round: next.round, sequence: index + 1 };
  next.matchIndex += 1;
  next.round = roundFor(next.matchIndex);
  if (next.matchIndex === MATCH_COUNT) {
    next.phase = 'finished'; next.currentPair = null; next.winnerId = cardId;
  } else {
    next.currentPair = pairFor(next.matchIndex, next.deck, next.choices);
  }
  return next;
}
