# PRD — AK-01: Penomoran PSAK (cross-walk lama↔baru, SSOT + padanan ter-surface)

**Status:** DRAFT — menunggu sign-off ("Proceed.")
**Branch:** `ak01-psak-renumber` (off master pasca-merge PR#18)
**Sumber gap:** Matriks Gap auditor, baris **AK-01** (P2, Severitas Sedang).
**Sumber kebenaran mapping:** dokumen resmi IAI *"Perubahan Penomoran PSAK dan ISAK dalam SAK Indonesia"* ([iaiglobal.or.id](https://web.iaiglobal.or.id/Berita-IAI/detail/penomoran_psak_dan_isak_dalam_sak_indonesia)) — efektif 1 Jan 2024, **substansi tak berubah**, hanya penomoran.

---

## 1. Problem
AK-01 (kutipan matriks): *"Modul masih memakai penomoran lama (psak71/72/73/22/48); hanya psak117 memakai penomoran baru — campur & tidak konsisten. Referensi standar usang/tidak konsisten bagi pengguna & telaah."* Rekomendasi: *"Petakan ulang label & cross-ref ke penomoran baru; tampilkan padanan lama/baru."*

Verifikasi saya menemukan **dua hal**:
1. **Inkonsistensi penomoran** — modul `psak71/72/73/22/46/48/65/1/58` berlabel nomor lama; `psak117` pakai baru. Tak ada **peta padanan kanonik** lama↔baru di kode.
2. **🐞 Bug data nyata** — `data_sakroadmap.ts` melabeli **"PSAK 207 = IFRS 18 / Penyajian"** dan **"PSAK 208 = IFRS 19"**, padahal per dokumen resmi IAI **PSAK 207 = Laporan Arus Kas (lama PSAK 2)** dan **PSAK 208 = Kebijakan Akuntansi/Estimasi/Kesalahan (lama PSAK 25)**. Nomor 207/208 di kode menabrak penomoran resmi (tebakan untuk standar IFRS 18/19 yang efektif 2027, nomor PSAK-nya belum ditetapkan IAI).

## 2. Objective
1. Sediakan **peta padanan PSAK/ISAK lama↔baru kanonik (SSOT)** dari dokumen resmi IAI — satu sumber, tercitasi.
2. **Surface padanan lama/baru** di titik user-facing utama (cross-walk reference + anotasi label modul) sehingga referensi konsisten & dapat ditelaah.
3. **Perbaiki bug 207/208** agar tak menegaskan nomor resmi yang salah.

## 3. Success Criteria
1. `AMS_CANON.psakRenumber(old)` / peta `PSAK_RENUMBER` mengembalikan {nomor baru, judul, ifrs} untuk standar yang dipakai app; nilai = **persis dokumen IAI** (diuji unit terhadap baris kunci).
2. **Cross-walk table** (lama ↔ baru ↔ judul ↔ acuan IFRS/IAS) tampil di `view_sakroadmap.tsx` — memenuhi "tampilkan padanan lama/baru".
3. Label modul PSAK menampilkan padanan baru (mis. chip/sublabel "≡ PSAK 109") — tanpa mengubah **id modul** (routing).
4. Entri IFRS 18/19 di `data_sakroadmap.ts` tak lagi memakai 207/208 (relabel "adopsi IFRS 18 — nomor PSAK menyusul").
5. Gate: tsc 0 (full strict) · eslint 0 (nol :any baru) · vitest hijau (+ uji map).

## 4. Scope
- Peta kanonik (data + helper canon) untuk standar **yang dirujuk app** (PSAK 1/2/22/24/25/46/48/57/58/65/71/72/73/74 + ISAK 35/36 yang ada modul/relevan). Tabel penuh IAI boleh disertakan sebagai data referensi.
- Cross-walk UI di `view_sakroadmap.tsx`.
- Anotasi label modul PSAK (icons.tsx) + (opsional) chip `RELATED_SA`.
- Fix mislabel 207/208 di `data_sakroadmap.ts`.

## 5. Non-Scope
- **Tidak** mengubah `id` modul (`psak71` dst.) — routing/persist keys terikat padanya.
- **Tidak** menebak nomor PSAK untuk IFRS 18/19 (belum ditetapkan IAI).
- **Tidak** rewrite 427 string "PSAK xx" lintas 30 file — surfacing terarah, bukan cari-ganti buta.
- Tidak mengubah substansi/perhitungan canon (penomoran ≠ substansi).

## 6. Constraints
- ESM `migration/src`; full strict tsc; ratchet no-explicit-any.
- **SSOT**: satu peta; UI menarik dari sana, tak ada daftar ditulis ulang (pola `sakHorizon`).
- **Akurasi = wajib**: nilai map tervalidasi terhadap dokumen IAI resmi (tercitasi di komentar sumber). Tak ada nomor hasil tebakan.

## 7. Existing Solutions (reuse)
- `data_sakroadmap.ts` + `AMS_CANON.sakHorizon()` — SSOT horizon SAK; tiap STANDARD sudah punya `ifrs` & sebagian `replaces`. Peta padanan ditambahkan **di sini** (rumah yang tepat) lalu diekspos via `AMS_CANON`.
- `view_sakroadmap.tsx` — view existing; cross-walk jadi tab/panel baru di sini.
- Pola `MODULES` label (icons.tsx) untuk anotasi.

## 8. Proposed Approach
1. **Data + canon (SSOT)** — `PSAK_RENUMBER` (array {old, neu, title, ref}) dari dokumen IAI (komentar sumber + tanggal akses) + `psakRenumber(old)` helper + ekspos `AMS_CANON.PSAK_RENUMBER`/`psakRenumber`. Uji unit kunci (71→109, 73→116, 22→103, 25→208, 46→212, 48→236, 65→110).
2. **Fix bug** — relabel entri IFRS 18 ("PSAK 207") & IFRS 19 ("PSAK 208") di `data_sakroadmap.ts` agar tak menabrak nomor resmi.
3. **Surface** — cross-walk table di `view_sakroadmap.tsx`; anotasi label modul PSAK (sublabel/chip "≡ PSAK 1xx") via peta.
4. Gate + verifikasi live (tampil benar di SAK roadmap & label modul).

## 9. Risks & Mitigasi
- **Akurasi nomor** → diambil dari dokumen IAI resmi (bukan ringkasan AI yang terbukti garbled saat riset); diuji unit; dicitasi. Ari (ahli) memverifikasi saat sign-off.
- **Kebingungan lama vs baru** → tampilkan **keduanya** (lama primary utk FY2025 yg masih lazim + baru sebagai padanan), bukan ganti sepihak. (Open Q3)
- **Scope creep label** → batasi surfacing ke SAK roadmap + label modul; tidak global. (Open Q1)
- **IFRS 18/19** → jangan menetapkan nomor; relabel deskriptif.

## 10. Implementation Plan
1. `data_sakroadmap.ts`: tambah `PSAK_RENUMBER` (cited) + ekspos canon; fix 207/208. `psakrenumber.test.ts` (atau perluas canon test). Gate.
2. `view_sakroadmap.tsx`: panel/tab cross-walk lama↔baru. Gate.
3. `icons.tsx` (+ opsional RELATED_SA): anotasi padanan baru pada label modul PSAK. Gate.
4. Verifikasi live + PRD commit + PR (base master).

## 11. Open Questions (default bila tak dijawab)
1. **Kedalaman surfacing:** (a) cross-walk table di SAK roadmap saja *(minimal)*; (b) **+ anotasi label modul PSAK** *(rekomendasi/default)*; (c) + chip RELATED_SA & lebih luas. *(Default: b.)*
2. **Penyajian utama:** nomor **lama primary + baru sebagai padanan** *(default; sesuai praktik FY2025 & substansi tak berubah)* vs baru-primary. *(Default: lama-primary.)*
3. **Fix 207/208:** ya, relabel entri IFRS 18/19 agar tak klaim nomor resmi *(default)* — atau biarkan & hanya catat. *(Default: relabel.)*

---
## Catatan — SA-01 (opsional, track terpisah)
User menyebut "dan opsional SA-01 sempit". Itu track berbeda (sign-off surat perikatan/acceptance ber-jejak + RBAC + append-only, pola Q-03a) — **PRD terpisah** sesuai konvensi 1-track-1-PRD. Saya usul **selesaikan AK-01 dulu**, lalu PRD SA-01 menyusul bila Anda mau. Konfirmasikan saat sign-off.

**Keputusan diminta:** "Proceed." (dengan default Open Q) untuk mulai AK-01, atau koreksi scope/Open Q.
