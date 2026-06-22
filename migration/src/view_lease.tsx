/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { AMS_CANON } from './canon';
import { useNav } from './contexts';
import { I } from './icons';
import { SubBar } from './shell';
import { Badge, Btn, Panel, Seg, Stat } from './ui';
import { Kv } from './view_calc';
import { SliderRow } from './view_materiality';

/* ============================================================
   Asseris — PSAK 73 Lease Calculator (ROU + liability)
   ============================================================ */
const { useState: useStateL, useMemo: useMemoL } = React;

/* sumber kebenaran data sewa & kalkulasi → app/canon.js (dipakai juga oleh PSAK 46) */
const LEASES = AMS_CANON.LEASES;
const leaseCalc = AMS_CANON.leaseCalc;

function LeaseCalculator() {
  const { fmt } = AMS;
  const nav = useNav();
  const [selId, setSelId] = useStateL('LS-01');
  const [override, setOverride] = useStateL({});
  const [yearly, setYearly] = useStateL(true);

  const base = LEASES.find(l => l.id === selId);
  const cur = { ...base, ...(override[selId] || {}) };
  const { pv, rows } = useMemoL(() => leaseCalc(cur.termMo, cur.pmt, cur.rate), [cur.termMo, cur.pmt, cur.rate]);

  const rouAmort = pv / cur.termMo; // straight line
  const set = (k: any, v: any) => setOverride((o: any) => ({ ...o, [selId]: { ...(o[selId] || {}), [k]: v } }));

  // current vs non-current split (next 12 months principal)
  const currentLiab = rows.slice(0, 12).reduce((s: any, x: any) => s + x.principal, 0);
  const nonCurrentLiab = pv - currentLiab;

  // all leases totals
  const allTotals = LEASES.reduce((acc, l) => {
    const c = { ...l, ...(override[l.id] || {}) };
    const { pv: p } = leaseCalc(c.termMo, c.pmt, c.rate);
    return { rou: acc.rou + p, liab: acc.liab + p };
  }, { rou: 0, liab: 0 });

  // schedule display (yearly summary or monthly)
  const display = useMemoL(() => {
    if (!yearly) return rows.slice(0, 14).map((r: any) => ({ ...r, label: 'Bln ' + r.m }));
    const years = [];
    for (let y = 0; y * 12 < rows.length; y++) {
      const slice = rows.slice(y * 12, y * 12 + 12);
      years.push({
        label: 'Tahun ' + (y + 1),
        opening: slice[0].opening,
        interest: slice.reduce((s: any, x: any) => s + x.interest, 0),
        pmt: slice.reduce((s: any, x: any) => s + x.pmt, 0),
        principal: slice.reduce((s: any, x: any) => s + x.principal, 0),
        closing: slice[slice.length - 1].closing,
      });
    }
    return years;
  }, [rows, yearly]);

  return (
    <>
      <SubBar moduleId="psak73" right={
        <div className="row gap8 ac">
          <Badge kind="blue">PSAK 73 · Sewa</Badge>
          <Btn sm onClick={() => nav('psak46', { from: 'psak73' })}><I.receipt size={13} /> Dampak Pajak Tangguhan</Btn>
          <Btn sm><I.download size={13} /> Skedul Amortisasi</Btn>
          <Btn sm variant="primary"><I.ledger size={14} /> Jurnal Pengakuan</Btn>
        </div>
      } />
      <div className="view-scroll">
        <div className="view-pad">
          {/* portfolio summary */}
          <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
            <Panel><div style={{ padding: '11px 14px' }}><Stat value={'Rp ' + fmt(allTotals.rou / 1e6, 0) + ' jt'} label="Total Aset Hak-Guna" accent="var(--blue)" /></div></Panel>
            <Panel><div style={{ padding: '11px 14px' }}><Stat value={'Rp ' + fmt(allTotals.liab / 1e6, 0) + ' jt'} label="Total Liabilitas Sewa" /></div></Panel>
            <Panel><div style={{ padding: '11px 14px' }}><Stat value={LEASES.length} label="Kontrak Sewa Aktif" /></div></Panel>
            <Panel><div style={{ padding: '11px 14px' }}><Stat value={'Rp ' + fmt(rows.reduce((s: any, x: any) => s + x.interest, 0) / 1e6, 0) + ' jt'} label="Total Beban Bunga (kontrak ini)" accent="var(--amber)" /></div></Panel>
          </div>

          <div className="grid" style={{ gridTemplateColumns: '300px 1fr', gap: 12, alignItems: 'start' }}>
            {/* contracts + inputs */}
            <div className="grid" style={{ gap: 12 }}>
              <Panel title="Kontrak Sewa">
                <div style={{ display: 'grid', gap: 0 }}>
                  {LEASES.map(l => {
                    const c = { ...l, ...(override[l.id] || {}) };
                    const { pv: p } = leaseCalc(c.termMo, c.pmt, c.rate);
                    return (
                      <div key={l.id} onClick={() => setSelId(l.id)} style={{ padding: '9px 10px', borderRadius: 7, cursor: 'pointer', border: '1px solid ' + (l.id === selId ? 'var(--blue)' : 'transparent'), background: l.id === selId ? 'var(--blue-050)' : 'transparent', marginBottom: 4 }}>
                        <div className="row jb ac"><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{l.id}</span><span className="tiny muted">{c.termMo} bln</span></div>
                        <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.3, margin: '2px 0' }}>{l.name}</div>
                        <div className="mono tiny muted">ROU Rp {fmt(p / 1e6, 0)} jt</div>
                      </div>
                    );
                  })}
                </div>
              </Panel>

              <Panel title="Parameter Sewa" sub={cur.id}>
                <SliderRow label="Jangka Waktu (bulan)" value={cur.termMo} min={12} max={120} step={6} suffix=" bln" onChange={(v: any) => set('termMo', v)} />
                <div className="field" style={{ marginBottom: 14 }}>
                  <label>Pembayaran Bulanan</label>
                  <input type="number" value={cur.pmt} step={5_000_000} onChange={(e: any) => set('pmt', +e.target.value)} className="input mono" style={{ textAlign: 'right' }} />
                  <div className="tiny muted mono">Rp {fmt(cur.pmt)}</div>
                </div>
                <SliderRow label="Incremental Borrowing Rate" value={cur.rate} min={5} max={15} step={0.25} suffix="%" onChange={(v: any) => set('rate', v)} hint="Suku bunga pinjaman inkremental" />
              </Panel>
            </div>

            {/* results + schedule */}
            <div className="grid" style={{ gap: 12 }}>
              <Panel noBody>
                <div style={{ background: 'linear-gradient(125deg,#013a52,#005085)', color: '#fff', padding: '15px 18px', display: 'flex', gap: 26, flexWrap: 'wrap' }}>
                  <div>
                    <div className="tiny" style={{ color: '#bcd6e4', textTransform: 'uppercase', letterSpacing: '.07em' }}>Aset Hak-Guna (ROU)</div>
                    <div className="mono" style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.1 }}>Rp {fmt(pv)}</div>
                  </div>
                  <div className="vdivider" style={{ background: 'rgba(255,255,255,.18)' }} />
                  <div>
                    <div className="tiny" style={{ color: '#bcd6e4', textTransform: 'uppercase', letterSpacing: '.07em' }}>Liabilitas Sewa</div>
                    <div className="mono" style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.1 }}>Rp {fmt(pv)}</div>
                  </div>
                  <div className="vdivider" style={{ background: 'rgba(255,255,255,.18)' }} />
                  <div style={{ display: 'grid', gap: 6, alignContent: 'center' }}>
                    <Kv label="— Bagian Lancar" v={'Rp ' + fmt(currentLiab / 1e6, 0) + ' jt'} />
                    <Kv label="— Bagian Jk. Panjang" v={'Rp ' + fmt(nonCurrentLiab / 1e6, 0) + ' jt'} />
                  </div>
                </div>
                <div style={{ padding: '10px 14px' }} className="row jb ac">
                  <span className="tiny muted">Amortisasi ROU garis lurus: <b className="mono">Rp {fmt(rouAmort / 1e6, 1)} jt/bln</b> · {cur.termMo} bln</span>
                  <Badge kind="green">Liability = ROU (saat awal)</Badge>
                </div>
              </Panel>

              <Panel noBody>
                <div className="panel-h"><h3>Skedul Amortisasi Liabilitas</h3><div style={{ flex: 1 }} /><Seg options={[{ value: true, label: 'Tahunan' }, { value: false, label: 'Bulanan' }]} value={yearly} onChange={setYearly} /></div>
                <div style={{ maxHeight: 'calc(100vh - 430px)', overflow: 'auto' }}>
                  <table className="dtbl">
                    <thead><tr>
                      <th>Periode</th><th className="num">Saldo Awal</th><th className="num">Bunga</th><th className="num">Pembayaran</th><th className="num">Pokok</th><th className="num">Saldo Akhir</th>
                    </tr></thead>
                    <tbody>
                      {display.map((r: any, i: any) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 600 }}>{r.label}</td>
                          <td className="num">{fmt(r.opening)}</td>
                          <td className="num" style={{ color: 'var(--amber)' }}>{fmt(r.interest)}</td>
                          <td className="num">{fmt(r.pmt)}</td>
                          <td className="num">{fmt(r.principal)}</td>
                          <td className="num" style={{ fontWeight: 600 }}>{fmt(r.closing)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>

              {/* dasar pajak & beda temporer (jembatan ke PSAK 46) */}
              {(() => {
                const tp = AMS_CANON.leasePortfolio();
                const dtaJt = Math.round(tp.netJt * AMS_CANON.RATE);
                return (
                  <Panel noBody>
                    <div className="panel-h"><h3>Dasar Pajak & Beda Temporer</h3><span className="sub mono">PSAK 46 · per 31 Des 2025</span><div style={{ flex: 1 }} /><Btn sm onClick={() => nav('psak46', { from: 'psak73' })}><I.receipt size={13} /> Buka PSAK 46</Btn></div>
                    <div style={{ overflowX: 'auto' }}>
                      <table className="dtbl" style={{ width: '100%' }}>
                        <thead><tr>
                          <th style={{ textAlign: 'left' }}>Kontrak</th>
                          <th className="num">Aset Hak-Guna</th>
                          <th className="num">Liabilitas Sewa</th>
                          <th className="num">Beda Temporer</th>
                        </tr></thead>
                        <tbody>
                          {tp.perLease.map(l => (
                            <tr key={l.id}>
                              <td><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{l.id}</span> <span className="tiny muted">{l.elapsed}/{l.term} bln</span></td>
                              <td className="num">{fmt(l.rou / 1e6, 0)}</td>
                              <td className="num">{fmt(l.liab / 1e6, 0)}</td>
                              <td className="num" style={{ fontWeight: 700, color: 'var(--green)' }}>{fmt(l.net / 1e6, 0)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr style={{ background: 'var(--surface-2)' }}>
                            <td style={{ fontWeight: 700, color: 'var(--navy)' }}>Portofolio (Rp juta)</td>
                            <td className="num" style={{ fontWeight: 700 }}>{fmt(tp.rou / 1e6, 0)}</td>
                            <td className="num" style={{ fontWeight: 700 }}>{fmt(tp.liab / 1e6, 0)}</td>
                            <td className="num" style={{ fontWeight: 800, color: 'var(--navy)' }}>{fmt(tp.netJt, 0)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                    <div className="row ac jb" style={{ padding: '10px 14px 12px' }}>
                      <span className="tiny muted" style={{ lineHeight: 1.45, maxWidth: 360 }}>ROU disusutkan garis lurus lebih cepat dari amortisasi liabilitas (bunga efektif) → di awal masa sewa <b>liabilitas &gt; ROU</b>. Dasar pajak keduanya 0 (fiskal mengakui saat dibayar), maka selisih neto = beda temporer <b>dapat dikurangkan</b>.</span>
                      <span className="mono tiny" style={{ fontWeight: 700, color: 'var(--green)', whiteSpace: 'nowrap' }}>DTA = {fmt(tp.netJt, 0)} × 22% = Rp {fmt(dtaJt)} jt</span>
                    </div>
                  </Panel>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { LeaseCalculator });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { LeaseCalculator };
