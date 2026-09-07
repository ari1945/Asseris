---
name: asseris-a11y-badge-button-native
description: "PR #244 merged — toggle posting jurnal GL firma dari <span onClick> jadi <button> native; primitif BadgeBtn baru; gotcha Browser pane membekukan transisi CSS & mengirim keycode kosong"
metadata: 
  node_type: memory
  type: project
  originSessionId: 712d85bf-6018-4587-ab87-3eb497e4e28c
  modified: 2026-08-15T08:39:18.577Z
---

**PR [#244](https://github.com/ari1945/Asseris/pull/244) MERGED 2026-08-15** — `origin/master` = **`48abbc8`**. Uji 1791 frontend + 431 server, 9/9 CI hijau. Sisa PR terbuka milik saya: [#242](https://github.com/ari1945/Asseris/pull/242) & [#243](https://github.com/ari1945/Asseris/pull/243) (keduanya sesi lain; test-merge #243 atas master baru = **0 penanda konflik** meski sama-sama menyentuh `view_firmgl.tsx`).

## Yang berubah

Kontrol posting/batal-posting jurnal buku besar firma dulu `<span onClick>` membungkus `<Badge>` — tak ada di pohon aksesibilitas, tak fokusable, tak bisa keyboard. Padahal sejak [[asseris-firmfin-ledger-derived]] (#241) aksi itu menggeser SELURUH angka keuangan firma.

- **Primitif baru `BadgeBtn` di `ui.tsx`** — `<button type="button">` memakai kelas `badge b-*` yang sama, jadi rupa pil tetap satu sumber. Pakai ini untuk badge apa pun yang memicu aksi.
- `.badge-btn` di `styles_chrome.css` — hanya menetralkan gaya bawaan agen tombol + hover ring + `:focus-visible`.
- Smoke keyboard + pemindaian axe halaman GL di `e2e/tests/07-a11y-axe-keyboard.spec.ts`.

**Why:** CLAUDE.md §3.7 melarang `<span onClick>` sebagai kontrol, tapi tak ada primitif untuk badge-yang-mengklik, jadi orang menambal dengan span. Sekarang ada.

**How to apply:** butuh badge yang bisa diklik → `<BadgeBtn kind label onClick>`, jangan bungkus `<Badge>` dengan span.

## GOTCHA — WCAG 2.5.3 Label-in-Name mengalahkan "aria-label yang deskriptif"

`aria-label="Posting jurnal JV-0307"` di atas pil bertulis "Draft" **melanggar** Label-in-Name: nama aksesibel WAJIB memuat teks yang terlihat. Bentuk yang benar diawali teks pil:

> `Draft — jurnal JV-0307, klik untuk posting`

Aturan axe-nya `label-content-name-mismatch` — **eksperimental, TIDAK ikut `axe.run()` default**, jadi gerbang e2e tak akan menangkapnya. Jalankan manual via `runOnly` saat memberi `aria-label` pada elemen yang punya teks tampak.

## GOTCHA KERAS — Browser pane memberi temuan visual PALSU

Pane yang tidak ditampilkan **tidak compositing**, sehingga:

1. **Transisi CSS membeku di tengah jalan.** `getComputedStyle(el).backgroundColor` mengembalikan nilai interpolasi lama SELAMANYA — saya sempat "menemukan" tombol bertema gelap di halaman terang. Obat: `el.style.transition='none'` sebelum membaca. (`styles_work.css` memasang transisi pada `.badge`, `.btn`, `.panel`, dst. — banyak elemen kena.)
2. **`computer key` mengirim event degenerate** (`key:""`, `code:""`, `which:0`, tapi `isTrusted:true`). Chrome tak memetakannya ke aktivasi tombol, jadi **Enter/Space TIDAK BISA dibuktikan hidup** — bukan cacat app. `computer left_click` dengan `ref` tetap menghasilkan klik tepercaya. Buktikan keyboard lewat Playwright di CI.

Rujukan serupa: [[asseris-design-quickwin-contrast]] (Vite dev menyajikan stylesheet basi → temuan palsu).

## Resep — menjalankan axe lokal tanpa memasang deps e2e

`axe-core` cuma ada di `e2e/node_modules` (biasanya tak terpasang). Tanpa `npm ci` di e2e:

```
npm pack axe-core            # di scratchpad
tar -xzf axe-core-*.tgz package/axe.min.js
cp package/axe.min.js migration/public/axe-tmp.js      # buat public/ bila belum ada
```

lalu di halaman: sisipkan `<script src="/axe-tmp.js">`, `await axe.run(document, {rules:{'color-contrast':{enabled:false},'heading-order':{enabled:false},'region':{enabled:false}}})` — persis aturan yang dimatikan gerbang e2e. **Hapus `migration/public/` sesudahnya** bila tadinya tak ada.

## Resep — stack dev terisolasi saat 5180/5181 dipakai sesi lain

`migration/vite.config.mjs` **meng-hardcode** target proxy `http://localhost:5181`; tak ada env override. Tulis config scratch (mis. `vite.verify-local.mjs`, port 5186 → target 5187), jalankan `npx vite --config …`, dan server dengan `PORT=5187 npx tsx src/server.ts`. Worktree baru biasanya cuma punya `migration/node_modules` → `npm install` di root + `server/`, lalu `prisma generate` + `db:push` + `seed` untuk `server/dev.db` sendiri.

⚠ `npm install` di `server/` menambah `"peer": true` ke `package-lock.json` — `git restore` sebelum commit.

## GOTCHA — `@types/react` sengaja TIDAK ada

`jsx-intrinsics.d.ts` berisi `declare module 'react'` (= `any`), jadi `React.ButtonHTMLAttributes` **tidak ada** dan `tsc` menolaknya. Untuk props bertipe, daftarkan atribut sendiri. Ini juga cara menghindari ratchet `:any` naik — lihat [[asseris-sa510-indep-fee-prioryear]] (`:any` baru meng-un-suppress SELURUH berkas).

## Utang yang sengaja ditinggalkan di `view_firmgl.tsx`

`<span onClick>` tinggal nol, tapi 4 elemen non-interaktif ber-`onClick` masih ada — semuanya **navigasi/seleksi, bukan mutasi data**: daftar akun (Buku Besar), `<tr>` Neraca Saldo, kartu CoA, `<tr>` AR.

~~`FirmJVForm` merakit `position:fixed` tangan~~ → **DITUTUP PR #246**, lihat [[asseris-firmjvform-overlay-contract]] — migrasi itu sekaligus membongkar 3 pelanggaran critical axe yang bersembunyi karena dialognya tak pernah dapat dipindai. Rujukan primitif: [[asseris-overlay-contract-arc]].
