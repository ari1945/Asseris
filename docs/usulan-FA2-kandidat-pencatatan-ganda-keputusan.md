# Usulan FA2 — kandidat pencatatan ganda aset tetap: jalur keputusan

> Status: **DISETUJUI 2026-08-23 & DIKERJAKAN** — Ari memilih rekomendasi di tiap
> pertanyaan (lingkup **firm** · kewenangan **`FIRMFIN_EDIT` eksplisit** · nasib
> pasangan yang diputuskan **opsi B**). Dokumen ini dipertahankan sebagai catatan
> keputusan, bukan sebagai usulan terbuka.
> Dibuat 2026-08-22 menjawab FA2 di [`prompts-perbaikan/33-fixedassets.md`](prompts-perbaikan/33-fixedassets.md).
> Bukan PRD (nama berkas sengaja tak berawalan `prd` agar tak masuk registri status §7).
> FA1 · FA3 · FA4 dari prompt yang sama sudah dikerjakan lebih dulu.
>
> **Yang dibangun:** `migration/src/fixedassets_dup_decisions.ts` (murni) ·
> panel `DupCandidatesPanel` di `view_firmtreasury.tsx` · cabang
> `assetDupDecisions.v1` di `capForWrite` (`migration/src/rbac.ts`) · kolom
> keputusan di lembar 'Kandidat Pencatatan Ganda' kertas kerja. Gerbang:
> `fixedassets_dup_decisions.test.ts` · `fixedassets_render.test.ts` ·
> `fixedassets_export.test.ts` · `rbac.test.ts`.

## Cacat yang terverifikasi

Panel "Kandidat Pencatatan Ganda" menyatakan sendiri bahwa ia menunggu manusia:

> `sub={`${dups.length} pasangan lintas-register — **perlu keputusan firma**`}`
> — [view_firmtreasury.tsx](../migration/src/view_firmtreasury.tsx), rentang `FixedAssets()`

Tetapi tidak ada cara merekam keputusan itu. Tak ada `useAmsPersist`/`useServerState`
di rentang modul ini sama sekali — nol pelaku, nol tanggal, nol alasan. Setiap kali
layar dibuka, `duplicateCandidates()` menghitung ulang dari seed dan pasangan yang
sama muncul lagi seolah belum pernah dilihat siapa pun.

Pada seed sekarang ada **dua** pasangan (terverifikasi hari ini):

| Pasangan | Kelas | Selisih | Nilai gabungan |
|---|---|---|---|
| `FA-006` Laptop Tim Audit (40 unit) ⟷ `AST-1042` Laptop ThinkPad X1 (batch audit) | Perangkat & Infrastruktur TI | 30 hari | Rp 1.332.500.000 |
| `FA-002` Server & Infrastruktur Jaringan ⟷ `AST-1051` Server & NAS arsip kertas kerja | Perangkat & Infrastruktur TI | 28 hari | Rp 1.165.000.000 |

Rp 2,5 miliar harga perolehan berdiri di daftar "mungkin dicatat dua kali", dan
firma tidak punya tempat untuk mengatakan "sudah kami periksa, ini bukan duplikat".

Sejak FA1, kedua pasangan ikut ke kertas kerja tersegel — lengkap dengan baris meta
*"belum ada keputusan firma yang tercatat"*. Itu memperjelas kebutuhannya, tidak
menjawabnya: berkasnya kini menyatakan ketiadaan jalur keputusan setiap kali diekspor.

## Pola yang dicari sudah ada — tetapi lingkupnya berbeda

`useDiagDecisions` ([diagnostics_panel.tsx:155](../migration/src/diagnostics_panel.tsx))
merekam: `verdict` (follow / ignore) · `who` · `role` · `when` · `reason`, lalu
`logActivity` ke jejak audit. Persistensinya `useAmsPersist('diagnostics.v1', …)`,
dan `diagnostics.v1` terdaftar `'engagement'` di `AMS_PERSIST_SCOPE`
([contexts.tsx:429](../migration/src/contexts.tsx)) — jadi ia **server-scoped per
perikatan**, bukan localStorage.

Register aset tetap adalah data **FIRMA**. Menyalin pola itu apa adanya akan
menyimpan keputusan di bawah perikatan yang kebetulan aktif saat tombol ditekan —
artinya keputusan yang sama harus diambil ulang tiap perikatan, dan keputusan
perikatan A tak terlihat dari perikatan B. Itu bukan versi kecil dari masalahnya;
itu masalah yang berbeda.

## Tiga pertanyaan yang harus Ari jawab

### 1 · Lingkup kunci

**Usul saya: `assetDupDecisions.v1`, scope `firm`.** Register aset tetap milik firma;
keputusan atasnya berlaku sekali untuk semua orang. Konsekuensi yang harus disadari:
kunci yang **tidak** didaftarkan di `AMS_PERSIST_SCOPE` sudah default ke `firm`, jadi
tak ada baris baru di sana — tetapi lihat §2, karena default scope firm membawa
default kewenangan yang salah.

Alternatif (`engagement`) hanya masuk akal bila keputusannya adalah *judgment audit
per perikatan* ("untuk audit 2025 kami perlakukan ini sebagai satu aset"), bukan
*pembersihan register*. Saya tidak percaya itu yang dimaksud, tapi ini keputusan Ari.

### 2 · Kewenangan

**Usul saya: `FIRMFIN_EDIT`, ditambahkan eksplisit ke `capForWrite`**
([rbac.ts:181](../migration/src/rbac.ts)) di sebelah `firmgl`/`firmap`/`firmtax`/
`bankrecon`/`invoices`/`wip.adj`.

Ini bukan detail administratif. Tanpa cabang eksplisit, kunci firm-scope jatuh ke
`FIRM_ADMIN` — **Partner saja**. Peran 'Finance Firma', yang justru memegang register
ini, akan melihat tombol keputusan aktif lalu tulisannya ditolak server. Sejak #285
penolakan itu memunculkan toast "Penyimpanan ditolak" alih-alih hilang senyap, jadi
kelasnya sudah tidak diam — tetapi tetap gagal, dan tetap merupakan kontrol yang
tampak hidup padahal tidak.

Pertanyaan terbukanya: apakah menyatakan "ini duplikat" perlu **pemisahan peran**?
Menghapus Rp 1,3 miliar harga perolehan dari register adalah keputusan berdampak
laporan keuangan. Kalau ya, ini bukan satu tombol melainkan rantai dua-lapis (pengusul
→ pemberi otorisasi), dan biayanya jauh lebih besar dari yang tersirat di prompt.

### 3 · Nasib pasangan yang sudah diputuskan

Tiga bentuk, dan hanya satu yang saya anggap benar:

- **A · Hilang dari daftar.** Panel menyusut, terasa bersih. **Menolak.** Register aset
  tetap adalah dokumen yang diaudit; keputusan yang tak terlihat lagi tak dapat
  ditinjau, dan tahun depan seseorang akan menghitung ulang kandidat yang sama tanpa
  tahu sudah ada yang memeriksanya.
- **B · Tetap tampil dengan status** ("bukan duplikat — Bayu S., 2026-08-22, *alasan*"),
  dengan penyaring "sembunyikan yang sudah diputuskan" seperti `showDone` di
  diagnostics_panel. **Usul saya.** Panel tetap ringkas, jejaknya tetap ada, dan
  kertas kerja FA1 dapat membawa kolom keputusan tanpa berubah bentuk.
- **C · Keputusan "ini memang duplikat" MENGUBAH register** (satu baris dihentikan
  pengakuannya). **Ini bukan FA2.** Itu menggeser `totCost`/`totNbv`, roll-forward, dan
  saldo yang dibandingkan dengan kontrol GL `1-400` — pekerjaan PR-2, dengan risiko
  §8 R-1 yang sudah terdokumentasi. Kalau ini yang Ari inginkan, ia harus dijadwalkan
  sesudah PR-2, bukan disisipkan sekarang.

Perhatikan konsekuensi B yang tidak sepele: keputusan dikunci pada pasangan
`(a.id, b.id)`. Bila seed register berubah — satu aset ditambah, satu tanggal
perolehan dikoreksi — `duplicateCandidates()` dapat memunculkan pasangan BARU dan
menghilangkan yang lama. Keputusan atas pasangan yang tak lagi dihitung harus
**disimpan, bukan dihapus**, dan ditampilkan sebagai "tak lagi terdeteksi" — kalau
tidak, mengoreksi satu tanggal diam-diam membatalkan pemeriksaan manusia.

## Biaya kalau saya salah menebak

Membangun jalur keputusan dengan lingkup yang keliru menghasilkan kelas cacat yang
sama dengan yang baru saja dicabut dari tiga modul lain: kontrol yang tampak bekerja,
tulisan yang ditolak, atau keputusan yang tersimpan di tempat yang tak seorang pun
cari. Itu sebabnya saya berhenti di sini alih-alih menebak.

## Keputusan Ari (2026-08-23) — dan apa yang dibangun atasnya

1. **Lingkup: firm.** Kunci `assetDupDecisions.v1` tak didaftarkan di
   `AMS_PERSIST_SCOPE`, jadi `useAmsPersist` menempatkannya di scope `firm`
   (`PR4_ENGAGEMENT_KEY_RE` tak mencocokkannya). Satu keputusan berlaku untuk
   seluruh firma.
2. **Kewenangan: `FIRMFIN_EDIT`, didaftarkan eksplisit.** `capForWrite` di
   `migration/src/rbac.ts` — satu peta yang sama yang diimpor
   `server/src/rbac.ts`, jadi gate UI dan penegakan server tak dapat berbeda.
   Gerbang perilakunya menguji bahwa peran 'Finance Firma' benar-benar lolos,
   bukan sekadar bahwa namanya `FIRMFIN_EDIT`.
   **Rantai dua-lapis TIDAK dibangun** — pertanyaan itu hanya relevan bila
   keputusan mengubah register, dan opsi B memastikan ia tidak.
3. **Opsi B.** Pasangan yang diputuskan tetap tampil dengan statusnya, di balik
   penyaring "Tampilkan N yang sudah diputuskan". Verdict `duplikat` adalah
   PENGUNGKAPAN: layar dan kertas kerja menyatakan berapa harga perolehan yang
   firma akui tercatat dua kali, **dan** bahwa register belum dikoreksi.
   Keputusan atas pasangan yang tak lagi dihitung mesin **disimpan** dan ditandai
   *tak lagi terdeteksi*; ia tidak ikut dijumlahkan sebagai duplikat aktif, karena
   ia tak lagi menggambarkan register.

Tiga penjaga yang ditambahkan di luar tiga jawaban itu, karena tanpanya catatannya
tidak berguna: **pelaku, alasan, dan tanggal WAJIB** (`dupDecisionRecord` melempar
bila salah satunya kosong); stempel diambil dari **klok SSOT** (`AMS.TODAY`), bukan
jam mesin; dan keputusan ikut ke **jejak audit** lewat `logActivity`, bukan hanya ke
dokumennya.
