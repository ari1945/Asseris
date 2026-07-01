// W9·2 Fase 1 — Coretax / e-Faktur provider, FIXTURE adapter. Returns deterministic raw e-Faktur
// records (named with the provider's own field keys — taxpayer_id/invoice_number/… — as the DJP
// Coretax OpenAPI would), so the mapping engine has real source→target work to do. The HTTP adapter
// (httpCoretax.ts) implements the same `TaxPullFn` shape over `fetch` + Bearer and is a drop-in swap
// — the runner is provider-agnostic. No external call, no Sertifikat Elektronik: the pipeline is
// provable end-to-end here, mirroring how the Bank Feed proved itself against a fixture first.
//
// The five rows are byte-faithful to the OUTPUT-VAT (Keluaran) invoices in migration/src EFAKTUR,
// so the posted control total (Σ PPN Keluaran = 443_300_000) matches the canon controlTotal('coretax')
// the Integrasi cockpit shows — the server figure and the simulated blueprint agree.

// Raw record as the Coretax API returns it (provider field names = the mapping's RIGHT column).
// `rate` and `kind` are operational fields (like bank's txn_id): not mapped business fields, but read
// by the runner directly — `rate` drives the per-faktur arithmetic check, `kind` selects output VAT.
export interface RawTaxRecord {
  taxpayer_id: string;
  invoice_number: string; // natural key for idempotent posting
  tax_base: number; // DPP
  vat_amount: number; // PPN
  tax_period: string; // Masa Pajak
  rate: number; // PPN tariff (e.g. 0.11) — used for the per-faktur arithmetic gate
  kind: 'Keluaran' | 'Masukan';
}

export interface TaxFeedPull {
  declaredVatTotal: number; // SPT header control total — declared Σ PPN Keluaran for the period
  taxPeriod: string;
  raw: RawTaxRecord[];
}

export type TaxPullFn = () => Promise<TaxFeedPull>;

const PERIOD = '2026-02';

// Five output-VAT (Keluaran) invoices; Σ PPN = 443_300_000. Each ppn = round(dpp × 0.11), so the
// per-faktur arithmetic gate passes and the batch Σ ties to the declared SPT total → these rows post.
const ROWS: RawTaxRecord[] = [
  { taxpayer_id: '01.234.567.8-051.000', invoice_number: '010.000-26.00000118', tax_base: 925_000_000, vat_amount: 101_750_000, tax_period: PERIOD, rate: 0.11, kind: 'Keluaran' },
  { taxpayer_id: '01.234.567.8-051.000', invoice_number: '010.000-26.00000119', tax_base: 555_000_000, vat_amount: 61_050_000, tax_period: PERIOD, rate: 0.11, kind: 'Keluaran' },
  { taxpayer_id: '02.345.678.9-052.000', invoice_number: '010.000-26.00000120', tax_base: 1_170_000_000, vat_amount: 128_700_000, tax_period: PERIOD, rate: 0.11, kind: 'Keluaran' },
  { taxpayer_id: '03.456.789.0-053.000', invoice_number: '010.000-26.00000121', tax_base: 560_000_000, vat_amount: 61_600_000, tax_period: PERIOD, rate: 0.11, kind: 'Keluaran' },
  { taxpayer_id: '04.567.890.1-054.000', invoice_number: '010.000-26.00000122', tax_base: 820_000_000, vat_amount: 90_200_000, tax_period: PERIOD, rate: 0.11, kind: 'Keluaran' },
];

const DECLARED_VAT_TOTAL = ROWS.reduce((s, r) => s + r.vat_amount, 0); // 443_300_000

/** Healthy feed — the control total ties, so the runner posts to the firmtax SSOT. */
export const pullCoretaxFeed: TaxPullFn = async () => ({
  declaredVatTotal: DECLARED_VAT_TOTAL,
  taxPeriod: PERIOD,
  raw: ROWS.map((r) => ({ ...r })),
});

/** A feed whose declared SPT total does NOT tie (off by 1) — the control-total gate must block
 *  posting (status='staged'), proving the gate isn't cosmetic. Used by tests. */
export const pullCoretaxFeedBroken: TaxPullFn = async () => ({
  declaredVatTotal: DECLARED_VAT_TOTAL + 1, // deliberately wrong
  taxPeriod: PERIOD,
  raw: ROWS.map((r) => ({ ...r })),
});

/** A feed where one invoice's PPN is tampered (≠ round(DPP × rate)) — that faktur fails the
 *  per-faktur arithmetic check and is rejected; the surviving Σ then no longer ties the declared
 *  total → staged, nothing posts. Proves a tampered faktur cannot slip into the SSOT. */
export const pullCoretaxFeedBadInvoice: TaxPullFn = async () => ({
  declaredVatTotal: DECLARED_VAT_TOTAL,
  taxPeriod: PERIOD,
  raw: ROWS.map((r, i) => (i === 0 ? { ...r, vat_amount: r.vat_amount + 1_000_000 } : { ...r })),
});
