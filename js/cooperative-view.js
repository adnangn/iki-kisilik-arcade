import { t } from './texts.js';
import { assetUrl } from './assets.js';

const otherSeat = seat => seat === 'p1' ? 'p2' : 'p1';
const el = (tag, className = '', text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = String(text);
  return node;
};
const copy = (tag, className, key, params) => el(tag, className, t(key, params));
const cardId = value => value?.cardId ?? value;
const imageFor = card => {
  const image = el('img', 'coop-card-image');
  image.src = assetUrl(card?.gorsel || 'assets/images/placeholder.svg');
  image.alt = ''; image.width = 96; image.height = 96;
  return image;
};
const cardName = card => card?.isim || t('runtime.common.card');
const cardDetails = card => card?.takim ? t('runtime.common.card_details', { team: card.takim, tag: card.etiket }) : card?.etiket || '';
const completedCount = record => Math.min(8, Math.max(0, Number(record?.count) || Object.keys(record?.slots || {}).length));
const opponentCount = state => typeof state?.opponentProgress === 'number'
  ? state.opponentProgress : completedCount(state?.opponentProgress);
const opponentReady = state => state?.opponentProgress === true || state?.opponentProgress === 1 || !!state?.opponentProgress?.locked || !!state?.opponentProgress?.ready;
const canAct = context => context.connected && context.bothOnline && !context.busy && context.privateState?.loaded !== false;

function metric(key, value) {
  const box = el('div', 'coop-metric');
  box.append(copy('span', 'field-label', key), el('strong', '', value));
  return box;
}

function topline(mode, counter) {
  const line = el('div', 'mode-topline coop-topline');
  const live = el('span', 'game-live'), dot = el('span', 'status-dot'); dot.setAttribute('aria-hidden', 'true');
  live.append(dot, document.createTextNode(t(`runtime.mode.${mode}`)));
  line.append(live, el('span', 'mono-label', counter));
  return line;
}

function status(context, normalKey, params) {
  if (!context.connected || !context.bothOnline) return t('coop.common.reconnect');
  if (context.privateState?.loaded === false) return t('coop.common.loading');
  return t(normalKey, params);
}

function busyButton(button, context) {
  const pending = context.pendingAction === button.id || context.pendingAction?.id === button.id;
  button.classList.toggle('is-busy', pending);
  button.setAttribute('aria-busy', String(pending));
}

function fillFrequency(panel, context) {
  const { room, mySeat, privateState = {}, cardFor, nameFor } = context;
  const game = room.game, round = game.roundIndex + 1;
  const mine = privateState.mine, reveal = game.stage === 'reveal';
  const result = game.results?.[`r${round}`];
  const key = JSON.stringify([room.code, room.round, room.mode, game.deck, round, game.stage, mine?.cardId, mine?.locked, result, game.score, game.streak]);
  if (panel.dataset.renderKey !== key || !panel.childElementCount) {
    panel.dataset.renderKey = key;
    panel.className = 'cooperative-panel frequency-panel';
    const stage = el('section', `panel coop-stage coop-arrive${reveal ? ' is-reveal' : ''}`);
    stage.setAttribute('aria-labelledby', 'frequency-prompt');
    const heading = copy('h2', 'coop-prompt', 'coop.frequency.prompt'); heading.id = 'frequency-prompt';
    const pair = el('div', 'frequency-pair'); pair.setAttribute('role', 'group'); pair.setAttribute('aria-labelledby', heading.id);
    for (const id of game.deck.slice(game.roundIndex * 2, game.roundIndex * 2 + 2)) {
      const card = cardFor(id), button = el('button', 'frequency-choice');
      button.type = 'button'; button.id = `frequency-card-${id}`; button.dataset.frequencyCard = String(id);
      button.setAttribute('aria-label', t('coop.common.card_choose', { card: cardName(card) }));
      const portrait = el('span', 'coop-portrait'); portrait.append(imageFor(card), el('span', 'card-tag', card?.etiket || '—'));
      const picked = mine?.locked && Number(mine.cardId) === Number(id);
      button.classList.toggle('is-selected', picked);
      button.setAttribute('aria-pressed', String(picked));
      button.append(portrait, el('strong', 'coop-card-name', cardName(card)), el('small', 'coop-card-detail', cardDetails(card)), copy('span', 'coop-choice-label', picked ? 'coop.common.locked' : 'coop.common.choose'));
      pair.append(button);
    }
    const hint = el('p', 'mode-hint coop-hint'); hint.id = 'frequency-hint'; hint.setAttribute('role', 'status'); hint.setAttribute('aria-live', 'polite');
    const progress = el('div', 'coop-player-state');
    const own = copy('span', 'coop-private-label', 'coop.common.you');
    own.append(document.createTextNode(` · ${nameFor(mySeat)}`));
    const partner = el('span', 'coop-partner-state'); partner.id = 'coop-partner-status'; partner.setAttribute('role', 'status'); partner.setAttribute('aria-live', 'polite');
    progress.append(own, partner);
    stage.append(heading, pair, hint, progress);
    if (reveal && result) {
      const resultBox = el('section', `frequency-reveal coop-result-pop${result.match ? ' is-match' : ' is-different'}`);
      resultBox.setAttribute('aria-label', t(result.match ? 'coop.frequency.same' : 'coop.frequency.different'));
      resultBox.append(copy('h3', '', result.match ? 'coop.frequency.same' : 'coop.frequency.different'));
      const choices = el('div', 'coop-reveal-choices');
      for (const seat of ['p1', 'p2']) {
        const card = cardFor(cardId(result[seat]));
        const choice = el('div', 'coop-reveal-choice');
        choice.append(el('span', 'mono-label', nameFor(seat)), imageFor(card), el('strong', '', cardName(card)));
        choices.append(choice);
      }
      resultBox.append(choices, copy('p', 'coop-round-points', result.match ? 'coop.frequency.points' : 'coop.frequency.different_hint', { points: result.points || 0 }));
      if (result.bonus) resultBox.append(copy('p', 'coop-bonus', 'coop.frequency.bonus', { streak: result.streak, bonus: result.bonus }));
      const next = copy('button', 'button button-primary coop-next', round >= 10 ? 'coop.frequency.finish' : 'coop.frequency.next');
      next.type = 'button'; next.id = 'frequency-next'; next.dataset.frequencyNext = '';
      resultBox.append(next); stage.append(resultBox);
    } else stage.append(copy('p', 'coop-privacy-note', 'coop.common.private'));
    const stats = el('div', 'coop-stats');
    stats.append(metric('coop.frequency.score', game.score || 0), metric('coop.frequency.matches', `${game.matches || 0} / 10`), metric('coop.frequency.streak', game.streak || 0));
    panel.replaceChildren(topline('frequency', t('coop.common.round', { round })), stats, stage);
  }
  for (const button of panel.querySelectorAll('[data-frequency-card]')) {
    button.disabled = !canAct(context) || !!mine?.locked || reveal;
    busyButton(button, context);
  }
  const next = panel.querySelector('#frequency-next');
  if (next) { next.disabled = !canAct(context); busyButton(next, context); }
  panel.querySelector('#frequency-hint').textContent = status(context, reveal ? 'coop.frequency.reveal_hint' : mine?.locked ? 'coop.frequency.locked_hint' : 'coop.frequency.hint');
  panel.querySelector('#coop-partner-status').textContent = t(opponentReady(privateState) || reveal ? 'coop.common.ready' : 'coop.common.choosing', { name: nameFor(otherSeat(mySeat)) });
}

function rankingRows(slots, cardFor) {
  const list = el('ol', 'coop-ranking-list');
  for (let slot = 1; slot <= 8; slot++) {
    const row = el('li', 'coop-rank-row'), id = slots?.[`s${slot}`];
    row.append(el('span', 'coop-rank-number', slot));
    if (id !== undefined && id !== null) {
      const card = cardFor(id); row.classList.add('is-filled');
      row.append(imageFor(card), el('strong', 'coop-rank-name', cardName(card)));
      const lock = el('span', 'coop-rank-lock', '▣'); lock.setAttribute('aria-hidden', 'true'); row.append(lock);
    } else row.append(copy('span', 'coop-rank-empty', 'coop.double.empty'));
    list.append(row);
  }
  return list;
}

function fillDouble(panel, context) {
  const { room, mySeat, privateState = {}, cardFor, nameFor } = context;
  const game = room.game, mine = privateState.mine, count = completedCount(mine), slots = mine?.slots || {};
  const key = JSON.stringify([room.code, room.round, room.mode, game.deck, count, slots]);
  if (panel.dataset.renderKey !== key || !panel.childElementCount) {
    panel.dataset.renderKey = key;
    panel.className = 'cooperative-panel double-ranking-panel';
    const layout = el('div', 'coop-ranking-layout');
    const stage = el('section', 'panel coop-stage coop-arrive');
    stage.setAttribute('aria-labelledby', 'double-card-name');
    stage.append(copy('span', 'blind-role', 'coop.double.role'));
    if (count < 8) {
      const card = cardFor(game.deck[count]), current = el('div', 'coop-current-card');
      const portrait = el('div', 'coop-portrait'); portrait.append(imageFor(card), el('span', 'card-tag', card?.etiket || '—'));
      const name = el('h2', 'coop-card-name', cardName(card)); name.id = 'double-card-name';
      current.append(portrait, name, el('p', 'coop-card-detail', cardDetails(card)), copy('p', 'card-caption', 'coop.double.prompt'));
      const choices = el('div', 'double-slot-choices'); choices.setAttribute('role', 'group'); choices.setAttribute('aria-labelledby', name.id);
      for (let slot = 1; slot <= 8; slot++) {
        const filled = slots[`s${slot}`] !== undefined;
        const button = el('button', 'double-slot-button', `${slot}${filled ? ' ▣' : ''}`);
        button.type = 'button'; button.id = `double-slot-${slot}`; button.dataset.doubleSlot = String(slot);
        button.classList.toggle('is-filled', filled);
        button.setAttribute('aria-label', t(filled ? 'coop.double.slot_locked' : 'coop.double.slot_place', { slot, card: filled ? cardName(cardFor(slots[`s${slot}`])) : cardName(card) }));
        choices.append(button);
      }
      stage.append(current, choices, copy('p', 'coop-privacy-note', 'coop.double.warning'));
    } else {
      const ready = el('div', 'coop-ready');
      const icon = el('span', 'coop-ready-icon', '▣'); icon.setAttribute('aria-hidden', 'true');
      const heading = copy('h2', '', 'coop.double.ready_title'); heading.id = 'double-card-name'; heading.tabIndex = -1;
      ready.append(icon, heading, copy('p', '', 'coop.double.ready_hint'));
      stage.append(ready);
    }
    const hint = el('p', 'mode-hint coop-hint'); hint.id = 'double-hint'; hint.setAttribute('role', 'status'); hint.setAttribute('aria-live', 'polite');
    const partner = el('p', 'coop-partner-state'); partner.id = 'coop-partner-status'; partner.setAttribute('role', 'status'); partner.setAttribute('aria-live', 'polite');
    stage.append(hint, partner, copy('p', 'coop-privacy-note', 'coop.common.private'));
    const ranking = el('section', 'panel coop-ranking-panel'); ranking.setAttribute('aria-labelledby', 'double-own-title');
    const heading = el('div', 'coop-ranking-heading'), title = copy('h2', '', 'coop.double.own_title'); title.id = 'double-own-title';
    heading.append(title, copy('span', 'mono-label', 'coop.double.own_progress', { count }));
    ranking.append(heading, rankingRows(slots, cardFor)); layout.append(stage, ranking);
    panel.replaceChildren(topline('double-ranking', t('coop.common.card', { card: Math.min(count + 1, 8) })), layout);
  }
  for (const button of panel.querySelectorAll('[data-double-slot]')) {
    button.disabled = !canAct(context) || slots[`s${button.dataset.doubleSlot}`] !== undefined || count >= 8;
    busyButton(button, context);
  }
  const hint = panel.querySelector('#double-hint');
  hint.textContent = status(context, count >= 8 ? 'coop.double.ready_hint' : 'coop.double.hint');
  hint.hidden = count >= 8 && context.connected && context.bothOnline && privateState.loaded !== false;
  panel.querySelector('#coop-partner-status').textContent = t('coop.double.progress', { name: nameFor(otherSeat(mySeat)), count: opponentCount(privateState) });
}

export function renderCooperativePanel(context) {
  const panel = document.getElementById('cooperative-panel');
  if (!panel || !context.room?.game) return;
  if (context.room.mode === 'frequency') fillFrequency(panel, context);
  else if (context.room.mode === 'double-ranking') fillDouble(panel, context);
}

function frequencyResults(context) {
  const { room, cardFor, nameFor } = context, game = room.game;
  const wrapper = el('div', 'coop-frequency-results');
  const stats = el('div', 'coop-stats');
  stats.append(metric('coop.frequency.score', game.score || 0), metric('coop.frequency.matches', `${game.matches || 0} / 10`), metric('coop.frequency.best_streak', game.bestStreak || 0));
  const history = el('section', 'panel coop-history');
  history.append(copy('h2', 'coop-section-title', 'coop.frequency.history'));
  const rounds = el('ol', 'coop-history-list');
  for (let round = 1; round <= 10; round++) {
    const result = game.results?.[`r${round}`]; if (!result) continue;
    const row = el('li', `coop-history-row${result.match ? ' is-match' : ''}`);
    const heading = el('div', 'coop-history-heading');
    heading.append(copy('span', 'mono-label', 'coop.frequency.history_round', { round }), copy('span', 'coop-match-badge', result.match ? 'coop.frequency.history_match' : 'coop.frequency.history_different'));
    const picks = el('div', 'coop-history-picks');
    for (const seat of ['p1', 'p2']) {
      const card = cardFor(cardId(result[seat])), pick = el('div', 'coop-history-pick'), info = el('div');
      info.append(el('small', 'mono-label', nameFor(seat)), el('strong', '', cardName(card)));
      pick.append(imageFor(card), info); picks.append(pick);
    }
    row.append(heading, picks);
    if (result.bonus) row.append(copy('p', 'coop-bonus', 'coop.frequency.bonus', { streak: result.streak, bonus: result.bonus }));
    rounds.append(row);
  }
  history.append(rounds); wrapper.append(stats, history); return wrapper;
}

function doubleResults(context) {
  const { room, cardFor, nameFor } = context, game = room.game, result = game.result || {};
  const wrapper = el('div', 'coop-double-results');
  const stats = el('div', 'coop-stats coop-stats-two');
  stats.append(metric('coop.double.compatibility', `%${result.compatibility || 0}`), metric('coop.double.exact', `${result.exactMatches || 0} / 8`));
  const lineups = el('div', 'coop-final-rankings');
  for (const seat of ['p1', 'p2']) {
    const ranking = el('section', 'panel coop-ranking-panel');
    const title = el('h2', 'coop-section-title', nameFor(seat)); title.id = `double-result-${seat}`;
    ranking.setAttribute('aria-labelledby', title.id);
    ranking.append(title, rankingRows(game.rankings?.[seat] || context.privateState?.rankings?.[seat] || {}, cardFor));
    lineups.append(ranking);
  }
  const comparison = el('section', 'panel coop-comparison');
  const title = copy('h2', 'coop-section-title', 'coop.double.comparison'); title.id = 'double-comparison-title';
  const scroller = el('div', 'coop-table-wrap');
  const table = el('table', 'coop-comparison-table'); table.setAttribute('aria-labelledby', title.id);
  const head = el('thead'), heading = el('tr');
  for (const text of [t('coop.double.table_card'), nameFor('p1'), nameFor('p2'), t('coop.double.table_difference')]) {
    const column = el('th', '', text); column.scope = 'col'; heading.append(column);
  }
  head.append(heading); const body = el('tbody');
  const differences = Array.isArray(result.differences) ? result.differences : Object.values(result.differences || {});
  const biggest = differences.reduce((max, item) => !max || item.difference > max.difference ? item : max, null);
  for (const item of differences) {
    const row = el('tr', item.difference === 0 ? 'is-same' : item.difference === biggest?.difference ? 'is-biggest' : '');
    const card = cardFor(item.id), cardCell = el('th'); cardCell.scope = 'row';
    const cardLabel = el('span', 'coop-table-card'); cardLabel.append(imageFor(card), el('strong', '', cardName(card))); cardCell.append(cardLabel);
    row.append(cardCell, el('td', '', item.p1), el('td', '', item.p2), copy('td', '', item.difference === 0 ? 'coop.double.same' : 'coop.double.difference', { difference: item.difference }));
    body.append(row);
  }
  table.append(head, body); scroller.append(table); comparison.append(title, scroller, copy('p', 'coop-privacy-note', 'coop.double.score_note'));
  const conversation = el('aside', 'coop-conversation'); conversation.append(copy('h3', '', 'coop.double.biggest'));
  conversation.append(copy('p', '', biggest?.difference > 0 ? 'coop.double.conversation' : 'coop.double.all_same', biggest ? { card: cardName(cardFor(biggest.id)), first: nameFor('p1'), second: nameFor('p2'), p1: biggest.p1, p2: biggest.p2 } : {}));
  wrapper.append(stats, conversation, lineups, comparison); return wrapper;
}

export function renderCooperativeResults(context) {
  const panel = document.getElementById('cooperative-results');
  if (!panel || !context.room?.game) return;
  const { room } = context;
  const key = JSON.stringify([room.code, room.round, room.mode, room.game, context.nameFor('p1'), context.nameFor('p2')]);
  if (panel.dataset.renderKey === key && panel.childElementCount) return;
  panel.dataset.renderKey = key;
  if (room.mode === 'frequency') panel.replaceChildren(frequencyResults(context));
  else if (room.mode === 'double-ranking') panel.replaceChildren(doubleResults(context));
}
