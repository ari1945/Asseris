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

const FIRM_SCOPE = 'firm';
const FIRM_ID = 'FIRM-WHR';
const BANK_STATE_KEY = 'bankFeed'; // firm-scoped StateDoc the cashbank module consumes
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

// Merge transactions into the firm-scoped bank StateDoc under optimistic concurrency. Idempotent:
// each txn is upserted by its natural key, so re-running posts the same rows without duplicating.
// Returns the distinct-transaction count the SSOT holds after the merge (= consumed).
async function mergeBankState(rows: Array<{ txnId: string } & BankTxn>, opening: number, closing: number): Promise<number> {
  for (let attempt = 0; attempt < MAX_CAS_RETRIES; attempt++) {
    const doc = await prisma.stateDoc.findUnique({
      where: { scope_scopeId_key: { scope: FIRM_SCOPE, scopeId: FIRM_ID, key: BANK_STATE_KEY } },
    });
    const base: BankState = doc
      ? (JSON.parse(doc.valueJson) as BankState)
      : { transactions: {}, openingBalance: opening, closingBalance: closing };
    for (const r of rows) {
      base.transactions[r.txnId] = { valueDate: r.valueDate, amount: r.amount, remark: r.remark, accountNo: r.accountNo, dc: r.dc };
    }
    base.openingBalance = opening;
    base.closingBalance = closing;
    const valueJson = JSON.stringify(base);
    const consumed = Object.keys(base.transactions).length;

    if (!doc) {
      try {
        await prisma.stateDoc.create({
          data: { scope: FIRM_SCOPE, scopeId: FIRM_ID, key: BANK_STATE_KEY, valueJson, version: 1, updatedBy: 'integration:bank' },
        });
        return consumed;
      } catch (e) {
        if (isUniqueViolation(e)) continue; // someone created it first — retry as an update
        throw e;
      }
    }
    const res = await prisma.stateDoc.updateMany({
      where: { scope: FIRM_SCOPE, scopeId: FIRM_ID, key: BANK_STATE_KEY, version: doc.version },
      data: { valueJson, version: { increment: 1 }, updatedBy: 'integration:bank' },
    });
    if (res.count === 1) return consumed;
    // lost the CAS — another writer bumped the version; retry
  }
  throw new Error('bankFeed CAS contention — exceeded retries');
}

/**
 * Run a Bank Feed sync. The provider is injected (defaults to the fixture); a test can pass a
 * broken statement to prove the control-total gate blocks posting. `actor` is the authenticated
 * caller (the router enforces INTEGRATION_MANAGE before we get here) and is recorded in the audit.
 */
export async function runBankSync(actor: { id: string; role: string }, pull: BankPullFn = pullBankStatement): Promise<SyncSummary> {
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

/** SyncJob history for a connector (newest first), for the import-queue UI. */
export async function listJobs(connectorId?: string, limit = 50) {
  return prisma.syncJob.findMany({
    where: connectorId ? { connectorId } : undefined,
    orderBy: { startedAt: 'desc' },
    take: limit,
  });
}
