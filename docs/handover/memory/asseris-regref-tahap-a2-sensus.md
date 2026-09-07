---
name: asseris-regref-tahap-a2-sensus
description: "Arc regref Tahap A-2 (R1–R4 Ari) — PPL/rotasi/PPh Badan berkunci masa, dan sensus+detektor yang menemukan besaran KEEMPAT"
metadata: 
  node_type: memory
  type: project
  originSessionId: 5cc5f090-9887-4ecf-a20c-4f050e32b260
  modified: 2026-08-21T17:00:57.600Z
---

# Regref Tahap A-2 — gerbang cakupan yang benar-benar mencari (2026-08-21/22)

Branch `fix/regref-tahap-a2` di atas `master` `1b32c7f`. PRD `docs/prd-regref-tahap-a2.md`.
Empat temuan Ari atas [[asseris-regref-annual-arc]]: R1 kewajiban PPL · R2 batas rotasi AP ·
R3 tarif PPh Badan · **R4 cakupan belum diuji sebagai cakupan**.

## Temuan yang paling tajam — R4 benar, dan terbukti dalam satu perintah

Gerbang SC-9 Tahap A menjaga **satu arah**: setiap `RegRefSet<…>` yang diekspor wajib ada
di katalog. Ia tak pernah bertanya arah sebaliknya — besaran regulatori yang **belum
pernah menjadi** `RegRefSet`. R1–R3 semuanya lolos SC-9 tanpa satu uji memerah.

Prototipe detektor (regex, satu kali jalan) menemukan **besaran KEEMPAT** yang tak disebut
R1–R3: `P2_MIN_RATE = 15.0` di `view_newdisc.tsx` — tarif minimum efektif GloBE yang
menggerakkan estimasi eksposur *top-up tax*. Itu buktinya: mekanismenya gerbang, bukan
pembacaan.

## Prinsip yang layak diulang

1. **Membenarkan LABEL tanpa membenarkan LINGKUP membuat kebohongan lebih keras.**
   Menurunkan tahun PPL dari tanggal, tanpa menyaring catatan SKP ke tahun itu, akan
   membuat layar berkata "PPL 2027" sambil menjumlahkan SKP 2026. Dua perbaikan itu satu
   paket, bukan dua.
2. **Parameter default adalah tempat sembunyi fallback.**
   `pplStatusFromEntries(recs, look.value || undefined)` tampak hati-hati; ia justru jatuh
   ke `PPL_REQ_PMK186` — persis "yang terdekat" yang hendak dicabut. Bila lookup gagal,
   status harus `null`, bukan dihitung dengan bawaan.
3. **Presisi mengalahkan recall untuk gerbang yang harus bertahan.** Detektor konstanta
   SKALAR ber-kosakata regulatori: 14 situs. Diperluas ke bentuk objek: 66 situs (CAP =
   kapabilitas RBAC, REQ = permintaan PBC). Gerbang berisik akan dilemahkan orang
   berikutnya lalu berhenti menjaga apa pun.
4. **Detektor butuh penjaga penjaganya.** Uji `expect(found.length).toBeGreaterThan(0)` —
   pola yang berhenti cocok apa pun akan hijau selamanya sambil tidak menjaga apa-apa.
5. **Ratchet dua arah.** Situs baru = merah; situs terdaftar yang HILANG juga merah
   (prune). Untuk literal `0.22`, JUMLAH per berkas ikut dipaku — tanpa itu, berkas yang
   lolos sekali menjadi tempat sembunyi permanen.
6. **Satu set bernilai berbeda membuat registry dapat dinyatakan salah.** Set PPh Badan
   25% (TY2010–2019) tak dipakai perhitungan mana pun hari ini; ia ada supaya uji
   "dipilih menurut tanggal" tak lolos ketika pemilihannya tak pernah dijalankan.
7. **Aturan Q-3 diperluas dari "uang" ke PREMIS SEBUAH KESIMPULAN.** Kewajiban PPL dan
   batas rotasi bukan uang, tetapi verdict kepatuhan tak punya jawaban separuh. Kalender
   cuti tetap satu-satunya `warn`.
8. **Bila perubahanmu membatalkan premis uji orang lain, ganti CARA MEMBUKTIKAN.**
   `ppl_single_engine.test.ts` memaku `PPL_REQ_PMK186.annual` ada di view; kini membacanya
   langsung justru CACAT. Sifat yang dijaga ("satu sumber") tetap; buktinya berpindah ke
   `pplReqOn(`.

## Yang berubah (nol-delta pada tanggal hari ini)

`canon_cit.ts` (baru) — `CIT_REGISTRY` 3 set (25% → 22% → 22%) + `GLOBE_MIN_REGISTRY`.
Delapan berkas yang mengetik `0.22` dialihkan; `canon_base.ASOF` kini DITURUNKAN dari
`ASOF_DATE`. `canon_ppl.PPL_REGISTRY` + `pplYearOf`/`skpInYear`/`pplPeriod`.
`canon_rotation.ROTATION_REGISTRY` + `regimeOf({ regimes })`; fallback
`ind.rotationLimit || 5` dicabut (AP tanpa deklarasi kini `tak-dinilai`, bukan "Patuh").
`data_clock.ts` (baru) — `SEED_TODAY`/`SEED_YEAR` menyatukan `AMS.TODAY`, `ROTATION_YEAR`,
dan tahun PPL (K-02). `regref_census.ts` + dua uji baru. Katalog 5 → 9 entri.

## GOTCHA

- **`preview_start` menyajikan worktree UTAMA**, bukan milikmu (dikonfirmasi lagi:
  `/src/data_clock.ts` mengembalikan `index.html` = SPA fallback). Jalan keluar: tambah
  entri ber-`Set-Location` ABSOLUT di `.claude/launch.json` POHON UTAMA, pakai, lalu
  `git checkout --` kembalikan. Lihat [[asseris-independence-sod-rantai]].
- **`git checkout -- <berkas>` GAGAL untuk berkas belum-terlacak.** Probe mutasi pada
  berkas BARU harus dikembalikan manual — jangan mengandalkan checkout.
- **Verifikasi hidup tanpa login tetap kuat:** `import('/src/canon_cit.ts')` dsb. di
  `javascript_tool` membuktikan lima tanggal sekaligus, DAN mengimpor 12 modul view
  membuktikan tak ada konstanta tingkat-modul yang melempar saat boot (risiko nyata
  ketika konstanta view berubah dari literal menjadi `citRateRequired()`).
- **Menambah `(d: any)` di view memerahkan ratchet `:any`** — ketikkan tipenya, jangan
  re-baseline.
- Heredoc Python: string `'''…"),'''` yang berakhir dengan satu `"` sebelum `"""` =
  *unterminated triple-quoted string*. Tulis skrip ke berkas untuk konten rumit.
- Berkas repo ini CRLF: `str.replace` tanpa normalisasi newline = no-op SENYAP. Helper
  `ed.py` (assert jumlah kecocokan + deteksi CRLF) menyelamatkan dua kali.

## Menunggu DATA dari Ari (bukan kode)

Q-A1 pertahankan set 25% pra-2020? (rekomendasi: ya) · Q-A2 tanggal mulai berlaku
PMK 186/2021 & POJK 13/2017 · Q-A3 naskah PMK 136/2024 (GloBE). Keempat registry baru
`verified: false` dengan catatan yang menyebut naskah yang belum dicocokkan — semuanya
terlihat tiap hari di halaman `regref`.

## Sengaja DI LUAR lingkup (di-ratchet, bukan dikonversi)

±38 baris prosa "22%" di modul PSAK (label/paragraf, bukan perhitungan). Situs baru = merah.

Terkait: [[asseris-regref-annual-arc]] · [[asseris-sc24a-satu-register-skp]] ·
[[asseris-sdm-kepatuhan-arc]] · [[asseris-sesi-paralel-satu-worktree]]
