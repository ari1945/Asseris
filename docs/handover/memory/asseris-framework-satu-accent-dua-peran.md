---
name: asseris-framework-satu-accent-dua-peran
description: "Penentu Kerangka — satu bidang `accent` memikul peran TEKS dan ISIAN sekaligus; sensus ambang meleset karena notasi 50e9; mesin fwDetermine nol-pemanggil dan hilir tak pernah menerimanya"
metadata: 
  node_type: memory
  type: project
  originSessionId: 59fcd278-23b3-4d47-abb7-08bdf2255037
  modified: 2026-08-27T03:05:37.284Z
---

Arc modul `framework`, 2026-08-27. Token + gerbang selesai; lalu Ari "Proceed." →
PR-1..PR-4 DIKERJAKAN & hijau (49 uji, 5 suite). PRD `docs/prd-framework-ssot-hilir.md`
= In Progress. Berkas baru: `fw_canon.ts` (mesin+portofolio+profil kerangka).

**STATUS 2026-08-27 (dijeda di sini):** **PR #315 TERBUKA**, `fix/framework-ssot-hilir`
= `50acb57`, satu commit di atas `origin/master` `648e71f`. MERGEABLE, **9 job CI
pending** (ter-dispatch betul, bukan kasus dispatch hilang). `npm run verify`
**PASSED** di worktree `.claude/worktrees/fw-canon` (3684+461 uji, nol gagal) —
tetapi CI menjalankan **Playwright×Postgres + npm audit** yang TIDAK dijalankan
lokal; di situ satu-satunya kejutan yang mungkin.
⚠ Commit KEMBAR `e205b77` juga ada di cabang lokal `fix/timebudget-engagement-isolation`
(checkout utama) — isinya sama, hasil cherry-pick. Jangan mendaratkan keduanya.
⚠ Bersihkan worktree hanya dengan `git worktree remove`; junction `node_modules`
dilepas `cmd /c rmdir`, JANGAN `rm -rf` (menembus ke node_modules asli).

**1. Satu bidang `accent` memikul DUA peran — dan hex-nya kembar identik di terang.**
`FW_META.accent` dipakai sebagai `color:` (teks) DAN `background:` (isian) DAN
border. Memetakannya ke satu token mustahil: `--blue` (teks) dan `--blue-solid`
(isian) bernilai **sama persis di tema terang**, jadi pilihan yang salah lolos
tinjauan mata dan hanya patah di gelap. Diukur di peramban:

| | terang lama→baru | gelap lama→baru |
|---|---|---|
| SAK | 7,17 → 7,17 | **1,62 → 4,53** |
| EP | 5,30 → 5,30 | **2,59 → 4,57** |
| EMKM | 6,37 → 6,37 | **2,22 → 4,62** |

Perbaikannya = **pecah satu bidang jadi tiga peran**: `accent` (isian,
`--*-solid`) · `text` (teks di permukaan, `--*`) · `fg` (teks di atas tint,
`--b-*-fg`). Catatan: `--b-*-fg` ≠ `--*` di gelap untuk teal & purple (tapi SAMA
untuk blue) — jangan asumsikan bisa dipakai bergantian. Blue tak punya
`--blue-bg`; analog strukturalnya `--blue-100`. Lihat [[asseris-gradient-token-sweep]].

**2. `m.accent + '33'` mustahil dengan token** — `'var(--blue)33'` bukan CSS dan
gagal DIAM. Pakai `color-mix(in srgb, ' + tok + ' 20%, transparent)` (preseden
repo: `styles_ai.css:147`, `view_crypto.tsx:230`). `33` heks = 20%.

**3. Sensus ambang MELESET karena notasi eksponensial.** Prompt menyatakan
"ambang EMKM 50M/10M hardcoded" tidak ditemukan. Ada — ditulis `50e9`/`10e9`
([:31]), bukan `50.000.000.000`. **Grep ambang numerik wajib mencakup `NNe9`,
bukan hanya digit berpemisah.** Klaim `window.LINEAGE` juga BENAR ([:503]) —
dan `LINEAGE` tak ada di daftar dual-publish sah CLAUDE.md §3.1.
Bandingkan [[asseris-gap-matrix-eval]]: di sini yang salah adalah klaim "TIDAK
ADA", bukan klaim "ADA".

**4. Mesin normatif nol-pemanggil, hilir nol-konsumsi.** `fwDetermine` diekspor,
**nol importir**. `LINEAGE.down` menjanjikan `fsgen`/`opinion` menerima kerangka;
ketiganya **nol kemunculan** `SAK EP`/`SAK EMKM` — semua memaku SAK penuh
(PSAK 71/72/73, "SA 700/705/701"). Jadi app bisa menetapkan EMKM lalu menerbitkan
CALK PSAK 73 tanpa kontradiksi terdeteksi. Lihat [[asseris-mesin-nol-pemanggil-parkir]].

**5. `FW_PORTFOLIO` = SSOT kedua yang MEMBANTAH sumbernya.** 8 dari 9 entri
membayangi `AMS.CLIENTS`; C-031 & C-063 menambah sufiks "Tbk" yang tak ada di
`data_part1`. Angkanya karangan: C-047 literal (18 M/6 M) menyimpulkan lewat
**gerbang 3**, sedangkan `entityFigures()` atas WTB (44,8 M/16,3 M) lewat
**gerbang 2** — kerangka sama, **dasar penetapan berbeda**. Sumber benar =
`entityFigures(wtb,'unadj')` (`canon_base.ts:93`) → `.revenue`/`.equity`/`.available`.
WTB ada untuk 7 perikatan (`WTB_BY_ENGAGEMENT`) + ENG-2025-014 di `data_part1`.
⚠ "Modal usaha" PP 7/2021 mengecualikan tanah & bangunan — **nol akun demikian**
di WTB, jadi ekuitas hanya APROKSIMASI yang wajib dilabeli.
Lihat [[asseris-invprop-ssot-kedua]].

**6. Heredoc Bash memakan `\\b` bahkan di `<<'EOF'`.** `new RegExp('\\b'+peran)`
tiba sebagai `'\b'` = backspace harfiah → nol cocok → seluruh gerbang terbaca 0
dan HIJAU. Perbaikannya bukan escape ganda: **jangan rakit RegExp**, tulis regex
harfiah. Persis jebakan yang diperingatkan gerbangnya sendiri.
Lihat [[asseris-repo-hygiene-2026-08-19]].

**7. Pohon kerja bersama sudah MERAH sebelum disentuh.** `npm run verify` gagal
6 gerbang karena berkas TAK-TERLACAK sesi lain (`a11y_anchor_href`,
`home_composition`, `wip_writedown_authority`, `mytasks_scope`,
`mytasks_derive`). Cara membuktikan bukan salahmu: **jalankan verify pada pohon
yang perubahanmu dicabut** dan bandingkan daftar gerbang gagal — identik.
Lihat [[asseris-sesi-paralel-satu-worktree]].


---

## Lanjutan: PR-1..PR-4 (sesudah "Proceed.")

**8. `null` vs `false` adalah PEMBEDAAN DOMAIN, bukan kerapian tipe.** `false` =
"sudah dinilai, jawabannya tidak"; `null` = "belum ada yang menilai". Mesin lama
memakai `false` untuk keduanya, jadi entitas jasa keuangan non-tercatat yang uji
fidusianya tak pernah diisi diam-diam lolos gerbang 1 → SAK EP, padahal jawaban
"ya" menempatkannya di SAK. Perbaikannya: `fwDetermine` mengembalikan
`fw: null` + `pending`/`pendingKeys` dan MENOLAK menyimpulkan. Efek nyata: 4 dari
8 klien kini "belum disimpulkan" — itu keadaan sebenarnya, bukan regresi.

**9. Pisahkan FAKTA TERUKUR dari PERTIMBANGAN.** Penjualan/ekuitas/`listed` =
turunan kanon, tak dapat disunting. Fidusia/kompleksitas/pilihan-naik = jawaban
manusia, tersimpan. Mencampurnya di satu larik literal adalah akar D1. UI harus
menolak menawarkan "pendapat" untuk figur (`pendingKeys: ['figures']`).

**10. Keadaan jujur yang tak dapat ditindaklanjuti = jalan buntu sopan.** Baris
portofolio yang menunggu WAJIB membawa kontrol jawabannya sendiri, kalau tidak
"belum dinilai" hanya memindahkan masalah ke pengguna.

**11. Kunci firm BARU gagal DUA cara senyap** — wajib didaftarkan di KEDUA sisi:
`capForWrite` di `migration/src/rbac.ts` (tanpa cabang → jatuh FIRM_ADMIN,
Manajer ditolak senyap) DAN `FIRM_STATE_READ_KEYS` di `server/src/stateAccess.ts`
(opt-in; tak terdaftar → dokumen tersimpan tapi TAK PERNAH terbaca). Dua berkas,
tak ada yang memaksa keduanya berubah bersama → butuh gerbang kontrak dua-sisi.
Kunci arc ini: `framework.judgements.v1` → ENGAGEMENT_MANAGE (sejajar `priorYear`).

**12. Gerbang statik `toContain('namaFungsi')` DIPUASKAN OLEH BARIS `import`.**
Mutasi mencabut penyaring CALK → gerbang saya tetap HIJAU. Perbaikan: buang baris
`import` dulu, lalu hitung `namaFungsi\(` — dan cocokkan BENTUK penjagaannya
(`/!fwAllowsPsak\([^)]*\)\s*\?\s*null/`), bukan sekadar keberadaan nama.
Varian baru dari [[asseris-spr2400-pengiriman-dan-premis-salah]].

**13. PR-5 DITARIK — premis saya sendiri salah.** Saya menulis "compmatrix tak
menyempit mengikuti kerangka" dari klaim `LINEAGE`, bukan dari membaca modulnya.
`view_compmatrix` **nol** `activeClient`/`useFirm` — ia register cakupan standar
tingkat FIRMA (SA/PSAK mana yang diliput checklist/modul/gap). Menyempitkannya
per klien aktif akan MENYEMBUNYIKAN standar yang wajib untuk klien lain. Pelajaran:
[[asseris-gap-matrix-eval]] berlaku pada PRD saya sendiri — verifikasi premis
sebelum menjadikannya pekerjaan.

**14. Cabang yang tak pernah dijalankan data seed.** Ketujuh perikatan seed
bermuara SAK penuh, jadi jalur EP/EMKM dijaga uji unit + gerbang statik, bukan
pemakaian nyata. Dicatat di PRD §13, bukan didiamkan.
