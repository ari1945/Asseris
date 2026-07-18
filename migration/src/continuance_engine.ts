/* ============================================================
   Asseris — Keberlanjutan Klien (ISQM 1 ¶33–34 / SA 220)

   Mesin pemicu murni & deterministik untuk keputusan KEBERLANJUTAN
   (continuance) atas portofolio klien AKTIF — bukan penerimaan klien
   baru (itu milik modul `onboarding`). SSOT: pemicu diturunkan dari
   data kanonik (CLIENTS · INDEPENDENCE · INVOICES); keputusan tersimpan
   di-merge dari state firm-scope. Tidak ada angka hardcode.

   Pemicu (ISQM 1 ¶33–34, SA 220, Kode Etik):
     · rotasi AP (tenur vs batas; PIE 5th / jasa-keuangan 3th)  → ancaman
     · konflik kepentingan terdeklarasi                          → ancaman
     · risiko klien tinggi · emiten/PIE                          → eskalasi
     · imbalan tertunggak (faktur overdue)                       → self-interest
     · asosiasi panjang                                          → familiarity
   ============================================================ */

export type ContinuanceDecision = 'Lanjut' | 'Lanjut dengan Syarat' | 'Tidak Dilanjutkan' | 'Tertunda';
export type Attention = 'Tinggi' | 'Sedang' | 'Rendah';
export type TriggerSeverity = 'high' | 'med' | 'low';

export interface ContinuanceTrigger {
  key: string;
  label: string;
  severity: TriggerSeverity;
  detail: string;
}

/* Pengalaman tahun lalu — masukan pertimbangan keberlanjutan (SA 220.A24).
   `opinion` memakai kode ringkas (WTP · WTP-EoM · WDP · TMP · TW) atau teks penuh. */
export interface PriorYear {
  fy?: string;
  opinion?: string;
  findings?: number;
  findingsNote?: string;
  uncorrected?: number;
  changed?: string;
  difficulties?: string;
}

export interface ContinuanceRow {
  clientId: string;
  client: string;
  industry: string;
  partner: string;
  pie: boolean;
  risk: string;
  sinceYear: number;
  assocYears: number;
  triggers: ContinuanceTrigger[];
  attention: Attention;
  decision: ContinuanceDecision;
  decided: boolean;
  approver?: string;
  decidedDate?: string;
  conditions?: string;
  priorYear?: PriorYear;
}

export interface ContinuanceSummary {
  rows: ContinuanceRow[];
  total: number;
  decided: number;
  pending: number;
  attentionHigh: number;
  rotationFlags: number;
}

interface ClientLike {
  id: string;
  name?: string;
  industry?: string;
  partner?: string;
  risk?: string;
  listed?: boolean;
  since?: number;
  status?: string;
  priorYear?: PriorYear;
}

/* Opini dimodifikasi (SA 705: WDP/TMP/TW) → pemicu keberlanjutan.
   WTP & WTP-EoM (SA 706 penekanan) BUKAN modifikasi. Aman utk kode & teks penuh. */
function isOpinionModified(op?: string): boolean {
  if (!op) return false;
  const s = op.trim().toUpperCase();
  if (s.startsWith('WTP')) return false;
  return /^(WDP|TMP|TW)\b/.test(s)
    || /DENGAN PENGECUALIAN|TIDAK WAJAR|TIDAK MENYATAKAN PENDAPAT|DISCLAIMER|ADVERSE|QUALIFIED/.test(s);
}
interface IndependenceLike {
  name?: string;
  rotationClient?: string;
  tenure?: number;
  rotationLimit?: number;
  conflicts?: number;
  basis?: string;
}
interface InvoiceLike { clientId?: string; status?: string }

export interface StoredDecision {
  decision?: ContinuanceDecision;
  approver?: string;
  date?: string;
  conditions?: string;
}

const LONG_ASSOC_YEARS = 8;

export function continuanceFlags(
  clients: ClientLike[],
  independence: IndependenceLike[],
  invoices: InvoiceLike[],
  decisions: Record<string, StoredDecision>,
  refYear: number,
): ContinuanceSummary {
  const active = clients.filter((c) => (c.status ?? 'Active') === 'Active');

  const overdueBy = new Set<string>();
  for (const inv of invoices) if (inv.status === 'Overdue' && inv.clientId) overdueBy.add(inv.clientId);

  const rows: ContinuanceRow[] = active.map((c) => {
    const triggers: ContinuanceTrigger[] = [];

    const indep = independence.find((i) => !!i.rotationClient && !!c.name && i.rotationClient === c.name);
    if (indep && indep.rotationLimit != null && indep.tenure != null) {
      const t = indep.tenure;
      const lim = indep.rotationLimit;
      if (t > lim) triggers.push({ key: 'rotasi', label: 'Rotasi AP terlampaui', severity: 'high', detail: `${indep.name}: tenur ${t} th > batas ${lim} th (${indep.basis ?? ''})` });
      else if (t === lim) triggers.push({ key: 'rotasi', label: 'Rotasi AP jatuh tempo', severity: 'high', detail: `${indep.name}: tenur ${t} th = batas ${lim} th — wajib rotasi siklus ini` });
      else if (t === lim - 1) triggers.push({ key: 'rotasi', label: 'Rotasi AP mendekat', severity: 'med', detail: `${indep.name}: tenur ${t}/${lim} th` });
    }
    if (indep && (indep.conflicts ?? 0) > 0) triggers.push({ key: 'konflik', label: 'Konflik kepentingan', severity: 'high', detail: `${indep.name}: ${indep.conflicts} konflik terdeklarasi` });
    if (c.risk === 'High') triggers.push({ key: 'risiko', label: 'Risiko klien tinggi', severity: 'med', detail: 'Rating risiko klien = High' });
    if (c.listed) triggers.push({ key: 'pie', label: 'Emiten/PIE', severity: 'med', detail: 'Klien tercatat (PIE) — penelaahan keberlanjutan tahunan wajib' });
    if (c.id && overdueBy.has(c.id)) triggers.push({ key: 'fee', label: 'Imbalan tertunggak', severity: 'med', detail: 'Terdapat faktur jatuh tempo (overdue) — ancaman kepentingan pribadi' });
    const assoc = c.since != null ? refYear - c.since : 0;
    if (assoc >= LONG_ASSOC_YEARS) triggers.push({ key: 'asosiasi', label: 'Asosiasi panjang', severity: 'low', detail: `${assoc} th hubungan — ancaman kedekatan (familiarity)` });

    // Pengalaman tahun lalu (SA 220.A24 / ISQM 1 ¶34) — pemicu dari data kanonik.
    const py = c.priorYear;
    if (py) {
      if (isOpinionModified(py.opinion)) {
        triggers.push({ key: 'opiniLY', label: 'Opini modifikasian tahun lalu', severity: 'high', detail: `Opini ${py.fy ?? 'tahun lalu'}: ${py.opinion}${py.findingsNote ? ' — ' + py.findingsNote : ''}` });
      }
      const nf = py.findings ?? 0;
      if (nf >= 2) triggers.push({ key: 'temuanLY', label: 'Temuan signifikan berulang', severity: 'med', detail: `${nf} temuan signifikan tahun lalu${py.findingsNote ? ' — ' + py.findingsNote : ''}` });
      else if (nf === 1) triggers.push({ key: 'temuanLY', label: 'Temuan signifikan tahun lalu', severity: 'low', detail: py.findingsNote || '1 temuan signifikan tahun lalu' });
      if (py.changed && py.changed.trim()) triggers.push({ key: 'perubahan', label: 'Perubahan keadaan', severity: 'low', detail: py.changed });
    }

    const highCount = triggers.filter((t) => t.severity === 'high').length;
    const medCount = triggers.filter((t) => t.severity === 'med').length;
    const attention: Attention = highCount > 0 || triggers.length >= 4 ? 'Tinggi'
      : medCount >= 1 || triggers.length >= 2 ? 'Sedang' : 'Rendah';

    const stored = decisions[c.id] ?? {};
    const decision: ContinuanceDecision = stored.decision ?? 'Tertunda';
    return {
      clientId: c.id,
      client: c.name ?? c.id,
      industry: c.industry ?? '—',
      partner: c.partner ?? '—',
      pie: !!c.listed,
      risk: c.risk ?? '—',
      sinceYear: c.since ?? 0,
      assocYears: assoc,
      triggers,
      attention,
      decision,
      decided: decision !== 'Tertunda',
      approver: stored.approver,
      decidedDate: stored.date,
      conditions: stored.conditions,
      priorYear: c.priorYear,
    };
  });

  const order: Record<Attention, number> = { Tinggi: 0, Sedang: 1, Rendah: 2 };
  rows.sort((a, b) => {
    if (a.decided !== b.decided) return a.decided ? 1 : -1; // belum-diputuskan dulu
    if (order[a.attention] !== order[b.attention]) return order[a.attention] - order[b.attention];
    return b.triggers.length - a.triggers.length;
  });

  return {
    rows,
    total: rows.length,
    decided: rows.filter((r) => r.decided).length,
    pending: rows.filter((r) => !r.decided).length,
    attentionHigh: rows.filter((r) => r.attention === 'Tinggi').length,
    rotationFlags: rows.filter((r) => r.triggers.some((t) => t.key === 'rotasi')).length,
  };
}
