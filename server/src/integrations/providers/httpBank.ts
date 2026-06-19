// W9 Fase 2 — Bank Feed provider, HTTP adapter (drop-in for the fixture). Implements the same
// `BankPullFn` shape over `fetch` (nol-vendor, like the LLM proxy), so the runner is unchanged
// whether the bytes come from a fixture or a real bank OpenAPI. Config lives in server env; with
// no env set readBankHttpConfig() returns null and the runner falls back to the fixture (the
// graceful not-configured path). NOT smoke-tested against a live endpoint — real BCA/Mandiri
// OpenAPI needs merchant onboarding + an mTLS client cert (W9 §5); only the shape is proven here,
// against a mock fetch, exactly as W8 proved the LLM adapter before a real provider.
import type { BankPullFn, RawBankRecord, StatementPull } from './bankFixture';

export interface BankHttpConfig {
  baseUrl: string;
  token: string;
  accountNo?: string;
}

/** Resolve the HTTP bank config from env, or null when unset (→ fixture fallback). */
export function readBankHttpConfig(env: NodeJS.ProcessEnv = process.env): BankHttpConfig | null {
  const baseUrl = (env.BANK_API_BASE_URL ?? '').trim();
  const token = (env.BANK_API_TOKEN ?? '').trim();
  if (!baseUrl || !token) return null;
  return { baseUrl, token, accountNo: (env.BANK_API_ACCOUNT ?? '').trim() || undefined };
}

export function bankHttpConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return readBankHttpConfig(env) !== null;
}

/**
 * Build a BankPullFn that fetches a real statement. `fetchImpl` is injected so tests exercise the
 * shape without a key or network. The bank's response is expected to carry opening/closing balance
 * and an array of raw records keyed by the provider's field names — the same shape the fixture
 * emits, so mapping.ts + sync.ts treat both identically.
 */
export function makeHttpBankPull(cfg: BankHttpConfig, fetchImpl: typeof fetch = fetch): BankPullFn {
  return async (): Promise<StatementPull> => {
    // mTLS NOTE: a production BCA/Mandiri OpenAPI call attaches a client certificate via an undici
    // Agent/dispatcher here. Omitted in the skeleton (token-only) — this is the drop-in seam, not a
    // credentialed integration.
    const url = `${cfg.baseUrl}/statements${cfg.accountNo ? `?account=${encodeURIComponent(cfg.accountNo)}` : ''}`;
    const res = await fetchImpl(url, {
      method: 'GET',
      headers: { authorization: `Bearer ${cfg.token}`, accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`bank HTTP ${res.status}`);
    const data = (await res.json()) as {
      opening_balance?: number;
      closing_balance?: number;
      transactions?: RawBankRecord[];
    };
    return {
      openingBalance: Number(data.opening_balance ?? 0),
      closingBalance: Number(data.closing_balance ?? 0),
      raw: (data.transactions ?? []).map((r) => ({ ...r })),
    };
  };
}
