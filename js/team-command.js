import { changeRoom, RoomError, seatFor } from './room-state.js';
import { normalizeTeamDraft } from './team-draft.js';

const ROLES = ['start', 'bench', 'cut'];

function freezeCopy(value) {
  const copy = structuredClone(value);
  const freeze = item => {
    if (item && typeof item === 'object') {
      Object.values(item).forEach(freeze);
      Object.freeze(item);
    }
    return item;
  };
  return freeze(copy);
}

function playerContext(room, uid) {
  if (room?.mode !== 'team-draft' || room.status !== 'playing') {
    throw new RoomError('Takım kurma şu an aktif değil.');
  }
  const seat = seatFor(room, uid);
  if (!seat) throw new RoomError('Bu odanın oyuncusu değilsiniz.');
  const game = normalizeTeamDraft(room.game);
  const player = game.players[seat];
  if (player.done) throw new RoomError('İlk 11 tamamlandı. Rakibinin seçimlerini bekle.');
  return { seat, player, triple: game.triplets[player.roundIndex] };
}

/** Capture before submitting. The other player's move may change room.revision
 * without changing this player's cursor. Never recapture inside the retry. */
export function captureTeamCursor(room, uid) {
  const { seat, player, triple } = playerContext(room, uid);
  return freezeCopy({
    code: room.code,
    roomRound: room.round,
    datasetId: room.datasetId,
    ownerUid: room.ownerUid,
    createdAt: room.createdAt ?? null,
    uid,
    seat,
    roundIndex: player.roundIndex,
    pending: player.pending,
    done: player.done,
    triple,
  });
}

/** Canonical role comparison also tolerates RTDB omitting an empty pending map. */
export function isTeamCursorCurrent(room, uid, cursor) {
  try {
    if (!room || !cursor || cursor.uid !== uid || room.code !== cursor.code ||
        room.round !== cursor.roomRound || room.datasetId !== cursor.datasetId ||
        room.ownerUid !== cursor.ownerUid ||
        JSON.stringify(room.createdAt ?? null) !== JSON.stringify(cursor.createdAt)) return false;
    const { seat, player, triple } = playerContext(room, uid);
    return seat === cursor.seat && player.roundIndex === cursor.roundIndex && player.done === cursor.done &&
      !!cursor.pending && typeof cursor.pending === 'object' && !Array.isArray(cursor.pending) &&
      Object.keys(player.pending).length === Object.keys(cursor.pending).length &&
      ROLES.every(role => player.pending[role] === cursor.pending[role]) &&
      triple.etiket === cursor.triple?.etiket &&
      Array.isArray(cursor.triple?.cards) && cursor.triple.cards.length === 3 &&
      triple.cards.every((id, index) => id === cursor.triple?.cards?.[index]);
  } catch {
    return false;
  }
}

/** Rebase only an unchanged player's assignment onto the newest room revision.
 * Room/session generation checks still belong to the caller, especially DEMO. */
export function assignWithTeamCursor(room, uid, cursor, payload) {
  if (!isTeamCursorCurrent(room, uid, cursor)) {
    throw new RoomError('Takım seçimin güncellendi. Güncel kartlar üzerinden tekrar seçim yap.');
  }
  return changeRoom(room, uid, room.revision, 'assign', payload);
}
