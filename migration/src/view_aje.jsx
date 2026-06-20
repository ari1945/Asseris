/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { useAudit, useAuth, useFirm, useNav } from './contexts.jsx';
import { CAP } from './rbac.js';
import { I } from './icons.jsx';
import { SubBar } from './shell.jsx';
import { Badge, Btn, LockBanner, Panel, Seg, Stat, Tabs } from './ui.jsx';
import { AJEForm } from './view_execution.jsx';
import { DiagnosticPanel } from './diagnostics_panel.jsx';
import { amsExportXlsx } from './export_xlsx.js';

/* ============================================================
   NeoSuite AMS — Adjusting & Reclassifying Journal Entries (deep)
   Register · Dampak Laba/Neraca · Persetujuan & Jejak Audit
   Overrides the lightweight AJEView from view_execution.jsx.
   ============================================================ */
const { useState: useStateAJ, useMemo: useMemoAJ } = React;

/* corporate income-tax rate (UU HPP) for deferred/current tax effect */
const AJE_TAX = 0.22;
/* unadjusted FY2025 PBT per klien — reported (adjusted) PBT lands at Rp 85,2 M
   once the three posted entries (−3,94 M) are applied */
const AJE_PBT_UNADJ = 89_140_000_000;
const AJE_FS = { equity: 160_456_000_000, curAssets: 112_300_000_000, curLiab: 81_400_000_000 };
const COVENANT = 1.20;

/* per-entry audit metadata (keyed to seed AJEs). User-added entries derive
   their kind/PBT effect from posted journal lines. */
const AJE_META = {
  'AJE-01': { kind: 'adjusting', mis: 'M-05', pbt: -2_340_000_000, std: 'PSAK 23 · Pisah Batas', cycle: 'Persediaan / BPP', preparer: 'Rina Kusuma', role: 'Junior Auditor', proposedOn: '04 Mei', reviewedOn: '06 Mei', postedOn: '08 Mei', reviewer: 'Anindya Pramesti', partner: 'Hartono Wijaya', taxEffect: true },
  'AJE-02': { kind: 'adjusting', mis: 'M-04', pbt: -620_000_000, std: 'PSAK 71 · ECL', cycle: 'Piutang / CKPN', preparer: 'Dimas Raharjo', role: 'Senior Auditor', proposedOn: '06 Mei', reviewedOn: '10 Mei', postedOn: '12 Mei', reviewer: 'Anindya Pramesti', partner: 'Hartono Wijaya', taxEffect: true },
  'AJE-03': { kind: 'adjusting', mis: 'M-01', pbt: -1_850_000_000, std: 'SA 240 · Kecurangan', cycle: 'Pendapatan / Piutang', preparer: 'Dimas Raharjo', role: 'Senior Auditor', proposedOn: '28 Mei', reviewedOn: '30 Mei', reviewer: 'Anindya Pramesti', partner: 'Hartono Wijaya', taxEffect: true, fraud: true },
  'AJE-04': { kind: 'adjusting', mis: 'M-06', pbt: -980_000_000, std: 'PSAK 57 · Akrual', cycle: 'Beban Gaji / Akrual', preparer: 'Sinta Wulandari', role: 'Senior Auditor', proposedOn: '09 Mei', reviewedOn: '11 Mei', postedOn: '13 Mei', reviewer: 'Anindya Pramesti', partner: 'Hartono Wijaya', taxEffect: true },
  'AJE-05': { kind: 'adjusting', mis: 'M-02', pbt: -1_120_000_000, std: 'PSAK 16 · Penyusutan', cycle: 'BPP / Ak. Penyusutan', preparer: 'Dimas Raharjo', role: 'Senior Auditor', proposedOn: '30 Mei', reviewer: 'Anindya Pramesti', partner: 'Hartono Wijaya', taxEffect: true },
};

const KIND_LABEL = { adjusting: 'Penyesuaian', reclass: 'Reklasifikasi' };
const KIND_KIND = { adjusting: 'blue', reclass: 'teal' };

/* derive signed PBT effect from structured lines: P&L accounts (4-/5-) only,
   profit += credit − debit (revenue credit ↑profit; expense credit ↑profit) */
function ajeDerivePbt(a) {
  if (!Array.isArray(a.lines)) return 0;
  return a.lines.reduce((s, l) => {
    const c = String(l.code || '');
    if (c[0] === '4' || c[0] === '5') return s + ((+l.credit || 0) - (+l.debit || 0));
    return s;
  }, 0);
}
function ajeDeriveKind(a) {
  if (!Array.isArray(a.lines)) return 'adjusting';
  return a.lines.some(l => { const c = String(l.code || '')[0]; return c === '4' || c === '5'; }) ? 'adjusting' : 'reclass';
}
/* current-asset effect (codes 1-1xxx) from structured lines */
function ajeCurAssetEffect(a) {
  if (!Array.isArray(a.lines)) return 0;
  return a.lines.reduce((s, l) => String(l.code || '').startsWith('1-1') ? s + ((+l.debit || 0) - (+l.credit || 0)) : s, 0);
}

function buildAjeModel(aje) {
  return aje.map(a => {
    const m = AJE_META[a.id] || {};
    return {
      ...a,
      kind: m.kind || ajeDeriveKind(a),
      pbt: m.pbt != null ? m.pbt : ajeDerivePbt(a),
      curEff: a.id in AJE_META ? (a.id === 'AJE-01' ? -2_340_000_000 : a.id === 'AJE-03' ? -1_850_000_000 : 0) : ajeCurAssetEffect(a),
      mis: m.mis || null, std: m.std || '—', cycle: m.cycle || '—',
      preparer: m.preparer || 'Saya', role: m.role || 'Auditor',
      proposedOn: m.proposedOn || 'baru saja', reviewedOn: m.reviewedOn || null, postedOn: m.postedOn || null,
      reviewer: m.reviewer || 'Anindya Pramesti', partner: m.partner || 'Hartono Wijaya',
      taxEffect: m.taxEffect !== false, fraud: !!m.fraud,
    };
  });
}

/* ---------- small helpers ---------- */
function AjeKv({ label, v, strong, accent }) {
  return (
    <div className="row jb ac">
      <span className="tiny muted">{label}</span>
      <span className="mono" style={{ fontWeight: strong ? 700 : 600, fontSize: 12.5, color: accent || 'var(--ink)' }}>{v}</span>
    </div>
  );
}
const signColor = (n) => n < 0 ? 'var(--red)' : n > 0 ? 'var(--green)' : 'var(--ink-4)';

/* ============================================================
   SHELL — tabbed AJE module
   ============================================================ */
/* derive structured journal lines for a single AJE (mirror of AjeDrill's fallback) */
function ajeLines(a) {
  return a.lines || [
    { code: a.dr.split(' ')[0], name: a.dr.split(' ').slice(1).join(' ') || a.dr, debit: a.amount, credit: 0 },
    { code: a.cr.split(' ')[0], name: a.cr.split(' ').slice(1).join(' ') || a.cr, debit: 0, credit: a.amount },
  ];
}

function AJEView() {
  const { fmt, rp } = AMS;
  const { aje, addAje, wtb } = useAudit();
  const { locked, activeEngagement, activeClient } = useFirm();
  const auth = useAuth();
  const [exporting, setExporting] = useStateAJ(false);
  // W7 — AJE write needs the aje.edit capability (server-enforced; mirrored here).
  // A Junior Auditor sees the data read-only. Combine with the archive lock.
  const canEditAje = !auth || typeof auth.can !== 'function' || auth.can(CAP.AJE_EDIT);
  const writeLocked = locked || !canEditAje;
  const [tab, setTab] = useStateAJ('register');
  const [showForm, setShowForm] = useStateAJ(false);

  const model = useMemoAJ(() => buildAjeModel(aje), [aje]);
  const posted = model.filter(a => a.status === 'Posted');
  const proposed = model.filter(a => a.status === 'Proposed');
  const reclass = model.filter(a => a.kind === 'reclass');
  const pbtPosted = posted.reduce((s, a) => s + a.pbt, 0);
  const pbtProposed = proposed.reduce((s, a) => s + a.pbt, 0);
  const reportedPbt = AJE_PBT_UNADJ + pbtPosted;
  const accounts = wtb.map(r => ({ code: r.code, name: r.name }));

  // W10.5 Fase 2 — sealed XLSX register: AJE list + every journal line, full-rupiah via rp().
  const onExportXlsx = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const regRows = model.map(a => [a.id, a.desc, KIND_LABEL[a.kind] || a.kind, a.mis || '—', a.cycle, a.std, a.ref, a.status, rp(a.amount), a.pbt === 0 ? '—' : rp(a.pbt)]);
      const lineRows = [];
      model.forEach(a => ajeLines(a).forEach(l => lineRows.push([a.id, l.code, l.name, +l.debit ? rp(+l.debit) : '', +l.credit ? rp(+l.credit) : ''])));
      await amsExportXlsx({
        kind: 'aje-register', scope: 'engagement', scopeId: activeEngagement?.id,
        fileName: `Register AJE - ${activeClient?.name || 'Klien'}.xlsx`,
        firm: 'KAP Wijaya Hartono & Rekan',
        title: `Register Jurnal Penyesuaian & Reklasifikasi — ${activeClient?.name || ''}`,
        meta: [`${activeEngagement?.id || ''} · ${activeEngagement?.fy || 'FY2025'} · SA 450`,
          `${model.length} jurnal · ${posted.length} posted · ${proposed.length} usulan · efek laba & saldo penuh dalam Rupiah`],
        sheets: [
          { name: 'Daftar Jurnal',
            columns: ['No.', 'Deskripsi', 'Jenis', 'Salah Saji', 'Siklus', 'Standar', 'WP', 'Status', 'Nilai', 'Efek Laba'],
            rows: regRows, colWidths: [9, 42, 14, 11, 24, 22, 8, 11, 20, 18] },
          { name: 'Baris Jurnal',
            columns: ['No. AJE', 'Kode Akun', 'Nama Akun', 'Debit', 'Kredit'],
            rows: lineRows, colWidths: [10, 12, 34, 20, 20] },
        ],
      });
    } finally {
      setExporting(false);
    }
  };

  const tabs = [
    { id: 'register', label: 'Daftar Jurnal', count: model.length },
    { id: 'impact', label: 'Dampak Laba & Neraca' },
    { id: 'approvals', label: 'Persetujuan & Jejak Audit', count: proposed.length || null },
  ];

  return (
    <>
      <SubBar moduleId="aje" right={
        <div className="row gap8 ac">
          <Badge kind="blue">SA 450</Badge>
          <Btn sm onClick={onExportXlsx} disabled={exporting}><I.download size={13} /> {exporting ? 'Menyiapkan…' : 'Export Jurnal (XLSX)'}</Btn>
          <Btn sm variant="primary" disabled={writeLocked} style={{ opacity: writeLocked ? .5 : 1 }} title={!canEditAje && !locked ? 'Peran Anda tidak berhak mengubah AJE' : ''} onClick={() => !writeLocked && setShowForm(true)}><I.plus size={14} /> AJE Baru</Btn>
        </div>
      } />
      <div className="view-scroll">
        <div className="view-pad">
          {locked && <LockBanner />}
          {!locked && !canEditAje && (
            <div className="panel" style={{ margin: '0 0 12px', padding: '10px 14px', background: 'var(--amber-bg)', borderColor: 'transparent', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ color: 'var(--amber)' }}><I.lock size={16} /></span>
              <span style={{ fontSize: 12.5, fontWeight: 600 }}>Peran <b>{auth.role}</b> hanya dapat melihat AJE. Penyusunan/posting jurnal memerlukan peran Senior Auditor ke atas (ditegakkan di server).</span>
            </div>
          )}
          <div style={{ marginBottom: 12 }}><DiagnosticPanel area="aje" title="Diagnostik AJE — Temuan Otomatis" /></div>

          {/* KPI strip — always visible */}
          <div className="grid" style={{ gridTemplateColumns: 'repeat(6,1fr)', gap: 12, marginBottom: 12 }}>
            <AjeKpi value={model.length} label="Total Jurnal" />
            <AjeKpi value={posted.length} label="Posted" accent="var(--green)" />
            <AjeKpi value={proposed.length} label="Usulan (Proposed)" accent="var(--amber)" />
            <AjeKpi value={reclass.length} label="Reklasifikasi" accent="var(--teal)" />
            <AjeKpi value={fmt(pbtPosted / 1e6, 0)} label="Efek Posted ke Laba (jt)" accent={signColor(pbtPosted)} />
            <AjeKpi value={fmt(pbtProposed / 1e6, 0)} label="Efek Usulan ke Laba (jt)" accent={signColor(pbtProposed)} />
          </div>

          <Panel noBody style={{ marginBottom: 12 }}>
            <div style={{ padding: '0 12px' }}><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>
          </Panel>

          {tab === 'register' && <AjeRegister model={model} locked={writeLocked} />}
          {tab === 'impact' && <AjeImpact model={model} posted={posted} proposed={proposed} reportedPbt={reportedPbt} pbtPosted={pbtPosted} pbtProposed={pbtProposed} />}
          {tab === 'approvals' && <AjeApprovals model={model} />}
        </div>
      </div>
      {showForm && <AJEForm accounts={accounts} onClose={() => setShowForm(false)} onPost={(entry) => { addAje(entry); setShowForm(false); }} />}
    </>
  );
}

function AjeKpi({ value, label, accent }) {
  return <Panel><div style={{ padding: '11px 14px' }}><Stat value={value} label={label} accent={accent} /></div></Panel>;
}

/* ============================================================
   TAB 1 — Register (enriched list + journal drill)
   ============================================================ */
function AjeRegister({ model, locked }) {
  const { fmt } = AMS;
  const { toggleAjeStatus } = useAudit();
  const nav = useNav();
  const [selId, setSelId] = useStateAJ(model[0] ? model[0].id : null);
  const [filt, setFilt] = useStateAJ('all');

  const rows = model.filter(a => filt === 'all' || (filt === 'posted' && a.status === 'Posted') || (filt === 'proposed' && a.status === 'Proposed') || (filt === 'reclass' && a.kind === 'reclass'));
  const sel = model.find(a => a.id === selId) || null;

  return (
    <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1fr) 332px', gap: 12, alignItems: 'start' }}>
      <Panel noBody>
        <div className="panel-h">
          <h3>Daftar Adjusting & Reclassifying Entries</h3>
          <div style={{ flex: 1 }} />
          <Seg value={filt} onChange={setFilt} options={[{ value: 'all', label: 'Semua' }, { value: 'posted', label: 'Posted' }, { value: 'proposed', label: 'Usulan' }, { value: 'reclass', label: 'Reklas' }]} />
        </div>
        <table className="dtbl">
          <thead><tr>
            <th style={{ width: 64 }}>No.</th>
            <th>Deskripsi</th>
            <th style={{ width: 92 }}>Jenis</th>
            <th style={{ width: 58 }}>Salah Saji</th>
            <th className="num" style={{ width: 110 }}>Nilai (Rp)</th>
            <th className="num" style={{ width: 96 }}>Efek Laba</th>
            <th style={{ width: 92 }}>Status</th>
          </tr></thead>
          <tbody>
            {rows.map(a => (
              <tr key={a.id} onClick={() => setSelId(a.id)} className={selId === a.id ? 'sel' : ''} style={{ cursor: 'pointer' }}>
                <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)', verticalAlign: 'top', paddingTop: 7 }}>
                  {a.id}{a.fraud && <span title="Terkait kecurangan (SA 240)" style={{ marginLeft: 3, color: 'var(--red)' }}>⚑</span>}
                </td>
                <td style={{ maxWidth: 240, whiteSpace: 'normal', lineHeight: 1.35, fontSize: 11.5, padding: '6px 9px' }}>
                  {a.desc}
                  <div className="tiny muted" style={{ marginTop: 2 }}>{a.cycle} · <span className="mono">WP {a.ref}</span> · {a.std}</div>
                </td>
                <td style={{ verticalAlign: 'top', paddingTop: 6 }}><Badge kind={KIND_KIND[a.kind]}>{KIND_LABEL[a.kind]}</Badge></td>
                <td style={{ verticalAlign: 'top', paddingTop: 7 }} className="tiny mono">
                  {a.mis ? <span title="Tertaut ke SAD" style={{ color: 'var(--blue)', cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); nav('sad'); }}>{a.mis}</span> : <span className="muted">—</span>}
                </td>
                <td className="num" style={{ fontWeight: 600, verticalAlign: 'top', paddingTop: 6 }}>{fmt(a.amount)}</td>
                <td className="num" style={{ verticalAlign: 'top', paddingTop: 6, color: signColor(a.pbt) }}>{a.pbt === 0 ? '—' : fmt(a.pbt / 1e6, 0)}</td>
                <td style={{ verticalAlign: 'top', paddingTop: 5 }}>
                  <span onClick={(e) => { e.stopPropagation(); if (!locked) toggleAjeStatus(a.id); }} style={{ cursor: locked ? 'default' : 'pointer' }} title={locked ? '' : 'Klik untuk toggle status'}>
                    <Badge>{a.status}</Badge>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="row gap8 tiny muted" style={{ padding: '8px 12px' }}>
          <span className="row ac gap6"><span style={{ color: 'var(--red)' }}>⚑</span> Terkait kecurangan</span>
          <span>·</span>
          <span>Reklasifikasi tidak berdampak pada laba</span>
          <span>·</span>
          <span>Efek laba dalam Rp jt</span>
        </div>
      </Panel>

      {/* journal drill — right column */}
      {sel ? <AjeDrill a={sel} fmt={fmt} nav={nav} /> : (
        <Panel><div className="tiny muted" style={{ padding: 16, textAlign: 'center' }}>Pilih jurnal untuk melihat detail.</div></Panel>
      )}
    </div>
  );
}

function AjeDrill({ a, fmt, nav }) {
  const lines = a.lines || [
    { code: a.dr.split(' ')[0], name: a.dr.split(' ').slice(1).join(' ') || a.dr, debit: a.amount, credit: 0 },
    { code: a.cr.split(' ')[0], name: a.cr.split(' ').slice(1).join(' ') || a.cr, debit: 0, credit: a.amount },
  ];
  const td = lines.reduce((s, l) => s + (+l.debit || 0), 0);
  const tc = lines.reduce((s, l) => s + (+l.credit || 0), 0);
  const tax = a.taxEffect ? Math.round(Math.abs(a.pbt) * AJE_TAX) : 0;
  const netInc = a.pbt + (a.pbt < 0 ? tax : -tax); // after-tax profit effect

  return (
    <div className="grid" style={{ gap: 12 }}>
      <Panel noBody>
        <div style={{ background: 'linear-gradient(125deg,#013a52,#005085)', color: '#fff', padding: '13px 15px', borderRadius: '4px 4px 0 0' }}>
          <div className="row ac gap8">
            <span className="mono" style={{ fontWeight: 700, fontSize: 14 }}>{a.id}</span>
            <Badge kind={KIND_KIND[a.kind]}>{KIND_LABEL[a.kind]}</Badge>
            <div style={{ flex: 1 }} />
            <Badge>{a.status}</Badge>
          </div>
          <div style={{ fontSize: 12.5, fontWeight: 600, marginTop: 6, lineHeight: 1.4 }}>{a.desc}</div>
          <div className="tiny" style={{ color: '#bcd6e4', marginTop: 4 }}>{a.std} · WP {a.ref}</div>
        </div>
        <table className="dtbl">
          <thead><tr><th>Akun</th><th className="num" style={{ width: 80 }}>Debit (jt)</th><th className="num" style={{ width: 80 }}>Kredit (jt)</th></tr></thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i}>
                <td style={{ lineHeight: 1.25 }}><span className="mono tiny muted">{l.code}</span><div className="tiny" style={{ maxWidth: 150, whiteSpace: 'normal' }}>{l.name}</div></td>
                <td className="num">{+l.debit ? fmt(+l.debit / 1e6, 1) : '—'}</td>
                <td className="num">{+l.credit ? fmt(+l.credit / 1e6, 1) : '—'}</td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr><td>{td === tc ? 'Seimbang ✓' : 'Tidak seimbang'}</td><td className="num">{fmt(td / 1e6, 1)}</td><td className="num">{fmt(tc / 1e6, 1)}</td></tr></tfoot>
        </table>
      </Panel>

      <Panel title="Dampak & Keterkaitan">
        <div style={{ display: 'grid', gap: 7 }}>
          <AjeKv label="Efek laba sebelum pajak" v={(a.pbt < 0 ? '' : '+') + fmt(a.pbt / 1e6, 0) + ' jt'} strong accent={signColor(a.pbt)} />
          <AjeKv label={`Efek pajak (${(AJE_TAX * 100).toFixed(0)}%)`} v={a.taxEffect && a.pbt ? (a.pbt < 0 ? '+' : '−') + fmt(tax / 1e6, 0) + ' jt' : '—'} />
          <AjeKv label="Efek laba neto" v={a.pbt ? (netInc < 0 ? '' : '+') + fmt(netInc / 1e6, 0) + ' jt' : '—'} accent={signColor(netInc)} />
          <div style={{ borderTop: '1px solid var(--line)', margin: '3px 0' }} />
          <AjeKv label="Siklus / Lead schedule" v={a.cycle} />
          <AjeKv label="Disiapkan oleh" v={a.preparer} />
        </div>
        {a.mis && (
          <div className="panel" style={{ marginTop: 10, padding: '9px 11px', background: 'var(--blue-050)', borderColor: 'transparent', borderLeft: '3px solid var(--blue)' }}>
            <div className="tiny" style={{ lineHeight: 1.5 }}>Mengoreksi salah saji <b className="mono">{a.mis}</b> pada Summary of Audit Differences (SA 450). {a.status === 'Posted' ? 'Salah saji ini telah berstatus dikoreksi.' : 'Posting jurnal untuk menandai dikoreksi.'}</div>
          </div>
        )}
        <div className="row gap8" style={{ marginTop: 12 }}>
          {a.mis && <Btn sm style={{ flex: 1 }} onClick={() => nav('sad')}><I.scale size={13} /> Buka SAD {a.mis}</Btn>}
          <Btn sm style={{ flex: 1 }} onClick={() => nav('wtb')}><I.table size={13} /> Lihat di WTB</Btn>
        </div>
      </Panel>
    </div>
  );
}

/* ============================================================
   TAB 2 — Dampak Laba & Neraca
   ============================================================ */
function AjeImpact({ model, posted, proposed, reportedPbt, pbtPosted, pbtProposed }) {
  const { fmt } = AMS;
  const nav = useNav();
  const jt = (n) => fmt(n / 1e6, 0);
  const ifPosted = reportedPbt + pbtProposed;

  // deferred/current tax on total adjustment (posted + proposed)
  const totalPbt = pbtPosted + pbtProposed;
  const tax = Math.round(totalPbt * AJE_TAX);
  const netInc = totalPbt - tax;

  // liquidity / covenant — proposed entries' effect on current assets
  const curEffProposed = proposed.reduce((s, a) => s + (a.curEff || 0), 0);
  const ratioNow = AJE_FS.curAssets / AJE_FS.curLiab;
  const ratioAfter = (AJE_FS.curAssets + curEffProposed) / AJE_FS.curLiab;

  return (
    <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1fr) 340px', gap: 12, alignItems: 'start' }}>
      <div className="grid" style={{ gap: 12 }}>
        <Panel noBody>
          <div className="panel-h">
            <h3>Jembatan Laba Sebelum Pajak</h3>
            <div style={{ flex: 1 }} />
            <span className="tiny muted">Unadjusted → Posted → Usulan · Rp jt</span>
          </div>
          <div style={{ padding: '16px 18px 12px' }}>
            <AjeWaterfall unadj={AJE_PBT_UNADJ} posted={posted} reported={reportedPbt} proposed={proposed} ifPosted={ifPosted} jt={jt} />
            <div className="tiny muted" style={{ marginTop: 22, lineHeight: 1.5 }}>Skala vertikal dipersempit untuk menonjolkan selisih. Batang biru = penyesuaian telah diposting; batang kuning = usulan yang menunggu persetujuan.</div>
          </div>
        </Panel>

        <Panel title="Efek per Pos Laporan Keuangan" sub="dilaporkan vs jika seluruh usulan diposting">
          <table className="dtbl">
            <thead><tr><th>Pos</th><th className="num">Unadjusted</th><th className="num">Posted</th><th className="num">Dilaporkan</th><th className="num">Usulan</th><th className="num">Jika Disetujui</th></tr></thead>
            <tbody>
              <FsRow label="Laba Sebelum Pajak" unadj={AJE_PBT_UNADJ} posted={pbtPosted} proposed={pbtProposed} jt={jt} bold />
              <FsRow label={`Beban Pajak (${(AJE_TAX * 100).toFixed(0)}%)`} unadj={-Math.round(AJE_PBT_UNADJ * AJE_TAX)} posted={-Math.round(pbtPosted * AJE_TAX)} proposed={-Math.round(pbtProposed * AJE_TAX)} jt={jt} />
              <FsRow label="Laba Neto" unadj={AJE_PBT_UNADJ - Math.round(AJE_PBT_UNADJ * AJE_TAX)} posted={pbtPosted - Math.round(pbtPosted * AJE_TAX)} proposed={pbtProposed - Math.round(pbtProposed * AJE_TAX)} jt={jt} bold />
              <FsRow label="Total Ekuitas" unadj={AJE_FS.equity} posted={pbtPosted - Math.round(pbtPosted * AJE_TAX)} proposed={pbtProposed - Math.round(pbtProposed * AJE_TAX)} jt={jt} />
            </tbody>
          </table>
        </Panel>

        <Panel title="Likuiditas & Covenant" sub="dampak usulan terhadap rasio lancar">
          <div className="row gap10" style={{ alignItems: 'stretch' }}>
            <div className="panel" style={{ flex: 1, padding: '11px 13px', boxShadow: 'none', background: 'var(--surface-2)' }}>
              <div className="tiny muted upper">Rasio Lancar (kini)</div>
              <div className="mono" style={{ fontWeight: 700, fontSize: 20, color: 'var(--navy)' }}>{ratioNow.toFixed(2)}×</div>
            </div>
            <div className="panel" style={{ flex: 1, padding: '11px 13px', boxShadow: 'none', background: ratioAfter < COVENANT ? 'var(--red-bg)' : 'var(--surface-2)' }}>
              <div className="tiny muted upper">Jika usulan diposting</div>
              <div className="mono" style={{ fontWeight: 700, fontSize: 20, color: ratioAfter < COVENANT ? 'var(--red)' : 'var(--navy)' }}>{ratioAfter.toFixed(2)}×</div>
            </div>
            <div className="panel" style={{ flex: 1, padding: '11px 13px', boxShadow: 'none', background: 'var(--surface-2)' }}>
              <div className="tiny muted upper">Ambang Covenant</div>
              <div className="mono" style={{ fontWeight: 700, fontSize: 20, color: 'var(--ink-3)' }}>{COVENANT.toFixed(2)}×</div>
            </div>
          </div>
          <div className="panel" style={{ marginTop: 10, padding: '9px 11px', background: ratioAfter < COVENANT ? 'var(--amber-bg)' : 'var(--green-bg)', borderColor: 'transparent' }}>
            <div className="row gap8 ac">
              <span style={{ color: ratioAfter < COVENANT ? 'var(--amber)' : 'var(--green)' }}>{ratioAfter < COVENANT ? <I.alert size={15} /> : <I.checkCircle size={15} />}</span>
              <span className="tiny" style={{ lineHeight: 1.5 }}>{ratioAfter < COVENANT
                ? <>Memposting AJE-03 (pembalikan piutang fiktif) menekan rasio lancar di bawah ambang covenant <b>{COVENANT.toFixed(2)}×</b>. Pertimbangan kualitatif SA 450 — eskalasi ke TCWG.</>
                : <>Rasio lancar tetap di atas ambang covenant meski seluruh usulan diposting.</>}</span>
            </div>
          </div>
        </Panel>
      </div>

      {/* right — summary + tax + conclusion */}
      <div className="grid" style={{ gap: 12 }}>
        <Panel noBody>
          <div style={{ background: 'linear-gradient(125deg,#013a52,#005085)', color: '#fff', padding: '16px 18px' }}>
            <div className="tiny" style={{ color: '#bcd6e4', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 3 }}>Laba Sebelum Pajak (Dilaporkan)</div>
            <div className="mono" style={{ fontSize: 30, fontWeight: 700, lineHeight: 1 }}>Rp {jt(reportedPbt)} jt</div>
            <div className="tiny" style={{ color: '#9fc0d2', marginTop: 5 }}>Unadjusted Rp {jt(AJE_PBT_UNADJ)} jt · {posted.length} penyesuaian posted</div>
          </div>
          <div style={{ padding: '12px 16px', display: 'grid', gap: 7 }}>
            <AjeKv label="Efek posted ke laba" v={(pbtPosted < 0 ? '' : '+') + jt(pbtPosted) + ' jt'} accent={signColor(pbtPosted)} />
            <AjeKv label="Usulan menunggu" v={(pbtProposed < 0 ? '' : '+') + jt(pbtProposed) + ' jt'} accent={signColor(pbtProposed)} />
            <AjeKv label="PBT jika disetujui" v={'Rp ' + jt(ifPosted) + ' jt'} strong />
          </div>
        </Panel>

        <Panel title="Efek Pajak Tangguhan" sub="UU HPP · tarif 22%">
          <div style={{ display: 'grid', gap: 7 }}>
            <AjeKv label="Total penyesuaian (PBT)" v={(totalPbt < 0 ? '' : '+') + jt(totalPbt) + ' jt'} accent={signColor(totalPbt)} />
            <AjeKv label={`Efek pajak (${(AJE_TAX * 100).toFixed(0)}%)`} v={(-tax < 0 ? '' : '+') + jt(-tax) + ' jt'} />
            <div style={{ borderTop: '1px solid var(--line)', margin: '2px 0' }} />
            <AjeKv label="Efek laba neto" v={(netInc < 0 ? '' : '+') + jt(netInc) + ' jt'} strong accent={signColor(netInc)} />
          </div>
          <div className="tiny muted" style={{ marginTop: 9, lineHeight: 1.5 }}>Penyesuaian audit yang berdampak temporer menimbulkan aset/liabilitas pajak tangguhan — telaah rekonsiliasi pajak (WP TX).</div>
        </Panel>

        <Panel title="Kesimpulan">
          <div className="panel" style={{ padding: '11px 12px', background: 'var(--amber-bg)', borderColor: 'transparent' }}>
            <div className="row gap8">
              <span style={{ color: 'var(--amber)' }}><I.alert size={16} /></span>
              <span className="tiny" style={{ lineHeight: 1.5 }}>{proposed.length} usulan senilai Rp {jt(Math.abs(pbtProposed))} jt menunggu persetujuan partner. Jika tidak diposting, dampaknya bergulir ke evaluasi salah saji tidak dikoreksi (SAD).</span>
            </div>
          </div>
          <div className="row gap8" style={{ marginTop: 12 }}>
            <Btn sm variant="primary" style={{ flex: 1 }} onClick={() => nav('sad')}><I.scale size={14} /> Buka SAD</Btn>
            <Btn sm style={{ flex: 1 }}><I.sparkle size={14} /> Telaah AI</Btn>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function FsRow({ label, unadj, posted, proposed, jt, bold }) {
  const reported = unadj + posted;
  const ifPosted = reported + proposed;
  return (
    <tr>
      <td style={{ fontWeight: bold ? 700 : 500 }}>{label}</td>
      <td className="num muted">{jt(unadj)}</td>
      <td className="num" style={{ color: signColor(posted) }}>{posted === 0 ? '—' : (posted > 0 ? '+' : '') + jt(posted)}</td>
      <td className="num" style={{ fontWeight: 600 }}>{jt(reported)}</td>
      <td className="num" style={{ color: signColor(proposed) }}>{proposed === 0 ? '—' : (proposed > 0 ? '+' : '') + jt(proposed)}</td>
      <td className="num" style={{ fontWeight: bold ? 700 : 500 }}>{jt(ifPosted)}</td>
    </tr>
  );
}

/* waterfall: totals anchored to baseline, steps float between cumulatives */
function AjeWaterfall({ unadj, posted, reported, proposed, ifPosted, jt }) {
  const steps = [];
  steps.push({ label: 'Unadjusted', kind: 'total', value: unadj });
  let cum = unadj;
  posted.forEach(a => { steps.push({ label: a.id, kind: 'posted', from: cum, to: cum + a.pbt, delta: a.pbt }); cum += a.pbt; });
  steps.push({ label: 'Dilaporkan', kind: 'subtotal', value: reported });
  cum = reported;
  proposed.forEach(a => { steps.push({ label: a.id, kind: 'proposed', from: cum, to: cum + a.pbt, delta: a.pbt }); cum += a.pbt; });
  steps.push({ label: 'Jika Disetujui', kind: 'final', value: ifPosted });

  const vals = steps.flatMap(s => s.value != null ? [s.value] : [s.from, s.to]);
  const hi = Math.max(...vals), lo = Math.min(...vals);
  const pad = (hi - lo) * 0.35 || 1;
  const max = hi + pad, min = lo - pad;
  const H = 188;
  const y = (v) => H - ((v - min) / (max - min)) * H;
  const colorOf = { total: 'var(--navy)', subtotal: 'var(--blue)', final: 'var(--navy)' };

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: H + 4, position: 'relative' }}>
      {steps.map((s, i) => {
        const isTotal = s.value != null;
        const top = isTotal ? y(s.value) : y(Math.max(s.from, s.to));
        const bot = isTotal ? H : y(Math.min(s.from, s.to));
        const h = Math.max(3, bot - top);
        const col = isTotal ? colorOf[s.kind] : (s.kind === 'proposed' ? 'var(--amber)' : (s.delta < 0 ? 'var(--blue-400)' : 'var(--green)'));
        return (
          <div key={i} style={{ flex: 1, position: 'relative', height: H }}>
            <div style={{ position: 'absolute', left: '14%', right: '14%', top, height: h, background: col, borderRadius: 3, transition: 'all .25s' }} />
            <div style={{ position: 'absolute', left: 0, right: 0, top: top - 16, textAlign: 'center' }} className="mono tiny">
              <span style={{ fontSize: 10.5, fontWeight: 700, color: isTotal ? 'var(--navy)' : (s.kind === 'proposed' ? 'var(--amber)' : 'var(--blue)') }}>
                {isTotal ? jt(s.value) : (s.delta > 0 ? '+' : '') + jt(s.delta)}
              </span>
            </div>
            <div style={{ position: 'absolute', left: -2, right: -2, top: H + 4, textAlign: 'center', fontSize: 9.5, fontWeight: isTotal ? 700 : 500, color: isTotal ? 'var(--ink-2)' : 'var(--ink-4)', lineHeight: 1.2 }}>{s.label}</div>
          </div>
        );
      })}
    </div>
  );
}

/* ============================================================
   TAB 3 — Persetujuan & Jejak Audit
   ============================================================ */
function AjeApprovals({ model }) {
  const proposed = model.filter(a => a.status === 'Proposed');
  const posted = model.filter(a => a.status === 'Posted');

  // build chronological trail from metadata
  const trail = [];
  model.forEach(a => {
    if (a.proposedOn) trail.push({ on: a.proposedOn, id: a.id, who: a.preparer, act: 'menyiapkan usulan jurnal', icon: 'ledger', tone: 'blue' });
    if (a.reviewedOn) trail.push({ on: a.reviewedOn, id: a.id, who: a.reviewer, act: 'mereviu & menyetujui (manajer)', icon: 'check', tone: 'green' });
    if (a.postedOn) trail.push({ on: a.postedOn, id: a.id, who: a.partner, act: 'menyetujui & memposting ke WTB', icon: 'lock', tone: 'navy' });
  });
  const ord = (d) => { const m = { 'Mei': 5, 'Jun': 6 }; const p = String(d).split(' '); return (m[p[1]] || 0) * 100 + (+p[0] || 0); };
  trail.sort((a, b) => ord(b.on) - ord(a.on));

  return (
    <div className="grid" style={{ gridTemplateColumns: 'minmax(0,1fr) 360px', gap: 12, alignItems: 'start' }}>
      <Panel noBody>
        <div className="panel-h"><h3>Alur Persetujuan Jurnal</h3><div style={{ flex: 1 }} /><span className="tiny muted">Penyusun → Manajer → Partner</span></div>
        <div style={{ padding: '4px 0' }}>
          {[...proposed, ...posted].map(a => <ApprovalCard key={a.id} a={a} />)}
        </div>
      </Panel>

      <div className="grid" style={{ gap: 12 }}>
        <Panel noBody>
          <div style={{ background: 'linear-gradient(125deg,#013a52,#005085)', color: '#fff', padding: '14px 16px' }}>
            <div className="tiny" style={{ color: '#bcd6e4', textTransform: 'uppercase', letterSpacing: '.08em' }}>Menunggu Persetujuan Partner</div>
            <div className="mono" style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.1, marginTop: 3 }}>{proposed.length}</div>
            <div className="tiny" style={{ color: '#9fc0d2', marginTop: 2 }}>jurnal usulan dalam antrean</div>
          </div>
          <div style={{ padding: '10px 14px', display: 'grid', gap: 6 }}>
            <div className="tiny muted" style={{ lineHeight: 1.5 }}>Jurnal hanya boleh diposting ke Working Trial Balance setelah disetujui Engagement Partner sesuai kebijakan otorisasi firma (ISQM 1).</div>
          </div>
        </Panel>

        <Panel title="Jejak Audit" sub="kronologis · tak terhapus">
          <div style={{ display: 'grid', gap: 0 }}>
            {trail.map((t, i) => (
              <div key={i} className="row gap10" style={{ padding: '8px 0', borderBottom: i < trail.length - 1 ? '1px solid var(--line-soft)' : 'none', alignItems: 'flex-start' }}>
                <span style={{ width: 26, height: 26, flex: '0 0 26px', borderRadius: 7, background: `var(--${t.tone === 'navy' ? 'surface-3' : t.tone + '-bg'})`, color: `var(--${t.tone === 'navy' ? 'navy' : t.tone})`, display: 'grid', placeItems: 'center', marginTop: 1 }}>
                  {React.createElement(I[t.icon] || I.ledger, { size: 13 })}
                </span>
                <div style={{ flex: 1 }}>
                  <div className="tiny" style={{ lineHeight: 1.4 }}><b>{t.who}</b> {t.act} <span className="mono" style={{ color: 'var(--blue)' }}>{t.id}</span></div>
                  <div className="tiny muted" style={{ marginTop: 1 }}>{t.on} 2026</div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function ApprovalCard({ a }) {
  const { fmt } = AMS;
  const isPosted = a.status === 'Posted';
  const steps = [
    { role: 'Penyusun', who: a.preparer, on: a.proposedOn, done: true },
    { role: 'Manajer (Reviu)', who: a.reviewer, on: a.reviewedOn, done: !!a.reviewedOn },
    { role: 'Partner (Otorisasi)', who: a.partner, on: a.postedOn, done: isPosted },
  ];
  return (
    <div style={{ padding: '11px 14px', borderBottom: '1px solid var(--line)' }}>
      <div className="row ac gap8" style={{ marginBottom: 9 }}>
        <span className="mono" style={{ fontWeight: 700, color: 'var(--blue)' }}>{a.id}</span>
        <Badge kind={KIND_KIND[a.kind]}>{KIND_LABEL[a.kind]}</Badge>
        <span className="tiny" style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.desc}</span>
        <span className="mono tiny" style={{ fontWeight: 700 }}>Rp {fmt(a.amount)}</span>
        <Badge>{a.status}</Badge>
      </div>
      <WorkflowTrack steps={steps} />
    </div>
  );
}

function WorkflowTrack({ steps }) {
  return (
    <div className="row" style={{ alignItems: 'flex-start' }}>
      {steps.map((s, i) => {
        const pending = !s.done;
        return (
          <React.Fragment key={i}>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', margin: '0 auto', display: 'grid', placeItems: 'center',
                background: s.done ? 'var(--green)' : '#fff', border: '2px solid ' + (s.done ? 'var(--green)' : 'var(--line-strong)'),
                color: s.done ? '#fff' : 'var(--ink-4)' }}>
                {s.done ? <I.check size={13} /> : <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--amber)' }} />}
              </div>
              <div className="tiny" style={{ fontWeight: 600, marginTop: 4, color: pending ? 'var(--ink-3)' : 'var(--ink)' }}>{s.role}</div>
              <div className="tiny muted" style={{ lineHeight: 1.3 }}>{s.who.split(' ')[0]}</div>
              <div className="tiny mono" style={{ color: s.done ? 'var(--green)' : 'var(--amber)', fontWeight: 600 }}>{s.done ? s.on || 'selesai' : 'menunggu'}</div>
            </div>
            {i < steps.length - 1 && <div style={{ flex: '0 0 auto', height: 2, width: 18, background: steps[i + 1].done ? 'var(--green)' : 'var(--line-strong)', marginTop: 12 }} />}
          </React.Fragment>
        );
      })}
    </div>
  );
}

Object.assign(window, { AJEView });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { AJEView };
