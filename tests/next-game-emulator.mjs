/** Only named fixtures in the local demo RTDB; never production Firebase. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { changeRoom } from '../js/room-state.js';
import { createAuction, passTurn } from '../js/auction.js';
import { createBlindRanking, placeBlindCard } from '../js/blind-ranking.js';
import { createBracket, chooseBracketCard } from '../js/bracket.js';
import { createTeamDraft, assignTeamCard } from '../js/team-draft.js';
import { createCooperative, revealFrequency, advanceFrequency, revealDoubleRanking } from '../js/cooperative.js';
import { draftTriplets } from '../js/game-setup.js';
import { DATASET_GROUPS } from '../js/datasets.js';
import { playableCollections } from '../js/consolation.js';

const ORIGIN = process.env.DB_EMULATOR_URL || 'http://127.0.0.1:9000', PROJECT = 'demo-iki-kisilik';
assert.ok(/^http:\/\/(127\.0\.0\.1|localhost):[0-9]+$/.test(ORIGIN), 'Only a local emulator is permitted.');
const CODES = ['946001', '946002', '946003'];
const DATASETS = playableCollections(JSON.parse(await readFile(new URL('../veri.json', import.meta.url), 'utf8')));
const MODES = ['auction', 'blind-ranking', 'bracket', 'team-draft', 'frequency', 'double-ranking'];
const DECK = DATASETS.futbol.map(card => card.id);
const TRIPLETS = draftTriplets(DATASETS.futbol, length => length - 1);
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
const now = Date.now();
let passed = 0;
function token(uid) {
  const seconds = Math.floor(Date.now() / 1000);
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode({ iss: `https://securetoken.google.com/${PROJECT}`, aud: PROJECT, sub: uid, uid, user_id: uid, iat: seconds, exp: seconds + 3600, auth_time: seconds, firebase: { identities: {}, sign_in_provider: 'anonymous' } })}.`;
}
async function request(node, { method = 'GET', uid = 'p1', admin = false, value, headers = {} } = {}) {
  const url = new URL(`${node}.json`, ORIGIN + '/');
  assert.equal(url.origin, ORIGIN); url.searchParams.set('ns', PROJECT);
  if (!admin) url.searchParams.set('auth', token(uid));
  const result = await fetch(url, { method, headers: { ...headers, ...(admin ? { Authorization: 'Bearer owner' } : {}), ...(value !== undefined ? { 'Content-Type': 'application/json' } : {}) }, ...(value !== undefined ? { body: JSON.stringify(value) } : {}), signal: AbortSignal.timeout(20000) });
  return { status: result.status, value: await result.json(), etag: result.headers.get('etag') };
}
const ok = result => { assert.equal(result.status, 200, JSON.stringify(result.value).slice(0, 500)); return result.value; };
const denied = result => assert.ok([401, 403].includes(result.status), JSON.stringify(result).slice(0, 500));
const put = (node, value, uid = 'p1', headers = {}) => request(node, { method: 'PUT', value, uid, headers });
const write = (room, uid = 'p1', headers = {}) => put(`rooms/${room.code}`, room, uid, headers);
async function check(label, action) { try { await action(); passed++; console.log('PASS', label); } catch (error) { throw new Error(`${label}: ${error.message}`, { cause: error }); } }

function finishedGame(mode, solo = false) {
  if (mode === 'auction') { let game = createAuction(DECK); while (game.phase !== 'finished') game = passTurn(game, game.turnSeat); return game; }
  if (mode === 'blind-ranking') { let game = createBlindRanking(DECK); for (let slot = 1; slot <= 10; slot++) game = placeBlindCard(game, 'p1', slot); return game; }
  if (mode === 'bracket') { let game = createBracket(DECK); while (game.phase !== 'finished') game = chooseBracketCard(game, 'p1', game.currentPair.left); return game; }
  if (mode === 'team-draft') { let game = createTeamDraft(TRIPLETS); for (const seat of ['p1', 'p2']) for (let round = 0; round < 11; round++) for (const [index, role] of ['start', 'bench', 'cut'].entries()) game = assignTeamCard(game, seat, role, game.triplets[round].cards[index]); return game; }
  if (mode === 'frequency') { let game = createCooperative(mode, DECK); while (game.phase !== 'finished') { const cardId = game.deck[game.roundIndex * 2]; game = revealFrequency(game, { p1: cardId, p2: cardId }); if (game.phase !== 'finished') game = advanceFrequency(game); } return game; }
  const slots = Object.fromEntries(DECK.slice(0, 8).map((id, index) => [`s${index + 1}`, id]));
  return revealDoubleRanking(createCooperative(mode, DECK), { p1: slots, p2: slots });
}
function finishedRoom(mode = 'blind-ranking', code = CODES[0], solo = false) {
  return { version: 1, code, createdAt: now, ownerUid: 'p1', datasetId: 'futbol', mode, ...(mode === 'bracket' ? { bracketSize: 16 } : {}), round: 1, starterSeat: 'p1', revision: 40, status: 'finished', players: { p1: { uid: 'p1', name: 'Ada' }, ...(!solo ? { p2: { uid: 'p2', name: 'Efe' } } : {}) }, game: finishedGame(mode), lastAction: { kind: mode === 'blind-ranking' ? 'rank' : mode === 'bracket' ? 'choose' : mode === 'team-draft' ? 'assign' : mode === 'frequency' ? 'frequency-reveal' : mode === 'double-ranking' ? 'double-reveal' : 'pass', seat: 'p1' } };
}
async function seed(room) {
  ok(await request(`rooms/${room.code}`, { method: 'PUT', value: room, admin: true }));
  ok(await request(`cleanupIndex/${room.code}`, { method: 'PUT', value: { instance: room.createdAt, lastActivityAt: now, state: 'active' }, admin: true }));
  // Completed cooperative records remain verifiable while proposing a new game.
  if (room.mode === 'double-ranking') for (const seat of ['p1', 'p2']) ok(await request(`privateGames/${room.code}/r1/ranking/${seat}`, { method: 'PUT', admin: true, value: { slots: room.game.rankings[seat], count: 8 } }));
  return ok(await request(`rooms/${room.code}`));
}
const propose = (room, config, uid = 'p1') => changeRoom(room, uid, room.revision, 'propose-next', config);
const ready = (room, uid, value = true, payload = {}) => changeRoom(room, uid, room.revision, 'ready-next', { id: room.nextGame.id, ready: value, deck: DECK, triplets: TRIPLETS, ...payload });
async function cleanup() { for (const code of CODES) for (const root of ['rooms', 'privateGames', 'presence', 'reactions', 'cleanupIndex']) ok(await request(`${root}/${code}`, { method: 'DELETE', admin: true })); }

try {
  await check('new approval rules compile below the Firebase source-size limit', async () => {
    const source = await readFile(process.env.DB_RULES_FILE || new URL('../firebase.rules.json', import.meta.url), 'utf8'); assert.ok(Buffer.byteLength(source) <= 256 * 1024);
    ok(await request('.settings/rules', { method: 'PUT', admin: true, value: JSON.parse(source) }));
  });
  await cleanup();
  await check('all 36 source/target mode pairs keep the room and start a fresh approved round', async () => {
    for (const source of MODES) for (const target of MODES) {
      let room = await seed(finishedRoom(source));
      room = ok(await write(propose(room, { datasetId: 'futbol', mode: target, ...(target === 'bracket' ? { bracketSize: 32 } : {}) }), 'p1'));
      const before = structuredClone(room.game), id = room.nextGame.id;
      room = ok(await write(ready(room, 'p2'), 'p2')); assert.deepEqual(room.game, before); assert.equal(room.status, 'finished');
      room = ok(await write(ready(room, 'p1'), 'p1'));
      assert.equal(room.status, 'playing'); assert.equal(room.mode, target); assert.equal(room.round, 2); assert.equal(room.starterSeat, 'p2');
      assert.equal(room.code, CODES[0]); assert.equal(room.createdAt, now); assert.equal(room.ownerUid, 'p1'); assert.equal(room.nextGame, undefined); assert.equal(room.lastAction.kind, 'next-game');
      assert.equal(room.bracketSize, target === 'bracket' ? 32 : undefined); assert.ok(room.revision > id);
      assert.deepEqual(ok(await request(`rooms/${room.code}`, { uid: 'p2' })), room);
    }
  });
  await check('both members can propose every currently selectable category', async () => {
    let room = await seed(finishedRoom());
    const sets = Object.values(DATASET_GROUPS).flatMap(group => group.sets);
    for (const [index, set] of sets.entries()) { const uid = index % 2 ? 'p2' : 'p1'; room = ok(await write(propose(room, { datasetId: set.id, mode: 'blind-ranking' }, uid), uid)); assert.equal(room.nextGame.datasetId, set.id); }
  });
  let proposed;
  await check('new selections reset both approvals and preserve completed results', async () => {
    let room = await seed(finishedRoom());
    room = ok(await write(propose(room, { datasetId: 'film', mode: 'frequency' })));
    room = ok(await write(ready(room, 'p1'))); const priorId = room.nextGame.id;
    proposed = ok(await write(propose(room, { datasetId: 'yemek-vol1', mode: 'bracket', bracketSize: 16 }, 'p2'), 'p2'));
    assert.ok(proposed.nextGame.id > priorId); assert.deepEqual(proposed.nextGame.ready, { p1: false, p2: false }); assert.equal(proposed.mode, 'blind-ranking'); assert.deepEqual(proposed.game, room.game);
  });
  await check('a third person, forged actor, foreign player or altered room instance cannot propose', async () => {
    const next = propose(proposed, { datasetId: 'dizi', mode: 'frequency' });
    denied(await write(next, 'stranger'));
    for (const mutate of [room => { room.lastAction.seat = 'p2'; }, room => { room.players.p2.uid = 'stranger'; }, room => { room.createdAt++; }, room => { room.code = CODES[1]; }, room => { room.ownerUid = 'p2'; }]) { const forged = structuredClone(next); mutate(forged); denied(await put(`rooms/${CODES[0]}`, forged)); }
  });
  await check('proposal metadata, category, mode, bracket size and forged initial readiness are validated', async () => {
    const next = propose(proposed, { datasetId: 'film', mode: 'bracket', bracketSize: 32 });
    for (const mutate of [room => { room.nextGame.id--; }, room => { room.nextGame.datasetId = 'unknown'; }, room => { room.nextGame.datasetId = 'oyun-evreni'; }, room => { room.nextGame.mode = 'unknown'; }, room => { room.nextGame.bracketSize = 64; }, room => { room.nextGame.ready.p1 = true; }, room => { room.nextGame.proposedBySeat = 'p2'; }, room => { room.nextGame.extra = 1; }, room => { room.nextGame.ready.extra = false; }, room => { delete room.nextGame.ready.p2; }]) { const forged = structuredClone(next); mutate(forged); denied(await write(forged)); }
    for (const datasetId of ['ankara-ilceleri', 'valorant-ajanlari']) { const forged = structuredClone(next); forged.nextGame.datasetId = datasetId; denied(await write(forged)); }
  });
  await check('finished game results are frozen for every mode during proposal and readiness', async () => {
    for (const mode of MODES) {
      const room = await seed(finishedRoom(mode, CODES[1])); const next = propose(room, { datasetId: 'film', mode: 'frequency' });
      const mutations = [value => { if (value.game.deck) value.game.deck[0] = 99999; else value.game.triplets[0].cards[0] = 99999; }, value => { delete value.game.phase; }];
      if (mode === 'auction') mutations.push(value => { value.game.budgets.p1++; }, value => { delete value.game.rosters.p1[4]; });
      if (mode === 'blind-ranking') mutations.push(value => { value.game.slots.s1 = value.game.slots.s2; }, value => { delete value.game.slots.s1; });
      if (mode === 'bracket') mutations.push(value => { value.game.choices.m1 = value.game.choices.m2; }, value => { delete value.game.choices.m1; });
      if (mode === 'team-draft') mutations.push(value => { value.game.players.p1.selections.r1.start = value.game.players.p1.selections.r1.bench; }, value => { delete value.game.players.p2.selections.r11; });
      if (mode === 'frequency') mutations.push(value => { value.game.score++; }, value => { delete value.game.results.r1; });
      if (mode === 'double-ranking') mutations.push(value => { [value.game.result.differences[0], value.game.result.differences[1]] = [value.game.result.differences[1], value.game.result.differences[0]]; }, value => { value.game.rankings.p1.s1 = value.game.rankings.p1.s2; });
      for (const mutate of mutations) { const forged = structuredClone(next); mutate(forged); denied(await write(forged)); }
      const stored = ok(await write(next)); const approved = ready(stored, 'p1');
      for (const mutate of mutations) { const forged = structuredClone(approved); mutate(forged); denied(await write(forged)); }
      ok(await write(approved));
    }
  });
  await check('readiness can change only the caller seat and never revise its proposal or current config', async () => {
    const next = ready(proposed, 'p1');
    for (const mutate of [room => { room.nextGame.ready.p2 = true; }, room => { room.nextGame.datasetId = 'film'; }, room => { room.nextGame.bracketSize = 32; }, room => { room.nextGame.id++; }, room => { room.mode = 'bracket'; }, room => { room.datasetId = 'film'; }, room => { room.round++; }, room => { room.nextGame.ready.p1 = 'yes'; }, room => { room.nextGame.ready.p1 = false; }]) { const forged = structuredClone(next); mutate(forged); denied(await write(forged)); }
    proposed = ok(await write(next));
    proposed = ok(await write(ready(proposed, 'p1', false))); assert.equal(proposed.nextGame.ready.p1, false);
  });
  await check('pending approvals cannot be bypassed with rematch, metadata deletion or early next-game', async () => {
    const without = { ...proposed }; delete without.nextGame;
    const rematch = changeRoom(without, 'p1', without.revision, 'rematch', { deck: DECK }); denied(await write(rematch));
    const early = { ...rematch, lastAction: { kind: 'next-game', seat: 'p1' } }; denied(await write(early));
    const erased = { ...proposed, revision: proposed.revision + 1, lastAction: { kind: 'ready-next', seat: 'p1' } }; delete erased.nextGame; denied(await write(erased));
  });
  await check('the final approval must use the exact approved config and a fresh initial game', async () => {
    proposed = ok(await write(ready(proposed, 'p1'))); const next = ready(proposed, 'p2');
    for (const mutate of [room => { room.datasetId = 'film'; }, room => { room.bracketSize = 32; }, room => { room.starterSeat = 'p1'; }, room => { room.round++; }, room => { room.game.matchIndex = 1; }, room => { room.game.deck[1] = room.game.deck[0]; }, room => { room.nextGame = proposed.nextGame; }]) { const forged = structuredClone(next); mutate(forged); denied(await write(forged, 'p2')); }
    ok(await write(next, 'p2')); denied(await write({ ...next, revision: next.revision + 1 }, 'p2'));
  });
  await check('simultaneous approvals preserve each seat and cannot start two new rounds', async () => {
    let room = await seed(finishedRoom('blind-ranking', CODES[2])); room = ok(await write(propose(room, { datasetId: 'futbol', mode: 'frequency' })));
    const snapshot = await request(`rooms/${room.code}`, { headers: { 'X-Firebase-ETag': 'true' } });
    const results = await Promise.all(['p1', 'p2'].map(uid => write(ready(room, uid), uid, { 'if-match': snapshot.etag })));
    assert.deepEqual(results.map(result => result.status).sort(), [200, 412]);
    room = ok(await request(`rooms/${room.code}`)); const loser = room.nextGame.ready.p1 ? 'p2' : 'p1';
    room = ok(await write(ready(room, loser), loser)); assert.equal(room.round, 2); assert.equal(room.game.score, 0);
  });
  await check('solo optional games can switch without a viewer; two-player targets wait for one', async () => {
    let room = await seed(finishedRoom('blind-ranking', CODES[2], true));
    room = ok(await write(propose(room, { datasetId: 'film', mode: 'bracket', bracketSize: 32 })));
    room = ok(await write(ready(room, 'p1'))); assert.equal(room.round, 2); assert.equal(room.starterSeat, 'p1');
    room = await seed(finishedRoom('bracket', CODES[2], true)); room = ok(await write(propose(room, { datasetId: 'futbol', mode: 'frequency' })));
    room = ok(await write(ready(room, 'p1'))); assert.equal(room.status, 'finished');
    const forced = { ...room, status: 'playing', round: 2, game: createCooperative('frequency', DECK), datasetId: 'futbol', mode: 'frequency', revision: room.revision + 1, lastAction: { kind: 'next-game', seat: 'p1' } }; delete forced.nextGame; delete forced.bracketSize; denied(await write(forced));
    ok(await put(`rooms/${room.code}/players/p2`, { uid: 'p2', name: 'Efe' }, 'p2'));
    room = ok(await request(`rooms/${room.code}`)); room = ok(await write(ready(room, 'p2'), 'p2')); assert.equal(room.status, 'playing'); assert.equal(room.starterSeat, 'p2');
  });
  await check('new private rounds hide opponent choices and reject previous-round writes', async () => {
    let room = await seed(finishedRoom('frequency', CODES[2]));
    ok(await request(`privateGames/${room.code}/r1/frequency/q0/p1`, { method: 'PUT', admin: true, value: { cardId: DECK[0], locked: true } }));
    room = ok(await write(propose(room, { datasetId: 'futbol', mode: 'double-ranking' })));
    room = ok(await write(ready(room, 'p1'))); room = ok(await write(ready(room, 'p2'), 'p2'));
    denied(await put(`privateGames/${room.code}/r1/frequency/q0/p2`, { cardId: DECK[0], locked: true }, 'p2'));
    const path = `privateGames/${room.code}/r2/ranking`;
    ok(await put(`${path}/p1`, { count: 1, slots: { s1: DECK[0] } }));
    denied(await request(`${path}/p1`, { uid: 'p2' })); denied(await request(`${path}/p2`, { uid: 'p1' })); denied(await request(`${path}/p1`, { uid: 'stranger' }));
    assert.equal(ok(await request(`${path}/p1/count`, { uid: 'p2' })), 1);
  });
  await check('playing matches and rooms locked for cleanup cannot accept a proposal', async () => {
    let room = await seed(finishedRoom()); const next = propose(room, { datasetId: 'film', mode: 'frequency' });
    ok(await request(`rooms/${room.code}/status`, { method: 'PUT', admin: true, value: 'playing' })); denied(await write(next));
    await seed(room); ok(await request(`cleanupIndex/${room.code}/state`, { method: 'PUT', admin: true, value: 'deleting' })); denied(await write(next));
  });
  console.log(`Same-room next game integration: ${passed} checks passed, 0 skipped.`);
} finally { await cleanup(); }
