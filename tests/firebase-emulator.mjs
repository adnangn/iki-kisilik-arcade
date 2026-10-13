/**
 * Explicit integration check: node tests/firebase-emulator.mjs
 * Start the Realtime Database emulator at 127.0.0.1:9000 first.
 * This script is deliberately restricted to a local demo project. It uploads
 * repository rules and touches only the named test rooms below.
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { changeRoom, seatFor } from '../js/room-state.js';
import { captureTeamCursor, isTeamCursorCurrent, assignWithTeamCursor } from '../js/team-command.js';
import { draftTriplets } from '../js/game-setup.js';

const ORIGIN = 'http://127.0.0.1:9000';
const PROJECT = 'demo-iki-kisilik';
const TEST_CODES = ['918001', '918002', '918003', '918004', '918005', '918006', '918007', '918008', '918009'];
const DATASETS = JSON.parse(await readFile(new URL('../veri.json', import.meta.url), 'utf8'));
const DECK = DATASETS.superlig.map(card => card.id);
const BLIND_DECK = DATASETS.futbol.slice(0, 10).map(card => card.id);
const BRACKET_DECK = DATASETS.futbol.slice(0, 16).map(card => card.id);
const TEAM_POOL = Object.values(Object.groupBy(DATASETS.futbol, card => card.etiket)).sort((a, b) => b.length - a.length)[0];
const TEAM_TRIPLETS = Array.from({ length: 11 }, (_, round) => ({
  etiket: TEAM_POOL[0].etiket,
  cards: Array.from({ length: 3 }, (_, index) => TEAM_POOL[(round * 3 + index) % TEAM_POOL.length].id),
}));
const TIMESTAMP = { '.sv': 'timestamp' };
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
let passed = 0;
let skipped = 0;

function emulatorToken(uid) {
  const now = Math.floor(Date.now() / 1000);
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode({
    iss: `https://securetoken.google.com/${PROJECT}`,
    aud: PROJECT,
    sub: uid,
    uid,
    user_id: uid,
    iat: now,
    exp: now + 3600,
    auth_time: now,
    firebase: { identities: {}, sign_in_provider: 'anonymous' },
  })}.`;
}

const tokens = Object.fromEntries(['p1', 'p2', 'stranger'].map(uid => [uid, emulatorToken(uid)]));

async function request(path, { method = 'GET', uid, admin = false, value, headers = {} } = {}) {
  const url = new URL(`${path}.json`, `${ORIGIN}/`);
  assert.equal(url.origin, ORIGIN, 'Only the local emulator may be accessed.');
  url.searchParams.set('ns', PROJECT);
  const authorization = admin ? 'owner' : null;
  // RTDB REST takes Firebase ID tokens in ?auth=. A bearer token is treated
  // as an OAuth credential and does not exercise client Security Rules here.
  if (uid && !admin) url.searchParams.set('auth', tokens[uid]);
  const response = await fetch(url, {
    method,
    headers: {
      ...(authorization ? { Authorization: `Bearer ${authorization}` } : {}),
      ...(value !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    ...(value !== undefined ? { body: JSON.stringify(value) } : {}),
    signal: AbortSignal.timeout(20000),
  });
  const text = await response.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: response.status, body, etag: response.headers.get('etag') };
}

function expectStatus(response, expected, detail = '') {
  assert.equal(response.status, expected,
    `${detail} HTTP ${response.status}: ${JSON.stringify(response.body).slice(0, 1000)}`);
  return response.body;
}

function expectDenied(response, detail = '') {
  assert.ok(response.status === 401 || response.status === 403,
    `${detail} expected permission denial, received HTTP ${response.status}: ${JSON.stringify(response.body).slice(0, 1000)}`);
}

async function check(label, action) {
  try {
    const result = await action();
    passed += 1;
    console.log(`PASS ${label}`);
    return result;
  } catch (error) {
    throw new Error(`${label}: ${error.message}`, { cause: error });
  }
}

function initialRoom(code, datasetId = 'futbol', mode = 'auction') {
  return {
    version: 1,
    code,
    ownerUid: 'p1',
    createdAt: TIMESTAMP,
    datasetId,
    mode,
    status: 'waiting',
    round: 1,
    starterSeat: 'p1',
    revision: 0,
    players: { p1: { uid: 'p1', name: 'Alice' } },
  };
}

async function readRoom(code, uid = 'p1', headers = {}) {
  return request(`rooms/${code}`, { uid, headers });
}

async function writeRoom(room, uid, headers = {}) {
  if (room.createdAt?.['.sv'] === 'timestamp') {
    const current = await request(`rooms/${room.code}`, { admin: true });
    if (!current.body) await request(`cleanupIndex/${room.code}`, { method: 'DELETE', admin: true });
    const reservation = await request(`cleanupIndex/${room.code}`, { method: 'PUT', uid, value: { instance: TIMESTAMP, lastActivityAt: TIMESTAMP, state: 'reserved', reserverUid: uid } });
    if (reservation.status === 200) room = { ...room, createdAt: reservation.body.instance };
  }
  return request(`rooms/${room.code}`, { method: 'PUT', uid, value: room, headers });
}

async function join(code) {
  const current = expectStatus(await readRoom(code, 'p2'), 200, 'Read open waiting room');
  const joined = {
    ...current,
    revision: current.revision + 1,
    players: { ...current.players, p2: { uid: 'p2', name: 'Bob' } },
  };
  return expectStatus(await writeRoom(joined, 'p2'), 200, 'Join Bob');
}

async function joinSpectator(code, uid = 'p2') {
  return expectStatus(await request(`rooms/${code}/players/p2`, {
    method: 'PUT', uid, value: { uid, name: uid === 'p2' ? 'Bob' : 'Another viewer' },
  }), 200, 'Claim optional spectator seat');
}

async function command(room, uid, kind, payload = {}) {
  const next = changeRoom(room, uid, room.revision, kind, payload);
  return expectStatus(await writeRoom(next, uid), 200, `${kind} by ${uid}`);
}

async function cleanup() {
  for (const code of TEST_CODES) {
    for (const root of ['rooms', 'presence', 'reactions', 'cleanupIndex']) {
      expectStatus(await request(`${root}/${code}`, { method: 'DELETE', admin: true }), 200, 'Local test cleanup');
    }
  }
}

let cleaned = false;
try {
  await check('upload repository rules to local demo emulator', async () => {
    const rules = JSON.parse(await readFile(new URL('../firebase.rules.json', import.meta.url), 'utf8'));
    expectStatus(await request('.settings/rules', { method: 'PUT', admin: true, value: rules }), 200);
  });
  await check('reset only named emulator test roots', cleanup);
  cleaned = true;

  const code = TEST_CODES[0];
  await check('anonymous root/room reads and room creation are denied', async () => {
    expectDenied(await request(''));
    expectDenied(await request(`rooms/${code}`));
    expectDenied(await writeRoom(initialRoom(code), undefined));
  });
  await check('unknown collections cannot create a room', async () => {
    expectDenied(await writeRoom(initialRoom(TEST_CODES[1], 'unknown'), 'p1'));
  });
  await check('all collections create, join, and start with their own deck', async () => {
    const categoryCode = TEST_CODES[1];
    for (const [datasetId, cards] of Object.entries(DATASETS)) {
      expectStatus(await writeRoom(initialRoom(categoryCode, datasetId), 'p1'), 200, datasetId);
      let current = await join(categoryCode);
      current = await command(current, 'p1', 'start', { deck: cards.map(card => card.id) });
      assert.equal(current.datasetId, datasetId);
      assert.equal(current.game.deck.length, cards.length);
      assert.equal(current.game.currentCardId, cards[0].id);
      assert.equal(current.game.awardCount, 0);
      const forbiddenCollections = new Set([datasetId === 'film' ? 'dizi' : 'film',
        'cocukluk-cizgifilmleri', 'doksanlar-nostalji', 'kantin-bakkal',
        'turkiye-sehirleri', 'oyun-evreni', 'ulkeler',
        'tatli-vol1', 'yemek-vol1', 'oyun-karakterleri', 'oyunlar',
        'valorant-ajanlari', 'lol-sampiyonlari']);
      for (const changedId of forbiddenCollections) {
        if (changedId === datasetId) continue;
        const changed = changeRoom(current, 'p2', current.revision, 'bid', { amount: 2 });
        changed.datasetId = changedId;
        expectDenied(await writeRoom(changed, 'p2'), `Changing collection during play: ${datasetId} to ${changedId}`);
      }
      assert.deepEqual(expectStatus(await readRoom(categoryCode), 200), current,
        'Rejected collection changes must leave the entire room and game untouched.');
      expectStatus(await request(`rooms/${categoryCode}`, { method: 'DELETE', admin: true }), 200);
    }
  });

  await check('the four Oyun collections start and synchronize an isolated first move in every mode', async () => {
    const categoryCode = TEST_CODES[1];
    for (const datasetId of ['oyunlar', 'oyun-karakterleri', 'valorant-ajanlari', 'lol-sampiyonlari']) {
      const cards = DATASETS[datasetId];
      const ids = new Set(cards.map(card => card.id));
      for (const mode of ['auction', 'blind-ranking', 'bracket', 'team-draft']) {
        expectStatus(await writeRoom(initialRoom(categoryCode, datasetId, mode), 'p1'), 200, `${datasetId}/${mode}`);
        let current = expectStatus(await readRoom(categoryCode), 200);
        const optionalSpectator = mode === 'blind-ranking' || mode === 'bracket';
        if (!optionalSpectator) current = await join(categoryCode);
        const triplets = mode === 'team-draft' ? draftTriplets(cards, () => 0) : null;
        current = await command(current, 'p1', 'start', triplets ? { triplets } : { deck: cards.map(card => card.id) });
        assert.equal(current.datasetId, datasetId);
        assert.equal(current.mode, mode);
        if (triplets) assert.ok(current.game.triplets.every(triplet => triplet.cards.every(id => ids.has(id))));
        else assert.ok(current.game.deck.every(id => ids.has(id)));
        if (mode === 'auction') current = await command(current, 'p2', 'bid', { amount: 2 });
        else if (mode === 'blind-ranking') current = await command(current, 'p1', 'rank', { slot: 1 });
        else if (mode === 'bracket') current = await command(current, 'p1', 'choose', { cardId: current.game.currentPair.left });
        else current = await command(current, 'p1', 'assign', { role: 'start', cardId: triplets[0].cards[0] });
        if (optionalSpectator) {
          const beforeJoin = structuredClone(current);
          await joinSpectator(categoryCode);
          current = expectStatus(await readRoom(categoryCode), 200);
          assert.equal(current.revision, beforeJoin.revision, 'Late viewers must not increment the game revision.');
          assert.deepEqual(current.game, beforeJoin.game, 'Late viewers must receive the exact progressed game.');
          assert.throws(() => changeRoom(current, 'p2', current.revision,
            mode === 'blind-ranking' ? 'rank' : 'choose',
            mode === 'blind-ranking' ? { slot: 2 } : { cardId: current.game.currentPair.left }));
        }
        const recovered = expectStatus(await readRoom(categoryCode, 'p2'), 200);
        assert.equal(recovered.datasetId, datasetId);
        assert.deepEqual(recovered.game, current.game, `${datasetId}/${mode}: both clients must see the same first committed choice.`);
        expectStatus(await request(`rooms/${categoryCode}`, { method: 'DELETE', admin: true }), 200);
      }
    }
  });

  let room = await check('Alice creates a six-digit waiting room', async () => {
    const created = expectStatus(await writeRoom(initialRoom(code), 'p1'), 200);
    assert.equal(created.ownerUid, 'p1');
    assert.equal(created.players.p1.name, 'Alice');
    assert.equal(typeof created.createdAt, 'number');
    return created;
  });
  room = await check('Bob reads the available room and claims the second seat', () => join(code));

  await check('third-player join and unauthorized reads/writes are denied', async () => {
    const hijacked = structuredClone(room);
    hijacked.revision += 1;
    hijacked.players.p2 = { uid: 'stranger', name: 'Intruder' };
    expectDenied(await writeRoom(hijacked, 'stranger'), 'Third join');
    expectDenied(await readRoom(code, 'stranger'), 'Stranger room read');
    expectDenied(await request('rooms', { uid: 'p1' }), 'Room enumeration');
    expectDenied(await request(`rooms/${code}`, { method: 'DELETE', uid: 'p1' }), 'Room deletion');
    assert.equal(expectStatus(await readRoom(code), 200).players.p2.uid, 'p2');
  });

  await check('guest start is denied even with a structurally valid owner start', async () => {
    const next = changeRoom(room, 'p1', room.revision, 'start', { deck: DECK });
    next.lastAction.seat = 'p2';
    expectDenied(await writeRoom(next, 'p2'));
  });
  room = await check('owner starts with a 1 TL automatic opening', async () => {
    const next = await command(room, 'p1', 'start', { deck: DECK });
    assert.equal(next.game.highestBid, 1);
    assert.equal(next.game.bidderSeat, 'p1');
    assert.equal(next.game.turnSeat, 'p2');
    assert.equal(next.game.awardCount, 0);
    assert.equal(next.game.deckIndex, 0);
    assert.equal(next.game.rosters?.p1?.length || 0, 0);
    assert.equal(next.game.rosters?.p2?.length || 0, 0);
    return next;
  });

  await check('out-of-turn and over-budget forged bids are denied', async () => {
    const outOfTurn = structuredClone(room);
    outOfTurn.revision += 1;
    outOfTurn.lastAction = { kind: 'bid', seat: 'p1' };
    outOfTurn.game.highestBid = 2;
    outOfTurn.game.bidderSeat = 'p1';
    outOfTurn.game.turnSeat = 'p2';
    expectDenied(await writeRoom(outOfTurn, 'p1'), 'Out-of-turn bid');
    const overBudget = structuredClone(room);
    overBudget.revision += 1;
    overBudget.lastAction = { kind: 'bid', seat: 'p2' };
    overBudget.game.highestBid = 21;
    overBudget.game.bidderSeat = 'p2';
    overBudget.game.turnSeat = 'p1';
    expectDenied(await writeRoom(overBudget, 'p2'), 'Over-budget bid');
  });

  room = await check('Bob bids 10 TL without deducting money before an award', async () => {
    const next = await command(room, 'p2', 'bid', { amount: 10 });
    assert.equal(next.game.highestBid, 10);
    assert.equal(next.game.turnSeat, 'p1');
    assert.deepEqual(next.game.budgets, { p1: 20, p2: 20 });
    assert.equal(next.game.awardCount, 0);
    assert.equal(next.game.deckIndex, 0);
    return next;
  });

  await check('forged winning price and winning card are denied', async () => {
    const validPass = changeRoom(room, 'p1', room.revision, 'pass');
    const priceCheat = structuredClone(validPass);
    priceCheat.game.rosters.p2[0].price = 11;
    priceCheat.game.budgets.p2 = 9;
    priceCheat.game.lastAward.price = 11;
    expectDenied(await writeRoom(priceCheat, 'p1'), 'Alter winning price');
    const cardCheat = structuredClone(validPass);
    cardCheat.game.rosters.p2[0].id = 16;
    cardCheat.game.lastAward.id = 16;
    expectDenied(await writeRoom(cardCheat, 'p1'), 'Alter winning card');
  });

  room = await check('Alice passes and Bob receives the card for exactly 10 TL', async () => {
    const next = await command(room, 'p1', 'pass');
    assert.equal(next.game.budgets.p2, 10);
    assert.deepEqual(next.game.rosters.p2, [{ id: 1, price: 10 }]);
    assert.equal(next.game.awardCount, 1);
    assert.equal(next.game.deckIndex, 1);
    assert.equal(next.game.currentCardId, 2);
    assert.equal(next.game.highestBid, 1);
    return next;
  });

  await check('both persistent identities read their unchanged seat and budget', async () => {
    for (const uid of ['p1', 'p2']) {
      const snapshot = expectStatus(await readRoom(code, uid), 200);
      assert.equal(seatFor(snapshot, uid), uid);
      assert.equal(snapshot.code, code);
      assert.equal(snapshot.game.budgets.p2, 10);
      assert.deepEqual(snapshot.game.rosters.p2, [{ id: 1, price: 10 }]);
    }
  });

  room = await check('full auction passes finish with five cards per player', async () => {
    let current = room;
    let moves = 0;
    let fullSeatPasses = 0;
    while (current.status === 'playing') {
      assert.ok(moves++ < 20, 'Auction must terminate.');
      const previous = current;
      const turnSeat = previous.game.turnSeat;
      if (previous.game.rosters?.[turnSeat]?.length === 5) {
        fullSeatPasses += 1;
        if (fullSeatPasses === 1) {
          const fullRosterBid = structuredClone(previous);
          fullRosterBid.revision += 1;
          fullRosterBid.lastAction = { kind: 'bid', seat: turnSeat };
          fullRosterBid.game.highestBid = 2;
          fullRosterBid.game.bidderSeat = turnSeat;
          fullRosterBid.game.turnSeat = turnSeat === 'p1' ? 'p2' : 'p1';
          expectDenied(await writeRoom(fullRosterBid, previous.players[turnSeat].uid),
            'A full roster cannot bid on a sixth card.');
        }
      }
      current = await command(previous, previous.players[turnSeat].uid, 'pass');
      assert.equal(current.game.awardCount, previous.game.awardCount + 1,
        'Each explicit pass awards exactly one displayed card.');
      assert.equal(current.game.deckIndex, previous.game.deckIndex + 1);
      assert.deepEqual(current.game.lastAward, {
        id: previous.game.currentCardId,
        seat: previous.game.bidderSeat,
        price: previous.game.highestBid,
        sequence: previous.game.awardCount + 1,
      });
    }
    assert.equal(current.status, 'finished');
    assert.equal(current.game.rosters.p1.length, 5);
    assert.equal(current.game.rosters.p2.length, 5);
    assert.equal(current.game.awardCount, 10);
    assert.equal(moves, 9, 'Nine displayed cards remain after the first awarded card.');
    assert.equal(fullSeatPasses, 2, 'A full roster may still pass both remaining opponent auctions.');
    return current;
  });

  room = await check('same-room rematch flips starter and resets both budgets/rosters', async () => {
    const next = await command(room, 'p2', 'rematch', { deck: [...DECK].reverse() });
    assert.equal(next.code, code);
    assert.equal(next.round, 2);
    assert.equal(next.starterSeat, 'p2');
    assert.equal(next.game.bidderSeat, 'p2');
    assert.deepEqual(next.game.budgets, { p1: 20, p2: 20 });
    assert.equal(next.game.rosters?.p1?.length || 0, 0);
    assert.equal(next.game.rosters?.p2?.length || 0, 0);
    assert.equal(next.players.p1.uid, 'p1');
    assert.equal(next.players.p2.uid, 'p2');
    return next;
  });

  room = await check('same-ETag concurrent bids commit once', async () => {
    const snapshot = await readRoom(code, 'p1', { 'X-Firebase-ETag': 'true' });
    expectStatus(snapshot, 200);
    if (!snapshot.etag) {
      skipped += 1;
      console.log('SKIP emulator did not return an ETag');
      return snapshot.body;
    }
    const first = changeRoom(snapshot.body, 'p1', snapshot.body.revision, 'bid', { amount: 2 });
    const second = changeRoom(snapshot.body, 'p1', snapshot.body.revision, 'bid', { amount: 3 });
    const responses = await Promise.all([
      writeRoom(first, 'p1', { 'If-Match': snapshot.etag }),
      writeRoom(second, 'p1', { 'If-Match': snapshot.etag }),
    ]);
    assert.deepEqual(responses.map(result => result.status).sort((a, b) => a - b), [200, 412],
      `Concurrent writes: ${JSON.stringify(responses)}`);
    const current = expectStatus(await readRoom(code), 200);
    assert.equal(current.revision, snapshot.body.revision + 1);
    assert.ok([2, 3].includes(current.game.highestBid));
    return current;
  });

  await check('reactions enforce membership, sender ownership, sequence, and cooldown', async () => {
    const path = `reactions/${code}/p1`;
    expectStatus(await request(path, { method: 'PUT', uid: 'p1', value: { seq: 1, type: 'laugh', sentAt: TIMESTAMP } }), 200);
    expectDenied(await request(path, { method: 'PUT', uid: 'p1', value: { seq: 2, type: 'womp', sentAt: TIMESTAMP } }), 'Reaction cooldown');
    expectDenied(await request(`reactions/${code}/p2`, { method: 'PUT', uid: 'p1', value: { seq: 1, type: 'laugh', sentAt: TIMESTAMP } }), 'Sender spoof');
    expectDenied(await request(`reactions/${code}/stranger`, { method: 'PUT', uid: 'stranger', value: { seq: 1, type: 'laugh', sentAt: TIMESTAMP } }), 'Unseated sender');
    expectDenied(await request(`reactions/${code}`, { uid: 'stranger' }), 'Reaction privacy');
    await delay(1600);
    expectDenied(await request(path, { method: 'PUT', uid: 'p1', value: { seq: 3, type: 'womp', sentAt: TIMESTAMP } }), 'Skipped sequence');
    expectStatus(await request(path, { method: 'PUT', uid: 'p1', value: { seq: 2, type: 'womp', sentAt: TIMESTAMP } }), 200);
    const reaction = expectStatus(await request(path, { uid: 'p2' }), 200);
    assert.equal(reaction.seq, 2);
    assert.equal(reaction.type, 'womp');
  });

  await check('presence permits own tab registration/removal and denies spoofing', async () => {
    const ownPath = `presence/${code}/p1/emulator-tab`;
    expectStatus(await request(ownPath, { method: 'PUT', uid: 'p1', value: { connectedAt: TIMESTAMP } }), 200);
    expectDenied(await request(`presence/${code}/p2/spoofed-tab`, { method: 'PUT', uid: 'p1', value: { connectedAt: TIMESTAMP } }));
    expectDenied(await request(`presence/${code}/stranger/outsider-tab`, { method: 'PUT', uid: 'stranger', value: { connectedAt: TIMESTAMP } }));
    expectDenied(await request(`presence/${code}`, { uid: 'stranger' }));
    const presence = expectStatus(await request(`presence/${code}`, { uid: 'p2' }), 200);
    assert.equal(typeof presence.p1['emulator-tab'].connectedAt, 'number');
    expectStatus(await request(ownPath, { method: 'DELETE', uid: 'p1' }), 200);
  });

  await check('20 TL win opens the next auction without automatically awarding it', async () => {
    const soloCode = TEST_CODES[1];
    expectStatus(await writeRoom(initialRoom(soloCode, 'superlig'), 'p1'), 200);
    let current = await join(soloCode);
    current = await command(current, 'p1', 'start', { deck: DECK });
    assert.equal(current.datasetId, 'superlig');
    assert.equal(current.game.deck.length, DECK.length);
    const changedDataset = changeRoom(current, 'p2', current.revision, 'bid', { amount: 2 });
    changedDataset.datasetId = 'futbol';
    expectDenied(await writeRoom(changedDataset, 'p2'), 'Changing the room collection');
    current = await command(current, 'p2', 'bid', { amount: 20 });
    assert.equal(current.game.awardCount, 0);
    assert.deepEqual(current.game.budgets, { p1: 20, p2: 20 });

    // A forged legacy-style pass that awards every remaining solo card must fail.
    const forgedBatch = changeRoom(current, 'p1', current.revision, 'pass');
    forgedBatch.game.rosters.p1 = DECK.slice(1, 6).map(id => ({ id, price: 1 }));
    forgedBatch.game.budgets.p1 = 15;
    forgedBatch.game.awardCount = 6;
    forgedBatch.game.deckIndex = 6;
    forgedBatch.game.phase = 'finished';
    forgedBatch.game.currentCardId = null;
    forgedBatch.game.highestBid = 0;
    forgedBatch.game.bidderSeat = null;
    forgedBatch.game.turnSeat = null;
    forgedBatch.game.lastAward = { id: 6, seat: 'p1', price: 1, sequence: 6 };
    forgedBatch.status = 'finished';
    expectDenied(await writeRoom(forgedBatch, 'p1'), 'Multiple awards from one pass');

    current = await command(current, 'p1', 'pass');
    assert.equal(current.status, 'playing');
    assert.deepEqual(current.game.budgets, { p1: 20, p2: 0 });
    assert.equal(current.game.rosters?.p1?.length || 0, 0);
    assert.deepEqual(current.game.rosters.p2, [{ id: 1, price: 20 }]);
    assert.equal(current.game.awardCount, 1);
    assert.equal(current.game.deckIndex, 1);
    assert.equal(current.game.currentCardId, 2);
    assert.equal(current.game.highestBid, 1);
    assert.equal(current.game.bidderSeat, 'p1');
    assert.equal(current.game.turnSeat, 'p2');

    const unchanged = expectStatus(await readRoom(soloCode, 'p2'), 200);
    assert.equal(unchanged.game.awardCount, 1);
    assert.equal(unchanged.game.currentCardId, 2);
    assert.deepEqual(unchanged.game.budgets, { p1: 20, p2: 0 });

    const brokeBid = structuredClone(current);
    brokeBid.revision += 1;
    brokeBid.lastAction = { kind: 'bid', seat: 'p2' };
    brokeBid.game.highestBid = 2;
    brokeBid.game.bidderSeat = 'p2';
    brokeBid.game.turnSeat = 'p1';
    expectDenied(await writeRoom(brokeBid, 'p2'), 'Zero-budget bidder');

    for (let cardId = 2; cardId <= 6; cardId += 1) {
      assert.equal(current.game.currentCardId, cardId);
      assert.equal(current.game.turnSeat, 'p2');
      const previous = current;
      current = await command(current, 'p2', 'pass');
      assert.equal(current.game.awardCount, cardId === 6 ? 10 : previous.game.awardCount + 1);
      assert.equal(current.game.deckIndex, cardId === 6 ? 10 : previous.game.deckIndex + 1);
      assert.equal(current.game.rosters.p1.length, cardId - 1);
      assert.equal(current.game.budgets.p1, 21 - cardId);
      assert.deepEqual(current.game.lastAward, {
        id: cardId, seat: 'p1', price: 1, sequence: cardId,
      });
      assert.equal(current.status, cardId === 6 ? 'finished' : 'playing');
    }
    assert.deepEqual(current.game.budgets, { p1: 15, p2: 0 });
    assert.equal(current.game.rosters.p1.length, 5);
    assert.deepEqual(current.game.rosters.p2, [{ id: 1, price: 20 }, ...[7, 8, 9, 10].map(id => ({ id, price: 0, source: 'completion' }))]);
    assert.equal(current.game.awardCount, 10);
    assert.deepEqual(current.game.completionAwards, [7, 8, 9, 10].map((id, index) => ({ id, seat: 'p2', price: 0, sequence: 7 + index })));
    assert.equal(current.game.lastAward.sequence, 6);
  });

  await check('auction start rejects duplicate first-ten deck cards', async () => {
    const fresh = initialRoom(TEST_CODES[7]);
    expectStatus(await writeRoom(fresh, 'p1'), 200);
    const joined = await join(fresh.code);
    const valid = changeRoom(joined, 'p1', joined.revision, 'start', { deck: DECK });
    const duplicate = structuredClone(valid); duplicate.game.deck[9] = duplicate.game.deck[0];
    expectDenied(await writeRoom(duplicate, 'p1'), 'Duplicate auction card');
    expectStatus(await request(`rooms/${fresh.code}`, { method: 'DELETE', admin: true }), 200);
  });
  let completion;
  await check('both budgets may run out and deterministic free cards complete both five-card teams', async () => {
    const fresh = initialRoom(TEST_CODES[7]);
    expectStatus(await writeRoom(fresh, 'p1'), 200);
    let current = await join(fresh.code);
    current = await command(current, 'p1', 'start', { deck: DECK });
    current = await command(current, 'p2', 'bid', { amount: 2 });
    current = await command(current, 'p1', 'bid', { amount: 18 });
    current = await command(current, 'p2', 'pass');
    current = await command(current, 'p1', 'bid', { amount: 2 });
    current = await command(current, 'p2', 'bid', { amount: 19 });
    current = await command(current, 'p1', 'pass');

    // An unfinished opponent must still auction each card. Completing both
    // rosters for free while paid buyers remain would hide normal choices.
    const early = changeRoom(current, 'p2', current.revision, 'pass');
    const forgedEarly = structuredClone(early);
    forgedEarly.game.completionAwards = [];
    for (const seat of ['p1', 'p2']) {
      while (forgedEarly.game.rosters[seat].length < 5) {
        const id = forgedEarly.game.deck[forgedEarly.game.deckIndex++];
        forgedEarly.game.rosters[seat].push({ id, price: 0, source: 'completion' });
        forgedEarly.game.completionAwards.push({ id, seat, price: 0, sequence: ++forgedEarly.game.awardCount });
      }
    }
    Object.assign(forgedEarly.game, { phase: 'finished', currentCardId: null, highestBid: 0, bidderSeat: null, turnSeat: null });
    forgedEarly.status = 'finished';
    expectDenied(await writeRoom(forgedEarly, 'p2'), 'Premature free roster completion');
    current = await command(current, 'p2', 'pass');
    current = await command(current, 'p1', 'pass');
    completion = current;
    current = await command(current, 'p2', 'pass');
    assert.equal(current.status, 'finished');
    assert.deepEqual(current.game.budgets, { p1: 0, p2: 0 });
    assert.equal(current.game.deckIndex, 10); assert.equal(current.game.awardCount, 10);
    assert.equal(current.game.rosters.p1.length, 5); assert.equal(current.game.rosters.p2.length, 5);
    assert.deepEqual(current.game.completionAwards, [6, 7, 8, 9, 10].map((id, index) => ({ id, seat: index < 2 ? 'p1' : 'p2', price: 0, sequence: 6 + index })));
    assert.deepEqual(current.game.lastAward, { id: 5, seat: 'p1', price: 1, sequence: 5 });
    assert.equal(new Set([...current.game.rosters.p1, ...current.game.rosters.p2].map(card => card.id)).size, 10);
    assert.deepEqual(expectStatus(await readRoom(current.code, 'p2'), 200), current);
  });
  await check('free completion rejects altered decks, order, owners, prices, metadata, history, and budget refunds', async () => {
    const valid = changeRoom(completion, 'p2', completion.revision, 'pass');
    // Test against the same pre-completion state without weakening client rules.
    expectStatus(await request(`rooms/${completion.code}`, { method: 'PUT', admin: true, value: completion }), 200);
    const variants = [
      ['Free-card price', value => { value.game.rosters.p1[3].price = 1; }],
      ['Missing free-card source', value => { delete value.game.rosters.p1[3].source; }],
      ['Forged paid-card source', value => { value.game.rosters.p1[0].source = 'completion'; }],
      ['Free-card reorder', value => { [value.game.rosters.p1[3].id, value.game.rosters.p1[4].id] = [value.game.rosters.p1[4].id, value.game.rosters.p1[3].id]; }],
      ['Free-card opponent substitution', value => { value.game.rosters.p1[3].id = value.game.rosters.p2[2].id; }],
      ['Replaced paid history', value => { value.game.rosters.p1[0].id = 99; }],
      ['Refunded budget', value => { value.game.budgets.p1 = 1; }],
      ['Paid award replaced by free metadata', value => { value.game.lastAward = value.game.completionAwards.at(-1); }],
      ['Wrong free owner', value => { value.game.completionAwards[0].seat = 'p2'; }],
      ['Wrong free sequence', value => { value.game.completionAwards[0].sequence += 1; }],
      ['Wrong free metadata card', value => { value.game.completionAwards[0].id = 99; }],
      ['Deleted free metadata', value => { value.game.completionAwards.pop(); }],
      ['Deleted completion array', value => { delete value.game.completionAwards; }],
      ['Changed original deck', value => { value.game.deck[9] = 99; }],
      ['Forged completion field', value => { value.game.completionAwards[0].extra = true; }],
    ];
    for (const [label, mutate] of variants) { const forged = structuredClone(valid); mutate(forged); expectDenied(await writeRoom(forged, 'p2'), label); }
    const finished = await command(completion, 'p2', 'pass');
    const rematched = await command(finished, 'p1', 'rematch', { deck: [...DECK].reverse() });
    assert.equal(rematched.game.completionAwards?.length || 0, 0);
    assert.equal(rematched.game.awardCount, 0); assert.deepEqual(rematched.game.budgets, { p1: 20, p2: 20 });
  });

  const blindCode = TEST_CODES[2];
  let blind = await check('blind-ranking room creation permits its mode and denies unknown modes', async () => {
    expectDenied(await writeRoom(initialRoom(blindCode, 'futbol', 'unknown'), 'p1'));
    const created = expectStatus(await writeRoom(initialRoom(blindCode, 'futbol', 'blind-ranking'), 'p1'), 200);
    assert.equal(created.mode, 'blind-ranking');
    const changedMode = structuredClone(created);
    changedMode.mode = 'auction';
    expectDenied(await writeRoom(changedMode, 'p1'), 'Mode cannot change in the waiting room');
    return created;
  });
  blind = await check('blind-ranking guest joins without changing the room mode', async () => {
    const joined = await join(blindCode);
    assert.equal(joined.mode, 'blind-ranking');
    assert.equal(joined.players.p1.uid, 'p1');
    assert.equal(joined.players.p2.uid, 'p2');
    return joined;
  });
  await check('blind start rejects spectator start, invalid decks, mixed schemas, and a swapped active seat', async () => {
    const valid = changeRoom(blind, 'p1', blind.revision, 'start', { deck: BLIND_DECK });
    const guestStart = structuredClone(valid);
    guestStart.lastAction.seat = 'p2';
    expectDenied(await writeRoom(guestStart, 'p2'), 'Only the room owner may start');
    const duplicate = structuredClone(valid);
    duplicate.game.deck[9] = duplicate.game.deck[8];
    expectDenied(await writeRoom(duplicate, 'p1'), 'Duplicate deck card');
    const tooLong = structuredClone(valid);
    tooLong.game.deck.push(11);
    expectDenied(await writeRoom(tooLong, 'p1'), 'Eleven-card blind deck');
    const tooShort = structuredClone(valid);
    tooShort.game.deck.pop();
    expectDenied(await writeRoom(tooShort, 'p1'), 'Nine-card blind deck');
    const activeSwap = structuredClone(valid);
    activeSwap.game.activeSeat = 'p2';
    expectDenied(await writeRoom(activeSwap, 'p1'), 'Active seat must match starter');
    const mixedSchema = structuredClone(valid);
    mixedSchema.game.highestBid = 1;
    expectDenied(await writeRoom(mixedSchema, 'p1'), 'Auction fields cannot enter a blind game');
  });
  blind = await check('blind owner starts a ten-card game with one active player and empty slots', async () => {
    const started = await command(blind, 'p1', 'start', { deck: BLIND_DECK });
    assert.equal(started.mode, 'blind-ranking');
    assert.equal(started.status, 'playing');
    assert.deepEqual(started.game.deck, BLIND_DECK);
    assert.equal(started.game.deckIndex, 0);
    assert.equal(started.game.activeSeat, 'p1');
    assert.equal(started.game.currentCardId, BLIND_DECK[0]);
    assert.equal(Object.keys(started.game.slots || {}).length, 0);
    assert.equal(started.game.lastPlacement ?? null, null);
    return started;
  });
  await check('blind spectator cannot place the active player’s card', async () => {
    const forged = changeRoom(blind, 'p1', blind.revision, 'rank', { slot: 4 });
    forged.lastAction.seat = 'p2';
    expectDenied(await writeRoom(forged, 'p2'), 'Spectator rank');
    expectDenied(await readRoom(blindCode, 'stranger'), 'Blind room privacy');
  });
  blind = await check('active player fills exactly one empty blind slot and spectator sees it', async () => {
    const placed = await command(blind, 'p1', 'rank', { slot: 4 });
    assert.equal(placed.game.deckIndex, 1);
    assert.deepEqual(placed.game.slots, { s4: BLIND_DECK[0] });
    assert.deepEqual(placed.game.lastPlacement, { slot: 4, id: BLIND_DECK[0], sequence: 1 });
    assert.equal(placed.game.currentCardId, BLIND_DECK[1]);
    const spectator = expectStatus(await readRoom(blindCode, 'p2'), 200);
    assert.deepEqual(spectator.game, placed.game);
    return placed;
  });
  await check('blind rules reject overwrites, deletions, multiple slots, forged IDs, and malformed transitions', async () => {
    const valid = changeRoom(blind, 'p1', blind.revision, 'rank', { slot: 2 });
    const variants = [
      ['Overwrite a filled slot', value => { value.game.slots.s4 = BLIND_DECK[1]; }],
      ['Remove a filled slot', value => { delete value.game.slots.s4; }],
      ['Fill two slots at once', value => { value.game.slots.s1 = BLIND_DECK[2]; value.game.deckIndex = 3; value.game.currentCardId = BLIND_DECK[3]; value.game.lastPlacement.sequence = 3; }],
      ['Change the deck', value => { value.game.deck[9] = 999; }],
      ['Invalid slot key', value => { delete value.game.slots.s2; value.game.slots.s0 = BLIND_DECK[1]; value.game.lastPlacement.slot = 0; }],
      ['Invalid winning card ID', value => { value.game.slots.s2 = BLIND_DECK[2]; value.game.lastPlacement.id = BLIND_DECK[2]; }],
      ['Wrong next card', value => { value.game.currentCardId = BLIND_DECK[3]; }],
      ['Swap active seat', value => { value.game.activeSeat = 'p2'; }],
      ['Change room mode', value => { value.mode = 'auction'; }],
      ['Stale revision', value => { value.revision = blind.revision; }],
      ['Finish before ten placements', value => { value.status = 'finished'; value.game.phase = 'finished'; value.game.currentCardId = null; }],
      ['Missing placement metadata', value => { value.game.lastPlacement = null; }],
      ['Wrong placement sequence', value => { value.game.lastPlacement.sequence = 1; }],
      ['Unknown game field', value => { value.game.extra = true; }],
      ['Unknown placement field', value => { value.game.lastPlacement.extra = true; }],
    ];
    for (const [label, mutate] of variants) {
      const forged = structuredClone(valid);
      mutate(forged);
      expectDenied(await writeRoom(forged, 'p1'), label);
    }
    assert.deepEqual(expectStatus(await readRoom(blindCode), 200).game, blind.game,
      'Rejected operations leave the previously filled slot unchanged.');
  });
  blind = await check('same-ETag concurrent blind placements commit once', async () => {
    const snapshot = await readRoom(blindCode, 'p1', { 'X-Firebase-ETag': 'true' });
    expectStatus(snapshot, 200);
    if (!snapshot.etag) {
      skipped += 1;
      console.log('SKIP emulator did not return an ETag for blind ranking');
      return snapshot.body;
    }
    const first = changeRoom(snapshot.body, 'p1', snapshot.body.revision, 'rank', { slot: 2 });
    const second = changeRoom(snapshot.body, 'p1', snapshot.body.revision, 'rank', { slot: 8 });
    const responses = await Promise.all([
      writeRoom(first, 'p1', { 'If-Match': snapshot.etag }),
      writeRoom(second, 'p1', { 'If-Match': snapshot.etag }),
    ]);
    assert.deepEqual(responses.map(result => result.status).sort((a, b) => a - b), [200, 412]);
    const current = expectStatus(await readRoom(blindCode, 'p2'), 200);
    assert.equal(current.revision, snapshot.body.revision + 1);
    assert.equal(current.game.deckIndex, snapshot.body.game.deckIndex + 1);
    assert.equal(Object.keys(current.game.slots).length, 2);
    assert.equal(current.game.slots.s4, BLIND_DECK[0]);
    return current;
  });
  blind = await check('ten explicit blind placements finish with every slot filled once', async () => {
    let current = blind;
    for (let slot = 1; slot <= 10; slot += 1) {
      if (current.game.slots?.[`s${slot}`]) continue;
      const previous = current;
      current = await command(current, 'p1', 'rank', { slot });
      assert.equal(current.game.deckIndex, previous.game.deckIndex + 1);
      assert.equal(current.game.slots[`s${slot}`], previous.game.currentCardId);
      assert.deepEqual(current.game.lastPlacement, {
        slot, id: previous.game.currentCardId, sequence: previous.game.deckIndex + 1,
      });
      for (const [filled, id] of Object.entries(previous.game.slots || {})) {
        assert.equal(current.game.slots[filled], id);
      }
      assert.equal(current.status, current.game.deckIndex === 10 ? 'finished' : 'playing');
    }
    assert.equal(current.status, 'finished');
    assert.equal(current.game.phase, 'finished');
    assert.equal(current.game.deckIndex, 10);
    assert.equal(current.game.currentCardId ?? null, null);
    assert.equal(Object.keys(current.game.slots).length, 10);
    assert.deepEqual(Object.values(current.game.slots).sort((a, b) => a - b), [...BLIND_DECK].sort((a, b) => a - b));
    const extraRank = structuredClone(current);
    extraRank.revision += 1;
    extraRank.lastAction = { kind: 'rank', seat: 'p1' };
    expectDenied(await writeRoom(extraRank, 'p1'), 'Placement after completion');
    return current;
  });
  blind = await check('blind rematch keeps the room and mode while swapping active and spectator roles', async () => {
    const restarted = await command(blind, 'p1', 'rematch', { deck: [...BLIND_DECK].reverse() });
    assert.equal(restarted.code, blindCode);
    assert.equal(restarted.mode, 'blind-ranking');
    assert.equal(restarted.round, 2);
    assert.equal(restarted.starterSeat, 'p2');
    assert.equal(restarted.game.activeSeat, 'p2');
    assert.equal(restarted.game.deckIndex, 0);
    assert.equal(Object.keys(restarted.game.slots || {}).length, 0);
    assert.equal(restarted.game.lastPlacement ?? null, null);
    assert.equal(restarted.game.currentCardId, BLIND_DECK.at(-1));
    const wrongRole = changeRoom(restarted, 'p2', restarted.revision, 'rank', { slot: 10 });
    wrongRole.lastAction.seat = 'p1';
    expectDenied(await writeRoom(wrongRole, 'p1'), 'Former active player is now a spectator');
    return await command(restarted, 'p2', 'rank', { slot: 10 });
  });
  await check('both blind identities resume the same slots, current card, and swapped role', async () => {
    for (const uid of ['p1', 'p2']) {
      const recovered = expectStatus(await readRoom(blindCode, uid), 200);
      assert.equal(seatFor(recovered, uid), uid);
      assert.equal(recovered.game.activeSeat, 'p2');
      assert.equal(recovered.game.deckIndex, 1);
      assert.deepEqual(recovered.game, blind.game);
      assert.equal(recovered.game.slots.s10, BLIND_DECK.at(-1));
    }
    const path = `presence/${blindCode}/p1/blind-spectator-tab`;
    expectStatus(await request(path, { method: 'PUT', uid: 'p1', value: { connectedAt: TIMESTAMP } }), 200);
    expectStatus(await request(path, { method: 'DELETE', uid: 'p1' }), 200);
    expectStatus(await request(`reactions/${blindCode}/p1`, { method: 'PUT', uid: 'p1', value: { seq: 1, type: 'heart', sentAt: TIMESTAMP } }), 200);
    expectDenied(await request(`reactions/${blindCode}/p2`, { method: 'PUT', uid: 'p1', value: { seq: 1, type: 'laugh', sentAt: TIMESTAMP } }), 'Spectator sender spoof');
  });

  for (const mode of ['blind-ranking', 'bracket']) {
    const optionalCode = TEST_CODES[5];
    const payload = { deck: mode === 'blind-ranking' ? BLIND_DECK : BRACKET_DECK };
    const move = value => mode === 'blind-ranking' ? ['rank', { slot: value.game.deckIndex + 1 }] : ['choose', { cardId: value.game.currentPair.left }];
    let solo = await check(`${mode}: owner starts and plays with no spectator`, async () => {
      let current = expectStatus(await writeRoom(initialRoom(optionalCode, 'futbol', mode), 'p1'), 200);
      current = await command(current, 'p1', 'start', payload);
      current = await command(current, 'p1', ...move(current));
      assert.equal(current.players.p2, undefined);
      assert.equal(current.game.activeSeat, 'p1');
      expectStatus(await readRoom(optionalCode, 'p2'), 200, 'A known code exposes the vacant spectator seat');
      const forged = structuredClone(current);
      forged.players.p2 = { uid: 'p2', name: 'Bob' };
      expectDenied(await writeRoom(forged, 'p2'), 'A late join cannot replace the whole game');
      expectDenied(await request(`rooms/${optionalCode}/players/p2`, { method: 'PUT', uid: 'p2', value: { uid: 'stranger', name: 'Spoof' } }), 'Spectator UID spoof');
      expectDenied(await request(`rooms/${optionalCode}/players/p2`, { method: 'PUT', uid: 'p1', value: { uid: 'p1', name: 'Duplicate host' } }), 'Host cannot occupy both seats');
      return current;
    });
    solo = await check(`${mode}: solo completion and rematch retain p1 as the active player`, async () => {
      let current = solo;
      while (current.status === 'playing') current = await command(current, 'p1', ...move(current));
      const restart = await command(current, 'p1', 'rematch', payload);
      assert.equal(restart.game.activeSeat, 'p1');
      assert.equal(restart.starterSeat, 'p1');
      assert.equal(restart.round, 2);
      assert.equal(restart.players.p2, undefined);
      return restart;
    });
    solo = await check(`${mode}: a late spectator joins without changing game, metadata, or revision`, async () => {
      const previous = expectStatus(await readRoom(optionalCode, 'p1', { 'X-Firebase-ETag': 'true' }), 200);
      const stale = changeRoom(previous, 'p1', previous.revision, ...move(previous));
      const snapshot = await readRoom(optionalCode, 'p1', { 'X-Firebase-ETag': 'true' });
      await joinSpectator(optionalCode);
      const joined = expectStatus(await readRoom(optionalCode, 'p1'), 200);
      assert.deepEqual(joined, { ...previous, players: { ...previous.players, p2: { uid: 'p2', name: 'Bob' } } });
      assert.deepEqual(expectStatus(await readRoom(optionalCode, 'p2'), 200).game, previous.game);
      if (snapshot.etag) assert.equal((await writeRoom(stale, 'p1', { 'If-Match': snapshot.etag })).status, 412,
        'A stale whole-room write must retry after a child seat claim.');
      else { skipped += 1; console.log('SKIP emulator did not return an ETag for late spectator join'); }
      const afterRetry = await command(joined, 'p1', ...move(joined));
      assert.deepEqual(afterRetry.players, joined.players);
      assert.equal(afterRetry.revision, previous.revision + 1);
      const spectatorChoice = changeRoom(afterRetry, 'p1', afterRetry.revision, ...move(afterRetry));
      spectatorChoice.lastAction.seat = 'p2';
      expectDenied(await writeRoom(spectatorChoice, 'p2'), 'A late spectator still cannot make a choice');
      expectDenied(await request(`rooms/${optionalCode}/players/p2`, { method: 'PUT', uid: 'stranger', value: { uid: 'stranger', name: 'Third player' } }), 'Third player cannot overwrite the seat');
      expectDenied(await request(`rooms/${optionalCode}/players/p2/name`, { method: 'PUT', uid: 'p2', value: 'Changed' }), 'Saved spectator identity is immutable');
      expectDenied(await request(`rooms/${optionalCode}/players/p2`, { method: 'DELETE', uid: 'p2' }), 'Spectator cannot free or delete its seat');
      expectDenied(await readRoom(optionalCode, 'stranger'), 'Full room remains private');
      return afterRetry;
    });
    await check(`${mode}: spectator presence loss does not stop the actor and a rematch swaps roles`, async () => {
      const presencePath = `presence/${optionalCode}/p2/late-viewer`;
      expectStatus(await request(presencePath, { method: 'PUT', uid: 'p2', value: { connectedAt: TIMESTAMP } }), 200);
      expectStatus(await request(presencePath, { method: 'DELETE', uid: 'p2' }), 200);
      let current = solo;
      while (current.status === 'playing') current = await command(current, 'p1', ...move(current));
      const restarted = await command(current, 'p1', 'rematch', payload);
      assert.equal(restarted.game.activeSeat, 'p2');
      assert.equal(restarted.starterSeat, 'p2');
      expectStatus(await request(`rooms/${optionalCode}`, { method: 'DELETE', admin: true }), 200);
    });
    await check(`${mode}: a viewer can join after completion and sees the complete results`, async () => {
      let current = expectStatus(await writeRoom(initialRoom(optionalCode, 'futbol', mode), 'p1'), 200);
      current = await command(current, 'p1', 'start', payload);
      while (current.status === 'playing') current = await command(current, 'p1', ...move(current));
      await joinSpectator(optionalCode);
      const joined = expectStatus(await readRoom(optionalCode, 'p2'), 200);
      assert.equal(joined.status, 'finished');
      assert.deepEqual(joined.game, current.game);
      assert.equal(joined.revision, current.revision);
      expectStatus(await request(`rooms/${optionalCode}`, { method: 'DELETE', admin: true }), 200);
    });
    await check(`${mode}: joining the vacant waiting seat also preserves the round revision`, async () => {
      const current = expectStatus(await writeRoom(initialRoom(optionalCode, 'futbol', mode), 'p1'), 200);
      await joinSpectator(optionalCode);
      const joined = expectStatus(await readRoom(optionalCode, 'p1'), 200);
      assert.equal(joined.revision, current.revision);
      assert.equal(joined.status, 'waiting');
      await command(joined, 'p1', 'start', payload);
      expectStatus(await request(`rooms/${optionalCode}`, { method: 'DELETE', admin: true }), 200);
    });
  }

  await check('two-active modes still require a second player and reject the optional spectator write route', async () => {
    const optionalCode = TEST_CODES[6];
    for (const mode of ['auction', 'team-draft']) {
      const current = expectStatus(await writeRoom(initialRoom(optionalCode, 'futbol', mode), 'p1'), 200);
      expectDenied(await request(`rooms/${optionalCode}/players/p2`, { method: 'PUT', uid: 'p2', value: { uid: 'p2', name: 'Bob' } }), 'No child-seat bypass in a two-active game');
      const withGuest = { ...current, players: { ...current.players, p2: { uid: 'p2', name: 'Bob' } } };
      const started = changeRoom(withGuest, 'p1', current.revision, 'start', mode === 'auction' ? { deck: DECK } : { triplets: TEAM_TRIPLETS });
      delete started.players.p2;
      expectDenied(await writeRoom(started, 'p1'), 'Owner cannot start a two-active game alone');
      expectStatus(await request(`rooms/${optionalCode}`, { method: 'DELETE', admin: true }), 200);
    }
  });

  const bracketCode = TEST_CODES[3];
  let bracket = await check('bracket room creation and joining preserve its mode and member identities', async () => {
    const created = expectStatus(await writeRoom(initialRoom(bracketCode, 'futbol', 'bracket'), 'p1'), 200);
    assert.equal(created.mode, 'bracket');
    const joined = await join(bracketCode);
    assert.equal(joined.players.p1.uid, 'p1');
    assert.equal(joined.players.p2.uid, 'p2');
    expectDenied(await readRoom(bracketCode, 'stranger'), 'Bracket room privacy');
    return joined;
  });
  await check('bracket start rejects a guest, wrong deck sizes, duplicate cards, mixed schemas, and swapped roles', async () => {
    const valid = changeRoom(bracket, 'p1', bracket.revision, 'start', { deck: BRACKET_DECK });
    const variants = [
      ['Guest start', 'p2', value => { value.lastAction.seat = 'p2'; }],
      ['Duplicate deck', 'p1', value => { value.game.deck[15] = value.game.deck[14]; }],
      ['Short deck', 'p1', value => { value.game.deck.pop(); }],
      ['Long deck', 'p1', value => { value.game.deck.push(999); }],
      ['Swapped active seat', 'p1', value => { value.game.activeSeat = 'p2'; }],
      ['Wrong initial pair', 'p1', value => { value.game.currentPair.right = BRACKET_DECK[2]; }],
      ['Preselected match', 'p1', value => { value.game.choices = { m1: BRACKET_DECK[0] }; }],
      ['Auction fields', 'p1', value => { value.game.highestBid = 1; }],
      ['Team fields', 'p1', value => { value.game.assignmentCount = 0; }],
    ];
    for (const [label, uid, mutate] of variants) {
      const forged = structuredClone(valid); mutate(forged);
      expectDenied(await writeRoom(forged, uid), label);
    }
  });
  bracket = await check('bracket owner starts an exact sixteen-card tree with one active player', async () => {
    const started = await command(bracket, 'p1', 'start', { deck: BRACKET_DECK });
    assert.equal(started.game.matchIndex, 0);
    assert.equal(started.game.round, 1);
    assert.equal(started.game.activeSeat, 'p1');
    assert.deepEqual(started.game.deck, BRACKET_DECK);
    assert.deepEqual(started.game.currentPair, { left: BRACKET_DECK[0], right: BRACKET_DECK[1] });
    assert.equal(Object.keys(started.game.choices || {}).length, 0);
    return started;
  });
  await check('bracket spectator cannot select a winner or use another mode command', async () => {
    const valid = changeRoom(bracket, 'p1', bracket.revision, 'choose', { cardId: bracket.game.currentPair.left });
    const spectator = structuredClone(valid); spectator.lastAction.seat = 'p2';
    expectDenied(await writeRoom(spectator, 'p2'), 'Spectator choose');
    for (const kind of ['rank', 'bid', 'assign']) {
      const wrongCommand = structuredClone(valid); wrongCommand.lastAction.kind = kind;
      expectDenied(await writeRoom(wrongCommand, 'p1'), 'Cross-mode command');
    }
  });
  bracket = await check('bracket choice advances exactly one match and synchronizes its winner to the spectator', async () => {
    const chosen = await command(bracket, 'p1', 'choose', { cardId: BRACKET_DECK[1] });
    assert.deepEqual(chosen.game.choices, { m1: BRACKET_DECK[1] });
    assert.equal(chosen.game.matchIndex, 1);
    assert.deepEqual(chosen.game.lastChoice, { cardId: BRACKET_DECK[1], loserId: BRACKET_DECK[0], matchIndex: 0, round: 1, sequence: 1 });
    assert.deepEqual(chosen.game.currentPair, { left: BRACKET_DECK[2], right: BRACKET_DECK[3] });
    assert.deepEqual(expectStatus(await readRoom(bracketCode, 'p2'), 200).game, chosen.game);
    return chosen;
  });
  await check('bracket rejects forged winners, history deletion, bulk matches, altered decks, and malformed progress', async () => {
    const valid = changeRoom(bracket, 'p1', bracket.revision, 'choose', { cardId: bracket.game.currentPair.left });
    const variants = [
      ['Outside winner', value => { value.game.choices.m2 = 999; value.game.lastChoice.cardId = 999; }],
      ['Rewrite previous winner', value => { value.game.choices.m1 = BRACKET_DECK[0]; }],
      ['Delete previous winner', value => { delete value.game.choices.m1; }],
      ['Skip a match', value => { value.game.matchIndex = 3; value.game.choices.m3 = BRACKET_DECK[4]; value.game.currentPair = { left: BRACKET_DECK[6], right: BRACKET_DECK[7] }; value.game.lastChoice.sequence = 3; }],
      ['Change deck', value => { value.game.deck[15] = 999; }],
      ['Delete deck entry', value => { value.game.deck.pop(); }],
      ['Wrong next pair', value => { value.game.currentPair.left = BRACKET_DECK[8]; }],
      ['Wrong round', value => { value.game.round = 2; }],
      ['Wrong loser', value => { value.game.lastChoice.loserId = 999; }],
      ['Wrong sequence', value => { value.game.lastChoice.sequence = 1; }],
      ['Missing metadata', value => { value.game.lastChoice = null; }],
      ['Unknown match key', value => { value.game.choices.m16 = BRACKET_DECK[0]; }],
      ['Unknown pair field', value => { value.game.currentPair.extra = true; }],
      ['Unknown metadata field', value => { value.game.lastChoice.extra = true; }],
      ['Unknown game field', value => { value.game.extra = true; }],
      ['Stale revision', value => { value.revision = bracket.revision; }],
      ['Swap active seat', value => { value.game.activeSeat = 'p2'; }],
      ['Premature champion', value => { value.game.phase = 'finished'; value.status = 'finished'; value.game.currentPair = null; value.game.winnerId = BRACKET_DECK[2]; }],
    ];
    for (const [label, mutate] of variants) {
      const forged = structuredClone(valid); mutate(forged);
      expectDenied(await writeRoom(forged, 'p1'), label);
    }
    assert.deepEqual(expectStatus(await readRoom(bracketCode), 200).game, bracket.game);
  });
  bracket = await check('same-ETag concurrent bracket choices commit exactly once', async () => {
    const snapshot = await readRoom(bracketCode, 'p1', { 'X-Firebase-ETag': 'true' }); expectStatus(snapshot, 200);
    assert.ok(snapshot.etag, 'Bracket integration requires a server ETag.');
    const left = changeRoom(snapshot.body, 'p1', snapshot.body.revision, 'choose', { cardId: snapshot.body.game.currentPair.left });
    const right = changeRoom(snapshot.body, 'p1', snapshot.body.revision, 'choose', { cardId: snapshot.body.game.currentPair.right });
    const responses = await Promise.all([writeRoom(left, 'p1', { 'If-Match': snapshot.etag }), writeRoom(right, 'p1', { 'If-Match': snapshot.etag })]);
    assert.deepEqual(responses.map(result => result.status).sort((a, b) => a - b), [200, 412]);
    const current = expectStatus(await readRoom(bracketCode, 'p2'), 200);
    assert.equal(current.game.matchIndex, 2);
    assert.equal(current.game.choices.m1, BRACKET_DECK[1]);
    return current;
  });
  bracket = await check('fifteen bracket choices follow every knockout round and finish with one champion', async () => {
    let current = bracket;
    while (current.status === 'playing') {
      const previous = current;
      current = await command(current, 'p1', 'choose', { cardId: previous.game.currentPair.right });
      assert.equal(current.game.matchIndex, previous.game.matchIndex + 1);
      assert.equal(current.game.choices['m' + current.game.matchIndex], previous.game.currentPair.right);
      assert.equal(current.game.round, current.game.matchIndex < 8 ? 1 : current.game.matchIndex < 12 ? 2 : current.game.matchIndex < 14 ? 3 : 4);
      for (const [match, id] of Object.entries(previous.game.choices || {})) assert.equal(current.game.choices[match], id);
    }
    assert.equal(current.game.matchIndex, 15);
    assert.equal(Object.keys(current.game.choices).length, 15);
    assert.equal(current.game.currentPair ?? null, null);
    assert.equal(current.game.winnerId, current.game.choices.m15);
    const extra = structuredClone(current); extra.revision += 1; extra.lastAction = { kind: 'choose', seat: 'p1' };
    expectDenied(await writeRoom(extra, 'p1'), 'Choose after completion');
    return current;
  });
  bracket = await check('bracket rematch preserves the room and swaps active and spectator roles', async () => {
    const restarted = await command(bracket, 'p2', 'rematch', { deck: [...BRACKET_DECK].reverse() });
    assert.equal(restarted.code, bracketCode); assert.equal(restarted.mode, 'bracket'); assert.equal(restarted.round, 2);
    assert.equal(restarted.starterSeat, 'p2'); assert.equal(restarted.game.activeSeat, 'p2'); assert.equal(restarted.game.matchIndex, 0);
    assert.equal(Object.keys(restarted.game.choices || {}).length, 0);
    const valid = changeRoom(restarted, 'p2', restarted.revision, 'choose', { cardId: restarted.game.currentPair.left });
    const formerActive = structuredClone(valid); formerActive.lastAction.seat = 'p1';
    expectDenied(await writeRoom(formerActive, 'p1'), 'Former active player');
    return await command(restarted, 'p2', 'choose', { cardId: restarted.game.currentPair.left });
  });
  await check('both bracket members resume the same progressed tree after rematch', async () => {
    for (const uid of ['p1', 'p2']) {
      const recovered = expectStatus(await readRoom(bracketCode, uid), 200);
      assert.equal(seatFor(recovered, uid), uid); assert.equal(recovered.game.activeSeat, 'p2');
      assert.deepEqual(recovered.game, bracket.game);
    }
    const path = 'presence/' + bracketCode + '/p1/bracket-spectator-tab';
    expectStatus(await request(path, { method: 'PUT', uid: 'p1', value: { connectedAt: TIMESTAMP } }), 200);
    expectStatus(await request(path, { method: 'DELETE', uid: 'p1' }), 200);
    expectStatus(await request('reactions/' + bracketCode + '/p1', { method: 'PUT', uid: 'p1', value: { seq: 1, type: 'angry', sentAt: TIMESTAMP } }), 200);
  });

  await check('bracket sizes are restricted to its mode and cannot be added, removed, or changed later', async () => {
    const sizeCode = TEST_CODES[8];
    const invalidMode = { ...initialRoom(sizeCode), bracketSize: 32 };
    expectDenied(await writeRoom(invalidMode, 'p1'), 'Bracket option on an auction');
    for (const size of [8, 24, 64, '32']) expectDenied(await writeRoom({ ...initialRoom(sizeCode, 'futbol', 'bracket'), bracketSize: size }, 'p1'), 'Invalid bracket size');
    let current = expectStatus(await writeRoom({ ...initialRoom(sizeCode, 'futbol', 'bracket'), bracketSize: 32 }, 'p1'), 200);
    const changed = structuredClone(current); changed.bracketSize = 16;
    expectDenied(await writeRoom(changed, 'p1'), 'Immutable bracket size');
    const removed = structuredClone(current); delete removed.bracketSize;
    expectDenied(await writeRoom(removed, 'p1'), 'Removed bracket size');
    expectStatus(await request(`rooms/${sizeCode}`, { method: 'DELETE', admin: true }), 200);
    current = expectStatus(await writeRoom(initialRoom(sizeCode, 'futbol', 'bracket'), 'p1'), 200);
    const appended = { ...current, bracketSize: 32 };
    expectDenied(await writeRoom(appended, 'p1'), 'Adding size to a legacy sixteen-card room');
    expectStatus(await request(`rooms/${sizeCode}`, { method: 'DELETE', admin: true }), 200);
  });
  let bracket32;
  await check('a thirty-two-card bracket starts solo and rejects wrong sizes, duplicates, and forged progress', async () => {
    const sizeCode = TEST_CODES[8];
    const deck = DATASETS.futbol.slice(0, 32).map(card => card.id);
    const current = expectStatus(await writeRoom({ ...initialRoom(sizeCode, 'futbol', 'bracket'), bracketSize: 32 }, 'p1'), 200);
    const valid = changeRoom(current, 'p1', current.revision, 'start', { deck });
    const variants = [
      ['Sixteen-card tree in a thirty-two room', value => { value.game.deck = value.game.deck.slice(0, 16); }],
      ['Thirty-three cards', value => { value.game.deck.push(999); }],
      ['Repeated tail card', value => { value.game.deck[31] = value.game.deck[0]; }],
      ['Skipped opening match', value => { value.game.matchIndex = 1; value.game.choices = { m1: deck[0] }; }],
      ['Wrong initial round', value => { value.game.round = 2; }],
      ['Out-of-tree initial pair', value => { value.game.currentPair.left = deck[16]; }],
    ];
    for (const [label, mutate] of variants) { const forged = structuredClone(valid); mutate(forged); expectDenied(await writeRoom(forged, 'p1'), label); }
    bracket32 = await command(current, 'p1', 'start', { deck });
    assert.equal(bracket32.game.deck.length, 32); assert.equal(bracket32.game.round, 1);
    const shortTree = changeRoom({ ...current, bracketSize: 16 }, 'p1', current.revision, 'start', { deck });
    expectDenied(await writeRoom(shortTree, 'p1'), 'Changing bracket room size during start');
  });
  await check('thirty-two cards pass five rounds and thirty-one choices with a late spectator and exact history', async () => {
    let current = bracket32;
    const expectedRound = index => index < 16 ? 1 : index < 24 ? 2 : index < 28 ? 3 : index < 30 ? 4 : 5;
    while (current.status === 'playing') {
      assert.equal(current.game.round, expectedRound(current.game.matchIndex));
      const previous = current;
      if (current.game.matchIndex === 10) {
        await joinSpectator(current.code);
        current = expectStatus(await readRoom(current.code, 'p1'), 200);
        assert.deepEqual(current.game, previous.game);
        const forbidden = changeRoom(current, 'p1', current.revision, 'choose', { cardId: current.game.currentPair.left }); forbidden.lastAction.seat = 'p2';
        expectDenied(await writeRoom(forbidden, 'p2'), 'Late viewer cannot select');
      }
      current = await command(current, 'p1', 'choose', { cardId: current.game.currentPair.left });
      assert.equal(current.game.matchIndex, previous.game.matchIndex + 1);
      for (const [key, id] of Object.entries(previous.game.choices || {})) assert.equal(current.game.choices[key], id);
      if (current.players.p2) assert.deepEqual(expectStatus(await readRoom(current.code, 'p2'), 200).game, current.game);
    }
    assert.equal(current.game.matchIndex, 31); assert.equal(current.game.round, 5);
    assert.equal(Object.keys(current.game.choices).length, 31); assert.equal(current.game.winnerId, current.game.choices.m31);
    const restarted = await command(current, 'p2', 'rematch', { deck: [...current.game.deck].reverse() });
    assert.equal(restarted.bracketSize, 32); assert.equal(restarted.game.activeSeat, 'p2'); assert.equal(restarted.game.deck.length, 32);
    assert.equal(restarted.game.matchIndex, 0); assert.equal(restarted.game.choices?.m31 ?? null, null);
    bracket32 = restarted;
  });
  await check('thirty-two-card transitions reject removed history, bulk choices, out-of-tree matches, and extra winners', async () => {
    let current = await command(bracket32, 'p2', 'choose', { cardId: bracket32.game.currentPair.left });
    const valid = changeRoom(current, 'p2', current.revision, 'choose', { cardId: current.game.currentPair.right });
    const variants = [
      ['Removed history', value => { delete value.game.choices.m1; }],
      ['Rewritten history', value => { value.game.choices.m1 = current.game.deck[1]; }],
      ['Bulk future choices', value => { value.game.choices.m3 = current.game.deck[4]; value.game.matchIndex = 3; }],
      ['Forged future pair', value => { value.game.currentPair.right = current.game.deck[31]; }],
      ['Premature winner', value => { value.game.winnerId = current.game.deck[0]; }],
      ['Choice beyond thirty-one', value => { value.game.choices.m32 = current.game.deck[0]; }],
      ['Changed size', value => { value.bracketSize = 16; }],
      ['Removed size', value => { delete value.bracketSize; }],
    ];
    for (const [label, mutate] of variants) { const forged = structuredClone(valid); mutate(forged); expectDenied(await writeRoom(forged, 'p2'), label); }
    current = await command(current, 'p2', 'choose', { cardId: current.game.currentPair.right });
    assert.equal(current.game.matchIndex, 2);
  });

  const teamCode = TEST_CODES[4];
  let team = await check('team-draft room creates and joins with both player identities', async () => {
    expectStatus(await writeRoom(initialRoom(teamCode, 'futbol', 'team-draft'), 'p1'), 200);
    const joined = await join(teamCode);
    assert.equal(joined.mode, 'team-draft');
    expectDenied(await readRoom(teamCode, 'stranger'), 'Team room privacy');
    return joined;
  });
  await check('team start rejects a guest, wrong triplet counts, duplicate cards, missing players, and mixed schemas', async () => {
    const valid = changeRoom(team, 'p1', team.revision, 'start', { triplets: TEAM_TRIPLETS });
    const variants = [
      ['Guest start', 'p2', value => { value.lastAction.seat = 'p2'; }],
      ['Short triplet list', 'p1', value => { value.game.triplets.pop(); }],
      ['Long triplet list', 'p1', value => { value.game.triplets.push(value.game.triplets[0]); }],
      ['Duplicate triplet card', 'p1', value => { value.game.triplets[0].cards[2] = value.game.triplets[0].cards[1]; }],
      ['Short triplet', 'p1', value => { value.game.triplets[0].cards.pop(); }],
      ['Long triplet', 'p1', value => { value.game.triplets[0].cards.push(999); }],
      ['Missing label', 'p1', value => { delete value.game.triplets[0].etiket; }],
      ['Unknown triplet field', 'p1', value => { value.game.triplets[0].extra = true; }],
      ['Missing player', 'p1', value => { delete value.game.players.p2; }],
      ['Third player', 'p1', value => { value.game.players.p3 = value.game.players.p1; }],
      ['Initial assignment', 'p1', value => { value.game.players.p1.pending = { start: TEAM_TRIPLETS[0].cards[0] }; value.game.assignmentCount = 1; }],
      ['Bracket fields', 'p1', value => { value.game.matchIndex = 0; }],
      ['Invalid reuse policy', 'p1', value => { value.game.reusePolicy = 'unlimited'; }],
    ];
    for (const [label, uid, mutate] of variants) {
      const forged = structuredClone(valid); mutate(forged);
      expectDenied(await writeRoom(forged, uid), label);
    }
  });
  team = await check('team owner starts eleven shared triplets with two independent empty selections', async () => {
    const started = await command(team, 'p1', 'start', { triplets: TEAM_TRIPLETS });
    assert.deepEqual(started.game.triplets, TEAM_TRIPLETS);
    assert.equal(started.game.assignmentCount, 0); assert.equal(started.game.reusePolicy, 'pool-reset');
    for (const seat of ['p1', 'p2']) {
      assert.equal(started.game.players[seat].roundIndex, 0); assert.equal(started.game.players[seat].done, false);
      assert.equal(Object.keys(started.game.players[seat].pending || {}).length, 0);
      assert.equal(Object.keys(started.game.players[seat].selections || {}).length, 0);
    }
    return started;
  });
  team = await check('either team member may assign one own role while preserving the opponent', async () => {
    const originalP2 = structuredClone(team.game.players.p2);
    let current = await command(team, 'p1', 'assign', { role: 'start', cardId: TEAM_TRIPLETS[0].cards[0] });
    assert.deepEqual(current.game.players.p2, originalP2);
    assert.deepEqual(current.game.players.p1.pending, { start: TEAM_TRIPLETS[0].cards[0] });
    const previousP1 = structuredClone(current.game.players.p1);
    current = await command(current, 'p2', 'assign', { role: 'cut', cardId: TEAM_TRIPLETS[0].cards[0] });
    assert.deepEqual(current.game.players.p1, previousP1);
    assert.deepEqual(current.game.players.p2.pending, { cut: TEAM_TRIPLETS[0].cards[0] });
    assert.equal(current.game.assignmentCount, 2);
    assert.deepEqual(expectStatus(await readRoom(teamCode, 'p2'), 200).game, current.game);
    return current;
  });
  await check('team rules reject role overwrites, duplicate cards, opponent edits, bulk progress, forged metadata, and deck changes', async () => {
    const valid = changeRoom(team, 'p1', team.revision, 'assign', { role: 'bench', cardId: TEAM_TRIPLETS[0].cards[1] });
    const variants = [
      ['Overwrite locked role', value => { value.game.players.p1.pending.start = TEAM_TRIPLETS[0].cards[2]; }],
      ['Remove locked role', value => { delete value.game.players.p1.pending.start; }],
      ['Duplicate chosen card', value => { value.game.players.p1.pending.bench = TEAM_TRIPLETS[0].cards[0]; value.game.lastAssignment.cardId = TEAM_TRIPLETS[0].cards[0]; }],
      ['Outside triplet card', value => { value.game.players.p1.pending.bench = 999; value.game.lastAssignment.cardId = 999; }],
      ['Invalid role', value => { delete value.game.players.p1.pending.bench; value.game.players.p1.pending.captain = TEAM_TRIPLETS[0].cards[1]; value.game.lastAssignment.role = 'captain'; }],
      ['Change opponent role', value => { value.game.players.p2.pending.cut = TEAM_TRIPLETS[0].cards[1]; }],
      ['Remove opponent role', value => { delete value.game.players.p2.pending; }],
      ['Advance opponent', value => { value.game.players.p2.roundIndex = 1; value.game.players.p2.pending = {}; value.game.players.p2.selections = { r1: { start: TEAM_TRIPLETS[0].cards[0], bench: TEAM_TRIPLETS[0].cards[1], cut: TEAM_TRIPLETS[0].cards[2] } }; value.game.assignmentCount += 2; }],
      ['Change triplet card', value => { value.game.triplets[10].cards[2] = 999; }],
      ['Change triplet label', value => { value.game.triplets[10].etiket = 'OTHER'; }],
      ['Delete triplet', value => { value.game.triplets.pop(); }],
      ['Skip own round', value => { value.game.players.p1.roundIndex = 1; }],
      ['Bulk assignment', value => { value.game.players.p1.pending.cut = TEAM_TRIPLETS[0].cards[2]; value.game.assignmentCount += 1; value.game.lastAssignment.sequence += 1; }],
      ['Wrong assignment count', value => { value.game.assignmentCount += 1; }],
      ['Wrong metadata seat', value => { value.game.lastAssignment.seat = 'p2'; }],
      ['Wrong metadata round', value => { value.game.lastAssignment.roundIndex = 1; }],
      ['Wrong metadata sequence', value => { value.game.lastAssignment.sequence = 1; }],
      ['Missing metadata', value => { value.game.lastAssignment = null; }],
      ['Unknown metadata field', value => { value.game.lastAssignment.extra = true; }],
      ['Unknown player field', value => { value.game.players.p1.extra = true; }],
      ['Unknown game field', value => { value.game.extra = true; }],
      ['Premature finish', value => { value.game.phase = 'finished'; value.status = 'finished'; }],
      ['Stale revision', value => { value.revision = team.revision; }],
      ['Member spoof', value => { value.players.p1.uid = 'stranger'; }],
    ];
    for (const [label, mutate] of variants) {
      const forged = structuredClone(valid); mutate(forged);
      expectDenied(await writeRoom(forged, 'p1'), label);
    }
    const crossMode = structuredClone(valid); crossMode.lastAction.kind = 'choose';
    expectDenied(await writeRoom(crossMode, 'p1'), 'Cross-mode choose');
    const spoof = structuredClone(valid); spoof.lastAction.seat = 'p2';
    expectDenied(await writeRoom(spoof, 'p1'), 'LastAction sender spoof');
    assert.deepEqual(expectStatus(await readRoom(teamCode), 200).game, team.game);
  });
  let teamRaceCursors;
  team = await check('simultaneous team assignments both commit through cursor-preserving transaction retries', async () => {
    const snapshot = await readRoom(teamCode, 'p1', { 'X-Firebase-ETag': 'true' }); expectStatus(snapshot, 200);
    assert.ok(snapshot.etag, 'Team integration requires a server ETag.');
    teamRaceCursors = Object.fromEntries(['p1', 'p2'].map(uid => [uid, captureTeamCursor(snapshot.body, uid)]));
    const moves = {
      p1: { role: 'bench', cardId: TEAM_TRIPLETS[0].cards[1] },
      p2: { role: 'start', cardId: TEAM_TRIPLETS[0].cards[2] },
    };
    // REST If-Match models runTransaction's compare/retry step. Each reducer
    // retry keeps its original own-player cursor while using the latest room.
    const commit = async uid => {
      let attempt = snapshot;
      const statuses = [];
      for (let retry = 0; retry < 3; retry++) {
        assert.ok(isTeamCursorCurrent(attempt.body, uid, teamRaceCursors[uid]));
        const next = assignWithTeamCursor(attempt.body, uid, teamRaceCursors[uid], moves[uid]);
        const response = await writeRoom(next, uid, { 'If-Match': attempt.etag });
        statuses.push(response.status);
        if (response.status === 200) return { room: response.body, statuses };
        expectStatus(response, 412, 'Concurrent assignment retries after an ETag conflict');
        attempt = await readRoom(teamCode, uid, { 'X-Firebase-ETag': 'true' });
        expectStatus(attempt, 200); assert.ok(attempt.etag);
      }
      throw new Error('Team transaction exhausted its bounded retry attempts.');
    };
    const committed = await Promise.all(['p1', 'p2'].map(commit));
    assert.deepEqual(committed.flatMap(result => result.statuses).sort((a, b) => a - b), [200, 200, 412]);
    for (const result of committed) assert.equal(result.statuses.at(-1), 200);
    const current = expectStatus(await readRoom(teamCode), 200);
    assert.equal(current.revision, snapshot.body.revision + 2);
    assert.equal(current.game.assignmentCount, 4);
    assert.deepEqual(current.game.players.p1.pending, { start: TEAM_TRIPLETS[0].cards[0], bench: TEAM_TRIPLETS[0].cards[1] });
    assert.deepEqual(current.game.players.p2.pending, { cut: TEAM_TRIPLETS[0].cards[0], start: TEAM_TRIPLETS[0].cards[2] });
    return current;
  });
  await check('an already-advanced own team cursor rejects a second stale move without writing', async () => {
    const moves = {
      p1: { role: 'cut', cardId: TEAM_TRIPLETS[0].cards[2] },
      p2: { role: 'bench', cardId: TEAM_TRIPLETS[0].cards[1] },
    };
    for (const uid of ['p1', 'p2']) {
      assert.equal(isTeamCursorCurrent(team, uid, teamRaceCursors[uid]), false);
      assert.throws(() => assignWithTeamCursor(team, uid, teamRaceCursors[uid], moves[uid]));
    }
    assert.deepEqual(expectStatus(await readRoom(teamCode), 200), team,
      'A stale own cursor never sends a second assignment to the server.');
  });
  team = await check('third own assignment locks one complete round and leaves the opponent at its independent round', async () => {
    const previousP2 = structuredClone(team.game.players.p2);
    const current = await command(team, 'p1', 'assign', { role: 'cut', cardId: TEAM_TRIPLETS[0].cards[2] });
    assert.equal(current.game.players.p1.roundIndex, 1);
    assert.equal(Object.keys(current.game.players.p1.pending || {}).length, 0);
    assert.deepEqual(current.game.players.p1.selections.r1, { start: TEAM_TRIPLETS[0].cards[0], bench: TEAM_TRIPLETS[0].cards[1], cut: TEAM_TRIPLETS[0].cards[2] });
    assert.deepEqual(current.game.players.p2, previousP2);
    assert.equal(current.status, 'playing');
    return current;
  });
  await check('team rules preserve completed history when assigning a later round', async () => {
    const valid = changeRoom(team, 'p1', team.revision, 'assign', { role: 'start', cardId: TEAM_TRIPLETS[1].cards[0] });
    const rewrite = structuredClone(valid); rewrite.game.players.p1.selections.r1.start = TEAM_TRIPLETS[0].cards[1];
    expectDenied(await writeRoom(rewrite, 'p1'), 'Rewrite completed own history');
    const removal = structuredClone(valid); delete removal.game.players.p1.selections;
    expectDenied(await writeRoom(removal, 'p1'), 'Delete completed own history');
    const foreignHistory = structuredClone(valid); foreignHistory.game.players.p2.selections = { r1: valid.game.players.p1.selections.r1 };
    expectDenied(await writeRoom(foreignHistory, 'p1'), 'Write opponent history');
  });
  team = await check('one complete team waits for the other and rejects extra choices', async () => {
    let current = team;
    while (!current.game.players.p1.done) {
      const player = current.game.players.p1;
      const triple = current.game.triplets[player.roundIndex];
      const role = ['start', 'bench', 'cut'].find(role => !player.pending?.[role]);
      const cardId = triple.cards.find(id => !Object.values(player.pending || {}).includes(id));
      current = await command(current, 'p1', 'assign', { role, cardId });
    }
    assert.equal(current.game.players.p1.roundIndex, 11); assert.equal(current.game.players.p1.done, true);
    assert.equal(Object.keys(current.game.players.p1.selections).length, 11);
    assert.equal(current.game.players.p2.roundIndex, 0); assert.equal(current.game.players.p2.done, false);
    assert.equal(current.status, 'playing'); assert.equal(current.game.assignmentCount, 35);
    const extra = structuredClone(current); extra.revision += 1; extra.lastAction = { kind: 'assign', seat: 'p1' };
    extra.game.assignmentCount += 1; extra.game.lastAssignment = { seat: 'p1', role: 'start', cardId: TEAM_TRIPLETS[0].cards[0], roundIndex: 0, sequence: 36 };
    expectDenied(await writeRoom(extra, 'p1'), 'Completed player cannot assign');
    return current;
  });
  team = await check('both teams finish after sixty-six explicit assignments with eleven Start selections each', async () => {
    let current = team;
    while (!current.game.players.p2.done) {
      const player = current.game.players.p2;
      const triple = current.game.triplets[player.roundIndex];
      const role = ['cut', 'bench', 'start'].find(role => !player.pending?.[role]);
      const cardId = [...triple.cards].reverse().find(id => !Object.values(player.pending || {}).includes(id));
      const previousP1 = structuredClone(current.game.players.p1);
      current = await command(current, 'p2', 'assign', { role, cardId });
      assert.deepEqual(current.game.players.p1, previousP1);
    }
    assert.equal(current.status, 'finished'); assert.equal(current.game.phase, 'finished'); assert.equal(current.game.assignmentCount, 66);
    for (const seat of ['p1', 'p2']) {
      assert.equal(current.game.players[seat].roundIndex, 11); assert.equal(current.game.players[seat].done, true);
      assert.equal(Object.keys(current.game.players[seat].selections).length, 11);
      for (let round = 0; round < 11; round += 1) {
        assert.deepEqual(Object.values(current.game.players[seat].selections['r' + (round + 1)]).sort((a, b) => a - b), [...TEAM_TRIPLETS[round].cards].sort((a, b) => a - b));
      }
    }
    const afterFinish = structuredClone(current); afterFinish.revision += 1; afterFinish.lastAction = { kind: 'assign', seat: 'p2' };
    expectDenied(await writeRoom(afterFinish, 'p2'), 'Assignment after both teams finished');
    return current;
  });
  team = await check('team rematch keeps both identities and clears every selection while switching the starter', async () => {
    const nextTriplets = [...TEAM_TRIPLETS].reverse();
    const restarted = await command(team, 'p2', 'rematch', { triplets: nextTriplets });
    assert.equal(restarted.code, teamCode); assert.equal(restarted.mode, 'team-draft'); assert.equal(restarted.round, 2);
    assert.equal(restarted.starterSeat, 'p2'); assert.equal(restarted.game.assignmentCount, 0); assert.deepEqual(restarted.game.triplets, nextTriplets);
    for (const seat of ['p1', 'p2']) {
      assert.equal(restarted.game.players[seat].roundIndex, 0); assert.equal(restarted.game.players[seat].done, false);
      assert.equal(Object.keys(restarted.game.players[seat].pending || {}).length, 0);
      assert.equal(Object.keys(restarted.game.players[seat].selections || {}).length, 0);
    }
    return await command(restarted, 'p1', 'assign', { role: 'bench', cardId: nextTriplets[0].cards[1] });
  });
  await check('both team members resume exact private selections and may use presence and reactions', async () => {
    for (const uid of ['p1', 'p2']) {
      const recovered = expectStatus(await readRoom(teamCode, uid), 200);
      assert.equal(seatFor(recovered, uid), uid); assert.deepEqual(recovered.game, team.game);
    }
    const path = 'presence/' + teamCode + '/p2/team-tab';
    expectStatus(await request(path, { method: 'PUT', uid: 'p2', value: { connectedAt: TIMESTAMP } }), 200);
    expectDenied(await request(path, { method: 'DELETE', uid: 'p1' }), 'Delete opponent presence');
    expectStatus(await request(path, { method: 'DELETE', uid: 'p2' }), 200);
    expectStatus(await request('reactions/' + teamCode + '/p2', { method: 'PUT', uid: 'p2', value: { seq: 1, type: 'womp', sentAt: TIMESTAMP } }), 200);
    expectDenied(await request('reactions/' + teamCode + '/p1', { method: 'PUT', uid: 'p2', value: { seq: 1, type: 'heart', sentAt: TIMESTAMP } }), 'Sender spoof');
  });

} catch (error) {
  console.error(`FAIL ${error.message}`);
  process.exitCode = 1;
} finally {
  if (cleaned) {
    try { await cleanup(); } catch (error) {
      console.error(`FAIL local test cleanup: ${error.message}`);
      process.exitCode = 1;
    }
  }
  console.log(`Emulator integration: ${passed} checks passed, ${skipped} skipped${process.exitCode ? ', FAILED' : ''}.`);
}
