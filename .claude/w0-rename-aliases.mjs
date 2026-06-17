// W0: resolve cross-file React hook-alias collisions (golden-rule #1).
// Renames the colliding suffix in ONE file of each pair, word-boundary safe.
import { readFile, writeFile } from 'node:fs/promises';

const plan = {
  'view_palette.jsx': [['useStateCP','useStatePAL'],['useMemoCP','useMemoPAL'],['useEffectCP','useEffectPAL'],['useRefCP','useRefPAL']],
  'view_profit.jsx':  [['useStateF3','useStatePRF'],['useMemoF3','useMemoPRF']],
  'view_sa240.jsx':   [['useStateF','useStateS240'],['useMemoF','useMemoS240']],
  'view_invprop.jsx': [['useStateIP','useStateIVP'],['useMemoIP','useMemoIVP']],
  'view_opening.jsx': [['useStateOB','useStateOPN']],
};

let dry = process.argv.includes('--dry');
for (const [f, pairs] of Object.entries(plan)) {
  const p = 'app/' + f;
  let txt = await readFile(p, 'utf8');
  console.log('--- ' + f + (dry ? ' (dry)' : '') + ' ---');
  for (const [from, to] of pairs) {
    const re = new RegExp('\\b' + from + '\\b', 'g');
    const n = (txt.match(re) || []).length;
    txt = txt.replace(re, to);
    console.log(`  ${from} -> ${to}  (${n} occurrences)`);
  }
  if (!dry) await writeFile(p, txt, 'utf8');
}
console.log(dry ? '\nDRY RUN — no files written.' : '\nDONE — files updated.');
