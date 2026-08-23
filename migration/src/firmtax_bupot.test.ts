/* ============================================================
   Pajak Firma — gerbang PERILAKU atas perakit baris bukti potong.

   Gerbang sumber (`firmtax_conventions.test.ts`) membuktikan nomor karangan tak
   lagi diketik di view. Berkas ini membuktikan yang lebih keras: perakitnya
   TIDAK MENYEDIAKAN JALAN untuk menaruh nomor pada baris non-kanonik, dan tak
   ada baris yang keluar tanpa penanda asal.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AMS } from './data';
import { TAX23 } from './data_pph23';
import {
  BUPOT_MASA, PROVENANCE_LABEL, PROVENANCE_TONE, bupotRows, pphSummaryRows,
} from './firmtax_bupot';
import type { Pph23Row, Provenance, WithheldRow } from './firmtax_bupot';

const WITHHELD = AMS.PPH_WITHHELD as unknown as WithheldRow[];
const register = (): Pph23Row[] => TAX23.register() as Pph23Row[];
const payrollPeriod = (): string => String((AMS.PAYROLL_RATES as { period: string }).period);

const rows = () => bupotRows({
  masa: BUPOT_MASA, register: register(), withheld: WITHHELD, payrollPeriod: payrollPeriod(),
});

/* ------------------------------------------------------------------
   (a) Nomor dokumen hanya milik baris kanonik.
   ------------------------------------------------------------------ */
describe('FT1 · nomor bukti potong hanya berasal dari register', () => {
  it('setiap baris yang membawa nomor adalah baris kanonik', () => {
    const bernomor = rows().filter((r) => r.no !== null);
    expect(bernomor.length, 'tak ada satu pun baris kanonik terakit').toBeGreaterThan(0);
    for (const r of bernomor) expect(r.provenance).toBe('kanonik');
  });

  it('setiap nomor yang tampil benar-benar ada di register — bukan bentuk yang mirip', () => {
    const ids = new Set(register().map((r) => r.id));
    for (const r of rows().filter((x) => x.no !== null)) {
      expect(ids.has(String(r.no)), 'nomor tak ada di register: ' + r.no).toBe(true);
    }
  });

  it('baris non-kanonik TIDAK dapat membawa nomor, pihak, ataupun status', () => {
    for (const r of rows().filter((x) => x.provenance !== 'kanonik')) {
      expect(r.no, 'nomor pada baris ' + r.jenis).toBeNull();
      expect(r.pihak, 'lawan transaksi diklaim pada baris ' + r.jenis).toBeNull();
      expect(r.status, 'status penerbitan diklaim pada baris ' + r.jenis).toBeNull();
    }
  });

  it('dua literal lama tak dapat lahir kembali dari perakit ini', () => {
    const semua = rows().map((r) => String(r.no ?? ''));
    expect(semua).not.toContain('1.2-02.26-0001849');
    expect(semua).not.toContain('1.1-02.26-0009921');
    const pihak = rows().map((r) => String(r.pihak ?? ''));
    expect(pihak).not.toContain('38 karyawan (kolektif)');
  });
});

/* ------------------------------------------------------------------
   (b) Setiap baris membawa penanda asal — tidak ada keadaan "polos".
   ------------------------------------------------------------------ */
describe('FT2 · tidak ada baris tanpa penanda asal', () => {
  const SAH: Provenance[] = ['kanonik', 'ilustrasi', 'belum-tersedia'];

  it('setiap baris e-bupot punya provenance yang sah dan alasan yang terbaca', () => {
    const semua = rows();
    expect(semua.length).toBeGreaterThan(0);
    for (const r of semua) {
      expect(SAH, 'provenance tak sah pada ' + r.jenis).toContain(r.provenance);
      expect(r.note.length, 'alasan kosong pada ' + r.jenis).toBeGreaterThan(20);
    }
  });

  it('setiap baris PPh Pot/Put punya provenance yang sah', () => {
    const semua = pphSummaryRows({ withheld: WITHHELD, t23: TAX23.summary() });
    expect(semua.length).toBe(WITHHELD.length);
    for (const r of semua) expect(SAH).toContain(r.provenance);
  });

  it('ketiga keadaan punya label DAN nada yang terlihat', () => {
    for (const p of SAH) {
      expect(PROVENANCE_LABEL[p], 'label kosong: ' + p).toBeTruthy();
      expect(PROVENANCE_TONE[p], 'nada kosong: ' + p).toBeTruthy();
    }
    /* Label harus BERBEDA — dua keadaan berlabel sama = penanda yang tak menandai. */
    const label = SAH.map((p) => PROVENANCE_LABEL[p]);
    expect(new Set(label).size).toBe(SAH.length);
  });

  it('setiap token warna chip BENAR-BENAR ada di stylesheet', () => {
    /* `css_tokens.test.ts` menyatakan sendiri bahwa token yang dirakit saat runtime
       (`'var(--' + tone + ')'`) tak terbaca pemindai statis mana pun. Rancangan
       pertama penanda ini memakai nada 'gray' → `var(--gray)` / `var(--gray-bg)`,
       yang TIDAK ADA: chip "belum tersedia" akan tampil tanpa warna, diam-diam, dan
       gerbang repo tak akan melihatnya. Karena itu nadanya ditulis utuh — dan diuji
       di sini terhadap stylesheet yang sebenarnya. */
    const css = ['styles_base.css', 'styles_chrome.css', 'styles_work.css', 'styles_modules.css', 'styles_ai.css']
      .map((f) => readFileSync(join(__dirname, f), 'utf8')).join('\n');
    const dipakai = SAH.flatMap((p) => [PROVENANCE_TONE[p].fg, PROVENANCE_TONE[p].bg]);
    const hantu: string[] = [];
    for (const v of dipakai) {
      const nama = v.replace(/^var\(\s*/, '').replace(/\s*\)$/, '');
      expect(nama, 'nada bukan token: ' + v).toMatch(/^--[a-z0-9-]+$/);
      if (!css.includes(nama + ':')) hantu.push(nama);
    }
    expect(hantu, 'token hantu: ' + hantu.join(' | ')).toEqual([]);
  });

  it('tabel yang dirender memang bercampur — kalau tidak, penandanya tak diuji apa pun', () => {
    const jenis = new Set(rows().map((r) => r.provenance));
    expect(jenis.has('kanonik')).toBe(true);
    expect(jenis.has('ilustrasi')).toBe(true);
    expect(jenis.has('belum-tersedia')).toBe(true);
  });
});

/* ------------------------------------------------------------------
   (c) Baris kanonik benar-benar TERHUBUNG, bukan kebetulan cocok.
   ------------------------------------------------------------------ */
describe('FT1c · baris kanonik bergerak mengikuti registernya', () => {
  it('menambah satu pemotongan pada masa itu menambah satu baris — dengan nomornya sendiri', () => {
    const dasar = rows();
    const tambahan: Pph23Row = {
      id: '1.2-02.26-0009999', masa: BUPOT_MASA, name: 'PT Uji Register Hidup',
      dpp: 100_000_000, effRate: 2, pph: 2_000_000, status: 'Disetor', bupotIssued: true,
    };
    const sesudah = bupotRows({
      masa: BUPOT_MASA, register: [...register(), tambahan],
      withheld: WITHHELD, payrollPeriod: payrollPeriod(),
    });
    expect(sesudah.length).toBe(dasar.length + 1);
    const baru = sesudah.find((r) => r.no === tambahan.id);
    expect(baru, 'baris baru tak terakit').toBeTruthy();
    expect(baru && baru.provenance).toBe('kanonik');
    expect(baru && baru.tax).toBe(2_000_000);
  });

  it('status penerbitan DITURUNKAN dari register, bukan dipatok "Terbit"', () => {
    const draft: Pph23Row = {
      id: '1.2-02.26-0008888', masa: BUPOT_MASA, name: 'PT Uji Draft',
      dpp: 50_000_000, effRate: 2, pph: 1_000_000, status: 'Draft', bupotIssued: false,
    };
    const sesudah = bupotRows({
      masa: BUPOT_MASA, register: [...register(), draft],
      withheld: WITHHELD, payrollPeriod: payrollPeriod(),
    });
    const baris = sesudah.find((r) => r.no === draft.id);
    expect(baris && baris.status).toBe('Belum terbit');
  });

  it('masa lain tidak bocor ke dalam tabel', () => {
    for (const r of rows().filter((x) => x.provenance === 'kanonik')) {
      const src = register().find((x) => x.id === r.no);
      expect(src && src.masa).toBe(BUPOT_MASA);
    }
  });
});

/* ------------------------------------------------------------------
   (d) PPh 21 berkata belum tersedia — dan menyebut masa yang dicakup mesinnya.
   ------------------------------------------------------------------ */
describe('FT1b · PPh 21 tidak dikarang untuk masa yang mesinnya tak cakup', () => {
  it('barisnya berkeadaan belum-tersedia, tanpa satu pun angka', () => {
    const p21 = rows().find((r) => r.jenis === 'PPh 21');
    expect(p21, 'baris PPh 21 hilang seluruhnya — pembaca tak akan tahu ia ada').toBeTruthy();
    expect(p21 && p21.provenance).toBe('belum-tersedia');
    expect(p21 && p21.dpp).toBeNull();
    expect(p21 && p21.tax).toBeNull();
    expect(p21 && p21.rate).toBeNull();
  });

  it('alasannya menyebut masa yang benar-benar dicakup payroll', () => {
    const p21 = rows().find((r) => r.jenis === 'PPh 21');
    expect(p21 && p21.note).toContain(payrollPeriod());
  });

  it('masa payroll memang BUKAN masa tabel ini — premis yang membuat baris itu jujur', () => {
    /* Kalau suatu saat payroll menjadi register per-masa yang mencakup Februari,
       uji ini merah dan memberi tahu penerusnya: sambungkan sekarang. */
    expect(payrollPeriod()).not.toContain('Februari');
    expect(BUPOT_MASA).toBe('2026-02');
  });

  it('angka seed yang dibantah mesin tidak muncul di mana pun pada baris PPh 21', () => {
    const p21 = rows().find((r) => r.jenis === 'PPh 21');
    const angka = [p21 && p21.dpp, p21 && p21.tax];
    expect(angka).not.toContain(1_400_000_000);
    expect(angka).not.toContain(210_000_000);
  });
});

/* ------------------------------------------------------------------
   (e) PPh 4(2) — agregat dipertahankan, identitas dokumen tidak.
   ------------------------------------------------------------------ */
describe('FT1c · PPh 4(2) ditandai ilustrasi, bukan dihapus', () => {
  it('agregatnya tetap terlihat — kewajibannya nyata di kalender', () => {
    const p42 = rows().find((r) => r.jenis === 'PPh 4(2)');
    expect(p42, 'baris PPh 4(2) hilang — kewajiban yang ada jadi tak terlihat').toBeTruthy();
    expect(p42 && p42.provenance).toBe('ilustrasi');
    const seed = WITHHELD.find((w) => w.jenis === 'PPh 4(2)');
    expect(p42 && p42.tax).toBe(seed && seed.tax);
  });

  it('lawan transaksinya tidak diklaim — register pengecualian menyebut lebih dari satu', () => {
    const p42 = rows().find((r) => r.jenis === 'PPh 4(2)');
    expect(p42 && p42.pihak).toBeNull();
    const sewaFinal = (TAX23.EXCLUSIONS as { why: string }[])
      .filter((e) => String(e.why).includes('4(2)'));
    expect(sewaFinal.length, 'premis "lebih dari satu pihak" tak lagi berlaku').toBeGreaterThan(1);
  });

  it('barisnya lenyap bila agregat sumbernya lenyap — bukan literal yang berdiri sendiri', () => {
    const tanpa42 = bupotRows({
      masa: BUPOT_MASA, register: register(),
      withheld: WITHHELD.filter((w) => w.jenis !== 'PPh 4(2)'),
      payrollPeriod: payrollPeriod(),
    });
    expect(tanpa42.some((r) => r.jenis === 'PPh 4(2)')).toBe(false);
  });
});

/* ------------------------------------------------------------------
   (f) PPh Pot/Put — yang kanonik bergerak, yang seed ditandai.
   ------------------------------------------------------------------ */
describe('FT2 · ringkas PPh Pot/Put membedakan sumbernya', () => {
  it('baris PPh 23 memakai angka register, bukan angka seed', () => {
    const t23 = TAX23.summary();
    const baris = pphSummaryRows({ withheld: WITHHELD, t23 })
      .find((r) => r.jenis === 'PPh 23');
    expect(baris && baris.provenance).toBe('kanonik');
    expect(baris && baris.dpp).toBe(t23.totalDpp);
    expect(baris && baris.tax).toBe(t23.totalPph);
    const seed = WITHHELD.find((w) => w.jenis === 'PPh 23');
    /* Premis yang membuat uji ini bermakna: kedua angka memang BERBEDA. */
    expect(t23.totalPph).not.toBe(seed && seed.tax);
  });

  it('tanpa register, baris PPh 23 jatuh ke seed — dan mengaku ilustrasi', () => {
    const baris = pphSummaryRows({ withheld: WITHHELD, t23: null })
      .find((r) => r.jenis === 'PPh 23');
    expect(baris && baris.provenance).toBe('ilustrasi');
  });

  it('PPh 21 & PPh 4(2) ditandai ilustrasi dan tak menawarkan tautan modul', () => {
    const semua = pphSummaryRows({ withheld: WITHHELD, t23: TAX23.summary() });
    for (const r of semua.filter((x) => x.jenis !== 'PPh 23')) {
      expect(r.provenance).toBe('ilustrasi');
      expect(r.route).toBeNull();
    }
  });
});
