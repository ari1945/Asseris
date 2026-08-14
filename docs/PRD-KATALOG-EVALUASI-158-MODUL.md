# Katalog Kandidat PRD — dari Evaluasi 158 Modul (2026-08-13)

> Sumber: `Asseris-Eval-Output\RINGKASAN-158.md` + 158 laporan per modul (E-1..E-8).
> Status kandidat: **menunggu keputusan Ari** — dipromosikan ke PRD formal (Draft) hanya
> setelah dipilih. PRD yang SUDAH ditulis penuh: [`prd-audit-trail-server-chain.md`](prd-audit-trail-server-chain.md) (Draft).
>
> **Pembaruan E-9 (2026-08-14):** evaluasi KEDALAMAN fitur (L0–L5) telah menambah dimensi
> baru — lihat [`PRD-USULAN-PENGEMBANGAN-E9-KEDALAMAN.md`](PRD-USULAN-PENGEMBANGAN-E9-KEDALAMAN.md)
> (6 program sistemik + 10 kandidat PRD baru) dan [`PRD-RINGKASAN-KEDALAMAN-E9.md`](PRD-RINGKASAN-KEDALAMAN-E9.md).
> Katalog ini tetap berlaku sebagai daftar kandidat per-temuan; E-9 menyempurnakannya menjadi
> program terstruktur (ekspor massal, klok-tarif-scope, integritas server, a11y, ledger-based
> reporting, navigasi lintas modul) + daftar modul prioritas.

---

## Prioritas integritas (rekomendasi eksekusi terdekat)

### K-01 · Audit Trail jujur (server chain) — **PRD SUDAH DITULIS** ✅
Modul `audittrail` menampilkan "Terverifikasi" statis atas seed hardcode. Sambungkan
`audit.list`/`audit.verify` + ekspor tersegel. Bukti live: `view_platform3.tsx:83` statis,
`data_platform.ts:337` seed. → lihat `prd-audit-trail-server-chain.md`.
**IMPLEMENTED 2026-08-14**: K-01 (audittrail → audit.list/verify, PR #225) + Program C
(PR #232): wrapper `stateHistory` per-key di api.ts + panel rantai integritas di **psak71**
(L5 pertama PSAK: state server + audit chain terlihat + sign-off + ekspor tersegel)
+ sa720 P0 (rep580.v1 dibaca, bukan ok:true hardcode). Sisa Program C: logActivity
lokal → server chain (contexts.tsx:1051, perubahan arsitektur besar — perlu PRD sendiri).

### K-02 · Klok SSOT "hari ini" (AMS.TODAY) — hapus tanggal beku
Tanggal beku `'2026-03-09'` dominan di 8 gelombang: `MT_TODAY` (tasks), `CKP_TODAY`
(cockpit), `data_ojk.ts:203` (TODAY 2026-06-17), `sa710` auto-seed '2026-02-20',
`sa580` seed '2026-03-14', `apar`/`fixedassets`/`revenue` aging dari REF beku.
**Dampak:** aging/SLA/due-date salah; surat ber-tanggal salah (P0 mgmtletter sudah
ditutup terpisah). **Solusi:** satu sumber `AMS.TODAY` (audittimeline sudah memakainya).
Ukuran: S–M. **IMPLEMENTED 2026-08-14 (PR #231, `feat/program-b-klok-ssot-sisa`)**:
sisa 21 situs di 14 view diganti → AMS.TODAY (anchor hari ini eng2/firmtreasury/dataflow2,
aksi baru dms/firmgl/timebudget/opening/people/workspace, auto-seed laporan
opinion/presentasi/sa230/sa580/sa710) + P0-B1: view_profit tarif dari FIRMFIN.WIP_BILL
(hapus RATE_CARD duplikat). Tersisa hanya data sah (rentang FY, tanggal kanonik DMS).
0 `:any` baru; verify PASSED.

### K-03 · Tombol mati (50+ tanpa onClick) — aktifkan atau hapus
14 tombol "Kertas Kerja…" ekspor di PSAK, 12 di ruang kerja, 8 di operasi, 6 integrations,
dst. Konsol bersih (bukan event delegation) — benar-benar dead. **Solusi:** audit tiap
tombol → wire ke aksi nyata (kebanyakan ekspor) atau hapus. Ukuran: M (banyak file kecil).

### K-04 · Kontrol palsu → native (a11y massal)
`<span/div onClick>` sebagai switch/checkbox/radio di mana-mana: related (5×), sa705
switch EoM/OM, sectorck, review2400, orgchart, tax, recruitment, programme, crm IDX.
Gagal gate axe + keyboard. **Solusi:** ganti `<Switch>`/`<Check>` native (ui.tsx) +
role/tabIndex. Ukuran: M (lintas ~20 modul). **IMPLEMENTED 2026-08-14 (PR #233,
`feat/program-d-a11y-native`)**: 7 kontrol palsu → Switch/Check native (firm listed,
fsgen_panels Toggle, goingconcern refinancing, onboarding2 LTKM+UBO PEP, relatedsvc
prosedur AUP, sectorck daftar-uji OJK) + 7 tombol ikon diberi title (email, AI sparkle,
tutup panel, hapus baris, hapus UBO, kirim komentar, integritas entri). Scan ulang:
**0 kontrol palsu tersisa**. Sisa: sa705 EoM/OM switch, crm IDX, dll. yang mungkin
bukan pola visual-36px — audit lanjutan bila perlu.

### K-05 · aria-label nyaris nol
0 aria-label di 27 view PSAK; 1 di seluruh E-3. Tombol ikon tanpa nama → gagal
`button-name` axe. **Solusi:** sweep aria-label/title + gerbang axe e2e per modul.
Ukuran: M (mekanis, aman diotomasi).

---

## Prioritas output (D = 2,5 — gap terbesar produk)

### K-06 · Ekspor tersegel massal (W10.5)
Hanya wtb, onboarding, continuance, records, crypto, psak16, approvals, integrations
yang D≥4. Billing cetak via `amsPrintDoc` TANPA segel (langgar W10.5). **Solusi:**
paket ekspor ber-segel untuk: faktur (billing), memo materialitas/strategy, WP
(workpapers), laporan reviu (spr2400/review2400), laporan SA (sa230/240/250/…),
KK PSAK (14 tombol), register (hcm/payroll/compmatrix), SAD, RPT, paket instruksi
group audit, sertifikat EQR. Ukuran: L (pecah per kelompok modul).

### K-07 · SSOT tarif/fee terpecah
profitability `RATE_CARD` vs `FIRMFIN.WIP_BILL`; pipeline rate 700rb literal;
CKP_RATE vs 850k literal; TB_FEE vs client.fee. **Solusi:** FIRMFIN.WIP_BILL satu
sumber; konsumen hilir memakainya. Ukuran: S–M.

### K-08 · Wire server untuk state engagement yang masih localStorage
strategyApproved, goingconcern.v1, opening.v1, confirmState.v1 (SA 505), sa501.v1,
payroll run (SoD draft→paid), performance phase advance (tanpa gate peran — SoD).
**Solusi:** pindahkan ke `useServerState`/tRPC + gate server. Ukuran: M per modul.

---

## Prioritas RBAC & isolasi

### K-09 · Gate data keuangan firma
MODULE_CAP/GROUP_CAP kosong utk grup Keuangan Firma (ERP) & OJK → semua peran bisa
lihat firmgl/apar/revenue/treasury/cashbank/firmtax. **Keputusan RBAC:** siapa boleh
lihat data keuangan firma (usul: Partner + Finance). Ukuran: S (config) + review view.
**Sebagian IMPLEMENTED 2026-08-14 (Program E / SoD finansial — sisi TULIS)**: gate
dua-lapis `can(CAP.FIRMFIN_EDIT)` (pola capacity) di 5 view — firmgl (Jurnal Baru,
toggle posting), apar (Bayar), cashbank (toggle rekon), firmtax (Tandai Lapor),
wipreal (write-down) & billing (Faktur Baru/Kirim/Tandai Lunas); `capForWrite`
diselaraskan: `invoices` & `wip.adj` kini FIRMFIN_EDIT (sebelumnya FIRM_ADMIN) agar
UI dan server satu kebijakan (tanpa silent-reject untuk Finance Firma). logActivity
di semua aksi tulis tsb (GL_POST/AP_PAY/TAX_FILED/RECON_TOGGLE/WIP_WRITEDOWN/
INV_CREATE/INV_SENT/INV_PAID). Sisi BACA (siapa boleh melihat modul) masih menunggu
keputusan RBAC — MODULE_CAP tetap kosong untuk grup Keuangan.

### K-10 · Persistensi FIRM-scope bocor lintas perikatan
`pbc.v2`/`portalMsgs.v2` (clientportal), `pfi3400.exec`/`soc3402.exec`/`ghg3410.exec`/
`pf3420.exec` (SJAH), `fsgen.disclosures`, `mgmtletter.findings`. **Solusi:** registri
scope + daftarkan engagement-scope + gate tRPC. Ukuran: M.

### K-11 · `window.useAmsPersist` — keputusan arsitektur
Dipakai luas di luar daftar pembaca sah BRIEF. **Solusi:** sahkan sebagai API resmi
(update CLAUDE.md §3.1) atau migrasi bertahap ke import ESM. Ukuran: S (keputusan) + M (bila migrasi).

---

## Modul & fitur baru

### K-12 · view_sakep.tsx — SAK EP (satu-satunya fallback generik)
Dari 158 modul hanya `sakep` dirender `ComplianceView` (tanpa view khusus di
lazy_views.tsx). **Solusi:** halaman SAK EP sungguhan (checklist + mesin ringan).
Ukuran: L.

### K-13 · SA 501 → wire confirmState.v1 (PRD SA 505)
`sa501` sepenuhnya statis (A=1, D=1). **Solusi:** persist state + wire Confirmation
Hub (confirmState.v1) + populasi WP-evidence. Terkait PRD SA 505 Confirmation Hub
(Draft). Ukuran: M.

### K-14 · Posting jurnal → TB/LK nyata di firmgl
`firmgl` TB/LK tetap seed — posting jurnal tak mengubah laporan. **Solusi:** engine
posting nyata (pola WTB/AJE). Ukuran: L.
**IMPLEMENTED 2026-08-14 (Program E)**: `migration/src/firm_ledger.ts` (murni,
11 unit test) — saldo awal dianker ke jurnal SEED (`AMS.FIRM_GL`), saldo kini =
saldo awal + Σ jurnal terposting → memposting/membatalkan jurnal LANGSUNG menggeser
Neraca Saldo, Laporan Laba Rugi/Neraca & Buku Besar, tanpa migrasi data (fresh load
identik dgn seed). Kode p0 + gate SoD + logActivity di `view_firmgl.tsx`.

---

## Catatan verifikasi live (yang sudah dibuktikan, bukan hanya statis)

- ✅ P0 asersi & mgmtletter — DITUTUP (branch `fix/p0-materiality-mgmtletter`, PR menunggu).
- ✅ Tombol mati = benar tanpa onClick (konsol 0 error) — K-03.
- ✅ audittrail badge statis tanpa `audit.verify` — K-01.
- ✅ Gate server `state.get` FORBIDDEN firm-key-not-allowlisted bekerja (isolasi W7.5 OK).
- ⏳ 50+ tombol "mati" & segel ekspor perlu smoke runtime per modul saat eksekusi.
