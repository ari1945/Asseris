---
name: asseris-wip-writedown-atribusi-otorisasi
description: Write-down WIP — pelaku tak tercatat bikin gerbang SoD memblokir orang yang salah; peta langkah→kapabilitas cuma ada untuk AJE sehingga server menolak semua jenis lain SENYAP
metadata: 
  node_type: memory
  type: project
  originSessionId: 243babf3-6609-4c9a-86ce-3d7663deac84
  modified: 2026-08-20T21:30:26.797Z
---

Arc 2026-08-21 atas `docs/prompts-perbaikan/11-wip.md` (W1–W4). W2·W3·W4 dikerjakan,
W1 hanya diusulkan ([[asseris-timebudget-engagement-isolation]] = modul tetangga).

## Yang ditemukan (yang tak terlihat dari membaca satu berkas)

- **`wip.adj` = `{engId: angka}` → `from` antrean diisi MANAJER PERIKATAN.** Gerbang
  self-approval `user.name === it.from` karena itu memblokir orang yang mungkin tak
  melakukan apa-apa, dan meloloskan pelaku sebenarnya. Peran `Finance Firma` memegang
  `FIRMFIN_EDIT` (boleh MEMBUAT write-down); Partner memegang itu **dan** kewenangan
  menyetujui. Celahnya bukan teoretis.
- **`AJE_STEP_CAP` punya DUA salinan** — `migration/src/aje_approval.ts` dan
  `server/src/signoff.ts:300` (komentarnya sendiri menyebut dirinya "cermin"). Server
  fail-closed untuk peran tak terpetakan ⇒ **setiap persetujuan non-AJE (Faktur ·
  Engagement · Opini · Independensi · WIP) ditolak server, SENYAP** — `flush()` di
  contexts.tsx hanya menangani konflik; FORBIDDEN jatuh ke cabang "offline" tanpa toast.
  Cacat klien (gerbang terlalu longgar) dan cacat server (menolak semuanya) hidup
  berdampingan pada fitur yang sama.
- **Gerbang warisan `role.includes('Partner') || role.includes('Manager')` menolak
  `'Rekan Pemimpin'`** — yaitu peran Managing Partner yang sebenarnya. Ia meloloskan
  Audit Manager di langkah Managing Partner dan memblokir Managing Partner sendiri.
  Pencocokan STRING peran salah ke dua arah sekaligus.
- **`submitted: NOW, due: NOW`** ⇒ setiap item lahir lewat SLA dan langsung menaikkan
  KPI "Lewat SLA". Tak ada kebijakan SLA WIP di data; satu-satunya jendela yang ADA =
  `AJE_SLA_HOURS` (48 jam), dan `slaInfo()` sudah memakainya sebagai penyebut untuk
  SEMUA jenis. Dipakai itu, bukan mengarang durasi.

## Aturan yang dipakai

- **Entri warisan tak dikarang atribusinya.** Angka telanjang dibaca `attributed:false`,
  `from: ''`, lalu `stepAuthority` MENOLAKNYA: SoD tak dapat dibuktikan bila pelakunya
  tak diketahui. Mengarang pelakunya = menerbitkan bukti audit palsu.
- **Kontrak `FIRMFIN.wip` tak disentuh** (dipakai Dashboard/kokpit/Firm Finance/ekspor).
  Normalisasi dokumen → `{engId: jumlah}` terjadi di `use_firm_wip`, jadi
  `firm_wip.test.ts` (30 uji) nol perubahan.
- **`setAdj` telanjang DICABUT dari hasil `useFirmWip`.** Setter mentah berarti call-site
  berikutnya bisa kembali menulis penurunan nilai keuangan tanpa pelaku.
- **`kind` ikut di setiap keputusan** supaya server memilih peta yang benar; absen ⇒
  'AJE' (aman: jenis lain tak pernah tersimpan, server menolaknya sejak awal).

## GOTCHA

- **Uji "merah" bisa merah karena cacat LAIN.** Uji W3 (peran salah ditolak) merah
  sebelum perbaikan — tapi karena W2 membuat item tak terbentuk sama sekali, bukan
  karena gerbangnya. Dibuktikan terpisah dengan menambal balik satu baris
  `stepAuthority` (probe), jalankan `-t "W3"`, lalu pulihkan. Lakukan ini setiap kali
  dua cacat menumpuk di satu jalur.
- Seluruh `migration/src/*` **CRLF** dengan `core.autocrlf=true`. Mutasi lewat python:
  `.replace('\r\n','\n')` → sunting → `.replace('\n','\r\n')`, tulis `newline=''`, dan
  **assert `count(old)==1`** sebelum mengganti.

Berkas: `migration/src/wip_adj.ts` (baru, murni) · `wip_writedown_authority.test.ts`
(baru, 13 uji, 1 `it.fails` karantina W1) · `aje_approval.ts` (`APPROVAL_STEP_CAP`,
`approvalStepCap`) · `data_platform.ts` · `use_firm_wip.ts` · `view_wip.tsx` ·
`view_platform.tsx` · `server/src/signoff.ts` (salinan dicabut).
Usulan W1: `docs/usulan-W1-wip-writedown-otorisasi.md` — rekomendasi **Opsi A**
(menahan efek), 3 pertanyaan terbuka. BELUM diputuskan Ari.
