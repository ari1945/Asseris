/* ============================================================
   Asseris — Registry data referensi regulatori (berkunci masa berlaku)
   PRD `docs/prd-regulatory-reference-annual.md` · PR-1 · SC-1 · SC-2.
   ------------------------------------------------------------
   Aplikasi ini memuat data yang berubah menurut KALENDER, bukan menurut
   kode: kalender hari libur (SKB 3 Menteri, tahunan), batas upah & tarif
   BPJS (tahunan), tabel TER PPh 21 dan PTKP (saat PMK berubah). Sebagian
   menggerakkan perhitungan yang mengenai uang orang.

   Sebelum berkas ini ada, tiga perilaku berbeda hidup berdampingan untuk
   satu kelas masalah yang sama:

     kalender libur  →  `holidayCoverage()` menolak berpura-pura  ✅
     tabel TER       →  `verified: false`, tetapi TANPA dimensi tahun  ⚠
     BPJS            →  tak ada apa pun; hanya label `period: 'Maret 2026'`
                        yang tak pernah dipakai memilih tarifnya  ❌

   Yang ketiga adalah yang berbahaya: batas upah yang kedaluwarsa tetap
   menghasilkan angka, tampil di slip gaji pegawai, dan tak memberi satu
   pun tanda bahwa dasarnya berasal dari tahun yang salah. Ia tidak salah
   sejak awal — ia MEMBUSUK MENURUT JADWAL.

   Aturan berkas ini:

     1. Tak ada "yang terdekat". Set yang tidak mencakup tanggal hitung
        BUKAN jawaban yang mendekati; ia bukan jawaban.
     2. Yang menyangkut uang MEMBLOKIR (`enforcement: 'block'`); yang tidak
        cukup memperingatkan. Slip gaji yang salah lebih mahal daripada
        slip gaji yang belum dapat dihitung.
     3. Belum terverifikasi ≠ tak tercakup. Yang pertama tetap menghitung
        dengan penanda (itu keadaan tabel TER hari ini, dan mencabutnya akan
        menggeser angka tanpa alasan); yang kedua tidak.

   Fungsi MURNI: tanggal hitung DISUNTIKKAN, tak pernah dibaca dari klok.
   ============================================================ */

/* ------------------------------------------------------------------
   1. Bentuk
   ------------------------------------------------------------------ */

/** Dari mana isi sebuah set berasal, dan apakah ia sudah dicocokkan. */
export interface RegRefProvenance {
  /** Dasar hukum — ditampilkan berdampingan dengan angkanya. */
  basis: string;
  /** Dokumen yang dicocokkan baris-per-baris. Kosong = belum ada. */
  sourceDoc: string;
  /** false = isinya BELUM dicocokkan dengan `sourceDoc`. */
  verified: boolean;
  /** Siapa yang mencocokkan (nama/empId). */
  verifiedBy?: string;
  /** Kapan dicocokkan, 'YYYY-MM-DD'. */
  verifiedAt?: string;
  /** Bila belum terverifikasi: APA yang belum. Wajib diisi bila `verified` false. */
  note: string;
}

/** Satu set nilai yang berlaku pada rentang tanggal tertentu. */
export interface RegRefSet<T> extends RegRefProvenance {
  /** 'YYYY-MM-DD' — inklusif. */
  effectiveFrom: string;
  /** 'YYYY-MM-DD' — inklusif. `null` = masih berlaku sampai dicabut. */
  effectiveTo: string | null;
  value: T;
}

/** `block` untuk data yang menggerakkan uang; `warn` untuk yang tidak. */
export type RegRefEnforcement = 'block' | 'warn';

export type RegRefStatus =
  /** Ada set yang mencakup tanggalnya, dan isinya sudah dicocokkan. */
  | 'ok'
  /** Ada set yang mencakup, tetapi isinya belum dicocokkan dengan sumber. */
  | 'unverified'
  /** Tak ada set yang mencakup tanggal itu. */
  | 'no-coverage'
  /** Tanggal yang diminta tak dapat dibaca. */
  | 'bad-date';

export interface RegRefLookup<T> {
  status: RegRefStatus;
  /** `null` bila tak tercakup — TIDAK PERNAH set tahun lain. */
  value: T | null;
  set: RegRefSet<T> | null;
  /** Konsumen WAJIB menolak menghitung bila true. */
  blocked: boolean;
  /** Alasan yang dapat dibaca manusia; kosong bila `ok`. */
  note: string;
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Perbandingan 'YYYY-MM-DD' aman secara leksikografis — tanpa `Date`, tanpa zona waktu. */
export function isIsoDate(v: unknown): v is string {
  return typeof v === 'string' && ISO.test(v);
}

/* ------------------------------------------------------------------
   2. Pencarian
   ------------------------------------------------------------------ */

export interface RegRefOptions {
  /** Nama data untuk pesan — mis. 'Tarif & batas upah BPJS'. */
  label: string;
  enforcement: RegRefEnforcement;
}

function covers<T>(s: RegRefSet<T>, date: string): boolean {
  if (!isIsoDate(s.effectiveFrom)) return false;
  if (s.effectiveFrom > date) return false;
  if (s.effectiveTo == null) return true;
  return isIsoDate(s.effectiveTo) && s.effectiveTo >= date;
}

/**
 * Set yang berlaku pada `date`, atau penolakan yang menyebutkan alasannya.
 *
 * Bila lebih dari satu set mencakup tanggal yang sama, yang `effectiveFrom`-nya
 * PALING BARU dipakai — tetapi tumpang tindih itu sendiri adalah cacat data yang
 * dilaporkan `regrefIssues()`; ini hanya perilaku yang dapat diprediksi, bukan izin.
 */
export function regrefFor<T>(
  sets: readonly RegRefSet<T>[] | undefined | null,
  date: string,
  opts: RegRefOptions,
): RegRefLookup<T> {
  const blockIt = opts.enforcement === 'block';
  if (!isIsoDate(date)) {
    return {
      status: 'bad-date', value: null, set: null, blocked: blockIt,
      note: `Tanggal '${String(date)}' tak dapat dibaca, sehingga ${opts.label} tak dapat dipilih.`,
    };
  }
  let hit: RegRefSet<T> | null = null;
  for (const s of sets || []) {
    if (!s || !covers(s, date)) continue;
    if (!hit || s.effectiveFrom > hit.effectiveFrom) hit = s;
  }
  if (!hit) {
    return {
      status: 'no-coverage', value: null, set: null, blocked: blockIt,
      note: `${opts.label} untuk ${date} belum ada di registry. `
        + (blockIt
          ? 'Perhitungan DITOLAK agar tidak diam-diam memakai dasar tahun lain.'
          : 'Perhitungan berjalan tanpa data ini, dan hasilnya karena itu tidak lengkap.'),
    };
  }
  if (!hit.verified) {
    return {
      status: 'unverified', value: hit.value, set: hit, blocked: false,
      note: hit.note || `${opts.label} yang berlaku belum dicocokkan dengan sumber resminya.`,
    };
  }
  return { status: 'ok', value: hit.value, set: hit, blocked: false, note: '' };
}

/* ------------------------------------------------------------------
   3. Integritas registry
   ------------------------------------------------------------------ */

/**
 * Cacat STRUKTURAL sebuah registry — bukan cacat isinya.
 *
 * Dipakai gerbang uji. Registry yang tumpang tindih atau berlubang akan
 * memberi jawaban yang tampak sah untuk tanggal yang sesungguhnya ambigu,
 * dan itu persis kelas kesalahan yang hendak dicabut berkas ini.
 */
export function regrefIssues<T>(sets: readonly RegRefSet<T>[] | undefined | null, label: string): string[] {
  const out: string[] = [];
  const list = (sets || []).slice();
  if (!list.length) return [`${label}: registry kosong.`];
  list.forEach((s, i) => {
    const at = `${label}[${i}]`;
    if (!isIsoDate(s.effectiveFrom)) out.push(`${at}: effectiveFrom '${String(s.effectiveFrom)}' bukan YYYY-MM-DD.`);
    if (s.effectiveTo != null && !isIsoDate(s.effectiveTo)) out.push(`${at}: effectiveTo '${String(s.effectiveTo)}' bukan YYYY-MM-DD.`);
    if (isIsoDate(s.effectiveFrom) && isIsoDate(s.effectiveTo || '') && (s.effectiveTo as string) < s.effectiveFrom) {
      out.push(`${at}: effectiveTo mendahului effectiveFrom.`);
    }
    if (!s.basis) out.push(`${at}: tanpa dasar hukum.`);
    if (!s.verified && !s.note) out.push(`${at}: belum terverifikasi tetapi tak menyatakan apa yang belum.`);
    if (s.verified && !s.sourceDoc) out.push(`${at}: verified tanpa menyebut dokumen sumbernya.`);
  });
  const sorted = list.slice().sort((a, b) => (a.effectiveFrom < b.effectiveFrom ? -1 : a.effectiveFrom > b.effectiveFrom ? 1 : 0));
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1], cur = sorted[i];
    if (prev.effectiveTo == null) {
      out.push(`${label}: set ${prev.effectiveFrom} terbuka (effectiveTo null) tetapi ada set berikutnya ${cur.effectiveFrom} — tumpang tindih.`);
    } else if (prev.effectiveTo >= cur.effectiveFrom) {
      out.push(`${label}: ${prev.effectiveFrom}..${prev.effectiveTo} tumpang tindih dengan ${cur.effectiveFrom}.`);
    }
  }
  return out;
}

/** Rentang yang dicakup registry, untuk ditampilkan di halaman referensi. */
export function regrefSpan<T>(sets: readonly RegRefSet<T>[] | undefined | null): { from: string; to: string | null } | null {
  const list = (sets || []).filter((s) => isIsoDate(s?.effectiveFrom));
  if (!list.length) return null;
  let from = list[0].effectiveFrom;
  let to: string | null = list[0].effectiveTo;
  let openEnded = list[0].effectiveTo == null;
  for (const s of list) {
    if (s.effectiveFrom < from) from = s.effectiveFrom;
    if (s.effectiveTo == null) openEnded = true;
    else if (to != null && s.effectiveTo > to) to = s.effectiveTo;
  }
  return { from, to: openEnded ? null : to };
}
