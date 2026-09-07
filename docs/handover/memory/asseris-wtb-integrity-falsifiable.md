---
name: asseris-wtb-integrity-falsifiable
description: "Arc P0 integritas WTB — SELURUH PR MERGED: #169, #170 (e8f65f7, tanpa CI), #171 (1c3dc09), #175 (91d91b1); verifikasi HIDUP #175 masih utang"
metadata: 
  node_type: memory
  type: project
  originSessionId: 81307ae1-4857-44b0-91aa-f60a856f8f0e
  modified: 2026-08-07T11:58:17.599Z
---

Arc paket P0 modul Working Trial Balance, dimulai 2026-08-07 dari evaluasi Ari atas WTB.
PRD lengkap ada di repo: `docs/prd-wtb-integrity-falsifiable-gates.md` (Status: Disetujui).

## ⏸️ CHECKPOINT — dijeda 2026-08-07, lanjutkan dari sini

| PR | Status | Base | Verifikasi |
|---|---|---|---|
| [#170](https://github.com/ari1945/Asseris/pull/170) PR-I1 chip jujur | **MERGED** `e8f65f7` | — | uji + hidup |
| [#171](https://github.com/ari1945/Asseris/pull/171) PR-I2 akun tak terklasifikasi | **TERBUKA** | master | uji + hidup |
| [#175](https://github.com/ari1945/Asseris/pull/175) PR-I3 tie-out ekuitas + seed + pemblokir | **TERBUKA** | `fix/wtb-unclassified-gate` (BERTUMPUK) | 941 uji/typecheck/lint/build — **BELUM hidup** |

**Langkah pertama sesi baru — verifikasi hidup #175 yang tertunda.** Server sudah
di-seed ulang (backup: `server/prisma/preseed-backup-20260807-0630.db`), tetapi seed
menghapus sesi → app berhenti di layar masuk, dan agen tidak memasukkan kata sandi.
**Ari harus login dulu**, lalu buka WTB dan periksa: akun `3-3100` muncul, chip
integritas **HIJAU**, Σ adjusted = 0. Seed melaporkan **29 baris WTB** — belum
dipastikan apakah itu sudah termasuk akun baru `3-3100` atau menandakan modul lama
ter-resolve (`server/src/seedData.ts` mengimpor `../../migration/src/data.js`).

**Urutan merge:** #171 dulu → **retarget #175 ke master** (squash-merge tidak
melakukannya otomatis — pelajaran #129/#130).

**Utang terbuka di #175 (sudah dicatat di badan PR, jangan hilang):**
- Laporan Perubahan Ekuitas masih menaruh PKL di kolom saldo laba, padahal neraca kini
  menyajikannya sebagai komponen ekuitas tersendiri → SOCE perlu kolom tambahan.
- Tolok ukur materialitas "Total Ekuitas (konsolidasian)" bergeser 262.367 → 250.827 jt.
  PRD §9 menyatakan materialitas TIDAK bergeser — itu keliru untuk tolok ukur ekuitas.

**Temuan besar PR-I3:** `balCheck` konsolidasi PSAK 65 **−11.540 → 0** tanpa disengaja.
Utang terbuka lintas-sesi itu ternyata gejala cacat yang sama (ekuitas induk memuat laba
di dalam saldo laba SEKALIGUS menambah `npatParent`). Aturan penutupan laba ternyata
**kanon-wide**, bukan milik FSGEN — `canon_part5` (goingConcern) juga harus ditutup,
kalau tidak DER & Altman Z salah.

---

**Keadaan 2026-08-07:** PR-I1 = **[#170](https://github.com/ari1945/Asseris/pull/170) MERGED**
(master `e8f65f7`). PR #169 juga merged (`a94cd2e`) setelah cacat tanda tangan Reviewer
fiktifnya ditutup — lihat [[asseris-klon-kedua-wp-canon-rebase]]. Master pasca-gabung:
**933 uji lulus · typecheck 0 · lint bersih**, diverifikasi lokal.

⚠️ **Keduanya di-merge TANPA CI.** GitHub Actions repo berhenti mengantre sejak
2026-08-06 18:16 (nol run, termasuk `uptime-alert` terjadwal; `actions/permissions`
tetap `enabled:true`) — dugaan kuota/penagihan. Sebagai ganti, job `migration`
(lint + typecheck + tests + build) dijalankan penuh secara lokal di kedua branch;
job server/docker/caddy-smoke TIDAK tereproduksi. Bila muncul masalah deploy,
mulai penyelidikan dari sana. Cek Settings → Billing.

**Tiga temuan yang HANYA ketahuan lewat probe, bukan pembacaan kode** — pola yang layak
diulang di modul lain:

1. `checkWtbIntegrity` seed → `status:'ok'` **sekaligus** `incomeDoubleCounted:true`. Chip
   hijau berdampingan dengan peringatan Rp 11.540 jt (~5× PM). Ditutup PR-I1 lewat `hasWarn`
   (indikator visual) yang dipisahkan dari `status` (gerbang finalisasi) — sengaja TIDAK
   mengetatkan gerbang, karena seed sendiri memicunya (pelajaran PR-6c).
2. `lead()` mengklasifikasi dari karakter pertama kode; akun klien ber-kode alfabet
   (mis. `AC-900`) **hilang total** dari aset/liabilitas/ekuitas → `bsDiff` 0 → status ok.
   Mengenai setiap TB klien nyata yang belum dipetakan penuh. Belum diperbaiki (Fase B).
3. Tie-out ekuitas FSGEN **mustahil gagal**: `oci` didefinisikan sebagai residu
   `endRE − beginRE − netIncome`, lalu tie-out membandingkan `netIncome + oci` dengan
   `endRE − beginRE` — identitas aljabar, `diff: 0` persis pada kedua basis. Residu
   Rp 6.554 jt (2,8× PM) disajikan di LK dengan label PSAK 24 "pengukuran kembali imbalan
   kerja" catatan 13. Belum diperbaiki (Fase C). Bandingkan [[asseris-psak46-prh-basis-dilaporkan]]
   — PR-H3 sudah membereskan tiga tie-out sejenis; yang ini lolos karena butuh satu
   substitusi untuk terlihat.

**Fakta seed yang mengunci urutan kerja:** seed memuat DUA ketidakcocokan, tak bisa dipenuhi
sekaligus dengan satu angka. `3-2100` = −88.917 jt membuat TB ter-foot; = −82.363 jt membuat
mutasi RE tie tanpa plug; selisih 6.554 jt persis = plug `oci`. Karena itu "perbaiki seed"
adalah keputusan akuntansi, bukan penyuntingan. **Keputusan Ari: opsi (a)** — modelkan PKL
PSAK 24 eksplisit terkait `2-2300`, `3-2100` → −88.917 jt. Juga Q2 = akun tak terklasifikasi
MEMBLOK finalisasi, Q3 = PR-I1 jalan duluan.

**Fase C dan D wajib satu PR** — memisahkannya membuat tie-out ekuitas demo merah
Rp 6.554 jt di antara keduanya.

**Gotcha:** jangan stack PR-I2 di atas PR-I1 sebelum PR-I1 merge — squash-merge tidak
me-retarget PR bertumpuk (lihat [[asseris-wtb-eval-pr1-pr2]]). Branch sesi ini dibuat dari
master, BUKAN dari `feat/wp-canon-signoff-sod` ([[asseris-klon-kedua-wp-canon-rebase]]) yang
masih menahan utang tanda tangan Reviewer fiktif di PR #169.

Sisa pekerjaan (P1/P2 dari evaluasi yang sama, di luar paket P0): impor berkas asli lewat
File API + `xlsx` (sudah jadi dependency) supaya hash menutup byte berkas bukan teks tempelan;
template pemetaan CoA fuzzy; filter reviewer-centric di tabel WTB; WTB jadi workbench.
