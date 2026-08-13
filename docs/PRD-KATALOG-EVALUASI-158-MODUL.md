# Katalog Kandidat PRD — dari Evaluasi 158 Modul (2026-08-13)

> Sumber: `Asseris-Eval-Output\RINGKASAN-158.md` + 158 laporan per modul (E-1..E-8).
> Status kandidat: **menunggu keputusan Ari** — dipromosikan ke PRD formal (Draft) hanya
> setelah dipilih. PRD yang SUDAH ditulis penuh: [`prd-audit-trail-server-chain.md`](prd-audit-trail-server-chain.md) (Draft).

---

## Prioritas integritas (rekomendasi eksekusi terdekat)

### K-01 · Audit Trail jujur (server chain) — **PRD SUDAH DITULIS** ✅
Modul `audittrail` menampilkan "Terverifikasi" statis atas seed hardcode. Sambungkan
`audit.list`/`audit.verify` + ekspor tersegel. Bukti live: `view_platform3.tsx:83` statis,
`data_platform.ts:337` seed. → lihat `prd-audit-trail-server-chain.md`.

### K-02 · Klok SSOT "hari ini" (AMS.TODAY) — hapus tanggal beku
Tanggal beku `'2026-03-09'` dominan di 8 gelombang: `MT_TODAY` (tasks), `CKP_TODAY`
(cockpit), `data_ojk.ts:203` (TODAY 2026-06-17), `sa710` auto-seed '2026-02-20',
`sa580` seed '2026-03-14', `apar`/`fixedassets`/`revenue` aging dari REF beku.
**Dampak:** aging/SLA/due-date salah; surat ber-tanggal salah (P0 mgmtletter sudah
ditutup terpisah). **Solusi:** satu sumber `AMS.TODAY` (audittimeline sudah memakainya).
Ukuran: S–M.

### K-03 · Tombol mati (50+ tanpa onClick) — aktifkan atau hapus
14 tombol "Kertas Kerja…" ekspor di PSAK, 12 di ruang kerja, 8 di operasi, 6 integrations,
dst. Konsol bersih (bukan event delegation) — benar-benar dead. **Solusi:** audit tiap
tombol → wire ke aksi nyata (kebanyakan ekspor) atau hapus. Ukuran: M (banyak file kecil).

### K-04 · Kontrol palsu → native (a11y massal)
`<span/div onClick>` sebagai switch/checkbox/radio di mana-mana: related (5×), sa705
switch EoM/OM, sectorck, review2400, orgchart, tax, recruitment, programme, crm IDX.
Gagal gate axe + keyboard. **Solusi:** ganti `<Switch>`/`<Check>` native (ui.tsx) +
role/tabIndex. Ukuran: M (lintas ~20 modul).

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

---

## Catatan verifikasi live (yang sudah dibuktikan, bukan hanya statis)

- ✅ P0 asersi & mgmtletter — DITUTUP (branch `fix/p0-materiality-mgmtletter`, PR menunggu).
- ✅ Tombol mati = benar tanpa onClick (konsol 0 error) — K-03.
- ✅ audittrail badge statis tanpa `audit.verify` — K-01.
- ✅ Gate server `state.get` FORBIDDEN firm-key-not-allowlisted bekerja (isolasi W7.5 OK).
- ⏳ 50+ tombol "mati" & segel ekspor perlu smoke runtime per modul saat eksekusi.
