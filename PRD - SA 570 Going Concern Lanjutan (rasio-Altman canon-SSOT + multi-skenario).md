# PRD — SA 570 Going Concern Lanjutan: Rasio & Altman Z dari WTB/Canon (SSOT) + Multi-Skenario Tersimpan

> Status: **APPROVED — Ari pra-otorisasi sesi ini** ("Anda dapat menjalankan tanpa persetujuan saya pada sesi ini"). Dokumen ini merancang; implementasi langsung berjalan.
> Stream: **follow-up eksplisit dari [PR#12](https://github.com/ari1945/Asseris/pull/12)** — dua item Non-Scope-nya (§5: "Derivasi rasio & Altman Z dari WTB/canon" + "multi-skenario tersimpan"). Lihat [[asseris-gap-matrix-eval]], [[neosuite-ams-next-session]].
> **Beda sifat dari PR#12:** PR#12 memperdalam proyeksi/covenant/mitigasi. PRD ini menutup **dua pelanggaran SSOT tersisa** (rasio & Altman hardcoded) + menambah **multi-skenario** (snapshot stress tersimpan), bukan satu skenario aktif.

---

## 1. Problem

`view_goingconcern.tsx` pasca-PR#12: proyeksi/covenant/mitigasi sudah substantif & ter-persist. **Dua sisa pelanggaran SSOT + satu keterbatasan model:**

- **`GC_RATIOS` hardcoded.** 6 rasio (Current/Quick/DER/Interest Coverage/OCF/Modal Kerja) + PY + sparkline = konstanta literal (`view_goingconcern.tsx:17-24`). Angka **tak ditarik dari WTB** → bisa drift vs FS Generator/Rekonsiliasi saat AJE berubah. Verifikasi tangan: nilai hardcoded **persis sama** dgn turunan WTB (CR 1.60, QR 0.79, DER 0.97, ICR 3.96, Modal Kerja 57.1) — jadi mereka *snapshot beku*, bukan hidup.
- **Altman Z hardcoded.** `const z = (1.2*0.18 + 1.4*0.31 + 3.3*0.11 + 0.6*1.03 + 1.0*1.05)` (`:150`) — lima rasio X1–X5 ditulis sebagai magic number. Verifikasi tangan: X1–X5 itu **tepat** = turunan WTB (X1=WC/TA, X2=Saldo Laba/TA, X3=EBIT/TA, X4=Ekuitas/TL, X5=Penjualan/TA), Z≈2.69 (grey zone). Tapi tetap beku.
- **Skenario tunggal.** State `scenario {revShock, costCut, financing}` cuma satu. Auditor tak bisa menyimpan & membandingkan **base / downside / severe** berdampingan — padahal stress test going concern lazimnya beberapa skenario.

> Konsekuensi: rasio & Z — sinyal kuantitatif inti penilaian going concern — **tidak ber-SSOT** (bisa tak sinkron saat AJE bergerak) dan stress test **tak menyimpan jejak banding skenario**.

## 2. Objective

1. **Rasio & Altman Z dari WTB via helper canon baru** (`AMS_CANON.goingConcern(wtb)`), reaktif terhadap AJE live (`useAudit().wtb`) — nol hardcode, tertelusur ke buku besar, konsisten lintas-modul.
2. **Multi-skenario tersimpan & berdampingan** — daftar skenario bernama (base/downside/severe + kustom), tiap skenario menyimpan parameter stress sendiri, persist engagement-scoped, dengan tabel banding (kas terendah & bulan defisit per skenario).

## 3. Success Criteria

- **Helper canon `goingConcern(wtb?)`** mengembalikan, dari WTB (Rp juta + rasio unitless): agregat (CA/CL/persediaan/TA/TL/ekuitas/saldo laba/penjualan/EBIT/bunga/laba bersih/modal kerja), rasio (CR/QR/DER/ICR/OCF indirect), Altman (X1–X5, Z, zone) untuk **tahun berjalan & tahun lalu** (kolom `adj` & `ly`). Zero-arg → pakai `AMS.WTB` (lolos sweep regresi).
- **Selektor ber-tipe** `goingConcernFor(wtb)` di `canon_selectors.ts`; view memanggil via selektor (pola W5). Tipe `GoingConcernResult`/`GcAggregates`/`AltmanZ` di `canon_types.ts`.
- **View memakai canon:** `GC_RATIOS` & `z` literal **dihapus**; kartu rasio + banner Altman menarik dari `goingConcernFor(wtb)`. Tren sparkline = data nyata `[py, cy]` (bukan deret fiktif). Verdict (`ratioFlags`) tetap jalan atas rasio nyata.
- **Multi-skenario:** state `scenarios[] {id, name, revShock, costCut, financing}` + `activeScenarioId`, persist `goingconcern.<engId>`. **Migrasi mulus** dari bentuk lama `scenario` (single) → satu skenario "Skenario Dasar". UI: pilih/tambah(duplikat)/ganti-nama/hapus (min 1); slider menulis skenario aktif; **tabel banding** kas terendah + bulan defisit per skenario; proyeksi & verdict ikut skenario aktif.
- **Memo** ekspor menyertakan rasio & Z nyata + ringkasan banding skenario.
- **Lock LUNAK** (arsip) menonaktifkan editing skenario.
- Gate teknis: `typecheck` + `lint` (ratchet `no-explicit-any` utuh, **0 `:any` baru**) + **vitest hijau** (migration ≥82 + test canon_part5 baru; server ≥116); snapshot regresi canon di-update **sengaja** (engine baru, angka diverifikasi vs hardcoded existing) via `npm run test -- -u`; 0 error konsol saat boot.
- **Verifikasi live** (recipe TOTP-bypass) bila feasible.

## 4. Scope

- **`migration/src/canon_part5.ts` (baru):** `goingConcern(wtb?)`. Agregasi by-code-prefix (1-1=aset lancar, 1-2=tdk lancar, 2-1=liab lancar, 2-2=liab tdk lancar, 3-=ekuitas, 4-=pendapatan, 5-=beban) + kode spesifik (persediaan 1-1300, saldo laba 3-2100, bunga 5-4100, COGS/Sell/Admin/Tax). Rasio & Altman utk `adj` & `ly`. OCF = metode tak langsung dari mutasi WTB (`ly→adj`): NI + penyusutan/amortisasi (Δakum) + kenaikan CKPN − ΔModal Kerja operasi. Deterministik, murni WTB, teruji.
- **`canon.ts`:** import + daftar `goingConcern` ke `AMS_CANON_BASE`.
- **`canon_selectors.ts`:** `goingConcernFor(wtb)` + re-export tipe.
- **`canon_types.ts`:** `GcAggregates`, `AltmanZ`, `GoingConcernResult`.
- **`canon_part5.test.ts` (baru):** assert CR≈1.60, QR≈0.79, DER≈0.97, ICR≈3.96, WC≈57.100, Z≈2.69 grey, zero-arg tak melempar, PY terisi.
- **`view_goingconcern.tsx`:** hapus `GC_RATIOS`/`z`; tarik dari selektor (`useAudit().wtb`). Multi-skenario state + UI + tabel banding; faktor proyeksi ke `projectCash(assumptions, scenario)` murni.

## 5. Non-Scope

- Mengubah angka audit / WTB / AJE; menambah akun. (Helper hanya **membaca** WTB.)
- Altman X4 berbasis kapitalisasi pasar — data pasar tak ada di WTB → pakai **nilai buku ekuitas** sebagai proksi (didokumentasikan; identik dgn hardcoded existing 1.03).
- Cash-flow statement penuh dari FSGEN sebagai sumber OCF (DI-seam FSGEN null di headless) — OCF dipakai **metode tak langsung murni-WTB** agar deterministik & teruji. FS Generator tetap laporan arus kas otoritatif; kartu OCF ini analitik.
- Tren multi-tahun (>2 periode) — WTB hanya `ly` & `adj`; sparkline = 2 titik nyata.
- Integrasi otomatis utang/jatuh tempo; narasi AI; multi-tenant.

## 6. Constraints

- ESM-only, edit `migration/src/*`. Aturan emas: alias `useMemoGC` sudah ada; canon murni TS (`tsc --noEmit` 0 error, full strict).
- Engagement-scoped `useAmsPersist('goingconcern.<engId>')` — **bentuk baru aditif & backward-compat** (state lama `scenario` ter-migrasi, tak hilang).
- Ratchet `no-explicit-any`: tipe domain penuh; handler `Ev` struktural; **tanpa suppression baru**.
- Deterministik (tanpa `Math.random`/`Date.now` di canon).
- Snapshot regresi canon: update **sengaja** + catatan (engine baru; figur diverifikasi vs nilai hardcoded yang digantikan).

## 7. Existing Solutions / yang dipakai ulang

- **`figuresFromWTB`/`wtbVal` (canon_base)** — pola tarik saldo by-code & fallback `AMS.WTB`.
- **`materiality()`/`materialityFor`** — pola engine canon + selektor ber-tipe + test baseline (`canon_part4.test.ts`).
- **`canon_regression.test.ts`** — sweep zero-arg; helper baru wajib aman zero-arg.
- **`useAmsPersist` + `Ev` + lock LUNAK** (PR#12) — pola persist & editing.
- **`projection` useMemo existing** — diangkat jadi `projectCash()` murni, dipakai aktif + banding.

## 8. Proposed Approach

1. **Canon:** tulis `goingConcern(wtb?)` (canon_part5). Helper `pick(field)` menghitung satu set agregat+rasio+Altman utk `field∈{adj,ly}`; `goingConcern` mengembalikan `{cy: pick('adj'), py: pick('ly'), altman, altmanPy}`. OCF dihitung sekali (butuh ly→adj). Daftar ke `AMS_CANON_BASE`; selektor + tipe.
2. **Test canon:** `canon_part5.test.ts` assert headline = nilai hardcoded yang digantikan (bukti setara). `npm run test -- -u` utk snapshot regresi.
3. **View — rasio:** ganti `GC_RATIOS.map` agar bersumber dari `goingConcernFor(wtb)`; definisikan metadata kartu (label/unit/hint/good/warn) terpisah dari nilai (nilai dari canon). Banner Altman tarik `gc.altman.z`/`zone`.
4. **View — multi-skenario:** tambah `scenarios`/`activeScenarioId` ke `GCState` + migrasi; `projectCash(assumptions, scenario)` murni; chip pemilih + add/rename/del; tabel banding (map semua skenario → minBal & bulan defisit). Slider/toggle menulis skenario aktif.
5. **Memo & lock:** memo menyertakan blok rasio+Z+banding; lock LUNAK ke editor skenario.

## 9. Risks

- **Snapshot regresi canon berubah** → memang (engine baru). Mitigasi: update sengaja + test part5 mengunci figur = nilai hardcoded yg digantikan (bukti tak ada drift).
- **OCF indirect ≠ FS Generator** → mitigasi: dokumentasi kartu = analitik tak-langsung murni-WTB; FS Generator tetap otoritatif. (Hasil ~16 M, ordo wajar.)
- **Migrasi state lama** → mitigasi: normalisasi defensif (`scenario`→`scenarios`), `useAmsPersist` kembalikan seed bila kosong; tak menghapus key lama secara destruktif.
- **`:any` baru** → tipe penuh + `Ev`; lint tiap fase.
- **PY rasio bergeser** dari sparkline lama (PY dulu eyeballed, mis. CR PY 1.82 vs turunan 1.72) → benar & lebih jujur (SSOT); dicatat.

## 10. Implementation Plan (bertahap, reversible)

- **Fase 1 — Canon helper + tipe + selektor + test:** `canon_part5.ts` + `canon_types` + `canon.ts` + `canon_selectors.ts` + `canon_part5.test.ts`; `npm run test -- -u`. Gate. Commit.
- **Fase 2 — View pakai canon:** hapus `GC_RATIOS`/`z`; rasio & Altman dari selektor; sparkline `[py,cy]`. Gate + smoke. Commit.
- **Fase 3 — Multi-skenario:** state+migrasi+`projectCash`+UI pemilih+tabel banding+memo. Gate + smoke. Commit.
- Tiap fase: migration `lint`+`typecheck`+`test`+`build` & server `typecheck`+`test`. PR off `master` (branch `sa570-goingconcern-ratios-canon`). Update [[asseris-gap-matrix-eval]].

## 11. Open Questions

1. Altman X4 proksi nilai-buku (bukan pasar) — disetujui sebagai default jujur. *(asumsi: ya; identik hardcoded existing.)*
2. OCF metode tak-langsung murni-WTB (bukan FSGEN) — disetujui demi determinisme/test. *(asumsi: ya.)*
3. Skenario seed awal: "Skenario Dasar" (dari state lama) + auditor tambah sendiri; tak pra-isi downside/severe agar tak mengarang angka. *(asumsi: ya.)*
