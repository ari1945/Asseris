# Wedge MVP — Diagnostik & Analitik Audit (SA 240/520/530)

> Produk *wedge* dari **Asseris** · pembeli: **KAP kecil–menengah independen**
> Tanggal: 2026-06-22 · Pemilik: Ari Widodo

> ⛔ **STATUS: DEFINISI REFERENSI — JANGAN DIBANGUN.** Dokumen ini mengunci ruang
> lingkup **minimum** agar, bila Sprint Discovery lolos gerbang, build tetap sempit
> (bukan kembali ke "everything app"). **Prasyarat build = gerbang validasi lolos**
> (lihat §11). Bila lolos → dokumen ini jadi basis PRD build (aturan PRD-first vault).

---

## 1. One-liner
Alat **lokal** yang menelan *Trial Balance* + *General Ledger* klien, lalu mengeluarkan
**temuan analitik & pengujian jurnal ter-peringkat, dipetakan ke SA 240/520/530, siap
masuk kertas kerja** — tanpa data klien pernah keluar dari firma.

## 2. Pembeli & Job-to-be-done
- **Pembeli:** partner/manajer KAP kecil–menengah independen.
- **Job:** "Saat fieldwork saya wajib melakukan penilaian risiko kecurangan (SA 240),
  pengujian jurnal (JET), dan prosedur analitis (SA 520), lalu **mendokumentasikannya**
  untuk reviu mutu/inspeksi PPPK — sekarang via Excel: lambat, rapuh, sulit dipertahankan."
- **Painkiller, bukan vitamin:** hemat jam kerja **+ dokumentasi defensif** untuk inspeksi.

## 3. Prinsip wedge (jangan dilanggar)
1. **ADD-ON, bukan pengganti** sistem/metodologi audit firma → biaya beralih ~nol.
2. **LOKAL / on-prem** → data klien tak keluar (runtuhkan tembok kerahasiaan + kontinuitas vendor).
3. **Satu pekerjaan, 10× lebih baik** — bukan akumulasi modul.

## 4. Input (minimum)
- **Trial Balance** (Excel/CSV) — kode akun, nama, saldo (unadj/adj/ly).
- **General Ledger / daftar jurnal** (Excel/CSV) — tanggal, akun, dr/cr, nilai,
  user/pembuat, deskripsi.
- *Opsional:* daftar pihak berelasi (uji RPT), AJE.
- **Satu template impor terdefinisi** (toleransi format minimal di MVP — jangan over-engineer parser).

## 5. Mesin (REUSE dari Asseris — sudah ada & teruji)
- `diagnostics.ts` / `AMS_DIAG` (deterministik) di atas `canon` + `forensic`.
- Komponen:
  - **JET (SA 240):** skoring kriteria-risiko jurnal — akhir pekan, nilai bulat besar,
    jurnal manual, entri tanggal-mundur, akun tak lazim, pemilihan berbasis ambang.
  - **Benford's Law:** anomali distribusi digit.
  - **Prosedur analitis (SA 520):** rasio/tren + rekonsiliasi *book-tax* (ETR) —
    sudah bebas false-positive (terbukti di P4).
  - **Sintesis lintas-cek** → temuan ter-peringkat.
- **Deterministik = dapat ditelusuri = dipercaya auditor** (auditor tetap penanggung jawab;
  ini meruntuhkan tembok "kotak hitam").

## 6. Output (deliverable — INILAH yang dibeli)
- **Daftar temuan ter-peringkat**, tiap temuan dipetakan ke referensi SA (240/520/530) + dasar/penjelasan.
- **Keputusan auditor per temuan** (terima/tolak) dengan **jejak audit** — dokumentasi reviu.
- **Ekspor kertas kerja PDF/XLSX** (REUSE `export_pdf`/`export_xlsx` + seal) — siap arsip & inspeksi.
- **Narasi penjelasan:** *deterministik-template di MVP*. Opsi LLM ditunda / hanya non-cloud
  belakangan — **jangan kirim data klien ke cloud di MVP** (jaga tembok kerahasiaan).

## 7. Ruang lingkup MINIMUM (yang MASUK MVP)
- **1 alur:** impor TB+GL → jalankan → tinjau temuan → ekspor kertas kerja.
- **3 keluarga analitik:** JET · Benford · analitik/book-tax.
- **1 format ekspor** yang firma bisa langsung pakai di kertas kerja.

## 8. NON-SCOPE (eksplisit — JANGAN masuk MVP)
- Manajemen kertas kerja penuh, materialitas, opini, lifecycle engagement.
- Multi-user, cloud, auth/RBAC, konektor langsung ke software akuntansi.
- ~149 modul firma-OS lain — itu **DEMO/showcase, bukan produk**.
- Integrasi real-time; cukup **impor berkas**.

## 9. Reuse vs buang (dari codebase Asseris)
- **PAKAI ULANG:** `canon` + `forensic` + `diagnostics` (`AMS_DIAG`) + `export`/seal + panel diagnostik UI.
- **TIDAK untuk wedge:** backend tRPC/auth/RBAC/konektor SaaS, mayoritas view.
- **Implikasi arsitektur:** kemungkinan repackage jadi **app lokal** (mis. Electron/desktop
  atau berkas-statis lokal) — diputuskan pasca-validasi. Backend SaaS eksisting **kurang relevan**
  untuk wedge lokal.

## 10. Definition of Done (MVP)
Auditor KAP kecil bisa: **impor TB+GL nyata → temuan ter-SA dalam <10 menit → putuskan
terima/tolak → ekspor kertas kerja yang lolos reviu mutu — seluruhnya offline.**

## 11. Gerbang (WAJIB — prasyarat build)
**JANGAN bangun** sebelum Sprint Discovery lolos: **≥5 dari ~8 wawancara** mengonfirmasi
sakit akut + sinyal *willingness-to-pay* kredibel + **≥1 firma mau pilot dengan data nyata**.
- **Lolos** → dokumen ini jadi basis **PRD build** (sempit, sesuai §7–§8).
- **Tidak lolos** → pivot wedge / stop (jangan bangun atas asumsi tak tervalidasi).

## 12. Pertanyaan terbuka (diisi oleh Discovery)
1. Apakah KAP kecil benar-benar lakukan JET/analitik ketat, atau hanya formalitas? (penentu pain)
2. Format TB/GL apa yang realistis mereka ekspor (dari software akuntansi mana)?
3. Model & harga: per-engagement vs lisensi tahunan; angka WTP nyata.
4. Lokal-desktop vs lokal-berkas-statis — mana yang mereka percaya & bisa jalankan.
5. Branding/kredibilitas: berdiri sendiri vs "didukung Ecovis" (meredam ketakutan kontinuitas).
