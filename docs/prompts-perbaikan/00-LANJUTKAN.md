# Prompt mulai sesi baru — lanjutkan arc "prompt perbaikan per modul"

> Salin seluruh blok di bawah sebagai pesan pertama di sesi baru.
> Berkas ini adalah serah-terima; perbarui bagian "Status" setiap kali sebuah prompt
> selesai dibuat atau dieksekusi.

---

```
Lanjutkan pekerjaan membuat PROMPT PERBAIKAN PER MODUL untuk Asseris.

Baca dulu, berurutan:
1. CLAUDE.md di root repo (aturan emas, gerbang, konvensi).
2. docs/PROMPT-PERBAIKAN-MODUL.md — TEMPLATE INDUK. Semua prompt dibuat dari sini
   (Blok A preamble + Blok B inti + adendum Blok C yang relevan + Blok D definisi selesai).
3. docs/prompts-perbaikan/00-LANJUTKAN.md — berkas ini: status, metode, dan konvensi
   yang sudah terbentuk.
4. docs/PRD-RINGKASAN-KEDALAMAN-E9.md dan docs/PRD-USULAN-PENGEMBANGAN-E9-KEDALAMAN.md —
   taksonomi kedalaman L0–L5 (taksonomi RUMAH; jangan bikin skala tandingan) dan
   program sistemik A–F.

TUGAS SAYA (Ari) AKAN BERUPA: "buat prompt untuk modul #<n> <nama>".
Satu permintaan = satu prompt = satu berkas docs/prompts-perbaikan/<nn>-<id>.md.

METODE YANG SUDAH TERBUKTI — IKUTI PERSIS:

A. INVESTIGASI DULU, SELALU. Jangan pernah menulis prompt dari nama modul atau dari
   katalog temuan lama. Buka berkasnya, baca, grep. Temuan E-9 bertanggal 2026-08-13
   dan SEBAGIAN BESAR SUDAH BASI — beberapa modul yang katalognya sebut P0 ternyata
   sudah diperbaiki (firmgl, fixedassets, cashbank, regref). Melaporkan cacat yang
   sudah tertutup lebih mahal daripada tidak melaporkan apa pun.

B. VERIFIKASI SETIAP KLAIM SEBELUM MENULISKANNYA. Saya pernah salah dua kali di arc
   ini dan keduanya karena menyimpulkan dari pola alih-alih membaca:
     · `A.byId()` saya kira melempar bila id tak ditemukan — ternyata ia punya fallback
       yang MENGARANG orang (`{ id, name: id, grade: 'Junior' }`), yang justru lebih
       berbahaya (data_people.ts:283);
     · `window.TAX23` saya kira rawan undefined karena view-nya lazy — ternyata
       penerbitnya diimpor eager di main.tsx:29, jadi cabang fallback-nya kode mati.
   Kalau sebuah klaim tidak bisa saya tunjukkan barisnya, klaim itu tidak masuk prompt.

C. TULIS APA YANG SUDAH BENAR, BUKAN HANYA YANG SALAH. Setiap prompt punya blok
   "KEADAAN AWAL YANG SUDAH DIVERIFIKASI (jangan diulang, jangan diperbaiki)". Tanpa
   itu, pengeksekusi akan merusak yang sudah benar — dan beberapa modul memang sudah
   sangat baik (regref, fixedassets, diagnostic engine, cashbank).

D. PISAHKAN "KERJAKAN" DARI "USULKAN". Apa pun yang mengubah kebijakan, metode
   akuntansi, alur kerja, atau MENGGESER ANGKA di banyak modul → pengeksekusi menulis
   usulan lalu BERHENTI. Tujuh usulan sudah terkumpul menunggu keputusan Ari; jangan
   biarkan agen memutuskannya sendiri.

E. SETIAP PROMPT WAJIB MEMUAT: gerbang yang harus MERAH dulu · larangan eksplisit
   (⛔) · batas modul tetangga bila berbagi berkas · definisi selesai berupa kotak
   centang · perintah melaporkan apa yang TIDAK dikerjakan.

F. HORMATI ARC YANG SUDAH DISETUJUI. docs/prd-firm-erp-deepening.md berstatus
   Approved dengan urutan mengikat PR-1 → PR-2 → PR-4, PR-3/5/6 independen setelah
   PR-2. PR-1 sudah mendarat (#258). Prompt TIDAK BOLEH menyelipkan PR-2..PR-6 —
   selalu larang eksplisit dan sediakan jalan keluar jujur ("kalau tidak bisa
   diselesaikan tanpa PR-2, katakan dan berhenti").

POLA CACAT YANG BERULANG DI REPO INI (cari ini lebih dulu di modul mana pun):
  1. Angka/fakta karangan disajikan sebagai data — dan gradasinya penting:
     tanpa pengakuan (jet, opening) · pengakuan terlalu luas (revenue) ·
     pengakuan terlalu sempit (treasury) · ditandai benar (firmtax chip SSOT).
  2. Pemanggil tak mengirim kunci ctx → mesin `ctx.x || bawaan` diam-diam pakai seed
     (apar, diagnostic). Cacatnya di PEMANGGIL, bukan mesin.
  3. Identitas pelaku jejak dari `AMS.USER` seed / fallback bernama ('Auditor',
     'Pengguna', dan yang terburuk: nama kolega nyata di diagnostics_panel).
     Obatnya `useCurrentAuditor()`.
  4. Klok: `new Date()` alih-alih `AMS.TODAY`; stempel tanpa tanggal.
  5. Id dari panjang array (`list.length + 1`) → tabrakan setelah penghapusan.
  6. Literal `'ENG-2025-014'` / `'KAP Wijaya Hartono & Rekan'` sebagai fallback
     pemilihan DATA atau di dalam ekspor TERSEGEL. (~94 situs/79 berkas untuk nama
     firma — sapuan repo-wide adalah PR tersendiri, jangan diselipkan.)
  7. Kontrol palsu `<tr|div|span onClick>` dan tombol tanpa `onClick`.
  8. Nilai yang berubah menurut kalender tanpa masa berlaku (kurs, CPE_REQ, tarif
     PPh badan) — rumahnya `regrefCatalog()`, bukan konstanta baru.
  9. Sesuatu dihitung lalu dibuang (contradicting di succession, c.low di diagnostic).

STATUS SAAT INI — lihat bagian "Status" di 00-LANJUTKAN.md dan VERIFIKASI ULANG dengan
`git log --oneline -15` dan `git status --short`. Beberapa prompt sudah dieksekusi sesi
paralel; berkas sumber bisa sudah berubah sejak prompt ditulis.

Mulai dengan mengonfirmasi: berapa prompt yang sudah ada, mana yang sudah dieksekusi,
dan berapa usulan yang menunggu keputusan saya. Lalu tunggu saya menyebut modul
berikutnya.
```

---

## Status (perbarui setiap sesi)

**Terakhir diperbarui:** 2026-08-24 · cabang `fix/timebudget-engagement-isolation` ·
HEAD `1059316` · `origin/master` `6e82d42`

### Urutan pengerjaan (7 gelombang)

Antrean per-modul sekarang punya urutan eksplisit. **Gelombang 0 mendahului semuanya**
— sembilan modul di [`../KEDALAMAN-158-MODUL-TERKINI.md`](../KEDALAMAN-158-MODUL-TERKINI.md)
bertanda basi (`※`) semata-mata karena pekerjaannya belum mendarat, dan prompt untuk
modul itu tidak boleh ditulis sebelum Gelombang 0 tuntas.

| Gel. | Isi | Status |
|---|---|---|
| **0** | Pengiriman & higiene repo — [`00-GELOMBANG-0-pengiriman.md`](00-GELOMBANG-0-pengiriman.md) | prompt siap |
| 1 | Tiga cacat terbersih: `spr2400` · `invprop` · `mgmtletter` | belum |
| 2 | Sembilan cangkang display-only — **satu keputusan produk** (kertas kerja vs `kb`) | butuh keputusan Ari |
| 3 | Empat kebocoran isolasi L4⚠️: `sjah3400/3402/3410/3420` (P0 keamanan data) | belum |
| 4 | 19 cacat ⚠ terbukti hidup di modul skor menengah | belum |
| 5 | Batch PSAK & SAK (27 modul, pola seragam) — mulai `newdisc` | belum |
| 6 | Sisa skor menengah tanpa ⚠ | belum |
| 7 | Arc `firm-erp` PR-2..PR-6 + `delivery` PR-4..PR-6 (urutan MENGIKAT) | Approved, belum |

### Prompt yang sudah dibuat (25)

`00-GELOMBANG-0-pengiriman` (bukan modul) ·
`01-home` · `03-cockpit` · `04-tasks` · `07-time` · `11-wip` · `12-billing` ·
`15-hcm` · `16-orgchart` · `19-succession` · `25-independence` · `27-regref` ·
`28-firmgl` · `29-apar` · `30-revenue` · `31-treasury` · `32-cashbank` ·
`33-fixedassets` · `34-firmtax` · `35-profitability` · `71-jet` · `72-diagnostic` ·
`75-opening` · `80-internalaudit` · `86-sa230`

### Usulan yang MENUNGGU KEPUTUSAN ARI (9)

> ⚠ Daftar di bawah menyebut 7; dua lagi lahir dari arc internalaudit dan belum masuk
> tabel: [`usulan-IA6`](../usulan-IA6-internalaudit-skor-dan-signoff.md) ·
> [`usulan-IA7`](../usulan-IA7-internalaudit-register-penggunaan-karangan.md).
> **Tiga di antaranya memblokir Gelombang 0** karena berkasnya sudah terlanjur
> ditulis: `M2` (`mytasks_derive.ts`, nol pemanggil) · `W1` (`wip_adj.ts`, nol
> pemanggil) · `O1b` (arc `opening`, 462 baris tersunting).

Semua sengaja tidak dikerjakan. Ini blokir nyata, bukan daftar ide.

| Berkas | Pertanyaan yang harus dijawab |
|---|---|
| [`usulan-M2-mytasks-sumber-kebenaran.md`](../usulan-M2-mytasks-sumber-kebenaran.md) | My Tasks jadi konsumen `tasks.mine`, atau `tasks.mine` diperluas? |
| [`usulan-TB3-bobot-fase-timebudget.md`](../usulan-TB3-bobot-fase-timebudget.md) | Bobot fase dari mana — taksonomi fase berbeda dengan `PHASE_BUDGET_WEIGHT` |
| [`usulan-W1-wip-writedown-otorisasi.md`](../usulan-W1-wip-writedown-otorisasi.md) | Write-down WIP: efek dulu, atau otorisasi dulu? |
| [`usulan-S1-gerbang-variabel-mati.md`](../usulan-S1-gerbang-variabel-mati.md) | Repo tak punya gerbang variabel mati — pasang? (lintas-berkas) |
| [`usulan-A3-apar-pembayaran-utang-ke-buku-besar.md`](../usulan-A3-apar-pembayaran-utang-ke-buku-besar.md) | Pembayaran utang memposting jurnal? Rekening kas mana, wewenang siapa? |
| [`usulan-J-jet-impor-gl-populasi.md`](../usulan-J-jet-impor-gl-populasi.md) | Impor GL — prasyarat agar corong JET bisa menyatakan cakupan |
| [`usulan-O1b-opening-kertas-kerja-per-perikatan.md`](../usulan-O1b-opening-kertas-kerja-per-perikatan.md) | Saldo awal jadi kertas kerja terisi auditor? |

### Modul yang belum dibuatkan prompt

Sisanya dari 158 modul di [`../../migration/src/icons.tsx`](../../migration/src/icons.tsx).
Yang layak didahulukan menurut kedalaman E-9 dan temuan sejauh ini:

- **#41 `relatedsvc`** — 12 baris, stub; **#134 `sakep`** — nol view (fallback ComplianceView)
- **#85 `sa200`**, **#100-103 `sa800`/`sa805`/`sa810`/`spr2400`**, **#91 `sa501`**,
  **#105 `sjah3000`** — cangkang display-only berukuran 300–500 baris; pertanyaannya
  produk (kertas kerja atau pindah ke Knowledge Base?), bukan teknis
- **#150 `records`**, **#38 `audittrail`**, **#147 `firmfinance`**, **#3 `cockpit`
  (sudah)** — besar tapi dangkal
- Grup PSAK (#110–136) — 27 modul, pola seragam; sekali pola ditemukan, sisanya cepat

### Catatan operasional

- **Sesi paralel aktif.** Beberapa prompt sudah dieksekusi dan sebagian hasilnya BELUM
  di-commit. Selalu `git status --short` sebelum menulis prompt yang menyebut nomor
  baris, dan tulis peringatan di prompt bila berkasnya sedang `M`.
- Berkas yang dipakai lebih dari satu modul (`view_firmtreasury` = treasury/cashbank/
  fixedassets · `view_people` = hcm/cpe/independence · `view_pc_org` = orgchart/
  succession · `view_firmgl` = firmgl/apar) — prompt WAJIB melarang menyentuh tetangga.
- Nama berkas usulan sengaja TIDAK berawalan `prd` agar tidak masuk registri status
  PRD (CLAUDE.md §7).
