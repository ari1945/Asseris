---
name: asseris-diagnostic-atribusi-masukan
description: "PR #288 modul diagnostic — keputusan atas nama kolega nyata, mesin yang tak diberi data perikatan, detektor bisu; plus jebakan wtbRows([]) jatuh ke singleton dan useFirm().firm yang tak ada"
metadata: 
  node_type: memory
  type: project
  originSessionId: 54d60740-f888-499e-ba41-b19d679e3313
  modified: 2026-08-22T17:04:55.353Z
---

Modul `diagnostic` (Tax Audit Diagnostic), PR #288 (2026-08-23, CI 9/9, cabang
`fix/diagnostic-jejak-keputusan` di atas `dc1d2d5`). D1–D5 dari
`docs/prompts-perbaikan/72-diagnostic.md`. Mesin `diagnostics.ts` TIDAK disentuh.

**GOTCHA TERBESAR — `wtbRows([])` jatuh ke singleton.** `canon_base.ts:13`:
`return (wtb && wtb.length) ? wtb : ((AMS && AMS.WTB) || [])`. Jadi
`figuresFromWTB([])` / `fiscalReconciliation([])` BUKAN "nol" — ia angka neraca
saldo SEED. Memanggil kanon dengan neraca saldo kosong untuk "membuktikan
ketiadaan" justru mengulang cacat data-pinjaman satu lapis lebih dalam.
`fiscalReconciliation([], []).available` = **true**, bukan false. Solusi:
jangan sentuh kanon bila `wtb.length === 0`; kirim `fig: {}` (objek kosong
truthy ⇒ mesin tak jatuh ke `FIG`) dan laporkan masukannya tak tersedia.

**Pola `ctx.x || bawaan`.** `amsDiagnostics` menarik bawaan untuk kunci yang tak
dikirim. Larik KOSONG truthy — `[] || X` = `[]` — jadi mengirim `journalPop: []`
adalah cara mematikan bawaan ilustratif tanpa menyentuh mesin.

**Bukti premis yang bisa diulang.** Dengan ctx lama (`{aje}` saja), ENG-2025-040
dan ENG-2025-063 menghasilkan 12 temuan IDENTIK byte-per-byte (termasuk
`jet-concentration` dari populasi demo). Cara membuktikannya: uji sekali-pakai
yang membandingkan sidik `id|sev|detail`, lalu dihapus.

**Detektor: enam, bukan empat.** `grep -o "detector: '[a-zA-Z]*'" diagnostics.ts`
→ `benford` `bookTax` `forensic` `jet` `reconcile`; `crossChecks` disuntik
`diagnostics_panel.tsx`. Prompt menyebut empat. Pada data hari ini **2 dari 6
tidak dapat berjalan** (`jet`, `forensic` — butuh populasi jurnal entitas yang
belum ada di aplikasi); pada perikatan tanpa neraca saldo **4 dari 6**.

**Fallback bernama = nama kolega nyata.** `'Anindya Pramesti'` di
`diagnostics_panel` bukan nama karangan — `data_part1.ts` memakainya di
`AMS.USER` DAN `AMS.TEAM`. Gerbang anti-kambuh yang benar mengambil daftar nama
DARI `AMS.USER`/`AMS.TEAM` saat uji berjalan, bukan mengetik ulang literalnya.

**Klok.** Menghapus `new Date()` dari sebuah berkas WAJIB disertai mencabut
entrinya dari `IZIN` di `clock_ssot.test.ts` — uji "berkas berizin tidak
diam-diam menambah pemakaian" memerah pada `izin 1, nyata 0` juga.

**Ratchet `:any`.** Menghapus kode menurunkan hitungan ⇒ `npm run lint` keluar
dengan **exit 2** ("suppressions left that do not occur anymore") meski nol
error dicetak. `npm run lint:any-baseline` TIDAK selalu cukup; jalankan
`npx eslint src --prune-suppressions` lagi setelah edit terakhir.

**Cacat yang saya temukan tapi TIDAK kerjakan (chip tugas dibuat):**
`useFirm()` tak punya kunci `firm` (`contexts.tsx:1079-1088`), sementara
`view_firmtreasury.tsx:252` membacanya ⇒ `firmName` selalu kosong ⇒
`bankReconExportModel` melempar ⇒ tombol ekspor Kas & Bank (#283) tak pernah
menghasilkan berkas dan diam. Nama firma yang BERISI: `useAuth().firm`
(`contexts.tsx:983`) atau `AMS.FIRM.name` (preseden cockpit C-2).

**Keputusan lama tidak dibuang.** `diagnostics.v1` sudah berisi keputusan
bentuk lama (pelaku seed, stempel tanpa tanggal). Dipertahankan tetapi DILABELI
`legacy` di layar dan di kolom `Atribusi` kertas kerja — menghapus membuang
kerja auditor, menampilkan setara akan menyegel atribusi yang salah.

Berkas baru: `diagnostics_decision.ts` (pola `bank_recon_actor` — tanpa
identitas sesi ⇒ `null`, bukan fallback) · `diagnostics_inputs.ts` (ctx +
registri detektor + tiga keadaan) · `diagnostics_export.ts` · dua berkas uji
(9 uji sumber + 25 uji perilaku).

Terkait: [[asseris-cashbank-kurs-masa-berlaku]] · [[asseris-klok-ssot-jam-mesin]] ·
[[asseris-jet-corong-populasi]] · [[asseris-wp-signoff-ditolak-senyap]]
