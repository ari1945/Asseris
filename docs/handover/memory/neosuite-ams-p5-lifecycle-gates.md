---
name: neosuite-ams-p5-lifecycle-gates
description: "NeoSuite AMS feature stream P5 — gerbang fase lifecycle engagement: status, arsitektur, fase berjalan"
metadata: 
  node_type: memory
  type: project
  originSessionId: 6ad69e92-5be7-43e0-98d7-b555b1f3d121
---

Feature build **P5** (gap eval §4 item P5; lanjutan [[neosuite-ams-p1-conclusions]] & [[neosuite-ams-p2-wp-signoff]] yg SELESAI). PRD = `Audit System/PRD - Gerbang Fase Lifecycle Engagement (P5).md` (sign-off "Proceed." diberikan).

**Problem:** model fase SUDAH ada (`Perencanaan→Eksekusi→Finalisasi→Arsip` → status Planning/Fieldwork/Review/Completed di `contexts.jsx:71`, set via `setEngagementPhase(id,phase)`; `firm.locked` dari fase Arsip/status Completed). TAPI transisi tak bergerbang: `view_firm.jsx:325`(drag)+`:404`(radio) bisa lompat ke Arsip tanpa syarat; "gate kesiapan opini" cockpit (`view_cockpit2.jsx:657-732`) **display-only** (hitung ready/len utk gauge, blokir nol; kriteria 6/7/8 hardcode; `WpCompletenessRecap` ditampilkan tapi BUKAN kriteria gate). Satu-satunya gate nyata = `canFinalize`/`finalize` opini (`view_opinion_parts.jsx:496`) tapi tak gerakkan fase.

**Keputusan terkunci (PRD Q1-Q4):** Q1 = **graduated** (warn utk Eksekusi/Finalisasi; **confirm-wajib+override tercatat** utk Arsip — hormati lock LUNAK). Q2 ambang = Arsip butuh opini final + **100% WP ter-review** + 0 catatan terbuka; Finalisasi cukup 0 catatan prioritas-tinggi. Q3 = kriteria demo (going concern/subsequent/independensi) **disisihkan** (jangan gerbang atas hardcode). Q4 = cakupan = seluruh `WP_MODULE_MAP`.

**Data terpakai (semua SSOT, tanpa store baru):** `wpCompletenessFor(audit,moduleIds)` (P1/P2) · `audit.reviewNotes` (global, `{status,priority}`) · opini final dari `localStorage ams.v1.opinionDoc.<engId>.finalized`. Catatan review GLOBAL (tak ber-engagementId) → kriteria "catatan terbuka" bisa over-count lintas engagement; scoping = **Fase 2 P5** (PRD terpisah).

**Fase 0 = DONE & committed** (`1bc6c5f`). Semua di `wp_signoff.jsx` (satu rumah dgn `wpCompletenessFor`):
- `PHASE_ORDER` + `opinionFinalized(firm)` (baca ls, try/catch, fallback false).
- `engagementGate(audit, firm, {moduleIds, nextPhase})` murni → `{fromPhase, nextPhase, severity:'none'|'warn'|'confirm', criteria:[{key,label,met,detail,view}], blockers, allMet}`. Mundur/sama-fase → severity 'none' allMet true. Kriteria per Q2 di atas.
- `EngagementGateSummary({nextPhase, moduleIds, compact})`: daftar kriteria + tombol "Buka" `nav(view,{from:'firm'})`. Import `useNav` dari contexts (panggil langsung — defensive `typeof` melanggar rules-of-hooks ESLint).
- Ekspor window+ESM: `PHASE_ORDER, engagementGate, EngagementGateSummary`.

**Verified Vite :5180** (helper vs data demo, engagement Eksekusi): →Finalisasi warn (3 catatan high terbuka); →Arsip confirm (opini blm final, 0/37 WP ter-review, 6 catatan terbuka); →Eksekusi none. 37 ref unik konsisten Fase 3 P1. 0 console err. lint/typecheck/build hijau; canon 49 test utuh. (Komponen belum dimount — render diverifikasi di Fase 1.)

**Fase 1 = DONE & committed** (`286b2a0`). `usePhaseGate` + `PhaseGateDialog` (`wp_signoff.jsx`) membungkus `setEngagementPhase` di KEDUA titik `view_firm.jsx` (kanban `onDrop` + segmented phase drawer). Graduated: →Arsip 'confirm' SELALU (titik lock; blocker→"Tetap arsipkan (override)"+`logActivity({type:'gate-override'})`, terpenuhi→"Arsipkan & kunci"); →Finalisasi 'warn' dialog hanya bila blocker ("Lanjutkan"); mundur/sama-fase langsung. `engagementGate` kini terima `opts.fromPhase` (fase engagement yg dipindah, bukan selalu active); `EngagementGateSummary` terima `gate` precomputed. Konsumen di view_firm: hapus `setEngagementPhase` dari destructure (lewat `pg.attempt`), render `<PhaseGateDialog>` dari `pg.pending`.

**Verified Vite :5180** (ENG-2025-014 Eksekusi): Arsip→confirm 3 blocker, fase tak berubah; override→Arsip+log; mundur Arsip→Eksekusi langsung; Finalisasi→warn 1 blocker Lanjutkan, Batal no-op. 0 console err (HMR-reload warning saat edit = transien; full-reload bersih). lint/typecheck/build hijau; canon 49 utuh. (Gotcha: `useNav` ESM import dipanggil langsung — defensive `typeof` melanggar rules-of-hooks.)

**Fase 2 = DONE & committed** (`3ec4891`). Gate kesiapan opini cockpit (`view_cockpit2.jsx` TabRisiko array `gate`): kriteria "kertas kerja di-review" dahulu dari daftar demo `workpapers` (`w.reviewer==='—'`) — sumber BEDA dari `WpCompletenessRecap` (wpState) tepat di bawahnya. Kini dari `wpCompletenessFor({wpState}, WP_MODULE_MAP)` — SSOT sama dgn firm-board gate. `D` memo tambah `wpRecap` (+dep `wpState`); label "Seluruh kertas kerja kunci telah di-review (sign-off)", sub "N/37 WP ter-review · X% (SSOT)". Verified :5180 cockpit Risiko: gate "0/37 (SSOT)" cocok recap 0/37; console bersih. lint/typecheck/build hijau; canon 49 utuh.

**Catatan double-source tersisa:** SignalCard "Dokumentasi WP" (`view_cockpit2.jsx:~280`, "1/6 di-review") masih dari register `workpapers` legacy — dataset BEDA dari 37 WP modul kanonik (bukan bug; dua list memang beda). Di luar scope gate; kandidat cleanup terpisah.

**Fase 3 (opsional) = DONE & committed** (`a87214e`). `OpinionSignoff` (`view_opinion_parts.jsx`) tambah `usePhaseGate`; saat `doc.finalized` & fase≠Arsip → tombol "Arsipkan engagement" yg lewat gerbang SAMA (`pg.attempt(engId, phase, 'Arsip')` + `PhaseGateDialog`). Fase=Arsip → pesan "diarsipkan & terkunci" + offer hilang. Reopen tetap. Karena opini sudah final saat tombol muncul, kriteria `opinionFinal` auto-met; blocker tersisa WP+catatan. Verified :5180 (opini di-seed finalized): offer tampil→dialog confirm (opini "terkunci" met, 2 blocker)→override fase Arsip+log "menembus 2 prasyarat"+panel "diarsipkan". 0 console err. gate hijau; canon 49 utuh.

**P5 SELESAI (Fase 0-1-2-3).**

**Tindak lanjut "Fase 2 P5" (engagement-scoping reviewNotes) = DONE & committed** — PRD = `Audit System/PRD - Engagement-Scoping Review Notes (P5 Fase 2).md` (Proceed.). Keputusan: Q1 field (bukan re-key) · Q2 legacy-null tampil-untuk-aktif · Q3 scope gate+cockpit+workspace+mytasks, dashboard tetap firm-wide.
- **Fase 2A** (`16496d8`): seed `REVIEW_NOTES` di-stempel `engagementId:'ENG-2025-014'` (`.map`); `notesForEngagement(notes,engId)` murni (catatan engId + legacy-null) di `contexts.jsx` (ekspor window+ESM); `addReviewNote` stempel `activeEngagementId`; turunan `reviewNotesActive` di AuditContext.
- **Fase 2B** (`350ceb3`): `engagementGate`/cockpit/workspace/mytasks → `reviewNotesActive`; dashboard SENGAJA firm-wide (tak diubah). Fallback `|| reviewNotes` dipertahankan.
- Verified :5180: switch active 014→040 ⇒ gate "6 catatan open"→"0", papan "0 terbuka" (tak bocor). Gotcha: `usePersisted` muat state lama → catatan legacy tanpa id; fallback `==null` jaga agar tak hilang; uji butuh stempel-ulang persisted (non-destruktif).

**Cleanup kosmetik = DONE** (`9d3160f`): SignalCard "Dokumentasi WP" cockpit kini dari `D.wpRecap` (37 WP kanonik SSOT, "N/37 di-review"), bukan register `workpapers` legacy ("1/6"); `docTone` (memberi makan verdict kesehatan) ikut wpRecap. Item "needs attention" Ringkasan (`D.wpNoReviewer`) dibiarkan — detail per-lead-schedule register `workpapers`, surface berbeda. Verified :5180 band "0/37 di-review" cocok gate+recap.

Gap eval berikutnya: P4 (AI diagnostic) · keputusan W6 · arc arsitektur (window-strip/TS).
