---
name: asseris-sa620-expert-gate-server
description: "Arc gerbang pakar SA 620 server-side — PR-1 TERKIRIM (PR #188, CI 8/8 hijau); PR-2 & PR-3 belum"
metadata: 
  node_type: memory
  type: project
  originSessionId: 5f032ca0-53c4-4158-b32b-77de205fd06c
  modified: 2026-08-12T12:30:45.561Z
---

Lanjutan [[asseris-estimasi-terfalsifikasi-arc]]. PRD `docs/prd-sa620-expert-gate-server.md`,
status **In Progress**. Ari "Proceed." 2026-08-12. Q1 = blokir `docUid` warisan tanpa
grandfathering · Q2 = fail-open + penanda `expert-gate:no-register` di AuditEvent DAN
banner UI · Q3 = keempat slot rantai digerbang.

**TUNTAS & MERGED 2026-08-12.** PR-1 [#188](https://github.com/ari1945/Asseris/pull/188) ·
PR-2 [#189](https://github.com/ari1945/Asseris/pull/189) · PR-3 [#190](https://github.com/ari1945/Asseris/pull/190)
· docs [#191](https://github.com/ari1945/Asseris/pull/191). Master `1c47f4a`, **nol PR terbuka**,
CI 4/4 hijau, uji server 400. Status PRD: **Implemented**.

**Q4 dijawab Ari (naikkan berkas SA540) & terimplementasi:** batas per-berkas jadi PER-KOLEKSI
(`COLLECTION_MAX_FILE_BYTES`), `sa540` = 20 MB, koleksi lain tetap 10 MB. **GOTCHA yang hampir
membuat kenaikan itu sia-sia:** unggahan dikirim base64 (+33%), jadi batas berkas TERIKAT
`MAX_REQUEST_BODY_BYTES` — pada 16 MB, berkas 15 MB ditolak 413 sebelum pengecekan ukuran sempat
bicara. Amplop dinaikkan 16→32 MB (plafon yang SUDAH disanksikan tripwire Tahap 3, jadi bukan
pelonggaran baru); itulah sebabnya 20 MB, bukan 40 MB. Tripwire diubah memakai `LARGEST_FILE_BYTES`
agar kenaikan koleksi berikutnya tak dapat menyelinap melewati amplop HTTP.

**Resep rebase PR bertumpuk (dipakai 2× di sini, mulus):** `git rebase --onto origin/master
<branch-basis-lama>` → `grep -rc "^<<<<<<< "` → `npm run verify` → `git push -qf` → `gh pr edit N
--base master`. **GOTCHA: force-push TIDAK memicu CI ulang** — `gh pr checks` melaporkan "no checks
reported". Picu dengan `gh pr close N && gh pr reopen N` (event `reopened`), lalu tunggu & verifikasi
`headSha` run cocok dengan HEAD sebelum merge.

**Temuan awal yang mengubah bentuk arc:** limb "laporan pakar ada di bukti" membaca
`localStorage['ams.v1.evidence']` — per-perangkat, tak pernah sampai server. Memindahkan
gerbang saja tidak cukup.

**Arsitektur (terbukti hidup):** `guardSignoffWrite` tetap MURNI & sinkron; pra-cek diff
murni `signoffContextNeeds()` menentukan perlu-tidaknya query, router memuat lewat
`loadSignoffContext` (`server/src/signoffContext.ts`), guard menerimanya sebagai argumen
ke-6. Kebutuhan dinyatakan tapi konteks absen → guard MELEMPAR (fail-closed). Aturan hidup
di `canon_expert_eval.ts` (kini mengimpor `wpSigKey` dari `wp_chain`), dipakai UI & server.

**GOTCHA yang memakan waktu:**
1. **Uji integrasi server: JANGAN pakai reset + scopeId sama.** Kunci dedupe outbox audit
   = `statedoc:<scope>:<scopeId>:<key>:v<versi>`; audit APPEND-ONLY (trigger DB). Menghapus
   StateDoc lalu menulis ulang v1 → unique violation → router melaporkannya sebagai
   `version-mismatch:server=0` (router MENGABAIKAN `e.message` dan menghitung ulang prefiks,
   jadi pesannya menyesatkan). Solusi: perikatan BERBEDA per uji.
2. **`React.useState<T>` = TS2347** di repo ini (tak ada @types/react). Pakai `as` di titik
   kembali, pola `contexts.tsx`.
3. **`useAmsPersist` TIDAK reaktif lintas-instansi** — dua komponen membaca kunci sama tidak
   saling memperbarui sampai remount. Belum diperbaiki (di luar lingkup).

**PELAJARAN TERKUAT — ASSERTION VAKUM (SUDAH DISAPU & DIJAGA, [#192](https://github.com/ari1945/Asseris/pull/192)):**
`expect(x).toMatchObject({ prop: /regex/ })` **SELALU lolos**, cocok maupun tidak.
KOREKSI atas catatan awal saya: sebabnya BUKAN "message non-enumerable pada Error" — itu
salah. Yang vakum adalah **RegExp telanjang di dalam `toMatchObject`**, untuk properti APA PUN
pada objek APA PUN. Dipetakan lewat probe: `'string'` ·`expect.stringMatching(/re/)` ·
`toEqual`/`objectContaining`/`toHaveProperty` dgn regex · `rejects.toThrow(/re/)` — semuanya
MENEGAKKAN; hanya regex telanjang di `toMatchObject` yang tidak.
Sapuan 506 berkas → nol situs tersisa. Dijaga tripwire
`server/src/__tests__/assertion_hygiene.test.ts` (ikut `npm run verify` + CI).
**Kenapa bukan ESLint: `npm run lint` HANYA berjalan atas `migration/src` — `server/` & `e2e/`
tak dilint sama sekali.** Ingat ini untuk gerbang kualitas lain juga.

Tertutupi cacat itu: uji K4 saya ditolak `signature-self-review` (ISQM 2), BUKAN oleh gerbang
pakar — preparer lalu reviewer oleh aktor yang sama. Uji lulus tanpa menguji klaimnya. Kalau
menguji gerbang pada slot rantai, JANGAN pakai slot kedua dengan aktor yang sama; cabut tanda
tangan dulu lalu coba slot yang SAMA.

**Pelajaran lain:** banner `serverBlind` (Q2) dikondisikan `serverBlind && !blocked`
→ **tak pernah dapat muncul**, karena `EST_SEED` selalu memuat E-04 berjalur SA 620 sehingga
tiap perikatan tanpa registri tersimpan pasti `blocked` — persis populasi yang ia tuju.
33 uji frontend + 391 uji server LOLOS SEMUA di atas surface yang mati; hanya verifikasi
hidup yang menangkapnya. Juga: sabotase sementara atas gerbang (paksa `signoffContextNeeds`
→ `null`) membuat 12 uji gagal — biasakan membuktikan uji DAPAT gagal, jangan diasumsikan.

**Resep verifikasi hidup melewati UI** (dipakai untuk K1/K5/K8, jauh lebih cepat daripada curl):
`preview_start {name:'dev-all'}` → di konsol halaman `fetch('/trpc/auth.login',…)` (RELATIF —
:5181 langsung kena CORS; Vite mem-proxy), akun `anindya.p@whr-cpa.id` / `Manager#2025!`,
lalu `fetch('/trpc/state.set',…)`. Ganti perikatan aktif lewat
`localStorage['ams.v1.user.<userId>.activeEng']` + reload.

**Temuan PR-2:** `attachmentUpload`/`attachmentList` di `api.ts` BELUM punya konsumen dari
view mana pun sebelum ini — satu-satunya pemakai DMS adalah `view_dms.tsx` lewat
`window.amsAttachmentUpload`, dan itu FIRM-scope (`collection:'dms'`). PR-2 = konsumen
pertama DMS ber-scope perikatan. Jangan tiru `view_dms`: ia `catch {}` galat unggah lalu
tetap membuat catatan.

**Resep unggah berkas di verifikasi hidup** (tak bisa pakai file picker OS): ambil
`document.querySelectorAll('input[type=file]')[0]` — INDEKSNYA PENTING, dropzone global
EvidenceControl juga punya input — lalu `inp.files = dt.files` (DataTransfer) +
`dispatchEvent(new Event('change',{bubbles:true}))`. `Object.defineProperty(inp,'files')`
TIDAK bekerja.

**SATU-SATUNYA UTANG TERSISA:** tinjauan visual Ari atas dua banner sign-off SA 540 (PR-1)
dan panel "Penggunaan Pakar" (PR-2). Belum pernah dilakukan untuk arc ini.
