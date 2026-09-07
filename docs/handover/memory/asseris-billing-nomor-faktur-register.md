---
name: asseris-billing-nomor-faktur-register
description: "Billing: nomor faktur dari panjang array + tujuh konsumen piutang membaca seed — dan pintu belakang yang gerbang cakupan TIDAK bisa lihat (engine ber-ctx fallback)"
metadata: 
  node_type: memory
  type: project
  modified: 2026-08-21T02:54:43.466Z
  originSessionId: e255702d-8254-404d-b9de-2fb9f61eb029
---

Arc `billing` (2026-08-21). **MENDARAT: PR #275 → `origin/master` `1b32c7f`** (squash;
cabang sudah dihapus). CI 9/9 hijau termasuk playwright & dua npm audit. Prompt: `docs/prompts-perbaikan/12-billing.md`.
Semua cacat B1–B5 TERKONFIRMASI di HEAD; satu lagi (B6) ditemukan sendiri.

## Yang ditutup

- **B1** `'INV-2026-0' + (46 + invoices.length)` → `nextInvoiceId(register, today)`:
  nomor TERTINGGI + 1, tahun dari `AMS.TODAY`, `padStart(3)`. Formula lama kebetulan
  BENAR pada keadaan seed (max 045, 7 baris, 46+7=53) — itulah sebabnya tak terlihat.
- **B2** satu pintu `useInvoiceRegister` (`use_invoices.ts`), pola `usePipelineRegister`.
- **B3** `who = AMS.USER.name` → `useCurrentAuditor()` (3 situs). **5 situs sejenis
  tersisa** di view_delivery · view_firmgl ×2 · view_firmtax · view_firmtreasury · view_wip.
- **B4** `paidAt`/`sentAt`; parsial → `docs/usulan-B4-pelunasan-parsial-faktur.md`.
- **B5** nilai awal form dari klok + termin turunan.

## GOTCHA 1 — pintu belakang yang gerbang CAKUPAN tak bisa lihat

Gerbang cakupan menyisir berkas konsumen mencari `AMS.INVOICES`. Itu MELEWATKAN kelas
pembaca seed yang lain: **mesin yang menerima ctx dengan fallback seed**, mis.
`data_platform.ts:120` `const invoices = ctx.invoices || A.INVOICES`. Cacatnya bukan
di mesin dan bukan di berkas konsumen — cacatnya adalah **pemanggil yang tidak
mengirim kunci ctx-nya**. `view_platform.tsx:127` memanggil `buildApprovals` tanpa
`invoices`, jadi antrean otorisasi menilai faktur seed; faktur baru tak pernah muncul.
Komentar di baris 118–123 berkas yang sama sudah mencatat cacat identik untuk
`ctx.pipeline` — dan tetap tak seorang pun memeriksa tetangganya.

**Cara mencari kelas ini:** grep `ctx.<nama> || A.<NAMA>` di `data_*.ts`, lalu untuk
tiap kunci cari SEMUA pemanggil dan periksa apakah kuncinya dikirim. Jangan berhenti
di grep `AMS.X`. Sisa yang belum ditutup: `data_firmfin.ts:273` `invOf` masih punya
fallback seed untuk pemanggil yang tak mengirim `invoices` (mis. `firm_bridge.test.ts`).

## GOTCHA 2 — register KEDELAPAN yang tak tersentuh

`BI_AR_AGING` (`data_fpm.ts:177`) adalah tabel aging piutang LITERAL kedua, dibaca
kokpit Beranda (`view_home_cockpit.tsx:262`) dan `view_dashboard2.tsx:137`. Ia tidak
diturunkan dari faktur sama sekali. Dua angka piutang untuk satu firma masih hidup.

## GOTCHA 3 — protokol gerbang merah untuk logika yang belum diekstrak

Uji atas modul murni BARU merah karena "module not found" — itu bukti lemah. Yang saya
lakukan: tulis `canon_invoices.ts` berisi perilaku LAMA apa adanya lebih dulu, jalankan
(24 merah / 12 hijau dengan pesan assertion nyata), baru perbaiki isinya. Merahnya
berasal dari perilaku yang salah, bukan dari berkas yang belum ada.

Catatan jujur: uji B2 murni (`markInvoicePaid` → `arOutstanding` turun) HIJAU sejak
awal — semantiknya memang tak berubah. Yang benar-benar memfalsifikasi B2 adalah
gerbang CAKUPAN, bukan uji nilainya. Sebutkan pembagian peran ini, jangan mengklaim
uji nilai membuktikan penyambungan.

## GOTCHA 4 — data sudah menyatakan terminnya

Sebelum mengarang "jatuh tempo default = +30 hari": ketujuh faktur seed berjarak
**persis 30 hari** terbit→jatuh tempo, sedangkan literal lama form 37 hari (2026-03-09
→ 2026-04-15) tak dianut satu pun. Jadi terminnya DIBACA (`standardTermDays`, modus
tunggal), dan bila register tak menyatakannya secara tunggal → kembalikan `''`,
tombol terbit terkunci. Sejalan dengan pelajaran #274: cari dulu apakah data sudah
menyatakan pembandingnya. Lihat [[asseris-profit-isolasi-realisasi]].

## GOTCHA 5 — dua jebakan mekanis yang memakan waktu

1. **Gerbang regex atas berkas CRLF.** `read()` di uji cakupan membuang komentar tapi
   TIDAK membuang `\r`; pola penutup `[\s\S]*?\n\}` tak pernah cocok karena yang ada
   `\r\n}`. Gejalanya menyamar jadi "pola tidak ditemukan", bukan "gerbang salah".
   Pakai `\r?\n`. Dan buktikan gerbangnya bisa merah dengan MUTASI sengaja — saya
   menanam kembali `issued: '2026-03-09'`, memastikan merah, lalu mencabutnya.
2. **Exit code `npm run verify` bisa tertelan.** `npm run verify > log 2>&1; echo
   "EXIT=$?"; tail ...` → notifikasi harness melaporkan exit `tail` (0) padahal verify
   gagal. Dan `tools/verify.mjs` TIDAK berhenti di kegagalan pertama, jadi monitor
   tetap menampilkan tahap-tahap berikutnya "lolos" sesudah lint merah. Baca baris
   `VERIFY PASSED`/`VERIFY FAILED`, jangan percaya exit code rantai perintah.
3. **Menghapus `:any` MEMERAHKAN lint** ("suppressions left that do not occur anymore").
   Jalankan `npm run lint:any-baseline`. Di sini baseline hanya TURUN 25 (54→38, 76→68,
   35→34), nol suppression baru.

## Isolasi kerja

Direktori utama sedang memegang kerja sesi lain yang belum di-commit, jadi arc ini
dikerjakan di worktree `.claude/worktrees/billing-register`: junction `node_modules`
root + `migration`, tetapi **`server/node_modules` di-`npm ci` sendiri** supaya
`prisma generate` tidak memanggang direktori skema worktree ke pohon utama
([[asseris-prisma-client-worktree-trap]]). `ensure-prisma-client` melapor OK di kedua
pohon sesudahnya.

Terkait: [[asseris-sales-pipeline-arc]] · [[asseris-firmfin-ledger-derived]] ·
[[asseris-sesi-paralel-satu-worktree]]
