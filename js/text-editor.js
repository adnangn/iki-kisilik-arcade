import { TEXT_CATALOG } from './text-catalog.js';
import { loadTextFile, normalizeTexts, PREVIEW_KEY } from './texts.js';

const DRAFT_KEY = 'arcade.text-editor-draft.v1';
const MAX_FILE_BYTES = 256 * 1024;
const MAX_TEXT_LENGTH = 2000;
const SAVE_DELAY = 650;
const $ = (id) => document.getElementById(id);
const entries = Object.entries(TEXT_CATALOG);
const fields = new Map();
const published = {};
const values = {};
let saveTimer;
let ready = false;
let valid = true;
let storageAvailable = true;

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function requiredTokens(text) {
  return [...new Set(text.match(/\{[a-zA-Z][a-zA-Z0-9_]*\}/g) || [])];
}

function editableError(key, value) {
  try { normalizeTexts({ version: 1, texts: { [key]: value } }); return ''; }
  catch (error) { return error.message || 'Bu metni kontrol et. Otomatik doldurulan alanları koru.'; }
}

function overriddenTexts() {
  return Object.fromEntries(entries.filter(([key, item]) => values[key] !== item.value).map(([key]) => [key, values[key]]));
}

function validatedDocument() {
  return normalizeTexts({ version: 1, texts: overriddenTexts() });
}

function message(text, error = false) {
  $('editor-error').textContent = error ? text : '';
  $('editor-error').hidden = !error;
  if (!error) $('editor-save-status').textContent = text;
}

function setFieldState(key) {
  const field = fields.get(key);
  const error = editableError(key, values[key]);
  const changed = values[key] !== published[key];
  field.wrapper.classList.toggle('is-changed', changed);
  field.changed.hidden = !changed;
  field.input.setAttribute('aria-invalid', String(Boolean(error)));
  field.error.textContent = error;
  field.error.hidden = !error;
  field.length.textContent = `${values[key].length} / ${MAX_TEXT_LENGTH}`;
  field.reset.disabled = values[key] === TEXT_CATALOG[key].value;
}

function refreshState() {
  const changedCount = entries.filter(([key]) => values[key] !== published[key]).length;
  $('editor-change-count').textContent = changedCount ? `${changedCount} metin değişti` : 'Yayımlanan metinlerle aynı';
  valid = entries.every(([key]) => !editableError(key, values[key]));
  if (valid) {
    try { validatedDocument(); } catch { valid = false; }
  }
  $('editor-preview').disabled = !ready || !valid;
  $('editor-download').disabled = !ready || !valid;
  if (!valid) message('İşaretli alanları düzelt. Otomatik doldurulan alanları koruyunca önizleme ve indirme açılacak.', true);
  else $('editor-error').hidden = true;
}

function saveDraft() {
  clearTimeout(saveTimer);
  saveTimer = undefined;
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ version: 1, texts: { ...values }, savedAt: Date.now() }));
    if (valid && localStorage.getItem(PREVIEW_KEY)) localStorage.setItem(PREVIEW_KEY, JSON.stringify(validatedDocument()));
    storageAvailable = true;
    $('editor-save-status').textContent = valid ? 'Taslak bu tarayıcıda kaydedildi.' : 'Taslak kaydedildi. İşaretli alanları düzelt.';
  } catch {
    storageAvailable = false;
    message('Tarayıcı taslağı saklayamıyor. Geçerli metinlerini indirerek yedekle.', true);
  }
}

function changed(key) {
  values[key] = fields.get(key).input.value;
  setFieldState(key);
  refreshState();
  $('editor-save-status').textContent = 'Taslak kaydediliyor…';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveDraft, SAVE_DELAY);
}

function createField(key, item, index) {
  const wrapper = element('section', 'editor-field');
  const header = element('div', 'editor-field-header');
  const heading = element('div');
  heading.append(element('p', 'editor-field-group', item.group));
  const label = element('label', '', item.label);
  label.htmlFor = `editor-value-${index}`;
  heading.append(label);
  const mark = element('span', 'editor-field-mark', 'Değişti');
  mark.hidden = true;
  header.append(heading, mark);
  const input = element('textarea');
  input.id = label.htmlFor;
  input.value = values[key];
  input.maxLength = MAX_TEXT_LENGTH;
  input.rows = item.value.length > 110 || item.value.includes('\n') ? 4 : 2;
  input.spellcheck = true;
  input.setAttribute('aria-invalid', 'false');
  input.autocomplete = 'off';
  const error = element('p', 'editor-field-error');
  error.id = `editor-field-error-${index}`;
  error.hidden = true;
  input.setAttribute('aria-describedby', error.id);
  wrapper.append(header, input);
  const tokens = requiredTokens(item.value);
  if (tokens.length) {
    const help = element('p', 'editor-field-help', 'Bu alanlar oyun sırasında otomatik doldurulur. Metinde aynen tut: ');
    help.id = `editor-field-help-${index}`;
    tokens.forEach((token, tokenIndex) => {
      if (tokenIndex) help.append(document.createTextNode(' '));
      help.append(element('code', '', token));
    });
    wrapper.append(help);
    input.setAttribute('aria-describedby', `${help.id} ${error.id}`);
  }
  wrapper.append(error);
  const original = element('details', 'editor-field-original');
  original.append(element('summary', '', 'Yayımlanan metni göster'), element('p', '', published[key]));
  wrapper.append(original);
  const footer = element('div', 'editor-field-footer');
  const reset = element('button', 'editor-small-button', 'Varsayılana dön');
  reset.type = 'button';
  reset.setAttribute('aria-label', `${item.label}: varsayılana dön`);
  reset.addEventListener('click', () => { input.value = item.value; changed(key); input.focus(); });
  const length = element('span', 'editor-length');
  footer.append(reset, length);
  wrapper.append(footer);
  input.addEventListener('input', () => changed(key));
  fields.set(key, { wrapper, input, error, changed: mark, reset, length });
  return wrapper;
}

function searchText(value) {
  return value.toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ı/g, 'i');
}

function filterFields() {
  if (!ready) return;
  const search = searchText($('editor-search').value.trim());
  const group = $('editor-group').value;
  let count = 0;
  for (const [key, item] of entries) {
    const matches = (!group || item.group === group) && (!search || searchText(`${item.label} ${item.group} ${values[key]} ${item.value}`).includes(search));
    fields.get(key).wrapper.hidden = !matches;
    if (matches) count++;
  }
  $('editor-results').textContent = `${count} / ${entries.length} metin gösteriliyor`;
  $('editor-empty').hidden = count > 0;
}

function replaceValues(candidate) {
  for (const [key, item] of entries) {
    values[key] = Object.hasOwn(candidate, key) ? candidate[key] : item.value;
    fields.get(key).input.value = values[key];
    setFieldState(key);
  }
  refreshState();
  filterFields();
  saveDraft();
}

function restoreDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return false;
    const draft = JSON.parse(raw);
    if (draft.version !== 1 || !draft.texts || typeof draft.texts !== 'object' || Array.isArray(draft.texts)) return false;
    for (const [key] of entries) {
      if (Object.hasOwn(draft.texts, key) && typeof draft.texts[key] === 'string' && draft.texts[key].length <= MAX_TEXT_LENGTH) values[key] = draft.texts[key];
    }
    return true;
  } catch { return false; }
}

function refreshPreviewNote() {
  try { $('editor-preview-note').hidden = !localStorage.getItem(PREVIEW_KEY); }
  catch { $('editor-preview-note').hidden = true; }
}

function preview() {
  if (!ready || !valid) return;
  try {
    localStorage.setItem(PREVIEW_KEY, JSON.stringify(validatedDocument()));
    saveDraft();
    refreshPreviewNote();
    const link = element('a');
    link.href = './?metin-onizleme=1';
    link.target = '_blank';
    link.rel = 'noopener';
    document.body.append(link);
    link.click();
    link.remove();
    if (storageAvailable) message('Önizleme açıldı. Taslağın bu tarayıcıda saklandı.');
    else message('Önizleme açıldı; tarayıcı taslağı ayrıca saklayamadı. Metinlerini indirerek yedekle.', true);
  } catch { message('Önizleme saklanamadı. Tarayıcı depolama izinlerini kontrol et veya metinleri indir.', true); }
}

function download() {
  if (!ready || !valid) return;
  try {
    const documentText = `${JSON.stringify(validatedDocument(), null, 2)}\n`;
    const blob = new Blob([documentText], { type: 'application/json;charset=utf-8' });
    if (blob.size > MAX_FILE_BYTES) { message('Dosya çok büyük oldu. Bazı uzun metinleri kısaltarak yeniden indir.', true); return; }
    const url = URL.createObjectURL(blob);
    const link = element('a');
    link.href = url;
    link.download = 'metinler.json';
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    saveDraft();
    if (storageAvailable) message('Metinler indirildi. Herkes için yayımlamak üzere GitHub’daki metinler.json dosyasını değiştir.');
    else message('Metinler indirildi. Tarayıcı taslağı saklayamadığı için indirdiğin dosyayı yedek olarak tut.', true);
  } catch { message('Dosya hazırlanamadı. İşaretli metinleri kontrol edip yeniden dene.', true); }
}

async function importFile(event) {
  const input = event.currentTarget;
  const file = input.files?.[0];
  if (!file) return;
  try {
    if (file.size > MAX_FILE_BYTES) throw new Error('Dosya 256 KB’tan küçük olmalı.');
    const imported = normalizeTexts(JSON.parse(await file.text()));
    replaceValues(imported.texts);
    message('Dosyadaki metinler taslağa yüklendi. Önizleyebilir veya düzenlemeye devam edebilirsin.');
  } catch (error) {
    const explanation = error instanceof SyntaxError ? 'JSON içeriği okunamadı. Düzenleyiciden indirilmiş bir metinler.json seç.' : error.message || 'Geçerli bir metinler.json seç.';
    message(`Dosya yüklenemedi. ${explanation} Mevcut taslağın duruyor.`, true);
  } finally { input.value = ''; }
}

async function initialize() {
  let loadFailed = false;
  let overrides = {};
  try { overrides = (await loadTextFile()).texts || {}; }
  catch { loadFailed = true; }
  for (const [key, item] of entries) {
    published[key] = Object.hasOwn(overrides, key) ? overrides[key] : item.value;
    values[key] = published[key];
  }
  const hadDraft = restoreDraft();
  const fragment = document.createDocumentFragment();
  entries.forEach(([key, item], index) => fragment.append(createField(key, item, index)));
  $('editor-fields').append(fragment);
  const groups = [...new Set(entries.map(([, item]) => item.group))];
  groups.forEach((group) => {
    const option = element('option', '', group);
    option.value = group;
    $('editor-group').append(option);
  });
  ready = true;
  $('editor-fields').setAttribute('aria-busy', 'false');
  $('editor-import').disabled = false;
  $('editor-reset').disabled = false;
  entries.forEach(([key]) => setFieldState(key));
  refreshState();
  filterFields();
  refreshPreviewNote();
  if (loadFailed) message('Yayımlanan metin dosyası okunamadı. Varsayılan metinler açıldı; mevcut taslak korunuyor.', true);
  else if (valid) message(hadDraft ? 'Bu tarayıcıdaki taslağın geri geldi.' : 'Hazır. İlk kelimeyi değiştirebilirsin.');
}

$('editor-search').addEventListener('input', filterFields);
$('editor-group').addEventListener('change', filterFields);
$('editor-preview').addEventListener('click', preview);
$('editor-download').addEventListener('click', download);
$('editor-import').addEventListener('change', importFile);
$('editor-stop-preview').addEventListener('click', () => {
  try {
    localStorage.removeItem(PREVIEW_KEY);
    refreshPreviewNote();
    message('Önizleme kapandı. Açık oyun sayfasını yenileyince yayımlanan metinler geri gelir.');
  } catch { message('Önizleme kapatılamadı. Tarayıcı depolama izinlerini kontrol et.', true); }
});
$('editor-reset').addEventListener('click', () => { $('editor-reset-confirm').hidden = false; $('editor-reset-yes').focus(); });
$('editor-reset-no').addEventListener('click', () => { $('editor-reset-confirm').hidden = true; $('editor-reset').focus(); });
$('editor-reset-yes').addEventListener('click', () => {
  replaceValues({});
  $('editor-reset-confirm').hidden = true;
  $('editor-reset').focus();
  if (storageAvailable) message('Bütün metinler varsayılana döndü. Taslağın kaydedildi.');
});
window.addEventListener('pagehide', () => { if (saveTimer && ready) saveDraft(); });
window.addEventListener('storage', (event) => { if (event.key === PREVIEW_KEY) refreshPreviewNote(); });
initialize().catch(() => message('Metin atölyesi açılamadı. Sayfayı yenileyip tekrar dene.', true));
