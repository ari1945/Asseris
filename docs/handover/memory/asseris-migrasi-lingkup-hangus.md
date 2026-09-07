---
name: asseris-migrasi-lingkup-hangus
description: "Keputusan Ari — saat kunci persist Asseris pindah dari lingkup firma ke lingkup perikatan, data firm-scope lama dibiarkan HANGUS; jangan tambah baca-lewat"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 7367bd5a-d1b5-4748-8de4-52a2883bbc97
  modified: 2026-08-26T22:11:27.991Z
---

Saat sebuah kunci `useAmsPersist` di Asseris dipindahkan dari lingkup **firma** ke lingkup
**perikatan**, data firm-scope yang sudah terlanjur tersimpan **dibiarkan hangus**. Jangan
menambahkannya ke `SERVER_READ_THROUGH_FIRM` (`migration/src/contexts.tsx`), dan jangan
menulis skrip migrasi yang menyalinnya ke sebuah perikatan.

**Why:** dinyatakan Ari 2026-08-26 — *"hangus saja, jangan tambah read-through"* — pada arc
[[asseris-sjah-isolasi-empat-kunci]]. Alasan teknisnya sudah tertulis di repo pada preseden
`mat.memo.signoff`: nilai firm-scope **tak dapat diatribusikan** ke satu perikatan tertentu,
dan justru itulah cacat yang sedang dicabut. Baca-lewat firma akan menyajikan dokumen yang
sama ke SETIAP perikatan sampai penyimpanan pertama — memasang ulang kebocoran itu.
Menyalinnya ke satu perikatan = mengarang atribusi pekerjaan audit.

**How to apply:** cukup tambahkan entri di `AMS_PERSIST_SCOPE`, tulis alasan hangusnya di
komentar entri itu, dan **pertahankan** entri kuncinya di `FIRM_STATE_READ_KEYS`
(`server/src/stateAccess.ts`) supaya dokumen lama tetap terbaca alat pemeriksa, bukan UI.
Jangan lagi menawarkan opsi baca-lewat untuk kasus sejenis kecuali Ari sendiri yang membuka
— cukup laporkan bahwa data lama tidak terbawa dan lanjutkan.
