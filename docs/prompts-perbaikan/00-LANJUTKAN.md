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

**Terakhir diperbarui:** 2026-08-28 · `origin/master` `bc51f47` · sensus terverifikasi
**blob & pohon**, bukan `git log` / `git cherry` / hitungan "N ahead".

> ⚠ **Status versi 2026-08-27 (`952392a`) SUDAH BASI.** Ia menyatakan enam cabang belum
> mendarat dan lima prompt terhalang. **Gelombang W0 sudah tuntas** sejak itu. Bagian di
> bawah menggantikannya seluruhnya.

### Metode WAJIB sebelum mengirim prompt apa pun

`git log`, `git cherry`, dan hitungan "N ahead" **SEMUANYA MENYESATKAN di repo ini** —
master menerima PR lewat **squash**, jadi cabang yang isinya sudah mendarat tetap tampak
"ahead". Uji yang sah adalah perbandingan **hash blob** atau **pohon**:

```powershell
git rev-parse <cabang>:<berkas>          # per berkas
git diff --name-only origin/master <cabang>   # nol baris = pohon identik
```

Hash sama ⇒ sudah mendarat. Berbeda ⇒ **baca arah diff-nya** — bisa jadi cabangnya yang
lebih tua, dan me-merge-nya justru mengembalikan cacat.

> 🔴 **DAN SATU BERKAS TIDAK CUKUP.** Pada 2026-08-27 cabang
> `claude/intelligent-keller-7b28db` divonis "bagian P0-nya sudah mendarat" berdasarkan
> **satu** berkas (`view_sa580.tsx`) yang memang identik dengan master karena #317
> men-cherry-pick-nya. Seratus berkas lain tak pernah diperiksa — dan ternyata memikul
> **konversi 103 berkas** yang belum mendarat. Vonis itu melahirkan seluruh gelombang W1
> yang kemudian harus ditahan. **Bandingkan POHON, bukan satu berkas contoh.**

### Gelombang W0 — pendaratan · ✅ **TUNTAS 2026-08-27/28**

| PR | Isi |
|---|---|
| #318 `62593c4` | firmgl + apar — sub-buku hidup, ekspor bisa menolak terbit (menggantikan `fix/firmgl-rekonsiliasi-ekspor`) |
| #319 `abb36a7` | hcm — penilaian empat dimensi yang tak pernah dinilai siapa pun |
| #320 `7ae8d68` | smm — tahun atestasi SOQM dari periode evaluasi ¶53, bukan dari jam PPL |
| #321 `a6f4f74` | newdisc — tabel yurisdiksi Pilar Dua karangan dicabut ke struktur grup kanonik |
| #322 `244f87f` | regref Tahap A-2 — empat besaran regulatori berhenti jadi konstanta telanjang |
| #326 `8a8cc54` | dokumen W0 masuk git, dengan dua premis yang terbukti salah **dicoret, bukan dihapus** |

Prompt & briefnya ada di [`W0-00-PENDARATAN.md`](W0-00-PENDARATAN.md) + `W0-1`…`W0-4`,
disimpan sebagai catatan.

**Dua premis W0 yang terbukti SALAH** (tercatat di tempatnya): R1 tidak pernah mengubah
bentuk `CPE_REQ` — urutan smm→regref karena itu tidak mengikat secara semantik, hanya
tekstual. Dan hitungan katalog regref "6→9" basi; yang benar **5→10**, karena #283
menambah set `kurs` sesudahnya.

### Gelombang W1 — identitas ekspor tersegel · ⛔ **DITAHAN, kecuali W1-E**

Delapan paket ([`W1-00-IDENTITAS-TERSEGEL.md`](W1-00-IDENTITAS-TERSEGEL.md) + `W1-A`…`W1-H`,
mendarat lewat #328) menutup satu kelas: identitas firma/perikatan/klien dikarang di
dalam payload yang **disegel Ed25519** dan dicatat ke jejak audit.

**Keputusan Ari 2026-08-28: hanya `W1-E` yang dikerjakan; tujuh sisanya DITAHAN.**

Alasannya bukan mutu promptnya, melainkan **duplikasi**. `claude/intelligent-keller-7b28db`
(ahead 4 / **behind 60**) sudah mengonversi **103 berkas — 28 di antaranya adalah berkas
W1** — memakai arsitektur yang **berlawanan**:

```
master (yang W1 suruh perbaiki):        cabang:
  scopeId: (window as {…})…?.id,          kind: 'sa800-memo', scope: 'engagement',
  firm: 'KAP Wijaya Hartono & Rekan',     ← argumen identitas DICABUT; eksporter
  ← identitas DIDORONG call-site            MENARIKNYA dari SSOT (export_identity.ts)
```

PRD-nya — `docs/prd-export-seal-identity-ssot.md`, **hanya ada di cabang itu**, status
`Draft — menunggu sign-off` — melingkupi **123 call-site di ±60 view** (vs 32 berkas W1)
dan menemukan **kelas keempat** yang W1 lewatkan: `|| 'default'` truthy ⇒
`assertEngagementAccess` JALAN dan GAGAL ⇒ artefak **diam-diam tidak tersegel** (berbeda
dari `undefined` yang justru melewati penjagaan).

Ia juga membantah pendekatan W1 secara langsung: *"Selama identitas boleh didorong
pemanggil, tombol ekspor ke-124 bebas mengarangnya lagi."*

**`W1-E` selamat** karena isinya kontrol palsu (`<span onClick>` yang mengubah keadaan
kertas kerja AUP), bukan identitas ekspor. **Butir E1 dicabut** dari paket itu —
`view_records.tsx:405` ada di dalam lingkup arc.

**Arah berikutnya (disetujui Ari): sign-off PRD lalu daratkan arc-nya.** Rebase-nya besar
(behind 60) dan wajib menjaga sapuan #310/#311/#312/#313 agar tidak teregresi.

**Yang tetap SAHIH dari berkas W1** meski paketnya ditahan — dipertahankan sebagai temuan:

- `window.activeEngagement` **tidak pernah ditulis** di repo ini ⇒ selalu `undefined` ⇒
  `server/src/router.ts:735` **melewati** `assertEngagementAccess`, segel tetap terbit.
- **Ratchet `:any` memerah DUA ARAH lewat DUA gerbang berbeda** (diuji langsung):
  naik → `scripts/check-any-ratchet.mjs` (plafon total, "satu arah: turun boleh");
  **turun** → `eslint src` polos → `There are suppressions left that do not occur anymore.`
  **exit 2**.
- **Gerbang "paku" `spr2400_conventions.test.ts`** menegaskan cacat tetangga MASIH ADA dan
  sengaja memerah bila diperbaiki (`:240` nama penanda tangan; `:246` tombol "AI Assist"
  mati). Di sana paku **mengalahkan** aturan keras BLOK-A no. 4.
- **`view_cockpit.tsx` BUKAN modul Cockpit.** `lazy_views.tsx:112-113`: `'cockpit'` →
  `view_cockpit2.tsx`; `'programme'` → `view_cockpit.tsx`. `grep view_cockpit` cocok
  sebagai **awalan** dari `view_cockpit2`.

### Sensus prompt (25) terhadap `origin/master` `bc51f47`

**MENDARAT (21) — JANGAN dikirim ulang.**

| Prompt | PR | Prompt | PR |
|---|---|---|---|
| `03-cockpit` | #265 | `31-treasury` | #287 · #290 |
| `07-time` | #266 · #282 | `32-cashbank` | #283 |
| `12-billing` | #275 | `33-fixedassets` | #289 |
| `15-hcm` | **#319** | `34-firmtax` | #298 |
| `16-orgchart` | #301 | `35-profitability` | #268 · #269 · #270 |
| `19-succession` | #301 | `71-jet` | #280 |
| `25-independence` | #276 | `72-diagnostic` | #288 |
| `27-regref` | **#322** | `75-opening` | #300 (O1b ditunda) |
| `28-firmgl` | **#318** | `80-internalaudit` | #296 (IA6/IA7 ditunda) |
| `29-apar` | **#318** (A1 tertutup: `ap(ctx)` kini `apOf(ctx)`/`coaOf(ctx)`) | `86-sa230` | #286 |
| `30-revenue` | #278 · #307 | | |

**Terhalang kerja belum-commit di direktori kerja utama (3).** Empat mesin masih hanya ada
sebagai berkas untracked di checkout utama — **nol dari keempatnya ada di master**
(`mytasks_derive.ts` · `wip_adj.ts` · `home_composition.ts` · `use_firm_subledger.ts`):

| Prompt | Bagian yang bisa dikerjakan | Bagian yang terhalang |
|---|---|---|
| `01-home` | P1, P3 | P2 butuh axe + smoke papan-ketik ⇒ **tak bisa headless** |
| `04-tasks` | M1 · M3 · M4 | M2 → `usulan-M2` |
| `11-wip` | W2 · W3 · W4 | W1 → `usulan-W1` |

> ⚠ Butir-butir M/W di atas **belum diverifikasi ulang** terhadap `bc51f47` — nomor
> barisnya berasal dari sensus `952392a`. Verifikasi sebelum mengirim; sebagian mungkin
> sudah tertutup (seperti `29-apar` A1).

**`00-GELOMBANG-0-pengiriman`** — premis mati; juga anti-cloud secara struktural.

### Sensus cabang lokal (terhadap `bc51f47`)

Uji yang dipakai: `git diff --name-only origin/master <cabang>` — nol baris = pohon
identik = aman dihapus.

| Cabang | Status |
|---|---|
| `claude/intelligent-keller-7b28db` | 🔴 **SATU-SATUNYA yang memikul kerja nyata** — `export_identity.ts` + 2 gerbang + konversi 103 berkas. Menunggu sign-off PRD. |
| `docs/w1-identitas-tersegel` | nol berkas berbeda ⇒ sudah mendarat (#328), aman dihapus |
| `fix/regref-tahap-a2` · `fix/newdisc-…` · `claude/fervent-tharp-…` | sudah dihapus sesudah W0 |
| ~22 sisanya | squash-twin / debris. ⛔ **Sembilan akan MEREGRESI master bila di-merge** — mengembalikan hex mentah yang sudah ditokenkan (#311/#313), menghapus 88 baris uji e2e a11y, melonggarkan ratchet `:any`, mengembalikan geometri avatar pra-lantai-11px. **Periksa arah diff sebelum menyentuh apa pun.** |

### Menjalankan prompt di sesi CLOUD

Sesi cloud meng-clone `origin/master` dari GitHub ke VM Ubuntu; ia **tidak melihat**
direktori kerja lokal, cabang lokal, maupun memori mesin ini.

- Berkas prompt di `docs/prompts-perbaikan/` **adalah** mekanisme portabilitasnya.
- Gerbangnya **kompatibel penuh**: ke-11 langkah `tools/verify.mjs` (lint · typecheck ×2 ·
  ratchet `:any` · vitest · build · budget bundle · backend lint/typecheck/test) jalan
  tanpa secret. `server/.env` ter-track; Postgres/Docker hanya dipakai `e2e.yml` &
  `deploy-smoke.yml`, yang keduanya ber-`paths:` `server/**`/`migration/**` — perubahan
  docs-only tidak memicunya (itu normal, bukan dispatch yang jatuh).
- Setup per sesi (cermin `ci.yml`): **Node 22** · `npm ci` di root, `migration/`, `server/`.
  Lockfile ada di keempat workspace. Tak ada `.devcontainer`.
- ⚠ **`D:\Claude AI\CLAUDE.md` (aturan kerja Ari) TIDAK ikut** — ia dua level di atas repo.
- Prompt yang DoD-nya menuntut axe / smoke papan-ketik / verifikasi visual **tidak bisa**
  diselesaikan di cloud — mis. `01-home` P2, dan `W1-E` (jsdom memodelkan fokusabilitas
  tapi **tidak** mensintesis Enter→click ⇒ hijau palsu, jebakan #306). Kerjakan lokal.
- Escape hatch: `claude --teleport <session-id>` menarik sesi cloud ke lokal beserta
  riwayat percakapannya.

### Jebakan tooling yang menggigit sesi 2026-08-28

- `gh … --jq`: `conclusion` bernilai **string KOSONG** (bukan `null`) selama run berjalan
  ⇒ filter `.conclusion != null and != "SUCCESS"` melaporkan check sehat sebagai GAGAL.
  Pakai `.status != "COMPLETED"` untuk "masih jalan".
- Tool Bash meng-mangle `git show 'origin/master:.github/…'` (titik dua + backslash) ⇒
  pakai `MSYS_NO_PATHCONV=1`.
- Kunci `eslint-suppressions.json` berformat **`src/view_x.tsx`**, bukan
  `migration/src/…` — mencari dengan prefiks penuh memberi **negatif palsu**.

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

- **Sesi paralel aktif.** Direktori kerja utama memikul kerja BELUM DI-COMMIT (per
  2026-08-28: 4 berkas termodifikasi + 16 untracked, termasuk empat mesin nol-pemanggil).
  Selalu `git status --short` sebelum menulis prompt yang menyebut nomor baris, dan
  **jangan bekerja di checkout utama** — `git checkout -- <berkas>` di sana MENGHAPUS
  kerja sesi lain. Pakai worktree sendiri.
- **Cek cabang lokal, bukan hanya `origin/master` — dan bandingkan POHON, bukan satu
  berkas.** Vonis 2026-08-27 atas `claude/intelligent-keller-7b28db` dibuat dari satu
  berkas contoh dan MELESET: 103 berkas konversinya tak terlihat, dan seluruh gelombang
  W1 lahir dari kekeliruan itu lalu harus ditahan. `git diff --name-only origin/master
  <cabang>` adalah uji yang benar.
- **Duplikasi terbukti mahal, dua kali.** (1) `firm_gl_export.ts` + dua ujinya ditulis
  ulang di direktori kerja padahal sudah ada di cabang — ternyata blob-nya identik, jadi
  tak ada yang hilang. (2) Gelombang W1: delapan prompt disusun untuk kelas yang 28 dari
  32 berkasnya sudah dikonversi di cabang lain. Keduanya biaya langsung dari sensus yang
  tidak menyeluruh.
- **PR terbuka tidak muncul di sensus cabang lokal.** `gh pr list` adalah langkah
  TERPISAH yang wajib — PR #318 (yang menggantikan `fix/firmgl-rekonsiliasi-ekspor`)
  hanya ketahuan lewat itu.
