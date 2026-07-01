# PRD — SA 505 Confirmation Hub Auditable (persist konfirmasi + populasi WP-evidence + wire SAD)

> Wajib sign-off ("Proceed.") sebelum implementasi. Dokumen ini *merancang*, belum *membangun*.

| Field | Isi |
|---|---|
| Tanggal | 2026-06-26 |
| Pemilik | Ari Widodo |
| Status | **Draft / menunggu review** |
| Sumber masalah | Baris Matriks Konektivitas: *"Confirmation Hub · ENG · Working Papers · 🟡 TERISOLASI · Auto-link hasil konfirmasi ke WP terkait"* — **diverifikasi & dikoreksi di bawah** |
| Standar | SA 505 (Konfirmasi Eksternal) · SA 450 (Evaluasi Salah Saji / SAD) · SA 230 (Dokumentasi) |
| Basis kode | `migration/src` (ESM, canonical, pasca-W15) |
| Modul terdampak | `confirm` ([view_confirm.tsx](migration/src/view_confirm.tsx), [view_confirm_parts.tsx](migration/src/view_confirm_parts.tsx)) |

---

## 0. Koreksi atas baris matriks (grep-dulu, jangan percaya chip)

Baris yang memicu PRD ini salah pada **dua** klaimnya — dikoreksi sebelum merancang, agar
kita memperbaiki masalah yang *benar*:

| Klaim chip | Ground truth (kode) | Putusan |
|---|---|---|
| `confirm` **🟡 TERISOLASI** | `connectivity.json`: `confirm` = **`hub`** (out:6, inc:8). `RELATED_SA.confirm=[SA 505]`. Muncul di **7+ edge LINEAGE** (piutang/pendapatan→konfirmasi; konfirmasi→subsequent receipts, SA 530, RPT, reliabilitas bukti). | **FALSE.** Artefak `connectivity.json` basi (baseline W0). Modul justru salah-satu paling terhubung. |
| "Hasil konfirmasi **manual** diupload ke WP" → *rekomendasi* "**auto-link** ke WP" | `confirm` **sudah** terpetakan di `WP_MODULE_MAP` ([wp_signoff.tsx:81](migration/src/wp_signoff.tsx)) dengan `requiredEvidence` SA 505 ¶12. Shell WP global (sign-off + evidence-link + status badge) **sudah** dirender di SubBar, server-enforced (`wpState`∈`SIGNOFF_KEYS`, `guardSignoffWrite`). | **FALSE.** Tautan WP **bukan** yang hilang; cangkangnya sudah ada. |

**Masalah sebenarnya bukan tautan, melainkan bahwa cangkang auditable itu tidak diisi oleh apa
pun yang nyata.** Itulah yang dirancang PRD ini. (Pola yang sama berulang: chip "absen/terisolasi"
sistematis salah — verifikasi kode dulu.)

## 1. Problem

Confirmation Hub adalah **cangkang demo**, bukan kertas kerja SA 505 yang dapat diandalkan. Tiga
akar masalah terbukti di kode:

1. **State kerja efemeral — nol persistensi.** Seluruh kesimpulan auditor (item mana sudah
   dijawab, nilai diskrepansi, penyelesaian rekonsiliasi, centang prosedur alternatif, penilaian
   reliabilitas) hidup sebagai `useStateCF` lokal ([view_confirm.tsx:368–378](migration/src/view_confirm.tsx)),
   di-seed dari konstanta statis `CONFIRMATIONS`. **Hilang saat reload.** Tidak ada
   `useAmsPersist`, tidak engagement-scoped → tidak memenuhi SA 230 (dokumentasi yang bertahan).
2. **`requiredEvidence` WP tak pernah dipenuhi.** WP shell mendeklarasikan 3 bukti wajib SA 505
   untuk `confirm`, tetapi **tidak ada** yang menandai bukti itu *terlampir/terpenuhi* dari hasil
   kerja modul. Status WP `confirm` karenanya selamanya tampak "kurang bukti", terlepas dari
   pekerjaan nyata di dalam tab.
3. **Klaim "auto-flow ke SAD" adalah vaporware.** [view_confirm.tsx:339](migration/src/view_confirm.tsx)
   menyatakan selisih tak-terjelaskan "**diteruskan otomatis** ke Summary of Audit Differences,"
   dan tombol "Buka SAD Ledger" (l.341) + "Kirim Batch"/"Import Saldo" (l.413–415) **tak punya
   `onClick`** — dekoratif. Modul SAD nyata **ada** (id `sad`, dipanggil `nav('sad')` dari
   [view_aje.tsx:369](migration/src/view_aje.tsx)), tetapi diskrepansi konfirmasi tak pernah
   benar-benar sampai ke sana.

**Dampak terukur:** kertas kerja konfirmasi eksternal — bukti dengan **reliabilitas tertinggi**
(ditegaskan modul itu sendiri) — tidak persisten, tidak menyumbang kelengkapan WP, dan tidak
menutup loop ke evaluasi salah saji. Untuk firma audit, ini gap dokumentasi SA 505/SA 230 pada
area berisiko (piutang/pendapatan, R-01).

> Catatan altitude: ini masalah **persistensi + penyambungan SSOT**, bukan masalah angka maupun
> navigasi. Lapisan angka & cangkang WP sudah matang; yang kurang adalah membuat state modul ini
> *nyata* lalu menyalurkannya ke dua permukaan SSOT yang **sudah ada** (WP-evidence + SAD).

## 2. Objective

Menjadikan kesimpulan SA 505 Confirmation Hub **persisten, engagement-scoped, dan tersalur** ke
dua SSOT yang sudah ada — sehingga cangkang auditable yang sudah terpasang benar-benar terisi:
(a) bukti wajib WP terpenuhi otomatis dari hasil kerja, (b) selisih tak-terjelaskan benar-benar
masuk SAD (SA 450).

**Mengapa ini objective yang benar:** leverage tertinggi atas fondasi yang sudah ada
(`WP_MODULE_MAP.confirm`, modul `sad`, resep persist engagement-scoped + `guardSignoffWrite`).
Mayoritas pekerjaan = **persistensi + penyambungan**, bukan fitur/infra net-baru. Menutup gap
SA 505/SA 230 nyata pada bukti reliabilitas tertinggi.

## 3. Success Criteria (terukur)

1. **State kerja persisten & engagement-scoped.** Status item, rekonsiliasi, centang prosedur
   alternatif, dan penilaian reliabilitas disimpan via `useAmsPersist` dengan
   `AMS_PERSIST_SCOPE=engagement` (key statis, mis. `confirmState.v1`) — **bertahan reload**,
   terisolasi per-engagement. Bukti: tulis → reload → state utuh; engagement lain tak terpengaruh.
2. **Bukti wajib WP terpenuhi dari hasil kerja.** Ketiga `requiredEvidence` SA 505 di
   `WP_MODULE_MAP.confirm` ditandai terpenuhi secara terprogram saat kondisi modul tercapai
   (mis. "Rekonsiliasi selisih" → terpenuhi bila semua diskrepansi terselesaikan; "Prosedur
   alternatif" → terpenuhi bila semua non-jawaban berkesimpulan). `WpStatusBadge` `confirm`
   bergerak sesuai pekerjaan nyata.
3. **Selisih → SAD nyata.** Total selisih tak-terjelaskan diteruskan ke register `sad` (bukan
   teks dekoratif); tombol "Buka SAD" benar-benar `nav('sad', { from:'confirm' })`. Verifikasi:
   resolusi diskrepansi di Confirmation Hub mengubah angka di modul SAD.
4. **Nol tombol mati pada jalur inti.** "Buka SAD Ledger", "Tandai Diterima", "Kirim Pengingat",
   resolusi recon/alt — semua melakukan aksi nyata yang persisten (atau diberi label jujur
   "demo" bila sengaja di luar scope, lihat §5).
5. **Sign-off WP tetap server-enforced.** Sign-off `confirm` lewat shell `wp_signoff` yang ada;
   `wpState` tetap dijaga `guardSignoffWrite` (tak ada jalur tulis baru yang melewati RBAC).
6. **Nol regresi numerik** (canon tak disentuh); `typecheck`/`lint`/`test`/`build` hijau; render
   Vite terverifikasi live dengan **role Manager** (bukan Partner) untuk membuktikan RBAC tulis.

## 4. Scope

- **Persistensi state Confirmation Hub** → `useAmsPersist` engagement-scoped (key statis `.v1`).
  Mengganti `useStateCF(CONFIRMATIONS)` menjadi state ter-hidrasi-persist dengan seed sebagai
  nilai awal (pola identik modul-modul yang sudah persisten).
- **Jembatan hasil-kerja → `requiredEvidence` WP** untuk `confirm` (derivasi terpenuhi-tidaknya
  dari state, lewat mekanisme evidence/`amsEvidenceFor` yang sudah ada).
- **Jembatan selisih → SAD**: kontribusi diskrepansi tak-terjelaskan ke register `sad` +
  navigasi nyata. (Bentuk integrasi final = Open Question #2.)
- **Wiring tombol/aksi inti** yang kini mati menjadi aksi persisten.
- Gate mutu penuh + verifikasi live Manager.

## 5. Non-Scope (eksplisit dikecualikan)

- **Pengiriman konfirmasi nyata (e-Confirm/email/SMTP), import saldo dari berkas nyata, konektor
  pihak ketiga.** Tetap simulasi; bila tombolnya dipertahankan → diberi badge "demo" jujur
  (pola tripwire W9, [memory neosuite-ams-w9-connectors]). Tidak membangun konektor di sini.
- **Mengubah `AMS_CANON`** — lapisan angka utuh.
- **Mengubah kontrak sign-off / `SIGNOFF_KEYS` server** — sign-off `confirm` pakai jalur
  `wpState` yang sudah ada apa adanya.
- **Mendesain ulang modul SAD** — hanya menyalurkan kontribusi ke dalamnya; bila SAD belum
  menerima sumber eksternal, batasi pada kontribusi minimal (lihat Open Question #2).
- **Menambah modul/menu baru** — tak menambah breadth.
- **Memperbaiki `connectivity.json`** — artefak baseline basi; di luar scope ini (catat saja).

## 6. Constraints

- **Orang:** solo (Ari). **Sistem:** ESM-only, `migration/src` canonical; patuh aturan emas
  anti-tabrakan (alias hook unik — `CF` sudah dipakai; `Object.assign(window,…)`; urut `<script>`).
- **Persist:** engagement-scoped wajib (`AMS_PERSIST_SCOPE=engagement`) + key statis `.v1`
  (jangan ulangi bug `+engId` pada key — lihat [memory asseris-authoritative-persist-key-recipe]).
- **Mutu:** gate `typecheck` (full strict) / `lint` (ratchet `no-explicit-any` — file ini sudah
  banyak `:any`, jangan tambah suppress baru tanpa alasan) / `test` / `build` hijau; canon tetap.
- **Bahasa:** UI Bahasa Indonesia; angka `rp()`/`fmt()` lokal id-ID.

## 7. Existing Solutions (dan kenapa cukup → custom-work minimal)

| Yang ada | Lokasi | Peran di PRD ini |
|---|---|---|
| WP shell: `WpSignoff`/`WpEvidenceLink`/`WpStatusBadge` + `WP_MODULE_MAP.confirm` | [wp_signoff.tsx:81](migration/src/wp_signoff.tsx) | **Target evidence sudah ada** — tinggal diisi. Tidak membangun ulang. |
| Modul SAD (`sad`) | dirujuk `nav('sad')` [view_aje.tsx:369](migration/src/view_aje.tsx) | **Target salah-saji sudah ada** — tinggal disalurkan. |
| Resep persist otoritatif (engagement-scope + `can()` + `SIGNOFF_KEYS`/`guardSignoffWrite`) | [server/src/signoff.ts:48](server/src/signoff.ts), contexts | Pola persist yang diikuti; sign-off tetap dijaga. |
| `useAmsPersist`, `amsAttachEvidence`/`amsEvidenceFor` | contexts / evidence | Primitif persist & evidence; tinggal dipakai. |
| Seed `CONFIRMATIONS`, `CF_AREA`, reliabilitas, recon presets | [view_confirm_parts.tsx](migration/src/view_confirm_parts.tsx) | Nilai awal state; UI sudah lengkap. |

**Simpulan:** seluruh infra (WP-evidence, SAD, persist, RBAC) **sudah matang**. Yang hilang
hanya **menghidupkan state modul + dua jembatan**. Custom-work kecil dan terbatas.

## 8. Proposed Approach

1. **Persist state inti.** Ganti `useStateCF(CONFIRMATIONS)` (+ `recon`/`altChecks`/`relChecks`)
   menjadi satu objek state ter-`useAmsPersist`, key `confirmState.v1`, `AMS_PERSIST_SCOPE=engagement`,
   seed = konstanta saat ini. Reducer aksi (`markReceived`/`resolveRecon`/`resolveAlt` + centang)
   menulis ke state persisten. Try/catch JSON sesuai konvensi.
2. **Derivasi evidence WP dari state** (pure): fungsi kecil memetakan kondisi modul → 3 bukti
   wajib `confirm` (register terbentuk; semua diskrepansi terekonsiliasi; semua non-jawaban
   berkesimpulan). Salurkan ke mekanisme evidence yang ada agar `WpStatusBadge` bergerak. **Tanpa
   menyentuh canon.**
3. **Jembatan SAD** (bentuk final = OQ #2): minimal — tombol "Buka SAD" `nav('sad', {from:'confirm'})`
   + hapus klaim "otomatis" yang tak benar / ganti dengan kontribusi nyata bila SAD sudah punya
   slot sumber-eksternal. Total selisih bruto sudah dihitung ([view_confirm.tsx:274](migration/src/view_confirm.tsx)).
4. **Wiring/penjujuran tombol inti** sesuai §5 (aksi nyata atau badge "demo").

**Alternatif yang ditolak:** (a) "auto-link ke WP" seperti bunyi chip → menolak premisnya;
tautan sudah ada, yang kurang adalah pengisi. (b) Membangun konektor/e-Confirm nyata sekarang →
itu lintasan W9, jauh lebih mahal, dan bukan akar masalah auditability.

## 9. Risks

| Risiko | Mitigasi |
|---|---|
| Key persist salah-scope (ulangi bug `+engId`) | Ikuti resep otoritatif: key **statis** `.v1` + `AMS_PERSIST_SCOPE=engagement`; verifikasi live 2 engagement. |
| Ratchet `no-explicit-any` menggigit penambahan | File sudah `:any`-saturated; batasi tambahan, anotasi var yang di-map (pelajaran SA 530). |
| "Derivasi evidence" menyentuh canon/SSOT angka | Jembatan murni baca-state → evidence; **nol** tulis ke canon. |
| Integrasi SAD lebih dalam dari dugaan (SAD tak punya slot sumber eksternal) | Turunkan ke kontribusi minimal + navigasi (OQ #2); jangan boil-the-ocean modul SAD. |
| Tabrakan aturan emas saat menambah helper | Alias unik (`CF` terpakai), `Object.assign(window,…)`, `<script>` sebelum `app.jsx` (N/A di ESM tapi jaga ekspor). |
| Verifikasi live keliru pakai Partner | Uji tulis **role Manager** untuk benar-benar membuktikan RBAC (pelajaran berulang). |

## 10. Implementation Plan (fase + milestone)

- **Fase 0 — Desain mikro (½ hari).** Finalisasi skema `confirmState.v1`; petakan kondisi→3 bukti
  wajib; periksa apakah modul `sad` menerima sumber eksternal (menentukan OQ #2). → *deliverable:
  skema + keputusan bentuk jembatan SAD.*
- **Fase 1 — Persistensi (½–1 hari).** State inti → `useAmsPersist` engagement-scoped; reducer
  aksi; verifikasi tulis→reload→utuh + isolasi antar-engagement. Gate hijau.
- **Fase 2 — Jembatan WP-evidence (½ hari).** Derivasi terpenuhi-tidaknya bukti wajib;
  `WpStatusBadge.confirm` bergerak sesuai pekerjaan. Verifikasi badge naik saat diskrepansi tuntas.
- **Fase 3 — Jembatan SAD + penjujuran tombol (½ hari).** Navigasi/kontribusi SAD nyata; tombol
  mati → aksi/badge-demo. Verifikasi selisih sampai ke SAD.
- **Fase 4 — Verifikasi live + gate (½ hari).** Render Vite, **role Manager**, dua engagement;
  `typecheck`/`lint`/`test`/`build` hijau; **nol regresi canon**.

*Estimasi kasar: ~2–3 hari kerja terfokus* (jauh lebih kecil dari dugaan awal karena infra WP/SAD
sudah ada).

## 11. Open Questions (perlu keputusan Anda)

1. **Cakupan "menghidupkan tombol":** hanya jalur auditable inti (persist + evidence + SAD), atau
   sekalian jujurkan tombol simulasi (Kirim Batch/Import Saldo/Kirim Pengingat) dengan badge
   "demo" gaya tripwire W9? (Rekomendasi: ya, sekalian — murah & menghapus klaim palsu.)
2. **Kedalaman integrasi SAD:** (a) **minimal** — navigasi nyata + hapus klaim "otomatis" palsu;
   atau (b) **kontribusi nyata** — selisih konfirmasi menjadi baris/sumber di register `sad`.
   Bergantung apakah modul `sad` sudah punya slot sumber-eksternal (dicek di Fase 0).
3. **Sign-off:** cukup andalkan shell `wp_signoff` yang sudah ada untuk `confirm` (rekomendasi),
   atau perlu kekhususan SA 505 (mis. kunci sign-off baru terbuka setelah semua non-jawaban
   berkesimpulan)?
4. **`connectivity.json` basi:** perbaiki entri/regenerasi sebagai item terpisah, atau biarkan
   (catat sebagai utang)? (Di luar scope build ini; sekadar konfirmasi penanganan.)

---
**Sign-off:** balas **"Proceed."** untuk mulai implementasi (dari Fase 0).
Jika ingin memutuskan Open Question dulu, sebutkan — saya sesuaikan PRD sebelum mulai.
