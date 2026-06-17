/* [codemod] ESM imports */
import React from 'react';
import { useAmsPersist } from './contexts.jsx';
import { I } from './icons.jsx';
import { Badge, Btn, Panel } from './ui.jsx';

/* ============================================================
   NeoSuite AMS — PSAK 14 · Kertas Kerja NRV per-SKU (WP C-2)
   Pengujian nilai realisasi neto tingkat item, DITARIK PENUH dari
   AMS_CANON.inventory(wtb).items — subtotal per klasifikasi menutup
   PERSIS ke pengukuran kanonik (mix) & saldo neto WTB 1-1300.
   Untuk tiap SKU: biaya perolehan, harga jual taksiran, biaya
   penyelesaian & penjualan → NRV (¶28–33); nilai terendah biaya/NRV
   (¶9); penurunan diperlukan vs dibukukan → selisih (potensi salah
   saji) yang diakumulasikan ke SAD (SA 450). Pemilihan sampel &
   penandaan pengecualian tersimpan untuk jejak audit.
   ============================================================ */
const { useState: useStateNRV, useMemo: useMemoNRV } = React;

const NRV_CLS_KIND = { rm: 'gray', wip: 'blue', fg: 'navy', spare: 'amber' };
const NRV_CLS_SHORT = { rm: 'Bahan baku', wip: 'WIP', fg: 'Barang jadi', spare: 'Suku cadang' };

function NRVWorkingPaper({ inv, sc, fmt, nav, ctt, pm }) {
  const items = (inv && inv.items) || [];
  const persist = useAmsPersist;

  /* sampel default: seluruh item ber-selisih + 2 item sehat bernilai besar (cakupan) */
  const [sample, setSample] = persist('psak14.nrv.sample', () => {
    const o = {};
    items.forEach(it => { if (it.shortfall > 0) o[it.code] = true; });
    items.filter(i => i.shortfall <= 0).sort((a, b) => b.cost - a.cost).slice(0, 2).forEach(i => { o[i.code] = true; });
    return o;
  });
  /* pengecualian: default mengikuti item ber-selisih, dapat ditimpa manual */
  const [exc, setExc] = persist('psak14.nrv.exc', () => {
    const o = {}; items.forEach(it => { if (it.shortfall > 0) o[it.code] = true; }); return o;
  });
  const [filter, setFilter] = persist('psak14.nrv.filter', 'all');
  const [q, setQ] = useStateNRV('');

  const toggleSample = (code) => setSample(s => ({ ...s, [code]: !s[code] }));
  const toggleExc = (code) => setExc(s => ({ ...s, [code]: !s[code] }));

  /* derivasi agregat (seluruh populasi) */
  const tot = useMemoNRV(() => {
    const sum = (f) => items.reduce((a, x) => a + f(x), 0);
    const cost = sum(x => x.cost), req = sum(x => x.reqWD), booked = sum(x => x.bookedWD);
    const sampledCost = items.filter(i => sample[i.code]).reduce((a, x) => a + x.cost, 0);
    return {
      cost, req, booked, carry: sum(x => x.carry), nrv: sum(x => x.nrv),
      shortfall: req - booked, n: items.length,
      nSample: items.filter(i => sample[i.code]).length,
      nExc: items.filter(i => exc[i.code]).length,
      coverage: cost ? sampledCost / cost : 0,
      excShortfall: items.filter(i => exc[i.code]).reduce((a, x) => a + x.shortfall, 0),
    };
  }, [items, sample, exc]);

  const shown = useMemoNRV(() => {
    const ql = q.trim().toLowerCase();
    return items.filter(it => {
      if (filter === 'issue' && !(it.shortfall > 0)) return false;
      if (filter === 'slow' && !(it.shortfall > 0 || it.age === 'b2' || it.age === 'b3')) return false;
      if (filter === 'sample' && !sample[it.code]) return false;
      if (ql && !(it.code.toLowerCase().includes(ql) || it.label.toLowerCase().includes(ql))) return false;
      return true;
    });
  }, [items, filter, q, sample]);

  /* subtotal himpunan yang ditampilkan */
  const shownTot = useMemoNRV(() => {
    const s = (f) => shown.reduce((a, x) => a + f(x), 0);
    return { cost: s(x => x.cost), sell: s(x => x.sellPrice), nrv: s(x => x.nrv), req: s(x => x.reqWD), booked: s(x => x.bookedWD), shortfall: s(x => x.shortfall) };
  }, [shown]);

  const aboveCTT = ctt != null && tot.shortfall > ctt;
  const abovePM = pm != null && tot.shortfall > pm;
  const tieCarry = Math.abs(tot.carry - inv.closeNet) < 1.5;
  const tieReq = Math.abs(tot.req - inv.requiredWD) < 1.5;

  const FILTERS = [
    { id: 'all', label: 'Semua', n: items.length },
    { id: 'issue', label: 'Ber-selisih', n: items.filter(i => i.shortfall > 0).length },
    { id: 'slow', label: 'Slow & usang', n: items.filter(i => i.shortfall > 0 || i.age === 'b2' || i.age === 'b3').length },
    { id: 'sample', label: 'Dalam sampel', n: tot.nSample },
  ];

  const Th = ({ children, l }) => <th style={{ fontWeight: 600, padding: '7px 8px', textAlign: l ? 'left' : 'right', whiteSpace: 'nowrap', position: 'sticky', top: 0, background: 'var(--surface-2)', zIndex: 1 }}>{children}</th>;
  const Num = ({ v, c, b, dim }) => <td className="mono" style={{ textAlign: 'right', padding: '7px 8px', whiteSpace: 'nowrap', color: dim ? 'var(--ink-4)' : c, fontWeight: b ? 700 : 500 }}>{v}</td>;

  return (
    <Panel noBody>
      <div className="panel-h">
        <h3>Kertas Kerja NRV per-SKU</h3>
        <span className="sub mono">¶9 · ¶28–33 · WP C-2</span>
        <div style={{ flex: 1 }} />
        <Badge kind={tieCarry && tieReq ? 'green' : 'amber'}>{tieCarry && tieReq ? 'Tie-out ke WTB ✓' : 'periksa tie-out'}</Badge>
        <Btn sm onClick={() => nav('sa540', { from: 'psak14' })}><I.target size={13} /> SA 540</Btn>
        <Btn sm onClick={() => nav('sa530', { from: 'psak14' })}><I.search2 size={13} /> Sampling</Btn>
      </div>

      {/* ringkasan */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(5,1fr)', gap: 0, borderBottom: '1px solid var(--line)' }}>
        {[
          { v: tot.n, l: 'SKU diuji', s: '4 klasifikasi', c: 'var(--navy)' },
          { v: tot.nSample, l: 'dalam sampel', s: fmt(tot.coverage * 100, 0) + '% nilai tercakup', c: 'var(--blue)' },
          { v: sc(tot.req), l: 'penurunan diperlukan', s: 'NRV taksiran auditor', c: 'var(--amber)' },
          { v: sc(tot.shortfall), l: 'kurang dibukukan', s: aboveCTT ? (abovePM ? '> PM · signifikan' : '> CTT · wajib ke SAD') : '≤ CTT · remeh', c: 'var(--red)' },
          { v: tot.nExc, l: 'pengecualian', s: 'item NRV < nilai tercatat', c: 'var(--purple)' },
        ].map((k, i) => (
          <div key={i} style={{ padding: '11px 14px', borderRight: i < 4 ? '1px solid var(--line-soft)' : 0 }}>
            <div className="mono" style={{ fontSize: 18, fontWeight: 700, color: k.c, lineHeight: 1.1 }}>{k.v}</div>
            <div className="tiny muted" style={{ fontWeight: 600, marginTop: 2 }}>{k.l}</div>
            <div className="tiny" style={{ color: 'var(--ink-4)' }}>{k.s}</div>
          </div>
        ))}
      </div>

      {/* toolbar */}
      <div className="row ac gap8" style={{ padding: '9px 13px', borderBottom: '1px solid var(--line-soft)', flexWrap: 'wrap' }}>
        <div className="seg" style={{ width: 'fit-content' }}>
          {FILTERS.map(f => <button key={f.id} className={filter === f.id ? 'on' : ''} onClick={() => setFilter(f.id)}>{f.label} <span style={{ opacity: 0.6 }}>{f.n}</span></button>)}
        </div>
        <div style={{ flex: 1 }} />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Cari SKU / deskripsi…" style={{ fontSize: 11.5, padding: '5px 9px', borderRadius: 6, border: '1px solid var(--line)', width: 190, fontFamily: 'inherit' }} />
      </div>

      {/* tabel item-level */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5, minWidth: 1080 }}>
          <thead>
            <tr style={{ color: 'var(--ink-4)' }}>
              <Th l>SKU / Deskripsi</Th>
              <Th>Qty</Th>
              <Th>Biaya / unit</Th>
              <Th>Biaya</Th>
              <Th>Harga jual est.</Th>
              <Th>− Penyelesaian</Th>
              <Th>− Biaya jual</Th>
              <Th>= NRV</Th>
              <Th>Terendah (¶9)</Th>
              <Th>Penurunan diperlukan</Th>
              <Th>Dibukukan</Th>
              <Th>Selisih</Th>
              <Th>Sampel</Th>
              <Th>Pengecualian</Th>
            </tr>
          </thead>
          <tbody>
            {shown.map(it => {
              const issue = it.shortfall > 0;
              const inSample = !!sample[it.code];
              const isExc = !!exc[it.code];
              return (
                <tr key={it.code} style={{ borderTop: '1px solid var(--line-soft)', background: isExc ? 'var(--amber-bg)' : 'transparent' }}>
                  <td style={{ padding: '7px 8px', minWidth: 230 }}>
                    <div className="row ac gap6">
                      <span className="mono" style={{ fontWeight: 700, fontSize: 11 }}>{it.code}</span>
                      <Badge kind={NRV_CLS_KIND[it.cls] || 'gray'}>{NRV_CLS_SHORT[it.cls]}</Badge>
                      {it.age && <span className="tiny mono" style={{ color: it.age === 'b3' ? 'var(--red)' : it.age === 'b2' ? 'var(--amber)' : 'var(--ink-4)' }}>{({ b0: '0–90h', b1: '91–180h', b2: '181–365h', b3: '>365h' })[it.age]}</span>}
                    </div>
                    <div className="tiny muted" style={{ marginTop: 1 }}>{it.label}</div>
                  </td>
                  <Num v={fmt(it.qty / 1000, 0) + 'rb'} dim />
                  <Num v={fmt(it.unitCost, 0)} dim />
                  <Num v={sc(it.cost)} b />
                  <Num v={sc(it.sellPrice)} />
                  <Num v={it.costComplete ? '−' + sc(it.costComplete) : '—'} dim />
                  <Num v={'−' + sc(it.costSell)} dim />
                  <Num v={sc(it.nrv)} c="var(--blue)" />
                  <Num v={sc(it.lower)} b c={it.nrv < it.cost ? 'var(--amber)' : 'var(--ink)'} />
                  <Num v={it.reqWD ? sc(it.reqWD) : '—'} c="var(--amber)" />
                  <Num v={it.bookedWD ? sc(it.bookedWD) : '—'} dim />
                  <Num v={issue ? sc(it.shortfall) : '—'} b c={issue ? 'var(--red)' : 'var(--green)'} />
                  <td style={{ textAlign: 'center', padding: '7px 8px' }}>
                    <span onClick={() => toggleSample(it.code)} role="checkbox" aria-checked={inSample} style={{ display: 'inline-grid', placeItems: 'center', width: 17, height: 17, borderRadius: 4, cursor: 'pointer', border: '1.5px solid ' + (inSample ? 'var(--blue)' : 'var(--line-strong)'), background: inSample ? 'var(--blue)' : '#fff' }}>{inSample && <I.check size={11} style={{ color: '#fff' }} />}</span>
                  </td>
                  <td style={{ textAlign: 'center', padding: '7px 8px' }}>
                    <button onClick={() => toggleExc(it.code)} style={{ cursor: 'pointer', border: 0, background: 'none', padding: 0 }}>
                      {isExc
                        ? <span className="row ac gap4" style={{ color: 'var(--amber)', fontWeight: 700, fontSize: 10.5 }}><I.alert size={12} /> Ya</span>
                        : <span className="tiny" style={{ color: 'var(--ink-4)' }}>—</span>}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: '1.5px solid var(--navy)', fontWeight: 700, background: 'var(--surface-2)' }}>
              <td style={{ padding: '8px', textAlign: 'left' }}>Subtotal ({shown.length} SKU{filter !== 'all' ? ' · tersaring' : ''})</td>
              <td colSpan={2}></td>
              <Num v={sc(shownTot.cost)} b />
              <Num v={sc(shownTot.sell)} b />
              <td colSpan={2}></td>
              <Num v={sc(shownTot.nrv)} b c="var(--blue)" />
              <td></td>
              <Num v={sc(shownTot.req)} b c="var(--amber)" />
              <Num v={sc(shownTot.booked)} b dim />
              <Num v={sc(shownTot.shortfall)} b c="var(--red)" />
              <td colSpan={2}></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* tie-out & kesimpulan */}
      <div className="row ac jb" style={{ padding: '10px 14px', borderTop: '1px solid var(--line)', gap: 12, flexWrap: 'wrap' }}>
        <div className="row ac gap8" style={{ flexWrap: 'wrap' }}>
          <span className="row ac gap4 tiny" style={{ color: tieCarry ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
            {tieCarry ? <I.checkCircle size={13} /> : <I.alert size={13} />} Σ nilai tercatat {sc(tot.carry)} = Persediaan neto WTB {sc(inv.closeNet)}
          </span>
          <span style={{ color: 'var(--line-strong)' }}>·</span>
          <span className="row ac gap4 tiny" style={{ color: tieReq ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
            {tieReq ? <I.checkCircle size={13} /> : <I.alert size={13} />} Σ penurunan diperlukan {sc(tot.req)} = uji NRV kanonik {sc(inv.requiredWD)}
          </span>
        </div>
        <div onClick={() => nav('sad', { from: 'psak14' })} className="row ac gap6" style={{ cursor: 'pointer', padding: '6px 10px', borderRadius: 7, background: 'var(--amber-bg)', border: '1px solid var(--line)' }}>
          <span style={{ fontSize: 11.5 }}>Kurang dibukukan agregat Rp <b>{fmt(tot.shortfall)} jt</b> dari <b>{tot.nExc}</b> pengecualian → usulkan ke SAD</span>
          <span className="mono tiny" style={{ fontWeight: 700, color: 'var(--amber)' }}>SAD <I.arrowRight size={12} /></span>
        </div>
      </div>
    </Panel>
  );
}

Object.assign(window, { NRVWorkingPaper });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { NRVWorkingPaper };
