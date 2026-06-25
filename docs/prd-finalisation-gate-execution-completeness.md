# PRD — Gerbang Fase →Finalisasi Sadar-Progres Eksekusi (Evaluasi Modul Isu #3)

| Field | Isi |
|---|---|
| Tanggal | 2026-06-25 |
| Pemilik | Ari Widodo |
| Status | Draft |
| Engagement ID terkait | — (perubahan platform Asseris, lintas-engagement) |
| Sumber | Evaluasi modul Asseris, isu #3 ([[asseris-module-evaluation]]) |

---

## 1. Problem

Gerbang transisi fase engagement **→Finalisasi** buta terhadap progres eksekusi prosedur. Di `engagementGate()` ([wp_signoff.tsx:497-502](../migration/src/wp_signoff.tsx)), cabang `nextPhase === 'Finalisasi'` hanya memuat **satu** kriteria: `noHighNotes` (tidak ada catatan review prioritas-tinggi terbuka). Severity `'warn'`.

Akibatnya sebuah engagement bisa berpindah ke **Finalisasi** dengan **eksekusi prosedur 0%** — tidak ada kertas kerja yang dievaluasi, tidak ada bukti dilampirkan, tidak ada kesimpulan auditor (SA 230) dicatat — selama tidak ada catatan review high yang terbuka. Ini bertentangan dengan makna fase Finalisasi (pekerjaan lapangan substantif telah selesai; auditor menyusun opini). Gerbang seharusnya mencerminkan kelengkapan eksekusi, bukan hanya status catatan review.

Data kelengkapan **sudah terukur** dan tersedia dari `wpCompletenessFor()` (`signedPct`, `evidencePct`, `conclusionPct`) — hanya belum dijadikan prasyarat transisi.

## 2. Objective

- Mengikat transisi →Finalisasi ke bukti terukur bahwa pekerjaan lapangan substantif telah dilakukan, menggunakan SSOT kelengkapan WP yang sudah ada — tanpa menambah store/angka baru.
- Mempertahankan filosofi soft-gate P5: gerbang membimbing (warn), override selalu mungkin dengan jejak audit (`logActivity` `gate-override`).
- Menjaga gerbang **→Arsip** (titik lock, severity `'confirm'`) **tidak berubah** — sudah robust (opini final + 100% WP ter-review + 0 catatan + EQR).

## 3. Success Criteria

1. Gerbang →Finalisasi memuat kriteria progres eksekusi berbasis **kesimpulan WP (SA 230)**:
   - **Kesimpulan auditor tercatat** pada **≥ 80%** kertas kerja kunci (`conclusionPct ≥ 80`), **dan**
   - **Tidak ada** kertas kerja yang **sama sekali belum dimulai** (nol bukti **dan** nol kesimpulan), yakni `notStarted === 0`.
2. Kriteria lama `noHighNotes` **dipertahankan** sebagai kriteria ketiga.
3. Severity →Finalisasi **tetap `'warn'`**: bila ada blocker, `<PhaseGateDialog>` muncul sebagai peringatan; auditor dapat melanjutkan (override) dan override tercatat di `logActivity({type:'gate-override'})`. Bila semua terpenuhi, transisi mulus tanpa dialog.
4. Lompatan langsung **Perencanaan → Finalisasi** dievaluasi dengan kriteria yang sama (sudah ditangani oleh logika `toIdx > fromIdx`; diverifikasi, bukan diubah).
5. Logika ambang diekstrak ke **util murni** (`engagement_phase_gate.ts`) + **unit test** (pola `sampling_select.test.ts` / `continuance_engine.test.ts`).
6. `npm run typecheck` = 0 error; `npm run lint` bersih (file `.ts` baru bebas-`any`); seluruh test eksisting tetap hijau + test baru hijau.
7. UI `EngagementGateSummary` / `WpCompletenessRecap` menampilkan kriteria baru dengan tautan "Buka" ke modul WP terkait (reuse mekanisme `view`).

## 4. Scope

1. **Perluas `wpCompletenessFor()`** ([wp_signoff.tsx:365](../migration/src/wp_signoff.tsx)) untuk juga mengembalikan `notStarted` — jumlah ref WP unik dengan **nol bukti terlampir DAN tanpa teks kesimpulan**. Field tambahan; field eksisting tidak berubah (regresi nol pada `WpCompletenessRecap` & gerbang Arsip).
2. **Util murni baru `migration/src/engagement_phase_gate.ts`** — konstanta ambang `FINALISATION_THRESHOLDS` + fungsi `finalisationGateCriteria(input)` yang menerima `{ conclusionPct, notStarted, highOpenCount }` dan mengembalikan array kriteria `{ key, label, met, detail, view }`. Tanpa ketergantungan React/DOM/window → dapat diuji.
3. **Rewire cabang `nextPhase === 'Finalisasi'`** di `engagementGate()` agar memanggil `finalisationGateCriteria(...)` alih-alih menyusun kriteria inline. Severity tetap `'warn'`.
4. **Unit test** `engagement_phase_gate.test.ts` — kunci ambang (79% vs 80% vs 100%), perlakuan `notStarted`, kombinasi dengan `highOpenCount`, dan kasus batas (total = 0).

## 5. Non-Scope

- **Tidak** mengubah gerbang **→Arsip** maupun **→Eksekusi**.
- **Tidak** mengubah severity →Finalisasi menjadi `'confirm'` (keputusan Ari: tetap `'warn'`).
- **Tidak** mengubah metrik menjadi `signedPct`/`evidencePct` (keputusan Ari: pakai `conclusionPct`; review sign-off adalah aktivitas finalisasi, sudah dijaga gerbang Arsip).
- **Tidak** menambah persist/store baru; semua angka turunan dari `wpState` kanonik + store evidence yang ada.
- **Tidak** mengubah `usePhaseGate`/`PhaseGateDialog` selain konsumsi kriteria baru (struktur kriteria tetap sama, jadi kemungkinan besar nol perubahan di sana).

## 6. Constraints

- ESM-only; edit di `migration/src/*`. Gerbang `typecheck`/`lint`/test wajib hijau.
- ESLint `no-explicit-any` ratchet aktif → `engagement_phase_gate.ts` & test-nya **bebas-`any`** (definisikan tipe input/output eksplisit). `wp_signoff.tsx` tetap pola `:any` baseline view/WP.
- SSOT: angka kelengkapan hanya dari `wpCompletenessFor` (yang membaca `wpState` + `amsEvidenceCount`). Tidak ada hardcode.
- Solo; perubahan inkremental, dapat di-review satu PR.

## 7. Existing Solutions

- `wpCompletenessFor()` sudah menghitung `conclusionPct`, `withConclusion`, `evidencePct`, `withEvidence`, dedupe per ref kanonik — tinggal ditambah `notStarted`.
- `engagementGate()` + `EngagementGateSummary` + `usePhaseGate` + `PhaseGateDialog` sudah menyediakan seluruh mesin gerbang (kriteria → blocker → dialog → override + log). Hanya cabang Finalisasi yang perlu diperkaya.
- Pola util-murni + test sudah mapan (`sampling_select.ts`, `continuance_engine.ts`, `portfolio_risk.ts` dengan test masing-masing) → ekstraksi ambang mengikuti pola yang sama.
- Mekanisme tautan `view` per-kriteria ("Buka" → `nav(view)`) sudah ada → kriteria baru cukup menyetel `view: 'wp'` (atau modul berkesimpulan-rendah).

## 8. Proposed Approach

**Definisi "belum dimulai" (notStarted).** Untuk tiap ref WP unik: `att = amsEvidenceCount(mid)`; `hasConclusion = !!(st.conclusion && st.conclusion.text)`. `notStarted` bertambah bila `att === 0 && !hasConclusion`. (Konsisten dengan keputusan Ari: "nol bukti & nol kesimpulan".)

**Util murni:**
```ts
// engagement_phase_gate.ts
export const FINALISATION_THRESHOLDS = { minConclusionPct: 80 } as const;
export interface FinalisationGateInput { conclusionPct: number; notStarted: number; highOpenCount: number; }
export interface GateCriterion { key: string; label: string; met: boolean; detail: string; view?: string; }
export function finalisationGateCriteria(i: FinalisationGateInput): GateCriterion[] { /* 3 kriteria */ }
```
Kriteria yang dihasilkan:
1. `concluded` — `conclusionPct >= 80` · label "Kesimpulan auditor (SA 230) tercatat pada ≥80% kertas kerja" · view `'wp'`.
2. `allStarted` — `notStarted === 0` · label "Tidak ada kertas kerja yang belum dimulai" · view `'wp'`.
3. `noHighNotes` — `highOpenCount === 0` · label & view seperti sekarang (`'cockpit'`).

**Rewire `engagementGate`:** di cabang Finalisasi, `criteria = finalisationGateCriteria({ conclusionPct: recap.conclusionPct, notStarted: recap.notStarted, highOpenCount: highOpen.length })`. `recap` sudah dihitung di fungsi. Severity `'warn'` tak berubah; `blockers`/`allMet` dihitung seperti biasa.

**Alasan dipilih:** memaksimalkan reuse mesin gerbang yang ada, memisahkan logika ambang (murni, teruji) dari rendering (`.tsx`), dan menghormati SSOT — tanpa menyentuh jalur Arsip yang sudah robust.

## 9. Risks

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Ambang 80% terasa mengganggu pada engagement demo (seed conclusion kosong → selalu blocker) | UX: dialog warn muncul rutin saat demo | Severity `'warn'` (bukan lock) → override 1-klik; detail kriteria menjelaskan "X/Y berkesimpulan"; ini perilaku BENAR (memang belum dikerjakan) |
| Perubahan `wpCompletenessFor` tak sengaja menggeser angka gerbang Arsip | Regresi pada lock Arsip | Hanya **menambah** field `notStarted`; `signed/total/signedPct` tak disentuh; test regresi + verifikasi Arsip live |
| Lompatan Perencanaan→Finalisasi tak terjaga | Bypass gerbang | Sudah ditangani `toIdx>fromIdx`; tambah test eksplisit untuk lompatan |
| `:any` merembes ke util baru → gagal ratchet lint | Build merah | Tipe eksplisit di `engagement_phase_gate.ts`; util tak menyentuh React/window |

## 10. Implementation Plan

1. Tambah `notStarted` ke `wpCompletenessFor()` (return field; hitung di loop ref).
2. Buat `migration/src/engagement_phase_gate.ts` (konstanta + tipe + `finalisationGateCriteria`).
3. Rewire cabang Finalisasi di `engagementGate()` untuk memanggil util; impor di `wp_signoff.tsx`.
4. Tulis `engagement_phase_gate.test.ts` (ambang 79/80/100, notStarted, highOpen, total=0, lompatan via engagementGate jika praktis).
5. `npm run typecheck` + `npm run lint` + `npm test` hijau.
6. Verifikasi live (`dev-all`, login Manager): coba transisi →Finalisasi dengan eksekusi rendah → dialog warn muncul memuat 3 kriteria + tautan "Buka"; override jalan & tercatat. Arsip tak berubah.
7. PR: branch `feat/finalisation-gate-execution`, sertakan PRD ini; gate typecheck/lint/test/build.

## 11. Open Questions

Tidak ada yang memblokir — tiga keputusan desain telah ditetapkan Ari (2026-06-25):
- Metrik: **`conclusionPct`** (kesimpulan WP SA 230).
- Ambang: **≥80% berkesimpulan + 0 WP belum-dimulai** (nol bukti & nol kesimpulan).
- Severity: **tetap `'warn'`** (override selalu mungkin, konsisten soft-gate P5).

Catatan kecil (boleh diputus saat implementasi, default diberikan):
1. **Label angka di detail kriteria** — tampilkan "`X/Y berkesimpulan (Z%)`" agar auditor tahu sisa pekerjaan. *Default: ya.*
2. **Tautan "Buka" untuk `concluded`/`allStarted`** — arahkan ke modul `'wp'` (register Kertas Kerja) sebagai titik masuk umum. *Default: `'wp'`.*

---

## 12. Sign-off

Menunggu balasan **"Proceed."** dari Ari sebelum implementasi.
