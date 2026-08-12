# PRD — Program Pengerasan Tahap 0–9 (retrospektif + sisa pekerjaan)

> **Retrospektif.** Pekerjaan Tahap 0–9 sudah dieksekusi dan dikirim ke `master`
> sebagai commit tunggal `18d6e69` (370 berkas, +8.245/−2.124) **tanpa PRD**.
> Dokumen ini menutup lubang itu: merekam apa yang dibangun dan mengapa, menandai
> apa yang **belum** selesai, dan meminta sign-off untuk sisa pekerjaannya.
> Bagian §10 Fase R (remediasi) dan §11 adalah bagian yang **belum** dieksekusi dan
> menunggu **"Proceed."**

| Field | Isi |
|---|---|
| Tanggal | 2026-08-12 |
| Pemilik | Ari Widodo |
| Status | In Progress — Tahap 0–9 terkirim (`18d6e69`); Fase R belum, menunggu "Proceed." |
| Engagement ID terkait | — (platform, lintas-engagement) |

---

## 1. Problem

Sebelum Tahap 0, Asseris punya fungsionalitas audit yang luas tetapi **fondasi
kelayakan-produksi yang belum dibuktikan**. Empat kelas masalah yang nyata:

1. **Isolasi data belum terbukti end-to-end.** Isolasi per-engagement (W7.5) ditegakkan
   di server, tapi tak ada uji yang menjalankan stack sungguhan (browser → Caddy → tRPC →
   Postgres). Yang diuji adalah unit atas SQLite in-process.
2. **Kredensial sesi masih terbaca JavaScript.** `auth.login` mengembalikan bearer token
   di body; satu XSS = satu sesi auditor dicuri.
3. **Bukti audit tidak punya siklus hidup.** Lampiran hanya bisa di-soft-delete; tidak ada
   kelas retensi, tidak ada legal hold, tidak ada jalur pemusnahan yang disetujui dan
   terauditasi. Untuk KAP ini kewajiban (SA 230, ketentuan retensi KAP), bukan fitur.
4. **Gerbang mutu tak mengukur yang penting.** Tak ada coverage CI, tak ada uji
   aksesibilitas, tak ada budget performa, dan taksonomi status PRD tercecer di 100+ dokumen
   tanpa satu registri.

Masalah **proses** yang sama pentingnya: perubahan sebesar ini dikirim sebagai satu commit
`chore:` langsung ke `master`, sehingga tak ada satu pun titik di mana seorang reviewer bisa
menolak sebagian darinya.

## 2. Objective

Menjadikan Asseris **layak dipakai pada engagement klien nyata** — bukan "fiturnya lengkap",
melainkan: datanya terisolasi dan terbukti terisolasi; kredensialnya tak bisa dicuri lewat
XSS; bukti auditnya punya siklus hidup yang bisa dipertanggungjawabkan; dan setiap klaim itu
dijaga gerbang yang **bisa gagal**.

Objective ini benar karena kegagalan di sini tidak menghasilkan bug — menghasilkan
**pelanggaran kerahasiaan klien**, dan itu risiko lisensi, bukan risiko produk.

## 3. Success Criteria

| # | Kriteria | Cara ukur | Status |
|---|---|---|---|
| SC-1 | Perjalanan e2e atas Postgres NYATA hijau | `e2e` workflow, 12 tes Playwright | ✅ hijau (run `31560121802`) |
| SC-2 | `auth.login` tak pernah mengembalikan token ke JavaScript | `deploymentSmoke.ts` memaku `!('token' in login)` | ✅ |
| SC-3 | Purge bukti audit menuntut retensi habis + tanpa legal hold + persetujuan FIRM_ADMIN | `stage6_evidence_lifecycle.test.ts` | ⚠️ terpenuhi di jalur tRPC, **BOLONG di jalur CLI** (lihat R-3) |
| SC-4 | Coverage CI per-area punya ambang yang menggagalkan | `server-coverage` job, 11 glob | ✅ |
| SC-5 | 0 pelanggaran axe *critical* + keyboard bisa | `07-a11y-axe-keyboard.spec.ts` | ✅ |
| SC-6 | Backup terenkripsi terbukti bisa dipulihkan + rantai hash utuh | `restore-drill` | ✅ setelah [#179](https://github.com/ari1945/Asseris/pull/179); **merah 2026-08-12 pagi** |
| SC-7 | Satu registri status PRD | `docs/PRD-REGISTRY.md` | ✅ |
| SC-8 | **`npm run verify` dan seluruh workflow CI hijau di `master`** | `gh run list` | ❌ **BELUM** — lihat R-1 |

SC-8 adalah kriteria yang membedakan "dikirim" dari "selesai". Sampai ia hijau, tujuh kriteria
lain bertumpu pada gerbang yang tidak bisa dipercaya.

## 4. Scope

Tahap yang dieksekusi (dipetakan dari penanda di kode — bukan dari dokumen rencana, karena
tak ada):

| Tahap | Isi | Artefak pengunci |
|---|---|---|
| 0 | **Repro** tiga cacat fondasi sebagai uji yang gagal: boundary keamanan, bootstrap skema production, race perpindahan engagement | `stage0_*_repro.test.ts` |
| 1 | Bootstrap least-privilege + guard baca StateDoc tersentralisasi (per-user, per-engagement, allowlist kunci firma, jalur `personal.get`) | `stage1_data_isolation.test.ts`, `stateAccess.ts` |
| 2 | *(tanpa penanda tersendiri di kode — kemungkinan terserap ke Tahap 1/3)* | — |
| 3 | Tripwire pemblokir deploy: batas payload → 413 sebelum eksekusi prosedur, kursor audit off-box hanya maju setelah upload sukses | `stage3_deployment_blockers.test.ts`, `payloadLimits.ts` |
| 4 | Pipeline audit durabel: outbox transaksional, satu worker serial pemilik urutan rantai | `audit_outbox.test.ts`, `audit/checkpoint.ts` |
| 5 | Sesi cookie-only di batas browser (HttpOnly/SameSite=Strict/Secure), throttle TOTP, consent LLM, privasi | migrasi `20260811213000_stage5_auth_privacy` |
| 6 | Siklus hidup bukti audit: kelas retensi, legal hold, approve→purge terpisah, AAD AES-GCM mengikat ciphertext ke identitas lampiran, seam penyimpanan S3 | migrasi `20260812120000_stage6_evidence_lifecycle`, `attachments/retention.ts` |
| 7 | Playwright × Postgres nyata + coverage CI bertahap 11 area | `e2e/`, `.github/workflows/e2e.yml` |
| 8 | Performa & arsitektur frontend: `React.lazy` per modul, provider dipecah per domain, hidrasi berat ditunda, budget bundle | `lazy_views.tsx`, `check-bundle.mjs` |
| 9 | Aksesibilitas (axe 0 critical + keyboard), kontrol form native, taksonomi status PRD tunggal + registri | `07-a11y-axe-keyboard.spec.ts`, `docs/PRD-REGISTRY.md` |

## 5. Non-Scope

- Verifikasi terhadap AWS nyata (S3 off-box diuji atas MinIO; kredensial AWS tak ada di CI).
- Multi-tenant. Asseris tetap single-tenant per KAP.
- Migrasi provider database di worktree: `schema.prisma` tetap `sqlite`; Postgres lewat skema
  turunan.
- Perubahan metodologi audit. Program ini fondasi, bukan fitur audit.

## 6. Constraints

- **Orang:** satu pengembang (Ari) + agen AI. Tidak ada reviewer kedua manusia → gerbang
  otomatis adalah satu-satunya kontrol kompensasi yang tersedia. Ini alasan SC-8 tak bisa
  ditawar.
- **Regulasi:** SA 230 (dokumentasi & retensi), UU PDP (data personal), kerahasiaan klien
  SPAP. Kebocoran lintas-engagement adalah pelanggaran, bukan bug.
- **Sistem:** Windows dev, Postgres prod/e2e, SQLite dev.
- **Waktu:** engagement berjalan; jendela perubahan fondasi sempit.

## 7. Existing Solutions

Sudah ada sebelum program ini dan **dipakai ulang, tidak ditulis ulang**: `rbac.ts` bersama
(UI ↔ server), `engagementAccess.ts` (W7.5), rantai audit hash-chained (W10), segel Ed25519
(W10.5), `deploy/aws-ec2-test/` + `restore-drill`. Yang benar-benar baru hanya di tempat yang
tak punya padanan: siklus hidup retensi, transport sesi cookie-only, dan lapisan e2e.

Alternatif yang ditolak: memakai Playwright Component Testing alih-alih stack nyata — ditolak
karena justru lapisan yang mau dibuktikan (Caddy, Postgres, cookie, RBAC server) yang di-mock.

## 8. Proposed Approach

Yang dipakai — dan patut dipertahankan: **repro-dulu**. Tahap 0 menulis uji yang GAGAL untuk
tiga cacat sebelum satu barisnya diperbaiki, sehingga perbaikannya bisa dibuktikan, bukan
diklaim. Ini kebalikan dari pola yang berulang kali menipu kita (uji hijau di atas perilaku
salah).

Yang **tidak** dipakai dan seharusnya: repro yang belum ditutup tidak boleh dikirim ke
`master` dalam keadaan gagal. Konsekuensinya CI merah menjadi normal, dan sejak itu regresi
nyata tidak bisa dibedakan dari baseline yang disengaja. Fase R memperbaiki ini dengan
`test.fails()`/quarantine bertanda, bukan dengan menghapus uji.

## 9. Risks

| Risiko | Dampak | Mitigasi |
|---|---|---|
| **Race perpindahan engagement (R-1)** — **TERVERIFIKASI HIDUP 2026-08-12** | Materialitas SA 320 satu klien tertulis ke berkas klien lain; edit asli hilang; cache browser dan server berbeda | Fase R-1 |
| CI merah jadi normal | Regresi tak terdeteksi; SC-1..7 tak bisa dipercaya | Fase R-1 + aturan "master selalu hijau" |
| Purge CLI tanpa cek kapabilitas (R-3) | Persetujuan pemusnahan bukti audit fiktif di jejak audit | Fase R-3 |
| Ratchet `:any` mundur (R-4) | Erosi tipe pelan-pelan; ratchet berhenti bermakna | Fase R-4 |
| Gerbang lokal ≠ CI (R-5) | "Hijau di laptop" lalu merah di CI | Fase R-5 |
| `prisma generate` e2e meracuni client lokal (R-6) | Developer menyimpulkan "uji server rusak" lalu berhenti menjalankannya | Fase R-6 |

### R-1 — bukti verifikasi hidup (2026-08-12, stack dev nyata)

Bukan dari uji bermock. Dari aplikasi berjalan (`dev:all`, server tRPC + Postgres/SQLite dev),
login sebagai Hartono Wijaya (Rekan Pemimpin), modul **Materialitas**:

1. Engagement aktif **ENG-2025-014 (PT Sentosa Makmur Tbk)**. Slider materialitas digeser
   **9% → 7%**.
2. 1 ms kemudian (jauh di dalam jendela `SYNC_DEBOUNCE_MS = 400`) engagement diganti ke
   **ENG-2025-031 (PT Bumi Hijau Agrindo)** lewat pemilih engagement di TopBar.

Keadaan server sesudahnya:

```
StateDoc  ENG-2025-014 | mat.pct | v2 | valueJson=9   ← edit auditor TIDAK tersimpan
StateDoc  ENG-2025-031 | mat.pct | v1 | valueJson=7   ← nilai itu mendarat di KLIEN LAIN
AuditLog  seq=514 STATE_SET scopeId=ENG-2025-031 key=mat.pct   ← tercatat sebagai tindakan sengaja
AuditLog  seq=515 STATE_SET scopeId=WHR-EP-0001  key=activeEng ← perpindahan tercatat SESUDAHNYA
```

Dan cache peramban:

```
localStorage['ams.v1.engagement.ENG-2025-014.mat.pct'] = 7   ← layar berbohong
```

Tiga kerusakan sekaligus, semuanya senyap:
- Edit auditor pada Sentosa **hilang** (server tetap 9%).
- Materialitas **klien lain** ditimpa (7%) — parameter yang menggerakkan ukuran sampel, ambang
  posting AJE, dan kesimpulan audit.
- Layar menampilkan 7% untuk Sentosa dari cache, sementara server (dan setiap pengguna lain)
  melihat 9%. Dua auditor pada satu perikatan melihat materialitas berbeda.
- Jejak audit mencatat urutan **tulis-ke-031 lalu pindah-ke-031**, sehingga korupsi itu terbaca
  sebagai tindakan sengaja WHR-EP-0001.

Akar teknis: `contexts.tsx` — `targetRef.current` ditugaskan ulang **setiap render**, sedangkan
`flush()` membacanya **saat timer menyala**, bukan saat edit terjadi:

```ts
targetRef.current = { scope, scopeId, key, cacheKey };          // ~L588, tiap render
const flush = useCallback((value) => {
  const t = targetRef.current;                                  // ← dibaca 400 ms KEMUDIAN
  api.state.set.mutate({ scope: t.scope, scopeId: t.scopeId, ... });
}, []);
setTimeout(() => flush(value), SYNC_DEBOUNCE_MS);               // target TIDAK ikut ditangkap
```

`cacheWrite()` di dalam `setVal` memakai target **saat edit** — itulah sebabnya cache dan
server bisa berbeda.

Isolasi server (W7.5) tidak menangkap ini dan memang tidak bisa: penulisnya adalah pengguna
yang **berhak** atas kedua perikatan. Kontrolnya benar; yang salah adalah klien mengirim data
ke alamat yang salah.

## 10. Implementation Plan

**Fase 0–9 — SELESAI DIKIRIM** (`18d6e69`, 2026-08-12). Rincian §4.

**Fase R — remediasi.** Menunggu **"Proceed."** Diurutkan menurut "apa yang memulihkan
kemampuan mendeteksi lebih dulu".

| # | Pekerjaan | Kenapa urutan ini | Ukuran |
|---|---|---|---|
| R-0 | ✅ **SELESAI** — asersi CI mengikuti kontrak cookie-only ([#179](https://github.com/ari1945/Asseris/pull/179)) | Tanpa ini `deploy-smoke` & `restore-drill` gelap | S |
| R-1 | Tangkap target scope **saat edit**, bukan saat flush: bekukan `{scope, scopeId, key, cacheKey}` ke dalam closure debounce; flush target lama saat scope berubah (`useEffect` cleanup) sebelum re-hidrasi. Repro Tahap 0 harus **berubah dari merah ke hijau** | Mengembalikan SC-8; menutup kebocoran lintas-klien | M |
| R-2 | Repro Tahap 0 kedua (hidrasi A telat menimpa WTB B) — batalkan hasil `hydrateCoreFromApi` yang bukan milik engagement aktif | Bagian kedua dari kelas cacat yang sama | M |
| R-3 | `retentionWorker approve` menuntut `can(role, CAP.FIRM_ADMIN)` — dan uji negatifnya | Mencegah persetujuan pemusnahan bukti fiktif | S |
| R-4 | Pulihkan ratchet `:any` ke ≤ 8.155 atau catat alasan per-berkas; hapus `@ts-nocheck` dari uji repro | Ratchet hanya bermakna bila satu arah | S |
| R-5 | `tools/verify.mjs` menjalankan `vite build` + `check-bundle` (samakan dengan klaim CLAUDE.md §2) | "Hijau di laptop" harus berarti hijau di CI | S |
| R-6 | Skema Postgres turunan pakai `generator client { output = … }` sendiri agar `prisma generate` e2e berhenti menimpa client sqlite bersama | Menghapus jebakan DX yang mematikan uji server lokal | S |
| R-7 | Aturan tertulis: `master` **selalu** hijau. Repro yang belum ditutup masuk lewat `test.fails()` atau daftar karantina bertanda + tanggal kedaluwarsa | Mengembalikan CI sebagai sinyal | S |

## 11. Open Questions

1. **Q-1 (R-1, memblokir):** ketika pengguna berpindah engagement dengan edit yang masih
   tertunda — (a) **flush ke engagement lama** sebelum berpindah (aman, edit tersimpan di
   tempat yang benar, mungkin sedikit menunda perpindahan), atau (b) **buang** edit tertunda
   dengan peringatan? Rekomendasi saya **(a)** — auditor mengharapkan yang diketik tersimpan,
   dan membuang diam-diam adalah kehilangan data yang sama saja.
2. **Q-2:** apakah `mat.pct` = 7 pada ENG-2025-031 di `dev.db` (artefak probe verifikasi hidup)
   dibersihkan, atau dibiarkan sebagai bukti sampai R-1 hijau? Belum saya sentuh.
3. **Q-3:** apakah Tahap 2 memang tak pernah ada, atau isinya terserap? Perlu konfirmasi Anda
   — saya tak menemukan penanda apa pun di kode.
4. **Q-4:** cakupan retensi CLI — apakah `retention-worker` boleh tetap ada sebagai jalur
   operator sama sekali, mengingat jalur tRPC sudah punya identitas sesi? Menghapusnya
   menghilangkan seluruh kelas R-3.

---
**Sign-off:** ditandai dengan balasan **"Proceed."** (berlaku untuk Fase R; Fase 0–9 sudah
terkirim dan didokumentasikan retrospektif di sini)
