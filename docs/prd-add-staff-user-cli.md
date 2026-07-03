# PRD — CLI Penambahan Staf Pasca-Bootstrap (`addUser`)

> Wajib diisi sebelum implementasi apa pun. Implementasi TIDAK dimulai sebelum ada sign-off ("Proceed.").

| Field | Isi |
|---|---|
| Tanggal | 2026-07-03 |
| Pemilik | Ari Widodo |
| Status | **Implemented** — seluruh Fase 1-5 dieksekusi & live-verified thd stack Docker lokal (Postgres nyata, `assertProdConfig` aktif) 2026-07-03. |
| Engagement ID terkait | — (infra/deploy-readiness, bukan engagement klien) |
| Asal temuan | Ditemukan saat menulis `docs/PILOT-ONBOARDING-PLAN.md` (sesi sebelumnya) — dicatat di sana §1.1 sebagai prasyarat teknis, di-spawn sebagai task terpisah (`task_b7e55f6e`), sekarang dikerjakan lewat PRD ini (bukan langsung kode, sesuai instruksi eksplisit Anda). |

## 1. Problem
Dikonfirmasi lewat pembacaan kode langsung (bukan asumsi):
- `server/src/bootstrapFirm.ts` membuat **TEPAT SATU** Firm + **SATU** Partner-admin pada DB
  kosong, dan **MENOLAK** berjalan lagi begitu ada firma (`bootstrapFirm.ts:34-40`) — sengaja,
  supaya tak pernah menimpa data pilot yang sudah berjalan.
- `server/src/seed.ts` adalah satu-satunya jalur lain pembuatan user, tapi **destruktif**
  (menghapus 11 tabel) dan fail-closed di `NODE_ENV=production` — tak bisa dipakai begitu ada
  data klien nyata.
- `server/src/router.ts` di-grep untuk prosedur `user.create`/invite/tambah-pengguna — **nihil**.
  Tak ada jalur tRPC (dan karenanya tak ada jalur UI) untuk menambah user.

**Konsekuensi nyata**: firma pilot dengan >1 staf (mis. 1 Partner + 1 Manager + 2 Senior + 1
Junior + 1 Admin&HR + 1 Finance) **tidak punya cara resmi** membuat 6 akun staf setelah Partner
pertama dibuat via `bootstrap`. Satu-satunya jalan saat ini adalah insert manual ke tabel `User`
(Prisma Studio/SQL langsung) — rawan salah (hash password harus persis format
`scrypt$<N>$<r>$<p>$<saltB64>$<hashB64>` dari `auth/password.ts`, gampang keliru manual), tanpa
validasi seperti yang sudah ada di `bootstrapFirm.ts` (panjang password, dsb.), dan tak scalable
untuk lebih dari beberapa firma pilot.

## 2. Objective
Sediakan **satu perintah CLI** (`npm run add-user`, pola identik `npm run bootstrap`) yang
menambahkan **satu staf** ke firma yang **sudah ada**, aman (password ter-hash benar, validasi
peran & panjang password, opsional TOTP), dan tak menimpa/merusak data yang sudah ada.

## 3. Success Criteria
1. `npm run add-user` dengan env var lengkap (mirip `bootstrap.ts`) berhasil membuat SATU baris
   `User` baru pada firma yang **sudah ada**, dengan password ter-hash lewat `hashPassword()` yang
   SAMA persis dipakai `bootstrapFirm.ts` (bukan implementasi hash terpisah).
2. **Menolak** (exit 1, pesan jelas) bila: firma dengan `FIRM_ID` yang diberikan **tidak ada**
   (kebalikan pengecekan `bootstrapFirm.ts` yang menolak bila firma SUDAH ada); `ROLE` bukan
   salah satu dari `ROLES` (`rbac.ts:21`, SSOT — bukan daftar hardcode terpisah); `EMAIL` sudah
   dipakai user lain (constraint unik `email` di schema, `schema.prisma:39`); `PASSWORD` <12
   karakter (ambang sama `bootstrapFirm.ts:41-43`).
3. Konsisten dengan guard M2: `addUserCli.ts` memanggil `assertProdConfig` SEBELUM menulis DB —
   pola identik `bootstrap.ts:27-33` (skrip ini bisa menulis TOTP secret, sama sensitifnya).
4. Opsional TOTP (`ENROL_TOTP=0` untuk skip) — pola identik `bootstrapFirm.ts` (`enrolTotp`).
5. Test unit (pola sama `bootstrapFirm.ts` — pure function, DB di-mock) mencakup: sukses (peran
   audit & peran firm-ops), tolak firma tak ada, tolak peran tak dikenal, tolak email duplikat
   (P2002), tolak password pendek, TOTP opsional on/off.
6. `docs/PILOT-ONBOARDING-PLAN.md` §1.1 diperbarui: opsi A tak lagi "direkomendasikan, belum
   dibangun" — jadi instruksi konkret cara pakai skrip ini.

## 4. Scope
- **`server/src/addUser.ts`** — logika MURNI (pola persis `bootstrapFirm.ts`: fungsi `addUser(db,
  input)`, tak menyentuh `window`/proses/env, testable dgn DB di-mock):
  - Input: `{ firmId: string; user: { id?, name, email, password, role, initials? }; enrolTotp?: boolean }`.
  - Validasi urutan: (a) firma dgn `firmId` HARUS ada (`db.firm.findUnique`) — lempar error jelas
    bila tidak; (b) `role` HARUS ada di `ROLES` (`rbac.ts`) — lempar error jelas bila tidak; (c)
    panjang password ≥12 karakter (sama `bootstrapFirm.ts:41-43`).
  - Hash password via `hashPassword()` (`auth/password.ts`, REUSE — jangan implementasi ulang).
  - TOTP opsional via `generateSecret()`/`otpauthUrl()`/`encryptSecret()` (`auth/totp.ts`,
    `crypto/secretbox.ts` — REUSE persis pola `bootstrapFirm.ts:49-57`).
  - Tangani email duplikat: tangkap `Prisma.PrismaClientKnownRequestError` kode `P2002` (pola
    sama `isUniqueViolation()` di `router.ts:55-57`) → lempar pesan jelas "email sudah dipakai",
    bukan stack trace Prisma mentah.
  - `dataJson: '{}'` — mirror `bootstrapFirm.ts` (envelope minimal admin pertama), BUKAN envelope
    kaya `seed.ts` (itu utk data demo, beda kebutuhan).
  - **Untuk 4 peran audit** (Engagement Partner/Audit Manager/Senior Auditor/Junior Auditor):
    turut membuat SATU baris `TeamMember` (`name`, `role`, `util: 0`) — supaya staf baru langsung
    muncul di Capacity Planning/Resource Scheduler, bukan "bisa login tapi tak kelihatan di
    roster". **Untuk Admin & HR Firma/Finance Firma: TIDAK** — mirror keputusan `rbac.ts:15-20`
    yang sengaja mengecualikan 2 peran ini dari `AMS.STAFF`/`AMS.TEAM` (roster audit-staffing).
- **`server/src/addUserCli.ts`** — wrapper CLI (pola persis `bootstrap.ts`): baca env var
  (`FIRM_ID`, `USER_NAME`, `USER_EMAIL`, `USER_PASSWORD`, `USER_ROLE`, opsional `USER_ID`,
  `USER_INITIALS`, `ENROL_TOTP=0` utk skip) → `loadSecretsIntoEnv()` → `assertProdConfig()` →
  panggil `addUser()` → cetak hasil (mirror format output `bootstrap.ts:53-61`, termasuk
  peringatan TOTP one-time-display bila diaktifkan + saran "staf ganti password saat login
  pertama").
- **`server/package.json`**: tambah `"add-user": "tsx src/addUserCli.ts"` (baris baru,
  bersebelahan `"bootstrap": "tsx src/bootstrap.ts"` — konvensi sama).
- **Update `docs/PILOT-ONBOARDING-PLAN.md` §1.1**: ganti deskripsi Opsi A dari usulan → instruksi
  pakai nyata (`npm run add-user` dgn contoh env var lengkap, mirror `docs/DEPLOY.md` §4 utk
  `bootstrap`).
- **Test**: `server/src/__tests__/addUser.test.ts` — pola sama `bootstrapFirm.test.ts` (kalau
  ada) atau pola test lain di `__tests__/` (DB Prisma di-mock via `vi.fn()`/objek pengganti).

## 5. Non-Scope
- **UI "Tambah Pengguna" di dalam aplikasi** — CLI operator SAJA (sama filosofi `bootstrap`).
  Kandidat PRD terpisah bila nanti dibutuhkan self-service oleh Partner lewat browser.
- **Auto-assign ke `EngagementMember`** — menambah user TIDAK berarti otomatis jadi anggota
  perikatan mana pun. Itu tetap keputusan terpisah lewat modul **Engagement Mgmt** yang sudah
  ada — user baru login lalu Manager/Partner menugaskan ke perikatan via jalur normal.
- **Reset password / lupa password self-service** — gap terpisah (dicatat di
  `docs/USER-GUIDE.md` §7 FAQ sbg keterbatasan saat ini), bukan bagian PRD ini.
- **Impor massal (CSV banyak user sekaligus)** — satu user per pemanggilan, mirror kesederhanaan
  `bootstrap` (satu firma per pemanggilan). YAGNI sampai ada firma pilot besar yang benar-benar
  butuh ini.
- **Ubah/nonaktifkan user yang SUDAH ada** — PRD ini murni "tambah", bukan "kelola" user
  (update role, suspend akun, dsb.) — kandidat PRD terpisah.

## 6. Constraints
- Harus reuse HELPER YANG SUDAH ADA (`hashPassword`, `generateSecret`/`otpauthUrl`,
  `encryptSecret`, `ROLES`) — TIDAK menduplikasi logika kriptografi/validasi peran.
- Konsisten konvensi CLI berbasis ENV VAR (bukan `--flag=value` argv) — **catatan: usulan awal
  task ini menyebut sintaks `npm run add-user -- --email=...`, TAPI `bootstrap.ts` (pola yang
  SEHARUSNYA ditiru persis) memakai env var, bukan argv flags. PRD ini SENGAJA mengikuti pola
  env var yang sudah established di repo, bukan usulan argv — perbedaan dari deskripsi awal
  dicatat di sini secara eksplisit (No Silent Assumptions), bukan diam-diam diubah.**
- Skrip tetap harus lolos `assertProdConfig` sebelum menulis — tak boleh jadi jalur pintas yang
  melewati guard M2 (pola sama isu yang DITEMUKAN & DIPERBAIKI utk `bootstrap.ts` sendiri,
  lihat memory `asseris-deploy-readiness` sesi merge PR#43 — jangan mengulang kelas bug itu).

## 7. Existing Solutions
- `server/src/bootstrapFirm.ts` + `server/src/bootstrap.ts` — pola PERSIS yang ditiru (pure
  logic + CLI wrapper, guard urutan, TOTP opsional, output format).
- `server/src/auth/password.ts` (`hashPassword`/`verifyPassword`), `server/src/auth/totp.ts`
  (`generateSecret`/`otpauthUrl`), `server/src/crypto/secretbox.ts` (`encryptSecret`) — REUSE,
  jangan reimplementasi.
- `server/src/router.ts:55-57` (`isUniqueViolation`) — pola deteksi P2002 yang ditiru (fungsi
  lokal serupa di `addUser.ts`, atau — lebih baik — di-export dari `router.ts` dan diimpor
  bersama supaya SATU implementasi, bukan dua salinan; keputusan lokasi di Implementation Plan).
- `migration/src/rbac.ts` (`ROLES`) — SSOT daftar peran, diimpor bukan diduplikasi.

## 8. Risks
- **Password sementara dikirim lewat env var CLI** — sama seperti `bootstrap.ts` (`ADMIN_PASSWORD`
  sudah begitu) — risiko terekam shell history/log operator. Mitigasi sama seperti prosedur
  `bootstrap` yang sudah ada (operator disiplin, sudah didokumentasikan sbg tanggung jawab
  operator, bukan hal baru yang PRD ini perkenalkan).
- **Operator salah `FIRM_ID`** — menambah staf ke firma yang salah (kalau suatu saat instance ini
  benar-benar dipakai multi-firma, meski model bisnis saat ini single-tenant per instance jadi
  risiko ini rendah dalam praktiknya — satu instance = satu firma = satu `FIRM_ID` yang jelas).
  Mitigasi: `addUserCli.ts` mencetak nama firma (bukan cuma ID) sebelum menulis, sebagai
  konfirmasi visual bagi operator.
- **Lupa jalankan `assertProdConfig`** (kelas bug yang PERNAH terjadi nyata di `bootstrap.ts`,
  ditemukan peer-review pra-push PR#43) — mitigasi: WAJIB diverifikasi ada di code review PRD
  ini sebelum merge, dicantumkan eksplisit di Success Criteria #3 supaya tak terlewat lagi.

## 9. Implementation Plan
| Fase | Isi | Bukti keberhasilan |
|---|---|---|
| 1 | `server/src/addUser.ts` (pure) — validasi firma-ada/peran-valid/password-panjang, hash+TOTP reuse, tangani P2002, buat `User`+`TeamMember` (peran audit saja) | Unit test: sukses (audit+firm-ops), 4 jalur tolak (§Success Criteria #2), TOTP on/off |
| 2 | `server/src/addUserCli.ts` — env var → `loadSecretsIntoEnv` → `assertProdConfig` → `addUser()` → output (mirror `bootstrap.ts`) | Jalan manual lokal thd DB dev (SQLite), user baru bisa login |
| 3 | `server/package.json` script `add-user` | `npm run add-user` dari root server/ bekerja |
| 4 | Update `docs/PILOT-ONBOARDING-PLAN.md` §1.1 — ganti usulan jadi instruksi pakai nyata + contoh env var lengkap | Baca ulang §1.1, alur end-to-end masuk akal bagi operator baru |
| 5 | Live-verify: jalankan thd stack Docker lokal (`asseris-test-*`, yang sudah ada dari sesi sebelumnya) — tambah 1 staf per peran (6 total), login masing-masing sukses, cek staf audit muncul di Capacity Planning | Login sukses 6/6, roster tampil benar |

## 10. Open Questions
1. **Lokasi `isUniqueViolation`-setara** — export dari `router.ts` & impor bersama (SATU
   implementasi), atau duplikasi fungsi kecil lokal di `addUser.ts` (isolasi lebih tinggi, tapi
   dua salinan logika yang identik)? Saya usulkan **export & impor bersama** (DRY, fungsi ini
   sudah teruji tak berubah sejak dipakai `state.set`).
2. **`TeamMember.util` awal** — `0` (belum ada penugasan) sudah masuk akal sbg default, atau ada
   preferensi nilai lain (mis. field ini dipakai perhitungan Capacity Planning yang mungkin
   sensitif terhadap 0 vs null)? Saya usulkan tetap `0` (default schema), konsisten pola yang
   sudah ada.

---
Balas **"Proceed."** untuk mulai implementasi (Open Questions di atas dijalankan dgn default
yang saya usulkan bila tak dijawab eksplisit, dicatat di §11a setelah implementasi — pola sama
PRD-PRD sebelumnya).

## 11a. Keputusan diambil pada implementasi (Ari menjawab "Proceed." tanpa menjawab §10 satu-satu)

Kedua Open Question dijalankan dengan default yang diusulkan (tak dijawab eksplisit sebelum
"Proceed."), dicatat di sini per aturan "No Silent Assumptions" — keduanya mudah diubah kalau
Anda ingin lain:
1. **`isUniqueViolation`**: TIDAK di-export dari `router.ts` — dibuat salinan lokal kecil (4
   baris) di `addUser.ts` sendiri. Alasan berubah dari usulan awal: `addUser.ts` sengaja
   dijaga tanpa dependensi ke `router.ts` (yang jauh lebih besar & berisi seluruh permukaan
   tRPC) — pola yang sama seperti `bootstrapFirm.ts` yang juga berdiri sendiri tanpa impor dari
   `router.ts`. Duplikasi 4 baris dianggap lebih murah daripada kopling baru ke file besar.
2. **`TeamMember.util` awal**: tetap `0` (default schema), sesuai usulan.

**Verifikasi aktual**:
- Unit test baru (`server/src/__tests__/addUser.test.ts`, 9 test) — sukses peran audit (+
  `TeamMember` ikut terbuat) & peran firm-ops (TeamMember TIDAK terbuat), 4 jalur tolak (firma
  tak ada/peran tak dikenal/password pendek/email duplikat via P2002 asli), TOTP on/off, id
  override. **Semua 9 lulus.**
- Gate penuh server: `npm run typecheck` (0 error) + `npm test` — **238/238 test lulus**
  (229 sebelumnya + 9 baru), nol regresi.
- **Live-verify thd stack Docker lokal SUNGGUHAN** (bukan cuma mock) — image `server` di-rebuild
  (`docker compose ... build server`) supaya memuat kode baru, container di-recreate, cap
  t3.small diterapkan ulang. Dijalankan `npm run add-user` (lewat `docker compose run --rm -e
  ...`) untuk **6 peran** (Partner/Manager/Senior/Junior/Admin&HR/Finance) thd firma demo nyata
  (`FIRM-WHR`, Postgres asli, `NODE_ENV=production`, `assertProdConfig` AKTIF — bukan dilewati).
  **6/6 berhasil dibuat**, `assertProdConfig` tak memblokir (kunci enkripsi sudah valid dari
  sesi sebelumnya). **6/6 login berhasil** (diverifikasi via `bench.mjs login`, skrip dari PRD
  performa sesi sebelumnya — dipakai ulang, bukan alat baru). Query SQL langsung ke Postgres
  mengonfirmasi: **`TeamMember` dibuat PERSIS untuk 4 peran audit, NOL untuk Admin&HR/Finance**
  — sesuai desain.
- **Dibersihkan setelah verifikasi** (Session/AuthEvent/TeamMember/User milik 6 akun uji
  dihapus via SQL langsung, urutan mengikuti FK: Session→AuthEvent→TeamMember→User) — jumlah
  `User` kembali ke 7 (baseline seed demo), tak mencemari data demo untuk sesi berikutnya.

**Sign-off:** ditandai dengan balasan **"Proceed."** — DITERIMA (2026-07-03).
