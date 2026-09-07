---
name: asseris-mesin-nol-pemanggil-parkir
description: "Tiga mesin murni (home_composition · mytasks_derive · wip_adj) selesai & teruji tapi NOL pemanggil produksi — masing-masing terhalang hal berbeda, jangan di-commit tanpa penyambungnya"
metadata: 
  node_type: memory
  type: project
  originSessionId: 68d92f5f-046d-449d-9456-f298b2b39e0a
  modified: 2026-08-24T01:00:03.816Z
---

**Status per 2026-08-24: ketiganya DIPARKIR di direktori kerja utama**, belum di-commit.
Cadangan di scratchpad sesi `…/scratchpad/gel0-snapshot/`. Dibuktikan nol pemanggil:
`grep -rln "from './<modul>'" migration/src/` hanya menemukan berkas ujinya sendiri.

### `mytasks_derive.ts` + `.test.ts` + `server/src/__tests__/mytasks_scope.test.ts`
Terhalang **`docs/usulan-M2-mytasks-sumber-kebenaran.md`** — Opsi A (server jadi SSOT)
vs Opsi B (klien tetap SSOT) adalah keputusan arsitektur milik Ari, dan pilihannya
menentukan bentuk mesin ini.
⚠ Uji servernya akan **MERAH** di master: `server/src/stateAccess.ts:41` masih
mendaftarkan `'mt.meta', 'mt.personal'` sebagai kunci lingkup FIRMA (di blok "Legacy
client keys that are still intentionally persisted at firm scope"). M1 **tidak pernah
mendarat** — jadi separuh perbaikannya hilang, bukan hanya penyambungnya.
⚠ `migration/eslint-suppressions.json` sempat memuat `view_mytasks_parts.tsx` 61 → **47**
padahal berkas itu **identik dengan master** dan masih memuat 61 `:any`. Entri yatim itu
akan **memerahkan lint** kalau ikut ter-commit. Sudah dibuang saat pembersihan.

### `wip_adj.ts` + `wip_writedown_authority.test.ts`
Terhalang **`docs/usulan-W1-wip-writedown-otorisasi.md`** — "efek dulu atau otorisasi
dulu": apakah `wip.adj` membawa status sehingga `FIRMFIN.wip` hanya mengonsumsi entri
yang sudah BERLAKU. Itu keputusan kebijakan (dan menyentuh ekspor tersegel). Usulan itu
sendiri merujuk uji ini sebagai karantina `it.fails()`-nya.

### `home_composition.ts` + `.test.ts`
**Tidak ada usulan yang memblokirnya** — penghalangnya berbeda: arc modul `home`
(`docs/prompts-perbaikan/01-home.md`) tak pernah diselesaikan.
- Sebagian isinya **duplikat**: `HM_FIRMOPS_AREAS` masih dideklarasikan inline di
  `view_home.tsx:30`. Meng-commit mesin ini tanpa mengganti deklarasi itu = **dua register
  untuk satu konsep**, cacat yang justru sedang diperangi.
- Sebagian lagi untuk fitur yang **belum ada sama sekali**: `dropInOrder` · `moveInOrder` ·
  `visiblePosition` (susun-ulang portlet yang dapat dioperasikan papan ketik) tak punya
  padanan apa pun di `view_home.tsx`. Menyambungkannya = MEMBANGUN fitur, bukan mengirim.

**Why:** repo ini **tidak punya gerbang variabel mati** (`no-unused-vars` mati di KEDUA
blok `migration/eslint.config.js` — lihat `docs/usulan-S1-gerbang-variabel-mati.md`), jadi
mesin tanpa pemanggil tidak akan pernah memerah. Ia hanya menumpuk sampai seseorang
mengira ia sudah dipakai.

**How to apply:** jangan commit mesin tanpa pemanggil dengan alasan "nanti dipakai". Untuk
`home_composition`, sambungkan bersamaan dengan arc `home` dan sertakan uji yang
membuktikan SITUS RENDER berubah — bukan sekadar mesinnya benar.

Lihat juga [[asseris-mytasks-user-scope]] · [[asseris-wip-writedown-atribusi-otorisasi]] ·
[[asseris-home-a11y-komposisi]] · [[asseris-gelombang0-baseline-master-bukan-head]]
