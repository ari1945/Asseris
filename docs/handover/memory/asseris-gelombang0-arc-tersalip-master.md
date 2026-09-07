---
name: asseris-gelombang0-arc-tersalip-master
description: "Arc firmgl+apar (A1–A5) tak dapat dikirim apa adanya — master sudah menjawab separuh masalahnya dengan kanon yang LEBIH BARU, jadi mengambil versi lokal justru mengembalikan cacat"
metadata: 
  node_type: memory
  type: project
  originSessionId: 68d92f5f-046d-449d-9456-f298b2b39e0a
  modified: 2026-08-24T00:58:14.115Z
---

**Status per 2026-08-24: DIPARKIR di direktori kerja utama** (belum di-commit, belum
punya PR). Berkasnya: `view_firmgl.tsx` `data_firmfin.ts` `view_firmfinance.tsx`
`view_pipeline.tsx` (M) + `apar_ratios.ts` `use_firm_subledger.ts` `firm_gl_export.ts`
`apar_conventions.test.ts` `apar_register.test.ts` `firm_gl_conventions.test.ts`
`firm_gl_export.test.ts` (??). Cadangan lengkap ada di scratchpad sesi
`…/scratchpad/gel0-snapshot/`.

**Sebabnya bukan konflik teks.** `git apply -3` menghasilkan 6 hunk konflik di 3 berkas,
dan pada tiap hunk `ours` (= master) ternyata **lebih baru** daripada `theirs` (= arc
lokal, ditulis 2026-08-22):

| yang arc lokal lakukan | yang master SUDAH lakukan |
|---|---|
| `view_pipeline`: `who = (AMS.USER && AMS.USER.name) \|\| 'Pengguna'` | `useCurrentAuditor()` — identitas sesi |
| `view_pipeline`: `FIRMFIN.arAging({invoices}).open` | `invoiceTotals(invoices)` dari kanon |
| `view_firmgl`: `useAmsPersist('invoices', …)` | `useInvoiceRegister()` + `canon_invoices` |
| `view_firmfinance`: `useFirmSubledger()` | `useInvoiceRegister()` (#241) |

Mengambil `theirs` akan **MENGEMBALIKAN** `view_pipeline.tsx` dari identitas sesi ke seed
`AMS.USER` — persis kelas cacat yang berulang kali dicabut di repo ini.

**Yang MASIH terbuka di master `500beeb`** (diverifikasi grep pada pohon bersih, bukan
diasumsikan) dan karena itu masih layak dikerjakan:
- **A1** `data_firmfin.ts`: `apOf` TIDAK ADA — `ap(ctx)` membaca `A().FIRM_AP` tanpa syarat
  ⇒ sisi sub-buku baris rekonsiliasi `2-100` beku pada seed.
- **G1** `view_firmgl.tsx`: `grep -c reconcil` = **0** — neraca firma tanpa status rekonsiliasi.
- **G2** `view_firmgl.tsx`: `grep -c amsExportXlsx` = **0** — empat tab data, nol ekspor.
- **G3/A4** `view_firmgl.tsx:46` dan `:409` masih `const who = (AMS.USER && AMS.USER.name) || 'Pengguna'`
  — padahal `firm_gl_actor.ts` (`glActor`/`glWriteAllowed`) SUDAH ada di master lewat #298.
- **A5** DSO/DPO masih `Math.round(...)` tanpa jalur `null`, dan `FIRMFIN.pl()` dipanggil
  tanpa ctx (jatuh ke seed COA).

**Why:** arc yang menganggur beberapa hari di direktori kerja bisa TERSALIP. `mergeable:
CLEAN` dan bahkan `git apply` yang bersih tidak membuktikan apa pun soal arah waktu —
yang menentukan adalah siapa yang lebih baru per hunk.

**How to apply:** kerjakan ulang arc ini sebagai arc BARU di atas master terkini:
pertahankan `useInvoiceRegister`/`canon_invoices`/`invoiceTotals` milik master, ambil dari
salinan lama hanya bagian yang menutup A1 · G1 · G2 · G3 · A5, sambungkan `who` ke
`glActor`. Jangan cherry-pick, jangan salin berkas. Gerbang harus difalsifikasi ulang —
`apar_conventions.test.ts` & `firm_gl_conventions.test.ts` menuduh pola lama yang sebagian
sudah tidak ada.

Lihat juga [[asseris-gelombang0-baseline-master-bukan-head]] ·
[[asseris-firmgl-rekonsiliasi-ekspor]] · [[asseris-apar-subbuku-hidup]]
