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

/* ============================================================
   Roll-forward & jembatan GL yang DAPAT GAGAL (PRD 2026-08-15).

   Sebelum arc ini keduanya adalah identitas aljabar: `opening` diturunkan agar
   persamaan selalu menutup, dan `reconciling` menyerap selisih berapa pun lalu
   dipecah 82/18 dengan label yang terdengar spesifik. Konsekuensinya terukur:
   mengisi timesheet pada SATU perikatan menggeser "Saldo awal" 3.180 → 1.360 jt
   dan menaikkan baris "WIP perikatan portofolio LAIN" sebesar 115%.

   Yang dipaku di sini bukan "fungsi mengembalikan angka", melainkan bahwa
   panelnya BISA MERAH. Uji yang hanya membuktikan keadaan hijau akan mengulang
   persis kesalahan yang PRD ini perbaiki.
   ============================================================ */
type WipRoll = {
  opening: number; charged: number; liveAdj: number; unpostedAdj: number; postedAsset: number;
  closingNet: number; rollForwardResidual: number; glResidual: number; reconciles: boolean;
  unbilledTotal: number; deferredIncome: number; control: number; nonMaterialTotal: number; accrualTotal: number;
  movement: { k: string; label: string; value: number; alarm?: boolean }[];
  bridge: { label: string; value: number; alarm?: boolean }[];
  registerAll: (WipRow & { openingUnbilled: number; chargedInPeriod: number; seedStd: number })[];
};
const LIVE_014 = { 'ENG-2025-014': { std: 980_000_000, cost: 700_000_000, actualHrs: 784 } };
const roll = (live?: unknown, adj?: Record<string, number>) =>
  FIRMFIN.wip(ctx(), undefined, live, adj) as unknown as WipRoll;

describe('seed sub-buku — invarian komponen', () => {
  it('openingUnbilled + chargedInPeriod = nilai standar, untuk SETIAP perikatan', () => {
    /* Inilah yang membuat roll-forward dapat gagal: bila seseorang menggeser `std`
       tanpa menggeser komponennya, persamaannya tak lagi menutup. */
    for (const r of roll().registerAll) {
      expect(r.openingUnbilled + r.chargedInPeriod, r.id).toBe(r.seedStd);
    }
  });

  it('komponen jembatan adalah register yang dapat dijumlah, bukan persentase selisih', () => {
    const W = roll();
    expect(W.nonMaterialTotal).toBeGreaterThan(0);
    expect(W.accrualTotal).toBeGreaterThan(0);
    expect(W.control).toBe(W.postedAsset + W.nonMaterialTotal + W.accrualTotal);
  });
});

describe('SC-1/SC-2 — saldo awal adalah fakta, bukan plug', () => {
  it('saldo awal IDENTIK dengan & tanpa timesheet Time & Budget', () => {
    /* Cacat yang diperbaiki: dulu 3.180 → 1.360 jt hanya karena timesheet diisi. */
    expect(roll(LIVE_014).opening).toBe(roll().opening);
  });

  it('saldo awal tidak bergerak oleh write-down manual', () => {
    expect(roll(LIVE_014, { 'ENG-2025-063': 200_000_000 }).opening).toBe(roll().opening);
  });

  it('nilai standar jam ter-charge tidak bergerak oleh input mana pun', () => {
    const a = roll().charged, b = roll(LIVE_014).charged;
    const c = roll(LIVE_014, { 'ENG-2025-014': 500_000_000 }).charged;
    expect([b, c]).toEqual([a, a]);
  });
});

describe('SC-4 — menutup pada seed bersih, di SEMUA keadaan', () => {
  for (const [nama, live, adj] of [
    ['tanpa timesheet', undefined, undefined],
    ['dengan timesheet', LIVE_014, undefined],
    ['timesheet + write-down manual', LIVE_014, { 'ENG-2025-063': 200_000_000 }],
  ] as [string, unknown, Record<string, number> | undefined][]) {
    it(`${nama} → residual nol & reconciles`, () => {
      const W = roll(live, adj);
      expect(W.rollForwardResidual).toBe(0);
      expect(W.glResidual).toBe(0);
      expect(W.reconciles).toBe(true);
    });
  }

  it('tak ada baris alarm saat menutup', () => {
    const W = roll(LIVE_014);
    expect(W.movement.filter(m => m.alarm)).toEqual([]);
    expect(W.bridge.filter(b => b.alarm)).toEqual([]);
  });
});

describe('SC-5 — HARUS bisa gagal (kalau tidak, ia bukan rekonsiliasi)', () => {
  /* Merusak seed di memori lalu memulihkannya. Tanpa uji ini, "dapat gagal" hanya klaim. */
  const seed = () => (AMS as unknown as { WIP_ENG: { id: string; chargedInPeriod: number }[] }).WIP_ENG;

  it('menggeser chargedInPeriod satu perikatan → roll-forward TIDAK menutup & ekspor terkunci', () => {
    const row = seed().find(r => r.id === 'ENG-2025-014') as { chargedInPeriod: number };
    const asli = row.chargedInPeriod;
    try {
      row.chargedInPeriod = asli - 500_000_000;
      const W = roll();
      expect(W.rollForwardResidual).toBe(500_000_000);
      expect(W.reconciles).toBe(false);
      const alarm = W.movement.find(m => m.alarm);
      expect(alarm, 'baris alarm wajib muncul di roll-forward').toBeTruthy();
      expect((alarm as { label: string }).label).toMatch(/BELUM DIJELASKAN/);
    } finally {
      row.chargedInPeriod = asli;
    }
  });

  it('mengubah saldo kontrol GL → jembatan TIDAK menutup & selisih disebut "belum dijelaskan"', () => {
    const coa = (AMS as unknown as { FIRM_COA: { code: string; bal: number }[] }).FIRM_COA;
    const akun = coa.find(a => a.code === '1-300') as { bal: number };
    const asli = akun.bal;
    try {
      akun.bal = asli + 700_000_000;
      const W = roll();
      expect(W.glResidual).toBe(700_000_000);
      expect(W.reconciles).toBe(false);
      const alarm = W.bridge.find(b => b.alarm);
      expect(alarm, 'baris alarm wajib muncul di jembatan').toBeTruthy();
      expect((alarm as { label: string }).label).toMatch(/BELUM DIJELASKAN/);
    } finally {
      akun.bal = asli;
    }
  });

  it('sesudah dipulihkan, keduanya menutup lagi (uji tidak meninggalkan jejak)', () => {
    expect(roll().reconciles).toBe(true);
  });
});

describe('SC-6/SC-7 — tak ada lagi angka karangan di jembatan', () => {
  it('pergerakan yang belum diposting DISEBUT, bukan diserap', () => {
    const W = roll(LIVE_014);
    expect(W.unpostedAdj).not.toBe(0);
    expect(W.bridge.some(b => /BELUM diposting/i.test(b.label))).toBe(true);
  });

  it('tak ada baris jembatan yang merupakan persentase dari selisih', () => {
    /* Dulu: `otherPortfolio = reconciling * 0.82`. Baris itu berubah 115% ketika
       timesheet diisi pada perikatan yang justru ADA di dalam sampel. */
    const a = roll(), b = roll(LIVE_014);
    const nonMat = (W: WipRoll) => W.bridge.find(x => /non-material/i.test(x.label));
    expect(nonMat(a)?.value).toBe(nonMat(b)?.value);
  });

  it('reklas posisi over-billed tampil eksplisit, bukan terserap saldo awal', () => {
    const W = roll(LIVE_014);
    expect(W.movement.some(m => m.k === 'reclass')).toBe(true);
    expect(W.closingNet + W.deferredIncome).toBe(W.unbilledTotal);
  });
});
