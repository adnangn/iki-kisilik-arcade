import test from 'node:test';
import assert from 'node:assert/strict';
import { changeRoom, RoomError } from '../js/room-state.js';
import { captureTeamCursor, isTeamCursorCurrent, assignWithTeamCursor } from '../js/team-command.js';

const HOST = 'owner-uid';
const GUEST = 'guest-uid';
const triplets = Array.from({ length: 11 }, (_, index) => ({
  etiket: 'FV', cards: index === 10 ? [1, 2, 3] : [index * 3 + 1, index * 3 + 2, index * 3 + 3],
}));
function playingRoom() {
  return changeRoom({ code: '123456', createdAt: 1000, ownerUid: HOST,
    datasetId: 'futbol', mode: 'team-draft',
    players: { p1: { uid: HOST, name: 'Ada' }, p2: { uid: GUEST, name: 'Deniz' } },
    status: 'waiting', starterSeat: 'p1', round: 1, revision: 0,
  }, HOST, 0, 'start', { triplets });
}
function completePlayer(room, uid, roundCount = 11) {
  let next = room;
  const seat = uid === HOST ? 'p1' : 'p2';
  while (next.game.players[seat].roundIndex < roundCount) {
    const cards = next.game.triplets[next.game.players[seat].roundIndex].cards;
    for (const [index, role] of ['start', 'bench', 'cut'].entries()) {
      next = changeRoom(next, uid, next.revision, 'assign', { role, cardId: cards[index] });
    }
  }
  return next;
}

test('two players captured from one snapshot may both assign after the other commits', () => {
  const room = playingRoom();
  const hostCursor = captureTeamCursor(room, HOST);
  const guestCursor = captureTeamCursor(room, GUEST);
  const afterHost = assignWithTeamCursor(room, HOST, hostCursor, { role: 'start', cardId: 1 });
  assert.equal(isTeamCursorCurrent(afterHost, GUEST, guestCursor), true);
  const afterBoth = assignWithTeamCursor(afterHost, GUEST, guestCursor, { role: 'start', cardId: 2 });
  assert.deepEqual(afterBoth.game.players.p1.pending, { start: 1 });
  assert.deepEqual(afterBoth.game.players.p2.pending, { start: 2 });
  assert.equal(afterBoth.revision, room.revision + 2);
  assert.equal(afterBoth.game.assignmentCount, 2);
  const afterGuest = assignWithTeamCursor(room, GUEST, guestCursor, { role: 'start', cardId: 2 });
  const reverseOrder = assignWithTeamCursor(afterGuest, HOST, hostCursor, { role: 'start', cardId: 1 });
  assert.deepEqual(reverseOrder.game.players, afterBoth.game.players);
});

test('a player cursor remains valid while the opponent completes all eleven rounds', () => {
  const before = playingRoom();
  const cursor = captureTeamCursor(before, GUEST);
  const afterHost = completePlayer(before, HOST);
  assert.equal(afterHost.game.players.p1.done, true);
  assert.equal(afterHost.revision, before.revision + 33);
  assert.equal(isTeamCursorCurrent(afterHost, GUEST, cursor), true);
  const after = assignWithTeamCursor(afterHost, GUEST, cursor, { role: 'bench', cardId: 3 });
  assert.equal(after.game.players.p2.roundIndex, 0);
  assert.deepEqual(after.game.players.p2.pending, { bench: 3 });
  assert.deepEqual(after.game.players.p1, afterHost.game.players.p1);
});

test('a second command from the same player snapshot is stale even for a different free role', () => {
  const room = playingRoom();
  const cursor = captureTeamCursor(room, HOST);
  const after = assignWithTeamCursor(room, HOST, cursor, { role: 'start', cardId: 1 });
  assert.equal(isTeamCursorCurrent(after, HOST, cursor), false);
  assert.throws(() => assignWithTeamCursor(after, HOST, cursor, { role: 'bench', cardId: 2 }), RoomError);
  const fresh = captureTeamCursor(after, HOST);
  const next = assignWithTeamCursor(after, HOST, fresh, { role: 'bench', cardId: 2 });
  assert.deepEqual(next.game.players.p1.pending, { start: 1, bench: 2 });
});

test('an old assignment never reaches a later round with the same three reused card IDs', () => {
  const room = playingRoom();
  const cursor = captureTeamCursor(room, HOST);
  const later = completePlayer(room, HOST, 10);
  assert.deepEqual(later.game.triplets[later.game.players.p1.roundIndex], cursor.triple);
  assert.deepEqual(later.game.players.p1.pending, cursor.pending);
  assert.equal(isTeamCursorCurrent(later, HOST, cursor), false);
  assert.throws(() => assignWithTeamCursor(later, HOST, cursor, { role: 'start', cardId: 1 }), RoomError);
  assert.equal(later.game.players.p1.roundIndex, 10);
  assert.deepEqual(later.game.players.p1.pending, {});
});

test('an old cursor cannot be reused in a rematch whose player state and cards reset identically', () => {
  const room = playingRoom();
  const cursor = captureTeamCursor(room, HOST);
  const finished = completePlayer(completePlayer(room, HOST), GUEST);
  const rematch = changeRoom(finished, GUEST, finished.revision, 'rematch', { triplets });
  assert.equal(rematch.code, room.code); assert.equal(rematch.game.players.p1.roundIndex, 0);
  assert.deepEqual(rematch.game.players.p1.pending, cursor.pending);
  assert.deepEqual(rematch.game.triplets[0], cursor.triple);
  assert.equal(isTeamCursorCurrent(rematch, HOST, cursor), false);
  assert.throws(() => assignWithTeamCursor(rematch, HOST, cursor, { role: 'start', cardId: 1 }), RoomError);
});

test('room identity, creation, collection, actor membership and current triple constrain the cursor', () => {
  const room = playingRoom();
  const cursor = captureTeamCursor(room, HOST);
  assert.equal(isTeamCursorCurrent(null, HOST, cursor), false);
  assert.equal(isTeamCursorCurrent(room, HOST, null), false);
  assert.equal(isTeamCursorCurrent(room, HOST, {}), false);
  const edits = [
    next => { next.code = '654321'; },
    next => { next.createdAt = 2000; },
    next => { next.datasetId = 'superlig'; },
    next => { next.ownerUid = GUEST; },
    next => { next.mode = 'auction'; },
    next => { next.status = 'waiting'; },
    next => { next.players.p1.uid = 'replacement'; },
    next => { [next.players.p1, next.players.p2] = [next.players.p2, next.players.p1]; },
    next => { next.game.triplets[0].cards.reverse(); },
  ];
  for (const edit of edits) {
    const next = structuredClone(room); edit(next);
    assert.equal(isTeamCursorCurrent(next, HOST, cursor), false);
    assert.throws(() => assignWithTeamCursor(next, HOST, cursor, { role: 'start', cardId: 1 }), RoomError);
  }
  assert.equal(isTeamCursorCurrent(room, GUEST, cursor), false);
  assert.throws(() => assignWithTeamCursor(room, GUEST, cursor, { role: 'start', cardId: 1 }), RoomError);
});

test('cursor comparison tolerates Firebase empty maps and role property order', () => {
  const room = playingRoom();
  const cursor = captureTeamCursor(room, HOST);
  const omitted = structuredClone(room);
  delete omitted.game.players.p1.pending; delete omitted.game.players.p1.selections;
  assert.equal(isTeamCursorCurrent(omitted, HOST, cursor), true);
  assert.equal(assignWithTeamCursor(omitted, HOST, cursor, { role: 'start', cardId: 1 }).game.players.p1.pending.start, 1);
  let next = changeRoom(room, HOST, room.revision, 'assign', { role: 'start', cardId: 1 });
  next = changeRoom(next, HOST, next.revision, 'assign', { role: 'bench', cardId: 2 });
  const pendingCursor = captureTeamCursor(next, HOST);
  next.game.players.p1.pending = { bench: 2, start: 1 };
  assert.equal(isTeamCursorCurrent(next, HOST, pendingCursor), true);
});

test('cursor rebase retains engine role locks, outsider rejection and completed player rejection', () => {
  const room = playingRoom();
  assert.throws(() => captureTeamCursor(room, 'stranger'), RoomError);
  const cursor = captureTeamCursor(room, HOST);
  assert.throws(() => assignWithTeamCursor(room, HOST, cursor, { role: 'start', cardId: 4 }),
    error => error.code === 'INVALID_CARD');
  const after = assignWithTeamCursor(room, HOST, cursor, { role: 'start', cardId: 1 });
  const fresh = captureTeamCursor(after, HOST);
  assert.throws(() => assignWithTeamCursor(after, HOST, fresh, { role: 'start', cardId: 2 }),
    error => error.code === 'ROLE_OCCUPIED');
  const finishedPlayer = completePlayer(room, HOST);
  assert.throws(() => captureTeamCursor(finishedPlayer, HOST), RoomError);
  assert.equal(isTeamCursorCurrent(finishedPlayer, HOST, cursor), false);
});

test('cursor snapshots are frozen and successful retries leave every input untouched', () => {
  const room = playingRoom();
  const saved = structuredClone(room);
  const cursor = captureTeamCursor(room, HOST);
  assert.equal(Object.isFrozen(cursor), true); assert.equal(Object.isFrozen(cursor.pending), true);
  assert.equal(Object.isFrozen(cursor.triple.cards), true);
  assert.throws(() => { cursor.pending.start = 99; }, TypeError);
  const first = assignWithTeamCursor(room, HOST, cursor, { role: 'start', cardId: 1 });
  const retry = assignWithTeamCursor(room, HOST, cursor, { role: 'start', cardId: 1 });
  assert.deepEqual(first, retry); assert.deepEqual(room, saved);
  first.game.triplets[0].cards[0] = 99; first.game.players.p1.pending.start = 99;
  assert.equal(cursor.triple.cards[0], 1); assert.deepEqual(cursor.pending, {});
  assert.deepEqual(room, saved);
});
