import test from 'node:test';
import assert from 'node:assert/strict';
import { createPartyRoom, joinPartyRoom, changePartyRoom, encodePartyRoom, decodePartyRoom,
  capturePartyCursor, withPartyCursor, validatePartyRoom } from '../js/party-room-state.js';
const deck = Array.from({ length: 100 }, (_, i) => i + 1);
const room = (mode = 'telepathy', count = 4) => {
  let value = createPartyRoom({ code: '123456', uid: 'u1', name: 'Bir', createdAt: 1000, datasetId: 'futbol', mode });
  for (let i = 2; i <= count; i++) value = joinPartyRoom(value, `u${i}`, `Oyuncu ${i}`);
  return value;
};
const move = (value, uid, command, payload) => changePartyRoom(value, uid, value.revision, command, payload);
test('auction room snapshots retain the private-free consolation deck and restore its gifts on reconnect', () => {
  const completionDeck = Array.from({ length: 10 }, (_, index) => 900001 + index);
  let value = move(room('auction', 2), 'u1', 'start', { deck, completionDeck });
  const original = structuredClone(value), wire = encodePartyRoom(value);
  assert.deepEqual(value, original);
  assert.deepEqual(wire.partyGame.completionIds, Object.fromEntries(completionDeck.map((id, index) => [id, index])));
  assert.deepEqual(decodePartyRoom(wire), original);
  value = move(value, 'u2', 'bid', { amount: 20 });
  while (value.status === 'playing') value = move(value, value.players[value.game.turnSeat].uid, 'pass');
  const restored = decodePartyRoom(JSON.parse(JSON.stringify(encodePartyRoom(value))));
  assert.deepEqual(restored, value);
  assert.equal(restored.game.rosters.p2.filter(entry => entry.source === 'completion').length, 4);
  assert.deepEqual(restored.game.rosters.p2.slice(1).map(entry => entry.id), completionDeck.slice(0, 4));
  assert.equal('completionIds' in restored.game, false);
});
const finished = () => {
  let value = move(room(), 'u1', 'start', { deck });
  for (let i = 0; i < 10; i++) {
    const records = Object.fromEntries(['p1','p2','p3','p4'].map(seat => [seat, { cardId: value.game.deck[i * 4 % value.game.deck.length] }]));
    value = move(value, 'u1', 'party-resolve', { records });
    if (i < 9) value = move(value, 'u2', 'next');
  }
  return value;
};
test('four distinct members join transactionally; capacity and duplicate identity are guarded', () => {
  const value = room(); assert.equal(Object.keys(value.players).length, 4);
  assert.deepEqual(joinPartyRoom(value, 'u2', 'Replacement'), value);
  assert.throws(() => joinPartyRoom(value, 'u5', 'Five'));
  assert.equal(validatePartyRoom(value), value);
});
test('host can start with two or wait for four; chameleon needs three', () => {
  assert.equal(move(room('auction', 2), 'u1', 'start', { deck }).game.seats.length, 2);
  assert.equal(move(room('auction', 4), 'u1', 'start', { deck }).game.seats.length, 4);
  assert.throws(() => move(room('chameleon', 2), 'u1', 'start', { deck }));
  assert.throws(() => move(room(), 'u2', 'start', { deck }));
});
test('wire format keeps party state apart from legacy validators without changing the code', () => {
  const value = move(room(), 'u1', 'start', { deck });
  const wire = encodePartyRoom(value); assert.equal(wire.game, undefined); assert.ok(wire.partyGame);
  assert.deepEqual(decodePartyRoom(wire), value); assert.equal(wire.code, '123456');
  assert.throws(() => joinPartyRoom(wire, 'u5', 'Late'));
});
test('ranking wire stores protected lists and reconstructs compatibility without trusting a matrix', () => {
  let value = move(room('simultaneous-ranking'), 'u1', 'start', { deck });
  assert.deepEqual(decodePartyRoom(encodePartyRoom(value)), value);
  const slots = Object.fromEntries(value.game.deck.map((id, index) => [`s${index + 1}`, id]));
  for (let index = 0; index < 10; index++) {
    const records = Object.fromEntries(value.game.seats.map(seat => [seat, index < 9
      ? { locked: true, count: index + 1, roundIndex: index, stage: 'choosing' }
      : { locked: true, count: 10, roundIndex: 9, stage: 'choosing', slot: 10, slots }]));
    value = move(value, 'u1', 'party-resolve', { records });
  }
  const wire = encodePartyRoom(value);
  assert.equal(wire.partyGame.result, undefined);
  wire.partyGame.result = { mostCompatible: { compatibility: -999 } };
  const decoded = decodePartyRoom(wire);
  assert.deepEqual(decoded, value);
  assert.equal(validatePartyRoom(decoded), decoded);
});
test('free completion metadata is reconstructed from paid and free roster entries', () => {
  let value = move(room('sealed-auction'), 'u1', 'start', { deck });
  for (let index = 0; index < 4; index++) {
    const records = Object.fromEntries(value.game.seats.map((seat, position) => [seat, { amount: index === position ? 20 : 0 }]));
    value = move(value, 'u1', 'party-resolve', { records });
    if (index < 3) value = move(value, 'u1', 'next');
  }
  assert.equal(value.status, 'finished');
  assert.equal(value.game.completionAwards.length, 16);
  const wire = encodePartyRoom(value);
  assert.equal(wire.partyGame.completionAwards, undefined);
  wire.partyGame.completionAwards = [{ id: 99999, seat: 'p1', price: 99999 }];
  assert.deepEqual(decodePartyRoom(wire), value);
});
test('all four approvals are required; own vote cannot be replaced by another member', () => {
  let value = move(finished(), 'u3', 'propose-next', { datasetId: 'tatli', mode: 'sealed-auction' });
  const id = value.nextGame.id;
  for (let i = 1; i <= 3; i++) { value = move(value, `u${i}`, 'ready-next', { id, ready: true, deck }); assert.equal(value.status, 'finished'); }
  value = move(value, 'u4', 'ready-next', { id, ready: true, deck });
  assert.equal(value.mode, 'sealed-auction'); assert.equal(value.round, 2); assert.equal(value.code, '123456');
  assert.equal(value.starterSeat, 'p2'); assert.equal(value.nextGame, undefined);
});
test('changing proposal clears every approval and rejects a late approval of the old proposal', () => {
  let value = move(finished(), 'u1', 'propose-next', { datasetId: 'futbol', mode: 'telepathy' });
  const old = value.nextGame.id; value = move(value, 'u2', 'ready-next', { id: old, ready: true });
  value = move(value, 'u4', 'propose-next', { datasetId: 'tatli', mode: 'simultaneous-ranking' });
  assert.ok(Object.values(value.nextGame.ready).every(ready => !ready));
  assert.throws(() => move(value, 'u3', 'ready-next', { id: old, ready: true }));
  assert.throws(() => move(value, 'u1', 'rematch', { deck }));
});
test('simultaneous approvals rebase across three rivals, but reject own repeated clicks and withdrawals', () => {
  let value = move(finished(), 'u1', 'propose-next', { datasetId: 'futbol', mode: 'telepathy' });
  const cursors = Object.fromEntries([1,2,3,4].map(i => [`u${i}`, capturePartyCursor(value, `u${i}`, 'ready-next')]));
  const payload = { id: value.nextGame.id, ready: true, deck };
  for (let i = 1; i <= 4; i++) value = withPartyCursor(value, `u${i}`, cursors[`u${i}`], payload);
  assert.equal(value.status, 'playing'); assert.equal(value.round, 2);
  assert.throws(() => withPartyCursor(value, 'u1', cursors.u1, payload));
});
test('reused codes, changed rounds, and forged membership cannot replay a captured command', () => {
  const value = move(room('auction', 2), 'u1', 'start', { deck });
  const cursor = capturePartyCursor(value, 'u2', 'pass');
  for (const altered of [{...value, createdAt:1001},{...value,round:2},{...value,players:{...value.players,p2:{uid:'other',name:'Other'}}}])
    assert.throws(() => withPartyCursor(altered, 'u2', cursor, {}));
});
test('party results can switch to legacy solo only when member count fits', () => {
  assert.throws(() => move(finished(), 'u1', 'propose-next', { datasetId:'futbol',mode:'bracket',bracketSize:32 }));
  const waiting = room('bracket', 1); assert.equal(move(waiting, 'u1', 'start', { deck }).game.deck.length, 16);
});
test('a completed duo can invite two extra members for a shared four-person proposal', () => {
  let value = move(room('detective', 2), 'u1', 'start', { deck });
  for (let round = 0; round < 6; round++) {
    const giver = value.game.clueGiverSeat, guesser = value.game.guesserSeat;
    value = move(value, 'u1', 'party-resolve', { records: { [giver]: { word: 'Efsane' } } });
    const targetId = deck[round * 6];
    value = move(value, 'u1', 'party-resolve', { records: { [guesser]: { cardId: targetId } }, secrets: { targetId } });
    if (round < 5) value = move(value, 'u1', 'next');
  }
  value = move(value, 'u2', 'propose-next', { datasetId:'futbol',mode:'auction' });
  value = joinPartyRoom(value, 'u3', 'Three'); value = joinPartyRoom(value, 'u4', 'Four');
  assert.equal(validatePartyRoom(value), value);
  assert.equal(value.game.seats.length, 2); assert.equal(Object.keys(value.players).length, 4);
  assert.ok(Object.values(value.nextGame.ready).every(ready => !ready));
});

test('host can abandon an active table, remove offline seats and reseat surviving members', () => {
  const playing = move(room('telepathy'), 'u1', 'start', { deck });
  const cursor = capturePartyCursor(playing, 'u4', 'party-resolve');
  const reset = move(encodePartyRoom(playing), 'u1', 'reset-table', { removeSeats: ['p2','p3'], datasetId:'tatli',mode:'auction' });
  assert.deepEqual(reset.players, { p1: playing.players.p1, p2: playing.players.p4 });
  assert.equal(reset.status, 'waiting'); assert.equal(reset.round, playing.round+1);
  assert.equal(reset.revision, playing.revision+1); assert.equal(reset.starterSeat, 'p1');
  assert.equal(reset.code, playing.code); assert.equal(reset.createdAt, playing.createdAt); assert.equal(reset.ownerUid, 'u1');
  assert.equal(reset.game, undefined); assert.equal(reset.partyGame, undefined); assert.equal(reset.nextGame, undefined);
  assert.deepEqual(reset.lastAction, {kind:'reset-table',seat:'p1'});
  assert.equal(validatePartyRoom(reset), reset);
  assert.throws(() => withPartyCursor(reset, 'u4', cursor, {}));
  assert.throws(() => move(reset, 'u2', 'start', {deck}));
  assert.deepEqual(move(reset, 'u1', 'start', {deck}).game.seats, ['p1','p2']);
});

test('host resets waiting and finished tables without carrying proposals, cards or private round IDs forward', () => {
  const source = move(finished(), 'u2', 'propose-next', {datasetId:'futbol',mode:'telepathy'});
  const reset = move(source, 'u1', 'reset-table', {removeSeats:['p2','p3','p4'],datasetId:'futbol',mode:'bracket',bracketSize:32});
  assert.equal(reset.nextGame, undefined); assert.equal(reset.game, undefined); assert.equal(reset.bracketSize,32);
  assert.equal(move(reset, 'u1', 'start', {deck}).game.deck.length,32);
  const again = move(reset, 'u1', 'reset-table', {removeSeats:[],datasetId:'tatli',mode:'chameleon'});
  assert.equal(again.round, reset.round+1); assert.equal(again.bracketSize, undefined);
  assert.equal(again.status,'waiting'); assert.throws(() => move(again,'u1','start',{deck}));
});

test('reset refuses nonhosts, owner removal, stale seats, invalid sets and oversubscribed modes', () => {
  const source = room();
  const payload={removeSeats:['p3','p4'],datasetId:'futbol',mode:'auction'};
  assert.throws(() => move(source,'u2','reset-table',payload));
  for(const removeSeats of [undefined,{},['p1'],['p5'],['p2','p2']])
    assert.throws(() => move(source,'u1','reset-table',{...payload,removeSeats}));
  assert.throws(() => move(room('auction',2),'u1','reset-table',{...payload,removeSeats:['p3']}));
  assert.throws(() => move(source,'u1','reset-table',{...payload,datasetId:'unknown'}));
  assert.throws(() => move(source,'u1','reset-table',{...payload,removeSeats:[],mode:'detective'}));
  assert.throws(() => changePartyRoom(source,'u1',source.revision-1,'reset-table',payload));
});

test('all survivor subsets compact in order and all supported v2 modes accept a waiting reset', () => {
  const source=room();
  for(let mask=0;mask<8;mask++){
    const removed=['p2','p3','p4'].filter((_seat,index)=>mask&(1<<index));
    const reset=move(source,'u1','reset-table',{removeSeats:removed,datasetId:'futbol',mode:'telepathy'});
    const expected=Object.entries(source.players).filter(([seat])=>!removed.includes(seat)).map(([,player])=>player.uid);
    assert.deepEqual(Object.values(reset.players).map(player=>player.uid),expected);
    assert.equal(validatePartyRoom(reset),reset);
  }
  for(const mode of ['auction','sealed-auction','simultaneous-ranking','telepathy','detective','chameleon','blind-ranking','bracket','team-draft','frequency','double-ranking']){
    const reset=move(source,'u1','reset-table',{removeSeats:['p3','p4'],datasetId:'futbol',mode,...(mode==='bracket'?{bracketSize:16}:{})});
    assert.equal(validatePartyRoom(reset),reset);
  }
});
