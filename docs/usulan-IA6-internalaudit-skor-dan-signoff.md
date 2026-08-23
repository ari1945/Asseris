# Usulan IA6 — skor SA 610 di `assessment_model`, dan rantai sign-off untuk `internalaudit`

> Dibuat 2026-08-23 saat mengerjakan [`prompts-perbaikan/80-internalaudit.md`](prompts-perbaikan/80-internalaudit.md).
> **Status: usulan, belum dikerjakan.** Prompt IA6 meminta laporan + usulan lalu BERHENTI;
> keduanya mengubah angka atau menambah alur kerja, jadi bukan keputusan agen.

---

## Bagian 1 — memindahkan skor ke `assessment_model`

### Yang ada sekarang

Modul `internalaudit` merakit skornya sendiri. Sesudah arc IA1–IA5, aritmetikanya
hidup di `migration/src/internalaudit_memo.ts` (murni & diuji) tetapi **tetap milik
modul ini**:

```
iaScore(factors)   = rerata sederhana skor tiga faktor ¶16 (null bila belum lengkap)
iaVerdict(avg)     = ≥ 3,5 hijau · ≥ 2,5 amber · < 2,5 merah
```

`migration/src/assessment_model.ts` menyediakan mesin bersama yang dipakai
`opening` dan `continuance`:

```
weightedScore(f)   = Σ(s·w) / Σ(w)
verdict(score,kind)= ≥ 4 hijau · ≥ 3 amber · < 3 merah        ← ambang TETAP, sama untuk semua kind
VERDICT_LABELS     = { acceptance, continuance, opening }      ← tak ada kind untuk SA 610
```

### Apakah angkanya bergeser? Ya — bukan skornya, tapi KEPUTUSANNYA

**Skor tidak bergeser.** SA 610 ¶16 tidak memeringkat ketiga faktor, jadi bobot yang
defensibel hanya bobot sama rata — dan `weightedScore` dengan bobot sama rata
**identik** dengan rerata sederhana (`Σ(s·w)/Σ(w)` = `Σs/n` ketika seluruh `w` sama).

**Verdict bergeser, dan bergesernya persis di rentang yang paling sering terjadi:**

| rerata ¶16 | ambang SA 610 sekarang | ambang `assessment_model` | akibat |
|---|---|---|---|
| 4,00 – 5,00 | Dapat Diandalkan | hijau | sama |
| **3,50 – 3,99** | **Dapat Diandalkan** | **amber** | **turun satu tingkat** |
| 3,00 – 3,49 | Andalan Terbatas | amber | sama |
| **2,50 – 2,99** | **Andalan Terbatas** | **merah** | **turun satu tingkat** |
| < 2,50 | Tidak Dapat Diandalkan | merah | sama |

Contoh konkret: seed lama modul ini (4 · 4 · 3) memberi rerata **3,667**. Hari ini itu
berarti *"Dapat Diandalkan"*; di bawah ambang `assessment_model` ia menjadi
*"Andalan Terbatas"* — auditor yang memberi skor yang sama persis akan memperoleh
keputusan pengandalan yang berbeda. Itu **perubahan pertimbangan profesional**, bukan
refactor.

### Tiga jalur, dan yang direkomendasikan

**Jalur A — jangan dipindahkan.** Biarkan ambang SA 610 milik modulnya, catat sebabnya.
Murah, dan `internalaudit_memo.ts` sudah membuatnya murni & diuji. Kerugian: dua tempat
merumuskan "skor → warna" di repo yang sama.

**Jalur B — pindahkan dan ikuti ambang `assessment_model`.** Paling rapi secara kode,
tetapi menaikkan bar pengandalan SA 610 dari 3,5 ke 4,0 untuk seluruh perikatan.
Butuh keputusan: *apakah 4,0 memang bar yang benar?* Kalau ya, jalur ini benar — tetapi
alasannya harus ditulis sebagai kebijakan metodologi, bukan sebagai akibat refactor.

**Jalur C — generalisasi `verdict()`, angka lama tak bergerak. ← rekomendasi.**
Tambahkan tabel ambang per-`kind` dengan **default persis `[4, 3]`**, lalu daftarkan
`kind: 'internalaudit'` dengan ambang `[3.5, 2.5]` dan label SA 610:

```ts
const VERDICT_CUTS: Record<AssessmentKind, [number, number]> = {
  acceptance: [4, 3], continuance: [4, 3], opening: [4, 3],   // ← tak bergerak
  internalaudit: [3.5, 2.5],
};
```

`acceptance`/`continuance`/`opening` menghasilkan verdict yang **identik bit-per-bit**
(gerbang registri akseptasi & uji `opening` tetap hijau), sementara SA 610 memakai mesin
yang sama. Yang tetap harus diputuskan: `iaScore` mengembalikan `avg: null` selama ¶16
belum lengkap; `weightedScore` tak punya keadaan itu (set kosong → 0), sehingga
keadaan **belum dinilai** tetap harus hidup di lapisan SA 610.

⛔ Ketiga jalur menyentuh `assessment_model.ts` (minimal untuk menambah label), yang
oleh prompt arc ini dilarang disentuh tanpa keputusan. **Butuh "Proceed." dari Ari.**

---

## Bagian 2 — rantai sign-off `WpPanel`

### Keadaan sekarang

`internalaudit` **tidak terdaftar** di `WP_MODULE_MAP` (`migration/src/wp_signoff.tsx:33`).
Bukti:

```
grep -n "internalaudit" migration/src/wp_signoff.tsx   → tak ada hasil
```

Konsekuensinya: tak ada sign-off penyusun/penelaah/rekan, tak ada bukti wajib, tak
muncul di rekap kelengkapan kertas kerja cockpit — kertas kerja SA 610 tidak auditable
di dalam model sistemnya sendiri.

Sampai arc IA1–IA5, tempat itu diisi blok **"Sign-off"** berisi tiga nama personel dengan
tanggal dan dua `done: true` — tanda tangan yang tak pernah ada. Blok itu **sudah
dicabut**; penggantinya adalah rekaman kesimpulan lokal (`internalAudit.v1.conclusion`)
yang mencatat pelaku dari sesi dan tanggal dari klok aplikasi. Itu menutup kebohongannya,
**bukan** menyediakan rantai otorisasi.

### Yang berubah bila `WpPanel` disambungkan

1. **Registrasi.** `WP_MODULE_MAP.internalaudit = { ref: 'internalaudit', requiredEvidence: [...] }`
   — usulan bukti wajib:
   - Piagam audit internal & rencana kerja tahunan yang disetujui (¶16(c))
   - Laporan/kertas kerja fungsi audit internal atas area yang digunakan (¶23)
   - Dokumentasi reperformansi auditor atas pekerjaan yang digunakan (¶24)
   - Persetujuan tertulis entitas & individu untuk bantuan langsung (¶33), bila ada
2. **Fase.** `PHASE_OF_MODULE.internalaudit = 'Eksekusi'` (`cockpit_progress.ts`) — wajib,
   karena gerbang `cockpit_progress.test.ts` menuntut setiap kunci `WP_MODULE_MAP` punya
   fase. `'Eksekusi'` bukan tebakan: repo sudah mengklasifikasikan SA 610 sebagai fase
   *Pelaksanaan* di dua tempat (`icons.tsx:447` `RELATED_SA.internalaudit` dan
   `data_knowledge.ts:56`).
3. **Penyebut rekap bergeser.** Satu kertas kerja baru berstatus belum-dimulai →
   persentase kelengkapan cockpit **turun**. Sama seperti waktu `wtb` dan `opening`
   didaftarkan: itu benar, bukan regresi.

### Bagaimana ia berinteraksi dengan tombol "Simpulkan" (IA2)

Dua bentuk, dan pilihannya adalah keputusan alur kerja:

**(i) `WpPanel` menggantikan tombol.** Ikuti persis pola `opening`:
`useWpSignoff('internalaudit').conclusion` menjadi sumber kesimpulan, tombol "Simpulkan"
dihapus dari SubBar, dan `Sa610MemoInput.conclusion` dibaca dari rantai kanonik.
Untung: satu tempat, otorisasi & SoD ditegakkan server, jejak masuk hash-chain.
Rugi: kesimpulan SA 610 jadi tak dapat direkam sampai kertas kerjanya siap
ditandatangani — dua peristiwa yang tidak selalu bersamaan.

**(ii) Tombol tetap, menulis ke rantai kanonik.** "Simpulkan" tetap menjadi jalan pintas
tetapi menulis `wpState['internalaudit'].conclusion` alih-alih dokumen lokal.
Untung: alur layar tak berubah, tetapi rekamannya auditable.
Rugi: dua pintu masuk ke satu field — kelas cacat yang sudah pernah menggigit repo ini
(`opinion` vs `wpState['900']`).

**Rekomendasi: (ii), lalu (i) bila terbukti mubazir.** Yang penting bukan tombolnya
melainkan bahwa rekaman kesimpulan berhenti hidup di dokumen yang hanya dibaca modul ini.

### Gerbang yang layak menyertainya

Sejalan dengan `expertGateBlockers` (SA 620): **menandatangani kertas kerja SA 610
sementara ¶16 belum tuntas dinilai berarti menyatakan kecukupan bukti atas pekerjaan
pihak lain yang belum dievaluasi** — kelas cacat yang sama dengan #23 (SoD) dan PR-B
(persetujuan AJE). Bentuknya sudah tersedia: fungsi murni `iaSignoffBlockers(doc)` yang
dibaca UI *dan* `server/src/signoff.ts`.

⛔ Penegakan server mengubah kontrak `state.set` dan menambah impor lintas-batas →
**PRD dulu** (aturan CLAUDE.md: apa pun yang menyentuh kontrak tRPC).

---

## Ringkas keputusan yang diminta

| # | Keputusan | Dampak bila ya |
|---|---|---|
| 1 | Jalur A / B / **C** untuk skor SA 610 | C: `assessment_model` disentuh, nol angka existing bergeser |
| 2 | Daftarkan `internalaudit` di `WP_MODULE_MAP` + fase `Eksekusi` | % kelengkapan WP cockpit turun (benar) |
| 3 | Bentuk (i) atau **(ii)** untuk "Simpulkan" | (ii): rekaman pindah ke `wpState`, layar tak berubah |
| 4 | Gerbang sign-off ¶16 ditegakkan server | perlu PRD — menyentuh kontrak tRPC |
