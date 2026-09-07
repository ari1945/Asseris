---
name: asseris-home-a11y-komposisi
description: "Modul home — kontrol palsu, susun-ulang hanya-tetikus, nol uji komposisi peran; plus gotcha verifikasi browser & mutasi berkas CRLF campuran"
metadata: 
  node_type: memory
  type: project
  originSessionId: 968538a5-7d83-494a-bec8-c3b97c32023b
  modified: 2026-08-20T04:30:49.473Z
---

2026-08-20 — tiga cacat modul `home` ditutup dalam satu arc. Sumber baru:
`migration/src/home_composition.ts` (modul MURNI, tanpa React) + dua gerbang
`home_composition.test.ts` & `a11y_anchor_href.test.ts`.

**POLA YANG BERULANG — dua daftar untuk satu keputusan.** `isFirmOps` dulu
perbandingan literal `role === 'Admin & HR Firma' || role === 'Finance Firma'`
SEKALIGUS ada peta `HM_FIRMOPS_AREAS` dengan dua kunci yang sama. Dua daftar,
satu bisa lupa diperbarui. Kini keanggotaan peta ITU-lah definisi firm-ops.
Gerbangnya memaku peta itu ke definisi yang TIDAK bersumber darinya: peran tanpa
`CAP.WP_EDIT` di `rbac.ts` — non-tautologis. Catatan: `ROLES` sekarang **8**
peran, bukan 6 seperti tertulis di CLAUDE.md/PRD.

**Uji menemukan cacat yang tak dicari.** `firmOpsAreaFor` memakai indeks polos
`MAP[role]`, `isFirmOpsRole` memakai `hasOwnProperty` — keduanya berbeda pendapat
untuk peran bernama `'constructor'`/`'toString'` (indeks polos mengembalikan
anggota prototipe → `area.ids.map` melempar). Kalau menulis dua fungsi atas satu
peta, salurkan yang satu lewat yang lain. Bandingkan [[asseris-fixedassets-register-tunggal]].

**Susun-ulang kokpit: jalur tetikus & papan ketik WAJIB berbagi fungsi murni.**
`dropInOrder`/`moveInOrder` dipakai keduanya. `moveInOrder(order, id, delta, visible)`
menerima daftar TERLIHAT — portlet "persetujuan" hilang saat kosong, dan tanpa
argumen itu satu tekanan panah ditelan portlet tak-kasat-mata (layar diam).
Gagang = `<button type="button">` lewat komponen tunggal `HcGrip`.

**GOTCHA — `aria-label` lewat spread TIDAK dilihat gerbang statik.** Gerbang
`a11y_icon_buttons.test.ts` memindai TEKS SUMBER tag pembuka. `<button {...grip}>`
dengan aria-label di dalam `grip` LOLOS pemindaian padahal namanya ada, dan
sebaliknya menyembunyikan yang hilang. Tulis `aria-label={…}` harfiah di JSX.

**GOTCHA — berkas repo bisa CRLF & LF CAMPURAN dalam satu berkas.**
`view_home_cockpit.tsx` begitu. Penggantian string lewat python `newline=''`
diam-diam TIDAK COCOK kalau literal memakai `\n` saja — mutasi tampak "berhasil"
padahal no-op, dan gerbang tampak lolos padahal tak pernah diuji. Selalu cetak
`changed: True/False` dan periksa hasilnya. Lihat juga [[asseris-repo-hygiene-2026-08-19]].

**GOTCHA — verifikasi browser di sesi ini:**
- Panel Browser tak ditampilkan ⇒ `screenshot` selalu timeout. `read_page`,
  `get_page_text`, `javascript_tool`, `computer key` tetap jalan.
- `computer key ArrowUp` MEMICU `onKeyDown` React (jalur papan ketik terbukti),
  tetapi `Enter` pada `<button>` TIDAK memicu aktivasi-default browser (klik).
  Jangan simpulkan tombol rusak; buktikan handler dengan `el.click()`.
- Login form via `form_input`+klik bisa GAGAL SENYAP setelah logout lewat fetch
  mentah. Yang berhasil: POST `/trpc/auth.login` langsung, lalu **muat ulang penuh**
  — cookie sesi baru dibaca saat boot.
- Cabang offline (`taskOffline`) dipaksa dengan menimpa `window.fetch` menolak
  URL ber-`tasks.mine`, LALU melepas-pasang Beranda (`#/aje` → `#/home`).
  Mengganti hash ke rute yang tak melepas Beranda tidak me-remount efeknya.
- Server tRPC :5181 milik sesi lain sudah menyala — cukup dipakai; lihat
  [[asseris-sesi-paralel-satu-worktree]].

**Utang tersisa (di-spawn sebagai tugas terpisah):** 4 permukaan drag lain masih
hanya-tetikus — `view_dashboard.tsx:34,351` (lewat `<Portlet>` di `ui.tsx:72`,
kena SEMUA pemakainya), `view_firm.tsx:357`, `view_mytasks.tsx:122`,
`view_pipeline.tsx:200`. Terkait [[asseris-icon-button-names]] dan
[[asseris-a11y-badge-button-native]].
