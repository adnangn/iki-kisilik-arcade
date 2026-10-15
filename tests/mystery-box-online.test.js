import test from 'node:test';
import assert from 'node:assert/strict';
import { createMysteryBoxOnline } from '../js/mystery-box-online.js';
import { createPartyRoom, joinPartyRoom, changePartyRoom } from '../js/party-room-state.js';
const createRoom = () => { let value = createPartyRoom({ code: '123456', uid: 'a', name: 'Ada', createdAt: 42, datasetId: 'futbol', mode: 'mystery-box' }); value = joinPartyRoom(value, 'b', 'Bora'); return changePartyRoom(value, 'a', value.revision, 'start'); };
const snap = value => ({ exists: () => value != null, val: () => value ?? null });
function fake(uid) {
  const listeners = [], values = new Map(), transactions = [], stops = new Set(); let online = true;
  const service = createMysteryBoxOnline({ uid, db: {}, ref: (_db, path) => path, stops,
    assertOnline: () => { if (!online) throw new Error('closed'); },
    get: async path => snap(values.get(path)),
    onValue: (path, receive, error) => { const item = { path, receive, error, active: true }; listeners.push(item); return () => { item.active = false; }; },
    transact: async (path, reduce) => { const value = reduce(values.get(path)); values.set(path, value); transactions.push(path); return value; },
  });
  return { service, values, listeners, transactions, emit(path, value) { values.set(path, value); for (const item of [...listeners]) if (item.active && item.path === path) item.receive(snap(value)); },
    close() { online = false; for (const end of [...stops]) end(); } };
}
const deal = 'privateGames/123456/r1/box/deals/q0', decision = 'privateGames/123456/r1/box/decisions/q0';
test('giver waits for an initial server read before drawing and keeps a reconnect card', () => {
  const env = fake('a'), states = [], stop = env.service.watchMysteryBox(createRoom(), state => states.push(state));
  env.emit(`${decision}/locked`, null); assert.equal(states.at(-1).loaded, false);
  env.emit(deal, null); assert.equal(states.at(-1).loaded, true); assert.equal(states.at(-1).deal, null);
  env.emit(deal, { instance: 42, roundIndex: 0, cardId: 7 }); assert.equal(states.at(-1).deal.cardId, 7);
  const before = states.length; stop(); env.emit(deal, { cardId: 9 }); assert.equal(states.length, before);
});
test('responder subscribes to no private card until its decision lock is confirmed', () => {
  const room = createRoom(), env = fake('b'), states = [];
  env.service.watchMysteryBox(room, state => states.push(state));
  assert.equal(env.listeners.some(item => item.path === deal), false);
  env.emit(decision, null); env.emit(`${decision}/locked`, null);
  assert.equal(states.at(-1).loaded, true); assert.equal(states.at(-1).deal, null);
  env.emit(`${decision}/locked`, true); assert.equal(env.listeners.filter(item => item.path === deal).length, 1);
  env.emit(deal, { cardId: 7 }); env.emit(decision, { decision: 'reject', locked: true });
  assert.deepEqual(states.at(-1).recordsForResolution, { cardId: 7, decision: 'reject' });
  env.emit(`${decision}/locked`, true); assert.equal(env.listeners.filter(item => item.path === deal).length, 1);
});
test('a cold transaction retains a read and never replaces an already committed deal', async () => {
  const room = createRoom(), env = fake('a');
  const pending = env.service.prepareMysteryDeal(room, { cardId: 7 });
  await Promise.resolve(); await Promise.resolve();
  env.emit(deal, null); assert.equal((await pending).cardId, 7);
  assert.equal((await env.service.prepareMysteryDeal(room, { cardId: 9 })).cardId, 7);
  assert.equal(env.transactions.length, 1);
});
test('signing out aborts an unfinished private transaction without writing', async () => {
  const env = fake('b'), room = createRoom();
  const stamped = changePartyRoom(room, 'a', room.revision, 'box-stamp', { stamp: 'gold' });
  const pending = env.service.submitMysteryDecision(stamped, { decision: 'take' });
  const rejected = assert.rejects(pending, /oturumu kapandı/); env.close(); await rejected;
  assert.equal(env.transactions.length, 0);
});
