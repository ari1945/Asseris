# Usulan S1 — repo ini tidak punya gerbang untuk variabel mati

> Dibuat 2026-08-21 saat mengerjakan [`prompts-perbaikan/19-succession.md`](prompts-perbaikan/19-succession.md).
> **Status: usulan, belum dikerjakan.** Sengaja TIDAK diperbaiki dalam PR suksesi —
> dampaknya lintas-berkas dan layak jadi keputusan tersendiri.

## Temuan

Modul `succession` menghitung sinyal terpentingnya lalu membuangnya:

```
migration/src/view_pc_org.tsx:298   (sebelum perbaikan)
const contradicting = roleStates.reduce((n, r) => n + r.successors.filter(s => s.contradicts).length, 0);
```

`contradicting` muncul **tepat sekali** di seluruh berkas. Tak pernah dirender.
Enam dari sembilan kandidat penerus punya klaim kesiapan yang dibantah bukti, dan
tak satu pun sampai ke layar.

Pertanyaannya bukan "mengapa penulisnya lupa" melainkan **mengapa tak ada gerbang
yang berteriak**. Jawabannya: tidak ada gerbangnya, di mana pun.

## Bukti

**ESLint** — `no-unused-vars` dimatikan di KEDUA blok konfigurasi:

```
migration/eslint.config.js:54    'no-unused-vars': 'off',   // blok .js  — "quieted during migration (revisit post-W3/W5)"
migration/eslint.config.js:99    'no-unused-vars': 'off',   // blok .ts(x) — "tsc (full strict) pemilik kebenaran ini"
```

Blok `.ts(x)` mematikannya dengan alasan eksplisit: *tsc pemilik kebenaran ini*.
Alasan itu tidak berlaku untuk kelas cacat ini.

**TypeScript** — `migration/tsconfig.json` menyalakan `strict: true`, tetapi
`strict` **tidak** mencakup `noUnusedLocals` maupun `noUnusedParameters`; keduanya
adalah flag terpisah dan tak satu pun disetel:

```
grep -n "noUnused" migration/tsconfig.json migration/tsconfig.test.json   → tak ada hasil
```

`@typescript-eslint/no-unused-vars` juga tidak pernah dinyalakan.

Jadi: ESLint menyerahkannya kepada tsc, tsc tidak pernah diminta memeriksanya.
Sebuah `const` yang dihitung mahal lalu dibuang lolos seluruh gerbang CI —
di berkas mana pun, bukan hanya modul ini.

## Mengapa ini lebih besar daripada satu modul

Variabel mati di repo ini jarang berarti "kode yang lupa dihapus". Polanya
berulang: seseorang **menghitung** sesuatu yang benar, lalu penyampaiannya
tertinggal saat merakit tampilan. Yang hilang bukan kode, melainkan temuan —
dan pengguna menanggung risiko yang sistem sebenarnya sudah tahu.

## Usulan

Ratchet, bukan sakelar — persis pola `@typescript-eslint/no-explicit-any` (W15):

1. Nyalakan `@typescript-eslint/no-unused-vars` sebagai `error` untuk `.ts(x)`,
   dengan `argsIgnorePattern: '^_'` dan `varsIgnorePattern: '^_'`.
2. Hitung baseline yang ada ke `eslint-suppressions.json` lewat mekanisme yang
   sudah dipakai (`npm run lint:any-baseline` bersaudara), agar CI hijau di hari
   pertama dan hanya pelanggaran BARU yang merah.
3. Sapu baselinenya bertahap. Setiap entri adalah kandidat temuan yang dibuang,
   bukan sekadar kode mati — periksa satu per satu, jangan hapus massal.

**Yang perlu diputuskan Ari:** apakah sapuan baseline dikerjakan sekaligus
(satu PR besar, sulit direviu) atau per-grup modul mengikuti arc yang sedang
berjalan.
