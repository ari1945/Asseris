# PRD — Baseline Performa & Validasi Kapasitas Instance (t3.small/t4g.small)

> Wajib diisi sebelum implementasi apa pun. Implementasi TIDAK dimulai sebelum ada sign-off ("Proceed.").

| Field | Isi |
|---|---|
| Tanggal | 2026-07-03 |
| Pemilik | Ari Widodo |
| Status | **Implemented** — seluruh Fase 1-7 dieksekusi & live-verified thd stack Docker lokal 2026-07-03. Hasil: `docs/DEPLOY.md` §19. |
| Engagement ID terkait | — (infra/deploy-readiness, bukan engagement klien) |
| Keputusan terkunci (AskUserQuestion sesi ini) | Volume WTB uji = **skenario grup/konsolidasi ~5.000+ baris** (bukan rentang bertingkat). Ambang SLA = **p95 baca <1dtk, p95 tulis <2dtk**. Lingkungan uji = **lanjutkan WSL Docker Compose dengan cap CPU/RAM meniru t3.small** (konsisten `docs/DEPLOY.md` §12.3), BUKAN EC2 nyata. Dimensi kapasitas = **staf konkuren DAN volume data/jumlah perikatan aktif** (keduanya). |

## 1. Problem
Evaluasi menyeluruh menandai dua gap yang masih ❌:
1. Belum ada baseline performa (waktu page-load, waktu respons `/trpc`) dengan **volume data realistis** — WTB ribuan baris.
2. Belum divalidasi seberapa besar firma (jumlah user, jumlah perikatan aktif) yang bisa ditangani `t3.small`/`t4g.small` sebelum perlu upgrade instance.

`docs/DEPLOY.md` §12.3 (sesi 2026-07-02) SUDAH menjalankan ramp konkurensi (5→10→20→50 sesi) dengan cap CPU/RAM meniru t3.small, tapi:
- Datanya seed demo kecil (7 perikatan, WTB 27 baris per `migration/src/data_part1.ts:53-86`) — jauh dari volume grup/konsolidasi nyata.
- Endpoint yang diukur hanya `auth.me` (baca ringan) dan `state.set` (tulis generik) — bukan endpoint yang benar-benar dibebani volume WTB besar (`bootstrap` mem-fetch **seluruh** `WtbRow` tanpa pagination, `server/src/router.ts:516-533`; fungsi kanon `figuresFromWTB`/`materiality`/`psak65`/`reconcile` di `canon_part*.ts` **tak di-memoize**, iterasi penuh atas array WTB tiap kali dipanggil).
- Hasil §12.3 tak pernah diterjemahkan ke bahasa bisnis ("firma dengan N staf + M perikatan aktif aman di instance X") — cuma angka ops/dtik teknis.
- Skrip ramping-nya sendiri **tak pernah di-commit ke repo** (`DEPLOY.md` bilang "lihat riwayat sesi/memory") — tak reusable, hilang begitu sesi lupa.

## 2. Objective
Hasilkan (a) skrip benchmark yang **di-commit & reusable**, (b) angka baseline performa nyata pada volume WTB grup/konsolidasi (~5.000+ baris) untuk endpoint yang benar-benar dipakai (bootstrap/page-load, view canon-berat, impor TB besar), dan (c) tabel kapasitas yang menerjemahkan angka teknis → rekomendasi bisnis ("firma segini staf + segini perikatan aktif aman di t3.small; di atas itu pertimbangkan upgrade").

## 3. Success Criteria
1. Skrip generator data sintetis (CSV, format yang diterima `wtb_import.ts`) menghasilkan WTB grup/konsolidasi realistis ~5.000+ baris (beberapa subsidiari, kode COA Indonesia wajar) — lolos parse tanpa error, `coverage` PSAK menyala (bukan nol), jelas ditandai **data fiktif/uji**, bukan data klien.
2. Skrip bench (`deploy/aws-ec2-test/loadtest.mjs` atau lokasi setara) **di-commit**, berparameter (endpoint, level konkurensi, durasi), tanpa dependensi npm baru (pakai `fetch` bawaan Node ≥18) — memformalkan metodologi §12.3 supaya tak hilang lagi di sesi berikutnya.
3. Angka p50/p95/p99 terukur untuk: (a) `bootstrap` (fetch penuh WTB) pada volume ~27 baris (baseline existing) vs ~5.000 baris — mengukur delta akibat volume; (b) render/compute satu view canon-berat (Materialitas SA 320 dan/atau WTB Deep-Dive) pada volume yang sama; (c) impor CSV besar lewat `wtb_import.ts` (jalur nyata pengguna, bukan insert SQL langsung).
4. Ramp konkurensi §12.3 (5→10→20→50 sesi, cap Docker meniru t3.small) **diulang** tapi kali ini terhadap perikatan bervolume ~5.000 baris (bukan demo kecil) — menutup gap "endpoint yang diuji bukan yang realistis".
5. Tabel kapasitas ditambahkan ke `docs/DEPLOY.md` (§19 baru): kombinasi sumbu staf-konkuren × volume-data/jumlah-perikatan-aktif → rekomendasi instance, dengan ambang eksplisit (p95 baca <1dtk, tulis <2dtk) dan caveat jujur (approksimasi WSL Docker, bukan EC2 nyata — pola sama seperti seluruh gap deploy-readiness sebelumnya).

## 4. Scope
- **Generator data sintetis**: skrip (mis. `deploy/aws-ec2-test/loadtest/gen-synthetic-wtb.mjs`) yang menulis CSV format `wtb_import.ts` — beberapa "subsidiari" fiktif dengan kode COA berpola nyata (1-xxxx aset, 2-xxxx liabilitas, dst, meniru struktur `data_part1.ts`), total ~5.000+ baris, angka rupiah masuk akal (bukan random murni — supaya engine PSAK/materialitas menyala realistis, bukan nol/aneh).
- **Skrip bench reusable**: satu file, dua mode:
  - `--mode=volume`: single-session, ukur bootstrap + 1-2 view representatif pada dataset kecil (existing) vs besar (5.000 baris) — delta murni akibat volume, tanpa konkurensi.
  - `--mode=concurrency`: port metodologi §12.3 (ramp 5/10/20/50 sesi), tapi target perikatan bervolume besar, dan endpoint mencakup `bootstrap`+view canon-berat (bukan cuma `auth.me`/`state.set` generik).
- **Dua titik data volume** (bukan kurva penuh — sesuai keputusan Anda): baseline seed existing (~27 baris) vs skenario grup/konsolidasi (~5.000+ baris). Cukup untuk mengukur delta nyata, tak mengklaim linear-tidaknya di titik tengah.
- **Dimensi "jumlah perikatan aktif"**: selain satu perikatan besar (stress per-engagement), muat skenario kedua — beberapa perikatan (mis. 10-15) masing-masing bervolume wajar berjalan **bersamaan** di firma yang sama, untuk menguji beban Firm Dashboard/agregasi lintas-perikatan (bukan cuma satu WTB raksasa).
- **Lingkungan**: WSL Docker Compose, cap `docker update --cpus/--memory` meniru total kapasitas t3.small (2 vCPU/2GiB) dibagi proporsional server/db/Caddy — identik pendekatan §12.3.
- **Output**: tabel di `docs/DEPLOY.md` §19 baru, ditambah rujukan skrip di `deploy/aws-ec2-test/README.md`.

## 5. Non-Scope
- **EC2 nyata** — sesuai keputusan Anda, tetap approksimasi WSL Docker. Caveat ini didokumentasikan lagi (bukan diam-diam dianggap setara EC2 burstable-CPU sungguhan).
- **Memperbaiki bottleneck yang ditemukan** (mis. memoisasi fungsi kanon, pagination tabel WTB di UI) — PRD ini HANYA mengukur & melaporkan. Kalau ditemukan bottleneck nyata, itu jadi temuan/gap terpisah untuk PRD remediasi berikutnya, bukan ditambal diam-diam di tengah kerja benchmark.
- **Monitoring performa berkelanjutan** (time-series `/metrics`, APM) — sudah tercatat sebagai gap terpisah di `docs/DEPLOY.md` §16 (alerting hanya liveness, bukan laju error). Di luar cakupan sesi ini.
- **Multi-tenant/horizontal scaling** — arsitektur satu-instance-per-firma adalah keputusan by-design (`docs/DEPLOY.md` §10), tak diubah di sini.
- **Data klien sungguhan** — seluruh data sintetis fiktif, tak pernah masuk jalur produksi (`bootstrap`/provisioning firma nyata), murni untuk keperluan skrip uji lokal.

## 6. Constraints
- Tak ada kredensial AWS (konsisten seluruh sesi deploy-readiness sebelumnya) — WSL Docker + cgroup cap adalah satu-satunya approksimasi yang tersedia.
- Data sintetis harus lewat jalur impor CSV **nyata** (`wtb_import.ts`) supaya mengukur jalur yang benar-benar dipakai pengguna (parsing + validasi + PSAK coverage), bukan insert SQL langsung yang melewati logika aplikasi.
- Skrip bench tanpa dependensi npm baru — pakai `fetch`/`http` bawaan Node, konsisten filosofi "nol-vendor" yang sudah dipakai di export/seal (`export_xlsx.ts` dst) dan LLM proxy (W8).

## 7. Existing Solutions
- Metodologi ramp §12.3 (`docs/DEPLOY.md:272-306`) — logikanya dipakai ulang, bukan didesain dari nol.
- `wtb_import.ts` (parser CSV Indonesia-aware) — dipakai sebagai jalur muat data sintetis, bukan ditulis ulang.
- Teknik cap `docker update --cpus/--memory` dari §12.3 — dipakai identik.

## 8. Risks
- **Dua titik data (27 vs 5.000 baris) tak mengungkap apakah degradasi linear atau ada "tebing" di volume menengah** — keterbatasan yang Anda terima secara eksplisit (memilih skenario tunggal, bukan rentang bertingkat), dicatat di sini supaya jujur, bukan disembunyikan.
- **Data sintetis "grup/konsolidasi" bisa terlihat seperti menggambarkan klien nyata** bila tak ditandai jelas — mitigasi: penamaan fiktif eksplisit (pola sama seed demo `[DEMO]`/`WHR & Rekan` fiktif yang sudah ada), tak pernah disalin ke `bootstrap` produksi.
- **Godaan memperbaiki bottleneck yang ditemukan di tengah jalan** — Non-Scope §5 melarang eksplisit; temuan jadi laporan, bukan tambalan diam-diam.
- **WSL Docker tak identik EC2 burstable-CPU nyata** — risiko sudah dicatat berulang di §12.3/§12.4, diulang lagi di kesimpulan PRD ini supaya tak ada yang membaca tabel kapasitas sebagai SLA final.

## 9. Implementation Plan
| Fase | Isi | Bukti keberhasilan |
|---|---|---|
| 1 | Generator CSV sintetis ~5.000+ baris grup/konsolidasi (COA realistis) | Lolos parse `wtb_import.ts` tanpa error, `coverage` PSAK menyala wajar |
| 2 | Commit skrip bench reusable (`deploy/aws-ec2-test/loadtest/`), mode `volume` + `concurrency`, tanpa dependensi baru | Skrip jalan lokal thd stack dev, output tabel p50/p95/p99 format sama §12.3 |
| 3 | Boot Docker Compose cap t3.small (§12.3) → impor CSV 5.000 baris via jalur nyata ke 1 perikatan uji + seed 10-15 perikatan volume wajar berjalan bersamaan | Impor sukses, DB menunjukkan volume sesuai target |
| 4 | Ukur mode `volume`: bootstrap + view canon-berat (Materialitas SA320, WTB Deep-Dive) pada 27 vs 5.000 baris, single-session | p50/p95 tercatat, delta terhadap baseline dilaporkan |
| 5 | Ukur mode `concurrency`: ramp 5→10→20→50 sesi terhadap perikatan volume besar + skenario multi-perikatan aktif (dashboard firma) | Tabel ops/dtk + p50/p95/p99 per level, error count |
| 6 | Sintesis: tabel kapasitas (staf konkuren × volume-data/jumlah-perikatan → rekomendasi instance), ambang p95 baca<1dtk/tulis<2dtk | Tabel masuk `docs/DEPLOY.md` §19 dgn caveat approksimasi |
| 7 | Update `deploy/aws-ec2-test/README.md` (rujukan skrip) + memory `asseris-deploy-readiness` | Cross-link konsisten, memory terkini |

## 10. Open Questions
1. **View representatif untuk "page-load canon-berat"** — saya usulkan **Materialitas (SA 320)** dan **WTB Deep-Dive** sebagai dua proxy (konsumen terberat `figuresFromWTB`/`materiality`/`psak65` per riset kode). Termasuk **Firm Dashboard** (agregasi lintas-perikatan) sebagai proxy ketiga untuk dimensi "jumlah perikatan aktif", atau cukup dua view di atas?
2. **Skenario multi-perikatan (10-15 perikatan aktif bersamaan)** — volume WTB per perikatan di skenario ini pakai angka wajar (mis. seed existing ~27-100 baris) atau ikut diperbesar? Saya usulkan wajar/sedang (bukan 5.000×15) supaya skenario ini murni menguji sumbu "jumlah perikatan", terpisah dari sumbu "volume per-perikatan" yang sudah diuji di Fase 4.

---
Balas **"Proceed."** untuk mulai implementasi (opsi Open Questions #1/#2 di atas akan saya jalankan dengan default yang saya usulkan bila tak dijawab eksplisit, dicatat di §11a setelah implementasi — pola sama PRD-PRD sebelumnya).

## 11a. Keputusan diambil pada implementasi (Ari menjawab "Proceed." tanpa menjawab §10 satu-satu)

1. **OQ#1 (view representatif)** — TIDAK memakai Materialitas (SA320)/WTB Deep-Dive sebagai
   "view proxy" seperti diusulkan. Setelah membaca kode (`canon_part4.ts`), `materiality()`
   TERNYATA tidak menerima `wtb` sama sekali (config-only via `localStorage`/`window.BENCHMARKS`,
   O(1) — bukan volume-sensitif seperti diasumsikan PRD ini). Diganti dengan mengukur
   `figuresFromWTB`/`reconcile`/`psak65` LANGSUNG (headless, `bench-canon.ts`) — lebih presisi
   dari mencoba men-drive view React lewat browser (bebas noise render/network), tapi TIDAK
   mencakup waktu render DOM (dicatat sebagai gap terbuka, `docs/DEPLOY.md` §19.4 poin 3).
2. **OQ#2 (multi-perikatan 10-15)** — diturunkan ke **7 perikatan seed existing** (bukan
   fabrikasi 10-15 perikatan baru): Manager/Partner (ENGAGEMENT_VIEW_ALL) bisa mengakses seluruh
   7 tanpa perlu mengubah schema/seed — lebih rendah-risiko dari memperluas `seed.ts`. Volume
   "wajar" (240 baris) dimuat ke 2 perikatan pendamping (`ENG-2025-040`/`031`) utk dimensi
   jumlah-perikatan-aktif; skenario "50 perikatan sekaligus" TIDAK diuji (di luar volume seed
   yang tersedia tanpa mengubah schema — dicatat sbg keterbatasan #4 di `docs/DEPLOY.md` §19.4).

**Temuan tak terduga (bug nyata, diperbaiki)**: implementasi pertama `bench.mjs` mode
`concurrency` memakai SATU kunci `StateDoc` (`loadtestProbe`) dibagi seluruh worker tulis —
menghasilkan ratusan "error" CAS-409 palsu (artefak desain bench, bukan sinyal arsitektur nyata)
dan (terpisah) `stateGet()` yang melempar exception tak tertangkap bisa menjatuhkan seluruh
`Promise.all` satu level pengujian. Diperbaiki: kunci per-worker (`loadtestProbe-${idx}`,
meniru pola realistis "N staf menulis dokumen masing-masing") + try/catch per-worker + kolom
CAS-409 terpisah dari kolom Error. Setelah perbaikan: nol error/nol conflict di seluruh
level 5-50 sesi (lihat `docs/DEPLOY.md` §19.3).

**Sign-off:** ditandai dengan balasan **"Proceed."** — DITERIMA (2026-07-03).
