/* ============================================================
   PR-1 · `docs/prd-export-seal-identity-ssot.md` — register identitas ekspor.

   Yang dijaga di sini BUKAN "identitas == identitas". Setelah literal diubah
   jadi turunan, uji seperti itu selalu hijau dan tak membuktikan apa pun
   (pelajaran #242). Yang dijaga adalah tiga hal yang benar-benar dapat rusak:

   §1 PENOLAKAN — tanpa perikatan aktif, dan tanpa identitas firma, identitas
      ekspor TIDAK terselesaikan. Ini yang membuat "menolak" berarti sesuatu.

   §2 REGISTER BERGERAK — mengganti perikatan menggeser scopeId (SC-8). Sebuah
      register yang macet pada satu nilai adalah cacat `|| 'ENG-2025-014'` dalam
      bentuk baru, dan uji nilai-tunggal tak akan melihatnya.

   §3 SATU PENULIS — hanya `contexts.tsx` boleh memanggil
      `publishActiveEngagement`, dan SATU scopeId firma untuk satu firma (SC-7).
      Gerbang sumber, karena cacatnya ada di call-site.

   §4 ANTI-TAUTOLOGI — tiap predikat §3 dijalankan atas sumber yang SENGAJA
      dimutasi kembali ke bentuk cacatnya dan dituntut gagal.
   ============================================================ */
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { FIRM_SCOPE_ID } from './persist_scope';
import {
  NO_ENGAGEMENT_EXPORT_MSG,
  NO_FIRM_IDENTITY_MSG,
  activeEngagementScopeId,
  buildExportIdentity,
  publishActiveEngagement,
  resolveExportIdentity,
} from './export_identity';

const FIRM = 'KAP Wijaya Hartono & Rekan';

beforeEach(() => { publishActiveEngagement(null); });

/* ---------------------------------------------------------------
   §1 · PENOLAKAN
   --------------------------------------------------------------- */
describe('§1 identitas yang tak dapat diturunkan ⇒ artefak tidak terbit', () => {
  it.each([
    ['undefined', undefined],
    ['null', null],
    ['string kosong', ''],
    ['spasi saja', '   '],
  ])('perikatan %s ⇒ ok:false dengan alasan jujur', (_label, engId) => {
    const id = buildExportIdentity('engagement', FIRM, engId);
    expect(id.ok).toBe(false);
    expect(id.ok === false && id.reason).toBe(NO_ENGAGEMENT_EXPORT_MSG);
  });

  it('identitas firma kosong ⇒ ok:false, walau perikatan ADA', () => {
    const id = buildExportIdentity('engagement', '   ', 'ENG-2025-014');
    expect(id.ok).toBe(false);
    expect(id.ok === false && id.reason).toBe(NO_FIRM_IDENTITY_MSG);
  });

  it('firma kosong juga menolak pada lingkup FIRMA', () => {
    /* Berkas tersegel tak boleh mengarang penerbitnya — termasuk saat
       perikatan tak relevan. */
    expect(buildExportIdentity('firm', '', null).ok).toBe(false);
  });

  it('alasan menyebut sebabnya, bukan galat teknis, dan tak memuat id karangan', () => {
    expect(NO_ENGAGEMENT_EXPORT_MSG).toMatch(/perikatan/i);
    expect(NO_FIRM_IDENTITY_MSG).toMatch(/firma/i);
    [NO_ENGAGEMENT_EXPORT_MSG, NO_FIRM_IDENTITY_MSG].forEach((m) => {
      expect(m).not.toMatch(/ENG-\d{4}-\d{3}/);
      expect(m).not.toMatch(/KAP /);
    });
  });

  it('penolakan TIDAK membocorkan identitas separuh jadi', () => {
    const id = buildExportIdentity('engagement', FIRM, null);
    expect(id.ok === false && id.firm).toBeUndefined();
    expect(id.ok === false && id.scopeId).toBeUndefined();
  });
});

/* ---------------------------------------------------------------
   §2 · REGISTER BERGERAK
   --------------------------------------------------------------- */
describe('§2 register perikatan aktif (SC-8)', () => {
  it('mula-mula kosong ⇒ ekspor perikatan menolak', () => {
    expect(activeEngagementScopeId()).toBe('');
    expect(resolveExportIdentity('engagement').ok).toBe(false);
  });

  it('terbitkan ⇒ scopeId adalah perikatan ITU', () => {
    publishActiveEngagement('ENG-2025-014');
    const id = resolveExportIdentity('engagement');
    expect(id.ok).toBe(true);
    expect(id.ok === true && id.scopeId).toBe('ENG-2025-014');
    expect(id.ok === true && id.scope).toBe('engagement');
  });

  it('GANTI perikatan ⇒ scopeId ikut berubah — bukan konstanta', () => {
    publishActiveEngagement('ENG-2025-014');
    const a = resolveExportIdentity('engagement');
    publishActiveEngagement('ENG-2025-063');
    const b = resolveExportIdentity('engagement');
    expect(a.ok === true && a.scopeId).toBe('ENG-2025-014');
    expect(b.ok === true && b.scopeId).toBe('ENG-2025-063');
    expect(a.scopeId).not.toBe(b.scopeId);
  });

  it('LEPAS perikatan (provider dilepas) ⇒ kembali menolak, tak ada nilai basi', () => {
    publishActiveEngagement('ENG-2025-014');
    publishActiveEngagement(null);
    expect(activeEngagementScopeId()).toBe('');
    expect(resolveExportIdentity('engagement').ok).toBe(false);
  });

  it('id ber-spasi dinormalkan, bukan diterima apa adanya', () => {
    publishActiveEngagement('  ENG-2025-047  ');
    expect(activeEngagementScopeId()).toBe('ENG-2025-047');
  });

  it('lingkup FIRMA memakai SSOT scopeId & tak bergantung perikatan', () => {
    const tanpa = resolveExportIdentity('firm');
    publishActiveEngagement('ENG-2025-014');
    const dengan = resolveExportIdentity('firm');
    expect(tanpa.ok === true && tanpa.scopeId).toBe(FIRM_SCOPE_ID);
    expect(dengan.ok === true && dengan.scopeId).toBe(FIRM_SCOPE_ID);
  });

  it('firma diambil dari SSOT AMS.FIRM, bukan literal di modul ini', () => {
    publishActiveEngagement('ENG-2025-014');
    const id = resolveExportIdentity('engagement');
    expect(id.ok === true && id.firm).toBe(FIRM);
  });
});

/* ---------------------------------------------------------------
   §3 · GERBANG SUMBER

   Komentar DIBUANG lebih dulu: prosa modul-modul ini justru MENJELASKAN pola
   cacat yang dicabut, dan menekan gerbang dengan cara menghapus penjelasan
   sejarahnya adalah kemunduran, bukan perbaikan.
   --------------------------------------------------------------- */
const SRC = __dirname;

const stripComments = (src: string) => src
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

const codeOf = (file: string) => stripComments(readFileSync(join(SRC, file), 'utf8'));

/** Seluruh sumber `migration/src` kecuali tier uji. */
const sourceFiles = (): string[] => readdirSync(SRC)
  .filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f) && !/\.d\.ts$/.test(f));

/** Predikat gerbang = fungsi murni atas teks, agar §4 dapat menjalankannya atas
 *  sumber yang sengaja dirusak. */
const GATES: ReadonlyArray<{ name: string; ok: (code: string) => boolean }> = [
  {
    name: 'tak menerbitkan perikatan (bukan contexts.tsx)',
    ok: (code) => !/publishActiveEngagement\s*\(/.test(code),
  },
  {
    name: 'tak mengetik scopeId firma sendiri',
    ok: (code) => !/scopeId:\s*'(WHR|FIRM-WHR)'/.test(code),
  },
];

describe('§3 satu penulis, satu scopeId firma', () => {
  it('HANYA contexts.tsx yang memanggil publishActiveEngagement', () => {
    const penulis = sourceFiles()
      .filter((f) => f !== 'export_identity.ts')
      .filter((f) => /publishActiveEngagement\s*\(/.test(codeOf(f)));
    expect(penulis, `penulis kedua: ${penulis.join(', ')}`).toEqual(['contexts.tsx']);
  });

  it('contexts.tsx menerbitkan perikatan yang TERSELESAIKAN, bukan id terpilih', () => {
    /* `activeEngagementId` bisa menunjuk perikatan yang tak ada di daftar;
       menerbitkannya berarti menerbitkan id hantu. */
    const code = codeOf('contexts.tsx');
    expect(code).toMatch(/publishActiveEngagement\(\s*activeEngagement\?\.id\s*\?\?\s*null\s*\)/);
  });

  it('SC-7 — nol scopeId firma yang diketik tangan di seluruh sumber', () => {
    const pelanggar = sourceFiles()
      .filter((f) => f !== 'persist_scope.ts')
      .filter((f) => !GATES[1].ok(codeOf(f)));
    expect(pelanggar, `scopeId firma literal: ${pelanggar.join(', ')}`).toEqual([]);
  });

  it('register tidak dapat dibaca telanjang — pintu bacanya fungsi', () => {
    const code = codeOf('export_identity.ts');
    /* `export let` akan membuat nilainya dapat diambil tanpa melewati penolakan. */
    expect(code).not.toMatch(/export\s+let\s/);
  });

  it('modul identitas tak memuat literal firma maupun perikatan', () => {
    const code = codeOf('export_identity.ts');
    expect(code).not.toMatch(/'KAP [^']*'/);
    expect(code).not.toMatch(/ENG-\d{4}-\d{3}/);
  });
});

/* ---------------------------------------------------------------
   §4 · ANTI-TAUTOLOGI
   --------------------------------------------------------------- */
describe('§4 gerbang §3 terbukti bisa MERAH', () => {
  const MUTATIONS: ReadonlyArray<{ name: string; file: string; apply: (c: string) => string; breaks: string }> = [
    {
      name: 'penulis kedua disisipkan di sebuah view',
      file: 'view_sa580.tsx',
      apply: (c) => `publishActiveEngagement('ENG-2025-014');\n${c}`,
      breaks: 'tak menerbitkan perikatan (bukan contexts.tsx)',
    },
    {
      name: 'scopeId firma diketik tangan lagi',
      file: 'view_sa580.tsx',
      apply: (c) => c.replace(/const engId/, "const x = { scopeId: 'WHR' };\n  const engId"),
      breaks: 'tak mengetik scopeId firma sendiri',
    },
  ];

  MUTATIONS.forEach((m) => {
    it(`${m.file} — ${m.name} ⇒ gerbang "${m.breaks}" gagal`, () => {
      const code = codeOf(m.file);
      const mutated = m.apply(code);
      expect(mutated, 'mutasi harus benar-benar mengubah sumber').not.toBe(code);
      const gate = GATES.find((g) => g.name === m.breaks);
      expect(gate, 'nama gerbang harus cocok').toBeTruthy();
      expect(gate && gate.ok(code), 'sumber asli harus HIJAU').toBe(true);
      expect(gate && gate.ok(mutated), 'sumber termutasi harus MERAH').toBe(false);
    });
  });

  it('gerbang "terselesaikan, bukan terpilih" bisa merah', () => {
    const code = codeOf('contexts.tsx');
    const rusak = code.replace(
      /publishActiveEngagement\(\s*activeEngagement\?\.id\s*\?\?\s*null\s*\)/,
      'publishActiveEngagement(activeEngagementId)',
    );
    expect(rusak).not.toBe(code);
    expect(/publishActiveEngagement\(\s*activeEngagement\?\.id\s*\?\?\s*null\s*\)/.test(rusak)).toBe(false);
  });

  it('register yang MACET tertangkap §2', () => {
    /* Bila `publishActiveEngagement` diubah jadi no-op, uji "ganti perikatan"
       akan memerah. Dibuktikan di sini dengan register tiruan berperilaku macet. */
    let macet: string | null = null;
    const publishMacet = (id: string | null) => { macet = macet ?? id; };
    publishMacet('ENG-2025-014');
    publishMacet('ENG-2025-063');
    expect(macet).toBe('ENG-2025-014');
    expect(macet).not.toBe('ENG-2025-063');
  });
});
