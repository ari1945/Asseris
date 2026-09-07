---
name: asseris-w0-4-regref-premis-urutan-salah
description: "W0-4 (#322) — premis urutan W0 SALAH (CPE_REQ tak pernah jadi multi-record); katalog auto-merge BERSIH ke arah yang salah dan menghapus set kurs"
metadata: 
  node_type: memory
  type: project
  originSessionId: 1da77137-1746-4bbd-a566-441db42c1dba
  modified: 2026-08-27T22:31:45.049Z
---

**W0-4 MENDARAT: PR #322 squash-merge `244f87f` (2026-08-27).** 9/9 cek CI hijau;
ke-28 blob TERBUKTI identik di master; cabang remote+lokal+worktree sudah dihapus.
**Gelombang W0 TUNTAS**: #318 · #319 · #320 · #321 · #322.
Lihat [[asseris-w0-pendaratan-urutan]] · [[asseris-w0-2-smm-ratchet-dua-arah]].

## 1 · Premis urutan W0 itu SALAH — koreksi yang harus dibawa

`W0-00-PENDARATAN.md` §2 dan `W0-4-regref.md` sama-sama menyatakan: R1 mengubah
`CPE_REQ` dari satu-record menjadi **multi-record**, sehingga `(A.CPE_REQ || {}).year`
menjadi `undefined` di tiga view SMM tanpa satu gerbang pun memerah — dan itulah yang
mengunci urutan smm→regref.

**Tidak benar.** R1 mempertahankan bentuk yang sama persis —
`{ annual, structured, unstructuredCap, year }` — dan hanya mengubah ASALNYA dari
diketik menjadi diturunkan (`pplReqOn(SEED_TODAY)` / `pplYearOf(SEED_TODAY)`).
`year` tetap `number`. Sensus pembaca: **tiga** (definisi `data_part1.ts`, pipa
re-export `data.ts`, `view_bo3.tsx:546` yang membaca `.year`) — nol menerima `undefined`.

#320 tetap layak mendarat atas alasannya sendiri (tahun kewajiban PPL memang bukan
tahun atestasi mutu firma), tetapi ia **bukan prasyarat teknis**. Pelajarannya sama
dengan pelajaran lama repo ini: **verifikasi premis dokumen sendiri sebelum
mewarisinya** — bandingkan [[asseris-w0-2-smm-ratchet-dua-arah]] §3, di mana catatan
"cabang ini mencabut getFullYear" juga salah.

## 2 · Auto-merge BERSIH ke arah yang salah — kelas paling berbahaya

`regref_catalog.ts`: merge-base **5** set · master **6** (#283 menambah `kurs`) ·
cabang **9** (5+4, TANPA kurs). Peta W0 menulis "6 → 9". Hasil yang BENAR: **10**.

Mengambil versi cabang utuh akan **MENGHAPUS `kurs`** — registry yang menggerakkan
revaluasi valas yang DIBUKUKAN ke GL 5-600. Ia tak akan tampak sebagai konflik pada
`REGREF_EXPECTED_IDS` bila kebetulan auto-merge; hitung SET-nya, jangan percaya
hitungan di dokumen.

Gerbang SC-A9 (katalog ↔ sensus saling menutup) langsung memerah atas ketiadaan `kurs`
di sensus. Tutup dengan entri sensus, JANGAN melonggarkan gerbang.

## 3 · Cacat bisa PINDAH RUMAH di antara dua PR

`P2_MIN_RATE = 15` (R4, GloBE) ada di `view_newdisc.tsx` — berkas cabang — ketika
cabang ditulis. **#321 memindahkannya lebih dulu** ke `newdisc_derive.ts`, yang bukan
berkas cabang. Konsekuensinya berlapis:

- Gerbang sensus cabang menemukannya di rumah baru (detektor `CONST_VOCAB` menangkap
  `RATE`) — dua situs: `P2_MIN_RATE` dan `P2_THRESHOLD_EUR`.
- **Gerbang SC-A8 cabang sendiri menunjuk rumah LAMA** dan memerah. Gerbang ikut pindah,
  dan sekarang menjaga KEDUA berkas.
- KEPUTUSAN ARI: ikuti cacatnya ke rumah barunya (berkas ke-29), satu baris
  `globeMinRateRequired(ASOF_DATE)` — pola yang sudah dipakai `canon_base.ts` untuk R3.
  `P2_THRESHOLD_EUR` sengaja tetap literal, alasannya di `pending` entri sensus.

Alternatif yang DITOLAK: mendeklarasikan literal sebagai "salinan diketahui" membuat
katalog mengklaim cakupan yang konsumennya tak pakai; mencabut `globe-min` justru
menyentuh LEBIH banyak berkas sambil membuang temuan keempat cabang.

## 4 · Sisi cabang yang WAJIB ditolak (kalau tidak: regresi senyap)

- `P2_JURIS` (tabel ETR per yurisdiksi) — **karangan**, dicabut #321. Sisi cabang
  mengembalikannya. `view_newdisc.tsx` akhirnya **identik byte-per-byte dengan master**.
- `SF` — #321 memindahkannya ke `supplierFinance()`.
- `rotTier` inline di `data_licensing.ts` — #276 memindahkannya ke `canon_rotation.ts`
  (modul LEAF; `indep_approval.ts` dibaca JUGA server, `data_licensing` mengimpor
  `./data` yang menyentuh `window`). Refinement cabang (`'tak-dinilai'`) dipindah ke
  rumah baru, bukan menghidupkan rumah lama.
- `const toggle = …` — **kode mati**, nol pemakai, master sudah membuangnya.
- `data as any` pada spanduk rotasi — master sudah bertipe (`rows: IndepRow[]`, #319).

## 5 · `prd_registry` gate: HITUNG ULANG pakai parser gerbangnya

`| In Progress | 12 |` vs terhitung 13 — resolusi merge memilih baris ringkasan master
sementara cabang menambah satu PRD. Hitungan tangan saya sempat beda (110 vs 111 baris)
karena regex saya menuntut `.md`; **jalankan gerbangnya dan baca angkanya**, jangan
menghitung sendiri.

## 6 · Cacat yang DILAPORKAN, tidak dikerjakan (larangan lingkup)

`regref_census` mendeteksi konstanta lewat KOSAKATA NAMA
(`/RATE|TARIF|PTKP|BATAS|AMBANG|THRESHOLD|IURAN|DENDA|PPH|PPN|PAJAK|TAX|SKP|ROTAT|COOLOFF|LIMIT|_TER|_REQ|_CAP/i`).
Konstanta regulatori yang namanya di luar kosakata itu lolos tanpa gejala — kelas yang
sama persis dengan yang PR ini tutup, satu lapis lebih dalam. Layak jadi prompt sendiri.
