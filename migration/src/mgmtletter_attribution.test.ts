/* ============================================================
   Surat Manajemen (mgmtletter · view_final3.tsx) — gerbang atas empat cacat.

     ML-1  Atribusi KARANGAN pada jalur tulis. Tiga situs tulis-hidup (244, 521,
           526) menstempel 'Linda Wijaya' — nama kolega nyata di roster firma —
           pada setiap catatan diskusi dan setiap keputusan atas temuan, siapa
           pun yang menekan tombolnya.
     ML-2  Kebocoran isolasi perikatan (W7.5). `mgmtletter.findings.v2` /
           `.discussions.v2` tak terdaftar di `AMS_PERSIST_SCOPE` dan tak cocok
           `PR4_ENGAGEMENT_KEY_RE` → jatuh ke lingkup FIRMA. Temuan surat
           manajemen satu klien terlihat pada SELURUH perikatan, sementara
           kop suratnya mencetak nama klien AKTIF.
     ML-3  Klok dari jam mesin (`new Date()`), bukan SSOT. SUDAH DITUTUP di
           `origin/master` (`clock_ssot.ts` · `amsDateIso()`) sebelum arc ini —
           bagian ML-3 di bawah karena itu PENJAGA REGRESI, bukan gerbang merah.
           Ia tetap ada karena perekam baru menerima tanggal sebagai ARGUMEN, dan
           argumen itulah yang harus tetap berasal dari klok SSOT.
     ML-4  Nama firma pada BADAN SURAT ditulis harfiah, padahal berkas yang sama
           sudah mengambilnya dari `AMS.FIRM` pada payload ekspor.

   Dua lapis, sengaja:
     · lapis PERILAKU atas `mgmtletter_record.ts` (modul murni) — dua auditor
       berbeda WAJIB menghasilkan dua nama berbeda; stempel WAJIB mengikuti
       tanggal yang disalurkan, bukan jam mesin;
     · lapis SUMBER atas `view_final3.tsx` & `contexts.tsx` — membuktikan modul
       benar-benar MENYAMBUNG ke mesin itu. Tier uji ini berjalan di environment
       `node` tanpa jsdom (vitest.config: environment 'node'), jadi kabel tak
       dapat dibuktikan lewat render; ia dibuktikan lewat sumbernya.
   ============================================================ */
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AMS } from './data';
import { persistCacheKey, FIRM_SCOPE_ID, DEFAULT_ENG_ID } from './persist_scope';
import { amsDateIso } from './clock_ssot';
import {
  mlActor, mlActorLabel, mlDiscussionNote, mlDecisionFields, mlDecisionStamp,
  mlWriteAllowed, mlWriteBlockReason,
} from './mgmtletter_record';

const VIEW = join(__dirname, 'view_final3.tsx');
const CTX = join(__dirname, 'contexts.tsx');

/* Komentar dibuang lebih dulu: berkas ini mengutip pola lama sebagai catatan
   sejarah, dan gerbang yang memindai komentar akan menuduh catatan itu sendiri. */
const tanpaKomentar = (s: string): string =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const viewSrc = (): string => tanpaKomentar(readFileSync(VIEW, 'utf8'));

/** Irisan SEED ilustratif (sebelum komponen pertama) — sengaja TIDAK disentuh. */
const irisanSeed = (): string => {
  const k = viewSrc();
  const end = k.indexOf('function MLFinding(');
  if (end < 0) throw new Error('batas seed↔kode-hidup tak dapat ditentukan');
  return k.slice(0, end);
};

/** Irisan KODE HIDUP (komponen + ManagementLetter) — jalur tulis ada di sini. */
const irisanHidup = (): string => {
  const k = viewSrc();
  const start = k.indexOf('function MLFinding(');
  if (start < 0) throw new Error('batas seed↔kode-hidup tak dapat ditentukan');
  return k.slice(start);
};

/* ------------------------------------------------------------------
   ML-1a · PERILAKU — dua auditor, dua nama.
   ------------------------------------------------------------------ */
describe('ML-1a · jejak menyebut SIAPA yang menekan tombolnya', () => {
  const A = { id: 'U-A', name: 'Anindya Pramesti', role: 'Audit Manager' };
  const B = { id: 'U-B', name: 'Bayu Saputra', role: 'Senior Auditor' };
  const HARI = '2026-03-09';

  it('premis — kedua sesi uji memang orang yang berbeda', () => {
    expect(A.name).not.toBe(B.name);
  });

  it('catatan diskusi: auditor A dan auditor B menghasilkan nama yang BERBEDA', () => {
    const a = mlDiscussionNote({ actor: mlActor(A)!, speaker: 'auditor', note: 'x', today: HARI });
    const b = mlDiscussionNote({ actor: mlActor(B)!, speaker: 'auditor', note: 'x', today: HARI });
    expect(a.who).toBe('Anindya Pramesti');
    expect(b.who).toBe('Bayu Saputra');
    expect(a.who).not.toBe(b.who);
    /* Peran pun dari sesi — bukan literal 'Manager Audit' untuk semua orang. */
    expect(a.org).toBe('Audit Manager');
    expect(b.org).toBe('Senior Auditor');
    expect(a.org).not.toBe(b.org);
  });

  it('keputusan atas temuan: `decisionBy` mengikuti sesi, bukan satu nama tetap', () => {
    const a = mlDecisionFields({ actor: mlActor(A)!, stage: 'final', note: 'n', today: HARI });
    const b = mlDecisionFields({ actor: mlActor(B)!, stage: 'final', note: 'n', today: HARI });
    expect(a.decisionBy).toBe('Anindya Pramesti (Audit Manager)');
    expect(b.decisionBy).toBe('Bayu Saputra (Senior Auditor)');
    expect(a.decisionBy).not.toBe(b.decisionBy);
  });

  it('stempel keputusan pada utas diskusi ikut sesi', () => {
    const a = mlDecisionStamp({ actor: mlActor(A)!, stage: 'final', note: 'n', today: HARI });
    const b = mlDecisionStamp({ actor: mlActor(B)!, stage: 'tuntas', note: 'n', today: HARI });
    expect(a.who).toBe('Anindya Pramesti');
    expect(b.who).toBe('Bayu Saputra');
    expect(a.note).toContain('KEPUTUSAN: Masuk Final ML.');
    expect(b.note).toContain('KEPUTUSAN: Tuntas — dikeluarkan dari surat akhir.');
  });

  it('tanpa sesi TIDAK ADA pelaku — dan tak ada nama cadangan yang dikarang', () => {
    expect(mlActor(null)).toBeNull();
    expect(mlActor(undefined)).toBeNull();
    expect(mlActor({})).toBeNull();
    expect(mlActor({ name: '   ' })).toBeNull();
    expect(mlWriteAllowed(null)).toBe(false);
    expect(mlWriteBlockReason(null)).not.toBe('');
    expect(mlWriteAllowed(mlActor(A))).toBe(true);
    expect(mlWriteBlockReason(mlActor(A))).toBe('');
  });

  it('sesi tanpa peran → label jatuh ke NAMA saja, bukan peran tebakan', () => {
    const tanpaPeran = mlActor({ id: 'U-C', name: 'Citra Halim' })!;
    expect(tanpaPeran.role).toBe('');
    expect(mlActorLabel(tanpaPeran)).toBe('Citra Halim');
    expect(mlDiscussionNote({ actor: tanpaPeran, speaker: 'auditor', note: 'x', today: HARI }).org).toBe('Auditor');
  });

  it('catatan bersuara KLIEN memakai label peran, bukan nama auditor yang menulisnya', () => {
    const k = mlDiscussionNote({ actor: mlActor(A)!, speaker: 'client', note: 'x', today: HARI });
    expect(k.who).toBe('Wakil Klien');
    expect(k.org).toBe('Klien');
    expect(k.who).not.toBe(A.name);
  });

  it('tahap diskusi MENCABUT keputusan beserta pelakunya', () => {
    const r = mlDecisionFields({ actor: mlActor(A)!, stage: 'diskusi', note: 'n', today: HARI });
    expect(r).toEqual({ decisionDate: '', decisionBy: '', decisionNote: '' });
  });
});

/* ------------------------------------------------------------------
   ML-1b · SUMBER — view menyambung ke mesin itu, dan berhenti mengarang.
   ------------------------------------------------------------------ */
describe('ML-1b · view_final3.tsx tak lagi mengarang identitas pada jalur tulis', () => {
  it('nol nama karangan di KODE HIDUP', () => {
    const hidup = irisanHidup();
    const sisa = ['Linda Wijaya', 'Manager Audit'].filter((v) => hidup.includes(v));
    expect(sisa, 'identitas karangan tersisa di kode hidup: ' + sisa.join(' | ')).toEqual([]);
  });

  it('nol nama karangan LAIN — identitas hanya dari sesi', () => {
    const hidup = irisanHidup();
    /* Setiap `who`/`decisionBy` yang diisi literal berkutip adalah karangan,
       apa pun namanya. Satu-satunya label peran yang sah = 'Wakil Klien'. */
    const literal = [...hidup.matchAll(/\b(?:who|decisionBy)\s*:\s*'([^']*)'/g)].map((m) => m[1]);
    const karangan = literal.filter((v) => v !== '' && v !== 'Wakil Klien');
    expect(karangan, 'literal identitas pada jalur tulis: ' + karangan.join(' | ')).toEqual([]);
  });

  it('pelaku diturunkan mlActor() dari sesi auth, bukan useCurrentAuditor/AMS.USER', () => {
    const hidup = irisanHidup();
    expect(hidup).toMatch(/mlActor\s*\(/);
    expect(hidup).toMatch(/useAuth\s*\(\s*\)/);
    expect(hidup).not.toMatch(/useCurrentAuditor/);
    expect(hidup).not.toMatch(/AMS\.USER/);
  });

  it('ketiga situs tulis memakai perekam murni, bukan objek yang dirakit di view', () => {
    const hidup = irisanHidup();
    ['mlDiscussionNote', 'mlDecisionFields', 'mlDecisionStamp']
      .forEach((f) => expect(hidup, f + ' tak dipakai').toContain(f + '('));
  });

  it('kedua jalur tulis DIJAGA sebelum menulis (tanpa sesi → tak menulis)', () => {
    const hidup = irisanHidup();
    const pakai = [...hidup.matchAll(/mlWriteAllowed\s*\(/g)].length;
    expect(pakai, 'mlWriteAllowed dipakai ' + pakai + 'x, minimal 2 (catatan diskusi + keputusan)').toBeGreaterThanOrEqual(2);
    expect(hidup).toMatch(/mlWriteBlockReason\s*\(/);
  });

  it('BATAS — sepuluh situs seed TIDAK tersentuh', () => {
    const seed = irisanSeed();
    const n = [...seed.matchAll(/Linda Wijaya/g)].length;
    expect(n, 'seed ilustratif berubah: ' + n + ' kemunculan, seharusnya 10').toBe(10);
  });
});

/* ------------------------------------------------------------------
   ML-2 · isolasi perikatan.
   ------------------------------------------------------------------ */
const KEYS = ['mgmtletter.findings.v2', 'mgmtletter.discussions.v2'];
const ENG_A = 'ENG-2025-014';   // perikatan bawaan seed
const ENG_B = 'ENG-2025-040';   // perikatan KEDUA — cacat isolasi tak terlihat tanpa ini

describe('ML-2 · temuan satu perikatan tak terlihat pada perikatan lain', () => {
  beforeEach(() => localStorage.clear());

  it('premis — kedua perikatan uji nyata di roster, dan berbeda', () => {
    const ids = (AMS as unknown as { ENGAGEMENTS: { id: string }[] }).ENGAGEMENTS.map((e) => e.id);
    expect(ids).toContain(ENG_A);
    expect(ids).toContain(ENG_B);
    expect(ENG_A).not.toBe(ENG_B);
    expect(ENG_A).toBe(DEFAULT_ENG_ID);
  });

  it('kedua kunci mgmtletter terdaftar BERLINGKUP PERIKATAN di AMS_PERSIST_SCOPE', () => {
    const ctx = tanpaKomentar(readFileSync(CTX, 'utf8'));
    const blok = /const AMS_PERSIST_SCOPE\s*=\s*\{([\s\S]*?)\n\};/.exec(ctx);
    expect(blok, 'AMS_PERSIST_SCOPE tak ditemukan').not.toBe(null);
    const isi = blok ? blok[1] : '';
    KEYS.forEach((k) => {
      const baris = isi.split('\n').filter((l) => l.includes("'" + k + "'"));
      expect(baris.length, k + ' tak terdaftar di AMS_PERSIST_SCOPE').toBe(1);
      expect(baris[0], k + ' terdaftar tetapi bukan engagement').toContain("'engagement'");
    });
  });

  it('alamat simpan BERBEDA per perikatan — bukan satu dokumen milik firma', () => {
    KEYS.forEach((k) => {
      const a = persistCacheKey('engagement', ENG_A, k);
      const b = persistCacheKey('engagement', ENG_B, k);
      expect(a).not.toBe(b);
      expect(a).not.toBe(persistCacheKey('firm', FIRM_SCOPE_ID, k));
    });
  });

  it('temuan yang dicatat pada perikatan A TIDAK terbaca pada perikatan B', () => {
    const temuanA = [{ id: 'ML-99', title: 'Rahasia klien A', stage: 'final' }];
    KEYS.forEach((k) => localStorage.setItem(persistCacheKey('engagement', ENG_A, k), JSON.stringify(temuanA)));
    KEYS.forEach((k) => {
      expect(localStorage.getItem(persistCacheKey('engagement', ENG_B, k))).toBeNull();
      /* …dan tak menyelinap lewat lingkup firma, tempat cacat lama menyimpannya. */
      expect(localStorage.getItem(persistCacheKey('firm', FIRM_SCOPE_ID, k))).toBeNull();
    });
  });

  it('view TIDAK menyandikan id perikatan ke dalam string kunci (isolasi dari scopeId)', () => {
    const hidup = irisanHidup();
    KEYS.forEach((k) => expect(hidup, k + ' bukan kunci statis').toContain("'" + k + "'"));
    expect(hidup).not.toMatch(/'mgmtletter\.[a-z]+\.' \+/);
  });
});

/* ------------------------------------------------------------------
   ML-3 · klok SSOT.
   ------------------------------------------------------------------ */
describe('ML-3 · stempel tanggal dari AMS.TODAY, bukan jam mesin', () => {
  it('premis — klok SSOT berisi tanggal ISO', () => {
    expect(AMS.TODAY).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(amsDateIso()).toBe(AMS.TODAY);
  });

  it('menggeser tanggal yang disalurkan MENGGESER seluruh stempel', () => {
    const A = mlActor({ id: 'U-A', name: 'Anindya Pramesti', role: 'Audit Manager' })!;
    const h1 = '2026-03-09';
    const h2 = '2026-07-01';
    expect(mlDiscussionNote({ actor: A, speaker: 'auditor', note: 'x', today: h1 }).d).toBe(h1);
    expect(mlDiscussionNote({ actor: A, speaker: 'auditor', note: 'x', today: h2 }).d).toBe(h2);
    expect(mlDecisionFields({ actor: A, stage: 'final', note: 'n', today: h2 }).decisionDate).toBe(h2);
    expect(mlDecisionStamp({ actor: A, stage: 'final', note: 'n', today: h2 }).d).toBe(h2);
  });

  it('nol `new Date()` tanpa argumen di view_final3.tsx', () => {
    const k = viewSrc();
    const n = [...k.matchAll(/new Date\(\s*\)/g)].length;
    expect(n, 'masih ada ' + n + ' jam mesin').toBe(0);
  });

  it('klok modul diambil dari klok SSOT bersama, bukan anchor kedua', () => {
    const k = viewSrc();
    expect(k).toMatch(/amsDateIso\s*\(/);
    expect(k).toMatch(/from '\.\/clock_ssot'/);
  });

  it('ketiga situs tulis menyalurkan klok itu, bukan tanggal yang dirakit sendiri', () => {
    const hidup = irisanHidup();
    const salur = [...hidup.matchAll(/today:\s*today\(\)/g)].length;
    expect(salur, 'penyaluran `today: today()` ' + salur + 'x, seharusnya 3').toBe(3);
  });
});

/* ------------------------------------------------------------------
   ML-4 · identitas firma pada badan surat.
   ------------------------------------------------------------------ */
describe('ML-4 · nama firma pada surat berasal dari identitas firma', () => {
  const firm = (AMS.FIRM || {}) as { name?: string; short?: string; license?: string };

  it('premis — SSOT identitas firma memang berisi', () => {
    expect(firm.name).toBeTruthy();
  });

  it('tak satu pun varian nama firma ditulis harfiah di view_final3.tsx', () => {
    const k = viewSrc();
    const varian = [firm.name, firm.license, 'KAP Wijaya', 'Wijaya Hartono']
      .filter((v): v is string => !!v);
    const ditemukan = varian.filter((v) => k.includes(v));
    expect(ditemukan, 'literal identitas firma: ' + ditemukan.join(' | ')).toEqual([]);
  });

  it('kop surat mengambil nama dari AMS.FIRM', () => {
    expect(irisanHidup()).toMatch(/AMS\.FIRM\.name/);
  });

  it('warna kop surat memakai token, bukan hex harfiah pada barisnya', () => {
    const hidup = irisanHidup();
    const baris = hidup.split('\n').filter((l) => l.includes('AMS.FIRM.name'));
    expect(baris.length).toBeGreaterThan(0);
    const berhex = baris.filter((l) => /color:\s*'#[0-9a-fA-F]{3,8}'/.test(l));
    expect(berhex, 'hex harfiah pada baris kop surat: ' + berhex.join(' | ')).toEqual([]);
  });
});
