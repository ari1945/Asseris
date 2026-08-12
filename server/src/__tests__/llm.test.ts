import { describe, it, expect, afterAll, afterEach, vi } from 'vitest';
import type { User } from '@prisma/client';
import { appRouter } from '../router';
import { createCallerFactory } from '../trpc';
import { prisma } from '../db';
import { redactFindings, redactFindingsWithReport, buildNarrationPrompt, type InboundFinding } from '../llm/redact';
import { complete } from '../llm/providers';
import { readLlmConfig } from '../llm/config';
import { rateLimit, resetRateLimits } from '../llm/ratelimit';
import { resetLlmConsents } from '../llm/consent';

// Same injection trick as authz.test.ts — RBAC/usage gates read only ctx.user.{id,role}.
function callerAs(role: string, id = `U-${role}`) {
  const user = { id, role, email: `${id}@test` } as unknown as User;
  return createCallerFactory(appRouter)({ user, token: 'test' });
}
const anon = createCallerFactory(appRouter)({ user: null, token: null });

async function completeWithConsent(caller: ReturnType<typeof callerAs>, findings: InboundFinding[]) {
  const preview = await caller.llm.preview({ task: 'narrate-diagnostics', findings });
  return caller.llm.complete({
    task: 'narrate-diagnostics', findings, consent: true, consentId: preview.consentId,
  });
}

// A fetch double that records the outgoing request and returns a canned provider response.
function mockFetch(body: unknown, ok = true, status = 200) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fn = vi.fn(async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return {
      ok, status,
      json: async () => body,
      text: async () => JSON.stringify(body),
    } as Response;
  });
  return { fn: fn as unknown as typeof fetch, calls };
}

const ANTHROPIC_OK = { content: [{ type: 'text', text: 'Narasi ringkas temuan.' }], usage: { input_tokens: 120, output_tokens: 40 } };
const OPENAI_OK = { choices: [{ message: { content: 'Ringkasan OpenAI-compat.' } }], usage: { prompt_tokens: 90, completion_tokens: 30 } };

const SAMPLE: InboundFinding[] = [
  { id: 'jet-concentration', detector: 'jet', sev: 'high', std: 'SA 240 ¶32', title: '5 jurnal manual ≥3 kriteria', detail: 'Konsentrasi flag.', suggestedProcedure: 'Telaah otorisasi.' },
  { id: 'bt-perm', detector: 'bookTax', sev: 'med', std: 'PSAK 46', title: 'Beda permanen signifikan', detail: 'Total beda permanen.' },
];

const ENV_KEYS = ['LLM_API_KEY', 'LLM_PROVIDER', 'LLM_MODEL', 'LLM_BASE_URL'] as const;
function clearEnv() {
  for (const k of ENV_KEYS) delete process.env[k];
}

afterEach(() => {
  vi.restoreAllMocks();
  resetRateLimits();
  resetLlmConsents();
  clearEnv();
});

afterAll(async () => {
  await prisma.llmEvent.deleteMany({ where: { userId: { startsWith: 'U-' } } });
  await prisma.$disconnect();
});

// ---------------------------------------------------------------------------
describe('config (key in env, never client)', () => {
  it('returns null when no key is set → the not-configured signal', () => {
    clearEnv();
    expect(readLlmConfig({} as NodeJS.ProcessEnv)).toBeNull();
  });

  it('resolves Anthropic by default and maps OpenAI-compat providers', () => {
    expect(readLlmConfig({ LLM_API_KEY: 'k' } as NodeJS.ProcessEnv)).toMatchObject({ provider: 'anthropic', compat: 'anthropic' });
    expect(readLlmConfig({ LLM_API_KEY: 'k', LLM_PROVIDER: 'deepseek' } as NodeJS.ProcessEnv)).toMatchObject({ compat: 'openai', baseUrl: 'https://api.deepseek.com/v1' });
  });
});

// ---------------------------------------------------------------------------
describe('redaction (egress boundary)', () => {
  it('drops every key outside the finding allow-list', () => {
    const dirty = [{ ...SAMPLE[0], clientName: 'PT Rahasia', npwp: '01.234.567.8-901.000', wtbRows: [{ a: 1 }], party: 'PT Afiliasi' } as unknown as InboundFinding];
    const safe = redactFindings(dirty);
    const keys = Object.keys(safe[0]);
    expect(keys.sort()).toEqual(['detail', 'detector', 'id', 'sev', 'std', 'suggestedProcedure', 'title']);
    const serialized = JSON.stringify(safe);
    expect(serialized).not.toContain('PT Rahasia');
    expect(serialized).not.toContain('01.234.567.8-901.000');
    expect(serialized).not.toContain('wtbRows');
  });

  it('builds a server-owned prompt containing only finding text', () => {
    const { system, user } = buildNarrationPrompt(redactFindings(SAMPLE));
    expect(system).toContain('Kantor Akuntan Publik');
    expect(user).toContain('5 jurnal manual ≥3 kriteria');
    expect(user).toContain('SA 240 ¶32');
  });

  it('semantically redacts nominal, journal id, NPWP, and party names embedded in prose', () => {
    const dirty: InboundFinding[] = [{
      ...SAMPLE[0],
      title: 'AJE-05 milik PT Rahasia senilai Rp 2.000.000',
      detail: 'NPWP 01.234.567.8-901.000 dibayar kepada Dewi Anggraini.',
    }];
    const { findings, redactions } = redactFindingsWithReport(dirty);
    const serialized = JSON.stringify(findings);
    expect(serialized).toContain('[ID_JURNAL]');
    expect(serialized).toContain('[NOMINAL]');
    expect(serialized).toContain('[NPWP]');
    expect(serialized).toContain('[NAMA_PIHAK]');
    expect(serialized).not.toMatch(/AJE-05|PT Rahasia|2\.000\.000|Dewi Anggraini/);
    expect(redactions).toEqual({ nominal: 1, journalId: 1, npwp: 1, partyName: 2 });
  });
});

// ---------------------------------------------------------------------------
describe('provider adaptors (mock fetch — no key, no network)', () => {
  it('Anthropic → POST /messages with x-api-key, parses content', async () => {
    const m = mockFetch(ANTHROPIC_OK);
    const cfg = readLlmConfig({ LLM_API_KEY: 'secret-key' } as NodeJS.ProcessEnv)!;
    const res = await complete(cfg, { system: 's', user: 'u' }, m.fn);
    expect(res.text).toBe('Narasi ringkas temuan.');
    expect(res.usage).toEqual({ input: 120, output: 40 });
    expect(m.calls[0].url).toBe('https://api.anthropic.com/v1/messages');
    expect((m.calls[0].init.headers as Record<string, string>)['x-api-key']).toBe('secret-key');
  });

  it('OpenAI-compat → POST /chat/completions with Bearer, parses choices', async () => {
    const m = mockFetch(OPENAI_OK);
    const cfg = readLlmConfig({ LLM_API_KEY: 'k', LLM_PROVIDER: 'deepseek' } as NodeJS.ProcessEnv)!;
    const res = await complete(cfg, { system: 's', user: 'u' }, m.fn);
    expect(res.text).toBe('Ringkasan OpenAI-compat.');
    expect(m.calls[0].url).toBe('https://api.deepseek.com/v1/chat/completions');
    expect((m.calls[0].init.headers as Record<string, string>).authorization).toBe('Bearer k');
  });

  it('non-2xx upstream → throws (caller maps to generic error; key never surfaced)', async () => {
    const m = mockFetch({ error: 'bad' }, false, 401);
    const cfg = readLlmConfig({ LLM_API_KEY: 'k' } as NodeJS.ProcessEnv)!;
    await expect(complete(cfg, { system: 's', user: 'u' }, m.fn)).rejects.toThrow(/401/);
  });
});

// ---------------------------------------------------------------------------
describe('rate limit (per-user fixed window)', () => {
  it('allows up to max then blocks until the window resets', () => {
    let t = 1_000_000;
    const now = () => t;
    expect(rateLimit('U-rl', { max: 2, windowMs: 1000, now }).ok).toBe(true);
    expect(rateLimit('U-rl', { max: 2, windowMs: 1000, now }).ok).toBe(true);
    const blocked = rateLimit('U-rl', { max: 2, windowMs: 1000, now });
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
    t += 1001; // window elapsed
    expect(rateLimit('U-rl', { max: 2, windowMs: 1000, now }).ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
describe('llm router (auth + RBAC + degradation + egress)', () => {
  it('anonymous → UNAUTHORIZED', async () => {
    await expect(anon.llm.status()).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    await expect(anon.llm.preview({ task: 'narrate-diagnostics', findings: SAMPLE })).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    await expect(anon.llm.complete({ task: 'narrate-diagnostics', findings: SAMPLE, consent: true, consentId: 'x'.repeat(16) })).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('no key set → status.configured=false and complete returns not-configured (graceful)', async () => {
    clearEnv();
    const st = await callerAs('Audit Manager').llm.status();
    expect(st.configured).toBe(false);
    expect(st.canUse).toBe(true);
    const r = await completeWithConsent(callerAs('Audit Manager', 'U-nc'), SAMPLE);
    expect(r).toEqual({ status: 'not-configured' });
  });

  it('deny-by-default: an unknown/unprivileged role → FORBIDDEN', async () => {
    process.env.LLM_API_KEY = 'k';
    await expect(
      callerAs('Observer', 'U-obs').llm.preview({ task: 'narrate-diagnostics', findings: SAMPLE }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('refuses provider egress without a matching, one-use preview consent receipt', async () => {
    process.env.LLM_API_KEY = 'k';
    const caller = callerAs('Audit Manager', 'U-consent');
    await expect(caller.llm.complete({
      task: 'narrate-diagnostics', findings: SAMPLE, consent: true, consentId: 'x'.repeat(16),
    })).rejects.toMatchObject({ code: 'PRECONDITION_FAILED' });
    const preview = await caller.llm.preview({ task: 'narrate-diagnostics', findings: SAMPLE });
    const changed = [{ ...SAMPLE[0], title: 'payload changed' }];
    await expect(caller.llm.complete({
      task: 'narrate-diagnostics', findings: changed, consent: true, consentId: preview.consentId,
    })).rejects.toMatchObject({ code: 'PRECONDITION_FAILED' });
  });

  it('configured + granted role → narration text, and egress carries no smuggled identifiers', async () => {
    process.env.LLM_API_KEY = 'k';
    const m = mockFetch(ANTHROPIC_OK);
    vi.stubGlobal('fetch', m.fn);
    const dirty = [{ ...SAMPLE[0], title: 'AJE-05 PT Rahasia Rp 2.000.000', detail: 'NPWP 01.234.567.8-901.000' }] as InboundFinding[];
    const r = await completeWithConsent(callerAs('Junior Auditor', 'U-jr'), dirty);
    expect(r).toMatchObject({ status: 'ok', text: 'Narasi ringkas temuan.', provider: 'anthropic' });
    const sentBody = String(m.calls[0].init.body);
    expect(sentBody).not.toContain('PT Rahasia');
    expect(sentBody).not.toContain('01.234.567.8-901.000');
    expect(sentBody).not.toContain('2.000.000');
    expect(sentBody).toContain('[NOMINAL]');
    vi.unstubAllGlobals();
  });

  it('records a NARRATE usage event (audit trail, usage not content)', async () => {
    process.env.LLM_API_KEY = 'k';
    const m = mockFetch(ANTHROPIC_OK);
    vi.stubGlobal('fetch', m.fn);
    await completeWithConsent(callerAs('Senior Auditor', 'U-audit'), SAMPLE);
    vi.unstubAllGlobals();
    const ev = await prisma.llmEvent.findFirst({ where: { userId: 'U-audit', kind: 'NARRATE' } });
    expect(ev).not.toBeNull();
    expect(ev?.provider).toBe('anthropic');
    expect(ev?.detail).toContain('findings=2');
  });
});
