# Metodologi Penerimaan & Keberlanjutan Klien (Asseris)

> Referensi metodologi untuk modul **Onboarding Klien** (penerimaan) dan **Keberlanjutan Klien** (continuance).
> Standar: **SA 210 · SA 220 · SA 300 · SA 510 · ISQM 1 ¶33–34 · SA 230**. Ditulis 2026-07-18 (fitur P1–P6).

## 1. Prinsip

Penerimaan (klien/perikatan baru) dan keberlanjutan (perikatan berulang) dinilai **setiap tahun sebelum memulai** dengan **basis terdokumentasi**. Keduanya memakai **satu model penilaian berbobot** (`assessment_model.ts`) sebagai sumber kebenaran tunggal skor & verdict — hanya set faktor, ambang label, dan pemicu yang berbeda per sisi. Setiap keputusan menghasilkan **memo kertas kerja (SA 230)** yang dapat **diekspor (PDF/XLSX) & disegel (Ed25519)** dan diverifikasi ulang.

## 2. Model skor bersama (`assessment_model.ts`)

- **Skor berbobot** = `Σ(sᵢ·wᵢ) / Σ(wᵢ)`, rentang 0–5. Skor faktor `s` skala 1 (buruk) – 5 (sangat baik).
- **Ambang verdict** (identik kedua sisi; hanya label berbeda):
  - `≥ 4` → hijau · `≥ 3` → amber · `< 3` → merah.
- Verdict **menuntun** keputusan; tidak memaksa. Rekan/Partner tetap memutuskan dan mengunci.

## 3. Faktor Penerimaan (SA 220 ¶12–13 · SA 300 · ISQM 1 ¶30)

Sumber: `ACC_FACTORS` (`data_part1.ts`). Σ bobot = 100.

| # | Faktor | Bobot |
|---|---|---|
| 0 | Integritas & Reputasi Manajemen | 25 |
| 1 | Independensi & Konflik Kepentingan | 20 |
| 2 | Kompetensi, Waktu & Kapasitas Tim | 20 |
| 3 | Risiko Perikatan & Industri | 25 |
| 4 | Etika & Proporsionalitas Imbalan | 10 |

Label verdict: **Terima · Terima dengan Syarat · Tolak**.
Alur onboarding: **Akseptasi → PMPJ/APU-PPT (KYC) → Engagement Letter (SA 210) → Konversi ke Perikatan** (mewariskan `acceptanceRef` + `engagementLetter` ke `engagementEntryGate`, SA 210/220).

## 4. Faktor Keberlanjutan (ISQM 1 ¶34 · SA 220.20–21)

Sumber: `CONT_FACTORS` (`data_part1.ts`). Σ bobot = 100.

| # | Faktor | Bobot |
|---|---|---|
| 0 | Integritas & perubahan keadaan manajemen/tata kelola | 20 |
| 1 | Pengalaman tahun lalu: opini, temuan signifikan, kesulitan | 25 |
| 2 | Independensi & ancaman (rotasi/kedekatan, kepentingan pribadi/fee) | 20 |
| 3 | Kompetensi, kapasitas & sumber daya tahun berjalan | 15 |
| 4 | Risiko klien/industri & regulasi | 10 |
| 5 | Etika & proporsionalitas/kolektibilitas imbalan | 10 |

Label verdict: **Lanjut · Lanjut dengan Syarat · Tidak Dilanjutkan**.

## 5. Pemicu keberlanjutan otomatis (`continuance_engine.ts`)

Deterministik, diturunkan dari kanon (`CLIENTS` · `INDEPENDENCE` · `INVOICES` · `PRIOR_YEAR`). Bukan angka hardcode.

| Pemicu | Sumber | Severity |
|---|---|---|
| Rotasi AP (terlampaui / jatuh tempo / mendekat) | `INDEPENDENCE` tenur vs batas (PIE 5th / jasa-keuangan 3th) | high / high / med |
| Konflik kepentingan | `INDEPENDENCE.conflicts` | high |
| **Opini modifikasian tahun lalu** (WDP/TMP/TW; WTP-EoM ≠ modifikasi) | `PRIOR_YEAR.opinion` via `isOpinionModified()` | high |
| **Temuan signifikan tahun lalu** (≥2 / =1) | `PRIOR_YEAR.findings` | med / low |
| **Perubahan keadaan** | `PRIOR_YEAR.changed` | low |
| Risiko klien tinggi | `CLIENTS.risk = High` | med |
| Emiten/PIE | `CLIENTS.listed` | med |
| Imbalan tertunggak | `INVOICES` overdue | med |
| Asosiasi panjang (≥8 th) | `CLIENTS.since` | low |

**Level perhatian**: high>0 atau ≥4 pemicu → **Tinggi**; med≥1 atau ≥2 pemicu → **Sedang**; selain itu **Rendah**.

**Catatan arsitektur:** `PRIOR_YEAR` adalah **data referensi ber-clientId**, bukan kolom CRM klien — karena hidrasi core dari server (`hydrateCoreFromApi`) melucuti field non-kolom. View memperkaya klien terhidrasi via `PRIOR_YEAR[id]` sebelum memanggil mesin. (Simplifikasi disengaja; persistensi server prior-year = kandidat lanjutan.)

## 6. Memo kertas kerja (SA 230) — `acceptance_continuance_memo.ts`

Generator **murni** (tanpa `Date`/`random` → hash reprodusibel) menghasilkan blok PDF (`amsExportPdf`) & lembar XLSX (`amsExportXlsx`) untuk kedua "kind". Isi: identitas klien, matriks faktor+skor+catatan, (keberlanjutan) tahun-lalu & pemicu, safeguard, keputusan, jejak persetujuan, blok tanda tangan.

**Segel**: Ed25519 provenans Asseris (server `exporter.seal`) + QR verify. **Bukan** e-Meterai/PERURI atau PSrE. Fail-safe: luring → memo tetap tergenerasi tanpa segel. Verifikasi ulang via `exportVerifySeal({sealId, contentHash})`.

## 7. RBAC & persistensi

| Aksi | Kapabilitas |
|---|---|
| Lihat register keberlanjutan | `ENGAGEMENT_VIEW_ALL` (Partner/Manajer) |
| Nilai faktor / isi safeguard | `ENGAGEMENT_VIEW_ALL` (tim oversight) |
| Kunci keputusan (sign-off) | `FIRM_ADMIN` (Partner) |
| Sign-off akseptasi (onboarding) | `FIRM_ADMIN` |
| Ekspor & segel memo | `EXPORT` (semua auditor; server-enforced) |

Keputusan keberlanjutan persist **firm-scope** (`continuanceDecisions`), termasuk `factors`, `safeguards`, `trail` (append-only), `approved`, `memoSeal`. Akseptasi persist di objek `PROSPECTS` (`prospects`, firm-scope).

## 8. Riwayat siklus

`CONTINUANCE_HISTORY` menyimpan keputusan siklus-siklus lampau (read-only) yang tampil berdampingan siklus berjalan — memperlihatkan kontinuitas reasesmen tahunan (ISQM 1).

## 9. Kandidat lanjutan (di luar scope P1–P6)

- Komunikasi auditor pendahulu (SA 510) sebagai artefak akseptasi.
- Deklarasi independensi per-anggota tim.
- Persistensi `PRIOR_YEAR` di model server (kini data referensi klien-side).
- Analisis konsentrasi fee (Kode Etik) sebagai faktor/pemicu terukur.

## 10. Peta berkas

| Berkas | Peran |
|---|---|
| `assessment_model.ts` | Skor berbobot + verdict (SSOT bersama) |
| `continuance_engine.ts` | Pemicu keberlanjutan + tipe keputusan tersimpan |
| `acceptance_continuance_memo.ts` | Generator memo (blok PDF + lembar XLSX) |
| `data_part1.ts` | `ACC_FACTORS` · `CONT_FACTORS` · `PRIOR_YEAR` |
| `view_continuance.tsx` | Register + kertas kerja + ekspor/segel + riwayat |
| `view_onboarding*.tsx` | Onboarding (akseptasi/PMPJ/letter/konversi) + ekspor memo |
| `export_pdf.ts` · `export_xlsx.ts` | Generator tersegel (reuse) |

Terkait: `docs/prd-penerimaan-keberlanjutan-detail.md` · `docs/prd-continuance-register-isqm.md` · `docs/prd-acceptance-to-engagement-flow-sa210.md`.
