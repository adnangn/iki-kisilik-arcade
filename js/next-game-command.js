import { changeRoom, nextGameConfig, RoomError, seatFor } from './room-state.js';

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

function proposalContext(room, uid) {
  if (room?.status !== 'finished' || !room.nextGame) throw new RoomError('Onaylanacak yeni bir oyun seçimi bulunamadı.');
  const seat = seatFor(room, uid);
  if (!seat) throw new RoomError('Bu odanın oyuncusu değilsiniz.');
  const proposal = room.nextGame;
  if (!Number.isSafeInteger(room.revision) || !Number.isSafeInteger(proposal.id) ||
      proposal.id < 1 || proposal.id > room.revision || !['p1', 'p2'].includes(proposal.proposedBySeat) ||
      typeof proposal.ready?.p1 !== 'boolean' || typeof proposal.ready?.p2 !== 'boolean') {
    throw new RoomError('Yeni oyun seçimi güncellendi. Güncel ekran üzerinden tekrar deneyin.');
  }
  return { seat, proposal, config: nextGameConfig(proposal) };
}

/** Capture once before submitting; transaction retries must keep this consent. */
export function captureNextGameCursor(room, uid) {
  const { seat, proposal, config } = proposalContext(room, uid);
  return freezeCopy({ code: room.code, roomRound: room.round, ownerUid: room.ownerUid,
    createdAt: room.createdAt ?? null, datasetId: room.datasetId, mode: room.mode ?? 'auction',
    bracketSize: room.bracketSize ?? null, starterSeat: room.starterSeat,
    uid, seat, revision: room.revision, proposalId: proposal.id,
    config, proposedBySeat: proposal.proposedBySeat, ready: proposal.ready[seat] });
}

/** Reversible readiness needs a bounded rebase: one rival approval may precede
 * ours, but an old cursor cannot survive a player's ready → unready cycle. */
export function isNextGameCursorCurrent(room, uid, cursor) {
  try {
    if (!room || !cursor || cursor.uid !== uid || room.code !== cursor.code || room.round !== cursor.roomRound ||
        room.ownerUid !== cursor.ownerUid || JSON.stringify(room.createdAt ?? null) !== JSON.stringify(cursor.createdAt) ||
        room.datasetId !== cursor.datasetId || (room.mode ?? 'auction') !== cursor.mode ||
        (room.bracketSize ?? null) !== cursor.bracketSize || room.starterSeat !== cursor.starterSeat ||
        !Number.isSafeInteger(cursor.revision)) return false;
    const { seat, proposal, config } = proposalContext(room, uid);
    if (seat !== cursor.seat || proposal.id !== cursor.proposalId || proposal.proposedBySeat !== cursor.proposedBySeat ||
        proposal.ready[seat] !== cursor.ready || config.datasetId !== cursor.config?.datasetId ||
        config.mode !== cursor.config?.mode || config.bracketSize !== cursor.config?.bracketSize) return false;
    const progress = room.revision - cursor.revision;
    return progress === 0 || (progress === 1 && room.lastAction?.kind === 'ready-next' &&
      ['p1', 'p2'].includes(room.lastAction.seat) && room.lastAction.seat !== seat);
  } catch {
    return false;
  }
}

/** Merge simultaneous approvals without approving another proposal or replaying
 * a same-player click. Room/session cancellation remains the caller's job. */
export function readyWithNextCursor(room, uid, cursor, payload) {
  if (!isNextGameCursorCurrent(room, uid, cursor)) {
    throw new RoomError('Yeni oyun seçimin veya hazır durumun güncellendi. Güncel ekran üzerinden tekrar onayla.');
  }
  return changeRoom(room, uid, room.revision, 'ready-next', payload);
}
