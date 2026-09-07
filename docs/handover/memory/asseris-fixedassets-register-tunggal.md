---
name: asseris-fixedassets-register-tunggal
description: "Aset tetap punya DUA register disjoint + 3 salinan mesin penyusutan + akun GL hantu 1-2100; roll-forward yang \"menutup\" karena aset dilepas dihapus dari saldo awal"
metadata: 
  node_type: memory
  type: project
  originSessionId: 64cead36-9267-43bb-83ba-ca06dd6b53da
  modified: 2026-08-15T23:23:48.548Z
---

Arc `firm-erp-deepening` PR-1 (commit `55eb180`). Firma punya **DUA register aset
tetap yang tak satu aset pun beririsan**: `AMS.FIXED_ASSETS` (data_part2, 6 aset,
6.510 jt — modul `fixedassets`) vs `BO.FIXED_ASSETS` (data_backoffice, 7 aset,
2.591,5 jt — `view_bo1`/`view_firmops`/`view_firmops2`/`data_firmops`/`FAC`).
Beban penyusutan karena itu **403 jt/th di satu modul, 993 jt/th di modul lain**.
Ada **TIGA salinan mesin garis lurus**, salah satunya (`data_facilities`)
ber-anchor tanggal BEKU `new Date('2026-03-01')` alih-alih `AMS.TODAY`.

**ATURAN: register sub-buku yang menunjuk akun di luar COA gagal DIAM-DIAM.**
Seluruh kategori register GA membawa `gl: '1-2100'` — akun yang tak pernah ada di
`FIRM_COA`. Sekelas token CSS hantu. Gerbangnya: bandingkan peta akun terhadap
`FIRM_COA`, dan uji harus membuktikan gerbang itu BISA merah.

**GOTCHA KERAS — roll-forward yang "menutup" karena angka pengganggu dihapus.**
Percobaan pertama saya menghitung saldo AWAL atas register **AKTIF** (yang sudah
mengeluarkan aset terlepas). Akibatnya aset yang dilepas lenyap JUGA dari saldo
awal: pelepasan Rp 71,8 jt tampil **Rp 0**, dan panel tetap hijau. Yang benar:
aset yang dilepas **TETAP ADA di saldo awal**, keluar lewat baris pelepasan, dan
penyusutannya berhenti pada tanggal pelepasan. Ditemukan hanya karena saya
menyuntik pelepasan aset NYATA lewat konsol — bukan oleh uji mana pun.
`opening = closing − capex + dep + disposal` (bentuk lama di dua tempat) adalah
plug #239 yang sama.

**Tiga panel rekonsiliasi TAUTOLOGIS ditemukan**: `view_firmops2` r2/r3 dan
`data_facilities` baris `gl` berbunyi `av: nbv, bv: nbv, ok: true` di bawah judul
"Sub-ledger menutup ke GL". Sekelas `note` hardcode #240 & panel SA 220 dipaku
hijau #254. **Pola: kalau `av` dan `bv` berasal dari variabel yang sama, panelnya
bukan rekonsiliasi — ia hiasan.**

Penggabungan dua register **tidak boleh mendeduplikasi diam-diam** — `FA-002`
(server 880 jt Mar-2023) vs `AST-1051` (server 285 jt Feb-2023) mungkin aset yang
sama, tapi menebaknya = mengarang. Dipakai `duplicateCandidates()` (kelas sama +
≤90 hari + register asal BERBEDA) yang MENANDAI, dan totalnya tetap utuh.

Cacat lain yang ikut terungkap: `DSP-00` berstatus "Selesai" menunjuk `AST-0512`,
aset yang tak ada di register mana pun (referensi menggantung); tak ada mekanisme
penghentian pengakuan PSAK 16 ¶67 sama sekali; lisensi perpetual disusutkan
bersama kendaraan (PSAK 19 vs 16); label `"per 1 Mar 2026"` di-hardcode di 3
tempat sementara hitungannya memakai klok SSOT.

Sisa yang DISENGAJA dibiarkan merah untuk PR-2: register 4.157 jt vs kontrol
`1-400` 6.100 jt — angkanya ada di [[asseris-firm-erp-deepening-arc]].
