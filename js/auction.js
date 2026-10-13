const SEATS = ["p1", "p2"];
const INITIAL_BUDGET = 20;
const ROSTER_LIMIT = 5;

/** A rejected move leaves the caller's snapshot untouched. */
export class RuleError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "RuleError";
    this.code = code;
  }
}

function assertSeat(seat) {
  if (!SEATS.includes(seat)) {
    throw new RuleError("INVALID_SEAT", "Geçerli bir oyuncu koltuğu seçilmedi.");
  }
}

function otherSeat(seat) {
  return seat === "p1" ? "p2" : "p1";
}

function validateDeck(deck) {
  if (!Array.isArray(deck) || deck.some((id) => !Number.isSafeInteger(id) || id < 1)) {
    throw new RuleError("INVALID_DECK", "Kart destesi pozitif tam sayı kimliklerinden oluşmalıdır.");
  }
  if (new Set(deck).size !== deck.length) {
    throw new RuleError("INVALID_DECK", "Bir kart destede yalnızca bir kez bulunabilir.");
  }
}

/** RTDB omits empty arrays and null fields; rebuild them before rendering/moving. */
export function normalizeAuction(game) {
  if (!game || typeof game !== "object") {
    throw new RuleError("INVALID_GAME", "Oyun durumu bulunamadı.");
  }
  validateDeck(game.deck);
  assertSeat(game.openerSeat);
  if (!["playing", "finished"].includes(game.phase)) {
    throw new RuleError("INVALID_GAME", "Oyun evresi geçersiz.");
  }
  if (!Number.isSafeInteger(game.deckIndex) || game.deckIndex < 0 || game.deckIndex > game.deck.length) {
    throw new RuleError("INVALID_GAME", "Kart sırası geçersiz.");
  }

  const rosters = {};
  const budgets = {};
  for (const seat of SEATS) {
    const roster = game.rosters?.[seat] ?? [];
    const budget = game.budgets?.[seat];
    if (!Array.isArray(roster) || roster.length > ROSTER_LIMIT) {
      throw new RuleError("INVALID_GAME", "Oyuncu kadrosu geçersiz.");
    }
    if (!Number.isSafeInteger(budget) || budget < 0 || budget > INITIAL_BUDGET) {
      throw new RuleError("INVALID_GAME", "Oyuncu bütçesi geçersiz.");
    }
    rosters[seat] = roster.map((entry) => {
      if (!entry || !Number.isSafeInteger(entry.id) || entry.id < 1 ||
          !Number.isSafeInteger(entry.price) || entry.price < 0 || entry.price > INITIAL_BUDGET ||
          (entry.price === 0 ? entry.source !== "completion" : entry.source != null)) {
        throw new RuleError("INVALID_GAME", "Kadro kartı geçersiz.");
      }
      return entry.price === 0 ? { id: entry.id, price: 0, source: "completion" } : { id: entry.id, price: entry.price };
    });
    budgets[seat] = budget;
    if (rosters[seat].reduce((spent, entry) => spent + entry.price, budget) !== INITIAL_BUDGET) {
      throw new RuleError("INVALID_GAME", "Kadro fiyatları oyuncu bütçesiyle uyuşmuyor.");
    }
  }

  const awardedCards = SEATS.flatMap(seat => rosters[seat].map(entry => ({ ...entry, seat })));
  const awardCount = game.awardCount ?? awardedCards.length;
  if (awardCount !== awardedCards.length || game.deckIndex !== awardCount ||
      new Set(awardedCards.map(entry => entry.id)).size !== awardCount ||
      awardedCards.some(entry => !game.deck.slice(0, awardCount).includes(entry.id))) {
    throw new RuleError("INVALID_GAME", "Dağıtılan kartlar desteyle uyuşmuyor.");
  }
  const rawCompletion = game.completionAwards ?? [];
  if (!Array.isArray(rawCompletion)) throw new RuleError("INVALID_GAME", "Tamamlama kartları geçersiz.");
  const completionAwards = rawCompletion.map(entry => {
    if (!entry || !SEATS.includes(entry.seat) || entry.price !== 0 ||
        !Number.isSafeInteger(entry.id) || !Number.isSafeInteger(entry.sequence)) {
      throw new RuleError("INVALID_GAME", "Tamamlama kartı geçersiz.");
    }
    return { id: entry.id, seat: entry.seat, price: 0, sequence: entry.sequence };
  });
  const freeCards = awardedCards.filter(entry => entry.source === "completion");
  const paidCount = awardCount - completionAwards.length;
  const expectedCompletion = [];
  let expectedIndex = paidCount;
  if (completionAwards.length > 0) {
    for (const seat of SEATS) {
      const paidCards = rosters[seat].filter(entry => entry.price > 0).length;
      for (let count = paidCards; count < ROSTER_LIMIT && expectedIndex < game.deck.length; count++) {
        expectedCompletion.push({ id: game.deck[expectedIndex++], seat, price: 0, sequence: expectedIndex });
      }
    }
  }
  if (freeCards.length !== completionAwards.length || completionAwards.some((entry, index) =>
    entry.sequence !== paidCount + index + 1 || game.deck[entry.sequence - 1] !== entry.id ||
    !freeCards.some(card => card.id === entry.id && card.seat === entry.seat) ||
    entry.id !== expectedCompletion[index]?.id || entry.seat !== expectedCompletion[index]?.seat) ||
    expectedCompletion.length !== completionAwards.length ||
    (completionAwards.length > 0 && (game.phase !== "finished" ||
      SEATS.some(seat => budgets[seat] > 0 && rosters[seat].length < ROSTER_LIMIT)))) {
    throw new RuleError("INVALID_GAME", "Tamamlama kartları oyun sonucuyla uyuşmuyor.");
  }
  const lastAward = game.lastAward ? { ...game.lastAward } : null;
  if (lastAward ? !Number.isSafeInteger(lastAward.price) || lastAward.price < 1 ||
    lastAward.sequence !== paidCount || game.deck[paidCount - 1] !== lastAward.id ||
    !awardedCards.some(entry => entry.id === lastAward.id && entry.seat === lastAward.seat && entry.price === lastAward.price)
    : paidCount !== 0) {
    throw new RuleError("INVALID_GAME", "Son açık artırma sonucu geçersiz.");
  }

  return {
    phase: game.phase,
    deck: [...game.deck],
    deckIndex: game.deckIndex,
    currentCardId: game.currentCardId ?? null,
    openerSeat: game.openerSeat,
    highestBid: game.highestBid ?? 0,
    bidderSeat: game.bidderSeat ?? null,
    turnSeat: game.turnSeat ?? null,
    budgets,
    rosters,
    lastAward,
    awardCount,
    completionAwards,
  };
}

function eligible(game, seat) {
  return game.budgets[seat] >= 1 && game.rosters[seat].length < ROSTER_LIMIT;
}

export function canBuy(game, seat) {
  assertSeat(seat);
  return eligible(normalizeAuction(game), seat);
}

function finish(game) {
  game.phase = "finished";
  game.currentCardId = null;
  game.highestBid = 0;
  game.bidderSeat = null;
  game.turnSeat = null;
}

// The deck was shuffled before starting the room. Consume its remaining order
// only after all paid auctions are over, so transaction retries stay identical.
function completeRosters(game) {
  for (const seat of SEATS) {
    while (game.rosters[seat].length < ROSTER_LIMIT && game.deckIndex < game.deck.length) {
      const id = game.deck[game.deckIndex];
      game.rosters[seat].push({ id, price: 0, source: "completion" });
      game.awardCount += 1;
      game.completionAwards.push({ id, seat, price: 0, sequence: game.awardCount });
      game.deckIndex += 1;
    }
  }
}

function award(game, seat, price) {
  const id = game.deck[game.deckIndex];
  game.budgets[seat] -= price;
  game.rosters[seat].push({ id, price });
  game.awardCount += 1;
  game.lastAward = { id, seat, price, sequence: game.awardCount };
  game.deckIndex += 1;
}

// Mutates only a fresh private copy. Never uses randomness, clocks, or IO.
function openNextCard(game, preferredSeat) {
  const buyers = SEATS.filter((seat) => eligible(game, seat));
  if (game.deckIndex >= game.deck.length || buyers.length === 0) {
    if (buyers.length === 0) completeRosters(game);
    finish(game);
    return game;
  }
  const opener = buyers.includes(preferredSeat) ? preferredSeat : buyers[0];
  game.openerSeat = opener;
  game.phase = "playing";
  game.currentCardId = game.deck[game.deckIndex];
  game.highestBid = 1;
  game.bidderSeat = opener;
  // Even a player with no budget or free slot must explicitly pass. Opening a
  // card only proposes a price; it never purchases this or any future card.
  game.turnSeat = otherSeat(opener);
  return game;
}

/** Shuffle the local static deck once BEFORE passing its ids to this function. */
export function createAuction(deckIds, starterSeat = "p1") {
  validateDeck(deckIds);
  assertSeat(starterSeat);
  const game = {
    phase: "playing",
    deck: [...deckIds],
    deckIndex: 0,
    currentCardId: null,
    openerSeat: starterSeat,
    highestBid: 0,
    bidderSeat: null,
    turnSeat: null,
    budgets: { p1: INITIAL_BUDGET, p2: INITIAL_BUDGET },
    rosters: { p1: [], p2: [] },
    lastAward: null,
    awardCount: 0,
    completionAwards: [],
  };
  return openNextCard(game, starterSeat);
}

function snapshotForMove(game, seat) {
  assertSeat(seat);
  const next = normalizeAuction(game);
  if (next.phase !== "playing") {
    throw new RuleError("GAME_FINISHED", "Oyun tamamlandı.");
  }
  if (next.turnSeat !== seat) {
    throw new RuleError("NOT_YOUR_TURN", "Hamle sırası diğer oyuncuda.");
  }
  if (next.currentCardId !== next.deck[next.deckIndex] ||
      next.bidderSeat !== otherSeat(seat) ||
      !eligible(next, next.bidderSeat) ||
      !Number.isSafeInteger(next.highestBid) || next.highestBid < 1 ||
      next.highestBid > next.budgets[next.bidderSeat]) {
    throw new RuleError("INVALID_GAME", "Açık artırma durumu geçersiz.");
  }
  return next;
}

export function placeBid(game, seat, amount) {
  const next = snapshotForMove(game, seat);
  if (!eligible(next, seat)) {
    throw new RuleError("CANNOT_BUY", "Bütçen veya kadro kontenjanın doldu. Pas geçerek devam et.");
  }
  if (!Number.isSafeInteger(amount) || amount <= next.highestBid) {
    throw new RuleError("INVALID_BID", "Teklif mevcut fiyattan büyük bir tam sayı olmalıdır.");
  }
  if (amount > next.budgets[seat]) {
    throw new RuleError("OVER_BUDGET", "Bu teklif bütçeni aşıyor.");
  }
  next.highestBid = amount;
  next.bidderSeat = seat;
  next.turnSeat = otherSeat(seat);
  return next;
}

export function passTurn(game, seat) {
  const next = snapshotForMove(game, seat);
  award(next, next.bidderSeat, next.highestBid);
  return openNextCard(next, otherSeat(next.openerSeat));
}
