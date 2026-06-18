// W8 verification — drive the REAL proxy chain end-to-end over the network:
// env → readLlmConfig → redactFindings → buildNarrationPrompt → complete (real fetch to
// the mock upstream :9999). Proves config + redaction + provider + parse, with real HTTP.
import { readLlmConfig } from '../server/src/llm/config';
import { redactFindings, buildNarrationPrompt, type InboundFinding } from '../server/src/llm/redact';
import { complete } from '../server/src/llm/providers';

const cfg = readLlmConfig();
if (!cfg) { console.error('FAIL: no config (LLM_API_KEY unset)'); process.exit(1); }
console.log('config:', { provider: cfg.provider, compat: cfg.compat, baseUrl: cfg.baseUrl, model: cfg.model });

// A finding carrying SMUGGLED identifiers that must NOT reach the upstream.
const dirty = [
  { id: 'jet-concentration', detector: 'jet', sev: 'high', std: 'SA 240 ¶32', title: '5 jurnal manual ≥3 kriteria risiko', detail: 'Konsentrasi flag pada jurnal manual.', suggestedProcedure: 'Telaah otorisasi tiap entri.',
    clientName: 'PT RAHASIA SEKALI', npwp: '09.876.543.2-100.000', wtbRows: [{ code: '4000', amount: 12345 }] },
  { id: 'bt-perm', detector: 'bookTax', sev: 'med', std: 'PSAK 46', title: 'Beda permanen signifikan', detail: 'Beda permanen besar.' },
] as unknown as InboundFinding[];

const safe = redactFindings(dirty);
const { system, user } = buildNarrationPrompt(safe);

// Egress assertion: the smuggled identifiers must be gone from the outgoing prompt.
const leaked = ['PT RAHASIA SEKALI', '09.876.543.2-100.000', 'wtbRows', '12345'].filter((s) => (system + user).includes(s));
console.log('egress leak check:', leaked.length === 0 ? 'PASS (no identifiers in prompt)' : `FAIL leaked=${leaked}`);

const res = await complete(cfg, { system, user });
console.log('upstream returned text:\n  ', res.text);
console.log('usage:', res.usage);
console.log(res.text && leaked.length === 0 ? '\n✅ W8 proxy chain OK' : '\n❌ W8 proxy chain FAILED');
