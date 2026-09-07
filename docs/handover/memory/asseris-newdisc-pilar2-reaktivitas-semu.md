---
name: asseris-newdisc-pilar2-reaktivitas-semu
description: "Arc newdisc (Pilar Dua) — reaktivitas semu lewat larik dependensi palsu, dan gerbang CB1 yang menangkap literal fallback `{ EUR: 0 }`"
metadata: 
  node_type: memory
  type: project
  originSessionId: ce562864-64b9-4b29-b8d0-4b18e79ca0e7
  modified: 2026-08-27T05:03:57.736Z
---

Cabang `fix/newdisc-pilar-dua-turunan` (`59444cc`, basis `origin/master` `648e71f`),
worktree `.claude/worktrees/newdisc-pilar2`. BELUM di-push, belum ada PR.

**REAKTIVITAS SEMU — kelas cacat baru, lebih buruk dari hardcode.** `view_newdisc`
mendeklarasikan `useMemo(..., [wtb])` sementara badan memo hanya membaca konstanta
modul. Memo dihitung ulang tiap WTB berubah dan SELALU menjawab sama. Hardcode
terlihat; klaim dependensi palsu justru MEYAKINKAN peninjau bahwa modulnya hidup.
→ Gerbang yang memeriksa "apakah `[wtb]` ada di deps" adalah uji SIMBOL dan TIDAK
menangkapnya — larik itu memang ada pada kode yang cacat. Yang menangkap: render
view sungguhan di jsdom, geser WTB, bandingkan `textContent` SELURUH modul.
Assertion pertama harus TIDAK bergantung pada `data-testid` sendiri — kalau tidak,
view lama gagal karena penandanya tak ada (`'' !== ''`), merah dengan alasan salah,
dan gerbangnya akan lolos pada view statis mana pun yang memasang penanda itu.

**⚠️ `AMS.FX_RATES` SUDAH DICABUT dari master** (arc CB1) → pakai
`canon_fx.fxAt(tgl)` / `fxRequired(tgl)`, registry BERMASA BERLAKU, enforcement
`block`. Registry SENGAJA hanya mencakup **2026-03-01..2026-03-31**; `AMS_CANON.ASOF`
= Des 2025, jadi tanggal pelaporan perikatan **TIDAK tercakup** — konsumen wajib
membantah, bukan memakai kurs masa lain.

**Jebakan gerbang `cash_bank_conventions.test.ts` (CB1):** ia memindai SETIAP berkas
`.ts/.tsx` non-uji di `src/` untuk pola `\b(USD|SGD|EUR)\s*:\s*[0-9]`. Yang
menjatuhkan saya bukan tabel kurs melainkan **literal fallback tak berdosa**
`(AMS.FX_RATES || { EUR: 0 })`. Fallback pun dihitung sebagai "kurs tanpa masa
berlaku".

**SSOT kedua, bukan sekadar hardcode.** `canon_part3.GROUP_SUBS` sudah menyimpan
entitas yang sama (`country`/`pbt`/`tax`/`rev`): CP-05 Sentosa Trading = 4.880/830 →
**ETR 17,0%**, DI ATAS minimum GloBE. Literal modul menulis 10,5% dan dari selisih
karangan itulah "top-up Rp 275 jt" lahir. Sebelum menyimpulkan "angkanya dikarang,
tak ada sumber", grep dulu — mesinnya sering sudah ada. Bandingkan
[[asseris-gap-matrix-eval]].

**Untuk induk pakai `entityFigures(wtb)` (canon_base), BUKAN `psak65()`**: psak65
memaku kode akun 4-1100/5-1100 sehingga memberi PBT negatif untuk bagan akun SaaS/
multifinance (ENG-047/040). `entityFigures` agregasi PREFIKS → tahan bagan akun apa
pun. Lihat [[asseris-firmfin-ledger-derived]].

`GROUP_SUBS` dikunci ke `DEFAULT_ENG_ID` — struktur grup milik perikatan seed; tanpa
kunci, entitas anak klien seed tampil di perikatan lain. Kelas sama dengan
[[asseris-timebudget-engagement-isolation]].

Sisa yang belum dikerjakan: tab Perubahan Iklim menyatakan *"Tidak terdapat dampak
penyesuai material teridentifikasi pada periode ini"* — kesimpulan audit disajikan
sebagai fakta untuk SETIAP perikatan, tanpa bukti. Kelas sama dengan angka karangan,
hanya berbentuk kalimat. Kandidat prompt tersendiri.
