# PRD — Identitas Ekspor Tersegel dari SSOT (firma & perikatan yang tak lagi dikarang)

> Wajib diisi sebelum implementasi apa pun. Implementasi TIDAK dimulai sebelum sign-off ("Proceed.").

| Field | Isi |
|---|---|
| Tanggal | 2026-08-21 |
| Pemilik | Ari Widodo |
| Status | In Progress |
| Sign-off | **2026-08-29, Ari Widodo — "sign off the PRD and land the export arc".** Q-1..Q-4 disetujui SESUAI REKOMENDASI PRD ini (§11); Q-5 bukan penghalang, masuk inventaris F-2. F-1 & F-2 MENDARAT bersama sign-off ini; F-3..F-5 belum. |
| Pemicu | Sapuan isolasi jalur TULIS lampiran (2026-08-20, commit `5d4a9af`) — klasifikasi sisa hit membuka kelas yang lebih besar di permukaan ekspor tersegel |
| Modul | `migration/src/export_pdf.ts` · `export_xlsx.ts` · `persist_scope.ts` · `contexts.tsx` + 123 call-site ekspor di ±60 view |
| Server | `server/src/router.ts` §`exporter.seal` / `exporter.logEvent` · `engagementAccess.ts` |
| PRD terkait | `docs/PRD-K06-ekspor-tersegel-massal.md` (Implemented — yang me-wire 43 tombol ekspor ini) · #265 (C-2, memperbaiki SATU call-site dan menyatakan sisanya perlu PRD) |
| Prasyarat | `master` + `5d4a9af` (`attachment_scope.ts` — pola penolakan yang dipakai ulang di sini) |

---

## 1. Problem

Asseris menandatangani artefak yang keluar dari sistem: `amsExportPdf` / `amsExportXlsx`
menghitung SHA-256 atas payload kanonik, meminta server menandatanganinya (Ed25519,
`exporter.seal`), menanam Seal ID + QR ke dalam berkas, dan menambahkan baris `SEAL` ke
rantai audit. Itu janji provenans: **berkas ini berasal dari sistem ini, atas perikatan
ini, dari firma ini.**

Empat kelas cacat membuat janji itu tidak dipenuhi — semuanya bentuk yang sama:
**artefak menyatakan identitas yang tidak pernah diturunkan sistem dari mana pun.**

### E-1 · scopeId perikatan yang DIKARANG (1 situs)

`migration/src/view_sa230.tsx:110` → dipakai di `:135`:

```ts
const eng = firm?.activeEngagement?.id || 'ENG-2025-014';
…
await amsExportPdf({ kind: 'sa230-memo', scope: 'engagement', scopeId: eng, … })
```

`scopeId` mengalir ke `exportSeal` (`export_pdf.ts:82`) → `api.exporter.seal.mutate` →
`createSeal` + `appendAudit({ action:'SEAL', scope, scopeId })` (`router.ts:738–747`).

Tanpa perikatan aktif, memo SA 230 klien mana pun **disegel dan dicatat di rantai audit
milik ENG-2025-014.** Server tidak menangkapnya: `assertEngagementAccess`
(`engagementAccess.ts:20`) hanya menolak perikatan lintas-firma atau non-anggota —
ENG-2025-014 adalah perikatan sah yang boleh diakses pengguna, jadi segelnya **berhasil**.
Ini kelas yang identik dengan cacat lampiran SA 580/SA 720 yang baru ditutup, hanya
artefaknya berbeda.

### E-2 · scopeId sintetis `'default'` (10 situs · 8 berkas)

`view_goingconcern.tsx:159` → `:236` · `view_icfr.tsx:147` → `:177` ·
`view_sa240.tsx:114` → `:144` · `view_sa530.tsx:61` → `:135` · `view_sa540.tsx:71` → `:126` ·
`view_serviceorg.tsx:169` → `:197` · `view_specifics2.tsx:253` → `:280` ·
`view_sa2comm.tsx:75/370/576` → `:98/390/598`

```ts
const engId = firm?.activeEngagement?.id || 'default';
```

`'default'` bukan perikatan mana pun, jadi ia tidak mencemari berkas klien lain — tetapi
ia **truthy**, sehingga `router.ts:735` tetap memanggil `assertEngagementAccess(user,'default')`.
Dua akibat, tergantung peran:

- Pengguna ber-`firmId` → `engagement.findUnique` gagal → `FORBIDDEN 'cross-firm-engagement'`
  → `exportSeal` melempar → `export_pdf.ts:84` menurunkan derajat ke **artefak TIDAK
  TERSEGEL** dengan alasan `'forbidden'`. Auditor tetap mendapat berkasnya, tanpa segel,
  dan halaman segelnya berbunyi *"peran tanpa kapabilitas ekspor"* — **diagnosis yang
  salah**: perannya baik-baik saja; perikatannyalah yang tak ada.
- Peran pengawasan tanpa `firmId` → `can(CAP.ENGAGEMENT_VIEW_ALL)` lolos lebih dulu
  (`engagementAccess.ts:30`) → segel + baris audit **yatim** pada scope yang bukan perikatan.

### E-3 · scopeId yang SELALU `undefined` (12 situs · 10 berkas)

```ts
scopeId: (window as { activeEngagement?: { id?: string } }).activeEngagement?.id
```

`view_cockpit.tsx:203` · `view_compliance.tsx:293` · `view_related.tsx:84` ·
`view_sa800.tsx:109,133` · `view_sa805.tsx:113,134` · `view_sa810.tsx:111,131` ·
`view_sjah3000.tsx:126` · `view_subsequent.tsx:59` · `view_lease.tsx:76` (varian
`((AMS as …).activeEngagement || {}).id`).

**Tidak ada satu pun penulis `window.activeEngagement` atau `AMS.activeEngagement` yang
tersisa di `migration/src`** — dilucuti window-strip; yang tersisa hanyalah pembacanya.
Verifikasi:

```bash
grep -rn "window.activeEngagement\s*=" migration/src   # nihil
grep -rn "AMS.activeEngagement\s*=" migration/src      # nihil
```

Jadi keduabelas ekspor ini **selalu** menyegel dengan `scope:'engagement'` dan
`scopeId: undefined` (skema server menerima keduanya secara terpisah — `router.ts:728–729`).
Segelnya sah, tetapi tidak melekat pada perikatan apa pun: `audit.history` sebuah
perikatan tidak akan pernah memuat artefak-artefak ini. Untuk laporan SA 800/805/810 —
laporan ber-opini yang keluar ke klien — ini kehilangan tepat pada berkas yang paling
perlu dilacak.

Ini bukan pilihan desain "sengaja tanpa scope": call-site-nya jelas BERMAKSUD menyertakan
perikatan, dan sudah gagal diam-diam sejak window-strip.

### E-4 · identitas firma literal — DAN segel yang tidak menutupinya

```bash
grep -rc "firm: 'KAP " migration/src   # 60 situs · 51 berkas
```

Ditambah 40 situs yang membaca SSOT tetapi menyimpan fallback literal
(`(AMS.FIRM as …)?.name || 'KAP Wijaya Hartono & Rekan'` ×17, `… || 'KAP'` ×8, dst).
Ini kelas C-2 yang #265 tutup untuk satu berkas dan nyatakan perlu PRD untuk sisanya.

Yang belum pernah dinyatakan, dan lebih penting daripada jumlahnya: **`firm` tidak berada
di dalam payload yang di-hash.**

- `export_pdf.ts:42–57` — `canonicalPayload` = `{ kind, title, refNo, meta, blocks }`.
  `firm` **tidak ikut**.
- `export_xlsx.ts:37–50` — `canonicalPayload` = `{ kind, title, sheets }`. `firm` **dan**
  `meta` tidak ikut; keduanya baru ditulis ke lembar "Segel" pada `:98–99`, setelah hash
  dihitung.

Akibatnya: sebuah artefak dapat mencantumkan nama firma apa pun di kepalanya, dan
verifikasi segel tetap **lulus**. Segelnya membuktikan isi tabelnya, bukan siapa yang
menerbitkannya. Pembaca berkas tak punya cara membedakan keduanya — dan justru identitas
penerbitlah yang membuat sebuah laporan audit berarti.

Kebalikannya berlaku untuk PDF: `refNo` dan `meta` **ikut di-hash**, dan di situlah
`engLabel = firm?.activeEngagement?.id || 'ENG-2025-014'` mendarat pada **20 situs**
(`goingconcern:238-239` · `icfr:179-180` · `sa240:146-147` · `sa530:137-138` ·
`sa540:128-129` · `serviceorg:199-200` · `specifics2:282-283` · `sa2comm:100-101/392-393/600-601`).
Di sini segel **memang** menutupi identitas perikatan yang dikarang — dan dengan begitu
memberinya otoritas.

Ringkas: segel menutupi identitas yang salah (perikatan) dan tidak menutupi identitas
yang perlu dijamin (firma). Cakupan segel tidak sejalan dengan apa yang dinyatakan
artefak di mukanya.

### E-5 · dua scopeId firma untuk satu firma (2 situs)

`view_platform3.tsx:94,222` memakai `scopeId: 'WHR'`, sementara SSOT
`persist_scope.ts:23` adalah `FIRM_SCOPE_ID = 'FIRM-WHR'` (dipakai `contexts.tsx:693`,
`view_dms.tsx:262`). Ekspor log audit firma karenanya tercatat pada scope yang berbeda
dari seluruh state firma. Sepele untuk diperbaiki, tetapi termasuk kelas yang sama:
identitas yang diketik, bukan dirujuk.

### Mengapa kelas ini bertahan

Karena `firm` dan `scopeId` adalah **parameter yang diisi pemanggil**. 123 call-site
mengisinya sendiri, masing-masing dengan ekspresi berbeda — inventarisnya:

```bash
grep -rhoE "scopeId: [^,}]*" migration/src --include=*.tsx | sort | uniq -c | sort -rn
#   20 scopeId: eng?.id          16 scopeId: undefined        13 scopeId: engId
#   11 scopeId: (window as …)     8 scopeId: activeEngagement?.id
#    4 scopeId: (firm as …)       2 scopeId: 'WHR'            1 scopeId: eng   …
```

Sembilan cara menuliskan satu fakta yang sama. Selama identitas adalah argumen, setiap
tombol ekspor baru adalah kesempatan baru untuk mengarangnya, dan tak ada gerbang yang
bisa membedakan "diisi benar" dari "diisi asal" tanpa memeriksa 123 ekspresi satu per satu.

---

## 2. Objective

**Setiap artefak yang keluar dari Asseris membawa identitas yang DITURUNKAN sistem, dan
segelnya menutupi identitas itu.**

Turunannya, dan alasan ini objective yang benar:

1. Identitas (firma, perikatan) berhenti menjadi argumen call-site → kelasnya tertutup
   secara struktural, bukan satu-per-satu. Ini satu-satunya bentuk perbaikan yang tidak
   akan kambuh pada tombol ekspor ke-124.
2. Tanpa perikatan aktif, ekspor berlingkup perikatan **menolak dengan jujur** — sama
   seperti jalur lampiran (`attachment_scope.ts`). Memilihkan perikatan, mengarang
   `'default'`, atau menyegel tanpa scope, ketiganya adalah cara berbeda untuk berbohong
   pelan.
3. Cakupan segel = yang dinyatakan artefak. Verifikasi yang lulus atas dokumen yang
   kepalanya keliru lebih buruk daripada tidak ada verifikasi: ia memindahkan beban
   ketelitian dari sistem ke pembaca, sambil meyakinkan pembaca bahwa ia tak perlu teliti.

Non-objective yang sengaja tidak dikejar: memperluas apa yang bisa diekspor, mengubah
tata letak artefak, atau menambah jenis ekspor baru.

---

## 3. Success Criteria

Terukur, dan tiap kriteria dipasangkan dengan cara membuatnya MERAH (anti-tautologi —
pelajaran #242: begitu literal jadi turunan, uji "turunan == turunan" selalu hijau).

| # | Kriteria | Cara membuktikan bisa merah |
|---|---|---|
| SC-1 | Nol literal nama firma di seluruh call-site ekspor (komentar dibuang). `grep -c "firm: 'KAP "` = **0** (baseline 60) | Sisipkan kembali satu literal ⇒ gerbang gagal |
| SC-2 | Nol literal `ENG-\d{4}-\d{3}` di payload ekspor (`refNo`/`meta`/`scopeId`). Baseline: 1 (E-1) + 20 (engLabel) | Mutasi sumber mengembalikan `\|\| 'ENG-2025-014'` ⇒ gagal |
| SC-3 | `firm` dan `scopeId` **tidak lagi diterima** dari call-site — menghapusnya dari tipe model, sehingga mengirimkannya = error `tsc`. `grep -c "firm: "` di call-site = 0 | Tambahkan `firm:` di satu call-site ⇒ `npm run typecheck` merah |
| SC-4 | `canonicalPayload` (pdf **dan** xlsx) memuat identitas. Uji: dua model identik yang berbeda HANYA pada nama firma menghasilkan `contentHash` **berbeda**; berbeda hanya pada scopeId juga berbeda | Kembalikan `pick` ke bentuk lama ⇒ kedua hash sama ⇒ gagal |
| SC-5 | Ekspor berlingkup perikatan TANPA perikatan aktif **menolak**: `exportSeal` tidak dipanggil, tidak ada berkas terunduh, pesan jujur ditampilkan | Uji perilaku: stub `exportSeal` + `doc.save`; tanpa perikatan keduanya nol panggilan |
| SC-6 | Nol pembaca `window.activeEngagement` / `AMS.activeEngagement` (baseline 12); gerbang melarang reintroduksi | Tambahkan satu pembaca ⇒ gerbang gagal |
| SC-7 | Satu scopeId firma. `grep -c "scopeId: 'WHR'"` = 0; seluruh scope firma memakai `FIRM_SCOPE_ID` | Ketik ulang `'WHR'` ⇒ gagal |
| SC-8 | Ekspor berlingkup perikatan MEMBAWA perikatan: untuk tiap `kind` ber-scope engagement, `scopeId` yang sampai ke `exporter.seal` sama dengan perikatan aktif — dua perikatan berbeda ⇒ dua scopeId berbeda | Kunci register ke konstanta ⇒ uji "dua perikatan ⇒ dua scopeId" gagal |
| SC-9 | Versi format segel dinaikkan & tercatat; artefak lama tetap dapat diverifikasi terhadap algoritma lamanya (lihat Risiko R-1) | Uji: segel v1 lama diverifikasi dengan payload v1, bukan v2 |
| SC-10 | `npm run verify` hijau; tidak ada `:any` baru tanpa baseline | — |

---

## 4. Scope

- `export_pdf.ts` & `export_xlsx.ts`: sumber identitas, cakupan `canonicalPayload`, jalur
  penolakan, versi segel.
- Modul SSOT baru untuk perikatan aktif yang dapat dibaca modul NON-REACT (lihat §8).
- `contexts.tsx`: satu penerbit ke register itu (satu-satunya penulis).
- 123 call-site ekspor: **penghapusan** argumen `firm`/`scopeId` (mekanis, dipandu `tsc`).
- 20 situs `engLabel` di `refNo`/`meta`: mengambil perikatan dari identitas terselesaikan.
- `view_platform3.tsx` (E-5).
- Gerbang repo + uji anti-tautologi untuk SC-1..SC-9.
- `docs/` — catatan format segel & migrasi.

## 5. Non-Scope

- **Verifikasi ulang / re-seal artefak yang sudah terbit.** Segel lama tetap sah menurut
  algoritma saat ia dibuat; tidak ada backfill.
- **Multi-firma / multi-tenant.** `AMS.FIRM` tetap firma tunggal; PRD ini tidak membuka
  jalan tenant kedua.
- **Penyeragaman tata letak artefak** (font, kolom, urutan blok).
- **`engLabel` yang hanya tampil di layar** (6 situs: `sa240:175`, `sa540:154`,
  `serviceorg:233`, `sa2comm:120/409/616`) dan 4 header display-only (`sa701:68`,
  `sa705:96`, `sa710:118`, `evidence:210`). Kosmetik; ikut bersih sendiri bila
  identitas terselesaikan sudah tersedia, tetapi bukan alasan PR ini ada.
- **Isi `meta` XLSX masuk hash** — dibahas sebagai Q-4, bukan diputuskan di sini.
- Perubahan RBAC atau kapabilitas `CAP.EXPORT`.

## 6. Constraints

- **Orang:** satu pelaksana (Ari + agen). Tidak ada reviewer kedua.
- **Sistem:** `master` selalu hijau (R-7). `npm run verify` = cermin CI; repro cacat
  merah tidak boleh dikirim.
- **Waktu:** tidak ada tenggat eksternal. Namun PR-2 menyentuh ±60 berkas sekaligus —
  ia harus mendarat sebagai satu PR mekanis, bukan dicicil, agar tidak ada jendela di
  mana separuh call-site memakai kontrak lama.
- **Regulasi/standar:** SA 230 (dokumentasi & retensi), ISQM 1 (mutu & jejak). Artefak
  audit yang sudah terbit tidak boleh berubah maknanya secara surut → R-1.
- **Teknis:** `export_*.ts` adalah modul NON-REACT; ia tidak bisa memanggil `useFirm()`.
  Ini kendala desain utama (§8).

## 7. Existing Solutions

| Sudah ada | Dipakai ulang? | Mengapa tidak cukup sendirian |
|---|---|---|
| `AMS.FIRM` (`data_part1.ts:7`) — SSOT nama/short/lisensi firma | **Ya**, jadi satu-satunya sumber `firm` | Tersedia, tetapi tidak WAJIB: 60 call-site memilih tidak memakainya |
| `persist_scope.ts` — `FIRM_SCOPE_ID`, `DEFAULT_ENG_ID`, `readPersisted` (pembaca non-React untuk canon) | **Ya**, register baru menempel pada pola yang sama | Tidak memuat perikatan AKTIF; `readPersisted` menerima `engagementId` sebagai argumen dari pemanggil |
| `attachment_scope.ts` (`5d4a9af`) — pola tolak-dengan-jujur + satu pintu | **Ya**, pola & pesan penolakan diseragamkan | Khusus lampiran; tidak menyentuh ekspor |
| `contexts.tsx` `FirmContext.activeEngagementId` | **Ya**, sebagai satu-satunya penulis register | Hanya terjangkau dari React |
| `exporter.seal` server + `assertEngagementAccess` | **Ya**, tak berubah | Otoritatif atas AKSES, buta terhadap KEBENARAN identitas — `ENG-2025-014` yang salah tetap perikatan yang boleh diakses |
| `docs/PRD-K06-ekspor-tersegel-massal.md` | Latar | Ia yang me-wire 43 tombol; kontrak identitasnya diwarisi apa adanya |

Tidak ada pustaka pihak ketiga yang relevan: masalahnya adalah kontrak internal antara
call-site dan helper ekspor, bukan kriptografi (Ed25519 + rantai hash sudah bekerja).

## 8. Proposed Approach

### Inti keputusan: identitas DITARIK helper, bukan DIDORONG call-site

Kendala sebenarnya adalah `export_*.ts` non-React. Tiga opsi dipertimbangkan:

| Opsi | Isi | Putusan |
|---|---|---|
| **A** — biarkan argumen, tambah gerbang | 123 call-site tetap mengisi `firm`/`scopeId`; gerbang regex melarang literal | **Ditolak.** Gerbang harus menebak niat 9 bentuk ekspresi. Tombol ke-124 tetap bebas salah. Memperbaiki gejala |
| **B** — register SSOT non-React + helper menarik identitas | `export_identity.ts` menyimpan perikatan aktif; `firm`/`scopeId` DICABUT dari tipe model | **Dipilih** |
| **C** — semua ekspor lewat hook React | `useExport()` membungkus helper | **Ditolak.** 123 call-site sebagian di handler non-komponen; menyeret React ke lapisan ekspor & memperbesar diff tanpa menutup kelasnya lebih baik dari B |

**Kritik jujur atas Opsi B:** ia memperkenalkan satu global baru, tepat ketika repo ini
sedang melucuti global (window-strip). Mitigasinya menentukan: modul **bertipe**,
**satu penulis** (efek di `FirmProvider`), **nol penulis lain** (ditegakkan gerbang), dan
nilainya **hanya boleh dibaca lewat fungsi yang bisa menolak** — bukan properti telanjang.
Ditukar dengan ini: 12 pembaca `window.activeEngagement` yang mati, 9 bentuk ekspresi
scopeId, dan 100 literal identitas semuanya lenyap. Perdagangan yang jelas menguntungkan
— dan register ini justru MENGGANTIKAN global lama yang sudah rusak diam-diam, bukan
menambah yang baru di atasnya.

### Bentuk yang diusulkan

```ts
/* export_identity.ts — SSOT identitas artefak (non-React) */
export function publishActiveEngagement(id: string | null): void;   // SATU penulis: FirmProvider
export type ExportIdentity =
  | { ok: true;  firm: string; scope: 'engagement'; scopeId: string }
  | { ok: true;  firm: string; scope: 'firm';       scopeId: string }
  | { ok: false; reason: string };
export function resolveExportIdentity(scope: 'engagement' | 'firm'): ExportIdentity;
```

- `firm` selalu `AMS.FIRM.name` — **tanpa fallback literal**. Bila SSOT kosong, ekspor
  menolak, bukan mengarang (presedens #265: berkas tersegel tak boleh mengarang identitas).
- `scope:'firm'` → `FIRM_SCOPE_ID` (menutup E-5).
- `scope:'engagement'` tanpa perikatan aktif → `{ ok:false }` → `amsExportPdf/Xlsx`
  **menolak sebelum menghasilkan berkas**, mengembalikan `{ sealed:false, refused:true, reason }`.
  Tidak ada unduhan setengah jadi, tidak ada segel yatim.
- Model ekspor kehilangan `firm` dan `scopeId`; `scope` tetap dipilih call-site (hanya
  call-site yang tahu apakah artefaknya milik perikatan atau firma). `tsc` menjadi alat
  migrasi: setiap call-site yang masih mengirim `firm`/`scopeId` gagal kompilasi.

### Cakupan segel

`canonicalPayload` (pdf & xlsx) ditambah `{ firm, scope, scopeId, sealFormat: 2 }`.
Konsekuensi: hash berubah untuk seluruh `kind` → **format segel v2**. Verifikasi memilih
algoritma payload berdasarkan `sealFormat` yang tersimpan pada rekaman segel (R-1).

### Urutan PR

| PR | Isi | Mengapa terpisah |
|---|---|---|
| **PR-1** | `export_identity.ts` + penerbit di `FirmProvider` + uji perilaku (termasuk penolakan) + gerbang "satu penulis" | Fondasi; berdiri sendiri, nol perubahan perilaku |
| **PR-2** | Helper menarik identitas; `firm`/`scopeId` dicabut dari tipe; **±60 berkas** call-site dibersihkan dipandu `tsc`; E-1/E-2/E-3/E-5 mati sekaligus | Mekanis & besar — harus atomik agar tak ada kontrak campuran |
| **PR-3** | `canonicalPayload` v2 + versi segel + jalur verifikasi dua-versi | Mengubah hash; risiko tertinggi, dipisah agar dapat di-rollback sendiri |
| **PR-4** | Jalur penolakan di UI (pesan + tombol nonaktif) untuk ekspor berlingkup perikatan | Menyentuh view; perlu tinjauan visual |
| **PR-5** | 20 situs `engLabel` → identitas terselesaikan; gerbang SC-1/SC-2/SC-6/SC-7 repo-lebar + anti-tautologi | Gerbang terakhir, setelah permukaannya bersih |

PR-1 dan PR-3 sepenuhnya dapat diuji tanpa UI. PR-2 tidak menambah perilaku apa pun —
ia hanya memindahkan dari mana identitas berasal.

## 9. Risks

| # | Risiko | Dampak | Mitigasi |
|---|---|---|---|
| **R-1** | **Hash berubah ⇒ segel lama tak terverifikasi.** SC-4 mengubah `canonicalPayload`; artefak yang sudah terbit dan diverifikasi ulang dengan algoritma baru akan tampak PALSU | Tinggi — artefak audit yang sah dinyatakan tidak sah adalah kegagalan terburuk dari fitur ini | `sealFormat` disimpan pada rekaman segel; verifikasi memilih algoritma per-versi. Uji: segel v1 + payload v1 tetap VALID setelah v2 mendarat. Ini SC-9, bukan catatan kaki |
| **R-2** | **Register menjadi basi** (perikatan berganti, penerbit tak jalan) ⇒ artefak disegel atas perikatan sebelumnya — cacat E-1 dalam bentuk baru | Tinggi; senyap | Penerbit adalah efek atas `activeEngagementId` yang sama dengan yang dipakai `useAmsPersist`. Uji: ganti perikatan ⇒ scopeId ekspor berikutnya ikut berubah (SC-8). Register menyimpan `null` saat provider dilepas |
| **R-3** | **PR-2 menyentuh ±60 berkas** ⇒ konflik dengan cabang lain; risiko penanda konflik ter-commit (pernah terjadi — `asseris-rebase-squash-stacked-prs`) | Sedang | Kerjakan saat tak ada arc lain berjalan; `grep -c "^<<<<<<< "` sesudah tiap rebase; PR-2 mendarat dalam satu hari yang sama dengan penulisannya |
| **R-4** | **Penolakan memblokir auditor** yang sebelumnya tetap mendapat berkas (tak tersegel) | Sedang | Hanya `scope:'engagement'` yang menolak; ekspor firma tak terpengaruh. Dalam praktik perikatan aktif SELALU ada (seed + `DEFAULT_ENG_ID`), jadi jalur ini langka — tepatnya sebabnya ia tak pernah ketahuan rusak |
| **R-5** | **Register = global baru** di repo yang sedang melucuti global | Sedang | Bertipe, satu penulis, dibaca hanya lewat fungsi yang bisa menolak, gerbang melarang penulis kedua. Ia mengganti global rusak (`window.activeEngagement`), bukan menambah |
| **R-6** | **Gerbang tautologis.** Setelah literal jadi turunan, uji "identitas == identitas" selalu hijau | Sedang — menciptakan rasa aman palsu | Tiap SC dipasangkan mutasi yang wajib memerahkannya (§3, kolom kanan). Pola `attachment_engagement_scope.test.ts` §3 |
| **R-7** | Ekspor yang memang HARUS tanpa scope (register lintas-perikatan) ikut tertolak | Rendah | 16 call-site sudah `scopeId: undefined` secara sadar; mereka memakai `scope:'firm'` atau scope dihilangkan — diinventarisasi di PR-2, bukan diasumsikan |

## 10. Implementation Plan

| Fase | Keluaran | Gerbang keluar |
|---|---|---|
| **F-0** Sign-off | "Proceed." + jawaban Q-1..Q-4 | — |
| **F-1** PR-1 | `export_identity.ts`, penerbit, uji perilaku + anti-tautologi | SC-5 (unit), SC-7, SC-8 (unit); `verify` hijau |
| **F-2** PR-2 | Identitas ditarik helper; ±60 berkas dibersihkan | SC-1, SC-3, SC-6; `verify` hijau; hitung literal = 0 |
| **F-3** PR-3 | `canonicalPayload` v2 + verifikasi dua-versi | SC-4, SC-9; uji "hash BERGERAK saat firma berubah" |
| **F-4** PR-4 | Penolakan terlihat di UI | SC-5 (UI), tinjauan visual, axe hijau |
| **F-5** PR-5 | `engLabel` → identitas; gerbang repo-lebar | SC-2; seluruh SC hijau; `verify` hijau |
| **F-6** Tutup | Catatan format segel di `docs/`; registri PRD → Implemented | Registri konsisten (`prd_registry.test.ts`) |

Tiap fase mendarat sebagai PR sendiri di `master` hijau. Bila F-3 bermasalah, F-1/F-2
tetap bernilai: E-1..E-3 dan E-5 sudah mati tanpa menyentuh hash sama sekali.

## 11. Open Questions

**Q-1 · Tanpa perikatan aktif: tolak, atau segel tanpa scope?**
*Rekomendasi: TOLAK.* Artefak berlingkup perikatan yang tak dapat menyebut perikatannya
adalah dokumen yang tak dapat diarsipkan ke berkas audit mana pun — persis kondisi 12
situs E-3 hari ini, dan hasilnya kehilangan senyap. Menolak membuat kondisinya terlihat
pada saat ia terjadi. Konsisten dengan jalur lampiran (`5d4a9af`).

**Q-2 · Artefak yang sudah terbit: diverifikasi ulang atau dibiarkan?**
*Rekomendasi: DIBIARKAN, dengan versi.* Segel membuktikan apa yang benar pada saat
penandatanganan. Menyatakan artefak lama "tidak sah" karena algoritmanya berkembang
adalah menghukum dokumen yang tidak bersalah. `sealFormat` per rekaman; verifikasi
memilih algoritmanya. Tidak ada backfill, tidak ada re-seal.

**Q-3 · `firm` masuk hash ⇒ perubahan nama firma mematahkan hash lama. Diterima?**
*Rekomendasi: DITERIMA.* Itu justru gunanya — hash HARUS bergerak ketika penerbitnya
berubah, kalau tidak ia tak menjamin identitas. Kasus ganti nama firma tertangani R-1
(versi + rekaman menyimpan nama saat penandatanganan).

**Q-4 · `meta` XLSX ikut di-hash?**
*Rekomendasi: YA, di PR-3 sekaligus.* Ketidaksejajaran pdf (meta ikut) vs xlsx (meta tak
ikut) tak punya alasan desain — ia kebetulan sejarah, dan justru ketidaksejajaran seperti
ini yang membuat "apa yang dijamin segel" tak bisa dijawab dengan satu kalimat. Menunda
berarti dua kali perubahan hash.

**Q-5 · Apakah 16 situs `scopeId: undefined` memang firm-scope?** — belum diverifikasi
satu per satu; inventarisasi masuk PR-2 (R-7). Bukan penghalang sign-off.

---

---

## 12. Sign-off & keadaan pelaksanaan (2026-08-29)

**Disetujui oleh Ari Widodo.** Q-1..Q-4 diputuskan **sesuai rekomendasi §11**:

| # | Putusan |
|---|---|
| Q-1 | **TOLAK** bila tak ada perikatan aktif. Memilihkan perikatan / `'default'` / segel tanpa scope adalah tiga cara berbeda untuk berbohong pelan. Sudah terpasang di F-1/F-2. |
| Q-2 | **DIBIARKAN, dengan versi.** Tidak ada backfill, tidak ada re-seal; `sealFormat` per rekaman. Mengikat F-3. |
| Q-3 | **DITERIMA** — hash HARUS bergerak saat penerbit berubah, kalau tidak ia tak menjamin identitas. Mengikat F-3. |
| Q-4 | **YA** — `meta` XLSX ikut di-hash, dikerjakan sekalian di F-3 agar hash berubah sekali saja. |
| Q-5 | Bukan penghalang. Inventaris 16 situs `scopeId: undefined` dikerjakan di F-2 (R-7). |

**Yang MENDARAT bersama sign-off ini: F-1 dan F-2 saja.**

- F-1 — `export_identity.ts` (register bertipe, satu penulis, pintu baca yang bisa
  menolak) + `contexts.tsx` sebagai satu-satunya penerbit.
- F-2 — identitas DITARIK helper; `firm`/`scopeId` dicabut dari `ExportModelBase`
  sebagai `?: never` sehingga mengirimnya = galat `tsc`; call-site dibersihkan.
  **E-1, E-2, E-3, E-5 mati.** SC-1 · SC-3 · SC-5 · SC-6 · SC-7 · SC-8 hijau.

**Yang BELUM, dan sengaja tidak diselipkan:**

- **F-3 (PR-3) — `canonicalPayload` v2.** Inilah yang membuat **SC-4 belum terpenuhi**:
  `firm` MASIH belum ikut di-hash, jadi keluhan inti E-4 — *"artefak boleh mencantumkan
  nama firma apa pun dan verifikasi segel tetap lulus"* — **masih berlaku hari ini**.
  Yang sudah tertutup adalah sumbernya (nama tak bisa lagi dikarang call-site), bukan
  cakupan segelnya. Jangan membaca F-2 sebagai "E-4 selesai".
- **F-4 (PR-4)** — jalur penolakan yang terlihat di UI (`emitExportRefusal` sudah
  disiarkan; toaster & tombol nonaktif belum ditinjau visual).
- **F-5 (PR-5)** — 20 situs `engLabel` di `refNo`/`meta` (**SC-2 belum**) + gerbang
  repo-lebar.
- **F-6** — registri PRD → `Implemented`.

Urutannya mengikat: F-3 mengubah hash dan harus dapat di-rollback sendiri.
