import { DATASET_GROUPS, DATASET_NAMES } from './datasets.js';
import { t } from './texts.js';

const MODES = ['auction', 'blind-ranking', 'bracket', 'team-draft', 'frequency', 'double-ranking'];
const optional = mode => mode === 'blind-ranking' || mode === 'bracket';
export const sameNextConfig = (a, b) => !!a && !!b && a.datasetId === b.datasetId && a.mode === b.mode
  && (a.mode !== 'bracket' || (a.bracketSize ?? 16) === (b.bracketSize ?? 16));

export function createNextGameView({ context, onPropose, onReady, document: doc = document }) {
  const $ = id => doc.getElementById(id);
  let key = null;
  function options(element, entries, value) {
    element.replaceChildren(...entries.map(([id, label]) => {
      const option = doc.createElement('option'); option.value = id; option.textContent = label; return option;
    }));
    element.value = entries.some(([id]) => id === value) ? value : entries[0]?.[0] || '';
  }
  function collections(value) {
    const { datasets } = context();
    options($('next-collection'), DATASET_GROUPS[$('next-category').value].sets.filter(set => datasets[set.id])
      .map(set => [set.id, `${set.title} · ${datasets[set.id].length}`]), value);
  }
  function selected() {
    return { datasetId: $('next-collection').value, mode: $('next-mode').value,
      ...($('next-mode').value === 'bracket' ? { bracketSize: Number($('next-bracket-size').value) } : {}) };
  }
  function sizes() {
    const count = context().datasets[$('next-collection').value]?.length || 0;
    const small = count < 32;
    $('next-bracket-size').querySelector('option[value="32"]').disabled = small;
    if (small) $('next-bracket-size').value = '16';
    $('next-bracket-size-field').hidden = $('next-mode').value !== 'bracket';
    $('next-size-hint').textContent = small ? t('revision.bracket.size_unavailable', { count }) : '';
    $('next-size-hint').hidden = !small;
  }
  function render() {
    const { room, datasets, mySeat, connected, busy, demo, nameFor, onlineSeat } = context();
    $('next-game-panel').hidden = !room || room.status !== 'finished';
    if (!room || room.status !== 'finished' || !Object.keys(datasets).length) { key = null; return; }
    const proposal = room.nextGame;
    const nextKey = `${room.code}:${room.createdAt}:${room.round}:${proposal?.id ?? 'none'}`;
    if (key !== nextKey) {
      key = nextKey;
      const config = proposal || room;
      const category = Object.keys(DATASET_GROUPS).find(id => DATASET_GROUPS[id].sets.some(set => set.id === config.datasetId)) || 'futbol';
      options($('next-category'), Object.entries(DATASET_GROUPS).map(([id, group]) => [id, group.label]), category);
      collections(config.datasetId);
      options($('next-mode'), MODES.map(mode => [mode, t(`runtime.mode.${mode}`)]), config.mode);
      $('next-bracket-size').value = String(config.bracketSize ?? 16);
    }
    sizes();
    const dirty = !sameNextConfig(selected(), proposal);
    $('propose-next').textContent = t(proposal && !dirty ? 'room.extra.proposed' : 'room.extra.propose');
    $('propose-next').disabled = busy || !connected || !dirty;
    // A draft edit cannot approve an unshared selection, but players can
    // always withdraw an existing approval before sharing that edit.
    $('next-ready').disabled = busy || !connected || !proposal || (dirty && !proposal.ready?.[mySeat]);
    $('next-ready').textContent = t(proposal?.ready?.[mySeat] ? 'room.extra.unready' : 'room.extra.ready');
    $('next-proposal-summary').textContent = proposal ? t('room.extra.pending_summary', { dataset: DATASET_NAMES[proposal.datasetId], mode: t(`runtime.mode.${proposal.mode}`) }) : '';
    $('next-readiness').hidden = !proposal;
    for (const seat of ['p1', 'p2']) {
      const exists = !!room.players[seat];
      const ready = !!proposal?.ready?.[seat];
      $(`next-name-${seat}`).textContent = exists ? nameFor(seat) : t('room.extra.missing_player');
      $(`next-status-${seat}`).textContent = t(ready ? 'room.extra.ready_label' : 'room.extra.waiting_label');
      $(`next-player-${seat}`).classList.toggle('is-ready', ready);
      $(`next-player-${seat}`).classList.toggle('is-offline', exists && !demo && !onlineSeat(seat));
    }
    $('next-game-hint').textContent = t(!proposal ? 'room.extra.choose_first' : dirty ? 'room.extra.share_first'
      : !room.players.p2 ? optional(proposal.mode) ? 'room.extra.solo_ready' : 'room.extra.two_required' : 'room.extra.waiting_ready');
    for (const id of ['next-category', 'next-collection', 'next-mode', 'next-bracket-size']) $(id).disabled = busy || !connected;
    if (proposal) {
      $('rematch-button').disabled = true;
      $('rematch-note').textContent = t('room.extra.rematch_pending');
    }
  }
  $('next-category').addEventListener('change', () => { collections(); render(); });
  for (const id of ['next-collection', 'next-mode', 'next-bracket-size']) $(id).addEventListener('change', render);
  $('next-game-form').addEventListener('submit', event => { event.preventDefault(); if (!$('propose-next').disabled) onPropose(selected()); });
  $('next-ready').addEventListener('click', () => {
    const { room, mySeat } = context();
    if (!$('next-ready').disabled && room?.nextGame) onReady({ id: room.nextGame.id, ready: !room.nextGame.ready?.[mySeat] }, room.nextGame);
  });
  return { render, reset() { key = null; } };
}
