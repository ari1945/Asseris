import React from 'react';
import { useAmsPersist, useFirm, useAudit } from './contexts';
import { FIRMFIN } from './data_firmfin';

/* ============================================================
   Asseris — useFirmWip: SUMBER KEBENARAN TUNGGAL nilai WIP firma.

   Sebelumnya tiap surface WIP menghitung sendiri: ctx {engagements,clients}
   + overlay jam-aktual Time & Budget (`liveByEng`) untuk engagement aktif,
   lalu FIRMFIN.wip(ctx, provFactor, liveByEng). Beberapa surface (Dashboard,
   cockpit Beranda, ikhtisar Firm Finance) LUPA meng-overlay `liveByEng`
   sehingga menampilkan WIP dari std seed yang basi (mis. 7,72 M) alih-alih
   nilai aktual T&B (5,90 M) — angka WIP jadi tak konsisten antar-modul.

   Hook ini mengurung derivasi itu di SATU tempat. SEMUA surface WIP
   (WIP Valuation, WIP & Realisasi, Firm Finance, Firm Dashboard, cockpit
   Beranda) memakainya → angka WIP identik, overlay T&B seragam.

   2026-08-15 — write-down MANUAL (`wip.adj`) ikut masuk ke sini. Dulu ia hidup
   sebagai state lokal di satu view saja, yang lalu menghitung ulang recoverable/
   realisasi/margin sendiri: seluruh konsumen lain (Dashboard, cockpit, Firm
   Finance, ekspor) tetap menampilkan angka PRA-write-down. Dengan dibaca di sini,
   satu-satunya cara menulisnya adalah lewat `setAdj` yang dikembalikan hook ini,
   dan SEMUA pembaca `useFirmWip` melihat hasil yang sama.

   Mengembalikan { wip, liveByEng, adj, setAdj }: `liveByEng` diekspos agar view
   bisa menampilkan chip "Sinkron T&B" saat engagement aktif punya timesheet live;
   `adj`/`setAdj` dipakai modul WIP untuk menerapkan & mereset write-down manual.
   ============================================================ */

interface WipFirmCtx { engagements: unknown[]; clients: unknown[]; activeEngagement: { id: string } | null }
interface WipAuditCtx { timeEntries: unknown[] }
interface EngWip { stdValue: number; costValue: number; actualHrs: number }
type LiveByEng = Record<string, { std: number; cost: number; actualHrs: number }> | null;
export type WipAdj = Record<string, number>;
type SetWipAdj = (next: WipAdj | ((prev: WipAdj) => WipAdj)) => void;

/* ---- Bentuk hasil `FIRMFIN.wip()` ----
   FIRMFIN sendiri masih untyped (data_firmfin adalah IIFE lama). Kontraknya
   dinyatakan di sini — di pintu tempat SELURUH konsumen mengambilnya — supaya
   modul WIP (dan konsumen lain yang menyusul) tak perlu satu pun `any`. */
export interface WipRow {
  id: string; client: string; clientShort: string; tier: string; risk: string; partner: string;
  type: string; status: string; phase: string; progress: number;
  std: number; writeUp: number; writeDown: number; seedWriteDown: number; manualWriteDown: number;
  recoverable: number; billed: number; unbilled: number; cost: number;
  realization: number; margin: number; age: number; bucket: string; bucketKey: string; provRate: number;
  overBilled: boolean; atRisk: boolean; live: boolean; hours: number; wipValue: number;
}
export interface WipAgingBucket {
  key: string; bucket: string; baseRate: number; rate: number; value: number; n: number; provision: number;
}
export interface WipMovementRow { k: string; label: string; op: string; value: number; strong?: boolean; accent?: string }
export interface WipBridgeRow { label: string; value: number; strong?: boolean; control?: boolean }
export interface WipModel {
  register: WipRow[]; registerAll: WipRow[];
  unbilledTotal: number; deferredIncome: number; grossWIP: number;
  rate: number; stdRate: number; provFactor: number;
  totStd: number; totRecoverable: number; totBilled: number;
  totWriteUp: number; totWriteDown: number; totManualWriteDown: number; totCost: number;
  avgRealization: number; avgMargin: number;
  aging: WipAgingBucket[]; provisionTotal: number; provisionPct: number;
  netRecoverable: number; atRiskWIP: number;
  movement: WipMovementRow[]; control: number; reconciling: number; bridge: WipBridgeRow[];
}

export function useFirmWip(provFactor?: number) {
  const firm = useFirm() as unknown as WipFirmCtx;
  const audit = useAudit() as unknown as WipAuditCtx;
  const { engagements, clients, activeEngagement } = firm;
  const timeEntries = audit.timeEntries;

  /* Write-down manual per perikatan. Firm-scope; `capForWrite('firm','wip.adj')`
     = FIRMFIN_EDIT (rbac.ts) — SoD finansial ditegakkan server, UI hanya mencerminkan. */
  const [adj, setAdj] = useAmsPersist('wip.adj', {}) as [WipAdj, SetWipAdj];

  const ctx = React.useMemo(() => ({ engagements, clients }), [engagements, clients]);

  /* overlay jam-aktual T&B untuk engagement aktif → std/biaya/jam = live,
     bukan std seed. null bila engagement aktif tak punya timesheet. */
  const liveByEng: LiveByEng = React.useMemo(() => {
    const id = activeEngagement && activeEngagement.id;
    if (!id) return null;
    const ew = FIRMFIN.engagementWip(timeEntries, id) as EngWip | null;
    return ew ? { [id]: { std: ew.stdValue, cost: ew.costValue, actualHrs: ew.actualHrs } } : null;
  }, [timeEntries, activeEngagement]);

  /* Cast di LUAR useMemo: tanpa @types/react, `React.useMemo` sendiri untyped →
     hasilnya `any` dan tipe di dalam callback tak akan sampai ke pemanggil. */
  const wip = React.useMemo(
    () => FIRMFIN.wip(ctx, provFactor, liveByEng, adj),
    [ctx, provFactor, liveByEng, adj]) as WipModel;

  return { wip, liveByEng, adj, setAdj };
}
