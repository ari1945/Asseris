---
name: asseris-firm-identity-mock-mengarang-konteks
description: "PR #290 — tiga tombol ekspor treasury permanen `disabled` (bukan rejection senyap), dan mock uji yang mengarang bentuk konteks sehingga oracle memvalidasi dirinya sendiri"
metadata: 
  node_type: memory
  type: project
  originSessionId: ab5a2df6-ca0a-45ec-a238-e7fcd72660f7
  modified: 2026-08-22T23:08:28.554Z
---

PR #290 (cabang `claude/firm-identity-treasury-export`, CI 9/9) di atas `77dba9b`.

**Cacatnya.** `view_firmtreasury.tsx` membaca `useFirm().firm.name`. FirmContext TAK
PERNAH menerbitkan kunci `firm` (itu kunci **AuthContext**: `contexts.tsx` menaruh
`firm: D.FIRM` di nilai AuthContext).

**Premis prompt yang saya cabut.** Laporannya bilang akibatnya "unhandled promise
rejection, layar diam". Salah. `bankReconExportModel` memang melempar pada nama kosong,
tapi **tak pernah sempat dipanggil**: ketiga tombol dijaga `disabled={!firmName}`, jadi
ketiganya (Export Anggaran + dua tombol ekspor rekonsiliasi) **permanen mati**. Bukan satu
tombol — tiga. Pelajaran umum: sebelum menerima cerita "gagal senyap", cek dulu apakah
jalur itu **bisa dicapai sama sekali**; penjaga `disabled` yang selalu benar menghasilkan
gejala yang berbeda dari exception yang tertelan.

**GOTCHA TERBESAR — mock yang MENGARANG bentuk konteks.**
`cash_bank_render.test.ts` & `treasury_render.test.ts` me-mock
`useFirm: () => ({ firm: { name } })`. Uji "tombol ekspor hidup ketika identitas firma
tersedia" karena itu HIJAU terhadap konteks yang tak pernah ada di produksi — uji berhenti
pada `disabled === false`, dan `disabled` itu sendiri dihitung dari nilai yang dikarang
harness. Oracle memvalidasi dirinya. Ini kelas cacat yang sama dengan `wtbRows([])` jatuh
ke singleton di [[asseris-diagnostic-atribusi-masukan]]: harness yang melanggar properti
yang sedang diuji.

**Gerbang yang dipasang** (`migration/src/firm_identity.test.ts`, jsdom):
kunci sah diambil dari **nilai provider yang benar-benar dirender** (`AppProviders` dengan
`./api` di-mock, pola dari `stage0_context_races_repro.test.ts`) — bukan daftar salinan
tangan, karena daftar salinan akan basi persis seperti pembacanya.
- FI-1 sumber: 4 bentuk pembacaan (anotasi `as { … }` kunci **tingkat atas** saja,
  destrukturisasi, akses langsung, alias).
- FI-2 mock: mock `useFirm`/`useAuth` tak boleh menerbitkan kunci karangan, **plus
  penghitung anti-lolos-vakum** (gagal bila pemindai tak menemukan ≥4 mock konteks).
- FI-3: `firmNameFrom(AuthContext nyata)` tak kosong; `firmNameFrom(FirmContext nyata)` = ''.

**GOTCHA pemindai alias.** Alias tanpa batas jendela = gerbang berisik: `const auth =
useAuth()` di `view_aje.tsx:1014` lalu `const auth = stepAuthority(…)` di 1257 membuat
`.ok`/`.reason` terlapor sebagai kunci karangan. Solusi: jendela baca alias berakhir saat
identifier yang sama **dideklarasikan ulang**.

**Keputusan desain.** `useFirmName()` SENGAJA tanpa cadangan ke `AMS.FIRM`, meski prompt
menyebutnya kandidat kedua: `D = AMS` ⇒ objek yang SAMA, jadi cadangannya tak menambah
informasi — ia hanya membuat keadaan "identitas tak tersedia" **mustahil tercapai**,
sehingga penjaga `disabled` jadi kode mati yang tak bisa diuji.

**GOTCHA teknis lain.**
- `useStateTR<T>(…)` DITOLAK tsc (`TS2347`): alias hook per-file repo ini tak bertipe.
  Nyatakan bentuk lewat anotasi hasil: `useStateTR('idle') as [EksporFase, (v)=>void]`.
- Model ekspor memakai kunci `firm`, bukan `firmName` (input `firmName` → output `firm`).
- Backslash di dalam regex **lenyap** lewat heredoc tool Bash — tulis skrip berisi regex
  dengan tool Write, jangan `cat <<'EOF'`. (Terkonfirmasi lagi; lihat
  [[asseris-repo-hygiene-2026-08-19]].)
