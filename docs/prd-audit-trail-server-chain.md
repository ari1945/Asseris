# PRD — Audit Trail Jujur: Sambungkan Modul ke Server Chain (audit.list / audit.verify)

| Field | Nilai |
|---|---|
| Status | Implemented — P-1..P-5 dieksekusi 2026-08-14 (branch `feat/audit-trail-server-chain`); `npm run verify` hijau; live-verified di Edge (200 entri server, badge "Terverifikasi — Rantai server utuh" hanya setelah audit.verify true) |
| Tanggal | 2026-08-13 |
| Pemilik | Ari Widodo |
| Kelas cacat | Modul integritas menampilkan klaim "Terverifikasi" tanpa memanggil verifier — UI berhias di atas data karangan (pola: `view_crypto.tsx` sudah benar, modul ini tinggal disambungkan) |
| Basis temuan | Evaluasi 158 modul (E-8) + verifikasi live 2026-08-13 |

---

## 1. Problem

Modul **Audit Trail** (`view_platform3.tsx`, id `audittrail`) menampilkan badge hijau
**"Terverifikasi — Integritas Hash-Chain"** dan 19 entri jejak, tetapi:

1. **Badge adalah teks statis.** `view_platform3.tsx:83` merender
   `<div …>Terverifikasi</div><div>Integritas Hash-Chain</div>` tanpa satu pun
   panggilan `audit.verify` — prosedur tRPC server yang benar-benar memverifikasi
   rantai hash SHA-256. Verifikasi live 2026-08-13 mengonfirmasi: konsol bersih,
   tidak ada `audit.list`/`audit.verify` di network.
2. **Data jejak adalah seed hardcode.** `data_platform.ts:337` memuat entri
   statis (`{ ts: '2026-03-09 14:22', who: 'Dimas Raharjo', …, hashFile: 'SHA-256: 9f2a…c41d' }`).
   Tidak ada koneksi ke `server/src/audit/log.ts` — rantai append-only asli yang
   ditulis `state.set`/login/logout/upload.
3. **Konsekuensi:** auditor (dan inspektur P2PK/SMM) melihat "Terverifikasi" atas
   data yang tidak pernah diverifikasi — klaim integritas tanpa bukti, tepat di
   modul yang seharusnya menjadi bukti. Ini kelas cacat yang sama dengan gerbang
   UI-only yang sudah ditutup berulang kali di repo ini (SA 620 #188–190, sign-off
   #23, AJE PR-B): **UI yang berhias bukan bukti**.

### Mengapa ini bukan sekadar kosmetik

- Jejak audit adalah **bukti pertahanan firma** dalam pemeriksaan (P2PK/SPM 1–2)
  dan dasar `audit.verify` untuk mendeteksi tamper (W10).
- Server chain **sudah ada dan berfungsi** — `view_crypto.tsx` (modul Compliance
  & Kriptografi) memakainya dengan benar. Modul Audit Trail tinggal disambungkan,
  bukan dibangun dari nol.
- Dua jalur yang menampilkan integritas berbeda (crypto benar, audittrail palsu)
  membuat auditor tidak bisa membedakan mana yang bisa dipercaya.

---

## 2. Objective

Menjadikan modul Audit Trail **jujur**:

1. Data jejak dari **server chain** (`audit.list` / prosedur tRPC yang sudah ada),
   bukan seed hardcode.
2. Badge "Terverifikasi" hanya tampil setelah `audit.verify` **benar-benar**
   dijalankan dan lolos; bila chain rusak atau data tidak bisa diverifikasi →
   badge merah "GAGAL VERIFIKASI" + detail pos yang rusak.
3. Ekspor log (tombol "Export Log") menghasilkan **PDF/XLSX ber-segel Ed25519**
   (pola W10.5) dari data server, bukan pratinjau statis.

**Bukan:** menulis ulang server audit chain. **Bukan:** memindahkan seluruh
jejak lokal ke server (yang lokal = log aktivitas sesi, tetap sah sebagai
pelengkap, tapi TIDAK diberi label "Terverifikasi").

---

## 3. Success Criteria (semuanya DAPAT GAGAL)

| # | Kriteria | Keadaan hari ini | Cara ukur |
|---|---|---|---|
| SC-1 | Entri jejak = hasil `audit.list` server (bukan seed `data_platform.ts`) | 19 entri hardcode | Buka modul → network tab memuat `audit.list`; hapus 1 baris seed → tampilan berubah |
| SC-2 | Badge "Terverifikasi" hanya setelah `audit.verify` true | Badge statis tanpa panggilan | Buka modul → network tab memuat `audit.verify`; nonaktifkan server → badge tidak tampil "Terverifikasi" |
| SC-3 | Chain rusak → badge merah + pos rusak teridentifikasi | Tidak ada jalur deteksi | Uji e2e: tulis StateDoc, rusakkan 1 baris `AuditLog` (hash), buka modul → merah + pos |
| SC-4 | "Export Log" = PDF/XLSX ber-segel Ed25519 terverifikasi | Tombol tanpa onClick / statis | Klik → file + `exportVerifySeal` true |
| SC-5 | Status per-entri: identitas sesi (bukan nama hardcode) | `who: 'Anindya Pramesti'` dsb hardcode | Audit log server memuat `byUserId`; UI menampilkan dari sesi |

---

## 4. Scope

- `migration/src/view_platform3.tsx` — ganti sumber data + badge + tombol ekspor.
- `server/src/router.ts` (atau prosedur tRPC audit yang sudah ada) — pastikan
  `audit.list`/`audit.verify` dapat dipanggil dengan filter modul/pengguna yang
  dibutuhkan UI (bila belum).
- `server/src/export/` — jalur ekspor log tersegel (pola `export_xlsx.ts`/`exportPdf`).
- e2e: satu spec baru (`08-b` atau lanjutan) — SC-2/SC-3/SC-4.

## 5. Non-Scope

- Menulis ulang `server/src/audit/log.ts` (chain sudah append-only + hash-chain).
- Migrasi seluruh `localStorage` jejak sesi ke server.
- Fitur visual baru di luar badge/ekspor.

---

## 6. Constraints

- **R-7:** `master` selalu hijau; `npm run verify` = cermin CI.
- **Ratchet `:any`:** kode baru tanpa `:any` baru (baseline `eslint-suppressions.json`).
- **a11y:** tombol ikon ber-`aria-label`; kontrol native (gate axe e2e).
- **W10.5:** ekspor wajib segel Ed25519 bila diklaim "tersegel".

---

## 7. Proposed Approach

1. **Probe dulu (repro-dulu, pola Tahap 0):** tulis uji yang GAGAL hari ini —
   `audit.list` tidak pernah dipanggil oleh modul (spy) + badge tampil tanpa
   `audit.verify` true.
2. Sambungkan data: `view_platform3.tsx` memanggil `api.audit.list.query()` →
   render entri (hash pendek, waktu, pengguna dari sesi).
3. Badge: `useQuery(['audit.verify'])` → hijau hanya bila `verified: true`;
   `false`/error → merah + pos rusak.
4. Ekspor: panggil prosedur ekspor server (segel Ed25519) → unduh.
5. Bersihkan `data_platform.ts` seed jejak (atau tandai `// seed demo — bukan sumber`).
6. Gerbang: `npm run verify` + e2e baru hijau.

## 8. Risks

| Risiko | Dampak | Mitigasi |
|---|---|---|
| `audit.list` belum punya filter yang UI butuhkan | UI harus filter klien | Baca router dulu; tambah filter minimal bila perlu |
| Jumlah entri server besar → render lambat | UX buruk | Paginasi/virtualisasi atau agregat harian (grafik tetap dari server) |
| Verifikasi chain mahal (full scan) | Laten | `audit.verify` sudah ada; panggil on-demand + cache pendek |

---

## 9. Open Questions

1. Apakah "Aktivitas per Hari" & "Sebaran Aksi" (grafik) harus dari server juga,
   atau boleh tetap agregat lokal atas hasil `audit.list`? (Rekomendasi: dari
   server — agregat lokal atas data server tetap jujur.)
2. Apakah tombol "Export Log" cukup PDF, atau perlu XLSX juga? (Rekomendasi:
   keduanya, pola W10.5.)

---

## 10. Implementation Plan

| # | Pekerjaan | Ukuran |
|---|---|---|
| P-1 | Probe gagal (uji spy + badge) | S |
| P-2 | Sambungkan `audit.list` ke tabel | M |
| P-3 | Badge verifikasi jujur (hijau/merah) | S |
| P-4 | Ekspor tersegel | M |
| P-5 | Bersihkan seed + gerbang penuh + e2e | M |

**Sign-off:** menunggu "Proceed." (taksonomi tunggal: Draft → Approved → …).
