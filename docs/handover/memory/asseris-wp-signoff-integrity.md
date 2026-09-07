---
name: asseris-wp-signoff-integrity
description: "Arc integritas tanda tangan kertas kerja (2026-08-07) — TUNTAS, PR #177 MERGED (squash 166fa5b); PRD docs/prd-wp-signoff-integrity.md"
metadata: 
  node_type: memory
  type: project
  originSessionId: 74216322-c471-4f11-99ba-e507da1fe2a4
  modified: 2026-08-07T11:58:14.275Z
---

Evaluasi modul Working Papers 2026-08-07 (branch `feat/aje-immutability-live-approvals`) → PRD `docs/prd-wp-signoff-integrity.md`, **Status: Draft, menunggu sign-off**. Belum ada satu baris kode ditulis.

**Akar yang ditemukan (bukan yang dilaporkan):** `guardSignoffWrite(ctx.user.role, …)` di `router.ts` hanya menerima PERAN, tak pernah identitas. Jadi bukan cuma slot `preparer` yang tak dijaga — **tak ada satu pun slot** yang identitas & waktunya divalidasi, dan `wpChainSelfReview` (aturan ISQM 2, ada di `wp_canon.ts`) tak punya padanan server sama sekali. `quickSign` ([view_wp.tsx:1173](../migration/src/view_wp.tsx:1173)) hanya permukaan yang paling mudah dilihat.

**Probe konkret yang membuatnya jatuh:** WP `100/200/810/900` ber-preparer 'Anindya P.'; Anindya Pramesti = **Audit Manager** (pemegang `SIGNOFF_REVIEWER`). Satu klik footer → `chain.preparer.by === chain.reviewer.by`. Tab Sign-off memblokir ini; footer tidak.

**KOREKSI dua klaim evaluasi yang beredar** (keduanya SALAH — grep dulu):
- "Bukti bukan objek DMS" → DMS ber-`sha256` **sudah ada** (`server/src/attachments/store.ts`, kunci join `collection`+`refId`). Masalahnya *split-brain*: `EvidenceRegister` + `WP_ATTACH` hardcode mengabaikannya. Integrasi, bukan pembangunan. Lihat [[asseris-input-mechanism-eval]].
- "Kelengkapan = bobot status" → readiness berbasis 5 kriteria SA 230 ¶9 **sudah ada** di `view_sa230.tsx::useDocCanon` (`attr`/`docPct`/`blocking`). Masalahnya dua angka kelengkapan bersaing di dua modul (pelanggaran SSOT), dan mesinnya duduk di dalam *view*.

**Keputusan yang sudah diambil:** atribusi server + jejak hash-chained (BUKAN Ed25519 per-tanda-tangan — jalur naik didokumentasikan di PRD §8.5). Pembekuan isi WP = **gugur TURUNAN**, bukan penolakan keras — sengaja berbeda dari AJE Posted, karena SA 230 ¶A23 mengizinkan perubahan sebelum perakitan. `notes`/`noteStatus` di LUAR hash.

**SELURUH OPEN QUESTION TERJAWAB (2026-08-07).** Q1 ISO satu field · Q2 **Ari: boleh sunting WP ter-reviu, tanda tangan gugur turunan + banner** · Q3 `notes` di luar hash · Q4 **Ari: `opinionDoc.v1` + `mat.memo.signoff` IKUT di PR-2** (R1 identitas + R2 waktu saja; R3/R4 tidak — rantai opini punya bentuk sendiri). PRD siap sign-off; menunggu balasan "Proceed." dari Ari.

**Rencana 4 PR — URUTAN DITUKAR saat implementasi.** Rencana awal menaruh server sebelum klien; itu salah: R1 menuntut tiap tanda tangan BARU membawa `byUserId`, jadi di antara kedua PR tak seorang pun dapat menandatangani. Klien harus lebih dulu.
- ✅ **PR-1 `c08fb20`** — modul murni `wp_chain.ts` + ekstraksi `content_hash.ts`/`identity.ts`; 37 uji; nol perubahan perilaku.
- ✅ **PR-2 `764c632`** — KLIEN menulis `byUserId`/`at` ISO/`contentHash`; `quickSign` dihapus; fail-closed; `reopen()` selektif; `unsignBlock` (preparer = hak penandatangan sendiri). Terverifikasi hidup.
- ✅ **PRASYARAT `ff8ea67`** — cacat StateDoc terkunci (409) ditutup, di luar cakupan PRD tapi ia memblokir verifikasi hidup. Keputusan Ari: tutup dulu.
- ✅ **PR-3 `700932e`** — SERVER `guardSignoffWrite({id,name,role},…)` + R1–R6 untuk `wpState` + R1/R2 untuk `opinionDoc.v1` & `mat.memo.signoff`. Oracle `signoff.test.ts:35` DIBALIK. **Terverifikasi hidup lewat panggilan tRPC LANGSUNG** (melewati UI): 5 bentuk pemalsuan → 403 dengan kode spesifik; tanda tangan sah → 200. Klien opini & memo ikut disesuaikan lebih dulu (wajib — kalau tidak, tak seorang pun bisa menandatangani).
  - Temuan bonus PR-3: `view_opinion_parts` punya `const today = '2026-03-14'` — SETIAP tanda tangan opini & tanggal finalisasi tercatat 14 Mar 2026 (kelas cacat sama dengan `'10 Mar 09:00'` AJE). Dihapus.
  - Temuan bonus PR-3: opini menempelkan tanda tangan preparer FIKTIF `'Generator Laporan'` ke `wpState['900']` agar rantai tampak berurutan. Dihapus; urutan (R3) untuk ref '900' dikecualikan server via `WP_MIRROR_REFS` — cermin tak memiliki urutannya sendiri.
- ✅ **PR-4 `e819014`** — `wpChainLinks` menjadi satu-satunya penghasil rantai untuk SignoffTab, WPFooter, `deriveWpStatus`, dan (turunan) SA 230. Penggugur TURUNAN aktif + banner/lencana GUGUR + lencana `warisan`. `wpEffectiveChain` menyatukan "chain + tanda tangan seed" yang dulu diturunkan di tiga tempat. Terverifikasi hidup: sunting hasil item uji tanpa menyentuh rantai → tanda tangan gugur di tiga layar sekaligus, SA 230 turun 2/5 → 1/5.

**PAKET TUNTAS** (5 commit). migration 1087 uji · server 327 uji · typecheck & lint hijau. Hasil lengkap + probe: `docs/prd-wp-signoff-integrity.md` §12.

Branch `feat/wp-signoff-integrity` — **#176 SUDAH MERGED (`fe12e15`) dan branch ini SUDAH di-rebase ke master (2026-08-07)**, memakai `git rebase --onto master feat/aje-immutability-live-approvals` agar 6 commit saya saja yang diputar ulang (commit AJE sudah masuk lewat squash). Rebase bersih tanpa konflik; seluruh gerbang diulang di atas master baru: migration typecheck·lint·1087 uji·build + server typecheck·327 uji — semua hijau. SHA baru: `1497f44` `12e8b03` `cdda0bd` `35c8125` `9a9346f` `3acee67`. **Di-push & [PR #177](https://github.com/ari1945/Asseris/pull/177) TERBUKA ke master — CI 6/6 hijau, MERGEABLE/CLEAN. Menunggu tinjauan & merge Ari.**

**GOTCHA yang sudah terverifikasi:**
- ⚠️ **Pemisah `\x01` LITERAL di dalam `ajeContentHash`** (sebelum PR-1). Karakter kontrol mentah di dalam string, tak terlihat di editor maupun `Read`. Menyalinnya dengan mata → `s + '' + s.length` → hash berbeda → **SELURUH persetujuan AJE tercatat gugur senyap**. Kini escape bernama di `content_hash.ts`. Bila menyentuh serialisasi kanonik apa pun di repo ini: `sed -n 'N,Mp' file | cat -A` DULU.
- ⚠️ **Tool Edit gagal senyap pada baris ber-karakter kontrol** — anchor tak pernah cocok. Pakai `python` + `io.open(newline='')` dengan escape eksplisit.
- ⚠️ Bash tool ≠ PowerShell: here-string `@'...'@` menghasilkan pesan commit ternoda (`@ feat(...)`). Pakai heredoc `<<'MSG'`.
- ✅ **409 `already-exists:server=?` — DITUTUP `ff8ea67`.** Cacat lama, terkonfirmasi: `StateDocHistory` (@@unique scope,scopeId,key,version) sengaja tak pernah dihapus, sementara `StateDoc` dapat lenyap (reset/seed/pembersihan uji setengah). Jalur create memaksakan `version: 1` → tabrakan → transaksi batal → dokumen **MUSTAHIL dibuat kembali selamanya**. Probe dev.db: **36 dokumen terkunci**, termasuk `wpState` (seluruh kertas kerja) & `prospects` (akseptasi klien). Gejalanya HANYA 409 di konsol — UI diam. Perbaikan: versi dilanjutkan dari `max(history)+1`; dokumen terkunci pulih sendiri pada tulisan berikutnya. **`state.test.ts` sendiri memproduksi keadaan ini** setiap kali dijalankan dua kali (hanya membersihkan satu dari dua tabel) — kini bersihkan keduanya.
- Route hidup = **hash** (`location.hash='#/workpapers/B'`), BUKAN `localStorage['ams.route']` (catatan lama itu usang).
- Uji `server/src/__tests__/signoff.test.ts:35-43` **memaku perilaku salah** sebagai benar (Junior menulis tanda tangan atas nama Audit Manager, `toEqual([])`). Oracle-nya harus DIBALIK — pola berulang, sama seperti arc AJE. Lihat [[asseris-aje-immutability-live-approvals]].
- `amsShortName` (contexts.tsx) **LOSSY** — 'Anindya Pramesti' & 'Anindya Putri' → 'Anindya P.'. Identitas WAJIB diikat pada `byUserId`, bukan `by`.
- `PARTNER_BASE` memegang `OPINION_APPROVE` **dan** `EQR_REVIEW` → Partner dapat menghapus tanda tangan EQR lewat `reopen()`, dengan restu server.
- `npm run typecheck:test` **belum ada** di branch ini (datang bersama PR #155 yang masih terbuka). Gerbang nyata: `migration/` (test·typecheck·lint) + `server/` (test·typecheck).
- Dua format `at` sudah hidup berdampingan hari ini: `wpSeedReviewSignature` → ISO; `chain` → `'07 Agu 2026'` dari `wpToday()`.

**How to apply:** jangan mulai koding sebelum Ari membalas "Proceed." atas PRD (open question sudah nol). Mulai dari PR-1 — modul murni, nol perubahan perilaku. Langkah 4–6 (readiness gate · integrasi DMS bukti · UI panel readiness di atas rute Fase C) sengaja DIPISAH ke PRD lain agar tidak menyandera P0 — lihat [[asseris-overlay-contract-arc]] untuk rute beralamat.
