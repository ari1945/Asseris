# PRD — Intake oleh Manager: gate dokumen `prospects` (FIRM_ADMIN → ENGAGEMENT_MANAGE)

**Status:** DRAFT — menunggu sign-off ("Proceed.")
**Branch:** `prospects-intake-rbac` (off master pasca-merge PR#20)
**Asal:** temuan terpisah saat **SA-01** (PR#20) — di-flag, kini ditindaklanjuti.

---

## 1. Problem
State `prospects` ber-**scope firm**; `capForWrite('firm','prospects')` (SSOT `migration/src/rbac.ts`, dipakai server & klien) mengembalikan **FIRM_ADMIN** (karena key ≠ `clients`/`engagements`). Akibat: **hanya Engagement Partner** (satu-satunya pemilik FIRM_ADMIN) bisa **menulis** doc prospects.

Dampak: **Audit Manager** — yang dalam praktik mengerjakan intake/penerimaan — **tak bisa** data-entry prospek (tambah prospek, skor faktor akseptasi SA 220, draf surat). Tulisan non-Partner **ditolak server diam-diam** (flush-catch). Inkonsistensi: Manager punya `ENGAGEMENT_MANAGE` (kelola roster klien/perikatan) tapi tak bisa intake prospek.

## 2. Objective
Izinkan **Partner + Manager** menyunting data intake prospek, sambil **mempertahankan keputusan otoritatif** (persetujuan akseptasi & penerbitan surat) sebagai **Partner-only** — yang sudah di-gate sisi-klien `can(FIRM_ADMIN)` di PR#20.

## 3. Perubahan (inti)
Satu baris SSOT `capForWrite` (migration/src/rbac.ts) — tambah `prospects` ke cabang roster:
```
key === 'clients' || key === 'engagements' || key === 'prospects' ? ENGAGEMENT_MANAGE : FIRM_ADMIN
```
Karena server (`server/src/rbac.ts`) **re-export** SSOT ini, satu perubahan menggeser gate **klien & server** bersamaan.

**Hasil per peran:**
- **Partner** (FIRM_ADMIN ⊇ ENGAGEMENT_MANAGE): sunting + setujui/terbitkan. ✓
- **Manager** (ENGAGEMENT_MANAGE, tanpa FIRM_ADMIN): **sunting intake** ✓; tombol Setujui/Terbitkan **disabled** (gate klien PR#20). ✓ — persis "Manager intake, Partner approve".
- **Senior/Junior** (tanpa ENGAGEMENT_MANAGE): tak bisa tulis prospects (intake = Partner+Manager). Wajar.

## 4. Trade-off keamanan (KEPUTUSAN KUNCI)
Server menegakkan di **granularitas DOKUMEN** (satu doc per key). Dengan perubahan ini, server **tak lagi** menegakkan "hanya Partner yang menyetujui" — Manager (punya ENGAGEMENT_MANAGE) **secara teknis** bisa membuat `state.set` langsung yang menyetel `approved:true`.

**Ini SESUAI pola yang DIDOKUMENTASIKAN kode** (komentar `capForWrite`): *"finer intra-doc gating — mis. opinion sign-off di dalam wpState — adalah tugas UI via can(), dan endpoint lebih halus di masa depan."* Integritas persetujuan bertumpu pada: (a) gate klien `can(FIRM_ADMIN)` (PR#20), (b) **audit-trail append-only** yang merekam `by` = nama penyetuju (PR#20) → Manager yang menyetujui akan **terekspos**, bukan tersembunyi.

→ **Opsi A (default):** terima trade-off (konsisten pola codebase; cukup untuk alat internal). **Opsi B:** pisahkan persist prospects jadi data-editable (ENGAGEMENT_MANAGE) + state-persetujuan (FIRM_ADMIN) pada key/scope berbeda → persetujuan **ditegakkan server**. Lebih benar, **jauh lebih besar** (restrukturisasi persist + view). Lihat Open Q1.

## 5. Scope
- `migration/src/rbac.ts` `capForWrite` — 1 baris.
- Uji authz server (`server/src/__tests__/authz.test.ts`): Manager **boleh** tulis `prospects`; Senior/Junior **ditolak**; `rbacConfig`/firm-admin keys tetap FIRM_ADMIN (tak bocor).

## 6. Non-Scope
- Opsi B (split persist) — kecuali Anda minta penegakan server.
- Gate klien PR#20 (akseptasi/surat) — tak disentuh.
- Pemisahan Senior boleh-intake (tetap Partner+Manager).

## 7. Risks & Mitigasi
- **Persetujuan tak ditegakkan server** (Opsi A) → mitigasi: gate klien + trail ber-jejak; flag eksplisit. Bila tak diterima → Opsi B.
- **Regресi gate lain** → uji memastikan hanya `prospects` bergeser; `rbacConfig` dll tetap FIRM_ADMIN.
- **Tak ada efek data-migrasi** (hanya kapabilitas, bukan key).

## 8. Implementation Plan
1. Ubah `capForWrite` (+ komentar sumber/alasan). 
2. Tambah uji authz (Manager allow / Senior+Junior deny / firm-admin keys tetap deny utk Manager).
3. Gate: `npm run typecheck` (migration) + server `npm test` (vitest authz) + lint. Verifikasi: login Manager → intake bisa, tombol Setujui tetap disabled.

## 9. Open Questions (default bila tak dijawab)
1. **Opsi A vs B:** **A** — gate dokumen ENGAGEMENT_MANAGE + persetujuan via klien `can()` + trail *(default; konsisten pola codebase, kecil)*; **B** — split persist agar persetujuan ditegakkan server *(lebih aman, besar)*. *(Default: A.)*
2. **Level intake:** Partner+Manager saja *(default)* atau sertakan Senior? *(Default: Partner+Manager.)*

---
**Keputusan diminta:** "Proceed." (default A) untuk mulai, atau pilih Opsi B / koreksi. Setelah ini, daftar gap auditor + tindak-lanjutnya tertutup.
