# PRD — SA 240 Fraud Substantif: Register Risiko + Faktor Segitiga + Prosedur Override ter-persist + Sign-off SA 230

> Status: **DRAFT — menunggu sign-off ("Proceed.")**. Dokumen ini *merancang*, belum *membangun*.
> Stream: track **kedalaman substantif / domain persist** dari [[asseris-gap-matrix-eval]] — fraud SA 240, area risiko-audit tertinggi.
> Pola: gabungan PR#7–#11 (display-only→auditable: register editable + sign-off fiktif→WpPanel + memo) — `sa240` sudah di `WP_MODULE_MAP` (Q-02), jadi sign-off + kesimpulan SA 230 sudah ada; gap = **data domain menguap**.
> Sifat artefak: **level ENGAGEMENT** → `useAmsPersist('fraud.<engId>')`. **Verifikasi live** (recipe terbukti di PR#12).

---

## 1. Problem

Modul SA 240 (`SA240View`, 6 tab: Penilaian Risiko · Segitiga Fraud · Register Risiko · Asumsi Risiko · Respons & JET · Komunikasi) sangat kaya & menutup standar dengan baik — tetapi **pure display** (useState hanya untuk navigasi tab/seleksi; nol data editing):

- **Register risiko fraud hardcoded** (`FRAUD_REGISTER`, 5 risiko termasuk 2 presumsi wajib ¶26/¶31). Auditor tak bisa tambah/edit/ubah status — register inti penilaian fraud tak bisa jadi kertas kerja.
- **Faktor segitiga fraud tak interaktif** (`FRAUD_TRIANGLE`: tekanan/peluang/rasionalisasi, masing-masing dgn flag `on`). Tab menampilkan, tetapi auditor **tak bisa menandai** faktor mana yang teridentifikasi — padahal itu input penilaian (¶24).
- **Prosedur override wajib (¶32) hardcoded** (`OVERRIDE_PROC`, done flags statis). Tak bisa ditandai selesai.
- **Sign-off FIKTIF** (Putri Maharani/Anindya/Hartono di tab Komunikasi) — bukan SSOT.
- **Tombol inert** ("Memo Risiko Fraud", "AI Assist"). Tak engagement-scoped.

> Konsekuensi: fraud — di mana skeptisisme & dokumentasi paling kritis (inspeksi PPPK, risiko WTP) — **tak terdokumentasikan sebagai kertas kerja**: register risiko, faktor segitiga yang teridentifikasi, & prosedur override wajib menguap tiap reload.

## 2. Objective

Jadikan SA 240 **substantif & auditable**: register risiko fraud + faktor segitiga + prosedur override **editable, tersimpan, ber-jejak** engagement-scoped; sign-off kanonik (ganti fiktif); memo & lock — reuse `useAmsPersist` + `amsExportPdf` + `WpPanel`. Tab analitik kaya (penilaian risiko, JET ringkasan, retrospektif) tetap display referensi (Non-Scope kali ini).

## 3. Success Criteria

- **Register risiko fraud ter-persist & engagement-scoped:** tambah/edit/hapus risiko (uraian, jenis, asersi, akun, tingkat, signifikan, presumsi, respons, status) — bertahan reload, per-engagement, ber-jejak `{by,at}`. Header counts (jumlah/signifikan/presumsi) dari register.
- **Faktor segitiga fraud editable & persist:** auditor menandai (`on`) faktor tekanan/peluang/rasionalisasi yang teridentifikasi — bertahan reload; jumlah faktor aktif menyesuaikan.
- **Prosedur override (¶32) editable & persist:** toggle selesai per prosedur wajib — bertahan reload, ber-jejak.
- **Sign-off kanonik:** panel sign-off fiktif → `<WpPanel moduleId="sa240" />` (SSOT; sudah ter-wire Q-02).
- **Tombol:** "Memo Risiko Fraud" → `amsExportPdf` (register + faktor aktif + prosedur override + status); "AI Assist" disembunyikan.
- **Lock LUNAK:** editing terkunci saat arsip.
- Gate: `typecheck` + `lint` (ratchet utuh, **0 `:any` baru**, alias `Ev`) + **vitest hijau** (≥82) + `build`; server `typecheck`/test; 0 console err.
- **VERIFIED LIVE:** boot `dev-all` → login dev → nav `sa240` → edit register/faktor → reload → bertahan (recipe PR#12).

## 4. Scope

- **Persist** `useAmsPersist('fraud.' + engId, () => FRAUD_SEED)` = `{ register, triangle, overrideProc }`. Konteks `useFirm`/`useAuth` (engId/me/locked).
- **Register editable** (tab Register Risiko): form tambah/edit/hapus + status select, ber-jejak.
- **Segitiga editable** (tab Segitiga Fraud): toggle `on` per faktor (lock-aware), persist.
- **Override ¶32 editable** (tab Asumsi Risiko): toggle `done` per prosedur, persist.
- **`WpPanel`** ganti panel sign-off fiktif (tab Komunikasi); wire "Memo"; sembunyikan "AI Assist".
- Reuse: `WP_MODULE_MAP` (sa240 ada), `WpPanel`, `useAmsPersist`, `amsExportPdf`, alias `Ev`.

## 5. Non-Scope

- **Tab Penilaian Risiko** (langkah proses, anomali analitis, inquiry status) — display referensi; persist = follow-up.
- **JET ringkasan & eksepsi** (tab Respons & JET) + **telaah retrospektif estimasi** (tab Asumsi) — display; persist register JET/eksepsi = follow-up (bisa besar; JET punya modul `jet` sendiri di WP_MODULE_MAP).
- **Komunikasi register** (`FRAUD_COMMS` status) — display; bisa fase lanjutan (pola SA 260/265).
- Narasi/sintesis AI (W8); rasio/analitik dari canon.

## 6. Constraints

- ESM-only, edit `migration/src/view_sa240.tsx`; aturan emas (alias `useStateS240`/`useMemoS240` ada).
- **Engagement-scoped** `useAmsPersist('fraud.<engId>')`. (sign-off via WP_MODULE_MAP Q-02 — tak diubah.)
- Ratchet `no-explicit-any`: tipe `FraudRisk`/`TriFactor`/`OverrideProc` penuh; handler `Ev`; tanpa suppression baru (prune bila turun).
- **PRD dulu sebelum implementasi.**

## 7. Existing Solutions / yang dipakai ulang

- **PR#7–#12** — pola persist register + editable + `WpPanel` pengganti sign-off fiktif + memo export + alias `Ev` + lock.
- **`FRAUD_REGISTER`/`FRAUD_TRIANGLE`/`OVERRIDE_PROC`** — jadi seed apa adanya (backward-compat).
- **`sa240` ∈ `WP_MODULE_MAP`** (Q-02) — sign-off + SA 230 sudah ada.
- **Recipe smoke live (PR#12)** — `dev-all` + login dev tanpa TOTP + route hack.

## 8. Proposed Approach

1. **State persist:** `const [fraud, setFraud] = useAmsPersist('fraud.'+engId, () => FRAUD_SEED)`; setter per-bagian (`setRegister`/`setTriangle`/`setOverride`). Thread ke tab terkait.
2. **Register:** `F240Register` baca/tulis `fraud.register`; form tambah/edit/hapus + status; ber-jejak.
3. **Segitiga:** `F240Triangle` toggle `on` per faktor → `setTriangle`; lock-aware.
4. **Override:** `F240Assumptions` toggle `done` prosedur ¶32 → `setOverride`.
5. **Sign-off & tombol:** `<WpPanel moduleId="sa240" />` ganti panel fiktif; "Memo" → `amsExportPdf`; sembunyikan "AI Assist".
6. **Lock LUNAK** menonaktifkan editing saat arsip.

## 9. Risks

- **Modul besar (571 baris) banyak sub-komponen** → mitigasi: persist 3 domain inti (register/segitiga/override); analitik & JET = Non-Scope; gate penuh + verifikasi live.
- **Segitiga bentuk nested** (objek kategori→factors) → setter immutable per kategori; tipe penuh.
- **`:any` baru** → tipe domain + `Ev`; lint per fase + prune.
- **Migrasi seed→persist** → `useAmsPersist` kembalikan seed bila kosong; field aditif.
- **Verifikasi live** → recipe PR#12; bila gagal, gate statis + catatan.

## 10. Implementation Plan (bertahap, reversible)

- **Fase 1 — Persist + register editable:** `useAmsPersist('fraud.<engId>')` + `F240Register` tambah/edit/hapus + lock + tipe. Gate + verifikasi live. Commit.
- **Fase 2 — Segitiga + override editable:** toggle faktor segitiga + prosedur ¶32 persist. Gate + verifikasi. Commit.
- **Fase 3 — Sign-off kanonik + memo:** `WpPanel` ganti fiktif + "Memo" export + sembunyikan "AI Assist". Gate + verifikasi. Commit.
- Tiap fase: `npm run lint`+`typecheck`+`test`+`build` & server `typecheck`+`test`; commit; update memory.
- PR off `master` (branch `sa240-fraud-substantive`).

## 11. Open Questions (perlu keputusan Anda sebelum "Proceed.")

1. **Cakupan tiga domain** — setuju fokus **register + segitiga + override (¶32)** + sign-off + memo, dan menunda **JET/eksepsi & komunikasi register** ke follow-up? *(rekomendasi: ya — tiga itu inti penilaian fraud; JET punya modul sendiri, komunikasi pola SA 260/265.)*
2. **Sign-off** — `WpPanel` standar preparer→reviewer (sudah via WP_MODULE_MAP), benar? *(rekomendasi: ya.)*
3. **"AI Assist"** — sembunyikan (konsisten), benar? *(rekomendasi: ya.)*
4. **Track setelah ini** — SA 530 (sampling) atau SA 540 (estimasi) berikutnya (melengkapi trio substantif), atau AK-01? *(rekomendasi: SA 540 estimasi — bertaut erat dgn fraud bias & going concern; lalu SA 530.)*
