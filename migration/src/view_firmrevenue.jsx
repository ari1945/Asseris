/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data.js';
import { useFirm } from './contexts.jsx';
import { I } from './icons.jsx';
import { SubBar } from './shell.jsx';
import { Badge, Btn, Panel, Stat, Tabs } from './ui.jsx';
import { KvBox } from './view_analytical.jsx';
import { RowKv } from './view_calc.jsx';

/* ============================================================
   NeoSuite AMS — Firm Finance (ERP): Pendapatan & Penagihan
   WIP → Billing → Pengakuan Pendapatan (PSAK 72) · e-Faktur output ·
   Nota Kredit · Dunning / penagihan piutang.
   ============================================================ */
const { useState: useStateRV } = React;

function FirmRevenue() {
  const { fmt } = AMS;
  const { engagements, clients } = useFirm();
  const invoices = AMS.INVOICES;
  const [tab, setTab] = useStateRV('recognition');
  const [sel, setSel] = useStateRV(null);
  const REF = new Date('2026-03-09');

  /* PSAK 72 — over-time recognition by stage of completion */
  const sched = engagements.map(e => {
    const c = clients.find(x => x.id === e.clientId);
    const contract = c ? c.fee : e.materiality * 0.4;
    const pct = e.progress / 100;
    const recognized = Math.round(contract * pct);
    const billed = invoices.filter(i => i.eng === e.id && i.status !== 'Draft').reduce((s, i) => s + i.amount, 0);
    const asset = Math.max(0, recognized - billed);   // contract asset (unbilled)
    const liab = Math.max(0, billed - recognized);    // contract liability (deferred)
    const method = e.type && e.type.includes('Audit') ? 'Over-time (input)' : 'Point-in-time';
    return { id: e.id, clientId: e.clientId, client: c ? c.name : '—', contract, pct, recognized, billed, asset, liab, method, partner: (e.partner || '').split(',')[0], hrs: e.actualHrs, budgetHrs: e.budgetHrs };
  });
  const totContract = sched.reduce((s, r) => s + r.contract, 0);
  const totRecognized = sched.reduce((s, r) => s + r.recognized, 0);
  const totBilled = sched.reduce((s, r) => s + r.billed, 0);
  const totAsset = sched.reduce((s, r) => s + r.asset, 0);
  const totLiab = sched.reduce((s, r) => s + r.liab, 0);
  const backlog = totContract - totRecognized;

  /* Dunning — overdue / due invoices */
  const dun = invoices.filter(i => i.status !== 'Paid' && i.status !== 'Draft').map(i => {
    const daysOver = Math.round((REF - new Date(i.due)) / 864e5);
    const outstanding = i.amount - i.paid;
    const level = daysOver > 30 ? 3 : daysOver > 15 ? 2 : daysOver > 0 ? 1 : 0;
    return { ...i, daysOver, outstanding, level };
  }).filter(i => i.outstanding > 0).sort((a, b) => b.daysOver - a.daysOver);
  const overdueTotal = dun.filter(d => d.level > 0).reduce((s, d) => s + d.outstanding, 0);

  const CN = AMS.CREDIT_NOTES;
  const DUN_LEVEL = { 0: { k: 'gray', l: 'Belum jatuh tempo' }, 1: { k: 'blue', l: 'Pengingat 1' }, 2: { k: 'amber', l: 'Pengingat 2' }, 3: { k: 'red', l: 'Eskalasi' } };

  const tabs = [
    { id: 'recognition', label: 'Pengakuan Pendapatan (PSAK 72)' },
    { id: 'rollfwd', label: 'Aset & Liabilitas Kontrak' },
    { id: 'dunning', label: 'Dunning / Penagihan', count: dun.filter(d => d.level > 0).length },
    { id: 'credit', label: 'Nota Kredit', count: CN.length },
  ];

  const selRow = sel ? sched.find(r => r.id === sel) : null;

  return (
    <>
      <SubBar moduleId="revenue" right={<div className="row gap8 ac"><span className="chip tiny"><I.link2 size={11} /> e-Faktur DJP</span><Btn sm variant="primary"><I.receipt size={14} /> Terbitkan Faktur dari WIP</Btn></div>} />
      <div className="view-scroll"><div className="view-pad">
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={'Rp ' + fmt(totRecognized / 1e9, 1) + ' M'} label="Pendapatan Diakui (PSAK 72)" accent="var(--green)" /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={'Rp ' + fmt(backlog / 1e9, 1) + ' M'} label="Backlog (belum diakui)" accent="var(--blue)" /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={'Rp ' + fmt(totAsset / 1e6, 0) + ' jt'} label="Aset Kontrak (belum ditagih)" accent="var(--blue)" /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={'Rp ' + fmt(totLiab / 1e6, 0) + ' jt'} label="Pendapatan Diterima Dimuka" accent="var(--amber)" /></div></Panel>
        </div>

        <Panel noBody>
          <div className="panel-h" style={{ padding: 0, background: 'var(--surface-2)' }}><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>

          {tab === 'recognition' && (
            <div className="grid" style={{ gridTemplateColumns: selRow ? '1fr 340px' : '1fr', gap: 0, alignItems: 'stretch' }}>
              <div style={{ minWidth: 0, borderRight: selRow ? '1px solid var(--line)' : 'none' }}>
                <table className="dtbl">
                  <thead><tr><th>Engagement</th><th>Klien</th><th>Metode</th><th className="num">Nilai Kontrak</th><th className="num">% Selesai</th><th className="num">Diakui</th><th className="num">Ditagih</th><th className="num">Aset/(Liab) Kontrak</th></tr></thead>
                  <tbody>
                    {sched.map(r => {
                      const net = r.asset - r.liab;
                      return (
                        <tr key={r.id} className={r.id === sel ? 'sel' : ''} onClick={() => setSel(r.id === sel ? null : r.id)} style={{ cursor: 'pointer' }}>
                          <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{r.id}</td>
                          <td className="truncate" style={{ maxWidth: 140, fontWeight: 600 }}>{r.client.replace('PT ', '')}</td>
                          <td className="tiny muted">{r.method}</td>
                          <td className="num">{fmt(r.contract / 1e6, 0)}</td>
                          <td className="num"><div className="row ac gap6" style={{ justifyContent: 'flex-end' }}><div style={{ width: 38, height: 6, borderRadius: 3, background: 'var(--surface-3)' }}><div style={{ width: (r.pct * 100) + '%', height: '100%', borderRadius: 3, background: 'var(--green)' }} /></div><span className="tiny mono" style={{ width: 28 }}>{(r.pct * 100).toFixed(0)}%</span></div></td>
                          <td className="num" style={{ fontWeight: 600 }}>{fmt(r.recognized / 1e6, 0)}</td>
                          <td className="num muted">{fmt(r.billed / 1e6, 0)}</td>
                          <td className="num" style={{ fontWeight: 600, color: net > 0 ? 'var(--blue)' : net < 0 ? 'var(--amber)' : 'var(--ink-3)' }}>{net === 0 ? '—' : net > 0 ? fmt(net / 1e6, 0) : '(' + fmt(-net / 1e6, 0) + ')'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot><tr><td colSpan={5}>TOTAL (Rp jt)</td><td className="num">{fmt(totRecognized / 1e6, 0)}</td><td className="num">{fmt(totBilled / 1e6, 0)}</td><td className="num">{fmt((totAsset - totLiab) / 1e6, 0)}</td></tr></tfoot>
                </table>
                <div className="tiny muted" style={{ padding: '8px 12px' }}>Audit diakui <b>over-time</b> (PSAK 72) berdasar input (jam terhadap anggaran). Klik baris untuk skedul pengakuan rinci.</div>
              </div>
              {selRow && <RecognitionDrill r={selRow} onClose={() => setSel(null)} />}
            </div>
          )}

          {tab === 'rollfwd' && (
            <div style={{ padding: 14 }}>
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <Panel title="Aset Kontrak — Roll-Forward" sub="unbilled receivable · PSAK 72">
                  <div style={{ display: 'grid', gap: 7 }}>
                    <RowKv label="Saldo awal (1 Jan)" v={'Rp ' + fmt(totAsset * 0.74 / 1e6, 0) + ' jt'} />
                    <RowKv label="+ Pendapatan diakui" v={'Rp ' + fmt(totRecognized * 0.32 / 1e6, 0) + ' jt'} />
                    <RowKv label="− Direklas ke piutang (ditagih)" v={'(Rp ' + fmt(totBilled * 0.28 / 1e6, 0) + ' jt)'} />
                    <div className="divider" />
                    <RowKv label="Saldo akhir aset kontrak" v={'Rp ' + fmt(totAsset / 1e6, 0) + ' jt'} strong />
                  </div>
                </Panel>
                <Panel title="Liabilitas Kontrak — Roll-Forward" sub="deferred revenue · PSAK 72">
                  <div style={{ display: 'grid', gap: 7 }}>
                    <RowKv label="Saldo awal (1 Jan)" v={'Rp ' + fmt(totLiab * 1.4 / 1e6, 0) + ' jt'} />
                    <RowKv label="+ Tagihan dimuka diterima" v={'Rp ' + fmt(totLiab * 0.9 / 1e6, 0) + ' jt'} />
                    <RowKv label="− Diakui sebagai pendapatan" v={'(Rp ' + fmt(totLiab * 1.3 / 1e6, 0) + ' jt)'} />
                    <div className="divider" />
                    <RowKv label="Saldo akhir liabilitas kontrak" v={'Rp ' + fmt(totLiab / 1e6, 0) + ' jt'} strong />
                  </div>
                </Panel>
              </div>
              <Panel noBody>
                <div className="panel-h"><h3>Posisi Kontrak per Engagement</h3><div style={{ flex: 1 }} /><span className="tiny muted">aset kontrak = diakui &gt; ditagih · liabilitas = ditagih &gt; diakui · Rp jt</span></div>
                <table className="dtbl">
                  <thead><tr><th>Engagement</th><th>Klien</th><th className="num">Diakui</th><th className="num">Ditagih</th><th className="num">Aset Kontrak</th><th className="num">Liab. Kontrak</th><th style={{ width: 150 }}>Diakui vs Ditagih</th></tr></thead>
                  <tbody>
                    {sched.filter(r => r.asset > 0 || r.liab > 0).map(r => {
                      const mx = Math.max(r.recognized, r.billed) || 1;
                      return (
                        <tr key={r.id}>
                          <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{r.id}</td>
                          <td className="truncate" style={{ maxWidth: 130, fontWeight: 600 }}>{r.client.replace('PT ', '')}</td>
                          <td className="num">{fmt(r.recognized / 1e6, 0)}</td>
                          <td className="num muted">{fmt(r.billed / 1e6, 0)}</td>
                          <td className="num" style={{ fontWeight: 600, color: r.asset ? 'var(--blue)' : 'var(--ink-4)' }}>{r.asset ? fmt(r.asset / 1e6, 0) : '—'}</td>
                          <td className="num" style={{ fontWeight: 600, color: r.liab ? 'var(--amber)' : 'var(--ink-4)' }}>{r.liab ? fmt(r.liab / 1e6, 0) : '—'}</td>
                          <td>
                            <div style={{ position: 'relative', height: 16 }}>
                              <div style={{ position: 'absolute', top: 2, left: 0, width: '100%', height: 5, borderRadius: 3, background: 'var(--surface-3)' }}><div style={{ width: (r.recognized / mx * 100) + '%', height: '100%', borderRadius: 3, background: 'var(--green)' }} /></div>
                              <div style={{ position: 'absolute', top: 9, left: 0, width: '100%', height: 5, borderRadius: 3, background: 'var(--surface-3)' }}><div style={{ width: (r.billed / mx * 100) + '%', height: '100%', borderRadius: 3, background: 'var(--blue)' }} /></div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot><tr><td colSpan={2}>TOTAL</td><td className="num">{fmt(totRecognized / 1e6, 0)}</td><td className="num">{fmt(totBilled / 1e6, 0)}</td><td className="num">{fmt(totAsset / 1e6, 0)}</td><td className="num">{fmt(totLiab / 1e6, 0)}</td><td></td></tr></tfoot>
                </table>
                <div className="row gap14 tiny muted" style={{ padding: '8px 12px' }}><span className="row ac gap6"><span style={{ width: 18, height: 5, borderRadius: 3, background: 'var(--green)', display: 'inline-block' }} /> Pendapatan diakui</span><span className="row ac gap6"><span style={{ width: 18, height: 5, borderRadius: 3, background: 'var(--blue)', display: 'inline-block' }} /> Telah ditagih</span></div>
              </Panel>
            </div>
          )}

          {tab === 'dunning' && (
            <table className="dtbl">
              <thead><tr><th>No. Faktur</th><th>Klien</th><th className="num">Outstanding</th><th>Jatuh Tempo</th><th className="num">Umur</th><th>Tingkat Pengingat</th><th></th></tr></thead>
              <tbody>
                {dun.map(d => (
                  <tr key={d.id}>
                    <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{d.id}</td>
                    <td className="truncate" style={{ maxWidth: 170, fontWeight: 600 }}>{d.client.replace('PT ', '')}</td>
                    <td className="num" style={{ fontWeight: 600 }}>{fmt(d.outstanding / 1e6, 0)} jt</td>
                    <td className="mono tiny" style={{ color: d.daysOver > 0 ? 'var(--red)' : 'var(--ink-3)' }}>{new Date(d.due).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</td>
                    <td className="num tiny" style={{ color: d.daysOver > 30 ? 'var(--red)' : d.daysOver > 0 ? 'var(--amber)' : 'var(--ink-3)' }}>{d.daysOver > 0 ? d.daysOver + ' hr' : '—'}</td>
                    <td><Badge kind={DUN_LEVEL[d.level].k}>{DUN_LEVEL[d.level].l}</Badge></td>
                    <td>{d.level > 0 && <button className="btn sm" style={{ height: 22 }}><I.mail size={11} /> Kirim Pengingat</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === 'credit' && (
            <table className="dtbl">
              <thead><tr><th>No. Nota Kredit</th><th>Faktur Terkait</th><th>Klien</th><th>Alasan</th><th>Tanggal</th><th className="num">Nilai</th><th>Status</th></tr></thead>
              <tbody>
                {CN.map(c => (
                  <tr key={c.id}>
                    <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{c.id}</td>
                    <td className="mono tiny muted">{c.inv}</td>
                    <td className="truncate" style={{ maxWidth: 160, fontWeight: 600 }}>{c.client.replace('PT ', '')}</td>
                    <td className="tiny muted">{c.reason}</td>
                    <td className="mono tiny muted">{new Date(c.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</td>
                    <td className="num" style={{ fontWeight: 600, color: 'var(--red)' }}>({fmt(c.amount / 1e6, 0)} jt)</td>
                    <td><Badge kind={c.status === 'Applied' ? 'green' : 'blue'}>{c.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      </div></div>
    </>
  );
}

/* Drill panel: single-engagement recognition schedule */
function RecognitionDrill({ r, onClose }) {
  const { fmt } = AMS;
  const net = r.asset - r.liab;
  // synthesize a cumulative recognition S-curve scaled to current %
  const months = ['Okt', 'Nov', 'Des', 'Jan', 'Feb', 'Mar'];
  const curve = months.map((m, i) => Math.min(1, (i + 1) / months.length / Math.max(0.01, r.pct) * r.pct));
  const cum = months.map((m, i) => {
    const frac = Math.min(r.pct, r.pct * (i + 1) / months.length);
    return { m, recog: Math.round(r.contract * frac), planned: Math.round(r.contract * (i + 1) / months.length) };
  });
  const waterfall = [
    ['Nilai kontrak', r.contract, 'var(--ink-3)'],
    ['Diakui s.d. kini', r.recognized, 'var(--green)'],
    ['Telah ditagih', r.billed, 'var(--blue)'],
  ];
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ background: 'var(--surface-2)', padding: '11px 14px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 13 }}>{r.client.replace('PT ', '')}</div><div className="tiny muted mono">{r.id} · {r.partner} · {r.method}</div></div>
        <button className="top-btn" onClick={onClose}><I.x size={16} /></button>
      </div>
      <div style={{ padding: 14 }}>
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          <KvBox label="% Penyelesaian" v={(r.pct * 100).toFixed(0) + '%'} accent="var(--green)" />
          <KvBox label="Jam aktual / anggaran" v={fmt(r.hrs) + ' / ' + fmt(r.budgetHrs)} />
          <KvBox label="Aset Kontrak" v={r.asset ? 'Rp ' + fmt(r.asset / 1e6, 0) + ' jt' : '—'} accent="var(--blue)" />
          <KvBox label="Liab. Kontrak" v={r.liab ? 'Rp ' + fmt(r.liab / 1e6, 0) + ' jt' : '—'} accent="var(--amber)" />
        </div>
        <div className="tiny muted upper" style={{ marginBottom: 8 }}>Posisi Pengakuan</div>
        <div style={{ display: 'grid', gap: 7, marginBottom: 14 }}>
          {waterfall.map(([l, v, c]) => (
            <div key={l}>
              <div className="row jb tiny" style={{ marginBottom: 2 }}><span>{l}</span><span className="mono" style={{ fontWeight: 700 }}>{fmt(v / 1e6, 0)} jt</span></div>
              <div style={{ height: 7, borderRadius: 4, background: 'var(--surface-3)' }}><div style={{ width: Math.min(100, v / r.contract * 100) + '%', height: '100%', borderRadius: 4, background: c }} /></div>
            </div>
          ))}
        </div>
        <div className="tiny muted upper" style={{ marginBottom: 8 }}>Kurva Pengakuan (kumulatif)</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 80, padding: '0 2px 6px', borderBottom: '1px solid var(--line)', marginBottom: 6 }}>
          {cum.map(c => {
            const mx = r.contract || 1;
            return (
              <div key={c.m} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: 3, height: '100%' }}>
                <div style={{ width: '70%', maxWidth: 22, height: (c.recog / mx * 64) + 'px', background: 'linear-gradient(180deg,#1f9d63,#1f7a4d)', borderRadius: '3px 3px 0 0' }} />
                <span className="tiny muted">{c.m}</span>
              </div>
            );
          })}
        </div>
        <div className="panel" style={{ marginTop: 10, padding: '9px 11px', background: net > 0 ? 'var(--blue-050)' : net < 0 ? 'var(--amber-bg)' : 'var(--surface-2)', borderColor: 'transparent' }}>
          <div className="tiny" style={{ lineHeight: 1.5 }}>{net > 0
            ? <>Pendapatan diakui <b>melebihi</b> tagihan sebesar Rp {fmt(net / 1e6, 0)} jt — diakui sebagai <b>aset kontrak</b>. Terbitkan faktur termin untuk menagih.</>
            : net < 0
              ? <>Tagihan <b>mendahului</b> penyelesaian sebesar Rp {fmt(-net / 1e6, 0)} jt — dicatat sebagai <b>liabilitas kontrak</b> (pendapatan diterima dimuka).</>
              : <>Tagihan selaras dengan pengakuan pendapatan.</>}</div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { FirmRevenue });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { FirmRevenue };
