import { assetUrl } from './assets.js';
import { DATASET_GROUPS, DATASET_NAMES } from './datasets.js';
import { t as catalogText, formatText } from './texts.js';
import { PARTY_TEXT_CATALOG } from './text-catalog-party.js';
import { partyCards, partyGameSpec } from './party-games.js';
import { auctionControls, auctionDecisionKey } from './auction-controls.js';

export const PARTY_VIEW_MODES = ['auction', 'sealed-auction', 'simultaneous-ranking', 'telepathy', 'detective', 'chameleon', 'blind-ranking', 'bracket', 'team-draft', 'frequency', 'double-ranking'];
const seatsOf = room => Object.keys(room?.players || {}).filter(seat => /^p[1-4]$/.test(seat)).sort();
export const partyModeLimits = mode => mode === 'chameleon' ? { min: 3, max: 4 }
  : ['blind-ranking', 'bracket'].includes(mode) ? { min: 1, max: 2 }
  : ['detective', 'team-draft', 'frequency', 'double-ranking'].includes(mode) ? { min: 2, max: 2 } : { min: 2, max: 4 };

/** The maximum distance between two ten-card permutations is 50. */
export function rankingAgreement(first, second, size = 10) {
  if (!Number.isInteger(size) || size < 2 || size > 10) return null;
  const entries = slots => Array.from({ length: size }, (_, i) => slots?.[`s${i + 1}`]);
  const a = entries(first), b = entries(second);
  if (a.some(id => id == null) || b.some(id => id == null) || new Set(a).size !== size || new Set(b).size !== size || a.some(id => !b.includes(id))) return null;
  const distance = a.reduce((total, id, index) => total + Math.abs(index - b.indexOf(id)), 0);
  return Math.round(100 * (1 - distance / Math.floor(size * size / 2)));
}

export function rankingPairSummary(rankings, seats = Object.keys(rankings || {}), size = 10) {
  const pairs = [];
  for (let i = 0; i < seats.length; i++) for (let j = i + 1; j < seats.length; j++) {
    const percent = rankingAgreement(rankings[seats[i]]?.slots || rankings[seats[i]], rankings[seats[j]]?.slots || rankings[seats[j]], size);
    if (percent !== null) pairs.push({ first: seats[i], second: seats[j], percent });
  }
  const ordered = [...pairs].sort((a, b) => b.percent - a.percent || a.first.localeCompare(b.first) || a.second.localeCompare(b.second));
  return { pairs, closest: ordered[0] || null, furthest: ordered.at(-1) || null };
}

export function rankingDifferences(first, second, size = 10) {
  if (rankingAgreement(first, second, size) === null) return [];
  return Array.from({ length: size }, (_, index) => {
    const id = first[`s${index + 1}`];
    const other = Array.from({ length: size }, (_, i) => second[`s${i + 1}`]).indexOf(id) + 1;
    return { id, first: index + 1, second: other, distance: Math.abs(index + 1 - other) };
  }).filter(row => row.distance > 0).sort((a, b) => b.distance - a.distance || a.first - b.first);
}

const text = (key, params, provided) => {
  const source = provided || catalogText;
  try { return source(key, params); }
  catch (error) {
    if (PARTY_TEXT_CATALOG[key]) return formatText(PARTY_TEXT_CATALOG[key].value, params);
    throw error;
  }
};

/** A DOM-only view. Commands and private writes remain owned by the room service. */
export function createPartyView({ root, context, onAction, onSecret, onStart, onPropose, onReady, onInvite, onLeave, onRematch }) {
  if (!root?.ownerDocument || typeof context !== 'function') throw new TypeError('Masa görünümü için bir DOM alanı ve bağlam gerekli.');
  const doc = root.ownerDocument;
  const el = (tag, className = '', value) => {
    const node = doc.createElement(tag);
    if (className) node.className = className;
    if (value !== undefined) node.textContent = String(value);
    return node;
  };
  const tx = (key, params) => text(key, params, context().t);
  const copy = (tag, className, key, params) => el(tag, className, tx(key, params));
  const modeName = mode => tx(PARTY_TEXT_CATALOG[`party.mode.${mode}`] ? `party.mode.${mode}` : `runtime.mode.${mode}`);
  const nameFor = seat => context().nameFor?.(seat) || context().room?.players?.[seat]?.name || seat?.toUpperCase() || '—';
  const onlineSeat = seat => {
    const state = context();
    return typeof state.onlineSeat === 'function' ? state.onlineSeat(seat)
      : state.presence?.[seat] !== false && (typeof state.presence?.[seat] !== 'object' || state.presence[seat]?.online !== false);
  };
  const cardFor = id => context().cardFor?.(id) || context().cards?.get?.(Number(id)) || context().cards?.get?.(id) || context().cards?.[id];
  const cardName = id => cardFor(id)?.isim || tx('runtime.common.card');
  const mine = () => context().privateState?.mine || {};
  const secretRole = () => context().privateState?.role || context().privateState?.secret || context().privateState?.mine?.role || {};
  const active = () => {
    const state = context();
    return Boolean(state.connected && !state.busy && state.seat && state.privateState?.loaded !== false);
  };
  const isLocked = () => Boolean(mine().locked || mine().ready || context().privateState?.progress?.[context().seat] === true);
  const disabled = button => { button.disabled = !active(); return button; };
  const button = (key, handler, className = 'button button-primary', params) => {
    const node = copy('button', className, key, params); node.type = 'button';
    if (key === 'party.invite') node.dataset.partyInvite = 'true';
    node.dataset.partyFocus = key;
    node.addEventListener('click', () => { if (!node.disabled) handler?.(); });
    return node;
  };
  const privateAction = (kind, payload) => onSecret?.(kind, payload);
  const publicAction = (command, payload = {}) => onAction?.(command, payload);
  const image = id => {
    const img = el('img', 'party-card-image'); img.width = 144; img.height = 144;
    img.src = assetUrl(cardFor(id)?.gorsel || 'assets/images/placeholder.svg'); img.alt = ''; img.loading = 'lazy'; img.decoding = 'async';
    return img;
  };
  const card = (id, { choose, picked = false, target = false, blocked = false, compact = false } = {}) => {
    const node = el(choose ? 'button' : 'article', `party-card${compact ? ' is-compact' : ''}${picked ? ' is-picked' : ''}${target ? ' is-target' : ''}`);
    if (choose) {
      node.type = 'button'; node.dataset.cardId = String(id); node.disabled = blocked || !active();
      node.dataset.partyFocus = `card-${id}`;
      node.setAttribute('aria-label', tx('party.choice_label', { card: cardName(id) }));
      node.setAttribute('aria-pressed', String(picked));
      node.addEventListener('click', () => { if (!node.disabled) choose(id); });
    }
    const portrait = el('span', 'party-card-portrait'); portrait.append(image(id));
    const tag = cardFor(id)?.etiket;
    if (tag) portrait.append(el('span', 'party-card-tag', tag));
    node.append(portrait, el('strong', 'party-card-name', cardName(id)));
    if (target) node.append(copy('span', 'party-target-label', 'party.target'));
    else if (choose) node.append(copy('span', 'party-choice-label', picked ? 'party.locked' : 'party.choose'));
    return node;
  };
  const panel = (titleKey, params) => {
    const node = el('section', 'party-stage panel party-enter');
    const heading = copy('h2', 'party-stage-title', titleKey, params); heading.tabIndex = -1; heading.dataset.partyHeading = '';
    node.append(heading); return node;
  };
  const note = (key, params) => copy('p', 'party-note', key, params);
  const progressReady = seat => {
    const state = context();
    const own = seat === state.seat ? mine() : state.privateState?.progress?.[seat];
    return Boolean(own === true || own?.locked || own?.ready || state.room?.game?.locked?.[seat]);
  };
  const progressRow = game => {
    const row = el('div', 'party-progress-row'); row.setAttribute('aria-label', tx('party.table'));
    for (const seat of game.seats || seatsOf(context().room)) {
      const ready = progressReady(seat) || game.stage === 'reveal';
      const chip = el('span', `party-progress-chip${ready ? ' is-ready' : ''}`);
      chip.dataset.partyProgress = seat;
      chip.append(el('strong', '', nameFor(seat)), copy('span', 'party-progress-label', ready ? 'party.locked' : 'party.waiting'));
      row.append(chip);
    }
    return row;
  };
  const resultFor = game => game.results?.[`r${game.roundIndex + 1}`] || game.results?.[game.roundIndex]
    || Object.entries(game.results || {}).sort(([a], [b]) => Number(a.slice(1)) - Number(b.slice(1))).at(-1)?.[1] || game.result || {};
  const nextButton = game => disabled(button('party.next', () => publicAction('next')));
  const safeCards = game => {
    try { return partyCards(game).map(value => value?.id ?? value?.cardId ?? value); }
    catch { return game.currentCards || (game.currentCardId == null ? [] : [game.currentCardId]); }
  };

  const header = el('header', 'party-header');
  const headingBox = el('div', 'party-header-title');
  const eyebrow = copy('span', 'mono-label', 'party.table'), title = el('h1', 'party-title');
  headingBox.append(eyebrow, title);
  const headerActions = el('div', 'party-header-actions'), code = el('strong', 'party-code');
  code.setAttribute('aria-label', tx('party.code'));
  const invite = button('party.invite', onInvite, 'button button-secondary party-small-button');
  const leave = button('party.leave', onLeave, 'party-leave');
  headerActions.append(code, invite, leave); header.append(headingBox, headerActions);
  const players = el('div', 'party-players');
  const status = el('p', 'party-connection-status'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
  const stage = el('div', 'party-stage-area');
  const nextGameMount = el('section', 'party-next panel');
  const footer = el('div', 'party-footer'); footer.append(nextGameMount);
  root.classList.add('party-screen'); root.replaceChildren(header, players, status, stage, footer);
  let renderKey = '', stageInstance = '', transitionKey = '', nextKey = '', nextFields = null, rostersOpen = false;

  function renderPlayers(state) {
    const room = state.room, game = room.game || {}, seats = seatsOf(room);
    const max = partyModeLimits(room.mode).max;
    const tiles = [];
    for (let index = 1; index <= (room.status === 'waiting' ? max : seats.length); index++) {
      const seat = `p${index}`, player = room.players?.[seat], own = seat === state.seat;
      const online = onlineSeat(seat);
      const current = room.status === 'playing' && (game.turnSeat === seat || game.clueGiverSeat === seat && game.stage === 'clue' || game.guesserSeat === seat && game.stage === 'guess');
      const tile = el('div', `party-player${own ? ' is-self' : ''}${current ? ' is-turn' : ''}${!player ? ' is-empty' : ''}${player && !online ? ' is-offline' : ''}`);
      const icon = el('span', 'party-player-avatar', String(index)); icon.setAttribute('aria-hidden', 'true');
      const labels = el('div', 'party-player-labels');
      labels.append(el('strong', 'party-player-name', player ? nameFor(seat) : tx('party.empty')));
      const line = el('span', 'party-player-state');
      if (own) line.append(copy('span', 'party-player-you', 'party.you'));
      if (room.ownerUid === player?.uid || room.hostSeat === seat || seat === 'p1') line.append(copy('span', '', 'party.host'));
      if (player) line.append(copy('span', '', current ? 'party.turn' : !online ? 'party.offline' : game.passed?.[seat] ? 'party.pass_status' : 'party.online'));
      labels.append(line); tile.append(icon, labels);
      if (game.budgets?.[seat] !== undefined) {
        const budget = el('div', 'party-player-metrics');
        budget.append(copy('strong', '', 'party.auction.budget', { amount: game.budgets[seat] }), copy('span', '', 'party.auction.roster', { count: game.rosters?.[seat]?.length || 0 })); tile.append(budget);
      } else if (game.scores?.[seat] !== undefined) tile.append(el('strong', 'party-player-score', `${game.scores[seat]} ${tx('party.score')}`));
      tiles.push(tile);
    }
    players.replaceChildren(...tiles);
  }

  function renderWaiting(state) {
    const room = state.room, limits = partyModeLimits(room.mode), count = seatsOf(room).length;
    const node = panel('party.waiting_title');
    node.append(copy('p', 'party-lobby-count', 'party.waiting_count', { count, max: limits.max }), note('party.waiting_hint'));
    if (PARTY_TEXT_CATALOG[`party.mode.${room.mode}.description`]) node.append(note(`party.mode.${room.mode}.description`));
    const host = state.seat === (room.hostSeat || 'p1') || room.ownerUid === room.players?.[state.seat]?.uid;
    const allOnline = seatsOf(room).every(onlineSeat);
    const start = button('party.start', onStart); start.disabled = !active() || !host || count < limits.min || count > limits.max || !allOnline;
    const actions = el('div', 'party-inline-actions'); actions.append(start, button('party.invite', onInvite, 'button button-secondary'));
    node.append(actions, note(count < limits.min ? 'party.minimum' : !allOnline ? 'party.reconnect' : host ? 'party.waiting_ready' : 'party.wait_host', { min: limits.min }));
    return node;
  }

  function renderRosters(game) {
    const details = el('details', 'party-rosters');
    details.open = context().room.status === 'finished' || rostersOpen;
    details.addEventListener('toggle', () => {
      if (details.isConnected && context().room.status !== 'finished') rostersOpen = details.open;
    });
    details.append(copy('summary', '', 'party.auction.rosters'));
    const grid = el('div', 'party-roster-grid');
    for (const seat of game.seats || seatsOf(context().room)) {
      const box = el('section', 'party-roster'); box.append(el('h3', '', nameFor(seat)));
      const list = el('ul', 'party-mini-list');
      for (const entry of game.rosters?.[seat] || []) {
        const row = el('li'); const id = entry?.id ?? entry?.cardId ?? entry;
        const price = el('span', entry?.source === 'completion' ? 'party-free-card' : '', entry?.source === 'completion' ? tx('revision.auction.completion_label') : `${entry?.price ?? entry?.amount ?? 0} TL`);
        row.append(image(id), el('strong', '', cardName(id)), price); list.append(row);
      }
      box.append(list); grid.append(box);
    }
    details.append(grid); return details;
  }

  function amountForm({ min, max, value, submitKey, command, secret, canSubmit = true, validateAmount = () => true }) {
    const form = el('form', 'party-amount-form'), label = copy('label', '', 'party.auction.amount');
    const input = el('input'); input.type = 'number'; input.inputMode = 'numeric'; input.setAttribute('enterkeyhint', 'send'); input.min = String(min); input.max = String(max); input.step = '1'; input.required = true; input.value = String(value); input.dataset.partyDraft = 'amount'; input.id = 'party-amount';
    input.disabled = !active() || !canSubmit; label.htmlFor = input.id;
    const submit = button(submitKey, null); submit.type = 'submit'; submit.disabled = !active() || !canSubmit || max < min;
    form.append(label, input, submit); form.addEventListener('submit', event => {
      event.preventDefault();
      if (submit.disabled || !form.reportValidity()) return;
      const amount = Number(input.value);
      if (!Number.isSafeInteger(amount) || amount < min || amount > max || !validateAmount(amount)) return;
      if (secret) privateAction(command, { amount }); else publicAction(command, { amount });
    });
    return form;
  }

  function renderAuction(state) {
    const game = state.room.game, ownTurn = game.turnSeat === state.seat;
    const controls = auctionControls(state), decision = auctionDecisionKey(state);
    const validBid = amount => {
      const latest = context(), current = auctionControls(latest);
      return auctionDecisionKey(latest) === decision && current.canBid && amount >= current.minimum && amount <= current.maximum;
    };
    const node = panel('party.mode.auction'), arena = el('div', 'party-auction-arena');
    const id = game.currentCardId ?? safeCards(game)[0];
    if (id != null) arena.append(card(id));
    const actions = el('div', 'party-auction-actions');
    actions.append(copy('p', 'party-auction-leader', 'party.auction.leader', { name: nameFor(game.bidderSeat), amount: game.highestBid ?? 1 }), note(ownTurn ? 'party.auction.your_turn' : 'party.auction.other_turn', { name: nameFor(game.turnSeat) }));
    const quick = el('div', 'party-quick-bids'); quick.setAttribute('role', 'group'); quick.setAttribute('aria-label', tx('party.auction.quick_label'));
    const quickButtons = el('div', 'party-quick-bid-buttons');
    for (const offer of controls.quickBids) {
      const bid = button('party.auction.quick_increment', () => {
        if (validBid(offer.amount)) publicAction('bid', { amount: offer.amount });
      }, 'button button-secondary party-quick-bid', offer);
      bid.replaceChildren(copy('strong', '', 'party.auction.quick_increment', offer), copy('span', '', 'party.auction.quick_amount', offer));
      bid.dataset.partyFocus = `quick-bid-${offer.increment}`;
      bid.dataset.bidIncrement = String(offer.increment);
      bid.setAttribute('aria-label', tx('party.auction.quick_accessible', offer));
      bid.disabled = offer.disabled; quickButtons.append(bid);
    }
    quick.append(copy('p', 'party-quick-bid-label', 'party.auction.quick_label'), quickButtons);
    actions.append(quick, amountForm({ min: controls.minimum, max: controls.maximum, value: controls.minimum,
      submitKey: 'party.auction.bid', command: 'bid', canSubmit: controls.canBid, validateAmount: validBid }));
    const pass = button('party.auction.pass', () => {
      const latest = context();
      if (auctionDecisionKey(latest) === decision && auctionControls(latest).canPass) publicAction('pass');
    }, 'button button-secondary party-auction-pass');
    pass.disabled = !controls.canPass; actions.append(pass);
    arena.append(actions); node.append(arena, renderRosters(game)); return node;
  }

  function revealChoices(result, game, type) {
    const row = el('div', 'party-revealed-choices');
    for (const seat of game.seats || seatsOf(context().room)) {
      const choice = result.choices?.[seat] ?? result.bids?.[seat] ?? result[seat];
      const box = el('div', 'party-revealed-choice'); box.append(el('strong', '', nameFor(seat)));
      if (type === 'bids') box.append(el('span', 'party-revealed-value', `${choice?.amount ?? choice ?? 0} TL`));
      else {
        const id = choice?.cardId ?? choice;
        if (id != null) box.append(image(id), el('span', '', cardName(id)));
      }
      row.append(box);
    }
    return row;
  }

  function renderSealed(state) {
    const game = state.room.game, reveal = game.stage === 'reveal', node = panel(reveal ? 'party.sealed.reveal' : 'party.sealed.prompt');
    const arena = el('div', 'party-auction-arena'), id = game.currentCardId ?? safeCards(game)[0];
    if (id != null) arena.append(card(id));
    const actions = el('div', 'party-auction-actions');
    if (reveal) {
      const result = resultFor(game);
      actions.append(note(result.winnerSeat || result.winner ? 'party.sealed.winner' : 'party.sealed.burned', { name: nameFor(result.winnerSeat || result.winner), amount: result.amount ?? result.price ?? result.highestBid ?? 0 }), revealChoices(result, game, 'bids'), nextButton(game));
    } else {
      actions.append(note(isLocked() ? 'party.sealed.wait' : 'party.sealed.hint'));
      actions.append(amountForm({ min: 0, max: game.rosters?.[state.seat]?.length >= 5 ? 0 : game.budgets?.[state.seat] ?? 0, value: mine().amount ?? 0, submitKey: 'party.sealed.submit', command: 'sealed', secret: true, canSubmit: !isLocked() }));
      actions.append(note('party.secret_note'));
    }
    arena.append(actions); node.append(arena, progressRow(game), renderRosters(game)); return node;
  }

  function rankingList(slots, size = 10) {
    const list = el('ol', 'party-ranking-list');
    for (let index = 1; index <= size; index++) {
      const id = slots?.[`s${index}`], row = el('li', `party-ranking-row${id == null ? '' : ' is-filled'}`);
      row.append(el('span', 'party-ranking-number', index));
      if (id != null) row.append(image(id), el('strong', '', cardName(id)), el('span', 'party-slot-lock', '▣'));
      else row.append(copy('span', 'party-empty-slot', 'party.ranking.empty'));
      list.append(row);
    }
    return list;
  }

  function renderRanking(state) {
    const game = state.room.game, slots = mine().slots || state.privateState?.previousSlots || {}, count = Object.keys(slots).length, size = 10;
    const layout = el('div', 'party-ranking-layout'), node = panel('party.ranking.title');
    const id = safeCards(game)[0] ?? game.deck?.[game.roundIndex];
    const already = isLocked() || Object.values(slots).includes(id) || (Number(mine().count) || count) > game.roundIndex;
    if (id != null && count < size) {
      node.append(card(id));
      const choices = el('div', 'party-slot-grid');
      for (let slot = 1; slot <= size; slot++) {
        const filled = slots[`s${slot}`] != null;
        const choice = el('button', `party-slot-button${filled ? ' is-filled' : ''}`, `${slot}${filled ? ' ▣' : ''}`); choice.type = 'button';
        choice.disabled = !active() || filled || already; choice.dataset.slot = String(slot);
        choice.dataset.partyFocus = `slot-${slot}`;
        choice.setAttribute('aria-label', tx(filled ? 'party.ranking.filled' : 'party.ranking.slot', { slot, card: cardName(filled ? slots[`s${slot}`] : id) }));
        choice.addEventListener('click', () => { if (!choice.disabled) privateAction('rank', { slot }); }); choices.append(choice);
      }
      node.append(choices);
    }
    node.append(note(count >= size ? 'party.ranking.complete' : already ? 'party.ranking.wait' : 'party.secret_note'), progressRow(game));
    const own = el('section', 'party-own-ranking panel'); own.append(copy('h2', 'party-stage-title', 'party.ranking.mine'), rankingList(slots));
    layout.append(node, own); return layout;
  }

  function renderTelepathy(state) {
    const game = state.room.game, reveal = game.stage === 'reveal', node = panel('party.telepathy.prompt');
    const heading = node.querySelector('h2');
    const criterionIndex = game.criteria?.[game.roundIndex] ?? 0;
    heading.textContent = state.criterion || game.criterion || game.question || tx(`party.telepathy.question.${criterionIndex}`);
    const choices = el('div', 'party-choice-grid is-four');
    for (const id of safeCards(game)) choices.append(card(id, { choose: value => privateAction('choose', { cardId: value }), picked: mine().cardId === id, blocked: isLocked() || reveal }));
    node.append(choices, progressRow(game));
    if (reveal) {
      const result = resultFor(game), matches = Object.values(result.pairResults || {}).filter(pair => pair.match).length;
      node.append(note(matches ? 'party.telepathy.matches' : 'party.telepathy.no_match', { count: matches }), revealChoices(result, game));
      const bonuses = Object.values(result.pairResults || {}).filter(pair => pair.bonus > 0);
      if (bonuses.length) node.append(copy('p', 'party-bonus', 'party.telepathy.bonus', { bonus: bonuses.reduce((sum, pair) => sum + pair.bonus, 0), count: bonuses.length }));
      node.append(nextButton(game));
    } else node.append(note(isLocked() ? 'party.telepathy.wait' : 'party.secret_note'));
    const stats = el('div', 'party-metrics');
    for (const [key, value] of [['party.score', game.score || 0], ['party.streak', game.streak || 0], ['party.best_streak', game.bestStreak || 0]]) {
      const box = el('div', 'party-metric'); box.append(copy('span', '', key), el('strong', '', value)); stats.append(box);
    }
    node.append(stats); return node;
  }

  function clueForm(state, canSubmit) {
    const form = el('form', 'party-clue-form'), label = copy('label', '', 'party.detective.clue_label');
    const input = el('input'); input.type = 'text'; input.maxLength = 24; input.required = true; input.pattern = '\\S{1,24}'; input.autocomplete = 'off'; input.spellcheck = false; input.id = 'party-clue'; input.dataset.partyDraft = 'clue'; input.disabled = !active() || !canSubmit;
    label.htmlFor = input.id;
    const submit = button('party.detective.send', null); submit.type = 'submit'; submit.disabled = !active() || !canSubmit;
    form.append(label, input, submit);
    form.addEventListener('submit', event => { event.preventDefault(); if (!submit.disabled && form.reportValidity()) privateAction('clue', { word: input.value.trim() }); });
    return form;
  }

  function renderDetective(state) {
    const game = state.room.game, role = secretRole(), target = role.targetCardId ?? role.targetId ?? mine().targetCardId;
    const giver = game.clueGiverSeat === state.seat, guesser = game.guesserSeat === state.seat, reveal = game.stage === 'reveal';
    const node = panel(game.stage === 'clue' && giver ? 'party.detective.clue_title' : 'party.detective.guess');
    if (game.stage === 'clue') {
      if (giver) node.append(note('party.detective.clue_hint'), clueForm(state, !isLocked()));
      else node.append(note('party.detective.wait', { name: nameFor(game.clueGiverSeat) }));
    } else if (game.clue) node.append(copy('p', 'party-word', 'party.detective.clue', { word: game.clue }));
    const grid = el('div', 'party-choice-grid is-six');
    const result = resultFor(game), revealedTarget = reveal ? result.targetCardId ?? result.targetId : target;
    for (const id of safeCards(game)) grid.append(card(id, { choose: game.stage === 'guess' && guesser ? value => privateAction('guess', { cardId: value }) : undefined, target: id === revealedTarget, picked: reveal ? result.guessId === id : mine().cardId === id, blocked: isLocked() }));
    node.append(grid);
    if (reveal) node.append(note(result.correct || result.match ? 'party.detective.correct' : 'party.detective.wrong'), nextButton(game));
    else if (game.stage === 'guess' && !guesser) node.append(note('party.detective.observer', { name: nameFor(game.guesserSeat) }));
    node.append(note('party.secret_note')); return node;
  }

  function renderChameleon(state) {
    const game = state.room.game, role = secretRole(), mole = Boolean(role.isMole || role.mole || role.role === 'chameleon' || role.role === 'mole');
    const target = role.targetCardId ?? role.targetId ?? mine().targetCardId, reveal = game.stage === 'reveal';
    const node = panel(reveal ? 'party.done' : mole ? 'party.chameleon.mole' : 'party.chameleon.knower');
    const layout = el('div', 'party-chameleon-layout'), console = el('div', 'party-chameleon-console');
    const result = resultFor(game);
    if (reveal) console.append(chameleonOutcome(result));
    else console.append(note(mole ? 'party.chameleon.mole_hint' : 'party.chameleon.knower_hint'));
    if (game.stage === 'clues') {
      const turn = game.turnSeat === state.seat;
      console.append(note(turn ? 'party.chameleon.your_turn' : 'party.chameleon.turn', { name: nameFor(game.turnSeat) }));
      if (turn) console.append(clueForm(state, !isLocked()));
    } else if (game.stage === 'last-guess') {
      console.append(note(mole ? 'party.chameleon.last_hint' : 'party.chameleon.last_wait', { name: nameFor(game.caughtSeat) }));
      if (mole) node.querySelector('h2').textContent = tx('party.chameleon.last_guess');
    }
    console.append(chameleonClues(game));
    if (game.stage === 'voting') {
      console.append(copy('h3', 'party-subtitle', 'party.chameleon.vote'), note(isLocked() ? 'party.chameleon.voted' : 'party.chameleon.vote_hint'));
      const votes = el('div', 'party-vote-grid');
      for (const seat of game.seats || seatsOf(state.room)) {
        if (seat === state.seat) continue;
        const vote = el('button', 'button button-secondary', nameFor(seat)); vote.type = 'button'; vote.disabled = !active() || isLocked(); vote.dataset.voteSeat = seat;
        vote.dataset.partyFocus = `vote-${seat}`;
        vote.addEventListener('click', () => { if (!vote.disabled) privateAction('vote', { seat }); }); votes.append(vote);
      }
      console.append(votes, progressRow(game));
    }
    if (reveal) console.append(voteSummary(result), nextButton(game));
    const grid = el('div', 'party-choice-grid is-nine party-chameleon-board');
    const revealedTarget = reveal ? result.targetCardId ?? result.targetId : target;
    for (const id of safeCards(game)) grid.append(card(id, { choose: game.stage === 'last-guess' && mole ? value => privateAction('guess', { cardId: value }) : undefined, target: id === revealedTarget, picked: reveal && result.guessId === id, blocked: isLocked(), compact: true }));
    layout.append(console, grid); node.append(layout);
    return node;
  }

  function chameleonClues(game) {
    const clueBox = el('section', 'party-clue-log'); clueBox.append(copy('h3', 'party-subtitle', 'party.chameleon.clues'));
    const list = el('ol');
    const seats = game.seats || seatsOf(context().room);
    for (const [index, seat] of seats.entries()) {
      const word = game.clues?.[seat]; if (!word) continue;
      const row = el('li'), number = el('span', 'party-clue-seat', index + 1);
      number.setAttribute('aria-hidden', 'true');
      row.append(number, el('strong', 'party-clue-player', nameFor(seat)), el('span', 'party-clue-word', word?.word ?? word)); list.append(row);
    }
    if (list.childElementCount) clueBox.append(list);
    else clueBox.append(note('party.waiting'));
    return clueBox;
  }

  function chameleonOutcome(result) {
    const outcome = el('div', 'party-chameleon-result');
    outcome.append(note('party.chameleon.result', { name: nameFor(result.moleSeat || result.chameleonSeat) }),
      note(result.saved || result.guessed || result.guessedCorrectly ? 'party.chameleon.saved' : result.caught ? 'party.chameleon.caught' : 'party.chameleon.escaped'));
    return outcome;
  }

  function voteSummary(result) {
    const box = el('section', 'party-vote-summary'); box.append(copy('h3', 'party-subtitle', 'party.chameleon.votes'));
    const votes = el('ul', 'party-vote-list');
    for (const [seat, suspect] of Object.entries(result.votes || {})) {
      const row = el('li', 'party-vote-row');
      // Keep the editable sentence while styling its player placeholders safely.
      const sentence = tx('party.chameleon.vote_result', { name: '\u0001name\u0001', suspect: '\u0001suspect\u0001' });
      for (const part of sentence.split(/(\u0001(?:name|suspect)\u0001)/)) {
        if (!part) continue;
        row.append(part === '\u0001name\u0001' ? el('strong', 'party-vote-player', nameFor(seat))
          : part === '\u0001suspect\u0001' ? el('span', 'party-vote-target', nameFor(suspect)) : el('span', 'party-vote-link', part));
      }
      votes.append(row);
    }
    box.append(votes); return box;
  }

  function guessedCards(result) {
    const grid = el('div', 'party-final-guess-grid');
    grid.append(card(result.targetId, { target: true, compact: true }));
    if (result.guessId != null && result.guessId !== result.targetId) {
      const guess = card(result.guessId, { picked: true, compact: true }); guess.append(copy('span', 'party-choice-label', 'party.detective.guessed')); grid.append(guess);
    }
    if (grid.childElementCount === 1) grid.classList.add('is-single');
    return grid;
  }

  function renderRankingResults(game) {
    const rankings = game.rankings || game.result?.rankings || game.results?.rankings || {};
    const seats = game.seats || seatsOf(context().room), size = game.size || 10;
    const node = panel('party.ranking.matrix'), summary = rankingPairSummary(rankings, seats, size);
    for (const [kind, pair] of [['closest', summary.closest], ['furthest', summary.furthest]]) if (pair) node.append(note(`party.ranking.${kind}`, { first: nameFor(pair.first), second: nameFor(pair.second), percent: pair.percent }));
    const scroller = el('div', 'party-matrix-scroll'), table = el('table', 'party-matrix');
    const caption = copy('caption', 'sr-only', 'party.ranking.matrix'); table.append(caption);
    const head = el('thead'), heading = el('tr'); heading.append(el('th', '', '↔'));
    for (const seat of seats) { const th = el('th', '', nameFor(seat)); th.scope = 'col'; heading.append(th); }
    head.append(heading); table.append(head);
    const body = el('tbody');
    for (const first of seats) {
      const row = el('tr'), name = el('th', '', nameFor(first)); name.scope = 'row'; row.append(name);
      for (const second of seats) {
        const percent = first === second ? null : rankingAgreement(rankings[first]?.slots || rankings[first], rankings[second]?.slots || rankings[second], size);
        const cell = el('td', percent != null && percent >= 70 ? 'is-close' : percent != null && percent < 40 ? 'is-far' : '', first === second ? '—' : percent == null ? '—' : `%${percent}`); row.append(cell);
      }
      body.append(row);
    }
    table.append(body); scroller.append(table); node.append(scroller);
    if (summary.furthest) {
      const pair = summary.furthest, differences = rankingDifferences(rankings[pair.first]?.slots || rankings[pair.first], rankings[pair.second]?.slots || rankings[pair.second], size);
      if (differences.length) {
        node.append(copy('h3', 'party-subtitle', 'party.ranking.differences'));
        const list = el('ul', 'party-differences');
        for (const row of differences.slice(0, 3)) list.append(copy('li', '', 'party.ranking.distance', { card: cardName(row.id), first: row.first, second: row.second }));
        node.append(list);
      }
    }
    node.append(copy('h3', 'party-subtitle', 'party.ranking.all'));
    const controls = el('div', 'party-ranking-tabs'); controls.setAttribute('role', 'tablist'); controls.setAttribute('aria-label', tx('party.ranking.all'));
    const lists = el('div', 'party-result-rankings');
    for (const [index, seat] of seats.entries()) {
      const tab = el('button', 'party-ranking-tab', nameFor(seat)); tab.type = 'button'; tab.setAttribute('role', 'tab'); tab.id = `party-rank-tab-${seat}`; tab.setAttribute('aria-controls', `party-rank-list-${seat}`); tab.setAttribute('aria-selected', String(index === 0)); tab.tabIndex = index === 0 ? 0 : -1;
      const list = el('section', `party-result-ranking${index === 0 ? ' is-current' : ''}`); list.id = `party-rank-list-${seat}`; list.setAttribute('role', 'tabpanel'); list.setAttribute('aria-labelledby', tab.id);
      list.append(el('h3', '', nameFor(seat)), rankingList(rankings[seat]?.slots || rankings[seat], size));
      const select = () => {
        for (const target of controls.children) { const selected = target === tab; target.setAttribute('aria-selected', String(selected)); target.tabIndex = selected ? 0 : -1; }
        for (const target of lists.children) target.classList.toggle('is-current', target === list);
      };
      tab.addEventListener('click', select);
      tab.addEventListener('keydown', event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const buttons = [...controls.children], current = buttons.indexOf(tab), target = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (current + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
        buttons[target].click(); buttons[target].focus();
      });
      controls.append(tab); lists.append(list);
    }
    node.append(controls, lists); return node;
  }

  function renderFinished(state) {
    const game = state.room.game;
    if (state.room.mode === 'simultaneous-ranking') return renderRankingResults(game);
    const node = panel('party.done');
    if (game.rosters) node.append(renderRosters(game));
    const last = resultFor(game);
    if (['sealed-auction', 'telepathy', 'detective', 'chameleon'].includes(state.room.mode) && Object.keys(last).length) node.append(copy('h3', 'party-subtitle', 'party.last_round'));
    if (state.room.mode === 'sealed-auction' && last.bids) {
      node.append(copy('h3', 'party-subtitle', 'party.sealed.reveal'), revealChoices(last, game, 'bids'));
      if (last.id != null) node.append(card(last.id, { compact: true }));
      node.append(note(last.winnerSeat ? 'party.sealed.winner' : 'party.sealed.burned', { name: nameFor(last.winnerSeat), amount: last.highestBid || 0 }));
    } else if (state.room.mode === 'telepathy' && last.choices) node.append(revealChoices(last, game));
    else if (state.room.mode === 'detective' && last.targetId != null) {
      node.append(note(last.correct ? 'party.detective.correct' : 'party.detective.wrong'), note('party.detective.final_summary', { giver: nameFor(last.clueGiverSeat), guesser: nameFor(last.guesserSeat) }), copy('p', 'party-word', 'party.detective.clue', { word: last.clue }), guessedCards(last));
    } else if (state.room.mode === 'chameleon' && last.targetId != null) {
      const layout = el('div', 'party-chameleon-layout'), console = el('div', 'party-chameleon-console');
      const cards = guessedCards(last); cards.classList.add('party-chameleon-board');
      console.append(chameleonOutcome(last), chameleonClues({ seats: game.seats, clues: last.clues }), voteSummary(last));
      layout.append(console, cards); node.append(layout);
    }
    const grid = el('div', 'party-final-scores');
    for (const seat of game.seats || seatsOf(state.room)) {
      const box = el('div', 'party-final-score'); box.append(el('strong', '', nameFor(seat)));
      if (game.scores) box.append(el('span', '', `${game.scores[seat] || 0} ${tx('party.score')}`));
      else if (game.rosters) box.append(copy('span', '', 'party.auction.roster', { count: game.rosters[seat]?.length || 0 }), copy('span', '', 'party.auction.budget', { amount: game.budgets[seat] ?? 0 }));
      grid.append(box);
    }
    node.append(grid);
    if (game.pairScores) {
      node.append(copy('h3', 'party-subtitle', 'party.telepathy.pairs'));
      const pairs = el('ul', 'party-pair-scores');
      for (const [key, points] of Object.entries(game.pairScores)) {
        const pair = key.match(/p[1-4]/g) || [];
        if (pair.length === 2) pairs.append(el('li', '', `${nameFor(pair[0])} + ${nameFor(pair[1])} · ${points} ${tx('party.score')}`));
      }
      node.append(pairs);
    }
    if (state.room.mode === 'telepathy') node.append(note('party.best_streak'), el('strong', 'party-final-streak', game.bestStreak || 0));
    node.append(note('party.same_room')); return node;
  }

  function selectedNext() {
    if (!nextFields) return null;
    return { datasetId: nextFields.collection.value, mode: nextFields.mode.value, ...(nextFields.mode.value === 'bracket' ? { bracketSize: Number(nextFields.size.value) } : {}) };
  }
  function sameConfig(a, b) { return !!a && !!b && a.datasetId === b.datasetId && a.mode === b.mode && (a.mode !== 'bracket' || (a.bracketSize || 16) === (b.bracketSize || 16)); }
  function options(select, values, value) {
    select.replaceChildren(...values.map(([id, label]) => { const option = el('option', '', label); option.value = id; return option; }));
    select.value = values.some(([id]) => id === value) ? value : values[0]?.[0] || '';
  }
  function updateCollections(value) {
    const datasets = context().datasets || {}, group = DATASET_GROUPS[nextFields.category.value];
    options(nextFields.collection, (group?.sets || []).filter(set => Array.isArray(datasets[set.id])).map(set => [set.id, `${set.title} · ${datasets[set.id].length}`]), value);
  }
  function renderNext() {
    const state = context(), room = state.room;
    nextGameMount.hidden = !room || room.status !== 'finished';
    if (!room || room.status !== 'finished') { nextKey = ''; return; }
    const proposal = room.nextGame, key = `${room.code}:${room.createdAt}:${room.round}:${proposal?.id || 'none'}`;
    if (key !== nextKey || !nextFields) {
      nextKey = key;
      const config = proposal || room, title = copy('h2', 'party-stage-title', 'party.next.title'), description = note('party.same_room');
      const form = el('form', 'party-next-form'), fields = el('div', 'party-next-fields');
      nextFields = {};
      for (const [name, labelKey] of [['category', 'room.extra.category'], ['collection', 'room.extra.collection'], ['mode', 'room.extra.mode'], ['size', 'room.extra.size']]) {
        const field = el('label', `party-next-field party-next-${name}`), select = el('select'); select.dataset.partyDraft = `next-${name}`; select.id = `party-next-${name}`; field.htmlFor = select.id;
        field.append(copy('span', 'field-label', labelKey), select); nextFields[name] = select; fields.append(field);
      }
      const category = Object.keys(DATASET_GROUPS).find(id => DATASET_GROUPS[id].sets.some(set => set.id === config.datasetId)) || 'futbol';
      options(nextFields.category, Object.entries(DATASET_GROUPS).map(([id, group]) => [id, group.label]), category); updateCollections(config.datasetId);
      options(nextFields.mode, PARTY_VIEW_MODES.map(mode => [mode, modeName(mode)]), config.mode); options(nextFields.size, [['16', '16'], ['32', '32']], String(config.bracketSize || 16));
      const propose = button('room.extra.propose', null); propose.type = 'submit'; nextFields.propose = propose;
      const ready = button('room.extra.ready', () => {
        const latest = context();
        if (latest.room?.nextGame) onReady?.({ id: latest.room.nextGame.id, ready: !latest.room.nextGame.ready?.[latest.seat] }, latest.room.nextGame);
      }, 'button button-secondary'); nextFields.ready = ready;
      const actions = el('div', 'party-inline-actions'); actions.append(propose, ready);
      const readiness = el('div', 'party-next-readiness'); nextFields.readiness = readiness;
      const hint = el('p', 'party-note'); hint.setAttribute('role', 'status'); hint.setAttribute('aria-live', 'polite'); nextFields.hint = hint;
      form.append(fields, actions, readiness, hint);
      form.addEventListener('submit', event => { event.preventDefault(); if (!propose.disabled) onPropose?.(selectedNext()); });
      nextFields.category.addEventListener('change', () => { updateCollections(); renderNext(); });
      for (const field of [nextFields.collection, nextFields.mode, nextFields.size]) field.addEventListener('change', renderNext);
      const invite = button('party.invite', onInvite, 'button button-secondary party-small-button');
      nextGameMount.replaceChildren(title, description, form, invite);
    }
    const count = seatsOf(room).length;
    for (const option of nextFields.mode.options) option.disabled = count > partyModeLimits(option.value).max;
    if (partyModeLimits(nextFields.mode.value).max < count) nextFields.mode.value = 'telepathy';
    const poolSize = state.datasets?.[nextFields.collection.value]?.length || 0;
    nextFields.size.querySelector('option[value="32"]').disabled = poolSize < 32;
    if (poolSize < 32) nextFields.size.value = '16';
    nextFields.size.closest('label').hidden = nextFields.mode.value !== 'bracket';
    const config = selectedNext(), dirty = !sameConfig(config, proposal), ownReady = !!proposal?.ready?.[state.seat];
    for (const field of [nextFields.category, nextFields.collection, nextFields.mode, nextFields.size]) field.disabled = !state.connected || state.busy;
    nextFields.propose.disabled = !active() || !dirty || !config.datasetId;
    nextFields.propose.textContent = tx(proposal && !dirty ? 'room.extra.proposed' : 'room.extra.propose');
    nextFields.ready.disabled = !active() || !proposal || dirty && !ownReady;
    nextFields.ready.textContent = tx(ownReady ? 'room.extra.unready' : 'room.extra.ready');
    const chips = [];
    for (const seat of seatsOf(room)) {
      const ready = proposal?.ready?.[seat], chip = el('span', `party-ready-chip${ready ? ' is-ready' : ''}`);
      chip.append(el('strong', '', nameFor(seat)), copy('span', '', ready ? 'party.next.ready' : 'party.next.not_ready')); chips.push(chip);
    }
    nextFields.readiness.replaceChildren(...chips); nextFields.readiness.hidden = !proposal;
    const limits = partyModeLimits(proposal?.mode || config.mode);
    nextFields.hint.textContent = tx(!proposal ? 'room.extra.choose_first' : dirty ? 'room.extra.share_first' : count < limits.min ? 'party.next.minimum' : 'party.next.ready_hint', { min: limits.min });
  }

  function render() {
    const state = context(), room = state.room;
    if (!room) { root.hidden = true; return; }
    const game = room.game;
    root.hidden = false;
    title.textContent = `${DATASET_NAMES[room.datasetId] || room.datasetId} / ${modeName(room.mode)}`;
    if (game?.phase === 'playing') {
      let total;
      try { total = partyGameSpec(room.mode).rounds; } catch { total = null; }
      eyebrow.textContent = total ? tx('party.round', { round: game.roundIndex + 1, total }) : tx('party.card_count', { current: (game.deckIndex || 0) + 1, total: game.deck?.length || 0 });
    } else eyebrow.textContent = tx('party.table');
    code.textContent = room.code; invite.disabled = state.busy || !room; leave.disabled = state.busy;
    renderPlayers(state);
    status.hidden = Boolean(state.connected && state.privateState?.loaded !== false);
    status.textContent = tx(!state.connected ? 'party.reconnect' : 'party.loading');
    const instance = room.mode === 'auction' ? auctionDecisionKey(state)
      : `${room.code}:${room.createdAt}:${room.round}:${game?.roundIndex}:${game?.stage}:${room.status}:${state.seat}`;
    const transition = JSON.stringify([room.code, room.createdAt, room.round, room.mode, room.status,
      game?.roundIndex, game?.stage, game?.currentCardId, game?.turnSeat, game?.actions?.length || 0]);
    const privateVisual = { mine: state.privateState?.mine, role: state.privateState?.role,
      previousSlots: state.privateState?.previousSlots, loaded: state.privateState?.loaded,
      ownProgress: state.privateState?.progress?.[state.seat] };
    // Rival lock notifications update their chips without replacing the
    // player's card buttons or text fields during a pointer/keyboard action.
    const key = JSON.stringify([room.code, room.createdAt, room.round, room.status, room.mode, room.players,
      room.status === 'waiting' ? seatsOf(room).map(onlineSeat) : null,
      game, privateVisual, state.connected, state.busy, state.seat]);
    if (key !== renderKey) {
      const focused = doc.activeElement, draft = instance === stageInstance ? [...stage.querySelectorAll('[data-party-draft]')].map(input => [input.dataset.partyDraft, input.value]) : [];
      const focusKey = stage.contains(focused) ? focused?.dataset.partyDraft : null;
      const focusButton = stage.contains(focused) ? focused?.dataset.partyFocus : null;
      const selection = focusKey && focused.selectionStart != null ? [focused.selectionStart, focused.selectionEnd] : null;
      const builders = { auction: renderAuction, 'sealed-auction': renderSealed, 'simultaneous-ranking': renderRanking, telepathy: renderTelepathy, detective: renderDetective, chameleon: renderChameleon };
      const node = room.status === 'waiting' ? renderWaiting(state) : room.status === 'finished' ? renderFinished(state) : builders[room.mode]?.(state) || panel('party.spectator');
      // Busy and private progress redraws must not restart the scene animation.
      if (transition === transitionKey) {
        node.classList.remove('party-enter');
        for (const panel of node.querySelectorAll('.party-enter')) panel.classList.remove('party-enter');
      }
      stage.replaceChildren(node); renderKey = key; stageInstance = instance; transitionKey = transition;
      for (const [key, value] of draft) {
        const input = [...stage.querySelectorAll('[data-party-draft]')].find(node => node.dataset.partyDraft === key);
        if (input) input.value = value;
      }
      if (focusKey) {
        const target = [...stage.querySelectorAll('[data-party-draft]')].find(node => node.dataset.partyDraft === focusKey);
        if (target && !target.disabled) { target.focus({ preventScroll: true }); if (selection && target.type !== 'number') target.setSelectionRange(...selection); }
      } else if (focusButton) {
        const target = [...stage.querySelectorAll('[data-party-focus]')].find(node => node.dataset.partyFocus === focusButton && !node.disabled);
        if (target) target.focus({ preventScroll: true });
        else stage.querySelector('[data-party-heading]')?.focus({ preventScroll: true });
      }
    }
    for (const chip of stage.querySelectorAll('[data-party-progress]')) {
      const ready = progressReady(chip.dataset.partyProgress) || game?.stage === 'reveal';
      chip.classList.toggle('is-ready', ready);
      chip.querySelector('.party-progress-label').textContent = tx(ready ? 'party.locked' : 'party.waiting');
    }
    renderNext();
  }
  return { render, renderNext, nextGameMount, reset() { renderKey = ''; stageInstance = ''; transitionKey = ''; nextKey = ''; nextFields = null; rostersOpen = false; stage.replaceChildren(); nextGameMount.replaceChildren(); } };
}
