import { t, loadTexts, applyTexts } from './js/texts.js';
import { isFirebaseConfigured } from './firebase-config.js';
import { createAuction, canBuy } from './js/auction.js';
import { createBlindRanking, normalizeBlindRanking } from './js/blind-ranking.js';
import { createBracket, normalizeBracket, bracketRoundSizes } from './js/bracket.js';
import { createTeamDraft, normalizeTeamDraft } from './js/team-draft.js';
import { isCooperativeMode, createCooperative, normalizeCooperative, createPrivateRank, placePrivateRank } from './js/cooperative.js';
import { renderCooperativePanel, renderCooperativeResults } from './js/cooperative-view.js';
import { captureTeamCursor, isTeamCursorCurrent, assignWithTeamCursor } from './js/team-command.js';
import { shuffledIds, draftTriplets } from './js/game-setup.js';
import { getBracketRoundNames, ROLE_NAMES, fillCard, renderBracketHistory, renderTeamCandidates, renderLineup } from './js/game-view.js';
import { renderRankingList, renderRankChoices } from './js/ranking-view.js';
import { chooseBotMove } from './js/demo-bot.js';
import { changeRoom, seatFor, otherSeat, hasOptionalSpectator, rematchStarter, RoomError } from './js/room-state.js';
import { connectFirebase } from './js/firebase-room.js';
import { DATASET_GROUPS, DATASET_NAMES, resolveDatasetId } from './js/datasets.js';
import { assetUrl } from './js/assets.js';
import { createNextGameView } from './js/next-game-view.js';
import { invitationUrl, parseInvite, renderInviteQR } from './js/invites.js';
import { captureNextGameCursor, readyWithNextCursor } from './js/next-game-command.js';

const $ = id => document.getElementById(id);
const SESSION_KEY = 'iki-kisilik.room.v1';
const NAME_KEY = 'iki-kisilik.name.v1';
const SIGNED_OUT_KEY = 'iki-kisilik.signed-out.v1';
let pendingInvite = parseInvite(window.location.href);
let inviteRequested = new URL(window.location.href).searchParams.has('oda');
let nextGameView = null;
const REACTIONS = { get laugh() { return t('runtime.copy.ha_ha'); }, get angry() { return t('runtime.copy.grrr'); }, get womp() { return t('runtime.copy.womp_womp'); }, get heart() { return t('runtime.copy.iyi_hamle'); } };
const MODE_NAMES = { get auction() { return t('runtime.mode.auction'); }, get 'blind-ranking'() { return t('runtime.mode.blind-ranking'); }, get bracket() { return t('runtime.mode.bracket'); }, get 'team-draft'() { return t('runtime.mode.team-draft'); }, get frequency() { return t('runtime.mode.frequency'); }, get 'double-ranking'() { return t('runtime.mode.double-ranking'); } };
let datasets = {};
const chosenCollections = {};
let selectedCategory = $('dataset-select').value;
let renderedCategory = null;
let renderedFamily = null;
const chosenFamilyCollections = {};
let service = null;
let room = null;
let mySeat = null;
let demo = false;
let busy = false;
let presence = {};
let subscriptions = [];
let stopPresence = null;
let watchedOpponent = null;
let reactionUnsubscribe = null;
let lastReactionSeq = null;
let lastAwardKey = null;
let botTimer = null;
let toastTimer = null;
let soundEnabled = false;
let audioContext;
let lastReactAt = 0;
let lifecycle = 0;
let activeScreen = null;
let actionEpoch = 0;
let pendingAction = null;
let lastVisualState = null;
let pendingRankFocus = null;
let pendingBracketFocus = null;
let selectedDraftId = null;
let draftVisualKey = null;
let signedOut = false;
let closingSession = false;
let sessionOpening = null;
let cooperativeState = { mine: null, opponentProgress: 0, loaded: false };
let cooperativeUnsubscribe = null;
let cooperativeKey = null;
let cooperativeAttempt = null;
let cooperativeInFlight = null;
let cooperativeRetryTimer = null;
let cooperativeRetryUnit = null;
let cooperativeRetryCount = 0;
let demoSecrets = { p1: null, p2: null };
try { signedOut = localStorage.getItem(SIGNED_OUT_KEY) === 'true'; } catch {}

function animateOnce(element, className) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  element.classList.remove(className);
  void element.offsetWidth;
  element.classList.add(className);
}

function fieldError(id, captionId, message) {
  $(id).setAttribute('aria-invalid', 'true');
  $(id).classList.add('field-invalid');
  $(captionId).textContent = message;
  $(id).focus();
}

function setStatusText(id, message) {
  if ($(id).textContent !== message) $(id).textContent = message;
}

function rememberName() {
  try { localStorage.setItem(NAME_KEY, $('nickname').value.trim().slice(0, 20)); } catch {}
}

function selectedDatasetId() {
  return resolveDatasetId(selectedCategory, chosenCollections[selectedCategory]);
}

function selectedMode() {
  return document.querySelector('input[name="mode"]:checked')?.value || 'auction';
}

function selectedBracketSize() { return Number($('bracket-size-select').value); }

function renderBracketSizeOptions() {
  const count = datasets[selectedDatasetId()]?.length || 0;
  const select = $('bracket-size-select');
  const tooSmall = count > 0 && count < 32;
  select.querySelector('option[value="32"]').disabled = tooSmall;
  if (tooSmall && selectedBracketSize() === 32) select.value = '16';
  $('bracket-size-field').hidden = selectedMode() !== 'bracket';
  $('bracket-size-hint').textContent = tooSmall ? t('revision.bracket.size_unavailable', { count }) : t('revision.bracket.size_hint');
}

function renderModePreview() {
  const mode = selectedMode();
  renderBracketSizeOptions();
  $('how-to-title').textContent = t('runtime.lobby.how_to_title', { mode: MODE_NAMES[mode] });
  const rules = {
    auction: t('runtime.copy.20_tl_ile_5_kartlik_kadronu_kur_her_kart_sirayla_bir'),
    'blind-ranking': t('runtime.copy.rastgele_10_karti_sonraki_karti_gormeden_1_10_arasin'),
    bracket: t('revision.bracket.rules', { size: selectedBracketSize(), rounds: Math.log2(selectedBracketSize()), picks: selectedBracketSize() - 1 }),
    'team-draft': t('runtime.copy.ikiniz_de_bagimsiz_olarak_11_tur_oynarsiniz_her_tur_'),
    frequency: t('coop.frequency.rules'),
    'double-ranking': t('coop.double.rules')
  };
  $('how-to-content').textContent = rules[mode];
  const notice = $('setup-notice').querySelector('p');
  if (notice) notice.textContent = t('runtime.copy.cevrimici_oynamak_icin_firebase_ayarlarini_ve_guncel');
  render();
}

function renderCollectionOptions(category) {
  const group = DATASET_GROUPS[category];
  const selectedId = selectedDatasetId();
  const activeFamily = group.families?.find(family => family.sets.includes(selectedId));
  const families = $('collection-families');
  families.hidden = !group.families;
  families.replaceChildren(...(group.families || []).map(family => {
    const label = document.createElement('label'); label.className = 'collection-family';
    const input = document.createElement('input'); input.type = 'radio'; input.name = 'dataset-family'; input.value = family.id; input.checked = family === activeFamily;
    const title = document.createElement('span'); title.textContent = family.title;
    input.addEventListener('change', () => {
      if (!input.checked) return;
      chosenFamilyCollections[`${category}:${activeFamily.id}`] = selectedDatasetId();
      chosenCollections[category] = chosenFamilyCollections[`${category}:${family.id}`] || family.sets[0];
      renderDatasetPreview();
      $('collection-families').querySelector('input:checked')?.focus({ preventScroll: true });
    });
    label.append(input, title); return label;
  }));
  $('collection-volume-heading').hidden = !group.families || activeFamily.sets.length < 2;
  $('collection-heading').textContent = group.heading;
  const options = activeFamily ? group.sets.filter(set => activeFamily.sets.includes(set.id)) : group.sets;
  $('collection-options').replaceChildren(...options.map(set => {
    const label = document.createElement('label'); label.className = 'collection-option';
    const input = document.createElement('input'); input.type = 'radio'; input.name = 'dataset-set'; input.value = set.id; input.checked = set.id === selectedDatasetId();
    const heading = document.createElement('span'); heading.className = 'collection-option-heading';
    const symbol = document.createElement('span'); symbol.setAttribute('aria-hidden', 'true'); symbol.textContent = set.symbol;
    const title = document.createElement('strong'); title.textContent = set.title;
    const count = document.createElement('span'); count.className = 'collection-size'; count.textContent = String(datasets[set.id]?.length || 0);
    const description = document.createElement('span'); description.className = 'collection-description'; description.textContent = set.description;
    heading.append(symbol, title, count); label.append(input, heading, description);
    input.addEventListener('change', () => { if (input.checked) { chosenCollections[category] = set.id; renderDatasetPreview(); } });
    return label;
  }));
  renderedCategory = category;
  renderedFamily = activeFamily?.id || null;
}

function renderCollection() {
  const cards = datasets[selectedDatasetId()] || [];
  const searchText = value => value.toLocaleLowerCase('tr').normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/ı/g, 'i');
  const query = searchText($('collection-search').value.trim());
  const matching = cards.filter(card => searchText(`${card.isim} ${card.takim || ''} ${card.evren || ''} ${card.etiket}`)
    .replaceAll('grand theft auto', 'grand theft auto gta').includes(query));
  $('collection-count').textContent = query ? t('runtime.collection.filtered_count', { count: matching.length, total: cards.length }) : t('runtime.collection.card_count', { count: cards.length });
  $('collection-empty').hidden = !!matching.length;
  $('collection-grid').replaceChildren(...matching.map(card => {
    const item = document.createElement('div'); item.className = 'collection-card';
    const image = document.createElement('img'); image.src = assetUrl(card.gorsel); image.alt = ''; image.loading = 'lazy'; image.width = 96; image.height = 96;
    const name = document.createElement('strong'); name.textContent = card.isim;
    const detail = document.createElement('span'); detail.textContent = card.takim || card.evren || card.etiket;
    item.append(image, name, detail); return item;
  }));
}

function renderDatasetPreview() {
  const category = selectedCategory;
  const id = selectedDatasetId();
  const familyId = DATASET_GROUPS[category].families?.find(family => family.sets.includes(id))?.id || null;
  if (renderedCategory !== category || renderedFamily !== familyId) renderCollectionOptions(category);
  $('dataset-icon-image').src = assetUrl(`assets/images/${DATASET_GROUPS[category].icon}-icon.svg`);
  const cards = datasets[id] || [];
  $('dataset-preview-images').replaceChildren(...cards.slice(0, 4).map(card => {
    const img = document.createElement('img'); img.src = assetUrl(card.gorsel); img.alt = ''; return img;
  }));
  $('dataset-preview-label').textContent = cards.length ? t('runtime.collection.preview', { count: cards.length, dataset: DATASET_NAMES[id] }) : t('runtime.copy.kartlar_yukleniyor');
  const collection = DATASET_GROUPS[category].sets.find(set => set.id === id);
  $('collection-note').textContent = collection.note;
  const searchPrompt = t(collection.searchKey);
  $('collection-search').placeholder = t('runtime.collection.search_placeholder', { prompt: searchPrompt });
  $('collection-search-label').textContent = searchPrompt;
  $('collection-search').value = '';
  renderCollection();
  animateOnce($('dataset-preview-images'), 'card-reveal');
  renderModePreview();
}

function layoutLobby() {
  const datasetField = document.querySelector('.dataset-field');
  const anchor = document.querySelector(window.matchMedia('(max-width: 760px)').matches ? '.nickname-field' : '.mode-fieldset');
  if (datasetField.nextElementSibling !== anchor) anchor.before(datasetField);
  // Keep the player's choice when the field moves between responsive panels.
  $('dataset-select').value = selectedCategory;
}

function keepControlsVisible() {
  if (!window.matchMedia('(max-width: 760px)').matches) return;
  const field = document.activeElement;
  if (!(field instanceof HTMLInputElement || field instanceof HTMLSelectElement)) return;
  const viewport = window.visualViewport;
  const height = viewport?.height || window.innerHeight;
  const offset = viewport?.offsetTop || 0;
  const start = field.getBoundingClientRect().top;
  const action = field.id === 'bid-input' ? $('pass-button') : field.id === 'nickname' ? (!isFirebaseConfigured() ? $('demo-button') : $('create-room')) : field;
  const end = action.getBoundingClientRect().bottom;
  if (start < offset + 20 || end > offset + height - 20) {
    const desiredTop = offset + Math.max(20, (height - (end - start)) / 2);
    window.scrollBy({ top: start - desiredTop, behavior: 'instant' });
  }
}

function renderBusyButtons() {
  const demoLabels = { auction: t('action.demo'), 'blind-ranking': t('runtime.copy.kor_siralamayi_dene'), bracket: t('runtime.copy.turnuvayi_dene'), 'team-draft': t('runtime.copy.botla_takim_kur'), frequency: t('coop.frequency.demo'), 'double-ranking': t('coop.double.demo') };
  const labels = { 'create-room': t('action.create'), 'join-room': t('action.join'), 'demo-button': demoLabels[selectedMode()], 'start-game': t('runtime.copy.oyunu_baslat'), 'bid-button': t('action.bid'), 'pass-button': t('action.pass'), 'rematch-button': t('action.rematch') };
  for (const [id, label] of Object.entries(labels)) {
    const button = $(id), isPending = busy && pendingAction === id;
    const text = button.querySelector('span:not([aria-hidden])');
    const value = isPending ? t('runtime.copy.bekle') : label;
    if (text) text.textContent = value;
    else {
      const node = [...button.childNodes].find(node => node.nodeType === 3 && node.nodeValue.trim());
      if (node) node.nodeValue = value + ' ';
      else button.prepend(document.createTextNode(value + ' '));
    }
    button.classList.toggle('is-busy', isPending);
    button.setAttribute('aria-busy', String(isPending));
  }
}

function celebrate() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const colors = ['#e6989a', '#8ebfaa', '#9c89c3', '#e5c96c'];
  const fragment = document.createDocumentFragment();
  for (let index = 0; index < 20; index++) {
    const pixel = document.createElement('i'); pixel.className = 'pixel-confetti';
    pixel.style.setProperty('--x', `${5 + (index * 23) % 90}%`);
    pixel.style.setProperty('--delay', `${(index % 5) * 65}ms`);
    pixel.style.setProperty('--color', colors[index % colors.length]);
    fragment.append(pixel); setTimeout(() => pixel.remove(), 2200);
  }
  document.body.append(fragment);
}

const storage = {
  get() { try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch { return null; } },
  save(value) { try { localStorage.setItem(SESSION_KEY, JSON.stringify(value)); } catch { toast(t('runtime.copy.tarayici_oturum_kaydina_izin_vermiyor')); } },
  clear() { try { localStorage.removeItem(SESSION_KEY); } catch {} }
};

function toast(message) {
  $('toast').textContent = message;
  $('toast').classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('toast').classList.remove('visible'), 4500);
}

function errorMessage(error) {
  const code = String(error.code || '');
  if (/permission.denied|permission_denied/i.test(code)) return t('runtime.copy.odaya_erisilemiyor_kodu_ve_firebase_veritabani_kural');
  if (code.includes('operation-not-allowed')) return t('runtime.copy.firebase_console_da_anonim_giris_yontemini_acin');
  if (code.includes('unauthorized-domain')) return t('runtime.copy.bu_alan_adini_firebase_authentication_ayarlarina_ekl');
  if (/network|failed to fetch/i.test(code + error.message)) return t('runtime.copy.baglanti_kurulamadi_internetinizi_kontrol_edin');
  return error.message || t('runtime.copy.islem_tamamlanamadi_tekrar_deneyin');
}

function connectionChanged(online) {
  if (online) {
    cooperativeAttempt = null;
    cooperativeUnsubscribe?.(); cooperativeUnsubscribe = null; cooperativeKey = null;
    clearTimeout(cooperativeRetryTimer); cooperativeRetryTimer = null; cooperativeRetryCount = 0;
  }
  $('connection-label').textContent = demo ? t('runtime.copy.yerel_demo') : !isFirebaseConfigured() ? t('runtime.copy.demoya_hazir') : signedOut ? t('runtime.copy.oturum_kapali') : online ? t('runtime.copy.cevrimici') : t('runtime.copy.baglanti_bekleniyor');
  $('status-pill').classList.toggle('offline', !online && !demo && isFirebaseConfigured());
  $('status-pill').classList.toggle('is-connected', online && !demo);
  $('status-pill').classList.toggle('is-demo', demo || !isFirebaseConfigured());
  render();
}

function shuffleDeck(datasetId) {
  return shuffledIds(datasets[datasetId]);
}
function gamePayload(config = room) { return config.mode === 'team-draft' ? { triplets: draftTriplets(datasets[config.datasetId]) } : { deck: shuffleDeck(config.datasetId) }; }

function getCard(id) { return datasets[room.datasetId]?.find(card => card.id === id); }
function nameFor(seat) { return room?.players?.[seat]?.name || t('runtime.copy.oyuncu_bekleniyor'); }
function onlineSeat(seat) { return demo || Object.keys(presence[room?.players?.[seat]?.uid] || {}).length > 0; }
function setScreen(screenId) {
  for (const id of ['lobby-screen', 'room-screen', 'results-screen']) $(id).hidden = id !== screenId;
  if (activeScreen !== screenId) {
    activeScreen = screenId;
    window.scrollTo({ top: 0, behavior: 'instant' });
    const heading = $(screenId).querySelector('h1');
    heading?.setAttribute('tabindex', '-1'); heading?.focus({ preventScroll: true });
    animateOnce($(screenId), 'screen-enter');
  }
}

function renderRoster(element, entries = []) {
  element.replaceChildren();
  if (!entries.length) {
    const empty = document.createElement('li'); empty.className = 'empty-roster';
    empty.textContent = t('runtime.copy.ilk_kartini_kap_kadronu_kur'); element.append(empty); return;
  }
  for (const entry of entries) {
    const card = getCard(entry.id);
    const item = document.createElement('li'); item.className = 'roster-item';
    const completion = entry.source === 'completion';
    item.classList.toggle('is-completion', completion);
    const img = document.createElement('img'); img.className = 'card-mini'; img.alt = ''; img.src = assetUrl(card?.gorsel || 'assets/images/placeholder.svg');
    const label = document.createElement('span'); label.textContent = card?.isim || t('runtime.common.card');
    if (card?.takim) { const team = document.createElement('small'); team.textContent = card.takim; label.append(team); }
    const price = document.createElement('span'); price.className = 'price';
    price.classList.toggle('is-completion', completion);
    price.textContent = completion ? t('revision.auction.completion_label') : t('runtime.common.money', { amount: entry.price });
    if (completion) price.title = t('revision.auction.completion_title');
    item.append(img, label, price); element.append(item);
  }
}

function cooperativeContext(connected, bothOnline) {
  return { room, mySeat, privateState: cooperativeState, connected, bothOnline, busy,
    pendingAction, cardFor: getCard, nameFor };
}

function retryCooperative(key, generation, originService, restartWatch = false) {
  if (cooperativeRetryTimer || cooperativeRetryCount >= 3 || !originService.connected) return;
  const delay = 1000 * 2 ** cooperativeRetryCount++;
  cooperativeRetryTimer = setTimeout(() => {
    cooperativeRetryTimer = null;
    if (generation !== lifecycle || key !== cooperativeKey || originService !== service) return;
    if (restartWatch) { cooperativeUnsubscribe?.(); cooperativeUnsubscribe = null; cooperativeKey = null; }
    cooperativeAttempt = null;
    render();
  }, delay);
}

function syncCooperativeWatch() {
  if (!room || !isCooperativeMode(room.mode) || room.status !== 'playing') {
    cooperativeUnsubscribe?.(); cooperativeUnsubscribe = null; cooperativeKey = null;
    return;
  }
  if (demo) {
    cooperativeState = { loaded: true, mine: demoSecrets[mySeat],
      opponentProgress: room.mode === 'frequency' ? !!demoSecrets[otherSeat(mySeat)]?.locked : demoSecrets[otherSeat(mySeat)]?.count || 0 };
    return;
  }
  const key = `${lifecycle}:${room.code}:${room.createdAt}:${room.round}:${room.mode}:${room.game.roundIndex ?? 0}`;
  if (key === cooperativeKey) return;
  if (key !== cooperativeRetryUnit) {
    cooperativeRetryUnit = key; cooperativeRetryCount = 0;
    clearTimeout(cooperativeRetryTimer); cooperativeRetryTimer = null;
  }
  cooperativeUnsubscribe?.(); cooperativeKey = key;
  cooperativeState = { mine: null, opponentProgress: 0, loaded: false };
  cooperativeAttempt = null;
  if (!service?.connected) { cooperativeKey = null; cooperativeUnsubscribe = null; return; }
  const generation = lifecycle, originService = service;
  cooperativeUnsubscribe = originService.watchCooperative(structuredClone(room), state => {
    if (generation !== lifecycle || key !== cooperativeKey || originService !== service) return;
    cooperativeState = state;
    render();
  }, error => {
    if (generation !== lifecycle || key !== cooperativeKey) return;
    toast(errorMessage(error));
    // Cancelled Firebase listeners need a new subscription, not just a render.
    retryCooperative(key, generation, originService, true);
  });
}

function reconcileCooperative() {
  if (demo || !service?.connected || !room || room.status !== 'playing' || !isCooperativeMode(room.mode) || !cooperativeState.revealed) return;
  if (room.mode === 'frequency' && room.game.stage !== 'choosing') return;
  const key = `${cooperativeKey}:${room.revision}`;
  if (cooperativeAttempt === key || cooperativeInFlight === key) return;
  cooperativeAttempt = key; cooperativeInFlight = key;
  const snapshot = structuredClone(room), generation = lifecycle, originService = service;
  const records = structuredClone(cooperativeState.revealed);
  const kind = snapshot.mode === 'frequency' ? 'frequency-reveal' : 'double-reveal';
  const payload = snapshot.mode === 'frequency' ? { choices: { p1: records.p1.cardId, p2: records.p2.cardId } }
    : { rankings: { p1: records.p1.slots, p2: records.p2.slots } };
  // Both clients may resolve together. One revision can award this result once.
  void originService.mutateRoom(snapshot.code, current => changeRoom(current, originService.uid, snapshot.revision, kind, payload))
    .catch(error => {
      if (generation !== lifecycle || originService !== service) return;
      if (room?.revision === snapshot.revision) {
        toast(errorMessage(error));
        retryCooperative(cooperativeKey, generation, originService);
      }
    }).finally(() => { if (cooperativeInFlight === key) cooperativeInFlight = null; });
}

function resolveDemoCooperative() {
  if (!demo || !isCooperativeMode(room?.mode) || room.status !== 'playing') return;
  if (room.mode === 'frequency') {
    if (room.game.stage !== 'choosing' || !demoSecrets.p1?.locked || !demoSecrets.p2?.locked) return;
    room = changeRoom(room, 'demo-you', room.revision, 'frequency-reveal', { choices: { p1: demoSecrets.p1.cardId, p2: demoSecrets.p2.cardId } });
  } else if (demoSecrets.p1?.count === 8 && demoSecrets.p2?.count === 8) {
    room = changeRoom(room, 'demo-you', room.revision, 'double-reveal', { rankings: { p1: demoSecrets.p1.slots, p2: demoSecrets.p2.slots } });
  }
}

function render() {
  renderApp();
  nextGameView?.render();
  for (const id of ['invite-button', 'result-invite']) $(id).disabled = !room || demo || busy;
  $('invite-arrival').hidden = !pendingInvite || !!room;
  if (pendingInvite && !room) $('invite-arrival-title').textContent = t('room.extra.invite_arrived', { code: pendingInvite });
  if (demo && room?.status === 'finished' && room.nextGame) scheduleBot();
}

function renderApp() {
  renderBusyButtons();
  $('session-button').textContent = busy && pendingAction === 'session-button' ? t('runtime.copy.bekle') : !isFirebaseConfigured() ? t('runtime.copy.kaydi_temizle') : signedOut || !service ? t('runtime.copy.oyuncu_oturumu_ac') : t('runtime.copy.oturumu_kapat');
  $('session-button').disabled = busy || !!sessionOpening || !Object.keys(datasets).length;
  $('session-caption').textContent = !isFirebaseConfigured() ? t('runtime.copy.bu_cihazdaki_adini_ve_demo_turunu_temizleyebilirsin') : signedOut ? t('runtime.copy.oturum_kapali_demo_oynayabilir_veya_yeni_bir_oyuncu_') : t('runtime.copy.odadan_cikmak_kimligini_korur_oturum_kapatmak_eski_o');
  const available = !busy && !!service?.connected && !demo;
  $('create-room').disabled = !available;
  $('join-room').disabled = !available;
  $('demo-button').disabled = busy || !Object.keys(datasets).length;
  if (!room) {
    $('create-caption').textContent = !isFirebaseConfigured() ? t('runtime.copy.oda_baglantisi_henuz_hazir_degil_demoyla_hemen_oynay') : signedOut ? t('runtime.copy.oyuncu_oturumu_kapali_asagidaki_oturum_dugmesiyle_ye') : !service?.connected ? t('runtime.copy.baglanti_bekleniyor_demoyla_bir_isinma_turu_yapabili') : t('runtime.copy.bir_kod_olustur_arkadasini_oyuna_davet_et');
    setScreen('lobby-screen'); return;
  }
  const connected = demo || !!service?.connected;
  $('copy-code').disabled = demo;
  $('copy-code').title = demo ? t('runtime.copy.demo_yalniz_bu_cihazda_oynanir') : t('runtime.copy.kodu_kopyala');
  const opponent = room.players[otherSeat(mySeat)];
  const bothOnline = demo || (onlineSeat('p1') && onlineSeat('p2'));
  const blind = room.mode === 'blind-ranking';
  const bracket = room.mode === 'bracket';
  const teamDraft = room.mode === 'team-draft';
  const cooperative = isCooperativeMode(room.mode);
  $('auction-completion-note').hidden = true;
  syncCooperativeWatch();
  $('room-screen').classList.toggle('is-blind', blind && room.status === 'playing');
  $('room-screen').classList.toggle('is-bracket', bracket && room.status === 'playing');
  $('room-screen').classList.toggle('is-team-draft', teamDraft && room.status === 'playing');
  document.querySelectorAll('[data-reaction]').forEach(button => { button.disabled = busy || !connected || !opponent; });
  if (room.status === 'finished') {
    $('auction-results').hidden = room.mode !== 'auction';
    $('blind-results').hidden = !blind;
    $('bracket-results').hidden = !bracket;
    $('team-draft-results').hidden = !teamDraft;
    $('cooperative-results').hidden = !cooperative;
    $('rematch-note').textContent = blind || bracket ? t('runtime.results.rematch_player', { player: nameFor(rematchStarter(room)) }) : teamDraft ? t('runtime.copy.ayni_oda_ayni_kod_yeni_uclulerle_iki_takim_da_yenide') : t('runtime.copy.ayni_oda_ayni_kod_ilk_hamle_bu_kez_diger_oyuncuda');
    if (cooperative) {
      const arrivedFromGame = lastVisualState?.code === room.code && lastVisualState?.round === room.round && lastVisualState?.status === 'playing';
      setScreen('results-screen');
      $('results-title').textContent = t(room.mode === 'frequency' ? 'coop.frequency.results_title' : 'coop.double.results_title');
      $('results-subtitle').textContent = t('runtime.results.subtitle', { code: room.code, round: room.round, dataset: DATASET_NAMES[room.datasetId] });
      $('rematch-note').textContent = t('coop.rematch');
      renderCooperativeResults(cooperativeContext(connected, bothOnline));
      $('rematch-button').disabled = busy || !connected || !bothOnline;
      if (arrivedFromGame) { celebrate(); beep('win'); }
      lastVisualState = { code: room.code, round: room.round, status: 'finished' };
      return;
    }
    if (blind) {
      renderBlindResults(connected, bothOnline);
      return;
    }
    if (bracket || teamDraft) { renderExtraResults(connected, bothOnline); return; }
    const arrivedFromGame = lastVisualState?.code === room.code && lastVisualState?.round === room.round && lastVisualState?.status === 'playing';
    const finalAward = room.game.lastAward;
    const finalAwardKey = finalAward ? `${room.round}:${finalAward.sequence}` : null;
    const previousCardRect = $('card-image').getBoundingClientRect();
    const animateFinal = finalAwardKey && lastAwardKey && finalAwardKey !== lastAwardKey;
    setScreen('results-screen');
    $('results-title').textContent = t('runtime.copy.kadrolar_tamam');
    $('results-subtitle').textContent = t('runtime.results.subtitle', { code: room.code, round: room.round, dataset: DATASET_NAMES[room.datasetId] });
    for (const seat of ['p1', 'p2']) {
      $(`result-name-${seat}`).textContent = t('runtime.common.player_label', { player: nameFor(seat), self: seat === mySeat ? t('runtime.common.self_suffix') : '' });
      $(`result-budget-${seat}`).textContent = t('runtime.auction.results_budget', { amount: room.game.budgets[seat], count: (room.game.rosters?.[seat] || []).length });
      renderRoster($(`result-roster-${seat}`), room.game.rosters?.[seat]);
    }
    const completedSeats = ['p1', 'p2'].filter(seat => room.game.rosters?.[seat]?.some(entry => entry.source === 'completion'));
    const completedCount = completedSeats.reduce((sum, seat) => sum + room.game.rosters[seat].filter(entry => entry.source === 'completion').length, 0);
    $('auction-completion-note').hidden = completedCount === 0;
    if (completedCount) $('auction-completion-note').textContent = t('revision.auction.completion_notice', { players: completedSeats.map(nameFor).join(' ve '), count: completedCount });
    if (animateFinal) { animateAward(finalAward.seat, finalAward.id, previousCardRect, $(`result-roster-${finalAward.seat}`).parentElement); beep('win'); }
    if (arrivedFromGame) celebrate();
    lastVisualState = { code: room.code, round: room.round, status: 'finished' };
    lastAwardKey = finalAwardKey;
    $('rematch-button').disabled = busy || !connected || !bothOnline;
    scheduleBot(); return;
  }
  setScreen('room-screen');
  $('room-code-display').textContent = room.code;
  $('room-title').textContent = t('runtime.room.title', { dataset: DATASET_NAMES[room.datasetId], mode: MODE_NAMES[room.mode] || MODE_NAMES.auction });
  $('room-subtitle').textContent = demo ? blind || bracket ? t('runtime.copy.yerel_demo_rovansta_bot_secer_sen_izlersin') : t('runtime.copy.yerel_demo_rakibin_atari_bot') : t('runtime.room.subtitle', { round: room.round, summary: cooperative ? t(room.mode === 'frequency' ? 'coop.frequency.summary' : 'coop.double.summary') : blind ? t('runtime.room.blind_summary') : bracket ? t('revision.bracket.summary', { size: room.bracketSize ?? 16, rounds: Math.log2(room.bracketSize ?? 16) }) : teamDraft ? t('runtime.room.draft_summary') : t('runtime.room.auction_summary') });
  setStatusText('opponent-status', opponent ? t('runtime.room.opponent_status', { player: opponent.name, status: onlineSeat(otherSeat(mySeat)) ? t('runtime.room.opponent_online') : t('runtime.room.opponent_reconnecting') }) : t('runtime.copy.arkadasin_icin_bir_koltuk_ayirdik'));
  $('waiting-hint').textContent = hasOptionalSpectator(room) && room.ownerUid === service?.uid ? t('runtime.room.optional_spectator_hint') : !opponent ? t('runtime.copy.kodu_kopyala_ve_arkadasina_gonder_katilinca_oyun_haz') : !bothOnline ? t('runtime.copy.baglanti_bekleniyor_odaniz_guvende') : room.ownerUid === service?.uid ? t('runtime.copy.ikiniz_de_hazirsiniz_oyunu_baslatabilirsin') : t('runtime.copy.oda_sahibi_oyunu_baslattiginda_ilk_kart_acilacak');
  const waiting = room.status === 'waiting';
  $('waiting-eyebrow').textContent = hasOptionalSpectator(room) ? t('runtime.room.optional_spectator_label') : t('static.064');
  $('waiting-panel').hidden = !waiting;
  $('auction-panel').hidden = waiting || room.mode !== 'auction';
  $('blind-panel').hidden = waiting || !blind;
  $('bracket-panel').hidden = waiting || !bracket;
  $('team-draft-panel').hidden = waiting || !teamDraft;
  $('cooperative-panel').hidden = waiting || !cooperative;
  $('start-game').hidden = !waiting || (!demo && service.uid !== room.ownerUid);
  $('start-game').disabled = busy || !connected || (!hasOptionalSpectator(room) && (!opponent || !bothOnline));
  if (waiting) { lastVisualState = { code: room.code, round: room.round, status: 'waiting' }; return; }
  if (cooperative) {
    renderCooperativePanel(cooperativeContext(connected, bothOnline));
    const key = `${room.code}:${room.round}:${room.game.roundIndex ?? 0}:${room.game.stage ?? cooperativeState.mine?.count ?? 0}`;
    if (lastVisualState?.cardKey !== key) {
      if (room.game.stage === 'reveal') beep(room.game.results?.[`r${room.game.roundIndex + 1}`]?.match ? 'win' : 'womp');
    }
    lastVisualState = { code: room.code, round: room.round, status: 'playing', cardKey: key };
    reconcileCooperative(); scheduleBot(); return;
  }
  if (blind) { renderBlind(connected, bothOnline); return; }
  if (bracket) { renderBracket(connected, bothOnline); return; }
  if (teamDraft) { renderTeamDraft(connected, bothOnline); return; }
  const game = room.game;
  const cardKey = `${room.code}:${room.round}:${game.deckIndex}`;
  if (lastVisualState?.cardKey !== cardKey) animateOnce(document.querySelector('.auction-card'), 'card-reveal');
  else if (lastVisualState?.bid !== game.highestBid) { animateOnce($('highest-bid'), 'bid-bump'); beep('bid'); }
  const card = getCard(game.currentCardId);
  $('card-image').src = assetUrl(card?.gorsel || 'assets/images/placeholder.svg');
  $('card-image').alt = card?.isim || t('runtime.copy.acik_artirma_karti');
  $('card-name').textContent = card?.isim || t('runtime.common.card');
  $('card-affiliation').textContent = card?.takim || '';
  $('card-affiliation').hidden = !card?.takim;
  $('card-tag').textContent = card?.etiket || '—';
  $('card-counter').textContent = t('runtime.auction.card_counter', { count: game.deckIndex + 1, total: game.deck.length });
  $('highest-bid').textContent = t('runtime.common.money', { amount: game.highestBid });
  const openingOffer = game.highestBid === 1;
  $('bid-heading').textContent = openingOffer ? t('runtime.copy.acilis_teklifi') : t('runtime.copy.son_teklif');
  $('bidder-label').textContent = openingOffer ? t('runtime.auction.opening_bid', { player: nameFor(game.openerSeat) }) : t('runtime.auction.bidder', { player: nameFor(game.bidderSeat) });
  const isTurn = mySeat === game.turnSeat;
  const canAct = !busy && connected && bothOnline && isTurn;
  $('turn-label').classList.toggle('is-my-turn', isTurn && connected && bothOnline);
  $('bid-form').setAttribute('aria-busy', String(busy && pendingAction === 'bid-button'));
  setStatusText('turn-label', !connected ? t('runtime.copy.baglanti_bekleniyor_2') : !bothOnline ? t('runtime.copy.oyuncu_yeniden_baglaniyor') : isTurn ? t('runtime.copy.sira_sende') : t('runtime.auction.opponent_turn', { player: nameFor(game.turnSeat).toLocaleUpperCase('tr') }));
  $('action-hint').textContent = !bothOnline ? t('runtime.copy.oda_ve_kadrolar_korunuyor_iki_oyuncu_baglandiginda_d') : isTurn ? t('runtime.copy.teklifi_artir_veya_pas_gec_pas_verirsen_kart_rakibin') : t('runtime.copy.rakibinin_hamlesini_bekle_istersen_bir_reaksiyon_gon');
  const min = game.highestBid + 1;
  const canRaise = canAct && canBuy(game, mySeat) && min <= game.budgets[mySeat];
  $('bid-input').min = String(min);
  $('bid-input').max = String(game.budgets[mySeat]);
  const isNewCard = lastVisualState?.cardKey !== cardKey;
  const needsSuggestion = document.activeElement !== $('bid-input') && Number($('bid-input').value) < min;
  if (isNewCard || !isTurn || needsSuggestion) $('bid-input').value = String(min);
  $('bid-input').disabled = !canRaise;
  $('bid-button').disabled = !canRaise;
  $('pass-button').disabled = !canAct;
  document.querySelectorAll('[data-bid-increment]').forEach(button => {
    const amount = game.highestBid + Number(button.dataset.bidIncrement);
    button.disabled = !canRaise || amount > game.budgets[mySeat];
    button.textContent = t('runtime.auction.bid_increment', { amount: button.dataset.bidIncrement });
    button.setAttribute('aria-label', t('runtime.auction.bid_accessible', { amount }));
    button.title = t('runtime.auction.bid_tooltip', { amount });
  });
  if (isTurn && min > game.budgets[mySeat] && bothOnline) $('action-hint').textContent = t('runtime.copy.butcen_daha_yuksek_teklife_yetmiyor_pas_gecerek_deva');
  if (isTurn && game.budgets[mySeat] === 0 && bothOnline) $('action-hint').textContent = t('revision.auction.exhausted_hint');
  if (isTurn && (game.rosters?.[mySeat] || []).length >= 5 && bothOnline) $('action-hint').textContent = t('runtime.copy.kadron_dolu_bu_kartin_rakibine_gitmesi_icin_pas_gec_');
  for (const seat of ['p1', 'p2']) {
    $(`name-${seat}`).textContent = t('runtime.common.player_label', { player: nameFor(seat), self: seat === mySeat ? t('runtime.common.self_suffix') : '' });
    $(`budget-${seat}`).textContent = t('runtime.common.money', { amount: game.budgets[seat] });
    $(`count-${seat}`).textContent = t('runtime.auction.roster_count', { count: (game.rosters?.[seat] || []).length });
    const count = (game.rosters?.[seat] || []).length;
    $(`progress-${seat}`).setAttribute('aria-label', t('runtime.auction.roster_accessible', { count }));
    $(`progress-${seat}`).querySelectorAll('i').forEach((pip, index) => pip.classList.toggle('filled', index < count));
    $(`player-${seat}`).classList.toggle('is-you', seat === mySeat);
    $(`player-${seat}`).classList.toggle('is-turn', seat === game.turnSeat);
    renderRoster($(`roster-${seat}`), game.rosters?.[seat]);
  }
  const award = game.lastAward;
  const awardKey = award ? `${room.round}:${award.sequence}` : null;
  if (awardKey && lastAwardKey && awardKey !== lastAwardKey) {
    animateAward(award.seat, award.id);
    toast(t('runtime.auction.sold_notice', { player: nameFor(room.lastAction.seat), card: getCard(award.id)?.isim || t('runtime.common.card'), winner: nameFor(award.seat), amount: award.price }));
    beep('win');
  }
  lastAwardKey = awardKey || `${room.round}:0`;
  lastVisualState = { code: room.code, round: room.round, status: 'playing', cardKey, bid: game.highestBid };
  document.querySelectorAll('[data-reaction]').forEach(button => { button.disabled = busy || !connected || !opponent; });
  scheduleBot();
}

function renderBlind(connected, bothOnline) {
  const game = normalizeBlindRanking(room.game);
  const card = getCard(game.currentCardId);
  const isActive = mySeat === game.activeSeat;
  const canAct = isActive && connected && !busy;
  const sameRound = lastVisualState?.code === room.code && lastVisualState?.round === room.round;
  const newPlacement = sameRound && lastVisualState.deckIndex < game.deckIndex;
  $('blind-progress').textContent = t('runtime.ranking.progress', { count: game.deckIndex + 1 });
  $('blind-role').textContent = isActive ? t('runtime.copy.sen_siraliyorsun') : t('runtime.copy.izleyici_modu');
  $('blind-role').classList.toggle('is-viewer', !isActive);
  $('blind-active-name').textContent = nameFor(game.activeSeat);
  $('blind-card-image').src = assetUrl(card?.gorsel || 'assets/images/placeholder.svg');
  $('blind-card-image').alt = card?.isim || t('runtime.copy.siradaki_kart');
  $('blind-card-name').textContent = card?.isim || t('runtime.copy.siradaki_kart');
  $('blind-card-tag').textContent = card?.etiket || '—';
  $('blind-card-affiliation').textContent = card?.takim || '';
  $('blind-card-affiliation').hidden = !card?.takim;
  $('blind-choices').hidden = !isActive;
  $('blind-hint').textContent = !connected ? t('runtime.copy.baglanti_bekleniyor_siralaman_korunuyor') : busy && pendingAction?.startsWith('rank-slot-') ? t('runtime.copy.kart_siraya_yerlestiriliyor') : isActive ? t('runtime.copy.1_en_iyi_10_en_alt_secimin_kalici') : t('runtime.ranking.viewer_hint', { player: nameFor(game.activeSeat) });
  renderRankChoices($('blind-choices'), game.slots, canAct, busy ? pendingAction : null);
  renderRankingList($('blind-slots'), game.slots, getCard, newPlacement ? game.lastPlacement.slot : 0);
  const cardKey = `${room.code}:${room.round}:${game.deckIndex}`;
  if (lastVisualState?.cardKey !== cardKey) animateOnce($('blind-card-image').closest('.blind-card'), 'card-reveal');
  if (newPlacement) {
    beep('bid');
  }
  // Transactions can arrive while controls are disabled. Restore focus only
  // after the successful placement and the pending action have both finished.
  if (pendingRankFocus?.code === room.code && pendingRankFocus.round === room.round && game.deckIndex > pendingRankFocus.deckIndex && canAct) {
    $('blind-choices').querySelector('button:not(:disabled)')?.focus({ preventScroll: true });
    pendingRankFocus = null;
  }
  lastVisualState = { code: room.code, round: room.round, status: 'playing', cardKey, deckIndex: game.deckIndex };
  scheduleBot();
}

function renderBlindResults(connected, bothOnline) {
  const game = normalizeBlindRanking(room.game);
  pendingRankFocus = null;
  const arrivedFromGame = lastVisualState?.code === room.code && lastVisualState?.round === room.round && lastVisualState?.status === 'playing';
  setScreen('results-screen');
  $('results-title').textContent = t('runtime.copy.siralama_tamam');
  $('results-subtitle').textContent = t('runtime.ranking.results_subtitle', { code: room.code, round: room.round, dataset: DATASET_NAMES[room.datasetId] });
  $('blind-result-owner').textContent = t('runtime.ranking.result_owner', { player: nameFor(game.activeSeat) });
  renderRankingList($('blind-result-slots'), game.slots, getCard, arrivedFromGame ? game.lastPlacement.slot : 0);
  if (arrivedFromGame) { celebrate(); beep('win'); }
  lastVisualState = { code: room.code, round: room.round, status: 'finished', deckIndex: game.deckIndex };
  $('rematch-button').disabled = busy || !connected;
}

function renderBracket(connected, bothOnline) {
  const game = normalizeBracket(room.game);
  const canAct = mySeat === game.activeSeat && connected && !busy;
  const key = `${room.code}:${room.round}:${game.matchIndex}`;
  const sameRound = lastVisualState?.code === room.code && lastVisualState?.round === room.round;
  const changed = sameRound && lastVisualState.matchIndex < game.matchIndex;
  $('bracket-progress').textContent = t('revision.bracket.progress', { round: getBracketRoundNames(game.deck.length)[game.round - 1], count: game.matchIndex + 1, total: game.deck.length - 1 });
  $('bracket-tree-size').textContent = t('revision.bracket.tree_span', { size: game.deck.length });
  $('bracket-role').textContent = mySeat === game.activeSeat ? t('runtime.copy.sen_seciyorsun') : t('runtime.copy.izleyici_modu');
  $('bracket-role').classList.toggle('is-viewer', mySeat !== game.activeSeat);
  $('bracket-active-name').textContent = nameFor(game.activeSeat);
  for (const side of ['left', 'right']) {
    const id = game.currentPair[side]; fillCard(`bracket-${side}`, getCard(id));
    const button = $(`bracket-${side}`); button.disabled = !canAct; button.dataset.cardId = String(id);
    button.setAttribute('aria-label', t('runtime.bracket.card_accessible', { card: getCard(id)?.isim }));
  }
  $('bracket-hint').textContent = !connected ? t('runtime.copy.baglanti_bekleniyor_turnuvan_korunuyor') : busy ? t('runtime.copy.secim_kaydediliyor') : mySeat === game.activeSeat ? t('runtime.copy.hangisi_ust_tura_ciksin_bir_kart_sec') : t('runtime.bracket.viewer_hint', { player: nameFor(game.activeSeat) });
  renderBracketHistory($('bracket-history'), game, getCard);
  if (lastVisualState?.cardKey !== key) animateOnce($('bracket-left').parentElement, 'card-reveal');
  if (changed) beep('bid');
  if (pendingBracketFocus?.code === room.code && pendingBracketFocus.round === room.round && game.matchIndex > pendingBracketFocus.matchIndex && canAct) {
    $('bracket-left').focus({ preventScroll: true }); pendingBracketFocus = null;
  }
  lastVisualState = { code: room.code, round: room.round, status: 'playing', cardKey: key, matchIndex: game.matchIndex };
  scheduleBot();
}

function renderTeamDraft(connected, bothOnline) {
  const game = normalizeTeamDraft(room.game), mine = game.players[mySeat];
  const key = `${room.code}:${room.round}:${mySeat}:${mine.roundIndex}`;
  const canAct = !mine.done && connected && bothOnline && !busy;
  $('draft-pool-note').textContent = datasets[room.datasetId].some(card => card.etiket === 'KL') ? t('revision.draft.goalkeeper_note') : t('static.101');
  if (draftVisualKey !== key) { selectedDraftId = null; draftVisualKey = key; }
  if (Object.values(mine.pending).includes(selectedDraftId)) selectedDraftId = null;
  $('team-draft-progress').textContent = mine.done ? t('runtime.copy.11_11_tamam') : t('runtime.draft.progress', { round: mine.roundIndex + 1 });
  $('team-draft-play').hidden = mine.done;
  $('team-draft-waiting').hidden = !mine.done;
  for (const seat of ['p1', 'p2']) {
    const player = game.players[seat];
    $('team-draft-name-' + seat).textContent = t('runtime.common.player_label', { player: nameFor(seat), self: seat === mySeat ? t('runtime.common.self_suffix') : '' });
    $('team-draft-progress-' + seat).textContent = t('runtime.draft.player_progress', { round: player.roundIndex, status: player.done ? t('runtime.draft.ready_suffix') : t('runtime.draft.roles_suffix', { count: Object.keys(player.pending).length }) });
  }
  if (!mine.done) {
    const triple = game.triplets[mine.roundIndex];
    $('team-draft-tag').textContent = triple.etiket;
    renderTeamCandidates($('team-draft-candidates'), triple, selectedDraftId, mine.pending, canAct, key, getCard);
    document.querySelectorAll('[data-draft-role]').forEach(button => {
      const role = button.dataset.draftRole, id = mine.pending[role];
      button.disabled = !canAct || !!id || selectedDraftId === null;
      button.classList.toggle('is-filled', !!id);
      let label = button.querySelector('strong'), description = button.querySelector('span');
      if (!label || !description) { label = document.createElement('strong'); description = document.createElement('span'); button.replaceChildren(label, description); }
      label.textContent = id ? t('runtime.draft.locked_role', { role: ROLE_NAMES[role] }) : ROLE_NAMES[role];
      description.textContent = id ? getCard(id)?.isim || t('runtime.copy.kilitli') : { start: t('runtime.copy.ilk_11'), bench: t('runtime.copy.yedek'), cut: t('runtime.copy.disarida') }[role];
      button.title = id ? getCard(id)?.isim || '' : t('runtime.draft.assign_role', { role: ROLE_NAMES[role] });
      button.setAttribute('aria-label', id ? t('runtime.draft.locked_card', { role: ROLE_NAMES[role], card: getCard(id)?.isim }) : t('runtime.draft.assign_role', { role: ROLE_NAMES[role] }));
    });
    $('team-draft-hint').textContent = !connected || !bothOnline ? t('runtime.copy.baglanti_bekleniyor_secimlerin_korunuyor') : busy ? t('runtime.copy.secimin_kaydediliyor') : selectedDraftId === null ? t('runtime.copy.once_bir_kart_sec_sonra_rolunu_belirle') : t('runtime.draft.choose_role', { card: getCard(selectedDraftId)?.isim });
  }
  renderLineup($('team-draft-starters'), mine, getCard);
  const changed = lastVisualState?.code === room.code && lastVisualState?.round === room.round && lastVisualState.assignmentCount < game.assignmentCount;
  if (changed) beep('bid');
  if (lastVisualState?.cardKey !== key && !mine.done) animateOnce($('team-draft-candidates'), 'card-reveal');
  lastVisualState = { code: room.code, round: room.round, status: 'playing', cardKey: key, assignmentCount: game.assignmentCount };
  scheduleBot();
}

function renderExtraResults(connected, bothOnline) {
  const arrived = lastVisualState?.code === room.code && lastVisualState?.round === room.round && lastVisualState?.status === 'playing';
  pendingBracketFocus = null;
  setScreen('results-screen');
  $('results-subtitle').textContent = t('runtime.results.subtitle', { code: room.code, round: room.round, dataset: DATASET_NAMES[room.datasetId] });
  if (room.mode === 'bracket') {
    const game = normalizeBracket(room.game);
    $('results-title').textContent = t('runtime.copy.sampiyon_belli');
    $('bracket-result-owner').textContent = t('runtime.bracket.result_owner', { player: nameFor(game.activeSeat) });
    fillCard('bracket-winner', getCard(game.winnerId));
    const sizes = bracketRoundSizes(game.deck.length), names = getBracketRoundNames(game.deck.length);
    $('bracket-round-count').textContent = t('revision.bracket.round_count', { count: sizes.length });
    const path = Object.entries(game.choices).filter(([, id]) => id === game.winnerId).sort(([a], [b]) => Number(a.slice(1)) - Number(b.slice(1)));
    $('bracket-winner-path').replaceChildren(...path.map(([match]) => {
      const index = Number(match.slice(1)) - 1, row = document.createElement('li'); row.className = 'bracket-history-item';
      let end = 0;
      const roundIndex = sizes.findIndex(size => { end += size; return index < end; });
      row.textContent = t('runtime.bracket.winner_path', { round: names[roundIndex] });
      return row;
    }));
  } else {
    const game = normalizeTeamDraft(room.game);
    $('results-title').textContent = t('runtime.copy.ilk_11_ler_sahada');
    for (const seat of ['p1', 'p2']) {
      $(`team-result-name-${seat}`).textContent = t('runtime.common.player_label', { player: nameFor(seat), self: seat === mySeat ? t('runtime.common.self_suffix') : '' });
      renderLineup($(`team-result-lineup-${seat}`), game.players[seat], getCard, true);
    }
  }
  if (arrived) { celebrate(); beep('win'); }
  lastVisualState = { code: room.code, round: room.round, status: 'finished' };
  $('rematch-button').disabled = busy || !connected || (!hasOptionalSpectator(room) && !bothOnline);
}

function animateAward(seat, cardId, originRect, target) {
  const source = $('card-image');
  const destination = target || $(`player-${seat}`);
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const from = originRect || source.getBoundingClientRect(), to = destination.getBoundingClientRect();
  const ghost = source.cloneNode(); ghost.removeAttribute('id'); ghost.alt = ''; ghost.className = 'award-ghost';
  ghost.src = assetUrl(getCard(cardId)?.gorsel || 'assets/images/placeholder.svg');
  Object.assign(ghost.style, { position: 'fixed', left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, height: `${from.height}px`, zIndex: '40', pointerEvents: 'none' });
  document.body.append(ghost);
  const animation = ghost.animate([{ transform: 'translate(0,0) scale(1)', opacity: 0.8 }, { transform: `translate(${to.left + to.width / 2 - from.left - from.width / 2}px,${to.top - from.top}px) scale(.25)`, opacity: 0 }], { duration: 600, easing: 'steps(10)' });
  animation.finished.finally(() => ghost.remove());
  destination.classList.add('award-flash'); setTimeout(() => destination.classList.remove('award-flash'), 650);
}

function beep(type) {
  if (!soundEnabled) return;
  try {
    const Audio = window.AudioContext || window.webkitAudioContext;
    audioContext ||= new Audio();
    void audioContext.resume();
    const notes = type === 'womp' ? [290, 230, 180, 120] : type === 'angry' ? [150, 100, 150] : type === 'win' ? [392, 523, 659] : type === 'bid' ? [440, 660] : [523, 659, 523];
    notes.forEach((frequency, index) => {
      const oscillator = audioContext.createOscillator(), gain = audioContext.createGain();
      const start = audioContext.currentTime + index * 0.12;
      oscillator.type = 'square'; oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.045, start); gain.gain.exponentialRampToValueAtTime(0.001, start + 0.11);
      oscillator.connect(gain); gain.connect(audioContext.destination); oscillator.start(start); oscillator.stop(start + 0.12);
    });
  } catch { soundEnabled = false; }
}

function showReaction(type, sender) {
  const label = REACTIONS[type] || REACTIONS.laugh;
  const item = document.createElement('div'); item.className = `reaction-pop reaction-${type}`;
  const glyph = document.createElement('span');
  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); icon.setAttribute('viewBox', '0 0 16 16'); icon.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use'); use.setAttribute('href', assetUrl(`assets/images/reactions.svg#${REACTIONS[type] ? type : 'laugh'}`));
  icon.append(use); glyph.append(icon);
  const text = document.createElement('strong'); text.textContent = t('runtime.reaction.notification', { player: sender, reaction: label });
  item.append(glyph, text); $('reaction-stage').append(item);
  while ($('reaction-stage').children.length > 3) $('reaction-stage').firstElementChild.remove();
  setTimeout(() => item.remove(), 2600); beep(type);
}

function watchOpponentReaction() {
  if (demo || !room) return;
  const opponentUid = room.players[otherSeat(mySeat)]?.uid;
  if (!opponentUid || watchedOpponent === opponentUid) return;
  reactionUnsubscribe?.(); watchedOpponent = opponentUid; lastReactionSeq = null;
  const generation = lifecycle;
  reactionUnsubscribe = service.watchReaction(room.code, opponentUid, event => {
    if (generation !== lifecycle || !room) return;
    if (!event) { lastReactionSeq = 0; return; }
    // First snapshot is historical; never replay an old reaction on refresh.
    if (lastReactionSeq !== null && event.seq > lastReactionSeq) showReaction(event.type, nameFor(otherSeat(mySeat)));
    lastReactionSeq = event.seq;
  }, error => { if (generation === lifecycle) toast(errorMessage(error)); });
}

async function detach() {
  $('invite-dialog').close();
  nextGameView?.reset();
  lifecycle++;
  clearTimeout(cooperativeRetryTimer); cooperativeRetryTimer = null;
  cooperativeRetryUnit = null; cooperativeRetryCount = 0;
  cooperativeUnsubscribe?.(); cooperativeUnsubscribe = null; cooperativeKey = null;
  cooperativeState = { mine: null, opponentProgress: 0, loaded: false };
  cooperativeAttempt = null; cooperativeInFlight = null; demoSecrets = { p1: null, p2: null };
  clearTimeout(botTimer); botTimer = null;
  subscriptions.forEach(unsubscribe => unsubscribe()); subscriptions = [];
  reactionUnsubscribe?.(); reactionUnsubscribe = null; watchedOpponent = null;
  const stop = stopPresence; stopPresence = null;
  // Offline network cleanup must never delay a local exit or demo screen.
  if (stop) void stop().catch(() => {});
  clearTimeout(toastTimer); $('toast').classList.remove('visible'); $('reaction-stage').replaceChildren();
  document.querySelectorAll('.pixel-confetti, .award-ghost').forEach(element => element.remove());
  presence = {}; lastAwardKey = null; lastVisualState = null; pendingRankFocus = null; pendingBracketFocus = null; selectedDraftId = null; draftVisualKey = null;
  // DEMO codes and card IDs can repeat across collections; drop cached views.
  document.querySelectorAll('[data-render-key]').forEach(element => { delete element.dataset.renderKey; });
  for (const id of ['blind-slots', 'blind-result-slots']) $(id).replaceChildren();
}

function assertRoomContent(value) {
  if (!value || !MODE_NAMES[value.mode] || !datasets[value.datasetId]) throw new RoomError(t('runtime.copy.oda_ayarlari_bu_surumle_uyumlu_degil'));
  if (value.mode === 'bracket' && ![16, 32].includes(value.bracketSize ?? 16)) throw new RoomError('Turnuva 16 veya 32 kartla başlamalı.');
  if (!value.game) return;
  const byId = new Map(datasets[value.datasetId].map(card => [card.id, card]));
  if (value.mode === 'team-draft') {
    const game = normalizeTeamDraft(value.game);
    if (game.triplets.some(triple => triple.cards.some(id => byId.get(id)?.etiket !== triple.etiket))) throw new RoomError(t('runtime.copy.odanin_ucluleri_bu_koleksiyonla_uyusmuyor_veri_dosya'));
  } else {
    if (!Array.isArray(value.game.deck) || value.game.deck.some(id => !byId.has(id))) throw new RoomError(t('runtime.copy.odanin_kartlari_bu_koleksiyonla_uyusmuyor_veri_dosya'));
    if (value.mode === 'bracket') normalizeBracket(value.game);
    if (value.mode === 'bracket' && value.game.deck.length !== (value.bracketSize ?? 16)) throw new RoomError('Turnuvanın kart sayısı oda seçimiyle uyuşmuyor.');
    if (value.mode === 'blind-ranking') normalizeBlindRanking(value.game);
    if (isCooperativeMode(value.mode)) normalizeCooperative(value.mode, value.game);
  }
}

async function attach(nextRoom, originService = service, originEpoch = actionEpoch) {
  if (!originService || originService !== service || originEpoch !== actionEpoch) return;
  assertRoomContent(nextRoom);
  const nextSeat = seatFor(nextRoom, originService.uid);
  if (!nextSeat) throw new RoomError(t('runtime.copy.oyuncu_kimligi_bu_odada_bulunamadi'));
  await detach();
  if (originService !== service || originEpoch !== actionEpoch) return;
  demo = false;
  room = nextRoom; mySeat = nextSeat;
  storage.save({ code: room.code, uid: service.uid });
  const generation = lifecycle;
  subscriptions.push(originService.watchRoom(room.code, value => {
    if (generation !== lifecycle) return;
    if (!value) { void leaveRoom(true); toast(t('runtime.copy.oda_artik_mevcut_degil')); return; }
    try {
      assertRoomContent(value);
      const seat = seatFor(value, originService.uid);
      if (!seat) throw new RoomError(t('runtime.copy.oyuncu_kimligi_bu_odada_bulunamadi'));
      room = value; mySeat = seat; watchOpponentReaction(); render();
    } catch (error) { void leaveRoom(true).then(() => toast(errorMessage(error))); }
  }, error => {
    if (generation !== lifecycle) return;
    void leaveRoom(true).then(() => toast(errorMessage(error)));
  }));
  subscriptions.push(originService.watchPresence(room.code, value => {
    if (generation !== lifecycle) return; presence = value; render();
  }, error => { if (generation === lifecycle) toast(errorMessage(error)); }));
  const cleanupPresence = await originService.enterPresence(room.code, error => { if (generation === lifecycle) toast(errorMessage(error)); });
  if (generation !== lifecycle) { void cleanupPresence().catch(() => {}); return; }
  stopPresence = cleanupPresence;
  watchOpponentReaction(); render();
}

async function runAction(action, buttonId = null) {
  if (busy) return;
  const epoch = ++actionEpoch;
  busy = true; pendingAction = buttonId; render();
  try { await action(); } catch (error) {
    if (epoch !== actionEpoch) return;
    if (buttonId?.startsWith('rank-slot-')) pendingRankFocus = null;
    if (buttonId?.startsWith('bracket-')) pendingBracketFocus = null;
    toast(errorMessage(error));
  }
  finally { if (epoch === actionEpoch) { busy = false; pendingAction = null; render(); } }
}

async function command(kind, payload = {}) {
  if (!room) return;
  const expectedRevision = room.revision;
  const uid = demo ? 'demo-you' : service?.uid;
  const cursor = kind === 'assign' && room.mode === 'team-draft' ? captureTeamCursor(room, uid) : null;
  const readyCursor = kind === 'ready-next' ? captureNextGameCursor(room, uid) : null;
  const apply = current => readyCursor ? readyWithNextCursor(current, uid, readyCursor, payload)
    : cursor ? assignWithTeamCursor(current, uid, cursor, payload) : changeRoom(current, uid, expectedRevision, kind, payload);
  if (demo) {
    room = apply(room);
    if (isCooperativeMode(room.mode) && (kind === 'frequency-next' || kind === 'rematch' || room.lastAction?.kind === 'next-game')) demoSecrets = { p1: null, p2: null };
    render();
  } else {
    if (!['propose-next', 'ready-next'].includes(kind) && !hasOptionalSpectator(room) && (!onlineSeat('p1') || !onlineSeat('p2'))) throw new RoomError(t('runtime.copy.iki_oyuncu_da_bagli_oldugunda_devam_edebilirsiniz'));
    const originService = service;
    await originService.mutateRoom(room.code, apply);
  }
}

function scheduleBot() {
  if (!demo || busy || botTimer) return;
  if (room?.status === 'finished' && room.nextGame && !room.nextGame.ready.p2) {
    const id = room.nextGame.id, generation = lifecycle;
    botTimer = setTimeout(() => {
      botTimer = null;
      if (generation !== lifecycle || !demo || busy || room?.status !== 'finished' || room.nextGame?.id !== id || room.nextGame.ready.p2) { render(); return; }
      room = changeRoom(room, 'demo-bot', room.revision, 'ready-next', { id, ready: true, ...gamePayload(room.nextGame) });
      demoSecrets = { p1: null, p2: null }; render();
    }, 900);
    return;
  }
  if (room?.status !== 'playing') return;
  if (isCooperativeMode(room.mode)) {
    if (room.mode === 'frequency' ? room.game.stage !== 'choosing' || demoSecrets.p2?.locked : demoSecrets.p2?.count === 8) return;
    const generation = lifecycle, round = room.round, index = room.game.roundIndex ?? 0;
    botTimer = setTimeout(() => {
      botTimer = null;
      if (generation !== lifecycle || !demo || !room || room.status !== 'playing' || room.round !== round || (room.game.roundIndex ?? 0) !== index) return;
      if (busy) { scheduleBot(); return; }
      if (room.mode === 'frequency') {
        if (room.game.stage !== 'choosing' || demoSecrets.p2?.locked) return;
        demoSecrets.p2 = { locked: true, cardId: room.game.deck[index * 2 + Math.floor(Math.random() * 2)] };
      } else {
        const record = demoSecrets.p2 || createPrivateRank();
        const slots = Array.from({ length: 8 }, (_, i) => i + 1).filter(slot => !record.slots[`s${slot}`]);
        demoSecrets.p2 = placePrivateRank(room.game.deck, record, slots[Math.floor(Math.random() * slots.length)]);
      }
      resolveDemoCooperative(); render();
    }, 900);
    return;
  }
  const blind = room.mode === 'blind-ranking';
  const bracket = room.mode === 'bracket', teamDraft = room.mode === 'team-draft';
  if (teamDraft ? room.game.players.p2.done : (blind || bracket ? room.game.activeSeat : room.game.turnSeat) !== 'p2') return;
  const expectedRevision = room.revision;
  const botCursor = teamDraft ? captureTeamCursor(room, 'demo-bot') : null;
  const originLifecycle = lifecycle;
  botTimer = setTimeout(() => {
    botTimer = null;
    if (originLifecycle !== lifecycle || !demo || busy || !room || room.status !== 'playing') return;
    if (teamDraft ? !isTeamCursorCurrent(room, 'demo-bot', botCursor) : room.revision !== expectedRevision) { scheduleBot(); return; }
    const slots = blind ? Array.from({ length: 10 }, (_, index) => index + 1).filter(slot => room.game.slots?.[`s${slot}`] === undefined) : [];
    let move;
    if (blind) move = { kind: 'rank', slot: slots[Math.floor(Math.random() * slots.length)] };
    else if (bracket) move = { kind: 'choose', cardId: room.game.currentPair[Math.random() < .5 ? 'left' : 'right'] };
    else if (teamDraft) {
      const player = room.game.players.p2;
      const roles = ['start', 'bench', 'cut'].filter(role => player.pending?.[role] === undefined);
      const candidates = room.game.triplets[player.roundIndex].cards.filter(id => !Object.values(player.pending || {}).includes(id));
      move = { kind: 'assign', role: roles[0], cardId: candidates[Math.floor(Math.random() * candidates.length)] };
    } else move = chooseBotMove(room.game, Math.random());
    if (!move) return;
    try {
      const payload = { amount: move.amount, slot: move.slot, cardId: move.cardId, role: move.role };
      room = teamDraft ? assignWithTeamCursor(room, 'demo-bot', botCursor, payload) : changeRoom(room, 'demo-bot', expectedRevision, move.kind, payload);
      render();
    }
    catch (error) { toast(errorMessage(error)); }
  }, 1100);
}

async function leaveRoom(force = false) {
  actionEpoch++;
  clearInviteAddress();
  busy = true;
  try { await detach(); room = null; mySeat = null; demo = false; storage.clear(); }
  finally { busy = false; pendingAction = null; connectionChanged(service?.connected || false); }
}

async function sessionEnded() {
  if (closingSession) return;
  service = null; signedOut = true;
  try { localStorage.setItem(SIGNED_OUT_KEY, 'true'); } catch {}
  await leaveRoom(true);
  toast(t('runtime.copy.oyuncu_oturumu_kapandi_yeni_bir_oturum_acabilirsin'));
}

async function openSession() {
  if (!isFirebaseConfigured()) throw new RoomError(t('runtime.copy.once_firebase_yapilandirmasini_ekleyin'));
  if (sessionOpening) return sessionOpening;
  sessionOpening = (async () => {
    const originEpoch = actionEpoch;
    const nextService = await connectFirebase(connectionChanged, () => void sessionEnded());
    if (originEpoch !== actionEpoch) { nextService.dispose(); return; }
    service = nextService; signedOut = false; $('setup-notice').hidden = true;
    try { localStorage.removeItem(SIGNED_OUT_KEY); } catch {}
    connectionChanged(service.connected);
  })();
  render();
  try { await sessionOpening; } finally { sessionOpening = null; render(); }
}

$('session-button').addEventListener('click', () => {
  if (isFirebaseConfigured() && (signedOut || !service)) { void runAction(openSession, 'session-button'); return; }
  $('session-dialog-title').textContent = isFirebaseConfigured() ? t('runtime.copy.oturumu_kapat') : t('runtime.copy.yerel_kaydi_temizle');
  $('session-dialog-description').textContent = isFirebaseConfigured()
    ? t('runtime.copy.anonim_oyuncu_kimligin_kapanir_onceki_odalara_ayni_o')
    : t('runtime.copy.bu_cihazdaki_oyuncu_adin_ve_acik_demo_turu_temizlene');
  $('session-dialog').showModal(); $('session-cancel').focus();
});
$('session-cancel').addEventListener('click', () => $('session-dialog').close());
$('session-confirm').addEventListener('click', () => {
  $('session-dialog').close();
  void runAction(async () => {
    closingSession = true;
    try {
      await detach(); room = null; mySeat = null; demo = false; storage.clear(); render();
      if (service) { await service.signOut(); service = null; signedOut = true; }
      try { localStorage.removeItem(NAME_KEY); if (signedOut) localStorage.setItem(SIGNED_OUT_KEY, 'true'); } catch {}
      $('nickname').value = ''; $('room-code').value = '';
      connectionChanged(false);
      toast(isFirebaseConfigured() ? t('runtime.copy.oturum_kapandi_demo_veya_yeni_bir_oyuncu_oturumu_ile') : t('runtime.copy.yerel_kayit_temizlendi_yeni_bir_isimle_baslayabilirs'));
    } finally { closingSession = false; }
  }, 'session-button');
});

function playerName() {
  const name = $('nickname').value.trim();
  if (!name) { fieldError('nickname', 'nickname-caption', t('runtime.copy.once_kendine_bir_oyuncu_adi_sec')); throw new RoomError(t('runtime.copy.once_oyuncu_adini_yaz')); }
  rememberName();
  return name.slice(0, 20);
}

$('create-form').addEventListener('submit', event => {
  event.preventDefault(); void runAction(async () => {
    const name = playerName();
    if (!service) throw new RoomError(t('runtime.copy.once_firebase_baglanti_ayarlarini_ekleyin'));
    if (!MODE_NAMES[selectedMode()]) throw new RoomError(t('runtime.copy.bu_oyun_modu_henuz_oynanabilir_degil'));
    const originService = service, epoch = actionEpoch;
    await attach(await originService.createRoom(name, selectedDatasetId(), selectedMode(), { bracketSize: selectedBracketSize() }), originService, epoch);
  }, 'create-room');
});
$('join-form').addEventListener('submit', event => {
  event.preventDefault(); void runAction(async () => {
    const name = playerName(), code = $('room-code').value.trim();
    if (!/^\d{6}$/.test(code)) { fieldError('room-code', 'join-caption', t('runtime.copy.arkadasinin_gonderdigi_6_rakamli_kodu_gir')); throw new RoomError(t('runtime.copy.oda_kodu_6_rakam_olmali')); }
    if (!service) throw new RoomError(t('runtime.copy.once_firebase_baglanti_ayarlarini_ekleyin'));
    const originService = service, epoch = actionEpoch;
    await attach(await originService.joinRoom(code, name), originService, epoch);
  }, 'join-room');
});
$('demo-button').addEventListener('click', () => void runAction(async () => {
  rememberName();
  await detach(); storage.clear(); demo = true;
  const datasetId = selectedDatasetId();
  const mode = selectedMode();
  if (!MODE_NAMES[mode]) throw new RoomError(t('runtime.copy.bu_oyun_modu_henuz_oynanabilir_degil'));
  room = { version: 1, code: 'DEMO', ownerUid: 'demo-you', datasetId, mode,
    ...(mode === 'bracket' ? { bracketSize: selectedBracketSize() } : {}),
    status: 'playing', round: 1, starterSeat: 'p1', revision: 1,
    players: { p1: { uid: 'demo-you', name: $('nickname').value.trim().slice(0,20) || 'Oyuncu 1' }, p2: { uid: 'demo-bot', name: 'Atari Bot' } },
    game: isCooperativeMode(mode) ? createCooperative(mode, shuffleDeck(datasetId)) : mode === 'team-draft' ? createTeamDraft(draftTriplets(datasets[datasetId])) : mode === 'bracket' ? createBracket(shuffleDeck(datasetId), 'p1', selectedBracketSize()) : mode === 'blind-ranking' ? createBlindRanking(shuffleDeck(datasetId), 'p1') : createAuction(shuffleDeck(datasetId), 'p1') };
  mySeat = 'p1'; connectionChanged(false);
}, 'demo-button'));
$('start-game').addEventListener('click', () => void runAction(() => command('start', gamePayload()), 'start-game'));
$('cooperative-panel').addEventListener('click', event => {
  const button = event.target.closest('[data-frequency-card], [data-double-slot], [data-frequency-next]');
  if (!button || button.disabled || busy || !room || room.status !== 'playing' || !isCooperativeMode(room.mode)) return;
  if (button.hasAttribute('data-frequency-next')) {
    void runAction(() => command('frequency-next'), button.id); return;
  }
  const snapshot = structuredClone(room), generation = lifecycle, originService = service;
  const count = cooperativeState.mine?.count || 0;
  const cardId = Number(button.dataset.frequencyCard), slot = Number(button.dataset.doubleSlot);
  const local = demo;
  void runAction(async () => {
    if (local) {
      if (snapshot.mode === 'frequency') {
        if (demoSecrets[mySeat]?.locked || snapshot.game.stage !== 'choosing') throw new RoomError('Seçimin zaten kilitlendi.');
        demoSecrets[mySeat] = { locked: true, cardId };
      } else demoSecrets[mySeat] = placePrivateRank(snapshot.game.deck, demoSecrets[mySeat] || createPrivateRank(), slot);
      resolveDemoCooperative(); render();
    } else {
      if (!onlineSeat('p1') || !onlineSeat('p2')) throw new RoomError(t('runtime.copy.iki_oyuncu_da_bagli_oldugunda_devam_edebilirsiniz'));
      if (snapshot.mode === 'frequency') await originService.chooseFrequency(snapshot, cardId);
      else await originService.rankCooperative(snapshot, slot, count);
    }
  }, button.id).then(() => {
    if (generation !== lifecycle || originService !== service || !room || room.status !== 'playing') return;
    $('cooperative-panel').querySelector('[data-double-slot]:not(:disabled), [data-frequency-next]:not(:disabled)')?.focus({ preventScroll: true });
  });
});
$('bid-form').addEventListener('submit', event => {
  event.preventDefault();
  // Capture before rendering busy state, which may reset the suggested minimum.
  const amount = Number($('bid-input').value);
  void runAction(() => command('bid', { amount }), 'bid-button');
});
document.querySelectorAll('[data-bid-increment]').forEach(button => button.addEventListener('click', () => {
  if (button.disabled || room?.status !== 'playing') return;
  const amount = room.game.highestBid + Number(button.dataset.bidIncrement);
  void runAction(() => command('bid', { amount }), 'bid-button');
}));
$('pass-button').addEventListener('click', () => void runAction(() => command('pass'), 'pass-button'));
$('blind-choices').addEventListener('click', event => {
  const button = event.target.closest('[data-rank-slot]');
  if (!button || button.disabled || room?.mode !== 'blind-ranking' || room.status !== 'playing') return;
  const slot = Number(button.dataset.rankSlot);
  pendingRankFocus = document.activeElement === button ? { code: room.code, round: room.round, deckIndex: room.game.deckIndex } : null;
  void runAction(() => command('rank', { slot }), button.id);
});
document.querySelectorAll('[data-bracket-choice]').forEach(button => button.addEventListener('click', () => {
  if (button.disabled || room?.mode !== 'bracket' || room.status !== 'playing') return;
  const cardId = Number(button.dataset.cardId);
  pendingBracketFocus = document.activeElement === button ? { code: room.code, round: room.round, matchIndex: room.game.matchIndex } : null;
  void runAction(() => command('choose', { cardId }), button.id);
}));
$('team-draft-candidates').addEventListener('click', event => {
  const button = event.target.closest('[data-draft-card]');
  if (!button || button.disabled || room?.mode !== 'team-draft' || busy) return;
  selectedDraftId = Number(button.dataset.draftCard); render();
  document.querySelector('[data-draft-role]:not(:disabled)')?.focus({ preventScroll: true });
});
document.querySelectorAll('[data-draft-role]').forEach(button => button.addEventListener('click', () => {
  if (button.disabled || selectedDraftId === null || room?.mode !== 'team-draft') return;
  const cardId = selectedDraftId, role = button.dataset.draftRole;
  const originGeneration = lifecycle;
  void runAction(() => command('assign', { cardId, role }), button.id).then(() => {
    if (originGeneration !== lifecycle || room?.mode !== 'team-draft' || room.status !== 'playing') return;
    const mine = normalizeTeamDraft(room.game).players[mySeat];
    if (mine.done) $('team-draft-waiting').querySelector('h2').focus({ preventScroll: true });
    else $('team-draft-candidates').querySelector('button:not(:disabled)')?.focus({ preventScroll: true });
  });
}));
$('rematch-button').addEventListener('click', () => void runAction(() => command('rematch', gamePayload()), 'rematch-button'));
nextGameView = createNextGameView({
  context: () => ({ room, datasets, mySeat, connected: demo || !!service?.connected, busy, demo, nameFor, onlineSeat }),
  onPropose: config => void runAction(() => command('propose-next', config), 'propose-next'),
  onReady: (approval, config) => void runAction(() => command('ready-next', { ...approval, ...gamePayload(config) }), 'next-ready'),
});

function clearInviteAddress() {
  pendingInvite = null; inviteRequested = false;
  const url = new URL(window.location.href);
  if (url.searchParams.has('oda')) {
    url.searchParams.delete('oda');
    history.replaceState(null, '', url.href);
  }
}

function openInvite() {
  if (!room || demo) return;
  const url = invitationUrl(window.location.href, room.code);
  $('invite-code').textContent = room.code;
  $('invite-link').value = url;
  $('invite-status').textContent = '';
  $('invite-share').hidden = typeof navigator.share !== 'function';
  renderInviteQR($('invite-qr'), url, { label: t('room.extra.invite_qr') });
  $('invite-dialog').showModal();
  $('invite-close').focus({ preventScroll: true });
}
for (const id of ['invite-button', 'result-invite']) $(id).addEventListener('click', openInvite);
$('invite-close').addEventListener('click', () => $('invite-dialog').close());
$('invite-copy').addEventListener('click', async () => {
  const url = $('invite-link').value, generation = lifecycle;
  try {
    await navigator.clipboard.writeText(url);
    if (generation === lifecycle && $('invite-dialog').open) $('invite-status').textContent = t('room.extra.invite_copied');
  } catch {
    if (generation !== lifecycle || !$('invite-dialog').open) return;
    $('invite-link').focus(); $('invite-link').select();
    $('invite-status').textContent = t('room.extra.invite_copy_fallback');
  }
});
$('invite-share').addEventListener('click', async () => {
  if (typeof navigator.share !== 'function') return;
  try { await navigator.share({ title: t('site.name'), text: t('room.extra.invite_title'), url: $('invite-link').value }); }
  catch (error) { if (error.name !== 'AbortError') $('invite-status').textContent = t('room.extra.invite_copy_fallback'); }
});
for (const id of ['leave-room', 'result-leave']) $(id).addEventListener('click', () => void leaveRoom());
$('copy-code').addEventListener('click', async () => {
  if (!room || demo) return;
  const code = room.code, originGeneration = lifecycle;
  try { await navigator.clipboard.writeText(code); if (originGeneration === lifecycle) toast(t('runtime.copy.oda_kodu_kopyalandi_arkadasina_gonder')); }
  catch { if (originGeneration === lifecycle) toast(t('runtime.room.copy_fallback', { code })); }
});
$('room-code').addEventListener('input', event => {
  event.target.value = event.target.value.replace(/\D/g, '').slice(0, 6);
  event.target.setAttribute('aria-invalid', 'false'); event.target.classList.remove('field-invalid');
  $('join-caption').textContent = event.target.value.length === 6 ? service?.connected ? t('runtime.copy.kod_hazir_katil_butonuyla_oyuna_gir') : t('runtime.copy.kod_hazir_oda_baglantisi_acildiginda_katilabilirsin') : t('runtime.copy.kodu_gir_rekabete_kaldigin_yerden_devam_et');
});
$('nickname').addEventListener('input', event => {
  event.target.setAttribute('aria-invalid', 'false'); event.target.classList.remove('field-invalid');
  $('nickname-caption').textContent = t('runtime.copy.arkadasin_seni_bu_isimle_gorecek_adini_bu_cihazda_ha');
  rememberName();
});
$('nickname').addEventListener('keydown', event => {
  if (event.key === 'Enter') { event.preventDefault(); $('room-code').focus(); }
});
$('dataset-select').addEventListener('change', event => { selectedCategory = event.target.value; renderDatasetPreview(); });
$('collection-search').addEventListener('input', renderCollection);
document.querySelectorAll('input[name="mode"]').forEach(input => input.addEventListener('change', renderModePreview));
$('bracket-size-select').addEventListener('change', renderModePreview);
$('sound-toggle').addEventListener('click', () => {
  soundEnabled = !soundEnabled; $('sound-toggle').setAttribute('aria-pressed', String(soundEnabled));
  $('sound-toggle').textContent = soundEnabled ? t('runtime.copy.ses_acik') : t('runtime.copy.ses_kapali'); beep('win');
});
document.querySelectorAll('[data-reaction]').forEach(button => button.addEventListener('click', () => {
  const now = Date.now(); if (!room || now - lastReactAt < 1500) return; lastReactAt = now;
  const type = button.dataset.reaction;
  const originGeneration = lifecycle, originService = service, code = room.code, sender = nameFor(mySeat), local = demo;
  void runAction(async () => {
    if (!local) await originService.react(code, type);
    if (originGeneration === lifecycle && originService === service) showReaction(type, sender);
  });
}));

async function boot() {
  render();
  await loadTexts();
  applyTexts();
  try { $('nickname').value = (localStorage.getItem(NAME_KEY) || '').slice(0, 20); } catch {}
  if (pendingInvite) {
    $('room-code').value = pendingInvite;
    $('join-caption').textContent = t('room.extra.invite_join_hint');
  } else if (inviteRequested) toast(t('room.extra.invite_invalid'));
  layoutLobby();
  window.matchMedia('(max-width: 760px)').addEventListener('change', layoutLobby);
  document.addEventListener('focusin', () => requestAnimationFrame(keepControlsVisible));
  window.visualViewport?.addEventListener('resize', () => requestAnimationFrame(keepControlsVisible));
  if (!isFirebaseConfigured()) {
    const entry = document.querySelector('.demo-entry');
    entry.classList.add('is-featured');
    entry.querySelector('.demo-label').textContent = t('runtime.copy.hazir_misin');
    $('create-form').before(entry);
  }
  renderModePreview();
  try {
    const response = await fetch('./veri.json');
    if (!response.ok) throw new Error(t('runtime.copy.veri_seti_yuklenemedi_sayfayi_bir_web_sunucusu_uzeri'));
    datasets = await response.json();
    for (const [key, cards] of Object.entries(datasets)) {
      if (!Array.isArray(cards) || cards.length < 10 || cards.length > 200 || new Set(cards.map(card => card.id)).size !== cards.length || cards.some(card => !Number.isSafeInteger(card.id) || card.id < 1 || card.id > 1000000 || typeof card.isim !== 'string' || typeof card.etiket !== 'string' || !/^assets\/images\/[a-zA-Z0-9_./-]+$/.test(card.gorsel) || card.gorsel.includes('..'))) {
        throw new Error(t('runtime.error.invalid_dataset', { dataset: key }));
      }
    }
    if (Object.keys(DATASET_NAMES).some(key => !datasets[key])) throw new Error(t('runtime.copy.efsaneler_super_lig_tatli_ana_yemek_dizi_ve_film_ver'));
    // A category can be selected while veri.json is still loading. Rebuild
    // its options once with the real counts, retaining the selected dataset.
    renderedCategory = null;
    renderDatasetPreview(); render();
    if (!isFirebaseConfigured()) {
      $('setup-notice').hidden = false;
      connectionChanged(false); return;
    }
    $('setup-notice').hidden = true;
    if (signedOut) { storage.clear(); connectionChanged(false); return; }
    await openSession();
    if (!service || demo || signedOut) return;
    render();
    const bootService = service, bootEpoch = actionEpoch;
    const saved = storage.get();
    if (!demo && saved && saved.uid === service.uid && /^\d{6}$/.test(saved.code) && (!inviteRequested || saved.code === pendingInvite)) {
      $('room-code').value = saved.code;
      // Wait for RTDB's first connected snapshot before attempting recovery.
      const deadline = Date.now() + 10000;
      while (bootService === service && bootEpoch === actionEpoch && !demo && !bootService.connected && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 150));
      if (bootService === service && bootEpoch === actionEpoch && bootService.connected && !demo) await runAction(async () => {
        const epoch = actionEpoch;
        await attach(await bootService.joinRoom(saved.code, 'Oyuncu'), bootService, epoch);
        if (room && !demo) toast(t('runtime.copy.tekrar_hos_geldin_kaldigin_yerden_devam'));
      });
    } else if (saved && !demo && !inviteRequested) storage.clear();
    if (pendingInvite && !room) ($('nickname').value ? $('join-room') : $('nickname')).focus();
  } catch (error) { $('setup-notice').hidden = false; $('setup-notice').textContent = errorMessage(error); toast(errorMessage(error)); }
}
void boot();
