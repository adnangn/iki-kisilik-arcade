import { STATIC_TEXT_CATALOG } from './text-catalog-static.js';
import { RUNTIME_TEXT_CATALOG } from './text-catalog-runtime.js';
import { EXPANSION_TEXT_CATALOG } from './text-catalog-expansion.js';
import { COOPERATIVE_TEXT_CATALOG } from './text-catalog-cooperative.js';
import { REVISION_TEXT_CATALOG } from './text-catalog-revisions.js';
import { ROOM_EXTRAS_TEXT_CATALOG } from './text-catalog-room-extras.js';
import { PARTY_TEXT_CATALOG } from './text-catalog-party.js';
import { TABLE_TEXT_CATALOG } from './text-catalog-table.js';
import { FEEDBACK_TEXT_CATALOG } from './text-catalog-feedback.js';
import { JURY_TEXT_CATALOG } from './text-catalog-jury.js';
import { LIFESTYLE_TEXT_CATALOG } from './text-catalog-lifestyle.js';
import { MYSTERY_TEXT_CATALOG } from './text-catalog-mystery.js';

export const TEXT_CATALOG = Object.freeze({
  ...STATIC_TEXT_CATALOG,
  ...RUNTIME_TEXT_CATALOG,
  ...EXPANSION_TEXT_CATALOG,
  ...COOPERATIVE_TEXT_CATALOG,
  ...REVISION_TEXT_CATALOG,
  ...ROOM_EXTRAS_TEXT_CATALOG,
  ...PARTY_TEXT_CATALOG,
  ...TABLE_TEXT_CATALOG,
  ...FEEDBACK_TEXT_CATALOG,
  ...JURY_TEXT_CATALOG,
  ...LIFESTYLE_TEXT_CATALOG,
  ...MYSTERY_TEXT_CATALOG,
  'action.edit-texts': { group: 'Marka ve sayfa', label: 'Metin düzenleyici bağlantısı', value: 'Metin Atölyesi' }
});
