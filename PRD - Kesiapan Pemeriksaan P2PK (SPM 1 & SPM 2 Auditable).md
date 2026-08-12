# PRD — Kesiapan Pemeriksaan P2PK: SPM 1 & SPM 2 Auditable

| Field | Isi |
|---|---|
| Tanggal | 2026-08-12 |
| Pemilik | Ari Widodo |
| Status | **Approved** — "Proceed." diberikan 2026-08-12 |
| Menggantikan | `PRD - Mutu Firma (SOQM Evaluasi Tahunan Q-01 + Independensi-Rotasi Q-03).md` → **Superseded** |
| Basis | master `d7dbe34` |

> **Catatan atas PRD pendahulu.** PRD Mutu Firma (Q-01/Q-03) berasumsi
> `useFirmAttest`/`FirmAttestCard` belum ada dan harus dibangun (Fase 0). Asumsi itu
> **salah** — `migration/src/firm_attest.tsx` sudah ada dan sudah dipakai. Tetapi
> koreksinya berjalan ke arah yang lebih buruk, bukan lebih baik: masalahnya bukan
> ketiadaan mesin atestasi, melainkan bahwa **gerbang mutu yang tampak lengkap di
> layar sebagian besar dapat dilewati**. PRD ini menggantikannya.
>
> Kelima Open Question PRD pendahulu dijawab di §11.

---

## 1. Problem

Pertanyaan pemicu: *"apakah aplikasi ini telah mengadopsi SPM 1 & SPM 2?"* Jawaban
struktural: ya. Delapan komponen ISQM 1 dimodelkan, daur risiko ¶25–34 lengkap,
EQR berdiri sebagai gerbang opini, rantai sign-off berjenjang ada di mana-mana.

Tetapi pertanyaan yang benar-benar penting berbeda: **apakah ia bertahan saat
diperiksa?** Pemeriksa P2PK tidak menilai apakah layar Anda menyebut "ISQM 1". Ia
menuntut bukti bahwa gerbangnya nyata, tanda tangannya milik orang yang membubuhkan,
dan angkanya dapat direkonsiliasi.

Diuji dengan standar itu, survei atas kode menemukan pola yang konsisten dan serius:
**Asseris menegakkan mutu di lapisan UI, di atas data seed yang sudah disetel agar
tidak pernah memblokir.** Sembilan belas cacat terverifikasi di kode — bukan dugaan,
masing-masing dengan berkas dan baris. Dikelompokkan menjadi empat kelas.

---

### Kelas A — Gerbang yang dapat dilewati

**A-1 · Opini dapat difinalisasi tanpa EQR — server tidak memeriksa sama sekali.**
Gerbang EQR hidup di dua permukaan klien:
[`view_opinion_parts.tsx:551`](migration/src/view_opinion_parts.tsx:551) dan
[`wp_signoff.tsx:595`](migration/src/wp_signoff.tsx:595). Di server,
`opinionDoc.v1.finalized` hanya menuntut `CAP.OPINION_APPROVE`
([`server/src/signoff.ts:275`](server/src/signoff.ts:275)); `eqrReviews.v2` **tidak
ada** di `SIGNOFF_KEYS` dan tidak pernah diminta sebagai dokumen saudara. Panggilan
tRPC langsung `state.set('opinionDoc.v1', {finalized:true})` oleh seorang Partner
menembus gerbang EQR sepenuhnya.

**A-2 · Perikatan PIE tanpa baris EQR melewati gerbang secara vacuous — persis di
kasus yang paling wajib.**

```ts
// wp_signoff.tsx:517
if (!list.length) return { applicable: false, cleared: true, count: 0, clearedCount: 0 };
```
```ts
// view_opinion_parts.tsx:497-498
const eqrEnforced        = eqrRequired || eqrGate.applicable;
const eqrSubstantiveDone = !eqrEnforced || eqrGate.cleared;
```

Untuk klien PIE tanpa satu pun baris EQR: `eqrEnforced = true`, tetapi
`eqrGate.cleared = true` dari cabang "tak ada baris" → `eqrSubstantiveDone = true`.
**Gerbang terbuka.** Komentar tepat di atasnya justru menyatakan maksud sebaliknya
("Berlaku bila klien PIE (wajib) ATAU ada review EQR"). Maksudnya benar; kodenya
melakukan kebalikannya pada kasus wajib. Kegagalan di sini fail-**open**, padahal
satu-satunya default yang aman adalah fail-closed.

**A-3 · Gerbang EQR dievaluasi dari localStorage ber-firm-id hardcode, dengan
fallback ke seed.** [`wp_signoff.tsx:506`](migration/src/wp_signoff.tsx:506) membaca
literal `'ams.v1.firm.FIRM-WHR.eqrReviews.v2'`; bila kosong ia jatuh ke
`window.AMS.EQR_REVIEWS` — seed di mana `EQR-040` sudah `cleared: true`. Gerbang
asurans yang bersandar pada cache browser dan seed demo bukan gerbang.

**A-4 · Gerbang etik & AML: nol penegakan server.** Berkas itu sendiri mengakuinya
([`ethics_gate.tsx:11`](migration/src/ethics_gate.tsx:11): "Penegakan saat ini di
LAPISAN UI"). `pc.ethics`, `amlScreening`, `ethicsOverride.v1` tak pernah disebut
`server/src/signoff.ts`. Tanda tangan kertas kerja dan finalisasi opini dapat
dibubuhkan lewat tRPC meski deklarasi etik belum ditandatangani dan AML belum bersih.

**A-5 · Gerbang etik fail-open untuk pengguna yang tak terpetakan ke `EMP-xxx`.**
[`ethics_compliance.ts:57`](migration/src/ethics_compliance.ts:57) mengembalikan
`blocked: false` bila `resolveEmpId` gagal — dan resolusinya mencocokkan email lalu
**nama**. Akun di luar roster melewati gerbang tanpa jejak.

**A-6 · Gerbang independensi tim hijau secara default, dipasang begitu oleh seed.**
[`member_independence.ts:133`](migration/src/member_independence.ts:133)
mengembalikan `signed: true, signedAt: '2026-01-15'` untuk **seluruh roster**.
Komentarnya menyatakan maksud itu terang-terangan: *"agar matriks memperlihatkan
variasi realistik **tanpa memblok penerbitan opini**"*. Gerbang yang dirancang agar
tidak pernah memblokir sudah gagal sebelum diuji.

**A-7 · Keputusan keberlanjutan disetujui tanpa memeriksa pemicunya.**
`continuance_engine.ts` menghasilkan pemicu rotasi & konflik ber-severity `high`,
tetapi `approveWp` ([`view_continuance.tsx:242`](migration/src/view_continuance.tsx:242))
hanya menuntut `FIRM_ADMIN` dan tidak memeriksa satu pun pemicu.
`continuanceDecisions` juga tak ada di `SIGNOFF_KEYS` — tak ada guard per-field
untuk `approved`/`approver`/`date`, padahal `prospects` justru punya.

**A-8 · Gerbang EQR→Arsip dapat di-override tanpa gerbang kedua.**
`wp_signoff.tsx:584` memberi severity `'confirm'`, dan pemegang `PHASE_OVERRIDE`
melewatinya ([`wp_signoff.tsx:656`](migration/src/wp_signoff.tsx:656)).

### Kelas B — Tanda tangan yang tidak membuktikan siapa pun

**B-1 · Simpulan evaluasi SPM tahunan adalah tanda tangan fiktif.**
[`view_governance.tsx:55`](migration/src/view_governance.tsx:55) merender *"Disusun
Anindya Pramesti, CPA (QM Leader) · Disetujui Hartono Wijaya, CPA (Managing
Partner)"* dengan lencana hijau **"Keyakinan Memadai"** dan pernyataan ¶54 lengkap —
seluruhnya dari konstanta beku `QM_EVAL`
([`data_part4.ts:177`](migration/src/data_part4.ts:177)). KPI "Simpulan Evaluasi
2025" bahkan literal JSX `value="Memadai"`. Modul ini **tidak pernah membaca**
`firmAttest`. Layar menyatakan Managing Partner telah menyetujui evaluasi SPM
tahunan; di sistem ia tidak pernah menyetujui apa pun.

**B-2 · Atestasi yang asli tidak pernah sampai ke server — dan gagal senyap.**
`attestKey = 'soqmAnnualEval.' + QM_EVAL.period`, dengan
`QM_EVAL.period = '1 Jan – 31 Des 2025'`. Allow-list baca server hanya menerima
empat digit:

```ts
// server/src/stateAccess.ts:65
return /^firmAttest\.soqmAnnualEval\.\d{4}$/.test(key);
```

→ `state.get` menolak `FORBIDDEN: firm-key-not-allowlisted` → penolakan ditelan
`.catch(() => { /* offline / no server: keep the cache */ })`
([`contexts.tsx:649`](migration/src/contexts.tsx:649)), **tak terbedakan dari
offline**. Penandatangan melihat centang hijau bernama dan bertanggal; tanda tangan
itu hanya hidup di localStorage browsernya. Rekan di mesin lain tidak melihat apa
pun. Bersihkan cache — lenyap.

**B-3 · Tanda tangan mutu firma tidak terikat isi & tidak divalidasi identitas.**
[`firm_attest.tsx:42`](migration/src/firm_attest.tsx:42) menulis `{by, at}` saja —
tanpa `byUserId`, dan `at` adalah string tampilan `toLocaleDateString('id-ID')`,
bukan ISO. `firmAttest.*` tidak ada di `SIGNOFF_KEYS` → `guardSignoffWrite` tidak
pernah berjalan atasnya. Dan `saveConclusion`
([`firm_attest.tsx:45`](migration/src/firm_attest.tsx:45)) menyalin `chain` apa
adanya: **tandatangani kesimpulan, lalu tulis ulang kesimpulannya, dan tanda tangan
tetap menempel pada teks yang tak pernah ditandatangani siapa pun.**

**B-4 · Menandatangani deklarasi Kode Etik mengafirmasi seluruh butir, apa pun
jawaban sebenarnya.**

```ts
// view_pc_conduct.tsx:47
const sign = (id) => setDecl(d => ({ ...d, [id]: { ...d[id], signed: true,
  date: '2026-03-09', items: ITEMS.map((_, i) => (d[id].items[i] ? 1 : 1)) } }));
```

Ternary itu mengembalikan `1` di **kedua** cabang. Fungsi ini juga menandatangani
`id` **siapa pun**, dengan tanggal **hardcode**, tanpa merekam penanda tangan. Seorang
Admin HR dapat "menandatangani" deklarasi Kode Etik seorang Partner, memaksa seluruh
butir menjadi terafirmasi, dan dengan itu membuka gerbang penerbitan opini.

**B-5 · Setiap auditor dapat menandatangani deklarasi independensi anggota tim mana
pun.** `MemberDeclaration` ([`member_independence.ts:32`](migration/src/member_independence.ts:32))
tidak punya field penanda tangan sama sekali — hanya `signed` + `signedAt`.
`canEdit` mencocokkan **string nama** dan hanya di UI;
`capForWrite('engagement','memberIndep.v1')` = `WP_EDIT`, dan kunci itu tak ada di
`SIGNOFF_KEYS`.

**B-6 · Penutupan EQR merekam nama penelaah dari seed, bukan pengguna sesi.**
[`view_eqr.tsx:35`](migration/src/view_eqr.tsx:35) menulis `clearedBy: pr.reviewer`.
Ini kelas cacat "ditugaskan ≠ menandatangani" yang sudah ditutup repo untuk kertas
kerja dan opini, tetapi terlewat di sini. Tanpa `byUserId` di mana pun pada EQR.

**B-7 · Rantai persetujuan deklarasi AP tanpa `can()` dan tanpa `byUserId`.**
`onApprove` ([`view_people.tsx:564`](migration/src/view_people.tsx:564)) dapat
dipanggil siapa saja yang membuka drawer; `toggle(d.id)` membalik status deklarasi
orang lain dengan satu klik; reset ke `{level:0, steps:[]}` menghapus seluruh jejak
tanpa gerbang.

**B-8 · Penanggung jawab operasional SPM tidak bisa menandatangani — gagal senyap.**
`capForWrite('firm', …)` jatuh ke default `FIRM_ADMIN`
([`rbac.ts:174`](migration/src/rbac.ts:174)), hanya dipegang tiga peran partner.
ISQM 1 ¶20(b) menempatkan tanggung jawab operasional pada QM Leader — di data firma
ini **Anindya Pramesti, seorang Manager**. Ia orang yang namanya dicetak sebagai
penyusun evaluasi, dan satu-satunya yang tidak bisa menyimpannya. Efek samping yang
sama membuat penutupan gerbang EQR di-gate `FIRM_ADMIN` alih-alih `CAP.EQR_REVIEW`;
kapabilitas penelaah yang sebenarnya **tidak pernah dikonsultasikan**, dan
`view_eqr.tsx` tidak punya satu pun `can()`.

### Kelas C — Angka yang dilaporkan ke regulator tidak rekonsiliasi

**C-1 · SKP/PPL yang dilaporkan terputus dari ledger SKP.** Modul PPPK membaca seed
`PPPK_PPL`; modul CPE/HCM/Personal membaca ledger `cpeLog` yang persist dan dapat
disunting. Keduanya tak pernah bertemu — padahal
[`view_pppk.tsx:158`](migration/src/view_pppk.tsx:158) menyatakan kepada pengguna
*"Sumber data terhubung ke CPE / PPL Tracker"*. Rekonsiliasi nyata (kewajiban
40 SKP / 20 terstruktur):

| AP | Dilaporkan (`PPPK_PPL`) | Ledger (`cpeLog`) | Layar PPPK | Kenyataan |
|---|---|---|---|---|
| Hartono Wijaya | 44 / 22 | **24 / 14** | Terpenuhi | **Tidak terpenuhi** |
| Rudi Gunawan | 41 / 20 | **18 / 12** | Terpenuhi | **Tidak terpenuhi** |
| Sari Dewanti | 38 / 18 | **31 / 22** | Belum terpenuhi | terstruktur justru **lolos** |

Dua Akuntan Publik ditampilkan patuh PPL padahal catatan firma sendiri menyatakan
sebaliknya. Bukan selisih pembulatan — kedua himpunan tidak berhubungan, dan arah
salahnya berbeda-beda.

**C-2 · Dua register rotasi bocor dua arah.** `INDEPENDENCE` memodelkan rotasi
sebagai **satu** `rotationClient` per orang
([`data_part1.ts:392`](migration/src/data_part1.ts:392)), padahal satu AP dapat
terikat banyak klien:

- **Rudi Gunawan × PT Mandiri Sejahtera Finance — 6 tahun atas batas 3 tahun**
  (sektor jasa keuangan); pelanggaran **terberat** di seluruh data. Hanya ada di
  `PPPK_ROTATION`; **tak terlihat di modul Independensi**.
- **Lestari Handayani × PT Bank Arta Nusantara Tbk — 2,5 dari 3 tahun**, sektor jasa
  keuangan. Ada di `INDEPENDENCE`, **hilang dari `PPPK_ROTATION`** — register yang
  dilampirkan ke Laporan Tahunan KAP.

**C-3 · Status rotasi adalah teks seed, bukan turunan aritmetika.** Hartono × Bumi
Hijau bertenure 4 dari batas 5 diberi label `'Tahun Terakhir'`; peta warna `ROT_STAT`
menyimpan kunci `'Tahun ke-6'` yang tak dipakai satu baris pun. `tenure` sendiri tak
pernah berubah — tidak ada jalur tulis — dan cooling-off tak dilacak sebagai register
("sejak kapan partner X keluar dari klien Y"), hanya angka yang ditampilkan.

**C-4 · Dua modul mutu firma, angka berbeda, keduanya mengklaim SPM.** Governance
menurunkan KPI dari `QM_COMPONENTS` yang **di-hardcode**: skor **87%**, defisiensi
terbuka **3**. SOQM menurunkan dari register hidup `SOQM_RISKS`: **83%**, defisiensi
**1**. Fungsi yang menghitung dari data hidup (`mapName`) sudah ditulis tepat di
atasnya dan **tidak pernah dipakai**
([`view_isqm_parts.tsx:102`](migration/src/view_isqm_parts.tsx:102)).

### Kelas D — Artefak wajib yang tidak dapat ditulis

**D-1 · Cakupan EQR tidak diturunkan dari populasi perikatan.** `EQR_REVIEWS` adalah
daftar seed tiga baris; tidak ada `addReview` di seluruh `view_eqr.tsx`. Tidak ada
aturan pemicu (PIE / risiko / ambang materialitas). Satu-satunya ambang nilai yang
nyata adalah `AJE_EQR_THRESHOLD = 2e9` — konstanta Rp 2 M yang **tak terkait
materialitas perikatan**.

**D-2 · Kelayakan penelaah (ISQM 2 ¶18–20) adalah boolean seed.**
`EQR_META[id].coolingOk / compOk / objOk` beku bernilai `true`. Cooling-off tidak
dihitung dari riwayat penugasan; kompetensi tidak diturunkan dari data personel;
objektivitas tidak diuji terhadap register ancaman. Uji "penelaah ≠ partner
perikatan" **sudah ada** tetapi hanya diagnostik dan membaca seed
([`view_isqm_parts.tsx:48`](migration/src/view_isqm_parts.tsx:48)).

**D-3 · Temuan EQR read-only → `EQR-063` tak akan pernah bisa ditutup.**
`openFindings` adalah separuh syarat `canClear`, tetapi tidak ada UI menambah atau
menutup temuan. Konsultasi (¶21) & perbedaan pendapat (¶22) juga read-only dari
`EQR_META`; konsultasi berstatus "Terbuka" tidak memblokir penutupan.

**D-4 · Inspeksi, temuan, remediasi, dan keluhan tidak ber-penandatangan.**
`QM_INSPECTIONS` / `QM_INSP_FINDINGS` / `QM_MON_ACTIVITIES` tidak punya jalur tulis
sama sekali. `advComplaint` ([`view_isqm.tsx:52`](migration/src/view_isqm.tsx:52))
memajukan keluhan hingga **"Selesai" tanpa penandatangan, tanpa tanggal, tanpa
dasar** — persis artefak ¶A56 yang pertama ditarik pemeriksa.

**D-5 · Ketergantungan imbalan, pra-persetujuan NAS, dan asosiasi jangka panjang
sepenuhnya display-only.** Tiga tab di `view_independence_parts.tsx` (169 baris)
tidak punya satu pun `useAmsPersist`, setter, atau `can()`. Keputusan NAS
(`Disetujui`/`Ditolak`) dan penyetujunya tidak bisa diubah; pemicu ketergantungan
imbalan tidak bisa di-acknowledge.

**D-6 · Modul Pelaporan PPPK sepenuhnya display-only.** Tombol **"Ajukan Laporan
Tahunan"** tanpa `onClick` ([`view_pppk.tsx:46`](migration/src/view_pppk.tsx:46)).
Panel "Kesiapan Inspeksi P2PK" — inspeksi terakhir, hasil, temuan terbuka —
seluruhnya seed. Hitung mundur tenggat menyalin `"2026-03-09"` alih-alih mengimpor
konstanta kanonik `TODAY`.

---

### Mengapa ini serius bagi Ari secara pribadi

Ari adalah AP penandatangan. Empat cacat menyentuh langsung berkas yang akan ditarik
pemeriksa atas namanya: simpulan SPM tahunan yang tak bereksistensi di server
(B-1/B-2), kepatuhan PPL yang dilaporkan bertentangan dengan ledger firma (C-1),
pelanggaran rotasi terberat yang tak muncul di modul independensi (C-2), dan gerbang
EQR yang terbuka justru pada klien PIE (A-2). Kelemahan di titik-titik itu bukan
risiko produk — ia risiko sanksi personal.

### Mengapa 1250 uji tidak menangkap satu pun

Nihil uji untuk `view_isqm*`, `view_governance`, `firm_attest`, `view_pppk`, dan
`view_pc_conduct`. Yang ada menguji fungsi kanon murni; gerbang justru hidup di
lapisan yang tak diuji, di atas seed yang disetel agar hijau. Ini pengulangan pola
yang sudah tiga kali muncul di repo ini (materialitas, AJE, WTB): **oracle uji
memaku jalur yang tak dipakai satu pun view.**

---

## 2. Objective

Menjadikan gerbang dan artefak SPM 1 & SPM 2 **dapat dipertahankan di hadapan
pemeriksa**: ditegakkan server, bertanda tangan identitas nyata, terikat pada isi
yang ditandatangani, bertanggal terverifikasi, dan dapat direkonstruksi.

Dua prinsip pemandu:

1. **Gerbang gagal-tertutup.** Ketiadaan bukti tidak boleh berarti lolos. Setiap
   default `cleared: true` pada kondisi "data tidak ada" adalah cacat.
2. **Tak satu pun angka atau tanda tangan mutu berasal dari seed.** Bila sistem tak
   dapat membuktikannya, ia tidak boleh menampilkannya sebagai fakta.

## 3. Success Criteria

1. **Gerbang EQR ditegakkan server** — `opinionDoc.v1.finalized` menuntut EQR
   sebagai dokumen saudara; panggilan tRPC langsung ditolak. Dijaga uji server.
2. **Fail-closed terbukti** — uji yang hari ini **gagal**: perikatan PIE tanpa baris
   EQR harus memblokir finalisasi opini.
3. **Nol tanda tangan fiktif** — tidak ada layar menampilkan penyusun/penyetuju yang
   tak berasal dari atestasi tersimpan.
4. **Atestasi mendarat di server** — `state.get` mengembalikan `version > 0`;
   terverifikasi HIDUP, bukan mock.
5. **Tanda tangan gugur otomatis** saat isi berubah (`contentHash`, pola
   `wpChainLinks` yang sudah ada).
6. **Identitas & waktu divalidasi server** untuk `firmAttest.*`, `eqrReviews.v2`,
   `memberIndep.v1`, `pc.ethics` — masuk `SIGNOFF_KEYS`, `byUserId` + stempel ISO.
7. **Seed berhenti memuaskan gerbang** — `seedDeclarations` tidak lagi menandatangani
   siapa pun; matriks independensi mulai dari kosong.
8. **QM Leader (Manager) dapat menandatangani** artefaknya; penutupan EQR menuntut
   `CAP.EQR_REVIEW`, bukan `FIRM_ADMIN`. Diverifikasi dengan sesi peran nyata.
9. **Nol kegagalan tulis senyap** — allow-list ditembus; 403 tak lagi tak-terbedakan
   dari offline.
10. **PPL & rotasi rekonsiliasi** — angka diturunkan dari ledger; nol baris yang ada
    di satu register dan hilang di yang lain (uji rekonsiliasi dua arah).
11. **Cakupan EQR diturunkan dari populasi** — perikatan pemicu-EQR tanpa baris
    menghasilkan pelanggaran yang terlihat.
12. **Berkas pemeriksaan dapat diterbitkan** — satu aksi menghasilkan paket bersegel
    Ed25519 dengan `contentHash` yang dapat diverifikasi ulang.
13. Gerbang teknis tiap PR: `npm run verify` hijau penuh.

## 4. Scope

- Penegakan server untuk gerbang EQR, etik/AML, dan independensi tim (perluas
  `SIGNOFF_KEYS` + `signoffContextNeeds`).
- Pembalikan default fail-open menjadi fail-closed pada `eqrStatusFor`.
- Pengerasan `firm_attest.tsx` menjadi atestasi ber-identitas & terikat-isi;
  perkabelan empat titik server untuk kunci mutu firma.
- Pencabutan seed yang memuaskan gerbang (`seedDeclarations`, `EQR_META.*Ok`).
- Perbaikan `sign()` Kode Etik (ternary `? 1 : 1`, identitas, tanggal).
- Governance membaca atestasi nyata; `QM_COMPONENTS` diturunkan dari register hidup.
- Kanon baru `canon_firm_quality.ts` (murni, deterministik, ber-uji): status rotasi
  per rezim · rekonsiliasi PPL · rekonsiliasi dua register rotasi · cakupan EQR atas
  populasi · kesiapan berkas pemeriksaan.
- Jalur tulis + atestasi untuk inspeksi, temuan, remediasi, keluhan, temuan EQR.
- Modul **Berkas Pemeriksaan P2PK**: rakit bukti dari SSOT, tandai gerbang yang
  gagal, ekspor bersegel.

## 5. Non-Scope

- Integrasi e-reporting PPPK nyata (tetap artefak untuk diunggah manual).
- e-Meterai / PSrE tersertifikasi — segel Ed25519 membuktikan integritas & penyegel,
  bukan kekuatan bea meterai (batas ini sudah tertulis di `export_pdf.ts`).
- Reminder rotasi ke Google Calendar (jalur terpisah, sesuai konvensi vault).
- Multi-tenant per-firma (lihat W7.5).
- Membangun ulang daur risiko ¶25–34 yang sudah persist.
- **Verifikasi kutipan regulasi** — lihat §9.

## 6. Constraints

- ESM-only, edit `migration/src/*`; aturan emas repo (alias hook per-file, `app.tsx`
  terakhir, tanpa `const styles` global).
- Angka dari `canon*`/data — tak boleh hardcode (inti cacat C-4).
- Ratchet `no-explicit-any`: kode baru bertipe penuh; satu `any` baru meng-un-suppress
  seluruh berkas.
- `master` selalu hijau (R-7); repro cacat yang belum ditutup memakai `it.fails()`.
- Skala tipografi mengikat (8 ukuran) & token warna semantik.
- Mengubah seed menggeser agregat demo — snapshot `canon_regression.test.ts` wajib
  ikut diperbarui.

## 7. Existing Solutions — dipakai ulang, bukan dibangun ulang

Survei menemukan infrastruktur yang sudah matang. Sebagian besar pekerjaan adalah
**menyambung**, bukan mencipta:

| Kebutuhan | Yang sudah ada | Status |
|---|---|---|
| Validasi identitas/waktu tanda tangan | `signatureAttributionViolations` (`wp_chain.ts:315`) — 6 kode pelanggaran | **pakai apa adanya** |
| Tanda tangan gugur saat isi berubah | `wpContentHash` + `wpChainLinks` | **pakai apa adanya** |
| Satu-orang-satu-langkah | `wpChainSelfReviewBy` | **pakai apa adanya** |
| Gerbang dokumen-saudara server | `signoffContextNeeds` + `loadSignoffContext` — sudah dipakai gerbang pakar SA 620 | **pola siap pakai** |
| Jalur deklarasi beridentitas-benar | `personalSelfService.declareSelf` — server menurunkan `empId` dari sesi | **ada, belum dipakai UI** |
| Kartu atestasi + rantai peran | `firm_attest.tsx` | ada; perlu identitas & ikatan-isi |
| Riwayat append-only bertanggal | `state.history` | **pakai apa adanya** |
| Jejak audit hash-chain | otomatis untuk setiap `state.set`, termasuk firm-scope | **pakai apa adanya** |
| Lampiran ber-sha256 firm-scope | `attachment.*`; sudah hidup di DMS | **pakai apa adanya** |
| Ekspor bersegel Ed25519 | `amsExportPdf`/`amsExportXlsx` + `exporter.seal` | **pakai apa adanya** |
| Pola kanon rekonsiliasi register | `canon_deficiency.ts` (SA 265) | tiru polanya |

Yang benar-benar baru hanyalah `canon_firm_quality.ts` dan modul berkas pemeriksaan.
Bahwa `declareSelf` sudah ada di server tetapi tidak dipakai satu pun UI adalah
temuan tersendiri: jalur yang benar sudah dibangun, lalu dilewati.

## 8. Proposed Approach — tujuh PR bertumpuk

Urutan disengaja: **gerbang yang bisa dilewati lebih dulu.** Selama A-1/A-2 hidup,
setiap perbaikan lain menumpuk di atas fondasi yang tidak menahan apa pun.

**PR-1 · Gerbang EQR ditegakkan server & fail-closed.** *(A-1, A-2, A-3)*
Uji merah dulu: perikatan PIE tanpa baris EQR harus memblokir. Balik default
`eqrStatusFor` menjadi fail-closed untuk klien `listed`; `eqrStatusFor` membaca state
server, bukan localStorage hardcode; `eqrReviews.v2` masuk `SIGNOFF_KEYS` dan
`opinionDoc.v1.finalized` menuntutnya sebagai dokumen saudara — pola SA 620 yang
sudah ada.

**PR-2 · Gerbang etik, AML & independensi tim ditegakkan server.** *(A-4, A-5, A-6,
B-4, B-5)* Cabut `seedDeclarations` yang menandatangani seluruh roster; perbaiki
ternary `? 1 : 1`; `pc.ethics` & `memberIndep.v1` masuk `SIGNOFF_KEYS` dengan
`byUserId`; balik fail-open `resolveEmpId` menjadi fail-closed bertanda; alihkan
deklarasi diri ke `personalSelfService.declareSelf` yang sudah ada.

**PR-3 · Atestasi mutu firma yang tak bisa dipalsukan.** *(B-2, B-3, B-8)*
Normalisasi `attestKey` ke tahun 4-digit; tulis `{by, byUserId, at: ISO,
contentHash}`; `firmAttest.*` masuk `SIGNOFF_KEYS`; cabang `capForWrite` untuk peran
mutu; tanda tangan gugur saat kesimpulan berubah. Uji merah: sign → ubah kesimpulan
→ harus gugur.

**PR-4 · Governance berhenti berbohong.** *(B-1, C-4)*
Hero simpulan & KPI dibaca dari `firmAttest`; bila belum ditandatangani tampilkan
**"Belum dievaluasi"**. Hidupkan `mapName`; `QM_COMPONENTS.risks/.defs` diturunkan
dari `SOQM_RISKS`. Satu angka defisiensi.

**PR-5 · PPL & rotasi rekonsiliasi.** *(C-1, C-2, C-3)*
`canon_firm_quality`: `pplReconcile()` dari `cpeLog`+`cpeExtra`; model rotasi 1:N;
`rotationStatus(tenure, limit, rezim)` deterministik; uji rekonsiliasi dua arah yang
gagal hari ini.

**PR-6 · SPM 2 punya populasi, kelayakan & temuan nyata.** *(D-1, D-2, D-3, B-6)*
`eqrCoverage(engagements, eqrReviews)`; kelayakan ¶18–20 menjadi penilaian
ber-atestasi; temuan/konsultasi/perbedaan pendapat dapat ditulis; `clearedBy` merekam
pengguna sesi.

**PR-7 · Berkas Pemeriksaan P2PK.** *(D-4, D-5, D-6, A-7, A-8)*
Modul yang merakit bukti per komponen SPM dari SSOT, menandai setiap gerbang yang
gagal, menerbitkan paket bersegel. Jalur tulis + atestasi untuk inspeksi, temuan,
remediasi, keluhan, NAS, ketergantungan imbalan.

## 9. Risks

- **Kutipan regulasi belum diverifikasi.** Aplikasi mengutip PMK 186/PMK.01/2021,
  POJK 13/POJK.03/2017, PP 20/2015 Ps. 11, tenggat 30 April, dan kewajiban 40/20 SKP.
  Saya **tidak memverifikasi** rujukan ini terhadap teks resmi. Untuk produk yang
  dijual ke KAP, kutipan salah adalah liabilitas. **Perlu konfirmasi Ari sebagai
  pakar domain** sebelum PR-7. Mitigasi sementara: tidak menambah kutipan baru.
- **Membalik fail-open menjadi fail-closed akan memblokir alur demo.** Perikatan
  yang selama ini lolos akan berhenti. Ini benar dan diinginkan, tetapi mengubah
  pengalaman demo secara mencolok — perlu seed EQR yang jujur agar demo tetap dapat
  diperagakan.
- **Mencabut seed yang memuaskan gerbang menggeser agregat.** Persis yang terjadi
  di arc estimasi (pencabutan seed M-04 menurunkan agregat dari "di atas
  materialitas" ke 84%). Mitigasi: perbarui snapshot kanon dalam PR yang sama;
  catat pergeseran eksplisit.
- **`firmAttest` masuk `SIGNOFF_KEYS` menolak stempel lama.** `toLocaleDateString`
  langsung ditolak. Mitigasi: migrasi stempel di PR yang sama; hanya tanda tangan
  yang BERUBAH diperiksa, jadi data warisan aman.
- **Scope besar — tujuh PR.** Mitigasi: tiap PR berdiri sendiri, hijau, dan berguna
  walau arc dihentikan di tengah.

## 10. Implementation Plan

Per PR: uji-merah dulu (repro cacat) → implementasi → `npm run verify` → verifikasi
hidup bila kredensial dev tersedia → commit → PR → perbarui `docs/PRD-REGISTRY.md`.
Setelah arc: perbarui memori, tandai PRD pendahulu `Superseded`.

## 11. Keputusan yang diadopsi dari PRD pendahulu

| # | Pertanyaan | Keputusan |
|---|---|---|
| Q1 | Otoritas sign-off | Evaluasi SPM: rantai **dua lapis** — QM Leader (¶20(b), penyusun) → Managing Partner (¶20(a), penyetuju). `FaRole.needsPrev` sudah mendukungnya; hari ini hanya satu lapis. |
| Q2 | Model periode | Tahun 4-digit sebagai kunci (memenuhi allow-list) + `state.history` sebagai riwayat. |
| Q3 | Penyempitan Q-01 | **Ditolak.** Gap jauh lebih dalam: bukan menambah sign-off, melainkan gerbang yang dapat dilewati dan atestasi yang tak sampai server. |
| Q4 | Urutan Q-03 | Diubah — independensi didahulukan sebagai **PR-2**, karena gerbangnya dapat dilewati, bukan sekadar kurang persist. |
| Q5 | Google Calendar | Ditunda, sesuai rekomendasi. |

## 12. Open Questions — sebagian DIJAWAB 2026-08-12

**Q1 · Verifikasi kutipan regulasi — DIJAWAB oleh Ari. Menghasilkan dua cacat baru.**

| Rujukan | Status | Akibat |
|---|---|---|
| PMK 186/PMK.01/2021 | Berlaku — perizinan, independensi, PPL, QR laporan, pelaporan tahunan, pemeriksaan, sanksi | dasar utama |
| PP 20/2015 Ps. 11 | Berlaku — 5 tahun buku berturut, jeda 2 tahun, berlaku untuk **AP individual, bukan KAP** | kutipan aplikasi **benar** |
| Tenggat akhir April | Benar (Ps. 40) — tiga laporan: kegiatan usaha · keuangan KAP · program pengembangan profesi (bila ada rekan/TK asing) | aplikasi hanya memodelkan satu dari tiga |
| **POJK 13/POJK.03/2017** | **DICABUT**, digantikan **POJK 9/2023** | dikutip di 11 tempat — **belum diperbaiki (C-6)** |
| **40/20 SKP** | **SALAH.** Ps. 37: 40 SKP, min **30 terstruktur**, maks **10 tidak terstruktur**; 20 itu materi wajib (4 pembinaan + 16 akuntansi/asurans) DI DALAM yang terstruktur. Laporan realisasi: **akhir Januari**. Carry-forward maks 10 | **ditutup (C-5)** |

**C-5 (baru, DITUTUP) · Ambang PPL keliru → nasihat kepatuhan yang salah.**
Aplikasi meluluskan AP pada 20 SKP terstruktur padahal syaratnya 30, dan sama
sekali tidak memodelkan batas atas 10 SKP tidak terstruktur — sehingga "44 SKP"
yang bernilai 32 SKP terhitung tampil sebagai kelebihan. Ditutup oleh
`canon_ppl.ts` (PR terpisah, di luar urutan PR-1..7 karena mendesak).

**C-6 (baru, TERBUKA) · Kutipan peraturan yang sudah dicabut.**
POJK 13/POJK.03/2017 masih menjadi dasar batas rotasi sektor jasa keuangan di
`data_part1`, `data_part4`, `data_ojk`, `view_people`, `view_dashboard2`.
Menunggu Q5.

**Q2 · Nasib seed yang memuaskan gerbang — DIJAWAB: pertahankan sementara.**
Data seed dipertahankan (demo tetap terisi), tetapi ia **tidak boleh memuaskan
gerbang**: deklarasi ber-provenance seed diperlakukan sebagai *belum dinyatakan*.
Dikerjakan di PR-2.

**Q3 · Governance saat belum ditandatangani** — belum dijawab; rekomendasi tetap
"Belum dievaluasi". Diputuskan saat PR-4.

**Q4 · `AJE_EQR_THRESHOLD`** — belum dijawab; diputuskan saat PR-6.

**Q5 (baru) · Substansi POJK 9/2023.** Aplikasi memakai batas **3 tahun buku** +
cooling-off 2 tahun untuk sektor jasa keuangan, bersumber dari POJK 13/2017 yang
kini dicabut. **Saya tidak mengetahui apakah POJK 9/2023 mempertahankan angka
itu.** Memperbarui kutipan tanpa memastikan substansinya berarti mengganti satu
klaim salah dengan klaim salah lainnya. Butuh konfirmasi sebelum PR-5.
