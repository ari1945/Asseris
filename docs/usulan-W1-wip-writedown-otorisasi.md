# Usulan W1 — write-down WIP: efek dulu, atau otorisasi dulu?

> Status: **USULAN — menunggu keputusan Ari. Belum dikerjakan.**
> Dibuat 2026-08-21 menjawab W1 di [`prompts-perbaikan/11-wip.md`](prompts-perbaikan/11-wip.md).
> Bukan PRD (nama berkas sengaja tak berawalan `prd` agar tak masuk registri status §7).
> W2 · W3 · W4 dari prompt yang sama SUDAH dikerjakan; keduanya prasyarat W1 dan
> tidak menunggu keputusan ini.

## Cacat yang terverifikasi

`view_wip.tsx` menulis `wip.adj`; nilai itu dikonsumsi `FIRMFIN.wip` lewat `useFirmWip`,
sehingga angka WIP **turun seketika** di modul WIP, Dashboard, kokpit Beranda, Firm
Finance, dan ekspor tersegel. Pada saat yang sama layar berkata:

> "*N* write-down manual ≥ Rp *X* jt **menunggu otorisasi** Audit Manager → Managing Partner."
> — [view_wip.tsx:181](../migration/src/view_wip.tsx), senada [view_wip_parts.tsx:148](../migration/src/view_wip_parts.tsx)

Antrean itu **diturunkan dari** `wip.adj` ([data_platform.ts:277](../migration/src/data_platform.ts)):
ia melaporkan yang sudah terjadi, bukan menahan yang belum. Dan `decide('reject')`
([view_platform.tsx:184](../migration/src/view_platform.tsx)) hanya menulis overlay —
jalur tulis-balik ke modul sumber **hanya ada untuk AJE** (`d.writesBack &&
d.sourceModule === 'aje'`, baris 177). Penolakan Managing Partner karena itu
meninggalkan write-down tetap berlaku: antrean berkata "ditolak", laporan keuangan
firma tetap turun. Uji karantina `it.fails()` di
[`wip_writedown_authority.test.ts`](../migration/src/wip_writedown_authority.test.ts)
menjalankan persis skenario itu.

## Opsi A — menahan efek (`wip.adj` membawa status)

`FIRMFIN.wip` hanya mengonsumsi entri yang sudah **berlaku**; entri ≥ ambang berstatus
`pending` sampai rantai tuntas.

- **Konsumen hilir** (Dashboard · kokpit · Firm Finance · ekspor): tak bergerak sampai
  otorisasi. Ini jawaban yang konsisten dengan aturan "uang memblokir", dan **teks UI
  yang sekarang menjadi benar tanpa diubah satu kata pun**.
- **Ekspor tersegel:** tak pernah memuat penurunan nilai yang belum diotorisasi. Ini
  keunggulan terkuat A — segel adalah artefak yang keluar dari firma.
- **Data `wip.adj` lama:** entri yang sudah ada tak punya status. Default WAJIB
  `berlaku`, bukan `pending` — memilih `pending` akan **menaikkan** angka WIP semua
  orang secara diam-diam pada saat deploy, yaitu restatement tanpa jurnal.
- **Uji `firm_wip.test.ts`:** TIDAK tersentuh. Argumen `adjByEng` pada `FIRMFIN.wip`
  tetap berarti "write-down yang berlaku"; penyaring status hidup satu lapis di atasnya
  (`wipAdjAmounts` / `useFirmWip`). Kontrak mesin tak berubah.
- **Biaya nyata — dan ini bukan detail:** hari ini satu perikatan = satu entri
  **kumulatif**. Begitu status masuk, penambahan yang mendorong total melewati ambang
  memaksa pertanyaan "yang ditahan yang mana": seluruh saldo, atau selisihnya saja.
  Jawaban yang benar (selisihnya) mengubah `wip.adj` menjadi **daftar tindakan per
  perikatan**, bukan satu angka — lihat Pertanyaan Terbuka 1.
- **Biaya UI:** modul WIP harus menampilkan saldo tertahan. Tanpa itu ia berbohong ke
  arah sebaliknya: pengguna menekan Write-down dan tak melihat apa pun berubah.
- Write-down **di bawah ambang** tidak pernah masuk antrean, jadi ia harus berlaku
  seketika. Ini aturan yang harus dinyatakan, bukan diasumsikan.

## Opsi B — efek segera + pembatalan

Tambahkan jalur tulis-balik seperti AJE; `decide('reject')` menghapus entri.

- Menuntut **tulisan kedua lintas-dokumen**: keputusan ada di `approvals_ov_v4`,
  pembatalannya harus menulis `wip.adj`. Header [`aje_approval.ts`](../migration/src/aje_approval.ts)
  sudah mencatat mengapa itu tak dapat dijamin (tulisan kedua bisa gagal, offline, atau
  kalah CAS) dan menyelesaikannya dengan pembatalan yang **diturunkan**, bukan ditulis.
  B mengembalikan kelas cacat yang sudah ditutup di sana.
- Penulisan `wip.adj` di-gate `FIRMFIN_EDIT` ([rbac.ts:181](../migration/src/rbac.ts)).
  Seorang penyetuju yang menolak tetapi tak memegang cap itu gagal **senyap** —
  `flush()` di contexts.tsx hanya menangani konflik; FORBIDDEN jatuh ke cabang "offline".
- Ekspor tersegel dapat memuat write-down yang kemudian ditolak. Segelnya jujur
  terhadap detiknya, tetapi firma memegang artefak tersegel berisi penurunan nilai
  yang tak pernah diotorisasi.
- Teks UI di dua tempat **harus diubah** supaya jujur bahwa efeknya sudah berjalan.
- Yang lebih murah: tak ada perubahan bentuk data, tak ada UI saldo tertahan.

## Rekomendasi

**Opsi A.** Alasannya bukan kerapian melainkan satu fakta: yang keluar dari firma adalah
ekspor tersegel, dan B menerima kemungkinan artefak tersegel memuat penurunan nilai yang
ditolak. Ditambah bahwa B bergantung pada tulisan kedua yang tak dapat dijamin — masalah
yang repo ini sudah pernah pecahkan sekali dan memilih untuk tidak diulang.

Biaya A terkonsentrasi pada perubahan bentuk `wip.adj` — dan **jendelanya sekarang**:
W2 baru saja mengubah bentuk dokumen itu (angka telanjang → entri teratribusi), jadi
menambahkan status pada jendela yang sama berarti nol migrasi tambahan.

## Pertanyaan terbuka (butuh jawaban sebelum implementasi)

1. **Satuan yang ditahan.** Rekomendasi: setiap tindakan write-down menjadi record
   sendiri (`{ amount, by, byRole, at, status }[]` per perikatan), dan jumlah efektif =
   penjumlahan record berstatus berlaku. Setuju?
2. **Ambang.** `WIP_WRITEOFF_APPROVAL_MIN` (Rp 100 jt) dievaluasi terhadap **total
   kumulatif** perikatan. Apakah tindakan Rp 20 jt ke-enam pada perikatan yang totalnya
   menembus ambang ikut ditahan, atau hanya tindakan yang nilainya sendiri ≥ ambang?
3. **Kadaluwarsa.** Entri `pending` yang tak pernah diputuskan: menggantung selamanya,
   atau gugur setelah jendela SLA (48 jam, lihat W4)?

---

Yang **tidak** diusulkan di sini dan tetap terbuka: `logActivity` pada write-down masih
menulis jejak **lokal**, bukan rantai audit server ([contexts.tsx](../migration/src/contexts.tsx)).
Itu cakupan seluruh aplikasi dan sudah dinyatakan butuh PRD tersendiri (Program C, E-9).
