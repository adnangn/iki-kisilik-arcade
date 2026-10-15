import test from 'node:test';
import assert from 'node:assert/strict';
import { createFeedbackState, feedbackAction, feedbackMarker, feedbackScope, nextFeedback } from '../js/move-feedback.js';
import { FEEDBACK_TEXT_CATALOG } from '../js/text-catalog-feedback.js';

function harness() {
  let now = 0, serial = 0;
  const timers = new Map(), changes = [];
  const state = createFeedbackState({
    onChange: value => changes.push(value),
    setTimer: (callback, delay) => { const id = ++serial; timers.set(id, { callback, at: now + delay }); return id; },
    clearTimer: id => timers.delete(id)
  });
  return { state, changes, timers,
    tick(ms) {
      now += ms;
      for (const [id, timer] of timers) if (timer.at <= now) { timers.delete(id); timer.callback(); }
    }
  };
}
const pending = { scope: '0:123456:100', round: 1, revision: 4, action: { type: 'bid' }, marker: 'card-one' };
const roomFor = (mode = 'auction') => ({
  code: '123456', createdAt: 100, round: 1, revision: 4, mode, status: 'playing',
  players: { p1: { name: 'Ada' }, p2: { name: 'Can' } },
  game: { stage: mode === 'auction' ? 'bidding' : 'choosing', roundIndex: 0, deckIndex: 0, turnSeat: mode === 'auction' ? 'p1' : undefined }
});
const receiptFor = (room, action) => ({ marker: feedbackMarker(room), revision: room.revision, action });

test('a pending move is acknowledged immediately and stays pending during a slow network', () => {
  const { state, changes, tick } = harness();
  state.begin(pending);
  assert.equal(changes.length, 1);
  assert.equal(changes[0].phase, 'pending');
  tick(2999); assert.equal(state.value.slow, false);
  tick(1); assert.equal(state.value.phase, 'pending'); assert.equal(state.value.slow, true);
  tick(20000); assert.equal(changes.length, 2);
});

test('success requires an explicit ACK and cancels the slow timer', () => {
  const { state, tick, timers } = harness();
  const token = state.begin(pending);
  assert.equal(state.settle(token, true, pending), true);
  assert.equal(state.value.phase, 'success'); assert.equal(timers.size, 0);
  tick(3000); assert.equal(state.value.slow, false);
});

test('failed writes show failure and cannot later become success through a duplicate settlement', () => {
  const { state, tick } = harness(), token = state.begin(pending);
  assert.equal(state.settle(token, false, pending), true);
  assert.equal(state.value.phase, 'error');
  assert.equal(state.settle(token, true, pending), false);
  tick(5000); assert.equal(state.value.phase, 'error');
});

test('leaving, logout or a different room invalidates in-flight receipts', () => {
  for (const changed of [{ ...pending, scope: '0:654321:100' }, { ...pending, scope: '1:123456:100' }]) {
    const { state } = harness(), token = state.begin(pending);
    state.sync(changed); assert.equal(state.value.phase, 'idle');
    assert.equal(state.settle(token, true, changed), false);
  }
  const { state, timers } = harness(), token = state.begin(pending);
  state.reset(); assert.equal(timers.size, 0);
  assert.equal(state.settle(token, true, pending), false);
});

test('a callback from an earlier command cannot replace a newer receipt', () => {
  const { state } = harness();
  const first = state.begin(pending), second = state.begin({ ...pending, action: { type: 'pass' } });
  assert.equal(state.settle(first, false, pending), false);
  assert.equal(state.value.token, second); assert.equal(state.value.action.type, 'pass');
});

test('rematch snapshots arriving before ACK preserve pending feedback, then a later round clears it', () => {
  const { state } = harness(), token = state.begin(pending), roundTwo = { ...pending, round: 2 };
  state.sync(roundTwo); assert.equal(state.value.phase, 'pending');
  assert.equal(state.settle(token, true, roundTwo), true); assert.equal(state.value.round, 2);
  state.sync(roundTwo); assert.equal(state.value.phase, 'success');
  state.sync({ ...roundTwo, round: 3 }); assert.equal(state.value.phase, 'idle');
});

test('room scope distinguishes reused codes and sessions', () => {
  const room = roomFor();
  assert.notEqual(feedbackScope(room), feedbackScope({ ...room, createdAt: 101 }));
  assert.notEqual(feedbackScope(room, 1), feedbackScope(room, 2));
  assert.notEqual(feedbackScope(null), feedbackScope(room));
});

test('a bid ACK preceding its value snapshot does not falsely announce the old turn', () => {
  const room = roomFor(), receipt = receiptFor(room, { type: 'bid' });
  assert.equal(nextFeedback(receipt, { room, mySeat: 'p1' }).key, 'feedback.next.confirmed');
  const updated = structuredClone(room); updated.revision++; updated.game.turnSeat = 'p2';
  assert.deepEqual(nextFeedback(receipt, { room: updated, mySeat: 'p1' }), { key: 'feedback.next.player_turn', params: { player: 'Can' } });
});

test('private selection feedback never reads or exposes a rival choice or hidden role', () => {
  const room = roomFor('telepathy'), receipt = receiptFor(room, { type: 'lock', private: true });
  const context = { room, mySeat: 'p1', mine: { locked: true, cardId: 42 }, privateState: {
    get rival() { throw new Error('Rival private data must not be accessed'); },
    get targetId() { throw new Error('Target must not be accessed'); }
  } };
  assert.deepEqual(nextFeedback(receipt, context), { key: 'feedback.next.locked' });
  const reveal = structuredClone(room); reveal.game.stage = 'reveal';
  assert.equal(nextFeedback(receipt, { ...context, room: reveal }).key, 'feedback.next.reveal');
  const next = structuredClone(room); next.game.roundIndex++;
  assert.equal(nextFeedback(receipt, { ...context, room: next, mine: null }).key, 'feedback.next.continue');
});

test('public role changes, finished games and independent drafts use the appropriate next instruction', () => {
  const room = roomFor('detective'); room.game.stage = 'guess'; room.game.guesserSeat = 'p2';
  const receipt = { ...receiptFor(room, { type: 'clue', private: true }), marker: 'previous clue stage' };
  assert.deepEqual(nextFeedback(receipt, { room, mySeat: 'p1' }), { key: 'feedback.next.player_turn', params: { player: 'Can' } });
  room.status = 'finished'; assert.equal(nextFeedback(receipt, { room }).key, 'feedback.next.finished');
  const draft = roomFor('team-draft'); draft.game.players = { p1: { done: true } };
  assert.equal(nextFeedback(receipt, { room: draft, mySeat: 'p1' }).key, 'feedback.next.locked');
});

test('all command classifications have editable pending and success copy', () => {
  const cases = [
    ['bid-button', 'auction', null, 'bid'], ['party-pass', 'auction', null, 'pass'],
    ['party-lock', 'sealed-auction', 'sealed', 'lock'], ['party-lock', 'detective', 'clue', 'clue'],
    ['party-lock', 'chameleon', 'vote', 'vote'], ['party-lock', 'telepathy', 'choose', 'lock'],
    ['rank-slot-2', 'blind-ranking', null, 'selection'], ['draft-start', 'team-draft', null, 'selection'],
    ['double-slot-3', 'double-ranking', null, 'lock'], ['frequency-card-2', 'frequency', null, 'lock'],
    ['party-next', 'sealed-auction', 'next', 'next'], ['session-button', null, null, 'generic']
  ];
  for (const [id, mode, kind, expected] of cases) {
    const action = feedbackAction(id, { mode }, kind);
    assert.equal(action.type, expected);
    assert.ok(FEEDBACK_TEXT_CATALOG[`feedback.pending.${action.type}`]);
    assert.ok(FEEDBACK_TEXT_CATALOG[`feedback.success.${action.type}`]);
  }
  assert.equal(feedbackAction('bracket-left', { mode: 'bracket' }).type, 'selection');
  assert.equal(feedbackAction(null, { mode: 'bracket' }, 'choose').private, false);
});
