/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { useAudit, useNav } from './contexts';
import { I } from './icons';
import { Badge, Panel, Progress, Seg, Stat } from './ui';
import { HBars } from './view_fpm_parts';

/* ============================================================
   Asseris — Alur Data & Integritas · extra tabs
   Aturan Integritas · Propagasi Master Data · Jejak Audit.
   (Lineage chain stays in view_dataflow.jsx.)
   ============================================================ */
const { useState: useDF2 } = React;

const DF2_SEV = { 'Kritis': '#b3261e', 'Tinggi': '#d4641c', 'Sedang': '#caa53d' };
const DF2_STAT = { pass: { c: 'green', i: 'checkCircle', l: 'Lolos' }, warn: { c: 'amber', i: 'alert', l: 'Peringatan' }, err: { c: 'red', i: 'x', l: 'Gagal' } };

/* ---------------- Aturan Integritas ---------------- */
function DFAturan() {
  const RULES: any = AMS.INTEGRITY_RULES;
  const [cat, setCat] = useDF2('All');
  const cats = ['All', ...Array.from(new Set(RULES.map((r: any) => r.cat)))];
  const rows = cat === 'All' ? RULES : RULES.filter((r: any) => r.cat === cat);

  const pass = RULES.filter((r: any) => r.status === 'pass').length;
  const warn = RULES.filter((r: any) => r.status === 'warn').length;
  const err = RULES.filter((r: any) => r.status === 'err').length;
  const byCat = Array.from(new Set(RULES.map((r: any) => r.cat))).map((c: any) => ({ c, n: RULES.filter((r: any) => r.cat === c).length, ok: RULES.filter((r: any) => r.cat === c && r.status === 'pass').length }));

  return (
    <div className="view-scroll"><div className="view-pad">
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 12 }}>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={RULES.length} label="Aturan Integritas" /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={pass} label="Lolos" accent="var(--green)" /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={warn} label="Peringatan" accent={warn ? 'var(--amber)' : 'var(--green)'} /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={err} label="Gagal" accent={err ? 'var(--red)' : 'var(--green)'} /></div></Panel>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 2.4fr', gap: 12, alignItems: 'start' }}>
        <Panel title="Per Kategori" sub="aturan lolos / total">
          <div style={{ padding: 14, display: 'grid', gap: 11 }}>
            {byCat.map((c: any) => (
              <div key={c.c}>
                <div className="row jb tiny" style={{ marginBottom: 3 }}><span style={{ fontWeight: 600 }}>{c.c}</span><span className="mono" style={{ fontWeight: 700 }}>{c.ok}/{c.n}</span></div>
                <Progress value={c.ok / c.n * 100} color={c.ok === c.n ? 'var(--green)' : 'var(--amber)'} />
              </div>
            ))}
          </div>
        </Panel>

        <Panel noBody>
          <div className="panel-h"><h3>Katalog Aturan</h3><div style={{ flex: 1 }} /><Seg options={cats} value={cat} onChange={setCat} /></div>
          <table className="dtbl">
            <thead><tr><th>ID</th><th>Aturan</th><th>Kategori</th><th>Severitas</th><th>Cakupan</th><th>Status</th><th>Detail</th></tr></thead>
            <tbody>
              {rows.map((r: any) => {
                const st = (DF2_STAT as any)[r.status];
                return (
                  <tr key={r.id}>
                    <td className="mono tiny" style={{ fontWeight: 700 }}>{r.id}</td>
                    <td style={{ fontWeight: 600, maxWidth: 240 }} className="truncate">{r.rule}</td>
                    <td className="tiny muted">{r.cat}</td>
                    <td><span className="badge" style={{ background: (DF2_SEV as any)[r.severity], color: '#fff', fontSize: 9 }}>{r.severity}</span></td>
                    <td className="tiny">{r.scope}</td>
                    <td><Badge kind={st.c}>{st.l}</Badge></td>
                    <td className="tiny muted truncate" style={{ maxWidth: 180 }}>{r.detail}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Panel>
      </div>
    </div></div>
  );
}

/* ---------------- Propagasi Master Data ---------------- */
function DFPropagasi() {
  const nav = useNav();
  /* master field × consuming module matrix */
  const fields = ['Materialitas', 'Partner Penanggung Jawab', 'Klasifikasi Risiko', 'Standar Pelaporan', 'Annual Fee', 'NPWP / Identitas'];
  const modules = [
    { id: 'materiality', label: 'Materiality', icon: 'target' },
    { id: 'wtb', label: 'Working TB', icon: 'table' },
    { id: 'risk', label: 'Risk Assessment', icon: 'shield' },
    { id: 'opinion', label: 'Audit Opinion', icon: 'gavel' },
    { id: 'billing', label: 'Billing', icon: 'receipt' },
    { id: 'governance', label: 'Independensi', icon: 'building' },
  ];
  /* which field feeds which module */
  const M = {
    'Materialitas': ['materiality', 'wtb', 'opinion'],
    'Partner Penanggung Jawab': ['governance', 'opinion'],
    'Klasifikasi Risiko': ['risk', 'materiality'],
    'Standar Pelaporan': ['wtb', 'opinion'],
    'Annual Fee': ['billing', 'governance'],
    'NPWP / Identitas': ['billing'],
  };

  return (
    <div className="view-scroll"><div className="view-pad">
      <Panel noBody className="mb12">
        <div className="panel-h"><h3>Sumber Kebenaran Tunggal</h3><div style={{ flex: 1 }} /><span className="tiny muted">satu master → banyak konsumen (referensial)</span></div>
        <div style={{ padding: '18px 16px' }} className="row gap12 ac">
          <div style={{ flex: '0 0 200px', textAlign: 'center' }}>
            <div style={{ background: 'linear-gradient(120deg,#013a52,#005085)', color: '#fff', borderRadius: 12, padding: '16px 14px' }}>
              <I.building size={26} />
              <div style={{ fontSize: 13, fontWeight: 700, marginTop: 6 }}>Master Klien & Perikatan</div>
              <div className="tiny" style={{ color: '#bcd6e4' }}>CRM + Engagement</div>
            </div>
          </div>
          <div style={{ flex: '0 0 auto', color: 'var(--ink-4)' }}><I.arrowRight size={22} /></div>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', gap: 8, flex: 1 }}>
            {modules.map((m: any) => (
              <div key={m.id} onClick={() => nav(m.id)} className="panel" style={{ padding: '10px 12px', boxShadow: 'none', cursor: 'pointer' }}>
                <div className="row ac gap8"><span style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--blue-100)', color: 'var(--blue)', display: 'grid', placeItems: 'center', flex: '0 0 28px' }}>{React.createElement((I as any)[m.icon] || I.panel, { size: 15 })}</span><span style={{ fontSize: 12, fontWeight: 600 }}>{m.label}</span></div>
              </div>
            ))}
          </div>
        </div>
      </Panel>

      <Panel noBody>
        <div className="panel-h"><h3>Matriks Propagasi Field → Modul</h3><div style={{ flex: 1 }} /><span className="tiny muted">● = field master mengalir ke modul</span></div>
        <div style={{ overflowX: 'auto' }}>
          <table className="dtbl" style={{ minWidth: 720 }}>
            <thead><tr><th style={{ minWidth: 200 }}>Field Master</th>{modules.map((m: any) => <th key={m.id} className="num" style={{ width: 86 }}>{m.label}</th>)}</tr></thead>
            <tbody>
              {fields.map((f: any) => (
                <tr key={f}>
                  <td style={{ fontWeight: 600 }}>{f}</td>
                  {modules.map((m: any) => (
                    <td key={m.id} className="num" style={{ textAlign: 'center' }}>
                      {(M as any)[f].includes(m.id) ? <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--blue)', display: 'inline-block' }} /> : <span className="muted">·</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="tiny muted" style={{ padding: '10px 14px', lineHeight: 1.5 }}>Setiap perubahan pada field master otomatis tervalidasi & mengalir ke modul konsumen — menjamin konsistensi referensial lintas-modul tanpa entri ganda.</div>
      </Panel>
    </div></div>
  );
}

/* ---------------- Jejak Audit ---------------- */
function DFJejak() {
  const nav = useNav();
  const { logEntries } = useAudit();
  const TRAIL: any = AMS.AUDIT_TRAIL;
  const [mod, setMod] = useDF2('All');

  /* merge live session log with seed trail */
  const live = (logEntries || []).map((l: any) => ({ ts: l.ts, user: 'Anindya P.', action: l.action || l.what || 'Aktivitas', entity: l.entity || l.detail || '', module: l.module || '—' }));
  const all = [...live, ...TRAIL];
  const mods = ['All', ...Array.from(new Set(all.map((t: any) => t.module)))];
  const rows = mod === 'All' ? all : all.filter((t: any) => t.module === mod);

  const byUser = Object.values(all.reduce((m, t) => { m[t.user] = m[t.user] || { user: t.user, n: 0 }; m[t.user].n++; return m; }, {} as any)).sort((a: any, b: any) => b.n - a.n);
  const modColor = { risk: '#b3261e', dataflow: '#5b3fa6', aje: '#005085', crm: '#0a6b73', engagement: '#9a6a00', opinion: '#1f7a4d' };

  return (
    <div className="view-scroll"><div className="view-pad">
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 12 }}>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={all.length} label="Total Peristiwa" /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={all.filter((t: any) => (t.ts || '').startsWith('2026-03-05')).length} label="Hari Ini" accent="var(--blue)" /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={new Set(all.map((t: any) => t.module)).size} label="Modul Tersentuh" /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={byUser.length} label="Pengguna Aktif" /></div></Panel>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '2fr 1fr', gap: 12, alignItems: 'start' }}>
        <Panel noBody>
          <div className="panel-h"><h3>Jejak Audit (Immutable Log)</h3><div style={{ flex: 1 }} /><Seg options={mods.map((m: any) => ({ value: m, label: m === 'All' ? 'Semua' : m }))} value={mod} onChange={setMod} /></div>
          <div style={{ maxHeight: 480, overflow: 'auto' }}>
            {rows.map((t, i) => (
              <div key={i} className="row gap10" style={{ padding: '11px 14px', borderBottom: '1px solid var(--line-soft)' }}>
                <span style={{ width: 30, height: 30, borderRadius: 8, background: ((modColor as any)[t.module] || '#5b8aa6'), color: '#fff', display: 'grid', placeItems: 'center', flex: '0 0 30px' }}><I.pulse size={14} /></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5 }}><b>{t.user}</b> — {t.action}</div>
                  <div className="tiny muted">{t.entity}</div>
                </div>
                <div style={{ textAlign: 'right', flex: '0 0 auto' }}>
                  <div className="tiny mono muted">{t.ts}</div>
                  {t.module !== '—' && <span className="chip tiny" style={{ cursor: 'pointer' }} onClick={() => nav(t.module)}>{t.module}</span>}
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Aktivitas per Pengguna">
          <div style={{ padding: 14 }}>
            <HBars rows={byUser.map((u: any) => ({ label: u.user, value: u.n, right: u.n + ' aksi', color: 'var(--navy)' }))} />
            <div className="panel" style={{ padding: '9px 11px', background: 'var(--blue-050)', borderColor: 'transparent', marginTop: 12 }}>
              <div className="tiny" style={{ lineHeight: 1.5 }}><I.lock size={11} /> Jejak audit bersifat append-only & tak-terhapus (ISQM 1) — mendukung penelusuran perubahan data lintas-modul.</div>
            </div>
          </div>
        </Panel>
      </div>
    </div></div>
  );
}

Object.assign(window, { DFAturan, DFPropagasi, DFJejak });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { DFAturan, DFJejak, DFPropagasi };
