# Evaluasi Menyeluruh Asseris — bug & gap (2026-11-25)

> Basis kode: `master` = `3de574c` (#336, 7 Sep 2026), checkout bersih.
> Pendahulu: [`EVALUASI-GAP-2026-08-29.md`](EVALUASI-GAP-2026-08-29.md) (gap per modul) dan
> [`EVALUASI-SAAS-2026-08-31.md`](EVALUASI-SAAS-2026-08-31.md) (kesiapan SaaS).
> Dokumen ini **tidak mengulang** keduanya; ia melaporkan temuan BARU, dan memeriksa ulang
> beberapa temuan lama terhadap master sekarang.
> Bukan PRD (tanpa awalan `PRD-`, tak masuk registri §7).

---

## 0 · Ringkasan eksekutif

**Gerbang mutu hijau, tetapi gerbang itu hanya pernah menguji firma demo.** `npm run verify`
LULUS penuh di mesin ini (frontend 230 berkas / 4.013 uji · build · budget 783 ≤ 1.500 KB ·
backend 34 berkas / 511 uji · lint · typecheck). Namun seluruh uji, seed, dan e2e berjalan di
atas firma `FIRM-WHR` dan perikatan `ENG-2025-014`. Firma yang dibuat lewat jalur produksi
(`bootstrapFirm` / `pilot:provision`) **tak pernah dijalankan oleh satu uji pun** — dan justru
di situ empat cacat P0 di bawah hidup.

**Kesimpulan:** aplikasi ini **belum bisa dipakai firma nyata selain firma demo**, terlepas dari
kematangan audit-trail, RBAC, dan segelnya. Penyebabnya bukan banyak cacat kecil, melainkan
**satu kelas cacat struktural**: identitas demo (id firma, id perikatan, tanggal "hari ini",
tanggal pelaporan) dipaku di frontend, sementara backend — sejak #336 — benar menolak
identitas yang bukan milik pemanggil. Dua lapisan yang masing-masing benar saling mengunci.

| # | Temuan | Kelas | Status |
|---|---|---|---|
| **P0-1** | Frontend memaku `FIRM_SCOPE_ID = 'FIRM-WHR'`; server menolak scopeId firma lain ⇒ semua state firm-scope gagal baca/tulis untuk firma non-demo | Integrasi | **BARU** |
| **P0-2** | Tak ada prosedur server untuk membuat `Engagement` atau `EngagementMember` ⇒ perikatan yang dibuat di UI tak bisa menyimpan apa pun | Gap fungsional | **BARU** |
| **P0-3** | "Hari ini" dibekukan `2026-03-09` (154 pemakaian/56 berkas) dan tanggal pelaporan kanon dibekukan `2025-12-31` untuk SEMUA perikatan | Integritas data | **BARU** sebagai blocker produksi |
| **P0-4** | Boot selalu menghidrasi `ENG-2025-014`; firma nyata gagal senyap → data demo tetap tampil, lalu **tertulis ke DB produksi** pada suntingan pertama | Integritas data | Sebagian diketahui (W2-1 peran 3); mode kegagalannya BARU |
| **H-1** | Batas laju login di edge bisa dilewati lewat batching tRPC + penghitung gagal-login tidak atomik | Keamanan | **BARU** |
| **H-2** | Partner-admin dapat mengambil alih akun Partner lain (termasuk EQR) lewat reset + lepas 2FA, tanpa jejak di rantai hash | Keamanan / SoD | **BARU** |

---

## 1 · Metode dan batasnya

1. `npm run verify` dijalankan sungguhan di mesin lokal (Node 24.16) — bukan diasumsikan.
2. Pembacaan kode terarah: seluruh `server/src/router.ts` (1.688 baris), `auth/*`, `addUser.ts`,
   `engagementAccess.ts`, `stateAccess.ts`, `pilotProvision.ts`, `integrations/webhook.ts`,
   `deploy/aws-ec2-test/Caddyfile`; di frontend: `app.tsx` (boot), `api.ts` (hidrasi),
   `contexts.tsx` (`useServerState`, provider perikatan), `persist_scope.ts`, `canon_base.ts`,
   `canon_cit.ts`, `data_clock.ts`.
3. Setiap klaim di bawah ditautkan `file:line` dan dibuka ulang sebelum ditulis. Dua klaim
   aritmetika (tabrakan id) **dijalankan** dengan `node -e` memakai fungsi yang sama persis.
4. Klaim "absen" diuji dengan grep atas seluruh `migration/src` dan `server/src`, termasuk
   daftar semua endpoint tRPC yang dipanggil frontend.

**Yang TIDAK dilakukan:** tak ada uji live di peramban atau e2e Postgres; bypass batching (H-1)
terverifikasi dari kode dan konfigurasi, **belum diuji dengan permintaan sungguhan**; 159 modul
tidak disisir ulang satu per satu (itu sudah dikerjakan evaluasi 29 Ags — §6 hanya memeriksa
ulang sinyalnya).

---

## 2 · P0 — penghalang go-live (firma nyata)

### P0-1 · `FIRM_SCOPE_ID` dipaku ke firma demo

- `migration/src/persist_scope.ts:22` — `export const FIRM_SCOPE_ID = 'FIRM-WHR';`, dipakai 15×
  (antara lain `contexts.tsx:1054-1055` untuk `clients` dan `engagements`).
- Server, sisi tulis: `server/src/router.ts:236` — `scope === 'firm' && scopeId !== firmId` ⇒
  `FORBIDDEN 'cross-firm-state'` (pagar D3 yang ditambahkan #336).
- Server, sisi baca: `server/src/stateAccess.ts:107-108` — penolakan yang sama.
- Firma produksi tidak bernama `FIRM-WHR`: `bootstrapFirm.ts:47` membentuk
  `FIRM-${slug(short)}`, `pilotProvision.ts:44` memakai `PILOT_FIRM_ID`.
- Bukti tambahan: `pilotProvision.ts:145` menulis StateDoc firm-scope ke `firmId` **sungguhan** —
  dokumen yang tak akan pernah dibaca UI karena UI membaca `FIRM-WHR`.

**Akibat:** untuk setiap firma selain demo, seluruh state firm-scope (daftar klien, daftar
perikatan, DMS, buku besar firma, SDM, pengaturan, …) ditolak 403 saat dibaca maupun ditulis.

**Mengapa gerbang hijau:** seed dan e2e memakai `FIRM-WHR`, jadi `scopeId === firmId` selalu benar.

### P0-2 · Tak ada jalan membuat perikatan atau menugaskan anggota

- Satu-satunya pembuat baris `Engagement`: `server/src/seed.ts:156` dan `pilotProvision.ts:79`.
  Satu-satunya pembuat `EngagementMember`: `seed.ts:239` dan `pilotProvision.ts:108`.
  Router hanya punya `engagement.list` dan `engagement.archive` (`router.ts:1029-1063`).
- UI membuat perikatan hanya di StateDoc `engagements` (`contexts.tsx:1113-1121`), dipanggil dari
  `view_firm.tsx:391` dan konverter onboarding `view_onboarding.tsx:449`.
- Setiap baca/tulis engagement-scope lewat `assertEngagementAccess` yang mencari baris Prisma
  (`engagementAccess.ts:43-48`) ⇒ perikatan baru = `FORBIDDEN 'cross-firm-engagement'`.
- `docs/PILOT-ONBOARDING-PLAN.md:90-92` menyatakan penugasan anggota dilakukan "lewat modul
  **Engagement Mgmt** yang sudah ada" — **klaim itu salah**: tak ada endpoint yang menulis
  `EngagementMember` (daftar lengkap endpoint yang dipanggil frontend diperiksa).

**Akibat:** firma nyata hanya dapat bekerja pada perikatan yang dibuat operator lewat CLI. Kertas
kerja, AJE, dan tanda tangan pada perikatan buatan UI tak tersimpan. Ada **dua sumber kebenaran**
untuk daftar perikatan (StateDoc vs tabel Prisma) yang tak pernah disinkronkan.

### P0-3 · Jam aplikasi dan tanggal pelaporan dibekukan

- `migration/src/data_clock.ts:23` — `SEED_TODAY = '2026-03-09'`; `data_part4.ts:469` menjadikannya
  `AMS.TODAY`. `AMS.TODAY` dibaca **154 kali di 56 berkas** (non-uji). Tak ada jalur yang
  menimpanya saat produksi: `hydrateCoreFromApi` (`api.ts:402-431`) tak menyentuhnya.
- `migration/src/canon_base.ts:10` — `ASOF_DATE = '2025-12-31'` untuk **semua** perikatan; `ASOF`
  dipakai umur aset (`canon_part1.ts:354`), bulan sewa (`canon_base.ts:223`), operasi dihentikan
  (`canon_part3.ts:57`), dan pemilihan tarif PPh Badan (`canon_base.ts:14`).

**Akibat:** hari ini (25 Nov 2026) aplikasi produksi menghitung jatuh tempo, umur, keterlambatan,
tahun CPE, dan stempel tanggal (68 situs dipindah ke `AMS.TODAY` oleh sapuan K-02) seolah-olah 9 Maret 2026; perikatan FY2026 dihitung
dengan tanggal pelaporan 31 Des 2025.

**Yang sudah BENAR (jangan dirusak):** tanda tangan kertas kerja memakai jam nyata dan diperiksa
terhadap jam server dalam jendela 10 menit (`wp_signoff.tsx:204-206`); `canon_cit.ts` memilih
tarif menurut tanggal dan **memblokir** masa yang tak tercakup. Masalahnya bukan mesinnya, melainkan
tanggal yang disuntikkan ke mesin itu.

### P0-4 · Data demo bocor ke firma nyata saat boot — lalu tertulis permanen

- `app.tsx:309` + `:346` — boot selalu `hydrateCoreFromApi('ENG-2025-014', …)`; untuk firma nyata
  `bootstrap` gagal di `assertEngagementAccess` dan galat **ditelan** (`catch { /* offline */ }`).
  `AMS.FIRM`, `CLIENTS`, `ENGAGEMENTS`, `TEAM`, `WTB` tetap berisi firma demo.
- Bila hidrasi berhasil pun, `api.ts:419, 424, 430` memakai penjaga `&& b.x.length`: firma tanpa
  klien/perikatan/tim **mempertahankan** data demo. Ini kesalahan yang sama dengan yang ditutup
  PR-I untuk WTB (`api.ts:433-447`) — hanya WTB yang diperbaiki.
- `useServerState` pada version 0 mempertahankan nilai awal (`contexts.tsx:776`), dan nilai awal
  `clients`/`engagements` adalah `D.CLIENTS`/`D.ENGAGEMENTS` demo (`contexts.tsx:1054-1055`). Updater
  seperti `addClient` (`list => [{…c}, ...list]`) lalu menulis **daftar demo + entri baru** ke server.

**Akibat:** firma pilot melihat klien PT Sentosa Makmur dkk. sebagai kliennya, dan suntingan pertama
mempersistenkan klien fiktif itu ke basis data produksi firma (setelah P0-1 diperbaiki; hari ini
P0-1 menutupi P0-4 dengan menolak tulisannya).

**Status pengetahuan:** `DEFAULT_ENG_ID` di `app.tsx` tercatat di
`docs/prompts-perbaikan/W2-1-DEFAULT-ENG-ID.md` sebagai "duplikasi — tutup" (peran 3). Yang belum
tercatat: kegagalannya senyap untuk firma non-demo, penjaga `.length` pada tiga koleksi lain, dan
jalur tulis yang mempersistenkan data demo.

### Rekomendasi P0 — satu gerbang dulu, baru perbaikan

Keempat cacat di atas lolos karena **tak ada uji yang memakai firma berbentuk produksi**. Gerbang
pertama yang harus dibangun (dan harus MERAH di master hari ini):

> **e2e "firma segar":** `bootstrapFirm` (id ≠ `FIRM-WHR`) → login admin → undang staf → buat
> klien → buat perikatan → tugaskan staf → staf menulis kertas kerja → muat ulang → nilai terbaca
> kembali; plus pernyataan bahwa nol nama klien demo muncul di layar dan di DB.

Lalu perbaikan, menurut urutan ketergantungan:

| Urutan | Perbaikan | Jenis |
|---|---|---|
| 1 | `FIRM_SCOPE_ID` diturunkan dari `firmId` sesi (`auth.me`/`bootstrap`), bukan konstanta | Perbaikan cacat — tetapi menyentuh kunci cache semua modul ⇒ PRD ringkas dulu |
| 2 | Prosedur `engagement.create` + `engagement.addMember/removeMember` (gate `ENGAGEMENT_MANAGE`, audit) dan satu sumber kebenaran daftar perikatan | Fitur baru ⇒ **PRD** |
| 3 | Hidrasi boot memakai perikatan aktif pengguna / `engagement.list`, bukan literal; koleksi kosong mengosongkan; nilai awal `useServerState` untuk data firma = kosong, bukan seed demo | Perbaikan cacat |
| 4 | Kebijakan jam: jam nyata vs "jam perikatan" (tanggal pelaporan per perikatan dari `Engagement.fy`/tanggal laporan) | **Keputusan produk ⇒ `docs/usulan-*.md`** |

---

## 3 · Keamanan

### H-1 · Batas laju login dapat dilewati (batching tRPC) — dan lockout tidak atomik

- `deploy/aws-ec2-test/Caddyfile:41-51` — zona ketat 5/menit hanya untuk path persis
  `/trpc/auth.login`.
- Batching aktif: server `createHTTPHandler` tanpa `allowBatching:false`/`maxBatchSize`
  (`server/src/server.ts:54`), klien memakai `httpBatchLink` (`migration/src/api.ts:27`).
  Permintaan `/trpc/auth.login,auth.login,…?batch=1` tak cocok dengan zona login dan jatuh ke zona
  umum 60/menit (`Caddyfile:56-63`) — tanpa batas jumlah panggilan per batch.
- Penghitung gagal login baca-lalu-tulis: `router.ts:332-339` membaca `user.failedLogins`, lalu
  menulis `failed+1`. Panggilan paralel dalam satu batch membaca nilai yang sama ⇒ lockout 5-kali
  tidak tercapai.
- Endpoint publik baru #336 (`auth.requestPasswordReset`, `inspectCredentialToken`,
  `completeCredentialToken`, `router.ts:387-510`) juga hanya di zona umum.

**Usul:** limiter di dalam aplikasi untuk prosedur `auth.*` (per IP + per akun), `maxBatchSize`
kecil atau batching dimatikan untuk `auth.*`, dan increment atomik
(`update … data: { failedLogins: { increment: 1 } }` lalu baca hasilnya). **Belum diuji live.**

### H-2 · Pengambilalihan akun antar-Partner tanpa jejak rantai hash

- `users.sendPasswordReset` mengembalikan **tautan reset milik orang lain** ke admin bila email
  tak terkirim/tak dikonfigurasi (`router.ts:904-922`).
- `users.clearTotp` mencabut 2FA siapa pun di firma (`router.ts:927-942`).
- Keduanya hanya `logAuthEvent`, **tanpa `appendAudit`** — berbeda dari `invite`/`setRole`/
  `setActive` yang masuk rantai hash. `clearTotp` bahkan dicatat dengan jenis `'TOTP_ENROLL'`
  (`router.ts:939`), sehingga pencabutan faktor kedua terbaca sebagai pendaftaran.
- `FIRM_ADMIN` dimiliki peran Partner (`migration/src/rbac.ts:99`). Jadi Partner A dapat: reset
  akun Partner B → lepas 2FA-nya → masuk sebagai B → menandatangani sebagai B, termasuk sebagai
  **reviewer EQR**. Pagar SoD tanda tangan (`wpChainSelfReviewBy`) tak dapat membedakannya.

Komentar di `router.ts:800-805` menyebut ini "bukan eskalasi hak". Untuk firma audit, ini memang
eskalasi: ia meruntuhkan pemisahan tugas yang diwajibkan SMM 1/ISQM 1 dan SA 220.

**Yang harus langsung (perbaikan):** `appendAudit` untuk `sendPasswordReset` dan `clearTotp`, jenis
event yang jujur (`TOTP_CLEARED`). **Yang harus diputuskan Ari (usulan):** notifikasi ke pemilik
akun, persetujuan admin kedua, atau larangan tautan-ke-admin untuk akun ber-`OPINION_APPROVE`/`EQR_REVIEW`.

### Keamanan — temuan lebih kecil

| # | Temuan | Bukti | Bobot |
|---|---|---|---|
| S-1 | Oracle waktu pada lupa-sandi: akun dikenal menunggu penerbitan token + kirim SMTP, akun tak dikenal langsung kembali — padahal komentarnya menjanjikan anti-enumerasi | `router.ts:400-428` | Sedang |
| S-2 | Ganti sandi tidak mencabut sesi lain dan tidak masuk rantai audit (jalur reset melakukan keduanya) | `router.ts:512-525` vs `:502-507` | Sedang |
| S-3 | Enumerasi akun via pesan `'account-locked'` (hanya akun nyata yang bisa terkunci) + lockout sebagai DoS terhadap akun mana pun | `router.ts:321-323` | Rendah (trade-off lazim) |
| S-4 | TOTP tanpa perlindungan replay (kode yang sama sah ±90 detik) | `auth/totp.ts:71-80` | Rendah |
| S-5 | Webhook HMAC tanpa stempel waktu/nonce ⇒ dapat diputar ulang (dampak terbatas: sinkronisasi idempoten) | `integrations/webhook.ts:18-30, 52-55` | Rendah |
| S-6 | Pagar firma D3 tidak konsisten: router `roles.*` tak memfilter firma (`router.ts:1106-1107, 1156-1158, 1183-1188`); lampiran scope `user` oleh admin tanpa cek firma (`:271-273, :290`) | — | Laten (single-tenant) |
| S-7 | Issuer authenticator masih `'NeoSuite AMS'` — nama lama tampil di aplikasi 2FA staf | `auth/totp.ts:82` | Kosmetik |

---

## 4 · Kebenaran fungsional (cacat terverifikasi)

| # | Temuan | Bukti | Dampak |
|---|---|---|---|
| **F-1** | Id pengguna = `slug(nama).slice(0,12)`. "Muhammad Rizky Pratama" dan "Muhammad Rizki Saputra" sama-sama `USER-…-MUHAMMADRIZK` (**dijalankan**). Tabrakan P2002 dilaporkan sebagai "email sudah dipakai" | `addUser.ts:47, 74, 107-110`; `router.ts:763` | Staf kedua bernama umum **tak bisa diundang**, dengan pesan galat yang menyesatkan |
| **F-2** | Email peka huruf besar-kecil di login, reset, dan undangan | `router.ts:316, 394`; `addUser.ts:100`; `schema.prisma:62` | Login gagal bila staf mengetik huruf berbeda; dua akun untuk satu orang |
| **F-3** | Id perikatan baru = `'ENG-2025-0' + (len+8)`. Perikatan baru **ke-8** bertabrakan dengan `ENG-2025-022` yang sudah ada (**dijalankan**). Tahun `2025` dan `fy: 'FY2025'` diketik | `contexts.tsx:1114-1120` | Dua perikatan ber-id sama ⇒ kertas kerja klien lain tampil di bawah klien baru |
| **F-4** | Roster `TeamMember` dikunci NAMA, bukan `userId`; `setRole` menghapus semua baris bernama sama | `schema.prisma:289-296`; `router.ts:827` | Dua staf senama saling menghapus dari Capacity Planning |
| **F-5** | Mengarsip ulang menggeser `archivedAt` ⇒ jendela kunci perakitan SA 230 dibuka lagi 60 hari untuk semua pemegang `WP_EDIT`, tanpa tag `OVERRIDE`. Jendelanya juga ditambatkan ke tanggal arsip, bukan tanggal laporan auditor (SA 230 A21) | `router.ts:86, 1045-1055, 249-260` | Berkas terkunci dapat dibuka ulang diam-diam |
| **F-6** | `tasks.mine` mengambil penugasan KK dan tenggat dari **seed demo** selamanya, bukan dari state | `taskAgg.ts:95-104`; `router.ts:1680-1681` | Melengkapi `usulan-M2`: di produksi, dua sumber itu selalu kosong/fiktif |
| **F-7** | `attachment.purge.*` tak punya UI, padahal komentar menyatakan persetujuan dilakukan "in-app"; komentar `api.ts:359` keliru menyebut soft-remove "purges the bytes" | `router.ts:1596-1632`; `api.ts:359` | Retensi bukti hanya bisa dijalankan operator |
| F-8 | `pilotProvision` menyemai kunci berbentuk larik sebagai `{}` — ekspresi `Array.isArray({}[key])` selalu salah; tertolong pembaca defensif | `pilotProvision.ts:149`; ditolerir `personalScope.ts:162`, `personalSelfService.ts:77` | Rendah |
| F-9 | `pilotProvision` menulis dua anggota tim karangan ("Andi Pratama", "Bella Kusuma") ke roster firma pilot — bukan pengguna | `pilotProvision.ts:101-106` | Bertentangan dengan aturan "jangan mengarang data audit" (AGENTS.md §0) |

## 5 · Gap domain (butuh keputusan metodologi — usulan, bukan perbaikan)

**D-1 · PPh Badan hanya satu tarif 22%.** `canon_cit.ts` menyimpan tarif menurut tahun dengan
benar, tetapi tak ada satu pun rujukan ke **Pasal 31E** (pengurangan 50% untuk peredaran bruto
≤ Rp50 M atas bagian s.d. Rp4,8 M), **Pasal 17 ayat (2b)** (pengurangan 3% untuk Tbk memenuhi
syarat), maupun **PP 55/2022** (PPh final UMKM) — grep di seluruh `migration/src` nol hasil.
Tarif dari `canon_base.ts:14` mengalir ke pajak kini, pajak tangguhan PSAK 46, rekonsiliasi tarif
efektif, dan proforma (`data_proforma.ts:133`). Untuk klien UKM — mayoritas klien KAP — beban
pajak kini akan **lebih saji**, dan rekonsiliasi tarif efektif menghasilkan selisih tak terjelaskan.
Pilihan tarif untuk pengukuran pajak tangguhan entitas 31E adalah pertimbangan profesional ⇒
`docs/usulan-*.md`, bukan perubahan sepihak.

## 6 · Pemeriksaan ulang temuan lama (atas `3de574c`)

| Temuan lama | Keadaan sekarang | Vonis |
|---|---|---|
| Tanda tangan `'Hartono Wijaya'` hardcode di `sa200/800/805/810` | Masih ada di keempatnya, ditambah 13 berkas view lain (`view_aje`, `view_opinion_parts`, `view_materiality_parts`, `view_evidence`, …) | **BERLAKU**, lebih luas |
| `decisionBy: 'Linda Wijaya (Manager)'` di `view_final3.tsx` | 5 kecocokan persis (dokumen 29 Ags menulis 11 situs — pola lain mungkin berbeda bentuk) | **BERLAKU** |
| Overlay dirakit tangan | 16 berkas `view_*` dengan `position: 'fixed'` (dulu 13 modul; hitungan berkas ≠ modul) | **BERLAKU** |
| `window.useAmsPersist` di view | 89 situs — tak berubah | **BERLAKU** |
| Literal `'ENG-2025-014'` | 102 kemunculan non-uji | **BERLAKU** (W2-1) |
| `alert(` di view | 4 situs | **BERLAKU** |

## 7 · Yang sudah BENAR — jangan dirusak saat memperbaiki

- **Token kredensial (#336):** hanya SHA-256 tersimpan, klaim atomik `updateMany … usedAt:null`
  + `count===1`, token lama dibatalkan saat terbit yang baru, OTP diperiksa sebelum token dibakar,
  sukses mencabut semua sesi (`auth/credentialToken.ts:42-112`; `router.ts:468-510`).
- **Sesi membaca ulang pengguna tiap permintaan** (`auth/session.ts:27, 35`) ⇒ perubahan peran dan
  penonaktifan berlaku seketika, tanpa cache peran basi.
- **Pagar "admin aktif terakhir"** pada tataran pengguna dan peran (`router.ts:162-177`, `retainsFirmAdmin`).
- **Isolasi perikatan W7.5** fail-closed atas `firmId` (`engagementAccess.ts:41-53, 63-71`).
- **Lampiran:** SHA-256 dihitung ulang di server, kuota, enkripsi at-rest, akses diperiksa terhadap
  scope BARIS bukan klaim pemanggil (`router.ts:1527-1536`).
- **Webhook:** HMAC dengan `timingSafeEqual`; webhook yang ambigu antar-firma melempar, bukan menebak
  (`integrations/webhook.ts:26-30, 58-66`).
- **Jam tanda tangan KK** memakai jam nyata yang diperiksa server (`wp_signoff.tsx:204-206`).
- **Registri tarif PPh Badan** bertanggal dan memblokir masa tak tercakup (`canon_cit.ts:98-131`).

## 8 · Urutan kerja yang disarankan

1. **Gerbang e2e "firma segar"** (§2) — harus MERAH dulu. Tanpanya, perbaikan P0 tak dapat dibuktikan.
2. **P0-1** `FIRM_SCOPE_ID` dari sesi → **P0-4** hidrasi & nilai awal kosong (keduanya membuka jalan
   bagi gerbang di atas menjadi hijau sebagian).
3. **PRD** pembuatan perikatan & keanggotaan (P0-2).
4. **H-1, H-2 (bagian perbaikan), S-2, F-1, F-2** — perbaikan kecil, cakupan jelas, bisa paralel.
5. **Usulan untuk diputuskan Ari:** kebijakan jam (P0-3), pengendalian reset/2FA oleh admin (H-2),
   jendela kunci arsip (F-5), fasilitas PPh Badan (D-1).

Butir 1–2 dan 4 tidak membutuhkan keputusan produk. Butir 3 dan 5 membutuhkan.

---

_Disusun dari pembacaan kode + gerbang yang dijalankan atas `3de574c`. Tidak ada kode yang diubah
dalam evaluasi ini._
