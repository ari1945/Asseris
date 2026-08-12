/* ============================================================
   Asseris — LAPORAN PAKAR di DMS server (PRD prd-sa620-expert-gate-server · PR-2)
   ------------------------------------------------------------
   Sebelum berkas ini, `ExpertEval.docUid` menunjuk uid `localStorage`
   (`ams.v1.evidence`, lihat evidence.tsx). Akibatnya dua arah, dan keduanya
   membuat limb "laporan pakar ada" tak berarti:

     · Server TAK DAPAT memverifikasinya. Gerbang PR-1 karenanya hanya
       menegakkan limb evaluasi; limb dokumen menunggu identifier yang
       dapat diperiksa server — itulah berkas ini.
     · Gerbangnya sendiri sudah salah. Laporan yang dilampirkan preparer di
       laptopnya TIDAK ADA di laptop reviewer → reviewer diblokir atas dokumen
       yang benar-benar ada. Sebaliknya satu baris karangan di localStorage
       (uid & hash dibangkitkan klien) memuaskan gerbang tanpa satu byte pun.

   Kini `docUid` = **id lampiran DMS**: byte tersimpan terenkripsi, SHA-256
   diverifikasi SERVER (bukan diklaim klien), setiap unggah & pencabutan
   ter-audit, dan `listAttachments` menyaring `deletedAt` — sehingga "dokumen
   itu dicabut" adalah fakta yang dapat dibantah.

   SATU SUMBER, DUA PEMBACA: pemilih di `view_sa540` dan gerbang di
   `estimate_gate` sama-sama membaca hook ini. Bila keduanya membaca daftar
   yang berbeda, gerbang akan memblokir dokumen yang tampil di layar.
   ============================================================ */
import React from 'react';
import { useFirm } from './contexts';
import { attachmentList, attachmentUpload } from './api';
/* Predikat tautan warisan hidup di modul MURNI — server memakainya juga (PR-3). */
export { isLegacyDocUid } from './canon_expert_eval';

/** Koleksi lampiran DMS untuk kertas kerja SA 540 — dibaca juga oleh server (PR-3). */
export const EXPERT_DOC_COLLECTION = 'sa540';

export interface ExpertDoc {
  id: string;
  name: string;
  size: number;
  sha256: string;
  refId?: string | null;
}

export interface ExpertDocs {
  docs: ExpertDoc[];
  /** false selama jawaban server belum tiba — JANGAN menyimpulkan "tak ada dokumen". */
  ready: boolean;
  engId: string;
  reload: () => void;
}

/** Bentuk baris yang dikembalikan `attachment.list` (struktural, bukan `any`). */
interface AttachmentRow {
  id?: unknown; name?: unknown; size?: unknown; sha256?: unknown; refId?: unknown;
}

function toDoc(r: AttachmentRow): ExpertDoc | null {
  const id = typeof r.id === 'string' ? r.id : '';
  if (!id) return null;
  return {
    id,
    name: typeof r.name === 'string' ? r.name : id,
    size: typeof r.size === 'number' ? r.size : 0,
    sha256: typeof r.sha256 === 'string' ? r.sha256 : '',
    refId: typeof r.refId === 'string' ? r.refId : null,
  };
}

/**
 * Laporan pakar yang HIDUP di DMS untuk perikatan aktif.
 *
 * Dokumen yang sudah dicabut tak muncul di sini karena `listAttachments`
 * menyaring `deletedAt` — jadi tautan yang putus terlihat sebagai putus,
 * bukan sebagai tautan yang masih baik.
 */
export function useExpertDocs(): ExpertDocs {
  const firm = useFirm() as { activeEngagement?: { id?: string } | null } | null;
  const engId = (firm && firm.activeEngagement && firm.activeEngagement.id) || '';
  /* Argumen tipe generik TIDAK dapat dipakai pada hook React di repo ini (tak ada
     @types/react → TS2347); tipe dinyatakan lewat `as` di titik baca. */
  const [docs, setDocs] = React.useState([]);
  const [ready, setReady] = React.useState(false);
  const [serial, setSerial] = React.useState(0);

  React.useEffect(() => {
    if (!engId) { setDocs([]); setReady(false); return; }
    let cancelled = false;
    setReady(false);
    attachmentList({ scope: 'engagement', scopeId: engId, collection: EXPERT_DOC_COLLECTION })
      .then((rows: unknown) => {
        if (cancelled) return;
        const list = Array.isArray(rows) ? rows : [];
        setDocs(list.map(r => toDoc(r as AttachmentRow)).filter(Boolean));
        /* `attachmentList` menelan galat dan mengembalikan null (server absen/403).
           `ready` hanya benar bila kita BENAR-BENAR mendapat daftar — tanpa ini,
           kegagalan jaringan akan tampak sebagai "tak ada dokumen pakar". */
        setReady(Array.isArray(rows));
      })
      .catch(() => { if (!cancelled) { setDocs([]); setReady(false); } });
    return () => { cancelled = true; };
  }, [engId, serial]);

  const reload = React.useCallback(() => setSerial((n: number) => n + 1), []);
  return { docs: docs as ExpertDoc[], ready, engId, reload };
}

export interface ExpertUploadResult { ok: true; doc: ExpertDoc }
export interface ExpertUploadError { ok: false; message: string }

/** Meta dari `FileDropField` (byte asli + SHA-256 terhitung klien; server menghitung ulang). */
export interface DropMeta { file: File; name?: string; sha256?: string }

/**
 * Unggah laporan pakar ke DMS perikatan aktif.
 *
 * Galat DIKEMBALIKAN, tidak ditelan. `view_dms.tsx` menelannya (`catch {}`) dan
 * tetap membuat catatan — perilaku yang tak boleh ditiru di sini: sebuah unggahan
 * yang gagal senyap akan menampilkan "belum ditautkan" tanpa memberi tahu sebabnya
 * (berkas > 10 MB, kuota perikatan 50 MB, atau jenis berkas ditolak), dan auditor
 * akan menyalahkan gerbangnya.
 */
export async function uploadExpertDoc(
  engId: string, estimateId: string, meta: DropMeta,
): Promise<ExpertUploadResult | ExpertUploadError> {
  if (!engId) return { ok: false, message: 'Tidak ada perikatan aktif.' };
  try {
    const up = await attachmentUpload({
      scope: 'engagement', scopeId: engId,
      collection: EXPERT_DOC_COLLECTION, refId: estimateId,
      meta, retentionClass: 'SA230',
    }) as AttachmentRow;
    const doc = toDoc(up);
    if (!doc) return { ok: false, message: 'Server tidak mengembalikan id lampiran.' };
    return { ok: true, doc };
  } catch (e) {
    const raw = (e && typeof e === 'object' && 'message' in e) ? String((e as { message?: unknown }).message) : '';
    /* Server mengirim `<kode>: <sebab manusiawi>` (mis. `bad-type: jenis berkas tak
       diizinkan: .exe`). Kodenya untuk mesin; auditor cukup membaca sebabnya. */
    const human = raw.replace(/^[a-z-]+:\s*/, '');
    return { ok: false, message: human || raw || 'Unggahan ditolak server.' };
  }
}
