/* ============================================================
   NeoSuite AMS — BI & Konsolidasi · extra tabs
   Pendapatan · Pipeline & Forecast · Klien & Konsentrasi ·
   Partner & Produktivitas. (Ikhtisar stays in view_bi.jsx.)
   ============================================================ */
const { useState: useBI2 } = React;

/* ---------------- Pendapatan ---------------- */
function BIPendapatan() {
  const { fmt } = window.AMS;
  const B = window.AMS.BI_DATA;
  const IND = window.AMS.BI_INDUSTRY;
  const FB = window.AMS.FIRM_BUDGET;
  const totalInd = IND.reduce((s, x) => s + x.rev, 0);

  const actRev = FB.filter(b => b.type === 'rev').reduce((s, b) => s + b.actual, 0);
  const actCost = FB.filter(b => b.type === 'cost').reduce((s, b) => s + b.actual, 0);
  const profit = actRev - actCost;
  const yoy = (B.fyRevenue / B.prevYearRevenue - 1) * 100;

  return (
    <div className="view-scroll"><div className="view-pad">
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 12 }}>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={'Rp ' + fmt(actRev / 1e9, 1) + ' M'} label="Pendapatan FY2025" delta={yoy.toFixed(1) + '% YoY'} deltaDir="up" /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={'Rp ' + fmt(profit / 1e9, 1) + ' M'} label="Laba Operasi" accent="var(--green)" /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={(profit / actRev * 100).toFixed(0) + '%'} label="Margin Operasi" /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={'Rp ' + fmt((B.targetRevenue - B.fyRevenue) / 1e9, 1) + ' M'} label="Selisih ke Target" accent="var(--amber)" /></div></Panel>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1.5fr 1fr', gap: 12, alignItems: 'start', marginBottom: 12 }}>
        <Panel title="Pendapatan & Margin · 12 Bulan" sub="garis biru = pendapatan (Rp jt) · garis hijau = margin (%)">
          <div style={{ padding: '14px 16px' }}>
            <LineChart labels={B.months}
              series={[{ name: 'Pendapatan (Rp jt)', color: '#005085', data: B.monthlyRev, fill: true }]}
              yMax={Math.max(...B.monthlyRev) * 1.15} />
            <div className="divider" />
            <LineChart labels={B.months} height={90}
              series={[{ name: 'Margin (%)', color: '#1f7a4d', data: B.monthlyMargin }, { name: 'Utilisasi (%)', color: '#0a6b73', data: B.monthlyUtil }]}
              yMax={100} />
          </div>
        </Panel>

        <Panel title="Pendapatan per Industri" sub={'total Rp ' + fmt(totalInd / 1e9, 1) + ' M'}>
          <div style={{ padding: 14 }}>
            <div className="row gap12 ac" style={{ marginBottom: 14 }}>
              <Donut segments={IND.map(s => ({ value: s.rev, color: s.color }))} size={100} thickness={15}
                center={<><div className="mono" style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>{IND.length}</div><div className="tiny muted">sektor</div></>} />
              <div style={{ flex: 1 }}>
                <HBars rows={IND.slice().sort((a, b) => b.rev - a.rev).map(s => ({ label: s.industry, value: s.rev, right: (s.rev / totalInd * 100).toFixed(0) + '%', color: s.color, sub: s.clients + ' klien' }))} />
              </div>
            </div>
          </div>
        </Panel>
      </div>

      <Panel noBody>
        <div className="panel-h"><h3>Pendapatan per Lini Jasa</h3><div style={{ flex: 1 }} /><span className="tiny muted">diversifikasi mengurangi ketergantungan audit LK</span></div>
        <table className="dtbl">
          <thead><tr><th>Lini Jasa</th><th>Standar</th><th className="num">Pendapatan</th><th style={{ width: 200 }}>Porsi</th><th className="num">Kontribusi</th></tr></thead>
          <tbody>
            {B.revenueByService.map(s => (
              <tr key={s.svc}>
                <td><span className="row ac gap8"><span style={{ width: 9, height: 9, borderRadius: 2, background: s.color, flex: '0 0 9px' }} />{s.svc}</span></td>
                <td className="tiny muted mono">{s.std}</td>
                <td className="num" style={{ fontWeight: 700 }}>Rp {fmt(s.amount / 1e9, 2)} M</td>
                <td><Progress value={s.amount / B.revenueByService[0].amount * 100} color={s.color} /></td>
                <td className="num">{(s.amount / B.fyRevenue * 100).toFixed(0)}%</td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr><td colSpan="2">Total Pendapatan FY2025</td><td className="num">Rp {fmt(B.fyRevenue / 1e9, 1)} M</td><td></td><td className="num">100%</td></tr></tfoot>
        </table>
      </Panel>
    </div></div>
  );
}

/* ---------------- Pipeline & Forecast ---------------- */
function BIPipeline() {
  const { fmt } = window.AMS;
  const nav = useNav();
  const PIPE = window.AMS.PIPELINE;
  const WL = window.AMS.BI_WINLOSS;

  const open = PIPE.filter(p => !['Won', 'Lost'].includes(p.stage));
  const gross = open.reduce((s, p) => s + p.value, 0);
  const weighted = open.reduce((s, p) => s + p.value * p.prob / 100, 0);
  const avgDeal = Math.round(gross / (open.length || 1));
  const stages = ['Lead', 'Qualified', 'Proposal', 'Negotiation'];
  const stColor = { Lead: '#9aa7b2', Qualified: '#5b3fa6', Proposal: '#0a6b73', Negotiation: '#005085' };
  const funnel = stages.map(st => {
    const items = open.filter(p => p.stage === st);
    const g = items.reduce((s, p) => s + p.value, 0);
    return { label: st, value: g, disp: 'Rp ' + fmt(g / 1e6, 0) + ' jt', n: items.length, color: stColor[st] };
  });
  const byPartner = Object.values(open.reduce((m, p) => {
    if (!m[p.owner]) m[p.owner] = { owner: p.owner, gross: 0, wt: 0, n: 0 };
    m[p.owner].gross += p.value; m[p.owner].wt += p.value * p.prob / 100; m[p.owner].n++;
    return m;
  }, {})).sort((a, b) => b.wt - a.wt);
  const maxWL = Math.max(...WL.byQuarter.map(q => q.w + q.l), 1);

  return (
    <div className="view-scroll"><div className="view-pad">
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 12 }}>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={'Rp ' + fmt(gross / 1e9, 2) + ' M'} label="Pipeline Gross" /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={'Rp ' + fmt(weighted / 1e9, 2) + ' M'} label="Tertimbang Probabilitas" accent="var(--blue)" /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={WL.winRate + '%'} label="Win Rate (TTM)" accent="var(--green)" /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={'Rp ' + fmt(avgDeal / 1e6, 0) + ' jt'} label="Rata-rata Deal" /></div></Panel>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1.3fr 1fr', gap: 12, alignItems: 'start', marginBottom: 12 }}>
        <Panel title="Funnel Pipeline" sub="nilai gross & konversi antar-tahap" actions={<Btn sm variant="ghost" onClick={() => nav('pipeline')}><I.arrowRight size={13} /></Btn>}>
          <div style={{ padding: '16px 14px' }}><Funnel stages={funnel} /></div>
        </Panel>

        <Panel title="Win / Loss per Kuartal" sub={WL.won + ' menang · ' + WL.lost + ' kalah'}>
          <div style={{ padding: '14px 16px' }}>
            <div className="row gap12" style={{ alignItems: 'flex-end', height: 130 }}>
              {WL.byQuarter.map(q => (
                <div key={q.q} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                  <div style={{ width: '60%', display: 'flex', flexDirection: 'column-reverse', height: '100%', justifyContent: 'flex-start' }}>
                    <div style={{ height: (q.w / maxWL * 100) + '%', background: '#1f7a4d', borderRadius: '3px 3px 0 0', minHeight: q.w ? 4 : 0 }} title={q.w + ' menang'} />
                    <div style={{ height: (q.l / maxWL * 100) + '%', background: '#b3261e', minHeight: q.l ? 4 : 0 }} title={q.l + ' kalah'} />
                  </div>
                  <span className="tiny muted">{q.q}</span>
                </div>
              ))}
            </div>
            <div className="row gap12 ac" style={{ marginTop: 8 }}>
              <span className="row ac gap6 tiny" style={{ fontWeight: 600 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: '#1f7a4d' }} />Menang</span>
              <span className="row ac gap6 tiny" style={{ fontWeight: 600 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: '#b3261e' }} />Kalah</span>
              <div style={{ flex: 1 }} />
              <span className="tiny muted">Alasan kalah: {WL.lossReasons.map(r => r.r).join(', ')}</span>
            </div>
          </div>
        </Panel>
      </div>

      <Panel noBody>
        <div className="panel-h"><h3>Forecast Tertimbang per Partner</h3></div>
        <table className="dtbl">
          <thead><tr><th>Partner</th><th className="num">Peluang</th><th className="num">Gross</th><th className="num">Tertimbang</th><th style={{ width: 200 }}>Kontribusi Forecast</th></tr></thead>
          <tbody>
            {byPartner.map(p => (
              <tr key={p.owner}>
                <td><span className="row ac gap8"><Avatar name={p.owner} size={24} />{p.owner}</span></td>
                <td className="num">{p.n}</td>
                <td className="num muted">Rp {fmt(p.gross / 1e6, 0)} jt</td>
                <td className="num" style={{ fontWeight: 700, color: 'var(--blue)' }}>Rp {fmt(p.wt / 1e6, 0)} jt</td>
                <td><Progress value={p.wt / byPartner[0].wt * 100} /></td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr><td>Total Forecast Tertimbang</td><td className="num">{open.length}</td><td className="num">Rp {fmt(gross / 1e6, 0)} jt</td><td className="num" style={{ color: 'var(--blue)' }}>Rp {fmt(weighted / 1e6, 0)} jt</td><td></td></tr></tfoot>
        </table>
      </Panel>
    </div></div>
  );
}

/* ---------------- Klien & Konsentrasi ---------------- */
function BIKlien() {
  const { fmt } = window.AMS;
  const nav = useNav();
  const CLIENTS = window.AMS.CLIENTS;
  const C360 = window.AMS.CRM_360;
  const RET = window.AMS.BI_RETENTION;

  const active = CLIENTS.filter(c => c.status === 'Active').slice().sort((a, b) => b.fee - a.fee);
  const tot = active.reduce((s, c) => s + c.fee, 0);
  const top1 = active[0].fee / tot * 100;
  const top3 = active.slice(0, 3).reduce((s, c) => s + c.fee, 0) / tot * 100;
  const hhi = Math.round(active.reduce((s, c) => s + Math.pow(c.fee / tot * 100, 2), 0));

  return (
    <div className="view-scroll"><div className="view-pad">
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 12 }}>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={top1.toFixed(0) + '%'} label="Klien Terbesar" accent={top1 > 25 ? 'var(--amber)' : 'var(--green)'} /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={top3.toFixed(0) + '%'} label="Konsentrasi 3 Klien" accent={top3 > 50 ? 'var(--amber)' : 'var(--green)'} /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={hhi} label="HHI (Konsentrasi)" /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={RET.netRevRetention + '%'} label="Net Revenue Retention" accent="var(--green)" /></div></Panel>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start', marginBottom: 12 }}>
        <Panel title="Konsentrasi Klien" sub="porsi fee tahunan" actions={<span className="chip tiny" title="Herfindahl-Hirschman Index">HHI {hhi}</span>}>
          <div style={{ padding: 14 }}>
            <HBars rows={active.map((c, i) => ({ label: c.name.replace('PT ', ''), value: c.fee, right: (c.fee / tot * 100).toFixed(0) + '%', color: i === 0 ? 'var(--amber)' : 'var(--navy)', sub: c.industry.split(' · ')[0] }))} />
            <div className="panel" style={{ padding: '9px 11px', background: top1 > 25 ? 'var(--amber-bg)' : 'var(--green-bg)', borderColor: 'transparent', marginTop: 12 }}>
              <div className="tiny" style={{ fontWeight: 600, lineHeight: 1.5 }}><I.alert size={11} /> {top1 > 25 ? 'Klien terbesar ' + top1.toFixed(0) + '% — di atas ambang 25%. Pantau independensi (imbalan) & ketergantungan.' : 'Konsentrasi dalam batas sehat.'}</div>
            </div>
          </div>
        </Panel>

        <Panel title="Retensi Klien (Cohort)" sub={'logo retention ' + RET.logoRetention + '%'}>
          <div style={{ padding: 14 }}>
            <table className="dtbl" style={{ fontSize: 11.5 }}>
              <thead><tr><th>Kohort</th><th className="num">Awal</th><th className="num">Thn 1</th><th className="num">Thn 2</th><th className="num">Thn 3</th><th className="num">Thn 4</th></tr></thead>
              <tbody>
                {RET.cohorts.map(co => (
                  <tr key={co.year}>
                    <td className="mono" style={{ fontWeight: 700 }}>{co.year}</td>
                    {[0, 1, 2, 3, 4].map(yi => {
                      const v = co.retained[yi];
                      if (v == null) return <td key={yi} className="num muted">—</td>;
                      const pct = Math.round(v / co.start * 100);
                      return <td key={yi} className="num" style={{ background: 'rgba(31,122,77,' + (pct / 100 * 0.35) + ')', fontWeight: yi === 0 ? 700 : 500 }}>{v} <span className="muted" style={{ fontSize: 9.5 }}>{pct}%</span></td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="tiny muted" style={{ marginTop: 8, lineHeight: 1.5 }}>Net revenue retention {RET.netRevRetention}% &gt; 100% — ekspansi (cross-sell & kenaikan fee) melampaui churn.</div>
          </div>
        </Panel>
      </div>

      <Panel noBody>
        <div className="panel-h"><h3>Portofolio Klien · Kesehatan Hubungan</h3><div style={{ flex: 1 }} /><Btn sm variant="ghost" onClick={() => nav('crm')}><I.users size={13} /> CRM</Btn></div>
        <table className="dtbl">
          <thead><tr><th>Klien</th><th>Industri</th><th className="num">Annual Fee</th><th className="num">Tenure</th><th className="num">CSAT</th><th className="num">NPS</th><th style={{ width: 130 }}>Health</th></tr></thead>
          <tbody>
            {active.map(c => {
              const h = C360[c.id] || {};
              return (
                <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => nav('crm')}>
                  <td><span className="row ac gap6" style={{ fontWeight: 600 }}>{c.name.replace('PT ', '')}{c.listed && <span className="badge b-blue" style={{ fontSize: 8, padding: '0 4px' }}>IDX</span>}</span></td>
                  <td className="tiny muted truncate" style={{ maxWidth: 150 }}>{c.industry}</td>
                  <td className="num">Rp {fmt(c.fee / 1e6, 0)} jt</td>
                  <td className="num">{h.tenure || c.since ? (h.tenure || (2026 - c.since)) + ' th' : '—'}</td>
                  <td className="num">{h.csat || '—'}</td>
                  <td className="num" style={{ color: h.nps >= 50 ? 'var(--green)' : h.nps >= 30 ? 'var(--amber)' : 'var(--red)' }}>{h.nps != null ? h.nps : '—'}</td>
                  <td>{h.health != null ? <div className="row ac gap6"><Progress value={h.health} color={h.health >= 80 ? 'var(--green)' : h.health >= 65 ? 'var(--amber)' : 'var(--red)'} /><span className="mono tiny">{h.health}</span></div> : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Panel>
    </div></div>
  );
}

/* ---------------- Partner & Produktivitas ---------------- */
function BIPartner() {
  const { fmt } = window.AMS;
  const nav = useNav();
  const CLIENTS = window.AMS.CLIENTS;
  const EQR = window.AMS.EQR_REVIEWS;
  const UTIL = { 'Hartono Wijaya': 71, 'Rudi Gunawan': 68, 'Sari Dewanti': 74 };
  const REAL = { 'Hartono Wijaya': 89, 'Rudi Gunawan': 85, 'Sari Dewanti': 91 };

  const partners = Object.values(CLIENTS.reduce((m, c) => {
    const p = c.partner.split(',')[0];
    if (!m[p]) m[p] = { p, fee: 0, n: 0, listed: 0 };
    m[p].fee += c.fee; m[p].n++; if (c.listed) m[p].listed++;
    return m;
  }, {})).sort((a, b) => b.fee - a.fee);
  const maxFee = Math.max(...partners.map(p => p.fee));
  const avgUtil = Math.round(Object.values(UTIL).reduce((s, v) => s + v, 0) / Object.values(UTIL).length);

  return (
    <div className="view-scroll"><div className="view-pad">
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 12 }}>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={partners.length} label="Partner Aktif" /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={avgUtil + '%'} label="Rata-rata Utilisasi" accent={avgUtil > 75 ? 'var(--amber)' : undefined} /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value="88%" label="Realization Rate" delta="+2pp" deltaDir="up" /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={EQR.length} label="EQR Aktif" /></div></Panel>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start', marginBottom: 12 }}>
        <Panel title="Portofolio Fee per Partner">
          <div style={{ padding: 14 }}>
            <HBars rows={partners.map(p => ({ label: p.p, value: p.fee, right: 'Rp ' + fmt(p.fee / 1e9, 2) + ' M', color: 'var(--blue)', sub: p.n + ' klien · ' + p.listed + ' emiten' }))} max={maxFee} />
          </div>
        </Panel>
        <Panel title="Utilisasi vs Realisasi">
          <div style={{ padding: 14, display: 'grid', gap: 14 }}>
            {partners.map(p => (
              <div key={p.p}>
                <div className="row ac gap8" style={{ marginBottom: 6 }}><Avatar name={p.p} size={26} /><span style={{ fontSize: 12.5, fontWeight: 600, flex: 1 }}>{p.p}</span></div>
                <div className="row jb tiny" style={{ marginBottom: 2 }}><span className="muted">Utilisasi</span><span className="mono" style={{ fontWeight: 700 }}>{UTIL[p.p] || 70}%</span></div>
                <Progress value={UTIL[p.p] || 70} color="#0a6b73" />
                <div className="row jb tiny" style={{ margin: '5px 0 2px' }}><span className="muted">Realisasi</span><span className="mono" style={{ fontWeight: 700 }}>{REAL[p.p] || 85}%</span></div>
                <Progress value={REAL[p.p] || 85} color="var(--green)" />
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel noBody>
        <div className="panel-h"><h3>Scorecard Partner</h3><div style={{ flex: 1 }} /><Btn sm variant="ghost" onClick={() => nav('profitability')}><I.coins size={13} /> Profitabilitas</Btn></div>
        <table className="dtbl">
          <thead><tr><th>Partner</th><th className="num">Klien</th><th className="num">Emiten</th><th className="num">Portofolio Fee</th><th className="num">EQR</th><th className="num">Util %</th><th className="num">Realisasi %</th></tr></thead>
          <tbody>
            {partners.map(p => (
              <tr key={p.p}>
                <td><span className="row ac gap8"><Avatar name={p.p} size={24} />{p.p}</span></td>
                <td className="num">{p.n}</td>
                <td className="num">{p.listed}</td>
                <td className="num" style={{ fontWeight: 700 }}>Rp {fmt(p.fee / 1e9, 2)} M</td>
                <td className="num">{EQR.filter(e => e.partner === p.p).length}</td>
                <td className="num" style={{ color: (UTIL[p.p] || 70) > 75 ? 'var(--amber)' : 'inherit' }}>{UTIL[p.p] || 70}</td>
                <td className="num" style={{ color: 'var(--green)' }}>{REAL[p.p] || 85}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div></div>
  );
}

Object.assign(window, { BIPendapatan, BIPipeline, BIKlien, BIPartner });
