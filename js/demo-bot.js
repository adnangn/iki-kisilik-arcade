import { canBuy } from './auction.js';

/** The bot only responds to an opponent's offer; opening a card is not a move. */
export function chooseBotMove(game, roll = 0.5) {
  if (game.phase !== 'playing' || game.turnSeat !== 'p2') return null;
  const amount = game.highestBid + 1;
  if (!canBuy(game, 'p2') || amount > game.budgets.p2) return { kind: 'pass' };
  // Counter the 1 TL opening whenever possible, so each demo card reaches
  // the human's decision instead of ending on the bot's immediate first pass.
  if (game.highestBid === 1) return { kind: 'bid', amount };
  const freeSlots = 5 - (game.rosters?.p2?.length || 0);
  const limit = Math.min(6, game.budgets.p2 - Math.max(0, freeSlots - 1));
  return amount <= limit && roll >= 0.3 ? { kind: 'bid', amount } : { kind: 'pass' };
}
