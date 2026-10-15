/** Private, immutable post-auction ballots; this adds no room-wide write grant. */
export function installAuctionJuryRules(document) {
  const room = "root.child('rooms').child($code)", game = `${room}.child('partyGame')`;
  const jury = "root.child('privateGames').child($code).child($round).child('jury')";
  const seats = ['p1', 'p2', 'p3', 'p4'];
  // Auction budget keys are required to match the immutable original seats.
  // Using that validated map also supports vacant seats after table recovery.
  const isSeat = expression => `(${expression}.matches(/^p[1-4]$/)&&${game}.child('budgets').hasChild(${expression}))`;
  const viewer = `(${seats.map(seat => `(${game}.hasChild('budgets/${seat}')&&${room}.child('players/${seat}/uid').val()===auth.uid)`).join('||')})`;
  const active = `auth!==null&&${room}.child('version').val()===2&&${room}.child('status').val()==='finished'&&${room}.child('mode').val().matches(/^(auction|sealed-auction)$/)&&${game}.child('phase').val()==='finished'&&$round==='r'+${room}.child('round').val()&&root.child('cleanupIndex').child($code).child('state').val()!=='deleting'`;
  const instance = `${room}.child('createdAt').val()`;
  const allLocked = seats.map(seat => `(!${game}.hasChild('budgets/${seat}')||(${jury}.child('${seat}/locked').val()===true&&${jury}.child('${seat}/instance').val()===${instance}))`).join('&&');
  const own = `${room}.child('players').child($seat).child('uid').val()===auth.uid`;
  document.rules.privateGames.$code.$round.jury = {
    '.read': `${active}&&${viewer}&&${allLocked}`,
    $seat: {
      '.read': `${active}&&${isSeat('$seat')}&&${own}&&(!data.exists()||data.child('instance').val()===${instance})`,
      '.write': `${active}&&${isSeat('$seat')}&&${own}&&!data.exists()&&newData.exists()`,
      '.validate': `newData.hasChildren(['instance','targetSeat','locked'])&&newData.child('instance').val()===${instance}&&newData.child('locked').val()===true&&${isSeat("newData.child('targetSeat').val()")}`,
      instance: {}, targetSeat: {},
      locked: { '.read': `${active}&&${viewer}&&${isSeat('$seat')}&&(!data.parent().exists()||data.parent().child('instance').val()===${instance})` },
      '$other': { '.validate': false },
    },
  };
}
