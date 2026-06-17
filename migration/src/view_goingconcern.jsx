/* [codemod] ESM imports */
import React from 'react';
import { I } from './icons.jsx';
import { SubBar } from './shell.jsx';
import { Badge, Btn, Panel, Spark } from './ui.jsx';
import { RowKv } from './view_calc.jsx';

/* ============================================================
   NeoSuite AMS — Going Concern (SA 570)
   ============================================================ */
const { useState: useStateGC, useMemo: useMemoGC } = React;

const GC_RATIOS = [
  { id: 'cr',  label: 'Current Ratio',     value: 1.60, py: 1.82, unit: 'x',  good: v => v >= 1.2, warn: v => v >= 1.0, trend: [2.1, 1.95, 1.82, 1.71, 1.60], hint: 'Aset Lancar ÷ Liabilitas Jk. Pendek' },
  { id: 'qr',  label: 'Quick Ratio',       value: 0.79, py: 0.95, unit: 'x',  good: v => v >= 1.0, warn: v => v >= 0.7, trend: [1.1, 1.02, 0.95, 0.86, 0.79], hint: '(Aset Lancar − Persediaan) ÷ Liab. Jk. Pendek' },
  { id: 'der', label: 'Debt-to-Equity',    value: 0.97, py: 0.88, unit: 'x',  good: v => v <= 1.0, warn: v => v <= 1.5, trend: [0.74, 0.81, 0.88, 0.92, 0.97], hint: 'Total Liabilitas ÷ Total Ekuitas', invert: true },
  { id: 'icr', label: 'Interest Coverage', value: 3.96, py: 4.80, unit: 'x',  good: v => v >= 3, warn: v => v >= 1.5, trend: [6.1, 5.4, 4.8, 4.3, 3.96], hint: 'EBIT ÷ Beban Bunga' },
  { id: 'ocf', label: 'Arus Kas Operasi',  value: 18.2, py: 22.4, unit: ' M', good: v => v > 0, warn: v => v > -5, trend: [28, 25, 22.4, 20.1, 18.2], hint: 'Arus kas dari aktivitas operasi (Rp M)' },
  { id: 'wc',  label: 'Modal Kerja',        value: 57.1, py: 64.8, unit: ' M', good: v => v > 0, warn: v => v > 0, trend: [78, 71, 64.8, 60.5, 57.1], hint: 'Aset Lancar − Liab. Jk. Pendek (Rp M)' },
];

const GC_INDICATORS = {
  Keuangan: [
    { id: 'k1', label: 'Posisi liabilitas lancar bersih (net current liability)', on: false },
    { id: 'k2', label: 'Arus kas operasi negatif', on: false },
    { id: 'k3', label: 'Rasio keuangan kunci memburuk', on: true },
    { id: 'k4', label: 'Kerugian operasi substansial', on: false },
    { id: 'k5', label: 'Ketidakmampuan membayar kreditur saat jatuh tempo', on: false },
    { id: 'k6', label: 'Kesulitan memperoleh pendanaan baru', on: false },
  ],
  Operasi: [
    { id: 'o1', label: 'Kehilangan manajemen kunci tanpa pengganti', on: false },
    { id: 'o2', label: 'Kehilangan pasar/pelanggan/pemasok utama', on: false },
    { id: 'o3', label: 'Kesulitan tenaga kerja', on: false },
    { id: 'o4', label: 'Kelangkaan pasokan penting', on: false },
  ],
  Lainnya: [
    { id: 'l1', label: 'Ketidakpatuhan terhadap ketentuan permodalan/perundangan', on: false },
    { id: 'l2', label: 'Proses hukum yang dapat berdampak material', on: true },
    { id: 'l3', label: 'Perubahan peraturan/kebijakan pemerintah yang merugikan', on: false },
  ],
};

function GoingConcern() {
  const { fmt } = window.AMS;
  const [inds, setInds] = useStateGC(GC_INDICATORS);
  const [revShock, setRevShock] = useStateGC(0);      // % revenue decline
  const [costCut, setCostCut] = useStateGC(0);         // % opex reduction (mitigation)
  const [financing, setFinancing] = useStateGC(true);  // refinancing available
  const toggle = (cat, id) => setInds(s => ({ ...s, [cat]: s[cat].map(i => i.id === id ? { ...i, on: !i.on } : i) }));

  /* 12-month cash projection (Rp miliar) */
  const projection = useMemoGC(() => {
    let bal = 21.9; // opening cash
    const baseInflow = 28.5, baseOutflow = 26.8; // monthly avg
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
    const rows = [];
    for (let i = 0; i < 12; i++) {
      const inflow = baseInflow * (1 - revShock / 100);
      const outflow = baseOutflow * (1 - costCut / 100);
      // debt maturity bullet in Jun & Dec
      const debt = (i === 5 || i === 11) ? (financing ? 0 : 8.0) : 0;
      const net = inflow - outflow - debt;
      bal += net;
      rows.push({ m: months[i], inflow, outflow, debt, net, bal });
    }
    return rows;
  }, [revShock, costCut, financing]);

  const minBal = Math.min(...projection.map(r => r.bal));
  const breach = projection.find(r => r.bal < 0);
  const minBar = Math.max(...projection.map(r => Math.abs(r.bal)), 5);

  const triggered = Object.values(inds).flat().filter(i => i.on).length;
  const ratioFlags = GC_RATIOS.filter(r => !r.good(r.value)).length;
  const score = triggered * 2 + ratioFlags;
  const level = score >= 8 ? { l: 'Material Uncertainty', k: 'red', txt: 'Terdapat ketidakpastian material atas kelangsungan usaha. Pertimbangkan paragraf "Material Uncertainty Related to Going Concern" pada laporan auditor (SA 570 ¶22).' }
    : score >= 4 ? { l: 'Elevated', k: 'amber', txt: 'Terdapat indikasi yang perlu dievaluasi lebih lanjut beserta rencana mitigasi manajemen. Dokumentasikan kesimpulan dan pengaruhnya terhadap opini.' }
    : { l: 'Low Risk', k: 'green', txt: 'Tidak terdapat ketidakpastian material. Penggunaan dasar kelangsungan usaha oleh manajemen dinilai tepat — opini standar (unmodified).' };

  // Altman Z proxy
  const z = (1.2 * 0.18 + 1.4 * 0.31 + 3.3 * 0.11 + 0.6 * 1.03 + 1.0 * 1.05).toFixed(2);

  return (
    <>
      <SubBar moduleId="goingconcern" right={
        <div className="row gap8 ac">
          <Badge kind="blue">SA 570</Badge>
          <Btn sm><I.download size={13} /> Memo Going Concern</Btn>
          <Btn sm variant="primary"><I.check size={14} /> Simpulkan</Btn>
        </div>
      } />
      <div className="view-scroll">
        <div className="view-pad">
          {/* verdict banner */}
          <Panel noBody style={{ marginBottom: 12, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'stretch' }}>
              <div style={{ width: 6, background: `var(--${level.k === 'red' ? 'red' : level.k === 'amber' ? 'amber' : 'green'})` }} />
              <div style={{ padding: '13px 16px', flex: 1 }}>
                <div className="row ac gap8" style={{ marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>Penilaian Kelangsungan Usaha</span>
                  <Badge kind={level.k}>{level.l}</Badge>
                  <span className="tiny muted">· {triggered} indikator aktif · {ratioFlags} rasio di bawah ambang</span>
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.5, maxWidth: 880 }}>{level.txt}</div>
              </div>
              <div style={{ padding: '13px 18px', borderLeft: '1px solid var(--line)', textAlign: 'center', display: 'grid', placeItems: 'center' }}>
                <div className="tiny muted upper">Altman Z-Score</div>
                <div className="mono" style={{ fontSize: 24, fontWeight: 700, color: z > 2.99 ? 'var(--green)' : z > 1.8 ? 'var(--amber)' : 'var(--red)' }}>{z}</div>
                <div className="tiny muted">{z > 2.99 ? 'Safe zone' : z > 1.8 ? 'Grey zone' : 'Distress'}</div>
              </div>
            </div>
          </Panel>

          {/* ratios grid */}
          <div className="grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 12 }}>
            {GC_RATIOS.map(r => {
              const st = r.good(r.value) ? 'green' : r.warn(r.value) ? 'amber' : 'red';
              const improving = r.invert ? r.value < r.py : r.value > r.py;
              return (
                <Panel key={r.id} noBody>
                  <div style={{ padding: '11px 13px' }}>
                    <div className="row jb ac" style={{ marginBottom: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-2)' }}>{r.label}</span>
                      <span className={'badge b-' + st} style={{ padding: '1px 6px' }}>{st === 'green' ? 'OK' : st === 'amber' ? 'Pantau' : 'Risiko'}</span>
                    </div>
                    <div className="row jb" style={{ alignItems: 'flex-end' }}>
                      <div>
                        <span className="mono" style={{ fontSize: 23, fontWeight: 700, color: 'var(--navy)' }}>{r.value.toFixed(2)}{r.unit}</span>
                        <div className="tiny muted" style={{ marginTop: 2 }}>
                          PY {r.py.toFixed(2)}{r.unit} · <span style={{ color: improving ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>{improving ? '▲ membaik' : '▼ menurun'}</span>
                        </div>
                      </div>
                      <Spark data={r.trend} width={92} height={34} color={st === 'green' ? '#1f7a4d' : st === 'amber' ? '#c79a1e' : '#b3261e'} />
                    </div>
                    <div className="tiny muted" style={{ marginTop: 7, paddingTop: 7, borderTop: '1px solid var(--line-soft)' }}>{r.hint}</div>
                  </div>
                </Panel>
              );
            })}
          </div>

          {/* cash flow projection + stress test */}
          <div className="grid" style={{ gridTemplateColumns: '300px 1fr', gap: 12, marginBottom: 12, alignItems: 'start' }}>
            <Panel title="Stress Test" sub="Skenario 12 bulan ke depan">
              <div style={{ marginBottom: 14 }}>
                <div className="row jb ac" style={{ marginBottom: 4 }}><span style={{ fontSize: 12, fontWeight: 600 }}>Penurunan Pendapatan</span><span className="mono" style={{ fontWeight: 700, color: revShock > 0 ? 'var(--red)' : 'var(--ink)' }}>−{revShock}%</span></div>
                <input type="range" min="0" max="40" value={revShock} onChange={e => setRevShock(+e.target.value)} style={{ width: '100%', accentColor: 'var(--red)' }} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <div className="row jb ac" style={{ marginBottom: 4 }}><span style={{ fontSize: 12, fontWeight: 600 }}>Efisiensi Biaya (mitigasi)</span><span className="mono" style={{ fontWeight: 700, color: costCut > 0 ? 'var(--green)' : 'var(--ink)' }}>−{costCut}%</span></div>
                <input type="range" min="0" max="25" value={costCut} onChange={e => setCostCut(+e.target.value)} style={{ width: '100%', accentColor: 'var(--green)' }} />
              </div>
              <label className="row ac gap8" style={{ cursor: 'pointer', fontSize: 12, marginBottom: 12 }}>
                <span onClick={() => setFinancing(f => !f)} style={{ width: 36, height: 20, borderRadius: 11, background: financing ? 'var(--green)' : 'var(--line-strong)', position: 'relative', transition: '.15s', flex: '0 0 36px' }}><span style={{ position: 'absolute', top: 2, left: financing ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff' }} /></span>
                Refinancing utang tersedia (Jun & Des)
              </label>
              <div className="divider" />
              <div style={{ display: 'grid', gap: 6 }}>
                <RowKv label="Kas terendah (12 bln)" v={'Rp ' + minBal.toFixed(1) + ' M'} strong />
                <RowKv label="Bulan defisit pertama" v={breach ? breach.m : 'Tidak ada'} />
              </div>
              <div className="panel" style={{ marginTop: 10, padding: '9px 11px', background: breach ? 'var(--red-bg)' : minBal < 5 ? 'var(--amber-bg)' : 'var(--green-bg)', borderColor: 'transparent' }}>
                <div className="row ac gap8"><span style={{ color: breach ? 'var(--red)' : minBal < 5 ? 'var(--amber)' : 'var(--green)' }}>{breach ? <I.alert size={15} /> : <I.checkCircle size={15} />}</span>
                  <span style={{ fontSize: 11.5, lineHeight: 1.4 }}>{breach ? `Proyeksi kas negatif pada ${breach.m} — indikasi material uncertainty.` : minBal < 5 ? 'Likuiditas menipis namun tetap positif — pantau ketat.' : 'Proyeksi kas tetap positif sepanjang 12 bulan.'}</span>
                </div>
              </div>
            </Panel>

            <Panel title="Proyeksi Arus Kas 12 Bulan" sub="dalam miliar Rupiah">
              {/* bar chart of ending balance */}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 120, padding: '14px 0 4px', borderBottom: '1px solid var(--line)' }}>
                {projection.map((r, i) => {
                  const h = Math.abs(r.bal) / minBar * 95;
                  const neg = r.bal < 0;
                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }} title={r.m + ': Rp ' + r.bal.toFixed(1) + ' M'}>
                      <span className="mono" style={{ fontSize: 8.5, color: neg ? 'var(--red)' : 'var(--ink-3)', marginBottom: 2 }}>{r.bal.toFixed(0)}</span>
                      <div style={{ width: '78%', height: Math.max(2, h), background: neg ? 'var(--red)' : r.bal < 5 ? 'var(--amber)' : 'var(--blue)', borderRadius: '3px 3px 0 0' }} />
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', gap: 5, marginTop: 3 }}>
                {projection.map((r, i) => <div key={i} style={{ flex: 1, textAlign: 'center' }} className="tiny muted">{r.m}</div>)}
              </div>
              <div className="tiny muted" style={{ marginTop: 8 }}>Saldo kas akhir bulan proyeksi · jatuh tempo utang bullet Rp 8 M pada Jun & Des {financing ? '(di-refinancing)' : '(tanpa refinancing)'}.</div>
            </Panel>
          </div>

          {/* indicators checklist */}
          <Panel title="Daftar Indikator (SA 570 ¶A3)" sub="Aktifkan indikator yang teridentifikasi — penilaian otomatis menyesuaikan">
            <div className="grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', gap: 0 }}>
              {Object.entries(inds).map(([cat, items], ci) => (
                <div key={cat} style={{ padding: '4px 14px 10px', borderLeft: ci ? '1px solid var(--line-soft)' : 0 }}>
                  <div className="upper tiny" style={{ fontWeight: 700, color: 'var(--blue)', margin: '8px 0 6px' }}>{cat}</div>
                  {items.map(it => (
                    <label key={it.id} className="row gap8" style={{ padding: '7px 0', cursor: 'pointer', alignItems: 'flex-start', borderBottom: '1px solid var(--line-soft)' }}>
                      <span onClick={() => toggle(cat, it.id)} style={{ flex: '0 0 17px', width: 17, height: 17, borderRadius: 4, marginTop: 1, border: '1.5px solid ' + (it.on ? 'var(--red)' : 'var(--line-strong)'), background: it.on ? 'var(--red)' : '#fff', display: 'grid', placeItems: 'center' }}>
                        {it.on && <I.check size={12} style={{ color: '#fff' }} />}
                      </span>
                      <span style={{ fontSize: 12, lineHeight: 1.4, color: it.on ? 'var(--ink)' : 'var(--ink-3)' }} onClick={() => toggle(cat, it.id)}>{it.label}</span>
                    </label>
                  ))}
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { GoingConcern });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { GoingConcern };
