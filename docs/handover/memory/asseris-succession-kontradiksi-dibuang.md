---
name: asseris-succession-kontradiksi-dibuang
description: Modul succession — 6 dari 9 kontradiksi klaim-vs-bukti dihitung lalu dibuang; repo TIDAK punya gerbang variabel mati sama sekali
metadata: 
  node_type: memory
  type: project
  originSessionId: 657611f8-2e4c-457b-ba04-f35f2a6336b2
  modified: 2026-08-21T06:47:57.611Z
---

Arc `succession` (Suksesi & Karier), 2026-08-21, prompt `docs/prompts-perbaikan/19-succession.md`.
Berkas: `migration/src/view_pc_org.tsx` (+ modul murni baru `succession_board.ts`, uji `succession_board.test.ts`).

**Yang diperbaiki:** S1 sinyal dibuang · S2 peringatan lewat glyph "⚠" tanpa nama ·
S3 `<tr onClick>` (dua modul di berkas yang sama) · S4 rujukan orang tak dikenal dikarang jadi orang.

**GOTCHA terbesar — repo ini NOL gerbang untuk variabel mati.**
`contradicting` dihitung lalu dibuang dan tak ada yang merah, karena:
`no-unused-vars: 'off'` di **DUA** blok `migration/eslint.config.js` (baris 54 dan 99);
`@typescript-eslint/no-unused-vars` tak pernah dinyalakan; dan `strict: true` **TIDAK**
mencakup `noUnusedLocals`/`noUnusedParameters` — keduanya flag terpisah yang tak disetel.
Blok `.ts(x)` mematikannya dengan alasan "tsc pemilik kebenaran ini" — alasan yang tak
berlaku untuk kelas cacat ini. Berlaku untuk SELURUH berkas, bukan modul ini saja.
Usulan ratchet: `docs/usulan-S1-gerbang-variabel-mati.md`. Belum dikerjakan.

**GOTCHA — fallback `byId` melahirkan SKOR, bukan cuma nama.**
`A.byId('EMP-999')` → `{name:'EMP-999', grade:'Junior', cert:''}` (data_people.ts:283, TIDAK melempar).
Grade/cert palsu itu masuk `readinessOf()` dan menghasilkan `Siap 2–3 th` + 2 pemblokir yang
lengkap dan meyakinkan — untuk orang yang tidak ada — lalu ikut ke ekspor tersegel.
Obatnya bukan mengubah `byId` (dipakai lintas modul) melainkan menolak memanggil mesin
kesiapan untuk rujukan tak terselesaikan. Lihat [[asseris-orgchart-divisi-hilang-a11y]].

**GOTCHA — Enter dari alat browser in-app TIDAK sampai ke halaman** (sesi non-interaktif:
Browser pane tak menampilkan, screenshot pun gagal "not compositing frames").
Terulang persis seperti arc orgchart. **Selalu jalankan KONTROL** (tombol lain yang jelas
benar) sebelum menyimpulkan markup sendiri salah. `element.click()` lewat javascript_tool
bekerja; `computer{action:'key'}` tidak. Baca hasil React SETELAH tick berikutnya —
`getAttribute('aria-pressed')` tepat sesudah `.click()` masih nilai lama.

**Kondisi worktree saat itu (bukan cacat saya):** `npm run verify` MERAH di keenam gerbang,
semuanya dari berkas **untracked** milik arc lain yang menganggur di worktree bersama ini
(`mytasks_derive.ts`, `mytasks_scope.test.ts`, `home_composition.test.ts`,
`wip_writedown_authority.test.ts`, `a11y_anchor_href.test.ts`, plus baseline
`eslint-suppressions.json` yang diturunkan tanpa kode pendampingnya → 61 `:any`
`view_mytasks_parts.tsx` tak lagi tersupresi). Nol di antaranya berkas saya.
Cara membuktikan kepemilikan: `git status` (`??`) + mtime berkas (sehari lebih tua dari sesi).
Lihat [[asseris-sesi-paralel-satu-worktree]].

**Catatan desain:** `successionRoleState` memetakan penerus dalam URUTAN yang sama →
zip lewat indeks, bukan lewat id (id kembar tak saling menelan). Kanon tak diubah.
