---
name: asseris-firm-people-gap-matrix
description: "Evaluasi matriks gap 5 modul FIRM People & Compliance (CPE/Pelatihan, Kode Etik, Rotasi, Sanksi) + remediasi"
metadata: 
  node_type: memory
  type: project
  originSessionId: 463fd3c4-b15c-4799-baa3-b8ef896bf95a
---

Matriks gap 5-baris (People & Compliance, level FIRM) dievaluasi 2026-07-01 dengan verifikasi kode langsung (bukan percaya matriks — pola [[asseris-gap-matrix-eval]]: klaim matriks kerap salah). Verdict:

- **#1 Pelatihan→CPE auto-update** = **GAP NYATA.** `TRAINING_CATALOG` (data_people.ts:177) hanya agregat (`enrolled` angka, tak ada roster per-pegawai); `CPE_LOG` (data_part1.ts:284) seed statis manual, nol link programatik.
- **#2 CPE Tracker manual** = GAP NYATA (akar sama #1). `pplOf` (data_licensing.ts:39) = CPE_LOG + `cpeExtra` manual.
- **#3 Kode Etik/AML mandatory sign-off + blokir akses** = **GAP NYATA.** `view_pc_conduct.tsx` EthicsDeclaration cuma catat/tampil `ETHICS_DECL`; NOL guard akses (dicek rbac.ts CAP, engagement_entry_gate.ts, server middleware — semua kosong syarat etik).
- **#4 Rotasi tidak auto-alert** = **SEBAGIAN.** Ada visibilitas pasif (badge/kartu), tapi ambang lama `tenure>=limit-1` (~1th), banner cuma saat `due`, nol alert proaktif 6-bulan. → **DIKERJAKAN (lihat bawah).**
- **#5 Sanksi & Disiplin "terisolasi"** = **SALAH literal** (sudah punya dock LINEAGE ke 6 modul via app.tsx:459-460), tapi gap sempit nyata: tak ada link ke `cpe`, semua cuma dock UI (bukan sync data). → **DIKERJAKAN sebagian (dock, bukan sync).**

**PRD:** `PRD - Remediasi Gap Matriks Kepatuhan FIRM.md` (root). Open Questions dijawab (AskUserQuestion 2026-07-01): #3 blokir=**sign-off WP + approval opini** (sempit); #3 override=**Partner/FIRM_ADMIN saja, ter-log**; #1/#2 pemicu CPE=**Admin/HR konfirmasi kehadiran** → kredit.

**Ari `Proceed #4 dan #5` (2026-07-01, model opus). SELESAI:**
- **#4:** SSOT baru `export function rotTier(t,limit)` + `type RotTier` di `data_licensing.ts` (4-level: due≥limit · alert≥limit-0.5 (≤6bln) · warn≥limit-1 · ok), dipakai di apLicenses + expose `LICENSING.rotTier`. `summary()` +`rotAlert`. Banner peringatan-dini AMBER proaktif (distinct dari banner due merah) + badge 3-tingkat di `view_dashboard2.tsx` (DashMutu) & `view_people.tsx` (Independence). `view_bo3.tsx` rotFlag+rotCol+panel drill handle 'alert'. **Seed demonstrable:** +partner `EMP-004 Lestari Handayani` (data_part1.ts INDEPENDENCE, sektorJK, limit 3, tenure 2.5 → band alert; POJK 13/2017). Snapshot canon TIDAK enumerasi INDEPENDENCE → aman.
- **#5:** `LINEAGE.hrcase` (related_modules_data2.ts) +`cpe` di up (PPL shortfall→perkara kompetensi) & down (sanksi→target PPL remedial). `RELATED_SA.hrcase` (icons.tsx) baru = [ISQM 1, Kode Etik] (pola non-SA seperti `continuance`). **Sync data fungsional TIDAK dikerjakan** (Open Question #5 — keputusan kebijakan SDM).

**Gate hijau:** typecheck 0, lint 0 (**tanpa ubah baseline** — hindari `:any` baru via `(IND as RotRow[])` cast + param `{rotState:string}`), 358 vitest. **Live-verified role Partner (hartono.w/Partner#2025!):** Dashboard Mutu → Lestari "≤6 BLN" + banner "Peringatan dini rotasi: Lestari…"; `LICENSING.rotTier(2.5,3)='alert'`, `(5,5)='due'`. LINEAGE.hrcase cpe up+down + RELATED_SA.hrcase loaded.

**GOTCHA ratchet no-explicit-any:** menambah `:any` baru ke file view mendorong count > baseline → ESLint bulk-suppression meng-UN-suppress SELURUH file (154 err semu). File .tsx BARU wajib bebas-any; edit file view any-heavy → baseline bump OK (tim kelola per-PR). **Script `lint:any-baseline` RUSAK** (`--suppress-rule` + `--prune-suppressions` tak boleh bareng) → jalankan `npx eslint src --suppress-rule "@typescript-eslint/no-explicit-any"` saja. GOTCHA login: `preview_fill` React controlled input tak teregister → set via native value-setter + dispatch `input` event lalu `form.requestSubmit()`; logout via `fetch('/trpc/auth.logout?batch=1',{method:POST,body:{"0":{json:null}}})` (sesi=httpOnly cookie, localStorage.clear tak cukup). Nav: `localStorage['ams.route']='<id>'` + reload. `preview_screenshot` sering timeout → verify via `preview_eval` body.innerText/innerHTML. Popover buka async → klik & inspeksi di panggilan TERPISAH.

**Ari `Proceed #1, #2, dan #3` (2026-07-01, opus). SELESAI + live-verified:**
- **#1/#2 (CPE auto-sync dari pelatihan):** modul murni baru `cpe_training.ts` (`cpeFromTraining(catalog,attendance)` bebas-any) + uji `cpe_training.test.ts`. Learning view (`view_pc_talent`) tab baru **"Kehadiran & SKP"** = matriks staf×pelatihan, admin/HR (ENGAGEMENT_MANAGE) konfirmasi kehadiran → tulis `trainingAttendance.v1` (firm-scope). CPETracker (`view_people`) & `pplOf` (`data_licensing`) merge kredit training + badge "Pelatihan". `rbac.ts`: `trainingAttendance.v1`→ENGAGEMENT_MANAGE (Partner+Manager, bukan FIRM_ADMIN). **Live (Hartono):** konfirmasi TR-05 ISQM u/ Dimas → CPE Dimas struktur 6→12, total 12→18, badge Pelatihan; persist server.
- **#3 (gerbang etik/AML + override):** logika murni `ethics_compliance.ts` (`resolveEmpId` via email SSOT STAFF, `ethicsComplianceOf`) + uji `ethics_compliance.test.ts`; hook `ethics_gate.tsx` (`useEthicsGate`/`useEthicsOverrides`). Blokir sign-off WP (`wp_signoff` WpSignoff: banner + disable) + finalisasi opini (`view_opinion_parts` canFinalize + pesan). Override Partner ter-log di `EthicsDeclaration` panel "Gerbang Sign-off" (`ethicsOverride.v1` firm-scope→FIRM_ADMIN). **PENTING: blokir = LAPISAN UI** (data deklarasi=seed klien); penegakan server = follow-up. **Live:** Sinta (EMP-022, unsigned) → 2 tombol sign-off DISABLED + banner; Partner beri pengecualian (log "Hartono·01 Jul 2026") → Sinta preparer sign-off ENABLED, banner hilang; override persist lintas sesi.
- **Seed:** +login **Sinta Wulandari** `sinta.w@whr-cpa.id`/`Sinta#2025!` (Senior, EMP-022 unsigned) di `server/src/seed.ts` → **reseed wajib** (`npm run seed`, 5 users).
- **Gate:** typecheck 0 (client+server), lint 0 (baseline bump: view_pc_talent +13, view_pc_conduct +3, wp_signoff +1; new files any-free), **370 migration + 154 server** vitest hijau.
- **COMMITTED `d92c353`** (branch `feat/w9-coretax-connector`, 20 file +607/−22, belum push) — SELURUH #1–#5 satu commit. SENGAJA TAK disertakan: pekerjaan pra-sesi uncommitted (contexts.tsx, view_confirm.tsx/SA505, canon_regression snapshot, 3 PRD lain) — masih di working tree utk penanganan terpisah. eslint-suppressions.json disertakan (termasuk view_confirm +12 pra-sesi, aman krn count≥actual).
