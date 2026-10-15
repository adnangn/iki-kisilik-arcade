import { t } from './texts.js';
import { mysteryChoices, mysteryRosters } from './mystery-box.js';

/** The responder's hidden-card scene never receives a card ID or image. */
export function renderMysteryBox(state, { document: doc = globalThis.document, card, onAction, onSecret, finished = false } = {}) {
  const game = state.room.game, tx = state.t || t, name = state.nameFor || (seat => state.room.players[seat].name);
  const el = (tag, cls = '', value) => { const node = doc.createElement(tag); node.className = cls; if (value !== undefined) node.textContent = value; return node; };
  const text = (tag, cls, key, params) => el(tag, cls, tx(key, params));
  const ready = state.connected && !state.busy && state.privateState?.loaded !== false;
  const action = (key, handler, cls = '') => {
    const node = text('button', `button ${cls || 'button-primary'}`, key); node.type = 'button'; node.dataset.partyFocus = key;
    node.disabled = !ready; node.addEventListener('click', () => { if (!node.disabled) handler(); }); return node;
  };
  const panel = el('section', 'party-stage panel party-enter mystery-stage');
  const heading = text('h2', 'party-stage-title', finished ? 'box.final' : game.stage === 'reveal' ? 'box.reveal_title' : game.stage === 'stamp' ? 'box.stamp_title' : 'box.decide_title');
  heading.tabIndex = -1; heading.dataset.partyHeading = ''; panel.append(heading);
  const rosters = mysteryRosters(game);
  if (finished) {
    panel.append(text('p', 'party-note', 'box.final_note'));
    const grid = el('div', 'mystery-final-grid');
    for (const seat of ['p1', 'p2']) {
      const column = el('section', 'mystery-collection'); column.append(el('h3', '', name(seat)));
      const cards = el('div', 'mystery-final-cards');
      for (const entry of rosters[seat]) cards.append(card(entry.id, { compact: true }));
      column.append(cards); grid.append(column);
    }
    panel.append(grid);
    const history = el('details', 'mystery-history'); history.append(text('summary', '', 'box.history'));
    const list = el('ol');
    const results = Object.entries(game.results || {}).sort(([a], [b]) => Number(a.slice(1)) - Number(b.slice(1)));
    for (const [index, [, result]] of results.entries()) {
      const row = el('li'); row.append(el('strong', '', `${tx('box.round', { round: index + 1 })} · ${state.cards?.get(result.cardId)?.isim || 'Kart'}`), text('span', 'mystery-history-stamp', `box.${result.stamp}`),
        el('span', '', `${tx(result.decision === 'take' ? 'box.accepted' : 'box.rejected')} → ${name(result.ownerSeat)}`)); list.append(row);
    }
    history.append(list); panel.append(history); return panel;
  }
  const top = el('div', 'mystery-topline'); top.append(text('strong', '', 'box.counter', { round: game.roundIndex + 1 }));
  for (const seat of ['p1', 'p2']) top.append(el('span', '', `${name(seat)} · ${tx('box.count', { count: game.counts[seat] })}`));
  panel.append(top);
  const reveal = game.stage === 'reveal', result = game.results?.[`r${game.roundIndex + 1}`];
  const privateCard = state.seat === game.giverSeat ? state.privateState?.deal?.cardId : null;
  const arena = el('div', 'mystery-arena');
  if (reveal && result) arena.append(card(result.cardId));
  else if (privateCard != null) arena.append(text('p', 'mystery-private-label', 'box.private'), card(privateCard));
  else {
    const gift = el('div', `mystery-gift${state.privateState?.locked ? ' is-unlocking' : ''}`); gift.setAttribute('role', 'img'); gift.setAttribute('aria-label', tx('box.hidden'));
    for (const cls of ['mystery-gift-bow', 'mystery-gift-lid', 'mystery-gift-base', 'mystery-gift-ribbon']) gift.append(el('span', cls));
    gift.append(el('strong', 'mystery-gift-question', '?')); arena.append(gift, text('p', 'mystery-private-label', 'box.hidden'));
  }
  panel.append(arena);
  if (reveal && result) {
    panel.append(text('span', 'mystery-stamp is-sent', `box.${result.stamp}`),
      text('p', 'mystery-outcome', result.decision === 'take' ? 'box.accepted' : 'box.rejected'),
      text('p', 'party-note', 'box.award', { card: state.cards?.get(result.cardId)?.isim || 'Kart', name: name(result.ownerSeat) }),
      action('box.next', () => onAction('box-next'))); return panel;
  }
  const actor = text('p', 'mystery-actor', game.stage === 'stamp' ? 'box.giver' : 'box.responder', { name: name(game.stage === 'stamp' ? game.giverSeat : game.responderSeat) }); panel.append(actor);
  if (game.stage === 'stamp') {
    if (state.seat === game.giverSeat && privateCard != null) {
      const choices = el('div', 'mystery-stamps');
      for (const [stamp, icon] of [['gold', '◆'], ['trash', '▤'], ['risk', '?']]) {
        const node = action(`box.${stamp}`, () => onAction('box-stamp', { stamp }), `mystery-stamp stamp-${stamp}`);
        node.prepend(el('span', 'mystery-stamp-icon', icon)); choices.append(node);
      }
      panel.append(choices);
    } else panel.append(text('p', 'party-note', state.seat === game.giverSeat ? 'box.loading' : 'box.wait_stamp', { name: name(game.giverSeat) }));
  } else {
    panel.append(text('strong', `mystery-stamp is-sent stamp-${game.stamp}`, `box.${game.stamp}`));
    const full = ['p1', 'p2'].find(seat => game.counts[seat] >= 5);
    if (full) panel.append(text('p', 'mystery-quota', 'box.quota', { name: name(full) }));
    if (state.seat === game.responderSeat && !state.privateState?.locked) {
      const buttons = el('div', 'mystery-decisions'), available = mysteryChoices(game);
      for (const decision of ['take', 'reject']) {
        const button = action(`box.${decision}`, () => onSecret('box-decision', { decision }), decision === 'take' ? 'button-primary' : 'button-secondary');
        button.disabled ||= !available.includes(decision); buttons.append(button);
      }
      panel.append(buttons);
    } else panel.append(text('p', 'party-note', state.privateState?.locked ? 'box.locked' : 'box.wait_decision', { name: name(game.responderSeat) }));
  }
  return panel;
}
