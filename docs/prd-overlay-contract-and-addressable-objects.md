# PRD — Kontrak Overlay & Objek Audit yang Dapat Dialamatkan

> Wajib diisi sebelum implementasi apa pun.
> Implementasi TIDAK dimulai sebelum ada sign-off ("Proceed.").

| Field | Isi |
|---|---|
| Tanggal | 2026-07-30 |
| Pemilik | Ari Widodo |
| Status | **Draft** |
| Engagement ID terkait | — (produk Asseris, bukan perikatan klien) |
| Pemicu | Evaluasi konsep pop-up detail komponen Pendapatan di modul Working Papers |

---

## 1. Problem

Pemicunya satu layar, tetapi masalahnya tiga lapis. Semua angka di bawah dari pembacaan
kode `migration/src` pada 2026-07-30.

**P1 — Objek audit tidak dapat dialamatkan.**
App tidak punya URL sama sekali. Rute dibaca dari `localStorage` ([app.tsx:422](../migration/src/app.tsx:422));
`history.pushState` / `location.hash` **nol kemunculan** di seluruh `src`. Akibatnya, pada produk
yang dijual sebagai alur reviu multi-orang:

- Reviewer dan preparer **tidak dapat menunjuk objek yang sama** — tak ada tautan "lihat KK `R` di sini".
- Tak bisa membuka dua kertas kerja berdampingan, tak ada Back browser, tak ada bookmark.
- Jejak audit / catatan reviu tak dapat menyimpan *lokasi* temuan, hanya deskripsinya (bertentangan
  dengan semangat ketertelusuran SA 230).
- Dua tab browser berbagi satu slot `ams.route` → saling menimpa.

Karena tak ada alamat, deep-link **dipalsukan** dengan kunci one-shot `localStorage['ams.wpOpen']`
yang dibaca di `useEffect(…, [])` ([view_wp.tsx:114](../migration/src/view_wp.tsx:114)). Bila route sudah
`workpapers`, komponen tak remount → modal tak terbuka, kunci mengendap, dan **kunjungan berikutnya
membuka KK yang salah**. Kelas cacat yang mustahil ada bila lokasi = URL.

**P2 — 47 overlay dirakit tangan tanpa kontrak bersama.**
47 situs `position:'fixed', inset:0` di 29 berkas (inventaris: Lampiran A). Konsekuensi terukur:

| Aspek | Keadaan |
|---|---|
| `role="dialog"` / `aria-modal` | **0 dari 29** berkas beroverlay (satu-satunya kemunculan ada di `minimap.tsx`, yang bukan bagian dari 29) |
| Handler `Escape` | **4 dari 29** (`app`, `shell`, `view_docparts`, `view_kb`) — WPDrill bukan salah satunya |
| Scroll lock | **0** — `body.style.overflow` tak pernah disentuh di seluruh `src`; latar tetap menggulir di belakang overlay |
| Focus trap / restore fokus | **0** |
| `zIndex` | `90` muncul **31 kali** — penumpukan ditentukan urutan DOM, bukan desain |
| Guard draft | **0** — klik backdrop menutup tanpa konfirmasi; mis. `draft` catatan reviu adalah state lokal `NotesTab` → catatan setengah tertulis hilang senyap |

**P3 — Konten tidak punya rumah kanonik.**
Satu konten kini punya tiga rumah yang bersaing: (a) halaman rute lewat `viewFor(route)`,
(b) **seluruh modul dirender di dalam drawer SA** — `viewFor(data.view)` di [app.tsx:411](../migration/src/app.tsx:411),
drawer di `zIndex 91`, (c) modal drill di `zIndex 90`. Karena (b) di atas (c), modal drill yang dibuka
dari modul-di-dalam-drawer akan muncul **di bawah** drawer yang memanggilnya. Aturan CLAUDE.md
"akses context defensif — modul bisa dirender di drawer/luar provider" adalah bekas luka dari
ambiguitas ini, bukan fitur.

**Gejala yang memicu evaluasi.** `WPDrill` berukuran `1000px × 92vh` ([view_wp.tsx:368](../migration/src/view_wp.tsx:368)) —
96% viewport, 5 tab, tabel input, tickmark, sign-off. Itu **halaman yang menyamar sebagai modal**:
tinggi dipaku tanpa memandang isi (tab Lead untuk KK Pendapatan hanya 2 baris akun → ~60% ruang
kosong), sekaligus terlalu sempit untuk pekerjaan berjam-jam. Tab-nya pun tak ikut deep-link
(`useStateWP('lead')`, [view_wp.tsx:327](../migration/src/view_wp.tsx:327)) — bukan `useInitialTab` yang justru
konvensi rumah sendiri — sehingga klik ref WP dari modul AJE ([view_aje.tsx:357](../migration/src/view_aje.tsx:357))
selalu mendarat di Lead Schedule, bukan tab yang jadi alasan datang.

---

## 2. Objective

**Setiap objek audit punya satu rumah kanonik yang dapat ditunjuk, dan setiap overlay mematuhi satu
kontrak.**

Mengapa ini objective yang benar, bukan "perbaiki modal Working Papers": modal-vs-halaman adalah
gejala. Yang rusak adalah *ketiadaan alamat* (P1) dan *ketiadaan kontrak* (P2). Memperbesar,
memperkecil, atau mengubah WPDrill menjadi halaman tanpa menyelesaikan keduanya hanya memindahkan
masalah — dan meninggalkan 46 overlay lain dengan cacat yang sama.

Aturan keputusan yang ditetapkan PRD ini, untuk dipakai seterusnya (akan masuk CLAUDE.md §5):

| Lapis | Untuk apa | Contoh | Beralamat? |
|---|---|---|---|
| **Rute / halaman** | Objek beridentitas & berumur kerja panjang | kertas kerja, AJE, risiko, perikatan | Wajib |
| **Sheet / drawer** | Konteks pendamping yang dibaca *sambil* bekerja | standar SA, lineage, komentar | Tidak, tapi wajib Escape + focus trap |
| **Modal sejati** | Tugas atomik ≤1 layar yang memutus | konfirmasi, sign-off | Tidak |

**Uji ambang yang mengikat:** bila sebuah overlay butuh tinggi >600px **atau** punya tab, ia bukan
modal. Kertas kerja → lapis 1. Dialog sign-off ([wp_signoff.tsx:662](../migration/src/wp_signoff.tsx:662)) → lapis 3,
dan itu sudah tepat hari ini.

---

## 3. Success Criteria

Terukur, diverifikasi per PR.

1. **Alamat berfungsi.** URL mencerminkan `(route, sel, tab)` untuk seluruh modul bertanda `deep` di
   `MODULE_INDEX`. Reload memulihkan keadaan identik; Back/Forward browser bekerja; URL yang ditempel
   di sesi/perangkat lain membuka objek yang sama.
2. **KK beralamat.** `#/workpapers/R?tab=procs` membuka KK `R` pada tab Prosedur. Klik ref WP dari
   modul AJE mendarat di tab **Bukti & Referensi**, bukan Lead Schedule.
3. **Pola palsu dihapus.** `ams.wpOpen` = **0 kemunculan** di `src` (kini 11 baris: 8 situs kode + 3 komentar).
4. **Kontrak overlay universal.** 47/47 situs memakai `<Overlay>`: `role="dialog"` + `aria-modal` +
   label = 47; `Escape` = 47; scroll-lock aktif = 47; `zIndex` literal di berkas view = **0**
   (semua lewat konstanta `Z`).
5. **Nol kehilangan draft.** Menutup overlay yang punya perubahan belum tersimpan meminta konfirmasi.
   Diuji unit + diverifikasi hidup pada `NotesTab`.
6. **Tinggi mengikuti isi.** Tak ada overlay dengan tinggi viewport dipaku; tak ada overlay bertab
   yang tersisa (uji: grep `<Tabs` di dalam pemakai `<Overlay variant="modal">` = 0).
7. **KK dapat dicetak** dari halamannya (1 KK = 1 dokumen, lewat `#print-area`).
8. **Gerbang tetap hijau:** `npm run lint` 0 · `npm run typecheck` 0 · `npm run build` tanpa gagal
   resolusi · `npm run test` hijau (806 sekarang + uji baru) · coverage ≥80% pada berkas baru.
9. **Tinjauan piksel oleh Ari** pada tiap PR — bukan hanya uji otomatis. (Dua sesi terakhir dalam
   sejarah proyek ini melewati tinjauan piksel dan uji otomatis gagal menangkap tiga cacat.)

---

## 4. Scope

**Fase A — primitif `<Overlay>` + skala z.** `migration/src/ui.tsx`. Tiga varian: `modal` (kecil,
memutus) · `sheet` (samping) · `page` (overlay layar-penuh, **transisi saja**, ditandai deprecated).
Migrasi 47 situs di 29 berkas (Lampiran A).

**Fase B — URL sebagai proyeksi state nav.** `app.tsx` (`navigate`, listener `hashchange`),
`contexts.tsx` (`useInitialTab`, `useInitialSelection` — API modul tak berubah, sumbernya digeser).
Fungsi murni `parseHash`/`buildHash` di berkas baru + uji unit.

**Fase C — Kertas kerja jadi objek beralamat.** `view_wp.tsx`: pecah `WPDrill` menjadi isi tanpa
overlay + `WPPage` beralamat. `openCanonicalWp(nav, ref, tab?)`. Hapus `ams.wpOpen` di **8 situs kode**
(`view_wp:115` pembaca, `view_wp:1330`, `view_assertions:232`, `view_execution:1377`, `view_home:150`,
`view_mytasks:107`, `view_workspace:189`, `view_wtb_deep:161`) + 3 baris komentar yang merujuknya
(`view_sa530:66`, `view_home:144`, `view_execution:1371`).

**Fase D — cetak/ekspor KK.** `#print-area` + tombol Cetak pada `WPPage`.

---

## 5. Non-Scope

- Server, tRPC, Prisma, RBAC — tak disentuh. Ini murni lapisan klien.
- Perhitungan `AMS_CANON` — tak disentuh, sehingga snapshot `canon_regression.test.ts` aman.
- Redesain visual: warna, tipografi, tata letak panel. Satu-satunya perubahan geometri yang
  diizinkan adalah tinggi/lebar overlay.
- **Menghapus drawer SA sebagai pola** — keputusan itu bergantung Q4, di luar PRD ini.
- Migrasi seluruh 158 modul ke URL-dalam. Hanya `(route, sel, tab)`; state di dalam modul selain
  itu tetap lokal.
- Menambah pustaka router / dialog eksternal (alasan di §8).
- Mobile, i18n, offline.
- Berkas buildless beku (`NeoSuite AMS.html`, `app/*`, `build/`).

---

## 6. Constraints

- **ESM-only**, sumber kebenaran `migration/src`; berkas buildless = referensi beku (CLAUDE.md).
- **Aturan emas anti-tabrakan** masih berlaku: alias hook React per-berkas, tanpa `const styles`
  global, ekspor via `Object.assign(window, …)` selama `window` belum dilucuti (W3 Fase 4).
- **`strict` penuh + `npm run typecheck` 0 error.** Primitif baru wajib bertipe struktural, bukan `any`.
- **Ratchet ESLint `no-explicit-any`:** `:any` baru = gagal, dan menyentuh berkas dengan suppression
  lama dapat **meng-un-suppress seluruh berkas**. Ini membatasi ukuran PR migrasi (lihat R2).
- **Tanpa dependensi baru.** Produk dikirim single-tenant ke KAP; setiap paket baru menambah surface
  rantai pasok yang harus dijawab di `docs/PENTEST-READINESS.md`.
- **Kompatibilitas ke belakang:** pengguna existing punya `ams.route`, `ams.navtab.*`, `ams.wpOpen`
  di penyimpanan. Migrasi tak boleh memutus sesi berjalan.
- Satu pelaksana (Ari + agen); tiap fase harus dapat di-merge terpisah dan berdiri sendiri.
- Verifikasi hidup butuh `npm run dev:all` (:5180 + :5181) dan **panel Browser dibuka Ari** — agen
  tak dapat membukanya sendiri.

---

## 7. Existing Solutions

| Yang sudah ada | Mengapa tidak cukup |
|---|---|
| `navigate(id, {from, tab, sel})` ([app.tsx:430](../migration/src/app.tsx:430)) + `useInitialTab` / `useInitialSelection` ([contexts.tsx:263](../migration/src/contexts.tsx:263), [:278](../migration/src/contexts.tsx:278)) | **Model lokasi bertingkat SUDAH ADA dan dipakai 20+ modul.** Yang absen hanya publikasi ke address bar. → Fase B = serialisasi, bukan router baru. Ini temuan yang paling memurahkan PRD ini. |
| `localStorage['ams.route']` | Memulihkan reload, tapi satu slot global: tak dapat dibagikan, tak dapat dua tab, tak ada riwayat. |
| `sessionStorage['ams.navtab.<id>']` one-shot | Benar secara desain (consume-once, tahan reload) tapi tak dapat dibagikan dan tak muncul di URL. |
| `localStorage['ams.wpOpen']` one-shot | Meniru deep-link objek, **cacat**: dibaca `useEffect([],)` → mengendap bila route tak berubah (P1). |
| Primitif `ui.tsx` (`Panel`, `Menu`, `Tabs`, `StubView`, `LockBanner`) | Lengkap untuk konten; **tak ada primitif overlay** — itu sebabnya 47 situs merakit sendiri. |
| Dialog konfirmasi `wp_signoff.tsx:662` (`zIndex 95`) | Sudah benar sebagai modal atomik; jadi **acuan bentuk** varian `modal`, bukan sesuatu yang perlu diganti. |
| `react-router` / Radix Dialog / HeadlessUI | Ditolak — alasan di §8. |

---

## 8. Proposed Approach

### Fase A — satu primitif `<Overlay>` di `ui.tsx`

Kontrak props (bertipe penuh, tanpa `any`):

```
variant: 'modal' | 'sheet' | 'page'   // 'page' deprecated, transisi saja
size:    'sm' | 'md' | 'lg'           // modal: max-width; sheet: width
open, onClose, title, labelledBy
dismissable?: boolean                 // default true; false untuk overlay ber-form
isDirty?: () => boolean               // guard konfirmasi sebelum menutup
zLayer?: keyof typeof Z
```

Wajib disediakan primitif, tak boleh lagi jadi tanggung jawab pemakai:
`role="dialog"` + `aria-modal` + `aria-labelledby` · focus trap + **restore fokus ke elemen pemicu** ·
`Escape` · **scroll lock berbasis counter** (bukan boolean — overlay bertumpuk) · backdrop click
diblokir bila `isDirty()` · `max-height` mengikuti isi, bukan `vh` dipaku.

Skala z bernama sebagai konstanta TS (mengganti 31× `zIndex: 90` datar):
`Z = { sheet: 80, modal: 90, confirm: 95, toast: 9999 }`.

**Mengapa bukan Radix/HeadlessUI:** 47 situs harus tetap dapat dirender di dalam `viewFor` yang
sendirinya bisa dirender di dalam drawer ([app.tsx:411](../migration/src/app.tsx:411)). Portal pustaka pihak ketiga
akan bertabrakan dengan pola "modul di dalam drawer" itu, dan menambah dependensi pada produk yang
dikirim ke KAP menambah kewajiban pentest. Primitif ±200 baris cukup, dapat diuji penuh, dan
menyelesaikan tepat 6 cacat yang terukur di P2.

### Fase B — URL sebagai proyeksi state nav yang sudah ada

**Skema:** `#/<route>[/<sel>][?tab=<tab>]` — contoh `#/workpapers/R?tab=procs`.

**Mengapa hash, bukan History API:** app disajikan sebagai SPA statis di belakang Caddy
(`docs/DEPLOY.md`, Docker Compose). Hash tak butuh aturan rewrite server sama sekali → nol perubahan
infrastruktur, nol risiko 404 pada refresh di deploy yang sudah jalan. History API dapat menyusul
tanpa mengubah `parseHash`/`buildHash`.

**Alur, sengaja satu arah:**
- **Satu penulis:** `navigate()` menulis hash. Tak ada tempat lain yang menulis.
- **Satu pembaca:** listener `hashchange` → `setRoute` / seed tab / seed sel.
- `useInitialTab` / `useInitialSelection` **dipertahankan apa adanya sebagai API modul** (nol
  perubahan pada 20+ pemakai); sumbernya digeser: URL dulu, `sessionStorage` one-shot sebagai
  fallback. Inilah yang membuat migrasi murah.
- `ams.route` tetap ditulis sebagai "sesi terakhir" dan dipakai **hanya** bila hash kosong →
  kompatibel ke belakang.
- Hash tak valid → `home` + toast, **bukan** layar putih.

### Fase C — kertas kerja jadi halaman beralamat

`WPDrill` dipecah: isi (tanpa overlay) + `WPPage` yang dirender oleh rute. Daftar KK tetap di
`#/workpapers`; KK tunggal di `#/workpapers/<ref>?tab=<tab>`. Kembali ke daftar lewat `navFrom`/SubBar
yang sudah ada. `openCanonicalWp(nav, ref, tab?)` → `navigate('workpapers', { sel: ref, tab })`.

### Fase D — cetak

`#print-area` pada `WPPage` + tombol Cetak. Gaya cetak sudah terdaftar sebagai pengecualian skala
tipografi (CLAUDE.md §5), jadi tak ada konflik.

---

## 9. Risks

| # | Risiko | Mitigasi |
|---|---|---|
| **R1** | **Regresi navigasi menyeluruh** — Fase B menyentuh satu-satunya jalur nav app; salah = seluruh app tak dapat dinavigasi. | Satu penulis / satu pembaca. `parseHash`/`buildHash` fungsi **murni** + uji unit tabel. Smoke uji 12 rute. Fase B merge sebagai PR sendiri, tak dicampur migrasi overlay. |
| **R2** | **Ratchet ESLint** — menyentuh 29 berkas ber-`any` dapat meng-un-suppress seluruh berkas → lint gagal massal, tak berhubungan dengan perubahan. | Migrasi overlay dipecah per rumpun berkas; tiap PR jalankan `npm run lint -- --prune-suppressions` dan **periksa delta suppression sebelum commit**. |
| **R3** | **Modul di dalam drawer SA** — bila modul yang dirender di `viewFor(data.view)` memanggil `navigate()`, URL berubah padahal pengguna hanya membuka drawer. | Drawer merender modul dalam mode `embedded` (nav diproksi/dinonaktifkan). **Butuh keputusan Q4.** |
| **R4** | **Perubahan perilaku dua-tab** — setelah URL jadi sumber, dua tab browser jadi independen (sebelumnya berbagi `ams.route`). | Ini perbaikan, tapi harus disadari & disebut di catatan rilis; bukan bug. |
| **R5** | **Guard draft memberi rasa aman palsu** — `isDirty` hanya menyala bila overlay melaporkannya; yang lupa melapor tetap kehilangan data sambil terlihat terlindungi. | Audit 47 situs, tandai mana yang punya state lokal tak tersimpan; untuk overlay ber-form default `dismissable: false`. Inventaris ini output wajib PR-2, bukan opsional. |
| **R6** | **Scroll lock bertumpuk** — menutup overlay atas melepas lock overlay bawah bila lock berbasis boolean. | Counter, dan uji unit khusus untuk buka-buka-tutup-tutup. |
| **R7** | **Ruang lingkup melebar jadi redesain.** | Non-Scope tegas. Fase A & B tak mengubah satu piksel selain geometri overlay. |
| **R8** | **Kerahasiaan** — ref KK & id perikatan muncul di address bar & riwayat browser. Pada laptop bersama / demo klien, riwayat dapat membocorkan siapa kliennya. Bersinggungan dengan `docs/PDP-COMPLIANCE-ASSESSMENT.md`. | URL memuat **kode** (`R`, `ENG-2025-063`), bukan nama klien; hash tak pernah dikirim ke server. **Butuh keputusan Q3.** |
| **R9** | Uji otomatis lolos tapi produk salah — presedennya ada di proyek ini (806 uji melewatkan 3 cacat yang tinjauan piksel temukan). | Tinjauan piksel Ari sebagai gerbang per-PR, bukan opsional (Success Criteria #9). |

---

## 10. Implementation Plan

Tiap PR wajib: `lint` 0 → `typecheck` 0 → `build` ok → `test` hijau → **tinjauan piksel Ari** hidup
di :5180.

| PR | Fase | Isi | Bukti selesai |
|---|---|---|---|
| **PR-1** | A | `<Overlay>` + `Z` + uji (focus trap, restore fokus, Escape, scroll-lock counter, dirty guard). Migrasi **3 situs contoh**: `view_wp` WPDrill, `wp_signoff:662`, `view_kb:274`. 44 sisanya tak disentuh. | Kontrak terbukti pada 3 bentuk berbeda (page/confirm/modal) |
| **PR-2a/b/c** | A | Migrasi 44 situs sisa, dipecah per rumpun: (a) `view_execution` 6 + `view_firm` 3; (b) `view_people`/`view_pipeline`/`view_palette` 9; (c) 26 sisanya. Setiap PR menyertakan **inventaris R5**. | `zIndex` literal di berkas view = 0 |
| **PR-3** | B | `parseHash`/`buildHash` + wiring `navigate`/`hashchange` + sumber-URL untuk `useInitialTab`/`useInitialSelection` + fallback `ams.route`. | Uji unit tabel + smoke 12 rute + Back/Forward hidup |
| **PR-4** | C | `WPPage` beralamat, `openCanonicalWp(nav, ref, tab)`, hapus `ams.wpOpen` (8 situs). | Success Criteria #2 & #3 |
| **PR-5** | D | Cetak/ekspor KK. | 1 KK = 1 dokumen tercetak |

**Urutan mengikat:** PR-3 tak boleh mendahului PR-1 (halaman KK butuh varian overlay yang benar untuk
dialog sign-off di dalamnya), dan PR-4 tak boleh mendahului PR-3 (tanpa URL, "KK jadi halaman"
hanya memindahkan cacat).

---

## 11. Open Questions

| # | Pertanyaan | Rekomendasi saya |
|---|---|---|
| **Q1** | **Ruang lingkup sign-off: keempat fase, atau A saja (perbaikan tanpa routing)?** | **A + B + C.** A saja menutup cacat aksesibilitas & kehilangan data, tetapi **tidak** menutup keluhan yang memicu evaluasi ini — ketidakmampuan menunjuk sebuah KK. Itu hanya tertutup oleh B+C. D murah dan boleh menyusul kapan saja. |
| **Q2** | Hash (`#/…`) atau History API (`/workpapers/R`)? | **Hash.** Nol perubahan Caddy/Docker, nol risiko 404 saat refresh. Dapat dinaikkan ke History API belakangan tanpa mengubah `parseHash`. |
| **Q3** | R8 — bolehkah ref KK & id perikatan muncul di URL dan riwayat browser? Ada perangkat bersama / sesi demo klien. | Ya, dengan **kode saja** (`R`, `ENG-2025-063`), tanpa nama klien. Bila Anda menilai itu masih terlalu banyak, alternatifnya alamat buram (hash pendek) — tetapi tautan jadi tak dapat dibaca manusia, dan sebagian nilai "tunjuk objek yang sama" hilang. |
| **Q4** | R3 — modul yang dirender di dalam drawer SA: `navigate()` di dalamnya harus **mengubah URL** (drawer jadi rute) atau **dinonaktifkan** (drawer tanpa alamat)? Ini juga menentukan apakah drawer SA layak dipertahankan sebagai pola. | Dinonaktifkan/diproksi. Merender modul penuh di dalam drawer 780px adalah akar P3; jangan diberi alamat, agar tidak dilembagakan. |
| **Q5** | Setelah KK jadi halaman: master-detail dua panel satu layar, atau dua halaman terpisah? | **Dua halaman.** KK butuh lebar penuh untuk 5 tab + tabel input; master-detail akan mengulang keluhan "terlalu sempit untuk bekerja". |
| **Q6** | Apakah 47 situs semuanya sah, atau sebagian harus dihapus/digabung? | Belum saya audit satu per satu. PR-2a wajib dibuka dengan klasifikasi 47 situs → `modal` / `sheet` / *harus jadi rute* / *harus dihapus*. Mungkin jumlahnya turun. |

---

## Lampiran A — Inventaris 47 situs overlay (29 berkas)

Pola terhitung: `position:'fixed', inset:0`, per 2026-07-30.

| Berkas | Situs | | Berkas | Situs |
|---|---|---|---|---|
| `view_execution.tsx` | 6 | | `view_misc2.tsx` | 1 |
| `view_firm.tsx` | 3 | | `view_kb.tsx` | 1 |
| `view_palette.tsx` | 3 | | `view_isqm.tsx` | 1 |
| `view_people.tsx` | 3 | | `view_governance.tsx` | 1 |
| `view_pipeline.tsx` | 3 | | `view_firmgl.tsx` | 1 |
| `shell.tsx` | 2 | | `view_firmfinance.tsx` | 1 |
| `view_nonaudit2.tsx` | 2 | | `view_docparts.tsx` | 1 |
| `view_onboarding.tsx` | 2 | | `view_crypto.tsx` | 1 |
| `view_tax23.tsx` | 2 | | `view_settings.tsx` | 1 |
| `wp_signoff.tsx` | 2 | | `view_scheduler.tsx` | 1 |
| `app.tsx` | 1 | | `view_platform.tsx` | 1 |
| `evidence.tsx` | 1 | | `view_platform3.tsx` | 1 |
| `ui.tsx` | 1 | | `view_pdp.tsx` | 1 |
| `view_wp.tsx` | 1 | | `view_pc_hcm.tsx` | 1 |
| | | | `view_payroll.tsx` | 1 |

**Catatan verifikasi.** Seluruh temuan PRD ini berasal dari pembacaan kode `migration/src` +
tangkapan layar modul Working Papers, **bukan** dari menjalankan aplikasi. Satu klaim bersifat
inferensi dan belum diamati hidup: WPDrill (`zIndex 90`) muncul di bawah drawer SA (`zIndex 91`)
saat modul dirender di dalam drawer — disimpulkan dari nilai `zIndex` + `viewFor(data.view)` di
[app.tsx:411](../migration/src/app.tsx:411). Perlu dikonfirmasi pada PR-1.

---
**Sign-off:** ditandai dengan balasan **"Proceed."**
