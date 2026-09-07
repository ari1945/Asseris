---
name: asseris-firmjvform-overlay-contract
description: "PR #246 merged — FirmJVForm ke <Overlay>; dialog yang tak dapat dipindai menyembunyikan 3 critical axe; PR bentrok = NOL check CI, bukan CI lambat"
metadata: 
  node_type: memory
  type: project
  originSessionId: 712d85bf-6018-4587-ab87-3eb497e4e28c
  modified: 2026-08-15T08:39:08.585Z
---

**PR [#246](https://github.com/ari1945/Asseris/pull/246) MERGED 2026-08-15** — `origin/master` = **`84f2e12`**. Uji **1829** frontend + 431 server, 9/9 CI hijau, **nol PR saya terbuka**. Menutup utang yang dicatat [[asseris-a11y-badge-button-native]].

`FirmJVForm` (dialog "Jurnal Baru", `view_firmgl.tsx`) dulu merakit `position:fixed; inset:0` tangan. Kini `<Overlay>` — mengikuti pola `view_pipeline.tsx` (`OppForm`), precedent terdekat.

## POLA BESAR — keadaan yang TAK DAPAT DIPINDAI menyembunyikan cacat critical

Dialog itu tak pernah masuk pemindaian axe karena **tak ada cara membukanya di dalam pemindaian**. Begitu bisa dibuka, langsung muncul **3 pelanggaran critical** yang sudah lama ada:

- `label` — input "Jumlah (Rp)" tanpa nama aksesibel
- `select-name` — **KEDUA** `<select>` akun debit/kredit tanpa nama

**Why:** `<label>` di pola `.field` repo ini **bersaudara** dengan kontrolnya, bukan membungkus, dan tanpa pasangan `htmlFor`/`id` kaitannya **murni visual**. Input "Keterangan" lolos hanya karena kebetulan punya `placeholder` — axe menerimanya sebagai nama (lemah). Jadi *sebagian* field lolos secara kebetulan, yang membuat cacatnya makin sulit terlihat.

**How to apply:** setiap kali sebuah keadaan UI menjadi dapat dipindai untuk PERTAMA kalinya (dialog, drawer, tab, panel di balik gate peran), **jalankan axe pada keadaan itu sebelum yakin gerbang hijau**. Gerbang yang tak pernah menyentuh sebuah layar bukan bukti layar itu bersih. Pola `.field` + `<label>` bersaudara ada di banyak view lain — kandidat sapuan berikutnya.

## GOTCHA KERAS — PR bentrok = NOL check CI, bukan "CI lambat"

Push pertama menghasilkan `gh pr checks` → **"no checks reported"** dan `gh run list --branch …` → **kosong**. Bukan antrean, bukan workflow rusak: `mergeable: CONFLICTING` / `mergeStateStatus: DIRTY`. Workflow `pull_request` berjalan atas **merge-ref**; kalau GitHub tak bisa membangunnya, **tak ada satu pun job yang dijadwalkan**.

**How to apply:** melihat nol check, JANGAN menunggu — langsung `gh pr view <n> --json mergeable,mergeStateStatus`. Sesudah rebase + force-push, CI terpicu sendiri (tak perlu close+reopen; itu obat untuk kasus force-push LAIN, lihat [[asseris-sa620-expert-gate-server]]).

## Resep rebase — konflik `eslint-suppressions.json`

Jangan memilih angka `count` dengan tangan. Ambil versi master lalu **regenerasi**:

```
git checkout --ours migration/eslint-suppressions.json   # saat rebase, --ours = master
git add … && git rebase --continue
npm run lint:any-baseline                                # baru ini yang menghitung benar
```

Tebakan saya (78) salah; regenerasi memberi **76** (master 77 − 1). Sesudah resolusi apa pun, tetap jalankan `grep -c "^<<<<<<< "` DAN bandingkan baris deklarasi vs master — lihat [[asseris-rebase-squash-stacked-prs]].

## GOTCHA — verifikasi hidup TIDAK diwariskan lewat rebase

#243 menulis ulang bagian `view_firmgl.tsx` yang sama (`mergeSeedJournals`, penomoran `addJV` jadi max+1). Bukti hidup pra-rebase saya jadi **salah**: "JV-0319" berubah jadi **JV-0320**, jurnal 6→7 jadi 13→14. Ulangi seluruh verifikasi di atas basis baru dan koreksi badan PR + pesan commit; jangan menyalin angka lama.

## Detail kontrak Overlay yang terbukti hidup

`role=dialog` · `aria-modal=true` · `aria-labelledby` resolve · `body.overflow=hidden` · z=90 (`Z.modal`) · focus trap membungkus dua arah · Escape · pemulihan fokus ke pemicu · form kotor → prompt z=95 **di atas** modal, "Kembali menyunting" mempertahankan isian.

Dua keputusan yang perlu diingat:
- **Isian jadi children LANGSUNG** `<Overlay>`, jangan dibungkus satu `<div>` — `bodyStyle` memberi `display:grid; gap`, dan pembungkus mematikan gap-nya. (Precedent `OppForm` punya bug laten ini.)
- **`isDirty` hanya menjaga Escape & backdrop.** Tombol X dan Batal langsung `onClose` — konvensi seluruh situs Overlay di repo, karena keduanya gestur tutup yang disengaja. Header kustom tak punya akses ke `requestClose` internal Overlay.
