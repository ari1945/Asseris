/* ============================================================
   WIP — write-down manual (`wip.adj`) sebagai SUMBER KEBENARAN.

   Latar: sampai 2026-08-15 write-down manual hidup sebagai state LOKAL di view
   "WIP & Realisasi" yang menghitung ulang recoverable/realisasi/margin sendiri.
   Konsekuensinya dua-lapis:
     (a) LINTAS-MODUL — Dashboard, cockpit Beranda, Firm Finance & ekspor
         menampilkan angka PRA-write-down; dan
     (b) DI DALAM SATU LAYAR — tabel register (ber-adj) bertentangan dengan panel
         aging (tanpa adj), tanpa peringatan apa pun.
   Uji ini memaku bahwa penyesuaian masuk di HULU (`FIRMFIN.wip`) sehingga SELURUH
   turunan bergerak bersama, plus gerbang otorisasi yang dulu tak pernah menyala.
   Rujukan: docs/prd-wip-merge-valuasi-realisasi.md (SC-3 · SC-4 · SC-5).
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { AMS } from './data';
import { FIRMFIN, WIP_WRITEOFF_APPROVAL_MIN } from './data_firmfin';
import './data_platform';   // side-effect: memasang AMS.PLATFORM.buildApprovals

type WipRow = {
  id: string; std: number; writeUp: number; writeDown: number;
  seedWriteDown: number; manualWriteDown: number;
  recoverable: number; billed: number; unbilled: number; cost: number;
  realization: number; margin: number; bucketKey: string;
};
type WipModel = {
  registerAll: WipRow[]; register: WipRow[];
  unbilledTotal: number; totWriteDown: number; totManualWriteDown: number;
  totRecoverable: number; avgRealization: number; avgMargin: number;
  aging: { key: string; value: number; provision: number }[];
  provisionTotal: number; netRecoverable: number;
  movement: { k: string; value: number }[];
};

const ctx = () => ({ engagements: AMS.ENGAGEMENTS, clients: AMS.CLIENTS });
const model = (adj?: Record<string, number>) =>
  FIRMFIN.wip(ctx(), undefined, undefined, adj) as unknown as WipModel;

/** perikatan pertama yang punya saldo WIP positif — target penyesuaian */
const targetRow = (): WipRow => {
  const r = model().registerAll.find(x => x.unbilled > 0);
  if (!r) throw new Error('fixture: tak ada perikatan ber-WIP positif');
  return r;
};

describe('FIRMFIN.wip — penyesuaian manual masuk di hulu', () => {
  it('tanpa adj: manualWriteDown 0 & writeDown = writeDown sub-buku (tak ada perubahan perilaku)', () => {
    const W = model();
    expect(W.registerAll.length).toBeGreaterThan(0);
    for (const r of W.registerAll) {
      expect(r.manualWriteDown).toBe(0);
      expect(r.writeDown).toBe(r.seedWriteDown);
    }
    expect(W.totManualWriteDown).toBe(0);
  });

  it('adj menambah writeDown & MENURUNKAN recoverable/unbilled pada baris yang sama', () => {
    const base = targetRow();
    const bump = 50_000_000;
    const W = model({ [base.id]: bump });
    const r = W.registerAll.find(x => x.id === base.id) as WipRow;

    expect(r.manualWriteDown).toBe(bump);
    expect(r.seedWriteDown).toBe(base.seedWriteDown);          // seed tak diubah
    expect(r.writeDown).toBe(base.writeDown + bump);
    expect(r.recoverable).toBe(base.recoverable - bump);
    expect(r.unbilled).toBe(base.unbilled - bump);
  });

  it('realisasi & margin ikut turun — bukan hanya kolom write-down yang berubah', () => {
    const base = targetRow();
    const W = model({ [base.id]: 50_000_000 });
    const r = W.registerAll.find(x => x.id === base.id) as WipRow;
    expect(r.realization).toBeLessThan(base.realization);
    expect(r.margin).toBeLessThan(base.margin);
  });

  it('adj negatif/sampah diabaikan (tak pernah menaikkan recoverable)', () => {
    const base = targetRow();
    const W = model({ [base.id]: -900_000_000 });
    const r = W.registerAll.find(x => x.id === base.id) as WipRow;
    expect(r.manualWriteDown).toBe(0);
    expect(r.recoverable).toBe(base.recoverable);
  });

  it('id perikatan yang tak dikenal diabaikan diam-diam (tak melempar, tak menggeser total)', () => {
    const before = model();
    const after = model({ 'ENG-TIDAK-ADA': 100_000_000 });
    expect(after.unbilledTotal).toBe(before.unbilledTotal);
    expect(after.totManualWriteDown).toBe(0);
  });
});

/* SC-3 — konsumen hilir. Dashboard/cockpit/Firm Finance semuanya membaca model
   yang SAMA lewat useFirmWip; memaku agregat di sini setara memaku layar mereka
   (hook hanya meneruskan `wip.adj` ke argumen keempat). */
describe('SC-3 — agregat yang dibaca konsumen hilir ikut bergerak', () => {
  it('unbilledTotal, totWriteDown, totRecoverable & realisasi rata-rata bergeser', () => {
    const base = targetRow();
    const bump = 50_000_000;
    const before = model();
    const after = model({ [base.id]: bump });

    expect(after.totManualWriteDown).toBe(bump);
    expect(after.totWriteDown).toBe(before.totWriteDown + bump);
    expect(after.totRecoverable).toBe(before.totRecoverable - bump);
    expect(after.unbilledTotal).toBe(before.unbilledTotal - bump);
    expect(after.avgRealization).toBeLessThan(before.avgRealization);
  });

  it('roll-forward tetap MENUTUP: saldo akhir = unbilledTotal sesudah penyesuaian', () => {
    const base = targetRow();
    const W = model({ [base.id]: 50_000_000 });
    const close = W.movement.find(m => m.k === 'close');
    expect(close).toBeTruthy();
    expect((close as { value: number }).value).toBe(W.unbilledTotal);
  });
});

/* SC-4 — cacat "dua panel bertetangga, dua basis". Aging DULU dihitung dari model
   mentah sementara tabel di atasnya ber-adj; kini keduanya dari satu turunan. */
describe('SC-4 — aging & penyisihan ikut basis yang sama dengan register', () => {
  it('total bucket aging = unbilledTotal, sebelum & sesudah penyesuaian', () => {
    const base = targetRow();
    for (const adj of [undefined, { [base.id]: 50_000_000 }]) {
      const W = model(adj);
      const sum = W.aging.reduce((s, a) => s + a.value, 0);
      expect(sum).toBe(W.unbilledTotal);
    }
  });

  it('bucket milik perikatan yang di-write-down ikut menyusut', () => {
    const base = targetRow();
    const bump = 50_000_000;
    const before = model();
    const after = model({ [base.id]: bump });
    const key = base.bucketKey;
    const b0 = before.aging.find(a => a.key === key) as { value: number };
    const b1 = after.aging.find(a => a.key === key) as { value: number };
    expect(b1.value).toBe(b0.value - bump);
  });

  it('penyisihan & recoverable neto diturunkan ulang, bukan dibiarkan basi', () => {
    const base = targetRow();
    const before = model();
    const after = model({ [base.id]: 50_000_000 });
    expect(after.provisionTotal).toBeLessThanOrEqual(before.provisionTotal);
    expect(after.netRecoverable).toBeLessThan(before.netRecoverable);
  });
});

/* SC-5 — gerbang otorisasi. Sebelumnya HANYA write-down yang sudah ada di seed
   sub-buku yang membangkitkan item; penghapusan lewat UI tak pernah masuk antrean. */
describe('SC-5 — write-down manual masuk antrean persetujuan', () => {
  const approvals = (wipAdj?: Record<string, number>) =>
    (AMS as unknown as { PLATFORM: { buildApprovals: (c: unknown) => { id: string; kind: string; amount: number; sourceRoute: string; chain: unknown[] }[] } })
      .PLATFORM.buildApprovals({ engagements: AMS.ENGAGEMENTS, clients: AMS.CLIENTS, wipAdj });

  it('di BAWAH ambang → tak ada item (write-down kecil tak membanjiri antrean)', () => {
    const id = targetRow().id;
    const items = approvals({ [id]: WIP_WRITEOFF_APPROVAL_MIN - 1 });
    expect(items.find(x => x.id === 'APR-WIPADJ-' + id)).toBeUndefined();
  });

  it('DI atau DI ATAS ambang → item pending dengan rantai 2 langkah', () => {
    const id = targetRow().id;
    const items = approvals({ [id]: WIP_WRITEOFF_APPROVAL_MIN });
    const it = items.find(x => x.id === 'APR-WIPADJ-' + id);
    expect(it).toBeTruthy();
    expect(it).toMatchObject({ kind: 'WIP Write-off', amount: WIP_WRITEOFF_APPROVAL_MIN, sourceRoute: 'wip' });
    expect((it as { chain: unknown[] }).chain).toHaveLength(2);
  });

  it('item manual TIDAK menabrak item seed pada perikatan yang sama (prefiks berbeda)', () => {
    const id = targetRow().id;
    const items = approvals({ [id]: 3 * WIP_WRITEOFF_APPROVAL_MIN });
    const ids = items.filter(x => x.id.startsWith('APR-WIP')).map(x => x.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain('APR-WIPADJ-' + id);
  });

  it('tanpa wipAdj: antrean identik dengan sebelum fitur ini ada (nol regresi)', () => {
    const withOut = approvals().filter(x => x.id.startsWith('APR-WIPADJ-'));
    expect(withOut).toEqual([]);
  });

  it('seluruh item WIP Write-off menunjuk route yang MASIH ADA (bukan `wipreal` yatim)', () => {
    const id = targetRow().id;
    const items = approvals({ [id]: WIP_WRITEOFF_APPROVAL_MIN });
    for (const it of items.filter(x => x.kind === 'WIP Write-off')) {
      expect(it.sourceRoute).toBe('wip');
    }
  });
});
