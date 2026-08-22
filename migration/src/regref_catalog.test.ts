/* ============================================================
   PRD `docs/prd-regulatory-reference-annual.md` · PR-4 · SC-8 · SC-9.

   Katalog adalah daftar yang DITEGAKKAN, bukan sekadar yang ditampilkan.
   Registry regulatori baru yang tak terdaftar di katalog = uji merah — kalau
   tidak, arc ini hanya memperbaiki enam set yang kebetulan sudah diketahui,
   lalu set ketujuh lahir tanpa masa berlaku seperti semula.
   ============================================================ */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import './data';
import { REGREF_EXPECTED_IDS, regrefCatalog } from './regref_catalog';
import { regrefFor, regrefIssues } from './canon_regref';
import { MODULE_INDEX } from './icons';

const SRC = __dirname;
const read = (f: string) => readFileSync(join(SRC, f), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

/* ------------------------------------------------------------------
   1. SC-8 — satu layar menjawab "apa yang harus saya perbarui"
   ------------------------------------------------------------------ */

describe('SC-8 — katalog menjawab pertanyaan bulan Januari', () => {
  const catalog = regrefCatalog();

  it('memuat persis set yang diharapkan', () => {
    expect(catalog.map((c) => c.id).sort()).toEqual([...REGREF_EXPECTED_IDS].sort());
  });

  it.each(regrefCatalog())('$id — punya set, dasar hukum, dan modul yang nyata', (c) => {
    expect(c.sets.length, c.id).toBeGreaterThan(0);
    expect(regrefIssues(c.sets, c.label), c.id).toEqual([]);
    expect((MODULE_INDEX as Record<string, unknown>)[c.module], c.module).toBeTruthy();
  });

  it.each(regrefCatalog())('$id — menyatakan AKIBAT bila kedaluwarsa, bukan namanya', (c) => {
    /* "Kalender libur 2027 belum diisi" tak memberi tahu siapa pun apa yang
       rusak. Deskripsi yang hanya mengulang label = tak berguna. */
    expect(c.breaksIfStale.length, c.id).toBeGreaterThan(80);
    expect(c.breaksIfStale.toLowerCase(), c.id).not.toBe(c.label.toLowerCase());
    expect(c.cadence.length, c.id).toBeGreaterThan(10);
  });

  it('yang menyangkut uang MEMBLOKIR; kalender cuti memperingatkan (Q-3)', () => {
    const by = Object.fromEntries(catalog.map((c) => [c.id, c.enforcement]));
    expect(by['bpjs']).toBe('block');
    expect(by['ter']).toBe('block');
    expect(by['ptkp']).toBe('block');
    expect(by['biaya-jabatan']).toBe('block');
    expect(by['hari-libur']).toBe('warn');
    /* Kurs (2026-08-22): hasilnya DIBUKUKAN ke GL 5-600, jadi ia memblokir. */
    expect(by['kurs']).toBe('block');
  });
});

/* ------------------------------------------------------------------
   2. Keadaan hari ini — dan keadaan 1 Januari tahun depan
   ------------------------------------------------------------------ */

describe('katalog menceritakan keadaan yang sesungguhnya', () => {
  const at = (date: string) => regrefCatalog().map((c) => ({
    id: c.id, look: regrefFor(c.sets, date, { label: c.label, enforcement: c.enforcement }),
  }));

  it('pada 2026-03-01 tak ada yang berhenti', () => {
    expect(at('2026-03-01').filter((r) => r.look.blocked).map((r) => r.id)).toEqual([]);
  });

  it('tiga set belum dicocokkan hari ini — BPJS, TER & kurs, dan ketiganya berkata begitu', () => {
    /* `kurs` menyusul 2026-08-22: angkanya adalah yang SUDAH dipakai pembukuan firma,
       tetapi dasar kutipannya (kurs tengah BI vs KMK) belum dicocokkan. Belum
       dicocokkan ≠ tak tercakup — ia tetap menghitung, dengan penanda. */
    const belum = at('2026-03-01').filter((r) => r.look.status === 'unverified').map((r) => r.id);
    expect(belum.sort()).toEqual(['bpjs', 'kurs', 'ter']);
  });

  it('pada 2027-01-01 BPJS & kurs berhenti — dan hanya keduanya', () => {
    /* TER/PTKP/biaya jabatan rentangnya terbuka (berlaku sampai PMK-nya diganti),
       jadi tahun depan bukan masalah bagi mereka. BPJS tahunan, jadi ia berhenti.
       Kurs ditutup di akhir periode pelaporan yang terdaftar (2026-03-31) dan
       SENGAJA tidak diperpanjang — menyalin kurs ke masa berikutnya adalah persis
       cacat yang dicabutnya. Kalender libur memperingatkan, tidak berhenti. */
    const berhenti = at('2027-01-01').filter((r) => r.look.blocked).map((r) => r.id);
    expect(berhenti.sort()).toEqual(['bpjs', 'kurs']);
    const libur = at('2027-01-01').find((r) => r.id === 'hari-libur');
    expect(libur?.look.status).toBe('no-coverage');
    expect(libur?.look.blocked).toBe(false);
  });
});

/* ------------------------------------------------------------------
   3. SC-9 — registry baru TIDAK BISA lahir tanpa terdaftar
   ------------------------------------------------------------------ */

describe('SC-9 — gerbang cakupan katalog', () => {
  it('setiap registry BERMASA BERLAKU yang diekspor sumber ada di katalog', () => {
    /* Dicocokkan pada TIPE-nya (`RegRefSet<…>[]`), bukan pada namanya:
       `STANDARDS_REGISTRY` (register standar SA/SPAP) kebetulan berakhiran sama
       tetapi bukan data regulatori bermasa berlaku. Gerbang yang mencocokkan nama
       akan menyeret berkas yang tak ada hubungannya, lalu dilemahkan orang
       berikutnya karena berisik — dan berhenti menjaga apa pun. */
    const found: string[] = [];
    for (const f of readdirSync(SRC)) {
      if (!f.endsWith('.ts') || f.endsWith('.test.ts')) continue;
      for (const m of read(f).matchAll(/export const ([A-Za-z0-9_]+)\s*:\s*RegRefSet</g)) found.push(m[1]);
    }
    expect(found.length, 'tak menemukan satu pun registry — pola gerbang berubah?').toBeGreaterThan(0);
    const katalog = read('regref_catalog.ts');
    for (const name of found) {
      expect(katalog, `${name} tidak terdaftar di regref_catalog.ts`).toContain(name);
    }
  });

  it('halaman referensi merender KATALOG, bukan daftarnya sendiri', () => {
    const src = read('view_regref.tsx');
    expect(src).toContain('regrefCatalog()');
    /* label tak boleh diketik ulang di view — kalau ya, yang tampil dan yang
       ditegakkan dapat berbeda */
    for (const c of regrefCatalog()) {
      expect(src, `${c.id}: label diketik ulang di view`).not.toContain(c.label);
    }
  });

  it('modul terdaftar di navigasi & peta lazy', () => {
    expect((MODULE_INDEX as Record<string, unknown>)['regref']).toBeTruthy();
    expect(read('lazy_views.tsx')).toContain("'regref'");
  });
});
