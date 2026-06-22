/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { I } from './icons';
import { SubBar } from './shell';
import { Avatar, Badge, Btn, Panel, Seg, Stat } from './ui';

/* ============================================================
   Asseris — Capacity Planning (Practice Operations · D+)
   Proyeksi pasokan vs kebutuhan 8 minggu + heatmap per orang.
   ============================================================ */
const { useState: useStateCap, useMemo: useMemoCap } = React;

const CAP_GRADE_COLOR = { Partner: 'var(--purple)', Manager: 'var(--blue)', Senior: 'var(--teal)', Junior: 'var(--amber)' };
function capCell(v, leave) {
  if (leave && v === 0) return { bg: 'repeating-linear-gradient(45deg,#eef1f4 0 5px,#e3e7ec 5px 10px)', fg: 'var(--ink-4)' };
  if (v === 0) return { bg: 'var(--surface-2)', fg: 'var(--ink-4)' };
  if (v > 100) return { bg: 'var(--red)', fg: '#fff' };
  if (v >= 92) return { bg: '#d98a3d', fg: '#fff' };
  if (v >= 75) return { bg: '#2f8a57', fg: '#fff' };
  if (v >= 55) return { bg: '#9fd2b4', fg: '#0f3d24' };
  return { bg: '#cfe6f5', fg: '#0a4063' };
}

function CapacityPlanning() {
  const { fmt, CAPACITY } = AMS;
  const { weeks, grades, staff, pipeline } = CAPACITY as any;
  const [grade, setGrade] = useStateCap('Semua');
  const [hover, setHover] = useStateCap(null);

  // selected series
  const series = useMemoCap(() => {
    const supply = weeks.map((_, i) => (grade === 'Semua' ? grades.reduce((s, g) => s + g.supply[i], 0) : (grades.find(g => g.grade === grade)?.supply[i] || 0)));
    const demand = weeks.map((_, i) => (grade === 'Semua' ? grades.reduce((s, g) => s + g.demand[i], 0) : (grades.find(g => g.grade === grade)?.demand[i] || 0)));
    return { supply, demand };
  }, [grade]);

  const maxScale = Math.max(...series.supply, ...series.demand) * 1.12;
  const totSup = series.supply.reduce((a, b) => a + b, 0);
  const totDem = series.demand.reduce((a, b) => a + b, 0);
  const avgUtil = totSup ? totDem / totSup * 100 : 0;
  const deficitWeeks = weeks.filter((_, i) => series.demand[i] > series.supply[i]).length;
  const benchNext4 = weeks.slice(0, 4).reduce((s, _, i) => s + Math.max(0, series.supply[i] - series.demand[i]), 0);
  const pipeProb = pipeline.reduce((s, p) => s + p.hrs * p.prob / 100, 0);

  const staffShown = grade === 'Semua' ? staff : staff.filter(s => s.grade === grade);
  const utilColor = (v) => v > 100 ? 'var(--red)' : v >= 75 ? 'var(--green)' : 'var(--amber)';

  return (
    <>
      <SubBar moduleId="capacity" right={
        <div className="row gap8 ac">
          <Seg options={['Semua', 'Partner', 'Manager', 'Senior', 'Junior']} value={grade} onChange={setGrade} />
          <Btn sm><I.calendar size={13} /> 8 minggu</Btn>
        </div>
      } />
      <div className="view-scroll"><div className="view-pad">
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={fmt(avgUtil, 0) + '%'} label="Utilisasi Proyeksi" accent={utilColor(avgUtil)} /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={deficitWeeks} label="Minggu Defisit Kapasitas" accent={deficitWeeks ? 'var(--red)' : 'var(--green)'} /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={fmt(benchNext4) + 'h'} label="Bench 4 Minggu Depan" accent="var(--blue)" /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={fmt(pipeProb) + 'h'} label="Demand Pipeline (tertimbang)" accent="var(--purple)" /></div></Panel>
        </div>

        {/* supply vs demand chart */}
        <Panel noBody style={{ marginBottom: 12 }}>
          <div className="panel-h"><h3>Pasokan vs Kebutuhan — {grade}</h3><div style={{ flex: 1 }} />
            <div className="row gap10 ac">
              <span className="row ac gap6"><span style={{ width: 14, height: 9, borderRadius: 2, border: '1.5px dashed var(--ink-4)' }} /><span className="tiny muted">Kapasitas</span></span>
              <span className="row ac gap6"><span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--blue)' }} /><span className="tiny muted">Kebutuhan</span></span>
            </div>
          </div>
          <div style={{ padding: '16px 16px 12px' }}>
            <div className="row" style={{ alignItems: 'flex-end', gap: 10, height: 180 }}>
              {weeks.map((wk, i) => {
                const sup = series.supply[i], dem = series.demand[i];
                const util = sup ? dem / sup * 100 : 0;
                const over = dem > sup;
                const demH = dem / maxScale * 100, supH = sup / maxScale * 100;
                return (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}
                    onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(h => h === i ? null : h)}>
                    <div className="mono tiny" style={{ fontWeight: 700, color: over ? 'var(--red)' : 'var(--ink-3)', marginBottom: 3 }}>{fmt(util, 0)}%</div>
                    <div style={{ flex: 1, width: '100%', position: 'relative', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                      <div style={{ width: '58%', height: demH + '%', minHeight: 2, background: over ? 'var(--red)' : util >= 75 ? 'var(--blue)' : '#9cc4e0', borderRadius: '3px 3px 0 0', transition: '.2s', opacity: hover == null || hover === i ? 1 : .55 }} />
                      {/* capacity tick */}
                      <div style={{ position: 'absolute', bottom: supH + '%', left: '12%', right: '12%', borderTop: '2px dashed var(--ink-4)' }} />
                    </div>
                    <div className="tiny muted" style={{ marginTop: 6, fontSize: 10 }}>{wk}</div>
                  </div>
                );
              })}
            </div>
            <div className="row jb" style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--line-soft)' }}>
              <span className="tiny muted">Total kebutuhan <b style={{ color: 'var(--ink-2)' }}>{fmt(totDem)}h</b> · kapasitas <b style={{ color: 'var(--ink-2)' }}>{fmt(totSup)}h</b></span>
              <span className="tiny" style={{ fontWeight: 600, color: totDem > totSup ? 'var(--red)' : 'var(--green)' }}>{totDem > totSup ? 'Defisit ' + fmt(totDem - totSup) + 'h' : 'Surplus ' + fmt(totSup - totDem) + 'h'} pada horizon 8 minggu</span>
            </div>
          </div>
        </Panel>

        {/* per-staff heatmap */}
        <Panel noBody style={{ marginBottom: 12 }}>
          <div className="panel-h"><h3>Proyeksi Utilisasi per Orang</h3><div style={{ flex: 1 }} /><span className="tiny muted">% beban vs kapasitas · arsir = cuti</span></div>
          <div style={{ overflowX: 'auto' }}>
            <table className="dtbl" style={{ minWidth: 720 }}>
              <thead>
                <tr><th style={{ minWidth: 168 }}>Anggota</th>{weeks.map((w, i) => <th key={i} className="num" style={{ textAlign: 'center' }}>{w}</th>)}<th className="num">Rata²</th></tr>
              </thead>
              <tbody>
                {staffShown.map(s => {
                  const valid = s.forecast.filter(v => v > 0);
                  const avg = valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : 0;
                  return (
                    <tr key={s.name}>
                      <td><div className="row ac gap8"><Avatar name={s.name} size={22} /><div style={{ minWidth: 0 }}><div className="truncate" style={{ fontWeight: 600, fontSize: 12 }}>{s.name}</div><div className="tiny muted" style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 7, height: 7, borderRadius: 2, background: CAP_GRADE_COLOR[s.grade] }} />{s.grade}</div></div></div></td>
                      {s.forecast.map((v, i) => {
                        const cc = capCell(v, s.leave);
                        return <td key={i} style={{ textAlign: 'center', padding: '3px 4px' }}><div style={{ background: cc.bg, color: cc.fg, fontFamily: 'var(--mono)', fontSize: 10.5, fontWeight: 700, borderRadius: 4, height: 22, display: 'grid', placeItems: 'center' }}>{s.leave && v === 0 ? 'cuti' : v + '%'}</div></td>;
                      })}
                      <td className="num" style={{ fontWeight: 700, color: utilColor(avg) }}>{fmt(avg, 0)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>

        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }}>
          <Panel title="Demand Pipeline" sub="kebutuhan dari peluang">
            <div style={{ display: 'grid', gap: 8 }}>
              {pipeline.map((p, i) => (
                <div key={i} className="panel" style={{ padding: '9px 11px', background: 'var(--surface-2)', borderColor: 'transparent' }}>
                  <div className="row jb ac">
                    <span className="truncate" style={{ fontSize: 12, fontWeight: 600 }}>{p.name.replace('PT ', '')}</span>
                    <Badge kind={p.prob >= 70 ? 'green' : 'amber'}>{p.prob}%</Badge>
                  </div>
                  <div className="tiny muted" style={{ marginTop: 3 }}>{p.service} · mulai {new Date(p.start).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })} · <b style={{ color: 'var(--ink-2)' }}>{p.hrs}h/mgg</b></div>
                </div>
              ))}
              <div className="tiny muted" style={{ paddingTop: 2 }}>Kebutuhan tertimbang pipeline: <b style={{ color: 'var(--purple)' }}>{fmt(pipeProb)}h/mgg</b> — pertimbangkan dalam alokasi.</div>
            </div>
          </Panel>

          <Panel title="Rekomendasi Kapasitas">
            <div style={{ display: 'grid', gap: 8 }}>
              {grades.map(g => {
                const peak = Math.max(...g.demand.map((d, i) => d - g.supply[i]));
                const peakWk = g.demand.findIndex((d, i) => d - g.supply[i] === peak);
                if (peak > 0) return (
                  <div key={g.grade} className="panel" style={{ padding: '9px 11px', background: 'var(--red-bg)', borderColor: 'transparent' }}>
                    <div className="row ac gap8"><span style={{ color: 'var(--red)' }}><I.alert size={15} /></span><span className="tiny" style={{ fontWeight: 600 }}>Defisit <b>{g.grade}</b> puncak {fmt(peak)}h pada minggu <b>{weeks[peakWk]}</b> — geser jadwal non-kritis / tambah staf sementara.</span></div>
                  </div>
                );
                const slack = Math.min(...g.supply.map((s, i) => s - g.demand[i]));
                return (
                  <div key={g.grade} className="panel" style={{ padding: '9px 11px', background: 'var(--green-bg)', borderColor: 'transparent' }}>
                    <div className="row ac gap8"><span style={{ color: 'var(--green)' }}><I.checkCircle size={15} /></span><span className="tiny" style={{ fontWeight: 600 }}><b>{g.grade}</b> seimbang — kapasitas cadangan ≥ {fmt(Math.max(0, slack))}h/mgg untuk pipeline.</span></div>
                  </div>
                );
              })}
            </div>
          </Panel>
        </div>
      </div></div>
    </>
  );
}

Object.assign(window, { CapacityPlanning });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { CapacityPlanning };
