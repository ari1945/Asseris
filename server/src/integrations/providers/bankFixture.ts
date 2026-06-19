// W9 Fase 1 — Bank Feed provider, FIXTURE adapter. Returns deterministic raw statement records
// (named with the provider's own field keys — value_date/amount/… — exactly as a bank OpenAPI
// would), so the mapping engine has real source→target work to do. The HTTP adapter (Fase 2,
// httpBank.ts) implements the same `BankPullFn` shape over `fetch` + mTLS and is a drop-in swap —
// the runner is provider-agnostic. No external call, no credentials: the pipeline is provable
// end-to-end here, mirroring how W8 proved the LLM proxy against a mock before real DeepSeek.

// Raw record as the bank API returns it (provider field names = the mapping's RIGHT column).
// `txn_id` is the natural key used for idempotent posting; it is not a mapped business field.
export interface RawBankRecord {
  txn_id: string;
  value_date: string;
  amount: number; // signed: credits positive, debits negative
  remark?: string;
  account_no?: string;
  dc_indicator?: 'C' | 'D';
}

export interface StatementPull {
  openingBalance: number;
  closingBalance: number;
  raw: RawBankRecord[];
}

export type BankPullFn = () => Promise<StatementPull>;

const OPENING = 1_000_000;

// Five movements; Σ = +500_000 → closing 1_500_000. opening + Σ === closing, so the
// control-total gate passes and these rows post.
const ROWS: RawBankRecord[] = [
  { txn_id: 'BANK-2026-0001', value_date: '2026-03-10', amount: 500_000, remark: 'Transfer masuk klien', account_no: '0182-99-0001', dc_indicator: 'C' },
  { txn_id: 'BANK-2026-0002', value_date: '2026-03-10', amount: -200_000, remark: 'Pembayaran vendor', account_no: '0182-99-0001', dc_indicator: 'D' },
  { txn_id: 'BANK-2026-0003', value_date: '2026-03-10', amount: 300_000, remark: 'Pelunasan invoice', account_no: '0182-99-0001', dc_indicator: 'C' },
  { txn_id: 'BANK-2026-0004', value_date: '2026-03-10', amount: -150_000, remark: 'Biaya administrasi', account_no: '0182-99-0001', dc_indicator: 'D' },
  { txn_id: 'BANK-2026-0005', value_date: '2026-03-10', amount: 50_000, remark: 'Bunga giro', account_no: '0182-99-0001', dc_indicator: 'C' },
];

/** Healthy statement — the control total ties, so the runner posts to the SSOT. */
export const pullBankStatement: BankPullFn = async () => ({
  openingBalance: OPENING,
  closingBalance: OPENING + ROWS.reduce((s, r) => s + r.amount, 0), // 1_500_000
  raw: ROWS.map((r) => ({ ...r })),
});

/** A statement whose declared closing balance does NOT tie (off by 1) — the control-total gate
 *  must block posting (status='staged'), proving the gate isn't cosmetic. Used by tests. */
export const pullBankStatementBroken: BankPullFn = async () => ({
  openingBalance: OPENING,
  closingBalance: OPENING + ROWS.reduce((s, r) => s + r.amount, 0) + 1, // deliberately wrong
  raw: ROWS.map((r) => ({ ...r })),
});
