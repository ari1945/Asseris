/* ============================================================
   Asseris — REGISTER ASET TETAP: SATU SUMBER
   PRD firm-erp-deepening 2026-08-16 · PR-1
   ============================================================

   DULU firma punya DUA register aset tetap yang tidak saling kenal:

     A · `AMS.FIXED_ASSETS` (data_part2)      6 aset · perolehan 6.510 jt
         dibaca modul `fixedassets` (Keuangan Firma ERP)
     B · `BO.FIXED_ASSETS`  (data_backoffice) 7 aset · perolehan 2.591,5 jt
         dibaca `view_bo1` · `view_firmops` · `view_firmops2` · `data_firmops`

   Tidak satu aset pun beririsan, dan tiap register punya mesin penyusutannya
   sendiri: A menghitung garis lurus di dalam view; B membawa kolom `nbv`
   LITERAL. Akibatnya pertanyaan "berapa nilai buku aset firma?" punya dua
   jawaban, dan "berapa beban penyusutan setahun?" juga dua.

   Berkas ini adalah SATU register itu. Aturannya:

     1. `nbv` BUKAN kolom. Ia diturunkan (`assetsAt`). Kolom `nbv` literal di
        register B dihapus — nilainya SUDAH persis garis lurus pada
        `AMS.TODAY`, jadi penggabungan ini nol-delta untuk ketujuh baris itu.
     2. Tiap baris menunjuk akun yang BENAR-BENAR ADA di `FIRM_COA`. Register B
        dulu menunjuk `1-2100` — akun yang tak pernah ada. Ia gagal DIAM-DIAM.
        Gerbang `fixedassets_register.test.ts` kini menolak akun hantu.
     3. `src` mencatat register asal tiap baris. Penggabungan harus dapat
        diaudit, bukan diam-diam.

   YANG SENGAJA TIDAK DILAKUKAN — DEDUPLIKASI. Beberapa baris dari kedua
   register mungkin menggambarkan aset FISIK yang sama (mis. FA-002 "Server &
   Infrastruktur Jaringan" 880 jt Mar-2023 vs AST-1051 "Server & NAS arsip"
   285 jt Feb-2023). Menebak pasangan mana yang duplikat berarti mengarang.
   `duplicateCandidates()` MENANDAI pasangan yang mencurigakan (kategori sama,
   perolehan ≤ 90 hari) agar firma yang memutuskan — sistem tidak memutuskan
   diam-diam untuk mereka.

   Berkas ini SENGAJA tidak mengimpor apa pun: ia dipakai `data_part2` (yang
   menyusun AMS) DAN `data_backoffice` (yang mengimpor AMS). Impor apa pun ke
   arah `./data` akan melingkar. Tanggal acuan karena itu SELALU parameter. */

/* ---------------- Taksonomi kanonik ----------------
   Kedua register memakai nama kategori yang berbeda untuk hal yang sama
   ('Peralatan IT' vs 'Perangkat TI' vs 'Infrastruktur TI'). Satu taksonomi,
   dan tiap kelas menyatakan standar akuntansinya — karena "Lisensi Software
   perpetual" BUKAN PSAK 16, dan menyusutkannya bersama kendaraan di satu akun
   adalah kesalahan klasifikasi, bukan sekadar kosmetik. */
export type AssetClass =
  | 'Bangunan & Renovasi'
  | 'Perangkat & Infrastruktur TI'
  | 'Perangkat Kantor'
  | 'Furnitur & Inventaris'
  | 'Kendaraan'
  | 'Fasilitas Gedung'
  | 'Aset Takberwujud';

export const ASSET_CLASS_STANDARD: Record<AssetClass, 'PSAK 16' | 'PSAK 19'> = {
  'Bangunan & Renovasi': 'PSAK 16',
  'Perangkat & Infrastruktur TI': 'PSAK 16',
  'Perangkat Kantor': 'PSAK 16',
  'Furnitur & Inventaris': 'PSAK 16',
  'Kendaraan': 'PSAK 16',
  'Fasilitas Gedung': 'PSAK 16',
  'Aset Takberwujud': 'PSAK 19',
};

/* Akun kontrol per kelas. PR-1 memetakan seluruh kelas ke `1-400` (satu-satunya
   akun aset tetap yang ADA di FIRM_COA). Pemisahan bruto / akumulasi penyusutan
   dan akun takberwujud tersendiri adalah PR-2 — di sana peta ini bercabang. */
export const ASSET_CLASS_GL: Record<AssetClass, string> = {
  'Bangunan & Renovasi': '1-400',
  'Perangkat & Infrastruktur TI': '1-400',
  'Perangkat Kantor': '1-400',
  'Furnitur & Inventaris': '1-400',
  'Kendaraan': '1-400',
  'Fasilitas Gedung': '1-400',
  'Aset Takberwujud': '1-400',
};

export interface AssetSeed {
  id: string;
  name: string;
  cat: AssetClass;
  qty: number;
  acq: string;            // tanggal perolehan (ISO)
  cost: number;           // harga perolehan
  life: number;           // umur manfaat (tahun)
  residu: number;         // nilai residu
  loc: string;
  custodian: string;
  vendorId: string | null;
  insured: string | null;
  status: string;
  src: 'finance' | 'ga';  // register asal — penggabungan yang dapat diaudit
}

/* ---------------- REGISTER TUNGGAL ----------------
   Enam baris `src:'finance'` berasal dari `AMS.FIXED_ASSETS`; tujuh baris
   `src:'ga'` dari `BO.FIXED_ASSETS`. Nilai `cost`/`acq`/`life` TIDAK diubah
   satu pun — penggabungan ini tidak menggeser angka mana pun yang sudah ada,
   ia hanya menyatukan dua daftar dan mencabut kolom `nbv` literal. */
export const FIXED_ASSETS: AssetSeed[] = [
  /* --- eks register Keuangan (A) --- */
  { id: 'FA-001', name: 'Renovasi & Interior Kantor Pusat', cat: 'Bangunan & Renovasi', qty: 1, acq: '2021-06-01', cost: 2_400_000_000, life: 8, residu: 0, loc: 'Pusat — Jakarta', custodian: 'Citra W.', vendorId: null, insured: 'POL-PRP', status: 'Digunakan', src: 'finance' },
  { id: 'FA-002', name: 'Server & Infrastruktur Jaringan', cat: 'Perangkat & Infrastruktur TI', qty: 1, acq: '2023-03-15', cost: 880_000_000, life: 4, residu: 0, loc: 'Ruang Server', custodian: 'Andini R.', vendorId: 'V-018', insured: 'POL-PRP', status: 'Digunakan', src: 'finance' },
  { id: 'FA-003', name: 'Lisensi Software Audit (perpetual)', cat: 'Aset Takberwujud', qty: 1, acq: '2024-01-10', cost: 620_000_000, life: 5, residu: 0, loc: '—', custodian: 'Andini R.', vendorId: 'V-029', insured: null, status: 'Digunakan', src: 'finance' },
  { id: 'FA-004', name: 'Kendaraan Operasional (3 unit)', cat: 'Kendaraan', qty: 3, acq: '2022-09-01', cost: 1_350_000_000, life: 8, residu: 0, loc: 'Pusat — Jakarta', custodian: 'Dwi P.', vendorId: null, insured: 'POL-PRP', status: 'Digunakan', src: 'finance' },
  { id: 'FA-005', name: 'Furnitur, Partisi & Inventaris', cat: 'Furnitur & Inventaris', qty: 1, acq: '2021-06-01', cost: 540_000_000, life: 4, residu: 0, loc: 'Pusat — Jakarta', custodian: 'Bayu S.', vendorId: null, insured: 'POL-PRP', status: 'Digunakan', src: 'finance' },
  { id: 'FA-006', name: 'Laptop Tim Audit (40 unit)', cat: 'Perangkat & Infrastruktur TI', qty: 40, acq: '2024-07-01', cost: 720_000_000, life: 4, residu: 0, loc: 'Pusat — Jakarta', custodian: 'Andini R.', vendorId: 'V-018', insured: 'POL-PRP', status: 'Digunakan', src: 'finance' },
  /* --- eks register GA / Fasilitas (B) — kolom `nbv` literal DICABUT --- */
  { id: 'AST-1042', name: 'Laptop ThinkPad X1 (batch audit)', cat: 'Perangkat & Infrastruktur TI', qty: 35, acq: '2024-06-01', cost: 612_500_000, life: 4, residu: 0, loc: 'Pusat — Jakarta', custodian: 'Andini R.', vendorId: 'V-018', insured: 'POL-PRP', status: 'Digunakan', src: 'ga' },
  { id: 'AST-1051', name: 'Server & NAS arsip kertas kerja', cat: 'Perangkat & Infrastruktur TI', qty: 1, acq: '2023-02-15', cost: 285_000_000, life: 5, residu: 0, loc: 'Ruang Server', custodian: 'Andini R.', vendorId: 'V-018', insured: 'POL-PRP', status: 'Digunakan', src: 'ga' },
  { id: 'AST-0890', name: 'Furnitur ruang kerja (workstation)', cat: 'Furnitur & Inventaris', qty: 64, acq: '2022-01-10', cost: 448_000_000, life: 8, residu: 0, loc: 'Pusat — Jakarta', custodian: 'Bayu S.', vendorId: null, insured: 'POL-PRP', status: 'Digunakan', src: 'ga' },
  { id: 'AST-1110', name: 'Kendaraan operasional (Innova)', cat: 'Kendaraan', qty: 2, acq: '2024-11-01', cost: 760_000_000, life: 8, residu: 0, loc: 'Pusat — Jakarta', custodian: 'Dwi P.', vendorId: null, insured: 'POL-PRP', status: 'Digunakan', src: 'ga' },
  { id: 'AST-1133', name: 'Proyektor & perangkat rapat', cat: 'Perangkat Kantor', qty: 6, acq: '2025-03-20', cost: 84_000_000, life: 4, residu: 0, loc: 'Ruang Rapat', custodian: 'Bayu S.', vendorId: 'V-018', insured: 'POL-PRP', status: 'Digunakan', src: 'ga' },
  { id: 'AST-0770', name: 'AC & sistem pendingin', cat: 'Fasilitas Gedung', qty: 12, acq: '2021-05-01', cost: 168_000_000, life: 8, residu: 0, loc: 'Seluruh Lantai', custodian: 'Citra W.', vendorId: null, insured: 'POL-PRP', status: 'Perlu Servis', src: 'ga' },
  { id: 'AST-0655', name: 'Laptop lama (tahap pelepasan)', cat: 'Perangkat & Infrastruktur TI', qty: 18, acq: '2020-04-01', cost: 234_000_000, life: 4, residu: 0, loc: 'Gudang', custodian: 'Andini R.', vendorId: 'V-018', insured: null, status: 'Usul Hapus', src: 'ga' },
];

export interface AssetComputed extends AssetSeed {
  standar: 'PSAK 16' | 'PSAK 19';
  gl: string;
  monthsElapsed: number;
  monthsLife: number;
  monthlyDep: number;
  annualDep: number;      // 0 bila sudah habis disusutkan
  accDep: number;
  nbv: number;
  pct: number;
  fullyDep: boolean;
}

/* Selisih bulan kalender — formula IDENTIK dengan `view_firmtreasury` sebelum
   PR ini, supaya penggabungan tidak menggeser satu angka pun. */
function monthsBetween(from: Date, to: Date): number {
  return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
}

export function depreciate(a: AssetSeed, ref: Date): AssetComputed {
  const monthsLife = a.life * 12;
  const monthsElapsed = Math.max(0, Math.min(monthsLife, monthsBetween(new Date(a.acq), ref)));
  const depreciable = a.cost - a.residu;
  const monthlyDep = depreciable / monthsLife;
  const accDep = Math.round(monthlyDep * monthsElapsed);
  const fullyDep = monthsElapsed >= monthsLife;
  return {
    ...a,
    standar: ASSET_CLASS_STANDARD[a.cat],
    gl: ASSET_CLASS_GL[a.cat],
    monthsElapsed, monthsLife, monthlyDep,
    annualDep: fullyDep ? 0 : Math.round(monthlyDep * 12),
    accDep,
    nbv: a.cost - accDep,
    pct: monthsElapsed / monthsLife,
    fullyDep,
  };
}

export interface AssetRegister {
  rows: AssetComputed[];
  totCost: number;
  totAccDep: number;
  totNbv: number;
  totAnnualDep: number;
  byClass: Array<{ cat: AssetClass; standar: 'PSAK 16' | 'PSAK 19'; n: number; cost: number; accDep: number; nbv: number; annualDep: number }>;
  bySource: Array<{ src: 'finance' | 'ga'; n: number; cost: number; nbv: number }>;
}

export function assetsAt(ref: Date, seed: AssetSeed[] = FIXED_ASSETS): AssetRegister {
  const rows = seed.map((a) => depreciate(a, ref));
  const sum = (f: (r: AssetComputed) => number) => rows.reduce((s, r) => s + f(r), 0);

  const clsMap = new Map<AssetClass, AssetRegister['byClass'][number]>();
  for (const r of rows) {
    const e = clsMap.get(r.cat) || { cat: r.cat, standar: r.standar, n: 0, cost: 0, accDep: 0, nbv: 0, annualDep: 0 };
    e.n += 1; e.cost += r.cost; e.accDep += r.accDep; e.nbv += r.nbv; e.annualDep += r.annualDep;
    clsMap.set(r.cat, e);
  }
  const srcMap = new Map<'finance' | 'ga', AssetRegister['bySource'][number]>();
  for (const r of rows) {
    const e = srcMap.get(r.src) || { src: r.src, n: 0, cost: 0, nbv: 0 };
    e.n += 1; e.cost += r.cost; e.nbv += r.nbv;
    srcMap.set(r.src, e);
  }

  return {
    rows,
    totCost: sum((r) => r.cost),
    totAccDep: sum((r) => r.accDep),
    totNbv: sum((r) => r.nbv),
    totAnnualDep: sum((r) => r.annualDep),
    byClass: [...clsMap.values()].sort((a, b) => b.cost - a.cost),
    bySource: [...srcMap.values()],
  };
}

/* ---------------- Kandidat duplikat lintas-register ----------------
   Penggabungan dua register yang tak pernah didamaikan hampir pasti membawa
   pencatatan ganda. Sistem TIDAK memutuskan pasangan mana yang duplikat —
   ia menandai yang layak dilihat manusia: kelas aset sama, tanggal perolehan
   berdekatan, dan berasal dari register yang BERBEDA. Tanpa syarat terakhir,
   dua batch laptop yang sah dari register yang sama akan ikut tertuduh. */
export const DUP_WINDOW_DAYS = 90;

export interface DupCandidate {
  a: AssetSeed; b: AssetSeed; cat: AssetClass; daysApart: number; combinedCost: number;
}

/* ---------------- Pelepasan: derecognition & referensi menggantung ----------------
   PSAK 16 ¶67 — aset yang dilepas DIHENTIKAN PENGAKUANNYA. Sebelum PR ini tak
   ada mekanismenya sama sekali: register `DISPOSALS` hidup terpisah dan tak
   satu pun modul mengeluarkan aset yang sudah dilepas dari register aktif.
   Akibatnya roll-forward akan pecah begitu ada pelepasan yang menunjuk aset
   nyata — asetnya dikurangkan sebagai pelepasan TAPI masih ikut di saldo akhir.

   `danglingDisposals` menangkap kelas cacat kedua: pelepasan yang menunjuk
   `assetId` yang tak ada di register. Ia gagal DIAM-DIAM persis seperti akun
   hantu `1-2100`. Pada seed sekarang `DSP-00` (status Selesai) menunjuk
   `AST-0512` — aset yang tak pernah ada di register mana pun. */
export interface DisposalRef { id: string; assetId: string; date: string; status: string }

export const DISPOSAL_DONE = 'Selesai';

export function disposedIds(disposals: DisposalRef[]): Set<string> {
  return new Set(disposals.filter((d) => d.status === DISPOSAL_DONE).map((d) => d.assetId));
}

/* Register AKTIF — aset yang pengakuannya sudah dihentikan tidak ikut. */
export function activeAssets(disposals: DisposalRef[], seed: AssetSeed[] = FIXED_ASSETS): AssetSeed[] {
  const gone = disposedIds(disposals);
  return seed.filter((a) => !gone.has(a.id));
}

export function danglingDisposals(disposals: DisposalRef[], seed: AssetSeed[] = FIXED_ASSETS): DisposalRef[] {
  const ids = new Set(seed.map((a) => a.id));
  return disposals.filter((d) => !ids.has(d.assetId));
}

/* ---------------- Roll-forward nilai buku ----------------
   SATU mesin, dipakai modul Aset Tetap DAN lapisan Fasilitas.

   Bentuk lama (dua-duanya) menurunkan saldo AWAL dari saldo AKHIR:
     `opening = closing − capex + depreciation + disposalNbv`
   sehingga panel menutup SECARA ALJABAR dan tak pernah bisa salah — cacat
   yang dicabut dari WIP di #239.

   Yang halus, dan yang membuat percobaan pertama masih salah: aset yang
   DILEPAS harus tetap ada di saldo AWAL. Kalau saldo awal dihitung atas
   register AKTIF (yang sudah mengeluarkannya), asetnya lenyap dari sejarah:
   pelepasan Rp 66,5 jt muncul sebagai Rp 0 dan panelnya "menutup" justru
   karena angka yang mengganggu dihapus. Karena itu:

     saldo awal   = NBV pada `from` atas aset yang DIMILIKI pada `from`
                    (termasuk yang kemudian dilepas)
     + capex      = harga perolehan aset yang diperoleh DI DALAM jendela
     − penyusutan = beban periode aset yang masih dimiliki, DITAMBAH beban
                    aset yang dilepas s/d tanggal pelepasannya
     − pelepasan  = NBV aset yang dilepas PADA TANGGAL PELEPASAN
     = saldo akhir menurut komponen  →  dibandingkan dengan register aktif.

   Residual ≠ 0 berarti ada pergerakan yang tak dijelaskan komponen mana pun. */
export interface RollForward {
  from: Date; to: Date;
  opening: number; capex: number; depreciation: number; disposalNbv: number;
  computed: number; closing: number; residual: number; ties: boolean;
  disposed: Array<{ id: string; assetId: string; date: string; nbv: number }>;
}

export const ROLLFWD_TOLERANCE = 1_000_000;

export function rollForward(
  ref: Date,
  disposals: DisposalRef[] = [],
  seed: AssetSeed[] = FIXED_ASSETS,
  months = 12,
): RollForward {
  const from = new Date(ref.getFullYear(), ref.getMonth() - months, ref.getDate());
  const inWindow = (d: string) => new Date(d) > from && new Date(d) <= ref;

  const doneById = new Map<string, DisposalRef>();
  for (const d of disposals) if (d.status === DISPOSAL_DONE) doneById.set(d.assetId, d);

  /* Dilepas DI DALAM jendela → menjelaskan pergerakan. Dilepas SEBELUM jendela →
     sudah tidak ada sejak saldo awal, jadi tidak masuk perhitungan mana pun. */
  const disposedInWindow = seed.filter((a) => {
    const d = doneById.get(a.id);
    return !!d && inWindow(d.date);
  });
  const disposedBefore = new Set(
    seed.filter((a) => { const d = doneById.get(a.id); return !!d && !inWindow(d.date); }).map((a) => a.id),
  );
  const held = seed.filter((a) => !doneById.has(a.id));

  const nbvAt = (a: AssetSeed, at: Date) => depreciate(a, at).nbv;
  const accAt = (a: AssetSeed, at: Date) => depreciate(a, at).accDep;
  const sum = (xs: AssetSeed[], f: (a: AssetSeed) => number) => xs.reduce((s, a) => s + f(a), 0);

  const ownedAtFrom = [...held, ...disposedInWindow]
    .filter((a) => new Date(a.acq) <= from && !disposedBefore.has(a.id));
  const opening = sum(ownedAtFrom, (a) => nbvAt(a, from));

  const capex = sum([...held, ...disposedInWindow].filter((a) => inWindow(a.acq)), (a) => a.cost);

  const depHeld = sum(held, (a) => accAt(a, ref) - accAt(a, from));
  const depDisposed = sum(disposedInWindow, (a) => accAt(a, new Date(doneById.get(a.id)!.date)) - accAt(a, from));
  const depreciation = depHeld + depDisposed;

  const disposedRows = disposedInWindow.map((a) => {
    const d = doneById.get(a.id)!;
    return { id: d.id, assetId: a.id, date: d.date, nbv: nbvAt(a, new Date(d.date)) };
  });
  const disposalNbv = disposedRows.reduce((s, r) => s + r.nbv, 0);

  const closing = assetsAt(ref, held).totNbv;
  const computed = opening + capex - depreciation - disposalNbv;
  const residual = computed - closing;

  return {
    from, to: ref, opening, capex, depreciation, disposalNbv,
    computed, closing, residual, ties: Math.abs(residual) < ROLLFWD_TOLERANCE,
    disposed: disposedRows,
  };
}

export function duplicateCandidates(seed: AssetSeed[] = FIXED_ASSETS): DupCandidate[] {
  const out: DupCandidate[] = [];
  for (let i = 0; i < seed.length; i++) {
    for (let j = i + 1; j < seed.length; j++) {
      const a = seed[i], b = seed[j];
      if (a.src === b.src) continue;
      if (a.cat !== b.cat) continue;
      const daysApart = Math.abs(new Date(a.acq).getTime() - new Date(b.acq).getTime()) / 864e5;
      if (daysApart > DUP_WINDOW_DAYS) continue;
      out.push({ a, b, cat: a.cat, daysApart: Math.round(daysApart), combinedCost: a.cost + b.cost });
    }
  }
  return out.sort((x, y) => y.combinedCost - x.combinedCost);
}
