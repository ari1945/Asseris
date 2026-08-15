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

export type PhaseKey = 'Perencanaan' | 'Eksekusi' | 'Specifics' | 'Finalisasi';

export const CKP_PHASE_ORDER: readonly PhaseKey[] = ['Perencanaan', 'Eksekusi', 'Specifics', 'Finalisasi'];

/* Warna fase memakai token peran semantik (CLAUDE.md §5) — dulu hex hardcode. */
export const PHASE_TOKEN: Record<PhaseKey, string> = {
  Perencanaan: 'var(--purple)',
  Eksekusi: 'var(--blue)',
  Specifics: 'var(--teal)',
  Finalisasi: 'var(--amber)',
};

/* Bobot JAM ANGGARAN per fase. Ini MODEL ALOKASI, bukan pengukuran — dan kini
   diberi label demikian di UI. Dipisahkan dari progres justru supaya tak lagi
   tertukar: dulu satu angka literal melayani keduanya sekaligus. */
export const PHASE_BUDGET_WEIGHT: Record<PhaseKey | 'Review & Arsip', number> = {
  Perencanaan: 0.152,
  Eksekusi: 0.413,
  Specifics: 0.196,
  Finalisasi: 0.185,
  'Review & Arsip': 0.054,
};

/* ------------------------------------------------------------------
   PETA MODUL → FASE — dienumerasi untuk SETIAP kunci `WP_MODULE_MAP`.
   Gerbang mutunya adalah CAKUPAN, bukan tie-out (pelajaran #242): uji
   membuktikan tiap kunci WP_MODULE_MAP muncul di sini dan sebaliknya.
   Tie-out "jumlah fase = total" akan lulus otomatis & tak membuktikan apa pun.
   ------------------------------------------------------------------ */
export const PHASE_OF_MODULE: Record<string, PhaseKey> = {
  /* --- Perencanaan: penilaian risiko, materialitas, pengendalian --- */
  materiality: 'Perencanaan',   // SA 320
  icfr: 'Perencanaan',          // SA 315 · 330 · 265
  sa240: 'Perencanaan',         // risiko kecurangan & respons
  sa250: 'Perencanaan',         // NOCLAR — pertimbangan hukum & regulasi
  serviceorg: 'Perencanaan',    // SA 402 — organisasi jasa

  /* --- Eksekusi: prosedur substantif inti --- */
  wtb: 'Eksekusi',
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
  provenPct: number;
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
      provenPct: bridge.provenPct,
      notStarted: inPhase.filter((s) => s.notStarted).length,
    };
  });
}

/** Modul terpetakan yang TIDAK punya status (mis. id asing) — untuk diagnostik. */
export function unmappedModules(statuses: ModuleWpStatus[]): string[] {
  return statuses.filter((s) => !PHASE_OF_MODULE[s.id]).map((s) => s.id);
}
