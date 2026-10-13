import test from 'node:test';
import assert from 'node:assert/strict';
import { changeRoom, RoomError } from '../js/room-state.js';
import { captureNextGameCursor, isNextGameCursorCurrent, readyWithNextCursor } from '../js/next-game-command.js';

const HOST = 'owner-uid', GUEST = 'guest-uid';
const deck = Array.from({ length: 40 }, (_, index) => index + 1);
function proposal() {
  let room = changeRoom({ code: '123456', createdAt: 1000, ownerUid: HOST, datasetId: 'futbol', mode: 'auction',
    players: { p1: { uid: HOST, name: 'Ada' }, p2: { uid: GUEST, name: 'Deniz' } },
    status: 'waiting', starterSeat: 'p1', round: 1, revision: 0 }, HOST, 0, 'start', { deck });
  while (room.status === 'playing') room = changeRoom(room, room.players[room.game.turnSeat].uid, room.revision, 'pass');
  return changeRoom(room, HOST, room.revision, 'propose-next', { datasetId: 'yemek-vol1', mode: 'frequency' });
}
const payload = (room, ready = true) => ({ id: room.nextGame.id, ready, deck: [...deck] });
const approve = (room, uid, ready = true) => readyWithNextCursor(room, uid, captureNextGameCursor(room, uid), payload(room, ready));

test('two simultaneous player approvals both commit once, regardless of arrival order', () => {
  for (const [firstUid, secondUid] of [[HOST, GUEST], [GUEST, HOST]]) {
    const room = proposal();
    const firstCursor = captureNextGameCursor(room, firstUid), secondCursor = captureNextGameCursor(room, secondUid);
    const first = readyWithNextCursor(room, firstUid, firstCursor, payload(room));
    assert.equal(first.status, 'finished');
    assert.equal(isNextGameCursorCurrent(first, secondUid, secondCursor), true);
    const started = readyWithNextCursor(first, secondUid, secondCursor, payload(room));
    assert.equal(started.status, 'playing');
    assert.equal(started.mode, 'frequency');
    assert.equal(started.round, 2);
    assert.equal(started.revision, room.revision + 2);
    assert.equal(started.nextGame, undefined);
    assert.throws(() => readyWithNextCursor(started, secondUid, secondCursor, payload(room)), RoomError);
  }
});

test('same-player double clicks and old clicks after a ready/unready cycle cannot replay', () => {
  const room = proposal(), cursor = captureNextGameCursor(room, HOST);
  const first = readyWithNextCursor(room, HOST, cursor, payload(room));
  assert.equal(isNextGameCursorCurrent(first, HOST, cursor), false);
  assert.throws(() => readyWithNextCursor(first, HOST, cursor, payload(room)), RoomError);
  const withdrawn = approve(first, HOST, false);
  assert.equal(withdrawn.nextGame.ready.p1, cursor.ready);
  assert.equal(isNextGameCursorCurrent(withdrawn, HOST, cursor), false);
  assert.throws(() => readyWithNextCursor(withdrawn, HOST, cursor, payload(room)), RoomError);
  const rivalReady = approve(withdrawn, GUEST);
  assert.equal(isNextGameCursorCurrent(rivalReady, HOST, cursor), false);
  assert.equal(approve(rivalReady, HOST).status, 'playing');
});

test('simultaneous approval and withdrawal respect arrival order and never revoke a started game', () => {
  const first = approve(proposal(), HOST);
  const hostCursor = captureNextGameCursor(first, HOST), guestCursor = captureNextGameCursor(first, GUEST);
  const withdrawn = readyWithNextCursor(first, HOST, hostCursor, payload(first, false));
  assert.equal(isNextGameCursorCurrent(withdrawn, GUEST, guestCursor), true);
  const guestReady = readyWithNextCursor(withdrawn, GUEST, guestCursor, payload(first));
  assert.equal(guestReady.status, 'finished');
  assert.deepEqual(guestReady.nextGame.ready, { p1: false, p2: true });
  const started = readyWithNextCursor(first, GUEST, guestCursor, payload(first));
  assert.equal(started.status, 'playing');
  assert.throws(() => readyWithNextCursor(started, HOST, hostCursor, payload(first, false)), RoomError);
});

test('proposal replacement or any configuration change invalidates captured consent', () => {
  const room = proposal(), cursor = captureNextGameCursor(room, HOST);
  for (const config of [{ datasetId: 'film', mode: 'bracket', bracketSize: 32 },
    { datasetId: room.nextGame.datasetId, mode: room.nextGame.mode }]) {
    const changed = changeRoom(room, GUEST, room.revision, 'propose-next', config);
    assert.equal(isNextGameCursorCurrent(changed, HOST, cursor), false);
    assert.throws(() => readyWithNextCursor(changed, HOST, cursor, payload(changed)), RoomError);
  }
  for (const edit of [
    next => { next.nextGame.datasetId = 'film'; },
    next => { next.nextGame.mode = 'double-ranking'; },
    next => { next.nextGame.proposedBySeat = 'p2'; },
    next => { next.nextGame.bracketSize = 32; },
  ]) {
    const changed = structuredClone(room); edit(changed);
    assert.equal(isNextGameCursorCurrent(changed, HOST, cursor), false);
  }
});

test('room identity, actor, finished round and source settings constrain approval retries', () => {
  const room = proposal(), cursor = captureNextGameCursor(room, HOST);
  assert.equal(isNextGameCursorCurrent(null, HOST, cursor), false);
  assert.equal(isNextGameCursorCurrent(room, HOST, null), false);
  assert.equal(isNextGameCursorCurrent(room, HOST, {}), false);
  assert.equal(isNextGameCursorCurrent(room, GUEST, cursor), false);
  for (const edit of [
    next => { next.code = '654321'; },
    next => { next.createdAt = 2000; },
    next => { next.ownerUid = GUEST; },
    next => { next.round += 1; },
    next => { next.status = 'playing'; },
    next => { next.datasetId = 'film'; },
    next => { next.mode = 'bracket'; },
    next => { next.starterSeat = 'p2'; },
    next => { next.bracketSize = 32; },
    next => { next.players.p1.uid = 'replacement'; },
    next => { [next.players.p1, next.players.p2] = [next.players.p2, next.players.p1]; },
  ]) {
    const changed = structuredClone(room); edit(changed);
    assert.equal(isNextGameCursorCurrent(changed, HOST, cursor), false);
    assert.throws(() => readyWithNextCursor(changed, HOST, cursor, payload(changed)), RoomError);
  }
});

test('only one rival readiness revision can be rebased; unrelated or multi-step progress needs a fresh cursor', () => {
  const room = proposal(), cursor = captureNextGameCursor(room, HOST);
  for (const action of [{ kind: 'ready-next', seat: 'p1' }, { kind: 'propose-next', seat: 'p2' },
    { kind: 'ready-next', seat: 'outsider' }, null]) {
    const changed = structuredClone(room); changed.revision += 1; changed.lastAction = action;
    assert.equal(isNextGameCursorCurrent(changed, HOST, cursor), false);
  }
  const rivalReady = approve(room, GUEST), rivalWithdrawn = approve(rivalReady, GUEST, false);
  assert.equal(isNextGameCursorCurrent(rivalWithdrawn, HOST, cursor), false);
  assert.equal(approve(rivalWithdrawn, HOST).nextGame.ready.p1, true);
  const rewound = structuredClone(room); rewound.revision -= 1;
  assert.equal(isNextGameCursorCurrent(rewound, HOST, cursor), false);
});

test('capture and submission retain engine validation of actor, proposal ID, readiness and final setup', () => {
  const room = proposal();
  assert.throws(() => captureNextGameCursor(room, 'outsider'), RoomError);
  assert.throws(() => captureNextGameCursor({ ...room, status: 'playing' }, HOST), RoomError);
  const cursor = captureNextGameCursor(room, HOST);
  assert.throws(() => readyWithNextCursor(room, HOST, cursor, { ...payload(room), id: room.nextGame.id + 1 }), RoomError);
  assert.throws(() => readyWithNextCursor(room, HOST, cursor, { ...payload(room), ready: 'true' }), RoomError);
  const first = approve(room, GUEST);
  assert.throws(() => readyWithNextCursor(first, HOST, cursor, { ...payload(room), deck: [1] }));
  assert.equal(first.status, 'finished');
  assert.equal(first.nextGame.ready.p1, false);
});

test('frozen cursors and transaction retries never mutate proposal or prepared payload', () => {
  const room = proposal(), saved = structuredClone(room);
  const cursor = captureNextGameCursor(room, HOST), prepared = payload(room), savedPayload = structuredClone(prepared);
  assert.equal(Object.isFrozen(cursor), true);
  assert.equal(Object.isFrozen(cursor.config), true);
  assert.throws(() => { cursor.config.mode = 'auction'; }, TypeError);
  const first = readyWithNextCursor(room, HOST, cursor, prepared);
  const retry = readyWithNextCursor(room, HOST, cursor, prepared);
  assert.deepEqual(first, retry);
  assert.deepEqual(room, saved);
  assert.deepEqual(prepared, savedPayload);
  first.nextGame.datasetId = 'film'; first.nextGame.ready.p1 = false;
  assert.deepEqual(room, saved);
  assert.equal(cursor.config.datasetId, 'yemek-vol1');
});
