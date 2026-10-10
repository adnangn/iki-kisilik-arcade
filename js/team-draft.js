const SEATS = ['p1', 'p2'];
const ROLES = ['start', 'bench', 'cut'];
const ROUND_COUNT = 11;

export class TeamDraftError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'TeamDraftError';
    this.code = code;
  }
}

function reject(code, message) { throw new TeamDraftError(code, message); }
function assertSeat(seat) {
  if (!SEATS.includes(seat)) reject('INVALID_SEAT', 'Geçerli bir oyuncu koltuğu seçilmedi.');
}
function validateTriplets(triplets) {
  if (!Array.isArray(triplets) || triplets.length !== ROUND_COUNT) {
    reject('INVALID_TRIPLETS', 'Takım kurmak için 11 üçlü kart grubu gerekir.');
  }
  const labels = new Map();
  return triplets.map(triple => {
    if (!triple || typeof triple.etiket !== 'string' || !triple.etiket.trim() ||
        !Array.isArray(triple.cards) || triple.cards.length !== 3 ||
        triple.cards.some(id => !Number.isSafeInteger(id) || id < 1) || new Set(triple.cards).size !== 3) {
      reject('INVALID_TRIPLETS', 'Her tur aynı etiketten üç benzersiz pozitif kart kimliği gerekir.');
    }
    for (const id of triple.cards) {
      if (labels.has(id) && labels.get(id) !== triple.etiket) {
        reject('INVALID_TRIPLETS', 'Tekrar kullanılan bir kartın etiketi değişemez.');
      }
      labels.set(id, triple.etiket);
    }
    return { etiket: triple.etiket, cards: [...triple.cards] };
  });
}
function emptyPlayer() { return { roundIndex: 0, pending: {}, selections: {}, done: false }; }
function normalizeRoles(source, cards, complete) {
  const roles = source ?? {};
  if (typeof roles !== 'object' || Array.isArray(roles)) reject('INVALID_GAME', 'Takım seçimleri geçersiz.');
  const next = {};
  for (const [role, id] of Object.entries(roles)) {
    if (!ROLES.includes(role) || !cards.includes(id)) reject('INVALID_GAME', 'Rol veya seçilen kart geçersiz.');
    next[role] = id;
  }
  const ids = Object.values(next);
  if (new Set(ids).size !== ids.length || (complete ? ids.length !== 3 : ids.length > 2)) {
    reject('INVALID_GAME', 'Bir kart tek rol alır ve her rol yalnızca bir kez seçilir.');
  }
  return next;
}

/** The local picker supplies all 11 triplets before entering the transaction. */
export function createTeamDraft(triplets) {
  return {
    phase: 'playing', triplets: validateTriplets(triplets), reusePolicy: 'pool-reset',
    players: { p1: emptyPlayer(), p2: emptyPlayer() }, assignmentCount: 0, lastAssignment: null,
  };
}

/** Cross-round reuse is legal after the picker's pool reset; each triplet stays unique. */
export function normalizeTeamDraft(game) {
  if (!game || typeof game !== 'object' || Array.isArray(game)) reject('INVALID_GAME', 'Takım kurma durumu bulunamadı.');
  const triplets = validateTriplets(game.triplets);
  if (game.reusePolicy !== 'pool-reset') reject('INVALID_GAME', 'Kart havuzu yenileme kuralı geçersiz.');
  const players = {};
  let assignmentCount = 0;
  for (const seat of SEATS) {
    const player = game.players?.[seat];
    const index = player?.roundIndex;
    if (!player || !Number.isSafeInteger(index) || index < 0 || index > ROUND_COUNT ||
        player.done !== (index === ROUND_COUNT)) {
      reject('INVALID_GAME', 'Oyuncunun tur sırası geçersiz.');
    }
    const source = player.selections ?? {};
    if (typeof source !== 'object' || Array.isArray(source) || Object.keys(source).length !== index ||
        Object.keys(source).some(key => !/^r([1-9]|1[01])$/.test(key))) {
      reject('INVALID_GAME', 'Tamamlanan takım turları geçersiz.');
    }
    const selections = {};
    for (let round = 0; round < index; round += 1) {
      const key = `r${round + 1}`;
      selections[key] = normalizeRoles(source[key], triplets[round].cards, true);
    }
    const pending = normalizeRoles(player.pending, index === ROUND_COUNT ? [] : triplets[index].cards, false);
    players[seat] = { roundIndex: index, pending, selections, done: player.done };
    assignmentCount += index * 3 + Object.keys(pending).length;
  }
  const finished = players.p1.done && players.p2.done;
  if (game.phase !== (finished ? 'finished' : 'playing') || game.assignmentCount !== assignmentCount) {
    reject('INVALID_GAME', 'Oyun evresi veya seçim sayısı uyuşmuyor.');
  }
  const last = game.lastAssignment ?? null;
  if (assignmentCount === 0) {
    if (last !== null) reject('INVALID_GAME', 'İlk karttan önce rol seçimi olamaz.');
  } else {
    if (!last || !SEATS.includes(last.seat) || !ROLES.includes(last.role) ||
        !Number.isInteger(last.roundIndex) || last.roundIndex < 0 || last.roundIndex >= ROUND_COUNT ||
        last.sequence !== assignmentCount || !triplets[last.roundIndex].cards.includes(last.cardId)) {
      reject('INVALID_GAME', 'Son rol seçimi geçersiz.');
    }
    const player = players[last.seat];
    const selected = player.roundIndex === last.roundIndex ? player.pending[last.role] :
      player.roundIndex === last.roundIndex + 1 && Object.keys(player.pending).length === 0 ?
        player.selections[`r${last.roundIndex + 1}`]?.[last.role] : null;
    if (selected !== last.cardId) reject('INVALID_GAME', 'Son rol seçimi oyuncunun turuyla uyuşmuyor.');
  }
  return {
    phase: game.phase, triplets, reusePolicy: game.reusePolicy, players, assignmentCount,
    lastAssignment: last ? { seat: last.seat, role: last.role, cardId: last.cardId,
      roundIndex: last.roundIndex, sequence: last.sequence } : null,
  };
}

export function assignTeamCard(game, seat, role, cardId) {
  assertSeat(seat);
  const next = normalizeTeamDraft(game);
  if (next.phase !== 'playing') reject('GAME_FINISHED', 'İki takım da tamamlandı.');
  const player = next.players[seat];
  if (player.done) reject('PLAYER_FINISHED', 'İlk 11 tamamlandı. Rakibinin seçimlerini bekle.');
  if (!ROLES.includes(role)) reject('INVALID_ROLE', 'Start, Bench veya Cut rollerinden birini seç.');
  if (Object.hasOwn(player.pending, role)) reject('ROLE_OCCUPIED', 'Bu rol kilitlendi.');
  if (!next.triplets[player.roundIndex].cards.includes(cardId)) reject('INVALID_CARD', 'Bu turdaki üç karttan birini seç.');
  if (Object.values(player.pending).includes(cardId)) reject('CARD_ASSIGNED', 'Bu kartın rolü zaten seçildi.');
  const index = player.roundIndex;
  player.pending[role] = cardId;
  next.assignmentCount += 1;
  next.lastAssignment = { seat, role, cardId, roundIndex: index, sequence: next.assignmentCount };
  if (Object.keys(player.pending).length === 3) {
    player.selections[`r${index + 1}`] = { start: player.pending.start, bench: player.pending.bench, cut: player.pending.cut };
    player.pending = {};
    player.roundIndex += 1;
    player.done = player.roundIndex === ROUND_COUNT;
  }
  if (next.players.p1.done && next.players.p2.done) next.phase = 'finished';
  return next;
}
