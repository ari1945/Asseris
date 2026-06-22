# PRD — Gerbang Fase Lifecycle Engagement (P5)

> Wajib diisi sebelum implementasi. Implementasi TIDAK dimulai sebelum sign-off (**"Proceed."**).
> Stream: lanjutan dari [[neosuite-ams-p1-conclusions]] & [[neosuite-ams-p2-wp-signoff]] (keduanya SELESAI).
> Acuan gap: `Evaluasi Fitur NeoSuite AMS - Gap & Pendalaman.md` §4 (P5) & §7 (urutan).

| Field | Isi |
|---|---|
| Tanggal | 2026-06-18 |
| Pemilik | Ari Widodo |
| Status | **DRAFT — menunggu sign-off** |
| Engagement ID terkait | (lintas-engagement; demo `ENG-2025-014`) |

---

## 1. Problem
Model fase audit **sudah ada** (`Perencanaan→Eksekusi→Finalisasi→Arsip`, dipetakan ke
status `Planning→Fieldwork→Review→Completed` di `contexts.jsx:71`), dan `firm.locked` sudah
diturunkan dari fase `Arsip`. **Tapi tiap transisi fase tak bergerbang:**

- `view_firm.jsx:325` (drag-drop) & `:404` (tombol radio) mengizinkan lompat ke **fase mana pun
  — termasuk `Arsip`** — tanpa prasyarat apa pun. Engagement bisa "diselesaikan/diarsipkan"
  meski masih ada catatan review terbuka, WP belum ditandatangani, atau opini belum difinalisasi.
- "Gate Kesiapan Opini & EQR" di cockpit (`view_cockpit2.jsx:657-732`) **hanya tampilan**:
  menghitung `ready/gate.length` untuk gauge, tapi **tak memblokir apa pun**. Kriteria 6/7/8
  di-hardcode. `WpCompletenessRecap` ditampilkan **di sebelah** gate, tapi bahkan **bukan**
  kriteria gate.
- Satu-satunya gerbang nyata adalah finalisasi opini (`view_opinion_parts.jsx:496`,
  `canFinalize`), tapi itu **tak menggerakkan fase engagement**, dan reopen bebas.

Akibatnya: kelengkapan WP yang susah payah dibangun di P1/P2 (sign-off + bukti + kesimpulan
SA 230) **tak mengikat** lifecycle. Tidak ada jaminan prosedural bahwa "selesai" berarti
benar-benar lengkap (relevan **ISA 220/ISQM 1-2 · SA 230 · SA 700**: berkas tak boleh
ditutup/diarsipkan sebelum review & dokumentasi rampung).

## 2. Objective
Jadikan transisi fase **bergerbang oleh kelengkapan kertas kerja yang sudah terukur** (SSOT
`wpState` + `wpCompletenessFor` + catatan review + finalisasi opini), sehingga maju ke
`Finalisasi`/`Arsip` mensyaratkan prasyarat terpenuhi. **Memakai ulang data & pola yang sudah
ada** (registry P1/P2, soft-gate, `WpCompletenessRecap`) — bukan store/state-machine baru.
Gate harus **konsisten dengan budaya "lock LUNAK"** P1/P2: memandu & memperingatkan, dengan
gerbang lebih tegas (konfirmasi) hanya pada titik tak-mudah-balik (`Arsip`).

## 3. Success Criteria
- Helper murni `engagementGate(audit, firm, moduleIds)` mengembalikan, untuk fase berikutnya,
  daftar prasyarat + status `met/unmet` (dari data nyata: WP ter-review %, WP berkesimpulan %,
  catatan review terbuka, opini `finalized`).
- Transisi `setEngagementPhase` ke `Finalisasi` & `Arsip` melewati gerbang ini di **kedua**
  titik kontrol UI (`view_firm.jsx` drag + radio) — bukan hanya satu.
- Gate cockpit (`view_cockpit2.jsx`) memakai **sumber kriteria yang sama** (tak lagi hardcode/
  display-only untuk dimensi WP); WP completeness menjadi kriteria gate sungguhan.
- Kekuatan gate sesuai keputusan §11-Q1 (rekomendasi: peringatan untuk Eksekusi/Finalisasi;
  **konfirmasi-wajib + ringkasan blocker** untuk `Arsip`). Override tetap mungkin (lock LUNAK),
  tapi tercatat (mis. `logActivity`).
- Gate teknis: `lint`/`typecheck`/`build` hijau; **canon tak tersentuh (49 test)**; 0 console
  error; diverifikasi live (Vite :5180) di ≥2 titik (firm board + cockpit).

## 4. Scope (Fase 1 — batch pertama, efek paling terasa)
- **Helper gerbang** `engagementGate(...)` di lapisan WP kanonik (`wp_signoff.jsx`, satu rumah
  dgn `wpCompletenessFor`) — fungsi murni, registry-driven.
- **Penegakan di `view_firm.jsx`**: bungkus dua titik `setEngagementPhase` (drag `:325` + radio
  `:404`) dengan cek gerbang + dialog/peringatan saat prasyarat belum terpenuhi.
- **Penyatuan gate cockpit**: ganti dimensi WP yang display-only/hardcode dgn kriteria nyata
  dari helper yang sama (SSOT — hapus duplikasi logika).
- **Komponen ringkasan blocker** `EngagementGateSummary({nextPhase})` (drop-in) — daftar
  prasyarat unmet + tautan "buka modul" untuk menyelesaikannya.

## 5. Non-Scope
- **Cross-module review-note flow & engagement-scoping** catatan review (saat ini global,
  `reviewNotes` tanpa `engagementId`) → **Fase 2 P5** (lebih besar, butuh keputusan model data).
- Task management nyata (`taskState` map kini minim/tak dipakai tampil) → di luar P5 Fase 1.
- W6 / backend (tetap `localStorage`, warisan P1/P2).
- Hard-block mutlak tanpa override (bertentangan dgn lock LUNAK; lihat §11-Q1).
- Kriteria gate non-WP yang masih demo (going concern/subsequent 6/7/8) — biarkan apa adanya
  kecuali keputusan §11-Q3.

## 6. Constraints
`localStorage` (bukan W6) · ESM-only edit `migration/src/*` · aturan emas anti-tabrakan (alias
hook unik, ekspor `window`, `app.jsx` terakhir) · figur/kelengkapan dari SSOT (`wpState` via
`wpCompletenessFor`, `AMS_CANON`) — jangan hardcode ulang · **PRD dulu**.

## 7. Existing Solutions / yang dipakai ulang
- **Model fase**: `PHASE_STATUS` + `setEngagementPhase` + `firm.locked` (`contexts.jsx:71-102`).
- **Kelengkapan WP**: `wpCompletenessFor` / `WpCompletenessRecap` (`wp_signoff.jsx`, P1/P2) —
  sudah menghitung sign-off %, bukti %, kesimpulan % dgn dedup per ref.
- **Catatan review**: `reviewNotes` + `resolveReviewNote` (`contexts.jsx:110-119`).
- **Finalisasi opini**: `canFinalize`/`finalize` + mirror `wpState['900']` (`view_opinion_parts.jsx`).
- **Gate cockpit (display)**: array `gate` (`view_cockpit2.jsx:657`) — tinggal disambung ke helper.
- **Soft-gate pattern**: peringatan amber SA 230 di `WpSignoff` (P1) sebagai cetakan UX.

Custom work yang dibenarkan = **hanya** lapisan gerbang tipis yang mengikat semua ini; tak ada
mesin/state baru.

## 8. Proposed Approach
1. **`engagementGate(audit, firm, moduleIds, nextPhase)`** (murni) → `{ phase, criteria:[{key,
   label, met, detail, view?}], blockers, allMet }`. Kriteria per fase:
   - → `Finalisasi`: WP ter-review ≥ ambang, tak ada catatan review prioritas tinggi terbuka.
   - → `Arsip`: opini `finalized` = true, **semua** WP kunci ter-review, WP berkesimpulan ≥
     ambang, tak ada catatan review terbuka. (Ambang = §11-Q2.)
2. **Bungkus transisi** di `view_firm.jsx`: sebelum `setEngagementPhase(id, target)`, panggil
   gate; bila `!allMet` → tampilkan `EngagementGateSummary` (peringatan untuk Eksekusi/Finalisasi;
   konfirmasi-wajib untuk Arsip). Override → tetap lanjут + `logActivity({type:'gate-override'})`.
3. **Satukan cockpit**: dimensi WP pada array `gate` ditarik dari helper yang sama (hapus
   hardcode/double-source). Gauge & daftar kriteria jadi konsisten dgn firm board.
4. **`EngagementGateSummary`**: daftar blocker + tombol `nav(view)` ke modul terkait.

## 9. Risks
- **Bertentangan dgn lock LUNAK** (P1/P2 sengaja lunak) → mitigasi: graduated gate (warn →
  confirm), override selalu tersedia & tercatat; tak ada hard-block buntu.
- **Scope sprawl** (state-machine, note-flow, tasks) → mitigasi: Fase 1 HANYA gerbang fase +
  penyatuan cockpit; note-flow/scoping & tasks ditunda ke Fase 2/ luar P5.
- **Dua sumber kebenaran gate** (cockpit vs firm) → mitigasi: satu helper, dipakai dua tempat.
- **Demo data menyesatkan** (kriteria 6/7/8 hardcode) → mitigasi: jangan klaim gate "nyata"
  untuk dimensi yang masih demo; beri label jelas / sisihkan (Q3).
- **Catatan review global** (bukan per-engagement) → kriteria "catatan terbuka" bisa over-count
  lintas engagement → mitigasi: dokumentasikan keterbatasan; scoping = Fase 2.

## 10. Implementation Plan (bertahap, pola P1/P2)
- **Fase 0:** helper `engagementGate` + `EngagementGateSummary` (tanpa penegakan) + unit ekspos
  ke `window`. Verifikasi nilai gate vs data demo.
- **Fase 1:** penegakan di `view_firm.jsx` (drag + radio) dgn graduated gate + override tercatat.
- **Fase 2:** satukan gate cockpit ke helper yang sama (hapus hardcode/double-source dimensi WP).
- **Fase 3 (opsional):** tawaran auto-advance ke `Arsip` saat opini `finalize`.
- Tiap fase: `lint`/`typecheck`/`build` + verifikasi browser + commit + update memory.
- **Fase 2 P5 (terpisah, butuh PRD sendiri):** engagement-scoping `reviewNotes` + cross-module flow.

## 11. Open Questions (perlu keputusan sebelum "Proceed.")
1. **Kekuatan gate** — (a) peringatan lunak di semua transisi (konsisten penuh dgn lock LUNAK
   P1/P2), (b) **graduated**: warn untuk Eksekusi/Finalisasi + konfirmasi-wajib (boleh override
   tercatat) untuk `Arsip`, atau (c) hard-block ke `Arsip` tanpa override.
   *(rekomendasi: (b) graduated — hormati lock LUNAK tapi `Arsip` = titik lock, layak konfirmasi.)*
2. **Ambang kelengkapan** untuk lolos → `Finalisasi`/`Arsip` — 100% WP ter-review, atau ambang
   (mis. ≥90% + 0 catatan prioritas tinggi)? *(rekomendasi: Arsip butuh 100% ter-review + opini
   final + 0 catatan terbuka; Finalisasi cukup 0 catatan prioritas-tinggi terbuka.)*
3. **Kriteria demo (going concern/subsequent/independensi, gate cockpit 6/7/8)** — ikut digerbang,
   atau disisihkan sbg "informasional" sampai punya sumber data nyata? *(rekomendasi: sisihkan
   dulu — jangan gerbang atas data hardcode; fokus dimensi WP yang ber-SSOT.)*
4. **Cakupan modul gate** — `Object.keys(WP_MODULE_MAP)` (38 ref) atau subset "WP kunci"?
   *(rekomendasi: mulai dari seluruh map; "WP kunci" bisa diperketat nanti.)*

---
**Sign-off:** balas **"Proceed."** untuk memulai Fase 0. Bila ada Q yang ingin diubah dari
rekomendasi, sebutkan — saya sesuaikan PRD lebih dulu.
