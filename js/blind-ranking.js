const SEATS = ['p1', 'p2'];
const SLOT_COUNT = 10;

export class BlindRankingError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'BlindRankingError';
    this.code = code;
  }
}

function reject(code, message) {
  throw new BlindRankingError(code, message);
}

function assertSeat(seat) {
  if (!SEATS.includes(seat)) {
    reject('INVALID_SEAT', 'Geçerli bir oyuncu koltuğu seçilmedi.');
  }
}

function validateDeck(deck, minimum = SLOT_COUNT, maximum = SLOT_COUNT) {
  if (!Array.isArray(deck) || deck.length < minimum || deck.length > maximum ||
      deck.some(id => !Number.isSafeInteger(id) || id < 1) ||
      new Set(deck).size !== deck.length) {
    reject('INVALID_DECK', 'Kart destesi benzersiz pozitif tam sayı kimliklerinden oluşmalıdır.');
  }
}

/** Shuffle the pool once before a Firebase transaction; this function uses no RNG. */
export function createBlindRanking(deckIds, activeSeat = 'p1') {
  validateDeck(deckIds, SLOT_COUNT, 200);
  assertSeat(activeSeat);
  const deck = deckIds.slice(0, SLOT_COUNT);
  return {
    phase: 'playing',
    deck,
    deckIndex: 0,
    activeSeat,
    currentCardId: deck[0],
    slots: {},
    lastPlacement: null,
  };
}

/** RTDB omits empty objects and null values; only those omissions are restored. */
export function normalizeBlindRanking(game) {
  if (!game || typeof game !== 'object' || Array.isArray(game)) {
    reject('INVALID_GAME', 'Oyun durumu bulunamadı.');
  }
  validateDeck(game.deck);
  assertSeat(game.activeSeat);
  const index = game.deckIndex;
  if (!Number.isSafeInteger(index) || index < 0 || index > SLOT_COUNT ||
      game.phase !== (index === SLOT_COUNT ? 'finished' : 'playing')) {
    reject('INVALID_GAME', 'Kart sırası veya oyun evresi geçersiz.');
  }
  const currentCardId = game.currentCardId ?? null;
  if (currentCardId !== (index === SLOT_COUNT ? null : game.deck[index])) {
    reject('INVALID_GAME', 'Gösterilen kart destenin sırasıyla uyuşmuyor.');
  }
  const sourceSlots = game.slots ?? {};
  if (typeof sourceSlots !== 'object' || Array.isArray(sourceSlots)) {
    reject('INVALID_GAME', 'Sıralama yuvaları geçersiz.');
  }
  const slots = {};
  for (const [key, id] of Object.entries(sourceSlots)) {
    if (!/^s([1-9]|10)$/.test(key) || !Number.isSafeInteger(id) || id < 1) {
      reject('INVALID_GAME', 'Sıralama yuvası veya kartı geçersiz.');
    }
    slots[key] = id;
  }
  const placedIds = Object.values(slots);
  if (placedIds.length !== index || new Set(placedIds).size !== index ||
      game.deck.slice(0, index).some(id => !placedIds.includes(id))) {
    reject('INVALID_GAME', 'Yerleştirilen kartlar destenin sırasıyla uyuşmuyor.');
  }
  const placement = game.lastPlacement ?? null;
  if (index === 0) {
    if (placement !== null) reject('INVALID_GAME', 'İlk karttan önce yerleştirme olamaz.');
  } else if (!placement || !Number.isInteger(placement.slot) ||
             placement.slot < 1 || placement.slot > SLOT_COUNT ||
             placement.sequence !== index || placement.id !== game.deck[index - 1] ||
             slots[`s${placement.slot}`] !== placement.id) {
    reject('INVALID_GAME', 'Son yerleştirme bilgisi sıralamayla uyuşmuyor.');
  }
  return {
    phase: game.phase,
    deck: [...game.deck],
    deckIndex: index,
    activeSeat: game.activeSeat,
    currentCardId,
    slots,
    lastPlacement: placement ? {
      slot: placement.slot,
      id: placement.id,
      sequence: placement.sequence,
    } : null,
  };
}

export function placeBlindCard(game, seat, slotNumber) {
  assertSeat(seat);
  const next = normalizeBlindRanking(game);
  if (next.phase !== 'playing') reject('GAME_FINISHED', 'Sıralama tamamlandı.');
  if (seat !== next.activeSeat) reject('NOT_ACTIVE_PLAYER', 'Bu turda izleyicisin.');
  if (!Number.isInteger(slotNumber) || slotNumber < 1 || slotNumber > SLOT_COUNT) {
    reject('INVALID_SLOT', '1 ile 10 arasında bir sıralama yuvası seç.');
  }
  const key = `s${slotNumber}`;
  if (Object.hasOwn(next.slots, key)) reject('SLOT_OCCUPIED', 'Bu sıralama yuvası dolu.');
  const id = next.currentCardId;
  next.slots[key] = id;
  next.deckIndex += 1;
  next.lastPlacement = { slot: slotNumber, id, sequence: next.deckIndex };
  next.phase = next.deckIndex === SLOT_COUNT ? 'finished' : 'playing';
  next.currentCardId = next.phase === 'finished' ? null : next.deck[next.deckIndex];
  return next;
}
