# Usulan SPR · Materialitas untuk perikatan reviu — dua angka untuk satu klien

> **Status: MENUNGGU KEPUTUSAN ARI.** Berkas ini sengaja TIDAK diawali `prd-`
> agar tidak masuk registri status PRD (`docs/PRD-REGISTRY.md`).
>
> Konteks: PR "spr2400 berhenti mengarang fakta perikatan". Modul `spr2400`
> kini menarik materialitas dari catatan, bukan mengetiknya. Yang TIDAK
> diputuskan PR itu: **angka mana yang benar.**

---

## 1. Premis prompt yang saya CABUT

Prompt tugas menyatakan:

> `AMS.REVIEW_2400` TIDAK punya field materialitas sama sekali … Artinya
> 900/675 tidak punya sumber di repo ini.

**Setengahnya benar, kesimpulannya salah.** `AMS.REVIEW_2400` memang tak punya
field materialitas — tapi `AMS.REVIEW_2400_PLAN` punya, dan isinya PERSIS
ketiga angka yang dikira karangan:

```
grep -n "materiality" migration/src/data_part3.ts
```

```js
/* data_part3.ts:474-475 — Reviu SPR 2400 — planning addendum */
const REVIEW_2400_PLAN = {
  materiality: 900_000_000, benchmark: '1% dari pendapatan', pm: 675_000_000,
  ...
```

Ketiganya sudah dirender modul `review2400` sebagai "Materialitas Reviu" /
"Materialitas Pelaksanaan" (`view_nonaudit.tsx:159-160`).

Jadi `900` / `1% pendapatan` / `675` di `view_spr2400.tsx` **bukan angka tanpa
sumber — itu SALINAN PRIVAT dari data kanonik.** Kelas cacatnya berbeda, dan
lebih berbahaya daripada yang diduga: bukan "angka karangan yang akan dicabut",
melainkan angka yang akan **membusuk diam-diam** begitu rencana reviu berubah,
sementara dua modul menampilkan angka berbeda untuk perikatan yang sama.

PR ini sudah menutup itu: `spr2400` kini membaca `AMS.REVIEW_2400_PLAN`.
Prompt meminta angkanya dicabut; saya justru **menyambungkannya ke sumber yang
sah**, karena sumber itu ada dan terikat ke perikatan reviu ini. `pm/materiality`
= 675/900 = **75%**, konsisten dengan label "75% dari materialitas" di
`view_nonaudit.tsx:160`.

---

## 2. Yang TETAP menjadi keputusan Ari

Ada **dua angka materialitas** untuk klien PT Cahaya Logistik Nusantara:

| Sumber | Nilai | Tolok ukur | Lokasi |
|---|---|---|---|
| `REVIEW_2400_PLAN.materiality` | **900.000.000** | 1% dari pendapatan | `data_part3.ts:475` |
| `ENGAGEMENTS['ENG-2025-022'].materiality` | **1.400.000.000** | tidak dinyatakan | `data_part1.ts:65` |

Selisihnya **500 jt (56%)**. Keduanya mengacu ke klien `C-022` yang sama,
standar SPR 2400 yang sama, rekan & manajer yang sama, tenggat yang sama —
tetapi tersimpan di dua register yang tidak saling tahu (lihat
`usulan-SPR-kepemilikan-perikatan-reviu.md` §2.1).

Yang mana yang mengikat, dan bagaimana yang satunya diperlakukan, adalah
**keputusan metodologi + data**, bukan keputusan teknis. Saya tidak memilih.

### 2.1 Mengapa `useMateriality()` bukan jalan keluarnya

Ini perlu dicatat karena tampak seperti perbaikan yang benar:

`useMateriality()` (`contexts.tsx:244-268`) membaca
`useFirm().activeEngagement` — perikatan **AUDIT** aktif (bawaan seed:
`ENG-2025-014` · PT Sentosa Makmur Tbk). Menyambungkannya ke panel reviu akan
menampilkan materialitas **entitas yang berbeda** di bawah judul reviu PT
Cahaya Logistik — kebohongan baru yang jauh lebih sulit terlihat daripada
literal `900`. Hook itu tidak menerima parameter perikatan, jadi ia tidak bisa
dipakai untuk perikatan selain yang aktif.

Memanggil `materialityFor()` langsung juga tertutup: gerbang
`materiality_single_door.test.ts` hanya mengizinkan `canon_selectors.ts` dan
`contexts.tsx`.

Gerbang `spr2400_conventions.test.ts` memaku kedua larangan itu (S1) supaya
"perbaikan" ini tak masuk diam-diam di kemudian hari.

---

## 3. Opsi

### Opsi 1 — `REVIEW_2400_PLAN` yang mengikat; `ENGAGEMENTS.materiality` dianggap tidak berlaku untuk perikatan reviu

- **Untung:** nol perubahan data; angka yang tampil hari ini (900/675) tetap;
  tolok ukur "1% dari pendapatan" eksplisit dan sesuai sifat reviu.
- **Rugi:** field `materiality` pada `ENG-2025-022` menjadi angka yatim yang
  tetap dibaca konsumen lain tanpa sadar. Perlu dicek: siapa yang membaca
  `ENGAGEMENTS[...].materiality` untuk perikatan non-audit.
- **Tindakan:** sensus konsumen, lalu kosongkan/tandai field itu untuk
  perikatan bertipe reviu.

### Opsi 2 — `ENGAGEMENTS.materiality` (1.400 jt) yang mengikat; `REVIEW_2400_PLAN` menyesuaikan

- **Untung:** satu field materialitas untuk semua jenis perikatan; ia juga
  punya WTB (`ENG_022`, `data_wtb_eng.ts:137`) sehingga tolok ukur bisa
  DITURUNKAN, bukan dinyatakan.
- **Rugi:** mengubah angka yang tampil hari ini di `review2400`; `pm` harus
  ikut dihitung ulang (75% × 1.400 = 1.050 jt).
- **Catatan:** 1% dari pendapatan → 1.400 jt menyiratkan pendapatan 140 M.
  **Saya belum memverifikasi apakah WTB `ENG_022` mendukung angka itu** — kalau
  opsi ini dipilih, verifikasi tie-out wajib dilakukan lebih dulu.

### Opsi 3 — turunkan dari WTB lewat mesin, seperti perikatan audit

Pakai jalur yang sama dengan SA 320 (`engagementBenchmarks(wtb)` +
`materialityFor`), diperluas agar bisa menerima perikatan selain yang aktif.

- **Untung:** satu mesin untuk semua perikatan; angka berhenti dinyatakan
  tangan; tolok ukur terfalsifikasi terhadap neraca saldo.
- **Rugi:** perubahan pada `useMateriality()`/`canon_selectors.ts` = menyentuh
  jalur yang dipakai ~8 view lain. PR tersendiri, berisiko sedang.
- **Prasyarat:** U-1 dijawab dulu (kalau `spr2400` tetap lapisan standar, ia
  tak butuh mesin — cukup membaca rekaman).

### Opsi 4 — tetap tanpa angka di `spr2400`

Panel hanya menjelaskan konsep materialitas dalam reviu (¶43–44) dengan nav ke
tempat angkanya hidup.

- **Untung:** nol risiko salah angka.
- **Rugi:** membuang informasi yang sah dan sudah terikat; pengguna harus
  berpindah modul untuk melihat angka yang relevan dengan bacaannya.
- **Catatan:** ini yang diminta prompt, tetapi prompt menulisnya dengan premis
  bahwa angkanya tak bersumber. Premis itu salah (§1).

**Rekomendasi saya: Opsi 1 sekarang, Opsi 3 nanti bila U-1 = Opsi B/C.**
Alasannya: Opsi 1 nol-risiko dan langsung konsisten antar-modul; Opsi 3 benar
secara arsitektur tetapi tak berguna selama `spr2400` hanya membaca rekaman.

---

## 4. Yang saya butuhkan dari Ari

1. Angka mana yang mengikat untuk perikatan reviu C-022: **900 jt** atau
   **1.400 jt**?
2. Untuk perikatan reviu secara umum — apakah materialitas ditetapkan sebagai
   kebijakan (seperti `REVIEW_2400_PLAN` sekarang) atau diturunkan dari WTB
   seperti audit?
3. Bila (2) = kebijakan: apakah `pm` tetap 75% dari materialitas untuk reviu,
   atau ada persentase tersendiri? (75% saat ini implisit dari 675/900 dan
   dinyatakan sebagai label di `view_nonaudit.tsx:160`, tetapi tidak pernah
   dihitung — ia dua angka independen yang kebetulan konsisten.)

**Saya tidak mengarang jawabannya.** Sampai dijawab, `spr2400` menampilkan
`REVIEW_2400_PLAN` apa adanya dan menyatakan secara eksplisit bahwa itu
**rencana reviu yang tercatat**, bukan materialitas perikatan audit mana pun.
