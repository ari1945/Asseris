/* [codemod] ESM imports */
import React from 'react';
import { useFirm, useNav } from './contexts.jsx';
import { I } from './icons.jsx';
import { Avatar, Badge, Btn, Donut, Panel, Progress, Seg, Stat } from './ui.jsx';
import { FGauge, Funnel, HBars } from './view_fpm_parts.jsx';

/* ============================================================
   NeoSuite AMS — Client CRM · extra tabs
   360° Klien · Aktivitas & Interaksi · Peluang (cross-sell) ·
   Segmentasi. (Direktori stays in view_firm.jsx.)
   ============================================================ */
const { useState: useCRM2 } = React;

const STAGE_COLOR = { Lead: '#9aa7b2', Qualified: '#5b3fa6', Proposal: '#0a6b73', Negotiation: '#005085', Won: '#1f7a4d', Lost: '#b3261e' };

/* ---------------- 360° Klien (single-client cockpit) ---------------- */
function CRM360() {
  const { fmt, rp } = window.AMS;
  const nav = useNav();
  const { clients, engagementsForClient, setActiveEngagementId } = useFirm();
  const C360 = window.AMS.CRM_360;
  const META = window.AMS.ACTIVITY_META;
  const withData = clients.filter(c => C360[c.id]);
  const [selId, setSelId] = useCRM2((withData[0] || clients[0]).id);
  const sel = clients.find(c => c.id === selId) || clients[0];
  const h = C360[sel.id] || {};
  const engs = engagementsForClient(sel.id);

  return (
    <div className="view-scroll"><div className="view-pad">
      <div className="grid" style={{ gridTemplateColumns: '270px 1fr', gap: 12, alignItems: 'start' }}>
        {/* client rail */}
        <Panel noBody>
          <div className="panel-h"><h3>Portofolio</h3><div style={{ flex: 1 }} /><span className="chip tiny">{withData.length}</span></div>
          <div style={{ maxHeight: 560, overflow: 'auto' }}>
            {withData.sort((a, b) => (C360[b.id].health) - (C360[a.id].health)).map(c => {
              const ch = C360[c.id];
              return (
                <div key={c.id} onClick={() => setSelId(c.id)} className="row ac gap8" style={{ padding: '9px 12px', borderBottom: '1px solid var(--line-soft)', cursor: 'pointer', background: c.id === selId ? 'var(--blue-100)' : 'transparent' }}>
                  <span style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--navy)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700, flex: '0 0 30px' }}>{c.name.replace('PT ', '').slice(0, 2).toUpperCase()}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="truncate" style={{ fontWeight: 600, fontSize: 12 }}>{c.name.replace('PT ', '')}</div>
                    <div className="tiny muted">Health {ch.health} · NPS {ch.nps}</div>
                  </div>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: ch.health >= 80 ? 'var(--green)' : ch.health >= 65 ? 'var(--amber)' : 'var(--red)', flex: '0 0 8px' }} />
                </div>
              );
            })}
          </div>
        </Panel>

        {/* cockpit */}
        <div className="grid" style={{ gap: 12 }}>
          <Panel noBody>
            <div style={{ background: 'linear-gradient(120deg,#013a52,#005085)', color: '#fff', padding: '16px 18px' }} className="row ac gap12">
              <span style={{ width: 50, height: 50, borderRadius: 12, background: 'rgba(255,255,255,.15)', display: 'grid', placeItems: 'center', fontSize: 17, fontWeight: 700 }}>{sel.name.replace('PT ', '').slice(0, 2).toUpperCase()}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row ac gap8"><span style={{ fontSize: 16, fontWeight: 700 }} className="truncate">{sel.name}</span>{sel.listed && <span className="badge b-blue">IDX</span>}</div>
                <div className="tiny" style={{ color: '#bcd6e4' }}>{sel.industry} · klien sejak {sel.since} · partner {h.partnerRel}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <FGauge value={h.health} max={100} label="Relationship Health" color={h.health >= 80 ? '#52c08a' : h.health >= 65 ? '#e0a93a' : '#e07a6a'} size={104} />
              </div>
            </div>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(5,1fr)', gap: 0 }}>
              {[['CSAT', h.csat + ' / 5'], ['NPS', h.nps, h.nps >= 50 ? 'var(--green)' : h.nps >= 30 ? 'var(--amber)' : 'var(--red)'], ['Annual Fee', rp(sel.fee / 1e6, 0) + ' jt'], ['DSO', h.dso + ' hari', h.dso > 60 ? 'var(--amber)' : undefined], ['Outstanding', rp(h.outstanding / 1e6, 0) + ' jt', h.outstanding > 0 ? 'var(--amber)' : 'var(--green)']].map(([l, v, a], i) => (
                <div key={l} style={{ padding: '11px 14px', borderLeft: i ? '1px solid var(--line-soft)' : 0 }}><Stat value={v} label={l} accent={a} /></div>
              ))}
            </div>
          </Panel>

          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }}>
            <Panel title="Kontrak Aktif" sub={(h.contracts || []).length + ' kontrak'}>
              <div style={{ padding: 12, display: 'grid', gap: 8 }}>
                {(h.contracts || []).map(ct => (
                  <div key={ct.id} className="panel" style={{ padding: 10, boxShadow: 'none' }}>
                    <div className="row jb ac" style={{ marginBottom: 3 }}><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{ct.id}</span><Badge kind={ct.status === 'Aktif' ? 'green' : 'gray'}>{ct.status}</Badge></div>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{ct.type}</div>
                    <div className="row jb tiny muted" style={{ marginTop: 3 }}><span>Rp {fmt(ct.value / 1e6, 0)} jt · {ct.renewal}</span><span className="mono">{ct.start} → {ct.end}</span></div>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Peluang Cross-sell" sub={(h.opps || []).length + ' peluang'}>
              <div style={{ padding: 12, display: 'grid', gap: 8 }}>
                {(h.opps || []).length === 0 && <div className="muted tiny" style={{ padding: 4 }}>Tidak ada peluang terbuka.</div>}
                {(h.opps || []).map(o => (
                  <div key={o.id} className="row ac gap10" style={{ padding: '7px 9px', borderRadius: 7, background: 'var(--surface-2)' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: STAGE_COLOR[o.stage], flex: '0 0 8px' }} />
                    <div style={{ flex: 1, minWidth: 0 }}><div className="truncate" style={{ fontSize: 12, fontWeight: 600 }}>{o.svc}</div><div className="tiny muted">{o.stage} · target {o.close}</div></div>
                    <div style={{ textAlign: 'right' }}><div className="mono tiny" style={{ fontWeight: 700 }}>Rp {fmt(o.value / 1e6, 0)} jt</div><div className="tiny muted">{o.prob}%</div></div>
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          <div className="grid" style={{ gridTemplateColumns: '1.2fr 1fr', gap: 12, alignItems: 'start' }}>
            <Panel title="Riwayat Interaksi" sub={'kontak terakhir ' + h.lastContact}>
              <div style={{ padding: '6px 14px 12px' }}>
                {(h.activities || []).map((a, i) => {
                  const m = META[a.type] || META.doc;
                  return (
                    <div key={i} className="row gap10" style={{ padding: '9px 0', borderBottom: i < h.activities.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
                      <span style={{ width: 28, height: 28, borderRadius: 7, background: m.color, color: '#fff', display: 'grid', placeItems: 'center', flex: '0 0 28px' }}>{React.createElement(I[m.icon] || I.doc, { size: 14 })}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, lineHeight: 1.4 }}>{a.note}</div>
                        <div className="tiny muted">{new Date(a.d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })} · {m.label} · {a.who}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Panel>

            <Panel title="Engagement" sub={engs.length + ' perikatan'}>
              <div style={{ padding: 12, display: 'grid', gap: 8 }}>
                {engs.map(e => (
                  <div key={e.id} className="row ac gap8" style={{ padding: '8px 10px', borderRadius: 7, background: 'var(--surface-2)', cursor: 'pointer' }} onClick={() => { setActiveEngagementId(e.id); nav('engagement'); }}>
                    <div style={{ flex: 1, minWidth: 0 }}><div className="row ac gap6"><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{e.id}</span><Badge>{e.status}</Badge></div><div className="tiny muted">{e.type}</div></div>
                    <div style={{ width: 80 }}><div className="row ac gap6"><Progress value={e.progress} /><span className="mono tiny">{e.progress}%</span></div></div>
                  </div>
                ))}
                <Btn sm style={{ width: '100%' }} onClick={() => nav('engagement')}><I.briefcase size={13} /> Kelola Engagement</Btn>
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </div></div>
  );
}

/* ---------------- Aktivitas & Interaksi (firm-wide feed) ---------------- */
function CRMAktivitas() {
  const { clients } = useFirm();
  const C360 = window.AMS.CRM_360;
  const META = window.AMS.ACTIVITY_META;
  const [filter, setFilter] = useCRM2('all');

  const feed = [];
  clients.forEach(c => { (C360[c.id]?.activities || []).forEach(a => feed.push({ ...a, client: c.name.replace('PT ', ''), clientId: c.id })); });
  feed.sort((a, b) => b.d.localeCompare(a.d));
  const shown = filter === 'all' ? feed : feed.filter(f => f.type === filter);

  const counts = Object.keys(META).map(k => ({ k, n: feed.filter(f => f.type === k).length }));
  const byWho = Object.values(feed.reduce((m, f) => { m[f.who] = m[f.who] || { who: f.who, n: 0 }; m[f.who].n++; return m; }, {})).sort((a, b) => b.n - a.n);

  return (
    <div className="view-scroll"><div className="view-pad">
      <div className="grid" style={{ gridTemplateColumns: 'repeat(5,1fr)', marginBottom: 12 }}>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={feed.length} label="Total Interaksi (90 hari)" /></div></Panel>
        {counts.map(c => <Panel key={c.k}><div style={{ padding: '11px 14px' }}><Stat value={c.n} label={META[c.k].label} accent={META[c.k].color} /></div></Panel>)}
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1.6fr 1fr', gap: 12, alignItems: 'start' }}>
        <Panel noBody>
          <div className="panel-h"><h3>Aktivitas Firma</h3><div style={{ flex: 1 }} />
            <Seg options={[{ value: 'all', label: 'Semua' }, { value: 'meeting', label: 'Rapat' }, { value: 'call', label: 'Telepon' }, { value: 'email', label: 'Email' }, { value: 'doc', label: 'Dokumen' }]} value={filter} onChange={setFilter} />
          </div>
          <div style={{ maxHeight: 520, overflow: 'auto' }}>
            {shown.map((a, i) => {
              const m = META[a.type] || META.doc;
              return (
                <div key={i} className="row gap10" style={{ padding: '11px 14px', borderBottom: '1px solid var(--line-soft)' }}>
                  <span style={{ width: 30, height: 30, borderRadius: 8, background: m.color, color: '#fff', display: 'grid', placeItems: 'center', flex: '0 0 30px' }}>{React.createElement(I[m.icon] || I.doc, { size: 15 })}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, lineHeight: 1.4 }}>{a.note}</div>
                    <div className="tiny muted row ac gap6"><b style={{ color: 'var(--ink-2)' }}>{a.client}</b> · {m.label} · {a.who} · {new Date(a.d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        <div className="grid" style={{ gap: 12 }}>
          <Panel title="Komposisi Interaksi">
            <div style={{ padding: 14 }}>
              <HBars rows={counts.map(c => ({ label: META[c.k].label, value: c.n, color: META[c.k].color }))} />
            </div>
          </Panel>
          <Panel title="Aktivitas per Anggota Tim">
            <div style={{ padding: 14 }}>
              {byWho.map(w => (
                <div key={w.who} className="row ac gap8" style={{ padding: '5px 0' }}>
                  <Avatar name={w.who} size={24} />
                  <span style={{ flex: 1, fontSize: 12, fontWeight: 600 }}>{w.who}</span>
                  <span className="mono tiny" style={{ fontWeight: 700 }}>{w.n}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div></div>
  );
}

/* ---------------- Peluang (cross-sell pipeline) ---------------- */
function CRMPeluang() {
  const { fmt } = window.AMS;
  const nav = useNav();
  const { clients } = useFirm();
  const C360 = window.AMS.CRM_360;

  const opps = [];
  clients.forEach(c => { (C360[c.id]?.opps || []).forEach(o => opps.push({ ...o, client: c.name.replace('PT ', ''), clientId: c.id })); });
  const openOpps = opps.filter(o => !['Won', 'Lost'].includes(o.stage));
  const gross = openOpps.reduce((s, o) => s + o.value, 0);
  const weighted = openOpps.reduce((s, o) => s + o.value * o.prob / 100, 0);
  const stages = ['Lead', 'Qualified', 'Proposal', 'Negotiation'];
  const funnel = stages.map(st => {
    const items = openOpps.filter(o => o.stage === st);
    const g = items.reduce((s, o) => s + o.value, 0);
    return { label: st, value: g || 1, disp: 'Rp ' + fmt(g / 1e6, 0) + ' jt', n: items.length, color: STAGE_COLOR[st] };
  });

  return (
    <div className="view-scroll"><div className="view-pad">
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 12 }}>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={openOpps.length} label="Peluang Cross-sell Aktif" /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={'Rp ' + fmt(gross / 1e9, 2) + ' M'} label="Nilai Gross" /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={'Rp ' + fmt(weighted / 1e9, 2) + ' M'} label="Tertimbang" accent="var(--blue)" /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={new Set(openOpps.map(o => o.clientId)).size} label="Klien dengan Peluang" /></div></Panel>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1.4fr', gap: 12, alignItems: 'start' }}>
        <Panel title="Funnel Cross-sell" sub="dari basis klien aktif" actions={<Btn sm variant="ghost" onClick={() => nav('pipeline')}><I.arrowRight size={13} /></Btn>}>
          <div style={{ padding: '16px 14px' }}><Funnel stages={funnel} /></div>
        </Panel>

        <Panel noBody>
          <div className="panel-h"><h3>Daftar Peluang</h3><div style={{ flex: 1 }} /><span className="tiny muted">jasa di luar audit LK menambah net revenue retention</span></div>
          <table className="dtbl">
            <thead><tr><th>Peluang</th><th>Klien</th><th>Tahap</th><th className="num">Nilai</th><th className="num">Prob.</th><th className="num">Tertimbang</th><th style={{ width: 70 }}>Target</th></tr></thead>
            <tbody>
              {opps.sort((a, b) => (b.value * b.prob) - (a.value * a.prob)).map(o => (
                <tr key={o.id}>
                  <td className="truncate" style={{ maxWidth: 180, fontWeight: 600 }}>{o.svc}</td>
                  <td className="tiny muted truncate" style={{ maxWidth: 110 }}>{o.client}</td>
                  <td><span className="row ac gap6"><span style={{ width: 8, height: 8, borderRadius: '50%', background: STAGE_COLOR[o.stage], flex: '0 0 8px' }} /><span className="tiny">{o.stage}</span></span></td>
                  <td className="num">{fmt(o.value / 1e6, 0)} jt</td>
                  <td className="num muted">{o.prob}%</td>
                  <td className="num" style={{ fontWeight: 700, color: o.stage === 'Lost' ? 'var(--ink-4)' : 'var(--blue)' }}>{o.stage === 'Lost' ? '—' : fmt(o.value * o.prob / 100 / 1e6, 0) + ' jt'}</td>
                  <td className="tiny mono muted">{o.close}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>
    </div></div>
  );
}

/* ---------------- Segmentasi ---------------- */
function CRMSegmentasi() {
  const { fmt, rp } = window.AMS;
  const { clients } = useFirm();
  const C360 = window.AMS.CRM_360;

  const seg = (keyFn) => {
    const m = {};
    clients.forEach(c => { const k = keyFn(c); if (!m[k]) m[k] = { k, n: 0, fee: 0 }; m[k].n++; m[k].fee += c.fee; });
    return Object.values(m).sort((a, b) => b.fee - a.fee);
  };
  const byIndustry = seg(c => c.industry.split(' · ')[0]);
  const byTier = seg(c => c.tier);
  const totFee = clients.reduce((s, c) => s + c.fee, 0);
  const tierColor = { 'Tier 1': '#005085', 'Tier 2': '#0a6b73', 'Tier 3': '#9aa7b2' };
  const riskColor = { High: '#b3261e', Medium: '#caa53d', Low: '#1f7a4d' };

  /* tier × risk matrix */
  const tiers = ['Tier 1', 'Tier 2', 'Tier 3'], risks = ['High', 'Medium', 'Low'];
  const cell = (t, r) => clients.filter(c => c.tier === t && c.risk === r);
  const healthVals = clients.filter(c => C360[c.id]).map(c => C360[c.id].health);
  const avgHealth = Math.round(healthVals.reduce((s, v) => s + v, 0) / (healthVals.length || 1));

  return (
    <div className="view-scroll"><div className="view-pad">
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 12 }}>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={clients.length} label="Total Klien" /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={'Rp ' + fmt(totFee / 1e9, 1) + ' M'} label="Total Annual Fee" /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={clients.filter(c => c.listed).length} label="Emiten (IDX)" accent="var(--blue)" /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={avgHealth} label="Rata-rata Health" accent={avgHealth >= 75 ? 'var(--green)' : 'var(--amber)'} /></div></Panel>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start', marginBottom: 12 }}>
        <Panel title="Segmentasi per Industri" sub="fee tahunan">
          <div style={{ padding: 14 }}><HBars rows={byIndustry.map(s => ({ label: s.k, value: s.fee, right: 'Rp ' + fmt(s.fee / 1e6, 0) + ' jt', sub: s.n + ' klien', color: 'var(--navy)' }))} /></div>
        </Panel>
        <Panel title="Segmentasi per Tier">
          <div style={{ padding: 14 }}>
            <div className="row gap12 ac">
              <Donut segments={byTier.map(t => ({ value: t.fee, color: tierColor[t.k] || '#9aa7b2' }))} size={100} thickness={15}
                center={<><div className="mono" style={{ fontSize: 14, fontWeight: 700 }}>{clients.length}</div><div className="tiny muted">klien</div></>} />
              <div style={{ flex: 1 }}>
                {byTier.map(t => (
                  <div key={t.k} className="row jb ac" style={{ padding: '4px 0' }}>
                    <span className="row ac gap6"><span style={{ width: 9, height: 9, borderRadius: 2, background: tierColor[t.k] || '#9aa7b2' }} /><span style={{ fontSize: 12, fontWeight: 600 }}>{t.k}</span></span>
                    <span className="tiny muted">{t.n} klien · {rp(t.fee / 1e6, 0)} jt · {(t.fee / totFee * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Panel>
      </div>

      <Panel title="Matriks Tier × Risiko" sub="jumlah klien & fee per sel">
        <div style={{ padding: 14, overflowX: 'auto' }}>
          <table className="dtbl" style={{ minWidth: 480 }}>
            <thead><tr><th style={{ width: 90 }}>Tier \ Risiko</th>{risks.map(r => <th key={r} className="num"><span className="row ac gap6 je"><span style={{ width: 9, height: 9, borderRadius: 2, background: riskColor[r] }} />{r}</span></th>)}<th className="num">Total</th></tr></thead>
            <tbody>
              {tiers.map(t => {
                const rowClients = clients.filter(c => c.tier === t);
                return (
                  <tr key={t}>
                    <td style={{ fontWeight: 700 }}>{t}</td>
                    {risks.map(r => {
                      const cs = cell(t, r);
                      const fee = cs.reduce((s, c) => s + c.fee, 0);
                      return <td key={r} className="num" style={{ background: cs.length ? 'rgba(0,80,133,' + Math.min(0.28, cs.length * 0.12) + ')' : 'transparent' }}>{cs.length ? <span><b>{cs.length}</b> <span className="muted tiny">{fmt(fee / 1e6, 0)} jt</span></span> : <span className="muted">—</span>}</td>;
                    })}
                    <td className="num" style={{ fontWeight: 700 }}>{rowClients.length}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot><tr><td>Total</td>{risks.map(r => <td key={r} className="num">{clients.filter(c => c.risk === r).length}</td>)}<td className="num">{clients.length}</td></tr></tfoot>
          </table>
        </div>
      </Panel>
    </div></div>
  );
}

Object.assign(window, { CRM360, CRMAktivitas, CRMPeluang, CRMSegmentasi });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { CRM360, CRMAktivitas, CRMPeluang, CRMSegmentasi };
