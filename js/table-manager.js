import { DATASET_GROUPS, DATASET_NAMES } from './datasets.js';
import { ALL_MODES, isPartyMode, modeLimits, roomSeats } from './party-room-state.js';
import { t } from './texts.js';

/** Derive a host's proposed table without changing any live game data. */
export function tablePlan(room, removeSeats, config) {
  const occupied = roomSeats(room);
  const remove = [...new Set(removeSeats || [])].filter(seat => seat !== 'p1' && occupied.includes(seat));
  const survivors = occupied.filter(seat => !remove.includes(seat));
  const limits = modeLimits(config.mode);
  return { removeSeats: remove, survivors, count: survivors.length, limits,
    overCapacity: survivors.length > limits.max, underMinimum: survivors.length < limits.min,
    config: { datasetId: config.datasetId, mode: config.mode,
      ...(config.mode === 'bracket' ? { bracketSize: config.bracketSize ?? 16 } : {}) } };
}

export function createTableManager({ root, context, onReset }) {
  const doc = root.ownerDocument;
  const el = (tag, className = '', value) => {
    const node = doc.createElement(tag); node.className = className;
    if (value !== undefined) node.textContent = value; return node;
  };
  const tx = (key, params) => (context().t || t)(key, params);
  const modeName = mode => tx(`${isPartyMode(mode) ? 'party' : 'runtime'}.mode.${mode}`);
  const button = (key, action, className = 'button button-secondary') => {
    const node = el('button', className, tx(key)); node.type = 'button';
    node.addEventListener('click', action); return node;
  };
  const details = el('details', 'table-manager'), summary = el('summary', '', tx('table.manage'));
  const form = el('form', 'table-manager-form'), description = el('p', 'table-description', tx('table.description'));
  const playerField = el('fieldset', 'table-player-field'), legend = el('legend', 'field-label', tx('table.players'));
  const players = el('div', 'table-player-list');
  const offline = button('table.select_offline', () => {
    for (const input of players.querySelectorAll('input')) input.checked = !context().onlineSeat(input.value);
    review.hidden = true; reviewButton.hidden = false; refresh();
  }, 'table-small-action');
  playerField.append(legend, players, offline);
  const fields = el('div', 'table-config-fields'), inputs = {};
  for (const [name, key] of [['category', 'room.extra.category'], ['datasetId', 'room.extra.collection'], ['mode', 'room.extra.mode'], ['bracketSize', 'room.extra.size']]) {
    const label = el('label', `table-field table-field-${name}`), input = el('select');
    input.id = `table-${name}`; label.htmlFor = input.id;
    label.append(el('span', 'field-label', tx(key)), input); fields.append(label); inputs[name] = input;
  }
  const info = el('p', 'table-description'); info.setAttribute('role', 'status');
  const reviewButton = button('table.review', () => showReview(), 'button button-primary');
  const review = el('section', 'table-review'); review.hidden = true;
  const reviewTitle = el('h3', 'table-review-title', tx('table.review_title'));
  const reviewConfig = el('p'), reviewPlayers = el('p'), reviewNotice = el('p');
  const confirm = button('table.confirm', () => {
    if (confirm.disabled || review.hidden) return;
    const state = context(), current = plan();
    if (state.room?.version !== 2 || state.room.players[state.seat]?.uid !== state.room.ownerUid || current.overCapacity) return;
    onReset({ ...current.config, removeSeats: current.removeSeats });
  }, 'button button-primary');
  const cancel = button('table.cancel', () => { review.hidden = true; reviewButton.hidden = false; reviewButton.focus(); });
  const reviewActions = el('div', 'table-review-actions'); reviewActions.append(confirm, cancel);
  review.append(reviewTitle, reviewConfig, reviewPlayers, reviewNotice, reviewActions);
  form.append(description, playerField, fields, info, reviewButton, review);
  form.addEventListener('submit', event => event.preventDefault());
  details.append(summary, form);
  const guest = el('p', 'table-guest-hint'); guest.setAttribute('role', 'status');
  root.classList.add('table-manager-mount'); root.replaceChildren(details, guest);
  let key = '';

  function options(select, values, value) {
    select.replaceChildren(...values.map(([id, label]) => { const node = el('option', '', label); node.value = id; return node; }));
    select.value = values.some(([id]) => id === String(value)) ? String(value) : values[0]?.[0] || '';
  }
  function collections(value) {
    const sets = DATASET_GROUPS[inputs.category.value]?.sets || [], data = context().datasets;
    options(inputs.datasetId, sets.filter(set => data[set.id]).map(set => [set.id, `${set.title} · ${data[set.id].length}`]), value);
  }
  function config() {
    return { datasetId: inputs.datasetId.value, mode: inputs.mode.value, bracketSize: Number(inputs.bracketSize.value) };
  }
  function plan() {
    return tablePlan(context().room, [...players.querySelectorAll('input:checked')].map(input => input.value), config());
  }
  function refresh() {
    if (!context().room) return;
    const state = context(), next = plan(), disabled = state.busy || !state.connected;
    for (const input of [...Object.values(inputs), ...players.querySelectorAll('input')]) input.disabled = disabled;
    const count = state.datasets[inputs.datasetId.value]?.length || 0;
    inputs.bracketSize.closest('label').hidden = inputs.mode.value !== 'bracket';
    inputs.bracketSize.querySelector('option[value="32"]').disabled = count < 32;
    if (count < 32) inputs.bracketSize.value = '16';
    info.textContent = tx('table.remaining', { count: next.count }) + (next.overCapacity ? ' ' + tx('table.capacity', next.limits)
      : next.underMinimum ? ' ' + tx('table.minimum', next.limits) : '');
    reviewButton.disabled = disabled || next.overCapacity || !inputs.datasetId.value;
    confirm.disabled = reviewButton.disabled;
    offline.disabled = disabled || !roomSeats(state.room).some(seat => seat !== 'p1' && !state.onlineSeat(seat));
    for (const row of players.children) {
      const seat = row.dataset.seat;
      row.classList.toggle('is-offline', !state.onlineSeat(seat));
      row.querySelector('.table-player-state').textContent = tx(state.onlineSeat(seat) ? 'table.online' : 'table.offline');
    }
  }
  function showReview() {
    if (reviewButton.disabled) return;
    const state = context(), next = plan();
    reviewConfig.textContent = tx('table.config_summary', { dataset: DATASET_NAMES[next.config.datasetId], mode: modeName(next.config.mode), count: next.count });
    reviewPlayers.textContent = tx(next.removeSeats.length ? 'table.remove_summary' : 'table.none_removed', {
      names: next.removeSeats.map(seat => state.room.players[seat].name).join(', ')
    });
    reviewNotice.textContent = tx(state.room.status === 'waiting' ? 'table.waiting_summary' : 'table.discard');
    review.hidden = false; reviewButton.hidden = true; confirm.focus();
  }
  inputs.category.addEventListener('change', () => { collections(); review.hidden = true; reviewButton.hidden = false; refresh(); });
  for (const input of [inputs.datasetId, inputs.mode, inputs.bracketSize]) input.addEventListener('change', () => {
    review.hidden = true; reviewButton.hidden = false; refresh();
  });
  function render() {
    const state = context(), room = state.room;
    root.hidden = !room || room.version !== 2;
    if (root.hidden) { key = ''; return; }
    const host = room.players[state.seat]?.uid === room.ownerUid;
    details.hidden = !host;
    const absent = roomSeats(room).filter(seat => seat !== state.seat && !state.onlineSeat(seat));
    guest.hidden = host || !absent.length;
    if (!guest.hidden) guest.textContent = tx('table.guest_hint', { names: absent.map(seat => room.players[seat].name).join(', ') });
    root.hidden = !host && guest.hidden;
    if (!host) return;
    const nextKey = JSON.stringify([room.code, room.createdAt, room.round, room.mode, room.datasetId, room.players]);
    if (nextKey !== key) {
      key = nextKey; details.open = false; review.hidden = true; reviewButton.hidden = false;
      const category = Object.keys(DATASET_GROUPS).find(id => DATASET_GROUPS[id].sets.some(set => set.id === room.datasetId));
      options(inputs.category, Object.entries(DATASET_GROUPS).map(([id, group]) => [id, group.label]), category);
      collections(room.datasetId);
      options(inputs.mode, ALL_MODES.map(mode => [mode, modeName(mode)]), room.mode);
      options(inputs.bracketSize, [['16', '16'], ['32', '32']], String(room.bracketSize || 16));
      players.replaceChildren(...roomSeats(room).map(seat => {
        const row = el('label', 'table-player-row'); row.dataset.seat = seat;
        const labels = el('span', 'table-player-copy');
        labels.append(el('strong', '', room.players[seat].name), el('span', 'table-player-state'));
        if (seat === 'p1') row.append(el('span', 'table-host-mark', '★'), labels, el('small', '', tx('table.host_fixed')));
        else {
          const input = el('input'); input.type = 'checkbox'; input.value = seat;
          input.setAttribute('aria-label', `${room.players[seat].name} · ${tx('table.remove')}`);
          input.addEventListener('change', () => { review.hidden = true; reviewButton.hidden = false; refresh(); });
          row.append(input, labels, el('small', '', tx('table.remove')));
        }
        return row;
      }));
    }
    refresh();
  }
  return { render, reset() { key = ''; details.open = false; review.hidden = true; root.hidden = true; } };
}
