---
name: asseris-wip-merge-valuasi-realisasi
description: Arc peleburan modul wip + wipreal jadi satu (2026-08-15) - write-down manual naik ke SSOT, gate persetujuan, alias rute; SELESAI & live-verified
metadata: 
  node_type: memory
  type: project
  originSessionId: 360802f3-ff02-47a7-9040-d0388fa36f30
  modified: 2026-08-15T00:57:52.738Z
---

Arc **2026-08-15**, cabang `feat/wip-merge-valuasi-realisasi` (off `master` `b5ae750`),
**[PR #237](https://github.com/ari1945/Asseris/pull/237) MERGED** 2026-08-15 (squash), 9/9 check CI hijau.
`origin/master` = **`9d89bea`**. Cabang sudah dihapus.
PRD: `docs/prd-wip-merge-valuasi-realisasi.md` (**Implemented**).
Jawaban Ari: **Q-1 = `wip`** · Q-2 & Q-3 didelegasikan ("berikan saya terbaik") → saya pilih
**Operasi Praktik** & **Opsi A**.

**Yang dikerjakan:** `wipreal` (view_wip_firm.tsx, DIHAPUS) + `wip` (WIPValuation, dicabut dari
view_firmfinance.tsx) → `view_wip.tsx` + `view_wip_parts.tsx`, 4 tab. Satu entri nav di grup
Operasi Praktik. Satu ekspor XLSX 2 sheet menggantikan dua berkas.

**Tiga cacat yang ditemukan saat audit (ini yang membenarkan merge, bukan sekadar rapi-rapi):**
1. **`wip.adj` adalah angka WIP kedua yang tak terlihat siapa pun** — write-down manual dulu
   state LOKAL di view yang menghitung ulang recoverable/realisasi/margin sendiri, tak pernah
   masuk `FIRMFIN.wip()`. Dashboard, cockpit Beranda, Firm Finance & ekspor semua menampilkan
   angka PRA-write-down. Persis kelas cacat yang `useFirmWip` dibuat untuk membunuh — lolos
   lewat pintu belakang. Lihat [[asseris-wtb-eval-pr1-pr2]] (pola yang sama).
2. **Dua panel bertetangga, dua basis** — tabel register ber-adj vs panel aging tanpa adj,
   di satu layar, tanpa peringatan.
3. **Write-down manual melewati antrean persetujuan** — `buildApprovals` membangkitkan item
   `WIP Write-off` HANYA dari seed `WIP_ENG`; penghapusan lewat UI berapa pun besarnya cuma
   dijaga RBAC. Kini ada `APR-WIPADJ-*` (prefiks berbeda agar tak menabrak item seed).

**GOTCHA — `useServerState` TIDAK punya broadcast lintas-instance.** Dua komponen memakai
`useAmsPersist('kunci')` yang sama = dua `React.useState` terpisah; tulisan di satu tak
me-render yang lain (hanya `cacheWrite` sinkron + hidrasi saat mount). Aman di sini KARENA
hanya satu route ter-mount pada satu waktu — tapi jangan andalkan itu untuk komponen yang
hidup bersamaan. Solusi yang dipakai: `useFirmWip` jadi SATU pintu (`{ wip, liveByEng, adj,
setAdj }`), bukan tiap view memanggil `useAmsPersist` sendiri.

**GOTCHA — hook React di repo ini UNTYPED (tak ada `@types/react`).** Konsekuensi dua arah:
(a) `React.useMemo(...)` mengembalikan `any` → cast HARUS di LUAR panggilan (`useMemo(...) as T`),
cast di dalam callback tak sampai ke pemanggil; (b) argumen generik dilarang —
`useState<string|null>(x)` = TS2347, pakai `useState(x) as [T, (v:T)=>void]`. Juga
`React.ComponentType` tak ada — tulis `(props:{size?:number}) => JSX.Element` sendiri.

**GOTCHA — ratchet `:any` menghitung PER-BERKAS dengan angka pasti.** Menambah SATU `any` di
`data_firmfin.ts` (127) meng-un-suppress SELURUH 128 error berkas itu. Berkas BARU tanpa entri
suppression = semua `any`-nya error. Jalan yang benar: ketik tipenya, jangan tambah baseline.
Hasil arc ini: **8111 → 8058** (−53), `view_wip.tsx` & `view_wip_parts.tsx` nol `any`.

**Alias rute** (`ROUTE_ALIAS`/`resolveRoute` di `route_hash.ts`, murni & node-testable):
diterapkan di 3 pintu — `initialLocation` (hash + `ams.route`), `navigate()` di app.tsx,
handler `hashchange`. Pakai `hasOwnProperty`, bukan `in` (kalau tidak `resolveRoute('toString')`
mengembalikan fungsi). Uji memaku alias tak pernah berantai.

**LINEAGE ganda:** `LINEAGE.wip` didefinisikan DI DUA berkas (`related_modules_data.ts` dan
`_data2.ts`); yang kedua menimpa diam-diam yang pertama yang lebih kaya. Sudah dibersihkan —
tapi curigai pola ini untuk id lain.

**Non-Scope yang masih cacat:** `additions = 10_400_000_000` literal dan `opening` adalah
**PLUG** (`data_firmfin.ts` ±135) — roll-forward "selalu menutup" karena saldo awal dihitung
mundur. Tercatat juga di `docs/PRD-USULAN-PENGEMBANGAN-E9-KEDALAMAN.md`.

**SC-9 TERTUTUP — terverifikasi HIDUP 2026-08-15.** Write-down Rp 200 jt pada ENG-2025-063
menggerakkan SEMUA sekaligus: KPI modul (5,90→5,70 M · 99→97% · penyisihan 935→815 jt),
bucket aging >90h (1.050→850, inilah C-2), Beranda kokpit, portlet Firm Dashboard, sub-buku
Firm Finance, dan item Approvals baru `APR-WIPADJ-*` (inilah C-1 & C-3). Alias `#/wipreal`
→ `#/wip` terbukti, `ams.route` ikut ternormalisasi. Keadaan demo direset sesudahnya
(`wip.adj` = `{}`). PRD → **Implemented**, commit `544c635`.

**GOTCHA TOOLING (mahal waktu) — dua jebakan browser di repo ini:**
1. `setVal` di `useServerState` memanggil `cacheWrite` DI DALAM updater `setValRaw`, jadi
   localStorage baru terisi setelah React me-render. Membaca `localStorage` pada TICK YANG
   SAMA dengan klik → tampak "tombol tak berfungsi" padahal berhasil. Selalu cek di panggilan
   tool BERIKUTNYA.
2. Screenshot Browser pane 800x500 TIDAK berskala linear ke viewport CSS (1440x900): app
   hanya mengisi ~40% kanvas (faktor ~0,224). Klik-koordinat hasil hitungan naif meleset.
   Andalkan `ref` dari `read_page`, atau hitung faktor dari `getBoundingClientRect()` dulu.

**Catatan jujur (bukan regresi arc ini):** kontrol GL 1-300 tetap Rp 9,3 M setelah write-down
— plug `reconciling` yang menyerapnya (3.400→3.600 jt). Perilaku pra-ada, sejalan dengan
overlay `liveByEng`. Juga: item persetujuan manual tampil "Lewat 158 hari" karena
`data_platform.NOW` = 2026-03-10 (jam demo modul itu); SELURUH item antrean juga overdue
101–157 hari, jadi konsisten — bukan anomali yang diperkenalkan merge ini.

**Dev server sesi ini di port 5185** (entri `vite-5185` di `.claude/launch.json`; 5180 dipakai
sesi chat lain). Login harus dilakukan Ari sendiri — saya tak boleh mengetik kata sandi.
