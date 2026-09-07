---
name: asseris-eng-fallback-kelas-tulis
description: "Sensus kelas `|| 'ENG-2025-014'` — 19 situs JALUR TULIS (bukan 11 ekspor seperti klaim lama), plus DEFAULT_ENG_ID di level framework persist"
metadata: 
  node_type: memory
  type: project
  originSessionId: 45355f13-7254-4d3f-bfa9-592ed5b3fd18
  modified: 2026-08-27T09:11:12.408Z
---

Fallback `firm?.activeEngagement?.id || 'ENG-2025-014'` bukan satu cacat, melainkan
**kelas berlapis**. Gradasinya menentukan keparahan — bedakan sebelum menyapu:

| Kelas | Jumlah (per `952392a`, sesudah PR #317) | Akibat |
|---|---|---|
| **WRITE-PATH** | **17 situs / 17 berkas** | data terarsip di berkas audit klien LAIN |
| **SEALED-EXPORT** | 13 situs / 11 berkas | identitas karangan di dalam artefak tersegel Ed25519 |
| **DISPLAY-ONLY** | 37 situs / 32 berkas | salah di layar saja |

WRITE-PATH didominasi **16 modul PSAK** (`view_psak1/2/14/16/19/22/24/25/46/48/58/65/
66/68/71/72`) yang memakai `scopeId: eng?.id` → `exporter.seal.mutate` +
`logEvent.mutate`, plus `view_clientportal.tsx:369` (menulis PBC ke `pbc.v2`).

🔴 **Dan satu tingkat lebih dalam — ini yang terbesar:** `contexts.tsx:927` memakai
`((firm && firm.activeEngagementId) || DEFAULT_ENG_ID)` dengan
`DEFAULT_ENG_ID = 'ENG-2025-014'` (`persist_scope.ts:23`). Artinya **SETIAP kertas kerja
berlingkup perikatan** lewat `useAmsPersist` jatuh ke StateDoc ENG-2025-014 saat konteks
kosong. Menutupnya menyentuh semua kunci sekaligus dan berinteraksi dengan
[[asseris-migrasi-lingkup-hangus]] — **butuh keputusan Ari, jangan diselipkan**.

**Jebakan grep yang menggigit di sini:** `grep 'ENG-2025-014'` yang juga menuntut
`scopeId` **di baris yang sama** memberi NOL hasil — fallback di-assign ke variabel di
satu baris dan dikonsumsi di baris lain. Wajib telusuri variabelnya. Juga: 50 kemunculan
mentah menyusut jadi 49 non-komentar (lihat [[asseris-spr2400-pengiriman-dan-premis-salah]]).

**Klaim lama BASI:** pesan commit `5d4a9af` (2026-08-20) menyebut sisa "11 situs ekspor
tersegel di 9 berkas + `view_sa230.tsx:110`". `view_sa230.tsx` **sudah bersih** (dicabut
lewat #286), dan sensusnya melewatkan seluruh tier WRITE-PATH yang lebih parah.

**PR #317 MENDARAT** (`405cc67`, 2026-08-27) — menutup 2 dari 19: lampiran SA 580 & SA 720
lewat `attachment_scope.ts`. Cherry-pick `5d4a9af` dari `claude/intelligent-keller-7b28db`,
bersih ke `952392a`; 9 check CI hijau termasuk Playwright×Postgres & deploy-smoke.
Terverifikasi blob di master: `view_sa580.tsx:73` & `view_sa720.tsx:71` kini `|| ''`.

Gerbangnya terbukti falsifiable: memutasi `engId` kembali ke `|| 'ENG-2025-014'`
menjatuhkan 3 uji — termasuk §3 yang mendeteksi mutasinya jadi no-op.

**Sisa cabang `claude/intelligent-keller-7b28db`: tiga commit arc export-identity F-1/F-2
(97 berkas) BELUM mendarat** — sengaja tidak dibawa, PR terpisah, butuh rebase ke master
terbaru. Lihat [[asseris-sensus-cabang-2026-08-27]].
