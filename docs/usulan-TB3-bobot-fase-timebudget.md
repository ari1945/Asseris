# Usulan TB3 — dari mana bobot fase Time & Budget seharusnya berasal

> Status: **Usulan — menunggu keputusan Ari.** Tidak diimplementasikan sepihak.
> Konteks: prompt [`prompts-perbaikan/07-time.md`](prompts-perbaikan/07-time.md), cacat TB3.
> Yang SUDAH dikerjakan di PR ini: total anggaran fase & total jam pembuka kini
> menutup ke perikatan aktif (`ew.budgetHrs` / `ew.actualHrs`). Yang BELUM
> diputuskan: dari mana **bobot antar-fase** berasal.

---

## 1 · Apa yang berubah, dan apa yang sengaja tidak

Sebelum PR ini `TB_PHASES` di `view_timebudget.tsx` adalah empat baris jam
literal: 320 + 1080 + 320 + 120 = **1840 jam** — persis `budgetHrs`
ENG‑2025‑014. Tab "Ringkasan" memakai anggaran nyata (`ew.budgetHrs`),
tab "Anggaran per Fase" menjumlahkan 1840 untuk perikatan mana pun.

Sekarang angka itu menjadi **bobot**, bukan jam: `TB_PHASE_PROFILE` di
`timebudget_model.ts` menyimpan `budgetShare` / `openingShare`, dan
`tbAllocate()` membagi anggaran & jam pembuka perikatan aktif menurut bobot itu.
Totalnya karena itu **selalu** menutup, untuk perikatan mana pun (dipaku uji
`timebudget_isolation.test.ts` → "TB3 — tie-out anggaran per fase", diuji untuk
tiga perikatan dengan anggaran berbeda: 1840 · 1480 · 640).

Pembilang bobotnya sengaja dibiarkan sama dengan jam literal lama, sehingga
untuk ENG‑2025‑014 — satu-satunya perikatan yang punya roster di seed — layarnya
menampilkan angka yang **persis sama** seperti sebelum PR ini (nol‑delta, dipaku
uji "profil fase perikatan demo TIDAK berubah").

Yang tersisa dan **butuh keputusan Anda** ada tiga, semuanya bagian dari profil
yang sama.

---

## 2 · Pertanyaan 1 — sumber bobot anggaran per fase

`PHASE_BUDGET_WEIGHT` **sudah ada** di `cockpit_progress.ts:63`:

| | Perencanaan | Eksekusi | Specifics | Finalisasi | Review & Arsip | Pelaporan |
|---|---|---|---|---|---|---|
| `PHASE_BUDGET_WEIGHT` (cockpit) | 0,152 | 0,413 | 0,196 | 0,185 | 0,054 | — |
| `TB_PHASE_PROFILE` (T&B) | 0,174 | 0,587 | — | 0,174 | — | 0,065 |

**Taksonomi fasenya berbeda.** Cockpit punya `Specifics` dan `Review & Arsip`;
Time & Budget punya `Pelaporan` dan tidak punya `Specifics`. Memetakan diam-diam
antara keduanya (mis. "Specifics itu bagian Eksekusi", "Review & Arsip itu
Pelaporan") adalah persis jenis asumsi senyap yang dilarang aturan repo —
dan konsekuensinya bukan kosmetik: menggabungkan `Specifics` (19,6%) ke
`Eksekusi` akan menggeser 290 jam pada perikatan 1480 jam.

**Opsi:**

| # | Opsi | Konsekuensi |
|---|---|---|
| **A** | **Biarkan T&B punya profilnya sendiri** (keadaan sekarang), diberi label "model alokasi" di UI. | Nol pekerjaan lanjutan. Dua modul memberi pecahan fase berbeda untuk satu perikatan — bisa ditanyakan pengguna. Jujur, tapi tidak konsisten. |
| **B** | **Satukan taksonomi fase lebih dulu** (satu daftar fase untuk cockpit + T&B + `PHASE_OF_MODULE`), lalu T&B memakai `PHASE_BUDGET_WEIGHT`. | Satu sumber kebenaran. Pekerjaan paling besar: menyentuh `cockpit_progress.ts`, peta modul→fase, dan tab "Anggaran per Fase" (jumlah barisnya berubah). Butuh PRD. |
| **C** | **Anggaran per fase menjadi DATA per perikatan** (kolom di roster/`WIP_ROSTER_ENG`, kelak tabel Prisma) — diisi manajer perikatan saat perencanaan. | Paling benar secara audit: anggaran fase memang keputusan perencanaan, bukan rumus. Butuh keputusan data/produk + skema. Sampai datanya ada, profil tetap dipakai sebagai default. |

**Rekomendasi saya: C sebagai tujuan, A sebagai keadaan sementara.** Alasannya:
bobot fase yang "benar" berbeda antar jenis perikatan (audit LK vs SPR 2400 vs
AUP) dan antar klien — tidak ada satu rumus yang benar untuk semuanya, jadi B
hanya memindahkan angka karangan ke tempat lain. B tetap layak dikerjakan
terpisah untuk alasan lain (satu taksonomi fase lintas modul), tapi bukan
sebagai jawaban TB3.

---

## 3 · Pertanyaan 2 — `pct` (% selesai per fase)

`pct` = 100 · 65 · 30 · 20 masih profil tetap. Ini **bukan** alokasi, melainkan
pengukuran: berapa persen pekerjaan fase itu sudah selesai. Ia memberi makan
kolom "Proyeksi (EAC)" dan status "Selesai/Berjalan/Over-budget".

Fakta yang menarik: rata-rata `pct` tertimbang anggaran untuk ENG‑2025‑014 =
(320·100 + 1080·65 + 320·30 + 120·20) / 1840 = **62,06%** — persis
`e.progress` = 62. Jadi profil ini memang dikalibrasi ke satu perikatan.
Untuk perikatan lain ia akan membantah `e.progress` yang ditampilkan tab
Ringkasan.

**Opsi:**

- **P1** — turunkan: skala `pct` profil agar rata-rata tertimbangnya = `e.progress`.
  Konsisten antar tab secara aljabar, tapi bentuk kurvanya tetap karangan.
- **P2** — jadikan data per fase (diisi manajer, seperti opsi C di atas).
- **P3** — biarkan, beri label "model" di UI (keadaan sekarang).

**Rekomendasi: P2 bersama C** — `pct` dan anggaran fase adalah dua kolom dari
satu tabel rencana fase yang sama. P1 terlihat rapi tapi menghasilkan angka yang
tidak pernah diukur siapa pun, dan itu justru kelas cacat yang sedang kita tutup.

---

## 4 · Pertanyaan 3 — `period` (kalender fase)

`'02–20 Feb'`, `'24 Feb–20 Mar'`, `'21–28 Mar'`, `'29–31 Mar'` adalah kalender
ENG‑2025‑014. Panel "Timeline Fase" bahkan punya array posisi literal
(`left = [4, 30, 67, 86]`, `width = [24, 36, 16, 12]`) dan kalimat
"Tenggat fieldwork 31 Mar 2026" yang tidak membaca `e.deadline`.

Ini masuk paket yang sama dengan §2/§3: kalau rencana fase menjadi data
per‑perikatan, tanggalnya ikut. Sampai itu diputuskan, panel Timeline hanya
benar untuk perikatan demo — dan sejak TB1 ditutup, hanya perikatan demo yang
merender modul ini, jadi tidak ada yang melihat kalender yang salah hari ini.
**Yang tetap salah hari ini**: "Tenggat fieldwork 31 Mar 2026" adalah literal
yang seharusnya `e.deadline`.

---

## 5 · Yang saya butuhkan dari Anda

1. §2 — pilih A / B / C (rekomendasi: **C**, dengan A sebagai keadaan sementara).
2. §3 — pilih P1 / P2 / P3 (rekomendasi: **P2**, satu paket dengan C).
3. §4 — boleh saya cabut literal `"31 Mar 2026"` → `e.deadline` sebagai perbaikan
   satu-titik terpisah? (Tidak menunggu 1 & 2.)
4. Terpisah dan lebih besar: apakah `WIP_ROSTER_ENG` akan diisi untuk perikatan
   demo lainnya? Selama tidak, enam dari tujuh perikatan menampilkan keadaan
   kosong di modul ini — itu **benar**, tapi berarti modul ini praktis hanya
   dapat didemokan pada satu perikatan.
