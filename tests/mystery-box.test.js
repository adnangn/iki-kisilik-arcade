import test from 'node:test';
import assert from 'node:assert/strict';
import { createMysteryBox, changeMysteryBox, normalizeMysteryBox, mysteryChoices, mysteryRosters, assertMysteryCards } from '../js/mystery-box.js';
import { mysteryDecision, mysteryPrivateContext } from '../js/mystery-box-online.js';
import { createPartyRoom, joinPartyRoom, changePartyRoom, encodePartyRoom, decodePartyRoom, modeLimits, capturePartyCursor, withPartyCursor } from '../js/party-room-state.js';
const waiting = () => joinPartyRoom(createPartyRoom({ code: '123456', uid: 'a', name: 'Ada', createdAt: 100, datasetId: 'futbol', mode: 'mystery-box' }), 'b', 'Bora');
const started = () => { const room = waiting(); return changePartyRoom(room, 'a', room.revision, 'start'); };
const complete = (game, choose) => {
  for (let index = 0; index < 10; index++) {
    if (index) game = changeMysteryBox(game, 'p1', 'box-next');
    game = changeMysteryBox(game, game.giverSeat, 'box-stamp', { stamp: ['gold', 'risk', 'trash'][index % 3] });
    game = changeMysteryBox(game, game.responderSeat, 'box-resolve', { cardId: index + 1, decision: choose(game, index) });
    assert.deepEqual(normalizeMysteryBox(JSON.parse(JSON.stringify(game))), game);
  }
  return game;
};
test('mystery box has no public card, deck, seed, or future draw in its wire state', () => {
  const room = started(), wire = encodePartyRoom(room);
  assert.ok(wire.boxGame); assert.equal(wire.game, undefined); assert.equal(wire.partyGame, undefined);
  assert.equal(JSON.stringify(wire).includes('cardId'), false);
  assert.equal(JSON.stringify(wire).includes('deck'), false);
  assert.deepEqual(decodePartyRoom(wire), room); assert.deepEqual(modeLimits('mystery-box'), { min: 2, max: 2 });
});
test('all 1024 accept/reject preferences terminate with exactly five unique cards each', () => {
  for (let choices = 0; choices < 1024; choices++) {
    const result = complete(createMysteryBox(choices % 2 ? 'p1' : 'p2'), (game, index) => {
      const preferred = choices & (1 << index) ? 'take' : 'reject';
      return mysteryChoices(game).includes(preferred) ? preferred : mysteryChoices(game)[0];
    });
    assert.equal(result.phase, 'finished'); assert.equal(result.stage, 'finished');
    assert.deepEqual(result.counts, { p1: 5, p2: 5 });
    assert.equal(new Set(Object.values(mysteryRosters(result)).flat().map(card => card.id)).size, 10);
  }
});
test('wrong role, phase, stamp, duplicate card, and overfilled owner are rejected', () => {
  const initial = createMysteryBox(); assert.throws(() => changeMysteryBox(initial, 'p2', 'box-stamp', { stamp: 'gold' }));
  assert.throws(() => changeMysteryBox(initial, 'p1', 'box-stamp', { stamp: 'fake' }));
  assert.throws(() => changeMysteryBox(initial, 'p1', 'box-next'));
  let game = initial;
  for (let index = 0; index < 5; index++) {
    if (index) game = changeMysteryBox(game, 'p1', 'box-next');
    game = changeMysteryBox(game, game.giverSeat, 'box-stamp', { stamp: 'gold' });
    game = changeMysteryBox(game, 'p1', 'box-resolve', { cardId: index + 1, decision: game.responderSeat === 'p1' ? 'take' : 'reject' });
  }
  game = changeMysteryBox(game, 'p1', 'box-next'); game = changeMysteryBox(game, game.giverSeat, 'box-stamp', { stamp: 'risk' });
  assert.throws(() => changeMysteryBox(game, 'p1', 'box-resolve', { cardId: 6, decision: 'take' }));
  assert.throws(() => changeMysteryBox(game, 'p1', 'box-resolve', { cardId: 1, decision: 'reject' }));
});
test('private decisions and transactions are scoped to exact role, room instance, and round', () => {
  const room = started();
  assert.throws(() => mysteryDecision(room, 'b', { decision: 'take' }));
  const stamped = changePartyRoom(room, 'a', room.revision, 'box-stamp', { stamp: 'gold' });
  assert.throws(() => mysteryDecision(stamped, 'a', { decision: 'take' }));
  assert.deepEqual(mysteryDecision(stamped, 'b', { decision: 'take' }), { instance: 100, roundIndex: 0, decision: 'take', locked: true });
  assert.equal(mysteryPrivateContext(stamped, 'a').deal, 'privateGames/123456/r1/box/deals/q0');
  const cursor = capturePartyCursor(stamped, 'a', 'box-resolve');
  const revealed = withPartyCursor(stamped, 'a', cursor, { cardId: 1, decision: 'take' });
  assert.throws(() => withPartyCursor(revealed, 'a', cursor, { cardId: 1, decision: 'take' }));
});
test('canonical replay rejects modified history, counts, roles, stages, and public secrets', () => {
  const game = complete(createMysteryBox(), current => mysteryChoices(current)[0]);
  for (const mutate of [g => g.counts.p1 = 0, g => g.results.r1.cardId = 3, g => g.results.r1.ownerSeat = 'p3', g => delete g.results.r4,
    g => g.stage = 'stamp', g => g.giverSeat = 'p3', g => g.targetId = 42, g => g.deck = [1, 2]]) {
    const forged = structuredClone(game); mutate(forged); assert.throws(() => normalizeMysteryBox(forged));
  }
  const empty = createMysteryBox(); delete empty.results; assert.deepEqual(normalizeMysteryBox(empty), createMysteryBox());
});
test('rematch swaps the opening giver and table reset discards prior secrets namespace', () => {
  const room = started(); room.game = complete(room.game, current => mysteryChoices(current)[0]); room.status = 'finished';
  const replay = changePartyRoom(room, 'a', room.revision, 'rematch');
  assert.equal(replay.starterSeat, 'p2'); assert.equal(replay.game.giverSeat, 'p2'); assert.equal(replay.round, 2);
  assert.equal(mysteryPrivateContext(replay, 'a').deal, 'privateGames/123456/r2/box/deals/q0');
  const reset = changePartyRoom(replay, 'a', replay.revision, 'reset-table', { datasetId: 'futbol', mode: 'mystery-box', removeSeats: ['p2'] });
  assert.equal(reset.game, undefined); assert.equal(reset.status, 'waiting'); assert.equal(reset.round, 3);
  assert.throws(() => changePartyRoom(reset, 'a', reset.revision, 'start'));
});

test('online content checks accept a deckless box and only its revealed collection cards', () => {
  assert.deepEqual(assertMysteryCards(createMysteryBox(), []), createMysteryBox());
  const finished = complete(createMysteryBox(), current => mysteryChoices(current)[0]);
  const cards = Array.from({ length: 10 }, (_, index) => ({ id: index + 1 }));
  assert.equal(assertMysteryCards(finished, cards).phase, 'finished');
  assert.throws(() => assertMysteryCards(finished, cards.slice(1)), /koleksiyonla uyuşmuyor/);
});
