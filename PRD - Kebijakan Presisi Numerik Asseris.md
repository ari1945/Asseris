# PRD — Kebijakan Presisi Numerik Asseris

> Wajib diisi sebelum implementasi apa pun. Implementasi TIDAK dimulai sebelum sign-off ("Proceed.").

| Field | Isi |
|---|---|
| Tanggal | 2026-07-01 |
| Pemilik | Ari Widodo |
| Status | Draft |
| Engagement ID terkait | — (produk internal Asseris) |

## 1. Problem

Seluruh nilai moneter Asseris disimpan sebagai `Float` (IEEE-754 double) di skema (`WtbRow.ly/unadj/aje`, `Client.fee`, `Engagement.materiality` — `server/prisma/schema.prisma:291,308`) dan **dihitung** sebagai JS `number` (double) di canon. Komentar skema mengklaim *"zero numeric drift vs the in-app constants"*.

**Klaim itu overstated dan belum ditelaah sebagai kebijakan.** Ia benar hanya untuk bilangan bulat yang tak ditransformasi (< 2⁵³). Begitu ada pembagian/perkalian, presisi biner menyimpang dari desimal:

- `canon_base.ts:11` — `jt = Math.round((n||0)/1e6)`: model internal ternyata bekerja dalam **Rp juta ter-round**, sehingga presisi sub-juta **sudah dibuang** di angka kanonik. Ini keputusan pemodelan implisit yang belum pernah dinyatakan sebagai kebijakan.
- `canon_base.ts:66-68` — PV sewa (PSAK 73): `r = ratePct/100/12; pv = pmt*(1-Math.pow(1+r,-n))/r` → pangkat & pembagian float.
- `canon_base.ts:93` — ROU garis lurus: `pv*(termMo-el)/termMo` → pembagian float.
- Titik sejenis di seluruh suite: materialitas (benchmark × %), interval sampling SA 530, rasio Altman SA 570, book-tax/rekonsiliasi fiskal, tarif pajak tangguhan.

Untuk produk yang **nilai jualnya adalah angka yang harus *tie-out* sampai satuan yang dijanjikan**, presisi yang tidak-disengaja adalah risiko **kredibilitas**, bukan sekadar teknis. Masalahnya bukan "double itu buruk" — masalahnya **tidak ada kebijakan eksplisit** tentang unit, pembulatan, dan di mana desimal-eksak wajib.

## 2. Objective

Menetapkan dan menegakkan **Kebijakan Presisi Numerik** yang eksplisit dan teruji: satuan kerja resmi, aturan pembulatan di setiap *boundary*, daftar titik aritmetika berisiko, dan keputusan kolom mana (jika ada) yang wajib `Decimal`/`NUMERIC` — sehingga angka yang ditampilkan, disegel (export), dan disimpan **konsisten dan dapat dipertahankan** di hadapan reviewer/regulator.

Kenapa objective yang benar: kepercayaan pada produk audit runtuh bila dua modul menampilkan total yang tak cocok satu satuan, atau bila angka tersegel tak bisa direproduksi. Tujuannya **determinisme & auditabilitas angka**, bukan mengejar presisi maksimal yang tak perlu.

## 3. Success Criteria

1. **Dokumen kebijakan** `docs/NUMERIC-POLICY.md`: menyatakan (a) satuan kerja kanonik (mis. Rp penuh vs Rp juta), (b) aturan pembulatan (metode + jumlah desimal + titik penerapan), (c) daftar kelas nilai yang menuntut desimal-eksak vs yang boleh double.
2. **Inventaris titik aritmetika**: tabel seluruh lokasi di `canon*.ts`/`forensic_canon.ts` yang melakukan bagi/kali/pangkat atas nilai moneter, masing-masing diklasifikasi (aman-double / butuh-round-boundary / butuh-Decimal), dengan file:line.
3. **Uji tie-out ("golden")**: suite yang mengunci konsistensi lintas-modul — mis. total materialitas, WTB↔lead schedule, rekonsiliasi, PV sewa — sehingga setiap regresi presisi **gagal di CI**. Toleransi didefinisikan eksplisit (idealnya 0 pada satuan kebijakan).
4. **Reproduksibilitas segel**: nilai yang di-export & disegel (W10.5) dihitung dari canon dengan pembulatan kebijakan; me-render ulang menghasilkan `contentHash` identik (tak ada drift antar-render).
5. **Konsistensi klaim**: komentar "zero numeric drift" di skema diganti pernyataan yang akurat (unit + kebijakan pembulatan), atau dibuktikan benar di bawah kebijakan.
6. **Keputusan Decimal ter-eksekusi**: bila kebijakan memutuskan kolom tertentu → `Decimal`, migrasi Prisma `Float`→`Decimal` selesai tanpa perubahan nilai tampil; bila memutuskan tetap double + disiplin round, keputusan itu terdokumentasi beralasan.

## 4. Scope

- Audit & inventarisasi seluruh titik aritmetika moneter di lapisan canon (`migration/src/canon*.ts`, `forensic_canon.ts`).
- Penetapan satuan kerja & aturan pembulatan kanonik.
- Helper pembulatan terpusat (mis. `roundMoney`, `roundPct`) + penerapan di *boundary* (tampilan `rp()`/`fmt()`, nilai tersegel, nilai di-post dari sumber eksternal).
- Uji golden tie-out lintas-modul.
- Keputusan & (bila perlu) migrasi kolom `Float`→`Decimal` untuk nilai yang di-*ingest*/di-*post* (WTB dari konektor, fee).
- Perbaikan komentar/klaim yang menyesatkan.

## 5. Non-Scope

- **Rewrite mesin canon** — kebijakan diterapkan di *boundary* & titik berisiko, bukan menulis ulang seluruh perhitungan.
- **Library big-number di seluruh app** — hanya diadopsi bila inventaris membuktikan kebutuhan; default = double + disiplin pembulatan.
- **Perubahan metodologi audit/PSAK** — ini kebijakan *representasi angka*, bukan *isi* perhitungan (materialitas %, metode sampling tak diubah).
- **Presisi mata uang asing/multi-currency** — di luar scope saat ini (produk single-currency IDR).
- Deploy/infra — PRD terpisah ("Deploy-Readiness Single-Tenant").

## 6. Constraints

- **SSOT**: angka berasal dari `AMS.WTB` via `AMS_CANON.*` (CLAUDE.md §5). Kebijakan tak boleh menciptakan salinan angka privat atau meng-hardcode.
- **Determinisme**: canon adalah mesin deterministik (dasar P4 diagnostic) — pembulatan harus deterministik & idempoten, bukan bergantung urutan/locale.
- **Stack all-TS**: aritmetika inheren IEEE-754 double kecuali adopsi library desimal → keputusan harus sadar tradeoff kompleksitas vs presisi.
- **Kompat SQLite↔Postgres**: `Float` seragam kini; `Decimal` Prisma memetakan ke `NUMERIC` (Postgres) & `Decimal`(SQLite emulasi) — verifikasi paritas dev↔prod bila memindah kolom.
- **Model kini ber-satuan juta** (`canon_base.ts:11`) — kebijakan harus memutuskan apakah mempertahankan atau menaikkan granularitas; mengubahnya menyentuh banyak angka tampil.
- **Nol-vendor**: konsisten stance; big.js/decimal.js adalah dependensi baru — timbang serius.

## 7. Existing Solutions

- **`rp()`/`fmt()`** (`AMS`): formatter locale id-ID sudah membulatkan untuk *tampilan* — tapi itu pembulatan presentasi, bukan kebijakan nilai; tak menjamin dua modul menghitung total yang sama sebelum diformat.
- **`jt = Math.round(n/1e6)`** (`canon_base.ts:11`): pembulatan ke juta yang sudah ada — de-facto kebijakan implisit; PRD ini menjadikannya eksplisit & konsisten.
- **Suite uji canon** (`canon_part*.test.ts`, `canon_regression.test.ts`): sudah ada 300+ uji hijau — fondasi untuk menambah lapisan uji tie-out, bukan mulai dari nol.
- **Prisma `Decimal`**: dukungan ORM native → migrasi kolom bila diputuskan tak butuh tooling eksternal.

Tak ada kebijakan tertulis saat ini — inilah gap-nya.

## 8. Proposed Approach

Bertahap, **evidence-first** (audit dulu, putuskan, baru terapkan):

**Fase A — Audit & Kebijakan (tanpa ubah kode produksi)**
1. Inventarisasi seluruh titik aritmetika moneter (grep + telaah) → tabel klasifikasi (§3.2).
2. Tetapkan satuan kanonik & aturan pembulatan → `docs/NUMERIC-POLICY.md`. Rekomendasi awal (untuk didiskusikan): **simpan & ingest dalam Rp penuh; canon hitung dalam Rp penuh (double); bulatkan hanya di boundary tampilan/segel; nilai tersegel & yang di-post dari konektor pakai pembulatan half-up eksplisit.** Tinjau ulang keputusan "juta" `canon_base.ts:11`.

**Fase B — Penegakan**
3. Helper pembulatan terpusat + terapkan di boundary (formatter, seal payload, post konektor). Tidak menyebar pembulatan ad-hoc.
4. Uji golden tie-out lintas-modul → masuk CI (`ci.yml`).

**Fase C — Decimal (kondisional, hanya jika Fase A memutuskan)**
5. Migrasi kolom terpilih `Float`→`Decimal` + migrasi Prisma; verifikasi nilai tampil tak berubah; paritas dev↔prod.
6. Ganti klaim skema yang menyesatkan.

Alasan dipilih dibanding alternatif:
- **Double + disiplin pembulatan** (default) dibanding **Decimal menyeluruh**: mayoritas app akuntansi web memakai double dengan pembulatan boundary yang benar dan aman dalam praktik; Decimal menyeluruh menambah kompleksitas & dependensi/tipe di setiap perhitungan canon (biaya besar untuk solo-builder) dengan manfaat marginal bila boundary sudah disiplin. **Decimal dicadangkan untuk nilai yang di-ingest/di-post** (di sana ketepatan-ke-rupiah paling penting & transformasi paling sedikit).
- **Audit-first** dibanding **langsung refactor**: tanpa inventaris, kita tak tahu titik mana yang benar-benar berisiko → refactor buta = risiko regresi tinggi pada mesin deterministik.

## 9. Risks

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Mengubah satuan/pembulatan menggeser angka tampil yang sudah "dikenal" pengguna | Kebingungan, distrust | Uji snapshot sebelum/sesudah; dokumentasikan setiap perubahan nilai + alasannya; ubah hanya bila salah, bukan sekadar "lebih presisi" |
| `Float`→`Decimal` mengubah hasil di edge case | Regresi senyap | Uji golden mengunci nilai; migrasi kolom di-verifikasi nilai-per-nilai; paritas SQLite↔Postgres diuji |
| Pembulatan tersebar ad-hoc alih-alih terpusat | Inkonsistensi baru | Satu helper kanonik; lint/review menolak `toFixed`/`Math.round` moneter di luar helper |
| Over-engineering (adopsi big-number tak perlu) | Kompleksitas beban solo-builder | Default double; Decimal/library hanya bila inventaris membuktikan kebutuhan konkret |
| Segel lama (W10.5) tak cocok setelah kebijakan pembulatan berubah | Verifikasi segel historis gagal | Kebijakan berlaku maju; segel lama ditandai versi kebijakan; dokumentasikan bahwa perubahan pembulatan = event ber-versi |
| Determinisme rusak oleh locale/urutan | Diagnostik P4 non-deterministik | Helper murni, tanpa locale dalam perhitungan (locale hanya di `fmt()` tampilan) |

## 10. Implementation Plan

- **M1 (Fase A-1)** — Inventaris titik aritmetika moneter → tabel klasifikasi file:line. *DoD: §3.2.*
- **M2 (Fase A-2)** — `docs/NUMERIC-POLICY.md` (satuan + pembulatan + kelas Decimal); keputusan "juta" ditinjau. *DoD: §3.1 + review Ari.*
- **M3 (Fase B-3)** — Helper pembulatan terpusat + terapkan di boundary (formatter/seal/post). *DoD: pembulatan moneter hanya lewat helper.*
- **M4 (Fase B-4)** — Uji golden tie-out lintas-modul → CI. *DoD: §3.3 + §3.4.*
- **M5 (Fase C, kondisional)** — Migrasi `Float`→`Decimal` kolom terpilih + perbaiki klaim skema. *DoD: §3.5 + §3.6.*

Estimasi kasar: M1–M2 ±1 hari (audit + keputusan); M3–M4 ±1–2 hari; M5 (jika diambil) ±1 hari.

Catatan urutan: idealnya **setelah** M4 Deploy-Readiness (`prisma migrate` tersedia) agar M5 memakai jalur migrasi ber-riwayat, bukan `db push`.

## 11. Open Questions

1. **Satuan kanonik**: pertahankan model "Rp juta ter-round" (`canon_base.ts:11`) atau naikkan ke Rp penuh? Rp juta menyederhanakan tampilan tapi membuang presisi sub-juta yang mungkin dituntut kertas kerja formal. → Keputusan mendasar Anda.
2. **Toleransi tie-out**: 0 pada satuan kebijakan (paling ketat) atau ambang kecil untuk perhitungan iteratif (PV/amortisasi)?
3. **Decimal — sejauh mana**: hanya kolom ingest/post (WTB konektor, fee), atau juga nilai tersegel? Timbang ketepatan vs kompleksitas tipe.
4. **Metode pembulatan**: half-up (akuntansi lazim) vs half-even/banker's (mengurangi bias agregat)? Ada preferensi regulasi/SPAP?
5. **Ruang lingkup mundur**: apakah angka historis/segel lama perlu di-*re-baseline* ke kebijakan baru, atau cukup berlaku maju?

---
**Sign-off:** ditandai dengan balasan **"Proceed."**
