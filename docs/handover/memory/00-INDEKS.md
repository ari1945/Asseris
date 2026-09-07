> **Ekspor memori agen — snapshot 2026-09-07.** Berkas-berkas di direktori ini adalah salinan verbatim memori persisten Claude Code untuk proyek ini (191 catatan, 2026-07 … 2026-08-29). Tautan `[[nama]]` di dalam catatan = berkas `nama.md` di direktori ini. Bagian "Status sekarang" di bawah bertanggal **2026-08-29 dan sudah BASI** untuk status repo — status yang berlaku ada di [`../HANDOVER-2026-09-07.md`](../HANDOVER-2026-09-07.md). Yang tetap berlaku dari berkas ini: peta jebakan, aturan, dan keputusan Ari. Tiap catatan memuat `file:line`; verifikasi sebelum mengandalkannya — kode terus bergerak.

# Memory Index
> Satu baris per memori, hook PENDEK. Detail di berkas topiknya — jangan tulis isi di sini.
> Arc lama sengaja tanpa hook; buka berkasnya bila relevan.

## Status sekarang (2026-08-29)
- `origin/master` = **`052d6c9`** (F-3 #334). Rantai: #329 `f57c24b` → #331 `2ed5908` → #332 `e2f69d6` → #333 `1f54758` → #334 `052d6c9`. **GELOMBANG W0 TUNTAS** (2026-08-28): **#327 gerbang Prisma `8ce8e8e`** ← #326 dokumen W0 `8a8cc54` ← **#322 regref `244f87f`** ← #320 smm `7ae8d68` ← #321 newdisc `a6f4f74` ← #319 hcm `abb36a7` ← #318 firmgl/apar `62593c4`. Semua hijau.
- ✅ **W0 nol tersisa.** Dokumen gelombangnya kini di git (#326) dengan **dua premis yang terbukti SALAH dicoret**: urutan smm→regref tak pernah mengikat semantik, dan katalog regref berakhir di **10 set, bukan 9** (jebakan `kurs`). Angka AWALnya bergantung basis: **5** di merge-base cabang, **6** di master — `kurs` mendarat di antaranya lewat CB1, jadi 5→10 dan 6→10 sama-sama benar.
- ✅ **[Gerbang R-6 klien Prisma diperbaiki (#327 `8ce8e8e`) — diperiksa ULANG di titik pakai; penanda tak terbaca kini MERAH; 11 uji MEMAKSANYA merah](asseris-prisma-client-worktree-trap.md)**
- ⚠️ **Cabang lokal: enam → SATU** (sensus ulang 2026-08-28 atas `8ce8e8e`, 38 cabang). Hanya `claude/intelligent-keller-7b28db` (`3d88e81`, F-1/F-2 identitas ekspor, 21 berkas) yang masih memikul kerja absen di master; lima lainnya mendarat lewat W0. Antrean PR kosong dari fitur. **Tapi worktree utama memikul ±1.600 baris belum-commit** — lihat sensus di bawah sebelum menghapus apa pun.
- 🔴 **[Identitas ekspor tersegel — W1 DITAHAN, arc keller dikirim PR #332 (draft)](asseris-export-identity-dua-desain-bertabrakan.md)** — `feat/export-identity-ssot` `d3f39b7`, verify HIJAU, **menunggu "Proceed." PRD**. `tsc` menemukan 4 model builder yang regex tak bisa lihat; 6 uji lama DIBALIK.
- 👉 **[CHECKPOINT 2026-08-27 (jeda)](asseris-checkpoint-2026-08-27.md)** — keadaan repo, resep tutup-antrean, dan apa yang layak dikerjakan berikutnya.
- 🚧 **MASIH JANGAN SENTUH** cabang lokal `fix/timebudget-engagement-isolation` di checkout utama. PR-nya (#315) SUDAH mendarat dan isi arc Framework terbukti ada di master (blob sama **per `e205b77`**), TAPI sesi lain masih menulis di worktree itu (4 M + 16 ?? belum di-commit per 2026-08-27). Vonis redundan berlaku hanya sampai commit berikutnya.
- ⏳ Tak bisa ditutup: **data dari Ari** (Lampiran PMK 168 · cuti bersama SKB 2026 · `jpCap`) · **keputusan Ari** (regref Tahap B) · **arc disetujui belum dikerjakan** (firm-erp PR-2..PR-6 · delivery PR-4..PR-6) · utang a11y (35 kontrol tanpa label · 71 tombol tanpa handler) · `migration` terkunci di vite 5/vitest 2.
- ⏸️ **[61 PRD di root DIPINDAH ke docs/prd/ — bukan dihapus; DITUNDA sampai cabang lokal mendarat](asseris-prd-root-pindah-docs.md)** — keputusan Ari 2026-08-28.
- 👉 [Snapshot "semua terbuka ditutup" (`17fe62e`)](asseris-tutup-semua-open-2026-08-20.md) — cara membersihkan antrean PR + cabang debris.

## Sensus 2026-08-27 — kerja belum mendarat & cloud
- 🔴 **[Sensus 26 cabang lokal: hanya ENAM memikul kerja tak tergantikan; 9 twin akan MEREGRESI master](asseris-sensus-cabang-2026-08-27.md)** — "N ahead" salah di 20/26. Termasuk **P0** isolasi lampiran SA 580/720 yang masih hidup di master. Status `00-LANJUTKAN.md` diperbaiki lewat **PR #316** (`de653ab`, docs-only).
- 🔴 **[Kelas `|| 'ENG-2025-014'` — 17 situs JALUR TULIS tersisa, plus `DEFAULT_ENG_ID` di framework persist](asseris-eng-fallback-kelas-tulis.md)** — PR **#317** menutup 2 (lampiran SA 580/720). Grep satu-baris NOL hasil karena fallback & konsumsinya beda baris.
- ☁️ **[Batas sesi cloud](asseris-cloud-session-batas.md)** — `npm run verify` jalan tanpa secret (`server/.env` ter-track); tapi MEMORY.md, MCP lokal, dan browser pane TIDAK ikut. Nol dari 25 prompt siap dikirim ke cloud.

- 🔴 **[W0-3 hcm (PR #319): peta W0 SALAH soal isi DAN ahead-count — satu dari dua commit sudah mendarat (#266) lalu DISALIP; `ln -s` di Bash tool MENYALIN gigabyte, bukan menaut](asseris-w0-3-hcm-squash-twin.md)**
- ✅ **[Gelombang W0 pendaratan — PR #318 MENGGANTIKAN cabang firmgl; kelima cabang TIDAK disjoint; urutan smm→regref mengikat karena CPE_REQ dipinjam jadi tahun atestasi SOQM](asseris-w0-pendaratan-urutan.md)**
- ✅ **[W0-2 MENDARAT #320 `7ae8d68` — ratchet klok memerah karena pemakaian DIHAPUS (rebase bersih ≠ kompatibel); `test.db` 0-byte milik worktree lain menyamar jadi cacat backend](asseris-w0-2-smm-ratchet-dua-arah.md)** — W0-4 regref WAJIB menyusul.
- ✅ **[W0-4 MENDARAT #322 `244f87f` — PREMIS urutan W0 SALAH: CPE_REQ tak pernah jadi multi-record; katalog auto-merge BERSIH ke arah salah dan menghapus set kurs](asseris-w0-4-regref-premis-urutan-salah.md)** — gelombang W0 tuntas.
- ✅ **[W0-1 newdisc mendarat (#321 `a6f4f74`) — dan gerbang `ensure-prisma-client` yang mencetak `OK` di atas klien Prisma terpanggang worktree LAIN](asseris-w0-1-newdisc-pendaratan.md)**
- ✅ **[Gelombang W1 (PR #328 mendarat, 8 paket siap paralel) — identitas karangan di artefak tersegel; `window.activeEngagement` TAK PERNAH ditulis ⇒ assertEngagementAccess dilewati](asseris-w1-identitas-tersegel-paralel.md)**
- ✅ **[W1-E MENDARAT #329 `f57c24b` — E1 DICABUT di tengah jalan oleh #330 (arc export_identity punya arsitektur berlawanan) — `<button class="chip">` MELEBAR 4px (border UA) dan cara membuktikan non-regresi visual lewat rect Range](asseris-w1e-chip-border-dan-geometri-range.md)**
- ✅ **[Arc identitas ekspor DI-SIGN-OFF & F-1/F-2 MENDARAT (#332 `e2f69d6`) — tapi SC-4 BELUM: `firm` masih tak ikut di-hash, jadi E-4 MASIH BERLAKU](asseris-export-identity-arc-signoff.md)**
- ✅ **[F-3 MENDARAT #334 `052d6c9`: segel Ed25519 TIDAK PERNAH menutupi isi tabel — replacer daftar-izin REKURSIF membuat tiap sheet/blok kosong; dan verifikasi tak pernah menghitung ulang hash](asseris-segel-buta-isi-replacer.md)**

## Aturan & jebakan yang paling sering menggigit
- ⚖️ **[KEPUTUSAN ARI — migrasi lingkup firma→perikatan: data lama HANGUS](asseris-migrasi-lingkup-hangus.md)** — berlaku SEMUA kunci persist; jangan tawarkan read-through lagi.
- ⚠️ **[CI bisa TIDAK PERNAH START walau PR CLEAN](asseris-ci-dispatch-hilang-dan-gh-merge-worktree.md)** — GitHub menjatuhkan dispatch (sembuh `gh pr close`+`reopen`); antrean bisa 25 menit. `gh pr merge --delete-branch` gagal bila worktree lain memegang `master` — merge TETAP jadi, cabang remote hapus manual.
- ⚠️ [Antrean PR & CI basi](asseris-merge-antrean-2026-08-23.md) — `CLEAN` = nol konflik TEKSTUAL saja. Resep: `update-branch` → CI → merge → tunggu 4 workflow master.
- ⚠️ [Klaim "absen" SISTEMATIS SALAH — grep dulu](asseris-gap-matrix-eval.md) · [konverter yang dikira belum ada ternyata sudah ada](asseris-acceptance-engagement-flow.md)
- ⚠️ [**Backslash lenyap lewat heredoc tool Bash**](asseris-repo-hygiene-2026-08-19.md) · [`toMatchObject({p:/re/})` SELALU lolos](asseris-sa620-expert-gate-server.md) · [gerbang yang belum pernah MERAH tak membuktikan apa pun](asseris-prisma-client-worktree-trap.md)
- ⚠️ [`git checkout -- <berkas>` MENGHAPUS kerja belum-commit](asseris-wip-rollforward-falsifiable.md) · [penanda konflik bisa TER-COMMIT](asseris-rebase-squash-stacked-prs.md) · [`git cherry` `+` palsu pada squash](asseris-git-cherry-squash-palsu.md)
- ⚠️ [Sesi paralel berbagi SATU direktori kerja](asseris-sesi-paralel-satu-worktree.md) — commit sering · [junction `node_modules`: lepas dengan `cmd /c rmdir`](asseris-checkpoint-2026-08-14.md)
- ⚠️ [gh CLI](asseris-tooling-gh.md) — `C:\Program Files\GitHub CLI\gh.exe`; nol biner `jq` (pakai `gh --jq`) · [uji `.ts` WAJIB bebas-`any`](asseris-test-coverage.md) · [`:any` baru un-suppress SELURUH berkas](asseris-sa510-indep-fee-prioryear.md)
- ⚠️ [Skala tipografi MENGIKAT: 8 ukuran, lantai 11px](asseris-typography-scale.md) · [Vite dev sajikan stylesheet BASI](asseris-design-quickwin-contrast.md) · [token CSS tak terdefinisi gagal DIAM](asseris-css-token-ghost-sweep.md)
- ⚠️ [Menamai kontrol MATI lebih buruk daripada membiarkannya tak bernama](asseris-icon-button-names.md) · [`capForWrite` firm default = gagal tulis SENYAP](asseris-p2pk-spm-readiness-arc.md)

## Arc 2026-08-26 … 27
- 👉 **[newdisc Pilar Dua: REAKTIVITAS SEMU lewat `[wtb]` palsu — dan `AMS.FX_RATES` yang sudah dicabut master](asseris-newdisc-pilar2-reaktivitas-semu.md)** — gerbang CB1 menangkap literal fallback `{ EUR: 0 }`; uji deps = uji SIMBOL, render view sungguhan.
- ⚠️ **[Kerja belum mendarat nyaris hangus — MENDARAT #314 `648e71f`](asseris-invprop-ssot-kedua.md)** — invprop PSAK 13 hidup HANYA di cabang LOKAL `fix/timebudget-engagement-isolation`, yang **3 commit di depan tip REMOTE**-nya. **Periksa cabang LOKAL, bukan cuma remote, sebelum menghapus**; uji kepemilikan pakai BLOB, bukan `git cherry`. Diselamatkan ke `wip/invprop-psak13`, lalu `git rebase --onto origin/master <induk>` memindahkan SATU commit saja (empat di bawahnya sudah mendarat lewat squash). Cabang lokalnya masih dipegang checkout utama (10 M + 24 ?? belum di-commit).
- 👉 **[Penentu Kerangka: satu `accent` dua peran + sensus meleset karena `50e9`](asseris-framework-satu-accent-dua-peran.md)** — hex kembar identik di TERANG patah hanya di GELAP; lalu PR-1..PR-4: `null`≠`false` sebagai pembedaan domain, kunci firm gagal DUA cara senyap, gerbang statik dipuaskan baris `import`, PR-5 ditarik karena premis saya sendiri salah.
- 👉 **[Lantai 11px memaksa perubahan GEOMETRI (#312)](asseris-tipografi-terhitung-lantai-geometri.md)** — lebar inisial WAJIB diukur di peramban; `.avatar` mengalahkan kelas `fs-*` lewat urutan muat; gerbang butuh sensus BENTUK.
- 👉 **[Henti gradien → token: cacat yang HANYA ada di tema gelap, dan token TEKS-vs-ISIAN yang bernilai sama di terang](asseris-gradient-token-sweep.md)** — PR #313; 172 henti / 63 berkas. `[^)]*` BUTA di belakang `var()` — gerbang saya sendiri lolos mutasi.
- 👉 **[Sapuan on-dark hex→token (#311)](asseris-on-dark-token-sweep.md)** — 232 situs/65 berkas; pemetaan "benar secara struktur" bisa MERUSAK kontras; `css_tokens.test.ts` membaca KOMENTAR sebagai kode.
- 👉 **[Gerbang §5 tipografi HIJAU di atas kode bocor (#310)](asseris-tipografi-gerbang-buta-ternari.md)** — regex menuntut digit persis sesudah `fontSize:`, pelanggaran nyata berbentuk TERNARI; `grep` importir melewatkan klon lokal.
- 👉 **[SJAH ×4 (#309): empat kunci `exec` lepas dari lingkup firma](asseris-sjah-isolasi-empat-kunci.md)** — komentar "dibaca lintas modul" TERBUKTI bohong; resep gerbang isolasi dua-perikatan.
- 👉 **[PPPK (#306): batas jsdom untuk gerbang papan-ketik](asseris-pppk-kontrol-native.md)** — jsdom MEMODELKAN fokusabilitas tapi TIDAK mensintesis Enter→click; tombol mati beraksi-L4 hanya DICABUT.
- 👉 **[Ekspor BUKAN "tanpa gerbang": segel digerbangi lalu DEGRADASI](asseris-ekspor-segel-degradasi.md)** — yang benar-benar terbuka: `MODULE_CAP` tak memuat grup back-office.
- 👉 [Baris tabel terpilih (#308)](asseris-procurement-kontrol-baris-native.md) — `grep '<tr onClick'` MELEWATKAN kasus nyata; 88 berkas masih memikulnya.
- 👉 [Roll-forward kontrak PSAK 72 (#307)](asseris-firmrevenue-rollfwd-kontrak.md) — `FIRM_COA` nol akun kontrak; `FIRMFIN.wip()` membantah register faktur.

## Arc 2026-08-24 — Gelombang 0
- 👉 **[Surat Manajemen (#305)(#305 `f893eac`)](asseris-mgmtletter-atribusi-isolasi.md)** — SENSUS CACAT terhadap `origin/master`, bukan dir kerja: perbaikan lokal bisa MENGEMBALIKAN cacat.
- 👉 **[Properti Investasi PSAK 13: SSOT kedua](asseris-invprop-ssot-kedua.md)** — `wtbRows([])` jatuh ke `AMS.WTB`: menguji ketiadaan lewat masukan kosong MENGULANG cacatnya.
- 👉 **[SPR 2400 (#303)](asseris-spr2400-pengiriman-dan-premis-salah.md)** — `grep -c` membaca KOMENTAR sebagai kode.
- 👉 [Baseline ulang terhadap origin/master, BUKAN HEAD cabang](asseris-gelombang0-baseline-master-bukan-head.md) · [arc TERSALIP master: versi lokal MENGEMBALIKAN cacat](asseris-gelombang0-arc-tersalip-master.md)
- 👉 [Tiga mesin nol-pemanggil diparkir](asseris-mesin-nol-pemanggil-parkir.md) · [gerbang `a11y_anchor_href` merah tapi perbaikannya hilang](asseris-a11y-anchor-href-gerbang-tertahan.md)

## Arc 2026-08-23
- 👉 **[ARC AKTIF — prompt perbaikan per modul: 24 prompt, 7 usulan menunggu Ari](asseris-arc-prompt-perbaikan-modul.md)** — template `docs/PROMPT-PERBAIKAN-MODUL.md`; serah-terima `docs/prompts-perbaikan/00-LANJUTKAN.md`.
- 👉 **[Seed C-058: faktur menagih MATERIALITAS (#295)](asseris-seed-c058-faktur-materialitas.md)** — register membantah dirinya tanpa oracle karangan.
- 👉 [Audit Internal SA 610 (#296): memo tersegel menyebut perikatan LAIN](asseris-internalaudit-memo-identitas.md) · [SPR 2400: literal materialitas ternyata SALINAN kanon](asseris-spr2400-salinan-kanon-materialitas.md)
- 👉 [ARB-TRM-058 lewat JV-0321 (#297)](asseris-arb-trm-058-jurnal-koreksi.md) — akun bersumber-kedua tak bisa digerakkan sepihak.
- 👉 [S1 kode mati Retensi (#293)](asseris-s1-kode-mati-retensi-bo.md) — gerbang regex LOLOS VAKUM lewat heredoc.
- 👉 [Tombol ekspor treasury permanen MATI (#290)](asseris-firm-identity-mock-mengarang-konteks.md) — mock uji mengarang bentuk konteks.
- 👉 [Pajak Firma: bukti potong karangan](asseris-firmtax-bukti-potong-karangan.md) · [Saldo Awal SA 510: prosedur yang tak dilakukan](asseris-opening-prosedur-fabrikasi.md) · [Diagnostik (#288)](asseris-diagnostic-atribusi-masukan.md)

## Arc 2026-08-22
- 👉 [Tanda tangan KK DITOLAK 403 tiap klik (#284/#285)](asseris-wp-signoff-ditolak-senyap.md) — mekanisme penyembunyinya se-aplikasi.
- 👉 [Time & Budget: fee karangan DORMAN](asseris-timebudget-fee-penagihan-karangan.md) — **PR berkonflik ⇒ CI TIDAK PERNAH START**.
- 👉 [Treasury (#287)](asseris-treasury-forecast-jujur.md) — memperbaiki label bisa melahirkan kebohongan KEDUA.
- 👉 [Aset Tetap (#289)](asseris-fixedassets-kertas-kerja-rollforward.md) · [SA 230 arsip (#286)](asseris-sa230-arsip-siklus-hidup.md) · [Kas & Bank kurs (#283)](asseris-cashbank-kurs-masa-berlaku.md) · [Klok SSOT (#281)](asseris-klok-ssot-jam-mesin.md) · [JET (#280)](asseris-jet-corong-populasi.md) · [Pendapatan PSAK 72 (#277/#278)](asseris-revenue-psak72-kontrak-pengukuran.md)
- 👉 [AP/AR sub-buku BEKU](asseris-apar-subbuku-hidup.md) · [SOQM attest tahun PPL](asseris-soqm-attest-tahun-ppl.md) · [PPL empat angka](asseris-ppl-empat-angka-komposisi.md) · [Firm GL rekonsiliasi & ekspor](asseris-firmgl-rekonsiliasi-ekspor.md)

## Arc 2026-08-20 … 21
- 👉 [Billing: nomor faktur dari panjang array](asseris-billing-nomor-faktur-register.md) — gerbang CAKUPAN buta pada mesin ber-`ctx.x || A.X`.
- 👉 [My Tasks: tugas "pribadi" milik seluruh firma](asseris-mytasks-user-scope.md) — `userScopeId()` KODE MATI.
- 👉 [Modul home: kontrol palsu](asseris-home-a11y-komposisi.md) — `aria-label` lewat spread TAK dilihat gerbang statik.
- 👉 [Regref A-2](asseris-regref-tahap-a2-sensus.md) · [Independensi (#276)](asseris-independence-sod-rantai.md) · [Suksesi: kontradiksi DIBUANG](asseris-succession-kontradiksi-dibuang.md) · [Orgchart](asseris-orgchart-divisi-hilang-a11y.md) · [Write-down WIP](asseris-wip-writedown-atribusi-otorisasi.md)
- 👉 [Lampiran SA 580/720](asseris-lampiran-scope-tulis-ekspor-identitas.md) · [Profitabilitas #268→#274](asseris-profit-isolasi-realisasi.md) · [Time & Budget isolasi](asseris-timebudget-engagement-isolation.md) · [Cockpit C1/C2](asseris-cockpit-tab-segel.md) · [Checklist Kepatuhan](asseris-compliance-identity-literal.md)

## Arc 2026-08-15 … 19
- 👉 [SC-24a satu register SKP](asseris-sc24a-satu-register-skp.md) — angka PPL bisa MENGECIL juga.
- 👉 [Arc Keuangan Firma (ERP)](asseris-firm-erp-deepening-arc.md) — PR-1 mendarat (#258); PR-2..PR-6 menunggu.
- 👉 [Aset tetap: dua register + akun hantu](asseris-fixedassets-register-tunggal.md) — `av`/`bv` dari variabel sama = hiasan.
- 👉 [Sales Pipeline (#254)](asseris-sales-pipeline-arc.md) — gerbang cakupan harus BUANG KOMENTAR · ["Aktual" dari buku besar](asseris-budget-actual-ledger-derived.md) — literal→turunan bikin tie-out TAUTOLOGIS.
- 👉 [Kas menutup ke buku besar](asseris-cash-bank-recon-register.md) — jembatan DIENUMERASI, bukan dari selisih · [Tab beralamat V-9](asseris-tab-beralamat-v9.md) — `replaceState` TAK memicu `hashchange`.
- 👉 [SDM & Kepatuhan (#256)](asseris-sdm-kepatuhan-arc.md) · [Regref tahunan Tahap A](asseris-regref-annual-arc.md) · [FIRMFIN baca buku besar](asseris-firmfin-ledger-derived.md) · [Jembatan AR/AP](asseris-ar-ap-bridge-falsifiable.md) · [Merge wip+wipreal](asseris-wip-merge-valuasi-realisasi.md)
- 👉 Rantai a11y (#244→#252): [badge→button](asseris-a11y-badge-button-native.md) · [FirmJVForm→Overlay](asseris-firmjvform-overlay-contract.md) · [sapuan label .field](asseris-field-label-sweep.md)
- Checkpoint: [08-16](asseris-checkpoint-2026-08-16.md) · [08-15](asseris-checkpoint-2026-08-15.md)

## Arc 2026-08-12 … 14
- 👉 [Gerbang lint server/+e2e/ (#207)](asseris-gerbang-lint-server-e2e.md) — ⚠ jangan hapus escape `\-` di `redact.ts`.
- 👉 [SMM 1 & SMM 2 IAPI](asseris-smm1-smm2-adoption.md) — resolver konflik regex bisa MEMBUANG baris deklarasi · [ARC 8a-2 risiko ilustratif](asseris-pr8a2-risiko-ilustratif.md) — ekstraksi PDF WAJIB `pdftotext -table`.
- 👉 [Estimasi terfalsifikasi](asseris-estimasi-terfalsifikasi-arc.md) · [PRD V-9 tab beralamat](asseris-prd-tab-beralamat-v9.md) · [PR-8 Toolkit](asseris-pr8-toolkit-implementasi.md) · [PRD Toolkit IAPI](asseris-pr8-toolkit-map-prd.md) · [V-5/V-6/V-7](asseris-v5-v6-v7-remediasi.md)
- Tinjauan visual: [Toolkit](asseris-tinjauan-visual-toolkit-2026-08-14.md) · [SMM](asseris-tinjauan-visual-smm-2026-08-13.md). Checkpoint: [08-13 sore](asseris-checkpoint-2026-08-13-sore.md) · [08-13](asseris-checkpoint-2026-08-13.md) · [platform lain](asseris-checkpoint-platform-lain-2026-08-12.md) · [SA 620](asseris-checkpoint-2026-08-12-sesi-sa620.md)

## Arc 2026-07 … 08-07
- 👉 [Materialitas OM split](asseris-materiality-om-split.md) — oracle memaku jalur nol-view · [Uji SA 600 + typecheck:test (#155)](asseris-test-tier-typecheck-gate.md) — `typecheck:test` kini WAJIB.
- 👉 [Integritas ttd KK (#177)](asseris-wp-signoff-integrity.md) · [AJE imutabilitas (#176)](asseris-aje-immutability-live-approvals.md) · [Integritas WTB](asseris-wtb-integrity-falsifiable.md) · [Klon kedua WP canon (#169)](asseris-klon-kedua-wp-canon-rebase.md) · [Kontrak Overlay](asseris-overlay-contract-arc.md) · [LPE tanpa kolom PKL (#178)](asseris-fsgen-lpe-oci-column.md)
- 👉 PSAK 46: [PR-H basis DILAPORKAN](asseris-psak46-prh-basis-dilaporkan.md) · [PR-G1 klasifikasi fiskal](asseris-psak46-prg1-taxeffect.md) · [PR-F + sapuan `.split`](asseris-psak46-fiscal-split-sweep.md)
- 👉 WTB: [PR-3/4/5 SA 520](asseris-wtb-pr3-pr4-sa520-spine.md) · [evaluasi + SSOT materialitas](asseris-wtb-eval-pr1-pr2.md) · [Arc AJE](asseris-aje-module-eval.md)
- Checkpoint: [08-07](asseris-session-2026-08-07-checkpoint.md) · [07-25](asseris-session-2026-07-25-checkpoint.md) · [07-21](asseris-session-2026-07-21-checkpoint.md) · [07-19/20](asseris-session-2026-07-19-checkpoint.md) · [07-18](asseris-session-2026-07-18-checkpoint.md)

## Desain & navigasi
- [Beranda Kokpit (#126)](asseris-home-cockpit.md) · [Sidebar learning-curve](asseris-sidebar-learning-curve.md) · [Header modul satu-baris](asseris-pagehead-single-row.md) · [Judul modul + KPI](asseris-pagehead-module-title.md) · [Restrukturisasi navigasi](asseris-nav-beranda-restructure.md) · [Deep-link tab](asseris-deeplink-tab-nav.md)

## Modul & fitur
- [Fase 4 guardrail input](asseris-f04-validation-guardrails.md) · [Evaluasi input 158 modul](asseris-input-mechanism-eval.md) · [Penerimaan & Keberlanjutan](asseris-penerimaan-keberlanjutan-detail.md) · [Restatement PSAK 25](asseris-restatement-module.md) — sentuh AMS_CANON ⇒ update snapshot.
- [Engagement Pack Excel](asseris-excel-engagement-pack.md) · [Isolasi Data Personal](asseris-personal-data-isolation.md) · [Confirmation Hub SA 505](asseris-confirm-hub-sa505.md) · [Konsolidasi SA 530](asseris-sa530-consolidation.md) · [WTB ingress](asseris-wtb-ingress.md) · [Audit Timeline relokasi](asseris-audittimeline-relocation.md) · [My Tasks ↔ Review Notes](asseris-mytasks-integration.md) · [Time & Budget → WIP](asseris-timebudget-wip-integration.md) · [Asersi Manajemen](asseris-asersi-manajemen.md) · [Keberlanjutan Klien ISQM](asseris-continuance-isqm.md) · [Risk relocation](asseris-risk-relocation-portfolio.md) · [WP execution & evidence](asseris-wp-execution.md)

## Evaluasi, kepatuhan & operasi
- [SoD sign-off dua-lapis](asseris-opinion-signoff-sod-defect.md) · [Recipe persist key](asseris-authoritative-persist-key-recipe.md) — 3 titik.
- [Gap FIRM People](asseris-firm-people-gap-matrix.md) · [Evaluasi modul Firm/Engagement](asseris-module-evaluation.md) · [Evaluasi menyeluruh](asseris-eval-menyeluruh-2026-07.md) · [Deploy-Readiness](asseris-deploy-readiness.md) · [UAT alur kerja](asseris-uat-audit-workflow-plan.md) · [Deploy AWS EC2](asseris-deploy-aws-ec2-test.md) · [Wedge MVP](wedge-mvp-build-decision.md)

## Fondasi platform
- [NeoSuite AMS arc W0–W10](neosuite-ams-arc.md) — ESM-only sejak W3 P2.
- TS migration: [W11 data](neosuite-ams-w11-typescript-data.md) · [W12 view](neosuite-ams-w12-typescript-view.md) · [W13 fondasi](neosuite-ams-w13-typescript-foundation.md) · [W14 strict](neosuite-ams-w14-typescript-strict.md) · [W15 model bertipe](neosuite-ams-w15-typescript-model.md)
- Fase B: [W6 backend](neosuite-ams-w6-backend.md) · [W7 auth & RBAC](neosuite-ams-w7-auth.md) · [W7.5 isolasi](neosuite-ams-w7-5-isolation.md) · [W8 LLM proxy](neosuite-ams-w8-llm-proxy.md) · [W9 konektor](neosuite-ams-w9-connectors.md) · [W10 hardening](neosuite-ams-w10-hardening.md) · [W10.5 export & seal](neosuite-ams-w10-5-export.md) · [window-strip](neosuite-ams-window-strip.md)
- P-series: [P1 kesimpulan](neosuite-ams-p1-conclusions.md) · [P2 WP sign-off](neosuite-ams-p2-wp-signoff.md) · [P4 Tax Audit Diagnostic](neosuite-ams-p4-diagnostic.md) · [P5 lifecycle gates](neosuite-ams-p5-lifecycle-gates.md)
