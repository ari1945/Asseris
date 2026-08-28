# W0-2 — daratkan `claude/fervent-tharp-227ee5` (periode atestasi SOQM)

> ✅ **SELESAI — mendarat sebagai PR #320 (`7ae8d68`, 2026-08-27).** Berkas ini disimpan
> sebagai catatan; rinciannya di bagian "SELESAI" di bawah, berikut satu premis urutan
> yang terbukti SALAH dan sudah dicoret.

Cabang: `claude/fervent-tharp-227ee5` · **ahead 1 / behind 42**.
Berkas: `canon_smm_period.ts` (+uji) · `canon_firm_attest.ts` (+uji) · `data_part4.ts`
· `view_isqm.tsx` · `view_isqm_deep.tsx` · `view_governance.tsx`.

**Cacat masih hidup di `origin/master` `405cc67`** — tiga view menghitung alamat
atestasi tahunan SMM begitu:

```ts
view_isqm.tsx:105        attestKeyFor('soqmAnnualEval', smmPeriod, (AD.CPE_REQ || {}).year)
view_isqm_deep.tsx:501   attestKeyFor('soqmAnnualEval', period,    (A.CPE_REQ  || {}).year)
view_governance.tsx:66   attestKeyFor('soqmAnnualEval', evalPeriod,(A.CPE_REQ  || {}).year)
```

`CPE_REQ.year` adalah **tahun kewajiban PPL Akuntan Publik** — angka dari domain yang
sama sekali berbeda, dipinjam sebagai tahun **atestasi mutu firma**. Cabang ini
menurunkannya dari **periode yang dicakup evaluasi SMM (SMM 1 ¶53)** lewat
`canon_smm_period.ts`, yang **tidak ada di master**.

> ⚠ Catatan lama di memori menyebut cabang ini "mencabut fallback
> `new Date().getFullYear()`". **Itu tidak akurat** — `getFullYear()` nol hasil di
> ketiga view pada master. Yang nyata adalah ketergantungan `CPE_REQ.year` di atas.
> Verifikasi sendiri; jangan mewarisi rumusan lama.

## ✅ SELESAI — mendarat sebagai PR #320 (`7ae8d68`, 2026-08-27)

Berkas ini disimpan sebagai catatan. Keempat workflow `master` hijau; kesembilan blob
terbukti identik di master; cabangnya sudah dihapus.

Satu berkas di luar delapan berkas cabang ikut tersentuh dan itu disengaja:
`clock_ssot.test.ts` (lahir di master lewat #281, **sesudah** merge-base cabang) adalah
ratchet ber-JUMLAH TEPAT yang memerah **dua arah** — mencabut `new Date().getFullYear()`
dari `canon_firm_attest.ts` membuatnya berbunyi `izin 1, nyata 0`. Entri izinnya
DICABUT, mengikuti preseden `diagnostics_panel.tsx` di berkas yang sama.

## ❌ Urutan MENGIKAT — alasan di bawah SALAH, dicoret 2026-08-27

Bagian ini dulu berbunyi: *"`fix/regref-tahap-a2` (R1) mengubah `CPE_REQ` dari
satu-record menjadi **multi-record**. Bila `regref` lebih dulu, `(AD.CPE_REQ || {}).year`
menjadi `undefined` di tiga view sekaligus — dan tak satu pun gerbang akan memerah."*

**R1 tidak pernah mengubah bentuk `CPE_REQ`.** Ia mempertahankan record yang sama persis
dan hanya mengubah asalnya dari diketik menjadi diturunkan; `year` tetap `number`.
Diperiksa sesudah W0-4 mendarat (#322): sensus pembaca `CPE_REQ` = tiga, **nol** yang
menerima `undefined`. Mendaratkan `regref` lebih dulu tidak akan menggeser alamat
atestasi SOQM.

PR ini tetap layak atas alasannya sendiri — tahun kewajiban PPL memang bukan tahun
atestasi mutu firma, dan cacatnya nyata (dorman, bangun saat `QM_EVAL.period` kosong).
Yang salah hanyalah mekanisme kerusakan yang dipakai untuk membenarkan urutannya.
Rinciannya di `W0-00-PENDARATAN.md` §2.

---

## Prompt (salin seluruh blok ini sebagai pesan pertama di sesi baru)

```
Kamu mengerjakan Asseris (aplikasi audit KAP, Bahasa Indonesia).

Baca berurutan:
1. CLAUDE.md di root repo.
2. docs/prompts-perbaikan/W0-00-PENDARATAN.md — metode blob, arah diff, jebakan
   squash-twin, resep rebase & CI. WAJIB, seluruhnya.
3. docs/prompts-perbaikan/W0-2-smm-periode-atestasi.md — berkas ini.

TUGAS: DARATKAN cabang claude/fervent-tharp-227ee5 ke master. Pekerjaan PENDARATAN,
bukan pengembangan.

⛔ JANGAN bekerja di direktori kerja utama — ia memikul 4 berkas termodifikasi + 16
untracked milik sesi lain. Buat worktree sendiri.

LANGKAH:

1. Buktikan BELUM mendarat — dengan BLOB, bukan git log / git cherry / "N ahead"
   (ketiganya salah di 20 dari 26 cabang; master menerima PR lewat squash):
     git rev-parse claude/fervent-tharp-227ee5:migration/src/canon_smm_period.ts
     git rev-parse origin/master:migration/src/canon_smm_period.ts     # harus GAGAL

2. Buktikan cacatnya MASIH HIDUP di master (grep atas origin/master, BUKAN atas
   direktori kerja — direktori kerja ada di commit lama dan memberi hasil palsu):
     git show origin/master:migration/src/view_isqm.tsx      | grep -n "CPE_REQ"
     git show origin/master:migration/src/view_isqm_deep.tsx | grep -n "CPE_REQ"
     git show origin/master:migration/src/view_governance.tsx| grep -n "CPE_REQ"

3. Cabang ini behind 42. Rebase (JANGAN merge):
     git rebase --onto origin/master $(git merge-base origin/master claude/fervent-tharp-227ee5) claude/fervent-tharp-227ee5

4. ARAH DIFF — ini yang paling penting di cabang seusia ini. Behind 42 berarti master
   sudah menerima sapuan besar sejak merge-base: token warna on-dark (#311),
   token gradien (#313), lantai tipografi 11px (#310/#312), uji e2e a11y. SEMBILAN
   cabang lama di repo ini akan MEREGRESI master bila di-merge. Untuk setiap hunk
   yang menyentuh view_isqm / view_isqm_deek / view_governance, tanyakan: apakah
   master sudah lebih maju di baris ini? Bila ya — AMBIL VERSI MASTER dan bawa hanya
   perubahan periode atestasinya.

5. Sesudah rebase, penanda konflik bisa TER-COMMIT di repo ini (sudah terjadi):
     git grep -nE "^(<{7}|={7}|>{7})"        # WAJIB nol hasil

6. data_part4.ts juga disentuh cabang fix/regref-tahap-a2 yang mendarat SESUDAH kamu.
   Itu urusan mereka. Jangan mencoba mengakomodasi perubahan mereka lebih dulu.

7. npm run verify dari root — HIJAU. Lalu gh pr create --base master.

8. Bila CI tidak pernah START walau PR CLEAN: gh pr close <n> lalu gh pr reopen <n>.
   Antrean bisa 25 menit — tunggu, jangan menyimpulkan gagal.

⛔ LARANGAN
- Jangan menambah fitur. Cacat baru yang kamu temukan: laporkan, jangan kerjakan.
- Jangan menyentuh berkas di luar kedelapan berkas cabang ini.
- Jangan "sekalian" memperbaiki CPE_REQ itu sendiri (data_part1.ts) — itu R1 milik
  cabang fix/regref-tahap-a2 (W0-4). Kamu hanya MELEPASKAN ketiga view dari
  ketergantungan padanya.
- Jangan menyentuh migration/eslint-suppressions.json kecuali rebase memaksanya;
  bila ya, jalankan `npm run lint:any-baseline` alih-alih menyunting tangan.

SELESAI BILA:
[ ] Dua output `git rev-parse` (bukti belum mendarat) ditempel di deskripsi PR
[ ] Tiga output grep (bukti cacat hidup di origin/master) ditempel
[ ] Untuk tiap berkas bersinggungan: arah diff dinyatakan, dan alasan mengapa hasil
    rebase TIDAK meregresi sapuan #310/#311/#312/#313
[ ] `git grep -nE "^(<{7}|={7}|>{7})"` nol hasil
[ ] `npm run verify` HIJAU
[ ] Direktori kerja utama tak tersentuh
[ ] Deskripsi PR menyebut secara eksplisit bahwa W0-4 (regref) HARUS menyusul, dan
    mengapa urutannya mengikat
```
