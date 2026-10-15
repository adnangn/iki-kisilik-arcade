import { transformRuleExpression } from './compact-rule-expressions.mjs';

/** Exact anchored alternatives for groups of literal string comparisons. */
export function compactLiteralAlternatives(document) {
  function visit(tree) {
    for(const [key,value] of Object.entries(tree)) {
      if(key.startsWith('.')&&typeof value==='string') tree[key]=transformRuleExpression(value,node=>{
        if(node.kind!=='or')return node;
        const groups=new Map();
        for(const item of node.items) {
          const match=item.kind==='atom'&&item.value.match(/^(.+)==='([A-Za-z0-9-]+)'$/);
          if(!match)continue;
          const group=groups.get(match[1])||[];
          group.push({item,literal:match[2]});groups.set(match[1],group);
        }
        const replacements=new Map(),removed=new Set();
        for(const [expression,group] of groups)if(group.length>=3) {
          const regex=`${expression}.matches(/^(${group.map(entry=>entry.literal).join('|')})$/)`;
          if(regex.length>=group.map(entry=>entry.item.value).join('||').length)continue;
          replacements.set(group[0].item,{kind:'atom',value:regex});
          for(const entry of group.slice(1))removed.add(entry.item);
        }
        return {...node,items:node.items.filter(item=>!removed.has(item)).map(item=>replacements.get(item)||item)};
      });
      else if(value&&typeof value==='object')visit(value);
    }
  }
  visit(document);return document;
}
