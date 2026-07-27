# PRD — AJE PR-B: Gerbang Otorisasi Posting Jurnal (ISQM 1 · SA 450)

**Tanggal:** 2026-07-26 · **Status:** MENUNGGU SIGN-OFF ("Proceed.")
**Basis:** `master` + PR-A ([#139](https://github.com/ari1945/Asseris/pull/139), `85eabee`)
**Pendahulu:** `PRD - AJE PR-A SSOT Figur Entitas.md` · `PRD - Penegakan Sign-off Berbasis Peran (Dua-Lapis).md`
memori `asseris-aje-module-eval`, `asseris-opinion-signoff-sod-defect`, `asseris-authoritative-persist-key-recipe`

---

## 1 · Problem

**Temuan yang mengubah bentuk PRD ini:** alur persetujuan AJE **sudah ada, lengkap, dan
benar**. `buildApprovals()` (`data_platform.ts:74`) membangun rantai sesuai
`ROUTING_RULES` — Penyusun → Audit Manager → Engagement Partner, ditambah EQR bila
nilai ≥ Rp 2 M. `decide()` (`view_platform.tsx:92`) mencatat keputusan, memanggil
`logActivity`, dan pada persetujuan final menulis balik ke SSOT lewat `toggleAjeStatus`.

Jadi PR-B **bukan** membangun mesin persetujuan. PR-B menutup jalan pintas yang
membuat mesin itu bisa dilewati — dan menghentikan sistem memalsukan persetujuan.

### P-0 · Sistem MEMALSUKAN persetujuan Manager, Partner & EQR — paling berat

`addAje` (`contexts.tsx:869`) melahirkan entri dengan `status: 'Posted'`:

```js
return [...list, { id, status: 'Posted', ...entry }];
```

`buildApprovals` lalu membaca status itu (`data_platform.ts:88`):

```js
const doneTo = posted ? steps.length : 1;   // ← 'Posted' ⇒ SELURUH langkah dianggap selesai
```

dan `chain()` (`data_platform.ts:49`) menandai setiap langkah yang terlewati sebagai:

```js
status: 'approved', ts: NOW, note: 'Disetujui.'
```

**Akibatnya:** seorang Senior Auditor menekan "Posting ke WTB" di form AJE, dan sistem
seketika menerbitkan jejak yang menyatakan Audit Manager, Engagement Partner, dan —
bila jurnalnya ≥ Rp 2 M — EQR Reviewer telah **menyetujui**, lengkap dengan stempel
waktu dan catatan "Disetujui.". Tak satu pun dari mereka melakukan apa pun.

Ini bukan kontrol yang hilang. Ini sistem yang **membuat bukti audit palsu** atas nama
partner. Dalam inspeksi P2PK/BDO, jejak semacam ini lebih buruk daripada tidak ada
jejak sama sekali: ia menyatakan sesuatu yang tak terjadi, dan penyangkalannya sulit.

### P-1 · Modul AJE membantah kontrol yang ditulisnya sendiri

Tab Persetujuan menyatakan (`view_aje.tsx:617`):

> *"Jurnal hanya boleh diposting ke Working Trial Balance setelah disetujui Engagement
> Partner sesuai kebijakan otorisasi firma (ISQM 1)."*

Sementara di tab sebelahnya, `view_aje.tsx:285` (dan kembarannya `view_execution.tsx:1432`):

```jsx
<span onClick={e => { e.stopPropagation(); if (!locked) toggleAjeStatus(a.id); }}>
```

Satu klik pada badge status. Gerbangnya hanya `locked || !can(AJE_EDIT)` — dan
`AJE_EDIT` dimiliki **Senior Auditor** (`rbac.ts:108`). Tanpa konfirmasi, tanpa alasan,
tanpa `logActivity`, tanpa menyentuh rantai. Membalik Posted→Proposed juga sama
mudahnya: **membatalkan posting jurnal yang sudah disetujui partner, tanpa jejak.**

### P-2 · Nol penegakan server untuk seluruh jalur persetujuan

`SIGNOFF_KEYS` (`server/src/signoff.ts:67`):

```js
new Set(['wpState', 'opinionDoc.v1', 'reviewNotes', 'prospects',
         'strategyApproved.v1', 'mat.memo.signoff'])
```

**`aje` tidak ada di dalamnya. `approvals_ov_v3` juga tidak.** Konsekuensinya
`guardSignoffWrite` tak pernah berjalan untuk jurnal: satu-satunya gerbang server pada
kunci `aje` adalah `capForWrite = AJE_EDIT`. Klien yang dimodifikasi — atau sekadar
panggilan tRPC langsung — dapat menulis `status: 'Posted'` tanpa hambatan.

Ini persis pola yang sudah diperbaiki untuk sign-off kertas kerja di #23 (memori
`asseris-opinion-signoff-sod-defect`): gerbang UI saja tidak cukup, harus dua lapis.

### P-3 · Gerbang penyetuju lemah & tak per-langkah

`view_platform.tsx:75`:

```js
const canApprove = user.role.includes('Partner') || user.role.includes('Manager');
```

Tiga masalah: (a) pencocokan **string** pada nama peran, bukan `can()`/`CAP` — di luar
SSOT RBAC; (b) **tak ada otoritas per-langkah** — seorang Audit Manager dapat
menyelesaikan langkah *Engagement Partner* dan bahkan langkah *EQR Reviewer*, sehingga
rantai tiga-lapis runtuh menjadi satu; (c) tak ada pemeriksaan bahwa penyetuju bukan
penyusunnya sendiri (self-approval).

### P-4 · Antrean persetujuan tak berlingkup perikatan

- `useAmsPersist('approvals_ov_v3', …)` (`view_platform.tsx:64`) — kunci ini **tidak
  terdaftar** di `AMS_PERSIST_SCOPE`, jadi jatuh ke lingkup **firma**. Keputusan
  persetujuan atas jurnal satu klien tersimpan lintas-perikatan, tanpa isolasi W7.5.
- `buildApprovals` memaku perikatan (`data_platform.ts:75`):
  ```js
  const engA = engById('ENG-2025-014');
  ```
  Setiap AJE — dari perikatan mana pun — diatribusikan ke manager & partner
  ENG-2025-014. Rantai persetujuan menyebut nama orang yang salah.

---

## 2 · Objective

Satu jalan menuju "Posted", dan jalan itu melewati orang yang berwenang.

Turunannya: (a) tak ada jurnal berstatus Posted tanpa keputusan manusia yang tercatat
di tiap langkah yang disyaratkan `ROUTING_RULES`; (b) tak ada langkah yang ditandai
"approved" tanpa seseorang benar-benar menyetujuinya; (c) penegakan di server, bukan
hanya UI.

---

## 3 · Success Criteria

1. `addAje` menghasilkan `status: 'Proposed'`. Uji: entri baru **tidak pernah** muncul
   di `buildApprovals` dengan langkah Manager/Partner/EQR berstatus `approved`.
2. Uji anti-pemalsuan: untuk jurnal yang belum melewati `decide()`, **tak satu pun**
   langkah selain 'Penyusun' boleh berstatus `approved` — pada seluruh kombinasi
   nilai (< 500 jt · 0,5–2 M · > 2 M).
3. `guardSignoffWrite` menolak transisi `Proposed → Posted` pada kunci `aje` untuk
   peran tanpa kapabilitas posting; uji server-side (pola `signoff.test.ts`) menutup
   keempat peran (Junior/Senior/Manager/Partner).
4. Otoritas **per-langkah**: uji membuktikan Audit Manager tak dapat menyelesaikan
   langkah Engagement Partner maupun EQR; Partner tak dapat menyelesaikan langkah EQR
   bila EQR adalah peran terpisah.
5. Self-approval ditolak: penyusun jurnal tak dapat menyetujui jurnalnya sendiri.
6. Setiap perubahan status jurnal memanggil `logActivity` — uji menghitung entri jejak
   sebelum/sesudah.
7. `approvals_ov_v3` berlingkup perikatan & terisolasi W7.5; `buildApprovals` memakai
   perikatan **aktif**, bukan `'ENG-2025-014'`.
8. `npm run typecheck` 0 · `npm test` hijau · `npm run lint` tanpa suppression baru ·
   uji server hijau.

---

## 4 · Scope

**`contexts.tsx`**
- `addAje` → `status: 'Proposed'`.
- `toggleAjeStatus` diganti dua fungsi bertujuan tunggal dengan alasan wajib:
  `proposeAje(id, reason)` dan `postAje(id, approvalId)` — yang kedua hanya dapat
  dipanggil dari jalur persetujuan. Keduanya memanggil `logActivity`.

**`view_aje.tsx` · `view_execution.tsx`**
- Badge status **tidak lagi interaktif**. Diganti tombol "Ajukan Persetujuan" yang
  mengarahkan ke antrean (`nav('approvals', { from:'aje' })`).
- Form AJE: tombol "Posting ke WTB" → **"Ajukan untuk Persetujuan"**; subtitle modal
  yang berbunyi "Posting langsung ke Working Trial Balance" diperbaiki (dan
  `'ENG-2025-014'` yang di-hardcode di `view_execution.tsx:1509` dibuang).

**`data_platform.ts`**
- `chain()` tak lagi menyimpulkan persetujuan dari status; langkah `approved` HANYA
  dari keputusan tercatat.
- `doneTo` diturunkan dari overlay keputusan, bukan dari `posted`.
- Perikatan dari argumen, bukan `engById('ENG-2025-014')`.

**`view_platform.tsx`**
- `canApprove` → `can()` berbasis CAP, **per langkah**.
- Tolak self-approval.
- `approvals_ov_v3` → `useServerState` berlingkup engagement.

**`rbac.ts`** — kapabilitas posting jurnal (lihat §11 Q1).

**`server/src/signoff.ts`** — `aje` & `approvals_ov_v3` masuk `SIGNOFF_KEYS`;
`guardSignoffWrite` mendiff transisi status jurnal & langkah rantai, menuntut
kapabilitas yang sesuai. Pola & uji mengikuti `wpState` yang sudah ada.

**`contexts.tsx` `AMS_PERSIST_SCOPE`** — daftarkan `approvals_ov_v3` sebagai
`'engagement'`.

---

## 5 · Non-Scope

- Rekonsiliasi SA 450 cache-dingin & pemeriksaan nilai → **PR-C**.
- `AJE_META.pbt`/`curEff` duplikat & `ajeDeriveKind` → **PR-D**.
- Regime materialitas grup SA 600 → PRD tersendiri.
- Jenis persetujuan lain (Faktur, Penerimaan Klien, WIP, Independensi) tetap memakai
  `canApprove` lama. **Diakui terbuka:** P-3 berlaku untuk seluruh jenis, tapi
  memperbaiki semuanya sekaligus menjadikan PR ini tak dapat ditinjau. AJE lebih dulu
  karena ia satu-satunya yang **menulis balik ke SSOT angka**.
- Migrasi data: keputusan persetujuan yang sudah tersimpan di `approvals_ov_v3`
  berlingkup firma tidak dipindahkan — lihat §9 R-2.

---

## 6 · Constraints

- Tak boleh memecah `writesBack` yang sudah bekerja: persetujuan final tetap memposting.
- Backend `:5181` **tidak hot-reload** `rbac.js` (memori `asseris-sa510-indep-fee-prioryear`)
  — restart wajib saat menguji perubahan kapabilitas.
- `capForWrite` firm-scope default `FIRM_ADMIN` pernah membuat Manajer 403 senyap
  (memori yang sama). Pemindahan `approvals_ov_v3` ke engagement-scope harus memakai
  `capForWrite` yang benar atau seluruh persetujuan mati diam-diam.
- Ratchet ESLint: satu `:any` baru meng-un-suppress seluruh berkas.
- Menyentuh `AMS_CANON` ⇒ perbarui snapshot `canon_regression.test.ts`.

---

## 7 · Existing Solutions

**Dipakai ulang, bukan dibangun ulang:**
- `buildApprovals` + `ROUTING_RULES` + `decide()` — rantai, SLA, thread, tulis-balik
  SSOT sudah ada dan benar.
- `guardSignoffWrite` + `SIGNOFF_KEYS` (`server/src/signoff.ts`) — mesin penegakan
  dua-lapis sudah terbukti untuk `wpState`/`opinionDoc.v1`; AJE tinggal mendaftar.
- Resep kunci persist otoritatif 3-titik (memori `asseris-authoritative-persist-key-recipe`):
  `AMS_PERSIST_SCOPE=engagement` + gerbang UI `can()` + `SIGNOFF_KEYS`/`guardSignoffWrite`.

Pekerjaan kustom yang dibenarkan hanya: otoritas **per-langkah** (belum ada padanannya —
`wpState` memakai slot tetap preparer/reviewer/partner, sedangkan rantai AJE panjangnya
bergantung nilai).

---

## 8 · Proposed Approach

Tutup jalan pintas → hentikan penyimpulan persetujuan dari status → daftarkan ke
penegakan server. Berurutan, karena tiap langkah dapat diverifikasi sendiri.

**Pembalikan arah data yang menjadi inti perbaikan:**

| | Sekarang | Sesudah |
|---|---|---|
| Sumber kebenaran persetujuan | `aje.status` | keputusan tercatat di overlay |
| `status` jurnal | ditulis langsung UI | **turunan** dari rantai yang tuntas |

Selama `status` menjadi *input* bagi rantai, memalsukan rantai cukup dengan menulis
status. Setelah `status` menjadi *output*, pemalsuan menuntut keputusan bertanda tangan
di tiap langkah — dan itulah yang dijaga server.

**Alternatif yang ditolak:**
1. *Cukup sembunyikan toggle dari peran non-Partner.* Ditolak — gerbang UI saja, persis
   cacat #23. Dan tak menyentuh P-0 (pemalsuan tetap terjadi lewat form AJE).
2. *Biarkan `addAje` 'Posted' tapi tandai "belum disetujui" di UI.* Ditolak — jurnal
   sudah mengubah angka WTB sejak detik itu; label tak membatalkan efek.
3. *Bangun mesin persetujuan baru khusus AJE.* Ditolak — duplikasi; yang ada sudah benar.

---

## 9 · Risks

### R-1 · Memutus rantai posting → jurnal seed tampak "belum disetujui"

Seed `AJE-01/02/04` berstatus `Posted` tanpa keputusan tercatat. Setelah `doneTo`
diturunkan dari overlay, ketiganya akan tampil sebagai langkah Manager/Partner
**pending** meski statusnya Posted — persis kontradiksi yang sedang diperbaiki, tapi
terlihat sebagai regresi.
**Mitigasi:** seed `approvals_ov_v3` diberi keputusan historis yang konsisten dengan
`AJE_META` (`reviewedOn`/`postedOn`/`reviewer`/`partner` sudah ada di `view_aje.tsx:33-37`).
Itu membuat jejak seed **jujur**: nama & tanggal yang memang tercatat, bukan stempel
otomatis. Jurnal tanpa metadata reviu tetap Proposed.

### R-2 · Migrasi lingkup persist mematikan persetujuan yang sudah ada

`approvals_ov_v3` firm-scope → engagement-scope: kunci lama menjadi **yatim**, persis
kelas cacat yang digigit #129 (memori `asseris-materiality-om-split`).
**Mitigasi:** rantai baca-lewat (engagement → firma → legacy) seperti `readPersisted`,
plus penanda `source` agar jalur legacy terdeteksi. Kunci dinaikkan ke `v4`.

### R-3 · `capForWrite` salah ⇒ 403 senyap

Sudah pernah terjadi (Manajer 403 pada firm-scope default `FIRM_ADMIN`).
**Mitigasi:** uji server eksplisit per peran untuk tulis `approvals_ov_v4`; verifikasi
live dengan login **Audit Manager**, bukan Partner (memori `asseris-gap-matrix-eval`:
verifikasi live wajib peran Manager — Partner menyembunyikan cacat kewenangan).

### R-4 · Rantai bergantung nilai ⇒ jurnal yang nilainya berubah

Jurnal Rp 1,9 M (rantai 3 langkah) yang disunting menjadi Rp 2,1 M memerlukan langkah
EQR yang belum ada; sebaliknya penurunan nilai bisa membuat langkah yang sudah disetujui
menjadi berlebih.
**Mitigasi:** panjang rantai dihitung ulang dari nilai **saat pengajuan**, dan perubahan
nilai setelah pengajuan **membatalkan** persetujuan yang sudah ada (status kembali
Proposed, keputusan lama disimpan sebagai riwayat). Perlu dinyatakan di UI.

### R-5 · Ruang lingkup menyentuh server ⇒ dua repo, satu PR

`server/src/signoff.ts` + `migration/src`. **Mitigasi:** uji server dan uji klien
terpisah; PR menyatakan urutan deploy (server dulu — gerbang baru menolak payload lama
hanya bila klien belum diperbarui, jadi server-dulu aman).

---

## 10 · Implementation Plan

| # | Langkah | Verifikasi |
|---|---|---|
| 1 | `chain()`/`doneTo` berhenti menyimpulkan persetujuan dari `status`; seed keputusan historis dari `AJE_META` | Kriteria #2 — uji anti-pemalsuan pada 3 tingkat nilai |
| 2 | `addAje` → `'Proposed'`; form AJE jadi "Ajukan untuk Persetujuan" | Kriteria #1 |
| 3 | Badge status non-interaktif; `proposeAje`/`postAje` + `logActivity` | Kriteria #6 |
| 4 | `canApprove` → `can()` per-langkah + tolak self-approval | Kriteria #4, #5 |
| 5 | `approvals_ov_v4` engagement-scope + rantai baca-lewat | Kriteria #7 |
| 6 | `SIGNOFF_KEYS` += `aje`, `approvals_ov_v4`; `guardSignoffWrite` transisi status | Kriteria #3 |
| 7 | `buildApprovals` memakai perikatan aktif | Kriteria #7 |
| 8 | Verifikasi live **login Audit Manager** — coba selesaikan langkah Partner (harus ditolak), lalu login Partner (harus lolos) | Kriteria #4 di layar |

Langkah 8 tidak opsional dan **wajib peran Manager**: login Partner lolos di semua
langkah sehingga menyembunyikan justru cacat yang sedang diperbaiki.

---

## 11 · Open Questions

**Q1 — Kapabilitas untuk memposting jurnal: pakai ulang atau baru?** *(memblokir langkah 4 & 6)*
Yang ada: `SIGNOFF_REVIEWER` (Manager), `OPINION_APPROVE` (Partner), `EQR_REVIEW`.
Memakai `OPINION_APPROVE` untuk memposting jurnal secara semantik salah — cap itu
tentang penerbitan opini, dan menyatukannya berarti siapa pun yang boleh memposting
jurnal otomatis boleh menyetujui opini. Rekomendasi saya: **`CAP.AJE_POST` baru**
(Partner-level), dengan langkah Manager memakai `SIGNOFF_REVIEWER` dan langkah EQR
memakai `EQR_REVIEW`. Biaya: satu kapabilitas baru di matriks peran + seed RBAC.

**Q2 — Bolehkah Partner memposting langsung, melewati langkah Manager?**
Praktik firma sering membolehkan partner mem-bypass reviu manajer untuk jurnal kecil.
`ROUTING_RULES` sekarang tidak menyediakan itu. Bila diinginkan, ia harus menjadi
**override tercatat beralasan** (seperti `PHASE_OVERRIDE`), bukan diam-diam.
Rekomendasi: **tidak** di PR-B — tambahkan hanya bila Anda memang menginginkannya.

**Q3 — Membatalkan posting (Posted → Proposed): siapa, dan dengan syarat apa?**
Hari ini satu klik oleh siapa pun ber-`AJE_EDIT`. Setelah PR-B, jurnal yang sudah
diposting sudah mengubah angka WTB dan mungkin sudah dirujuk SAD/opini. Rekomendasi:
setara otoritas posting + alasan wajib + entri jejak, dan **diblokir** bila perikatan
sudah terkunci/arsip. Perlu konfirmasi Anda.

**Q4 — Seed keputusan historis (R-1): pakai `AJE_META` atau biarkan seed Proposed?**
Memakai `AJE_META` membuat demo tetap utuh dengan jejak yang jujur. Membiarkan seed
Proposed lebih "bersih" secara konseptual tapi membuat seluruh angka WTB demo bergerak
(3 jurnal posted menjadi tak-posted → PBT dilaporkan kembali ke 29.690 jt, dan seluruh
tampilan hilir berubah lagi setelah baru saja bergeser di PR-A). Rekomendasi:
**pakai `AJE_META`**.

---

**Sign-off:** ditandai dengan balasan **"Proceed."**
Q1 memblokir langkah 4 & 6; sisanya dapat berjalan dengan rekomendasi di atas bila
Anda tak menyatakan lain.
