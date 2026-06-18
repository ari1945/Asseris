# PRD — W10.5: Ekspor (PDF/XLSX) & Segel Nol-Vendor

> Slice kedua dari wave terakhir (W10 = "Keamanan, ekspor, observability & deploy").
> Slice-1 (audit-trail server-side + pengerasan + observability + deploy-readiness)
> **SELESAI** — lihat [[neosuite-ams-w10-hardening]]. Slice ini menutup item **ekspor
> PDF/XLSX + e-Sign** yang ditunda dari W10. Lanjutan dari [[neosuite-ams-w7-auth]],
> [[neosuite-ams-w7-5-isolation]], [[neosuite-ams-w8-llm-proxy]],
> [[neosuite-ams-w10-hardening]]. Branch: `master`.

---

## 1. Problem
Aplikasi audit ini menghasilkan **deliverable** (opini, laporan keuangan, memo
materialitas) dan **register kerja** (WTB, AJE, risk register, register aset tetap,
jejak audit). Hari ini "ekspor" pada dasarnya **fiktif**:

- Satu-satunya jalur semi-nyata = **cetak browser** (`window.amsPrintDoc()` di
  `ui.jsx:262`) yang memanggil `window.print()` atas `.doc-paper` yang sedang tampil.
  Dipakai di ~10 view (opini, fsgen, isak35, payroll, final3, …). Membuka dialog cetak
  OS — **tidak menghasilkan berkas (Blob) yang bisa di-hash, di-segel, atau di-unduh
  secara senyap.**
- ~20 tombol **"Ekspor / Unduh / Cetak"** lain (Ekspor Register, Unduh PDF, Unduh
  Bukti Segel, Ekspor Indeks, …) **tanpa `onClick`** — placeholder kosmetik.
- **XLSX** hanya muncul sebagai nama berkas fiktif di seed data — **nol generasi nyata.**
- **e-Sign** tak ada: `view_crypto.jsx` punya tombol "Unduh Bukti Segel" + rantai-hash
  server W10, tapi tak ada penandatanganan/segel pada artefak. Seed bahkan sudah
  mengantisipasi (`data_platform.js:263` punya event audit `EXPORT`).

DoD W10 menuntut "ekspor PDF/XLSX + e-Sign". Slice-1 sengaja menundanya. Ini slice-nya.

## 2. Objective
Ubah ekspor dari kosmetik menjadi **artefak nyata yang dapat diunduh, deterministik,
ber-RBAC, ter-audit, dan ber-segel provenans** — deliverable sebagai PDF dan register
sebagai XLSX — dengan angka **identik dengan layar** (tetap dari `AMS_CANON` SSOT),
**tanpa vendor eksternal berbayar**, dan **tanpa mengklaim e-Meterai/tanda tangan
sertifikat legal** yang tak bisa dilakukan di lingkungan ini.

## 3. Pendirian jujur (pushback yang harus disepakati lebih dulu)
**e-Meterai (PERURI) dan tanda tangan elektronik tersertifikasi (PSrE: PrivyID/VIDA)
TIDAK dapat dibangun di sandbox ini** — keduanya butuh kontrak vendor, kunci berbayar,
dan jaringan keluar ke layanan pihak ketiga. Saya **tidak akan memalsukan stempel
legal.** Maka komponen "e-Sign" slice ini = **segel kriptografi nol-vendor**: server
menandatangani hash konten artefak dengan kunci aplikasi, membenamkan segel terverifikasi
(id + hash + QR/verify-link) ke artefak, dan mencatatnya ke rantai-audit W10. Ini
membuktikan **siapa** (pengguna terautentikasi) + **integritas** (konten tak berubah) —
**bukan** keabsahan hukum e-Meterai. Disclaimer wajib tampil di artefak & UI.

## 4. Success Criteria
- Tombol ekspor pada artefak ber-cakupan menghasilkan **berkas nyata yang terunduh**
  (PDF untuk deliverable, XLSX untuk register) — bukan hanya dialog cetak.
- Angka di berkas terekspor **identik dengan layar** (ditarik via `AMS_CANON`/`rp()`/`fmt()`,
  format id-ID; negatif dalam kurung). Tidak ada angka hardcode/baru.
- Setiap ekspor **tercatat server-side** di rantai-audit W10 dengan `action='EXPORT'`,
  `detail` = metadata saja (kind, scope, hash) — **tak pernah isi kertas kerja**.
- Segel nol-vendor: artefak ber-segel memuat id segel + hash + QR; endpoint
  `export.verifySeal` mengonfirmasi tanda tangan; segel tercatat di rantai-audit.
  Disclaimer "bukan e-Meterai" tampil di artefak & UI.
- RBAC: ekspor di-gate kapabilitas; ekspor jejak audit tetap butuh `AUDIT_VIEW`;
  isolasi per-engagement W7.5 dihormati (hanya bisa ekspor engagement yang boleh diakses).
- Tombol "Ekspor/Unduh" kosmetik yang kini punya artefak nyata **tersambung**; yang
  sisanya **didokumentasikan** sebagai placeholder (tak diam-diam dibiarkan menyesatkan).
- Gate per fase: server `typecheck` 0 + vitest hijau (tambah test); migration `lint` 0 +
  `typecheck` 0 + **59 vitest tetap hijau (zero numeric regression — canon tak disentuh)**
  + build hijau + preview 0 console error pada fase yang menyentuh klien.

## 5. Scope
**Fase 0 — Server: endpoint segel + logging ekspor + RBAC (dapat-diuji di sini).**
- `CAP.EXPORT` baru di `rbac.js` SSOT (semua peran kerja boleh ekspor; jejak audit
  tetap di-gate `AUDIT_VIEW`). Matriks + test negatif.
- `export.seal` (protected): input `{scope, scopeId, kind, contentHash}`; server
  menandatangani `contentHash` (Ed25519 via Node `crypto`, kunci dari env — publik
  dapat memverifikasi tanpa rahasia), kembalikan `{sealId, signature, signedAt,
  signerUserId, pubKeyId}`; `appendAudit(action='EXPORT'/'SEAL', detail=metadata)`.
- `export.verifySeal`: recompute & verifikasi tanda tangan.
- `export.logEvent` (atau hook di dalam seal): catat ekspor tak-bersegel pun ke audit.
- Hormati isolasi W7.5 (`assertEngagementAccess` bila scope=engagement). Test.

**Fase 1 — Klien: generator PDF deliverable + sambung tombol + segel + verify.**
- Util `export_pdf` (lib client, lihat Q1) membentuk PDF dari data/canon → **Blob nyata**.
- Cakupan deliverable: **opini** (`view_opinion`), **LK** (`view_fsgen`), **memo
  materialitas** (`view_materiality_parts`). Header firma + meta engagement + disclaimer.
- Alur segel: generate PDF → hash konten kanonik → `export.seal` → benamkan id+QR →
  unduh. Tombol "Export PDF / Unduh PDF" yang mati/cetak-saja → arahkan ke jalur nyata.
- Live-proven di preview.

**Fase 2 — Klien: generator XLSX register + sambung tombol.**
- Util `export_xlsx` (SheetJS) → **Blob nyata** ber-sheet.
- Cakupan register: **WTB**, **AJE**, **risk register**, **register aset tetap**
  (`view_psak16_register`), **jejak audit** (`audit.list`, gate `AUDIT_VIEW`).
- Angka via `rp()`/`fmt()`/canon. Sambung tombol "Ekspor Register/Indeks". Live-proven.

**Fase 3 (opsional, kecil) — UI verifikasi segel** di `view_crypto.jsx`: tempel
id/hash/QR → panggil `export.verifySeal` → tampilkan status. Sambung "Unduh Bukti Segel".

## 6. Non-Scope (eksplisit)
- **e-Meterai (PERURI) / PSrE tersertifikasi (PrivyID/VIDA)** — vendor berbayar, infeasible
  di sini. Segel nol-vendor BUKAN pengganti legalnya.
- Pengiriman ekspor via email/SMTP; ekspor terjadwal/batch; paket-engagement penuh
  (zip multi-artefak) — bisa jadi follow-up.
- Rendering PDF server-side / headless-browser di container (lihat Q1).
- Cross-device revoke, OIDC, deploy cloud nyata — tetap ditunda (di luar "ekspor").
- Ekspor tiap-tiap dari ~150 modul — hanya cakupan di §5; sisanya didokumentasikan.

## 7. Existing Solutions / Reuse
- `window.amsPrintDoc()` (`ui.jsx:262`) + CSS `.printing`/`.doc-paper` — **dipertahankan**
  sebagai jalur cetak layout-faithful (pratinjau cetak), pelengkap berkas-nyata.
- Rantai-audit W10 (`appendAudit`/`verifyAuditChain`, `audit/log.ts`) — **dipakai ulang**
  untuk event EXPORT/SEAL; tanpa endpoint mutasi baru.
- `rbac.js` SSOT + `protectedProcedure` + `assertEngagementAccess` (W7/W7.5) — gate ekspor.
- `AMS_CANON` + `rp()`/`fmt()` — satu-satunya sumber angka terekspor (SSOT, zero regression).
- `api.js` tRPC client — tambah `exportSeal`/`exportVerifySeal`/`exportLog`.

## 8. Proposed Approach (rekomendasi; menunggu Q1–Q3)
**Locus = klien (Q1=A).** Generate berkas di browser → Blob nyata, deterministik,
offline-capable, **tanpa headless-browser berat di container**. Server hanya
men-segel hash + mencatat audit. PDF: lib client (jsPDF + autotable, atau pdf-lib untuk
pembenaman segel) → Blob. XLSX: SheetJS → Blob. **Catatan jujur:** menambah lib client =
bobot bundle (ratusan KB) — trade-off vs server-side; "nol-vendor" di sini = nol-layanan-
eksternal, bukan nol-dependency (konsisten dengan Prisma/tRPC sejak W6).
**Segel = nol-vendor (Q2=A).** Hash atas **payload konten kanonik** (bukan byte mentah,
agar tak rapuh terhadap re-render) → Ed25519 server → benam id+QR → verify recompute.
**Cakupan = PDF + XLSX (Q3=A).**

## 9. Risks
- **Bobot bundle** dari lib client → ukur; lazy-load util ekspor (dynamic import) agar tak
  membebani boot.
- **Kerapuhan hash byte-vs-konten** untuk segel → mitigasi: hash payload kanonik tetap,
  bukan byte PDF.
- **Ekspektasi legal e-Sign** → disclaimer keras di artefak & UI (lihat §3).
- **Fidelity PDF lib ≠ layar** → set ekspektasi; pertahankan jalur cetak untuk layout-faithful.
- **Regresi numerik** bila generator menyalin angka → tarik dari canon/`rp()`; vitest 59 +
  uji manual angka terekspor == baseline (OM 4.260 dst.).
- **Kebocoran via ekspor** (mem-bypass isolasi/redaksi) → gate engagement + RBAC + audit EXPORT.

## 10. Implementation Plan
0. Fase 0 server (CAP.EXPORT, `export.seal/verifySeal/logEvent`, Ed25519, hook audit,
   gate engagement) + vitest (seal valid, verify, RBAC negatif, isolasi). Commit.
1. Fase 1 PDF deliverable (util + 3 deliverable + segel + sambung tombol) + preview-proof. Commit.
2. Fase 2 XLSX register (util + 5 register + sambung tombol) + preview-proof. Commit.
3. Fase 3 opsional verify-seal UI. Commit.
Tiap fase: lewati gate §4; update memory + BUILD.md.

## 11. Open Questions — keputusan menunggu sign-off
- **Q1 — Locus generasi.** **Rekomendasi: A) lib client** (Blob nyata, tanpa headless di
  container). Alternatif: B) server-side (sentral & mudah di-hash, tapi image berat), C)
  cetak-browser + XLSX saja (paling ringan, PDF = kualitas cetak browser).
- **Q2 — Komponen e-Sign.** **Rekomendasi: A) segel kripto nol-vendor** (provenans+integritas,
  BUKAN e-Meterai). Alternatif: B) tunda e-Sign sepenuhnya (slice = ekspor saja), C)
  placeholder UI.
- **Q3 — Cakupan artefak.** **Rekomendasi: A) PDF + XLSX.** Alternatif: B) PDF deliverable
  dulu, C) XLSX register dulu.

> Default bila disetujui apa adanya: **Q1=A, Q2=A, Q3=A.** Balas **"Proceed."** untuk
> memulai Fase 0, atau koreksi pilihan per-Q.
