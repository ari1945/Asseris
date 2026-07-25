/* ============================================================
   Asseris — PR-3 · SSOT telaah fluktuasi (SA 520)
   ------------------------------------------------------------
   Fungsi MURNI (tanpa efek samping, tanpa `any`).

   MASALAH yang ditutup: telaah fluktuasi dulu hidup di DUA store terpisah —
   tab "Analisis Pergerakan" (WTB) menulis ke `wtbOverrides.{note,revStatus}`,
   modul `analytical` menulis ke `fluxState.v1` — dengan dua seed yang saling
   BERTENTANGAN untuk akun yang sama, dua ambang, dan dua hitungan "explained".
   Modul ini menjadikan `fluxState.v1` satu-satunya sumber kebenaran.

   Dua koreksi metodologi ikut dibawa:
   1. STATUS TAK PERNAH DITETAPKAN SISTEM. Dulu `status = note ? 'explained' : …`
      dengan `note` yang jatuh ke seed → perikatan baru langsung menampilkan akun
      "Dijelaskan" berikut narasi yang tak pernah ditulis siapa pun. Seed kini
      hanya SARAN; hanya tindakan auditor yang menetapkan status.
   2. Setiap catatan membawa `by` + `at` (SA 230) — dulu anonim & tanpa waktu.

   Lingkup penyimpanan: `fluxState.v1` = engagement + `WP_EDIT`, jadi Junior
   Auditor pun dapat mendokumentasikan telaahnya (store lama `wtbOverrides`
   ber-`AJE_EDIT` yang TIDAK dipegang Junior).
   ============================================================ */

/** Kosakata status tunggal. Ketiadaan entri = BELUM DITELAAH (bukan "dijelaskan"). */
export type FluxStatus = 'explained' | 'followup' | 'unexplained';

export interface FluxEntry {
  status: FluxStatus;
  note: string;
  /** nama/identitas auditor yang menyimpan (SA 230) */
  by: string;
  /** ISO timestamp */
  at: string;
  /** ekspektasi auditor atas Δ% (SA 520 ¶5a) — dipakai modul `analytical` */
  exp?: number;
  /** toleransi selisih terhadap ekspektasi, dalam poin persen (SA 520 ¶5c) */
  tol?: number;
}

export type FluxState = Record<string, FluxEntry>;

/** Aktor penyimpan — dari sesi (`auth.user`). */
export interface FluxActor { name?: string; role?: string }

const STATUSES: FluxStatus[] = ['explained', 'followup', 'unexplained'];

const asStatus = (v: unknown): FluxStatus | null => {
  if (typeof v !== 'string') return null;
  if (STATUSES.indexOf(v as FluxStatus) >= 0) return v as FluxStatus;
  /* kosakata lama modul `analytical`: 'pending' = belum ditelaah, BUKAN status
     tersimpan — dipetakan ke null agar tak terhitung sebagai telaah selesai. */
  if (v === 'pending') return null;
  return null;
};

const asText = (v: unknown): string => (typeof v === 'string' ? v : '');

/* ---------- bentuk warisan ---------- */

/** `wtbOverrides[code]` lama: `{ note, revStatus }` (+ `aje` yang BUKAN urusan modul ini). */
export interface LegacyOverride { note?: unknown; revStatus?: unknown }
/** `fluxState.v1` lama / FLUX_SEED: `{ status, note }` tanpa `by`/`at`. */
export interface LegacyFlux { status?: unknown; note?: unknown; by?: unknown; at?: unknown; exp?: unknown; tol?: unknown }

const asNum = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);

function entryFrom(status: FluxStatus | null, note: string, by: unknown, at: unknown, exp?: unknown, tol?: unknown): FluxEntry | null {
  const e = asNum(exp), t = asNum(tol);
  /* entri tanpa status, tanpa catatan, dan tanpa ekspektasi tidak bermakna. */
  if (status == null && note === '' && e === undefined && t === undefined) return null;
  const out: FluxEntry = {
    status: status != null ? status : 'followup',
    note,
    by: asText(by),
    at: asText(at),
  };
  if (e !== undefined) out.exp = e;
  if (t !== undefined) out.tol = t;
  return out;
}

/**
 * Gabungkan store warisan menjadi FluxState kanonik — BACA-LEWAT, tanpa menulis.
 * Prioritas: `fluxState.v1` (store baru) > `wtbOverrides` (store lama tab WTB).
 * Entri warisan tanpa `by`/`at` dibiarkan kosong dan ditandai apa adanya —
 * memalsukan penulis/waktu justru menciptakan jejak audit yang menyesatkan.
 */
export function mergeLegacyFlux(
  flux: Record<string, LegacyFlux> | null | undefined,
  overrides: Record<string, LegacyOverride> | null | undefined,
): FluxState {
  const out: FluxState = {};
  if (overrides) {
    for (const code of Object.keys(overrides)) {
      const o = overrides[code] || {};
      const e = entryFrom(asStatus(o.revStatus), asText(o.note), '', '');
      if (e) out[code] = e;
    }
  }
  if (flux) {
    for (const code of Object.keys(flux)) {
      const f = flux[code] || {};
      const e = entryFrom(asStatus(f.status), asText(f.note), f.by, f.at, f.exp, f.tol);
      if (e) out[code] = e;   // store baru menang
    }
  }
  return out;
}

/** Status tersimpan sebuah akun; `null` = belum ditelaah. */
export function statusOf(state: FluxState | null | undefined, code: string): FluxStatus | null {
  const e = state && state[code];
  return e ? e.status : null;
}

/** Catatan tersimpan auditor (string kosong bila belum ada). */
export function noteOf(state: FluxState | null | undefined, code: string): string {
  const e = state && state[code];
  return e ? e.note : '';
}

/**
 * Simpan/perbarui telaah satu akun; menstempel `by` + `at`.
 * `at` disuntikkan pemanggil (fungsi tetap murni & dapat diuji).
 */
export function upsertFlux(
  state: FluxState | null | undefined,
  code: string,
  patch: { status: FluxStatus; note: string },
  actor: FluxActor | null | undefined,
  at: string,
): FluxState {
  const by = (actor && actor.name) ? actor.name : '';
  const prev = (state && state[code]) || null;
  /* MERGE, bukan replace: entri juga membawa ekspektasi (`exp`/`tol`) milik modul
     `analytical` — menimpanya akan menghapus kertas kerja ekspektasi SA 520. */
  return { ...(state || {}), [code]: { ...(prev || {}), status: patch.status, note: patch.note, by, at } };
}

/**
 * Setel ekspektasi (`exp`) / toleransi (`tol`) tanpa mengubah kesimpulan.
 * Bila akun belum pernah ditelaah, entri dibuat berstatus `followup` — menetapkan
 * ekspektasi adalah awal telaah, bukan penyelesaiannya.
 */
export function setFluxExpectation(
  state: FluxState | null | undefined,
  code: string,
  patch: { exp?: number; tol?: number },
  actor: FluxActor | null | undefined,
  at: string,
): FluxState {
  const prev = (state && state[code]) || null;
  const by = (actor && actor.name) ? actor.name : '';
  const base: FluxEntry = prev || { status: 'followup', note: '', by, at };
  return { ...(state || {}), [code]: { ...base, ...patch, by, at } };
}

/* DIHAPUS: `clearFlux`. Ia diekspor & diuji tapi tak pernah dipakai satu permukaan pun —
   dan tak akan pernah bekerja seperti namanya: `fluxState` adalah hasil MERGE baca-lewat
   `fluxStateRaw` + `wtbOverrides` (contexts.tsx), sedangkan `setFluxState` hanya menulis
   yang pertama. Menghapus entri karena itu memunculkan KEMBALI catatan warisan pada
   pembacaan berikutnya. UI juga tak punya afordans "batalkan telaah". Bila kelak dibutuhkan,
   ia harus berupa nisan eksplisit yang dilewati `mergeLegacyFlux`, bukan `delete`. */

export interface FluxCounts {
  explained: number;
  followup: number;
  unexplained: number;
  /** ter-flag tapi belum ada telaah tersimpan sama sekali */
  unreviewed: number;
  /** total akun ter-flag yang dihitung */
  total: number;
  /** yang menuntut tindakan = followup + unexplained + unreviewed */
  outstanding: number;
}

/**
 * Hitung status telaah atas himpunan akun TER-FLAG.
 * Akun tanpa entri masuk `unreviewed` — TIDAK dianggap dijelaskan.
 */
export function fluxCounts(flaggedCodes: string[], state: FluxState | null | undefined): FluxCounts {
  let explained = 0, followup = 0, unexplained = 0, unreviewed = 0;
  for (const code of flaggedCodes) {
    const s = statusOf(state, code);
    if (s === 'explained') explained++;
    else if (s === 'followup') followup++;
    else if (s === 'unexplained') unexplained++;
    else unreviewed++;
  }
  const total = flaggedCodes.length;
  return { explained, followup, unexplained, unreviewed, total, outstanding: total - explained };
}

/* ------------------------------------------------------------
   Ambang fluktuasi — SATU aturan untuk semua permukaan.

   PR-3a memindahkan ambang ke SSOT, tapi hanya SEBAGIAN konsumen diubah: KPI Ringkasan
   `analytical` tetap memakai aturan lokal (AND, 15%) sementara tab Flux & WTB memakai
   (OR, 20%/PM). Akibatnya satu perikatan menampilkan "23 fluktuasi signifikan" di WTB/SA 520
   dan "12 fluktuasi tak terduga" di Ringkasan — modul yang sama bertentangan dengan dirinya.
   Predikat di bawah ini adalah rumusnya; konsumen TIDAK boleh menulis ulang aturannya.
   ------------------------------------------------------------ */
export interface FluxThreshold { absJt?: number | null; pctThr?: number | null }
export interface ResolvedFluxThreshold { absThr: number | null; pctThr: number }

/** Ambang efektif: nominal Rupiah (absJt jutaan, fallback PM) + persentase (fallback 20%). */
export function fluxThresholds(thr: FluxThreshold | null | undefined, pm: number | null | undefined): ResolvedFluxThreshold {
  const raw = (thr && thr.absJt != null) ? thr.absJt * 1e6 : (pm != null ? pm : null);
  return {
    absThr: (typeof raw === 'number' && raw > 0) ? raw : null,
    pctThr: (thr && typeof thr.pctThr === 'number') ? thr.pctThr : 20,
  };
}

/** Signifikan bila melampaui ambang nominal ATAU ambang persentase (bukan keduanya). */
export function isFluxFlagged(dAbs: number, dPct: number, t: ResolvedFluxThreshold): boolean {
  return (t.absThr != null && Math.abs(dAbs) >= t.absThr) || Math.abs(dPct) >= t.pctThr;
}

export const FLUX_STATUS_LABEL: Record<FluxStatus, string> = {
  explained: 'Dijelaskan',
  followup: 'Perlu tindak lanjut',
  unexplained: 'Tak dapat dijelaskan',
};

/** Warna badge per status (token teks; `null` = belum ditelaah → netral). */
export function fluxStatusKind(s: FluxStatus | null): string | undefined {
  if (s === 'explained') return 'green';
  if (s === 'unexplained') return 'red';
  if (s === 'followup') return 'amber';
  return undefined;
}
