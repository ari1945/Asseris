# Gelombang W1 — identitas karangan di dalam artefak TERSEGEL

> 🔴 **GELOMBANG INI DITAHAN — kecuali W1-E** (keputusan Ari, 2026-08-28).
>
> Sesudah brief ini ditulis, ditemukan bahwa **28 dari 32 berkasnya sudah dikonversi**
> di `claude/intelligent-keller-7b28db`, memakai arsitektur **kebalikan** dari yang
> dianjurkan di sini: identitas **DITARIK** eksporter dari SSOT (`export_identity.ts`),
> dan argumen `firm:`/`scopeId:` **dicabut** dari call-site. PRD-nya,
> `docs/prd-export-seal-identity-ssot.md` (Draft, di cabang itu), melingkupi 123
> call-site di ±60 view — dibanding 32 berkas di sini.
>
> **§2 di bawah karena itu SALAH sebagai anjuran.** `useFirmName()` per call-site
> memang benar untuk `view_firmtreasury`, tetapi sebagai pola untuk 123 call-site ia
> justru cacat yang PRD itu bantah: *"tombol ekspor ke-124 bebas mengarangnya lagi."*
>
> Yang tetap SAHIH di berkas ini: sensus cacatnya, nomor barisnya (per `8a8cc54`),
> temuan `window.activeEngagement` sebagai hantu, dan ketiga kopling di §5–§6
> (ratchet `:any` dua arah, gerbang paku `spr2400_conventions`, identitas
> `view_cockpit.tsx`). Semuanya dipertahankan sebagai temuan, bukan perintah kerja.


> Dibuat 2026-08-27; **diverifikasi ulang 2026-08-28 terhadap `origin/master` = `8a8cc54`**
> (sesudah gelombang W0 tuntas: #318 · #319 · #320 · #321 · #322 · #326).
> Berkas ini adalah **brief kelas** yang dibaca kedelapan prompt W1-A … W1-H.
> Ia BUKAN prompt; jangan dikirim sendirian ke sesi.

---

## 1 · Cacatnya, dalam satu kalimat

> 🔴 **KOREKSI 2026-08-28 — versi lama bagian ini SALAH SECARA FAKTA.**
> Ia berbunyi: *"Tombol ekspor … membangun payload yang disegel Ed25519 … tetapi tiga
> bidang identitas **di dalam payload itu** dikarang."* **Nama firma tidak pernah ikut
> di-hash.** Diverifikasi di master:
>
> ```
> export_pdf.ts   canonicalPayload = { kind, title, refNo, meta, blocks }   ← firm TIDAK ikut
> export_xlsx.ts  canonicalPayload = { kind, title, sheets }                ← firm & meta TIDAK ikut
> ```
>
> Klaim "literal firma DI DALAM payload tersegel" karena itu **tidak benar untuk kedua
> format**, dan untuk XLSX `meta` pun tidak tersegel. Rumusan yang benar ada di bawah.

Tombol ekspor di puluhan modul membangun artefak yang **disegel Ed25519** dan **dicatat
ke jejak audit server**, tetapi identitas yang dibawanya dikarang di dalam view alih-alih
ditarik dari SSOT. **Cakupan segelnya tidak sejalan dengan apa yang artefak nyatakan di
mukanya** — dan justru ketidaksejajaran itu yang membuat kelas ini berbahaya:

| Bidang | Bentuk cacatnya | Ikut di-hash? | Akibat |
|---|---|---|---|
| Penerbit | `firm: 'KAP Wijaya Hartono & Rekan'` literal / fallback | **TIDAK** (pdf & xlsx) | Artefak boleh mencantumkan nama firma apa pun di kepalanya dan **verifikasi segel tetap LULUS**. Segelnya membuktikan isi tabel, bukan siapa yang menerbitkannya — padahal identitas penerbitlah yang membuat laporan audit berarti. |
| Perikatan (di `meta`) | `'ENG-2025-014'` literal / fallback | **YA di PDF**, tidak di XLSX | Di PDF, segel **menutupi** nomor perikatan yang dikarang — dan dengan begitu **memberinya otoritas**. |
| Perikatan (`scopeId`) | fallback / `undefined` | — (bukan payload) | Diteruskan ke `exportSeal` + `exportLogEvent`: segel & baris audit permanen mendarat pada perikatan yang salah, atau pada tak-satu-pun. |
| Klien | `firm?.activeClient?.name \|\| 'PT Sentosa Makmur Tbk'` | ikut `meta` (pdf) | Sama dengan baris perikatan. |

Dan satu varian yang lebih buruk lagi (kelas **scopeId hantu**, §3 di bawah).

**Mengapa ini bukan cacat kosmetik:** `export_pdf.ts:82` dan `:191` meneruskan
`scope`/`scopeId` ke `exportSeal` dan `exportLogEvent`. Yang mendarat bukan piksel,
melainkan **baris jejak audit permanen** yang menyatakan siapa menerbitkan apa untuk
perikatan mana. Salah di sini tidak bisa dicabut belakangan.

> ℹ︎ Analisis yang jauh lebih lengkap atas kelas ini — termasuk kelas `\|\| 'default'`
> yang membuat artefak **diam-diam tidak tersegel** — ada di
> `docs/prd-export-seal-identity-ssot.md` (cabang `claude/intelligent-keller-7b28db`).

---

## 2 · SSOT-nya SUDAH ADA — jangan bikin yang baru

`migration/src/firm_identity.ts` sudah mendarat di master, punya ujinya sendiri
(`firm_identity.test.ts`), dan **tidak boleh diubah oleh prompt mana pun di gelombang
ini**. Ia mengekspor:

```ts
export function firmNameFrom(auth: FirmIdentitySource | null | undefined): string
export function useFirmName(): string   // '' = identitas tak tersedia
```

Kepala berkasnya menyatakan kontraknya dengan tegas, dan kontrak itu **mengikat**:

> Mengembalikan `''` bila tak ada sumber yang menyebut nama. Pemanggil WAJIB
> memperlakukan `''` sebagai "tidak dapat diterbitkan", bukan sebagai nama kosong.
> … Dan tentu tidak ada fallback literal: **menyegel nama firma yang dikarang lebih
> buruk daripada tidak menyegel sama sekali.**

**Presedens yang sudah mendarat dan WAJIB kamu tiru** — `view_firmtreasury.tsx`
(tiga tombol, tiga modul: treasury · cashbank · fixedassets):

```tsx
import { useFirmName } from './firm_identity';
// …
const firmName = useFirmName();
// …
await amsExportXlsx({ /* … */ firm: firmName, /* … */ });
// …
<Btn sm disabled={!firmName || ekspor.fase === 'busy'} onClick={onExport}
     title={firmName ? 'Ekspor …' : 'Identitas firma tak tersedia — kertas kerja tidak disegel tanpa penerbit'}>
```

Baca `view_firmtreasury.tsx:131`, `:165`, `:187` sebelum menulis satu baris pun.
Bentuk itulah yang direviu dan diterima; jangan mengarang bentuk kelima.

---

## 3 · Kelas kedua — `scopeId` hantu (hanya di sebagian paket)

Delapan berkas menulis:

```ts
scopeId: (window as { activeEngagement?: { id?: string } }).activeEngagement?.id
```

**`window.activeEngagement` TIDAK PERNAH DITULIS di mana pun dalam repo ini.**
Buktikan sendiri sebelum percaya:

```
git grep -nE "window\.activeEngagement *=" -- migration/src server/src   # → nol hasil
```

Jadi ekspresi itu **selalu** `undefined`. `as` adalah satu-satunya alasan kompilator
diam. Konsekuensinya bukan "scope kosong yang tak berbahaya" — di
`server/src/router.ts:735`:

```ts
if (input.scope === 'engagement' && input.scopeId) {
  await assertEngagementAccess(ctx.user, input.scopeId);
}
```

Dengan `scopeId` `undefined`, **penjagaan akses perikatan dilewati seluruhnya**, lalu
segel dan `logEvent` tetap terbit dengan `scope:'engagement'` tanpa perikatan. Artefak
mengklaim lingkup yang tak pernah diperiksa.

Obatnya **bukan** memilihkan sebuah perikatan (itu cacat #317 yang sudah ditutup).
Obatnya sama dengan `attachment_scope.ts`: **tanpa perikatan aktif ⇒ TOLAK
menerbitkan**, dan katakan alasannya di UI. Baca `migration/src/attachment_scope.ts`
dan `view_sa580.tsx` (hasil PR #317, `405cc67`) sebagai presedens perilaku.

Perikatan aktif dibaca dari `useFirm().activeEngagement` — bukan dari `window`.

---

## 4 · Kelas ketiga — fallback perikatan/klien yang MENGARANG (hanya W1-D & W1-F)

```ts
const client = firm.activeClient    || { name: 'PT Sentosa Makmur Tbk' };
const eng    = firm.activeEngagement || { id: 'ENG-2025-014', fy: 'FY2025' };
// …
scopeId: eng?.id     // ← JALUR TULIS: kertas kerja mendarat di berkas audit klien LAIN
```

Ini kelas **WRITE-PATH** — bukan salah di layar, melainkan **arsip di berkas yang
salah**, lengkap dengan segel dan jejak audit yang menyatakannya sah. RBAC server
tidak akan menangkapnya: `ENG-2025-014` adalah perikatan sah yang boleh diakses
pengguna, jadi tulisannya diterima dan tercatat.

Perlakuan sama dengan §3: **tolak, jangan pilihkan.**

---

## 5 · Larangan yang berlaku untuk SELURUH gelombang W1

⛔ **Jangan menyentuh berkas milik paket lain.** Delapan paket berjalan PARALEL di sesi
terpisah. Daftar kepemilikan berkas ada di kepala tiap prompt. Menyentuh berkas
tetangga = konflik merge yang menghanguskan kerja sesi lain.

⛔ **Jangan mengubah** `firm_identity.ts` · `firm_identity.test.ts` ·
`attachment_scope.ts` · `export_pdf.ts` · `export_xlsx.ts` · `contexts.tsx` ·
`server/src/router.ts`. Semuanya dipakai bersama kedelapan paket. Kalau kamu yakin salah
satunya harus berubah — **BERHENTI dan laporkan**, jangan ubah.

⛔ **Jangan memasang gerbang sensus repo-wide** ("nol literal `KAP Wijaya` di seluruh
`migration/src`"). Gerbang seperti itu akan MERAH karena kerja paket lain yang belum
mendarat, dan akan membuat `master` merah bergantian. Gerbangmu hanya boleh memindai
**berkas milik paketmu**. Sensus repo-wide adalah PR penutup tersendiri sesudah
kedelapan paket mendarat.

⛔ **Jangan menyentuh** `migration/eslint-suppressions.json` — dan ini titik konflik
paling nyata di gelombang ini, jadi baca alasannya.

**KE-32 berkas W1 punya entri suppression `@typescript-eslint/no-explicit-any` dengan
`count` BER-JUMLAH TEPAT** di berkas bersama itu (mis. `view_psak71.tsx` count=44,
`view_cockpit.tsx` 59, `view_relatedsvc.tsx` 76).

`npm run verify` memerah untuk **kedua arah**, lewat DUA gerbang yang berbeda —
jangan tertukar:

| Arah | Gerbang | Bunyinya |
|---|---|---|
| `:any` BERTAMBAH | langkah `frontend :any ratchet` → `scripts/check-any-ratchet.mjs` | plafon TOTAL `CEILING = 8174`; skripnya sendiri menyebut dirinya "satu arah: turun boleh, naik tidak" |
| `:any` BERKURANG | langkah `frontend lint` → `eslint src` polos | `There are suppressions left that do not occur anymore.` — **exit 2** |

Baris kedua itu **diuji langsung** (2026-08-28, worktree terisolasi: `count` untuk
`src/view_sa200.tsx` dinaikkan 3→8, lalu `eslint src/view_sa200.tsx` → exit 2).
Jadi mencabut satu `:any` TANPA menyelaraskan baseline **memerahkan `npm run verify`** —
bukan lewat ratchet totalnya, yang justru menyambut penurunan.

Artinya: **setiap paket yang mengubah jumlah `:any` di berkasnya WAJIB menyentuh satu
berkas bersama** — dan delapan paket yang menyentuhnya berbarengan akan bertabrakan.
Aturannya karena itu:

1. Selesaikan dengan **tipe yang benar**, bukan `:any` baru, dan **jangan mencabut
   `:any` yang sudah ada** kecuali perbaikanmu memang mustahil tanpa itu.
2. Bila perbaikanmu MEMAKSA jumlahnya berubah (kasus yang diketahui: `view_psak71.tsx:137`
   `const FIRM: any`, paket W1-H) — **BERHENTI, laporkan berapa jumlah barunya, dan
   jangan sunting baseline.** Penyelarasan baseline dikumpulkan jadi satu PR kecil
   di akhir gelombang, bukan delapan PR yang saling menimpa.

⛔ **Jangan menyelipkan** arc `docs/prd-firm-erp-deepening.md` (PR-2..PR-6) atau
`delivery` (PR-4..PR-6). Keduanya `Approved` dengan urutan mengikat.

⛔ **Jangan menyentuh berkas yang masih dipegang kerja belum-commit** di direktori
kerja utama: `data_firmfin.ts` · `view_firmfinance.tsx` · `view_firmgl.tsx` ·
`view_pipeline.tsx`, ditambah 15 berkas untracked (`mytasks_derive.ts`, `wip_adj.ts`,
`home_composition.ts`, `use_firm_subledger.ts`, dan uji-ujinya). Periksa sendiri dengan
`git status --short` — daftar ini bisa berubah.

> ℹ︎ **Perubahan sejak 2026-08-27:** larangan atas `data_part1.ts`, `data_part4.ts`,
> `view_people.tsx`, `view_pc_hcm.tsx`, `view_timebudget.tsx`, `view_governance.tsx`,
> `view_isqm*.tsx`, `view_newdisc.tsx`, `view_psak24.tsx`, `view_psak46.tsx`,
> `view_aje.tsx`, `view_bo3.tsx`, `view_spr2410.tsx`, `view_personal.tsx` dulu
> berdasar "dipegang cabang yang belum mendarat". **Cabang-cabang itu SUDAH mendarat**
> (W0 #319–#322), jadi alasan itu tak berlaku lagi. `view_psak24`/`view_psak46` kini
> dikerjakan paket **W1-G**. Sisanya tetap DI LUAR LINGKUP gelombang ini — karena
> bukan milik paketmu, bukan karena dipegang siapa pun.

---

## 6 · Bentuk gerbang yang diterima (tiga bagian, presedens #317)

Uji milikmu diberi nama menurut paketmu, mis. `w1a_sealed_identity.test.ts`.

**§1 PERILAKU** — render view sungguhan (jangan menguji keberadaan simbol):
- dengan identitas firma tersedia ⇒ payload yang dikirim ke `amsExportPdf`/`amsExportXlsx`
  membawa `firm` = nama dari konteks, dan `scopeId` = id perikatan aktif;
- **dua perikatan berbeda ⇒ dua `scopeId` berbeda** (ini yang membuktikan ia bukan konstanta);
- tanpa identitas firma / tanpa perikatan aktif ⇒ eksporter **tidak pernah dipanggil**,
  dan tombolnya `disabled` dengan alasan yang terbaca.

**§2 SUMBER** — pindai HANYA berkas milik paketmu, sesudah membuang komentar:
nol `'KAP Wijaya'`, nol `'ENG-2025-'`, nol `'PT Sentosa'`, nol `window as { activeEngagement`.

> ⚠ `grep -c` membaca komentar sebagai kode (jebakan spr2400). Buang komentar dulu.
> ⚠ Tulis regex sebagai literal `/.../`, jangan dirakit dari string/template —
> escape-nya lenyap dan polanya tak pernah cocok.
> ⚠ `toMatchObject({p: /re/})` SELALU lolos. Jangan dipakai.

**§3 ANTI-TAUTOLOGI** — jalankan tiap predikat §2 atas sumber yang **sengaja
dimutasi kembali** ke bentuk cacatnya, dan tuntut ia GAGAL. Tanpa §3, hijau §2 tidak
membuktikan apa pun.

Dan sebelum semua itu: **buktikan gerbangmu MERAH pada kode lama.**

```
git stash && npm test -- <berkas ujimu>    # HARUS gagal
git stash pop
```

---

## 7 · Definisi selesai (sama untuk kedelapan paket)

- [ ] Output merah gerbang pada kode LAMA ditempel di deskripsi PR.
- [ ] `npm run verify` dari root HIJAU (mencerminkan CI persis).
- [ ] `git status --short` hanya menampilkan berkas milik paketmu.
- [ ] Deskripsi PR menyebut **apa yang TIDAK dikerjakan** dan mengapa.
- [ ] Setiap klaim "absen" disertai perintah grep yang dijalankan + hasilnya.

---

## 8 · Peta kepemilikan berkas (disjoint — sudah diverifikasi)

Nol berkas dimiliki dua paket; nol berkas bertabrakan dengan lima cabang yang belum
mendarat maupun dengan kerja yang belum di-commit di direktori kerja utama.

| Paket | Prompt | Berkas yang dimiliki |
|---|---|---|
| **W1-A** | [`W1-A-sa800-sa805-sa810.md`](W1-A-sa800-sa805-sa810.md) | `view_sa800` · `view_sa805` · `view_sa810` |
| **W1-B** | [`W1-B-cockpit-groupaudit.md`](W1-B-cockpit-groupaudit.md) | `view_cockpit` · `view_groupaudit` |
| **W1-C** | [`W1-C-sjah3000-subsequent-related.md`](W1-C-sjah3000-subsequent-related.md) | `view_sjah3000` · `view_subsequent` · `view_related` |
| **W1-D** | [`W1-D-sa200-sa501-sa520.md`](W1-D-sa200-sa501-sa520.md) | `view_sa200` · `view_sa501` · `view_sa520` |
| **W1-E** | [`W1-E-records-relatedsvc.md`](W1-E-records-relatedsvc.md) | `view_records` · `view_relatedsvc` |
| **W1-F** | [`W1-F-psak1-psak2-psak14-psak16.md`](W1-F-psak1-psak2-psak14-psak16.md) | `view_psak1` · `view_psak2` · `view_psak14` · `view_psak16` (+ `_nrv`, `_register`) |
| **W1-G** | [`W1-G-psak19-22-24-25-46-48.md`](W1-G-psak19-22-24-25-46-48.md) | `view_psak19` · `view_psak22` · `view_psak24` · `view_psak25` · `view_psak46` · `view_psak48` |
| **W1-H** | [`W1-H-psak58-65-66-68-71-72.md`](W1-H-psak58-65-66-68-71-72.md) | `view_psak58` · `view_psak65` · `view_psak66` · `view_psak68` · `view_psak71` · `view_psak72` (+ `_parts`) |

Tiap paket menambah SATU berkas uji baru bernama menurut paketnya
(`w1a_…test.ts` … `w1f_…test.ts`) — juga disjoint.

**Yang sengaja TIDAK masuk gelombang ini** (dan alasannya):

- **Kelas WRITE-PATH PSAK kini TERTUTUP SELURUHNYA** oleh W1-F + W1-G + W1-H
  (16 modul). Tak ada lagi "gelombang W2 PSAK".
- `view_aje` · `view_bo3` · `view_people` · `view_personal` · `view_spr2410` ·
  `view_pc_hcm` · `view_timebudget` · `view_governance` · `view_isqm*` · `view_newdisc`
  — cabang yang dulu memegangnya SUDAH mendarat (W0). Berkas-berkas ini bebas, tetapi
  **di luar lingkup gelombang ini**; sebagian memikul `firm:` literal dan layak jadi
  gelombang berikutnya.
- `view_firmgl` · `view_firmfinance` · `view_pipeline` · `data_firmfin` — masih dipegang
  kerja belum di-commit di direktori kerja utama.
- `contexts.tsx:927` + `persist_scope.ts` `DEFAULT_ENG_ID` — cacat terbesar di kelas
  ini, tetapi menyentuh SELURUH kunci persist sekaligus dan berinteraksi dengan
  keputusan "migrasi lingkup firma→perikatan: data lama hangus". **Menunggu Ari.**
- Sensus repo-wide (`KAP Wijaya` · `PT Sentosa` — hitung ulang sendiri, angka lama basi) —
  PR penutup tersendiri, dijalankan SESUDAH kedelapan paket mendarat.
