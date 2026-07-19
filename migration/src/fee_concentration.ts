/* ============================================================
   Asseris — Konsentrasi/Ketergantungan Imbalan (Kode Etik IAPI · IESBA 290 · SPAP)

   Mesin murni & deterministik: rasio ketergantungan imbalan per klien
   terhadap (a) pendapatan firma dan (b) portofolio partner penanggung
   jawab. Untuk klien PIE/emiten, total imbalan yang melebihi ambang
   (lazim 15%) menjadi ancaman kepentingan pribadi (self-interest) yang
   perlu pengaman; berulang antar-tahun → ancaman signifikan. Non-PIE
   dipantau informatif (tanpa ambang keras).

   SSOT: numerator = CLIENTS.fee; denominator firma = pendapatan firma
   (GL 4-100 via FIRMFIN.pl().revenue) yang di-inject pemanggil.
   Tidak ada angka hardcode; pemanggil menyuntik pendapatan & ambang.
   ============================================================ */

export type FeeConcentrationLevel = 'ok' | 'watch' | 'breach';

export interface FeeConcentrationConfig {
  /** Ambang PIE (emiten) → ancaman signifikan (Kode Etik/IESBA 290: lazim 15%). */
  pieBreach: number;
  /** Ambang perhatian PIE (pemantauan dini sebelum breach). */
  pieWatch: number;
  /** Ambang informatif non-PIE — TIDAK memicu breach keras, hanya penanda. */
  nonPieWatch: number;
}

/* Default IESBA 290 / SPAP Seksi 410: PIE 15% (breach → ancaman signifikan,
   khususnya bila berulang 2 tahun), perhatian 10%; non-PIE tak berambang keras
   (30% hanya penanda informatif). Pemanggil boleh meng-override via config. */
export const FEE_CONCENTRATION_CONFIG: FeeConcentrationConfig = {
  pieBreach: 0.15,
  pieWatch: 0.10,
  nonPieWatch: 0.30,
};

export interface FeeConcentrationRow {
  clientId: string;
  client: string;
  partner: string;
  pie: boolean;
  fee: number;
  /** fee klien ÷ pendapatan firma (GL 4-100). */
  ratioFirm: number;
  /** fee klien ÷ portofolio partner penanggung jawab (Σ fee klien aktif partner tsb). */
  ratioPartner: number;
  level: FeeConcentrationLevel;
  /** ambang efektif yang berlaku bagi baris ini (PIE vs non-PIE). */
  threshold: number;
}

export interface FeeConcentrationSummary {
  rows: FeeConcentrationRow[];
  firmRevenue: number;
  totalFee: number;
  breaches: number;
  watches: number;
  /** rasio-firma tertinggi di portofolio (konsentrasi puncak). */
  topRatio: number;
}

interface FeeClientLike {
  id: string;
  name?: string;
  partner?: string;
  listed?: boolean;
  fee?: number;
  status?: string;
}

/** Klasifikasi tingkat konsentrasi sebuah rasio, sesuai status PIE. */
function classify(ratioFirm: number, pie: boolean, config: FeeConcentrationConfig): FeeConcentrationLevel {
  if (pie) {
    if (ratioFirm >= config.pieBreach) return 'breach';
    if (ratioFirm >= config.pieWatch) return 'watch';
    return 'ok';
  }
  // non-PIE: hanya pemantauan informatif, tidak pernah 'breach'.
  return ratioFirm >= config.nonPieWatch ? 'watch' : 'ok';
}

/**
 * Hitung konsentrasi imbalan portofolio klien aktif terhadap pendapatan firma
 * dan portofolio partner. Deterministik & murni.
 */
export function feeConcentration(
  clients: FeeClientLike[],
  firmRevenue: number,
  config: FeeConcentrationConfig = FEE_CONCENTRATION_CONFIG,
): FeeConcentrationSummary {
  const active = clients.filter((c) => (c.status ?? 'Active') === 'Active');

  // Portofolio per partner (Σ fee klien aktif) → basis rasio-partner.
  const byPartner = new Map<string, number>();
  for (const c of active) {
    const key = c.partner ?? '—';
    byPartner.set(key, (byPartner.get(key) ?? 0) + (c.fee ?? 0));
  }

  const denom = firmRevenue > 0 ? firmRevenue : 0;
  const rows: FeeConcentrationRow[] = active.map((c) => {
    const fee = c.fee ?? 0;
    const pie = !!c.listed;
    const ratioFirm = denom > 0 ? fee / denom : 0;
    const partnerTotal = byPartner.get(c.partner ?? '—') ?? 0;
    const ratioPartner = partnerTotal > 0 ? fee / partnerTotal : 0;
    return {
      clientId: c.id,
      client: c.name ?? c.id,
      partner: c.partner ?? '—',
      pie,
      fee,
      ratioFirm,
      ratioPartner,
      level: classify(ratioFirm, pie, config),
      threshold: pie ? config.pieBreach : config.nonPieWatch,
    };
  });

  rows.sort((a, b) => b.ratioFirm - a.ratioFirm);

  return {
    rows,
    firmRevenue: denom,
    totalFee: rows.reduce((s, r) => s + r.fee, 0),
    breaches: rows.filter((r) => r.level === 'breach').length,
    watches: rows.filter((r) => r.level === 'watch').length,
    topRatio: rows.length ? rows[0].ratioFirm : 0,
  };
}

/** Peta clientId → baris konsentrasi, untuk disuntik ke mesin keberlanjutan (pemicu). */
export function feeConcentrationMap(sum: FeeConcentrationSummary): Record<string, FeeConcentrationRow> {
  const m: Record<string, FeeConcentrationRow> = {};
  for (const r of sum.rows) m[r.clientId] = r;
  return m;
}
