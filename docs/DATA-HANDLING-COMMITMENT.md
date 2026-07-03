# DATA-HANDLING-COMMITMENT.md — komitmen penanganan data (internal, BUKAN kontrak final)

> **Status: dokumen kontrol internal** (keputusan Ari, 2026-07-03) — BUKAN Data Processing
> Agreement atau Terms of Service yang ditandatangani firma pilot. Ini adalah kerangka klausul &
> komitmen yang didokumentasikan secara internal supaya konsisten across firma pilot, dan menjadi
> **draft siap-pakai** kalau/ketika diputuskan untuk diformalkan jadi dokumen kontraktual
> (ditambahkan ke surat perikatan `TPL-PLN-02` atau jadi lampiran terpisah) setelah direview
> pengacara. Jangan sodorkan dokumen ini ke firma pilot sebagai "DPA resmi" — lihat §9.

## 0. Tujuan

Menutup gap yang dicatat di evaluasi: "belum ada Data Processing Agreement / Terms of Service
dengan firma pilot." Selama masih berstatus internal, dokumen ini berfungsi sebagai **checklist
komitmen** yang Ari pegang terhadap dirinya sendiri sebagai penyedia Asseris — bukan kewajiban
yang bisa ditagih firma pilot secara hukum sampai diformalkan (§9).

## 1. Peran & tanggung jawab

Mengikuti `docs/PDP-COMPLIANCE-ASSESSMENT.md` §1: firma pilot = **Pengendali Data**, Ari/penyedia
Asseris = **Prosesor Data**. Prosesor memroses HANYA sesuai instruksi & tujuan yang ditetapkan
Pengendali (menjalankan audit/pajak untuk klien firma) — tidak menggunakan data klien firma untuk
tujuan lain (mis. melatih model, menjual data, benchmark lintas-firma tanpa anonimisasi).

## 2. Ruang lingkup data yang diproses

- Data kerja audit/pajak: neraca saldo (WTB), jurnal penyesuaian (AJE), kertas kerja, kesimpulan
  auditor, dokumen ekspor tersegel.
- PII kontak klien akhir firma (nama, jabatan, email — untuk keperluan working paper/konfirmasi
  SA 505, dst.).
- PII staf firma pilot sendiri (nama, email, peran — untuk keperluan akun aplikasi).
- **Tidak** diproses: data kesehatan, biometrik, atau kategori data pribadi spesifik lain di luar
  konteks audit/pajak kecuali firma pilot secara eksplisit mengunggahnya (di luar desain aplikasi).

## 3. Komitmen keamanan teknis (rujuk, jangan duplikasi)

Bukan janji baru — merujuk kontrol yang SUDAH ada dan sudah diverifikasi kode/CI:

| Komitmen | Implementasi | Rujukan |
|---|---|---|
| Isolasi data antar-firma | Single-tenant: satu EC2+DB per firma, tak ada database bersama lintas-firma | `docs/DEPLOY.md` |
| Enkripsi rahasia hidup | TOTP-at-rest AES-256-GCM, backup dump AES-256 | `docs/DEPLOY.md` §1 |
| Enkripsi in-transit | TLS (self-signed pilot / Let's Encrypt bila domain publik) | `docs/DEPLOY.md` §2, §13 |
| Jejak audit tak-teralih | `AuditLog` hash-chained, terverifikasi (`audit.verify`) | `docs/DEPLOY.md` §6a |
| Kontrol akses berbasis peran | RBAC 6 peran + isolasi per-perikatan | `docs/USER-GUIDE.md` §2 |
| Backup terenkripsi + off-box opsional | `docs/DEPLOY.md` §6, §6a |
| Rate-limit brute-force | `docs/DEPLOY.md` §14 |

**Yang BELUM bisa dikomitmenkan** (jujur, lihat §8) — jangan klaim ke firma pilot sampai ini
berubah: independent pentest belum dilakukan (`docs/PENTEST-READINESS.md` — belum dimulai), SLA
uptime formal (`docs/INCIDENT-RESPONSE.md` §0 — best-effort jam kerja saja, satu kontak teknis).

## 4. Sub-prosesor (pihak ketiga yang ikut memproses data)

| Sub-prosesor | Fungsi | Lokasi | Catatan |
|---|---|---|---|
| AWS (EC2, S3, Secrets Manager) | Hosting infrastruktur | `ap-southeast-3` (Jakarta) default | Lihat `docs/HOSTING-DATA-RESIDENCY-REVIEW.md` |
| Penyedia LLM (Anthropic/OpenAI-compatible, opt-in W8) | Narasi diagnostik AI, hanya bila fitur diaktifkan | Luar negeri | **Redaksi egress sebelum kirim** (`server/src/llm/`), tapi transfer lintas-batas belum dikaji hukum penuh — lihat `docs/PDP-COMPLIANCE-ASSESSMENT.md` §2. Firma pilot berhak minta fitur ini DIMATIKAN sepenuhnya jika tak nyaman dengan risiko ini (opt-out mungkin secara teknis — konfirmasi sebelum go-live data sensitif). |

## 5. Notifikasi insiden

- Insiden ketersediaan sistem (downtime): lihat `docs/INCIDENT-RESPONSE.md` — postur best-effort
  jam kerja, satu kontak teknis, sudah dikomunikasikan.
- **Insiden kerahasiaan data (dugaan kebocoran data pribadi)**: komitmen Ari (Prosesor) untuk
  memberi tahu firma pilot (Pengendali) **tanpa penundaan tak wajar** setelah menyadari insiden,
  agar firma bisa memenuhi kewajiban notifikasi Ps. 46 (3×24 jam) mereka ke Lembaga PDP/subjek
  data. Runbook klasifikasi teknis untuk ini masih gap terbuka — lihat
  `docs/PDP-COMPLIANCE-ASSESSMENT.md` §5.4.

## 6. Hak firma pilot atas datanya

- **Akses/ekspor**: firma pilot dapat meminta ekspor penuh data mereka kapan saja selama masa
  berlangganan (mekanisme teknis: export XLSX/PDF yang sudah ada + `pg_dump` penuh via operator
  bila diminta salinan mentah).
- **Penghapusan pasca-kontrak berakhir**: lihat `docs/DATA-RETENTION-POLICY.md` §2 — prosedur
  detail siapa berwenang memicu, jangka waktu, dan cara verifikasi penghapusan.

## 7. Data pasca-engagement/kontrak berakhir

Ringkasan (detail penuh: `docs/DATA-RETENTION-POLICY.md`):
1. Data KERJA per-perikatan (WTB/AJE/WP) tunduk kelas retensi SA 230 yang SUDAH ada
   (`app/data_records.js`) — ini soal retensi kertas kerja audit, TIDAK berubah oleh dokumen ini.
2. Data SELURUH firma pasca kontrak SOFTWARE dengan Ari berakhir (bukan sekadar 1 perikatan
   selesai) — belum ada kebijakan sebelum sesi ini; sekarang didefinisikan di
   `docs/DATA-RETENTION-POLICY.md` §2.

## 8. Batasan (jujur, bukan dijual berlebihan)

- Ini BUKAN dokumen yang mengikat secara hukum sampai diformalkan (§9) — kalau firma pilot minta
  jaminan kontraktual, dokumen ini BUKAN penggantinya.
- Independent pentest belum dilakukan.
- Kajian UU PDP belum direview pengacara (`docs/PDP-COMPLIANCE-ASSESSMENT.md`).
- Transfer data ke LLM luar negeri (§4) belum punya basis hukum yang dikonfirmasi.
- SLA uptime tidak formal (best-effort saja).

## 9. Jalur menuju dokumen kontraktual formal (kapan ini perlu naik status)

Naikkan dokumen ini jadi DPA/klausul kontrak formal SEBELUM:
- Firma pilot meminta jaminan tertulis mengikat secara hukum, ATAU
- Data klien SENSITIF nyata (bukan data uji/non-sensitif) mulai masuk sistem, ATAU
- Ada lebih dari satu firma pilot (butuh konsistensi kontraktual, bukan komitmen informal
  per-firma yang bisa berbeda-beda).

Langkah: (1) review pengacara atas isi dokumen ini, (2) integrasikan ke surat perikatan
`TPL-PLN-02` (SA 210, `app/data_templates.js:33`) sebagai lampiran/klausul tambahan — item
"Kerahasiaan & perlindungan data (UU PDP)" di `app/data_legal.js:44` sudah jadi *checklist item*
di sana tapi tanpa isi substantif; dokumen ini adalah bahan isinya, (3) tanda tangan resmi
(TTE+e-Meterai sesuai `app/view_onboarding2.jsx:232`) begitu firma pilot menyetujui.

## 10. Referensi
- `docs/PDP-COMPLIANCE-ASSESSMENT.md` — kajian kepatuhan penuh
- `docs/DATA-RETENTION-POLICY.md` — retensi & pemusnahan detail
- `docs/HOSTING-DATA-RESIDENCY-REVIEW.md` — lokasi hosting
- `docs/DEPLOY.md`, `docs/INCIDENT-RESPONSE.md`, `docs/PENTEST-READINESS.md`
