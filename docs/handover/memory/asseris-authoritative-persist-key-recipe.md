---
name: asseris-authoritative-persist-key-recipe
description: Recipe untuk menambah persist key OTORITATIF (approval/sign-off) di Asseris — 3 titik wajib agar RBAC tak bocor
metadata: 
  node_type: memory
  type: project
  originSessionId: d221f401-59a2-4af1-8493-95989c450e6b
---

Menambah key `useAmsPersist` yang membawa **keputusan otoritatif** (persetujuan, sign-off, finalisasi) butuh **3 sentuhan**, bukan 1. Lewat satu saja → RBAC bocor diam-diam.

1. **`AMS_PERSIST_SCOPE` (contexts.tsx)** — daftarkan key sebagai `'engagement'`. Kalau tidak, default `'firm'` → `capForWrite('firm',key)=FIRM_ADMIN` → hanya Partner bisa tulis, Manager/Senior/Junior **ditolak server diam-diam**.
2. **UI gate** — `useAuth().can(CAP.<X>)` untuk enable/disable kontrol + badge status.
3. **Server enforcement** — server `capForWrite` untuk key engagement default ke **WP_EDIT (semua peran)** = terlalu longgar untuk slot otoritatif. Tambah key ke `SIGNOFF_KEYS` + cabang di `guardSignoffWrite` (server/src/signoff.ts) yang `need(CAP.<X>, …)` saat `sig(prev)!==sig(next)`. Pola dua-lapis: capForWrite gate dokumen, guardSignoffWrite gate sub-dokumen. Tambah uji di `__tests__/signoff.test.ts`.

Server menerima **key mentah** (mis. `strategyApproved.v1`), BUKAN cacheKey `ams.v1.*` (itu cuma localStorage). Jadi `SIGNOFF_KEYS` cocokkan string mentah.

Contoh live: persetujuan Strategy Memo SA 300 (`strategyApproved.v1` → SIGNOFF_REVIEWER), commit `ef64aca`. Sejajar SoD opini [[asseris-opinion-signoff-sod-defect]] & intake [[asseris-acceptance-engagement-flow]].

**GOTCHA terpisah:** `connectivity.json` = snapshot **W0 baseline, tak pernah di-regenerasi**. Matriks "modul terisolasi" yang diturunkan dari salinan lama/eksternal bisa salah (mis. Strategy Memo dilabel TERISOLASI padahal `status:"hub"` out7/inc8). Verifikasi status modul dari connectivity.json + LINEAGE aktual, bukan matriks lepas.
