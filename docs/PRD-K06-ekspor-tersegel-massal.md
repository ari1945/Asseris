# PRD — K-06 Ekspor Tersegel Massal: Wire Tombol "Kertas Kerja" Mati (PSAK + Analitis)

| Field | Nilai |
|---|---|
| Status | Implemented — gelombang 1 (17 tombol PSAK/analitis) + gelombang lanjutan (26 tombol non-PSAK) selesai 2026-08-14 (branch `feat/k06-export-sealed-v2`); total 43 tombol; `npm run verify` hijau. **Perluasan 2026-08-14 (PR #229, `feat/amsprintdoc-to-amsexportpdf`)**: migrasi jalur cetak lama `amsPrintDoc` (window.print DOM, TANPA segel) → `amsExportPdf` tersegel di 9 view / 11 tombol (fsgen, opinion, onboarding2, final3, isak35, misc1, nonaudit2 ×2, payroll, pipeline) — sisa Program A. 0 `:any` baru, live-verify 6/6 PDF SEALED. **Perluasan 2026-08-14 (PR #230, `feat/program-a-sisa-konfirmasi-rep`)**: wire 3 tombol mati → `amsExportPdf` tersegel — surat konfirmasi (SA 505, view_confirm ×2: surat + respons) & Surat Representasi Tertulis (SA 580, view_sad). Live-verify 2/2 PDF SEALED |
| Tanggal | 2026-08-14 |
| Pemilik | Ari Widodo |
| Kelas cacat | Output tertinggal: 50+ tombol "Ekspor/Kertas Kerja" tanpa onClick (dead button) — angka SSOT matang tapi tidak bisa dikeluarkan sebagai kertas kerja |
| Basis temuan | Evaluasi kedalaman E-9 (Program A, 2026-08-13): 37/158 modul punya ekspor; D rata-rata 2,5; 16 tombol "Kertas Kerja" PSAK mati |

---

## 1. Problem

Platform membangun SSOT server yang kuat (canon + tRPC + useAmsPersist), tetapi
**output hasil kerja tertinggal**: mayoritas modul menampilkan register & kertas
kerja yang matang angkanya, lalu tombol "Kertas Kerja" / "Export" di SubBar
**tidak melakukan apa-apa** (tidak ada `onClick`). Konsisten dengan E-1..E-8
(D = 2,5) dan E-9 (hanya 37/158 modul punya kanal ekspor).

Kasus paling merugikan (sub-agen C2): **16 tombol "Kertas Kerja" mati di modul
PSAK** — termasuk psak46 (rekonsiliasi fiskal + pajak tangguhan = modul paling
dalam secara angka) dan psak71 (sign-off sudah ada, ekspor ECL tidak ada).
Satu-satunya pengecualian: psak16 (sudah tersegel XLSX sejak W10.5 Fase 2).

### Mengapa ini penting

- **SPAP kertas kerja**: hasil kerja auditor harus bisa dikeluarkan sebagai
  kertas kerja yang dapat direview/diarsipkan — tombol yang mati = pekerjaan
  tidak terdokumentasikan.
- **Infrastruktur sudah siap**: `amsExportXlsx` (export_xlsx.ts) menghasilkan
  .xlsx nyata + segel Ed25519 otomatis (nol-vendor, hash kanonik deterministik).
  Role model psak16 membuktikan polanya: `kind` → `exportSeal` → sheet model →
  download. Tinggal di-replikasi.
- **Nilai langsung terlihat**: tanpa mengubah angka (SSOT sudah benar), setiap
  modul naik kedalaman output 1–2 level.

---

## 2. Objective (gelombang 1)

Wire tombol mati yang SUDAH ADA di UI ke `amsExportXlsx` — tanpa menambah modul
baru, tanpa mengubah SSOT angka. Gelombang 1 = **semua 16 tombol "Kertas Kerja"
PSAK + 2 tombol lintas** (analytical, sa520) + 2 tombol aksi pendukung.

Kriteria:
1. Setiap tombol yang tadinya mati sekarang mengunduh .xlsx **tersegel Ed25519**
   (otomatis via `amsExportXlsx`; tampilkan "TIDAK TERSEGEL" jujur bila server
   tak tersedia / peran tanpa kapabilitas ekspor).
2. Angka dalam sheet **dari canon/SSOT yang sama** dengan layar (fmt id-ID,
   satuan konsisten dengan modul: Rp juta atau Rp penuh sesuai konteks).
3. Tidak ada `:any` baru (ratchet W15); suppression baseline tidak berubah.
4. `npm run verify` hijau (cermin CI).

**Bukan:** menambah modul baru, mengubah angka SSOT, atau mengubah jalur
`amsPrintDoc` untuk output klien (tahap lanjutan — daftar di §5).

---

## 3. Ruang lingkup (gelombang 1 — 19 file, 17 tombol ekspor + 2 tombol aksi)

| Modul | View | Tombol | Isi sheet (SSOT) |
|---|---|---|---|
| ecl | view_calc.tsx | Kertas Kerja B-7 | Matriks provisi (bucket × loss rate interaktif) + komposisi stage — canon.psak71 |
| psak46 | view_psak46.tsx | Kertas Kerja PPh | Rekonsiliasi fiskal + beda temporer/DTA + mutasi DTA neto + ETR — canon.deferredTax |
| psak71 | view_psak71.tsx | **Ekspor B-7 (XLSX) — BARU** | Matriks provisi + skenario forward-looking + mutasi CKPN — canon.psak71 |
| psak14 | view_psak14.tsx | Kertas Kerja C | Roll-forward + klasifikasi + uji NRV per-SKU — canon.inventory |
| psak72 | view_psak72.tsx | Kertas Kerja R | Jembatan harga transaksi + disagregasi + tie-out — canon.revenue |
| psak2 | view_psak2.tsx | Kertas Kerja | Arus kas per aktivitas + rekon saldo — FSGEN.cf |
| psak19 | view_psak19.tsx | Kertas Kerja E-INT | Roll-forward + klasifikasi kelompok — canon.intangibles |
| psak22 | view_psak22.tsx | Kertas Kerja G-2 | Register PPA per akuisisi + rekonsiliasi — canon.psak22 |
| psak24 | view_psak24.tsx | Kertas Kerja H-2 | Rekonsiliasi DBO + peta penyajian — canon FIG |
| psak25 | view_psak25.tsx | Kertas Kerja | Katalog perubahan + register estimasi — canon.psak25 |
| psak48 | view_psak48.tsx | Kertas Kerja P-48/57 | Uji penurunan UPK + VIU DCF + sensitivitas + register provisi — canon.psak48/57 |
| psak58 | view_psak58.tsx | Kertas Kerja E-7 | Reklasifikasi disposal group + pengukuran FVLCS + operasi dihentikan — canon.psak58 |
| psak65 | view_psak65.tsx | Kertas Kerja G-1 | LPK konsolidasian + entitas anak — canon.psak65 |
| psak66 | view_psak66.tsx | Kertas Kerja G-3 | Register pengaturan bersama + metode ekuitas — canon.psak66 |
| psak68 | view_psak68.tsx | Kertas Kerja V-1 | Inventaris pos FV + roll-forward Level 3 + sensitivitas — canon.psak68 |
| psak73 | view_lease.tsx | Skedul Amortisasi | Skedul amortisasi liabilitas sewa (kontrak aktif) — leaseCalc |
| analytical | view_analytical.tsx | Export Kertas Kerja | Sinyal fluktuasi CY/PY + rasio vs benchmark — arDerive |
| sa520 | view_sa520.tsx | Kertas Kerja Analitis | Telaah selisih per akun + status investigasi — sa520.v1 |
| ecl | view_calc.tsx | Usulkan AJE → nav('aje') | (tombol aksi, bukan ekspor — mati → hidup) |

Pola implementasi (role model psak16):
```ts
const [exporting, setExporting] = useStateX(false);
const onExportXlsx = async () => {
  if (exporting || !data) return;
  setExporting(true);
  try {
    await amsExportXlsx({
      kind: '<modul>-kk-<wp>', scope: 'engagement', scopeId: eng?.id,
      fileName: `...xlsx`, firm: <nama firma>,
      title: `...`, meta: [...],
      sheets: [{ name, heading, columns, rows, totals?, colWidths? }],
    });
  } finally { setExporting(false); }
};
```
- State `exporting` WAJIB di atas early-return (rules-of-hooks).
- Parameter map callback memakai **tipe objek eksplisit** (bukan `: any`).
- Nama firma: `(AMS.FIRM as { name?: string } | undefined)?.name` dengan fallback.

---

## 4. Verifikasi

1. `npx tsc --noEmit` + `npx eslint src` — 0 error; `git diff eslint-suppressions.json` **kosong** (tidak ada `:any` baru).
2. `npx vitest run` — 1.673 test hijau (klok_ssot, overlay, seal dll).
3. `npx vite build` — sukses; xlsx chunk lazy (boot tak terdampak).
4. `npm run verify` dari root — hijau (cermin CI).
5. Live verify (browser): login → buka psak46/psak71/ecl → klik tombol → file
   .xlsx terunduh ber-sheet Segel dengan seal ID + hash konten.

---

## 5. Gelombang lanjutan — SELESAI (PR #228)

Gelombang lanjutan me-wire **26 tombol ekspor mati non-PSAK** (total 43 sejak
gelombang 1), pola identik `amsExportXlsx`/`amsExportPdf` tersegel:

- **Register inti:** materiality (→ tab memo, MatMemo sudah punya Unduh PDF),
  compmatrix (Export Register), kb (Ekspor Indeks + Simpan PDF), related
  (Daftar Pihak Berelasi), sad (Export SAD + Lampiran SUM).
- **Memo SA display:** sa200, sa501, sa230, subsequent, internalaudit (SA 610),
  evidence (SA 500 ×2), sa800/805/810 (memo + laporan pratinjau), sjah3000.
- **Operasi firma:** delivery (rencana), wip_firm (laporan WIP), tax23 (SPT Masa
  + bukti potong), psak1 (checklist penyajian), timebudget (timesheet), cockpit
  (programme), cockpit2 (status report), compliance (kertas kerja), groupaudit
  (memo ×2), bi (paket dewan), bo1 (register arsip), governance (evaluasi SMM),
  people (direktori + deklarasi), pc_hcm (profil 360°), platform3 (bukti entri
  audit), misc2 (kartu template), dashboard (KPI), firmfinance (LK KAP), firmops
  (paket operasi).

Yang tersisa untuk PR berikutnya:

1. **Output klien via PDF tersegel**: migrasi jalur `amsPrintDoc` → `amsExportPdf`
   untuk laporan yang diterbitkan (segel Ed25519, pola K-01).
2. **L5 PSAK**: psak71 jadi percontohan rantai penuh (state.set + sign-off +
   ekspor tersegel + audit chain) — Program C E-9.

---

## 6. Kaitan

- `PRD - W10.5 Ekspor (PDF-XLSX) & Segel Nol-Vendor.md` — Implemented (mesin
  yang dipakai; PR ini = perluasan cakupan konsumen, bukan mesin baru).
- `PRD-USULAN-PENGEMBANGAN-E9-KEDALAMAN.md` — Program A (ekspor tersegel massal).
- E-9 batch C2 — daftar 16 tombol "Kertas Kerja" mati PSAK.
