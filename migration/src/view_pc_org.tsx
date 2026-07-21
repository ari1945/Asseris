/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { useAuth, useNav } from './contexts';
import { CAP } from './rbac';
import { I } from './icons';
import { SubBar } from './shell';
import { AccessDenied, Avatar, Badge, Btn, Donut, Panel, Seg, Stat, Tabs } from './ui';
import { KvBox } from './view_analytical';
import { amsExportXlsx } from './export_xlsx';

/* ============================================================
   Asseris — People & Compliance (NEW)
   Struktur Organisasi (Org Chart)  ·  Perencanaan Suksesi & Karier
   ============================================================ */
const { useState: usePCorg } = React;

const ORG_TREE_CSS = `
.org-tree{ text-align:center; }
.org-tree ul{ padding-top:18px; position:relative; transition:.2s; display:flex; justify-content:center; }
.org-tree li{ list-style:none; position:relative; padding:18px 8px 0 8px; }
.org-tree li::before, .org-tree li::after{ content:''; position:absolute; top:0; right:50%; border-top:1.5px solid var(--line-strong); width:50%; height:18px; }
.org-tree li::after{ right:auto; left:50%; border-left:1.5px solid var(--line-strong); }
.org-tree li:only-child::after, .org-tree li:only-child::before{ display:none; }
.org-tree li:only-child{ padding-top:0; }
.org-tree li:first-child::before, .org-tree li:last-child::after{ border:0 none; }
.org-tree li:last-child::before{ border-right:1.5px solid var(--line-strong); border-radius:0 6px 0 0; }
.org-tree li:first-child::after{ border-radius:6px 0 0 0; }
.org-tree ul ul::before{ content:''; position:absolute; top:0; left:50%; border-left:1.5px solid var(--line-strong); width:0; height:18px; }
.org-tree > ul{ padding-top:0; }
.org-node{ display:inline-flex; flex-direction:column; align-items:center; gap:5px; border:1px solid var(--line); border-top:3px solid var(--g); background:var(--surface); border-radius:9px; padding:10px 12px 9px; min-width:138px; box-shadow:var(--shadow-sm); cursor:pointer; transition:.12s; }
.org-node:hover{ box-shadow:var(--shadow); transform:translateY(-1px); }
.org-node.sel{ outline:2px solid var(--navy); }
`;

function OrgChart() {
  const nav = useNav();
  const A: any = AMS;
  const staff = A.STAFF, ORG = A.ORG, GC = A.GRADE_COLOR_PC;
  const [view, setView] = usePCorg('chart');
  const [sel, setSel] = usePCorg('EMP-001');

  const childrenOf = (id: any) => staff.filter((s: any) => (ORG[s.id] || {}).reports === id);
  const directReports = (id: any) => childrenOf(id).length;
  const spanAll = (id: any) => { let n = 0; const walk = (x: any) => childrenOf(x).forEach((c: any) => { n++; walk(c.id); }); walk(id); return n; };
  const person = staff.find((s: any) => s.id === sel) || staff[0];
  const mgr = (ORG[sel] || {}).reports ? A.byId(ORG[sel].reports) : null;

  const Node = ({ s }: any) => {
    const kids = childrenOf(s.id);
    return (
      <li>
        <span className={'org-node ' + (s.id === sel ? 'sel' : '')} style={{ '--g': GC[s.grade] }} onClick={() => setSel(s.id)}>
          <Avatar name={s.name} size={34} />
          <div style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.15 }}>{s.name}</div>
          <div className="tiny muted" style={{ lineHeight: 1.1 }}>{s.role}</div>
          <span className="badge" style={{ background: GC[s.grade] + '1a', color: GC[s.grade], fontSize: 9.5, padding: '0 6px' }}>{s.grade}</span>
          {kids.length > 0 && <span className="tiny" style={{ color: 'var(--ink-4)' }}>{kids.length} bawahan langsung</span>}
        </span>
        {kids.length > 0 && <ul>{kids.map((k: any) => <Node key={k.id} s={k} />)}</ul>}
      </li>
    );
  };

  const depts = Object.keys(A.DEPT_HEAD);
  const deptRows = depts.map(d => {
    const members = staff.filter((s: any) => (ORG[s.id] || {}).dept === d);
    const head = A.byId(A.DEPT_HEAD[d]);
    return { d, members, head };
  });

  const onExport = async () => {
    const rosterRows: (string | number)[][] = [];
    for (const s of staff) {
      const rep = (ORG[s.id] || {}).reports;
      const mgrP = rep ? A.byId(rep) : null;
      rosterRows.push([s.id, s.name, s.role, s.grade, (ORG[s.id] || {}).dept || '—', mgrP ? mgrP.name : 'Puncak', directReports(s.id), spanAll(s.id)]);
    }
    await amsExportXlsx({
      kind: 'firm-orgchart', scope: 'firm',
      fileName: 'Struktur Organisasi.xlsx',
      firm: A.FIRM.short || 'KAP',
      title: 'Struktur Organisasi & Rentang Kendali',
      meta: [`${A.FIRM.partners + A.FIRM.managers + A.FIRM.staff} headcount · ${depts.length} divisi · rasio staf:manajer ${(A.FIRM.staff / A.FIRM.managers).toFixed(1)}`],
      sheets: [{ name: 'Roster', columns: ['ID', 'Nama', 'Jabatan', 'Jenjang', 'Divisi', 'Atasan', 'Bawahan Langsung', 'Total Bawahan'], rows: rosterRows, colWidths: [10, 26, 26, 12, 20, 20, 16, 14] }],
    });
  };

  return (
    <>
      <SubBar moduleId="orgchart" right={<div className="row gap8 ac">
        <Seg options={[{ value: 'chart', label: 'Bagan' }, { value: 'dept', label: 'Divisi' }, { value: 'span', label: 'Rentang Kendali' }]} value={view} onChange={setView} />
        <Btn sm onClick={onExport}><I.download size={13} /> Ekspor</Btn>
      </div>} />
      <div className="view-scroll"><div className="view-pad">
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={A.FIRM.partners + A.FIRM.managers + A.FIRM.staff} label="Total Headcount" /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={depts.length} label="Divisi / Unit" /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={A.FIRM.partners} label="Rekan (Partner)" accent="var(--navy)" /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={(A.FIRM.staff / A.FIRM.managers).toFixed(1)} label="Rasio Staf : Manajer" accent="var(--blue)" /></div></Panel>
        </div>

        <div className="grid" style={{ gridTemplateColumns: view === 'chart' ? '1fr 320px' : '1fr', gap: 12, alignItems: 'start' }}>
          <Panel noBody>
            <div className="panel-h"><h3>{view === 'chart' ? 'Bagan Organisasi' : view === 'dept' ? 'Struktur Divisi & Unit' : 'Rentang Kendali (Span of Control)'}</h3><div style={{ flex: 1 }} /><span className="tiny muted">{A.FIRM.short} · {A.FIRM.license}</span></div>

            {view === 'chart' && (
              <div style={{ padding: '22px 14px', overflowX: 'auto' }}>
                <style>{ORG_TREE_CSS}</style>
                <div className="org-tree"><ul>{staff.filter((s: any) => !(ORG[s.id] || {}).reports).map((r: any) => <Node key={r.id} s={r} />)}</ul></div>
              </div>
            )}

            {view === 'dept' && (
              <div style={{ padding: 14, display: 'grid', gap: 12 }}>
                {deptRows.map(({ d, members, head }) => (
                  <div key={d} className="panel" style={{ padding: 0, boxShadow: 'none' }}>
                    <div className="row ac jb" style={{ padding: '9px 12px', background: 'var(--surface-2)', borderBottom: '1px solid var(--line)' }}>
                      <div className="row ac gap8"><span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--navy)' }} /><b style={{ fontSize: 13 }}>{d}</b><span className="tiny muted">· dipimpin {head.name}</span></div>
                      <Badge kind="blue">{members.length} anggota</Badge>
                    </div>
                    <div style={{ padding: 10, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {members.map((m: any) => (
                        <div key={m.id} className="row ac gap8" onClick={() => setSel(m.id)} style={{ cursor: 'pointer', border: '1px solid var(--line-soft)', borderRadius: 8, padding: '6px 10px', minWidth: 190 }}>
                          <Avatar name={m.name} size={26} />
                          <div style={{ minWidth: 0 }}><div className="truncate" style={{ fontWeight: 600, fontSize: 12 }}>{m.name}</div><div className="tiny muted">{m.role}</div></div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {view === 'span' && (
              <table className="dtbl">
                <thead><tr><th>Manajer / Atasan</th><th>Jenjang</th><th className="num">Bawahan Langsung</th><th className="num">Total Bawahan</th><th style={{ width: 150 }}>Beban Supervisi</th></tr></thead>
                <tbody>
                  {staff.filter((s: any) => directReports(s.id) > 0).sort((a: any, b: any) => spanAll(b.id) - spanAll(a.id)).map((s: any) => {
                    const dr = directReports(s.id), sp = spanAll(s.id);
                    const col = dr > 4 ? 'var(--amber)' : 'var(--green)';
                    return (
                      <tr key={s.id} className={s.id === sel ? 'sel' : ''} onClick={() => setSel(s.id)} style={{ cursor: 'pointer' }}>
                        <td><div className="row ac gap8"><Avatar name={s.name} size={24} /><span style={{ fontWeight: 600 }}>{s.name}</span></div></td>
                        <td><span className="badge" style={{ background: GC[s.grade] + '1a', color: GC[s.grade] }}>{s.grade}</span></td>
                        <td className="num mono" style={{ fontWeight: 700, color: col }}>{dr}</td>
                        <td className="num mono">{sp}</td>
                        <td><div style={{ height: 6, borderRadius: 3, background: 'var(--surface-3)' }}><div style={{ width: Math.min(100, dr / 6 * 100) + '%', height: '100%', borderRadius: 3, background: col }} /></div></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </Panel>

          {view === 'chart' && (
            <Panel noBody>
              <div style={{ background: 'linear-gradient(120deg,#013a52,#005085)', color: '#fff', padding: '16px 16px', display: 'flex', gap: 12, alignItems: 'center' }}>
                <Avatar name={person.name} size={44} />
                <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 14, fontWeight: 700 }} className="truncate">{person.name}</div><div className="tiny" style={{ color: '#bcd6e4' }}>{person.role}</div></div>
              </div>
              <div style={{ padding: 14 }}>
                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                  <KvBox label="Divisi" v={(ORG[sel] || {}).dept || '—'} />
                  <KvBox label="Atasan" v={mgr ? mgr.name.split(' ')[0] : 'Puncak'} />
                  <KvBox label="Bawahan Langsung" v={directReports(sel)} />
                  <KvBox label="Total Bawahan" v={spanAll(sel)} />
                </div>
                {mgr && (
                  <>
                    <div className="tiny muted upper" style={{ marginBottom: 6 }}>Garis Pelaporan</div>
                    <div className="row ac gap6" style={{ marginBottom: 12, flexWrap: 'wrap' }}>
                      <span className="chip tiny">{A.byId('EMP-001').name.split(' ')[0]}</span>
                      {mgr.id !== 'EMP-001' && <><I.chevron size={12} style={{ color: 'var(--ink-4)' }} /><span className="chip tiny">{mgr.name.split(' ')[0]}</span></>}
                      <I.chevron size={12} style={{ color: 'var(--ink-4)' }} /><span className="chip tiny" style={{ background: 'var(--navy)', color: '#fff' }}>{person.name.split(' ')[0]}</span>
                    </div>
                  </>
                )}
                <div className="row gap8">
                  <Btn sm style={{ flex: 1 }} onClick={() => nav('hcm')}><I.users size={13} /> Profil 360°</Btn>
                  <Btn sm style={{ flex: 1 }} onClick={() => nav('succession')}><I.target size={13} /> Suksesi</Btn>
                </div>
              </div>
            </Panel>
          )}
        </div>
      </div></div>
    </>
  );
}

/* ============================================================
   Perencanaan Suksesi & Karier
   ============================================================ */
function SuccessionPlanning() {
  const A: any = AMS;
  const nav = useNav();
  const authSucc = useAuth();
  const [tab, setTab] = usePCorg('map');
  const [sel, setSel] = usePCorg('SR-01');
  const ROLES = A.SUCCESSION_ROLES, LADDER = A.CAREER_LADDER, IDP = A.IDP, RC = A.READY_COLOR;

  const role = ROLES.find((r: any) => r.id === sel) || ROLES[0];
  const inc = A.byId(role.incumbent);
  const readyNow = ROLES.filter((r: any) => r.successors.some((s: any) => s.readiness === 'Siap sekarang')).length;
  const atRisk = ROLES.filter((r: any) => r.riskOfLoss !== 'Rendah').length;
  const noReady = ROLES.filter((r: any) => !r.successors.length).length;
  const RISK_C = { Rendah: 'var(--green)', Sedang: 'var(--amber)', Tinggi: 'var(--red)' };

  const tabs = [{ id: 'map', label: 'Peta Suksesi' }, { id: 'ladder', label: 'Jenjang Karier' }, { id: 'idp', label: 'Rencana Pengembangan' }];

  // 2026-07-05 — suksesi & karier = data SDM sensitif: hanya Partner + Admin & HR (HR_MODULE_VIEW).
  if (!(authSucc && typeof authSucc.can === 'function' && authSucc.can(CAP.HR_MODULE_VIEW))) return (<><SubBar moduleId="succession" /><AccessDenied moduleId="succession" /></>);

  const onExport = async () => {
    const roleRows: (string | number)[][] = [];
    for (const r of ROLES) { const ic = A.byId(r.incumbent); roleRows.push([r.role, ic ? ic.name : '', r.critical, r.riskOfLoss, r.vacancyImpact, r.successors.length]); }
    const succRows: (string | number)[][] = [];
    for (const r of ROLES) for (const s of r.successors) { const p = A.byId(s.id); succRows.push([r.role, p ? p.name : '', p ? p.role : '', s.readiness, s.gaps]); }
    await amsExportXlsx({
      kind: 'firm-succession', scope: 'firm',
      fileName: 'Laporan Suksesi.xlsx',
      firm: A.FIRM.short || 'KAP',
      title: 'Perencanaan Suksesi & Karier',
      meta: [`${ROLES.length} peran kunci · ${readyNow} punya penerus siap · ${atRisk} risiko kehilangan · ${noReady} tanpa penerus`],
      sheets: [
        { name: 'Peran Kunci', columns: ['Peran', 'Pemangku', 'Kritikalitas', 'Risiko Kehilangan', 'Dampak Kekosongan', 'Jumlah Penerus'], rows: roleRows, colWidths: [28, 22, 16, 18, 18, 14] },
        { name: 'Kandidat Penerus', columns: ['Peran', 'Kandidat', 'Jabatan', 'Kesiapan', 'Gap'], rows: succRows, colWidths: [28, 22, 22, 16, 40] },
      ],
    });
  };

  return (
    <>
      <SubBar moduleId="succession" right={<div className="row gap8 ac"><Badge kind="blue">{ROLES.length} peran kunci</Badge><Btn sm onClick={onExport}><I.download size={13} /> Laporan Suksesi</Btn></div>} />
      <div className="view-scroll"><div className="view-pad">
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={ROLES.length} label="Peran Kunci Dipetakan" /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={readyNow + '/' + ROLES.length} label="Punya Penerus Siap" accent="var(--green)" /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={atRisk} label="Risiko Kehilangan" accent="var(--amber)" /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={noReady} label="Tanpa Penerus" accent={noReady ? 'var(--red)' : 'var(--green)'} /></div></Panel>
        </div>

        <Panel noBody className="" >
          <div className="panel-h" style={{ padding: 0, background: 'var(--surface-2)' }}><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>

          {tab === 'map' && (
            <div className="grid" style={{ gridTemplateColumns: '1.3fr 1fr', gap: 0 }}>
              <table className="dtbl" style={{ borderRight: '1px solid var(--line)' }}>
                <thead><tr><th>Peran Kunci</th><th>Pemangku</th><th>Risiko</th><th className="num">Penerus</th></tr></thead>
                <tbody>
                  {ROLES.map((r: any) => {
                    const ic = A.byId(r.incumbent);
                    const hasReady = r.successors.some((s: any) => s.readiness === 'Siap sekarang');
                    return (
                      <tr key={r.id} className={r.id === sel ? 'sel' : ''} onClick={() => setSel(r.id)} style={{ cursor: 'pointer' }}>
                        <td><div style={{ fontWeight: 600, fontSize: 12.5 }}>{r.role}</div><div className="tiny muted">{r.critical} · dampak {r.vacancyImpact.toLowerCase()}</div></td>
                        <td><div className="row ac gap6"><Avatar name={ic.name} size={22} /><span className="tiny truncate" style={{ maxWidth: 90 }}>{ic.name}</span></div></td>
                        <td><Badge kind={r.riskOfLoss === 'Rendah' ? 'green' : r.riskOfLoss === 'Sedang' ? 'amber' : 'red'}>{r.riskOfLoss}</Badge></td>
                        <td className="num">{r.successors.length ? <span style={{ color: hasReady ? 'var(--green)' : 'var(--amber)', fontWeight: 700 }}>{r.successors.length}</span> : <Badge kind="red">0</Badge>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div style={{ padding: 14 }}>
                <div className="tiny muted upper" style={{ marginBottom: 4 }}>Peran</div>
                <div style={{ fontSize: 14.5, fontWeight: 700, marginBottom: 2 }}>{role.role}</div>
                <div className="row ac gap8" style={{ marginBottom: 12 }}>
                  <Avatar name={inc.name} size={30} />
                  <div><div style={{ fontWeight: 600, fontSize: 12.5 }}>{inc.name}</div><div className="tiny muted">Pemangku saat ini · {inc.role}</div></div>
                </div>
                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                  <KvBox label="Kritikalitas" v={role.critical} />
                  <KvBox label="Risiko Kehilangan" v={role.riskOfLoss} accent={(RISK_C as any)[role.riskOfLoss]} />
                </div>
                <div className="tiny muted upper" style={{ marginBottom: 8 }}>Kandidat Penerus ({role.successors.length})</div>
                <div style={{ display: 'grid', gap: 9 }}>
                  {role.successors.length ? role.successors.map((s: any, i: any) => {
                    const p = A.byId(s.id);
                    return (
                      <div key={i} className="panel" style={{ padding: '9px 11px', boxShadow: 'none' }}>
                        <div className="row ac jb" style={{ marginBottom: 4 }}>
                          <div className="row ac gap8"><Avatar name={p.name} size={26} /><div><div style={{ fontWeight: 600, fontSize: 12 }}>{p.name}</div><div className="tiny muted">{p.role}</div></div></div>
                          <span className="badge" style={{ background: 'transparent', color: RC[s.readiness] || 'var(--ink-3)', border: '1px solid currentColor', fontSize: 10 }}>{s.readiness}</span>
                        </div>
                        <div className="tiny muted">Gap: {s.gaps}</div>
                      </div>
                    );
                  }) : <div className="panel" style={{ padding: 12, textAlign: 'center', boxShadow: 'none', background: 'var(--red-bg)', borderColor: 'transparent' }}><div className="tiny" style={{ fontWeight: 600 }}>Belum ada penerus — risiko kesinambungan. Identifikasi & kembangkan kandidat.</div></div>}
                </div>
                <Btn sm variant="primary" style={{ width: '100%', marginTop: 12 }} onClick={() => setTab('idp')}><I.target size={13} /> Lihat Rencana Pengembangan</Btn>
              </div>
            </div>
          )}

          {tab === 'ladder' && (
            <div style={{ padding: 16 }}>
              <div className="row" style={{ gap: 12, alignItems: 'stretch', overflowX: 'auto' }}>
                {LADDER.map((l: any, i: any) => (
                  <React.Fragment key={l.grade}>
                    <div className="panel" style={{ padding: 0, boxShadow: 'none', minWidth: 230, flex: 1 }}>
                      <div style={{ padding: '10px 13px', background: A.GRADE_COLOR_PC[l.grade], color: '#fff', borderRadius: '4px 4px 0 0' }}>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{l.grade}</div>
                        <div className="tiny" style={{ opacity: .85 }}>{l.years} · menuju {l.next}</div>
                      </div>
                      <div style={{ padding: 12 }}>
                        <div className="tiny muted upper" style={{ marginBottom: 6 }}>Kriteria Promosi</div>
                        <div style={{ display: 'grid', gap: 6 }}>
                          {l.criteria.map((c: any, j: any) => <div key={j} className="row ac gap6 tiny"><I.check size={12} style={{ color: 'var(--green)', flex: '0 0 auto' }} /><span style={{ lineHeight: 1.35 }}>{c}</span></div>)}
                        </div>
                      </div>
                    </div>
                    {i < LADDER.length - 1 && <div style={{ display: 'flex', alignItems: 'center', color: 'var(--ink-4)' }}><I.arrowRight size={18} /></div>}
                  </React.Fragment>
                ))}
              </div>
              <div className="tiny muted" style={{ marginTop: 12, lineHeight: 1.5 }}>Jenjang karier mengacu pada akumulasi jam audit, sertifikasi profesi (CA/CPA/AP), skor kinerja & pemenuhan PPL. Promosi ke Partner mensyaratkan izin Akuntan Publik untuk kewenangan tanda tangan opini.</div>
            </div>
          )}

          {tab === 'idp' && (
            <div style={{ padding: 14, display: 'grid', gap: 12 }}>
              {Object.keys(IDP).map(id => {
                const p = A.byId(id), plan = IDP[id];
                return (
                  <div key={id} className="panel" style={{ padding: 0, boxShadow: 'none' }}>
                    <div className="row ac jb" style={{ padding: '10px 13px', borderBottom: '1px solid var(--line)' }}>
                      <div className="row ac gap8"><Avatar name={p.name} size={30} /><div><div style={{ fontWeight: 700, fontSize: 13 }}>{p.name}</div><div className="tiny muted">{p.role} · Target: <b style={{ color: 'var(--purple)' }}>{plan.target}</b> · Sponsor {A.byId(plan.sponsor).name.split(' ')[0]}</div></div></div>
                      <div className="row ac gap8"><Donut size={42} thickness={7} segments={[{ value: plan.progress, color: 'var(--blue)' }, { value: 100 - plan.progress, color: '#e7ebef' }]} center={<span className="mono tiny" style={{ fontWeight: 700 }}>{plan.progress}%</span>} /></div>
                    </div>
                    <table className="dtbl">
                      <tbody>
                        {plan.actions.map((a: any, i: any) => (
                          <tr key={i}>
                            <td style={{ fontWeight: 500 }}>{a.a}</td>
                            <td style={{ width: 110 }}><Badge kind={a.s === 'Selesai' ? 'green' : a.s === 'Berjalan' ? 'amber' : 'gray'}>{a.s}</Badge></td>
                            <td className="tiny muted num" style={{ width: 90 }}>{a.due}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div></div>
    </>
  );
}

Object.assign(window, { OrgChart, SuccessionPlanning });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { OrgChart, SuccessionPlanning };
