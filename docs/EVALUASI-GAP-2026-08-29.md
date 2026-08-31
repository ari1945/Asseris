# Evaluasi Gap Asseris — sapuan segar atas `master` (2026-08-29)

> Basis kode: `origin/master` = `052d6c9` (29 Ags 2026).
> Pendahulu: [`KEDALAMAN-158-MODUL-TERKINI.md`](KEDALAMAN-158-MODUL-TERKINI.md)
> (23 Ags, basis `4168e6c`) — dokumen itu kini tertinggal **38 commit / 255 berkas**,
> dan §5-nya di bawah menunjukkan empat dari lima prioritasnya sudah mati.
> Bukan PRD — sengaja tanpa awalan `PRD-` agar tidak masuk registri status (CLAUDE.md §7).

---

## 0 · Metode dan batasnya (baca dulu)

Dokumen ini **tidak** mengulang penilaian level L0–L5 per fitur. Yang dilakukan:

1. **Peta modul→berkas** diambil dari `lazy_views.tsx` (159 entri), digabung berkas
   pendamping (`view_x2.tsx`, `view_x3.tsx`, `view_x_parts.tsx`).
2. **Sinyal kode** dihitung setelah komentar blok dibuang: `amsExport*`/`amsPrintDoc`,
   `useAmsPersist`/`useServerState`, `WpPanel`/`useWpSignoff`, `can(CAP.`, elemen klik
   non-tombol, overlay rakit tangan, literal tanggal/nama/rupiah.
3. **Falsifikasi tangan.** Setiap baris tabel §3 dibuka kodenya; klaim yang tidak
   bertahan dicoret dan dipindah ke §4. Sinyal yang terbukti positif palsu dibuang —
   lihat kotak di bawah.
4. **Gerbang dijalankan sungguhan** di lingkungan cloud ini (§2), bukan diasumsikan.

**Positif palsu yang SUDAH dibuang dari tabel (jangan dihidupkan lagi):**

- `diagnostic`, `jet`, `forensic` — `exp=0` di berkas view, tetapi ekspor datang lewat
  `<DiagnosticPanel>` (`diagnostics_panel.tsx` → `amsExportXlsx`). Bukan gap.
- `crm`, `engagement` — `useAmsPersist=0`, tetapi penyimpanan berjalan lewat
  `useFirm().addClient/updateClient` (`view_firm.tsx:22, 215, 290`). Bukan gap persist.
- `reviewnotes` — persist lewat `addReviewNote/resolveReviewNote/updateReviewNote`
  (`view_workspace.tsx:67`). Bukan gap persist.
- `time` — persist lewat `addTimeEntry` (`view_timebudget.tsx:85`). Bukan gap persist.
- `travel`, `licensing` — 4 input tanpa persist, tetapi itu kalkulator per-diem
  transien (`view_bo3.tsx:281–287`); tak ada pertimbangan auditor yang hilang.

**Yang metode ini TIDAK bisa lakukan:** sinyal hanya membaca berkas view dan berkas
pendampingnya. Modul yang mesinnya di modul lain akan terlihat lebih dangkal daripada
kenyataannya — tiga kasus itu sudah ditemukan dan dibuang di atas, tetapi tidak ada
jaminan tak ada yang keempat. Empat belas berkas view dipakai lebih dari satu modul
(`view_firm` = crm+engagement, `view_pipeline` = pipeline+billing, `view_people` =
hcm+cpe+independence, `view_firmtreasury` = treasury+cashbank+fixedassets, dst.);
sinyalnya identik, jadi baris tabel untuk modul-modul itu tak bisa dipisahkan satu
sama lain tanpa membaca komponennya.

---

## 1 · Kondisi umum (terverifikasi)

| Aspek | Keadaan |
|---|---|
| Modul terdaftar | 159 entri `lazy_views.tsx` (158 `MODULES` + fallback) |
| Gerbang backend | **hijau penuh** — `tsc --noEmit` 0 error, 476/476 test lulus |
| Gerbang frontend | lint 0 · typecheck **4 error** · vitest 3.873/3.874 (11 berkas gagal *collect*) · build **gagal** — satu sebab, lihat §2 |
| Infrastruktur ekspor | matang (`export_pdf.ts`, `export_xlsx.ts`, `export_seal_payload.ts` + test); dipakai 88 dari 183 berkas view |
| a11y tombol ikon | praktis tertutup — 2 tombol ikon tanpa label tersisa (`view_docparts`, `view_mytasks`) |
| Rantai sign-off (`WpPanel`) | **15 dari 159** modul: sampling, goingconcern, jet, isak35, icfr, fsgen, expert, serviceorg, opening, sa240, sa250, sa260, sa265, sa530, sa540 |
| Modul tanpa ekspor apa pun | **57** |
| Modul tanpa persist apa pun | 43 |
| Elemen klik tanpa `role`/`tabIndex`/`onKeyDown` | **301 elemen di 117 modul** |
| Overlay dirakit tangan | 13 modul |
| Utang tipe | 7.550 `:any` di 231 berkas (baseline ratchet) · 425 pembacaan `window.*` di 75 berkas view · 27 entri `any` di `app-globals.d.ts` |

---

## 2 · Kendala cloud yang harus dibereskan lebih dulu (P0)

`migration/package.json:32` menarik `xlsx` dari `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`.
Host itu **ditolak kebijakan proxy** sesi cloud (403 pada CONNECT; terekam di
`$HTTPS_PROXY/__agentproxy/status` sebagai `connect_rejected`), sehingga `npm ci` di
`migration/` gagal seluruhnya dan **tidak ada** gerbang frontend yang bisa jalan.

Batasnya diuji dengan memasang seluruh dependensi **kecuali** `xlsx`:

| Gerbang | Hasil | Catatan |
|---|---|---|
| `eslint src` | ✅ bersih | |
| `tsc --noEmit` | ❌ 4 error | semuanya `TS2307 Cannot find module 'xlsx'` — `export_xlsx.ts:32`, `wedge/export_wp.ts:37`, `wedge/import_parse.ts:189`, `wedge/sample_workbook.ts:15` |
| `vitest run` | ⚠️ 3.873 lulus / 1 gagal; **11 berkas gagal *collect*** | rantai impor `xlsx` |
| `vite build` + `check-bundle` | ❌ gagal | rollup tak dapat me-resolve `xlsx` |

Backend tidak terpengaruh: `npm install` di `server/` lancar (registry npm ter-*allowlist*),
`tsc --noEmit` 0 error, 476/476 test lulus. `jspdf` juga dari registry npm →
**jalur ekspor PDF bisa dikembangkan dan diuji penuh di cloud; jalur XLSX tidak.**

**Opsi perbaikan:** (a) *allowlist* `cdn.sheetjs.com` pada network policy environment, atau
(b) vendor tarball-nya ke dalam repo. **Jangan** turunkan ke `xlsx@0.18.5` dari registry npm
(versi tertinggi yang ada di sana) — itu memulihkan CVE-2023-30533 yang sudah terlewati.

Sampai itu beres, alur kerja cloud yang aman: validasi lokal dengan **lint + typecheck +
vitest** (tanpa `xlsx` terpasang), lalu serahkan `build` + budget bundle ke CI GitHub
Actions, yang masih bisa menjangkau CDN itu (master hijau membuktikannya).

---

## 3 · Tabel modul yang masih bergap

Legenda aman-cloud:

- **🟢** perbaikan murni `migration/src` (+ pendaftaran kunci di `server/src/stateAccess.ts`
  bila menambah state); tervalidasi lint+typecheck+vitest di cloud, build/budget ke CI.
- **🟡** menyentuh `export_xlsx.ts`/`wedge/` → tak bisa di-typecheck maupun di-build di
  cloud sampai §2 selesai; hanya CI yang bisa memvalidasi.
- **🔴** butuh migrasi Prisma / e2e Postgres / keputusan produk — bukan pekerjaan cloud.

Menambah persist **tidak** butuh migrasi skema: `state.get/set` sudah ada. Tetapi kunci
baru harus diklasifikasikan di `server/src/stateAccess.ts` (`FIRM_STATE_READ_KEYS`) atau
diberi scope engagement/user — dan berkas itu ikut tercakup gerbang server yang hijau di
cloud, sehingga tetap 🟢.

### A · Gap keluaran — tak ada artefak, tak ada tempat kesimpulan auditor

| Modul | Grup | Gap terverifikasi | Aman |
|---|---|---|:--:|
| `spr2400` SPR 2400 Reviu | SA · Area Khusus | Radio kesimpulan (`spr2400-concl`, `view_spr2400.tsx:422`) hanya `useState` lokal → hilang saat refresh; nol ekspor. *Cacat materialitas 900/675 versi E-9 SUDAH TERTUTUP* | 🟢 |
| `workpapers` Working Papers | 2 · Pelaksanaan | **31 kontrol input**, persist ada, **nol ekspor** — modul kertas kerja tak dapat menerbitkan kertas kerjanya | 🟢 |
| `ojkfiling` e-Filing OJK/BEI | OJK | 137 baris; nol persist, nol ekspor. Sumber `AMS_CANON.ojkFiling()` sudah benar | 🟢 |
| `pppk` Pelaporan PPPK | Mutu & Regulasi | `PPPK_REPORT` masih seed di view; nol persist, nol ekspor | 🟢 |
| `asersi` Matriks Asersi | 2 · Pelaksanaan | SSOT materialitas sudah benar (`useMateriality`×3), tetapi matriks tak bisa dikeluarkan maupun ditandatangani | 🟢 |
| `revenue` Pendapatan Firma | Keuangan Firma | Nol persist, nol ekspor. *Faktor fiktif ×0,74/0,32 SUDAH DICABUT* | 🟢 |
| `segmen` · `assoc` · `newdisc` | PSAK & SAK | State lokal hanya tab (`useStateSG/AS/ND`); tak ada perekaman pertimbangan, tak ada ekspor. *`newdisc` sudah tertaut WTB (#321)* | 🟢 |
| `regref` Registri Regulasi | SDM & Kepatuhan | Modul baru (#259) — nol persist, nol ekspor | 🟢 |
| `dataflow` Alur Data | Manajemen Praktik | Nol persist/ekspor + 5 elemen klik non-tombol | 🟢 |
| `legal` Kontrak & Legal | Operasi Firma | Nol persist/ekspor + 5 elemen klik non-tombol | 🟢 |
| `settings` (18 input) · `clientportal` · `tasks` · `dms` · `invprop` · `restatement` · `scheduler` · `framework` · `sa580` · `sa710` · `sa720` · `spr2410` · `disclosure` · `sjah3400/3402/3410/3420` · `sustain` · `sectorck` · `auditcomm` · `duediligence` · `personal` · `ethics` · `hrcase` · `teamindep` · `relatedsvc` · `assurance` | lintas grup | Persist jalan, **ekspor nihil** — bagian dari total **57 modul tanpa ekspor** | 🟢 |

### B · Gap masukan / aksi palsu

| Modul | Gap terverifikasi | Aman |
|---|---|:--:|
| `mgmtletter` Management Letter | Keputusan (`stage`/`decisionDate`/`decisionBy`) hanya data seed — auditor tak punya jalan merekamnya; `view_final3.tsx:285` sekadar menampilkan. Dua aksi `alert('… (mock)')` di `:393–394` | 🟢 |
| `crm` · `engagement` | Daftar Partner/Manajer di form **hardcode 3 nama** (`view_firm.tsx:233, 489, 523–524`) alih-alih ditarik dari `TEAM` | 🟢 |
| `internalaudit` | `IA_FACTORS_SEED`, `IA_USE_AREAS`, `IA_REPERF` masih hidup — evaluasi SA 610 seluruhnya seed karangan | 🟢 |
| `icfr` | `IC_CYCLES` (2 situs) + literal `'Rp 842 M'` masih hidup; matriks siklus tak tertaut WTB | 🟢 |
| `fsgen` | Periode dokumen literal `FY2025` (2 situs) | 🟢 |

### C · Identitas karangan di jejak audit (P0 integritas)

| Modul | Gap terverifikasi | Aman |
|---|---|:--:|
| ~~`dms` Manajemen Dokumen~~ **TERTUTUP** | `logAccess()`, `toggleHold()` dan `owner`/`versions[].by` menulis **`'Anindya Pramesti'`/`'Legal KAP'` tetap**; berkas ini tak mengimpor `useAuth` sama sekali. Ditutup: pelaku kini dari `sessionActor(auth && auth.user)` (aturan bersama `session_actor.ts`), tanpa pelaku sesi keempat kontrol tulisnya dimatikan dengan alasan tertulis. Gerbang sumber: `dms_conventions.test.ts` | ✅ |
| `mgmtletter` | `decisionBy: 'Linda Wijaya (Manager)'` di **11 situs** `view_final3.tsx` | 🟢 |
| `sa200` · `sa800` · `sa805` · `sa810` | Tanda tangan `'Hartono Wijaya'` hardcode di badan laporan (1 situs per berkas) | 🟢 |
| `reviewnotes` | Peta nama→peran hardcode 6 nama (`view_workspace.tsx:39–44`) alih-alih `TEAM` | 🟢 |
| `crm` · `engagement` | Lini masa dengan tanggal literal `'2026-03-02'`… dan pelaku `'Anindya P.'`/`'Hartono W.'`/`'Sari D.'` (`view_firm.tsx:43–46`) | 🟢 |

### D · UI/UX lintas-modul

| Temuan | Sebaran | Aman |
|---|---|:--:|
| Elemen klik tanpa `role`/`tabIndex`/`onKeyDown` — tak terjangkau keyboard dan lolos gerbang axe `button-name` | **301 elemen di 117 modul**; terpadat: `programme` 12 · `firmfinance` 9 · `crypto` 9 · `approvals` 8 · `onboarding` 7 · `nonaudit`/`review2400` 7 · `tax` 7 · `pdp` 7 · `dashboard` 6 · `related` 6 · `dms` 6 | 🟢 (sapuan bertahap) |
| Overlay dirakit tangan (`position:'fixed', inset:0`) alih-alih `<Overlay>` — kehilangan focus-trap, Escape, scroll-lock counter (melanggar CLAUDE.md §5) | 13 modul: `onboarding` `firmfinance` `governance` `nonaudit` `review2400` `soqm` `tax` `templates` `crypto` `pdp` `payroll` `approvals` `audittrail` | 🟢 |
| `window.useAmsPersist` masih dipanggil **89× di 45 berkas view** — tidak ada di daftar dual-publish CLAUDE.md §3.1, bertipe `any` di `app-globals.d.ts`. Dipublikasikan dari `contexts.tsx:934` | 45 berkas | 🟢 |
| Sisa kopling `window.*` lain di view: `loadLS` 27 · `LINEAGE` 15 · `RETENTION` 10 · `compliancePct` 9 · `MODULE_INDEX` 9 · `FIRMOPS` 9 · `TAX23` 8 · `IRM` 5 | 75 berkas view | 🟢 |
| Rantai sign-off hanya di 15 dari 159 modul (sebagian modul admin firma memang tak memerlukannya — angka ini batas atas kebutuhan, bukan daftar tugas) | — | 🟢 |
| Menambah ekspor **XLSX** untuk modul mana pun | — | 🟡 |
| React 18→19 · Prisma 6→7 · TS 6→7 · Vite 5→8 ([`UPGRADE-BACKLOG.md`](UPGRADE-BACKLOG.md)) | — | 🔴 |

---

## 4 · Cacat yang SUDAH tertutup — jangan dikirimi orang

Empat dari lima rekomendasi teratas [`KEDALAMAN-158-MODUL-TERKINI.md`](KEDALAMAN-158-MODUL-TERKINI.md)
§5/§7 sudah mati di `052d6c9`:

| Modul | Klaim dokumen 23 Ags | Keadaan sekarang | Vonis |
|---|---|---|---|
| `spr2400` | Materialitas hardcode 900/675 jt; `useMateriality` nol panggilan | Literal `900`/`675` **hilang**; penyempitan materialitas dilakukan sendiri dan dijelaskan di komentar `:29, :42` | **TERTUTUP** |
| `invprop` | Portofolio literal di view; nol persist; nol tautan WTB | `useAmsPersist('invprop.v1')` `:203` + WTB perikatan aktif `:208` | **TERTUTUP** |
| `newdisc` | Angka ETR hardcoded lokal | `useAudit().wtb` dipakai (3 situs) — #321 | **TERTUTUP** |
| `revenue` | Roll-forward dari faktor fiktif ×0,74/0,32 | Faktor hilang; baris tanpa dasar kini ditandai "belum terukur"/"belum ditetapkan" dan dikeluarkan dari total | **TERTUTUP** |
| `sjah3400` | Kunci `pfi3400.exec` FIRM-scope, bocor lintas perikatan | Kunci sudah engagement-scope (`ams.v1.engagement.<engId>.pfi3400.exec`) | **TERTUTUP** |
| `internalaudit` · `icfr` · `mgmtletter` · `dms` · `sa200/800/805/810` · `fsgen` | berbagai | Literal buktinya **masih hidup** — lihat §3 B & C | **BERLAKU** |

---

## 5 · Urutan yang disarankan

1. **§2 — dependensi `xlsx`.** Prasyarat; tanpa ini tak ada perbaikan frontend yang bisa
   divalidasi utuh di sesi cloud.
2. ~~**`dms` identitas sesi** (§3 C).~~ **SELESAI** — pelaku ditarik dari sesi lewat
   `session_actor.ts` (aturan yang sama yang sudah dipakai posting jurnal firma), dan
   aksi tulis tanpa identitas sesi kini ditolak alih-alih dicatat atas nama tebakan.
   Catatan lingkup: yang diperbaiki adalah atribusi pada indeks dokumen firm-scope
   (`dms.v2`) — jejak kriptografis server (`audit/log.ts`) adalah lapisan terpisah dan
   tak tersentuh perubahan ini.
3. **`spr2400` + `workpapers`** (§3 A). Persist kesimpulan + ekspor PDF; keduanya jalur
   `jspdf` yang bisa diuji penuh di cloud hari ini.
4. **Sapuan a11y elemen klik** (§3 D), mulai dari delapan modul terpadat.

Butir 2–4 seluruhnya 🟢: tak menyentuh skema Prisma, tak butuh Postgres e2e, dan tidak
menunggu keputusan produk.

---

_Dihasilkan dari sapuan sinyal + falsifikasi tangan atas `052d6c9`. Kolom "aman" mencerminkan
keadaan gerbang di §2 pada tanggal dokumen ini; bila `xlsx` sudah dibereskan, seluruh 🟡
menjadi 🟢._
