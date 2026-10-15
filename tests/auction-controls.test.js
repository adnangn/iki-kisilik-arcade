import test from 'node:test';
import assert from 'node:assert/strict';
import { auctionControls, auctionDecisionKey } from '../js/auction-controls.js';
import { createPartyGame, changePartyGame } from '../js/party-games.js';

const deck = Array.from({ length: 40 }, (_, index) => index + 1);
const create = (count = 4) => createPartyGame('auction', { seats: ['p1', 'p2', 'p3', 'p4'].slice(0, count), deck });
const stateFor = (game, extra = {}) => ({
  room: { code: '123456', createdAt: 100, round: 1, mode: 'auction', status: 'playing', game },
  seat: game.turnSeat, connected: true, busy: false, privateState: { loaded: true }, ...extra,
});

test('one-tap increases display the actual total and every enabled offer is legal', () => {
  for (const count of [2, 3, 4]) {
    const game = create(count), state = stateFor(game), controls = auctionControls(state);
    assert.equal(controls.minimum, 2);
    assert.deepEqual(controls.quickBids.map(offer => [offer.increment, offer.amount, offer.disabled]), [[1, 2, false], [2, 3, false], [3, 4, false]]);
    for (const offer of controls.quickBids) {
      const next = changePartyGame(game, state.seat, 'bid', { amount: offer.amount });
      assert.equal(next.highestBid, offer.amount);
      assert.equal(next.bidderSeat, state.seat);
    }
  }
});

test('quick bids respect the exact remaining budget while a legal pass remains available', () => {
  const game = create();
  game.budgets.p2 = 3;
  const controls = auctionControls(stateFor(game));
  assert.equal(controls.canPass, true);
  assert.equal(controls.canBid, true);
  assert.deepEqual(controls.quickBids.map(offer => offer.disabled), [false, false, true]);
  game.budgets.p2 = 1;
  assert.equal(auctionControls(stateFor(game)).canBid, false);
  assert.ok(auctionControls(stateFor(game)).quickBids.every(offer => offer.disabled));
  assert.equal(auctionControls(stateFor(game)).canPass, true);
});

test('rivals, passed seats, spectators, disconnects and pending writes cannot send a quick bid', () => {
  const game = create();
  for (const extra of [{ seat: 'p1' }, { seat: null }, { seat: 'p5' }, { connected: false }, { busy: true }, { privateState: { loaded: false } }]) {
    const controls = auctionControls(stateFor(game, extra));
    assert.equal(controls.canPass, false);
    assert.equal(controls.canBid, false);
    assert.ok(controls.quickBids.every(offer => offer.disabled));
  }
  const passed = structuredClone(game); passed.passed.p2 = true;
  assert.equal(auctionControls(stateFor(passed)).canPass, false);
  const duo = create(2);
  assert.equal(auctionControls(stateFor(duo, { seat: 'p3' })).canBid, false);
});

test('five collected cards disable every bid without making the pass control unreachable', () => {
  const game = create(); game.rosters.p2 = deck.slice(20, 25).map(id => ({ id, price: 0 }));
  const controls = auctionControls(stateFor(game));
  assert.equal(controls.canBid, false);
  assert.ok(controls.quickBids.every(offer => offer.disabled));
  assert.equal(controls.canPass, true);
  const finished = stateFor({ ...game, phase: 'finished', stage: 'finished' });
  assert.equal(auctionControls(finished).canPass, false);
});

test('manual input survives connection/progress/busy redraws within the same decision', () => {
  const state = stateFor(create());
  const key = auctionDecisionKey(state);
  for (const extra of [{ busy: true }, { connected: false }, { privateState: { loaded: false, progress: { p3: true } } }, { presence: { p3: false } }]) {
    assert.equal(auctionDecisionKey({ ...state, ...extra }), key);
  }
});

test('every actual auction decision starts with the current minimum instead of restoring an earlier draft', () => {
  let game = create(2), state = stateFor(game);
  const firstKey = auctionDecisionKey(state);
  game = changePartyGame(game, 'p2', 'bid', { amount: 4 });
  state = stateFor(game, { seat: 'p2' });
  assert.notEqual(auctionDecisionKey(state), firstKey);
  assert.equal(auctionControls(state).minimum, 5);
  const awayKey = auctionDecisionKey(state);
  game = changePartyGame(game, 'p1', 'bid', { amount: 7 });
  state = stateFor(game, { seat: 'p2' });
  assert.notEqual(auctionDecisionKey(state), awayKey);
  assert.equal(auctionControls(state).minimum, 8);
  assert.equal(auctionControls(state).canBid, true);
  const sameCardKey = auctionDecisionKey(state);
  game = changePartyGame(game, 'p2', 'pass');
  state = stateFor(game, { seat: 'p2' });
  assert.notEqual(auctionDecisionKey(state), sameCardKey);
  assert.equal(auctionControls(state).minimum, 2);
});

test('a new room, rematch or player identity cannot inherit another decision draft', () => {
  const state = stateFor(create()), key = auctionDecisionKey(state);
  assert.notEqual(auctionDecisionKey({ ...state, seat: 'p3' }), key);
  for (const change of [{ code: '654321' }, { createdAt: 200 }, { round: 2 }, { status: 'finished' }]) {
    assert.notEqual(auctionDecisionKey({ ...state, room: { ...state.room, ...change } }), key);
  }
});
