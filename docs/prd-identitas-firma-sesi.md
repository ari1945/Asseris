# PRD — Identitas firma dari sesi: perbaikan P0-1 + P0-4 (firma nyata tak lagi berjalan di atas identitas demo)

| Field | Nilai |
|---|---|
| Status | In Progress — Approved ("Proceed, ikuti rekomendasi" 2026-11-28; Q-1..Q-5 = rekomendasi) |
| Tanggal | 2026-11-28 |
| Pemilik | Ari Widodo |
| Asal | [`EVALUASI-MENYELURUH-2026-11-25.md`](EVALUASI-MENYELURUH-2026-11-25.md) P0-1 & P0-4 · gerbang [`prd-gerbang-firma-segar.md`](prd-gerbang-firma-segar.md) §12–§13 |
| Basis | master `19b79b9` (#400) |
| Tenggat keras | **2026-12-31** — batas karantina tujuh uji gerbang (R-7: karantina tak boleh diam-diam diperpanjang) |

## 1. Problem

Setiap firma selain demo menjalankan aplikasi di atas identitas firma demo `FIRM-WHR` /
`ENG-2025-014`. Gerbang firma segar kini membuktikannya di Postgres nyata (PR #400). Admin firma
hasil `bootstrap` melihat "KLIEN AKTIF: Sentosa Makmur Tbk · ENG-2025-014", portofolio 6
perikatan demo, dan antrean EQR firma demo. Klien yang ia buat tidak pernah sampai ke server.

Akar masalahnya ada empat, dan semuanya terverifikasi di master `19b79b9`:

| # | Cacat | Bukti |
|---|---|---|
| A1 | Lingkup firma dipaku: `FIRM_SCOPE_ID = 'FIRM-WHR'` dipakai `FirmProvider`, `useAmsPersist`, baca-lewat firma, segel ekspor, DMS, dan pembaca canon | `persist_scope.ts:22`; pemakai `contexts.tsx:786, :931, :1054, :1055` · `export_identity.ts:134` · `view_dms.tsx:295` · `persist_scope.ts:79` |
| A2 | Frontend **tidak punya cara mengetahui `firmId` sesinya**. `auth.me`/`auth.login` tak memuat `firmId`, dan bundel `bootstrap` tak memuat `firm.id` | `router.ts:110-111` (`publicUser`), `router.ts:1302-1305` (select firm tanpa `id`) |
| A3 | Hidrasi dipaku ke perikatan demo, dan galatnya ditelan. Firma tanpa perikatan **tak bisa** memanggil `bootstrap` sama sekali, karena input mewajibkan `engagementId` dan `assertEngagementAccess` menolaknya | `app.tsx:309, :346` · `router.ts:1281, :1285` |
| A4 | Bundel kosong tak menimpa data demo: penjaga `.length` membuat `clients: []` mempertahankan 8 klien demo; `useServerState` version 0 mempertahankan nilai awal demo | `api.ts:419, :424, :430` · `contexts.tsx:776, :1054-1056` |

Plus dua cacat yang ditemukan gerbang Fase 2 (PRD gerbang §13). Keduanya akan langsung menggigit
begitu A1–A4 ditutup:

| # | Cacat | Bukti |
|---|---|---|
| A5 | Formulir klien dan perikatan memaku orang dan angka demo: partner "Hartono Wijaya, CPA", pilihan partner/manajer demo, tenggat 2026-04-30, materialitas Rp 2 M | `view_firm.tsx:224, :235, :489, :523-524` |
| A6 | `ClientCRM` membaca `clients[0].id` tanpa penjaga, sehingga firma tanpa klien crash di Direktori Klien | `view_firm.tsx:23, :31` |

Dan satu kelas yang muncul ketika firma tidak punya perikatan aktif (A3 ditutup ⇒ keadaan ini
jadi NYATA, bukan lagi tertutup data demo):

| # | Cacat | Bukti |
|---|---|---|
| A7 | 17 situs hidup `firm?.activeEngagement?.id \|\| 'ENG-2025-014'`, sebagian di jalur tulis/segel; plus default `activeEng` dan `useAmsPersist` ke `DEFAULT_ENG_ID` | `attachment_scope.ts:8` · `view_clientportal.tsx:301` · `view_psak71.tsx:358` · `view_sa701.tsx:32` · `view_sa705.tsx:55` · `view_sa710.tsx:72` · 11 label lain (`view_sa2comm.tsx:76,368,571`, `view_sa240/530/540`, `view_icfr`, `view_goingconcern`, `view_serviceorg`, `view_specifics2`, `view_evidence`) · `contexts.tsx:930, :1056` · `view_newdisc.tsx:59, :73`. Sensus lama: [[asseris-eng-fallback-kelas-tulis]] |

**Yang sudah benar (jangan dirusak):** server sudah menolak tulisan lintas-firma (`stateAccess.ts:107`,
uji D3 `stage1_data_isolation.test.ts:281-307`). Karena itu belum ada data demo yang tertulis ke DB
firma nyata. Tanda tangan KK sudah memakai jam nyata (`wp_signoff.tsx:204`). Identitas pengguna di
TopBar sudah berasal dari sesi (`contexts.tsx:1038-1039`). `userScopeId()` (`contexts.tsx:425`) adalah
kode mati: `AMS_PERSIST_SCOPE` tidak memuat satu pun kunci `'user'`. Ia boleh dihapus, tetapi bukan cacat.

## 2. Objective

Firma mana pun yang dibuat lewat `bootstrap` melihat dan menulis **hanya** datanya sendiri sejak
login pertama, tanpa mengubah satu pun perilaku firma demo.

## 3. Success Criteria

| # | Kriteria | Bukti |
|---|---|---|
| SC-1 | Enam uji karantina berbalik dari `test.fail`/`it.fails` menjadi `test`/`it` biasa, dan **hijau**: Fase 1 G1-a, G1-c, G1-d; Fase 2 langkah 1, 2, 5 | `fresh_firm_gate.test.ts`, `e2e/tests/09-fresh-firm.spec.ts` |
| SC-2 | Langkah 3 (P0-2) **tetap** `test.fail` dan tetap merah karena P0-2. PRD ini tak boleh membuatnya hijau secara kebetulan | jalan CI e2e |
| SC-3 | Firma demo tidak berubah: e2e 01–08 (22 uji) hijau, `npm run verify` hijau, snapshot canon tidak berubah | CI |
| SC-4 | Firma segar dapat membuka Beranda, Direktori Klien, Manajemen Perikatan, dan Pengaturan **tanpa** error boundary, dengan nol klien dan nol perikatan | prasyarat/uji baru di spek 09 |
| SC-5 | Tiap perbaikan punya uji unit yang **merah dulu** di master sebelum diperbaiki (AGENTS §0) | catatan eksekusi |
| SC-6 | Nol literal `'FIRM-WHR'` dan nol fallback `\|\| 'ENG-2025-014'` di jalur produksi `migration/src`. Literal yang tersisa hanya di data demo (`data_part*.ts`) dan uji; dipaku gerbang statik | gerbang baru |

## 4. Scope

**PR-A — server: sesi memberi tahu firmanya (kecil, aditif)**
- `publicUser` menambah `firmId` (dipakai `auth.me` & `auth.login`). Ini bukan data rahasia, karena
  `firmId` sudah melekat di setiap baris yang boleh dibaca pengguna.
- `bootstrap`: `engagementId` menjadi **opsional**. Tanpa `engagementId`, bundel tingkat firma
  (firm, users, team, clients, engagements) tetap dikirim, sedangkan `wtb`/`states` perikatan
  dikosongkan. Bundel memuat `firm.id`.

**PR-B — frontend: identitas dari sesi, hidrasi jujur, formulir bersih**
- `FIRM_SCOPE_ID` konstanta → fungsi/konteks yang membaca `firmId` sesi (A1). Semua pemakai di
  tabel A1 dialihkan. Pembaca canon (`readPersisted`) menerima firmId dari sumber yang sama.
- `Root.enter` (`app.tsx:346`) menghidrasi perikatan yang **boleh diakses pengguna**. Urutannya:
  perikatan aktif terakhir (`activeEng`, bila masih dapat diakses), lalu perikatan pertama
  `engagement.list`, lalu **tanpa perikatan**. Galat hidrasi sesudah login menjadi layar galat
  dengan tombol "Coba lagi", **bukan** data demo (A3).
- `hydrateCoreFromApi` menimpa `CLIENTS/ENGAGEMENTS/TEAM` tanpa syarat ketika bundel datang dari
  server, termasuk ketika bundelnya kosong (A4). Nilai awal `useServerState` untuk kunci inti
  otomatis menjadi data server, karena `FirmProvider` dipasang **sesudah** hidrasi.
- Formulir klien/perikatan (A5): pilihan partner/manajer berasal dari pengguna firma (bundel `users`,
  menurut peran), tanpa nilai awal karangan. Tenggat dan materialitas kosong sampai diisi.
  Materialitas tetap SSOT Materiality Workspace (AGENTS §3.2).
- `ClientCRM` aman untuk nol klien: keadaan kosong + tombol "Klien Baru" (A6).

**PR-C — keadaan "tanpa perikatan aktif" sebagai keadaan kelas-satu (A7)**
- Satu penjaga di tingkat shell untuk rute ruang kerja perikatan. Bila tak ada perikatan aktif, ia
  menampilkan keadaan kosong ("Belum ada perikatan — buat di Manajemen Perikatan"), bukan modulnya.
- 17 situs fallback dicabut. Jalur tulis/segel tak lagi punya scopeId cadangan. Label menampilkan
  "—" atau tidak dirender.
- `activeEng` dan `useAmsPersist` tidak lagi bernilai default `DEFAULT_ENG_ID`.
- Gerbang statik SC-6 (pola `persist_scope`/`css_tokens` yang ada) memaku nol literal demo di
  jalur produksi, dengan **membuang komentar** dulu (pelajaran [[asseris-sales-pipeline-arc]]).

## 5. Non-Scope

- **P0-2** (API pembuatan perikatan & keanggotaan) — PRD terpisah. Konsekuensinya: sesudah PRD
  ini, firma segar dapat membuat **klien** yang tersimpan (StateDoc `clients`), tetapi perikatan
  yang dibuat lewat UI tetap belum dikenal server (langkah 3 tetap merah — SC-2).
- **SSOT ganda klien/perikatan.** Klien dan perikatan hidup sebagai StateDoc firma (`contexts.tsx:1054-1055`)
  DAN sebagai tabel Prisma (`bootstrap`, `engagement.list`). Menyatukannya adalah keputusan desain
  P0-2. PRD ini tidak memilih salah satunya.
- **P0-3** (jam beku `SEED_TODAY`) — usulan kebijakan terpisah.
- Mengubah seed demo, data `data_part*.ts`, atau perilaku firma demo.
- `integrations/sync.ts` (sudah diperbaiki, `EVALUASI-SAAS-2026-08-31.md`).

## 6. Constraints

- R-7: `master` selalu hijau. Tiap PR membalik karantina yang ia tutup **di PR yang sama**.
  `it.fails` yang lulus karena perbaikan akan memerah dengan sendirinya (SC-3 gerbang).
- Urutan **mengikat**: PR-B tidak boleh menutup A1 tanpa A4 dan A5. Kalau A1 ditutup sendirian,
  tulisan yang selama ini ditolak server mulai **diterima**, dan tulisan pertama memuat 8 klien demo
  (G1-d) serta partner demo, kini benar-benar masuk ke DB firma nyata (PRD gerbang §9).
- Kontrak kawat tRPC hanya bertambah (`firmId`, `engagementId` opsional). Klien lama tetap jalan.
- `migration/src/**` CRLF; uji bebas-`any`; ratchet `:any` (AGENTS §8).
- Postgres lokal tak punya kredensial e2e yang tercatat, jadi e2e dibuktikan lewat CI PR (pola #400).

## 7. Existing Solutions

- Gerbang sudah ada dan sudah terbukti merah: `fresh_firm_gate.test.ts` (unit, detik) dan spek 09
  (e2e, Postgres). PRD ini **tidak** menulis gerbang baru untuk P0 yang sama. Ia membalik karantina.
- `useServerState` sudah menerima `scopeId` sebagai parameter. A1 cukup mengganti sumber nilainya,
  bukan mekanismenya.
- `engagement.list` sudah difilter server menurut akses (W7.5), sehingga pemilihan perikatan
  hidrasi memakai sumber yang sama dengan switcher TopBar.
- `bootstrapFirm` sudah membuat 6 baris `Role` dan Partner-admin, jadi firma segar valid secara RBAC.
- **Tidak ada migrasi data.** Tidak ada data server yang perlu dipindahkan: setiap tulisan firm-scope
  firma non-demo selama ini ditolak `cross-firm-state`. Cache peramban `ams.v1.firm.FIRM-WHR.*`
  milik firma non-demo dibiarkan hangus, searah dengan keputusan [[asseris-migrasi-lingkup-hangus]].

## 8. Proposed Approach

**Pilihan desain utama — dari mana frontend mengambil `firmId`:**

| Opsi | Kelebihan | Kekurangan |
|---|---|---|
| **A — `auth.me`/`auth.login` memuat `firmId`** ✅ | Tersedia sebelum hidrasi dan bahkan bila hidrasi gagal; satu sumber = sesi; aditif | Menyentuh `publicUser` (2 pemanggil: `router.ts:364, :367`) |
| B — hanya `bootstrap` memuat `firm.id` | Satu prosedur | Lingkup firma tak dikenal saat hidrasi gagal, sehingga mendorong fallback baru |
| C — turunkan dari id pengguna (`USER-<SLUG>-ADMIN`) | Tanpa perubahan server | Menebak; rusak untuk pengguna undangan (`addUser.ts`) |

Rekomendasi: **A**, ditambah `firm.id` di bundel untuk konsistensi.

**Pilihan desain kedua — galat hidrasi sesudah login:** layar galat dengan "Coba lagi" (✅).
Alternatifnya, data demo sebagai "mode offline", **ditolak**. Sesudah login, server terbukti
terjangkau (`auth.me` baru saja menjawab), jadi galat hidrasi adalah galat, bukan offline.
Menampilkan data demo di sini adalah P0-4 itu sendiri.

**Pilihan desain ketiga — firma tanpa perikatan aktif (PR-C):** penjaga **tingkat shell** (✅)
vs penjaga per modul. Ada ±200 modul. Penjaga per modul berarti 200 tempat untuk lupa, sedangkan
penjaga shell adalah satu tempat dan gerbang statik SC-6 memastikan tak ada fallback yang tersisa.

## 9. Risks

| Risiko | Mitigasi |
|---|---|
| Modul yang diam-diam bergantung pada `AMS.CLIENTS/TEAM` berisi (mis. `clients[0]`) crash untuk firma kosong | SC-4 + sensus `\[0\]` atas koleksi inti sebelum PR-B; penjaga shell PR-C |
| Firma demo berubah perilaku karena hidrasi kini memilih perikatan dari `engagement.list` | User demo terakhir di `activeEng` atau perikatan pertama yang dapat diakses = `ENG-2025-014` untuk Anindya. E2E 01–08 menjadi pembuktinya (SC-3) |
| Canon (`readPersisted`) membaca tier firma sebelum `firmId` diketahui (modul non-React) | firmId disetel sekali di titik yang sama dengan hidrasi, sebelum `<App>` dipasang; uji unit urutan boot |
| Langkah 3 berbalik hijau tanpa sengaja | SC-2. Bila terjadi, berarti SSOT ganda menyembunyikan sesuatu, jadi **berhenti** dan laporkan, jangan rayakan |
| Tenggat 2026-12-31 terlewati | PR-A kecil dan dapat mendarat lebih dulu. PR-B adalah inti yang menutup SC-1. PR-C boleh menyusul dengan karantina langkah yang ia tutup diperpanjang **tertulis** |

## 10. Implementation Plan

| PR | Isi | Membalik karantina | Butuh |
|---|---|---|---|
| A | `publicUser.firmId`; `bootstrap` `engagementId` opsional + `firm.id`; uji server merah-dulu | — | "Proceed." |
| B | A1, A3, A4, A5, A6 | G1-a, G1-c, G1-d, langkah 1, 2, 5 | PR-A mendarat |
| C | A7 + gerbang statik SC-6 + prasyarat SC-4 | — (memaku keadaan kosong) | PR-B mendarat |

Tiap PR: uji merah-dulu → perbaikan → `npm run verify` → PR → CI (e2e) hijau → merge squash.

## 11. Open Questions

- **Q-1** — Setuju `firmId` diambil dari sesi (`auth.me`, Opsi A §8)? *Rekomendasi: ya.*
- **Q-2** — Setuju galat hidrasi sesudah login menjadi layar galat, bukan data demo? *Rekomendasi: ya.*
- **Q-3** — Setuju keadaan tanpa perikatan ditangani penjaga tingkat shell (PR-C)? *Rekomendasi: ya.*
- **Q-4** — Formulir klien: pilihan partner diambil dari pengguna firma berperan Engagement Partner.
  Firma segar hanya punya satu (admin bootstrap). Bolehkah partner **kosong** saat membuat klien
  (diisi kemudian), atau wajib dipilih? *Rekomendasi: wajib dipilih — admin bootstrap selalu ada
  sebagai pilihan, jadi tidak pernah buntu, dan "klien tanpa partner penanggung jawab" bukan
  keadaan yang sah untuk KAP.*
- **Q-5** — PR-A sampai PR-C dikerjakan di sesi ini satu per satu, atau PR-C dipecah ke sesi terpisah sesudah
  PR-B mendarat? *Rekomendasi: berurutan di sini; PR-C bergantung pada keadaan kosong yang baru
  ada sesudah PR-B.*

## 12. Keputusan (2026-11-28)

Ari: **"Proceed, ikuti rekomendasi"**. Q-1 = `firmId` dari sesi (`auth.me`). Q-2 = galat hidrasi sesudah login
menjadi layar galat + "Coba lagi". Q-3 = penjaga tingkat shell. Q-4 = partner **wajib** dipilih saat
membuat klien, dari pengguna firma. Q-5 = PR-A → PR-B → PR-C berurutan di sesi ini.

## 13. Catatan eksekusi

### PR-A (server) — 2026-11-28

- Uji baru `server/src/__tests__/session_firm_identity.test.ts` (7 uji), **merah dulu** atas `19b79b9`:
  6 gagal / 1 lulus. Yang lulus adalah uji akses yang *dipertahankan* (bundel ber-`engagementId`
  tetap FORBIDDEN lintas firma & non-anggota), memang harus hijau di kedua sisi. Pesan merahnya:
  `expected undefined to be 'SFI-FIRM-FRESH'` (`auth.me` tanpa `firmId`), `firm.id` undefined, dan
  `ZodError … engagementId expected string, received undefined` (firma tanpa perikatan tak bisa hidrasi).
- Perbaikan `server/src/router.ts`: `publicUser` memuat `firmId`; `bootstrap.engagementId` opsional.
  Tanpa `engagementId`, prosedurnya memanggil `assertFirmScoped` (tetap `firm-unresolved` gagal-tertutup),
  dan `wtb`/`states` tidak di-query. Select firm memuat `id`.
- Hasil: 7/7 hijau; suite server 35 berkas / 518 uji hijau; `tsc` migration bersih (kontrak hanya bertambah).
