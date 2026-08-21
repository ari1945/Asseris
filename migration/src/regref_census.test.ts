/* ============================================================
   PRD `docs/prd-regref-tahap-a2.md` · PR-4 · SC-A9 · SC-A10.

   R4 — "Cakupan registri belum pernah diuji sebagai CAKUPAN."

   Gerbang katalog Tahap A (SC-9) menjaga registry yang SUDAH menjadi
   `RegRefSet`. Berkas ini menjaga arah sebaliknya: besaran regulatori yang
   belum pernah menjadi satu pun tak dapat lahir diam-diam.

   Uji di bawah dirancang agar dapat DINYATAKAN SALAH:

     · tanam `const PPN_RATE = 0.11;` di berkas mana pun → merah, dengan
       pesan yang menyebut berkas dan namanya;
     · hapus salah satu situs yang terdaftar → merah (prune), bukan hijau diam;
     · tambah satu `0.22` di berkas yang sudah terdaftar → merah, karena
       jumlahnya ikut dipaku;
     · tambah entri katalog tanpa entri sensus (atau sebaliknya) → merah.
   ============================================================ */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import './data';
import { regrefCatalog } from './regref_catalog';
import {
  CIT_LITERAL_SITES, REGREF_CENSUS, REGREF_CONST_SITES,
  countCitLiterals, findConstSites,
} from './regref_census';
import type { SourceFile } from './regref_census';

const SRC = __dirname;

function sources(): SourceFile[] {
  const out: SourceFile[] = [];
  for (const f of readdirSync(SRC)) {
    if (!/\.tsx?$/.test(f)) continue;
    if (/\.test\.tsx?$/.test(f)) continue;
    out.push({ file: f, text: readFileSync(join(SRC, f), 'utf8') });
  }
  return out;
}

const key = (a: { file: string; name: string }) => a.file + '::' + a.name;

/* ------------------------------------------------------------------
   1. Sensus ↔ katalog saling menutup
   ------------------------------------------------------------------ */

describe('SC-A9 — sensus dan katalog saling menutup', () => {
  it('setiap entri sensus yang berkunci masa berlaku ada di katalog', () => {
    const ids = new Set(regrefCatalog().map((c) => c.id));
    for (const e of REGREF_CENSUS) {
      if (e.catalogId == null) continue;
      expect(ids.has(e.catalogId), `${e.id}: catalogId '${e.catalogId}' tak ada di regrefCatalog()`).toBe(true);
    }
  });

  it('setiap entri katalog punya entri sensus — tak ada registry tanpa asal-usul', () => {
    const byCatalog = new Set(REGREF_CENSUS.map((e) => e.catalogId).filter(Boolean));
    for (const c of regrefCatalog()) {
      expect(byCatalog.has(c.id), `katalog '${c.id}' tidak tercatat di REGREF_CENSUS`).toBe(true);
    }
  });

  it('entri yang BELUM berkunci masa berlaku wajib menyatakan apa yang menahannya', () => {
    /* Diam bukan jawaban. Sebuah besaran regulatori yang dibiarkan di luar
       registry harus menyebutkan alasannya, supaya keputusannya dapat ditinjau
       — bukan sekadar tak pernah ditanyakan. */
    for (const e of REGREF_CENSUS) {
      if (e.catalogId != null) continue;
      expect(e.pending.length, `${e.id}: catalogId null tanpa alasan`).toBeGreaterThan(80);
    }
  });

  it('setiap entri menyebut dasar hukumnya, dan id-nya unik', () => {
    const seen = new Set<string>();
    for (const e of REGREF_CENSUS) {
      expect(seen.has(e.id), `id sensus ganda: ${e.id}`).toBe(false);
      seen.add(e.id);
      expect(e.basis.length, e.id).toBeGreaterThan(5);
      expect(e.what.length, e.id).toBeGreaterThan(20);
    }
  });
});

/* ------------------------------------------------------------------
   2. Detektor A — konstanta yang tampak regulatori
   ------------------------------------------------------------------ */

describe('SC-A9 — konstanta regulatori tak dapat lahir tanpa dinyatakan', () => {
  const found = findConstSites(sources());
  const declared = new Map(REGREF_CONST_SITES.map((d) => [key(d), d]));

  it('detektor masih menemukan sesuatu — polanya belum mati diam-diam', () => {
    /* Gerbang yang berhenti cocok apa pun akan hijau selamanya sambil tidak
       menjaga apa-apa. Ini penjaga penjaganya. */
    expect(found.length, 'detektor nol hasil: pola CONST_SCALAR/CONST_VOCAB berubah?').toBeGreaterThan(0);
  });

  it('setiap situs yang ditemukan sudah punya putusan di REGREF_CONST_SITES', () => {
    const belum = found.filter((h) => !declared.has(key(h)));
    expect(
      belum.map((h) => `${h.file}: const ${h.name} = ${h.value}`),
      'konstanta bernama regulatori tanpa putusan — daftarkan di REGREF_CONST_SITES '
      + '(verdict + alasan), atau pindahkan nilainya ke registry berkunci masa berlaku',
    ).toEqual([]);
  });

  it('SC-A10 — putusan yang situsnya sudah hilang ikut merah (prune)', () => {
    const live = new Set(found.map(key));
    const basi = REGREF_CONST_SITES.filter((d) => !live.has(key(d)));
    expect(
      basi.map((d) => `${d.file}: ${d.name}`),
      'putusan menunjuk konstanta yang tak ada lagi — cabut barisnya',
    ).toEqual([]);
  });

  it('putusan "regulatori" menunjuk entri sensus yang nyata; semuanya beralasan', () => {
    const ids = new Set(REGREF_CENSUS.map((e) => e.id));
    for (const d of REGREF_CONST_SITES) {
      expect(d.why.length, `${d.file}:${d.name} tanpa alasan`).toBeGreaterThan(30);
      if (d.verdict === 'regulatori') {
        expect(d.censusId && ids.has(d.censusId), `${d.file}:${d.name} → censusId '${d.censusId}'`).toBe(true);
      }
    }
  });
});

/* ------------------------------------------------------------------
   3. Detektor B — literal tarif PPh Badan
   ------------------------------------------------------------------ */

describe('SC-A7 — tarif PPh Badan tak lagi hidup sebagai literal yang menghitung', () => {
  const counts = countCitLiterals(sources());
  const declared = new Map(CIT_LITERAL_SITES.map((d) => [d.file, d]));

  it('registry adalah satu-satunya pemilik nilainya', () => {
    const owner = counts.find((c) => c.file === 'canon_cit.ts');
    expect(owner, 'canon_cit.ts tidak memuat nilainya — registry kosong?').toBeTruthy();
  });

  it('setiap berkas yang memuat 0,22 sudah dinyatakan BESERTA jumlahnya', () => {
    const salah = counts
      .filter((c) => (declared.get(c.file)?.count ?? -1) !== c.count)
      .map((c) => `${c.file}: ${c.count}× (terdaftar ${declared.get(c.file)?.count ?? 'tidak ada'})`);
    expect(
      salah,
      'angka 0,22 muncul di tempat/jumlah yang belum dinyatakan. Bila itu tarif PPh Badan, '
      + 'ambil dari `canon_cit` (registry berkunci masa berlaku); bila bukan, daftarkan di '
      + 'CIT_LITERAL_SITES beserta alasannya.',
    ).toEqual([]);
  });

  it('SC-A10 — berkas terdaftar yang sudah bersih ikut merah (prune)', () => {
    const live = new Set(counts.map((c) => c.file));
    expect(
      CIT_LITERAL_SITES.filter((d) => !live.has(d.file)).map((d) => d.file),
      'berkas terdaftar tak memuat 0,22 lagi — cabut barisnya',
    ).toEqual([]);
  });

  it('modul pajak yang dulu menyimpan salinannya kini kosong dari literal itu', () => {
    /* Delapan berkas dulu mengetik tarifnya sendiri. Nama-nama ini disebut
       supaya kepulangannya terlihat sebagai regresi, bukan sebagai baris baru
       di daftar pengecualian. */
    const dulu = [
      'canon_base.ts', 'canon_part3.ts', 'data_proforma.ts', 'view_aje.tsx',
      'view_firmtax.tsx', 'view_psak46.tsx', 'view_psak24.tsx', 'view_spr2410.tsx',
    ];
    const kembali = counts.filter((c) => dulu.includes(c.file)).map((c) => c.file);
    expect(kembali, 'tarif PPh Badan kembali diketik di modul yang sudah dicabut').toEqual([]);
  });

  it('setiap alasan menyebut MENGAPA ia bukan tarif pajak', () => {
    for (const d of CIT_LITERAL_SITES) expect(d.why.length, d.file).toBeGreaterThan(30);
  });
});
