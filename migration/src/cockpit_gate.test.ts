/* ============================================================
   Engagement Cockpit — gerbang kesiapan opini KANONIK (PR-C-3)

   Cacat yang ditutup: panel "Kesiapan Opini & EQR" merakit 8 kriterianya
   sendiri, tiga di antaranya KONSTANTA —

       { l:'Penilaian going concern selesai',        ok:false }
       { l:'Telaah peristiwa kemudian (subsequent)', ok:false }
       { l:'Konfirmasi independensi tim lengkap',    ok:true  }

   — sehingga gauge "x/8 kriteria siap" berplafon 6 dan berlantai 1, apa pun
   yang dikerjakan auditor. Ini cacat #240 persis: status ditentukan literal,
   bukan angka.

   Yang dibuktikan berkas ini (kriteria S5):
     1. TRIPWIRE sumber — nol kriteria berkonstanta tersisa di view.
     2. Setiap kriteria gerbang kanonik BENAR-BENAR digerakkan input: tak ada
        satu pun yang `met`-nya sama pada keadaan "belum apa-apa" dan "semua
        selesai". Kriteria yang tak bisa berubah bukan kriteria.
   ============================================================ */
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AMS } from './data';
import { engagementGate, wpKeyFor, WP_MODULE_MAP } from './wp_signoff';
import { eqrGateFor } from './canon_eqr_gate';

const ENG = 'ENG-2025-014';

interface Criterion { key: string; label: string; met: boolean; detail: string; view?: string }
interface Gate { criteria: Criterion[]; blockers: Criterion[]; allMet: boolean; severity: string; nextPhase: string }

interface NoteRow { id: string; status: string; priority: string }
interface AuditLike {
  wpState: Record<string, unknown>;
  reviewNotesActive: NoteRow[];
  wtb: unknown[];
  aje: unknown[];
}

const engagements = () => (AMS as unknown as { ENGAGEMENTS: { id: string; phase: string }[] }).ENGAGEMENTS;

const firmFor = (engId: string) => {
  const list = engagements();
  return {
    activeEngagementId: engId,
    activeEngagement: list.find((x) => x.id === engId),
    engagements: list,
  };
};

/** wpState di mana SETIAP kertas kerja kunci sudah bertanda tangan & berkesimpulan. */
const wpStateAllDone = (): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  Object.keys(WP_MODULE_MAP).forEach((mid) => {
    out[wpKeyFor(mid)] = {
      chain: { preparer: { by: 'A', at: '2026-03-01' }, reviewer: { by: 'B', at: '2026-03-02' }, partner: { by: 'C', at: '2026-03-03' } },
      conclusion: { text: 'Memadai.' },
    };
  });
  return out;
};

const auditEmpty = (): AuditLike => ({ wpState: {}, reviewNotesActive: [{ id: 'N1', status: 'open', priority: 'high' }], wtb: [], aje: [] });
const auditDone = (): AuditLike => ({ wpState: wpStateAllDone(), reviewNotesActive: [], wtb: [], aje: [] });

const opinionKey = (engId: string) => `ams.v1.engagement.${engId}.opinionDoc.v1`;

const gate = (audit: AuditLike, engId: string, from: string, to: string): Gate =>
  engagementGate(audit, firmFor(engId), { fromPhase: from, nextPhase: to }) as Gate;

beforeEach(() => { localStorage.clear(); });

describe('TRIPWIRE — nol kriteria berkonstanta di cockpit (S5)', () => {
  const src = () => readFileSync(join(__dirname, 'view_cockpit2.tsx'), 'utf8');

  it('view tak lagi memuat kriteria gerbang dengan ok literal', () => {
    /* Pola lama: `{ l: '…', ok: false, sub: '…' }`. Grep sengaja luas —
       kalau ada yang menuliskannya lagi dalam bentuk apa pun, uji ini merah.
       Komentar dibuang lebih dulu: kepala berkas MENGUTIP pola lama sebagai
       catatan sejarah, dan kutipan itu bukan kode. */
    const kode = src().replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(kode).not.toMatch(/\bok:\s*(true|false)\b/);
  });

  it('view memanggil gerbang kanonik, bukan merakit daftarnya sendiri', () => {
    const s = src();
    expect(s).toMatch(/engagementGate\(/);
    expect(s).toMatch(/eqrStatusFor\(/);
    expect(s).toMatch(/EngagementGateSummary/);
  });

  it('going concern & subsequent events tetap terukur sebagai kertas kerja kanonik', () => {
    /* Keduanya dihapus dari gerbang karena dulu hardcode `ok:false` — tetapi
       TIDAK hilang dari sistem: mereka WP kanonik yang kelengkapannya terukur. */
    expect(Object.keys(WP_MODULE_MAP)).toContain('goingconcern');
    expect(Object.keys(WP_MODULE_MAP)).toContain('subsequent');
  });
});

describe('setiap kriteria gerbang digerakkan input (S5)', () => {
  it('gerbang →Arsip: nol kriteria yang sama di kedua keadaan ekstrem', () => {
    const before = gate(auditEmpty(), ENG, 'Finalisasi', 'Arsip');
    localStorage.setItem(opinionKey(ENG), JSON.stringify({ finalized: true }));
    const after = gate(auditDone(), ENG, 'Finalisasi', 'Arsip');

    expect(before.criteria.length).toBeGreaterThan(0);
    const byKey = new Map(after.criteria.map((c) => [c.key, c]));
    const konstan: string[] = [];
    before.criteria.forEach((c) => {
      const a = byKey.get(c.key);
      if (a && a.met === c.met) konstan.push(c.key);
    });
    /* `eqrCleared` dikecualikan: inputnya adalah registri EQR ter-persist, yang
       uji ini memang tidak mengubah. Ia dibuktikan bergerak lewat fungsi
       murninya di bawah — bukan diasumsikan. */
    expect(konstan.filter((k) => k !== 'eqrCleared'), `kriteria yang tak bergerak: ${konstan.join(', ')}`).toEqual([]);
  });

  it('kriteria EQR digerakkan registri EQR, bukan konstanta', () => {
    const kosong = eqrGateFor(ENG, [], true);
    const terbuka = eqrGateFor(ENG, [{ eng: ENG, cleared: false }], true);
    const lolos = eqrGateFor(ENG, [{ eng: ENG, cleared: true }], true);
    expect(kosong.cleared).toBe(false);
    expect(kosong.reason).toBe('missing-review');
    expect(terbuka.cleared).toBe(false);
    expect(lolos.cleared).toBe(true);
    /* dan non-PIE tanpa baris EQR → tidak berlaku, bukan "gagal" */
    expect(eqrGateFor(ENG, [], false).applicable).toBe(false);
  });

  it('gerbang →Finalisasi: nol kriteria yang sama di kedua keadaan ekstrem', () => {
    const before = gate(auditEmpty(), ENG, 'Eksekusi', 'Finalisasi');
    const after = gate(auditDone(), ENG, 'Eksekusi', 'Finalisasi');
    const byKey = new Map(after.criteria.map((c) => [c.key, c]));
    const konstan = before.criteria.filter((c) => byKey.get(c.key)?.met === c.met).map((c) => c.key);
    /* wtbIntegrity memakai wtb/aje kosong pada kedua keadaan — sengaja
       dikecualikan di sini karena inputnya memang tak diubah uji ini. */
    expect(konstan.filter((k) => k !== 'wtbIntegrity'), `kriteria tak bergerak: ${konstan.join(', ')}`).toEqual([]);
  });

  it('sign-off kertas kerja menggerakkan kriteria allReviewed', () => {
    const kosong = gate(auditEmpty(), ENG, 'Finalisasi', 'Arsip').criteria.find((c) => c.key === 'allReviewed');
    const penuh = gate(auditDone(), ENG, 'Finalisasi', 'Arsip').criteria.find((c) => c.key === 'allReviewed');
    expect(kosong?.met).toBe(false);
    expect(penuh?.met).toBe(true);
    expect(kosong?.detail).toMatch(/0\//);
  });

  it('catatan review terbuka menggerakkan kriteria noOpenNotes', () => {
    const a = auditDone();
    const bersih = gate(a, ENG, 'Finalisasi', 'Arsip').criteria.find((c) => c.key === 'noOpenNotes');
    const kotor = gate({ ...a, reviewNotesActive: [{ id: 'N9', status: 'open', priority: 'medium' }] }, ENG, 'Finalisasi', 'Arsip')
      .criteria.find((c) => c.key === 'noOpenNotes');
    expect(bersih?.met).toBe(true);
    expect(kotor?.met).toBe(false);
  });

  it('finalisasi opini menggerakkan kriteria opinionFinal', () => {
    const sebelum = gate(auditDone(), ENG, 'Finalisasi', 'Arsip').criteria.find((c) => c.key === 'opinionFinal');
    localStorage.setItem(opinionKey(ENG), JSON.stringify({ finalized: true }));
    const sesudah = gate(auditDone(), ENG, 'Finalisasi', 'Arsip').criteria.find((c) => c.key === 'opinionFinal');
    expect(sebelum?.met).toBe(false);
    expect(sesudah?.met).toBe(true);
  });
});
