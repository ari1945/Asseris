---
name: asseris-arb-trm-058-jurnal-koreksi
description: "ARB-TRM-058 dicabut lewat JV-0321 — kenapa KAS mustahil jadi penyeimbang, kenapa koreksi GL harus jurnal bukan suntingan saldo, dan salinan kedua pendapatan firma yang cuma terlihat karena angkanya bergerak"
metadata:
  type: project
---

Arc 2026-08-23, **PR #297** (`10e2e6e`, cabang `fix/cabut-arb-trm-058`) — CI 9/9,
MERGEABLE/CLEAN, **menunggu merge**. Menutup R1 dari
`docs/usulan-B6-sisa-kontradiksi-c058.md`; lanjutan #295
([[asseris-seed-c058-faktur-materialitas]]).

## PELAJARAN TERBESAR: rekomendasi saya sendiri (KAS) ternyata mustahil

Di usulan-B6 saya merekomendasikan kas sebagai penyeimbang. Ari menyetujuinya.
Saat hendak menulis jurnalnya ketahuan itu **tak dapat dikerjakan tanpa
memalsukan bukti eksternal** — dan saya berhenti, bukan menuruti perintah.

`FIRMFIN.bankRecon` mengadu saldo GL **tiap rekening** dengan `BANK_ACCOUNTS[].balance`
(saldo REKENING KORAN — data eksternal literal, sengaja sumber kedua yang
independen) ± item `BANK_RECONS`, lalu `reconciled = |residual| < toleransi`.
Keenam rekening menutup PERSIS hari ini, dan tak ada item 492 jt di mana pun
(terbesar: cek beredar 480, setoran dalam perjalanan 410 — keduanya bertuan).
Mendebit kas ⇒ satu rekening merah ⇒ menurut komentar mesinnya sendiri **ekspor
LK TERKUNCI**.

**ATURAN: sebelum menerima akun penyeimbang untuk koreksi apa pun, periksa apakah
akun itu punya SUMBER KEDUA yang independen (rekening koran, konfirmasi, register
eksternal). Kalau ya, ia tak bisa digerakkan sepihak — angkanya bukan milik kita.**
Kas, piutang berkonfirmasi, dan persediaan berhitung-fisik semuanya sekelas.

## Koreksi GL = JURNAL, bukan menyunting saldo

`FIRM_COA[].bal` adalah saldo **PENUTUP**; `openingBalances = penutup − Σ jurnal
seed terposting` (firm_ledger.ts). Menyunting saldo saja memecah roll-forward.
Jadi: `JV-0321` `Dr 4-100 / Cr 1-200 492 jt`, dan saldo penutup ikut bergerak
sehingga **saldo AWAL tetap identik** (3.170 / −7.895 jt) — koreksi periode
berjalan. Pola rumahnya sudah ada: revaluasi PSAK 10 masuk lewat JV-0319/0320.

Cek aritmetika yang menghemat waktu: opening tak berubah bila ΔPenutup == ΔΣjurnal.

## Salinan kedua yang hanya terlihat karena angkanya BERGERAK

`BI_DATA.fyRevenue` (data_part3) sama PERSIS dengan kontrol GL `4-100`, dan
`revenueByService` menjumlah tepat kepadanya. Selama keduanya kebetulan sama,
**nol gerbang memerah** — tiga modul (`view_bi`, `view_bi2`, `view_dashboard2`)
langsung akan melaporkan angka yang dibantah buku besarnya sendiri.

**ATURAN: setiap kali sebuah besaran kanonik bergerak, grep nilainya sebagai
LITERAL di seluruh repo. Yang cocok adalah salinan; salinan yang selama ini
"benar" cuma karena belum pernah diuji.** Di sini grep `11_300_000_000` memanen:
`BI_DATA.fyRevenue`, cadangan MATI `|| { revenue: 11_300_000_000, … }` di
`view_firmgl` (ARC-014: cadangan ke data karangan — dicabut), fixture
`fee_concentration`, dan `delta="+11% YoY"` literal di `view_dashboard2`.

## Membaseline ulang oracle TANPA melemahkan gerbang

14 uji merah di 4 berkas, semuanya memaku angka lama. Yang dilakukan: ganti
konstantanya, **pertahankan yang dijaga**, dan tulis alasannya di komentar
sebelah. Contoh terbaik: `firmfin_budget` SC-7 "varians pendapatan tidak
dipoles" −5,83% → −9,93% — yang dijaga tetap "NEGATIF dan tak dipoles".
Beberapa uji bernama "nol-delta" (#239/#240) — baselining tidak membatalkannya:
arc ITU tetap nol-delta, arc BARU yang sengaja menggeser. Katakan begitu di
komentar. Sejalan [[asseris-profit-isolasi-realisasi]] (#273): ganti CARA
MEMBUKTIKAN, jangan sifat yang dijaga.

GOTCHA kecil: `expect(byCode(open,'1-200')).toBe(4_440_000_000 - 1_270_000_000)`
**tetap HIJAU** sesudah perubahan (3.170 = 3.948 − 778) — literalnya basi tapi
hasilnya sama. Uji yang lolos tidak berarti angkanya masih benar; perbarui juga.

## Falsifikasi gerbang: pulihkan data HISTORIS, bukan sekadar anti-tautologi

Anti-tautologi (`expect(x+1).not.toBe(x)`) hanya membuktikan ekspresinya bisa
salah. Yang membuktikan gerbang MENGGIGIT: `cp` berkas data → suntikkan kembali
keadaan historis → jalankan → harus MERAH di tempat yang tepat (di sini 5) →
`cp` balik. Sejalan [[asseris-s1-kode-mati-retensi-bo]].

## Mekanis

- `server/` nol pembaca `AR_BRIDGE`/`FIRM_COA`/`FIRM_GL` ⇒ gerbang backend aman
  dilewati lokal (CI tetap menjalankannya).
- Probe sekali pakai `__tmp_probe.test.ts` yang `console.log` keluaran mesin
  (arAging · pl · balanceSheet · bankRecon · openingBalances) SEBELUM & SESUDAH =
  cara termurah menghapus spekulasi. Hapus sesudahnya.
- `FIRMFIN.recognitionSchedule` menerima `hoursOf` sebagai FUNGSI, bukan Record.
- Python `str.replace` pada berkas CRLF: selalu `assert s.count(old)==n` DULU;
  bila pola muncul >1 kali, script gagal SEBELUM menulis (aman).
