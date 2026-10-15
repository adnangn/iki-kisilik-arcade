import test from 'node:test';
import assert from 'node:assert/strict';
import { createRetroHeadline, renderRetroHeadline } from '../js/retro-headline.js';

const room = (mode, game = {}) => ({ code: '123456', createdAt: 100, round: 2, datasetId: 'film', status: 'finished', mode,
  players: { p1: { name: 'Ada' }, p2: { name: 'Efe' } }, game });
const cards = new Map([[1, { id: 1, isim: 'Bir Film' }], [2, { id: 2, isim: 'Başka Film' }], [900091, { id: 900091, isim: 'Teselli Filmi', teselli: true }]]);
const slots = ids => Object.fromEntries(ids.map((id, index) => [`s${index + 1}`, id]));

test('the newspaper appears only after the game is finished and tolerates RTDB omissions', () => {
  assert.equal(createRetroHeadline(null), null);
  assert.equal(createRetroHeadline({ ...room('auction'), status: 'waiting' }), null);
  assert.equal(createRetroHeadline({ ...room('auction'), status: 'playing' }), null);
  assert.ok(createRetroHeadline({ mode: 'auction', game: { phase: 'finished' } }).headline);
  assert.ok(createRetroHeadline({ status: 'finished' }).headline);
  assert.ok(createRetroHeadline({ status: 'finished', mode: 'unknown', partyGame: {} }).headline);
});

test('all eleven existing modes and the upcoming mystery box have a safe single-sentence fallback', () => {
  for (const mode of ['auction', 'sealed-auction', 'blind-ranking', 'bracket', 'team-draft', 'frequency', 'double-ranking', 'simultaneous-ranking', 'telepathy', 'detective', 'chameleon', 'mystery-box']) {
    const value = createRetroHeadline(room(mode));
    assert.ok(value.headline && value.kicker && value.meta && value.key, mode);
    assert.equal(value.headline.match(/[.!?]/g)?.length, 1, mode);
    assert.doesNotMatch(value.headline, /undefined|null|NaN|%/);
  }
});

test('headline selection is deterministic and independent of revision, jury, client time and object key order', () => {
  const first = room('auction', { budgets: { p1: 10, p2: 7 } });
  const baseline = createRetroHeadline(first);
  const second = { ...first, revision: 900, updatedAt: Date.now(), jury: { p2: true }, game: { budgets: { p2: 7, p1: 10 } } };
  assert.deepEqual(createRetroHeadline(second), baseline);
  assert.deepEqual(createRetroHeadline(JSON.parse(JSON.stringify(first))), baseline);
});

test('auction headlines distinguish actual consolation cards, paid purchases and unspent budgets', () => {
  const completion = createRetroHeadline(room('auction', { rosters: { p1: [{ id: 900091, price: 0, source: 'completion' }], p2: [{ id: 1, price: 20 }] }, budgets: { p1: 0, p2: 0 } }), { cards });
  assert.match(completion.key, /^auction-consolation-/);
  assert.match(completion.headline, /1/);
  const normalCompletion = createRetroHeadline(room('auction', { rosters: { p1: [{ id: 1, price: 0, source: 'completion' }] } }), { cards });
  assert.doesNotMatch(normalCompletion.key, /consolation/);
  const expensive = createRetroHeadline(room('auction', { rosters: { p1: [{ id: 1, price: 17 }], p2: [{ id: 2, price: 12 }] } }), { cards });
  assert.match(expensive.headline, /Bir Film/); assert.match(expensive.headline, /17 TL/); assert.match(expensive.headline, /Ada/);
  const saver = createRetroHeadline(room('sealed-auction', { budgets: { p1: 11, p2: 9 } }));
  assert.match(saver.headline, /11 TL/); assert.match(saver.headline, /Ada/);
  assert.doesNotMatch(createRetroHeadline(room('auction', { budgets: { p1: -1, p2: NaN } })).headline, /NaN|-1/);
  const splurge = createRetroHeadline(room('auction', { rosters: { p1: [{ id: 1, price: 20 }, { id: 900091, price: 0, source: 'completion' }] }, budgets: { p1: 0 } }), { cards });
  assert.match(splurge.key, /splurge/); assert.match(splurge.headline, /20 TL/); assert.match(splurge.headline, /1 teselli/);
});

test('ranking compatibility is computed only from complete matching permutations', () => {
  for (const [mode, size] of [['double-ranking', 8], ['simultaneous-ranking', 10]]) {
    const ids = Array.from({ length: size }, (_, index) => index + 1);
    const first = slots(ids), reverse = slots([...ids].reverse());
    assert.match(createRetroHeadline(room(mode, { rankings: { p1: first, p2: first } })).headline, /yüzde 100/);
    assert.match(createRetroHeadline(room(mode, { rankings: { p1: first, p2: reverse } })).headline, /yüzde 0/);
    const incomplete = createRetroHeadline(room(mode, { rankings: { p1: first, p2: { s1: 1 } }, result: { compatibility: 99 } }));
    assert.doesNotMatch(incomplete.headline, /99|yüzde/);
  }
});

test('ranking chooses a stable most compatible pair among up to four players', () => {
  const ids = Array.from({ length: 10 }, (_, index) => index + 1), source = slots(ids);
  const value = createRetroHeadline(room('simultaneous-ranking', { rankings: { p3: source, p2: source, p1: slots([...ids].reverse()) } }), { nameFor: seat => seat.toUpperCase() });
  assert.match(value.headline, /P2/); assert.match(value.headline, /P3/); assert.doesNotMatch(value.headline, /P1/);
});

test('solo finals use the actual first-ranked card or tournament champion', () => {
  const ranked = createRetroHeadline(room('blind-ranking', { activeSeat: 'p2', slots: { s1: 2 } }), { cards });
  assert.match(ranked.headline, /Başka Film/); assert.match(ranked.headline, /Efe/);
  const winner = createRetroHeadline(room('bracket', { winnerId: 1 }), { cards });
  assert.match(winner.headline, /Bir Film/);
  assert.doesNotMatch(createRetroHeadline(room('bracket', { winnerId: 9 }), { cards }).headline, /undefined|9/);
});

test('team draft counts matching Start selections without equating Bench and Cut picks', () => {
  const value = createRetroHeadline(room('team-draft', { players: {
    p1: { selections: { r1: { start: 1, bench: 2 }, r2: { start: 3 } } },
    p2: { selections: { r1: { start: 1, bench: 4 }, r2: { start: 2, bench: 3 } } },
  } }));
  assert.match(value.headline, /1/); assert.match(value.key, /matching-starts/);
});

test('cooperative headlines report actual streaks and matches without fabricating shared success', () => {
  const streak = createRetroHeadline(room('telepathy', { bestStreak: 5 }));
  assert.match(streak.headline, /5 tur/);
  const matches = createRetroHeadline(room('frequency', { bestStreak: 2, matches: 4 }));
  assert.match(matches.headline, /4/);
  const zero = createRetroHeadline(room('frequency', { bestStreak: 0, matches: 0 }));
  assert.match(zero.key, /no-match/);
  assert.doesNotMatch(createRetroHeadline(room('telepathy', { bestStreak: Infinity })).headline, /Infinity/);
});

test('detective and chameleon headlines respect the revealed round outcomes', () => {
  const solved = createRetroHeadline(room('detective', { results: { r1: { correct: true }, r2: { correct: false }, r3: { correct: true } } }));
  assert.match(solved.headline, /2/);
  const caught = createRetroHeadline(room('chameleon', { results: { r1: { caught: false }, r5: { caught: true, guessed: false } } }));
  assert.match(caught.key, /caught/);
  const saved = createRetroHeadline(room('chameleon', { results: { r5: { caught: true, guessed: true }, r1: { caught: false } } }));
  assert.match(saved.key, /last-chance/);
  const escaped = createRetroHeadline(room('chameleon', { results: { r5: { caught: false } } }));
  assert.match(escaped.key, /escaped/);
});

test('DOM renderer uses textContent for literal untrusted names and card labels', () => {
  class Node {
    constructor(tag) { this.tagName = tag; this.dataset = {}; this.children = []; this.attributes = {}; }
    append(...nodes) { this.children.push(...nodes); }
    setAttribute(key, value) { this.attributes[key] = value; }
    set innerHTML(value) { throw new Error(`Unsafe HTML write: ${value}`); }
  }
  const doc = { createElement: tag => new Node(tag) };
  const hostileName = '<img src=x onerror=alert(1)>', hostileCard = '<script>alert(2)</script>';
  const context = { document: doc, cards: { 1: { isim: hostileCard } }, nameFor: () => hostileName };
  const node = renderRetroHeadline(room('auction', { rosters: { p1: [{ id: 1, price: 18 }] } }), context);
  assert.equal(node.tagName, 'aside'); assert.equal(node.attributes['aria-label'], 'Maç sonu manşeti');
  assert.deepEqual(node.children.map(child => child.tagName), ['p', 'h3', 'p']);
  assert.ok(node.children[1].textContent.includes(hostileName)); assert.ok(node.children[1].textContent.includes(hostileCard));
  assert.equal(renderRetroHeadline({ ...room('auction'), status: 'playing' }, context), null);
});

test('card collections accept arrays and callback errors fall back to saved player labels', () => {
  const value = createRetroHeadline(room('blind-ranking', { activeSeat: 'p1', slots: { s1: 1 } }), {
    cards: [{ id: 1, isim: 'Kart' }], nameFor() { throw new Error('Missing name'); },
  });
  assert.match(value.headline, /Kart/); assert.match(value.headline, /Ada/);
  assert.equal(renderRetroHeadline(room('auction'), { document: {} }), null);
});

test('mystery box headlines count actual public returns without requiring auction rosters', () => {
  const value = createRetroHeadline(room('mystery-box', { counts: { p1: 5, p2: 5 }, results: {
    r1: { cardId: 1, decision: 'take', stamp: 'gold', ownerSeat: 'p2' },
    r2: { cardId: 2, decision: 'reject', stamp: 'trash', ownerSeat: 'p2' },
    r3: { cardId: 3, decision: 'reject', stamp: 'risk', ownerSeat: 'p1' },
  } }));
  assert.match(value.headline, /2 kutu/); assert.match(value.meta, /Kutuda Ne Var/);
});
