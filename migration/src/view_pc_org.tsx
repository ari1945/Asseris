/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { readinessOf } from './canon_succession';
import { useAuth, useNav } from './contexts';
import { CAP } from './rbac';
import { I } from './icons';
import { SubBar } from './shell';
import { AccessDenied, Avatar, Badge, Btn, Donut, Panel, Seg, Stat, Tabs } from './ui';
import { orgDepartments, orgRoots, orgSpan, orgTree, orgUnreachable } from './org_structure';
import type { OrgNode, OrgSpan } from './org_structure';
import { refLabel, refResolver, successionBoard } from './succession_board';
import type { BoardSuccessor, PersonRef, RoleInput, RosterPerson } from './succession_board';
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
/* O1 — simpul bagan & kartu anggota divisi dulu <span onClick>/<div onClick>:
   tak fokusable, tak menanggapi Enter/Space, gagal gerbang axe. Kini <button>
   native; gaya tombol direset agar tampilan tak berubah, plus cincin fokus. */
.org-node{ display:inline-flex; flex-direction:column; align-items:center; gap:5px; border:1px solid var(--line); border-top:3px solid var(--g); background:var(--surface); border-radius:9px; padding:10px 12px 9px; min-width:138px; box-shadow:var(--shadow-sm); cursor:pointer; transition:.12s; font:inherit; color:inherit; text-align:center; }
.org-node:hover{ box-shadow:var(--shadow); transform:translateY(-1px); }
.org-node.sel{ outline:2px solid var(--navy); }
.org-node:focus-visible{ outline:2px solid var(--blue); outline-offset:2px; }
.org-member{ display:flex; align-items:center; gap:8px; min-width:190px; border:1px solid var(--line-soft); border-radius:8px; padding:6px 10px; background:var(--surface); font:inherit; color:inherit; text-align:left; cursor:pointer; transition:.12s; }
.org-member:hover{ border-color:var(--line-strong); }
.org-member.sel{ outline:2px solid var(--navy); }
.org-member:focus-visible{ outline:2px solid var(--blue); outline-offset:2px; }
.org-flag{ padding:10px 12px; border:1px solid var(--line); border-left:3px solid var(--amber); background:var(--amber-bg); border-radius:8px; }
`;

/* S3 — pola bersama DUA modul di berkas ini. Baris tabel dulu `<tr onClick>`:
   tidak fokusable, tidak menanggapi Enter/Space, sehingga interaksi utama kedua
   modul mustahil tanpa tetikus. Kini kontrol NATIVE di dalam sel pertama; gaya
   tombol direset agar tampilan tabel tak berubah, plus cincin fokus.
   `.pc-contra`/`.pc-missing` membawa peringatan yang dulu hanya berupa glyph. */
const PC_BTN_CSS = `
.pc-rowbtn{ display:flex; flex-direction:column; align-items:flex-start; gap:2px; width:100%; background:none; border:0; padding:0; margin:0; font:inherit; color:inherit; text-align:left; cursor:pointer; }
.pc-rowbtn:focus-visible{ outline:2px solid var(--blue); outline-offset:2px; border-radius:4px; }
.pc-contra{ border-left:3px solid var(--amber); background:var(--amber-bg); border-radius:6px; padding:7px 10px; }
.pc-contra ul{ margin:4px 0 0; padding-left:17px; }
.pc-contra li{ line-height:1.45; }
.pc-missing{ border-left:3px solid var(--red); background:var(--red-bg); border-radius:6px; padding:7px 10px; }
`;

type OrgPerson = { id: string; name: string; role: string; grade: string };

function OrgChart() {
  const nav = useNav();
  const A: any = AMS;
  const staff: OrgPerson[] = A.STAFF, ORG = A.ORG, GC = A.GRADE_COLOR_PC;
  const [view, setView] = usePCorg('chart');
  const [sel, setSel] = usePCorg('EMP-001');

  /* Seluruh derivasi struktur ada di `org_structure.ts` (murni, teruji di node):
     daftar divisi dari nilai `dept` yang BENAR-BENAR dipakai ORG — bukan dari
     daftar kepala divisi (O2); pemisahan puncak-organisasi-yang-sah dari
     belum-punya-atasan (O3); rentang kendali & pohon yang berakhir pada data
     bersiklus (O4). Tak ada salinan privat di berkas ini. */
  const { departments, tanpaDivisi } = orgDepartments<OrgPerson>(staff, ORG, A.DEPT_HEAD);
  const { puncak, tanpaAtasan } = orgRoots<OrgPerson>(staff, ORG);
  const span = orgSpan<OrgPerson>(staff, ORG);
  const tree = orgTree<OrgPerson>(staff, ORG, puncak);
  const takTerjangkau = orgUnreachable<OrgPerson>(staff, tree);
  const spanOf = (id: string): OrgSpan => span.get(id) || { direct: 0, total: 0 };
  const perluDibereskan = tanpaAtasan.length + takTerjangkau.length;

  const person = staff.find((s) => s.id === sel) || staff[0];
  const mgr = (ORG[sel] || {}).reports ? A.byId(ORG[sel].reports) : null;

  const PersonBtn = ({ p, note }: { p: OrgPerson; note?: string }) => (
    <button type="button" className={'org-member ' + (p.id === sel ? 'sel' : '')}
      aria-pressed={p.id === sel} title={'Pilih ' + p.name + ' — ' + p.role} onClick={() => setSel(p.id)}>
      <Avatar name={p.name} size={26} />
      <div style={{ minWidth: 0 }}>
        <div className="truncate" style={{ fontWeight: 600, fontSize: 12 }}>{p.name}</div>
        <div className="tiny muted">{note || p.role}</div>
      </div>
    </button>
  );

  const Node = ({ n }: { n: OrgNode<OrgPerson> }) => {
    const s = n.person;
    const dr = spanOf(s.id).direct;
    return (
      <li>
        <button type="button" className={'org-node ' + (s.id === sel ? 'sel' : '')} style={{ '--g': GC[s.grade] }}
          aria-pressed={s.id === sel} title={'Pilih ' + s.name + ' — ' + s.role} onClick={() => setSel(s.id)}>
          <Avatar name={s.name} size={34} />
          <div style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.15 }}>{s.name}</div>
          <div className="tiny muted" style={{ lineHeight: 1.1 }}>{s.role}</div>
          <span className="badge" style={{ background: GC[s.grade] + '1a', color: GC[s.grade], fontSize: 11, padding: '0 6px' }}>{s.grade}</span>
          {dr > 0 && <span className="tiny" style={{ color: 'var(--ink-4)' }}>{dr} bawahan langsung</span>}
        </button>
        {n.children.length > 0 && <ul>{n.children.map((k) => <Node key={k.person.id} n={k} />)}</ul>}
      </li>
    );
  };

  const onExport = async () => {
    const rosterRows: (string | number)[][] = [];
    const yatim = new Map(tanpaAtasan.map((o) => [o.person.id, o]));
    for (const s of staff) {
      const rep = (ORG[s.id] || {}).reports;
      const mgrP = rep ? A.byId(rep) : null;
      const o = yatim.get(s.id);
      const atasan = o
        ? (o.alasan === 'tanpa-entri' ? 'BELUM DITETAPKAN' : 'TAK DIKENAL (' + o.reports + ')')
        : (mgrP ? mgrP.name : 'Puncak organisasi');
      rosterRows.push([s.id, s.name, s.role, s.grade, (ORG[s.id] || {}).dept || 'BELUM DITETAPKAN', atasan, spanOf(s.id).direct, spanOf(s.id).total]);
    }
    await amsExportXlsx({
      kind: 'firm-orgchart', scope: 'firm',
      fileName: 'Struktur Organisasi.xlsx',
      firm: A.FIRM.short || 'KAP',
      title: 'Struktur Organisasi & Rentang Kendali',
      meta: [`${A.FIRM.partners + A.FIRM.managers + A.FIRM.staff} headcount · ${departments.length} divisi · rasio staf:manajer ${(A.FIRM.staff / A.FIRM.managers).toFixed(1)}`,
        `${puncak.length} puncak organisasi · ${perluDibereskan} garis pelaporan perlu dibereskan`],
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
        <style>{ORG_TREE_CSS + PC_BTN_CSS}</style>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={A.FIRM.partners + A.FIRM.managers + A.FIRM.staff} label="Total Headcount" /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={departments.length} label="Divisi / Unit" /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={A.FIRM.partners} label="Rekan (Partner)" accent="var(--navy)" /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={(A.FIRM.staff / A.FIRM.managers).toFixed(1)} label="Rasio Staf : Manajer" accent="var(--blue)" /></div></Panel>
        </div>

        <div className="grid" style={{ gridTemplateColumns: view === 'chart' ? '1fr 320px' : '1fr', gap: 12, alignItems: 'start' }}>
          <Panel noBody>
            <div className="panel-h"><h3>{view === 'chart' ? 'Bagan Organisasi' : view === 'dept' ? 'Struktur Divisi & Unit' : 'Rentang Kendali (Span of Control)'}</h3><div style={{ flex: 1 }} /><span className="tiny muted">{A.FIRM.short} · {A.FIRM.license}</span></div>

            {view === 'chart' && (
              <>
                {perluDibereskan > 0 && (
                  <div className="org-flag" style={{ margin: '12px 14px 0' }}>
                    <div className="row ac gap6" style={{ marginBottom: 5 }}>
                      <I.alert size={13} style={{ color: 'var(--amber)' }} />
                      <b style={{ fontSize: 12 }}>{perluDibereskan} orang belum tergambar di struktur</b>
                    </div>
                    <div className="tiny muted" style={{ marginBottom: 8, lineHeight: 1.4 }}>
                      Mereka TIDAK ditampilkan sebagai puncak organisasi — puncak yang sah hanya {puncak.map((p) => p.name).join(', ') || '—'}.
                      Tetapkan garis pelaporannya di data struktur agar masuk bagan.
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {tanpaAtasan.map((o) => (
                        <PersonBtn key={o.person.id} p={o.person}
                          note={o.alasan === 'tanpa-entri' ? 'Atasan belum ditetapkan' : 'Atasan tak dikenal: ' + o.reports} />
                      ))}
                      {takTerjangkau.map((p) => <PersonBtn key={p.id} p={p} note="Terjebak lingkaran pelaporan" />)}
                    </div>
                  </div>
                )}
                <div style={{ padding: '22px 14px', overflowX: 'auto' }}>
                  <div className="org-tree"><ul>{tree.map((n) => <Node key={n.person.id} n={n} />)}</ul></div>
                </div>
              </>
            )}

            {view === 'dept' && (
              <div style={{ padding: 14, display: 'grid', gap: 12 }}>
                {departments.map(({ dept, headId, headHilang, members }) => {
                  const head = headId && !headHilang ? A.byId(headId) : null;
                  return (
                    <div key={dept} className="panel" style={{ padding: 0, boxShadow: 'none' }}>
                      <div className="row ac jb" style={{ padding: '9px 12px', background: 'var(--surface-2)', borderBottom: '1px solid var(--line)' }}>
                        <div className="row ac gap8">
                          <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--navy-solid)' }} />
                          <b style={{ fontSize: 13 }}>{dept}</b>
                          {head
                            ? <span className="tiny muted">· dipimpin {head.name}</span>
                            : <span className="tiny" style={{ color: 'var(--amber)' }}>· {headHilang ? `kepala divisi (${headId}) tidak ada di roster` : 'kepala divisi belum ditetapkan'}</span>}
                        </div>
                        <Badge kind="blue">{members.length} anggota</Badge>
                      </div>
                      <div style={{ padding: 10, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {members.length ? members.map((m) => <PersonBtn key={m.id} p={m} />)
                          : <span className="tiny muted">Belum ada anggota terdaftar pada divisi ini.</span>}
                      </div>
                    </div>
                  );
                })}
                {tanpaDivisi.length > 0 && (
                  <div className="org-flag">
                    <div className="row ac gap6" style={{ marginBottom: 5 }}>
                      <I.alert size={13} style={{ color: 'var(--amber)' }} />
                      <b style={{ fontSize: 12 }}>{tanpaDivisi.length} orang tanpa divisi</b>
                    </div>
                    <div className="tiny muted" style={{ marginBottom: 8, lineHeight: 1.4 }}>Punya garis pelaporan tetapi tidak diberi divisi — ditampilkan di sini supaya tidak hilang dari daftar.</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {tanpaDivisi.map((m) => <PersonBtn key={m.id} p={m} />)}
                    </div>
                  </div>
                )}
              </div>
            )}

            {view === 'span' && (
              <table className="dtbl">
                <thead><tr><th>Manajer / Atasan</th><th>Jenjang</th><th className="num">Bawahan Langsung</th><th className="num">Total Bawahan</th><th style={{ width: 150 }}>Beban Supervisi</th></tr></thead>
                <tbody>
                  {staff.filter((s) => spanOf(s.id).direct > 0).sort((a, b) => spanOf(b.id).total - spanOf(a.id).total).map((s) => {
                    const dr = spanOf(s.id).direct, sp = spanOf(s.id).total;
                    const col = dr > 4 ? 'var(--amber)' : 'var(--green)';
                    return (
                      <tr key={s.id} className={s.id === sel ? 'sel' : ''}>
                        <td>
                          <button type="button" className="pc-rowbtn" aria-pressed={s.id === sel}
                            title={'Pilih ' + s.name + ' — ' + s.role} onClick={() => setSel(s.id)}>
                            <span className="row ac gap8"><Avatar name={s.name} size={24} /><span style={{ fontWeight: 600 }}>{s.name}</span></span>
                          </button>
                        </td>
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
              <div style={{ background: 'linear-gradient(120deg,var(--navy-700),var(--blue-solid))', color: 'var(--on-dark-fg)', padding: '16px 16px', display: 'flex', gap: 12, alignItems: 'center' }}>
                <Avatar name={person.name} size={44} />
                <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 15, fontWeight: 700 }} className="truncate">{person.name}</div><div className="tiny" style={{ color: 'var(--on-dark-muted)' }}>{person.role}</div></div>
              </div>
              <div style={{ padding: 14 }}>
                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                  <KvBox label="Divisi" v={(ORG[sel] || {}).dept || 'Belum ditetapkan'} />
                  <KvBox label="Atasan" v={mgr ? mgr.name.split(' ')[0] : (ORG[sel] ? 'Puncak' : 'Belum ditetapkan')} />
                  <KvBox label="Bawahan Langsung" v={spanOf(sel).direct} />
                  <KvBox label="Total Bawahan" v={spanOf(sel).total} />
                </div>
                {mgr && (
                  <>
                    <div className="tiny muted upper" style={{ marginBottom: 6 }}>Garis Pelaporan</div>
                    <div className="row ac gap6" style={{ marginBottom: 12, flexWrap: 'wrap' }}>
                      <span className="chip tiny">{A.byId('EMP-001').name.split(' ')[0]}</span>
                      {mgr.id !== 'EMP-001' && <><I.chevron size={12} style={{ color: 'var(--ink-4)' }} /><span className="chip tiny">{mgr.name.split(' ')[0]}</span></>}
                      <I.chevron size={12} style={{ color: 'var(--ink-4)' }} /><span className="chip tiny" style={{ background: 'var(--navy-solid)', color: '#fff' }}>{person.name.split(' ')[0]}</span>
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

  /* PRD sdm-kepatuhan PR-7 · SC-18 — kesiapan DITURUNKAN dari tangga karier ×
     kompetensi × progres IDP; `readiness` literal hanya dibandingkan.
     Dipanggil HANYA untuk orang yang benar-benar ada di roster (lihat
     `succession_board`): grade/cert palsu dari fallback `byId` dulu masuk ke
     sini dan melahirkan skor kesiapan untuk orang yang tidak ada. */
  const readinessFor = (empId: string) => {
    const p = A.byId(empId) || {};
    const rung = (A.CAREER_LADDER || []).find((r: any) => r.grade === p.grade);
    return readinessOf({
      cert: p.cert, currentGrade: p.grade, targetGrade: rung?.next,
      ladder: A.CAREER_LADDER, competencyActual: (A.COMPETENCY_ACTUAL || {})[empId],
      competencyRequired: (A.COMPETENCY_REQ || {})[rung?.next] || (A.COMPETENCY_REQ || {})[p.grade],
      idp: (A.IDP || {})[empId],
    });
  };
  /* Seluruh derivasi tampilan ada di `succession_board.ts` (murni, teruji di
     node): kontradiksi klaim-vs-bukti DIKUMPULKAN menjadi daftar yang dapat
     dirender (S1/S2), dan rujukan orang yang tak ada di roster tetap berupa
     rujukan (S4). Tak ada salinan privat di berkas ini. */
  const board = successionBoard({
    roles: ROLES as RoleInput[],
    staff: A.STAFF as RosterPerson[],
    readinessFor,
  });
  const resolvePC = refResolver(A.STAFF as RosterPerson[]);
  const role = board.roles.find((r) => r.id === sel) || board.roles[0];
  const inc = role.incumbent;
  const RISK_C = { Rendah: 'var(--green)', Sedang: 'var(--amber)', Tinggi: 'var(--red)' };

  /* Nama + jabatan satu orang, atau pernyataan bahwa rujukannya tak dapat
     diselesaikan. Avatar hanya untuk orang yang ADA — inisial dari sebuah id
     bukan orang. */
  const RefLine = ({ r, size, sub }: { r: PersonRef; size: number; sub?: string }) => (
    r.ada
      ? <div className="row ac gap8"><Avatar name={r.name} size={size} /><div><div style={{ fontWeight: 600, fontSize: 12 }}>{r.name}</div><div className="tiny muted">{sub || r.role}</div></div></div>
      : <div className="pc-missing"><div className="row ac gap6"><I.alert size={12} style={{ color: 'var(--red)' }} /><b style={{ fontSize: 12 }}>{refLabel(r)}</b></div><div className="tiny muted" style={{ marginTop: 2 }}>Rujukan tidak dapat diselesaikan — kesiapan tidak dihitung.</div></div>
  );

  const tabs = [{ id: 'map', label: 'Peta Suksesi' }, { id: 'ladder', label: 'Jenjang Karier' }, { id: 'idp', label: 'Rencana Pengembangan' }];

  // 2026-07-05 — suksesi & karier = data SDM sensitif: hanya Partner + Admin & HR (HR_MODULE_VIEW).
  if (!(authSucc && typeof authSucc.can === 'function' && authSucc.can(CAP.HR_MODULE_VIEW))) return (<><SubBar moduleId="succession" /><AccessDenied moduleId="succession" /></>);

  const onExport = async () => {
    const roleRows: (string | number)[][] = [];
    for (const r of board.roles) roleRows.push([r.role, refLabel(r.incumbent), r.critical, r.riskOfLoss, r.vacancyImpact, r.successors.length]);
    const succRows: (string | number)[][] = [];
    /* Kesiapan orang yang tak ada di roster TIDAK dikarang: kolomnya menyatakan
       bahwa ia tak dapat dinilai, bukan angka dari fallback `byId`. */
    for (const r of board.roles) for (const s of r.successors) {
      succRows.push([r.role, refLabel(s.ref), s.ref.ada ? s.ref.role : '—',
        s.readiness ? s.readiness.label : 'Tak dapat dinilai — rujukan tidak ada di roster',
        s.readiness
          ? [s.contradicts && s.claimed ? `Klaim data "${s.claimed}" dibantah bukti.` : '', ...s.readiness.blockers.map((b) => b.detail)].filter(Boolean).join(' · ') || s.gaps
          : 'Kesiapan tidak dihitung untuk rujukan yang tidak dapat diselesaikan.']);
    }
    await amsExportXlsx({
      kind: 'firm-succession', scope: 'firm',
      fileName: 'Laporan Suksesi.xlsx',
      firm: A.FIRM.short || 'KAP',
      title: 'Perencanaan Suksesi & Karier',
      meta: [`${board.kpi.roles} peran kunci · ${board.kpi.withReady} punya penerus siap · ${board.kpi.riskOfLoss} risiko kehilangan · ${board.kpi.withoutSuccessor} tanpa penerus · ${board.kpi.contradicting} klaim kesiapan dibantah bukti`],
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
        <style>{PC_BTN_CSS}</style>
        {/* S1 — keluaran paling berharga modul ini: berapa klaim kesiapan yang
            dibantah bukti. Dulu dihitung lalu dibuang ke variabel tak terpakai. */}
        <div className="grid" style={{ gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginBottom: 12 }}>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={board.kpi.roles} label="Peran Kunci Dipetakan" /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={board.kpi.withReady + '/' + board.kpi.roles} label="Punya Penerus Siap" accent="var(--green)" /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={board.kpi.riskOfLoss} label="Risiko Kehilangan" accent="var(--amber)" /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={board.kpi.withoutSuccessor} label="Tanpa Penerus" accent={board.kpi.withoutSuccessor ? 'var(--red)' : 'var(--green)'} /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={board.kpi.contradicting} label="Klaim Dibantah Bukti" accent={board.kpi.contradicting ? 'var(--red)' : 'var(--green)'} /></div></Panel>
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
        {board.contradictions.length > 0 && (
          <Panel noBody>
            <div className="panel-h"><h3>Klaim kesiapan yang dibantah bukti ({board.contradictions.length})</h3></div>
            <div style={{ padding: 12, display: 'grid', gap: 9 }}>
              <div className="tiny muted" style={{ lineHeight: 1.45 }}>
                Rencana suksesi menuliskan kesiapan; sertifikasi, kompetensi, dan progres rencana pengembangan menurunkan kesiapan yang berbeda.
                Yang dipakai modul ini adalah turunannya — klaim di bawah ini tidak dipercaya, hanya dibandingkan.
              </div>
              {board.contradictions.map((c) => (
                <div key={c.roleId + '/' + c.candidateId} className="pc-contra">
                  <div style={{ fontWeight: 600, fontSize: 12 }}>{c.candidateName} · {c.role}</div>
                  <div className="tiny" style={{ lineHeight: 1.45 }}>Data mengklaim <b>{c.claimed}</b>; bukti menurunkan <b>{c.derived}</b>.</div>
                  <ul className="tiny muted">{c.blockers.map((b, i) => <li key={i}>{b.detail}</li>)}</ul>
                </div>
              ))}
            </div>
          </Panel>
        )}

        {board.unresolved.length > 0 && (
          <Panel noBody>
            <div className="panel-h"><h3>Rujukan orang yang tidak dapat diselesaikan ({board.unresolved.length})</h3></div>
            <div style={{ padding: 12, display: 'grid', gap: 8 }}>
              <div className="tiny muted" style={{ lineHeight: 1.45 }}>
                Id berikut dirujuk rencana suksesi tetapi tidak ada di roster firma. Kesiapannya TIDAK dihitung dan tidak ikut ke laporan — perbaiki datanya atau cabut rujukannya.
              </div>
              {board.unresolved.map((u) => (
                <div key={u.kind + '/' + u.roleId + '/' + u.id} className="pc-missing">
                  <div className="row ac gap6"><I.alert size={12} style={{ color: 'var(--red)' }} /><b style={{ fontSize: 12 }}>{u.id}</b><span className="tiny muted">· {u.kind} pada {u.role}</span></div>
                </div>
              ))}
            </div>
          </Panel>
        )}
        </div>
        {(board.contradictions.length > 0 || board.unresolved.length > 0) && <div style={{ height: 12 }} />}

        <Panel noBody className="" >
          <div className="panel-h" style={{ padding: 0, background: 'var(--surface-2)' }}><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>

          {tab === 'map' && (
            <div className="grid" style={{ gridTemplateColumns: '1.3fr 1fr', gap: 0 }}>
              <table className="dtbl" style={{ borderRight: '1px solid var(--line)' }}>
                <thead><tr><th>Peran Kunci</th><th>Pemangku</th><th>Risiko</th><th className="num">Penerus</th></tr></thead>
                <tbody>
                  {board.roles.map((r) => {
                    const ic = r.incumbent;
                    const dibantah = board.contradictions.filter((c) => c.roleId === r.id).length;
                    return (
                      <tr key={r.id} className={r.id === sel ? 'sel' : ''}>
                        <td>
                          {/* S3 — memilih peran kunci adalah interaksi utama modul ini;
                              dulu hanya lewat <tr onClick>, mustahil dengan papan-ketik. */}
                          <button type="button" className="pc-rowbtn" aria-pressed={r.id === sel}
                            title={'Pilih peran ' + r.role} onClick={() => setSel(r.id)}>
                            <span style={{ fontWeight: 600, fontSize: 12 }}>{r.role}</span>
                            <span className="tiny muted">{r.critical} · dampak {r.vacancyImpact.toLowerCase()}</span>
                          </button>
                        </td>
                        <td>{ic.ada
                          ? <div className="row ac gap6"><Avatar name={ic.name} size={22} /><span className="tiny truncate" style={{ maxWidth: 90 }}>{ic.name}</span></div>
                          : <span className="tiny" style={{ color: 'var(--red)' }}>{refLabel(ic)}</span>}</td>
                        <td><Badge kind={r.riskOfLoss === 'Rendah' ? 'green' : r.riskOfLoss === 'Sedang' ? 'amber' : 'red'}>{r.riskOfLoss}</Badge></td>
                        <td className="num">
                          {r.successors.length ? <span style={{ color: r.readyNow > 0 ? 'var(--green)' : 'var(--amber)', fontWeight: 700 }}>{r.successors.length}</span> : <Badge kind="red">0</Badge>}
                          {dibantah > 0 && <div className="tiny" style={{ color: 'var(--amber)' }}>{dibantah} klaim dibantah</div>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div style={{ padding: 14 }}>
                <div className="tiny muted upper" style={{ marginBottom: 4 }}>Peran</div>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>{role.role}</div>
                <div style={{ marginBottom: 12 }}>
                  <RefLine r={inc} size={30} sub={'Pemangku saat ini · ' + inc.role} />
                </div>
                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                  <KvBox label="Kritikalitas" v={role.critical} />
                  <KvBox label="Risiko Kehilangan" v={role.riskOfLoss} accent={(RISK_C as any)[role.riskOfLoss]} />
                </div>
                <div className="tiny muted upper" style={{ marginBottom: 8 }}>Kandidat Penerus ({role.successors.length})</div>
                <div style={{ display: 'grid', gap: 9 }}>
                  {role.successors.length ? role.successors.map((s: BoardSuccessor, i: number) => {
                    const d = s.readiness;
                    return (
                      <div key={i} className="panel" style={{ padding: '9px 11px', boxShadow: 'none' }}>
                        <div className="row ac jb" style={{ marginBottom: 4, gap: 8 }}>
                          <RefLine r={s.ref} size={26} />
                          {d
                            ? <span className="badge" style={{ background: 'transparent', color: RC[d.label] || 'var(--ink-3)', border: '1px solid currentColor', fontSize: 11 }}>{d.label}</span>
                            : <Badge kind="red">Tak dapat dinilai</Badge>}
                        </div>
                        {/* S2 — kontradiksi dinyatakan dengan TEKS: apa yang diklaim, apa
                            yang diturunkan, dan pemblokir ter-enumerasi dari mesin
                            kesiapan. Dulu: satu glyph "⚠" tanpa nama, penjelasannya
                            hanya di `title` pada <span> yang tak terjangkau papan-ketik. */}
                        {d && s.contradicts && s.claimed && (
                          <div className="pc-contra" style={{ marginBottom: 6 }}>
                            <div className="tiny" style={{ lineHeight: 1.45 }}>Klaim kesiapan dibantah bukti — data mengklaim <b>{s.claimed}</b>, bukti menurunkan <b>{d.label}</b>.</div>
                          </div>
                        )}
                        {d && (d.blockers.length
                          ? <><div className="tiny muted upper" style={{ marginBottom: 2 }}>Pemblokir</div>
                              <ul className="tiny muted" style={{ margin: 0, paddingLeft: 17 }}>{d.blockers.map((b, j) => <li key={j} style={{ lineHeight: 1.45 }}>{b.detail}</li>)}</ul></>
                          : <div className="tiny muted">Tak ada pemblokir teridentifikasi.</div>)}
                        {d && d.note && <div className="tiny muted" style={{ marginTop: 4, lineHeight: 1.45 }}>{d.note}</div>}
                        {s.gaps && <div className="tiny muted" style={{ marginTop: 4 }}>Catatan gap pada data: {s.gaps}</div>}
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
                const p = resolvePC(id), plan = IDP[id];
                const sp = resolvePC(plan.sponsor);
                const sub = <>Target: <b style={{ color: 'var(--purple)' }}>{plan.target}</b> · Sponsor {sp.ada ? sp.name.split(' ')[0] : refLabel(sp)}</>;
                return (
                  <div key={id} className="panel" style={{ padding: 0, boxShadow: 'none' }}>
                    <div className="row ac jb" style={{ padding: '10px 13px', borderBottom: '1px solid var(--line)' }}>
                      {p.ada
                        ? <div className="row ac gap8"><Avatar name={p.name} size={30} /><div><div style={{ fontWeight: 700, fontSize: 13 }}>{p.name}</div><div className="tiny muted">{p.role} · {sub}</div></div></div>
                        : <div className="pc-missing"><div className="row ac gap6"><I.alert size={12} style={{ color: 'var(--red)' }} /><b style={{ fontSize: 12 }}>{refLabel(p)}</b></div><div className="tiny muted" style={{ marginTop: 2 }}>{sub}</div></div>}
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



/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { OrgChart, SuccessionPlanning };
