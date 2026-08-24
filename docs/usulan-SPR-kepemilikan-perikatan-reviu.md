# Usulan SPR · Siapa yang memiliki perikatan reviu — `spr2400` atau `review2400`?

> **Status: MENUNGGU KEPUTUSAN ARI.** Tidak ada pekerjaan lanjutan yang dimulai
> sampai U-1 dijawab. Berkas ini sengaja TIDAK diawali `prd-` agar tidak masuk
> registri status PRD (`docs/PRD-REGISTRY.md`).
>
> Konteks: dikerjakan bersama PR "spr2400 berhenti mengarang fakta perikatan"
> (gerbang `migration/src/spr2400_conventions.test.ts`). PR itu menaikkan
> `spr2400` dari L1 ke sekitar L3 — semua angka & identitas kini turunan, dan
> pertanyaan L4 sengaja DITANGGUHKAN ke berkas ini.

---

## 1. Pertanyaan yang harus dijawab

**Apakah `spr2400` tetap menjadi lapisan metodologi/standar (dengan angka
perikatan hidup di `review2400`), atau ia yang menjadi kertas kerja dan
`review2400` yang menyusut?**

Jawaban menentukan apakah `spr2400` pantas naik ke L4 (persist · sign-off ·
ekspor tersegel) atau memang seharusnya berhenti di L3.

---

## 2. Fakta yang sudah diverifikasi

Semua diverifikasi terhadap `origin/master` `6e82d42`.

| Fakta | Bukti |
|---|---|
| `review2400` (#40, "Reviu LK (SPR 2400)") sudah ada dan HIDUP | `migration/src/view_nonaudit.tsx:122` `function Review2400()` |
| `review2400` punya persist | `view_nonaudit.tsx:126-127` — `useAmsPersist('review2400inq', …)` · `useAmsPersist('review2400concl', …)` |
| `review2400` menghitung progres dari data, bukan literal | `view_nonaudit.tsx:130-133` — `flagged` · `inqDone` · `ready` |
| `review2400` mengonsumsi `AMS.REVIEW_2400` **dan** `AMS.REVIEW_2400_PLAN` | `view_nonaudit.tsx:125` dan `:156` |
| `RELATED_SA['review2400']` menunjuk `spr2400` sebagai permukaan STANDAR-nya | `migration/src/icons.tsx:457` |
| `spr2400` punya tombol nav ke `review2400` | `view_spr2400.tsx` — SubBar `nav('review2400')` (sudah hidup sebelum PR ini) |
| `spr2400` TIDAK terdaftar di `WP_MODULE_MAP` maupun `LINEAGE` | `grep -n "spr2400" migration/src/wp_canon.ts` → kosong |

### 2.1 Temuan yang MENGUBAH bentuk pertanyaan ini

Investigasi PR menemukan tiga hal yang tidak ada dalam katalog awal:

**(a) Ada DUA id register untuk satu perikatan reviu yang sama, tanpa
penghubung apa pun.**

```
grep -rn "REV-2025-022\|ENG-2025-022" migration/src/data_part1.ts migration/src/data_part2.ts
```

| | `REV-2025-022` | `ENG-2025-022` |
|---|---|---|
| Register | `NONAUDIT` + `REVIEW_2400` (`data_part2.ts:528`, `:538`) | `ENGAGEMENTS` (`data_part1.ts:65`) |
| Klien | PT Cahaya Logistik Nusantara | `C-022` = PT Cahaya Logistik Nusantara |
| Standar | SPR 2400 | SPR 2400 |
| Rekan | Sari Dewanti, CPA | Sari Dewanti, CPA |
| Manajer | Bayu Saputra | Bayu Saputra |
| Tenggat | 2026-05-31 | 2026-05-31 |
| Progres | **60** | **45** |
| Materialitas | — (tak ada field) | **1.400.000.000** |
| Imbalan | 380.000.000 | — |
| WTB | tidak ada | **ADA** (`data_wtb_eng.ts:230`) |

Pemetaan antar keduanya **tidak ada di repo**:

```
grep -rnE "REV-2025-022.*ENG-2025-022|ENG-2025-022.*REV-2025-022" migration/src/
→ kosong (exit 1)
```

Artinya satu perikatan nyata sudah punya DUA catatan yang saling tidak tahu,
dengan progres yang berbeda (60 vs 45). Ini persis pola cacat "dua register
untuk satu perikatan" yang berulang di repo ini — dan ia sudah terjadi
**sebelum** ada yang membangun kertas kerja di `spr2400`.

**(b) `ENG-2025-022` punya WTB penuh; `REV-2025-022` tidak.**
`data_wtb_eng.ts:137` mendefinisikan `ENG_022` (transportasi & logistik, 20+
akun) dan `:230` mendaftarkannya. Jadi klaim "perikatan reviu ini tak punya
neraca saldo" hanya benar untuk id `REV-2025-022`.

**(c) Ada DUA angka materialitas untuk klien yang sama.**
`REVIEW_2400_PLAN.materiality` = **900 jt** (`data_part3.ts:475`) vs
`ENGAGEMENTS['ENG-2025-022'].materiality` = **1.400 jt**. Lihat usulan U-2.

---

## 3. Mengapa ini bukan keputusan yang boleh saya ambil

Membangun kertas kerja di `spr2400` berarti melahirkan register **ketiga**
untuk perikatan yang sudah punya dua. Sebaliknya, mengecilkan `review2400`
berarti membuang satu-satunya permukaan yang sudah punya persist dan progres
terhitung. Keduanya keputusan arsitektur produk, bukan keputusan teknis.

---

## 4. Opsi

### Opsi A — `spr2400` tetap lapisan metodologi (L3 adalah tujuan akhirnya)

`spr2400` menjelaskan standar; setiap angka perikatan ditarik dari catatan dan
ditandai sebagai rekaman, dengan nav ke `review2400` untuk mengerjakannya.
**Ini keadaan yang dicapai PR saat ini.**

- **Untung:** nol register baru; peran tiap modul jelas; `RELATED_SA` sudah
  memodelkan hubungan ini (standar ← → perikatan).
- **Rugi:** `spr2400` takkan pernah naik ke L4; sebagian pengguna akan mencari
  kertas kerja di modul standar dan tak menemukannya.
- **Konsekuensi:** tak ada pekerjaan lanjutan. Tutup U-1.

### Opsi B — `spr2400` menjadi kertas kerja, `review2400` menyusut jadi ringkasan

- **Untung:** satu permukaan kerja; modul standar & kertas kerja menyatu.
- **Rugi:** memindahkan persist yang sudah ada (`review2400inq`,
  `review2400concl`) = migrasi state server, bukan sekadar pindah komponen;
  `RELATED_SA['review2400'] → spr2400` jadi menunjuk dirinya sendiri.
- **Konsekuensi:** PR tersendiri, dan **wajib** menyelesaikan §2.1(a) lebih
  dulu — kalau tidak, kertas kerja baru akan lahir di atas dua register yang
  bertengkar.

### Opsi C — satukan registernya dulu, tunda pertanyaan L4

Jadikan `REV-2025-022` dan `ENG-2025-022` satu catatan (atau tautkan
eksplisit), lalu putuskan A vs B setelah angkanya konsisten.

- **Untung:** menutup cacat yang PALING nyata (progres 60 vs 45 pada perikatan
  yang sama) tanpa memindahkan apa pun.
- **Rugi:** menyentuh `ENGAGEMENTS`/`NONAUDIT` = menyentuh banyak konsumen
  (`view_profit.tsx:30`, `data_part4.ts:494,549`, `data_backoffice.ts:212-213`,
  seed server). Perlu sensus konsumen lebih dulu.

**Rekomendasi saya: C lalu A.** Alasannya: §2.1(a) adalah cacat data yang sudah
berdampak hari ini (dua progres berbeda untuk satu perikatan), sementara
pertanyaan L4 belum menimbulkan kerugian apa pun selama `spr2400` jujur
menyebut dirinya lapisan standar — yang sekarang sudah demikian.

---

## 5. Yang saya butuhkan dari Ari

1. Pilih A, B, atau C.
2. Bila C: apakah `REV-2025-022` dan `ENG-2025-022` memang **satu perikatan
   nyata**? Saya tidak mengasumsikannya — kesamaan klien/rekan/standar/tenggat
   sangat kuat, tetapi id, imbalan, dan progres berbeda, dan salah menyatukan
   dua perikatan berbeda jauh lebih berbahaya daripada membiarkannya terpisah.
