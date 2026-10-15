import test from 'node:test';
import assert from 'node:assert/strict';
import {createPartyGame,partyCards} from '../js/party-games.js';
import {createPartyOnline,partyPrivateContext,partySubmission} from '../js/party-online.js';

function room(mode='simultaneous-ranking',count=4){
  const seats=Array.from({length:count},(_,i)=>`p${i+1}`);
  return{version:2,code:'957099',ownerUid:'p1',createdAt:123,round:1,status:'playing',mode,
    players:Object.fromEntries(seats.map(seat=>[seat,{uid:seat,name:seat}])),
    game:createPartyGame(mode,{seats,deck:Array.from({length:50},(_,i)=>i+1),starterSeat:'p1'})};
}
function fake(uid='p1'){
  const listeners=[],gets=[],transactions=[],values=new Map(),stops=new Set();let online=true;
  const snapshot=value=>({val:()=>value??null,exists:()=>value!=null});
  const service=createPartyOnline({uid,db:{},ref:(_db,path)=>path,stops,
    assertOnline:()=>{if(!online)throw new Error('closed');},
    get:async path=>{gets.push(path);return snapshot(values.get(path));},
    onValue:(path,callback,error)=>{const entry={path,callback,error,active:true};listeners.push(entry);return()=>{entry.active=false;};},
    transact:async(path,reducer)=>{transactions.push(path);const next=reducer(values.get(path));values.set(path,next);return next;}});
  return{service,listeners,gets,transactions,values,stops,
    emit(path,value){values.set(path,value);for(const entry of [...listeners])if(entry.active&&entry.path===path)entry.callback(snapshot(value));},
    close(){online=false;for(const stop of [...stops])stop();},snapshot};
}
test('private submissions reject null, inherited inputs, blank bids and full-roster positive bids',()=>{
  const sealed=room('sealed-auction');
  for(const value of[null,[],Object.create({amount:1}),{amount:''},{amount:true},{amount:21}])assert.throws(()=>partySubmission(sealed,'p1',value));
  assert.equal(partySubmission(sealed,'p1',{amount:'0'}).amount,0);
  sealed.game.rosters.p1=Array.from({length:5},(_,i)=>({id:i+1,price:1}));
  assert.throws(()=>partySubmission(sealed,'p1',{amount:1}));
  assert.equal(partySubmission(sealed,'p1',{amount:0}).amount,0);
  const ranking=room();assert.throws(()=>partySubmission(ranking,'p1',Object.create({slot:1})));
  ranking.game.roundIndex=1;assert.throws(()=>partySubmission(ranking,'p1',{slot:1},{}));
  assert.throws(()=>partySubmission(ranking,'p1',{slot:1},{s1:1}));
});
test('ranking reconnect waits for previous own slots and preserves its committed selection',()=>{
  const current=room();current.game.roundIndex=1;const env=fake(),states=[],ctx=partyPrivateContext(current,'p1');
  env.service.watchParty(current,state=>states.push(state));
  const payload=partySubmission(current,'p1',{slot:2},{s1:1});
  env.emit(`${ctx.path}/p1`,payload);assert.equal(states.at(-1).loaded,false);
  env.emit(`${ctx.root}/submissions/q0/choosing/p1/slots`,{s1:1});
  assert.equal(states.at(-1).loaded,true);assert.deepEqual(states.at(-1).previousSlots,{s1:1});assert.deepEqual(states.at(-1).mine,payload);
});

async function finishSubmission(env,current,value){
  const pending=env.service.submitParty(current,value);
  // A cold reconnect first awaits get(); both paths retain the transaction
  // listener before writing so its first callback sees the existing record.
  await Promise.resolve();await Promise.resolve();
  env.emit(`${partyPrivateContext(current,'p1').path}/p1`,null);
  return pending;
}

test('ranking uses its live authoritative preceding slots without another read',async()=>{
  const current=room();current.game.roundIndex=1;const env=fake(),ctx=partyPrivateContext(current,'p1');
  const states=[];env.service.watchParty(current,state=>states.push(state));
  env.emit(`${ctx.root}/submissions/q0/choosing/p1/slots`,{s1:1});
  // A consumer cannot mutate the cached authority through its view model.
  states.at(-1).previousSlots.s1=999;
  const saved=await finishSubmission(env,current,{slot:2});
  assert.deepEqual(saved.slots,{s1:1,s2:2});assert.deepEqual(env.gets,[]);
});

test('stopped ranking watches fall back to the server and ignore delayed cache callbacks',async()=>{
  const current=room();current.game.roundIndex=1;const env=fake(),ctx=partyPrivateContext(current,'p1');
  const stop=env.service.watchParty(current,()=>{}),path=`${ctx.root}/submissions/q0/choosing/p1/slots`;
  env.emit(path,{s1:1});const delayed=env.listeners.find(entry=>entry.path===path).callback;stop();
  delayed(env.snapshot({s3:1}));env.values.set(`${ctx.root}/submissions/q0/choosing/p1`,{slots:{s2:1}});
  const saved=await finishSubmission(env,current,{slot:3});
  assert.deepEqual(saved.slots,{s2:1,s3:2});assert.deepEqual(env.gets,[`${ctx.root}/submissions/q0/choosing/p1`]);
});

test('overlapping ranking watches retain only the newest active cache',async()=>{
  const current=room();current.game.roundIndex=1;const env=fake(),ctx=partyPrivateContext(current,'p1');
  const stopOld=env.service.watchParty(current,()=>{});env.service.watchParty(current,()=>{});
  env.emit(`${ctx.root}/submissions/q0/choosing/p1/slots`,{s1:1});stopOld();
  const saved=await finishSubmission(env,current,{slot:2});
  assert.deepEqual(saved.slots,{s1:1,s2:2});assert.deepEqual(env.gets,[]);
});

test('ranking cache cannot cross room instances, rounds, questions, decks or seats',async()=>{
  const variations=[
    value=>{value.code='957100';},value=>{value.createdAt++;},value=>{value.round++;},
    value=>{value.game.roundIndex=2;},value=>{value.game.deck=[11,12,13,14,15,16,17,18,19,20];},
    value=>{value.players.p1.uid='other';value.players.p2.uid='p1';}
  ];
  for(const vary of variations){
    const original=room();original.game.roundIndex=1;const env=fake(),ctx=partyPrivateContext(original,'p1');
    env.service.watchParty(original,()=>{});env.emit(`${ctx.root}/submissions/q0/choosing/p1/slots`,{s1:1});
    const next=structuredClone(original);vary(next);const nextCtx=partyPrivateContext(next,'p1');
    const previousPath=`${nextCtx.root}/submissions/q${next.game.roundIndex-1}/choosing/${nextCtx.seat}`;
    env.values.set(previousPath,{slots:Object.fromEntries(next.game.deck.slice(0,next.game.roundIndex).map((id,index)=>[`s${index+1}`,id]))});
    const pending=env.service.submitParty(next,{slot:next.game.roundIndex+1});await Promise.resolve();await Promise.resolve();
    env.emit(`${nextCtx.path}/${nextCtx.seat}`,null);await pending;
    assert.deepEqual(env.gets,[previousPath]);
  }
});

test('missing, malformed and revoked ranking cache entries use the server fallback',async()=>{
  for(const source of[null,{},[],{s1:999},{bad:1},{s1:1,s2:1},'listener-error']){
    const current=room();current.game.roundIndex=1;const env=fake(),ctx=partyPrivateContext(current,'p1');
    env.service.watchParty(current,()=>{});
    const path=`${ctx.root}/submissions/q0/choosing/p1/slots`;
    if(source==='listener-error'){
      env.emit(path,{s1:1});env.listeners.find(entry=>entry.path===path).error(new Error('permission denied'));
    }else env.emit(path,source);
    env.values.set(`${ctx.root}/submissions/q0/choosing/p1`,{slots:{s3:1}});
    const saved=await finishSubmission(env,current,{slot:2});
    assert.deepEqual(saved.slots,{s3:1,s2:2});assert.deepEqual(env.gets,[`${ctx.root}/submissions/q0/choosing/p1`]);
  }
});

test('a closed session cannot submit using a previously warmed ranking cache',async()=>{
  const current=room();current.game.roundIndex=1;const env=fake(),ctx=partyPrivateContext(current,'p1');
  env.service.watchParty(current,()=>{});env.emit(`${ctx.root}/submissions/q0/choosing/p1/slots`,{s1:1});env.close();
  await assert.rejects(env.service.submitParty(current,{slot:2}),/closed/);
  assert.equal(env.transactions.length,0);assert.equal(env.stops.size,0);
});
test('the first nine ranking rounds expose progress without subscribing to rival choices',()=>{
  const current=room();current.game.roundIndex=4;const env=fake(),states=[],ctx=partyPrivateContext(current,'p1');
  env.service.watchParty(current,state=>states.push(state));
  env.emit(`${ctx.path}/p1`,null);env.emit(`${ctx.root}/submissions/q3/choosing/p1/slots`,{s1:1,s2:2,s3:3,s4:4});
  for(const seat of current.game.seats)env.emit(`${ctx.path}/${seat}/locked`,true);
  assert.equal(states.at(-1).allLocked,true);
  assert.deepEqual(states.at(-1).recordsForResolution.p2,{locked:true,count:5,roundIndex:4,stage:'choosing'});
  assert.ok(env.listeners.every(({path})=>!/^.*\/p[234](?:\/slots)?$/.test(path)));
});
test('the final ranking round waits for all locks before reading full rival lists',()=>{
  const current=room();current.game.roundIndex=9;const env=fake(),ctx=partyPrivateContext(current,'p1');
  env.service.watchParty(current,()=>{});
  for(const seat of['p1','p2','p3'])env.emit(`${ctx.path}/${seat}/locked`,true);
  assert.equal(env.listeners.some(({path})=>path===`${ctx.path}/p2`),false);
  env.emit(`${ctx.path}/p4/locked`,true);
  assert.equal(env.listeners.some(({path})=>path===`${ctx.path}/p2`),true);
});
test('stopped watches ignore delayed callbacks and detach every listener',()=>{
  const current=room(),env=fake(),states=[],ctx=partyPrivateContext(current,'p1');
  const stop=env.service.watchParty(current,state=>states.push(state));const delayed=env.listeners[0].callback;
  env.emit(`${ctx.path}/p1`,null);const count=states.length;stop();
  delayed(env.snapshot({locked:true}));assert.equal(states.length,count);
  assert.ok(env.listeners.every(entry=>!entry.active));assert.equal(env.stops.size,0);
});
test('a pending private transaction is cancelled when the session closes',async()=>{
  const current=room('sealed-auction'),env=fake();const result=env.service.submitParty(current,{amount:1});
  assert.equal(env.listeners.length,1);env.close();await assert.rejects(result,/oturumu kapandı/);
  assert.equal(env.transactions.length,0);assert.equal(env.stops.size,0);
});
test('a refreshed locked submission cannot be overwritten or move to the next card',async()=>{
  const current=room('sealed-auction'),env=fake(),ctx=partyPrivateContext(current,'p1');
  env.values.set(`${ctx.path}/p1`,partySubmission(current,'p1',{amount:2}));
  const result=env.service.submitParty(current,{amount:3});current.game.roundIndex=1;
  env.emit(`${ctx.path}/p1`,env.values.get(`${ctx.path}/p1`));await assert.rejects(result,/kilitlendi/);
  assert.deepEqual(env.transactions,[`${ctx.path}/p1`]);assert.equal(env.values.get(`${ctx.path}/p1`).amount,2);
});
test('a secret-role screen waits for its private view, even when its own choice loaded first',()=>{
  const current=room('detective',2),env=fake(),states=[],ctx=partyPrivateContext(current,'p1');
  env.service.watchParty(current,state=>states.push(state));env.emit(`${ctx.path}/p1`,null);env.emit(`${ctx.deal}/views/p1`,null);
  assert.equal(states.at(-1).loaded,false);env.emit(`${ctx.deal}/views/p1`,{isMole:false,targetId:1});assert.equal(states.at(-1).loaded,true);
});
test('a caught mole never requests its hidden target until its final guess locks',()=>{
  const current=room('chameleon'),env=fake('p4'),ctx=partyPrivateContext(current,'p4');current.game.stage='voting';
  const voting=partyPrivateContext(current,'p4');env.service.watchParty(current,()=>{});
  for(const seat of current.game.seats)env.emit(`${voting.path}/${seat}/locked`,true);
  for(const seat of current.game.seats)env.emit(`${voting.path}/${seat}`,{seat:seat==='p4'?'p1':'p4',locked:true});env.emit(`${ctx.deal}/moleSeat`,'p4');
  assert.equal(env.listeners.some(({path})=>path===`${ctx.deal}/targetId`),false);
  env.close();current.game.stage='last-guess';current.game.caughtSeat='p4';
  const last=fake('p4'),lastCtx=partyPrivateContext(current,'p4');last.service.watchParty(current,()=>{});
  assert.equal(last.listeners.some(({path})=>path===`${ctx.deal}/targetId`),false);last.emit(`${lastCtx.path}/p4/locked`,true);
  assert.equal(last.listeners.some(({path})=>path===`${ctx.deal}/targetId`),true);
});
test('an escaped mole unlocks the canonical target only after the complete vote result',()=>{
  const current=room('chameleon');current.game.stage='voting';const env=fake('p4'),ctx=partyPrivateContext(current,'p4');env.service.watchParty(current,()=>{});
  for(const seat of current.game.seats)env.emit(`${ctx.path}/${seat}/locked`,true);
  env.emit(`${ctx.deal}/moleSeat`,'p4');assert.equal(env.listeners.some(({path})=>path===`${ctx.deal}/targetId`),false);
  for(const seat of current.game.seats)env.emit(`${ctx.path}/${seat}`,{seat:seat==='p1'?'p2':'p1',locked:true});
  assert.equal(env.listeners.some(({path})=>path===`${ctx.deal}/targetId`),true);
});
test('reconnecting hosts keep an existing deal without reading or redrawing canonical secrets',async()=>{
  const current=room('chameleon'),env=fake(),ctx=partyPrivateContext(current,'p1');env.values.set(`${ctx.deal}/views/p1`,{isMole:false,targetId:1});
  await env.service.preparePartySecrets(current,{targetId:partyCards(current.game)[1],moleSeat:'p4'});
  assert.deepEqual(env.gets,[`${ctx.deal}/views/p1`]);assert.equal(env.transactions.length,0);assert.equal(env.listeners.length,0);
});
