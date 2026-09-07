---
name: asseris-sensus-cabang-2026-08-27
description: "Sensus 26 cabang lokal 2026-08-27 — hanya 6 memikul kerja tak tergantikan, 20 squash-twin (9 akan MEREGRESI master); \"N ahead\" salah di 20 dari 26"
metadata: 
  node_type: memory
  type: project
  originSessionId: 45355f13-7254-4d3f-bfa9-592ed5b3fd18
  modified: 2026-08-27T09:11:18.941Z
---

Sensus penuh 2026-08-27 terhadap `origin/master` `952392a`, dengan perbandingan **hash
blob** (bukan `git log`/`git cherry`/"N ahead" — ketiganya salah di **20 dari 26** cabang
karena master menerima PR lewat squash).

**ENAM cabang memikul kerja yang BENAR-BENAR absen di master** — semuanya masih ada per
2026-08-27, belum di-push ke GitHub:

| Cabang | Isi | Catatan |
|---|---|---|
| `claude/intelligent-keller-7b28db` | Export-identity SSOT (F-1/F-2), 97 berkas | ✅ P0-nya (commit `5d4a9af`, lampiran SA 580/720) sudah dicherry-pick & MENDARAT lewat **PR #317** `405cc67`. **Tiga commit F-1/F-2 masih tertinggal** — butuh rebase ke master terbaru, PR terpisah. Lihat [[asseris-eng-fallback-kelas-tulis]] |
| `fix/regref-tahap-a2` | R1–R4 regref; katalog 6 → 9 set | membatalkan vonis "27-regref siap dikerjakan" |
| `fix/hcm-penilaian-karangan` | H1/H2 + `hcm_derive.ts` (+300) & uji (+290) | membatalkan vonis "15-hcm siap dikerjakan" |
| `fix/firmgl-rekonsiliasi-ekspor` (`daee729`) | `firm_gl_export.ts` + badge tie-out + ekspor tersegel | **sedang diduplikasi** sebagai berkas untracked di dir kerja utama |
| `fix/newdisc-pilar-dua-turunan` | mesin turunan Pilar Dua + 2 gerbang | master `view_newdisc.tsx:26` masih `P2_JURIS` karangan |
| `claude/fervent-tharp-227ee5` | `canon_smm_period.ts` — tahun atestasi SOQM ¶53 | mencabut fallback `new Date().getFullYear()` di 3 modul |

**⛔ SEMBILAN dari 20 squash-twin akan MEREGRESI master bila di-merge** — isinya sudah
mendarat, dan satu-satunya delta yang tersisa menunjuk **MUNDUR**: hex mentah yang sudah
ditokenkan (#311/#313), 88 baris uji e2e a11y terhapus, ratchet `:any` melonggar, 54 baris
revisi template 2026-08-24 hilang, entri fase `opening: 'Eksekusi'` terhapus, geometri
avatar pra-lantai-11px kembali. **Jangan merge cabang lama "untuk aman"** — periksa arah
diff dulu. `fix/firmgl-apar-subbuku` leluhur murni (nol berkas berbeda), aman dihapus.

**Pelajaran yang menggigit dua kali dalam satu sesi:** memeriksa `origin/master` saja
TIDAK cukup untuk memvonis "cacat masih hidup ⇒ siap dikerjakan". Perbaikannya bisa sudah
ada, menganggur di cabang lokal. Periksa **tiga** tempat: `origin/master` · cabang lokal
(`git for-each-ref refs/heads/`) · `git status --short`. Ini pengulangan
[[asseris-invprop-ssot-kedua]] dan [[asseris-git-cherry-squash-palsu]].

**Status `00-LANJUTKAN.md` terbukti BASI BERAT** — menyatakan Gelombang 1–7 "belum",
padahal **17 dari 25 prompt sudah mendarat**. Biayanya nyata: duplikasi `firm_gl_export.ts`
di atas. Diperbaiki di **PR #316** (`docs/status-lanjutkan-terverifikasi`, `de653ab`,
dokumentasi saja) — dibuka 2026-08-27, CI start normal, `MERGEABLE`. Worktree-nya di
`.claude/worktrees/status-lanjutkan`, hapus setelah mendarat. Rinciannya:
[[asseris-arc-prompt-perbaikan-modul]].

**Prioritas berbalik:** bukan menulis prompt Gelombang 4–6, melainkan mendaratkan enam
cabang di atas. Kapasitas eksekusi (termasuk cloud) bukan hambatannya — lihat
[[asseris-cloud-session-batas]].


---

## PERBARUAN 2026-08-28 — enam menjadi SATU

Sensus ulang terhadap `origin/master` **`8ce8e8e`** (W0 tuntas), 38 cabang lokal.
Metode diperketat: untuk tiap berkas yang disentuh cabang, bandingkan **tiga** blob —
merge-base, cabang, master. Berkas dihitung **BARU** hanya bila `base == master`
(master belum menyentuhnya) **dan** `cabang != master`. Ini memisahkan "kerja yang
benar-benar absen" dari "cabang sekadar tertinggal", yang `beda != 0` saja tak bisa.

**Hasil: hanya SATU cabang memikul kerja absen di master.**

| Cabang | BARU | Isi |
|---|---|---|
| `claude/intelligent-keller-7b28db` (`3d88e81`) | **21 berkas** | F-1/F-2 identitas ekspor dari SSOT — `export_pdf/xlsx`, `cockpit_report`, `view_bi`, `view_cockpit`. Tiga commit (`0664b3e` PRD · `61821ab` F-1 · `3d88e81` F-2); commit keempat `5d4a9af` sudah mendarat lewat #317 |

Lima dari enam cabang sensus 2026-08-27 **sudah mendarat lewat gelombang W0**
(#318 firmgl · #319 hcm · #320 smm · #321 newdisc · #322 regref). `fix/newdisc-pilar-dua-turunan`
dan `claude/fervent-tharp-227ee5` bahkan **sudah tak ada** secara lokal. Ke-30 cabang
sisanya BARU=0.

⚠️ **BARU=0 bukan bukti mutlak "boleh dihapus".** Artinya: tiap berkas yang disentuh
cabang itu juga disentuh master sesudah merge-base. Itu konsisten dengan "master
menyalip", tapi tak menutup kemungkinan master mengubah berkas yang sama karena alasan
LAIN sementara ide cabangnya tak pernah mendarat. Untuk 30 cabang itu vonis "mendarat"
bersandar pada catatan pendaratan per-arc di MEMORY.md, bukan pada sensus ini sendiri.

**Antrean PR: kosong dari fitur.** Hanya #323/#324/#325 (dependabot).

**Kerja belum-commit di worktree utama** (cabang `fix/timebudget-engagement-isolation`
`e205b77`, yang **tertinggal** dari master):
- 4 berkas dimodifikasi, **+288/−30 vs HEAD cabang** — hampir semuanya `view_firmgl.tsx` (+287).
- 9 berkas untracked **absen di master**, ±1.314 baris (`home_composition` · `mytasks_derive` ·
  `wip_adj` · `use_firm_subledger` · `a11y_anchor_href.test` · `wip_writedown_authority.test` ·
  `server/src/__tests__/mytasks_scope.test`).
- 5 berkas untracked **byte-identik** dengan master (`apar_ratios`, `apar_register.test`,
  `firm_gl_conventions.test`, `firm_gl_export`, `firm_gl_export.test`) — duplikat murni,
  sisa dari duplikasi yang dicatat di atas. 1 lagi (`apar_conventions.test.ts`) BEDA dari master.

Sesi lain masih menulis di worktree itu — **jangan commit/hapus apa pun di sana**.
