/* ============================================================
   PRD `docs/prd-sales-pipeline-deepening.md` · PR-2 · SC-4 & SC-5.

   Panel "Penerimaan Klien (SA 220 / SMM)" dulu memaku dua barisnya `ok: true`
   dan menghitung dua sisanya dari `stage`/`prob`. Uji di bawah menembak tepat
   ke sana: baris independensi HARUS bisa merah, dan keputusan akseptasi yang
   sudah diambil HARUS terbaca.

   Semua kasus dijalankan atas SEED NYATA — bukan fixture yang disetel agar
   lulus (pelajaran arc P2PK: gerbang mutu di atas seed yang dijinakkan).
   ============================================================ */
import { describe, expect, it } from 'vitest';
import { AMS } from './data';
import './data_fpm';
import { pipelineSeed } from './canon_pipeline';
import type { Crm360Entry, Opportunity } from './canon_pipeline';
import { acceptanceReadiness, findProspect, independenceFindings } from './canon_pipeline_acceptance';
import type { IndependenceRow, ProspectLike } from './canon_pipeline_acceptance';
import type { ClientRow, PipelineOpp } from './ams_types';

const CTX = {
  prospects: (AMS as unknown as { PROSPECTS: ProspectLike[] }).PROSPECTS,
  independence: (AMS as unknown as { INDEPENDENCE: IndependenceRow[] }).INDEPENDENCE,
  clients: AMS.CLIENTS as ClientRow[],
};
const REG: Opportunity[] = pipelineSeed({
  pipeline: AMS.PIPELINE as PipelineOpp[],
  crm360: (AMS as unknown as { CRM_360: Record<string, Crm360Entry> }).CRM_360,
  clients: AMS.CLIENTS as ClientRow[],
});
const opp = (id: string) => REG.find((o) => o.id === id)!;
const row = (id: string, key: string) => acceptanceReadiness(opp(id), CTX).rows.find((r) => r.key === key)!;

describe('SC-4 — baris independensi DAPAT bernilai merah', () => {
  it('OPP-107: pemilik Bayu Saputra belum mendeklarasikan independensi → issue', () => {
    const bayu = CTX.independence.find((r) => r.name === 'Bayu Saputra')!;
    expect(bayu.declared).toBe(false);              /* fakta seed, bukan asumsi */
    const r = row('OPP-107', 'independensi');
    expect(r.status).toBe('issue');
    expect(r.basis).toMatch(/BELUM menandatangani deklarasi/i);
    expect(r.basis).toContain(bayu.id);             /* menyebut sumbernya */
  });

  it('OPP-102 & OPP-104: pemilik Sari Dewanti punya konflik tercatat → issue', () => {
    const sari = CTX.independence.find((r) => r.name === 'Sari Dewanti')!;
    expect(sari.conflicts).toBeGreaterThan(0);
    ['OPP-102', 'OPP-104'].forEach((id) => {
      const r = row(id, 'independensi');
      expect(r.status, id).toBe('issue');
      expect(r.basis, id).toContain(sari.finInterest!);
    });
  });

  it('OPP-201/202 (cross-sell C-014): tenur partner sudah menyentuh batas rotasi → issue', () => {
    const hartono = CTX.independence.find((r) => r.name === 'Hartono Wijaya')!;
    expect(hartono.tenure).toBeGreaterThanOrEqual(hartono.rotationLimit!);
    const r = row('OPP-201', 'independensi');
    expect(r.status).toBe('issue');
    expect(r.basis).toMatch(/Rotasi: tahun ke-5 dari batas 5/);
  });

  it('rotasi TIDAK dipicu untuk klien lain — batasnya per-klien, bukan per-orang', () => {
    /* OPP-101 juga milik Hartono, tapi calon klien baru (bukan rotationClient). */
    const f = independenceFindings(opp('OPP-101'), CTX.independence, CTX.clients);
    expect(f.join(' ')).not.toMatch(/Rotasi/);
  });

  it('pemilik yang tak terdaftar di register TIDAK dianggap bersih', () => {
    const asing: Opportunity = { ...opp('OPP-101'), owner: 'Orang Tak Terdaftar' };
    const f = independenceFindings(asing, CTX.independence, CTX.clients);
    expect(f).toHaveLength(1);
    expect(f[0]).toMatch(/tidak terdaftar/i);
  });

  it('CACAT LAMA: baris independensi dulu dipaku true — kini ADA yang merah di seed', () => {
    const merah = REG.filter((o) => acceptanceReadiness(o, CTX).rows.some((r) => r.key === 'independensi' && r.status === 'issue'));
    expect(merah.length).toBeGreaterThan(0);
  });
});

describe('SC-5 — keputusan akseptasi yang SUDAH ADA terbaca di papan', () => {
  it('OPP-101 tertaut PROS-03 lewat field source, bukan tebakan nama', () => {
    const { p, by } = findProspect(opp('OPP-101'), CTX.prospects);
    expect(p!.id).toBe('PROS-03');
    expect(by).toBe('source');
  });

  it('OPP-101: sudah "Terima" 2026-02-26 — bukan lagi calon yang belum dinilai', () => {
    const r = acceptanceReadiness(opp('OPP-101'), CTX);
    expect(r.gates.acceptance).toBe(true);
    expect(r.verdict.text).toContain('2026-02-26');
    expect(r.verdict.state).not.toBe('tanpa-prospek');
  });

  it('OPP-103: syarat akseptasi ("Terima dengan Syarat") IKUT ditampilkan', () => {
    const r = acceptanceReadiness(opp('OPP-103'), CTX);
    expect(r.verdict.text).toContain('Terima dengan Syarat');
    expect(r.verdict.text).toMatch(/Syarat: .*spesialis industri energi/i);
  });

  it('OPP-103: PMPJ belum diverifikasi ⇒ TIDAK pernah berbunyi "siap terbitkan surat"', () => {
    const r = acceptanceReadiness(opp('OPP-103'), CTX);
    expect(r.gates.pmpj).toBe(false);
    expect(r.verdict.state).toBe('diterima');
    expect(r.verdict.text).toMatch(/surat perikatan belum boleh terbit/i);
  });

  it('OPP-107: akseptasi disetujui + PMPJ ✓ TETAPI independensi terbuka ⇒ surat TIDAK boleh terbit', () => {
    const r = acceptanceReadiness(opp('OPP-107'), CTX);
    expect(r.gates.acceptance).toBe(true);
    expect(r.gates.pmpj).toBe(true);
    expect(r.issues).toBeGreaterThan(0);
    expect(r.verdict.state).toBe('diterima');           /* BUKAN 'siap-surat' */
    expect(r.verdict.text).toMatch(/selesaikan sebelum menerbitkan surat/i);
  });

  it('"siap-surat" hanya bila TAK ADA hal terbuka sama sekali', () => {
    REG.forEach((o) => {
      const r = acceptanceReadiness(o, CTX);
      if (r.verdict.state === 'siap-surat') expect(r.issues, o.id).toBe(0);
    });
    /* dan keadaan itu benar-benar tercapai di seed — bukan cabang mati */
    expect(REG.some((o) => acceptanceReadiness(o, CTX).verdict.state === 'siap-surat')).toBe(true);
  });

  it('OPP-103: kecocokan PEP DISEBUT, tidak disembunyikan di balik centang', () => {
    const r = row('OPP-103', 'integritas');
    expect(r.basis).toMatch(/PEP/);
    expect(r.basis).toMatch(/Bambang Sutrisno/);
  });

  it('peluang tanpa prospek berstatus BELUM DINILAI, bukan tercentang', () => {
    const r = acceptanceReadiness(opp('OPP-102'), CTX);
    expect(r.prospect).toBeNull();
    expect(r.verdict.state).toBe('tanpa-prospek');
    /* Independensi tetap dapat dinilai dari register meski prospek belum ada. */
    r.rows.filter((x) => x.key !== 'independensi').forEach((x) => expect(x.status).toBe('belum-dinilai'));
  });

  it('cross-sell tanpa prospek diarahkan ke KEBERLANJUTAN, bukan penerimaan', () => {
    const r = acceptanceReadiness(opp('OPP-210'), CTX);
    expect(r.verdict.state).toBe('klien-eksisting');
    expect(r.verdict.text).toMatch(/KEBERLANJUTAN/);
  });

  it('cross-sell TIDAK mencomot catatan prospek klien yang sama untuk jasa lain', () => {
    /* Ditemukan verifikasi hidup: OPP-201 (ESG Assurance Rp 480 jt, klien C-014)
       tertaut lewat nama ke PROS-04 — catatan prospek AUDIT klien itu (fee
       Rp 1.850 jt). Papan lalu menampilkan keputusan penerimaan perikatan LAIN
       seolah milik peluang ini. Fallback nama kini intake-saja. */
    const pros04 = CTX.prospects.find((p) => p.id === 'PROS-04')!;
    expect(pros04.name).toBe(opp('OPP-201').name);          /* nama memang sama */
    expect(findProspect(opp('OPP-201'), CTX.prospects).p).toBeNull();
    expect(acceptanceReadiness(opp('OPP-201'), CTX).feeMismatch).toBeNull();
  });

  it('fallback nama TETAP berlaku untuk peluang intake', () => {
    const tanpaSource: ProspectLike[] = CTX.prospects.map((p) => ({ ...p, source: undefined }));
    const { p, by } = findProspect(opp('OPP-101'), tanpaSource);
    expect(p!.id).toBe('PROS-03');
    expect(by).toBe('nama');
  });
});

describe('tak ada default hijau', () => {
  it('setiap baris selalu membawa dasar yang menyebut sumbernya', () => {
    REG.forEach((o) => acceptanceReadiness(o, CTX).rows.forEach((r) => {
      expect(r.basis.trim().length, `${o.id}/${r.key}`).toBeGreaterThan(0);
    }));
  });

  it('faktor berskor default 3 TANPA catatan dihitung belum-dinilai, bukan ok', () => {
    const kosong: ProspectLike = {
      id: 'PROS-X', name: opp('OPP-102').name, source: 'OPP-102',
      acceptance: { approved: false, factors: [
        { k: 'Integritas', w: 25, s: 3, note: '' }, { k: 'Independensi', w: 20, s: 3, note: '' },
        { k: 'Kompetensi', w: 20, s: 3, note: '' }, { k: 'Risiko', w: 25, s: 3, note: '' },
        { k: 'Imbalan', w: 10, s: 3, note: '' },
      ] },
    };
    const r = acceptanceReadiness(opp('OPP-102'), { ...CTX, prospects: [kosong] });
    expect(r.composite).toBeNull();
    expect(r.rows.filter((x) => x.status === 'ok')).toHaveLength(0);
  });

  it('skor komposit = rata-rata TERTIMBANG faktor yang sudah dinilai', () => {
    const r = acceptanceReadiness(opp('OPP-101'), CTX);
    const p = CTX.prospects.find((x) => x.id === 'PROS-03')!;
    const f = p.acceptance!.factors!;
    const manual = f.reduce((s, x) => s + x.w * x.s, 0) / f.reduce((s, x) => s + x.w, 0);
    expect(r.composite).toBeCloseTo(+manual.toFixed(2), 2);
  });

  it('status TIDAK bergantung pada tahap maupun probabilitas (cacat lama)', () => {
    const base = opp('OPP-101');
    const a = acceptanceReadiness({ ...base, stage: 'Lead', prob: 5 }, CTX);
    const b = acceptanceReadiness({ ...base, stage: 'Negotiation', prob: 95 }, CTX);
    expect(a.rows.map((r) => r.status)).toEqual(b.rows.map((r) => r.status));
    expect(a.verdict.state).toBe(b.verdict.state);
  });
});

describe('gerbang anti-kambuh atas sumber', () => {
  it('view_pipeline tak lagi memaku status penerimaan maupun menurunkannya dari stage/prob', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const src = readFileSync(join(__dirname, 'view_pipeline.tsx'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, ' ');            /* komentar menjelaskan pola lama */
    expect(src).not.toMatch(/ok:\s*true/);
    expect(src).not.toMatch(/ok:\s*o\.(stage|prob)/);
    expect(src).not.toMatch(/siap terbitkan engagement letter/i);
    expect(src).toMatch(/acceptanceReadiness/);
  });
});

describe('selisih nilai peluang vs fee prospek terlihat', () => {
  it('seed konsisten → tak ada peringatan', () => {
    expect(acceptanceReadiness(opp('OPP-103'), CTX).feeMismatch).toBeNull();
  });

  it('bila berbeda, KEDUA angka disebut', () => {
    const r = acceptanceReadiness({ ...opp('OPP-103'), value: 999_000_000 }, CTX);
    expect(r.feeMismatch).toEqual({ opp: 999_000_000, prospect: 1_280_000_000 });
  });
});
