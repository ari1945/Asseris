---
name: asseris-psak46-fiscal-split-sweep
description: "PR-F PSAK 46 (rekonsiliasi fiskal turunan, #150) & sapuan .split 197 tempat (#151) — 2026-07-27; keduanya terbuka menunggu Ari, PR-F CI 6/6 hijau."
metadata: 
  node_type: memory
  type: project
  originSessionId: b37c1fcf-c6e9-417d-bc99-ae2203b02745
  modified: 2026-07-27T08:43:23.451Z
---

Sesi 2026-07-27 (lanjutan). Basis master `f3d11ae`.

## ✅ KEDUANYA MERGED — master `d9149d0`
Ari mendelegasikan urutan ("jalankan saja mana yang terbaik"). Urutan dipilih: **#150 dulu** (perbaikan SSOT substantif, keputusan metodologi terkunci) → **#151** (mekanis, murah di-rebase). `84e844c` lalu `d9149d0`.
**Rebase #151 BERSIH tanpa konflik** meski keduanya menyentuh `view_psak46.tsx` — hunk-nya berjauhan (PR-F di kanon+markup panel, sweep satu kata di className). Base `f3d11ae` masih leluhur origin/master → `git rebase origin/master` biasa cukup; resep `--onto` hanya perlu bila base-nya ikut TERSQUASH.
**Penjaga pasca-rebase yang berguna:** scan ulang "tata letak kolom-samping ≥260px TANPA `.split`" → **0**, membuktikan markup baru PR-F tak menyelundupkan tata letak yang lolos sapuan.
**Master diverifikasi SETELAH gabung** (tiap CI hanya menguji pra-merge): typecheck 0 · lint 0 · **748 test** · build hijau. Live di master gabungan: jembatan 29.690 → (5.790) → 23.900, PKP 28.900 konsisten di KPI & tabel; @1024px `.split` = satu track 753px, luberan **0**; nol error konsol.

## PR-F — [#150](https://github.com/ari1945/Asseris/pull/150) `feat/psak46-pr-f-fiscal-reconciliation`, commit `f380021`. **CI 6/6 HIJAU.**
Menutup cacat SSOT terakhir arc: `FISCAL.pbt` 48.500 & `FISCAL.pkp` 53.500 dibuang, diganti `fiscalReconciliation(wtb?, aje?)` di canon_base. PBT = `entityFigures(…,'unadj') + ajeEffect(…,'Posted')`; PKP = identitas. Keputusan Ari D-1..D-4 (populasi induk STANDALONE karena pajak per ENTITAS HUKUM — berdampingan dgn materialitas konsolidasian SA 600; basis PBT DILAPORKAN 25.750, bukan `adj` 22.780).
**Angka: pajak kini 11.770→6.765 (−43%) · beban pajak 10.274→5.269 · ETR 21,18%→20,46% · pajak tangguhan TAK bergerak.** typecheck 0 · lint 0 · **748 test** (735+13 di `canon_fiscal.test.ts`). Snapshot: **14 baris BERUBAH**, diperiksa satu per satu (5 di engine, 4 di `reconcile` row `tax`, 5 di nested `reconcile.dt`).

**T-4 TERBUKTI DI LAYAR — diagnostik `bt-etr` kini MENYALA:** "ETR 43.7% (beban pajak Rp 11.240 jt / laba sebelum pajak Rp 25.750 jt) vs 22.0%". Selisih model vs buku besar 5.971 jt > OM 3.088 jt = salah saji material yang selama ini dibungkam PBT 48.500. Pola identik `drift` di PR-A. `bt-perm` menguat 8,66%→16,3%.

**Empat temuan dari membaca kode yang tak ada di draf PRD (semua nyata):**
1. `P46_FISCAL` (`view_psak46.tsx:28-37`) salinan mati kedua — 48.500/53.500 + rincian 4 beda temporer diketik ulang. Memperbaiki canon saja = modul membantah dirinya di layar yang sama. → `FISCAL.tempMovementItems` larik bernama, view menurunkan barisnya.
2. `view_psak46` NOL reaktivitas — `deferredTax()` tanpa argumen, tanpa `useAudit()`; satu-satunya konsumen PSAK 46 yang tak melihat WTB perikatan (`view_psak71.tsx:351` sudah benar).
3. `etr` akan `Infinity` — dulu mustahil (pbt konstanta). Kini `null` bila pbt 0.
4. `bt-etr` (di atas).

**Verifikasi live (Anindya P./Audit Manager, ENG-2025-014):** KPI "Rp 6.765 jt · PKP 30.750 × 22%" + tabel foot ke PKP 30.750 + footer "Pajak kini = Rp 6.765 jt" = **tiga permukaan satu angka**; jembatan 29.690 → (3.940) → 25.750; panel ETR 5.665+264−660 = 5.269 tanpa baris residual; **modul AJE "Jembatan Laba Sebelum Pajak" juga 29.690 → 25.750** → PSAK 46 & AJE satu PBT. Nol error konsol.
**KRITERIA #4 (reaktivitas) AKHIRNYA TERVERIFIKASI DI LAYAR** — setelah Ari login sbg Partner dan AJE-03 disetujui lewat Approvals, panel PSAK 46 bergerak **seluruhnya dan koheren** tanpa satu pun angka tertinggal:
jembatan 29.690 → **(5.790)** → **23.900** (dari −3.940/25.750) · banner usulan **2 → 1 jurnal (AJE-05)** · baris PKP **30.750 → 28.900** · KPI "**Rp 6.358 jt · PKP 28.900 × 22%**" · footer "Pajak kini = **Rp 6.358 jt**" · beban pajak **5.269 → 4.862** (= 6.358 − 1.496) · panel ETR **5.258 + 264 − 660 = 4.862** foot persis, ETR 20,3%, tetap NOL baris residual · pajak tangguhan **tak bergerak** (3.066 / 1.496) sesuai desain.
Rantai penuh terbukti: Partner menyetujui → server memposting → register AJE/WTB berubah → PSAK 46 menghitung ulang. **Ini juga bukti lapis server & PR-F sekaligus.**
**Konsekuensi state:** AJE-03 kini **Posted** di DB demo (PBT dilaporkan 23.900, bukan 25.750 lagi). Mengembalikan = jalankan `npm run seed` lagi (murah, DB sudah state demo).

**Sengaja di luar scope, tercatat di PR:** (a) menyelaraskan WTB 5-5100 11.240 ke model — WTB koheren internal (laba neto 18.450 ≈ pergerakan saldo laba 18.094), input fiskal yang ditala ke fantasi; (b) `fiscalTempMovement` bereaksi thd AJE terposting — **AJE-02 (Posted, CKPN 620 jt) persis mengisi baris PSAK 71 2.400, AJE-04 (bonus 980 jt) juga** → input 6.800 usang SECARA TERKETAHUI; menutupnya butuh pemetaan akun→ember beda temporer = keputusan metodologi pajak tersendiri.

## Sapuan `.split` — [#151](https://github.com/ari1945/Asseris/pull/151) `fix/split-sweep-sidecolumn`, commit `7c55715`
197 tempat / 82 berkas (bukan 175/71 — hitungan lebih besar mencakup 34 kolom-samping **KIRI** `320px 1fr` yang meluber sama persis). 12 tempat sengaja dilewati (<260px: pasangan medan formulir `view_execution:1545,1551`, baris daftar `view_confirm:320,342`, rel nav 212–250px).

**TEMUAN BESAR — aturan `.split` #145 hanya bekerja pada 3 tempat yang mengujinya.** `grid-template-columns: 1fr` = `minmax(auto,1fr)`, dan min `auto` item grid = lebar **max-content** → tabel lebar tetap merentangkan kolom melewati induk. Luput karena 3 tempat view_aje yang diukur kebetulan ditulis `minmax(0,1fr) 340px` **inline**; **209 tempat sisanya `1fr 332px` polos**. Terukur psak46 @1024px: `1fr` → 1151px dlm induk 781px; `minmax(0,1fr)` → 753px (= persis angka yang dilaporkan #145, konfirmasi).
**Temuan kedua:** menumpuk kolom saja tak cukup — pembungkus `<div className="grid" style={{gap:12}}>` tak menyatakan kolom → implisit `auto` = max-content → panel tetap meluber **384px**. Pendamping satu baris: `@media(max-width:1100px){ .grid { grid-template-columns: minmax(0,1fr) } }`. Hanya berdampak pada `.grid` tanpa kolom inline; nol `.grid` pakai `grid-auto-flow: column`. **Satu-satunya bagian non-mekanis PR — mudah dicabut sendiri.**
Terukur @1024px (psak46·icfr·opinion·wtb): luberan **384 → 0** keempatnya. @1440px: `777px 380px` utuh, KPI `253×3` utuh, nol dampak desktop.

## Tugas 3 — seed + restart **SELESAI** (2026-07-27 15:10)
Ari memilih "salin dev.db dulu". Salinan: `server/prisma/preseed-backup-20260727-1503.db` (602.112 byte) — **rollback = salin balik**; dinamai berakhiran `.db` supaya tertutup `server/.gitignore` (`*.db`; `.bak-…` TIDAK tertutup).
Seed menghapus **14 tabel, bukan 11** — termasuk `stateDoc` (SELURUH kerja kertas kerja terpersist: sign-off, kesimpulan SA 230, checklist, materialitas, keputusan AJE) dan `authEvent` (jejak audit hash-chain). Semua sesi ikut terhapus → seluruh pengguna, termasuk sesi chat lain, ter-logout.
**Terverifikasi langsung di DB (Prisma, bukan dugaan):** pra-seed **NOL** peran punya `aje.post` (tabel Role terisi sebelum PR-B merge → cache non-null → server MENOLAK posting bagi semua). Pasca-seed: `aje.post` ada di **Rekan Pemimpin · Engagement Partner · Rekan** saja; Manager/Senior/Junior tidak — sesuai desain Partner-only PR-B.
**Restart TANPA membunuh proses sesi lain:** `server/package.json` `dev` = **`tsx watch`** → cukup `touch server/src/server.ts` (mtime saja, konten nol berubah, `git status` bersih). PID 5181 berganti 30100 → 29992. `refreshRoleCache()` di-await sebelum `listen()` sehingga cache pasti terhidrasi dari baris Role pasca-seed.
**END-TO-END TUNTAS (Ari login sbg Hartono W./Rekan Pemimpin).** Modul **Approvals** (`route 'approvals'`, `view_platform`) → AJE-03 tampil **2/3** dgn langkah final "Hartono Wijaya MENUNGGU"; tombol **"Setujui & Finalkan"** aktif → diklik → `DISETUJUI`, nol error. **Uji yang menentukan = RELOAD:** AJE-03 hilang dari antrean "Menunggu" setelah muat ulang → tulisan benar-benar lolos ke server, bukan sekadar state lokal. **Kapabilitas `aje.post` lapis server TERBUKTI.**
Modul AJE (tab "Persetujuan & Jejak Audit") **display-only** — teksnya sendiri menunjuk ke Antrean Persetujuan; jangan cari tombol di sana.

## GOTCHA baru
- **Jangan tulis skrip scratch ke dalam repo** — `rm codemod.mjs` menghapus berkas TERLACAK (`migration/codemod.mjs`, codemod legacy 323 baris). Ketahuan hanya karena `git diff --shortstat` menunjukkan 197 insertions vs **520** deletions. **Selalu cek `git diff --numstat | awk '$1!=$2'` setelah codemod** — sapuan satu-kata WAJIB seimbang. Pakai direktori scratchpad.
- `localStorage['ams.route']` disimpan **MENTAH**, bukan JSON — `JSON.stringify('psak46')` menghasilkan rute `"psak46"` (dgn tanda kutip) → StubView "MODULE SCAFFOLDED". Sempat menyesatkan.
- Hook React yang di-destructure **tak bertipe** di repo ini → `DT.etr * 100` lolos tsc meski `etr: number | null`. Anotasi di LHS (`const X: ReturnType<typeof f> = useMemoX(...)`), bukan `useMemoX<T>()`.
- `fiscalReconciliation([], …)` **jatuh ke singleton** `AMS.WTB` (aturan `wtbRows`), bukan populasi kosong — uji pertama saya salah mengasumsikan sebaliknya. `entityFigures` sengaja BEDA (tanpa fallback).
- Verifikasi anti-basi murah: `fetch('/src/view_psak46.tsx')` lalu cek simbol penanda PR.
- **`capsJson` menyimpan NILAI kapabilitas (`'aje.post'`), bukan nama konstanta (`AJE_POST`).** Probe regex `/AJE_POST/` memberi `false` di SELURUH peran dan hampir membuat saya melaporkan "seed tak menambahkan kapabilitas" — padahal seed benar. Pola kesalahan yang sama dengan tiga kali sesi lalu: cek bentuk data sebelum menyimpulkan.
- **Restart backend tanpa mengganggu sesi lain: `touch server/src/server.ts`** (`tsx watch`). Jangan bunuh proses `dev-all` milik sesi chat lain.

Terkait: [[asseris-aje-module-eval]] · [[asseris-materiality-om-split]] · [[asseris-wtb-eval-pr1-pr2]]
