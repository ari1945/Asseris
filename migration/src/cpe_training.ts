/* ============================================================
   Asseris — CPE dari Pelatihan (jembatan #1/#2 gap matriks FIRM)
   ------------------------------------------------------------
   Fungsi MURNI (tanpa state/side-effect): mengubah kehadiran
   pelatihan yang DIKONFIRMASI admin/HR (store `trainingAttendance.v1`,
   firm-scope, tulis butuh ENGAGEMENT_MANAGE) menjadi entri kredit SKP
   per pegawai — sehingga CPE/PPL Tracker ter-update otomatis dari
   pelatihan diikuti (tak lagi input manual terpisah).

   Konsumen: CPETracker (view_people) & pplOf (data_licensing) memanggil
   fungsi yang SAMA → satu sumber kebenaran untuk kredit-dari-pelatihan.
   Entri berformat identik dgn CPE_LOG/cpeExtra ({t,type,skp,date}) plus
   penanda sumber `src:'training'` agar UI bisa melabeli asal kredit.
   ============================================================ */

import type { SkpEntry } from './canon_ppl';

export interface TrainingCourse {
  id: string;
  title: string;
  mode: string;   // 'Terstruktur' | 'Tidak Terstruktur'
  skp: number;
  date: string;
  /** Materi wajib PMK 186 Ps. 37 (canon_ppl.SkpTopic). Tanpa ini kredit dari
   *  pelatihan akan MEMBATALKAN keterlacakan materi seluruh pegawai — lihat
   *  `pplFromEntries`, yang menuntut SELURUH entri terstruktur terklasifikasi. */
  topic?: string;
}
/* { [trainingId]: { [empId]: { confirmed, by, at } } } */
export type TrainingAttendance = Record<string, Record<string, { confirmed?: boolean; by?: string; at?: string } | undefined>>;

/* Entri ini DIKONSUMSI `canon_ppl.pplFromEntries` bersama CPE_LOG, jadi ia
   memang sebuah `SkpEntry` — dinyatakan lewat `extends` agar kompilator yang
   menjaganya, bukan kebetulan bentuk. */
export interface CpeEntry extends SkpEntry {
  t: string;
  type: string;
  skp: number;
  date: string;
  topic?: string;
  src?: string;        // 'training' untuk kredit otomatis dari Pelatihan
  trainingId?: string;
}

/* Peta empId → daftar entri SKP dari pelatihan yang kehadirannya dikonfirmasi. */
export function cpeFromTraining(
  catalog: TrainingCourse[] | undefined,
  attendance: TrainingAttendance | undefined,
): Record<string, CpeEntry[]> {
  const out: Record<string, CpeEntry[]> = {};
  const cat = catalog || [];
  const att = attendance || {};
  for (const tr of cat) {
    const conf = att[tr.id] || {};
    for (const empId of Object.keys(conf)) {
      const rec = conf[empId];
      if (!rec || !rec.confirmed) continue;
      if (!out[empId]) out[empId] = [];
      out[empId].push({ t: tr.title, type: tr.mode, skp: tr.skp, date: tr.date, topic: tr.topic, src: 'training', trainingId: tr.id });
    }
  }
  return out;
}

/* ============================================================
   KOMPOSISI REGISTER SKP — satu urutan, satu tempat.
   ------------------------------------------------------------
   SKP seorang pegawai tersebar di TIGA register:

     cpeExtra    entri yang dicatat manual lewat formulir "Catat SKP"
     training    kredit otomatis dari pelatihan terkonfirmasi (cpeFromTraining)
     cpeLog      register dasar firma (AMS.CPE_LOG)

   Sampai PR ini setiap konsumen merakit ketiganya sendiri — dan "Data Personal
   Saya" merakit hanya DUA (ia tak pernah membaca kredit pelatihan). Angka
   pegawai karenanya dapat berbeda dari angka HR bahkan bila mesinnya sama.

   Satu mesin (`canon_ppl`) tidak cukup bila MASUKAN-nya dirakit berbeda-beda.
   Karena itu komposisinya ada di sini, dan hanya di sini.
   ============================================================ */
export interface SkpSources<T extends SkpEntry = SkpEntry> {
  extra?: Record<string, T[] | undefined> | null;
  training?: Record<string, T[] | undefined> | null;
  base?: Record<string, T[] | undefined> | null;
}

/** Seluruh entri SKP seorang pegawai, dari ketiga register, dalam satu urutan. */
export function skpEntriesOf<T extends SkpEntry = SkpEntry>(
  empId: string,
  src: SkpSources<T> | null | undefined,
): T[] {
  const s = src || {};
  return [
    ...((s.extra && s.extra[empId]) || []),
    ...((s.training && s.training[empId]) || []),
    ...((s.base && s.base[empId]) || []),
  ];
}

/* Jumlah kredit SKP (empId) yang bersumber dari pelatihan terkonfirmasi. */
export function trainingSkpFor(byEmp: Record<string, CpeEntry[]>, empId: string): number {
  return (byEmp[empId] || []).reduce((a, r) => a + (r.skp || 0), 0);
}
