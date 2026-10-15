/** Jury privacy checks run exclusively against a local demo RTDB. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { auctionJuryBallot, auctionJuryResult } from '../js/auction-jury.js';

const origin = process.env.DB_EMULATOR_URL || 'http://127.0.0.1:9000';
assert.ok(/^http:\/\/(127\.0\.0\.1|localhost):[0-9]+$/.test(origin), 'Only a local emulator may be used.');
const project = 'demo-iki-kisilik', code = '957741', stamp = Date.now(); let passed = 0;
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
function token(uid) {
  const now = Math.floor(Date.now() / 1000);
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode({ iss: `https://securetoken.google.com/${project}`, aud: project, sub: uid, uid, user_id: uid, iat: now, exp: now + 3600, auth_time: now, firebase: { identities: {}, sign_in_provider: 'anonymous' } })}.`;
}
async function request(path, { uid = 'p1', admin = false, method = 'GET', value } = {}) {
  const url = new URL(`${path}.json`, origin + '/'); url.searchParams.set('ns', project); if (!admin) url.searchParams.set('auth', token(uid));
  const response = await fetch(url, { method, headers: { ...(admin ? { Authorization: 'Bearer owner' } : {}), ...(value !== undefined ? { 'Content-Type': 'application/json' } : {}) },
    ...(value !== undefined ? { body: JSON.stringify(value) } : {}), signal: AbortSignal.timeout(path === '.settings/rules' ? 120000 : 30000) });
  return { status: response.status, value: await response.json() };
}
const ok = response => { assert.equal(response.status, 200, JSON.stringify(response.value)); return response.value; };
const denied = response => assert.ok([401, 403].includes(response.status), JSON.stringify(response));
const put = (path, value, uid = 'p1') => request(path, { method: 'PUT', value, uid });
const admin = (path, value) => request(path, { method: value === undefined ? 'DELETE' : 'PUT', value, admin: true }).then(ok);
async function check(label, action) { await action(); passed++; console.log('PASS', label); }
function fixture(count = 4, mode = 'auction') {
  const seats = ['p1', 'p2', 'p3', 'p4'].slice(0, count);
  return { version: 2, code, createdAt: stamp, round: 7, mode, status: 'finished', ownerUid: 'p1', datasetId: 'futbol', starterSeat: 'p1', revision: 10,
    players: Object.fromEntries(seats.map(seat => [seat, { uid: seat, name: seat }])),
    game: { mode, phase: 'finished', seats, budgets: Object.fromEntries(seats.map(seat => [seat, 0])) } };
}
async function seed(room) {
  await admin(`privateGames/${code}`);
  const wire = { ...room, partyGame: room.game }; delete wire.game;
  await admin(`rooms/${code}`, wire); await admin(`cleanupIndex/${code}`, { instance: room.createdAt, state: 'reserved', reserverUid: 'p1', lastActivityAt: stamp });
}
const path = room => `privateGames/${code}/r${room.round}/jury`;
try {
  if (!process.env.JURY_SKIP_RULES_LOAD) {
    const rules = await readFile(process.env.DB_RULES_FILE || new URL('../firebase.rules.json', import.meta.url), 'utf8');
    assert.ok(Buffer.byteLength(rules) <= 256 * 1024); ok(await request('.settings/rules', { admin: true, method: 'PUT', value: JSON.parse(rules) }));
  }
  await check('every supported auction count keeps jury ballots private until every vote locks', async () => {
    for (const mode of ['auction', 'sealed-auction']) for (const count of [2, 3, 4]) {
      const room = fixture(count, mode); await seed(room); const base = path(room), records = {};
      assert.equal(ok(await request(`${base}/p1`)), null);
      denied(await request(base)); denied(await request(`${base}/p2`));
      assert.equal(ok(await request(`${base}/p2/locked`)), null);
      denied(await request(`${base}/p2/locked`, { uid: 'stranger' }));
      for (const [index, seat] of room.game.seats.entries()) {
        records[seat] = auctionJuryBallot(room, seat, { targetSeat: index % 2 ? 'p1' : 'p2' });
        ok(await put(`${base}/${seat}`, records[seat], seat));
        assert.equal(ok(await request(`${base}/${seat}/locked`)), true);
        assert.deepEqual(ok(await request(`${base}/${seat}`, { uid: seat })), records[seat]);
        if (index < count - 1) {
          const other = seat === 'p1' ? 'p2' : 'p1';
          denied(await request(`${base}/${seat}`, { uid: other }));
          denied(await request(`${base}/${seat}/targetSeat`, { uid: other })); denied(await request(base));
        }
      }
      assert.deepEqual(ok(await request(base, { uid: room.game.seats.at(-1) })), records);
      assert.ok(auctionJuryResult(room.game.seats, records, stamp));
      denied(await request(base, { uid: 'stranger' }));
    }
  });
  await check('wrong actor, target, instance, phase, fields and deletion cannot forge a ballot', async () => {
    const room = fixture(2); await seed(room); const base = path(room), vote = auctionJuryBallot(room, 'p1', { targetSeat: 'p1' });
    denied(await put(`${base}/p2`, vote)); denied(await put(`${base}/p1`, vote, 'stranger'));
    for (const invalid of [{ ...vote, targetSeat: 'p3' }, { ...vote, instance: stamp + 1 }, { ...vote, locked: false }, { ...vote, extra: true }, { instance: stamp, locked: true }, { targetSeat: 'p1', locked: true }, { instance: stamp, targetSeat: 'p1' }]) denied(await put(`${base}/p1`, invalid));
    denied(await put(`privateGames/${code}/r8/jury/p1`, vote));
    ok(await put(`${base}/p1`, vote)); denied(await put(`${base}/p1`, { ...vote, targetSeat: 'p2' })); denied(await put(`${base}/p1`, null));
    await admin(`rooms/${code}/status`, 'playing'); denied(await put(`${base}/p2`, vote, 'p2')); denied(await request(`${base}/p1`));
  });
  await check('late spectators cannot participate or read choices even after results open', async () => {
    const room = fixture(2); room.players.p3 = { uid: 'late', name: 'Late' }; await seed(room); const base = path(room);
    denied(await request(`${base}/p1/locked`, { uid: 'late' }));
    denied(await put(`${base}/p3`, { instance: stamp, targetSeat: 'p1', locked: true }, 'late'));
    for (const seat of room.game.seats) ok(await put(`${base}/${seat}`, auctionJuryBallot(room, seat, { targetSeat: seat }), seat));
    denied(await request(base, { uid: 'late' })); denied(await request(`${base}/p1`, { uid: 'late' }));
  });
  await check('new rounds, recovered tables and reused room codes revoke old votes and results', async () => {
    for (const mutation of [
      async () => admin(`rooms/${code}/round`, 8),
      async () => { await admin(`rooms/${code}/status`, 'waiting'); await admin(`rooms/${code}/partyGame`); },
      async () => admin(`rooms/${code}/createdAt`, stamp + 1),
      async () => admin(`cleanupIndex/${code}/state`, 'deleting'),
    ]) {
      const room = fixture(2); await seed(room); const base = path(room);
      for (const seat of room.game.seats) ok(await put(`${base}/${seat}`, auctionJuryBallot(room, seat, { targetSeat: 'p1' }), seat));
      assert.equal(ok(await request(`${base}/p2/targetSeat`)), 'p1'); await mutation();
      denied(await request(base)); denied(await request(`${base}/p1`)); denied(await request(`${base}/p1/locked`));
      denied(await put(`${base}/p1`, auctionJuryBallot(room, 'p1', { targetSeat: 'p2' })));
    }
  });
  await check('removed participants lose all jury access immediately', async () => {
    const room = fixture(2); await seed(room); const base = path(room);
    for (const seat of room.game.seats) ok(await put(`${base}/${seat}`, auctionJuryBallot(room, seat, { targetSeat: 'p1' }), seat));
    await admin(`rooms/${code}/players/p2`);
    denied(await request(base, { uid: 'p2' })); denied(await request(`${base}/p1/locked`, { uid: 'p2' })); denied(await request(`${base}/p2`, { uid: 'p2' }));
  });
  console.log(`Auction jury emulator: ${passed} checks passed.`);
} finally {
  for (const branch of ['rooms', 'privateGames', 'cleanupIndex']) await admin(`${branch}/${code}`);
}
