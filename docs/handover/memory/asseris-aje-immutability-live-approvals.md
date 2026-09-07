---
name: asseris-aje-immutability-live-approvals
description: "Arc AJE P0/P1/P2 2026-08-07 — imutabilitas jurnal Posted lewat hash isi, persetujuan terikat versi, waktu nyata, tab persetujuan hidup; 7 commit di branch feat/aje-immutability-live-approvals, BELUM di-push"
metadata: 
  node_type: memory
  type: project
  originSessionId: e48c6f51-3b9a-4785-af10-4309ef195162
  modified: 2026-08-07T03:20:24.968Z
---

Evaluasi modul AJE (2026-08-07) menghasilkan PRD `docs/prd-aje-immutability-live-approvals.md`
dan 7 commit → **[PR #176](https://github.com/ari1945/Asseris/pull/176) **MERGED** `fe12e15`
belum di-merge.

**CI repo hidup kembali** (2026-08-07 ~03:15) setelah berhenti mengantre sejak 2026-08-06 18:16 —
catatan "merge tanpa CI" di [[asseris-wtb-integrity-falsifiable]] kini historis, bukan keadaan
sekarang. Job `docker build + postgres` dan `caddy edge` lulus, artinya impor lintas paket
`server/src/signoff.ts → ../../migration/src/aje_contract` **aman di paket deploy nyata** —
itu risiko utama PR ini yang tak dapat diuji lokal.

**Cacat inti yang ditutup.** `guardSignoffWrite('aje')` hanya mem-diff STATUS. Probe:
mengubah nilai 2.340 jt → 9.999 jt DAN kedua akun sebuah jurnal `Posted` menuntut
**nol kapabilitas**; gerbang tersisa hanya `capForWrite = AJE_EDIT` yang dimiliki
**Senior Auditor**. Uji lama `signoff.test.ts:202` MEMAKU perilaku itu sebagai benar —
uji itu harus dibalik, bukan ditambahi.

**Mekanisme yang dipakai: hash isi jurnal** (`migration/src/aje_contract.ts`, murni,
diimpor server lintas paket seperti `rbac`). Dua aturan saling mengunci:
1. Jurnal `Posted` yang hash-nya berubah → `posted-immutable:<id>`; **aturan, bukan
   otoritas** (tak memanggil `need()` — Rekan Pemimpin pun ditolak). Koreksi = pembalikan.
2. Tiap keputusan menyimpan hash versi yang disetujuinya → persetujuan **gugur secara
   turunan** saat jurnal berubah. Ini WAJIB karena keputusan hidup di StateDoc
   `approvals_ov_v4` sedangkan jurnal di `aje`: pembatalan lintas-dokumen tak dapat
   dijamin atomik, jadi ia harus turunan — tak ada tulisan yang perlu berhasil.

**Pola yang layak diulang:** ketika satu fakta harus dibatalkan lintas dokumen yang
tak bisa ditulis atomik, jangan menulis pembatalan — buat pembatalan itu TURUNAN.

**Gotcha yang menggigit di sesi ini:**
- `mat.pm`/`mat.ctt` bersatuan **Rp juta**; `aje.amount` **Rp penuh**. Pakai
  `pmFull`/`cttFull`, atau setiap jurnal jatuh "di atas PM".
- Tak ada `@types/react` (sengaja). `<Row key={x}/>` pada komponen ber-props BERTIPE
  GAGAL typecheck sampai `jsx-intrinsics.d.ts` diberi `JSX.IntrinsicAttributes`.
  Sebelum itu satu-satunya cara memberi key adalah props `any` — yang dicegah ratchet.
- Menambah field ke seed AJE (`proposedOn`, `preparer`) mengubah snapshot
  `canon_regression` — periksa diff-nya field-saja sebelum `-u`.
- Refactor yang MENGURANGI `any` → ESLint keluar dengan "suppressions left"; jalankan
  `npx eslint src --prune-suppressions` (ratchet view_aje 65→55).
- Uji baru harus GAGAL dulu di kode lama — 3 uji imutabilitas terbukti gagal sebelum
  guard dipasang.

**Tinjauan hidup menangkap apa yang 1.046 uji lewatkan** (lagi): register menyebut
penyusun AJE-01 "Rina Kusuma" (tabel metadata view) sementara tab Review menyebut
"Dimas" (default antrean). `preparer` dipindah ke jurnal, seperti `proposedOn`.

**Cacat di luar lingkup, tersingkap saat verifikasi hidup:** tulisan `state.set`
PERTAMA atas kunci berlingkup perikatan gagal 409 `already-exists:server=?` — 
`StateDocHistory` menyimpan baris versi-1 sementara `StateDoc` tidak (DB dev tak
konsisten), server salah mendiagnosis, `ConflictToaster` tak punya jalan pulih.
Sudah dibuat chip tugas terpisah. **Akibatnya verifikasi hidup jalur TULIS
server-side belum tuntas** — UI & guard terverifikasi, persistensi belum.

Terkait: [[asseris-aje-module-eval]] (arc PR-A..PR-E), [[asseris-wtb-integrity-falsifiable]],
[[asseris-opinion-signoff-sod-defect]].
