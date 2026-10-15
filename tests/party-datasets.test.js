import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createPartyGame, changePartyGame, resolvePartyRound, normalizePartyGame,
  partyCards, partyClue, advancePartyRanking } from '../js/party-games.js';
import { playableCollections } from '../js/consolation.js';

const datasets = playableCollections(JSON.parse(readFileSync(new URL('../veri.json', import.meta.url), 'utf8')));
const allSeats = ['p1', 'p2', 'p3', 'p4'];
const records = (game, make) => Object.fromEntries(game.seats.map((seat, index) => [seat, make(seat, index)]));
const fresh = (mode, cards, count) => createPartyGame(mode, { seats: allSeats.slice(0, count), deck: cards.map(card => card.id) });
function finish(game, transform) {
  let count = 0;
  while (game.phase === 'playing') {
    assert.ok(++count <= 500, `${game.mode} must terminate`);
    game = game.stage === 'reveal' ? changePartyGame(game, game.seats[0], 'next') : transform(game);
  }
  assert.deepEqual(normalizePartyGame(game), game);
  return game;
}
function verifyCards(cards, game) {
  const ids = new Set(cards.map(card => card.id));
  assert.ok(game.deck.every(id => ids.has(id)));
  if (game.rosters) {
    const rosterIds = Object.values(game.rosters).flat().map(entry => entry.id);
    assert.ok(rosterIds.every(id => ids.has(id)));
    assert.equal(new Set(rosterIds).size, rosterIds.length);
  }
}

test('every shipped collection supports two, three and four-player auction completion', () => {
  for (const [name, cards] of Object.entries(datasets)) for (const count of [2, 3, 4]) {
    const game = finish(fresh('auction', cards, count), current => {
      const seat = current.turnSeat;
      return current.budgets[seat] === 20 && current.highestBid < 20
        ? changePartyGame(current, seat, 'bid', { amount: 20 }) : changePartyGame(current, seat, 'pass');
    });
    for (const seat of game.seats) assert.equal(game.rosters[seat].length, 5, `${name} / ${count} players / ${seat}`);
    verifyCards(cards, game);
  }
});

test('sealed auctions finish with valid awards in every collection and player count', () => {
  for (const [name, cards] of Object.entries(datasets)) for (const count of [2, 3, 4]) {
    const game = finish(fresh('sealed-auction', cards, count), current => {
      const winner = current.seats.find(seat => current.rosters[seat].length < 5 && current.budgets[seat] > 0);
      return resolvePartyRound(current, records(current, seat => ({ amount: seat === winner ? 1 : 0 })));
    });
    for (const seat of game.seats) assert.equal(game.rosters[seat].length, 5, `${name} / ${seat}`);
    verifyCards(cards, game);
  }
});

test('opaque ten-card rankings finish with both matching and opposite pairs for every collection', () => {
  for (const [name, cards] of Object.entries(datasets)) for (const count of [2, 3, 4]) {
    let game = fresh('simultaneous-ranking', cards, count);
    for (let step = 1; step < 10; step++) game = advancePartyRanking(game, Object.fromEntries(game.seats.map(seat => [seat, step])));
    game = resolvePartyRound(game, records(game, (_, index) => ({ slot: index % 2 ? 1 : 10,
      slots: Object.fromEntries(game.deck.map((id, position) => [`s${index % 2 ? 10 - position : position + 1}`, id])) })));
    assert.equal(game.phase, 'finished', name); assert.equal(game.result.matrix.p1.p2, 0, name);
    if (count >= 3) assert.equal(game.result.matrix.p1.p3, 100, name);
    assert.deepEqual(normalizePartyGame(game), game); verifyCards(cards, game);
  }
});

test('telepathy windows stay distinct through all ten rounds in every actual collection', () => {
  for (const [name, cards] of Object.entries(datasets)) for (const count of [2, 3, 4]) {
    const game = finish(fresh('telepathy', cards, count), current => {
      const visible = partyCards(current); assert.equal(new Set(visible).size, 4, name);
      return resolvePartyRound(current, records(current, () => ({ cardId: visible[0] })));
    });
    assert.equal(game.streak, 10, name); assert.equal(Object.keys(game.results).length, 10, name); verifyCards(cards, game);
  }
});

test('detective targets and dataset-derived demo clues are valid for all six rounds', () => {
  for (const [name, cards] of Object.entries(datasets)) {
    const byId = new Map(cards.map(card => [card.id, card]));
    const game = finish(fresh('detective', cards, 2), current => {
      const visible = partyCards(current); assert.equal(new Set(visible).size, 6, name);
      if (current.stage === 'clue') {
        const word = (byId.get(visible[0]).etiket || 'Efsane').split(/\s+/)[0].slice(0, 24);
        return resolvePartyRound(current, { [current.clueGiverSeat]: { word: partyClue(word) } });
      }
      return resolvePartyRound(current, { [current.guesserSeat]: { cardId: visible[0] } }, { targetId: visible[0] });
    });
    assert.equal(game.scores.p1, 600, name); verifyCards(cards, game);
  }
});

test('three- and four-player chameleon rounds finish against every real nine-card window', () => {
  for (const [name, cards] of Object.entries(datasets)) for (const count of [3, 4]) {
    const game = finish(fresh('chameleon', cards, count), current => {
      const visible = partyCards(current); assert.equal(new Set(visible).size, 9, name);
      const moleSeat = current.seats.at(-1);
      if (current.stage === 'clues') return resolvePartyRound(current, { [current.turnSeat]: { word: 'Nostalji' } });
      if (current.stage === 'voting') return resolvePartyRound(current, records(current, seat => ({ seat: seat === moleSeat ? 'p1' : moleSeat })), { moleSeat });
      return resolvePartyRound(current, { [moleSeat]: { cardId: visible[1] } }, { moleSeat, targetId: visible[0] });
    });
    assert.equal(game.scores.p1, 500, name); assert.equal(game.scores[game.seats.at(-1)], 0, name); verifyCards(cards, game);
  }
});
