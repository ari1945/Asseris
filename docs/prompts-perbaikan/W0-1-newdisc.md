# W0-1 — daratkan `fix/newdisc-pilar-dua-turunan`

> ✅ **SELESAI — mendarat sebagai PR #321 (`a6f4f74`, 2026-08-27).** Berkas ini disimpan
> sebagai catatan. Baris "cacat masih hidup di `405cc67`" di bawah sudah BASI: cacatnya
> tertutup, dan `view_newdisc.tsx` kini membaca `newdisc_derive.ts`.

Cabang: `fix/newdisc-pilar-dua-turunan` · **ahead 1 / behind 3** (paling ringan).
Berkas: `view_newdisc.tsx` · `newdisc_derive.ts` · `newdisc_derive.test.ts` ·
`newdisc_view_reactivity.test.ts` · `eslint-suppressions.json`.

**Cacat masih hidup di `origin/master` `405cc67`** — `view_newdisc.tsx:26`:

```ts
const P2_JURIS = [
  { juris: 'Indonesia (induk & anak)', profit: 44200, tax: 9724, etr: 22.0, inScope: true },
  { juris: 'Singapura (Sentosa Trading Pte)', profit: 6100, tax: 640, etr: 10.5, inScope: true },
  …
];
```

Tabel yurisdiksi Pilar Dua **dikarang di dalam view** — laba, pajak, dan ETR per
yurisdiksi sebagai literal, lalu memo pengungkapan berbicara seolah ia membaca
neraca saldo. `canon_smm_period`-nya sendiri: `newdisc_derive.ts` **tidak ada di
master** (`git rev-parse origin/master:migration/src/newdisc_derive.ts` → gagal).

---

## Prompt (salin seluruh blok ini sebagai pesan pertama di sesi baru)

```
Kamu mengerjakan Asseris (aplikasi audit KAP, Bahasa Indonesia).

Baca berurutan:
1. CLAUDE.md di root repo.
2. docs/prompts-perbaikan/W0-00-PENDARATAN.md — metode blob, arah diff, jebakan
   squash-twin, resep rebase & CI. WAJIB, seluruhnya.
3. docs/prompts-perbaikan/W0-1-newdisc.md — berkas ini.

TUGAS: DARATKAN cabang fix/newdisc-pilar-dua-turunan ke master. Ini pekerjaan
PENDARATAN, bukan pengembangan. Kerjanya sudah selesai di cabang.

⛔ JANGAN bekerja di direktori kerja utama — ia memikul 4 berkas termodifikasi dan
16 untracked milik sesi lain, dan `git checkout -- <berkas>` di sana MENGHAPUS kerja
mereka. Buat worktree sendiri.

LANGKAH:

1. Buktikan kerjanya BELUM mendarat — dengan BLOB, bukan git log / git cherry /
   hitungan "N ahead" (ketiganya salah di 20 dari 26 cabang pada sensus terakhir
   karena master menerima PR lewat squash):
     git rev-parse fix/newdisc-pilar-dua-turunan:migration/src/newdisc_derive.ts
     git rev-parse origin/master:migration/src/newdisc_derive.ts     # harus GAGAL

2. Buktikan cacatnya MASIH HIDUP di master (grep atas origin/master, BUKAN atas
   direktori kerja — direktori kerja ada di commit lama dan memberi hasil palsu):
     git show origin/master:migration/src/view_newdisc.tsx | grep -n "P2_JURIS"

3. Rebase (JANGAN merge):
     git rebase --onto origin/master $(git merge-base origin/master fix/newdisc-pilar-dua-turunan) fix/newdisc-pilar-dua-turunan

4. eslint-suppressions.json bersinggungan dengan PR #318 dan dengan cabang hcm.
   JANGAN menyelesaikan konfliknya dengan tangan — jalankan `npm run lint:any-baseline`
   di migration/ (ia menyulam suppression yang hilang dan mem-prune yang usang),
   lalu periksa hasilnya masuk akal.

5. Sesudah rebase, penanda konflik bisa TER-COMMIT di repo ini (sudah terjadi):
     git grep -nE "^(<{7}|={7}|>{7})"        # WAJIB nol hasil

6. ARAH DIFF. Untuk setiap berkas yang berubah, tanyakan: apakah master sudah lebih
   maju di baris ini? Sembilan cabang lama di repo ini akan MEREGRESI master bila
   di-merge (mengembalikan hex mentah yang sudah ditokenkan #311/#313, menghapus 88
   baris uji e2e a11y, melonggarkan ratchet :any). Cabang ini hanya behind 3, jadi
   risikonya kecil — tapi PERIKSA, jangan asumsikan.

7. npm run verify dari root — HIJAU. Lalu gh pr create --base master.

8. Bila CI tidak pernah START walau PR CLEAN (GitHub kadang menjatuhkan dispatch):
   gh pr close <n> lalu gh pr reopen <n>. Antrean bisa 25 menit — tunggu.

⛔ LARANGAN
- Jangan menambah fitur, jangan "sekalian merapikan". Bila kamu menemukan cacat baru
  di view_newdisc.tsx: laporkan di deskripsi PR, jangan kerjakan.
- Jangan menyentuh berkas di luar kelima berkas cabang ini. Enam paket W1 dan tiga
  pendaratan W0 lain berjalan paralel.
- view_newdisc.tsx juga disentuh oleh cabang fix/regref-tahap-a2 yang mendarat
  SESUDAH kamu (W0-4). Itu urusan mereka, bukan urusanmu — jangan mencoba
  mengakomodasi perubahan mereka lebih dulu.

SELESAI BILA:
[ ] Dua output `git rev-parse` (bukti belum mendarat) ditempel di deskripsi PR
[ ] Output grep (bukti cacat hidup di origin/master) ditempel
[ ] `git grep -nE "^(<{7}|={7}|>{7})"` nol hasil
[ ] `npm run verify` HIJAU
[ ] Direktori kerja utama tak tersentuh (tunjukkan `git status --short` di sana)
[ ] Deskripsi PR menyebut apa yang TIDAK dibawa dari cabang dan mengapa
```
