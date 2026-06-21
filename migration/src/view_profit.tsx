/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { useAudit, useNav } from './contexts';
import { I } from './icons';
import { SubBar } from './shell.jsx';
import { Avatar, Btn, Panel, Seg, Stat } from './ui.jsx';
import { KvBox } from './view_analytical';

/* ============================================================
   Asseris — Partner & Engagement Profitability (Package F)
   ============================================================ */
const { useState: useStatePRF, useMemo: useMemoPRF } = React;

const RATE_CARD = { Partner: 2_500_000, Manager: 1_200_000, Senior: 700_000, Junior: 400_000 };
const DEFAULT_MIX = { Partner: 0.05, Manager: 0.15, Senior: 0.35, Junior: 0.45 };

/* realization assumption (billing %) per engagement — cost is DERIVED, not assumed */
const REALIZATION = {
  'ENG-2025-014': 0.91, 'ENG-2025-040': 0.88, 'ENG-2025-031': 0.84, 'ENG-2025-063': 0.79,
  'ENG-2025-022': 0.93, 'ENG-2025-058': 0.96, 'ENG-2025-047': 0.90,
};

/* blended hourly rate from the engagement's actual staffing mix (SCHEDULE) × rate card */
function blendedRate(engId) {
  const sched: any = AMS.SCHEDULE || [];
  let wsum = 0, hsum = 0;
  sched.forEach(m => m.alloc.filter(a => a.eng === engId).forEach(a => { const r = RATE_CARD[m.role] || RATE_CARD.Senior; wsum += a.hrs * r; hsum += a.hrs; }));
  if (hsum > 0) return { rate: wsum / hsum, source: 'staffing aktual' };
  // fallback: default grade mix
  const rate = Object.entries(DEFAULT_MIX).reduce((s, [g, p]) => s + p * RATE_CARD[g], 0);
  return { rate, source: 'mix standar' };
}

/* Fee & hours DERIVED from canonical data; cost = actual hours × blended rate (hours × rate per grade). */
function buildEngEcon(extraHoursByEng = {}) {
  const { ENGAGEMENTS, CLIENTS } = AMS as any;
  return ENGAGEMENTS.map(e => {
    const c = CLIENTS.find(x => x.id === e.clientId) || {};
    const hours = e.actualHrs + (extraHoursByEng[e.id] || 0);
    const br = blendedRate(e.id);
    const stdCost = Math.round(hours * br.rate);
    return { id: e.id, client: (c.name || '').replace(' Tbk', ''), partner: e.partner.split(',')[0],
      fee: c.fee || 0, hours, budgetHrs: e.budgetHrs, stdCost, blendedRate: br.rate, costSource: br.source,
      realized: REALIZATION[e.id] || 0.9 };
  });
}

function Profitability() {
  const { fmt } = AMS;
  const nav = useNav();
  const { timeEntries } = useAudit();
  const [view, setView] = useStatePRF('engagement');
  const [sel, setSel] = useStatePRF(null);

  // logged timesheet hours flow into the active engagement's hours (ENG-2025-014)
  const loggedHours = (timeEntries || []).reduce((s, t) => s + (+t.hours || 0), 0);
  const seedLogged = ((AMS.TIME_ENTRIES as any[]) || []).reduce((s, t) => s + (+t.hours || 0), 0);
  const extraHours = { 'ENG-2025-014': Math.max(0, loggedHours - seedLogged) };

  const rows = buildEngEcon(extraHours).map(e => {
    const billed = e.fee * e.realized;             // realized fee
    const margin = billed - e.stdCost;
    const marginPct = margin / billed * 100;
    const effRate = billed / e.hours;
    const recovery = e.fee / (e.stdCost) ;          // multiplier
    return { ...e, billed, margin, marginPct, effRate, recovery };
  });

  const totFee = rows.reduce((s, r) => s + r.fee, 0);
  const totBilled = rows.reduce((s, r) => s + r.billed, 0);
  const totMargin = rows.reduce((s, r) => s + r.margin, 0);
  const avgMargin = totMargin / totBilled * 100;
  const avgReal = rows.reduce((s, r) => s + r.realized, 0) / rows.length * 100;

  // by partner
  const partners = useMemoPRF(() => {
    const m: any = {};
    rows.forEach(r => {
      if (!m[r.partner]) m[r.partner] = { partner: r.partner, fee: 0, billed: 0, margin: 0, count: 0, hours: 0 };
      m[r.partner].fee += r.fee; m[r.partner].billed += r.billed; m[r.partner].margin += r.margin; m[r.partner].count++; m[r.partner].hours += r.hours;
    });
    return (Object.values(m) as any[]).map((p: any) => ({ ...p, marginPct: p.margin / p.billed * 100 })).sort((a, b) => b.margin - a.margin);
  }, []);
  const maxPartnerMargin = Math.max(...partners.map(p => p.margin));

  const marginColor = (p) => p >= 45 ? 'var(--green)' : p >= 30 ? 'var(--blue)' : p >= 15 ? 'var(--amber)' : 'var(--red)';
  const selRow = sel ? rows.find(r => r.id === sel) : null;

  return (
    <>
      <SubBar moduleId="profitability" right={
        <div className="row gap8 ac">
          <Seg options={[{ value: 'engagement', label: 'Per Engagement' }, { value: 'partner', label: 'Per Partner' }, { value: 'leverage', label: 'Leverage & Recovery' }]} value={view} onChange={setView} />
          <Btn sm><I.download size={13} /> Export</Btn>
        </div>
      } />
      <div className="view-scroll"><div className="view-pad">
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={'Rp ' + fmt(totBilled / 1e9, 1) + ' M'} label="Pendapatan Terealisasi" /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={'Rp ' + fmt(totMargin / 1e9, 1) + ' M'} label="Margin Kotor" accent="var(--green)" /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={avgMargin.toFixed(0) + '%'} label="Margin Rata-rata" accent={marginColor(avgMargin)} /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={avgReal.toFixed(0) + '%'} label="Realization Rate" /></div></Panel>
        </div>

        {view === 'engagement' ? (
          <div className="grid" style={{ gridTemplateColumns: selRow ? '1fr 330px' : '1fr', gap: 12, alignItems: 'start' }}>
            <Panel noBody>
              <div className="panel-h"><h3>Profitabilitas per Engagement</h3><div style={{ flex: 1 }} /><span className="tiny muted">fee terealisasi − biaya standar · klik baris</span></div>
              <table className="dtbl">
                <thead><tr><th>Engagement</th><th>Partner</th><th className="num">Fee</th><th className="num">Realisasi</th><th className="num">Biaya</th><th className="num">Margin</th><th className="num" style={{ width: 110 }}>Margin %</th></tr></thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.id} className={r.id === sel ? 'sel' : ''} onClick={() => setSel(r.id)} style={{ cursor: 'pointer' }}>
                      <td><div style={{ fontWeight: 600, fontSize: 12 }}>{r.client.replace('PT ', '')}</div><div className="mono tiny muted">{r.id}</div></td>
                      <td className="tiny muted truncate" style={{ maxWidth: 90 }}>{r.partner.split(' ')[0]}</td>
                      <td className="num">{fmt(r.fee / 1e6, 0)}</td>
                      <td className="num tiny" style={{ color: r.realized >= 0.9 ? 'var(--green)' : 'var(--amber)' }}>{Math.round(r.realized * 100)}%</td>
                      <td className="num muted">{fmt(r.stdCost / 1e6, 0)}</td>
                      <td className="num" style={{ fontWeight: 600, color: r.margin > 0 ? 'var(--ink)' : 'var(--red)' }}>{fmt(r.margin / 1e6, 0)}</td>
                      <td className="num">
                        <div className="row ac gap6" style={{ justifyContent: 'flex-end' }}>
                          <div style={{ width: 42, height: 6, borderRadius: 3, background: 'var(--surface-3)' }}><div style={{ width: Math.max(4, Math.min(100, r.marginPct)) + '%', height: '100%', borderRadius: 3, background: marginColor(r.marginPct) }} /></div>
                          <span className="mono tiny" style={{ fontWeight: 700, color: marginColor(r.marginPct), width: 30 }}>{r.marginPct.toFixed(0)}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr><td colSpan={2}>TOTAL</td><td className="num">{fmt(totFee / 1e6, 0)}</td><td></td><td className="num">{fmt(rows.reduce((s, r) => s + r.stdCost, 0) / 1e6, 0)}</td><td className="num">{fmt(totMargin / 1e6, 0)}</td><td className="num">{avgMargin.toFixed(0)}%</td></tr></tfoot>
              </table>
            </Panel>

            {selRow && (
              <Panel noBody>
                <div style={{ background: 'var(--surface-2)', padding: '11px 14px', borderBottom: '1px solid var(--line)' }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{selRow.client}</div>
                  <div className="tiny muted mono">{selRow.id} · {selRow.partner}</div>
                </div>
                <div style={{ padding: 14 }}>
                  <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                    <KvBox label="Fee Kontrak" v={'Rp ' + fmt(selRow.fee / 1e6, 0) + ' jt'} />
                    <KvBox label="Realisasi" v={Math.round(selRow.realized * 100) + '%'} accent={selRow.realized >= 0.9 ? 'var(--green)' : 'var(--amber)'} />
                    <KvBox label="Effective Rate" v={'Rp ' + fmt(selRow.effRate / 1e3, 0) + 'k/h'} />
                    <KvBox label="Recovery" v={selRow.recovery.toFixed(2) + '×'} />
                  </div>
                  <div className="panel" style={{ padding: '8px 10px', background: 'var(--surface-2)', borderColor: 'var(--line)', marginBottom: 12 }}>
                    <div className="tiny muted" style={{ lineHeight: 1.45 }}>Biaya dihitung dari <b>{fmt(selRow.hours)} jam aktual × Rp {fmt(selRow.blendedRate / 1e3, 0)}k/jam</b> (blended rate dari {selRow.costSource}).</div>
                  </div>
                  {/* margin waterfall */}
                  <div className="tiny muted upper" style={{ marginBottom: 8 }}>Dekomposisi Margin</div>
                  <div style={{ display: 'grid', gap: 7 }}>
                    {[['Fee terealisasi', selRow.billed, 'var(--blue)'], ['(−) Biaya standar tim', -selRow.stdCost, 'var(--red)'], ['Margin kotor', selRow.margin, 'var(--green)']].map(([l, v, c], i) => (
                      <div key={l}>
                        <div className="row jb tiny" style={{ marginBottom: 2 }}><span style={{ fontWeight: i === 2 ? 700 : 400 }}>{l}</span><span className="mono" style={{ fontWeight: 700, color: v < 0 ? 'var(--red)' : 'var(--ink)' }}>{fmt(v / 1e6, 0)} jt</span></div>
                        <div style={{ height: 6, borderRadius: 3, background: 'var(--surface-3)' }}><div style={{ width: Math.min(100, Math.abs(v) / selRow.billed * 100) + '%', height: '100%', borderRadius: 3, background: c }} /></div>
                      </div>
                    ))}
                  </div>
                  <div className="panel" style={{ marginTop: 12, padding: '9px 11px', background: selRow.marginPct >= 30 ? 'var(--green-bg)' : 'var(--amber-bg)', borderColor: 'transparent' }}>
                    <div className="tiny" style={{ fontWeight: 600, lineHeight: 1.4 }}>{selRow.marginPct >= 30 ? 'Margin sehat. Engagement berkontribusi positif terhadap laba firma.' : 'Margin di bawah target 30% — tinjau scope, fee, atau efisiensi tim.'}</div>
                  </div>
                  <Btn sm style={{ width: '100%', marginTop: 10 }} onClick={() => nav('time')}><I.clock size={13} /> Lihat Time & Budget</Btn>
                </div>
              </Panel>
            )}
          </div>
        ) : view === 'partner' ? (
          <Panel noBody>
            <div className="panel-h"><h3>Profitabilitas per Partner</h3><div style={{ flex: 1 }} /><span className="tiny muted">kontribusi margin ke firma</span></div>
            <div style={{ padding: '8px 14px 14px' }}>
              {partners.map(p => (
                <div key={p.partner} style={{ padding: '11px 0', borderBottom: '1px solid var(--line-soft)' }}>
                  <div className="row ac gap10">
                    <Avatar name={p.partner} size={34} />
                    <div style={{ width: 150, flex: '0 0 150px' }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600 }}>{p.partner}</div>
                      <div className="tiny muted">{p.count} engagement · {fmt(p.hours)} jam</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="row jb tiny" style={{ marginBottom: 3 }}><span className="muted">Margin kontribusi</span><span className="mono" style={{ fontWeight: 700 }}>Rp {fmt(p.margin / 1e6, 0)} jt · {p.marginPct.toFixed(0)}%</span></div>
                      <div style={{ height: 12, borderRadius: 6, background: 'var(--surface-3)' }}><div style={{ width: (p.margin / maxPartnerMargin * 100) + '%', height: '100%', borderRadius: 6, background: marginColor(p.marginPct) }} /></div>
                    </div>
                    <div style={{ width: 90, flex: '0 0 90px', textAlign: 'right' }}>
                      <div className="mono" style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>Rp {fmt(p.fee / 1e9, 1)}M</div>
                      <div className="tiny muted">portofolio fee</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        ) : (
          <LeverageRecovery rows={rows} fmt={fmt} marginColor={marginColor} />
        )}
      </div></div>
    </>
  );
}

/* Leverage (staff pyramid) + WIP recovery / write-down analysis */
function LeverageRecovery({ rows, fmt, marginColor }) {
  const sched: any = AMS.SCHEDULE || [];
  const GRADE_COST = { Partner: 2_500_000, Manager: 1_200_000, Senior: 700_000, Junior: 400_000 };
  const CHARGE_MULT = 2.4; // standard charge-out vs cost
  // hours by grade across firm
  const byGrade = { Partner: 0, Manager: 0, Senior: 0, Junior: 0 };
  sched.forEach(m => { const g = GRADE_COST[m.role] ? m.role : 'Senior'; m.alloc.forEach(a => { byGrade[g] = (byGrade[g] || 0) + a.hrs; }); });
  const totalH = Object.values(byGrade).reduce((s, h) => s + h, 0) || 1;
  const pyramid = ['Partner', 'Manager', 'Senior', 'Junior'].map(g => ({ g, h: byGrade[g] || 0, pct: (byGrade[g] || 0) / totalH }));
  const leverage = (byGrade.Senior + byGrade.Junior) / Math.max(1, byGrade.Partner + byGrade.Manager);

  // recovery / write-down per engagement: WIP charge-out vs realized fee
  const rec = rows.map(r => {
    const wipCharge = Math.round(r.hours * r.blendedRate * CHARGE_MULT);
    const recovery = r.billed / wipCharge;
    const writedown = wipCharge - r.billed; // positive = write-down
    return { ...r, wipCharge, recovery, writedown };
  });
  const totWip = rec.reduce((s, r) => s + r.wipCharge, 0);
  const totBilled = rec.reduce((s, r) => s + r.billed, 0);
  const totWd = totWip - totBilled;
  const avgRecovery = totBilled / totWip;
  const GRADE_C = { Partner: '#013a52', Manager: '#005085', Senior: '#0a6b8a', Junior: '#5b9bb5' };

  return (
    <div className="grid" style={{ gridTemplateColumns: '360px 1fr', gap: 12, alignItems: 'start' }}>
      <div style={{ display: 'grid', gap: 12 }}>
        <Panel title="Piramida Leverage Tim" sub={'rasio ' + leverage.toFixed(1) + ' : 1 (staf : pemimpin)'}>
          <div style={{ display: 'grid', gap: 8 }}>
            {pyramid.map(p => (
              <div key={p.g}>
                <div className="row jb tiny" style={{ marginBottom: 3 }}><span style={{ fontWeight: 600 }}>{p.g}</span><span className="mono" style={{ fontWeight: 700 }}>{fmt(p.h)} jam · {(p.pct * 100).toFixed(0)}%</span></div>
                <div style={{ height: 14, borderRadius: 4, background: 'var(--surface-3)' }}><div style={{ width: (p.pct * 100) + '%', height: '100%', borderRadius: 4, background: GRADE_C[p.g] }} /></div>
              </div>
            ))}
          </div>
          <div className="panel" style={{ marginTop: 12, padding: '9px 11px', background: leverage >= 2.5 ? 'var(--green-bg)' : 'var(--amber-bg)', borderColor: 'transparent' }}>
            <div className="tiny" style={{ lineHeight: 1.5 }}>{leverage >= 2.5 ? 'Leverage sehat — porsi pekerjaan terdelegasi ke grade junior, menjaga efisiensi biaya & margin.' : 'Leverage rendah — terlalu banyak jam partner/manager. Delegasikan lebih banyak ke senior/junior untuk menaikkan margin.'}</div>
          </div>
        </Panel>
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <KvBox label="WIP Charge-out" v={'Rp ' + fmt(totWip / 1e9, 1) + ' M'} />
          <KvBox label="Recovery Rate" v={(avgRecovery * 100).toFixed(0) + '%'} accent={avgRecovery >= 0.9 ? 'var(--green)' : 'var(--amber)'} />
          <KvBox label="Realisasi Fee" v={'Rp ' + fmt(totBilled / 1e9, 1) + ' M'} />
          <KvBox label="Write-down" v={'Rp ' + fmt(totWd / 1e6, 0) + ' jt'} accent="var(--red)" />
        </div>
      </div>

      <Panel noBody>
        <div className="panel-h"><h3>WIP Recovery & Write-down per Engagement</h3><div style={{ flex: 1 }} /><span className="tiny muted">charge-out vs fee terealisasi · Rp jt</span></div>
        <table className="dtbl">
          <thead><tr><th>Engagement</th><th>Partner</th><th className="num">Jam</th><th className="num">WIP Charge-out</th><th className="num">Fee Realisasi</th><th className="num">Write-up/(down)</th><th className="num" style={{ width: 110 }}>Recovery</th></tr></thead>
          <tbody>
            {rec.map(r => (
              <tr key={r.id}>
                <td><div style={{ fontWeight: 600, fontSize: 12 }}>{r.client.replace('PT ', '')}</div><div className="mono tiny muted">{r.id}</div></td>
                <td className="tiny muted truncate" style={{ maxWidth: 90 }}>{r.partner.split(' ')[0]}</td>
                <td className="num">{fmt(r.hours)}</td>
                <td className="num muted">{fmt(r.wipCharge / 1e6, 0)}</td>
                <td className="num">{fmt(r.billed / 1e6, 0)}</td>
                <td className="num" style={{ fontWeight: 600, color: r.writedown > 0 ? 'var(--red)' : 'var(--green)' }}>{r.writedown > 0 ? '(' + fmt(r.writedown / 1e6, 0) + ')' : '+' + fmt(-r.writedown / 1e6, 0)}</td>
                <td className="num"><div className="row ac gap6" style={{ justifyContent: 'flex-end' }}><div style={{ width: 42, height: 6, borderRadius: 3, background: 'var(--surface-3)' }}><div style={{ width: Math.min(100, r.recovery * 100) + '%', height: '100%', borderRadius: 3, background: marginColor(r.recovery * 100 - 50) }} /></div><span className="mono tiny" style={{ fontWeight: 700, width: 32 }}>{(r.recovery * 100).toFixed(0)}%</span></div></td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr><td colSpan={3}>TOTAL</td><td className="num">{fmt(totWip / 1e6, 0)}</td><td className="num">{fmt(totBilled / 1e6, 0)}</td><td className="num" style={{ color: 'var(--red)' }}>({fmt(totWd / 1e6, 0)})</td><td className="num">{(avgRecovery * 100).toFixed(0)}%</td></tr></tfoot>
        </table>
        <div className="tiny muted" style={{ padding: '8px 12px', lineHeight: 1.5 }}>WIP charge-out = jam × tarif standar (cost × {CHARGE_MULT}). Selisih terhadap fee terealisasi adalah <b>write-up</b> (fee &gt; standar) atau <b>write-down</b> (penghapusan WIP tak tertagih). Recovery rata-rata firma <b>{(avgRecovery * 100).toFixed(0)}%</b>.</div>
      </Panel>
    </div>
  );
}

Object.assign(window, { Profitability });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { Profitability };
