# W1-E — `records` (Retensi & Arsip) · `relatedsvc` (Jasa Terkait SPSJL 4400/4410)

> ✅ **SATU-SATUNYA PAKET W1 YANG BERJALAN** (keputusan Ari, 2026-08-28). Tujuh paket
> lain (W1-A…D, F…H) DITAHAN: 28 dari 32 berkasnya sudah dikonversi di cabang
> `claude/intelligent-keller-7b28db` dengan arsitektur berlawanan (identitas ditarik
> eksporter dari SSOT, bukan didorong call-site). Paket ini selamat karena isinya
> **kontrol palsu**, bukan identitas ekspor.
>
> ⛔ **E1 DICABUT dari paket ini.** `view_records.tsx:405` (`firm:` literal) ADA di dalam
> lingkup arc ekspor — arc mencabut argumen `firm:` seluruhnya dari call-site.
> Memperbaikinya di sini akan bertabrakan. **Kerjakan HANYA E2 dan E3.**
>
> ⚠ `view_records.tsx` disentuh arc itu (pada baris ekspor, bukan baris kontrol).
> `view_relatedsvc.tsx` **tidak** disentuh sama sekali. Jaga suntinganmu di
> `view_records.tsx` sesempit mungkin dan harapkan satu rebase saat arc mendarat.


**Berkas yang DIMILIKI paket ini:**
`migration/src/view_records.tsx` · `view_relatedsvc.tsx`
\+ `migration/src/w1e_records_relatedsvc.test.ts` (baru).

**Diverifikasi ulang 2026-08-28 terhadap `origin/master` = `8a8cc54`** — semua situs
masih hidup pada nomor baris di bawah; nol berkas paket ini tersentuh gelombang W0
(#318–#322).

### ~~E1 · Penerbit karangan di dalam XLSX tersegel~~ — DICABUT (lingkup arc ekspor)
`view_records.tsx:405` → `firm: 'KAP Wijaya Hartono & Rekan'` di dalam
`amsExportXlsx({…})`. Modul ini sudah memanggil `useAuth()` di baris 348, jadi
SSOT-nya sudah berada di tangan — literalnya murni sisa.

### E2 · Kontrol palsu — `relatedsvc` (yang paling parah di paket ini)
```
view_relatedsvc.tsx:211  <span onClick={() => editCustom(p.no,'exception',!p.exception)}>
                           <Badge …>{p.exception ? 'Pengecualian' : 'Sesuai'}</Badge></span>
view_relatedsvc.tsx:213  <span onClick={() => delCustom(p.no)} title="Hapus">…</span>
```
Baris 211 **mengubah keadaan kertas kerja AUP** — ia menandai sebuah prosedur sebagai
"Pengecualian" atau "Sesuai". Itu keputusan profesional yang masuk ke temuan faktual
SPSJL 4400. Ia diimplementasikan sebagai `<span>`: tidak masuk urutan tab, tidak
menanggapi Enter/Space, tidak diumumkan sebagai kontrol. Baris 213 **menghapus baris
prosedur** dengan cara yang sama.

### E3 · Baris/kartu terpilih sebagai `<tr|div onClick>`
```
view_relatedsvc.tsx:273, 463   <div onClick={() => setSelNo(…) / setSel(id)}>
view_records.tsx:150, 436      <tr onClick={…}>          (150 = navigasi ke 'dms')
view_records.tsx:232,245,258   <div onClick={() => onPick(box)}>
view_records.tsx:519           <span onClick={() => nav('procurement', …)}>  (chip)
```

**Presedens yang sudah mendarat dan WAJIB ditiru** — PR #308 (`0f9ed9f`),
`view_procurement.tsx:232-270`: tombol NATIVE di dalam sel pertama, gaya direset
sehingga tampilan tabel tak berubah, `aria-pressed` untuk keadaan terpilih, dan
cincin `:focus-visible`. Kelasnya bernama `.proc-rowbtn`, bersaudara dengan
`.pc-rowbtn` (`view_pc_org`) dan `.ia-rowbtn` (`view_internalaudit`). Baca ketiganya.

> ⚠ **Aturan keras BLOK-A §4 berlaku penuh di sini.** Bila kamu menemukan kontrol
> yang TIDAK punya handler sama sekali, jangan diberi `aria-label`. Aktifkan atau
> cabut. Memberi nama pada kontrol mati membuat keadaan lebih buruk.

> ⚠ `grep '<tr onClick'` MELEWATKAN kasus nyata di repo ini — atribut sering
> mendahului `onClick` (`<tr key={…} className={…} onClick={…}>`). Telusuri dengan
> pola yang mengizinkan atribut di antaranya, lalu **baca** hasilnya satu per satu.

---

## Prompt (salin seluruh blok ini sebagai pesan pertama di sesi baru)

```
Kamu mengerjakan Asseris (aplikasi audit KAP, Bahasa Indonesia).

Baca berurutan sebelum menyentuh kode:
1. CLAUDE.md di root repo — perhatikan §3 aturan emas no. 7 (kontrol form NATIVE).
2. docs/PROMPT-PERBAIKAN-MODUL.md BLOK-A (preamble tetap) — terutama aturan keras
   no. 4: JANGAN MENAMAI YANG MATI.
3. docs/prompts-perbaikan/W1-00-IDENTITAS-TERSEGEL.md — §2 SSOT identitas firma,
   §5 larangan, §6 bentuk gerbang. Wajib.
4. docs/prompts-perbaikan/W1-E-records-relatedsvc.md — berkas ini.
5. migration/src/view_procurement.tsx:232-270 — PRESEDENS kontrol baris native
   (.proc-rowbtn, PR #308). Tiru bentuknya, jangan mengarang bentuk baru.

TUGAS: modul records (Retensi & Arsip) dan relatedsvc (Jasa Terkait SPSJL 4400/4410).

BERKAS YANG BOLEH KAMU SENTUH — HANYA INI:
  migration/src/view_records.tsx
  migration/src/view_relatedsvc.tsx
  migration/src/w1e_records_relatedsvc.test.ts   (baru)
PERHATIAN NAMA BERKAS: view_relatedsvc.tsx (jasa terkait) BUKAN view_related.tsx
(SA 550, milik paket W1-C) dan BUKAN related_modules.tsx (fitur lintas-sektor).
Tujuh sesi lain berjalan paralel di berkas lain.

YANG HARUS DITUTUP:

⛔ E1 DICABUT — JANGAN DIKERJAKAN. `view_records.tsx:405` (`firm:` literal di payload
    tersegel) ADA di dalam lingkup arc `export_identity` yang mencabut argumen `firm:`
    seluruhnya dari call-site. Memperbaikinya di sini akan bertabrakan dengan arc itu.
    Kalau kamu tergoda "sekalian" — jangan; laporkan saja bahwa kamu melihatnya.

E2. view_relatedsvc.tsx:211 dan :213 — <span onClick> yang MENGUBAH KEADAAN kertas
    kerja AUP (menandai prosedur "Pengecualian"/"Sesuai") dan MENGHAPUS baris
    prosedur. Keduanya keputusan profesional SPSJL 4400 yang hanya bisa dicapai
    tetikus: tak masuk urutan tab, tak menanggapi Enter/Space, tak diumumkan.
    → kontrol NATIVE. Untuk penanda dua-keadaan, pertimbangkan <Check>/<Switch> dari
      ui.tsx; untuk aksi, <button type="button"> dengan aria-label/title yang benar.
      Pilih yang jujur terhadap semantiknya, dan katakan di deskripsi PR mengapa.

E3. Baris & kartu terpilih sebagai <tr|div|span onClick>:
      view_relatedsvc.tsx:273, 463
      view_records.tsx:150, 232, 245, 258, 436, 519
    → tombol native di dalam sel/kartu, gaya direset agar tampilan tak berubah,
      aria-pressed untuk keadaan terpilih, :focus-visible. Persis .proc-rowbtn.
    → JANGAN mengubah tata letak/tampilan tabel. Ini perbaikan mekanisme, bukan desain.
    ⚠ grep '<tr onClick' MELEWATKAN kasus nyata (atribut sering mendahului onClick).
      Pakai pola yang mengizinkan atribut di antaranya, lalu BACA hasilnya satu-satu.
      Kalau kamu menemukan situs di luar daftar di atas, tutup juga dan laporkan.

⛔ LARANGAN
- Jangan menamai kontrol yang tak punya handler. Aktifkan atau cabut — tidak ada
  opsi ketiga (BLOK-A aturan keras no. 4).
- Jangan mengubah firm_identity.ts, ui.tsx, overlay.tsx, export_xlsx.ts,
  contexts.tsx, related_modules.tsx. Yakin harus? BERHENTI dan laporkan.
- Gerbangmu memindai HANYA kedua view milik paket ini — jangan sensus repo-wide
  (88 berkas lain masih memikul pola yang sama; itu PR tersendiri).
- Jangan menyentuh migration/eslint-suppressions.json. `:any` baru = lint merah.
- Jangan menyentuh lapisan kanon arsip (data_records.ts, RETENTION) — modul records
  membacanya lewat window.RETENTION dan itu di luar lingkup paket ini. Kalau kamu
  menemukan cacat di sana: laporkan, jangan kerjakan.
- Skala tipografi: hanya 8 ukuran, lantai 11px, dilarang setengah langkah. Warna
  lewat token CSS var, bukan hex.

GERBANG — tiga bagian, dan §1 harus PERILAKU bukan keberadaan simbol:
§1 KONTROL — setiap kontrol yang kamu ubah dapat difokuskan (masuk urutan tab) dan
    memiliki nama yang dapat diakses; klik pada kontrol mengubah keadaan yang benar.
    ⚠ BATAS jsdom yang sudah menggigit di repo ini (PR #306): jsdom MEMODELKAN
    fokusabilitas tetapi TIDAK mensintesis Enter → click. Menguji "tekan Enter lalu
    keadaan berubah" akan HIJAU PALSU. Uji fokusabilitas + nama + handler di jsdom;
    perilaku papan-ketik sungguhan adalah urusan e2e, dan itu DI LUAR lingkup PR ini
    — katakan begitu di deskripsi PR, jangan berpura-pura menutupnya.
§2 SUMBER — pindai HANYA kedua berkas ini, komentar dibuang dulu: nol 'KAP Wijaya',
    nol <tr|div|span …onClick> yang berperan sebagai kontrol.
    ⚠ Tulis regex sebagai literal /.../, jangan dirakit dari string — escape-nya
    lenyap dan polanya tak pernah cocok. ⚠ toMatchObject({p:/re/}) SELALU lolos.
§3 ANTI-TAUTOLOGI — mutasi sumber balik ke bentuk cacatnya; tiap predikat §2 WAJIB gagal.

Buktikan gerbang MERAH dulu:  git stash && npm test -- w1e_records_relatedsvc → gagal
                              git stash pop

SELESAI BILA:
[ ] Output merah gerbang pada kode LAMA ditempel di deskripsi PR
[ ] relatedsvc:211/213 jadi kontrol native yang bisa di-Tab & bernama
[ ] Sembilan situs baris/kartu terpilih jadi kontrol native; tampilan tabel TIDAK berubah
[ ] Tidak ada kontrol mati yang diberi nama (sebutkan bila kamu menemukan & mencabutnya)
[ ] `npm run verify` dari root HIJAU
[ ] Deskripsi PR menyebut apa yang TIDAK dikerjakan — termasuk secara eksplisit
    bahwa smoke papan-ketik e2e tidak dijalankan di PR ini
```
