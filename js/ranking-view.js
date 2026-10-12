import { t } from './texts.js';
import { assetUrl } from './assets.js';
// Shared numbered list for the live view and the final ranking.
// Update individual rows so connection updates do not restart placement effects.
export function renderRankingList(element, slots, cardFor, highlightSlot = 0) {
  if (element.children.length !== 10) {
    const rows = Array.from({ length: 10 }, (_, index) => {
      const row = document.createElement('li'); row.className = 'rank-slot';
      row.dataset.slot = String(index + 1);
      return row;
    });
    element.replaceChildren(...rows);
  }
  for (const row of element.children) {
    const slot = Number(row.dataset.slot);
    const id = slots?.[`s${slot}`];
    const identity = id === undefined ? 'empty' : String(id);
    if (row.dataset.cardId !== identity) {
      row.dataset.cardId = identity;
      row.classList.toggle('is-filled', id !== undefined);
      row.classList.remove('is-new', 'rank-placed');
      const number = document.createElement('span'); number.className = 'rank-number'; number.textContent = String(slot);
      if (id !== undefined) {
        const card = cardFor(id);
        const image = document.createElement('img'); image.className = 'rank-image'; image.src = assetUrl(card?.gorsel || 'assets/images/placeholder.svg'); image.alt = ''; image.width = 96; image.height = 96;
        const info = document.createElement('div'); info.className = 'rank-info';
        const name = document.createElement('strong'); name.textContent = card?.isim || t('runtime.common.card'); name.title = name.textContent;
        const detail = document.createElement('small'); detail.textContent = card?.takim ? t('runtime.common.card_details', { team: card.takim, tag: card.etiket }) : card?.etiket || '';
        detail.title = detail.textContent;
        const lock = document.createElement('span'); lock.className = 'rank-lock'; lock.textContent = '▣'; lock.title = t('runtime.copy.bu_sira_kilitli'); lock.setAttribute('aria-label', t('runtime.copy.kilitli_sira'));
        info.append(name, detail); row.replaceChildren(number, image, info, lock);
      } else {
        const empty = document.createElement('span'); empty.className = 'rank-empty'; empty.textContent = t('runtime.copy.henuz_bos');
        row.replaceChildren(number, empty);
      }
    }
    if (slot === highlightSlot) {
      element.querySelectorAll('.is-new').forEach(previous => previous.classList.remove('is-new'));
      row.classList.add('is-new');
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        row.classList.remove('rank-placed'); void row.offsetWidth; row.classList.add('rank-placed');
      }
    }
  }
}

export function renderRankChoices(element, slots, canAct, pendingId) {
  if (element.children.length !== 10) {
    element.replaceChildren(...Array.from({ length: 10 }, (_, index) => {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'rank-choice';
      button.id = `rank-slot-${index + 1}`; button.dataset.rankSlot = String(index + 1);
      return button;
    }));
  }
  for (const button of element.children) {
    const slot = Number(button.dataset.rankSlot);
    const filled = slots?.[`s${slot}`] !== undefined;
    const pending = pendingId === button.id;
    button.disabled = !canAct || filled;
    button.classList.toggle('filled', filled); button.classList.toggle('is-busy', pending);
    button.setAttribute('aria-busy', String(pending));
    button.setAttribute('aria-label', filled ? t('runtime.ranking.slot_locked', { slot }) : t('runtime.ranking.slot_place', { slot }));
    button.textContent = filled ? t('runtime.ranking.slot_lock_label', { slot }) : String(slot);
  }
}
