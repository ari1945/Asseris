---
name: asseris-independence-sod-rantai
description: "Modul independence — rantai 3 lapis tanpa pemisahan peran, level yang dikarang dari `declared`, dan penolakan 403 yang senyap di flush(); plus jebakan dev.db & preview cwd."
metadata: 
  node_type: memory
  type: project
  originSessionId: 12ea642c-78ec-4ba2-ac5b-aa95d9dc7957
  modified: 2026-08-21T08:05:10.916Z
---

Arc 2026-08-21, **PR #276** (`fix/independence-sod`, commit `571cb91`, dari `origin/master` `1b32c7f`).
Sumber tugas: `docs/prompts-perbaikan/25-independence.md` (I1–I7). `npm run verify` hijau
(159/2850 frontend · 31/461 backend); CI **9/9 hijau** termasuk Playwright/axe. Menunggu reviu Ari.
Dua commit: `571cb91` (klien) + `55f32f0` (penegakan SERVER, atas permintaan Ari).

**Yang paling mahal ditemukan (bukan di daftar cacat):** `lvlOf` lama berbunyi
`if (a == null) return d.declared ? 3 : 0`. Karena SELURUH baris seed `declared:true`,
setiap orang tampil **"Disetujui"** dengan tiga langkah "✓ Selesai" tanpa seorang pun
pernah mereviu. Itu bukan rantai yang lemah — itu rantai yang **dikarang**. Cari pola ini
di mana pun sebuah flag boolean dipetakan langsung ke level rantai.

**Keputusan kebijakan akses (dijawab kode, bukan ditanyakan):** modul personal-key
(`PERSONAL_STATE_KEYS`) = **terbuka-baca + tulis tergerbang**, BUKAN tertutup penuh.
Buktinya tiga lapis: `MODULE_CAP` (icons.tsx:339) sengaja memuat hcm/recruitment/learning/
succession tapi TIDAK cpe/independence/payroll/leave/ethics; sibling payroll/hrops/pc_conduct
semuanya `isFull`/`canHrManage` bukan `<AccessDenied>`; dan `view_personal.tsx` sudah punya
jalur tanda-tangan-sendiri (`personalSelfService.declareSelf`) dengan teks "Reviu manajer &
persetujuan partner mengikuti di modul Independensi".

**Peta kewenangan domain etika/SDM (dipakai ulang, bukan diciptakan):**
`HR_MANAGE` = tulis operasional · `FIRM_ADMIN` = otoritas rekan (pengecualian etik
`ethics_gate.tsx:51` memakai pola yang sama). Lapis rantai: 1 = identitas (`resolveEmpId`,
hanya ybs.) · 2 = HR_MANAGE · 3 = FIRM_ADMIN. Aturan "SATU ORANG SATU LAPIS" disalin
alasannya dari `aje_approval.stepAuthority` (PR-E) — TAPI fungsinya tak bisa dipanggil
langsung karena AJE menolak self-approval di SETIAP langkah sementara di sini lapis 1
justru HARUS diri sendiri. Modul murni baru: `migration/src/indep_approval.ts`.

**Penegakan SERVER (commit ke-2).** `indepAppr`/`independence`/`indepThreats`/`indepRotAck`
masuk `SIGNOFF_KEYS`; `guardSignoffWrite` mengimpor `indep_approval` — SATU aturan, dua sisi.
Server menambah dua hal yang tak bisa ditanyakan klien atas dirinya: tanda tangan harus menyebut
SESI (`byUserId`+`byEmpId`; `empId` dari `resolveEmpId` server, bukan payload), dan tanda tangan
yang ada tak boleh ditulis ulang (hapus = FIRM_ADMIN). Infrastrukturnya SUDAH ADA:
`SignoffContextNeeds.actorEmpId` dibuat untuk `pc.ethics` — tinggal dipakai.

**Lintas-modul yang ikut diperbaiki:** `flush()` (contexts.tsx) dulu hanya mengenali
CONFLICT; 403 FORBIDDEN jatuh ke cabang "offline" yang MEMPERTAHANKAN nilai lokal tanpa
toast. Sekarang `writeFailureKind()` (api.ts) memisahkan conflict/rejected/offline;
'rejected' menarik nilai kembali dari server lalu memunculkan toast merah.

## GOTCHA yang akan menggigit lagi

1. **`preview_start` menjalankan launch.json dari cwd SESI, bukan dari worktree.** Vite &
   server yang saya start "di worktree" sebenarnya menyajikan **sumber + dev.db worktree
   UTAMA**. Gejalanya menipu: aplikasi jalan, tapi perubahan Anda tak terlihat. Jalankan
   `npx vite --port <n>` lewat Bash dari direktori worktree, lalu `preview_start {url}`.
2. **`version-mismatch:server=N` bisa BERBOHONG.** Router menghitung prefix pesan dari
   `baseVersion` klien, bukan dari sebab sebenarnya. Sebab nyata di dev.db worktree utama:
   `stateDoc.version = 1` tapi `stateDocHistory` sudah punya baris v2 → `create` history
   kena P2002 → dilaporkan sebagai version-mismatch. `mutateStateDoc` menangani lubang ini
   untuk jalur CREATE (`last.version + 1`) tapi TIDAK untuk jalur UPDATE. Cek DB dulu
   sebelum menuduh klien.
3. **`state.get` DITOLAK (403 `personal-filter-required`) untuk personal key.** Jalur
   pemulihan konflik di `flush()` memanggil `state.get` — jadi untuk keempat kunci
   independensi, recovery konflik memang tak pernah bisa bekerja. Belum diperbaiki.
4. **Argumen tipe generik pada hook React = TS2347** (tak ada @types/react). `useStateE<T>(x)`
   gagal; pakai `useStateE(x)` + `as T` di titik baca.
5. **Ratchet `:any` menghitung `as any` juga.** Menambah 3 `as any`/`: any` di contexts.tsx
   meng-un-suppress SELURUH berkas (141 error). Netralkan dengan mengangkat `as any` yang
   sudah ada ke satu helper bersama (`readTarget`), bukan menaikkan baseline.
6. **Posisi rantai di SERVER harus dari TANDA TANGAN, bukan dari `declared`.** `independence`
   dan `indepAppr` adalah DUA StateDoc lewat debounce 400 ms yang sama; urutan kedatangannya tak
   dijamin. Kalau posisi bergantung pada dokumen saudara, lapis 1 ditolak "mundur" setiap kali
   tulisan `declared` mendarat lebih dulu. Pola umum: **setiap aturan server yang membaca dokumen
   SAUDARA yang ditulis klien yang sama harus tahan terhadap urutan kedatangan.**
7. **Modul aturan yang dibaca server tak boleh menyeret `./data`** (menyentuh `window` ⇒ server
   mati saat boot). `rotTier` karena itu pindah dari `data_licensing` → `canon_rotation` (leaf),
   di-re-export supaya pengimpor lama utuh. Dijaga uji daftar-impor, bukan ditemukan saat deploy.
8. Menyusun uji SoD: pilih PEMERAN dengan hati-hati — kalau aktor kebetulan juga deklaran, aturan
   "tak boleh mereviu diri sendiri" menyala lebih dulu dan gerbang yang sedang diuji tak pernah
   tersentuh. Saya kena dua kali.
9. `npm run verify` sekali MERAH ("backend tests", tanpa satu pun nama uji) lalu hijau 3× berturut.
   Dugaan: lock `test.db` Windows dari proses vitest sebelumnya. Bukan cacat kode; jangan mengejar.
10. Seed hanya punya SATU pemegang `FIRM_ADMIN` + `PERSONAL_INDEP_VIEW_FIRM`
   ('Rekan Pemimpin'). 'Engagement Partner' punya FIRM_ADMIN tapi self-only untuk data
   personal — ia hanya melihat barisnya sendiri. Rantai 3 tanda tangan tetap bisa tuntas
   (deklaran → Yuni HR → Hartono), tapi jangan kaget saat login partner lain tak melihat
   satu baris pun.

Terkait: [[asseris-repo-hygiene-2026-08-19]] · [[asseris-sesi-paralel-satu-worktree]] ·
[[asseris-prisma-client-worktree-trap]] · [[asseris-wip-writedown-atribusi-otorisasi]]
