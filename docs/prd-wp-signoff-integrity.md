# PRD — Kertas Kerja: Integritas Tanda Tangan, Rantai Ditegakkan Server, & Pengikatan Isi

| Field | Isi |
|---|---|
| Tanggal | 2026-08-07 |
| Pemilik | Ari Widodo |
| Status | **Seluruh open question TERJAWAB (2026-08-07) — menunggu "Proceed."** |
| Modul | `workpapers` (`migration/src/view_wp.tsx`, `wp_canon.ts`, `server/src/signoff.ts`) |
| Engagement ID terkait | ENG-2025-014 (data demo) |
| PRD terkait | `prd-aje-immutability-live-approvals.md` (pola yang dipakai ulang) · `prd-overlay-contract-and-addressable-objects.md` (Fase C) |

> Cakupan PRD ini adalah **langkah 1–3** dari evaluasi modul Working Papers 2026-08-07.
> Langkah 4–6 (readiness gate, integrasi DMS bukti, restrukturisasi UI) masuk PRD terpisah —
> lihat §5 Non-Scope. Pemisahan ini disengaja: langkah 1–3 adalah cacat integritas P0 dan
> tidak boleh disandera oleh pekerjaan UX.

---

## 1. Problem

Sistem menegakkan **otoritas** atas tanda tangan kertas kerja, tetapi tidak menegakkan
**integritas**-nya. Tiga pernyataan berikut semuanya benar hari ini.

### P0-a — Tanda tangan preparer dapat dibuat atas nama orang lain, dengan satu klik

[`view_wp.tsx:1173`](../migration/src/view_wp.tsx:1173) — `quickSign` di footer:

```js
chain: { ...(st.chain || {}),
         preparer: (st.chain && st.chain.preparer) || { by: it[2], at: wpToday() },
         reviewer: { by: me, at: wpToday() } }
```

`it[2]` adalah **nama preparer yang DITUGASKAN**, bukan pengguna sesi. Seorang Reviewer
menekan "Sign-off Review" dan sistem menerbitkan tanda tangan preparer atas nama auditor
yang tidak pernah menyentuh tombol itu. Tanda tangan itu lalu mengalir ke `signedCount`,
`fullySigned`, dasbor SA 230, dan jejak audit ([`view_wp.tsx:1108`](../migration/src/view_wp.tsx:1108)).

Ini kelas cacat yang **sudah pernah ditutup dua kali** di repo ini — untuk preparer pada
commit `2551ed5` ("assigned ≠ signed") dan untuk reviewer pada `wpSeedReviewSignature`
([`wp_canon.ts:139-166`](../migration/src/wp_canon.ts:139)). Footer luput dari keduanya.

Tiga akibat turunan yang tak kalah berat:

1. **Menembus `wpChainSelfReview`** ([`wp_canon.ts:253`](../migration/src/wp_canon.ts:253), ISQM 2 / SA 220.36).
   Bukan teoretis: WP `100`, `200`, `810`, `900` ber-preparer **Anindya P.**, dan Anindya
   Pramesti adalah **Audit Manager** ([`data_part1.ts:12`](../migration/src/data_part1.ts:12)) —
   pemegang `SIGNOFF_REVIEWER`. Satu klik footer menghasilkan rantai yang preparer dan
   reviewer-nya orang yang sama. Tab Sign-off memblokir persis skenario ini; footer tidak.
2. **Menembus urutan rantai** yang ditegakkan `signBlock` ([`view_wp.tsx:1085`](../migration/src/view_wp.tsx:1085)).
3. **Fail-open tanpa sesi.** `me` jatuh ke `it[2]` dan `canReview` bernilai `true` bila
   `auth` tak ada ([`view_wp.tsx:1167-1168`](../migration/src/view_wp.tsx:1167); pola sama di
   [`:1058-1059`](../migration/src/view_wp.tsx:1058)). Di konteks drawer/luar provider,
   tanda tangan **reviewer** pun tertulis atas nama preparer.

### P0-b — Server tak pernah tahu siapa yang menandatangani

[`router.ts:744`](../server/src/router.ts:744):

```ts
signoffChanges = guardSignoffWrite(ctx.user.role, key, prevValue, input.value);
```

Server menerima **peran**, tidak pernah identitas. Konsekuensinya jauh lebih luas daripada
slot preparer yang sengaja dikecualikan di [`signoff.ts:39-43`](../server/src/signoff.ts:39):

- Manager berwenang dapat menulis `reviewer: { by: 'Hartono W.', at: '2026-01-01' }` —
  kapabilitas terpenuhi, **identitas tak diperiksa, back-dating tak diperiksa**.
- `wpChainSelfReview` **tak punya padanan server sama sekali**, dan tak bisa punya selama
  server hanya menerima `role`.
- Urutan rantai hanya hidup di UI.

Bandingkan dengan rantai AJE, yang **sudah** menolak stempel waktu palsu lewat
`decisionTimestampError` ([`signoff.ts:182`](../server/src/signoff.ts:182)). Kertas kerja
belum kebagian.

Uji [`signoff.test.ts:35-43`](../server/src/__tests__/signoff.test.ts:35) memaku perilaku ini
sebagai benar ("PREPARER … Junior boleh, tanpa requirement"). Pola berulang: uji ditulis dari
implementasi, bukan dari standar — identik dengan yang ditemukan di arc AJE.

### P0-c — Tanda tangan tidak mengikat isi apa pun

Setelah WP berstatus `Reviewed`, siapa pun pemegang `WP_EDIT` (termasuk Junior Auditor) masih
dapat menghapus catatan bukti ([`view_wp.tsx:736`](../migration/src/view_wp.tsx:736)), mengubah
hasil item uji, dan mengubah kesimpulan asersi. Tak ada aturan imutabilitas untuk `wpState`;
satu-satunya kunci adalah `assertNotAssemblyLocked` di tingkat **perikatan**, jauh setelah reviu.

Artinya tanda tangan reviewer mengikat **tidak ada isi tertentu** — persis cacat yang ditutup
PR-1/PR-2 arc AJE dengan hash isi jurnal ([`aje_contract.ts`](../migration/src/aje_contract.ts)).
Mekanismenya sudah ditulis, diuji, dan merged. Kertas kerja tinggal memakainya.

### P1-d — `reopen()` menghapus tanda tangan yang bukan haknya

[`view_wp.tsx:1174`](../migration/src/view_wp.tsx:1174) menghapus `reviewer`, `partner`, **dan
`eqr`** dalam satu klik. Karena `PARTNER_BASE` memegang `OPINION_APPROVE` *dan* `EQR_REVIEW`
sekaligus, seorang Partner dapat menghapus tanda tangan EQR dengan restu server. Untuk Manager,
server menolak **seluruh** tulisan `wpState` — tombol yang gagal wholesale, bukan gerbang.

---

## 2. Objective

Menjadikan tanda tangan kertas kerja sebagai **pernyataan yang dapat dipertanggungjawabkan**:
menyebut orang yang benar, pada waktu yang benar, atas isi yang benar — dan tak dapat dibuat
sebaliknya oleh permukaan UI mana pun maupun panggilan tRPC langsung.

Mengapa ini objective yang benar: SA 230 ¶9 menuntut dokumentasi mencatat **siapa** yang
menyiapkan dan mereviu **dan kapan**; SA 220.36 / ISQM 2 menuntut penelaah yang independen dari
tim perikatan. Tanda tangan yang dapat dipalsukan tidak memenuhi keduanya — dan yang lebih buruk,
ia membuat berkas *tampak* memenuhi.

---

## 3. Success Criteria (semuanya harus DAPAT GAGAL)

Setiap kriteria disertai keadaan **hari ini**, sehingga keberhasilan tidak dapat diklaim tanpa
perubahan perilaku yang nyata.

| # | Probe | Hari ini | Setelah |
|---|---|---|---|
| K1 | Tulisan `wpState` dengan `chain.reviewer.byUserId` ≠ id sesi | diterima | `FORBIDDEN signature-identity-mismatch` |
| K2 | Manager menulis `chain.preparer = {by:'Dimas R.'}` | diterima; `guardSignoffWrite` mengembalikan `[]` | ditolak |
| K3 | Anindya (Manager, preparer WP 100) menandatangani slot reviewer WP 100 — dari **footer** | berhasil | ditolak di server **dan** tak ada tombolnya |
| K4 | Tanda tangan baru dengan `at` = `2026-01-01` | diterima | `FORBIDDEN signature-stale-timestamp` |
| K5 | Reviewer menandatangani WP B → preparer mengubah `result` satu item uji | rantai tetap hijau | tanda tangan reviewer **gugur** di tab Sign-off, SA 230, dan `deriveWpStatus.fullySigned`, **tanpa tulisan apa pun** |
| K6 | Manager menandatangani slot partner | ditolak (sudah benar) | tetap ditolak — nol regresi |
| K7 | Partner menekan "Buka Kembali" pada WP ber-tanda-tangan EQR | tanda tangan EQR terhapus | hanya slot yang berwenang dihapus; EQR menuntut `EQR_REVIEW` |
| K8 | `grep -rc quickSign migration/src` | 1 | 0 |
| K9 | Tanda tangan warisan (`{by, at}` tanpa `byUserId`) | — | ditandai `legacy`, **tidak** digugurkan massal |
| K10 | `npm test` · `npm run typecheck` · `npm run lint` | hijau | hijau; uji `signoff.test.ts:35` **dibalik** oracle-nya |
| K11 | Manager menulis `opinionDoc.v1.signoff.manager` dengan `byUserId` orang lain | diterima | ditolak (Q4) |
| K12 | Partner menulis `mat.memo.signoff.partner` ber-`at` mundur setahun | diterima | ditolak (Q4) |

---

## 4. Scope

1. **Modul murni baru** `migration/src/wp_chain.ts` — satu-satunya rumah aturan rantai WP,
   diimpor **klien dan server** (pola `aje_contract`/`rbac`).
2. **Ekstraksi** `amsShortName` dari `contexts.tsx` → `migration/src/identity.ts` (murni), dan
   primitif hash FNV-1a dari `aje_contract.ts` → `migration/src/content_hash.ts` — supaya ada
   **satu** implementasi masing-masing, bukan dua.
3. **`guardSignoffWrite` menerima identitas** (`{id, name, role}`, bukan `role`) dan menegakkan
   R1–R7 (§8.2) untuk `wpState`.
4. **Slot `preparer` masuk daftar terjaga**, dengan kapabilitas `WP_EDIT` — otoritasnya memang
   longgar, tetapi **identitas, waktu, dan urutannya tidak**.
5. **Pengikatan hash isi WP** ke setiap tanda tangan; penggugur **turunan** (§8.3).
6. **Hapus `quickSign`**; tombol footer menjadi navigasi ke tab Sign-off.
7. **Fail-closed** pada `can()` di `WPFooter` & `SignoffTab`.
8. **`reopen()` hanya menghapus slot yang aktor berwenang menghapusnya**, dan mengatakannya.
9. **Balik oracle uji** `signoff.test.ts:35-43`; tambah uji untuk R1–R7 dan K1–K9.
10. **Slot tanda tangan `opinionDoc.v1` dan `mat.memo.signoff` ikut ditutup** (keputusan Q4).
    Aturan **R1 (identitas) dan R2 (waktu)** diterapkan ke `OPINION_SLOT_CAP` dan
    `MAT_MEMO_SLOT_CAP` ([`signoff.ts:44-58`](../server/src/signoff.ts:44)) — dua peta slot yang
    sudah ada di fungsi yang sama. R3/R4 (urutan & satu-orang-satu-langkah) **tidak** ikut:
    rantai opini punya bentuknya sendiri dan menuntut analisis terpisah.
    Bentuk tanda tangan opini (`{date}`) dan memo (`{name, role, at}`) berbeda dari `wpState`
    (`{by, at}`), jadi `sig()`/`sigNamed()` yang ada dipertahankan dan diperluas dengan
    `byUserId` masing-masing.

## 5. Non-Scope

- **Langkah 4** — `wpReadiness()` (gate pra-reviu, angka kelengkapan berbasis kriteria).
  PRD terpisah: mengangkat `useDocCanon.attr` ([`view_sa230.tsx:65`](../migration/src/view_sa230.tsx:65))
  ke lapisan kanon.
- **Langkah 5** — menyambungkan `EvidenceRegister` ke `server/src/attachments/store.ts` dan
  membuang `WP_ATTACH` hardcode ([`view_wp.tsx:44-51`](../migration/src/view_wp.tsx:44)).
- **Langkah 6** — panel readiness tetap + pemisahan tab, **di atas rute beralamat Fase C**
  (`#/workpapers/<ref>?tab=…`), bukan di `Overlay variant="page"` yang sudah DEPRECATED.
- **Tanda tangan kriptografis (Ed25519 per-tanda-tangan).** Lihat §8.5 — jalur naik
  didokumentasikan, tidak dikerjakan sekarang.
- **Perubahan enum status WP.** Usulan enam status ditolak di evaluasi (dua di antaranya adalah
  fakta turunan yang sudah dihitung); `Submitted` akan dipertimbangkan di PRD langkah 4.

## 6. Constraints

- **Kontrak `state.set` tidak berubah.** Klien tetap mengirim dokumen utuh; guard mem-DIFF
  tersimpan vs masuk. Ini syarat kompatibilitas CAS versioned (W6).
- **Modul lintas-paket harus murni** — tanpa React, `window`, DOM, `node:crypto`, atau
  `crypto.subtle`. Hash wajib deterministik-sinkron di kedua sisi.
- **`npm run typecheck` = 0 error** dengan `strict` penuh; ratchet ESLint `no-explicit-any`
  tidak boleh naik.
- **Data warisan harus lolos.** Rantai tanpa `byUserId`/`contentHash` sudah ada di seed dan di
  penyimpanan pilot; menggugurkannya massal akan menghapus jejak yang sah.
- **`amsShortName` bersifat LOSSY** — 'Anindya Pramesti' dan 'Anindya Putri' sama-sama menjadi
  'Anindya P.'. Identitas **tidak boleh** diikat pada bentuk singkat ini.

## 7. Existing Solutions (dipakai ulang, bukan dibangun ulang)

| Aset | Lokasi | Dipakai untuk |
|---|---|---|
| `ajeContentHash` + FNV-1a ganda | [`aje_contract.ts:104-165`](../migration/src/aje_contract.ts:104) | primitif hash isi — **diekstraksi**, bukan disalin |
| Penggugur turunan berbasis hash | [`aje_approval.ts:155-213`](../migration/src/aje_approval.ts:155) | pola `voided`/`legacy` untuk rantai WP |
| `decisionTimestampError` | [`aje_approval.ts:293`](../migration/src/aje_approval.ts:293) | validasi waktu tanda tangan — dipakai apa adanya |
| `wpChainSelfReview` | [`wp_canon.ts:253`](../migration/src/wp_canon.ts:253) | aturan satu-orang-satu-langkah — **dipindah**, kini juga ditegakkan server |
| `guardSignoffWrite` | [`signoff.ts:103`](../server/src/signoff.ts:103) | kerangka guard per-slot yang sudah ada |
| `AuditLog` hash-chained | `schema.prisma:155` | rekaman pendamping (jam server, `actorUserId`) |
| `User.id` / `User.name` | `schema.prisma:54-61` | identitas otoritatif — sudah ada, belum dipakai di jalur ini |

**Mengapa tidak cukup apa adanya:** semuanya sudah terbukti, tetapi tak satu pun tersambung ke
rantai kertas kerja. Paket ini nyaris seluruhnya **penyambungan**, bukan penemuan — itulah alasan
ia layak dikerjakan sekarang, bukan nanti.

## 8. Proposed Approach

### 8.1 Bentuk tanda tangan

```ts
// SEBELUM
{ by: 'Anindya P.', at: '07 Agu 2026' }

// SESUDAH
{ by: 'Anindya P.',            // tampilan (display), tetap
  byUserId: 'usr_ap01',        // identitas otoritatif — DIVALIDASI server
  at: '2026-08-07T02:14:33.118Z', // ISO 8601, DIVALIDASI terhadap jam server
  contentHash: 'a1b2c3d4e5f60718' } // isi WP saat ditandatangani
```

`by` tetap ada karena UI dan ekspor PDF membacanya; ia **bukan** kunci identitas. Server
memvalidasi **keduanya** — `byUserId === ctx.user.id` **dan** `by === shortName(ctx.user.name)` —
sehingga klien tak dapat menampilkan nama palsu sambil membawa id-nya sendiri.

### 8.2 Aturan yang ditegakkan server (`wpChainViolations`)

Diterapkan hanya pada tanda tangan yang **baru atau berubah** (diff prev↔next). Tanda tangan
yang tidak tersentuh selalu lolos — itulah yang membuat data warisan aman.

| Aturan | Isi | Pesan |
|---|---|---|
| **R1** identitas | `byUserId === actor.id` ∧ `by === shortName(actor.name)` | `signature-identity-mismatch` |
| **R2** waktu | `decisionTimestampError(at, now)` = null | `signature-{missing,future,stale}-timestamp` |
| **R3** urutan | slot ke-N tak dapat ditandatangani bila slot N−1 belum | `signature-out-of-order:<slot>` |
| **R4** satu-orang-satu-langkah | aktor belum memegang slot lain pada WP yang sama | `signature-self-review:<priorSlot>` |
| **R5** kapabilitas | `preparer`→`WP_EDIT`; reviewer/partner/eqr → seperti sekarang | `requires:<cap>` |
| **R6** pencabutan preparer | hanya oleh penandatangannya sendiri, dan hanya selama tak ada tanda tangan hilir | `signature-revoke-forbidden` |
| **R7** pencabutan hilir | tiap slot yang dihapus menuntut kapabilitasnya sendiri (sudah ada) — kini **juga** untuk `preparer` | `requires:<cap>` |

R4 memakai `byUserId` bila ada, dan jatuh ke `by` ternormalisasi untuk tanda tangan warisan.

### 8.3 Pengikatan isi — gugur secara TURUNAN, bukan penolakan keras

`wpContentHash(st)` mengikat: `exec` (item uji: id, desc, ev, tick, result, note, lead),
`evidence` (`EvRec` penuh), `asrConcl`, `procs`.
**Di luar hash:** `notes`, `noteStatus` (percakapan reviu harus tetap hidup setelah tanda tangan),
`chain`, `status`, `reviewer`, `signedAt`.

Sebuah tanda tangan **sah** hanya bila `contentHash`-nya sama dengan `wpContentHash(st)` saat ini.
Bila isi berubah setelah ditandatangani, tanda tangan itu **gugur** — ditampilkan sebagai
`voided` (siapa & kapan tetap terlihat), tidak dihapus, dan **gugurnya tidak memerlukan tulisan
apa pun**.

**Ini sengaja BERBEDA dari AJE, dan bedanya penting.** Jurnal `Posted` ditolak keras karena
angkanya sudah mengalir ke WTB, SAD, materialitas, dan opini — "pernah ada" tak boleh dapat
dihapus. Kertas kerja tidak begitu: SA 230 ¶A23 justru **mengizinkan** perubahan sebelum
perakitan final, asalkan terdokumentasi. Penolakan keras akan melarang pekerjaan audit yang sah.
Yang benar adalah tanda tangannya yang gugur, bukan suntingannya yang ditolak. Setelah perakitan,
`assertNotAssemblyLocked` yang sudah ada tetap menjadi penolakan keras.

Alasan strukturalnya sama dengan PR-2 AJE: bila penggugur harus ditulis, tulisan itu bisa gagal,
offline, atau kalah CAS — dan satu-satunya pembatalan yang selalu benar adalah yang diturunkan.

### 8.4 Satu penghasil rantai, semua pembaca

`wpChainLinks(st, meta, ctx)` di `wp_chain.ts` menjadi satu-satunya yang menerjemahkan
`chain` tersimpan → status yang dirender (`signed` / `voided` / `legacy` / `pending`).
Pemanggil: `SignoffTab`, `WPFooter`, `deriveWpStatus` ([`wp_canon.ts:193-206`](../migration/src/wp_canon.ts:193)),
dan `useDocCanon` ([`view_sa230.tsx:61-74`](../migration/src/view_sa230.tsx:61)).

Tanpa ini, tanda tangan yang gugur akan tampil gugur di satu layar dan hijau di layar lain —
persis cacat "satu jurnal, dua jawaban" yang ditemukan di arc AJE.

### 8.5 Batas jujur paket ini

Yang **tidak** dijamin: ini bukan tanda tangan kriptografis. Administrator basis data dengan
akses tulis langsung tetap dapat menyusun baris `wpState` apa pun. Yang dipersempit adalah
pemalsuan **lewat aplikasi** — dan itu adalah permukaan yang nyata dipakai auditor.
`AuditLog` hash-chained (jam server, `actorUserId`, `prevHash`/`hash`) tetap menjadi rekaman
pendamping yang independen.

Jalur naik bila kelak dibutuhkan bukti ke pihak ketiga (mis. PPPK): `server/src/crypto/signing.ts`
sudah menyediakan Ed25519 untuk segel ekspor; tanda tangan per-slot dapat memakai kunci yang sama
tanpa mengubah bentuk `wpState` — cukup menambah field `sig`. **Keputusan hari ini: tidak
sekarang** — biaya manajemen kunci per-pengguna tidak sepadan sebelum ada permintaan regulator
yang konkret.

## 9. Risks

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Perubahan tanda tangan `guardSignoffWrite(role→user)` menyentuh **semua** cabang key (opini, prospek, AJE, memo materialitas) | regresi lintas-modul | perubahan mekanis; seluruh cabang lain tetap memakai `user.role`; uji yang ada menjadi jaring |
| Format `at` berpindah ke ISO, sementara `wpSeedReviewSignature` sudah ISO dan `chain` memakai `'07 Agu 2026'` — **dua format sudah hidup berdampingan hari ini** | jejak audit menampilkan ISO mentah | satu formatter di lapisan render; uji snapshot atas tampilan jejak |
| Cakupan `wpContentHash` melenceng saat bentuk `exec`/`evidence` bertambah field | pembekuan melemah **diam-diam** | uji snapshot hash atas fixture (pola `canon_regression.test.ts`), wajib di-update sadar |
| **Pemisah `\x01` di dalam `fingerprint()`** — ia karakter kontrol LITERAL di `aje_contract.ts` sebelum PR-1, tak terlihat di editor maupun diff | menyalinnya dengan mata menghasilkan `s + '' + s.length`: rumus berbeda → **seluruh persetujuan AJE tercatat gugur senyap** | ditemukan & ditutup di PR-1: kini ditulis sebagai escape `'\x01'` dengan konstanta bernama + komentar; ekstraksi diverifikasi byte-identik |
| Tanda tangan warisan digugurkan massal | jejak sah hilang; kepercayaan pilot rusak | R9/K9: absennya `byUserId`/`contentHash` → `legacy`, bukan `voided` |
| `amsShortName` lossy → dua orang bernama depan sama | identitas salah bila diikat pada `by` | identitas diikat pada `byUserId`; `by` hanya tampilan |
| Auditor bingung tanda tangannya "hilang" setelah menyunting | penolakan pemakaian | banner eksplisit di tab Sign-off: siapa yang gugur, mengapa, dan apa yang berubah |
| `opinionDoc.v1` & `mat.memo.signoff` ikut ditutup (Q4) → PR-2 menyentuh tiga peta slot, bukan satu | permukaan regresi lebih luas (opini & memo materialitas) | R1/R2 saja (bukan R3/R4); uji K11/K12 eksplisit; uji opini & memo yang ada menjadi jaring |
| Tanda tangan opini/memo warisan tanpa `byUserId` | opini yang sudah final tampak cacat | aturan `legacy` yang sama (K9) berlaku lintas ketiga peta slot |

## 10. Implementation Plan

Empat PR bertumpuk. **Catatan operasional:** squash-merge tidak me-retarget PR bertumpuk —
retarget manual setiap kali PR di bawahnya merged (pelajaran #129/#130).

> **KOREKSI URUTAN (2026-08-07, ditemukan saat PR-1).** Rencana awal menaruh
> penegakan server sebelum klien menulis bentuk baru. Itu salah: R1 menuntut setiap tanda tangan
> BARU membawa `byUserId`, sementara klien belum menulisnya — di antara kedua PR itu **tak seorang
> pun dapat menandatangani apa pun**. Klien karena itu harus lebih dulu, dan itu aman: menulis
> `byUserId`/`contentHash` yang belum diperiksa siapa-siapa tidak mengubah apa pun.

| PR | Isi | Perilaku berubah? |
|---|---|---|
| **PR-1** ✅ | `content_hash.ts` (ekstraksi FNV-1a) · `identity.ts` (ekstraksi `amsShortName`) · `wp_chain.ts` (pindahkan `wpChainSelfReview`, tambah `WP_SLOT_ORDER`, `wpContentHash`, `wpChainViolations`, `wpChainLinks`) + 37 uji murni | **Tidak** — refactor + modul baru yang belum dipanggil |
| **PR-2** | **Klien** menulis `byUserId` + `at` ISO + `contentHash`; **hapus `quickSign`** (footer → tab Sign-off); fail-closed `can()`; `reopen()` selektif; uji K3/K7/K8 | **Ya** |
| **PR-3** | **Server** `guardSignoffWrite(user, …)`; `preparer` masuk slot terjaga; tegakkan R1–R7 untuk `wpState` **+ R1/R2 untuk `opinionDoc.v1` & `mat.memo.signoff`** (Q4); **balik** oracle `signoff.test.ts:35-43`; uji K1/K2/K4/K6/K11/K12 | **Ya** — server mulai menolak |
| **PR-4** | `wpChainLinks` menggantikan pembacaan `chain` langsung di 4 pemanggil; tampilan `voided`/`legacy` + banner; uji K5/K9 | **Ya** — penggugur turunan aktif |

**Gerbang tiap PR** — dua paket, keduanya wajib hijau sebelum review:
`migration/`: `npm test` · `npm run typecheck` · `npm run lint` (pakai `--prune-suppressions` bila
ratchet ESLint berubah). `server/`: `npm test` · `npm run typecheck`.
*(`typecheck:test` belum ada di branch ini — ia datang bersama PR #155 yang masih terbuka.)*

**Verifikasi hidup wajib** (bukan hanya uji) setelah PR-3 dan PR-4, dengan peran **Audit Manager**:
jalankan K3 dan K5 di aplikasi. Pelajaran berulang di repo ini — 924 uji melewatkan cacat tanda
tangan Reviewer; tinjauan hidup menangkapnya.

## 11. Open Questions — **SELURUHNYA TERJAWAB (2026-08-07)**

**Q1 — Format `at`.** Satu field ISO, atau dua field (`at` tampilan + `ts` ISO)?
→ **DIPUTUSKAN: satu field ISO**, diformat saat render. Dua field berarti dua sumber kebenaran
waktu, dan yang tampil akan menyimpang dari yang divalidasi.

**Q2 — Menyunting WP yang sudah direviu.** Boleh dengan konsekuensi tanda tangan gugur, atau
harus meminta reviewer membuka rantai lebih dulu?
→ **DIPUTUSKAN Ari: boleh — gugur turunan + banner.** Alasan di §8.3: SA 230 ¶A23 mengizinkan
perubahan sebelum perakitan, dan pembatalan yang harus DITULIS bisa gagal/offline/kalah CAS.
Alternatifnya menciptakan kebuntuan di mana preparer tak dapat merespons catatan reviu tanpa
bantuan reviewer.

**Q3 — Cakupan hash: apakah `notes`/`noteStatus` masuk?**
→ **DIPUTUSKAN: TIDAK.** Catatan reviu adalah percakapan yang justru harus hidup setelah tanda
tangan; memasukkannya berarti setiap balasan catatan menggugurkan tanda tangan.

**Q4 — Ikutkan `opinionDoc.v1` dan `mat.memo.signoff` sekarang?**
→ **DIPUTUSKAN Ari: ikutkan di PR-2** (R1/R2 saja — lihat §4 butir 10). Menundanya berarti
menutup pemalsuan tanda tangan kertas kerja sambil membiarkan tanda tangan **opini auditor** dan
**memo materialitas** tetap dapat dipalsukan — dua dokumen yang justru keluar dari firma, dan
yang memo-nya ikut ke PDF tersegel Ed25519 sebagai persetujuan Rekan Perikatan.

**Tidak ada open question tersisa. PRD siap di-sign-off.**

---

**Sign-off:** ditandai dengan balasan **"Proceed."**

---

## Lampiran A — Probe

Fakta di bawah diverifikasi langsung terhadap kode pada 2026-08-07, bukan disimpulkan.

**A.1 — `quickSign` menulis preparer dari penugasan.**
[`view_wp.tsx:1173`](../migration/src/view_wp.tsx:1173) — `preparer: … || { by: it[2], at: wpToday() }`,
di mana `it[2]` berasal dari `WP_INDEX` ([`wp_canon.ts:14-20`](../migration/src/wp_canon.ts:14)),
kolom ke-3 = preparer yang ditugaskan.

**A.2 — Self-review yang dapat dicapai.**
`WP_INDEX` baris `'100'`, `'200'`, `'810'`, `'900'` → preparer `'Anindya P.'`.
`data_part1.ts:12` → `name: 'Anindya Pramesti', role: 'Audit Manager'`.
`WPFooter.canReview` menuntut `SIGNOFF_REVIEWER`, yang dimiliki Audit Manager.
Maka satu klik menghasilkan `chain.preparer.by === chain.reviewer.by === 'Anindya P.'` —
keadaan yang [`wp_canon.ts:253`](../migration/src/wp_canon.ts:253) dibangun untuk mencegah.

**A.3 — Server tak menerima identitas.**
[`router.ts:744`](../server/src/router.ts:744) meneruskan `ctx.user.role` saja.
`guardSignoffWrite` ([`signoff.ts:103`](../server/src/signoff.ts:103)) bertanda tangan
`(role: string, key, prev, next, now)` — tidak ada parameter identitas.

**A.4 — Uji memaku perilaku yang salah.**
[`signoff.test.ts:36-37`](../server/src/__tests__/signoff.test.ts:36):
`guardSignoffWrite(JUNIOR, 'wpState', {B:{chain:{}}}, {B:{chain:{preparer:SIG}}})` → `expect(…).toEqual([])`,
dengan `SIG = { by: 'Anindya P.', at: '2026-03-14' }` — seorang Junior menulis tanda tangan atas
nama Audit Manager, dan uji menyatakan itu benar.

**A.5 — Tak ada pembekuan isi.**
`SIGNOFF_KEYS` memuat `wpState` ([`signoff.ts:72`](../server/src/signoff.ts:72)), tetapi cabang
`key === 'wpState'` ([`:110-117`](../server/src/signoff.ts:110)) hanya mem-DIFF `chain[slot]`.
Field `exec`, `evidence`, `asrConcl`, `procs` tidak pernah diperiksa — bandingkan cabang `'aje'`
([`:147`](../server/src/signoff.ts:147)) yang memanggil `ajeImmutabilityViolations`.

**A.6 — `atts` adalah konstanta.**
[`view_wp.tsx:51`](../migration/src/view_wp.tsx:51) — `attachFor` membaca `WP_ATTACH` hardcode;
panel "Lampiran & Bukti" tidak menyentuh tabel `Attachment` yang ber-`sha256`. *(Konteks untuk
PRD langkah 5, di luar cakupan ini.)*
