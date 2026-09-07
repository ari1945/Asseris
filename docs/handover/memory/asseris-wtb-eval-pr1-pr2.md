---
name: asseris-wtb-eval-pr1-pr2
description: "Evaluasi modul WTB 2026-07-25 + PR-1 (SSOT materialitas) & PR-2 (integritas ingress) — PR #129 & #130 TERBUKA; #130 bertumpuk di atas #129"
metadata: 
  node_type: memory
  type: project
  originSessionId: 299dc037-a936-4833-b6bd-02beae63ea2f
  modified: 2026-07-25T06:44:24.214Z
---

2026-07-25 — evaluasi modul WTB lalu implementasi PR-1 & PR-2 (PRD: `PRD - WTB PR-1 SSOT
Materialitas & PR-2 Integritas Ingress.md` di root repo).

**TEMUAN TERBESAR (di luar dugaan awal):** `AMS_CANON.materiality()` membaca
`localStorage['ams.v1.mat.*']` — kunci TAK-BERLINGKUP yang sejak W6 **tak pernah ditulis
aplikasi** (`useServerState` menulis `ams.v1.<scope>.<scopeId>.<key>`; kunci lama hanya
fallback pra-W6, satu-satunya penulis = `canon_part4.test.ts`). Jadi materiality() SELALU
mengembalikan default (pmPct 75, tanpa override) → `engMateriality × 75%`, kebetulan
IDENTIK dengan hardcode di WTB. Semua permukaan sepakat bukan karena SSOT bekerja
melainkan karena SSOT-nya mati. Pelajaran: verifikasi jalur persistensi sebelum menyebut
sebuah fungsi "SSOT" — komentar di kode mengklaim peran yang tak dijalankannya.

Turunannya: `mat.*` jatuh ke lingkup 'firm' → (a) satu setelan materialitas dipakai SELURUH
perikatan padahal SA 320 ¶10-11 per-perikatan, (b) `capForWrite('firm')` default FIRM_ADMIN
→ Manajer gagal simpan SENYAP (kelas bug yang sama dgn priorYear/capacityPlan.v1).

**Status: KEDUANYA MERGED** — #129 → `0208c2d`, #130 → `33fb3de`. master bersih, 0 PR
milik kita (sisa 2 Dependabot: #116/#117).

**GOTCHA PR bertumpuk + squash-merge (penting, akan terulang):** GitHub **TIDAK**
me-retarget PR turunan saat base-nya di-*squash*-merge (retarget otomatis hanya terjadi
pada penghapusan branch). Urutan yang benar & terbukti:
1. merge base **tanpa** `--delete-branch`;
2. `gh pr edit <turunan> --base master`;
3. `git rebase --onto origin/master <branch-base> <branch-turunan>` — membuang commit yang
   sudah ter-squash sehingga diff tinggal milik PR turunan;
4. jalankan gate lokal di pohon hasil rebase;
5. `git push --force-with-lease`;
6. **baru** hapus branch base.
Menghapus branch base lebih dulu = PR turunan auto-close, bukan retarget.

**Yang dikerjakan (3 commit):**
- `feat/wtb-pr1a-materiality-ssot` → `07f8516` PR-1a: BARU `persist_scope.ts` (SSOT
  FIRM_SCOPE_ID/DEFAULT_ENG_ID + `readPersisted` rantai baca-lewat perikatan→firma→legacy→
  default, baca saja = migrasi non-destruktif); `materiality(opts.engagementId)`; 10 kunci
  `mat.*` → engagement-scope; 5 pemanggil kirim engagementId.
- `dab41f9` PR-1b: WTB/Analytical/WP/Strategy pakai `materialityFor`; `pm: number|null`
  (bukan NaN senyap); footer TOTAL diperbaiki + ikut filter; buang `window.computeWtbSummary`.
- `feat/wtb-pr2-ingress-integrity` (dari branch PR-1) → `4a907d2` PR-2: satuan TB
  dideklarasikan + gerbang magnitudo vs materialitas; BARU `wtb_provenance.ts`
  (summarizeImport/pushHistory/diffWtb); pratinjau dampak + konfirmasi dua-langkah;
  riwayat impor di dalam payload; hormati `locked`.

**SENGAJA TIDAK diubah:** `mat.memo.signoff` tetap firm-scope — memindahkannya tanpa entri
`guardSignoffWrite` akan melonggarkan otoritas dari Rekan (FIRM_ADMIN) ke WP_EDIT. Butuh
guard server dulu (PRD §11 Q2, belum diputuskan Ari).

**GOTCHA sesi ini:**
- Ratchet ESLint: menambah 3 `:any` baru meng-un-suppress SELURUH `view_execution.tsx`
  (81 error). Setelah MENGURANGI `any`, lint exit 2 "stale suppressions" → wajib
  `npx eslint src --prune-suppressions` (baseline turun 79→78, 42→41).
- `useStateX<T>()` type-arg DILARANG (tanpa @types/react) → anotasi di LHS:
  `const [unit, setUnit]: [TbUnit, (v: TbUnit) => void] = useStateX('full')`.
- `innerText` mengembalikan teks TER-RENDER: kelas `.upper` membuatnya UPPERCASE →
  regex case-sensitive meleset & saya sempat mengira panel riwayat tak dirender. Selalu
  cocokkan case-insensitive saat memverifikasi lewat innerText.
- Rute live andal: `localStorage.setItem('ams.route','wtb')` + reload — nilai RAW, bukan
  JSON.stringify (JSON menghasilkan `"wtb"` → StubView).
- Screenshot pane tetap timeout → bukti diambil dari pengukuran DOM.
- Sesi dev login sebagai **Audit Manager** (Anindya P.), bukan Partner — kebetulan
  menguntungkan: uji S3 (tulis Manajer) jadi nyata. Bukti definitif tulisan tersimpan di
  SERVER: hapus kunci cache lalu reload → nilai kembali dari StateDoc.

Terkait: [[asseris-wtb-ingress]] · [[asseris-authoritative-persist-key-recipe]] ·
[[asseris-session-2026-07-25-checkpoint]]
