import test from 'node:test';
import assert from 'node:assert/strict';
import {compactLiteralAlternatives} from '../tools/compact-literal-alternatives.mjs';

// Model RTDB's string.matches operation for small permission expressions. The
// emulator suite separately compiles and exercises the actual generated rules.
function evaluate(source,mode,allowed=false){
  const js=source.replace(/\b(mode|action)\.matches\((\/[^\n]+?\/)\)/g,'(typeof $1==="string"&&$2.test($1))');
  return Function('mode','action','allowed',`return ${js}`)(mode,mode,allowed);
}
test('literal compaction keeps exact membership, types, anchors and other permission branches',()=>{
  const source="mode==='auction'||mode==='sealed-auction'||mode==='telepathy'||allowed";
  const document={rules:{'.write':source}};
  compactLiteralAlternatives(document);
  assert.ok(document.rules['.write'].length<source.length);
  for(const value of ['auction','sealed-auction','telepathy','xauction','auctionx','Auction','',null,undefined,0,{},true])
    for(const allowed of [false,true])assert.equal(evaluate(document.rules['.write'],value,allowed),evaluate(source,value,allowed));
});
test('literal compaction leaves regex metacharacters, numeric comparisons and different operands alone',()=>{
  const source="mode==='a.b'||mode==='a+b'||mode==='a*b'||action==='auction'||mode===3||mode==='3'";
  const document={rules:{'.validate':source}};
  compactLiteralAlternatives(document);
  for(const value of ['a.b','axb','a+b','ab','a*b','auction',3,'3',null])
    assert.equal(evaluate(document.rules['.validate'],value),evaluate(source,value));
});
