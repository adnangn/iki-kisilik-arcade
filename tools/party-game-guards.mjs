/** Server checks for deterministic public state derived from locked records. */
export function installPartyGameGuards(document) {
  const pg=document.rules.rooms.$code.partyGame;
  const seats=['p1','p2','p3','p4'],pairs=[['p1','p2'],['p1','p3'],['p1','p4'],['p2','p3'],['p2','p4'],['p3','p4']];
  const A=parts=>`(${parts.map(part=>`(${part})`).join('&&')})`,O=parts=>`(${parts.map(part=>`(${part})`).join('||')})`;
  const V=(node,path)=>`${node}.child('${path}').val()`,H=(node,path)=>`${node}.hasChild('${path}')`;
  const parent=(node,depth)=>node+'.parent()'.repeat(depth);
  const modes=(expression,list)=>O(list.map(mode=>`${expression}==='${mode}'`));
  const integer=(node,min,max)=>`${node}.isNumber()&&${node}.val()%1===0&&${node}.val()>=${min}&&${node}.val()<=${max}`;
  function context(depth){
    const G=parent('newData',depth),D=parent('data',depth),R=G+'.parent()';
    return {G,D,R,mode:V(G,'mode'),action:V(R,'lastAction/kind'),init:modes(V(R,'lastAction/kind'),['start','rematch','next-game']),
      q:`root.child('privateGames').child($code).child('r'+${V(R,'round')}).child('party/submissions').child('q'+${V(D,'roundIndex')})`,
      deal:`root.child('privateGames').child($code).child('r'+${V(R,'round')}).child('party/deals').child('q'+${V(D,'roundIndex')})`};
  }
  const present=(game,seat)=>H(game,`seats/${seats.indexOf(seat)}`);
  const exactSeats=(node,game)=>A(seats.map(seat=>`${H(node,seat)}===${present(game,seat)}`));
  const exactPairs=(node,game)=>A(pairs.map(([l,r])=>`${H(node,`${l}_${r}`)}===${present(game,r)}`));
  const sum=(expressions)=>`(${expressions.map(expression=>`(${expression})`).join('+')})`;
  const mapSum=(node,keys)=>sum(keys.map(key=>`${H(node,key)}?${V(node,key)}:0`));
  const preserve=(expression)=>`(data.exists()?newData.val()===data.val():(${expression}))`;
  const scalar=(check)=>({'.validate':preserve(check)});
  const seatKey="$seat.matches(/^p[1-4]$/)";
  const participantMap=(game,leaf)=>({'.validate':exactSeats('newData',game),'$seat':{...leaf,'.validate':`${seatKey}&&(${leaf['.validate']||'true'})`}});
  const pairLeft="($pair==='p1_p2'||$pair==='p1_p3'||$pair==='p1_p4'?'p1':$pair==='p2_p3'||$pair==='p2_p4'?'p2':'p3')";
  const pairRight="($pair==='p1_p2'?'p2':$pair==='p1_p3'||$pair==='p2_p3'?'p3':'p4')";
  const validPair="$pair==='p1_p2'||$pair==='p1_p3'||$pair==='p1_p4'||$pair==='p2_p3'||$pair==='p2_p4'||$pair==='p3_p4'";
  const resultRequired={auction:['id','seat','price'],'sealed-auction':['id','bids','highestBid','burned'],telepathy:['choices','pairResults','scores','points','allMatch','streak'],detective:['clueGiverSeat','guesserSeat','clue','targetId','guessId','correct','points'],chameleon:['clues','votes','counts','moleSeat','targetId','caught','guessed','points']};
  const ctx=context(2),result='newData';
  const recordKinds=O(Object.entries(resultRequired).map(([mode,fields])=>`${ctx.mode}==='${mode}'&&newData.hasChildren(${JSON.stringify(fields)})`));
  const previousRound=Array.from({length:29},(_,index)=>`$round==='r${index+2}'?'r${index+1}':`).join('')+"'r29'";
  const oldRecordCount=`(${V('data.parent()','mode')}==='auction'||(${V('data.parent()','mode')}==='sealed-auction'&&${V('data.parent()','stage')}==='finished')?${V('data.parent()','roundIndex')}:${V('data.parent()','roundIndex')}+(${V('data.parent()','stage')}==='reveal'?1:0))`;
  const rootInit=context(1).init;
  pg.results={
    '.validate':`${rootInit}||!data.exists()||newData.hasChild('r'+${oldRecordCount})`,
    '$round':{
      '.validate':`$round.matches(/^r([1-9]|[12][0-9]|30)$/)&&($round==='r1'||newData.parent().hasChild(${previousRound}))&&(data.exists()||$round==='r'+(${V(ctx.D,'roundIndex')}+1))&&${recordKinds}&&(${ctx.mode}==='sealed-auction'?newData.hasChild('winnerSeat')===(newData.child('burned').val()===false):${ctx.mode}==='chameleon'?newData.hasChild('guessId')===newData.child('caught').val():true)`,
      '$other':{'.validate':false},
    },
  };
  const row=pg.results.$round;
  function field(name,depth,check,allowed){const c=context(depth);row[name]=scalar(`${modes(c.mode,allowed)}&&${check(c)}`);}
  field('id',3,c=>`newData.val()===${V(c.D,'currentCardId')}`,['auction','sealed-auction']);
  field('seat',3,c=>`newData.val()===${V(c.D,'bidderSeat')}`,['auction']);
  field('price',3,c=>`newData.val()===${V(c.D,'highestBid')}`,['auction']);
  const choicesC=context(4);
  row.choices=participantMap(parent('newData',3),scalar(`${choicesC.mode}==='telepathy'&&newData.val()===${choicesC.q}.child('choosing').child($seat).child('cardId').val()`));
  row.bids=participantMap(parent('newData',3),scalar(`${choicesC.mode}==='sealed-auction'&&newData.val()===${choicesC.q}.child('choosing').child($seat).child('amount').val()`));
  const pairC=context(4),pairOld=pairC.D,pairRow=parent('newData',2);
  const pairMatch=`${pairRow}.child('choices').child(${pairLeft}).val()===${pairRow}.child('choices').child(${pairRight}).val()`;
  row.pairResults={'.validate':`${context(3).mode}==='telepathy'&&${exactPairs('newData',parent('newData',3))}`,'$pair':{
    '.validate':`(${validPair})&&newData.hasChildren(['match','streak','points','bonus'])&&(data.exists()?${A(['match','streak','points','bonus'].map(name=>`${V('newData',name)}===${V('data',name)}`))}:${V('newData','match')}===(${pairMatch})&&${V('newData','streak')}===(${V('newData','match')}===true?${pairOld}.child('pairStreaks').child($pair).val()+1:0)&&${V('newData','bonus')}===(${V('newData','match')}===true&&${V('newData','streak')}%5===0?250:0)&&${V('newData','points')}===(${V('newData','match')}===true?100+${V('newData','bonus')}:0))`,
    match:{},streak:{},points:{},bonus:{},'$other':{'.validate':false},
  }};
  const seatPairPoints=(node,seat)=>sum(pairs.filter(([l,r])=>l===seat||r===seat).map(([l,r])=>`${H(node,`${l}_${r}`)}?${V(node,`${l}_${r}/points`)}:0`));
  const scoreC=context(4),scoreResult=parent('newData',2);
  const perSeatPoints=seats.map(seat=>`$seat==='${seat}'?${seatPairPoints(scoreResult+".child('pairResults')",seat)}:`).join('')+'0';
  row.scores=participantMap(parent('newData',3),scalar(`${scoreC.mode}==='telepathy'&&newData.val()===(${perSeatPoints})`));
  field('allMatch',3,c=>`newData.val()===(${A(seats.slice(1).map(seat=>`!${present(c.G,seat)}||${V('newData.parent()',`choices/${seat}`)}===${V('newData.parent()','choices/p1')}`))})`,['telepathy']);
  field('streak',3,c=>`newData.val()===(${V('newData.parent()','allMatch')}===true?${V(c.D,'streak')}+1:0)`,['telepathy']);
  row.points={'.validate':preserve(`(${context(3).mode}==='telepathy'&&newData.val()===${mapSum("newData.parent().child('pairResults')",pairs.map(([l,r])=>`${l}_${r}/points`))})||(${context(3).mode}==='detective'&&newData.val()===(${V('newData.parent()','correct')}===true?100:0))`),
    '$seat':scalar(`${seatKey}&&${context(4).mode}==='chameleon'&&newData.val()===($seat===${V('newData.parent().parent()','moleSeat')}?(${V('newData.parent().parent()','caught')}===false?200:${V('newData.parent().parent()','guessed')}===true?100:0):(${V('newData.parent().parent()','caught')}===true&&${V('newData.parent().parent()','guessed')}===false?100:0))`)};
  // The points map must contain exactly the fixed participants in Bukalemun.
  row.points['.validate']=`newData.hasChildren()?(${context(3).mode}==='chameleon'&&${exactSeats('newData',parent('newData',3))}):(${row.points['.validate']})`;
  const highestC=context(3),highestRow='newData.parent()';
  const eligible=seat=>`${present(highestC.G,seat)}&&!${H(highestC.D,`rosters/${seat}/4`)}`;
  row.highestBid=scalar(`${highestC.mode}==='sealed-auction'&&${O(seats.map(seat=>`${eligible(seat)}&&newData.val()===${V(highestRow,`bids/${seat}`)}`))}&&${A(seats.map(seat=>`!(${eligible(seat)})||newData.val()>=${V(highestRow,`bids/${seat}`)}`))}`);
  const sealedC=context(2),leaders=sum(seats.map(seat=>`${present(sealedC.G,seat)}&&!${H(sealedC.D,`rosters/${seat}/4`)}&&${V('newData',`bids/${seat}`)}===${V('newData','highestBid')}?1:0`));
  row['.validate']+=`&&(${sealedC.mode}==='sealed-auction'&&!data.exists()?(${V('newData','burned')}===true?${leaders}>=2:${leaders}===1):true)`;
  field('burned',3,c=>'newData.isBoolean()',['sealed-auction']);
  field('winnerSeat',3,c=>`${modes('newData.val()',seats)}&&!${c.D}.child('rosters').child(newData.val()).hasChild('4')&&${V('newData.parent()','highestBid')}===newData.parent().child('bids').child(newData.val()).val()`,['sealed-auction']);
  field('clueGiverSeat',3,c=>`newData.val()===${V(c.D,'clueGiverSeat')}`,['detective']);
  field('guesserSeat',3,c=>`newData.val()===${V(c.D,'guesserSeat')}`,['detective']);
  field('clue',3,c=>`newData.val()===${c.q}.child('clue').child(${V(c.D,'clueGiverSeat')}).child('word').val()`,['detective']);
  field('targetId',3,c=>`newData.val()===${c.deal}.child('targetId').val()`,['detective','chameleon']);
  field('guessId',3,c=>`newData.val()===(${c.mode}==='detective'?${c.q}.child('guess').child(${V(c.D,'guesserSeat')}).child('cardId').val():${c.q}.child('last-guess').child(${c.deal}.child('moleSeat').val()).child('cardId').val())`,['detective','chameleon']);
  field('correct',3,c=>`newData.val()===(${V('newData.parent()','guessId')}===${V('newData.parent()','targetId')})`,['detective']);
  field('moleSeat',3,c=>`newData.val()===${c.deal}.child('moleSeat').val()`,['chameleon']);
  row.clues=participantMap(parent('newData',3),scalar(`${choicesC.mode}==='chameleon'&&newData.val()===${choicesC.q}.child('clues').child($seat).child('word').val()`));
  row.votes=participantMap(parent('newData',3),scalar(`${choicesC.mode}==='chameleon'&&newData.val()===${choicesC.q}.child('voting').child($seat).child('seat').val()`));
  const voteCount=(node,candidate)=>sum(seats.map(seat=>`${V(node,seat)}===${candidate}?1:0`));
  row.counts=participantMap(parent('newData',3),scalar(`${choicesC.mode}==='chameleon'&&newData.val()===${voteCount('newData.parent().parent().child(\'votes\')','$seat')}`));
  const uniqueSuspect=node=>O(seats.map(candidate=>`${present(context(2).G,candidate)}&&${A(seats.filter(seat=>seat!==candidate).map(seat=>`!${present(context(2).G,seat)}||${V(node,`counts/${candidate}`)}>${V(node,`counts/${seat}`)}`))}`));
  row['.validate']+=`&&(${context(2).mode}==='chameleon'?newData.hasChild('suspectSeat')===${uniqueSuspect('newData')}:true)`;
  field('suspectSeat',3,c=>`${modes('newData.val()',seats)}&&${A(seats.map(seat=>`newData.val()==='${seat}'||!${present(c.G,seat)}||newData.parent().child('counts').child(newData.val()).val()>${V('newData.parent()',`counts/${seat}`)}`))}`,['chameleon']);
  const moleUnique=node=>A(seats.map(seat=>`${V(node,'moleSeat')}==='${seat}'||!${present(context(3).G,seat)}||${node}.child('counts').child(${V(node,'moleSeat')}).val()>${V(node,`counts/${seat}`)}`));
  field('caught',3,c=>`newData.val()===(${moleUnique('newData.parent()')})`,['chameleon']);
  field('guessed',3,c=>`newData.val()===(${V('newData.parent()','caught')}===true&&${V('newData.parent()','guessId')}===${V('newData.parent()','targetId')})`,['chameleon']);

  // Public cumulative counters must equal their newly verified round result.
  const publicPair=context(2),latest=`${publicPair.G}.child('results').child('r'+(${V(publicPair.D,'roundIndex')}+1))`;
  const pairCheck=field=>`${publicPair.mode}==='telepathy'&&(${publicPair.init}?newData.val()===0:${publicPair.action}==='party-resolve'?newData.val()===${field==='pairStreaks'?`${latest}.child('pairResults').child($pair).child('streak').val()`:`data.val()+${latest}.child('pairResults').child($pair).child('points').val()`}:newData.val()===data.val())`;
  pg.pairScores={'.validate':exactPairs('newData',parent('newData',1)),'$pair':{'.validate':`(${validPair})&&${pairCheck('pairScores')}`}};
  pg.pairStreaks={'.validate':exactPairs('newData',parent('newData',1)),'$pair':{'.validate':`(${validPair})&&${pairCheck('pairStreaks')}`}};
  pg.score['.validate']+=`&&newData.parent().child('mode').val()==='telepathy'&&newData.val()===${mapSum('newData.parent().child(\'pairScores\')',pairs.map(([l,r])=>`${l}_${r}`))}`;
  const publicScores=context(2),latestForScore=`${publicScores.G}.child('results').child('r'+(${V(publicScores.D,'roundIndex')}+1))`;
  const seatPairTotals=seats.map(seat=>`$seat==='${seat}'?${mapSum(publicScores.G+".child('pairScores')",pairs.filter(([l,r])=>l===seat||r===seat).map(([l,r])=>`${l}_${r}`))}:`).join('')+'0';
  pg.scores={'.validate':exactSeats('newData',parent('newData',1)),'$seat':{'.validate':`${publicScores.init}?newData.val()===0:${publicScores.mode}==='telepathy'?newData.val()===(${seatPairTotals}):${publicScores.action}==='party-resolve'&&${latestForScore}.exists()?newData.val()===data.val()+(${publicScores.mode}==='detective'?${latestForScore}.child('points').val():${latestForScore}.child('points').child($seat).val()):newData.val()===data.val()`}};
  // Bounds and roles of currently visible deterministic state.
  const root=context(0),act=root.action,oldStage=V('data','stage'),newStage=V('newData','stage');
  pg.resultCount={'.validate':`${integer('newData',0,30)}&&newData.val()===(${V('newData.parent()','mode')}==='simultaneous-ranking'?0:${V('newData.parent()','mode')}==='auction'||(${V('newData.parent()','mode')}==='sealed-auction'&&${V('newData.parent()','stage')}==='finished')?${V('newData.parent()','roundIndex')}:${V('newData.parent()','roundIndex')}+(${V('newData.parent()','stage')}==='reveal'?1:0))`};
  pg.actionCount={'.validate':`${integer('newData',0,120)}&&(${context(1).mode}==='auction'?${context(1).init}?newData.val()===0:${modes(context(1).action,['bid','pass'])}?newData.val()===data.val()+1:newData.val()===data.val():newData.val()===0)`};
  pg['.validate']+=`&&newData.hasChildren(['resultCount','actionCount'])&&newData.hasChild('results')===(newData.child('resultCount').val()>0)&&newData.hasChild('actions')===(newData.child('actionCount').val()>0)`;
  const actionEntry=context(2),previousAction=Array.from({length:119},(_,index)=>`$index==='${index+1}'?'${index}':`).join('')+"'118'";
  pg.actions={'.validate':`newData.hasChild('0')&&newData.hasChild((newData.parent().child('actionCount').val()-1)+'')&&!newData.hasChild(newData.parent().child('actionCount').val()+'')&&(${context(1).init}||!data.exists()||newData.hasChild((data.parent().child('actionCount').val()-1)+''))`,'$index':{
    '.validate':`$index.matches(/^(0|[1-9][0-9]?|1[01][0-9])$/)&&newData.hasChildren(['seat','command'])&&($index==='0'||newData.parent().hasChild(${previousAction}))&&(data.exists()?${A(['seat','command','amount'].map(field=>`${V('newData',field)}===${V('data',field)}`))}:$index===${V(actionEntry.D,'actionCount')}+''&&newData.child('seat').val()===${V(actionEntry.R,'lastAction/seat')}&&newData.child('command').val()===${actionEntry.action}&&newData.hasChild('amount')===(newData.child('command').val()==='bid')&&(newData.child('command').val()==='bid'?newData.child('amount').val()===${V(actionEntry.G,'highestBid')}:true))`,seat:{},command:{},amount:{},'$other':{'.validate':false},
  }};
  const frozen=modes(act,['join','propose-next','ready-next']);
  const finishAt=last=>`${V('newData','phase')}===(${V('data','roundIndex')}===${last}?'finished':'playing')`;
  const sameRound=`${V('newData','roundIndex')}===${V('data','roundIndex')}`;
  const modePhase=O([
    `${root.mode}==='telepathy'&&${sameRound}&&${newStage}==='reveal'&&${finishAt(9)}`,
    `${root.mode}==='detective'&&${sameRound}&&(${oldStage}==='clue'?${newStage}==='guess'&&${V('newData','phase')}==='playing':${newStage}==='reveal'&&${finishAt(5)})`,
    `${root.mode}==='simultaneous-ranking'&&(${V('data','roundIndex')}===9?${sameRound}&&${newStage}==='finished'&&${V('newData','phase')}==='finished':${V('newData','roundIndex')}===${V('data','roundIndex')}+1&&${newStage}==='choosing'&&${V('newData','phase')}==='playing')`,
    `${root.mode}==='sealed-auction'&&(${V('newData','phase')}==='finished'?${V('newData','roundIndex')}===${V('data','roundIndex')}+1&&${newStage}==='finished':${sameRound}&&${newStage}==='reveal')`,
    `${root.mode}==='chameleon'&&${sameRound}&&(${oldStage}==='clues'?(${newStage}==='clues'||${newStage}==='voting')&&${V('newData','phase')}==='playing':${oldStage}==='voting'?(${newStage}==='last-guess'&&${V('newData','phase')}==='playing')||(${newStage}==='reveal'&&${finishAt(4)}):${newStage}==='reveal'&&${finishAt(4)})`,
  ]);
  pg['.validate']+=`&&(${root.init}||${frozen}||${act}!=='party-resolve'||${modePhase})`;
  const latestRoot="newData.child('results').child('r'+(data.child('roundIndex').val()+1))";
  pg['.validate']+=`&&(${root.mode}==='sealed-auction'&&${act}==='party-resolve'?${latestRoot}.exists()&&(${latestRoot}.child('burned').val()===true?${A(['id','seat','price','sequence'].map(field=>`${V('newData',`lastAward/${field}`)}===${V('data',`lastAward/${field}`)}`))}:${V('newData','lastAward/id')}===${latestRoot}.child('id').val()&&${V('newData','lastAward/seat')}===${latestRoot}.child('winnerSeat').val()&&${V('newData','lastAward/price')}===${latestRoot}.child('highestBid').val()&&${V('newData','lastAward/sequence')}===${V('data','roundIndex')}+1):true)`;
  const freezeResult=field=>pg[field]['.validate']+=`&&(${context(1).mode}==='telepathy'?${context(1).init}?newData.val()===0:${context(1).action}==='party-resolve'?newData.val()===${field==='streak'?"newData.parent().child('results').child('r'+(data.parent().child('roundIndex').val()+1)).child('streak').val()":`(${V('data.parent()','bestStreak')}>${V('newData.parent()','streak')}?${V('data.parent()','bestStreak')}:${V('newData.parent()','streak')})`}:newData.val()===data.val():false)`;
  freezeResult('streak');freezeResult('bestStreak');
  pg.clue['.validate']+=`&&${context(1).mode}==='detective'&&(${context(1).init}||${context(1).action}==='next'?newData.val()==='':${context(1).action}==='party-resolve'&&${V(context(1).D,'stage')}==='clue'?newData.val()===${context(1).q}.child('clue').child(${V(context(1).D,'clueGiverSeat')}).child('word').val():newData.val()===data.val())`;
  const clueContext=context(2);
  pg.clues={'.validate':`${context(1).mode}==='chameleon'&&${A(seats.map(seat=>`!data.hasChild('${seat}')||newData.hasChild('${seat}')`))}`,'$seat':{'.validate':`${present(clueContext.G,'p1')}&&(${clueContext.init}||${clueContext.action}==='next'?false:data.exists()?newData.val()===data.val():${clueContext.action}==='party-resolve'&&${V(clueContext.D,'stage')}==='clues'&&$seat===${V(clueContext.D,'turnSeat')}&&newData.val()===${clueContext.q}.child('clues').child($seat).child('word').val())`}};
  pg.votes={'.validate':`${context(1).mode}==='chameleon'&&${exactSeats('newData',parent('newData',1))}`,'$seat':{'.validate':`${clueContext.init}||${clueContext.action}==='next'?false:${clueContext.action}==='party-resolve'&&${V(clueContext.D,'stage')}==='voting'?newData.val()===${clueContext.q}.child('voting').child($seat).child('seat').val():newData.val()===data.val()`}};
  pg.progress={'.validate':`${context(1).mode}==='simultaneous-ranking'&&${exactSeats('newData',parent('newData',1))}`,'$seat':{'.validate':`newData.val()===(${V(context(2).G,'phase')}==='finished'?10:${V(context(2).G,'roundIndex')})`}};
  const rankContext=context(3),finalPacket=`${rankContext.q}.child('choosing').child($seat).child('slots')`;
  pg.rankings={'.validate':`${context(1).mode}==='simultaneous-ranking'&&${V(context(1).G,'phase')}==='finished'&&${exactSeats('newData',parent('newData',1))}`,'$seat':{'.validate':"newData.hasChildren(['s1','s2','s3','s4','s5','s6','s7','s8','s9','s10'])",'$slot':{'.validate':`$slot.matches(/^s([1-9]|10)$/)&&newData.val()===${finalPacket}.child($slot).val()`}}};
  // The ranking matrix is calculated from these protected lists on each
  // device, avoiding duplicate mutable percentage/result fields on the wire.
  pg.result={'.validate':false};
  const roleC=context(1);
  pg.clueGiverSeat['.validate']+=`&&${roleC.mode}==='detective'&&(${roleC.init}?newData.val()===${V(roleC.G,'starterSeat')}:${roleC.action}==='next'?newData.val()===${V(roleC.D,'guesserSeat')}:newData.val()===data.val())`;
  pg.guesserSeat['.validate']+=`&&${roleC.mode}==='detective'&&(${roleC.init}?newData.val()===(${V(roleC.G,'starterSeat')}==='p1'?'p2':'p1'):${roleC.action}==='next'?newData.val()===${V(roleC.D,'clueGiverSeat')}:newData.val()===data.val())`;
  const seatIndex=seat=>`(${seat}==='p1'?0:${seat}==='p2'?1:${seat}==='p3'?2:3)`;
  const seatCount=game=>`(${H(game,'seats/3')}?4:${H(game,'seats/2')}?3:2)`;
  const nextSeat=(game,seat,offset=1)=>`${game}.child('seats').child(((${seatIndex(seat)}+${offset})%${seatCount(game)})+'').val()`;
  const cycle=(game,seat,valid)=>[1,2,3].map(offset=>{const candidate=nextSeat(game,seat,offset);return `(${valid(candidate)})?${candidate}:`;}).join('')+nextSeat(game,seat,4);
  const bidder=V('newData','bidderSeat'),turn=V('newData','turnSeat'),opener=V('newData','openerSeat');
  const nextTurn=cycle('newData',V('newData.parent()','lastAction/seat'),candidate=>`${candidate}!==${bidder}&&newData.child('passed').child(${candidate}).val()===false`);
  const nextOpener=cycle('newData',V('data','openerSeat'),candidate=>`newData.child('budgets').child(${candidate}).val()>0&&!newData.child('rosters').child(${candidate}).hasChild('4')`);
  const auctionTurn=`${V('newData','roundIndex')}===${V('data','roundIndex')}?${turn}===(${nextTurn})&&${opener}===${V('data','openerSeat')}&&${turn}!==${bidder}&&newData.child('passed').child(${turn}).val()===false:${opener}===(${nextOpener})&&${bidder}===${opener}&&${turn}===${nextSeat('newData',opener)}`;
  pg['.validate']+=`&&(${root.mode}==='auction'&&${V('newData','phase')}==='playing'?${root.init}?${opener}===${V('newData','starterSeat')}&&${bidder}===${opener}&&${turn}===${nextSeat('newData',opener)}:${frozen}?true:(${auctionTurn}):true)`;
  pg.highestBid['.validate']+=`&&${roleC.mode}==='auction'&&(${roleC.init}?newData.val()===1:${frozen.replaceAll('newData.parent()','newData.parent().parent()')}?newData.val()===data.val():${V(roleC.G,'phase')}==='finished'?newData.val()===0:${roleC.action}==='bid'?newData.val()>data.val():${V(roleC.G,'roundIndex')}===${V(roleC.D,'roundIndex')}?newData.val()===data.val():newData.val()===1)`;
  pg.deckIndex['.validate']+=`&&${modes(roleC.mode,['auction','sealed-auction'])}&&newData.val()===${V(roleC.G,'roundIndex')}`;
  const passedC=context(2);
  pg.passed={'.validate':`${context(1).mode}==='auction'&&${exactSeats('newData',parent('newData',1))}`,'$seat':{'.validate':`newData.isBoolean()&&(${passedC.init}?newData.val()===false:${V(passedC.G,'phase')}==='playing'&&${V(passedC.G,'roundIndex')}>${V(passedC.D,'roundIndex')}?newData.val()===false:${passedC.action}==='pass'?newData.val()===($seat===${V(passedC.R,'lastAction/seat')}?true:data.val()):newData.val()===data.val())`}};
  pg.lastAward['.validate']+=`&&(${A(['id','seat','price','sequence'].map(name=>`${V('newData',name)}===${V('data',name)}`))}||(${context(1).mode}==='auction'?${context(1).action}==='pass'&&${V(context(1).G,'roundIndex')}===${V(context(1).D,'roundIndex')}+1:${context(1).action}==='party-resolve'))`;
  const chVotes="newData.child('votes')",mole=`${root.deal}.child('moleSeat').val()`;
  const moleIsLeader=A(seats.map(seat=>`${mole}==='${seat}'||!${present('newData',seat)}||${voteCount(chVotes,mole)}>${voteCount(chVotes,`'${seat}'`)}`));
  const allClues=A(seats.map(seat=>`!${present('newData',seat)}||${H('newData',`clues/${seat}`)}`));
  pg['.validate']+=`&&(${root.mode}==='chameleon'?${root.init}?newData.child('turnSeat').val()===newData.child('starterSeat').val()&&!newData.hasChild('clues')&&!newData.hasChild('votes')&&!newData.hasChild('caughtSeat'):${frozen}?true:${act}==='next'?newData.child('turnSeat').val()===newData.child('seats').child(((${seatIndex(V('newData','starterSeat'))}+newData.child('roundIndex').val())%${seatCount('newData')})+'').val()&&!newData.hasChild('clues')&&!newData.hasChild('votes')&&!newData.hasChild('caughtSeat'):${oldStage}==='clues'?${newStage}===(${allClues}?'voting':'clues')&&(${newStage}==='clues'?newData.child('turnSeat').val()===${nextSeat('newData',V('data','turnSeat'))}:!newData.hasChild('turnSeat')):${oldStage}==='voting'?(${moleIsLeader}?${newStage}==='last-guess'&&${V('newData','caughtSeat')}===${mole}&&${V('newData','turnSeat')}===${mole}:${newStage}==='reveal'&&!newData.hasChild('caughtSeat')&&!newData.hasChild('turnSeat')):${oldStage}==='last-guess'?${newStage}==='reveal'&&!newData.hasChild('turnSeat')&&${V('newData','caughtSeat')}===${mole}:true:true)`;
  // Complete seats in order from the unseen deck tail. A burnt card is already
  // behind deckIndex and can never enter this deterministic completion chain.
  const rosterC=context(3),previousRoster="$index==='1'?'0':$index==='2'?'1':$index==='3'?'2':'3'";
  const ownPrevious=`newData.parent().child(${previousRoster})`;
  const predecessors=[
    {when:`$index!=='0'&&${ownPrevious}.child('source').val()==='completion'`,entry:ownPrevious},
    ...seats.slice(0,3).reverse().map(seat=>({when:`${O(seats.slice(seats.indexOf(seat)+1).map(later=>`$seat==='${later}'`))}&&${V(rosterC.G,`rosters/${seat}/4/source`)}==='completion'`,entry:`${rosterC.G}.child('rosters/${seat}/4')`})),
  ];
  const nextFreeIndex=predecessors.map(({when,entry})=>`(${when})?${rosterC.G}.child('deckIds').child(${entry}.child('id').val()+'').val()+1:`).join('')+V(rosterC.G,'deckIndex');
  const earlierFull=A(seats.slice(0,3).map(seat=>`${O(seats.slice(0,seats.indexOf(seat)+1).map(earlier=>`$seat==='${earlier}'`))}||${H(rosterC.G,`rosters/${seat}/4`)}`));
  pg.rosters.$seat.$index['.validate']+=`&&(newData.child('source').val()==='completion'?${rosterC.G}.child('deckIds').child(newData.child('id').val()+'').val()===(${nextFreeIndex})&&${earlierFull}:true)`;
  // If the reserve cannot fill every seat, its final card must still have been
  // consumed. Combined with the contiguous chain this prevents skipped gifts.
  const deckC=context(2),allFull=A(seats.map(seat=>`!${present(deckC.G,seat)}||${H(deckC.G,`rosters/${seat}/4`)}`));
  const finalCardUsed=O(seats.flatMap(seat=>Array.from({length:5},(_,index)=>`newData.val()===${V(deckC.G,`rosters/${seat}/${index}/id`)}`)));
  pg.deck.$index['.validate']+=`&&(${modes(deckC.mode,['auction','sealed-auction'])}&&${V(deckC.G,'phase')}==='finished'&&!${allFull}&&${V(deckC.G,'deckIndex')}<${V(deckC.G,'deckSize')}&&$index===(${V(deckC.G,'deckSize')}-1)+''?${finalCardUsed}:true)`;
  for(const field of ['scores','clues','votes','progress','rankings','passed'])pg[field].$seat['.validate']=`${seatKey}&&(${pg[field].$seat['.validate']})`;
  pg.completionAwards={'.validate':false};
  // Sealed rounds which exhaust a burnt deck may finish with spare team slots.
  // The existing ledger and unique in-pool roster checks still apply.
}
