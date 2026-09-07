---
name: asseris-prisma-client-worktree-trap
description: Klien Prisma memanggang direktori skema — generate dari worktree membuat SELURUH uji backend memakai test.db pohon lain
metadata: 
  node_type: memory
  type: reference
  originSessionId: 3e2644b1-aae7-4a82-8bf3-d8e6da21ece1
  modified: 2026-08-15T14:59:28.888Z
---

**Gejala:** 34 uji backend (`server/src/__tests__/state.test.ts` dkk) gagal dengan
`version-mismatch:server=0`. Tak ada berkas `server/` yang berubah. Verify hijau
satu jam sebelumnya. Provider Prisma cocok. `test.db` "dibuat ulang tiap jalan".

**Sebab:** Prisma Client **memanggang direktori skema asal generasinya** ke dalam
`node_modules/.prisma/client/index.js` (`"sourceFilePath": "<abs>/schema.prisma"`),
dan **setiap path SQLite relatif** (`file:./test.db`, `file:./dev.db`) diselesaikan
relatif terhadap direktori ITU — **bukan** terhadap cwd proses.

Sesi lain menjalankan `prisma generate` di dalam git worktree. `server/node_modules`
dibagi antar-worktree, jadi klien di pohon UTAMA ikut menunjuk
`.claude/worktrees/<nama>/server/prisma`. Seluruh uji backend lalu membaca-menulis
`test.db` MILIK WORKTREE ITU — berkas yang `globalSetup` tak pernah reset (ia mereset
`server/prisma/test.db` di pohon ini). StateDoc & riwayat lama menumpuk ⇒ jalur create
menabrak baris yang ada ⇒ gagal sebagai konflik.

**Diagnosis cepat (30 detik):**
```
npx tsx -e "process.env.DATABASE_URL='file:./test.db';
const {prisma}=await import('./src/db');
console.log((await prisma.\$queryRawUnsafe('PRAGMA database_list')).map(r=>r.file));"
```
Atau langsung: `grep -ao "worktrees[\\/][a-z0-9-]*" server/node_modules/.prisma/client/index.js`

**TIDAK bisa dilewati lewat env.** `server/vitest.config.ts` menetapkan
`env: { DATABASE_URL: 'file:./test.db' }`, yang MENIMPA env proses — menyuntik
`DATABASE_URL` absolut dari shell tak berpengaruh sama sekali (dicoba 2026-08-22:
34 gagal sebelum & sesudah). Satu-satunya jalan adalah memanggang ulang klien.

**Sopan-santun:** sesudah menjalankan gerbang dari worktree, **panggang ulang ke pohon
utama** (`cd <pohon-utama>/server && npx prisma generate`) — kalau tidak, sesi lain
mewarisi 34 kegagalan yang bukan miliknya.

**Perbaikan:** `cd server && npx prisma generate` dari pohon utama. Bila EPERM di
Windows ⇒ ada proses memegang `query_engine-windows.dll` (server dev) — hentikan dulu.
Catatan: `generate` sempat menulis ulang berkas JS-nya **sebelum** gagal pada DLL,
sehingga path sudah benar walau perintahnya keluar error.

**Gerbang (sejak `1c4a0a7`):** `tools/ensure-prisma-client.mjs` kini memeriksa
direktori skema terpanggang, bukan hanya provider.

## ⚠️ 2026-08-27/28 — gerbang itu BENAR; JENDELANYA yang salah

**KOREKSI.** Versi pertama catatan ini menyatakan `bakedSchemaDir()` buta karena kunci
`"sourceFilePath"` hilang di Prisma 6.19.3. **Itu SALAH dan sudah dicabut.** Yang buta
adalah grep diagnostiknya: saya mencari `"sourceFilePath":"` **tanpa spasi** sesudah
titik dua, sedangkan Prisma menulis `"sourceFilePath": "`. Nol hasil ⇒ kesimpulan
keliru. Regex gerbangnya sendiri memakai `\s*:\s*` dan cocok sempurna — diverifikasi
dengan menjalankannya atas berkas sungguhan.

**Cacat sesungguhnya: pemeriksaan SEKALI atas keadaan bersama yang BERUBAH.**
`ensure-prisma-client` berjalan di langkah 1 dari 12 `npm run verify`. Ia benar saat
berjalan (22:32: mendeteksi klien pohon lain, meregenerasi — berkas `.prisma/client/*`
bertanggal 22:32 adalah jejaknya). Lalu pipeline berjalan belasan menit; sesi `w0-hcm`
paralel memanggang ulang klien BERSAMA ke worktree mereka; dan `backend tests` di
langkah 12 membaca `test.db` pohon itu. `db push` mencetak "Your database is now in
sync" di detik yang sama — CLI dan Client menulis-membaca DUA berkas berbeda.

**Pelajaran yang bisa dipindah:** gerbang yang memeriksa keadaan BERSAMA di awal
pipeline panjang tidak menjamin apa pun di titik pakai. Ulangi pemeriksaannya di
tempat keadaan itu benar-benar dipakai — dan di sana ia harus MEMBANTAH, bukan
memperbaiki: dua `prisma generate` atas satu `node_modules` adalah tarik-menarik yang
diam-diam mematahkan sesi lain.

**DITUTUP — PR #327 `8ce8e8e` (2026-08-28), hijau di keempat workflow master:** `--check` (periksa saja, nol tulisan) dipanggil
`server/src/__tests__/globalSetup.ts` sebelum suite jalan · penanda TAK TERBACA kini
MERAH, bukan diam-diam OK · `server/node_modules` yang berupa junction ke luar pohon
disebutkan berikut resep isolasinya · `--root` supaya gerbangnya bisa diuji atas pohon
palsu, dan `prisma_client_origin.test.ts` MEMAKSANYA MERAH pada lima sebab berbeda —
termasuk jebakan substring historisnya.

## Saran "panggang ulang ke pohon utama" SALAH bila sesi berjalan PARALEL

Memanggang ulang adalah tarik-menarik: siapa pun yang `generate` terakhir diam-diam
mematahkan seluruh sesi lain, dan karena gerbangnya buta, korbannya melihat 19–34
kegagalan uji backend yang tak menunjuk sebabnya. Dengan 4 sesi W0 + 6 paket W1
berjalan bersamaan, satu klien bersama tak cukup untuk semuanya.

**Yang benar: ISOLASI, bukan rebut-rebutan.** Beri worktree itu `server/node_modules`
sendiri (~2 menit, 130 paket) dan klien bersama tak tersentuh:
```
cd <worktree>/server
rm -f node_modules            # lepas junction (symlink); PowerShell Remove-Item terblokir untuk path ber-spasi
npm ci --no-audit --no-fund
node node_modules/prisma/build/index.js generate --schema prisma/schema.prisma
```
Sesudah itu `npm run verify` dari worktree hijau penuh tanpa mengganggu siapa pun.
Junction `node_modules` root & `migration/` boleh tetap dibagi — hanya Prisma yang
memanggang path.

## Dua pelajaran yang lebih luas

1. **Pesan galat yang membuang sebab membuat diagnosis berlipat.** `state.set`
   menimpa pesan galat dalam dan selalu melaporkan `version-mismatch:server=<n>`;
   penyebab sesungguhnya (`create-race` dari P2002) tak pernah sampai ke permukaan.
2. **Gerbang yang belum pernah terlihat MERAH belum membuktikan apa pun.** Versi
   pertama pemeriksaan ini memakai `includes('server/prisma')` — dan path worktree
   JUGA mengandung itu, jadi ia lolos. Ketahuan hanya karena saya memalsukan path
   terpanggang untuk memaksa gerbangnya gagal sebelum dipercaya. Bandingkan
   **prefiks absolut**, bukan substring.

Terkait: [[asseris-sales-pipeline-arc]] · [[asseris-checkpoint-2026-08-14]]
(worktree + junction `node_modules`).

---

## 2026-08-28 — PRASYARATNYA DICABUT: nol junction `server/node_modules` tersisa

Seluruh **13 worktree** kini memikul `server/node_modules` NYATA. Diverifikasi bukan
oleh laporan skripnya sendiri melainkan oleh gerbang R-6 dijalankan di tiap pohon
(`node <pohon>/tools/ensure-prisma-client.mjs --check`): 13/13 `OK`, **nol** yang
mencetak `DIBAGI`, dan path terpanggang tiap klien menunjuk pohonnya sendiri.

Balapan yang melahirkan seluruh catatan ini karena itu **tak lagi punya prasyarat**.

**Biaya sebenarnya jauh lebih murah dari dugaan awal.** Perkiraan pertama 575 MB per
pohon ternyata salah: 182 MB di antaranya SAMPAH — sembilan salinan
`query_engine-windows.dll.node.tmp<pid>` @20 MB, semuanya bertanggal identik, jejak
SATU `prisma generate` yang kena EPERM. Windows Prisma menulis engine ke nama
sementara lalu me-rename; tiap percobaan yang gagal meninggalkan 20 MB dan **tak ada
yang membersihkannya**. Sesudah dibersihkan: **393 MB per pohon**, total ~2,2 GB
untuk tujuh isolasi.

Aman dihapus bila ketiganya benar (periksa, jangan asumsikan):
`query_engine-windows.dll.node` asli ada · nol `.tmp*` berumur < 1 jam (tak ada yang
sedang ditulis) · `grep -c "tmp[0-9]"` atas `.prisma/client/*.js` = 0. Sesudahnya
buktikan kliennya masih HIDUP, bukan sekadar berkasnya ada — buka DB dan hitung tabel.

**Sinyal "worktree sedang dipakai" yang MENYESATKAN:** nol berkas `migration/src`
tersentuh 6 jam terakhir TIDAK berarti sepi — tiga `npm run verify` sedang berjalan
saat itu. Yang benar: periksa artefak yang hanya lahir saat verify berjalan
(`server/prisma/test.db`, `migration/dist`, `server/coverage`) dalam 30 menit terakhir.
