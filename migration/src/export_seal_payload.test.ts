/* ============================================================
   F-3 · APA YANG SEBENARNYA DIJAMIN SEGEL.

   Cacat yang ditutup, dan ia lebih besar daripada yang dinyatakan PRD.

   PRD menulis (E-4): *"Segelnya membuktikan isi tabelnya, bukan siapa yang
   menerbitkannya."* Separuh kedua benar. Separuh PERTAMA tidak: sebelum F-3,
   segel juga tidak membuktikan isi tabel.

   Sebabnya satu baris:

       JSON.stringify(pick, Object.keys(pick).sort())

   Argumen kedua `JSON.stringify` BUKAN pengurut kunci — ia REPLACER berupa
   daftar-izin kunci, dan berlaku REKURSIF. Daftar izinnya hanya memuat kunci
   TINGKAT ATAS, sehingga setiap objek sheet dan setiap blok PDF diserialisasi
   menjadi `{}`. Yang ditandatangani tinggal `kind`, `title`, `refNo`, `meta`
   (PDF), dan JUMLAH sheet/blok.

   Dibuktikan lewat jalur produksi (bukan rekonstruksi) sebelum perbaikan: dua
   register dengan baris, nilai, DAN jumlah baris berbeda menghasilkan
   contentHash yang identik — `6cf8b2f9…` keduanya. Segel Ed25519 menandatangani
   hash itu, sehingga kedua artefak memperoleh segel yang dapat dipertukarkan.

   Mengapa ini lolos bertahun-tahun: uji lamanya
   (`export_pdf.test.ts` — "changes when the content changes") mengubah `title`,
   satu dari tiga field yang KEBETULAN memang ikut. Gerbang yang tampak menjaga
   persis hal ini, tetapi menyentuh satu-satunya bagian yang tidak rusak.

   Berkas ini memaku KEDUANYA:
     · cakupan ISI  — mengubah satu sel menggeser hash;
     · cakupan IDENTITAS (SC-4) — mengubah firma/scopeId menggeser hash;
   dan menjaga V1 tetap dapat direproduksi (SC-9), karena menyatakan artefak lama
   "tidak sah" hanya karena algoritmanya berkembang adalah kegagalan yang lebih
   buruk daripada cacat yang diperbaiki (Q-2 PRD).
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  canonicalSealPayload, SEAL_FORMAT_V1, SEAL_FORMAT_V2, SEAL_FORMAT_CURRENT,
  type SealPayloadIdentity, type SealPayloadModel,
} from './export_seal_payload';

const ID_A: SealPayloadIdentity = { firm: 'KAP Wijaya Hartono & Rekan', scope: 'engagement', scopeId: 'ENG-2025-014' };

const xlsx = (rows: unknown[][]): SealPayloadModel => ({
  kind: 'firm-records', title: 'Register Arsip', meta: ['10 arsip'],
  sheets: [{ name: 'Register', columns: ['Kotak', 'Nilai'], rows, totals: [] }],
});
const pdf = (body: unknown[][]): SealPayloadModel => ({
  kind: 'materiality-memo', title: 'Memo', refNo: 'R-1', meta: ['m'],
  blocks: [{ type: 'table', head: ['A'], body }],
});

const v2 = (f: 'pdf' | 'xlsx', m: SealPayloadModel, id: SealPayloadIdentity = ID_A) =>
  canonicalSealPayload(f, SEAL_FORMAT_V2, m, id);
const v1 = (f: 'pdf' | 'xlsx', m: SealPayloadModel) =>
  canonicalSealPayload(f, SEAL_FORMAT_V1, m, ID_A);

/* ==================================================================
   §1 · CAKUPAN ISI — segel berhenti buta terhadap tabelnya.
   ================================================================== */
describe('§1 payload menutupi ISI artefak', () => {
  it('XLSX — satu sel berubah ⇒ payload berubah', () => {
    expect(v2('xlsx', xlsx([['ARK-1', 1000]]))).not.toBe(v2('xlsx', xlsx([['ARK-1', 1001]])));
  });

  it('XLSX — jumlah baris berbeda & nilai berbeda ⇒ payload berbeda (repro persis)', () => {
    expect(v2('xlsx', xlsx([['Sentosa', 1000000]])))
      .not.toBe(v2('xlsx', xlsx([['Graha', 999], ['Lain', 42]])));
  });

  it('PDF — satu sel tabel berubah ⇒ payload berubah', () => {
    expect(v2('pdf', pdf([['1']]))).not.toBe(v2('pdf', pdf([['2']])));
  });

  it('isi sheet BENAR-BENAR muncul di payload, bukan `{}`', () => {
    const s = v2('xlsx', xlsx([['ARK-9', 77]]));
    expect(s).toContain('ARK-9');
    expect(s).toContain('77');
    expect(s).not.toContain('"sheets":[{}]');
  });

  it('V1 BUTA pada ketiganya — inilah cacat yang dibekukan, dan buktinya §1 bukan tautologi', () => {
    expect(v1('xlsx', xlsx([['Sentosa', 1000000]])))
      .toBe(v1('xlsx', xlsx([['Graha', 999], ['Lain', 42]])));
    expect(v1('pdf', pdf([['1']]))).toBe(v1('pdf', pdf([['2']])));
    expect(v1('xlsx', xlsx([['ARK-9', 77]]))).toContain('"sheets":[{}]');
  });
});

/* ==================================================================
   §2 · SC-4 — identitas ikut ditandatangani.
   ================================================================== */
describe('§2 SC-4 identitas masuk payload', () => {
  const m = xlsx([['ARK-1', 1]]);

  it('firma berbeda ⇒ payload berbeda', () => {
    expect(v2('xlsx', m, ID_A)).not.toBe(v2('xlsx', m, { ...ID_A, firm: 'KAP Lain & Rekan' }));
  });

  it('scopeId berbeda ⇒ payload berbeda', () => {
    expect(v2('xlsx', m, ID_A)).not.toBe(v2('xlsx', m, { ...ID_A, scopeId: 'ENG-2025-063' }));
  });

  it('scope berbeda ⇒ payload berbeda', () => {
    expect(v2('xlsx', m, ID_A)).not.toBe(v2('xlsx', m, { ...ID_A, scope: 'firm' }));
  });

  it('berlaku untuk PDF juga', () => {
    const p = pdf([['1']]);
    expect(v2('pdf', p, ID_A)).not.toBe(v2('pdf', p, { ...ID_A, firm: 'KAP Lain & Rekan' }));
  });

  it('V1 buta terhadap identitas — keluhan E-4 PRD, dipaku', () => {
    expect(v1('xlsx', m)).toBe(v1('xlsx', m));
    /* V1 tak menerima identitas sama sekali: dua penerbit berbeda ⇒ hash sama. */
    expect(canonicalSealPayload('xlsx', SEAL_FORMAT_V1, m, ID_A))
      .toBe(canonicalSealPayload('xlsx', SEAL_FORMAT_V1, m, { ...ID_A, firm: 'KAP Lain & Rekan' }));
  });

  it('Q-4 — `meta` XLSX kini ikut ditandatangani (dulu tidak)', () => {
    const a = { ...xlsx([['ARK-1', 1]]), meta: ['10 arsip'] };
    const b = { ...xlsx([['ARK-1', 1]]), meta: ['11 arsip'] };
    expect(v2('xlsx', a)).not.toBe(v2('xlsx', b));
    expect(v1('xlsx', a)).toBe(v1('xlsx', b));   // pembeda: dulu memang tidak ikut
  });
});

/* ==================================================================
   §3 · SC-9 — dua versi hidup berdampingan; segel lama tetap reproducible.
   ================================================================== */
describe('§3 SC-9 jalur verifikasi dua-versi', () => {
  const m = xlsx([['ARK-1', 1]]);

  it('V1 dan V2 atas model yang SAMA menghasilkan payload berbeda', () => {
    expect(v1('xlsx', m)).not.toBe(v2('xlsx', m));
  });

  it('V1 BEKU — bentuknya persis seperti sebelum F-3 (segel lama reproducible)', () => {
    /* Golden. Kalau baris ini berubah, segel yang terbit sebelum F-3 tak lagi
       dapat direproduksi dan artefak audit yang sah akan tampak palsu. */
    expect(v1('xlsx', m)).toBe('{"kind":"firm-records","sheets":[{}],"title":"Register Arsip"}');
    expect(v1('pdf', pdf([['1']])))
      .toBe('{"blocks":[{}],"kind":"materiality-memo","meta":["m"],"refNo":"R-1","title":"Register Arsip"}'
        .replace('Register Arsip', 'Memo'));
  });

  it('versi dipilih oleh ARGUMEN, bukan oleh konstanta global', () => {
    expect(canonicalSealPayload('xlsx', SEAL_FORMAT_V1, m, ID_A)).toBe(v1('xlsx', m));
    expect(canonicalSealPayload('xlsx', SEAL_FORMAT_V2, m, ID_A)).toBe(v2('xlsx', m));
  });

  it('penandatanganan BARU memakai V2', () => {
    expect(SEAL_FORMAT_CURRENT).toBe(SEAL_FORMAT_V2);
    expect(canonicalSealPayload('xlsx', SEAL_FORMAT_CURRENT, m, ID_A)).toBe(v2('xlsx', m));
  });

  it('`sealFormat` ikut DI DALAM payload — pemisah domain V1/V2', () => {
    expect(v2('xlsx', m)).toContain('"sealFormat":2');
  });
});

/* ==================================================================
   §4 · DETERMINISME — payload harus reproducible dari data yang sama.
   ================================================================== */
describe('§4 determinisme', () => {
  it('urutan kunci pada MASUKAN tidak menggeser payload', () => {
    const a: SealPayloadModel = { kind: 'k', title: 't', sheets: [{ name: 'S', rows: [[1]], columns: ['A'] }] };
    const b: SealPayloadModel = { title: 't', sheets: [{ columns: ['A'], rows: [[1]], name: 'S' }], kind: 'k' };
    expect(v2('xlsx', a)).toBe(v2('xlsx', b));
  });

  it('ekspor ulang dari data yang sama menghasilkan payload yang sama', () => {
    expect(v2('xlsx', xlsx([['x', 1]]))).toBe(v2('xlsx', xlsx([['x', 1]])));
  });

  it('field render yang TIDAK terdaftar tidak menggeser hash (colWidths)', () => {
    const a: SealPayloadModel = { kind: 'k', title: 't', sheets: [{ name: 'S', rows: [[1]], colWidths: [10] }] };
    const b: SealPayloadModel = { kind: 'k', title: 't', sheets: [{ name: 'S', rows: [[1]], colWidths: [99] }] };
    expect(v2('xlsx', a)).toBe(v2('xlsx', b));
  });
});

/* ==================================================================
   §5 · ANTI-TAUTOLOGI — gerbang §1/§2 dijalankan atas implementasi yang
   sengaja dikembalikan ke bentuk cacatnya, dan dituntut GAGAL.
   ================================================================== */
describe('§5 anti-tautologi — gerbang bisa MERAH', () => {
  /* Bentuk cacat direplikasi di sini, bukan diimpor: kalau ia diimpor, gerbang
     ini akan ikut "diperbaiki" saat sumbernya diperbaiki dan berhenti menjaga. */
  const cacat = (model: SealPayloadModel) => {
    const pick = {
      kind: model.kind,
      title: model.title,
      sheets: (Array.isArray(model.sheets) ? model.sheets : []).map((s) => {
        const o = s as Record<string, unknown>;
        return { name: o.name || '', heading: '', columns: o.columns || [], rows: o.rows || [], totals: [] };
      }),
    };
    return JSON.stringify(pick, Object.keys(pick).sort());
  };

  it('implementasi cacat GAGAL uji cakupan isi', () => {
    expect(cacat(xlsx([['Sentosa', 1000000]]))).toBe(cacat(xlsx([['Graha', 999], ['Lain', 42]])));
  });

  it('implementasi cacat GAGAL uji identitas (ia tak punya tempat untuk identitas)', () => {
    expect(cacat(xlsx([['a', 1]]))).not.toContain('KAP');
  });

  it('replacer daftar-izin memang MENELAN objek bersarang — akar cacatnya', () => {
    const pick = { kind: 'x', sheets: [{ name: 'S', rows: [[1, 2]] }] };
    expect(JSON.stringify(pick, Object.keys(pick).sort())).toBe('{"kind":"x","sheets":[{}]}');
  });
});

/* ==================================================================
   §6 · TRIPWIRE SUMBER — bentuk cacat tak boleh kembali ke jalur produksi.
   ================================================================== */
describe('§6 tripwire sumber', () => {
  const src = (f: string) => readFileSync(join(__dirname, f), 'utf8');
  const buangKomentar = (s: string) =>
    s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

  it('eksporter tidak lagi merakit payload kanoniknya sendiri', () => {
    for (const f of ['export_pdf.ts', 'export_xlsx.ts']) {
      const kode = buangKomentar(src(f));
      expect(kode, `${f} masih punya canonicalPayload lokal`).not.toMatch(/function canonicalPayload/);
      expect(kode, `${f} tak memakai payload berversi`).toMatch(/canonicalSealPayload\(/);
      expect(kode, `${f} tak mengirim sealFormat ke server`).toMatch(/sealFormat: SEAL_FORMAT_CURRENT/);
    }
  });

  it('nol replacer daftar-izin di JALUR V2 (V1 sengaja masih memakainya)', () => {
    const kode = buangKomentar(src('export_seal_payload.ts'));
    const v2Body = kode.slice(kode.indexOf('function canonicalV2'));
    expect(v2Body).not.toMatch(/JSON\.stringify\([^)]*,\s*Object\.keys/);
  });
});
