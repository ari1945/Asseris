# W0-3 — daratkan `fix/hcm-penilaian-karangan`

> ✅ **SELESAI — mendarat sebagai PR #319 (`abb36a7`, 2026-08-27).** Berkas ini disimpan
> sebagai catatan. Baris "cacat masih hidup di `405cc67`" di bawah sudah BASI.

Cabang: `fix/hcm-penilaian-karangan` · **ahead 2 / behind 52** (paling tua).
Berkas: `hcm_derive.ts` (+uji) · `canon_hcm.ts` · `view_people.tsx` · `view_pc_hcm.tsx`
· `timebudget_model.ts` · `view_timebudget.tsx` · `timebudget_isolation.test.ts` ·
`eslint-suppressions.json` · `docs/usulan-TB3-bobot-fase-timebudget.md`.

**Cacat masih hidup di `origin/master` `405cc67`** — `view_people.tsx:83`:

```ts
const apprais = [
  ['Kualitas teknis audit',        Math.min(5, person.rating + 0.1)],
  ['Kepemimpinan & supervisi',     person.rating - 0.2],
  ['Manajemen waktu & deadline',   person.rating],
  ['Komunikasi klien',             person.rating - 0.1],
];
```

Penilaian **empat dimensi** yang tak pernah dinilai siapa pun — keempatnya adalah satu
angka `rating` digeser ±0,1/0,2. Ia disajikan sebagai hasil penilaian kinerja, di
modul SDM, atas orang nyata.

> ⚠ **Cabang ini membawa LEBIH dari H1/H2.** Ia juga menyentuh `timebudget_model.ts`,
> `view_timebudget.tsx`, `timebudget_isolation.test.ts`, dan menambah
> `docs/usulan-TB3-bobot-fase-timebudget.md`. Catatan sensus lama hanya menyebut
> "H1/H2 + hcm_derive.ts" — **tidak lengkap**. Periksa isi keempat berkas tambahan
> itu sebelum mendaratkan, dan laporkan apa yang sebenarnya kamu bawa.

---

## Prompt (salin seluruh blok ini sebagai pesan pertama di sesi baru)

```
Kamu mengerjakan Asseris (aplikasi audit KAP, Bahasa Indonesia).

Baca berurutan:
1. CLAUDE.md di root repo.
2. docs/prompts-perbaikan/W0-00-PENDARATAN.md — metode blob, arah diff, jebakan
   squash-twin, resep rebase & CI. WAJIB, seluruhnya.
3. docs/prompts-perbaikan/W0-3-hcm.md — berkas ini.

TUGAS: DARATKAN cabang fix/hcm-penilaian-karangan ke master. Pekerjaan PENDARATAN,
bukan pengembangan. Cabang ini yang PALING TUA di antrean (behind 52).

⛔ JANGAN bekerja di direktori kerja utama — ia memikul 4 berkas termodifikasi + 16
untracked milik sesi lain. Buat worktree sendiri.

LANGKAH:

1. Buktikan BELUM mendarat — dengan BLOB, bukan git log / git cherry / "N ahead"
   (ketiganya salah di 20 dari 26 cabang; master menerima PR lewat squash):
     git rev-parse fix/hcm-penilaian-karangan:migration/src/hcm_derive.ts
     git rev-parse origin/master:migration/src/hcm_derive.ts          # harus GAGAL
     git rev-parse fix/hcm-penilaian-karangan:migration/src/view_people.tsx
     git rev-parse origin/master:migration/src/view_people.tsx        # harus BERBEDA

2. Buktikan cacatnya MASIH HIDUP di master (grep atas origin/master, BUKAN atas
   direktori kerja — direktori kerja ada di commit lama dan memberi hasil palsu):
     git show origin/master:migration/src/view_people.tsx | sed -n '80,90p'

3. SENSUS ISI CABANG DULU, sebelum rebase. Catatan lama menyebut cabang ini hanya
   "H1/H2 + hcm_derive.ts" — itu TIDAK LENGKAP. Jalankan:
     git diff --name-only origin/master...fix/hcm-penilaian-karangan
   dan baca perubahan pada timebudget_model.ts, view_timebudget.tsx,
   timebudget_isolation.test.ts, dan docs/usulan-TB3-bobot-fase-timebudget.md.
   Laporkan apa yang sebenarnya dibawa. Bila ada yang menurutmu TIDAK layak
   didaratkan bersama H1/H2 — katakan, jangan diam-diam membuangnya.

4. Rebase (JANGAN merge):
     git rebase --onto origin/master $(git merge-base origin/master fix/hcm-penilaian-karangan) fix/hcm-penilaian-karangan

5. ARAH DIFF — ini yang paling penting di cabang seusia ini. Behind 52 berarti master
   sudah menerima sapuan besar sejak merge-base: token warna on-dark (#311), token
   gradien (#313), lantai tipografi 11px (#310/#312), uji e2e a11y, ratchet :any.
   SEMBILAN cabang lama di repo ini akan MEREGRESI master bila di-merge. Untuk tiap
   hunk yang menyentuh view_people.tsx / view_pc_hcm.tsx / view_timebudget.tsx,
   tanyakan: apakah master sudah lebih maju di baris ini? Bila ya — AMBIL VERSI
   MASTER dan bawa hanya perubahan penilaian/derivasinya.

6. eslint-suppressions.json bersinggungan dengan PR #318 dan cabang newdisc (W0-1).
   JANGAN menyelesaikan konfliknya dengan tangan — jalankan `npm run lint:any-baseline`
   di migration/, lalu periksa hasilnya masuk akal.

7. Sesudah rebase, penanda konflik bisa TER-COMMIT di repo ini (sudah terjadi):
     git grep -nE "^(<{7}|={7}|>{7})"        # WAJIB nol hasil

8. npm run verify dari root — HIJAU. Lalu gh pr create --base master.

9. Bila CI tidak pernah START walau PR CLEAN: gh pr close <n> lalu gh pr reopen <n>.
   Antrean bisa 25 menit — tunggu, jangan menyimpulkan gagal.

⛔ LARANGAN
- Jangan menambah fitur. Cacat baru yang kamu temukan: laporkan, jangan kerjakan.
- Jangan menyentuh berkas di luar daftar cabang ini.
- view_people.tsx juga disentuh cabang fix/regref-tahap-a2 yang mendarat SESUDAH kamu
  (W0-4). Itu urusan mereka — jangan mengakomodasi perubahan mereka lebih dulu.
- docs/usulan-TB3-... adalah USULAN yang menunggu keputusan Ari (bobot fase Time &
  Budget). Mendaratkan BERKAS usulannya boleh; MENGEKSEKUSI usulannya TIDAK.
  Bila cabang ini ternyata sudah mengeksekusinya — BERHENTI dan laporkan.

SELESAI BILA:
[ ] Empat output `git rev-parse` (bukti belum mendarat) ditempel di deskripsi PR
[ ] Output grep (bukti cacat hidup di origin/master) ditempel
[ ] Sensus isi cabang dilaporkan — termasuk keempat berkas timebudget/usulan
[ ] Untuk tiap berkas bersinggungan: arah diff dinyatakan, dan alasan mengapa hasil
    rebase TIDAK meregresi sapuan #310/#311/#312/#313
[ ] `git grep -nE "^(<{7}|={7}|>{7})"` nol hasil
[ ] `npm run verify` HIJAU
[ ] Direktori kerja utama tak tersentuh
[ ] Deskripsi PR menyebut apa yang TIDAK dibawa dari cabang dan mengapa
```
