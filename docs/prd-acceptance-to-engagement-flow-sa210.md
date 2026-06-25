# PRD — Sambungan Akseptasi → Perikatan + Gerbang Surat Perikatan (SA 210 / SA 220 / ISQM 1)

| Field | Isi |
|---|---|
| Tanggal | 2026-06-25 |
| Pemilik | Ari Widodo |
| Status | Draft — **menunggu sign-off** |
| Engagement ID terkait | — (lintas: `onboarding` firm-level → siklus engagement) |
| Asal | Evaluasi modul 2026-06-25, isu #2 (flow akseptasi) |

> ⚠️ **Pushback dulu (truth over agreement + prefer existing solutions).** Godaan: "bangun modul penerimaan perikatan". **Jangan.** Setelah baca kode, hampir semua bahan SUDAH ADA — akseptasi berbobot (`obAccScore`/`obAccVerdict`), funnel 4-gerbang termasuk *Engagement Letter*, register keberlanjutan (`continuance`), dan pola gerbang bertingkat (`usePhaseGate`/`PhaseGateDialog`). Yang **hilang hanyalah dua kabel**: (a) prospek-diterima tidak pernah *menjadi* engagement, dan (b) tidak ada gerbang yang menahan perikatan mulai fieldwork tanpa akseptasi+surat perikatan. PRD ini sengaja sempit: **menyambung, bukan membangun.** Baca §7, lalu putuskan di §11.

## 1. Problem

Penugasan audit riil berurutan: **akseptasi/keberlanjutan (SA 220/ISQM 1) → surat perikatan ditandatangani (SA 210) → baru tim mulai fieldwork.** Di Asseris urutan itu tidak terjaga:

1. **Akseptasi ↛ Perikatan (terputus).** `onboarding` menjalankan akseptasi + PMPJ + label "Engagement Letter" + "Konversi" atas `PROSPECTS` (`view_onboarding3.tsx:31-41`, skor `obAccScore`), **tetapi tidak ada jalur kode yang mengubah prospek diterima menjadi engagement.** Engagement dibuat manual lewat `EngagementForm` (`view_firm.tsx:457`) → `addEngagement` (`contexts.tsx:316`), yang hanya minta `clientId` + parameter tim/anggaran. Tidak ada referensi ke keputusan akseptasi/keberlanjutan.
2. **SA 210 tanpa gerbang.** `addEngagement` langsung menstempel `phase:'Perencanaan', progress:5` (`contexts.tsx:319`). Tidak ada artefak surat perikatan, tidak ada syarat surat ditandatangani sebelum perikatan berjalan. "Engagement Letter" hanya label funnel di onboarding, bukan kondisi yang mengikat siklus engagement.
3. **Konsekuensi:** perikatan bisa eksis (bahkan masuk Eksekusi) tanpa pernah lulus akseptasi atau punya surat perikatan — pelanggaran SA 210.1/.10 (terms agreed in writing sebelum perikatan) dan SA 220/ISQM 1 (akseptasi/keberlanjutan sebelum mulai). Sebaliknya, prospek bisa **ditolak** di akseptasi namun engagement tetap dibuat manual karena dua proses tak saling tahu.

Ini bukan masalah kosmetik: ini retakan kepatuhan di **awal** lifecycle, tempat yang paling sulit ditambal belakangan (dokumentasi back-dating = temuan inspeksi PPPK).

## 2. Objective

Menjadikan siklus engagement **mewarisi keputusan akseptasi/keberlanjutan** dan **tidak bisa memasuki fieldwork tanpa surat perikatan ditandatangani** — dengan menyambung modul yang sudah ada, bukan menduplikasi. Outcome: setiap engagement dapat ditelusuri balik ke (1) keputusan penerimaan/keberlanjutan dan (2) surat perikatan SA 210, dan gerbang itu mengikat secara bertingkat (warn → confirm + override-ter-log), konsisten dengan pola P5.

## 3. Success Criteria

1. **Konversi 1-arah:** dari registri Akseptasi (`view_onboarding3` / Konversi) ada aksi **"Jadikan Perikatan"** yang memanggil `addEngagement` dengan field warisan: `originProspectId`, `acceptanceRef` (skor + verdict + approver + tanggal), `clientKind` ('Klien Baru' | 'Keberlanjutan'). Prospek ditandai `converted:true`.
2. **Surat perikatan jadi artefak:** engagement menyimpan `engagementLetter: { ref, signedDate, signedBy, status: 'none'|'draft'|'signed' }` (engagement-scoped, SSOT via `useServerState`/`useAmsPersist`).
3. **Gerbang masuk Eksekusi (SA 210/220):** transisi **Perencanaan → Eksekusi** memperoleh kriteria baru di `engagementGate` (`wp_signoff.tsx`):
   - akseptasi/keberlanjutan **disetujui** (klien baru → `acceptance.approved`; klien lanjutan → keputusan `continuance` = Lanjut/Lanjut-dgn-Syarat), **dan**
   - `engagementLetter.status === 'signed'`.
   Severity **`confirm`** (boleh override, ter-log `gate-override`), **selaras pola eksisting** (Finalisasi=warn, Arsip=confirm) — bukan hard-block kaku.
4. **Penciptaan manual tetap boleh, tapi ditandai.** Engagement tanpa `acceptanceRef` lahir dengan flag **"Pra-akseptasi"** yang tampil di Cockpit & Engagement Mgmt; tidak memblok pembuatan (lihat §11 Opsi).
5. **Tidak ada duplikasi:** akseptasi tetap dihitung `obAccScore`/`obAccVerdict`; keberlanjutan tetap milik `continuance`; gerbang memakai `usePhaseGate`/`PhaseGateDialog` yang ada.
6. Gate kualitas: `typecheck` 0 · `lint` bersih (ratchet no-explicit-any: util `.ts` baru bebas-any) · test hijau, termasuk unit test fungsi gerbang baru (precondition acceptance+letter).

## 4. Scope

- **Konversi prospek→engagement**: aksi + payload warisan di sisi onboarding/firm; `addEngagement` menerima & menyimpan field baru (`contexts.tsx`).
- **Artefak surat perikatan**: model + UI ringkas (status none/draft/signed, tanggal, penandatangan, ref) di Engagement Detail atau tab Perencanaan. Boleh menumpang template SA 210 yang ada di `templates` bila tersedia (link, bukan salin).
- **Kriteria gerbang Perencanaan→Eksekusi** di `engagementGate` + ringkasan blocker di dialog (`PhaseGateDialog`) — pola identik gate Arsip.
- **Flag "Pra-akseptasi"** + surfacing di Cockpit/Engagement Mgmt.
- **Util murni bertipe + test**: `engagementEntryGate(eng, acceptance|continuance, letter) → { ok, blockers[] }`.

## 5. Non-Scope

- **TIDAK** membangun ulang akseptasi, PMPJ/KYC, atau model skor — milik `onboarding`/`continuance`; PRD ini hanya membaca keputusannya.
- **TIDAK** membuat editor surat perikatan kaya (rich-text/e-sign). Cukup artefak status+metadata + link ke template. e-Meterai/e-sign = di luar scope (lihat W10.5: segel ≠ e-Meterai).
- **TIDAK** mengubah gerbang Finalisasi/Arsip yang sudah ada (hanya menambah satu gerbang baru di muka).
- **TIDAK** memaksa hard-block penciptaan engagement (default = warn + flag; opsi hard-block ada di §11).
- **TIDAK** menyentuh isolasi data per-engagement (W7.5) selain mewarisi pola scope yang ada.

## 6. Constraints

- ESM-only; edit `migration/src/*`. Boot/`window` legacy tetap dihormati selama belum dilucuti.
- SSOT: precondition diturunkan dari kanon/data eksisting (`PROSPECTS.acceptance`, `continuance` decisions, `INDEPENDENCE`); surat perikatan engagement-scoped.
- Ratchet `no-explicit-any`: kode util `.ts` baru **wajib bebas-any**; view `.tsx` boleh `:any` props baseline.
- Solo; harus inkremental & dapat di-review per langkah.
- **Compat data:** `ENGAGEMENTS` lama tak punya `engagementLetter`/`acceptanceRef` — gerbang harus *fail-safe*: engagement legacy diperlakukan "Pra-akseptasi", bukan crash.

## 7. Existing Solutions — **baca ini sebelum menyetujui**

| Sudah ada | Lokasi | Menangani | Kenapa belum cukup |
|---|---|---|---|
| Akseptasi berbobot + verdict | `view_onboarding.tsx:27` (`obAccScore`/`obAccVerdict`), `view_onboarding3.tsx:108` | Skor faktor SA 220/300, putusan Disetujui/Syarat/Pending | Keputusannya **tak pernah mengalir** ke engagement |
| Funnel 4-gerbang (Akseptasi→PMPJ→**Letter**→Konversi) | `view_onboarding3.tsx:31-41` | Visual tahapan prospek + SLA | "Letter" & "Konversi" hanya **label funnel** — tak ada artefak surat, tak ada aksi konversi yang membuat engagement |
| Register Keberlanjutan (ISQM 1 ¶33-34) | `continuance`, `prd-continuance-register-isqm.md` | Keputusan keberlanjutan klien aktif | Untuk klien **lanjutan**; juga belum jadi precondition gerbang engagement |
| `addEngagement` | `contexts.tsx:316-320` | Buat engagement (Perencanaan, progress 5) | Tanpa precondition akseptasi & tanpa field warisan/surat |
| Gerbang fase bertingkat | `wp_signoff.tsx:469-523` (`engagementGate`), `usePhaseGate`/`PhaseGateDialog` | warn/confirm + override ter-log; gate Arsip 4-kriteria | Hanya melindungi **Finalisasi & Arsip**; muka lifecycle (→Eksekusi) tak bergerbang |
| `setEngagementPhase` | `contexts.tsx:310-312` | Set fase + status + progress | Tak memanggil gerbang muka apa pun |
| Template surat perikatan | `templates` (cek `TEMPLATES`) | Kemungkinan ada draf SA 210 | Belum tertaut sebagai artefak engagement |

**Kesimpulan §7:** ≥80% bahan ada. Custom work yang dibenarkan: **(1) aksi konversi + payload warisan, (2) artefak surat perikatan minimal, (3) satu fungsi+kriteria gerbang baru.** Sisanya reuse.

## 8. Proposed Approach

**Sambungkan, dengan gerbang di titik yang benar.** Titik kritis bukan saat *pembuatan* engagement (di praktik, shell engagement & perencanaan awal kadang dibuat sebelum tinta surat kering), melainkan **transisi ke Eksekusi/fieldwork** — itulah garis yang SA 210/220 jaga. Maka:

1. **Konversi (sisi onboarding/firm).** Tambah aksi "Jadikan Perikatan" pada prospek `acceptance.approved` (atau klien lanjutan ber-keputusan Lanjut). Aksi memanggil `addEngagement({ ...params, originProspectId, acceptanceRef, clientKind })`, set `prospect.converted=true`. `EngagementForm` tetap ada untuk shell manual, tapi hasilnya flag "Pra-akseptasi".
2. **Artefak surat (sisi engagement).** Simpan `engagementLetter` engagement-scoped; UI ringkas di Perencanaan: status none→draft→signed + tanggal + penandatangan + link template SA 210.
3. **Fungsi gerbang murni.** `engagementEntryGate(eng, decision, letter): { ok, blockers[] }` — bebas-any, ber-test. Dipakai `engagementGate` untuk cabang `toPhase==='Eksekusi'` dengan severity `confirm`.
4. **Surfacing.** Blocker tampil di `PhaseGateDialog` (pola sama Arsip) + chip "Pra-akseptasi/Belum ada Surat" di Cockpit & Engagement Mgmt. RELATED_SA `onboarding` sudah memetakan SA 210/220 (`icons.tsx:358`) — perluas konteks ke engagement.

**Alasan dipilih vs alternatif:**
- *vs hard-block penciptaan:* menolak praktik riil (perencanaan dini) & berisiko mengunci pengguna; gate-di-Eksekusi lebih tepat dan tetap memenuhi SA 210 (fieldwork = "melaksanakan perikatan").
- *vs modul baru "Acceptance":* duplikasi terang-terangan terhadap `onboarding`+`continuance` (langgar aturan prefer-existing & anti-duplikasi).
- *vs gerbang `warn` saja:* terlalu lemah untuk garis kepatuhan SA 210; `confirm`+override-ter-log memberi jejak audit atas pengecualian (justru bukti tata kelola).

## 9. Risks

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Data engagement legacy tanpa field baru | Gerbang crash / false-block | Util fail-safe: tak-ada-field ⇒ blocker "Pra-akseptasi" (bukan exception); test kasus legacy |
| Over-gating menghambat alur kerja nyata | Pengguna frustrasi/abaikan | Severity `confirm` + override ter-log, bukan hard-block; flag informatif di Cockpit |
| Duplikasi tak sengaja model akseptasi | Dua sumber kebenaran | Hanya **membaca** `acceptance`/`continuance`; tak menyimpan ulang skor |
| Surat perikatan jadi cakupan-merayap (rich editor/e-sign) | Scope blow-up | Non-Scope tegas: artefak status+metadata+link saja |
| Konversi ganda (prospek dikonversi 2×) | Engagement duplikat | `converted` flag + guard idempoten di aksi konversi |
| RBAC: siapa boleh menandatangani surat / override gerbang | Pemisahan tugas (lihat defect SoD) | Tandatangan & override = peran Partner/Manajer; ikuti `rbac.ts`; **jangan ulangi pola order-based** dari defect `asseris-opinion-signoff-sod-defect` |

## 10. Implementation Plan

- **M1 — Util + test (fondasi).** `engagementEntryGate()` murni bertipe + unit test (klien baru disetujui+signed = ok; pending = blocker; lanjutan; legacy fail-safe). Tanpa UI. *Gate: typecheck/lint/test hijau.*
- **M2 — Model warisan.** Perluas `addEngagement` + tipe engagement (`acceptanceRef`, `originProspectId`, `clientKind`, `engagementLetter`); migrasi fail-safe data lama. 
- **M3 — Aksi konversi.** Tombol "Jadikan Perikatan" di registri Akseptasi/Konversi; idempoten; set `converted`.
- **M4 — Artefak surat + gerbang.** UI surat perikatan di Perencanaan; wire `engagementEntryGate` ke cabang `→Eksekusi` di `engagementGate`; dialog blocker.
- **M5 — Surfacing + RBAC.** Flag "Pra-akseptasi/Belum ada Surat" di Cockpit & Engagement Mgmt; RBAC tandatangan/override; verifikasi live **dengan peran Manajer** (bukan Partner) agar RBAC ketahuan (pelajaran dari memory).
- **M6 — Regression + docs.** Pastikan gate Finalisasi/Arsip tak berubah perilaku; update memory arc.

Tiap milestone = satu commit/PR kecil, dapat di-review terpisah.

## 11. Open Questions — **butuh keputusan Anda**

1. **Titik gerbang.** *(Rekomendasi: Opsi A)*
   - **A.** Gate di **Perencanaan→Eksekusi** (`confirm`+override). Penciptaan bebas, engagement "Pra-akseptasi" diberi flag. ← praktik-riil & SA-210-compliant.
   - **B.** Tambah juga **soft-warn saat penciptaan manual** tanpa `acceptanceRef`.
   - **C.** **Hard-block penciptaan** tanpa akseptasi disetujui (paling ketat; berisiko mengganggu perencanaan dini).
2. **Lingkup surat perikatan.** Artefak minimal (status+metadata+link template) — cukup, atau Anda mau builder surat dari template SA 210 (memperbesar M4)?
3. **PIE/Listed:** apakah akseptasi klien PIE harus sekaligus **menjadwalkan EQR** sebagai precondition Eksekusi (tie ke gate EQR Arsip yang sudah ada), atau cukup di gerbang Arsip seperti sekarang?
4. **Override gerbang:** peran mana yang boleh override (`gate-override`)? Partner saja, atau Partner+Manajer? (selaraskan dgn `rbac.ts` & hindari pola SoD bermasalah).
5. **Klien lanjutan tanpa prospek:** keputusan keberlanjutan diambil dari modul `continuance` — apakah `continuance` perlu aksi "Jadikan Perikatan" yang sama, atau cukup engagement mewarisi keputusan terakhir secara otomatis?

---
**Sign-off:** balas **"Proceed."** (sebut pilihan §11 — minimal Q1) untuk memulai M1.
