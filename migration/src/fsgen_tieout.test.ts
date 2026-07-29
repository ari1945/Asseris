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
  it.each(['bs', 're', 'cf', 'dep', 'ar', 'pycomp', 'cfmethod'])('tie-out %s lolos', (id) => {
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
