/** Only local demo RTDB. These checks verify real Security Rules, not a mock. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createCooperative, revealFrequency, advanceFrequency, revealDoubleRanking, placePrivateRank, createPrivateRank } from '../js/cooperative.js';

const ORIGIN = 'http://127.0.0.1:9000';
const PROJECT = 'demo-iki-kisilik';
const CODES = ['919001', '919002', '919003'];
const CARDS = JSON.parse(await readFile(new URL('../veri.json', import.meta.url), 'utf8')).futbol.slice(0, 20).map(card => card.id);
let passed = 0;
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
function token(uid) {
  const now = Math.floor(Date.now() / 1000);
  return `${encode({alg:'none',typ:'JWT'})}.${encode({iss:`https://securetoken.google.com/${PROJECT}`,aud:PROJECT,sub:uid,uid,user_id:uid,
    iat:now,exp:now+3600,auth_time:now,firebase:{identities:{},sign_in_provider:'anonymous'}})}.`;
}
async function request(path, {uid,admin=false,value,method='GET',headers={}} = {}) {
  const url = new URL(`${path}.json`,`${ORIGIN}/`);
  assert.equal(url.origin, ORIGIN);
  url.searchParams.set('ns',PROJECT);
  if(uid&&!admin) url.searchParams.set('auth',token(uid));
  const response = await fetch(url,{method,headers:{...headers,...(admin?{Authorization:'Bearer owner'}:{}),...(value!==undefined?{'Content-Type':'application/json'}:{})},
    ...(value!==undefined?{body:JSON.stringify(value)}:{}),signal:AbortSignal.timeout(20000)});
  return {status:response.status,body:await response.json(),etag:response.headers.get('etag')};
}
const ok = response => { assert.equal(response.status,200,JSON.stringify(response.body).slice(0,500)); return response.body; };
const denied = response => assert.ok([401,403].includes(response.status),JSON.stringify(response));
async function check(label, action) { await action(); passed++; console.log(`PASS ${label}`); }
const put = (path,value,uid,headers={}) => request(path,{method:'PUT',value,uid,headers});
const readRoom = (code,uid='p1',headers={}) => request(`rooms/${code}`,{uid,headers});
const writeRoom = async (room,uid='p1',headers={}) => {
  if (room.createdAt?.['.sv']==='timestamp') {
    const current=await request(`rooms/${room.code}`,{admin:true});
    if(!current.body) await request(`cleanupIndex/${room.code}`,{method:'DELETE',admin:true});
    const reservation=await put(`cleanupIndex/${room.code}`,{instance:{'.sv':'timestamp'},lastActivityAt:{'.sv':'timestamp'},state:'reserved',reserverUid:uid},uid);
    if(reservation.status===200) room={...room,createdAt:reservation.body.instance};
  }
  return put(`rooms/${room.code}`,room,uid,headers);
};
const base = (code,mode) => ({version:1,code,ownerUid:'p1',createdAt:{'.sv':'timestamp'},datasetId:'futbol',mode,status:'waiting',round:1,starterSeat:'p1',revision:0,players:{p1:{uid:'p1',name:'Alice'}}});
const privatePath = room => `privateGames/${room.code}/r${room.round}/${room.mode==='frequency'?`frequency/q${room.game.roundIndex}`:'ranking'}`;
function command(room,kind,game,uid='p1') {
  return {...room,game,status:game.phase==='finished'?'finished':'playing',revision:room.revision+1,lastAction:{kind,seat:uid}};
}
async function start(code,mode) {
  let room=ok(await writeRoom(base(code,mode)));
  room=ok(await writeRoom({...room,players:{...room.players,p2:{uid:'p2',name:'Bob'}},revision:1},'p2'));
  return ok(await writeRoom(command(room,'start',createCooperative(mode,CARDS))));
}
async function cleanup() {
  for(const code of CODES) for(const root of ['rooms','privateGames','presence','reactions','cleanupIndex']) {
    ok(await request(`${root}/${code}`,{method:'DELETE',admin:true}));
  }
}

try {
  await check('upload cooperative rules to local demo emulator',async()=>ok(await request('.settings/rules',{method:'PUT',admin:true,value:JSON.parse(await readFile(new URL('../firebase.rules.json',import.meta.url),'utf8'))})));
  await cleanup();
  let frequency;
  await check('two active players create and start Frekans',async()=>{frequency=await start(CODES[0],'frequency');});
  await check('a single player cannot start Frekans',async()=>{
    const empty=ok(await writeRoom(base(CODES[1],'frequency')));
    denied(await writeRoom(command(empty,'start',createCooperative('frequency',CARDS))));
    ok(await request(`rooms/${CODES[1]}`,{method:'DELETE',admin:true}));
  });
  await check('cooperative decks reject duplicates, sparse extras, and wrong lengths',async()=>{
    let empty=ok(await writeRoom(base(CODES[2],'double-ranking')));
    empty=ok(await writeRoom({...empty,players:{...empty.players,p2:{uid:'p2',name:'Bob'}},revision:1},'p2'));
    const game=createCooperative('double-ranking',CARDS);
    const duplicate=structuredClone(game);duplicate.deck[1]=duplicate.deck[0];denied(await writeRoom(command(empty,'start',duplicate)));
    const extra=structuredClone(game);extra.deck={...extra.deck,9:CARDS[9]};denied(await writeRoom(command(empty,'start',extra)));
    const short=structuredClone(game);short.deck.pop();denied(await writeRoom(command(empty,'start',short)));
  });
  await check('private roots and all opponent records are denied before a choice',async()=>{
    for(const uid of ['p1','p2','stranger']) denied(await request('privateGames',{uid}));
    ok(await request(`${privatePath(frequency)}/p1`,{uid:'p1'}));
    denied(await request(`${privatePath(frequency)}/p1`,{uid:'p2'}));
    denied(await request(`${privatePath(frequency)}/p1`,{uid:'stranger'}));
    assert.equal(ok(await request(`${privatePath(frequency)}/p1/locked`,{uid:'p2'})),null);
  });
  await check('a player cannot submit the other seat, a wrong card, or a future pair',async()=>{
    const p=privatePath(frequency);
    denied(await put(`${p}/p2`,{cardId:CARDS[0],locked:true},'p1'));
    denied(await put(`${p}/p1`,{cardId:CARDS[4],locked:true},'p1'));
    denied(await put(`privateGames/${frequency.code}/r1/frequency/q1/p1`,{cardId:CARDS[2],locked:true},'p1'));
    denied(await put(`${p}/p1`,{cardId:CARDS[0],locked:true,extra:1},'p1'));
  });
  await check('the first choice stays private while its lock is visible',async()=>{
    const p=privatePath(frequency);
    ok(await put(`${p}/p1`,{cardId:CARDS[0],locked:true},'p1'));
    assert.equal(ok(await request(`${p}/p1`,{uid:'p1'})).cardId,CARDS[0]);
    assert.equal(ok(await request(`${p}/p1/locked`,{uid:'p2'})),true);
    denied(await request(`${p}/p1/cardId`,{uid:'p2'}));
    denied(await readRoom(frequency.code,'stranger'));
    assert.equal(ok(await readRoom(frequency.code,'p2')).game.results,undefined);
  });
  await check('locked choices cannot be overwritten, erased, or resolved early',async()=>{
    const p=privatePath(frequency);
    denied(await put(`${p}/p1`,{cardId:CARDS[1],locked:true},'p1'));
    denied(await put(`${p}/p1`,null,'p1'));
    denied(await writeRoom(command(frequency,'frequency-reveal',revealFrequency(frequency.game,{p1:CARDS[0],p2:CARDS[0]}))));
  });
  await check('both locks reveal choices to members, never to a third player',async()=>{
    const p=privatePath(frequency);
    ok(await put(`${p}/p2`,{cardId:CARDS[0],locked:true},'p2'));
    for(const uid of ['p1','p2']) for(const seat of ['p1','p2']) assert.equal(ok(await request(`${p}/${seat}`,{uid})).cardId,CARDS[0]);
    denied(await request(`${p}/p1`,{uid:'stranger'}));
    denied(await request(`${p}/p1/locked`,{uid:'stranger'}));
  });
  await check('forged choices, bonus, score, and unapproved game fields are rejected',async()=>{
    const next=command(frequency,'frequency-reveal',revealFrequency(frequency.game,{p1:CARDS[0],p2:CARDS[0]}));
    const choice=structuredClone(next);choice.game.results.r1.p2=CARDS[1];denied(await writeRoom(choice));
    const score=structuredClone(next);score.game.score=1500;denied(await writeRoom(score));
    const bonus=structuredClone(next);bonus.game.results.r1.bonus=250;denied(await writeRoom(bonus));
    const field=structuredClone(next);field.game.highestBid=2;denied(await writeRoom(field));
  });
  await check('simultaneous resolutions award the shared score exactly once',async()=>{
    const current=await readRoom(frequency.code,'p1',{'X-Firebase-ETag':'true'});
    // REST ETag/If-Match models the SDK transaction compare-and-retry step.
    const next=command(frequency,'frequency-reveal',revealFrequency(frequency.game,{p1:CARDS[0],p2:CARDS[0]}));
    const results=await Promise.all([writeRoom(next,'p1',{'if-match':current.etag}),writeRoom({...next,lastAction:{kind:'frequency-reveal',seat:'p2'}},'p2',{'if-match':current.etag})]);
    assert.deepEqual(results.map(r=>r.status).sort(),[200,412]);
    frequency=ok(await readRoom(frequency.code));assert.equal(frequency.game.score,100);
    denied(await writeRoom({...next,revision:frequency.revision+1}));
  });
  await check('next pair preserves history and refuses stale private selections',async()=>{
    frequency=ok(await writeRoom(command(frequency,'frequency-next',advanceFrequency(frequency.game))));
    assert.equal(frequency.game.roundIndex,1);
    denied(await put(`privateGames/${frequency.code}/r1/frequency/q0/p1`,{cardId:CARDS[0],locked:true},'p1'));
    const bad=command(frequency,'frequency-reveal',revealFrequency(frequency.game,{p1:CARDS[2],p2:CARDS[2]}));delete bad.game.results.r1;
    denied(await writeRoom(bad));
  });
  await check('all ten pairs finish with two five-match bonuses and preserved choices',async()=>{
    while(frequency.status==='playing') {
      const i=frequency.game.roundIndex,p=privatePath(frequency),id=CARDS[i*2];
      for(const seat of ['p1','p2']) ok(await put(`${p}/${seat}`,{cardId:id,locked:true},seat));
      frequency=ok(await writeRoom(command(frequency,'frequency-reveal',revealFrequency(frequency.game,{p1:id,p2:id}))));
      if(frequency.status==='playing')frequency=ok(await writeRoom(command(frequency,'frequency-next',advanceFrequency(frequency.game))));
    }
    assert.equal(frequency.game.score,1500);assert.equal(frequency.game.matches,10);assert.equal(frequency.game.bestStreak,10);
    assert.equal(frequency.game.results.r5.bonus,250);assert.equal(frequency.game.results.r10.bonus,250);
  });
  await check('Frekans rematch retains code and rejects previous-round writes',async()=>{
    frequency=ok(await writeRoom({...command(frequency,'rematch',createCooperative('frequency',CARDS)),round:2,starterSeat:'p2'}));
    assert.equal(frequency.code,CODES[0]);assert.equal(frequency.game.score,0);
    denied(await put(`privateGames/${frequency.code}/r1/frequency/q0/p1`,{cardId:CARDS[0],locked:true},'p1'));
    assert.equal(ok(await request(`${privatePath(frequency)}/p1`,{uid:'p1'})),null);
    denied(await request(`${privatePath(frequency)}/p2`,{uid:'p1'}));
  });
  await check('different choices reset the current streak while retaining the best streak',async()=>{
    for(let index=0;index<2;index++) {
      const p=privatePath(frequency),choices={p1:CARDS[index*2],p2:CARDS[index*2+(index===1?1:0)]};
      for(const seat of ['p1','p2'])ok(await put(`${p}/${seat}`,{cardId:choices[seat],locked:true},seat));
      frequency=ok(await writeRoom(command(frequency,'frequency-reveal',revealFrequency(frequency.game,choices))));
      if(index===0)frequency=ok(await writeRoom(command(frequency,'frequency-next',advanceFrequency(frequency.game))));
    }
    assert.equal(frequency.game.score,100);assert.equal(frequency.game.streak,0);assert.equal(frequency.game.bestStreak,1);
    assert.equal(frequency.game.results.r2.match,false);assert.equal(frequency.game.results.r2.points,0);
  });

  let ranking;
  await check('two active players create and start Çifte Sıralama',async()=>{ranking=await start(CODES[1],'double-ranking');});
  let one=createPrivateRank(),two=createPrivateRank();
  await check('only the next card can enter one new private ranking slot',async()=>{
    const p=privatePath(ranking);
    denied(await put(`${p}/p1`,{count:1,slots:{s1:CARDS[1]}},'p1'));
    denied(await put(`${p}/p1`,{count:2,slots:{s1:CARDS[0],s2:CARDS[1]}},'p1'));
    denied(await put(`${p}/p2`,{count:1,slots:{s1:CARDS[0]}},'p1'));
    denied(await put(`${p}/p1`,{count:1,slots:{s9:CARDS[0]}},'p1'));
    one=placePrivateRank(ranking.game.deck,one,1);ok(await put(`${p}/p1`,one,'p1'));
  });
  await check('ranking progress is visible while slots remain private',async()=>{
    const p=privatePath(ranking);
    assert.equal(ok(await request(`${p}/p1/count`,{uid:'p2'})),1);
    denied(await request(`${p}/p1/slots`,{uid:'p2'}));
    denied(await request(`${p}/p1/count`,{uid:'stranger'}));
    assert.deepEqual(ok(await request(`${p}/p1`,{uid:'p1'})),one);
  });
  await check('private ranking slots cannot be changed, removed, duplicated, or replayed',async()=>{
    const p=privatePath(ranking);
    denied(await put(`${p}/p1`,{count:2,slots:{s1:CARDS[1],s2:CARDS[0]}},'p1'));
    denied(await put(`${p}/p1`,{count:2,slots:{s2:CARDS[1]}},'p1'));
    denied(await put(`${p}/p1`,{count:2,slots:{s1:CARDS[0],s2:CARDS[0]}},'p1'));
    denied(await put(`${p}/p1`,one,'p1'));
    denied(await put(`${p}/p1`,null,'p1'));
  });
  await check('a finished player remains hidden while the other is still ranking',async()=>{
    const p=privatePath(ranking);
    for(let i=2;i<=8;i++){one=placePrivateRank(ranking.game.deck,one,i);ok(await put(`${p}/p1`,one,'p1'));}
    assert.equal(ok(await request(`${p}/p1/count`,{uid:'p2'})),8);
    denied(await request(`${p}/p1`,{uid:'p2'}));
    denied(await writeRoom(command(ranking,'double-reveal',revealDoubleRanking(ranking.game,{p1:one.slots,p2:one.slots}))));
  });
  await check('both complete rankings unlock and agree on the exact result',async()=>{
    const p=privatePath(ranking);
    for(let i=1;i<=8;i++){two=placePrivateRank(ranking.game.deck,two,9-i);ok(await put(`${p}/p2`,two,'p2'));}
    assert.deepEqual(ok(await request(`${p}/p1`,{uid:'p2'})),one);
    assert.deepEqual(ok(await request(`${p}/p2`,{uid:'p1'})),two);
    denied(await request(`${p}/p1`,{uid:'stranger'}));
  });
  await check('forged rankings, compatibility, difference ordering, and distance are rejected',async()=>{
    const next=command(ranking,'double-reveal',revealDoubleRanking(ranking.game,{p1:one.slots,p2:two.slots}));
    const slots=structuredClone(next);[slots.game.rankings.p2.s1,slots.game.rankings.p2.s2]=[slots.game.rankings.p2.s2,slots.game.rankings.p2.s1];denied(await writeRoom(slots));
    const compatibility=structuredClone(next);compatibility.game.result.compatibility=100;denied(await writeRoom(compatibility));
    const distance=structuredClone(next);distance.game.result.distance=0;denied(await writeRoom(distance));
    const order=structuredClone(next);order.game.result.differences.reverse();denied(await writeRoom(order));
    ranking=ok(await writeRoom(next));assert.equal(ranking.game.result.compatibility,0);assert.equal(ranking.game.result.distance,32);
  });
  await check('ranking rematch isolates all previous choices and prohibits stale writes',async()=>{
    ranking=ok(await writeRoom({...command(ranking,'rematch',createCooperative('double-ranking',CARDS)),round:2,starterSeat:'p2'}));
    assert.equal(ranking.code,CODES[1]);
    denied(await put(`privateGames/${ranking.code}/r1/ranking/p1`,one,'p1'));
    assert.equal(ok(await request(`${privatePath(ranking)}/p1`,{uid:'p1'})),null);
    denied(await request(`${privatePath(ranking)}/p2`,{uid:'p1'}));
  });
  await check('adjacent swaps produce 94 percent compatibility and six exact matches',async()=>{
    const p=privatePath(ranking);one=createPrivateRank();two=createPrivateRank();
    for(let i=1;i<=8;i++) {
      one=placePrivateRank(ranking.game.deck,one,i);
      two=placePrivateRank(ranking.game.deck,two,i===1?2:i===2?1:i);
      ok(await put(`${p}/p1`,one,'p1'));ok(await put(`${p}/p2`,two,'p2'));
    }
    ranking=ok(await writeRoom(command(ranking,'double-reveal',revealDoubleRanking(ranking.game,{p1:one.slots,p2:two.slots}))));
    assert.equal(ranking.game.result.compatibility,94);assert.equal(ranking.game.result.distance,2);assert.equal(ranking.game.result.exactMatches,6);
  });
  console.log(`\n${passed} cooperative Firebase checks passed.`);
} finally { await cleanup(); }
