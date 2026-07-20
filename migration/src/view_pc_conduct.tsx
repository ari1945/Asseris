/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { useAmsPersist, useNav, useAuth } from './contexts';
import { CAP } from './rbac';
import { I } from './icons';
import { SubBar } from './shell';
import { Avatar, Badge, Btn, Panel, Seg, Stat, Tabs } from './ui';
import { KvBox } from './view_analytical';
import { NoclarEthics, TaxTechEthics } from './view_ethics_parts';
import { useEthicsOverrides, ethicsComplianceOf } from './ethics_gate';

/* ============================================================
   Asseris — People & Compliance (NEW)
   Kode Etik & Deklarasi Tahunan (AML/PMPJ)  ·  Sanksi & Disiplin
   ============================================================ */
const { useState: usePCcon } = React;

type EthDecl = Record<string, { signed?: boolean; items?: number[]; date?: string; exceptions?: number; exNote?: string; requested?: boolean; requestedAt?: string }>;

function EthicsDeclaration() {
  const A: any = AMS, fmt = A.fmt;
  const nav = useNav();
  const authEth = useAuth();
  const canReqDecl = !authEth || typeof authEth.can !== 'function' || authEth.can(CAP.HR_MANAGE);
  const [tab, setTab] = usePCcon('decl');
  const [decl, setDecl] = useAmsPersist('pc.ethics', () => A.ETHICS_DECL);
  const [gifts, setGifts] = useAmsPersist('pc.gifts', () => A.GIFTS_REGISTER);
  const [aml] = useAmsPersist('amlScreening', () => A.AML_SCREENING);
  const staff = A.STAFF, ITEMS = A.ETHICS_ITEMS;
  // 2026-07-05 — data personal ter-filter server (personal.get): non-privileged hanya menerima
  // barisnya sendiri. Batasi iterasi tabel ke staf yang datanya benar-benar diterima (pola
  // view_payroll) agar tak menampilkan baris kosong/menyesatkan milik orang lain.
  const myStaff = staff.filter((s: any) => Object.prototype.hasOwnProperty.call(decl, s.id));
  /* #3 — gerbang: personel non-patuh (deklarasi belum sah / AML tertunda) diblokir dari sign-off WP
     & penerbitan opini. Partner (FIRM_ADMIN) dapat memberi pengecualian sementara yang ter-log. */
  const eov = useEthicsOverrides();
  const gateRows = myStaff
    .map((s: any) => ({ s, c: ethicsComplianceOf(decl, aml, eov.overrides, s.id, eov.period) }))
    .filter((r: any) => !r.c.signed || !r.c.amlOk);

  const signed = myStaff.filter((s: any) => (decl[s.id] || {}).signed).length;
  const exceptions = myStaff.reduce((n: any, s: any) => n + ((decl[s.id] || {}).exceptions || 0), 0);
  const giftsPending = gifts.filter((g: any) => g.status === 'Menunggu').length;
  const amlPending = aml.filter((a: any) => a.result !== 'Bersih').length;

  const sign = (id: any) => setDecl((d: any) => ({ ...d, [id]: { ...d[id], signed: true, date: '2026-03-09', items: ITEMS.map((_: any, i: any) => (d[id].items[i] ? 1 : 1)) } }));
  const requestDecl = () => setDecl((d: EthDecl) => {
    const next: EthDecl = { ...d };
    for (const s of myStaff) { const cur = next[s.id]; if (cur && !cur.signed) next[s.id] = { ...cur, requested: true, requestedAt: '2026-03-09' }; }
    return next;
  });
  const decideGift = (id: any, status: any) => setGifts((list: any) => list.map((g: any) => g.id === id ? { ...g, status, action: status === 'Disetujui' ? 'Disetujui & dicatat' : g.action } : g));

  const tabs = [{ id: 'decl', label: 'Deklarasi Tahunan', count: myStaff.length - signed || undefined }, { id: 'gifts', label: 'Register Gratifikasi', count: giftsPending || undefined }, { id: 'aml', label: 'Screening APU-PPT' }, { id: 'noclar', label: 'NOCLAR (§360)', count: A.NOCLAR_ETHICS.filter((r: any) => r.stageIdx > 0 && r.stageIdx < A.NOCLAR_STAGES.length - 1).length || undefined }, { id: 'taxtech', label: 'Etika Pajak & Teknologi' }];

  return (
    <>
      <SubBar moduleId="ethics" right={<div className="row gap8 ac"><Badge kind="blue">Kode Etik IAPI · TA 2026</Badge>{canReqDecl && <Btn sm onClick={requestDecl} title="Kirim permintaan deklarasi ke seluruh personel yang belum menandatangani"><I.send size={13} /> Minta Deklarasi</Btn>}</div>} />
      <div className="view-scroll"><div className="view-pad">
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={signed + '/' + staff.length} label="Deklarasi Ditandatangani" accent={signed === staff.length ? 'var(--green)' : 'var(--amber)'} /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={exceptions} label="Pengecualian Dilaporkan" accent={exceptions ? 'var(--amber)' : 'var(--green)'} /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={giftsPending} label="Gratifikasi Menunggu" accent={giftsPending ? 'var(--amber)' : 'var(--green)'} /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={amlPending} label="Screening APU-PPT Tertunda" accent={amlPending ? 'var(--red)' : 'var(--green)'} /></div></Panel>
        </div>

        <Panel noBody>
          <div className="panel-h" style={{ padding: 0, background: 'var(--surface-2)' }}><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>

          {tab === 'decl' && (
            <div style={{ overflowX: 'auto' }}>
              <table className="dtbl" style={{ minWidth: 880 }}>
                <thead><tr><th style={{ minWidth: 160 }}>Karyawan</th>{ITEMS.map((it: any, i: any) => <th key={i} className="num" title={it.ref} style={{ minWidth: 60, fontSize: 9.5, verticalAlign: 'bottom', lineHeight: 1.15 }}>{it.k.split(' ').slice(0, 2).join(' ')}</th>)}<th>Tgl</th><th>Status</th></tr></thead>
                <tbody>
                  {myStaff.map((s: any) => {
                    const d = decl[s.id] || { signed: false, items: ITEMS.map(() => 0) };
                    return (
                      <tr key={s.id}>
                        <td><div className="row ac gap8"><Avatar name={s.name} size={24} /><div style={{ minWidth: 0 }}><div className="truncate tiny" style={{ fontWeight: 600 }}>{s.name}</div><div className="tiny muted">{s.role}</div></div></div></td>
                        {ITEMS.map((it: any, i: any) => {
                          const ok = d.signed && d.items[i] === 1;
                          const ex = d.signed && d.items[i] === 0;
                          return <td key={i} className="num" style={{ textAlign: 'center' }}>{d.signed ? (ok ? <I.check size={14} style={{ color: 'var(--green)' }} /> : ex ? <span title={d.exNote} style={{ color: 'var(--amber)' }}><I.alert size={13} /></span> : '–') : <span className="muted">–</span>}</td>;
                        })}
                        <td className="tiny muted">{d.signed ? new Date(d.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }) : '—'}</td>
                        <td>{d.signed ? (d.exceptions ? <Badge kind="amber">Dgn Pengecualian</Badge> : <Badge kind="green">Lengkap</Badge>) : <div className="row ac gap6">{d.requested && <span className="chip tiny" style={{ color: 'var(--amber)', borderColor: 'var(--amber)' }} title={'Deklarasi diminta ' + (d.requestedAt || '')}><I.send size={10} /> Diminta</span>}<button className="btn sm" style={{ height: 22, color: 'var(--blue)' }} onClick={() => sign(s.id)}><I.check size={12} /> Tandatangani</button></div>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="tiny muted" style={{ padding: '10px 14px', lineHeight: 1.5 }}>Setiap personel wajib mendeklarasikan kepatuhan atas {ITEMS.length} butir Kode Etik IAPI setiap tahun. <span style={{ color: 'var(--amber)' }}><I.alert size={11} /></span> menandakan butir dengan pengecualian yang telah dimitigasi. Sumber independensi terhubung ke modul <span onClick={() => nav('independence')} style={{ color: 'var(--blue)', cursor: 'pointer', textDecoration: 'underline' }}>Independence &amp; Rotasi</span>.</div>

              <div style={{ padding: '4px 14px 14px' }}>
                <div className="panel" style={{ padding: 0, boxShadow: 'none', borderColor: 'var(--line)' }}>
                  <div className="row ac gap8" style={{ padding: '9px 12px', borderBottom: '1px solid var(--line)', background: 'var(--surface-2)' }}>
                    <I.lock size={13} style={{ color: gateRows.length ? 'var(--red)' : 'var(--green)' }} />
                    <span className="tiny" style={{ fontWeight: 700 }}>Gerbang Sign-off — Kode Etik &amp; AML/PMPJ</span>
                    <div style={{ flex: 1 }} />
                    <Badge kind={gateRows.length ? 'red' : 'green'}>{gateRows.length ? gateRows.length + ' personel diblokir' : 'Semua patuh'}</Badge>
                  </div>
                  <div className="tiny muted" style={{ padding: '8px 12px', lineHeight: 1.5 }}>
                    Personel dengan deklarasi belum sah / skrining AML tertunda <b>tidak dapat</b> membubuhkan tanda tangan kertas kerja atau menerbitkan opini ({eov.period}). {eov.canGrant ? 'Sebagai Partner, Anda dapat memberi pengecualian sementara yang ter-log.' : 'Pengecualian hanya dapat diberikan Partner (FIRM_ADMIN).'}
                  </div>
                  {gateRows.length === 0
                    ? <div className="tiny muted" style={{ padding: '4px 12px 12px' }}>Tidak ada personel yang terblokir.</div>
                    : (
                      <table className="dtbl">
                        <thead><tr><th>Personel</th><th>Alasan Blokir</th><th>Status Gerbang</th><th style={{ width: 150 }}>Pengecualian (Partner)</th></tr></thead>
                        <tbody>
                          {gateRows.map(({ s, c }: any) => {
                            const ov = eov.activeFor(s.id);
                            return (
                              <tr key={s.id}>
                                <td><div className="row ac gap8"><Avatar name={s.name} size={22} /><span className="tiny truncate" style={{ fontWeight: 600 }}>{s.name}</span></div></td>
                                <td className="tiny" style={{ color: 'var(--red)' }}>{c.reason}</td>
                                <td>{ov ? <Badge kind="amber">Dikecualikan</Badge> : <Badge kind="red">Diblokir</Badge>}</td>
                                <td>
                                  {ov
                                    ? <div className="row ac gap6"><span className="tiny muted" title={'oleh ' + ov.by + ' · ' + ov.at}>{ov.by?.split(' ')[0]} · {ov.at}</span>{eov.canGrant && <button className="btn sm" style={{ height: 20, color: 'var(--red)' }} onClick={() => eov.revoke(s.id)} title="Cabut pengecualian"><I.x size={11} /></button>}</div>
                                    : (eov.canGrant
                                      ? <button className="btn sm" style={{ height: 22, color: 'var(--amber)' }} onClick={() => eov.grant(s.id, 'Pengecualian sementara — disetujui Partner')}><I.shield size={11} /> Beri Pengecualian</button>
                                      : <span className="tiny muted">—</span>)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                </div>
              </div>
            </div>
          )}

          {tab === 'gifts' && (
            <table className="dtbl">
              <thead><tr><th>Tgl</th><th>Karyawan</th><th>Pihak Pemberi</th><th>Bentuk</th><th className="num">Nilai (Rp)</th><th>Tindakan</th><th>Status / Aksi</th></tr></thead>
              <tbody>
                {gifts.map((g: any) => {
                  const p = A.byId(g.staff);
                  const over = g.value >= 1_000_000;
                  return (
                    <tr key={g.id}>
                      <td className="tiny muted">{new Date(g.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</td>
                      <td><div className="row ac gap6"><Avatar name={p.name} size={22} /><span className="tiny truncate" style={{ maxWidth: 90, fontWeight: 600 }}>{p.name}</span></div></td>
                      <td className="tiny">{g.counter}</td>
                      <td className="tiny">{g.type}</td>
                      <td className="num mono" style={{ fontWeight: 600, color: over ? 'var(--amber)' : 'var(--ink)' }}>{fmt(g.value, 0)}</td>
                      <td className="tiny muted truncate" style={{ maxWidth: 150 }}>{g.action}</td>
                      <td>{g.status === 'Menunggu'
                        ? <div className="row gap6"><button className="btn sm" style={{ height: 22, color: 'var(--green)' }} onClick={() => decideGift(g.id, 'Disetujui')}><I.check size={12} /> Setujui</button><button className="btn sm" style={{ height: 22, color: 'var(--red)' }} onClick={() => decideGift(g.id, 'Ditolak')}><I.x size={12} /></button></div>
                        : <Badge kind={g.status === 'Disetujui' ? 'green' : g.status === 'Ditolak' ? 'red' : 'gray'}>{g.status}</Badge>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {tab === 'aml' && (
            <table className="dtbl">
              <thead><tr><th>Karyawan</th><th>Pelatihan APU-PPT</th><th>Tgl Screening</th><th>DTTOT / Daftar Sanksi</th><th>Status PEP</th><th>Hasil</th></tr></thead>
              <tbody>
                {aml.map((a: any) => {
                  const p = A.byId(a.id);
                  return (
                    <tr key={a.id}>
                      <td><div className="row ac gap8"><Avatar name={p.name} size={24} /><div style={{ minWidth: 0 }}><div className="truncate" style={{ fontWeight: 600 }}>{p.name}</div><div className="tiny muted">{p.role}</div></div></div></td>
                      <td>{a.training ? <Badge kind="green"><I.check size={10} /> Selesai</Badge> : <Badge kind="red">Belum</Badge>}</td>
                      <td className="tiny muted">{a.screened === '—' ? <span className="muted">—</span> : new Date(a.screened).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                      <td className="tiny">{a.dttot === 'Bersih' ? <span style={{ color: 'var(--green)' }}>Bersih</span> : <span className="muted">{a.dttot}</span>}</td>
                      <td className="tiny">{a.pep}</td>
                      <td><Badge kind={a.result === 'Bersih' ? 'green' : 'amber'}>{a.result}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {tab === 'noclar' && <NoclarEthics />}
          {tab === 'taxtech' && <TaxTechEthics />}
        </Panel>
        <div className="tiny muted" style={{ marginTop: 8, lineHeight: 1.5 }}>Kepatuhan APU-PPT (Anti Pencucian Uang &amp; Pencegahan Pendanaan Terorisme) mengacu pada PMK 155/2017 &amp; pengawasan PPATK. Seluruh personel disaring terhadap DTTOT serta daftar sanksi, dan wajib menuntaskan pelatihan APU-PPT tahunan.</div>
      </div></div>
    </>
  );
}

/* ============================================================
   Sanksi & Disiplin (HR Cases)
   ============================================================ */
const HC_SEV = { Ringan: 'green', Sedang: 'amber', Berat: 'red' };
const HC_STAT = { Selesai: 'green', Investigasi: 'amber', Ditangani: 'blue', Terbuka: 'amber' };

/* F1/PR-5 — bentuk baris register disiplin (untuk jalur tulis bertipe, hindari :any baru). */
type HcCase = { id: string; staff: string; cat: string; severity: string; channel: string; status: string; owner: string; desc: string; sanction: string; steps: string[][] };

function HRCases() {
  const A: any = AMS;
  const [sel, setSel] = usePCcon(null);
  const [filter, setFilter] = usePCcon('Semua');
  // 2026-07-05 — sanksi/disiplin ter-filter server (personal.get): non-privileged hanya kasus miliknya.
  const [cases, setCases] = useAmsPersist('hrCases', () => A.HR_CASES);
  const staff = A.STAFF;
  // F1/PR-5 (PRD 2026-07-19) — jalur tulis nyata: register disiplin kini editable (dulu setter
  // useAmsPersist dideklarasi tapi tak pernah dipanggil → efektif display-only).
  const today = () => new Date().toISOString().slice(0, 10);
  const patchCase = (id: string, fn: (c: HcCase) => HcCase) => setCases((list: HcCase[]) => list.map((c) => c.id === id ? fn(c) : c));
  const addCase = () => {
    const id = 'HC-' + String(700 + Math.floor(Math.random() * 290)).padStart(3, '0');
    const nc: HcCase = { id, staff: staff[0].id, cat: 'Pelanggaran Ringan', severity: 'Ringan', channel: 'Laporan Langsung', status: 'Terbuka', owner: staff[0].id, desc: 'Kasus baru — lengkapi detail & tetapkan penanggung jawab.', sanction: A.SANCTION_LADDER[0], steps: [[today(), 'Kasus dicatat melalui register disiplin.']] };
    setCases((list: HcCase[]) => [nc, ...list]); setSel(id);
  };
  const closeCase = (id: string) => patchCase(id, (c) => {
    const i = A.SANCTION_LADDER.findIndex((x: string) => c.sanction.includes(x.split(' ')[0]));
    const next = A.SANCTION_LADDER[Math.min(i + 1, A.SANCTION_LADDER.length - 1)] || c.sanction;
    return { ...c, status: 'Selesai', sanction: next, steps: [...c.steps, [today(), 'Sanksi ditetapkan (' + next + ') & kasus ditutup.']] };
  });

  const open = cases.filter((c: any) => c.status !== 'Selesai').length;
  const invest = cases.filter((c: any) => c.status === 'Investigasi').length;
  const heavy = cases.filter((c: any) => c.severity === 'Berat').length;
  const closed = cases.filter((c: any) => c.status === 'Selesai').length;
  const shown = filter === 'Semua' ? cases : filter === 'Aktif' ? cases.filter((c: any) => c.status !== 'Selesai') : cases.filter((c: any) => c.status === 'Selesai');
  const cur = sel ? cases.find((c: any) => c.id === sel) : null;

  return (
    <>
      <SubBar moduleId="hrcase" right={<div className="row gap8 ac"><Badge kind="blue">Kanal WBS aktif</Badge><Btn sm variant="primary" onClick={addCase}><I.plus size={14} /> Catat Kasus</Btn></div>} />
      <div className="view-scroll"><div className="view-pad">
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={open} label="Kasus Aktif" accent={open ? 'var(--amber)' : 'var(--green)'} /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={invest} label="Dalam Investigasi" accent="var(--amber)" /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={heavy} label="Severitas Berat" accent={heavy ? 'var(--red)' : 'var(--green)'} /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={closed} label="Selesai (12 bln)" accent="var(--green)" /></div></Panel>
        </div>

        <div className="grid" style={{ gridTemplateColumns: cur ? '1fr 380px' : '1fr', gap: 12, alignItems: 'start' }}>
          <Panel noBody>
            <div className="panel-h"><h3>Register Disiplin & Etika</h3><div style={{ flex: 1 }} /><Seg options={['Semua', 'Aktif', 'Selesai']} value={filter} onChange={setFilter} /></div>
            <table className="dtbl">
              <thead><tr><th>ID</th><th>Karyawan</th><th>Kategori</th><th>Severitas</th><th>Kanal</th><th>Status</th></tr></thead>
              <tbody>
                {shown.map((c: any) => {
                  const p = A.byId(c.staff);
                  return (
                    <tr key={c.id} className={c.id === sel ? 'sel' : ''} onClick={() => setSel(c.id)} style={{ cursor: 'pointer' }}>
                      <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{c.id}</td>
                      <td><div className="row ac gap8"><Avatar name={p.name} size={24} /><span style={{ fontWeight: 600 }} className="truncate">{p.name}</span></div></td>
                      <td className="tiny">{c.cat}</td>
                      <td><Badge kind={(HC_SEV as any)[c.severity]}>{c.severity}</Badge></td>
                      <td className="tiny muted">{c.channel}</td>
                      <td><Badge kind={(HC_STAT as any)[c.status] || 'gray'}>{c.status}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Panel>

          {cur && (() => {
            const p = A.byId(cur.staff), owner = A.byId(cur.owner);
            const sanctionIdx = A.SANCTION_LADDER.findIndex((x: any) => cur.sanction.includes(x.split(' ')[0]));
            return (
              <Panel noBody>
                <div style={{ background: 'linear-gradient(120deg,#013a52,#005085)', color: '#fff', padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'center' }}>
                  <Avatar name={p.name} size={40} />
                  <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 14, fontWeight: 700 }} className="truncate">{p.name}</div><div className="tiny" style={{ color: '#bcd6e4' }}>{cur.id} · {cur.cat}</div></div>
                  <button className="top-btn" onClick={() => setSel(null)}><I.x size={16} /></button>
                </div>
                <div style={{ padding: 14 }}>
                  <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                    <KvBox label="Severitas" v={cur.severity} accent={cur.severity === 'Berat' ? 'var(--red)' : cur.severity === 'Sedang' ? 'var(--amber)' : 'var(--green)'} />
                    <KvBox label="Status" v={cur.status} />
                    <KvBox label="Kanal" v={cur.channel} />
                    <KvBox label="Penanggung Jawab" v={owner.name.split(' ')[0]} />
                  </div>
                  {/* F1/PR-5 — kontrol edit nyata (persist ke server) */}
                  <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                    <label className="tiny muted" style={{ display: 'grid', gap: 3 }}>Karyawan
                      <select className="select" value={cur.staff} onChange={(e: { target: { value: string } }) => patchCase(cur.id, (c) => ({ ...c, staff: e.target.value, owner: c.owner || e.target.value }))}>{staff.map((s: { id: string; name: string }) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
                    <label className="tiny muted" style={{ display: 'grid', gap: 3 }}>Severitas
                      <select className="select" value={cur.severity} onChange={(e: { target: { value: string } }) => patchCase(cur.id, (c) => ({ ...c, severity: e.target.value }))}>{['Ringan', 'Sedang', 'Berat'].map((s) => <option key={s}>{s}</option>)}</select></label>
                    <label className="tiny muted" style={{ display: 'grid', gap: 3 }}>Status
                      <select className="select" value={cur.status} onChange={(e: { target: { value: string } }) => patchCase(cur.id, (c) => ({ ...c, status: e.target.value }))}>{['Terbuka', 'Ditangani', 'Investigasi', 'Selesai'].map((s) => <option key={s}>{s}</option>)}</select></label>
                    <label className="tiny muted" style={{ display: 'grid', gap: 3 }}>Kategori
                      <input className="input" value={cur.cat} onChange={(e: { target: { value: string } }) => patchCase(cur.id, (c) => ({ ...c, cat: e.target.value }))} /></label>
                  </div>
                  <div className="panel" style={{ padding: '9px 11px', boxShadow: 'none', background: 'var(--surface-2)', marginBottom: 12 }}>
                    <div className="tiny muted upper" style={{ marginBottom: 3 }}>Uraian</div>
                    <div style={{ fontSize: 12, lineHeight: 1.5 }}>{cur.desc}</div>
                  </div>
                  <div className="tiny muted upper" style={{ marginBottom: 6 }}>Tangga Sanksi</div>
                  <div className="row" style={{ gap: 3, marginBottom: 4 }}>
                    {A.SANCTION_LADDER.map((s: any, i: any) => (
                      <div key={i} title={s} style={{ flex: 1, height: 6, borderRadius: 3, background: i <= sanctionIdx && sanctionIdx >= 0 ? (i >= 3 ? 'var(--red)' : i >= 1 ? 'var(--amber)' : 'var(--blue)') : 'var(--surface-3)' }} />
                    ))}
                  </div>
                  <div className="tiny" style={{ marginBottom: 12, fontWeight: 600, color: sanctionIdx >= 3 ? 'var(--red)' : sanctionIdx >= 1 ? 'var(--amber)' : 'var(--ink-2)' }}>{cur.sanction}</div>
                  <div className="tiny muted upper" style={{ marginBottom: 8 }}>Linimasa Penanganan</div>
                  <div style={{ display: 'grid', gap: 0 }}>
                    {cur.steps.map((st: any, i: any) => (
                      <div key={i} className="row gap8" style={{ paddingBottom: i < cur.steps.length - 1 ? 12 : 0, position: 'relative' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: '0 0 auto' }}>
                          <span style={{ width: 9, height: 9, borderRadius: '50%', background: i === cur.steps.length - 1 ? 'var(--blue)' : 'var(--green)', marginTop: 3 }} />
                          {i < cur.steps.length - 1 && <span style={{ width: 1.5, flex: 1, background: 'var(--line)' }} />}
                        </div>
                        <div style={{ minWidth: 0, paddingBottom: 2 }}><div className="tiny mono muted">{new Date(st[0]).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</div><div style={{ fontSize: 12, lineHeight: 1.4 }}>{st[1]}</div></div>
                      </div>
                    ))}
                  </div>
                  {cur.status !== 'Selesai' && <Btn variant="primary" sm style={{ width: '100%', marginTop: 12 }} onClick={() => closeCase(cur.id)}><I.gavel size={13} /> Tetapkan Sanksi & Tutup</Btn>}
                </div>
              </Panel>
            );
          })()}
        </div>
        <div className="tiny muted" style={{ marginTop: 8, lineHeight: 1.5 }}>Kasus etika & independensi terkait mutu dieskalasikan ke <b>Governance (SOQM)</b> sebagai keluhan/tuduhan (ISQM 1). Tangga sanksi mengacu pada UU Ketenagakerjaan (SP-1/2/3) &amp; peraturan perusahaan.</div>
      </div></div>
    </>
  );
}

Object.assign(window, { EthicsDeclaration, HRCases });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { EthicsDeclaration, HRCases };
