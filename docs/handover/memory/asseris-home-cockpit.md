---
name: asseris-home-cockpit
description: "Beranda Kokpit Eksekutif Partner/Manager + unify WIP — MERGED master PR #126 (4719a38)"
metadata: 
  node_type: memory
  type: project
  originSessionId: 1d2c2531-ebde-4a64-8e68-6614b6c531f1
  modified: 2026-07-24T10:17:06.275Z
---

2026-07-24: Beranda peran-oversight (`can(ENGAGEMENT_VIEW_ALL)` = Partner/Manager) diubah jadi **Kokpit Eksekutif** hasil adopsi konsep artifact "Dashboard Partner" (Varian A). PR **#126** (branch `feat/home-cockpit`), belum merge saat ditulis. Peran non-oversight (Senior/Junior/firm-ops) tetap beranda personal lama (nol regresi).

**File:** `migration/src/view_home_cockpit.tsx` (BARU, `HomeCockpit`) + cabang di `view_home.tsx` (`isOversight ? <HomeCockpit/> : <personal lama>`; tombol Data Personal ditambah di hero) + kelas `.hc-*` di `styles_modules.css`.

**Isi:** KPI strip 6-metrik (Perikatan Aktif · Fee Diakui+spark · WIP · Piutang>60hr · Realisasi · Utilisasi) + 6 portlet drag-reorder (Portofolio · Antrian Persetujuan · Butuh Perhatian · Kualitas · Keuangan · Kapasitas Tim). Urutan disimpan `localStorage['ams.home.cockpit.order']` (UI-pref, BUKAN useAmsPersist — pola memori).

**SSOT (nol hardcode):** semua angka dari sumber yang SAMA dengan Firm Dashboard `view_dashboard2.tsx` — `useFirm`(engagements/clientById), `useAudit`(team/risks/reviewNotes), `FIRMFIN.wip({engagements})`, `capacityModel(schedule,plan)`, `AMS.BI_DATA`/`BI_AR_AGING`/`EQR_REVIEWS`. Antrian Persetujuan diderivasi (EQR aktif + reviewNotes open), sembunyi bila kosong (keputusan Ari b).

**Cakupan yang di-sign-off Ari:** Kokpit-utk-oversight + restyle-peran-lain; Varian A; data SSOT.

**GOTCHA konkret:**
- Konsep artifact = 3 file di manifest bundle (`kdp_data/widgets/app.js`) + data ILUSTRATIF (brief-nya sendiri bilang "BUKAN dari AMS_CANON"); cara baca artifact = WebFetch simpan HTML → decode manifest (gzip base64) via node → cari `.bin text/jsx`.
- **File .tsx BARU**: `noImplicitAny` ON (tsc gagal) TAPI ratchet `no-explicit-any` (eslint gagal utk `:any` baru) → jalan tengah = tipe struktural penuh (interface, bukan `:any`), cast boundary sekali `as unknown as T` (useFirm/useAudit/FIRMFIN/AMS), tipe event struktural (`{preventDefault():void}`, bukan `React.*` krn @types/react tak ada).
- **useState type-arg DILARANG** (React untyped→"untyped function calls may not accept type arguments"). Anotasi di LHS: `const [x,setX]: [T,(v:T)=>void] = useStateHC(init)` — BUKAN `useStateHC<T>()`.
- **`Panel` (ui.tsx) TAK spread rest props** → handler drag TAK bisa di-`{...spread}` ke `<Panel>`. Taruh di DOM asli: `onDragOver/onDrop` di `.hc-cell` div, `draggable/onDragStart` di `<span.hc-grip>`.
- KPI pakai `<Panel noBody>` + `.hc-kpi-c` padding sendiri (kalau tidak noBody, `.panel-body` padding 13/16px → dobel).
- **Deadline seed FY2025 di masa lampau** relatif jam app (Jul 2026) → semua overdue; tampilkan "lewat Nh" bukan angka negatif.
- **Varian SSOT WIP → SUDAH DISATUKAN** (commit `fb8bc05`, MERGED via PR #126): dulu WIP tak konsisten — WIP Valuation/Realisasi overlay jam-aktual T&B (`liveByEng`)→5,90 M; Dashboard/ikhtisar Firm Finance/cockpit LUPA overlay→7,72 M (std seed basi). Fix: ekstrak hook `use_firm_wip.ts`→`useFirmWip(provFactor?)` (ctx {engagements,clients}+liveByEng+FIRMFIN.wip), dipakai KELIMA surface (view_home_cockpit·view_dashboard2·view_firmfinance ikhtisar+WIPValuation·view_wip_firm). Semua kini 5,90 M. GL 1-300 tetap valid (sub-buku 5.900+rekons 3.400=kontrol 9.300; overlay hanya geser nilai antar sub-buku↔rekonsiliasi). Hook kembalikan {wip,liveByEng} (liveByEng utk chip "Sinkron T&B").
- Verifikasi live: pane 0x0 (screenshot/read_page kosong) → set `localStorage['ams.route']='home'` + `location.reload()` via javascript_tool, baca `get_page_text`/query DOM. dev-all: `preview_start name=dev-all` (vite :5180 + server :5181).

Gate hijau: typecheck 0 · lint 0 · build ok · 565/565 test. Lihat juga [[asseris-nav-beranda-restructure]] (beranda peran-based asli), [[asseris-session-2026-07-21-checkpoint]].
