export class MysteryBoxError extends Error {}
export const MYSTERY_STAMPS = ['gold', 'risk', 'trash'];
const seats = ['p1', 'p2'], other = seat => seat === 'p1' ? 'p2' : 'p1';
const fail = message => { throw new MysteryBoxError(message); };
const same = (actual, expected) => {
  if (actual == null) return expected == null || expected === '' || (expected && typeof expected === 'object' && !Object.keys(expected).length);
  if (!expected || typeof expected !== 'object') return actual === expected;
  return typeof actual === 'object' && !Array.isArray(actual) && Object.keys(actual).every(key => Object.hasOwn(expected, key)) && Object.keys(expected).every(key => same(actual[key], expected[key]));
};
export function createMysteryBox(starterSeat = 'p1') {
  if (!seats.includes(starterSeat)) fail('Başlayan oyuncu geçersiz.');
  return { mode: 'mystery-box', starterSeat, giverSeat: starterSeat, responderSeat: other(starterSeat), phase: 'playing', stage: 'stamp', roundIndex: 0, counts: { p1: 0, p2: 0 }, results: {} };
}
export function mysteryChoices(game) {
  return ['take', 'reject'].filter(choice => (game.counts?.[choice === 'take' ? game.responderSeat : game.giverSeat] ?? 0) < 5);
}
function resolve(game, { cardId, decision }) {
  if (!Number.isSafeInteger(cardId) || cardId < 1 || cardId > 1000000 || Object.values(game.results).some(result => result.cardId === cardId)) fail('Bu kutunun kartı geçersiz veya daha önce açıldı.');
  if (!mysteryChoices(game).includes(decision)) fail('Bu seçim oyuncunun beş kart sınırını aşıyor.');
  const ownerSeat = decision === 'take' ? game.responderSeat : game.giverSeat;
  game.results[`r${game.roundIndex + 1}`] = { cardId, decision, stamp: game.stamp, ownerSeat };
  game.counts[ownerSeat]++;
  game.stage = game.roundIndex === 9 ? 'finished' : 'reveal';
  if (game.stage === 'finished') game.phase = 'finished';
}
function next(game) {
  game.roundIndex++; game.giverSeat = other(game.giverSeat); game.responderSeat = other(game.responderSeat);
  game.stage = 'stamp'; delete game.stamp;
}
export function normalizeMysteryBox(game) {
  if (!game || typeof game !== 'object' || !Number.isInteger(game.roundIndex) || game.roundIndex < 0 || game.roundIndex > 9) fail('Kutu oyunu geçersiz.');
  const expected = createMysteryBox(game.starterSeat), results = game.results || {};
  if (Array.isArray(results) || typeof results !== 'object' || Object.keys(results).some(key => !/^r([1-9]|10)$/.test(key))) fail('Kutu geçmişi geçersiz.');
  const total = game.roundIndex + (['reveal', 'finished'].includes(game.stage) ? 1 : 0);
  for (let index = 0; index < total; index++) {
    const result = results[`r${index + 1}`];
    if (!result || !MYSTERY_STAMPS.includes(result.stamp)) fail('Kutu geçmişi eksik.');
    expected.stamp = result.stamp; expected.stage = 'decision'; resolve(expected, result);
    if (index + 1 < total || game.stage === 'stamp' || game.stage === 'decision') next(expected);
  }
  if (game.stage === 'decision') {
    if (!MYSTERY_STAMPS.includes(game.stamp)) fail('Kutunun damgası geçersiz.');
    expected.stamp = game.stamp; expected.stage = 'decision';
  }
  if (!same(game, expected)) fail('Kutu oyunu doğrulanmış hamlelerle uyuşmuyor.');
  return expected;
}
export function changeMysteryBox(value, seat, command, payload = {}) {
  const game = normalizeMysteryBox(value);
  if (!seats.includes(seat) || game.phase !== 'playing') fail('Bu kutu oyunu şu an aktif değil.');
  if (command === 'box-stamp' && game.stage === 'stamp' && seat === game.giverSeat && MYSTERY_STAMPS.includes(payload.stamp)) {
    game.stamp = payload.stamp; game.stage = 'decision';
  } else if (command === 'box-resolve' && game.stage === 'decision') resolve(game, payload);
  else if (command === 'box-next' && game.stage === 'reveal') next(game);
  else fail('Bu kutuda hamle sırası veya evresi değişti.');
  return game;
}
export function mysteryRosters(value) {
  const game = normalizeMysteryBox(value), rosters = { p1: [], p2: [] };
  for (const [, result] of Object.entries(game.results).sort(([a], [b]) => Number(a.slice(1)) - Number(b.slice(1)))) rosters[result.ownerSeat].push({ id: result.cardId });
  return rosters;
}

/** Validate only already-revealed cards. A box intentionally has no public deck. */
export function assertMysteryCards(value, cards) {
  const game = normalizeMysteryBox(value), ids = new Set(cards.map(card => card.id));
  if (Object.values(game.results).some(result => !ids.has(result.cardId))) fail('Kutunun açılan kartları bu koleksiyonla uyuşmuyor.');
  return game;
}
