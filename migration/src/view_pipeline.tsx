/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { useAmsPersist, useNav } from './contexts.jsx';
import { I } from './icons.jsx';
import { SubBar } from './shell.jsx';
import { Avatar, Badge, Btn, Panel, Seg, Stat } from './ui.jsx';
import { KvBox } from './view_analytical.jsx';

/* ============================================================
   NeoSuite AMS — Sales Pipeline + Billing & Invoicing (Package D)
   ============================================================ */
const { useState: useStateD1, useMemo: useMemoD1 } = React;

/* ---------------- Sales Pipeline ---------------- */
const PIPE_STAGES = [
  { id: 'Lead', color: '#8a97a1' },
  { id: 'Qualified', color: '#0a6b73' },
  { id: 'Proposal', color: '#005085' },
  { id: 'Negotiation', color: '#9a6a00' },
  { id: 'Won', color: '#1f7a4d' },
];

function SalesPipeline() {
  const { fmt } = AMS;
  const [opps, setOpps] = useAmsPersist('pipeline', () => AMS.PIPELINE);
  const [dragId, setDragId] = useStateD1(null);
  const [over, setOver] = useStateD1(null);
  const [detail, setDetail] = useStateD1(null);

  const active = opps.filter(o => o.stage !== 'Lost');
  const weighted = active.filter(o => o.stage !== 'Won').reduce((s, o) => s + o.value * o.prob / 100, 0);
  const won = opps.filter(o => o.stage === 'Won').reduce((s, o) => s + o.value, 0);
  const openCount = opps.filter(o => !['Won', 'Lost'].includes(o.stage)).length;
  const winRate = Math.round(opps.filter(o => o.stage === 'Won').length / (opps.filter(o => ['Won', 'Lost'].includes(o.stage)).length || 1) * 100);

  const move = (id, stage) => setOpps(list => list.map(o => o.id === id ? { ...o, stage, prob: stage === 'Won' ? 100 : stage === 'Lost' ? 0 : o.prob } : o));
  const detailOpp = detail ? opps.find(o => o.id === detail) : null;
  const [showNew, setShowNew] = useStateD1(false);
  const addOpp = (o) => setOpps(list => [{ id: 'OPP-' + (108 + list.length), stage: 'Lead', ...o }, ...list]);

  return (
    <>
      <SubBar moduleId="pipeline" right={
        <div className="row gap8 ac">
          <span className="tiny muted">Tarik kartu antar-tahap</span>
          <Btn sm variant="primary" onClick={() => setShowNew(true)}><I.plus size={14} /> Peluang Baru</Btn>
        </div>
      } />
      <div className="view-scroll"><div className="view-pad">
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={openCount} label="Peluang Aktif" /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={'Rp ' + fmt(weighted / 1e9, 1) + ' M'} label="Pipeline Tertimbang" accent="var(--blue)" /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={'Rp ' + fmt(won / 1e9, 1) + ' M'} label="Dimenangkan (YTD)" accent="var(--green)" /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={winRate + '%'} label="Win Rate" /></div></Panel>
        </div>

        <div className="grid" style={{ gridTemplateColumns: 'repeat(5,1fr)', gap: 10, alignItems: 'start' }}>
          {PIPE_STAGES.map(st => {
            const col = opps.filter(o => o.stage === st.id);
            const colVal = col.reduce((s, o) => s + o.value, 0);
            return (
              <div key={st.id}
                onDragOver={(e) => { e.preventDefault(); if (over !== st.id) setOver(st.id); }}
                onDragLeave={() => setOver(o => o === st.id ? null : o)}
                onDrop={(e) => { e.preventDefault(); if (dragId) move(dragId, st.id); setDragId(null); setOver(null); }}
                style={{ borderRadius: 8, padding: 5, minHeight: 120, background: over === st.id ? 'var(--blue-050)' : 'transparent', outline: over === st.id ? '2px dashed var(--blue)' : 'none' }}>
                <div className="row ac gap6" style={{ marginBottom: 8, padding: '0 3px' }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: st.color }} />
                  <span style={{ fontWeight: 700, fontSize: 11.5 }}>{st.id}</span>
                  <span className="chip tiny">{col.length}</span>
                </div>
                <div className="tiny muted mono" style={{ padding: '0 3px 8px' }}>Rp {fmt(colVal / 1e6, 0)} jt</div>
                <div className="grid" style={{ gap: 8 }}>
                  {col.map(o => (
                    <div key={o.id} className="panel" draggable
                      onDragStart={() => setDragId(o.id)} onDragEnd={() => { setDragId(null); setOver(null); }}
                      onClick={() => setDetail(o.id)}
                      style={{ padding: 10, cursor: 'grab', borderTop: '3px solid ' + st.color, opacity: dragId === o.id ? .4 : 1 }}>
                      <div className="truncate" style={{ fontWeight: 600, fontSize: 12 }}>{o.name.replace('PT ', '')}</div>
                      <div className="tiny muted" style={{ marginBottom: 6 }}>{o.service}</div>
                      <div className="row jb ac">
                        <span className="mono" style={{ fontWeight: 700, fontSize: 12 }}>Rp {fmt(o.value / 1e6, 0)} jt</span>
                        <span className="badge" style={{ background: 'var(--surface-3)', color: o.prob >= 70 ? 'var(--green)' : o.prob >= 40 ? 'var(--amber)' : 'var(--ink-3)' }}>{o.prob}%</span>
                      </div>
                      <div className="row ac gap6" style={{ marginTop: 6 }}><Avatar name={o.owner} size={17} /><span className="tiny muted">{o.owner.split(' ')[0]}</span></div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div></div>
      {detailOpp && <OppDetail o={detailOpp} onClose={() => setDetail(null)} onMove={move} />}
      {showNew && <OppForm onClose={() => setShowNew(false)} onAdd={(o) => { addOpp(o); setShowNew(false); }} />}
    </>
  );
}

function OppForm({ onClose, onAdd }) {
  const { fmt } = AMS;
  const [d, setD] = useStateD1({ name: '', service: 'Audit Laporan Keuangan', industry: '', value: 500000000, prob: 25, owner: 'Hartono Wijaya', close: '2026-06-30' });
  const set = (k, v) => setD(s => ({ ...s, [k]: v }));
  const valid = d.name.trim() && d.industry.trim() && +d.value > 0;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,20,30,.4)', zIndex: 90, display: 'grid', placeItems: 'center' }} onClick={onClose}>
      <div className="panel" style={{ width: 540, maxWidth: '94vw', boxShadow: 'var(--shadow-lg)' }} onClick={e => e.stopPropagation()}>
        <div style={{ background: 'linear-gradient(125deg,#013a52,#005085)', color: '#fff', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 10, borderRadius: '4px 4px 0 0' }}>
          <I.trend size={18} /><div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 14 }}>Peluang Baru</div><div className="tiny" style={{ color: '#bcd6e4' }}>Tambah ke pipeline penjualan</div></div>
          <button className="top-btn" onClick={onClose}><I.x size={18} /></button>
        </div>
        <div style={{ padding: 16, display: 'grid', gap: 12 }}>
          <div className="field"><label>Nama Calon Klien</label><input className="input" value={d.name} onChange={e => set('name', e.target.value)} placeholder="PT Calon Klien Sejahtera" /></div>
          <div className="grid" style={{ gridTemplateColumns: '1.4fr 1fr', gap: 10 }}>
            <div className="field"><label>Jasa</label><select className="select" value={d.service} onChange={e => set('service', e.target.value)}>{['Audit Laporan Keuangan', 'Review (SPR 2400)', 'Agreed-Upon Procedures', 'Due Diligence', 'Audit + Tax', 'Advisory'].map(s => <option key={s}>{s}</option>)}</select></div>
            <div className="field"><label>Industri</label><input className="input" value={d.industry} onChange={e => set('industry', e.target.value)} placeholder="Manufaktur" /></div>
          </div>
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="field"><label>Nilai Estimasi (Rp)</label><input className="input mono" type="number" value={d.value} onChange={e => set('value', +e.target.value)} style={{ textAlign: 'right' }} /></div>
            <div className="field"><label>Probabilitas (%)</label><input className="input mono" type="number" value={d.prob} onChange={e => set('prob', +e.target.value)} style={{ textAlign: 'right' }} /></div>
          </div>
          <div className="grid" style={{ gridTemplateColumns: '1.4fr 1fr', gap: 10 }}>
            <div className="field"><label>Owner</label><select className="select" value={d.owner} onChange={e => set('owner', e.target.value)}>{['Hartono Wijaya', 'Rudi Gunawan', 'Sari Dewanti', 'Bayu Saputra'].map(s => <option key={s}>{s}</option>)}</select></div>
            <div className="field"><label>Target Close</label><input className="input" type="date" value={d.close} onChange={e => set('close', e.target.value)} /></div>
          </div>
        </div>
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Btn onClick={onClose}>Batal</Btn>
          <Btn variant="primary" disabled={!valid} style={{ opacity: valid ? 1 : .5 }} onClick={() => onAdd(d)}><I.check size={14} /> Tambah Peluang</Btn>
        </div>
      </div>
    </div>
  );
}

function OppDetail({ o, onClose, onMove }) {
  const { fmt } = AMS;
  const nav = useNav();
  const toOnboarding = () => {
    const blank = (AMS as any).PROSPECTS[1].acceptance.factors.map((f: any) => ({ ...f, s: 3, note: '' }));
    (window as any).amsAddProspect({
      id: 'PROS-' + o.id.replace('OPP-', ''), name: o.name, industry: o.industry, city: 'Indonesia',
      listed: false, kind: 'Klien Baru', service: o.service, standard: o.service.includes('Review') ? 'SPR 2400' : o.service.includes('Due') ? 'SJAH 3000' : 'SA',
      partner: o.owner.includes(',') ? o.owner : o.owner + ', CPA', manager: 'Bayu Saputra',
      fee: o.value, materiality: Math.round(o.value * 2.5), npwp: '—', fyEnd: '31 Desember 2025',
      deadline: o.close, budgetHrs: Math.max(400, Math.round(o.value / 700000)), source: o.id,
      acceptance: { approved: false, decision: '', approver: '', date: '', safeguard: '', factors: blank },
      pmpj: { verified: false, riskRating: 'Sedang', cddLevel: 'Standar', str: false, purpose: 'Perikatan ' + o.service.toLowerCase() + '.', ubo: [], screening: [] },
      letter: { version: 0, status: 'draft', scope: 'Perikatan ' + o.service + ' FY2025.', esign: [] },
    });
    onMove(o.id, 'Won');
    onClose();
    nav('onboarding');
  };
  const accept = [
    { t: 'Integritas & reputasi calon klien', ok: true },
    { t: 'Independensi & potensi konflik kepentingan', ok: true },
    { t: 'Kompetensi & kapasitas sumber daya', ok: o.stage !== 'Lead' },
    { t: 'Penilaian risiko perikatan & fee proporsional', ok: o.prob >= 50 },
  ];
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,20,30,.32)', zIndex: 88 }} onClick={onClose}>
      <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 420, maxWidth: '94vw', background: 'var(--surface)', boxShadow: 'var(--shadow-lg)', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        <div style={{ background: 'linear-gradient(125deg,#013a52,#005085)', color: '#fff', padding: '15px 18px' }}>
          <div className="row jb ac" style={{ marginBottom: 8 }}><span className="mono tiny" style={{ color: '#bcd6e4', fontWeight: 700 }}>{o.id}</span><button className="top-btn" onClick={onClose}><I.x size={18} /></button></div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{o.name}</div>
          <div className="tiny" style={{ color: '#bcd6e4' }}>{o.service} · {o.industry}</div>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            <KvBox label="Nilai Estimasi" v={'Rp ' + fmt(o.value / 1e6, 0) + ' jt'} />
            <KvBox label="Probabilitas" v={o.prob + '%'} accent={o.prob >= 70 ? 'var(--green)' : 'var(--amber)'} />
            <KvBox label="Owner" v={o.owner.split(',')[0]} />
            <KvBox label="Target Close" v={new Date(o.close).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })} />
          </div>
          <div className="tiny muted upper" style={{ marginBottom: 8 }}>Penerimaan Klien (SA 220 / ISQM)</div>
          <div style={{ display: 'grid', gap: 0, marginBottom: 16 }}>
            {accept.map((a, i) => (
              <div key={i} className="row gap8 ac" style={{ padding: '8px 0', borderBottom: i < accept.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
                <span style={{ color: a.ok ? 'var(--green)' : 'var(--ink-4)' }}>{a.ok ? <I.checkCircle size={16} /> : <I.clock size={16} />}</span>
                <span style={{ fontSize: 12, flex: 1 }}>{a.t}</span>
              </div>
            ))}
          </div>
          <div className="panel" style={{ padding: '10px 12px', background: o.prob >= 50 ? 'var(--green-bg)' : 'var(--amber-bg)', borderColor: 'transparent' }}>
            <div className="tiny" style={{ fontWeight: 600, lineHeight: 1.4 }}>{o.prob >= 50 ? 'Penilaian penerimaan memadai — siap terbitkan engagement letter & konversi ke perikatan.' : 'Lengkapi penilaian penerimaan sebelum mengirim proposal.'}</div>
          </div>
        </div>
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--line)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Btn variant="primary" onClick={toOnboarding}><I.arrowRight size={14} /> Kirim ke Onboarding Klien</Btn>
          <div className="row gap8">
            <Btn style={{ flex: 1 }} onClick={() => { onMove(o.id, 'Won'); onClose(); }}><I.check size={14} /> Tandai Menang</Btn>
            <Btn onClick={() => { onMove(o.id, 'Lost'); onClose(); }}>Kalah</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Billing & Invoicing ---------------- */
const INV_STATUS = { Paid: 'green', Partial: 'amber', Sent: 'blue', Overdue: 'red', Draft: 'gray' };

function Billing() {
  const { fmt } = AMS;
  const nav = useNav();
  const [invoices, setInvoices] = useAmsPersist('invoices', () => AMS.INVOICES);
  const [filter, setFilter] = useStateD1('All');
  const [sel, setSel] = useStateD1(null);

  const totalBilled = invoices.filter(i => i.status !== 'Draft').reduce((s, i) => s + i.amount, 0);
  const collected = invoices.reduce((s, i) => s + i.paid, 0);
  const outstanding = totalBilled - collected;
  const overdue = invoices.filter(i => i.status === 'Overdue').reduce((s, i) => s + (i.amount - i.paid), 0);

  const shown = filter === 'All' ? invoices : invoices.filter(i => i.status === filter);
  const markPaid = (id) => setInvoices(list => list.map(i => i.id === id ? { ...i, paid: i.amount, status: 'Paid' } : i));
  const send = (id) => setInvoices(list => list.map(i => i.id === id ? { ...i, status: 'Sent' } : i));
  const selInv = sel ? invoices.find(i => i.id === sel) : null;
  const [showNew, setShowNew] = useStateD1(false);
  const addInv = (inv) => setInvoices(list => [{ id: 'INV-2026-0' + (46 + list.length), issued: '2026-03-09', paid: 0, status: 'Draft', ...inv }, ...list]);

  return (
    <>
      <SubBar moduleId="billing" right={
        <div className="row gap8 ac">
          <Seg options={['All', 'Draft', 'Sent', 'Overdue', 'Paid']} value={filter} onChange={setFilter} />
          <Btn sm variant="primary" onClick={() => setShowNew(true)}><I.plus size={14} /> Faktur Baru</Btn>
        </div>
      } />
      <div className="view-scroll"><div className="view-pad">
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={'Rp ' + fmt(totalBilled / 1e9, 1) + ' M'} label="Total Ditagih" /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={'Rp ' + fmt(collected / 1e9, 1) + ' M'} label="Terkumpul" accent="var(--green)" /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={'Rp ' + fmt(outstanding / 1e6, 0) + ' jt'} label="Outstanding" accent="var(--amber)" /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={'Rp ' + fmt(overdue / 1e6, 0) + ' jt'} label="Jatuh Tempo Lewat" accent="var(--red)" /></div></Panel>
        </div>

        <div className="grid" style={{ gridTemplateColumns: selInv ? '1fr 340px' : '1fr', gap: 12, alignItems: 'start' }}>
          <Panel noBody>
            <div className="panel-h"><h3>Daftar Faktur</h3><div style={{ flex: 1 }} /><span className="tiny muted">{shown.length} faktur · klik untuk detail</span></div>
            <table className="dtbl">
              <thead><tr><th>No. Faktur</th><th>Klien</th><th>Termin</th><th className="num">Nilai</th><th className="num">Dibayar</th><th>Jatuh Tempo</th><th>Status</th></tr></thead>
              <tbody>
                {shown.map(i => (
                  <tr key={i.id} className={i.id === sel ? 'sel' : ''} onClick={() => setSel(i.id)} style={{ cursor: 'pointer' }}>
                    <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{i.id}</td>
                    <td className="truncate" style={{ maxWidth: 170, fontWeight: 600 }}>{i.client.replace('PT ', '')}</td>
                    <td className="tiny muted">{i.milestone}</td>
                    <td className="num">{fmt(i.amount / 1e6, 0)} jt</td>
                    <td className="num muted">{i.paid ? fmt(i.paid / 1e6, 0) + ' jt' : '—'}</td>
                    <td className="mono tiny" style={{ color: i.status === 'Overdue' ? 'var(--red)' : 'var(--ink-3)' }}>{new Date(i.due).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</td>
                    <td><Badge kind={INV_STATUS[i.status]}>{i.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr><td colSpan={3}>TOTAL</td><td className="num">{fmt(shown.reduce((s, i) => s + i.amount, 0) / 1e6, 0)} jt</td><td className="num">{fmt(shown.reduce((s, i) => s + i.paid, 0) / 1e6, 0)} jt</td><td colSpan={2}></td></tr></tfoot>
            </table>
          </Panel>

          {selInv && (
            <Panel noBody>
              <div style={{ background: 'var(--surface-2)', padding: '11px 14px', borderBottom: '1px solid var(--line)' }}>
                <div className="row jb ac"><span className="mono" style={{ fontWeight: 700, color: 'var(--blue)' }}>{selInv.id}</span><Badge kind={INV_STATUS[selInv.status]}>{selInv.status}</Badge></div>
                <div style={{ fontWeight: 700, fontSize: 13, marginTop: 3 }}>{selInv.client}</div>
                <div className="tiny muted mono">{selInv.eng} · {selInv.milestone}</div>
              </div>
              <div style={{ padding: 14 }}>
                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                  <KvBox label="Nilai Faktur" v={'Rp ' + fmt(selInv.amount / 1e6, 0) + ' jt'} />
                  <KvBox label="Sisa Tagihan" v={'Rp ' + fmt((selInv.amount - selInv.paid) / 1e6, 0) + ' jt'} accent={selInv.amount - selInv.paid > 0 ? 'var(--amber)' : 'var(--green)'} />
                  <KvBox label="Diterbitkan" v={new Date(selInv.issued).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })} />
                  <KvBox label="Jatuh Tempo" v={new Date(selInv.due).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })} accent={selInv.status === 'Overdue' ? 'var(--red)' : null} />
                </div>
                {selInv.status === 'Overdue' && <div className="panel" style={{ padding: '9px 11px', background: 'var(--red-bg)', borderColor: 'transparent', marginBottom: 12 }}><div className="row ac gap8"><span style={{ color: 'var(--red)' }}><I.alert size={15} /></span><span className="tiny" style={{ fontWeight: 600 }}>Faktur melewati jatuh tempo — kirim pengingat / eskalasi collections.</span></div></div>}
                <div className="row gap8" style={{ flexWrap: 'wrap' }}>
                  {selInv.status === 'Draft' && <Btn sm variant="primary" onClick={() => send(selInv.id)}><I.send size={13} /> Kirim Faktur</Btn>}
                  {selInv.status !== 'Paid' && selInv.status !== 'Draft' && <Btn sm variant="primary" onClick={() => markPaid(selInv.id)}><I.check size={13} /> Tandai Lunas</Btn>}
                  <Btn sm onClick={() => window.amsPrintDoc && window.amsPrintDoc()}><I.download size={13} /> Cetak</Btn>
                  <Btn sm onClick={() => nav('firmfinance')}><I.coins size={13} /> Ke Firm Finance</Btn>
                </div>
              </div>
            </Panel>
          )}
        </div>
      </div></div>
      {showNew && <InvForm onClose={() => setShowNew(false)} onAdd={(i) => { addInv(i); setShowNew(false); }} />}
    </>
  );
}

function InvForm({ onClose, onAdd }) {
  const { fmt } = AMS;
  const clients: any = AMS.CLIENTS;
  const [d, setD] = useStateD1({ clientId: clients[0].id, milestone: 'Termin 1 (50%)', amount: 500000000, due: '2026-04-15', eng: '' });
  const set = (k, v) => setD(s => ({ ...s, [k]: v }));
  const valid = +d.amount > 0;
  const submit = () => { const c = clients.find(x => x.id === d.clientId); onAdd({ clientId: d.clientId, client: c.name, eng: d.eng || '—', milestone: d.milestone, amount: +d.amount, due: d.due }); };
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,20,30,.4)', zIndex: 90, display: 'grid', placeItems: 'center' }} onClick={onClose}>
      <div className="panel" style={{ width: 500, maxWidth: '94vw', boxShadow: 'var(--shadow-lg)' }} onClick={e => e.stopPropagation()}>
        <div style={{ background: 'linear-gradient(125deg,#013a52,#005085)', color: '#fff', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 10, borderRadius: '4px 4px 0 0' }}>
          <I.receipt size={18} /><div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 14 }}>Faktur Baru</div><div className="tiny" style={{ color: '#bcd6e4' }}>Terbitkan tagihan ke klien (status awal Draft)</div></div>
          <button className="top-btn" onClick={onClose}><I.x size={18} /></button>
        </div>
        <div style={{ padding: 16, display: 'grid', gap: 12 }}>
          <div className="field"><label>Klien</label><select className="select" value={d.clientId} onChange={e => set('clientId', e.target.value)}>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="field"><label>Termin</label><select className="select" value={d.milestone} onChange={e => set('milestone', e.target.value)}>{['Termin 1 (50%)', 'Termin 2 (30%)', 'Termin 3 (20%)', 'Final (100%)'].map(s => <option key={s}>{s}</option>)}</select></div>
            <div className="field"><label>Engagement (opsional)</label><input className="input mono" value={d.eng} onChange={e => set('eng', e.target.value)} placeholder="ENG-2025-014" /></div>
          </div>
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="field"><label>Nilai (Rp)</label><input className="input mono" type="number" value={d.amount} onChange={e => set('amount', +e.target.value)} style={{ textAlign: 'right' }} /></div>
            <div className="field"><label>Jatuh Tempo</label><input className="input" type="date" value={d.due} onChange={e => set('due', e.target.value)} /></div>
          </div>
          <div className="tiny muted mono">Total: Rp {fmt(+d.amount || 0)}</div>
        </div>
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Btn onClick={onClose}>Batal</Btn>
          <Btn variant="primary" disabled={!valid} style={{ opacity: valid ? 1 : .5 }} onClick={submit}><I.check size={14} /> Terbitkan Faktur</Btn>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { SalesPipeline, Billing });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { Billing, SalesPipeline };
