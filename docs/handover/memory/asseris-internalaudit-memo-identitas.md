---
name: asseris-internalaudit-memo-identitas
description: "Arc SA 610 (ab3ce02 + 1059316) — memo tersegel yang mukanya menyebut perikatan lain, kolom memo yang selalu kosong karena field-nya tak pernah ada, dan tiga register yang menyatakan pekerjaan audit yang tak pernah dilakukan"
metadata: 
  node_type: memory
  type: project
  originSessionId: 897aee8f-e56d-4059-afeb-5715d1993bad
  modified: 2026-08-23T08:11:56.604Z
---

Arc `internalaudit` (SA 610) — **PR #296 TERBUKA, CI 9/9, `mergeStateStatus: CLEAN`**
(2026-08-23). Prompt: `docs/prompts-perbaikan/80-internalaudit.md`.
Usulan yang MASIH menunggu keputusan Ari: `docs/usulan-IA6-…md`
(ambang skor SA 610 → `assessment_model` + rantai sign-off `WpPanel`).

⚠ **CABANG PR BUKAN cabang kerja.** Commit dibuat di `fix/timebudget-engagement-isolation`
(`ab3ce02` IA1–IA5, `1059316` IA7) — cabang direktori kerja utama yang JUGA memegang
DUA commit arc lain yang belum mendarat & **tanpa PR**: `9dd1e57` (time) dan `0508891`
(firmtax). Mem-push cabang itu akan menyeret keduanya ke dalam PR SA 610. Yang dilakukan:
worktree baru di `origin/master`, `git worktree add -b fix/sa610-internalaudit-register
<wt> origin/master`, **cherry-pick kedua commit** (`9487a77` + `fd14f92`), verify ulang
DI ATAS master terkini, baru push + `gh pr create`. Selalu cek
`git log --oneline origin/master..HEAD` SEBELUM push.

## Cacat yang ditutup

- **IA1** memo tersegel: `scopeId` dari perikatan aktif, MUKA berkas literal
  `ENG-2025-014 · FY2025`, `firm:'KAP Wijaya Hartono & Rekan'`, dan
  `activeClient?.name || 'PT Sentosa Makmur Tbk'`. `ENG-2025-014`/`FY2025` adalah
  perikatan BAWAAN seed → cacatnya **tak terlihat pada perikatan default**; selalu
  uji dengan perikatan NON-default (`ENG-2025-031`, `ENG-2024-063`).
- **IA2** "Simpulkan" (tombol PRIMER) tanpa `onClick`; "Buka WP {lead}" DICABUT,
  bukan diaktifkan — `lead` ('PR-3','A-2','C-1','PR-1','B-4') tak ada di
  `WORKPAPERS` (ref huruf A·B·C·E·F·R saja) maupun `WP_MODULE_MAP`.
- **IA3** `IA_PROFILE` (nama kepala SPI dll) → isian auditor, seed KOSONG.
- **IA4** `IA_FACTORS_SEED` 4/4/3 + sub-kriteria terjawab → kerangka pertanyaan ¶16.
- **IA5** `<tr onClick>` + `<div onClick>` → `<button aria-pressed>` + focus ring.

## GOTCHA yang mahal

**Anotasi tipe INLINE di call-site bisa MENGARANG bentuk objek, dan tsc ikut diam.**
Cacat kelima yang tak ada di prompt:

    body: factors.map((f: { id: string; label: string; v: number; ref: string }) =>
                       [f.label, String(f.v), f.ref])

`label` **tidak pernah ada** pada faktor (`k` yang ada). Kolom nama faktor terbit
sebagai sel kosong di SETIAP memo tersegel yang pernah dicetak. Anotasi inline itu
sendiri yang meyakinkan tsc. Curigai setiap `(x: { … }) =>` yang mendeklarasikan
bentuk alih-alih mengimpor tipenya. Uji penangkapnya: `JSON.stringify(blocks)` tidak
boleh memuat `'undefined'`/`'null'`.

**Gerbang bisa menuduh MESINNYA SENDIRI.** Gerbang "kerangka tanpa skor" memakai
`/\bv\s*:\s*[1-5]\b` dan langsung merah karena diskriminator versi dokumen saya
sendiri berbunyi `v: 2`. Solusi: namai diskriminator `ver`, bukan `v`. Pola umum:
regex bidang satu-huruf akan menabrak bidang lain di berkas yang sama.

**Menyeed kertas kerja KOSONG mewajibkan MENAMBAH kontrol yang hilang.** Sub-kriteria
SA 610 dulu hanya DITAMPILKAN — tak ada satu pun kontrol pengisinya. Menyeed `ok:null`
tanpa menambahkan kontrol hanya menukar data karangan dengan panel MATI. Ini biaya
tersembunyi setiap kali prompt berbunyi "seed berisi pertanyaan, bukan jawaban".

**`--gray` tak pernah ada** (lagi). Verdict baru berwarna `gray` ⇒ `var(--${k})`
akan gagal DIAM. Enumerasi peta nada (`TONE_INK`/`TONE_BG`) — sekaligus membuat
token terbaca gerbang `css_tokens`, yang mencatat sendiri bahwa token rakitan-runtime
adalah titik butanya. `Badge kind="gray"` tetap sah (`.b-gray` ada di CSS).

**`React.ChangeEvent` TIDAK ADA** — proyek tanpa `@types/react` (shim W13). Idiom
repo: `type FormEv = { target: { value: string } }` (lihat `view_cockpit.tsx:60`).
`(e)` telanjang = TS7006, `(e: any)` = ratchet merah.

**Atribusi tulis ≠ `useCurrentAuditor()`** — prompt memintanya, preseden repo
membantah. `glActor` (firm_gl_actor.ts) sudah memutuskan: sesi langsung, tanpa jaring;
tanpa sesi aksinya TIDAK dijalankan. Prompt bisa lebih tua daripada preseden.

## Verifikasi di direktori kerja yang KOTOR

Direktori utama memuat 44 berkas belum-commit dari arc lain **yang sedang merah**
(`mytasks_derive.ts` typecheck · `view_mytasks_parts.tsx` 61 `:any` vs baseline 47 ·
tiga berkas uji untracked gagal). `npm run verify` di sana MUSTAHIL hijau dan
kegagalannya bukan milikmu. Resep:

1. `git worktree add --detach .claude/worktrees/<n> <HEAD-cabang>`
2. junction `node_modules`, `migration/node_modules`, `server/node_modules` dari
   worktree bersih lain (`jolly-wing-9ca99f`), lalu salin HANYA berkasmu
3. `npm run verify` → di sini: **VERIFY PASSED**, frontend 152/2700, backend 30/431
4. ⚠ **`ensure-prisma-client` MEREGENERASI klien ke skema worktree BARU** — karena
   `server/node_modules` di-junction, ia meracuni worktree DONOR. Sebelum menghapus
   worktree verifikasi: `cd <donor>/server && npx prisma generate`.
5. lepas junction dengan `cmd /c rmdir` dulu, baru `git worktree remove`

**Falsifikasi gerbang** di worktree yang sama:
`git show HEAD:migration/src/view_internalaudit.tsx > …` → IA1–IA5: 11 dari 32 MERAH;
IA7: 7 gerbang sumber MERAH (total 69 uji).

## Staging bedah pada `eslint-suppressions.json` bersama

Berkas ini dipegang beberapa arc sekaligus. Cara menstage HANYA perubahanmu tanpa
menyentuh direktori kerja:

    git show HEAD:migration/eslint-suppressions.json > tmp   # basis HEAD, bukan worktree
    # hapus entri milikmu di tmp
    SHA=$(git hash-object -w tmp)
    git update-index --cacheinfo 100644,$SHA,migration/eslint-suppressions.json

Hasil: staged = HEAD − entriku; worktree tetap memuat suntingan arc lain (`MM`).
Verifikasi dengan `git show :<path>` sebelum commit. Lihat juga
[[asseris-firmtax-bukti-potong-karangan]].

## IA7 (`1059316`) — tiga register, dan keputusan desain yang menentukan

`IA_USE_AREAS` · `IA_REPERF` · `IA_DIRECT` → dokumen `ver 3`, ter-persist per
perikatan, **seed kosong**, tabel master + panel detail berkontrol native.

**KEPUTUSAN DESAIN TERPENTING: mesin MEMBANTAH, bukan MENGISI.** Godaannya adalah
membiarkan mesin menjawab (mis. memaksa `result='Dikecualikan'` ketika
`judgment='Tinggi'`). Itu MENGULANG cacat yang sedang dicabut, hanya dengan pengarang
berbeda. Yang benar: auditor menjawab, mesin menyatakan ketika jawabannya bertentangan
(`iaUseAreaConflicts` ¶18/¶19/¶24 · `iaReperfConflicts` · `iaDirectBlockers`
¶29/¶33/¶34), dan bantahan itu **ikut tersegel di memo** — memo tak boleh lebih rapi
daripada kertas kerjanya.

**Kapan MENGGERBANG, bukan membantah:** status bantuan langsung. ¶33 menuntut
persetujuan tertulis SEBELUM bantuan diberikan, jadi 'Berlangsung' tanpa persetujuan
bukan jawaban keliru melainkan **urutan yang mustahil** → opsinya dikunci. Dokumen
warisan yang terlanjur melampaui prasyarat TIDAK diam-diam dibetulkan (`iaDirectViolations`).

**GOTCHA: `new RegExp('^' + prefix + '(\d+)$')` — escape-nya HILANG** di jalur
penyuntingan (python→bash→file), jadi polanya `(d+)`, tak pernah cocok, dan setiap
baris baru bernomor `01` — id kembar, tautan reperformansi→area salah sasaran.
Ini kambuhan dari [[asseris-sa230-arsip-siklus-hidup]]. **Jangan merakit regex dari
string**: potong awalan apa adanya, uji sisanya dengan regex LITERAL. Ujinya yang
menangkap — karena ia membandingkan `['IA-U-01','IA-U-02','IA-U-03']`, bukan sekadar
"tidak melempar".

**Penomoran id dari register, bukan `list.length`** — hapus baris tengah lalu tambah
baris baru = id KEMBAR.

**Ambang jelas remeh DIBACA** (`useMateriality().cttFull`), dan tanpa ambang/selisih
jawabannya `unknown`, **bukan** `below`. Status lama `'Selisih < CTT'` menyebut ambang
yang tak pernah dibaca dari mana pun.

**Ikut diturunkan karena menyatakan hasil dari register yang sama** (kalau tidak, ia
tertinggal sebagai kebohongan yang bertahan): tabel dampak ¶18 (5 baris literal
"40 sampel sendiri"), daftar dokumentasi ¶36–37 + indeks arsip `A-610.1`…`A-610.4`
yang tak ada di register mana pun, klaim "direviu 100%", kartu statistik literal `'1'`.

**Yang TETAP konstanta dan benar demikian:** `IA_PROHIBIT` (¶30–31) & strategi
koordinasi — kutipan **TUNTUTAN** standar, bukan pernyataan tentang pekerjaan yang
sudah dilakukan. Bedakan keduanya sebelum mencabut.

`internalaudit` **tidak terdaftar** di `WP_MODULE_MAP` (grep: nol hasil), jadi arc ini
TIDAK menyentuh `cockpit_progress.ts`. Bila kelak didaftarkan: fase = `'Eksekusi'`,
bukan tebakan — `icons.tsx:447` `RELATED_SA.internalaudit` dan `data_knowledge.ts:56`
sama-sama mengklasifikasikan SA 610 sebagai fase *Pelaksanaan*.

Ambang verdict SA 610 (≥3,5 · ≥2,5) SENGAJA tidak dipindah ke `assessment_model`
(≥4 · ≥3): dengan bobot sama rata skornya identik, tetapi **keputusannya bergeser** —
rerata 3,667 (seed lama) berubah dari "Dapat Diandalkan" menjadi "Andalan Terbatas".
Itu perubahan pertimbangan profesional, bukan refactor. Lihat `docs/usulan-IA6-…`.
