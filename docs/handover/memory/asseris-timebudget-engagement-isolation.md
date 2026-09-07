---
name: asseris-timebudget-engagement-isolation
description: "Time & Budget meminjam roster perikatan demo lewat fallback `||` — DIKERJAKAN DUA KALI (2026-08-15 hilang, 2026-08-20 diulang); pola \"fallback = kebocoran isolasi\", tie-out lewat BOBOT bukan jam, plus gotcha ensure-prisma-client yang OK di atas klien basi"
metadata: 
  node_type: memory
  type: project
  originSessionId: 53f2de44-7469-47a1-b09c-20b2dc25931b
  modified: 2026-08-20T13:59:42.653Z
---

**⚠ DIKERJAKAN DUA KALI.** Perbaikan 2026-08-15 (dicatat di memori ini, `npm run verify`
PASSED) **TIDAK PERNAH MENDARAT**. Per 2026-08-20 `git log -- migration/src/view_timebudget.tsx`
berhenti di `a0cab60` (#248 sapuan label a11y); `timebudget_engagement_isolation.test.ts`
tidak ada di pohon mana pun. Cacatnya utuh di baris 46 & 21 seperti semula.
**PELAJARAN: memori yang mencatat "verify PASSED" TIDAK membuktikan kode mendarat.**
Sebelum percaya sebuah perbaikan sudah ada, `git log -- <berkas>` + `ls` berkas ujinya —
lihat [[asseris-sesi-paralel-satu-worktree]]. Klaim "sudah diperbaiki" dari memori tunduk
pada aturan BUKTI SEBELUM KLAIM yang sama seperti klaim "belum ada".

**Cacatnya (empat, satu akar).** `view_timebudget.tsx` berbunyi
`FIRMFIN.engagementWip(timeEntries, e.id) || FIRMFIN.engagementWip(timeEntries, '<id demo>')`.
Hanya perikatan demo punya roster di `WIP_ROSTER_ENG`; **6 dari 7 perikatan tidak**.
TB1 fallback itu · TB2 `TB_ROSTER` konstanta tingkat-modul (kolom "Nilai (std)" jadi Rp 0
sekolom penuh untuk perikatan lain) · TB3 `TB_PHASES` berjumlah 1840 jam = anggaran demo
yang dibekukan (tab Ringkasan membantah tab Anggaran per Fase) · TB4 `TB_WEEKLY` delapan
pasang literal + `Puncak {Math.max(…)} jam (W4)` — angka dihitung, label dipaku.

**Perbaikan 2026-08-20 — commit `9dd1e57`, PR #266 (`fix/timebudget-engagement-isolation`),
CI 9/9 HIJAU termasuk `dependency-audit`.** CI itu sekaligus BUKTI commit berdiri sendiri:
runner meng-checkout cabang saja, tanpa kerja sesi lain yang belum di-commit — sesuatu yang
`npm run verify` lokal TIDAK bisa buktikan di pohon berbagi.
`migration/src/timebudget_model.ts` (murni, 219 baris) + `timebudget_isolation.test.ts`
(20 uji, bebas-`any`). `tbModel()` → `TBModel | null`; `TBNoRoster` menggantikan SELURUH
modul; Export Timesheet disabled. `npm run verify` PASSED (152 berkas/2676 uji frontend;
31/440 backend); ratchet `:any` view_timebudget **62 → 53**.

**Why:** operator `||` membuat "tak punya data" tak dapat dibedakan dari "punya data
orang lain". Ia terbaca seperti default yang sopan, padahal ia adalah kebocoran
lintas-klien yang senyap — kelas cacat yang sama dengan
[[asseris-ar-ap-bridge-falsifiable]] dan [[asseris-cash-bank-recon-register]]:
angka yang tampil meyakinkan di atas dasar yang bukan miliknya.

**How to apply:**
- **ATURAN: fallback ke ID entitas literal = kebocoran isolasi, bukan default.** Grep
  `|| ...'ENG-`, `|| ...'C-0`, `|| ...[0]` sebelum percaya sebuah modul terisolasi.
- **Kalau menemukan satu fallback, cari saudaranya di lingkup-modul** (`const X = FIRMFIN.…['ID-LITERAL']`).
  Di berkas ini ada tiga: fallback + `TB_ROSTER` + `TB_PHASES` yang berjumlah persis anggaran demo.
- **TIE-OUT LEWAT BOBOT, BUKAN JAM.** Pola yang dipakai: ubah literal jam jadi
  `budgetShare`/`openingShare` (pembilangnya SAMA dengan literal lama), lalu
  `tbAllocate(total, shares)` membagi total perikatan aktif. Efeknya (a) total SELALU
  menutup ke SSOT untuk perikatan mana pun, (b) perikatan demo **nol-delta** — dipaku uji
  "profil fase TIDAK berubah". `tbAllocate` memberi sisa ke bagian TERAKHIR (bukan
  membulatkan tiap bagian) supaya jumlahnya eksak, bukan kebetulan pembulatan.
- **Alokasi harus MENYARING ke anggota roster.** `engagementWip` hanya menambahkan jam
  anggota roster ke `actualHrs`; kalau `liveByPhase` tidak menyaring dengan aturan yang
  sama, jumlah fase ≠ total perikatan untuk roster yang tak memuat semua penulis timesheet.
- **Uji harus menyentuh fungsi yang BENAR-BENAR dirender**, dan tie-out >1 perikatan butuh
  **roster sintetis disuntik lewat `wipOf`** (parameter ke-4 `tbModel`) — seed hanya punya
  satu roster, jadi tanpa injeksi gerbang TB3 tak bisa diuji sama sekali.
- **Urutan yang membuat gerbang benar-benar merah:** ekstrak dulu ke `.ts` dengan perilaku
  IDENTIK termasuk cacatnya → tulis uji → jalankan (dapat 11 merah / 9 hijau) → baru perbaiki.
  Tanpa tahap ekstraksi-cacat, "merah sebelum" cuma klaim.
- **Gerbang sumber harus memindai KEDUA berkas** (view + model) — kalau hanya view,
  memindahkan literal ke model membuatnya hijau tanpa memperbaiki apa pun. Uji itu sendiri
  merakit id (`'ENG-' + '2025-014'`) agar tidak menabrak gerbangnya sendiri.

**Sapuan sistemik 2026-08-20 (temuan terpisah, belum diputuskan).** 46 situs literal
`'ENG-20xx-xxx'` di luar `data*`: 2 bootstrap sah (`DEFAULT_ENG_ID`) · 8 tabel data
literal · 10 label-saja (`engLabel = … || '…'`) · **26 pemilihan DATA**. Yang terburuk:
`view_profit.tsx:68` `extraHours = { 'ENG-2025-014': loggedHours − seedLogged }` —
jam timesheet perikatan MANA PUN diatribusikan ke perikatan demo; `view_profit.tsx:29`
tabel realisasi literal per-perikatan; `view_compliance.tsx:347` panel "Konteks Engagement"
menampilkan klien/perikatan/preparer **hardcode tanpa syarat** (bukan fallback — selalu salah);
`view_sa580`/`view_sa720` memakai id fallback sebagai `scopeId` **penulisan lampiran**.

**Konsumen lain sudah benar** — `use_firm_wip.ts:95` & `cockpit_model.ts` menangani `null`
dengan rapi. Jangan generalisasi ke seluruh jalur WIP.

**Commit HANYA berkas arc ini, di pohon yang berbagi dengan sesi lain.** Resepnya:
`git show HEAD:<berkas> > salinan` → tulis versi HEAD+perubahan-saya ke berkas → `git add`
→ kembalikan berkas kerja dari salinan. Index = perubahan saya saja, worktree = keduanya.
Dipakai untuk `eslint-suppressions.json` yang memuat ratchet DUA arc sekaligus
(timebudget 62→53 milik saya, mytasks 61→47 milik sesi lain). Verifikasi sesudahnya:
bandingkan hitungan di worktree vs `git show HEAD:` — commit harus menahan nilai HEAD
untuk berkas yang bukan milik saya.

**Buktikan commit BERDIRI SENDIRI sebelum mengklaimnya.** Pohon kerja memuat perubahan
sesi lain, jadi `verify` hijau TIDAK membuktikan commit saya hijau sendirian. Yang
diperiksa: `git show <base>:contexts.tsx | grep activeClient` (ada) dan diff
`data_part1.ts` sesi lain (hanya menyentuh DEADLINES — bukan ENGAGEMENTS/TIME_ENTRIES/
CLIENTS yang dibaca uji saya).

**Tidak dikerjakan (sengaja):** bobot fase & `pct` & `period` tetap profil tetap —
usulannya di `docs/usulan-TB3-bobot-fase-timebudget.md`, menunggu keputusan Ari.
Rekomendasi saya (C: rencana fase jadi DATA per-perikatan; A sementara) sudah = keadaan
sekarang, jadi "jalankan yang terbaik" TIDAK berarti mengubahnya. Mengisi
`WIP_ROSTER_ENG` untuk perikatan lain DILARANG oleh BATAS prompt — keputusan data Ari.
Ekspor masih `firm: 'KAP Wijaya Hartono & Rekan'` literal (lihat [[asseris-cockpit-tab-segel]]).
Tiga temuan sistemik dilempar sebagai task chip, bukan digabung ke PR ini:
view_profit (jam semua perikatan diatribusikan ke demo) · view_compliance:347 (hardcode
tanpa syarat) · view_sa580/720 (`scopeId` penulisan lampiran).

**GOTCHA KERAS — `ensure-prisma-client` OK di atas klien BASI.** `npm install` di
`server/` menimpa klien Prisma tergenerasi. Langkah pertama `npm run verify` hanya
membandingkan **provider** (`sqlite`), jadi ia mencetak OK; kegagalan sesungguhnya
muncul 3 menit kemudian sebagai **95 uji backend merah + ~60 TS2339** ditambah
`RangeError: Invalid array length` yang menyesatkan. Obatnya `npx prisma generate` di
`server/`. **Jangan percaya baris OK itu setelah install apa pun di `server/`.**

**GOTCHA heredoc:** menulis berkas uji lewat `cat <<'EOF'` di tool Bash GAGAL parse bila
isinya memuat backtick di dalam character class regex (`['"\`]`) — pakai tool Write.
Bandingkan [[asseris-repo-hygiene-2026-08-19]] (backslash lenyap lewat heredoc).

**VERIFIKASI HIDUP MENEMUKAN CACAT YANG NOL UJI TANGKAP.** Saya tak boleh mengetik kata
sandi ke formulir login; Ari login sendiri, lalu barulah terlihat keadaan kosong berbunyi
**"ENG-2025-063 (ENG-2025-063)"** — `activeEngagement` **TIDAK punya `clientName`**, jadi
fallback `e.clientName || e.id` menggandakan id. Cacat yang sama sudah lama ada di berkas
ini: nama berkas ekspor XLSX `${(e as {clientName?:string}).clientName || 'Klien'}` **selalu**
jatuh ke literal 'Klien'. **ATURAN: nama klien hidup di CLIENTS — ambil lewat
`useFirm().activeClient`, jangan dari perikatan.** Gerbang murni (uji model, typecheck,
build) TIDAK BISA menangkap kelas ini; hanya render nyata bisa. Repo tak punya perkakas
render-test (`@testing-library` tidak terpasang) — jadi untuk perubahan yang menambah JSX
baru, **minta Ari login dan lihat layarnya**, jangan mengaku selesai dengan gerbang saja.

**Cara menggeser perikatan di browser (terbukti bekerja):** klik `.top-ctx`, tunggu ~400 ms,
lalu klik `.dropmenu > div` yang cocok — **dalam SATU eval async** (eval terpisah menutup
menunya). Menulis `localStorage` TIDAK bekerja. `dev:all` memakai `vite` tanpa `--port`,
tetapi vite.config sudah memaku 5180. `preview_start {name:'dev-all'}` membuat tab dengan
origin kosong yang menolak `navigate`; pakai `preview_start {url:'http://localhost:5180/'}`
untuk mendapat tab yang bisa dikemudikan.
