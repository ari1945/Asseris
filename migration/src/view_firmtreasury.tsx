/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { useAmsPersist } from './contexts';
import { I } from './icons';
import { SubBar } from './shell';
import { Badge, Btn, Panel, Seg, Stat, Tabs } from './ui';
import { KvBox } from './view_analytical';
import { RowKv } from './view_calc';

/* ============================================================
   Asseris — Firm Finance (ERP): Treasury, Cash & Bank, Assets
   Anggaran & Forecast · Arus Kas · Rekonsiliasi Bank (multi-ccy) ·
   Register Aset Tetap kantor.
   ============================================================ */
const { useState: useStateTR } = React;

const CCY_SYMBOL = { IDR: 'Rp', USD: 'US$', SGD: 'S$', EUR: '€' };

/* ============================================================
   Anggaran, Forecast & Arus Kas
   ============================================================ */
const CASH_SCENARIOS = {
  base: { label: 'Basis', inF: 1.0, outF: 1.0 },
  opt: { label: 'Optimis', inF: 1.12, outF: 0.97 },
  cons: { label: 'Konservatif', inF: 0.85, outF: 1.06 },
};

function FirmTreasury() {
  const { fmt } = AMS;
  const B: any = AMS.FIRM_BUDGET;
  const F: any = AMS.CASH_FORECAST;
  const [tab, setTab] = useStateTR('budget');
  const [scenario, setScenario] = useStateTR('base');
  const [selLine, setSelLine] = useStateTR(null);

  const rev = B.filter((b: any) => b.type === 'rev');
  const cost = B.filter((b: any) => b.type === 'cost');
  const sum = (arr, k) => arr.reduce((s, x) => s + x[k], 0);
  const budRev = sum(rev, 'budget'), actRev = sum(rev, 'actual');
  const budCost = sum(cost, 'budget'), actCost = sum(cost, 'actual');
  const budProfit = budRev - budCost, actProfit = actRev - actCost;

  const sc = CASH_SCENARIOS[scenario];
  const fc = F.map((r: any) => {
    const inflow = Math.round(r.inflow * sc.inF), outflow = Math.round(r.outflow * sc.outF);
    return { ...r, inflow, outflow, net: inflow - outflow };
  });
  // rebuild running closing under scenario
  let prev = null;
  fc.forEach((r, i) => { r.open = i === 0 ? F[0].open : prev; r.close = r.open + r.net; prev = r.close; });
  const minClose = Math.min(...fc.map((r: any) => r.close));
  const avgOut = fc.reduce((s, r) => s + r.outflow, 0) / fc.length;
  const runway = (fc[0].open / avgOut); // months of cover at current cash vs avg burn
  const netGen = fc.reduce((s, r) => s + r.net, 0);

  const tabs = [{ id: 'budget', label: 'Anggaran vs Aktual' }, { id: 'cash', label: 'Forecast Arus Kas' }];
  const VarCell = ({ b, a, cost }: any) => {
    const v = a - b; const adverse = cost ? v > 0 : v < 0;
    return <span className="mono" style={{ color: Math.abs(v) < 1e6 ? 'var(--ink-3)' : adverse ? 'var(--red)' : 'var(--green)', fontWeight: 600 }}>{v >= 0 ? '+' : '−'}{fmt(Math.abs(v) / 1e6, 0)}</span>;
  };

  return (
    <>
      <SubBar moduleId="treasury" right={<div className="row gap8 ac"><Seg options={['FY2025', 'FY2026 (RKA)']} value="FY2025" onChange={() => {}} /><Btn sm><I.download size={13} /> Export</Btn></div>} />
      <div className="view-scroll"><div className="view-pad">
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={'Rp ' + fmt(actRev / 1e9, 1) + ' M'} label="Pendapatan Aktual" delta={((actRev / budRev - 1) * 100).toFixed(1) + '% vs anggaran'} deltaDir={actRev >= budRev ? 'up' : 'down'} /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={'Rp ' + fmt(actProfit / 1e9, 1) + ' M'} label="Laba Operasi Aktual" accent="var(--green)" /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={'Rp ' + fmt(minClose / 1e3, 1) + ' M'} label="Proyeksi Kas Terendah (6 bln)" accent={minClose < 7000 ? 'var(--amber)' : 'var(--blue)'} /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={runway.toFixed(1) + ' bln'} label="Cash Runway (kas ÷ beban bln)" accent="var(--green)" /></div></Panel>
        </div>

        <Panel noBody>
          <div className="panel-h" style={{ padding: 0, background: 'var(--surface-2)' }}><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>

          {tab === 'budget' && (
            <div className="grid" style={{ gridTemplateColumns: selLine ? '1fr 320px' : '1fr', gap: 0, alignItems: 'stretch' }}>
              <div style={{ minWidth: 0, borderRight: selLine ? '1px solid var(--line)' : 'none' }}>
                <table className="dtbl">
                  <thead><tr><th>Pos Anggaran (P&L)</th><th className="num">Anggaran</th><th className="num">Aktual</th><th className="num">Varians</th><th style={{ width: 160 }}>Realisasi</th></tr></thead>
                  <tbody>
                    <tr className="group-row"><td colSpan={5}>Pendapatan</td></tr>
                    {rev.map((b: any) => (
                      <tr key={b.line} className={selLine === b.line ? 'sel' : ''} onClick={() => setSelLine(selLine === b.line ? null : b.line)} style={{ cursor: 'pointer' }}><td style={{ fontWeight: 600 }}>{b.line}</td><td className="num">{fmt(b.budget / 1e6, 0)}</td><td className="num">{fmt(b.actual / 1e6, 0)}</td><td className="num"><VarCell b={b.budget} a={b.actual} /></td>
                        <td><div className="row ac gap6"><div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--surface-3)' }}><div style={{ width: Math.min(100, b.actual / b.budget * 100) + '%', height: '100%', borderRadius: 3, background: 'var(--green)' }} /></div><span className="tiny mono" style={{ width: 32 }}>{(b.actual / b.budget * 100).toFixed(0)}%</span></div></td></tr>
                    ))}
                    <tr className="group-row"><td colSpan={5}>Beban</td></tr>
                    {cost.map((b: any) => (
                      <tr key={b.line} className={selLine === b.line ? 'sel' : ''} onClick={() => setSelLine(selLine === b.line ? null : b.line)} style={{ cursor: 'pointer' }}><td style={{ fontWeight: 600 }}>{b.line}</td><td className="num">{fmt(b.budget / 1e6, 0)}</td><td className="num">{fmt(b.actual / 1e6, 0)}</td><td className="num"><VarCell b={b.budget} a={b.actual} cost /></td>
                        <td><div className="row ac gap6"><div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--surface-3)' }}><div style={{ width: Math.min(100, b.actual / b.budget * 100) + '%', height: '100%', borderRadius: 3, background: b.actual > b.budget ? 'var(--red)' : 'var(--amber)' }} /></div><span className="tiny mono" style={{ width: 32 }}>{(b.actual / b.budget * 100).toFixed(0)}%</span></div></td></tr>
                    ))}
                  </tbody>
                  <tfoot><tr><td>LABA OPERASI</td><td className="num">{fmt(budProfit / 1e6, 0)}</td><td className="num">{fmt(actProfit / 1e6, 0)}</td><td className="num"><VarCell b={budProfit} a={actProfit} /></td><td></td></tr></tfoot>
                </table>
                <div className="tiny muted" style={{ padding: '8px 12px' }}>Klik pos anggaran untuk melihat fasing triwulanan & pendorong varians · Rp jt</div>
              </div>
              {selLine && <BudgetLineDrill b={B.find((x: any) => x.line === selLine)} onClose={() => setSelLine(null)} />}
            </div>
          )}

          {tab === 'cash' && (
            <div style={{ padding: 14 }}>
              <div className="row jb ac" style={{ marginBottom: 12 }}>
                <div className="row gap8 ac"><span className="tiny muted upper">Skenario</span><Seg options={Object.entries(CASH_SCENARIOS).map(([k, v]) => ({ value: k, label: v.label }))} value={scenario} onChange={setScenario} /></div>
                <span className="tiny" style={{ color: netGen >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>Arus kas bersih 6 bln: {netGen >= 0 ? '+' : '−'}Rp {fmt(Math.abs(netGen) / 1e3, 1)} M</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, height: 160, padding: '0 8px 8px', borderBottom: '1px solid var(--line)', marginBottom: 12 }}>
                {fc.map((r: any) => {
                  const max = Math.max(...fc.map((x: any) => x.close)) * 1.1;
                  return (
                    <div key={r.m} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                      <span className="mono tiny" style={{ fontWeight: 700, color: r.close < 7000 ? 'var(--amber)' : 'var(--navy)' }}>{fmt(r.close / 1e3, 1)}M</span>
                      <div style={{ width: '100%', maxWidth: 46, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: 100 }}>
                        <div style={{ height: (r.close / max * 100) + '%', background: r.close < 7000 ? 'linear-gradient(180deg,#d99000,#9a6a00)' : 'linear-gradient(180deg,#0a6b8a,#005085)', borderRadius: '4px 4px 0 0' }} />
                      </div>
                      <span className="tiny muted">{r.m}</span>
                    </div>
                  );
                })}
              </div>
              <table className="dtbl">
                <thead><tr><th>Bulan</th><th className="num">Saldo Awal</th><th className="num">Arus Masuk</th><th className="num">Arus Keluar</th><th className="num">Arus Bersih</th><th className="num">Saldo Akhir</th></tr></thead>
                <tbody>
                  {fc.map((r: any) => (
                    <tr key={r.m}><td style={{ fontWeight: 600 }}>{r.m} 2026</td><td className="num muted">{fmt(r.open, 0)}</td><td className="num" style={{ color: 'var(--green)' }}>+{fmt(r.inflow, 0)}</td><td className="num" style={{ color: 'var(--red)' }}>({fmt(r.outflow, 0)})</td><td className="num" style={{ fontWeight: 600, color: r.net >= 0 ? 'var(--green)' : 'var(--red)' }}>{r.net >= 0 ? '+' : '−'}{fmt(Math.abs(r.net), 0)}</td><td className="num" style={{ fontWeight: 700, color: r.close < 7000 ? 'var(--amber)' : 'inherit' }}>{fmt(r.close, 0)}</td></tr>
                  ))}
                </tbody>
              </table>
              <div className="tiny muted" style={{ marginTop: 8 }}>Nilai dalam jutaan Rupiah · forecast bergulir 6 bulan · skenario <b>{sc.label}</b> menyesuaikan arus masuk ×{sc.inF} & arus keluar ×{sc.outF}. Saldo &lt; Rp 7 M ditandai sebagai zona perhatian.</div>
            </div>
          )}
        </Panel>
      </div></div>
    </>
  );
}

function BudgetLineDrill({ b, onClose }: any) {
  const { fmt } = AMS;
  const isCost = b.type === 'cost';
  // synthesize quarterly phasing
  const wq = [0.22, 0.26, 0.25, 0.27];
  const aShift = b.actual / b.budget;
  const quarters = ['Q1', 'Q2', 'Q3', 'Q4'].map((q, i) => ({ q, bud: Math.round(b.budget * wq[i]), act: Math.round(b.actual * wq[i] * (1 + (i - 1.5) * 0.02)) }));
  const variance = b.actual - b.budget;
  const adverse = isCost ? variance > 0 : variance < 0;
  const drivers = isCost
    ? [['Kenaikan harga / inflasi', 0.45], ['Volume aktivitas', 0.35], ['Timing pengeluaran', 0.20]]
    : [['Volume perikatan', 0.55], ['Tarif & realisasi', 0.30], ['Bauran jasa', 0.15]];
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ background: 'var(--surface-2)', padding: '11px 14px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 13 }}>{b.line}</div><div className="tiny muted">{isCost ? 'Beban' : 'Pendapatan'} · fasing triwulanan</div></div>
        <button className="top-btn" onClick={onClose}><I.x size={16} /></button>
      </div>
      <div style={{ padding: 14 }}>
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          <KvBox label="Anggaran" v={'Rp ' + fmt(b.budget / 1e6, 0) + ' jt'} />
          <KvBox label="Aktual" v={'Rp ' + fmt(b.actual / 1e6, 0) + ' jt'} />
          <KvBox label="Varians" v={(variance >= 0 ? '+' : '−') + fmt(Math.abs(variance) / 1e6, 0) + ' jt'} accent={adverse ? 'var(--red)' : 'var(--green)'} />
          <KvBox label="Realisasi" v={(b.actual / b.budget * 100).toFixed(0) + '%'} />
        </div>
        <div className="tiny muted upper" style={{ marginBottom: 8 }}>Fasing Triwulanan</div>
        <table className="dtbl" style={{ marginBottom: 14 }}>
          <thead><tr><th>Kuartal</th><th className="num">Anggaran</th><th className="num">Aktual</th><th className="num">Var</th></tr></thead>
          <tbody>
            {quarters.map((q: any) => {
              const v = q.act - q.bud; const adv = isCost ? v > 0 : v < 0;
              return <tr key={q.q}><td style={{ fontWeight: 600 }}>{q.q} 2025</td><td className="num">{fmt(q.bud / 1e6, 0)}</td><td className="num">{fmt(q.act / 1e6, 0)}</td><td className="num mono" style={{ color: adv ? 'var(--red)' : 'var(--green)', fontWeight: 600 }}>{v >= 0 ? '+' : '−'}{fmt(Math.abs(v) / 1e6, 0)}</td></tr>;
            })}
          </tbody>
        </table>
        <div className="tiny muted upper" style={{ marginBottom: 8 }}>Pendorong Varians</div>
        {drivers.map(([d, w]: [string, any]) => (
          <div key={d} style={{ marginBottom: 8 }}>
            <div className="row jb tiny" style={{ marginBottom: 3 }}><span>{d}</span><span className="mono" style={{ fontWeight: 700 }}>{(w * 100).toFixed(0)}%</span></div>
            <div style={{ height: 6, borderRadius: 3, background: 'var(--surface-3)' }}><div style={{ width: (w * 100) + '%', height: '100%', borderRadius: 3, background: adverse ? 'var(--red)' : 'var(--green)' }} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   Kas, Bank & Rekonsiliasi (multi-currency)
   ============================================================ */
/* Historical booking rate for valas (avg cost) — for unrealized FX reval */
const FX_BOOK = { IDR: 1, USD: 15_780, SGD: 11_640, EUR: 17_120 };

function CashBank() {
  const { fmt } = AMS;
  const FX: any = AMS.FX_RATES;
  const accts: any = AMS.BANK_ACCOUNTS;
  const [tab, setTab] = useStateTR('positions');
  const R: any = AMS.BANK_RECON;
  const [lines, setLines] = useAmsPersist('bankrecon', () => R.lines);

  const idrOf = (a) => a.balance * FX[a.ccy];
  const totalIDR = accts.reduce((s, a) => s + idrOf(a), 0);

  const toggleMatch = (id) => setLines(list => list.map((l: any) => l.id === id ? { ...l, matched: !l.matched } : l));
  const unrec = lines.filter((l: any) => !l.matched);
  const adjustedBook = R.bookBalance + lines.filter((l: any) => !l.matched && l.ref !== 'outstanding' && l.ref !== 'transit').reduce((s, l) => s + l.amount, 0);
  const adjustedBank = R.bankBalance + lines.filter((l: any) => !l.matched && (l.ref === 'outstanding' || l.ref === 'transit')).reduce((s, l) => s + l.amount, 0);
  const reconciled = Math.abs(adjustedBank - adjustedBook) < 1e6;

  // FX revaluation
  const valas = accts.filter((a: any) => a.ccy !== 'IDR');
  const reval = valas.map((a: any) => {
    const bookIDR = a.balance * FX_BOOK[a.ccy];
    const mktIDR = a.balance * FX[a.ccy];
    return { ...a, bookIDR, mktIDR, gain: mktIDR - bookIDR, bookRate: FX_BOOK[a.ccy] };
  });
  const totReval = reval.reduce((s, r) => s + r.gain, 0);

  const tabs = [{ id: 'positions', label: 'Posisi Kas & Bank' }, { id: 'recon', label: 'Rekonsiliasi Bank', count: unrec.length }, { id: 'fx', label: 'Revaluasi Valas', count: valas.length }];

  return (
    <>
      <SubBar moduleId="cashbank" right={<div className="row gap8 ac"><span className="chip tiny"><I.sync size={11} /> Bank feed: 15 mnt lalu</span><Btn sm variant="primary"><I.plus size={14} /> Transaksi</Btn></div>} />
      <div className="view-scroll"><div className="view-pad">
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={'Rp ' + fmt(totalIDR / 1e9, 2) + ' M'} label="Total Kas (ekuivalen IDR)" /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={accts.length} label="Rekening Aktif" /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={(totReval >= 0 ? '+' : '−') + 'Rp ' + fmt(Math.abs(totReval) / 1e6, 0) + ' jt'} label="Selisih Kurs Belum Terealisasi" accent={totReval >= 0 ? 'var(--green)' : 'var(--red)'} /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={unrec.length} label="Item Belum Direkonsiliasi" accent={unrec.length ? 'var(--amber)' : 'var(--green)'} /></div></Panel>
        </div>

        <Panel noBody>
          <div className="panel-h" style={{ padding: 0, background: 'var(--surface-2)' }}><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>

          {tab === 'positions' && (
            <table className="dtbl">
              <thead><tr><th>Rekening</th><th>No.</th><th>Mata Uang</th><th className="num">Saldo</th><th className="num">Kurs</th><th className="num">Ekuivalen IDR</th><th style={{ width: 90 }}>Porsi</th></tr></thead>
              <tbody>
                {accts.map((a: any) => (
                  <tr key={a.id}>
                    <td><div className="row ac gap8"><span style={{ width: 26, height: 26, borderRadius: 6, background: 'var(--navy)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 9.5, fontWeight: 700 }}>{a.bank.slice(0, 3).toUpperCase()}</span><div><div style={{ fontWeight: 600, fontSize: 12.5 }}>{a.name}</div><div className="tiny muted">{a.bank}</div></div></div></td>
                    <td className="mono tiny muted">{a.no}</td>
                    <td><span className="chip tiny">{a.ccy}</span></td>
                    <td className="num" style={{ fontWeight: 600 }}>{CCY_SYMBOL[a.ccy]} {fmt(a.balance, 0)}</td>
                    <td className="num tiny muted">{a.ccy === 'IDR' ? '—' : fmt(FX[a.ccy], 0)}</td>
                    <td className="num">{fmt(idrOf(a) / 1e6, 0)} jt</td>
                    <td><div style={{ height: 6, borderRadius: 3, background: 'var(--surface-3)' }}><div style={{ width: (idrOf(a) / totalIDR * 100) + '%', height: '100%', borderRadius: 3, background: 'var(--blue)' }} /></div></td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr><td colSpan={5}>TOTAL EKUIVALEN IDR</td><td className="num">{fmt(totalIDR / 1e6, 0)} jt</td><td></td></tr></tfoot>
            </table>
          )}

          {tab === 'recon' && (
            <div style={{ padding: 14 }}>
              <div className="row jb ac" style={{ marginBottom: 12 }}>
                <div><div style={{ fontWeight: 700, fontSize: 13 }}>Rekonsiliasi — {accts.find((a: any) => a.id === R.account).name} ({R.account})</div><div className="tiny muted">Periode {R.period} · klik baris untuk tandai cocok/belum</div></div>
                <span className={'badge b-' + (reconciled ? 'green' : 'amber')} style={{ padding: '3px 10px' }}>{reconciled ? <><I.check size={12} /> Seimbang</> : 'Selisih Rp ' + fmt(Math.abs(adjustedBank - adjustedBook) / 1e6, 0) + ' jt'}</span>
              </div>
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                <div className="panel" style={{ padding: 12 }}>
                  <div className="tiny muted upper" style={{ marginBottom: 8 }}>Saldo per Bank</div>
                  <RowKv label="Saldo rekening koran" v={'Rp ' + fmt(R.bankBalance / 1e6, 0) + ' jt'} />
                  {lines.filter((l: any) => !l.matched && (l.ref === 'outstanding' || l.ref === 'transit')).map((l: any) => <RowKv key={l.id} label={(l.ref === 'outstanding' ? '− Cek beredar' : '+ Setoran transit')} v={(l.amount < 0 ? '(' : '') + fmt(Math.abs(l.amount) / 1e6, 0) + (l.amount < 0 ? ')' : '') + ' jt'} />)}
                  <div className="divider" />
                  <RowKv label="Saldo bank disesuaikan" v={'Rp ' + fmt(adjustedBank / 1e6, 0) + ' jt'} strong />
                </div>
                <div className="panel" style={{ padding: 12 }}>
                  <div className="tiny muted upper" style={{ marginBottom: 8 }}>Saldo per Buku (GL)</div>
                  <RowKv label="Saldo buku besar" v={'Rp ' + fmt(R.bookBalance / 1e6, 0) + ' jt'} />
                  {lines.filter((l: any) => !l.matched && l.ref !== 'outstanding' && l.ref !== 'transit').map((l: any) => <RowKv key={l.id} label={(l.amount < 0 ? '− ' : '+ ') + l.desc.slice(0, 22)} v={(l.amount < 0 ? '(' : '') + fmt(Math.abs(l.amount) / 1e6, l.amount < 1e7 ? 1 : 0) + (l.amount < 0 ? ')' : '') + ' jt'} />)}
                  <div className="divider" />
                  <RowKv label="Saldo buku disesuaikan" v={'Rp ' + fmt(adjustedBook / 1e6, 0) + ' jt'} strong />
                </div>
              </div>
              <table className="dtbl">
                <thead><tr><th>Tanggal</th><th>Keterangan (rekening koran)</th><th className="num">Jumlah</th><th>Ref. GL</th><th>Status</th></tr></thead>
                <tbody>
                  {lines.map((l: any) => (
                    <tr key={l.id} onClick={() => toggleMatch(l.id)} style={{ cursor: 'pointer' }}>
                      <td className="mono tiny muted">{new Date(l.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</td>
                      <td>{l.desc}</td>
                      <td className="num" style={{ color: l.amount < 0 ? 'var(--red)' : 'var(--green)', fontWeight: 600 }}>{l.amount < 0 ? '(' + fmt(-l.amount / 1e6, l.amount > -1e7 ? 1 : 0) + ')' : fmt(l.amount / 1e6, l.amount < 1e7 ? 1 : 0)}</td>
                      <td className="mono tiny muted">{l.ref === 'outstanding' ? 'Cek beredar' : l.ref === 'transit' ? 'Transit' : l.ref || '—'}</td>
                      <td><Badge kind={l.matched ? 'green' : 'amber'}>{l.matched ? 'Cocok' : 'Belum'}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'fx' && (
            <div style={{ padding: 14 }}>
              <div className="grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 14 }}>
                <div className="panel" style={{ padding: 12 }}><div className="tiny muted upper">Nilai Tercatat (kurs perolehan)</div><div className="mono" style={{ fontSize: 18, fontWeight: 700, color: 'var(--navy)' }}>Rp {fmt(reval.reduce((s, r) => s + r.bookIDR, 0) / 1e6, 0)} jt</div></div>
                <div className="panel" style={{ padding: 12 }}><div className="tiny muted upper">Nilai Pasar (kurs kini)</div><div className="mono" style={{ fontSize: 18, fontWeight: 700, color: 'var(--blue)' }}>Rp {fmt(reval.reduce((s, r) => s + r.mktIDR, 0) / 1e6, 0)} jt</div></div>
                <div className="panel" style={{ padding: 12, background: totReval >= 0 ? 'var(--green-bg)' : 'var(--amber-bg)', borderColor: 'transparent' }}><div className="tiny muted upper">Laba/(Rugi) Selisih Kurs</div><div className="mono" style={{ fontSize: 18, fontWeight: 700, color: totReval >= 0 ? 'var(--green)' : 'var(--red)' }}>{totReval >= 0 ? '+' : '−'}Rp {fmt(Math.abs(totReval) / 1e6, 0)} jt</div><div className="tiny muted">belum terealisasi</div></div>
              </div>
              <table className="dtbl">
                <thead><tr><th>Rekening</th><th>Mata Uang</th><th className="num">Saldo Valas</th><th className="num">Kurs Perolehan</th><th className="num">Kurs Kini</th><th className="num">Nilai Tercatat</th><th className="num">Nilai Pasar</th><th className="num">Selisih Kurs</th></tr></thead>
                <tbody>
                  {reval.map((r: any) => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 600 }}>{r.name} <span className="tiny muted">· {r.bank}</span></td>
                      <td><span className="chip tiny">{r.ccy}</span></td>
                      <td className="num">{CCY_SYMBOL[r.ccy]} {fmt(r.balance, 0)}</td>
                      <td className="num tiny muted">{fmt(r.bookRate, 0)}</td>
                      <td className="num tiny">{fmt(AMS.FX_RATES[r.ccy], 0)}</td>
                      <td className="num muted">{fmt(r.bookIDR / 1e6, 0)} jt</td>
                      <td className="num">{fmt(r.mktIDR / 1e6, 0)} jt</td>
                      <td className="num" style={{ fontWeight: 600, color: r.gain >= 0 ? 'var(--green)' : 'var(--red)' }}>{r.gain >= 0 ? '+' : '−'}{fmt(Math.abs(r.gain) / 1e6, 0)} jt</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr><td colSpan={7}>TOTAL SELISIH KURS BELUM TEREALISASI</td><td className="num" style={{ color: totReval >= 0 ? 'var(--green)' : 'var(--red)' }}>{totReval >= 0 ? '+' : '−'}{fmt(Math.abs(totReval) / 1e6, 0)} jt</td></tr></tfoot>
              </table>
              <div className="panel" style={{ marginTop: 12, padding: '10px 13px', background: 'var(--blue-050)', borderColor: 'var(--blue-100)' }}>
                <div className="tiny" style={{ lineHeight: 1.55 }}>Revaluasi pada tanggal pelaporan (PSAK 10) — selisih kurs belum terealisasi diakui di laba rugi. Jurnal penyesuaian: <b>Db/Kr Kas Valas</b> lawan <b>Laba/Rugi Selisih Kurs</b> sebesar Rp {fmt(Math.abs(totReval) / 1e6, 0)} jt.</div>
              </div>
            </div>
          )}
        </Panel>
      </div></div>
    </>
  );
}

/* ============================================================
   Register Aset Tetap kantor (depreciation)
   ============================================================ */
function FixedAssets() {
  const { fmt } = AMS;
  const REF = new Date('2026-03-01');
  const [sel, setSel] = useStateTR(null);
  const rows = (AMS as any).FIXED_ASSETS.map((a: any) => {
    const start = new Date(a.acq);
    const monthsElapsed = Math.max(0, Math.min(a.life * 12, (REF.getFullYear() - start.getFullYear()) * 12 + (REF.getMonth() - start.getMonth())));
    const monthlyDep = a.cost / (a.life * 12);
    const accDep = Math.round(monthlyDep * monthsElapsed);
    const nbv = a.cost - accDep;
    const pct = monthsElapsed / (a.life * 12);
    return { ...a, accDep, nbv, pct, monthlyDep, annualDep: Math.round(monthlyDep * 12), monthsElapsed, fullyDep: monthsElapsed >= a.life * 12 };
  });
  const totCost = rows.reduce((s, r) => s + r.cost, 0);
  const totAcc = rows.reduce((s, r) => s + r.accDep, 0);
  const totNbv = rows.reduce((s, r) => s + r.nbv, 0);
  const totAnnual = rows.reduce((s, r) => s + (r.fullyDep ? 0 : r.annualDep), 0);

  // category summary
  const cats = Object.values(rows.reduce((m, r) => { (m[r.cat] = m[r.cat] || { cat: r.cat, cost: 0, nbv: 0, n: 0 }); m[r.cat].cost += r.cost; m[r.cat].nbv += r.nbv; m[r.cat].n++; return m; }, {} as any)).sort((a: any, b: any) => b.cost - a.cost);

  const selRow = sel ? rows.find((r: any) => r.id === sel) : null;

  return (
    <>
      <SubBar moduleId="fixedassets" right={<div className="row gap8 ac"><Badge kind="blue">Garis Lurus</Badge><Btn sm><I.download size={13} /> Daftar Aset</Btn><Btn sm variant="primary"><I.plus size={14} /> Aset Baru</Btn></div>} />
      <div className="view-scroll"><div className="view-pad">
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={'Rp ' + fmt(totCost / 1e9, 2) + ' M'} label="Harga Perolehan" /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={'Rp ' + fmt(totAcc / 1e9, 2) + ' M'} label="Akumulasi Penyusutan" accent="var(--amber)" /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={'Rp ' + fmt(totNbv / 1e9, 2) + ' M'} label="Nilai Buku Neto" accent="var(--green)" /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={'Rp ' + fmt(totAnnual / 1e6, 0) + ' jt'} label="Beban Penyusutan / Tahun" /></div></Panel>
        </div>

        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12, alignItems: 'start' }}>
          <Panel title="Roll-Forward Nilai Buku" sub="12 bulan ke 1 Mar 2026 · Rp jt">
            <div style={{ display: 'grid', gap: 7 }}>
              <RowKv label="NBV awal periode" v={'Rp ' + fmt((totNbv + totAnnual) / 1e6, 0) + ' jt'} />
              <RowKv label="+ Penambahan (capex)" v={'Rp 0 jt'} />
              <RowKv label="− Beban penyusutan" v={'(Rp ' + fmt(totAnnual / 1e6, 0) + ' jt)'} />
              <RowKv label="− Pelepasan / write-off" v={'Rp 0 jt'} />
              <div className="divider" />
              <RowKv label="NBV akhir periode" v={'Rp ' + fmt(totNbv / 1e6, 0) + ' jt'} strong />
            </div>
          </Panel>
          <Panel title="Ringkasan per Kategori">
            {cats.map((c: any) => (
              <div key={c.cat} style={{ marginBottom: 10 }}>
                <div className="row jb tiny" style={{ marginBottom: 3 }}><span className="row ac gap6"><span style={{ fontWeight: 600 }}>{c.cat}</span><span className="muted">· {c.n}</span></span><span className="mono" style={{ fontWeight: 700 }}>NBV {fmt(c.nbv / 1e6, 0)} jt</span></div>
                <div style={{ display: 'flex', height: 7, borderRadius: 4, overflow: 'hidden', background: 'var(--surface-3)' }}>
                  <div style={{ width: (c.nbv / c.cost * 100) + '%', background: 'var(--green)' }} title="Nilai buku" />
                  <div style={{ width: ((c.cost - c.nbv) / c.cost * 100) + '%', background: 'var(--amber)' }} title="Telah disusutkan" />
                </div>
              </div>
            ))}
            <div className="row gap14 tiny muted" style={{ marginTop: 4 }}><span className="row ac gap6"><span style={{ width: 14, height: 6, borderRadius: 3, background: 'var(--green)', display: 'inline-block' }} /> Nilai buku</span><span className="row ac gap6"><span style={{ width: 14, height: 6, borderRadius: 3, background: 'var(--amber)', display: 'inline-block' }} /> Disusutkan</span></div>
          </Panel>
        </div>

        <Panel noBody>
          <div className="panel-h"><h3>Register Aset Tetap Kantor</h3><div style={{ flex: 1 }} /><span className="tiny muted">per 1 Mar 2026 · klik baris untuk skedul penyusutan · Rp jt</span></div>
          <div className="grid" style={{ gridTemplateColumns: selRow ? '1fr 330px' : '1fr', gap: 0, alignItems: 'stretch' }}>
            <div style={{ minWidth: 0, borderRight: selRow ? '1px solid var(--line)' : 'none' }}>
              <table className="dtbl">
                <thead><tr><th>Kode</th><th>Aset</th><th>Kategori</th><th>Perolehan</th><th className="num">Perolehan</th><th className="num">Ak. Penyusutan</th><th className="num">Nilai Buku</th><th style={{ width: 120 }}>Umur Terpakai</th></tr></thead>
                <tbody>
                  {rows.map((r: any) => (
                    <tr key={r.id} className={r.id === sel ? 'sel' : ''} onClick={() => setSel(r.id === sel ? null : r.id)} style={{ cursor: 'pointer' }}>
                      <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{r.id}</td>
                      <td style={{ fontWeight: 600 }} className="truncate">{r.name}</td>
                      <td className="tiny muted">{r.cat}</td>
                      <td className="mono tiny muted">{new Date(r.acq).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })} · {r.life}th</td>
                      <td className="num">{fmt(r.cost / 1e6, 0)}</td>
                      <td className="num muted">{fmt(r.accDep / 1e6, 0)}</td>
                      <td className="num" style={{ fontWeight: 600, color: r.fullyDep ? 'var(--ink-4)' : 'inherit' }}>{fmt(r.nbv / 1e6, 0)}</td>
                      <td><div className="row ac gap6"><div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--surface-3)' }}><div style={{ width: (r.pct * 100) + '%', height: '100%', borderRadius: 3, background: r.fullyDep ? 'var(--ink-4)' : 'var(--blue)' }} /></div><span className="tiny mono" style={{ width: 30 }}>{(r.pct * 100).toFixed(0)}%</span></div></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr><td colSpan={4}>TOTAL</td><td className="num">{fmt(totCost / 1e6, 0)}</td><td className="num">{fmt(totAcc / 1e6, 0)}</td><td className="num">{fmt(totNbv / 1e6, 0)}</td><td></td></tr></tfoot>
              </table>
            </div>
            {selRow && <DepreciationSchedule a={selRow} onClose={() => setSel(null)} />}
          </div>
        </Panel>
      </div></div>
    </>
  );
}

function DepreciationSchedule({ a, onClose }: any) {
  const { fmt } = AMS;
  const startYear = new Date(a.acq).getFullYear();
  const annual = a.cost / a.life;
  const curYear = 2026;
  let acc = 0;
  const sched = Array.from({ length: a.life }, (_, i) => {
    const yr = startYear + i;
    acc += annual;
    return { yr, dep: annual, acc, nbv: a.cost - acc, current: yr === curYear };
  });
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ background: 'var(--surface-2)', padding: '11px 14px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 700, fontSize: 13 }} className="truncate">{a.name}</div><div className="tiny muted mono">{a.id} · {a.cat}</div></div>
        <button className="top-btn" onClick={onClose}><I.x size={16} /></button>
      </div>
      <div style={{ padding: 14 }}>
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          <KvBox label="Harga perolehan" v={'Rp ' + fmt(a.cost / 1e6, 0) + ' jt'} />
          <KvBox label="Masa manfaat" v={a.life + ' tahun'} />
          <KvBox label="Penyusutan / tahun" v={'Rp ' + fmt(annual / 1e6, 0) + ' jt'} />
          <KvBox label="Nilai buku kini" v={'Rp ' + fmt(a.nbv / 1e6, 0) + ' jt'} accent="var(--green)" />
        </div>
        <div className="tiny muted upper" style={{ marginBottom: 8 }}>Skedul Penyusutan (garis lurus)</div>
        <table className="dtbl">
          <thead><tr><th>Tahun</th><th className="num">Penyusutan</th><th className="num">Akumulasi</th><th className="num">Nilai Buku</th></tr></thead>
          <tbody>
            {sched.map((s: any) => (
              <tr key={s.yr} style={{ background: s.current ? 'var(--blue-050)' : 'transparent', fontWeight: s.current ? 700 : 400 }}>
                <td style={{ fontWeight: 600 }}>{s.yr}{s.current && <span className="tiny" style={{ color: 'var(--blue)' }}> · kini</span>}</td>
                <td className="num">{fmt(s.dep / 1e6, 0)}</td>
                <td className="num muted">{fmt(s.acc / 1e6, 0)}</td>
                <td className="num" style={{ fontWeight: 600 }}>{fmt(Math.max(0, s.nbv) / 1e6, 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="tiny muted" style={{ marginTop: 8 }}>Nilai residu Rp 0 · metode garis lurus · Rp jt</div>
      </div>
    </div>
  );
}

Object.assign(window, { FirmTreasury, CashBank, FixedAssets });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { CashBank, FirmTreasury, FixedAssets };
