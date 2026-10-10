import { TEXT_CATALOG } from './text-catalog.js';

export const PREVIEW_KEY = 'arcade.text-preview.v1';
export const MAX_TEXT_LENGTH = 2000;
const tokens = text => [...text.matchAll(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g)].map(match => match[1]).sort();
let published = { version: 1, texts: {} };
let current = published;

export function normalizeTexts(candidate) {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate) || candidate.version !== 1 ||
      Object.keys(candidate).some(key => !['version', 'texts'].includes(key)) ||
      !candidate.texts || typeof candidate.texts !== 'object' || Array.isArray(candidate.texts)) {
    throw new Error('Bu dosya geçerli bir metin dosyası değil. Düzenleyiciden indirilen metinler.json dosyasını seç.');
  }
  const texts = Object.create(null);
  for (const [key, value] of Object.entries(candidate.texts)) {
    if (!Object.hasOwn(TEXT_CATALOG, key)) throw new Error(`Tanınmayan metin alanı: ${key}`);
    const field = TEXT_CATALOG[key];
    if (typeof value !== 'string' || !value.trim() || value.length > MAX_TEXT_LENGTH || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) {
      throw new Error(`${field.label}: 1–${MAX_TEXT_LENGTH} karakterlik bir metin yaz.`);
    }
    const required = tokens(field.value), provided = tokens(value);
    if (required.join('|') !== provided.join('|')) {
      throw new Error(`${field.label}: otomatik doldurulan alanları koru${required.length ? ` (${required.map(token => `{${token}}`).join(', ')})` : '.'}.`);
    }
    texts[key] = value;
  }
  return { version: 1, texts: { ...texts } };
}

export function formatText(template, params = {}) {
  // Only the template is scanned: a player name containing braces stays literal.
  return template.replace(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g, (match, key) => Object.hasOwn(params, key) ? String(params[key]) : match);
}

export function t(key, params = {}) {
  const field = TEXT_CATALOG[key];
  if (!field) throw new Error(`Metin kataloğunda bulunmayan alan: ${key}`);
  return formatText(current.texts[key] ?? field.value, params);
}

export async function loadTextFile() {
  const response = await fetch('./metinler.json', { cache: 'no-cache' });
  if (!response.ok) throw new Error('Metin dosyası yüklenemedi.');
  const raw = await response.text();
  if (raw.length > 256 * 1024) throw new Error('Metin dosyası çok büyük.');
  return normalizeTexts(JSON.parse(raw));
}

export async function loadTexts() {
  try { published = await loadTextFile(); }
  catch (error) { published = { version: 1, texts: {} }; console.warn('Varsayılan site metinleri kullanılıyor.', error.message); }
  current = published;
  const preview = new URLSearchParams(window.location.search).get('metin-onizleme') === '1';
  if (preview) {
    try {
      const saved = localStorage.getItem(PREVIEW_KEY);
      if (saved) current = normalizeTexts(JSON.parse(saved));
    } catch (error) { console.warn('Önizleme metinleri geçersiz; yayın metinleri kullanılıyor.', error.message); }
    showPreviewBanner();
  }
  return current;
}

export function applyTexts(root = document) {
  for (const element of root.querySelectorAll('[data-text]')) element.textContent = t(element.dataset.text);
  for (const element of root.querySelectorAll('[data-text-slots]')) {
    for (const slot of element.dataset.textSlots.split(' ')) {
      const separator = slot.indexOf(':');
      const node = element.childNodes[Number(slot.slice(0, separator))];
      if (node?.nodeType === 3) {
        const leading = node.nodeValue.match(/^\s*/)[0], trailing = node.nodeValue.match(/\s*$/)[0];
        node.nodeValue = leading + t(slot.slice(separator + 1)) + trailing;
      }
    }
  }
  for (const attribute of ['placeholder', 'aria-label', 'title', 'content']) {
    for (const element of root.querySelectorAll(`[data-text-${attribute}]`)) element.setAttribute(attribute, t(element.getAttribute(`data-text-${attribute}`)));
  }
}

function showPreviewBanner() {
  const banner = document.createElement('aside');
  banner.className = 'text-preview-banner';
  banner.setAttribute('aria-label', 'Metin önizlemesi');
  const message = document.createElement('span');
  message.textContent = 'METİN ÖNİZLEMESİ · Değişiklikler yalnız bu cihazda görünür.';
  const editor = document.createElement('a'); editor.href = './metin-duzenleyici.html'; editor.textContent = 'Düzenleyiciye dön';
  const close = document.createElement('a'); close.href = './'; close.textContent = 'Normal siteyi aç';
  banner.append(message, editor, close);
  document.body.prepend(banner);
}
