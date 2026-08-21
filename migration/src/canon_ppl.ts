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

   TAHAP A-2 (`docs/prd-regref-tahap-a2.md` · R1). Ambang di bawah dulu SATU
   record tanpa masa berlaku, dan tahun berjalannya diketik terpisah di
   `CPE_REQ.year: 2026`. Tak satu pun konsumen memilih set menurut tanggal, jadi
   pada 1 Januari 2027 aplikasi akan menampilkan "PPL 2026 · 40 SKP", menghitung
   kepatuhan terhadap kewajiban 2026, dan memberi label 2026 — diam. Itu pola
   `PAYROLL_RATES.period` yang sudah dicabut Tahap A, hidup di tempat lain.

   Kini ambangnya berkunci masa berlaku (`PPL_REGISTRY`) dan tahunnya DITURUNKAN
   dari tanggal hitung (`pplYearOf`). Ia MEMBLOKIR bila masa tak tercakup: tidak
   seperti hari kerja cuti yang masih berarti tanpa kalender liburnya, sebuah
   verdict kepatuhan tidak punya jawaban separuh — "Memenuhi" terhadap kewajiban
   tahun yang salah adalah nasihat kepatuhan yang keliru, bukan angka kurang teliti.

   Murni & deterministik; tanpa React/efek-samping.
   ============================================================ */
import { regrefFor } from './canon_regref';
import type { RegRefLookup, RegRefSet } from './canon_regref';

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

/** Status PPL langsung dari catatan SKP — satu pintu untuk seluruh konsumen. */
export function pplStatusFromEntries(
  entries: readonly SkpEntry[] | null | undefined,
  req: PplRequirement = PPL_REQ_PMK186,
): PplStatus {
  return pplStatus(pplFromEntries(entries), req);
}

/* ------------------------------------------------------------------
   Masa berlaku (PRD `docs/prd-regref-tahap-a2.md` · PR-2 · SC-A1..SC-A3)
   ------------------------------------------------------------------ */

export const PPL_LABEL = 'Kewajiban PPL Akuntan Publik (SKP)';

/**
 * Kewajiban PPL menurut masa berlakunya.
 *
 * Satu set hari ini, dan itu memang keadaannya — bukan alasan untuk menyimpannya
 * sebagai record telanjang. Masa SEBELUM PMK 186/2021 sengaja TIDAK tercakup:
 * aturan sebelumnya berbeda, dan "yang terdekat" bukan jawaban.
 */
export const PPL_REGISTRY: RegRefSet<PplRequirement>[] = [{
  effectiveFrom: '2022-01-01',
  effectiveTo: null,
  basis: 'PMK 186/PMK.01/2021 Pasal 37',
  sourceDoc: '',
  verified: false,
  note: 'Ambang 40/30/10 SKP dan materi wajib 4+16 belum dicocokkan baris-per-baris dengan '
    + 'naskah PMK 186/2021, dan tanggal mulai berlakunya diasumsikan 1 Januari 2022 — '
    + 'masa sebelum itu karena itu tak tercakup, bukan dihitung dengan ambang ini.',
  value: PPL_REQ_PMK186,
}];

/** Kewajiban PPL yang berlaku pada `date`, atau penolakan yang menyebut alasannya. */
export function pplReqOn(date: string | undefined | null): RegRefLookup<PplRequirement> {
  return regrefFor(PPL_REGISTRY, String(date ?? ''), { label: PPL_LABEL, enforcement: 'block' });
}

/** Tahun PPL yang berlaku pada `date` — DITURUNKAN, tak pernah diketik. */
export function pplYearOf(date: string | undefined | null): number | null {
  const s = String(date ?? '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return Number(s.slice(0, 4));
}

/**
 * Catatan SKP milik satu tahun PPL.
 *
 * Tanpa penyaringan ini, membenarkan LABEL tahunnya justru memperburuk keadaan:
 * layar akan berkata "PPL 2027" sambil menjumlahkan SKP yang diperoleh 2026.
 * Entri tanpa tanggal yang terbaca DIBUANG — ia tak dapat diklaim milik tahun
 * mana pun, dan menghitungnya berarti menebak.
 */
export function skpInYear(entries: readonly SkpEntry[] | null | undefined, year: number): SkpEntry[] {
  return (entries || []).filter((e) => {
    const d = String((e as { date?: unknown } | null)?.date ?? '');
    return /^\d{4}-\d{2}-\d{2}$/.test(d) && Number(d.slice(0, 4)) === year;
  });
}

export interface PplPeriod {
  /** Tahun PPL yang dinilai, dari tanggal hitung. */
  year: number | null;
  /** Ambang yang berlaku — `null` bila masa itu tak tercakup registry. */
  req: PplRequirement | null;
  look: RegRefLookup<PplRequirement>;
  /** Catatan SKP yang benar-benar milik `year`. */
  entries: SkpEntry[];
  /** `null` bila tak dapat dinilai (masa tak tercakup) — BUKAN verdict palsu. */
  status: PplStatus | null;
}

/**
 * Satu pintu bagi seluruh konsumen: tahun, ambang, catatan tahun itu, dan status.
 *
 * Bila masa tak tercakup, `status` `null` dan pemanggil WAJIB menampilkan
 * penolakannya (`look.note`) — bukan menyulapnya jadi "Memenuhi".
 */
export function pplPeriod(
  entries: readonly SkpEntry[] | null | undefined,
  date: string | undefined | null,
): PplPeriod {
  const look = pplReqOn(date);
  const year = pplYearOf(date);
  const scoped = year == null ? [] : skpInYear(entries, year);
  return {
    year,
    req: look.value,
    look,
    entries: scoped,
    status: look.value ? pplStatusFromEntries(scoped, look.value) : null,
  };
}
