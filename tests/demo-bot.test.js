import test from 'node:test';
import assert from 'node:assert/strict';
import { createAuction, placeBid, passTurn } from '../js/auction.js';
import { chooseBotMove } from '../js/demo-bot.js';

const deck = Array.from({ length: 16 }, (_, index) => index + 1);

test('bot opening at 1 TL waits for the human, without receiving a card', () => {
  const game = createAuction(deck, 'p2');
  assert.equal(chooseBotMove(game, 1), null);
  assert.equal(game.turnSeat, 'p1');
  assert.deepEqual(game.budgets, { p1: 20, p2: 20 });
  assert.deepEqual(game.rosters, { p1: [], p2: [] });
  const raised = placeBid(game, 'p1', 3);
  assert.equal(raised.currentCardId, game.currentCardId);
  assert.deepEqual(raised.rosters, { p1: [], p2: [] });
});

test('bot always counters an affordable human opening before a human decision', () => {
  for (const roll of [0, 0.2, 0.9]) {
    const game = createAuction(deck, 'p1');
    const move = chooseBotMove(game, roll);
    assert.deepEqual(move, { kind: 'bid', amount: 2 });
    const next = placeBid(game, 'p2', move.amount);
    assert.equal(next.turnSeat, 'p1');
    assert.equal(next.currentCardId, 1);
    assert.equal(next.awardCount, 0);
    assert.equal(chooseBotMove(next), null);
  }
});

test('bot receives the current card only after the human actually passes', () => {
  const offered = placeBid(createAuction(deck), 'p2', 2);
  assert.equal(offered.awardCount, 0);
  const awarded = passTurn(offered, 'p1');
  assert.deepEqual(awarded.rosters.p2, [{ id: 1, price: 2 }]);
  assert.equal(awarded.budgets.p2, 18);
  assert.equal(awarded.bidderSeat, 'p2');
  assert.equal(awarded.turnSeat, 'p1');
  assert.equal(chooseBotMove(awarded), null);
});

test('a bot pass awards the human bid and cannot award the following bot opening', () => {
  const offered = placeBid(placeBid(createAuction(deck), 'p2', 2), 'p1', 10);
  assert.deepEqual(chooseBotMove(offered), { kind: 'pass' });
  const next = passTurn(offered, 'p2');
  assert.deepEqual(next.rosters.p1, [{ id: 1, price: 10 }]);
  assert.deepEqual(next.rosters.p2, []);
  assert.equal(next.currentCardId, 2);
  assert.equal(next.bidderSeat, 'p2');
  assert.equal(next.turnSeat, 'p1');
  assert.equal(chooseBotMove(next), null);
});

test('bot cannot bid beyond quota or budget and cannot act after game over', () => {
  let game = passTurn(placeBid(createAuction(deck), 'p2', 20), 'p1');
  assert.equal(game.phase, 'playing');
  assert.equal(game.turnSeat, 'p2');
  assert.deepEqual(chooseBotMove(game), { kind: 'pass' });
  let full = createAuction(deck, 'p2');
  while (full.rosters.p2.length < 5) {
    if (full.turnSeat === 'p2') full = placeBid(full, 'p2', 2);
    full = passTurn(full, 'p1');
  }
  assert.ok(full.budgets.p2 > 2);
  assert.equal(full.turnSeat, 'p2');
  assert.deepEqual(chooseBotMove(full, 1), { kind: 'pass' });
  assert.equal(chooseBotMove(createAuction([])), null);
});
