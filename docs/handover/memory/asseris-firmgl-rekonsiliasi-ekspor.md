---
name: asseris-firmgl-rekonsiliasi-ekspor
description: "Firm GL — laporan keuangan tanpa status rekonsiliasi, nol ekspor, pelaku jejak dari seed; plus temuan cakupan rekonsiliasi yang berhenti di 4 akun kontrol"
metadata: 
  node_type: memory
  type: project
  originSessionId: 9235b198-ecb0-4eab-8094-166ba008cc2a
  modified: 2026-08-21T21:49:11.344Z
---

Arc `firmgl` (prompt `docs/prompts-perbaikan/28-firmgl.md`, dikerjakan 2026-08-22). Tiga cacat
kabel — mesinnya sudah ada, modulnya tak pernah menyambungkannya:

- **G1** tab Laporan Keuangan merender neraca firma tanpa menyebut apakah rekonsiliasinya
  menutup (`grep -n reconcil view_firmgl.tsx` → kosong), padahal `FIRMFIN.reconciliations()`
  sudah teruji dan sudah dipakai Firm Finance untuk MENGUNCI ekspor.
- **G2** empat tab data, nol `amsExport`.
- **G3** `who = (AMS.USER && AMS.USER.name) || 'Pengguna'` → jejak `GL_POST` mencatat seed
  (`Anindya Pramesti`) meski yang menekan tombol sesi lain (`Hartono Wijaya`).

Perbaikan: modul murni `firm_gl_export.ts` (gerbang Q-2 + 4 pembangun model XLSX) dan
`firm_gl_actor.ts` (`glActor` / `glWriteAllowed`), disambungkan di `view_firmgl.tsx`.

## GOTCHA yang mahal

- **`FIRMFIN.reconciliations()` hanya mencakup 4 akun kontrol** — `1-101…1-106` · `1-200` ·
  `1-300` · `2-100`. **`1-400` Aset Tetap TIDAK ada di dalamnya**, jadi selisih 3.374 jt yang
  dicatat PRD §9 tak dapat dinyatakan lewat mesin ini; menyambungkan G1 TIDAK menutupnya.
  Prompt 28-firmgl menyiratkan sebaliknya. Cara jujur: tampilkan `coveredCodes` yang
  DITURUNKAN dari barisnya, dan munculkan klausa "termasuk 1-400" hanya bila kode itu memang
  tak ada di daftar — bukan kalimat yang diketik lalu jadi basi.
- **Keadaan seed hari ini HIJAU**: keempat baris `bridged`, residual **nol**. Uji yang hanya
  menjalankan seed tak pernah menyentuh jalur pemblokiran → tiap uji blokir wajib
  MEMBUKTIKAN premisnya (`status === 'open'` tercapai) lebih dulu.
- **Jurnal beban yang dibayar dari kas langsung membuat baris Kas `open`** (kontrol kas
  bergerak, sub-buku bank tidak) ⇒ ekspor LK terkunci. Saat menulis uji "angka ekspor
  bergerak", pilih akun yang BUKAN kontrol (mis. `5-200`/`2-300`) — kalau tidak, ujimu gagal
  karena gerbang yang benar, bukan karena cacat.
- **`:any` baru di berkas ber-suppression = SELURUH berkas un-suppress** (138 error lint dari
  satu `(a: any)`). Ganti dengan tipe nyata (`CoaAccount`), jangan sinkronkan baseline.
- **Heredoc `<<'EOF'` lewat tool Bash gagal** untuk berkas TS besar ("unexpected EOF"); pakai
  Write. Untuk mutasi kecil pada berkas CRLF: python `io.open(..., newline='')` + `assert
  s.count(old)==1`.
- **`preview_start` name `dev-all` mati senyap** bila :5181 sudah dipakai sesi lain —
  `concurrently -k` membunuh vite juga. Pakai `vite-5185`; proxy `/trpc` tetap ke :5181 milik
  sesi lain dan login-nya ikut terpakai.
- **Klik/Enter dari alat browser in-app tidak selalu sampai** ke tombol tab; `javascript_tool`
  + `element.click()` sampai. Screenshot tak tersedia (pane tak ditampilkan) — verifikasi
  lewat `innerText`/atribut DOM.
- Worktree bersama: `npm run lint` merah di `view_mytasks_parts.tsx` karena sesi LAIN
  menurunkan baseline di `eslint-suppressions.json` tanpa mengubah berkasnya; `typecheck`
  merah di `mytasks_derive.ts` (berkas belum-terlacak sesi lain). Bukan milik arc ini.

## Yang TIDAK dikerjakan

- Pola `who` yang sama masih ada di `FirmAPAR` (`view_firmgl.tsx` ~baris 403, modul `apar`) —
  di luar lingkup, sengaja tidak digerbangi (irisan gerbang berhenti sebelum `FirmJVForm`).
- PR-2..PR-6 `docs/prd-firm-erp-deepening.md` tidak disentuh.
- Usulan menunggu keputusan Ari: apakah pemblokiran Q-2 berlaku juga untuk ekspor Neraca
  Saldo (Q-2 hanya menyebut LK; TB dibiarkan bebas).

Terkait: [[asseris-cash-bank-recon-register]] · [[asseris-wip-rollforward-falsifiable]] ·
[[asseris-firm-erp-deepening-arc]] · [[asseris-sesi-paralel-satu-worktree]]
