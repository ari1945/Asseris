# PRD — Isolasi Data Personal (Privacy) & Halaman "Data Personal Saya"

> Status: **DRAFT — menunggu sign-off ("Proceed.")** · Penulis: Claude (untuk Ari Widodo) · Tanggal: 2026-07-05
> Terkait memory: `asseris-firm-people-gap-matrix`, `asseris-nav-beranda-restructure`, `asseris-authoritative-persist-key-recipe`, `neosuite-ams-w7-5-isolation`.

---

## 1. Problem

Data personal pegawai di workspace **Firma** sebagian masih terlihat oleh semua pengguna terautentikasi. Fondasi self-scoping (`personal.get` + `PERSONAL_KEYS`, dibangun 2026-07-01) **sudah menutup 10 key** (gaji, cuti, kinerja, etika, gratifikasi, independensi), tetapi:

1. **Kebocoran view statis** — beberapa view membaca `AMS.*` langsung di browser sehingga menampilkan seluruh pegawai, mem-bypass `personal.get`:
   - `AMS.HR_CASES` (**sanksi/disiplin**) — `view_pc_conduct.tsx:187`
   - `AMS.CPE_LOG` (**PPL/SKP dasar**) — `view_people.tsx:161`
   - `AMS.STAFF_PROFILE` (**PII**: NIK, NPWP, salary band, kontak darurat) — HCM 360°
   - `AMS.AML_SCREENING`, `AMS.LEAVE_BALANCE`, matriks kompetensi, `PERF_CYCLE.goals`
2. **Lubang fallback version-0** — `contexts.tsx:184` hanya mengadopsi hasil server bila `version > 0`. Bila dokumen personal belum pernah ditulis ke StateDoc (hanya ada sebagai seed `AMS.*`), klien jatuh kembali ke **seed penuh** → key "terlindungi" pun bisa bocor di DB baru di-seed. `personal.get` juga fallback ke objek **kosong**, bukan ke seed ter-filter.
3. **Granularitas pengecualian belum ada** — akses-penuh saat ini = satu boolean `HR_MANAGE || FIRM_ADMIN`. Akibatnya: **Finance Firma** (tanpa `HR_MANAGE`) hanya lihat gajinya sendiri (padahal seharusnya lihat gaji semua), dan **SEMUA Engagement Partner** (via `FIRM_ADMIN`) lihat seluruh data personal (padahal seharusnya hanya managing partner).

## 2. Objective

Setiap pegawai **hanya** melihat data personalnya sendiri di modul-modul Firma, **kecuali**: (a) **Rekan Pemimpin (Managing Partner)** tunggal — lihat semua; (b) pengecualian departemen **granular per jenis data** (mis. Finance→gaji; HR→payroll+SDM). Sediakan **satu halaman khusus "Data Personal Saya"** yang mengonsolidasikan data personal milik-sendiri.

## 3. Success Criteria

- **SC1** — Login sebagai auditor/partner non-pemimpin: setiap modul personal Firma (payroll, cuti, kinerja, cpe, etika/sanksi, independensi, HCM/profil) menampilkan **hanya baris miliknya**; DevTools Network menunjukkan payload `personal.get` hanya berisi `empId` sendiri (bukan sekadar disembunyikan di UI).
- **SC2** — Login **Rekan Pemimpin**: melihat seluruh baris semua pegawai di semua kategori.
- **SC3** — Login **Finance Firma**: melihat **gaji/pajak/BPJS semua** pegawai; **tidak** melihat sanksi/kinerja/etika orang lain.
- **SC4** — Login **Admin & HR Firma**: melihat payroll **dan** seluruh data SDM semua pegawai.
- **SC4b** — Login **Rekan (partner otonom)** dengan cap `.viewUnit`: melihat data personal **hanya anggota unitnya**, dan **tidak** melihat data pegawai di unit partner lain. Dalam mode tersentralisasi (cap unit tak diberi), Rekan tsb self-only.
- **SC5** — Kapabilitas per-kategori dapat di-assign/di-cabut lewat konsol **Pengaturan → Peran & Akses** (RBAC) tanpa ubah kode.
- **SC6** — Modul **"Data Personal Saya"** tampil untuk semua peran, mengonsolidasi: slip gaji & bukti potong, PPL/SKP, sanksi/disiplin, cuti, independensi, profil — semuanya self-only.
- **SC7** — Lubang fallback version-0 tertutup: pada DB yang baru di-seed (tanpa StateDoc personal), non-privileged user **tetap** hanya melihat barisnya sendiri.
- **SC8** — Gerbang hijau: `lint` 0, `typecheck` 0, `test` (server + migration) hijau, **fingerprint canon identik** (nol regresi numerik), 0 console error saat render modul terdampak.

## 4. Scope

- Server: perluas `PERSONAL_KEYS` + `filterPersonal`/`personal.get` menjadi **per-kategori-capability**; fallback ke **seed ter-filter** (bukan kosong).
- Klien: perluas `PERSONAL_STATE_KEYS`; perbaiki fallback version-0; alihkan view yang bocor (`view_pc_conduct`, `view_people`/HCM/CPE, kompetensi) ke key personal.
- RBAC: tambah **7 kapabilitas view-personal granular** + peran **"Rekan Pemimpin"**; decouple akses-personal dari `FIRM_ADMIN`.
- View baru: `view_personal.tsx` (modul `personal`, "Data Personal Saya").
- Seed: assign satu Rekan Pemimpin (EMP-001 Hartono); pastikan login Finance & HR untuk verifikasi.

## 5. Non-Scope

- Multi-tenant per-firma (tetap single-tenant).
- Menghapus data seed `AMS.*` dari bundle browser (batas jujur: seed tetap di bundle; proteksi ada di lapisan API/derivasi — akan ditulis eksplisit sebagai keterbatasan). Produksi tak boleh seed data pegawai nyata ke bundle.
- Manajemen keanggotaan/role via UI di luar konsol RBAC yang sudah ada.
- Perubahan pada gate **tulis** (write) — `capForWrite`/`HR_MANAGE`/`guardSignoffWrite` tetap; PRD ini murni **read-scoping**.

## 6. Constraints

- ESM-only, edit di `migration/src/*`; canon TypeScript full-strict (`typecheck` 0). Ikuti ATURAN EMAS anti-tabrakan (alias hook unik, dll — meski `.tsx` per-file lebih longgar dari buildless).
- SSOT numerik dari `AMS_CANON`/`AMS.WTB` — nol perubahan canon.
- Ikuti resep otoritatif persist-key (memory `asseris-authoritative-persist-key-recipe`): `PERSONAL_KEYS` (server) ↔ `PERSONAL_STATE_KEYS` (klien) **wajib sinkron**.
- `.tsx` baru wajib bebas `explicit-any` (ratchet ESLint) — atau ikuti pola baseline yang ada.

## 7. Existing Solutions (yang sudah ada — jangan dibangun ulang)

- `server/src/personalScope.ts` — `PERSONAL_KEYS`, `resolveEmpId`, `filterPersonal` (row-filter per empId). **Diperluas, bukan diganti.**
- `server/src/router.ts` `personal.get` — endpoint self-scoped. **Diperluas jadi per-kategori.**
- `migration/src/contexts.tsx` `PERSONAL_STATE_KEYS` + routing `personal.get` di `useServerState`. **Diperluas + perbaiki fallback.**
- `migration/src/rbac.ts` + `server/src/roleStore.ts` + konsol `view_settings.tsx` (SecAksesAdmin) — RBAC DB-backed customizable. **Tambah cap + peran; assign lewat mesin yang ada.**
- `migration/src/view_home.tsx` panel "Non-Perikatan Saya" — quick-link personal. **Dipertahankan; modul baru melengkapi.**

## 8. Proposed Approach

### 8.1 Kapabilitas granular berjenjang (RBAC — dua sumbu: kategori × cakupan)

Akses "melihat data personal orang lain" ditentukan oleh **dua sumbu**:

- **Kategori (7):** PAYROLL · LEAVE · PERF · CPE · CONDUCT · INDEP · PROFILE (data apa).
- **Cakupan (2 tingkat, berjenjang):** `.viewUnit` (rumah tangga/unit sendiri) dan `.viewFirm` (seluruh firma). **`viewFirm ⊇ viewUnit ⊇ self`.** Default tanpa cap = **self-only**.

Jadi 7 kategori × 2 cakupan = **14 kapabilitas** (konsol RBAC menampilkannya sebagai matriks; sebuah peran biasanya diberi satu tingkat cakupan konsisten). Contoh nilai: `personal.payroll.viewUnit`, `personal.payroll.viewFirm`, `personal.conduct.viewUnit`, dst. Key→cap terkait:

| Kategori | key/data | cap unit | cap firm |
|---|---|---|---|
| PAYROLL | `payrollData` (gaji, PPh21, BPJS, bukti potong) | `personal.payroll.viewUnit` | `personal.payroll.viewFirm` |
| LEAVE | `leaveReqs`, `leaveBalance` (cuti) | `personal.leave.viewUnit` | `…viewFirm` |
| PERF | `perfPeople`, `perfGoals`, kompetensi | `personal.perf.viewUnit` | `…viewFirm` |
| CPE | `cpeLog`, `cpeExtra` (PPL/SKP) | `personal.cpe.viewUnit` | `…viewFirm` |
| CONDUCT | `hrCases` (sanksi), `pc.ethics`, `pc.gifts`, `amlScreening` | `personal.conduct.viewUnit` | `…viewFirm` |
| INDEP | `independence`, `indepAppr/Threats/RotAck` | `personal.indep.viewUnit` | `…viewFirm` |
| PROFILE | `staffProfile` (PII: NIK, NPWP, kontak) | `personal.profile.viewUnit` | `…viewFirm` |

**Peran (dua peran baru):**
- `Rekan Pemimpin` (Managing Partner) — ke-7 cap **`.viewFirm`** + `FIRM_ADMIN`.
- `Rekan` (Partner — otonom) — ke-7 cap **`.viewUnit`** (rumah tangga sendiri). Tidak `FIRM_ADMIN`.

**Grant default (menunjukkan sifat berjenjang):**

| Kategori | Rekan Pemimpin | Rekan (otonom) | Finance Firma (pusat) | Admin & HR (pusat) | Auditor |
|---|:--:|:--:|:--:|:--:|:--:|
| PAYROLL | firm | unit | **firm** | firm | self |
| LEAVE | firm | unit | self | firm | self |
| PERF | firm | unit | self | firm | self |
| CPE | firm | unit | self | firm | self |
| CONDUCT | firm | unit | self | firm | self |
| INDEP | firm | unit | self | **firm** | self |
| PROFILE | firm | unit | self | firm | self |

> **OQ2 (terjawab):** HR **boleh** melihat Independensi & Rotasi → INDEP diberikan ke Admin & HR pada cakupan firm.

**Dua mode KAP = konfigurasi grant, bukan kode berbeda:**
- **KAP kecil/menengah (tersentralisasi):** hanya `Rekan Pemimpin`+pusat Finance/HR yang punya cap; peran `Rekan` **tidak diberi** cap unit → partner lain self-only, MP kontrol penuh.
- **KAP besar (terdesentralisasi):** beri peran `Rekan` cap `.viewUnit` (+ opsional staf Finance/HR tingkat-unit dengan `.viewUnit`) → tiap partner otonom atas unitnya; MP tetap `.viewFirm` di atas semua.

**Decoupling penting:** hapus implikasi `FIRM_ADMIN ⇒ akses personal`. `FIRM_ADMIN` tetap untuk pengaturan firma & RBAC, **bukan** melihat data personal. Inilah yang membuat "semua Engagement Partner" **tidak lagi** melihat semua — hanya `Rekan Pemimpin` (firm) dan `Rekan` (unit-nya sendiri).

### 8.1a Model unit & resolusi cakupan (server, otoritatif)

`personal.get` menghitung **himpunan empId yang boleh dilihat** per-key, per-caller:

```
capFirm = KEY_CAP_FIRM[key]; capUnit = KEY_CAP_UNIT[key]
if can(user.role, capFirm):  population = SEMUA empId
elif can(user.role, capUnit): population = unitSubtree(user)   // partner + rumah tangganya
else:                         population = [ownEmpId(user)]
return rows difilter ke `population`   // fallback ke seed ter-filter bila belum ada StateDoc
```

**Definisi unit** (`unitSubtree`) — lihat OQ1-lanjutan di §11: apakah diturunkan dari **`AMS.ORG` reports-to subtree** (tanpa model data baru) atau **field `unit`/`leadPartner` eksplisit** di STAFF (lebih robust untuk KAP besar dengan unit bernama). Resolusi dijalankan **di server** (mengikuti pola `engagementAccess.ts`), memuat ORG/STAFF dari seed seperti `loadStaff()`.

### 8.2 Server — `personal.get` per-kategori + fallback aman

- Ganti boolean tunggal `full` menjadi peta `KEY_CAP: Record<key, Cap>`; `full = can(user.role, KEY_CAP[key])`.
- **Fallback ke seed ter-filter:** bila `doc` null, `raw` diambil dari **seed `AMS.*`** untuk key itu (bukan `{}`/`[]`), lalu `filterPersonal` diterapkan. Kembalikan `version: doc?.version ?? 0` **apa adanya**, tetapi klien akan mengadopsinya untuk personal keys (lihat 8.3).
- Perluas `PERSONAL_KEYS` untuk: `leaveBalance`, `perfGoals`, `cpeLog`, `hrCases` (array, field `staff`), `amlScreening` (array, field `id`), `staffProfile` (object keyed empId), `competency` (bila terpisah).

### 8.3 Klien — perbaiki fallback + perluas routing

- `contexts.tsx`: untuk personal keys, **selalu adopsi `res.value` dari server** (server = otoritas filter), walau `version === 0`:
  `if (PERSONAL_STATE_KEYS.has(key) || res.version > 0) { setValRaw(res.value); cacheWrite(...); }`
- Perluas `PERSONAL_STATE_KEYS` selaras `PERSONAL_KEYS` server.
- Alihkan view bocor:
  - `view_pc_conduct.tsx:187` `A.HR_CASES` → `useAmsPersist('hrCases', () => A.HR_CASES)`; AML serupa.
  - `view_people.tsx:161` CPE base → `useAmsPersist('cpeLog', …)`; HCM profil/360° → `useAmsPersist('staffProfile', …)`; kompetensi → key personal.
- Karena non-privileged menerima objek ter-filter (hanya empId sendiri), loop `staff.map(... data[s.id] ...)` otomatis menyusut ke barisnya sendiri — **pola identik `view_payroll` yang sudah terbukti** (nol perubahan struktur render).

### 8.4 Modul baru "Data Personal Saya" (`view_personal.tsx`)

- Modul id `personal`, daftar di `icons.tsx` (grup Beranda/atau grup baru "Saya", `deep:true`), route `case 'personal'` di `app.tsx`, import di `main.jsx`.
- Membaca **hanya via personal.get** (self, empId resolved). Section: **Slip Gaji & Bukti Potong** · **PPL/SKP** (progres vs syarat) · **Sanksi & Disiplin** (kasus miliknya, bila ada) · **Cuti & Saldo** · **Independensi & Rotasi** · **Profil (PII saya)**.
- Read-only ringkas + deep-link "Buka modul" ke modul sumber (yang kini juga self-scoped). Tidak menduplikasi angka — semua dari key personal (SSOT).

## 9. Risks

| Risiko | Dampak | Mitigasi |
|---|---|---|
| **Tightening regresi** — non-managing partner kehilangan akses personal yang dulu ada | Partner mengeluh tak bisa lihat data tim | Ini **memang** diminta ("kecuali managing partner"); dokumentasikan; cap bisa di-assign balik via konsol per-kebutuhan |
| Seed di bundle browser tetap ada (batas jujur) | Data seed teknis masih di JS | Nyatakan eksplisit di UI/PRD; proteksi di lapisan derivasi/API; produksi tak seed data nyata |
| `PERSONAL_KEYS` ↔ `PERSONAL_STATE_KEYS` out-of-sync | Bocor senyap / data hilang | Checklist sinkron + uji server `personal_scope.test.ts` diperluas per key baru |
| `resolveEmpId` gagal untuk persona firm-ops (tak ada di STAFF) | Fail-closed → mereka lihat kosong di modul personal | Sesuai desain (mereka bukan staf audit); modul "Data Personal Saya" tampilkan state "tidak ada data personal" yang anggun |
| Cap baru tak ter-hydrate di roleStore (unit test tanpa server) | Fallback ke GRANTS statis | Pastikan GRANTS statis di `rbac.ts` memuat grant default (sudah pola existing) |
| Ratchet `no-explicit-any` di `.tsx` baru | `lint` gagal | Ketik view baru dengan tipe eksplisit sejak awal |

## 10. Implementation Plan

1. **RBAC** — tambah 14 cap (7 kategori × unit/firm) + peran `Rekan Pemimpin` & `Rekan` di `migration/src/rbac.ts` (GRANTS statis) + `server/src/rbac.ts`; perbarui `rbac.test.ts` (paku matriks berjenjang). Decouple `FIRM_ADMIN` dari akses personal.
2. **Model unit (server)** — `unitOf(empId)` + `unitSubtree(leadEmpId)`: **field `unit`/`leadPartner` eksplisit → fallback reports-to subtree** (OQ5=keduanya) di modul mirip `engagementAccess.ts`; muat ORG/STAFF dari seed.
3. **Server personalScope** — perluas `PERSONAL_KEYS`; tambah `KEY_CAP_UNIT`/`KEY_CAP_FIRM`; ubah `personal.get` (resolusi cakupan self/unit/firm per-key + fallback seed ter-filter); perluas `personal_scope.test.ts` (termasuk kasus unit).
4. **Klien contexts** — perluas `PERSONAL_STATE_KEYS`; perbaiki adopsi version-0 untuk personal keys.
5. **View bocor** — alihkan `view_pc_conduct` (HR_CASES/AML), `view_people` (CPE base/staffProfile/kompetensi/perfGoals) ke key personal.
6. **Modul baru** — `view_personal.tsx` (grup "Saya") + registrasi (icons/app/main).
7. **Seed + docs** — assign EMP-001 → `Rekan Pemimpin`; buat **3 unit demo** (Audit/Pajak/Advisory) dengan `unit`/`leadPartner` di STAFF, tiap unit dipimpin partner berbeda (≥1 sebagai peran `Rekan` otonom); tambah login dev Rekan Pemimpin/Rekan/Finance/HR di **BUILD.md**; `npm run seed`.
8. **Gerbang + verifikasi live** — lint/typecheck/test/build; live-verify SC1–SC7+SC4b dengan login: Rekan Pemimpin, Rekan (otonom), Engagement Partner non-pemimpin, Finance, HR, Senior.

## 11. Open Questions

**Terjawab (2026-07-05):**
- ✅ **OQ1** — Peran RBAC baru (bukan flag). **Ditambah:** RBAC harus **berjenjang** — mode tersentralisasi (KAP kecil/menengah, MP kontrol semua) & terdesentralisasi (KAP besar, partner otonom atas rumah tangganya). Diakomodasi via sumbu cakupan `viewUnit`/`viewFirm` (§8.1) — dua peran: `Rekan Pemimpin` (firm) & `Rekan` (unit).
- ✅ **OQ2** — HR **boleh** melihat Independensi & Rotasi (firm).
- ✅ **OQ3** — Modul "Data Personal Saya" di grup nav baru **"Saya"** (tampil semua peran).
- ✅ **OQ4** — Ya, tambahkan login dev Rekan Pemimpin/Rekan/Finance/HR di BUILD.md.

- ✅ **OQ5** — **Keduanya**: pakai field `unit`/`leadPartner` eksplisit di STAFF bila ada; jika kosong, fallback ke `AMS.ORG` reports-to subtree. `unitSubtree()` menerapkan urutan ini.
- ✅ **OQ6** — **3 unit demo** (mis. Audit, Pajak, Advisory), masing-masing dipimpin partner berbeda, untuk membuktikan SC4b live.

---

**SEMUA open question terjawab. Menunggu frasa "Proceed." untuk mulai implementasi (§10).**
