---
name: asseris-mytasks-integration
description: My Tasks ↔ Review Notes & WP Assignment integration + seed login Senior/Junior renamed (R1)
metadata: 
  node_type: memory
  type: project
  originSessionId: 561d2f91-75d6-4531-b942-3b4da9a26bc4
---

My Tasks (modul `tasks`, Engagement Workspace) diintegrasikan benar ke Review Notes & WP Assignment per-user. Temuan audit "🔴 TERISOLASI" SEBAGIAN salah: `mtSystemTasks` (view_mytasks_parts.tsx) SUDAH menyerap Review Notes/Catatan WP/AJE/WP/Deadline — tapi identitas di-**hardcode** `'Anindya P.'` di 2 tempat & sumber WP bukan assignment-aware.

**Perbaikan (commit `9709670` di branch feat/w9-coretax-connector, BELUM push/PR, 2026-06-26):**
1. **Normalizer identitas** `amsShortName(full)` + hook `useCurrentAuditor()` di `contexts.tsx` (diekspor ke window+ESM): nama sesi LENGKAP ('Anindya Pramesti') → SINGKAT ('Anindya P.') untuk filter "milik saya". Idempoten, strip gelar (", CPA"). Param `unknown` (bukan any) — fondasi tetap bersih.
2. **WP assignment-aware**: ganti heuristik `reviewer==='—'||In Progress` jadi 2 aliran — **Siapkan WP** (`preparer===me && status!==Reviewed`) & **Reviu WP** (`reviewer===me && status==='In Review'`). Sumber baru di MT_SRC_ICON + dropdown `sources`.
3. **Un-hardcode `RN_ME`** di view_workspace.tsx → `me = amsShortName(auth.user.name) || RN_ME_FALLBACK`; threaded ke RN_Detail via prop.
4. **Chip linkage balik**: "N di My Tasks" di SubBar Working Papers (`myWpCount`) & Review Notes (`M.mine`), deep-link `nav('tasks',{from})`.

**R1 — rapikan data demo (mengubah KREDENSIAL LOGIN terdokumentasi):** seed Senior `Bagas Nugroho`→**Dimas Raharjo** (`dimas.r@whr-cpa.id`, DR), Junior `Citra Lestari`→**Fajar Nugroho** (`fajar.n@whr-cpa.id`, FN) — karena demo (WP/notes) sudah pakai Dimas/Fajar; Bagas hanya muncul sbg kandidat C-107 di data_people. Password tetap Senior#2025!/Junior#2025!. WORKPAPERS: C preparer Rina→Fajar N.; E reviewer Anindya→Hartono W. (beri Partner tugas reviu). Disentuh: seed.ts, BUILD.md (tabel akun), PRD W7.5, data_part1.ts. **WAJIB `npm run seed` setelah pull** agar akun login baru aktif. Lihat [[neosuite-ams-w7-5-isolation]].

**Gate hijau:** migration lint(0)+typecheck(0)+test(358) · server typecheck(0)+test(148). `:any` view baru diserap ke `eslint-suppressions.json` via `npx eslint src --suppress-rule @typescript-eslint/no-explicit-any` (script `lint:any-baseline` RUSAK di ESLint ini — `--suppress-rule`+`--prune-suppressions` tak boleh bareng). Live-proven via preview: Dimas(Senior)→Siapkan WP B/E/R+6 notes; Hartono(Partner)→Reviu WP E; set berbeda = identitas sesi nyata. window.AMS undefined (window-strip selesai) → verifikasi data lewat React, bukan window.
