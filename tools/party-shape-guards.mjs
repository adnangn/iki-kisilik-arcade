import { TELEPATHY_QUESTION_COUNT } from '../js/telepathy-questions.js';

/** Close missing-field/deletion and setup-shape gaps left by leaf validators. */
export function installPartyShapeGuards(document) {
  const room = document.rules.rooms.$code, game = room.partyGame;
  const value = (node, field) => `${node}.child('${field}').val()`;
  const has = (node, field) => `${node}.hasChild('${field}')`;
  const oneOf = (expression, values) => `${expression}.matches(/^(${values.join('|')})$/)`;
  const append = (node, rule) => { node['.validate'] = `(${node['.validate'] || 'true'})&&(${rule})`; };
  const mode = value('newData', 'mode'), phase = value('newData', 'phase');
  const action = value('newData.parent()', 'lastAction/kind');
  const initial = `${action}.matches(/^(start|rematch|next-game)$/)`;
  const reset = `(${initial}||${action}==='next')`;
  const money = oneOf(mode, ['auction', 'sealed-auction']);

  // Required maps must be checked at their parent: deleting an entire child
  // skips that child's .validate in Realtime Database.
  const required = {
    auction: ['budgets', 'deckIndex', 'highestBid', 'openerSeat', 'passed'],
    'sealed-auction': ['budgets', 'deckIndex'],
    'simultaneous-ranking': ['progress'],
    telepathy: ['scores', 'score', 'pairScores', 'pairStreaks', 'streak', 'bestStreak', 'criteria'],
    detective: ['scores', 'clueGiverSeat', 'guesserSeat', 'clue'],
    chameleon: ['scores'],
  };
  append(game, `newData.hasChildren(['deckSize','deckIds'])&&(${Object.entries(required).map(([id, fields]) => `${mode}==='${id}'&&newData.hasChildren(${JSON.stringify(fields)})`).join('||')})`);
  append(game, `newData.hasChild('completionDeck')===newData.hasChild('completionIds')&&(${initial}||newData.hasChild('completionDeck')===data.hasChild('completionDeck'))`);
  append(game, `${has('newData', 'currentCardId')}===(${money}&&${phase}==='playing')&&(${mode}==='auction'?${has('newData', 'bidderSeat')}===(${phase}==='playing')&&${has('newData', 'turnSeat')}===(${phase}==='playing'):true)`);
  append(game, `${mode}==='simultaneous-ranking'?${has('newData', 'rankings')}===(${phase}==='finished'):true`);
  append(game, `${mode}==='chameleon'&&${oneOf(value('newData', 'stage'), ['voting', 'last-guess', 'reveal'])}?newData.hasChild('clues')&&(${oneOf(value('newData', 'stage'), ['last-guess', 'reveal'])}?newData.hasChild('votes'):true):true`);
  append(game, `${mode}==='chameleon'&&${action}==='party-resolve'&&${value('data', 'stage')}==='clues'?newData.child('clues').hasChild(${value('data', 'turnSeat')}):true`);
  append(game, `${reset}||(${['clues', 'caughtSeat'].map(field => `!${has('data', field)}||${has('newData', field)}`).map(check => `(${check})`).join('&&')})`);
  append(game, `${initial}||(${['lastAward',...['p1','p2','p3','p4'].map(seat=>`rosters/${seat}`)].map(field=>`!${has('data',field)}||${has('newData',field)}`).map(check=>`(${check})`).join('&&')})`);
  append(game, `!(${initial})||!newData.hasChild('lastAward')`);

  // Fields from another mode cannot be smuggled into an otherwise valid game.
  for (const field of ['budgets', 'rosters', 'lastAward', 'currentCardId']) append(game[field], oneOf(value('newData.parent()', 'mode'), ['auction', 'sealed-auction']));
  for (const field of ['openerSeat', 'bidderSeat']) append(game[field], `${value('newData.parent()', 'mode')}==='auction'`);
  append(game.turnSeat, oneOf(value('newData.parent()', 'mode'), ['auction', 'chameleon']));
  append(game.caughtSeat, `${value('newData.parent()', 'mode')}==='chameleon'`);
  append(game.scores, oneOf(value('newData.parent()', 'mode'), ['telepathy', 'detective', 'chameleon']));
  append(game.result, 'false');
  // This redundant award list is derived locally from the authoritative rosters.
  game.completionAwards = { '.validate': false };

  const scalarMode = value('newData.parent()', 'mode'), scalarPhase = value('newData.parent()', 'phase');
  const scalarAction = value('newData.parent().parent()', 'lastAction/kind');
  const scalarInitial = `${scalarAction}.matches(/^(start|rematch|next-game)$/)`;
  const firstStage = `${scalarMode}==='auction'?'bidding':${scalarMode}==='detective'?'clue':${scalarMode}==='chameleon'?'clues':'choosing'`;
  const nextStage = `${scalarMode}==='detective'?'clue':${scalarMode}==='chameleon'?'clues':'choosing'`;
  append(game.stage, `${scalarInitial}?newData.val()===(${firstStage}):${scalarAction}==='next'?newData.val()===(${nextStage})&&${scalarPhase}==='playing'&&${oneOf(scalarMode, ['sealed-auction', 'telepathy', 'detective', 'chameleon'])}:true`);
  // Private resolve guards already bind every other mode's stage and phase.
  // Auction public moves additionally need this bid/finished stage invariant.
  append(game.stage, `${scalarMode}==='auction'?newData.val()===(${scalarPhase}==='playing'?'bidding':'finished'):true`);

  // Telepathy questions are immutable ten-element arrays; metadata for another
  // round cannot silently change the question while selections are being locked.
  append(game.criteria, `${value('newData.parent()', 'mode')}==='telepathy'&&newData.hasChildren(['0','1','2','3','4','5','6','7','8','9'])`);
  const criteriaInitial = `${value('newData.parent().parent().parent()', 'lastAction/kind')}.matches(/^(start|rematch|next-game)$/)`;
  const criteriaUnique = Array.from({ length: 10 }, (_, index) => `($key==='${index}'||newData.val()!==newData.parent().child('${index}').val())`).join('&&');
  append(game.criteria.$key, `$key.matches(/^[0-9]$/)&&newData.isNumber()&&newData.val()%1===0&&newData.val()>=0&&newData.val()<${TELEPATHY_QUESTION_COUNT}&&(${criteriaInitial}?${criteriaUnique}:newData.val()===data.val())`);

  // An inverse deck map supplies both uniqueness and complete membership in a
  // single wildcard check, avoiding a quadratic list of comparisons.
  const deckGame = 'newData.parent().parent()', deckMode = value(deckGame, 'mode');
  const deckIndex = `${deckGame}.child('deckIds').child(newData.val()+'').val()`;
  append(game.deck.$index, `${deckIndex}+''===$index`);
  const count = `(${deckMode}==='telepathy'?4:${deckMode}==='detective'?6:${deckMode}==='chameleon'?9:${value(deckGame, 'phase')}==='finished'?0:1)`;
  const size = value(deckGame, 'deckSize'), question = value(deckGame, 'roundIndex');
  const offset = `((${deckIndex}-(${question}*${count}%${size})+${size})%${size})`;
  append(game.deck.$index, `${offset}>=${count}||${deckGame}.child('visibleCards').child(newData.val()+'').val()===${offset}`);
  append(game, `newData.hasChild('visibleCards')===(${oneOf(mode, ['telepathy', 'detective', 'chameleon'])}||${phase}==='playing')`);
  const maximum = `${scalarMode}==='simultaneous-ranking'?10:${scalarMode}==='telepathy'?40:${scalarMode}==='detective'?36:${scalarMode}==='chameleon'?45:${has('newData.parent()', 'seats/2')}?30:20`;
  const minimum = `${scalarMode}==='simultaneous-ranking'?10:${scalarMode}==='telepathy'?4:${scalarMode}==='detective'?6:${scalarMode}==='chameleon'?9:${has('newData.parent()', 'seats/3')}?20:${has('newData.parent()', 'seats/2')}?15:10`;
  append(game.deckSize, `newData.val()>=(${minimum})&&newData.val()<=(${maximum})`);

  const oldStarter = value('data', 'starterSeat');
  const successor = `${oldStarter}==='p1'?newData.hasChild('players/p2')?'p2':'p1':${oldStarter}==='p2'?newData.hasChild('players/p3')?'p3':'p1':${oldStarter}==='p3'?newData.hasChild('players/p4')?'p4':'p1':'p1'`;
  append(room, `newData.child('version').val()!==2||!newData.hasChild('lastAction')||!newData.child('lastAction/kind').val().matches(/^(rematch|next-game)$/)||newData.child('starterSeat').val()===(${successor})`);
}
