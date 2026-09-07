---
name: asseris-mytasks-user-scope
description: "My Tasks M1/M3/M4 — mt.* pindah ke lingkup pengguna, id tenggat dari data; GOTCHA userScopeId() ternyata kode mati & gerbang \"id lama masih ada\" itu tautologis"
metadata: 
  node_type: memory
  type: project
  originSessionId: 1d3abf10-0c13-4950-81f4-28ae0ee0d367
  modified: 2026-08-20T09:32:32.375Z
---

Arc modul `tasks` (My Tasks), 2026-08-20. Dikerjakan M1 · M3 · M4; **M2 sengaja TIDAK
dikerjakan** (usulan di `docs/usulan-M2-mytasks-sumber-kebenaran.md`, menunggu keputusan Ari).

## Yang berubah

- **M1** — `mt.personal` / `mt.meta` / `mt.view` pindah dari lingkup **firma** ke lingkup
  **pengguna**. Peta `AMS_PERSIST_SCOPE` dipindah dari `contexts.tsx` ke
  `migration/src/persist_scope.ts` sebagai `persistScopeFor(key)` supaya bisa diuji tanpa
  mem-boot React. `mt.*` dicabut dari `FIRM_STATE_READ_KEYS` (`server/src/stateAccess.ts`).
- **M3/M4** — `DEADLINES[].id` ('DL-01'…) jadi identitas; derivasi murni diekstrak ke
  `migration/src/mytasks_derive.ts` + `mytasks_derive.test.ts` (modul ini dulu NOL uji).

## GOTCHA yang mahal

1. **`userScopeId()` di contexts.tsx adalah KODE MATI** sebelum ini — tak satu pun kunci
   memetakan ke `'user'` di `AMS_PERSIST_SCOPE`, jadi jalur itu tak pernah dieksekusi. Dan
   isinya salah: `AMS.USER.employeeId` = konstanta seed yang SAMA untuk semua orang. Kalau
   dipakai apa adanya, "lingkup pengguna" tetap satu dokumen bersama, dan server menolaknya
   `not-owner` bagi hampir semua orang → gagal senyap ke cache-saja. Diganti
   `sessionUserScopeId(auth)` yang membaca `useAuth().user.id` — ekspresi yang SUDAH dipakai
   `FirmProvider` untuk kunci user-scope `activeEng`. **Pelajaran: sebelum memakai sebuah
   jalur, periksa apakah ia pernah dijalankan sama sekali.** Bandingkan
   [[asseris-prisma-client-worktree-trap]] (gerbang yang belum pernah merah).

2. **Gerbang "id lama masih ada" itu TAUTOLOGIS untuk id berbasis indeks.** Uji pertama saya
   berbunyi `for (id of before) expect(after).toContain(id)` — dengan `dl-<indeks>`,
   menyisipkan satu baris tetap menghasilkan {dl-0, dl-1, dl-2} sehingga assertion-nya LOLOS
   SELALU. Yang harus diuji adalah **pemetaan id→objek**, bukan keberadaan id. Ketahuan hanya
   karena saya menjalankan uji mutasi. Sekelas dengan
   [[asseris-budget-actual-ledger-derived]].

3. **Firm-scope tanpa cabang `capForWrite` = FIRM_ADMIN = tulisan gagal SENYAP.** `mt.meta`
   kena ini: hanya Rekan Pemimpin yang tulisannya diterima; auditor lain melihat centangnya
   menempel (cache lokal) lalu hilang saat reload, karena `flush()` di contexts.tsx hanya
   memunculkan toast untuk CONFLICT — FORBIDDEN jatuh ke cabang "offline" tanpa suara. Pola
   berulang: priorYear · capacityPlan.v1 · pipeline · deliveryPlan.v1 · mat.*.

4. **Pola `PERSONAL_STATE_KEYS`/`personalScope.ts` (leaveReqs dsb.) BUKAN jawabannya di sini**
   walau prompt menyarankannya. Pola itu untuk koleksi HR firma berisi baris TENTANG
   seseorang: baca difilter baris, tulis di-gate HR_MANAGE. My Tasks dibuat OLEH pemiliknya —
   HR_MANAGE berarti tak seorang auditor pun bisa mencentang tugasnya sendiri. Lingkup
   `'user'` adalah primitif yang tepat (kepemilikan ditegakkan `assertStateDocRead` /
   `assertCanWrite`; `capForWrite('user', …)` = null).

5. **Konvensi akhir-baris BERBEDA per direktori.** `migration/src/**` = CRLF penuh;
   `server/src/stateAccess.ts` = LF penuh. `grep -c $'\r'` MENYESATKAN (menghitung baris,
   bukan kemunculan) — pakai `python -c "b=open(f,'rb').read(); print(b.count(b'\r\n'), b.count(b'\n'))"`.
   Berkas baru yang ditulis sesi lain (`home_composition.ts`) memakai LF.

6. **Heredoc Bash gagal pada berkas TS besar** ("unexpected EOF while looking for matching `'`")
   walau delimiternya dikutip. Pakai tool Write untuk berkas baru, Python untuk suntingan
   bedah. Sejalan dengan [[asseris-repo-hygiene-2026-08-19]] (backslash lenyap lewat heredoc).

## Yang SENGAJA tidak disentuh

`server/src/taskAgg.ts` masih memakai `dl-<indeks>` — **cacat M3 yang sama, lebih parah**
(indeksnya dihitung SESUDAH `.filter()`, jadi `dl-0` menunjuk tenggat berbeda bagi Junior dan
Partner). `docs/prompts-perbaikan/04-tasks.md` melarang menyentuh berkas itu di PR ini karena
ia bagian keputusan M2. Sudah dibuktikan merah lalu di-revert; tinggal diterapkan saat M2
diputuskan.

Kebocoran isolasi kecil yang belum ditutup: `audit.deadlines = D.DEADLINES` apa adanya
(`contexts.tsx`), jadi My Tasks menampilkan tenggat klien yang tak punya perikatan dengan si
auditor — yang justru dicegah `deriveDeadlineTasks` di server. M4 tidak memperlebarnya
(DEADLINES tepat 4 baris hari ini).

Terkait: [[asseris-home-a11y-komposisi]] · [[asseris-authoritative-persist-key-recipe]] ·
[[asseris-personal-data-isolation]]
