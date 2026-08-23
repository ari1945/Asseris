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
  nextIaSeq, newIaUseArea, newIaReperfItem, newIaDirectItem,
  iaUseAreaConflicts, iaUseAreaIncomplete, iaUseAreaImpact,
  iaDiffAgainstCtt, iaReperfConflicts, iaReperfSummarize, iaAreasWithoutReperf,
  iaDirectBlockers, iaDirectStatusBlockReason, iaDirectViolations, iaDirectHours,
  iaDocumentationChecklist,
  iaMemoContext, sa610MemoBlockers, sa610ExportBlockReason,
  sa610MemoMeta, sa610MemoRefNo, sa610MemoFileName, sa610MemoTitle, buildSa610Blocks,
  type IaDirectItem, type IaFirmLike, type IaReperfItem, type IaUseArea, type Sa610MemoInput,
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
    conclusion: null, useAreas: [], reperf: [], direct: [], cttFull: null,
    date: '2026-03-09',
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
    expect(d.ver).toBe(3);
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
      ver: 3,
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

/* ==================================================================
   IA7 — tiga register yang dulu MENYATAKAN pekerjaan audit yang tak
   pernah dilakukan: area penggunaan, reperformansi, bantuan langsung.
   ================================================================== */
describe('IA7 · register lahir KOSONG, bukan berisi pekerjaan karangan', () => {
  it('dokumen baru tidak memuat satu pun area, pos reperformansi, atau individu', () => {
    const d = normalizeIaDoc(null);
    expect(d.useAreas).toEqual([]);
    expect(d.reperf).toEqual([]);
    expect(d.direct).toEqual([]);
  });

  it('baris baru lahir tanpa satu pun jawaban', () => {
    const a = newIaUseArea([]);
    expect([a.area, a.assertion, a.judgment, a.risk, a.nature, a.extent, a.result, a.note, a.wpRef])
      .toEqual(['', '', '', '', '', '', '', '', '']);
    expect(a.reperfPct).toBeNull();

    const r = newIaReperfItem([]);
    expect([r.areaId, r.item, r.iaConclusion, r.auditorResult, r.disposition]).toEqual(['', '', '', '', '']);
    expect([r.exceptions, r.diffRp]).toEqual([null, null]);

    const x = newIaDirectItem([]);
    expect([x.name, x.task, x.supervisor, x.review, x.status]).toEqual(['', '', '', '', '']);
    expect(x.hours).toBeNull();
    expect([x.objectivityEvaluated, x.entityConsent, x.individualConsent]).toEqual([false, false, false]);
  });

  it('penomoran baris tidak memakai panjang larik — id tak pernah kembar', () => {
    /* Menghapus baris tengah lalu menambah baris baru: `list.length` akan
       melahirkan id KEMBAR, dan id kembar memutus tautan reperformansi→area
       ke baris yang salah. */
    const a1 = newIaUseArea([]);
    const a2 = newIaUseArea([a1]);
    const a3 = newIaUseArea([a1, a2]);
    expect([a1.id, a2.id, a3.id]).toEqual(['IA-U-01', 'IA-U-02', 'IA-U-03']);
    const sesudahHapus = newIaUseArea([a1, a3]);   // a2 dihapus, panjang = 2
    expect(sesudahHapus.id).toBe('IA-U-04');
    expect(nextIaSeq(['IA-U-01', 'IA-U-09', 'bukan-id'], 'IA-U-')).toBe(10);
    expect(nextIaSeq([], 'IA-RP-')).toBe(1);
  });

  it('sumber view tidak memuat satu pun register pekerjaan sebagai konstanta', () => {
    const src = view();
    const konstanta = ['IA_USE_AREAS', 'IA_REPERF', 'IA_DIRECT'];
    const hit = konstanta.filter((k) => new RegExp('const\\s+' + k + '\\s*=').test(src));
    expect(hit, 'register masih konstanta modul: ' + hit.join(' | ')).toEqual([]);
  });

  it('nol disposisi hasil audit sebagai NILAI sebuah field di sumber view', () => {
    /* 'Memadai'/'Sesuai'/'Selesai' sah sebagai PILIHAN dalam taksonomi. Yang
       dilarang adalah ia menjadi nilai sebuah field — `result: 'Memadai'` —
       yaitu jawaban yang sudah terisi sebelum auditor menjawabnya. */
    const hit = [...view().matchAll(/\b(result|status|disposition|review|judgment|risk|nature|extent)\s*:\s*'[^']+'/g)]
      .map((m) => m[0]);
    expect(hit, 'jawaban terisi: ' + hit.join(' | ')).toEqual([]);
  });

  it('nol jam, pengecualian, atau tingkat reperformansi sebagai konstanta', () => {
    const hit = [...view().matchAll(/\b(hours|exc|exceptions|reperf|reperfPct|diffRp)\s*:\s*-?[\d_.]+/g)].map((m) => m[0]);
    expect(hit, 'angka pekerjaan tertanam: ' + hit.join(' | ')).toEqual([]);
  });

  it('nol nama individu pemberi bantuan langsung yang dikarang', () => {
    const nama = ['Sari Anjani', 'Bagus Pratama', 'Dimas R.', 'Putri M.'];
    const hit = nama.filter((n) => view().includes(n));
    expect(hit, 'individu dikarang: ' + hit.join(' | ')).toEqual([]);
  });

  it('nol rujukan kertas kerja yang tak resolve; rujukan dipilih dari yang ADA', () => {
    /* 'PR-3','A-2','C-1','PR-1','B-4' tak ada di `WORKPAPERS` (ref huruf
       A·B·C·E·F·R) maupun di `WP_MODULE_MAP`. Register kini menautkan ke daftar
       kertas kerja perikatan, bukan ke string yang diketik. */
    const src = view();
    const hit = [...src.matchAll(/\blead\s*:\s*'[^']+'/g)].map((m) => m[0]);
    expect(hit, 'rujukan KK dikarang: ' + hit.join(' | ')).toEqual([]);
    expect(src, 'view tidak membaca daftar kertas kerja perikatan').toMatch(/workpapers/);
    expect(src, 'ambang jelas remeh tidak dibaca dari kanon materialitas').toMatch(/useMateriality\s*\(/);
  });

  it("nol klaim naratif tentang hasil pekerjaan yang tak pernah dicatat", () => {
    /* "Reperformansi mengonfirmasi simpulan …", "direviu 100%", "Selisih < CTT",
       "40 sampel sendiri" — kalimat yang menyatakan hasil untuk setiap perikatan. */
    const src = view();
    const pola = /mengonfirmasi simpulan|direviu <b>100%|Selisih < CTT|sampel sendiri|ditemukan 2 kekurangan/gi;
    const hit = [...src.matchAll(pola)].map((m) => m[0]);
    expect(hit, 'klaim hasil dikarang: ' + hit.join(' | ')).toEqual([]);
  });

  it('nol rujukan arsip dokumentasi yang tak ada di register kertas kerja', () => {
    const hit = [...view().matchAll(/A-610\.\d/g)].map((m) => m[0]);
    expect(hit, 'indeks arsip dikarang: ' + hit.join(' | ')).toEqual([]);
  });
});

/* ------------------------------------------------------------------
   IA7 — mesin MEMBANTAH, bukan mengisi.
   ------------------------------------------------------------------ */
describe('IA7 · pertentangan area penggunaan (¶18–19)', () => {
  const area = (p: Partial<IaUseArea>): IaUseArea => ({ ...newIaUseArea([]), ...p });

  it('area kosong tidak membantah apa pun', () => {
    expect(iaUseAreaConflicts(newIaUseArea([]))).toEqual([]);
  });

  it('pertimbangan tinggi + tetap diandalkan = bertentangan (¶18)', () => {
    const c = iaUseAreaConflicts(area({ judgment: 'Tinggi', nature: 'Menggunakan hasil kerja', result: 'Memadai', reperfPct: 50 }));
    expect(c.length).toBeGreaterThan(0);
    expect(c.join(' ')).toContain('¶18');
  });

  it('risiko signifikan + tingkat penggunaan tinggi = bertentangan (¶19)', () => {
    const c = iaUseAreaConflicts(area({ risk: 'Signifikan', extent: 'Tinggi', nature: 'Menggunakan hasil kerja', result: 'Memadai', reperfPct: 20 }));
    expect(c.join(' ')).toContain('¶19');
  });

  it('diandalkan tanpa reperformansi sama sekali = bertentangan (¶24)', () => {
    const c = iaUseAreaConflicts(area({ judgment: 'Rendah', risk: 'Rendah', nature: 'Menggunakan hasil kerja', extent: 'Sedang', result: 'Memadai', reperfPct: 0 }));
    expect(c.join(' ')).toContain('¶24');
  });

  it('"Dikecualikan" tetapi bentuknya mengandalkan = bertentangan', () => {
    const c = iaUseAreaConflicts(area({ nature: 'Bantuan langsung', result: 'Dikecualikan', reperfPct: 100 }));
    expect(c.join(' ')).toContain('Dikecualikan');
  });

  it('kombinasi yang konsisten TIDAK dibantah', () => {
    expect(iaUseAreaConflicts(area({
      area: 'Rekonsiliasi bank', judgment: 'Rendah', risk: 'Rendah',
      nature: 'Menggunakan hasil kerja', extent: 'Tinggi', reperfPct: 15, result: 'Memadai',
    }))).toEqual([]);
    expect(iaUseAreaConflicts(area({
      area: 'Estimasi kompleks', judgment: 'Tinggi', risk: 'Signifikan',
      nature: 'Tidak digunakan', extent: '', reperfPct: 100, result: 'Dikecualikan',
    }))).toEqual([]);
  });

  it('kelengkapan & dampak ¶18 diturunkan, bukan ditulis', () => {
    expect(iaUseAreaIncomplete(newIaUseArea([]))).toBe(true);
    const lengkap = area({ area: 'X', judgment: 'Rendah', risk: 'Rendah', nature: 'Menggunakan hasil kerja', result: 'Memadai' });
    expect(iaUseAreaIncomplete(lengkap)).toBe(false);
    expect(iaUseAreaImpact(lengkap)).toBe('Efisiensi');
    expect(iaUseAreaImpact(area({ nature: 'Tidak digunakan' }))).toBe('Tidak berubah');
    expect(iaUseAreaImpact(area({ nature: 'Menggunakan hasil kerja', result: 'Perlu Perluasan' }))).toBe('Prosedur diperluas');
    expect(iaUseAreaImpact(newIaUseArea([]))).toBe('Belum ditentukan');
  });
});

describe('IA7 · reperformansi diuji terhadap ambang perikatan (¶24)', () => {
  const CTT = 74_250_000;   // ambang jelas remeh contoh (Rp penuh)
  const pos = (p: Partial<IaReperfItem>): IaReperfItem => ({ ...newIaReperfItem([]), ...p });

  it('tanpa ambang atau tanpa selisih, jawabannya "unknown" — bukan "below"', () => {
    expect(iaDiffAgainstCtt(null, CTT)).toBe('unknown');
    expect(iaDiffAgainstCtt(1, null)).toBe('unknown');
    expect(iaDiffAgainstCtt(1, 0)).toBe('unknown');
  });

  it('selisih diuji terhadap ambang, dua arah, termasuk selisih negatif', () => {
    expect(iaDiffAgainstCtt(CTT - 1, CTT)).toBe('below');
    expect(iaDiffAgainstCtt(CTT, CTT)).toBe('above');
    expect(iaDiffAgainstCtt(-(CTT + 1), CTT)).toBe('above');
    expect(iaDiffAgainstCtt(-(CTT - 1), CTT)).toBe('below');
  });

  it('klaim "di bawah ambang" yang tidak dapat diuji DIBANTAH', () => {
    const c = iaReperfConflicts(pos({ disposition: 'Selisih di bawah ambang', auditorResult: 'x' }), CTT);
    expect(c.join(' ')).toContain('tak dapat diuji');
  });

  it('klaim "di bawah ambang" yang SALAH dibantah oleh angkanya sendiri', () => {
    const c = iaReperfConflicts(pos({ disposition: 'Selisih di bawah ambang', diffRp: CTT * 2, auditorResult: 'x' }), CTT);
    expect(c.join(' ')).toContain('MELAMPAUI');
  });

  it('"Sesuai" dengan pengecualian bukan nol dibantah', () => {
    const c = iaReperfConflicts(pos({ disposition: 'Sesuai', exceptions: 2, auditorResult: 'x' }), CTT);
    expect(c.join(' ')).toContain('Sesuai');
  });

  it('disposisi tanpa hasil pelaksanaan ulang dibantah', () => {
    const c = iaReperfConflicts(pos({ disposition: 'Sesuai' }), CTT);
    expect(c.join(' ')).toContain('hasil pelaksanaan ulang');
  });

  it('ringkasan & cakupan ¶24 diturunkan dari register', () => {
    const areas = [
      { ...newIaUseArea([]), id: 'IA-U-01', area: 'Bank', nature: 'Menggunakan hasil kerja' as IaUseArea['nature'] },
      { ...newIaUseArea([]), id: 'IA-U-02', area: 'CKPN', nature: 'Tidak digunakan' as IaUseArea['nature'] },
    ];
    const rows = [pos({ id: 'IA-RP-01', areaId: 'IA-U-01', disposition: 'Sesuai', exceptions: 0, auditorResult: 'cocok' })];
    const s = iaReperfSummarize(rows, CTT);
    expect(s).toEqual({ total: 1, agreed: 1, exceptions: 0, expand: 0, conflicts: 0 });
    expect(iaAreasWithoutReperf(areas, rows)).toEqual([]);
    /* area yang diandalkan tanpa pos reperformansi = temuan, bukan diam */
    expect(iaAreasWithoutReperf(areas, []).map((a) => a.id)).toEqual(['IA-U-01']);
  });
});

describe('IA7 · gerbang bantuan langsung (¶29 · ¶33 · ¶34)', () => {
  const orang = (p: Partial<IaDirectItem>): IaDirectItem => ({ ...newIaDirectItem([]), ...p });
  const siap = orang({ name: 'A', supervisor: 'B', objectivityEvaluated: true, entityConsent: true, individualConsent: true });

  it('baris baru punya EMPAT prasyarat yang belum terpenuhi', () => {
    expect(iaDirectBlockers(newIaDirectItem([])).length).toBe(4);
  });

  it('setiap prasyarat yang hilang disebut sendiri-sendiri', () => {
    expect(iaDirectBlockers(siap)).toEqual([]);
    expect(iaDirectBlockers({ ...siap, objectivityEvaluated: false }).join(' ')).toContain('¶29');
    expect(iaDirectBlockers({ ...siap, entityConsent: false }).join(' ')).toContain('¶33(a)');
    expect(iaDirectBlockers({ ...siap, individualConsent: false }).join(' ')).toContain('¶33(b)');
    expect(iaDirectBlockers({ ...siap, supervisor: '  ' }).join(' ')).toContain('¶34');
  });

  it('status tak dapat melampaui prasyaratnya', () => {
    const kosong = newIaDirectItem([]);
    expect(iaDirectStatusBlockReason(kosong, '')).toBe('');
    expect(iaDirectStatusBlockReason(kosong, 'Direncanakan')).toBe('');
    expect(iaDirectStatusBlockReason(kosong, 'Berlangsung')).toContain('Prasyarat belum terpenuhi');
    expect(iaDirectStatusBlockReason(kosong, 'Selesai')).toContain('Prasyarat belum terpenuhi');
  });

  it('"Selesai" menuntut reviu PENUH (¶34), bukan sekadar prasyarat terpenuhi', () => {
    expect(iaDirectStatusBlockReason(siap, 'Berlangsung')).toBe('');
    expect(iaDirectStatusBlockReason(siap, 'Selesai')).toContain('¶34');
    expect(iaDirectStatusBlockReason({ ...siap, review: 'Sebagian' }, 'Selesai')).toContain('¶34');
    expect(iaDirectStatusBlockReason({ ...siap, review: 'Penuh' }, 'Selesai')).toBe('');
  });

  it('dokumen warisan yang statusnya terlanjur melampaui prasyarat DILAPORKAN', () => {
    /* Persis bentuk `IA_DIRECT` lama: nama, penyelia, jam, status 'Selesai' —
       tanpa satu pun persetujuan ¶33 tercatat. */
    const warisan = normalizeIaDoc({
      direct: [{ id: 'IA-DA-01', name: 'Seseorang', task: 't', supervisor: 'S', review: 'Penuh', hours: 24, status: 'Selesai' }],
    });
    const v = iaDirectViolations(warisan.direct);
    expect(v.length).toBe(1);
    expect(v[0].reason).toContain('¶33');
    expect(iaDirectHours(warisan.direct)).toBe(24);
  });
});

describe('IA7 · daftar simak dokumentasi ¶36–37 diturunkan', () => {
  it('dokumen kosong: tak satu pun butir selesai, kecuali butir bantuan langsung yang memang nihil', () => {
    const c = iaDocumentationChecklist(normalizeIaDoc(null));
    expect(c.length).toBe(5);
    expect(c.map((x) => x.done)).toEqual([false, false, false, true, false]);
  });

  it('butir ikut bergerak mengikuti isi kertas kerja', () => {
    const d = normalizeIaDoc(null);
    d.factors = d.factors.map((f, i) => ({ ...f, v: [4, 4, 3][i] }));
    d.useAreas = [{ ...newIaUseArea([]), area: 'X', judgment: 'Rendah', risk: 'Rendah', nature: 'Menggunakan hasil kerja', result: 'Memadai' }];
    d.reperf = [{ ...newIaReperfItem([]), disposition: 'Sesuai' }];
    d.direct = [{ ...newIaDirectItem([]), name: 'A' }];
    d.conclusion = { by: 'A', at: '2026-03-09', avg: 3.7, verdict: 'Dapat Diandalkan' };
    expect(iaDocumentationChecklist(d).map((x) => x.done)).toEqual([true, true, true, false, true]);
  });
});

/* ------------------------------------------------------------------
   IA7 — kompatibilitas & memo.
   ------------------------------------------------------------------ */
describe('IA7 · dokumen ver 2 tetap terbaca, register lahir kosong', () => {
  it('dokumen tanpa register (ver 2) tidak kehilangan penilaian ¶16', () => {
    const ver2 = { ver: 2, factors: [{ id: 'obj', v: 5, note: 'n', subs: [{ ok: true }] }], profile: { unit: 'U' }, conclusion: null };
    const d = normalizeIaDoc(ver2);
    expect(d.ver).toBe(3);
    expect(d.factors[0].v).toBe(5);
    expect(d.profile.unit).toBe('U');
    expect([d.useAreas, d.reperf, d.direct]).toEqual([[], [], []]);
  });

  it('baris register tanpa id DIBUANG — tanpa id ia tak dapat disunting maupun ditaut', () => {
    const d = normalizeIaDoc({ useAreas: [{ area: 'tanpa id' }, { id: 'IA-U-01', area: 'punya id' }] });
    expect(d.useAreas.map((a) => a.id)).toEqual(['IA-U-01']);
  });

  it('nilai taksonomi yang tak dikenali jatuh ke KOSONG, bukan ditebak', () => {
    const d = normalizeIaDoc({
      useAreas: [{ id: 'IA-U-01', judgment: 'Ekstrem', risk: 'Rendah', nature: 'ngarang', result: 'Memadai', reperfPct: 500 }],
      direct: [{ id: 'IA-DA-01', review: 'Kadang', status: 'Selesai', hours: -5, objectivityEvaluated: 'ya' }],
    });
    expect(d.useAreas[0].judgment).toBe('');
    expect(d.useAreas[0].risk).toBe('Rendah');
    expect(d.useAreas[0].nature).toBe('');
    expect(d.useAreas[0].result).toBe('Memadai');
    expect(d.useAreas[0].reperfPct).toBeNull();     // di luar 0..100
    expect(d.direct[0].review).toBe('');
    expect(d.direct[0].hours).toBeNull();           // negatif
    expect(d.direct[0].objectivityEvaluated).toBe(false);  // hanya `true` yang berarti ya
  });
});

describe('IA7 · memo tersegel membawa register — termasuk ketika kosong', () => {
  it('register kosong DINYATAKAN kosong, bukan dihilangkan dari memo', () => {
    const teks = JSON.stringify(buildSa610Blocks(memoInput(FIRM_A, 'KAP Uji Satu')));
    expect(teks).toContain('Belum ada area penggunaan');
    expect(teks).toContain('Belum ada pos reperformansi');
    expect(teks).toContain('Tidak ada bantuan langsung');
  });

  it('isi register ikut tersegel, beserta pertentangan yang belum diselesaikan', () => {
    const base = memoInput(FIRM_A, 'KAP Uji Satu');
    const a: IaUseArea = { ...newIaUseArea([]), area: 'Pengendalian penggajian', judgment: 'Tinggi', risk: 'Rendah', nature: 'Menggunakan hasil kerja', extent: 'Tinggi', reperfPct: 20, result: 'Memadai', wpRef: 'A' };
    const r: IaReperfItem = { ...newIaReperfItem([]), areaId: a.id, item: 'Uji otorisasi', auditorResult: 'cocok', disposition: 'Sesuai', exceptions: 0 };
    const x: IaDirectItem = { ...newIaDirectItem([]), name: 'Individu Uji', supervisor: 'Penyelia Uji', hours: 8, status: 'Selesai' };
    const teks = JSON.stringify(buildSa610Blocks({ ...base, useAreas: [a], reperf: [r], direct: [x], cttFull: 74_250_000 }));
    expect(teks).toContain('Pengendalian penggajian');
    expect(teks).toContain('Uji otorisasi');
    expect(teks).toContain('Individu Uji');
    /* pertentangan ¶18 dan pelanggaran ¶33 IKUT tersegel — memo tidak boleh
       lebih rapi daripada kertas kerjanya */
    expect(teks).toContain('¶18');
    expect(teks).toContain('¶33');
    expect(teks).not.toContain('undefined');
  });

  it('ambang jelas remeh yang dipakai ikut tercetak, atau dinyatakan tak tersedia', () => {
    const base = memoInput(FIRM_A, 'KAP Uji Satu');
    const r: IaReperfItem = { ...newIaReperfItem([]), item: 'x', auditorResult: 'y', disposition: 'Sesuai', exceptions: 0 };
    expect(JSON.stringify(buildSa610Blocks({ ...base, reperf: [r], cttFull: null }))).toContain('tidak tersedia');
    expect(JSON.stringify(buildSa610Blocks({ ...base, reperf: [r], cttFull: 74_250_000 }))).toContain('74250000');
  });
});
