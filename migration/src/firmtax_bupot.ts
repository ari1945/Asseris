/* ============================================================
   Pajak Firma — perakitan baris bukti potong & PPh Pot/Put, murni & teruji.

   Cacat yang dipaku di sini (view_firmtax.tsx:44-50 sebelum perubahan):

     const ebupotFeb = [
       ...(T23 ? window.TAX23.register().filter(r => r.masa === '2026-02').map(…) : []),
       { no: '1.2-02.26-0001849', jenis: 'PPh 4(2)', pihak: 'PT Properti Graha Kantor',
         dpp: 480_000_000, rate: '10%', tax: 48_000_000 },
       { no: '1.1-02.26-0009921', jenis: 'PPh 21', pihak: '38 karyawan (kolektif)',
         dpp: 1_400_000_000, rate: 'TER', tax: 210_000_000 },
     ];

   Dua hal berbeda kelas terjadi di sana sekaligus.

   SATU — NOMOR DOKUMEN DIKARANG. Nomor Bukti Potong Unifikasi adalah identitas
   dokumen yang diterbitkan di Coretax dan dilaporkan ke DJP; ia melekat pada
   lawan transaksi sebagai kredit pajaknya. Angka boleh ilustratif, identitas
   dokumen tidak. Karena itu `no` di sini bertipe `string | null`: hanya baris
   yang benar-benar berasal dari register yang boleh punya nomor, dan baris lain
   TIDAK DAPAT memilikinya — bukan karena disiplin penulis, melainkan karena
   perakitnya tak menyediakan jalan.

   DUA — YANG NYATA DITANDAI, YANG TIDAK NYATA DIBIARKAN POLOS. Baris kanonik
   memakai chip "SSOT"; dua baris di atas tak membawa tanda apa pun. Pembaca
   harus menyimpulkan status sebuah baris dari KETIADAAN chip, di dalam tabel
   yang sebagian besar barisnya bertanda — dan ketiadaan tidak terbaca. Karena
   itu `provenance` WAJIB pada setiap baris, dengan tiga keadaan yang semuanya
   punya label terlihat. Tak ada keadaan "tanpa penanda".

   Mengapa PPh 21 menjadi `belum-tersedia` dan PPh 4(2) menjadi `ilustrasi` —
   dua keadaan yang berbeda karena bukti yang tersedia memang berbeda:

     · PPh 21 — aplikasi ini PUNYA mesin PPh 21 (`canon_pph21.terRateOn`, dipakai
       modul `payroll`), dan mesin itu MEMBANTAH baris literalnya: roster payroll
       berisi 69 pegawai, bukan "38 karyawan"; Σ bruto Rp 1.736,9 jt, bukan
       Rp 1.400 jt; Σ PPh 21 Rp 175,5 jt, bukan Rp 210 jt. Mesin itu tetap TIDAK
       dipakai di sini, dan alasannya harus dicatat supaya tidak dikira kelalaian:
         (i)  ia hanya punya SATU masa — `AMS.PAYROLL_RATES.period` = 'Maret 2026'
              (`periodDate` 2026-03-01). Tabel ini menampilkan masa Februari 2026.
              Payroll bukan register per-masa; ia potret satu bulan.
         (ii) sumber barisnya (`payrollData`) adalah kunci PERSONAL yang
              DIFILTER-BARIS server (`server/src/personalScope.ts`). Agregat
              firma yang dibangun darinya akan MENGECIL diam-diam mengikuti siapa
              yang sedang melihat — persis kelas cacat yang arc ini tutup.
         (iii) payroll tidak menerbitkan nomor bukti potong sama sekali; formulir
              1721-A1 bersifat TAHUNAN dan statusnya di sana "Menunggu".
       Angka yang tak dapat dipertanggungjawabkan untuk masa yang diminta tidak
       diganti angka lain — barisnya berkata belum tersedia, dan menyebut alasannya.

     · PPh 4(2) — tidak ada mesin maupun register bukti potong untuk sewa final.
       Yang ada hanya agregat seed (`AMS.PPH_WITHHELD`) dan daftar pengecualian
       `TAX23.EXCLUSIONS` yang menyebut sewa final ditangani di modul ini tanpa
       satu pun angka per-transaksi. Agregatnya DIPERTAHANKAN — menghapusnya akan
       menukar kebohongan yang terlihat dengan kelalaian yang tidak terlihat,
       padahal `AMS.TAX_OBLIGATIONS` menyatakan kewajiban itu memang ada dan sudah
       dilaporkan — tetapi nomor dokumennya dibuang dan barisnya ditandai
       ilustrasi. Lawan transaksinya juga TIDAK diklaim: register pengecualian
       menyebut DUA pihak sewa final, dan membebankan seluruh DPP kepada salah
       satunya adalah atribusi karangan yang lain lagi.
   ============================================================ */

/** Asal sebuah baris. Tiga keadaan, semuanya punya label yang terlihat. */
export type Provenance = 'kanonik' | 'ilustrasi' | 'belum-tersedia';

export const PROVENANCE_LABEL: Record<Provenance, string> = {
  kanonik: 'SSOT',
  ilustrasi: 'ilustrasi',
  'belum-tersedia': 'belum tersedia',
};

/**
 * Warna chip per keadaan — token semantik repo, ditulis UTUH sebagai `var(--x)`.
 *
 * Sengaja bukan `'green' | 'amber' | 'gray'` yang dirakit jadi `var(--${tone})` di
 * view: `--gray` dan `--gray-bg` TIDAK ADA di stylesheet mana pun, dan substitusi
 * custom property yang gagal tidak melempar error — ia jatuh ke warna warisan
 * (`color`) atau transparan (`background`). Chip "belum tersedia" akan tampil tanpa
 * warna sama sekali, dan tak ada yang memberi tahu. Lebih buruk lagi, gerbang token
 * repo (`css_tokens.test.ts`) menyatakan sendiri bahwa token yang dirakit saat
 * runtime tak terbaca pemindai statis mana pun — jadi kesalahan itu tak akan
 * tertangkap. Ditulis utuh, ia ikut terpindai seperti token lain.
 */
export const PROVENANCE_TONE: Record<Provenance, { fg: string; bg: string }> = {
  kanonik: { fg: 'var(--green)', bg: 'var(--green-bg)' },
  ilustrasi: { fg: 'var(--amber)', bg: 'var(--amber-bg)' },
  'belum-tersedia': { fg: 'var(--ink-3)', bg: 'var(--surface-2)' },
};

/* ------------------------------------------------------------------
   Bentuk masukan — irisan minimal dari sumber yang sudah ada.
   ------------------------------------------------------------------ */

/** Satu baris register PPh 23 (`TAX23.register()`), irisan yang dipakai di sini. */
export interface Pph23Row {
  id: string;
  masa: string;
  name: string;
  dpp: number;
  effRate: number;
  pph: number;
  status: string;
  bupotIssued: boolean;
}

/** Satu baris agregat pemotongan seed (`AMS.PPH_WITHHELD`). */
export interface WithheldRow {
  jenis: string;
  basis: string;
  rate: string;
  dpp: number;
  tax: number;
}

/** Ringkas register PPh 23 (`TAX23.summary()`), irisan yang dipakai di sini. */
export interface Pph23Summary {
  totalDpp: number;
  totalPph: number;
}

/* ------------------------------------------------------------------
   Baris bukti potong.
   ------------------------------------------------------------------ */

export interface BupotRow {
  /** Kunci render. BUKAN nomor dokumen — sengaja dipisah supaya tak tertukar. */
  key: string;
  /** Nomor Bukti Potong Unifikasi. `null` = tidak ada nomor, dan tidak boleh dikarang. */
  no: string | null;
  jenis: string;
  /** Lawan transaksi. `null` = tidak diketahui; tidak diklaim. */
  pihak: string | null;
  dpp: number | null;
  rate: string | null;
  tax: number | null;
  /** Status penerbitan dari register. `null` bila tak ada register yang menjawab. */
  status: string | null;
  provenance: Provenance;
  /** Alasan keadaan ini, dalam kalimat yang dapat dibaca pengguna. */
  note: string;
}

/**
 * Masa yang ditampilkan tabel bukti potong. Satu tempat, dipakai untuk memfilter
 * register DAN untuk menulis judulnya — supaya "yang difilter" dan "yang tertulis"
 * tak dapat berbeda seperti sebelumnya (`'2026-02'` di kode, "Feb 2026" di judul).
 */
export const BUPOT_MASA = '2026-02';

export function bupotRows(args: {
  masa: string;
  register: readonly Pph23Row[];
  withheld: readonly WithheldRow[];
  /** Masa yang benar-benar dicakup mesin payroll (`AMS.PAYROLL_RATES.period`). */
  payrollPeriod: string | null;
}): BupotRow[] {
  const { masa, register, withheld, payrollPeriod } = args;

  const kanonik: BupotRow[] = register
    .filter((r) => r.masa === masa)
    .map((r) => ({
      key: r.id,
      no: r.id,
      jenis: 'PPh 23',
      pihak: r.name,
      dpp: r.dpp,
      rate: r.effRate + '%',
      tax: r.pph,
      status: r.bupotIssued ? 'Terbit' : 'Belum terbit',
      provenance: 'kanonik' as const,
      note: 'Register PPh 23 (TAX23) — bukti potong nyata, tertaut master vendor.',
    }));

  const rows: BupotRow[] = [...kanonik];

  const final42 = withheld.find((w) => w.jenis === 'PPh 4(2)');
  if (final42) {
    rows.push({
      key: 'ilustrasi-pph42',
      no: null,
      jenis: 'PPh 4(2)',
      pihak: null,
      dpp: final42.dpp,
      rate: final42.rate,
      tax: final42.tax,
      status: null,
      provenance: 'ilustrasi',
      note: final42.basis
        + ' — agregat seed; belum ada register bukti potong sewa final, sehingga '
        + 'nomor dokumen dan lawan transaksinya tidak dinyatakan.',
    });
  }

  const cakupanPayroll = payrollPeriod
    ? 'Mesin PPh 21 (modul Payroll) hanya mencakup masa ' + payrollPeriod + '.'
    : 'Mesin PPh 21 (modul Payroll) tidak menyatakan masa yang dicakupnya.';
  rows.push({
    key: 'belum-pph21',
    no: null,
    jenis: 'PPh 21',
    pihak: null,
    dpp: null,
    rate: null,
    tax: null,
    status: null,
    provenance: 'belum-tersedia',
    note: cakupanPayroll
      + ' Bukti potong 1721 bersifat tahunan dan tidak diterbitkan per masa, '
      + 'sehingga tak ada baris yang dapat dipertanggungjawabkan untuk masa ini.',
  });

  return rows;
}

/* ------------------------------------------------------------------
   Baris ringkas PPh Pot/Put.
   ------------------------------------------------------------------ */

export interface PphSummaryRow {
  jenis: string;
  basis: string;
  rate: string;
  dpp: number;
  tax: number;
  provenance: Provenance;
  note: string;
  /** Modul asal yang dapat dituju bila barisnya kanonik. */
  route: string | null;
}

/**
 * Tabel "PPh Pot/Put" mencampur satu baris kanonik (PPh 23, ditarik dari register)
 * dengan dua baris agregat seed. Sebelum arc ini hanya yang kanonik bertanda.
 */
export function pphSummaryRows(args: {
  withheld: readonly WithheldRow[];
  t23: Pph23Summary | null;
}): PphSummaryRow[] {
  const { withheld, t23 } = args;
  return withheld.map((w) => {
    if (w.jenis === 'PPh 23' && t23) {
      return {
        jenis: w.jenis,
        basis: 'Jasa vendor — register PPh 23 (SSOT)',
        rate: w.rate,
        dpp: t23.totalDpp,
        tax: t23.totalPph,
        provenance: 'kanonik' as const,
        note: 'Diturunkan dari register pemotongan; berubah bila registernya berubah.',
        route: 'tax',
      };
    }
    return {
      jenis: w.jenis,
      basis: w.basis,
      rate: w.rate,
      dpp: w.dpp,
      tax: w.tax,
      provenance: 'ilustrasi' as const,
      note: 'Agregat seed (AMS.PPH_WITHHELD) — belum diturunkan dari register mana pun.',
      route: null,
    };
  });
}
