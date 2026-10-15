/** Four-seat fixtures in a local demo RTDB only. No production credentials. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createPartyRoom,joinPartyRoom,changePartyRoom,encodePartyRoom,decodePartyRoom,ALL_MODES,modeLimits } from '../js/party-room-state.js';
import { partyCards, createPartyGame } from '../js/party-games.js';
import { partySubmission } from '../js/party-online.js';
import { playableCollections, consolationRange, splitCollections, activeConsolationCards } from '../js/consolation.js';
import { draftTriplets } from '../js/game-setup.js';
const ORIGIN=process.env.DB_EMULATOR_URL||'http://127.0.0.1:9000';
assert.ok(/^http:\/\/(127\.0\.0\.1|localhost):[0-9]+$/.test(ORIGIN),'Only local emulator tests are permitted.');
const PROJECT='demo-iki-kisilik',CODES=['957001','957002','957003','957004','957005','957006','957007','957008'];
const RAW=JSON.parse(await readFile(new URL('../veri.json',import.meta.url),'utf8')),DATASETS=playableCollections(RAW);
const RESERVES=splitCollections(RAW).consolationDatasets;
const DECK=DATASETS.futbol.map(card=>card.id);
const NEW_COLLECTIONS=['tatil-rotalari','efsane-otomobiller','sokak-lezzetleri','tv-yarismalari','ikonik-mekanlar'];
const setupFor=(datasetId,mode)=>mode==='team-draft'?{triplets:draftTriplets(DATASETS[datasetId],length=>length-1)}:{deck:DATASETS[datasetId].map(card=>card.id),...(mode==='auction'?{completionDeck:activeConsolationCards(RESERVES[datasetId]).map(card=>card.id)}:{})};
const LEGACY_COMPLETION=Array.from({length:10},(_,index)=>consolationRange('futbol').min+index);
const COMPLETION=LEGACY_COMPLETION.slice(0,8);
const stamp=Date.now(),encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
let passed=0;
function token(uid){const now=Math.floor(Date.now()/1000);return `${encode({alg:'none',typ:'JWT'})}.${encode({iss:`https://securetoken.google.com/${PROJECT}`,aud:PROJECT,sub:uid,uid,user_id:uid,iat:now,exp:now+3600,auth_time:now,firebase:{identities:{},sign_in_provider:'anonymous'}})}.`;}
async function req(path,{uid='p1',admin=false,method='GET',value,headers={}}={}){
  const url=new URL(`${path}.json`,ORIGIN+'/');url.searchParams.set('ns',PROJECT);if(!admin)url.searchParams.set('auth',token(uid));
  const response=await fetch(url,{method,headers:{...headers,...(admin?{Authorization:'Bearer owner'}:{}),...(value!==undefined?{'Content-Type':'application/json'}:{})},...(value!==undefined?{body:JSON.stringify(value)}:{}),signal:AbortSignal.timeout(path==='.settings/rules'?120000:30000)});
  return {status:response.status,value:await response.json(),etag:response.headers.get('etag')};
}
const ok=result=>{assert.equal(result.status,200,JSON.stringify(result.value).slice(0,800));return result.value;};
const denied=result=>assert.ok([401,403].includes(result.status),JSON.stringify(result).slice(0,800));
const put=(path,value,uid='p1',headers={})=>req(path,{method:'PUT',value,uid,headers});
const write=(room,uid='p1',headers={})=>put(`rooms/${room.code}`,encodePartyRoom(room),uid,headers).then(result=>({...result,value:decodePartyRoom(result.value)}));
async function check(label,fn){if(process.env.PARTY_TEST_FILTER&&label!=='party rules compile under the Firebase source limit'&&!label.includes(process.env.PARTY_TEST_FILTER))return;try{await fn();passed++;console.log('PASS',label);}catch(error){throw new Error(`${label}: ${error.message}`,{cause:error});}}
async function clean(){for(const code of CODES)for(const branch of ['rooms','privateGames','presence','reactions','cleanupIndex'])ok(await req(`${branch}/${code}`,{method:'DELETE',admin:true}));}
async function start(mode,count=4,code=CODES[0],mutations=[],criteria,extra={},datasetId='futbol'){
  await req(`rooms/${code}`,{method:'DELETE',admin:true});await req(`privateGames/${code}`,{method:'DELETE',admin:true});
  ok(await req(`cleanupIndex/${code}`,{method:'PUT',admin:true,value:{instance:stamp,lastActivityAt:Date.now(),state:'reserved',reserverUid:'p1'}}));
  let room=ok(await write(createPartyRoom({code,uid:'p1',name:'Ada',createdAt:stamp,datasetId,mode,...(mode==='bracket'?{bracketSize:32}:{})})));
  for(let index=2;index<=count;index++)room=ok(await write(joinPartyRoom(room,`p${index}`,`Oyuncu ${index}`),`p${index}`));
  const candidate=changePartyRoom(room,'p1',room.revision,'start',{...(mode==='team-draft'?{triplets:draftTriplets(DATASETS[datasetId],length=>length-1)}:{deck:DATASETS[datasetId].map(card=>card.id)}),...(criteria?{criteria}:{}),...extra});
  if(mutations.length)await rejectMutations(candidate,mutations);
  return ok(await write(candidate));
}
const base=room=>`privateGames/${room.code}/r${room.round}/party`;
const path=room=>`${base(room)}/submissions/q${room.game.roundIndex}/${room.game.stage}`;
async function submit(room,seat,value,previous={}){const payload=partySubmission(room,seat,value,previous);ok(await put(`${path(room)}/${seat}`,payload,seat));return payload;}
async function resolve(room,records,secrets={}){return ok(await write(changePartyRoom(room,'p1',room.revision,'party-resolve',{records,secrets})));}
async function rejectMutations(candidate,mutations,uid='p1'){
  for(const mutation of mutations){const forged=encodePartyRoom(structuredClone(candidate));mutation(forged.partyGame,forged);denied(await put(`rooms/${candidate.code}`,forged,uid));}
}
async function seedDeal(room,{targetId=partyCards(room.game)[0],moleSeat='p4'}={}){
  const game=room.game,views=Object.fromEntries(game.seats.map(seat=>[seat,game.mode==='chameleon'?{isMole:seat===moleSeat,...(seat!==moleSeat?{targetId}:{})}:{isMole:false,...(seat===game.clueGiverSeat?{targetId}:{})}]));
  const value={instance:room.createdAt,targetId,...(game.mode==='chameleon'?{moleSeat}:{}),views};
  ok(await put(`${base(room)}/deals/q${game.roundIndex}`,value));return value;
}
try{
  await check('party rules compile under the Firebase source limit',async()=>{const text=await readFile(process.env.DB_RULES_FILE||new URL('../firebase.rules.json',import.meta.url),'utf8');assert.ok(Buffer.byteLength(text)<=256*1024);ok(await req('.settings/rules',{method:'PUT',admin:true,value:JSON.parse(text)}));});
  await clean();
  await check('initial party games require their complete mode schema and unique bounded deck',async()=>{
    for(const mode of ['auction','sealed-auction','simultaneous-ranking','telepathy','detective','chameleon']){
      const count=mode==='detective'?2:4;
      const mutations=[g=>delete g.deckSize,g=>delete g.deckIds,g=>delete g.visibleCards,g=>g.deck[1]=g.deck[0],g=>delete g.deck[1],g=>g.deckIds[g.deck[0]]=1,g=>g.deckIds[999999]=0,g=>g.roundIndex=1,g=>g.phase='finished',g=>g.stage='reveal',g=>g.result={score:99},g=>g.lastAward={evil:1},g=>g.completionAwards=[{id:DECK[10],seat:'p1',price:0}]];
      mutations.push(g=>{const old=g.deck[0],id=consolationRange('superlig').min;g.deck[0]=id;delete g.deckIds[old];g.deckIds[id]=0;delete g.visibleCards[old];g.visibleCards[id]=0;if(g.currentCardId)g.currentCardId=id;});
      if(['auction','sealed-auction'].includes(mode))mutations.push(g=>delete g.budgets,g=>g.rosters={p1:[{id:g.deck[0],price:0}]});
      if(mode==='auction')mutations.push(g=>delete g.passed,g=>delete g.highestBid,g=>delete g.openerSeat,g=>delete g.turnSeat);
      if(mode==='simultaneous-ranking')mutations.push(g=>delete g.progress,g=>g.progress.p1=1);
      if(mode==='telepathy')mutations.push(g=>delete g.scores,g=>delete g.criteria,g=>g.criteria[10]=0,g=>g.criteria[0]=40,g=>g.criteria[0]=g.criteria[1],g=>delete g.pairScores,g=>delete g.pairStreaks);
      if(mode==='detective')mutations.push(g=>delete g.clue,g=>delete g.guesserSeat,g=>g.clueGiverSeat='p2');
      if(mode==='chameleon')mutations.push(g=>delete g.scores,g=>g.turnSeat='p2',g=>g.caughtSeat='p1');
      await start(mode,count,CODES[0],mutations);
    }
  });
  await check('all six party modes create and start at every supported player count',async()=>{for(const mode of ['auction','sealed-auction','simultaneous-ranking','telepathy','detective','chameleon'])for(const count of(mode==='detective'?[2]:mode==='chameleon'?[3,4]:[2,3,4])){const room=await start(mode,count);assert.equal(room.game.seats.length,count);assert.equal(room.status,'playing');assert.equal(room.game.deck.length,mode==='auction'||mode==='sealed-auction'?count===2?20:30:mode==='simultaneous-ranking'?10:mode==='telepathy'?40:mode==='detective'?36:45);}});
  await check('new collections require exact IDs at creation rather than prefixes or suffixes',async()=>{
    for(const datasetId of NEW_COLLECTIONS){
      const code=CODES[7];await req(`rooms/${code}`,{method:'DELETE',admin:true});
      ok(await req(`cleanupIndex/${code}`,{method:'PUT',admin:true,value:{instance:stamp,lastActivityAt:Date.now(),state:'reserved',reserverUid:'p1'}}));
      const waiting=createPartyRoom({code,uid:'p1',name:'Ada',createdAt:stamp,datasetId,mode:'auction'});
      for(const unknown of [`${datasetId}-x`,`x-${datasetId}`,datasetId.toUpperCase(),'unknown-collection'])denied(await put(`rooms/${code}`,{...waiting,datasetId:unknown}));
      ok(await write(waiting));
    }
  });
  await check('new collections start all eleven modes with their own cards and matching eight-card auction reserves',async()=>{
    for(const datasetId of NEW_COLLECTIONS)for(const mode of ALL_MODES){
      const setup=setupFor(datasetId,mode),mutations=[];
      if(mode==='auction'){
        const nextId=NEW_COLLECTIONS[(NEW_COLLECTIONS.indexOf(datasetId)+1)%NEW_COLLECTIONS.length];
        mutations.push(g=>{g.completionDeck=setupFor(nextId,'auction').completionDeck;g.completionIds=Object.fromEntries(g.completionDeck.map((id,index)=>[id,index]));});
        mutations.push(g=>{const old=g.deck[0],id=setup.completionDeck[0];g.deck[0]=id;delete g.deckIds[old];g.deckIds[id]=0;delete g.visibleCards[old];g.visibleCards[id]=0;g.currentCardId=id;});
      }
      const value=await start(mode,modeLimits(mode).min,CODES[0],mutations,undefined,mode==='auction'?{completionDeck:setup.completionDeck}:{},datasetId);
      assert.equal(value.datasetId,datasetId);assert.equal(value.mode,mode);assert.equal(value.status,'playing');
      if(mode==='team-draft')assert.deepEqual(value.game.triplets,setup.triplets);
      else assert.ok(value.game.deck.every(id=>DATASETS[datasetId].some(card=>card.id===id)));
      if(mode==='auction')assert.deepEqual(value.game.completionDeck,setup.completionDeck);
    }
  });
  await check('new collections support approved same-room changes and owner resets while unknown IDs are rejected',async()=>{
    let room=await start('auction',2,CODES[4]);
    for(const datasetId of NEW_COLLECTIONS){
      let guard=0;while(room.status==='playing'){assert.ok(++guard<100);room=changePartyRoom(room,room.game.turnSeat,room.revision,'pass');}
      ok(await req(`rooms/${room.code}`,{method:'PUT',admin:true,value:encodePartyRoom(room)}));
      const proposed=changePartyRoom(room,'p1',room.revision,'propose-next',{datasetId,mode:'auction'});
      await rejectMutations(proposed,[(_g,r)=>r.nextGame.datasetId=datasetId+'-x']);
      room=ok(await write(proposed));
      const setup=setupFor(datasetId,'auction'),id=room.nextGame.id;
      room=ok(await write(changePartyRoom(room,'p1',room.revision,'ready-next',{id,ready:true,...setup})));
      room=ok(await write(changePartyRoom(room,'p2',room.revision,'ready-next',{id,ready:true,...setup}),'p2'));
      assert.equal(room.datasetId,datasetId);assert.deepEqual(room.game.completionDeck,setup.completionDeck);
      const reset=changePartyRoom(room,'p1',room.revision,'reset-table',{removeSeats:[],datasetId,mode:'auction'});
      await rejectMutations(reset,[(_g,r)=>r.datasetId=datasetId+'-x']);
      room=ok(await write(reset));
      room=ok(await write(changePartyRoom(room,'p1',room.revision,'start',setup)));
      assert.equal(room.datasetId,datasetId);assert.deepEqual(room.game.completionDeck,setup.completionDeck);
    }
  });
  await check('new telepathy games accept the expanded forty-question pool and freeze its unique sequence',async()=>{
    const criteria=Array.from({length:10},(_,index)=>39-index);
    let expanded=await start('telepathy',2,CODES[0],[],criteria);
    assert.deepEqual(expanded.game.criteria,criteria);
    const records={};for(const seat of expanded.game.seats)records[seat]=await submit(expanded,seat,{cardId:partyCards(expanded.game)[0]});
    expanded=await resolve(expanded,records);assert.equal(expanded.game.score,100);
    const next=changePartyRoom(expanded,'p1',expanded.revision,'next');
    await rejectMutations(next,[g=>g.criteria[0]=20,g=>g.criteria[1]=g.criteria[0]]);
    expanded=ok(await write(next));assert.deepEqual(expanded.game.criteria,criteria);
  });
  await check('already-created legacy telepathy rooms can finish with their original repeated questions',async()=>{
    let legacy=await start('telepathy',2,CODES[0]);legacy.game.criteria=Array(10).fill(2);
    ok(await req(`rooms/${legacy.code}`,{method:'PUT',admin:true,value:encodePartyRoom(legacy)}));
    const records={};for(const seat of legacy.game.seats)records[seat]=await submit(legacy,seat,{cardId:partyCards(legacy.game)[0]});
    legacy=await resolve(legacy,records);legacy=ok(await write(changePartyRoom(legacy,'p1',legacy.revision,'next')));
    assert.deepEqual(legacy.game.criteria,Array(10).fill(2));assert.equal(legacy.game.roundIndex,1);
  });
  let room=await start('telepathy');
  await check('players cannot start another member’s table or join an active party',async()=>{const forged=structuredClone(room);forged.revision++;forged.lastAction={kind:'start',seat:'p2'};denied(await write(forged,'p2'));denied(await req(`rooms/${room.code}`,{uid:'stranger'}));const joined=structuredClone(room);joined.players.p4={uid:'stranger',name:'X'};joined.revision++;joined.lastAction={kind:'join',seat:'p4'};denied(await write(joined,'stranger'));});
  await check('private choices reject strangers, another seat, future rounds and wrong visible cards',async()=>{const value=partySubmission(room,'p1',{cardId:partyCards(room.game)[0]});denied(await put(`${path(room)}/p2`,value));denied(await put(`${path(room)}/p1`,value,'stranger'));denied(await put(`${base(room)}/submissions/q1/choosing/p1`,{...value,roundIndex:1}));denied(await put(`${path(room)}/p1`,{...value,cardId:DECK[20]}));denied(await put(`${path(room)}/p1`,{instance:stamp,stage:'choosing',roundIndex:0,locked:true}));});
  const records={};
  await check('each simultaneous lock stays private until all four players commit',async()=>{for(const seat of room.game.seats){records[seat]=await submit(room,seat,{cardId:partyCards(room.game)[0]});assert.equal(ok(await req(`${path(room)}/${seat}/locked`,{uid:'p2'})),true);if(seat!=='p4'){denied(await req(`${path(room)}/${seat}`,{uid:'p4'}));denied(await req(path(room)));}}});
  await check('locked choices survive refresh and cannot be replaced or erased',async()=>{assert.deepEqual(ok(await req(`${path(room)}/p1`)),records.p1);denied(await put(`${path(room)}/p1`,{...records.p1,cardId:partyCards(room.game)[1]}));denied(await put(`${path(room)}/p1`,null));assert.deepEqual(ok(await req(`${path(room)}/p4`)),records.p4);denied(await req(`${path(room)}/p4`,{uid:'stranger'}));});
  await check('telepathy scores, choices, metadata and criterion changes cannot be forged',async()=>{
    const candidate=changePartyRoom(room,'p1',room.revision,'party-resolve',{records});
    await rejectMutations(candidate,[g=>g.score++,g=>g.scores.p1++,g=>g.scores.p5=0,g=>g.pairScores.p1_p2++,g=>g.pairStreaks.p1_p2++,g=>g.bestStreak++,g=>g.criteria[0]=(g.criteria[0]+1)%10,g=>delete g.criteria,g=>delete g.deckIds,g=>delete g.visibleCards,g=>delete g.deckSize,g=>g.deck[1]=g.deck[0],g=>g.results.r1.choices.p1=partyCards(room.game)[1],g=>g.results.r1.choices.p5=partyCards(room.game)[0],g=>g.results.r1.pairResults.p1_p2.points++,g=>g.results.r1.scores.p1++,g=>g.results.r1.streak++,g=>g.completionAwards=[{id:DECK[30],seat:'p1',price:0}],g=>g.result={points:999}]);
  });
  await check('one public resolution consumes the four locked choices',async()=>{room=await resolve(room,records);assert.equal(room.game.score,600);const replay=structuredClone(room);replay.revision++;denied(await write(replay));});
  await check('completed telepathy history is immutable and the next question keeps scores',async()=>{const candidate=changePartyRoom(room,'p1',room.revision,'next');await rejectMutations(candidate,[g=>delete g.results,g=>g.results.r1.choices.p1=DECK[4],g=>g.results.r1.points++,g=>g.scores.p1++,g=>g.stage='clue',g=>g.phase='finished',g=>g.roundIndex++]);room=ok(await write(candidate));});
  await check('P3 and P4 have the same presence and reaction membership protections',async()=>{for(const seat of ['p3','p4']){ok(await put(`presence/${room.code}/${seat}/tab`,{connectedAt:Date.now()},seat));ok(await put(`presence/${room.code}/${seat}/tab`,null,seat));ok(await put(`reactions/${room.code}/${seat}`,{seq:1,type:'laugh',sentAt:{'.sv':'timestamp'}},seat));}denied(await put(`presence/${room.code}/p4/spoof`,{connectedAt:Date.now()}));denied(await req(`presence/${room.code}`,{uid:'stranger'}));});
  room=await start('simultaneous-ranking',4,CODES[1]);
  const slots=Object.fromEntries(room.game.seats.map(seat=>[seat,{}]));
  await check('ten synchronous cards reveal only lock progress, never another ranking early',async()=>{
    for(let index=0;index<10;index++){
      const batch={};for(const [seatIndex,seat]of room.game.seats.entries()){const slot=seatIndex%2?10-index:index+1;batch[seat]=await submit(room,seat,{slot},slots[seat]);slots[seat]=batch[seat].slots;if(index<9)denied(await req(`${path(room)}/${seat}/slots`,{uid:seat==='p1'?'p2':'p1'}));}
      if(index<9){for(const seat of room.game.seats)denied(await req(`${path(room)}/${seat}`,{uid:seat==='p1'?'p2':'p1'}));room=await resolve(room,Object.fromEntries(room.game.seats.map(seat=>[seat,{locked:true,count:index+1,roundIndex:index,stage:'choosing'}])));}
      else{assert.deepEqual(ok(await req(`${path(room)}/p4`)),batch.p4);room=await resolve(room,batch);}
    }
    assert.equal(room.status,'finished');assert.equal(room.game.result.mostCompatible.compatibility,100);assert.equal(room.game.result.mostDifferent.compatibility,0);
  });
  await check('every member must approve a same-room proposal; changing it resets all four',async()=>{room=ok(await write(changePartyRoom(room,'p3',room.revision,'propose-next',{datasetId:'film',mode:'auction'}),'p3'));for(const seat of ['p1','p2','p3'])room=ok(await write(changePartyRoom(room,seat,room.revision,'ready-next',{id:room.nextGame.id,ready:true,deck:DECK}),seat));assert.equal(room.status,'finished');room=ok(await write(changePartyRoom(room,'p4',room.revision,'propose-next',{datasetId:'futbol',mode:'telepathy'}),'p4'));assert.ok(Object.values(room.nextGame.ready).every(value=>value===false));for(const seat of room.game.seats)room=ok(await write(changePartyRoom(room,seat,room.revision,'ready-next',{id:room.nextGame.id,ready:true,deck:DECK}),seat));assert.equal(room.code,CODES[1]);assert.equal(room.round,2);assert.equal(room.starterSeat,'p2');denied(await put(`privateGames/${room.code}/r1/party/submissions/q9/choosing/p1`,{}));});
  room=await start('detective',2,CODES[2]);let deal=await seedDeal(room);
  await check('detective deal, target and role views are private to their allowed recipient',async()=>{denied(await req(`${base(room)}/deals/q0`));assert.equal(ok(await req(`${base(room)}/deals/q0/views/p1`)).targetId,deal.targetId);assert.equal(ok(await req(`${base(room)}/deals/q0/views/p2`,{uid:'p2'})).targetId,undefined);denied(await req(`${base(room)}/deals/q0/views/p1`,{uid:'p2'}));denied(await req(`${base(room)}/deals/q0/targetId`,{uid:'p2'}));denied(await put(`${base(room)}/deals/q0`,deal));});
  await check('one clue unlocks only the guess stage and a locked guess reveals its target',async()=>{const clue=await submit(room,'p1',{word:'efsane'});room=await resolve(room,{p1:clue});assert.equal(room.game.stage,'guess');denied(await req(`${base(room)}/deals/q0/targetId`,{uid:'p2'}));const guess=await submit(room,'p2',{cardId:deal.targetId});assert.equal(ok(await req(`${base(room)}/deals/q0/targetId`,{uid:'p2'})),deal.targetId);room=await resolve(room,{p2:guess},{targetId:deal.targetId});assert.equal(room.game.scores.p1,100);room=ok(await write(changePartyRoom(room,'p2',room.revision,'next'),'p2'));assert.equal(room.game.clueGiverSeat,'p2');});
  await check('a single private clue rejects whitespace, punctuation, noncanonical and long text before locking',async()=>{deal=await seedDeal(room);const good=partySubmission(room,'p2',{word:'efsane'});for(const word of ['iki kelime','iki\tkelime','iki\nkelime','!!!','-ikon','a'.repeat(25),'𐐀','Å','가'])denied(await put(`${path(room)}/p2`,{...good,word},'p2'));for(const word of ['Çılgın','легенда','传奇','가']){const payload={...good,word};ok(await put(`${path(room)}/p2`,payload,'p2'));ok(await req(`${path(room)}/p2`,{method:'DELETE',admin:true}));}});
  await check('detective outcome and scores must match the actual hidden target and guess',async()=>{const clue=await submit(room,'p2',{word:'efsane'});room=await resolve(room,{p2:clue});const guess=await submit(room,'p1',{cardId:partyCards(room.game)[1]});const candidate=changePartyRoom(room,'p1',room.revision,'party-resolve',{records:{p1:guess},secrets:{targetId:deal.targetId}});await rejectMutations(candidate,[g=>g.scores.p1++,g=>g.results.r2.targetId=partyCards(room.game)[1],g=>g.results.r2.guessId=deal.targetId,g=>g.results.r2.correct=true,g=>g.results.r2.points=100,g=>g.clueGiverSeat='p1',g=>delete g.scores]);room=ok(await write(candidate));});
  room=await start('chameleon',4,CODES[3]);deal=await seedDeal(room);
  await check('only the mole sees its role, other players see a target but not its identity',async()=>{assert.deepEqual(ok(await req(`${base(room)}/deals/q0/views/p4`,{uid:'p4'})),{isMole:true});denied(await req(`${base(room)}/deals/q0/targetId`,{uid:'p4'}));denied(await req(`${base(room)}/deals/q0/moleSeat`));denied(await req(`${base(room)}/deals/q0/views/p4`));assert.equal(ok(await req(`${base(room)}/deals/q0/views/p2`,{uid:'p2'})).targetId,deal.targetId);});
  await check('chameleon clues follow clockwise seats, then every vote is locked privately',async()=>{while(room.game.stage==='clues'){const seat=room.game.turnSeat;const word=await submit(room,seat,{word:'ikonik'});room=await resolve(room,{[seat]:word});}assert.equal(room.game.stage,'voting');const votes={};for(const seat of room.game.seats)votes[seat]=await submit(room,seat,{seat:seat==='p4'?'p1':'p4'});assert.equal(ok(await req(`${base(room)}/deals/q0/moleSeat`)),'p4');denied(await req(`${base(room)}/deals/q0/targetId`,{uid:'p4'}));room=await resolve(room,votes,{moleSeat:'p4'});assert.equal(room.game.stage,'last-guess');denied(await req(`${base(room)}/deals/q0/targetId`,{uid:'p4'}));const guess=await submit(room,'p4',{cardId:deal.targetId});assert.equal(ok(await req(`${base(room)}/deals/q0/targetId`,{uid:'p4'})),deal.targetId);room=await resolve(room,{p4:guess},{targetId:deal.targetId,moleSeat:'p4'});assert.equal(room.game.stage,'reveal');});
  await check('historical chameleon votes, targets and points cannot change on the next round',async()=>{const candidate=changePartyRoom(room,'p1',room.revision,'next');await rejectMutations(candidate,[g=>g.results.r1.votes.p1='p2',g=>g.results.r1.counts.p4--,g=>g.results.r1.moleSeat='p3',g=>g.results.r1.targetId=DECK[20],g=>g.results.r1.caught=false,g=>g.results.r1.points.p4++,g=>g.scores.p1++,g=>g.turnSeat='p1',g=>delete g.results]);room=ok(await write(candidate));});
  await check('an escaped mole can resolve after all votes while forged vote counts and scoring are rejected',async()=>{
    deal=await seedDeal(room);while(room.game.stage==='clues'){const actor=room.game.turnSeat,clue=await submit(room,actor,{word:'retro'});room=await resolve(room,{[actor]:clue});}
    const votes={};for(const actor of room.game.seats){votes[actor]=await submit(room,actor,{seat:actor==='p1'?'p2':'p1'});if(actor!=='p4')denied(await req(`${base(room)}/deals/q1/targetId`,{uid:'p4'}));}
    assert.equal(ok(await req(`${base(room)}/deals/q1/targetId`,{uid:'p4'})),deal.targetId);
    const candidate=changePartyRoom(room,'p1',room.revision,'party-resolve',{records:votes,secrets:{targetId:deal.targetId,moleSeat:'p4'}});
    await rejectMutations(candidate,[g=>g.results.r2.counts.p1++,g=>g.results.r2.suspectSeat='p4',g=>g.results.r2.points.p4=100,g=>g.results.r2.votes.p1='p4',g=>g.scores.p4++]);
    room=ok(await write(candidate));assert.equal(room.game.scores.p4,300);
  });
  await check('four-seat open auctions wait for every clockwise pass and complete all five-card teams',async()=>{
    room=await start('auction',4,CODES[4]);
    for(let round=0;room.status==='playing';round++){
      assert.ok(round<10);const index=room.game.roundIndex;
      const buyers=room.game.seats.filter(seat=>room.game.budgets[seat]>0&&(room.game.rosters?.[seat]?.length||0)<5);
      if(buyers.length>1){
        while(room.game.budgets[room.game.turnSeat]===0){const actor=room.game.turnSeat;room=ok(await write(changePartyRoom(room,actor,room.revision,'pass'),actor));}
        const bidder=room.game.turnSeat,bid=changePartyRoom(room,bidder,room.revision,'bid',{amount:20});
        await rejectMutations(bid,[g=>g.turnSeat=bidder,g=>g.passed[bidder]=true,g=>g.highestBid=21,g=>g.budgets[bidder]--,g=>delete g.actions],bidder);
        room=ok(await write(bid,bidder));
      }
      while(room.status==='playing'&&room.game.roundIndex===index){
        const actor=room.game.turnSeat,candidate=changePartyRoom(room,actor,room.revision,'pass');
        if(candidate.game.roundIndex!==index){const winner=candidate.game.lastAward.seat,mutations=[g=>g.results[`r${index+1}`].price=19,g=>g.results[`r${index+1}`].seat=actor,g=>g.actions[0].amount=19,g=>delete g.actions[0],g=>g.budgets[winner]++];if(candidate.status==='finished')mutations.push(g=>{[g.rosters.p2[1].id,g.rosters.p2[2].id]=[g.rosters.p2[2].id,g.rosters.p2[1].id];},g=>g.rosters.p2[1].id=g.deck[25],g=>g.rosters.p2.pop());await rejectMutations(candidate,mutations,actor);}
        room=ok(await write(candidate,actor));
        if(room.game.roundIndex===index)assert.equal(room.game.results?.[`r${index+1}`],undefined);
      }
    }
    assert.equal(Object.values(room.game.rosters).flat().length,20);assert.ok(Object.values(room.game.rosters).every(cards=>cards.length===5));assert.equal(Object.values(room.game.budgets).filter(budget=>budget===0).length,3);
  });
  await check('consolation reserves require eight or ten unique matching-category cards with immutable size and order',async()=>{
    const withInverse=g=>{g.completionIds=Object.fromEntries(g.completionDeck.flatMap((id,index)=>[[id,index]]));};
    for(const reserve of [COMPLETION,LEGACY_COMPLETION]){
    room=await start('auction',2,CODES[4],[
      g=>delete g.completionIds,
      g=>delete g.completionDeck,
      g=>{g.completionDeck.pop();withInverse(g);},
      g=>{g.completionDeck.push(900011);withInverse(g);},
      g=>{g.completionDeck[9]=LEGACY_COMPLETION[9];delete g.completionDeck[8];withInverse(g);},
      g=>{g.completionDeck[1]=g.completionDeck[0];withInverse(g);},
      g=>{g.completionDeck[1]=g.deck[0];withInverse(g);},
      g=>{g.completionDeck=g.completionDeck.map(id=>id+10);withInverse(g);},
      g=>g.completionIds[999999]=0,
    ],undefined,{completionDeck:reserve});
    const bid=changePartyRoom(room,'p2',room.revision,'bid',{amount:20});
    await rejectMutations(bid,[g=>{g.completionDeck.reverse();withInverse(g);},g=>{g.completionDeck=reserve.length===8?LEGACY_COMPLETION:COMPLETION;withInverse(g);},g=>{delete g.completionDeck;delete g.completionIds;}],'p2');
    room=ok(await write(bid,'p2'));
    }
    await start('sealed-auction',2,CODES[5],[g=>{g.completionDeck=COMPLETION;g.completionIds=Object.fromEntries(COMPLETION.map((id,index)=>[id,index]));}]);
  });
  await check('consolation open auctions fill exhausted two-to-four-player teams and safely cycle eight or ten reserves',async()=>{
    for(const reserve of [COMPLETION,LEGACY_COMPLETION])for(const count of [2,3,4]){
      room=await start('auction',count,CODES[4],[],undefined,{completionDeck:reserve});
      let guard=0;
      while(room.status==='playing'){
        assert.ok(++guard<200);assert.ok(!reserve.includes(room.game.currentCardId));
        const actor=room.game.turnSeat,winners=[...room.game.seats.slice(1),'p1'],target=winners[room.game.roundIndex],amount=room.game.roundIndex===count-2?18:20;
        const command=actor===target&&room.game.highestBid<amount?'bid':target&&room.game.bidderSeat===target&&room.game.highestBid<2&&room.game.budgets[actor]>=2?'bid':'pass';
        const payload=command==='bid'?{amount:actor===target?amount:2}:{};
        const candidate=changePartyRoom(room,actor,room.revision,command,payload);
        if(candidate.status==='finished'){
          const owner=candidate.game.seats.find(seat=>candidate.game.rosters[seat].some(card=>card.source==='completion'));
          const index=candidate.game.rosters[owner].findIndex(card=>card.source==='completion');
          await rejectMutations(candidate,[
            g=>g.rosters[owner][index].id=g.deck[20-1],
            g=>g.rosters[owner][index].id=reserve[1],
            g=>g.rosters[owner][index].price=1,
            g=>delete g.rosters[owner][index].source,
            g=>g.rosters[owner].pop(),
            g=>g.budgets[owner]=1,
          ],actor);
        }
        room=ok(await write(candidate,actor));
        room=decodePartyRoom(JSON.parse(JSON.stringify(encodePartyRoom(room))));
        assert.deepEqual(room.game.completionDeck,reserve);
      }
      let cursor=0;
      for(const seat of room.game.seats){
        assert.equal(room.game.budgets[seat],0);assert.equal(room.game.rosters[seat].length,5);
        assert.equal(new Set(room.game.rosters[seat].map(card=>card.id)).size,5);
        for(const card of room.game.rosters[seat].filter(card=>card.source==='completion'))assert.equal(card.id,reserve[cursor++%reserve.length]);
      }
      assert.equal(cursor,count*4-2);
    }
  });
  await check('circular rematch and approved-next starters cover every two-to-four-player seat and reject skips',async()=>{
    for(const action of ['rematch','ready-next'])for(const count of [2,3,4]){
      room=await start('auction',count,CODES[4]);
      for(let index=0;index<count;index++){
        assert.equal(room.starterSeat,`p${index+1}`);
        let guard=0;
        while(room.status==='playing'){
          assert.ok(++guard<100);
          room=changePartyRoom(room,room.game.turnSeat,room.revision,'pass');
        }
        // Seed a canonical completed game locally: this check isolates starter
        // validation, while the public bid/pass ledger is exercised above.
        ok(await req(`rooms/${room.code}`,{method:'PUT',admin:true,value:encodePartyRoom(room)}));
        let payload={deck:DECK};
        if(action==='ready-next'){
          room=ok(await write(changePartyRoom(room,'p1',room.revision,'propose-next',{datasetId:'futbol',mode:'auction'})));
          payload={...payload,id:room.nextGame.id,ready:true};
          for(const seat of room.game.seats.slice(0,-1))room=ok(await write(changePartyRoom(room,seat,room.revision,action,payload),seat));
        }
        const actor=`p${count}`,candidate=changePartyRoom(room,actor,room.revision,action,payload);
        assert.equal(candidate.starterSeat,`p${(index+1)%count+1}`);
        assert.equal(candidate.game.bidderSeat,candidate.starterSeat);
        for(const wrong of candidate.game.seats.filter(seat=>seat!==candidate.starterSeat)){
          const forged=encodePartyRoom({...candidate,starterSeat:wrong,game:createPartyGame('auction',{seats:candidate.game.seats,deck:candidate.game.deck,starterSeat:wrong})});
          denied(await put(`rooms/${candidate.code}`,forged,actor));
        }
        room=ok(await write(candidate,actor));
      }
      assert.equal(room.starterSeat,'p1');assert.equal(room.round,count+1);
    }
  });
  await check('sealed winners, burns and payments are derived from all four actual bids',async()=>{
    room=await start('sealed-auction',4,CODES[5]);
    for(let index=0;index<4;index++){
      const bidder=room.game.seats[index],batch={};for(const seat of room.game.seats)batch[seat]=await submit(room,seat,{amount:seat===bidder?20:0});
      const candidate=changePartyRoom(room,'p1',room.revision,'party-resolve',{records:batch});
      const mutations=[g=>g.budgets[bidder]++,g=>g.results[`r${index+1}`].bids[bidder]=19,g=>g.results[`r${index+1}`].highestBid=19,g=>g.results[`r${index+1}`].burned=true,g=>g.results[`r${index+1}`].winnerSeat=room.game.seats[(index+1)%4],g=>g.lastAward.price=19,g=>g.lastAward.extra='evil',g=>delete g.lastAward.sequence,g=>g.rosters[bidder][0].id=DECK[20],g=>g.rosters[bidder][0].price=19];
      if(candidate.status==='finished')mutations.push(g=>{[g.rosters.p1[1].id,g.rosters.p1[2].id]=[g.rosters.p1[2].id,g.rosters.p1[1].id];},g=>g.rosters.p1[1].id=g.deck[25],g=>g.rosters.p1.pop(),g=>{g.phase='playing';g.stage='reveal';g.roundIndex--;g.deckIndex--;g.currentCardId=g.deck[g.deckIndex];g.visibleCards={[g.currentCardId]:0};g.resultCount=4;});
      await rejectMutations(candidate,mutations);
      room=ok(await write(candidate));if(room.status==='playing')room=ok(await write(changePartyRoom(room,'p1',room.revision,'next')));
    }
    assert.equal(room.status,'finished');assert.ok(Object.values(room.game.rosters).every(cards=>cards.length===5));assert.equal(new Set(Object.values(room.game.rosters).flat().map(card=>card.id)).size,20);
  });
  await check('a full sealed roster can only lock zero even while it has budget left',async()=>{
    room=await start('sealed-auction',4,CODES[6]);
    for(let index=0;index<5;index++){const batch={};for(const seat of room.game.seats)batch[seat]=await submit(room,seat,{amount:seat==='p1'?1:0});room=await resolve(room,batch);room=ok(await write(changePartyRoom(room,'p1',room.revision,'next')));}
    assert.equal(room.game.budgets.p1,15);assert.equal(room.game.rosters.p1.length,5);const record=partySubmission(room,'p1',{amount:0});denied(await put(`${path(room)}/p1`,{...record,amount:1}));ok(await put(`${path(room)}/p1`,record));
  });
  await check('thirty tied sealed rounds burn every card without reusing burnt cards to fill teams',async()=>{
    room=await start('sealed-auction',4,CODES[7]);
    for(let index=0;index<30;index++){const batch={};for(const seat of room.game.seats)batch[seat]=await submit(room,seat,{amount:0});if(index===29){const candidate=changePartyRoom(room,'p1',room.revision,'party-resolve',{records:batch});await rejectMutations(candidate,[(g,r)=>{r.status='playing';g.phase='playing';g.stage='reveal';g.roundIndex=29;g.deckIndex=29;g.currentCardId=g.deck[29];g.visibleCards={[g.currentCardId]:0};},g=>g.rosters={p1:[{id:g.deck[0],price:0,source:'completion'}]}]);}room=await resolve(room,batch);if(room.status==='playing')room=ok(await write(changePartyRoom(room,'p1',room.revision,'next')));}
    assert.equal(room.status,'finished');assert.equal(room.game.roundIndex,30);assert.ok(room.game.seats.every(seat=>!room.game.rosters?.[seat]?.length));assert.ok(Object.values(room.game.results).every(result=>result.burned));
  });
  await check('zero-price sealed cards remain immutable and late guests cannot add a roster to the old game',async()=>{
    room=await start('sealed-auction',2,CODES[6]);
    for(let index=0;index<10;index++){
      const records={p1:await submit(room,'p1',{amount:index<5?1:0}),p2:await submit(room,'p2',{amount:0})};
      room=await resolve(room,records);
      if(room.status==='playing'){const candidate=changePartyRoom(room,'p1',room.revision,'next');if(index===5)await rejectMutations(candidate,[g=>delete g.rosters.p2,g=>delete g.lastAward]);const response=await write(candidate);assert.equal(response.status,200,`zero-price next after round ${index}: ${JSON.stringify(response.value)}`);room=ok(response);}
    }
    assert.equal(room.status,'finished');assert.equal(room.game.budgets.p2,20);assert.equal(room.game.rosters.p2.length,5);
    room=ok(await write(changePartyRoom(room,'p1',room.revision,'propose-next',{mode:'auction',datasetId:'futbol'})));
    const candidate=joinPartyRoom(room,'p3','Oyuncu 3');
    await rejectMutations(candidate,[g=>g.rosters.p3=[{id:g.deck[10],price:0,source:'completion'}],g=>delete g.rosters.p2,g=>delete g.lastAward],'p3');
    room=ok(await write(candidate,'p3'));assert.equal(room.game.rosters.p3,undefined);
  });
  await check('late P3 and P4 joins preserve finished duo results and reset every pending approval',async()=>{
    room=await start('detective',2,CODES[2]);
    for(let index=0;index<6;index++){deal=await seedDeal(room);const clueSeat=room.game.clueGiverSeat,guessSeat=room.game.guesserSeat,clue=await submit(room,clueSeat,{word:'efsane'});room=await resolve(room,{[clueSeat]:clue});const guess=await submit(room,guessSeat,{cardId:deal.targetId});room=await resolve(room,{[guessSeat]:guess},{targetId:deal.targetId});if(room.status==='playing')room=ok(await write(changePartyRoom(room,'p1',room.revision,'next')));}
    room=ok(await write(changePartyRoom(room,'p1',room.revision,'propose-next',{mode:'auction',datasetId:'futbol'})));
    room=ok(await write(changePartyRoom(room,'p1',room.revision,'ready-next',{id:room.nextGame.id,ready:true,deck:DECK})));
    const joined=joinPartyRoom(room,'p3','Oyuncu 3');
    await rejectMutations(joined,[(_g,r)=>r.nextGame.ready.p1=true,(_g,r)=>r.nextGame.ready.p3=true,(_g,r)=>r.nextGame.mode='telepathy'],'p3');
    room=ok(await write(joined,'p3'));assert.equal(room.nextGame.ready.p1,false);assert.equal(room.game.seats.length,2);
    room=ok(await write(joinPartyRoom(room,'p4','Oyuncu 4'),'p4'));assert.ok(Object.values(room.nextGame.ready).every(ready=>ready===false));
    for(const actor of ['p1','p2','p3','p4'])room=ok(await write(changePartyRoom(room,actor,room.revision,'ready-next',{id:room.nextGame.id,ready:true,deck:DECK}),actor));
    assert.equal(room.game.seats.length,4);assert.equal(room.game.deck.length,30);assert.equal(room.round,2);assert.equal(room.starterSeat,'p2');
  });
  console.log(`Party Firebase integration: ${passed} checks passed.`);
}finally{await clean();}
