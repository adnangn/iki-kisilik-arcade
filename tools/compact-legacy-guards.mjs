import { transformRuleExpression, compactRuleTree } from './compact-rule-expressions.mjs';

/**
 * Keep exact collection shapes at their existing parents, but check uniqueness
 * where Firebase supplies the candidate item through $index. Each pair is still
 * tested: one populated numeric leaf must differ from every other populated
 * item. Absent siblings have null values, so they cannot equal a numeric ID.
 * This replaces the quadratic expansions for the 8/20/16/32-card legacy games
 * with a linear validator shared by every deck item. Auction and blind ranking
 * historically require only their first ten cards to differ; their optional
 * tail keeps that exact behavior rather than imposing a new restriction.
 */
export function compactLegacyGuards(document) {
  const game = document.rules.rooms.$code.game;
  if (game.triplets?.$index) {
    let movedTriplet = 0;
    game.triplets['.validate'] = transformRuleExpression(game.triplets['.validate'], node => {
      if (node.kind === 'atom' && /^newData\.child\('(\d+)\/(etiket|cards\/[0-2])'\)\.val\(\)===data\.child\('\1\/\2'\)\.val\(\)$/.test(node.value)) {
        movedTriplet++;
        return { kind: 'atom', value: 'true' };
      }
      return node;
    });
    if (movedTriplet) {
      const setup = room => ['start', 'rematch', 'next-game'].map(kind => `${room}.child('lastAction/kind').val()==='${kind}'`).join('||');
      const labelRoom = 'newData.parent().parent().parent().parent()';
      const cardRoom = `${labelRoom}.parent()`;
      // Required round, label, cards and card-index shapes already prevent
      // deletion. The initial-action exception matches the previous parent.
      game.triplets.$index.etiket['.validate'] += `&&((${setup(labelRoom)})||newData.val()===data.val())`;
      game.triplets.$index.cards.$index['.validate'] += `&&((${setup(cardRoom)})||newData.val()===data.val())`;
    }
  }
  // Keep the private answer comparison authoritative for the match counter.
  // In the very same AND group, its validated one-step increase determines the
  // scoring/streak branch; the validated streak then determines the bonus and
  // best streak. All values therefore retain their original private source.
  game['.validate'] = transformRuleExpression(game['.validate'], node => {
    if (node.kind !== 'and') return node;
    const privateFormula = (item, field) => item.kind === 'atom'
      && item.value.startsWith(`newData.child('${field}').val()===`)
      && item.value.includes("root.child('privateGames')") && item.value.includes(".child('frequency')");
    if (!node.items.some(item => privateFormula(item, 'matches'))) return node;
    if (!['score', 'streak', 'bestStreak'].every(field => node.items.some(item => privateFormula(item, field)))) return node;
    const matched = "newData.child('matches').val()===data.child('matches').val()+1";
    const streak = "newData.child('streak').val()";
    const replacements = {
      score: `newData.child('score').val()===data.child('score').val()+(${matched}?100:0)+(${matched}&&${streak}%5===0?250:0)`,
      streak: `${streak}===(${matched}?data.child('streak').val()+1:0)`,
      bestStreak: `newData.child('bestStreak').val()===(${streak}>data.child('bestStreak').val()?${streak}:data.child('bestStreak').val())`,
    };
    node.items = node.items.map(item => {
      const field = Object.keys(replacements).find(field => privateFormula(item, field));
      return field ? { kind: 'atom', value: replacements[field] } : item;
    });
    return node;
  });
  // A breadth-first single-elimination bracket has a closed-form source pair:
  // initial matches consume deck[2*i..2*i+1], all later matches consume the
  // earlier winners m(2*i-size+1)..m(2*i-size+2). Replace only an entire verified
  // literal expansion, leaving final/winner and historical presence guards at
  // their original parents. Fractional/out-of-range indices remain rejected.
  game['.validate'] = transformRuleExpression(game['.validate'], (node, render) => {
    if (node.kind !== 'or' || ![15, 31].includes(node.items.length)) return node;
    const size = node.items.length + 1;
    const pairPattern = /^newData\.child\('matchIndex'\)\.val\(\)===([0-9]+)&&newData\.child\('currentPair\/left'\)\.val\(\)===newData\.child\('([^']+)'\)\.val\(\)&&newData\.child\('currentPair\/right'\)\.val\(\)===newData\.child\('([^']+)'\)\.val\(\)$/;
    const indices = new Set();
    for (const branch of node.items) {
      const pair = render(branch).match(pairPattern);
      if (!pair) return node;
      const index = Number(pair[1]), first = index < size / 2 ? `deck/${index * 2}` : `choices/m${index * 2 - size + 1}`;
      const second = index < size / 2 ? `deck/${index * 2 + 1}` : `choices/m${index * 2 - size + 2}`;
      if (index < 0 || index >= size - 1 || indices.has(index) || pair[2] !== first || pair[3] !== second) return node;
      indices.add(index);
    }
    const index = "newData.child('matchIndex').val()";
    const source = (side, offset) => `newData.child('currentPair/${side}').val()===newData.child('deck').child((${index}*2+${offset})+'').val()`;
    const winner = (side, offset) => `newData.child('currentPair/${side}').val()===newData.child('choices').child('m'+(${index}*2-${size}+${offset})).val()`;
    return { kind: 'atom', value: `(newData.child('matchIndex').isNumber()&&${index}>=0&&${index}<${size - 1}&&${index}%1===0&&(${index}<${size / 2}?${source('left', 0)}&&${source('right', 1)}:${winner('left', 1)}&&${winner('right', 2)}))` };
  });
  let movedChoice = 0, movedSlot = 0;
  game['.validate'] = transformRuleExpression(game['.validate'], (node, render) => {
    if (node.kind === 'ternary') {
      const test = render(node.test);
      if (/^data\.child\('matchIndex'\)\.val\(\)===\d+$/.test(test)
        && /^!data\.hasChild\('choices\/m\d+'\)&&newData\.child\('choices\/m\d+'\)\.val\(\)===newData\.child\('lastChoice\/cardId'\)\.val\(\)$/.test(render(node.yes))
        && /^newData\.child\('choices\/m\d+'\)\.val\(\)===data\.child\('choices\/m\d+'\)\.val\(\)$/.test(render(node.no))) {
        movedChoice++;
        return { kind: 'atom', value: 'true' };
      }
      if (/^newData\.child\('lastPlacement\/slot'\)\.val\(\)===\d+$/.test(test)
        && /^!data\.hasChild\('slots\/s\d+'\)&&newData\.child\('slots\/s\d+'\)\.val\(\)===data\.child\('currentCardId'\)\.val\(\)$/.test(render(node.yes))
        && /^newData\.child\('slots\/s\d+'\)\.val\(\)===data\.child\('slots\/s\d+'\)\.val\(\)$/.test(render(node.no))) {
        movedSlot++;
        return { kind: 'atom', value: 'true' };
      }
    }
    return node;
  });
  // The parent keeps every presence/count guard and all proposal-freeze scalar
  // comparisons. Deletions therefore remain protected even though Firebase
  // intentionally does not run a deleted leaf's .validate rule.
  const leafRoom = 'newData.parent().parent().parent()';
  if (movedChoice) {
    game.choices.$match['.validate'] += `&&(${leafRoom}.child('lastAction/kind').val()==='choose'&&$match==='m'+(data.parent().parent().child('matchIndex').val()+1)?!data.exists()&&newData.val()===newData.parent().parent().child('lastChoice/cardId').val():newData.val()===data.val())`;
  }
  if (movedSlot) {
    game.slots.$slot['.validate'] += `&&(${leafRoom}.child('lastAction/kind').val()==='rank'&&$slot==='s'+newData.parent().parent().child('lastPlacement/slot').val()?!data.exists()&&newData.val()===data.parent().parent().child('currentCardId').val():newData.val()===data.val())`;
  }
  const exactPair = path => new RegExp(`^newData\\.child\\('${path}(\\d+)'\\)\\.val\\(\\)!==newData\\.child\\('${path}(\\d+)'\\)\\.val\\(\\)$`);
  let moved = 0;
  const removePair = pattern => node => {
    const pair = node.kind === 'atom' && node.value.match(pattern);
    if (pair) {
      if (Number(pair[1]) >= 32 || Number(pair[2]) >= 32) throw new RangeError('A new legacy deck range requires an explicit uniqueness guard.');
      moved++;
      return { kind: 'atom', value: 'true' };
    }
    return node;
  };
  game['.validate'] = transformRuleExpression(game['.validate'], removePair(exactPair('deck/')));
  game.deck['.validate'] = transformRuleExpression(game.deck['.validate'], removePair(exactPair('')));
  if (!moved) return compactRuleTree(document);
  const mode = "newData.parent().parent().parent().child('mode').val()";
  const uniqueMode = ['bracket', 'frequency', 'double-ranking'].map(value => `${mode}==='${value}'`).join('||');
  const firstTenMode = ['auction', 'blind-ranking'].map(value => `${mode}==='${value}'`).join('||');
  const distinct = length => Array.from({ length }, (_, index) => `($index==='${index}'||newData.val()!==newData.parent().child('${index}').val())`).join('&&');
  game.deck.$index['.validate'] += `&&((${uniqueMode})?(${distinct(32)}):(${firstTenMode})&&$index.matches(/^[0-9]$/)?(${distinct(10)}):true)`;
  return compactRuleTree(document);
}
