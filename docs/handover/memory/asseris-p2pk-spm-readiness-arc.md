---
name: asseris-p2pk-spm-readiness-arc
description: "Arc Kesiapan Pemeriksaan P2PK (SPM 1 & 2) — 19 cacat terverifikasi; PR-1..3 + ambang PPL MERGED (#194·#195·#196·#197), master 0b09734 hijau; berikutnya PR-4"
metadata: 
  node_type: memory
  type: project
  originSessionId: 3e484742-f427-4613-a8dd-de565529ec24
  modified: 2026-08-12T21:31:34.912Z
---

## 👉 MULAI DI SINI — PR-1..3 SEMUA MERGED 2026-08-12

**master `0b09734`. NOL PR terbuka dari arc ini** (#193 PRD-lint tersisa, tak terkait).
`npm run verify` HIJAU di master: **1313 uji frontend · 431 server**.

| PR | Isi | Commit master |
|---|---|---|
| #194 | PR-1 gerbang EQR gagal-tertutup + ditegakkan server | `71a9544` |
| #195 | Ambang PPL PMK 186/2021 (30 terstruktur, cap 10) | `2f92c79` |
| #196 | PR-2a+2b independensi & etik ditegakkan server | `fe85671` |
| #197 | PR-3 atestasi mutu firma tak bisa dipalsukan | `67806ca` |

Keempat cabang sudah dihapus (remote + lokal).

**Langkah berikutnya: PR-4** — Governance berhenti menampilkan tanda tangan fiktif
(cacat B-1: `view_governance.tsx:55` merender "Disusun Anindya Pramesti · Disetujui
Hartono Wijaya" + lencana "Keyakinan Memadai" dari seed `QM_EVAL`; KPI-nya literal
JSX `value="Memadai"`). Fondasi SUDAH ADA — `canon_firm_attest.ts` tinggal dibaca.
Sekaligus C-4: `QM_COMPONENTS.risks/.defs` hardcode (Governance 87%/3 defisiensi vs
SOQM 83%/1); `mapName` yang menghitung dari data hidup sudah ditulis & tak dipakai
(`view_isqm_parts.tsx:102`).

Sesudahnya: PR-5 (rekonsiliasi PPL & rotasi — **TERBLOKIR Q5**), PR-6 (populasi &
kelayakan EQR), PR-7 (Berkas Pemeriksaan P2PK + A-7/A-8).

**UTANG: tinjauan visual Ari belum dilakukan untuk seluruh arc ini.** Seluruh
verifikasi statis + uji; nol layar dilihat berjalan. Tanyakan di awal sesi.

**SLIP saya 2026-08-12: commit `0b09734` (sinkron registri PRD) DILAKUKAN LANGSUNG
KE MASTER**, melanggar konvensi repo (jangan commit ke master). Sudah dilaporkan ke
Ari. Lain kali: ikutkan sinkronisasi registri ke dalam PR terakhir arc.

## Resep rebase pasca-squash (TERBUKTI 3× di arc ini)

```
git rev-parse origin/<cabang-basis>          # CATAT SEBELUM merge
gh pr merge <base> --squash
git rebase --onto origin/master <basis-lama>
git grep -c '^<<<<<<< ' -- migration server  # WAJIB, "Successfully rebased" tak cukup
git diff --stat origin/master..HEAD          # pastikan isi PR bawah tak bocor
npm run verify
git push --force-with-lease
gh pr edit <n> --base master
```
**Force-push MEMICU CI di repo ini** — tak perlu close+reopen (koreksi catatan lama).

---

**2026-08-12.** Ari bertanya apakah Asseris sudah mengadopsi SPM 1 & 2, lalu
"Proceed." untuk memperdalamnya agar **tahan pemeriksaan P2PK Kemenkeu**.

Jawaban struktural: ya (8 komponen ISQM 1, daur ¶25–34, EQR sebagai gerbang).
Jawaban sebenarnya: **gerbang mutu ditegakkan di UI, di atas seed yang disetel
agar tidak pernah memblokir.** 19 cacat terverifikasi di kode → PRD
`PRD - Kesiapan Pemeriksaan P2PK (SPM 1 & SPM 2 Auditable).md` (**In Progress**;
menggantikan PRD Mutu Firma Q-01/Q-03 yang kini **Superseded**).

## Temuan paling berat (semua terverifikasi verbatim, bukan dugaan)

- **Gerbang EQR fail-open pada klien PIE.** `wp_signoff.tsx:517` mengembalikan
  `{applicable:false, cleared:true}` saat tak ada baris EQR; digabung
  `eqrRequired || gate.applicable` di `view_opinion_parts` → perikatan PIE tanpa
  satu pun penelaahan LOLOS. **Ditutup PR-1.**
- **Simpulan evaluasi SPM tahunan = tanda tangan fiktif.** `view_governance.tsx:55`
  merender "Disusun Anindya Pramesti · Disetujui Hartono Wijaya" + lencana hijau
  "Keyakinan Memadai" dari seed beku `QM_EVAL`; KPI-nya literal JSX `value="Memadai"`.
  Modul ini tak pernah membaca `firmAttest`.
- **Atestasi asli tak pernah sampai server. DITUTUP PR-3.** `attestKey` memakai
  `QM_EVAL.period = '1 Jan – 31 Des 2025'`, sedangkan allow-list
  `server/src/stateAccess.ts:65` menuntut `\d{4}`. 403 ditelan
  `contexts.tsx:649` sebagai "offline" → tanda tangan hanya hidup di localStorage
  browser penandatangan.
- **`sign()` deklarasi Kode Etik** (`view_pc_conduct.tsx:47`) menandatangani id
  **siapa pun**, tanggal hardcode `'2026-03-09'`, tanpa penanda tangan.
  **DITUTUP PR-2a.** KOREKSI: ternary `items.map((_, i) => (… ? 1 : 1))` yang
  saya sebut "memalsukan jawaban" ternyata hanya **kode mati** — jalur server
  `personalSelfService.declareSelf` memakai semantik sama (tanda tangan =
  afirmasi seluruh butir; pengecualian dicatat di `exceptions`). Jangan ulangi
  klaim itu.
- **`seedDeclarations`** (`member_independence.ts:133`) menandatangani SELURUH
  roster (`signed:true`); komentarnya menyatakan maksudnya: "tanpa memblok
  penerbitan opini". Gerbang independensi tim hijau by default. **DITUTUP PR-2a**
  lewat penanda `seeded` (data seed dipertahankan, tak lagi memuaskan gerbang).
- **PPL yang dilaporkan ≠ ledger.** `PPPK_PPL` seed vs `cpeLog` persist:
  Hartono 44/22 vs **24/14**, Rudi 41/20 vs **18/12**, Sari 38/18 vs **31/22**.
  Dua AP tampil patuh padahal catatan firma menyatakan sebaliknya; UI
  (`view_pppk.tsx:158`) mengklaim keduanya terhubung — tidak.
- **Dua register rotasi bocor dua arah.** `INDEPENDENCE.rotationClient` 1:1
  padahal realitanya 1:N. Rudi×Mandiri Sejahtera Finance (6 th atas batas 3 th,
  POJK) — pelanggaran terberat — hanya ada di `PPPK_ROTATION`. Sebaliknya
  Lestari×Bank Arta (2,5/3 th) hilang dari register yang dilampirkan ke P2PK.
- **Dua modul mutu, angka berbeda**: Governance 87% / 3 defisiensi (hardcode
  `QM_COMPONENTS`) vs SOQM 83% / 1 (register hidup `SOQM_RISKS`). `mapName` yang
  menghitung dari data hidup ada dan tak dipakai.

## GOTCHA (mahal, jangan diulang)

- **`firm_attest.tsx` SUDAH ADA.** PRD pendahulu berasumsi harus dibangun —
  salah. Pola berulang di repo ini: klaim "absen" hampir selalu keliru. **Grep dulu.**
- **`capForWrite('firm', …)` default = `FIRM_ADMIN`** (`rbac.ts:174`) → setiap
  kunci firma baru gagal tulis SENYAP untuk non-partner. Butuh cabang eksplisit.
- **Empat titik perkabelan wajib untuk kunci firma baru**: `FIRM_STATE_READ_KEYS`
  (`stateAccess.ts:25`, atau regex `:65`) · cabang `capForWrite` · `SIGNOFF_KEYS`
  · stempel ISO + `byUserId` di klien. Lupa satu = 403 senyap.
- **Server BOLEH mengimpor kanon** dari `../../migration/src` — sudah dipakai
  `rbac`, `wp_chain`, `aje_contract`. Ini jalur SSOT yang benar untuk aturan gerbang.
- `signoffContextNeeds` semula hanya mendukung saudara **se-scope**. PR-1
  menambah `firmSiblingKeys` + `firmSiblings`/`scope`/`scopeId` pada
  `SignoffContext`, dan `loadSignoffContext(..., firmId)` dari `ctx.user.firmId`.
- Pesan `expert-gate:context-missing` **diganti** `signoff:context-missing` —
  pemeriksaan itu kini menjaga dua gerbang.
- **`git add -A` menyapu berkas untracked milik Ari** (`PERSONAS.md`) ke dalam
  commit. Periksa `git status` dulu, atau `git add` per-path.
- **Aturan yang TAK butuh konteks jangan mendeklarasikan `signoffContextNeeds`
  non-null** (walau kosong) — penjaga perkabelan generik di kepala
  `guardSignoffWrite` akan melempar `signoff:context-missing` dan menolak tulisan
  yang sah. Guard tetap jalan lewat `SIGNOFF_KEYS`; `needs` HANYA mengatur pemuatan
  konteks.
- **`npm run lint` gagal dgn "suppressions left that do not occur anymore"** bila
  perubahan MENGHAPUS `:any` → jalankan `npm run lint:any-baseline` (dari
  `migration/`). `npm run lint` TIDAK ada di root; hanya di `migration/`.
- Uji lama TIDAK patah setelah membalik fail-open → konfirmasi tak ada yang
  menjaga lapisan gerbang. Nihil uji untuk `view_isqm*`, `view_governance`,
  `firm_attest`, `view_pppk`, `view_pc_conduct`.

## Verifikasi regulasi (Ari, 2026-08-12) — menghasilkan 2 cacat BARU

- **C-5 · Ambang PPL SALAH → nasihat kepatuhan yang keliru. DITUTUP [#195](https://github.com/ari1945/Asseris/pull/195).**
  Aplikasi memakai "40 SKP, min 20 terstruktur". PMK 186/2021 Ps. 37 sesungguhnya:
  40 SKP, **min 30 terstruktur**, **maks 10 TIDAK terstruktur**; angka 20 itu
  *materi wajib* (4 pembinaan/pengawasan + 16 akuntansi/asurans) DI DALAM yang
  terstruktur. Batas atas tidak terstruktur sama sekali belum dimodelkan → "44 SKP"
  Hartono sesungguhnya 22 + min(22,10) = **32 terhitung**. Laporan realisasi PPL:
  **akhir Januari** (bukan April). Carry-forward maks 10. Kanon baru `canon_ppl.ts`.
- **C-6 · POJK 13/POJK.03/2017 SUDAH DICABUT**, digantikan **POJK 9/2023**. Masih
  dikutip di 11 tempat (`data_part1`, `data_part4`, `data_ojk`, `view_people`,
  `view_dashboard2`). **BELUM diperbaiki** — apakah POJK 9/2023 mempertahankan
  batas 3 tahun + cooling-off 2 tahun BELUM diketahui; mengganti kutipan tanpa
  memastikan substansinya = mengganti satu klaim salah dengan yang lain.
- **Yang terkonfirmasi BENAR**: PP 20/2015 Ps. 11 (5 th, jeda 2 th, untuk AP
  individual bukan KAP) · tenggat akhir April (Ps. 40 — tapi ada TIGA laporan,
  aplikasi hanya memodelkan satu) · PMK 186/2021 sebagai dasar utama.

## Keputusan Ari

- Seed yang memuaskan gerbang: **pertahankan sementara** — data tetap ada untuk
  demo, tetapi tak boleh memuaskan gerbang (deklarasi ber-provenance seed =
  *belum dinyatakan*). Dikerjakan PR-2.

## Status

- **PR-1 [#194](https://github.com/ari1945/Asseris/pull/194) TERBUKA** — commit
  `9a41b46`, cabang `feat/p2pk-pr1-eqr-gate-failclosed`. `npm run verify` HIJAU
  (1283 uji frontend, 411 server). Kanon baru `canon_eqr_gate.ts`.
- **PR PPL [#195](https://github.com/ari1945/Asseris/pull/195) TERBUKA** — 8/8 CI hijau, `canon_ppl.ts` + 16 uji, cabang `fix/p2pk-ppl-pmk186-thresholds` (dari master, TIDAK bertumpuk dgn #194).
- **PR-2a [#196](https://github.com/ari1945/Asseris/pull/196) TERBUKA** — 8/8 CI hijau,
  **bertumpuk di atas #194** (base `feat/p2pk-pr1-eqr-gate-failclosed`, karena keduanya
  menyentuh `server/src/signoff.ts`). Seed `seeded` · gerbang etik fail-closed ·
  `by`/`byUserId` pada deklarasi · `sign()` hanya baris sendiri. **DUA oracle uji
  dibalik** (keduanya memaku cacat sebagai perilaku benar). Ratchet `:any` 42→40.
- **PR-2b SELESAI** (commit `6b33a48`, di PR #196 yang sama) — penegakan SERVER
  `pc.ethics` & `memberIndep.v1` (cacat A-4 DITUTUP). `pc.ethics`: baris harus
  milik aktor (`ethics-decl:not-own`) + atribusi + sesi tak terpetakan ditolak.
  `memberIndep.v1`: berkunci NAMA (tak dapat diikat ke sesi — nama lossy), jadi
  yang ditegakkan ATRIBUSI atas transisi "mulai memuaskan gerbang"
  (`signed && !seeded`) — pencucian seed ikut tertutup. `SignoffContextNeeds.actorEmpId`
  baru; `declareSelf` kini merekam `by`/`byUserId`. 423 uji server (+12).
- **PR-3 [#197](https://github.com/ari1945/Asseris/pull/197) TERBUKA** — 8/8 CI hijau,
  **bertumpuk di atas #196** (rantai: #194 ← #196 ← #197). Kanon `canon_firm_attest.ts`:
  kunci 4-digit (lolos allow-list) · `contentHash` (tanda tangan GUGUR saat kesimpulan
  diubah) · rantai DUA lapis ¶20(b) SIGNOFF_REVIEWER → ¶20(a) FIRM_ADMIN ·
  `capForWrite` cabang `firmAttest.` · penegakan server lewat predikat `isSignoffKey`
  (kunci dinamis tak bisa jadi anggota Set). Temuan baru: hero KV SOQM juga jatuh ke
  seed `master.approvedBy`/`master.date` saat belum ditandatangani — dicabut.
- **PR-4..7 belum**: etik/AML & independensi tim · atestasi mutu firma ·
  Governance berhenti berbohong · rekonsiliasi PPL & rotasi · populasi &
  kelayakan EQR · Berkas Pemeriksaan P2PK.

## Menunggu Ari (Open Question PRD §12)

1. **Q5 (BARU, MEMBLOKIR PR-5): substansi POJK 9/2023** — apakah batas 3 tahun
   buku + cooling-off 2 tahun untuk sektor jasa keuangan masih berlaku?
2. Q3 Governance saat belum ditandatangani — "Belum dievaluasi" atau sembunyikan?
   (diputuskan saat PR-4)
3. Q4 `AJE_EQR_THRESHOLD` Rp 2 M → turunan materialitas atau tetap konstanta?
   (diputuskan saat PR-6)

Terkait: [[asseris-sa620-expert-gate-server]] (pola gerbang dokumen-saudara yang
ditiru), [[asseris-wp-signoff-integrity]] (identitas tanda tangan),
[[asseris-estimasi-terfalsifikasi-arc]] (pencabutan seed karangan menggeser agregat).
