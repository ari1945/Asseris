# PRD — Regref Tahap A-2: cakupan registri yang diuji sebagai CAKUPAN

> Wajib diisi sebelum implementasi apa pun. Implementasi TIDAK dimulai sebelum sign-off ("Proceed.").

| Field | Isi |
|---|---|
| Tanggal | 2026-08-21 |
| Pemilik | Ari Widodo |
| Status | **In Progress** — arahan Ari 2026-08-21 (R1–R4) diperlakukan sebagai lingkup yang disetujui; Tahap B (halaman dapat ditulis admin) TETAP terpisah dan belum diputuskan |
| Pemicu | Empat temuan Ari atas Tahap A: R1 kewajiban PPL (SKP) mengulang pola `PAYROLL_RATES.period`; R2 batas rotasi AP tak terdaftar; R3 tarif PPh Badan sebagai fallback literal; **R4 cakupan registri belum pernah diuji sebagai cakupan** |
| Modul | `cpe` · `independence` · `psak46` · `firmtax` · `proforma` · `newdisc` · `regref` |
| Berkas | `canon_ppl.ts` · `canon_rotation.ts` · `canon_cit.ts` (baru) · `regref_census.ts` (baru) · `regref_catalog.ts` · `canon_base.ts` · `canon_part3.ts` · `data_licensing.ts` · `data_proforma.ts` · `view_aje.tsx` · `view_firmtax.tsx` · `view_psak46.tsx` · `view_psak24.tsx` · `view_spr2410.tsx` · `view_newdisc.tsx` · `view_people.tsx` |
| PRD terkait | `docs/prd-regulatory-reference-annual.md` (Tahap A — Implemented) |
| Prasyarat | Di atas `master` `1b32c7f` |

---

## 1. Problem

Tahap A membangun mesinnya (`canon_regref.ts`) dan memindahkan **lima** set data ke
dalamnya. Ia juga memasang gerbang SC-9: *setiap registry bertipe `RegRefSet<…>` yang
diekspor sumber wajib terdaftar di katalog*.

Gerbang itu menjaga arah yang salah. Ia menjaga registry yang **sudah menjadi**
`RegRefSet`. Ia tidak berkata apa-apa tentang besaran regulatori yang **belum pernah
menjadi** `RegRefSet` — dan justru itulah kelas cacat yang hendak dicabut arc ini.

Empat temuan berikut semuanya lolos gerbang SC-9 tanpa satu pun uji memerah:

| # | Besaran | Bentuk hari ini | Akibat |
|---|---|---|---|
| R1 | Kewajiban PPL (SKP) PMK 186/2021 Ps. 37 | `PPL_REQ_PMK186` — **satu record**, tanpa masa berlaku. `CPE_REQ.year: 2026` diketik dan dipakai hanya sebagai TEKS | 1 Jan 2027 aplikasi menampilkan "PPL 2026 · 40 SKP", menghitung kepatuhan terhadap kewajiban 2026, memberi label 2026 — diam |
| R2 | Batas rotasi AP (PP 20/2015 Ps. 11 · POJK 13/POJK.03/2017) | `REGIME_PIE/JK/NONPIE` — konstanta tanpa masa berlaku; `data_licensing.ts:89` malah memakai fallback literal `\|\| 5` | Modul independensi memunculkan peringatan yang MENGUTIP dasar hukum atas angka yang tak tertaut ke registry mana pun |
| R3 | Tarif PPh Badan (25% → 22%) | `const RATE = 0.22` di **delapan** tempat, salah satunya fallback `C ? C.RATE : 0.22` | Tarif statuter yang pernah berubah, menyangkut uang, tak dapat berkata kedaluwarsa |
| R4 | — | — | Ketiganya ditemukan dengan MEMBACA, bukan dengan gerbang |

R4 adalah temuan yang sesungguhnya. Selama penemuan bergantung pada seseorang yang
kebetulan membaca berkas yang tepat, **besaran keempat dan kelima akan lolos dengan cara
yang sama**.

Prototipe detektor yang ditulis saat menyusun PRD ini membuktikannya dalam satu
perintah: ia menemukan `P2_MIN_RATE = 15.0` di `view_newdisc.tsx` — tarif minimum
efektif GloBE Pilar Dua, yang menggerakkan estimasi eksposur *top-up tax* — yang tidak
disebut satu pun dari R1–R3. Itu besaran keempat, dan ia ditemukan oleh gerbang.

## 2. Objective

1. Tiga besaran R1–R3 (plus yang keempat, GloBE) menjadi registry berkunci masa berlaku,
   terdaftar di katalog `regref`, dan dipilih **menurut tanggal**.
2. Penemuan berhenti bergantung pada pembacaan: sebuah **sensus** yang ditegakkan gerbang
   memaksa setiap konstanta yang tampak regulatori dinyatakan — sebagai registry, atau
   sebagai bukan-regulatori dengan alasannya.

## 3. Success Criteria

| # | Kriteria | Cara membuktikannya salah |
|---|---|---|
| SC-A1 | Kewajiban PPL dipilih menurut tanggal; masa tak tercakup TIDAK memakai set tahun lain | Set 2022→∞ dicabut ⇒ lookup 2026 `no-coverage`, bukan 40 SKP |
| SC-A2 | Tahun PPL DITURUNKAN dari tanggal hitung, bukan diketik | `CPE_REQ.year` diubah ke 2099 ⇒ label modul `cpe` TIDAK berubah |
| SC-A3 | Catatan SKP disaring ke tahun PPL yang berlaku | Entri bertanggal 2025 disuntikkan ⇒ tidak menambah SKP tahun 2026 |
| SC-A4 | Batas rotasi berasal dari registry; tak ada fallback literal `\|\| 5` | Grep `rotationLimit \|\| 5` = nol; regime lookup pada 2016-01-01 = `no-coverage` |
| SC-A5 | Peringatan rotasi mengutip `basis` dari registry, bukan string yang diketik di view | Basis registry diubah ⇒ teks peringatan ikut berubah |
| SC-A6 | Tarif PPh Badan dipilih menurut tanggal, MEMBLOKIR bila tak tercakup | Lookup 2009-12-31 `blocked=true`; 2019-06-30 = 25%, bukan 22% |
| SC-A7 | Nol literal tarif PPh Badan yang MENGHITUNG di luar `canon_cit.ts` | Detektor gerbang; menanam `const X = 0.22` di view mana pun ⇒ merah |
| SC-A8 | Tarif minimum GloBE terdaftar sebagai data regulatori | Katalog memuat `globe-min`; `P2_MIN_RATE` literal tak ada lagi |
| SC-A9 | **Sensus menegakkan cakupan**: konstanta baru yang tampak regulatori TIDAK dapat lahir tanpa dinyatakan | Tambah `const PPN_RATE = 0.11;` di berkas mana pun ⇒ uji merah dengan pesan yang menyebut berkas & namanya |
| SC-A10 | Sensus tidak boleh membusuk: entri yang situsnya hilang ikut merah | Hapus salah satu situs ⇒ uji merah (prune), bukan hijau diam |
| SC-A11 | Nol-delta angka pada tanggal hari ini | Seluruh uji lama hijau tanpa disentuh; snapshot `canon_regression` tak berubah |

## 4. Scope

**PR-1 · `canon_cit.ts`** — registry tarif PPh Badan (`block`) + tarif minimum GloBE
(`block`). Tiga set CIT: 25% (TY2010–2019, UU 36/2008), 22% (TY2020–2021, Perpu 1/2020
jo. UU 2/2020), 22% (TY2022→∞, UU 7/2021 HPP — rencana 20% dibatalkan). Delapan konsumen
yang MENGHITUNG dialihkan.

**PR-2 · PPL berkunci masa** — `PPL_REGISTRY` di `canon_ppl.ts` (`warn`), `pplReqFor()`,
`pplYearOf()`. `CPE_REQ.year` berhenti menjadi sumber tahun; catatan SKP disaring ke
tahun yang berlaku.

**PR-3 · Rotasi berkunci masa** — `ROTATION_REGISTRY` di `canon_rotation.ts` (`warn`),
`rotationRegimesFor()`. Fallback `|| 5` dicabut; basis peringatan ditarik dari registry.

**PR-4 · Sensus & gerbang cakupan** — `regref_census.ts` + `regref_census.test.ts`.

**PR-5 · Katalog** — empat entri baru + `REGREF_EXPECTED_IDS`; halaman `regref`
merendernya tanpa perubahan kode view.

## 5. Non-Scope

- **Tahap B** (halaman `regref` dapat ditulis admin firma; RBAC, atestasi, jejak audit) —
  tetap menunggu keputusan Ari.
- **Teks prosa "22%"** yang tersebar di ±38 baris label/paragraf modul PSAK. Ia bukan
  perhitungan; mengubahnya serentak berisiko besar pada salinan UI tanpa mengubah satu
  angka pun. Ia **di-ratchet** oleh sensus (daftar situs eksplisit; situs baru = merah),
  bukan dikonversi. Ini dinyatakan, bukan disembunyikan.
- Menambah set historis yang tak dipakai perhitungan mana pun kecuali bila ia membuat
  registry dapat dinyatakan salah (mis. 25% pra-2020 — dipakai membuktikan SC-A6).

## 6. Constraints

- **NOL-DELTA pada tanggal hari ini.** `AMS.TODAY = '2026-03-09'`, `ASOF = 2025-12`.
  Seluruh lookup pada tanggal itu wajib mengembalikan nilai yang identik dengan literal
  yang digantikannya.
- Provenans **tidak dikarang**: set yang belum dicocokkan dengan naskah resminya
  `verified: false` + `note` yang menyebut APA yang belum. `verifiedBy`/`verifiedAt`
  DIKOSONGKAN.
- Gerbang wajib **presisi** (cocokkan bentuk, bukan nama yang mirip). Gerbang berisik akan
  dilemahkan orang berikutnya lalu berhenti menjaga apa pun.

## 7. Risks

| Risiko | Mitigasi |
|---|---|
| Menyaring SKP per tahun menggeser angka | Seluruh tanggal SKP seed = 2026; nol-delta dibuktikan uji lama yang tidak disentuh |
| `CPE_REQ.year` dipakai 3 modul lain sebagai kunci ATESTASI (`view_governance`, `view_isqm`, `view_isqm_deep`) | Tahun turunan = 2026 = nilai lama ⇒ kunci persistensi tidak berubah |
| Detektor sensus terlalu berisik lalu dilemahkan | Detektor konstanta skalar ber-kosakata regulatori: 14 situs di seluruh `migration/src` — cukup kecil untuk dinyatakan satu per satu |
| Menyentuh `AMS_CANON` ⇒ snapshot | Nilai tak berubah; snapshot dibuktikan tetap |

## 8. Open Questions

- **Q-A1** Apakah set 25% (TY2010–2019) perlu dipertahankan, atau registry cukup dimulai
  2020? (Rekomendasi: pertahankan — ia yang membuat SC-A6 dapat dinyatakan salah.)
- **Q-A2** Tanggal mulai berlaku PMK 186/2021 dan POJK 13/POJK.03/2017 — perlu dicocokkan
  dengan naskahnya. Sampai itu terjadi keduanya `verified: false`, dan masa sebelum
  tanggal yang diasumsikan **tak tercakup** (bukan diam-diam memakai set setelahnya).
- **Q-A3** Tarif minimum GloBE: Indonesia mengadopsi lewat PMK 136/2024 (TY2025). Set
  perlu dicocokkan dengan PMK-nya.
