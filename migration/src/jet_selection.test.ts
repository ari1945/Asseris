/* ============================================================
   Journal Entry Testing (SA 240 ¶32) — gerbang derivasi & konvensi.

   Modul `jet` menaruh sebuah CORONG POPULASI persis di bawah lencana
   "SA 240 · ¶32", yaitu paragraf tentang pemilihan jurnal DARI POPULASI.
   Sampai perbaikan ini corong itu dibangun dari angka yang tidak punya sumber
   di aplikasi mana pun: dua literal populasi (sama untuk SETIAP perikatan) dan
   satu penambah tanpa arti yang membuat corong menyempit secara meyakinkan.
   Setiap kartu lalu mencetak "% dari tahap sebelumnya" — persentase yang
   dihitung rapi di atas angka yang tidak ada. Angka populasi adalah KLAIM
   AUDIT: dasar kesimpulan cakupan pengujian, bukan hiasan tata letak.

   Gerbang di bawah dibagi dua:
     · gerbang SUMBER (memindai view_jet.tsx) — menangkap kambuhnya literal,
       kontrol palsu, hex mentah, jam sistem, dan tombol mati;
     · gerbang MURNI (memanggil jet_selection.ts) — memaku bahwa setiap nilai
       yang dirender berubah ketika populasinya berubah, dan bahwa disposisi
       menolak dicatat tanpa identitas.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AMS } from './data';
import { AMS_FORENSIC } from './forensic_canon';
import {
  jetFunnel, jetStampDate, meetsCriteria, selectedForTest,
  recordDisposition, recordNote, canRecord,
} from './jet_selection';
import type { JetScored, JetState } from './jet_selection';

const SRC_DIR = dirname(fileURLToPath(import.meta.url));
const VIEW = join(SRC_DIR, 'view_jet.tsx');
const src = (): string => readFileSync(VIEW, 'utf8');
/* Kode saja — komentar boleh (dan memang harus) mengutip pola lama sebagai
   catatan sejarah tanpa memerahkan gerbangnya. */
const kode = (): string =>
  src().replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/* ---------- populasi tiruan, ongkos rendah, untuk gerbang murni ---------- */
const je = (id: string, amount: number, score: number): JetScored => ({ id, amount, score });

const POP: JetScored[] = [
  je('J-1', 2_000_000_000, 5),
  je('J-2', 900_000_000, 2),
  je('J-3', 100_000_000, 1),
  je('J-4', 50_000_000, 0),
];

const emptyState = (): JetState => ({ activeCrit: [], minAmt: 0, tested: {} });

/* ============================================================
   (a) Tidak ada angka populasi yang tidak dapat dijelaskan dari data
   ============================================================ */
describe('J1 — corong populasi turunan, bukan karangan', () => {
  it('view tidak lagi memuat literal populasi 18452 / 1240', () => {
    const jsx = kode();
    expect(jsx.includes('18452'), 'literal totalJE 18452 masih ada').toBe(false);
    expect(jsx.includes('1240'), 'literal manualJE 1240 masih ada').toBe(false);
  });

  it('tidak ada penambah ajaib pada jumlah jurnal ter-flag', () => {
    const penambah = [...kode().matchAll(/\.length\s*[+-]\s*\d+/g)].map(m => m[0]);
    expect(penambah, `penambah tanpa arti: ${penambah.join(', ')}`).toEqual([]);
  });

  it('setiap nilai corong berubah ketika populasinya berubah', () => {
    const penuh = jetFunnel(POP, 0, {});
    const separuh = jetFunnel(POP.slice(0, 2), 0, {});
    expect(penuh.length).toBeGreaterThan(0);
    penuh.forEach((tahap, i) => {
      /* tahap 'disposed' bergantung pada `tested`, bukan pada populasi; ia
         diuji terpisah. Sisanya WAJIB bergerak. */
      if (tahap.id === 'disposed') return;
      expect(separuh[i].value, `tahap ${tahap.id} tidak bergerak saat populasi berubah`)
        .not.toBe(tahap.value);
    });
  });

  it('tahap disposisi bergerak mengikuti disposisi yang tercatat', () => {
    const nol = jetFunnel(POP, 0, {});
    const satu = jetFunnel(POP, 0, { 'J-1': { status: 'clear' } });
    const d0 = nol.find(t => t.id === 'disposed');
    const d1 = satu.find(t => t.id === 'disposed');
    expect(d0 && d0.value).toBe(0);
    expect(d1 && d1.value).toBe(1);
  });

  it('populasi kosong → nol angka positif di corong (tak ada tahap yang mengarang isi)', () => {
    const kosong = jetFunnel([], 0, {});
    kosong.forEach(t => expect(t.value, `tahap ${t.id} = ${t.value} pada populasi kosong`).toBe(0));
    kosong.forEach(t => expect(t.pctOfPrev, `persentase dicetak di atas nol pada ${t.id}`).toBeNull());
  });

  it('corong menyempit monoton — tiap tahap subset tahap sebelumnya', () => {
    const tahap = jetFunnel(POP, 500_000_000, { 'J-1': { status: 'clear' } });
    for (let i = 1; i < tahap.length; i++) {
      expect(tahap[i].value, `${tahap[i].id} > ${tahap[i - 1].id}`)
        .toBeLessThanOrEqual(tahap[i - 1].value);
    }
  });

  it('setiap tahap membawa kalimat asal angkanya', () => {
    jetFunnel(POP, 0, {}).forEach(t => {
      expect(t.basis.length, `tahap ${t.id} tanpa basis`).toBeGreaterThan(10);
    });
  });

  it('persentase hanya dicetak bila penyebutnya ada', () => {
    const t = jetFunnel(POP, 0, {});
    expect(t[0].pctOfPrev, 'tahap pertama tak punya "tahap sebelumnya"').toBeNull();
    expect(t[1].pctOfPrev).toBeCloseTo(75, 6);
  });
});

/* ============================================================
   (b) Penyaringan benar-benar menyaring — atas populasi kanonik yang nyata.
   CATATAN JUJUR: gerbang ini HIJAU sejak sebelum perbaikan; mesin skoring
   AMS_FORENSIC.score() memang sudah benar. Ia dipasang sebagai anti-kambuh,
   bukan sebagai bukti bahwa sesuatu diperbaiki.
   ============================================================ */
describe('J1b — kriteria & ambang benar-benar menyaring (populasi kanonik)', () => {
  const semua = AMS_FORENSIC.JET_CRITERIA.map(c => c.id);

  it('menonaktifkan kriteria "round" MENGURANGI jumlah jurnal terpilih', () => {
    const dengan = selectedForTest(AMS_FORENSIC.score(AMS_FORENSIC.JOURNAL_POP, semua), 0);
    const tanpa = selectedForTest(
      AMS_FORENSIC.score(AMS_FORENSIC.JOURNAL_POP, semua.filter(id => id !== 'round')), 0);
    expect(tanpa.length).toBeLessThan(dengan.length);
  });

  it('menaikkan ambang nilai MENGURANGI jumlah jurnal terpilih', () => {
    const skor = AMS_FORENSIC.score(AMS_FORENSIC.JOURNAL_POP, semua);
    expect(selectedForTest(skor, 1_000_000_000).length)
      .toBeLessThan(selectedForTest(skor, 0).length);
  });

  it('tanpa satu pun kriteria aktif, nol jurnal terpilih', () => {
    expect(meetsCriteria(AMS_FORENSIC.score(AMS_FORENSIC.JOURNAL_POP, [])).length).toBe(0);
  });
});

/* ============================================================
   (c) Disposisi tidak tercatat tanpa identitas sesi nyata
   ============================================================ */
describe('J5 — disposisi menolak dicatat tanpa identitas', () => {
  it('view tidak lagi memakai nama pengganti "Auditor"', () => {
    expect(kode().includes("'Auditor'"), 'fallback nama "Auditor" masih ada').toBe(false);
  });

  it('view memakai useCurrentAuditor (identitas sesi W7)', () => {
    expect(kode()).toMatch(/useCurrentAuditor\s*\(/);
  });

  it('actor kosong → state DIKEMBALIKAN apa adanya (bukan dicatat atas nama fallback)', () => {
    const s = emptyState();
    expect(recordDisposition(s, 'J-1', 'clear', '', '09 Mar 2026')).toBe(s);
    expect(recordDisposition(s, 'J-1', 'clear', '   ', '09 Mar 2026')).toBe(s);
    expect(recordNote(s, 'J-1', 'catatan', '', '09 Mar 2026')).toBe(s);
    expect(Object.keys(s.tested)).toEqual([]);
  });

  it('actor ada → disposisi tercatat dengan by & at', () => {
    const s = recordDisposition(emptyState(), 'J-1', 'exception', 'Anindya Pramesti', '09 Mar 2026');
    expect(s.tested['J-1']).toEqual({ status: 'exception', by: 'Anindya Pramesti', at: '09 Mar 2026' });
  });

  it('canRecord menolak string kosong/spasi dan menerima nama', () => {
    expect(canRecord('')).toBe(false);
    expect(canRecord('  ')).toBe(false);
    expect(canRecord(undefined)).toBe(false);
    expect(canRecord('Ari Widodo')).toBe(true);
  });
});

/* ============================================================
   (d) Tanggal disposisi mengikuti klok SSOT AMS.TODAY
   ============================================================ */
describe('J4 — jejak waktu dari klok SSOT, bukan jam sistem', () => {
  it('view memberi makan jetStampDate dengan AMS.TODAY', () => {
    expect(kode()).toMatch(/jetStampDate\(\s*AMS\.TODAY\s*\)/);
  });

  it('nol new Date() di view_jet.tsx', () => {
    const pemakaian = [...kode().matchAll(/new\s+Date\s*\(/g)].map(m => m[0]);
    expect(pemakaian, `jam sistem masih dipakai ${pemakaian.length}×`).toEqual([]);
  });

  it('memajukan klok memajukan tanggal disposisi', () => {
    expect(jetStampDate('2026-03-09')).toBe('09 Mar 2026');
    expect(jetStampDate('2027-01-15')).toBe('15 Jan 2027');
    expect(jetStampDate('2027-01-15')).not.toBe(jetStampDate(AMS.TODAY));
  });

  it('stempel adalah fungsi MURNI dari klok yang diberikan', () => {
    expect(jetStampDate(AMS.TODAY)).toBe(jetStampDate(AMS.TODAY));
    expect(jetStampDate('bukan-tanggal')).toBe('');
  });
});

/* ============================================================
   (e) Gerbang sumber — konvensi CLAUDE.md §3.7 / §5 pada view_jet.tsx
   ============================================================ */
describe('J2/J3/J6 — konvensi sumber view_jet.tsx', () => {
  it('nol <Btn> tanpa onClick (tombol mati: aktifkan atau hapus)', () => {
    const mati = kode().split('\n')
      .filter(l => l.includes('<Btn') && !/onClick=/.test(l))
      .map(l => l.trim().slice(0, 80));
    expect(mati, `tombol tanpa handler: ${mati.join(' | ')}`).toEqual([]);
  });

  it('nol kontrol palsu <label|span|div onClick>', () => {
    const palsu = kode().split('\n')
      .filter(l => /<(label|span|div)\b/.test(l) && /onClick=/.test(l))
      .map(l => l.trim().slice(0, 80));
    expect(palsu, `kontrol palsu: ${palsu.join(' | ')}`).toEqual([]);
  });

  it('sakelar kriteria memakai kontrol native <Switch>', () => {
    expect(kode()).toMatch(/<Switch\b/);
  });

  it('nol warna heksadesimal', () => {
    const hex = [...new Set([...kode().matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map(m => m[0]))];
    expect(hex, `hex tersisa: ${hex.join(', ')}`).toEqual([]);
  });

  it('nol rgba() mentah', () => {
    const rgba = [...kode().matchAll(/rgba?\([^)]*\)/g)].map(m => m[0]);
    expect(rgba, `rgba mentah: ${rgba.join(', ')}`).toEqual([]);
  });
});
