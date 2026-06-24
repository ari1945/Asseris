# PRD — SA-01 (sempit): Sign-off Akseptasi & Surat Perikatan ber-jejak

**Status:** DRAFT — menunggu sign-off ("Proceed.")
**Branch:** `sa01-acceptance-letter-signoff` (off master pasca-merge PR#19)
**Sumber gap:** Matriks Gap auditor, baris **SA-01** (SA 210 · Tinggi · P1).

---

## 1. Problem & koreksi klaim
Matriks SA-01 berbunyi: *"Tidak ada generator surat perikatan; hanya implisit di strategy/onboarding… Buat generator surat perikatan + arsip ber-tanda tangan."*

**Klaim itu USANG** (bukti pra-W5, 18 Jun — mendahului build). Verifikasi langsung:
- **`StepLetter`** (view_onboarding2.tsx) — generator surat perikatan **sudah ada**: versioning, preview surat penuh (ruang lingkup, tanggung jawab, fee, akses), alur tanda tangan **TTE PSrE/PrivyID + e-Meterai**, log peristiwa `esign[]`, status draft/sent/signed, export PDF.
- **`StepAcceptance`** (view_onboarding.tsx) — akseptasi/keberlanjutan: skor faktor, verdict, sign-off (`approved/approver/date/safeguard`), buka-kembali.

Jadi rekomendasi matriks ("buat generator") **sudah terpenuhi**. Sisa gap = **sempit** (sesuai catatan internal): sign-off sisi-AUDITOR **tidak ber-jejak ke identitas terautentikasi, tanpa RBAC, dan bukan append-only**:

1. **Tidak ber-jejak user login** — approver akseptasi = `p.partner` (string data prospek, hardcoded); peristiwa `esign.who` = `p.manager`/`p.name` (string), **bukan** `useAuth().user`.
2. **Tanpa RBAC** — tak ada `can(...)` gate; siapa pun (UI) bisa klik "Setujui"/"Terbitkan". Padahal server **sudah** menggate tulis `prospects` (firm-scope) di balik **FIRM_ADMIN** → tulisan non-Partner **ditolak diam-diam** (flush-catch). UI & server **tidak selaras**.
3. **Bukan append-only** — "Buka kembali untuk edit" mengembalikan `approved:false` → jejak persetujuan sebelumnya hilang; tak ada trail siapa-membuka-kapan.

## 2. Objective
Jadikan sign-off **akseptasi** & **otorisasi internal surat perikatan** (sisi KAP, beda dari tanda tangan klien): (i) **ber-jejak ke user terautentikasi**, (ii) **RBAC-gated** selaras server, (iii) **append-only audit trail** (approve/reopen terekam, tak menghapus jejak) — pola **Q-03a** (independensi). Memperkuat prakondisi & otoritas SA 210 ¶9–10.

## 3. Success Criteria
1. **Akseptasi**: "Setujui" → `approver` = nama user `useAuth()` (bukan `p.partner`); tombol **disabled** bila role tak berkapabilitas; setiap approve/reopen menambah entri `trail[]` `{action, by, at}` (append-only) — record lama tak dimutasi/dihapus.
2. **Surat perikatan**: peristiwa otorisasi internal (generate/kirim/terbitkan) merekam **user login** sebagai `who` (sisi-KAP). Tanda tangan **klien** (Direksi) + TTE/Meterai **tetap** apa adanya (itu pihak klien).
3. **RBAC selaras server**: gate UI memakai kapabilitas yang sama dengan gate server `prospects` (lihat Open Q1) → tak ada lagi "klik berhasil di UI tapi ditolak server".
4. Backward-compat: prospek lama (tanpa `trail`) tetap termuat (default `[]`); approver string lama tetap tampil.
5. Gate: tsc 0 · eslint 0 (nol :any baru) · vitest hijau.

## 4. Scope
- `view_onboarding.tsx` `StepAcceptance` — sign-off ber-jejak + RBAC + `trail[]` append-only.
- `view_onboarding2.tsx` `StepLetter` — `esign.who` = user login utk peristiwa sisi-KAP + RBAC gate "Terbitkan/Tandatangani (internal)".
- Tambah `useAuth` + `can` (rbac) ke kedua view; tipe entri trail.

## 5. Non-Scope
- **Tidak** membangun generator surat (sudah ada).
- **Tidak** mengubah TTE PSrE/PrivyID, e-Meterai, atau tanda tangan **klien** (pihak eksternal).
- **Tidak** memecah server-gate `prospects` agar Manager bisa intake (over-restriksi FIRM_ADMIN saat ini = isu persist-scope terpisah; lihat §9).
- Tidak mengubah skor faktor/verdict akseptasi (logika sudah ada).

## 6. Constraints
- ESM `migration/src`; full strict tsc; ratchet no-explicit-any (catatan: kedua view kemungkinan punya baseline `:any` — tipekan kode BARU, jangan tambah :any).
- **Append-only**: trail hanya di-`push`, tak pernah di-edit/hapus (immutability semantik).
- Selaras gate server (jangan ciptakan UI yang server tolak diam-diam).

## 7. Existing Solutions (reuse)
- `StepAcceptance`/`StepLetter` (enrich in-place, bukan bangun ulang).
- **Q-03a** `indepAppr` — pola append-only `{steps:[{by,at}]}` ber-jejak (view_people) → cetak biru langsung.
- `rbac.ts` `CAP` + `can()`; `useAuth()` (nama user terautentikasi).

## 8. Proposed Approach
1. Tambah `useAuth`/`can` ke kedua view; helper `me = auth.user.name`.
2. **StepAcceptance**: `setAcc(approved:true)` → `approver: me`, `date: today`, dan `trail: [...trail, {action:'Disetujui ('+decision+')', by: me, at: today}]`; reopen → `{action:'Dibuka kembali', by: me, at: today}` (approved:false TAPI trail dipertahankan). Tombol approve/reopen `disabled={!can(CAP.X)}`. Render trail ringkas.
3. **StepLetter**: peristiwa generate/kirim/terbitkan `who: me` (sisi-KAP). Gate tombol otorisasi internal `disabled={!can(CAP.X)}`. Klien-sign tak disentuh.
4. Backward-compat normalizer (`trail` default `[]`). Gate + verifikasi live (role Partner vs non-Partner → tombol ter-gate; approve ber-jejak nama login).

## 9. Risks & Mitigasi
- **Server-gate `prospects` = FIRM_ADMIN** → UI gate harus selaras; bila pilih kapabilitas selain FIRM_ADMIN, tulisan tetap ditolak server. **Mitigasi:** default gate = FIRM_ADMIN (Open Q1), ATAU (lebih luas) pindahkan ke kapabilitas lain DAN sesuaikan `capForWrite` server — keputusan Ari.
- **Over-restriksi intake Manager** (tak bisa data-entry prospek) = isu terpisah; **flag**, jangan selesaikan di sini.
- **Append-only vs UX** → "buka kembali" tetap boleh (alur ada), hanya jejaknya diabadikan.
- Backward-compat shape prospek lama.

## 10. Implementation Plan
1. `StepAcceptance` ber-jejak + RBAC + trail. Gate.
2. `StepLetter` provenance user + RBAC otorisasi internal. Gate.
3. (opsional) uji unit helper trail/normalizer. Verifikasi live (Partner & Manager). PRD commit + PR.

## 11. Open Questions (default bila tak dijawab)
1. **Kapabilitas gate akseptasi & otorisasi surat:** (a) **FIRM_ADMIN** *(default — selaras gate server `prospects` sekarang; Partner-only; tanpa ubah server)*; (b) `ENGAGEMENT_MANAGE` (Partner+Manager) → **butuh** ubah `capForWrite` server agar tak ditolak; (c) CAP baru `ACCEPTANCE_APPROVE`. *(Default: a — paling aman & konsisten.)*
2. **Lingkup append-only:** (a) trail untuk approve+reopen akseptasi *(default)*; (b) + trail otorisasi surat (selain `esign` yg sudah append).
3. **Isu intake Manager (over-restriksi `prospects` FIRM_ADMIN):** catat sebagai temuan terpisah *(default)* atau tangani sekalian (memperluas scope + ubah server). *(Default: catat saja.)*

---
**Keputusan diminta:** "Proceed." (default Open Q) untuk mulai, atau koreksi scope/Open Q. Setelah SA-01 ini, daftar gap inti auditor pada dasarnya tertutup.
