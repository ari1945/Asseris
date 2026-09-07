---
name: asseris-estimasi-terfalsifikasi-arc
description: "Arc estimasi SA 540/PSAK 68 + Tier B nilai pakai — TUNTAS: kelima PR merged (#182..#186) + #187 docs; master 774412a, nol PR terbuka, PRD Implemented"
metadata: 
  node_type: memory
  type: project
  originSessionId: 31117346-cff3-4760-9121-fd19ff8a5783
  modified: 2026-08-12T09:27:58.582Z
---

> **TUNTAS 2026-08-12.** master `774412a`, **nol PR terbuka**, 1250 uji frontend
> + 373 server, PRD `Implemented`. **Tinjauan visual Ari: OK untuk seluruh arc
> (#182–#186)** — tak ada utang tinjauan tersisa.
>
> Satu-satunya sisa yang diketahui: gerbang pakar SA 620 ditegakkan di **lapisan
> UI**, sejajar gerbang etik/AML — bukan di server. Ia mencegah kesalahan, bukan
> menahan pihak yang berniat melanggar. Menjadikannya otoritatif = server membaca
> `estimates.v1` + `expertEval.v1` saat `state.set` pada `wpState` (pola
> `guardSignoffWrite`); butuh PRD & keputusan Ari sendiri — BELUM diminta.

Arc 5-PR untuk membuat klaim tentang estimasi akuntansi **dapat gagal**.
PRD: `docs/prd-estimasi-terfalsifikasi.md` (13 probe K1–K13). Disetujui Ari
"Proceed." 2026-08-12 beserta ketiga keputusan terbuka.

**Keputusan yang sudah diambil (jangan tanyakan ulang):**
- **Q1 = batas terdekat.** Titik manajemen DI DALAM rentang wajar auditor →
  **nol** salah saji (rentang itu sendiri zona yang dapat diterima). Salah saji
  hanya timbul di luar rentang, sebesar jarak ke batas terdekat. Kecondongan
  terhadap titik tengah tetap diukur tetapi sebagai **indikator arah ¶32**.
  Rumus lama `mgmt − midpoint` melebih-lebihkan salah saji secara sistematis.
- **Q2 = 11/11 prosedur + bukti pakar** sebelum PSAK 68 boleh menyatakan
  kesimpulan positif (PR-2).
- **Q3 = ya** — nilai pakai juga menurunkan rentang auditor E-05 di SA 540,
  bukan hanya PSAK 48 (PR-3/PR-4).

**Batas Tier A/B/C (mengikat, §5 PRD).** Tier C **tidak pernah** dibangun:
aktuaria PSAK 24, appraisal SPI/IVS, pricing derivatif CVA/DVA, ECL perbankan,
data pasar berlisensi. `FV_PORTFOLIO` tetap seed dari pakar — PSAK 68
mengagregasi, bukan mengukur; itu **benar dan disengaja**. Tier B lolos hanya
karena `valueInUse` (canon_part2.ts:447) **sudah ada & teruji**; yang kurang
cuma kemudinya (`P48` masih konstanta modul).

- **PR-1 → [#182](https://github.com/ari1945/Asseris/pull/182) MERGED** `cb6c0b9`. Tinjauan visual Ari: **OK**.
- **PR-2 → [#183](https://github.com/ari1945/Asseris/pull/183)** TERBUKA, sudah di-rebase ke master, CI 8/8 hijau.
  `canon_fv_disclosure.ts` (18 uji) + `canon_expert_eval.ts` (13 uji); `expertEval.v1`.
- **PR-3 → [#184](https://github.com/ari1945/Asseris/pull/184) MERGED** `b4e9c4d`.
  `canon_viu.ts` (16 uji) + `viuParams.v1`; `psak48()` argumen ke-4.
- **PR-4 → [#185](https://github.com/ari1945/Asseris/pull/185) MERGED** `bd20d5a`.
  `canon_range.ts` (22 uji) — tiga dasar rentang (`scenarios`/`viu`/`manual`);
  tautan HIDUP Q3 lewat `hydrateViuDerivations` (skenario 'viu' TIDAK di-persist).
- **PR-5 → [#186](https://github.com/ari1945/Asseris/pull/186)** TERBUKA, basis master. PENUTUP ARC.
  `canon_retrospective.ts` (14 uji) + gerbang pakar `expertGateBlockers` /
  `estimate_gate.tsx` (pola `useEthicsGate`). Tautan dokumen pakar memakai
  **`docUid` ke store bukti**, bukan nama berkas — tautan PUTUS bila dokumen dicabut.
- **Seluruh 13 probe K1–K13 tertutup.**

**Pola alur kerja yang disepakati Ari:** jangan menumpuk >1 PR. Merge dulu,
`git rebase --onto master <basis-lama> <branch>`, lalu `gh pr edit N --base master`,
force-push, hapus branch lama. Sesudah rebase WAJIB `grep -c "^<<<<<<< "`
(penanda konflik bisa ter-commit diam-diam) + `git diff --stat master..HEAD`
untuk memastikan tak ada isi PR sebelumnya yang bocor.

**Angka Tier B yang penting (PSAK 48, UPK Operasi Inti):** basis WACC 13,5% →
terpulihkan 172.654, headroom **+6.306 jt (3,8%)**. WACC 14,5% → 157.518,
headroom **−8.830 jt (−5,3%)**. WACC 15,0% → 150.898, headroom −15.450 →
rentang E-05 jadi 1.607–27.158 → SAD dapat EST-E-05 (1.607) → agregat
2.590→4.197 jt (**84%→136% OM**). Satu asumsi menggerakkan tiga modul.

**GOTCHA verifikasi hidup di app ini:**
- Tulisan `state.set` butuh ~1–2 dtk mendarat; **jangan navigasi tepat sesudah
  mengetik** — nilainya hilang & Anda akan salah menyimpulkan fitur rusak.
  Konfirmasi dulu lewat KPI/angka di layar, baru pindah rute.
- Sisa state percobaan bisa menyesatkan sesi berikutnya: `viuParams.v1` sempat
  tersimpan `{wacc:0.15, terminal:0.16}` (tak koheren) sehingga kanon MENOLAK
  seluruh override dan angka tampak "tak bergerak". Hook `window.fetch` untuk
  membaca body `state.set` adalah cara tercepat melihat state sebenarnya.
- Seed baru TIDAK berlaku pada perikatan yang state-nya sudah ter-persist —
  ia jatuh ke jalur warisan. Itu benar, tapi berarti demo tak menampilkan
  matriks seed sampai state di-reset.

**Pola verifikasi gerbang yang terbukti berguna:** buktikan gerbang MENUTUP
**dan MEMBUKA**, lalu cabut SATU syarat dan pastikan ia menutup lagi sambil
menyebut syarat yang tepat. Gerbang yang hanya bisa menutup sama tak berartinya
dengan yang selalu terbuka. Dipakai pada kesimpulan PSAK 68 (0/11 → 11/11+8/8 →
7/8) dan menemukan bahwa panelnya memang menyebut "V-3 saja".

**Temuan material dari PR-1.** Pencabutan baris seed `M-04` (Rp 680 jt "selisih
estimasi CKPN" yang tak berasal dari registri mana pun) menurunkan agregat demo
3.270 → 2.590 jt, yakni dari **DI ATAS** materialitas keseluruhan menjadi di
bawahnya (106% → 84%). Angka karangan itu selama ini mendorong perikatan demo
ke rekomendasi opini modifikasian SA 705.

**GOTCHA teknis:**
- **`as any` terduplikasi tanpa sadar.** Menyalin satu sel JSX ke dua cabang
  (turunan vs tersimpan) menambah 2 `as any` → baseline `view_sad.tsx` 42→44,
  lint merah, dan seluruh berkas ter-un-suppress. Perbaiki dengan komponen
  bertipe (`DispBadge`), bukan menaikkan baseline. Hasil akhir 42→**40**.
- **`-0` bocor** dari `sign * (mgmt − midpoint)` saat sign=−1 & selisih 0;
  `toBe(0)` gagal (Object.is). Normalkan `... || 0` di sumber — `-0` tercetak
  "-0" di format id-ID.
- **Satuan:** registri estimasi & kanon PSAK = **Rp juta**; `SadEntry.pbt/na` &
  materialitas penuh = **Rp penuh**. Faktor 10⁶ hidup HANYA di `canon_estimates.ts`.
- **Tool Bash ≠ PowerShell.** Here-string `@'…'@` di tool Bash menyisipkan `@`
  ke subject commit. Pakai heredoc `<<'EOF'`.

**Resep verifikasi read-only.** Untuk membuktikan sebuah view hanya MEMBACA
kunci persist (tak menyemai saat mount), hook `window.fetch` dan catat body
`state.set`, lalu navigasi masuk-keluar modul. Nol entri = read-only terbukti.
Lebih kuat daripada membaca kode.

**Utang:** tinjauan visual Ari atas baris turunan SAD (lencana ungu "SA 540",
disposisi tak dapat diklik) — Browser pane tak tampil jadi screenshot gagal.
Lihat juga [[asseris-checkpoint-platform-lain-2026-08-12]].
