# Prompt perbaikan — modul `revenue` (Pendapatan Firma)

> Dibuat 2026-08-21 dari template [`../PROMPT-PERBAIKAN-MODUL.md`](../PROMPT-PERBAIKAN-MODUL.md).
> Blok: A (preamble) + B (inti) + adendum C-E (ledger) + D (definisi selesai).
>
> **Catatan pembuat prompt:** modul ini melakukan sesuatu yang benar dan jarang — ia
> **mengaku**. Pita peringatan di tab "Aset & Liabilitas Kontrak" menyatakan terang-
> terangan bahwa saldo awal dan komponen pergerakan adalah ilustrasi demo, bahwa faktor
> ×0,74/×0,32 disintesis agar menutup ke saldo akhir, dan bahwa itu bukan turunan buku
> besar. Itu persis perlakuan yang Program E minta untuk angka yang belum berbasis
> ledger. **Jangan menghapus pengakuan itu, dan jangan diam-diam "memperbaiki" angkanya
> — penggantinya adalah PR-5, arc yang sudah disetujui.**
>
> Masalahnya ada di kalimat terakhir pengakuan itu: *"Kolom diakui/ditagih per
> engagement adalah data nyata."* Kalimat itu **tidak benar**. "Ditagih" dibaca dari
> register faktur yang beku, dan "diakui" dihitung dari nilai kontrak yang punya jalan
> keluar ke angka karangan. Pengakuan yang menjamin terlalu banyak lebih berbahaya
> daripada tidak mengaku sama sekali, karena ia memindahkan kewaspadaan pembaca ke
> tempat yang salah.

---

```
Kamu mengerjakan Asseris (aplikasi audit KAP, Bahasa Indonesia). Baca CLAUDE.md di
root repo sebelum menyentuh kode apa pun. Sumber kanonik = migration/src.

ATURAN KERAS (melanggar = pekerjaan ditolak):
1. BUKTI SEBELUM KLAIM. Jangan menulis "X belum ada" tanpa grep; sertakan perintah dan
   hasilnya.
2. SSOT. Satu konsep = satu register. Dua register untuk satu konsep adalah TEMUAN —
   pilih satu, jangan sinkronkan.
3. PENGAKUAN HARUS TEPAT SELUAS KENYATAAN. Menandai angka sebagai "ilustrasi" itu
   benar; menyatakan angka lain "nyata" padahal tidak, membatalkan gunanya. Kalau kamu
   tidak dapat membuat sebuah kolom menjadi nyata, PERSEMPIT pengakuannya — jangan
   biarkan ia menjamin.
4. CACAT DORMAN TETAP CACAT, TETAPI JANGAN DILAPORKAN SEOLAH SEDANG MERUSAK ANGKA.
   Bila sebuah fallback tidak pernah terpicu oleh data hari ini, katakan begitu — lalu
   buktikan ia dapat terpicu dengan uji, bukan dengan dugaan.
5. GERBANG HARUS BISA MERAH. Tulis uji yang GAGAL pada kode sekarang lebih dulu dan
   tempelkan output merahnya. toMatchObject({p: /regex/}) SELALU lolos — jangan dipakai.
6. TIDAK ADA ASUMSI DIAM-DIAM, terutama soal metode akuntansi.
7. Kontrol NATIVE · skala tipografi 8 ukuran · warna lewat token · `:any` baru = merah.

GERBANG SELESAI (dari root, tempelkan outputnya):
   npm run verify

---------------------------------------------------------------------------

TUGAS: buat kolom yang diklaim "nyata" benar-benar nyata, cabut jalan keluar ke angka
karangan, dan jujurkan label metode pengakuan pendapatan.

KONTEKS MODUL
- id modul: revenue (grup "Keuangan Firma (ERP)")
- berkas: migration/src/view_firmrevenue.tsx (273 baris), fungsi `FirmRevenue()`
- tab: Pengakuan Pendapatan (PSAK 72) · Aset & Liabilitas Kontrak · Dunning · Nota Kredit
- register faktur yang HIDUP: modul `billing` di view_pipeline.tsx:581 —
  `useAmsPersist('invoices', () => AMS.INVOICES)`
- PRD induk: docs/prd-firm-erp-deepening.md — **PR-5** ("PSAK 72 menutup ke `4-100`;
  jembatan pendapatan; akun liabilitas kontrak; roll-forward dienumerasi; fallback
  `materiality × 0,4` dicabut") berstatus **Approved, belum dikerjakan**.

KEADAAN AWAL YANG SUDAH DIVERIFIKASI (jangan diulang, jangan "diperbaiki"):
- Klok SSOT: `const REF = new Date(AMS.TODAY)`.
- Pita pengakuan ilustrasi di tab roll-forward ADA dan isinya benar soal ×0,74/×0,32.
  Pertahankan pengakuan itu.
- Aset/liabilitas kontrak per engagement dihitung dengan arah yang benar
  (aset = diakui > ditagih; liabilitas = ditagih > diakui).

CACAT

V1 · "Ditagih" dibaca dari register faktur yang beku  [P0]
    view_firmrevenue.tsx:20  `const invoices: any = AMS.INVOICES;`
    Modul `billing` menulis faktur ke register yang dipersistensikan
    (view_pipeline.tsx:581); modul ini membaca seed mentah. Menerbitkan faktur,
    menandainya lunas, atau mengubah jatuh temponya di Billing tidak terlihat di sini.
    Yang ikut salah karena itu: `billed` per engagement, aset kontrak, liabilitas
    kontrak, seluruh tab Dunning, dan KPI "Aset Kontrak" / "Pendapatan Diterima Dimuka".
    Kerjakan: baca register yang sama dengan yang ditulis Billing. Jangan menyalin,
    jangan menyinkronkan.
    CATATAN: modul `apar` punya cacat identik dan mungkin sedang dikerjakan paralel
    (lihat prompt 29-apar). Periksa dulu; kalau di sana sudah ada pola membaca register
    hidup, IKUTI pola itu — jangan membuat cara kedua.

V2 · Nilai kontrak punya jalan keluar ke angka karangan  [P1 — DORMAN, tetap kerjakan]
    view_firmrevenue.tsx:27  `const contract = c ? c.fee : e.materiality * 0.4;`
    Nilai kontrak — dasar seluruh pengakuan pendapatan, backlog, dan posisi aset/
    liabilitas kontrak — jatuh ke *materialitas × 0,4* bila klien tak ditemukan atau
    tak punya fee. Materialitas adalah pertimbangan audit; ia tidak punya hubungan
    apa pun dengan harga kontrak.
    **Verifikasi lebih dulu, dan laporkan hasilnya:** dengan data hari ini (8 klien,
    semuanya ber-`fee`, 7 engagement) fallback ini tampaknya TIDAK PERNAH terpicu.
    Jangan melaporkannya seolah sedang merusak angka. Yang membuatnya berbahaya adalah
    ia menunggu: satu klien baru tanpa fee, atau satu `clientId` yang tak cocok, dan
    pendapatan firma dikarang tanpa suara.
    PR-5 memang memerintahkan pencabutannya. Kerjakan pencabutannya SAJA (bukan sisa
    PR-5): bila nilai kontrak tak diketahui, baris itu dinyatakan tak dapat dihitung —
    bukan diisi.

V3 · Label metode tidak sesuai dengan yang diukur  [P1 — USULKAN, jangan putuskan]
    Baris 28-29: `pct = e.progress / 100`, sementara baris 33 memberi label
    `'Over-time (input)'` untuk perikatan audit.
    Metode input di PSAK 72 mengukur kemajuan dari MASUKAN yang dikeluarkan (jam/biaya)
    terhadap total yang diharapkan. Yang dipakai di sini adalah persentase progres
    perikatan — dan baris data yang sama sebenarnya sudah membawa `hrs` dan `budgetHrs`
    yang tidak dipakai sama sekali.
    Ini pertanyaan akuntansi, bukan pertanyaan teknis, dan jawabannya mengubah
    pendapatan yang diakui firma. Tulis usulan singkat berisi dua opsi — (a) ukur dari
    jam terhadap anggaran jam, (b) pertahankan progres tetapi ubah labelnya menjadi
    yang jujur — beserta dampak angkanya, lalu BERHENTI. Jangan mengubah dasar
    pengakuan pendapatan atas inisiatif sendiri.

V4 · Pengakuan ilustrasi menjamin lebih dari yang dapat dijamin  [P0 — murah, penting]
    Pita di tab roll-forward diakhiri: *"Kolom diakui/ditagih per engagement adalah
    data nyata."* Setelah V1 dan V2 kamu periksa, kamu akan tahu bahwa "ditagih" tidak
    nyata (register beku) dan "diakui" hanya senyata nilai kontraknya.
    Kerjakan: setelah V1 dan V2 selesai, kalimat itu menjadi benar — pastikan begitu.
    Bila ada bagian yang tetap tidak dapat dibuat nyata di PR ini, PERSEMPIT
    kalimatnya sehingga ia hanya menjamin apa yang benar-benar dijamin.

V5 · Baris tabel adalah kontrol palsu  [P1]
    `<tr … onClick={() => setSel(...)} style={{ cursor:'pointer' }}>` di tab Pengakuan
    Pendapatan. Tidak fokusabel, tidak menanggapi Enter/Space — memilih engagement
    untuk melihat rinciannya mustahil tanpa tetikus.
    Perbaiki dengan kontrol native di dalam baris; beri cincin fokus yang terlihat.
    Pola yang sama sedang dibereskan di modul lain (`orgchart`, `succession`) — kalau
    salah satunya sudah mendarat, ikuti polanya.

V6 · Nol ekspor dan nol gerbang akses  [LAPORKAN — jangan kerjakan tanpa keputusan]
    `grep -c "amsExport" view_firmrevenue.tsx` → 0; `grep -c "CAP\.\|can("` → 0.
    Pendapatan firma, backlog, dan daftar penagihan adalah data komersial firma; modul
    ini terbuka untuk setiap peran yang dapat mencapainya, dan tidak ada satu pun
    kertas kerja yang dapat dikeluarkan darinya.
    Keduanya keputusan Ari (kebijakan akses; dan apakah ekspor pendapatan tunduk
    gerbang Q-2 seperti Neraca Saldo). LAPORKAN dengan rekomendasimu, JANGAN kerjakan.

GERBANG YANG HARUS KAMU TULIS (modul ini punya NOL uji hari ini)
Ekstrak derivasi murni (jadwal pengakuan, aset/liabilitas kontrak, dunning) ke berkas
.ts murni dengan ekspor bernama; perilaku tidak berubah. Berkas uji .ts WAJIB bebas
`any`.
  a. Menandai sebuah faktur lunas / menerbitkan faktur baru di register `invoices`
     MENGUBAH `billed`, aset kontrak, dan daftar dunning modul ini. (Merah sebelum V1.)
  b. Modul ini dan modul `billing` melaporkan nilai tertagih yang SAMA untuk keadaan
     register yang sama. (Merah sebelum V1; tidak bisa dipuaskan dengan menyalin.)
  c. Engagement yang kliennya tidak punya nilai kontrak TIDAK menghasilkan pendapatan
     diakui berbasis materialitas — ia menghasilkan keadaan "tak dapat dihitung".
     Uji ini WAJIB membangun keadaan itu sendiri (klien tanpa fee), karena data hari
     ini tidak memicunya. (Merah sebelum V2.)
  d. Jumlah aset kontrak seluruh engagement == selisih diakui−ditagih yang positif,
     dan liabilitas == selisih sebaliknya — gerbang arah, bukan gerbang nilai.
  e. Gerbang sumber: nol pembacaan `AMS.INVOICES` langsung di view_firmrevenue.tsx,
     dan nol `<tr onClick>` — buang komentar dulu sebelum memindai (pola helper
     `kode()` di cockpit_conventions.test.ts).

LANGKAH
1. INVESTIGASI — konfirmasi V1, V2, V3, V5 di HEAD sekarang; tempelkan bukti barisnya.
   Untuk V2, jalankan sendiri pemeriksaan apakah fallback terpicu oleh data sekarang
   dan laporkan angkanya. Periksa juga status prompt 29-apar: apakah pola membaca
   register hidup sudah ada di repo.
2. RENCANA — termasuk usulan V3 dan rekomendasi V6. Untuk V3: usulan, lalu BERHENTI.
3. GERBANG MERAH — jalankan uji baru; tempelkan output merahnya.
4. IMPLEMENTASI — V1, V2, V4, V5. V3 dan V6 hanya usulan/laporan.
5. VERIFIKASI — `npm run verify` dari root; tempelkan output. Bila angka pendapatan
   bergeser setelah V1, jelaskan pergeserannya sebagai KOREKSI dengan angka per
   engagement — jangan menyebutnya regresi dan jangan mengembalikannya.
6. LAPORAN — sebelum→sesudah bagi pengguna · uji merah→hijau · hasil pemeriksaan
   dormansi V2 · usulan V3 (dengan dampak angka) · rekomendasi V6 · yang TIDAK
   dikerjakan + alasannya · asumsi (seharusnya nol).

BATAS
- ⛔ JANGAN mengerjakan PR-5 selain pencabutan fallback `materiality × 0,4`. Jembatan
  pendapatan ke `4-100`, akun liabilitas kontrak, dan roll-forward berbasis ledger
  adalah arc tersendiri yang sudah disetujui dan bergantung pada PR-2.
- ⛔ JANGAN menghapus atau melunakkan pita pengakuan ilustrasi. Mengganti angka
  ilustratif dengan angka lain yang juga tidak berbasis ledger, lalu menghapus
  pengakuannya, adalah kemunduran — bukan perbaikan.
- ⛔ JANGAN mengubah dasar pengakuan pendapatan (V3) tanpa keputusan.
- JANGAN memperbaiki seluruh pembaca `AMS.INVOICES` di repo — laporkan saja.
- JANGAN menambah ekspor atau gerbang akses tanpa keputusan (V6).
- JANGAN menambah dependensi.

SELESAI berarti SEMUA ini benar:
[ ] Ada uji yang GAGAL sebelum perubahan dan HIJAU sesudahnya — outputnya ditempelkan.
[ ] `npm run verify` hijau dari root; pergeseran angka dijelaskan sebagai koreksi.
[ ] "Ditagih" dan seluruh turunannya mengikuti register faktur yang hidup.
[ ] Modul ini dan Billing melaporkan nilai tertagih yang sama.
[ ] Tidak ada nilai kontrak yang diturunkan dari materialitas; ketiadaannya dinyatakan.
[ ] Kalimat "kolom diakui/ditagih adalah data nyata" benar — atau dipersempit sampai
    benar.
[ ] Memilih engagement dapat dilakukan penuh dengan papan-ketik.
[ ] Pita pengakuan ilustrasi masih ada.
[ ] Usulan V3 tertulis dan TIDAK diimplementasikan; V6 dilaporkan, tidak dikerjakan.
[ ] Berkas uji bebas `any`; tidak ada `:any` baru tanpa sinkronisasi baseline.
[ ] Laporan menyebut secara eksplisit apa yang TIDAK dikerjakan.
```
