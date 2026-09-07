---
name: asseris-revenue-psak72-kontrak-pengukuran
description: "Pendapatan Firma (PSAK 72): nilai kontrak dikarang dari materialitas, pita yang menjamin terlalu banyak — dan satu premis prompt yang sudah tertutup di master sebelum saya membacanya"
metadata: 
  node_type: memory
  type: project
  originSessionId: f605f689-e03d-4a32-a5ce-5676b2a29954
  modified: 2026-08-22T03:17:53.435Z
---

Arc `revenue` (2026-08-22). **MENDARAT: PR #277 → `origin/master` `9a4158c`**
(squash; cabang remote & lokal dihapus, worktree `.claude/worktrees/revenue-psak72`
sudah dibongkar). CI 9/9 hijau termasuk playwright × postgres & dua npm audit;
`npm run verify` lokal PASSED (159 berkas uji frontend · 431 uji backend).

## GOTCHA 1 — premis prompt bisa basi karena POHON KERJA-nya yang basi

V1 ("`const invoices: any = AMS.INVOICES` di baris 20") **benar di direktori utama dan
salah di master**. Direktori utama sedang berada di `9dd1e57`, yaitu SEBELUM PR #275
(billing) — dan #275 sudah mengganti baris itu dengan `useInvoiceRegister()` serta
memasang gerbang cakupan `invoices_ssot_coverage.test.ts` yang menyebut
`view_firmrevenue.tsx` secara eksplisit.

**Aturan yang saya pakai sesudah ini:** sebelum mempercayai premis berbasis nomor baris,
`git log --oneline -1 origin/master` lalu `git show origin/master:<berkas>` — bukan
membaca berkas di disk. Direktori utama repo ini rutin tertinggal dari `origin/master`
karena sesi paralel ([[asseris-sesi-paralel-satu-worktree]]).

## GOTCHA 2 — `Badge` MEMBUANG `title` (ui.tsx:23)

`function Badge({ children, kind, dot })` — `title` tak ada di destructuring dan tak
ada spread `...rest`. Tooltip yang dipasang di `<Badge title="…">` **tidak pernah
terpasang di DOM**. Saya sempat menulisnya, lalu memindahkan penjelasannya ke footnote
yang terbaca semua orang. `BadgeBtn` (baris 48) punya `...rest` — itu yang meneruskan.
Sejalan dengan pelajaran [[asseris-icon-button-names]]: afordans MATI lebih buruk
daripada tak ada afordans.

## GOTCHA 3 — uji RENDER jsdom ternyata murah di repo ini

Sebelum arc ini hanya `overlay.test.ts` yang berjalan di jsdom. Ternyata merender
sebuah `view_*.tsx` penuh butuh tiga mock saja:

```ts
// @vitest-environment jsdom  ← pragma baris pertama
vi.mock('./contexts', async () => ({ ...await vi.importActual('./contexts'), useFirm: () => ({ engagements, clients }) }));
vi.mock('./use_invoices', () => ({ useInvoiceRegister: () => ({ register, setRegister: () => {}, canEdit: false }) }));
vi.mock('./shell', () => ({ SubBar: () => null }));
const { FirmRevenue } = await import('./view_firmrevenue');   // impor SESUDAH mock
```
plus `globalThis.IS_REACT_ACT_ENVIRONMENT = true` di `beforeEach` (kalau lupa: spam
warning "not configured to support act(...)", uji tetap hijau).

Ini yang membuktikan hal-hal yang gerbang TEKS tak bisa: tombolnya benar-benar
`document.activeElement` sesudah `.focus()`, `aria-expanded` benar-benar berubah,
dan baris berlubang tak menggambar `NaN`. **Bonus tak terduga:** saat mutasi sengaja
membuat uji merah, `Received:` mencetak SELURUH `document.body.textContent` — itu
tinjauan visual halaman tanpa peramban sama sekali. Berguna karena `preview_start`
menyajikan worktree UTAMA, bukan milik saya.

## GOTCHA 4 — `React.CSSProperties` tak ada

`@types/react` sengaja absen (`jsx-intrinsics.d.ts`), jadi `React` bertipe any dan
`React.CSSProperties` **bukan tipe**. Untuk objek gaya modul: `Record<string, string |
number>`. Catatan yang sama sudah tertulis di header `overlay.tsx` — saya baru
menemukannya sesudah TS2694.

## Cacat & yang dipilih

- **V2 (dorman).** `contract = c ? c.fee : e.materiality * 0.4`. Perhatikan: `ClientRow.fee`
  WAJIB di `ams_types.ts`, jadi jalur fallback hanya hidup ketika **klien tak ditemukan**
  — bukan ketika fee kosong. Pada seed ketujuh perikatan menemukan kliennya ⇒ nol
  pemicu. Uji yang membuktikannya: satu uji khusus menyatakan `gaps == []` pada seed
  (premis dorman DIBUKTIKAN, bukan dipercaya) + uji yang MEMBANGUN keadaan pemicu.
- **V4.** Pita berkata "Kolom diakui/ditagih per engagement adalah data nyata".
  `ditagih` fakta (register faktur, sejak #275); `diakui` turunan `fee × progress`.
- **V3 (label saja).** Kolom memasang 'Point-in-time' untuk 2 perikatan lalu tetap
  mengakui `kontrak × pct` untuk keduanya — label membantah aritmetikanya sendiri.
  Saya mengganti kolom menjadi PENGUKURAN yang benar-benar dipakai + tanda "klasifikasi
  terbuka", **tanpa** memutuskan metodenya (`docs/usulan-R3-metode-pengukuran-psak72.md`).

## Yang paling berguna dari V3 untuk keputusan Ari

`progress` vs `actualHrs/budgetHrs`: **5 dari 7 perikatan sepakat dalam ±1 poin persen**
— `progress` memang sebagian besar turunan jam, hanya tak pernah dinyatakan. Yang tidak
sepakat justru yang memfalsifikasi "pakai jam saja":

- `ENG-2025-063` — jam 95,7% vs dilaporkan 88% ⇒ metode masukan naif **mengakui
  pendapatan atas ketidakefisienan** (PSAK 72 ¶B19 justru melarang).
- `ENG-2025-058` — `Completed`, jam berhenti di 96,4% ⇒ metode masukan naif **menahan
  3,6% pendapatan atas perikatan yang sudah tuntas**.

Total bergerak +106,4 jt (+2,21%) bila pindah ke jam mentah. Karena itu usulannya A
**dengan dua pagar**, bukan A polos. Sejalan dengan pelajaran #274: cari dulu apakah
data sudah menyatakan pembandingnya ([[asseris-profit-isolasi-realisasi]]).

## Mekanis

- `npm run lint:any-baseline` WAJIB sesudah membuang `:any` (`view_firmrevenue.tsx`
  34 → 15, nol suppression baru). Tanpa itu: `VERIFY FAILED: frontend lint`
  "suppressions left that do not occur anymore".
- Exit code rantai perintah `npm run verify > log; grep …` **kembali berbohong** (0
  padahal lint merah). Baca baris `VERIFY PASSED`/`VERIFY FAILED`.
  Lihat [[asseris-billing-nomor-faktur-register]].
- Worktree: junction `node_modules` root + `migration`, tetapi `server/` `npm ci`
  sendiri ([[asseris-prisma-client-worktree-trap]]).

## Tindak lanjut — PRD metode masukan (2026-08-22, MENUNGGU "Proceed.")

Ari menjawab usulan-R3 dengan **"opsi a"** ⇒ metode masukan berbasis jam.
`docs/prd-revenue-input-method-psak72.md` ditulis (CLAUDE.md menuntut PRD sebelum
implementasi), terdaftar di `PRD-REGISTRY.md` (Draft 53→54), commit **LOKAL**
`e276de7` pada cabang `prd/revenue-input-method` (worktree
`.claude/worktrees/revenue-input-prd`). Belum di-push. `npm run verify` PASSED.

Yang mengunci desainnya: **rasio jam POLOS terbukti salah oleh seed sendiri** —
`ENG-2025-058` `Completed` dengan jam 96,4% akan menahan 3,6% pendapatan atas
perikatan yang sudah tuntas. Karena itu Pagar 1 (selesai/arsip ⇒ 100%). Pagar 2a
(jepit 100%) **DORMAN** pada seed (tertinggi 96,4%) ⇒ ujinya wajib MEMBANGUN 120%.
Total bergerak +127,1 jt (+2,64%), bukan +106,4 jt seperti tabel usulan-R3 — tabel
itu rasio MENTAH tanpa pagar.

Pertanyaan yang masih memblokir sebagian: klasifikasi perikatan non-audit
(`ENG-2025-047` AUP · `ENG-2025-022` Review SPR 2400). Bila *point-in-time*,
keduanya diakui 0 sampai penyerahan — itu MENGUBAH ANGKA, dan pertimbangannya
kontraktual, bukan teknis.

## Metode masukan DIKERJAKAN (2026-08-22) — commit LOKAL `0b84517`

"Proceed." diberikan. **MENDARAT: PR #278 → `origin/master` `77776fe`** (squash;
cabang & worktree sudah dibongkar). CI 9/9 hijau; `npm run verify` lokal PASSED.
PRD → Implemented, registri diperbarui (Draft 54→53, Implemented 37→38).

**GOTCHA A — `engagementWip` SALAH untuk tabel lintas-perikatan.** PRD menulis
"sumber jam = `FIRMFIN.engagementWip`". Itu benar untuk layar SATU perikatan;
untuk tabel firma ia menanam cacat lingkup: timesheet live ber-scope perikatan
AKTIF, jadi enam perikatan lain dinilai dari jam PEMBUKA roster saja. Buktinya
konkret: `engagementWip([], 'ENG-2025-014').actualHrs = 1098`, bukan 1146 —
48 jam timesheet seed masuk lewat parameter live, bukan lewat `base`. Bentuk
yang benar sudah ada di `profit_model.ts:164`: **`e.actualHrs + pmExtraHours[id]`**.
Identik dengan `engagementWip` untuk perikatan aktif (invarian `Σbase +
timesheet === actualHrs`, roster_profile.ts) tetapi benar juga untuk yang lain.

**GOTCHA B — mengganti `progress` dengan jam membuat EAC TAUTOLOGIS.**
`timebudget_model`: `eacHrs = actualTotal / prog`. Bila `prog = actual/budget`
maka `eacHrs === budget` untuk perikatan apa pun, selamanya — proyeksi yang tak
pernah memproyeksikan. Jadi `progress` TIDAK dihapus dari aplikasi: ia berhenti
mengakui pendapatan, dan tetap dipakai di tempat pertimbangan memang diminta.
Konsekuensinya gerbang cakupan `.progress` DIBATASI pada mesin & view pendapatan.

**GOTCHA C — memperbaiki satu modul MELAHIRKAN angka kedua di modul lain.**
`timebudget_model.ts:216` sudah menghitung `revRecognized = fee × e.progress`
dan layarnya menulis "Pendapatan diakui (% completion)". Tanpa disentuh, PR ini
justru menciptakan dua "pendapatan diakui" berselisih 5,2 jt untuk SATU
perikatan. Selalu grep konsumen lain dari besaran yang sedang diubah SEBELUM
menyebut pekerjaan selesai. Konsumennya juga ber-`: any` props
(`TBEconomics({ m, e }: any)`), jadi **typecheck TIDAK menangkap** nullability
baru — `tsc` hijau sementara runtime akan mencetak NaN.

**Pagar 1 tak dibuat sendiri:** `isCompletedEngagement` (`canon_smm_monitoring.ts`,
SMM 1 ¶38) sudah menyatakan "selesai" lengkap dengan varian
`completed/selesai/archived/arsip` + lipat-huruf. Grep kanon dulu.

Angka: total pengakuan seed 4.815,7 → **4.942,8 jt** (+127,1 jt · +2,64%).
Q3 (klasifikasi perikatan non-audit) MASIH TERBUKA — bila point-in-time, dua
perikatan harus diakui 0 sampai penyerahan. Sisa karangan di T&B
(`TB_FEE_FALLBACK`, termin `fee×0,5`/`fee×0,3`) dilaporkan sebagai tugas terpisah.

Terkait: [[asseris-billing-nomor-faktur-register]] · [[asseris-firmfin-ledger-derived]] ·
[[asseris-timebudget-engagement-isolation]]
