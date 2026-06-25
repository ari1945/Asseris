# PRD — Override Gerbang Fase = Partner-only (Q4 follow-up)

| Field | Isi |
|---|---|
| Tanggal | 2026-06-25 |
| Pemilik | Ari Widodo |
| Status | Disetujui ("buat follow-up RBAC override Partner-only") |
| Asal | PRD `prd-acceptance-to-engagement-flow-sa210.md` §11 Q4; ditemukan saat M5 |

## 1. Problem
Transisi fase engagement (`usePhaseGate`) memunculkan dialog gerbang. Bila ada **blocker** (prasyarat tak terpenuhi), dialog menawarkan **override** ("Lanjutkan"/"Tetap arsipkan") yang menembus gerbang dan ter-log. **Siapa pun** yang bisa menyentuh papan dapat meng-override — termasuk masuk Eksekusi tanpa akseptasi/surat (SA 210/220) atau **mengarsipkan** (mengunci) engagement dengan WP belum lengkap/opini belum final. Tidak ada batasan peran atas tindakan otoritatif ini.

## 2. Objective
Override gerbang (maju fase **meski ada blocker**) hanya boleh oleh **Partner**. Maju fase saat **semua prasyarat terpenuhi** tetap terbuka (tindakan rutin). Konsisten dgn invarian SoD (BUILD.md): tindakan otoritatif = gate UI `can(peran.cap)`.

## 3. Success Criteria
1. Cap baru `PHASE_OVERRIDE` (Partner-only) di `rbac.ts` + terkunci di `rbac.test.ts`.
2. `PhaseGateDialog`: bila `blockers>0` & **bukan** Partner → tombol override **disabled** + nota "perlu Partner". Bila tak ada blocker → perilaku lama (siapa pun lanjut).
3. Berlaku untuk SEMUA gerbang via `usePhaseGate` (Eksekusi · Finalisasi · Arsip).
4. Defense-in-depth: `usePhaseGate.confirm()` menolak override bila tak berwenang (bukan hanya UI disable).
5. `typecheck 0 · lint 0 · test hijau · build ✓`.

## 4. Scope
- `CAP.PHASE_OVERRIDE` + grant Partner-only + test matrix.
- Gate override di `PhaseGateDialog` (disable + nota) + guard di `confirm()`.

## 5. Non-Scope
- **Tidak** menggate maju-fase saat prasyarat terpenuhi (rutin).
- **Tidak** menggate konfirmasi arsip tanpa-blocker (itu konfirmasi, bukan override; otoritas riil = opini final Partner yg sudah disyaratkan).
- **Tidak** penegakan server-side penuh "override butuh Partner" (lihat §9 — batas jujur).

## 6. Constraints
ESM-only; ratchet no-explicit-any; pola `can()` dari `rbac` (SSOT UI+server).

## 7. Existing Solutions
`rbac.ts can()` + pola gate UI sudah ada (sign-off, akseptasi). `usePhaseGate.confirm()` sudah `logActivity('gate-override')`. Hanya kurang **batasan peran** atas override.

## 8. Proposed Approach
Cap baru `PHASE_OVERRIDE` (eksplisit > reuse FIRM_ADMIN — semantik jelas & testable). `PhaseGateDialog` panggil `useAuth().can(PHASE_OVERRIDE)`; saat `blocked && !canOverride` → tombol disabled + nota. `confirm()` guard: abaikan bila blocker & tak berwenang.

## 9. Risks / Batas jujur
- **Server tetap menggate tulis `engagements` di `ENGAGEMENT_MANAGE`** (Partner+Manager), BUKAN "override butuh Partner". Jadi Manager yang sengaja memanggil API langsung masih bisa memaksa fase. Penegakan server penuh = server harus menghitung ulang kelengkapan gerbang (kompleks) → ditunda. **Backstop:** perubahan fase tercatat di jejak audit server (W10, hash-chained). Gating UI menutup jalur normal; ini perbaikan bertahap, dinyatakan jujur.
- Lintas-potong: menyentuh gerbang Arsip juga (disengaja — override arsip pun layak Partner-only).

## 10. Implementation Plan
1 commit: cap + test + dialog/confirm guard. Gate hijau. Branch `feat/phase-gate-override-rbac` → PR terpisah.

## 11. Open Questions
- (Default diambil) Cap = **baru** `PHASE_OVERRIDE`, bukan FIRM_ADMIN. Ubah bila Anda mau reuse.
