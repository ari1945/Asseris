# PRD — W7 · Auth, Sesi & RBAC (NeoSuite AMS)

> Wajib sign-off ("Proceed.") sebelum implementasi.
> Acuan: `Evaluasi NeoSuite AMS - Kesiapan Pengembangan Claude Code.html` §07 (W7·1 "Login nyata
> + peran ditegakkan"); `Evaluasi NeoSuite AMS - Desain & Prototipe.html` §06 (Autentikasi = profil
> mock; Otorisasi RBAC = tampilan saja → P1 backend+RBAC). Lanjutan **Fase B** setelah
> **W6 COMPLETE** (arc `neosuite-ams-arc`, memory `neosuite-ams-w6-backend`): server tRPC +
> Prisma/SQLite, StateDoc ber-versi (CAS), boot-hidrasi dari API, canon-from-args, 59 Vitest +
> 6 server test hijau, typecheck strict 0 error.
> **Keputusan stack & scope di §11** = rekomendasi (belum dikonfirmasi via AskUserQuestion 2026-06-18;
> dialog tak dijawab → diajukan sebagai rekomendasi untuk sign-off, alternatif terdokumentasi di §7/§11).

| Field | Isi |
|---|---|
| Tanggal | 2026-06-18 |
| Pemilik | Ari Widodo |
| Status | **DRAFT — menunggu sign-off** |

---

## 1. Problem
Identitas & otorisasi NeoSuite AMS **kosmetik**. Tiga lubang spesifik:

- **Tanpa autentikasi.** `contexts.jsx` meng-hardcode `signedIn: true` dengan satu `USER` seed; tak ada
  layar login, sesi, token, atau logout. Siapa pun yang membuka SPA = pengguna penuh.
- **Otorisasi tak ditegakkan (server P·B·AKSES, eval Nilai merah).** `auth.role`/`auth.setRole`
  ([`view_settings.jsx`](migration/src/view_settings.jsx)) adalah **dropdown bebas** atas 4 peran
  (Engagement Partner / Audit Manager / Senior Auditor / Junior Auditor). Matriks kapabilitas
  (`ROLE_CAPS` + `PERM_MATRIX`, `view_settings.jsx:651`) hanya **mewarnai tabel** — tak menggerbang
  satu aksi pun. Konsekuensi eval: *"tak ada batas akses nyata — setiap pengguna efektif melihat
  seluruh perikatan."*
- **Server W6 sengaja tanpa auth.** `createContext: () => ({})`, **semua** endpoint `publicProcedure`,
  `updatedBy` = string opsional yang dikirim klien (dapat dipalsukan), `localhost`-only
  ([`trpc.ts:5`](server/src/trpc.ts), [`server.ts:8`](server/src/server.ts)). W6 menaruh penanda TODO
  yang menunjuk W7. Selama auth belum ada, API **tak boleh** diekspos jaringan.
- **Keamanan = mock.** Ganti sandi, 2FA, daftar sesi, IP-allowlist di `SecKeamanan`
  (`view_settings.jsx:488`) tak melakukan apa pun (`flash('Kata sandi diperbarui')`).

Catatan jujur (sama seperti W6): app berjalan di **data demo fiktif** (`ENG-2025-014`), bukan berkas
klien nyata. Maka W7 membangun **fondasi penegakan akses**, bukan mengamankan data rahasia riil
(enkripsi at-rest, retensi ISQM, hardening deploy = W10). Nilainya: tanpa penegakan server, seluruh
SSOT W6 (StateDoc, sign-off SA 230, keputusan diagnostik) **dapat ditulis oleh siapa saja dengan peran
apa saja** — itu membatalkan integritas yang dibangun P1/P2/P5.

## 2. Objective
Ganti identitas mock dengan **autentikasi nyata** (login, sesi, logout, 2FA) dan **otorisasi yang
ditegakkan di server**: peran menentukan aksi yang boleh dilakukan, dicek di **API** (gerbang sebenarnya)
dan dicerminkan di **UI** (dari sumber kapabilitas yang sama). `updatedBy` berasal dari **sesi
terotentikasi**, bukan klaim klien. Peristiwa login/MFA/perubahan-kredensial **nyata** masuk jejak
audit. Semua **tanpa regresi numerik** terhadap baseline W0 dan net Vitest/server yang ada.

## 3. Success Criteria (= DoD W7·1)
- **Login nyata:** layar login (email + sandi), sesi ber-token/cookie, **logout**, dan **kedaluwarsa
  sesi** sesuai timeout. Tanpa sesi valid → SPA menampilkan login, API menolak (UNAUTHORIZED).
- **2FA (TOTP):** enrol + verifikasi nyata (pairing QR/secret), bukan toggle kosmetik. (Penerapan
  wajib-PIE bisa di-flag; minimal jalur enrol+verify berfungsi.)
- **Ganti sandi benar-benar mengubah kredensial** (hash di-update; sandi lama diverifikasi); login
  berikutnya memakai kredensial baru.
- **Peran ditegakkan di server:** setiap mutasi (`state.set`, dsb.) dicek terhadap kapabilitas peran
  pengguna terotentikasi. **Uji otorisasi negatif** (Junior mencoba aksi Partner) → ditolak (FORBIDDEN),
  bukan hanya tersembunyi di UI.
- **UI dari sumber kapabilitas yang sama:** tombol/menu yang tak diizinkan → disabled/lock, membaca
  peta kapabilitas SSOT yang sama dengan server (tak ada divergensi UI↔server).
- **`updatedBy` dari sesi**, bukan input klien; **dropdown "act-as" dihapus** (atau dibatasi ke jalur
  dev eksplisit) supaya peran tak bisa diangkat sendiri di klien.
- **Jejak audit mencatat peristiwa nyata:** LOGIN, LOGOUT, gagal-login, enrol/verify 2FA, ganti sandi —
  bukan seed.
- **Gate teknis:** `lint` hijau; `typecheck` strict hijau **termasuk `server/`**; **Vitest canon (59)
  + diagnostik + server CAS (6) tetap utuh**; **tambah suite auth/authz** (uji positif + **negatif**)
  hijau; live oracle (fingerprint canon/AMS) **identik** baseline; OM 4.260 / PM 3.195 / CTT 213 tak
  bergeser; 0 console error; diverifikasi live (login → kerja → logout, dua peran berbeda).

## 4. Scope
- **Paket `server/` — lapisan auth (`server/src/auth/`):**
  - **Skema Prisma:** tambah ke `User`: `passwordHash`, `totpSecret?`, `totpEnabled`, `failedLogins`,
    `lockedUntil?`. Tabel baru **`Session`** (`id/token, userId, createdAt, expiresAt, lastSeenAt,
    revokedAt?, userAgent?, ip?`) dan **`AuthEvent`** (jejak audit append-only: `userId?, kind, ts,
    ip?, userAgent?, detail?`). Tak ada SQL spesifik-vendor (tetap Postgres-ready).
  - **Prosedur auth (publik):** `auth.login(email,password[,totp])`, `auth.logout`, `auth.me`,
    `auth.changePassword(old,new)`, `auth.enrollTotp` / `auth.verifyTotp`. Hash = argon2/bcrypt; TOTP =
    pustaka standar (otpauth/speakeasy). Token sesi opaque (random) tersimpan di DB; dikirim via
    cookie httpOnly **atau** header (lihat Open Q2).
  - **Konteks tRPC terotentikasi:** `createContext` membaca token → memuat `Session`+`User` → mengisi
    `ctx.user` (`id, role`). `protectedProcedure` (butuh sesi) + `authorizedProcedure(capability)`
    (butuh kapabilitas). Migrasikan endpoint W6 (`state.*`, `bootstrap`, `engagement.list`) ke
    `protectedProcedure`; **mutasi** lewat `authorizedProcedure`. `updatedBy` = `ctx.user.id`.
- **Sumber kapabilitas tunggal (SSOT) — `shared`:** pindahkan `PERM_MATRIX`/`ROLE_CAPS` jadi modul
  data bersama klien↔server (mis. `migration/src/rbac.js` + tipe di `canon_types.ts`, diimpor server),
  memetakan **peran → kapabilitas → aksi/endpoint**. Server menegakkan; UI membaca peta yang sama lewat
  helper `can(capability)`.
- **Seam auth klien (`contexts.jsx` + `api.js`):** `AuthContext` jadi nyata — `signedIn` dari `auth.me`;
  `login/logout/changePassword/enrollTotp`; sertakan token di tiap panggilan tRPC (link header/cookie);
  pada 401 → state logout + tampilkan login. Tambah helper `can()` di `useAuth`.
- **Gerbang UI:** layar **Login** (komponen baru) + gerbang boot (sebelum render app) di `app.jsx`/
  `<Root>`; ganti mock `SecKeamanan` (ganti-sandi, 2FA, sesi, logout) dengan operasi nyata; ganti
  `SecAkses` dropdown peran → **status read-only** (peran dari sesi) + matriks dari SSOT; sebar `can()`
  ke titik aksi berisiko (sign-off, posting AJE, opini, pengaturan firma) — reuse pola `LockBanner`/
  `firm.locked` yang sudah ada.
- **Seed:** 4 akun (satu per peran) dengan kredensial dev terdokumentasi; seed tetap **byte-identik**
  untuk angka (tak menyentuh WTB/canon).
- **Dev tooling:** rahasia via `.env` (`SESSION_*`, dll.); BUILD.md diperbarui (alur login dev);
  `.gitignore` memastikan `dev.db`/rahasia tak ter-commit.

## 5. Non-Scope (eksplisit)
- **OIDC/SSO/MFA enterprise (SAML, SCIM, push-MFA), reset-sandi via email, verifikasi email →
  W10/deploy.** W7 = email+sandi+TOTP self-hosted; abstraksi sesi dibuat agar OIDC dapat ditukar nanti.
- **Isolasi data per-engagement (membership user↔engagement)** — *opsional* di W7 (lihat §11 Keputusan
  B). Default rekomendasi: **gerbang kapabilitas dulu**; isolasi data per-perikatan menyusul (W7.5/W9)
  agar W7 tetap terlokalisasi.
- **Mock keamanan infra:** IP-allowlist, peringatan-login via email, daftar sesi multi-perangkat
  **nyata lintas-device** → W10 (butuh deploy/jaringan). W7 menyalakan sesi *milik server* + logout +
  timeout; daftar perangkat boleh tetap representasi sesi DB yang ada.
- **Proxy LLM/RAG → W8.** Konektor OAuth nyata → W9. Enkripsi at-rest, retensi 10thn/ISQM, hardening,
  rate-limit global, observability, CI/CD, deploy → W10.
- **Manajemen pengguna penuh (CRUD admin, undang/nonaktif)** → ditunda; W7 cukup seed + ganti-sandi/2FA
  diri sendiri.
- **Nol regresi numerik tetap mutlak** — W7 tak menyentuh canon/WTB.

## 6. Constraints
- **Nol regresi numerik** vs baseline W0 & net Vitest (59) + server CAS (6) + diagnostik. Auth tak
  menyentuh canon/WTB; seed angka byte-identik.
- **TypeScript strict** meluas ke `server/src/auth/`; `npm run typecheck` 0 error. Tipe peran/kapabilitas
  **dibagi** dari satu sumber (klien↔server).
- **ESM-only** dipertahankan; `app/` + `NeoSuite AMS.html` buildless = **referensi beku** — tak disentuh.
  Hanya `migration/src` + `server/`.
- **SQLite dev, Postgres-ready:** tanpa SQL vendor; sesi/auth lewat Prisma.
- **Kompatibel mundur seam W6:** kontrak hook (`useAmsPersist`, `useServerState`) & call-site tak
  berubah; hanya transport tRPC kini membawa token, dan endpoint kini protected. Degradasi offline W6
  (cache-only saat server mati) dipertahankan **untuk baca**; tulis butuh sesi.
- Lingkungan dev **Windows/PowerShell**; skrip lintas-platform. Rahasia **tak** masuk repo.
- **Keamanan dasar:** hash sandi kuat (argon2id/bcrypt cost wajar), token sesi acak ≥128-bit,
  cookie httpOnly+SameSite (bila cookie), timing-safe compare, lockout setelah N gagal. Bukan
  hardening lengkap (W10), tapi bukan pula naif.

## 7. Existing Solutions (prefer-existing)
- **Aset peran sudah ada** — `USER.role` + `ROLE_CAPS`/`PERM_MATRIX` (4 peran) sudah dirujuk UI; eval:
  *"penegakan tinggal disambungkan ke lapisan auth."* W7 **memakai ulang** matriks ini sebagai SSOT,
  bukan mendesain ulang model peran.
- **Konteks tRPC sudah disiapkan untuk auth** — `trpc.ts` mencatat `Context` akan diisi user/role di
  W7; `updatedBy` sudah jadi parameter. Tinggal mengisi konteks + memproteksi prosedur.
- **Self-hosted email+sandi+TOTP** dipilih > OIDC/BaaS: konsisten dgn keputusan W6 (nol-ops, nol-vendor,
  nol-biaya, **sepenuhnya dapat dieksekusi agen**), tak menambah dependensi eksternal/secret untuk
  prototipe localhost. OIDC = aspirasi enterprise eval, ditunda ke deploy (W10) di balik abstraksi sesi
  yang sama. (Alternatif Auth0/Clerk/Keycloak ditolak untuk W7 — overkill + dependensi eksternal.)
- **Pustaka matang** (argon2/bcrypt, otpauth/speakeasy, zod) — tak menulis kripto sendiri.
- **Pola UI gerbang sudah ada** — `LockBanner`, `firm.locked`, banner "mode tampilan saja" di
  `SecFirma`; `can()` mengikuti pola yang sama.

## 8. Proposed Approach
Tambah lapisan `server/src/auth/` di atas stack W6 tanpa mengubah bentuknya. Sesi opaque tersimpan di
DB; `createContext` menukar token→user→`ctx.user{id,role}`. Dua pembungkus prosedur: `protectedProcedure`
(sesi wajib) dan `authorizedProcedure(cap)` (kapabilitas wajib) — endpoint W6 dimigrasikan, mutasi
digerbang. **Satu peta kapabilitas** (`rbac.js`, dibagi) jadi sumber kebenaran: server memutuskan
boleh/tidak; `useAuth().can(cap)` di klien membaca peta yang sama → UI & server tak pernah divergen.
`AuthContext` di-rewrite **di belakang antarmuka yang ada** (komponen lain memanggil `useAuth()` seperti
biasa; hanya kini ada `login/logout/can/me`). Boot: gerbang `auth.me` sebelum render penuh (login screen
bila tak ada sesi), serupa gerbang hidrasi W6. `api.js` menyisipkan token di tiap request; 401 → logout.
Mock `SecKeamanan`/`SecAkses` disambung ke prosedur nyata. Peristiwa auth ditulis `AuthEvent` (jejak
audit). Dropdown act-as dihapus → peran hanya dari sesi.

## 9. Risks
- **R1 — Gerbang server salah → bypass otorisasi (tinggi).** Lubang = endpoint lupa diproteksi.
  *Mitigasi:* default-deny — `publicProcedure` hanya untuk `auth.login`/`auth.me`/health; sisanya
  `protected`/`authorized`; **uji otorisasi negatif** wajib per kapabilitas (Junior→aksi Partner =
  FORBIDDEN) sebagai gerbang lulus.
- **R2 — UI↔server divergen (peran boleh di UI tapi ditolak server, atau sebaliknya) (sedang).**
  *Mitigasi:* **satu** peta kapabilitas dibagi; `can()` klien dan cek server membaca sumber yang sama;
  test memetakan tiap aksi UI ke endpoint-nya.
- **R3 — Regresi seam W6 / call-site (sedang).** ~ratusan pemanggil `useAmsPersist`. *Mitigasi:* jaga
  kontrak hook; perubahan hanya internal (token di transport, endpoint protected); jalankan full Vitest
  + oracle + live dua-peran.
- **R4 — Boot async (flash login / race sesi) (sedang).** *Mitigasi:* gerbang `auth.me` sebelum render
  (pola W6 hydration); cache W6 hanya untuk **baca** offline; tulis butuh sesi → toast bila 401.
- **R5 — Keamanan kredensial naif (sedang).** *Mitigasi:* argon2id/bcrypt, token acak kuat, httpOnly+
  SameSite, timing-safe, lockout; rahasia di `.env` (bukan repo). Hardening penuh = W10 (eksplisit).
- **R6 — Scope creep ke W8/W9/W10 (sedang).** Auth menggoda "sekalian OIDC/email-reset/IP-allowlist".
  *Mitigasi:* non-scope keras §5; abstraksi sesi agar OIDC bisa ditukar tanpa rewrite.
- **R7 — Lupa hilangkan act-as backdoor (rendah-tinggi dampak).** Dropdown `setRole` = bypass RBAC.
  *Mitigasi:* hapus/diisolasi ke flag dev; peran hanya dari sesi; verifikasi tak ada `setRole` publik.

## 10. Implementation Plan (arc berfase — gerbang per fase)
- **Fase 0 — Skema auth + login server (tanpa UI).** Prisma: `User` (passwordHash/totp/lockout) +
  `Session` + `AuthEvent`; prosedur `auth.login/logout/me/changePassword/enrollTotp/verifyTotp`;
  `createContext` token→user; seed 4 peran + kredensial dev. **Test integrasi auth** (login ok/gagal,
  lockout, sesi kedaluwarsa, ganti sandi, TOTP). *DoD:* server boot, suite auth hijau, typecheck hijau.
  *Belum* menyentuh klien.
- **Fase 1 — Penegakan otorisasi server.** Peta kapabilitas dibagi (`rbac.js`); `protectedProcedure` +
  `authorizedProcedure(cap)`; migrasikan endpoint W6; `updatedBy`=`ctx.user.id`. **Uji otorisasi
  negatif** per kapabilitas. *DoD:* endpoint butuh sesi; mutasi butuh kapabilitas; uji negatif hijau;
  server CAS W6 tetap hijau.
- **Fase 2 — Seam auth klien + layar login.** `AuthContext` nyata (`me/login/logout/can`); token di
  `api.js`; gerbang boot + komponen Login; 401→logout. *DoD:* login→kerja→logout live; refresh
  mempertahankan sesi; tanpa sesi → login; 0 console err; seam W6 tetap utuh (dua-browser sync).
- **Fase 3 — Sambung UI ke RBAC + ganti mock keamanan.** `useAuth().can()` di titik aksi berisiko;
  `SecKeamanan` (sandi/2FA/sesi/logout) nyata; `SecAkses` read-only dari SSOT; **hapus dropdown
  act-as**; peristiwa auth → jejak audit. *DoD:* aksi terlarang ter-gerbang di UI **dan** server
  (konsisten); ganti-sandi nyata; **49+ Vitest + diagnostik + auth/authz + server hijau**; live oracle
  identik; OM/PM/CTT = baseline; verifikasi live dua peran (Partner vs Junior).

Setiap fase: tampilkan rencana+berkas sebelum kode; jalankan `lint`/`typecheck`/Vitest + server test +
oracle; commit terpisah; **uji otorisasi negatif + nol regresi numerik** sbg gerbang lulus.

## 11. Decisions (REKOMENDASI — konfirmasi saat sign-off)
- **A · Mekanisme auth:** **Self-hosted email + sandi + TOTP** di atas tRPC+Prisma. Alasan: konsisten
  W6 (nol-ops/nol-vendor/agent-executable), nol dependensi eksternal untuk prototipe localhost; OIDC
  ditukar nanti (W10) di balik abstraksi sesi. *(Alternatif OIDC/BaaS ditolak — §7.)*
- **B · Kedalaman RBAC:** **Gerbang kapabilitas ditegakkan server (core)** — `PERM_MATRIX` jadi SSOT,
  dicek di API + dicerminkan UI; uji negatif. **Isolasi data per-engagement (membership) = NON-SCOPE
  W7** (ditunda W7.5/W9) agar W7 terlokalisasi. *(Bila Anda ingin isolasi data sekaligus, ini menambah
  model membership + seed multi-user + sentuhan luas pada baca-data — sebut saat sign-off.)*
- **C · Model identitas:** **Seed 4 akun peran + layar login nyata**; **hapus dropdown act-as** (peran
  dari sesi) agar RBAC & uji-negatif bermakna. *(Alternatif single-user + act-as ditolak — backdoor
  yang membatalkan penegakan.)*
- **D · Cakupan item keamanan jadi nyata:** sandi + sesi + timeout + logout + **TOTP** + peristiwa-login
  ke jejak audit. **Ditunda W10:** IP-allowlist, peringatan-login email, revokasi sesi lintas-perangkat
  nyata, reset-sandi via email.

## 12. Open Questions (perlu jawaban sebelum/di Fase 0–2)
1. **Konfirmasi Keputusan A–D §11** (khususnya B: cukup gerbang kapabilitas, atau sekalian isolasi data
   per-engagement?).
2. **Transport sesi:** cookie httpOnly+SameSite (lebih aman, tapi dev-proxy `/trpc` Vite harus
   meneruskan cookie) **atau** token via header `Authorization` (lebih sederhana lintas-proxy, disimpan
   di memori klien). Usul: **cookie httpOnly** (default lebih aman); konfirmasi.
3. **Peran ke-5 (EQR).** Eval menyebut "Partner/Manager/Junior/EQR"; UI saat ini punya 4 (Partner/
   Manager/Senior/Junior). Tambah **EQR** sebagai peran ke-5 sekarang, atau pertahankan 4 dan petakan
   EQR ke kapabilitas Partner? Usul: **pertahankan 4** (sesuai aset UI); EQR sebagai kapabilitas, bukan
   peran, ditinjau di modul EQR (`view_eqr.jsx`). Setuju?
4. **Kredensial seed dev:** dokumentasikan di BUILD.md (mis. `partner@neosuite.dev` / sandi dev) — ok?
   Atau Anda mau set sendiri?

---

### Ringkasan untuk sign-off
W7 mengganti identitas mock dengan **login nyata (email+sandi+TOTP), sesi, logout, timeout** dan
**otorisasi yang ditegakkan di server** lewat **satu peta kapabilitas** (peran→aksi) yang juga dibaca
UI — sehingga UI & server tak pernah divergen. `updatedBy` dari sesi; **dropdown act-as dihapus**;
peristiwa login/2FA/ganti-sandi masuk jejak audit. **Nol regresi numerik**, seam W6 utuh, **uji
otorisasi negatif** sbg gerbang. Tanpa OIDC/email-reset/IP-allowlist (→W10), tanpa LLM (→W8), tanpa
konektor (→W9). Arc 4 fase (0 server-auth → 1 enforce → 2 klien+login → 3 UI+mock-nyata), gerbang per
fase. **Balas "Proceed." untuk mulai Fase 0**, atau jawab/oreksi Keputusan §11 + Open Questions §12
lebih dulu.
