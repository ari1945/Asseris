# PDP-COMPLIANCE-ASSESSMENT.md — kajian kepatuhan UU PDP 27/2022

> Menutup gap yang dicatat di `docs/PILOT-ONBOARDING-PLAN.md` §9 ("Belum ada kajian kepatuhan UU
> PDP menyeluruh") dan `docs/USER-GUIDE.md` FAQ ("kajian kepatuhan UU PDP ... belum dilakukan").
> **Ini BUKAN legal opinion** — Ari Widodo bukan advokat berlisensi Indonesia untuk isu UU PDP.
> Dokumen ini adalah gap analysis teknis-terhadap-kode (dibaca langsung, bukan ditebak) yang
> ditulis untuk mempercepat review pengacara sungguhan, sama fungsinya dengan
> `docs/PENTEST-READINESS.md` untuk vendor pentest. **Jangan jadikan dokumen ini sebagai dasar
> klaim kepatuhan penuh ke klien firma pilot** sebelum direview counsel.

## 0. Ruang lingkup & konteks (keputusan Ari, 2026-07-03)

- Profil klien firma pilot saat ini: **non-regulasi khusus** (UMKM/PT umum) — bukan entitas
  ter-regulasi OJK (bank/asuransi/emiten). Kajian ini scoped untuk profil itu; kalau kelak ada
  klien ter-regulasi OJK, kajian ini perlu ditinjau ulang (POJK punya ketentuan tambahan di luar
  UU PDP umum).
- Kajian ini **tidak memblokir** pilot berjalan dengan data non-sensitif — konsisten dengan
  `docs/PILOT-ONBOARDING-PLAN.md`. Yang diblokir adalah **klaim kepatuhan penuh** ke klien
  sebelum remediasi §4/§5 selesai.
- Arsitektur relevan: **single-tenant per firma** (`docs/DEPLOY.md`) — satu EC2/DB per KAP, bukan
  SaaS multi-tenant. Ini menyederhanakan sebagian isu (data satu firma tak bercampur firma lain
  di infrastruktur yang sama) tapi tidak menghilangkan kewajiban UU PDP.

## 1. Peran dalam UU PDP — siapa Pengendali, siapa Prosesor

Ini menentukan siapa berkewajiban apa (Ps. 20, Ps. 46) — sering diabaikan tapi krusial:

| Pihak | Peran UU PDP | Implikasi |
|---|---|---|
| **Firma pilot (KAP)** | **Pengendali Data** (data controller) — merekalah yang punya hubungan langsung dengan klien akhir, menentukan tujuan pemrosesan (audit/pajak), dan berhubungan dengan subjek data (kontak klien, staf klien). | Kewajiban notifikasi ke Lembaga PDP & subjek data (Ps. 46) pada dasarnya ada di firma, BUKAN otomatis di Ari. |
| **Ari Widodo / penyedia Asseris** | **Prosesor Data** (data processor) — memroses data atas nama & instruksi firma lewat aplikasi + hosting yang disediakan. | Wajib bantu firma penuhi kewajiban (notifikasi insiden ke firma tanpa penundaan tak wajar, sediakan mekanisme DSR teknis) — bukan pihak yang langsung wajib lapor ke Lembaga PDP, tapi wajib lapor ke Pengendali (firma) segera. Lihat `docs/DATA-HANDLING-COMMITMENT.md` §5. |
| **Staf firma pilot & kontak klien akhir** | **Subjek Data** | Punya hak Ps. 5–13 (akses, koreksi, hapus, dst.) — ditujukan ke Pengendali (firma), bukan langsung ke Ari. |

**Konsekuensi praktis**: kontrak/komitmen data-handling antara Ari↔firma pilot (bukan Ari↔klien
akhir firma) adalah instrumen yang benar untuk menata relasi Prosesor–Pengendali ini — lihat
`docs/DATA-HANDLING-COMMITMENT.md`.

## 2. Gap analysis pasal-per-pasal (kode dibaca langsung, bukan ditebak)

| Area | Pasal | Status kode saat ini | Gap |
|---|---|---|---|
| **Dasar pemrosesan** | Ps. 20 | Kerangka taksonomi ada di `app/data_legaldigital.js:115` (`pdp()`), tapi seed/demo — basis pemrosesan tiap aktivitas belum di-capture dari alur kerja produksi nyata. | Basis hukum pemrosesan data KLIEN AKHIR firma pada dasarnya melekat ke **kontrak audit/pajak firma↔klien mereka** (di luar aplikasi ini) — bukan sesuatu yang aplikasi perlu "minta consent" ulang. Yang perlu jelas: basis Ari memroses data ATAS NAMA firma (kontrak software/DPA, lihat §1). |
| **RoPA (registri aktivitas pemrosesan)** | Ps. 31 | `data_legaldigital.js:125` — daftar RoPA, **data seed**, tidak reflect aktivitas nyata per firma. | Setiap firma pilot perlu RoPA sendiri (real) begitu live — modul ini baru kerangka tampilan. |
| **Hak subjek data (DSR)** | Ps. 5–13 | `data_legaldigital.js:149,178` — katalog hak lengkap + contoh tiket DSR, **seed/demo, tidak wired** ke data nyata (WTB/AJE/WP/TeamMember). Tak ada jalur teknis untuk benar-benar mengeksekusi "hapus data saya" terhadap baris data produksi. | **Gap operasional terbesar**: modul `view_pdp.tsx` menampilkan status, tapi tak ada aksi backend yang benar-benar memenuhi permintaan hapus/akses/portabilitas terhadap data produksi. |
| **Notifikasi insiden kebocoran ≤ 3×24 jam** | Ps. 46 | Alerting SISTEM (downtime/health) sudah ada (`docs/DEPLOY.md` §16, `docs/INCIDENT-RESPONSE.md`) — **tapi itu bukan hal yang sama** dengan proses klasifikasi "apakah insiden ini = kebocoran data pribadi" dan notifikasi wajib ke Lembaga PDP + subjek dalam 3×24 jam. | Tak ada runbook klasifikasi insiden-jadi-breach-PDP maupun template notifikasi Ps. 46. `docs/INCIDENT-RESPONSE.md` fokus ke uptime/ketersediaan, belum ke kerahasiaan data. |
| **Retensi & pemusnahan** | Ps. 16 (prinsip pembatasan retensi) | Kelas retensi terdefinisi (`app/data_records.js:46` — PMPJ 5 thn pasca hubungan berakhir), tapi **tak ditegakkan teknis** — sudah tercatat sebagai Finding K7 di evaluasi sebelumnya (tak ada assembly-lock/purge otomatis). | Lihat `docs/DATA-RETENTION-POLICY.md` — kebijakan + prosedur interim manual dibuat sesi ini; enforcement teknis otomatis tetap gap terbuka (roadmap §6 di dokumen itu). |
| **Minimisasi data** | Ps. 16 | Belum ada audit field-by-field "data apa yang benar-benar perlu disimpan aplikasi" (mis. apakah NIK/nomor identitas pribadi staf klien perlu disimpan penuh atau bisa dimask). | Tidak dinilai sesi ini — rekomendasi §5. |
| **Transfer data lintas batas (cross-border)** | Ps. 56 | **Gap yang belum pernah ditandai sebelumnya**: proksi LLM (`server/src/llm/`, W8) mengirim teks "temuan" audit ke penyedia LLM luar negeri (Anthropic/OpenAI-compatible) dengan redaksi egress — tapi redaksi mengurangi risiko, **tidak menghilangkan** status "transfer data ke luar negeri" jika ada residu data pribadi lolos redaksi. | UU PDP Ps. 56 mensyaratkan negara tujuan punya tingkat pelindungan setara/lebih tinggi, ATAU consent subjek data, ATAU perjanjian yang mengikat — **belum ada penilaian ini sama sekali**. Tandai sebagai prioritas kajian legal (§5). |
| **Data staf firma sendiri** | Ps. 20, 5–13 | `TeamMember`/`User` menyimpan PII staf firma (nama, email) untuk keperluan akun — jauh lebih sederhana (relasi kerja langsung, bukan pihak ketiga) tapi tetap tunduk UU PDP untuk hal seperti retensi pasca-resign. | Belum ada kebijakan retensi akun staf resign — cross-ref `docs/DATA-RETENTION-POLICY.md`. |

## 3. Yang SUDAH memadai (jangan dibangun ulang)

- Enkripsi data-at-rest untuk secret sensitif (TOTP AES-256-GCM), enkripsi backup (`docs/DEPLOY.md` §1), TLS in-transit — pengendalian teknis dasar UU PDP Ps. 39 ("langkah teknis yang layak") sudah terpenuhi sebagian besar, bukan nol seperti kesan awal evaluasi.
- Jejak audit hash-chained (`AuditLog`) — mendukung akuntabilitas (Ps. 44) meski bukan tujuan awal desainnya.
- Isolasi single-tenant per firma — mengurangi risiko kebocoran silang-firma secara arsitektural (bukan kontrol UU PDP eksplisit, tapi efeknya relevan).

## 4. Prioritas remediasi — TIDAK blocking pilot data non-sensitif

| # | Item | Kenapa tidak blocking sekarang |
|---|---|---|
| 1 | RoPA nyata per firma pilot (bukan seed) | Data pilot non-sensitif per keputusan Ari — RoPA formal bisa menyusul sebelum data sensitif masuk. |
| 2 | Wiring DSR ke data produksi nyata | Belum ada permintaan DSR nyata dari klien pilot; siapkan SEBELUM ada, bukan reaktif setelah diminta. |
| 3 | Runbook klasifikasi insiden→breach-PDP + template notifikasi Ps. 46 | Perlu ada SEBELUM insiden nyata terjadi — prioritas lebih tinggi dari #1/#2 karena konsekuensi keterlambatan (denda/sanksi) lebih besar. |

## 5. WAJIB diselesaikan sebelum data klien SENSITIF nyata masuk (bukan basa-basi)

1. **Review pengacara Indonesia** atas seluruh dokumen ini + `docs/DATA-HANDLING-COMMITMENT.md` +
   `docs/DATA-RETENTION-POLICY.md` — tak ada satu pun boleh dijadikan klaim kepatuhan formal ke
   klien tanpa ini.
2. **Penilaian transfer lintas-batas LLM (§2)** — opsi: (a) matikan/skip fitur LLM (W8) untuk data
   sensitif, (b) dapatkan basis hukum yang sah (consent/perjanjian), atau (c) pastikan redaksi
   egress benar-benar menghilangkan SELURUH data pribadi sebelum keluar (butuh audit redaksi
   independen, bukan asumsi "sudah diredaksi").
3. **Wiring DSR nyata** — minimal jalur manual terdokumentasi (siapa dihubungi, SOP internal)
   sebagai jembatan sebelum otomatisasi teknis ada.
4. **Runbook breach-PDP** — perluasan `docs/INCIDENT-RESPONSE.md` khusus klasifikasi kebocoran
   data pribadi + draft notifikasi Ps. 46.

## 6. Referensi
- Peran & tanggung jawab data-handling: `docs/DATA-HANDLING-COMMITMENT.md`
- Retensi & pemusnahan: `docs/DATA-RETENTION-POLICY.md`
- Lokasi hosting: `docs/HOSTING-DATA-RESIDENCY-REVIEW.md`
- Insiden sistem (bukan breach-PDP spesifik): `docs/INCIDENT-RESPONSE.md`
- Kerangka kode existing: `app/data_legaldigital.js` (modul `pdp()`), `app/data_records.js`
  (kelas retensi), `app/view_pdp.tsx` (tampilan RoPA/DSR)
- Rencana pilot: `docs/PILOT-ONBOARDING-PLAN.md` §9 · Panduan pengguna: `docs/USER-GUIDE.md`

## 7. Status
2026-07-03: **kajian gap awal selesai** (dokumen ini), remediasi §4/§5 **belum dieksekusi**.
Menunggu keputusan Ari kapan melibatkan counsel eksternal (lihat §5.1).
