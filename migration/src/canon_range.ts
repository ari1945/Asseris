/* ============================================================
   Asseris — SA 540 · DASAR rentang wajar auditor
   ------------------------------------------------------------
   Modul MURNI, tanpa dependensi. Menjawab satu pertanyaan yang selama
   ini tak pernah ditanyakan aplikasi: **dari mana rentang itu berasal?**

   Sebelum modul ini, `lo` & `hi` adalah dua `<input type="number">`
   bebas. Seluruh mesin hilir — posisi pita, verdict sensitivitas, dan
   (sejak PR-1) besaran salah saji yang mengalir ke SA 450 — bersandar
   pada dua angka yang boleh diketik tanpa dasar apa pun. Itu plug, kelas
   yang sama dengan saldo awal DTA dan Rp 6.554 jt berlabel "catatan 13".

   Tiga dasar yang diakui:
     · 'scenarios' — rentang TERHITUNG dari daftar skenario asumsi;
                     lo = hasil terendah, hi = tertinggi. Tak dapat diketik.
     · 'viu'       — sama, tetapi skenarionya dibangkitkan mesin nilai
                     pakai (PSAK 48 · Tier B). Satu perubahan WACC
                     menggerakkan rentang auditor.
     · 'manual'    — rentang diketik, TETAPI wajib menyertakan alasan.
                     Tanpa alasan ia tetap dipakai namun ditandai
                     TAK BERDASAR — terlihat di panel dan memo PDF.

   KOMPATIBILITAS MAJU (butir 17 PRD): estimasi lama tanpa `derivation`
   TETAP BERFUNGSI dan tidak digugurkan massal; ia ditandai `legacy`
   supaya dapat dibedakan dari rentang yang auditor sengaja kosongkan.
   Menggugurkan rentang warisan akan menghapus salah saji nyata dari
   agregasi SA 450 — obat yang lebih buruk dari penyakitnya.
   ============================================================ */

export interface RangeScenario {
  id: string;
  /** mis. "WACC +1 pp" atau "LGD −5%" */
  label: string;
  /** hasil estimasi pada skenario ini (Rp juta) */
  value: number;
  note?: string;
}

export type RangeMethod = 'scenarios' | 'viu' | 'manual';

export interface EstimateDerivation {
  method: RangeMethod;
  scenarios?: RangeScenario[];
  /** wajib untuk 'manual' — mengapa batas itu yang dipilih */
  rationale?: string;
  by?: string;
  at?: string;
}

/** Rentang yang berlaku beserta ASALNYA. */
export interface EffectiveRange {
  lo: number;
  hi: number;
  source: 'derived' | 'manual';
  method: RangeMethod;
  /** true bila batasnya punya dasar: terhitung dari skenario, atau manual beralasan. */
  grounded: boolean;
  /** true bila estimasi belum pernah menyatakan dasar sama sekali (state warisan). */
  legacy: boolean;
  /** jumlah skenario yang membentuk rentang (0 untuk manual) */
  scenarioCount: number;
}

/** Bentuk minimal yang dibutuhkan — sengaja struktural agar bebas dari `Estimate`. */
export interface RangeBearer {
  lo: number;
  hi: number;
  derivation?: EstimateDerivation | null;
}

/** Skenario yang sah = punya nilai numerik hingga. Label kosong tidak membatalkan. */
export function validScenarios(d?: EstimateDerivation | null): RangeScenario[] {
  const list = (d && d.scenarios) || [];
  return list.filter(s => s && typeof s.value === 'number' && Number.isFinite(s.value));
}

/**
 * Rentang dari skenario: lo = terendah, hi = tertinggi.
 * Butuh MINIMAL DUA skenario — satu titik bukan rentang, dan menerimanya akan
 * menghasilkan lo === hi yang tampak presisi padahal tak pernah diuji.
 */
export function derivedRange(d?: EstimateDerivation | null): { lo: number; hi: number; n: number } | null {
  if (!d || (d.method !== 'scenarios' && d.method !== 'viu')) return null;
  const ok = validScenarios(d);
  if (ok.length < 2) return null;
  let lo = ok[0].value, hi = ok[0].value;
  for (const s of ok) { if (s.value < lo) lo = s.value; if (s.value > hi) hi = s.value; }
  return { lo, hi, n: ok.length };
}

export function effectiveRange(e: RangeBearer): EffectiveRange {
  const d = e.derivation;
  const der = derivedRange(d);
  if (der) {
    return { lo: der.lo, hi: der.hi, source: 'derived', method: d!.method, grounded: true, legacy: false, scenarioCount: der.n };
  }
  const rationale = ((d && d.rationale) || '').trim();
  return {
    lo: e.lo, hi: e.hi,
    source: 'manual',
    method: (d && d.method) || 'manual',
    grounded: !!rationale,
    legacy: !d,
    scenarioCount: 0,
  };
}

/**
 * Sensitivitas per-1% yang TERDERIVASI: dampak rata-rata terhadap nilai estimasi
 * per satu persen pergeseran, diambil dari sebaran skenario terhadap titik acuan.
 * Mengembalikan null bila tak ada dasar — pemanggil harus jatuh ke input manual
 * DAN menandainya, bukan diam-diam memakai angka yang tampak terhitung.
 */
export function derivedPerPct(d: EstimateDerivation | null | undefined, anchor: number): number | null {
  const ok = validScenarios(d);
  if (ok.length < 2 || !Number.isFinite(anchor)) return null;
  const spread = Math.max(...ok.map(s => s.value)) - Math.min(...ok.map(s => s.value));
  if (!spread) return null;
  // rentang penuh dianggap mewakili pergeseran ±100% asumsi kunci → per 1%
  return +(spread / 100).toFixed(4);
}

/* ============================================================
   Rentang dari mesin nilai pakai (Q3) — TAUTAN HIDUP
   ------------------------------------------------------------
   Estimasi ber-metode 'viu' TIDAK menyimpan skenarionya. Skenario
   dibangkitkan dari hasil `psak48()` pada saat dibaca, sehingga satu
   perubahan WACC menggerakkan PSAK 48, rentang auditor SA 540, DAN
   salah saji di SAD — sekaligus. Menyimpannya akan membekukan rentang
   pada asumsi yang mungkin sudah ditinggalkan auditor: persis jenis
   angka basi yang arc ini tutup.
   ============================================================ */

export interface Psak48Like {
  carry: number;
  recoverable: number;
  sens: Array<{ label: string; shock: string; rec: number }>;
}

/** Rugi penurunan nilai pada satu skenario = max(0, tercatat − terpulihkan). */
export function viuImpairmentScenarios(p: Psak48Like | null | undefined): RangeScenario[] {
  if (!p || !Number.isFinite(p.carry)) return [];
  const loss = (rec: number) => Math.max(0, Math.round(p.carry - rec));
  const out: RangeScenario[] = [
    { id: 'base', label: 'Asumsi dasar auditor', value: loss(p.recoverable), note: 'WACC & pertumbuhan yang berlaku' },
  ];
  (p.sens || []).forEach((s, i) => {
    if (!s || !Number.isFinite(s.rec)) return;
    out.push({ id: 's' + (i + 1), label: s.label, value: loss(s.rec), note: s.shock });
  });
  return out;
}

/**
 * Sisipkan skenario hidup ke estimasi ber-metode 'viu'. Estimasi lain lewat apa
 * adanya. Dipanggil SETIAP pembacaan registri (SA 540 & SAD) supaya kedua modul
 * melihat rentang yang sama pada asumsi yang sama.
 */
export function hydrateViuDerivations<T extends RangeBearer>(list: T[] | null | undefined, p48: Psak48Like | null | undefined): T[] {
  const src = Array.isArray(list) ? list : [];
  if (!p48) return src;
  let scen: RangeScenario[] | null = null;
  return src.map(e => {
    if (!e || !e.derivation || e.derivation.method !== 'viu') return e;
    if (!scen) scen = viuImpairmentScenarios(p48);
    return { ...e, derivation: { ...e.derivation, scenarios: scen } };
  });
}

/** Ringkasan untuk panel & memo: berapa estimasi yang rentangnya tak berdasar. */
export function ungroundedRanges<T extends RangeBearer & { id: string; name: string }>(list: T[]): T[] {
  return (list || []).filter(e => !effectiveRange(e).grounded);
}
