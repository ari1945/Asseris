/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { useAmsPersist, useAudit, useFirm, useNav } from './contexts';
import { I } from './icons';
import { SubBar } from './shell';
import { Avatar, Btn, Donut, Panel, Seg, Stat } from './ui';
import { KvBox } from './view_analytical';
import { FIRMFIN } from './data_firmfin';

/* ============================================================
   Asseris — WIP & Realisasi (Practice Operations · D+)
   Ekonomi perikatan: nilai standar, WIP belum tertagih,
   write-down, realisasi & margin. Firma-wide.
   ------------------------------------------------------------
   SUMBER KEBENARAN: FIRMFIN.wip(ctx) — identik dengan WIP
   Valuation (route wip), Dashboard & cockpit Firm Finance. View ini
   hanya menambah overlay write-down manual (persisted) di atas
   sub-buku kanonik; tidak ada perhitungan WIP paralel.
   ============================================================ */
const { useState: useStateWipF, useMemo: useMemoWipF } = React;

function WIPRealization() {
  const { fmt } = AMS;
  const FF = FIRMFIN;
  const nav = useNav();
  const { engagements, clients, activeEngagement } = useFirm();
  const { timeEntries } = useAudit();
  const [view, setView] = useStateWipF('Perikatan');
  const [sel, setSel] = useStateWipF(null);
  const [adj, setAdj] = useAmsPersist('wip.adj', {});

  const ctx = useMemoWipF(() => ({ engagements, clients }), [engagements, clients]);
  /* overlay jam-aktual T&B untuk engagement aktif — identik dgn WIP Valuation (SSOT FIRMFIN). */
  const liveByEng = useMemoWipF(() => {
    const id = activeEngagement && activeEngagement.id;
    const ew = FF.engagementWip(timeEntries, id);
    return ew ? { [id]: { std: ew.stdValue, cost: ew.costValue, actualHrs: ew.actualHrs } } : null;
  }, [timeEntries, activeEngagement]);
  const W = useMemoWipF(() => FF.wip(ctx, undefined, liveByEng), [ctx, liveByEng]);

  /* overlay write-down manual di atas baris kanonik (semantik persen utk view ini) */
  const rows = W.registerAll.map((b: any) => {
    const extraWD = adj[b.id] || 0;
    const writeDown = b.writeDown + extraWD;
    const recoverable = b.std + b.writeUp - writeDown;
    const wip = recoverable - b.billed;
    const realization = b.std ? recoverable / b.std * 100 : 0;
    const margin = recoverable ? (recoverable - b.cost) / recoverable * 100 : 0;
    return { ...b, writeDown, extraWD, recoverable, wip, realization, margin };
  });

  const totWip = rows.reduce((s: any, r: any) => s + Math.max(0, r.wip), 0);
  const totStd = rows.reduce((s: any, r: any) => s + r.std, 0);
  const totRec = rows.reduce((s: any, r: any) => s + r.recoverable, 0);
  const totCost = rows.reduce((s: any, r: any) => s + r.cost, 0);
  const totWD = rows.reduce((s: any, r: any) => s + r.writeDown, 0);
  const avgReal = totStd ? totRec / totStd * 100 : 0;
  const avgMargin = totRec ? (totRec - totCost) / totRec * 100 : 0;

  // per-partner aggregation
  const partners = useMemoWipF(() => {
    const m = {};
    rows.forEach((r: any) => {
      const p = r.partner || '—';
      (m as any)[p] = (m as any)[p] || { partner: p, std: 0, recoverable: 0, billed: 0, wip: 0, cost: 0, n: 0 };
      (m as any)[p].std += r.std; (m as any)[p].recoverable += r.recoverable; (m as any)[p].billed += r.billed;
      (m as any)[p].wip += Math.max(0, r.wip); (m as any)[p].cost += r.cost; (m as any)[p].n += 1;
    });
    return Object.values(m).map((x: any) => ({ ...x, realization: x.std ? x.recoverable / x.std * 100 : 0, margin: x.recoverable ? (x.recoverable - x.cost) / x.recoverable * 100 : 0 }));
  }, [rows]);

  const aging = W.aging;
  const agingMax = Math.max(...aging.map((a: any) => a.value), 1);
  const overdueWip = aging.filter((_: any, i: any) => i >= 2).reduce((s: any, a: any) => s + a.value, 0);
  const selRow = sel ? rows.find((r: any) => r.id === sel) : null;
  const realColor = (v: any) => v >= 100 ? 'var(--green)' : v >= 92 ? 'var(--amber)' : 'var(--red)';

  return (
    <>
      <SubBar moduleId="wipreal" right={
        <div className="row gap8 ac">
          {liveByEng && <span className="chip tiny" style={{ background: 'var(--green-bg)', color: 'var(--green)', cursor: 'pointer' }} title="Nilai standar engagement aktif ditarik dari jam aktual Time & Budget (live)" onClick={() => nav('time', { from: 'wipreal' })}><I.clock size={11} /> Sinkron T&B</span>}
          <span className="chip tiny" title="Satu sumber kebenaran dengan WIP Valuation & GL 1-300"><I.link2 size={11} /> Sinkron WIP Valuation</span>
          <Seg options={['Perikatan', 'Partner']} value={view} onChange={setView} />
          <Btn sm onClick={() => nav('wip', { from: 'wipreal' })}><I.hourglass size={13} /> WIP Valuation</Btn>
          <Btn sm><I.download size={13} /> Laporan WIP</Btn>
        </div>
      } />
      <div className="view-scroll"><div className="view-pad">
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={'Rp ' + fmt(totWip / 1e9, 2) + ' M'} label="Saldo WIP (belum tertagih)" accent="var(--blue)" /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={fmt(avgReal, 0) + '%'} label="Realisasi Rata-rata" accent={realColor(avgReal)} /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={'Rp ' + fmt(totWD / 1e6, 0) + ' jt'} label="Write-down YTD" accent="var(--red)" /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={fmt(avgMargin, 0) + '%'} label="Margin Rata-rata" accent="var(--green)" /></div></Panel>
        </div>

        <div className="grid" style={{ gridTemplateColumns: selRow ? '1fr 360px' : '1fr', gap: 12, alignItems: 'start' }}>
          <div className="grid" style={{ gap: 12 }}>
            <Panel noBody>
              <div className="panel-h"><h3>{view === 'Partner' ? 'Realisasi per Partner' : 'WIP per Perikatan'}</h3><div style={{ flex: 1 }} /><span className="tiny muted">nilai dalam juta Rp · klik baris</span></div>
              {view === 'Perikatan' ? (
                <table className="dtbl">
                  <thead><tr><th>Perikatan</th><th>Partner</th><th className="num">Nilai Standar</th><th className="num">Difakturkan</th><th className="num">Saldo WIP</th><th className="num">Write-down</th><th className="num">Realisasi</th><th className="num">Margin</th></tr></thead>
                  <tbody>
                    {rows.map((r: any) => (
                      <tr key={r.id} className={r.id === sel ? 'sel' : ''} onClick={() => setSel(r.id === sel ? null : r.id)} style={{ cursor: 'pointer' }}>
                        <td><div style={{ fontWeight: 600 }} className="truncate">{r.clientShort}</div><div className="tiny muted mono">{r.id}</div></td>
                        <td className="tiny muted">{(r.partner || '—').split(' ')[0]}</td>
                        <td className="num">{fmt(r.std / 1e6, 0)}</td>
                        <td className="num muted">{r.billed ? fmt(r.billed / 1e6, 0) : '—'}</td>
                        <td className="num" style={{ fontWeight: 700, color: r.wip > 0 ? 'var(--blue)' : 'var(--ink-4)' }}>{fmt(r.wip / 1e6, 0)}</td>
                        <td className="num" style={{ color: r.writeDown ? 'var(--red)' : 'var(--ink-4)' }}>{r.writeDown ? '(' + fmt(r.writeDown / 1e6, 0) + ')' : '—'}</td>
                        <td className="num" style={{ fontWeight: 700, color: realColor(r.realization) }}>{fmt(r.realization, 0)}%</td>
                        <td className="num" style={{ color: r.margin >= 38 ? 'var(--green)' : 'var(--amber)' }}>{fmt(r.margin, 0)}%</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot><tr><td colSpan={2}>TOTAL</td><td className="num">{fmt(totStd / 1e6, 0)}</td><td className="num">{fmt(rows.reduce((s: any, r: any) => s + r.billed, 0) / 1e6, 0)}</td><td className="num">{fmt(totWip / 1e6, 0)}</td><td className="num">({fmt(totWD / 1e6, 0)})</td><td className="num">{fmt(avgReal, 0)}%</td><td className="num">{fmt(avgMargin, 0)}%</td></tr></tfoot>
                </table>
              ) : (
                <table className="dtbl">
                  <thead><tr><th>Partner</th><th className="num">Perikatan</th><th className="num">Nilai Standar</th><th className="num">Saldo WIP</th><th className="num">Realisasi</th><th className="num">Margin</th></tr></thead>
                  <tbody>
                    {partners.map((p: any) => (
                      <tr key={p.partner}>
                        <td className="row ac gap8" style={{ height: 'var(--row-h)' }}><Avatar name={p.partner} size={22} /><span style={{ fontWeight: 600 }}>{p.partner}</span></td>
                        <td className="num muted">{p.n}</td>
                        <td className="num">{fmt(p.std / 1e6, 0)}</td>
                        <td className="num" style={{ fontWeight: 700, color: 'var(--blue)' }}>{fmt(p.wip / 1e6, 0)}</td>
                        <td className="num" style={{ fontWeight: 700, color: realColor(p.realization) }}>{fmt(p.realization, 0)}%</td>
                        <td className="num" style={{ color: p.margin >= 38 ? 'var(--green)' : 'var(--amber)' }}>{fmt(p.margin, 0)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Panel>

            <div className="grid" style={{ gridTemplateColumns: '1.3fr 1fr', gap: 12, alignItems: 'start' }}>
              <Panel title="Umur WIP Belum Tertagih" sub="aging · sumber kanonik">
                <div style={{ display: 'grid', gap: 10 }}>
                  {aging.map((a: any, i: any) => (
                    <div key={i}>
                      <div className="row jb ac" style={{ marginBottom: 3 }}>
                        <span className="tiny" style={{ fontWeight: 600, color: i >= 2 ? 'var(--red)' : 'var(--ink-2)' }}>{a.bucket}</span>
                        <span className="mono tiny" style={{ fontWeight: 700 }}>Rp {fmt(a.value / 1e6, 0)} jt</span>
                      </div>
                      <div style={{ height: 8, borderRadius: 5, background: 'var(--surface-3)', overflow: 'hidden' }}>
                        <span style={{ display: 'block', height: '100%', width: (a.value / agingMax * 100) + '%', background: i >= 2 ? 'var(--red)' : i === 1 ? 'var(--amber)' : 'var(--blue)' }} />
                      </div>
                    </div>
                  ))}
                  <div className="panel" style={{ padding: '8px 10px', background: 'var(--amber-bg)', borderColor: 'transparent' }}>
                    <div className="tiny" style={{ fontWeight: 600, lineHeight: 1.45 }}>Rp {fmt(overdueWip / 1e6, 0)} jt WIP berusia &gt; 60 hari — prioritaskan penerbitan faktur untuk menjaga arus kas.</div>
                  </div>
                </div>
              </Panel>

              <Panel title="Realisasi vs Target" sub="target firma 95%">
                <div className="row ac" style={{ gap: 14 }}>
                  <Donut size={104} thickness={15} segments={[
                    { value: Math.min(avgReal, 100), color: realColor(avgReal) },
                    { value: Math.max(0, 100 - avgReal), color: 'var(--surface-3)' },
                  ]} center={<><div style={{ fontSize: 19, fontWeight: 800, color: realColor(avgReal) }}>{fmt(avgReal, 0)}%</div><div className="tiny muted">realisasi</div></>} />
                  <div style={{ flex: 1, display: 'grid', gap: 8 }}>
                    <KvBox label="Nilai Dapat Dipulihkan" v={'Rp ' + fmt(totRec / 1e9, 2) + ' M'} accent="var(--green)" />
                    <KvBox label="Gap ke Target 95%" v={(avgReal >= 95 ? '+' : '') + fmt(avgReal - 95, 1) + ' pts'} accent={avgReal >= 95 ? 'var(--green)' : 'var(--red)'} />
                  </div>
                </div>
              </Panel>
            </div>
          </div>

          {selRow && <WipDetail r={selRow} onClose={() => setSel(null)}
            onWriteDown={() => setAdj((a: any) => ({ ...a, [selRow.id]: (a[selRow.id] || 0) + 25_000_000 }))}
            onReset={() => setAdj((a: any) => { const n = { ...a }; delete n[selRow.id]; return n; })} />}
        </div>
      </div></div>
    </>
  );
}

function WipDetail({ r, onClose, onWriteDown, onReset }: any) {
  const { fmt } = AMS;
  const nav = useNav();
  const realColor = r.realization >= 100 ? 'var(--green)' : r.realization >= 92 ? 'var(--amber)' : 'var(--red)';
  const Line = ({ label, v, op, strong, accent }: any) => (
    <div className="row jb ac" style={{ padding: '7px 0', borderBottom: '1px solid var(--line-soft)' }}>
      <span className="tiny" style={{ fontWeight: strong ? 700 : 500, color: strong ? 'var(--ink)' : 'var(--ink-2)' }}>{op && <span className="mono" style={{ color: 'var(--ink-4)', marginRight: 5 }}>{op}</span>}{label}</span>
      <span className="mono" style={{ fontWeight: strong ? 800 : 600, fontSize: 12.5, color: accent || 'var(--ink)' }}>{(v < 0 ? '(' : '') + 'Rp ' + fmt(Math.abs(v) / 1e6, 0) + ' jt' + (v < 0 ? ')' : '')}</span>
    </div>
  );
  return (
    <Panel noBody style={{ position: 'sticky', top: 0 }}>
      <div style={{ background: 'linear-gradient(125deg,#013a52,#005085)', color: '#fff', padding: '13px 15px' }}>
        <div className="row jb ac" style={{ marginBottom: 6 }}><span className="mono tiny" style={{ color: '#bcd6e4', fontWeight: 700 }}>{r.id}</span><button className="top-btn" onClick={onClose}><I.x size={17} /></button></div>
        <div style={{ fontSize: 14, fontWeight: 700 }}>{r.clientShort}</div>
        <div className="tiny" style={{ color: '#bcd6e4' }}>{r.partner} · {r.type}</div>
      </div>
      <div style={{ padding: 14 }}>
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 9, marginBottom: 13 }}>
          <KvBox label="Realisasi" v={fmt(r.realization, 0) + '%'} accent={realColor} />
          <KvBox label="Margin" v={fmt(r.margin, 0) + '%'} accent={r.margin >= 38 ? 'var(--green)' : 'var(--amber)'} />
        </div>
        <div className="tiny muted upper" style={{ marginBottom: 4 }}>Rekonsiliasi WIP</div>
        <div style={{ marginBottom: 13 }}>
          <Line label="Nilai standar jam" v={r.std} strong />
          {r.writeUp > 0 && <Line label="Write-up (premium)" v={r.writeUp} op="+" accent="var(--green)" />}
          <Line label="Write-down" v={-r.writeDown} op="−" accent="var(--red)" />
          <Line label="Nilai dapat dipulihkan" v={r.recoverable} op="=" strong accent="var(--navy)" />
          <Line label="Telah difakturkan" v={-r.billed} op="−" />
          <Line label="Saldo WIP" v={r.wip} op="=" strong accent={r.wip > 0 ? 'var(--blue)' : 'var(--ink-4)'} />
        </div>
        {r.wip < 0 && <div className="panel" style={{ padding: '8px 10px', background: 'var(--teal-bg)', borderColor: 'transparent', marginBottom: 12 }}><div className="tiny" style={{ fontWeight: 600 }}>Posisi over-billed (penagihan di muka) — diakui sebagai pendapatan ditangguhkan.</div></div>}
        {r.extraWD > 0 && <div className="tiny muted" style={{ marginBottom: 8 }}>Termasuk write-down manual Rp {fmt(r.extraWD / 1e6, 0)} jt.</div>}
        <div className="row gap8" style={{ flexWrap: 'wrap' }}>
          {r.wip > 0 && <Btn sm variant="primary" onClick={() => nav('billing')}><I.receipt size={13} /> Terbitkan Faktur</Btn>}
          <Btn sm onClick={onWriteDown}><I.trend size={13} style={{ transform: 'scaleY(-1)' }} /> + Write-down 25jt</Btn>
          {r.extraWD > 0 && <Btn sm onClick={onReset}>Reset</Btn>}
        </div>
      </div>
    </Panel>
  );
}

Object.assign(window, { WIPRealization });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { WIPRealization };
