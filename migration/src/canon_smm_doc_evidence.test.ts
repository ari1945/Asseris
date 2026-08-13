import { describe, it, expect } from 'vitest';
import {
  smmDocEvidence, evidencedElements, EVIDENCE_STATE_LABEL,
  type DocEvidenceInput,
} from './canon_smm_doc_evidence';
import { smmDocCoverage, SMM_DOC_ELEMENTS } from './canon_smm_documentation';

/* ============================================================
   PR-8b — ¶57(c) menuntut dokumentasi yang MEMBERIKAN BUKTI.

   Cacat yang ditutup: `smmDocCoverage`, `SMM_DOC_ELEMENTS`,
   `auditRetention` & `QM_DOC_RETENTION` dibangun PR-7 lalu tidak
   pernah dikonsumsi view mana pun — mesin lengkap tanpa layar.

   Yang dijaga uji ini: `present` HANYA boleh diisi elemen yang
   terbukti dari artefak. Tidak ada jalur untuk menandai elemen
   "ada" tanpa artefaknya; elemen yang tak dapat dibuktikan
   otomatis punya keadaan SENDIRI, bukan dianggap ada.
   ============================================================ */

const FULL: DocEvidenceInput = {
  roles: [
    { ref: 'SMM 1 ¶20(a)', person: 'Hartono Wijaya, CPA' },
    { ref: 'SMM 1 ¶20(b)', person: 'Anindya Pramesti, CPA' },
  ],
  coverage: { covered: ['QO-28a'], waived: [], uncovered: [] },
  risks: [{ id: 'QR-01', response: 'Kontrol X', deficiency: null }],
  inspections: [{ id: 'INS-1', grade: 'Memuaskan' }],
  findings: [{ ins: 'INS-1', cause: 'Akar penyebab tercatat.' }],
  writtenConclusion: 'Kesimpulan ¶54 firma.',
  network: { inNetwork: false },
};

const byEl = (inp: DocEvidenceInput) => new Map(smmDocEvidence(inp).map((e) => [e.element, e]));

describe('¶58 — tiga keadaan, bukan dua', () => {
  it('setiap elemen membawa keadaan, penjelasan, dan sumbernya', () => {
    for (const e of smmDocEvidence(FULL)) {
      expect(EVIDENCE_STATE_LABEL[e.state], e.element).toBeTruthy();
      expect(e.detail.length, e.element).toBeGreaterThan(25);
      expect(e.source.length, e.element).toBeGreaterThan(0);
    }
  });

  it('¶58(d)(iv) komunikasi pemantauan: not-automatable, BUKAN evidenced', () => {
    const m = byEl(FULL);
    const c = m.get('monitoring-communication')!;
    expect(c.state).toBe('not-automatable');
    /* Kalau suatu saat keadaan ini berubah jadi 'evidenced' tanpa artefak
       baru, berarti seseorang memasang toggle manual — persis yang dilarang. */
    expect(c.detail).toContain('bukan pernyataan tentang bukti');
  });

  it('TRIPWIRE — not-automatable TIDAK ikut dihitung present', () => {
    const ev = smmDocEvidence(FULL);
    expect(evidencedElements(ev)).not.toContain('monitoring-communication');
  });
});

describe('tiap elemen benar-benar bisa GAGAL', () => {
  it('¶58(a) — ¶20(b) tanpa pemegang ⇒ missing', () => {
    const m = byEl({ ...FULL, roles: [{ ref: 'SMM 1 ¶20(a)', person: 'X' }] });
    expect(m.get('responsibility-holders')!.state).toBe('missing');
    expect(m.get('responsibility-holders')!.detail).toContain('¶20(b)');
  });

  it('¶58(b) — tujuan mandatori tanpa risiko & tanpa waiver sah ⇒ missing', () => {
    const m = byEl({ ...FULL, coverage: { covered: ['QO-28a'], waived: [], uncovered: ['QO-28b', 'QO-28c'] } });
    const e = m.get('objectives-and-risks')!;
    expect(e.state).toBe('missing');
    expect(e.detail).toContain('2 tujuan mandatori');
  });

  it('¶58(c) — risiko tanpa deskripsi respons ⇒ missing & menyebut id-nya', () => {
    const m = byEl({ ...FULL, risks: [{ id: 'QR-09', response: '  ', deficiency: null }] });
    expect(m.get('responses')!.state).toBe('missing');
    expect(m.get('responses')!.detail).toContain('QR-09');
  });

  it('¶58(d)(i) — seluruh inspeksi baru DIJADWALKAN ⇒ missing', () => {
    const m = byEl({ ...FULL, inspections: [{ id: 'INS-9', grade: 'Dijadwalkan' }] });
    expect(m.get('monitoring-evidence')!.state).toBe('missing');
  });

  it('¶58(d)(ii) — temuan tanpa akar penyebab ⇒ missing', () => {
    const m = byEl({ ...FULL, findings: [{ ins: 'INS-1', cause: null }] });
    expect(m.get('findings-and-deficiencies')!.state).toBe('missing');
  });

  it('¶58(d)(iii) — defisiensi tanpa tindakan/pemilik/tenggat ⇒ missing', () => {
    const m = byEl({
      ...FULL,
      risks: [{ id: 'QR-02', response: 'Kontrol', deficiency: { rootCause: 'akar', action: 'Tindakan', owner: '', due: '2026-04-30' } }],
    });
    expect(m.get('remedial-actions')!.state).toBe('missing');
    expect(m.get('remedial-actions')!.detail).toContain('QR-02');
  });

  it('¶58(e) — rekomendasi mesin BUKAN basis; tanpa kesimpulan tertulis ⇒ missing', () => {
    const m = byEl({ ...FULL, writtenConclusion: '   ' });
    const e = m.get('conclusion-basis')!;
    expect(e.state).toBe('missing');
    expect(e.detail).toContain('rekomendasi mesin');
  });
});

describe('¶59 — hanya berlaku bagi KAP berjaringan', () => {
  it('non-jaringan: elemen jaringan tidak dituntut sama sekali', () => {
    expect(byEl(FULL).has('network-matters')).toBe(false);
  });

  it('berjaringan tanpa hasil pemantauan tahun berjalan ⇒ missing', () => {
    const m = byEl({ ...FULL, network: { inNetwork: true, year: 2025, monitoring: [] } });
    expect(m.get('network-matters')!.state).toBe('missing');
    expect(m.get('network-matters')!.detail).toContain('¶51(b)');
  });

  it('berjaringan & lengkap ⇒ evidenced', () => {
    const m = byEl({
      ...FULL,
      network: { inNetwork: true, year: 2025, monitoring: [{ year: 2025, obtainedAt: '2026-02-14', communicatedToTeams: true, effectConsidered: true }] },
    });
    expect(m.get('network-matters')!.state).toBe('evidenced');
  });

  it('diperoleh tetapi belum dikomunikasikan ⇒ missing, dan alasannya disebut', () => {
    const m = byEl({
      ...FULL,
      network: { inNetwork: true, year: 2025, monitoring: [{ year: 2025, obtainedAt: '2026-02-14', communicatedToTeams: false, effectConsidered: true }] },
    });
    const e = m.get('network-matters')!;
    expect(e.state).toBe('missing');
    expect(e.detail).toContain('belum dikomunikasikan');
  });
});

describe('sambungan ke smmDocCoverage — "lengkap" tak bisa diklaim di atas yang tak terbukti', () => {
  it('elemen not-automatable membuat cakupan TIDAK lengkap', () => {
    const cov = smmDocCoverage(evidencedElements(smmDocEvidence(FULL)), false);
    expect(cov.complete).toBe(false);
    expect(cov.missing).toContain('monitoring-communication');
  });

  it('kesembilan elemen ¶58/¶59 terwakili bagi KAP berjaringan', () => {
    const ev = smmDocEvidence({ ...FULL, network: { inNetwork: true, year: 2025, monitoring: [] } });
    expect(ev.length).toBe(SMM_DOC_ELEMENTS.length);
  });

  it('masukan kosong aman & seluruhnya gagal-tertutup', () => {
    const ev = smmDocEvidence(null);
    expect(ev.length).toBeGreaterThan(0);
    expect(evidencedElements(ev)).not.toContain('conclusion-basis');
  });
});
