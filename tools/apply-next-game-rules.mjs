import { readFile, writeFile } from 'node:fs/promises';

const file = new URL('../firebase.rules.json', import.meta.url);
const base = process.argv.find(value => value.startsWith('--base='))?.slice(7);
const document = JSON.parse(await readFile(base || file, 'utf8'));
const datasetCards = JSON.parse(await readFile(new URL('../veri.json', import.meta.url), 'utf8'));
const room = document.rules.rooms.$code;

// Rules cannot compare whole maps using val(). Preserve the finished game's
// scalar fields explicitly and reuse its existing immutable deck/roster/history
// validators while players choose and approve their next match.
const equal = path => `newData.child('${path}').val()===data.child('${path}').val()`;
const existsEqual = path => `newData.hasChild('${path}')===data.hasChild('${path}')`;
const join = values => values.map(value => `(${value})`).join('&&');
const keys = node => Object.keys(node).filter(key => !key.startsWith('.') && !key.startsWith('$'));
const range = (length, prefix = '', start = 0) => Array.from({ length }, (_, i) => `${prefix}${i + start}`);

if (!room.nextGame) {
  const originalDataset = room.datasetId['.validate'].split(' && (!data.exists()')[0];
  const originalMode = room.mode['.validate'].split(' && (!data.exists()')[0];
  const datasets = originalDataset.match(/newData.val\(\) === '[^']+'/g).map(value => value.match(/'([^']+)'/)[1]);
  // The legacy mixed collection remains readable for existing matches, but the
  // next-match chooser uses the same separate collections as today's lobby.
  const selectableDatasets = datasets.filter(value => value !== 'oyun-evreni');
  const modes = ['auction', 'blind-ranking', 'bracket', 'team-draft', 'frequency', 'double-ranking'];
  const choice = (expression, values) => values.map(value => `${expression}==='${value}'`).join('||');
  const n = path => `newData.child('${path}')`;
  const d = path => `data.child('${path}')`;
  const action = `${n('lastAction/kind')}.val()`;
  const seat = `${n('lastAction/seat')}.val()`;
  const pending = "newData.parent().hasChild('nextGame')";
  const locked = "root.child('cleanupIndex').child($code).child('state').val()!=='deleting'";
  const actor = `auth!==null&&((${d('players/p1/uid')}.val()===auth.uid&&${seat}==='p1')||(${d('players/p2/uid')}.val()===auth.uid&&${seat}==='p2'))`;
  const stablePlayers = join(['players/p1/uid', 'players/p1/name', 'players/p2/uid', 'players/p2/name'].map(equal));
  const baseWrite = `${locked}&&newData.exists()&&${actor}&&${stablePlayers}&&${d('status')}.val()==='finished'&&${n('revision')}.val()===${d('revision')}.val()+1`;
  const stableConfig = join(['datasetId', 'mode', 'bracketSize', 'round', 'starterSeat'].map(equal));
  const proposal = `${action}==='propose-next'&&${n('status')}.val()==='finished'&&${stableConfig}&&newData.hasChild('nextGame')&&${n('nextGame/id')}.val()===${n('revision')}.val()&&${n('nextGame/proposedBySeat')}.val()===${seat}&&${n('nextGame/ready/p1')}.val()===false&&${n('nextGame/ready/p2')}.val()===false`;
  const stableProposal = join(['id', 'datasetId', 'mode', 'bracketSize', 'proposedBySeat'].map(path => equal(`nextGame/${path}`)));
  const selfReady = `${n('nextGame/ready')}.child(${seat}).val()!==${d('nextGame/ready')}.child(${seat}).val()`;
  const otherReady = `(${seat}==='p1'?${n('nextGame/ready/p2')}.val()===${d('nextGame/ready/p2')}.val():${n('nextGame/ready/p1')}.val()===${d('nextGame/ready/p1')}.val())`;
  const solo = `!${d('players/p2')}.exists()&&(${d('nextGame/mode')}.val()==='blind-ranking'||${d('nextGame/mode')}.val()==='bracket')`;
  const allReady = `(${n('nextGame/ready/p1')}.val()===true&&(${d('players/p2')}.exists()?${n('nextGame/ready/p2')}.val()===true:(${n('nextGame/mode')}.val()==='blind-ranking'||${n('nextGame/mode')}.val()==='bracket')))`;
  const ready = `${action}==='ready-next'&&${d('nextGame')}.exists()&&newData.hasChild('nextGame')&&${n('status')}.val()==='finished'&&${stableConfig}&&${stableProposal}&&${selfReady}&&${otherReady}&&!${allReady}`;
  const targetReady = `(${seat}==='p1'?(${d('nextGame/ready/p1')}.val()===false&&(${d('players/p2')}.exists()?${d('nextGame/ready/p2')}.val()===true:(${solo}))):(${d('players/p2')}.exists()&&${d('nextGame/ready/p2')}.val()===false&&${d('nextGame/ready/p1')}.val()===true))`;
  const next = `${action}==='next-game'&&${d('nextGame')}.exists()&&!newData.hasChild('nextGame')&&${targetReady}&&${n('status')}.val()==='playing'&&${n('round')}.val()===${d('round')}.val()+1&&${n('starterSeat')}.val()===(${d('players/p2')}.exists()?(${d('starterSeat')}.val()==='p1'?'p2':'p1'):'p1')&&${n('datasetId')}.val()===${d('nextGame/datasetId')}.val()&&${n('mode')}.val()===${d('nextGame/mode')}.val()&&${n('bracketSize')}.val()===${d('nextGame/bracketSize')}.val()`;

  // A pending proposal requires approval; the former rematch shortcut cannot
  // discard it, and ordinary commands cannot manufacture proposal metadata.
  room['.write'] = `((${room['.write']})&&(!newData.exists()||(!data.hasChild('nextGame')&&!newData.hasChild('nextGame'))))||(${baseWrite}&&((${proposal})||(${ready})||(${next})))`;
  room['.validate'] = room['.validate'].replace("(!data.exists() || newData.hasChild('bracketSize') === data.hasChild('bracketSize'))", "(!data.exists() || newData.child('lastAction/kind').val() === 'next-game' || newData.hasChild('bracketSize') === data.hasChild('bracketSize'))");
  room.datasetId['.validate'] = `(${originalDataset})&&(!data.exists()||newData.val()===data.val()||newData.parent().child('lastAction/kind').val()==='next-game')`;
  room.mode['.validate'] = `(${originalMode})&&(!data.exists()||newData.val()===data.val()||newData.parent().child('lastAction/kind').val()==='next-game')`;
  room.bracketSize['.validate'] = "newData.parent().child('mode').val()==='bracket'&&(newData.val()===16||newData.val()===32)&&(!data.parent().exists()||newData.val()===data.val()||newData.parent().child('lastAction/kind').val()==='next-game')";
  room.lastAction.kind['.validate'] += " || newData.val() === 'propose-next' || newData.val() === 'ready-next' || newData.val() === 'next-game'";
  room.nextGame = {
    '.validate': "newData.parent().child('status').val()==='finished'&&newData.hasChildren(['id','datasetId','mode','proposedBySeat','ready'])&&(newData.child('mode').val()==='bracket'?newData.hasChild('bracketSize'):!newData.hasChild('bracketSize'))",
    id: { '.validate': 'newData.isNumber()&&newData.val()%1===0&&newData.val()>0&&newData.val()<=newData.parent().parent().child(\'revision\').val()' },
    datasetId: { '.validate': choice('newData.val()', selectableDatasets) },
    mode: { '.validate': choice('newData.val()', modes) },
    bracketSize: { '.validate': "newData.parent().child('mode').val()==='bracket'&&(newData.val()===16||(newData.val()===32&&" + Object.entries(datasetCards).filter(([, cards]) => cards.length < 32).map(([id]) => `newData.parent().child('datasetId').val()!=='${id}'`).join('&&') + '))' },
    proposedBySeat: { '.validate': "newData.val()==='p1'||(newData.val()==='p2'&&newData.parent().parent().child('players/p2').exists())" },
    ready: { '.validate': "newData.hasChildren(['p1','p2'])&&(!newData.parent().parent().child('players/p2').exists()?newData.child('p2').val()===false:true)", p1: { '.validate': 'newData.isBoolean()' }, p2: { '.validate': 'newData.isBoolean()' }, '$other': { '.validate': false } },
    '$other': { '.validate': false },
  };

  function extendInitial(node) {
    for (const [key, value] of Object.entries(node)) {
      if (key === '.validate' && typeof value === 'string') {
        node[key] = value.replace(/(newData(?:\.parent\(\))*\.child\('lastAction\/kind'\)\.val\(\))\s*===\s*'rematch'/g, "($1 === 'rematch' || $1 === 'next-game')");
      } else if (value && typeof value === 'object') extendInitial(value);
    }
  }
  extendInitial(room.game);
  // During approval, each team's previously completed draft behaves like an
  // untouched opponent draft, whose existing validator freezes all 11 rounds.
  const teamPlayer = room.game.players.$seat;
  teamPlayer['.validate'] = teamPlayer['.validate'].replace("$seat === newData.parent().parent().parent().child('lastAction/seat').val() ?", "$seat === newData.parent().parent().parent().child('lastAction/seat').val() && !newData.parent().parent().parent().hasChild('nextGame') ?");

  const scalarTop = keys(room.game).filter(key => !keys(room.game[key]).length && !Object.keys(room.game[key]).some(value => value.startsWith('$')));
  const objectTop = keys(room.game).filter(key => !scalarTop.includes(key));
  const freeze = [
    ...scalarTop.map(equal), ...objectTop.map(existsEqual),
    ...['budgets/p1', 'budgets/p2'].map(equal),
    ...['rosters/p1', 'rosters/p2'].map(existsEqual),
    ...['p1', 'p2'].flatMap(seatName => range(5).map(index => existsEqual(`rosters/${seatName}/${index}`))),
    ...range(10, 's', 1).map(slot => equal(`slots/${slot}`)),
    ...range(31, 'm', 1).map(match => equal(`choices/${match}`)),
    ...['left', 'right'].map(side => equal(`currentPair/${side}`)),
    ...['lastAward', 'lastPlacement', 'lastChoice', 'lastAssignment'].flatMap(key => keys(room.game[key]).map(field => equal(`${key}/${field}`))),
    ...range(10, 'r', 1).map(key => existsEqual(`results/${key}`)),
    ...range(8).flatMap(index => ['id', 'seat', 'price', 'sequence'].map(field => equal(`completionAwards/${index}/${field}`))),
    ...range(8).map(index => equal(`result/differences/${index}/id`)),
  ];
  room.game['.validate'] = `${pending}?(${join(freeze)}):(${room.game['.validate']})`;
}

// Keep string/regex literals byte-for-byte, and remove only whitespace between
// tokens. This creates space for the new approval rules without weakening any
// of the existing game, privacy, presence or room-cleanup checks.
function compactExpression(source) {
  let quote = null, escaped = false, output = '';
  for (let i = 0; i < source.length; i++) {
    const character = source[i];
    if (quote) {
      output += character;
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = null;
    } else if (character === "'" || character === '"' || (character === '/' && output.endsWith('.matches('))) {
      quote = character; output += character;
    } else if (/\s/.test(character)) {
      if (/[\w$]/.test(source[i - 1] || '') && /[\w$]/.test(source[i + 1] || '')) output += ' ';
    } else output += character;
  }
  return output;
}
function compactRules(node) {
  for (const [key, value] of Object.entries(node)) {
    if (key.startsWith('.') && typeof value === 'string') node[key] = compactExpression(value);
    else if (value && typeof value === 'object') compactRules(value);
  }
}
compactRules(document.rules);
const source = JSON.stringify(document) + '\n';
if (Buffer.byteLength(source) > 256 * 1024) throw new Error(`Firebase kuralları 256 KiB sınırını aşıyor (${Buffer.byteLength(source)} bayt).`);
await writeFile(file, source);
console.log(`Yeni oyun onay kuralları hazır (${Buffer.byteLength(source)} bayt).`);
