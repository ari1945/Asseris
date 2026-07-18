# PRD — Deep-Link Tab Navigasi (Timeline → Modul + Tab)

> Wajib diisi sebelum implementasi apa pun. Implementasi TIDAK dimulai sebelum ada sign-off ("Proceed.").

| Field | Isi |
|---|---|
| Tanggal | 2026-07-18 |
| Pemilik | Ari Widodo |
| Status | SELESAI (Fase 0–3, 2026-07-18) — gerbang hijau + live-verified |
| Engagement ID terkait | — (fitur produk lintas-engagement) |

## 1. Problem

Dari modul **Jadwal & Lini Masa Audit** (`audittimeline`), tiap baris aktivitas Gantt dapat diklik untuk membuka modul prosedur terkait. Hasil evaluasi (2026-07-18):

- **Modul: benar.** Ke-18 aktivitas + 2 tombol footer semuanya menuju `id` route yang terdaftar nyata di `viewFor()` — tidak ada yang nyasar ke `StubView`/`ComplianceView`.
- **Tab: tidak pernah tepat.** `navigate(id, opts)` ([app.tsx:425](migration/src/app.tsx:425)) hanya membaca `opts.from` (breadcrumb) lalu `setRoute(id)` — **tidak ada parameter tab**. Akibatnya aktivitas mendarat di tab **default atau tab terakhir yang dipakai** (beberapa modul menyimpan tab terakhir di `localStorage`, sehingga hasilnya bahkan **non-deterministik**).

Dampak nyata:
- `confirm` (Confirmation Hub) dituju **dua kali** — C-100 (kas/bank) & C-600 (liabilitas/utang) — padahal modul punya filter jenis (`Bank`/`Piutang`/`Utang`/`Legal`/`Pihak Berelasi`, [view_confirm_parts.tsx:13](migration/src/view_confirm_parts.tsx:13)). Keduanya mendarat identik; auditor harus mem-filter manual.
- `psak16` menyimpan dua state tab (`ams.psak16.regtab`, `ams.psak16.tab`, [view_psak16.tsx:123](migration/src/view_psak16.tsx:123)) → aktivitas mendarat di tab terakhir user, bukan tab relevan.
- Pola sama di `risk`, PSAK-suite, `reviewnotes`.

Masalah ini **bukan khusus timeline**: setiap deep-link (Copilot, Matriks Kepatuhan, dock Hulu/Hilir, chip Standar Terkait) mewarisi keterbatasan `navigate` yang sama.

## 2. Objective

Membuat navigasi antar-modul mampu **menargetkan tab/lensa spesifik** secara deterministik, sehingga aktivitas timeline (dan deep-link lain) membuka **modul + tab yang tepat untuk konteks task** — tanpa auditor perlu mencari tab/filter manual, dan tanpa terganggu tab terakhir yang tersimpan.

Ini objective yang benar karena: (a) akar masalah ada di **kontrak `navigate`** (satu titik), bukan di tiap pemanggil; memperbaikinya di sana memberi leverage lintas-fitur; (b) mempertahankan SSOT — tab tetap milik modul, navigasi hanya menyampaikan *maksud* tab awal.

## 3. Success Criteria

1. `navigate(id, { from, tab })` menerima `tab` opsional; memanggil tanpa `tab` **berperilaku identik** dengan sekarang (nol regresi).
2. Aktivitas timeline yang dipetakan mendarat di tab yang benar **secara deterministik**, mengabaikan tab terakhir yang tersimpan — diverifikasi live untuk minimal: C-100→confirm/**Bank**, C-600→confirm/**Utang**, C-400→psak16/**register**, A-200→risk/**register**.
3. Tidak ada kebocoran keadaan: setelah dipakai sekali, tab yang diminta **dikonsumsi** (navigasi manual berikutnya ke modul yang sama tidak memaksa tab lagi).
4. Gerbang hijau: `npm run typecheck` = 0, `npm run lint` = 0, `npm run build` sukses, `npm test` (canon) tanpa perubahan snapshot (fitur ini tak menyentuh canon).
5. Nol perubahan pada lapisan `AMS_CANON`/data numerik.

## 4. Scope

1. **Perluasan kontrak `navigate`** ([app.tsx:425](migration/src/app.tsx:425)) untuk membawa `opts.tab`, disimpan sebagai **one-shot pending-tab** ber-scope modul (consume-once), aman terhadap reload.
2. **Helper konsumsi**: hook kecil `useInitialTab(moduleId, fallback)` (atau setara) yang mengembalikan tab yang diminta sekali lalu menghapusnya; modul memakainya sebagai **seed** state tab (override default/last-used hanya saat tiba via deep-link).
3. **Perkaya `ATL_TASKS`** ([view_audittimeline.tsx:30](migration/src/view_audittimeline.tsx:30)) dari `{ mod }` → `{ mod, tab? }` dan teruskan `tab` pada `nav(...)` (baris 182/284/335).
4. **Adopsi bertahap pada modul-tujuan yang bertab**, prioritas nilai tertinggi:

   | Ref | Aktivitas | mod | Tab target |
   |---|---|---|---|
   | C-100 | Kas, bank & konfirmasi bank | `confirm` | filter **Bank** |
   | C-600 | Liabilitas & konfirmasi utang | `confirm` | filter **Utang** |
   | C-400 | Aset tetap & penyusutan | `psak16` | **register** |
   | A-200 | Pemahaman entitas & lingkungan | `risk` | **register** |
   | A-410 | Permintaan data awal (PBC) | `clientportal` | tab PBC (id final saat impl.) |
   | C-300 | Persediaan & penilaian | `psak14` | Kertas Kerja (id final saat impl.) |

   Aktivitas ke modul **single-tab / tanpa tab natural** (materiality, ecl, aje, psak46, psak72, subsequent, eqr, opinion, programme, onboarding, reviewnotes, delivery, scheduler) **tetap tanpa `tab`** → perilaku sekarang dipertahankan (tak ada regresi, tak ada penebakan).

## 5. Non-Scope

- **Tidak** memecah aktivitas "bundel" atau me-repoint `mod` (mis. A-310 "strategi"→`strategy`, A-100 "keberlanjutan"→`continuance`, C-900 "WTB"→`wtb`). Itu keputusan produk terpisah (lihat §11).
- **Tidak** mengubah struktur/tab internal modul mana pun; hanya menyeed tab awalnya.
- **Tidak** membuat deep-link berbasis URL/router nyata (app tetap state-route `ams.route`).
- **Tidak** menyentuh `AMS_CANON`, data numerik, atau server.
- **Tidak** memigrasi seluruh pemanggil `navigate` lain (Copilot/Matriks/dock) dalam rilis ini — mereka otomatis dapat kemampuan `tab` tetapi pemetaannya di luar scope.

## 6. Constraints

- **Arsitektur**: ESM-only, sumber di `migration/src/*` (BUILD.md). Aturan emas anti-tabrakan tetap berlaku (alias hook per-file, ekspor `Object.assign(window,…)`).
- **Tanpa `@types/react`**: hook/handler baru pakai `:any` sesuai baseline; hindari type-arg pada `useState`.
- **Nol-regresi kontrak**: `navigate` dipakai luas — perubahan wajib backward-compatible (arg `tab` opsional).
- **Persistensi tab modul beragam**: sebagian pakai `usePersisted`/`useAmsPersist`, sebagian `localStorage.getItem` langsung. Mekanisme seed harus override *nilai awal* apa pun sumbernya, tanpa membatalkan penyimpanan tab manual sesudahnya.

## 7. Existing Solutions

- **`opts.from`** sudah ada (breadcrumb SubBar) — membuktikan pola "navigate membawa metadata" sudah diterima; kita menambah `tab` pada amplop yang sama.
- **`window.__amsOpenSA(data)`** membuka drawer SA via imperative global — preseden penyampaian konteks lintas-modul, tapi untuk drawer, bukan tab in-view; tak bisa dipakai ulang langsung.
- **Tab-state per-modul** sudah ada (mis. `ams.risk.tab`, `ams.psak16.tab`) — kita **tidak menggantinya**, hanya menyeed nilai awalnya. Tak ada solusi siap-pakai untuk "seed tab dari navigasi" → custom minimal dibenarkan.

## 8. Proposed Approach

**Mekanisme one-shot pending-tab (consume-once), bukan context reaktif.**

1. `navigate(id, opts)`: bila `opts.tab`, tulis one-shot `sessionStorage['ams.navtab.' + id] = opts.tab` **sebelum** `setRoute(id)`. (sessionStorage → tahan reload dalam sesi, tak bocor lintas sesi; one-shot → tak ada staleness.)
2. Helper `useInitialTab(moduleId, fallback)`: saat mount, baca kunci; bila ada → **hapus** (consume) dan pakai sebagai nilai awal; bila tak ada → pakai `fallback` (default/last-used modul seperti sekarang). Ekspor via `contexts.tsx` (SSOT hook) + `window` sesuai konvensi.
3. Modul bertab mengganti inisialisasi state tab-nya dari `fallback` menjadi `useInitialTab('<id>', fallback)`. Untuk `confirm` (filter, bukan tab persist) → seed `fType`.

**Alasan dipilih dibanding alternatif:**
- vs **Context reaktif** (`useNavTab`): context menambah plumbing + risiko re-render/`useEffect` dan sulit "sekali pakai"; one-shot lebih sederhana, terlokalisasi, dan aman reload.
- vs **Parameter render `viewFor(route, tab)`**: memaksa `route` jadi objek, menyentuh boundary/router lebih dalam, dan tab hilang saat re-render tanpa penyimpanan — lebih rapuh.
- vs **Deep-link URL**: overkill; app belum ber-URL-router, di luar scope.

## 9. Risks

| Risiko | Mitigasi |
|---|---|
| Regresi pemanggil `navigate` lain | `tab` **opsional**; jalur tanpa `tab` = identik. Uji: navigasi manual & deep-link lama tetap normal. |
| Tab tersimpan "menang" atas tab yang diminta | `useInitialTab` **override** nilai awal apa pun sumbernya; verifikasi live dengan sengaja menyetel tab terakhir berbeda. |
| Staleness (tab lama muncul di kunjungan berikutnya) | Semantik **consume-once** (hapus saat dibaca) + sessionStorage (bukan localStorage). |
| Tab id salah ketik → tab tak dikenal | Modul fallback ke default bila tab tak dikenal; id tab final diambil dari sumber tiap modul saat implementasi, bukan ditebak. |
| Tabrakan nama global (aturan emas) | Hook di-alias/di-ekspor sesuai konvensi; tak ada `styles`/hook polos baru. |

## 10. Implementation Plan

- **Fase 0 — Mekanisme inti.** `navigate` + `useInitialTab` (contexts) + ekspor. Uji unit ringan/asap: `nav(id,{tab})` → sessionStorage terisi → hook mengembalikan lalu menghapus. Gerbang hijau. *(Belum ada perubahan UI yang terlihat.)*
- **Fase 1 — Timeline flagship.** Perkaya `ATL_TASKS` + teruskan `tab`; adopsi di `confirm` (Bank/Utang), `psak16` (register), `risk` (register). **Live-verify** keempatnya (termasuk skenario "tab terakhir berbeda").
- **Fase 2 — Lengkapi pemetaan bertab sisanya** yang punya tab natural (clientportal/PBC, psak14/Kertas Kerja) sesuai ketersediaan tab id; sisanya tetap tanpa `tab`.
- **Fase 3 — Dokumentasi.** Catat pola `{mod,tab}` + `useInitialTab` di `CLAUDE.md` §Navigasi & BUILD bila perlu, agar deep-link lain (Copilot/Matriks) bisa mengadopsi kemudian.

Milestone rilis = akhir Fase 1 (nilai utama tercapai, gerbang hijau, live-verified).

## 11. Open Questions

1. **Aktivitas bundel** — apakah A-310 diarahkan ke `strategy` (bukan `programme`), A-100 menambah jalur `continuance`, C-900 ke `wtb`? (Keputusan produk; default PRD ini: **biarkan `mod` apa adanya**, hanya tambah `tab`.)
2. **R-200 vs R-400** (Reviu manajer vs partner) sama-sama `reviewnotes` — perlukah tab/filter pembeda (mis. lensa peran) atau cukup satu tab? (Butuh cek apakah `reviewnotes` punya lensa yang cocok.)
3. **Cakupan adopsi** — cukup timeline dulu (Fase 1–2), atau sekalian petakan deep-link Matriks Kepatuhan pada rilis yang sama?

---
**Sign-off:** ditandai dengan balasan **"Proceed."**
