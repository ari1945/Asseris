---
name: asseris-w1-identitas-tersegel-paralel
description: "Gelombang W1 — 8 paket prompt PARALEL disjoint (32 berkas) atas identitas karangan di artefak tersegel; window.activeEngagement TAK PERNAH ditulis; literal firma punya TIGA gradasi"
metadata: 
  node_type: memory
  type: project
  originSessionId: 0edbff18-499a-462e-8f4e-030b51703141
  modified: 2026-08-27T14:47:23.057Z
---

✅ **PR #328 MENDARAT `bc51f47` (2026-08-28)** — kesembilan berkas prompt kini ADA di
`origin/master` (terverifikasi: 9 berkas `W1-*` di `docs/prompts-perbaikan/`), cabang
remote dihapus. Sesi cloud/browser kini bisa membacanya. Docs-only, dibuat dari worktree bersih di scratchpad (direktori kerja utama
tak tersentuh: tetap 4 M + 16 ??). Sebelum ini W1 hanya ada sebagai untracked lokal ⇒
sesi cloud tak bisa melihatnya sama sekali.

Dibuat 2026-08-27; **diperluas & diverifikasi ulang 2026-08-28 terhadap `origin/master`
= `8a8cc54`** (sesudah W0 tuntas). **Delapan** prompt `W1-A`…`W1-H` + brief kelas
`W1-00-IDENTITAS-TERSEGEL.md`. 32 berkas dimiliki, disjoint, nol tabrakan dengan kerja
belum-commit. Nol berkas W1 tersentuh W0 (#318–#322).

⚠ **`firm:` punya TIGA gradasi — jangan anggap satu bentuk.** (a) literal telanjang
`firm: 'KAP Wijaya…'` (SA/cockpit/records/psak16:178); (b) FALLBACK
`(AMS.FIRM as …)?.name || 'KAP Wijaya…'` (mayoritas modul PSAK); (c) `view_psak71:137`
`const FIRM: any = (AMS && AMS.FIRM) || { name: 'KAP Wijaya…', license: '' }` — plus
`:any`, plus bentuk KETIGA `const eng = engId || 'ENG-2025-014'` di `:357`. Cadangan ke
`AMS.FIRM` HARUS ikut dicabut: ia objek yang SAMA dengan `useAuth().firm`, jadi nol
informasi, dan ia membuat keadaan "identitas tak tersedia" mustahil tercapai ⇒ penjaga
`disabled` jadi kode mati tak teruji.

## Temuan yang paling tak terduga — `window.activeEngagement` adalah HANTU

Delapan berkas menulis `scopeId: (window as { activeEngagement?… }).activeEngagement?.id`
(`view_cockpit` `view_groupaudit` `view_related` `view_sa800` `view_sa805` `view_sa810`
`view_sjah3000` `view_subsequent`). **Tak satu pun tempat di repo menulis
`window.activeEngagement =`** — `git grep -nE "window\.activeEngagement *=" -- migration/src server/src`
memberi NOL. Jadi nilainya SELALU `undefined`, dan `as` adalah satu-satunya alasan
kompilator diam.

🔴 Akibat yang tak terlihat dari view: `server/src/router.ts:735` berbunyi
`if (input.scope === 'engagement' && input.scopeId) { await assertEngagementAccess(…) }`.
Dengan `scopeId` undefined **penjagaan akses perikatan dilewati seluruhnya**, lalu
segel Ed25519 + `logEvent` tetap terbit dengan `scope:'engagement'`. `view_groupaudit`
paling parah: ia membaca `id`, `clientName`, DAN `fy` dari objek hantu yang sama.

## SSOT yang sudah ada — jangan bikin lagi

`migration/src/firm_identity.ts` → `useFirmName()` (`''` = tak tersedia, pemanggil
WAJIB menolak menerbitkan). Presedens pemakaian lengkap dengan tombol `disabled` +
`title` ada di **`view_firmtreasury.tsx:131, 165, 187`**. Untuk penolakan tulis tanpa
perikatan aktif, presedensnya `attachment_scope.ts` + `view_sa580.tsx` (PR #317).
Untuk identitas perikatan literal-tanpa-syarat, presedens gerbangnya
`compliance_engagement_identity.test.ts`. Untuk baris tabel `<tr onClick>` → kontrol
native, presedensnya `.proc-rowbtn` di `view_procurement.tsx:232-270` (PR #308),
bersaudara dengan `.pc-rowbtn` & `.ia-rowbtn`.

## Sensus kelas (terhadap `405cc67`; nomor baris di prompt sudah disegarkan ke `8a8cc54`)

- `firm: 'KAP Wijaya Hartono & Rekan'` → **55 situs / 47 berkas**
- `'PT Sentosa Makmur Tbk'` sebagai fallback klien → **46 berkas**
- `window as { activeEngagement` → **8 berkas**
- fallback WRITE-PATH `firm.activeEngagement || { id:'ENG-2025-014' }` → **16 modul PSAK,
  kini tertutup seluruhnya oleh W1-F (psak1/2/14/16) + W1-G (19/22/24/25/46/48) +
  W1-H (58/65/66/68/71/72)**. Berkas pendamping ikut pemiliknya: `_nrv`→psak14,
  `_register`→psak16, `_parts`→psak72.

## Yang membuat kedelapan paket AMAN dijalankan paralel

Kepemilikan berkas **disjoint dan terverifikasi** (nol duplikat lintas-paket, nol
tabrakan dengan kerja belum-commit; diverifikasi ulang 2026-08-28). Kunci desainnya:
helper bersamanya **sudah mendarat**, jadi tak ada berkas bersama yang perlu disunting.
Titik konflik yang sengaja dihindari: `eslint-suppressions.json`, `contexts.tsx`,
`export_pdf/xlsx.ts`, dan **gerbang sensus repo-wide** — gerbang repo-wide akan merah
bergantian selama paket lain belum mendarat, jadi ia ditunda jadi PR penutup.

⛔ **DEFAULT_ENG_ID di `persist_scope.ts:23` + `contexts.tsx:927` sengaja TIDAK masuk
W1** — menyentuh semua kunci persist sekaligus, berinteraksi dengan
[[asseris-migrasi-lingkup-hangus]], **menunggu keputusan Ari**.

Lihat juga [[asseris-eng-fallback-kelas-tulis]] · [[asseris-sensus-cabang-2026-08-27]].

## Uji paralelisme: tiga kopling TERSEMBUNYI (2026-08-28)

Disjoint di tingkat berkas TIDAK cukup. Yang diukur:

1. **Saling-impor lintas paket — NOL.** Diperiksa `from './view_*'` pada ke-32 berkas.
2. **⚠ Ratchet `:any` — KE-32 berkas punya entri `count` BER-JUMLAH TEPAT** di
   `migration/eslint-suppressions.json` (psak71=44, cockpit=59, relatedsvc=76, …).
   🔴 **Memerah dua arah, lewat DUA gerbang BERBEDA — jangan tertukar** (diuji langsung
   2026-08-28 di worktree terisolasi): **naik** → langkah `frontend :any ratchet`
   (`scripts/check-any-ratchet.mjs`, plafon TOTAL `CEILING=8174`; skripnya menyebut
   dirinya "satu arah: turun boleh, naik tidak"). **TURUN** → langkah `frontend lint`
   (`eslint src` polos) → `There are suppressions left that do not occur anymore.`
   **exit 2**. Saya sempat salah mengatribusikan penurunan ke ratchet-nya — ratchet itu
   justru MENYAMBUT penurunan. Setiap
   paket yang mengubah jumlah `:any` harus menyentuh SATU berkas bersama. Kasus yang
   diketahui: `view_psak71.tsx:137 const FIRM: any` (W1-H). Aturan: BERHENTI & laporkan;
   penyelarasan baseline jadi satu PR kecil di akhir.
   ⚠ Jebakan grep: kunci berformat **`src/view_x.tsx`**, bukan `migration/src/…` —
   mencari dengan prefiks penuh memberi NEGATIF PALSU.
3. **⚠ Gerbang "PAKU" `spr2400_conventions.test.ts`** — menegaskan cacat tetangga MASIH
   ADA dan sengaja memerah bila diperbaiki. `:240` `toEqual([spr2410, sa800, sa805, sa810])`
   nama penanda tangan 'Hartono Wijaya' (**W1-A**); `:246` `mati.length >= 4` tombol
   'AI Assist' mati di sa200/sa501/sa520/spr2410 (**W1-D**). Satu berkas uji dipaku dua
   paket. Di sini paku **MENGALAHKAN** aturan keras BLOK-A no.4 ("tombol mati: aktifkan
   atau hapus") — tabrakan aturan yang harus dinyatakan eksplisit di prompt.
   (`regref_census.test.ts:167` yang menyebut psak24/46 hanya assertion NEGATIF — benign.)

## 🔴 `view_cockpit.tsx` BUKAN modul Cockpit

`lazy_views.tsx:112-113`: `'cockpit'` → **`view_cockpit2.tsx`** (`EngagementCockpit`,
1196 baris) · `'programme'` → **`view_cockpit.tsx`** (`AuditProgramme`, 710 baris).
Paket W1-B memiliki `view_cockpit.tsx` = modul **Program Audit**; label "cockpit"-nya
sudah dikoreksi. `view_cockpit2.tsx` bersih (PR #265) dan dijaga LIMA gerbang
(cockpit_conventions/gate/isolation/report/timeline) — menyentuhnya memerahkan semuanya.
⚠ `grep view_cockpit` cocok sebagai AWALAN dari `view_cockpit2` — sumber kesimpulan
salah saya sendiri.

## Menjalankan W1 di cloud (browser)

`claude.ai/code` → repo `ari1945/Asseris` (GitHub-hosted ⇒ tak perlu `CCR_FORCE_BUNDLE`).
Satu sesi per paket. **Tujuh paket cocok cloud; W1-E LOKAL** — DoD-nya menuntut bukti
non-regresi visual + perilaku papan-ketik sungguhan, dan jsdom TIDAK mensintesis
Enter→click (hijau palsu, jebakan #306).

Setup per sesi cloud (cermin `ci.yml`): **Node 22** · `npm ci` di root, `migration/`,
`server/`. Lockfile ADA di keempat workspace. Prisma diurus langkah pertama
`npm run verify` (`tools/ensure-prisma-client.mjs`). Tak ada `.devcontainer`.

⚠ `D:\Claude AI\CLAUDE.md` (aturan kerja Ari) **TIDAK ikut** — ia dua level di atas repo.
Escape hatch bila sesi cloud butuh mata: `claude --teleport <session-id>` menariknya ke
lokal beserta riwayat percakapan.

## Jebakan tooling yang menggigit sesi ini

- `gh ... --jq` : `conclusion` bernilai **string KOSONG** (bukan `null`) selama run
  berjalan ⇒ `select(.conclusion != null and .conclusion != "SUCCESS")` melaporkan
  check yang sehat sebagai GAGAL. Pakai `.status != "COMPLETED"` untuk "masih jalan".
- Tool Bash meng-mangle `git show 'origin/master:.github/...'` (titik dua + backslash).
  Pakai `MSYS_NO_PATHCONV=1`.
- Python di Windows tak melihat `/tmp` milik Git Bash — lewatkan berkas antar keduanya
  via direktori scratchpad, bukan `/tmp`.

## 🔴 2026-08-28 — GELOMBANG W1 DITAHAN (#330 `868678d`), dan premisnya sebagian SALAH

`claude/intelligent-keller-7b28db` memikul `export_identity.ts` + konversi **103 berkas**
— **28 di antaranya berkas W1** — dengan arsitektur BERLAWANAN: argumen `firm:`/`scopeId:`
**dicabut** dari call-site, eksporter MENARIK identitas dari SSOT. PRD-nya
`docs/prd-export-seal-identity-ssot.md` (hanya di cabang itu, Draft) melingkupi **123
call-site di ±60 view**. Keputusan Ari: kerjakan W1-E saja, tahan sisanya, lalu sign-off
PRD & daratkan arc.

⚠ **AKAR KEKELIRUAN: saya memvonis cabang dari SATU berkas contoh.** `view_sa580.tsx`
identik dengan master karena #317 men-cherry-pick-nya ⇒ saya simpulkan "sudah mendarat".
100 berkas lain tak diperiksa. **Uji yang benar: `git diff --name-only origin/master
<cabang>` (POHON), plus `gh pr list` sebagai tempat KEEMPAT** — PR terbuka tak muncul di
sensus cabang lokal.

🔴 **PREMIS W1 YANG TERBUKTI SALAH — `firm` TIDAK ikut di-hash.** (Koreksinya MENDARAT
lewat **#331 `2ed5908`**.) Diverifikasi di master:
`export_pdf.ts` `canonicalPayload` = `{kind,title,refNo,meta,blocks}`;
`export_xlsx.ts` = `{kind,title,sheets}`. Jadi **nama firma tak disegel di kedua format**,
dan **`meta` tak disegel di XLSX**. Yang benar-benar tersegel hanyalah `meta` PDF — di
situlah `ENG-2025-014` karangan mendarat (20 situs `engLabel`). Rumusan W1 "identitas
karangan di dalam payload yang DISEGEL" karena itu **salah untuk `firm:` di mana pun dan
untuk XLSX seluruhnya**. Segel membuktikan ISI TABEL, bukan PENERBITNYA.

🔴 **CELAH PRD yang harus ditutup sebelum sign-off:** mitigasi R-1/SC-9 menuntut
`sealFormat` pada rekaman segel, dan Q-3 menuntut nama firma tersimpan saat penandatanganan
— **model `Seal` (`server/prisma/schema.prisma:212`) tak punya keduanya** (hanya kind ·
contentHash · scope · scopeId · signer · pubKeyId · signature). Itu **perubahan skema
Prisma**, yang CLAUDE.md wajibkan disebut di PRD — §4 Scope tidak menyebutnya. Hanya
memengaruhi F-3; F-1/F-2 tidak menyentuh hash sama sekali.

⚠ **R-4 bertabrakan dengan keputusan yang belum diambil**: ia meremehkan jalur penolakan
karena "perikatan aktif SELALU ada (seed + `DEFAULT_ENG_ID`)" — padahal `DEFAULT_ENG_ID`
(`persist_scope.ts:23`) justru item yang menunggu keputusan Ari. Cabut ia, dan jalur
penolakan berhenti langka.

## 🔴 DUPLIKASI KEDUA dalam satu hari — W1-E dikerjakan dua kali (2026-08-28)

Sesi lain mendaratkan W1-E sebagai **#329 `f57c24b`** (mendarat SEBELUM PR saya; PR #331
saya susutkan jadi docs-only dan mendarat `2ed5908`) selagi saya mengerjakannya. Saya
**melihat sinyalnya dan mengabaikannya**: cabang `fix/w1e-records-relatedsvc` sudah ada
(di `8ce8e8e`, tanpa commit), saya bahkan MELAPORKANNYA ke Ari — lalu tetap mengerjakan
W1-E sendiri **tanpa `gh pr list` ulang**. Itu langkah yang baru saja saya tulis sendiri
ke `00-LANJUTKAN.md` sebagai "tempat KEEMPAT yang wajib diperiksa". **Cek PR terbuka
LAGI tepat sebelum mulai menulis kode, bukan hanya saat sensus.**

Versi #329 lebih baik dan bedanya mendidik:
- Penanda Pengecualian → **`<Check>` native**, bukan tombol ber-`aria-pressed`. Alasannya
  semantik: ini **keadaan dua-nilai yang DISIMPAN**, bukan aksi. Dan nama aksesibelnya
  **sengaja TETAP** di kedua keadaan — nama kontrol yang ikut berubah membuat rujukan
  papan-ketik/suara tak stabil. Versi saya menaruh keadaan DI DALAM `aria-label`: salah.
- Ia menemukan **border UA 2px `<button>` yang MELEBARKAN kolom** — regresi visual yang
  versi saya akan kirimkan, karena saya tak pernah membuka peramban.
- Gerbangnya 448 baris (vs 155): merender view SUNGGUHAN dan mem-probe bahwa jsdom tak
  mensintesis Enter, alih-alih hanya memindai sumber.

⚠ **Dua bentrokan CSS yang saya temukan sendiri tetap berlaku** bila ada yang menulis
kelas reset tombol: `<style>` in-komponen dimuat BELAKANGAN dengan specificity sama, jadi
`.rr-rowbtn{font:inherit}` **menimpa** `.tiny{font-size:11px}` (`styles_base:304`) dan
`{background:none;border:0;padding:0}` **meratakan** `.chip` (`styles_ai:291`). Pisahkan
kelasnya per-peran. `*{box-sizing:border-box}` ada di `styles_base:258`.

⚠ **Junction `node_modules` ke worktree memicu gerbang #327**
(`assertPrismaClientBelongsToThisTree()`) — backend test GAGAL, dan itu BENAR. Juga: dua
`verify` yang berjalan bersamaan berebut `server/prisma/test.db` → EPERM. Jalankan satu
per satu, dan jangan menyunting berkas selagi `verify` membacanya (memicu kegagalan
frontend palsu).

⚠ **Spek `e2e/07-a11y-axe-keyboard.spec.ts` hanya mencakup login · Beranda · Dashboard
Firma · Pengaturan** — Playwright hijau TIDAK membuktikan modul lain. Jangan mengklaimnya.

## ✅ 2026-08-29 — ARC EKSPOR MENDARAT (#332 `e2f69d6`), sign-off SUDAH terjadi

112 berkas. `export_identity.ts` + `contexts.tsx` sbg satu-satunya penerbit; `firm`/`scopeId`
dicabut dari `ExportModelBase` sebagai `?: never` (mengirimnya = galat `tsc`). **E-2, E-3,
E-5 mati.** PRD ikut mendarat, status **In Progress**, §12 memuat sign-off Ari (Q-1..Q-4
sesuai rekomendasi). Gelombang W1 karena itu selesai seluruhnya — tujuh paket yang ditahan
memang tak perlu dikerjakan.

⚠ **SC-4 BELUM terpenuhi**: `firm` MASIH belum ikut di-hash, jadi keluhan inti E-4
— "artefak boleh mencantumkan nama firma apa pun dan verifikasi segel tetap lulus" —
**masih berlaku**. Yang tertutup adalah SUMBER-nya, bukan CAKUPAN segelnya. Jangan membaca
F-2 sebagai "E-4 selesai".

Sisa: **F-3** (canonicalPayload v2 — mengubah hash) · **F-4** (penolakan terlihat di UI)
· **F-5** (20 situs `engLabel`, SC-2) · **F-6** (registri → Implemented).

**PR #333 — tiga amandemen pasca-sign-off** (docs-only, CLEAN 6/6, menunggu merge):
- **A** · §4 Scope melewatkan **perubahan skema Prisma**. Model `Seal`
  (`schema.prisma:212`) tak punya `sealFormat` maupun nama firma ⇒ mitigasi R-1 & Q-3
  tak dapat dijalankan seperti tertulis. Presedens sebangun: `server/src/crypto/keyArchive.ts`.
- **B** · R-4 memakai `DEFAULT_ENG_ID` (cacat terbuka) sebagai alasan risikonya rendah.
  Cabut cacat itu ⇒ R-4 naik ke TINGGI dan **F-4 jadi PRASYARAT**, bukan lanjutan.
- **C** · **E-1 tak pernah ditutup PRD ini** — sudah mati lewat #286 sehari sesudah PRD
  ditulis. §12 & baseline SC-2 dikoreksi.

⚠ **Angka §1 PRD sebagian basi** (ditulis 21 Agu, dikutip terus sesudahnya): E-1 0 bukan 1
· E-3 11 berkas bukan 10 · E-4a 54/47 bukan 60/51 · E-4b jauh lebih kecil. E-2 & E-5 tepat.
**Jangan pakai sebagai baseline gerbang F-5 tanpa hitung ulang.** Klaim basi menular lewat
PESAN COMMIT juga: #317 menyebut `view_sa230.tsx:110` "satu-satunya sisa" lima hari sesudah
ia bersih.

## 🔴 F-3 MENDARAT (#334 `052d6c9`) — dan segel TIDAK menjamin isi tabel juga

> Rincian penuhnya ada di berkas khusus [[asseris-segel-buta-isi-replacer]] (ditulis sesi
> yang mengerjakan F-3). Yang dicatat di sini hanya bagian yang membantah klaim SAYA.

`JSON.stringify(pick, Object.keys(pick).sort())` — **argumen kedua BUKAN pengurut kunci**,
melainkan **replacer daftar-izin kunci yang berlaku REKURSIF**. Daftar izinnya hanya memuat
kunci tingkat ATAS, sehingga **setiap sheet & blok PDF diserialisasi jadi `{}`**. Yang
ditandatangani tinggal `kind` `title` `refNo` `meta`(pdf) + JUMLAH sheet/blok — **nol sel**.
Dua register berbeda isi DAN jumlah baris ⇒ `contentHash` IDENTIK (`6cf8b2f9…`) ⇒ segel
Ed25519-nya **dapat dipertukarkan**.

⚠ **Klaim saya sendiri "segel membuktikan isi tabel, bukan penerbitnya" SALAH separuh** —
saya taruh di master lewat #331. Dikoreksi di PR #335 (koreksi KEDUA di W1-00).

⚠ **Lolos bertahun-tahun karena gerbangnya menguji FIELD YANG SALAH**: `export_pdf.test.ts`
"changes when the content changes" mengubah **`title`** — satu dari tiga field yang kebetulan
ikut. **Gerbang yang menguji field yang salah tidak menjaga apa pun.** Ini kelas jebakan
gerbang keempat di repo ini, sesudah: regex dirakit dari string, `toMatchObject({p:/re/})`,
dan menguji simbol bukan perilaku.

**Amandemen A saya TERPAKAI**: `Seal.sealFormat` (default 1) + migrasi
`20260829010000_seal_format_v2` mendarat bersama F-3, jadi segel lama tetap dapat
direproduksi dengan algoritmanya sendiri (SC-9 · R-1).
