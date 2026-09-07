---
name: asseris-compliance-identity-literal
description: "Panel \"Konteks Engagement\" di view_compliance memakai klien/perikatan/preparer literal; diganti turunan konteks + gerbang sumber. Temuan sampingan - window.activeEngagement TAK PERNAH ditulis (12 pembaca)."
metadata: 
  node_type: memory
  type: project
  originSessionId: 31b2a25c-4fa4-4a37-8e27-770c594ca58f
  modified: 2026-08-20T15:15:56.070Z
---

**2026-08-20.** Cacat di `migration/src/view_compliance.tsx` panel "Konteks Engagement":
`Klien="PT Sentosa Makmur"`, `Engagement="ENG-2025-014"`, `Preparer="Dimas R."` — tiga
literal TANPA SYARAT, bersebelahan dengan "Total Prosedur" yang MEMANG turunan (sehingga
literalnya terbaca sama tepercayanya).

Perbaikan: model murni baru `migration/src/compliance_context.ts`
(`complianceContextRows` + `compliancePreparer` + `KOSONG = '—'`), view memakai
`useFirm().activeClient` / `.activeEngagement.id` / `useAudit()`.
Gerbang: `migration/src/compliance_engagement_identity.test.ts` (19 uji).

**Why:** panel yang salah untuk SETIAP perikatan kecuali satu lebih buruk daripada
fallback; ia duduk di bawah judul yang mengklaim menerangkan perikatan aktif.

**How to apply:**

1. **Sumber klien = CLIENTS, bukan perikatan.** Baris `AMS.ENGAGEMENTS` **tak punya**
   `clientName` (hanya `clientId`). Setiap pembaca `e.clientName` jatuh DIAM-DIAM ke
   fallback-nya. Jalur benar: `ENGAGEMENTS.clientId → CLIENTS.name`, sudah tersedia
   sebagai `useFirm().activeClient`.
2. **Preparer = rantai sign-off**, dibaca lewat pembaca kanonik
   `wpSignersFor(audit, moduleId, {})` (ia sekaligus memetakan `moduleId → ref`
   `WP_MODULE_MAP`). Belum ditandatangani ⇒ em-dash. **JANGAN** mundur ke
   `AMS.WORKPAPERS`: register itu tak berkunci perikatan (semua barisnya milik
   ENG-2025-014) — memakainya menuliskan nama orang yang SALAH di catatan kepatuhan
   perikatan lain.
3. **Gerbang sumber harus memuat VARIAN nama.** Literalnya `"PT Sentosa Makmur"`
   sedangkan `CLIENTS.name` = `"PT Sentosa Makmur Tbk"` — pencocokan nama persis akan
   BUTA pada cacat yang justru memicunya. Kamus dibangun dari register (CLIENTS/TEAM/
   ENGAGEMENTS/WORKPAPERS) + varian: tanpa ` Tbk`, tanpa gelar (`, CPA`), dan singkatan
   `Nama I.`. Plus jaring luas regex `PT <Kata> <Kata>`.

**GOTCHA yang ditemukan sambil jalan:**

- **`window.activeEngagement` TIDAK PERNAH DITULIS** di seluruh `migration/src` — hanya
  DIBACA di 12 situs (`view_cockpit`, `view_compliance`(dibetulkan), `view_groupaudit`,
  `view_related`, `view_sa800`×2, `view_sa805`×2, `view_sa810`×2, `view_sjah3000`,
  `view_subsequent`). Akibatnya `scopeId` segel ekspor **selalu `undefined`** → 11 ekspor
  masih tersegel ke lingkup kosong. Bukti: `grep -rn "activeEngagement" migration/src |
  grep -iE "window|Object.assign|globalThis"` → nol penulis.
- **Nama berkas ekspor "… - Klien.xlsx"**: `view_sad.tsx:247` & `view_timebudget.tsx:115`
  meng-cast `activeEngagement as { clientName?: string }` → selalu `'Klien'`.
  `view_groupaudit.tsx:229` sama, lewat `window.activeEngagement`.
  `view_dashboard.tsx:147` (`e.client || e.clientName || ''`) → kolom klien pada ekspor
  daftar perikatan **selalu kosong**.
- **`view_clientportal.tsx:302`**: `clientObj.name || 'PT Sentosa Makmur Tbk'` — cacat
  sekeluarga, masih hidup.
- **`ComplianceView` cuma bisa dicapai lewat SATU modul: `sakep`.** 20 dari 21 kunci
  `COMPLIANCE_CONFIG` punya view khusus di `lazy_views.tsx`; hanya `sakep` jatuh ke
  fallback `app.tsx:54`. Dan `sakep` **tak ada** di `WP_MODULE_MAP` → Preparer-nya
  em-dash permanen sampai modul itu dipetakan. Jujur, tapi perlu diketahui.
- **Nama firma literal `'KAP Wijaya Hartono & Rekan'` = 94 situs di 78 berkas** (naik dari
  "59 call-site" yang dicatat [[asseris-cockpit-tab-segel]]) — arc tersendiri.
- **Heredoc Bash tool masih merusak berkas** (lihat [[asseris-repo-hygiene-2026-08-19]]):
  `cat > f <<'EOF'` dengan JSX/kutip gagal parse. Pakai tool `Write`, lalu **edit CRLF**
  dengan skrip node yang mengecek `if (/[^\r]\n/.test(s)) throw` — `view_compliance.tsx`
  100% CRLF (408 baris), Edit berbasis `\n` bisa gagal senyap.
- Bukti render nyata di app: tulis `ams.v1.engagement.<ENG>.wpState` di localStorage lalu
  **`location.reload()`** — navigate ke hash yang sama TIDAK memuat ulang, jadi panel
  tampak tak berubah dan bikin salah simpul.

Terkait: [[asseris-timebudget-engagement-isolation]] · [[asseris-cockpit-tab-segel]] ·
[[asseris-mytasks-user-scope]]
