/* ============================================================
   Isolasi W7.5 pada JALUR TULIS lampiran — SA 580 & SA 720.

   Cacat: `firm?.activeEngagement?.id || 'ENG-2025-014'` dipakai sebagai
   `scopeId` unggahan lampiran. Tanpa perikatan aktif, surat representasi
   manajemen (SA 580) dan dokumen informasi lain (SA 720) diarsipkan ke
   berkas audit klien LAIN — dengan byte, SHA-256, kelas retensi, dan jejak
   audit yang menyatakannya sah. RBAC server tidak menangkapnya: perikatan
   fallback itu sah dan boleh diakses pengguna.

   Tiga lapis, karena satu saja tidak cukup:

   §1 PERILAKU — `uploadEngagementAttachment` menolak menulis tanpa
      perikatan aktif, dan terbukti TIDAK memanggil bus unggah sama sekali.
      Ini yang membuat kata "menolak" berarti sesuatu.

   §2 SUMBER — kedua view benar-benar lewat pintu itu dan tak lagi memuat
      literal perikatan apa pun. Gerbang teks diperlukan karena cacatnya ada
      di CALL-SITE (presedens `cockpit_report.test.ts` §C-2).

   §3 ANTI-TAUTOLOGI — gerbang §2 dibuktikan bisa MERAH: sumber asli
      dimutasi kembali ke bentuk cacatnya, lalu tiap predikat dituntut gagal.
      Tanpa §3, badge hijau §2 tak membuktikan apa pun.
   ============================================================ */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  NO_ENGAGEMENT_ATTACH_MSG,
  canAttachToEngagement,
  engagementScopeId,
  uploadEngagementAttachment,
} from './attachment_scope';

/* ---------------------------------------------------------------
   §1 · PERILAKU
   --------------------------------------------------------------- */
type UploadArgs = Parameters<Window['amsAttachmentUpload']>[0];

const serverMeta = (scopeId: string): AttachmentMeta => ({
  id: 'ATT-1', scope: 'engagement', scopeId, collection: 'sa580', refId: 'rep-letter',
  name: 'surat.pdf', mime: 'application/pdf', size: 2_097_152,
  sha256: 'sha-dari-server', retentionClass: 'SA230/10y', uploadedBy: 'USER-1',
  createdAt: '2026-08-20T00:00:00.000Z',
});

let calls: UploadArgs[] = [];
let saved: Window['amsAttachmentUpload'];

const install = (fn: Window['amsAttachmentUpload']) => { window.amsAttachmentUpload = fn; };

beforeEach(() => {
  calls = [];
  saved = window.amsAttachmentUpload;
  install(async (o: UploadArgs) => { calls.push(o); return serverMeta(o.scopeId); });
});
afterEach(() => { window.amsAttachmentUpload = saved; });

const letter = (): Parameters<typeof uploadEngagementAttachment>[1] => ({
  collection: 'sa580', refId: 'rep-letter', name: 'surat.pdf',
  sha256: 'sha-lokal', sizeMB: 2, retentionClass: 'SA230/10y',
  file: new File(['isi'], 'surat.pdf', { type: 'application/pdf' }),
});

describe('§1 tanpa perikatan aktif, tulisan DITOLAK — bukan dialihkan', () => {
  it.each([
    ['undefined', undefined],
    ['null', null],
    ['string kosong', ''],
    ['spasi saja', '   '],
  ])('%s ⇒ ok:false dengan alasan jujur', async (_label, engId) => {
    const r = await uploadEngagementAttachment(engId, letter());
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.reason).toBe(NO_ENGAGEMENT_ATTACH_MSG);
  });

  it('bus unggah TIDAK pernah dipanggil — tak ada byte yang mendarat di mana pun', async () => {
    await uploadEngagementAttachment(undefined, letter());
    await uploadEngagementAttachment('', letter());
    expect(calls).toEqual([]);
  });

  it('penolakan tetap berlaku saat server ABSEN (tak jatuh ke metadata-only)', async () => {
    Reflect.deleteProperty(window, 'amsAttachmentUpload');
    const r = await uploadEngagementAttachment(null, letter());
    expect(r.ok).toBe(false);
  });

  it('alasan menyebut perikatan, bukan galat teknis', () => {
    expect(NO_ENGAGEMENT_ATTACH_MSG).toMatch(/perikatan/i);
    expect(NO_ENGAGEMENT_ATTACH_MSG).not.toMatch(/ENG-\d{4}-\d{3}/);
  });
});

describe('§1 dengan perikatan aktif, scopeId adalah perikatan ITU', () => {
  it('meneruskan id apa adanya — tak ada default yang menyelinap', async () => {
    const r = await uploadEngagementAttachment('ENG-2025-063', letter());
    expect(calls).toHaveLength(1);
    expect(calls[0].scope).toBe('engagement');
    expect(calls[0].scopeId).toBe('ENG-2025-063');
    expect(calls[0].retentionClass).toBe('SA230/10y');
    expect(r.ok).toBe(true);
    expect(r.ok === true && r.ref.attachmentId).toBe('ATT-1');
    expect(r.ok === true && r.ref.attachmentSha).toBe('sha-dari-server');
    expect(r.ok === true && r.ref.attachmentSizeMB).toBe(2);
  });

  it('perikatan berbeda ⇒ scopeId berbeda (bukan konstanta)', async () => {
    await uploadEngagementAttachment('ENG-2025-014', letter());
    await uploadEngagementAttachment('ENG-2025-047', letter());
    expect(calls.map((c) => c.scopeId)).toEqual(['ENG-2025-014', 'ENG-2025-047']);
  });

  it('server menolak ⇒ metadata-only, perilaku F0.1 dipertahankan', async () => {
    install(async () => { throw new Error('server absen'); });
    const r = await uploadEngagementAttachment('ENG-2025-014', letter());
    expect(r.ok).toBe(true);
    expect(r.ok === true && r.ref).toEqual({
      attachmentId: '', attachmentName: 'surat.pdf', attachmentSha: 'sha-lokal', attachmentSizeMB: 2,
    });
  });

  it('helper lingkup konsisten dengan penolakan', () => {
    expect(engagementScopeId('  ENG-2025-014  ')).toBe('ENG-2025-014');
    expect(engagementScopeId(undefined)).toBe('');
    expect(canAttachToEngagement('ENG-2025-014')).toBe(true);
    expect(canAttachToEngagement('')).toBe(false);
  });
});

/* ---------------------------------------------------------------
   §2 · GERBANG SUMBER

   Komentar DIBUANG sebelum diperiksa: prosa kedua view justru
   MENJELASKAN pola cacat yang dicabut, dan menekan gerbang dengan cara
   menghapus penjelasan sejarahnya adalah kemunduran, bukan perbaikan.
   --------------------------------------------------------------- */
const WRITE_VIEWS = ['view_sa580.tsx', 'view_sa720.tsx'];

const stripComments = (src: string) => src
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

const codeOf = (file: string) => stripComments(readFileSync(join(__dirname, file), 'utf8'));

/** Predikat gerbang = fungsi murni atas teks, agar §3 dapat menjalankannya
 *  atas sumber yang SENGAJA dirusak. */
const GATES: ReadonlyArray<{ name: string; ok: (code: string) => boolean }> = [
  {
    name: 'tak ada literal perikatan di kode',
    ok: (code) => !/ENG-\d{4}-\d{3}/.test(code),
  },
  {
    name: 'tak memanggil bus unggah langsung (wajib lewat satu pintu)',
    ok: (code) => !/window\.amsAttachmentUpload\s*\(/.test(code),
  },
  {
    name: 'memakai uploadEngagementAttachment',
    ok: (code) => /uploadEngagementAttachment\s*\(/.test(code),
  },
  {
    name: 'membatalkan seluruh perubahan saat ditolak',
    ok: (code) => /if\s*\(!\s*\w+\.ok\)\s*\{[^}]*return;/.test(code),
  },
  {
    name: 'tak merakit scopeId sendiri',
    ok: (code) => !/scopeId\s*:/.test(code),
  },
];

describe('§2 jalur tulis lampiran lewat satu pintu, tanpa literal perikatan', () => {
  WRITE_VIEWS.forEach((file) => {
    GATES.forEach((g) => {
      it(`${file} — ${g.name}`, () => {
        expect(g.ok(codeOf(file)), `${file}: ${g.name}`).toBe(true);
      });
    });
  });

  it('fallback literal perikatan lenyap dari kedua view', () => {
    WRITE_VIEWS.forEach((file) => {
      expect(codeOf(file), file).not.toMatch(/activeEngagement\?\.id\s*\|\|\s*'ENG-/);
    });
  });

  it('pesan penolakan benar-benar sampai ke layar', () => {
    WRITE_VIEWS.forEach((file) => {
      expect(codeOf(file), file).toMatch(/NO_ENGAGEMENT_ATTACH_MSG/);
    });
  });
});

/* ---------------------------------------------------------------
   §3 · ANTI-TAUTOLOGI
   --------------------------------------------------------------- */
describe('§3 gerbang §2 terbukti bisa MERAH', () => {
  /** Mutasi yang mengembalikan cacat aslinya, satu per satu. */
  const MUTATIONS: ReadonlyArray<{ name: string; apply: (code: string) => string; breaks: string }> = [
    {
      name: 'fallback literal dikembalikan',
      apply: (code) => code.replace(
        /activeEngagement\?\.id \|\| ''/,
        "activeEngagement?.id || 'ENG-2025-014'",
      ),
      breaks: 'tak ada literal perikatan di kode',
    },
    {
      name: 'kembali memanggil bus unggah langsung',
      apply: (code) => code.replace(
        /uploadEngagementAttachment\(/,
        'window.amsAttachmentUpload({}); uploadEngagementAttachment(',
      ),
      breaks: 'tak memanggil bus unggah langsung (wajib lewat satu pintu)',
    },
    {
      name: 'satu pintu dicabut',
      apply: (code) => code.replace(/uploadEngagementAttachment/g, 'legacyUpload'),
      breaks: 'memakai uploadEngagementAttachment',
    },
    {
      name: 'penolakan diabaikan (lanjut menulis)',
      apply: (code) => code.replace(/if \(!\w+\.ok\) \{[^}]*return;[^}]*\}/g, ''),
      breaks: 'membatalkan seluruh perubahan saat ditolak',
    },
    {
      name: 'scopeId dirakit ulang di view',
      apply: (code) => code.replace(
        /uploadEngagementAttachment\(/,
        'uploadEngagementAttachment({ scopeId: engId }, ',
      ),
      breaks: 'tak merakit scopeId sendiri',
    },
  ];

  WRITE_VIEWS.forEach((file) => {
    MUTATIONS.forEach((m) => {
      it(`${file} — ${m.name} ⇒ gerbang "${m.breaks}" gagal`, () => {
        const code = codeOf(file);
        const mutated = m.apply(code);
        expect(mutated, 'mutasi harus benar-benar mengubah sumber').not.toBe(code);
        const gate = GATES.find((g) => g.name === m.breaks);
        expect(gate, 'nama gerbang harus cocok').toBeTruthy();
        expect(gate && gate.ok(code), 'sumber asli harus HIJAU').toBe(true);
        expect(gate && gate.ok(mutated), 'sumber termutasi harus MERAH').toBe(false);
      });
    });
  });
});
