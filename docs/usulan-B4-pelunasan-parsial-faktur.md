# Usulan B4 — pembayaran parsial faktur: milik Billing, atau milik Kas & Rekonsiliasi?

> Status: **USULAN — menunggu keputusan Ari. Belum dikerjakan.**
> Dibuat 2026-08-21 menjawab B4 di [`prompts-perbaikan/12-billing.md`](prompts-perbaikan/12-billing.md).
> Bukan PRD (nama berkas sengaja tak berawalan `prd` agar tak masuk registri status §7).
> B1 · B2 · B3 · B5 dan bagian B4 yang tak butuh keputusan **sudah dikerjakan** dan
> tidak menunggu jawaban ini.

## Keadaan yang terverifikasi

Struktur data faktur **mengandaikan pembayaran parsial sudah mungkin terjadi**:

- `InvoiceRow.paid` adalah kolom tersendiri, bukan turunan status
  ([ams_types.ts:207](../migration/src/ams_types.ts));
- seed memuat satu baris berstatus `Partial` — `INV-2026-018`, Rp 820 jt dengan
  Rp 410 jt dibayar ([data_part1.ts:422](../migration/src/data_part1.ts));
- setiap konsumen hilir menghitung sisa sebagai `amount − paid`: aging piutang
  ([data_firmfin.ts:359](../migration/src/data_firmfin.ts)), tab Piutang & konsentrasi
  klien ([view_firmgl.tsx](../migration/src/view_firmgl.tsx)), dunning
  ([view_firmrevenue.tsx](../migration/src/view_firmrevenue.tsx));
- `INV_STATUS` bahkan punya warna untuk `Partial`
  ([view_pipeline.tsx](../migration/src/view_pipeline.tsx)).

Yang tidak ada adalah **jalannya**. Satu-satunya tombol adalah "Tandai Lunas", dan ia
memaksa `paid = amount` — sesudah perbaikan hari ini ia juga mencatat `paidAt`, tetapi
tetap pelunasan penuh. Artinya baris `Partial` hanya bisa lahir dari seed: keadaan yang
seluruh aplikasi tahu cara membaca, tetapi tak seorang pun dapat menciptakan.

Konsekuensi yang perlu disebut terang-terangan: **aging piutang firma tidak dapat
merepresentasikan penerimaan sebagian**. Klien yang mencicil tampil sebagai piutang
penuh sampai cicilan terakhir, lalu jatuh ke nol sekaligus. Untuk KAP yang menagih per
termin, itu bukan kasus tepi.

## Yang SUDAH dikerjakan (tidak menunggu keputusan)

- Pelunasan membawa `paidAt`, pengiriman membawa `sentAt` — keduanya dari klok SSOT
  `AMS.TODAY` ([canon_invoices.ts](../migration/src/canon_invoices.ts)).
- Baris warisan yang lunas tanpa tanggal ditampilkan **"tak tercatat"**, bukan diberi
  tanggal karangan.

## Opsi A — parsial dicatat di modul Billing

Tombol "Tandai Lunas" mendapat saudara: "Catat Pembayaran" (jumlah + tanggal + referensi).
Status turun dari angka: `paid = 0` → Sent/Overdue; `0 < paid < amount` → Partial;
`paid = amount` → Paid.

- **Untung:** satu layar, satu pemilik. Aging piutang langsung benar. Termin cicilan
  yang memang dinegosiasikan tim penagihan dicatat oleh orang yang menegosiasikannya.
- **Rugi:** Billing mulai memegang fakta **kas** tanpa lawan jurnalnya. Uang masuk ke
  rekening bank, dan modul yang tahu itu adalah Kas, Bank & Rekonsiliasi. Dicatat di
  sini, penerimaan piutang menjadi angka yang **tak pernah menutup ke buku besar** —
  persis kelas cacat yang PRD `cash-bank-reconciliation-register` cabut untuk kas.
- **Rugi:** "referensi bank" yang diketik tangan adalah bukti yang tak diverifikasi.
  Ia terlihat seperti bukti, dan tidak.

## Opsi B — parsial datang dari Kas, Bank & Rekonsiliasi

Penerimaan kas dicocokkan ke faktur di modul rekonsiliasi; `paid` faktur adalah
**turunan** dari penerimaan yang tercocokkan. Billing menampilkan, tidak menulis.

- **Untung:** satu arah aliran — kas nyata → alokasi ke faktur → piutang berkurang.
  Piutang otomatis menutup ke akun kontrol 1-200, dan `AR_BRIDGE` punya penjelasan
  yang dapat dienumerasi, bukan plug.
- **Untung:** bukti = baris rekening koran, bukan teks yang diketik.
- **Rugi:** butuh mekanisme pencocokan penerimaan→faktur yang belum ada. Ini pekerjaan
  yang jauh lebih besar dari B4, dan modul rekonsiliasi sekarang mencocokkan ke
  **jurnal**, bukan ke dokumen piutang.
- **Rugi:** sampai itu selesai, aging piutang tetap salah untuk pembayar cicilan.

## Opsi C — hanya tandai keadaannya, jangan catat uangnya (jembatan)

Billing tidak menerima jumlah. Yang ditambahkan hanya kemampuan menandai faktur sebagai
**"dibayar sebagian — jumlah menunggu rekonsiliasi"**, dengan sisa tagihan tetap penuh
di aging sampai kas tercocokkan.

- **Untung:** tak ada angka uang yang lahir tanpa lawan jurnal; tak ada bukti palsu.
  Dan daftar faktur yang menunggu pencocokan menjadi **umpan kerja** untuk Opsi B.
- **Rugi:** aging piutang masih melebih-hitung. Kejujurannya bertambah, angkanya belum.

## Rekomendasi

**Opsi B sebagai tujuan, Opsi C sebagai langkah sekarang** — dengan satu syarat: C
hanya layak bila B benar-benar dijadwalkan. Menandai keadaan tanpa pernah membangun
pencocokannya berarti menambah satu kolom yang tak pernah menutup ke apa pun.

Alasan menolak A sebagai tujuan: modul ini menerbitkan **tagihan**; yang mengetahui
**penerimaan** adalah bank. Menaruh penulisan kas di Billing memindahkan satu-satunya
titik di mana angka piutang dapat difalsifikasi (rekening koran) ke tempat yang tak
melihatnya.

## Pertanyaan terbuka (butuh jawaban Ari)

1. **Apakah KAP benar-benar menerima cicilan atas satu faktur termin?** Kalau dalam
   praktik pembayaran selalu penuh per termin dan baris `Partial` di seed hanya
   ilustrasi, maka jawaban yang benar bukan A/B/C — melainkan **mencabut** status
   `Partial` beserta jalur `amount − paid` yang menopangnya, dan mengakui bahwa
   piutang hanya punya dua keadaan. Itu penyederhanaan besar, dan hanya Anda yang tahu
   fakta praktiknya.
2. **Siapa yang boleh mencatat penerimaan?** Hari ini `capForWrite('firm','invoices')`
   = `FIRMFIN_EDIT` — sama dengan yang menerbitkan faktur. Kalau penerimaan kas masuk
   ke modul ini, penerbit dan pencatat penerimaan menjadi orang yang sama; itu
   pelanggaran SoD yang lazim jadi temuan.
3. **Nomor faktur** (dari B1, sekalian diputuskan): urutan sekarang **tidak** di-reset
   per tahun buku — nomor berikutnya = tertinggi + 1 dengan tahun dari klok SSOT
   (`INV-2027-054` menyusul `INV-2026-053`). Apakah kebijakan firma menghendaki reset
   tahunan (`INV-2027-001`), urutan per klien, atau prefiks firma? Pilihan sekarang
   dipilih justru karena ia **tidak mengarang kebijakan**, bukan karena ia yang benar.
