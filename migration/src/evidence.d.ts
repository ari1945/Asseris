/* ============================================================
   W12 — shim tipe sementara untuk evidence.jsx (modul bukti lintas-sektor, Fase 3).
   Di luar scope view W12 → dikonversi W13 (fondasi). Sampai itu konsumen .tsx menarik
   tipe longgar dari sini agar prop JSX (mis. <FileDropField> tanpa hint/compact) tak
   di-infer "required". HAPUS file ini saat evidence.jsx → .tsx (W13).
   Pola identik diagnostics_panel.d.ts / ui.d.ts. Lihat BUILD.md §W12.
   ============================================================ */
type AnyComp = (props: any) => any;
export const EvidenceControl: AnyComp;
export const FileDropField: AnyComp;
export const FileList: AnyComp;
export const SecurePipeline: AnyComp;
export const EV_ALLOW: any;
export const EV_MAX_MB: any;
export const amsAttachEvidence: any;
export const amsEvRead: any;
export const amsEvidenceAll: any;
export const amsEvidenceCount: any;
export const amsEvidenceFor: any;
export const amsFakeHash: any;
export const amsFileMeta: any;
export const amsRemoveEvidence: any;
export const useEvidence: any;
