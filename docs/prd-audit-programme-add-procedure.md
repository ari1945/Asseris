---
title: PRD — Audit Programme · Tambah Prosedur + Navigasi Baris
status: approved (Ari "Paket Lengkap Proceed", 2026-06-25)
module: programme (view_cockpit.tsx · AuditProgramme)
---

# PRD — Menambah Prosedur Audit & Navigasi Baris

## Problem
Modul **Audit Programme** tidak punya cara menambah prosedur dari UI. Daftar
berasal dari konstanta statis `PROGRAMME`. Tombol **"Saran Prosedur AI"** dan
**"Saran AI"** (panel detail) adalah stub tanpa handler. Klik baris hanya membuka
detail inline yang mudah terlewat — terasa "tidak lari ke mana-mana".

## Objective
Auditor dapat (a) menambah prosedur secara manual, (b) menerima saran prosedur
standar per RoMM, (c) klik prosedur untuk lari ke Kertas Kerjanya — dan semuanya
**persist di server** (SSOT) sesuai isolasi engagement.

## Success Criteria
1. Tombol **+ Tambah Prosedur** membuka form; submit menambah prosedur ke RoMM terpilih.
2. **Saran Prosedur AI** membuka panel saran **deterministik** (bukan LLM mengarang);
   auditor centang & "Tambah terpilih" → masuk daftar.
3. Klik **judul prosedur** → buka Kertas Kerja prosedur (`openCanonicalWp`).
4. Tambah/ubah status **persist** lintas reload (StateDoc `programme.v1`).
5. `npm run typecheck` 0 error; tanpa error konsol runtime.

## Scope
- `migration/src/view_cockpit.tsx` saja (+ key di `AMS_PERSIST_SCOPE`).
- Persist via `useAmsPersist('programme.v1', PROGRAMME)` — engagement-scope, cap `WP_EDIT`.
- Gate aksi tulis dengan `useAuth().can(CAP.WP_EDIT)`.

## Non-Scope
- Edit jam/anggaran inline, hapus prosedur, reorder. (Bisa fase lanjut.)
- Programme per-engagement berbeda (dataset demo tunggal; isolasi via scopeId saja).
- LLM mengarang prosedur — DILARANG oleh arsitektur W8 (proxy terkunci `narrate-diagnostics`).

## Keputusan kunci (fidelitas arsitektur)
- **"AI" = mesin saran DETERMINISTIK** (katalog prosedur standar dipetakan ke
  area RoMM / asersi / SA, +set SA 240 untuk risiko fraud). Sejalan dengan SSOT &
  "mesin diagnostik deterministik" — dan jauh lebih dapat dipertahankan untuk alat audit.
- **Navigasi baris = hibrida**: klik baris → detail inline (triase); klik judul → WP.
- **Persist** mengubah perilaku: cycling status kini tersimpan (perbaikan, konsisten SSOT).

## Risks
- Mengubah `useStateWS`→`useAmsPersist` membuat semua edit nge-flush ke server (debounced).
  Mitigasi: seam W6 sudah menangani offline/konflik (ConflictToaster).
- Dedupe saran berbasis kata-kunci teks — bisa under/over-suggest. Mitigasi: katalog
  konservatif + auditor tetap meninjau sebelum menerima.

## Implementation Plan
1. `AMS_PERSIST_SCOPE['programme.v1'] = 'engagement'` (contexts.tsx).
2. view_cockpit: import `useAuth, useAmsPersist, CAP, openCanonicalWp, AMS`.
3. `prog` → `useAmsPersist`. Helpers `nextProcId`, `addProcs`, katalog + `suggestFor(risk)`.
4. Toolbar: wire "Saran Prosedur AI" → modal saran; tambah "+ Tambah Prosedur" → modal form. Gate `canEdit`.
5. Baris: judul prosedur → `openCanonicalWp(nav, p.wp)` (stopPropagation). Update banner bantuan.
6. Modal form + modal saran (pola overlay seperti WtbDrill).
7. Verifikasi: typecheck + live (login, render, tambah, navigasi).
