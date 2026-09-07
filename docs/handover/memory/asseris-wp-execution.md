---
name: asseris-wp-execution
description: "WP procedure-execution & evidence-testing feature — Phase 1 shipped, Phases 2-3 pending"
metadata: 
  node_type: memory
  type: project
  originSessionId: a8fd9752-9ae1-4777-b244-8009c24ae783
---

Modul Working Papers ([[neosuite-ams-arc]]) dikembangkan jadi surface eksekusi prosedur + pengujian bukti. Keputusan Ari (2026-06-25): **Full audit-tech** tapi prosedur WP **tetap terpisah** dari Audit Programme (pakai `WP_PROCS`, bukan menyatukan dengan `PROGRAMME`).

**Fase 1 (SELESAI, terverifikasi live):** di `migration/src/view_wp.tsx` —
- Tab Prosedur jadi expandable execution panel: item/sampel uji per prosedur, tautkan bukti, hasil (cocok/pengecualian/N-A) → **auto-tickmark** (✓/∆/^), kesimpulan per prosedur, status **diturunkan** dari item (fallback ke flag lama bila tak ada item).
- Tab Bukti & Referensi: **Register Bukti per-WP** (sumber→tier keandalan SA 500) + **meteran kecukupan & ketepatan** (appropriateness=avg tier, sufficiency=cakupan item, verdict hijau/amber/merah).
- Persist di `wpState[ref].exec` + `wpState[ref].evidence` (engagement-scope SSOT, gate WP_EDIT, server-backed via `setWp`). Backward-compatible.
- PRD: `docs/prd-wp-procedure-execution.md`.

**Fase 2 (SELESAI, terverifikasi live):**
- **SA 530 sample pull** di ProcRow: tombol "Tarik Sampel (SA 530)" → panel params (bv/conf/tm/em/titik-mulai%) → `musPlan` hitung n & interval → `selectMus(scalePopulation(SA530_POPULATION,bv),...)` → item MUS unik (+penanda KEY ITEM bv≥interval) masuk jadi test items. Default params dibaca read-only dari `sampling.v1` (modul SA 530).
- **IPE register** (SA 500 ¶A56) di tab Bukti: daftar laporan/sistem entitas + uji **akurasi & kelengkapan** (Teruji/Pengecualian) + ringkasan & badge pengecualian. Persist `wpState[ref].ipe`.
- **SSOT refactor:** `CONF_FACTORS` + `musPlan` + tipe `ConfFactor/MusPlan` DIPINDAH ke `sampling_select.ts` (pure module, exported); `view_sa530.tsx` kini meng-import-nya (hapus salinan lokal). Satu sumber math MUS.

**Fase 3 (SELESAI, terverifikasi live) — ARC TUNTAS:**
- **SA 505 confirmation tracker** di tab Bukti: register pihak dikonfirmasi (party/nilai/terkirim/balasan/selisih/catatan), ringkasan terkirim·dibalas·selisih·tanpa-balasan + response rate; non-respons → prompt prosedur alternatif. Persist `wpState[ref].confirms`.
- **Auto-tickmark item→Lead Schedule:** kolom "Akun Lead" per item uji (opsi dari leadRows WP); set hasil → tickmark item DAN tickmark akun lead tertaut otomatis (`wpState[ref].ticks`). Terbukti: item tie pada akun 1-1200 → Lead Schedule 1-1200 jadi ✓.
- **Evidence Evaluation dinamis** (`view_evidence.tsx`): overlay `live` per area dari `wpEvidenceEval(wpState[area.wp])` (di-export dari view_wp) menggantikan EV_SEED statis bila WP punya bukti/eksekusi nyata; badge "dari WP". Terbukti EV-B 3.5→4.5 setelah 1 item teruji.

GOTCHA live-verify: WPDrill = modal overlay, klik backdrop = TUTUP; jangan klik `.row.gap10` dua kali (toggle). Session httpOnly cookie EXPIRE saat sesi panjang → re-login (Senior bagas.n@whr-cpa.id / Senior#2025!). Cek DOM HARUS di eval TERPISAH setelah klik (React belum re-render di eval yang sama).

GOTCHA: file `.tsx` app-tier — `useStateWP`/`setWp` bertipe `any`, jadi anotasi callback param eksplisit (`(a: string[])`) WAJIB (noImplicitAny) tapi hindari `: any` baru (ratchet [[asseris-test-coverage]]). `lint:any-baseline` script RUSAK (flag bentrok di ESLint baru) → pakai `npx eslint src --prune-suppressions` saat menurunkan :any. Tanpa @types/react: tak ada `React.ChangeEvent/MouseEvent/ReactNode` → pakai tipe struktural lokal (`{target:{value}}`), dan tambah `key?:number` ke props komponen bertipe.
