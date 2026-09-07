---
name: asseris-ekspor-segel-degradasi
description: "Ekspor Asseris TIDAK \"tanpa gerbang\" — segelnya digerbangi CAP.EXPORT di server dan DEGRADASI ke workbook tak-tersegel; premis \"nol gerbang ekspor\" salah sistematis"
metadata: 
  node_type: memory
  type: project
  originSessionId: 1263aeac-b733-4735-a86e-147068403830
  modified: 2026-08-26T17:03:30.905Z
---

**Jangan pernah menyimpulkan "modul X punya ekspor tersegel tanpa gerbang kapabilitas"
dari `grep -c "can(CAP\." view_x.tsx` → 0.** Nol hasil di berkas view adalah keadaan
NORMAL, bukan cacat — gerbangnya ada di tempat lain.

Arsitektur sebenarnya (diverifikasi 2026-08-26, `origin/master` = `f650c74`):

- `server/src/router.ts:732` & `:771` — `if (!can(ctx.user.role, CAP.EXPORT)) throw FORBIDDEN`.
  **Segelnya digerbangi, server-side, otoritatif.**
- `migration/src/export_xlsx.ts:61-62` — komentarnya menyatakan desainnya eksplisit:
  *"Degrade to an UNSEALED workbook if the server is down or the role lacks CAP.EXPORT
  — never block the auditor from getting their register."*
- Akibatnya pada peran tanpa `CAP.EXPORT`: berkas **tetap terunduh**, dengan lembar
  `Segel` berlabel **`TIDAK TERSEGEL`** + `Segel dilewati · peran tanpa kapabilitas
  ekspor`, hash konten, dan pencatatan `EXPORT` best-effort ke rantai audit.

**Yang benar-benar tak digerbangi**, dan itulah temuan yang layak dilaporkan:
DATA-nya dan MODUL-nya. `MODULE_CAP` (`icons.tsx:339`) hanya memuat empat modul SDM
dan `GROUP_CAP` hanya `'SDM & Kepatuhan'`; `shell.tsx:233` `canOpenModule` mengembalikan
`!c` ⇒ `undefined` ⇒ **true**, jadi setiap peran terautentikasi bisa membuka modulnya
lewat ⌘K. Kurasi sidebar murni UI (CLAUDE.md §5), bukan kapabilitas.

`CAP.EXPORT` ('export.use') muncul di berkas view HANYA di `view_settings.tsx` — sebagai
label matriks RBAC, bukan gerbang. Nol view menggerbangi ekspor. Itu konsisten dengan
desain di atas, bukan bukti kelalaian.

**Skala celah baca (grup "Operasi & Administrasi Firma", 13 modul, 8 titik ekspor):**
tepat SATU modul punya `can(CAP.…)` — `view_records.tsx:349`, dan itu menggerbangi
**arsip (tulis)** dengan `FIRM_ADMIN`, bukan ekspor. Tak ada preseden internal untuk
gerbang BACA; menutupnya menuntut kapabilitas baru di KEDUA peta RBAC
(`migration/src/rbac.ts` ↔ `server/src/rbac.ts`) meniru `hr.moduleView` ⇒ wajib PRD
(CLAUDE.md §7). Usulan tertulis: `docs/usulan-P2-backoffice-gerbang-kapabilitas.md`,
saudara dari `usulan-R6-…` yang menemukan pola identik di grup Keuangan Firma (ERP).
Keduanya sebaiknya diputuskan BERSAMA agar tak lahir dua mekanisme.

Terkait: [[asseris-arc-prompt-perbaikan-modul]] · [[asseris-procurement-kontrol-baris-native]]
