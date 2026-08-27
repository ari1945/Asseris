/* ============================================================
   AP/AR Firma — gerbang SUMBER atas `view_firmgl.tsx` (fungsi `FirmAPAR`) dan
   `view_pipeline.tsx` (fungsi `Billing`).

   Berkas ini membaca SUMBERNYA, bukan hasil render, karena cacat yang ditutup arc
   ini adalah cacat KABEL: mesin yang benar (`FIRMFIN.arAging` · `FIRMFIN.ap` ·
   `FIRMFIN.reconciliations`) sudah ada dan teruji — pemanggilnya yang mengirim ctx
   tak lengkap, lalu diam-diam dilayani data seed.

     A1  ctx rekonsiliasi tanpa `invoices`/`firmap` ⇒ sub-buku beku.
     A2  `const ar: any = AMS.INVOICES` ⇒ dua register untuk satu konsep piutang.
     A4  `who = (AMS.USER && AMS.USER.name) || 'Pengguna'` ⇒ jejak `AP_PAY` seed.
     A5  fallback angka keuangan karangan sebagai basis DSO/DPO.

   Melengkapi `firm_gl_conventions.test.ts`, yang irisannya sengaja BERHENTI sebelum
   `FirmJVForm` dan karena itu tak pernah memindai `FirmAPAR`.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/* Komentar dibuang lebih dulu: berkas-berkas ini mengutip pola lama sebagai catatan
   sejarah, dan gerbang yang memindai komentar akan menuduh catatan itu sendiri. */
const kode = (path: string): string => readFileSync(join(__dirname, path), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^[ \t]*\/\/.*$/gm, '');

/** Irisan satu fungsi tingkat-atas sampai `function` tingkat-atas berikutnya. */
const irisan = (path: string, nama: string): string => {
  const k = kode(path);
  const start = k.indexOf('function ' + nama + '()');
  if (start < 0) throw new Error('fungsi tak ditemukan: ' + nama + ' di ' + path);
  const rest = k.slice(start + 1);
  const end = rest.search(/\nfunction \w+\(/);
  return end > 0 ? rest.slice(0, end) : rest;
};

const firmApar = (): string => irisan('view_firmgl.tsx', 'FirmAPAR');
const firmGl = (): string => irisan('view_firmgl.tsx', 'FirmGL');
const billing = (): string => irisan('view_pipeline.tsx', 'Billing');

/* ------------------------------------------------------------------
   (f) Nol pembacaan seed faktur langsung di FirmAPAR.
   ------------------------------------------------------------------ */
describe('A2 · FirmAPAR membaca register faktur yang hidup', () => {
  it('tidak ada satu pun pembacaan `AMS.INVOICES` sebagai daftar kerja', () => {
    /* Satu-satunya rujukan yang sah adalah SEED register-nya — argumen `initial`
       `useAmsPersist('invoices', () => AMS.INVOICES)`, persis seperti yang ditulis
       Billing. Rujukan itu dibuang dulu; sisanya berarti modul ini kembali membaca
       daftar seed dan bukan register yang hidup. */
    const tanpaSeed = firmApar()
      .replace(/useAmsPersist\(\s*'invoices'\s*,\s*\(\)\s*=>\s*AMS\.INVOICES\s*\)/g, '');
    const hit = [...tanpaSeed.matchAll(/AMS\s*\.\s*INVOICES/g)].map((m) => m[0]);
    expect(hit, 'pembacaan seed faktur di FirmAPAR: ' + hit.join(' | ')).toEqual([]);
  });

  it('register faktur dibaca lewat PINTU yang SAMA dengan yang ditulis Billing', () => {
    /* Bentuk awal uji ini menuntut `useAmsPersist('invoices')` MENTAH di kedua modul.
       Itu memaku implementasi, bukan maksudnya — dan bertabrakan dengan alasan
       `use_invoices.ts` (#275) ada: `useServerState` tak punya broadcast
       lintas-instance (gotcha arc #237), jadi setiap pemanggil yang membuka
       instance-nya sendiri menambah salinan state yang bisa menyimpang. Yang harus
       dijamin adalah SATU PINTU, bukan satu pemanggilan hook tingkat rendah. */
    expect(firmApar()).toMatch(/useInvoiceRegister\s*\(/);
    expect(billing()).toMatch(/useInvoiceRegister\s*\(/);
    /* Dan tak seorang pun boleh menyelinap lewat pintu belakang. */
    expect(firmApar()).not.toMatch(/useAmsPersist\(\s*'invoices'/);
  });

  it('register UTANG juga lewat pintu tunggalnya, bukan `useAmsPersist` mentah', () => {
    /* `firmap` adalah sub-buku akun kontrol `2-100` — sisi lain dari baris
       rekonsiliasi yang sama. Ia butuh pintu yang sama alasannya dengan `invoices`. */
    expect(firmApar()).toMatch(/useFirmApRegister\s*\(/);
    expect(firmApar()).not.toMatch(/useAmsPersist\(\s*'firmap'/);
  });
});

/* ------------------------------------------------------------------
   (c) Satu sumber angka piutang untuk kedua modul.
   ------------------------------------------------------------------ */
describe('A2 · piutang outstanding diturunkan dari satu mesin', () => {
  it('FirmAPAR mengambil piutang & utang terbuka dari mesin, bukan menjumlah sendiri', () => {
    const k = firmApar();
    expect(k).toMatch(/arAging\s*\(/);
    /* Nilainya DIBACA dari model mesin (`.open`), bukan direduksi ulang di view. */
    expect(k).toMatch(/const\s+arOutstanding\s*=\s*\w+\.open\b/);
    expect(k).toMatch(/const\s+apOutstanding\s*=\s*\w+\.open\b/);
    expect(k).not.toMatch(/const\s+arOutstanding\s*=\s*\w+\s*\.\s*filter\(/);
  });

  /* KARANTINA s/d keputusan Ari (CLAUDE.md §2 R-7) — cacat NYATA, sengaja belum ditutup.
     `view_pipeline.tsx` (Billing) menurunkan piutang outstanding dari `invoiceTotals()`
     (canon_invoices, #275); `FirmAPAR` menurunkannya dari `FIRMFIN.arAging().open`. Dua
     mesin kanonik untuk SATU konsep, dan keduanya menjawab beda pada faktur DRAFT
     ber-uang-muka: `invoiceTotals` menjumlahkan `paid`-nya, `arAging` mengeluarkan
     draft dari populasi terbuka.
     TIDAK diputuskan di sini: menyatukannya MENGGESER angka headline modul Billing —
     pemicu "tulis usulan lalu BERHENTI" (00-LANJUTKAN.md §D). Pertanyaan yang harus
     dijawab: mana yang kanonik untuk "piutang terbuka", dan apakah faktur draft
     ber-uang-muka termasuk populasinya?
     `it.fails()`, bukan `skip`: begitu seseorang menyatukannya, uji ini BERBALIK MERAH
     dan memaksa karantina ini dicabut — bukan diam-diam jadi kode mati. */
  it.fails('Billing mengambil piutang terbuka dari mesin yang sama', () => {
    const k = billing();
    expect(k).toMatch(/arAging\s*\(/);
    expect(k).toMatch(/const\s+outstanding\s*=\s*[\s\S]{0,80}?\.open\b/);
    /* `Σ ditagih − Σ terkumpul` menjumlahkan `paid` faktur DRAFT yang nilainya tak
       pernah masuk `totalBilled` — rumus kedua untuk satu konsep. */
    expect(k).not.toMatch(/const\s+outstanding\s*=\s*totalBilled\s*-\s*collected/);
  });
});

/* ------------------------------------------------------------------
   (a/b) ctx rekonsiliasi memuat KEDUA sub-buku — di SETIAP pemanggilnya.
   ------------------------------------------------------------------ */
describe('A1 · ctx rekonsiliasi menyalurkan sub-buku yang hidup', () => {
  it('FirmGL mengirim `invoices` dan `firmap` ke dalam ctx', () => {
    const k = firmGl();
    expect(k).toMatch(/reconciliations\s*\(\s*\{[^}]*invoices/);
    expect(k).toMatch(/reconciliations\s*\(\s*\{[^}]*firmap/);
  });

  it('Firm Finance memakai ctx yang sama — dua layar tak boleh menjawab beda', () => {
    /* `view_firmfinance.tsx` merender BARIS REKONSILIASI YANG SAMA dan mengunci
       ekspornya dengan gerbang yang sama. Kalau ctx-nya berbeda, satu layar bisa
       hijau sementara layar lain merah untuk pertanyaan yang identik. */
    const k = kode('view_firmfinance.tsx');
    const ctx = k.match(/const ctx = useMemoFF\(\(\) => \(\{[^}]*\}\)/);
    expect(ctx, 'ctx FIRMFIN di view_firmfinance tak ditemukan').not.toBeNull();
    expect(ctx && ctx[0]).toMatch(/invoices/);
    expect(ctx && ctx[0]).toMatch(/firmap/);
  });
});

/* ------------------------------------------------------------------
   (d) Tidak ada aksi tulis yang tercatat tanpa identitas sesi nyata.
   ------------------------------------------------------------------ */
describe('A4 · jejak pembayaran memakai identitas sesi', () => {
  it('pelaku TIDAK diambil dari seed `AMS.USER`', () => {
    const hit = [...firmApar().matchAll(/AMS\s*\.\s*USER/g)].map((m) => m[0]);
    expect(hit, 'pelaku dari seed di FirmAPAR: ' + hit.join(' | ')).toEqual([]);
    expect(firmApar()).not.toMatch(/\|\|\s*'Pengguna'/);
  });

  it('pelaku diturunkan dari sesi lewat `glActor`', () => {
    expect(firmApar()).toMatch(/glActor\s*\(/);
  });

  it('`payAp` menolak menulis tanpa kapabilitas DAN tanpa pelaku sesi', () => {
    const k = firmApar();
    const at = k.indexOf('const payAp');
    expect(at, '`payAp` tak ditemukan di FirmAPAR').toBeGreaterThan(-1);
    const badan = k.slice(at, at + 420);
    expect(badan).toMatch(/glWriteAllowed\s*\(/);
    /* Penjaga lama `if (!canEdit) return;` sendirian tidak cukup: ia meloloskan
       tulisan yang jejaknya tak punya pemilik. */
    expect(badan).not.toMatch(/if\s*\(\s*!\s*canEdit\s*\)\s*return\s*;/);
  });
});

/* ------------------------------------------------------------------
   (e) Tidak ada basis laba-rugi karangan di dalam view.
   ------------------------------------------------------------------ */
describe('A5 · DSO/DPO tanpa angka karangan', () => {
  it('tidak ada literal pendapatan/beban firma sebagai fallback', () => {
    const hit = [...firmApar().matchAll(/\d[\d_]{8,}/g)].map((m) => m[0]);
    expect(hit, 'literal keuangan di FirmAPAR: ' + hit.join(' | ')).toEqual([]);
  });

  it('rasio dihitung lewat modul murni yang bisa mengembalikan "tak tersedia"', () => {
    const k = firmApar();
    expect(k).toMatch(/dsoDays\s*\(/);
    expect(k).toMatch(/dpoDays\s*\(/);
    expect(k).toMatch(/daysLabel\s*\(/);
    /* Pembagian mentah di view = jalan pintas yang menghidupkan lagi Infinity/NaN. */
    expect(k).not.toMatch(/Math\.round\([^)]*\/[^)]*365/);
  });
});
