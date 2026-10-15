import { FEEDBACK_TEXT_CATALOG } from './text-catalog-feedback.js';

/** A receipt, never an optimistic game state. Only settle(true) confirms a move. */
export function createFeedbackState({ onChange = () => {}, setTimer = setTimeout, clearTimer = clearTimeout, slowMs = 3000 } = {}) {
  let serial = 0, timer = null, value = { phase: 'idle' };
  const cancel = () => { if (timer !== null) clearTimer(timer); timer = null; };
  const emit = () => onChange({ ...value });
  const reset = () => { cancel(); serial++; value = { phase: 'idle' }; emit(); };
  return {
    get value() { return { ...value }; },
    begin({ scope, round, revision, action, marker, control }) {
      cancel();
      const token = ++serial;
      value = { phase: 'pending', token, scope, round, revision, action, marker, control, slow: false };
      timer = setTimer(() => {
        timer = null;
        if (value.token !== token || value.phase !== 'pending') return;
        value = { ...value, slow: true }; emit();
      }, slowMs);
      emit(); return token;
    },
    settle(token, success, context) {
      if (value.token !== token || value.phase !== 'pending') return false;
      if (value.scope !== context.scope) { reset(); return false; }
      cancel();
      value = { ...value, phase: success ? 'success' : 'error', round: context.round, slow: false };
      emit(); return true;
    },
    sync({ scope, round }) {
      if (value.phase === 'idle') return;
      // A rematch may arrive before its transaction promise resolves. Keep the
      // pending receipt through that round transition, but never across rooms.
      if (scope !== value.scope || round !== value.round && value.phase !== 'pending') reset();
    },
    reset
  };
}

export function feedbackScope(room, lifecycle = 0) {
  return room ? `${lifecycle}:${room.code}:${room.createdAt}` : `${lifecycle}:lobby`;
}

export function feedbackMarker(room) {
  const game = room?.game;
  return JSON.stringify([room?.round, room?.status, game?.roundIndex, game?.stage, game?.deckIndex, game?.matchIndex]);
}

export function feedbackAction(buttonId, room, explicitKind) {
  const id = explicitKind || buttonId || '';
  if (id === 'bid' || id === 'party-bid' || id === 'bid-button') return { type: 'bid' };
  if (id === 'pass' || id === 'party-pass' || id === 'pass-button') return { type: 'pass' };
  if (id === 'clue') return { type: 'clue', private: true };
  if (id === 'vote') return { type: 'vote', private: true };
  if (['sealed', 'guess'].includes(id)) return { type: 'lock', private: true };
  if (id === 'party-lock') return { type: 'lock', private: true };
  if (id === 'rank' || id === 'choose') {
    const hidden = ['simultaneous-ranking', 'telepathy', 'detective', 'chameleon'].includes(room?.mode);
    return { type: hidden ? 'lock' : 'selection', private: hidden };
  }
  if (/^frequency-card-/.test(id) || /^double-slot-/.test(id)) return { type: 'lock', private: true };
  if (/^(rank-slot-|bracket-|draft-(?:start|bench|cut))/.test(id) || ['assign', 'party-assign'].includes(id)) return { type: 'selection' };
  if (/start|rematch|ready|propose|next/.test(id)) return { type: 'next' };
  return { type: 'generic' };
}

/** Uses public turn information and the caller's own acknowledged receipt only. */
export function nextFeedback(receipt, { room, mySeat, mine, nameFor = seat => room?.players?.[seat]?.name || seat }) {
  if (!room) return null;
  if (room.status === 'finished') return { key: 'feedback.next.finished' };
  if (room.status === 'waiting') return { key: 'feedback.next.waiting' };
  const game = room.game || {};
  if (game.stage === 'reveal') return { key: 'feedback.next.reveal' };
  const sameDecision = receipt.marker === feedbackMarker(room);
  if (receipt.action.private && sameDecision) return { key: 'feedback.next.locked' };
  const turn = game.turnSeat || (room.mode === 'detective' ? game.stage === 'clue' ? game.clueGiverSeat : game.guesserSeat : null) || game.activeSeat;
  // A public ACK may precede the value listener. The old turn is not the next turn.
  if (!receipt.action.private && sameDecision && ['bid', 'pass'].includes(receipt.action.type) && room.revision === receipt.revision) return { key: 'feedback.next.confirmed' };
  if (turn) return turn === mySeat ? { key: 'feedback.next.your_turn' } : { key: 'feedback.next.player_turn', params: { player: nameFor(turn) } };
  if (mine?.locked || mine?.ready || game.players?.[mySeat]?.done || room.mode === 'double-ranking' && mine?.count >= 8) return { key: 'feedback.next.locked' };
  return { key: 'feedback.next.continue' };
}

const fallbackText = (key, params = {}) => FEEDBACK_TEXT_CATALOG[key].value.replace(/\{(\w+)\}/g, (match, name) => params[name] ?? match);

/** Persistent, non-modal UI: renders may replace game controls, never the receipt. */
export function createMoveFeedback({ getContext, text = fallbackText, document: doc = globalThis.document, setTimer, clearTimer } = {}) {
  let currentControl = null, highlightedControl = null, lastPhase = '', lastToken = null;
  const bar = doc.createElement('div'); bar.className = 'move-feedback'; bar.id = 'move-feedback'; bar.hidden = true;
  bar.setAttribute('role', 'status'); bar.setAttribute('aria-live', 'polite'); bar.setAttribute('aria-atomic', 'true');
  const icon = doc.createElement('span'); icon.className = 'move-feedback-icon'; icon.setAttribute('aria-hidden', 'true');
  const copy = doc.createElement('div'); copy.className = 'move-feedback-copy';
  const title = doc.createElement('strong'), detail = doc.createElement('span'); copy.append(title, detail);
  const progress = doc.createElement('span'); progress.className = 'move-feedback-progress'; progress.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 4; i++) progress.append(doc.createElement('i'));
  bar.append(icon, copy, progress);
  const state = createFeedbackState({ onChange: () => paint(), setTimer, clearTimer });

  function context() {
    const value = getContext();
    return { ...value, scope: feedbackScope(value.room, value.lifecycle), round: value.room?.round };
  }
  function capture(event) {
    const control = event.type === 'submit' ? event.submitter || event.target.querySelector('button[type="submit"]') : event.target.closest?.('button');
    if (!control || control.disabled) return;
    currentControl = control;
    queueMicrotask(() => { if (currentControl === control) currentControl = null; });
  }
  doc.addEventListener('click', capture, true); doc.addEventListener('submit', capture, true);
  function describe(control) {
    if (!control) return null;
    const keys = ['id', 'data-party-focus', 'data-bid-increment', 'data-draft-role'];
    const key = keys.find(key => control.getAttribute(key));
    return key ? { key, value: control.getAttribute(key) } : null;
  }
  function paint() {
    const value = state.value, current = context();
    if (value.phase === 'idle') {
      bar.hidden = true; highlightedControl?.classList.remove('move-control-pending'); highlightedControl = null;
      return;
    }
    const screen = doc.getElementById(current.screenId);
    if (!screen || screen.hidden) return;
    const before = screen.querySelector('.party-stage-area, #waiting-panel, #blind-results, #create-form');
    if (before) { if (bar.parentElement !== before.parentElement || bar.nextElementSibling !== before) before.before(bar); }
    else if (bar.parentElement !== screen) screen.append(bar);
    bar.hidden = false; bar.dataset.phase = value.phase; bar.classList.toggle('is-slow', value.slow);
    const heading = value.phase === 'error' ? 'feedback.failure.title' : `feedback.${value.phase === 'pending' ? 'pending' : 'success'}.${value.action.type}`;
    const body = value.phase === 'error' ? { key: 'feedback.failure.detail' }
      : value.phase === 'pending' ? { key: !current.connected && current.room && !current.demo ? 'feedback.pending.offline' : value.slow ? 'feedback.pending.slow' : 'feedback.pending.detail' }
      : nextFeedback(value, current);
    const headingText = text(heading), bodyText = body ? text(body.key, body.params) : '';
    if (title.textContent !== headingText) title.textContent = headingText;
    if (detail.textContent !== bodyText) detail.textContent = bodyText;
    icon.textContent = value.phase === 'pending' ? '···' : value.phase === 'success' ? '✓' : '!';
    const changed = value.phase !== lastPhase || value.token !== lastToken;
    if (changed) {
      bar.classList.remove('move-feedback-arrive');
      void bar.offsetWidth; bar.classList.add('move-feedback-arrive');
      lastPhase = value.phase; lastToken = value.token;
    }
    let target = null;
    if (value.control && value.marker === feedbackMarker(current.room)) {
      const control = [...screen.querySelectorAll('button')].find(node => node.getAttribute(value.control.key) === value.control.value);
      if (control && value.phase === 'pending') target = control;
    }
    if (target !== highlightedControl) {
      highlightedControl?.classList.remove('move-control-pending');
      target?.classList.add('move-control-pending'); highlightedControl = target;
    }
  }
  return {
    begin(buttonId, options = {}) {
      const current = context();
      const token = state.begin({ scope: current.scope, round: current.round, revision: current.room?.revision,
        action: feedbackAction(buttonId, current.room, options.kind), marker: feedbackMarker(current.room),
        control: describe(options.control || currentControl || doc.activeElement) });
      return token;
    },
    succeed(token) { return state.settle(token, true, context()); },
    fail(token) { return state.settle(token, false, context()); },
    render() { state.sync(context()); paint(); },
    reset() { state.reset(); doc.querySelectorAll('.move-control-pending').forEach(node => node.classList.remove('move-control-pending')); },
    destroy() { state.reset(); bar.remove(); doc.removeEventListener('click', capture, true); doc.removeEventListener('submit', capture, true); },
    get value() { return state.value; }
  };
}
