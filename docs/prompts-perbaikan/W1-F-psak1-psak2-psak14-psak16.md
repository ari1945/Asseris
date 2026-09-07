# W1-F — `psak1` · `psak2` · `psak14` · `psak16` (kertas kerja PSAK tersegel)

**Berkas yang DIMILIKI paket ini:**
`migration/src/view_psak1.tsx` · `view_psak2.tsx` · `view_psak14.tsx` ·
`view_psak16.tsx` · `view_psak14_nrv.tsx` · `view_psak16_register.tsx`
\+ `migration/src/w1f_psak_write_scope.test.ts` (baru).

**Diverifikasi ulang 2026-08-28 terhadap `origin/master` = `8a8cc54`** — semua situs
masih hidup pada nomor baris di bawah; nol berkas paket ini tersentuh gelombang W0
(#318–#322).

| Berkas | Baris | Isi |
|---|---|---|
| `view_psak1.tsx` | 137 · 138 · 167 | `client = firm.activeClient \|\| {name:'PT Sentosa Makmur Tbk'}` · `eng = firm.activeEngagement \|\| {id:'ENG-2025-014', fy:'FY2025'}` · `scopeId: eng?.id` |
| `view_psak2.tsx` | 128 · 129 · 142 | idem (`psak2-kk-cf`) |
| `view_psak14.tsx` | 121 · 122 · 143 | idem (`psak14-kk-c`) |
| `view_psak16.tsx` | 162 · 163 · 176 · 178 | idem (`fixed-asset-register`) + `firm: 'KAP Wijaya…'` |

## Mengapa paket ini kelasnya berbeda

Ini bukan "salah di layar". `scopeId: eng?.id` diteruskan ke `exporter.seal.mutate`
dan `exporter.logEvent.mutate`. Ketika tak ada perikatan aktif, fallback membuat
`scopeId` menjadi **`'ENG-2025-014'` — sebuah perikatan NYATA milik klien lain.**
Kertas kerja PSAK 1 / PSAK 2 / PSAK 14 / PSAK 16 karena itu **terarsip di berkas
audit klien yang salah**, lengkap dengan segel Ed25519 dan baris jejak audit yang
menyatakannya sah.

RBAC server **tidak akan menangkapnya**: `ENG-2025-014` adalah perikatan sah yang
boleh diakses pengguna, jadi `assertEngagementAccess` lolos dan tulisannya diterima.
Yang tertinggal adalah bukti yang tampak absah pada berkas yang salah — pelanggaran
isolasi W7.5 dengan konsekuensi jejak audit permanen.

**Jawaban yang benar sudah diputuskan dan sudah mendarat**: PR #317 (`405cc67`)
menutup kelas yang sama untuk lampiran SA 580/720 dengan `attachment_scope.ts` —
tanpa perikatan aktif, **TOLAK menulis**, jangan memilihkan perikatan. Baca
`migration/src/attachment_scope.ts` dan `view_sa580.tsx` sebelum menulis satu baris.

> **Lingkup sengaja dibatasi empat modul.** Dua belas modul PSAK sisanya memikul pola
> yang sama dan kini dikerjakan paket **W1-G** (`psak19/22/24/25/46/48`) dan **W1-H**
> (`psak58/65/66/68/71/72`) secara paralel. Menutup 16 sekaligus adalah PR yang tak
> bisa direviu. **Jangan menyentuh berkas mereka.**

---

## Prompt (salin seluruh blok ini sebagai pesan pertama di sesi baru)

```
Kamu mengerjakan Asseris (aplikasi audit KAP, Bahasa Indonesia).

Baca berurutan sebelum menyentuh kode:
1. CLAUDE.md di root repo.
2. docs/PROMPT-PERBAIKAN-MODUL.md BLOK-A (preamble tetap).
3. docs/prompts-perbaikan/W1-00-IDENTITAS-TERSEGEL.md — §4 kelas WRITE-PATH,
   §5 larangan, §6 bentuk gerbang. Wajib.
4. docs/prompts-perbaikan/W1-F-psak1-psak2-psak14-psak16.md — berkas ini.
5. migration/src/attachment_scope.ts + view_sa580.tsx — PRESEDENS PERILAKU dari
   PR #317 untuk kelas cacat yang sama persis. Tiru keputusannya: TOLAK MENULIS.

TUGAS: kertas kerja tersegel di modul psak1 (penyajian LK), psak2 (arus kas),
psak14 (persediaan), psak16 (aset tetap).

BERKAS YANG BOLEH KAMU SENTUH — HANYA INI:
  migration/src/view_psak1.tsx
  migration/src/view_psak2.tsx
  migration/src/view_psak14.tsx
  migration/src/view_psak16.tsx
  migration/src/view_psak14_nrv.tsx          (hanya bila benar-benar terdampak)
  migration/src/view_psak16_register.tsx     (hanya bila benar-benar terdampak)
  migration/src/w1f_psak_write_scope.test.ts (baru)
⛔ view_psak19/22/24/25/46/48 milik paket W1-G; view_psak58/65/66/68/71/72 milik
   W1-H. Cacatnya IDENTIK — justru karena itu jangan "sekalian" menutupnya: dua sesi
   lain sedang menyunting berkas-berkas itu sekarang. Tujuh sesi lain berjalan paralel.

CACAT — JALUR TULIS, bukan tampilan:

  const client = firm.activeClient    || { name: 'PT Sentosa Makmur Tbk' };
  const eng    = firm.activeEngagement || { id: 'ENG-2025-014', fy: 'FY2025' };
  ...
  scopeId: eng?.id      // → exporter.seal.mutate + exporter.logEvent.mutate

  psak1:137,138,167 · psak2:128,129,142 · psak14:121,122,143 · psak16:162,163,176
  psak16:178 juga membawa `firm: 'KAP Wijaya Hartono & Rekan'`.

Tanpa perikatan aktif, kertas kerja tersegel MENDARAT DI BERKAS AUDIT KLIEN LAIN
(ENG-2025-014 adalah perikatan NYATA). RBAC server tidak menangkapnya — perikatan
itu sah dan boleh diakses, jadi tulisannya diterima dan tercatat permanen.

YANG HARUS DIKERJAKAN:

1. Cabut kedua fallback. Tanpa perikatan aktif / tanpa klien aktif ⇒ ekspor TIDAK
   TERBIT: tombol disabled, alasan terbaca di title, dan eksporter tidak dipanggil
   sama sekali — termasuk tidak memanggil logEvent. (Metadata pun akan mendarat di
   berkas yang salah; PR #317 sudah memutuskan ini.)
   JANGAN memilihkan perikatan lain. JANGAN mengganti literal dengan literal lain.

2. IDENTITAS FIRMA — dan perhatikan bahwa BENTUKNYA BERBEDA antar berkas:
     psak16:178  firm: 'KAP Wijaya Hartono & Rekan'                    ← literal telanjang
     psak1:169 · psak2 · psak14                                        ← FALLBACK:
       firm: (AMS && (AMS.FIRM as {name?:string}|undefined)?.name) || 'KAP Wijaya…'
   Verifikasi keempatnya sendiri; jangan menganggap satu bentuk berlaku untuk semua.
   → useFirmName() dari './firm_identity' (SUDAH ADA di master; JANGAN diubah).
     Cadangan ke AMS.FIRM ikut DICABUT — bukan hanya literalnya. Alasannya ada di
     KEPALA firm_identity.ts (baca, jangan hanya lihat tanda tangannya): AMS.FIRM
     adalah objek yang SAMA dengan useAuth().firm, jadi cadangannya nol informasi dan
     hanya membuat keadaan "identitas tak tersedia" mustahil tercapai — sehingga
     penjaga disabled pada tombol ekspor jadi kode mati yang tak bisa diuji.
     Tiru bentuk view_firmtreasury.tsx:131,165,187.

3. Periksa apakah `client`/`eng` juga dipakai di LAYAR (header modul). Bila ya,
   tanpa konteks tampilkan em-dash — bukan nama, bukan nomor.

⛔ LARANGAN
- Jangan membuat helper scope baru bila attachment_scope.ts sudah cukup. Bila ia
  TIDAK cukup (bentuk ekspor berbeda dari unggahan lampiran), boleh membuat SATU
  helper baru MILIK PAKET INI — beri nama yang jelas dan jangan mengubah
  attachment_scope.ts.
- Jangan mengubah firm_identity.ts, attachment_scope.ts, export_pdf.ts,
  export_xlsx.ts, contexts.tsx, persist_scope.ts, server/src/router.ts.
- ⛔ JANGAN menyentuh contexts.tsx:927 / persist_scope.ts DEFAULT_ENG_ID. Cacat itu
  NYATA dan lebih besar (setiap kertas kerja berlingkup perikatan lewat
  useAmsPersist jatuh ke ENG-2025-014 saat konteks kosong) — tetapi ia menyentuh
  semua kunci persist sekaligus dan MENUNGGU KEPUTUSAN ARI. Laporkan, jangan sentuh.
- Angka PSAK (persediaan, NRV, roll-forward NBV, arus kas) adalah turunan kanon.
  Jangan menyentuhnya. Paket ini HANYA tentang identitas & lingkup penulisan.
- Gerbangmu memindai HANYA berkas milik paket ini — jangan sensus repo-wide.
- Jangan menyentuh migration/eslint-suppressions.json. `:any` baru = lint merah.

GERBANG (bentuk lengkap di W1-00 §6), dan §1 adalah yang menentukan:
§1 PERILAKU — tanpa perikatan aktif, eksporter TIDAK PERNAH dipanggil (bukan
   "dipanggil dengan scopeId kosong"), termasuk saat server absen. Dengan perikatan
   aktif, scopeId ADALAH perikatan itu: DUA perikatan berbeda ⇒ DUA scopeId berbeda.
   Uji terakhir inilah yang membuktikan ia bukan konstanta — tanpa itu, gerbang yang
   hanya memeriksa "scopeId tidak sama dengan 'ENG-2025-014'" bisa hijau atas kode
   yang memakai konstanta lain.
§2 SUMBER — pindai HANYA berkas milik paket ini, komentar dibuang dulu: nol
   'ENG-2025-', nol 'PT Sentosa', nol 'KAP Wijaya'.
   ⚠ Tulis regex sebagai literal /.../, jangan dirakit dari string/template —
   escape-nya lenyap dan polanya tak pernah cocok. ⚠ toMatchObject({p:/re/}) SELALU
   lolos. ⚠ grep -c membaca komentar sebagai kode.
§3 ANTI-TAUTOLOGI — mutasi tiap situs balik ke bentuk cacatnya dan tuntut §1 DAN §2
   gagal. Presedens: gerbang #317 menjatuhkan 3 uji saat engId dimutasi balik.

Buktikan gerbang MERAH dulu:  git stash && npm test -- w1f_psak_write_scope → gagal
                              git stash pop

SELESAI BILA:
[ ] Output merah gerbang pada kode LAMA ditempel di deskripsi PR
[ ] Empat modul: nol fallback perikatan/klien; tanpa konteks ⇒ ekspor tidak terbit
    dan logEvent TIDAK dipanggil
[ ] Keempat situs identitas firma memakai useFirmName(); cadangan AMS.FIRM dicabut
[ ] Uji "dua perikatan ⇒ dua scopeId" ADA dan hijau
[ ] contexts.tsx / persist_scope.ts TIDAK berubah (tunjukkan git status)
[ ] `npm run verify` dari root HIJAU
[ ] Deskripsi PR menyebut secara eksplisit bahwa DEFAULT_ENG_ID di lapisan persist
    menunggu keputusan Ari, dan apa lagi yang TIDAK dikerjakan
```
