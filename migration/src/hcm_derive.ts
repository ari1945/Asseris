/* ============================================================
   Asseris — Human Capital: turunan MURNI (prompt perbaikan 15-hcm)
   ------------------------------------------------------------
   Tiga cacat modul `hcm` yang ditutup di sini. Ketiganya satu kelas:
   **angka atau status yang dikarang lalu disajikan sebagai fakta tentang
   seseorang.** Di modul SDM itu bukan sekadar pelanggaran SSOT — orang
   memakainya untuk mengambil keputusan tentang manusia.

   (1) PENILAIAN KINERJA EMPAT DIMENSI DIKARANG DARI SATU ANGKA.
       `view_people.tsx` menurunkan empat "dimensi" dari satu `rating`
       roster dengan pergeseran tetap:

         Kualitas teknis audit       rating + 0,1
         Kepemimpinan & supervisi    rating − 0,2
         Manajemen waktu & deadline  rating
         Komunikasi klien            rating − 0,1

       Tidak ada penilai, tidak ada periode, tidak ada dasar. Pembaca yang
       melihat "Kepemimpinan & supervisi 3,8" wajar mengira ada yang
       menilainya. Mesin yang benar ADA DI MODUL YANG SAMA: drawer 360°
       memakai `perfPersonOf` (canon_perf) atas dokumen `perfPeople`/
       `perfGoals` — KPI nyata, berbobot, ber-penilai, ber-tanggal.

       `appraisalOf` di bawah SENGAJA tidak menerima `rating` sebagai
       argumen. Itu bukan gaya penulisan, itu gerbangnya: tak ada jalan
       untuk mengarang dimensi dari sana lagi walau seseorang mencoba.

   (2) PROFIL MENGARANG KEPATUHAN UNTUK ORANG YANG DATANYA TIDAK ADA.
       `profileOf` lama mengisi ketiadaan baris `staffProfile` dengan
       `bpjsKes:'Aktif'`, `bpjsTk:'Aktif'`, `empType:'Tetap'`,
       `location:'Jakarta (HQ)'`, dan tiga dokumen ber-status
       'Valid'/'Lengkap'/'Aktif'. Dari 69 orang di roster, hanya TIGA
       punya baris (EMP-001, EMP-021, EMP-032) — 66 sisanya menyatakan
       "KTP & NPWP: Lengkap" tanpa satu pun dokumen di belakangnya.

       Dibedakan tegas di sini:
         · MASKING  — nik '3174••••••••', phone '0811-•••-xxx'. Data itu
           ADA, pemanggilnya yang tak boleh melihat (row-filter server
           `personal.get`). DIPERTAHANKAN.
         · FABRIKASI — di atas. Ketidaktahuan kini tampil sebagai
           ketidaktahuan: UNKNOWN untuk nilai biasa, UNRECORDED untuk
           yang terbaca sebagai pernyataan kepatuhan, dan daftar KOSONG
           untuk dokumen/keahlian (bukan tiga baris karangan).

       `timeline` fallback TETAP ada — ia diturunkan dari `joined`/`role`
       yang memang milik roster, jadi ia laporan, bukan karangan.

   (3) ID KARYAWAN BARU DARI PANJANG ARRAY.
       `'EMP-' + String(100 + list.length)` dengan `list` = `staffExtra`
       saja. Penambahan KEDUA menghasilkan `EMP-101` — yang di seed sudah
       milik Ayu Prasetya (data_roster.ts). Ketiga → EMP-102 (Agus
       Nugraha), keempat → EMP-103 (Bella Wibowo). Bukan risiko teoretis:
       tabrakan terjadi pada penambahan kedua, dan `staff.find(s => s.id
       === sel)` akan memulangkan orang yang salah.

       `nextEmpId` mengambil slot bebas pertama dari blok 7xx — satu-
       satunya blok yang kosong (dipakai: 0xx audit · 1xx–4xx roster ·
       5xx/6xx firm-ops · 9xx register keluar) — dan diuji terhadap
       SELURUH himpunan id, bukan panjang salah satu daftar.

   Fungsi MURNI: tanpa React, tanpa state, klok selalu argumen.
   ============================================================ */

import { PERF_STAGES, perfPersonOf } from './canon_perf';
import type { PerfGoal, PerfPersonInput } from './canon_perf';

/* ------------------------------------------------------------------
   1. Penilaian kinerja per-dimensi (H1)
   ------------------------------------------------------------------ */

/** Satu dimensi penilaian = satu KPI nyata dari siklus kinerja.
 *  `target`/`actual` ikut dibawa supaya skornya dapat ditelusuri ke
 *  ukurannya — dimensi lama tak punya keduanya karena tak punya dasar. */
export interface AppraisalDim {
  kpi: string;
  score: number;
  weight: number;
  target: string;
  actual: string;
}

export interface Appraisal {
  /** Ada dimensi nyata untuk ditampilkan. false ⇒ JANGAN render angka apa pun. */
  available: boolean;
  dims: AppraisalDim[];
  /** Skor tertimbang Σ(skor × bobot) ÷ Σ(bobot) — canon_perf. null = tak terhitung. */
  score: number | null;
  /** Sebab ketiadaan, apa adanya. Kosong bila `available`. */
  note: string;
  /** Pembubuh reviu manajer. Kosong = belum direviu manajer. */
  assessorName: string;
  assessedAt: string;
  /** Tahap itu ditanam seed demo, bukan dinyatakan orangnya. */
  seeded: boolean;
  /** Label tahap berikutnya yang belum selesai; kosong = siklus tuntas. */
  nextStage: string;
}

export const APPRAISAL_NO_CYCLE = 'Belum ada siklus kinerja untuk pegawai ini.';
export const APPRAISAL_NO_GOALS = 'Siklus kinerja berjalan, tetapi sasaran/KPI belum ditetapkan.';

const EMPTY_APPRAISAL: Appraisal = {
  available: false, dims: [], score: null, note: '',
  assessorName: '', assessedAt: '', seeded: false, nextStage: '',
};

/**
 * Penilaian per-dimensi seorang pegawai — DITURUNKAN dari sasaran/KPI
 * siklus kinerja, bukan dari `rating` roster.
 *
 * GAGAL-TERTUTUP: tanpa catatan kinerja hasilnya `available:false` dengan
 * `dims: []` dan `score: null`. Tidak ada angka pengganti, karena tidak
 * ada yang menilai. `rating` sengaja BUKAN parameter fungsi ini.
 */
export function appraisalOf(
  emp: string,
  rec: PerfPersonInput | undefined | null,
  goals: PerfGoal[] | undefined | null,
): Appraisal {
  if (!rec) return { ...EMPTY_APPRAISAL, note: APPRAISAL_NO_CYCLE };
  const p = perfPersonOf(emp, rec, goals || undefined);
  const dims: AppraisalDim[] = p.goals
    .filter((g) => g && Number.isFinite(g.score) && Number.isFinite(g.weight))
    .map((g) => ({ kpi: g.kpi, score: g.score, weight: g.weight, target: g.target, actual: g.actual }));
  const mgr = rec.steps?.manager;
  return {
    available: dims.length > 0,
    dims,
    score: p.score.score,
    note: dims.length ? p.score.note : APPRAISAL_NO_GOALS,
    assessorName: (mgr && mgr.byName) || '',
    assessedAt: (mgr && mgr.at) || '',
    seeded: !!(mgr && mgr.seeded),
    nextStage: p.complete ? '' : (PERF_STAGES[p.stageIndex]?.label || ''),
  };
}

/* ------------------------------------------------------------------
   2. Profil 360°: tidak-diketahui ≠ pernyataan kepatuhan (H2)
   ------------------------------------------------------------------ */

/** Nilai biasa yang tak diketahui. */
export const UNKNOWN = '—';
/** Nilai yang KALAU diisi akan terbaca sebagai pernyataan kepatuhan
 *  (status kepesertaan, jenis hubungan kerja). Ketiadaannya harus
 *  berbunyi lebih keras daripada sekadar '—'. */
export const UNRECORDED = 'Belum tercatat';

export interface EmergencyContact { name: string; rel: string; phone: string }

export interface StaffProfileRow {
  phone?: string;
  location?: string;
  birth?: string;
  gender?: string;
  empType?: string;
  band?: string;
  salaryBand?: string;
  nik?: string;
  npwp?: string;
  bpjsKes?: string;
  bpjsTk?: string;
  emergency?: EmergencyContact;
  skills?: [string, number][];
  docs?: [string, string][];
  timeline?: [string, string][];
}

/** Bagian roster yang dibaca profil. Sengaja minimal. */
export interface StaffLike {
  id: string;
  role?: string;
  joined?: number;
}

export interface CompetencyBook {
  list?: { id: string; name: string }[];
  actual?: Record<string, Record<string, number> | undefined>;
}

export interface ResolvedProfile {
  phone: string;
  location: string;
  birth: string;
  gender: string;
  empType: string;
  band: string;
  salaryBand: string;
  nik: string;
  npwp: string;
  bpjsKes: string;
  bpjsTk: string;
  emergency: EmergencyContact;
  skills: [string, number][];
  docs: [string, string][];
  timeline: [string, string][];
  /** TIDAK ada baris `staffProfile` untuk orang ini — pembaca wajib
   *  memberi tahu penggunanya, bukan menampilkan placeholder diam-diam. */
  unrecorded: boolean;
}

/**
 * Profil 360° seorang pegawai atas dokumen `staffProfile` (server-scoped,
 * ter-row-filter lewat `personal.get`).
 *
 * Yang berubah dari versi lama HANYA nilai fallback-nya — arsitektur
 * isolasinya tak disentuh. Masking dipertahankan; fabrikasi dicabut.
 */
export function profileOf(
  s: StaffLike,
  profiles: Record<string, StaffProfileRow | undefined> | null | undefined,
  comp?: CompetencyBook,
): ResolvedProfile {
  const map = profiles || {};
  const base: StaffProfileRow = map[s.id] || {};
  const unrecorded = !map[s.id];
  const id = String(s.id || '');

  /* Kompetensi punya sumbernya sendiri (COMPETENCY_ACTUAL). Kalau orangnya
     tak ada di sana, daftarnya KOSONG — bukan tiga keahlian ber-skor 3. */
  const actual = (comp && comp.actual && comp.actual[id]) || null;
  const skills: [string, number][] = base.skills
    || (actual ? (comp?.list || []).map((c): [string, number] => [c.name, actual[c.id] || 0]) : []);

  /* Linimasa fallback DITURUNKAN dari roster (joined + role) — laporan,
     bukan karangan. Tanpa `joined` yang sahih, kosong. */
  const timeline: [string, string][] = base.timeline
    || (Number.isFinite(s.joined) ? [[String(s.joined), 'Bergabung sebagai ' + (s.role || UNKNOWN)]] : []);

  return {
    /* MASKING — dipertahankan. */
    phone: base.phone || ('0811-•••-' + id.slice(-3)),
    nik: base.nik || '3174••••••••',
    /* FABRIKASI — dicabut. */
    location: base.location || UNKNOWN,
    birth: base.birth || UNKNOWN,
    gender: base.gender || UNKNOWN,
    empType: base.empType || UNRECORDED,
    band: base.band || UNKNOWN,
    salaryBand: base.salaryBand || UNKNOWN,
    npwp: base.npwp || UNKNOWN,
    bpjsKes: base.bpjsKes || UNRECORDED,
    bpjsTk: base.bpjsTk || UNRECORDED,
    emergency: base.emergency || { name: UNKNOWN, rel: UNKNOWN, phone: UNKNOWN },
    skills,
    docs: base.docs || [],
    timeline,
    unrecorded,
  };
}

/* ------------------------------------------------------------------
   3. Id karyawan baru (H3)
   ------------------------------------------------------------------ */

/** Blok id untuk penambahan saat berjalan. Satu-satunya ratusan yang
 *  KOSONG di seluruh repo — lihat catatan kepala berkas. */
export const EMP_ID_BLOCK = 700;

const EMP_ID_RE = /^EMP-(\d+)$/;

/** Batas pencarian: 7xx habis (300 slot sampai blok 9xx milik register
 *  keluar) berarti ada yang salah jauh sebelum ini, dan diam-diam
 *  menyeberang ke blok orang lain persis cacat yang sedang ditutup. */
const EMP_ID_CEILING = 999;

/**
 * Id karyawan berikutnya — slot bebas PERTAMA di blok 7xx yang tidak ada
 * di `taken`.
 *
 * `taken` wajib berisi SELURUH id yang dikenal (roster seed + firm-ops +
 * register keluar + penambahan lokal), bukan salah satu daftar saja.
 * Mengembalikan '' bila blok habis — pemanggil harus menolak menambah,
 * karena id kosong lebih baik daripada id milik orang lain.
 */
export function nextEmpId(taken: Iterable<string> | null | undefined, block: number = EMP_ID_BLOCK): string {
  const used = new Set<string>();
  for (const t of taken || []) {
    const v = String(t || '').trim().toUpperCase();
    if (v) used.add(v);
  }
  for (let n = block; n <= EMP_ID_CEILING; n++) {
    const id = 'EMP-' + String(n).padStart(3, '0');
    if (!used.has(id)) return id;
  }
  return '';
}

/** Himpunan id dari beberapa daftar sekaligus — memaksa pemanggil
 *  menyebut SEMUA sumbernya di satu tempat yang terlihat. */
export function empIdsOf(...lists: (readonly { id?: string }[] | null | undefined)[]): string[] {
  const out: string[] = [];
  for (const list of lists) {
    for (const row of list || []) {
      const id = row && row.id;
      if (typeof id === 'string' && EMP_ID_RE.test(id)) out.push(id);
    }
  }
  return out;
}
