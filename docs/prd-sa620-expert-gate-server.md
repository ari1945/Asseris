# PRD — Penegakan Server atas Gerbang Pakar SA 620 (pola `guardSignoffWrite`)

| Field | Nilai |
|---|---|
| Status | Implemented — PR-1..PR-3 (#188·#189·#190) merged 2026-08-12; Q1–Q4 terjawab; K1–K12 tertutup. Utang: tinjauan visual Ari |
| Tanggal | 2026-08-12 |
| Arc | Lanjutan arc estimasi terfalsifikasi ([`prd-estimasi-terfalsifikasi.md`](prd-estimasi-terfalsifikasi.md), #182–#187) — menutup utang yang PRD itu catat sendiri di §9a |
| Basis | master `774412a` → **mendarat di `ae490d7`** · 8/8 gerbang hijau · nol PR terbuka |
| Kelas cacat | Gerbang satu-lapis (UI saja) — sama dengan #23 (SoD sign-off), PR-B (overlay persetujuan AJE), PR-6a (memo materialitas) |

---

## 1. Problem

PR-5 arc estimasi (#186) memasang gerbang: kertas kerja SA 540 tidak dapat ditandatangani selama ada estimasi ber-jalur `'Gunakan pakar (SA 620)'` yang pekerjaan pakarnya belum dievaluasi (SA 500 ¶8 · SA 620 ¶9–12) atau laporannya belum tertaut ke bukti.

Gerbang itu hidup **hanya di lapisan UI**. [`estimate_gate.tsx:35`](../migration/src/estimate_gate.tsx:35) menghitung blocker, [`wp_signoff.tsx:235`](../migration/src/wp_signoff.tsx:235) memakainya untuk mem-`disabled` tombol Sign-off. Server tidak tahu apa pun tentang SA 620: [`server/src/signoff.ts:89`](../server/src/signoff.ts:89) mendaftarkan `wpState` di `SIGNOFF_KEYS`, dan `guardSignoffWrite` menegakkan **kapabilitas per-slot** (`WP_CHAIN_CAP`) plus **aturan rantai** (identitas, urutan, self-review, stempel waktu) lewat `wpChainViolations` — tidak satu pun menyangkut pakar.

### Cacat P0 — tanda tangan dapat dibubuhkan dengan melewati UI

`WP_CHAIN_CAP.preparer = CAP.WP_EDIT` ([`signoff.ts:52`](../server/src/signoff.ts:52)), dimiliki setiap auditor. Sebuah panggilan tRPC langsung:

```
state.set({ scope:'engagement', scopeId:'ENG-2025-014', key:'wpState',
            value:{ sa540:{ chain:{ preparer:{ by:'…', byUserId:'…', at:<now>, contentHash:'…' } } } } })
```

lolos seluruh gerbang server — isolasi perikatan, `capForWrite`, `guardSignoffWrite`, aturan rantai — dan menghasilkan kertas kerja SA 540 **bertanda tangan sah, ber-jejak audit hash-chained**, atas estimasi yang bersandar sepenuhnya pada pekerjaan pihak ketiga yang tak pernah dievaluasi. Tombol yang dinonaktifkan bukan gerbang; ia hiasan di atas jalur tulis yang terbuka.

Ini persis kelas cacat yang ditutup #23 untuk sign-off berbasis peran ("UI `can()` adalah kenyamanan; ini yang benar-benar menghentikan tulisan"), lalu PR-B untuk `approvals_ov_v4` ("gerbang UI per-langkah dapat dilewati dengan menulis overlay langsung").

### Cacat P0-b — limb dokumen tidak punya sumber kebenaran server sama sekali

Limb kedua gerbang ("laporan pakar ada di bukti kertas kerja") membaca `amsEvidenceFor('sa540')` → [`evidence.tsx:12`](../migration/src/evidence.tsx:12): `localStorage['ams.v1.evidence']`. **Per-peramban, per-perangkat, tak pernah dikirim ke server.** Konsekuensinya dua arah dan keduanya buruk:

- **Server tak dapat memverifikasinya.** Bahkan bila P0 ditutup untuk limb evaluasi, limb dokumen tetap tak terfalsifikasi di server — dan gerbang hanya sekuat mata rantai terlemahnya.
- **Gerbangnya sendiri sudah salah hari ini.** Laporan pakar yang dilampirkan preparer di laptopnya tidak ada di laptop reviewer → reviewer diblokir atas dokumen yang "ada". Sebaliknya, satu baris karangan di `localStorage` (uid dan hash dibangkitkan klien, lihat `amsAttachEvidence` [`evidence.tsx:27`](../migration/src/evidence.tsx:27)) memuaskan gerbang tanpa satu byte pun dokumen.

Yang ironis: DMS server **sudah ada** — [`attachments/store.ts`](../server/src/attachments/store.ts) menyimpan byte terenkripsi, memverifikasi SHA-256 nyata, menegakkan kuota, mencatat setiap unggah/pencabutan, dan `listAttachments` [`:117`](../server/src/attachments/store.ts:117) sudah memfilter `deletedAt: null`. Yang hilang bukan kapabilitas, melainkan sambungan: SA 540 menautkan ke `uid` localStorage, bukan ke id lampiran server.

### Mengapa ini bukan sekadar kerapian

Kertas kerja SA 540 bertanda tangan adalah masukan gerbang fase (P5), roll-up status WP, dan — lewat SAD — agregasi salah saji yang menentukan rekomendasi opini. Arc #182 baru saja membuktikan seberapa jauh satu angka tak berdasar merambat: pencabutan seed M-04 Rp 680 jt memindahkan perikatan demo dari 106% ke 84% materialitas. Tanda tangan tak berdasar merambat lebih jauh lagi, karena ia adalah **pernyataan kecukupan bukti** yang keluar dari firma.

---

## 2. Objective

Memindahkan gerbang pakar SA 620 dari lapisan UI ke **batas penegakan yang sebenarnya** — `guardSignoffWrite` di server — mengikuti pola yang sudah terbukti tiga kali di repo ini: satu aturan MURNI, dua pemanggil, server otoritatif.

Dan, karena gerbang tak dapat lebih kuat daripada data yang dapat diperiksa server: memindahkan tautan laporan pakar dari `uid` localStorage ke **id lampiran DMS server**, sehingga "dokumen itu ada" adalah fakta yang dapat dibantah, bukan catatan lokal.

**Bukan** membangun modul manajemen pakar (roster, kontrak, evaluasi berulang lintas-perikatan). **Bukan** memindahkan seluruh store bukti localStorage ke server.

---

## 3. Success Criteria (semuanya harus DAPAT GAGAL)

Tiap kriteria disertai keadaan **hari ini**, sehingga keberhasilan tak dapat diklaim tanpa perubahan perilaku nyata. Probe K1, K3–K6 dijalankan sebagai panggilan tRPC **melewati UI** — bila hanya UI yang diuji, kita menguji ulang gerbang yang sudah ada.

| # | Probe | Hari ini | Setelah |
|---|---|---|---|
| K1 | `state.set` langsung: tulis `wpState.sa540.chain.preparer` sebagai Audit Manager, `expertEval.v1` kosong, registri memuat E-04 ber-jalur SA 620 | **200 OK** — WP bertanda tangan | **403 FORBIDDEN** `expert-gate:E-04: Evaluasi SA 500 ¶8 belum tuntas (0/4)` |
| K2 | `grep -rn "canon_expert_eval" server/src` | 0 hasil | ≥ 1 — server memakai **fungsi yang sama** dengan UI, bukan salinannya |
| K3 | Isi 4/4 langkah evaluasi, `docUid` kosong → tulis tanda tangan langsung | 200 OK | 403 `expert-gate:E-04: Laporan pakar belum ditautkan…` |
| K4 | Tautkan laporan pakar (lampiran DMS), **cabut** lampirannya (`attachment.remove`), lalu tulis tanda tangan | 200 OK — tautan putus tak terlihat server | 403 `expert-gate:E-04: Dokumen pakar yang ditautkan tidak lagi ada…` |
| K5 | Gerbang aktif → **cabut** tanda tangan (`unsign`) | 200 OK | tetap **200 OK** — gerbang tak pernah menjebak WP dalam keadaan tertandatangani |
| K6 | Registri hanya berisi estimasi ber-jalur non-620 → tulis tanda tangan | 200 OK | tetap **200 OK** — gerbang tak menyentuh yang bukan urusannya |
| K7 | Suntingan ISI `wpState.sa540` (kesimpulan/prosedur) tanpa perubahan tanda tangan, gerbang aktif | 200 OK | tetap **200 OK**, dan **nol** query saudara dijalankan (gerbang tak membebani tulisan biasa) |
| K8 | Baris `AuditEvent` untuk tulisan tanda tangan sa540 | `signoff[wp:sa540.preparer]` | + penanda `expert-gate` (lulus/absen-registri), sehingga jalur lolos dapat ditelusuri |
| K9 | Bandingkan teks alasan di UI vs pesan 403 server | dua sumber (server tak punya teks) | **identik** — keduanya dari `ExpertGateBlocker.reasons` yang sama |
| K10 | Lampirkan laporan pakar di peramban A, buka perikatan yang sama di peramban B | B melihat 0 dokumen; gerbang memblokir keliru | B melihat dokumen yang sama (DMS server) |
| K11 | `signoffContextNeeds` mengembalikan kebutuhan tetapi router tak memasok konteks | — (belum ada) | guard **melempar** (fail-closed), bukan diam-diam melewatkan gerbang |
| K12 | `npm run verify` (root) | 8/8 hijau | tetap 8/8 hijau |

---

## 4. Scope

1. **Mekanisme `SignoffContext`** — `guardSignoffWrite` tetap MURNI & sinkron; router memasok dokumen saudara + daftar lampiran hidup sebagai argumen. Deklaratif per-key, dengan pra-cek diff agar tulisan biasa tidak menimbulkan query.
2. **Aturan gerbang pakar sebagai modul murni bersama** — di `canon_expert_eval.ts` (tempat `expertGateBlockers` sudah hidup), diimpor server, mengikuti preseden `wp_chain.ts` / `aje_contract.ts` / `aje_approval.ts`.
3. **Penegakan pada `wpState`** — setiap tanda tangan **baru** pada `wpState['sa540'].chain`, keempat slot. Pencabutan tidak digerbang.
4. **Migrasi tautan dokumen** — `ExpertEval.docUid` menunjuk **id lampiran server** (`collection: 'sa540'`, scope perikatan); panel pakar SA 540 mengunggah & memilih dari DMS server.
5. **Jejak audit** — hasil gerbang masuk `signoffDetail`, termasuk kasus "registri tak ada di server" (lihat Q2).
6. **Uji** — unit server atas guard dengan konteks buatan tangan (pola `signoff.test.ts`), unit atas modul murni, dan spek e2e yang menembak `state.set` langsung (bukti K1).

## 5. Non-Scope (dan alasannya — batas ini mengikat)

| Di luar lingkup | Alasan |
|---|---|
| Gerbang kesimpulan **PSAK 68** di server | Rujukan pakarnya (`V-2`, `V-3`) berasal dari `psak68().items[].expert` — **turunan kanon atas WTB**, bukan state. Server harus menjalankan mesin kanon atas WTB perikatan untuk mengetahuinya. Itu kapabilitas lain dan jauh lebih besar. Konsekuensi yang harus diterima sadar: gerbang PSAK 68 **tetap UI-saja** setelah PRD ini. |
| Gerbang **etik/AML** (`useEthicsGate`) di server | Kelas cacat yang sama, permukaan berbeda (memblokir SELURUH sign-off, bukan satu modul). Mekanisme `SignoffContext` yang dibangun di sini adalah prasyaratnya — jadikan PRD sendiri setelahnya. |
| Migrasi seluruh `localStorage['ams.v1.evidence']` ke DMS | Menyentuh `EvidenceControl` di SubBar **setiap** modul. Hanya koleksi `sa540` yang dipindah di sini. Sisanya tetap cacat per-perangkat — dicatat sebagai utang, tidak disamarkan. |
| Ambang "11/11 prosedur" PSAK 68 | Sudah diputuskan & terimplementasi di #183 (Q2 arc lama). |
| Modul manajemen pakar (roster, kontrak, evaluasi lintas-perikatan) | Produk baru, bukan penutupan cacat. |

---

## 6. Constraints

1. **`guardSignoffWrite` tetap murni & sinkron.** Ia diuji unit tanpa DB. Membuatnya `async` + berisi query Prisma akan menular ke seluruh `signoff.test.ts` dan mengawinkan modul aturan dengan lapisan data — persis yang dihindari `wp_chain.ts`.
2. **Satu aturan, dua pemanggil.** Server tidak boleh mengandung salinan logika SA 620. `expertGateBlockers` adalah SSOT-nya. K2 & K9 memaku ini.
3. **Fail-closed pada celah mekanisme.** Bila sebuah key menyatakan butuh konteks dan konteks tak dipasok → lempar (K11). Cermin `if (!cap) throw` pada `AJE_STEP_CAP`.
4. **Isolasi perikatan tidak boleh bocor.** Dokumen saudara & lampiran diambil dengan `scope`/`scopeId` **yang sama** dengan tulisan, sesudah `assertEngagementAccess`. Key saudara berasal dari tabel statis, bukan dari input klien.
5. **Nol biaya pada tulisan biasa.** Sebagian besar tulisan `wpState` adalah suntingan isi. Pra-cek diff murni menentukan perlu-tidaknya query (K7).
6. **Kompatibilitas mundur guard.** Parameter konteks opsional; seluruh pemanggil & uji lama tetap terkompilasi.
7. **`master` selalu hijau (R-7).** Repro cacat yang belum ditutup dikirim sebagai `it.fails()` + `// KARANTINA s/d <tanggal>`, bukan merah.
8. **Ratchet `:any`.** 19 `:any` masih di atas baseline dari commit lintas-platform. `view_sa540.tsx` disentuh PR-2 — satu `any` baru **meng-un-suppress seluruh berkas** (jebakan #178). Sinkronkan lewat `npm run lint:any-baseline` bila perlu.
9. **Skala tipografi (8 ukuran) & token warna semantik** berlaku untuk panel pakar yang disunting.
10. Registri status: perbarui [`PRD-REGISTRY.md`](PRD-REGISTRY.md) saat status berubah.

---

## 7. Existing Solutions (dipakai ulang, bukan dibangun ulang)

| Aset | Lokasi | Dipakai untuk |
|---|---|---|
| `guardSignoffWrite` + `SIGNOFF_KEYS` | [`server/src/signoff.ts:89`](../server/src/signoff.ts:89), [`:136`](../server/src/signoff.ts:136) | rumah gerbang — tak ada titik penegakan baru |
| Pola impor lintas-paket modul murni | `wp_chain.ts` · `aje_contract.ts` · `aje_approval.ts` | preseden server mengimpor `migration/src` |
| `expertGateBlockers` | [`canon_expert_eval.ts:99`](../migration/src/canon_expert_eval.ts:99) | **seluruh** logika SA 620 — sudah murni, teruji (13 uji), tanpa impor apa pun |
| `wpChainViolations` / `WpChainViolation` | [`wp_chain.ts:373`](../migration/src/wp_chain.ts:373) | bentuk pelanggaran & gaya pesan; deteksi "tanda tangan bertambah" sudah ada di sana |
| DMS lampiran | [`attachments/store.ts:117`](../server/src/attachments/store.ts:117) | SHA-256 nyata, terenkripsi, ber-kuota, ber-audit, `deletedAt` → limb dokumen dapat gagal |
| `attachmentUpload` / `attachmentList` | [`migration/src/api.ts:230`](../migration/src/api.ts:230), [`:244`](../migration/src/api.ts:244) | klien DMS sudah ada; panel pakar tinggal memakainya |
| Pola gerbang UI + hint | `estimate_gate.tsx` · `ethics_gate.tsx` | UI tak berubah bentuknya; ia tetap mencegah **sebelum** server menolak |
| `signoffDetail` di router | [`router.ts:925`](../server/src/router.ts:925) | jejak audit metadata-saja (K8) |

---

## 8. Proposed Approach

### 8.1 Konteks sebagai argumen, bukan sebagai query di dalam guard

```ts
/* server/src/signoff.ts */
export interface SignoffContextNeeds {
  siblingKeys: readonly string[];            // ['estimates.v1', 'expertEval.v1']
  attachmentCollections: readonly string[];  // ['sa540']
}
export interface SignoffContext {
  siblings: Record<string, unknown>;
  liveAttachmentIds: Record<string, ReadonlySet<string>>;
}

/** MURNI. Kebutuhan konteks untuk tulisan ini — null bila diff tak menyentuh apa pun yang digerbang. */
export function signoffContextNeeds(key: string, prev: unknown, next: unknown): SignoffContextNeeds | null;

export function guardSignoffWrite(
  actor: SignoffActor, key: string, prev: unknown, next: unknown,
  now?: number, ctx?: SignoffContext,
): SignoffChange[];
```

Router (`state.set`, sesudah `assertEngagementAccess` + `assertCanWrite`):

```
prevValue ──▶ signoffContextNeeds(key, prev, next)
                 │ null → panggil guard tanpa konteks (jalur hari ini, nol query)
                 └ ada  → 1× findMany StateDoc (scope,scopeId,key IN siblingKeys)
                          + 1× listAttachments(scope, scopeId, collection)
                          → guardSignoffWrite(..., ctx)
```

Bila `needs` non-null tetapi `ctx` absen → `guardSignoffWrite` **melempar** `expert-gate:context-missing` (K11). Gerbang yang dapat dilewati dengan lupa memanggil bukan gerbang.

### 8.2 Aturan sebagai satu fungsi murni, dipakai dua sisi

Ditambahkan ke `canon_expert_eval.ts` (tanpa impor — tetap dapat diimpor server):

```ts
export interface ExpertGateViolation { code: 'expert-gate'; ref: string; slot: string; estimateId: string; message: string }

/** Tanda tangan BARU pada ref yang digerbang, sementara ada blocker SA 620. */
export function expertGateSignatureViolations(input: {
  prev: unknown; next: unknown;
  estimates: ExpertGateBearer[] | null | undefined;
  expertEval: ExpertEvalState | null | undefined;
  liveDocIds: readonly string[] | null | undefined;
  gatedRefs?: ReadonlySet<string>;   // default: {'sa540'}
}): ExpertGateViolation[];
```

Isinya: diff rantai (tanda tangan **bertambah**, tidak dicabut) × `expertGateBlockers(...)` yang sudah ada. UI tetap memanggil `expertGateBlockers` lewat `useEstimateExpertGate` — teks alasan tunggal, jadi K9 benar **secara konstruksi**, bukan lewat disiplin.

`guardSignoffWrite`, cabang `wpState`, sesudah kapabilitas & `wpChainViolations`:

```ts
for (const v of expertGateSignatureViolations({ prev, next, estimates, expertEval, liveDocIds })) {
  throw new TRPCError({ code: 'FORBIDDEN', message: `${v.code}:${v.estimateId}: ${v.message}` });
}
```

Ini **ATURAN, bukan otoritas** — dalam taksonomi yang sudah dipakai berkas itu (`posted-immutable:*`, `signature-*`): tak ada kapabilitas yang memuaskannya, Rekan Pemimpin sekalipun. Alasannya bukan hierarki melainkan fakta: tidak ada peran yang membuat pekerjaan pakar yang tak dievaluasi menjadi bukti yang cukup.

### 8.3 Tautan dokumen → DMS server

`ExpertEval.docUid` berubah maknanya dari uid localStorage menjadi **id lampiran server**. Panel "Penggunaan Pakar" di [`view_sa540.tsx:543`](../migration/src/view_sa540.tsx:543) memperoleh unggah + pilih dari `attachment.list({ scope:'engagement', scopeId, collection:'sa540' })`. `EvidenceControl` global di SubBar **tidak** disentuh (Non-Scope) — konsekuensinya panel pakar untuk sementara punya jalur unggahnya sendiri, dan itu disengaja: ia satu-satunya yang menuntut dokumen ber-hash server.

Urutan pengiriman mengikat: **identifier lebih dulu (PR-2), penegakan limb dokumen sesudahnya (PR-3)**. Terbalik = setiap tanda tangan SA 540 gagal pada hari deploy.

---

## 9. Risks

| # | Risiko | Dampak | Mitigasi |
|---|---|---|---|
| R1 | Urutan deploy terbalik (penegakan sebelum migrasi identifier) | seluruh sign-off SA 540 tertolak 403 | PR-1 hanya limb evaluasi; limb dokumen menyala di PR-3 sesudah PR-2 |
| R2 | `docUid` warisan (uid localStorage) tak resolve ke lampiran | tim harus mengunggah ulang laporan pakar | keputusan sadar — lihat **Q1**; pesan penolakan menyebut tindakan persis yang dituntut |
| R3 | `estimates.v1` belum pernah tersimpan di server → gerbang menguap | bypass senyap: "jangan simpan registri, gerbang hilang" | lihat **Q2**; minimal penanda jejak audit + banner UI, agar jalur lolos **terlihat** |
| R4 | Query saudara pada setiap tulisan `wpState` | latensi + beban DB pada modul tersibuk | pra-cek diff murni (K7); 1 `findMany` + 1 `listAttachments`, hanya saat tanda tangan bertambah |
| R5 | Impor lintas-paket menyeret React ke bundel server | build server gagal | `canon_expert_eval.ts` **nol impor** (sudah diverifikasi); server mengimpor modul kanon, BUKAN `estimate_gate.tsx` |
| R6 | Menyentuh `view_sa540.tsx` meng-un-suppress `:any` seluruh berkas | lint merah beruntun (jebakan #178) | perubahan seminimal mungkin; `npm run lint:any-baseline`; hindari `as any` yang tersalin ke dua cabang JSX (jebakan #182) |
| R7 | Uji lama memaku perilaku yang kini salah | "hijau" di atas gerbang yang bocor — pola #176/#177 | audit `server/src/__tests__/signoff.test.ts` & `canon_expert_eval.test.ts` **sebelum** menulis kode; uji yang memaku bypass diperbaiki, bukan di-skip |
| R8 | Gerbang memblokir perikatan berjalan yang sudah ditandatangani | tim tertahan | gerbang hanya pada tanda tangan **baru**; yang sudah ada tidak digugurkan (pola `legacy` `wp_chain`) |
| R9 | Kuota/ukuran lampiran menolak laporan pakar besar (KJPP kerap > 10 MB) | gerbang tak dapat dipuaskan | verifikasi `MAX_FILE_BYTES`/`MAX_SCOPE_BYTES` terhadap ukuran laporan nyata **sebelum** PR-3; naikkan bila perlu, atau tolak dengan pesan yang menyebut batasnya |

---

## 10. Implementation Plan

| PR | Isi | Probe |
|---|---|---|
| **PR-1** | `SignoffContextNeeds`/`SignoffContext` + pra-cek diff + `expertGateSignatureViolations` + penegakan **limb evaluasi** + penanda jejak audit + uji unit server | K1, K2, K5, K6, K7, K8, K9, K11, K12 |
| **PR-2** | `docUid` → id lampiran DMS: panel pakar SA 540 unggah/pilih via `attachment.*`; normalizer & penandaan nilai warisan | K10, K12 (+ tinjauan visual Ari atas panel pakar) |
| **PR-3** | Nyalakan **limb dokumen** di server (`liveAttachmentIds`) + spek e2e yang menembak `state.set` langsung | K3, K4, K12 |

Tiap PR: `npm run verify` hijau **dan verifikasi hidup** atas probe yang relevan — pola yang menangkap #175/#178 ketika 1.128 uji melewatkannya. Untuk PRD ini "hidup" berarti khusus: **panggilan tRPC yang melewati UI**, karena justru itu permukaan yang sedang ditutup.

---

## 10a. Hasil pelaksanaan PR-1 (2026-08-12)

`npm run verify` 8/8 hijau. Uji server 385 → **391**; uji `canon_expert_eval` 13 → **33**.

**Falsifiabilitas dibuktikan, bukan diasumsikan.** Gerbang disabotase sementara
(`signoffContextNeeds` dipaksa `null`): **12 uji gagal**, termasuk ketiga probe tRPC
(K1, K8, Q2). Uji yang ditulis berbarengan dengan kodenya tidak otomatis dapat gagal —
ini diperiksa, lalu sabotasenya dikembalikan.

**Verifikasi hidup** pada ENG-2025-014 (PT Sentosa Makmur Tbk), sesi Audit Manager nyata,
lewat `fetch('/trpc/…')` dari konteks halaman — **melewati UI sepenuhnya**, yakni permukaan
yang justru sedang ditutup:

| Probe | Hasil |
|---|---|
| K1 — tanda tangan sa540 saat E-04 0/4 | **403** `expert-gate:E-04: Liabilitas Imbalan Kerja (PSAK 24) — Evaluasi SA 500 ¶8 belum tuntas (0/4)`; `wpState` tetap v13 (tak ada tulisan) |
| Jalur sah — evaluasi dilengkapi 4/4, tanda tangan yang SAMA | **200**, v13 → v14 |
| K5 — evaluasi dicabut lagi, lalu tanda tangan dicabut | **200** — gerbang tak menjebak WP |
| K8 — baris jejak audit | `v13->v14 signoff[wp:sa540.preparer,expert-gate:pass]` |

Keadaan perikatan dipulihkan seperti semula (E-04 kembali 0/4, rantai sa540 kosong);
jejak audit tentu tetap ada — ia append-only, dan memang seharusnya begitu.

**Temuan yang hanya muncul lewat verifikasi hidup.** Banner `serverBlind` (Q2) yang
semula dikondisikan `serverBlind && !blocked` **tak pernah dapat muncul**: `EST_SEED`
selalu memuat E-04 berjalur SA 620, sehingga setiap perikatan yang registrinya belum
tersimpan pasti `blocked` — persis populasi yang banner itu tuju. Seluruh uji lolos di
atas surface yang mati. Syaratnya diperbaiki menjadi tanpa-kondisi, dan kemunculannya
diverifikasi pada ENG-2025-022 (registri server `version 0`).

**Dua hal yang ditemukan tetapi TIDAK diperbaiki di sini** (di luar lingkup PR-1,
dicatat agar tak hilang):

1. **`useAmsPersist` tidak reaktif lintas-instansi.** Dua komponen yang membaca kunci
   yang sama tidak saling memperbarui sampai remount — terlihat saat mengubah jalur
   respons E-04 di tabel sementara panel sign-off masih menampilkan keadaan lama.
   Kelas yang sama dengan siasat `[tab]` pada `evidenceDocs` di `view_sa540.tsx`.
2. **`serverBlind` berumur mount.** Sesudah registri disimpan pertama kali, banner dapat
   bertahan basi sampai remount. Query-ulang saat registri berubah justru lebih buruk
   (tulisan di-debounce 400 ms → besar kemungkinan membaca `version 0` lalu tak pernah
   memeriksa lagi). Dibiarkan sadar, bukan luput.

**Utang PR-1:** tinjauan visual Ari atas dua banner sign-off SA 540 belum dilakukan.

---

## 10b. Hasil pelaksanaan PR-2 (2026-08-12)

`npm run verify` 8/8 hijau; uji `canon_expert_eval` 33 → **42**.

**R9 diperiksa lebih dulu, sesuai janji.** Batas DMS: **10 MB/berkas, 50 MB/perikatan**
([`attachments/store.ts:11`](../server/src/attachments/store.ts:11)), ditetapkan sadar di PRD
lain (§11 Q2) — jadi bukan angka yang boleh saya ubah diam-diam. Laporan aktuaria PSAK 24
(kasus E-04) lazimnya 1–5 MB dan aman; **laporan penilaian KJPP yang berfoto rutin melampaui
10 MB**, dan kuota 50 MB per perikatan akan menjadi pengikat begitu lebih banyak bukti pindah
ke DMS. Yang dapat dikendalikan di PR ini sudah dikerjakan: penolakan server **ditampilkan
apa adanya** kepada auditor, bukan ditelan. Keputusan menaikkan batas diserahkan ke Ari
(lihat §12).

**Temuan yang tidak diantisipasi PRD.** `attachmentUpload`/`attachmentList` di `api.ts`
**belum punya satu pun konsumen** dari view mana pun; satu-satunya pemakai DMS adalah
`view_dms.tsx` lewat global `window.amsAttachmentUpload`, dan itu **firm-scope**
(`collection:'dms'`). Jadi PR-2 adalah konsumen pertama DMS ber-scope PERIKATAN. Klaim
"DMS sudah ada" di §1 benar di tingkat server/API, dan lebih tipis dari yang tersirat di
tingkat aplikasi.

**Keputusan pelaksanaan (di luar §8):**

- `isLegacyDocUid` diletakkan di modul MURNI `canon_expert_eval.ts`, bukan di `expert_docs.tsx`,
  karena PR-3 di server membutuhkan predikat yang sama untuk menolak dengan sebab yang TEPAT.
- Tautan **warisan** dibedakan dari tautan **dicabut**. Keduanya tak resolve, tetapi tindakan
  yang dituntut berbeda; pesan yang menyuruh auditor menelusuri dokumen yang tak pernah ada
  di server membuang waktunya.
- Galat unggah **dikembalikan, tidak ditelan** — kebalikan `view_dms.tsx` yang `catch {}`
  lalu tetap membuat catatan. Kode mesin (`bad-type:`) dilucuti dari pesan yang dibaca auditor.
- Limb dokumen di UI hanya ditegakkan bila daftar DMS **benar-benar sampai** (`ready`).
  Menyimpulkan "tak ada dokumen" saat server tak terjangkau akan memblokir seluruh sign-off
  SA 540 setiap kali jaringan putus — kegagalan lebih besar daripada yang dicegahnya.
- Penghitung bukti kertas kerja masih membaca store lokal, jadi unggahan juga menulis catatan
  `amsAttachEvidence` agar panel "0 terlampir" tidak berbohong. Catatan itu **bukan** sumber
  gerbang.

**Verifikasi hidup** di ENG-2025-014 (unggahan NYATA lewat `<input type=file>` aplikasi,
bukan panggilan API):

| Probe | Hasil |
|---|---|
| Unggah `Laporan Aktuaria PSAK 24 - FY2025.pdf` | tersimpan di DMS perikatan, `collection:'sa540'`, `refId:'E-04'`, SHA-256 dihitung SERVER; `docUid` = UUID lampiran (bukan `ev-…`) |
| Unggah `malware.exe` | ditolak & **terlihat**: "Unggahan ditolak: jenis berkas tak diizinkan: .exe" |
| `attachment.remove` lampiran yang tertaut | gerbang langsung melaporkan "tidak lagi ada di DMS perikatan (dicabut)" — atas fakta SERVER, bukan localStorage |
| `docUid` warisan (`ev-…`) ditanam | kedua permukaan menampilkan pesan warisan + tindakan yang dituntut |

Keadaan perikatan dipulihkan (E-04 tanpa `docUid`, nol lampiran hidup).

**Utang PR-2:** tinjauan visual Ari atas panel "Penggunaan Pakar" yang berubah.

---

## 10c. Hasil pelaksanaan PR-3 (2026-08-12)

`npm run verify` 8/8 hijau. Uji server 391 → **397**.

Limb dokumen dinyalakan: `signoffContextNeeds` kini meminta koleksi lampiran `sa540`,
`loadSignoffContext` membaca DMS lewat `listAttachments` (yang menyaring `deletedAt`), dan
`requireDocument` menjadi `true` di server. Keputusan **Q1 terpasang tanpa grandfathering**:
tautan warisan ditolak dengan sebabnya sendiri — "unggah ulang", bukan "dokumen tak
ditemukan", karena tindakan yang dituntut berbeda.

Spek e2e baru [`08-sa620-expert-gate.spec.ts`](../e2e/tests/08-sa620-expert-gate.spec.ts)
menembak `state.set` **tanpa menyentuh UI sama sekali**.

### Dua cacat UJI yang ditemukan probe hidup, bukan oleh suite

**1. Assertion penolakan yang VAKUM.** `expect(p).rejects.toMatchObject({ code, message })`
tidak pernah memeriksa `message`: properti itu **non-enumerable** pada `Error`. Dibuktikan
dengan menyetel regex ke `/PROBE-SENGAJA-SALAH/` — uji tetap **lulus**. Pola ini dipakai di
seluruh `signoff_integration.test.ts`, termasuk uji-uji yang sudah ada sebelum arc ini.
Diganti helper `expectRejected(p, code, message)` yang memeriksa keduanya secara eksplisit
dan gagal bila tulisannya justru berhasil. Setelah dikonversi, seluruh assertian lama tetap
lulus — jadi substansinya benar; yang salah adalah bahwa ia tak pernah benar-benar diuji.

**2. Uji K4 ditolak oleh aturan yang SALAH.** Ia menandatangani `preparer` lalu `reviewer`
dengan aktor yang sama, sehingga ditolak `signature-self-review` (ISQM 2) **sebelum** gerbang
pakar sempat bicara — uji yang lulus tanpa pernah menguji hal yang diklaimnya. Tertutup rapat
oleh cacat (1). Diperbaiki dengan mencabut tanda tangan lebih dulu lalu mencoba slot yang
SAMA. Jebakan yang sama sudah ada di spek e2e yang saya tulis dan ikut diperbaiki sebelum
dikirim.

### Verifikasi hidup (ENG-2025-014, tRPC melewati UI)

| Probe | Hasil |
|---|---|
| K3 — evaluasi 4/4, dokumen tak ditautkan | **403** `… Laporan pakar belum ditautkan dari DMS perikatan` |
| Q1 — `docUid` warisan `ev-…` | **403** `… Tautan warisan … unggah ulang laporan pakar ke DMS perikatan` |
| Dokumen HIDUP di DMS → tanda tangan | **200** |
| K5 — cabut tanda tangan saat dokumen sudah dicabut | **200** — gerbang tak menjebak WP |
| K4 — tanda tangan BARU sesudah dokumen dicabut | **403** `… tidak lagi ada di DMS perikatan (dicabut)` |

Keadaan perikatan dipulihkan (E-04 0/4, tanpa `docUid`, rantai kosong, nol lampiran hidup).

**Batas jujur (ditutup di CI):** spek e2e tak dapat dijalankan di mesin ini — Postgres/Docker
tak tersedia — sehingga kebenarannya semula hanya diperiksa terhadap tanda tangan helper &
skema `attachment.upload`, plus perbaikan jebakan self-review dari probe hidup. **Job
Playwright pada [PR #190](https://github.com/ari1945/Asseris/pull/190) kemudian menjalankannya
di atas Postgres nyata dan HIJAU** — validasi itu kini nyata, bukan diasumsikan.

**Utang PR-3:** tinjauan visual Ari belum dilakukan untuk keseluruhan arc.

---

## 11. Open Questions — SEMUA TERJAWAB

> Ari menjawab ketiganya (2026-08-12) sesuai rekomendasi: **Q1 = blokir tanpa
> grandfathering · Q2 = fail-open + terlihat di jejak audit · Q3 = keempat slot.**
> Konsekuensi yang mengikat pelaksanaan:
>
> - **Q1** — PR-3 menolak `docUid` yang tak resolve ke lampiran DMS hidup, tanpa
>   pengecualian. Pesan penolakan WAJIB menyebut tindakan persis yang dituntut
>   ("unggah laporan pakar ke bukti kertas kerja, lalu tautkan ulang") — gerbang yang
>   menolak tanpa memberi jalan keluar akan diakali, bukan dipatuhi. Migrasi PR-2 karena
>   itu wajib mendarat & terverifikasi hidup **sebelum** PR-3 dikirim (R1).
> - **Q2** — jalur lolos "registri belum tersimpan" TETAP ADA secara sadar. Ia harus
>   terlihat di **dua** tempat, bukan satu: penanda `expert-gate:no-register` pada
>   `AuditEvent`, DAN banner di kertas kerja SA 540. Bila hanya jejak audit yang
>   ditandai, celahnya tetap tak terlihat oleh orang yang sedang menandatangani.
>   Probe K8 diperluas: penanda muncul pada kasus absen-registri, bukan hanya pada
>   kasus lolos-gerbang.
> - **Q3** — `gatedRefs` mencakup keempat slot; `expertGateSignatureViolations` tidak
>   menyaring per-slot. Uji unit wajib memuat kasus **eqr** menandatangani di atas
>   evaluasi kosong (slot terjauh dari preparer — yang paling mudah luput bila
>   diff rantai keliru ditulis hanya untuk slot pertama).
>
> Q3 juga menyederhanakan K5: karena seluruh slot digerbang, aturan "pencabutan tak
> pernah digerbang" berlaku seragam — tak ada slot yang perlu perlakuan khusus.

## 12. Pertanyaan BARU dari pelaksanaan — TERJAWAB

> **Ari 2026-08-12: naikkan batas berkas untuk SA 540.** Terimplementasi & terverifikasi
> hidup sebagai bagian PR-3.
>
> **Yang dikerjakan:** batas per-berkas menjadi PER-KOLEKSI (`COLLECTION_MAX_FILE_BYTES`);
> `sa540` = **20 MB**, koleksi lain tetap 10 MB. Kenaikannya tidak bocor ke mana pun.
>
> **Ketergantungan yang muncul saat dikerjakan, dan mengapa 20 MB bukan 40 MB.** Unggahan
> dikirim base64 (+33%), jadi batas berkas terikat `MAX_REQUEST_BODY_BYTES`. Pada 16 MB,
> berkas 15 MB pun tertolak **413 sebelum pengecekan ukuran sempat bicara** — batas yang
> tampak naik tetapi tak dapat dipakai. Amplop HTTP karenanya dinaikkan 16 → **32 MB**,
> yakni PLAFON yang memang sudah disanksikan tripwire Tahap 3
> (`stage3_deployment_blockers.test.ts` menuntut `≤ 32 MB`): batas ini bergerak DI DALAM
> amplop yang ditetapkan pengerasan sebelumnya, bukan melonggarkannya. Melewati 20 MB
> menuntut plafon itu sendiri dinaikkan — keputusan pengerasan tersendiri, bukan efek
> samping PRD ini. Invarian tripwire diubah agar memakai berkas TERBESAR yang dapat
> diterima koleksi mana pun, sehingga kenaikan koleksi berikutnya tak dapat lagi
> menyelinap melewati amplop HTTP secara diam-diam.
>
> **Yang TIDAK diubah:** kuota agregat 50 MB/perikatan. Dengan berkas 20 MB ia masih
> memuat dua laporan pakar; menaikkannya adalah keputusan biaya penyimpanan yang belum
> ada pemicunya.
>
> **Terverifikasi hidup:** `sa540` 15 MB → **200** (sebelumnya mustahil, dua batas
> sekaligus menghalanginya) · `dms` 15 MB → **400** `batas 10 MB` (tak bocor) ·
> `sa540` 21 MB → **400** `batas 20 MB` (masih berbatas).

**Q4 — Batas ukuran DMS (mengunci kelayakan gerbang di dunia nyata).** 10 MB/berkas & 50 MB/perikatan ditetapkan di PRD lain. Laporan KJPP berfoto rutin melampaui 10 MB; bila itu terjadi, gerbang PR-3 menjadi **tak dapat dipuaskan** dan tim akan mencari jalan memutar. Pilihan: (a) biarkan, tangani per kasus; (b) naikkan batas per-berkas untuk `collection:'sa540'` saja; (c) naikkan batas global. Rekomendasi saya: **(b)** — ia menyelesaikan kasus yang menghalangi tanpa melonggarkan penyimpanan firma secara umum. Butuh keputusan Anda sebelum PR-3 dianggap tuntas.

---

**Q1 — Nasib `docUid` warisan saat limb dokumen menyala (mengunci PR-3).**
Nilai `docUid` yang ada hari ini menunjuk uid localStorage; ia tak akan resolve ke lampiran server mana pun.
*Rekomendasi saya: **blokir, tanpa grandfathering**.* Berbeda dengan tanda tangan warisan di `wp_chain` (fakta historis yang tak dapat diulang, karena itu ditandai `legacy` alih-alih digugurkan), menautkan ulang dokumen itu **murah dan justru merupakan tujuan gerbangnya** — mengunggah laporan pakar ke DMS ber-hash adalah pekerjaan yang memang harus dilakukan. Mentolerirnya berarti memelihara bypass selamanya.
Konsekuensi yang harus Anda terima secara sadar: pada perikatan yang sudah menautkan dokumen secara lokal, sign-off SA 540 tertahan sampai laporan pakar diunggah ulang. Setuju?

**Q2 — Perilaku saat `estimates.v1` tidak ada di server (mengunci PR-1).**
Registri hanya tersimpan setelah seseorang menyuntingnya. Tanpa dokumen itu, tak ada estimasi ber-jalur SA 620 yang terlihat server → gerbang lolos.
- (a) **Fail-open + terlihat** — izinkan, tandai `expert-gate:no-register` di jejak audit, dan tampilkan banner di kertas kerja. *Rekomendasi saya.* Ia jujur: server menegakkan sejauh state server, dan celahnya tercatat, bukan tersembunyi.
- (b) **Fail-closed** — tolak setiap tanda tangan SA 540 tanpa registri tersimpan. Lebih kuat, tetapi memblokir perikatan yang sah-sah saja tak punya estimasi, sampai seseorang menyentuh modulnya.
- (c) **Seed sisi server** — server menganggap registri absen = `EST_SEED`. Mengawinkan server dengan seed klien; preseden `data_wtb_eng.ts` ada, tetapi seed estimasi adalah data demo, bukan data perikatan.

**Q3 — Cakupan slot yang digerbang (mengunci PR-1).**
*Rekomendasi saya: keempat slot* (preparer, reviewer, partner, eqr). Menggerbang preparer saja akan aneh secara terbalik: telaah Rekan atau EQR atas kertas kerja yang bergantung pada pakar tak-terevaluasi adalah pernyataan yang **lebih** berat, bukan lebih ringan. Alternatifnya (preparer saja) hanya lebih ramah alur kerja bila tim terbiasa menandatangani lebih dulu dan melengkapi bukti kemudian — kebiasaan yang justru ingin dihentikan gerbang ini.
