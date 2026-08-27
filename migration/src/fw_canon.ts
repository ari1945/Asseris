/* ============================================================
   PENENTU KERANGKA — MESIN & PORTOFOLIO (PR-1 · D1 + D2)

   Sebelum berkas ini, `view_framework.tsx` memikul mesin penentu DAN sebuah
   larik `FW_PORTFOLIO` berisi 9 entri literal. Delapan di antaranya membayangi
   `AMS.CLIENTS` dengan `id` yang sama, dan dua MEMBANTAH sumbernya: C-031 dan
   C-063 diberi sufiks "Tbk" yang tidak ada di `data_part1`. Entri kesembilan
   (CMP-071) bukan klien sama sekali. Komentar di atas larik itu menyatakan
   datanya "disintesis dari CLIENTS" — berkas itu nol impor data.

   Angkanya pun karangan, dan pada satu kasus MENGUBAH DASAR PENETAPAN:
   C-047 literal (penjualan 18 M · modal 6 M) menyimpulkan lewat gerbang 3
   ("UMKM yang naik karena kompleksitas"), sedangkan neraca saldo nyata
   (44,8 M · ekuitas 16,3 M) menyimpulkan lewat gerbang 2 ("entitas besar").
   Kerangkanya kebetulan sama — SAK EP — tetapi alasan yang ditampilkan salah,
   dan alasan itulah keluaran auditnya.

   ------------------------------------------------------------
   DUA JENIS MASUKAN, DIBEDAKAN — inti perbaikannya

   Kerangka ditentukan oleh dua hal yang secara mendasar berbeda, dan cacat D1
   lahir karena keduanya diperlakukan sama (sama-sama literal di larik):

     FAKTA TERUKUR      penjualan · ekuitas · status tercatat
                        → turunan kanon, TIDAK dapat disunting

     PERTIMBANGAN       fidusia · kompleksitas · pilihan naik sukarela
                        → jawaban penilai; default TAK-DIKETAHUI (null)

   `false` berarti "sudah dinilai, jawabannya tidak". `null` berarti "belum
   ada yang menilai". Menyamakan keduanya adalah jalan menuju kerangka yang
   salah tanpa jejak: entitas jasa keuangan non-tercatat yang bidang fidusianya
   belum diisi akan diam-diam lolos gerbang 1 dan mendarat di SAK EP, padahal
   jawaban "ya" akan menempatkannya di SAK. Karena itu mesin di bawah MENOLAK
   menyimpulkan selama masukan yang determinatif pada jalurnya belum dijawab.

   Pohon keputusan, ambang UMKM, dan seluruh teks normatif TIDAK berubah dari
   versi sebelumnya — yang berpindah hanya sumber angkanya.
   ============================================================ */
import { CLIENTS, ENGAGEMENTS, WTB as WTB_ENG014 } from './data_part1';
import { WTB_BY_ENGAGEMENT } from './data_wtb_eng';
import { entityFigures } from './canon_base';
import type { WTB } from './canon_types';

/* ---- ambang UMKM (UU 20/2008 jo. PP 7/2021) — Rp penuh ---- */
export const FW_SALES_CEIL = 50e9;   /* batas atas penjualan tahunan */
export const FW_CAP_CEIL = 10e9;     /* batas atas modal usaha, di luar tanah & bangunan */

export type FwCode = 'SAK' | 'SAK EP' | 'SAK EMKM';
export type FwBranch = 'pa' | 'big' | 'ep' | 'emkm';

/** Jawaban pertimbangan: `null` = BELUM DIJAWAB, bukan "tidak". */
export type Tri = boolean | null;

/** Masukan pertimbangan penilai — satu-satunya bagian yang boleh disunting manusia. */
export interface FwJudgement {
  fiduciary: Tri;
  complex: Tri;
  elect: Tri;
}

export const FW_JUDGEMENT_KOSONG: FwJudgement = { fiduciary: null, complex: null, elect: null };

/** Label manusiawi tiap pertimbangan — dipakai UI & pesan `pending`. */
export const FW_JUDGEMENT_LABEL: Record<keyof FwJudgement, string> = {
  fiduciary: 'Menguasai aset dalam kapasitas fidusia bagi sekelompok besar masyarakat?',
  complex: 'Kompleksitas transaksi / kebutuhan pengguna LK menuntut kerangka lebih tinggi?',
  elect: 'Entitas memilih naik ke SAK EP secara sukarela?',
};

export interface FwInput extends FwJudgement {
  listed: boolean;
  /** Rp penuh; `null` = neraca saldo belum tersedia. */
  sales: number | null;
  capital: number | null;
}

export interface FwResult {
  /** `null` = belum dapat disimpulkan (lihat `pending`). */
  fw: FwCode | null;
  gate: 1 | 2 | 3 | null;
  branch: FwBranch | null;
  why: string;
  /** Masukan determinatif yang belum dijawab; kosong bila `fw` terisi. */
  pending: string[];
  /** Bidang yang menunggu jawaban — supaya UI dapat menawarkan kontrolnya
      langsung, bukan sekadar menampilkan kalimat keluhan. `figures` berarti
      neraca saldo belum ada dan tak dapat dijawab manusia. */
  pendingKeys: (keyof FwJudgement | 'figures')[];
}

/* ============================================================
   MESIN PENENTU — satu sumber kebenaran
   ============================================================ */
export function fwDetermine(e: FwInput): FwResult {
  const ok = (fw: FwCode, gate: 1 | 2 | 3, branch: FwBranch, why: string): FwResult =>
    ({ fw, gate, branch, why, pending: [], pendingKeys: [] });
  const tunggu = (gate: 1 | 2 | 3, why: string, keys: (keyof FwJudgement | 'figures')[]): FwResult =>
    ({ fw: null, gate, branch: null, why, pendingKeys: keys,
       pending: keys.map(k => (k === 'figures' ? 'Penjualan tahunan & modal usaha (dari neraca saldo)' : FW_JUDGEMENT_LABEL[k])) });

  /* ---- Gerbang 1 · akuntabilitas publik ---- */
  if (e.listed) {
    return ok('SAK', 1, 'pa', 'Tercatat / dalam proses pendaftaran di pasar modal — memiliki akuntabilitas publik (emiten/perusahaan publik).');
  }
  if (e.fiduciary === true) {
    return ok('SAK', 1, 'pa', 'Menguasai aset dalam kapasitas fidusia bagi sekelompok besar masyarakat sebagai salah satu usaha utamanya (lembaga jasa keuangan).');
  }
  /* Belum dijawab TIDAK boleh dibaca sebagai "tidak": akuntabilitas publik
     belum dapat disingkirkan, sehingga gerbang 2 belum boleh dibuka. */
  if (e.fiduciary === null) {
    return tunggu(1, 'Akuntabilitas publik belum dapat disingkirkan — uji fidusia belum dijawab.', ['fiduciary']);
  }

  /* ---- Gerbang 2 · kriteria UMKM ---- */
  if (e.sales === null || e.capital === null) {
    return tunggu(2, 'Ukuran usaha belum terukur — neraca saldo perikatan belum tersedia.', ['figures']);
  }
  const umkm = e.capital <= FW_CAP_CEIL && e.sales <= FW_SALES_CEIL;
  if (!umkm) {
    return ok('SAK EP', 2, 'big', 'Tanpa akuntabilitas publik, namun melampaui ambang UMKM (entitas besar) → wajib SAK EP.');
  }

  /* ---- Gerbang 3 · kebutuhan pengguna / kompleksitas ---- */
  if (e.complex === true || e.elect === true) {
    const why = e.elect === true && e.complex !== true
      ? 'Memenuhi kriteria UMKM, tetapi entitas memilih naik ke SAK EP secara sukarela.'
      : 'Memenuhi kriteria UMKM, namun kompleksitas transaksi / kebutuhan pengguna LK menuntut kerangka SAK EP.';
    return ok('SAK EP', 3, 'ep', why);
  }
  /* SAK EMKM hanya boleh disimpulkan bila KEDUANYA sudah dijawab "tidak". */
  const belum: (keyof FwJudgement)[] = [];
  if (e.complex === null) belum.push('complex');
  if (e.elect === null) belum.push('elect');
  if (belum.length) {
    return tunggu(3, 'Memenuhi kriteria UMKM, tetapi uji kompleksitas / pilihan sukarela belum dijawab — SAK EMKM belum dapat disimpulkan.', belum);
  }
  return ok('SAK EMKM', 3, 'emkm', 'Tanpa akuntabilitas publik, memenuhi kriteria UMKM, dan kebutuhan pelaporan sederhana → SAK EMKM.');
}

/* ---- tingkat UMKM dari modal usaha (PP 7/2021) ---- */
export function fwUmkmTier(cap: number | null, sales: number | null): string {
  if (cap === null || sales === null) return 'Belum terukur';
  if (cap > FW_CAP_CEIL || sales > FW_SALES_CEIL) return 'Besar';
  if (cap > 5e9 || sales > 15e9) return 'Menengah';
  if (cap > 1e9 || sales > 2e9) return 'Kecil';
  return 'Mikro';
}

/* ============================================================
   NERACA SALDO PER PERIKATAN — resolver gabungan

   WTB ENG-2025-014 tinggal di `data_part1` (sejarah); enam sisanya di
   `data_wtb_eng`. Resolver ini menyatukan keduanya supaya pemanggil tak perlu
   tahu pembagian itu. SENGAJA tanpa fallback ke WTB manapun bila id tak
   dikenal: mengembalikan neraca saldo perikatan LAIN adalah persis kebocoran
   yang ditutup PR-J.
   ============================================================ */
export function wtbForEngagement(engId: string): WTB | undefined {
  if (engId === 'ENG-2025-014') return WTB_ENG014 as unknown as WTB;
  return WTB_BY_ENGAGEMENT[engId] as unknown as WTB | undefined;
}

/* ============================================================
   PORTOFOLIO — dirakit dari CLIENTS + ENGAGEMENTS + neraca saldo
   ============================================================ */
export interface FwEntity extends FwInput {
  id: string;
  name: string;
  sector: string;
  /** label perikatan, atau `null` bila klien belum punya perikatan berjalan. */
  eng: string | null;
  engId: string | null;
  /** false → `sales`/`capital` null; angka TIDAK dikarang. */
  figuresAvailable: boolean;
}

export type FwJudgements = Record<string, Partial<FwJudgement>>;

/** Perikatan pertama milik sebuah klien (urutan `ENGAGEMENTS` = urutan sumber). */
function engagementFor(clientId: string) {
  return ENGAGEMENTS.find(g => g.clientId === clientId);
}

/**
 * Portofolio kerangka seluruh klien firma.
 *
 * Identitas (nama · sektor · status tercatat) berasal dari `AMS.CLIENTS`, dan
 * figur ukuran usaha dari `entityFigures()` atas neraca saldo perikatannya —
 * tak satu pun ditulis ulang di sini. Klien tanpa perikatan (mis. C-052 yang
 * masih berstatus Proposal) mendapat `figuresAvailable:false` dan figur `null`,
 * BUKAN nol: nol adalah angka, dan angka yang tak diketahui bukan nol.
 */
export function fwPortfolio(judgements: FwJudgements = {}): FwEntity[] {
  return CLIENTS.map((c): FwEntity => {
    const g = engagementFor(c.id);
    const wtb = g ? wtbForEngagement(g.id) : undefined;
    const f = entityFigures(wtb, 'unadj');
    const j = { ...FW_JUDGEMENT_KOSONG, ...(judgements[c.id] || {}) };
    return {
      id: c.id,
      name: c.name,
      sector: c.industry,
      eng: g ? g.type + ' · ' + g.fy : null,
      engId: g ? g.id : null,
      listed: c.listed,
      fiduciary: j.fiduciary,
      complex: j.complex,
      elect: j.elect,
      /* `revenue`/`equity` sudah dikoreksi tandanya oleh entityFigures. */
      sales: f.available ? f.revenue : null,
      capital: f.available ? f.equity : null,
      figuresAvailable: f.available,
    };
  });
}

/** Kerangka satu klien — selektor tunggal untuk modul hilir (menutup D2/D3). */
export function frameworkFor(clientId: string, judgements: FwJudgements = {}): FwResult {
  const ent = fwPortfolio(judgements).find(e => e.id === clientId);
  if (!ent) {
    return { fw: null, gate: null, branch: null, why: 'Klien tidak dikenal: ' + clientId, pending: ['Identitas klien'], pendingKeys: [] };
  }
  return fwDetermine(ent);
}

/* ============================================================
   PROFIL KERANGKA — apa yang BOLEH terbit di bawah tiap kerangka (PR-3..PR-5)

   D3: modul hilir (`fsgen`, `opinion`, `compmatrix`) mengasumsikan SAK penuh
   tanpa syarat — CALK memaku PSAK 1/24/71/72/73 dan opini memaku "SA 700/705/701".
   Akibatnya aplikasi dapat menetapkan SAK EMKM di satu layar lalu menerbitkan
   CALK ber-PSAK 73 dan opini penyajian wajar di layar lain, tanpa satu pun
   kontradiksi terdeteksi.

   Profil di bawah adalah SATU tempat yang menyatakan konsekuensi tiap kerangka,
   supaya modul hilir MENANYAKAN alih-alih MENGASUMSIKAN. Sengaja berupa DATA,
   bukan rangkaian `if` yang tersebar: aturan yang tersebar tak dapat diperiksa
   sebagai satu kesatuan, dan itulah cara D3 bisa hidup bertahun-tahun.

   Rujukan: SAK EMKM (DSAK-IAI) — biaya historis, tanpa pajak tangguhan, tiga
   laporan; SAK EP — modul mandiri, pengukuran nilai wajar terbatas; SAK — PSAK
   berbasis IFRS lengkap.
   ============================================================ */
export interface FwProfile {
  /** Jumlah komponen laporan keuangan minimum. */
  statements: number;
  /** Pajak tangguhan diakui (PSAK 46)? SAK EMKM: tidak. */
  deferredTax: boolean;
  /** Konsolidasi diwajibkan? SAK EMKM: tidak. */
  consolidation: boolean;
  /** Kedalaman daftar-uji pengungkapan. */
  disclosureDepth: 'penuh' | 'proporsional' | 'minimal';
  /** Bentuk opini auditor. */
  opinionForm: string;
  /** Kerangka bertujuan KHUSUS (SA 800) alih-alih penyajian wajar umum (SA 700)? */
  specialPurpose: boolean;
  /**
   * PSAK yang BOLEH dirujuk di CALK. Daftar-putih, bukan daftar-hitam: standar
   * baru yang tak dikenal otomatis TERTOLAK di kerangka sempit, alih-alih lolos
   * diam-diam. Kosong berarti "tak ada rujukan PSAK bernomor" (SAK EMKM merujuk
   * SAK EMKM itu sendiri, bukan seri PSAK).
   */
  psakAllowed: readonly string[];
}

const PSAK_PENUH = [
  'PSAK 1', 'PSAK 2', 'PSAK 8', 'PSAK 14', 'PSAK 16', 'PSAK 19', 'PSAK 24',
  'PSAK 25', 'PSAK 46', 'PSAK 48', 'PSAK 65', 'PSAK 66', 'PSAK 68', 'PSAK 71',
  'PSAK 72', 'PSAK 73',
] as const;

/* SAK EP: satu buku mandiri. Rujukan PSAK bernomor yang bertahan hanyalah topik
   yang memang diatur setara & sederhana; instrumen/konsolidasi/nilai wajar luas
   (71 · 72 · 73 · 65 · 66 · 68) TIDAK dirujuk sebagai PSAK penuh. */
const PSAK_EP = [
  'PSAK 1', 'PSAK 2', 'PSAK 8', 'PSAK 14', 'PSAK 16', 'PSAK 19', 'PSAK 24',
  'PSAK 25', 'PSAK 46',
] as const;

const FW_PROFILE: Record<FwCode, FwProfile> = {
  'SAK': {
    statements: 5, deferredTax: true, consolidation: true,
    disclosureDepth: 'penuh',
    opinionForm: 'SA 700 — kerangka bertujuan umum penyajian wajar',
    specialPurpose: false, psakAllowed: PSAK_PENUH,
  },
  'SAK EP': {
    statements: 5, deferredTax: true, consolidation: true,
    disclosureDepth: 'proporsional',
    opinionForm: 'SA 700 — kerangka bertujuan umum penyajian wajar',
    specialPurpose: false, psakAllowed: PSAK_EP,
  },
  'SAK EMKM': {
    statements: 3, deferredTax: false, consolidation: false,
    disclosureDepth: 'minimal',
    opinionForm: 'SA 700/800 — basis akuntansi sesuai SAK EMKM',
    specialPurpose: true, psakAllowed: [],
  },
};

/** Profil kerangka. `null` bila kerangka belum ditetapkan — pemanggil WAJIB
    menjaganya, dan TIDAK boleh jatuh ke profil SAK penuh sebagai default. */
export function fwProfile(fw: FwCode | null): FwProfile | null {
  return fw ? FW_PROFILE[fw] : null;
}

/** Apakah sebuah rujukan PSAK boleh terbit di bawah kerangka ini? */
export function fwAllowsPsak(fw: FwCode | null, psak: string): boolean {
  const p = fwProfile(fw);
  if (!p) return false;   /* kerangka belum ditetapkan → tak ada yang boleh terbit */
  return p.psakAllowed.includes(psak);
}
