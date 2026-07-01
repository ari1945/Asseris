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

export interface TrainingCourse {
  id: string;
  title: string;
  mode: string;   // 'Terstruktur' | 'Tidak Terstruktur'
  skp: number;
  date: string;
}
/* { [trainingId]: { [empId]: { confirmed, by, at } } } */
export type TrainingAttendance = Record<string, Record<string, { confirmed?: boolean; by?: string; at?: string } | undefined>>;

export interface CpeEntry {
  t: string;
  type: string;
  skp: number;
  date: string;
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
      out[empId].push({ t: tr.title, type: tr.mode, skp: tr.skp, date: tr.date, src: 'training', trainingId: tr.id });
    }
  }
  return out;
}

/* Jumlah kredit SKP (empId) yang bersumber dari pelatihan terkonfirmasi. */
export function trainingSkpFor(byEmp: Record<string, CpeEntry[]>, empId: string): number {
  return (byEmp[empId] || []).reduce((a, r) => a + (r.skp || 0), 0);
}
