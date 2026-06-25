# PRD — W-WTB·1 · Ingress Working Trial Balance Nyata (Paste/CSV)

> Status: **DRAFT — menunggu sign-off ("Proceed.")**
> Penulis: AI (atas arahan Ari Widodo) · Tanggal: 2026-06-25
> Modul terdampak: `view_execution.tsx` (WTBView), `contexts.tsx`, `data*.ts`, canon SSOT (read-only), server StateDoc + RBAC.

---

## 1. Problem
Modul Working Trial Balance **tidak dapat menerima neraca saldo klien yang sebenarnya**. Saldo berasal dari array literal 28-baris hardcode (`AMS.WTB`, `data_part1.ts:53`) untuk satu engagement demo (PT Sentosa, ENG-2025-014). Tombol **"Sync GL"** dan **"Add Account"** adalah no-op; label *"tersinkron dari GL klien — 2 jam lalu"* fiktif. Akibatnya seluruh rantai hilir yang benar secara arsitektur (materialitas, going concern, PSAK, FS Generator) berjalan di atas **data demo statis** — aplikasi belum dapat dipakai pada perikatan nyata.

## 2. Objective
Memungkinkan auditor **mengimpor neraca saldo klien via tempel CSV/teks tab-delimited** (langsung dari Excel) ke dalam WTB: ter-validasi integritasnya, **persist per-engagement** (server-backed, terisolasi W7.5), dan **dikonsumsi hilir tanpa perubahan kode canon** — karena seluruh hilir sudah membaca `useAudit().wtb`.

## 3. Success Criteria
1. Auditor menempel CSV berkolom `kode, nama, [grup], TA_lalu, unadjusted, [aje]` → **pratinjau** → **panel validasi** → **Terapkan** → grid WTB menampilkan baris terimpor **untuk engagement itu saja**.
2. WTB terimpor **persist** di StateDoc `scope=engagement` (bertahan reload, isolasi per-engagement W7.5, tunduk `guardSignoffWrite`).
3. Hilir (`figuresFromWTB`/`AMS_CANON`/FS Generator/materialitas/GC) memakai baris terimpor **tanpa satu pun perubahan kode** di lapisan canon.
4. **Nol regresi numerik** pada engagement demo bila tak ada impor (fallback ke `D.WTB`); snapshot canon Vitest tetap hijau.
5. Validasi menolak/menandai: TB tak seimbang (Σ adjusted ≠ 0 di luar toleransi), kode duplikat, angka tak terparse, kolom wajib hilang.
6. **Indikator cakupan pemetaan**: berapa kode `WTB_MAP` (1-1210, 2-2300, dst.) yang cocok dengan TB terimpor — jujur soal engine PSAK mana yang "menyala".
7. Tombol "Sync GL"/"Add Account" **hidup atau dilabel ulang jujur**; label provenance nyata (sumber + timestamp + status control-total) mengganti label fiktif.
8. Gate kualitas hijau: `npm run typecheck` 0 error, **tanpa `:any` baru** (ratchet ESLint), `lint` (no-undef/no-dupe-keys) hijau, `test` hijau.

## 4. Scope
- Parser + validator teks delimited → baris WTB (pure, ter-unit-test).
- Persistensi `wtbImport` (StateDoc engagement) + wiring base-WTB swap di `contexts.tsx` dengan fallback.
- UI drawer impor: tempel → pratinjau → validasi (gaya gerbang control-total W9) → commit (gated `WP_EDIT`).
- Pelabelan provenance jujur.

## 5. Non-Scope (eksplisit, agar tak scope-creep)
- Parse **XLSX upload** (slice lanjutan) — MVP hanya paste CSV/teks.
- **Konektor GL W9** (adapter accounting software/Coretax) — slice lanjutan.
- **Editor pemetaan** akun→caption FS / `WTB_MAP` (itu **W-WTB·3**).
- **Sub-ledger drill nyata** (itu **W-WTB·4**) — drill tetap sintetik untuk sekarang.
- Edit sel inline per-akun / tambah akun manual baris-demi-baris (di luar impor batch).

## 6. Constraints
- ESM-only; edit hanya di `migration/src/*`. Aturan alias hook per-file & anti-tabrakan tetap.
- **Pemetaan canon berbasis kode tetap**: `figuresFromWTB` mengunci kode spesifik (`1-1210`, `2-2300`, …). TB dengan bagan akun berbeda **tak otomatis menyalakan engine PSAK** — harus disur面kan jujur (Success Criteria #6), bukan disembunyikan.
- `wtb` reaktif di `contexts.tsx:394` saat ini mem-base `D.WTB`; perubahan inti = base = baris terimpor bila ada, else `D.WTB`. Lapisan override/AJE tetap di atasnya.
- Server: butuh entri `capForWrite` untuk key `wtbImport` (=`WP_EDIT`) + isolasi W7.5.
- TB nyata punya pembulatan → butuh **toleransi** + gerbang eksplisit "tak seimbang", bukan terima diam-diam.

## 7. Existing Solutions (reuse — jangan bangun ulang)
- **Pola control-total W9** (`server/src/integrations/sync.ts`, gerbang saldo awal+Σmutasi=akhir) → cetak-biru validasi balance.
- **`useServerState` / StateDoc CAS** (`contexts.tsx`, `api.js`) → persistensi engagement-scoped sudah ada.
- **`computeWtbSummary`** (`view_wtb_deep.tsx:49`) → sudah menghitung `neracaDiff`, totals, flags; dipakai ulang untuk pratinjau.
- **Pola drawer + tabel `dtbl`** + primitif `ui.jsx` → UI impor.
- **`rp()/fmt()` id-ID** → format angka pratinjau.

## 8. Proposed Approach
**Modul baru `wtb_import.ts` (pure, no `any`, ter-unit-test):**
- `parseTrialBalance(text, opts)` → `{ rows, meta, issues }`. Deteksi delimiter (tab/`;`/`,`), header fleksibel (sinonim ID/EN), infer `group` dari prefix kode bila kolom grup absen (1-1→Aset Lancar, dst.), hitung `adj = unadj + aje`.
- `validateWtb(rows)` → daftar `issue` bertingkat: `error` (duplikat kode, angka NaN, kolom wajib hilang, **tak seimbang** di luar toleransi) vs `warn` (grup tak dikenal, kode tak ada di `WTB_MAP`).
- `mappingCoverage(rows)` → cocokkan terhadap `WTB_MAP` → daftar engine PSAK yang menyala.

**Persistensi & wiring:**
- Tambah `wtbImport` ke peta STATE_KEYS (`contexts.tsx`) + `capForWrite` server (`WP_EDIT`).
- `contexts.tsx`: `const baseWtb = wtbImport?.rows?.length ? wtbImport.rows : D.WTB;` lalu lapisan override/AJE existing tak berubah.

**UI (`view_execution.tsx`):**
- "Sync GL" → buka **Drawer Impor TB**: textarea tempel → pratinjau langsung (reuse `computeWtbSummary`) → panel validasi (verdikt balance + daftar issue + cakupan pemetaan) → **Terapkan** (gated `WP_EDIT`) menulis `wtbImport`.
- Label provenance nyata: `Sumber: tempel CSV · {timestamp} · Control total: seimbang ✓ / selisih Rp …`.

## 9. Risks
| Risiko | Dampak | Mitigasi |
|---|---|---|
| Bagan akun klien ≠ kode `WTB_MAP` | Engine PSAK diam-diam = 0 | Indikator cakupan pemetaan + disclaimer; **tidak** mengklaim semua menyala |
| Swap base WTB regresi angka demo | Hilir bergeser | Fallback `D.WTB` saat tak ada impor; gate snapshot canon Vitest WAJIB hijau |
| Tulis engagement-scoped lolos RBAC/SoD | Integritas | Entri `capForWrite` + `guardSignoffWrite` + uji isolasi (login Manager, bukan Partner) |
| TB nyata tak persis seimbang (pembulatan) | Tolak valid / terima salah | Toleransi konfigurable + gerbang eksplisit "tak seimbang" |
| Paste kotor (kolom geser, ribuan/desimal id-ID) | Parse salah senyap | Parser toleran format id-ID (`1.850.000.000`, kurung negatif) + pratinjau sebelum commit |

## 10. Implementation Plan (bertahap, tiap fase gate hijau)
- **Fase 0** — `wtb_import.ts` (parser+validator+coverage) + `wtb_import.test.ts` (vitest, fixture TB seimbang & sengaja-rusak). Murni, nol risiko UI.
- **Fase 1** — persistensi: STATE_KEYS + server `capForWrite` `wtbImport`; `contexts.tsx` base-swap + fallback. Verifikasi snapshot canon tetap.
- **Fase 2** — Drawer Impor UI + wire "Sync GL" + label provenance jujur.
- **Fase 3** — verifikasi live (role **Manager**), `typecheck/lint/test` hijau, snapshot demo tak berubah, screenshot bukti.

## 11. Open Questions
1. **Toleransi balance**: absolut (mis. Rp 1.000) atau relatif (mis. 0,01% dari total aset)? Usul: relatif 0,01% dengan lantai Rp 1.000.
2. **Kolom AJE saat impor**: terima kolom `aje` dari klien, atau selalu mulai `aje=0` dan biarkan AJE dibuat di modul AJE? Usul: terima bila ada, default 0.
3. **Saldo `ly` (TA lalu)**: wajib atau opsional? Usul: opsional (default 0) — sebagian klien tak menyuplai komparatif di TB.
4. **Lokasi tombol**: ganti "Sync GL" jadi "Impor TB", atau pertahankan "Sync GL" + tambah "Impor TB" terpisah?
