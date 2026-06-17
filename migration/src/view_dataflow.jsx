/* [codemod] ESM imports */
import React from 'react';
import { useAudit, useFirm, useNav } from './contexts.jsx';
import { useEvidence } from './evidence.jsx';
import { I, MODULE_INDEX } from './icons.jsx';
import { SubBar } from './shell.jsx';
import { Btn, Panel, Stat } from './ui.jsx';
import { DFAturan, DFJejak, DFPropagasi } from './view_dataflow2.jsx';
import { MSub } from './view_fpm_parts.jsx';
import { DFRekonsiliasi } from './view_reconcile.jsx';

/* ============================================================
   NeoSuite AMS — Alur Data & Integritas (Klien → Perikatan → Kerja)
   Memvisualkan lineage data master ke engagement dan menjalankan
   cek integritas referensial & konsistensi lintas modul.
   ============================================================ */
const { useState: useDF } = React;

const DF_KIND = { ok: 'green', warn: 'amber', err: 'red' };
const DF_ICON = { ok: 'checkCircle', warn: 'alert', err: 'x' };

/* ---- Riwayat bukti yang masuk lewat AI Co-pilot (intake) ---- */
function AIIntakeLog() {
  const nav = useNav();
  const log = (typeof useEvidence === 'function') ? useEvidence(null) : [];
  const openCopilot = () => { if (window.__amsOpenCopilot) window.__amsOpenCopilot(); };
  const fileExtIc = (n) => /\.(xlsx|xls|csv)$/i.test(n || '') ? 'table' : 'doc';

  return (
    <Panel title="Bukti Masuk via AI Co-pilot" actions={
      <div className="row ac gap8">
        {log.length > 0 && <span className="tiny muted">{log.length} dokumen terklasifikasi</span>}
        <Btn sm variant="primary" onClick={openCopilot}><I.sparkle size={13} /> Unggah Bukti</Btn>
      </div>
    }>
      <div className="tiny muted" style={{ marginBottom: 10, lineHeight: 1.5 }}>Satu pintu unggah: setiap dokumen yang masuk lewat AI Co-pilot diklasifikasi otomatis dan diarahkan ke modul yang tepat (TB → WTB, kontrak sewa → PSAK 73, dst).</div>
      {log.length === 0 ? (
        <div className="panel" style={{ padding: '20px 16px', textAlign: 'center', borderStyle: 'dashed', background: 'var(--surface-2)' }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--blue-050)', color: 'var(--blue)', display: 'grid', placeItems: 'center', margin: '0 auto 9px' }}><I.upload size={19} /></div>
          <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 3 }}>Belum ada bukti diunggah</div>
          <div className="tiny muted" style={{ maxWidth: 360, margin: '0 auto 11px', lineHeight: 1.5 }}>Unggah neraca saldo, kontrak, konfirmasi, atau daftar aset lewat AI Co-pilot — AI akan mengklasifikasi & menyimpannya ke modul yang sesuai.</div>
          <Btn sm variant="primary" onClick={openCopilot}><I.sparkle size={13} /> Buka AI Co-pilot</Btn>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {log.map((d, i) => {
            const m = MODULE_INDEX[d.module] || { label: d.module, icon: 'panel' };
            const FI = I[fileExtIc(d.file)] || I.doc;
            const DI = I[m.icon] || I.panel;
            return (
              <div key={i} className="row ac gap8" onClick={() => nav(d.module)} title={'Buka ' + (m.label || d.module)}
                style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--surface)', cursor: 'pointer' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--blue)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line)'; }}>
                <span style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--navy)', color: '#fff', display: 'grid', placeItems: 'center', flex: '0 0 28px' }}><FI size={14} /></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="truncate" style={{ fontSize: 12.5, fontWeight: 600 }}>{d.file}</div>
                  <div className="tiny muted">{d.type}{d.when ? ' · ' + d.when : ''}</div>
                </div>
                <span className="chip tiny" style={{ background: 'var(--blue-050)', color: 'var(--blue)', flex: '0 0 auto' }}><DI size={11} /> {m.label}</span>
                {d.std && <span className="mono tiny" style={{ color: 'var(--ink-3)', flex: '0 0 auto' }}>{d.std}</span>}
                <I.chevron size={13} style={{ color: 'var(--ink-4)', flex: '0 0 13px' }} />
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

function DataFlow() {
  const { fmt } = window.AMS;
  const nav = useNav();
  const { clients, engagements, activeEngagement, activeEngagementId, setActiveEngagementId, clientById } = useFirm();
  const { wtb, risks, aje, team } = useAudit();

  const eng = activeEngagement;
  const client = eng ? clientById(eng.clientId) : null;

  /* ---- working-data rollups (represent the active engagement) ---- */
  const tbSum = wtb.reduce((s, r) => s + (r.adj || 0), 0);
  const tbTotal = wtb.reduce((s, r) => s + Math.abs(r.adj || 0), 0) || 1;
  const tbBalanced = Math.abs(tbSum) / tbTotal < 0.005;
  const significant = risks.filter(r => (r.likelihood * r.impact) >= 12).length;
  const postedAje = aje.filter(a => a.status === 'Posted').length;

  /* ---- integrity checks per stage ---- */
  const stage1 = [ // Klien (master)
    { k: 'Klien master terdaftar di CRM', s: client ? 'ok' : 'err', d: client ? client.name : 'Tidak ditemukan' },
    { k: 'NPWP terisi & valid', s: client && /^\d/.test(client.npwp || '') ? 'ok' : 'warn', d: client?.npwp || 'Kosong' },
    { k: 'Partner penanggung jawab ditetapkan', s: client?.partner ? 'ok' : 'err', d: client?.partner || '—' },
    { k: 'Klasifikasi tier & risiko klien', s: client?.tier && client?.risk ? 'ok' : 'warn', d: client ? client.tier + ' · risiko ' + client.risk : '—' },
  ];
  const partnerMatch = client && eng && eng.partner === client.partner;
  const stage2 = [ // Perikatan (turunan)
    { k: 'Perikatan tertaut ke klien (referensial)', s: eng && client && eng.clientId === client.id ? 'ok' : 'err', d: eng ? eng.clientId + ' → ' + (client?.id || '?') : '—' },
    { k: 'Partner perikatan konsisten dgn master klien', s: partnerMatch ? 'ok' : 'warn', d: partnerMatch ? 'Konsisten' : (eng?.partner || '?') + ' ≠ ' + (client?.partner || '?') },
    { k: 'Standar pelaporan ditetapkan', s: eng?.standard ? 'ok' : 'err', d: eng?.standard || '—' },
    { k: 'Materialitas ditetapkan', s: eng?.materiality ? 'ok' : 'warn', d: eng?.materiality ? 'Rp ' + fmt(eng.materiality / 1e6, 0) + ' jt' : 'Belum ditetapkan' },
    { k: 'Anggaran jam tersedia', s: eng?.budgetHrs ? 'ok' : 'warn', d: eng?.budgetHrs ? fmt(eng.budgetHrs) + ' jam' : '—' },
  ];
  const stage3 = [ // Data kerja audit
    { k: 'Working Trial Balance terimpor', s: wtb.length ? 'ok' : 'err', d: wtb.length + ' akun', route: 'wtb' },
    { k: 'Trial balance seimbang (debit = kredit)', s: tbBalanced ? 'ok' : 'warn', d: tbBalanced ? 'Seimbang' : 'Selisih Rp ' + fmt(Math.abs(tbSum) / 1e6, 1) + ' jt', route: 'wtb' },
    { k: 'Penilaian risiko (RoMM) dilakukan', s: risks.length ? 'ok' : 'err', d: risks.length + ' risiko · ' + significant + ' signifikan', route: 'risk' },
    { k: 'Jurnal penyesuaian terkait perikatan', s: 'ok', d: postedAje + ' AJE diposting', route: 'aje' },
    { k: 'Tim perikatan ditugaskan', s: team.length ? 'ok' : 'err', d: team.length + ' anggota', route: 'scheduler' },
  ];

  const allChecks = [...stage1, ...stage2, ...stage3];
  const passed = allChecks.filter(c => c.s === 'ok').length;
  const warns = allChecks.filter(c => c.s === 'warn').length;
  const errs = allChecks.filter(c => c.s === 'err').length;
  const score = Math.round(passed / allChecks.length * 100);

  const [mtab, setMtab] = useDF(() => localStorage.getItem('ams.df.tab') || 'lineage');
  React.useEffect(() => { try { localStorage.setItem('ams.df.tab', mtab); } catch (e) {} }, [mtab]);
  const dfTabs = [
    { id: 'lineage', label: 'Lineage', icon: 'link2' },
    { id: 'rekonsiliasi', label: 'Rekonsiliasi Angka', icon: 'scale' },
    { id: 'aturan', label: 'Aturan Integritas', icon: 'checkCircle' },
    { id: 'propagasi', label: 'Propagasi', icon: 'layers' },
    { id: 'jejak', label: 'Jejak Audit', icon: 'clock' },
  ];

  const Stage = ({ n, title, icon, sub, checks, accent }) => (
    <div className="panel" style={{ flex: 1, minWidth: 0, padding: 0, overflow: 'hidden', borderTop: '3px solid ' + accent }}>
      <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)' }}>
        <div className="row ac gap8" style={{ marginBottom: 2 }}>
          <span style={{ width: 26, height: 26, borderRadius: 7, background: accent, color: '#fff', display: 'grid', placeItems: 'center', flex: '0 0 26px' }}>{React.createElement(I[icon] || I.panel, { size: 15 })}</span>
          <div style={{ minWidth: 0 }}><div className="tiny muted upper" style={{ letterSpacing: '.05em' }}>Tahap {n}</div><div style={{ fontSize: 13, fontWeight: 700 }} className="truncate">{title}</div></div>
        </div>
        <div className="tiny muted truncate">{sub}</div>
      </div>
      <div style={{ padding: 8 }}>
        {checks.map((c, i) => (
          <div key={i} onClick={c.route ? () => nav(c.route) : undefined} className="row ac gap8" style={{ padding: '7px 8px', borderRadius: 6, cursor: c.route ? 'pointer' : 'default' }}>
            <span style={{ color: 'var(--' + DF_KIND[c.s] + ')', flex: '0 0 16px' }}>{React.createElement(I[DF_ICON[c.s]] || I.panel, { size: 15 })}</span>
            <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 11.5, fontWeight: 500, lineHeight: 1.3 }}>{c.k}</div><div className="tiny muted truncate">{c.d}</div></div>
            {c.route && <I.chevron size={12} style={{ color: 'var(--ink-4)', flex: '0 0 12px' }} />}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <>
      <SubBar moduleId="dataflow" right={
        <div className="row gap8 ac">
          <span className="tiny muted">Sumber kebenaran tunggal</span>
          <select className="select" value={activeEngagementId} onChange={e => setActiveEngagementId(e.target.value)} style={{ height: 28, maxWidth: 230 }}>
            {engagements.map(e => { const c = clientById(e.clientId); return <option key={e.id} value={e.id}>{e.id} · {(c?.name || '').replace('PT ', '')}</option>; })}
          </select>
        </div>
      } />
      <MSub tabs={dfTabs} active={mtab} onChange={setMtab} />
      {mtab === 'rekonsiliasi' && <DFRekonsiliasi />}
      {mtab === 'aturan' && <DFAturan />}
      {mtab === 'propagasi' && <DFPropagasi />}
      {mtab === 'jejak' && <DFJejak />}
      {mtab === 'lineage' && <div className="view-scroll"><div className="view-pad">
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={score + '%'} label="Integritas Alur Data" accent={score >= 90 ? 'var(--green)' : score >= 75 ? 'var(--amber)' : 'var(--red)'} /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={passed + ' / ' + allChecks.length} label="Cek Lolos" accent="var(--green)" /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={warns} label="Peringatan" accent={warns ? 'var(--amber)' : 'var(--green)'} /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={errs} label="Pelanggaran Integritas" accent={errs ? 'var(--red)' : 'var(--green)'} /></div></Panel>
        </div>

        {/* lineage chain */}
        <div className="row" style={{ alignItems: 'stretch', gap: 0, marginBottom: 12 }}>
          <Stage n="1" title="Klien (Master)" icon="users" accent="#5b3fa6" sub={client ? client.industry : '—'} checks={stage1} />
          <div style={{ display: 'flex', alignItems: 'center', padding: '0 6px', color: 'var(--ink-4)', flex: '0 0 auto' }}><I.arrowRight size={20} /></div>
          <Stage n="2" title="Perikatan" icon="briefcase" accent="#005085" sub={eng ? eng.id + ' · ' + eng.type : '—'} checks={stage2} />
          <div style={{ display: 'flex', alignItems: 'center', padding: '0 6px', color: 'var(--ink-4)', flex: '0 0 auto' }}><I.arrowRight size={20} /></div>
          <Stage n="3" title="Data Kerja Audit" icon="ledger" accent="#1f7a4d" sub="WTB · Risiko · AJE · Tim" checks={stage3} />
        </div>

        {/* propagation note + consumers */}
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }}>
          <Panel title="Propagasi Master Data ke Modul">
            <div className="tiny muted" style={{ marginBottom: 10, lineHeight: 1.5 }}>Perubahan pada data master klien & perikatan otomatis mengalir ke modul berikut (satu sumber kebenaran):</div>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 7 }}>
              {[['Materiality', 'target', 'materiality'], ['Working Trial Balance', 'table', 'wtb'], ['Risk Assessment', 'shield', 'risk'], ['Profitability', 'coins', 'profitability'], ['Billing & Invoicing', 'receipt', 'billing'], ['Audit Opinion', 'gavel', 'opinion']].map(([l, ic, r]) => (
                <div key={r} onClick={() => nav(r)} className="row ac gap8" style={{ padding: '8px 10px', borderRadius: 7, background: 'var(--surface-2)', cursor: 'pointer' }}>
                  <span style={{ color: 'var(--blue)' }}>{React.createElement(I[ic] || I.panel, { size: 14 })}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>{l}</span>
                  <I.chevron size={12} style={{ color: 'var(--ink-4)' }} />
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Status Referensial & Tindakan">
            {errs > 0 ? (
              <div className="panel" style={{ padding: '10px 12px', background: 'var(--red-bg)', borderColor: 'transparent', marginBottom: 10 }}>
                <div className="row ac gap8"><span style={{ color: 'var(--red)' }}><I.alert size={15} /></span><span className="tiny" style={{ fontWeight: 600, lineHeight: 1.5 }}>{errs} pelanggaran integritas referensial terdeteksi — perbaiki sebelum melanjutkan eksekusi.</span></div>
              </div>
            ) : (
              <div className="panel" style={{ padding: '10px 12px', background: 'var(--green-bg)', borderColor: 'transparent', marginBottom: 10 }}>
                <div className="row ac gap8"><span style={{ color: 'var(--green)' }}><I.checkCircle size={15} /></span><span className="tiny" style={{ fontWeight: 600, lineHeight: 1.5 }}>Rantai data klien → perikatan utuh. Seluruh referensi master tervalidasi.</span></div>
              </div>
            )}
            {warns > 0 && (
              <div className="panel" style={{ padding: '10px 12px', background: 'var(--amber-bg)', borderColor: 'transparent', marginBottom: 10 }}>
                <div className="row ac gap8"><span style={{ color: 'var(--amber)' }}><I.clock size={15} /></span><span className="tiny" style={{ fontWeight: 600, lineHeight: 1.5 }}>{warns} peringatan konsistensi — tinjau sebelum penyelesaian (mis. materialitas, kelengkapan NPWP, keseimbangan WTB).</span></div>
              </div>
            )}
            <div className="row gap8">
              <Btn sm onClick={() => nav('crm')}><I.users size={13} /> Master Klien</Btn>
              <Btn sm onClick={() => nav('engagement')}><I.briefcase size={13} /> Setup Perikatan</Btn>
              <Btn sm onClick={() => nav('onboarding')}><I.flag size={13} /> Onboarding</Btn>
            </div>
          </Panel>
        </div>

        <div style={{ marginTop: 12 }}><AIIntakeLog /></div>

        <div className="tiny muted" style={{ marginTop: 10, lineHeight: 1.5 }}>Integritas alur data memastikan setiap perikatan menarik data dari satu master klien (referensial), konsisten antar-modul, dan lengkap sebelum opini diterbitkan. Memilih perikatan di atas mengubah konteks aktif seluruh aplikasi.</div>
      </div></div>}
    </>
  );
}

Object.assign(window, { DataFlow });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { DataFlow };
