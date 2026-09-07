/* ============================================================
   Asseris — My Tasks: derivasi tugas sistem (MURNI)
   ------------------------------------------------------------
   Diekstrak dari `view_mytasks_parts.tsx` (2026-08-20). Modul `tasks` tak punya satu
   pun uji sebelum ini — bukan karena logikanya sepele, melainkan karena logikanya
   bersembunyi di dalam berkas TSX yang tak bisa dijalankan di `node` tanpa merender
   React. Yang di sini MURNI: masukan biasa masuk, daftar tugas keluar, tanpa hook,
   tanpa `window`, tanpa tanggal "sekarang". Penanggalan (dueOffset → tanggal jatuh
   tempo) tetap di lapisan React karena ia bergantung pada klok SSOT `AMS.TODAY`.

   Kontrak identitas (yang paling mudah dilanggar diam-diam):
     · `me` = nama-singkat auditor sesi ('Nama X.'), BUKAN nama literal. Modul ini
       tak boleh memuat satu pun nama orang.
     · id tugas adalah KUNCI PERSISTEN ke `mt.meta` (status selesai, bintang, catatan,
       subtugas). Karena itu setiap id di sini diturunkan dari IDENTITAS objeknya
       (id catatan, ref KK, id tenggat) — tak pernah dari posisinya di array.
   ============================================================ */
import type { DeadlineRow, WorkpaperRow } from './ams_types';

export type TaskPriority = 'high' | 'medium' | 'low';
export type TaskStatus = 'todo' | 'doing' | 'done';

export interface SubTask { id: string; t: string; done: boolean }

export interface SystemTask {
  /** kunci persisten ke `mt.meta` — diturunkan dari identitas, bukan indeks */
  id: string;
  src: string;
  label: string;
  route: string;
  priority: TaskPriority;
  dueOffset: number;
  est: number;
  from?: string;
  wpRef?: string;
  defaultStatus?: TaskStatus;
  sub?: SubTask[];
}

/* Bentuk MINIMAL yang benar-benar dibaca derivasi ini. Sengaja struktural (bukan
   mengimpor tipe penuh ReviewNote): sumber `wpNotes` datang dari `collectWpNotes`
   yang mengembalikan baris rakitan, dan menuntut bentuk penuh di sini hanya akan
   memaksa cast di sisi pemanggil tanpa menambah keamanan apa pun. */
export interface MtReviewNote {
  id: string; text: string; module: string;
  priority: string; status: string; to: string; author: string;
}
export interface MtWpNote {
  id: string; text: string; wpRef: string;
  priority: string; status: string; to?: string; author?: string;
}
export interface MtAje { id: string; desc: string; status: string }

export interface MtSources {
  /** catatan reviu perikatan AKTIF (P5 Fase 2) */
  reviewNotes: MtReviewNote[];
  /** catatan yang dipaku ke kertas kerja — hasil `collectWpNotes(wpState)` */
  wpNotes: MtWpNote[];
  aje: MtAje[];
  workpapers: WorkpaperRow[];
  deadlines: DeadlineRow[];
}

const RN_DUE_OFFSET: Record<string, number> = { high: 1, medium: 3, low: 6 };

/** Prioritas dari data bebas-bentuk → salah satu dari tiga nilai yang dikenali UI. */
function asPriority(v: unknown): TaskPriority {
  return v === 'high' || v === 'medium' || v === 'low' ? v : 'medium';
}

/**
 * Id tugas untuk sebuah tenggat.
 *
 * DIPISAH sebagai fungsi bernama karena inilah titik cacatnya: sebelum 2026-08-20 id
 * ini adalah `'dl-' + indeksArray`. Karena id adalah kunci `mt.meta`, menyisipkan atau
 * mengurutkan ulang satu baris `DEADLINES` memindahkan status "selesai", catatan, dan
 * subtugas seorang auditor ke tenggat LAIN — tanpa satu pun tanda di layar.
 */
export function deadlineTaskId(d: Pick<DeadlineRow, 'id'>): string {
  return 'dl-' + d.id;
}

/**
 * Tugas sistem milik `me` dari sumber perikatan aktif.
 *
 * URUTAN sumber dipertahankan persis seperti versi TSX-nya (Review Note → Catatan WP →
 * AJE → Siapkan WP → Reviu WP → Deadline) karena urutan itu terlihat pengguna pada
 * kelompok yang tak punya kunci urut lain.
 */
export function mtSystemTasks(src: MtSources, me: string): SystemTask[] {
  const out: SystemTask[] = [];

  for (const n of src.reviewNotes) {
    if (n.status !== 'open' || n.to !== me) continue;
    out.push({
      id: 'rn-' + n.id, src: 'Review Note', label: n.text, route: n.module,
      priority: asPriority(n.priority),
      dueOffset: RN_DUE_OFFSET[n.priority] ?? 3, est: 1.5, from: n.author,
      sub: [
        { id: 's1', t: 'Tinjau catatan & konteks', done: false },
        { id: 's2', t: 'Dokumentasikan tanggapan', done: false },
        { id: 's3', t: 'Tandai selesai ke reviewer', done: false },
      ],
    });
  }

  for (const n of src.wpNotes) {
    if (n.status !== 'open' || (n.to !== me && n.author !== me)) continue;
    out.push({
      id: 'wn-' + n.id, src: 'Catatan WP', label: n.text, route: 'workpapers', wpRef: n.wpRef,
      priority: asPriority(n.priority), dueOffset: 2, est: 2, from: n.author,
      sub: [
        { id: 's1', t: 'Buka kertas kerja ' + n.wpRef, done: false },
        { id: 's2', t: 'Lakukan tindak lanjut', done: false },
      ],
    });
  }

  for (const a of src.aje) {
    if (a.status !== 'Proposed') continue;
    out.push({
      id: 'aje-' + a.id, src: 'AJE', label: 'Tindak lanjuti ' + a.id + ': ' + a.desc, route: 'aje',
      priority: 'medium', dueOffset: 4, est: 2, defaultStatus: 'doing',
      sub: [
        { id: 's1', t: 'Validasi dasar jurnal', done: false },
        { id: 's2', t: 'Diskusi dengan klien', done: false },
        { id: 's3', t: 'Posting / tolak', done: false },
      ],
    });
  }

  /* Penugasan kertas kerja per ORANG (bukan "semua WP belum selesai"):
     · Siapkan WP → saya preparer & WP belum tuntas direviu
     · Reviu WP   → saya reviewer & WP sedang menunggu reviu saya */
  for (const w of src.workpapers) {
    if (w.preparer !== me || w.status === 'Reviewed') continue;
    out.push({
      id: 'wp-prep-' + w.ref, src: 'Siapkan WP', label: 'Siapkan WP ' + w.ref + ' — ' + w.title,
      route: 'workpapers', wpRef: w.ref,
      priority: w.status === 'In Review' ? 'low' : 'medium', dueOffset: 5, est: 4,
      defaultStatus: w.status === 'In Progress' ? 'doing' : 'todo',
      sub: [
        { id: 's1', t: 'Lengkapi kertas kerja & bukti', done: false },
        { id: 's2', t: 'Tautkan referensi silang', done: false },
        { id: 's3', t: 'Ajukan untuk reviu', done: false },
      ],
    });
  }
  for (const w of src.workpapers) {
    if (w.reviewer !== me || w.status !== 'In Review') continue;
    out.push({
      id: 'wp-rev-' + w.ref, src: 'Reviu WP', label: 'Reviu WP ' + w.ref + ' — ' + w.title,
      route: 'workpapers', wpRef: w.ref,
      priority: 'high', dueOffset: 3, est: 2, defaultStatus: 'doing',
      sub: [
        { id: 's1', t: 'Telaah kesimpulan & kecukupan bukti', done: false },
        { id: 's2', t: 'Angkat catatan reviu bila perlu', done: false },
        { id: 's3', t: 'Tandatangani / kliring WP ' + w.ref, done: false },
      ],
    });
  }

  /* SETIAP tenggat, bukan empat teratas. Batas `.slice(0, 4)` yang dulu ada di sini
     tak pernah diucapkan di layar: modul bernama "My Tasks" dengan KPI "Tugas Aktif"
     diam-diam berhenti menghitung pada baris kelima. Karena `DEADLINES` kebetulan
     berisi tepat empat baris, pemotongan itu tak akan terlihat sampai seseorang
     menambah tenggat kelima dan bertanya-tanya ke mana perginya. */
  for (const d of src.deadlines) {
    out.push({
      id: deadlineTaskId(d), src: 'Deadline', label: d.task + ' — ' + d.client, route: 'cockpit',
      priority: d.sev === 'red' ? 'high' : d.sev === 'amber' ? 'medium' : 'low',
      dueOffset: d.days, est: 3,
    });
  }

  return out;
}
