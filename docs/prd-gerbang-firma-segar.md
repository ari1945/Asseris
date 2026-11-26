# PRD — Gerbang "Firma Segar": uji yang menjalankan firma berbentuk produksi

| Field | Nilai |
|---|---|
| Status | In Progress — "Proceed." 2026-11-26 (Q-1 = C · Q-2 = 2026-12-31 · Q-4 = tidak; Q-3 = buktikan di CI lewat PR, 2026-11-26). Fase 1 selesai (§12); Fase 2 selesai kecuali langkah 4 (§13) |
| Tanggal | 2026-11-26 |
| Pemilik | Ari Widodo |
| Asal | [`EVALUASI-MENYELURUH-2026-11-25.md`](EVALUASI-MENYELURUH-2026-11-25.md) §2 — empat P0 lolos gerbang hijau |
| Basis | master `3de574c` · `npm run verify` LULUS (4.013 uji frontend · 511 uji backend) |

---

## 1. Problem

Seluruh jaring uji — 230 berkas vitest frontend, 34 berkas vitest backend, 8 spek Playwright —
berjalan di atas **satu** identitas: firma `FIRM-WHR` dan perikatan `ENG-2025-014` dari seed demo.
Seed e2e bahkan bersifat destruktif-lalu-demo (`e2e/scripts/start-api.mjs:1-6`).

Akibatnya, setiap cacat yang berbentuk "identitas demo dipaku di frontend" **tak terlihat secara
struktural**: dalam dunia uji, id yang dipaku dan id sesi selalu sama. Evaluasi 2026-11-25
menemukan empat cacat semacam itu — semuanya penghalang go-live, semuanya di bawah gerbang hijau:

| P0 | Cacat | Mengapa uji tak melihatnya |
|---|---|---|
| P0-1 | `FIRM_SCOPE_ID = 'FIRM-WHR'` (`persist_scope.ts:22`) vs penolakan `cross-firm-state` (`router.ts:236`, `stateAccess.ts:107`) | firma uji = `FIRM-WHR` |
| P0-2 | Tak ada prosedur pembuat `Engagement`/`EngagementMember`; perikatan buatan UI ditolak `assertEngagementAccess` | semua perikatan uji berasal dari seed |
| P0-3 | `AMS.TODAY` dan `ASOF_DATE` dibekukan | uji memang ingin jam beku |
| P0-4 | Boot menghidrasi `ENG-2025-014` dan galatnya ditelan; koleksi kosong mempertahankan data demo; nilai awal `useServerState` = seed demo (`app.tsx:346`, `api.ts:419-430`, `contexts.tsx:776, 1054-1055`) | perikatan uji = `ENG-2025-014`, dan koleksi uji tak pernah kosong |

Memperbaiki P0 tanpa gerbang lebih dulu melanggar metode repo ini sendiri: **gerbang yang belum
pernah merah tidak membuktikan apa pun** (AGENTS.md §0).

## 2. Objective

Menghadirkan gerbang otomatis yang (a) **merah di master hari ini** karena P0-1, P0-2, dan P0-4,
(b) berubah hijau **hanya** bila cacatnya benar-benar ditutup, dan (c) tetap menjaga setelahnya —
sehingga kelas "identitas demo dipaku" tak bisa kembali tanpa ketahuan.

Gerbang ini adalah **prasyarat** perbaikan P0, bukan perbaikannya.

## 3. Success Criteria

| SC | Kriteria | Cara mengukur |
|---|---|---|
| SC-1 | Tiap uji gerbang **merah pada master `3de574c`** karena P0 yang dituju, bukan karena galat infrastruktur | dijalankan tanpa karantina → gagal dengan pesan yang menyebut P0-nya |
| SC-2 | `master` tetap hijau (R-7): uji merah dikarantina `it.fails()` / `test.fail()` + `// KARANTINA s/d <tanggal>` | `npm run verify` LULUS; CI hijau |
| SC-3 | **Uji mutasi**: menambal cacatnya secara lokal (tak di-commit) membuat uji karantinanya MEMBALIK — `it.fails()` mulai gagal | dicatat per uji di PR: tambalan apa, hasil sebelum/sesudah |
| SC-4 | Tak ada uji yang lolos vakum: tiap uji membuktikan prasyaratnya terjadi (mis. firma ber-id ≠ `FIRM-WHR` benar-benar terbuat, panggilan API benar-benar terjadi) | asersi prasyarat eksplisit di tiap uji |
| SC-5 | Lapisan Fase 1 berjalan di dalam `npm run verify` tanpa Postgres; durasi tambahan ≤ 30 detik | log verify |
| SC-6 | Lapisan Fase 2 (Playwright) berjalan di CI `e2e.yml` atas Postgres tanpa mengganggu 8 spek yang ada | CI hijau dengan spek baru ber-`test.fail()` |

## 4. Scope

**Fase 1 — gerbang kontrak (vitest; frontend + backend; masuk `npm run verify`)**

| Uji | P0 | Yang dinyatakan |
|---|---|---|
| G1-a | P0-1 | Dengan sesi ber-`firmId = 'FIRM-SEGAR'`, `useServerState(…, 'firm', …)` memanggil `state.get` dengan `scopeId === 'FIRM-SEGAR'` |
| G1-b | P0-1 | Sisi server (pin, kemungkinan sudah hijau): pengguna `FIRM-SEGAR` yang membaca/menulis `scopeId: 'FIRM-WHR'` ditolak `cross-firm-state` — membuktikan kedua ujung kontrak |
| G1-c | P0-4 | `hydrateCoreFromApi` dengan bundel ber-`clients/engagements/team` **kosong** mengosongkan `AMS.CLIENTS/ENGAGEMENTS/TEAM`, bukan mempertahankan demo |
| G1-d | P0-4 | `useServerState('clients'/'engagements', …)` pada version 0 untuk firma non-demo tidak menampilkan — dan tak pernah menulis — baris seed demo |

**Fase 2 — perjalanan e2e (Playwright atas Postgres; CI)**

Spek baru `e2e/tests/09-fresh-firm.spec.ts` di atas **stack terpisah** yang dibuat lewat jalur
produksi (`bootstrapFirm`, bukan seed demo):

1. login Partner-admin firma segar → nama firma di layar = nama bootstrap; **nol** nama klien demo
   (mis. "PT Sentosa Makmur") di DOM;
2. buat klien → muat ulang → klien masih ada (P0-1, P0-4);
3. buat perikatan lewat UI → tulis satu kertas kerja → muat ulang → terbaca kembali (P0-2);
4. undang staf → tugaskan ke perikatan → staf login → staf melihat perikatannya dan dapat menulis (P0-2);
5. asersi DB/API: tak ada StateDoc firma segar yang memuat id/nama entitas demo (P0-4).

## 5. Non-Scope

- **Memperbaiki P0 apa pun.** Gerbang ini hanya membuktikan. Perbaikan = PR/PRD terpisah.
- **P0-3 (jam beku).** Belum ada kebijakan yang benar untuk dinyatakan (jam nyata vs jam
  perikatan) — itu keputusan produk di usulan tersendiri. Menulis uji sekarang berarti memutuskan
  kebijakan lewat uji.
- **Mendesain API pembuatan perikatan (P0-2).** Fase 2 menyatakannya di tingkat perjalanan
  pengguna, sengaja netral-desain. Fase 1 tidak menyentuh P0-2 karena setiap uji kontrak akan
  memaku satu desain (StateDoc vs tabel Prisma) sebelum PRD-nya ada.
- Temuan keamanan & fungsional lain dari evaluasi (H-1, H-2, F-1…F-9).
- Mengubah 8 spek e2e yang ada atau seed demo.

## 6. Constraints

- **Mesin lokal tak punya Docker maupun Postgres** (`docker`/`psql` tak ditemukan, 2026-11-26).
  Fase 2 karena itu hanya bisa dibuktikan merah **di CI**, lewat PR — itu tindakan keluar
  (push ke GitHub) yang butuh izin terpisah.
- R-7: `master` selalu hijau → karantina wajib, bertanggal.
- `bootstrapFirm` menolak bila DB sudah berisi firma (`EVALUASI-SAAS` A6) → firma segar tak bisa
  hidup di DB e2e yang sudah di-seed demo; butuh DB kedua.
- Ratchet `:any`: berkas uji baru harus bebas `any` (`typecheck:test` wajib).
- `migration/src/**` CRLF; uji `.ts` wajib bebas-`any` (memori `asseris-test-coverage`).

## 7. Existing Solutions

- `server/src/__tests__/stage1_data_isolation.test.ts` sudah membuat **dua firma non-demo**
  (`S1-FIRM-A/B`) dan memanggil router lewat `createCallerFactory` — pola itu dipakai ulang untuk
  G1-b, bukan ditulis baru.
- Uji frontend yang me-mock `api` dan merender hook sudah ada (mis. `persist_scope.test.ts`,
  `stage0_context_races_repro.test.ts`) — G1-a/G1-d mengikuti polanya.
- `e2e/helpers.ts` (`login`, `stateGetSafe`, `switchEngagement`, `gotoModule`) dipakai ulang di Fase 2.
- Yang **tidak cukup**: tak satu pun uji di atas memakai firma ber-id non-demo **bersama** frontend;
  stage1 hanya menguji server.

## 8. Proposed Approach

**Rekomendasi: dua lapis, bertahap — Fase 1 dulu, Fase 2 menyusul.**

| Opsi | Kelebihan | Kekurangan |
|---|---|---|
| A — Playwright saja | paling setia pada produksi; satu tempat | tak jalan di mesin ini; umpan balik hanya lewat CI (menit, bukan detik); P0 tercampur dalam satu perjalanan sehingga uji merah tak menunjuk cacat mana |
| B — vitest saja | jalan di `npm run verify`, detik; tiap uji menunjuk satu cacat | tak membuktikan perjalanan nyata; tak bisa menyatakan P0-2 tanpa memaku desain |
| **C — B lalu A** ✅ | B memberi gerbang cepat yang menunjuk tepat; A menangkap cacat integrasi yang lolos di antara unit | dua lapis untuk dirawat |

C dipilih karena perbaikan P0-1 dan P0-4 dapat langsung dibuktikan di lokal oleh Fase 1, sementara
Fase 2 menunggu PRD P0-2 dan izin push tanpa memblokir apa pun.

**Fase 2 — stack terpisah (bukan firma kedua di DB demo):** Playwright `project` kedua dengan
pasangan webServer sendiri (API `:5182`, web `:5183`) atas DB `neosuite_e2e_fresh`, menjalankan
`bootstrap` alih-alih `seed`. Alternatif yang lebih murah — menyuntik firma kedua ke DB demo — ditolak:
ia melewati `bootstrapFirm`, padahal jalur itulah yang dipakai pelanggan pertama.

## 9. Risks

| Risiko | Mitigasi |
|---|---|
| Uji karantina "lolos" karena alasan salah (mis. mock rusak) sehingga `it.fails()` hijau palsu | SC-3 uji mutasi wajib; SC-4 asersi prasyarat |
| Karantina menjadi permanen, dilupakan | tanggal di komentar; ditautkan dari PRD perbaikan tiap P0 |
| Fase 2 menggandakan waktu CI e2e | stack kedua hanya untuk satu spek; ukur di PR, laporkan angkanya |
| Memperbaiki P0-1 sebelum P0-4 membuka P0-4 yang kini tertutupi 403 (data demo mulai tertulis ke DB) | G1-d dibangun bersamaan dengan G1-a; PR perbaikan P0-1 wajib membalik keduanya |
| Port 5182/5183 bentrok di CI | dapat diubah via env seperti `E2E_API_PORT` |

## 10. Implementation Plan

| Fase | Isi | Dibuktikan di | Butuh |
|---|---|---|---|
| 1 | G1-a…G1-d + uji mutasi SC-3, satu PR | lokal (`npm run verify`) | "Proceed." |
| 2a | stack `fresh` (skrip start, project Playwright, langkah `createdb` di `e2e.yml`) + spek 09 langkah 1–2, 5 | CI | izin push / PR |
| 2b | spek 09 langkah 3–4 (perikatan & keanggotaan) | CI | sesudah PRD P0-2 menentukan desainnya — atau tetap `test.fail()` sebagai spesifikasi |

## 11. Open Questions

- **Q-1** — Setuju pendekatan C (Fase 1 dulu, Fase 2 menyusul)? *Rekomendasi: ya.*
- **Q-2** — Batas karantina: tanggal berapa? *Rekomendasi: 2026-12-31 — cukup untuk PRD P0-2 dan
  perbaikan P0-1/P0-4; bila lewat, karantina diperpanjang dengan alasan tertulis, bukan diam-diam.*
- **Q-3** — Fase 2 boleh dikirim sebagai PR draft ke GitHub agar CI membuktikan merahnya? (push = tindakan keluar)
- **Q-4** — Ikutkan F-1 (tabrakan id pengguna "Muhammad Rizk…") di langkah 4 perjalanan Fase 2,
  karena ia terjadi tepat di jalur onboarding? *Rekomendasi: tidak — catat sebagai uji terpisah di
  PR perbaikannya, agar gerbang ini tetap tentang identitas demo.*

---
**Sign-off:** "Proceed. Ikuti rekomendasi" — Ari, 2026-11-26. Q-3 tidak punya rekomendasi (ia
meminta izin tindakan keluar), jadi **belum dianggap dijawab**: Fase 2 menunggu izin push eksplisit.

## 12. Catatan eksekusi Fase 1 (2026-11-26, cabang `test/gerbang-firma-segar`)

**Berkas:** `migration/src/fresh_firm_gate.test.ts` — 7 uji: 4 prasyarat (wajib hijau) + 3 uji
cacat ber-`it.fails()` `// KARANTINA s/d 2026-12-31`.

**Seam:** transport `@trpc/client` di-mock; `hydrateCoreFromApi`, `useServerState`, dan
`AppProviders` NYATA. Server palsu menegakkan dua aturan server sungguhan (`cross-firm-state`,
`cross-firm-engagement`), jadi ia menolak tulisan firm-scope ke `FIRM-WHR` sama seperti produksi.

**G1-b tidak ditulis** — sisi server kontraknya sudah dipaku uji D3 di
`server/src/__tests__/stage1_data_isolation.test.ts:281-307` (tulis lintas-firma ditolak,
tulisan ke firma sendiri lolos). Menduplikasinya melanggar §7.

**SC-1 — merah tanpa karantina, di master `3de574c`, karena P0 yang dituju:**

| Uji | Pesan kegagalan |
|---|---|
| G1-a | `expected [ 'FIRM-WHR' ×7 ] to deeply equal [ 'FIRM-SEGAR' ×7 ]` |
| G1-c | `AMS.CLIENTS` = 8 id demo (`C-014` … `C-063`) setelah bundel ber-`clients: []` |
| G1-d | 8 klien demo + perikatan demo tampil, **dan tulisan `clients` pertama memuat id demo** |

**SC-3 — uji mutasi** (tambalan lokal, tak di-commit, berkas dipulihkan dari salinan cadangan):

| Tambalan | G1-a | G1-c | G1-d |
|---|---|---|---|
| `FIRM_SCOPE_ID = 'FIRM-SEGAR'` | **hijau** | merah | merah |
| buang penjaga `.length` di `api.ts:419/424/430` | merah | **hijau** | merah |
| + nilai awal `clients`/`engagements` = `[]` | merah | hijau | **hijau** |
| ketiganya sekaligus, versi karantina | `it.fails` **merah** | **merah** | **merah** |

Tiap uji hanya dibalik oleh tambalan cacatnya sendiri; baris terakhir membuktikan karantina akan
memaksa penggantian `it.fails → it` begitu cacatnya ditutup.

**Temuan selama eksekusi (jangan diulang):**

- Draf pertama G1-d **lolos vakum** pada separuh asersinya: tak ada tulisan sama sekali, karena
  pembaruan state di-flush saat `act` selesai sehingga timer debounce (400 ms) tercipta SESUDAH jam
  dimajukan. Pola stage0 (dua `act` terpisah) + asersi "tulisan `clients` benar-benar dicoba"
  menutupnya — dan baru setelah itu terlihat bahwa tulisan pertama memuat id demo.
- `it.fails()` juga lulus bila HARNESS-nya rusak. Karena itu tiap prasyarat (provider terpasang,
  bundel diterapkan, tulisan dicoba) diuji ulang di uji NON-karantina yang wajib hijau.
- Tambalan G1-d di atas (`[]` sebagai nilai awal) **bukan perbaikan yang sah**: firma demo saat ini
  bergantung pada nilai awal itu untuk menampilkan kliennya. Perbaikan sesungguhnya harus menjaga
  firma demo tetap terisi — mis. lewat data server, bukan konstanta frontend.

**Sisa:** Fase 2a/2b (Playwright, stack `bootstrapFirm` terpisah) menunggu izin push (Q-3) dan,
untuk langkah perikatan, PRD P0-2. *(Diselesaikan di §13.)*

## 13. Catatan eksekusi Fase 2 (2026-11-26, cabang `test/gerbang-firma-segar-fase2`, PR #400)

**Q-3 dijawab** oleh Ari: buktikan di CI lewat PR. Postgres 16 lokal ternyata ADA (service
`postgresql-x64-16`; §6 keliru karena binernya tak di PATH), tetapi kredensial e2e ditolak dan
tidak tercatat di repo — jadi tetap lewat CI.

**Stack (berkas):** `e2e/playwright.fresh.config.ts` (konfigurasi sendiri: `webServer` Playwright
berlaku global per jalan, bukan per project — §8 menyebut "project kedua", itu tak mungkin) ·
`start-api.mjs` `E2E_STACK=fresh` (`migrate reset` + `npm run bootstrap`, cwd `e2e/`) ·
`prepare-postgres.mjs` `resetFreshPostgres()` menolak DB tak berakhiran `_fresh` ·
`e2e/fresh-firm.mjs` (satu sumber identitas + penanda demo) · `start-web.mjs` `E2E_REUSE_BUILD` ·
`vite.config.mjs` preview `E2E_API_TARGET` · `e2e.yml` `CREATE DATABASE` + jalan kedua
(`!cancelled()`). Env `webServer` menimpa `DATABASE_URL` job — diverifikasi di
`playwright/lib/runner/index.js:858-861`, bukan diasumsikan.

**Spek `e2e/tests/09-fresh-firm.spec.ts`:** 5 prasyarat NON-karantina + langkah 1, 2, 3, 5
`test.fail()` `// KARANTINA s/d 2026-12-31` + langkah 4 `test.fixme`.

**Merah-dulu — dua jalan CI tanpa karantina:**

| Jalan | Langkah 1 | Langkah 2 | Langkah 3 | Langkah 5 |
|---|---|---|---|---|
| `5abbe17` | merah, **alasan SALAH** (timeout) | **LULUS — palsu** | merah (P0-2) | merah (P0-1) |
| `46f1fad` | merah (P0-4/P0-1) | merah (P0-1) | merah (P0-2) | merah (P0-1) |

Pesan kegagalan `46f1fad`:

| Langkah | Pesan |
|---|---|
| 1 | `chipHasOwnShort: false`, `firmNameShown: false`, 8 nama klien demo + "Hartono Wijaya" di layar; `crmRendered: true` |
| 2 | `PT Uji Segar Bertahan` tak terlihat dari sesi peramban baru |
| 3 | `engagement.list harus memuat perikatan untuk C-125` |
| 5 | StateDoc `clients`: `written: false`, `hasNewClient: false` |

**Temuan selama eksekusi (jangan diulang):**

- **Langkah 2 versi pertama lulus PALSU.** `page.reload()` memuat klien dari cache localStorage
  `ams.v1.*` walau server menolak tulisannya. Cache itu hanya offline-cache (AGENTS.md §3.3);
  "bertahan" harus dibuktikan dari konteks peramban baru (setara perangkat lain).
- **`settings` bukan rute hash.** Ia tak ada di `MODULE_INDEX`, sehingga `#/settings` diabaikan
  `app.tsx:222-223`; pintunya topbar "Tampilan" → "Semua Pengaturan…" (`shell.tsx:92, :535`).
  Kedua kesalahan alasan di atas akan LOLOS SENYAP di balik `test.fail()` — itulah gunanya jalan
  tanpa karantina dan prasyarat yang memaku pintu tiap langkah.
- Screenshot kegagalan pertama memperlihatkan P0-4 di layar: admin firma segar melihat "KLIEN
  AKTIF: Sentosa Makmur Tbk · ENG-2025-014", portofolio 6 perikatan demo, antrean EQR demo.

**Cacat baru (belum ada di evaluasi 2026-11-25):**

- `blankClient()` dan `ENGAGEMENT_FORM_INIT` memaku partner/manajer firma demo, plus tenggat
  2026-04-30 dan materialitas Rp 2 M (`view_firm.tsx:224, :235, :489, :523-524`). Klien pertama
  firma segar tersimpan dengan partner firma lain. Langkah 5 menangkapnya begitu P0-1 diperbaiki.
- `ClientCRM` membaca `clients[0].id` tanpa penjaga (`view_firm.tsx:23,31`) → firma tanpa klien
  crash di modul CRM begitu P0-4 diperbaiki. Langkah 1 menuntut `crmRendered: true`.

**Penyimpangan dari §4/§10 (disengaja):** langkah 4 `test.fixme`, bukan `test.fail()`. `users.invite`
ada (`router.ts:740`), tetapi tak ada API/UI penugasan staf ke perikatan (`engagementMember.create`
hanya `seed.ts:239` & `pilotProvision.ts:108`). Uji yang ditulis sekarang memakai selektor karangan
dan tetap merah sesudah perbaikan yang benar. Ditulis bersama PRD P0-2.

**Biaya CI:** jalan kedua ±40 dtk uji + `migrate reset`/`bootstrap` (SPA tak dibangun ulang,
`E2E_REUSE_BUILD=1`).

**Sisa:** langkah 4 (menunggu PRD P0-2). Begitu P0 diperbaiki, `test.fail` → `test` per langkah.
