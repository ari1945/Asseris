/* ============================================================
   Jembatan AR & AP + status rekonsiliasi (PRD 2026-08-15).

   Dua cacat yang dipaku di sini:

   1. `reconciling = control − open` — plug tunggal yang menyerap selisih berapa pun,
      lalu diberi nama di lapisan VIEW ("termin/retensi" Rp 1.745 jt = 65% sub-buku AR;
      "akrual" Rp 697 jt = 62% sub-buku AP). Tak satu pun baris termin, retensi, atau
      akrual benar-benar ada di data.

   2. `status: |recon| < 1e6 ? 'tied' : (note ? 'bridged' : 'open')` — keempat baris
      punya `note` hardcode, sehingga `'open'` TIDAK PERNAH mungkin. Yang menentukan
      sebuah akun kontrol dinyatakan terjembatani bukan apakah ada yang menjembataninya,
      melainkan apakah seseorang pernah menuliskan sebuah kalimat.

   Sama seperti arc WIP: yang wajib dibuktikan bukan keadaan hijaunya, melainkan bahwa
   barisnya BISA MERAH.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { AMS } from './data';
import { FIRMFIN } from './data_firmfin';

type BridgeRow = { id: string; amount: number };
type ArModel = {
  open: number; control: number; bridge: BridgeRow[]; bridgeTotal: number;
  residual: number; reconciles: boolean;
};
type ApModel = ArModel & { count: number };
type ReconRow = {
  key: string; control: number; sub: number; bridgeTotal: number; residual: number;
  status: 'tied' | 'bridged' | 'open'; note: string; owner: string;
};

const ctx = () => ({ engagements: AMS.ENGAGEMENTS, clients: AMS.CLIENTS });
const ar = () => FIRMFIN.arAging(ctx()) as unknown as ArModel;
const ap = () => FIRMFIN.ap(ctx()) as unknown as ApModel;
const recon = () => FIRMFIN.reconciliations(ctx()) as unknown as ReconRow[];
const row = (k: string) => recon().find(r => r.key === k) as ReconRow;

describe('AR — jembatan dari register, bukan plug', () => {
  it('komponen jembatan dapat dijumlah & tiap baris punya identitas', () => {
    const W = ar();
    expect(W.bridge.length).toBeGreaterThan(0);
    expect(W.bridge.every(b => !!b.id && b.amount > 0)).toBe(true);
    expect(W.bridgeTotal).toBe(W.bridge.reduce((s, b) => s + b.amount, 0));
  });

  it('sub-buku + jembatan = kontrol GL 1-200 (residual nol)', () => {
    const W = ar();
    expect(W.residual).toBe(0);
    expect(W.reconciles).toBe(true);
    expect(W.open + W.bridgeTotal).toBe(W.control);
  });
});

describe('AP — jembatan dari register, bukan plug', () => {
  it('komponen jembatan dapat dijumlah & tiap baris punya identitas', () => {
    const W = ap();
    expect(W.bridge.length).toBeGreaterThan(0);
    expect(W.bridge.every(b => !!b.id && b.amount > 0)).toBe(true);
    expect(W.bridgeTotal).toBe(W.bridge.reduce((s, b) => s + b.amount, 0));
  });

  it('vendor terbuka + jembatan = kontrol GL 2-100 (residual nol)', () => {
    const W = ap();
    expect(W.residual).toBe(0);
    expect(W.reconciles).toBe(true);
    expect(W.open + W.bridgeTotal).toBe(W.control);
  });
});

describe('SC-3 — status dari ANGKA, bukan dari ada-tidaknya kalimat', () => {
  it('AR & AP bridged, dan keduanya memang punya komponen bernama', () => {
    for (const k of ['ar', 'ap']) {
      const r = row(k);
      expect(r.status, k).toBe('bridged');
      expect(r.bridgeTotal, k).toBeGreaterThan(0);
      expect(r.residual, k).toBe(0);
    }
  });

  it('baris ber-`note` TETAP bisa berstatus open — inilah cacat yang dicabut', () => {
    /* Kas punya `note` yang panjang & meyakinkan, tetapi komponennya belum
       dijumlahkan di sini (Q-1 = hanya status logic). Dulu `note` itu sendiri
       cukup untuk membuatnya "Terjembatani" selamanya. */
    const c = row('cash');
    expect(c.note.length).toBeGreaterThan(10);
    expect(c.bridgeTotal).toBe(0);
    expect(c.status).toBe('open');
  });

  it('`bridged` menuntut komponen bernama yang benar-benar ada (bukan nol)', () => {
    for (const r of recon()) {
      if (r.status === 'bridged') expect(r.bridgeTotal, r.key).not.toBe(0);
    }
  });
});

describe('SC-4 — baris WIP konsisten dengan modul WIP (#239)', () => {
  it('sub & kontrol sama dengan FIRMFIN.wip()', () => {
    const w = FIRMFIN.wip(ctx()) as unknown as { unbilledTotal: number; control: number; glResidual: number };
    const r = row('wip');
    expect(r.sub).toBe(w.unbilledTotal);
    expect(r.control).toBe(w.control);
    expect(r.residual).toBe(w.glResidual);
  });

  it('menunjuk modul WIP sebagai pemiliknya, bukan modul lain', () => {
    expect(row('wip').owner).toBe('wip');
  });
});

describe('SC-7 — HARUS bisa gagal', () => {
  it('menggeser satu baris AR_BRIDGE → AR open & residual persis sebesar pergeseran', () => {
    const reg = (AMS as unknown as { AR_BRIDGE: BridgeRow[] }).AR_BRIDGE;
    const asli = reg[0].amount;
    try {
      reg[0].amount = asli - 300_000_000;
      expect(ar().residual).toBe(300_000_000);
      expect(ar().reconciles).toBe(false);
      expect(row('ar').status).toBe('open');
    } finally {
      reg[0].amount = asli;
    }
  });

  it('menggeser saldo kontrol 2-100 → AP open', () => {
    const coa = (AMS as unknown as { FIRM_COA: { code: string; bal: number }[] }).FIRM_COA;
    const akun = coa.find(a => a.code === '2-100') as { bal: number };
    const asli = akun.bal;
    try {
      akun.bal = asli - 250_000_000;   // saldo kredit → bal negatif; kontrol = −bal
      expect(ap().reconciles).toBe(false);
      expect(row('ap').status).toBe('open');
    } finally {
      akun.bal = asli;
    }
  });

  it('sesudah dipulihkan, AR & AP menutup lagi (uji tidak meninggalkan jejak)', () => {
    expect(ar().reconciles).toBe(true);
    expect(ap().reconciles).toBe(true);
  });
});
