/* ============================================================
   Asseris — Sensus besaran regulatori (gerbang CAKUPAN)
   PRD `docs/prd-regref-tahap-a2.md` · PR-4 · SC-A9 · SC-A10.
   ------------------------------------------------------------
   Tahap A memasang gerbang SC-9: setiap registry bertipe `RegRefSet<…>` yang
   diekspor sumber wajib terdaftar di katalog. Gerbang itu menjaga arah yang
   salah. Ia menjaga besaran yang SUDAH MENJADI `RegRefSet`; ia tak berkata
   apa-apa tentang besaran yang BELUM PERNAH menjadi satu.

   Tiga besaran lolos gerbang itu tanpa satu pun uji memerah — kewajiban PPL,
   batas rotasi AP, tarif PPh Badan — dan ketiganya ditemukan dengan MEMBACA.
   Selama penemuan bergantung pada seseorang yang kebetulan membaca berkas yang
   tepat, besaran keempat akan lolos dengan cara yang persis sama.

   Ia memang ada. Detektor di bawah menemukannya dalam satu kali jalan:
   `P2_MIN_RATE = 15.0` di `view_newdisc.tsx` — tarif minimum efektif GloBE yang
   menggerakkan estimasi eksposur top-up tax. Tak seorang pun menyebutnya.

   Berkas ini karena itu berisi DUA hal:

     1. SENSUS — inventaris besaran regulatori yang dimodelkan aplikasi ini,
        masing-masing menunjuk registry pemiliknya ATAU menyatakan apa yang
        menahannya. Katalog dan sensus saling menutup: id di satu tanpa
        pasangan di lain = merah.

     2. DETEKTOR — dua pola yang mencari besaran yang belum dinyatakan. Ia
        sempit dengan sengaja. Gerbang berisik akan dilemahkan orang berikutnya
        lalu berhenti menjaga apa pun; gerbang ini menyisakan tujuh situs di
        seluruh `migration/src`, cukup kecil untuk dinyatakan satu per satu.

   Fungsi MURNI: sumber DISUNTIKKAN, berkas dibaca oleh ujinya.
   ============================================================ */

/* ------------------------------------------------------------------
   1. Sensus
   ------------------------------------------------------------------ */

export interface RegRefCensusEntry {
  /** Id sensus. Bila berkunci masa berlaku, ia SAMA dengan id katalog. */
  id: string;
  /** Besaran apa ini, dalam bahasa manusia. */
  what: string;
  /** Dasar hukum yang menetapkannya. */
  basis: string;
  /** Id katalog `regrefCatalog()`, atau `null` bila belum berkunci masa berlaku. */
  catalogId: string | null;
  /** Bila `catalogId` null: APA yang menahannya. Wajib diisi — diam bukan jawaban. */
  pending: string;
}

export const REGREF_CENSUS: RegRefCensusEntry[] = [
  {
    id: 'bpjs',
    what: 'Tarif iuran & batas upah BPJS Kesehatan/Ketenagakerjaan',
    basis: 'PP 45/2015 Ps. 29 · Perpres JKN',
    catalogId: 'bpjs',
    pending: '',
  },
  {
    id: 'ter',
    what: 'Tabel Tarif Efektif Rata-rata PPh 21 (kategori A/B/C)',
    basis: 'PP 58/2023 jo. PMK 168/2023',
    catalogId: 'ter',
    pending: '',
  },
  {
    id: 'ptkp',
    what: 'Penghasilan Tidak Kena Pajak per status',
    basis: 'PMK 101/PMK.010/2016',
    catalogId: 'ptkp',
    pending: '',
  },
  {
    id: 'biaya-jabatan',
    what: 'Biaya jabatan 5% dengan batas tahunan',
    basis: 'PMK 250/PMK.03/2008',
    catalogId: 'biaya-jabatan',
    pending: '',
  },
  {
    id: 'hari-libur',
    what: 'Kalender hari libur nasional & cuti bersama',
    basis: 'SKB 3 Menteri (tahunan)',
    catalogId: 'hari-libur',
    pending: '',
  },
  {
    id: 'pph-badan',
    what: 'Tarif PPh Badan yang mengalikan pajak kini & pajak tangguhan',
    basis: 'UU 36/2008 Ps. 17 · Perpu 1/2020 · UU 7/2021 (HPP)',
    catalogId: 'pph-badan',
    pending: '',
  },
  {
    id: 'globe-min',
    what: 'Tarif minimum efektif GloBE (Pilar Dua) untuk estimasi top-up tax',
    basis: 'GloBE Rules OECD · PMK 136/2024',
    catalogId: 'globe-min',
    pending: '',
  },
  {
    id: 'ppl',
    what: 'Kewajiban PPL Akuntan Publik: 40 SKP, minimum terstruktur, batas tidak terstruktur, materi wajib',
    basis: 'PMK 186/PMK.01/2021 Ps. 37',
    catalogId: 'ppl',
    pending: '',
  },
  {
    id: 'rotasi-ap',
    what: 'Batas masa penugasan AP & masa jeda, terdiferensiasi per rezim',
    basis: 'PP 20/2015 Ps. 11 · POJK 13/POJK.03/2017',
    catalogId: 'rotasi-ap',
    pending: '',
  },
  {
    /* #283 (kurs) mendarat di master SESUDAH cabang ini bercabang. Katalog dan
       sensus saling menutup, jadi registry yang sudah ada wajib punya asal-usul
       di sini juga — kalau tidak, gerbang SC-A9 memerah, dan benar begitu. */
    id: 'kurs',
    what: 'Kurs tercatat & kurs penutup valas untuk penjabaran pos moneter',
    basis: 'PSAK 10 par. 23(a) & 28',
    catalogId: 'kurs',
    pending: '',
  },
  {
    id: 'globe-threshold',
    what: 'Ambang pendapatan konsolidasian tahunan untuk masuk cakupan GloBE (EUR 750 juta)',
    basis: 'OECD Model Rules Art. 1.1.1 · PMK 136/2024',
    catalogId: null,
    pending:
      'Ambangnya BELUM berkunci masa berlaku. Ia bukan kelalaian yang sama dengan tarif '
      + 'minimumnya: tarif menggerakkan estimasi top-up tax setiap kali dihitung, sedangkan '
      + 'ambang ini hanya MEMBUKA atau menutup cakupan, dan angkanya belum pernah berubah '
      + 'sejak Model Rules terbit. Registry untuknya adalah pekerjaan Tahap B — menambahnya '
      + 'sekarang berarti membuat set baru tanpa satu pun perubahan historis untuk dikunci.',
  },
  {
    id: 'ppn',
    what: 'Tarif Pajak Pertambahan Nilai',
    basis: 'UU 7/2021 (HPP) Ps. 7',
    catalogId: null,
    pending:
      'Aplikasi TIDAK menghitung PPN dari tarif: nilai PPN datang sebagai angka pada data '
      + 'e-Faktur, dan "PPN 11%" hanya judul kolom. Registry baru berguna pada hari ada '
      + 'perhitungan bertarif — mendaftarkannya sekarang akan membuat halaman referensi '
      + 'menuntut pembaruan atas angka yang tak menggerakkan apa pun.',
  },
];

/** Id yang WAJIB ada di sensus. Menambah besaran tanpa mendaftarkannya = merah. */
export const REGREF_CENSUS_EXPECTED_IDS = REGREF_CENSUS.map((e) => e.id);

/* ------------------------------------------------------------------
   2. Detektor A — konstanta yang TAMPAK regulatori
   ------------------------------------------------------------------ */

/**
 * Nama yang membuat sebuah konstanta patut ditanya.
 *
 * Sengaja TIDAK memuat `CAP` telanjang (kapabilitas RBAC) atau `REQ` telanjang
 * (permintaan PBC/cuti): keduanya menyeret puluhan berkas yang tak ada
 * hubungannya, dan gerbang yang berisik akan dilemahkan lalu mati.
 */
const CONST_VOCAB = /RATE|TARIF|PTKP|BATAS|AMBANG|THRESHOLD|IURAN|DENDA|PPH|PPN|PAJAK|TAX|SKP|ROTAT|COOLOFF|LIMIT|_TER|_REQ|_CAP/i;

/** `const NAMA = <angka>;` pada posisi kode (bukan properti objek). */
const CONST_SCALAR = /^[ \t]*(?:export[ \t]+)?const[ \t]+([A-Za-z_][A-Za-z0-9_]*)[ \t]*(?::[^=\n]{0,60})?=[ \t]*(-?\d[\d_]*(?:\.\d+)?)[ \t]*;/gm;

export interface SourceFile { file: string; text: string }

export interface ConstSiteHit { file: string; name: string; value: string }

/** Buang komentar TANPA menggeser nomor baris. */
export function stripComments(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ''))
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

export function findConstSites(files: readonly SourceFile[]): ConstSiteHit[] {
  const out: ConstSiteHit[] = [];
  for (const f of files) {
    const src = stripComments(f.text);
    CONST_SCALAR.lastIndex = 0;
    for (const m of src.matchAll(CONST_SCALAR)) {
      if (CONST_VOCAB.test(m[1])) out.push({ file: f.file, name: m[1], value: m[2] });
    }
  }
  return out;
}

export type ConstVerdict = 'regulatori' | 'bukan-regulatori';

export interface ConstSiteDecl {
  file: string;
  name: string;
  verdict: ConstVerdict;
  /** Bila `regulatori`: id sensus pemiliknya. */
  censusId?: string;
  /** Mengapa. Wajib — sebuah verdict tanpa alasan tak dapat ditinjau siapa pun. */
  why: string;
}

/**
 * Setiap situs yang ditemukan detektor, dengan putusannya.
 *
 * Tujuh baris. Sebelum arc ini ada empat belas — tujuh sisanya adalah besaran
 * regulatori yang kini hidup di registry berkunci masa berlaku.
 */
export const REGREF_CONST_SITES: ConstSiteDecl[] = [
  {
    file: 'canon_pph21.ts', name: 'BIAYA_JABATAN_RATE', verdict: 'regulatori', censusId: 'biaya-jabatan',
    why: 'Nilai milik `BIAYA_JABATAN_REGISTRY` di berkas yang sama — ia sumber setnya, bukan salinan.',
  },
  {
    file: 'canon_pph21.ts', name: 'BIAYA_JABATAN_CAP_ANNUAL', verdict: 'regulatori', censusId: 'biaya-jabatan',
    why: 'Nilai milik `BIAYA_JABATAN_REGISTRY` di berkas yang sama.',
  },
  {
    file: 'data_firmfin.ts', name: 'BLENDED_RATE', verdict: 'bukan-regulatori',
    why: 'Tarif JUAL jasa firma sendiri (Rp/jam) — ditetapkan manajemen, bukan regulator.',
  },
  {
    file: 'data_firmfin.ts', name: 'STD_RATE', verdict: 'bukan-regulatori',
    why: 'Tarif standar firma sendiri (Rp/jam) — kebijakan harga, bukan regulasi.',
  },
  {
    file: 'newdisc_derive.ts', name: 'P2_THRESHOLD_EUR', verdict: 'regulatori', censusId: 'globe-threshold',
    why: 'Ambang cakupan GloBE (EUR 750 juta). Ia TETAP literal dengan sengaja — alasannya '
      + 'tertulis pada `pending` entri sensusnya, bukan disembunyikan di sini. Tarif minimum '
      + 'di berkas yang sama (`P2_MIN_RATE`) sudah pindah ke registry berkunci masa berlaku.',
  },
  {
    file: 'portfolio_risk.ts', name: 'SIGNIFICANT_THRESHOLD', verdict: 'bukan-regulatori',
    why: 'Ambang skor risiko internal metodologi audit firma; tak ada regulator yang menetapkan 12.',
  },
  {
    file: 'view_eng2.tsx', name: 'blendedRate', verdict: 'bukan-regulatori',
    why: 'Tarif blended perikatan untuk ilustrasi anggaran — angka komersial firma.',
  },
  {
    file: 'wtb_provenance.ts', name: 'RAW_EXCERPT_LIMIT', verdict: 'bukan-regulatori',
    why: 'Batas panjang cuplikan mentah yang disimpan — kendala penyimpanan, bukan aturan.',
  },
];

/* ------------------------------------------------------------------
   3. Detektor B — literal tarif PPh Badan
   ------------------------------------------------------------------ */

/** `0.22` sebagai ANGKA (bukan bagian dari angka lain, bukan properti berdesimal). */
const CIT_LITERAL = /(?<![\w.])0\.22(?![\d])/g;

export interface CitLiteralCount { file: string; count: number }

export function countCitLiterals(files: readonly SourceFile[]): CitLiteralCount[] {
  const out: CitLiteralCount[] = [];
  for (const f of files) {
    const n = (stripComments(f.text).match(CIT_LITERAL) || []).length;
    if (n > 0) out.push({ file: f.file, count: n });
  }
  return out;
}

export interface CitLiteralDecl { file: string; count: number; why: string }

/**
 * Di mana angka 0,22 masih boleh muncul — dan mengapa ia bukan tarif pajak.
 *
 * `count` ikut dipaku: kemunculan BARU di berkas yang sudah terdaftar pun merah.
 * Tanpa itu, sebuah berkas yang lolos sekali menjadi tempat sembunyi permanen.
 */
export const CIT_LITERAL_SITES: CitLiteralDecl[] = [
  {
    file: 'canon_cit.ts', count: 2, why: 'Registry pemiliknya — set 2020–2021 dan set 2022→ berisi nilainya.',
  },
  {
    file: 'canon_part1.ts', count: 4,
    why: 'Proporsi persediaan/aset (bahan baku 22%, bobot varian, tingkat penyelesaian, kematangan) — bukan tarif.',
  },
  {
    file: 'canon_pipeline_fee.ts', count: 1, why: 'Bobot grade Manager dalam campuran tim — angka metodologi harga.',
  },
  {
    file: 'canon_pph21.ts', count: 1, why: 'Lapisan tarif TER kategori B (23 juta–125 juta) — tarif PPh 21, bukan PPh Badan.',
  },
  {
    file: 'data_fpm.ts', count: 4, why: 'Porsi anggaran & realisasi fase Finalisasi (22% dari fee) — bobot rencana.',
  },
  {
    file: 'view_cockpit.tsx', count: 1, why: 'Langkah opasitas heatmap kepadatan jadwal.',
  },
  {
    file: 'view_firmtreasury.tsx', count: 1, why: 'Kuota mingguan pertama pola arus kas — bobot musiman.',
  },
  {
    file: 'view_risk.tsx', count: 1, why: 'Opasitas sel matriks risiko yang kosong.',
  },
];
