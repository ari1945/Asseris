---
name: asseris-firm-erp-deepening-arc
description: "Arc Keuangan Firma (ERP) — 6 PR disetujui; PR-1 (register aset tunggal) SELESAI di branch feat/firm-erp-pr1-asset-register, PR-2..PR-6 belum"
metadata: 
  node_type: memory
  type: project
  originSessionId: 64cead36-9267-43bb-83ba-ca06dd6b53da
  modified: 2026-08-15T23:23:21.692Z
---

PRD `docs/prd-firm-erp-deepening.md` — pendalaman grup menu **"Keuangan Firma (ERP)"**
(8 modul: firmgl · apar · revenue · treasury · cashbank · fixedassets · firmtax ·
profitability). Disetujui Ari 2026-08-16 "Proceed sesuai rekomendasi":
**Q-1** = keenam PR satu arc · **Q-2** = gerbang merah **MEMBLOKIR ekspor LK** ·
**Q-3** = dimensi periode (P&L bulanan/komparatif) = **UTANG**, bukan sekarang ·
**Q-4** = bentuk data register GA diisi aset register Keuangan · **Q-5** = modul
`revenue`/`fixedassets` **TETAP read-only**.

## Status
- **PR-1 SELESAI** — commit `55eb180`, branch `feat/firm-erp-pr1-asset-register`
  (BELUM di-push, BELUM PR). verify hijau penuh (2035 frontend + 431 backend),
  ratchet `:any` 7929 → 7924, 41 uji baru.
- PR-2..PR-6 **belum dikerjakan**.

## Angka kunci yang sudah dihitung (klok SSOT `AMS.TODAY` = 2026-03-09)
Register gabungan: 13 aset · perolehan **9.101,5 jt** · akumulasi **4.944,5 jt** ·
NBV **4.156.989.583** · beban penyusutan run-rate **1.395,9 jt/th**.
Roll-forward 12 bulan: awal **5.502,6 jt** + capex **84 jt** − penyusutan
**1.429.625.000** − pelepasan 0 = NBV akhir (menutup persis).

**Angka siap-pakai untuk PR-2** (restrukturisasi COA):
- PSAK 16: bruto **8.481.500.000** · akumulasi **4.675.843.750** · beban periode **1.305.625.000**
- PSAK 19: bruto **620.000.000** · akumulasi **268.666.667** · beban periode **124.000.000**
- Kontrol lama `1-400` = 6.100 jt ⇒ selisih **1.943 jt** terurai jadi:
  **513.385.417** koreksi periode lalu (ke `3-200`, jadi **−6.926.614.583**)
  + **1.429.625.000** beban penyusutan periode berjalan yang TAK PERNAH dibukukan.
- Konsekuensi DISENGAJA: laba operasi firma **2.860,6 → 1.431,1 jt** (−50%).
  Wajib: baris `FIRM_BUDGET` untuk akun beban penyusutan baru (gerbang CAKUPAN
  #242), perbarui snapshot `canon_regression.test.ts`, sapu konsumen `opProfit`.

## Temuan yang membentuk arc ini
Detail lengkap + bukti ada di §1 dan §9 PRD. Yang paling mahal:
[[asseris-fixedassets-register-tunggal]] · profitability memakai tarif TAGIH sebagai
BIAYA · PPh Badan firma berdiri di atas 4 literal (2 akun hantu) padahal mesin
PSAK 46 milik firma sudah ada dan dipakai untuk KLIEN.

⚠ Dikerjakan bersamaan dengan arc lain di direktori yang sama —
lihat [[asseris-sesi-paralel-satu-worktree]].
