---
name: asseris-audittimeline-relocation
description: Jadwal & Lini Masa Audit dipindah dari workspace Firma ke Perikatan + deconflict EngJadwal (altitude portofolio vs detail)
metadata: 
  node_type: memory
  type: project
  originSessionId: f543801b-3ece-4484-8743-2346e0c9733f
---

2026-06-26: modul `audittimeline` ("Jadwal & Lini Masa Audit") dipindah dari grup `Practice Operations` (workspace **Firma**) ke `Engagement Workspace` (workspace **Perikatan**) di [icons.tsx]. Alasan: isinya 100% engagement-scoped (ikut `firm.activeEngagementId`, SSOT `AMS.DELIVERY`/`DELIVERY_WINDOW`, deep-link ke ~15 modul prosedur) — view operasional per-perikatan, bukan artefak practice-ops lintas-engagement. Tag `NEW` dilepas (modul lama). Relokasi murni grouping: route `app.tsx`/import `main.tsx`/nav silang `ojkfiling` semua workspace-agnostic.

**Temuan penting — `EngJadwal` BUKAN duplikat** (grep dulu, jangan asumsi hapus): ia Gantt **PORTOFOLIO** (semua perikatan sbg baris, diurut tenggat + "Beban Tenggat 30 hari", tanggal hardcoded) — beda **altitude** dari `audittimeline` (satu-perikatan-dalam, SSOT). Deconflict yang benar = bikin relasi eksplisit (portofolio→drill detail) via tombol "Buka Lini Masa Detail" di panel milestone EngJadwal (`setActiveEngagementId(selId)` guarded → `nav('audittimeline')`), BUKAN menghapus view portofolio yang sah. Honor "look before overwrite".

**Gotcha:** pola defensif `(typeof useNav==='function')?useNav():...` MELANGGAR ESLint `react-hooks/rules-of-hooks` (hook kondisional). Di ESM `useNav` selalu ada (impor) + komponen selalu dalam provider → panggil langsung `const nav = useNav();`. `setActiveEngagementId` di firm ctx = alias `selectEngagement` (guarded by `accessibleEngIds`, no-op untuk id tak-akses).

Preseden pola ini: [[asseris-risk-relocation-portfolio]] (Risk FPM→Core Planning + tab portfolio). Konsolidasi serupa: [[asseris-sa530-consolidation]].

Gates: typecheck 0 · lint 0 · 358/358. Live-verified bundel: `wsForModule('audittimeline')`→`engagement`, boot bersih (login gate; window globals via `preview_eval` baru terisi SETELAH boot rampung, awalnya kosong — re-eval). Nol perubahan canon/SSOT. Commit `366eb37` di branch `feat/w9-coretax-connector` — **PUSHED → origin** (range `1ad4fa6..366eb37`, ikut bawa `b64713f` sampling bridge; bagian PR #41 yang open). Penajaman placement: ditaruh di Engagement Workspace (klaster cockpit), bukan Core Planning — pindah 1 baris jika Ari mau ubah.
