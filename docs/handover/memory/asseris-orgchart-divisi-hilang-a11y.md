---
name: asseris-orgchart-divisi-hilang-a11y
description: "Modul orgchart — divisi diturunkan dari daftar KEPALA divisi (4) bukan dari data struktur (5), Managing Partner hilang senyap; simpul bagan <span onClick>. Plus empat gotcha metode."
metadata: 
  node_type: memory
  type: project
  originSessionId: bb2cac18-8800-42dc-bd48-2921f99ee344
  modified: 2026-08-21T05:23:04.595Z
---

2026-08-21 · modul `orgchart` (`migration/src/view_pc_org.tsx`), prompt
`docs/prompts-perbaikan/16-orgchart.md`. Derivasi dipindah ke berkas murni baru
`migration/src/org_structure.ts` + gerbang `org_structure.test.ts` (24 uji; modul
ini sebelumnya NOL uji).

**Cacat inti (O2):** `const depts = Object.keys(A.DEPT_HEAD)` — 4 kepala divisi,
sementara nilai `dept` pada `ORG` memuat 5. `Kepemimpinan Firma` tak punya kepala
⇒ Managing Partner TIDAK PERNAH muncul di tab Divisi (cakupan 68 dari 69), dan
kartu "Divisi / Unit" menyebut 4. Pola yang sama akan berulang di mana pun sebuah
daftar diturunkan dari tabel PENDAMPING alih-alih dari data yang dirender.

**DUA klaim prompt yang SALAH — dan keduanya cara gagal yang sama: menebak
perilaku dari bentuk kode, bukan dari yang benar-benar dijalankan.**

1. "`head.name` melempar bila DEPT_HEAD menunjuk id tak dikenal" — TIDAK. `byId`
   (`data_people.ts:283`) punya fallback `{ id, name: id, role:'', grade:'Junior' }`.
   Tak ada lemparan; yang terjadi adalah tampilan mencetak **id mentah sebagai
   nama orang**. Karangan senyap selalu lebih buruk daripada crash. Grep `byId`
   dulu sebelum menuduh "modul gagal render".
2. "Karyawan baru dari `hcm` muncul sejajar Managing Partner" — TIDAK. `grep -rn
   staffExtra migration/src` = SATU kemunculan (`view_people.tsx:31`), dipakai
   lokal `const staff = [...extra, ...AMS.STAFF]`. `AMS.STAFF` tak pernah
   ditugasi ulang atau di-push. Karyawan baru **tak pernah sampai** ke orgchart
   sama sekali. Cacat klasifikasinya nyata tapi belum terjangkau — perbaiki dan
   gerbangi, tapi JANGAN laporkan sebagai bug yang sedang menggigit.

**Gotcha metode (paling mahal):**
- **Tombol native TIDAK aktif oleh Enter lewat `mcp__Claude_Browser__computer
  key`.** Event sampai (`keydown` ter-log, `e.key==='Enter'`) tapi aktivasi
  default browser tak jalan — dispatch sintetis tanpa raw keycode. Saya nyaris
  menyimpulkan markup saya rusak. **Buktikan dengan KONTROL**: fokuskan tombol
  yang sudah ada dan diketahui waras (di sini `.seg button` "Divisi") — kalau ITU
  juga tak aktif, alatnya yang terbatas, bukan kodemu. Aktivasi papan-ketik hanya
  terbukti di Playwright; taruh uji itu di `e2e/`.
- **React belum flush di dalam satu panggilan `javascript_tool`.** `el.click()`
  lalu membaca `.sel` di blok yang sama = selalu tampak "tak berubah". Baca di
  panggilan BERIKUTNYA.
- `eslint --suppressions-location /dev/null` di Windows membuat berkas literal
  bernama `nul` di direktori kerja; hanya bisa dihapus lewat
  `Remove-Item -LiteralPath '\\?\<path>\nul'`.
- Pohon kerja ini DIBAGI sesi lain ([[asseris-sesi-paralel-satu-worktree]]):
  `npm run verify` merah di 6 gerbang, SELURUHNYA dari berkas untracked sesi lain
  (`mytasks_derive*`, `view_mytasks_parts`, `home_composition*`,
  `a11y_anchor_href`, `wip_writedown_authority`, `server/.../mytasks_scope`).
  Buktikan kepemilikan kegagalan per-berkas sebelum mengaku hijau/merah.
- Menghapus `:any` ⇒ suppression basi. Karena `eslint-suppressions.json` sedang
  dimodifikasi sesi lain, JANGAN `npm run lint:any-baseline` (ia menyulam entri
  mereka juga) — turunkan count entri berkasmu sendiri secara manual (41 → 24),
  dan jaga berkas itu TANPA newline akhir.

**Belum dikerjakan (sengaja):** `<tr onClick>` di tab "Rentang Kendali" masih
kontrol palsu — kelas yang sama dengan O1 tapi tak terdaftar di prompt, dan
`SuccessionPlanning` di berkas yang sama (yang punya pola serupa) dilarang
disentuh. Juga: `FIRM.partners+managers+staff` runtime = 75 sementara roster
merender 69 simpul — dilarang disentuh oleh prompt, tapi angkanya berselisih.

Terkait: [[asseris-sdm-kepatuhan-arc]] · [[asseris-a11y-badge-button-native]] ·
[[asseris-icon-button-names]] · [[asseris-home-a11y-komposisi]]
