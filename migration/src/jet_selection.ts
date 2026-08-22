/* ============================================================
   Asseris — derivasi murni Journal Entry Testing (SA 240 ¶32)
   ------------------------------------------------------------
   Modul ini memegang SATU pertanyaan: dari populasi mana jurnal dipilih, dan
   bagaimana pemilihan itu menyempit. Ia sengaja tak mengimpor apa pun dari
   `data*`/`forensic_canon` — populasi diberikan sebagai argumen — supaya
   setiap angka yang muncul di layar dapat diuji dengan populasi lain, termasuk
   populasi KOSONG. Itulah bedanya nilai turunan dari nilai karangan: yang
   turunan ikut bergerak, yang karangan tidak.

   Latar: sebelum ini corong di `view_jet.tsx` memakai dua literal populasi
   (identik untuk setiap perikatan) plus satu penambah tetap pada jumlah jurnal
   ter-flag, lalu mencetak "% dari tahap sebelumnya" di atasnya. Angka populasi
   adalah dasar kesimpulan cakupan pengujian — bukan hiasan tata letak — jadi
   ia diturunkan dari data, atau tidak ditampilkan sama sekali.

   LINGKUP YANG TIDAK DITUTUP DI SINI: populasi jurnal ENTITAS (buku besar
   klien) belum ada di aplikasi. Corong ini menghitung penyaringan atas populasi
   yang benar-benar dimuat ke JET, dan view WAJIB menyatakan perbedaan itu di
   tempat pengguna membacanya. Lihat docs/usulan-J-jet-impor-gl-populasi.md.
   ============================================================ */

export type JetStatus = 'clear' | 'exception';
export type JetTest = { status: JetStatus; note?: string; by?: string; at?: string };
export type JetState = { activeCrit: string[]; minAmt: number; tested: Record<string, JetTest> };

/* Bentuk minimum satu jurnal yang sudah diskor `AMS_FORENSIC.score()`.
   Sengaja struktural: fungsi di bawah tak perlu tahu field forensik lain. */
export type JetScored = { id: string; amount: number; score: number };

export type JetStageId = 'loaded' | 'criteria' | 'selected' | 'disposed';

export type JetStage = {
  id: JetStageId;
  label: string;
  /** Kalimat asal angka. Setiap nilai di layar harus bisa dijelaskan. */
  basis: string;
  value: number;
  /** null pada tahap pertama DAN bila penyebutnya nol — persentase tak dicetak
      di atas angka yang tidak ada. */
  pctOfPrev: number | null;
};

/* ---- penyaringan ------------------------------------------------------- */

/** Jurnal yang memenuhi ≥1 kriteria risiko AKTIF (skor > 0). */
export function meetsCriteria<T extends JetScored>(scored: readonly T[]): T[] {
  return (scored || []).filter(j => j.score > 0);
}

/** Jurnal terpilih untuk diuji: memenuhi kriteria DAN ≥ ambang nilai minimum.
    Dua penyaring ini SENGAJA dipisah dari `meetsCriteria` — sebelumnya keduanya
    dihitung sekaligus, sehingga tahap "memenuhi kriteria" dan "dipilih" selalu
    bernilai sama dan efek slider ambang tak pernah terlihat di corong. */
export function selectedForTest<T extends JetScored>(scored: readonly T[], minAmt: number): T[] {
  const floor = Number.isFinite(minAmt) ? minAmt : 0;
  return meetsCriteria(scored).filter(j => j.amount >= floor);
}

/* ---- corong ------------------------------------------------------------ */

function pct(value: number, prev: number): number | null {
  return prev > 0 ? (value / prev) * 100 : null;
}

/**
 * Corong penyaringan. SEMUA nilai turunan dari argumen — populasi kosong
 * menghasilkan corong bernilai nol tanpa satu pun persentase.
 */
export function jetFunnel(
  scored: readonly JetScored[],
  minAmt: number,
  tested: Readonly<Record<string, JetTest>>,
): JetStage[] {
  const pop = scored || [];
  const kriteria = meetsCriteria(pop);
  const terpilih = selectedForTest(pop, minAmt);
  const map = tested || {};
  const didisposisi = terpilih.filter(j => {
    const t = map[j.id];
    return !!(t && t.status);
  });

  const nilai: Array<{ id: JetStageId; label: string; basis: string; value: number }> = [
    {
      id: 'loaded', label: 'Jurnal Dimuat', value: pop.length,
      basis: 'Baris jurnal yang benar-benar dimuat ke JET (sub-buku kanonik bersama). BUKAN populasi jurnal entitas.',
    },
    {
      id: 'criteria', label: 'Memenuhi Kriteria', value: kriteria.length,
      basis: 'Memenuhi sedikitnya satu kriteria risiko yang sedang aktif (skor > 0).',
    },
    {
      id: 'selected', label: 'Dipilih untuk Diuji', value: terpilih.length,
      basis: 'Memenuhi kriteria DAN nilainya mencapai ambang nilai minimum.',
    },
    {
      id: 'disposed', label: 'Sudah Didisposisi', value: didisposisi.length,
      basis: 'Jurnal terpilih yang sudah disimpulkan Clear atau Eksepsi oleh auditor.',
    },
  ];

  return nilai.map((s, i) => ({
    ...s,
    pctOfPrev: i === 0 ? null : pct(s.value, nilai[i - 1].value),
  }));
}

/* ---- jejak: siapa & kapan ---------------------------------------------- */

/** Disposisi adalah kertas kerja SA 230; tanpa nama penyusun ia tak sah dicatat. */
export function canRecord(actor: string | undefined | null): boolean {
  return typeof actor === 'string' && actor.trim().length > 0;
}

const ID_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

/**
 * Stempel tanggal disposisi dari klok SSOT (`AMS.TODAY`, K-02) — bukan jam
 * sistem. Diformat tangan alih-alih lewat `toLocaleDateString`, supaya nilainya
 * tak bergeser satu hari mengikuti zona waktu mesin yang menjalankannya
 * (`new Date('2026-03-09')` = tengah malam UTC).
 */
export function jetStampDate(todayIso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(todayIso || '');
  if (!m) return '';
  const bulan = ID_MONTHS[Number(m[2]) - 1];
  return bulan ? `${m[3]} ${bulan} ${m[1]}` : '';
}

/** Catat kesimpulan pengujian satu jurnal. Tanpa identitas → state UTUH. */
export function recordDisposition(
  state: JetState, id: string, status: JetStatus, actor: string, at: string,
): JetState {
  if (!id || !canRecord(actor)) return state;
  const prev = state.tested[id];
  return {
    ...state,
    tested: { ...state.tested, [id]: { ...(prev || {}), status, by: actor.trim(), at } },
  };
}

/** Catat tindak lanjut jurnal anomali. Tanpa identitas → state UTUH. */
export function recordNote(
  state: JetState, id: string, note: string, actor: string, at: string,
): JetState {
  if (!id || !canRecord(actor)) return state;
  const prev = state.tested[id];
  return {
    ...state,
    tested: {
      ...state.tested,
      [id]: { ...(prev || { status: 'exception' as JetStatus }), note, by: actor.trim(), at },
    },
  };
}
