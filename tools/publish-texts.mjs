import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { TEXT_CATALOG } from '../js/text-catalog.js';
import { normalizeTexts } from '../js/texts.js';

const escape = value => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const voidTags = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);

/** Resolve the same bindings as applyTexts, before the first HTML paint. */
export function publishTexts(html, candidate) {
  const published = normalizeTexts(candidate);
  const value = key => {
    if (!Object.hasOwn(TEXT_CATALOG, key)) throw new Error(`Bilinmeyen yayın metni: ${key}`);
    return escape(published.texts[key] ?? TEXT_CATALOG[key].value);
  };
  const edits = [], stack = [], nodes = [];
  const token = /<!--[\s\S]*?-->|<![^>]*>|<\/?[A-Za-z](?:[^>"']|"[^"]*"|'[^']*')*>|[^<]+|</g;
  let match;
  while ((match = token.exec(html))) {
    const raw = match[0], start = match.index, end = token.lastIndex;
    const tag = raw.match(/^<(\/?)([\w:-]+)/);
    if (!tag) { stack.at(-1)?.children.push({ start, end, text: !raw.startsWith('<!--') }); continue; }
    const name = tag[2].toLowerCase();
    if (tag[1]) {
      const node = stack.pop();
      if (!node || node.name !== name) throw new Error(`Geçersiz HTML kapanışı: ${name}`);
      node.close = start; node.end = end; continue;
    }
    const attributes = Object.fromEntries([...raw.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map(item => [item[1], item[2] ?? item[3]]));
    const node = { name, attributes, start, openEnd: end, close: end, end, children: [] };
    nodes.push(node); stack.at(-1)?.children.push(node);
    if (voidTags.has(name) || /\/\s*>$/.test(raw)) continue;
    if (name === 'script' || name === 'style') {
      const closing = new RegExp(`</${name}\\s*>`, 'ig'); closing.lastIndex = end;
      const close = closing.exec(html);
      if (!close) throw new Error(`Kapanmamış HTML alanı: ${name}`);
      node.close = close.index; node.end = closing.lastIndex; token.lastIndex = closing.lastIndex;
      continue;
    }
    stack.push(node);
  }
  if (stack.length) throw new Error('Kapanmamış HTML öğesi.');
  for (const node of nodes) {
    const attrs = node.attributes;
    let opening = html.slice(node.start, node.openEnd);
    for (const attribute of ['placeholder', 'aria-label', 'title', 'content']) {
      if (!attrs[`data-text-${attribute}`]) continue;
      const replacement = `${attribute}="${value(attrs[`data-text-${attribute}`])}"`;
      const pattern = new RegExp(`(\\s)${attribute}=(?:"[^"]*"|'[^']*')`);
      opening = pattern.test(opening) ? opening.replace(pattern, (_, space) => space + replacement) : opening.replace(/(\/?>)$/, (_, tail) => ` ${replacement}${tail}`);
    }
    if (opening !== html.slice(node.start, node.openEnd)) edits.push({ start: node.start, end: node.openEnd, value: opening });
    if (attrs['data-text']) edits.push({ start: node.openEnd, end: node.close, value: value(attrs['data-text']) });
    if (attrs['data-text-slots']) for (const binding of attrs['data-text-slots'].split(/\s+/)) {
      const colon = binding.indexOf(':'), child = node.children[Number(binding.slice(0, colon))];
      if (!child?.text) throw new Error(`Metin yuvası bulunamadı: ${binding}`);
      const original = html.slice(child.start, child.end);
      edits.push({ start: child.start, end: child.end, value: original.match(/^\s*/)[0] + value(binding.slice(colon + 1)) + original.match(/\s*$/)[0] });
    }
  }
  const seed = JSON.stringify(published).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  const existing = nodes.find(node => node.name === 'script' && node.attributes.id === 'published-texts');
  if (existing) edits.push({ start: existing.openEnd, end: existing.close, value: seed });
  else {
    const head = nodes.find(node => node.name === 'head');
    if (!head) throw new Error('Yayın sayfasında head alanı gerekli.');
    edits.push({ start: head.close, end: head.close, value: `  <script id="published-texts" type="application/json">${seed}</script>\n  ` });
  }
  edits.sort((a, b) => b.start - a.start);
  let boundary = html.length;
  for (const edit of edits) {
    if (edit.end > boundary) throw new Error('İç içe metin bağlamaları yayınlanamaz.');
    html = html.slice(0, edit.start) + edit.value + html.slice(edit.end); boundary = edit.start;
  }
  return html;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const page = new URL('../index.html', import.meta.url);
  const [html, texts] = await Promise.all([readFile(page, 'utf8'), readFile(new URL('../metinler.json', import.meta.url), 'utf8')]);
  await writeFile(page, publishTexts(html, JSON.parse(texts)));
  console.log('Sayfa metinleri ilk görüntüleme için güncellendi.');
}
