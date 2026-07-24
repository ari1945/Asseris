# PRD — Perbaikan Learning Curve Navigasi Sidebar

| Field | Isi |
|---|---|
| Tanggal | 2026-07-24 |
| Pemilik | Ari Widodo |
| Status | Draft |
| Engagement ID terkait | — (perubahan platform Asseris, lintas-engagement) |

> Disusun dari evaluasi UI/UX sidebar 2026-07-24 (parsing `icons.tsx` + pengukuran DOM live: Managing Partner & Junior Auditor, kedua workspace, viewport 1280×720). Semua angka di bawah **terukur**, bukan estimasi.

---

## 1. Problem

Sidebar Asseris disusun menurut **kapabilitas sistem**, bukan menurut **urutan kerja auditor**. Pengguna baru tidak dapat *menebak* lokasi sebuah modul — ia harus *menghafal* 158 lokasi. Inilah akar learning curve. Masalahnya struktural (arsitektur informasi), bukan kosmetik.

Fakta terukur (baseline):

| Metrik | Perikatan | Firma | Global |
|---|---|---|---|
| Grup di sidebar | 6 | 11 | 24 grup total |
| Modul | 37 | 67 | 158 modul |
| Baris ter-render | **44** (7 duplikat) | 67 | — |
| Terlihat tanpa scroll | 10 | 11 | — |
| Layar yang di-scroll | 2,87 | **4,26** | — |
| Badge `NEW` terlihat | 3 | 20 | 57 modul (36%) ber-`NEW` |
| Modul tak terlihat di sidebar mana pun | — | — | 54 (34%), termasuk 27 PSAK |
| Ikon unik | — | — | 46 utk 158 modul |

Lima cacat yang paling menghambat pemula (semua terverifikasi):

1. **Taksonomi tanpa prinsip tunggal** ([icons.tsx:84](../migration/src/icons.tsx)). 24 grup mencampur 5 prinsip: fase siklus, fungsi organisasi, jenis artefak, regulator, lini jasa — plus ember sisa `Backoffice & Firm Mgmt` (14 modul). `Core Specifics` (12 modul) tak memberi tahu isinya. Konsep kembar tersebar: **WIP** di 3 tempat (`wipreal`/`revenue`/`wip`), **Independensi** di 2 (`independence`/`teamindep`), **Pajak firma** di 2 (`firmtax`/`tax`), titik masuk di 4 (`home`/`dashboard`/`cockpit`/`firmops`). Pengguna baru cari "WIP" → 3 jawaban benar, tak ada cara menebak.

2. **Nol progressive disclosure.** `closedGroups` diinisialisasi `{}` ([shell.tsx:129](../migration/src/shell.tsx)) → semua grup terbuka saat pertama. Partner di Firma dihadapkan 67 baris sekaligus (kapasitas memori kerja manusia ~4–7 chunk). Saat pengguna menutup grup untuk coping (terukur: 67→32 baris), lalu reload → **kembali 67**. State tak dipersist, padahal `ams.ws` dan `ams.sideShowAll` dipersist.

3. **Kurasi peran terbalik** ([icons.tsx:351](../migration/src/icons.tsx)). `ROLE_SIDEBAR_GROUPS` memberi `engagement: null` untuk **semua** peran → tak ada kurasi di Perikatan, tempat auditor baru menghabiskan ~100% waktunya. Terukur: **Junior Auditor di Perikatan melihat 44 item identik dengan Managing Partner, tanpa escape hatch.** Di Firma kurasi bekerja (Junior: 4 item). Scaffolding terbalik. Ditambah: tombol escape hatch hanya render bila `curatedGroups` truthy ([shell.tsx:221](../migration/src/shell.tsx)) → Partner/Manager, yang menu-nya terbesar, justru tak punya kontrol memangkasnya.

4. **Tebing discoverability** ([icons.tsx:321](../migration/src/icons.tsx)). `HIDDEN_GROUPS` menyembunyikan 54 modul, termasuk **seluruh 27 PSAK** — rujukan tersering auditor Indonesia. Jalur tersisa (⌘K, Matriks Kepatuhan) keduanya berbasis **recall** (harus tahu nama dulu), persis yang belum dimiliki pemula.

5. **Duplikasi & noise sekunder.** Blok "Fokus Fase" menyalin 7 modul Core Execution ke daftar (44 baris untuk 37 modul unik) — terbaca sebagai dua hal berbeda bernama sama. Badge `NEW` di 36% aplikasi (20 terlihat sekaligus) menenggelamkan tag informatif (`SA 315`/`ISQM 1`/`WTB`, total hanya 6). Ikon dipakai ulang berat (`shield` 11×) → mode ciut ambigu. 34% label & 9/24 nama grup berbahasa Inggris, bertentangan dengan kebijakan UI Bahasa Indonesia.

## 2. Objective

- Menurunkan beban kognitif pertama-kali secara drastis: sidebar terbaca sebagai **peta siklus audit yang sudah ada di kepala auditor**, bukan katalog kapabilitas.
- Mengubah pola pencarian modul dari **recall → recognition** (menjelajah & memfilter, bukan menghafal).
- Menerapkan scaffolding yang benar: pemula melihat sedikit, oversight bisa melihat semua — di **kedua** workspace.
- Tanpa mengurangi capability atau mengubah RBAC (perubahan murni-UI, aman & reversibel).

## 3. Success Criteria

Terukur terhadap baseline di §1 (metrik diambil ulang dengan probe DOM yang sama):

1. **Baris terlihat saat istirahat** (default, sebelum interaksi): Firma 67 → **≤15**; Perikatan 44 → **≤15**.
2. **Layar scroll ke modul top-20 tersering**: hingga 4,26 → **≤1**.
3. **% modul terjangkau dengan menjelajah/memfilter** (tanpa mengetik ⌘K dari ingatan): 66% → **100%** (ke-158, termasuk PSAK/SA tersembunyi).
4. **Junior Auditor di Perikatan**: baris ter-render turun dari 44 → **≤ jumlah grup terkurasi peran**, dan escape hatch "Tampilkan semua modul" **selalu** tersedia.
5. **Nol duplikasi** baris untuk modul unik (44→37 di Perikatan).
6. **Persistensi**: grup yang ditutup pengguna tetap tertutup setelah reload.
7. **Badge `NEW`** yang terlihat sekaligus di satu workspace ≤ 5.
8. Gate hijau: `npm run typecheck` = 0, `npm run lint` bersih, `npm run build` sukses, seluruh test eksisting tetap hijau, ratchet `no-explicit-any` tidak naik.
9. **Regresi nol** pada capability: setiap modul yang dapat dibuka sebelum perubahan tetap dapat dibuka (via filter/escape hatch/⌘K). RBAC tak berubah.

## 4. Scope

Tiga fase. **Fase 1 sepenuhnya independen dari Open Questions** (§11) — dapat jalan begitu sign-off. Fase 3 menunggu keputusan Q1–Q3.

### Fase 1 — Kepadatan & scaffolding (murni mekanis, XS–S)
- **R1 · Progressive disclosure + persist.** Default-collapse semua grup **kecuali**: grup yang sedang aktif, dan (di Perikatan adaptif) grup fase relevan. Persist `closedGroups` ke key baru `ams.v1.sideGroups` (pola sama `usePersisted`, try/catch JSON).
- **R3 · Kurasi peran di Perikatan + escape hatch selalu ada.** Isi `ROLE_SIDEBAR_GROUPS[*].engagement` untuk Senior/Junior (mis. `['Engagement Workspace','Core Planning','Core Execution','Finalisasi & Pelaporan']`; oversight tetap `null`). Ubah kondisi render tombol escape hatch agar tampil **kapan pun** ada grup tersembunyi oleh kurasi/collapse-default — bukan hanya saat `curatedGroups` truthy.
- **R7 · Hapus duplikasi "Fokus Fase".** Tekankan fase relevan **di tempat** (styling `.relev` yang sudah ada), jangan menyalin item ke blok terpisah. Target 44→37.
- **R6 · Auto-expire badge `NEW`.** Ganti flag statis `tag:'NEW'` dengan penanda ber-tanggal (atau daftar allowlist yang di-review); `NEW` luruh otomatis (mis. 30 hari sejak rilis modul). Sisakan slot tag untuk kode standar.
- **Cleanup:** hapus cabang mati `<span className="tag soon">soon</span>` ([shell.tsx:295](../migration/src/shell.tsx)) — semua 158 modul `deep:true`, tak pernah render.

### Fase 2 — Discoverability (S–M)
- **R2 · Kotak filter inline** di puncak `.side-scroll`: mengetik memfilter **ke-158 modul across kedua workspace, termasuk `HIDDEN_GROUPS`** (PSAK/SA), dengan menampilkan jalur grup. Recognition-first; menutup tebing T4 tanpa menambah PSAK/SA ke pohon default.

### Fase 3 — Taksonomi & bahasa (M, menunggu Q1–Q3)
- **R4 · Penomoran + rename grup Perikatan** ke fase SA (`1 · Perencanaan`, `2 · Pelaksanaan`, `3 · Penyelesaian & Pelaporan`); bubarkan/rename `Core Specifics`.
- **R5 · Satukan konsep kembar** (WIP, Independensi, Pajak firma, titik masuk, Firm Finance) — satu lokasi kanonik + rujukan-silang, bukan duplikasi.
- **R8 · Mode ciut & ikon.** Pertahankan label grup mini saat collapsed ([shell.tsx:271](../migration/src/shell.tsx)); tambah ikon unik untuk ~12 modul tersering yang kini berbagi `shield`/`layers`.
- **R-lang · Kebijakan bahasa** (tergantung Q1).

## 5. Non-Scope

- **Tidak** mengubah RBAC primitives, `can()`, atau capability apa pun — perubahan ini **murni tampilan** (konsisten dengan arsitektur kurasi eksisting).
- **Tidak** menghapus atau menggabung modul secara fungsional (kecuali penyatuan lokasi navigasi R5; view/route/data tetap).
- **Tidak** mengubah header modul (PR #115 baru selesai) atau TopBar.
- **Tidak** mengubah ⌘K palette, Matriks Kepatuhan, atau minimap sebagai mekanisme (Fase 2 melengkapinya, bukan menggantikan).
- **Tidak** menyentuh `AMS_CANON` atau angka apa pun (nol risiko SSOT).
- **Tidak** memindah PSAK/SA menjadi workspace ketiga di Fase 1–2 (kandidat Q3, diputuskan sebelum Fase 3).

## 6. Constraints

- **Arsitektur:** ESM-only, edit di `migration/src/*`; aturan emas anti-tabrakan (alias hook per-file, `Object.assign(window,…)`); ratchet `no-explicit-any` (baseline — `:any` baru = fail).
- **Persist:** pola `usePersisted`/`useAmsPersist`, key `ams.v1.<key>`, selalu try/catch JSON.
- **Sistem:** state kurasi/collapse tersimpan per-browser (localStorage), bukan server — konsisten pola nav eksisting (`ams.ws`, `ams.sideShowAll`).
- **Gate wajib:** typecheck 0 · lint bersih · build sukses · test hijau sebelum tiap PR.
- **Verifikasi:** screenshot browser-pane timeout konsisten di lingkungan ini → ukur via `javascript_tool` DOM (`getBoundingClientRect`, hitung `.side-item`/`.side-group-h`).

## 7. Existing Solutions

Sudah ada di kode — dipertahankan, tidak dibangun ulang:
- **Pembagian dua-tingkat Perikatan/Firma** ([icons.tsx:307](../migration/src/icons.tsx)) — pemisahan primer yang benar.
- **Kurasi peran (`groupsVisibleFor`)** + escape hatch showAll — arsitektur benar; hanya belum diterapkan ke Perikatan & kondisi render escape hatch terlalu sempit. Fase 1 memakai mesin yang sama, tidak membuat baru.
- **Sidebar adaptif fase** (`SIDE_*`, "Fokus Fase") — konsep bagus; R7 hanya menghapus duplikasinya, R1 memakainya untuk menentukan grup default-open.
- **⌘K & Matriks Kepatuhan** — recall-based; R2 melengkapi dengan recognition-based, tidak menggantikan.

Mengapa tak cukup: mekanisme benar tapi **default-nya salah** (semua terbuka, tak terkurasi di Perikatan, tak persist) dan **34% aplikasi tak bisa dijelajah**. Perbaikan = mengubah default + satu widget filter, bukan platform baru.

## 8. Proposed Approach

Urutan by-impact/effort: **Fase 1 lebih dulu** (XS–S, nol keputusan terbuka, langsung memangkas kepadatan) → **Fase 2** (satu widget, menutup tebing discoverability) → **Fase 3** (taksonomi, setelah Q1–Q3 dijawab).

Alasan dipilih dibanding alternatif:
- **Alternatif "langsung rombak taksonomi (Fase 3) dulu"** — ditolak: berisiko tinggi, menyentuh banyak keputusan terbuka, dan menunda perbaikan XS yang sudah pasti menang. R1+R6 saja sudah menurunkan kepadatan drastis tanpa perdebatan.
- **Alternatif "auto-personalisasi berbasis MRU/ML"** — ditolak: over-engineering; progressive disclosure statis + filter sudah menyelesaikan 80% masalah dengan kompleksitas jauh lebih rendah.
- **Alternatif "tambah PSAK/SA ke pohon sidebar"** — ditolak: membengkakkan sidebar dari 158→lebih padat; filter (R2) memberi discoverability tanpa biaya kepadatan.

Setiap fase = PR terpisah, gate hijau, verifikasi DOM sebelum & sesudah (ambil ulang metrik §3).

## 9. Risks

| Risiko | Mitigasi |
|---|---|
| Kurasi Perikatan menyembunyikan modul yang dibutuhkan Junior tertentu | Escape hatch selalu ada (R3) + grup aktif selalu tampil (orientasi) + ⌘K/filter utuh. Murni UI → capability nol berubah. |
| Default-collapse membuat pengguna "kehilangan" modul | Grup fase-relevan & grup aktif tetap terbuka; state persist → pengguna atur sekali. |
| Persist `closedGroups` bertabrakan antar-workspace | Key komposit per-workspace atau simpan peta `{ws:{group:bool}}`; uji reload di kedua ws. |
| R6 (auto-expire NEW) menghapus penanda yang masih relevan | Basis tanggal rilis + ambang dapat dikonfigurasi; review daftar sekali. |
| Regresi diam-diam saat refactor render | Ambil metrik DOM sebelum/sesudah tiap PR (§3 kriteria 1–7); snapshot jumlah `.side-item` per (peran×ws). |
| Ratchet `:any` naik saat sentuh `shell.tsx`/`icons.tsx` | Ketik penuh tambahan baru; jangan tambah `:any` (un-suppress seluruh file). |

## 10. Implementation Plan

- **M1 — Fase 1a (R1 + persist):** default-collapse + `ams.v1.sideGroups`. Verifikasi: Firma default ≤15 baris, reload mempertahankan. **1 PR.**
- **M2 — Fase 1b (R3):** kurasi Perikatan Senior/Junior + escape hatch selalu render. Verifikasi: Junior Perikatan ≤ grup terkurasi, tombol ada; Partner punya escape hatch. **1 PR.**
- **M3 — Fase 1c (R7 + R6 + cleanup):** dedup Fokus Fase (44→37), auto-expire NEW (≤5 terlihat), hapus kode mati `soon`. **1 PR.**
- **M4 — Fase 2 (R2):** kotak filter inline lintas-158. Verifikasi: ketik "PSAK 73" → muncul walau tersembunyi; 100% terjangkau. **1 PR.**
- **M5 — Fase 3 (R4/R5/R8/R-lang):** setelah Q1–Q3 dijawab → PRD turunan atau lanjutan bagian ini. **≥1 PR.**

Checkpoint metrik §3 diambil ulang di akhir tiap milestone.

## 11. Open Questions

Menentukan Fase 3; **tidak memblokir Fase 1–2**. Rekomendasi saya di tiap poin:

1. **Kebijakan bahasa.** Konsisten Bahasa Indonesia penuh (kode standar SA/PSAK/ISQM/WTB/AJE tetap asli), **atau** pertahankan istilah Inggris yang lazim di KAP ("working paper", "cockpit", "review notes")? Trade-off nyata, bukan kesalahan jelas — perlu keputusan Anda, tidak saya asumsikan. *Rekomendasi: Indonesia untuk label grup & aksi; pertahankan istilah teknik yang sudah jadi jargon KAP.*
2. **Nasib `Core Specifics` (12 modul).** Dibubarkan ke fase "Pelaksanaan", atau diberi nama bermakna (mis. "Prosedur Area Berisiko / Area Khusus")? *Rekomendasi: rename "Area Khusus & Estimasi", bukan bubarkan (12 modul terlalu banyak untuk dicampur ke Pelaksanaan).*
3. **PSAK/SA tersembunyi.** Tetap tersembunyi dari pohon tapi terjangkau via filter R2 (**rekomendasi saya**), atau dikembalikan sebagai workspace ketiga "Referensi & Standar"? *Rekomendasi: filter dulu (Fase 2); evaluasi ulang kebutuhan workspace ketiga setelah data pemakaian.*

### Keputusan (2026-07-24 — Ari: "ikuti rekomendasi")
1. **Bahasa** → Indonesia untuk label grup & aksi; kode standar (SA/PSAK/ISQM/WTB/AJE) & jargon teknik KAP dipertahankan. Mitigasi murah: **kata-kunci sinonim per modul** (mis. `confirm` juga cocok "konfirmasi") agar filter R2 tak bergantung pada bahasa label.
2. **`Core Specifics`** → **rename** "Area Khusus & Estimasi" (tidak dibubarkan).
3. **PSAK/SA** → tetap tersembunyi + terjangkau via filter R2; **tidak** menambah workspace ketiga sekarang.

Fase 3 dipecah: **R4** rename+nomori grup Perikatan (`1 · Perencanaan` / `2 · Pelaksanaan` / `3 · Penyelesaian & Pelaporan`) + rename Core Specifics · **R5** satukan konsep kembar · **R8** label grup mini saat ciut + ikon unik ~12 modul · **R-lang** label grup/aksi Indonesia + sinonim filter. ⚠️ Nama grup = KEY di banyak tempat (`GROUP_WS`, `HIDDEN_GROUPS`, `ROLE_SIDEBAR_GROUPS`, `WORKSPACES.groups`, `SIDE_GROUP_PHASE`, `SIDE_PRIMARY_GROUP`, `WS_ANCHOR`, `connectivity.json`) → rename harus serempak.

---
**Sign-off:** ditandai dengan balasan **"Proceed."** — sebutkan bila hanya menyetujui Fase 1 (independen) atau seluruh rencana. Q1–Q3 dapat dijawab kapan saja sebelum Fase 3.
