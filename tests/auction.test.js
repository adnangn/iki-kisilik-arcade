import test from "node:test";
import assert from "node:assert/strict";
import { createAuction, placeBid, passTurn, canBuy, normalizeAuction, RuleError } from "../js/auction.js";

const deck = Array.from({ length: 24 }, (_, index) => index + 1);
const errorCode = (code) => (error) => error instanceof RuleError && error.code === code;

function deepFreeze(value) {
  if (value && typeof value === "object") {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
}

test("automatic 1 TL opening alternates after a pass", () => {
  const first = createAuction(deck);
  assert.equal(first.currentCardId, 1);
  assert.equal(first.highestBid, 1);
  assert.equal(first.bidderSeat, "p1");
  assert.equal(first.turnSeat, "p2");
  const second = passTurn(first, "p2");
  assert.deepEqual(second.rosters.p1, [{ id: 1, price: 1 }]);
  assert.equal(second.budgets.p1, 19);
  assert.equal(second.openerSeat, "p2");
  assert.equal(second.bidderSeat, "p2");
  assert.equal(second.turnSeat, "p1");
  assert.deepEqual(second.lastAward, { id: 1, seat: "p1", price: 1, sequence: 1 });
});

test("the automatic opening is a proposal, not a purchase", () => {
  for (const starter of ["p1", "p2"]) {
    const game = createAuction(deck, starter);
    assert.equal(game.openerSeat, starter);
    assert.equal(game.bidderSeat, starter);
    assert.equal(game.turnSeat, starter === "p1" ? "p2" : "p1");
    assert.equal(game.highestBid, 1);
    assert.deepEqual(game.budgets, { p1: 20, p2: 20 });
    assert.deepEqual(game.rosters, { p1: [], p2: [] });
    assert.equal(game.awardCount, 0);
    assert.equal(game.deckIndex, 0);
    assert.equal(game.lastAward, null);
  }
});

test("bids alternate, and only the final winning amount is deducted", () => {
  let game = createAuction(deck);
  game = placeBid(game, "p2", 4);
  assert.deepEqual(game.budgets, { p1: 20, p2: 20 });
  game = placeBid(game, "p1", 7);
  game = passTurn(game, "p2");
  assert.equal(game.budgets.p1, 13);
  assert.equal(game.budgets.p2, 20);
  assert.deepEqual(game.rosters.p1, [{ id: 1, price: 7 }]);
});

test("multiple bids alternate turns while next-card openers alternate independently of the winner", () => {
  let game = createAuction(deck);
  for (const [seat, amount] of [["p2", 2], ["p1", 3], ["p2", 4]]) {
    game = placeBid(game, seat, amount);
    assert.equal(game.openerSeat, "p1");
    assert.equal(game.turnSeat, seat === "p1" ? "p2" : "p1");
    assert.deepEqual(game.budgets, { p1: 20, p2: 20 });
    assert.equal(game.awardCount, 0);
  }
  game = passTurn(game, "p1");
  assert.equal(game.lastAward.seat, "p2");
  assert.equal(game.openerSeat, "p2");
  assert.equal(game.highestBid, 1);
  assert.equal(game.budgets.p2, 16);
  game = placeBid(game, "p1", 2);
  game = placeBid(game, "p2", 3);
  assert.equal(game.openerSeat, "p2");
  assert.equal(game.budgets.p2, 16);
  game = passTurn(game, "p1");
  assert.equal(game.lastAward.seat, "p2");
  assert.equal(game.openerSeat, "p1");
  assert.equal(game.bidderSeat, "p1");
  assert.equal(game.turnSeat, "p2");
  assert.deepEqual(game.rosters.p2, [{ id: 1, price: 4 }, { id: 2, price: 3 }]);
});

test("a full ordinary game stops at exactly five cards per player", () => {
  let game = createAuction(deck);
  let passes = 0;
  while (game.phase === "playing") {
    const awardsBefore = game.awardCount;
    game = passTurn(game, game.turnSeat);
    assert.equal(game.awardCount, awardsBefore + 1);
    passes += 1;
  }
  assert.equal(passes, 10);
  assert.equal(game.awardCount, 10);
  assert.equal(game.rosters.p1.length, 5);
  assert.equal(game.rosters.p2.length, 5);
  assert.deepEqual(game.budgets, { p1: 15, p2: 15 });
  assert.equal(game.currentCardId, null);
  assert.equal(game.turnSeat, null);
  assert.equal(game.bidderSeat, null);
  assert.equal(canBuy(game, "p1"), false);
  assert.throws(() => passTurn(game, "p1"), errorCode("GAME_FINISHED"));
});

test("exhausted budgets still require an actual pass for every remaining card", () => {
  for (const spentSeat of ["p1", "p2"]) {
    const buyer = spentSeat === "p1" ? "p2" : "p1";
    let game = createAuction(deck);
    if (spentSeat === "p1") game = placeBid(game, "p2", 2);
    game = placeBid(game, spentSeat, 20);
    game = passTurn(game, buyer);
    assert.equal(game.phase, "playing");
    assert.equal(game.budgets[spentSeat], 0);
    assert.equal(game.budgets[buyer], 20);
    assert.deepEqual(game.rosters[spentSeat], [{ id: 1, price: 20 }]);
    assert.deepEqual(game.rosters[buyer], []);
    assert.equal(game.awardCount, 1);
    assert.equal(game.currentCardId, 2);
    assert.equal(game.bidderSeat, buyer);
    assert.equal(game.turnSeat, spentSeat);
    assert.equal(canBuy(game, spentSeat), false);
    assert.throws(() => placeBid(game, spentSeat, 2), errorCode("CANNOT_BUY"));

    for (let count = 1; count <= 5; count++) {
      const before = deepFreeze(game);
      game = passTurn(before, spentSeat);
      assert.equal(game.awardCount, before.awardCount + 1);
      assert.equal(game.budgets[buyer], 20 - count);
      assert.equal(game.rosters[buyer].length, count);
      assert.deepEqual(game.lastAward, { id: count + 1, seat: buyer, price: 1, sequence: count + 1 });
      if (count < 5) {
        assert.equal(game.phase, "playing");
        assert.equal(game.currentCardId, count + 2);
        assert.equal(game.turnSeat, spentSeat);
        assert.equal(game.highestBid, 1);
      }
    }
    assert.equal(game.phase, "finished");
    assert.equal(game.awardCount, 6);
    assert.equal(game.deckIndex, 6);
  }
});

test("a full quota still requires its player to pass for each remaining card", () => {
  let game = createAuction(deck);
  // Make p1 win five contested cards for 1 or 2 TL.
  for (let count = 0; count < 5; count++) {
    if (game.bidderSeat === "p2") game = placeBid(game, "p1", 2);
    game = passTurn(game, "p2");
  }
  assert.equal(game.phase, "playing");
  assert.equal(game.rosters.p1.length, 5);
  assert.deepEqual(game.rosters.p2, []);
  assert.equal(game.budgets.p2, 20);
  assert.equal(game.awardCount, 5);
  assert.equal(game.currentCardId, 6);
  assert.equal(game.bidderSeat, "p2");
  assert.equal(game.turnSeat, "p1");
  assert.equal(canBuy(game, "p1"), false);
  assert.throws(() => placeBid(game, "p1", 2), errorCode("CANNOT_BUY"));
  for (let count = 1; count <= 5; count++) {
    game = passTurn(game, "p1");
    assert.equal(game.rosters.p2.length, count);
    assert.equal(game.awardCount, 5 + count);
    assert.equal(game.budgets.p2, 20 - count);
    if (count < 5) {
      assert.equal(game.phase, "playing");
      assert.equal(game.currentCardId, 6 + count);
      assert.equal(game.turnSeat, "p1");
    }
  }
  assert.equal(game.phase, "finished");
  assert.equal(game.rosters.p1.length, 5);
  assert.equal(game.rosters.p2.length, 5);
  assert.equal(game.budgets.p1, 13);
  assert.equal(game.budgets.p2, 15);
  assert.equal(new Set([...game.rosters.p1, ...game.rosters.p2].map((card) => card.id)).size, 10);
});

test("finite and empty decks finish cleanly", () => {
  const empty = createAuction([]);
  assert.equal(empty.phase, "finished");
  assert.equal(empty.awardCount, 0);
  const single = passTurn(createAuction([42], "p2"), "p1");
  assert.equal(single.phase, "finished");
  assert.deepEqual(single.rosters.p2, [{ id: 42, price: 1 }]);
  assert.equal(single.deckIndex, 1);
});

test("invalid moves and out of turn clicks are rejected", () => {
  const game = createAuction(deck);
  assert.throws(() => placeBid(game, "p1", 2), errorCode("NOT_YOUR_TURN"));
  assert.throws(() => passTurn(game, "p3"), errorCode("INVALID_SEAT"));
  for (const amount of [0, 1, 1.5, NaN, Infinity, "2", null]) {
    assert.throws(() => placeBid(game, "p2", amount), errorCode("INVALID_BID"));
  }
  assert.throws(() => placeBid(game, "p2", 21), errorCode("OVER_BUDGET"));
  assert.throws(() => createAuction([1, 1]), errorCode("INVALID_DECK"));
  assert.throws(() => createAuction([0]), errorCode("INVALID_DECK"));
  assert.throws(() => createAuction([1], "guest"), errorCode("INVALID_SEAT"));
});

test("transaction retries are deterministic and input snapshots stay immutable", () => {
  const inputDeck = deepFreeze([...deck]);
  const game = deepFreeze(createAuction(inputDeck));
  const saved = structuredClone(game);
  const bidA = placeBid(game, "p2", 4);
  const bidB = placeBid(game, "p2", 4);
  assert.deepEqual(bidA, bidB);
  assert.deepEqual(game, saved);
  bidA.deck[0] = 999;
  bidA.rosters.p1.push({ id: 999, price: 1 });
  assert.deepEqual(game, saved);
  const awardedInput = deepFreeze(placeBid(game, "p2", 4));
  assert.deepEqual(passTurn(awardedInput, "p1"), passTurn(awardedInput, "p1"));
});

test("Firebase omitted empty arrays and null fields normalize correctly", () => {
  const initial = createAuction(deck);
  const firebaseSnapshot = structuredClone(initial);
  delete firebaseSnapshot.rosters;
  delete firebaseSnapshot.lastAward;
  assert.deepEqual(normalizeAuction(firebaseSnapshot), initial);
  assert.deepEqual(passTurn(firebaseSnapshot, "p2"), passTurn(initial, "p2"));
  const ended = createAuction([]);
  delete ended.currentCardId;
  delete ended.turnSeat;
  delete ended.bidderSeat;
  assert.equal(normalizeAuction(ended).currentCardId, null);
  assert.equal(normalizeAuction(ended).turnSeat, null);
});

test("same-snapshot concurrent clicks are committed once by a room revision guard", () => {
  let room = { revision: 0, game: createAuction(deck) };
  const expectedRevision = room.revision;
  const apply = (current) => {
    if (current.revision !== expectedRevision) return undefined;
    return { revision: current.revision + 1, game: passTurn(current.game, "p2") };
  };
  room = apply(room);
  assert.equal(apply(room), undefined);
  assert.equal(room.game.awardCount, 1);
  // A duplicate bid also fails naturally when retried against the new turn.
  const initial = createAuction(deck);
  assert.throws(() => placeBid(placeBid(initial, "p2", 3), "p2", 3), errorCode("NOT_YOUR_TURN"));
});
