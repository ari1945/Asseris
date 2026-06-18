# PRD — W7.5 · Isolasi Data Per-Engagement (NeoSuite AMS)

> Wajib sign-off ("Proceed.") sebelum implementasi.
> Acuan: batas jujur W7 (`PRD - W7 Auth, Sesi & RBAC.md` §penundaan; memory
> [[neosuite-ams-w7-auth]]): *"RBAC ditegakkan di granularitas dokumen StateDoc (key→kapabilitas);
> **TAK ada isolasi data per-engagement** — setiap peran terotentikasi membaca engagement mana pun —
> ditunda W7.5/W9."* Lanjutan **Fase B** setelah W6 (backend) · W7 (auth/RBAC) · W8 (LLM-proxy).
> **Catatan label:** "W9" di eval (`Evaluasi NeoSuite AMS - Kesiapan Pengembangan Claude Code.html`
> §W9) = *integrasi konektor nyata*, BUKAN isolasi data. Maka pekerjaan ini diberi label **W7.5**
> (tindak lanjut keamanan W7), independen dari W9 eval.
> **Keputusan §11 = rekomendasi** (pola W7/W8; AskUserQuestion diajukan — bila tak dijawab, adopsi
> rekomendasi saat "Proceed.").

| Field | Isi |
|---|---|
| Tanggal | 2026-06-18 |
| Pemilik | Ari Widodo |
| Status | **DRAFT — menunggu sign-off** |

---

## 1. Problem

Otorisasi W7 menjawab *"peran ini boleh aksi apa"* tapi **bukan** *"pengguna ini boleh lihat
engagement yang mana"*. Konsekuensi nyata di server hari ini:

- **`bootstrap(engagementId)`** ([`router.ts:180`](server/src/router.ts)) `protectedProcedure` — **siapa
  pun** yang login bisa menarik WTB + seluruh StateDoc engagement **apa pun** (mis. `bootstrap('ENG-2025-031')`).
- **`state.get`/`state.set`** dengan `scope:'engagement'` di-gate oleh kapabilitas `(scope,key)`
  saja — **tidak** mengecek apakah pengguna ditugaskan ke `scopeId` (engagement) itu. Junior yang
  ditugaskan ke engagement A bisa membaca/menulis kertas kerja, kesimpulan SA 230, AJE, dan keputusan
  diagnostik engagement B.
- **`engagement.list`** mengembalikan **seluruh** roster ke semua peran.
- **Tak ada model keanggotaan.** `Engagement.partner`/`manager` hanya *string nama bebas* yang bahkan
  tak cocok dengan akun login seed (mis. ENG-040 partner "Rudi Gunawan" bukan pengguna login). Tak ada
  tabel user↔engagement. Jadi isolasi tak bisa dibangun tanpa menambah model keanggotaan.

Ini membatalkan janji kerahasiaan multi-klien KAP: tim engagement A **tak boleh** melihat bukti audit
engagement B (independensi, kerahasiaan klien, ISQM 1 / Kode Etik). W7 membangun *penegakan akses*;
W7.5 menambah **batas data per-engagement** di atasnya.

**Catatan jujur (konsisten W6–W8):** data demo fiktif (`ENG-2025-014`), bukan berkas klien riil. W7.5
membangun *mekanisme* isolasi yang benar (gate server + keanggotaan), bukan mengamankan rahasia nyata
(enkripsi at-rest, retensi, deploy = W10). Tanpa gate ini, seluruh SSOT W6/P1/P2/P4/P5 dapat dibaca
lintas-engagement oleh siapa saja.

## 2. Objective

Tegakkan **isolasi data per-engagement di server**: pengguna hanya dapat membaca/menulis **data kerja
engagement** (bootstrap + StateDoc ber-scope `engagement` + WTB) untuk engagement tempat ia **anggota**,
atau bila perannya punya **kapabilitas pengawasan lintas-engagement** (oversight). Roster engagement
yang dapat dipilih difilter ke himpunan yang boleh diakses. Semua **tanpa regresi numerik** (canon tak
disentuh) dan **tanpa merusak demo** (boot tetap jalan untuk keempat akun peran).

## 3. Success Criteria (= DoD W7.5)

- **Model keanggotaan:** tabel `EngagementMember` (user↔engagement) + seed yang masuk akal.
- **Gate akses-engagement di server:** `bootstrap`, dan `state.get`/`state.set` ber-scope `engagement`,
  menolak (FORBIDDEN) bila pengguna **bukan anggota** engagement itu **dan** tak punya kapabilitas
  oversight. **Uji otorisasi negatif** ada (Junior non-anggota → engagement lain = FORBIDDEN; anggota = OK;
  oversight = OK lintas-engagement).
- **`engagement.list` terfilter** ke himpunan yang boleh diakses (oversight → semua).
- **Boot tetap jalan** untuk keempat akun seed (semua anggota `ENG-2025-014`).
- **Klien:** switcher engagement & command-palette hanya menawarkan engagement yang boleh diakses;
  berpindah ke engagement terlarang tak mungkin dari UI; bila engagement aktif jadi tak-boleh, fallback
  anggun (bukan layar rusak).
- **Gate hijau:** server `typecheck` 0 + server Vitest (lama + baru) hijau; migration `lint` 0 +
  `typecheck` 0 + `build` + **59 Vitest** (zero numeric regression). Live-proven: login Junior →
  hanya engagement anggota terlihat & ter-load; engagement lain ditolak; Manager/Partner (oversight)
  lihat semua; 0 console err.

## 4. Scope

1. **Schema:** model `EngagementMember { engagementId, userId, (addedAt) }` (+ unique pair, index).
2. **RBAC:** kapabilitas baru `ENGAGEMENT_VIEW_ALL` di SSOT `rbac.js` (+ cermin `server/rbac.ts`);
   helper `assertEngagementAccess(user, engagementId)` di server (anggota ATAU view-all).
3. **Penegakan server:** terapkan gate di `bootstrap`, `state.get`/`state.set` (saat scope=engagement),
   dan filter `engagement.list`. Endpoint baru ringan bila perlu (`engagement.members`? opsional).
4. **Seed keanggotaan:** keempat akun → `ENG-2025-014`; subset (Senior) → engagement kedua
   (`ENG-2025-031`) untuk mendemonstrasikan isolasi positif+negatif.
5. **Klien:** ambil himpunan engagement yang boleh diakses (via `engagement.list` terfilter) →
   filter switcher/palette; guard boot (pilih engagement boleh-akses pertama bila default tak boleh);
   tangani `activeEng` yang jadi terlarang dengan anggun.
6. **Uji + dokumentasi:** uji negatif/positif server; `BUILD.md` bagian W7.5; update memory.

## 5. Non-Scope (ditunda)

- **Menyembunyikan metadata roster di dashboard firma-ops** (pipeline/scheduler/profit menampilkan
  *portofolio* engagement firma — itu visibilitas operasi firma, bukan data kerja rahasia). W7.5
  mengisolasi **data kerja** engagement, bukan keberadaan/nama engagement di view firma. (Bila diminta:
  pengetatan terpisah.)
- **Isolasi intra-dokumen** (mis. tanda-tangan tertentu di dalam `wpState`) — tetap UI-level.
- **Isolasi lintas-firma / multi-tenant firma** (satu firma di app ini).
- **UI manajemen keanggotaan** (tambah/hapus anggota engagement lewat layar) — seed + endpoint dasar
  saja; layar admin = lanjutan.
- **Enkripsi at-rest, retensi ISQM, hardening deploy** → W10.

## 6. Constraints

- **Canon tak disentuh** — zero numeric regression; gate Vitest/oracle tetap pin W0.
- **Nol-vendor**; TypeScript strict server (`tsc --noEmit` 0).
- **Boot tak boleh pecah:** `app.jsx` menjalankan `bootstrap(DEFAULT_ENG_ID='ENG-2025-014')` untuk
  SETIAP pengguna → keempat akun WAJIB anggota ENG-2025-014, plus guard klien defensif.
- **Degradasi anggun** (pola W6): error 403 di `useServerState` jatuh ke cache/default, tak crash.
- **Aturan emas anti-tabrakan** untuk kode klien baru.
- **SSOT RBAC tunggal** (`rbac.js`) — UI & server baca peta yang sama (jangan diverge).

## 7. Existing Solutions / Reuse

- **Reuse penuh:** pola gate W7 (`assertCanWrite` di [`router.ts:40`](server/src/router.ts) → tambah
  `assertEngagementAccess` sejajar); `protectedProcedure`; SSOT `rbac.js`/`rbac.ts` (`can`/`CAP`);
  pola seed idempoten (`seed.ts`); `useServerState` degradasi-anggun + `engagement.list` (sudah ada,
  tinggal difilter); `FirmContext` (`engagements`/`activeEngagementId`/`setActiveEngagementId`) sebagai
  titik filter switcher; command-palette index (`view_palette.jsx`).
- **Alternatif ditolak:** turunkan keanggotaan dari `partner`/`manager` string — rapuh & tak lengkap
  (Senior/Junior seed tak ada di field itu; banyak nama bukan akun login). Tabel eksplisit menang.

## 8. Proposed Approach

**Server.**
- `schema.prisma`: `model EngagementMember { id, engagementId, userId, addedAt; @@unique([engagementId,userId]); @@index([userId]) }`.
- `rbac.js`: `CAP.ENGAGEMENT_VIEW_ALL='engagement.viewAll'`; GRANTS → Partner + Manager (Q1=A).
- `server/src/engagementAccess.ts`: `assertEngagementAccess(user, engagementId)` — lolos bila
  `can(role, ENGAGEMENT_VIEW_ALL)` ATAU ada baris `EngagementMember(user,eng)`; selain itu
  `TRPCError FORBIDDEN`. Plus `accessibleEngagementIds(user)` (semua bila view-all, else dari membership).
- `router.ts`: panggil `assertEngagementAccess` di `bootstrap` (input.engagementId) & di `state.get`/
  `state.set` bila `scope==='engagement'` (scopeId=engagementId); `engagement.list` → filter ke
  `accessibleEngagementIds`.
- `seed.ts`: ENG-2025-014 → keempat akun; ENG-2025-031 → Senior (Bagas). (Partner+Manager lihat semua
  via view-all; seed keanggotaan eksplisit mereka opsional.)

**Klien.**
- `api.js`: `engagementsAccessible()` → `engagement.list` (sudah terfilter server) → set id.
- `contexts.jsx` `FirmProvider`: muat himpunan boleh-akses; expose `accessibleEngagementIds` +
  filter daftar yang dipakai switcher; `setActiveEngagementId` menolak id non-akses (atau switcher tak
  menawarkannya); bila `activeEngagementId` saat ini tak-boleh → set ke akses pertama. Guard boot:
  `app.jsx` tetap coba DEFAULT_ENG (semua anggota), tangkap 403 → pilih akses pertama.
- `view_palette.jsx`: index engagement palette difilter ke boleh-akses.

## 9. Risks & Mitigations

- **Boot pecah** (pengguna non-anggota DEFAULT_ENG) → seed semua akun ke ENG-014 + guard klien (pilih
  akses pertama on 403). Uji: tiap akun login berhasil boot.
- **Kunci diri sendiri / lock-out** (oversight salah) → Partner+Manager view-all (Q1=A) menjaga
  pengawasan; seed dicek; uji tiap peran.
- **Kebocoran tersisa** (jalur lain baca engagement) → audit semua titik baca engagement-scope:
  bootstrap + state.get/set (satu-satunya jalur data engagement di API). engagement.list difilter.
  (Roster firma-ops sengaja di luar scope — §5, didokumentasikan.)
- **Regresi numerik / demo rusak** → canon tak disentuh; Manager (pengguna primer default) view-all →
  pengalaman demo default tak berubah; gate Vitest + live.
- **Performa** (cek membership tiap call) → query ber-index `@@unique`/`@@index([userId])`; volume kecil.

## 10. Implementation Plan (fase, gate per fase)

- **Fase 0 — Penegakan server.** Schema `EngagementMember` (+ `prisma generate`/`db:push`); `rbac.js`
  `ENGAGEMENT_VIEW_ALL`; `engagementAccess.ts`; gate di bootstrap/state/list; seed keanggotaan; uji
  positif+negatif (Junior non-anggota→FORBIDDEN, anggota→OK, oversight→OK lintas, anon→401,
  list-terfilter). Gate: server typecheck 0 + server vitest hijau. **Tanpa klien** (Fase 1 menyusul);
  catat bahwa hingga Fase 1, klien non-oversight bisa "lihat tapi gagal load" engagement terlarang
  (anggun, bukan crash).
- **Fase 1 — Klien.** Himpunan boleh-akses → filter switcher/palette + guard boot + tangani activeEng
  terlarang. Gate: lint 0, typecheck 0, 59 vitest (zero regression), build. **Live-proven:** login
  Junior(Citra)→hanya ENG-014; Senior(Bagas)→ENG-014+031; Manager→semua; coba akses terlarang ditolak;
  0 console err.

Tiap fase = commit terpisah `W7.5 Fase N: …`.

## 11. Keputusan (dikonfirmasi 2026-06-18 via AskUserQuestion)

- **Q1 — Bypass pengawasan. ✅ DIPUTUSKAN: A — Engagement Partner + Audit Manager** dapat
  `ENGAGEMENT_VIEW_ALL`. Senior/Junior hanya engagement yang ditugaskan (isolasi terdemonstrasi pada
  mereka); Manager (pengguna demo primer) tetap lihat semua → demo default tak berubah.
- **Q2 — Batas isolasi. ✅ DIPUTUSKAN: A — isolasi data kerja engagement** (bootstrap + StateDoc
  engagement + WTB). Roster nama engagement TETAP tampil di view firma-ops (pipeline/scheduler/profit)
  sebagai visibilitas operasi firma (lihat §5 Non-Scope).
- **Q3 — Cakupan. ✅ (rekomendasi) server (Fase 0) + klien switcher/palette filter (Fase 1).**
- **Q4 — Keanggotaan memberi. ✅ (rekomendasi) akses saja** (peran firma tetap mengatur kapabilitas
  via rbac.js; keanggotaan hanya menentukan engagement mana yang boleh dibuka). Peran-per-engagement =
  ditunda.

---

### Ringkasan untuk keputusan
W7.5 = tutup batas jujur W7: tambah **keanggotaan engagement** + **gate akses-engagement di server**
(bootstrap + StateDoc engagement + list) sehingga pengguna hanya melihat data kerja engagement tempat
ia anggota; Partner/Manager mengawasi lintas-engagement (Q1=A). Boot & demo tetap utuh, canon tak
tersentuh, klien filter switcher. **Menunggu "Proceed."** (atau "Proceed, kecuali Qx = …").
