/** A box is drawn on its giver's device. No future or unrevealed card ID is
 * published in rooms. The responder's immutable decision unlocks that ID. */
export function installMysteryBoxRules(document) {
  const room = document.rules.rooms.$code;
  const v = (node, path) => `${node}.child('${path}').val()`;
  const h = (node, path) => `${node}.hasChild('${path}')`;
  const equal = (a, b, fields) => fields.map(field => `${v(a, field)}===${v(b, field)}`).join('&&');
  const integer = (node, min, max) => `${node}.isNumber()&&${node}.val()%1===0&&${node}.val()>=${min}&&${node}.val()<=${max}`;
  const add = (node, key, expression) => { node[key] = `(${node[key]})||(${expression})`; };
  const mode = "newData.val()==='mystery-box'&&newData.parent().parent().child('version').val()===2";
  add(room.mode, '.validate', `${mode}&&(!data.exists()||newData.val()===data.val()||newData.parent().child('lastAction/kind').val().matches(/^(next-game|reset-table)$/))`);
  // The mode leaf is two levels below the room only in a next-game proposal.
  room.mode['.validate'] = room.mode['.validate'].replace(mode, "newData.val()==='mystery-box'&&newData.parent().child('version').val()===2");
  add(room.nextGame.mode, '.validate', mode);
  add(room.lastAction.kind, '.validate', "newData.parent().parent().child('version').val()===2&&newData.val().matches(/^(box-stamp|box-resolve|box-next)$/)");
  const globalRoom = "root.child('rooms').child($code)", globalGame = `${globalRoom}.child('boxGame')`;
  const privateBase = (round, question) => `root.child('privateGames').child($code).child('r'+${round}).child('box')`;
  const action = v('newData.parent()', 'lastAction/kind'), actor = v('newData.parent()', 'lastAction/seat');
  const initial = `${action}.matches(/^(start|rematch|next-game)$/)`, frozen = `${action}.matches(/^(join|propose-next|ready-next)$/)`;
  const sameTurn = equal('newData', 'data', ['roundIndex', 'giverSeat', 'responderSeat']);
  const oldQuestion = "'q'+data.child('roundIndex').val()";
  const secrets = privateBase(v('newData.parent()', 'round'));
  const dealt = `${secrets}.child('deals').child(${oldQuestion})`, locked = `${secrets}.child('decisions').child(${oldQuestion})`;
  const stage = v('newData', 'stage'), phase = v('newData', 'phase');
  const base = [
    "newData.hasChildren(['mode','starterSeat','giverSeat','responderSeat','phase','stage','roundIndex','counts'])",
    "newData.child('mode').val()==='mystery-box'", "newData.parent().child('mode').val()==='mystery-box'", "newData.parent().child('version').val()===2",
    "!newData.parent().hasChild('players/p3')", "newData.parent().hasChild('players/p2')",
    `${phase}===newData.parent().child('status').val()`,
    "newData.child('starterSeat').val()===newData.parent().child('starterSeat').val()",
    "newData.child('giverSeat').val()===(newData.child('roundIndex').val()%2===0?newData.child('starterSeat').val():newData.child('starterSeat').val()==='p1'?'p2':'p1')",
    "newData.child('responderSeat').val()===(newData.child('giverSeat').val()==='p1'?'p2':'p1')",
    `newData.hasChild('stamp')===(${stage}!=='stamp')`,
    `newData.hasChild('results')===(newData.child('roundIndex').val()>0||${stage}==='reveal'||${stage}==='finished')`,
  ].join('&&');
  const transitions = [
    `${initial}&&newData.child('roundIndex').val()===0&&${stage}==='stamp'&&${phase}==='playing'`,
    `${frozen}&&${equal('newData', 'data', ['roundIndex','giverSeat','responderSeat','phase','stage','stamp'])}`,
    `${action}==='box-stamp'&&data.child('stage').val()==='stamp'&&${stage}==='decision'&&${phase}==='playing'&&${sameTurn}&&${actor}===data.child('giverSeat').val()&&${dealt}.child('instance').val()===newData.parent().child('createdAt').val()`,
    `${action}==='box-resolve'&&data.child('stage').val()==='decision'&&${sameTurn}&&newData.child('stamp').val()===data.child('stamp').val()&&${stage}===(data.child('roundIndex').val()===9?'finished':'reveal')&&${phase}===(data.child('roundIndex').val()===9?'finished':'playing')&&${locked}.child('locked').val()===true`,
    `${action}==='box-next'&&data.child('stage').val()==='reveal'&&${stage}==='stamp'&&${phase}==='playing'&&newData.child('roundIndex').val()===data.child('roundIndex').val()+1`,
  ];
  room.boxGame = { '.validate': `${base}&&(${transitions.map(row => `(${row})`).join('||')})`,
    mode: {}, starterSeat: {}, giverSeat: {}, responderSeat: {}, phase: {}, stage: {},
    roundIndex: { '.validate': integer('newData', 0, 9) },
    stamp: { '.validate': "newData.isString()&&newData.val().matches(/^(gold|risk|trash)$/)" },
    '$other': { '.validate': false },
  };
  const game = room.boxGame;
  const countGame = 'newData.parent().parent()', countOld = 'data.parent().parent()';
  const countAction = v(`${countGame}.parent()`, 'lastAction/kind');
  const latest = `${countGame}.child('results').child('r'+(${v(countOld, 'roundIndex')}+1))`;
  game.counts = { '.validate': "newData.hasChildren(['p1','p2'])", '$seat': {
    '.validate': `$seat.matches(/^p[12]$/)&&${integer('newData', 0, 5)}&&(${countAction}.matches(/^(start|rematch|next-game)$/)?newData.val()===0:${countAction}==='box-resolve'?newData.val()===data.val()+(${latest}.child('ownerSeat').val()===$seat?1:0):newData.val()===data.val())`,
  } };
  const resultsGame = 'newData.parent()', resultsTotal = `(${v(resultsGame, 'roundIndex')}+(${v(resultsGame, 'stage')}.matches(/^(reveal|finished)$/)?1:0))`;
  const rowGame = 'newData.parent().parent()', rowOld = 'data.parent().parent()', rowRoom = `${rowGame}.parent()`;
  const rowSecret = privateBase(v(rowRoom, 'round'));
  const rowQuestion = "'q'+data.parent().parent().child('roundIndex').val()";
  const rowDeal = `${rowSecret}.child('deals').child(${rowQuestion})`, rowDecision = `${rowSecret}.child('decisions').child(${rowQuestion})`;
  const resultCheck = `data.exists()?${equal('newData', 'data', ['cardId','decision','stamp','ownerSeat'])}:$result==='r'+(${v(rowOld, 'roundIndex')}+1)&&${v(rowRoom, 'lastAction/kind')}==='box-resolve'&&newData.child('cardId').val()===${rowDeal}.child('cardId').val()&&newData.child('decision').val()===${rowDecision}.child('decision').val()&&newData.child('stamp').val()===${v(rowOld, 'stamp')}&&newData.child('ownerSeat').val()===(newData.child('decision').val()==='take'?${v(rowOld, 'responderSeat')}:${v(rowOld, 'giverSeat')})`;
  game.results = { '.validate': Array.from({ length: 10 }, (_, i) => `newData.hasChild('r${i + 1}')===(${resultsTotal}>=${i + 1})`).join('&&'),
    '$result': { '.validate': `$result.matches(/^r([1-9]|10)$/)&&newData.hasChildren(['cardId','decision','stamp','ownerSeat'])&&(${resultCheck})`,
      cardId: {}, decision: {}, stamp: {}, ownerSeat: {}, '$other': { '.validate': false } } };

  const member = `(${v(globalRoom, 'players/p1/uid')}===auth.uid||${v(globalRoom, 'players/p2/uid')}===auth.uid)`;
  const current = `auth!==null&&${member}&&${v(globalRoom, 'version')}===2&&${v(globalRoom, 'mode')}==='mystery-box'&&$round==='r'+${v(globalRoom, 'round')}&&$question==='q'+${v(globalGame, 'roundIndex')}&&root.child('cleanupIndex').child($code).child('state').val()!=='deleting'`;
  const isGiver = `${globalRoom}.child('players').child(${v(globalGame, 'giverSeat')}).child('uid').val()===auth.uid`;
  const isResponder = `${globalRoom}.child('players').child(${v(globalGame, 'responderSeat')}).child('uid').val()===auth.uid`;
  const canonical = "root.child('privateGames').child($code).child($round).child('box')";
  const decision = `${canonical}.child('decisions').child($question)`, deal = `${canonical}.child('deals').child($question)`;
  const commonShape = `newData.child('instance').val()===${v(globalRoom, 'createdAt')}&&newData.child('roundIndex').val()===${v(globalGame, 'roundIndex')}`;
  const active = `${v(globalRoom, 'status')}==='playing'`;
  const privateBox = document.rules.privateGames.$code.$round.box = {
    deals: { '$question': {
      '.read': `${current}&&(${isGiver}||${decision}.child('locked').val()===true)`,
      '.write': `${current}&&${active}&&${isGiver}&&${v(globalGame, 'stage')}==='stamp'&&!data.exists()&&newData.exists()`,
      '.validate': `newData.hasChildren(['instance','roundIndex','cardId'])&&${commonShape}`,
      instance: {}, roundIndex: {}, cardId: { '.validate': `${integer('newData', 1, 1000000)}&&${Array.from({ length: 10 }, (_, i) => `newData.val()!==${v(globalGame, `results/r${i + 1}/cardId`)}`).join('&&')}` },
      '$other': { '.validate': false },
    } },
    decisions: { '$question': {
      '.read': `${current}&&(${isResponder}||data.child('locked').val()===true)`,
      '.write': `${current}&&${active}&&${isResponder}&&${v(globalGame, 'stage')}==='decision'&&!data.exists()&&newData.exists()&&${deal}.child('instance').val()===${v(globalRoom, 'createdAt')}`,
      '.validate': `newData.hasChildren(['instance','roundIndex','decision','locked'])&&${commonShape}&&newData.child('locked').val()===true`,
      instance: {}, roundIndex: {}, locked: { '.read': current }, decision: {
        '.validate': `newData.isString()&&newData.val().matches(/^(take|reject)$/)&&${globalGame}.child('counts').child(newData.val()==='take'?${v(globalGame, 'responderSeat')}:${v(globalGame, 'giverSeat')}).val()<5`,
      }, '$other': { '.validate': false },
    } }, '$other': { '.validate': false },
  };
  // This field is intentionally never allowed in the original game namespaces.
  if (!privateBox.deals || !privateBox.decisions) throw new Error('Incomplete box privacy rules.');
}
