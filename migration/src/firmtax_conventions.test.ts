/* ============================================================
   Pajak Firma (`firmtax`) — gerbang SUMBER atas `view_firmtax.tsx`.

   Berkas ini membaca sumbernya, bukan hasil render, karena cacat yang ditutup
   arc ini adalah cacat KABEL dan cacat PENANDA — bukan cacat aritmetika:

     FT1  Tabel "Bukti Potong Unifikasi" menggabungkan baris kanonik dari
          register `TAX23` dengan DUA baris literal yang berbentuk bukti potong
          LENGKAP — nomor seri, jenis, pihak, DPP, tarif, pajak:
            { no: '1.2-02.26-0001849', jenis: 'PPh 4(2)', … }
            { no: '1.1-02.26-0009921', jenis: 'PPh 21',  … }
          Nomor bukti potong adalah identitas dokumen yang dilaporkan ke DJP.
     FT2  Hanya baris kanonik yang bertanda ("SSOT"). Baris karangan polos,
          sehingga status sebuah baris hanya dapat disimpulkan dari KETIADAAN
          tanda — dan ketiadaan tidak terbaca.
     FT3  Pelaku jejak `TAX_FILED` diambil dari seed (`AMS.USER`), bukan sesi.
     FT5  `window.TAX23` dibaca sebagai global padahal `data_pph23.ts:226`
          sudah mengekspornya sebagai modul ESM.

   CATATAN LINGKUP: gerbang ini memindai `view_firmtax.tsx` saja. Nomor seri
   faktur pajak di `AMS.EFAKTUR` (data_part2.ts) BUKAN literal view dan sengaja
   TIDAK dipindai di sini — ia byte-identik dengan fixture konektor Coretax
   (`server/src/integrations/providers/coretaxFixture.ts`) yang punya adapter,
   control-total, dan ujinya sendiri. Lihat laporan arc ini.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SRC = join(__dirname, 'view_firmtax.tsx');
const src = (): string => readFileSync(SRC, 'utf8');
/* Komentar dibuang lebih dulu: berkas ini mengutip pola lama sebagai catatan
   sejarah, dan gerbang yang memindai komentar akan menuduh catatan itu sendiri. */
const kode = (): string => src().replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/* ------------------------------------------------------------------
   (a) FT1 — nol nomor dokumen resmi yang tertanam sebagai literal.
   ------------------------------------------------------------------ */
describe('FT1 · nomor bukti potong tidak dikarang di dalam view', () => {
  /* Bentuk nomor Bukti Potong Unifikasi Coretax yang dipakai register:
     `1.2-02.26-0004520` → <kode>.<kode>-<masa>.<tahun>-<urut 7 digit>. */
  const NO_BUPOT = /\b\d\.\d-\d{2}\.\d{2}-\d{7}\b/g;

  it('nol literal berpola nomor bukti potong di view_firmtax.tsx', () => {
    const hit = [...kode().matchAll(NO_BUPOT)].map((m) => m[0]);
    expect(hit, 'nomor bukti potong karangan: ' + hit.join(' | ')).toEqual([]);
  });

  /* Regex di atas hanya menangkap bentuk yang SUDAH ada. Gerbang kedua menutup
     jalan keluarnya: baris e-bupot tidak lagi dirakit di dalam view sama sekali,
     jadi tidak ada tempat untuk menaruh nomor bentuk baru. */
  it('perakitan baris e-bupot tidak lagi hidup di dalam view', () => {
    const k = kode();
    expect(k).not.toMatch(/const\s+ebupotFeb\s*=/);
    expect(k, 'view harus memanggil perakit murni `bupotRows`').toMatch(/bupotRows\s*\(/);
  });

  it('nomor seri hanya dirender dari baris, bukan dari literal', () => {
    /* Tak ada nomor seri faktur pajak yang diketik di view (bentuk
       `010.000-26.00000118`) — yang ada dirender dari AMS.EFAKTUR. */
    const hit = [...kode().matchAll(/\b\d{3}\.\d{3}-\d{2}\.\d{8}\b/g)].map((m) => m[0]);
    expect(hit, 'nomor faktur pajak karangan di view: ' + hit.join(' | ')).toEqual([]);
  });
});

/* ------------------------------------------------------------------
   (b) FT2 — setiap baris membawa penanda asal secara POSITIF.
   ------------------------------------------------------------------ */
describe('FT2 · yang ilustratif ditandai sebagai ilustratif', () => {
  it('view merender penanda dari `provenance`, bukan dari ada-tidaknya chip', () => {
    const k = kode();
    /* Pola lama: `p.canon && <span className="chip …">SSOT</span>` — tanda hanya
       muncul untuk yang kanonik. Pola baru: satu komponen penanda yang WAJIB
       menerima provenance setiap baris. */
    expect(k, 'penanda asal per-baris tak dirender').toMatch(/<ProvChip\b/);
    expect(k).not.toMatch(/\bcanon\s*&&/);
  });

  it('ketiga keadaan asal punya label yang terlihat', () => {
    const k = kode();
    expect(k, 'label penanda harus datang dari modul murni').toMatch(/PROVENANCE_LABEL/);
  });

  it('tabel PPh Pot/Put juga dirakit oleh perakit murni', () => {
    expect(kode(), 'tabel Pot/Put masih dirakit di view').toMatch(/pphSummaryRows\s*\(/);
  });

  it('tabel yang seluruh barisnya ilustratif menyatakannya sekali di tingkat tabel', () => {
    const k = kode();
    /* Idiom yang sudah dipakai repo (view_firmrevenue, tab SPT di berkas ini,
       view_firmtreasury): satu banner amber "ILUSTRASI demo". Kalender kewajiban,
       e-Faktur, dan pajak tangguhan seluruhnya berasal dari seed — masing-masing
       harus mengatakannya, bukan mengandalkan pembaca menyimpulkan. */
    const banner = [...k.matchAll(/ILUSTRASI/g)].length;
    expect(banner, 'jumlah banner ILUSTRASI (kalender · e-Faktur · SPT · tangguhan)')
      .toBeGreaterThanOrEqual(4);
  });
});

/* ------------------------------------------------------------------
   (d) FT3 — penandaan "sudah lapor" butuh identitas sesi NYATA.
   ------------------------------------------------------------------ */
describe('FT3 · jejak pelaporan pajak memakai identitas sesi', () => {
  it('pelaku TIDAK diambil dari seed `AMS.USER`', () => {
    const hit = [...kode().matchAll(/AMS\s*\.\s*USER/g)].map((m) => m[0]);
    expect(hit, 'pelaku dari seed: ' + hit.join(' | ')).toEqual([]);
    expect(kode()).not.toMatch(/\|\|\s*'Pengguna'/);
  });

  it('pelaku diturunkan dari sesi lewat `glActor`', () => {
    expect(kode()).toMatch(/glActor\s*\(/);
  });

  it('izin menulis dirakit dari kapabilitas DAN pelaku sesi', () => {
    /* `canFile` harus lahir dari `glWriteAllowed(canEdit, who)` — bukan dari
       `canEdit` saja, dan bukan dari predikat baru yang diketik ulang di sini. */
    expect(kode()).toMatch(/const\s+canFile\s*=\s*glWriteAllowed\s*\(\s*canEdit\s*,\s*who\s*\)/);
  });

  it('`markFiled` berpagar `canFile`, bukan `canEdit`', () => {
    const k = kode();
    const at = k.indexOf('const markFiled');
    expect(at, '`markFiled` tak ditemukan').toBeGreaterThan(-1);
    const badan = k.slice(at, at + 520);
    expect(badan).toMatch(/if\s*\(\s*!\s*canFile\b/);
    /* Penjaga lama `if (!canEdit) return;` sendirian tidak cukup: ia meloloskan
       tulisan yang jejaknya tak punya pemilik. */
    expect(badan).not.toMatch(/if\s*\(\s*!\s*canEdit\s*\)\s*return\s*;/);
  });

  it('tombol "Tandai Lapor" ikut padam ketika pelakunya tak diketahui', () => {
    /* Gerbang tulis yang hanya ada di dalam handler akan tampil sebagai tombol
       hidup yang diam-diam tak melakukan apa pun ketika ditekan. */
    const k = kode();
    expect(k).toMatch(/\{\s*\(?o\.status[^}]*canFile/);
    expect(k, 'kontrol masih dinilai dengan `canEdit`').not.toMatch(/\?\s*<button className="btn sm"[^>]*Tandai/);
  });
});

/* ------------------------------------------------------------------
   (FT5) impor ESM, bukan global.
   ------------------------------------------------------------------ */
describe('FT5 · TAX23 diimpor sebagai modul ESM', () => {
  it('nol pembacaan `window.TAX23` di view', () => {
    const hit = [...kode().matchAll(/window\s*\.\s*TAX23/g)].map((m) => m[0]);
    expect(hit, 'global TAX23 masih dibaca: ' + hit.join(' | ')).toEqual([]);
  });

  it('TAX23 diimpor dari data_pph23', () => {
    expect(src()).toMatch(/import\s*\{[^}]*\bTAX23\b[^}]*\}\s*from\s*'\.\/data_pph23'/);
  });
});
