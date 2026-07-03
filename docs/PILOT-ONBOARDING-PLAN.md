# Rencana Training & Onboarding — Firma Pilot Pertama

> **Status: TEMPLATE — belum ada firma pilot bernama/jadwal pasti.** Dokumen ini adalah rencana
> rollout yang bisa diisi begitu firma pilot sungguhan dikonfirmasi (nama firma, jumlah staf per
> peran, tanggal mulai). Konsisten dengan pola RTO/RPO di `docs/DEPLOY.md` §7 — proposal berbasis
> kemampuan teknis, keputusan bisnis final tetap di tangan Ari.
>
> Dokumen ini menjawab **"bagaimana firma pilot pertama dilatih & di-onboard"** — bukan
> "bagaimana meng-instal aplikasi" (itu `docs/DEPLOY.md`, operator/IT) atau "bagaimana memakai
> tiap modul" (itu `docs/USER-GUIDE.md`, end-user). Dokumen ini adalah **rencana kerja Ari/tim
> penyelenggara training**, bukan materi yang dibagikan mentah ke staf firma pilot.

---

## 0. Data Firma Pilot (ISI SEBELUM MULAI)

| Field | Isi |
|---|---|
| Nama firma pilot | *(belum diisi)* |
| Tanggal mulai persiapan | *(belum diisi)* |
| Tanggal target go-live | *(belum diisi)* |
| Jumlah Engagement Partner | *(belum diisi)* |
| Jumlah Audit Manager | *(belum diisi)* |
| Jumlah Senior Auditor | *(belum diisi)* |
| Jumlah Junior Auditor | *(belum diisi)* |
| Jumlah Admin & HR Firma | *(belum diisi)* |
| Jumlah Finance Firma | *(belum diisi)* |
| Perikatan yang dipakai untuk parallel-run (Fase 3) | *(belum diisi — idealnya 1 klien kecil-menengah, risiko rendah, bukan klien PIE/high-risk)* |
| Penanggung jawab training (fasilitator) | *(belum diisi — biasanya Ari)* |
| Kanal dukungan selama pilot | *(belum diisi — mis. WhatsApp group, email, jadwal jam kantor)* |

---

## 1. Prasyarat Teknis — WAJIB DISELESAIKAN SEBELUM FASE 0

### ✅ 1.1 Menambah staf setelah instalasi awal — SEKARANG ADA (`npm run add-user`)

Gap ini SEMPAT nyata (dikonfirmasi lewat pembacaan kode langsung, bukan tebakan): begitu
Partner-admin pertama dibuat via `bootstrap`, tak ada jalur resmi menambah staf lain — hanya
`npm run bootstrap` (sekali-jalan, menolak bila firma sudah ada) dan `npm run seed` (destruktif,
tak boleh dipakai pasca ada data klien nyata). Ditutup lewat PRD
`docs/prd-add-staff-user-cli.md` — `server/src/addUser.ts` + `server/src/addUserCli.ts`, pola
PERSIS `bootstrapFirm.ts`/`bootstrap.ts` (reuse `hashPassword`/TOTP/`assertProdConfig`, BUKAN
implementasi kripto terpisah).

**Cara pakai** (per staf, jalankan dari `server/`, sekali per orang):
```bash
FIRM_ID=<id-firma-Anda> \
USER_NAME='Dimas Raharjo' USER_EMAIL='dimas.r@contoh-kap.id' \
USER_PASSWORD='<passphrase-sementara-≥12-karakter>' USER_ROLE='Senior Auditor' \
npm run add-user
```
`USER_ROLE` harus persis salah satu dari 6 peran RBAC (`docs/USER-GUIDE.md` §2): `Engagement
Partner`, `Audit Manager`, `Senior Auditor`, `Junior Auditor`, `Admin & HR Firma`, `Finance
Firma`. Tambahkan `ENROL_TOTP=0` untuk staf yang login password-saja (tanpa 2FA) — default
mengaktifkan TOTP (QR code dicetak SEKALI ke terminal, simpan sebelum tertutup).

**Otomatis ikut terjadi** (tak perlu langkah manual tambahan): staf berperan Partner/Manager/
Senior/Junior otomatis muncul di roster Capacity Planning/Resource Scheduler (`TeamMember`).
Admin & HR Firma/Finance Firma sengaja TIDAK (peran firm-ops, bukan staf audit — konsisten
`docs/USER-GUIDE.md` §2).

**Yang TETAP jadi langkah terpisah** (di luar cakupan skrip ini, sengaja): menugaskan staf ke
perikatan tertentu (`EngagementMember`) — itu tetap lewat modul **Engagement Mgmt** yang sudah
ada di aplikasi, dilakukan Manager/Partner SETELAH staf berhasil login pertama kali.

**Belum ada** (gap terpisah, di luar cakupan `add-user`): reset password mandiri (staf lupa
password → tetap perlu operator jalankan ulang lewat `auth.changePassword` atau kontak admin,
lihat `docs/USER-GUIDE.md` §7), dan UI "Tambah Pengguna" di dalam aplikasi (CLI operator saja
untuk saat ini).

### 1.2 Prasyarat lain (sudah tersedia, tinggal dipastikan)
- [ ] Instance sudah di-deploy & healthy (`docs/DEPLOY.md` §1-5), `curl .../healthz` → `db: up`.
- [ ] `docs/USER-GUIDE.md` sudah dibaca fasilitator training (dan idealnya staf firma pilot
      punya akses baca dokumen ini, bukan cuma diceritakan lisan).
- [ ] Backup harian sudah aktif (`docs/DEPLOY.md` §6) SEBELUM data klien nyata pertama masuk.
- [ ] Minimal satu perikatan uji/parallel-run (§3 di bawah) sudah dipilih & datanya siap
      (neraca saldo klien tersebut, dalam format yang bisa ditempel ke drawer impor TB).

---

## 2. Fase 0 — Persiapan (H-4 s.d. H-1 minggu sebelum kickoff)

| Aktivitas | Penanggung jawab | Keluaran |
|---|---|---|
| Buat akun untuk SEMUA staf pilot via `npm run add-user` (§1.1) — nama, email, peran per §0 | Operator teknis | Daftar kredensial awal (password sementara, wajib diganti saat login pertama — lihat catatan keamanan di bawah) |
| Siapkan TOTP untuk Partner-admin (wajib) — opsional untuk staf lain sesuai preferensi firma | Operator teknis | QR code tersimpan aman, diserahkan ke masing-masing Partner secara pribadi (bukan lewat grup WhatsApp) |
| Pilih & siapkan data perikatan parallel-run (§0, §3) | Ari + Partner firma pilot | 1 perikatan kecil-menengah, risiko rendah, dengan neraca saldo siap diimpor |
| Jadwalkan sesi kickoff + training per kelompok (§4) | Ari + Partner firma pilot | Kalender terkirim ke semua staf, durasi sesuai §4 |
| Bagikan `docs/USER-GUIDE.md` (atau ringkasannya) ke staf **sebelum** sesi training | Ari | Staf datang dengan konteks dasar, sesi training jadi tanya-jawab bukan ceramah dari nol |

**Catatan keamanan**: password sementara HARUS diganti saat login pertama (fitur ganti password
sudah ada, `auth.changePassword`) — jangan biarkan staf terus memakai password yang dibuat
operator.

---

## 3. Fase 1 — Kickoff (H-hari, sesi tunggal seluruh staf, ~30-45 menit)

Tujuan: semua staf paham GAMBARAN BESAR sebelum masuk ke training teknis per peran — mengapa
firma pindah ke sistem ini, apa yang berubah, apa yang TIDAK berubah.

**Agenda usulan:**
1. Mengapa Asseris (5 menit) — masalah yang diselesaikan (data tersebar di Excel, sulit tracking
   review, tak ada jejak audit terpusat) — bukan sekadar "ganti tool".
2. Demo singkat siklus hidup perikatan (§4 `USER-GUIDE.md`) — Perencanaan→Eksekusi→Finalisasi→
   Arsip, 10 menit, pakai perikatan parallel-run sebagai contoh hidup.
3. Peran & apa yang berubah untuk masing-masing (5 menit) — rujuk tabel §2 `USER-GUIDE.md`.
4. Apa yang TIDAK berubah (5 menit) — penting untuk mengurangi kecemasan: standar audit yang
   dipakai tetap sama (SA/PSAK yang sudah mereka kenal), aplikasi ini alat bantu bukan mengubah
   metodologi.
5. Jadwal training per kelompok & ekspektasi parallel-run (5 menit).
6. Tanya jawab.

---

## 4. Fase 2 — Training per Kelompok Peran

Dipecah per kelompok (BUKAN satu sesi untuk semua) karena kebutuhan tiap peran berbeda jauh
(lihat `docs/USER-GUIDE.md` §5) — durasi & materi acuan:

| Kelompok | Peserta | Durasi usulan | Materi acuan (`USER-GUIDE.md`) | Fokus praktik langsung |
|---|---|---|---|---|
| **Oversight** | Engagement Partner, Audit Manager | 90 menit | §2, §3, §4, §5.1, §5.2 | Login+TOTP, navigasi, buka Firm Dashboard, review kertas kerja (sign-off Reviewer), buka Opinion Generator (Partner saja) |
| **Eksekusi Lapangan** | Senior Auditor, Junior Auditor | 120 menit | §2, §3, §4, §5.3, §5.4 | Login, impor WTB (pakai data parallel-run), isi kertas kerja + tickmark + kesimpulan SA 230, AJE (khusus Senior), ekspor dokumen |
| **Firm-Ops: HR** | Admin & HR Firma | 60 menit | §2, §5.5 | Payroll/cuti/CPE — modul yang relevan untuk operasional harian firma pilot |
| **Firm-Ops: Finance** | Finance Firma | 60 menit | §2, §5.6 | General Ledger/AP-AR firma — modul yang relevan |

**Format tiap sesi**: 20% penjelasan konsep, 80% praktik langsung di aplikasi (bukan slide) —
idealnya peserta login dengan akun MASING-MASING (bukan share-screen fasilitator saja), memakai
data perikatan parallel-run yang sudah disiapkan Fase 0.

**Prinsip**: jangan coba mengajarkan SELURUH katalog modul §6 `USER-GUIDE.md` di sesi ini — itu
rujukan yang dibuka staf sendiri saat butuh. Training fokus ke alur kerja INTI yang dipakai
sehari-hari (§5 per peran).

---

## 5. Fase 3 — Parallel-Run (Shadow Period)

**Durasi usulan**: 1 siklus perikatan kecil (biasanya 2-4 minggu untuk klien kecil-menengah) —
BUKAN durasi kalender tetap, tapi durasi "sampai 1 perikatan selesai end-to-end lewat 4 fase".

**Mekanisme**: staf mengerjakan **satu perikatan nyata** (dipilih di §0 — risiko rendah, bukan
klien PIE/kompleks) di Asseris **sambil** proses lama (Excel/dokumen manual) tetap berjalan
sebagai jaring pengaman — supaya kalau ada kendala teknis/pemahaman, pekerjaan klien tidak
terhambat.

**Yang dipantau selama periode ini:**
- [ ] Semua staf berhasil login sendiri (bukan dibantu terus-menerus).
- [ ] WTB berhasil diimpor & angka materialitas/going concern otomatis mengikuti (SSOT bekerja —
      lihat catatan §1 `USER-GUIDE.md`).
- [ ] Minimal 1 siklus sign-off Preparer→Reviewer berhasil dijalankan Senior/Junior→Manager.
- [ ] Perikatan berhasil melewati keempat fase (Perencanaan→Eksekusi→Finalisasi→Arsip) tanpa
      perlu override Partner (§4 `USER-GUIDE.md`) — kalau butuh override, catat KENAPA (gerbang
      mana yang tak terpenuhi) sebagai bahan evaluasi, bukan dianggap kegagalan pilot.
- [ ] Kumpulkan keluhan/pertanyaan berulang dari staf → jadi materi FAQ tambahan di
      `USER-GUIDE.md` §7 kalau memang relevan untuk firma lain juga.

---

## 6. Fase 4 — Keputusan Go-Live

**Checklist sebelum cutover penuh (berhenti pakai proses lama):**
- [ ] Parallel-run (§5) selesai — minimal 1 perikatan tuntas end-to-end.
- [ ] Semua staf pilot sudah login sukses sendiri minimal sekali.
- [ ] Tidak ada blocker P0 terbuka (bug yang menghalangi alur kerja inti — bukan sekadar
      preferensi tampilan).
- [ ] Backup & restore sudah diverifikasi bekerja (`docs/DEPLOY.md` §7) — **jangan go-live
      dengan data klien nyata tanpa ini**.
- [ ] Ari & Partner firma pilot SEPAKAT secara eksplisit untuk lanjut (bukan asumsi "kalau tak
      ada keluhan berarti siap").

**Ini keputusan bisnis, bukan keputusan teknis** — checklist di atas adalah syarat MINIMUM,
bukan jaminan otomatis "go-live". Partner firma pilot yang akhirnya memutuskan.

---

## 7. Fase 5 — Go-Live & Dukungan Pasca

- **Masa dukungan intensif**: 2 minggu pertama (usulan) — kanal bantuan cepat (§0) aktif,
  respons cepat untuk pertanyaan/kendala baru.
- **Check-in terjadwal**: mis. akhir minggu 1 dan minggu 2 pasca go-live — tanya langsung ke
  tiap kelompok peran (bukan tunggu keluhan datang sendiri).
- **Setelah 2 minggu**: turunkan ke dukungan reguler (sesuai kanal insiden di
  `docs/INCIDENT-RESPONSE.md` — SATU kontak teknis, best-effort jam kerja, sudah didokumentasikan
  di sana untuk konteks operasional/insiden; dokumen ini fokus ke onboarding, bukan duplikasi).

---

## 8. Kriteria Sukses Pilot (definisikan SEBELUM mulai, bukan setelah)

Isi bersama Partner firma pilot di Fase 0 — contoh (ganti sesuai konteks nyata):
- [ ] Minimal N perikatan selesai lewat Asseris dalam M bulan pertama tanpa insiden data hilang.
- [ ] Staf melaporkan alur kerja INTI (impor TB, kertas kerja, sign-off) "sama atau lebih cepat"
      dari proses lama pada survei singkat pasca 1 bulan.
- [ ] Tidak ada insiden kehilangan data/kegagalan backup selama masa pilot.
- [ ] Partner firma pilot bersedia menjadi referensi untuk pilot firma berikutnya.

---

## 9. Risiko & Mitigasi

| Risiko | Mitigasi |
|---|---|
| Resistensi staf ("proses lama sudah nyaman") | Kickoff (§3) menekankan APA YANG TIDAK BERUBAH (standar audit tetap sama); parallel-run mengurangi rasa taruhan penuh. |
| Migrasi data historis dari Excel lama | **Di luar cakupan dokumen ini** — perikatan LAMA yang sudah selesai di proses lama TIDAK perlu dipindah ke Asseris; hanya perikatan BARU mulai dari pilot yang memakai Asseris (hindari proyek migrasi data besar yang tak perlu). |
| Staf lupa password/TOTP saat masa kritis | `add-user` (§1.1) belum mencakup fungsi reset — pastikan Ari (operator) SELALU siaga selama Fase 3-5 untuk reset manual cepat (`auth.changePassword` via jalur yang ada, atau kontak langsung). |
| Volume data klien pilot ternyata besar (WTB ribuan baris) | Sudah ada baseline performa & tabel kapasitas — lihat `docs/DEPLOY.md` §19 sebelum pilot dengan klien bervolume besar. |
| Kekhawatiran kepatuhan UU PDP dari klien firma pilot | **Kajian gap awal selesai** (2026-07-03): `docs/PDP-COMPLIANCE-ASSESSMENT.md` (gap pasal-per-pasal), `docs/DATA-HANDLING-COMMITMENT.md` (komitmen internal, BUKAN DPA final), `docs/DATA-RETENTION-POLICY.md` (retensi pasca-kontrak), `docs/HOSTING-DATA-RESIDENCY-REVIEW.md` (region `ap-southeast-3` dinilai memadai untuk profil non-regulasi). **Belum direview pengacara** dan beberapa gap operasional (DSR belum wired ke data nyata, transfer LLM lintas-batas belum ada basis hukum) masih terbuka — tetap **jangan berjanji kepatuhan penuh** ke klien firma pilot sampai `docs/PDP-COMPLIANCE-ASSESSMENT.md` §5 selesai; ini keputusan level firma/legal Ari, bukan sesuatu yang diselesaikan lewat rencana onboarding ini. |

---

## 10. Referensi
- Panduan pengguna: `docs/USER-GUIDE.md`
- Runbook deploy/operator: `docs/DEPLOY.md`
- Respons insiden: `docs/INCIDENT-RESPONSE.md`
- Baseline performa & kapasitas: `docs/DEPLOY.md` §19
- Kepatuhan UU PDP & data-handling: `docs/PDP-COMPLIANCE-ASSESSMENT.md`,
  `docs/DATA-HANDLING-COMMITMENT.md`, `docs/DATA-RETENTION-POLICY.md`,
  `docs/HOSTING-DATA-RESIDENCY-REVIEW.md`
