---
name: asseris-tab-beralamat-v9
description: Arc PRD V-9 tab beralamat (2026-08-15) - useInitialTab jadi dua arah, gerbang SC-9, PR #238; temuan koreksi alamat dari verifikasi hidup
metadata:
  type: project
---

Arc **2026-08-15**, cabang `feat/addressable-tabs-v9`, **[PR #238](https://github.com/ari1945/Asseris/pull/238) MERGED** (squash, 9/9 CI hijau).
`origin/master` = **`4437f0c`**. PRD `docs/prd-addressable-tabs.md` → **Implemented**.
**[#220](https://github.com/ari1945/Asseris/pull/220) DITUTUP** — dua commit PRD-nya di-cherry-pick
ke #238 supaya dokumen & implementasi mendarat bersama. Pemicu: Ari "lanjut prd v9"
(saya baca sebagai sign-off, dinyatakan terbuka sebelum mulai).

**Bentuk solusinya:** `tab_address.ts` (baru, murni & node-testable) menampung sumbu tab —
`tabFromHash` · `nextTabHash` · `coerceTab` · `writeTabToAddress`. `useInitialTab` di
`contexts.tsx` naik jadi DUA ARAH **dengan tanda tangan sama persis**, jadi 13 modul
pemakainya sembuh tanpa disentuh. Param ke-3 opsional `validTabs` menutup SC-6.

**KUNCI ANTI-GELUNG (R-1, ini membekukan app):** `history.replaceState` **TIDAK** memicu
`hashchange`. Itu penjaga utamanya — tulisan kita tak pernah kembali sebagai pembacaan.
Dua lapis lain: `nextTabHash` → null bila tak ada perubahan; pembaca hanya setState bila beda.

**TEMUAN yang hanya muncul di verifikasi HIDUP** (uji awal sudah hijau): tab busuk yang datang
lewat `hashchange` membuat state jatuh ke tab berlaku TAPI **alamat tidak dikoreksi** — hash
tetap menyebut id yang tak ada, yaitu persis penyakit yang V-9 obati. Sebabnya `tab` tak
berubah → efek "state → alamat" tak menembak. Perbaikan: koreksi alamat eksplisit di handler
`hashchange` bila `next !== t`. Pola berulang di repo ini: mesin benar, jalur tampilan/penulisan
tak disapu tuntas — lihat [[asseris-tinjauan-visual-smm-2026-08-13]] & [[asseris-fsgen-lpe-oci-column]].

**GOTCHA — closure basi di listener yang dipasang sekali.** `useEffect(..., [moduleId])` berarti
`tab` di dalam handler beku pada nilai saat mount. Terdeteksi bukan oleh uji melainkan oleh
lint: directive `eslint-disable react-hooks/exhaustive-deps` dilaporkan **"unused"** — itu
sinyal bahwa rule-nya memang tak protes, dan saya sedang menutupi masalah yang salah. Solusi:
`useRef` untuk nilai terkini, bukan menambah deps (itu memasang-lepas listener tiap klik tab).

**GOTCHA — jsdom mengirim `hashchange` ASINKRON.** `React.act(() => { location.hash = x })` lalu
langsung membaca state = kegagalan PALSU. Harness harus `await` satu makrotask di dalam
`await React.act(async () => {...})`. Juga: set `IS_REACT_ACT_ENVIRONMENT = true` di `beforeEach`
(pola yang sudah dipakai `overlay.test.ts`), kalau tidak konsol penuh peringatan.

**Gerbang SC-9 DIBUKTIKAN menggigit**, bukan hijau kosong: menyisipkan `nav('billing',{tab})`
percobaan memerahkannya (`expected [ 'billing' ] to deeply equal []`), lalu probe dicabut. Uji
gerbang statik di repo ini punya preseden `materiality_single_door.test.ts` — tirulah polanya
(`stripComments` + baca `lazy_views.tsx` sebagai SSOT peta rute→berkas).

**Konsekuensi Q-2 yang WAJIB disebut apa adanya:** `replaceState` → klik tab tak membuat entri
riwayat, jadi **Back = keluar modul**, bukan menyusuri tab. Diverifikasi hidup: dari
`#/wip?tab=realisasi`, Back mendarat di `#/soqm?tab=toolkit` (tab modul sebelumnya pulih utuh).

**Non-Scope tetap:** sumbu `sel` (Q-3) — id entitas di URL membocorkan KEBERADAAN entitas;
butuh PRD sendiri dengan analisis kerahasiaan. Migrasi 61 modul bertab tetap **atas pemicu**.

Uji: +39 (`tab_address.test.ts` 22 · `use_initial_tab.test.ts` 17 jsdom). Total 1754.
Ratchet `:any` tetap 8058.
