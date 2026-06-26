// W9 Fase 1 — the sync job runner. This is the real pipeline W9 is about:
//   pull(provider) → map (mapping.ts) → validate → CONTROL-TOTAL GATE → idempotent post to SSOT
//   → record SyncJob → audit.
// Proven here on Bank Feed → cashbank against the fixture adapter; the provider is injected, so
// the same runner drives the HTTP adapter (Fase 2) unchanged. Posting writes the firm-scoped
// StateDoc the cashbank module reads, so "rows posted" == "records consumed" (the tie-out), and a
// re-run merges by natural key → zero duplicates (idempotent).
import { Prisma } from '@prisma/client';
import { prisma } from '../db';
import { appendAudit } from '../audit/log';
import { getConnector } from './config';
import { applyMapping } from './mapping';
import { pullBankStatement, type BankPullFn } from './providers/bankFixture';
import { readBankHttpConfig, makeHttpBankPull } from './providers/httpBank';
import { pullCoretaxFeed, type TaxPullFn } from './providers/coretaxFixture';
import { readCoretaxHttpConfig, makeHttpCoretaxPull } from './providers/httpCoretax';

const FIRM_SCOPE = 'firm';
const FIRM_ID = 'FIRM-WHR';
const BANK_STATE_KEY = 'bankFeed'; // firm-scoped StateDoc the cashbank module consumes
const TAX_STATE_KEY = 'taxFeed'; // firm-scoped StateDoc the firmtax module consumes (output VAT)
const MAX_CAS_RETRIES = 5;

// Normalized transaction as stored in the SSOT, keyed by natural key (txnId) for idempotency.
interface BankTxn {
  valueDate: string;
  amount: number;
  remark?: string;
  accountNo?: string;
  dc?: string;
}
interface BankState {
  transactions: Record<string, BankTxn>;
  openingBalance: number;
  closingBalance: number;
}

export interface SyncSummary {
  jobId: string;
  connectorId: string;
  status: 'posted' | 'staged' | 'failed';
  rows: number;
  valid: number;
  rejected: number;
  posted: number; // rows merged into the SSOT this run
  consumed: number; // distinct txns the target SSOT now holds
  gatePassed: boolean;
  controlLabel: string;
  controlValue: string;
  tied: boolean; // posted == consumed (no separate copy, no duplication)
  note?: string;
}

function isUniqueViolation(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002';
}

// Generic firm-scoped feed merge under optimistic concurrency, shared by every connector runner.
// A feed's StateDoc is `{ [collKey]: { <naturalKey>: <stored> }, ...scalars }`. Each row is upserted
// by its natural key (idempotent: re-running posts the same rows without duplicating); `scalars` are
// connector-specific header figures (bank: opening/closing balance; coretax: declared VAT total).
// Returns the distinct-item count the SSOT holds after the merge (= consumed). Extracted from the
// bank-only mergeBankState in W9·2 with no behavioral change to the bank path (it now delegates here).
interface MergeFeedOpts<TRow> {
  stateKey: string;
  collKey: string; // the collection field name preserved in the StateDoc (e.g. 'transactions')
  rows: TRow[];
  keyOf: (r: TRow) => string; // natural key for idempotent upsert
  storedOf: (r: TRow) => unknown; // the value persisted under the natural key
  scalars: Record<string, number>; // header figures stored as siblings of the collection
  updatedBy: string;
}

async function mergeFeedState<TRow>(opts: MergeFeedOpts<TRow>): Promise<number> {
  const { stateKey, collKey, rows, keyOf, storedOf, scalars, updatedBy } = opts;
  for (let attempt = 0; attempt < MAX_CAS_RETRIES; attempt++) {
    const doc = await prisma.stateDoc.findUnique({
      where: { scope_scopeId_key: { scope: FIRM_SCOPE, scopeId: FIRM_ID, key: stateKey } },
    });
    const base: Record<string, unknown> = doc
      ? (JSON.parse(doc.valueJson) as Record<string, unknown>)
      : { [collKey]: {}, ...scalars };
    const coll = (base[collKey] as Record<string, unknown> | undefined) ?? {};
    for (const r of rows) coll[keyOf(r)] = storedOf(r);
    base[collKey] = coll;
    Object.assign(base, scalars);
    const valueJson = JSON.stringify(base);
    const consumed = Object.keys(coll).length;

    if (!doc) {
      try {
        await prisma.stateDoc.create({
          data: { scope: FIRM_SCOPE, scopeId: FIRM_ID, key: stateKey, valueJson, version: 1, updatedBy },
        });
        return consumed;
      } catch (e) {
        if (isUniqueViolation(e)) continue; // someone created it first — retry as an update
        throw e;
      }
    }
    const res = await prisma.stateDoc.updateMany({
      where: { scope: FIRM_SCOPE, scopeId: FIRM_ID, key: stateKey, version: doc.version },
      data: { valueJson, version: { increment: 1 }, updatedBy },
    });
    if (res.count === 1) return consumed;
    // lost the CAS — another writer bumped the version; retry
  }
  throw new Error(`${stateKey} CAS contention — exceeded retries`);
}

// Merge transactions into the firm-scoped bank StateDoc. Thin wrapper over mergeFeedState that pins
// the bank's collection/natural-key/scalars — behavior identical to the pre-W9·2 implementation.
async function mergeBankState(rows: Array<{ txnId: string } & BankTxn>, opening: number, closing: number): Promise<number> {
  return mergeFeedState({
    stateKey: BANK_STATE_KEY,
    collKey: 'transactions',
    rows,
    keyOf: (r) => r.txnId,
    storedOf: (r) => ({ valueDate: r.valueDate, amount: r.amount, remark: r.remark, accountNo: r.accountNo, dc: r.dc }),
    scalars: { openingBalance: opening, closingBalance: closing },
    updatedBy: 'integration:bank',
  });
}

/** Choose the real HTTP adapter when bank env is configured, else the fixture. Evaluated per call
 *  so flipping env takes effect immediately; in dev/test (no BANK_API_*) this is the fixture. */
export function defaultBankPull(): BankPullFn {
  const cfg = readBankHttpConfig();
  return cfg ? makeHttpBankPull(cfg) : pullBankStatement;
}

/**
 * Run a Bank Feed sync. The provider is injected (defaults to HTTP-when-configured, else fixture);
 * a test can pass a broken statement to prove the control-total gate blocks posting. `actor` is the
 * authenticated caller (the router enforces INTEGRATION_MANAGE before we get here), recorded in the
 * audit.
 */
export async function runBankSync(actor: { id: string; role: string }, pull: BankPullFn = defaultBankPull()): Promise<SyncSummary> {
  const conn = await getConnector('bank');
  if (!conn) throw new Error('connector-not-found:bank');

  const job = await prisma.syncJob.create({
    data: { connectorId: 'bank', status: 'running', mode: 'auto', dataset: 'Mutasi rekening firma', target: conn.target, unit: 'transaksi' },
  });

  try {
    const statement = await pull();

    // map raw provider records → normalized rows via the connector's field mapping
    const mapped = statement.raw.map((raw) => {
      const m = applyMapping(conn.mapping, raw as unknown as Record<string, unknown>);
      return {
        txnId: String((raw as { txn_id?: unknown }).txn_id ?? ''),
        valueDate: m.value_date != null ? String(m.value_date) : '',
        amount: Number(m.amount ?? NaN),
        remark: m.remark != null ? String(m.remark) : undefined,
        accountNo: m.account_no != null ? String(m.account_no) : undefined,
        dc: m.dc_indicator != null ? String(m.dc_indicator) : undefined,
      };
    });

    // validate — a row must have a natural key, a finite amount, and a value date
    const valid = mapped.filter((r) => r.txnId !== '' && Number.isFinite(r.amount) && r.valueDate !== '');
    const rejected = mapped.length - valid.length;

    // CONTROL-TOTAL GATE — opening + Σ(movements) must equal the declared closing balance.
    const movement = valid.reduce((s, r) => s + r.amount, 0);
    const computed = statement.openingBalance + movement;
    const gatePassed = computed === statement.closingBalance;
    const controlLabel = 'Saldo akhir = saldo awal + Σ mutasi';
    const controlValue = `hitung ${computed} vs rekening koran ${statement.closingBalance}`;

    let status: 'posted' | 'staged';
    let posted = 0;
    let consumed = 0;
    let note: string | undefined;

    if (!gatePassed) {
      // Gate failed → stage, do NOT post. The whole point: a mismatched control total blocks
      // tainted data from reaching the SSOT.
      status = 'staged';
      note = `Gerbang total-kontrol gagal (${controlValue}); ${valid.length} baris ditahan, tidak diposting.`;
    } else {
      consumed = await mergeBankState(valid, statement.openingBalance, statement.closingBalance);
      posted = valid.length;
      status = 'posted';
      // first successful post marks the connector wired (a real adapter has driven it)
      await prisma.connector.update({ where: { id: 'bank' }, data: { wired: true, status: 'connected' } });
    }

    await prisma.syncJob.update({
      where: { id: job.id },
      data: { finishedAt: new Date(), status, rows: mapped.length, valid: valid.length, rejected, posted, controlLabel, controlValue, gatePassed, note, cursor: statement.closingBalance.toString() },
    });

    await appendAudit({
      actorUserId: actor.id, actorRole: actor.role, action: 'SYNC',
      scope: FIRM_SCOPE, scopeId: FIRM_ID, key: 'bank',
      detail: `status=${status}; posted=${posted}; rejected=${rejected}; gate=${gatePassed}`,
    });

    return {
      jobId: job.id, connectorId: 'bank', status,
      rows: mapped.length, valid: valid.length, rejected, posted, consumed,
      gatePassed, controlLabel, controlValue,
      tied: status === 'posted' && consumed === valid.length, note,
    };
  } catch (e) {
    await prisma.syncJob.update({
      where: { id: job.id },
      data: { finishedAt: new Date(), status: 'failed', note: e instanceof Error ? e.message : String(e) },
    });
    throw e;
  }
}

export interface ReconciliationRow {
  connectorId: string;
  target: string;
  posted: number; // valid rows from the last successful sync
  consumed: number; // distinct txns the target SSOT holds
  tied: boolean;
  closingBalance: number;
}

/** Import↔consumption tie-out for the bank connector: does the SSOT hold exactly what we posted? */
export async function reconcileBank(): Promise<ReconciliationRow> {
  const doc = await prisma.stateDoc.findUnique({
    where: { scope_scopeId_key: { scope: FIRM_SCOPE, scopeId: FIRM_ID, key: BANK_STATE_KEY } },
  });
  const state = doc ? (JSON.parse(doc.valueJson) as BankState) : null;
  const consumed = state ? Object.keys(state.transactions).length : 0;
  const lastPosted = await prisma.syncJob.findFirst({
    where: { connectorId: 'bank', status: 'posted' },
    orderBy: { startedAt: 'desc' },
  });
  const posted = lastPosted?.valid ?? 0;
  return {
    connectorId: 'bank', target: 'cashbank',
    posted, consumed,
    tied: posted > 0 && consumed === posted,
    closingBalance: state?.closingBalance ?? 0,
  };
}

// ---------------------------------------------------------------------------
// W9·2 — Coretax / e-Faktur connector (output VAT → firmtax). Same runner skeleton as the Bank Feed,
// with a tax-specific normalize + control-total gate. Shares mergeFeedState for idempotent posting.

// Normalized output-VAT invoice as stored in the firmtax SSOT, keyed by invoice_number.
interface TaxInvoice {
  taxpayerId?: string;
  taxBase: number;
  vatAmount: number;
  taxPeriod: string;
  rate: number;
}
interface TaxState {
  invoices: Record<string, TaxInvoice>;
  declaredVatTotal: number;
  vatTotal: number;
}

/** Choose the real HTTP adapter when Coretax env is configured, else the fixture. Evaluated per call
 *  so flipping env takes effect immediately; in dev/test (no CORETAX_API_*) this is the fixture. */
export function defaultCoretaxPull(): TaxPullFn {
  const cfg = readCoretaxHttpConfig();
  if (cfg) return makeHttpCoretaxPull(cfg);
  // Tripwire parkir (W9·2): di PRODUCTION tanpa kredensial DJP, JANGAN diam-diam memakai fixture.
  // Fixture sengaja byte-faithful ke Σ-PPN Keluaran 443,3jt → LOLOS gate control-total → bisa
  // memposting data DEMO ke SSOT firmtax dan menyamar sebagai data pajak nyata (pelanggaran
  // integritas Tax-Defense). Blokir sampai CORETAX_API_* (Sertifikat Elektronik PKP) terpasang.
  // Dev/test tetap memakai fixture untuk membuktikan pipa. Pull yang melempar → runCoretaxSync
  // menandai SyncJob 'failed' (bukan post diam-diam).
  if (process.env.NODE_ENV === 'production') {
    return async () => {
      throw new Error('coretax-not-configured: set CORETAX_API_* (Sertifikat Elektronik PKP) sebelum sync Coretax di production');
    };
  }
  return pullCoretaxFeed;
}

/**
 * Run a Coretax / e-Faktur sync (output VAT → firmtax). Same pipeline as the Bank Feed: pull → map →
 * validate (incl. per-faktur arithmetic round(DPP×rate)==PPN) → CONTROL-TOTAL GATE (Σ PPN Keluaran
 * must equal the declared SPT total) → idempotent post by invoice_number → SyncJob → audit. A
 * mismatched control total stages the batch and posts nothing — tainted tax data never reaches the
 * SSOT. `actor` is the authenticated caller (the router enforces INTEGRATION_MANAGE first).
 */
export async function runCoretaxSync(actor: { id: string; role: string }, pull: TaxPullFn = defaultCoretaxPull()): Promise<SyncSummary> {
  const conn = await getConnector('coretax');
  if (!conn) throw new Error('connector-not-found:coretax');

  const job = await prisma.syncJob.create({
    data: { connectorId: 'coretax', status: 'running', mode: 'auto', dataset: 'e-Faktur Keluaran (PPN)', target: conn.target, unit: 'faktur' },
  });

  try {
    const feed = await pull();

    // map raw provider records → normalized rows via the connector's field mapping. invoice_number
    // (natural key), rate and kind are read from the raw record directly (operational, unmapped).
    const mapped = feed.raw.map((raw) => {
      const m = applyMapping(conn.mapping, raw as unknown as Record<string, unknown>);
      return {
        invoiceNumber: m.invoice_number != null ? String(m.invoice_number) : '',
        taxpayerId: m.taxpayer_id != null ? String(m.taxpayer_id) : undefined,
        taxBase: Number(m.tax_base ?? NaN),
        vatAmount: Number(m.vat_amount ?? NaN),
        taxPeriod: m.tax_period != null ? String(m.tax_period) : '',
        rate: Number((raw as { rate?: unknown }).rate ?? NaN),
        kind: String((raw as { kind?: unknown }).kind ?? ''),
      };
    });

    // validate — output VAT only, with a natural key, finite figures, a period, AND per-faktur
    // arithmetic integrity (round(DPP × rate) must equal the declared PPN). A tampered faktur fails.
    const valid = mapped.filter((r) =>
      r.kind === 'Keluaran' && r.invoiceNumber !== '' && Number.isFinite(r.taxBase) &&
      Number.isFinite(r.vatAmount) && r.taxPeriod !== '' && Number.isFinite(r.rate) &&
      Math.round(r.taxBase * r.rate) === r.vatAmount,
    );
    const rejected = mapped.length - valid.length;

    // CONTROL-TOTAL GATE — Σ(PPN Keluaran of valid invoices) must equal the declared SPT total.
    const computed = valid.reduce((s, r) => s + r.vatAmount, 0);
    const gatePassed = computed === feed.declaredVatTotal;
    const controlLabel = 'Σ PPN Keluaran = total SPT dideklarasikan';
    const controlValue = `hitung ${computed} vs SPT ${feed.declaredVatTotal}`;

    let status: 'posted' | 'staged';
    let posted = 0;
    let consumed = 0;
    let note: string | undefined;

    if (!gatePassed) {
      // Gate failed → stage, do NOT post. A mismatched control total blocks tainted tax data from
      // reaching the firmtax SSOT.
      status = 'staged';
      note = `Gerbang total-kontrol gagal (${controlValue}); ${valid.length} faktur ditahan, tidak diposting${rejected ? `; ${rejected} faktur ditolak validasi` : ''}.`;
    } else {
      consumed = await mergeFeedState({
        stateKey: TAX_STATE_KEY,
        collKey: 'invoices',
        rows: valid,
        keyOf: (r) => r.invoiceNumber,
        storedOf: (r) => ({ taxpayerId: r.taxpayerId, taxBase: r.taxBase, vatAmount: r.vatAmount, taxPeriod: r.taxPeriod, rate: r.rate }),
        scalars: { declaredVatTotal: feed.declaredVatTotal, vatTotal: computed },
        updatedBy: 'integration:coretax',
      });
      posted = valid.length;
      status = 'posted';
      // first successful post marks the connector wired (a real adapter has driven it)
      await prisma.connector.update({ where: { id: 'coretax' }, data: { wired: true, status: 'connected' } });
    }

    await prisma.syncJob.update({
      where: { id: job.id },
      data: { finishedAt: new Date(), status, rows: mapped.length, valid: valid.length, rejected, posted, controlLabel, controlValue, gatePassed, note, cursor: feed.declaredVatTotal.toString() },
    });

    await appendAudit({
      actorUserId: actor.id, actorRole: actor.role, action: 'SYNC',
      scope: FIRM_SCOPE, scopeId: FIRM_ID, key: 'coretax',
      detail: `status=${status}; posted=${posted}; rejected=${rejected}; gate=${gatePassed}`,
    });

    return {
      jobId: job.id, connectorId: 'coretax', status,
      rows: mapped.length, valid: valid.length, rejected, posted, consumed,
      gatePassed, controlLabel, controlValue,
      tied: status === 'posted' && consumed === valid.length, note,
    };
  } catch (e) {
    await prisma.syncJob.update({
      where: { id: job.id },
      data: { finishedAt: new Date(), status: 'failed', note: e instanceof Error ? e.message : String(e) },
    });
    throw e;
  }
}

export interface CoretaxReconciliationRow {
  connectorId: string;
  target: string;
  posted: number; // valid invoices from the last successful sync
  consumed: number; // distinct invoices the firmtax SSOT holds
  tied: boolean;
  vatTotal: number; // Σ PPN Keluaran posted (matches the canon controlTotal('coretax'))
}

/** Import↔consumption tie-out for the coretax connector: does the firmtax SSOT hold exactly what we
 *  posted? `vatTotal` is the posted Σ PPN, the same figure the Integrasi cockpit reconciles against. */
export async function reconcileCoretax(): Promise<CoretaxReconciliationRow> {
  const doc = await prisma.stateDoc.findUnique({
    where: { scope_scopeId_key: { scope: FIRM_SCOPE, scopeId: FIRM_ID, key: TAX_STATE_KEY } },
  });
  const state = doc ? (JSON.parse(doc.valueJson) as TaxState) : null;
  const consumed = state ? Object.keys(state.invoices).length : 0;
  const lastPosted = await prisma.syncJob.findFirst({
    where: { connectorId: 'coretax', status: 'posted' },
    orderBy: { startedAt: 'desc' },
  });
  const posted = lastPosted?.valid ?? 0;
  return {
    connectorId: 'coretax', target: 'firmtax',
    posted, consumed,
    tied: posted > 0 && consumed === posted,
    vatTotal: state?.vatTotal ?? 0,
  };
}

/** SyncJob history for a connector (newest first), for the import-queue UI. */
export async function listJobs(connectorId?: string, limit = 50) {
  return prisma.syncJob.findMany({
    where: connectorId ? { connectorId } : undefined,
    orderBy: { startedAt: 'desc' },
    take: limit,
  });
}
