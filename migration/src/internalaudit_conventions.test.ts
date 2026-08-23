/* ============================================================
   Penggunaan Pekerjaan Audit Internal (SA 610) — gerbang atas
   `internalaudit_memo.ts` (mesin) DAN `view_internalaudit.tsx` (sumber).

   Yang dipaku di sini:

     IA1 · Memo TERSEGEL yang membantah scope-nya sendiri. `scopeId` diambil dari
           perikatan AKTIF sementara muka berkasnya mencetak `ENG-2025-014 ·
           FY2025` dan `firm: 'KAP Wijaya Hartono & Rekan'` sebagai literal, dan
           nama klien jatuh ke `'PT Sentosa Makmur Tbk'` bila konteks kosong.
     IA2 · Tombol primer "Simpulkan" tanpa `onClick`, dan tombol "Buka WP" tanpa
           `onClick` — modul menghitung keputusan tetapi tak punya cara merekam
           bahwa keputusan itu diambil, oleh siapa, kapan.
     IA4 · Kertas kerja lahir sudah terisi kesimpulan: skor 4/4/3 dan sub-kriteria
           yang sudah dijawab ok/tidak.
     IA5 · `<tr onClick>` dan `<div onClick>` sebagai kontrol pemilihan.

   Gerbang sumber MEMBACA BERKASNYA. Komentar dibuang lebih dulu: berkas sumber
   mengutip pola lama sebagai catatan sejarah, dan pemindai yang ikut membaca
   komentar akan menuduh catatan itu sendiri.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  IA_FACTOR_TEMPLATE, IA_PROFILE_FIELDS, emptyIaProfile, normalizeIaDoc,
  iaScore, iaVerdict, iaActor, iaConcludeBlockReason,
  iaMemoContext, sa610MemoBlockers, sa610ExportBlockReason,
  sa610MemoMeta, sa610MemoRefNo, sa610MemoFileName, sa610MemoTitle, buildSa610Blocks,
  type IaFirmLike, type Sa610MemoInput,
} from './internalaudit_memo';

const kode = (path: string): string => readFileSync(join(__dirname, path), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^[ \t]*\/\/.*$/gm, '');

const view = (): string => kode('view_internalaudit.tsx');
const mesin = (): string => kode('internalaudit_memo.ts');

/* Dua perikatan berbeda — sengaja BUKAN perikatan bawaan seed, agar cacat
   "selalu ENG-2025-014" tak lolos karena kebetulan cocok. */
const FIRM_A: IaFirmLike = {
  activeEngagementId: 'ENG-2025-031',
  activeEngagement: { id: 'ENG-2025-031', clientId: 'C-031', fy: 'FY2025', partner: 'Hartono Wijaya, CPA' },
  activeClient: { id: 'C-031', name: 'PT Bumi Hijau Agrindo' },
};
const FIRM_B: IaFirmLike = {
  activeEngagementId: 'ENG-2024-063',
  activeEngagement: { id: 'ENG-2024-063', clientId: 'C-063', fy: 'FY2024', partner: 'Rudi Gunawan, CPA' },
  activeClient: { id: 'C-063', name: 'PT Graha Properti Investama' },
};

const memoInput = (firm: IaFirmLike, firmName: string): Sa610MemoInput => {
  const factors = IA_FACTOR_TEMPLATE().map((f, i) => ({ ...f, v: [4, 4, 3][i] }));
  const score = iaScore(factors);
  return {
    ctx: iaMemoContext(firm, firmName),
    factors, profile: emptyIaProfile(), score, verdict: iaVerdict(score.avg),
    conclusion: null, date: '2026-03-09',
  };
};

/* ==================================================================
   (a) IA1 — identitas muka berkas dan `scopeId` berasal dari SATU sumber.
   ================================================================== */
describe('IA1 · identitas memo tersegel = identitas yang menyegelnya', () => {
  it('mengubah perikatan aktif MENGUBAH scopeId dan seluruh muka berkas bersamaan', () => {
    const a = memoInput(FIRM_A, 'KAP Uji Satu');
    const b = memoInput(FIRM_B, 'KAP Uji Dua');

    /* scopeId segel = ctx.engagementId — satu field, dipakai kedua tempat. */
    expect(a.ctx.engagementId).toBe('ENG-2025-031');
    expect(b.ctx.engagementId).toBe('ENG-2024-063');

    const metaA = sa610MemoMeta(a).join(' | ');
    const metaB = sa610MemoMeta(b).join(' | ');
    expect(metaA).toContain('ENG-2025-031');
    expect(metaA).toContain('PT Bumi Hijau Agrindo');
    expect(metaA).toContain('FY2025');
    expect(metaA).not.toContain('ENG-2024-063');
    expect(metaB).toContain('ENG-2024-063');
    expect(metaB).toContain('FY2024');
    expect(metaB).not.toContain('ENG-2025-031');

    expect(sa610MemoRefNo(a)).toBe('A-610/ENG-2025-031/FY2025');
    expect(sa610MemoRefNo(b)).toBe('A-610/ENG-2024-063/FY2024');
    expect(sa610MemoFileName(a)).toContain('ENG-2025-031');
    expect(sa610MemoTitle(a)).toContain('PT Bumi Hijau Agrindo');
  });

  it('nol identitas yang tidak berasal dari konteks: firma, klien, siklus', () => {
    const a = memoInput(FIRM_A, 'KAP Uji Satu');
    expect(a.ctx.firmName).toBe('KAP Uji Satu');
    expect(a.ctx.clientName).toBe('PT Bumi Hijau Agrindo');
    expect(a.ctx.cycle).toBe('FY2025');
    expect(a.ctx.partner).toBe('Hartono Wijaya, CPA');
    /* konteks kosong tetap kosong — tak ada nama pengganti */
    const nil = iaMemoContext(null, '');
    expect([nil.firmName, nil.clientName, nil.cycle, nil.engagementId, nil.partner]).toEqual(['', '', '', '', '']);
  });

  it('view mengambil scopeId dari konteks memo yang sama, bukan dari ekspresi terpisah', () => {
    const src = view();
    expect(src, 'view tidak memakai iaMemoContext').toMatch(/iaMemoContext\s*\(/);
    expect(src, 'scopeId segel tidak diambil dari konteks memo').toMatch(/scopeId\s*:\s*(memoCtx|ctx)\.engagementId/);
    expect(src, 'nama firma pada muka berkas tidak diambil dari konteks memo').toMatch(/firm\s*:\s*(memoCtx|ctx)\.firmName/);
  });

  it('nama faktor pada tabel memo memakai field yang benar-benar ada', () => {
    /* Sebelum arc ini: `body: factors.map(f => [f.label, …])` — `label` TIDAK
       PERNAH ADA pada faktor (`k` yang ada), sehingga kolom nama faktor terbit
       sebagai sel kosong di dalam berkas TERSEGEL. */
    const blocks = buildSa610Blocks(memoInput(FIRM_A, 'KAP Uji Satu'));
    const tbl = blocks.find((b) => b.type === 'table');
    expect(tbl && tbl.type === 'table' ? tbl.body.map((r) => r[0]) : []).toEqual(
      ['Objektivitas', 'Kompetensi', 'Pendekatan Sistematis & Disiplin'],
    );
    const semua = JSON.stringify(blocks);
    expect(semua).not.toContain('undefined');
    expect(semua).not.toContain('null');
  });
});

/* ==================================================================
   (b) IA1 — konteks tak lengkap TIDAK menghasilkan berkas.
   ================================================================== */
describe('IA1 · konteks perikatan tak lengkap tidak menerbitkan berkas bersegel', () => {
  it('konteks kosong → empat alasan, dan alasan itu dapat dibaca pengguna', () => {
    const b = sa610MemoBlockers(iaMemoContext(null, ''));
    expect(b.length).toBe(4);
    expect(sa610ExportBlockReason(b)).toContain('tidak diterbitkan');
    expect(sa610ExportBlockReason([])).toBe('');
  });

  it('setiap field identitas yang hilang menghentikan ekspor sendirian', () => {
    const penuh = iaMemoContext(FIRM_A, 'KAP Uji Satu');
    expect(sa610MemoBlockers(penuh)).toEqual([]);
    expect(sa610MemoBlockers({ ...penuh, engagementId: '' }).length).toBe(1);
    expect(sa610MemoBlockers({ ...penuh, clientName: '' }).length).toBe(1);
    expect(sa610MemoBlockers({ ...penuh, cycle: '' }).length).toBe(1);
    expect(sa610MemoBlockers({ ...penuh, firmName: '' }).length).toBe(1);
  });

  it('view menghentikan ekspornya sendiri ketika ada penghalang', () => {
    const src = view();
    expect(src, 'view tidak membaca sa610MemoBlockers').toMatch(/sa610MemoBlockers\s*\(/);
    expect(src, 'view tidak menyajikan alasan penghalang kepada pengguna').toMatch(/sa610ExportBlockReason\s*\(/);
    /* amsExportPdf harus berada SESUDAH penjagaan, bukan sebelum. */
    const iBlok = src.indexOf('sa610MemoBlockers');
    const iPdf = src.indexOf('amsExportPdf(');
    expect(iBlok, 'penjagaan tidak ditemukan').toBeGreaterThan(-1);
    expect(iPdf, 'panggilan ekspor tidak ditemukan').toBeGreaterThan(iBlok);
  });
});

/* ==================================================================
   (c) IA1 — gerbang SUMBER: nol identitas literal di view.
   ================================================================== */
describe('IA1 · nol identitas entitas yang tertanam di sumber modul', () => {
  it('nol nomor perikatan literal', () => {
    const hit = [...view().matchAll(/\bENG-\d{4}-\d{3}\b/g)].map((m) => m[0]);
    expect(hit, 'nomor perikatan literal: ' + hit.join(' | ')).toEqual([]);
  });

  it('nol nama klien literal (badan usaha Indonesia)', () => {
    const hit = [...view().matchAll(/\bPT\s+[A-Z][A-Za-z]*(?:\s+[A-Z][A-Za-z]*)*/g)].map((m) => m[0]);
    expect(hit, 'nama klien literal: ' + hit.join(' | ')).toEqual([]);
  });

  it('nol nama KAP literal', () => {
    const hit = [...view().matchAll(/\bKAP\s+[A-Z][^'"`\n]*/g)].map((m) => m[0]);
    expect(hit, 'nama KAP literal: ' + hit.join(' | ')).toEqual([]);
  });

  it('nol siklus/tahun buku literal', () => {
    const hit = [...view().matchAll(/\bFY\s?\d{4}\b/g)].map((m) => m[0]);
    expect(hit, 'siklus literal: ' + hit.join(' | ')).toEqual([]);
  });

  it('nol nama orang yang dikarang sebagai fakta tentang entitas klien', () => {
    /* Kepala SPI ('Wijaya Kusuma, QIA · CIA') dan blok tanda tangan berisi tiga
       nama personel dengan `done: true` — tanda tangan yang tak pernah ada. */
    const nama = ['Wijaya Kusuma', 'Dimas Raharjo', 'Anindya Pramesti', 'Hartono Wijaya'];
    const hit = nama.filter((n) => view().includes(n));
    expect(hit, 'nama dikarang: ' + hit.join(' | ')).toEqual([]);
  });
});

/* ==================================================================
   (d) IA2/IA5 — tidak ada kontrol mati, tidak ada kontrol palsu.
   ================================================================== */
describe('IA2/IA5 · kontrol hidup dan native', () => {
  it('nol <Btn>/<button> tanpa onClick', () => {
    const baris = view().split('\n');
    const mati: string[] = [];
    for (let i = 0; i < baris.length; i++) {
      if (!/<(Btn|button)\b/.test(baris[i])) continue;
      let blok = baris[i];
      let j = i;
      while (!/\/>|>/.test(blok.replace(/=>/g, '')) && j + 1 < baris.length) { j++; blok += ' ' + baris[j]; }
      if (!/onClick=/.test(blok)) mati.push(blok.trim().slice(0, 90));
    }
    expect(mati, 'tombol tanpa onClick: ' + mati.join(' | ')).toEqual([]);
  });

  it('nol kontrol palsu — <tr>/<div>/<span> ber-onClick', () => {
    const hit = [...view().matchAll(/<(tr|div|span)\b[^>]*\sonClick=/g)].map((m) => m[0].slice(0, 70));
    expect(hit, 'kontrol palsu: ' + hit.join(' | ')).toEqual([]);
  });

  it('baris area penggunaan & kartu faktor adalah <button> dengan cincin fokus terlihat', () => {
    const src = readFileSync(join(__dirname, 'view_internalaudit.tsx'), 'utf8');
    expect(src, 'kelas baris pilih tak ditemukan').toMatch(/className="ia-rowbtn"/);
    expect(src, 'tanpa :focus-visible').toMatch(/\.ia-rowbtn:focus-visible/);
    expect(src, 'keadaan terpilih tidak diumumkan ke teknologi bantu').toMatch(/aria-pressed=/);
  });
});

/* ==================================================================
   (e) IA4 — kerangka berisi PERTANYAAN, bukan jawaban.
   ================================================================== */
describe('IA4 · kertas kerja lahir dengan pertanyaan', () => {
  it('kerangka evaluasi tidak memuat satu pun skor', () => {
    expect(IA_FACTOR_TEMPLATE().map((f) => f.v)).toEqual([null, null, null]);
  });

  it('kerangka evaluasi tidak memuat satu pun jawaban ok/tidak', () => {
    const jawab = IA_FACTOR_TEMPLATE().flatMap((f) => f.subs.map((s) => s.ok));
    expect(jawab.length).toBeGreaterThan(0);
    expect(jawab.every((o) => o === null)).toBe(true);
  });

  it('kerangka evaluasi tidak memuat catatan temuan', () => {
    const catatan = IA_FACTOR_TEMPLATE().flatMap((f) => [f.note, ...f.subs.map((s) => s.note || '')]);
    expect(catatan.every((c) => c === '')).toBe(true);
  });

  it('profil fungsi audit internal klien diseed KOSONG', () => {
    const p = emptyIaProfile();
    expect(Object.values(p).every((v) => v === '')).toBe(true);
    expect(IA_PROFILE_FIELDS.length).toBe(Object.keys(p).length);
  });

  it('sumber mesin tidak memuat skor maupun jawaban sebagai literal kerangka', () => {
    const src = mesin();
    const skor = [...src.matchAll(/\bv\s*:\s*[1-5]\b/g)].map((m) => m[0]);
    expect(skor, 'skor tertanam: ' + skor.join(' | ')).toEqual([]);
    const ok = [...src.matchAll(/\bok\s*:\s*(true|false)\b/g)].map((m) => m[0]);
    expect(ok, 'jawaban tertanam: ' + ok.join(' | ')).toEqual([]);
  });

  it('verdict tidak dapat diambil sebelum KETIGA faktor dinilai', () => {
    const f = IA_FACTOR_TEMPLATE();
    expect(iaScore(f)).toEqual({ avg: null, scored: 0, total: 3 });
    expect(iaVerdict(null).decided).toBe(false);
    expect(iaVerdict(null).k).toBe('gray');

    const sebagian = f.map((x, i) => (i < 2 ? { ...x, v: 5 } : x));
    expect(iaScore(sebagian).avg).toBeNull();
    expect(iaScore(sebagian).scored).toBe(2);
  });

  it('ambang verdict TIDAK bergeser dari mesin yang berjalan sebelumnya', () => {
    /* 4·4·3 → 3,667 → hijau; 3·3·3 → amber; 2·2·2 → merah. Persis perilaku lama. */
    const nilai = (a: number, b: number, c: number) =>
      iaScore(IA_FACTOR_TEMPLATE().map((f, i) => ({ ...f, v: [a, b, c][i] })));
    expect(nilai(4, 4, 3).avg).toBeCloseTo(11 / 3, 10);
    expect(iaVerdict(nilai(4, 4, 3).avg).k).toBe('green');
    expect(iaVerdict(nilai(3, 3, 3).avg).k).toBe('amber');
    expect(iaVerdict(nilai(2, 2, 2).avg).k).toBe('red');
    expect(iaVerdict(3.5).k).toBe('green');
    expect(iaVerdict(2.5).k).toBe('amber');
  });
});

/* ==================================================================
   (f) IA4 — dokumen lama tetap terbaca.
   ================================================================== */
describe('IA4 · kompatibilitas dokumen `internalAudit.v1`', () => {
  /* Bentuk PERSIS yang tersimpan sebelum arc ini: larik faktor telanjang. */
  const LAMA = [
    { id: 'obj', k: 'Objektivitas', ref: '¶16(a)', v: 5, note: 'catatan auditor lama',
      subs: [{ t: 'lama-1', ok: true }, { t: 'lama-2', ok: false, note: 'perhatian lama' }] },
    { id: 'comp', k: 'Kompetensi', ref: '¶16(b)', v: 2, note: '', subs: [{ t: 'lama-3', ok: false }] },
    { id: 'sys', k: 'Pendekatan Sistematis & Disiplin', ref: '¶16(c)', v: 3, note: '', subs: [] },
  ];

  it('larik faktor lama terbaca sebagai dokumen, dengan skor & catatan utuh', () => {
    const d = normalizeIaDoc(LAMA);
    expect(d.ver).toBe(2);
    expect(d.factors.map((f) => f.v)).toEqual([5, 2, 3]);
    expect(d.factors[0].note).toBe('catatan auditor lama');
    expect(iaScore(d.factors).avg).toBeCloseTo(10 / 3, 10);
  });

  it('jawaban sub-kriteria lama ikut terbawa; posisi tanpa pasangan tetap belum-dinilai', () => {
    const d = normalizeIaDoc(LAMA);
    expect(d.factors[0].subs[0].ok).toBe(true);
    expect(d.factors[0].subs[1].ok).toBe(false);
    expect(d.factors[0].subs[1].note).toBe('perhatian lama');
    expect(d.factors[0].subs[2].ok).toBeNull();
    expect(d.factors[2].subs.every((s) => s.ok === null)).toBe(true);
  });

  it('teks pertanyaan selalu berasal dari kerangka, bukan dari dokumen lama', () => {
    const d = normalizeIaDoc(LAMA);
    expect(d.factors[0].subs[0].t).toBe(IA_FACTOR_TEMPLATE()[0].subs[0].t);
    expect(d.factors[0].subs[0].t).not.toBe('lama-1');
  });

  it('dokumen kosong / rusak / null jatuh ke kerangka kosong, bukan ke seed berisi jawaban', () => {
    for (const buruk of [null, undefined, 0, 'x', [], {}, { factors: 'bukan larik' }]) {
      const d = normalizeIaDoc(buruk);
      expect(d.factors.map((f) => f.v)).toEqual([null, null, null]);
      expect(Object.values(d.profile).every((v) => v === '')).toBe(true);
      expect(d.conclusion).toBeNull();
    }
  });

  it('dokumen bentuk baru dibaca apa adanya', () => {
    const doc = normalizeIaDoc({
      ver: 2,
      factors: [{ id: 'sys', v: 4, note: 'n', subs: [{ ok: true }] }],
      profile: { unit: 'Unit X', head: 'Nama Y' },
      conclusion: { by: 'Auditor Z', at: '2026-03-09', avg: 4, verdict: 'Dapat Diandalkan' },
    });
    expect(doc.factors[2].v).toBe(4);
    expect(doc.factors[0].v).toBeNull();
    expect(doc.profile.unit).toBe('Unit X');
    expect(doc.profile.reportLine).toBe('');
    expect(doc.conclusion && doc.conclusion.by).toBe('Auditor Z');
  });

  it('kesimpulan tanpa pelaku atau tanpa tanggal BUKAN kesimpulan', () => {
    expect(normalizeIaDoc({ conclusion: { by: 'A', at: '' } }).conclusion).toBeNull();
    expect(normalizeIaDoc({ conclusion: { by: '', at: '2026-03-09' } }).conclusion).toBeNull();
  });
});

/* ==================================================================
   IA2 — kesimpulan merekam pelaku & tanggal, dan pelakunya dari SESI.
   ================================================================== */
describe('IA2 · kesimpulan yang benar-benar direkam', () => {
  it('pelaku hanya dari sesi — tidak ada jaring ke data seed', () => {
    expect(iaActor({ id: 'u1', name: 'Anindya P.' })).toBe('Anindya P.');
    expect(iaActor({ id: 'u1', name: '   ' })).toBeNull();
    expect(iaActor({})).toBeNull();
    expect(iaActor(null)).toBeNull();
  });

  it('tanpa penilaian lengkap atau tanpa sesi, kesimpulan tidak dapat diambil', () => {
    const belum = iaVerdict(null);
    const sudah = iaVerdict(4);
    expect(iaConcludeBlockReason(belum, 'Anindya P.')).toContain('¶16');
    expect(iaConcludeBlockReason(sudah, null)).toContain('Identitas sesi');
    expect(iaConcludeBlockReason(sudah, 'Anindya P.')).toBe('');
  });

  it('view merekam pelaku dari sesi dan tanggal dari klok aplikasi', () => {
    const src = view();
    expect(src, 'view tidak memakai iaActor').toMatch(/iaActor\s*\(/);
    expect(src, 'kesimpulan tidak merekam tanggal dari klok aplikasi').toMatch(/AMS\.TODAY/);
    expect(src, 'view tidak merekam kesimpulan').toMatch(/conclusion/);
  });

  it('memo membawa rekaman kesimpulan, termasuk ketika belum ada', () => {
    const i = memoInput(FIRM_A, 'KAP Uji Satu');
    expect(JSON.stringify(buildSa610Blocks(i))).toContain('Kesimpulan belum diambil');
    const dg = buildSa610Blocks({ ...i, conclusion: { by: 'Anindya P.', at: '2026-03-09', avg: 3.7, verdict: 'Dapat Diandalkan' } });
    expect(JSON.stringify(dg)).toContain('Anindya P.');
    expect(JSON.stringify(dg)).not.toContain('Kesimpulan belum diambil');
  });
});
