# PRD — Penegakan Sign-off Berbasis Peran (Dua-Lapis)

> Wajib diisi sebelum implementasi. Implementasi TIDAK dimulai sebelum sign-off ("Proceed.").

| Field | Isi |
|---|---|
| Tanggal | 2026-06-24 |
| Pemilik | Ari Widodo |
| Status | Draft |
| Engagement ID terkait | Asseris (NeoSuite AMS) — platform, lintas-engagement |
| Sumber temuan | QC UI/UX walkthrough + audit kode 2026-06-24 (4 peran, live). Memory: `asseris-opinion-signoff-sod-defect`. Tasks: `task_f882b8db`, `task_5cf98877`. |

---

## 1. Problem

Aksi **otoritatif intra-dokumen** (tanda tangan reviu, penerbitan opini, penutupan catatan reviu) di Asseris **tidak terikat pada peran/identitas** pelakunya. Penegakan otoritas diserahkan ke UI lewat `can()` (rbac.ts:64–67: *"intra-doc gating … is the UI's job … and a future finer endpoint"*), tetapi beberapa surface kunci **melewatkan cek `can()`** dan hanya mengandalkan **urutan/kelengkapan**. Di sisi server, `capForWrite` bersifat **granular per-dokumen**, sehingga sign-off yang hidup di dalam `wpState`/`opinionDoc.v1`/`reviewNotes` hanya butuh `WP_EDIT` — kapabilitas yang **dimiliki semua peran**. Akibatnya bawahan dapat memalsukan kontrol yang menjadi inti nilai produk.

**Bukti (live-verified, 4 peran seed):**
1. **Tanda tangan opini per-slot** (`OpinionSignoff.sign`, view_opinion_parts.tsx:493/561): tanpa `can()`; tombol `disabled={!prevDone && !done}` (urutan saja); merekam `by:` = **nama slot hardcode** (impersonasi). Junior menandatangani slot Manajer; Manager menandatangani slot Partner; tertulis ke server (`state.set`→200, `version`↑) & bertahan reload. `can(OPINION_APPROVE)` hanya menggate tombol Finalisasi akhir.
2. **Sign-off kertas kerja BERSAMA** (`WpSignoff`/`useWpSignoff.sign`, wp_signoff.tsx:157/232): dipakai **~38 WP**; reviewer-signoff tanpa `can()`; tombol `canSign={!!preparer}`. Memberi makan **gerbang Arsip** (`engagementGate` butuh `recap.signed===total`) + metrik Cockpit "WP ter-review".
3. **Penutupan catatan reviu** (`resolveReviewNote`, contexts.tsx:354): toggle open↔resolved tanpa cek peran. Junior dapat menutup catatan high-priority milik Partner/EQR → membersihkan blocker gerbang (→Finalisasi: 0 high-open; →Arsip: 0 open). (`addReviewNote` juga hardcode `author:'Anindya P.'`.)

**Kapabilitas yatim:** `CAP.SIGNOFF_REVIEWER` (diberikan Partner+Manager, rbac.ts:52–53) **didefinisikan tetapi tidak pernah dicek** di seluruh repo — cap yang dirancang persis untuk sign-off reviewer.

**Mengapa serius:** Asseris menjual *assurance*. Rantai sign-off berjenjang (SA 220 / ISQM 2) dan gerbang lifecycle adalah kontrol segregation-of-duties. Jika bawahan dapat memalsukannya — dan palsu itu **menembus ke system of record** — nilai evidensial seluruh berkas audit runtuh, dan sinyal "siap diarsipkan" menjadi tak dapat dipercaya.

## 2. Objective

Setiap aksi otoritatif terikat pada **peran/identitas** pelakunya di **dua lapis** (UI menutup jalur normal; server menutup jalur request yang dimodifikasi), dengan **pola seragam tunggal** yang dapat diaudit. Sinyal kelengkapan/gerbang menjadi tepercaya. Filosofi *lock-lunak* untuk peran yang sah dipertahankan.

## 3. Success Criteria

Terukur, diverifikasi live per-peran (Junior/Senior/Manager/Partner) + uji otomatis:
1. **UI:** Junior & Senior **tidak dapat** (tombol disabled + label "menunggu otoritas berwenang"): reviewer-signoff WP, menandatangani slot reviu opini manapun, menutup catatan reviu yang bukan haknya. Manager/Partner dapat sesuai kewenangan slot.
2. **Server:** request `state.set` yang ditujukan menulis `wpState.chain.reviewer`, `opinionDoc.signoff/finalized`, atau menutup `reviewNotes` milik orang lain **ditolak (FORBIDDEN)** untuk peran tanpa kapabilitas — diuji via test integrasi server (bukan hanya UI).
3. **Identitas:** tanda tangan opini merekam **penanda tangan sebenarnya** (dari sesi), dan ditolak bila identitas/peran ≠ pemilik slot (tidak ada impersonasi nama hardcode).
4. **`SIGNOFF_REVIEWER` aktif** (dipakai ≥1 cek `can()`) dan kapabilitas EQR terdefinisi (lihat Open Q).
5. **Pola tunggal:** satu util gating bersama dipakai oleh `WpSignoff` + `OpinionSignoff` (dan diselaraskan dgn `FirmAttestCard`).
6. **Nol regresi:** `npm run lint`/`typecheck`/`test` hijau; angka canon identik (fingerprint vitest); jejak audit hash-chained mencatat **aktor + slot/role** (bukan hanya key+version).

## 4. Scope

- **Lapis UI:** `wp_signoff.tsx` (`WpSignoff`/`useWpSignoff`), `view_opinion_parts.tsx` (`OpinionSignoff`), penutupan/`resolveReviewNote` di konsumennya (cockpit/review-notes/mytasks). Ekstraksi util gating bersama dari semantik `FirmAttestCard`.
- **Lapis server:** penegakan per-slot/per-aksi untuk tulisan otoritatif di `wpState.chain.*`, `opinionDoc.signoff/finalized`, dan resolusi `reviewNotes` — via mutasi terdedikasi atau validator intra-dokumen (lihat §8). `server/src/rbac.ts` + router `state`.
- **RBAC map:** aktifkan `SIGNOFF_REVIEWER`; definisikan kapabilitas EQR (Open Q1).
- **Audit-trail:** perkaya `detail` agar menangkap semantik sign-off (slot+role), bukan sekadar key+version.

## 5. Non-Scope

- Re-arsitektur persistensi/StateDoc atau multi-tenancy per-firma.
- e-Meterai/PSrE legal (tetap di luar — segel W10.5 ≠ TTE tersertifikasi).
- Penggantian filosofi lock-lunak (override sah Partner tetap ada, ber-jejak).
- Pengetatan akseptasi/SA 210 dari `ENGAGEMENT_MANAGE`→`FIRM_ADMIN` di server (UI sudah benar `can(FIRM_ADMIN)`; defense-in-depth ini = item terpisah, prioritas lebih rendah — boleh diangkat di §11).
- Wiring penuh roster tim nyata untuk semua slot (bila besar, jadikan Open Q / fase lanjут).

## 6. Constraints

- **Pengembang solo**; jaga "nol-vendor / agent-executable" (tanpa dependency native baru).
- **Gate wajib hijau:** `lint` (no-undef/no-dupe-keys), `typecheck` (full strict, 0 error), `test` (canon fingerprint identik), `build`.
- **SSOT:** angka tetap dari `AMS_CANON`; tak ada hardcode baru.
- **rbac.ts = SSOT tunggal** diimpor UI + server — perubahan kapabilitas harus konsisten dua sisi.
- Kompatibilitas demo seed (akun 4 peran, ENG-2025-014) + tak memutus alur sah.

## 7. Existing Solutions

- **`firm_attest.tsx` `FirmAttestCard` (POLA RUJUKAN, sudah benar):** `allowed = can(role.cap)` + `disabled={!prevOk || !allowed || !hasConclusion}` + empty-state "menunggu otoritas yang berwenang". **Custom work = ekstrak & terapkan ulang pola ini**, bukan membangun framework baru.
- **Gate UI yang sudah benar (acuan):** AJE `can(AJE_EDIT)` + tombol disabled; akseptasi `can(FIRM_ADMIN)`; opini-finalisasi `can(OPINION_APPROVE)`.
- **Server `capForWrite` (ada, tapi terlalu kasar):** granular per-dokumen; perlu lapisan intra-dokumen yang kode sendiri sudah antisipasi ("a future finer endpoint").

## 8. Proposed Approach

**Lapis 1 — UI (tutup jalur normal; murah, dampak luas).**
1. Ekstrak util gating bersama (mis. `useSlotGate({ cap, needsPrev, locked, hasConclusion })`) dari semantik `FirmAttestCard`.
2. `WpSignoff`: baris **Reviewer** → `canSign = !!preparer && can(SIGNOFF_REVIEWER)`; Preparer tetap `WP_EDIT` (semua auditor). Label & disabled mengikuti pola rujukan.
3. `OpinionSignoff`: tiap slot di-gate cap perannya — `manager→SIGNOFF_REVIEWER`, `partner→OPINION_APPROVE`, `eqr→`CAP EQR (Open Q1). Rekam penanda tangan **dari sesi** (`auth.user`), bukan nama hardcode; tolak bila identitas/peran ≠ slot.
4. `resolveReviewNote`: penutupan **otoritatif** (terutama note `type:'review'/'eqr'` & high-priority) butuh `SIGNOFF_REVIEWER`; preparer boleh membalas/menandai "siap ditutup" (thread) tapi tak menutup note pihak lain. Authorship `addReviewNote` ikut identitas sesi.

**Lapis 2 — Server (tutup jalur request termodifikasi; PRD/kontrak lebih besar).**
- Opsi A — **mutasi terdedikasi**: `signWp`, `opinionSign`, `resolveNote` di router, masing-masing memvalidasi peran↔slot (mengonsumsi rbac SSOT). Paling eksplisit & paling auditable; ripple klien terbatas pada api.js + pemanggil.
- Opsi B — **validator intra-dokumen** pada `state.set`: hook per-key yang memeriksa delta (mis. menambah `chain.reviewer` butuh `SIGNOFF_REVIEWER`). Minim perubahan permukaan API, tapi logika diff lebih rumit & rapуh.
- **Rekomendasi: Opsi A** untuk surface bernilai tinggi (opini, WP-reviewer, resolve-note); pertahankan `capForWrite` untuk sisanya. (Keputusan final = Open Q3.)

**Audit-trail:** sertakan `{slot, role, actor}` di `detail` aksi sign-off (tetap metadata, bukan isi WP) agar reviu mutu bisa mendeteksi anomali peran.

## 9. Risks

- **Over-gating alur sah** (mis. EQR yang sebenarnya Partner-level, atau preparer multi-peran) → mitigasi: matriks slot→cap eksplisit + verifikasi live 4 peran sebelum merge.
- **Regресi lock-lunak / demo** → pertahankan override Partner ber-jejak; jalankan smoke 4 peran + reset-demo.
- **Ripple kontrak server (Opsi A)** → fase bertahap, satu surface per commit, gate hijau tiap langkah.
- **Identitas slot opini hardcode** → butuh sumber identitas (roster engagement). Bila roster belum ada pemetaan login→nama-slot, sediakan fallback aman (tolak, bukan izinkan).
- **Divergensi UI↔server** → satu-satunya pencegah: rbac.ts SSOT; tambahkan test yang menegaskan paritas.

## 10. Implementation Plan

- **Fase 0 — RBAC:** aktifkan `SIGNOFF_REVIEWER`; definisikan/own kapabilitas EQR; perbarui matriks GRANTS + komentar. Gate hijau.
- **Fase 1 — UI seragam:** ekstrak util gating; terapkan ke `WpSignoff`, `OpinionSignoff`, `resolveReviewNote`. Identitas sign opini dari sesi. Verifikasi live 4 peran (Junior/Senior TAK bisa; Manager/Partner bisa sesuai slot). (Menutup `task_f882b8db` + `task_5cf98877` di lapis UI.)
- **Fase 2 — Server (Opsi A):** mutasi `signWp`/`opinionSign`/`resolveNote` + validasi peran↔slot + test integrasi server (peran ditolak). Klien beralih ke mutasi baru; degrade anggun offline.
- **Fase 3 — Hardening & bukti:** audit-trail detail slot+role; uji otomatis paritas UI↔server; smoke ulang; dokumentasi BUILD.md + tutup memory defect.
- **(Opsional, §11)** Fase 4 — pengetatan server akseptasi/SA 210 `ENGAGEMENT_MANAGE`→`FIRM_ADMIN`.

## 11. Open Questions

1. **Kapabilitas EQR:** buat `CAP.EQR_REVIEW` baru (diberikan ke peran EQR/Partner) atau pakai ulang `SIGNOFF_REVIEWER`/`OPINION_APPROVE`? (EQR = Engagement Quality Reviewer, independen dari tim — idealnya cap & identitas sendiri.)
2. **Preparer multi-peran:** apakah preparer tetap boleh semua auditor (`WP_EDIT`)? (Asumsi: ya — preparer = penyusun, reviewer = otoritas.)
3. **Server: Opsi A (mutasi terdedikasi) vs Opsi B (validator `state.set`)?** Rekomendasi A; konfirmasi.
4. **Identitas slot opini:** ikat slot Manajer/Partner/EQR ke roster engagement nyata (login→peran) atau cukup cek peran sesi tanpa nama spesifik? (Mempengaruhi seberapa jauh impersonasi ditutup.)
5. **Pengetatan akseptasi/SA 210 server** (Non-Scope sekarang) — masukkan ke PRD ini atau PRD terpisah?

---
**Sign-off:** ditandai dengan balasan **"Proceed."**
