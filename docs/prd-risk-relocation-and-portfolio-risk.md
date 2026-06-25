# PRD — Relokasi Risk Assessment (RoMM) + Portfolio Risk View Lintas-Klien

| Field | Isi |
|---|---|
| Tanggal | 2026-06-25 |
| Pemilik | Ari Widodo |
| Status | Draft |
| Engagement ID terkait | — (perubahan platform Asseris, lintas-engagement) |

---

## 1. Problem

Dua masalah saling terkait pada arsitektur informasi modul risiko:

1. **Salah-tempat konseptual.** Modul `risk` ("Risk Assessment") berisi **Register Risiko Salah Saji Material (RoMM) SA 315/330** — kerja perencanaan **per-perikatan** (di-scope ke `activeEngagement`, export `scope:'engagement'`, fraud SA 240, level asersi). Tapi ia ditempatkan di grup **Firm Practice Management**, yang oleh `WORKSPACES` dipetakan ke workspace **`firm` ("Operasi & tata kelola firma")** — bukan workspace **`engagement` ("Kerja audit per-engagement")**. Akibatnya RoMM terpisah dari saudara perencanaan alaminya: **Materiality (SA 320)**, **Strategy Memo (SA 300)**, **ICFR** yang ada di **Core Planning**. Alur baku SA 315 → 320 → 300 → 330 terpecah lintas-workspace.

2. **Kebutuhan firm-level yang belum terpenuhi.** Partner tidak punya tampilan **agregat profil risiko lintas-klien** — siapa klien paling berisiko, berapa banyak risiko signifikan/fraud terbuka di seluruh portofolio, di mana konsentrasi risiko per industri/partner. Saat ini risiko hanya bisa dilihat satu-engagement-pada-satu-waktu.

## 2. Objective

- Mengembalikan RoMM ke tempat konseptual yang benar (workspace engagement, fase Perencanaan) sehingga rantai SA 315→320→300→330 utuh dalam satu alur.
- Memberi Partner alat pengawasan portofolio: profil risiko teragregasi lintas-klien untuk keputusan alokasi sumber daya, EQR, dan penerimaan/keberlanjutan.
- Menjaga pemisahan konseptual yang benar: **RoMM (perikatan)** vs **risiko portofolio/firma (pengawasan)** — dua modul berbeda, bukan satu modul dipakai-ulang untuk dua tujuan.

## 3. Success Criteria

1. Modul `risk` muncul di sidebar **workspace Perikatan → grup Core Planning**, diurutkan **sebelum** Materiality (urutan SA 315 → 320 → 300).
2. Modul `risk` **tidak lagi** muncul di workspace Firma; route/view/data tidak berubah (regresi nol pada fungsi RoMM).
3. Tab/panel baru **"Risiko Portofolio"** dapat diakses Partner (dan Manager via VIEW_ALL) pada Firm Dashboard, menampilkan minimal: (a) jumlah risiko signifikan & fraud terbuka lintas-engagement, (b) ranking klien berdasarkan skor risiko, (c) heatmap/konsentrasi.
4. Angka portofolio **konsisten** dengan register per-engagement (SSOT — agregat, bukan angka hardcode baru).
5. `npm run typecheck` = 0 error; `npm run lint` bersih; semua test eksisting tetap hijau.
6. Staf non-oversight (Junior/Senior) **tidak** melihat panel portofolio (RBAC).

## 4. Scope

**Bagian A — Relokasi (kecil, berisiko-rendah):**
- Pindahkan objek `{ id:'risk', label:'Risk Assessment', … }` dari array grup `Firm Practice Management` → `Core Planning` di `icons.tsx`, posisi sebelum `materiality`.

**Bagian B — Portfolio Risk View (fitur baru):**
- Agregator firm-level (modul/util baru) yang menghasilkan profil risiko per-engagement lintas portofolio dari sumber kanonik.
- Panel/tab **"Risiko Portofolio"** pada Firm Dashboard (`view_dashboard`), gated Partner/Manager.
- Konten minimum: KPI strip (total RoMM, signifikan, fraud terbuka lintas-klien), tabel ranking klien (klien · partner · industri · #signifikan · #fraud · skor tertinggi · fase), dan heatmap/treemap konsentrasi. Klik baris → drill ke engagement terkait.

## 5. Non-Scope

- **Tidak** mengubah logika perhitungan RoMM, skema data risk, atau persist seam.
- **Tidak** membangun modul "Penerimaan & Keberlanjutan klien (ISQM 1/SA 220)" — itu kandidat terpisah untuk mengisi slot FPM yang ditinggalkan (dicatat di Open Questions, bukan dikerjakan di sini).
- **Tidak** menambah heatmap baru di SOQM/ISQM yang sudah ada (`SOQM_RISKS` adalah risiko mutu firma, domain berbeda — jangan dicampur).
- **Tidak** mengubah RBAC primitives; hanya memakai gate VIEW_ALL yang ada.

## 6. Constraints

- **Orang/Waktu:** solo; perubahan harus inkremental & dapat di-review per-bagian (A lebih dulu, B menyusul).
- **Sistem/SSOT:** angka portofolio wajib berasal dari sumber kanonik (register per-engagement / `ENGAGEMENTS`), bukan hardcode. ESLint `no-explicit-any` ratchet aktif — kode `.ts` baru harus bebas-`any` (view `.tsx` boleh `:any` props sesuai baseline W12).
- **Arsitektur:** ESM-only, edit di `migration/src/*`. Gerbang `typecheck`/`lint`/test wajib hijau.
- **Data demo:** register `risks` persist per-engagement; seed hanya mengisi `ENG-2025-014`. Engagement lain belum punya register tersimpan (lihat Risks).

## 7. Existing Solutions

- **Firm Dashboard** (`view_dashboard`) sudah menampilkan tabel engagement lintas-klien (klien, fase, progress, partner, deadline) → tempat alami untuk panel portofolio, pola tabel sudah ada.
- **RiskAssessment** (`view_risk`) sudah punya heatmap 5×5 & scoring util (`scoreColor`, `scoreLabel`) yang bisa dipakai-ulang untuk konsistensi visual.
- **ENGAGEMENTS** menyediakan metadata lintas-engagement (klien, partner, fase). **RISKS** menyediakan register kanonik per-engagement.
- **SOQM_RISKS / ISQM view** menangani risiko mutu firma — sengaja TIDAK dipakai agar domain tak tercampur.
- Tidak ada agregator risiko lintas-engagement saat ini → custom work bagian B terjustifikasi; bagian A murni relokasi registry.

## 8. Proposed Approach

**Bagian A (relokasi):** satu pemindahan objek di `MODULES` (`icons.tsx`). Tanpa sentuh route/view/data. Risiko teknis ~nol.

**Bagian B (portfolio):**
- Buat util agregator `portfolioRisk()` (mis. di `data_fpm.ts` atau util baru) yang, untuk tiap engagement di `ENGAGEMENTS`, menurunkan profil risiko: # risiko, # signifikan (skor ≥12), # fraud, skor tertinggi. Sumber: register kanonik bila tersedia; bila engagement belum punya register tersimpan → derive profil ringkas deterministik dari metadata engagement (fase/industri/ukuran) sebagai **proksi yang ditandai jelas**, atau tampilkan "belum dinilai". (Keputusan A vs proksi → Open Questions.)
- Render panel di Firm Dashboard sebagai **tab baru** ("Risiko Portofolio") atau panel di bawah, dipilih agar tidak membebani tampilan default Partner.
- Reuse `scoreColor/scoreLabel` + pola tabel dashboard. Klik baris → `nav('risk', { from:'dashboard' })` setelah set engagement aktif (drill-down).

**Alasan dipilih:** memaksimalkan reuse (heatmap, tabel, scoring), menghormati SSOT, dan memisahkan dua konsep risiko secara bersih — bukan menambah modul sidebar baru yang menduplikasi RoMM.

## 9. Risks

| Risiko | Dampak | Mitigasi |
|---|---|---|
| **Data lintas-engagement tipis** — hanya 1 engagement punya register tersimpan di seed | Portfolio view terlihat kosong/menyesatkan | Tandai engagement "belum dinilai"; sediakan proksi deterministik yang BERLABEL; atau seed register ringkas untuk beberapa engagement demo (keputusan di Open Q) |
| Membaca banyak StateDoc per-engagement (jika ambil register live server-side) mahal/berbelit | Kompleksitas & performa | Untuk MVP, agregasi dari `ENGAGEMENTS` + register demo yang tersedia; agregasi live multi-StateDoc ditunda ke fase berikut |
| Relokasi tak sengaja menghapus modul dari workspace mana pun | `risk` jadi tak terjangkau | Verifikasi `risk` ada tepat di satu grup (Core Planning) dan grup itu termasuk workspace `engagement`; smoke-test sidebar |
| Kebocoran RBAC — staf non-oversight melihat profil seluruh klien | Pelanggaran kerahasiaan/segregasi | Gate panel dengan VIEW_ALL (Partner+Manager); uji dengan role Manager & Junior, bukan hanya Partner |
| Angka portofolio menyimpang dari register | Pelanggaran SSOT, hilang kepercayaan | Agregator murni turunan; tambah test yang membandingkan agregat vs sumber |

## 10. Implementation Plan

**Fase A — Relokasi (1 commit):**
1. Pindah objek `risk` di `icons.tsx` ke `Core Planning` (sebelum `materiality`).
2. `typecheck` + `lint` + test; smoke-test sidebar (muncul di Perikatan→Core Planning, hilang dari Firma).

**Fase B — Portfolio Risk View (1–2 commit):**
3. Tulis util agregator `portfolioRisk()` + tipe; unit test agregasi vs sumber.
4. Tambah tab/panel "Risiko Portofolio" di `view_dashboard`, gated VIEW_ALL; reuse `scoreColor/scoreLabel` + drill-down `nav`.
5. Verifikasi RBAC (Partner/Manager lihat; Junior tidak). `typecheck`/`lint`/test hijau.
6. (Opsional) Seed register ringkas untuk 2–3 engagement demo agar tampilan bermakna.

## 11. Open Questions

1. **Sumber data portofolio:** (a) agregasi dari register kanonik per-engagement yang tersedia saja + label "belum dinilai" untuk sisanya, **atau** (b) seed register ringkas untuk beberapa engagement demo agar view langsung kaya, **atau** (c) proksi deterministik dari metadata engagement berlabel jelas? → **Rekomendasi: (a) untuk MVP**, (b) hanya jika ingin demo lebih meyakinkan.
2. **Penempatan UI:** tab baru di Firm Dashboard vs panel inline di bawah tabel engagement? → **Rekomendasi: tab** ("Risiko Portofolio") agar default Partner tetap ringkas.
3. **Slot FPM yang ditinggalkan:** apakah akan diisi modul **"Penerimaan & Keberlanjutan (ISQM 1/SA 220)"** di kemudian hari? (Di luar scope PRD ini — perlu PRD sendiri.)
4. **Drill-down:** klik baris portofolio harus mengubah `activeEngagement` lalu nav ke `risk` — konfirmasi pola set-active-engagement yang aman (guarded `setActiveEngagementId`, RBAC isolasi W7.5).

---
**Sign-off:** ditandai dengan balasan **"Proceed."**
