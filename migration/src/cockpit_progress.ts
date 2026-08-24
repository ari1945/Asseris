/* ============================================================
   Engagement Cockpit — progres TERBUKTI vs progres DI-ASSERT (MURNI, teruji)
   ------------------------------------------------------------
   PR-C-2.

   SEBELUM PR ini gauge besar di cockpit menampilkan 62% dan pipeline fase
   menampilkan 20 bar persentase. Keduanya literal, dan ditala agar sepakat:

       CKP_PHASES  → 20 angka hardcode, rata-rata 1242/20 = 62,1 → 62
       e.progress  → 62

   Menandatangani seluruh kertas kerja tidak menggerakkannya. Tidak
   menandatangani satu pun juga tidak. Layar status tak merespons status.

   KEPUTUSAN DESAIN — mengapa BUKAN sekadar "ganti literal dengan turunan":

   `e.progress` adalah ASERSI manajer perikatan — penilaian profesional
   tentang seberapa jauh pekerjaan berjalan. Kelengkapan kertas kerja adalah
   BUKTI. Keduanya sah dan tidak identik: pekerjaan bisa 80% selesai secara
   substansi sementara sign-off tertinggal, dan sebaliknya. Memaksa yang satu
   menjadi turunan yang lain membuang informasi.

   Karena itu: DUA ANGKA + JEMBATAN YANG DIENUMERASI — pola yang sama dengan
   rekonsiliasi kas/bank (#247·#251), di mana saldo bank tetap literal karena
   ia sumber independen.

   BAGAIMANA JEMBATANNYA JUJUR. Godaan yang saya tolak: menuliskan

       62%  − WP tanpa kesimpulan − WP tanpa bukti − WP belum ttd = terbukti

   Itu PLUG berbaju enumerasi: ketiga defisiensi TUMPANG TINDIH (satu kertas
   kerja bisa kekurangan ketiganya), jadi angkanya takkan pernah mendarat di
   hasil tanpa disetel. Sebagai gantinya jembatan menyebutkan apa yang SUDAH
   TERBUKTI, dan ketiga komponennya BENAR-BENAR menjumlah:

       tiap kertas kerja kunci punya tiga tonggak setara (1/3 masing-masing):
         · bukti wajib lengkap        (SA 500)
         · kesimpulan auditor tercatat (SA 230)
         · sign-off penelaah
       progres terbukti = Σ tonggak terpenuhi / (3 × jumlah kertas kerja)

   Sisa terhadap asersi manajer TIDAK dipecah menjadi komponen palsu — ia
   dinyatakan apa adanya sebagai satu selisih bernama.

   Fungsi di berkas ini MURNI: tak menyentuh React/DOM/window/localStorage.
   ============================================================ */
import {
  PHASE_BUDGET_WEIGHT, PHASE_ORDER, PHASE_TOKEN, phaseOf, type PhaseId,
} from './phase_canon';

/* Taksonomi & bobot fase TIDAK hidup di berkas ini lagi. Sampai PRD
   `prd-timebudget-phase-profile.md` ada EMPAT daftar fase di aplikasi, dan
   dua di antaranya (di sini dan di Time & Budget) membagi jam anggaran yang
   SAMA dengan bobot yang BERBEDA — dua layar, satu perikatan, dua jawaban.
   Keduanya kini memanggil `phase_canon.ts`. Lihat catatan pelipatan
   'Specifics' → Eksekusi di sana; ia keputusan metodologi, bukan kerapian. */
export type PhaseKey = PhaseId;
export { PHASE_TOKEN, PHASE_BUDGET_WEIGHT };
export const CKP_PHASE_ORDER: readonly PhaseKey[] = PHASE_ORDER;

/* ------------------------------------------------------------------
   PETA MODUL → FASE — dienumerasi untuk SETIAP kunci `WP_MODULE_MAP`.
   Gerbang mutunya adalah CAKUPAN, bukan tie-out (pelajaran #242): uji
   membuktikan tiap kunci WP_MODULE_MAP muncul di sini dan sebaliknya.
   Tie-out "jumlah fase = total" akan lulus otomatis & tak membuktikan apa pun.
   ------------------------------------------------------------------ */
/* Peta di bawah tetap DITULIS pada taksonomi lama (lima kunci) supaya
   pengelompokan halus 'Specifics' — 26 dari 51 modul — tidak lenyap dari
   catatan hanya karena ia tak lagi jadi fase tersendiri. Yang DIEKSPOR adalah
   hasil pelipatannya lewat `phaseOf`, sehingga pemetaannya dapat dibaca dan
   diuji alih-alih terjadi diam-diam. Cockpit merender daftar modul per fase,
   jadi yang hilang hanyalah judul antaranya. */
type LegacyPhase = PhaseId | 'Specifics' | 'Review & Arsip';

const MODULE_PHASE_RAW: Record<string, LegacyPhase> = {
  /* --- Perencanaan: penilaian risiko, materialitas, pengendalian --- */
  materiality: 'Perencanaan',   // SA 320
  icfr: 'Perencanaan',          // SA 315 · 330 · 265
  sa240: 'Perencanaan',         // risiko kecurangan & respons
  sa250: 'Perencanaan',         // NOCLAR — pertimbangan hukum & regulasi
  serviceorg: 'Perencanaan',    // SA 402 — organisasi jasa

  /* --- Eksekusi: prosedur substantif inti --- */
  wtb: 'Eksekusi',
  /* SA 510 — saldo awal. Pekerjaan intinya (tie-out saldo akhir audited TA-1 →
     saldo awal periode kini) bersandar pada WTB, jadi ia hidup di fase yang sama. */
  opening: 'Eksekusi',
  aje: 'Eksekusi',
  analytical: 'Eksekusi',
  sa520: 'Eksekusi',            // prosedur analitis
  sa530: 'Eksekusi',            // sampling
  sa501: 'Eksekusi',            // bukti spesifik (persediaan, litigasi)
  sa540: 'Eksekusi',            // estimasi akuntansi
  confirm: 'Eksekusi',          // SA 505
  jet: 'Eksekusi',              // journal entry testing
  expert: 'Eksekusi',           // SA 620
  spr2410: 'Eksekusi',          // reviu interim

  /* --- Specifics: area teknis PSAK + area SA berbasis-pertimbangan --- */
  psak1: 'Specifics',
  psak2: 'Specifics',
  psak14: 'Specifics',
  psak16: 'Specifics',
  psak19: 'Specifics',
  psak22: 'Specifics',
  psak24: 'Specifics',
  psak25: 'Specifics',
  psak46: 'Specifics',
  psak48: 'Specifics',
  psak58: 'Specifics',
  psak65: 'Specifics',
  psak66: 'Specifics',
  psak68: 'Specifics',
  psak71: 'Specifics',
  psak72: 'Specifics',
  psak73: 'Specifics',
  lease: 'Specifics',           // berbagi ref 'F' dengan psak73 → dedupe di hilir
  segmen: 'Specifics',
  assoc: 'Specifics',
  isak35: 'Specifics',
  psak117: 'Specifics',
  syariah: 'Specifics',
  goingconcern: 'Specifics',    // SA 570
  related: 'Specifics',         // SA 550
  subsequent: 'Specifics',      // SA 560

  /* --- Finalisasi: penyelesaian, komunikasi, pelaporan --- */
  sad: 'Finalisasi',            // SA 450
  fsgen: 'Finalisasi',
  opinion: 'Finalisasi',        // SA 700
  sa230: 'Finalisasi',          // dokumentasi & perakitan berkas
  sa580: 'Finalisasi',          // representasi tertulis
  sa710: 'Finalisasi',          // informasi komparatif
  sa720: 'Finalisasi',          // informasi lain
  sa260: 'Finalisasi',          // komunikasi TCWG
  sa265: 'Finalisasi',          // defisiensi pengendalian
};

export const PHASE_OF_MODULE: Record<string, PhaseKey> = Object.fromEntries(
  Object.entries(MODULE_PHASE_RAW).map(([id, fase]) => {
    const kanon = phaseOf(fase);
    /* Tak mungkin null selama `LegacyPhase` dan `PHASE_ALIAS` sinkron; kalau
       toh terjadi, ia harus berbunyi di sini alih-alih menghilangkan modul
       dari seluruh rollup fase tanpa suara. */
    if (!kanon) throw new Error('fase modul tak dikenal: ' + id + ' → ' + fase);
    return [id, kanon];
  }),
);

/** Peta mentah (taksonomi lama) — untuk uji pelipatan & diagnostik saja. */
export const MODULE_PHASE_LEGACY: Readonly<Record<string, LegacyPhase>> = MODULE_PHASE_RAW;

/**
 * Fase yang memang TIDAK punya kertas kerja kanonik.
 *
 * Sesudah taksonomi disatukan (TB7), 'Arsip' menjadi fase tersendiri sementara
 * tak satu pun kunci `WP_MODULE_MAP` memetakan ke sana — kertas kerja
 * dokumentasi & perakitan berkas (`sa230`) hari ini terpetakan ke Finalisasi.
 *
 * Didaftarkan, BUKAN dibiarkan lolos diam-diam: gerbang cakupan S4 tetap
 * memerahkan fase yang kosong karena kelalaian, dan daftar ini sendiri diuji
 * agar tak menyimpan fase yang sebenarnya sudah terisi.
 *
 * TERBUKA (keputusan Ari, jangan diputuskan sepihak): apakah `sa230` — dan
 * mungkin `sa580`/`sa710`/`sa720` — seharusnya pindah ke Arsip. Itu pertanyaan
 * metodologi audit, bukan kerapian peta.
 */
export const PHASES_WITHOUT_WP: readonly PhaseId[] = ['Arsip'];

/* ---------- bentuk data dari wp_signoff.wpModuleStatuses ---------- */
export interface ModuleWpStatus {
  id: string;
  ref: string;
  signed: boolean;
  hasEvidence: boolean;
  hasConclusion: boolean;
  notStarted: boolean;
}

/* Tiga tonggak setara per kertas kerja — dienumerasi, bukan diturunkan. */
export const WP_MILESTONES = [
  { key: 'evidence', label: 'Bukti wajib lengkap', sa: 'SA 500', pick: (s: ModuleWpStatus) => s.hasEvidence },
  { key: 'conclusion', label: 'Kesimpulan auditor tercatat', sa: 'SA 230', pick: (s: ModuleWpStatus) => s.hasConclusion },
  { key: 'signoff', label: 'Sign-off penelaah', sa: 'SA 220', pick: (s: ModuleWpStatus) => s.signed },
] as const;

/** Skor satu kertas kerja: 0 · 33 · 67 · 100. */
export function moduleProvenPct(s: ModuleWpStatus): number {
  const met = WP_MILESTONES.filter((m) => m.pick(s)).length;
  return Math.round((met / WP_MILESTONES.length) * 100);
}

export interface BridgeRow {
  key: string;
  label: string;
  sa: string;
  count: number;
  total: number;
  /** kontribusi ke progres terbukti, dalam poin persen (maks 100/3 per tonggak) */
  pp: number;
}

export interface ProgressBridge {
  total: number;
  rows: BridgeRow[];
  /** Σ rows.pp — progres yang TERBUKTI oleh kertas kerja */
  provenPct: number;
  /** asersi manajer perikatan (e.progress); null bila tak ada */
  assertedPct: number | null;
  /** asersi − terbukti, dalam poin persen; null bila asersi tak ada.
      TIDAK dipecah menjadi komponen — ia satu selisih bernama. */
  gapPp: number | null;
}

/**
 * progressBridge — jembatan dari asersi manajer ke progres terbukti.
 * Ketiga baris `rows` BENAR-BENAR menjumlah menjadi `provenPct` (masing-masing
 * maksimum 33,3 pp); tak ada baris "lain-lain" dan tak ada plug.
 */
export function progressBridge(statuses: ModuleWpStatus[], assertedPct: number | null): ProgressBridge {
  const total = statuses.length;
  const denom = total * WP_MILESTONES.length;
  const rows: BridgeRow[] = WP_MILESTONES.map((m) => {
    const count = statuses.filter((s) => m.pick(s)).length;
    return { key: m.key, label: m.label, sa: m.sa, count, total, pp: denom ? (count / denom) * 100 : 0 };
  });
  const provenPct = rows.reduce((s, r) => s + r.pp, 0);
  return {
    total, rows, provenPct, assertedPct,
    gapPp: assertedPct == null ? null : assertedPct - provenPct,
  };
}

export interface PhaseRollup {
  phase: PhaseKey;
  token: string;
  modules: { id: string; pct: number; status: ModuleWpStatus }[];
  total: number;
  /**
   * Kelengkapan terbukti fase ini, 0..100 — atau `null` bila fase ini tak
   * punya SATU PUN kertas kerja kanonik.
   *
   * Dulu `progressBridge` mengembalikan 0 untuk himpunan kosong (penyebutnya
   * nol ⇒ tiap baris `pp: 0`), sehingga "tak ada yang diukur" tak dapat
   * dibedakan dari "semua kertas kerja belum disentuh". Keduanya pernyataan
   * yang berbeda, dan sesudah taksonomi disatukan perbedaan itu terlihat di
   * layar: fase Arsip belum punya kertas kerja kanonik.
   */
  provenPct: number | null;
  /** jumlah kertas kerja yang belum dimulai (nol bukti & nol kesimpulan) */
  notStarted: number;
}

/**
 * phaseRollups — kelengkapan terbukti per fase, dari status per-modul.
 * Modul yang tak terpetakan DIABAIKAN di sini; uji cakupan (S4) yang
 * memastikan hal itu tak pernah terjadi diam-diam.
 */
export function phaseRollups(statuses: ModuleWpStatus[]): PhaseRollup[] {
  return CKP_PHASE_ORDER.map((phase) => {
    const inPhase = statuses.filter((s) => PHASE_OF_MODULE[s.id] === phase);
    const modules = inPhase
      .map((s) => ({ id: s.id, pct: moduleProvenPct(s), status: s }))
      .sort((a, z) => a.pct - z.pct || a.id.localeCompare(z.id));
    const bridge = progressBridge(inPhase, null);
    return {
      phase,
      token: PHASE_TOKEN[phase],
      modules,
      total: inPhase.length,
      provenPct: inPhase.length ? bridge.provenPct : null,
      notStarted: inPhase.filter((s) => s.notStarted).length,
    };
  });
}

/** Modul terpetakan yang TIDAK punya status (mis. id asing) — untuk diagnostik. */
export function unmappedModules(statuses: ModuleWpStatus[]): string[] {
  return statuses.filter((s) => !PHASE_OF_MODULE[s.id]).map((s) => s.id);
}
