/** A draft belongs to one auction decision, rather than the whole card round. */
export function auctionDecisionKey(state) {
  const room = state?.room || {}, game = room.game || {};
  return JSON.stringify([room.code, room.createdAt, room.round, room.status, state?.seat,
    game.deckIndex, game.currentCardId, game.turnSeat, game.bidderSeat, game.highestBid,
    game.actions?.length || 0]);
}

/** Shared eligibility for the amount field and the one-tap bid controls. */
export function auctionControls(state) {
  const room = state?.room || {}, game = room.game || {}, seat = state?.seat;
  const highestBid = Number.isSafeInteger(game.highestBid) ? game.highestBid : 0;
  const maximum = Number.isSafeInteger(game.budgets?.[seat]) ? game.budgets[seat] : 0;
  const current = room.status === 'playing' && game.phase === 'playing' && game.stage === 'bidding'
    && game.seats?.includes(seat) && game.turnSeat === seat && !game.passed?.[seat];
  const available = Boolean(state?.connected && !state?.busy && state?.privateState?.loaded !== false);
  const canPass = Boolean(current && available);
  const canBid = canPass && (game.rosters?.[seat]?.length || 0) < 5 && maximum > highestBid;
  return {
    minimum: highestBid + 1, maximum, canBid, canPass,
    quickBids: [1, 2, 3].map(increment => ({ increment, amount: highestBid + increment,
      disabled: !canBid || highestBid + increment > maximum })),
  };
}
