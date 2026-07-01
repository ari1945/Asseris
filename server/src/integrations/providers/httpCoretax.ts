// W9·2 Fase 2 — Coretax / e-Faktur provider, HTTP adapter (drop-in for the fixture). Implements the
// same `TaxPullFn` shape over `fetch` (nol-vendor), so the runner is unchanged whether the bytes come
// from a fixture or the real DJP Coretax OpenAPI. Config lives in server env; with no env set
// readCoretaxHttpConfig() returns null and the runner falls back to the fixture (the graceful
// not-configured path). NOT smoke-tested against a live endpoint — real Coretax needs a PKP
// Sertifikat Elektronik / OAuth client registration (W9 §5); only the shape is proven here, against
// a mock fetch, exactly as the Bank Feed proved its adapter before a real provider.
import type { TaxPullFn, RawTaxRecord, TaxFeedPull } from './coretaxFixture';

export interface CoretaxHttpConfig {
  baseUrl: string;
  token: string;
  taxPeriod?: string;
}

/** Resolve the HTTP Coretax config from env, or null when unset (→ fixture fallback). */
export function readCoretaxHttpConfig(env: NodeJS.ProcessEnv = process.env): CoretaxHttpConfig | null {
  const baseUrl = (env.CORETAX_API_BASE_URL ?? '').trim();
  const token = (env.CORETAX_API_TOKEN ?? '').trim();
  if (!baseUrl || !token) return null;
  return { baseUrl, token, taxPeriod: (env.CORETAX_API_PERIOD ?? '').trim() || undefined };
}

export function coretaxHttpConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return readCoretaxHttpConfig(env) !== null;
}

/**
 * Build a TaxPullFn that fetches a real e-Faktur feed. `fetchImpl` is injected so tests exercise the
 * shape without credentials or network. Coretax's response is expected to carry the declared SPT VAT
 * total + an array of raw records keyed by the provider's field names — the same shape the fixture
 * emits, so mapping.ts + sync.ts treat both identically.
 */
export function makeHttpCoretaxPull(cfg: CoretaxHttpConfig, fetchImpl: typeof fetch = fetch): TaxPullFn {
  return async (): Promise<TaxFeedPull> => {
    // OAuth/cert NOTE: a production Coretax call attaches the PKP OAuth bearer + electronic
    // certificate here. Omitted in the skeleton (token-only) — this is the drop-in seam, not a
    // credentialed integration.
    const url = `${cfg.baseUrl}/efaktur/keluaran${cfg.taxPeriod ? `?period=${encodeURIComponent(cfg.taxPeriod)}` : ''}`;
    const res = await fetchImpl(url, {
      method: 'GET',
      headers: { authorization: `Bearer ${cfg.token}`, accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`coretax HTTP ${res.status}`);
    const data = (await res.json()) as {
      declared_vat_total?: number;
      tax_period?: string;
      invoices?: RawTaxRecord[];
    };
    return {
      declaredVatTotal: Number(data.declared_vat_total ?? 0),
      taxPeriod: String(data.tax_period ?? cfg.taxPeriod ?? ''),
      raw: (data.invoices ?? []).map((r) => ({ ...r })),
    };
  };
}
