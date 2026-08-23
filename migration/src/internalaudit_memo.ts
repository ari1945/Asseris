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

/** Dokumen `internalAudit.v1` sesudah arc ini. */
export interface IaDoc {
  /** versi bentuk dokumen. Dinamai `ver`, bukan `v`, agar tak tertukar dengan
   *  skor faktor (`IaFactor.v`) — di layar maupun di gerbang yang memindainya. */
  ver: 2;
  factors: IaFactor[];
  profile: IaProfile;
  conclusion: IaConclusion | null;
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

  return { ver: 2, factors, profile, conclusion };
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
  /** tanggal terbit memo (YYYY-MM-DD) — dari klok aplikasi, bukan jam mesin */
  date: string;
}

const dash = (s: string): string => (s && s.trim()) || '—';

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
    { type: 'heading', text: '4. Kesimpulan' },
    { type: 'para', text: i.verdict.t },
  ];
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
