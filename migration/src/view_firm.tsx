/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { useFirm } from './contexts';
import { I } from './icons';
import { SubBar } from './shell';
import { Avatar, Badge, Btn, Panel, Progress, Seg, Stat, Tabs } from './ui';
import { KvBox } from './view_analytical';
import { CRM360, CRMAktivitas, CRMPeluang, CRMSegmentasi } from './view_crm2';
import { EngAnggaran, EngJadwal, EngPortofolio, EngStaffing } from './view_eng2';
import { MSub } from './view_fpm_parts';
import { usePhaseGate, PhaseGateDialog } from './wp_signoff';

/* ============================================================
   Asseris — Client CRM + Engagement Management
   ============================================================ */
const { useState: useStateF } = React;

function ClientCRM() {
  const { fmt, rp } = AMS;
  const { clients, engagementsForClient, setActiveEngagementId, addClient, updateClient } = useFirm();
  const [selId, setSelId] = useStateF(clients[0].id);
  const [q, setQ] = useStateF('');
  const [riskFilter, setRiskFilter] = useStateF('All');
  const [tab, setTab] = useStateF('profil');
  const [form, setForm] = useStateF(null); // {mode:'add'|'edit', data}

  const filtered = clients.filter(c =>
    (riskFilter === 'All' || c.risk === riskFilter) &&
    (q === '' || c.name.toLowerCase().includes(q.toLowerCase()) || c.id.toLowerCase().includes(q.toLowerCase())));
  const sel = clients.find(c => c.id === selId) || clients[0];
  const selEngs = engagementsForClient(sel.id);
  const totalFee = clients.reduce((s, c) => s + c.fee, 0);

  // derived mock contacts + history per client
  const contacts = [
    { name: 'Direktur Keuangan', role: 'CFO', email: 'cfo@' + sel.id.toLowerCase() + '.co.id', phone: '+62 21 5• ••• •••', pic: true },
    { name: 'Kepala Akuntansi', role: 'Accounting Manager', email: 'acct@' + sel.id.toLowerCase() + '.co.id', phone: '+62 21 5• ••• •••' },
    { name: 'Komite Audit', role: 'Audit Committee Chair', email: 'auditcom@' + sel.id.toLowerCase() + '.co.id', phone: '—' },
  ];
  const history = [
    { d: '2026-03-02', t: 'Fieldwork dimulai untuk ' + sel.id, who: 'Anindya P.', icon: 'briefcase' },
    { d: '2026-01-15', t: 'Engagement letter ' + (sel.since + 9) + ' ditandatangani', who: 'Hartono W.', icon: 'doc' },
    { d: '2025-12-20', t: 'Penilaian penerimaan & keberlanjutan klien (lulus)', who: 'Sari D.', icon: 'check' },
    { d: '2025-11-08', t: 'Konfirmasi independensi tim diperoleh', who: 'Sistem', icon: 'shield' },
    { d: String(sel.since) + '-04-01', t: 'Klien diterima — perikatan pertama', who: 'Partner', icon: 'flag' },
  ];

  const detailTabs = [{ id: 'profil', label: 'Profil' }, { id: 'kontak', label: 'Kontak' }, { id: 'riwayat', label: 'Riwayat' }, { id: 'engagement', label: 'Engagement', count: selEngs.length }];

  const [mtab, setMtab] = useStateF(() => localStorage.getItem('ams.crm.tab') || 'direktori');
  React.useEffect(() => { try { localStorage.setItem('ams.crm.tab', mtab); } catch (e) {} }, [mtab]);
  const crmTabs = [
    { id: 'direktori', label: 'Direktori', icon: 'users' },
    { id: '360', label: '360° Klien', icon: 'target' },
    { id: 'aktivitas', label: 'Aktivitas', icon: 'pulse' },
    { id: 'peluang', label: 'Peluang', icon: 'trend' },
    { id: 'segmentasi', label: 'Segmentasi', icon: 'table' },
  ];

  return (
    <>
      <SubBar moduleId="crm" right={mtab === 'direktori' ?
        <div className="row gap8">
          <Btn sm><I.upload size={13} /> Import</Btn>
          <Btn sm variant="primary" onClick={() => setForm({ mode: 'add', data: blankClient() })}><I.plus size={14} /> Klien Baru</Btn>
        </div> :
        <Badge kind="blue">Firma-wide</Badge>
      } />
      <MSub tabs={crmTabs} active={mtab} onChange={setMtab} />
      {mtab === '360' && <CRM360 />}
      {mtab === 'aktivitas' && <CRMAktivitas />}
      {mtab === 'peluang' && <CRMPeluang />}
      {mtab === 'segmentasi' && <CRMSegmentasi />}
      {mtab === 'direktori' && <div className="view-scroll">
        <div className="view-pad">
          {/* KPI strip */}
          <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 12 }}>
            <Panel className="row" ><div style={{ padding: '11px 14px' }}><Stat value={clients.length} label="Total Klien" delta="+1 QoQ" deltaDir="up" /></div></Panel>
            <Panel><div style={{ padding: '11px 14px' }}><Stat value={clients.filter(c => c.status === 'Active').length} label="Klien Aktif" /></div></Panel>
            <Panel><div style={{ padding: '11px 14px' }}><Stat value={'Rp ' + fmt(totalFee / 1e9, 1) + ' M'} label="Total Annual Fee" delta="+11%" deltaDir="up" /></div></Panel>
            <Panel><div style={{ padding: '11px 14px' }}><Stat value={clients.filter(c => c.risk === 'High').length} label="Klien Risiko Tinggi" accent="var(--red)" /></div></Panel>
          </div>

          <div className="grid" style={{ gridTemplateColumns: '1.55fr 1fr', gap: 12, alignItems: 'start' }}>
            {/* Client list */}
            <Panel noBody>
              <div className="panel-h">
                <h3>Direktori Klien</h3>
                <div style={{ flex: 1 }} />
                <div className="global-search" style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', height: 26, maxWidth: 200 }}>
                  <I.search2 size={13} style={{ color: 'var(--ink-4)' }} />
                  <input style={{ color: 'var(--ink)' }} placeholder="Cari klien…" value={q} onChange={e => setQ(e.target.value)} />
                </div>
                <Seg options={['All', 'High', 'Medium', 'Low']} value={riskFilter} onChange={setRiskFilter} />
              </div>
              <div style={{ maxHeight: 460, overflow: 'auto' }}>
                <table className="dtbl">
                  <thead><tr>
                    <th>Klien</th><th>Industri</th><th>Tier</th><th>Risiko</th><th className="r">Annual Fee</th><th>Status</th>
                  </tr></thead>
                  <tbody>
                    {filtered.map(c => (
                      <tr key={c.id} className={c.id === sel.id ? 'sel' : ''} onClick={() => { setSelId(c.id); setTab('profil'); }} style={{ cursor: 'pointer' }}>
                        <td>
                          <div className="row ac gap8">
                            <span style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--navy)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700, flex: '0 0 28px' }}>{c.name.replace('PT ', '').slice(0, 2).toUpperCase()}</span>
                            <div style={{ minWidth: 0 }}>
                              <div className="truncate" style={{ fontWeight: 600, maxWidth: 180 }}>{c.name}</div>
                              <div className="tiny muted mono">{c.id} {c.listed && <span className="badge b-blue" style={{ padding: '0 5px', fontSize: 9 }}>IDX</span>}</div>
                            </div>
                          </div>
                        </td>
                        <td className="tiny muted truncate" style={{ maxWidth: 130 }}>{c.industry}</td>
                        <td><span className="chip tiny">{c.tier}</span></td>
                        <td><Badge>{c.risk}</Badge></td>
                        <td className="num">{rp(c.fee / 1e6, 0)} jt</td>
                        <td><Badge>{c.status}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>

            {/* Client detail */}
            <Panel noBody>
              <div style={{ background: 'linear-gradient(120deg,#013a52,#005085)', color: '#fff', padding: '14px 16px' }}>
                <div className="row ac gap12">
                  <span style={{ width: 46, height: 46, borderRadius: 10, background: 'rgba(255,255,255,.15)', display: 'grid', placeItems: 'center', fontSize: 16, fontWeight: 700 }}>{sel.name.replace('PT ', '').slice(0, 2).toUpperCase()}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 700 }} className="truncate">{sel.name}</div>
                    <div style={{ fontSize: 11.5, color: '#bcd6e4' }}>{sel.industry}</div>
                  </div>
                  <button className="top-btn" title="Edit klien" onClick={() => setForm({ mode: 'edit', data: { ...sel } })}><I.doc size={16} /></button>
                </div>
              </div>
              <div style={{ padding: '0 12px', borderBottom: '1px solid var(--line)' }}><Tabs tabs={detailTabs} active={tab} onChange={setTab} /></div>

              <div style={{ padding: '14px 16px' }}>
                {tab === 'profil' && (
                  <>
                    <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '10px 14px' }}>
                      {[['NPWP', sel.npwp, true], ['Domisili', sel.city], ['Klien Sejak', sel.since], ['Partner', sel.partner.split(',')[0]], ['Tingkat Risiko', sel.risk, false, true], ['Annual Fee', rp(sel.fee / 1e6) + ' juta', true]].map(([k, v, mono, badge]) => (
                        <div key={k}>
                          <div className="tiny muted upper" style={{ marginBottom: 2 }}>{k}</div>
                          {badge ? <Badge>{v}</Badge> : <div className={mono ? 'mono' : ''} style={{ fontSize: 12.5, fontWeight: 600 }}>{v}</div>}
                        </div>
                      ))}
                    </div>
                    <div className="divider" />
                    <div className="row gap8">
                      <Btn sm variant="primary" style={{ flex: 1 }} onClick={() => setForm({ mode: 'edit', data: { ...sel } })}><I.doc size={14} /> Edit Profil</Btn>
                      <Btn sm icon><I.mail size={14} /></Btn>
                    </div>
                  </>
                )}
                {tab === 'kontak' && (
                  <div style={{ display: 'grid', gap: 9 }}>
                    {contacts.map((ct, i) => (
                      <div key={i} className="panel" style={{ padding: 10, display: 'flex', gap: 10, alignItems: 'center' }}>
                        <Avatar name={ct.name} size={32} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="row ac gap6"><span style={{ fontSize: 12.5, fontWeight: 600 }}>{ct.name}</span>{ct.pic && <span className="badge b-blue" style={{ fontSize: 8.5, padding: '0 5px' }}>PIC</span>}</div>
                          <div className="tiny muted">{ct.role}</div>
                          <div className="tiny mono" style={{ color: 'var(--blue)' }}>{ct.email}</div>
                        </div>
                        <button className="p-act"><I.mail size={15} /></button>
                      </div>
                    ))}
                    <Btn sm style={{ width: '100%' }}><I.plus size={13} /> Tambah Kontak</Btn>
                  </div>
                )}
                {tab === 'riwayat' && (
                  <div style={{ display: 'grid', gap: 0 }}>
                    {history.map((h, i) => {
                      const IconC = I[h.icon] || I.pulse;
                      return (
                        <div key={i} className="row gap10" style={{ padding: '9px 0', borderBottom: i < history.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
                          <span style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--blue-100)', color: 'var(--blue)', display: 'grid', placeItems: 'center', flex: '0 0 28px' }}><IconC size={14} /></span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12, lineHeight: 1.4 }}>{h.t}</div>
                            <div className="tiny muted">{new Date(h.d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })} · {h.who}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {tab === 'engagement' && (
                  <div style={{ display: 'grid', gap: 0 }}>
                    {selEngs.length === 0 && <div className="muted tiny" style={{ padding: '12px 0' }}>Belum ada engagement untuk klien ini.</div>}
                    {selEngs.map(e => (
                      <div key={e.id} className="row ac gap8" style={{ padding: '9px 0', borderBottom: '1px solid var(--line-soft)', cursor: 'pointer' }} onClick={() => setActiveEngagementId(e.id)}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="row ac gap6"><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{e.id}</span><Badge>{e.status}</Badge></div>
                          <div className="tiny muted">{e.type} · {e.standard}</div>
                        </div>
                        <div style={{ width: 90 }}><div className="row ac gap6"><Progress value={e.progress} /><span className="mono tiny">{e.progress}%</span></div></div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Panel>
          </div>
        </div>
      </div>}
      {form && <ClientForm form={form} onClose={() => setForm(null)} onSave={(data) => {
        if (form.mode === 'add') { addClient(data); setSelId(data.id); } else { updateClient(data.id, data); }
        setForm(null);
      }} />}
    </>
  );
}

function blankClient() {
  const n = Math.floor(Math.random() * 900 + 100);
  return { id: 'C-' + n, name: '', industry: '', tier: 'Tier 2', risk: 'Medium', npwp: '', city: '', listed: false, since: 2026, partner: 'Hartono Wijaya, CPA', fee: 500000000, status: 'Proposal' };
}

function ClientForm({ form, onClose, onSave }) {
  const { fmt } = AMS;
  const [d, setD] = useStateF(form.data);
  const set = (k, v) => setD(s => ({ ...s, [k]: v }));
  const valid = d.name.trim() && d.industry.trim() && d.city.trim();
  const partners = ['Hartono Wijaya, CPA', 'Rudi Gunawan, CPA', 'Sari Dewanti, CPA'];

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,20,30,.4)', zIndex: 90, display: 'grid', placeItems: 'center' }} onClick={onClose}>
      <div className="panel" style={{ width: 560, maxWidth: '94vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-lg)' }} onClick={e => e.stopPropagation()}>
        <div style={{ background: 'linear-gradient(125deg,#013a52,#005085)', color: '#fff', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 10, borderRadius: '4px 4px 0 0' }}>
          <I.users size={18} />
          <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 14 }}>{form.mode === 'add' ? 'Klien Baru' : 'Edit Klien'}</div><div className="tiny" style={{ color: '#bcd6e4' }}>{form.mode === 'add' ? 'Tambahkan klien ke direktori KAP' : d.id}</div></div>
          <button className="top-btn" onClick={onClose}><I.x size={18} /></button>
        </div>
        <div style={{ padding: 16, overflow: 'auto', display: 'grid', gap: 12 }}>
          <div className="grid" style={{ gridTemplateColumns: '2fr 1fr', gap: 10 }}>
            <div className="field"><label>Nama Entitas</label><input className="input" value={d.name} onChange={e => set('name', e.target.value)} placeholder="PT Contoh Sejahtera Tbk" /></div>
            <div className="field"><label>ID Klien</label><input className="input mono" value={d.id} onChange={e => set('id', e.target.value)} /></div>
          </div>
          <div className="field"><label>Industri</label><input className="input" value={d.industry} onChange={e => set('industry', e.target.value)} placeholder="Manufaktur · Consumer Goods" /></div>
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="field"><label>NPWP</label><input className="input mono" value={d.npwp} onChange={e => set('npwp', e.target.value)} placeholder="01.234.567.8-000.000" /></div>
            <div className="field"><label>Domisili</label><input className="input" value={d.city} onChange={e => set('city', e.target.value)} placeholder="Jakarta Selatan" /></div>
          </div>
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <div className="field"><label>Tier</label><select className="select" value={d.tier} onChange={e => set('tier', e.target.value)}>{['Tier 1', 'Tier 2', 'Tier 3'].map(t => <option key={t}>{t}</option>)}</select></div>
            <div className="field"><label>Risiko</label><select className="select" value={d.risk} onChange={e => set('risk', e.target.value)}>{['Low', 'Medium', 'High'].map(t => <option key={t}>{t}</option>)}</select></div>
            <div className="field"><label>Status</label><select className="select" value={d.status} onChange={e => set('status', e.target.value)}>{['Proposal', 'Active', 'Completed'].map(t => <option key={t}>{t}</option>)}</select></div>
          </div>
          <div className="grid" style={{ gridTemplateColumns: '2fr 1fr 1fr', gap: 10 }}>
            <div className="field"><label>Partner Penanggung Jawab</label><select className="select" value={d.partner} onChange={e => set('partner', e.target.value)}>{partners.map(t => <option key={t}>{t}</option>)}</select></div>
            <div className="field"><label>Annual Fee (Rp)</label><input className="input mono" type="number" value={d.fee} onChange={e => set('fee', +e.target.value)} /></div>
            <div className="field"><label>Klien Sejak</label><input className="input mono" type="number" value={d.since} onChange={e => set('since', +e.target.value)} /></div>
          </div>
          <label className="row ac gap8" style={{ cursor: 'pointer', fontSize: 12.5 }}>
            <span onClick={() => set('listed', !d.listed)} style={{ width: 36, height: 20, borderRadius: 11, background: d.listed ? 'var(--blue)' : 'var(--line-strong)', position: 'relative', transition: '.15s' }}><span style={{ position: 'absolute', top: 2, left: d.listed ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: '.15s' }} /></span>
            Emiten tercatat di Bursa Efek Indonesia (IDX)
          </label>
        </div>
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Btn onClick={onClose}>Batal</Btn>
          <Btn variant="primary" disabled={!valid} style={{ opacity: valid ? 1 : .5 }} onClick={() => onSave(d)}><I.check size={14} /> {form.mode === 'add' ? 'Tambah Klien' : 'Simpan'}</Btn>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Engagement Management ---------------- */
function EngagementMgmt() {
  const { fmt, rp } = AMS;
  const { engagements, clients, activeEngagementId, setActiveEngagementId, addEngagement } = useFirm();
  const pg = usePhaseGate();
  const [dragId, setDragId] = useStateF(null);
  const [overPhase, setOverPhase] = useStateF(null);
  const [detailId, setDetailId] = useStateF(null);
  const [showNew, setShowNew] = useStateF(false);

  const phases = ['Perencanaan', 'Eksekusi', 'Finalisasi', 'Arsip'];
  const detail = detailId ? engagements.find(e => e.id === detailId) : null;

  const [mtab, setMtab] = useStateF(() => localStorage.getItem('ams.eng.tab') || 'papan');
  React.useEffect(() => { try { localStorage.setItem('ams.eng.tab', mtab); } catch (e) {} }, [mtab]);
  const engTabs = [
    { id: 'papan', label: 'Papan', icon: 'layers' },
    { id: 'portofolio', label: 'Portofolio', icon: 'table' },
    { id: 'anggaran', label: 'Anggaran & Burn', icon: 'hourglass' },
    { id: 'staffing', label: 'Staffing', icon: 'users' },
    { id: 'jadwal', label: 'Jadwal', icon: 'calendar' },
  ];

  return (
    <>
      <SubBar moduleId="engagement" right={mtab === 'papan' ?
        <div className="row gap8">
          <span className="tiny muted">Tarik kartu antar-kolom untuk ubah fase</span>
          <Btn sm variant="primary" onClick={() => setShowNew(true)}><I.plus size={14} /> Engagement Baru</Btn>
        </div> :
        <Btn sm variant="primary" onClick={() => setShowNew(true)}><I.plus size={14} /> Engagement Baru</Btn>
      } />
      <MSub tabs={engTabs} active={mtab} onChange={setMtab} />
      {mtab === 'portofolio' && <EngPortofolio />}
      {mtab === 'anggaran' && <EngAnggaran />}
      {mtab === 'staffing' && <EngStaffing />}
      {mtab === 'jadwal' && <EngJadwal />}
      {mtab === 'papan' && <div className="view-scroll">
        <div className="view-pad">
          <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 12 }}>
            {[
              { v: engagements.length, l: 'Total Engagement' },
              { v: engagements.filter(e => e.risk === 'High').length, l: 'Risiko Tinggi', a: 'var(--red)' },
              { v: Math.round(engagements.reduce((s, e) => s + e.actualHrs, 0) / 1000) + 'k', l: 'Total Jam Aktual' },
              { v: Math.round(engagements.reduce((s, e) => s + e.progress, 0) / engagements.length) + '%', l: 'Rata-rata Progress' },
            ].map((k, i) => <Panel key={i}><div style={{ padding: '11px 14px' }}><Stat value={k.v} label={k.l} accent={k.a} /></div></Panel>)}
          </div>

          {/* Kanban board by phase */}
          <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, alignItems: 'start' }}>
            {phases.map(ph => {
              const col = engagements.filter(e => e.phase === ph);
              const phColor = { Perencanaan: '#5b3fa6', Eksekusi: '#005085', Finalisasi: '#9a6a00', Arsip: '#1f7a4d' }[ph];
              return (
                <div key={ph}
                  onDragOver={(ev) => { ev.preventDefault(); if (overPhase !== ph) setOverPhase(ph); }}
                  onDragLeave={() => setOverPhase(p => p === ph ? null : p)}
                  onDrop={(ev) => { ev.preventDefault(); if (dragId) { const de = engagements.find(x => x.id === dragId); pg.attempt(dragId, de && de.phase, ph); } setDragId(null); setOverPhase(null); }}
                  style={{ borderRadius: 8, padding: 4, background: overPhase === ph ? 'var(--blue-050)' : 'transparent', outline: overPhase === ph ? '2px dashed var(--blue)' : 'none', minHeight: 80, transition: 'background .12s' }}>
                  <div className="row ac gap8" style={{ marginBottom: 8, padding: '0 4px' }}>
                    <span style={{ width: 9, height: 9, borderRadius: 3, background: phColor }} />
                    <span style={{ fontWeight: 700, fontSize: 12.5 }}>{ph}</span>
                    <span className="chip tiny">{col.length}</span>
                  </div>
                  <div className="grid" style={{ gap: 9 }}>
                    {col.map(e => {
                      const c = clients.find(x => x.id === e.clientId);
                      const over = e.actualHrs / e.budgetHrs;
                      return (
                        <div key={e.id} className="panel"
                          draggable
                          onDragStart={() => setDragId(e.id)}
                          onDragEnd={() => { setDragId(null); setOverPhase(null); }}
                          style={{ padding: 11, cursor: 'grab', borderLeft: '3px solid ' + phColor, boxShadow: e.id === activeEngagementId ? '0 0 0 2px var(--blue)' : undefined, opacity: dragId === e.id ? .4 : 1 }}
                          onClick={() => { setActiveEngagementId(e.id); setDetailId(e.id); }}>
                          <div className="row jb ac" style={{ marginBottom: 6 }}>
                            <span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{e.id}</span>
                            <Badge kind={e.risk === 'High' ? 'red' : e.risk === 'Medium' ? 'amber' : 'green'}>{e.risk}</Badge>
                          </div>
                          <div className="truncate" style={{ fontWeight: 600, fontSize: 12.5, marginBottom: 2 }}>{c?.name.replace('PT ', '')}</div>
                          <div className="tiny muted" style={{ marginBottom: 8 }}>{e.type}</div>
                          <div className="row ac gap6" style={{ marginBottom: 7 }}>
                            <Progress value={e.progress} color={phColor} /><span className="mono tiny" style={{ width: 26 }}>{e.progress}%</span>
                          </div>
                          <div className="row jb tiny muted">
                            <span className="row ac gap6"><Avatar name={e.manager} size={18} />{e.manager.split(' ')[0]}</span>
                            <span className="mono" style={{ color: over > 0.95 ? 'var(--red)' : 'inherit' }}>{fmt(e.actualHrs)}/{fmt(e.budgetHrs)}h</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>}
      {detail && <EngagementDetail e={detail} client={clients.find(c => c.id === detail.clientId)} onClose={() => setDetailId(null)} />}
      {showNew && <EngagementForm clients={clients} onClose={() => setShowNew(false)} onAdd={(e) => { addEngagement(e); setShowNew(false); }} />}
      {pg.pending && <PhaseGateDialog gate={pg.pending.gate} fromPhase={pg.pending.fromPhase} toPhase={pg.pending.toPhase} onConfirm={pg.confirm} onCancel={pg.cancel} />}
    </>
  );
}

/* ---- Engagement detail drawer ---- */
function EngagementDetail({ e, client, onClose }) {
  const { fmt } = AMS;
  const pg = usePhaseGate();
  const phases = ['Perencanaan', 'Eksekusi', 'Finalisasi', 'Arsip'];
  const burn = e.actualHrs / e.budgetHrs;
  const milestones = [
    { t: 'Penerimaan & perencanaan', ph: 'Perencanaan' }, { t: 'Penilaian risiko & materialitas', ph: 'Perencanaan' },
    { t: 'Pengujian pengendalian', ph: 'Eksekusi' }, { t: 'Prosedur substantif', ph: 'Eksekusi' },
    { t: 'Penyelesaian & SAD', ph: 'Finalisasi' }, { t: 'EQR & penerbitan opini', ph: 'Finalisasi' },
  ];
  const phIdx = phases.indexOf(e.phase);

  return (
    <>
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,20,30,.32)', zIndex: 88 }} onClick={onClose}>
      <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 440, maxWidth: '94vw', background: 'var(--surface)', boxShadow: 'var(--shadow-lg)', display: 'flex', flexDirection: 'column' }} onClick={ev => ev.stopPropagation()}>
        <div style={{ background: 'linear-gradient(125deg,#013a52,#005085)', color: '#fff', padding: '15px 18px' }}>
          <div className="row jb ac" style={{ marginBottom: 8 }}>
            <span className="mono tiny" style={{ fontWeight: 700, color: '#bcd6e4' }}>{e.id}</span>
            <button className="top-btn" onClick={onClose}><I.x size={18} /></button>
          </div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{client?.name}</div>
          <div className="tiny" style={{ color: '#bcd6e4' }}>{e.type} · {e.fy} · {e.standard}</div>
          <div className="row gap8" style={{ marginTop: 10 }}>
            <Badge kind={e.risk === 'High' ? 'red' : e.risk === 'Medium' ? 'amber' : 'green'}>{e.risk}</Badge>
            <span className="badge b-blue">{e.status}</span>
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
          {/* phase switcher */}
          <div className="tiny muted upper" style={{ marginBottom: 6 }}>Fase Engagement</div>
          <div className="seg" style={{ width: '100%', marginBottom: 16 }}>
            {phases.map(p => <button key={p} className={e.phase === p ? 'on' : ''} style={{ flex: 1, fontSize: 11 }} onClick={() => pg.attempt(e.id, e.phase, p)}>{p}</button>)}
          </div>

          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            <KvBox label="Partner" v={e.partner.split(',')[0]} />
            <KvBox label="Manajer" v={e.manager} />
            <KvBox label="Materialitas" v={'Rp ' + fmt(e.materiality / 1e6, 0) + ' jt'} />
            <KvBox label="Tenggat" v={new Date(e.deadline).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })} />
          </div>

          {/* budget burn */}
          <div className="panel" style={{ padding: 12, marginBottom: 16 }}>
            <div className="row jb ac" style={{ marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700 }}>Budget Burn</span>
              <span className="mono tiny" style={{ fontWeight: 700, color: burn > 0.95 ? 'var(--red)' : burn > 0.8 ? 'var(--amber)' : 'var(--green)' }}>{Math.round(burn * 100)}%</span>
            </div>
            <Progress value={burn * 100} color={burn > 0.95 ? 'var(--red)' : burn > 0.8 ? 'var(--amber)' : 'var(--green)'} />
            <div className="row jb tiny muted" style={{ marginTop: 5 }}><span>{fmt(e.actualHrs)} jam aktual</span><span>anggaran {fmt(e.budgetHrs)} jam</span></div>
          </div>

          {/* milestones */}
          <div className="tiny muted upper" style={{ marginBottom: 8 }}>Milestone</div>
          <div style={{ display: 'grid', gap: 0 }}>
            {milestones.map((m, i) => {
              const mPhIdx = phases.indexOf(m.ph);
              const done = mPhIdx < phIdx || (mPhIdx === phIdx && e.progress >= 50);
              const active = mPhIdx === phIdx;
              return (
                <div key={i} className="row gap8" style={{ padding: '7px 0', borderBottom: i < milestones.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
                  <span style={{ flex: '0 0 18px', width: 18, height: 18, borderRadius: '50%', background: done ? 'var(--green)' : active ? 'var(--blue)' : 'var(--surface-3)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 10 }}>{done ? <I.check size={11} /> : active ? '•' : ''}</span>
                  <span style={{ fontSize: 12, color: done ? 'var(--ink-3)' : 'var(--ink)', fontWeight: active ? 600 : 400 }}>{m.t}</span>
                  {active && <span className="badge b-blue" style={{ marginLeft: 'auto' }}>Aktif</span>}
                </div>
              );
            })}
          </div>
        </div>
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--line)', display: 'flex', gap: 8 }}>
          <Btn variant="primary" style={{ flex: 1 }}><I.briefcase size={14} /> Buka Workspace</Btn>
          <Btn icon><I.sparkle size={14} /></Btn>
        </div>
      </div>
    </div>
    {pg.pending && <PhaseGateDialog gate={pg.pending.gate} fromPhase={pg.pending.fromPhase} toPhase={pg.pending.toPhase} onConfirm={pg.confirm} onCancel={pg.cancel} />}
    </>
  );
}

function EngagementForm({ clients, onClose, onAdd }) {
  const [d, setD] = useStateF({ clientId: clients[0].id, type: 'Audit Laporan Keuangan', standard: 'SA', partner: 'Hartono Wijaya, CPA', manager: 'Anindya Pramesti', deadline: '2026-04-30', budgetHrs: 1200, materiality: 2000000000, risk: 'Medium' });
  const set = (k, v) => setD(s => ({ ...s, [k]: v }));
  const valid = d.clientId && +d.budgetHrs > 0;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,20,30,.4)', zIndex: 90, display: 'grid', placeItems: 'center' }} onClick={onClose}>
      <div className="panel" style={{ width: 560, maxWidth: '94vw', boxShadow: 'var(--shadow-lg)' }} onClick={e => e.stopPropagation()}>
        <div style={{ background: 'linear-gradient(125deg,#013a52,#005085)', color: '#fff', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 10, borderRadius: '4px 4px 0 0' }}>
          <I.briefcase size={18} /><div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 14 }}>Engagement Baru</div><div className="tiny" style={{ color: '#bcd6e4' }}>Mulai perikatan audit baru (fase Perencanaan)</div></div>
          <button className="top-btn" onClick={onClose}><I.x size={18} /></button>
        </div>
        <div style={{ padding: 16, display: 'grid', gap: 12 }}>
          <div className="field"><label>Klien</label><select className="select" value={d.clientId} onChange={e => set('clientId', e.target.value)}>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div className="grid" style={{ gridTemplateColumns: '1.4fr 1fr', gap: 10 }}>
            <div className="field"><label>Jenis Perikatan</label><select className="select" value={d.type} onChange={e => set('type', e.target.value)}>{['Audit Laporan Keuangan', 'Review (SPR 2400)', 'Agreed-Upon Procedures'].map(s => <option key={s}>{s}</option>)}</select></div>
            <div className="field"><label>Standar</label><select className="select" value={d.standard} onChange={e => set('standard', e.target.value)}>{['SA', 'SA + PSAK 71', 'SA + PSAK 73', 'SPR 2400', 'SJAH 3000'].map(s => <option key={s}>{s}</option>)}</select></div>
          </div>
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="field"><label>Partner</label><select className="select" value={d.partner} onChange={e => set('partner', e.target.value)}>{['Hartono Wijaya, CPA', 'Rudi Gunawan, CPA', 'Sari Dewanti, CPA'].map(s => <option key={s}>{s}</option>)}</select></div>
            <div className="field"><label>Manajer</label><select className="select" value={d.manager} onChange={e => set('manager', e.target.value)}>{['Anindya Pramesti', 'Bayu Saputra', 'Citra Halim'].map(s => <option key={s}>{s}</option>)}</select></div>
          </div>
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <div className="field"><label>Anggaran Jam</label><input className="input mono" type="number" value={d.budgetHrs} onChange={e => set('budgetHrs', +e.target.value)} style={{ textAlign: 'right' }} /></div>
            <div className="field"><label>Risiko</label><select className="select" value={d.risk} onChange={e => set('risk', e.target.value)}>{['Low', 'Medium', 'High'].map(s => <option key={s}>{s}</option>)}</select></div>
            <div className="field"><label>Tenggat</label><input className="input" type="date" value={d.deadline} onChange={e => set('deadline', e.target.value)} /></div>
          </div>
        </div>
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Btn onClick={onClose}>Batal</Btn>
          <Btn variant="primary" disabled={!valid} style={{ opacity: valid ? 1 : .5 }} onClick={() => onAdd(d)}><I.check size={14} /> Buat Engagement</Btn>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ClientCRM, EngagementMgmt, EngagementDetail });

/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { ClientCRM, EngagementDetail, EngagementMgmt };
