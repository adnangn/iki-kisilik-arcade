import { transformRuleExpression } from './compact-rule-expressions.mjs';

/** RTDB path variables are strings. Decode a bounded decimal key without
 * coercion, which is unavailable in database rules. Callers retain key regexes. */
export function decimalKeyExpression(key, maximum = 199) {
  const hundreds = maximum >= 100 ? `(${key}.length===3?100:0)+` : '';
  const tens = `(${Array.from({ length: 9 }, (_, i) => `${key}.matches(/^[0-9]?${i + 1}[0-9]$/)?${(i + 1) * 10}:`).join('')}0)`;
  const units = `(${Array.from({ length: 9 }, (_, i) => `${key}.endsWith('${i + 1}')?${i + 1}:`).join('')}0)`;
  return `(${hundreds}${tens}+${units})`;
}

export function compactArrayGuards(document, maximum) {
  const deck = document.rules.rooms.$code.game.deck;
  // Retained leaves already freeze their numeric values. The final retained
  // index also checks its successor in the old deck: a truncated suffix would
  // necessarily leave an old successor, and is therefore rejected. Contiguity
  // is enforced by the predecessor guard installed by the rule builder.
  let removed = 0;
  deck['.validate'] = transformRuleExpression(deck['.validate'], node => {
    if (node.kind === 'atom' && (/^newData\.hasChild\('(\d+)'\)===data\.hasChild\('\1'\)$/.test(node.value)
      || /^newData\.child\('(\d+)'\)\.val\(\)===data\.child\('\1'\)\.val\(\)$/.test(node.value))) {
      removed++; return { kind: 'atom', value: 'true' };
    }
    return node;
  });
  if (!removed) throw new Error('Legacy deck shape guards were not found.');
  const ordinal = decimalKeyExpression('$index', maximum);
  const previous = Array.from({ length: maximum - 1 }, (_, i) => `$index==='${i + 1}'?'${i}':`).join('') + `'${maximum - 2}'`;
  if (!deck.$index['.validate'].includes(previous)) throw new Error('Legacy predecessor guard changed.');
  deck.$index['.validate'] = deck.$index['.validate'].replace(previous, `(${ordinal}-1)+''`);
  const initial = "newData.parent().parent().parent().child('lastAction/kind').val().matches(/^(start|rematch|next-game)$/)";
  const successor = `(${ordinal}+1)+''`;
  deck.$index['.validate'] += `&&(${initial}||newData.val()===data.val()&&(newData.parent().hasChild(${successor})||!data.parent().hasChild(${successor})))`;
  // The party action array has the same bounded decimal predecessor lookup.
  const actions = document.rules.rooms.$code.partyGame.actions.$index;
  const priorAction = Array.from({ length: 119 }, (_, i) => `$index==='${i + 1}'?'${i}':`).join('') + "'118'";
  if (!actions['.validate'].includes(priorAction)) throw new Error('Party action predecessor guard changed.');
  actions['.validate'] = actions['.validate'].replace(priorAction, `(${decimalKeyExpression('$index', 119)}-1)+''`);
}
