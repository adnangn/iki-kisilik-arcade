import { STATIC_TEXT_CATALOG } from './text-catalog-static.js';
import { RUNTIME_TEXT_CATALOG } from './text-catalog-runtime.js';
import { EXPANSION_TEXT_CATALOG } from './text-catalog-expansion.js';
import { COOPERATIVE_TEXT_CATALOG } from './text-catalog-cooperative.js';

export const TEXT_CATALOG = Object.freeze({
  ...STATIC_TEXT_CATALOG,
  ...RUNTIME_TEXT_CATALOG,
  ...EXPANSION_TEXT_CATALOG,
  ...COOPERATIVE_TEXT_CATALOG,
  'action.edit-texts': { group: 'Marka ve sayfa', label: 'Metin düzenleyici bağlantısı', value: 'Metin Atölyesi' }
});
