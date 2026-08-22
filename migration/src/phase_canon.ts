/* ============================================================
   Asseris — KANON FASE PERIKATAN. Satu taksonomi, satu tabel bobot.

   Sampai PRD `prd-timebudget-phase-profile.md` ada EMPAT daftar fase hidup
   bersamaan di aplikasi ini:

     1. `TB_PHASE_PROFILE[].id`  Perencanaan · Eksekusi · Finalisasi · Pelaporan
     2. `phaseOpts` (view_timebudget)  salinan literal dari (1)
     3. `PhaseKey` + 'Review & Arsip' (cockpit_progress)
                                Perencanaan · Eksekusi · Specifics ·
                                Finalisasi · Review & Arsip
     4. `ENGAGEMENTS.phase` · `engagementGate(fromPhase/nextPhase)` · `PhaseName`
                                Perencanaan · Eksekusi · Finalisasi · Arsip

   Akibatnya terukur, bukan teoretis: formulir timesheet Time & Budget menulis
   `phase: 'Pelaporan'`, sementara cockpit hanya membaca lima kunci taksonominya
   sendiri — jam itu tak pernah terbaca di sana dan jatuh ke `untaggedHrs`.
   Jam yang sama muncul sebagai fase Pelaporan di satu layar dan sebagai jam
   tanpa fase di layar lain.

   KEPUTUSAN (Ari, 2026-08-22 — Opsi B pada PRD): kanon = taksonomi **DATA**,
   yaitu (4). Ia yang sudah dipakai `ENGAGEMENTS.phase` dan yang mengendalikan
   gerbang perpindahan fase; menjadikan yang lain kanon berarti memasukkan
   istilah asing ke tempat gerbang bekerja.

   Dua fase cockpit yang tak ada di taksonomi data DILIPAT lewat peta yang
   TERDAFTAR di bawah (`PHASE_ALIAS`) — bukan pemetaan diam-diam:

       Specifics      → Eksekusi        (prosedur spesifik = pekerjaan lapangan)
       Review & Arsip → Arsip
       Pelaporan      → Arsip           (ejaan lama Time & Budget)

   Bobot ikut dilipat, jadi totalnya tetap 1,000:

       Perencanaan 0,152 · Eksekusi 0,413+0,196=0,609 · Finalisasi 0,185 ·
       Arsip 0,054

   Yang TIDAK hilang: cockpit merender daftar modul per fase (`PhaseRollup
   .modules`), jadi melipat 'Specifics' menghilangkan judul antara, bukan
   satu pun kertas kerjanya.

   BOBOT INI MODEL ALOKASI, BUKAN PENGUKURAN — label itu diwarisi apa adanya
   dari `PHASE_BUDGET_WEIGHT` lama dan tetap dinyatakan di UI. Bila kelak ada
   anggaran jam per fase yang benar-benar dicatat manajer perikatan, ia
   menggantikan seluruh tabel ini (PRD §11 Q3).
   ============================================================ */

/** Fase perikatan — taksonomi DATA. Satu-satunya yang sah di aplikasi ini. */
export type PhaseId = 'Perencanaan' | 'Eksekusi' | 'Finalisasi' | 'Arsip';

/** Urutan kanonik; dipakai setiap layar yang menampilkan fase berurutan. */
export const PHASE_ORDER: readonly PhaseId[] = ['Perencanaan', 'Eksekusi', 'Finalisasi', 'Arsip'];

/** Label panjang untuk UI. Id tetap pendek karena ia yang tersimpan di data. */
export const PHASE_LABEL: Record<PhaseId, string> = {
  Perencanaan: 'Perencanaan',
  Eksekusi: 'Eksekusi (Fieldwork)',
  Finalisasi: 'Finalisasi & Review',
  Arsip: 'Pelaporan & Arsip',
};

/* Token peran semantik (CLAUDE.md §5), bukan hex. 'Arsip' mewarisi teal yang
   dulu dipakai 'Specifics' — warna yang sudah tak bertuan sesudah pelipatan. */
export const PHASE_TOKEN: Record<PhaseId, string> = {
  Perencanaan: 'var(--purple)',
  Eksekusi: 'var(--blue)',
  Finalisasi: 'var(--amber)',
  Arsip: 'var(--teal)',
};

/**
 * Bobot JAM ANGGARAN per fase — MODEL ALOKASI, bukan pengukuran.
 *
 * Jumlahnya tepat 1. Gerbang uji menegakkan itu, karena bobot yang tak
 * berjumlah satu membuat "anggaran per fase" diam-diam bukan pembagian
 * anggaran perikatan melainkan angka lain yang mirip.
 */
export const PHASE_BUDGET_WEIGHT: Record<PhaseId, number> = {
  Perencanaan: 0.152,
  Eksekusi: 0.609,
  Finalisasi: 0.185,
  Arsip: 0.054,
};

/**
 * Ejaan lain yang PERNAH dipakai di aplikasi ini → fase kanonik.
 *
 * Terdaftar dengan sengaja: sebuah nilai `phase` yang tersimpan di timesheet
 * lama atau di peta modul cockpit harus punya rumah yang dapat ditunjuk, dan
 * pemetaannya harus dapat dibaca serta diuji. Menambah baris di sini adalah
 * keputusan metodologi — jangan menambahkannya untuk membungkam kesalahan
 * ketik.
 */
export const PHASE_ALIAS: Readonly<Record<string, PhaseId>> = {
  Specifics: 'Eksekusi',
  'Review & Arsip': 'Arsip',
  Pelaporan: 'Arsip',
};

/**
 * Fase kanonik dari sebuah nilai `phase` apa pun asalnya.
 *
 * `null` = nilai yang tak dikenal. Pemanggil WAJIB melaporkannya sebagai jam
 * tanpa fase, BUKAN membuangnya diam-diam dan bukan menebak fase terdekat.
 */
export function phaseOf(raw: string | null | undefined): PhaseId | null {
  const s = (raw || '').trim();
  if (!s) return null;
  if ((PHASE_ORDER as readonly string[]).includes(s)) return s as PhaseId;
  return PHASE_ALIAS[s] || null;
}

/**
 * Alokasi EKSAK sebuah total menurut bobot.
 *
 * n−1 bagian dibulatkan 2 desimal, sisanya masuk ke bagian terakhir, sehingga
 * jumlahnya SELALU tepat sama dengan `total`. Cockpit dulu memakai
 * `Math.round(bobot × total)` per fase, yang bisa meleset dari total beberapa
 * jam — cukup untuk membuat "jumlah fase ≠ anggaran perikatan" tanpa siapa pun
 * dapat menunjuk sebabnya.
 */
export function allocateExact(total: number, weights: readonly number[]): number[] {
  const sum = weights.reduce((s, w) => s + w, 0);
  if (!(sum > 0) || weights.length === 0) return weights.map(() => 0);
  const out = weights.map((w) => Math.round((total * w / sum) * 100) / 100);
  out[out.length - 1] = total - out.slice(0, -1).reduce((s, v) => s + v, 0);
  return out;
}

/** Jam anggaran per fase — SATU perhitungan, dipakai cockpit dan Time & Budget. */
export function phaseBudgetHours(budgetHrs: number): Record<PhaseId, number> {
  const alok = allocateExact(budgetHrs, PHASE_ORDER.map((p) => PHASE_BUDGET_WEIGHT[p]));
  const out = {} as Record<PhaseId, number>;
  PHASE_ORDER.forEach((p, i) => { out[p] = alok[i]; });
  return out;
}

/**
 * Jam timesheet per fase kanonik + jam yang fasenya tak dikenal.
 *
 * `untagged` DINYATAKAN, tidak disebar — pola yang sama dengan `untaggedHrs`
 * di cockpit ("selisihnya dinyatakan, bukan disebar"). Menyebarkannya menurut
 * bobot anggaran akan mengarang atribusi fase untuk jam yang tak membawanya.
 */
export function phaseHoursOf(
  entries: readonly { phase?: string; hours?: number }[] | null | undefined,
): { byPhase: Record<PhaseId, number>; untagged: number } {
  const byPhase = {} as Record<PhaseId, number>;
  PHASE_ORDER.forEach((p) => { byPhase[p] = 0; });
  let untagged = 0;
  (entries || []).forEach((t) => {
    const h = typeof t.hours === 'number' && Number.isFinite(t.hours) ? t.hours : 0;
    const p = phaseOf(t.phase);
    if (p) byPhase[p] += h; else untagged += h;
  });
  return { byPhase, untagged };
}
