# PRD — Mutu Firma: Evaluasi Tahunan SOQM (Q-01) + Independensi & Rotasi (Q-03)

> Status: **DRAFT — menunggu sign-off ("Proceed.")**. Dokumen ini *merancang*, belum *membangun*.
> Stream: track "Mutu firma" dari [[asseris-gap-matrix-eval]] (lanjutan quick-win commit `138d7d6`).
> Acuan gap: `Asseris - Matriks Gap SAK SPAP ISQM.xlsx` temuan **Q-01 (ISQM 1)** & **Q-03 (ISQM 1 / Kode Etik IAPI)** — keduanya severitas **Tinggi**.
> Sifat artefak: **level FIRMA** (bukan engagement-WP) → TIDAK memakai `wpState`/`WP_MODULE_MAP`; memakai `useAmsPersist` (server-backed pasca-W6), pola sama `soqmRisks`.

---

## 1. Problem

**Q-01 (SOQM, ISQM 1).** Modul `soqm` (`view_isqm.tsx`, 373 baris) sebetulnya **sudah matang**: register risiko mutu + status remediasi persist via `useAmsPersist('soqmRisks')`, keluhan via `complaints.v2`, 8 tab (tujuan, register, pemantauan, remediasi, info-komunikasi, keluhan, **evaluasi tahunan**, lineage). **Gap nyata menyempit** ke artefak puncak ISQM 1 yang justru wajib & belum ber-jejak:
- **Evaluasi SPM tahunan (ISQM 1 ¶53–54)** — kesimpulan pimpinan firma bahwa SOQM memberikan keyakinan memadai. Tab `evaluation` (`SoqmAnnualEval`) **display-only, persist=0**; tombol "Evaluasi SOQM Tahunan" (`view_isqm.tsx:73`) **stub**. Tak ada kesimpulan tersimpan + tanda tangan + tanggal.
- **Root-cause (RCA) defisiensi (¶41)** — state `openRca` **lokal/ephemeral**, hilang saat reload.

> Koreksi atas matriks: klaim "persist 8 komponen ISQM 1 dari nol" **overstated** — mayoritas sudah persist. Yang kurang = lapisan **kesimpulan + sign-off pimpinan** atas evaluasi tahunan & RCA.

**Q-03 (Independensi & Rotasi).** Modul `independence` + tab `view_independence_parts.tsx` (FeeDependency/IESBA 410, NAS pre-approval/IESBA 600, LongAssociation/IESBA 540) **kaya tapi 100% display dari seed statis**. Data model bagus sudah ada (`INDEPENDENCE` per-orang: `declared/conflicts/finInterest/rotationClient/tenure/rotationLimit/cooloff/listed`; `PPPK_ROTATION` per AP-klien: `tenure/limit/status/basis/next`). **Tak ada yang tersimpan:**
- **Deklarasi independensi periodik** — `declared` hanya bool seed; auditor tak bisa mencatat & menandatangani deklarasi per periode (FY).
- **Register ancaman & pengamanan** (threats/safeguards) — `safeguard` string statis; tak bisa ditambah/diedit/disetujui.
- **Pelacakan rotasi & cooling-off** — `PPPK_ROTATION` statis; tak ada akui/tindak-lanjut + persetujuan partner.

Kritis: **Ari adalah AP penandatangan** — kelemahan dokumentasi independensi = risiko inspeksi P2PK langsung mengenai dirinya.

## 2. Objective

Jadikan dua artefak mutu firma **auditable**: tersimpan, ber-tanggal, bertanda tangan otoritas yang tepat — **memakai ulang** display & data yang sudah ada, **menambah** lapisan persist + atestasi, bukan membangun ulang.

## 3. Success Criteria

- **Q-01:** Evaluasi SPM tahunan punya **kesimpulan editable + sign-off pimpinan** (`{ conclusion, basis, by, at, period }`) yang persist & bertahan reload; tombol stub jadi nyata. RCA per defisiensi persist (`{ rootCause, action, by, at }`).
- **Q-03:** (a) deklarasi independensi per-orang per-periode dapat di-set & ditandatangani (persist); (b) register threats/safeguards bisa tambah/edit + persetujuan partner (persist); (c) status rotasi/cooling-off dapat diakui + tindak-lanjut ber-jejak (persist).
- **Atestasi** memakai komponen firm-level bersama (`by`/`at`/`role`), konsisten lock-LUNAK (boleh buka kembali sebelum dikunci).
- Gate teknis: `typecheck` + `lint` (ratchet `no-explicit-any` utuh, **0 `:any` baru**) + **82/82 vitest** hijau; canon tak tersentuh; 0 error konsol saat boot.
- Verifikasi alur live bila kredensial dev tersedia (`dev:all` + seed) — kalau tidak, gate statis + boot bersih (sesuai batasan auth W7+TOTP).

## 4. Scope

- **Q-01:** perluas `soqm` — tab `evaluation` (kesimpulan + sign-off pimpinan, period-stamped) + persist RCA. Wire tombol "Evaluasi SOQM Tahunan".
- **Q-03:** perluas `independence`/`ethics` — persist deklarasi periodik, register threats/safeguards, akui rotasi/cooling-off + persetujuan partner.
- **Komponen bersama baru** `FirmAttest`/`useFirmAttest` (atestasi level-firma) di file util mutu — dipakai kedua modul.
- Reuse penuh: `INDEPENDENCE`, `PPPK_ROTATION`, `FEE_DEPENDENCY`, `NAS_PREAPPROVAL`, `LONG_ASSOCIATION`, `SOQM_RISKS`, `SoqmAnnualEval`, `useAmsPersist`, primitif `ui.tsx`, RBAC `CAP.*`.

## 5. Non-Scope

- Membangun ulang register risiko mutu / remediasi / pemantauan (sudah persist).
- Otomasi penjadwalan rotasi ke Google Calendar (deadline kepatuhan kritis-waktu = jalur Calendar terpisah; bisa fase lanjutan).
- Multi-tenant per-firma (di luar arsitektur; lihat W7.5).
- Integrasi e-reporting PPPK nyata (PPPK_HISTORY tetap rekam display).
- Saran AI atas kesimpulan evaluasi (jalur W8/P4).

## 6. Constraints

- ESM-only, edit `migration/src/*`; aturan emas anti-tabrakan (alias hook unik, ekspor, `app.jsx` terakhir).
- Persist via `useAmsPersist` (server-backed W6) — **bukan** `wpState` (itu engagement-scoped; ini firma-scoped).
- Angka dari data/canon (SSOT) — atestasi **berdampingan**, tak menimpa angka.
- Ratchet `no-explicit-any`: helper baru ditulis **bertipe penuh**.
- **PRD dulu sebelum implementasi.**

## 7. Existing Solutions / yang dipakai ulang

- `useAmsPersist('soqmRisks'…)` sudah membuktikan pola persist firm-level → tiru untuk evaluasi/deklarasi/threats.
- `SoqmAnnualEval` (view_isqm_deep.tsx) — kerangka tampilan evaluasi tahunan sudah ada → tambah kesimpulan+sign-off.
- Pola sign-off: `OpinionSignoff` (3-tingkat), `EQRWorkflow.clearGate`, `useWpSignoff` — referensi bentuk `{ by, at }` + lock LUNAK; **diabstraksi** jadi `useFirmAttest` agar tak menyalin.
- Data model independensi/rotasi/fee/NAS sudah lengkap — hanya butuh lapisan tulis.

## 8. Proposed Approach

1. **Util mutu bersama** `firm_quality.tsx` (atau extend `wp_signoff.tsx`): `useFirmAttest(key)` → persist `{ chain:{owner,partner}, conclusion, period, history[] }` via `useAmsPersist`; komponen `FirmAttestCard` (sign/unsign + kesimpulan + period). RBAC-gated (otoritas yang sesuai).
2. **Q-01 — Evaluasi Tahunan SOQM:** tab `evaluation` render `FirmAttestCard` key `soqmAnnualEval.<FY>`: kesimpulan pimpinan + dasar + sign-off + period. Tombol header memicu/membuka tab. RCA: persist `soqmRca.<riskId>` `{ rootCause, action, by, at }`.
3. **Q-03 — Independensi:**
   - **Deklarasi periodik:** persist `indepDecl.<FY>` map per-`EMP-id` `{ declared, conflicts, note, by, at }`; tombol "Tandatangani deklarasi" per orang (self) + lencana belum/sudah.
   - **Register threats/safeguards:** persist `indepThreats` array `{ id, person, client, threatType, severity, safeguard, status, approvedBy, at }`; tambah/edit + persetujuan partner.
   - **Rotasi & cooling-off:** persist `rotationAck` per `PPPK_ROTATION` baris `{ ack, action, by, at }` — akui status "Wajib Rotasi"/"Tahun Terakhir" + catat tindak-lanjut + persetujuan.
4. **Tautan silang (ringan):** pelanggaran independensi terbuka / rotasi lewat-batas → surfaced sebagai indikator di SOQM register (sumber risiko mutu) & acceptance — read-only link, bukan duplikasi.

## 9. Risks

- **Otoritas sign-off salah model** → mitigasi: petakan ke RBAC `CAP.*` yang ada; tegaskan di Open Questions sebelum build.
- **Period model membingungkan** (deklarasi lintas-tahun) → mitigasi: stamp `period` (FY) eksplisit + simpan `history[]`; tampilkan periode aktif.
- **Scope sprawl Q-03** (3 sub-fitur) → mitigasi: fase bertahap, deklarasi dulu (paling kritis utk Ari), lalu threats, lalu rotasi.
- **Verifikasi live terhalang auth** → mitigasi: gate statis penuh + boot bersih; tandai eksplisit bila smoke UI tak dijalankan.

## 10. Implementation Plan (bertahap)

- **Fase 0:** `useFirmAttest`/`FirmAttestCard` bertipe + RBAC gate + unit-test ringan.
- **Fase 1 (Q-01):** evaluasi tahunan SOQM persist + sign-off + RCA persist + wire tombol. Gate + verifikasi.
- **Fase 2 (Q-03a):** deklarasi independensi periodik per-orang + sign. Gate + verifikasi.
- **Fase 3 (Q-03b/c):** register threats/safeguards + rotasi/cooling-off akui & persetujuan. Tautan silang ringan.
- Tiap fase: `typecheck`/`lint`/`test` + (bila bisa) smoke + commit + update memory [[asseris-gap-matrix-eval]].

## 11. Open Questions (perlu keputusan Anda sebelum "Proceed.")

1. **Otoritas sign-off mutu firma** — siapa menandatangani **evaluasi tahunan SOQM** (ISQM 1 ¶20: individu yang ditugaskan tanggung jawab akhir SOQM = Managing Partner)? Dan **deklarasi independensi**: self-declare per orang + **persetujuan partner**, atau cukup self? *(rekomendasi: evaluasi SOQM = otoritas tunggal "pimpinan SOQM"; deklarasi = self-sign + partner approve untuk yang ber-konflik. Petakan ke RBAC yang ada.)*
2. **Model periode** — current-FY saja, atau simpan riwayat antar-tahun? *(rekomendasi: current + append `history[]`.)*
3. **Konfirmasi penyempitan Q-01** — setuju gap Q-01 = (evaluasi tahunan + sign-off + RCA persist), BUKAN bangun-ulang 8 komponen (yang sudah persist via `soqmRisks`)? *(rekomendasi: ya.)*
4. **Urutan Q-03** — mulai dari deklarasi periodik (paling kritis untuk Anda sbg penandatangan), setuju? *(rekomendasi: ya.)*
5. **Tautan ke Calendar** — penjadwalan reminder rotasi/cooling-off ke Google Calendar masuk fase ini atau ditunda? *(rekomendasi: tunda — jalur Calendar terpisah; fase ini cukup register + jejak in-app.)*
