/* ============================================================
   My Tasks — derivasi tugas sistem. Modul `tasks` punya NOL uji sebelum berkas ini.

   Empat invarian yang dipaku, dan apa yang dulu melanggarnya:

   (a) IDENTITAS TUGAS TETAP. Id tugas adalah kunci ke `mt.meta` (status selesai,
       bintang, catatan, subtugas). Id tenggat dulu `'dl-' + indeksArray`, sehingga
       menyisipkan/mengurutkan-ulang `DEADLINES` memindahkan pekerjaan seorang auditor
       ke tenggat LAIN tanpa suara. Uji di bawah mengurutkan ulang masukan dan menuntut
       id-nya tak bergerak — MERAH pada kode sebelum 2026-08-20.

   (b) TIDAK ADA PEMOTONGAN SENYAP. `deadlines.slice(0, 4)` membuat modul bernama
       "My Tasks" berhenti menghitung pada baris kelima tanpa memberi tahu siapa pun.
       Uji memberi lima tenggat dan menuntut lima keluar.

   (c) KEPEMILIKAN DARI IDENTITAS SESI. Tugas "milik saya" harus ditentukan oleh
       argumen `me` (nama-singkat auditor sesi), bukan nama literal di dalam kode.

   (d) BEBAS EFEK SAMPING. Derivasi tak membaca `window`, `localStorage`, atau jam
       sistem — itulah yang membuat berkas ini bisa dijalankan di `node` sama sekali.

   Isolasi tugas PRIBADI (M1) TIDAK diuji di sini: ia bukan properti derivasi melainkan
   properti LINGKUP PERSISTENSI. Gerbangnya ada dua, di tempat yang menegakkannya —
   `persist_scope.test.ts` (kunci `mt.*` berlingkup pengguna) dan
   `server/src/__tests__/mytasks_scope.test.ts` (server menolak baca firma & lintas-pemilik).
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { mtSystemTasks, deadlineTaskId, type MtSources } from './mytasks_derive';
import type { DeadlineRow, WorkpaperRow } from './ams_types';

const ME = 'Dimas R.';
const OTHER = 'Fajar N.';

const dl = (id: string, client: string, task: string, days: number, sev: string): DeadlineRow =>
  ({ id, client, task, date: '01 Jan', days, sev });

const wp = (ref: string, status: string, preparer: string, reviewer: string): WorkpaperRow =>
  ({ ref, title: 'Lead ' + ref, status, preparer, reviewer });

const EMPTY: MtSources = { reviewNotes: [], wpNotes: [], aje: [], workpapers: [], deadlines: [] };
const src = (patch: Partial<MtSources>): MtSources => ({ ...EMPTY, ...patch });

const DEADLINES: DeadlineRow[] = [
  dl('DL-01', 'PT Klien A', 'EQR & tanda tangan opini', 6, 'red'),
  dl('DL-02', 'PT Klien B', 'Selesai fieldwork', 22, 'amber'),
  dl('DL-03', 'PT Klien C', 'Walkthrough pengendalian', 24, 'gray'),
  dl('DL-04', 'PT Klien D', 'Konfirmasi piutang', 52, 'gray'),
];

describe('(a) identitas tugas tenggat tidak bergantung posisi', () => {
  it('mengurutkan ulang masukan TIDAK mengubah id tugas mana pun', () => {
    const idFor = (rows: DeadlineRow[], client: string) =>
      mtSystemTasks(src({ deadlines: rows }), ME).find((t) => t.label.endsWith(client))?.id;
    const reversed = [...DEADLINES].reverse();
    for (const d of DEADLINES) {
      expect(idFor(reversed, d.client)).toBe(idFor(DEADLINES, d.client));
    }
  });

  it('menyisipkan tenggat baru di DEPAN tidak memindahkan id tenggat lama', () => {
    const grown = [dl('DL-99', 'PT Klien Baru', 'Rapat pembukaan', 2, 'gray'), ...DEADLINES];
    const before = mtSystemTasks(src({ deadlines: DEADLINES }), ME);
    const after = mtSystemTasks(src({ deadlines: grown }), ME);
    for (const t of before) {
      const same = after.find((x) => x.label === t.label);
      expect(same?.id).toBe(t.id);
    }
  });

  it('menghapus tenggat pertama tidak menggeser id sisanya', () => {
    const shrunk = DEADLINES.slice(1);
    const before = mtSystemTasks(src({ deadlines: DEADLINES }), ME);
    const after = mtSystemTasks(src({ deadlines: shrunk }), ME);
    for (const t of after) {
      expect(before.find((x) => x.label === t.label)?.id).toBe(t.id);
    }
  });

  it('dua tenggat berbeda tidak pernah berbagi id (satu entri mt.meta = satu tugas)', () => {
    const ids = mtSystemTasks(src({ deadlines: DEADLINES }), ME).map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('id diturunkan dari DEADLINES[].id', () => {
    expect(deadlineTaskId({ id: 'DL-07' })).toBe('dl-DL-07');
  });
});

describe('(b) tidak ada pemotongan senyap', () => {
  it('lima tenggat masuk → lima tugas keluar', () => {
    const five = [...DEADLINES, dl('DL-05', 'PT Klien E', 'Stock opname', 9, 'amber')];
    const out = mtSystemTasks(src({ deadlines: five }), ME).filter((t) => t.src === 'Deadline');
    expect(out).toHaveLength(5);
    expect(out.map((t) => t.id)).toContain('dl-DL-05');
  });

  it('sepuluh tenggat masuk → sepuluh tugas keluar (tak ada batas tersembunyi)', () => {
    const many = Array.from({ length: 10 }, (_, i) =>
      dl('DL-' + String(i + 1).padStart(2, '0'), 'PT Klien ' + i, 'Tugas ' + i, i, 'gray'));
    expect(mtSystemTasks(src({ deadlines: many }), ME).filter((t) => t.src === 'Deadline')).toHaveLength(10);
  });
});

describe('(c) kepemilikan dari identitas sesi', () => {
  const NOTES = [
    { id: 'RN-01', text: 'Tautkan AJE-01', module: 'wtb', priority: 'high', status: 'open', to: ME, author: OTHER },
    { id: 'RN-02', text: 'Dokumentasikan ECL', module: 'icfr', priority: 'medium', status: 'open', to: OTHER, author: ME },
    { id: 'RN-03', text: 'Sudah dijawab', module: 'wtb', priority: 'low', status: 'resolved', to: ME, author: OTHER },
  ];

  it('hanya catatan reviu TERBUKA yang dialamatkan ke saya', () => {
    expect(mtSystemTasks(src({ reviewNotes: NOTES }), ME).map((t) => t.id)).toEqual(['rn-RN-01']);
  });

  it('auditor LAIN memperoleh daftar yang berbeda dari masukan yang sama', () => {
    // RN-02 dialamatkan ke OTHER; RN-01 tidak. Masukan identik, keluaran berbeda —
    // itulah bukti filternya memakai `me`, bukan konstanta di dalam modul.
    expect(mtSystemTasks(src({ reviewNotes: NOTES }), OTHER).map((t) => t.id)).toEqual(['rn-RN-02']);
  });

  it('penugasan KK memisahkan peran penyusun dan pereviu', () => {
    const wps = [
      wp('A-1', 'In Progress', ME, OTHER),      // saya penyusun → Siapkan WP
      wp('B-2', 'In Review', OTHER, ME),        // saya pereviu → Reviu WP
      wp('C-3', 'Reviewed', ME, OTHER),         // tuntas → bukan tugas siapa pun
      wp('D-4', 'In Progress', OTHER, OTHER),   // bukan urusan saya
    ];
    const mine = mtSystemTasks(src({ workpapers: wps }), ME);
    expect(mine.map((t) => t.id).sort()).toEqual(['wp-prep-A-1', 'wp-rev-B-2']);
    expect(mine.find((t) => t.id === 'wp-rev-B-2')?.priority).toBe('high');
  });

  it('catatan WP milik saya sebagai penerima ATAU penulis', () => {
    const wpNotes = [
      { id: 'N1', text: 'Cek cut-off', wpRef: 'C-1', priority: 'high', status: 'open', to: ME, author: OTHER },
      { id: 'N2', text: 'Tindak lanjut saya', wpRef: 'C-2', priority: 'low', status: 'open', to: OTHER, author: ME },
      { id: 'N3', text: 'Bukan urusan saya', wpRef: 'C-3', priority: 'low', status: 'open', to: OTHER, author: OTHER },
    ];
    expect(mtSystemTasks(src({ wpNotes }), ME).map((t) => t.id).sort()).toEqual(['wn-N1', 'wn-N2']);
  });

  it('tak ada nama orang yang tertanam: masukan tanpa `me` yang cocok → nol tugas kepemilikan', () => {
    const all = src({
      reviewNotes: NOTES,
      workpapers: [wp('A-1', 'In Progress', ME, OTHER)],
      wpNotes: [{ id: 'N1', text: 'x', wpRef: 'C-1', priority: 'low', status: 'open', to: ME, author: ME }],
    });
    expect(mtSystemTasks(all, 'Nama Yang Tak Ada')).toHaveLength(0);
  });
});

describe('(d) derivasi murni & bentuk keluaran', () => {
  it('masukan kosong → daftar kosong, bukan lemparan', () => {
    expect(mtSystemTasks(EMPTY, ME)).toEqual([]);
  });

  it('masukan tidak dimutasi', () => {
    const rows = [...DEADLINES];
    const snapshot = JSON.stringify(rows);
    mtSystemTasks(src({ deadlines: rows }), ME);
    expect(JSON.stringify(rows)).toBe(snapshot);
  });

  it('AJE hanya yang berstatus Proposed, dan mulai sebagai "dikerjakan"', () => {
    const aje = [
      { id: 'AJE-01', desc: 'Reklas persediaan', status: 'Proposed' },
      { id: 'AJE-02', desc: 'Sudah diposting', status: 'Posted' },
    ];
    const out = mtSystemTasks(src({ aje }), ME);
    expect(out.map((t) => t.id)).toEqual(['aje-AJE-01']);
    expect(out[0].defaultStatus).toBe('doing');
  });

  it('severity tenggat memetakan ke prioritas (red→high, amber→medium, sisanya low)', () => {
    const out = mtSystemTasks(src({ deadlines: DEADLINES }), ME);
    expect(out.map((t) => t.priority)).toEqual(['high', 'medium', 'low', 'low']);
  });

  it('prioritas catatan yang tak dikenal jatuh ke medium, bukan bocor apa adanya', () => {
    const reviewNotes = [
      { id: 'RN-X', text: 'x', module: 'wtb', priority: 'URGENT!!', status: 'open', to: ME, author: OTHER },
    ];
    const out = mtSystemTasks(src({ reviewNotes }), ME);
    expect(out[0].priority).toBe('medium');
    expect(out[0].dueOffset).toBe(3); // offset default, bukan NaN
  });
});
