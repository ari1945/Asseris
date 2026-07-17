# PRD — Konsol Admin RBAC: Peran & Akses Custom di Pengaturan

| Field | Isi |
|---|---|
| Tanggal | 2026-07-03 |
| Pemilik | Ari Widodo |
| Status | **Open Questions terjawab — menunggu "Proceed."** |
| Asal | Permintaan langsung: "Rancang di dalam menu pengaturan untuk dapat melakukan setting akses tiap jenis role... Buat agar customable, dan dapat membuat jenis peran baru. Secara default non auditor tidak akan dapat mengakses semua informasi perikatan." |

## 1. Problem
RBAC saat ini **100% hardcoded** di `migration/src/rbac.ts` — array `ROLES` (6 peran tetap), objek `CAP` (16 kapabilitas), dan `GRANTS` (peta peran→kapabilitas statis, immutable tanpa deploy kode baru). `view_settings.tsx` punya tab "Peran & Akses" (`SecAkses`) tapi **read-only** — hanya menampilkan matriks, tidak bisa diedit. Menambah peran baru atau mengubah akses satu peran butuh mengedit kode + deploy, bukan tindakan admin dari UI.

Kebutuhan bisnis: firma ingin admin (Partner) bisa **menentukan sendiri** siapa boleh apa, dan membuat **peran baru** (mis. "Tax Consultant Internal", "IT Support") tanpa menunggu rilis kode.

## 2. Objective
Admin (peran ber-`FIRM_ADMIN`) dapat, dari menu Pengaturan:
1. Melihat & **mengubah** kapabilitas yang dimiliki tiap peran yang ada.
2. **Membuat peran baru** dengan nama bebas + memilih kapabilitas dari katalog tetap.
3. Peran baru **default tanpa akses apa pun** (deny-by-default), termasuk **tanpa akses data perikatan** — harus di-*opt-in* eksplisit oleh admin, bukan otomatis.

Non-goal tersembunyi yang perlu diluruskan: **isolasi data perikatan untuk peran non-auditor SUDAH ada** hari ini (W7.5 — `ENGAGEMENT_VIEW_ALL` + tabel `EngagementMember`; Admin & HR Firma dan Finance Firma sudah tidak pernah dimasukkan sebagai anggota perikatan). PRD ini **mempertahankan** invarian itu untuk peran baru, bukan membangunnya dari nol.

## 3. Success Criteria
1. Tab "Peran & Akses" di Pengaturan: matriks peran×kapabilitas jadi **editable** (checkbox per sel) untuk admin `FIRM_ADMIN`; role lain tetap read-only (lihat matriks saja, seperti sekarang).
2. Tombol "Buat Peran Baru": nama bebas + toggle kapabilitas dari katalog `CAP` yang ada (16 kapabilitas tetap, **tidak** menambah kapabilitas baru — lihat §5). Peran baru lahir dengan **nol kapabilitas** tercentang.
3. Simpan perubahan → efektif **langsung** untuk sesi berikutnya (server cache invalidation), tanpa restart server.
4. **Guardrail wajib**: sistem menolak simpan jika hasil akhir membuat **tidak ada satupun peran** yang memegang `FIRM_ADMIN` (self-lockout prevention).
5. Peran yang sedang dipakai ≥1 user **tidak bisa dihapus** (hanya bisa diedit kapabilitasnya atau dinonaktifkan dari assignment baru); pesan error jelas jika dicoba.
6. Setiap perubahan role/grant **tercatat di jejak audit** (AuditLog W10, hash-chained) — siapa ubah apa kapan.
7. Regresi nol: 6 peran seed existing + 73 titik pemanggilan `can()`/`CAP.*` (18 server, 55 client) **tidak berubah perilaku** pasca-migrasi (grants default = persis GRANTS hari ini).
8. `typecheck 0 · lint 0 · test hijau` (migration + server) + live-verified: buat peran baru di UI, assign ke user via `add-user`/seed, login, konfirmasi kapabilitas & isolasi perikatan berlaku.

## 4. Scope
- Tabel Prisma baru: `Role` (firm-scoped) menggantikan `GRANTS` statis sebagai sumber kebenaran server.
- Server: `can()`/`capForWrite()` di `server/src/rbac.ts` jadi DB-backed (dengan cache in-memory + invalidasi saat tulis) — **signature tidak berubah**, jadi 18 call site di `router.ts`/`engagementAccess.ts` nol-sentuh.
- Endpoint tRPC baru: `roles.list`, `roles.create`, `roles.updateGrants`, `roles.delete` — semua gated `FIRM_ADMIN`.
- Client: `SecAkses` di `view_settings.tsx` jadi editable form (checkbox matrix + modal "peran baru") untuk `FIRM_ADMIN`; role lain tetap tampilan lama.
- Migrasi seed: `GRANTS` statis saat ini menjadi **baris awal** tabel `Role` (seed data), bukan dihapus dari kode — tetap jadi fallback/dokumentasi kapabilitas yang tersedia (`CAP` map tetap di kode, hanya **grants** yang pindah ke DB).
- Audit log entry untuk setiap create/update/delete role.

## 5. Non-Scope
- **Tidak** menambah kapabilitas (`CAP`) baru atau gate baru di kode — katalog 16 kapabilitas yang ada hari ini tetap tetap yang bisa dipilih. Kapabilitas baru = perubahan kode (gate baru di endpoint/UI baru), bukan sesuatu yang bisa "dirakit" dari Pengaturan.
- **Tidak** override per-user (izin tambahan/kecuali di luar peran) — tetap murni role-based, sama seperti arsitektur hari ini.
- **Tidak** mengubah mekanisme isolasi perikatan W7.5 itu sendiri (`EngagementMember`, `ENGAGEMENT_VIEW_ALL`) — PRD ini hanya memastikan peran baru **mewarisi default aman** (tanpa cap tsb) dari mekanisme yang sudah ada.
- **Tidak** UI untuk assign peran ke user (mengganti `User.role`) — itu domain `add-user`/manajemen staf existing, bukan bagian tab ini kecuali disepakati sebagai iterasi lanjutan.
- **Tidak** multi-firma (satu instance = satu firma, sesuai desain hari ini) — tabel `Role` di-scope `firmId` untuk kerapian data, bukan untuk multi-tenant sekarang.

## 6. Constraints
- ESM-only (`migration/src` = sumber kebenaran, W3 Phase 2).
- Ratchet ESLint `no-explicit-any` — file/endpoint baru wajib bebas `:any` baru.
- Pola SSOT: `rbac.ts` tetap satu-satunya tempat `can()`/`capForWrite()` didefinisikan — hanya *implementasi internal* yang berubah dari objek statis ke lookup DB+cache, kontrak fungsi (nama, signature, semantics "unknown role/cap → deny") tidak berubah.
- Perubahan RBAC = perubahan keamanan berisiko tinggi → wajib defense-in-depth (client toggle hanya kosmetik, penegakan nyata di server, sama seperti pola `PHASE_OVERRIDE` di `prd-phase-gate-override-rbac.md`).

## 7. Existing Solutions
- `SecAkses` (view_settings.tsx) sudah menampilkan matriks peran×kapabilitas — **dipakai ulang sebagai kerangka tampilan**, bukan dibangun dari nol.
- `can()`/`capForWrite()` sudah jadi satu titik pemanggilan tunggal di 73 lokasi — desain ini justru **memanfaatkan** sentralisasi itu supaya migrasi ke DB tidak menyentuh 73 call site.
- Isolasi perikatan (`engagementAccess.ts` — `assertEngagementAccess`, `accessibleEngagementIds`) sudah menegakkan "non-member & tanpa `ENGAGEMENT_VIEW_ALL` → FORBIDDEN". Peran baru otomatis patuh aturan ini selama tidak diberi `ENGAGEMENT_VIEW_ALL` — **tidak perlu kode isolasi baru**.
- Pola audit-log write-path (K5, W10) sudah ada untuk dicontoh pada penulisan role/grant.

## 8. Proposed Approach
1. **Data model**: `Role { id, firmId, name, capsJson (array of CAP keys), isBuiltIn: boolean, createdAt, updatedAt }`. `User.role` **tetap string** (bukan FK) — harus cocok dengan `Role.name` pada firma yang sama. Ini meminimalkan blast radius (tak perlu migrasi kolom `User.role`→`roleId` di seluruh 73 call site yang mengunci by role-string).
2. **Server `can()`**: baca dari cache in-memory `Map<roleName, Set<CAP>>` yang di-*hydrate* dari tabel `Role` saat boot + di-*invalidate*/*refresh* setiap `roles.updateGrants`/`roles.create`/`roles.delete` berhasil. Fallback fail-closed: role tak dikenal di cache → deny semua (konsisten dgn perilaku `can()` hari ini untuk role/cap tak dikenal).
3. **Seed migrasi**: `GRANTS` statis di `migration/src/rbac.ts` hari ini di-*port* jadi baris seed `Role` (6 peran built-in, `isBuiltIn=true`). `CAP` (katalog 16 kapabilitas) **tetap** di kode sebagai referensi/enum yang dipakai UI utk render checkbox — bukan sumber grants lagi.
4. **Endpoint baru** (`server/src/router.ts`, namespace `roles.*`), semua gated `can(user.role, CAP.FIRM_ADMIN)`:
   - `roles.list` — daftar peran + kapabilitas + jumlah user terpasang.
   - `roles.create` — nama + set kapabilitas awal (boleh kosong).
   - `roles.updateGrants` — ganti set kapabilitas satu peran. **Validasi wajib**: hasil akhir lintas-semua-peran harus tetap ada ≥1 peran dengan `FIRM_ADMIN` (baca seluruh tabel dulu, hitung, tolak jika 0).
   - `roles.delete` — tolak jika ada `User.role` yang cocok dgn nama itu (`isBuiltIn` juga tak boleh dihapus).
   - Semua 4 endpoint menulis `AuditLog` entry.
5. **Client**: `SecAkses` di `view_settings.tsx` — jika `auth.can(FIRM_ADMIN)`, render matriks sebagai checkbox interaktif (per role × per cap) + tombol "Peran Baru" (modal: nama + checklist kapabilitas, submit → `roles.create`). Non-admin tetap lihat versi read-only lama.
6. **Default aman peran baru**: form "Peran Baru" mulai dengan **semua checkbox kosong** — admin harus sadar mencentang `ENGAGEMENT_VIEW_ALL` secara eksplisit bila memang mau peran itu melihat semua perikatan. Tanpa itu (dan tanpa jadi `EngagementMember`), peran baru otomatis terkunci dari data perikatan — sesuai permintaan eksplisit di prompt.

## 9. Risks / Batas jujur
- **Self-lockout**: jika validasi guardrail (§8.4) punya bug, admin bisa mencabut `FIRM_ADMIN` dari semua peran dan mengunci diri dari RBAC selamanya (perlu perbaikan manual di DB). Mitigasi: unit test khusus untuk guardrail ini + validasi di server (bukan hanya UI).
- **Cache staleness**: jika server berjalan multi-instance (belum kasus hari ini — deploy masih single-box per `docs/DEPLOY.md`), invalidasi cache in-memory tidak akan menyebar lintas-instance. Diterima sebagai batas jujur selama arsitektur tetap single-instance.
- **`User.role` sebagai string longgar** (bukan FK): mengganti nama sebuah `Role` yang sedang dipakai akan memutus keterkaitan (user jadi "role tak dikenal" → default deny). Mitigasi: `roles.updateGrants` **tidak mendukung rename**, hanya ubah kapabilitas; rename = fitur terpisah (butuh migrasi serentak semua `User.role` yang cocok) — dinyatakan Non-Scope kecuali disepakati lain.
- **Kapabilitas baru tetap butuh kode**: PRD ini tidak memenuhi skenario "firma mau kapabilitas yang belum ada" — itu tetap siklus rilis normal.

## 10. Implementation Plan
1. Migrasi Prisma: tabel `Role` + seed 6 peran built-in dari `GRANTS` statis (commit 1).
2. Server: `rbac.ts` DB-backed `can()`/`capForWrite()` + cache/invalidation, tanpa ubah call site (commit 2, gate hijau — regresi nol wajib dibuktikan lewat test suite existing).
3. Endpoint `roles.*` + guardrail FIRM_ADMIN + audit log (commit 3).
4. Client `SecAkses` editable + modal peran baru (commit 4).
5. Live-verify: login Partner → ubah kapabilitas satu peran → login peran itu → konfirmasi efektif. Buat peran baru tanpa cap → assign via `add-user` → login → konfirmasi nol akses (termasuk nol akses perikatan).
6. PR terpisah per commit-set di atas atau digabung — mengikuti kebiasaan Anda (branch dari `master`, PR review sebelum merge).

## 11. Open Questions — RESOLVED (2026-07-03)
1. **Assignment peran ke user**: dikonfirmasi — tetap lewat `add-user` CLI existing (env var `USER_ROLE`). UI assignment **tidak** masuk scope PRD ini (Non-Scope §5 tetap berlaku).
2. **Rename & delete peran built-in**: dikonfirmasi — 6 peran built-in **boleh** diedit kapabilitasnya (mis. mencabut `EXPORT` dari Junior Auditor). Nama & keberadaan (`isBuiltIn=true`, tak bisa dihapus/rename) tetap terkunci sesuai §8.3/§9.
3. **Siapa boleh mengelola RBAC**: dikonfirmasi — hanya `FIRM_ADMIN` (hari ini = Engagement Partner saja). Audit Manager tidak diberi akses kelola RBAC.
