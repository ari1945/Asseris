# PRD — AJE: Imutabilitas Jurnal Posted, Persetujuan Hidup, & Restrukturisasi Modul

> Wajib diisi sebelum implementasi apa pun.
> Implementasi TIDAK dimulai sebelum ada sign-off ("Proceed.").

| Field | Isi |
|---|---|
| Tanggal | 2026-08-07 |
| Pemilik | Ari Widodo |
| Status | **Menunggu sign-off** |
| Engagement ID terkait | — (produk Asseris, bukan perikatan klien) |
| Pemicu | Evaluasi modul AJE 2026-08-07 (6 temuan: 2×P0, 3×P1, 1×P2). Setiap klaim di §1 diverifikasi dengan probe eksekusi, bukan pembacaan kode (Lampiran A) |
| Arc terkait | PR-A…PR-E AJE (MERGED), PR-B gerbang otorisasi posting, #169 rantai sign-off WP, `docs/prd-wtb-integrity-falsifiable-gates.md` |

---

## 1. Problem

PR-B menutup satu cacat besar: status posting tidak lagi menjadi bukti persetujuan, dan rantai
dibangun dari keputusan yang benar-benar tercatat. Enam temuan berikut menunjukkan bahwa lapisan
itu **berhenti di antrean persetujuan** — ledger jurnalnya sendiri, formulirnya, dan tab
persetujuan di dalam modul AJE belum ikut.

### P0-a — Jurnal yang sudah Posted masih dapat ditulis ulang, tanpa otorisasi apa pun

`guardSignoffWrite('aje', …)` hanya mem-diff **status**. Isi jurnal di luar status tidak diperiksa
([signoff.ts:129-140](../server/src/signoff.ts:129)), dan uji yang ada justru **memaku** perilaku
itu sebagai benar ([signoff.test.ts:202](../server/src/__tests__/signoff.test.ts:202): "mengubah
isi jurnal TANPA mengubah status tidak menuntut AJE_POST").

Probe (Lampiran A.1) — satu tulisan `state.set` yang mengubah nilai, kedua akun, dan deskripsi
sebuah jurnal berstatus `Posted`:

```
guard(Posted → Posted, amount 2.340 jt → 9.999 jt, akun 5-3100/2-1300 → 1-1100/4-1000) = []
                                                          ↑ tidak ada kapabilitas yang dituntut
```

Gerbang yang tersisa hanya `capForWrite('engagement','aje') = AJE_EDIT`, yang dimiliki **Senior
Auditor**. Artinya: setelah Rekan Perikatan menyetujui dan memposting AJE-01, seorang Senior dapat
mengganti angka dan akunnya menjadi apa pun, jurnal tetap berstatus `Posted`, rantai persetujuan
lama tetap tertera lengkap dengan nama dan tanggal Partner — dan `userPostDeltas`
([contexts.tsx:878-887](../migration/src/contexts.tsx:878)) mengalirkan baris baru itu ke WTB,
lalu ke LK, materialitas, SAD, dan opini.

Ini bukan "kontrol yang longgar". Ini **tanda tangan Partner yang dipindahkan ke dokumen yang
berbeda** — kelas cacat yang sama dengan pemalsuan persetujuan yang ditutup PR-B, hanya dari arah
sebaliknya.

### P0-b — Waktu keputusan adalah konstanta

Setiap keputusan persetujuan yang diambil pengguna dicap `PF_STAMP`
([view_platform.tsx:20](../migration/src/view_platform.tsx:20),
[:184](../migration/src/view_platform.tsx:184)):

```js
const PF_STAMP = '10 Mar 09:00';
…
decisions = [...prev.decisions, { idx, stepRole, name, role, ts: PF_STAMP, note }]
```

Persetujuan yang diberikan hari ini tercatat sebagai "10 Mar 09:00" — untuk selamanya, untuk semua
orang, untuk semua jurnal. `PF_NOW` yang menghitung SLA adalah konstanta yang sama, sehingga
"Sisa 8 jam" tidak pernah berubah. Jejak keputusan yang salah tanggal bukan bukti audit; SA 230
¶8-11 menuntut *kapan* prosedur dilaksanakan dan direviu.

Cacat kembar di lapisan seed: **setiap** AJE mengaku diajukan pada menit yang sama,
`submitted: '2026-03-09 16:40'` ([data_platform.ts:161](../migration/src/data_platform.ts:161)),
padahal `AJE_META.proposedOn` menyebut 4 Mei, 6 Mei, 28 Mei, 9 Mei, dan 30 Mei
([view_aje.tsx:42-46](../migration/src/view_aje.tsx:42)). Dua modul, satu fakta, dua jawaban.

### P1-c — Tab "Persetujuan & Jejak Audit" di AJE membaca seed, bukan antrean

`AjeApprovals` menyusun rantai dari `AJE_META` (`reviewer`, `partner`, `reviewedOn`, `postedOn`)
dan menandai langkah Partner selesai semata dari `a.status === 'Posted'`
([view_aje.tsx:682-762](../migration/src/view_aje.tsx:682)). Ia tidak pernah membaca
`approvals_ov_v4` — dokumen tempat keputusan nyata disimpan. Konsekuensi: sebuah jurnal yang baru
disetujui di antrean tetap tampil tanpa penyetuju, dan jurnal baru buatan auditor tampil dengan
reviewer `—` selamanya, betapapun panjang rantai yang sudah berjalan.

### P1-d — Rantai di AJE selalu tiga tahap; antrean bisa empat

`ApprovalCard` mengeraskan tiga langkah ([view_aje.tsx:745-749](../migration/src/view_aje.tsx:745)),
sedangkan `buildApprovals` menambahkan langkah **EQR Reviewer** bila nilai ≥ Rp 2 M
([data_platform.ts:142](../migration/src/data_platform.ts:142)). Probe atas seed (Lampiran A.2)
menunjukkan kontradiksi hidup pada AJE-01 (Rp 2,34 M, `Posted`):

| Tampilan | Yang dilihat auditor |
|---|---|
| Tab AJE → Persetujuan | 3 langkah, ketiganya hijau — **selesai** |
| Modul Approvals | 4 langkah, `EQR Reviewer: current` — **menunggu EQR**, `postedWithoutFullChain: true` |

Satu jurnal, dua jawaban, dan yang lebih menenangkan adalah yang salah.

### P1-e — Formulir AJE tidak menuntut keterkaitan

Ref. WP opsional dan jatuh ke literal `'JE'`
([view_execution.tsx:1589](../migration/src/view_execution.tsx:1589),
[:1593](../migration/src/view_execution.tsx:1593)); tautan SAD dan asersi opsional; tidak ada
tanggal efektif, sumber bukti, maupun lampiran. Sebuah jurnal karenanya dapat diajukan — dan
disetujui — tanpa satu pun jangkar ke prosedur, bukti, atau salah saji. Hilirnya nyata: entri
tanpa `mis` tidak pernah sampai ke agregasi SA 450, dan `WP JE` tidak dapat dibuka
`openCanonicalWp`.

### P2-f — Register hanya punya filter status/jenis

Empat tombol segmen ([view_aje.tsx:263-278](../migration/src/view_aje.tsx:263)) — tanpa pencarian,
tanpa sort, tanpa filter materialitas/siklus/WP/SAD/penyusun/pemilik langkah. Memadai untuk 5
jurnal seed; tidak untuk perikatan nyata dengan 80.

---

## 2. Objective

1. **Jurnal Posted menjadi tidak dapat diubah** — koreksi hanya lewat pembalikan/penggantian.
2. **Persetujuan menjadi satu sumber kebenaran** yang dibaca semua permukaan, dengan waktu nyata
   dan keterikatan pada versi jurnal yang disetujui.
3. **Modul AJE memperlihatkan keadaan persetujuan yang sebenarnya** — panjang rantai dinamis,
   penugasan, penghambat, SLA — tanpa pengguna berpindah modul.
4. **Formulir menuntut keterkaitan** yang membuat jurnal dapat ditelusuri ke prosedur & bukti.
5. **Register dapat dipakai pada skala perikatan nyata.**

## 3. Success Criteria (semuanya harus DAPAT GAGAL)

| # | Kriteria | Cara memfalsifikasi |
|---|---|---|
| S1 | Mengubah nilai/akun/deskripsi/WP/SAD/asersi jurnal `Posted` ditolak server dengan `posted-immutable:<id>`, untuk **setiap** peran termasuk Rekan Pemimpin | uji: `guardSignoffWrite('Rekan Pemimpin','aje',posted,tampered)` **throw** |
| S2 | Mengubah isi jurnal `Proposed` yang sudah punya keputusan tercatat **menggugurkan** keputusan itu: rantai kembali ke langkah 1 dan langkah-langkah lama ditandai "gugur — jurnal berubah" | uji: keputusan ber-`hash` lama tidak lagi terhitung `approved` |
| S3 | Keputusan baru membawa stempel waktu nyata (ISO, dalam ±10 menit jam server); stempel di luar jendela ditolak | uji server: ts +2 jam → `FORBIDDEN stale-timestamp` |
| S4 | Tab "Review & Persetujuan" di AJE dan modul Approvals menampilkan **rantai yang identik** untuk jurnal yang sama (jumlah langkah, status per langkah, nama, waktu) | uji: satu builder, dua pemanggil, snapshot sama; probe AJE-01 = 4 langkah di kedua tempat |
| S5 | AJE-01 (Rp 2,34 M, Posted tanpa EQR) tampil sebagai **eksepsi kontrol** di register dan di tab review, bukan sebagai jurnal selesai | probe: chip merah `Posted tanpa rantai lengkap` |
| S6 | Jurnal `adjusting` tanpa Ref. WP, atau tanpa item SAD **dan** tanpa alasan eksplisit, tidak dapat diajukan | uji murni `validateAjeDraft()` |
| S7 | Pembalikan (`reverseAje`) menghasilkan jurnal baru berstatus `Proposed` dengan baris terbalik, `reverses: <id>`, dan jurnal asal tetap utuh & `Posted` | uji murni |
| S8 | Register: pencarian + sort + filter (materialitas/siklus/WP/SAD/penyusun/pemilik langkah) mengembalikan himpunan yang benar | uji murni atas fungsi filter |
| S9 | `npm run typecheck` 0 error, ESLint tanpa `any` baru, seluruh uji hijau (baseline saat ini: lihat §10) | gerbang CI |

## 4. Scope

**Klien (`migration/src`)**
- **Modul baru `aje_contract.ts`** (TS strict, murni, tanpa React/DOM) — SSOT lintas klien+server:
  `ajeContentHash()`, `ajeChainSteps()` (routing → langkah), `buildAjeChain()` (langkah + keputusan
  → rantai), `applyAjeDecision()`, `stepAuthority()` (dipindah dari `view_platform.tsx`),
  `validateAjeDraft()`, `reverseEntryFrom()`.
- `data_platform.ts` — `buildApprovals` memanggil `aje_contract` alih-alih logika lokalnya;
  `submitted`/`due` diturunkan dari tanggal jurnal, bukan konstanta.
- `view_platform.tsx` — `PF_STAMP`/`PF_NOW` → jam nyata; `decide()` memakai `applyAjeDecision`;
  keputusan membawa `ts` ISO + `hash`.
- `contexts.tsx` — `updateAje()` baru (menolak jurnal `Posted`), `reverseAje()`, jejak aktivitas
  untuk penggantian yang menggugurkan persetujuan.
- `view_aje.tsx` — restrukturisasi 5 tab; tab **Review & Persetujuan** membaca antrean hidup
  (termasuk aksi keputusan ber-gerbang); register dengan pencarian/sort/filter; penanda eksepsi.
- `view_execution.tsx` (`AJEForm`) — validasi + field baru (tanggal efektif, sumber bukti, tautan
  DMS, lampiran).

**Server (`server/src`)**
- `signoff.ts` — aturan imutabilitas jurnal `Posted`; validasi `hash` + `ts` pada keputusan;
  impor `aje_contract` lintas paket (pola yang sama dengan `rbac`).
- `signoff.test.ts` — uji baris 202 **dibalik** (dari "diizinkan" menjadi "ditolak" untuk Posted).

## 5. Non-Scope

- Jenis persetujuan selain AJE (Faktur, Penerimaan Klien, Opini, Independensi, WIP) tetap memakai
  `chain()` legacy. Cacat kelasnya sama; memperbaiki enam jenis sekaligus membuat PR ini tak
  dapat ditinjau. Perbedaannya dibuat **terlihat** di kode, bukan disamarkan.
- Tanda tangan kriptografis atas keputusan (Ed25519 seperti `export/seal`). Jendela kesegaran
  waktu (§S3) adalah pengganti yang jujur, bukan setara.
- Alur kerja penggantian otomatis (auto-generate replacement dari reversal) — pembalikan
  menghasilkan satu jurnal balik; penggantinya disusun auditor seperti biasa.
- Migrasi keputusan `approvals_ov_v4` lama: keputusan tanpa `hash` diperlakukan sebagai
  **terikat pada versi jurnal saat itu** (grandfathered) dan ditandai `legacy` di UI —
  tidak dihapus, tidak pula diklaim terverifikasi.

## 6. Constraints

- ESM-only, `migration/src` kanonik; `tsc --noEmit` strict penuh wajib 0 error; ratchet ESLint
  `no-explicit-any` — satu `any` baru meng-un-suppress seluruh berkas.
- Skala tipografi 8 ukuran & token warna semantik (CLAUDE.md §5) mengikat untuk UI baru.
- Server mengimpor modul klien lintas paket hanya lewat pola `../../migration/src/<x>`; modul yang
  diimpor server **tidak boleh** menyentuh `window`/React.
- `guardSignoffWrite` harus tetap **murni & dapat diuji tanpa DB** → jam disuntikkan sebagai
  parameter opsional (`now = Date.now()`).
- Kontrak `state.set` tidak berubah (klien tetap mengirim dokumen utuh).
- CI repo berhenti mengantre sejak 2026-08-06 (catatan memory) → verifikasi lokal + tinjauan hidup
  wajib sebelum merge.

## 7. Existing Solutions (dipakai ulang, bukan dibangun ulang)

| Kebutuhan | Yang sudah ada |
|---|---|
| Gerbang otoritas per-langkah | `stepAuthority()` + `STEP_CAP` (view_platform.tsx) → dipindah ke `aje_contract` |
| Penegakan server per-slot | `guardSignoffWrite` + `SIGNOFF_KEYS` (sudah memuat `aje`, `approvals_ov_v4`) |
| Kapabilitas | `CAP.AJE_EDIT / AJE_POST / SIGNOFF_REVIEWER / EQR_REVIEW` (rbac SSOT klien+server) |
| Jejak audit server | `appendAudit` hash-chained pada setiap `state.set` |
| Lampiran nyata | `attachmentUpload({collection,refId})` + `FileDropField` (evidence.tsx) |
| Isolasi & CAS | `useServerState` engagement-scope + optimistic concurrency |
| Matriks routing | `AMS.PLATFORM.ROUTING_RULES` |

## 8. Proposed Approach

### 8.1 Hash isi jurnal sebagai pengikat persetujuan (inti seluruh paket)

```
ajeContentHash(a) = fnv1a( canonicalJson({
  id, desc, ref, kind, amount, mis, assertions[], effectiveDate,
  lines: [{code, debit, credit}] (ternormalisasi & terurut kode)
}))
```

Deterministik, sinkron, tanpa dependensi — dapat dihitung identik di klien dan server.

Dua aturan dibangun di atasnya, dan keduanya saling mengunci:

1. **Server:** jurnal `Posted` yang hash-nya berubah → `FORBIDDEN posted-immutable:<id>`.
   Tidak ada kapabilitas yang dapat memuaskannya — ini aturan, bukan otoritas. Penghapusan
   jurnal `Posted` sudah tertutup (`unpost`, menuntut `AJE_POST`).
2. **Keputusan mengikat versi:** setiap entri `decisions[]` membawa `hash` jurnal saat keputusan
   diambil. `buildAjeChain` hanya menghitung `approved` untuk keputusan yang `hash`-nya **sama
   dengan hash jurnal saat ini**; sisanya dirender "gugur — jurnal berubah setelah persetujuan",
   dan langkah kembali ke `current`.

Aturan 2 menyelesaikan masalah yang tak bisa diselesaikan aturan 1 sendirian: keputusan hidup di
dokumen StateDoc yang **berbeda** (`approvals_ov_v4`) dari ledger (`aje`), sehingga pembatalan
lintas-dokumen tak dapat dijamin atomik. Dengan mengikat keputusan pada hash, pembatalan menjadi
**turunan** — tak ada tulisan yang harus berhasil agar persetujuan gugur.

### 8.2 Pembalikan & penggantian

`reverseAje(id, reason)` → jurnal baru `Proposed`:
`{ id: <next>, reverses: id, desc: 'Pembalikan ' + id + ' — ' + reason, lines: <debit↔kredit>, ref, mis, kind }`.
Jurnal asal tidak disentuh. Register menampilkan pasangan `AJE-07 ⟲ AJE-01`, dan efek neto ke laba
otomatis nol setelah keduanya Posted. Tombol "Ubah" pada jurnal `Posted` diganti "Balik &
Ganti" — satu-satunya jalan koreksi.

### 8.3 Waktu keputusan

- Klien menulis `ts: new Date().toISOString()` (bukan konstanta).
- Server menolak keputusan baru yang `ts`-nya menyimpang > 10 menit dari jam server
  (`stale-timestamp`) → back-dating/forward-dating tak mungkin melampaui skew wajar.
- Baris `appendAudit` (jam server, hash-chained) tetap menjadi rekaman pendamping.
- SLA memakai jam nyata; `submitted` = `proposedOn` jurnal, `due` = `proposedOn` + SLA.
  **Konsekuensi jujur:** AJE-05 (diajukan 30 Mei, belum direviu) akan tampil "Lewat 69 hari".
  Itu benar, dan memang keadaan seed-nya.

### 8.4 Satu builder rantai, dua pemanggil

`buildAjeChain(journal, {engagement, decisions, routing})` menjadi satu-satunya penghasil rantai
AJE. `data_platform.buildApprovals` dan tab "Review & Persetujuan" memanggilnya. Panjang rantai
otomatis mengikuti nilai (3 atau 4 langkah); tab AJE menampilkan langkah EQR sejak awal, dengan
penerima tugas, SLA, dan **penghambat saat ini** ("menunggu Rudi Gunawan · EQR Reviewer · lewat
SLA 2 hari").

### 8.5 Restrukturisasi tab (sesuai usulan)

| Tab | Isi |
|---|---|
| Register Jurnal | daftar + pencarian/sort/filter + drill + penanda eksepsi |
| Dampak & Rekonsiliasi | jembatan PBT, efek per pos, likuiditas, rekonsiliasi SAD ↔ AJE ↔ WTB |
| Review & Persetujuan | antrean hidup (sumber sama dengan modul Approvals) + aksi ber-gerbang |
| Jejak Audit | keputusan nyata + `logEntries` + baris jejak server, kronologis |
| Ekspor & Finalisasi | XLSX tersegel + daftar kesiapan (tak ada Posted tanpa rantai lengkap; tak ada usulan menggantung; setiap usulan tak-diposting punya item SAD; efek Posted tie-out ke kolom `adj` WTB) |

### 8.6 Pengetatan formulir

Wajib: Ref. WP · Jenis · Tanggal efektif · Sumber bukti. Bersyarat: item SAD **atau** alasan
eksplisit (≥ 10 karakter) bila `kind = adjusting`. Opsional: asersi, tautan DMS, lampiran
(`attachmentUpload` collection `aje`, `refId` = id jurnal, setelah entri lahir).
Validasi hidup di `validateAjeDraft()` yang murni & teruji — bukan di dalam komponen.

## 9. Risks

| Risiko | Mitigasi |
|---|---|
| Imutabilitas memblokir kerja lapangan yang sah (salah ketik pada jurnal yang baru diposting) | Jalur "Balik & Ganti" satu klik; jalur `unpost` (Partner, `AJE_POST`) tetap ada dan tercatat |
| Keputusan lama tanpa `hash` menjadi "gugur" massal saat rilis | Keputusan tanpa `hash` di-grandfather (dianggap cocok) + label `legacy`; hanya keputusan baru yang terikat |
| Jam nyata membuat seluruh seed tampak lewat SLA | Disengaja & jujur (§8.3); dinyatakan di UI sebagai keadaan seed, bukan disembunyikan |
| Impor lintas paket `server → migration/src/aje_contract` menarik dependensi terlarang | Modul murni tanpa React/DOM/`window`; diuji dari kedua sisi |
| Perubahan `data_platform.buildApprovals` merusak uji PR-B yang ada | Uji PR-B dipertahankan sebagai kontrak; perubahan yang menggagalkannya adalah regresi kecuali ia memang perilaku yang diperbaiki (uji `signoff.test.ts:202`) |
| Aksi keputusan di dua tempat (AJE & Approvals) menimbulkan divergensi baru | Satu fungsi murni `applyAjeDecision`; kedua UI hanya memanggilnya |
| Dua penulis atas `approvals_ov_v4` dalam satu sesi (tab AJE & modul Approvals) tidak saling sinkron | Keduanya memakai `useAmsPersist` atas kunci yang sama; CAS + `ConflictToaster` sudah menangani; diverifikasi live |

## 10. Implementation Plan

Baseline sebelum mulai: `npm --prefix migration run test`, `npm --prefix server run test`,
`typecheck`, `lint` — angka dicatat agar setiap PR dapat dibandingkan.

| PR | Isi | Uji yang menjadi buktinya |
|---|---|---|
| **PR-1 (P0-a)** | `aje_contract.ts` (hash + reversal) · guard imutabilitas server · `updateAje`/`reverseAje` · UI "Balik & Ganti" · **balik** uji `signoff.test.ts:202` | S1, S7 |
| **PR-2 (P0-a lanjutan)** | Keputusan terikat hash: `decisions[].hash`, rantai menggugurkan keputusan basi, banner "persetujuan gugur" | S2 |
| **PR-3 (P0-b)** | Waktu nyata + jendela kesegaran server + `submitted`/`due` dari tanggal jurnal + SLA jam nyata | S3 |
| **PR-4 (P1-c/d)** | `buildAjeChain` sebagai SSOT; tab "Review & Persetujuan" hidup; rantai dinamis 3/4 langkah; penanda eksepsi `postedWithoutFullChain` | S4, S5 |
| **PR-5 (P1-e)** | `validateAjeDraft` + field baru + lampiran | S6 |
| **PR-6 (P2-f)** | Restrukturisasi 5 tab + pencarian/sort/filter register + tab Ekspor & Finalisasi | S8 |

Setiap PR: uji lebih dulu (uji harus GAGAL pada kode lama), lalu perbaikan, lalu verifikasi hidup
di browser dengan peran yang relevan (Senior untuk penyusunan, Manager & Partner untuk keputusan).

## 11. Open Questions

> Bila sign-off diberikan tanpa menyebut nomor, seluruh **rekomendasi** di bawah diadopsi.

**Q1 — Matriks routing vs rantai yang diimplementasikan.**
`ROUTING_RULES` menyatakan AJE < Rp 500 jt cukup disetujui **Manager**, tetapi `buildApprovals`
selalu menyertakan langkah Engagement Partner, dan hanya Partner yang memegang `AJE_POST`
(memposting ke WTB). Matriks yang dipublikasikan karenanya menjanjikan rute yang tak dapat
dijalankan.
(a) **[Rekomendasi]** Rantai benar → koreksi teks matriks menjadi "Manager → Partner".
(b) Matriks benar → beri Manager `AJE_POST` untuk nilai < Rp 500 jt (rute berbasis nilai di RBAC).
*(b) memperluas otoritas posting; saya tidak menyarankannya tanpa kebijakan firma tertulis.*

**Q2 — Stempel waktu.**
(a) **[Rekomendasi]** Klien menulis ISO nyata + server menolak di luar ±10 menit. Tanpa perubahan
kontrak; batasnya jujur (bukan tanda tangan waktu).
(b) Endpoint mutasi baru yang menstempel di server. Lebih kuat, tetapi memecah kontrak `state.set`
generik dan menyentuh seluruh keluarga StateDoc.

**Q3 — Jam SLA.**
(a) **[Rekomendasi]** Jam nyata; seed lama tampil lewat SLA (benar apa adanya).
(b) Pertahankan jam demo beku untuk SLA, jam nyata hanya untuk keputusan. Lebih tenang dilihat,
tetapi mempertahankan satu kebohongan kecil di layar.

**Q4 — Aksi keputusan di dalam tab AJE.**
(a) **[Rekomendasi]** Tab "Review & Persetujuan" dapat mengambil keputusan, lewat fungsi murni
yang sama dengan modul Approvals.
(b) Hanya tampilan; keputusan tetap di modul Approvals.

**Q5 — Ref. WP wajib untuk jenis apa.**
(a) **[Rekomendasi]** Wajib untuk **semua** jurnal — reklasifikasi pun harus berasal dari sebuah
prosedur.
(b) Wajib hanya untuk `adjusting` (sesuai bunyi temuan).

**Q6 — Semantik koreksi jurnal Posted.**
(a) **[Rekomendasi]** Pembalikan: jurnal asal tetap `Posted`, jurnal balik baru diajukan. Praktik
akuntansi baku, jejak lengkap.
(b) `unpost` lalu edit lalu ajukan ulang. Lebih sedikit baris, tetapi menghapus fakta bahwa angka
lama pernah masuk ke LK.

---

## Lampiran A — Probe

**A.1 — Imutabilitas (server, `guardSignoffWrite`)**

```
prev = [{id:'AJE-01', status:'Posted', amount:2_340_000_000,
         lines:[{5-3100 dr 2.340jt},{2-1300 cr 2.340jt}]}]
next = [{id:'AJE-01', status:'Posted', amount:9_999_000_000, desc:'diubah setelah disetujui partner',
         lines:[{1-1100 dr 9.999jt},{4-1000 cr 9.999jt}]}]

guardSignoffWrite('Junior Auditor','aje',prev,next) → []      ← tak menuntut apa pun
guardSignoffWrite('Junior Auditor','aje',prev,[])   → throw requires:aje.post   (penghapusan sudah tertutup)
```

**A.2 — Rantai AJE-01 di antrean vs di tab AJE**

```
buildApprovals → AJE-01: 4 langkah
  Penyusun:approved:2026-03-09 16:40
  Audit Manager:approved:2026-05-06 10:20
  Engagement Partner:approved:2026-05-08 14:05
  EQR Reviewer:current:—            ← belum ditelaah
  status: 'pending', postedWithoutFullChain: true

ApprovalCard (view_aje) → AJE-01: 3 langkah, ketiganya `done` (langkah 3 done = status Posted)
```

**A.3 — `submitted` seragam**

```
AJE-01..05 → submitted: '2026-03-09 16:40' (kelimanya)
AJE_META.proposedOn → 2026-05-04 / 05-06 / 05-28 / 05-09 / 05-30
```
