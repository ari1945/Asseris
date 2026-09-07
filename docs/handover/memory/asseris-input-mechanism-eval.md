---
name: asseris-input-mechanism-eval
description: "Evaluasi 2026-07-19 mekanisme input (form/upload) 158 modul — 41 memadai, 59 parsial, 45 display-only; 7 gap platform + rencana perbaikan 5 fase (brief tersimpan)"
metadata: 
  node_type: memory
  type: project
  originSessionId: 5520978f-41bf-4833-a66e-be6bc5e102f3
  modified: 2026-08-07T06:12:27.391Z
---

Evaluasi menyeluruh mekanisme input data per modul (2026-07-19, master `858b7e0`), laporan lengkap di `D:\Claude AI\09-AI-OPERATING-SYSTEM\Briefs\2026-07-19-evaluasi-mekanisme-input-asseris.md`.

**Skor:** 158 modul → MEMADAI 41 (26%) · PARSIAL 59 · DISPLAY-ONLY 45 · N/A 13.

**7 gap platform (akar masalah):**
1. **P1 — NOL penyimpanan file server** — ⚠️ **SUDAH DITUTUP** (lihat PROGRES PR-1/PR-2 di bawah; `server/src/attachments/store.ts` + model `Attachment` ber-`sha256` sudah hidup di master per 2026-08-07). Temuan asli: tak ada endpoint upload & model Attachment di Prisma; `FileDropField` (dms/clientportal/relatedsvc) simpan metadata+SHA saja; "impor Excel" psak16 = mockup (`ok:true` hardcode). **Jangan kutip "NOL file-storage" sebagai keadaan sekarang** — modul yang masih memakai daftar hardcode (mis. `WP_ATTACH` di view_wp.tsx) adalah modul yang belum DISAMBUNGKAN, bukan bukti tak ada penyimpanan.
2. **P2 — ingest eksternal nyata hanya 2**: WTB paste-CSV/TSV (validasi terkuat se-app) + konektor server (integrations). Tak ada import-kit generik.
3. **P3 — persist split-brain 3 tingkat**: server StateDoc (benar) vs localStorage mentah (SEMUA checklist PSAK, klaster OJK, spr2410, presentasi) vs useState murni = HILANG saat reload (evidence, internalaudit, sad, analytical-flux, psak73 param, ecl loss-rate).
4. **P4 — pola "seed + overlay"**: populasi inti (risk/confirm/subsequent/related/jet/payroll dst) hardcoded, user cuma toggle status.
5. **P5 — tombol aksi primer mati sistemik** (Buat PO, Aset Baru, Ajukan Cuti, Requisisi Baru, Lapor SPT, dll — tanpa onClick).
6. **P6 — validasi bermakna hanya di 3 titik**: AJEForm, WTB import, firmgl JV.
7. **P7 — scaffolding persist tanpa UI edit**: soqm & hrcase (setter tak pernah dipanggil).

**Temuan tajam:** seluruh SA pelaporan display-only (sa230/580/701/705/710/720/800/805/810) padahal itu deliverable audit; sa230 "Dokumentasi Audit" sendiri 0 input.

**Rencana 5 fase (belum PRD/belum build):** F0 fondasi (Attachment+upload, import-kit dari parser WTB, form-kit validasi, kebijakan persist tunggal) → F1 migrasi persist mekanis (useState→server, localStorage→server, wire soqm/hrcase) → F2 kertas kerja inti (editor sa230/580/701/705, populasi editable+impor) → F3 tombol mati + HR/back-office → F4 derivasi delivery/capacity dari scheduler + validasi silang. Kandidat PRD pertama: F0.1+F1.

**How to apply:** sebelum menambah fitur input apa pun, cek dulu brief ini — jangan tambal per-modul tanpa fondasi F0; pakai pola referensi AJEForm/WTB-import/[[asseris-authoritative-persist-key-recipe]].

**PROGRES (2026-07-19, branch `feat/f01-attachment-storage`, BELUM commit/PR):**
- PRD F0.1+F1 di `09-AI-OS/Briefs/2026-07-19-PRD-asseris-file-storage-persist-migration.md`, di-*Proceed*.
- ✅ **PR-1 (backend Attachment)**: model Prisma `Attachment` (scope/collection/refId + soft-delete + blob terenkripsi via secretbox seam `attachments/blobStore.ts`), router tRPC `attachment.upload/download/list/remove/usage` (RBAC WP_EDIT + engagement-isolation + assembly-lock + kuota 10MB/file·50MB/scope + SHA-256 diverifikasi server + audit ATTACH_UPLOAD/REMOVE). 283 test server hijau (+9 baru). Pakai `prisma db push` (bukan migration files).
- ✅ **PR-2 (klien byte nyata)**: `evidence.tsx` `amsHashFile` (Web Crypto SHA-256 nyata, ganti `amsFakeHash`), `FileDropField` bawa File asli; `api.ts` `amsAttachmentUpload/download/save/list/remove/usage`; DMS `addDoc` unggah byte + tombol Unduh di `view_docparts.tsx` PVerList di-wire. Typecheck+lint hijau (net -1 suppression, 0 `:any` baru — deklarasi window di `app-globals.d.ts` bertipe penuh, BUKAN `any`), 493 test migration hijau.
- ✅ Verifikasi live (browser+DB): upload→enkripsi→verify SHA→download byte-identik→audit→soft-delete purge. GOTCHA konfirmasi: `:any` baru un-suppress SELURUH file .ts/.tsx (ratchet) → WAJIB ketik penuh; screenshot MCP flaky (timeout) tapi console bersih.
- ✅ **PR-3 (useState→server, commit `03dc7a0`)**: 6 kertas kerja anti data-loss via `useAmsPersist` engagement-scope: evidence(`evidenceEval.v1`), sad(`sadItems/sadQual/sadMethod.v1`), internalaudit(`internalAudit.v1`), analytical-flux(`fluxState.v1`), psak73(`leaseOverride.v1`), ecl(`eclInputs.v1`) — 8 key baru di `AMS_PERSIST_SCOPE` (contexts.tsx). Swap pertahankan kontrak [val,setVal]. typecheck+lint(0 :any)+493 test hijau; round-trip ke-8 key di server hidup (versi naik, tanpa FORBIDDEN). GOTCHA: hapus alias `useState` yatim (view_calc) agar lint tak fail; screenshot/palette MCP flaky → verifikasi via api round-trip + component-registered, bukan drive-UI.
- F0.1 di-commit `e52c41d`. Branch `feat/f01-attachment-storage`, BELUM di-push/PR.
- ✅ **PR-4 (localStorage→server, commit `76d6c05`)**: 42 field DATA di 24 modul (psak1/2/14/16/19/22/24/25/46/48/58/65/66/68/71/72/117, syariah, sustain, sectorck, auditcomm, spr2410, sakroadmap, presentasi) dari localStorage → `window.useAmsPersist`. Aturan PREFIKS `PR4_ENGAGEMENT_KEY_RE` di contexts.tsx memetakan `<mod>.<field>.v1` → engagement-scope (hindari daftar 42 key). Field UI-pref (tab/unit/sel/scenario/idx) SENGAJA tetap localStorage (kebijakan F0.4). Dikerjakan via CODEMOD atomik (scratchpad `pr4-codemod.mjs`): `useState(()=>loader('ams.X.Y',SEED))`+useEffect → `useAmsPersist('X.Y.v1',()=>(SEED))`. GOTCHA codemod: (1) object-seed `{}` WAJIB jadi `()=>({})` bukan `()=>{}`; (2) CRLF kalahkan regex hapus-`\n` → orphan `const loader` (psak1) dibersihkan manual; (3) `null||X` seed picu TS2873 (psak71) → buang `null||`; (4) escape regkey SEKALI saja. typecheck+lint(0:any)+493 test hijau; prefiks→engagement + round-trip 9 keluarga key di server hidup terbukti. framework/compmatrix/pdp DILUAR cakupan (pref/aggregator firma).
- ✅ **PR-5 (wire soqm+hrcase, commit `cf494a9`)**: SOQM — klik sel Pemantauan → siklus status (setRisks), "Catat Keluhan" + "Lanjut" per-baris (setComplaints, dulu tak di-destructure). HRCases — "Catat Kasus" + drawer editable (select Karyawan/Severitas/Status + input Kategori) + "Tetapkan Sanksi & Tutup" (setCases). GOTCHA: (a) event handler `(e)=>` di file INI KENA implicit-any (JSX shim longgar, TANPA @types/react) → pakai tipe struktural minimal `(e: { target: { value: string } })` / `(e: { stopPropagation(): void })`, BUKAN :any; (b) callback ke receiver `any` (setRisks/setCases) = any-by-propagation (jangan anotasi); (c) helper standalone arrow WAJIB tipe (pakai tipe lokal HcCase/SoqmMonRow/SoqmCmpRow). typecheck+lint+493 hijau; round-trip hrCases(HR_MANAGE)+soqmRisks&complaints.v2(FIRM_ADMIN) firm-scope terbukti.

**✅ PRD F0.1+F1 TUNTAS SEMUA (5 PR).** Branch `feat/f01-attachment-storage` = 4 commit (`e52c41d` F0.1[PR-1+2], `03dc7a0` PR-3, `76d6c05` PR-4, `cf494a9` PR-5), master `858b7e0`. BELUM di-push/PR — tunggu instruksi Ari. Sisa evaluasi (di luar PRD ini): Fase 2 editor kertas kerja SA pelaporan (sa230/580/701/705), Fase 3 sapu tombol-mati back-office/HR, Fase 4 derivasi delivery/capacity + validasi silang.
