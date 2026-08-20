/* ============================================================
   F-2 · `docs/prd-export-seal-identity-ssot.md` — identitas DITARIK, bukan didorong.

   Yang ditutup PR ini adalah kelas, bukan situs: `firm` dan `scopeId` berhenti
   menjadi argumen call-site. Empat cacat mati sekaligus —

     E-1  `|| 'ENG-2025-014'`            → segel & baris audit di berkas klien lain
     E-2  `|| 'default'`                 → artefak diam-diam TIDAK tersegel
     E-3  `window.activeEngagement?.id`  → nol penulis sejak window-strip ⇒ undefined
     E-4  `firm: 'KAP …'`                → 60 literal identitas penerbit

   Gerbang utamanya BUKAN berkas ini melainkan `tsc`: `firm?: never` /
   `scopeId?: never` membuat pengiriman identitas menjadi error kompilasi,
   termasuk lewat spread (`{ ...base }`) yang tak akan tertangkap kalau
   field-nya sekadar dihilangkan dari tipe. Berkas ini menjaga apa yang tak
   dilihat tsc: literal yang tersisa di sumber, dan pembaca global yang mati.

   §4 membuktikan tiap gerbang bisa MERAH. Tanpa itu, hijau di sini tak
   membuktikan apa pun (pelajaran #242).
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { AMS } from './data';

const SRC = __dirname;

/** Nama firma KITA dari SSOT — satu-satunya nama yang terlarang sebagai literal. */
const NAMA_FIRMA = String((AMS as unknown as { FIRM: { name: string } }).FIRM.name);
const literalNamaKitaSendiri = new RegExp(
  "['\"`]" + NAMA_FIRMA.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
);

const stripComments = (src: string) => src
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

const codeOf = (file: string) => stripComments(readFileSync(join(SRC, file), 'utf8'));

/** Sumber produksi — tier uji dikecualikan (uji BOLEH menyebut pola lama). */
const sourceFiles = (): string[] => readdirSync(SRC)
  .filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f) && !/\.d\.ts$/.test(f));

/* Predikat gerbang = fungsi murni atas teks, agar §4 dapat menjalankannya atas
   sumber yang sengaja dirusak. */
const GATES: ReadonlyArray<{ name: string; ok: (code: string) => boolean }> = [
  {
    /* SC-1 — E-4. Gerbang UTAMANYA `tsc`: `firm?: never` menolak kunci `firm`
       di model ekspor, termasuk yang datang lewat spread. Yang dijaga DI SINI
       adalah sisa yang tak dilihat tsc — nama KAP yang diketik sebagai literal.

       Sengaja BUKAN /firm:/ polos, dan bukan /'KAP …'/ polos. Keduanya
       menghukum KATA, bukan maknanya, dan akan memerah atas data domain yang
       sepenuhnya sah:

         · anotasi parameter `firm: unknown` (view_misc1);
         · firma PIHAK KETIGA — pakar SA 620 (view_specifics2), auditor komponen
           SA 600 (view_groupaudit), auditor pendahulu SA 510 (view_opening),
           auditor organisasi jasa SA 402 (view_serviceorg).

       Yang salah bukan menyebut sebuah KAP; yang salah adalah MENGETIK NAMA
       KAP KITA SENDIRI alih-alih membacanya. Jadi gerbangnya membandingkan
       dengan SSOT: satu-satunya nama yang terlarang sebagai literal adalah
       `AMS.FIRM.name`. Gerbang yang menghukum kata akan dilemahkan orang
       berikutnya; gerbang yang menghukum makna tidak. */
    name: 'tak menulis identitas firma ke payload ekspor',
    ok: (code) => !literalNamaKitaSendiri.test(code),
  },
  {
    /* SC-3 — E-1/E-2 */
    name: 'tak merakit scopeId untuk payload ekspor',
    ok: (code) => !/\bscopeId:\s*/.test(code),
  },
  {
    /* SC-6 — E-3 */
    name: 'tak membaca perikatan aktif dari global yang mati',
    ok: (code) => !/\bactiveEngagement\?\.id/.test(code) || !/window as|AMS as/.test(code),
  },
  {
    /* SC-2 — sisa literal perikatan di berkas yang menyentuh ekspor */
    name: 'tak memuat literal perikatan',
    ok: (code) => !/'ENG-\d{4}-\d{3}'/.test(code),
  },
];

/** Berkas yang benar-benar menerbitkan artefak. */
const exportFiles = (): string[] => sourceFiles()
  .filter((f) => /ams(ExportPdf|ExportXlsx)\s*\(/.test(codeOf(f)));

/** Pemegang sah kata `firm:`/`scopeId:` — merekalah yang MENARIKNYA dari SSOT. */
const HELPERS = ['export_pdf.ts', 'export_xlsx.ts', 'export_identity.ts', 'persist_scope.ts', 'contexts.tsx', 'api.ts'];

describe('§1 permukaan ekspor tak lagi mengarang identitas', () => {
  it('ada berkas yang diperiksa (penjaga gerbang yang lulus karena kosong)', () => {
    /* Kegagalan senyap yang nyata di repo ini: parser meleset → nol berkas →
       seluruh gerbang lulus tanpa memeriksa apa pun (lihat prd_registry.test.ts). */
    expect(exportFiles().length).toBeGreaterThan(50);
  });

  it('SC-1 — nol berkas ekspor mengetik nama firma KITA sebagai literal', () => {
    const pelanggar = exportFiles().filter((f) => !HELPERS.includes(f) && !GATES[0].ok(codeOf(f)));
    expect(pelanggar, `literal identitas sendiri: ${pelanggar.join(', ')}`).toEqual([]);
  });

  it('gerbang SC-1 memang menyasar nama KITA, bukan kata "KAP"', () => {
    /* Penjaga terhadap pelemahan di kemudian hari: menyebut KAP pihak ketiga
       (auditor komponen SA 600, pendahulu SA 510, organisasi jasa SA 402)
       harus tetap LOLOS, sementara nama sendiri tidak. */
    expect(GATES[0].ok("auditor: 'KAP Mitra Selaras',")).toBe(true);
    expect(GATES[0].ok("auditor: 'KAP Lim & Tan (SG)',")).toBe(true);
    expect(GATES[0].ok(`firm: '${NAMA_FIRMA}',`)).toBe(false);
  });

  it('SC-1 — dan nol kunci `firm:` DI DALAM payload ekspor', () => {
    /* Pemeriksaan sempit: hanya kunci `firm:` yang berada di dalam kurung objek
       call-site `amsExportPdf({ … })`. tsc sudah menolaknya; ini pagar kedua
       supaya pelanggarannya terbaca sebagai nama berkas, bukan pesan tipe. */
    const dalamPayload = /ams(?:ExportPdf|ExportXlsx)\(\s*\{[^;]{0,400}?\bfirm:/;
    const pelanggar = exportFiles()
      .filter((f) => !HELPERS.includes(f))
      .filter((f) => dalamPayload.test(codeOf(f)));
    expect(pelanggar, `firm: di payload: ${pelanggar.join(', ')}`).toEqual([]);
  });

  it('SC-3 — nol call-site merakit `scopeId:`', () => {
    const pelanggar = exportFiles().filter((f) => !HELPERS.includes(f) && !GATES[1].ok(codeOf(f)));
    expect(pelanggar, `masih merakit scopeId: ${pelanggar.join(', ')}`).toEqual([]);
  });

  it('SC-6 — nol pembaca `window.activeEngagement` / `AMS.activeEngagement`', () => {
    /* Pola E-3: `(window as { activeEngagement?: … }).activeEngagement?.id`.
       Tak ada penulisnya di seluruh sumber sejak window-strip, jadi setiap
       pembacanya SELALU undefined — dan 12 ekspor menyegel tanpa perikatan. */
    const pelanggar = sourceFiles().filter((f) => {
      const code = codeOf(f);
      return /(window|AMS)\s+as\s*\{[^}]*activeEngagement/.test(code)
        || /window\.activeEngagement/.test(code);
    });
    expect(pelanggar, `masih membaca global mati: ${pelanggar.join(', ')}`).toEqual([]);
  });

  it('global itu memang tak pernah ditulis — pembacanya tak akan pernah benar', () => {
    const penulis = sourceFiles().filter((f) => /(window|AMS)\.activeEngagement\s*=/.test(codeOf(f)));
    expect(penulis).toEqual([]);
  });
});

describe('§2 identitas hanya boleh lahir di satu tempat', () => {
  it('hanya helper ekspor yang memanggil resolveExportIdentity', () => {
    const pemanggil = sourceFiles()
      .filter((f) => f !== 'export_identity.ts')
      .filter((f) => /resolveExportIdentity\s*\(/.test(codeOf(f)));
    expect(pemanggil.sort()).toEqual(['export_pdf.ts', 'export_xlsx.ts']);
  });

  it('helper menyegel dengan identitas terselesaikan, bukan dari model', () => {
    ['export_pdf.ts', 'export_xlsx.ts'].forEach((f) => {
      const code = codeOf(f);
      expect(code, f).toMatch(/scope:\s*identity\.scope,\s*scopeId:\s*identity\.scopeId/);
      /* model.scopeId / model.firm tak boleh disentuh lagi di mana pun */
      expect(code, f).not.toMatch(/model\.scopeId/);
      expect(code, f).not.toMatch(/model\.firm/);
    });
  });

  it('identitas diselesaikan SEBELUM berkas dibuat', () => {
    /* Menolak setelah `doc.save()` berarti berkasnya sudah di tangan auditor. */
    ['export_pdf.ts', 'export_xlsx.ts'].forEach((f) => {
      const code = codeOf(f);
      const resolve = code.indexOf('resolveExportIdentity(');
      const load = code.search(/await load(Libs|Xlsx)\(\)/);
      expect(resolve, f).toBeGreaterThan(-1);
      expect(load, f).toBeGreaterThan(-1);
      expect(resolve, `${f}: identitas harus lebih dulu`).toBeLessThan(load);
    });
  });

  it('penolakan disiarkan, tidak hanya dikembalikan', () => {
    ['export_pdf.ts', 'export_xlsx.ts'].forEach((f) => {
      expect(codeOf(f), f).toMatch(/emitExportRefusal\(/);
    });
    /* dan ada yang merendernya — menolak tanpa memberi tahu adalah kegagalan
       senyap yang lain, bukan perbaikan. */
    expect(codeOf('contexts.tsx')).toMatch(/ams:export-refused/);
    expect(codeOf('contexts.tsx')).toMatch(/<ExportRefusalToaster \/>/);
  });
});

/* ---------------------------------------------------------------
   §4 · ANTI-TAUTOLOGI
   --------------------------------------------------------------- */
describe('§4 tiap gerbang terbukti bisa MERAH', () => {
  const MUTATIONS: ReadonlyArray<{ name: string; apply: (c: string) => string; breaks: string }> = [
    {
      name: 'identitas firma didorong lagi dari call-site',
      apply: (c) => c.replace(/kind: '/, `firm: '${NAMA_FIRMA}', kind: '`),
      breaks: 'tak menulis identitas firma ke payload ekspor',
    },
    {
      name: 'scopeId dirakit lagi di call-site',
      apply: (c) => c.replace(/kind: '/, "scopeId: engId, kind: '"),
      breaks: 'tak merakit scopeId untuk payload ekspor',
    },
    {
      name: 'literal perikatan dikembalikan',
      apply: (c) => c.replace(/kind: '/, "x: 'ENG-2025-014', kind: '"),
      breaks: 'tak memuat literal perikatan',
    },
  ];

  const contoh = 'view_sa230.tsx';

  MUTATIONS.forEach((m) => {
    it(`${contoh} — ${m.name} ⇒ gerbang "${m.breaks}" gagal`, () => {
      const code = codeOf(contoh);
      const mutated = m.apply(code);
      expect(mutated, 'mutasi harus benar-benar mengubah sumber').not.toBe(code);
      const gate = GATES.find((g) => g.name === m.breaks);
      expect(gate, 'nama gerbang harus cocok').toBeTruthy();
      expect(gate && gate.ok(code), 'sumber asli harus HIJAU').toBe(true);
      expect(gate && gate.ok(mutated), 'sumber termutasi harus MERAH').toBe(false);
    });
  });

  it('gerbang SC-6 bisa merah — pembaca global mati disisipkan lagi', () => {
    const rusak = 'const x = (window as { activeEngagement?: { id?: string } }).activeEngagement?.id;';
    const hidup = /(window|AMS)\s+as\s*\{[^}]*activeEngagement/.test(rusak);
    expect(hidup).toBe(true);
    expect(/(window|AMS)\s+as\s*\{[^}]*activeEngagement/.test(codeOf(contoh))).toBe(false);
  });
});
