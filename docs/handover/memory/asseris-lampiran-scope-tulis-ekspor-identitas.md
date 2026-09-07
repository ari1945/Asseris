---
name: asseris-lampiran-scope-tulis-ekspor-identitas
description: Jalur TULIS lampiran SA 580/720 ditutup (5d4a9af) + PRD identitas ekspor tersegel (0664b3e) — dan tiga jebakan alat yang memakan waktu
metadata: 
  node_type: memory
  type: project
  originSessionId: d85e8436-f20f-4d90-8f98-a85fea91bcbf
  modified: 2026-08-20T19:56:33.143Z
---

Arc 2026-08-20/21 di worktree `intelligent-keller-7b28db`. Dua commit: `5d4a9af`
(perbaikan) dan `0664b3e` (PRD Draft, menunggu "Proceed." dari Ari — ia sudah
menjawab "saya ikut rekomendasi" atas usulan MEMBUAT PRD, bukan atas isi PRD-nya).

## Yang ditutup

`firm?.activeEngagement?.id || 'ENG-2025-014'` sebagai `scopeId` unggahan lampiran
(`view_sa580.tsx` · `view_sa720.tsx`). Satu pintu baru `attachment_scope.ts`:
tanpa perikatan aktif → `{ok:false}`, TANPA byte DAN tanpa metadata. Server absen
tetap metadata-only (F0.1 dipertahankan). Lihat [[asseris-timebudget-engagement-isolation]].

## Temuan yang lebih besar (jadi PRD, belum dikerjakan)

`docs/prd-export-seal-identity-ssot.md` — permukaan ekspor tersegel, 4 kelas:

- **`window.activeEngagement` NOL PENULIS** sejak window-strip. 12 call-site ekspor
  (termasuk laporan SA 800/805/810 yang keluar ke klien) karena itu SELALU menyegel
  dengan `scopeId: undefined`. Skema server menerima `scope` dan `scopeId` sebagai dua
  optional TERPISAH, jadi `scope:'engagement'` + `scopeId:undefined` lolos tanpa suara.
- **`scopeId:'default'` itu truthy** ⇒ `assertEngagementAccess` tetap jalan dan GAGAL ⇒
  artefak diam-diam TIDAK TERSEGEL, dan halaman segelnya salah mendiagnosis
  ("peran tanpa kapabilitas ekspor" — padahal perikatannya yang tak ada).
- **Cakupan segel tidak sejalan dengan apa yang dinyatakan artefak.** `canonicalPayload`
  pdf = `{kind,title,refNo,meta,blocks}` → nama firma TIDAK di-hash; xlsx =
  `{kind,title,sheets}` → firma DAN meta tidak di-hash (keduanya baru ditulis ke lembar
  "Segel" SETELAH hash dihitung). Jadi verifikasi lulus atas dokumen yang kepalanya
  menyebut firma mana pun — sementara `refNo`/`meta` pdf yang IKUT di-hash justru
  membawa 20 literal perikatan karangan. Lanjutan C-2 [[asseris-cockpit-tab-segel]].
- Akar: identitas adalah ARGUMEN call-site. 123 call-site, 9 bentuk ekspresi `scopeId`
  untuk satu fakta. Usulan: cabut `firm`/`scopeId` dari tipe model ⇒ `tsc` yang memigrasi.

## Jebakan alat (yang memakan waktu)

1. **`typecheck:test` berjalan `strictNullChecks:false`** (tsconfig.test.json, sengaja).
   Di sana **diskriminan boolean TIDAK menyempit**: `type R = {ok:true;ref:X} | {ok:false;reason:string}`
   lalu `if(!r.ok) r.reason` ⇒ **TS2339**, walau `npm run typecheck` produksi hijau.
   Obat: kedua cabang menyebut kedua field, yang tak berlaku sebagai `?: undefined`.
   Ini akan menggigit lagi pada tiap union hasil ok/error berikutnya.
2. **Worktree tidak punya `node_modules`.** Bikin junction ke repo utama untuk keempatnya
   (root · migration · server · e2e) dengan `cmd /c mklink /J`; lihat
   [[asseris-checkpoint-2026-08-14]] untuk cara melepasnya.
3. **PRD baru WAJIB masuk `docs/PRD-REGISTRY.md`** — baris daftar + naikkan angka
   "## Ringkasan" (gerbang `prd_registry.test.ts` MENGHITUNG ULANG dan membandingkan
   dengan angka yang diketik). Baris di berkas PRD-nya sendiri harus `| Status | Draft — … |`.

Heredoc tool Bash tetap merusak kutip/escape → pakai tool Write untuk berkas berisi
regex atau kutip bersarang ([[asseris-repo-hygiene-2026-08-19]]). Edit .tsx lewat python
harus normalisasi CRLF dulu ([[asseris-home-a11y-komposisi]]).

## Pola uji yang dipakai ulang

`attachment_engagement_scope.test.ts` — tiga lapis: §1 perilaku (bus unggah terbukti
TIDAK dipanggil), §2 gerbang sumber (komentar dibuang), §3 **anti-tautologi**: tiap
predikat §2 dijalankan atas sumber yang sengaja dimutasi kembali ke bentuk cacatnya dan
dituntut gagal. Tanpa §3, hijau §2 tak membuktikan apa pun ([[asseris-budget-actual-ledger-derived]]).
