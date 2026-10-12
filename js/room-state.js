import { createAuction, placeBid, passTurn } from './auction.js';
import { createBlindRanking, placeBlindCard } from './blind-ranking.js';
import { createBracket, chooseBracketCard } from './bracket.js';
import { createTeamDraft, assignTeamCard } from './team-draft.js';

export class RoomError extends Error {}
export const otherSeat = seat => seat === 'p1' ? 'p2' : 'p1';
export const hasOptionalSpectator = room => room?.mode === 'blind-ranking' || room?.mode === 'bracket';
export const rematchStarter = room => hasOptionalSpectator(room) && !room.players.p2 ? 'p1' : otherSeat(room.starterSeat);
export function seatFor(room, uid) {
  return ['p1', 'p2'].find(seat => room?.players?.[seat]?.uid === uid) || null;
}

function createGame(room, payload, starterSeat) {
  if (room.mode === 'blind-ranking') return createBlindRanking(payload.deck, starterSeat);
  if (room.mode === 'bracket') return createBracket(payload.deck, starterSeat);
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
  } else if (command === 'rematch') {
    if (room.status !== 'finished') throw new RoomError('Rövanş için bu turun bitmesi gerekir.');
    next.round = room.round + 1;
    next.starterSeat = rematchStarter(room);
    next.game = createGame(room, payload, next.starterSeat);
  } else {
    throw new RoomError('Bilinmeyen hamle.');
  }
  next.status = next.game.phase === 'finished' ? 'finished' : 'playing';
  next.revision += 1;
  next.lastAction = { kind: command, seat };
  return next;
}
