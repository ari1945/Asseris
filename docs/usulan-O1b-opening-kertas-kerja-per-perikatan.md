# Usulan O1b — saldo awal: dari pustaka saran menjadi kertas kerja per-perikatan

> Status: **USULAN — menunggu keputusan Ari. Belum dikerjakan.**
> Dibuat 2026-08-23 menjawab O1(b) di [`prompts-perbaikan/75-opening.md`](prompts-perbaikan/75-opening.md).
> Bukan PRD (nama berkas sengaja tak berawalan `prd` agar tak masuk registri status §7).
> O1(a) · O2 · O3 · O4 dari prompt yang sama **sudah dikerjakan** dan tidak menunggu
> keputusan ini.

## Apa yang sudah berubah (dasar usulan ini)

Tab **Prosedur** dan **Konsistensi Kebijakan** tidak lagi menyatakan hasil apa pun.
Yang tersisa: pustaka prosedur yang disarankan (`OB_PROC_LIBRARY`) dan daftar area
kebijakan yang wajib dibandingkan (`OB_POLICY_AREAS`) — keduanya templat, identik untuk
setiap perikatan, dan **jujur mengatakan demikian**. Kolom "Hasil", kolom "Bukti
Diperoleh" dengan nama dokumen bertanggal, dan flag "Konsisten" dicabut.

Konsekuensinya: **pekerjaan nyata atas kelima akun itu kini tidak punya rumah.** Auditor
bisa membaca prosedur yang disarankan, lalu harus mendokumentasikan pelaksanaannya di
tempat lain (lead schedule di modul Working Papers, atau blok kertas kerja SA 510 yang
baru terpasang di tab Kesimpulan & Opini). Itu benar tetapi tidak nyaman. Usulan ini
menutup jarak tersebut.

## Yang sudah tersedia dan TIDAK perlu dibangun

| Kebutuhan | Sudah ada |
|---|---|
| Persistensi per-perikatan | `useAmsPersist('opening.v1', defaultOB)` — `OBState`, sudah dipakai untuk `factors`, `predSteps`, `predName`, `safeguards`, `conclusion` |
| Rantai tanda tangan + pelaku + tanggal | `WpPanel moduleId="opening"` (baru terdaftar di `WP_MODULE_MAP`) — sign-off preparer/reviewer/partner dengan otorisasi RBAC, gerbang etik, dan jejak audit |
| Bukti audit terlampir | `WpEvidenceLink` / `useWpEvidence` (bagian dari `WpPanel`); bukti wajib SA 510 sudah didaftarkan pada entri `opening` |
| Kesimpulan auditor per-modul | `WpConclusion` (SA 230) — taksonomi `WP_DISPOSITIONS` |
| Kesimpulan yang tersegel ke memo | `OBState.conclusion` → `OpeningMemoInput.conclusion` (kabelnya baru disambung: sebelumnya field ini tak punya kontrol pengisi sama sekali) |
| Gerbang kelengkapan & fase | `wpCompletenessFor` · `PHASE_OF_MODULE['opening'] = 'Eksekusi'` |

Artinya: yang benar-benar perlu diputuskan hanyalah **granularitas** — apakah SA 510
butuh dokumentasi per-AKUN, atau cukup satu kertas kerja tingkat-modul.

## Opsi A — cukup tingkat-modul (nol pembangunan baru)

Tidak ada state baru. Auditor mendokumentasikan pelaksanaan, bukti, dan kesimpulan
saldo awal pada `WpPanel moduleId="opening"` yang sudah terpasang; pustaka prosedur
tetap menjadi daftar periksa yang dibaca, bukan diisi.

- **Untung:** nol kode baru, nol penyebut gerbang baru, nol risiko. Konsisten dengan
  ~40 modul lain yang memakai pola yang sama.
- **Rugi:** satu kotak kesimpulan untuk lima akun. Reviewer tak bisa melihat akun mana
  yang sudah tuntas dan mana yang belum; tak ada tautan bukti per-akun.
- **Cocok bila:** SA 510 pada praktik KAP ini memang diselesaikan sebagai satu memo,
  dan pekerjaan per-akun sudah terdokumentasi di lead schedule masing-masing (C, B, E,
  F, H) di modul Working Papers.

## Opsi B — kertas kerja per-akun di dalam `opening.v1`

`OBState` bertambah satu peta:

```ts
interface OBProcEntry {
  status: 'belum' | 'berjalan' | 'selesai' | 'tidak-relevan';
  evidence: string;        // deskripsi bukti YANG DIPEROLEH — diketik auditor
  concl: string;           // kesimpulan auditor atas akun ini
  by: string;              // pelaku (auth.user.name saat menekan simpan)
  at: string;              // stempel dari klok SSOT — BUKAN new Date()
}
// OBState.procs: Record<string, OBProcEntry>   // kunci = OB_PROC_LIBRARY[].id
```

Auditor juga boleh **menambah baris** di luar kelima akun pustaka (akun signifikan
berbeda per klien) dan **menandai tidak-relevan** baris pustaka yang tak berlaku.

- **Untung:** ringkasan "N dari M akun signifikan selesai" menjadi angka yang benar;
  reviewer melihat lubangnya; bukti tertaut per-akun.
- **Rugi:** state kedua yang berdampingan dengan rantai `wp_signoff` — dua tempat
  mencatat "siapa dan kapan". Risiko yang sama yang melahirkan cacat aslinya.
- **Syarat mutlak bila dipilih:**
  1. `by`/`at` **wajib** dari sesi dan dari klok SSOT (`nowStamp`), bukan konstanta
     modul dan bukan `new Date()` — lihat arc klok SSOT (#281).
  2. Menulis entri **wajib** digerbangi `CAP.WP_EDIT`; menandai `selesai` sebaiknya
     digerbangi peran penelaah, bukan penyusun.
  3. Baris berstatus `selesai` **tidak boleh** membuat badge hijau di tempat lain
     kecuali rantai sign-off modul juga tuntas — jangan menghidupkan kembali "hijau
     tanpa penanda tangan".

## Pertanyaan yang harus dijawab sebelum membangun (Opsi B)

1. **Apakah isian per-akun masuk memo TERSEGEL?**
   Saat ini `OpeningMemoInput` **tidak punya kanal** untuk itu, dan batas tersebut
   dijaga uji (`opening_conventions.test.ts`). Memasukkannya berarti menambah kanal
   baru ke artefak yang keluar dari firma. Rekomendasi: **ya, tapi hanya kolom
   `status` + `concl`** — deskripsi bukti biarkan di layar, karena teks bebas yang
   tersegel sulit ditarik kembali.
2. **Bila auditor menandai lima-limanya `selesai` sementara tie-out belum punya sumber
   TA-1, apa yang dikatakan kepala halaman?** Badge `obVerdict` yang sekarang tetap
   berkata "Belum Dapat Disimpulkan" — dan itu benar. Pastikan Opsi B tidak
   memperkenalkan hijau kedua yang berbicara lebih keras.
3. **Apakah baris pustaka boleh dihapus, atau hanya ditandai tidak-relevan?**
   Menghapus menghilangkan jejak bahwa akun itu pernah dipertimbangkan.

## Rekomendasi

**Opsi A sekarang; Opsi B hanya bila reviewer benar-benar meminta rincian per-akun.**
Alasannya bukan kemalasan: cacat yang baru saja ditutup lahir persis dari satu modul
yang membangun catatan pelaksanaan sendiri, terpisah dari rantai kertas kerja kanonik.
Menambah `OBState.procs` mengulang bentuk itu — kali ini dengan data nyata, tetapi tetap
dengan dua tempat yang mencatat "siapa mengerjakan apa". Bila rincian per-akun memang
dibutuhkan, arah yang lebih sehat adalah **memperluas `wp_signoff` agar mendukung
sub-referensi** (mis. `opening/C`, `opening/B`) sehingga seluruh aplikasi memakai satu
mekanisme — itu pekerjaan lintas-modul dan butuh PRD tersendiri, bukan tambalan di
`view_opening.tsx`.

## Keputusan

- [ ] Opsi A — tidak ada yang dibangun; tutup usulan ini.
- [ ] Opsi B — bangun `OBState.procs` dengan tiga syarat mutlak di atas.
- [ ] Opsi C — PRD terpisah: sub-referensi pada `wp_signoff`, berlaku untuk semua modul.
