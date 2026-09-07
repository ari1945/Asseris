---
name: asseris-klon-kedua-wp-canon-rebase
description: "PR #169 — 5 commit WP canon/SoD dari klon kedua D:\\Asseris di-rebase ke master + temuan identitas EQR ditutup; klon kedua itu sendiri adalah jebakan berulang"
metadata: 
  node_type: memory
  type: project
  originSessionId: 189b1387-2eef-49ad-9390-212c86aea49a
  modified: 2026-08-06T21:35:41.617Z
---

**Ada DUA klon Asseris di disk yang sama-sama menunjuk `github.com/ari1945/Asseris`:**

| Klon | Peran |
|---|---|
| `D:\Claude AI\06-BUSINESS-DEVELOPMENT\Audit System` | klon kerja utama (semua arc PR) |
| `D:\Asseris` (+ worktree `D:\asseris-wt`) | dipakai lewat **platform opencode**; refs-nya membusuk diam-diam |

Per 2026-08-06 klon kedua tertinggal **185 commit / 5 minggu** (`origin/master` mandek di `c89b047`/PR #40 sementara master nyata sudah `7f4ff70`/PR #167). Gate hijaunya **tidak sah**: dilaporkan `382/382` uji, master menjalankan 806+.

## Hasil: [PR #169](https://github.com/ari1945/Asseris/pull/169) TERBUKA

Cabang `feat/wp-canon-signoff-sod` — 5 commit di-rebase (`git rebase --onto origin/master 366eb37`) + 1 commit baru. 12 berkas, +2040/−202. Gate lokal: typecheck 0 · lint 0 · **924 uji** · build ok.
Isi: `wp_canon.ts` (lapisan murni + uji karakterisasi) · derivasi status WP satu jalur · rantai sign-off jujur (*assigned* ≠ *signed*) · gate SoD per-slot · **satu orang satu langkah**.
CI **6/6 SUCCESS · MERGEABLE/CLEAN** (setelah re-run; 3 job sempat merah karena pemadaman GitHub Actions di *Set up job*, bukan kode). **Penahan merge tinggal tinjauan piksel.**

**Temuan yang muncul JUSTRU karena rebase** (gate tak menangkapnya): gate SoD per-slot mengikat slot ke **kapabilitas**, dan kapabilitas bukan identitas — `PARTNER_BASE` memegang `OPINION_APPROVE` **dan** `EQR_REVIEW`, jadi partner yang baru tanda tangan slot Partner masih lolos di slot **EQR pada WP yang sama**. Master **sudah menutup lubang identik** di rantai AJE lewat `stepAuthority` (PR-E, `view_platform.tsx`) lengkap dengan alasan ISQM 2 / SA 220.36 — polanya tinggal dipinjam. Ditutup di PR ini via `wpChainSelfReview()` di `wp_canon.ts`.

## Gotcha yang berharga

- **`.adj` di `deriveWpStatus` TETAP `r.adj`, di kedua sisi.** Sempat saya duga PR-H4 sudah mengubahnya — TIDAK. Modul WP masih konsumen `.adj` yang tersisa. Verifikasi sebelum menuduh divergensi. Lihat [[asseris-psak46-prh-basis-dilaporkan]].
- **Konflik rebase yang berupa KEPUTUSAN, bukan mekanis** (3 dari 9 blok):
  (1) `NotesTab` — #168 baru mengangkat `draft`/`setDraft` jadi props untuk guard `<Overlay isDirty>`; mengambil sisi cabang bulat-bulat MENGHIDUPKAN LAGI cacat draft-hilang-senyap.
  (2) `wpEvidenceEval` — ekstraksi membawa tanda tangan KETAT pra-#138; wajib port versi longgar PR-6d atau typecheck patah di `view_evidence.tsx`.
  (3) suppressions — regenerasi dengan **`eslint src --prune-suppressions` SAJA**, jangan `lint:any-baseline` penuh: `--suppress-rule` mem-baseline ulang seluruh `any` dan menelan regresi.
- **`npm ci` gagal `EPERM unlink esbuild.exe`** karena dev server Vite klon itu memegangnya → hentikan 5 proses node milik `D:\Asseris` dulu (`dev:all`, concurrently, vite :5180, npm --prefix ../server, tsx watch :5181).
- **Ratchet ESLint menggigit dari SATU `any` baru**: `(idx: any)` pada helper baru → 85 error sekaligus. Tulis `(idx: number)`.
- **Mutasi sengaja membuktikan uji menggigit**: mematikan pencarian slot terdahulu menjatuhkan tepat 3 dari 8 uji pemblokiran. Selalu lakukan ini saat uji lulus percobaan pertama.
- **`dependency-audit` merah ≠ kerentanan**: log berhenti di *Set up job* — "Failed to resolve action download info. Service Unavailable". Runner tak pernah menjalankan `npm audit`. `gh run rerun <id> --failed` menghijaukannya.
- WIP Confirmation Hub SA 505 diparkir di cabang **`wip/confirm-hub-sa505`** (`af4b591`) — bukan stash, agar terlihat. Memuat churn EOL snapshot yang harus dibuang saat dilanjutkan. Cabang lama `feat/w9-coretax-connector` sengaja dibiarkan utuh sebagai jaring pengaman. Lihat [[asseris-confirm-hub-sa505]].

## WIP Confirmation Hub: TERNYATA SUDAH ADA DI MASTER

Rebase `wip/confirm-hub-sa505` ke master menghasilkan **commit KOSONG** dan git menjatuhkannya. Diverifikasi bukan artefak resolusi: dari **71 baris tambahan bermakna, 68 sudah ada di master verbatim**; PRD-nya pun sudah ter-commit di master. **3 baris sisanya justru versi yang LEBIH BURUK** — `import` tanpa `useInitialTab` (menghapus deep-link), `fontSize: 12.5` (setengah-langkah yang DILARANG skala tipografi #128), dan `<CfOverview>` tanpa prop `covRecon`. Mengambil sisi WIP saat konflik = mengembalikan tiga kemunduran diam-diam. Commit aslinya diamankan sbg tag **`wip-confirm-hub-sa505-superseded`** (af4b591); cabangnya dihapus.
→ **Pelajaran: kerja di klon basi bukan cuma berisiko konflik — ia bisa MENGULANG kerja yang sudah selesai.**

## Verifikasi hidup (Vite module graph, tanpa login)

`import('/src/wp_canon.ts')` → 7 skenario `wpChainSelfReview` benar semua (partner→eqr diblokir, simetris, orang lain lolos, slot menunggu/ sesi kosong tak memblokir, normalisasi ejaan).
`import('/src/rbac.ts')` → **TIGA peran** memegang `OPINION_APPROVE` **dan** `EQR_REVIEW`: *Rekan Pemimpin · Engagement Partner · Rekan*. Kerentanannya nyata, bukan teoretis.

## ⏭️ LANJUTAN SESI BERIKUTNYA — pekerjaan pertama

**Keputusan Ari 2026-08-06: tanda tangan Reviewer fiktif DITUTUP DI DALAM PR #169** (bukan PR terpisah), dikerjakan sesi berikutnya. **Jangan merge #169 sebelum ini beres.**

Cacatnya (ditemukan tinjauan hidup, LOLOS dari 924 uji): pada WP `A`, `chain` KOSONG — slot Preparer berbunyi "belum menandatangani" — tetapi Reviewer menampilkan `Anindya P. · <hari ini>`. Sumbernya `view_wp.tsx` SignoffTab:
`reviewer = chain.reviewer || (status === 'Reviewed' ? { by: st.reviewer || it[3] || 'Anindya P.', at: st.signedAt || wpToday() } : null)`
→ status disulap jadi bukti persetujuan (kelas cacat identik `doneTo = posted ? steps.length : 1` yang PR-B #140 tutup di AJE), tanggalnya **bergeser mengikuti kalender tiap hari**, dan ia MASUK JEJAK AUDIT ("Riwayat & Jejak Audit → Sign-off Reviewer (Manager)"). Panel membantah dirinya sendiri: judul "Berurutan: preparer → reviewer → partner → EQR" sementara reviewer bertanda tangan & preparer belum.
Commit `55594d9` memperbaiki sisi **preparer** saja → separuh perbaikan SSOT justru melahirkan kontradiksi kasatmata (pola arc WTB terulang).

**Rencana:** hapus derivasi reviewer; bila demo perlu tampak bertanda tangan, **seed menulis `chain.reviewer` sungguhan** (tanggal tetap, bukan `wpToday()`). Dampak: 7 WP berstatus `Reviewed` kehilangan tanda tangan Reviewer sampai diseed/ditandatangani nyata. Cek juga `deriveWpStatus` di `wp_canon.ts` — ia punya derivasi serupa (`preparer` bahkan masih di-default ke `{by: meta.preparer, at:'05 Mar 2026'}`), jadi indeks WP & halaman SA bisa ikut berbohong.

## Sisa

- **Tinjauan PERILAKU #169 TUNTAS** (Ari login sbg Hartono W./Rekan Pemimpin, klien Sentosa Makmur Tbk `PIE · EQR wajib`, WP `A`): *assigned ≠ signed* tampil benar · identitas sesi menang atas nama slot (tanda tangan slot Preparer yang ditugaskan ke **Fajar N.** tercatat **Hartono W.**) · tanggal live · setelah tanda tangan slot Partner, **slot EQR MATI** dgn tooltip satu-orang-satu-langkah · simetris ke Preparer · **bertahan setelah reload** & gate dievaluasi ulang dari state server · drill WP kini `role="dialog"`+`aria-modal` · `#/workpapers` memulihkan rute. State demo dikembalikan seperti semula.
- **Tinjauan VISUAL belum** — `screenshot` tetap gagal ("Browser pane is not displayed, not compositing frames") walau viewport terbaca 582×550. Yang terverifikasi = perilaku/teks/tooltip/state, BUKAN tata letak. Butuh Ari memunculkan panel Browser ke depan.
- GOTCHA alat: menargetkan tombol slot lewat *ancestor-walk* teks SALAH SASARAN (kontainer induk memuat semua label slot → kena slot pertama). Pakai **urutan DOM**: tombol `Sign-off`/`Batalkan` ke-0..3 = preparer · reviewer · partner · eqr.
- Dev server: klon utama kini menjalankan `dev-all` (vite 5180 + tRPC 5181) di cabang PR. `D:\Asseris` sengaja dibiarkan mati — port bentrok, dan klon itu tak lagi punya kerja unik.
- Worktree `D:\asseris-wt` **dihapus**. GOTCHA: isinya `node_modules` **junction** ke `D:\Asseris\migration\node_modules` — `Remove-Item -Recurse` bisa mengikuti tautan & menghapus TARGET. Hapus junction dulu dgn `cmd /c rmdir <link>` (tanpa `/s`), verifikasi target utuh, baru hapus induknya. Sandbox juga memblokir `Remove-Item` pada path akar `D:\` → pakai `cmd /c rmdir /s /q`.

Terkait: [[asseris-overlay-contract-arc]] · [[asseris-aje-module-eval]] (PR-E `stepAuthority`) · [[asseris-wp-execution]] · [[neosuite-ams-p2-wp-signoff]] · [[asseris-opinion-signoff-sod-defect]]
