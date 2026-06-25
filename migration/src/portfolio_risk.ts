/* ============================================================
   Asseris — Portfolio Risk (agregasi RoMM level-firma)

   Agregator murni & deterministik atas register RoMM per-perikatan
   untuk pengawasan Partner lintas-klien. SSOT: setiap angka "dinilai"
   diturunkan dari register risiko kanonik — tidak ada angka hardcode.
   Perikatan tanpa register tersimpan ditandai "belum dinilai" dan hanya
   membawa rating risiko level-perikatan kasar dari metadata ENGAGEMENTS
   (BERLABEL jelas — bukan skor RoMM).

   Ambang "signifikan" = L×I ≥ 12, konsisten dengan stat "Risiko
   Signifikan" di view_risk. Band skor mengikuti scoreColor/scoreLabel
   di view_risk (≥15 Significant · ≥10 Elevated · ≥5 Moderate · else Low).
   ============================================================ */

export type RiskBand = 'Significant' | 'Elevated' | 'Moderate' | 'Low';

export interface PortfolioRiskRow {
  engagementId: string;
  clientId: string;
  client: string;
  industry: string;
  partner: string;
  phase: string;
  type: string;
  /** rating kasar level-perikatan dari ENGAGEMENTS.risk (metadata, bukan RoMM) */
  engRating: string;
  /** true bila perikatan punya register RoMM tersimpan */
  assessed: boolean;
  /** jumlah risiko di register (0 bila belum dinilai) */
  total: number;
  /** jumlah risiko signifikan (L×I ≥ 12) */
  significant: number;
  /** jumlah fraud risk (SA 240) */
  fraud: number;
  /** skor tertinggi (L×I) di register */
  maxScore: number;
  /** band turunan dari maxScore */
  band: RiskBand;
}

export interface PortfolioRiskSummary {
  rows: PortfolioRiskRow[];
  engagements: number;
  assessed: number;
  unassessed: number;
  totalRisks: number;
  significant: number;
  fraud: number;
}

interface EngLike {
  id: string;
  clientId: string;
  partner?: string;
  phase?: string;
  type?: string;
  risk?: string;
}
interface ClientLike { id: string; name?: string; industry?: string }
interface RiskLike { engagementId?: string; likelihood?: number; impact?: number; fraud?: boolean }

const SIGNIFICANT_THRESHOLD = 12; // L×I

export function riskBand(score: number): RiskBand {
  if (score >= 15) return 'Significant';
  if (score >= 10) return 'Elevated';
  if (score >= 5) return 'Moderate';
  return 'Low';
}

export function riskBandColor(band: RiskBand): string {
  switch (band) {
    case 'Significant': return '#b3261e';
    case 'Elevated': return '#d4641c';
    case 'Moderate': return '#c79a1e';
    default: return '#1f7a4d';
  }
}

/**
 * Agregasikan profil risiko lintas-perikatan untuk tampilan portofolio firma.
 * @param engagements daftar perikatan (ENGAGEMENTS)
 * @param clients daftar klien (CLIENTS) untuk resolusi nama/industri
 * @param allRisks register RoMM kanonik (flat; di-grup internal per engagementId)
 */
export function portfolioRisk(
  engagements: EngLike[],
  clients: ClientLike[],
  allRisks: RiskLike[],
): PortfolioRiskSummary {
  const byClient = new Map<string, ClientLike>();
  for (const c of clients) byClient.set(c.id, c);

  const byEng = new Map<string, RiskLike[]>();
  for (const r of allRisks) {
    const eid = r.engagementId;
    if (!eid) continue;
    const list = byEng.get(eid);
    if (list) list.push(r); else byEng.set(eid, [r]);
  }

  const rows: PortfolioRiskRow[] = engagements.map((e) => {
    const reg = byEng.get(e.id) ?? [];
    const cl = byClient.get(e.clientId);
    let significant = 0;
    let fraud = 0;
    let maxScore = 0;
    for (const r of reg) {
      const sc = (r.likelihood ?? 0) * (r.impact ?? 0);
      if (sc >= SIGNIFICANT_THRESHOLD) significant++;
      if (r.fraud) fraud++;
      if (sc > maxScore) maxScore = sc;
    }
    return {
      engagementId: e.id,
      clientId: e.clientId,
      client: cl?.name ?? e.clientId,
      industry: cl?.industry ?? '—',
      partner: e.partner ?? '—',
      phase: e.phase ?? '—',
      type: e.type ?? '—',
      engRating: e.risk ?? '—',
      assessed: reg.length > 0,
      total: reg.length,
      significant,
      fraud,
      maxScore,
      band: riskBand(maxScore),
    };
  });

  // urut: yang sudah dinilai dulu, lalu skor tertinggi, lalu # signifikan
  rows.sort((a, b) => {
    if (a.assessed !== b.assessed) return a.assessed ? -1 : 1;
    if (b.maxScore !== a.maxScore) return b.maxScore - a.maxScore;
    return b.significant - a.significant;
  });

  return {
    rows,
    engagements: rows.length,
    assessed: rows.filter((r) => r.assessed).length,
    unassessed: rows.filter((r) => !r.assessed).length,
    totalRisks: rows.reduce((s, r) => s + r.total, 0),
    significant: rows.reduce((s, r) => s + r.significant, 0),
    fraud: rows.reduce((s, r) => s + r.fraud, 0),
  };
}
