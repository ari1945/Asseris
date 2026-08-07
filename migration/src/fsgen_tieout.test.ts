/* ============================================================
   PR-H3 — TIE-OUT HARUS DAPAT GAGAL.

   Tiga dari delapan tie-out `buildTieOuts` dulu membandingkan sebuah nilai
   dengan DIRINYA SENDIRI:

     chk('dep', …, m.meta.depreciation, m.meta.depreciation, …)
     chk('ar',  …, piutang.cy,          piutang.cy,          …)
     chk('aje', …, ajeTotalPosted,      ajeTotalPosted,      …)

   Ketiganya mustahil gagal. Tiga lampu hijau permanen di panel yang tugasnya
   meyakinkan pembaca bahwa laporan sudah direkonsiliasi — lebih buruk daripada
   tak ada pemeriksaan, karena ia mengajari pembacanya bahwa panel ini tak perlu
   dibaca. Pada saat ada yang benar-benar putus, kebiasaan itu sudah terbentuk.

   Uji di bawah tidak cukup memeriksa "ok === true": itu justru yang selalu benar
   pada versi lama. Ia MERUSAK model lalu menuntut tie-out MENYALA. Sebuah
   pemeriksaan yang tak dapat dibuat gagal bukan pemeriksaan.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { FSGEN } from './fsgen_model';
import type { FsEquityInput } from './fsgen_model';
import { AMS } from './data';
import type { WTB } from './canon_types';

const WTB_SEED = AMS.WTB as unknown as WTB;
const build = () => FSGEN.buildModel(WTB_SEED, undefined, 'reported');
const ajePosted = (AMS.AJE as Array<{ status: string; amount: number }>)
  .filter(a => a.status === 'Posted').reduce((s, a) => s + a.amount, 0);

type Check = { id: string; ok: boolean; a: number; b: number; diff: number };
const byId = (rows: Check[], id: string) => rows.find(r => r.id === id)!;

describe('PR-H3 — tie-out lolos pada model yang sehat', () => {
  const rows = FSGEN.buildTieOuts(build(), ajePosted) as Check[];
  it.each(['bs', 're', 'cf', 'dep', 'ar', 'pycomp', 'cfmethod', 'eqroll'])('tie-out %s lolos', (id) => {
    expect(byId(rows, id).ok).toBe(true);
  });
});

describe('PR-H3 — tie-out MENYALA saat model dirusak (bukti ia bukan tautologi)', () => {
  /* Merusak SATU sisi saja. Pada versi lama kedua sisi adalah ekspresi yang sama,
     sehingga perusakan apa pun tetap membiarkan `ok === true`. */
  it('dep: add-back penyusutan digeser → tie-out gagal', () => {
    const m = build();
    m.meta.depreciation += 5_000_000_000;
    expect(byId(FSGEN.buildTieOuts(m, ajePosted) as Check[], 'dep').ok).toBe(false);
  });

  it('ar: piutang neto pada Neraca digeser → tie-out gagal', () => {
    const m = build();
    const piutang = m.bs.ca.find((l: { key: string }) => l.key === 'piutang')!;
    piutang.cy += 3_000_000_000;
    expect(byId(FSGEN.buildTieOuts(m, ajePosted) as Check[], 'ar').ok).toBe(false);
  });

  it('aje: total register menyimpang dari yang tercermin di laporan → tie-out gagal', () => {
    const rows = FSGEN.buildTieOuts(build(), ajePosted + 7_000_000_000) as Check[];
    expect(byId(rows, 'aje').ok).toBe(false);
  });

  /* Penjaga bahwa `aje` benar-benar mengukur SESUATU: pada model sehat ia lolos,
     jadi kegagalan di atas datang dari penyimpangan, bukan dari pemeriksaan yang
     memang selalu merah. */
  it('aje: lolos saat register cocok dengan laporan', () => {
    expect(byId(FSGEN.buildTieOuts(build(), ajePosted) as Check[], 'aje').ok).toBe(true);
  });
});

/* ============================================================
   `eqroll` — Perubahan Ekuitas terhadap Posisi Keuangan.

   Sisi ini TAK DIJAGA sama sekali sampai sekarang, dan ketiadaannya berbiaya:
   LPE menyajikan total ekuitas Rp 6.554 jt lebih rendah daripada neracanya
   sendiri (PKL ditaruh di kolom Saldo Laba, sementara `endRE` tak lagi memuatnya
   sejak PR-I3) — di bawah panel yang menyatakan 8/8 rekonsiliasi lolos.

   Pembandingnya rollforward vs saldo akhir, BUKAN dua penjumlahan atas akun yang
   sama; uji ketiga di bawah memaku sifat itu.
   ============================================================ */
describe('eqroll — rollforward ekuitas menutup ke Posisi Keuangan (PSAK 1)', () => {
  it('modal saham bergerak tanpa baris di LPE → tie-out gagal', () => {
    const m = build();
    const modal = m.bs.eq.find((l: { key: string }) => l.key === 'modal')!;
    modal.cy += 9_000_000_000;                       // penerbitan saham yang tak punya barisnya
    m.bs.totalEq.cy += 9_000_000_000;
    expect(byId(FSGEN.buildTieOuts(m, ajePosted) as Check[], 'eqroll').ok).toBe(false);
  });

  it('dividen dibayar (saldo akhir turun) tanpa baris di LPE → tie-out gagal', () => {
    const m = build();
    m.bs.totalEq.cy -= 4_000_000_000;
    expect(byId(FSGEN.buildTieOuts(m, ajePosted) as Check[], 'eqroll').ok).toBe(false);
  });

  it('BUKAN identitas: menggeser rollforward saja pun menyalakannya', () => {
    const m = build();
    m.eqr.totalEqPY += 2_500_000_000;                // hanya sisi kiri
    expect(byId(FSGEN.buildTieOuts(m, ajePosted) as Check[], 'eqroll').ok).toBe(false);
  });

  it('PKL ikut diperhitungkan — tanpa `oci` rollforward tak akan menutup', () => {
    const m = build();
    expect(Math.round(m.eqr.oci / 1e6)).toBe(6_554);   // PKL seed benar-benar ada
    const tanpaOci = m.eqr.totalEqPY + m.eqr.netIncome;
    expect(Math.round((m.bs.totalEq.cy - tanpaOci) / 1e6)).toBe(6_554);
  });
});

/* Penyajian LPE. Diuji lewat `FSGEN.equityRows` — SUMBER BARIS yang benar-benar
   dirender layar DAN dipakai muatan ekspor. Menguji rekonstruksi baris di dalam
   berkas uji hanya akan menguji uji itu sendiri: ia akan tetap hijau meski
   komponennya kembali menaruh PKL di kolom Saldo Laba. */
describe('Laporan Perubahan Ekuitas — kolom foot & penutup = Posisi Keuangan', () => {
  const rowsOf = (e: FsEquityInput) => FSGEN.equityRows(e);

  it('PKL berada di KOLOMNYA SENDIRI, bukan di kolom Saldo Laba', () => {
    const rows = rowsOf(build().eqr);
    const pkl = rows.find(r => r.key === 'pkl')!;
    expect(Math.round(pkl.oci / 1e6)).toBe(6_554);
    expect(pkl.re).toBe(0);          // inilah yang dulu keliru
    expect(pkl.note).toBe('13');
  });

  it('setiap kolom menjumlah ke saldo penutupnya', () => {
    const rows = rowsOf(build().eqr);
    const gerak = rows.filter(r => !r.total);
    const akhir = rows.find(r => r.total)!;
    for (const k of ['modal', 're', 'oci'] as const) {
      const jumlah = gerak.reduce((a, r) => a + r[k], 0);
      expect(Math.round(jumlah / 1e6)).toBe(Math.round(akhir[k] / 1e6));
    }
  });

  it('total ekuitas penutup LPE = Total Ekuitas pada Posisi Keuangan, di KEDUA basis', () => {
    for (const b of ['reported', 'ifAllProposed'] as const) {
      const m = FSGEN.buildModel(WTB_SEED, AMS.AJE as never, b);
      const akhir = rowsOf(m.eqr).find(r => r.total)!;
      expect(Math.round((akhir.modal + akhir.re + akhir.oci) / 1e6))
        .toBe(Math.round(m.bs.totalEq.cy / 1e6));
    }
  });

  it('kolom Saldo Laba TIDAK memuat PKL — penutupnya persis awal + laba', () => {
    const rows = rowsOf(build().eqr);
    const awal = rows.find(r => r.key === 'awal')!, laba = rows.find(r => r.key === 'laba')!;
    const akhir = rows.find(r => r.total)!;
    expect(Math.round(akhir.re / 1e6)).toBe(Math.round((awal.re + laba.re) / 1e6));
  });
});
