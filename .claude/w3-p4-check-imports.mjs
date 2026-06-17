import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from '../migration/node_modules/@babel/parser/lib/index.js';
import _traverse from '../migration/node_modules/@babel/traverse/lib/index.js';
const traverse = _traverse.default || _traverse;
const SRC = 'migration/src';
const HOOKS = new Set(['useNav','useFirm','useAudit','useAuth','useNavFrom','useEvidence']);
function hookOf(test){ if(!test||test.type!=='BinaryExpression')return null; const f=(a,b)=> a.type==='UnaryExpression'&&a.operator==='typeof'&&a.argument.type==='Identifier'&&HOOKS.has(a.argument.name)&&b.type==='StringLiteral'&&b.value==='function'?a.argument.name:null; return f(test.left,test.right)||f(test.right,test.left); }
let bad=0;
for(const f of readdirSync(SRC).filter(x=>x.endsWith('.jsx')||x.endsWith('.js'))){
  const code=readFileSync(join(SRC,f),'utf8'); let ast;
  try{ast=parse(code,{sourceType:'module',plugins:['jsx']});}catch(e){continue;}
  const imported=new Set(); const need=new Set();
  traverse(ast,{
    ImportDeclaration(p){ for(const s of p.node.specifiers) if(s.imported||s.local) imported.add((s.imported&&s.imported.name)||s.local.name); },
    ConditionalExpression(p){ const h=hookOf(p.node.test); const c=p.node.consequent; if(h&&c.type==='CallExpression'&&c.callee.type==='Identifier'&&c.callee.name===h&&c.arguments.length===0) need.add(h); },
  });
  for(const h of need) if(!imported.has(h)){ console.log(`MISSING IMPORT: ${f} uses ${h} in guard but does not import it`); bad++; }
}
console.log(bad? `\n${bad} files need an import added BEFORE collapsing` : '\nAll guarded hooks are imported — safe to collapse.');
