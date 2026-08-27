/* ============================================================
   PR-1 — gerbang D1 (SSOT masukan) + D2 (mesin punya pemanggil)

   Yang dijaga di sini, dan mengapa masing-masing pernah gagal:

   S1  Identitas portofolio = `AMS.CLIENTS`, byte per byte. Versi lama menyalin
       9 entri sebagai literal dan DUA di antaranya membantah sumbernya
       (C-031 & C-063 diberi sufiks "Tbk" yang tak ada di `data_part1`), plus
       satu entri (CMP-071) yang bukan klien sama sekali.

   S2  Figur ukuran usaha TURUNAN neraca saldo, bukan literal. Menguji
       "angkanya benar" saja tidak cukup — literal yang kebetulan benar juga
       lolos. Karena itu di bawah diuji dua sisi: sama dengan `entityFigures()`
       yang dihitung ulang secara independen, DAN berbeda dari literal lama.

   S3  Klien tanpa perikatan tidak memperoleh angka karangan. Nol adalah angka;
       ketidaktahuan bukan nol.

   S4  `null` (belum dijawab) tidak boleh dibaca sebagai `false` (dinilai
       tidak). Ini cacat paling berbahaya di sini karena SENYAP: entitas jasa
       keuangan non-tercatat yang uji fidusianya belum diisi akan mendarat di
       SAK EP, padahal jawaban "ya" menempatkannya di SAK.

   S5  Mesinnya benar-benar dipakai di luar berkasnya. `fwDetermine` diekspor
       bertahun-tahun dengan NOL importir; ekspor tanpa pemanggil adalah hiasan.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CLIENTS } from './data_part1';
import { entityFigures } from './canon_base';
import {
  fwPortfolio, fwDetermine, frameworkFor, wtbForEngagement,
  FW_SALES_CEIL, FW_CAP_CEIL, FW_JUDGEMENT_KOSONG,
  type FwInput,
} from './fw_canon';

const PORT = fwPortfolio();

/* Masukan minimal yang sudah DIJAWAB seluruhnya — titik awal uji gerbang. */
const dijawab = (over: Partial<FwInput> = {}): FwInput => ({
  listed: false, fiduciary: false, complex: false, elect: false,
  sales: 1e9, capital: 1e8, ...over,
});

describe('S1 — identitas portofolio bersumber tunggal dari AMS.CLIENTS', () => {
  it('memindai portofolio yang tidak kosong (bukan gerbang hampa)', () => {
    expect(PORT.length).toBe(CLIENTS.length);
    expect(PORT.length).toBeGreaterThan(5);
  });

  it('setiap entri cocok byte-per-byte dengan CLIENTS', () => {
    for (const c of CLIENTS) {
      const e = PORT.find(x => x.id === c.id);
      expect(e, 'klien ' + c.id + ' hilang dari portofolio').toBeTruthy();
      expect({ id: e!.id, name: e!.name, sector: e!.sector, listed: e!.listed })
        .toEqual({ id: c.id, name: c.name, sector: c.industry, listed: c.listed });
    }
  });

  /* Repro cacat lama, dinyatakan sebagai fakta yang dapat dibantah. */
  it('kontradiksi "Tbk" pada C-031 & C-063 tidak lahir kembali', () => {
    for (const id of ['C-031', 'C-063']) {
      const e = PORT.find(x => x.id === id)!;
      const c = CLIENTS.find(x => x.id === id)!;
      expect(e.name).toBe(c.name);
      expect(e.name.endsWith('Tbk')).toBe(false);
    }
  });

  it('tak ada entri hantu yang bukan klien (mis. CMP-071)', () => {
    const sah = new Set(CLIENTS.map(c => c.id));
    expect(PORT.filter(e => !sah.has(e.id)).map(e => e.id)).toEqual([]);
  });

  /* Gerbang statik: identitas klien tak boleh muncul lagi sebagai literal di
     view. Tanpa ini, seseorang dapat menambahkan larik kedua tanpa terdeteksi. */
  it('view_framework tidak lagi memuat literal identitas klien', () => {
    const src = readFileSync(join(__dirname, 'view_framework.tsx'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(src.match(/'C-\d{3}'/g) ?? []).toEqual([]);
    expect(src.match(/'CMP-\d{3}'/g) ?? []).toEqual([]);
    expect(src).not.toContain('PT Sentosa Makmur');
  });
});

describe('S2 — figur ukuran usaha turunan neraca saldo, bukan literal', () => {
  it('sales/capital sama dengan entityFigures yang dihitung ulang independen', () => {
    const berfigur = PORT.filter(e => e.figuresAvailable);
    expect(berfigur.length).toBeGreaterThan(4);
    for (const e of berfigur) {
      const f = entityFigures(wtbForEngagement(e.engId!), 'unadj');
      expect({ id: e.id, s: e.sales, c: e.capital })
        .toEqual({ id: e.id, s: f.revenue, c: f.equity });
    }
  });

  /* Sisi kedua: membuktikan literal lama benar-benar TERCABUT. Tanpa uji ini,
     larik literal yang kebetulan cocok akan lolos uji di atas. */
  it('angkanya berbeda dari literal FW_PORTFOLIO lama', () => {
    const c031 = PORT.find(e => e.id === 'C-031')!;
    expect(c031.sales).not.toBe(7.4e11);
    const c047 = PORT.find(e => e.id === 'C-047')!;
    expect(c047.sales).not.toBe(1.8e10);
    expect(c047.capital).not.toBe(6.0e9);
  });

  /* Cacat yang paling halus: kerangkanya sama, DASAR PENETAPANNYA berbeda.
     Literal lama (18 M / 6 M) lolos ambang UMKM lalu naik lewat gerbang 3;
     angka nyata (44,8 M / 16,3 M) melampaui ambang modal → gerbang 2. */
  it('C-047 disimpulkan lewat gerbang 2 (entitas besar), bukan gerbang 3', () => {
    const e = PORT.find(x => x.id === 'C-047')!;
    const r = fwDetermine({ ...e, fiduciary: false });
    expect({ fw: r.fw, gate: r.gate, branch: r.branch })
      .toEqual({ fw: 'SAK EP', gate: 2, branch: 'big' });
    expect(e.capital!).toBeGreaterThan(FW_CAP_CEIL);
  });

  it('resolver WTB tidak membocorkan neraca saldo perikatan lain', () => {
    expect(wtbForEngagement('ENG-2025-014')).toBeTruthy();
    expect(wtbForEngagement('ENG-2025-047')).toBeTruthy();
    /* id tak dikenal → undefined, BUKAN neraca saldo milik perikatan lain. */
    expect(wtbForEngagement('ENG-9999-999')).toBeUndefined();
    const a = entityFigures(wtbForEngagement('ENG-2025-014'), 'unadj').revenue;
    const b = entityFigures(wtbForEngagement('ENG-2025-047'), 'unadj').revenue;
    expect(a).not.toBe(b);
  });
});

describe('S3 — klien tanpa neraca saldo tidak memperoleh angka karangan', () => {
  it('C-052 (Proposal, tanpa perikatan) bernilai null — bukan nol', () => {
    const e = PORT.find(x => x.id === 'C-052')!;
    expect({ ada: e.figuresAvailable, s: e.sales, c: e.capital, eng: e.engId })
      .toEqual({ ada: false, s: null, c: null, eng: null });
    /* Nol akan lolos ambang UMKM dan melahirkan SAK EMKM dari ketiadaan data. */
    expect(e.sales).not.toBe(0);
  });

  it('figur tak tersedia menghentikan mesin di gerbang 2, tanpa menyimpulkan', () => {
    const r = fwDetermine(dijawab({ sales: null, capital: null }));
    expect(r.fw).toBeNull();
    expect(r.gate).toBe(2);
    /* `figures` menandai yang TIDAK dapat dijawab manusia — ukuran usaha adalah
       fakta terukur, dan UI tak boleh menawarkan pendapat sebagai gantinya. */
    expect(r.pendingKeys).toEqual(['figures']);
  });

  /* Urutan gerbang mengikat: selama akuntabilitas publik belum disingkirkan,
     gerbang 2 belum terbuka — jadi klien tanpa neraca saldo TETAP menunggu di
     gerbang 1 lebih dulu, bukan langsung mengeluh soal figur. */
  it('gerbang 1 mendahului gerbang 2, bahkan tanpa neraca saldo', () => {
    const r = fwDetermine({ ...FW_JUDGEMENT_KOSONG, listed: false, sales: null, capital: null });
    expect(r.gate).toBe(1);
    expect(r.pendingKeys).toEqual(['fiduciary']);
  });
});

describe('S4 — belum dijawab (null) BUKAN dinilai tidak (false)', () => {
  it('fidusia belum dijawab pada entitas non-tercatat → menolak menyimpulkan', () => {
    const r = fwDetermine(dijawab({ fiduciary: null }));
    expect(r.fw).toBeNull();
    expect(r.gate).toBe(1);
    expect(r.pending).toHaveLength(1);
  });

  /* Inti cacatnya: kedua jawaban menghasilkan KERANGKA BERBEDA, jadi menebak
     salah satunya menghasilkan kertas kerja yang salah tanpa jejak. */
  it('menjawab fidusia mengubah hasilnya — jadi menebaknya tidak netral', () => {
    const dasar = dijawab({ sales: 900e9, capital: 500e9 });
    expect(fwDetermine({ ...dasar, fiduciary: true }).fw).toBe('SAK');
    expect(fwDetermine({ ...dasar, fiduciary: false }).fw).toBe('SAK EP');
  });

  it('SAK EMKM hanya lahir bila kompleksitas DAN pilihan sukarela dijawab tidak', () => {
    const kecil = dijawab({ sales: 2e9, capital: 5e8 });
    expect(fwDetermine(kecil).fw).toBe('SAK EMKM');
    expect(fwDetermine({ ...kecil, complex: null }).fw).toBeNull();
    expect(fwDetermine({ ...kecil, elect: null }).fw).toBeNull();
    /* Tetapi "ya" pada salah satunya sudah menentukan — tak perlu menunggu sisanya. */
    expect(fwDetermine({ ...kecil, complex: true, elect: null }).fw).toBe('SAK EP');
  });

  it('tercatat menentukan gerbang 1 tanpa menunggu jawaban apa pun', () => {
    const r = fwDetermine({ ...FW_JUDGEMENT_KOSONG, listed: true, sales: null, capital: null });
    expect({ fw: r.fw, gate: r.gate, pending: r.pending }).toEqual({ fw: 'SAK', gate: 1, pending: [] });
  });

  it('portofolio nyata: tak satu pun klien disimpulkan dari tebakan', () => {
    for (const e of PORT) {
      const r = fwDetermine(e);
      /* Satu-satunya yang boleh simpulan tanpa pertimbangan = entitas tercatat. */
      if (r.fw !== null) expect(e.listed).toBe(true);
    }
  });
});

describe('S5 — mesin benar-benar dipakai di luar berkasnya', () => {
  it('ada importir nyata fw_canon di luar fw_canon sendiri', () => {
    const importir = ['view_framework.tsx']
      .map(f => readFileSync(join(__dirname, f), 'utf8'))
      .filter(s => /from '\.\/fw_canon'/.test(s));
    expect(importir.length).toBeGreaterThan(0);
  });

  it('frameworkFor() adalah selektor tunggal yang dapat dipanggil per klien', () => {
    const r = frameworkFor('C-014');
    expect(r.fw).toBe('SAK');
    const hilang = frameworkFor('C-000');
    expect(hilang.fw).toBeNull();
    expect(hilang.pending.length).toBeGreaterThan(0);
  });
});

describe('ambang normatif tidak bergeser', () => {
  it('ambang UMKM tetap 50 M penjualan / 10 M modal (UU 20/2008 jo. PP 7/2021)', () => {
    expect({ sales: FW_SALES_CEIL, cap: FW_CAP_CEIL }).toEqual({ sales: 50e9, cap: 10e9 });
  });

  it('tepat DI ambang masih UMKM; setitik di atasnya sudah besar', () => {
    expect(fwDetermine(dijawab({ sales: 50e9, capital: 10e9 })).fw).toBe('SAK EMKM');
    expect(fwDetermine(dijawab({ sales: 50e9 + 1, capital: 10e9 })).branch).toBe('big');
    expect(fwDetermine(dijawab({ sales: 50e9, capital: 10e9 + 1 })).branch).toBe('big');
  });
});
