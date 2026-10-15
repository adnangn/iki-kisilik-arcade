// The caller supplies only lobby-visible, compatible collection/mode pairs.
// Keep game limits in the existing setup validators rather than copying them here.
const activeAnimations = new WeakMap();
const requiredLabels = ['datasetId', 'datasetName', 'groupName', 'mode', 'modeName'];

function usableChoices(choices) {
  if (!Array.isArray(choices)) throw new TypeError('Şans masası için seçenek listesi gerekli.');
  const unique = new Map();
  for (const choice of choices) {
    if (!choice || requiredLabels.some(key => typeof choice[key] !== 'string' || !choice[key].trim())) {
      throw new TypeError('Şans masasında eksik bir kategori veya oyun seçeneği var.');
    }
    const key = JSON.stringify([choice.datasetId, choice.mode]);
    if (!unique.has(key)) unique.set(key, { ...choice });
  }
  if (!unique.size) throw new RangeError('Şu anda seçilebilecek bir oyun bulunmuyor.');
  return [...unique.values()];
}

function pick(items, random) {
  const value = random();
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value >= 1) {
    throw new RangeError('Rastgele seçim değeri 0 ile 1 arasında olmalı.');
  }
  return items[Math.floor(value * items.length)];
}

/**
 * Select each collection with equal probability, then one of its compatible modes.
 * Duplicate collection/mode rows do not increase their chance. Extra option fields
 * (for example bracketSize) survive unchanged for the existing room-creation flow.
 */
export function chooseLuckySetup(choices, random = Math.random) {
  if (typeof random !== 'function') throw new TypeError('Rastgele seçim işlevi gerekli.');
  const options = usableChoices(choices), collections = new Map();
  for (const option of options) {
    if (!collections.has(option.datasetId)) collections.set(option.datasetId, []);
    collections.get(option.datasetId).push(option);
  }
  return { ...pick(pick([...collections.values()], random), random) };
}

function abortError() {
  return new DOMException('Şans masası seçimi iptal edildi.', 'AbortError');
}

/**
 * Render a brief, accessible three-reel reveal inside a dedicated empty element.
 * The final choice must be one of choices. This function never writes to Firebase
 * or changes lobby controls. Await it, apply its result, then create the room.
 * A passed AbortSignal cancels timers and removes only this animation's content.
 */
export async function animateLuckySetup({
  element, choices, finalChoice, signal,
  reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false,
  duration = 1050, random = Math.random, onFrame,
} = {}) {
  if (!element?.ownerDocument || typeof element.replaceChildren !== 'function') {
    throw new TypeError('Şans masası için bir görüntüleme alanı gerekli.');
  }
  if (activeAnimations.has(element)) throw new Error('Şans masası zaten seçim yapıyor.');
  if (signal?.aborted) throw abortError();
  if (typeof random !== 'function' || (onFrame !== undefined && typeof onFrame !== 'function')) {
    throw new TypeError('Şans masası geri bildirim işlevi geçersiz.');
  }
  if (!Number.isFinite(duration) || duration < 0 || duration > 5000) {
    throw new RangeError('Şans masası animasyon süresi geçersiz.');
  }
  const options = usableChoices(choices);
  const final = options.find(choice => choice.datasetId === finalChoice?.datasetId && choice.mode === finalChoice?.mode);
  if (!final) throw new RangeError('Son seçim kullanılabilir oyunlar arasında değil.');
  const doc = element.ownerDocument, previousBusy = element.getAttribute('aria-busy');
  const make = (tag, className, value) => {
    const node = doc.createElement(tag);
    if (className) node.className = className;
    if (value !== undefined) node.textContent = value;
    return node;
  };
  const wrapper = make('section', 'lucky-room');
  wrapper.setAttribute('aria-label', 'Şans masası');
  wrapper.dataset.state = 'spinning';
  const badge = make('span', 'lucky-room-badge', 'ŞANS MASASI');
  const title = make('h2', 'lucky-room-title', 'Şansımıza ne çıkarsa');
  const intro = make('p', 'lucky-room-intro', 'Kategori ve oyun modu seçiliyor.');
  const reels = make('div', 'lucky-room-reels');
  reels.setAttribute('aria-hidden', 'true');
  const values = [];
  for (const label of ['Kategori', 'Koleksiyon', 'Oyun modu']) {
    const reel = make('div', 'lucky-room-reel');
    const caption = make('span', 'lucky-room-caption', label);
    const value = make('strong', 'lucky-room-value');
    reel.append(caption, value); reels.append(reel); values.push(value);
  }
  const progress = make('div', 'lucky-room-progress'); progress.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 9; i++) progress.append(make('span', 'lucky-room-progress-pixel'));
  const status = make('p', 'lucky-room-status');
  status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite'); status.setAttribute('aria-atomic', 'true');
  wrapper.append(badge, title, intro, reels, progress, status);
  element.replaceChildren(wrapper); element.setAttribute('aria-busy', 'true');

  return await new Promise((resolve, reject) => {
    let timer = null, ended = false, step = 0;
    const steps = reducedMotion || duration === 0 ? 0 : Math.max(3, Math.ceil(duration / 80));
    const marker = {};
    activeAnimations.set(element, marker);
    const cleanup = remove => {
      if (timer !== null) globalThis.clearTimeout(timer);
      signal?.removeEventListener('abort', cancel);
      if (activeAnimations.get(element) === marker) activeAnimations.delete(element);
      if (previousBusy === null) element.removeAttribute('aria-busy');
      else element.setAttribute('aria-busy', previousBusy);
      if (remove && wrapper.parentNode === element) wrapper.remove();
    };
    const cancel = () => {
      if (ended) return;
      ended = true; cleanup(true); reject(abortError());
    };
    const finish = () => {
      if (ended) return;
      ended = true;
      values[0].textContent = final.groupName;
      values[1].textContent = final.datasetName;
      values[2].textContent = final.modeName;
      wrapper.dataset.state = 'complete';
      intro.textContent = 'Seçimin hazır.';
      status.textContent = `${final.groupName} · ${final.datasetName} · ${final.modeName}`;
      try { onFrame?.({ choice: { ...final }, done: true }); }
      catch (error) { cleanup(true); reject(error); return; }
      cleanup(false); resolve({ ...final });
    };
    const frame = () => {
      if (signal?.aborted) { cancel(); return; }
      if (ended) return;
      if (step >= steps) { finish(); return; }
      try {
        const choice = pick(options, random), amount = step / steps;
        values[0].textContent = amount >= .55 ? final.groupName : choice.groupName;
        values[1].textContent = amount >= .76 ? final.datasetName : choice.datasetName;
        values[2].textContent = choice.modeName;
        for (let index = 0; index < values.length; index++) values[index].parentNode.dataset.locked = String(amount >= [.55, .76, 1][index]);
        onFrame?.({ choice: { ...choice }, done: false });
        if (ended) return;
        step += 1;
        timer = globalThis.setTimeout(frame, duration / steps);
      } catch (error) {
        ended = true; cleanup(true); reject(error);
      }
    };
    signal?.addEventListener('abort', cancel, { once: true });
    // Abort can be triggered by a caller while its DOM is being prepared.
    if (signal?.aborted) cancel();
    else if (steps === 0) finish();
    else frame();
  });
}
