/* ============================================================
   Asseris — Siklus Kinerja: MESIN MURNI (PRD sdm-kepatuhan PR-2)
   ------------------------------------------------------------
   Tiga cacat yang ditutup di sini.

   (1) SKOR PUNYA DUA SUMBER. `perf: 4.5` disimpan untuk EMP-021,
       sementara sasarannya berbobot 30/30/15/25 dengan skor
       4,6 · 4,5 · 3,5 · 4,4 — tertimbang **4,355**. Yang
       menggerakkan 9-box, rata-rata firma, dan rekomendasi promosi
       adalah 4,5; panel KPI menampilkan dasar yang tidak dipakai.

   (2) PENEMPATAN 9-BOX PUNYA DUA SUMBER. `box` adalah string
       tersimpan, sementara grid di layar yang sama menghitung
       selnya sendiri dari (skor × potensi). Untuk TIGA dari tujuh
       orang keduanya bertentangan:

         EMP-008  4,2/3,6 → sel (1,1) "Inti"            vs "Kinerja Tinggi"
         EMP-031  4,0/3,5 → sel (1,0) "Pekerja Efektif" vs "Inti"
         EMP-032  3,9/3,4 → sel (1,0) "Pekerja Efektif" vs "Inti"

       Tabel membaca string, grid membaca hitungan, dan tak ada
       yang memberi tahu bahwa keduanya berbeda.

   (3) SATU TOMBOL MEMAINKAN EMPAT PERAN. `advance()` berjalan
       goalsSet → selfDone → mgrDone → calibrated pada klik
       berturut oleh pengguna YANG SAMA, tanpa `can()`, tanpa
       memeriksa penilai ≠ yang dinilai, tanpa mencatat siapa pun.
       Self-review, reviu manajer, dan kalibrasi adalah tiga pihak
       berbeda. Kelas cacat yang sudah ditutup untuk sign-off opini
       (#23) dan tanda tangan kertas kerja (#177).

   Skor & penempatan kini DITURUNKAN; tahapan kini BER-IDENTITAS.
   Potensi (`pot`) tetap DATA — ia penilaian, bukan hitungan — tetapi
   harus ber-atribusi seperti tahapan lainnya.

   Fungsi MURNI: tanpa React, tanpa state, `asOf` selalu argumen.
   ============================================================ */

/* ------------------------------------------------------------------
   1. Sasaran & skor tertimbang
   ------------------------------------------------------------------ */

export interface PerfGoal {
  kpi: string;
  target: string;
  actual: string;
  /** Penilaian 1–5 oleh penelaah, diinformasikan oleh ukurannya. */
  score: number;
  /** Bobot persen. Σ harus 100. */
  weight: number;
}

export type PerfScoreFlag = 'tanpa-sasaran' | 'bobot-tidak-100' | 'skor-di-luar-skala';

export const PERF_SCORE_FLAG_LABEL: Record<PerfScoreFlag, string> = {
  'tanpa-sasaran': 'Belum ada sasaran/KPI — skor kinerja tak dapat dihitung',
  'bobot-tidak-100': 'Bobot KPI tidak berjumlah 100%',
  'skor-di-luar-skala': 'Ada skor KPI di luar skala 1–5',
};

export interface PerfScore {
  /** null = tak dapat dihitung. JANGAN diganti 0 — itu berarti "nilai nol". */
  score: number | null;
  weightSum: number;
  goals: number;
  flags: PerfScoreFlag[];
  note: string;
}

export const PERF_SCALE_MIN = 1;
export const PERF_SCALE_MAX = 5;

/** Skor kinerja = Σ(skor × bobot) / Σ(bobot).
 *
 *  Mengembalikan `null` bila tak ada sasaran. Sebelumnya angka tersimpan selalu
 *  ada, sehingga "belum dinilai" dan "dinilai 0" tak dapat dibedakan. */
export function perfScoreOf(goals: PerfGoal[] | undefined): PerfScore {
  const list = (goals || []).filter((g) => g && Number.isFinite(g.score) && Number.isFinite(g.weight));
  const weightSum = list.reduce((a, g) => a + g.weight, 0);
  const flags: PerfScoreFlag[] = [];
  if (!list.length || weightSum <= 0) {
    return { score: null, weightSum, goals: list.length, flags: ['tanpa-sasaran'], note: PERF_SCORE_FLAG_LABEL['tanpa-sasaran'] };
  }
  if (Math.abs(weightSum - 100) > 1e-9) flags.push('bobot-tidak-100');
  if (list.some((g) => g.score < PERF_SCALE_MIN || g.score > PERF_SCALE_MAX)) flags.push('skor-di-luar-skala');
  const raw = list.reduce((a, g) => a + g.score * g.weight, 0) / weightSum;
  /* Dibulatkan ke 2 desimal agar floating-point tak membocorkan 4.354999999. */
  const score = Math.round(raw * 100) / 100;
  return {
    score, weightSum, goals: list.length, flags,
    note: flags.map((f) => PERF_SCORE_FLAG_LABEL[f]).join(' · '),
  };
}

/* ------------------------------------------------------------------
   2. Matriks 9-box
   ------------------------------------------------------------------ */

/** Ambang pita — dipertahankan dari `band()` lama agar penempatan tak bergeser
 *  hanya karena mesinnya dipindah. */
export const PERF_BAND_HIGH = 4.3;
export const PERF_BAND_MID = 3.6;

export function perfBand(v: number | null | undefined): 0 | 1 | 2 | null {
  if (v == null || !Number.isFinite(v)) return null;
  return v >= PERF_BAND_HIGH ? 2 : v >= PERF_BAND_MID ? 1 : 0;
}

export const PERF_BAND_LABEL = ['Rendah', 'Sedang', 'Tinggi'] as const;

/** GRID[potensi][kinerja] — sembilan sel, masing-masing bernama.
 *  Sebelumnya hanya tiga nama yang dipakai ('Bintang', 'Kinerja Tinggi', 'Inti'),
 *  sehingga enam sel lain tak punya sebutan dan orang di dalamnya dilabeli sel lain. */
export const NINE_BOX: { key: string; label: string; action: string }[][] = [
  [ { key: 'risiko',      label: 'Risiko',                 action: 'Perbaiki atau keluarkan' },
    { key: 'efektif',     label: 'Pekerja Efektif',        action: 'Pertahankan di peran' },
    { key: 'andal',       label: 'Ahli Andal',             action: 'Pertahankan & manfaatkan keahlian' } ],
  [ { key: 'tekateki',    label: 'Teka-teki',              action: 'Perjelas ekspektasi & dampingi' },
    { key: 'inti',        label: 'Inti',                   action: 'Kembangkan' },
    { key: 'tinggi',      label: 'Kinerja Tinggi',         action: 'Kembangkan ke peran lebih luas' } ],
  [ { key: 'terpendam',   label: 'Potensi Belum Tergali',  action: 'Cari akar hambatan kinerja' },
    { key: 'berkembang',  label: 'Bintang Berkembang',     action: 'Percepat pengembangan' },
    { key: 'bintang',     label: 'Bintang',                action: 'Siapkan suksesi & promosi' } ],
];

export interface NineBoxPlacement {
  px: 0 | 1 | 2 | null;
  py: 0 | 1 | 2 | null;
  key: string;
  label: string;
  action: string;
  placeable: boolean;
  note: string;
}

const UNPLACEABLE: NineBoxPlacement = {
  px: null, py: null, key: '', label: 'Belum dapat ditempatkan', action: '',
  placeable: false, note: '',
};

/** Penempatan 9-box DITURUNKAN dari (skor kinerja × potensi).
 *  Tak ada label tersimpan yang dapat berbeda dari selnya. */
export function nineBoxOf(score: number | null | undefined, pot: number | null | undefined): NineBoxPlacement {
  const px = perfBand(score);
  const py = perfBand(pot);
  if (px === null || py === null) {
    return {
      ...UNPLACEABLE,
      note: px === null && py === null ? 'Skor kinerja & potensi belum tersedia.'
        : px === null ? 'Skor kinerja belum dapat dihitung (belum ada sasaran).'
          : 'Penilaian potensi belum ada.',
    };
  }
  const cell = NINE_BOX[py][px];
  return { px, py, key: cell.key, label: cell.label, action: cell.action, placeable: true, note: '' };
}

/* ------------------------------------------------------------------
   3. Tahapan siklus — siapa boleh menggerakkan apa
   ------------------------------------------------------------------ */

export type PerfStageKey = 'goals' | 'self' | 'manager' | 'calibration';

export interface PerfStageMeta {
  key: PerfStageKey;
  label: string;
  /** Siapa yang berwenang membubuhkan tahap ini. */
  actor: 'atasan-atau-hr' | 'diri-sendiri' | 'atasan-langsung' | 'hr-independen';
  rule: string;
  /** Field boolean lama yang tahap ini gantikan. */
  legacy: 'goalsSet' | 'selfDone' | 'mgrDone' | 'calibrated';
}

export const PERF_STAGES: PerfStageMeta[] = [
  { key: 'goals', label: 'Penetapan Sasaran', actor: 'atasan-atau-hr', legacy: 'goalsSet',
    rule: 'Ditetapkan atasan langsung atau HR — bukan oleh yang dinilai.' },
  { key: 'self', label: 'Self-Review', actor: 'diri-sendiri', legacy: 'selfDone',
    rule: 'HANYA oleh yang dinilai. Orang lain tidak dapat mengisi self-review siapa pun.' },
  { key: 'manager', label: 'Reviu Manajer', actor: 'atasan-langsung', legacy: 'mgrDone',
    rule: 'HANYA oleh atasan langsung (garis pelaporan). HR tidak menggantikan penilai.' },
  { key: 'calibration', label: 'Kalibrasi', actor: 'hr-independen', legacy: 'calibrated',
    rule: 'Oleh HR/Rekan yang BUKAN yang dinilai dan BUKAN atasan langsungnya.' },
];

export interface PerfStamp {
  by?: string;
  byName?: string;
  at?: string;
  /** Ditanam SEED demo — bukan dinyatakan orangnya. Ditampilkan apa adanya,
   *  mengikuti pola `member_independence.seeded`. */
  seeded?: boolean;
}

export interface PerfPersonInput {
  pot?: number;
  promote?: string;
  steps?: Partial<Record<PerfStageKey, PerfStamp>>;
  /* --- bentuk LAMA (masih ada di StateDoc terpersist) --- */
  goalsSet?: boolean;
  selfDone?: boolean;
  mgrDone?: boolean;
  calibrated?: boolean;
  /** Literal lama. DIABAIKAN oleh mesin ini — didaftarkan agar tipenya jujur. */
  perf?: number;
  box?: string;
}

export interface PerfStageState {
  key: PerfStageKey;
  label: string;
  meta: PerfStageMeta;
  done: boolean;
  stamp?: PerfStamp;
  /** Selesai TAPI tanpa identitas pembubuh (warisan boolean lama / seed). */
  attributed: boolean;
}

export interface PerfPerson {
  emp: string;
  score: PerfScore;
  pot: number | null;
  placement: NineBoxPlacement;
  promote: string;
  stages: PerfStageState[];
  /** Indeks tahap BERIKUTNYA yang belum selesai; 4 = siklus tuntas. */
  stageIndex: number;
  complete: boolean;
  /** Tahap selesai yang tak dapat ditanyakan "siapa yang membubuhkan?". */
  unattributed: PerfStageKey[];
  goals: PerfGoal[];
}

function stageStateOf(rec: PerfPersonInput, meta: PerfStageMeta): PerfStageState {
  const stamp = rec.steps?.[meta.key];
  if (stamp) {
    return { key: meta.key, label: meta.label, meta, done: true, stamp, attributed: !!stamp.by && !stamp.seeded };
  }
  /* Warisan: boolean tanpa identitas. Ia menyatakan "selesai" dan tidak dapat
     menjawab siapa yang menyelesaikannya — itu perlu terlihat, bukan disamarkan. */
  const legacy = rec[meta.legacy];
  if (legacy === true) return { key: meta.key, label: meta.label, meta, done: true, attributed: false };
  return { key: meta.key, label: meta.label, meta, done: false, attributed: false };
}

export function perfPersonOf(emp: string, rec: PerfPersonInput | undefined, goals: PerfGoal[] | undefined): PerfPerson {
  const r = rec || {};
  const score = perfScoreOf(goals);
  const pot = Number.isFinite(r.pot) ? (r.pot as number) : null;
  const stages = PERF_STAGES.map((m) => stageStateOf(r, m));
  /* Tahap dianggap berjalan berurutan: indeks = tahap pertama yang belum selesai. */
  const firstOpen = stages.findIndex((s) => !s.done);
  return {
    emp, score, pot,
    placement: nineBoxOf(score.score, pot),
    promote: r.promote || '—',
    stages,
    stageIndex: firstOpen === -1 ? PERF_STAGES.length : firstOpen,
    complete: firstOpen === -1,
    unattributed: stages.filter((s) => s.done && !s.attributed).map((s) => s.key),
    goals: goals || [],
  };
}

export function perfCycle(
  roster: { id: string }[] | undefined,
  people: Record<string, PerfPersonInput | undefined> | undefined,
  goals: Record<string, PerfGoal[] | undefined> | undefined,
): Record<string, PerfPerson> {
  const out: Record<string, PerfPerson> = {};
  for (const s of roster || []) {
    if (!s || !s.id || !(people || {})[s.id]) continue;
    out[s.id] = perfPersonOf(s.id, (people || {})[s.id], (goals || {})[s.id]);
  }
  return out;
}

/* ------------------------------------------------------------------
   4. Pemisahan tugas
   ------------------------------------------------------------------ */

export interface PerfActor {
  /** empId pengguna sesi; null bila akun tak terpetakan ke personel firma. */
  emp: string | null;
  /** Pemegang CAP.HR_MANAGE (Admin & HR Firma / Rekan). */
  canHrManage: boolean;
}

export interface PerfAdvanceCheck {
  ok: boolean;
  reason: string;
  stage: PerfStageKey | null;
}

/** Atasan langsung menurut garis pelaporan (`AMS.ORG`). */
export function managerOf(org: Record<string, { reports?: string | null }> | undefined, emp: string): string | null {
  const r = (org || {})[emp];
  return (r && r.reports) || null;
}

/**
 * Bolehkah `actor` membubuhkan tahap BERIKUTNYA untuk `person`?
 *
 * GAGAL-TERTUTUP: akun yang tak terpetakan ke personel firma tidak dapat
 * membubuhkan apa pun. Sebelumnya tak ada pemeriksaan sama sekali — satu
 * pengguna menekan tombol yang sama empat kali dan siklus tuntas.
 */
export function perfAdvanceCheck(
  person: PerfPerson,
  actor: PerfActor,
  org: Record<string, { reports?: string | null }> | undefined,
): PerfAdvanceCheck {
  if (person.complete) return { ok: false, reason: 'Siklus kinerja orang ini sudah tuntas.', stage: null };
  const meta = PERF_STAGES[person.stageIndex];
  const stage = meta.key;
  if (!actor.emp) {
    return { ok: false, reason: 'Identitas pengguna tidak terpetakan ke personel firma — tahapan kinerja tak dapat dibubuhkan.', stage };
  }
  const isSelf = actor.emp === person.emp;
  const mgr = managerOf(org, person.emp);
  const isManager = !!mgr && actor.emp === mgr;

  if (stage === 'self') {
    return isSelf
      ? { ok: true, reason: '', stage }
      : { ok: false, reason: 'Self-review hanya dapat diisi oleh yang dinilai sendiri.', stage };
  }
  if (isSelf) {
    return { ok: false, reason: `${meta.label} tidak dapat dibubuhkan oleh orang yang dinilai.`, stage };
  }
  if (stage === 'goals') {
    return isManager || actor.canHrManage
      ? { ok: true, reason: '', stage }
      : { ok: false, reason: 'Sasaran ditetapkan atasan langsung atau HR.', stage };
  }
  if (stage === 'manager') {
    /* HR SENGAJA tidak dapat menggantikan penilai: kalau HR boleh menandatangani
       reviu manajer, pemisahan tugasnya kembali jadi hiasan. */
    if (!mgr) return { ok: false, reason: 'Garis pelaporan orang ini belum ditetapkan — reviu manajer tak punya penilai yang sah.', stage };
    return isManager
      ? { ok: true, reason: '', stage }
      : { ok: false, reason: 'Reviu manajer hanya oleh atasan langsung menurut struktur organisasi.', stage };
  }
  /* calibration */
  if (!actor.canHrManage) return { ok: false, reason: 'Kalibrasi memerlukan kewenangan HR/Rekan (CAP.HR_MANAGE).', stage };
  if (isManager) return { ok: false, reason: 'Kalibrasi tidak dapat dilakukan oleh atasan langsung yang menilai — kalibrasi adalah lapis independen.', stage };
  return { ok: true, reason: '', stage };
}

/** Stempel baru untuk tahap yang dibubuhkan. */
export function perfStamp(actor: PerfActor, name: string | undefined, at: string): PerfStamp {
  return { by: actor.emp || undefined, byName: name, at };
}

/* ------------------------------------------------------------------
   5. Agregat siklus
   ------------------------------------------------------------------ */

export interface PerfCycleSummary {
  people: number;
  calibrated: number;
  pendingManager: number;
  /** Rata-rata skor DARI YANG DAPAT DIHITUNG saja; null bila tak satu pun. */
  avgScore: number | null;
  scored: number;
  unscored: number;
  promotionCandidates: number;
  /** Orang dengan tahap selesai yang tak ber-identitas. */
  unattributed: number;
}

export function perfCycleSummary(people: Record<string, PerfPerson>): PerfCycleSummary {
  const all = Object.values(people || {});
  const scored = all.filter((p) => p.score.score !== null);
  const sum = scored.reduce((a, p) => a + (p.score.score as number), 0);
  return {
    people: all.length,
    calibrated: all.filter((p) => p.complete).length,
    pendingManager: all.filter((p) => PERF_STAGES[p.stageIndex]?.key === 'manager').length,
    /* Sebelumnya rata-rata dibagi people.length tanpa memeriksa apa pun — daftar
       kosong menghasilkan NaN yang dirender apa adanya. */
    avgScore: scored.length ? Math.round((sum / scored.length) * 100) / 100 : null,
    scored: scored.length,
    unscored: all.length - scored.length,
    promotionCandidates: all.filter((p) => p.promote && p.promote !== '—').length,
    unattributed: all.filter((p) => p.unattributed.length > 0).length,
  };
}
