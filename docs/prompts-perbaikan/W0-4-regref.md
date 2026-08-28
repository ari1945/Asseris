# W0-4 — daratkan `fix/regref-tahap-a2` (TERAKHIR di gelombang W0)

> ✅ **SELESAI — mendarat sebagai PR #322 (`244f87f`, 2026-08-27).** Keempat workflow
> `master` hijau; ke-28 blob terbukti identik di master; cabang sudah dihapus.
> **Gelombang W0 tuntas**: #318 · #319 · #320 · #321 · #322.
> Berkas ini disimpan sebagai catatan, dengan dua premis yang terbukti salah dicoret
> di tempatnya (lihat kotak ❌ di bawah dan baris R4).

Cabang: `fix/regref-tahap-a2` · **ahead 2 / behind 42** · **28 berkas** — terbesar,
dan satu-satunya yang bersinggungan dengan **tiga** cabang W0 lain.

## ⛔ PRASYARAT — jangan mulai sebelum ketiganya mendarat

| Harus mendarat lebih dulu | Berkas bersinggungan | Mengapa |
|---|---|---|
| **W0-2 `smm`** | `data_part4.ts` (tekstual saja) | alasan semantiknya DICORET — lihat kotak di bawah |
| **W0-3 `hcm`** | `view_people.tsx` | hcm membawa perubahan substantif di berkas itu |
| **W0-1 `newdisc`** | `view_newdisc.tsx` | newdisc membawa perubahan substantif di berkas itu |

Periksa dengan blob sebelum mulai, bukan dengan `git log`.

> ❌ **KOREKSI 2026-08-27 — kotak ini SALAH; dicoret sesudah W0-4 mendarat (#322).**
> Isinya dulu: *"Ketergantungan SEMANTIK yang tak akan ditangkap gerbang mana pun.
> R1 mengubah `CPE_REQ` dari satu-record menjadi multi-record … ketiganya diam-diam
> menerima `undefined`, alamat atestasi bergeser, dan CI tetap hijau."*
>
> **R1 tidak pernah mengubah bentuk `CPE_REQ`.** Ia mempertahankan record yang sama
> persis — `{ annual, structured, unstructuredCap, year }` — dan hanya mengubah
> ASALNYA dari diketik menjadi DITURUNKAN (`pplReqOn` / `pplYearOf`). `year` tetap
> `number`, jadi tak ada pembaca yang menerima `undefined`, dan alamat atestasi SOQM
> tak dapat bergeser karena PR ini. Sensus pembaca = tiga; nol yang berubah bentuknya.
>
> Urutan smm→regref karena itu **tidak mengikat secara semantik**. Yang tetap berlaku
> hanyalah alasan TEKSTUAL: regref bersinggungan dengan tiga cabang lain, jadi
> menempatkannya terakhir tetap yang paling murah.

## Isi cabang (empat temuan, semua masih hidup di `405cc67`)

| # | Cacat di master | Baris |
|---|---|---|
| **R1** | `CPE_REQ` satu-record — `{ annual:40, structured:30, unstructuredCap:10, year:2026 }` tanpa masa berlaku | `data_part1.ts:535` |
| **R2** | `ind.rotationLimit \|\| 5` — batas rotasi jatuh ke 5 saat data diam | `data_licensing.ts:81` |
| **R3** | `RATE = C ? C.RATE : 0.22` — tarif PPh badan sebagai konstanta cadangan | `data_proforma.ts:129` |
| **R4** | katalog `regrefCatalog()` — hitungan "6 → 9" ini BASI; #283 menambah set `kurs` sesudahnya, jadi hasil yang benar **5 → 10**. Mengambil versi cabang utuh MENGHAPUS `kurs`. | `regref_catalog.ts` |

Verifikasi ulang keempatnya sendiri; jangan mewarisi tabel ini.

---

## Prompt (salin seluruh blok ini sebagai pesan pertama di sesi baru)

```
Kamu mengerjakan Asseris (aplikasi audit KAP, Bahasa Indonesia).

Baca berurutan:
1. CLAUDE.md di root repo.
2. docs/prompts-perbaikan/W0-00-PENDARATAN.md — metode blob, arah diff, jebakan
   squash-twin, resep rebase & CI. WAJIB, seluruhnya.
3. docs/prompts-perbaikan/W0-4-regref.md — berkas ini, TERMASUK kotak prasyarat.

TUGAS: DARATKAN cabang fix/regref-tahap-a2 ke master. Pekerjaan PENDARATAN, bukan
pengembangan. Ini cabang TERBESAR (28 berkas) dan TERAKHIR di gelombang W0.

⛔ LANGKAH NOL — PRASYARAT. Cabang ini bersinggungan dengan tiga cabang lain yang
harus mendarat DULU. Periksa dengan BLOB, bukan git log:
   git rev-parse origin/master:migration/src/canon_smm_period.ts   # W0-2 → harus ADA
   git rev-parse origin/master:migration/src/hcm_derive.ts         # W0-3 → harus ADA
   git rev-parse origin/master:migration/src/newdisc_derive.ts     # W0-1 → harus ADA
Bila salah satu belum ada: BERHENTI dan laporkan. Jangan mulai.

CATATAN: versi lama blok ini menyatakan R1 mengubah CPE_REQ jadi multi-record sehingga
tiga view SMM diam-diam menerima `undefined`. ITU SALAH — bentuk CPE_REQ tidak berubah,
hanya asalnya (diketik → diturunkan). Jangan mewarisi klaim itu; verifikasi sendiri
dengan `git grep -n "CPE_REQ" -- migration/src`.

⛔ JANGAN bekerja di direktori kerja utama — ia memikul 4 berkas termodifikasi + 16
untracked milik sesi lain. Buat worktree sendiri.

LANGKAH:

1. Buktikan BELUM mendarat — dengan BLOB (git log / git cherry / "N ahead" salah di
   20 dari 26 cabang; master menerima PR lewat squash):
     git rev-parse fix/regref-tahap-a2:migration/src/regref_catalog.ts
     git rev-parse origin/master:migration/src/regref_catalog.ts

2. Buktikan keempat cacat MASIH HIDUP di master (grep atas origin/master, BUKAN atas
   direktori kerja — direktori kerja ada di commit lama dan memberi hasil palsu):
     git show origin/master:migration/src/data_part1.ts    | grep -n "CPE_REQ ="
     git show origin/master:migration/src/data_licensing.ts| grep -n "rotationLimit"
     git show origin/master:migration/src/data_proforma.ts | grep -n "RATE"
   Bila salah satu ternyata SUDAH tertutup di master: jangan bawa bagian itu, dan
   katakan di deskripsi PR. Melaporkan cacat yang sudah tertutup lebih mahal daripada
   tidak melaporkan apa pun.

3. Rebase (JANGAN merge):
     git rebase --onto origin/master $(git merge-base origin/master fix/regref-tahap-a2) fix/regref-tahap-a2

4. ARAH DIFF — paling kritis di cabang ini, karena tiga berkasnya baru saja diubah
   oleh W0-1/W0-2/W0-3 yang mendarat sebelum kamu:
     migration/src/data_part4.ts      ← W0-2 baru mengubahnya
     migration/src/view_people.tsx    ← W0-3 baru mengubahnya
     migration/src/view_newdisc.tsx   ← W0-1 baru mengubahnya
   Untuk ketiganya: AMBIL VERSI MASTER sebagai dasar dan bawa HANYA perubahan regref
   di atasnya. Jangan mengembalikan versi cabangmu secara utuh — itu akan menghapus
   kerja yang baru saja mendarat.
   Hal yang sama berlaku untuk sapuan master sejak merge-base (behind 42): token
   on-dark #311, token gradien #313, lantai tipografi 11px #310/#312, uji e2e a11y.
   SEMBILAN cabang lama di repo ini akan MEREGRESI master bila di-merge.

5. Sesudah rebase, penanda konflik bisa TER-COMMIT di repo ini (sudah terjadi):
     git grep -nE "^(<{7}|={7}|>{7})"        # WAJIB nol hasil

6. R1 menyentuh CPE_REQ, yang dibaca beberapa modul. (Bentuknya TIDAK berubah — hanya
   asalnya; lihat catatan koreksi di atas. Sensus tetap wajib, tapi jangan berangkat
   dari asumsi bahwa ada pembaca yang rusak.) Sesudah rebase telusuri SELURUH pembaca:
     git grep -n "CPE_REQ" -- migration/src
   Setiap pembaca yang bentuknya berubah WAJIB punya uji. Bila kamu menemukan pembaca
   yang tak bisa kamu perbaiki tanpa melebar keluar lingkup — BERHENTI dan laporkan.

7. npm run verify dari root — HIJAU. Lalu gh pr create --base master.

8. Bila CI tidak pernah START walau PR CLEAN: gh pr close <n> lalu gh pr reopen <n>.
   Antrean bisa 25 menit — tunggu, jangan menyimpulkan gagal.

⛔ LARANGAN
- Jangan menambah fitur. Cacat baru yang kamu temukan: laporkan, jangan kerjakan.
- Jangan menyentuh berkas di luar 28 berkas cabang ini. Enam paket W1 berjalan
  paralel — beberapa di antaranya menyentuh view_psak*.tsx yang BUKAN milikmu.
  ⛔ Khususnya: view_psak24.tsx & view_psak46.tsx MILIKMU (ada di cabang ini);
  view_psak1/2/14/16.tsx BUKAN — itu paket W1-F. Jangan menyeragamkan keduanya.
- Regref Tahap B menunggu KEPUTUSAN ARI. Jangan menyelipkannya.
- Nilai yang berubah menurut kalender (CPE_REQ, tarif PPh badan, batas rotasi)
  rumahnya `regrefCatalog()`, BUKAN konstanta baru. Bila kamu tergoda menambah
  konstanta — berhenti, itu tanda kamu keluar lingkup.

SELESAI BILA:
[ ] Tiga output `git rev-parse` prasyarat (W0-1/2/3 sudah mendarat) ditempel
[ ] Output `git rev-parse` bukti cabang ini belum mendarat ditempel
[ ] Tiga output grep (bukti R1/R2/R3 hidup di origin/master) ditempel — atau
    pernyataan eksplisit bila salah satunya ternyata sudah tertutup
[ ] Untuk data_part4.ts / view_people.tsx / view_newdisc.tsx: dinyatakan bahwa versi
    MASTER dipakai sebagai dasar, dan kerja W0-1/2/3 tidak terhapus
[ ] Sensus pembaca CPE_REQ dilaporkan; tiap pembaca yang bentuknya berubah punya uji
[ ] `git grep -nE "^(<{7}|={7}|>{7})"` nol hasil
[ ] `npm run verify` HIJAU
[ ] Direktori kerja utama tak tersentuh
[ ] Deskripsi PR menyebut apa yang TIDAK dibawa dari cabang dan mengapa
```
