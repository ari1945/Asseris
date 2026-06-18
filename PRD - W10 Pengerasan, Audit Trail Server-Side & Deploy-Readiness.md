# PRD — W10: Pengerasan, Audit Trail Server-Side & Deploy-Readiness

> Wave terakhir backlog (W0–W10), slice pertama. Governing eval: `Evaluasi NeoSuite
> AMS - Kesiapan Pengembangan Claude Code.html` (W10 = "Keamanan, ekspor,
> observability & deploy"). Lanjutan dari [[neosuite-ams-w7-auth]],
> [[neosuite-ams-w7-5-isolation]], [[neosuite-ams-w8-llm-proxy]].

## 1. Problem
W10 di eval membundel **tujuh** hal (enkripsi, retensi/arsip ISQM, audit-trail
append-only server-side, ekspor PDF/XLSX + e-Meterai/e-Sign, observability, CI/CD,
deploy). Tidak muat satu pass, dan beberapa item **tidak dapat dieksekusi di
lingkungan ini** (deploy cloud nyata, vendor e-Meterai/PrivyID berbayar+kontrak,
SMTP/TLS = infra). Selain itu ada utang dari wave sebelumnya yang ditandai "→ W10":
httpOnly cookies, IP-allowlist, enkripsi-at-rest, email alert/reset, cross-device
revoke (W7); flip Postgres + enkripsi/retensi + deploy (W7.5).

Yang paling mendesak & paling bernilai-domain: **jejak audit hari ini palsu** —
`window.amsFakeHash` + `buildAuditStream` fiktif di sisi klien (`view_crypto.jsx`,
`view_records.jsx`). DoD #1 W10 menuntut "jejak audit tak-terbantah & tak dapat
diubah dari klien". Itu jangkar slice ini.

## 2. Objective
Naikkan server NeoSuite AMS dari "fungsional + ber-RBAC" ke **siap-produksi pada
poros keamanan & operasional**: audit-trail server-side append-only yang
tamper-evident, pengerasan transport/secret/akses, observability dasar, dan
artefak deploy (container + Postgres) yang siap-pakai — **tanpa** menambah
dependency (nol-vendor dipertahankan) dan **tanpa** mengklaim deploy nyata yang
tak bisa diverifikasi dari mesin ini.

## 3. Success Criteria
- Setiap mutasi audit-signifikan (StateDoc write: AJE, opini, kesimpulan, dll. +
  login/logout + narasi LLM) **terekam server-side** di rantai hash append-only;
  klien tak punya endpoint update/delete; `audit.verify` mendeteksi tamper.
- `view_crypto.jsx` / `view_records.jsx` membaca **rantai nyata dari server**, bukan
  `amsFakeHash`.
- Token sesi berpindah ke **httpOnly cookie** (SameSite=Strict); `totpSecret`
  ter-enkripsi at-rest (AES-256-GCM, kunci dari env); IP-allowlist opsional menjaga
  aksi admin bila dikonfigurasi.
- `/healthz` (+ cek DB) dan `/metrics` hidup; log terstruktur JSON; error tertangkap.
- Artefak deploy ada & koheren: `server/Dockerfile`, `docker-compose.yml`
  (app+Postgres), `.github/workflows/ci.yml` (typecheck+lint+vitest), jalur flip
  Postgres terdokumentasi. **Ditandai jujur: deploy itu sendiri belum diverifikasi
  dari sini.**
- Gate per fase: server `typecheck` 0 + vitest hijau (tambah test baru); migration
  `lint` 0 + `typecheck` 0 + **59 vitest tetap hijau** (zero numeric regression —
  canon tak disentuh); build hijau; render preview 0 console error pada fase yang
  menyentuh klien.

## 4. Scope (slice W10 ini)
**Fase 0 — Audit-trail server-side append-only (headline).**
- Model `AuditLog` (seq monotonik, ts, actorUserId, actorRole, action, target
  scope/scopeId/key, detail metadata-saja, prevHash, hash).
- `server/src/audit/log.ts`: `appendAudit()` ter-serialisasi (in-process queue +
  unik seq), `verifyAuditChain()` recompute oldest→newest. Hash = SHA-256 atas
  `seq|ts|actor|action|target|detail|prevHash` (Node `crypto`, nol-vendor).
- Hook sukses `state.set` (covers AJE/opini/kesimpulan karena semua StateDoc),
  `auth.login`/`logout`, `llm.complete` (NARRATE) → append. **Detail = metadata
  saja** (key + delta versi), bukan isi kertas kerja → audit log aman dibaca lintas-peran.
- Endpoint `audit.list` + `audit.verify` (protected; CAP baru `AUDIT_VIEW` →
  Partner/Manager). Tanpa endpoint mutasi (append hanya internal).
- Klien: `view_crypto.jsx` + `view_records.jsx` baca rantai server (degrade ke demo
  bila server mati). Pensiunkan `amsFakeHash` sebagai sumber kebenaran (boleh tetap
  ada sebagai fallback offline).

**Fase 1 — Pengerasan auth & secret.**
- httpOnly cookie: `auth.login` set `Set-Cookie ams_session=…; HttpOnly; SameSite=Strict;
  Path=/; Max-Age` via `responseMeta`; `logout` clear. Klien `api.js` →
  `credentials:'include'`, berhenti menyimpan token di localStorage (header Bearer
  tetap didukung untuk test/curl — `context.ts` sudah dua-jalur).
- Enkripsi-at-rest: `server/src/crypto/secretbox.ts` (AES-256-GCM, kunci
  `APP_ENCRYPTION_KEY` dari env). Enkripsi `totpSecret` saat tulis; baca toleran
  format-legacy plaintext (migrasi mulus).
- IP-allowlist opsional: env `ADMIN_IP_ALLOWLIST` (CSV). Bila diset, jaga login &
  aksi ber-`FIRM_ADMIN`; `ctx.ip` sudah tersedia.

**Fase 2 — Observability + deploy-readiness.**
- `server/src/obs/log.ts` logger JSON terstruktur; ganti `console.log`; tRPC `onError`
  → log + counter; timing per-request.
- Wrap HTTP: `/healthz` (cek `prisma.$queryRaw` ringan) + `/metrics` (counter
  requests/errors/logins/llm + uptime) sebelum delegasi ke handler tRPC.
- `server/Dockerfile` (multi-stage, prod), `docker-compose.yml` (app + Postgres,
  `DATABASE_URL` ke postgres, `migrate deploy`), `.github/workflows/ci.yml`
  (server+migration: typecheck/lint/vitest). Jalur flip Postgres terdokumentasi di
  `BUILD.md`. **Ditandai untested-from-here.**

## 5. Non-Scope (eksplisit ditunda)
- **Ekspor PDF/XLSX & e-Meterai/e-Sign** → wave terpisah (W10.5). Q-scope = audit-core dulu.
- **Vendor/infra nyata**: deploy cloud, SMTP (email alert/reset), TLS termination,
  PrivyID/Peruri — di luar jangkauan mesin ini; hanya seam/dokumentasi.
- **Retensi 10thn/arsip ISQM penuh & legal-hold workflow** — logika kebijakan dalam;
  tak di slice ini (view_records demo tetap).
- **Cross-device revoke dari perangkat lain, OIDC** — tetap ditunda.
- **Multi-tenant firma, UI manajemen keanggotaan** — di luar arc.
- Tak menyentuh canon/WTB/diagnostics → zero numeric regression by construction.

## 6. Constraints
- **Nol-vendor** (keputusan Q2): tak ada npm dep baru; semua dari Node built-in
  (`crypto`, `http`) + Prisma/tRPC yang sudah ada.
- Single-process Node: serialisasi append cukup in-process (didokumentasikan: skala
  horizontal butuh sequencing DB-level).
- Append-only ditegakkan di **lapisan aplikasi** (tak ada endpoint update/delete;
  hash-chain mendeteksi mutasi langsung-DB). DB trigger immutability = catatan deploy.
- Aturan emas anti-tabrakan & SSOT tetap berlaku untuk file klien yang disentuh.

## 7. Existing Solutions (reuse)
- `AuthEvent`/`LlmEvent` (append-only event pattern) → cetakan `AuditLog`.
- `context.ts` sudah baca cookie `ams_session` + bawa `ip`/`userAgent`.
- `rbac.js`/`rbac.ts` SSOT → tambah `CAP.AUDIT_VIEW`.
- Node `crypto` sudah dipakai (scrypt/TOTP) → AES-GCM & SHA-256 senada.
- `view_crypto.jsx` sudah punya UI rantai-hash; tinggal ganti sumber data.

## 8. Risks
- **Race pada chain** bila append konkuren → seq/hash kacau. Mitigasi: queue
  in-process + unik seq + test konkuren.
- **httpOnly cookie memecah login** (klien kini tak pegang token) → verifikasi
  preview login/reload/logout wajib; header Bearer tetap sebagai fallback test.
- **Enkripsi totpSecret** bisa mengunci akun TOTP lama bila migrasi tak toleran →
  baca dua-format.
- **Klaim deploy berlebihan** → tandai untested-from-here secara eksplisit (sesuai
  prinsip pelaporan jujur).
- Scope balloon → patuhi Non-Scope; ekspor benar-benar ditunda.

## 9. Implementation Plan (gate per fase)
0. AuditLog model + appendAudit/verify + hooks + endpoint + klien baca rantai →
   commit. Test: chain valid, tamper terdeteksi, konkuren monotonik, RBAC list.
1. httpOnly cookie + enkripsi totpSecret + IP-allowlist → commit. Test: cookie
   set/clear, secret round-trip + legacy read, allowlist allow/deny. Live: login.
2. Observability (logger/healthz/metrics) + Dockerfile/compose/CI + BUILD.md flip →
   commit. Verifikasi artefak (lint/typecheck) + /healthz lokal.

Setiap fase: server typecheck 0 + vitest hijau; bila menyentuh klien — migration
lint/typecheck 0 + 59 vitest + build + preview 0 err.

## 10. Open Questions (sudah diputuskan)
Dijawab via AskUserQuestion 2026-06-18:
- **Scope slice** = Audit-trail core + hardening (ekspor & e-Sign ditunda).
- **Ekspor deps** = Pertahankan nol-vendor (relevan saat ekspor digarap nanti).
- **Target deploy** = Container + Postgres (artefak deploy-ready; deploy nyata
  untested-from-here).

## 11. Recommended Decisions (default; override sebelum "Proceed.")
- **D1** Lingkup audit log = StateDoc writes + login/logout + LLM-narrate (bukan
  setiap query). Detail metadata-saja (key+versi), tak pernah isi kertas kerja →
  log aman lintas-peran.
- **D2** `AUDIT_VIEW` ke Partner+Manager (oversight), selaras `ENGAGEMENT_VIEW_ALL`.
- **D3** Token sesi pindah ke httpOnly cookie sebagai transport utama; localStorage
  Bearer di-pensiun di klien, header tetap untuk test/curl.
- **D4** Email alert/reset, cross-device revoke, retensi-penuh, ekspor = tetap ditunda.

---
**Menunggu "Proceed." sebelum implementasi (aturan PRD-first).**
