/* ============================================================
   Asseris — Kewajiban PPL Akuntan Publik (SKP)
   PMK 186/PMK.01/2021 Pasal 37 — SUMBER KEBENARAN TUNGGAL.
   ------------------------------------------------------------
   KOREKSI ATURAN. Aplikasi sebelumnya memakai "40 SKP/tahun dengan
   minimal 20 SKP terstruktur". Angka 20 itu SALAH sebagai ambang
   terstruktur: ia adalah jumlah *materi wajib tertentu* (4 SKP
   pembinaan/pengawasan AP-KAP + 16 SKP akuntansi/asurans), yakni
   sub-himpunan DI DALAM yang terstruktur — bukan minimumnya.

   Ambang yang benar (Pasal 37):
     · 40 SKP per tahun,
     · minimal 30 SKP PPL TERSTRUKTUR,
     · maksimal 10 SKP TIDAK terstruktur,
     · di dalam yang terstruktur: ≥4 SKP pembinaan/pengawasan AP atau
       KAP dan ≥16 SKP akuntansi dan/atau jasa asurans,
     · kelebihan SKP dapat dibawa ke tahun berikutnya maksimal 10 SKP.

   Akibat aturan lama: seorang AP dengan 20 SKP terstruktur ditandai
   "Terpenuhi" padahal kurang 10 SKP dari syarat. Untuk produk yang
   dipakai KAP, itu bukan cacat tampilan — itu nasihat kepatuhan yang
   salah.

   Konsekuensi kedua yang sama sekali belum dimodelkan: BATAS ATAS
   SKP tidak terstruktur. Total "44 SKP" yang terdiri dari 22
   terstruktur + 22 tidak terstruktur hanya bernilai 22 + 10 = 32 SKP
   yang dapat diperhitungkan — di bawah 40, meski totalnya tampak lewat.

   Murni & deterministik; tanpa React/efek-samping.
   ============================================================ */

export interface PplRequirement {
  /** Total SKP per tahun. */
  annual: number;
  /** Minimum SKP PPL terstruktur. */
  structuredMin: number;
  /** Batas ATAS SKP tidak terstruktur yang dapat diperhitungkan. */
  unstructuredCap: number;
  /** Materi wajib: pembinaan/pengawasan AP atau KAP (di dalam terstruktur). */
  topicPembinaanMin: number;
  /** Materi wajib: akuntansi dan/atau jasa asurans (di dalam terstruktur). */
  topicAkuntansiMin: number;
  /** Kelebihan SKP yang boleh dibawa ke tahun berikutnya. */
  carryForwardCap: number;
  /** Dasar hukum — ditampilkan berdampingan dengan angkanya. */
  basis: string;
}

export const PPL_REQ_PMK186: PplRequirement = {
  annual: 40,
  structuredMin: 30,
  unstructuredCap: 10,
  topicPembinaanMin: 4,
  topicAkuntansiMin: 16,
  carryForwardCap: 10,
  basis: 'PMK 186/PMK.01/2021 Pasal 37',
};

/** Realisasi SKP seorang AP dalam satu tahun. */
export interface PplRealisasi {
  structured: number;
  unstructured: number;
  /** SKP pembinaan/pengawasan AP-KAP (bagian dari `structured`). `undefined` = tak terlacak. */
  topicPembinaan?: number;
  /** SKP akuntansi/asurans (bagian dari `structured`). `undefined` = tak terlacak. */
  topicAkuntansi?: number;
  /** SKP dibawa dari tahun sebelumnya (sudah ter-cap di sumbernya). */
  carriedIn?: number;
}

export type PplShortfallCode =
  | 'total'             // SKP terhitung < 40
  | 'structured'        // terstruktur < 30
  | 'topic-pembinaan'   // materi pembinaan/pengawasan < 4
  | 'topic-akuntansi';  // materi akuntansi/asurans < 16

export interface PplStatus {
  /** SKP tidak terstruktur yang DAPAT diperhitungkan (setelah cap). */
  countedUnstructured: number;
  /** SKP tidak terstruktur yang HANGUS karena melewati cap. */
  forfeitedUnstructured: number;
  /** Total SKP yang dapat diperhitungkan (terstruktur + tidak terstruktur ter-cap + bawaan). */
  countedTotal: number;
  structured: number;
  /** Materi wajib terlacak? Bila tidak, kepatuhan materi TIDAK dapat diklaim. */
  topicsTracked: boolean;
  shortfalls: PplShortfallCode[];
  /** Patuh pada seluruh limb YANG DAPAT DIUJI. Lihat `topicsTracked`. */
  compliant: boolean;
  /** Kelebihan yang boleh dibawa ke tahun berikutnya (sudah ter-cap). */
  carryForward: number;
}

export const PPL_SHORTFALL_LABEL: Record<PplShortfallCode, string> = {
  'total': 'Total SKP terhitung di bawah kewajiban tahunan',
  'structured': 'SKP terstruktur di bawah minimum',
  'topic-pembinaan': 'Materi pembinaan/pengawasan AP atau KAP belum terpenuhi',
  'topic-akuntansi': 'Materi akuntansi/jasa asurans belum terpenuhi',
};

/**
 * Status kepatuhan PPL seorang AP.
 *
 * `compliant` hanya menyatakan limb yang DAPAT diuji dari data yang ada.
 * Bila materi wajib tak terlacak (`topicsTracked === false`), kepatuhan penuh
 * Pasal 37 belum terbukti walau `compliant === true` — pemanggil wajib
 * menampilkan keterangannya, bukan menyulapnya menjadi centang hijau.
 */
export function pplStatus(r: PplRealisasi, req: PplRequirement = PPL_REQ_PMK186): PplStatus {
  const structured = Math.max(0, r.structured || 0);
  const unstructured = Math.max(0, r.unstructured || 0);
  const carriedIn = Math.max(0, r.carriedIn || 0);

  const countedUnstructured = Math.min(unstructured, req.unstructuredCap);
  const forfeitedUnstructured = unstructured - countedUnstructured;
  const countedTotal = structured + countedUnstructured + carriedIn;

  const topicsTracked = r.topicPembinaan != null && r.topicAkuntansi != null;

  const shortfalls: PplShortfallCode[] = [];
  if (countedTotal < req.annual) shortfalls.push('total');
  if (structured < req.structuredMin) shortfalls.push('structured');
  if (topicsTracked) {
    if ((r.topicPembinaan || 0) < req.topicPembinaanMin) shortfalls.push('topic-pembinaan');
    if ((r.topicAkuntansi || 0) < req.topicAkuntansiMin) shortfalls.push('topic-akuntansi');
  }

  return {
    countedUnstructured,
    forfeitedUnstructured,
    countedTotal,
    structured,
    topicsTracked,
    shortfalls,
    compliant: shortfalls.length === 0,
    carryForward: Math.min(Math.max(0, countedTotal - req.annual), req.carryForwardCap),
  };
}

/** Klasifikasi materi wajib Pasal 37. `lain` = terstruktur tetapi bukan materi
 *  wajib (mis. perpajakan) — ia menambah SKP terstruktur, bukan limb materi. */
export type SkpTopic = 'pembinaan' | 'akuntansi' | 'lain';

export const SKP_TOPIC_LABEL: Record<SkpTopic, string> = {
  pembinaan: 'Pembinaan/pengawasan AP & KAP',
  akuntansi: 'Akuntansi dan/atau jasa asurans',
  lain: 'Materi lain (tidak memenuhi limb materi wajib)',
};

export function isSkpTopic(v: unknown): v is SkpTopic {
  return v === 'pembinaan' || v === 'akuntansi' || v === 'lain';
}

/** Ringkas realisasi dari catatan SKP per-kegiatan (bentuk `CPE_LOG`).
 *  Indeks terbuka: baris nyata membawa field lain (`t` judul, `date`) yang
 *  tak relevan bagi perhitungan — antarmuka ini membacanya, bukan memilikinya. */
export interface SkpEntry { type?: string | null; skp?: number | null; topic?: unknown; [k: string]: unknown }

export function isStructuredSkp(e: SkpEntry): boolean {
  return String(e.type || '').toLowerCase().startsWith('terstruktur');
}

/**
 * Ringkas realisasi, termasuk limb materi wajib.
 *
 * Materi wajib hanya dapat diuji bila SELURUH entri terstruktur terklasifikasi.
 * Klasifikasi sebagian akan mengecilkan limb materi tanpa ketahuan, lalu
 * `topicsTracked` berbohong bahwa ia dapat diuji — maka bar-nya seluruhnya.
 * Entri tidak terstruktur tak perlu topik: Pasal 37 menaruh materi wajib
 * DI DALAM yang terstruktur.
 *
 * Nol entri terstruktur = terlacak SECARA HAMPA: kedua limb materi pasti 0, dan
 * itu dapat dinyatakan dengan pasti. Memperlakukannya "tak terlacak" akan
 * menyembunyikan kegagalan yang justru paling terang.
 */
export function pplFromEntries(entries: readonly SkpEntry[] | null | undefined): PplRealisasi {
  let structured = 0, unstructured = 0;
  let pembinaan = 0, akuntansi = 0;
  let structuredCount = 0, classified = 0;
  for (const e of entries || []) {
    if (!e) continue;
    const n = Number(e.skp) || 0;
    if (!isStructuredSkp(e)) { unstructured += n; continue; }
    structured += n;
    structuredCount++;
    if (!isSkpTopic(e.topic)) continue;
    classified++;
    if (e.topic === 'pembinaan') pembinaan += n;
    else if (e.topic === 'akuntansi') akuntansi += n;
  }
  const tracked = classified === structuredCount;
  return {
    structured, unstructured,
    topicPembinaan: tracked ? pembinaan : undefined,
    topicAkuntansi: tracked ? akuntansi : undefined,
  };
}

/** Status PPL langsung dari catatan SKP — tanpa penyaringan periode.
 *  Untuk konsumen yang menampilkan kewajiban satu tahun, pakai `pplPeriod`. */
export function pplStatusFromEntries(
  entries: readonly SkpEntry[] | null | undefined,
  req: PplRequirement = PPL_REQ_PMK186,
): PplStatus {
  return pplStatus(pplFromEntries(entries), req);
}

/* ============================================================
   PERIODE KEWAJIBAN — satu tahun takwim.
   ------------------------------------------------------------
   Pasal 37 mengikat PER TAHUN. Sampai PR ini seluruh konsumen
   menjumlahkan SELURUH register SKP tanpa memeriksa tahunnya, sambil
   melabelinya "tahun {req.year}" — label yang tak dijaga apa pun. Selama
   seed hanya berisi 2026 itu tak terlihat; entri tahun lalu yang tersimpan
   (`cpeExtra` bersifat append-only) akan diam-diam ikut terhitung.

   Ia ditaruh di sini, bukan di tiap view, karena periode adalah bagian dari
   kewajiban — bukan hiasan tampilan. Satu mesin, satu periode.

   CATATAN: ambang-nya sendiri BELUM ber-periode (PMK 186 belum masuk
   `regref_catalog`). `req` karenanya tetap `PPL_REQ_PMK186`; bila kelak
   ambang itu berubah antar tahun, gantilah parameter `req` di SINI —
   satu titik — bukan di pemanggilnya.
   ============================================================ */

/** Tahun takwim dari tanggal ISO. `null` = tak terbaca (bukan tahun mana pun). */
export function pplYearOf(on: unknown): number | null {
  const s = String(on == null ? '' : on).trim();
  if (!s) return null;
  const m = /^(\d{4})(-|$)/.exec(s);
  if (m) return Number(m[1]);
  const t = Date.parse(s);
  return Number.isNaN(t) ? null : new Date(t).getFullYear();
}

/**
 * Entri milik tahun `year`.
 *
 * Entri yang tanggalnya TAK TERBACA dipertahankan: membuangnya akan menghapus
 * SKP seseorang tanpa suara, dan kita tak dapat membuktikan ia milik tahun
 * lain. Yang dibuang hanyalah entri yang tanggalnya terbaca DAN menunjuk tahun
 * berbeda — satu-satunya kasus yang benar-benar diketahui.
 */
export function skpInYear<T extends SkpEntry>(
  entries: readonly T[] | null | undefined,
  year: number,
): T[] {
  const out: T[] = [];
  for (const e of entries || []) {
    if (!e) continue;
    const y = pplYearOf((e as SkpEntry).date);
    if (y == null || y === year) out.push(e);
  }
  return out;
}

/** Kewajiban PPL satu periode: tahunnya, ambangnya, entri ter-scope, statusnya. */
export interface PplPeriod<T extends SkpEntry = SkpEntry> {
  /** Tahun takwim kewajiban. `null` = tanggal acuan tak terbaca ⇒ TIDAK ter-scope. */
  year: number | null;
  req: PplRequirement;
  /** Entri di dalam periode (seluruhnya bila `year === null`). */
  entries: T[];
  status: PplStatus;
}

/**
 * SATU PINTU bagi seluruh konsumen PPL: entri mentah + tanggal acuan
 * (`AMS.TODAY`) → tahun, ambang, entri ter-scope, dan status Pasal 37.
 *
 * Bila tanggal acuan tak terbaca, periode TIDAK di-scope (`year === null`) dan
 * seluruh entri ikut terhitung. Meng-scope ke tahun yang tak diketahui akan
 * menolkan SKP orang yang sesungguhnya punya — kegagalan yang tak terlihat.
 * Pemanggil wajib menampilkan `year` apa adanya, termasuk ketiadaannya.
 */
export function pplPeriod<T extends SkpEntry>(
  entries: readonly T[] | null | undefined,
  on: unknown,
  req: PplRequirement = PPL_REQ_PMK186,
): PplPeriod<T> {
  const year = pplYearOf(on);
  const scoped = year == null
    ? (entries || []).filter((e): e is T => !!e)
    : skpInYear(entries, year);
  return { year, req, entries: scoped, status: pplStatus(pplFromEntries(scoped), req) };
}
