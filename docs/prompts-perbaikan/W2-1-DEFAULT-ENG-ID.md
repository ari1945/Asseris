# W2-1 — mencabut fallback `DEFAULT_ENG_ID` (peran 1, 3, 4 — **peran 2 DITAHAN**)

> Diverifikasi 2026-08-29 terhadap `origin/master` = `1f54758`.
> **Keputusan Ari sudah diambil** (lihat §2). Berkas ini serah-terima, bukan usulan.

---

## 1 · `DEFAULT_ENG_ID` memikul EMPAT peran, dan hanya SATU yang cacat

Ini temuan yang menentukan. Menyebutnya "satu fallback di `contexts.tsx`" — seperti yang
dilakukan catatan-catatan sebelumnya, termasuk Amandemen B pada
`docs/prd-export-seal-identity-ssot.md` — **salah**, dan akan membuat pengeksekusi
mencabut hal yang benar bersama hal yang salah.

| # | Tempat | Peran sebenarnya | Vonis |
|---|---|---|---|
| **1** | `contexts.tsx:930` — `((firm && firm.activeEngagementId) \|\| DEFAULT_ENG_ID)` di dalam `useAmsPersist` | fallback **lingkup persist** | **CACAT — cabut** |
| **2** | `contexts.tsx:1056` — `useServerState('activeEng', DEFAULT_ENG_ID, 'user', uid)` | **nilai awal** perikatan terpilih per-pengguna | **DITAHAN** — pilihan produk, bukan kebohongan |
| **3** | `app.tsx:308` (`const DEFAULT_ENG_ID = 'ENG-2025-014'`) → dipakai `:340` `hydrateCoreFromApi` | **definisi KEDUA** literal yang sama | **duplikasi — tutup** |
| **4** | `view_newdisc.tsx:59, 73, 149` | penanda **kepemilikan**: struktur grup kanonik milik ENG-2025-014 dan *"tidak dipinjamkan"* ke perikatan lain | **BENAR — jangan cabut**, ganti namanya |

### 1.1 · Peran 1 adalah jebakan LATEN, bukan kebocoran yang sedang berjalan

Komentar di atasnya berbunyi *"null outside a provider → default engagement"*. Tetapi
**seluruh isi aplikasi dirender di dalam `AppProviders` → `FirmProvider`**
(`contexts.tsx:1530-1538`), dan peran 2 mengisi `activeEngagementId` sejak awal. Jadi
cabang fallback itu **hampir tak pernah dijalani di produksi**.

> ⚠️ **Koreksi terhadap catatan lama.** Beberapa catatan (memori sesi, dan Amandemen B di
> PRD) menyatakan peran 1 membuat *"SETIAP kertas kerja berlingkup perikatan jatuh ke
> ENG-2025-014 saat konteks kosong"*. Mekanismenya benar; **frekuensinya tidak**.
> "Konteks kosong" praktis tak tercapai selama peran 2 masih ada. Yang membuat semua
> orang mulai di ENG-2025-014 adalah **peran 2**, dan itu perikatan yang *dipilihkan* —
> bukan yang *dikarang diam-diam*.
>
> Konsekuensinya untuk perencanaan: mencabut peran 1 **TIDAK** menuntut F-4 lebih dulu,
> karena jalurnya memang tak dijalani. Amandemen B benar hanya untuk peran 2.

### 1.2 · Peran 4 lahir dari #321 dan mencabutnya = regresi

`view_newdisc.tsx` memakai konstanta itu untuk menyatakan bahwa struktur grup kanonik
(PSAK 65 / SA 600) **melekat pada satu perikatan dan tidak dipinjamkan**. Itu justru
perbaikan yang didaratkan #321. Namanya yang salah, bukan pemakaiannya.

---

## 2 · Keputusan Ari (2026-08-29)

> **"DEFAULT_ENG_ID dicabut"** → sesudah keempat peran dipaparkan: **"kerjakan yang
> disarankan, tahan peran 2"**.

Artinya, lingkup yang DISETUJUI:

- ✅ **Peran 1** — cabut fallback; tanpa perikatan aktif, **tolak menulis**, jangan memilihkan.
- ✅ **Peran 3** — `app.tsx` berhenti mendeklarasikan literalnya sendiri.
- ✅ **Peran 4** — ganti nama jadi sesuatu yang jujur (mis. `GROUP_STRUCTURE_OWNER_ENG`).
- ⛔ **Peran 2 DITAHAN.** Mencabutnya membuat aplikasi mulai **tanpa perikatan terpilih**,
  sehingga setiap layar berlingkup perikatan butuh jalur penolakan → **F-4 jadi
  prasyarat**, menyentuh puluhan modul. CLAUDE.md mewajibkan **PRD sendiri**; jangan
  diselipkan ke PR ini.

---

## 3 · Yang WAJIB diperiksa sebelum menulis kode

**Server menolak `scopeId` kosong.** `server/src/router.ts:63` → `scopeId: z.string().min(1)`.
Jadi "menolak" **tidak boleh** berarti mengirim `scopeId: ''` — itu menghasilkan galat
runtime, bukan penolakan yang jujur. Yang benar: `useAmsPersist` **melewati perjalanan
server sepenuhnya** saat lingkupnya perikatan tapi tak ada perikatan aktif, dan
menyatakan alasannya.

Baca `useServerState` (`contexts.tsx:725`) sebelum menyunting — ia sudah punya jalur
penolakan (`initialRef`, `pendingRef`) dan komentar R-1 yang menjelaskan mengapa tulisan
tertunda membawa alamatnya sendiri. Jangan merakit jalur kedua di sebelahnya.

**Presedens perilaku yang sudah mendarat:** `attachment_scope.ts` (#317) dan
`export_identity.ts` (#332) — keduanya menolak, tidak memilihkan. Tirulah bentuknya.

**Pembaca yang akan terpengaruh** (uji yang menyebut konstanta ini):

```
migration/src/mgmtletter_attribution.test.ts:203   expect(ENG_A).toBe(DEFAULT_ENG_ID)
migration/src/sjah_engagement_isolation.test.ts:168-169
migration/src/stage0_context_races_repro.test.ts:45,47
```

Ketiganya memakai konstanta sebagai **nilai uji**, bukan sebagai fallback. Kemungkinan
besar aman, tetapi **baca satu per satu** — jangan asumsikan.

---

## 4 · Gerbang yang diterima

**§1 PERILAKU** — dengan perikatan aktif, kunci berlingkup perikatan menulis ke perikatan
itu; **dua perikatan berbeda ⇒ dua `scopeId` berbeda**. Tanpa perikatan aktif,
`state.set` **tidak pernah dipanggil** (stub `api.state.set` dan tuntut nol panggilan) —
bukan "dipanggil dengan scopeId kosong".

**§2 SUMBER** — nol `|| DEFAULT_ENG_ID` di `contexts.tsx`; nol deklarasi kedua di
`app.tsx`; komentar dibuang lebih dulu.

**§3 ANTI-TAUTOLOGI** — mutasi sumber kembali ke `|| DEFAULT_ENG_ID` dan tuntut §1 DAN §2
gagal.

⚠ Tulis regex sebagai literal `/.../`, jangan dirakit dari string — escape-nya lenyap.
⚠ `toMatchObject({p:/re/})` SELALU lolos. ⚠ `grep -c` membaca komentar sebagai kode.

**Buktikan MERAH dulu:** `git stash && npm test -- <ujimu>` → harus gagal → `git stash pop`.

---

## 5 · Definisi selesai

- [ ] Output merah gerbang pada kode LAMA ditempel di deskripsi PR
- [ ] `contexts.tsx:930` — nol fallback; tanpa perikatan aktif, **nol panggilan `state.set`**
- [ ] `app.tsx` — nol deklarasi kedua; klaim SSOT di `persist_scope.ts` jadi benar
- [ ] `view_newdisc.tsx` — nama baru yang menyatakan KEPEMILIKAN; perilaku #321 tak berubah
- [ ] **Peran 2 (`contexts.tsx:1056`) TIDAK disentuh** — tunjukkan `git diff` sebagai bukti
- [ ] Ketiga berkas uji yang menyebut konstanta ini dibaca dan dilaporkan statusnya
- [ ] `npm run verify` dari root HIJAU
- [ ] Deskripsi PR menyebut apa yang TIDAK dikerjakan dan mengapa

---

## 6 · Prompt (salin sebagai pesan pertama di sesi baru)

```
Kamu mengerjakan Asseris (aplikasi audit KAP, Bahasa Indonesia).

Baca berurutan sebelum menyentuh kode:
1. CLAUDE.md di root repo.
2. docs/PROMPT-PERBAIKAN-MODUL.md BLOK-A (preamble tetap).
3. docs/prompts-perbaikan/W2-1-DEFAULT-ENG-ID.md — berkas ini, SELURUHNYA.
4. migration/src/attachment_scope.ts + migration/src/export_identity.ts — presedens
   "tolak, jangan pilihkan" yang sudah mendarat (#317, #332).

TUGAS: cabut fallback `DEFAULT_ENG_ID` — HANYA peran 1, 3, 4. Peran 2 DITAHAN.
Keputusan Ari, 2026-08-29. Lingkup persisnya ada di §2 berkas ini.

⛔ JANGAN bekerja di direktori kerja utama — ia memikul kerja belum-commit sesi lain
(4 M + 16 ?? per 2026-08-29). Buat worktree sendiri.

⛔ JANGAN menyentuh contexts.tsx:1056 (`useServerState('activeEng', DEFAULT_ENG_ID, …)`).
Mencabutnya membuat aplikasi mulai tanpa perikatan terpilih ⇒ F-4 jadi prasyarat dan
puluhan modul butuh jalur penolakan. Itu PRD tersendiri. Kalau kamu yakin ia harus ikut
dicabut — BERHENTI dan laporkan, jangan kerjakan.

⛔ JANGAN mencabut pemakaian di view_newdisc.tsx. Itu penanda KEPEMILIKAN dari #321 —
struktur grup kanonik melekat pada satu perikatan dan tidak dipinjamkan. Yang salah
namanya, bukan pemakaiannya. Ganti nama, jangan hapus.

⚠ Server menolak scopeId kosong (server/src/router.ts:63 `z.string().min(1)`). "Menolak"
berarti MELEWATI perjalanan server sepenuhnya, bukan mengirim string kosong.

Gerbang: §1 PERILAKU (dua perikatan ⇒ dua scopeId; tanpa perikatan ⇒ NOL panggilan
state.set) · §2 SUMBER · §3 ANTI-TAUTOLOGI. Buktikan MERAH dulu.

Definisi selesai: §5 berkas ini, seluruh kotak centang.
```
