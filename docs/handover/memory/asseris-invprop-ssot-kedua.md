---
name: asseris-invprop-ssot-kedua
description: "Properti Investasi (PSAK 13) — SSOT kedua dicabut ke akun 1-2600/4-1500; perangkap fallback singleton wtbRows([]) → AMS.WTB; React.CSSProperties tak ada di repo ini"
metadata: 
  node_type: memory
  type: project
  originSessionId: 2dc1f0d4-4065-42ec-8a6b-06ade08b0d39
  modified: 2026-08-24T08:12:59.703Z
---

Modul `invprop` membawa empat konstanta di dalam view (`IP_PORTFOLIO`, `IP_ROLL`,
`IP_PL`, `IP_SENS`) dengan komentar yang menyebut salah satunya "sub-ledger kanonik
modul", nol `useAudit`/`useFirm`, dan badge `tie: close === fvSum` yang membandingkan
dua konstanta yang memang DISETEL agar sama. Dicabut ke mesin baru
`migration/src/invprop_derive.ts` + gerbang `invprop_register.test.ts` (26 assertion).

**Besarannya, bukan sekadar "tak tersambung":** modul menerbitkan **5,8%** dari saldo
yang benar-benar dibukukan, dengan badge HIJAU di atasnya.

| | Modul lama | WTB ENG-2025-063 | Selisih |
|---|---|---|---|
| Saldo awal | 13.575 jt | 248.000 jt (`ly`) | 234.425 jt |
| Saldo akhir | 15.748 jt | 272.400 jt (dilaporkan) | 256.652 jt |
| Pendapatan sewa | 1.860 jt | 32.200 jt | 30.340 jt |

## GOTCHA TERBESAR — `wtbRows([])` jatuh ke `AMS.WTB`

`canon_base.ts:13` → `return (wtb && wtb.length) ? wtb : ((AMS && AMS.WTB) || [])`.
**Larik kosong falsy di sana**, jadi `wtbVal([], …)` / `reportedBalance([], …)`
diam-diam meminjam neraca saldo ENG-2025-014. Mesin baru apa pun yang menjawab
"apakah akun ini ADA pada perikatan ini" WAJIB memeriksa larik **yang diberikan**
(`rows.some(r => r.code === kode)`), lalu memanggil `reportedBalance` hanya SETELAH
barisnya terbukti ada — sehingga fallback tak pernah dapat menyala. Menguji
ketiadaan lewat masukan kosong akan MENGULANG cacatnya, bukan menangkapnya.

## Akun `1-2600` hanya ada di SATU dari tujuh perikatan seed

Hanya `ENG-2025-063` (PT Graha Properti Investama). Enam lainnya kini mendapat panel
yang MENYATAKAN akunnya tak ada. Konsekuensi produk yang perlu keputusan Ari: modul
`invprop` kosong untuk enam perikatan; kalau lebih dari satu klien seharusnya punya
properti investasi, yang kurang adalah barisnya di `data_wtb_eng.ts`.

## Rekonsiliasi yang BISA memerah (bukan `A == A`)

Sisi kiri = kolom `ly` + mutasi auditor · sisi kanan = `unadj` + jurnal terposting.
Dua kolom, dua sumber. Default (mutasi nol) → MERAH, selisih 24.400 jt — dan itu
memang keadaannya. Hijau dibuktikan dengan angka konkret (12.000 + 14.400 − 2.000),
BUKAN `fvGain = close − open` yang tautologis.
Sub-ledger KOSONG sengaja tak pernah `ok` walau `0 == 0` — kelolosan hampa.

## Jebakan repo yang memakan waktu (semuanya gagal SENYAP)

- **`React.CSSProperties` TIDAK ADA** (TS2694) — repo tak memasang `@types/react`.
  Jangan anotasi objek style; biarkan disimpulkan.
- **`onChange={e => …}` = TS7006** (implicit any, 14 error sekaligus). Idiom repo:
  `onChange={(e: { target: { value: string } }) => …}` (lihat `view_execution.tsx`).
- **`I.alertTriangle` ikon HANTU** — namanya `I.alert`. Kelas cacat sama dengan arc
  token CSS hantu; tak ada gerbang yang menangkapnya.
- **`.top-btn` ber-`color:#bcd2de`** — kelas untuk header navy, hampir tak terlihat
  di baris tabel putih. Idiom tombol dalam-baris: `<button>` polos + `color:var(--red)`
  (`view_confirm_parts.tsx:120`).
- **`PR4_ENGAGEMENT_KEY_RE` hanya cocok** `psak\d+|syariah|sustain|sectorck|auditcomm|spr2410|presentasi|sakroadmap`. Kunci baru bernama lain (`invprop.v1`) TANPA entri
  eksplisit di `AMS_PERSIST_SCOPE` jatuh ke lingkup FIRMA → `capForWrite`=FIRM_ADMIN →
  suntingan Manajer/Senior ditolak server DIAM-DIAM.
- Kunci lingkup **engagement tak perlu allowlist server** (`isAllowlistedFirmKey` hanya
  untuk scope firm, `stateAccess.ts:109`); default `capForWrite('engagement', …)` = `WP_EDIT`.
- **Heredoc Bash merusak berkas TS** (unmatched quote) — pakai tool Write untuk membuat
  berkas di repo ini. Lihat [[asseris-repo-hygiene-2026-08-19]].
- Id baris baru: `MAX(id)+1` (`view_wp.tsx:731`), bukan `Date.now()` (lihat
  [[asseris-klok-ssot-jam-mesin]]) dan bukan indeks larik — indeks bergeser saat baris
  tengah dihapus sehingga tombol hapus mengenai baris yang salah.

## Mengetik ulang `:any` MELAHIRKAN entri suppression YATIM — dan lint exit 2

View lama punya satu `const J = (n: any)`. Mengetiknya jadi `(n: number)` membuat entri
`"src/view_invprop.tsx": { no-explicit-any: { count: 1 } }` di `eslint-suppressions.json`
menjadi **yatim**, dan `npm run lint` keluar **exit 2** dengan pesan yang hanya berbunyi
"There are suppressions left that do not occur anymore" — TANPA menyebut berkas mana.
Mudah sekali disalahtuduhkan ke arc lain (saya melakukannya). Cara menemukan pemiliknya:
cadangkan berkasnya, jalankan `npx eslint src --prune-suppressions`, lalu `git diff` —
entri yang tercabut itulah pemiliknya.

⚠ Mencabut entri manual saja TIDAK cukup: JSON-nya valid tetapi lint tetap exit 2 sampai
`--prune-suppressions` menormalkannya. Jalankan prune, jangan sunting tangan.
⚠ TAPI `--prune-suppressions` menyapu SELURUH repo: di worktree kotor ia ikut menurunkan
`view_firmgl.tsx` 76→62 (milik arc firmgl yang mengurangi `:any` tanpa sinkron baseline),
sehingga commit-mu diam-diam menelan baseline arc lain. Sesudah prune, KEMBALIKAN hitungan
berkas yang bukan milikmu dan sisakan hanya entri berkasmu di diff.
Akibatnya lint tetap merah di worktree ini — itu milik arc firmgl, bukan milikmu.

⚠ KOREKSI atas [[asseris-mesin-nol-pemanggil-parkir]]: catatan itu menduga entri yatim
berasal dari `view_mytasks_parts` 61→47. Pada 2026-08-24 yang benar-benar yatim adalah
`view_invprop.tsx` (1, milik arc ini) dan `view_firmgl.tsx` 76→62. Jangan mencari di
mytasks — buktikan pemiliknya lewat prune+diff, jangan menebak dari catatan lama.
⚠ `$?` SESUDAH pipa (`npm run lint | head`) menangkap exit `head`, bukan eslint — selalu
`> berkas 2>&1; echo $?`. Ini sempat membuat saya menyimpulkan lint hijau padahal merah.

## Direktori kerja bersama membawa 4 arc MERAH yang bukan milik arc ini

`home_composition.test.ts` · `wip_writedown_authority.test.ts` ·
`a11y_anchor_href.test.ts` · `mytasks_derive.ts` — keempatnya **UNTRACKED dan tak ada
di `origin/master`**, jadi `master` hijau karena gerbangnya belum ada di sana.
`view_home.tsx:209` di origin/master memang sudah `<a onClick>` tanpa href. Cara
membuktikan sebuah merah bukan milikmu: `git cat-file -e origin/master:<berkas>`.
Lihat [[asseris-sesi-paralel-satu-worktree]] · [[asseris-a11y-anchor-href-gerbang-tertahan]].

Terkait: [[asseris-mesin-nol-pemanggil-parkir]] · [[asseris-firmgl-rekonsiliasi-ekspor]]
· [[asseris-fixedassets-register-tunggal]] (pola `av`/`bv` dari variabel yang sama =
hiasan, bukan rekonsiliasi — persis cacat badge `tie` di sini).
