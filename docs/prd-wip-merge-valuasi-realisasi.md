# PRD — Penggabungan `wip` (WIP · Valuasi) + `wipreal` (WIP · Realisasi) menjadi satu modul

> **Status:** **In Progress** — "Proceed." 2026-08-15. Q-1 = `wip` · Q-2 = **Operasi Praktik**
> · Q-3 = **Opsi A** (dua terakhir didelegasikan: "berikan saya terbaik").
> Fase 1–4 (kode) SELESAI, `npm run verify` hijau. **SC-9 (tinjauan visual hidup) TERBUKA.**
> Tanggal: 2026-08-15 · Cabang: `feat/wip-merge-valuasi-realisasi` (off `master`).
> Pemicu: permintaan langsung — "gabung wipreal dan wip jadi satu modul".

---

## Problem

Dua route menyajikan **sub-buku WIP yang sama**:

| | `wip` — "WIP · Valuasi" | `wipreal` — "WIP · Realisasi" |
|---|---|---|
| View | `view_firmfinance.tsx:391` `WIPValuation` | `view_wip_firm.tsx:25` `WIPRealization` |
| Grup nav | Operasi & Administrasi Firma ([icons.tsx:296](../migration/src/icons.tsx:296)) | Operasi Praktik ([icons.tsx:108](../migration/src/icons.tsx:108)) |
| Mesin | `FIRMFIN.wip(ctx, provFactor, liveByEng)` | `FIRMFIN.wip(ctx, undefined, liveByEng)` |

Keduanya menarik dari `useFirmWip()` → `FIRMFIN.wip()` — **satu mesin, dua etalase**. Kode
sumber di kedua sisi sudah menyadari kekembaran ini dan mencoba menutupinya dengan chip
("Sinkron WIP Valuation", "Satu sumber kebenaran") dan tombol saling-lompat, bukan dengan
menghapus duplikasinya.

### Duplikasi yang nyata (bukan "dua sudut pandang")

Yang benar-benar **hanya ada di `wipreal`**: agregasi **per-Partner**, dan aksi
**write-down manual**. Sisanya tumpang tindih dengan `wip`:

- KPI headline: `Saldo WIP` · `Realisasi Rata-rata` · `Margin Rata-rata` — **identik**, beda
  hanya `wip` menambah 2 KPI (Recoverable Neto, Penyisihan).
- Tabel register per-perikatan — **kolom hampir identik** (`wipreal` 8 kolom, `wip` 10 kolom
  superset: + Penyesuaian, + Umur).
- Panel detail waterfall rekonsiliasi — **dua salinan komponen yang nyaris sama**
  (`WipDetail` di `view_wip_firm.tsx:228` vs `WipValDetail` di `view_firmfinance.tsx:616`);
  `Line` helper di-copy-paste utuh.
- Panel "Realisasi vs Target · target firma 95%" + Donut — **dua salinan literal**.
- Panel aging — `wipreal` menampilkan bar aging; `wip` menampilkan matriks aging yang sama
  plus tarif penyisihan.
- Ekspor XLSX — dua berkas berbeda dari register yang sama
  (`Laporan WIP & Realisasi.xlsx` vs `Valuasi WIP Perikatan.xlsx`).

### Tiga cacat yang ditemukan saat audit (ini yang menaikkan urgensi)

**C-1 — `wip.adj` adalah angka WIP kedua yang tak terlihat siapa pun.**
`view_wip_firm.tsx:30` menyimpan write-down manual di `useAmsPersist('wip.adj', {})` lalu
**menghitung ulang** `recoverable`/`wip`/`realization`/`margin` secara lokal
(`view_wip_firm.tsx:43-51`). Nilai ini **tidak pernah masuk** ke `FIRMFIN.wip()`
([data_firmfin.ts:75](../migration/src/data_firmfin.ts:75) hanya menerima `ctx`, `provFactor`,
`liveByEng`). Akibatnya, setelah pengguna melakukan write-down:

- WIP Valuation (`wip`), Firm Dashboard ([view_dashboard2.tsx:135](../migration/src/view_dashboard2.tsx:135)),
  cockpit Beranda ([view_home_cockpit.tsx:257](../migration/src/view_home_cockpit.tsx:257)),
  ikhtisar Firm Finance ([view_firmfinance.tsx:37](../migration/src/view_firmfinance.tsx:37))
  — **semuanya tetap menampilkan angka lama**.
- Ini persis kelas cacat yang `useFirmWip` dibuat untuk membunuh (lihat komentarnya di
  [use_firm_wip.ts:8-17](../migration/src/use_firm_wip.ts:8)) — dan lolos lewat pintu belakang.

**C-2 — `wipreal` bertentangan dengan dirinya sendiri di layar yang sama.**
Tabel register memakai baris ber-`adj`, tetapi panel "Umur WIP Belum Tertagih" di bawahnya
memakai `W.aging` mentah (`view_wip_firm.tsx:104`) yang **tidak** ber-`adj`. Begitu satu
write-down diterapkan, dua panel bertetangga di satu layar menunjukkan basis berbeda —
tanpa peringatan apa pun.

**C-3 — write-down manual melewati antrean persetujuan.**
[data_platform.ts:256](../migration/src/data_platform.ts:256) membangkitkan approval
`WIP Write-off` untuk `writeDown >= Rp 100 jt` **dari seed `AMS.WIP_ENG`**. Write-down yang
dilakukan pengguna lewat UI (`wip.adj`) berapa pun besarnya **tidak pernah** menghasilkan item
persetujuan — padahal secara ekonomi tindakannya sama. Gate yang ada hanya RBAC
(`CAP.FIRMFIN_EDIT`, `view_wip_firm.tsx:35`), bukan otorisasi berjenjang.

### Kenapa ini merugikan

1. **Pelanggaran SSOT nyata** (C-1) — melanggar Aturan Emas §3.2 CLAUDE.md.
2. **Beban navigasi**: pengguna harus tahu bahwa "valuasi" dan "realisasi" adalah dua menu di
   **dua grup berbeda** untuk satu sub-buku. Dua tombol saling-lompat adalah gejala, bukan obat.
3. **Beban perawatan**: setiap perubahan format waterfall/donut/register harus disalin dua kali.
   `docs/PRD-USULAN-PENGEMBANGAN-E9-KEDALAMAN.md:118` sudah menandai `wipreal` sebagai modul
   dengan angka tak-berdasar-ledger.

---

## Objective

Satu modul WIP tunggal yang menjadi **satu-satunya etalase** sub-buku WIP firma: valuasi,
realisasi, penyisihan, mutasi, dan rekonsiliasi GL — dengan write-down manual yang **masuk ke
SSOT** sehingga seluruh konsumen hilir melihat angka yang sama.

---

## Success Criteria

| # | Kriteria | Cara verifikasi |
|---|---|---|
| SC-1 | Hanya ada **satu** entri WIP di `MODULES`; route lama tetap dapat dibuka (alias) | `icons.tsx` + uji route |
| SC-2 | Tidak ada komponen waterfall/donut/aging ganda — `WipDetail` & `WipValDetail` jadi satu | grep + tinjauan berkas |
| SC-3 | Write-down manual terlihat di **semua** konsumen `FIRMFIN.wip` | uji unit: terapkan adj → Dashboard, cockpit, Firm Finance, ekspor berubah |
| SC-4 | Tak ada dua panel dalam satu layar dengan basis berbeda (C-2 tertutup) | uji unit aging ber-`adj` |
| SC-5 | Write-down manual ≥ ambang batas membangkitkan item Approvals (C-3 tertutup) | uji unit `data_platform` |
| SC-6 | Satu ekspor XLSX menggantikan dua, tanpa kehilangan kolom | tinjauan sheet |
| SC-7 | Persist key `wip.adj` & `wip.provFactor` **tidak berubah nama** — data pengguna selamat | grep |
| SC-8 | `npm run verify` hijau; ratchet `:any` **tidak naik** | CI |
| SC-9 | Diverifikasi **hidup** (bukan hanya uji) — tinjauan visual modul gabungan | screenshot |

---

## Scope

1. **Modul gabungan** `view_wip.tsx` (berkas baru) + `view_wip_parts.tsx` bila melewati ambang
   ukuran — struktur 4 tab:
   - **Valuasi Perikatan** — sub-buku register (superset 10 kolom) + panel detail waterfall.
   - **Realisasi & Margin** — Seg `Perikatan | Partner`, donut realisasi vs target 95%, aksi write-down.
   - **Pemulihan & Penyisihan** — matriks aging, `provFactor` (preset + slider).
   - **Mutasi & Sumber Kebenaran** — roll-forward, jembatan kontrol GL 1-300, chip provenansi.
2. **Nav & routing** — satu entri `MODULES`; `lazy_views.tsx`; alias route lama; `MODULE_INDEX`.
3. **SSOT `wip.adj`** — naikkan overlay write-down ke `FIRMFIN.wip()` sebagai parameter
   `adjByEng`, sehingga seluruh konsumen membacanya (menutup C-1 & C-2).
4. **Gate persetujuan write-down manual** (menutup C-3).
5. **Rujukan hilir** — `LINEAGE` (`related_modules_data.ts` & `_data2.ts`), `view_platform.tsx:60`
   (peta approval → route), `view_home.tsx:32` (kartu peran Finance Firma), chip provenansi
   `view_firmfinance.tsx:594`, `shell.tsx:156` (kamus pencarian).
6. **Ekspor** — satu XLSX, 2 sheet (Register Valuasi · Realisasi per Partner).
7. **Uji** — unit untuk SC-3/SC-4/SC-5; pembaruan uji route yang ada.

## Non-Scope

- **Mengubah mesin `FIRMFIN.wip()` di luar penambahan parameter `adjByEng`.** Angka valuasi,
  matriks penyisihan, dan roll-forward tetap seperti sekarang.
- Memperbaiki `additions = 10_400_000_000` yang literal dan `opening` yang merupakan **plug**
  ([data_firmfin.ts:135-136](../migration/src/data_firmfin.ts:135)) — cacat nyata, tetapi
  arc terpisah (sudah tercatat di PRD-USULAN-PENGEMBANGAN-E9).
- Menggabungkan modul WIP dengan `revenue`/`billing`/`firmfinance`.
- Mengubah `WIP_ENG` seed atau skema server.
- Migrasi tab beralamat (URL `?tab=`) — bergantung pada PRD V-9 ([#220](https://github.com/ari1945/Asseris/pull/220)) yang belum di-sign-off.

## Constraints

- CLAUDE.md §3.2 (SSOT), §5 (skala tipografi 8 ukuran, token warna), §7 (kontrol native), §4
  (checklist modul baru).
- Ratchet `:any` — kedua view sumber **penuh** `any`; berkas gabungan tidak boleh menambah
  `:any` baru (lint error). Bila jumlah `:any` turun, jalankan `npm run lint:any-baseline`.
- Gerbang budget bundle di CI — berkas gabungan berpotensi besar; siapkan pemecahan `_parts`.
- `master` SELALU HIJAU (R-7).
- Persist key adalah data pengguna — dilarang di-rename (SC-7).

## Existing Solutions (dicek sebelum mengusulkan pekerjaan baru)

- `useFirmWip()` **sudah** menjadi SSOT hook — dipakai keduanya. Tidak perlu hook baru.
- `FIRMFIN.wip()` **sudah** menghitung semua yang dibutuhkan kedua view (`registerAll`, `aging`,
  `movement`, `bridge`, `provisionTotal`). Modul gabungan **tidak** butuh mesin baru — hanya
  satu parameter tambahan.
- Pola tab `<Tabs>` + `useInitialTab` sudah ada; pola alias route perlu dicek apakah sudah ada
  preseden di `route_hash.ts` (bila belum → mekanisme minimal, lihat Q-1).

**Kesimpulan: ini pekerjaan konsolidasi UI + satu perbaikan SSOT, bukan pembangunan mesin baru.**

---

## Proposed Approach

### Fase 1 — Merge UI (tanpa perubahan angka)
Berkas baru `view_wip.tsx` mengekspor `WIPModule`. Ambil struktur 3 tab `WIPValuation` sebagai
kerangka, sisipkan tab **Realisasi & Margin** dari `WIPRealization` (Seg Perikatan/Partner +
donut + aksi write-down). Buang duplikat: `WipDetail` dilebur ke `WipValDetail` (satu komponen
menerima prop `canEdit`/`onWriteDown`), panel aging `wipreal` dibuang (matriks di tab Pemulihan
lebih kaya), donut "Realisasi vs Target" tersisa satu. Hapus `view_wip_firm.tsx` dan
`WIPValuation` dari `view_firmfinance.tsx`.

### Fase 2 — `wip.adj` naik ke SSOT (menutup C-1, C-2)
`FIRMFIN.wip(ctx, provFactor, liveByEng, adjByEng)` — `adjByEng` menambah `writeDown` per baris
**sebelum** `recoverable`/`unbilled`/`realization`/`margin`/`aging`/`movement` diturunkan.
`useFirmWip(provFactor)` membaca `wip.adj` sendiri sehingga **semua** pemanggil hook
otomatis konsisten tanpa perubahan di sisi mereka. Modul WIP berhenti menghitung ulang secara lokal.

### Fase 3 — Gate persetujuan (menutup C-3)
Write-down manual ≥ ambang (usulan: mengikuti ambang seed `Rp 100 jt`) membangkitkan item
`WIP Write-off` di antrean Approvals, dengan rantai `Audit Manager → Managing Partner` seperti
jalur seed. Ambang & rantai diangkat ke satu konstanta yang dipakai bersama `data_platform.ts`.

### Fase 4 — Rujukan, uji, verifikasi hidup
Sapu seluruh rujukan (daftar di Scope §5), tulis uji SC-3/4/5, jalankan `npm run verify`,
lalu **buka aplikasi** dan tinjau modul gabungan secara visual (SC-9 — memori arc sebelumnya
menunjukkan berulang kali bahwa gerbang hijau tidak membuktikan layar benar).

---

## Risks

| # | Risiko | Mitigasi |
|---|---|---|
| R-1 | Deep-link/bookmark `#/wipreal` (atau `#/wip`) rusak | Alias route → survivor (Q-1); jangan hapus id lama di rilis ini |
| R-2 | Item Approvals lama ber-`sourceRoute: 'wipreal'` jadi tak dapat dibuka | `view_platform.tsx:60` dipetakan ke survivor; alias menutup sisanya |
| R-3 | Fase 2 mengubah angka yang tampil di Dashboard/cockpit — terlihat seperti regresi | Justru perbaikan; dokumentasikan di PR, dan `wip.adj` kosong pada seed → nol delta pada demo bersih |
| R-4 | Berkas gabungan besar → melanggar gerbang bundle & pedoman §8 | Pecah ke `view_wip_parts.tsx`, tetap lazy |
| R-5 | Regresi snapshot bila menyentuh AMS_CANON | `FIRMFIN` bukan `AMS_CANON`; tetap jalankan `canon_regression.test.ts` |
| R-6 | Dua entri `LINEAGE.wipreal` (`related_modules_data.ts:391` **dan** `_data2.ts:318` — yang kedua menimpa) sudah membingungkan | Bersihkan jadi satu entri survivor sekalian |
| R-7 | Fase 2–3 memperluas cakupan di luar "sekadar merge" | Boleh dipecah jadi 2 PR (Fase 1 lebih dulu), lihat Q-3 |

---

## Implementation Plan

| PR | Isi | Gerbang |
|---|---|---|
| PR-1 | Fase 1 — merge UI, alias route, sapu rujukan, uji route | `verify` hijau |
| PR-2 | Fase 2 — `adjByEng` masuk `FIRMFIN.wip`, uji SC-3/SC-4 | `verify` + snapshot kanon |
| PR-3 | Fase 3 — gate persetujuan write-down, uji SC-5 | `verify` |
| — | Fase 4 — tinjauan visual hidup + pembaruan `docs/PRD-REGISTRY.md` → Implemented | screenshot |

---

## Open Questions

**Q-1 — Route id mana yang bertahan, dan apakah perlu alias?**
Rekomendasi: **`wip` bertahan** (modul yang lebih dalam; id lebih bersih dan mencakup kedua
makna), label **"WIP · Valuasi & Realisasi"**, dan **`wipreal` dipertahankan sebagai alias
redirect** minimal satu rilis demi bookmark + `sourceRoute` approval lama. Alternatif: buang
`wipreal` bersih-bersih dan tulis ulang semua rujukan (lebih rapi, lebih berisiko bagi tautan
yang sudah beredar).

**Q-2 — Grup nav tujuan?**
Rekomendasi: **Operasi Praktik**. Alasan: modul ini ekonomi perikatan (jam → nilai → tagihan),
satu rantai dengan `delivery` → `billing`; dan peran `Finance Firma` sudah melihat grup ini
([icons.tsx:378](../migration/src/icons.tsx:378)). Konsekuensi: entri di
"Operasi & Administrasi Firma" hilang. Alternatif: taruh di "Operasi & Administrasi Firma"
(dekat `firmfinance`), tetapi itu menjauhkannya dari `billing`.

**Q-3 — Nasib `wip.adj` (write-down manual)?**
- **Opsi A (rekomendasi)** — naikkan ke SSOT + gate persetujuan (Fase 2 & 3). Menutup C-1, C-2,
  C-3. Biaya: menyentuh `data_firmfin.ts` & `data_platform.ts`, +2 PR.
- **Opsi B** — hapus fitur write-down manual; WIP jadi read-only, write-down hanya lewat data
  sumber. Termurah, menutup C-1/C-2/C-3 sekaligus, tetapi **menghapus kapabilitas** yang ada.
- **Opsi C** — biarkan sebagai overlay lokal. **Ditolak**: justru pembenaran utama merge adalah
  menghilangkan dua angka untuk satu sub-buku; Opsi C mempertahankan cacatnya.
