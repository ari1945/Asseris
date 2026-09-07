---
name: asseris-pppk-kontrol-native
description: "PPPK (#306 mendarat 7fb1a4a) — batas jsdom untuk gerbang papan-ketik, pola .lnk sebagai preseden mendarat, dan tombol mati yang hanya boleh dicabut karena menghidupkannya = naik level"
metadata: 
  node_type: memory
  type: project
  originSessionId: 831f638c-d566-4b62-82f7-b961bdac534b
  modified: 2026-08-26T22:14:29.527Z
---

PR [#306](https://github.com/ari1945/Asseris/pull/306) mendarat `7fb1a4a` (2026-08-26,
di atas `f650c74`). Lima `<span onClick>` → `<button className="lnk">`, dua label
kalender literal → turunan, satu CTA mati dicabut. CI PR 9/9, master 4/4.

## GOTCHA TERBESAR — apa yang jsdom BISA dan TIDAK BISA putuskan soal papan ketik

Diprobe langsung, bukan diasumsikan:

- **BISA: fokusabilitas.** `el.focus()` pada `<span>` tanpa `tabindex` TIDAK memindahkan
  `document.activeElement` (tetap `BODY`). Pada `<button>` ia memindahkannya. Pada
  `<a>` TANPA `href` juga tidak; `<a href>` ya. Ini **perilaku nyata**, bukan atribut —
  dan ia adalah arti harfiah "tak bisa di-Tab". Gerbang papan-ketik yang bisa merah di
  `npm run verify` dibangun di atas ini.
- **TIDAK BISA: sintesis Enter.** `keydown{Enter}` pada `<button>` native menghasilkan
  **NOL klik** di jsdom. Itu activation behavior milik peramban. Jangan menulis gerbang
  yang mengaku membuktikan Enter di jsdom — ia akan merah untuk kode yang BENAR.

Resep yang dipakai: `el.focus()` → `expect(document.activeElement).toBe(el)` →
`(document.activeElement as HTMLElement).click()` — menjalankan activation behavior
dari elemen yang SEDANG DIFOKUS, yakni jalur yang ditempuh Enter. Bukti Enter sungguhan
tetap ranah `e2e/` (batas yang [[asseris-spr2400-pengiriman-dan-premis-salah]] / #304
tarik sendiri). Nyatakan batas itu di kepala berkas uji, jangan sembunyikan.

**Sapuan `bergayaTautan()`** (elemen dengan `style.textDecoration === 'underline'` ATAU
`classList.contains('lnk')`) menangkap kelima kontrol sekaligus lintas tab, dan wajib
menegaskan dirinya tidak hampa (`expect(kandidat.length).toBeGreaterThan(0)` per tab).

## Preseden tautan-dalam-kalimat: `.lnk` pada `<button>`, BUKAN `<a>`

`styles_modules.css:201` punya `.lnk`. Yang MENDARAT di master memakainya begini:
`<button type="button" className="lnk" onClick={() => nav('x', { from: 'modulIni' })}>`
— `view_facilities2`, `view_procurement2`, `view_firmops2` (7 lokasi). Periksa tetangga
sebelum menyalin: di sini tetangganya BENAR (button native, fokusabel, Enter-aktif).
Uji `a11y_anchor_href.test.ts` (arc lain) menyebut kelas `linkbtn` di prosanya, tetapi
kelas yang benar-benar ada di CSS adalah **`lnk`** — ikuti yang mendarat.

Sekalian periksa `{ from: 'modulIni' }`: di pppk 3 dari 5 `nav()` tak membawanya
sementara yang keempat membawa ⇒ breadcrumb mati di 3 tujuan (CLAUDE.md §5).

## Tombol mati yang tak boleh dihidupkan

`<Btn>Ajukan Laporan Tahunan</Btn>` nol handler. Aturan keras 4 = aktifkan atau hapus,
tanpa opsi ketiga. Tapi aksinya (penyampaian e-reporting PPPK) inheren **L4/L5** —
state server + rantai audit + tanda terima tersegel. Kalau prompt melarang naik level,
"aktifkan" tertutup ⇒ **cabut**, dan laporkan kemampuannya sebagai keputusan produk
terbuka. Membuat handler yang SELALU menolak = tombol mati berhias.

Basis pembanding: repo-wide **702 dari 784** `<Btn>` punya `onClick` — dead button
BUKAN pola sistemik, jadi mencabut satu tidak inkonsisten.

## Literal kalender: mana yang turunan, mana yang kutipan hukum

Bedakan dua hal yang mirip:
- `label="Menuju Tenggat (30 Apr)"` di sebelah `daysLeft` turunan `R.dueDate` → **cacat**,
  kartu membantah dirinya. Idem `"Total Klien FY2025"` vs `R.year`.
- `"30 April"` / `"akhir Januari"` dalam prosa PMK 154/2017 & PMK 186/2021 → **kutipan
  regulasi**, biarkan. Menurunkannya dari `dueDate` MEMBALIK arah kebenaran.

Gerbang label harus me-render DUA KALI dengan dua nilai dan menuntut `label2 !== label1`
plus nilai lama ABSEN. "Label memuat tanggal" adalah tautologi — literal pun lolos.

## Higiene yang terbukti lagi

- **Heredoc Bash tool gagal dua kali** di sesi ini (`unexpected EOF while looking for
  matching '`) untuk konten TSX/Markdown panjang, padahal heredoc pesan commit berhasil.
  Jangan bertarung dengannya: tulis berkas uji lewat tool Write, dan body PR ke
  scratchpad lalu `gh pr create --body-file <path>`. Lihat [[asseris-repo-hygiene-2026-08-19]].
- `gh pr view --json merged` **tidak ada** — pakai `state` / `mergedAt` / `mergeCommit`.
- Tak ada biner `jq` di mesin ini; pakai `gh --jq` bawaan.
- `npm run verify` penuh di worktree dingin ≈ **30 menit** (test 197s + build 75s +
  server 249s + sisanya install/transform). Jalankan `run_in_background`, jangan
  timeout 600s. Outputnya dibuffer sampai akhir — berkas output kosong ≠ macet;
  periksa `migration/dist` bertanggal baru sebagai tanda hidup.
- Sebelum merge: `git log --oneline <basis>..origin/master` harus KOSONG. `mergeable:
  CLEAN` hanya berarti nol konflik tekstual, bukan CI segar
  ([[asseris-merge-antrean-2026-08-23]]).

## Utang yang ditinggalkan sadar

1. Kemampuan pengajuan e-reporting PPPK — butuh PRD (server state + audit + segel).
2. Spek Enter peramban sungguhan untuk kelima tautan pppk di
   `e2e/tests/07-a11y-axe-keyboard.spec.ts` — tak dikirim karena tak bisa dibuktikan
   MERAH tanpa Postgres, dan e2e di luar `npm run verify` (aturan keras 7).
