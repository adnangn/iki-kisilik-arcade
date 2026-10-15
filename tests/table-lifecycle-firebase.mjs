/** Host table reset security checks; isolated local demo database only. */
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createPartyRoom,joinPartyRoom,changePartyRoom,encodePartyRoom} from '../js/party-room-state.js';
import {partySubmission} from '../js/party-online.js';
import {playableCollections} from '../js/consolation.js';
const origin=process.env.DB_EMULATOR_URL||'http://127.0.0.1:9000',project='demo-iki-kisilik',code='958001';
assert.match(origin,/^http:\/\/(127\.0\.0\.1|localhost):[0-9]+$/);
const pool=playableCollections(JSON.parse(await readFile(new URL('../veri.json',import.meta.url),'utf8'))).futbol;
const deck=pool.map(card=>card.id),stamp=Date.now(),encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
function token(uid){const now=Math.floor(Date.now()/1000);return `${encode({alg:'none',typ:'JWT'})}.${encode({iss:`https://securetoken.google.com/${project}`,aud:project,sub:uid,uid,user_id:uid,iat:now,exp:now+3600,auth_time:now,firebase:{identities:{},sign_in_provider:'anonymous'}})}.`;}
async function request(path,{uid='u1',admin=false,method='GET',value}={}){
  const url=new URL(`${path}.json`,origin+'/');url.searchParams.set('ns',project);if(!admin)url.searchParams.set('auth',token(uid));
  const response=await fetch(url,{method,headers:{...(admin?{Authorization:'Bearer owner'}:{}),...(value!==undefined?{'Content-Type':'application/json'}:{})},...(value!==undefined?{body:JSON.stringify(value)}:{}),signal:AbortSignal.timeout(120000)});
  return {status:response.status,value:await response.json()};
}
const put=(path,value,uid)=>request(path,{method:'PUT',value,uid});
const ok=result=>{assert.equal(result.status,200,JSON.stringify(result.value).slice(0,800));return result.value;};
const denied=result=>assert.ok([401,403].includes(result.status),JSON.stringify(result).slice(0,800));
const write=(room,uid='u1')=>put(`rooms/${code}`,encodePartyRoom(room),uid);
async function clean(){for(const branch of ['rooms','privateGames','presence','reactions','cleanupIndex'])ok(await request(`${branch}/${code}`,{method:'DELETE',admin:true}));}
function table(mode='auction',count=4){let value=createPartyRoom({code,uid:'u1',name:'Ada',createdAt:stamp,datasetId:'futbol',mode});for(let index=2;index<=count;index++)value=joinPartyRoom(value,`u${index}`,`Oyuncu ${index}`);return value;}
async function seed(value){await clean();ok(await request(`cleanupIndex/${code}`,{method:'PUT',admin:true,value:{instance:stamp,lastActivityAt:stamp,state:'reserved',reserverUid:'u1'}}));ok(await request(`rooms/${code}`,{method:'PUT',admin:true,value:encodePartyRoom(value)}));return value;}
const reset=(value,removeSeats=['p3','p4'],config={datasetId:'tatli',mode:'auction'})=>changePartyRoom(value,'u1',value.revision,'reset-table',{removeSeats,...config});
let passed=0;
async function check(label,body){await body();passed++;console.log('PASS',label);}
try{
  await check('reset rules compile under source limit',async()=>{const source=await readFile(process.env.DB_RULES_FILE||new URL('../firebase.rules.json',import.meta.url),'utf8');assert.ok(Buffer.byteLength(source)<=262144);ok(await request('.settings/rules',{method:'PUT',admin:true,value:JSON.parse(source)}));});
  await check('only the owner can reset and every retained identity and order is protected',async()=>{
    const playing=await seed(changePartyRoom(table(),'u1',3,'start',{deck})),candidate=reset(playing,['p2','p3']);
    denied(await write(candidate,'u2'));denied(await write(candidate,'stranger'));
    const mutations=[r=>r.players.p1.uid='u2',r=>r.players.p1.name='Replacement',r=>r.players.p2.uid='new-user',r=>r.players.p2.name='Replacement',r=>r.players.p1=playing.players.p2,r=>{r.players.p2=playing.players.p4;r.players.p3=playing.players.p3;},r=>r.ownerUid='u2',r=>r.createdAt++,r=>r.code='123456',r=>r.round--,r=>r.revision--,r=>r.starterSeat='p2',r=>r.status='playing',r=>r.game=playing.game,r=>r.nextGame={id:r.revision,datasetId:'futbol',mode:'auction',proposedBySeat:'p1',ready:{p1:false,p2:false}},r=>r.lastAction.seat='p2',r=>r.evil=true];
    for(const mutate of mutations){const forged=structuredClone(candidate);mutate(forged);denied(await write(forged));}
    ok(await write(candidate));assert.deepEqual(ok(await request(`rooms/${code}/players`)),candidate.players);
  });
  await check('all eight ordered survivor subsets are accepted and can invite new occupants',async()=>{
    for(let mask=0;mask<8;mask++){
      const source=await seed(table()),removed=['p2','p3','p4'].filter((_seat,index)=>mask&(1<<index));
      const candidate=reset(source,removed);ok(await write(candidate));
      if(removed.length){const joined=joinPartyRoom(candidate,'fresh','Yeni oyuncu');ok(await write(joined,'fresh'));}
    }
  });
  await check('reset cannot move too many members into a two-player mode',async()=>{
    const source=await seed(table()),candidate=reset(source,[],{datasetId:'futbol',mode:'telepathy'});
    candidate.mode='detective';denied(await write(candidate));
    ok(await write(reset(source,['p3','p4'],{datasetId:'futbol',mode:'detective'})));
  });
  await check('the new waiting round may be below minimum but cannot start too early',async()=>{
    const source=await seed(table()),candidate=reset(source,['p2','p3','p4'],{datasetId:'tatli',mode:'chameleon'});
    ok(await write(candidate));const forged=structuredClone(candidate);forged.revision++;forged.status='playing';forged.lastAction={kind:'start',seat:'p1'};denied(await write(forged));
  });
  await check('removed identities and old seat holders lose private access and cannot replay locks after reseating',async()=>{
    const source=await seed(changePartyRoom(table('telepathy'),'u1',3,'start',{deck}));
    const path=`privateGames/${code}/r1/party/submissions/q0/choosing`;
    const lock=partySubmission(source,'u4',{cardId:source.game.deck[0]});ok(await put(`${path}/p4`,lock,'u4'));ok(await request(`${path}/p4`,{uid:'u4'}));
    const candidate=reset(source,['p2','p3'],{datasetId:'futbol',mode:'telepathy'});ok(await write(candidate));
    denied(await request(`${path}/p4`,{uid:'u4'}));denied(await request(`${path}/p4`,{uid:'u2'}));
    denied(await put(`${path}/p4`,lock,'u4'));
    const started=changePartyRoom(candidate,'u1',candidate.revision,'start',{deck});ok(await write(started));
    const current=`privateGames/${code}/r2/party/submissions/q0/choosing`;
    denied(await put(`${current}/p2`,{...lock,instance:stamp},'u2'));
    ok(await put(`${current}/p2`,partySubmission(started,'u4',{cardId:started.game.deck[0]}),'u4'));
  });
  await check('removed players can clean only their own presence and cannot block expired-room cleanup',async()=>{
    const source=await seed(table()),ownPath=`presence/${code}/u2/tab-two`,otherPath=`presence/${code}/u4/tab-four`;
    ok(await put(ownPath,{connectedAt:stamp},'u2'));ok(await put(otherPath,{connectedAt:stamp},'u4'));
    ok(await write(reset(source,['p2','p3'])));
    assert.deepEqual(ok(await request(ownPath,{uid:'u2'})),{connectedAt:stamp});
    denied(await request(`presence/${code}`,{uid:'u2'}));denied(await request(otherPath,{uid:'u2'}));
    denied(await put(ownPath,{connectedAt:stamp+1},'u2'));denied(await put(otherPath,null,'u2'));
    ok(await put(ownPath,null,'u2'));assert.equal(ok(await request(ownPath,{uid:'u2'})),null);
    denied(await put(ownPath,{connectedAt:stamp},'u2'));denied(await put(`presence/${code}/u2/new-tab`,{connectedAt:stamp},'u2'));
    const expired={instance:stamp,lastActivityAt:stamp-8*24*60*60*1000,state:'active'};
    ok(await request(`cleanupIndex/${code}`,{method:'PUT',admin:true,value:expired}));
    const claim={...expired,state:'deleting'};
    denied(await put(`cleanupIndex/${code}`,claim,'stranger'));
    ok(await put(otherPath,null,'u4'));
    ok(await put(`cleanupIndex/${code}`,claim,'stranger'));
  });
  await check('reset transitions every active version-two mode to another configured waiting mode',async()=>{
    const largest=Object.values(Object.groupBy(pool,card=>card.etiket)).sort((a,b)=>b.length-a.length)[0];
    const triplets=Array.from({length:11},(_,round)=>({etiket:largest[0].etiket,cards:Array.from({length:3},(_,index)=>largest[(round*3+index)%largest.length].id)}));
    for(const mode of ['auction','sealed-auction','simultaneous-ranking','telepathy','detective','chameleon','blind-ranking','bracket','team-draft','frequency','double-ranking']){
      const count=mode==='chameleon'?3:2,source=table(mode,count),playing=changePartyRoom(source,'u1',source.revision,'start',{deck,triplets});
      await seed(playing);const result=await write(reset(playing,[],{datasetId:'futbol',mode:count===3?'telepathy':'bracket',...(count===2?{bracketSize:32}:{})}));
      assert.equal(result.status,200,`${mode} reset: ${JSON.stringify(result.value)}`);
    }
  });
  await check('finished and repeatedly waiting resets advance the private namespace',async()=>{
    let source=table('auction',2);source.status='finished';source=await seed(source);
    const next=reset(source,[]);ok(await write(next));const again=reset(next,[]);ok(await write(again));assert.equal(again.round,3);
  });
  console.log(`Table lifecycle Firebase integration: ${passed} checks passed.`);
}finally{await clean();}
