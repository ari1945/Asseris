---
name: asseris-continuance-isqm
description: Modul Keberlanjutan Klien (ISQM 1 ¶33-34 / SA 220) — register continuance portofolio aktif
metadata: 
  node_type: memory
  type: project
  originSessionId: 023ccf1e-116b-4332-b38e-b12e3ff039d1
---

SELESAI 2026-06-25 (PRD-first Opsi A, [Asseris#26](https://github.com/ari1945/Asseris/pull/26), branch `feat/continuance-register-isqm` off master). Gate hijau: typecheck 0, lint bersih, 191 test (10 baru).

**Pushback yang menghemat duplikasi (penting):** permintaan "Penerimaan & Keberlanjutan Klien" — tapi grep dulu menemukan **penerimaan klien-baru SUDAH ADA** di modul `onboarding` (gerbang Akseptasi→PMPJ→Engagement Letter SA 210→Konversi, prospek-centric atas `PROSPECTS`) + ISQM komponen **C4** "Penerimaan & Keberlanjutan" (`QM_COMPONENTS` data_part4). Gap NYATA = pengawasan **keberlanjutan menyeluruh atas klien AKTIF** (onboarding tak menutup ini). Jadi modul dibatasi **continuance-only**; penerimaan/PMPJ/Letter/rotasi di-`nav` (tak diduplikasi) — hormati aturan anti-duplikasi KERAS.

**Bangunan:**
- `continuance_engine.ts` (murni, bebas-any, 10 test): `continuanceFlags(clients, independence, invoices, decisions, refYear)` → per klien `status==='Active'` (proposal dikecualikan = domain onboarding): pemicu dari kanon — rotasi AP (INDEPENDENCE `rotationClient`==nama klien, tenur vs `rotationLimit`: > = high terlampaui, == = high jatuh-tempo, ==lim-1 = med), konflik (`conflicts>0`), risiko High, PIE (`listed`), fee tertunggak (INVOICES status Overdue per clientId), asosiasi panjang (refYear-since≥8). Level perhatian Tinggi/Sedang/Rendah + keputusan ter-merge. REF_YEAR=2026.
- `view_continuance.tsx`: register + panel keputusan. Gate lihat `ENGAGEMENT_VIEW_ALL`, putuskan `FIRM_ADMIN`. Keputusan persist firm-scope key `continuanceDecisions` (useAmsPersist default firm), seed `CONTINUANCE_SEED` 2 klien. Drill → onboarding/pppk/governance.
- Registrasi: item akhir grup Firm Practice Management (icons), `RELATED_SA.continuance={SA 220, ISQM 1}`, route `viewFor` app.tsx + import.

**Gotcha:**
- **View .tsx BARU wajib bebas-`any`**: `no-explicit-any:error` di SEMUA .tsx, file baru tak ada di `eslint-suppressions.json` → tiap `:any` baru gagal. Solusi: tanpa input teks (hindari param event yg butuh `(e:any)`), tombol-only; updater `(prev: Record<string,StoredDecision>)` ber-tipe; nilai dari hook untyped (`useFirm/useAuth/useAmsPersist`) = inferred-any (BUKAN explicit-any, lolos). [[asseris-test-coverage]]
- Branch off master (independen #25); item ditaruh di AKHIR grup FPM agar tak bentrok merge dgn relokasi RoMM #25. Slot FPM "kosong" terisi setelah kedua PR merge.
- Verifikasi live terhalang auth wall (boot bersih saja). Slot FPM yg ditinggalkan RoMM ([[asseris-risk-relocation-portfolio]]) kini terisi modul ini.
