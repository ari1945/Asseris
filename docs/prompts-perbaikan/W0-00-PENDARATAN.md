# Gelombang W0 — mendaratkan kerja yang sudah ada tapi belum di master

> Dibuat 2026-08-27 terhadap `origin/master` = `405cc67`.
> ✅ **GELOMBANG W0 TUNTAS — `origin/master` = `244f87f`.** Kelimanya mendarat pada
> 2026-08-27: #318 `62593c4` · #319 `abb36a7` · #321 `a6f4f74` · #320 `7ae8d68` ·
> #322 `244f87f`. Keempat workflow `master` hijau.
> ⚠ **§2 memuat satu premis yang terbukti SALAH dan sudah dicoret di tempatnya.**
> Brief bersama untuk W0-1 … W0-4. Bukan prompt; jangan dikirim sendirian.

**Mengapa ini didahulukan:** kapasitas eksekusi bukan hambatan repo ini. Empat arc
sudah SELESAI DIKERJAKAN dan terkunci di cabang lokal. Selama ia tak mendarat,
setiap sensus berikutnya salah, dan sesi lain berisiko mengerjakannya ulang —
itu sudah terjadi sekali (`firm_gl_export.ts` ditulis dua kali).

---

## 1 · Peta W0 (sudah diverifikasi terhadap `405cc67`)

| # | Cabang | Isi | ahead/behind | Status |
|---|---|---|---|---|
| ~~0~~ | ~~`fix/firmgl-apar-subbuku-hidup`~~ | **PR #318 — SUDAH MENDARAT** `62593c4` (2026-08-27), cabang remote dihapus | — | ✅ **SELESAI** |
| **1** | `fix/newdisc-pilar-dua-turunan` | mesin turunan Pilar Dua + 2 gerbang | 1 / 4 | rebase ringan |
| **2** | `claude/fervent-tharp-227ee5` | `canon_smm_period.ts` — tahun atestasi SOQM dari ¶53 | 1 / 43 | rebase |
| **3** | `fix/hcm-penilaian-karangan` | H1/H2 + `hcm_derive.ts` | 2 / 53 | rebase |
| **4** | `fix/regref-tahap-a2` | R1–R4 regref, katalog 6→9 set | 2 / 43 | **terakhir** |

⛔ **`fix/firmgl-rekonsiliasi-ekspor` DICORET.** Ia **digantikan** PR #318 — blob
`firm_gl_export.ts` identik (`8023b9f`), dan #318 membawa tambahan apar
(`apar_ratios.ts`, `use_firm_ap.ts`, `data_firmfin.ts`, `view_firmfinance.tsx`).
Mendaratkan keduanya = konflik tanpa guna.

---

## 2 · Urutan MENGIKAT dan alasannya

```
#318 ✅ ──►  { W0-1 newdisc · W0-2 smm · W0-3 hcm }  ──►  W0-4 regref
 mendarat      (tiga sesi PARALEL — MULAI SEKARANG)      (sendirian, terakhir)
```

**Persinggungan berkas yang terukur:**

| Pasangan | Berkas bersama |
|---|---|
| `hcm` × `newdisc` | `migration/eslint-suppressions.json` |
| `regref` × `hcm` | `migration/src/view_people.tsx` |
| `regref` × `newdisc` | `migration/src/view_newdisc.tsx` |
| `regref` × `smm` | `migration/src/data_part4.ts` |

`regref` bersinggungan dengan **tiga** cabang lain — itu sebabnya ia terakhir.
Bila ia lebih dulu, ketiga cabang lain harus me-rebase terhadapnya sekaligus.

**Dan satu ketergantungan SEMANTIK, bukan tekstual — ini yang paling mudah
terlewat.** Master menghitung alamat atestasi SOQM begitu:

```ts
// view_isqm.tsx:105 · view_isqm_deep.tsx:501 · view_governance.tsx:66
attestKeyFor('soqmAnnualEval', smmPeriod, (AD.CPE_REQ || {}).year)
```

`CPE_REQ.year` adalah **tahun kewajiban PPL Akuntan Publik** — dipinjam sebagai
tahun atestasi mutu firma. `W0-2 smm` mencabut ketergantungan itu.

> ❌ **KOREKSI 2026-08-27 — alasan urutan di paragraf ini SALAH; jangan mewarisinya.**
> Kalimat aslinya berbunyi: *"`W0-4 regref` (R1) mengubah `CPE_REQ` dari satu-record
> jadi **multi-record**. Kalau `regref` mendarat lebih dulu, `(AD.CPE_REQ || {}).year`
> menjadi `undefined` di tiga view sekaligus — tanpa satu pun gerbang memerah."*
>
> **R1 tidak pernah mengubah bentuk `CPE_REQ`.** Ia mempertahankan record yang sama
> persis — `{ annual, structured, unstructuredCap, year }` — dan hanya mengubah
> ASALNYA dari diketik menjadi DITURUNKAN (`pplReqOn(SEED_TODAY)` /
> `pplYearOf(SEED_TODAY)`). `year` tetap `number`. Bentuk final di master
> (`data_part1.ts:539`, sesudah #322):
>
> ```ts
> const CPE_REQ = {
>   annual: CPE_PPL_LOOK.value.annual,
>   structured: CPE_PPL_LOOK.value.structuredMin,
>   unstructuredCap: CPE_PPL_LOOK.value.unstructuredCap,
>   year: pplYearOf(SEED_TODAY) as number,
> };
> ```
>
> Sensus pembacanya (di luar komentar & uji) **tiga**: definisi di `data_part1.ts`,
> pipa re-export `data.ts`, dan `view_bo3.tsx:546` yang membaca `.year`. **Nol** yang
> menerima `undefined`. Mendaratkan `regref` lebih dulu tidak akan menggeser alamat
> atestasi SOQM.
>
> `W0-2` tetap layak mendarat atas alasannya sendiri — tahun kewajiban PPL memang
> bukan tahun atestasi mutu firma — tetapi ia **bukan prasyarat teknis** bagi `W0-4`.
> Urutan tekstual (`regref` bersinggungan dengan tiga cabang) tetap berlaku dan sudah
> cukup untuk menempatkannya terakhir.
>
> Pelajaran yang dibawa: **verifikasi premis dokumen ini sendiri sebelum
> memakainya.** Dua klaim di gelombang W0 terbukti salah saat diperiksa — yang ini,
> dan klaim "cabang W0-2 mencabut `new Date().getFullYear()` dari ketiga view"
> (`getFullYear` nol hasil di ketiganya).

`eslint-suppressions.json`: konfliknya murah — yang mendarat kemudian menjalankan
`npm run lint:any-baseline` (menyulam suppression hilang + prune yang usang), bukan
menyelesaikan konflik dengan tangan.

---

## 3 · Metode WAJIB — tiga jebakan yang sudah menggigit repo ini

**(a) `git log`, `git cherry`, dan hitungan "N ahead" SEMUANYA MENYESATKAN.**
Master menerima PR lewat **squash**, jadi cabang yang isinya sudah mendarat tetap
tampak "ahead". Pada sensus 2026-08-27 hitungan itu salah di **20 dari 26** cabang.
Satu-satunya uji yang sah:

```
git rev-parse <cabang>:<berkas>
git rev-parse origin/master:<berkas>
```

**(b) BACA ARAH DIFF-nya.** Hash berbeda tidak berarti cabangmu lebih baru.
**Sembilan** cabang lama akan **MEREGRESI** master bila di-merge — mengembalikan hex
mentah yang sudah ditokenkan (#311/#313), menghapus 88 baris uji e2e a11y,
melonggarkan ratchet `:any`, mengembalikan geometri avatar pra-lantai-11px. Sebelum
menerima potongan mana pun dari cabang, tanyakan: *apakah master sudah lebih maju di
baris ini?*

**(c) `git checkout -- <berkas>` MENGHAPUS kerja belum-commit.** Direktori kerja utama
memikul 4 berkas termodifikasi + 16 untracked milik sesi lain. **Jangan bekerja di
sana.** Pakai worktree sendiri.

**(d) CI bisa TIDAK PERNAH START walau PR CLEAN.** GitHub kadang menjatuhkan dispatch.
Sembuhnya `gh pr close <n>` lalu `gh pr reopen <n>`. Antrean bisa 25 menit — tunggu,
jangan menyimpulkan gagal.

**(e) `gh pr merge --delete-branch` GAGAL bila worktree lain memegang `master`.**
Merge-nya TETAP jadi; cabang remote dihapus manual sesudahnya.

---

## 4 · Resep pendaratan (sama untuk W0-1 … W0-4)

```powershell
git fetch origin
git worktree add ../_w0-<nama> <cabang>      # JANGAN pakai direktori kerja utama
cd ../_w0-<nama>

# 1 · buktikan kerjanya BELUM mendarat (blob, bukan git log)
git rev-parse <cabang>:<berkas-kunci>
git rev-parse origin/master:<berkas-kunci>   # berbeda ⇒ periksa ARAH diff-nya

# 2 · buktikan cacatnya MASIH HIDUP di master (grep atas origin/master, bukan dir kerja)
git show origin/master:<berkas> | grep -n "<pola cacat>"

# 3 · rebase, bukan merge
git rebase --onto origin/master $(git merge-base origin/master <cabang>) <cabang>

# 4 · gerbang penuh — cermin persis CI
cd <root>; npm run verify

# 5 · PR
gh pr create --base master --head <cabang>
```

> Bila rebase memunculkan konflik: **penanda konflik bisa TER-COMMIT** di repo ini
> (sudah terjadi). Sesudah rebase, `git grep -nE "^(<{7}|={7}|>{7})"` wajib nol hasil.

---

## 5 · Definisi selesai (sama untuk keempatnya)

- [ ] Bukti blob "belum mendarat" ditempel di deskripsi PR (dua `git rev-parse`).
- [ ] Bukti "cacat masih hidup di `origin/master`" ditempel (grep + hasilnya).
- [ ] Untuk tiap berkas bersinggungan: dinyatakan **arah diff**-nya dan mengapa
      hasil rebase tidak meregresi master.
- [ ] `git grep -nE "^(<{7}|={7}|>{7})"` nol hasil.
- [ ] `npm run verify` dari root HIJAU.
- [ ] Direktori kerja utama TIDAK tersentuh (`git status` di sana tetap 4 M + 16 ??).
- [ ] Deskripsi PR menyebut apa yang TIDAK dibawa dari cabang dan mengapa.

---

## 6 · Berjalan bersamaan dengan Gelombang W1

Sudah diverifikasi: **nol** berkas beririsan antara kelima cabang W0 dan keenam paket
W1 (`W1-00-IDENTITAS-TERSEGEL.md` §8). Keduanya aman berjalan serentak. Yang perlu
diingat hanyalah: **PR W1 dan PR W0 sama-sama akan menua** — yang mendarat kemudian
menjalankan `gh pr update-branch` lalu menunggu CI ulang.
