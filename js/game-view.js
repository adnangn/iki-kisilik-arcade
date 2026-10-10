import { t } from './texts.js';
export const ROUND_NAMES = [];
Object.defineProperty(ROUND_NAMES, 0, { enumerable: true, get: () => t('runtime.copy.son_16') });
Object.defineProperty(ROUND_NAMES, 1, { enumerable: true, get: () => t('runtime.copy.ceyrek_final') });
Object.defineProperty(ROUND_NAMES, 2, { enumerable: true, get: () => t('runtime.copy.yari_final') });
Object.defineProperty(ROUND_NAMES, 3, { enumerable: true, get: () => t('runtime.copy.final') });
export const ROLE_NAMES = { get start() { return t('runtime.copy.start'); }, get bench() { return t('runtime.copy.bench'); }, get cut() { return t('runtime.copy.cut'); } };
const cardImage = card => {
  const img = document.createElement('img'); img.src = './' + (card?.gorsel || 'assets/images/placeholder.svg'); img.alt = ''; img.width = 96; img.height = 96; return img;
};
const detailFor = card => card?.takim ? t('runtime.common.card_details', { team: card.takim, tag: card.etiket }) : card?.etiket || '';

export function fillCard(prefix, card) {
  const image = document.getElementById(prefix + '-image'); image.src = './' + (card?.gorsel || 'assets/images/placeholder.svg'); image.alt = card?.isim || t('runtime.common.card');
  document.getElementById(prefix + '-name').textContent = card?.isim || t('runtime.common.card');
  document.getElementById(prefix + '-tag').textContent = card?.etiket || '—';
  const affiliation = document.getElementById(prefix + '-affiliation'); affiliation.textContent = card?.takim || ''; affiliation.hidden = !card?.takim;
}

export function renderBracketHistory(element, game, cardFor) {
  const key = `${game.deck.join(',')}:${game.matchIndex}`;
  if (element.dataset.renderKey === key) return;
  element.dataset.renderKey = key;
  let match = 1;
  element.replaceChildren(...[8, 4, 2, 1].map((count, round) => {
    const section = document.createElement('section'); section.className = 'bracket-round';
    const heading = document.createElement('h3'); heading.textContent = ROUND_NAMES[round];
    const list = document.createElement('ol'); list.className = 'bracket-history-list';
    for (let index = 0; index < count; index++, match++) {
      const row = document.createElement('li'); row.className = 'bracket-history-item';
      const label = document.createElement('span'); const id = game.choices[`m${match}`];
      if (id) { const card = cardFor(id); row.append(cardImage(card)); label.textContent = card?.isim || t('runtime.common.card'); }
      else { row.classList.add('is-pending'); label.textContent = t('runtime.bracket.pending_match', { match: index + 1 }); }
      row.append(label); list.append(row);
    }
    section.append(heading, list); return section;
  }));
}

export function renderTeamCandidates(element, triple, selectedId, pending, canAct, key, cardFor) {
  if (element.dataset.renderKey !== key) {
    element.dataset.renderKey = key;
    element.replaceChildren(...triple.cards.map(id => {
      const card = cardFor(id), button = document.createElement('button'); button.type = 'button'; button.className = 'draft-candidate'; button.dataset.draftCard = String(id); button.id = `draft-card-${id}`;
      const img = cardImage(card); img.className = 'draft-card-image';
      const name = document.createElement('strong'); name.textContent = card?.isim || t('runtime.common.card');
      const detail = document.createElement('small'); detail.textContent = detailFor(card);
      const status = document.createElement('span'); status.className = 'draft-card-status';
      button.append(img, name, detail, status); return button;
    }));
  }
  for (const button of element.children) {
    const id = Number(button.dataset.draftCard), role = Object.keys(pending).find(role => pending[role] === id);
    button.disabled = !canAct || !!role;
    button.classList.toggle('is-selected', id === selectedId); button.classList.toggle('is-assigned', !!role);
    button.setAttribute('aria-pressed', String(id === selectedId));
    button.setAttribute('aria-label', t('runtime.draft.card_accessible', { card: cardFor(id)?.isim || t('runtime.common.card'), status: role ? t('runtime.draft.locked_role_suffix', { role: ROLE_NAMES[role] }) : t('runtime.draft.choose_card_suffix') }));
    button.querySelector('.draft-card-status').textContent = role ? t('runtime.draft.locked_role', { role: ROLE_NAMES[role] }) : id === selectedId ? t('runtime.copy.secildi') : t('runtime.copy.sec');
  }
}

export function renderLineup(element, player, cardFor, pitch = false) {
  const ids = Array.from({ length: player.roundIndex }, (_, index) => player.selections[`r${index + 1}`].start);
  const key = ids.join(',');
  if (element.dataset.renderKey === key && element.childElementCount === ids.length) return;
  element.dataset.renderKey = key;
  element.replaceChildren(...ids.map((id, index) => {
    const card = cardFor(id), row = document.createElement('li'); row.className = pitch ? 'pitch-player' : 'draft-roster-item';
    const name = document.createElement('strong'); name.textContent = card?.isim || t('runtime.common.card');
    const detail = document.createElement('small'); detail.textContent = t('runtime.draft.lineup_detail', { count: index + 1, detail: detailFor(card) });
    row.append(cardImage(card));
    if (pitch) row.append(name, detail);
    else { const info = document.createElement('div'); info.append(name, detail); row.append(info); }
    return row;
  }));
}
