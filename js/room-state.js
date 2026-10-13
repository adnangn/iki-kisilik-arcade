import { createAuction, placeBid, passTurn } from './auction.js';
import { createBlindRanking, placeBlindCard } from './blind-ranking.js';
import { createBracket, chooseBracketCard } from './bracket.js';
import { createTeamDraft, assignTeamCard } from './team-draft.js';
import { isCooperativeMode, createCooperative, revealFrequency, advanceFrequency, revealDoubleRanking } from './cooperative.js';
import { DATASET_GROUPS } from './datasets.js';

export class RoomError extends Error {}
export const otherSeat = seat => seat === 'p1' ? 'p2' : 'p1';
export const hasOptionalSpectator = room => room?.mode === 'blind-ranking' || room?.mode === 'bracket';
export const rematchStarter = room => hasOptionalSpectator(room) && !room.players.p2 ? 'p1' : otherSeat(room.starterSeat);
export function seatFor(room, uid) {
  return ['p1', 'p2'].find(seat => room?.players?.[seat]?.uid === uid) || null;
}

const nextGameModes = new Set(['auction', 'blind-ranking', 'bracket', 'team-draft', 'frequency', 'double-ranking']);
const selectableDatasetIds = new Set(Object.values(DATASET_GROUPS).flatMap(group => group.sets.map(set => set.id)));

/** Only lobby collections can be selected. Archived pools stay playable in old rooms. */
export function nextGameConfig(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new RoomError('Geçerli bir oyun seçimi yapın.');
  if (!selectableDatasetIds.has(payload.datasetId)) throw new RoomError('Geçerli bir koleksiyon seçin.');
  if (!nextGameModes.has(payload.mode)) throw new RoomError('Geçerli bir oyun modu seçin.');
  const config = { datasetId: payload.datasetId, mode: payload.mode };
  if (payload.mode === 'bracket') {
    const size = payload.bracketSize ?? 16;
    if (size !== 16 && size !== 32) throw new RoomError('Turnuva için 16 veya 32 kart seçin.');
    config.bracketSize = size;
  } else if (payload.bracketSize !== undefined) {
    throw new RoomError('Kart sayısı yalnızca eleme turnuvasında seçilebilir.');
  }
  return config;
}

function requireNextGame(room) {
  const proposal = room.nextGame;
  if (room.status !== 'finished' || !proposal || !Number.isSafeInteger(proposal.id) ||
      proposal.id < 1 || proposal.id > room.revision ||
      !['p1', 'p2'].includes(proposal.proposedBySeat) ||
      typeof proposal.ready?.p1 !== 'boolean' || typeof proposal.ready?.p2 !== 'boolean') {
    throw new RoomError('Onaylanacak yeni bir oyun seçimi bulunamadı.');
  }
  nextGameConfig(proposal);
  return proposal;
}

/** Readiness belongs to one proposal; a category change requires fresh approval. */
export function nextGameReady(room) {
  const proposal = room.nextGame;
  return Boolean(proposal?.ready?.p1 && (room.players?.p2
    ? proposal.ready.p2 : hasOptionalSpectator(proposal)));
}

function createGame(room, payload, starterSeat) {
  if (isCooperativeMode(room.mode)) return createCooperative(room.mode, payload.deck);
  if (room.mode === 'blind-ranking') return createBlindRanking(payload.deck, starterSeat);
  if (room.mode === 'bracket') return createBracket(payload.deck, starterSeat, room.bracketSize ?? 16);
  if (room.mode === 'team-draft') return createTeamDraft(payload.triplets);
  if (room.mode == null || room.mode === 'auction') return createAuction(payload.deck, starterSeat);
  throw new RoomError('Bu oyun modu desteklenmiyor.');
}

// The caller captures revision before submitting. Transaction retries use the
// current server state, so two clicks from one snapshot can never both apply.
export function changeRoom(room, uid, expectedRevision, command, payload = {}) {
  const seat = seatFor(room, uid);
  if (!seat) throw new RoomError('Bu odanın oyuncusu değilsiniz.');
  if (room.revision !== expectedRevision) throw new RoomError('Oda güncellendi. Güncel ekran üzerinden tekrar deneyin.');
  const next = structuredClone(room);
  if (command === 'start') {
    if (uid !== room.ownerUid || room.status !== 'waiting' || (!hasOptionalSpectator(room) && !room.players.p2)) {
      throw new RoomError('Oyunu oda sahibi başlatır. İki aktif oyunculu modlarda iki oyuncu gerekir.');
    }
    next.game = createGame(room, payload, room.starterSeat);
  } else if (command === 'bid' || command === 'pass') {
    if (room.mode != null && room.mode !== 'auction') throw new RoomError('Bu hamle açık artırma modunda kullanılabilir.');
    if (room.status !== 'playing') throw new RoomError('Açık artırma şu an aktif değil.');
    next.game = command === 'bid' ? placeBid(room.game, seat, payload.amount) : passTurn(room.game, seat);
  } else if (command === 'rank') {
    if (room.mode !== 'blind-ranking') throw new RoomError('Bu hamle Kör Sıralama modunda kullanılabilir.');
    if (room.status !== 'playing') throw new RoomError('Kör Sıralama şu an aktif değil.');
    next.game = placeBlindCard(room.game, seat, payload.slot);
  } else if (command === 'choose') {
    if (room.mode !== 'bracket') throw new RoomError('Bu hamle O mu, Bu mu modunda kullanılabilir.');
    if (room.status !== 'playing') throw new RoomError('Eleme turnuvası şu an aktif değil.');
    next.game = chooseBracketCard(room.game, seat, payload.cardId);
  } else if (command === 'assign') {
    if (room.mode !== 'team-draft') throw new RoomError('Bu hamle Start, Bench, Cut modunda kullanılabilir.');
    if (room.status !== 'playing') throw new RoomError('Takım kurma şu an aktif değil.');
    next.game = assignTeamCard(room.game, seat, payload.role, payload.cardId);
  } else if (command === 'frequency-reveal' || command === 'frequency-next') {
    if (room.mode !== 'frequency' || room.status !== 'playing') throw new RoomError('Frekans şu an aktif değil.');
    next.game = command === 'frequency-reveal' ? revealFrequency(room.game, payload.choices) : advanceFrequency(room.game);
  } else if (command === 'double-reveal') {
    if (room.mode !== 'double-ranking' || room.status !== 'playing') throw new RoomError('Çifte Sıralama şu an aktif değil.');
    next.game = revealDoubleRanking(room.game, payload.rankings);
  } else if (command === 'rematch') {
    if (room.status !== 'finished') throw new RoomError('Rövanş için bu turun bitmesi gerekir.');
    if (room.nextGame) throw new RoomError('Önce seçilen yeni oyunu onaylayın veya yeni bir oyun seçin.');
    next.round = room.round + 1;
    next.starterSeat = rematchStarter(room);
    next.game = createGame(room, payload, next.starterSeat);
  } else if (command === 'propose-next') {
    if (room.status !== 'finished') throw new RoomError('Oyun değiştirmek için bu turun bitmesi gerekir.');
    next.nextGame = { id: room.revision + 1, ...nextGameConfig(payload), proposedBySeat: seat,
      ready: { p1: false, p2: false } };
  } else if (command === 'ready-next') {
    const proposal = requireNextGame(room);
    if (payload.id !== proposal.id) throw new RoomError('Oyun seçimi değişti. Yeni seçimi kontrol edip tekrar onaylayın.');
    if (typeof payload.ready !== 'boolean') throw new RoomError('Hazır durumunu belirtin.');
    if (proposal.ready[seat] === payload.ready) throw new RoomError('Hazır durumunuz zaten güncel.');
    next.nextGame.ready[seat] = payload.ready;
    if (nextGameReady(next)) {
      const config = nextGameConfig(proposal);
      next.datasetId = config.datasetId;
      next.mode = config.mode;
      if (config.mode === 'bracket') next.bracketSize = config.bracketSize;
      else delete next.bracketSize;
      next.round = room.round + 1;
      next.starterSeat = room.players.p2 ? otherSeat(room.starterSeat) : 'p1';
      next.game = createGame(next, payload, next.starterSeat);
      delete next.nextGame;
      command = 'next-game';
    }
  } else {
    throw new RoomError('Bilinmeyen hamle.');
  }
  next.status = next.game.phase === 'finished' ? 'finished' : 'playing';
  next.revision += 1;
  next.lastAction = { kind: command, seat };
  return next;
}
