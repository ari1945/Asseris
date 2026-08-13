/* ============================================================
   Asseris — RANTAI TANDA TANGAN KERTAS KERJA (SSOT)
   PRD: docs/prd-wp-signoff-integrity.md
   ------------------------------------------------------------
   Modul MURNI (tanpa React/`window`/DOM) — diimpor KEDUANYA, UI klien dan
   `server/src/signoff.ts` lintas paket, dengan pola yang sama seperti `rbac`
   dan `aje_contract`.

   Cacat yang ditutup (probe di PRD Lampiran A):

     1. `guardSignoffWrite` hanya menerima PERAN, tak pernah identitas. Maka
        tak ada satu pun slot yang tanda tangannya divalidasi terhadap SIAPA
        yang menulisnya: seorang Manager berwenang dapat menulis
        `reviewer: { by: 'Hartono W.', at: '2026-01-01' }` dan server
        menerimanya — kapabilitas cocok, identitas tak diperiksa, tanggal
        mundur tak diperiksa.

     2. `wpChainSelfReview` (SMM 2 / SA 220.36) hanya hidup di tab Sign-off.
        Footer `quickSign` menembusnya, dan server tak punya padanannya sama
        sekali. WP '100' ber-preparer 'Anindya P.' yang juga Audit Manager:
        satu klik menghasilkan rantai yang preparer dan reviewer-nya orang
        yang sama.

     3. Tanda tangan tak mengikat isi apa pun. Setelah WP `Reviewed`, item
        uji, bukti, dan kesimpulan masih bebas diubah siapa pun pemegang
        WP_EDIT — tanda tangan reviewer karenanya menyatakan persetujuan atas
        dokumen yang sudah tidak ada lagi.

   PEMBAGIAN TUGAS DENGAN `signoff.ts`. Modul ini memuat ATURAN — hal-hal yang
   tak ada kapabilitas apa pun dapat memuaskannya (identitas, waktu, urutan,
   satu-orang-satu-langkah). OTORITAS (kapabilitas peran per-slot) tetap di
   `signoff.ts`, tempat ia sudah bekerja dan mencatat `SignoffChange` untuk
   jejak audit. Pembagian yang sama dipakai AJE: `ajeImmutabilityViolations`
   adalah aturan, `need()` adalah otoritas.
   ============================================================ */
import { fingerprint } from './content_hash';
import { amsShortName, normalizeDisplayName } from './identity';
/* Validasi stempel waktu sudah ada dan sudah terbukti di rantai AJE (PRD
   prd-aje-immutability-live-approvals PR-3). Ia generik — tak ada apa pun di
   dalamnya yang khas jurnal — jadi kertas kerja MEMAKAINYA, bukan menyalinnya.
   Hanya nilai skew baku yang berbeda, dan itu parameter. */
import { decisionTimestampError, nowStamp } from './aje_approval';

/** Stempel waktu sebuah tanda tangan: ISO 8601 dari jam mesin penandatangan. */
export { nowStamp as wpSignatureStamp };

/**
 * Tampilan sebuah `at` tanda tangan.
 *
 * TIGA bentuk sudah hidup berdampingan di data ini: ISO (baru),
 * 'YYYY-MM-DD' (tanggal reviu yang dideklarasikan di WP_INDEX), dan
 * '07 Agu 2026' (keluaran `wpToday()` lama). Fungsi ini menerima ketiganya
 * dan mengembalikan bentuk Indonesia yang seragam; yang tak terbaca
 * dikembalikan apa adanya, bukan diganti tanggal hari ini.
 */
export function wpFormatSignedAt(at: unknown): string {
  const s = String(at ?? '').trim();
  if (!s) return '';
  const t = Date.parse(s.includes('T') ? s : s.replace(' ', 'T'));
  if (!Number.isFinite(t)) return s;
  try {
    return new Date(t).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return s;
  }
}

/* ============================================================
   BENTUK
   ============================================================ */

export type WpSlotKey = 'preparer' | 'reviewer' | 'partner' | 'eqr';

/** Urutan rantai. Slot ke-N tak dapat ditandatangani sebelum slot N−1 terisi. */
export const WP_SLOT_ORDER: readonly WpSlotKey[] = ['preparer', 'reviewer', 'partner', 'eqr'];

export const WP_SLOT_LABEL: Record<string, string> = {
  preparer: 'Preparer',
  reviewer: 'Reviewer (Manager)',
  partner: 'Engagement Partner',
  eqr: 'EQR (Penelaah Mutu)',
};

/**
 * Satu tanda tangan tercatat.
 *
 * `by` adalah LABEL TAMPILAN dan bukan kunci identitas (`amsShortName` lossy —
 * lihat identity.ts). `byUserId` adalah identitas otoritatif. `contentHash`
 * mengikat tanda tangan pada isi kertas kerja saat ia dibubuhkan.
 *
 * Ketiadaan `byUserId`/`contentHash` menandai tanda tangan WARISAN — ditulis
 * sebelum PRD ini. Ia tidak digugurkan; ia ditandai `legacy`.
 */
export interface WpSignature {
  by?: string;
  byUserId?: string;
  at?: string;
  contentHash?: string;
}

export type WpChain = Record<string, WpSignature | null | undefined>;

/** Pengguna sesi seperti yang diketahui server (`ctx.user`). */
export interface WpActor {
  id: string;
  name: string;
}

/* ============================================================
   IDENTITAS TANDA TANGAN
   ============================================================ */

function str(v: unknown): string {
  return v == null ? '' : String(v);
}

function isSig(v: unknown): v is WpSignature {
  return !!v && typeof v === 'object';
}

/** Tanda tangan kanonik — dipakai untuk mendeteksi PERUBAHAN, bukan otoritas. */
export function wpSigKey(v: unknown): string {
  if (!isSig(v)) return '';
  return `${str(v.by)}~${str(v.byUserId)}~${str(v.at)}~${str(v.contentHash)}`;
}

/**
 * Apakah `sig` dibubuhkan oleh `actor`?
 *
 * Bila tanda tangan membawa `byUserId`, hanya id yang dipakai — nama tampilan
 * tak boleh dapat menggeser kesimpulan. Bila tidak (warisan), nama adalah
 * satu-satunya petunjuk yang ada; kecocokan nama diterima, dengan kesadaran
 * bahwa bentuk singkat lossy. Arah kesalahannya disengaja: pada aturan
 * satu-orang-satu-langkah, mencocokkan terlalu longgar berarti MEMBLOKIR
 * (aman), bukan mengizinkan.
 */
export function signedByActor(sig: unknown, actor: WpActor): boolean {
  if (!isSig(sig)) return false;
  const id = str(sig.byUserId);
  if (id) return id === str(actor.id);
  const a = normalizeDisplayName(sig.by);
  return !!a && a === normalizeDisplayName(amsShortName(actor.name));
}

/* ============================================================
   SATU ORANG, SATU LANGKAH (SMM 2 / SA 220.36)
   ------------------------------------------------------------
   Dipindah dari `wp_canon.ts` (di-re-export dari sana demi kompatibilitas).
   Alasannya sama seperti `stepAuthority` pada rantai AJE: gate SoD per-slot
   mengikat slot ke KAPABILITAS, dan kapabilitas bukan identitas —
   `PARTNER_BASE` memegang OPINION_APPROVE dan EQR_REVIEW sekaligus, sehingga
   partner yang baru menandatangani slot Engagement Partner masih lolos di slot
   EQR pada kertas kerja yang SAMA.

   HANYA TANDA TANGAN yang dihitung; `who` pada slot yang masih menunggu adalah
   nama PENERIMA TUGAS, bukan bukti bahwa ia menandatangani.
   ============================================================ */

export interface WpSelfReview {
  blocked: boolean;
  priorSlot: string;
  reason: string;
}

const FREE: WpSelfReview = { blocked: false, priorSlot: '', reason: '' };

function selfReviewReason(priorSlot: string): string {
  return `Anda sudah menandatangani slot ${WP_SLOT_LABEL[priorSlot] || priorSlot} pada kertas kerja ini — satu orang, satu langkah (SMM 2 / SA 220.36).`;
}

/** Varian berbasis NAMA — bentuk lama, dipakai UI yang hanya punya nama sesi. */
export function wpChainSelfReview(chain: WpChain, slotKey: string, me: string): WpSelfReview {
  const meN = normalizeDisplayName(me);
  if (!meN) return FREE;
  const src = chain || {};
  const prior = Object.keys(src).find(k => k !== slotKey && isSig(src[k]) && normalizeDisplayName(src[k]!.by) === meN);
  if (!prior) return FREE;
  return { blocked: true, priorSlot: prior, reason: selfReviewReason(prior) };
}

/**
 * Varian berbasis IDENTITAS — dipakai server, dan UI setelah PR-3.
 * Memakai `byUserId` bila tanda tangan pembandingnya membawanya, sehingga dua
 * auditor yang bentuk singkat namanya kebetulan sama tidak saling memblokir.
 */
export function wpChainSelfReviewBy(chain: WpChain, slotKey: string, actor: WpActor): WpSelfReview {
  const src = chain || {};
  const prior = Object.keys(src).find(k => k !== slotKey && signedByActor(src[k], actor));
  if (!prior) return FREE;
  return { blocked: true, priorSlot: prior, reason: selfReviewReason(prior) };
}

/* ============================================================
   HASH ISI KERTAS KERJA
   ============================================================ */

interface TestItemLike {
  id?: string; desc?: string; ev?: string; tick?: string;
  result?: string; note?: string; lead?: string;
}
interface EvidenceLike {
  id?: string; name?: string; source?: string; tier?: number;
  type?: string; asr?: readonly string[] | null; by?: string; at?: string;
}
interface ExecLike { items?: readonly TestItemLike[] | null; concl?: string }

/** Bagian `wpState[ref]` yang MENGIKAT sebuah tanda tangan. */
export interface WpContent {
  exec?: Record<string, ExecLike | null | undefined> | null;
  evidence?: readonly EvidenceLike[] | null;
  asrConcl?: Record<string, { result?: string; concl?: string } | null | undefined> | null;
  procs?: Record<string, string> | null;
}

function num(v: unknown): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : 0;
}

/**
 * Serialisasi KANONIK isi kertas kerja.
 *
 * MASUK — bukti substantif yang disetujui reviewer: item uji (`exec`), register
 * bukti (`evidence`), kesimpulan asersi (`asrConcl`), dan flag prosedur manual
 * (`procs`).
 *
 * DI LUAR — dan setiap pengecualian punya alasan:
 *  · `notes`/`noteStatus` — catatan reviu adalah PERCAKAPAN yang justru harus
 *    hidup setelah tanda tangan. Memasukkannya berarti setiap balasan catatan
 *    menggugurkan tanda tangan yang baru saja dibubuhkan (keputusan Q3 PRD).
 *  · `chain`/`status`/`reviewer`/`signedAt` — itu tanda tangannya sendiri;
 *    memasukkannya membuat hash tak pernah stabil.
 *
 * Kunci diurutkan agar urutan penulisan tidak mengubah hasil.
 */
export function wpCanonicalContent(st: WpContent | null | undefined): string {
  const s = st || {};

  const exec = Object.entries(s.exec || {})
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([pid, p]) => {
      const items = ((p && p.items) || [])
        .map(it => [str(it.id), str(it.desc), str(it.ev), str(it.tick), str(it.result), str(it.note), str(it.lead)].join(':'))
        .sort();
      return `${pid}=${items.join(';')}#${str(p && p.concl)}`;
    })
    .join('|');

  const evidence = ((s.evidence || []) as readonly EvidenceLike[])
    .map(e => [
      str(e.id), str(e.name), str(e.source), String(num(e.tier)), str(e.type),
      (Array.isArray(e.asr) ? [...e.asr].map(str).sort().join(',') : ''),
      str(e.by), str(e.at),
    ].join(':'))
    .sort()
    .join('|');

  const asrConcl = Object.entries(s.asrConcl || {})
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${str(v && v.result)}:${str(v && v.concl)}`)
    .join('|');

  const procs = Object.entries(s.procs || {})
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${str(v)}`)
    .join('|');

  return [exec, evidence, asrConcl, procs].join('§');
}

/** Sidik jari isi kertas kerja (16 hex). */
export function wpContentHash(st: WpContent | null | undefined): string {
  return fingerprint(wpCanonicalContent(st));
}

/* ============================================================
   ATURAN TULISAN (ditegakkan server)
   ============================================================ */

export type WpViolationCode =
  | 'signature-missing-identity'
  | 'signature-identity-mismatch'
  | 'signature-name-mismatch'
  | 'signature-missing-timestamp'
  | 'signature-future-timestamp'
  | 'signature-stale-timestamp'
  | 'signature-out-of-order'
  | 'signature-self-review'
  | 'signature-revoke-not-owner'
  | 'signature-revoke-downstream-signed';

export interface WpChainViolation {
  code: WpViolationCode;
  ref: string;
  slot: string;
  message: string;
}

/** Selisih maksimum antara `at` tanda tangan dan jam server. */
export const WP_SIGNATURE_SKEW_MS = 10 * 60 * 1000;

/**
 * R1 + R2 atas SATU tanda tangan, apa pun bentuk simpanannya.
 *
 * Tiga dokumen menyimpan tanda tangan dengan bentuk berbeda — `wpState.chain`
 * (`{by, at}`), `opinionDoc.v1.signoff` (`{by, date}`), dan `mat.memo.signoff`
 * (`{name, role, at}`) — tetapi pertanyaannya identik: benarkah ini dibubuhkan
 * oleh pengguna sesi, pada waktu yang nyata? Pemanggil menormalkan bentuknya;
 * aturannya hidup sekali di sini.
 *
 * Nama dibandingkan lewat `amsShortName` di KEDUA sisi, sehingga bentuk penuh
 * ('Hartono Wijaya, CPA') dan singkat ('Hartono W.') sama-sama diterima —
 * keduanya memang dipakai oleh dokumen yang berbeda.
 */
export function signatureAttributionViolations(
  s: { byUserId?: unknown; display?: unknown; at?: unknown },
  label: string,
  actor: WpActor,
  now: number,
  skewMs: number = WP_SIGNATURE_SKEW_MS,
): { code: WpViolationCode; message: string }[] {
  const out: { code: WpViolationCode; message: string }[] = [];

  if (!str(s.byUserId)) {
    out.push({ code: 'signature-missing-identity', message: `Tanda tangan ${label} tanpa identitas penanda tangan.` });
  } else if (str(s.byUserId) !== str(actor.id)) {
    out.push({
      code: 'signature-identity-mismatch',
      message: `Tanda tangan ${label} mengatasnamakan pengguna lain — tanda tangan hanya dapat dibubuhkan oleh dirinya sendiri.`,
    });
  }

  if (normalizeDisplayName(amsShortName(s.display)) !== normalizeDisplayName(amsShortName(actor.name))) {
    out.push({
      code: 'signature-name-mismatch',
      message: `Nama pada tanda tangan ${label} ("${str(s.display)}") bukan nama pengguna sesi.`,
    });
  }

  const tsErr = decisionTimestampError(s.at, now, skewMs);
  if (tsErr === 'missing-timestamp') {
    out.push({ code: 'signature-missing-timestamp', message: `Tanda tangan ${label} tanpa waktu yang dapat dibaca.` });
  } else if (tsErr === 'future-timestamp') {
    out.push({ code: 'signature-future-timestamp', message: `Waktu tanda tangan ${label} mendahului jam server.` });
  } else if (tsErr === 'stale-timestamp') {
    out.push({ code: 'signature-stale-timestamp', message: `Waktu tanda tangan ${label} menyimpang terlalu jauh dari jam server (back-dating).` });
  }

  return out;
}

function asChain(v: unknown): WpChain {
  if (!v || typeof v !== 'object') return {};
  const o = v as { chain?: unknown };
  return (o.chain && typeof o.chain === 'object') ? (o.chain as WpChain) : {};
}

function asRefMap(v: unknown): Record<string, unknown> {
  return (v && typeof v === 'object') ? (v as Record<string, unknown>) : {};
}

/**
 * Pelanggaran aturan pada sebuah tulisan `wpState`.
 *
 * HANYA tanda tangan yang BERUBAH yang diperiksa. Tanda tangan yang tak
 * tersentuh selalu lolos — itulah yang membuat data warisan (tanpa `byUserId`
 * / `contentHash`) tetap aman, dan itu pula yang membuat guard ini dapat
 * dipasang tanpa migrasi data.
 *
 * Ini DETEKSI, bukan otorisasi: pemanggil menolaknya untuk setiap peran.
 * Kapabilitas per-slot tetap ditegakkan terpisah di `signoff.ts`.
 */
export function wpChainViolations(input: {
  prev: unknown;
  next: unknown;
  actor: WpActor;
  now: number;
  skewMs?: number;
  /** Ref yang urutan rantainya (R3) DIMILIKI dokumen lain — lihat catatan di bawah. */
  skipOrderRefs?: ReadonlySet<string>;
}): WpChainViolation[] {
  const { prev, next, actor, now } = input;
  const skipOrder = input.skipOrderRefs;
  const skewMs = input.skewMs ?? WP_SIGNATURE_SKEW_MS;
  const p = asRefMap(prev);
  const n = asRefMap(next);
  const out: WpChainViolation[] = [];

  for (const ref of new Set([...Object.keys(p), ...Object.keys(n)])) {
    const pc = asChain(p[ref]);
    const nc = asChain(n[ref]);

    for (let i = 0; i < WP_SLOT_ORDER.length; i++) {
      const slot = WP_SLOT_ORDER[i];
      const before = pc[slot];
      const after = nc[slot];
      if (wpSigKey(before) === wpSigKey(after)) continue;   // tak tersentuh

      const add = (code: WpViolationCode, message: string) => out.push({ code, ref, slot, message });

      if (isSig(after)) {
        /* --- tanda tangan BARU atau BERUBAH --- */

        // R1 + R2 — identitas & waktu (aturan bersama lintas-dokumen)
        for (const v of signatureAttributionViolations(
          { byUserId: after.byUserId, display: after.by, at: after.at },
          WP_SLOT_LABEL[slot], actor, now, skewMs,
        )) add(v.code, v.message);

        /* R3 — urutan rantai.
           DIKECUALIKAN untuk ref yang rantainya hanyalah CERMIN dari dokumen lain.
           `wpState['900']` adalah cermin `opinionDoc.v1`: urutannya (manager →
           partner → EQR) sudah ditegakkan oleh rantai opini itu sendiri, dan
           memaksakan urutan kertas kerja di atasnya berarti menuntut sebuah slot
           preparer yang tak dimiliki siapa pun — persis yang dulu dijawab dengan
           menempelkan tanda tangan fiktif 'Generator Laporan'. Aturan lain
           (identitas, waktu, satu-orang-satu-langkah) TETAP berlaku pada cermin. */
        if (i > 0 && !(skipOrder && skipOrder.has(ref)) && !isSig(nc[WP_SLOT_ORDER[i - 1]])) {
          add('signature-out-of-order',
            `Slot ${WP_SLOT_LABEL[slot]} tidak dapat ditandatangani sebelum ${WP_SLOT_LABEL[WP_SLOT_ORDER[i - 1]]}.`);
        }

        // R4 — satu orang, satu langkah (dinilai atas rantai HASIL)
        const self = wpChainSelfReviewBy(nc, slot, actor);
        if (self.blocked) add('signature-self-review', self.reason);
      } else if (isSig(before)) {
        /* --- tanda tangan DICABUT --- */
        // R6 — hanya slot preparer yang diatur di sini; slot lain murni kapabilitas
        // (R5/R7 di signoff.ts), karena pencabutannya memang wewenang reviu.
        if (slot === 'preparer') {
          if (!signedByActor(before, actor)) {
            add('signature-revoke-not-owner',
              'Tanda tangan Preparer hanya dapat ditarik oleh penandatangannya sendiri.');
          }
          const downstreamSigned = WP_SLOT_ORDER.slice(1).some(k => isSig(nc[k]) || isSig(pc[k]));
          if (downstreamSigned) {
            add('signature-revoke-downstream-signed',
              'Tanda tangan Preparer tidak dapat ditarik setelah kertas kerja ditandatangani di tingkat berikutnya — rantai harus dibuka dari atas.');
          }
        }
      }
    }
  }
  return out;
}

/* ============================================================
   PEMBACAAN RANTAI (satu penghasil, semua pembaca)
   ============================================================ */

export type WpLinkStatus = 'signed' | 'voided' | 'legacy' | 'pending';

export interface WpChainLink {
  slot: WpSlotKey;
  label: string;
  status: WpLinkStatus;
  /** Tanda tangan yang berlaku — null untuk `pending` dan `voided`. */
  signed: WpSignature | null;
  /** Tanda tangan yang GUGUR — ditampilkan agar pembatalannya dapat ditelusuri. */
  voidedBy?: WpSignature;
}

/**
 * Rantai sebuah kertas kerja seperti yang HARUS dirender.
 *
 * Sebuah tanda tangan berlaku hanya bila `contentHash`-nya sama dengan isi
 * kertas kerja saat ini. Bila isi berubah setelah ditandatangani, tanda tangan
 * itu GUGUR — dan gugurnya TIDAK memerlukan tulisan apa pun.
 *
 * Itu bukan kerapian melainkan syarat, dan alasannya sama dengan pengikatan
 * hash pada rantai AJE: penggugur yang harus DITULIS bisa gagal, offline, atau
 * kalah CAS, jadi satu-satunya pembatalan yang selalu benar adalah yang
 * diturunkan.
 *
 * Tanda tangan tanpa `contentHash` (warisan) TIDAK digugurkan — ia `legacy`:
 * tak diklaim terverifikasi, tak pula dihapus.
 */
export function wpChainLinks(
  chain: WpChain | null | undefined,
  currentHash: string,
  slots: readonly WpSlotKey[] = WP_SLOT_ORDER,
): WpChainLink[] {
  const src = chain || {};
  return slots.map(slot => {
    const sig = src[slot];
    const label = WP_SLOT_LABEL[slot];
    if (!isSig(sig)) return { slot, label, status: 'pending' as const, signed: null };
    const h = str(sig.contentHash);
    if (!h) return { slot, label, status: 'legacy' as const, signed: sig };
    if (h === currentHash) return { slot, label, status: 'signed' as const, signed: sig };
    return { slot, label, status: 'voided' as const, signed: null, voidedBy: sig };
  });
}

/** Rantai dianggap tuntas bila setiap slot yang diminta berlaku (`signed`/`legacy`). */
export function wpChainComplete(links: readonly WpChainLink[]): boolean {
  return links.length > 0 && links.every(l => l.status === 'signed' || l.status === 'legacy');
}
