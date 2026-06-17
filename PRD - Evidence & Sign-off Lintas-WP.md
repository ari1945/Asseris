# PRD — Evidence & Sign-off Lintas-Kertas-Kerja (NeoSuite AMS · P2)

> Wajib sign-off ("Proceed.") sebelum implementasi. Dokumen ini *merancang*, belum *membangun*.

| Field | Isi |
|---|---|
| Tanggal | 2026-06-18 |
| Pemilik | Ari Widodo |
| Status | **Draft / menunggu review** |
| Sumber masalah | [Evaluasi Fitur — Gap & Pendalaman](Evaluasi%20Fitur%20NeoSuite%20AMS%20-%20Gap%20&%20Pendalaman.md) · Prioritas **P2** |
| Basis kode | `migration/src` (ESM, canonical, pasca-W5) |

---

## 1. Problem

Modul-modul NeoSuite AMS menampilkan angka audit yang benar (ditarik dari `AMS_CANON`),
tetapi **sebagian besar belum menjadi kertas kerja yang bisa ditandatangani**. Tiga akar
masalah yang terbukti di kode:

1. **Sign-off terfragmentasi.** Ada **9 komponen `*Signoff` bespoke** (`FSSignoff`,
   `I35Signoff`, `OpinionSignoff`, `p71WpSignoff`, `p117WpSignoff`, `sySignoff`,
   `SignoffTab`, …), masing-masing modul menulis sendiri, dengan **key persist tak seragam**
   (`fsgen.signoff`, `isak35.signoff`, `mat.memo.signoff`). Tidak ada komponen sign-off WP
   tunggal yang dapat dipakai ulang. Akibatnya ~140 modul **tak punya sign-off sama sekali**.
2. **Evidence generik, tak terikat WP.** `EvidenceControl` **sudah global** (dirender SubBar
   tiap modul, `shell.jsx:337`) — tapi hanya ember lampiran per-`moduleId`. Bukti **tidak
   ditautkan ke WP-ref spesifik**, tidak ada daftar "bukti yang diwajibkan", dan tidak ikut
   menghitung kelengkapan kertas kerja.
3. **Tak ada sinyal kelengkapan WP.** `deriveWpStatus`/`SignoffDots` ada tapi display-only;
   tidak ada gabungan *(status kanonik + sign-off + evidence)* per WP, dan tidak ada rekap
   "berapa WP sudah ditandatangani & berbukti" per engagement.

**Dampak terukur:** hanya **6 dari 161** view memenuhi tier "auditable WP". Suite akuntansi
PSAK (16 modul) = **0% sign-off, ~0 evidence terikat**. Untuk firma audit, kertas kerja tanpa
jejak preparer/reviewer + bukti = tidak memenuhi standar dokumentasi (SA 230).

> Catatan altitude: ini masalah **dokumentasi/auditability**, bukan masalah angka. Lapisan angka
> sudah matang (W4/W5). Yang kurang adalah lapisan *kertas kerja* di atasnya.

## 2. Objective

Menjadikan kertas kerja **auditable** dengan **satu lapisan evidence-terikat + sign-off yang
dapat dipakai ulang**, lalu menyebarkannya ke himpunan WP substantif — sehingga jejak
preparer/reviewer, bukti, dan status kelengkapan konsisten lintas modul.

**Mengapa ini objective yang benar:** (a) leverage tertinggi atas fondasi yang sudah ada
(canon + EvidenceControl global + `deriveWpStatus`); (b) **mayoritas pekerjaan = konsolidasi
fragmentasi**, bukan fitur net-baru; (c) **tidak bergantung backend** — bisa jalan sekarang di
atas `localStorage` (P2 memang dirancang sebagai kemenangan murah yang tak menunggu W6).

## 3. Success Criteria (terukur)

1. **Satu** komponen sign-off WP reusable (`WpSignoff`) + **satu** penaut evidence-ke-WP
   (`WpEvidenceLink`) + **satu** lencana status gabungan (`WpStatusBadge`) — di-`window`-export,
   ber-alias unik (aturan emas).
2. **Konvensi key persist tunggal**: `ams.v1.wp.<engId>.<wpRef>` (menggantikan 3+ pola lama).
3. **9 sign-off bespoke** dimigrasikan ke komponen bersama (sisa bespoke ≤ 1, dengan alasan).
4. Evidence menjadi **WP-aware**: tiap WP target mendeklarasikan `requiredEvidence[]`;
   kelengkapan mencerminkan attached-vs-required.
5. **Cakupan**: ≥ **30 modul WP substantif** (suite PSAK + SA 500/540/501 + Core Execution)
   menampilkan sign-off + tautan bukti + status, **persisted**.
6. **Rekap kelengkapan per-engagement** (mis. "18/30 WP ditandatangani · 22/30 berbukti")
   di Cockpit/Finalisasi.
7. **Nol regresi numerik** (canon tak disentuh); `typecheck`/`lint`/`test`/`build` hijau;
   render Vite terverifikasi.

## 4. Scope

- Komponen bersama: `WpSignoff` (preparer/reviewer + tanggal + status + lock-after-review),
  `WpEvidenceLink` (ikat `amsAttachEvidence` ke `wpRef`, tampil required vs attached),
  `WpStatusBadge` (gabung `deriveWpStatus` + sign-off + evidence).
- Konvensi & util persist tunggal (forward-compatible untuk W6).
- Migrasi 9 sign-off bespoke → komponen bersama (paritas perilaku).
- Sebar ke himpunan WP substantif (didefinisikan di Fase 0).
- Peta `requiredEvidence` per-WP (config gaya `COMPLIANCE_CONFIG`).
- Rekap kelengkapan per-engagement.

## 5. Non-Scope (eksplisit dikecualikan)

- **Backend nyata (W6)** — penyimpanan tetap `localStorage` untuk fase ini.
- **E-signature / tanda tangan hukum** (DocuSign dsb.) — ini sign-off *internal* kertas kerja.
- **AI Tax Audit Diagnostic (P4)** — terpisah.
- **Modul baru** — tidak menambah breadth.
- **Mengubah `AMS_CANON`** — lapisan angka tetap utuh.
- Migrasi multi-user/lintas-perangkat (konsekuensi `localStorage`).

## 6. Constraints

- **Orang:** solo (Ari). **Sistem:** ESM-only, `migration/src` canonical; wajib patuh aturan
  emas anti-tabrakan (alias hook/styles unik, `Object.assign(window,…)`, urut `<script>`).
- **Data:** belum ada backend → `localStorage` (`ams.v1.*`). Multi-user **tidak** terpecahkan.
- **Mutu:** gate `typecheck`/`lint`/`test`/`build` harus tetap hijau; canon tak boleh bergeser.
- **Bahasa:** UI Bahasa Indonesia.

## 7. Existing Solutions (dan kenapa belum cukup)

| Yang ada | Lokasi | Kenapa belum cukup |
|---|---|---|
| `EvidenceControl` global | `evidence.jsx` + `shell.jsx:337` | Intake generik per-`moduleId`; **tak terikat WP**, tak ada required-evidence, tak menghitung kelengkapan. |
| `deriveWpStatus`, `openCanonicalWp`, `SignoffDots`, `SA_WP_MAP` | `sa_canonical.jsx` | Status & dot **display-only**; bukan kontrol sign-off interaktif. |
| `SignoffTab` (register WP) | `view_wp.jsx` | Pola paling lengkap — **kandidat sumber generalisasi**, tapi terkurung di modul Workpapers. |
| 9 `*Signoff` bespoke | fsgen/isak35/opinion/psak71/psak117/syariah/… | **Fragmentasi** — duplikasi, key tak seragam, tak bisa dipakai ulang. |
| `useAmsPersist` | `contexts.jsx` | Primitif persist OK; tinggal disatukan konvensinya. |

**Simpulan:** primitifnya **sudah ada & matang**; yang hilang adalah **lapisan WP yang
menyatukannya** + penyebaran. Custom-work minimal; sebagian besar = konsolidasi.

## 8. Proposed Approach

**Kontrak WP tunggal** (persist `ams.v1.wp.<engId>.<wpRef>`):
```
{ engId, wpRef, preparer, preparedAt, reviewer, reviewedAt,
  status: 'draft'|'prepared'|'reviewed', requiredEvidence: string[], notes }
```

**Tiga komponen bersama** (dibangun di atas primitif yang ada):
- `WpSignoff` — aksi "Tandai disiapkan" / "Tandai ditelaah", kunci-setelah-telaah, jejak
  nama+tanggal. Menggantikan 9 bespoke.
- `WpEvidenceLink` — bungkus `amsAttachEvidence(wpRef, …)`; tampil *required vs attached*
  (memakai `amsEvidenceFor`/`amsEvidenceCount`).
- `WpStatusBadge` — gabung `deriveWpStatus(wpRef)` + state sign-off + cukup-tidaknya evidence
  → satu lencana kelengkapan; dipakai juga di register & rekap.

**Generalisasi dari yang terbaik:** ambil pola `SignoffTab` (`view_wp.jsx`) / `OpinionSignoff`
sebagai acuan, jadikan komponen netral-modul.

**Alternatif yang ditolak:** (a) biarkan bespoke per-modul → memperparah fragmentasi;
(b) tunggu W6 backend → P2 sengaja dirancang murah & backend-independen, `localStorage` cukup
untuk single-user sekarang, dengan key forward-compatible agar W6 tinggal mengadopsi.

## 9. Risks

| Risiko | Mitigasi |
|---|---|
| `localStorage`-only → bukan multi-user/lintas-perangkat | Konvensi key tunggal & forward-compatible; backend W6 nanti adopsi wholesale; dokumentasikan sebagai batas diketahui. |
| Tabrakan aturan emas (scope global) saat tambah komponen | Alias unik, `window`-export, sisip `<script>` sebelum `app.jsx`. |
| Migrasi 9 bespoke meregресi perilaku | Migrasi inkremental, verifikasi manual per modul, jaga snapshot. |
| Scope creep (menyebar ke semua 150) | Definisikan himpunan WP substantif (~30) di Fase 0; iterasi, jangan boil-the-ocean. |
| Persist ramai membebani `localStorage` | Batasi payload (catatan ringkas, bukti = metadata bukan file besar — sudah pola `evidence.jsx`). |

## 10. Implementation Plan (fase + milestone)

- **Fase 0 — Inventaris & desain (½ hari).** Tetapkan himpunan WP substantif + peta
  `requiredEvidence`; pilih pola acuan; finalisasi kontrak & konvensi key. → *deliverable: daftar WP + skema.*
- **Fase 1 — Komponen bersama (1 hari).** `WpSignoff`/`WpEvidenceLink`/`WpStatusBadge` + util
  persist. Verifikasi manual + (bila layak) unit test ringan. Gate hijau.
- **Fase 2 — Migrasi bespoke (1 hari).** 9 `*Signoff` → komponen bersama, paritas perilaku,
  per modul diverifikasi render.
- **Fase 3 — Sebar (1–2 hari).** Pasang shell sign-off+evidence ke suite PSAK + SA 500/540/501
  + Core Execution (~30 modul).
- **Fase 4 — Rekap & gate (½ hari).** Ringkasan kelengkapan per-engagement di Cockpit/Finalisasi;
  opsional gerbang fase ("tak bisa finalisasi sebelum WP kunci ditelaah").
- Tiap fase: gate `typecheck`/`lint`/`test`/`build` + render check; **nol regresi canon**.

*Estimasi kasar: ~4–5 hari kerja terfokus.*

## 11. Open Questions (perlu keputusan Anda)

1. **Penyimpanan:** `localStorage` sekarang (rekomendasi) **atau** tunda sampai arah W6
   diputuskan? (memengaruhi durabilitas data sign-off)
2. **Himpunan WP fase pertama:** setuju **suite PSAK + SA 500/540/501 + Core Execution (~30)**,
   atau prioritaskan subset lain dulu?
3. **Tingkat sign-off:** 2-tingkat (preparer/reviewer) **atau** 3-tingkat (+ EQR/partner untuk
   WP berisiko tinggi)?
4. **Kunci-setelah-telaah:** keras (tak bisa diedit) atau lunak (bisa, dengan jejak)?
5. **Pemilik peta `requiredEvidence`:** config terpusat (gaya `COMPLIANCE_CONFIG`) — siapa isi
   awal? (saya bisa seed dari standar SA per WP)

---
**Sign-off:** balas **"Proceed."** untuk mulai implementasi (dari Fase 0).
Jika ada Open Question yang ingin diputuskan dulu, sebutkan — saya sesuaikan PRD sebelum mulai.
