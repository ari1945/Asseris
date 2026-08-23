/* ============================================================
   Asseris — Penggunaan Pekerjaan Audit Internal (SA 610)
   Model kertas kerja + builder memo TERSEGEL. MURNI (tanpa Date/random/DOM),
   sehingga (input sama) → (hash segel sama) dan seluruhnya dapat diuji.

   Cacat yang ditutup modul ini (view_internalaudit.tsx sebelum arc ini):

     · MEMO YANG MEMBANTAH SCOPE-NYA SENDIRI. `amsExportPdf` dipanggil dengan
       `scopeId: firm.activeEngagement?.id` — perikatan AKTIF — sementara muka
       berkasnya mencetak `ENG-2025-014 · FY2025` sebagai literal dan
       `firm: 'KAP Wijaya Hartono & Rekan'`. Satu berkas bersegel yang scope-nya
       menunjuk satu perikatan dan mukanya menyebut perikatan lain. Ditambah
       `activeClient?.name || 'PT Sentosa Makmur Tbk'`: bila konteks kosong, memo
       SA 610 terbit atas nama entitas yang tidak sedang diaudit.
       → `iaMemoContext()` menurunkan SELURUH identitas dari SATU sumber, dan
         `sa610MemoBlockers()` menghentikan ekspor bila sumber itu tak lengkap.
       → tidak ada satu pun fallback bernama di berkas ini. Kosong tetap kosong.

     · KERTAS KERJA YANG LAHIR SUDAH TERISI KESIMPULAN. `IA_FACTORS_SEED` memuat
       skor 4/4/3, catatan naratif, dan sub-kriteria yang sudah dijawab ok/tidak
       — termasuk temuan sangat spesifik ("Skema bonus sebagian terkait KPI
       divisi"). Karena ter-persist, itu "hanya" nilai awal; tetapi nilai awal
       berupa KESIMPULAN mengubah pekerjaan auditor dari MEMBENTUK penilaian
       menjadi MENGOREKSI penilaian orang lain, atas klien yang mungkin belum ia
       lihat.
       → `IA_FACTOR_TEMPLATE()` memuat kerangka ¶16 saja: faktor, acuan, dan
         sub-kriteria sebagai PERTANYAAN. Nol skor, nol jawaban.

     · TIGA REGISTER YANG MENYATAKAN PEKERJAAN AUDIT YANG TAK PERNAH DILAKUKAN
       (arc IA7). `IA_USE_AREAS` memuat lima area penggunaan lengkap dengan
       `result: 'Memadai'` dan uraian dalam bentuk telah-dikerjakan ("SPI telah
       menguji … sepanjang tahun"); `IA_REPERF` memuat lima pos reperformansi
       beserta HASIL auditor dan jumlah pengecualian; `IA_DIRECT` memuat tiga
       INDIVIDU BERNAMA beserta penyelia, jam, dan status 'Selesai'. Ketiganya
       konstanta modul: identik untuk setiap klien, tanpa satu pun kontrol
       penyunting — yang tampil adalah satu-satunya yang bisa tampil.
       → register ter-persist per perikatan, diseed KOSONG, dapat disunting;
         disposisi adalah PILIHAN auditor, bukan nilai bawaan;
       → rujukan kertas kerja dipilih dari kertas kerja yang BENAR-BENAR ADA
         (`useAudit().workpapers`), bukan string bebas ('PR-3','A-2','C-1','PR-1',
         'B-4' — tak satu pun ada di `WORKPAPERS` maupun `WP_MODULE_MAP`);
       → mesin tidak MENGISI jawaban, ia MEMBANTAH jawaban yang tak konsisten:
         `iaUseAreaConflicts` (¶19), `iaDirectBlockers` (¶29/¶33/¶34),
         dan selisih reperformansi diuji terhadap ambang jelas-remeh perikatan.

   BUKAN pekerjaan modul ini (lihat docs/usulan-IA6-…): memindahkan skor ke
   `assessment_model` dan menyambungkan rantai sign-off `WpPanel`. Aritmetika
   skor di sini SENGAJA identik dengan yang sudah berjalan (rerata sederhana,
   ambang 3,5 / 2,5) — satu-satunya yang bertambah adalah keadaan BELUM DINILAI,
   yang sebelumnya mustahil karena seed selalu menyediakan angka.
   ============================================================ */

/* ------------------------------------------------------------------
   1 · Model kertas kerja
   ------------------------------------------------------------------ */

/** Satu sub-kriteria penilaian. `ok === null` = belum dinilai auditor. */
export interface IaSubCriterion {
  t: string;
  ok: boolean | null;
  /** catatan auditor atas sub-kriteria ini (kosong sampai ia menulisnya) */
  note?: string;
}

/** Satu faktor SA 610 ¶16. `v === null` = belum dinilai. */
export interface IaFactor {
  id: string;
  /** nama faktor */
  k: string;
  /** acuan paragraf SA 610 */
  ref: string;
  /** APA yang ditanyakan standar — teks acuan, bukan kesimpulan */
  ask: string;
  /** skor 1..5 auditor, atau null bila belum dinilai */
  v: number | null;
  /** justifikasi auditor (kosong sampai ia menulisnya) */
  note: string;
  subs: IaSubCriterion[];
}

/** Field profil fungsi audit internal KLIEN — label + placeholder, tanpa isi. */
export interface IaProfileField {
  key: keyof IaProfile;
  label: string;
  hint: string;
}

/**
 * Profil fungsi audit internal entitas. SELURUHNYA isian auditor.
 *
 * Grep yang dijalankan sebelum menulis ini (aturan BUKTI SEBELUM KLAIM):
 *   grep -rn "SPI\b|Satuan Pengawasan|iaFunction|internalAuditFunction|auditInternal" \
 *        migration/src/data*.ts migration/src/canon*.ts
 * → satu hasil, dan itu `SPI/IVS` (standar penilaian KJPP di canon_part2.ts:364),
 *   bukan fungsi audit internal klien. Tidak ada sumber data untuk profil ini di
 *   aplikasi; karena itu ia diisi auditor, bukan dijembatani ke data yang tak ada.
 */
export interface IaProfile {
  unit: string;
  reportLine: string;
  head: string;
  headcount: string;
  certified: string;
  charter: string;
  plan: string;
  methodology: string;
}

/** Rekaman bahwa kesimpulan penggunaan pekerjaan IA DIAMBIL — oleh siapa, kapan. */
export interface IaConclusion {
  by: string;
  at: string;
  /** rerata pada saat disimpulkan (0..5) */
  avg: number;
  /** label verdict pada saat disimpulkan */
  verdict: string;
}

/* ---- Register penggunaan pekerjaan (¶18–20), reperformansi (¶24), bantuan
   langsung (¶26–34). SELURUHNYA isian auditor; kosong sampai ia mengisinya. ---- */

/** Taksonomi pilihan. `''` SELALU berarti belum dijawab dan SELALU opsi pertama. */
export const IA_JUDGMENT_LEVELS = ['', 'Rendah', 'Sedang', 'Tinggi'] as const;
export const IA_RISK_LEVELS = ['', 'Rendah', 'Moderat', 'Signifikan'] as const;
export const IA_NATURE_KINDS = ['', 'Menggunakan hasil kerja', 'Menggunakan hasil kerja (terbatas)', 'Bantuan langsung', 'Tidak digunakan'] as const;
export const IA_EXTENT_LEVELS = ['', 'Rendah', 'Sedang', 'Tinggi'] as const;
export const IA_USE_RESULTS = ['', 'Memadai', 'Perlu Perluasan', 'Dikecualikan'] as const;
export const IA_REPERF_DISPOSITIONS = ['', 'Sesuai', 'Selisih di bawah ambang', 'Perlu Perluasan'] as const;
export const IA_REVIEW_LEVELS = ['', 'Belum', 'Sebagian', 'Penuh'] as const;
export const IA_DIRECT_STATUSES = ['', 'Direncanakan', 'Berlangsung', 'Selesai'] as const;

export type IaJudgment = (typeof IA_JUDGMENT_LEVELS)[number];
export type IaRisk = (typeof IA_RISK_LEVELS)[number];
export type IaNature = (typeof IA_NATURE_KINDS)[number];
export type IaExtent = (typeof IA_EXTENT_LEVELS)[number];
export type IaUseResult = (typeof IA_USE_RESULTS)[number];
export type IaReperfDisposition = (typeof IA_REPERF_DISPOSITIONS)[number];
export type IaReviewLevel = (typeof IA_REVIEW_LEVELS)[number];
export type IaDirectStatus = (typeof IA_DIRECT_STATUSES)[number];

/** Satu area tempat pekerjaan fungsi audit internal dipertimbangkan (¶18–20). */
export interface IaUseArea {
  id: string;
  area: string;
  assertion: string;
  judgment: IaJudgment;
  risk: IaRisk;
  nature: IaNature;
  extent: IaExtent;
  /** tingkat reperformansi direncanakan, 0..100; null = belum ditetapkan */
  reperfPct: number | null;
  result: IaUseResult;
  /** pertimbangan auditor atas area ini */
  note: string;
  /** `ref` kertas kerja yang BENAR-BENAR ADA di perikatan; '' = belum ditautkan */
  wpRef: string;
}

/** Satu pos pekerjaan IA yang direperform auditor (¶24). */
export interface IaReperfItem {
  id: string;
  /** `IaUseArea.id` — tautan, bukan nama area yang diketik ulang */
  areaId: string;
  item: string;
  iaConclusion: string;
  auditorResult: string;
  /** jumlah pengecualian yang ditemukan; null = belum diisi */
  exceptions: number | null;
  /** selisih moneter yang ditemukan (Rp penuh); null = tidak/belum dikuantifikasi */
  diffRp: number | null;
  disposition: IaReperfDisposition;
}

/** Satu individu fungsi audit internal yang memberi bantuan langsung (¶26–34). */
export interface IaDirectItem {
  id: string;
  name: string;
  task: string;
  supervisor: string;
  review: IaReviewLevel;
  /** jam yang diberikan; null = belum dicatat */
  hours: number | null;
  /** ¶29 — ancaman objektivitas & kompetensi individu dievaluasi */
  objectivityEvaluated: boolean;
  /** ¶33(a) — persetujuan tertulis entitas */
  entityConsent: boolean;
  /** ¶33(b) — persetujuan tertulis individu */
  individualConsent: boolean;
  status: IaDirectStatus;
}

/** Dokumen `internalAudit.v1` sesudah arc ini. */
export interface IaDoc {
  /** versi bentuk dokumen. Dinamai `ver`, bukan `v`, agar tak tertukar dengan
   *  skor faktor (`IaFactor.v`) — di layar maupun di gerbang yang memindainya.
   *  ver 3 (IA7) menambah tiga register; ver 2 & larik telanjang tetap terbaca. */
  ver: 3;
  factors: IaFactor[];
  profile: IaProfile;
  conclusion: IaConclusion | null;
  useAreas: IaUseArea[];
  reperf: IaReperfItem[];
  direct: IaDirectItem[];
}

/* ------------------------------------------------------------------
   2 · Kerangka SA 610 ¶16 — PERTANYAAN, bukan jawaban
   ------------------------------------------------------------------ */

/** Field profil yang dirender sebagai isian. Urutan = urutan tampil. */
export const IA_PROFILE_FIELDS: IaProfileField[] = [
  { key: 'unit',        label: 'Nama unit audit internal',   hint: 'mis. Satuan Pengawasan Intern' },
  { key: 'reportLine',  label: 'Garis pelaporan',            hint: 'fungsional & administratif' },
  { key: 'head',        label: 'Kepala fungsi audit internal', hint: 'nama & kualifikasi' },
  { key: 'headcount',   label: 'Jumlah personel',            hint: 'orang' },
  { key: 'certified',   label: 'Bersertifikat profesional',  hint: 'orang' },
  { key: 'charter',     label: 'Pengesahan piagam',          hint: 'tanggal' },
  { key: 'plan',        label: 'Dasar rencana kerja',        hint: 'mis. berbasis risiko, disetujui Komite Audit' },
  { key: 'methodology', label: 'Metodologi & pengendalian mutu', hint: 'mis. IPPF, manual, QAIP' },
];

/** Profil kosong — seluruh field '' . Tidak ada satu pun nilai bawaan. */
export function emptyIaProfile(): IaProfile {
  return { unit: '', reportLine: '', head: '', headcount: '', certified: '', charter: '', plan: '', methodology: '' };
}

/**
 * Kerangka evaluasi SA 610 ¶16. Tiga faktor, masing-masing dengan sub-kriteria
 * yang dirumuskan sebagai PERTANYAAN yang harus dijawab auditor.
 *
 * Fungsi (bukan konstanta) agar setiap perikatan memperoleh salinan sendiri —
 * konstanta bersama akan membuat suntingan satu perikatan bocor ke perikatan lain
 * lewat referensi objek yang sama.
 */
export function IA_FACTOR_TEMPLATE(): IaFactor[] {
  const sub = (t: string): IaSubCriterion => ({ t, ok: null, note: '' });
  return [
    {
      id: 'obj', k: 'Objektivitas', ref: '¶16(a)', v: null, note: '',
      ask: 'Sejauh mana status organisasi serta kebijakan & prosedur yang berlaku mendukung objektivitas fungsi audit internal?',
      subs: [
        sub('Kepada siapa fungsi audit internal melapor secara fungsional, dan apakah jalur itu menjaga objektivitasnya?'),
        sub('Adakah tanggung jawab operasional yang menimbulkan konflik kepentingan?'),
        sub('Adakah kebijakan rotasi dan deklarasi independensi bagi anggota fungsi audit internal?'),
        sub('Apakah remunerasi anggota terkait dengan kinerja area yang mereka audit?'),
        sub('Apakah fungsi ini bebas menentukan lingkup, melaksanakan pekerjaan, dan mengomunikasikan hasilnya?'),
      ],
    },
    {
      id: 'comp', k: 'Kompetensi', ref: '¶16(b)', v: null, note: '',
      ask: 'Sejauh mana fungsi audit internal memiliki pengetahuan, keterampilan, dan sumber daya yang memadai untuk pekerjaan yang akan digunakan?',
      subs: [
        sub('Berapa proporsi anggota yang bersertifikat profesional, dan sertifikasi apa?'),
        sub('Bagaimana pengalaman dan latar belakang teknis anggota dibanding area yang diaudit?'),
        sub('Adakah program pengembangan profesional berkelanjutan yang terdokumentasi?'),
        sub('Apakah kompetensi audit teknologi informasi memadai untuk lingkungan sistem entitas?'),
        sub('Apakah sumber daya fungsi ini memadai dibanding lingkup rencana kerjanya?'),
      ],
    },
    {
      id: 'sys', k: 'Pendekatan Sistematis & Disiplin', ref: '¶16(c)', v: null, note: '',
      ask: 'Sejauh mana fungsi audit internal menerapkan pendekatan yang sistematis dan disiplin, termasuk pengendalian mutu?',
      subs: [
        sub('Apakah perencanaan kerja berbasis risiko dan disetujui pihak yang berwenang?'),
        sub('Apakah program kerja, kertas kerja, dan supervisi terdokumentasi?'),
        sub('Apakah program penjaminan & peningkatan mutu (termasuk asesmen eksternal) berjalan?'),
        sub('Seberapa konsisten dokumentasi antar penugasan?'),
        sub('Apakah temuan dan tindak lanjutnya dipantau sampai selesai?'),
      ],
    },
  ];
}

/* ------------------------------------------------------------------
   3 · Kompatibilitas dokumen tersimpan
   ------------------------------------------------------------------ */

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function asText(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

/** Skor tersimpan yang sah = bilangan 1..5. Selain itu → belum dinilai. */
function asScore(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) && v >= 1 && v <= 5 ? v : null;
}

function asOk(v: unknown): boolean | null {
  return typeof v === 'boolean' ? v : null;
}

function asFlag(v: unknown): boolean {
  return v === true;
}

/** Angka tersimpan yang sah, atau null. `min`/`max` opsional (di luar rentang → null). */
function asNum(v: unknown, min?: number, max?: number): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  if (min !== undefined && v < min) return null;
  if (max !== undefined && v > max) return null;
  return v;
}

/** Nilai taksonomi yang dikenali, atau `''` (belum dijawab). Tak pernah menebak. */
function asChoice<T extends string>(v: unknown, allowed: readonly T[]): T {
  const t = asText(v);
  return (allowed as readonly string[]).includes(t) ? (t as T) : (allowed[0] as T);
}

/* Register dibaca per-BARIS dan per-FIELD. Baris tanpa `id` dibuang: tanpa id ia
   tak dapat disunting maupun dihapus, dan tautan reperformansi→area akan putus. */
function normalizeUseAreas(v: unknown): IaUseArea[] {
  const out: IaUseArea[] = [];
  for (const row of Array.isArray(v) ? v : []) {
    const r = asRecord(row);
    const id = asText(r.id);
    if (!id) continue;
    out.push({
      id,
      area: asText(r.area),
      assertion: asText(r.assertion),
      judgment: asChoice(r.judgment, IA_JUDGMENT_LEVELS),
      risk: asChoice(r.risk, IA_RISK_LEVELS),
      nature: asChoice(r.nature, IA_NATURE_KINDS),
      extent: asChoice(r.extent, IA_EXTENT_LEVELS),
      reperfPct: asNum(r.reperfPct, 0, 100),
      result: asChoice(r.result, IA_USE_RESULTS),
      note: asText(r.note),
      wpRef: asText(r.wpRef),
    });
  }
  return out;
}

function normalizeReperf(v: unknown): IaReperfItem[] {
  const out: IaReperfItem[] = [];
  for (const row of Array.isArray(v) ? v : []) {
    const r = asRecord(row);
    const id = asText(r.id);
    if (!id) continue;
    out.push({
      id,
      areaId: asText(r.areaId),
      item: asText(r.item),
      iaConclusion: asText(r.iaConclusion),
      auditorResult: asText(r.auditorResult),
      exceptions: asNum(r.exceptions, 0),
      diffRp: asNum(r.diffRp),
      disposition: asChoice(r.disposition, IA_REPERF_DISPOSITIONS),
    });
  }
  return out;
}

function normalizeDirect(v: unknown): IaDirectItem[] {
  const out: IaDirectItem[] = [];
  for (const row of Array.isArray(v) ? v : []) {
    const r = asRecord(row);
    const id = asText(r.id);
    if (!id) continue;
    out.push({
      id,
      name: asText(r.name),
      task: asText(r.task),
      supervisor: asText(r.supervisor),
      review: asChoice(r.review, IA_REVIEW_LEVELS),
      hours: asNum(r.hours, 0),
      objectivityEvaluated: asFlag(r.objectivityEvaluated),
      entityConsent: asFlag(r.entityConsent),
      individualConsent: asFlag(r.individualConsent),
      status: asChoice(r.status, IA_DIRECT_STATUSES),
    });
  }
  return out;
}

/**
 * Baca dokumen `internalAudit.v1` apa pun bentuknya menjadi `IaDoc`.
 *
 * JALUR KOMPATIBILITAS. Sebelum arc ini kuncinya menyimpan LARIK faktor telanjang
 * (`IA_FACTORS_SEED` hasil suntingan). Dokumen itu masih ada di localStorage &
 * StateDoc perikatan yang sudah dipakai; membuangnya berarti menghapus penilaian
 * yang benar-benar dikerjakan auditor. Karena itu:
 *   · larik  → dibaca sebagai `factors`, profil kosong, tanpa kesimpulan;
 *   · objek  → dibaca apa adanya;
 *   · selain itu (null/undefined/sampah) → kerangka kosong.
 * Faktor dicocokkan per `id` terhadap kerangka: TEKS pertanyaan selalu berasal
 * dari kerangka (agar rumusan standar ikut terperbarui), sedangkan SKOR, CATATAN,
 * dan JAWABAN sub-kriteria selalu berasal dari dokumen tersimpan.
 */
export function normalizeIaDoc(stored: unknown): IaDoc {
  const raw = Array.isArray(stored) ? { factors: stored } : asRecord(stored);
  const storedFactors: unknown[] = Array.isArray(raw.factors) ? (raw.factors as unknown[]) : [];
  const byId = new Map<string, Record<string, unknown>>();
  for (const f of storedFactors) {
    const r = asRecord(f);
    const id = asText(r.id);
    if (id) byId.set(id, r);
  }

  const factors = IA_FACTOR_TEMPLATE().map((tpl) => {
    const old = byId.get(tpl.id);
    if (!old) return tpl;
    const oldSubs: unknown[] = Array.isArray(old.subs) ? (old.subs as unknown[]) : [];
    return {
      ...tpl,
      v: asScore(old.v),
      note: asText(old.note),
      /* Sub-kriteria dicocokkan per POSISI: id-nya tak pernah ada di bentuk lama.
         Kerangka baru lebih panjang dari yang lama (5 vs 4) — posisi yang tak
         punya pasangan tetap belum-dinilai, bukan diisi tebakan. */
      subs: tpl.subs.map((s, i) => {
        const o = asRecord(oldSubs[i]);
        return { ...s, ok: asOk(o.ok), note: asText(o.note) };
      }),
    };
  });

  const p = asRecord(raw.profile);
  const base = emptyIaProfile();
  const profile: IaProfile = { ...base };
  (Object.keys(base) as Array<keyof IaProfile>).forEach((k) => { profile[k] = asText(p[k]); });

  const c = asRecord(raw.conclusion);
  const by = asText(c.by), at = asText(c.at);
  const conclusion: IaConclusion | null = by && at
    ? { by, at, avg: typeof c.avg === 'number' && Number.isFinite(c.avg) ? c.avg : 0, verdict: asText(c.verdict) }
    : null;

  /* ver <= 2 (dan larik telanjang) tak punya register — ketiganya lahir KOSONG,
     bukan diisi contoh. Dokumen ver 3 dibaca apa adanya. */
  return {
    ver: 3, factors, profile, conclusion,
    useAreas: normalizeUseAreas(raw.useAreas),
    reperf: normalizeReperf(raw.reperf),
    direct: normalizeDirect(raw.direct),
  };
}

/* ------------------------------------------------------------------
   3b · Baris baru & penomorannya (MURNI — tanpa Date/random)
   ------------------------------------------------------------------ */

/**
 * Nomor urut berikutnya untuk sebuah awalan id. Diturunkan dari register yang ADA,
 * bukan dari `list.length`: menghapus baris tengah lalu menambah baris baru akan
 * melahirkan id KEMBAR bila panjang larik yang dipakai — dan id kembar memutus
 * tautan reperformansi→area ke baris yang salah.
 */
export function nextIaSeq(ids: readonly string[], prefix: string): number {
  /* Sengaja TIDAK memakai `new RegExp('^' + prefix + …)`: pola yang dirakit dari
     string membuat awalan ikut diperlakukan sebagai regex, dan satu escape yang
     hilang menghasilkan pola yang tak pernah cocok — kegagalan yang DIAM (setiap
     baris baru bernomor 01, id kembar, tautan reperformansi→area salah sasaran).
     Awalan dipotong apa adanya; hanya sisanya yang diuji. */
  let max = 0;
  for (const id of ids) {
    if (!id || id.slice(0, prefix.length) !== prefix) continue;
    const tail = id.slice(prefix.length);
    if (!/^[0-9]+$/.test(tail)) continue;
    max = Math.max(max, Number(tail));
  }
  return max + 1;
}

const pad2 = (n: number): string => (n < 10 ? '0' + n : String(n));

export function newIaUseArea(existing: readonly IaUseArea[]): IaUseArea {
  return {
    id: 'IA-U-' + pad2(nextIaSeq(existing.map((x) => x.id), 'IA-U-')),
    area: '', assertion: '', judgment: '', risk: '', nature: '', extent: '',
    reperfPct: null, result: '', note: '', wpRef: '',
  };
}

export function newIaReperfItem(existing: readonly IaReperfItem[]): IaReperfItem {
  return {
    id: 'IA-RP-' + pad2(nextIaSeq(existing.map((x) => x.id), 'IA-RP-')),
    areaId: '', item: '', iaConclusion: '', auditorResult: '',
    exceptions: null, diffRp: null, disposition: '',
  };
}

export function newIaDirectItem(existing: readonly IaDirectItem[]): IaDirectItem {
  return {
    id: 'IA-DA-' + pad2(nextIaSeq(existing.map((x) => x.id), 'IA-DA-')),
    name: '', task: '', supervisor: '', review: '', hours: null,
    objectivityEvaluated: false, entityConsent: false, individualConsent: false, status: '',
  };
}

/* ------------------------------------------------------------------
   4 · Skor & verdict
   ------------------------------------------------------------------ */

export interface IaScore {
  /** rerata 0..5, atau null bila BELUM SELURUH faktor dinilai */
  avg: number | null;
  scored: number;
  total: number;
}

/**
 * Rerata skor tiga faktor ¶16.
 *
 * `avg` sengaja null selama masih ada faktor yang belum dinilai: SA 610 ¶16
 * menuntut KETIGA faktor dievaluasi sebelum pekerjaan fungsi audit internal
 * boleh digunakan, sehingga rerata atas sebagian faktor adalah angka yang
 * terbaca sebagai keputusan padahal belum ada keputusan.
 *
 * Aritmetikanya sendiri TIDAK berubah dari yang berjalan sebelum arc ini
 * (rerata sederhana atas seluruh faktor).
 */
export function iaScore(factors: IaFactor[] | null | undefined): IaScore {
  const f = factors || [];
  const scored = f.filter((x) => typeof x.v === 'number').length;
  const total = f.length;
  if (!total || scored < total) return { avg: null, scored, total };
  return { avg: f.reduce((s, x) => s + (x.v || 0), 0) / total, scored, total };
}

export type IaVerdictKind = 'green' | 'amber' | 'red' | 'gray';

export interface IaVerdict {
  k: IaVerdictKind;
  label: string;
  t: string;
  /** verdict yang benar-benar merupakan keputusan (bukan keadaan "belum") */
  decided: boolean;
}

/**
 * Verdict dari rerata. Ambang IDENTIK dengan yang berjalan sebelum arc ini
 * (≥3,5 hijau · ≥2,5 amber · <2,5 merah); yang bertambah hanyalah keadaan
 * BELUM DINILAI, yang dulu mustahil karena seed selalu menyediakan angka.
 */
export function iaVerdict(avg: number | null): IaVerdict {
  if (avg === null) {
    return {
      k: 'gray', decided: false, label: 'Belum Dinilai',
      t: 'Ketiga faktor SA 610 ¶16 belum selesai dinilai. Keputusan penggunaan pekerjaan fungsi audit internal belum dapat diambil.',
    };
  }
  if (avg >= 3.5) {
    return {
      k: 'green', decided: true, label: 'Dapat Diandalkan',
      t: 'Ketiga faktor SA 610 ¶16 dinilai memadai. Pekerjaan dapat digunakan dengan reperformansi atas sebagian, kecuali area pertimbangan signifikan (¶15).',
    };
  }
  if (avg >= 2.5) {
    return {
      k: 'amber', decided: true, label: 'Andalan Terbatas',
      t: 'Penggunaan terbatas — perluas reperformansi & evaluasi per area. Area pertimbangan signifikan dikerjakan sendiri oleh tim audit.',
    };
  }
  return {
    k: 'red', decided: true, label: 'Tidak Dapat Diandalkan',
    t: 'Faktor SA 610 ¶16 tidak terpenuhi — laksanakan seluruh prosedur audit secara mandiri.',
  };
}

/* ------------------------------------------------------------------
   5 · Pelaku kesimpulan
   ------------------------------------------------------------------ */

/** Bentuk minimal `auth.user` yang dibutuhkan atribusi tulis. */
export interface IaSessionUser { id?: string; name?: string }

/**
 * Nama pelaku dari SESI, atau null bila sesi tak menyediakannya.
 *
 * Aturan yang SAMA dengan `glActor` (firm_gl_actor.ts): untuk ATRIBUSI TULIS,
 * `useCurrentAuditor()` bukan alatnya — ia sengaja jatuh kembali ke `AMS.USER`
 * (data seed) karena tugasnya memfilter kepemilikan tampilan, di mana tebakan
 * yang meleset tak merusak apa pun. Kesimpulan atas penggunaan pekerjaan fungsi
 * audit internal adalah pernyataan yang dipertanggungjawabkan seseorang; jejak
 * yang salah orang di sana lebih buruk daripada tidak ada jejak, karena ia
 * terbaca seolah-olah terbukti.
 */
export function iaActor(user: IaSessionUser | null | undefined): string | null {
  if (!user) return null;
  const name = typeof user.name === 'string' ? user.name.trim() : '';
  return name ? name : null;
}

/** Alasan tombol "Simpulkan" tak dapat dipakai, atau '' bila dapat. */
export function iaConcludeBlockReason(verdict: IaVerdict, actor: string | null): string {
  if (!verdict.decided) return 'Ketiga faktor SA 610 ¶16 harus dinilai lebih dulu sebelum kesimpulan dapat diambil';
  if (!actor) return 'Identitas sesi tidak tersedia — kesimpulan tidak direkam agar jejaknya tidak mencatat nama yang salah';
  return '';
}

/* ------------------------------------------------------------------
   5b · Mesin yang MEMBANTAH, bukan yang mengisi

   Perbedaan ini yang membuat register berhenti jadi karangan. Mesin di bawah
   TIDAK menjawab satu pun pertanyaan auditor; ia membaca jawaban yang sudah
   ditulis dan menyatakan ketika jawaban itu bertentangan dengan SA 610 atau
   dengan angka perikatan. Auditor tetap boleh mengirim jawaban yang dibantah —
   yang tak boleh adalah bantahan itu tidak terlihat.
   ------------------------------------------------------------------ */

/** Bentuk penggunaan yang berarti auditor MENGANDALKAN pekerjaan fungsi IA. */
const RELIANT_NATURES: readonly IaNature[] = ['Menggunakan hasil kerja', 'Menggunakan hasil kerja (terbatas)', 'Bantuan langsung'];

export function iaAreaIsReliant(a: IaUseArea): boolean {
  return RELIANT_NATURES.includes(a.nature);
}

/**
 * Pertentangan pada satu area penggunaan. Kosong = tidak ada yang membantah.
 *
 * ¶19 menuntut auditor merencanakan penggunaan yang LEBIH SEDIKIT dan pekerjaan
 * langsung yang LEBIH BANYAK ketika pertimbangan yang terlibat makin besar dan
 * risiko salah saji material makin tinggi; ¶18 menuntut auditor tetap membuat
 * SELURUH pertimbangan signifikan sendiri. Kombinasi "pertimbangan tinggi +
 * tetap diandalkan" adalah jawaban yang membantah dirinya sendiri — dan sebelum
 * register ini, jawaban semacam itulah yang tertulis di layar sebagai fakta.
 */
export function iaUseAreaConflicts(a: IaUseArea): string[] {
  const out: string[] = [];
  const reliant = iaAreaIsReliant(a);
  if (a.judgment === 'Tinggi' && reliant) {
    out.push('Pertimbangan tinggi tetapi pekerjaan fungsi audit internal tetap diandalkan — SA 610 ¶18 menuntut auditor membuat seluruh pertimbangan signifikan sendiri');
  }
  if (a.risk === 'Signifikan' && a.extent === 'Tinggi' && reliant) {
    out.push('Risiko signifikan dengan tingkat penggunaan tinggi — SA 610 ¶19 menuntut penggunaan yang lebih sedikit ketika risiko lebih tinggi');
  }
  if (a.result === 'Dikecualikan' && reliant) {
    out.push('Hasil "Dikecualikan" tidak konsisten dengan bentuk penggunaan yang mengandalkan pekerjaan fungsi audit internal');
  }
  if (reliant && a.reperfPct === 0) {
    out.push('Pekerjaan diandalkan tanpa reperformansi sama sekali — SA 610 ¶24 menuntut auditor melaksanakan kembali sebagian pekerjaan yang digunakan');
  }
  if (a.result !== '' && a.nature === '') {
    out.push('Hasil sudah disimpulkan sebelum bentuk penggunaan ditentukan');
  }
  return out;
}

/** Area yang belum lengkap untuk dapat disimpulkan (dipakai meter kelengkapan). */
export function iaUseAreaIncomplete(a: IaUseArea): boolean {
  return !a.area.trim() || a.judgment === '' || a.risk === '' || a.nature === '' || a.result === '';
}

/**
 * Dampak terhadap strategi & lingkup audit (¶18) — DITURUNKAN dari jawaban
 * auditor atas area itu sendiri. Sebelum arc ini tabel dampak adalah lima baris
 * literal ("40 sampel sendiri" menjadi "20 sampel + reperform 20%") yang tak
 * pernah bergerak mengikuti satu pun keputusan.
 */
export function iaUseAreaImpact(a: IaUseArea): string {
  if (a.nature === '') return 'Belum ditentukan';
  if (!iaAreaIsReliant(a)) return 'Tidak berubah';
  if (a.result === 'Dikecualikan') return 'Tidak berubah';
  if (a.result === 'Perlu Perluasan') return 'Prosedur diperluas';
  if (a.result === 'Memadai') return 'Efisiensi';
  return 'Belum disimpulkan';
}

/* ---- Reperformansi (¶24) ---- */

export type IaDiffVerdict = 'unknown' | 'below' | 'above';

/**
 * Apakah selisih yang ditemukan berada di bawah ambang JELAS REMEH perikatan?
 *
 * Sebelum arc ini jawabannya ditulis ke dalam string status ('Selisih < CTT') —
 * pernyataan tentang ambang yang tak pernah dibaca dari mana pun. Sekarang ia
 * diuji terhadap `useMateriality().cttFull` perikatan aktif. Tanpa ambang atau
 * tanpa selisih terkuantifikasi, jawabannya 'unknown' — bukan 'below'.
 */
export function iaDiffAgainstCtt(diffRp: number | null, cttFull: number | null): IaDiffVerdict {
  if (diffRp === null || cttFull === null || !Number.isFinite(cttFull) || cttFull <= 0) return 'unknown';
  return Math.abs(diffRp) < cttFull ? 'below' : 'above';
}

/** Pertentangan pada satu pos reperformansi. */
export function iaReperfConflicts(r: IaReperfItem, cttFull: number | null): string[] {
  const out: string[] = [];
  const v = iaDiffAgainstCtt(r.diffRp, cttFull);
  if (r.disposition === 'Selisih di bawah ambang' && v === 'above') {
    out.push('Selisih yang dicatat MELAMPAUI ambang jelas-remeh perikatan');
  }
  if (r.disposition === 'Selisih di bawah ambang' && v === 'unknown') {
    out.push('Selisih belum dikuantifikasi (atau ambang jelas-remeh perikatan belum tersedia), sehingga klaim "di bawah ambang" tak dapat diuji');
  }
  if (r.disposition === 'Sesuai' && (r.exceptions || 0) > 0) {
    out.push('Disposisi "Sesuai" sementara pengecualian yang ditemukan bukan nol');
  }
  if (r.disposition !== '' && !r.auditorResult.trim()) {
    out.push('Disposisi diisi tanpa hasil pelaksanaan ulang oleh auditor');
  }
  return out;
}

export interface IaReperfSummary {
  total: number;
  agreed: number;
  exceptions: number;
  expand: number;
  conflicts: number;
}

export function iaReperfSummarize(list: readonly IaReperfItem[], cttFull: number | null): IaReperfSummary {
  const rows = list || [];
  return {
    total: rows.length,
    agreed: rows.filter((r) => r.disposition === 'Sesuai').length,
    exceptions: rows.reduce((n, r) => n + (r.exceptions || 0), 0),
    expand: rows.filter((r) => r.disposition === 'Perlu Perluasan').length,
    conflicts: rows.filter((r) => iaReperfConflicts(r, cttFull).length > 0).length,
  };
}

/** Area yang DIANDALKAN tetapi belum punya satu pun pos reperformansi (¶24). */
export function iaAreasWithoutReperf(areas: readonly IaUseArea[], reperf: readonly IaReperfItem[]): IaUseArea[] {
  const covered = new Set((reperf || []).map((r) => r.areaId).filter(Boolean));
  return (areas || []).filter((a) => iaAreaIsReliant(a) && !covered.has(a.id));
}

/* ---- Bantuan langsung (¶26–34) ---- */

/**
 * Prasyarat yang BELUM terpenuhi untuk satu baris bantuan langsung.
 *
 * ¶29 menuntut evaluasi ancaman objektivitas & kompetensi individu SEBELUM
 * bantuan diberikan; ¶33 menuntut persetujuan tertulis entitas DAN individu;
 * ¶34 menuntut arahan, supervisi & reviu auditor. Sebelum arc ini keempatnya
 * dirender sebagai empat centang hijau yang dipaku — panel "Prasyarat" tak
 * pernah dapat merah, sementara tabel di sebelahnya sudah berstatus 'Selesai'.
 */
export function iaDirectBlockers(d: IaDirectItem): string[] {
  const out: string[] = [];
  if (!d.objectivityEvaluated) out.push('Ancaman objektivitas & kompetensi individu belum dievaluasi (¶29)');
  if (!d.entityConsent) out.push('Persetujuan tertulis entitas belum diperoleh (¶33(a))');
  if (!d.individualConsent) out.push('Persetujuan tertulis individu belum diperoleh (¶33(b))');
  if (!d.supervisor.trim()) out.push('Penyelia dari tim audit belum ditetapkan (¶34)');
  return out;
}

/**
 * Alasan sebuah status TIDAK BOLEH dipilih untuk baris ini. Kosong = boleh.
 *
 * Pekerjaan tidak boleh berjalan sebelum prasyarat ¶29/¶33 terpenuhi, dan tidak
 * boleh dinyatakan selesai sebelum direviu penuh (¶34).
 */
export function iaDirectStatusBlockReason(d: IaDirectItem, status: IaDirectStatus): string {
  if (status === '' || status === 'Direncanakan') return '';
  const missing = iaDirectBlockers(d);
  if (missing.length) return 'Prasyarat belum terpenuhi — ' + missing.join('; ');
  if (status === 'Selesai' && d.review !== 'Penuh') {
    return 'Pekerjaan bantuan langsung hanya dapat dinyatakan selesai setelah direviu PENUH oleh auditor (¶34)';
  }
  return '';
}

/** Baris yang statusnya sudah terlanjur melampaui prasyaratnya (dokumen warisan). */
export function iaDirectViolations(list: readonly IaDirectItem[]): Array<{ id: string; name: string; reason: string }> {
  const out: Array<{ id: string; name: string; reason: string }> = [];
  for (const d of list || []) {
    const reason = iaDirectStatusBlockReason(d, d.status);
    if (reason) out.push({ id: d.id, name: d.name || d.id, reason });
  }
  return out;
}

export function iaDirectHours(list: readonly IaDirectItem[]): number {
  return (list || []).reduce((n, d) => n + (d.hours || 0), 0);
}

/* ---- Dokumentasi (¶36–37) ---- */

export interface IaDocRequirement { t: string; ref: string; done: boolean }

/**
 * Daftar simak dokumentasi SA 610 ¶36–37, DITURUNKAN dari isi kertas kerja.
 *
 * Sebelum arc ini keempat butir ini dirender bersama rujukan berkas 'A-610.1'
 * sampai 'A-610.4' — indeks arsip yang tak ada di register kertas kerja mana
 * pun, dan tak satu pun butir punya keadaan "belum".
 */
export function iaDocumentationChecklist(doc: IaDoc): IaDocRequirement[] {
  return [
    { t: 'Evaluasi objektivitas, kompetensi & pendekatan sistematis fungsi audit internal', ref: '¶36(a)',
      done: iaScore(doc.factors).avg !== null },
    { t: 'Sifat & luas pekerjaan fungsi audit internal yang digunakan, beserta dasarnya', ref: '¶36(b)',
      done: doc.useAreas.some((a) => !iaUseAreaIncomplete(a)) },
    { t: 'Prosedur audit yang dilaksanakan untuk mengevaluasi kecukupan pekerjaan yang digunakan', ref: '¶36(c)',
      done: doc.reperf.some((r) => r.disposition !== '') },
    { t: 'Evaluasi & persetujuan tertulis terkait bantuan langsung, bila digunakan', ref: '¶37',
      done: doc.direct.length === 0 || doc.direct.every((d) => iaDirectBlockers(d).length === 0) },
    { t: 'Kesimpulan auditor atas penggunaan pekerjaan fungsi audit internal', ref: '¶36',
      done: doc.conclusion !== null },
  ];
}

/* ------------------------------------------------------------------
   6 · Identitas memo — SATU sumber dengan `scopeId`
   ------------------------------------------------------------------ */

export interface IaEngagementLike { id?: string; clientId?: string; fy?: string; partner?: string }
export interface IaClientLike { id?: string; name?: string }
export interface IaFirmLike {
  activeEngagementId?: string;
  activeEngagement?: IaEngagementLike | null;
  activeClient?: IaClientLike | null;
}

/**
 * Identitas perikatan aktif untuk memo SA 610.
 *
 * `engagementId` di sini adalah SATU-SATUNYA sumber `scopeId` segel MAUPUN nomor
 * perikatan yang tercetak di muka berkas. Itulah inti perbaikannya: sebelum arc
 * ini keduanya berasal dari tempat berbeda, sehingga berkas bersegel dapat
 * menyebut satu perikatan pada mukanya dan perikatan lain pada scope-nya.
 *
 * Field yang tak tersedia dikembalikan '' — TIDAK diganti nama entitas mana pun.
 */
export interface IaMemoContext {
  firmName: string;
  clientName: string;
  clientId: string;
  engagementId: string;
  cycle: string;
  partner: string;
}

export function iaMemoContext(firm: IaFirmLike | null | undefined, firmName: unknown): IaMemoContext {
  const eng = (firm && firm.activeEngagement) || null;
  const cli = (firm && firm.activeClient) || null;
  return {
    firmName: asText(firmName).trim(),
    clientName: asText(cli && cli.name).trim(),
    clientId: asText(cli && cli.id).trim(),
    engagementId: asText((eng && eng.id) || (firm && firm.activeEngagementId)).trim(),
    cycle: asText(eng && eng.fy).trim(),
    partner: asText(eng && eng.partner).trim(),
  };
}

/**
 * Alasan memo SA 610 TIDAK dapat diterbitkan. Kosong = boleh terbit.
 *
 * Berkas bersegel membawa identitas ke luar aplikasi dan tidak dapat ditarik
 * kembali. Bila identitasnya tak diketahui, yang benar adalah TIDAK menerbitkan
 * berkas — bukan menerbitkannya atas nama pihak yang kebetulan ada di seed.
 */
export function sa610MemoBlockers(ctx: IaMemoContext): string[] {
  const out: string[] = [];
  if (!ctx.engagementId) out.push('Perikatan aktif tidak diketahui');
  if (!ctx.clientName) out.push('Nama klien perikatan aktif tidak tersedia');
  if (!ctx.cycle) out.push('Siklus/tahun buku perikatan tidak tersedia');
  if (!ctx.firmName) out.push('Identitas KAP tidak tersedia');
  return out;
}

/** Kalimat siap-pakai untuk `title` tombol ekspor yang terkunci. */
export function sa610ExportBlockReason(blockers: string[]): string {
  if (!blockers.length) return '';
  return 'Memo tersegel tidak diterbitkan — ' + blockers.join('; ')
    + '. Identitas pada muka berkas harus berasal dari perikatan yang sama dengan yang menyegelnya.';
}

/* ------------------------------------------------------------------
   7 · Payload memo
   ------------------------------------------------------------------ */

export type IaPdfBlock =
  | { type: 'heading'; text: string }
  | { type: 'para'; text: string }
  | { type: 'kv'; rows: string[][] }
  | { type: 'table'; head: string[]; body: string[][] };

export interface Sa610MemoInput {
  ctx: IaMemoContext;
  factors: IaFactor[];
  profile: IaProfile;
  score: IaScore;
  verdict: IaVerdict;
  conclusion: IaConclusion | null;
  /** register penggunaan pekerjaan (¶18–20) — kosong bila auditor belum mengisinya */
  useAreas: IaUseArea[];
  /** register reperformansi (¶24) */
  reperf: IaReperfItem[];
  /** register bantuan langsung (¶26–34) */
  direct: IaDirectItem[];
  /** ambang jelas-remeh perikatan (Rp penuh) — dari kanon materialitas, bukan literal */
  cttFull: number | null;
  /** tanggal terbit memo (YYYY-MM-DD) — dari klok aplikasi, bukan jam mesin */
  date: string;
}

const dash = (s: string): string => (s && s.trim()) || '—';
const num = (n: number | null, suffix = ''): string => (n === null ? '—' : String(n) + suffix);

export function sa610MemoTitle(i: Sa610MemoInput): string {
  return `Memo — Penggunaan Pekerjaan Audit Internal (SA 610) — ${i.ctx.clientName}`;
}

export function sa610MemoRefNo(i: Sa610MemoInput): string {
  return `A-610/${i.ctx.engagementId}/${i.ctx.cycle}`;
}

export function sa610MemoFileName(i: Sa610MemoInput): string {
  return `Memo SA 610 - ${i.ctx.clientName} - ${i.ctx.engagementId}.pdf`;
}

/**
 * Baris identitas muka berkas. SETIAP baris turunan `ctx` — sumber yang sama
 * dengan `scopeId`. Mengganti perikatan aktif menggeser seluruh baris ini.
 */
export function sa610MemoMeta(i: Sa610MemoInput): string[] {
  return [
    `${i.ctx.clientName} · ${i.ctx.engagementId} · ${i.ctx.cycle} · SA 610 (Revisi 2013)`,
    `Rekan Perikatan: ${dash(i.ctx.partner)}`,
    i.score.avg === null
      ? `Evaluasi ¶16: ${i.score.scored}/${i.score.total} faktor dinilai · ${i.verdict.label}`
      : `Rata-rata evaluasi ${i.score.avg.toFixed(1)}/5 · Keputusan: ${i.verdict.label}`,
  ];
}

const okLabel = (ok: boolean | null): string => (ok === null ? 'Belum dinilai' : ok ? 'Terpenuhi' : 'Perhatian');
const yesNo = (b: boolean): string => (b ? 'Ya' : 'Belum');

/**
 * Blok memo. Register yang KOSONG dinyatakan kosong — memo tidak boleh
 * menghilangkan bagian yang belum dikerjakan, karena bagian yang hilang terbaca
 * sebagai bagian yang tak berlaku.
 */
export function buildSa610Blocks(i: Sa610MemoInput): IaPdfBlock[] {
  const profileRows = IA_PROFILE_FIELDS.map((f) => [f.label, dash(i.profile[f.key])]);
  const blocks: IaPdfBlock[] = [
    { type: 'heading', text: '1. Fungsi Audit Internal Entitas' },
    { type: 'kv', rows: profileRows },
    { type: 'heading', text: '2. Evaluasi Fungsi Audit Internal (SA 610 ¶16)' },
    {
      type: 'table',
      head: ['Faktor', 'Acuan', 'Skor', 'Catatan Auditor'],
      /* `f.k` — bukan `f.label`. Sebelum arc ini kolom pertama tabel ini berbunyi
         `f.label`, field yang TIDAK PERNAH ADA pada faktor: seluruh nama faktor
         terbit sebagai sel kosong di dalam berkas TERSEGEL. */
      body: i.factors.map((f) => [f.k, f.ref, f.v === null ? '—' : `${f.v}/5`, dash(f.note)]),
    },
    { type: 'heading', text: '3. Sub-kriteria yang Dinilai' },
    {
      type: 'table',
      head: ['Faktor', 'Sub-kriteria', 'Status', 'Catatan'],
      body: i.factors.flatMap((f) => f.subs.map((s) => [f.k, s.t, okLabel(s.ok), dash(s.note || '')])),
    },
  ];

  /* --- 4. Area penggunaan (¶18–20) --- */
  blocks.push({ type: 'heading', text: '4. Area Penggunaan Pekerjaan Fungsi Audit Internal (¶18–20)' });
  if (!i.useAreas.length) {
    blocks.push({ type: 'para', text: 'Belum ada area penggunaan yang dicatat pada perikatan ini.' });
  } else {
    blocks.push({
      type: 'table',
      head: ['Ref', 'Area / Prosedur', 'Asersi', 'Pertimbangan', 'Risiko', 'Bentuk Penggunaan', 'Tingkat', 'Reperformansi', 'Hasil', 'KK'],
      body: i.useAreas.map((a) => [
        a.id, dash(a.area), dash(a.assertion), dash(a.judgment), dash(a.risk),
        dash(a.nature), dash(a.extent), num(a.reperfPct, '%'), dash(a.result), dash(a.wpRef),
      ]),
    });
    const conflicts = i.useAreas.flatMap((a) => iaUseAreaConflicts(a).map((c) => [a.id, c]));
    if (conflicts.length) {
      blocks.push({ type: 'para', text: 'Pertentangan yang belum diselesaikan pada register di atas:' });
      blocks.push({ type: 'table', head: ['Ref', 'Pertentangan'], body: conflicts });
    }
    const notes = i.useAreas.filter((a) => a.note.trim()).map((a) => [a.id, a.note.trim()]);
    if (notes.length) {
      blocks.push({ type: 'table', head: ['Ref', 'Pertimbangan Auditor'], body: notes });
    }
  }

  /* --- 5. Reperformansi (¶24) --- */
  blocks.push({ type: 'heading', text: '5. Reperformansi atas Pekerjaan yang Digunakan (¶24)' });
  if (!i.reperf.length) {
    blocks.push({ type: 'para', text: 'Belum ada pos reperformansi yang dicatat pada perikatan ini.' });
  } else {
    blocks.push({
      type: 'table',
      head: ['Ref', 'Area', 'Pos yang Direperform', 'Simpulan Fungsi IA', 'Hasil Auditor', 'Pengecualian', 'Selisih (Rp)', 'Disposisi'],
      body: i.reperf.map((r) => [
        r.id, dash(r.areaId), dash(r.item), dash(r.iaConclusion), dash(r.auditorResult),
        num(r.exceptions), r.diffRp === null ? '—' : String(r.diffRp), dash(r.disposition),
      ]),
    });
    blocks.push({
      type: 'kv',
      rows: [['Ambang jelas remeh (clearly trivial) perikatan',
        i.cttFull === null ? 'tidak tersedia' : 'Rp ' + String(i.cttFull)]],
    });
    const rc = i.reperf.flatMap((r) => iaReperfConflicts(r, i.cttFull).map((c) => [r.id, c]));
    if (rc.length) {
      blocks.push({ type: 'para', text: 'Pertentangan yang belum diselesaikan pada register di atas:' });
      blocks.push({ type: 'table', head: ['Ref', 'Pertentangan'], body: rc });
    }
    const uncovered = iaAreasWithoutReperf(i.useAreas, i.reperf);
    if (uncovered.length) {
      blocks.push({
        type: 'para',
        text: 'Area yang diandalkan tetapi belum memiliki pos reperformansi (¶24): '
          + uncovered.map((a) => a.id + ' — ' + dash(a.area)).join('; '),
      });
    }
  }

  /* --- 6. Bantuan langsung (¶26–34) --- */
  blocks.push({ type: 'heading', text: '6. Bantuan Langsung (¶26–34)' });
  if (!i.direct.length) {
    blocks.push({ type: 'para', text: 'Tidak ada bantuan langsung yang digunakan pada perikatan ini.' });
  } else {
    blocks.push({
      type: 'table',
      head: ['Ref', 'Individu', 'Tugas', 'Penyelia', 'Reviu', 'Jam', '¶29', '¶33(a)', '¶33(b)', 'Status'],
      body: i.direct.map((d) => [
        d.id, dash(d.name), dash(d.task), dash(d.supervisor), dash(d.review), num(d.hours),
        yesNo(d.objectivityEvaluated), yesNo(d.entityConsent), yesNo(d.individualConsent), dash(d.status),
      ]),
    });
    blocks.push({ type: 'kv', rows: [['Total jam bantuan langsung', String(iaDirectHours(i.direct))]] });
    const viol = iaDirectViolations(i.direct);
    if (viol.length) {
      blocks.push({ type: 'para', text: 'Baris yang statusnya melampaui prasyarat SA 610:' });
      blocks.push({ type: 'table', head: ['Ref', 'Individu', 'Sebab'], body: viol.map((v) => [v.id, v.name, v.reason]) });
    }
  }

  /* --- 7. Kesimpulan --- */
  blocks.push({ type: 'heading', text: '7. Kesimpulan' });
  blocks.push({ type: 'para', text: i.verdict.t });
  blocks.push({
    type: 'kv',
    rows: i.conclusion
      ? [['Disimpulkan oleh', i.conclusion.by], ['Tanggal', i.conclusion.at],
         ['Rata-rata evaluasi', i.conclusion.avg.toFixed(1) + ' / 5'], ['Keputusan', i.conclusion.verdict]]
      : [['Disimpulkan oleh', '—'], ['Tanggal', '—'],
         ['Status', 'Kesimpulan belum diambil — memo ini menyajikan penilaian yang sedang berjalan']],
  });
  blocks.push({ type: 'kv', rows: [['Tanggal terbit memo', dash(i.date)]] });
  return blocks;
}
