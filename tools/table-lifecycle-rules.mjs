/** Host-only reset. Each surviving identity is an ordered subset of the old table. */
export function installTableLifecycleRules(document) {
  const room=document.rules.rooms.$code;
  const val=(node,path)=>`${node}.child('${path}').val()`;
  const same=(target,source)=>['uid','name'].map(field=>`${val('newData',`players/${target}/${field}`)}===${val('data',`players/${source}/${field}`)}`).join('&&');
  const match=(target,source)=>`(${same(target,source)})`;
  const reset=[
    "auth!==null", "data.child('version').val()===2", "newData.child('version').val()===2",
    "root.child('cleanupIndex').child($code).child('state').val()!=='deleting'",
    "auth.uid===data.child('ownerUid').val()", "auth.uid===data.child('players/p1/uid').val()",
    "newData.child('lastAction/kind').val()==='reset-table'", "newData.child('lastAction/seat').val()==='p1'",
    "newData.child('revision').val()===data.child('revision').val()+1",
    "newData.child('round').val()===data.child('round').val()+1",
    "newData.child('status').val()==='waiting'", "newData.child('starterSeat').val()==='p1'",
    "!newData.hasChild('game')", "!newData.hasChild('partyGame')", "!newData.hasChild('nextGame')",
    match('p1','p1'),
    `(!newData.hasChild('players/p2')||${['p2','p3','p4'].map(source=>match('p2',source)).join('||')})`,
    `(!newData.hasChild('players/p3')||(${match('p3','p3')}&&${match('p2','p2')})||(${match('p3','p4')}&&(${match('p2','p2')}||${match('p2','p3')})))`,
    `(!newData.hasChild('players/p4')||(${match('p4','p4')}&&${match('p2','p2')}&&${match('p3','p3')}))`,
  ].join('&&');
  room['.write']=`(${room['.write']})||(${reset})`;
  // Permission is granted only by the complete reset branch above. These leaf
  // exceptions allow its new configuration; unchanged ordinary actions keep
  // their existing configuration guards.
  for(const field of ['datasetId','mode','bracketSize']){
    room[field]['.validate']=room[field]['.validate'].replaceAll("newData.parent().child('lastAction/kind').val()==='next-game'","(newData.parent().child('lastAction/kind').val()==='next-game'||newData.parent().child('lastAction/kind').val()==='reset-table')");
  }
  room['.validate']=`(${room['.validate']})&&(newData.child('version').val()!==2||(newData.child('mode').val()==='bracket'?newData.hasChild('bracketSize'):!newData.hasChild('bracketSize')))`;
  room.lastAction.kind['.validate']+="||(newData.parent().parent().child('version').val()===2&&newData.val()==='reset-table')";
  // Losing a seat must not revoke the connection's own cleanup. Transactions
  // need its read permission, and onDisconnect rechecks the delete permission
  // after membership may already have been revoked. New writes remain guarded
  // by the original membership rule; this exception can only remove own data.
  const connection=document.rules.presence.$code.$uid.$connection;
  const ownConnection="auth!==null&&auth.uid===$uid";
  connection['.read']=ownConnection;
  connection['.write']=`(${connection['.write']})||(${ownConnection}&&!newData.exists())`;
}
