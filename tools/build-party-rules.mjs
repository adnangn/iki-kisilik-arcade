import { readFile, writeFile } from 'node:fs/promises';
import { compactRuleTree, transformRuleExpression } from './compact-rule-expressions.mjs';
import { compactLegacyGuards } from './compact-legacy-guards.mjs';
import { installPartyGameGuards } from './party-game-guards.mjs';
import { installPartyShapeGuards } from './party-shape-guards.mjs';
import { installTableLifecycleRules } from './table-lifecycle-rules.mjs';
import { installAuctionJuryRules } from './auction-jury-rules.mjs';
import { compactLiteralAlternatives } from './compact-literal-alternatives.mjs';

const source = new URL('./firebase-rules-legacy.json', import.meta.url);
const output = process.argv.find(arg => arg.startsWith('--output='))?.slice(9) || new URL('../artifacts/party-rules.json', import.meta.url);
const document = JSON.parse(await readFile(source, 'utf8'));
const r = document.rules, room = r.rooms.$code;
const catalog=JSON.parse(await readFile(new URL('../veri.json',import.meta.url),'utf8'));
const legacyMaximum=Math.min(200,Math.max(32,...Object.values(catalog).map(cards=>cards.length)));
room.game['.validate'] = transformRuleExpression(room.game['.validate'], (node, render) => {
  const text=render(node);
  if(node.kind==='or'&&/^data\.hasChild\('rosters\/p[12]\/[0-4]'\)\|\|!newData\.hasChild\('rosters\/p[12]\/[0-4]'\)\|\|/.test(text))return {kind:'atom',value:'true'};
  // Their leaf validators already make existing IDs, prices and sources fixed.
  if(node.kind==='atom'&&/^newData\.child\('rosters\/p[12]\/[0-4]\/(id|price|source)'\)\.val\(\)===data\.child/.test(text))return {kind:'atom',value:'true'};
  return node;
});
const rosterIndex = "($index==='0'?0:$index==='1'?1:$index==='2'?2:$index==='3'?3:4)";
{
  const roster=room.game.rosters.p1,entry=roster.$index, old='data.parent().parent().parent()', next='newData.parent().parent().parent()';
  const count = key => `(${Array.from({length:5},(_,i)=>`(${old}.hasChild(${key==='$seat'?`'rosters/'+$seat+'/${i}'`:`'rosters/${key}/${i}'`})?1:0)`).join('+')})`;
  const after = key => `(${count(key)}+(${old}.child('bidderSeat').val()===${key==='$seat'?'$seat':`'${key}'`}?1:0))`;
  const freeOffset=`${rosterIndex}-${after('$seat')}+($seat==='p2'?5-${after('p1')}:0)`;
  roster['.validate'] = `($seat==='p1'||$seat==='p2')&&(${roster['.validate']})`;
  entry['.validate'] += `&&(data.exists()||(${old}.child('bidderSeat').val()===$seat&&${rosterIndex}===${count('$seat')}&&newData.child('id').val()===${old}.child('currentCardId').val()&&newData.child('price').val()===${old}.child('highestBid').val()&&!newData.hasChild('source'))||(${next}.child('phase').val()==='finished'&&${rosterIndex}>=${after('$seat')}&&newData.child('price').val()===0&&newData.child('source').val()==='completion'&&newData.child('id').val()===${next}.child('deck').child((${old}.child('awardCount').val()+1+${freeOffset})+'').val()))`;
  room.game.rosters={$seat:roster};
}
const legacyDeck = room.game.deck;
legacyDeck['.validate'] = transformRuleExpression(legacyDeck['.validate'], (node, render) => {
  if(node.kind==='or'&&/^!newData\.hasChild\('\d+'\)\|\|newData\.hasChild\('\d+'\)$/.test(render(node)))return {kind:'atom',value:'true'};
  if(node.kind==='atom'){
    const fixed=node.value.match(/^newData\.hasChild\('(\d+)'\)===data\.hasChild\('\1'\)$/);
    if(fixed&&Number(fixed[1])>=legacyMaximum)return {kind:'atom',value:'true'};
  }
  return node;
});
const legacyPrevious = Array.from({length:legacyMaximum-1},(_,i)=>`$index==='${i+1}'?'${i}':`).join('')+`'${legacyMaximum-2}'`;
legacyDeck.$index['.validate'] += `&&$index.matches(/^(${Array.from({length:legacyMaximum},(_,i)=>i).join('|')})$/)`;
legacyDeck.$index['.validate'] += `&&($index==='0'||newData.parent().hasChild(${legacyPrevious}))`;
// Move repeated fixed-round leaf checks into wildcard validators. Presence
// checks remain at their parent so a removed historical record is rejected.
const team = room.game.players.$seat;
const selectionValue = /^newData\.child\('selections\/r\d+\/(start|bench|cut)'\)\.val\(\)===/;
team['.validate'] = transformRuleExpression(team['.validate'], (node, render) => {
  if (node.kind==='atom' && selectionValue.test(node.value)) return {kind:'atom',value:'true'};
  return node;
});
for(const role of ['start','bench','cut']) {
  const player = 'data.parent().parent().parent()', game = 'newData.parent().parent().parent().parent().parent()', room = `${game}.parent()`;
  team.selections.$round[role]['.validate'] += `&&(!data.exists()?($round==='r'+(${player}.child('roundIndex').val()+1)&&${room}.child('lastAction/seat').val()===$seat&&newData.val()===(${game}.child('lastAssignment/role').val()==='${role}'?${game}.child('lastAssignment/cardId').val():${player}.child('pending/${role}').val())):newData.val()===data.val())`;
}
const differences = room.game.result.differences;
differences['.validate'] = "newData.hasChildren(['0','1','2','3','4','5','6','7'])&&!newData.hasChild('8')";
const previousIndex = `($index==='1'?'0':$index==='2'?'1':$index==='3'?'2':$index==='4'?'3':$index==='5'?'4':$index==='6'?'5':'6')`;
const deckOrdinal = id => Array.from({length:8},(_,i)=>`newData.parent().parent().parent().child('deck/${i}').val()===${id}?${i}:`).join('')+'99';
const prev = `newData.parent().child(${previousIndex})`;
differences.$index['.validate'] += `&&${Array.from({length:8},(_,i)=>`($index==='${i}'||newData.child('id').val()!==newData.parent().child('${i}/id').val())`).join('&&')}&&($index==='0'||newData.child('difference').val()<${prev}.child('difference').val()||(newData.child('difference').val()===${prev}.child('difference').val()&&(${deckOrdinal("newData.child('id').val()")})>(${deckOrdinal(`${prev}.child('id').val()`)})))`;
const seats = ['p1', 'p2', 'p3', 'p4'];
const partyModes = ['auction', 'sealed-auction', 'simultaneous-ranking', 'telepathy', 'detective', 'chameleon'];
const modes = [...partyModes, 'blind-ranking', 'bracket', 'team-draft', 'frequency', 'double-ranking'];
const child = (node, path) => `${node}.child('${path}')`;
const value = (node, path) => `${child(node, path)}.val()`;
const n = path => value('newData', path), d = path => value('data', path);
const eq = path => `${n(path)}===${d(path)}`;
const and = expressions => `(${expressions.map(expression => `(${expression})`).join('&&')})`;
const or = expressions => `(${expressions.map(expression => `(${expression})`).join('||')})`;
// Anchored literal alternatives are equivalent to repeated string equality,
// while leaving room in RTDB's 256 KiB source limit for lifecycle controls.
const oneOf = (expression, choices) => choices.length > 2
  ? `${expression}.matches(/^(${choices.join('|')})$/)`
  : or(choices.map(choice => `${expression}==='${choice}'`));
const number = (minimum, maximum) => `newData.isNumber()&&newData.val()%1===0&&newData.val()>=${minimum}&&newData.val()<=${maximum}`;
const isParty = expression => oneOf(expression, partyModes);
const v2 = "newData.child('version').val()===2";
const action = n('lastAction/kind'), actorSeat = n('lastAction/seat');
const member = node => `auth!==null&&(${or(seats.map(seat => `${value(node, `players/${seat}/uid`)}===auth.uid`))})`;
const globalRoom = "root.child('rooms').child($code)";
const globalMember = member(globalRoom);
const locked = "root.child('cleanupIndex').child($code).child('state').val()!=='deleting'";
const playersStable = and(seats.flatMap(seat => ['uid', 'name'].map(field => eq(`players/${seat}/${field}`))));
const configStable = and(['datasetId', 'mode', 'bracketSize', 'round', 'starterSeat'].map(eq));
const currentActor = `${child('data', 'players')}.child(${actorSeat}).child('uid').val()===auth.uid`;
const freshRevision = `${n('revision')}===${d('revision')}+1`;
const setup = oneOf(action, ['start', 'rematch', 'next-game']);
const freezeAction = oneOf(action, ['join', 'propose-next', 'ready-next']);
const countLimit = (mode, players = "newData.child('players')") => `((${oneOf(`(${mode})`, ['detective', 'team-draft', 'frequency', 'double-ranking', 'blind-ranking', 'bracket'])})?!${players}.hasChild('p3'):true)`;
const startCount = (mode, players = "newData.child('players')") => `(${oneOf(mode, ['blind-ranking', 'bracket'])}?true:${players}.hasChild('p2'))&&(${mode}==='chameleon'?${players}.hasChild('p3'):true)&&${countLimit(mode, players)}`;

room['.read'] = `(${room['.read']})||(${member('data')})||(auth!==null&&data.child('version').val()===2&&data.child('status').val()!=='playing'&&!data.child('players/p4').exists())`;
const oldWrite = room['.write'];
const baseWrite = `auth!==null&&${locked}&&newData.exists()&&${v2}&&$code.matches(/^[0-9]{6}$/)`;
const creation = `!data.exists()&&${n('players/p1/uid')}===auth.uid&&!newData.hasChild('players/p2')&&${n('status')}==='waiting'&&${n('revision')}===0&&${n('round')}===1&&${n('starterSeat')}==='p1'&&${n('ownerUid')}===auth.uid&&root.child('cleanupIndex').child($code).child('state').val()==='reserved'&&root.child('cleanupIndex').child($code).child('reserverUid').val()===auth.uid&&${n('createdAt')}===root.child('cleanupIndex').child($code).child('instance').val()`;
const joined = or(seats.slice(1).map(seat => and([
  `!data.hasChild('players/${seat}')`, `${n(`players/${seat}/uid`)}===auth.uid`, `${actorSeat}==='${seat}'`,
  ...(seat === 'p2' ? [] : [`data.hasChild('players/${seats[seats.indexOf(seat)-1]}')`]),
  ...seats.filter(key => key !== seat).flatMap(key => ['uid', 'name'].map(field => eq(`players/${key}/${field}`))),
])));
const joinWrite = `${action}==='join'&&!(${member('data')})&&${joined}&&${freshRevision}&&${configStable}&&${n('status')}===${d('status')}&&(${d('status')}!=='playing'||${oneOf(d('mode'), ['blind-ranking', 'bracket'])})&&${countLimit(`${child('newData', 'nextGame')}.exists()?${n('nextGame/mode')}:${n('mode')}`)}&&newData.hasChild('nextGame')===data.hasChild('nextGame')&&${and(['id','datasetId','mode','bracketSize','proposedBySeat'].map(path=>eq(`nextGame/${path}`)))}&&(!newData.hasChild('nextGame')||${and(seats.map(seat=>`!newData.hasChild('players/${seat}')||${n(`nextGame/ready/${seat}`)}===false`))})`;
const ownReadiness = and(seats.map(seat => `${actorSeat}==='${seat}'?${n(`nextGame/ready/${seat}`)}!==${d(`nextGame/ready/${seat}`)}:${n(`nextGame/ready/${seat}`)}===${d(`nextGame/ready/${seat}`)}`));
const allReady = node => and(seats.map(seat => `!${child(node, `players/${seat}`)}.exists()||${value(node, `nextGame/ready/${seat}`)}===true`));
const otherReady = and(seats.map(seat => `${actorSeat}==='${seat}'||!data.hasChild('players/${seat}')||${d(`nextGame/ready/${seat}`)}===true`));
const noneReady = and(seats.map(seat => `!newData.hasChild('players/${seat}')||${n(`nextGame/ready/${seat}`)}===false`));
const proposalStable = and(['id', 'datasetId', 'mode', 'bracketSize', 'proposedBySeat'].map(path => eq(`nextGame/${path}`)));
const proposal = `${action}==='propose-next'&&${d('status')}==='finished'&&${n('status')}==='finished'&&${configStable}&&${n('nextGame/id')}===${n('revision')}&&${n('nextGame/proposedBySeat')}===${actorSeat}&&${noneReady}`;
const ready = `${action}==='ready-next'&&${d('status')}==='finished'&&${n('status')}==='finished'&&${configStable}&&data.hasChild('nextGame')&&newData.hasChild('nextGame')&&${proposalStable}&&${ownReadiness}&&!(${allReady('newData')})`;
const next = `${action}==='next-game'&&${d('status')}==='finished'&&data.hasChild('nextGame')&&!newData.hasChild('nextGame')&&data.child('nextGame/ready').child(${actorSeat}).val()===false&&${otherReady}&&${n('status')}==='playing'&&${n('round')}===${d('round')}+1&&${n('datasetId')}===${d('nextGame/datasetId')}&&${n('mode')}===${d('nextGame/mode')}&&${n('bracketSize')}===${d('nextGame/bracketSize')}&&${startCount(n('mode'))}`;
const start = `${action}==='start'&&auth.uid===${d('ownerUid')}&&${d('status')}==='waiting'&&${n('status')}==='playing'&&${configStable}&&${startCount(n('mode'))}`;
const rematch = `${action}==='rematch'&&${d('status')}==='finished'&&${n('status')}==='playing'&&!data.hasChild('nextGame')&&!newData.hasChild('nextGame')&&${n('round')}===${d('round')}+1&&${eq('mode')}&&${eq('datasetId')}&&${eq('bracketSize')}&&${startCount(n('mode'))}`;
const ordinary = `${d('status')}==='playing'&&${isParty(d('mode'))}&&!data.hasChild('nextGame')&&!newData.hasChild('nextGame')&&${configStable}&&${oneOf(action, ['bid','pass','next','party-resolve'])}`;
room['.write'] = `((${oldWrite})&&(!newData.exists()||newData.child('version').val()===1||(!data.hasChild('partyGame')&&!newData.hasChild('partyGame')&&!newData.hasChild('players/p3'))))||(${baseWrite}&&((${creation})||(${joinWrite})||(${playersStable}&&${currentActor}&&${freshRevision}&&((${start})||(${rematch})||(${proposal})||(${ready})||(${next})||(${ordinary})))))`;
room['.validate'] = `${v2}?newData.hasChildren(['version','code','ownerUid','createdAt','datasetId','mode','status','round','starterSeat','revision','players'])&&(${n('status')}==='waiting'?!newData.hasChild('game')&&!newData.hasChild('partyGame'):${isParty(n('mode'))}?newData.hasChild('partyGame')&&!newData.hasChild('game'):newData.hasChild('game')&&!newData.hasChild('partyGame')):(${room['.validate']})`;
room.version['.validate'] = '(newData.val()===1||newData.val()===2)&&(!data.exists()||newData.val()===data.val())';
room.mode['.validate'] = `(${room.mode['.validate']})||(newData.parent().child('version').val()===2&&${isParty('newData.val()')}&&(!data.exists()||newData.val()===data.val()||newData.parent().child('lastAction/kind').val()==='next-game'))`;
room.starterSeat['.validate'] = `${oneOf('newData.val()', seats)}&&newData.parent().child('players').hasChild(newData.val())`;
room.lastAction.kind['.validate'] += `||(newData.parent().parent().child('version').val()===2&&${oneOf('newData.val()', ['join','next','party-resolve'])})`;
room.lastAction.seat['.validate'] = `${oneOf('newData.val()', seats)}&&newData.parent().parent().child('players').hasChild(newData.val())`;
const distinctSeats = seats.slice(1).map((seat, index) => {
  const different = and(seats.slice(0, index + 1).map(other => `${value('newData', `${seat}/uid`)}!==${value('newData', `${other}/uid`)}`));
  return `!newData.hasChild('${seat}')||(newData.hasChild('${seats[index]}')&&${different})`;
});
const playerTargetMode = "(newData.parent().child('nextGame').exists()?newData.parent().child('nextGame/mode').val():newData.parent().child('mode').val())";
room.players['.validate'] = `newData.hasChild('p1')&&${and(distinctSeats)}&&${countLimit(playerTargetMode, 'newData')}&&(!newData.hasChild('p3')||newData.parent().child('version').val()===2)`;
for (const seat of seats.slice(2)) room.players[seat] = structuredClone(room.players.p1);
room.nextGame.mode['.validate'] += `||(newData.parent().parent().child('version').val()===2&&${isParty('newData.val()')})`;
room.nextGame.proposedBySeat['.validate'] = `${oneOf('newData.val()', seats)}&&newData.parent().parent().child('players').hasChild(newData.val())`;
room.nextGame.ready['.validate'] = `newData.parent().parent().child('version').val()===2?(${and(seats.map(seat => `newData.hasChild('${seat}')===newData.parent().parent().hasChild('players/${seat}')`))}):(${room.nextGame.ready['.validate']})`;
for (const seat of seats.slice(2)) room.nextGame.ready[seat] = { '.validate': 'newData.isBoolean()' };

// Version-two games use a separate wire child so the complete legacy game
// validator can remain intact. Deck/seat lists are immutable during a match.
const pg = room.partyGame = { '.validate': `newData.hasChildren(['mode','seats','deck','starterSeat','phase','stage','roundIndex'])&&newData.child('mode').val()===newData.parent().child('mode').val()&&newData.parent().child('version').val()===2&&newData.child('starterSeat').val()===newData.parent().child('starterSeat').val()&&(newData.child('phase').val()==='finished')===(newData.parent().child('status').val()==='finished')`, '$other': { '.validate': false } };
const pgRoom = 'newData.parent()';
const pgAction = value(pgRoom, 'lastAction/kind');
const pgInitial = oneOf(pgAction, ['start','rematch','next-game']);
const pgFreeze = oneOf(pgAction, ['join','propose-next','ready-next']);
const pgMode = "newData.child('mode').val()";
const pgSeat = "newData.parent().child('lastAction/seat').val()";
const gEqual = path => `newData.child('${path}').val()===data.child('${path}').val()`;
const sameBudget = and(seats.map(seat=>gEqual(`budgets/${seat}`)));
const auctionBid = `data.child('mode').val()==='auction'&&${pgSeat}===data.child('turnSeat').val()&&newData.child('bidderSeat').val()===${pgSeat}&&newData.child('highestBid').val()>data.child('highestBid').val()&&newData.child('highestBid').val()<=data.child('budgets').child(${pgSeat}).val()&&${gEqual('deckIndex')}&&${gEqual('roundIndex')}&&${sameBudget}`;
const auctionPass = `data.child('mode').val()==='auction'&&${pgSeat}===data.child('turnSeat').val()&&(newData.child('deckIndex').val()===data.child('deckIndex').val()?newData.child('passed').child(${pgSeat}).val()===true:newData.child('deckIndex').val()===data.child('deckIndex').val()+1||newData.child('phase').val()==='finished')`;
const partyRoot = "root.child('privateGames').child($code).child('r'+newData.parent().child('round').val()).child('party/submissions').child('q'+data.child('roundIndex').val()).child(data.child('stage').val())";
const everyoneLocked = and(seats.map(seat=>`!newData.parent().hasChild('players/${seat}')||${partyRoot}.child('${seat}/locked').val()===true`));
const designatedLocked = `data.child('mode').val()==='detective'?${partyRoot}.child(data.child('stage').val()==='clue'?data.child('clueGiverSeat').val():data.child('guesserSeat').val()).child('locked').val()===true:data.child('mode').val()==='chameleon'&&(data.child('stage').val()==='clues'||data.child('stage').val()==='last-guess')?${partyRoot}.child(data.child('turnSeat').val()).child('locked').val()===true:${everyoneLocked}`;
const initialFields = `newData.child('phase').val()==='playing'&&newData.child('roundIndex').val()===0&&!newData.hasChild('results')&&(${oneOf(pgMode,['auction','sealed-auction'])}?newData.child('deckIndex').val()===0&&!newData.hasChild('rosters')&&${and(seats.map(seat=>`!newData.parent().hasChild('players/${seat}')||newData.child('budgets/${seat}').val()===20`))}:true)`;
pg['.validate'] += `&&(${pgInitial}?${initialFields}:${pgFreeze}?true:${pgAction}==='bid'?${auctionBid}:${pgAction}==='pass'?${auctionPass}:${pgAction}==='next'?data.child('stage').val()==='reveal'&&newData.child('roundIndex').val()===data.child('roundIndex').val()+1:${pgAction}==='party-resolve'&&data.child('mode').val()!=='auction'&&data.child('stage').val()!=='reveal'&&(${designatedLocked}))`;
const scalarAction = value('newData.parent().parent()', 'lastAction/kind');
const scalarInitial = oneOf(scalarAction,['start','rematch','next-game']);
const mutableScalar = expression => `${expression}&&(${oneOf(scalarAction,['join','propose-next','ready-next'])}?newData.val()===data.val():true)`;
pg.mode = { '.validate': `newData.val()===newData.parent().parent().child('mode').val()` };
pg.starterSeat = { '.validate': 'newData.val()===newData.parent().parent().child(\'starterSeat\').val()' };
pg.phase = { '.validate': mutableScalar(oneOf('newData.val()', ['playing','finished'])) };
pg.stage = { '.validate': mutableScalar(oneOf('newData.val()', ['bidding','choosing','clue','guess','clues','voting','last-guess','reveal','finished'])) };
pg.roundIndex = { '.validate': mutableScalar(`${number(0,30)}&&(${scalarInitial}?newData.val()===0:newData.val()===data.val()||newData.val()===data.val()+1)`) };
const arrayStable = (node, maximum, pattern) => {
  const initial = oneOf(value('newData.parent().parent()', 'lastAction/kind'), ['start','rematch','next-game']);
  return { '.validate': `newData.hasChild('0')&&(${initial}||${and(Array.from({length:maximum},(_,i)=>`newData.hasChild('${i}')===data.hasChild('${i}')`))})`, '$index': { '.validate': `$index.matches(${pattern})&&newData.isNumber()&&newData.val()%1===0&&newData.val()>0&&(${oneOf(value('newData.parent().parent().parent()', 'lastAction/kind'), ['start','rematch','next-game'])}||newData.val()===data.val())` } };
};
pg.deck = arrayStable('deck',45,/^(0|[1-9]|[123][0-9]|4[0-4])$/);
pg.deckSize = { '.validate': `${number(1,45)}&&newData.parent().child('deck').hasChild((newData.val()-1)+'')&&!newData.parent().child('deck').hasChild(newData.val()+'')&&(${oneOf(value('newData.parent().parent()', 'lastAction/kind'),['start','rematch','next-game'])}||newData.val()===data.val())` };
pg.deck['.validate'] = "newData.hasChild('0')&&newData.hasChild((newData.parent().child('deckSize').val()-1)+'')";
const partyPrevious = Array.from({length:44},(_,i)=>`$index==='${i+1}'?'${i}':`).join('')+"'43'";
pg.deck.$index['.validate'] += `&&($index==='0'||newData.parent().hasChild(${partyPrevious}))`;
const visibleGame='newData.parent().parent()';
const visibleCount = `(${visibleGame}.child('mode').val()==='telepathy'?4:${visibleGame}.child('mode').val()==='detective'?6:${visibleGame}.child('mode').val()==='chameleon'?9:1)`;
pg.visibleCards = { '$cardId': { '.validate': `${number(0,8)}&&newData.val()<${visibleCount}&&$cardId===${visibleGame}.child('deck').child(((${visibleGame}.child('roundIndex').val()*${visibleCount}+newData.val())%${visibleGame}.child('deckSize').val())+'').val()+''` } };
pg.deckIds = { '$cardId': { '.validate': `${number(0,44)}&&$cardId===newData.parent().parent().child('deck').child(newData.val()+'').val()+''` } };
pg.seats = { '.validate': `newData.hasChildren(['0','1'])&&(${oneOf(value('newData.parent().parent()', 'lastAction/kind'),['start','rematch','next-game'])}?newData.hasChild('2')===newData.parent().parent().hasChild('players/p3')&&newData.hasChild('3')===newData.parent().parent().hasChild('players/p4'):newData.hasChild('2')===data.hasChild('2')&&newData.hasChild('3')===data.hasChild('3'))`, '0': { '.validate': "newData.val()==='p1'" }, '1': { '.validate': "newData.val()==='p2'" }, '2': { '.validate': "newData.val()==='p3'" }, '3': { '.validate': "newData.val()==='p4'" }, '$other': { '.validate': false } };
// A generic leaf guard freezes all match data while players choose/approve the
// next game. Shape validators below close unknown fields and constrain inputs.
const frozenLeaf = depth => `!newData${'.parent()'.repeat(depth)}.hasChild('nextGame')||newData.val()===data.val()`;
const flexible = (depth=2, maximum=2) => ({ '.validate': `newData.hasChildren()||(${frozenLeaf(depth)})`, '$key': depth<maximum ? flexible(depth+1, maximum) : { '.validate': frozenLeaf(depth+1) } });
for (const [field,maximum] of Object.entries({results:5,rosters:4,completionAwards:3,actions:3,progress:2,rankings:3,result:6,scores:2,pairScores:2,pairStreaks:2,criteria:2,clues:2,votes:2,passed:2})) pg[field] = flexible(2,maximum);
for (const field of ['deckIndex','highestBid','score','streak','bestStreak']) pg[field] = { '.validate': mutableScalar(number(0,1000000)) };
for (const field of ['currentCardId']) pg[field] = { '.validate': mutableScalar(`${number(1,1000000)}&&newData.val()===newData.parent().child('deck').child(newData.parent().child('deckIndex').val()+'').val()`) };
for (const field of ['openerSeat','bidderSeat','turnSeat','clueGiverSeat','guesserSeat','caughtSeat']) pg[field] = { '.validate': mutableScalar(`${oneOf('newData.val()',seats)}&&newData.parent().parent().child('players').hasChild(newData.val())`) };
pg.clue = { '.validate': mutableScalar('newData.isString()&&newData.val().length<=24') };
pg.lastAward = flexible();
pg.budgets = { '$seat': { '.validate': `$seat.matches(/^p[1-4]$/)&&newData.parent().parent().parent().child('players').hasChild($seat)&&${number(0,20)}&&(${oneOf(value('newData.parent().parent().parent()', 'lastAction/kind'),['start','rematch','next-game'])}?newData.val()===20:newData.val()<=data.val())` } };
// Money is conserved in every public snapshot, including free completion.
const ledger = `newData.hasChild('budgets')`;
pg.budgets['.validate'] = and(seats.map((seat,index)=>`newData.hasChild('${seat}')===newData.parent().hasChild('seats/${index}')`));
const budgetRoster="newData.parent().parent().child('rosters').child($seat)";
pg.budgets.$seat['.validate'] += `&&20-newData.val()===(${Array.from({length:5},(_,index)=>`(${budgetRoster}.hasChild('${index}')?${budgetRoster}.child('${index}/price').val():0)`).join('+')})`;
const newAward = "newData.child('lastAward/sequence').val()===data.child('roundIndex').val()+1&&newData.child('lastAward/sequence').val()!==data.child('lastAward/sequence').val()";
const noBuyer = and(seats.map((seat,index)=>`!newData.hasChild('seats/${index}')||newData.child('budgets/${seat}').val()===0||data.hasChild('rosters/${seat}/4')||(data.hasChild('rosters/${seat}/3')&&newData.child('lastAward/seat').val()==='${seat}'&&${newAward})`));
const fullRosters = and(seats.map((seat,index)=>`!newData.hasChild('seats/${index}')||newData.hasChild('rosters/${seat}/4')`));
pg['.validate'] += `&&(${oneOf(pgMode,['auction','sealed-auction'])}?${ledger}&&(newData.child('phase').val()==='finished'?(${pgMode}==='sealed-auction'||${fullRosters}):newData.hasChild('currentCardId'))&&(${pgInitial}||${pgFreeze}||(newData.child('phase').val()==='finished')===(${noBuyer}||data.child('roundIndex').val()===data.child('deckSize').val()-1)):true)`;
const awardOld='data.parent()', awardNew='newData.parent()';
const awardSubmissions="root.child('privateGames').child($code).child('r'+newData.parent().parent().child('round').val()).child('party/submissions').child('q'+data.parent().child('roundIndex').val()).child('choosing')";
const winningSeat="newData.child('seat').val()", winningPrice="newData.child('price').val()";
const uniqueLeader=and(seats.map(seat=>`${winningSeat}==='${seat}'||!newData.parent().parent().hasChild('players/${seat}')||${awardOld}.hasChild('rosters/${seat}/4')||${winningPrice}>${awardSubmissions}.child('${seat}/amount').val()`));
const allPassed=and(seats.map(seat=>`${winningSeat}==='${seat}'||newData.parent().parent().child('lastAction/seat').val()==='${seat}'||!newData.parent().parent().hasChild('players/${seat}')||${awardOld}.child('passed/${seat}').val()===true`));
pg.lastAward={
  '.validate': `newData.hasChildren(['id','seat','price','sequence'])&&((${and(['id','seat','price','sequence'].map(field=>`newData.child('${field}').val()===data.child('${field}').val()`))})||(newData.child('id').val()===${awardOld}.child('currentCardId').val()&&newData.child('sequence').val()===${awardOld}.child('roundIndex').val()+1&&!${awardOld}.child('rosters').child(${winningSeat}).hasChild('4')&&(${awardOld}.child('mode').val()==='auction'?${winningSeat}===${awardOld}.child('bidderSeat').val()&&${winningPrice}===${awardOld}.child('highestBid').val()&&${allPassed}:${winningPrice}===${awardSubmissions}.child(${winningSeat}).child('amount').val()&&${uniqueLeader})))`,
  id:{},seat:{},price:{},sequence:{},'$other':{'.validate':false},
};
const rosterGame='newData.parent().parent().parent()', oldRosterGame='data.parent().parent().parent()';
const rosterInitial=oneOf(value(`${rosterGame}.parent()`,'lastAction/kind'),['start','rematch','next-game']);
const paidRoster=`$seat===${rosterGame}.child('lastAward/seat').val()&&newData.child('id').val()===${rosterGame}.child('lastAward/id').val()&&newData.child('price').val()===${rosterGame}.child('lastAward/price').val()&&${rosterGame}.child('lastAward/sequence').val()===${oldRosterGame}.child('roundIndex').val()+1&&!newData.hasChild('source')`;
const rosterUnique=and(seats.flatMap(seat=>Array.from({length:5},(_,index)=>`($seat==='${seat}'&&$index==='${index}')||newData.child('id').val()!==${rosterGame}.child('rosters/${seat}/${index}/id').val()`)));
pg.rosters={ '$seat':{
  '.validate': `$seat.matches(/^p[1-4]$/)&&newData.parent().parent().child('seats').hasChild($seat==='p1'?'0':$seat==='p2'?'1':$seat==='p3'?'2':'3')&&newData.hasChild('0')&&${and(Array.from({length:5},(_,index)=>`!data.hasChild('${index}')||newData.hasChild('${index}')`))}&&${and(Array.from({length:4},(_,index)=>`!newData.hasChild('${index+1}')||newData.hasChild('${index}')`))}`,
  '$index':{
    '.validate': `$index.matches(/^[0-4]$/)&&newData.hasChildren(['id','price'])&&${rosterGame}.child('deckIds').hasChild(newData.child('id').val()+'')&&${rosterUnique}&&(${rosterInitial}?true:data.exists()?${and(['id','price','source'].map(field=>`newData.child('${field}').val()===data.child('${field}').val()`))}:(${paidRoster})||(newData.child('price').val()===0&&newData.child('source').val()==='completion'&&${rosterGame}.child('phase').val()==='finished'))`,
    id:{'.validate':number(1,1000000)},price:{},source:{},'$other':{'.validate':false},
  },
} };

// Extend membership checks in presence, reactions and the activity index.
const oldMember = `root.child('rooms').child($code).child('players/p1/uid').val()===auth.uid||root.child('rooms').child($code).child('players/p2/uid').val()===auth.uid`;
const allMembers = or(seats.map(seat => `${value(globalRoom,`players/${seat}/uid`)}===auth.uid`));
function extendMembership(node) { for (const [key, item] of Object.entries(node)) { if (key.startsWith('.') && typeof item==='string') node[key] = item.split(oldMember).join(allMembers); else if(item&&typeof item==='object')extendMembership(item); } }
for (const branch of ['presence','reactions','cleanupIndex']) extendMembership(r[branch]);

const game = `${globalRoom}.child('partyGame')`;
const gv = path => value(game,path);
const selectedVisibleCard = expression => `${game}.child('visibleCards').hasChild(${expression}+'')`;
const currentPrivate = `auth!==null&&${locked}&&${globalRoom}.child('version').val()===2&&$round==='r'+${globalRoom}.child('round').val()`;
const currentQuestion = `$question==='q'+${gv('roundIndex')}`;
const currentStage = `$stage===${gv('stage')}`;
const actor = `${globalRoom}.child('players').child($seat).child('uid').val()===auth.uid`;
const submissionRoot = `root.child('privateGames').child($code).child($round).child('party/submissions').child($question).child($stage)`;
const allLocked = and(seats.map(seat => `!${globalRoom}.hasChild('players/${seat}')||${submissionRoot}.child('${seat}/locked').val()===true`));
const required = `(${gv('mode')}==='detective'?($stage==='clue'?$seat===${gv('clueGiverSeat')}:$seat===${gv('guesserSeat')}):${gv('mode')}==='chameleon'&&$stage==='clues'?$seat===${gv('turnSeat')}:${gv('mode')}==='chameleon'&&$stage==='last-guess'?$seat===${gv('caughtSeat')}:true)`;
const revealReady = `(${gv('mode')}==='detective'?${submissionRoot}.child($seat).child('locked').val()===true:${gv('mode')}==='chameleon'&&($stage==='clues'||$stage==='last-guess')?${submissionRoot}.child($seat).child('locked').val()===true:${allLocked})&&(${gv('mode')}!=='simultaneous-ranking'||$question==='q9')`;
const privateSeat = { '.read': `${currentPrivate}&&((${actor})||(${globalMember}&&${revealReady}))`, '.write': `${currentPrivate}&&${actor}&&${currentQuestion}&&${currentStage}&&${globalRoom}.child('status').val()==='playing'&&!data.exists()&&newData.exists()&&${required}`, '.validate': `newData.hasChildren(['instance','roundIndex','stage','locked'])&&newData.child('instance').val()===${globalRoom}.child('createdAt').val()&&newData.child('roundIndex').val()===${gv('roundIndex')}&&newData.child('stage').val()===$stage&&newData.child('locked').val()===true`, instance: {}, roundIndex: {}, stage: {}, locked: { '.read': `${currentPrivate}&&${globalMember}` }, '$other': { '.validate': false } };
privateSeat['.validate'] += `&&(${gv('mode')}==='sealed-auction'?newData.hasChild('amount'):${gv('mode')}==='simultaneous-ranking'?newData.hasChildren(['slot','slots','count']):$stage==='clue'||$stage==='clues'?newData.hasChild('word'):$stage==='voting'?newData.hasChild('seat'):newData.hasChild('cardId'))`;
privateSeat.amount = { '.validate': `${gv('mode')}==='sealed-auction'&&${number(0,20)}&&newData.val()<=${game}.child('budgets').child($seat).val()&&(!${game}.child('rosters').child($seat).hasChild('4')||newData.val()===0)` };
privateSeat.cardId = { '.validate': `${number(1,1000000)}&&${oneOf(gv('mode'),['telepathy','detective','chameleon'])}&&${selectedVisibleCard('newData.val()')}` };
// RTDB's regex parser has no Unicode property escapes. Generate the same BMP
// letter/number alphabet used by partyClue, rather than accepting punctuation.
const letterMatcher=new RegExp('['+String.fromCharCode(92)+'p{L}'+String.fromCharCode(92)+'p{N}]','u');
const letterRanges=[];let firstLetter=-1;
for(let code=0;code<=0x10000;code++){
  const letter=String.fromCharCode(code),hangulJamo=code>=0x1100&&code<=0x11ff||code>=0xa960&&code<=0xa97f||code>=0xd7b0&&code<=0xd7ff;
  // partyClue normalizes NFC before locking. Reject raw letters which would
  // change on normalization, including composing Hangul Jamo sequences.
  const accepted=code<0x10000&&letterMatcher.test(letter)&&letter.normalize('NFC')===letter&&!hangulJamo;
  if(accepted&&firstLetter<0)firstLetter=code;
  else if(!accepted&&firstLetter>=0){letterRanges.push([firstLetter,code-1]);firstLetter=-1;}
}
const letterAlphabet=letterRanges.map(([first,last])=>String.fromCharCode(first)+(last>first?'-'+String.fromCharCode(last):'')).join('');
privateSeat.word = { '.validate': `(${gv('mode')}==='detective'||${gv('mode')}==='chameleon')&&($stage==='clue'||$stage==='clues')&&newData.isString()&&newData.val().length>0&&newData.val().length<=24&&newData.val().matches(/^[${letterAlphabet}'’-]{1,24}$/)&&!newData.val().beginsWith("'")&&!newData.val().beginsWith('’')&&!newData.val().beginsWith('-')` };
privateSeat.seat = { '.validate': `${gv('mode')}==='chameleon'&&$stage==='voting'&&${oneOf('newData.val()',seats)}&&newData.val()!==$seat&&${globalRoom}.child('players').hasChild(newData.val())` };
privateSeat.slot = { '.validate': `${gv('mode')}==='simultaneous-ranking'&&${number(1,10)}` };
privateSeat.count = { '.read': `${currentPrivate}&&${globalMember}`, '.validate': `${gv('mode')}==='simultaneous-ranking'&&newData.val()===${gv('roundIndex')}+1` };
const priorRank = `root.child('privateGames').child($code).child($round).child('party/submissions').child('q'+(${gv('roundIndex')}-1)).child('choosing').child($seat).child('slots')`;
privateSeat.slots = { '.validate': `(${Array.from({length:10},(_,i)=>`(newData.hasChild('s${i+1}')?1:0)`).join('+')})===newData.parent().child('count').val()`, '$slot': { '.validate': `$slot.matches(/^s([1-9]|10)$/)&&${gv('mode')}==='simultaneous-ranking'&&newData.isNumber()&&newData.val()>0&&($slot==='s'+newData.parent().parent().child('slot').val()?(!${priorRank}.hasChild($slot)&&newData.val()===${game}.child('deck').child(${gv('roundIndex')}+'').val()):newData.val()===${priorRank}.child($slot).val())` } };
r.privateGames.$code.$round.party = { submissions: { '$question': { '$stage': { '$seat': privateSeat } } }, deals: {} };
const deal = `root.child('privateGames').child($code).child($round).child('party/deals').child($question)`;
const ownView = `${deal}.child('views').child($seat)`;
const selfUid = `${globalRoom}.child('players').child($seat).child('uid').val()===auth.uid`;
const anyGuessLocked = `${game}.child('mode').val()==='detective'?root.child('privateGames').child($code).child($round).child('party/submissions').child($question).child('guess').child(${gv('guesserSeat')}).child('locked').val()===true:root.child('privateGames').child($code).child($round).child('party/submissions').child($question).child('last-guess').child(${deal}.child('moleSeat').val()).child('locked').val()===true`;
const targetReader = or(seats.map(seat => `${value(globalRoom,`players/${seat}/uid`)}===auth.uid&&(${gv('mode')}==='detective'?${gv('clueGiverSeat')}==='${seat}':${deal}.child('moleSeat').val()!=='${seat}')`));
const votesRoot = `root.child('privateGames').child($code).child($round).child('party/submissions').child($question).child('voting')`;
const votesLocked = and(seats.map(seat => `!${globalRoom}.hasChild('players/${seat}')||${votesRoot}.child('${seat}/locked').val()===true`));
const localVotes = "data.parent().parent().parent().child('submissions').child($question).child('voting')";
const countVotes = candidate => `(${seats.map(seat=>`(${localVotes}.child('${seat}/seat').val()===${candidate}?1:0)`).join('+')})`;
const moleCount = countVotes("data.parent().child('moleSeat').val()");
const moleEscaped = or(seats.map(seat=>`data.parent().child('moleSeat').val()!=='${seat}'&&${countVotes(`'${seat}'`)}>=${moleCount}`));
r.privateGames.$code.$round.party.deals.$question = {
  '.read': `${currentPrivate}&&!data.exists()&&${globalRoom}.child('ownerUid').val()===auth.uid&&${currentQuestion}`,
  '.write': `${currentPrivate}&&${globalRoom}.child('ownerUid').val()===auth.uid&&${currentQuestion}&&${globalRoom}.child('status').val()==='playing'&&(${gv('stage')}==='clue'||${gv('stage')}==='clues')&&!data.exists()&&newData.exists()`,
  '.validate': `newData.hasChildren(['instance','targetId','views'])&&newData.child('instance').val()===${globalRoom}.child('createdAt').val()&&(${gv('mode')}==='chameleon'?newData.hasChild('moleSeat'):!newData.hasChild('moleSeat'))`,
  instance: {},
  targetId: { '.read': `${currentPrivate}&&((${targetReader})||(${globalMember}&&(${anyGuessLocked}))||(${globalMember}&&${gv('mode')}==='chameleon'&&${votesLocked}&&(${moleEscaped})))`, '.validate': `${number(1,1000000)}&&${selectedVisibleCard('newData.val()')}` },
  moleSeat: { '.read': `${currentPrivate}&&${globalMember}&&${votesLocked}`, '.validate': `${oneOf('newData.val()',seats)}&&${globalRoom}.child('players').hasChild(newData.val())` },
  views: { '.validate': and(seats.map(seat => `newData.hasChild('${seat}')===${globalRoom}.hasChild('players/${seat}')`)), '$seat': {
    '.read': `${currentPrivate}&&${selfUid}`,
    '.validate': `$seat.matches(/^p[1-4]$/)&&newData.hasChild('isMole')&&(${gv('mode')}==='chameleon'?newData.child('isMole').val()===(newData.parent().parent().child('moleSeat').val()===$seat):newData.child('isMole').val()===false)&&newData.hasChild('targetId')===(${gv('mode')}==='chameleon'?newData.child('isMole').val()===false:$seat===${gv('clueGiverSeat')})`,
    isMole: { '.validate': 'newData.isBoolean()' }, targetId: { '.validate': 'newData.val()===newData.parent().parent().parent().child(\'targetId\').val()' }, '$other': { '.validate': false },
  } }, '$other': { '.validate': false },
};

installPartyGameGuards(document);
installPartyShapeGuards(document);
installTableLifecycleRules(document);
installAuctionJuryRules(document);
compactLegacyGuards(document);
compactLiteralAlternatives(document);
compactRuleTree(document);
const text = JSON.stringify(document)+'\n';
console.log(`Party rules: ${Buffer.byteLength(text)} bytes; maximum 262144.`);
if (Buffer.byteLength(text)>256*1024) throw new RangeError('Firebase rules exceed the 256 KiB source limit; output was not replaced.');
await writeFile(output,text);
