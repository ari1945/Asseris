# PRD — Wedge MVP Build · Diagnostik & Analitik Audit TB+GL (Lokal)

> Basis: `Wedge MVP — Diagnostik & Analitik Audit (SA 240-520-530).md` (definisi referensi).
> Status: **BUILD AKTIF** · Pemilik: Ari Widodo · Tanggal: 2026-06-22
> ⚠️ Build ini meng-**override gerbang validasi §11** wedge-doc atas keputusan sadar Ari
> (tanpa Sprint Discovery). Risiko pasar diterima. Lihat memory `wedge-mvp-build-decision`.

---

## 1. Problem
Auditor KAP kecil–menengah wajib menjalankan penilaian risiko fraud (SA 240), pengujian
jurnal (JET), dan prosedur analitis (SA 520) lalu **mendokumentasikannya** untuk reviu mutu
/inspeksi PPPK. Saat ini via Excel: lambat, rapuh, sulit dipertahankan saat inspeksi.

## 2. Objective
Alat **lokal/offline** yang menelan Trial Balance + General Ledger klien dan mengeluarkan
**temuan analitik & pengujian jurnal ter-peringkat, dipetakan ke SA 240/520/530, siap masuk
kertas kerja** — tanpa data klien keluar dari firma.

## 3. Success Criteria (Definition of Done §10 wedge-doc)
Auditor KAP kecil bisa: **impor TB+GL nyata → temuan ter-SA dalam <10 menit → putuskan
terima/tolak → ekspor kertas kerja tersegel yang lolos reviu mutu — seluruhnya offline
(0 panggilan jaringan).**

Kriteria terukur:
- SC1 — Bundel statis berjalan dari `file://` / serve lokal, **0 request jaringan** (DevTools Network kosong).
- SC2 — Impor TB+GL contoh (template tunggal) → `DiagCtx` valid + gerbang control-total lulus (dr=cr, TB tie).
- SC3 — `amsDiagnostics(ctx)` menghasilkan temuan dari data impor (bukan seed); book-tax tetap **bebas false-positive** (paritas P4).
- SC4 — Tiap temuan dipetakan SA 240/520/530 + keputusan terima/tolak ter-persist & ter-render ulang pasca-reload.
- SC5 — Ekspor PDF + XLSX berisi temuan+keputusan+rujukan SA, **ter-seal** & verifiable.

## 4. Scope (MASUK — §7 wedge-doc)
- 1 alur: impor TB+GL → jalankan → tinjau temuan → ekspor kertas kerja.
- 3 keluarga analitik: **JET (SA 240)** · **Benford** · **analitik/book-tax (SA 520)**.
- 1 format ekspor langsung-pakai (PDF + XLSX tersegel).
- Narasi temuan = **template deterministik** (LLM OFF).

## 5. Non-Scope (§8 wedge-doc — JANGAN masuk MVP)
- Manajemen kertas kerja penuh, materialitas, opini, lifecycle engagement.
- Multi-user, cloud, auth/RBAC, konektor langsung software akuntansi.
- ~149 modul firma-OS lain (itu DEMO/showcase, bukan produk).
- Integrasi real-time; cukup impor berkas.
- LLM/narasi cloud (data klien tak ke cloud).

## 6. Constraints
- Reuse mesin teruji: `diagnostics.ts` (`amsDiagnostics(ctx)`), `canon*`, `forensic_canon`, `export_pdf`/`export_xlsx` + seal Ed25519 (W10.5).
- Bahasa UI Indonesia; angka `rp()`/`fmt()` id-ID.
- Offline mutlak — tak boleh ada fetch ke backend tRPC, CDN data, atau LLM.

## 7. Existing Solutions (reuse vs buang — §9)
- **PAKAI ULANG:** canon + forensic + `diagnostics`(`AMS_DIAG`) + export/seal + UI `DiagnosticPanel`/`view_diagnostics`.
- **TIDAK untuk wedge:** backend tRPC/auth/RBAC/konektor, mayoritas view (~149 modul), `main.tsx` 215-import.

## 8. Keputusan arsitektur terkunci (D1–D5, sign-off 2026-06-22)
- **D1 Packaging = static-local** (Vite `build` → folder; buka `file://`/serve lokal). Electron menyusul tanpa ubah inti.
- **D2 Repo = branch `wedge-mvp`** di repo Asseris; entry HTML+main baru (`wedge.html` + `src/wedge/`), reuse modul kanon. Tak menyentuh `master`.
- **D3 Template impor = 1 template Excel/CSV terdefinisi**, header tetap, validasi keras (tak ada parser universal).
- **D4 Ekspor = reuse `export_xlsx`+`export_pdf`; seal OFFLINE Ed25519 (WebCrypto)** — KOREKSI 2026-06-22: seal W10.5 memanggil server (`./api`→`exportSeal`), melanggar offline. Wedge tandatangani hash konten in-browser via WebCrypto (kunci lokal). Segel kriptografis nyata, tanpa backend.
- **D5 Narasi = template deterministik, LLM OFF.**

## 9. Proposed Approach (kontrak teknis)
Inti: mesin `amsDiagnostics(ctx: DiagCtx)` ([diagnostics.ts:188]) sudah ter-parameterisasi.
Build = **importer yang memetakan TB+GL nyata → `DiagCtx`**, bukan menulis mesin baru.

`DiagCtx` yang harus diproduksi importer:
- `journalPop: DiagJournal[]` ← GL. Tiap baris: `{ id, amount, flags[], forensic[], rpId, dir, party, cash }`.
  **`flags[]` (kriteria risiko SA 240) HARUS diturunkan importer** dari GL mentah (akhir-pekan,
  nilai bulat besar, jurnal manual, backdate, akun tak lazim, ambang otorisasi) — saat ini logika
  ini ada di `forensic_canon` atas data seed → **titik build berisiko tertinggi.**
- `fig: Partial<Fig>` ← TB (untuk Benford + book-tax/analitik SA 520).
- `reconcileRows` ← turunan TB (opsional MVP).

## 10. Risks
- **R1 (tinggi) — Derivasi flag forensik atas data impor.** Logika flag JET kini di `forensic_canon`
  atas seed. Mitigasi: spike di awal Fase 2 — ekstrak/port `deriveJournalFlags(rawRow)` reusable.
- **R2 — Carve-out dependensi kanon.** `diagnostics.ts` impor `canon_base`/`canon_part3`/`forensic_canon`
  yang bisa menarik data seed saat load. Mitigasi: petakan graf impor minimal di Fase 1; selalu pasok
  ctx penuh agar fallback seed tak terpanggil.
- **R3 — Build tanpa validasi pasar** (gerbang §11 di-override). Diterima sadar; di luar kendali teknis.
- **R4 — Paritas false-positive book-tax** saat fig berasal dari TB impor (bukan FIG seed). Mitigasi: uji regresi vs P4.

## 11. Implementation Plan (fase + exit)
- **F1 Carve-out shell lokal** — entry `wedge.html`+`src/wedge/main_wedge.tsx`; muat HANYA kanon+diagnostics+panel; buang backend/proxy/215-import. **Exit:** diagnostics jalan dari seed, 0 jaringan, offline.
- **F2 Importer TB+GL → DiagCtx** (+ spike R1 lebih dulu) — ingest Excel/CSV template D3, derive flags, control-total gate. **Exit:** unggah contoh → DiagCtx valid.
- **F3 Wire engine ke data impor** — `amsDiagnostics(ctxImpor)` → temuan ter-SA. **Exit:** temuan dari data nyata, book-tax bebas FP.
- **F4 Tinjau & putuskan** — reuse `DiagnosticPanel` terima/tolak + jejak audit (localStorage). **Exit:** keputusan persist pasca-reload.
- **F5 Ekspor tersegel** — reuse export_pdf/xlsx + seal. **Exit:** ekspor ter-seal & verifiable.
- **F6 DoD §10** — buktikan alur penuh <10 menit offline.

## 12. Open Questions (diteruskan ke build, bukan blocker)
- Template D3 final: kolom wajib TB & GL — dikunci di awal F2 (pakai struktur seed sebagai acuan).
- Akun "tak lazim" & ambang otorisasi: definisikan default konservatif di F2; konfigurasi ditunda.
