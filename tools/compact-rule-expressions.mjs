// A semantics-preserving simplifier for the boolean portions of RTDB rules.
// Leaves method calls, comparisons, arithmetic, strings and regular expressions
// untouched. Factoring is Boolean algebra, never a relaxation of validation.
function scan(source, visit) {
  let depth = 0, quote = null, escaped = false;
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === "'" || c === '"' || (c === '/' && source.slice(0, i).endsWith('.matches('))) { quote = c; continue; }
    if (visit(i, c, depth) === false) return;
    if (c === '(' || c === '[') depth++;
    else if (c === ')' || c === ']') depth--;
  }
}
function unwrap(source) {
  while (source[0] === '(') {
    let close = -1;
    scan(source, (i, c, depth) => { if (c === ')' && depth === 1) { close = i; return false; } });
    if (close !== source.length - 1) break;
    source = source.slice(1, -1);
  }
  return source;
}
function splits(source, operator) {
  const indices = [];
  scan(source, (i, _c, depth) => { if (!depth && source.slice(i, i + operator.length) === operator) indices.push(i); });
  if (!indices.length) return null;
  let begin = 0;
  const values = indices.map(index => { const value = source.slice(begin, index); begin = index + operator.length; return value; });
  values.push(source.slice(begin));
  return values;
}
const precedence = node => node.kind === 'atom' ? 4 : node.kind === 'and' ? 3 : node.kind === 'or' ? 2 : 1;
function render(node, parent = 0) {
  let value = node.kind === 'atom' ? node.value : node.kind === 'ternary'
    ? `${render(node.test, 2)}?${render(node.yes)}:${render(node.no)}`
    : node.items.map(item => render(item, precedence(node))).join(node.kind === 'and' ? '&&' : '||');
  return precedence(node) < parent ? `(${value})` : value;
}
function combine(kind, items) {
  const flat = items.flatMap(item => item.kind === kind ? item.items : [item]);
  const annihilator = kind==='and'?'false':'true', identity=kind==='and'?'true':'false';
  if(flat.some(item=>item.kind==='atom'&&item.value===annihilator))return {kind:'atom',value:annihilator};
  const unique = [...new Map(flat.filter(item=>item.kind!=='atom'||item.value!==identity).map(item => [render(item), item])).values()];
  if(!unique.length)return {kind:'atom',value:identity};
  if (unique.length === 1) return unique[0];
  if (kind === 'or' || kind === 'and') {
    const opposite = kind === 'or' ? 'and' : 'or';
    const factors = unique.map(item => item.kind === opposite ? item.items : [item]);
    const shared = factors[0].filter(item => factors.every(branch => branch.some(candidate => render(candidate) === render(item))));
    if (shared.length) {
      const names = new Set(shared.map(item => render(item)));
      const reduced = factors.map(branch => branch.filter(item => !names.has(render(item))));
      if (reduced.some(branch => !branch.length)) return combine(opposite, shared);
      return combine(opposite, [...shared, { kind, items: reduced.map(branch => combine(opposite, branch)) }]);
    }
    // Branches for one game mode often share several long invariants without
    // sharing them with every other mode. Factor that subset as well.
    const frequencies = new Map();
    factors.forEach((branch, index) => branch.forEach(item => {
      const key = render(item), value = frequencies.get(key) || { item, indices: [] };
      value.indices.push(index); frequencies.set(key, value);
    }));
    const candidate = [...frequencies.values()].filter(value => value.indices.length > 1)
      .sort((a, b) => render(b.item).length * (b.indices.length - 1) - render(a.item).length * (a.indices.length - 1))[0];
    if (candidate) {
      const selected = new Set(candidate.indices);
      const reduced = candidate.indices.map(index => factors[index].filter(item => render(item) !== render(candidate.item)));
      const grouped = reduced.some(branch => !branch.length) ? candidate.item
        : combine(opposite, [candidate.item, combine(kind, reduced.map(branch => combine(opposite, branch)))]);
      const result = { kind, items: [...unique.filter((_, index) => !selected.has(index)), grouped] };
      if (render(result).length < render({ kind, items: unique }).length) return combine(kind, result.items);
    }
  }
  return { kind, items: unique };
}
function parse(source) {
  source = unwrap(source.trim());
  let question = -1, colon = -1, ternaries = 0;
  scan(source, (i, c, depth) => {
    if (depth) return;
    if (c === '?') { if (question < 0) question = i; ternaries++; }
    else if (c === ':' && question >= 0 && --ternaries === 0) { colon = i; return false; }
  });
  if (question >= 0 && colon >= 0) return { kind: 'ternary', test: parse(source.slice(0, question)), yes: parse(source.slice(question + 1, colon)), no: parse(source.slice(colon + 1)) };
  for (const [operator, kind] of [['||', 'or'], ['&&', 'and']]) {
    const branches = splits(source, operator);
    if (branches) return combine(kind, branches.map(parse));
  }
  return { kind: 'atom', value: source };
}
export function compactRuleExpression(source) {
  if (typeof source !== 'string') return source;
  return render(parse(source));
}
export function transformRuleExpression(source, visitor) {
  function walk(node) {
    if (node.items) node.items = node.items.map(walk);
    if (node.kind === 'ternary') { node.test = walk(node.test); node.yes = walk(node.yes); node.no = walk(node.no); if(render(node.yes)===render(node.no))return node.yes; }
    const result = visitor(node, render);
    if (result.kind === 'and' || result.kind === 'or') return combine(result.kind, result.items);
    return result;
  }
  return render(walk(parse(source)));
}
export function compactRuleTree(node) {
  for (const [key, value] of Object.entries(node)) {
    if (key.startsWith('.') && typeof value === 'string') node[key] = compactRuleExpression(value);
    else if (value && typeof value === 'object') compactRuleTree(value);
  }
  return node;
}
