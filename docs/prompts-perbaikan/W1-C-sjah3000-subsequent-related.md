# W1-C — `sjah3000` (SPA 3000) · `subsequent` (SA 560) · `related` (SA 550)

**Berkas yang DIMILIKI paket ini:**
`migration/src/view_sjah3000.tsx` · `view_subsequent.tsx` · `view_related.tsx`
\+ `migration/src/w1c_sealed_identity.test.ts` (baru).

**Diverifikasi ulang 2026-08-28 terhadap `origin/master` = `8a8cc54`** — semua situs
masih hidup pada nomor baris di bawah; nol berkas paket ini tersentuh gelombang W0
(#318–#322).

| Berkas | Baris | Isi |
|---|---|---|
| `view_sjah3000.tsx` | 127 · 129 | `scopeId: (window as …).activeEngagement?.id` · `firm: 'KAP Wijaya…'` |
| `view_subsequent.tsx` | 59 · 61 | idem |
| `view_related.tsx` | 84 · 86 | idem — `kind: 'related-register'` |

Ketiganya menerbitkan **register/memo bersegel**: register pihak berelasi (SA 550),
memo peristiwa setelah tanggal neraca (SA 560), dan laporan asurans SPA 3000. Semua
tiga adalah artefak yang dibaca kembali sebagai bukti, bukan tampilan sekali pakai.

> `view_related.tsx` ≠ `view_relatedsvc.tsx` (paket W1-E) ≠ `related_modules.tsx`
> (dock hulu/hilir lintas-sektor, **jangan disentuh siapa pun**). Pastikan kamu
> membuka berkas yang benar.

---

## Prompt (salin seluruh blok ini sebagai pesan pertama di sesi baru)

```
Kamu mengerjakan Asseris (aplikasi audit KAP, Bahasa Indonesia).

Baca berurutan sebelum menyentuh kode:
1. CLAUDE.md di root repo.
2. docs/PROMPT-PERBAIKAN-MODUL.md BLOK-A (preamble tetap).
3. docs/prompts-perbaikan/W1-00-IDENTITAS-TERSEGEL.md — brief kelas cacat, SSOT,
   bentuk gerbang, larangan. Wajib.
4. docs/prompts-perbaikan/W1-C-sjah3000-subsequent-related.md — berkas ini.

TUGAS: modul sjah3000 (SPA 3000 · asurans selain audit/reviu), subsequent (SA 560 ·
peristiwa setelah tanggal neraca), related (SA 550 · pihak berelasi).

BERKAS YANG BOLEH KAMU SENTUH — HANYA INI:
  migration/src/view_sjah3000.tsx
  migration/src/view_subsequent.tsx
  migration/src/view_related.tsx
  migration/src/w1c_sealed_identity.test.ts   (baru)
PERHATIAN NAMA BERKAS: view_related.tsx adalah SA 550. view_relatedsvc.tsx (jasa
terkait SPSJL 4400/4410) milik paket W1-E, dan related_modules.tsx adalah fitur
lintas-sektor. Keduanya TERLARANG untukmu. Tujuh sesi lain berjalan paralel.

YANG HARUS DITUTUP:

1. `firm: 'KAP Wijaya Hartono & Rekan'` di tiga payload ekspor tersegel
   (sjah3000:129 · subsequent:61 · related:86).
   → useFirmName() dari './firm_identity' (SUDAH ADA di master; JANGAN diubah).
     Tiru persis view_firmtreasury.tsx:131,165,187 — termasuk tombol disabled +
     title yang menjelaskan mengapa saat identitas kosong.

2. `scopeId: (window as { activeEngagement?: { id?: string } }).activeEngagement?.id`
   (sjah3000:127 · subsequent:59 · related:84).
   → window.activeEngagement TIDAK PERNAH DITULIS di repo ini. Buktikan:
       git grep -nE "window\.activeEngagement *=" -- migration/src server/src
     Selalu undefined ⇒ server/src/router.ts:735 MELEWATI assertEngagementAccess,
     lalu segel + logEvent tetap terbit dengan scope 'engagement' tanpa perikatan
     yang pernah diperiksa.
   → Sumber yang benar: useFirm().activeEngagement.
   → Tanpa perikatan aktif: TOLAK menerbitkan. JANGAN memilihkan perikatan — itu
     persis cacat yang ditutup PR #317. Presedens perilaku: attachment_scope.ts +
     view_sa580.tsx.

3. Periksa apakah ketiga view menampilkan nomor perikatan / nama klien LITERAL di
   layar atau di dalam `meta` payload. Kalau ada, tutup dengan cara yang sama.
   Kalau tidak ada, katakan begitu dan sertakan grep yang kamu jalankan.

⛔ LARANGAN
- Jangan mengubah firm_identity.ts, attachment_scope.ts, export_pdf.ts,
  export_xlsx.ts, contexts.tsx, related_modules.tsx, server/src/router.ts.
  Yakin salah satunya harus berubah? BERHENTI dan laporkan.
- Gerbangmu memindai HANYA ketiga view milik paket ini — jangan sensus repo-wide.
- Jangan menyentuh migration/eslint-suppressions.json. `:any` baru = lint merah.
- Jangan menyelipkan arc firm-erp PR-2..PR-6 / delivery PR-4..PR-6.
- Register pihak berelasi (SA 550) punya banyak permukaan lain. Kamu HANYA
  mengerjakan jalur ekspor tersegel. Temuan lain: laporkan, jangan kerjakan.

GERBANG (bentuk lengkap di W1-00 §6): §1 PERILAKU (render view sungguhan; dua
perikatan berbeda ⇒ dua scopeId berbeda; tanpa perikatan/identitas ⇒ eksporter TIDAK
PERNAH dipanggil) · §2 SUMBER (hanya tiga berkas ini, komentar dibuang dulu) ·
§3 ANTI-TAUTOLOGI (mutasi balik ⇒ tiap predikat §2 WAJIB gagal).

Buktikan gerbang MERAH dulu:  git stash && npm test -- w1c_sealed_identity  → gagal
                              git stash pop

SELESAI BILA:
[ ] Output merah gerbang pada kode LAMA ditempel di deskripsi PR
[ ] Tiga call-site: firm dari useFirmName(), scopeId dari perikatan aktif
[ ] Tanpa identitas firma ATAU tanpa perikatan aktif ⇒ ekspor tidak terbit, UI
    mengatakan alasannya
[ ] `npm run verify` dari root HIJAU
[ ] `git status --short` hanya menampilkan empat berkas milik paket ini
[ ] Deskripsi PR menyebut apa yang TIDAK dikerjakan dan mengapa
```
