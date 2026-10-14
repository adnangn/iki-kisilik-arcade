import { RoomError } from './room-state.js';
import { DATASET_GROUPS } from './datasets.js';
import { createPartyGame, changePartyGame, resolvePartyRound, normalizePartyGame, partyCards, rankingMatrix } from './party-games.js';
import { createBlindRanking, placeBlindCard } from './blind-ranking.js';
import { createBracket, chooseBracketCard } from './bracket.js';
import { createTeamDraft, assignTeamCard } from './team-draft.js';
import { createCooperative, revealFrequency, advanceFrequency, revealDoubleRanking } from './cooperative.js';

export const PARTY_SEATS = ['p1', 'p2', 'p3', 'p4'];
export const PARTY_MODES = ['auction', 'sealed-auction', 'simultaneous-ranking', 'telepathy', 'detective', 'chameleon'];
export const ALL_MODES = [...PARTY_MODES, 'blind-ranking', 'bracket', 'team-draft', 'frequency', 'double-ranking'];
const selectable = new Set(Object.values(DATASET_GROUPS).flatMap(group => group.sets.map(set => set.id)));
export const isPartyMode = mode => PARTY_MODES.includes(mode);
export const roomSeats = room => PARTY_SEATS.filter(seat => room?.players?.[seat]);
export const partySeatFor = (room, uid) => roomSeats(room).find(seat => room.players[seat].uid === uid) || null;
export function modeLimits(mode) {
  if (!ALL_MODES.includes(mode)) throw new RoomError('Bu oyun modu desteklenmiyor.');
  if (['blind-ranking', 'bracket'].includes(mode)) return { min: 1, max: 2 };
  if (mode === 'chameleon') return { min: 3, max: 4 };
  if (['detective', 'team-draft', 'frequency', 'double-ranking'].includes(mode)) return { min: 2, max: 2 };
  return { min: 2, max: 4 };
}
export function partyConfig(value) {
  if (!value || !selectable.has(value.datasetId) || !ALL_MODES.includes(value.mode)) throw new RoomError('Geçerli bir koleksiyon ve oyun seçin.');
  const result = { datasetId: value.datasetId, mode: value.mode };
  if (value.mode === 'bracket') {
    result.bracketSize = value.bracketSize ?? 16;
    if (![16, 32].includes(result.bracketSize)) throw new RoomError('Turnuva 16 veya 32 kartla oynanabilir.');
  } else if (value.bracketSize !== undefined) throw new RoomError('Kart sayısı yalnız turnuvada seçilebilir.');
  return result;
}
export function encodePartyRoom(room) {
  if (!room || room.version !== 2 || !isPartyMode(room.mode)) return room;
  const wire = { ...room };
  if (wire.game) { wire.partyGame = { ...wire.game, deckSize: wire.game.deck.length,
    resultCount: Object.keys(wire.game.results || {}).length,
    actionCount: wire.game.actions?.length || 0,
    visibleCards: Object.fromEntries(partyCards(wire.game).map((id, index) => [id, index])),
    deckIds: Object.fromEntries(wire.game.deck.map((id, index) => [id, index])) }; delete wire.game;
    // Rankings are the stored authority; the compatibility matrix is derived.
    if (wire.mode === 'simultaneous-ranking') delete wire.partyGame.result;
    if (['auction', 'sealed-auction'].includes(wire.mode)) delete wire.partyGame.completionAwards;
  }
  return wire;
}
export function decodePartyRoom(room) {
  if (!room || room.version !== 2 || !room.partyGame) return room;
  const decoded = { ...room, game: { ...room.partyGame } }; delete decoded.partyGame; delete decoded.game.deckSize; delete decoded.game.visibleCards; delete decoded.game.deckIds; delete decoded.game.resultCount; delete decoded.game.actionCount;
  if (room.mode === 'simultaneous-ranking') decoded.game.result = decoded.game.phase === 'finished' ? rankingMatrix(decoded.game.deck, decoded.game.rankings, decoded.game.seats) : null;
  if (['auction', 'sealed-auction'].includes(room.mode)) decoded.game.completionAwards = decoded.game.seats.flatMap(seat =>
    (Object.values(decoded.game.rosters?.[seat] || {})).filter(entry => entry.source === 'completion').map(entry => ({ id: entry.id, seat, price: 0 })));
  return decoded;
}
export function createPartyRoom({ code, uid, name, createdAt, datasetId, mode, bracketSize }) {
  const config = partyConfig({ datasetId, mode, ...(mode === 'bracket' ? { bracketSize } : {}) });
  return { version: 2, code, ownerUid: uid, createdAt, ...config, status: 'waiting',
    round: 1, starterSeat: 'p1', revision: 0, players: { p1: { uid, name } } };
}
export function joinPartyRoom(value, uid, name) {
  const room = decodePartyRoom(value);
  if (!room) throw new RoomError('Bu kodla bir oda bulunamadı.');
  if (partySeatFor(room, uid)) return room;
  const lateSpectator = ['blind-ranking', 'bracket'].includes(room.mode);
  if (room.status === 'playing' && !lateSpectator) throw new RoomError('Oyun başladı. Yeni tur için sonuç ekranını bekleyin.');
  const target = room.nextGame?.mode ?? room.mode;
  const max = modeLimits(target).max;
  const seat = PARTY_SEATS.slice(0, max).find(key => !room.players[key]);
  if (!seat) throw new RoomError('Bu oyun için masa dolu.');
  const next = structuredClone(room);
  next.players[seat] = { uid, name };
  if (next.nextGame) next.nextGame.ready = Object.fromEntries(roomSeats(next).map(key => [key, false]));
  next.revision++;
  next.lastAction = { kind: 'join', seat };
  return next;
}
function rotate(room) {
  const seats = roomSeats(room);
  return seats[(seats.indexOf(room.starterSeat) + 1) % seats.length];
}
function requireCount(room, mode = room.mode) {
  const { min, max } = modeLimits(mode), count = roomSeats(room).length;
  if (count < min || count > max) throw new RoomError(`Bu oyun ${min === max ? min : `${min}–${max}`} oyuncuyla oynanır.`);
}
function initialGame(room, payload) {
  const seats = roomSeats(room);
  if (isPartyMode(room.mode)) return createPartyGame(room.mode, { ...payload, seats, starterSeat: room.starterSeat });
  if (room.mode === 'blind-ranking') return createBlindRanking(payload.deck, room.starterSeat);
  if (room.mode === 'bracket') return createBracket(payload.deck, room.starterSeat, room.bracketSize ?? 16);
  if (room.mode === 'team-draft') return createTeamDraft(payload.triplets);
  return createCooperative(room.mode, payload.deck);
}
/** Public commands are deterministic; private records are independently protected by Firebase. */
export function changePartyRoom(value, uid, revision, kind, payload = {}) {
  const room = decodePartyRoom(value), seat = partySeatFor(room, uid);
  if (!room || room.version !== 2 || !seat) throw new RoomError('Bu masanın oyuncusu değilsiniz.');
  if (room.revision !== revision) throw new RoomError('Masa güncellendi. Güncel ekrandan tekrar deneyin.');
  const next = structuredClone(room);
  if (kind === 'propose-next') {
    if (room.status !== 'finished') throw new RoomError('Oyun seçmek için bu turun bitmesini bekleyin.');
    const config = partyConfig(payload);
    if (roomSeats(room).length > modeLimits(config.mode).max) throw new RoomError('Bu oyun mevcut oyuncu sayısı için uygun değil.');
    next.nextGame = { id: revision + 1, ...config, proposedBySeat: seat,
      ready: Object.fromEntries(roomSeats(room).map(key => [key, false])) };
  } else if (kind === 'ready-next') {
    const proposal = room.nextGame;
    if (room.status !== 'finished' || !proposal || proposal.id !== payload.id || typeof payload.ready !== 'boolean') throw new RoomError('Oyun seçimi değişti. Yeni seçimi kontrol edin.');
    if (proposal.ready?.[seat] === payload.ready) throw new RoomError('Hazır durumunuz zaten güncel.');
    next.nextGame.ready[seat] = payload.ready;
    if (roomSeats(room).every(key => next.nextGame.ready[key])) {
      requireCount(room, proposal.mode);
      const config = partyConfig(proposal);
      next.datasetId = config.datasetId; next.mode = config.mode;
      if (config.bracketSize) next.bracketSize = config.bracketSize; else delete next.bracketSize;
      next.round++; next.starterSeat = rotate(room);
      next.game = initialGame(next, payload); delete next.nextGame;
      kind = 'next-game';
    }
  } else if (kind === 'start' || kind === 'rematch') {
    if (kind === 'start' && (uid !== room.ownerUid || room.status !== 'waiting')) throw new RoomError('Masayı oda sahibi başlatır.');
    if (kind === 'rematch' && (room.status !== 'finished' || room.nextGame)) throw new RoomError('Önce yeni oyun seçimini tamamlayın.');
    requireCount(room);
    if (kind === 'rematch') { next.round++; next.starterSeat = rotate(room); }
    next.game = initialGame(next, payload);
  } else {
    if (room.status !== 'playing') throw new RoomError('Bu tur şu an aktif değil.');
    if (isPartyMode(room.mode)) {
      next.game = kind === 'party-resolve' ? resolvePartyRound(room.game, payload.records, payload.secrets)
        : changePartyGame(room.game, seat, kind, payload);
    } else if (kind === 'rank' && room.mode === 'blind-ranking') next.game = placeBlindCard(room.game, seat, payload.slot);
    else if (kind === 'choose' && room.mode === 'bracket') next.game = chooseBracketCard(room.game, seat, payload.cardId);
    else if (kind === 'assign' && room.mode === 'team-draft') next.game = assignTeamCard(room.game, seat, payload.role, payload.cardId);
    else if (kind === 'frequency-reveal' && room.mode === 'frequency') next.game = revealFrequency(room.game, payload.choices);
    else if (kind === 'frequency-next' && room.mode === 'frequency') next.game = advanceFrequency(room.game);
    else if (kind === 'double-reveal' && room.mode === 'double-ranking') next.game = revealDoubleRanking(room.game, payload.rankings);
    else throw new RoomError('Bu hamle bu oyunda kullanılamaz.');
  }
  if (next.game) next.status = next.game.phase === 'finished' ? 'finished' : 'playing';
  next.revision++; next.lastAction = { kind, seat };
  return next;
}
/** Rival approvals may commit concurrently; own repeated clicks cannot. */
export function capturePartyCursor(room, uid, kind) {
  const seat = partySeatFor(room, uid);
  if (!seat) throw new RoomError('Bu masanın oyuncusu değilsiniz.');
  return { code: room.code, instance: room.createdAt, round: room.round, revision: room.revision,
    seat, kind, proposal: room.nextGame ? structuredClone(room.nextGame) : null,
    mode: room.mode, stage: room.game?.stage, roundIndex: room.game?.roundIndex };
}
export function withPartyCursor(value, uid, cursor, payload) {
  const room = decodePartyRoom(value);
  if (!room || room.code !== cursor.code || room.createdAt !== cursor.instance || room.round !== cursor.round || partySeatFor(room, uid) !== cursor.seat || room.mode !== cursor.mode) throw new RoomError('Bu hamle eski bir tura ait.');
  if (room.game?.stage !== cursor.stage || room.game?.roundIndex !== cursor.roundIndex) throw new RoomError('Bu hamle eski bir karta ait.');
  let revision = cursor.revision;
  if (cursor.kind === 'ready-next' && room.revision !== revision) {
    const a = cursor.proposal, b = room.nextGame;
    const same = a && b && a.id === b.id && a.datasetId === b.datasetId && a.mode === b.mode && a.bracketSize === b.bracketSize && a.ready[cursor.seat] === b.ready[cursor.seat];
    const changed = roomSeats(room).filter(seat => a?.ready?.[seat] !== b?.ready?.[seat]);
    if (!same || room.revision - revision !== changed.length || changed.includes(cursor.seat) || changed.some(seat => a.ready[seat] || !b.ready[seat])) throw new RoomError('Oyun onayı güncellendi. Seçimi tekrar kontrol edin.');
    revision = room.revision;
  }
  return changePartyRoom(room, uid, revision, cursor.kind, payload);
}
export function validatePartyRoom(room) {
  const capacityMode = room?.status === 'finished' && room.nextGame ? room.nextGame.mode : room?.mode;
  if (room?.version !== 2 || !roomSeats(room).length || roomSeats(room).length > modeLimits(capacityMode).max || !room.players.p1 || room.players.p1.uid !== room.ownerUid) throw new RoomError('Masa bilgileri geçersiz.');
  partyConfig(room);
  if (new Set(roomSeats(room).map(seat => room.players[seat].uid)).size !== roomSeats(room).length) throw new RoomError('Bir kimlik iki koltuğa oturamaz.');
  if (room.game && isPartyMode(room.mode)) normalizePartyGame(room.game);
  return room;
}
