---
name: asseris-psak46-prg1-taxeffect
description: "PR-G1 klasifikasi fiskal per-jurnal (#154), PR-H1 CP-01 turunan (#153), PR-H2 default per-field (#152) — 2026-07-29; ketiganya TERBUKA, CI 6/6 hijau, Dependabot #116/#117 MERGED."
metadata: 
  node_type: memory
  type: project
  originSessionId: 297a6e8e-8e96-4357-98c9-9e38ad7788f5
  modified: 2026-07-29T06:15:28.939Z
---

Sesi 2026-07-29. Basis master `d9149d0` → **`d7a2913`** (setelah Dependabot #116 & #117 MERGED, diverifikasi SETELAH gabung: typecheck 0 klien & server · lint 0 · 748 test · build hijau).

## Tiga PR TERBUKA, CI 6/6 hijau semua
- **[#154](https://github.com/ari1945/Asseris/pull/154) PR-G1** `feat/psak46-pr-g1-temp-diff` — klasifikasi fiskal per-jurnal. 755 test.
- **[#153](https://github.com/ari1945/Asseris/pull/153) PR-H1** `fix/groupaudit-cp01-derived` — CP-01 turunan psak65. 753 test. Ratchet `any` 47→46.
- **[#152](https://github.com/ari1945/Asseris/pull/152) PR-H2** `fix/materiality-per-field-default` — default per-field. 752 test.

Ketiganya **berdiri sendiri dari master**, tak bertumpuk → tak perlu resep retarget.

## Ari mendelegasikan metodologi pajak
Awalnya Ari berkata "JANGAN mengarang pemetaannya, ini pertanyaan untuk saya"; setelah PRD selesai ia berkata **"lanjut kerjakan sesuai logika akuntansi dan audit"**. Cara menanganinya yang terbukti diterima: **tetapkan sendiri TAPI kutip dasar hukum per jurnal**, sehingga tiap penetapan dapat dibatalkan satu per satu tanpa membongkar mekanismenya.

Penetapan (di `data_part1.ts` sebagai field `taxEffect`):
| Jurnal | Penetapan | Dasar |
|---|---|---|
| AJE-01 cut-off | nol beda | Ps. 10(6) UU PPh + akrual Ps. 28(5) UU KUP |
| **AJE-02 CKPN 620** | **temporer → `ecl`** | **Ps. 9(1)(c) UU PPh** — manufaktur BUKAN entitas yg dikecualikan (bank/pembiayaan/asuransi/penjaminan/tambang/hutan/limbah); realisasi Ps. 6(1)(h) |
| AJE-03 piutang fiktif | nol beda + `note` | Ps. 4(1); bila SPT sudah dilaporkan → pembetulan Ps. 8 UU KUP |
| AJE-04 akrual bonus | nol beda **bersyarat** (`condition`) | Ps. 6(1)(a); berbalik bila PPh 21 belum dipotong |
| **AJE-05 penyusutan** | **temporer → `ppe`** | **Ps. 11 UU PPh**; masih usulan → belum terhitung |

**Q2 (paling menentukan) ditetapkan PRA-AUDIT**: kertas kerja fiskal 6.800 disusun klien atas bukunya sendiri (dasar SPT), jadi efek jurnal **dilapiskan**. Bukti, bukan asumsi: tak satu pun dari 4 barisnya tie ke kolom `adj`, sementara t1 (1.860) tie **PERSIS** ke mutasi `unadj − ly` akun 2-2300.

## DUA TEMUAN STRUKTURAL (nilai terbesar sesi ini)
1. **`tempMovement` LENYAP dari beban pajak.** `taxExpense = (pbt + permAdd − permLess) × tarif` — movement masuk pajak kini (+) dan tangguhan (−) dgn bobot sama. **Itu sebabnya cacat bertahan lima evaluasi: bottom line-nya selalu benar.** Yang salah hanya SPLIT kini/tangguhan — yaitu angka SPT & pos DTA. Diuji sbg invarians.
2. **`opening = closing − deferredPL − oci` adalah PLUG** → `tempMovement` **tak dapat difalsifikasi**: berapa pun diisi, model tetap menutup karena saldo awal menulis ulang sejarah. Pembanding sah sudah tersedia sejak awal di **WTB 1-2500 kolom `ly`** dan tak pernah dipakai. Gerbang baru: `openingBooks`/`openingVariance`.

**Konsistensi yang membuktikan diri sendiri:** koreksi CKPN 620 menaikkan movement DAN saldo penutup masing-masing 136 jt → **saldo awal tersirat TETAP 1.511 jt sebelum & sesudah**. Memperbaiki salah satu saja akan menggesernya 136 jt SENYAP. Angka: PKP 30.750→31.370 · pajak kini 6.765→6.901 · manfaat tangguhan 1.496→1.632 · closing 3.066→3.202 · **beban pajak 5.269 & ETR 20,46% TAK BERGERAK**. Gerbang MENYALA: opening model 1.511 vs buku besar TA-1 4.110 → selisih 2.599 jt, nyata & belum terjelaskan (tidak dipaksa padam).

**`reportedBalance(wtb, aje, code)`** baru di canon_base = `unadj` + mutasi jurnal **Posted**. Dulu basis saldo TERBALIK pada keduanya: ember `ecl` MENGECUALIKAN AJE-02 (Posted) sementara nilai tercatat aset tetap MEMASUKKAN AJE-05 (usulan).

## VERIFIKASI LIVE (Ari login sendiri sbg Hartono W./Rekan Pemimpin)
- **PR-G1**: provenans per baris tampil ("Buku besar · WTB 2-2300 · mutasi unadj − ly" hijau vs "KK fiskal klien" amber) · banner saldo awal tampil dgn angka benar · KPI/tabel/footer **satu angka** · konsol bersih.
- **PR-H1**: CP-01 **70%/71%** (dulu 58%/55%) · KPI cakupan **96%/95%** · kaki tabel juga 96%/95% · baris rev berjumlah 100%.
- **PR-H2**: kontrol NEGATIF lulus (ENG-2025-014 sehat → PM 75%, nol banner).

## ⚠️ DUA HAL YANG **TIDAK** TERVERIFIKASI LIVE — jangan klaim sebaliknya
1. **Klasifikasi fiskal tak sampai ke app hidup.** `aje` adalah **StateDoc per-perikatan** (`useServerState('aje', D.AJE, 'engagement', …)`), jadi `data_part1.ts` hanya DEFAULT AWAL; dokumen tersimpan mendahului field `taxEffect`. Live menampilkan PKP 28.900 (tanpa lapis 620) dan banner **"4 jurnal terposting belum diklasifikasi fiskal (AJE-01..04)"** — yang justru **perilaku benar** (klasifikasi = pertimbangan auditor = state, bukan seed). Mendemokan end-to-end butuh `npm run seed` (DESTRUKTIF, 14 tabel, logout semua) → **butuh aba-aba Ari**.
2. **Kasus positif PR-H2 tak dapat direproduksi.** Diperiksa langsung di DB: **NOL StateDoc berawalan `mat`** — record `pmPct: null` yang tercatat di memori sesi lalu sudah terhapus reseed 2026-07-27. Cacat kodenya nyata (cabang per-OBJEK) & tertutup 4 uji, tetapi gejalanya tak lagi ada di DB ini.

## GOTCHA baru
- **`SAMPLE_WTB` TIDAK PERNAH DIEKSPOR** `__fixtures__/wtb.ts` (yg ada: FIXTURE_WTB/FIXTURE_TB_FULL). Diimpor `group_consol_pbt.test.ts` & `group_materiality.test.ts` → `undefined` → `psak65(undefined,…)` jatuh ke singleton. **Lolos karena test-tier di-EXCLUDE dari `tsc` sejak W15** (`tsconfig.json:25`). Sudah jadi chip tugas.
- **Probe kanon tanpa server**: tulis `.mts` di scratchpad, impor via `file:///D:/Claude%20AI/...` (spasi di-encode), jalankan `npx tsx <path>` dari `migration/`. `npx tsx -e` GAGAL SENYAP (eval = CJS, top-level await ditolak). Jangan impor `canon.ts` (menyentuh `window`); pakai `canon_part1/canon_base/canon_part3`.
- **Pemilih perikatan** = `document.querySelector('.top-ctx')` (punya `onclick`), lalu klik elemen ber-teks `ENG-2025-0xx`. Tak ada di localStorage.
- **`npx eslint src --prune-suppressions`** setelah menaikkan tipe; ratchet turun 47→46.
- Enum literal dalam seed `.ts` butuh `as const` (`kind: 'temporary' as const`), kalau tidak `string` tak assignable ke union.
- **`--red-bg`/`--amber-bg` ADA** di `styles_base.css` (light 53/51, dark 168). Tetap grep dulu.

## Sisa terbuka
- Tinjau & merge #152/#153/#154 (urutan bebas, tak bertumpuk).
- **Chip tugas**: (a) perbaiki impor `SAMPLE_WTB`; (b) perluas basis DILAPORKAN ke PSAK 71/16/FS Generator — dua baris `reconcile()` kini `warn` (CKPN 620 · aset tetap 1.120), sebabnya sudah dinamai di catatan baris.
- **PR-G2 opsional**: metode neraca penuh (movement jadi turunan `closing − opening`), menunggu dasar pajak TA-1 per ember.
- Q4 PRD PR-G: `FISCAL.provisi 900` dipakai sbg SALDO *dan* MOVEMENT — hanya benar bila saldo awal provisi nol. Ditandai `source:'wp'`, belum diselesaikan.

Terkait: [[asseris-psak46-fiscal-split-sweep]] · [[asseris-aje-module-eval]] · [[asseris-materiality-om-split]]
