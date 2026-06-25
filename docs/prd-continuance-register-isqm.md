# PRD — Keberlanjutan Klien (ISQM 1 ¶33–34 / SA 220): register portofolio

| Field | Isi |
|---|---|
| Tanggal | 2026-06-25 |
| Pemilik | Ari Widodo |
| Status | Draft — **menunggu sign-off** |
| Engagement ID terkait | — (modul level-firma) |

> ⚠️ **Pushback dulu (truth over agreement + aturan anti-duplikasi KERAS).** Permintaan awal: modul "Penerimaan & Keberlanjutan Klien". Setelah grep kode, **sebagian besar "Penerimaan" SUDAH ADA** — membangun ulang = duplikasi. PRD ini mempersempit scope ke **gap yang benar-benar kosong**: *keberlanjutan (continuance) untuk portofolio klien aktif*. Mohon baca §7 dulu, lalu pilih pendekatan di §11.

## 1. Problem

ISQM 1 ¶33–34 & SA 220 mewajibkan firma menilai **penerimaan** (klien baru) **dan keberlanjutan** (klien lanjutan) hubungan klien-perikatan, **setiap tahun** sebelum memulai perikatan berulang. Masalahnya:

1. **Penerimaan klien-baru** sudah tertangani modul `onboarding` (gerbang Akseptasi→PMPJ→Engagement Letter→Konversi, beroperasi atas `PROSPECTS`).
2. **Keberlanjutan portofolio aktif tidak punya rumah.** Tidak ada register yang menampilkan, untuk **8 klien aktif** (`CLIENTS`), status keputusan keberlanjutan tahunan: sudah diputuskan? tertunda? pemicu apa (rotasi/independensi, modifikasi opini tahun lalu, perubahan risiko/fee, isu integritas)? Onboarding bersifat *prospek-centric* — keberlanjutan hanya muncul bila seseorang membuat prospek `kind:'Keberlanjutan'` manual; tidak ada pengawasan menyeluruh atas basis klien berjalan.
3. **Slot FPM kosong** sejak RoMM dipindah ke Core Planning (PR #25) — secara konsep, risiko level-firma (penerimaan/keberlanjutan, ISQM 1) memang layak mengisi slot itu.

## 2. Objective

Memberi Partner/QM-Leader satu register level-firma untuk **memutuskan & mendokumentasikan keberlanjutan tiap klien aktif** sebelum perikatan tahun berjalan — terhubung ke pemicu (independensi/rotasi, opini sebelumnya, risiko) dan ke komponen ISQM 1 C4. Tanpa menduplikasi penerimaan klien-baru (milik `onboarding`).

## 3. Success Criteria

1. Modul baru tampil di workspace **Firma → grup Firm Practice Management** (mengisi slot yang ditinggalkan RoMM).
2. Register menampilkan SELURUH klien aktif dengan: keputusan keberlanjutan (Lanjut / Lanjut dengan Syarat / Tidak Dilanjutkan / Tertunda), pemicu otomatis (rotasi mendekati batas, opini modifikasi LY, risiko High), penanggung jawab, tanggal.
3. Keputusan **persist firm-scope** (SSOT), gated RBAC: inisiasi `ENGAGEMENT_MANAGE`, persetujuan final `FIRM_ADMIN` (pola `view_onboarding2`).
4. Angka pemicu **diturunkan** dari sumber kanonik (`CLIENTS`, `INDEPENDENCE`, `ENGAGEMENTS`) — bukan hardcode.
5. Tertaut ke ISQM C4 (`isqm`) & rotasi (`pppk`) via chip/nav; RELATED_SA = SA 220 + ISQM 1.
6. `typecheck` 0 · `lint` bersih · test hijau (+ unit test mesin pemicu).

## 4. Scope

- Modul `continuance` ("Keberlanjutan Klien") + view + route + registrasi navigasi (icons/app/html-tak-relevan-karena-ESM).
- **Mesin pemicu murni** (util bertipe, bebas-any, ber-test): dari `CLIENTS`+`INDEPENDENCE`+`ENGAGEMENTS` → daftar flag keberlanjutan per klien + keputusan tersimpan.
- Register UI + aksi keputusan (gated) + drill ke onboarding/isqm/pppk.

## 5. Non-Scope

- **TIDAK** membangun ulang penerimaan klien-baru, PMPJ/KYC, atau Engagement Letter — itu milik `onboarding`; modul ini me-`nav` ke sana bila keputusan = mulai re-PMPJ.
- **TIDAK** membangun mesin kepatuhan rotasi — `pppk`/`INDEPENDENCE` sudah ada; modul ini hanya *membaca* pemicu rotasi.
- **TIDAK** menyentuh skor/komponen ISQM C4 — hanya menautkan.
- **TIDAK** mengubah `onboarding` (kecuali, bila dipilih Opsi B di §11).

## 6. Constraints

- ESM-only, edit `migration/src/*`. Gate typecheck/lint/test wajib hijau. Ratchet `no-explicit-any` (kode `.ts` baru bebas-any; view `.tsx` boleh `:any` props baseline).
- SSOT: pemicu dari kanon; keputusan firm-scoped via `useAmsPersist`/`useServerState('…','firm',FIRM_SCOPE_ID)`.
- Solo; inkremental & dapat di-review.

## 7. Existing Solutions — **baca ini sebelum menyetujui**

| Sudah ada | Lokasi | Menangani | Kenapa belum cukup |
|---|---|---|---|
| `onboarding` (4 gerbang) | `view_onboarding*.tsx`, `PROSPECTS` | Penerimaan klien-baru + akseptasi prospek (skor faktor berbobot, verdict, PMPJ, Letter SA 210) | **Prospek-centric**; tak ada pengawasan keberlanjutan atas portofolio klien aktif |
| ISQM C4 "Penerimaan & Keberlanjutan" | `data_part4.ts:152`, `view_isqm*` | Komponen mutu (skor 88, owner) | Hanya skor/governance — bukan register operasional keputusan per-klien |
| `INDEPENDENCE` + `pppk` rotasi | `data_part1.ts:298`, `data_part4` | Tenure vs batas rotasi (PIE 5th/jasa-keuangan 3th) | Kepatuhan rotasi — bukan keputusan keberlanjutan; perlu dibaca sebagai pemicu |
| `PROSPECTS kind:'Keberlanjutan'` | `data_part1` | Keberlanjutan via prospek manual | Tidak menyeluruh; tak menutup seluruh basis klien aktif |
| `obAccScore/obAccVerdict` | `view_onboarding.tsx:27` | Model skor faktor akseptasi | **Reusable** untuk keputusan keberlanjutan |

**Kesimpulan:** custom work hanya terjustifikasi untuk **register keberlanjutan portofolio aktif** + **mesin pemicu**. Penerimaan, PMPJ, Letter, rotasi = reuse/link.

## 8. Proposed Approach (rekomendasi: **Opsi A**)

**Opsi A — Modul fokus `continuance` di slot FPM (REKOMENDASI).**
- `continuance_engine.ts` (murni, bertipe, ber-test): `continuanceFlags(clients, independence, engagements)` → per klien: pemicu (rotasiMendekati, opiniModifikasiLY, risikoHigh, feeOutstanding?), level perhatian, default keputusan.
- `view_continuance.tsx`: register klien aktif + keputusan tersimpan (firm-scope) + aksi gated + drill nav ke `onboarding`/`isqm`/`pppk`.
- Registrasi: tambah item ke grup `Firm Practice Management` (icons), route `viewFor`, RELATED_SA `{SA 220, ISQM 1}`, LINEAGE opsional.
- *Plus:* slot FPM kembali terisi konsep yang tepat (risiko level-firma).

**Opsi B — Tab "Keberlanjutan Portofolio" di `onboarding`.** Tanpa modul baru; tambah tab ke onboarding yang menampilkan portofolio aktif (bukan hanya prospek). Lebih hemat permukaan, tapi onboarding jadi gemuk & slot FPM tetap kosong.

**Opsi C — Drill-down operasional di `isqm` C4.** Perluas view ISQM C4 jadi register per-klien. Paling "benar" secara taksonomi ISQM, tapi mengubur fitur di modul mutu (kurang ditemukan Partner) & slot FPM tetap kosong.

## 9. Risks

| Risiko | Mitigasi |
|---|---|
| Duplikasi dgn onboarding (pelanggaran aturan KERAS) | Scope ketat: continuance-only; link ke onboarding untuk PMPJ/Letter; §5 non-scope tegas |
| Data demo tipis (keputusan keberlanjutan belum di-seed) | Seed ringkas keputusan untuk 8 klien aktif (atau derive default dari pemicu, berlabel "tertunda") |
| RBAC bocor (staf lihat seluruh portofolio + keputusan) | Gate view `ENGAGEMENT_VIEW_ALL`/`FIRM_ADMIN`; uji role Manager & Junior |
| Tumpang tindih makna "keberlanjutan" (sustainability/going-concern) | Penamaan jelas: "Keberlanjutan Klien (ISQM 1/SA 220)"; jangan tabrakan dgn `sustain`/going-concern |

## 10. Implementation Plan (bila Opsi A disetujui)

1. `continuance_engine.ts` + unit test (pemicu dari kanon).
2. `view_continuance.tsx` register + aksi gated + drill nav.
3. Registrasi icons/app + RELATED_SA + (opsional) seed keputusan ringkas + LINEAGE.
4. Gate hijau + verifikasi RBAC. PRD addendum + memory. Commit di branch baru.

## 11. Open Questions — **butuh keputusan Anda**

1. **Pendekatan: A / B / C?** → Rekomendasi **A** (modul fokus di slot FPM).
2. **Sumber keputusan keberlanjutan:** seed ringkas 8 klien aktif, atau derive default dari pemicu + label "tertunda"? → Rekomendasi **derive + seed ringkas** beberapa agar bermakna.
3. **Otoritas keputusan:** persetujuan final `FIRM_ADMIN` saja, atau partner-of-record? → Rekomendasi **FIRM_ADMIN** (konsisten onboarding).
4. **Penamaan modul id:** `continuance` vs `keberlanjutan`? (hindari tabrakan `sustain`).

---

## 12. Addendum — Implementasi (2026-06-25, Opsi A)

Sign-off "Proceed." (Opsi A) diberikan 2026-06-25. Terpasang:
- **`continuance_engine.ts`** (murni, bebas-any, 10 test): `continuanceFlags(clients, independence, invoices, decisions, refYear)` → per klien aktif: pemicu (rotasi AP, konflik, risiko High, PIE, fee tertunggak, asosiasi panjang) + level perhatian + keputusan ter-merge. Hanya `status==='Active'` (proposal = domain onboarding).
- **`view_continuance.tsx`**: register portofolio + panel detail/keputusan. Gate: lihat `ENGAGEMENT_VIEW_ALL`, putuskan `FIRM_ADMIN`. Tindak lanjut drill → `onboarding`/`pppk`/`governance`. Keputusan persist firm-scope (`continuanceDecisions`), seed ringkas 2 klien.
- Registrasi: item di akhir grup `Firm Practice Management` (icons), `RELATED_SA.continuance = {SA 220, ISQM 1}`, route `viewFor`.
- **Keputusan desain:** modul ini sengaja **continuance-only**; penerimaan klien-baru/PMPJ/Letter tetap milik `onboarding` (di-link, tak diduplikasi).
- **Gate:** typecheck 0 · lint bersih · 191 test. Boot UI bersih (login render, nol error konsol); click-through Partner terhalang auth wall.
- Cabang `feat/continuance-register-isqm` (off master, independen dari PR #25).

**Sign-off:** **"Proceed."** (Opsi A) — DONE.
