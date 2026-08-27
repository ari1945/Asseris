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

STATUS SAAT INI — lihat bagian "Status" di 00-LANJUTKAN.md. VERIFIKASI ULANG, TAPI
JANGAN dengan `git log` / `git cherry` / hitungan "N ahead": master menerima PR lewat
SQUASH, sehingga ketiganya menyesatkan (salah di 20 dari 26 cabang pada sensus
2026-08-27). Uji yang sah HANYA perbandingan hash blob:
    git rev-parse <cabang-atau-origin/master>:<berkas>
Dan periksa TIGA tempat, bukan satu: (1) origin/master · (2) cabang LOKAL
(`git for-each-ref refs/heads/`) · (3) `git status --short` untuk kerja belum-commit.
Melewatkan (2) sudah membatalkan dua vonis "siap dikerjakan".

Mulai dengan mengonfirmasi: berapa prompt yang sudah MENDARAT (bandingkan blob, jangan
percaya tabel), berapa yang perbaikannya menganggur di cabang lokal, dan berapa usulan
yang menunggu keputusan saya. Lalu tunggu saya menyebut modul berikutnya.
```

---

## Status (perbarui setiap sesi)

**Terakhir diperbarui:** 2026-08-27 · `origin/master` `952392a` · **SENSUS TERVERIFIKASI
BLOB** (bukan `git log` / `git cherry` / hitungan "N ahead").

> ⚠ **Status versi 2026-08-24 SALAH BESAR — jangan dipakai.** Ia menyatakan Gelombang
> 1–7 "belum"; kenyataannya **17 dari 25 prompt sudah MENDARAT**. Sesi mana pun yang
> memercayainya akan mengerjakan ulang pekerjaan tertutup — persis biaya yang metode
> §A di preamble larang ("melaporkan cacat yang sudah tertutup lebih mahal daripada
> tidak melaporkan apa pun"). Sensus di bawah menggantikannya seluruhnya.

### Metode WAJIB sebelum mengirim prompt apa pun

`git log`, `git cherry`, dan hitungan "N ahead" **SEMUANYA MENYESATKAN di repo ini** —
master menerima PR lewat **squash**, jadi cabang yang isinya sudah mendarat tetap
tampak "ahead". Dalam sensus 2026-08-27 hitungan "ahead" salah di **20 dari 26** cabang.
Satu-satunya uji yang sah adalah perbandingan **hash blob**:

```powershell
git rev-parse <cabang>:<berkas>
git rev-parse origin/master:<berkas>
```

Hash sama ⇒ sudah mendarat. Berbeda ⇒ **baca arah diff-nya** — bisa jadi cabangnya
yang lebih tua, dan me-merge-nya justru mengembalikan cacat.

Uji yang sama berlaku untuk klaim "cacat masih hidup": periksa **`origin/master`**,
lalu periksa apakah ada **cabang LOKAL** yang sudah menutupnya. Dua vonis "siap
dikerjakan" pada 2026-08-27 batal karena langkah kedua ini dilewatkan.

### Urutan pengerjaan (7 gelombang)

Antrean per-modul sekarang punya urutan eksplisit. **Gelombang 0 mendahului semuanya**
— sembilan modul di [`../KEDALAMAN-158-MODUL-TERKINI.md`](../KEDALAMAN-158-MODUL-TERKINI.md)
bertanda basi (`※`) semata-mata karena pekerjaannya belum mendarat, dan prompt untuk
modul itu tidak boleh ditulis sebelum Gelombang 0 tuntas.

| Gel. | Isi | Status (terverifikasi 2026-08-27) |
|---|---|---|
| **0** | Pengiriman & higiene repo — [`00-GELOMBANG-0-pengiriman.md`](00-GELOMBANG-0-pengiriman.md) | **premis mati** — remote hanya `origin/master`, kedua PR target sudah merge, `migration/nul` hilang. Sisanya = residu terparkir (M2/W1/O1b) |
| 1 | Tiga cacat terbersih: `spr2400` · `invprop` · `mgmtletter` | ✅ **SELESAI** — #303 · #314 · #305 |
| 2 | Sembilan cangkang display-only — **satu keputusan produk** (kertas kerja vs `kb`) | butuh keputusan Ari (tak berubah) |
| 3 | Empat kebocoran isolasi L4⚠️: `sjah3400/3402/3410/3420` (P0 keamanan data) | ✅ **SELESAI** — #309 |
| 4 | 19 cacat ⚠ terbukti hidup di modul skor menengah | **sebagian besar SELESAI** — lihat sensus prompt di bawah; sisa nyata hanya `hcm`+`regref` (sudah ada di cabang) |
| 5 | Batch PSAK & SAK (27 modul, pola seragam) — mulai `newdisc` | `newdisc` **sudah dikerjakan** di `fix/newdisc-pilar-dua-turunan` (belum mendarat); 26 sisanya belum |
| 6 | Sisa skor menengah tanpa ⚠ | belum |
| 7 | Arc `firm-erp` PR-2..PR-6 + `delivery` PR-4..PR-6 (urutan MENGIKAT) | Approved, belum |

> **Prioritas nyata sekarang bukan Gelombang 4–6, melainkan MENDARATKAN enam cabang**
> di sensus cabang di bawah. Salah satunya (`claude/intelligent-keller-7b28db`) memikul
> cacat isolasi data **P0** yang masih hidup di master.

### Sensus prompt (25) terhadap `origin/master` `952392a`

**MENDARAT (17) — JANGAN dikirim ulang.**

| Prompt | PR | Prompt | PR |
|---|---|---|---|
| `03-cockpit` | #265 | `33-fixedassets` | #289 |
| `07-time` | #266 · #282 | `34-firmtax` | #298 |
| `12-billing` | #275 | `35-profitability` | #268 · #269 · #270 |
| `16-orgchart` | #301 | `71-jet` | #280 |
| `19-succession` | #301 | `72-diagnostic` | #288 |
| `25-independence` | #276 | `75-opening` | #300 (O1b ditunda) |
| `30-revenue` | #278 · #307 | `80-internalaudit` | #296 (IA6/IA7 ditunda) |
| `31-treasury` | #287 · #290 | `86-sa230` | #286 |
| `32-cashbank` | #283 | | |

**Cacat MASIH HIDUP di master — tapi perbaikannya SUDAH ADA di cabang lokal yang belum
mendarat (2). Jangan kerjakan ulang; daratkan cabangnya.**

| Prompt | Cacat hidup di `origin/master` | Cabang pemilik perbaikan |
|---|---|---|
| `15-hcm` | `view_people.tsx:83` → `Math.min(5, person.rating + 0.1)` (H1) | `fix/hcm-penilaian-karangan` — mencabut H1/H2, menambah `hcm_derive.ts` (+300) & ujinya (+290) |
| `27-regref` | `data_part1.ts:535` `CPE_REQ` satu-record (R1) · `data_licensing.ts:81` `rotationLimit \|\| 5` (R2) · `data_proforma.ts:129` `RATE = C ? C.RATE : 0.22` (R3) · katalog 6 set (R4) | `fix/regref-tahap-a2` — R1 multi-record, R2 → `null`, R3 → `citRateRequired(ASOF_DATE)`, R4 → 9 set |

**Terhalang kerja belum-commit di direktori kerja utama (4).** Cacatnya hidup dan
prompt-nya sah, tapi sesi paralel sedang memegang berkasnya:

| Prompt | Bagian yang bisa dikerjakan | Bagian yang terhalang |
|---|---|---|
| `01-home` | P1, P3 | P2 butuh axe + smoke papan-ketik ⇒ **tak bisa headless** |
| `04-tasks` | M1 (`mt.personal` lingkup firma) · M3 (`'dl-'+i`) · M4 (`.slice(0,4)`) | M2 → `usulan-M2` |
| `11-wip` | W2 (write-down tanpa pelaku) · W3 (`role.includes('Partner')`) · W4 (`submitted: NOW`) | W1 → `usulan-W1` |
| `29-apar` | A1 (`ap(ctx)` abai `ctx`) · A4 · A6 | A2/A5 sudah mendarat; A3 → `usulan-A3` |

**`28-firmgl` — DUPLIKASI AKTIF.** Cacat hidup di master (`view_firmgl.tsx` nol
`reconcil`/`amsExport`, `\|\| 'Pengguna'`), perbaikannya sudah ada di cabang
`fix/firmgl-rekonsiliasi-ekspor` (`daee729`) **dan sedang ditulis ULANG** sebagai berkas
untracked di direktori kerja utama. Rekonsiliasikan dengan `daee729` sebelum salah satu
salinan hilang.

**`00-GELOMBANG-0-pengiriman`** — premis mati (lihat tabel gelombang). Juga **anti-cloud
secara struktural**: setiap langkahnya beroperasi pada direktori kerja lokal, worktree,
`gh pr merge`, dan junction `node_modules`.

### Sensus cabang lokal (26 di depan `origin/master`)

**Enam memikul kerja yang BENAR-BENAR belum ada di master:**

| Cabang | Isi | Catatan |
|---|---|---|
| `claude/intelligent-keller-7b28db` | Export-identity SSOT (F-1/F-2) + isolasi lampiran SA 580/720 | ⚠ **P0** — master `view_sa580.tsx` masih `firm?.activeEngagement?.id \|\| 'ENG-2025-014'`: lampiran bisa mendarat di berkas audit klien LAIN. **Butuh rebase ke `952392a`** (diff ~100 berkas sebagian besar hanyut merge-base) |
| `fix/regref-tahap-a2` | R1–R4 regref | katalog 6 → 9 set |
| `fix/hcm-penilaian-karangan` | H1/H2 + `hcm_derive.ts` | — |
| `fix/firmgl-rekonsiliasi-ekspor` | `firm_gl_export.ts` + badge tie-out + ekspor tersegel + atribusi pemosting | sedang diduplikasi di dir kerja |
| `fix/newdisc-pilar-dua-turunan` | Mesin turunan Pilar Dua + 2 gerbang | master `view_newdisc.tsx:26` masih `P2_JURIS` karangan |
| `claude/fervent-tharp-227ee5` | `canon_smm_period.ts` — tahun atestasi SOQM dari ¶53 | mencabut fallback `new Date().getFullYear()` di `view_isqm`, `view_isqm_deep`, `view_governance` |

**Dua puluh sisanya squash-twin.** ⛔ **SEMBILAN akan MEREGRESI master bila di-merge** —
mengembalikan hex mentah yang sudah ditokenkan (#311/#313), menghapus 88 baris uji e2e
a11y, melonggarkan ratchet `:any`, membuang 54 baris revisi template 2026-08-24,
menghapus entri fase `opening: 'Eksekusi'`, dan mengembalikan geometri avatar
pra-lantai-11px. **Jangan merge cabang lama "untuk aman" — periksa arah diff dulu.**

`fix/firmgl-apar-subbuku` adalah leluhur murni master (nol berkas berbeda) — aman dihapus.

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
- **Cek cabang lokal, bukan hanya `origin/master`.** Sensus 2026-08-27 menemukan enam
  cabang berisi kerja yang tak ada di master, dan **dua vonis "cacat masih hidup, siap
  dikerjakan" batal** karena perbaikannya ternyata sudah ada di cabang lokal. Sebelum
  menulis prompt: `git for-each-ref refs/heads/` lalu bandingkan blob berkas targetnya.
- **Duplikasi nyata sedang terjadi.** `firm_gl_export.ts` + dua berkas ujinya ditulis
  ulang di direktori kerja padahal sudah ada di `fix/firmgl-rekonsiliasi-ekspor`
  (`daee729`). Ini biaya langsung dari status yang basi.

### Menjalankan prompt di sesi CLOUD

Sesi cloud meng-clone `origin/master` dari GitHub; ia **tidak melihat** direktori kerja
lokal, cabang lokal, maupun memori mesin ini. Konsekuensinya:

- Berkas prompt di `docs/prompts-perbaikan/` **adalah** mekanisme portabilitasnya —
  karena ter-commit, ia menggantikan konteks yang tak ikut ke cloud.
- Gerbangnya **kompatibel penuh**: `npm run verify` (11 langkah di `tools/verify.mjs`)
  tak butuh secret — `server/.env` ter-track, `server/vitest.config.ts` memaku
  `DATABASE_URL: 'file:./test.db'`, dan Postgres/Docker hanya dipakai `e2e.yml` /
  `deploy-smoke.yml`, bukan `verify`.
- **Prompt yang DoD-nya menuntut axe / smoke papan-ketik / verifikasi visual TIDAK
  bisa diselesaikan di cloud** (mis. `01-home` P2). Kerjakan lokal.
- Per 2026-08-27: **nol dari 25 prompt siap dikirim ke cloud** — 17 sudah mendarat,
  2 sudah ada di cabang lokal, 5 terhalang kerja belum-commit, 1 anti-cloud. Daratkan
  enam cabang itu dulu; kapasitas eksekusi bukan hambatannya.
- Berkas yang dipakai lebih dari satu modul (`view_firmtreasury` = treasury/cashbank/
  fixedassets · `view_people` = hcm/cpe/independence · `view_pc_org` = orgchart/
  succession · `view_firmgl` = firmgl/apar) — prompt WAJIB melarang menyentuh tetangga.
- Nama berkas usulan sengaja TIDAK berawalan `prd` agar tidak masuk registri status
  PRD (CLAUDE.md §7).
