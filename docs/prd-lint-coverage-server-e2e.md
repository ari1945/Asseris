# PRD — Gerbang Lint yang Menjangkau `server/` dan `e2e/`

| Field | Nilai |
|---|---|
| Status | Implemented — dieksekusi 2026-08-13 lewat PR #207 (master e2deb29) |
| Tanggal | 2026-08-12 |
| Asal | Temuan sampingan saat menyapu assertion vakum ([#192](https://github.com/ari1945/Asseris/pull/192)): penjaganya terpaksa berupa tripwire uji karena ESLint tak menjangkau tempat cacatnya hidup |
| Basis | master `d7dbe34` · 8/8 gerbang hijau · nol PR terbuka |
| Ukuran utang | **TERUKUR** (bukan diperkirakan): 111 berkas dipindai · **12 pelanggaran nyata** di 4 berkas |

---

## 1. Problem

`npm run lint` menjalankan `eslint src` **di dalam `migration/`** ([`migration/package.json:16`](../migration/package.json)), dan `tools/verify.mjs` memanggilnya persis begitu ([`:20`](../tools/verify.mjs:20)). Konsekuensinya sederhana dan tidak terlihat dari mana pun: **`server/` dan `e2e/` tidak dilint sama sekali.**

Yang membuat ini bukan sekadar ketidakrapian:

### 1.1 Gerbang yang kita kira menjaga repo hanya menjaga separuhnya

Ratchet `@typescript-eslint/no-explicit-any` (W15) adalah gerbang yang dijaga ketat: baseline `eslint-suppressions.json`, langit-langit di `scripts/check-any-ratchet.mjs`, dan langkah CI sendiri karena pada `18d6e69` totalnya pernah naik diam-diam 8.155 → 8.175. Seluruh disiplin itu **berhenti di batas `migration/`**. `server/src` boleh menambah `:any` sebanyak apa pun tanpa satu pun gerbang berbunyi.

Hal yang sama berlaku untuk `no-dupe-keys` — "real correctness bug — silent data loss", menurut komentar konfigurasinya sendiri — dan setiap aturan lain yang ditambahkan kelak.

### 1.2 Berkas `e2e/` sudah ditulis seolah lint berjalan

Tiga direktif `eslint-disable` untuk `no-console` hidup di [`e2e/tests/07-a11y-axe-keyboard.spec.ts`](../e2e/tests/07-a11y-axe-keyboard.spec.ts) dan [`06-hydration-budget.spec.ts`](../e2e/tests/06-hydration-budget.spec.ts). Direktif itu **tidak pernah menekan apa pun**, karena tak ada lint yang berjalan di sana. Seseorang menulisnya dengan asumsi yang wajar dan salah — dan asumsi itu tak pernah dikoreksi karena tak ada yang gagal.

### 1.3 Penemuannya bersifat kebetulan, dan itu masalahnya sendiri

Batas ini tidak tertulis di CLAUDE.md maupun BUILD.md. Ia ditemukan hanya ketika saya hendak memasang aturan ESLint untuk mencegah assertion vakum, lalu mendapati aturan itu akan dipasang di tempat yang tak pernah melihat berkas-berkas yang bermasalah. Batas kualitas yang hanya diketahui secara kebetulan akan diasumsikan tidak ada oleh orang berikutnya.

---

## 2. Objective

Menjadikan gerbang lint berlaku untuk **seluruh sumber yang dikirim** — `migration/src`, `server/src`, `e2e/` — dengan satu konfigurasi yang menyatakan perbedaan tiap lingkungan (browser · Node · Playwright) alih-alih menyembunyikannya sebagai celah.

### Yang PRD ini TIDAK janjikan (dinyatakan di depan, agar tak ada yang salah beli)

**Memperluas ruleset yang ada TIDAK akan menangkap cacat yang memicu PRD ini.** Assertion vakum (`toMatchObject({ p: /re/ })`) tak dapat dilihat aturan mana pun yang sekarang aktif; ia dijaga tripwire [`assertion_hygiene.test.ts`](../server/src/__tests__/assertion_hygiene.test.ts) dan akan tetap dijaga di sana. Nilai PRD ini adalah **paritas dan tempat berpijak**: gerbang yang sama berlaku merata, dan aturan khusus backend/e2e punya rumah bila kelak dibutuhkan.

Bila yang Anda inginkan adalah "lebih banyak cacat tertangkap otomatis", PRD ini bukan jawabannya — itu pekerjaan memilih *aturan baru*, dan aturan baru hanya masuk akal setelah ada tempat memasangnya.

---

## 3. Success Criteria (semuanya harus DAPAT GAGAL)

| # | Probe | Hari ini | Setelah |
|---|---|---|---|
| K1 | `grep -n "lint" tools/verify.mjs` | satu baris, hanya `migration` | mencakup `server` & `e2e` |
| K2 | Tanam `const x: any = 1;` di `server/src/rbac.ts` → `npm run verify` | **HIJAU** | **MERAH** `no-explicit-any` |
| K3 | Tanam objek ber-kunci ganda di `server/src/rbac.ts` | HIJAU | MERAH `no-dupe-keys` |
| K4 | Tanam `const y: any = 1;` di `e2e/helpers.ts` | HIJAU | MERAH |
| K5 | `grep -c "eslint-suppressions" server e2e` (baseline backend) | — | **0** — utang backend DIPERBAIKI, bukan di-grandfather (§8.3) |
| K6 | Direktif `eslint-disable` yang tak menekan apa pun di `e2e/` | 4 buah, tak terlihat | 0 — `reportUnusedDisableDirectives` menyalakannya |
| K7 | Berkas `.mjs` di `e2e/scripts` | tak dilint | dilint dengan global Node yang benar (bukan 57 `no-undef` palsu) |
| K8 | Waktu tambahan gerbang CI | — | ≤ 45 detik (diukur, dilaporkan di PR) |
| K9 | `npm run verify` | 8/8 hijau | tetap hijau |

---

## 4. Ukuran utang — DIUKUR, bukan diperkirakan

Konfigurasi tier-TS yang ada persis dijalankan atas `server/src` + `e2e` (konfigurasi pengukur sementara, sudah dihapus):

| Rule | Jumlah | Penilaian |
|---|---|---|
| `no-undef` | 57 | **Artefak pengukuran, bukan utang.** Seluruhnya di `e2e/scripts/*.mjs`; konfigurasi pengukur tak memberi global Node ke `.mjs`. Konfigurasi sungguhan menyelesaikannya di satu blok. |
| `@typescript-eslint/no-explicit-any` | **12** | **Utang nyata.** `server/src/signoff.ts` (6) · `e2e/helpers.ts` (4) · `server/src/personalScope.ts` (1) · `e2e/tests/04-signoff-sod.spec.ts` (1) |
| Direktif `eslint-disable` tak terpakai | 4 | Gejala §1.2 |
| `no-unused-vars` | 1 | Sepele |

**111 berkas, 12 pelanggaran nyata di 4 berkas.** Ini bukan migrasi; ini pekerjaan konfigurasi + perbaikan kecil. Fakta itu mengubah rekomendasi §8.3 secara mendasar: utang sekecil ini **diperbaiki**, tidak di-grandfather.

---

## 5. Scope

1. Satu konfigurasi ESLint yang menjangkau `migration/src`, `server/src`, `e2e/` — dengan blok per-lingkungan: browser+React (frontend), Node (server & skrip `.mjs`), Playwright+Node (spek e2e).
2. Menyalakan `reportUnusedDisableDirectives` agar direktif yang tak menekan apa pun menjadi kegagalan, bukan hiasan.
3. Memperbaiki 12 pelanggaran nyata; baseline backend = **nol suppression**.
4. Menyambungkan ke `tools/verify.mjs` **dan** `.github/workflows/ci.yml` — keduanya, karena `verify.mjs` mengiklankan diri sebagai cermin persis CI (BUILD.md §R-7); bila keduanya menyimpang, `verify.mjs` yang salah.
5. Mendokumentasikan cakupan lint di CLAUDE.md §2 — agar batasnya tak lagi hanya diketahui secara kebetulan.

## 6. Non-Scope

| Di luar lingkup | Alasan |
|---|---|
| Linting ber-info-tipe (`parserOptions.project`) | Konfigurasi sekarang sintaktik-saja **dengan sengaja** ("cepat; rule ini tak butuh info-tipe"). `tsc --noEmit` full-strict sudah menjadi pemilik kebenaran tipe di ketiga paket. |
| Aturan gaya / Prettier | Perubahan diff masif tanpa nilai kebenaran; akan menenggelamkan tinjauan. |
| Aturan BARU apa pun di luar yang sudah aktif | PRD ini tentang CAKUPAN. Menambah aturan sekaligus memperluas cakupan membuat kegagalan pertama tak dapat diatribusikan. |
| Menurunkan 8.175 `:any` frontend | Utang terpisah, ratchet-nya sudah bekerja. |
| Aturan pencegah assertion vakum | Tak mungkin dengan aturan yang ada; sudah dijaga tripwire (§2). |

---

## 7. Constraints

1. **`verify.mjs` = cermin CI.** Setiap langkah yang ditambahkan harus muncul di keduanya (R-7).
2. **Nol regresi pada gerbang frontend.** Ratchet `:any` frontend + `check-any-ratchet.mjs` harus terus berjalan persis seperti sekarang; baseline `eslint-suppressions.json` tak boleh berpindah makna.
3. **`master` selalu hijau.** Bila 12 perbaikan itu ternyata menyentuh perilaku, pisahkan PR-nya.
4. **Waktu CI.** Gerbang yang lambat akan dilewati. K8 mematoknya.
5. Registri status: perbarui [`PRD-REGISTRY.md`](PRD-REGISTRY.md).

---

## 8. Proposed Approach

### 8.1 Di mana konfigurasinya hidup — dan satu kendala nyata

ESLint 9 **menolak berkas di luar direktori kerjanya** ("all of the files matching the glob pattern are ignored") — saya menabraknya langsung saat mengukur. Jadi "arahkan saja `migration`-nya ke `../server`" **bukan pilihan**. Dua jalan yang benar-benar bekerja:

| | Cara | Untung | Rugi |
|---|---|---|---|
| **A** | Konfigurasi + devDependency ESLint di **root repo**, dijalankan dari root atas ketiga paket | Satu konfigurasi, satu pohon dependensi, blok per-lingkungan eksplisit; pertanyaan "berkas ini milik paket mana" larut | Satu `npm ci` tambahan di CI (~20–30 dtk) |
| **C** | Tetap pakai biner & plugin milik `migration/`, dijalankan **dari root**: `node migration/node_modules/eslint/bin/eslint.js --config <root config> server/src e2e migration/src` | Nol instalasi baru, nol waktu CI tambahan; **terbukti bekerja** (itulah cara saya mengukur) | Gerbang seluruh repo bergantung pada `node_modules` satu paket — kopling yang akan membingungkan orang berikutnya |

Rekomendasi saya: **A**. Rugi-nya satu angka yang dapat diukur (K8); rugi C adalah kopling yang harus diingat selamanya dan akan patah diam-diam ketika `migration/` dirapikan.

### 8.2 Bentuk konfigurasi

```
eslint.config.js (root)
├─ ignores: dist, node_modules, build, app/, NeoSuite AMS.html (referensi BEKU)
├─ migration/src/**  → globals browser + React/hooks + ratchet :any (baseline ADA)
├─ server/src/**     → globals node · TANPA React · ratchet :any (baseline NOL)
├─ e2e/**/*.ts       → globals node + Playwright · ratchet :any (baseline NOL)
└─ e2e/scripts/*.mjs → globals node (menutup 57 `no-undef` palsu, K7)
```

Referensi beku (`app/*`, `NeoSuite AMS.html`, `build/`) **wajib** masuk `ignores` — CLAUDE.md §8 menyatakannya bukan sumber, dan melint-nya akan menghasilkan ribuan temuan atas kode yang memang tidak dikirim.

### 8.3 Utang backend: diperbaiki, bukan di-grandfather

Frontend memakai baseline karena utangnya 8.175 — mustahil dibersihkan sekaligus. Backend punya **12**. Membuat berkas suppression untuknya berarti menyalin mekanisme berat untuk masalah yang muat dalam satu PR, **dan** menciptakan tempat baru bagi `:any` untuk bersembunyi.

Baseline backend = **nol**, ditegakkan sejak hari pertama. Gerbang backend karenanya lebih ketat daripada frontend — dapat dibenarkan justru karena utangnya kecil.

Catatan: 6 dari 12 ada di `server/src/signoff.ts` (`asObj(): Record<string, any>` dan kerabatnya). Itu berkas gerbang sign-off yang baru saja tiga kali disentuh arc SA 620; mengetatkan tipenya bernilai lebih dari sekadar memuaskan lint.

---

## 9. Risks

| # | Risiko | Dampak | Mitigasi |
|---|---|---|---|
| R1 | Ratchet `:any` frontend rusak saat konfigurasi dipindah ke root | Gerbang yang menangkap kenaikan diam-diam `18d6e69` mati | K9 + jalankan `check-any-ratchet.mjs` sebelum & sesudah; angka baseline harus IDENTIK |
| R2 | Path relatif `eslint-suppressions.json` berubah makna dari root | Suppression meleset senyap → lint "bersih" palsu | Verifikasi jumlah temuan ter-suppress sebelum/sesudah; bila berubah, konfigurasi salah |
| R3 | Memperketat 6 `:any` di `signoff.ts` mengubah perilaku | Gerbang sign-off yang baru dikirim ikut berubah | Perbaikan tipe MURNI; `npm run verify` + uji signoff (70 unit + 16 integrasi) harus hijau tanpa disunting |
| R4 | Spek Playwright memakai idiom yang dianggap pelanggaran | Gerbang berisik pada berkas yang benar | Blok e2e dengan global Playwright + hanya aturan yang sudah aktif (Non-Scope: nol aturan baru) |
| R5 | Waktu CI naik melewati toleransi | Gerbang dilewati orang | K8 mematok ≤ 45 dtk; bila terlampaui, pilih opsi C |
| R6 | Referensi beku ikut terlint | Ribuan temuan atas kode yang tak dikirim | `ignores` eksplisit (§8.2), diverifikasi lewat hitung berkas terpindai |

---

## 10. Implementation Plan

| PR | Isi | Probe |
|---|---|---|
| **PR-1** | Konfigurasi root + wiring `verify.mjs` & CI, dengan aturan backend/e2e disetel `warn` | K1, K7, K8, K9 + R1/R2 (baseline frontend identik) |
| **PR-2** | Perbaiki 12 pelanggaran + `reportUnusedDisableDirectives` + naikkan backend/e2e ke `error` | K2, K3, K4, K5, K6 |
| **PR-3** | Dokumentasikan cakupan di CLAUDE.md §2 & BUILD.md | — |

Memisahkan PR-1/PR-2 disengaja: bila konfigurasi dan perbaikan mendarat bersamaan, kegagalan pertama tak dapat diatribusikan ke salah satunya. PR-1 memasang gerbang tanpa memerahkan apa pun; PR-2 yang menutupnya.

Tiap PR: `npm run verify` hijau, dan K2–K4 dijalankan sebagai **penanaman pelanggaran sungguhan** lalu dicabut — gerbang yang tak pernah dilihat gagal belum terbukti menjaga apa pun.

---

## 11. Open Questions — TERJAWAB (arahan Ari "selesaikan", 2026-08-13)

**Q1 = A** ✅ ESLint di ROOT dengan devDependency sendiri (`eslint.config.mjs`).
**Q3 = TIDAK** ✅ `no-console` tidak dinyalakan; empat direktif tak terpakai di `e2e/` dihapus.
**Q2 = MENYIMPANG dari rekomendasi** ⚠ Langsung `error`, tanpa jendela `warn`. Utang nyatanya
**6** (PRD memperkirakan 12) dan seluruhnya ditutup dalam PR yang sama, sehingga jendela
`warn` kehilangan gunanya — ia ada untuk memisahkan sebab kegagalan *selagi utang masih ada*.

### Catatan pelaksanaan

Gerbang menemukan impor mati di `server/src/signoff.ts` yang berasal dari PR-6 (#205) —
merged sejam sebelumnya setelah lolos typecheck, uji, dan CI 8/8. Bukti langsung bahwa
`server/` memang tak pernah tersentuh lint.

**JEBAKAN `redact.ts`.** Pesan lint menyarankan menghapus escape pada `-` di dalam
character class. Menurutinya harfiah membentuk RENTANG (`[ -]` = 0x20–0x2D, belasan
karakter). Pada regex yang meredaksi NPWP sebelum data dikirim ke LLM, itu kebocoran
senyap. `-` dipindah ke posisi literal, dibuktikan `llm.test.ts` (15 uji).

**CI HARUS IKUT.** Menambah langkah ke `tools/verify.mjs` tanpa menambah job ke `ci.yml`
membuat verify lebih ketat dari CI — melanggar R-7, dan PR yang membawa impor mati akan
merah lokal tetapi HIJAU di CI. Job `lint-backend-e2e` ditambahkan sebagai cerminnya;
CI kini melaporkan 9 check, bukan 8.

---

## 11b. Open Questions (teks asli, sebelum dijawab)

**Q1 — Di mana ESLint hidup: root (A) atau menumpang `migration/node_modules` (C)?**
Rekomendasi: **A**. Biayanya satu `npm ci` (~20–30 dtk) yang dapat diukur; C menukarnya dengan kopling permanen antara gerbang seluruh repo dan isi satu paket. Bila anggaran waktu CI ketat, C sah dan sudah terbukti bekerja — tetapi catat koplingnya di BUILD.md agar tak mengejutkan.

**Q2 — Severity backend/e2e sejak awal: `error` atau `warn` dulu?**
Rekomendasi: **`warn` di PR-1, `error` di PR-2** (sesuai §10). Dengan utang hanya 12, jendela `warn` itu pendek — tujuannya memisahkan sebab kegagalan, bukan menunda penegakan.

**Q3 — Apakah `no-console` dinyalakan untuk `server/`?**
TIDAK direkomendasikan sekarang: server memakai logger terstruktur (`obs/log.ts`) tetapi skrip & seed memang menulis ke konsol dengan sah. Menyalakannya berarti membahas aturan baru — Non-Scope. Dicatat di sini karena empat direktif `eslint-disable no-console` yang tak terpakai di `e2e/` akan mengundang pertanyaan ini; jawabannya: hapus direktifnya, jangan nyalakan aturannya.
