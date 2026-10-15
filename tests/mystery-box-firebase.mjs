import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createPartyRoom, joinPartyRoom, changePartyRoom, encodePartyRoom, decodePartyRoom } from '../js/party-room-state.js';
import { mysteryDecision } from '../js/mystery-box-online.js';
import { mysteryChoices } from '../js/mystery-box.js';
const origin = process.env.DB_EMULATOR_URL || 'http://127.0.0.1:9000';
assert.match(origin, /^http:\/\/(127\.0\.0\.1|localhost):[0-9]+$/);
const code = '958101', project = 'demo-iki-kisilik', instance = Date.now();
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
const token = uid => { const now = Math.floor(Date.now() / 1000); return `${encode({ alg: 'none', typ: 'JWT' })}.${encode({ iss: `https://securetoken.google.com/${project}`, aud: project, sub: uid, uid, user_id: uid, iat: now, exp: now + 3600, auth_time: now, firebase: { identities: {}, sign_in_provider: 'anonymous' } })}.`; };
async function req(path, { uid = 'a', method = 'GET', value, admin = false, headers = {} } = {}) {
  const url = new URL(`${path}.json`, origin); url.searchParams.set('ns', project); if (!admin) url.searchParams.set('auth', token(uid));
  const response = await fetch(url, { method, headers: { ...headers, ...(admin ? { Authorization: 'Bearer owner' } : {}), ...(value !== undefined ? { 'Content-Type': 'application/json' } : {}) }, ...(value !== undefined ? { body: JSON.stringify(value) } : {}), signal: AbortSignal.timeout(path === '.settings/rules' ? 120000 : 30000) });
  return { status: response.status, value: await response.json(), etag: response.headers.get('etag') };
}
const ok = response => { assert.equal(response.status, 200, JSON.stringify(response.value).slice(0, 800)); return response.value; };
const denied = response => assert.ok([401, 403].includes(response.status), JSON.stringify(response).slice(0, 800));
const put = (path, value, uid = 'a', extra = {}) => req(path, { method: 'PUT', value, uid, ...extra });
const write = async (room, uid = 'a', extra) => decodePartyRoom(ok(await put(`rooms/${code}`, encodePartyRoom(room), uid, extra)));
const base = room => `privateGames/${code}/r${room.round}/box`;
const dealPath = room => `${base(room)}/deals/q${room.game.roundIndex}`;
const decisionPath = room => `${base(room)}/decisions/q${room.game.roundIndex}`;
const user = (room, seat) => room.players[seat].uid;
let count = 0;
async function check(label, fn) { await fn(); count++; console.log('PASS', label); }
async function clean() { for (const branch of ['rooms', 'privateGames', 'presence', 'reactions', 'cleanupIndex']) ok(await req(`${branch}/${code}`, { admin: true, method: 'DELETE' })); }
try {
  await check('mystery rules compile under 256 KiB', async () => { const raw = await readFile(new URL('../firebase.rules.json', import.meta.url), 'utf8'); assert.ok(Buffer.byteLength(raw) <= 262144); ok(await req('.settings/rules', { admin: true, method: 'PUT', value: JSON.parse(raw) })); });
  await clean();
  let room;
  await check('two players can create join and start a box room without a public deck', async () => {
    ok(await put(`cleanupIndex/${code}`, { instance, lastActivityAt: instance, state: 'reserved', reserverUid: 'a' }, 'a', { admin: true }));
    room = await write(createPartyRoom({ code, uid: 'a', name: 'Ada', createdAt: instance, datasetId: 'futbol', mode: 'mystery-box' }));
    const soloStart = { ...room, status: 'playing', revision: room.revision + 1, lastAction: { kind: 'start', seat: 'p1' } };
    denied(await put(`rooms/${code}`, soloStart));
    room = await write(joinPartyRoom(room, 'b', 'Bora'), 'b');
    const candidate = changePartyRoom(room, 'a', room.revision, 'start');
    for (const mutate of [g => g.counts.p1 = 1, g => g.deck = [1], g => g.targetId = 42, g => g.giverSeat = 'p2', g => delete g.counts.p2, g => g.roundIndex = 1]) {
      const forged = encodePartyRoom(structuredClone(candidate)); mutate(forged.boxGame); denied(await put(`rooms/${code}`, forged));
    }
    room = await write(candidate); assert.equal(room.game.stage, 'stamp');
    const publicState = ok(await req(`rooms/${code}`, { uid: 'b' })); assert.ok(!JSON.stringify(publicState).includes('cardId'));
    const third = structuredClone(encodePartyRoom(room)); third.players.p3 = { uid: 'c', name: 'C' }; third.revision++; third.lastAction = { kind: 'join', seat: 'p3' }; denied(await put(`rooms/${code}`, third, 'c'));
  });
  await check('only the current giver can draw an immutable private card and only they can read it', async () => {
    const value = { instance, roundIndex: 0, cardId: 1 };
    denied(await put(dealPath(room), value, 'b')); denied(await put(dealPath(room), value, 'stranger'));
    denied(await put(dealPath(room).replace('/q0', '/q1'), { ...value, roundIndex: 1 }));
    denied(await put(dealPath(room), { ...value, future: [2, 3] })); denied(await put(dealPath(room), { ...value, instance: instance - 1 }));
    ok(await put(dealPath(room), value)); assert.equal(ok(await req(dealPath(room))).cardId, 1);
    denied(await req(dealPath(room), { uid: 'b' })); denied(await req(`${dealPath(room)}/cardId`, { uid: 'b' }));
    denied(await req(base(room), { uid: 'b' })); denied(await put(dealPath(room), { ...value, cardId: 2 }));
    denied(await req(dealPath(room), { uid: 'stranger' }));
    assert.equal(ok(await req(`${decisionPath(room)}/locked`, { uid: 'b' })), null);
  });
  await check('stamps bind to the giver and current phase without revealing the card', async () => {
    const stamped = changePartyRoom(room, 'a', room.revision, 'box-stamp', { stamp: 'gold' });
    denied(await put(`rooms/${code}`, { ...encodePartyRoom(stamped), lastAction: { kind: 'box-stamp', seat: 'p2' } }, 'b'));
    room = await write(stamped); denied(await req(dealPath(room), { uid: 'b' }));
    const reveal = changePartyRoom(room, 'a', room.revision, 'box-resolve', { cardId: 1, decision: 'take' });
    denied(await put(`rooms/${code}`, encodePartyRoom(reveal)));
  });
  await check('a decision can only be locked once by its responder; only then does the card unlock', async () => {
    const value = mysteryDecision(room, 'b', { decision: 'take' });
    denied(await put(decisionPath(room), value)); denied(await put(decisionPath(room), { ...value, decision: 'evil' }, 'b'));
    denied(await put(decisionPath(room), { ...value, instance: instance - 1 }, 'b'));
    ok(await put(decisionPath(room), value, 'b')); denied(await put(decisionPath(room), { ...value, decision: 'reject' }, 'b'));
    assert.equal(ok(await req(`${decisionPath(room)}/locked`)), true);
    assert.equal(ok(await req(dealPath(room), { uid: 'b' })).cardId, 1);
    assert.equal(ok(await req(decisionPath(room))).decision, 'take');
    denied(await req(dealPath(room), { uid: 'stranger' }));
  });
  await check('public result must match the private card and locked decision, and commits only once', async () => {
    const candidate = changePartyRoom(room, 'a', room.revision, 'box-resolve', { cardId: 1, decision: 'take' });
    for (const mutate of [g => g.results.r1.cardId = 2, g => g.results.r1.decision = 'reject', g => g.results.r1.ownerSeat = 'p1', g => g.results.r1.stamp = 'trash', g => g.counts.p2 = 2, g => g.stage = 'finished']) {
      const forged = encodePartyRoom(structuredClone(candidate)); mutate(forged.boxGame); denied(await put(`rooms/${code}`, forged));
    }
    const snapshot = await req(`rooms/${code}`, { headers: { 'X-Firebase-ETag': 'true' } }); ok(snapshot);
    room = await write(candidate, 'a', { headers: { 'if-match': snapshot.etag } });
    assert.equal((await put(`rooms/${code}`, encodePartyRoom(candidate), 'b', { headers: { 'if-match': snapshot.etag } })).status, 412);
    assert.equal(room.game.counts.p2, 1);
  });
  await check('each next box changes roles and revokes old secret paths', async () => {
    const oldDeal = dealPath(room), candidate = changePartyRoom(room, 'a', room.revision, 'box-next');
    room = await write(candidate); assert.equal(room.game.giverSeat, 'p2');
    denied(await req(oldDeal)); denied(await put(dealPath(room), { instance, roundIndex: 1, cardId: 2 }));
    denied(await put(dealPath(room), { instance, roundIndex: 1, cardId: 1 }, 'b'));
  });
  await check('all ten rounds complete while forged history and full-roster decisions are denied', async () => {
    while (room.status === 'playing') {
      if (room.game.stage === 'reveal') { room = await write(changePartyRoom(room, 'a', room.revision, 'box-next')); continue; }
      const giver = user(room, room.game.giverSeat), responder = user(room, room.game.responderSeat), cardId = room.game.roundIndex + 1;
      ok(await put(dealPath(room), { instance, roundIndex: room.game.roundIndex, cardId }, giver));
      room = await write(changePartyRoom(room, giver, room.revision, 'box-stamp', { stamp: 'risk' }), giver);
      const choices = mysteryChoices(room.game), decision = choices.includes(room.game.responderSeat === 'p2' ? 'take' : 'reject') ? room.game.responderSeat === 'p2' ? 'take' : 'reject' : choices[0];
      if (choices.length === 1) denied(await put(decisionPath(room), { instance, roundIndex: room.game.roundIndex, decision: choices[0] === 'take' ? 'reject' : 'take', locked: true }, responder));
      ok(await put(decisionPath(room), mysteryDecision(room, responder, { decision }), responder));
      const candidate = changePartyRoom(room, giver, room.revision, 'box-resolve', { cardId, decision });
      if (room.game.roundIndex > 1) {
        const forged = encodePartyRoom(structuredClone(candidate)); delete forged.boxGame.results.r1; denied(await put(`rooms/${code}`, forged, giver));
      }
      room = await write(candidate, giver);
    }
    assert.deepEqual(room.game.counts, { p1: 5, p2: 5 }); assert.equal(Object.keys(room.game.results).length, 10);
  });
  await check('reconnect retains the same state; rematch rotates opener into a fresh private namespace', async () => {
    assert.deepEqual(decodePartyRoom(ok(await req(`rooms/${code}`, { uid: 'b' }))), room);
    const old = `${base(room)}/deals/q9`; room = await write(changePartyRoom(room, 'a', room.revision, 'rematch'));
    assert.equal(room.game.giverSeat, 'p2'); assert.equal(room.round, 2); denied(await req(old, { uid: 'b' }));
    ok(await put(dealPath(room), { instance, roundIndex: 0, cardId: 900001 }, 'b'));
  });
  await check('owner reset and both-ready same-room changes support entering and leaving box mode', async () => {
    room = await write(changePartyRoom(room, 'a', room.revision, 'reset-table', { mode: 'auction', datasetId: 'futbol', removeSeats: [] }));
    assert.equal(room.boxGame, undefined); assert.equal(room.game, undefined);
    room = await write(changePartyRoom(room, 'a', room.revision, 'start', { deck: Array.from({ length: 20 }, (_, i) => i + 1) }));
    while (room.status === 'playing') room = await write(changePartyRoom(room, user(room, room.game.turnSeat), room.revision, 'pass'), user(room, room.game.turnSeat));
    room = await write(changePartyRoom(room, 'a', room.revision, 'propose-next', { datasetId: 'futbol', mode: 'mystery-box' }));
    const id = room.nextGame.id;
    room = await write(changePartyRoom(room, 'a', room.revision, 'ready-next', { id, ready: true }));
    room = await write(changePartyRoom(room, 'b', room.revision, 'ready-next', { id, ready: true }), 'b');
    assert.equal(room.mode, 'mystery-box'); assert.equal(room.game.stage, 'stamp');
    const reset = changePartyRoom(room, 'a', room.revision, 'reset-table', { mode: 'mystery-box', datasetId: 'futbol', removeSeats: ['p2'] });
    denied(await put(`rooms/${code}`, { ...encodePartyRoom(reset), lastAction: { kind: 'reset-table', seat: 'p2' } }, 'b'));
    room = await write(reset); assert.equal(room.status, 'waiting'); assert.equal(room.players.p2, undefined);
  });
  console.log(`${count} mystery-box Firebase checks passed.`);
} finally { await clean(); }
