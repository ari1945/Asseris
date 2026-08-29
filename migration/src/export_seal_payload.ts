/* ============================================================
   PAYLOAD KANONIK SEGEL — BERVERSI.

   Segel Ed25519 menandatangani SATU hal: SHA-256 atas "payload kanonik" artefak.
   Apa yang MASUK payload itu adalah definisi harfiah dari apa yang dijamin segel.
   Berkas ini adalah satu-satunya tempat definisi itu ditulis, dan ia BERVERSI —
   karena mengubahnya menggeser seluruh hash, dan segel yang sudah terbit harus
   tetap dapat direproduksi dengan algoritma zamannya (R-1 / SC-9 PRD).

   ── V1 (pra-F-3) DIBEKUKAN, TERMASUK CACATNYA
   V1 memakai `JSON.stringify(pick, Object.keys(pick).sort())`. Argumen kedua
   `JSON.stringify` BUKAN pengurut kunci — ia REPLACER berupa daftar-izin kunci,
   dan ia berlaku REKURSIF ke setiap objek di dalam struktur. Karena daftar
   izinnya hanya memuat kunci TINGKAT ATAS (`kind`/`title`/`sheets`…), setiap
   objek sheet dan setiap blok PDF diserialisasi menjadi `{}`:

       {"kind":"x","sheets":[{}],"title":"t"}
       {"blocks":[{}],"kind":"k","meta":["m1"],"refNo":"R","title":"t"}

   Akibatnya V1 menandatangani `kind`, `title`, `refNo`, `meta` (PDF saja), dan
   JUMLAH sheet/blok — **tidak satu sel pun**. Dua register dengan judul sama dan
   jumlah sheet sama menghasilkan contentHash yang IDENTIK, sehingga segelnya
   dapat dipertukarkan. Komentar aslinya berbunyi "over the CONTENT-bearing
   fields only", dan `.map()` di atasnya menormalkan tiap field dengan rapi —
   lalu replacer membuang semuanya. Niatnya tak pernah diragukan; implementasinya
   yang diam-diam membatalkannya.

   Uji lamanya tidak menangkapnya karena ia menguji perubahan pada `title` —
   satu dari tiga field yang KEBETULAN memang ikut.

   V1 tetap ada di sini BUKAN sebagai kode hidup melainkan sebagai ARSIP: segel
   yang terbit sebelum F-3 hanya dapat direproduksi dengan V1, dan menghukum
   dokumen lama karena algoritmanya berkembang adalah kegagalan yang lebih buruk
   daripada cacat yang diperbaiki (Q-2 PRD). JANGAN SUNTING V1.

   ── V2 (F-3)
   Kanonikalisasi rekursif sungguhan (kunci diurut di SETIAP tingkat, tanpa
   replacer), ditambah identitas penerbit (`firm`/`scope`/`scopeId`) dan
   `sealFormat` itu sendiri. `meta` XLSX ikut masuk — ketidaksejajaran PDF/XLSX
   yang lama tak punya alasan desain (Q-4 PRD).

   `sealFormat` ikut DI DALAM payload, bukan hanya di sampingnya: itu pemisah
   domain: payload V1 dan V2 atas model yang sama tak akan pernah berbenturan.
   ============================================================ */

export const SEAL_FORMAT_V1 = 1;
export const SEAL_FORMAT_V2 = 2;
/** Versi yang dipakai penandatanganan BARU. */
export const SEAL_FORMAT_CURRENT = SEAL_FORMAT_V2;

export type SealFormat = typeof SEAL_FORMAT_V1 | typeof SEAL_FORMAT_V2;
export type ExportFormat = 'pdf' | 'xlsx';

/** Identitas penerbit yang ikut ditandatangani sejak V2. */
export interface SealPayloadIdentity {
  firm: string;
  scope: string;
  scopeId: string;
}

/* Bentuk model yang RELEVAN bagi segel. Sengaja longgar (`unknown`): payload
   ditentukan oleh daftar field di bawah, bukan oleh apa pun yang kebetulan
   menempel di model — supaya penambahan field render tak diam-diam menggeser
   hash seluruh artefak. */
export interface SealPayloadModel {
  kind?: unknown;
  title?: unknown;
  refNo?: unknown;
  meta?: unknown;
  blocks?: unknown;
  sheets?: unknown;
}

const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const rec = (v: unknown): Record<string, unknown> =>
  (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const str = (v: unknown): string => (typeof v === 'string' ? v : v == null ? '' : String(v));

/* ------------------------------------------------------------------
   Normalisasi struktur — SAMA untuk V1 & V2, supaya perbedaan kedua
   versi murni soal CAKUPAN, bukan soal bentuk field.
   ------------------------------------------------------------------ */
function normSheets(sheets: unknown): Record<string, unknown>[] {
  return arr(sheets).map((s) => {
    const o = rec(s);
    return {
      name: o.name || '',
      heading: o.heading || '',
      columns: o.columns || [],
      rows: o.rows || [],
      totals: o.totals || [],
    };
  });
}

function normBlocks(blocks: unknown): Record<string, unknown>[] {
  return arr(blocks).map((b) => {
    const o = rec(b);
    return {
      type: o.type,
      text: o.text || '',
      rows: o.rows || [],
      head: o.head || [],
      body: o.body || [],
      signers: arr(o.signers).map((s) => {
        const x = rec(s);
        return { name: x.name || '', role: x.role || '', at: x.at || '' };
      }),
    };
  });
}

/* ------------------------------------------------------------------
   V1 — BEKU. Direplikasi PERSIS, replacer dan semuanya.
   ------------------------------------------------------------------ */
function canonicalV1(format: ExportFormat, model: SealPayloadModel): string {
  if (format === 'xlsx') {
    const pick = {
      kind: model.kind,
      title: model.title,
      sheets: normSheets(model.sheets),
    };
    return JSON.stringify(pick, Object.keys(pick).sort());
  }
  const pick = {
    kind: model.kind,
    title: model.title,
    refNo: model.refNo || '',
    meta: model.meta || [],
    blocks: normBlocks(model.blocks),
  };
  return JSON.stringify(pick, Object.keys(pick).sort());
}

/* ------------------------------------------------------------------
   V2 — kanonikalisasi rekursif sungguhan.
   ------------------------------------------------------------------ */
function stable(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(stable);
  if (v && typeof v === 'object') {
    const src = v as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(src).sort()) out[k] = stable(src[k]);
    return out;
  }
  return v;
}

function canonicalV2(format: ExportFormat, model: SealPayloadModel, id: SealPayloadIdentity): string {
  const identity = { firm: str(id.firm), scope: str(id.scope), scopeId: str(id.scopeId) };
  const pick = format === 'xlsx'
    ? {
      sealFormat: SEAL_FORMAT_V2,
      kind: model.kind,
      title: model.title,
      /* Q-4: `meta` XLSX ikut ditandatangani. Dulu tidak, tanpa alasan desain. */
      meta: model.meta || [],
      sheets: normSheets(model.sheets),
      ...identity,
    }
    : {
      sealFormat: SEAL_FORMAT_V2,
      kind: model.kind,
      title: model.title,
      refNo: model.refNo || '',
      meta: model.meta || [],
      blocks: normBlocks(model.blocks),
      ...identity,
    };
  return JSON.stringify(stable(pick));
}

/* ------------------------------------------------------------------
   Pintu tunggal — JALUR VERIFIKASI DUA-VERSI (SC-9).
   Pemanggil menyebut versi yang berlaku bagi segel yang sedang ditangani:
   penandatanganan baru memakai SEAL_FORMAT_CURRENT; reproduksi segel lama
   memakai `sealFormat` yang tersimpan pada rekaman segelnya.
   ------------------------------------------------------------------ */
export function canonicalSealPayload(
  format: ExportFormat,
  sealFormat: SealFormat,
  model: SealPayloadModel,
  identity: SealPayloadIdentity,
): string {
  return sealFormat === SEAL_FORMAT_V1
    ? canonicalV1(format, model)
    : canonicalV2(format, model, identity);
}
