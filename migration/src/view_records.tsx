/* [codemod] ESM imports */
import React from 'react';
import { useNav } from './contexts.jsx';
import { I } from './icons.jsx';
import { SubBar } from './shell.jsx';
import { Btn, Donut, Panel, Tabs } from './ui.jsx';
import { BoStat } from './view_bo1.jsx';
import { PDrawer } from './view_docparts.jsx';
import { KV, SectionTitle } from './view_fpm_parts.jsx';

/* ============================================================
   NeoSuite AMS — Retensi & Arsip (modul mendalam · SA 230 / SPM 1 / ISQM)
   ------------------------------------------------------------
   UI murni penyaji. Seluruh angka ditarik dari window.RETENTION
   (lapisan kanonik) yang sendirinya menderivasi dari DMS_DOCS,
   ENGAGEMENTS/CLIENTS, Legal (sengketa) & Pengadaan (PO pemusnahan).
   ============================================================ */
const { useState: useStateRR, useMemo: useMemoRR } = React;

/* ---- format helpers ---- */
const rrDID = (d: any, o?: any) => d ? new Date(d).toLocaleDateString('id-ID', o || { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const rrSize = (mb) => mb >= 1024 ? (mb / 1024).toFixed(2) + ' GB' : Math.round(mb) + ' MB';
const ARK_KIND = { 'Terkunci': 'green', 'Perakitan': 'amber', 'Jatuh Tempo': 'amber', 'Legal Hold': 'red' };
function ArkBadge({ s }) {
  return <span className={'badge b-' + (ARK_KIND[s] || 'gray')}>{s === 'Legal Hold' && <I.lock size={10} style={{ marginRight: 2 }} />}{s}</span>;
}

/* ---- retention timeline bar (archived → retentionUntil dengan penanda hari ini) ---- */
function RetentionBar({ box }) {
  const R = window.RETENTION;
  if (!box.archivedOn) {
    return <div className="tiny muted" style={{ padding: '6px 0' }}>Belum diarsipkan — masa retensi mulai saat berkas dikunci.</div>;
  }
  const start = new Date(box.archivedOn).getTime();
  const end = new Date(box.retentionUntil).getTime();
  const now = R.today.getTime();
  const pct = Math.max(0, Math.min(100, (now - start) / (end - start) * 100));
  const expired = now >= end;
  const col = box.hold ? 'var(--red)' : expired ? 'var(--amber)' : 'var(--green)';
  return (
    <div>
      <div className="row jb tiny muted" style={{ marginBottom: 4 }}>
        <span>Diarsip {rrDID(box.archivedOn, { month: 'short', year: 'numeric' })}</span>
        <span>Kedaluwarsa {rrDID(box.retentionUntil, { month: 'short', year: 'numeric' })}</span>
      </div>
      <div style={{ position: 'relative', height: 9, borderRadius: 5, background: 'var(--surface-3)', overflow: 'hidden' }}>
        <div style={{ width: pct + '%', height: '100%', borderRadius: 5, background: col }} />
        {box.hold && <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(45deg,transparent,transparent 5px,rgba(179,38,30,.25) 5px,rgba(179,38,30,.25) 10px)' }} />}
      </div>
      <div className="row jb" style={{ marginTop: 5 }}>
        <span className="tiny muted">Retensi {box.retentionYears} thn · {window.RETENTION.classById(box.classId).jenis}</span>
        <span className="mono tiny" style={{ fontWeight: 700, color: col }}>
          {box.hold ? 'Disposal ditangguhkan' : expired ? 'Jatuh tempo ' + Math.abs(Math.round(box.yearsLeft * 12)) + ' bln lalu' : box.yearsLeft.toFixed(1) + ' thn tersisa'}
        </span>
      </div>
    </div>
  );
}

/* ============================================================
   Drawer detail kotak arsip — drill-down dokumen DMS live
   ============================================================ */
function ArchiveDrawer({ box, onClose, nav }) {
  const R = window.RETENTION;
  if (!box) return null;
  const docs = R.docsForEng(box.engId);
  const cls = R.classById(box.classId);
  const assembleDays = box.assembleBy ? R.daysTo(box.assembleBy) : null;
  return (
    <PDrawer open={!!box} onClose={onClose} width={620}>
      <div className="pdrawer-h">
        <span className="pdrawer-ico" style={{ background: 'var(--blue-050)', color: 'var(--blue)' }}><I.archive size={18} /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.3 }}>{box.client}</div>
          <div className="row ac gap8" style={{ marginTop: 4 }}>
            <span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{box.id}</span>
            <span className="badge b-gray" style={{ textTransform: 'none' }}>{box.engId} · {box.fy}</span>
            <ArkBadge s={box.status} />
          </div>
        </div>
      </div>

      <div style={{ padding: '6px 16px 18px', flex: 1, overflow: 'auto', minHeight: 0 }}>
        {/* Legal hold */}
        {box.hold && (
          <div className="panel" style={{ padding: '11px 13px', marginBottom: 14, background: 'var(--red-bg)', borderColor: 'transparent' }}>
            <div className="row jb ac" style={{ marginBottom: 4 }}>
              <span className="tiny" style={{ fontWeight: 700, color: 'var(--red)' }}><I.gavel size={12} style={{ verticalAlign: -2 }} /> Legal Hold {box.hold.id} — disposal ditangguhkan</span>
              <button className="chip tiny" style={{ cursor: 'pointer', height: 20 }} onClick={() => nav('legal', { from: 'records' })}><I.arrowRight size={10} /> Legal</button>
            </div>
            <div className="tiny" style={{ lineHeight: 1.5 }}>{box.hold.reason}</div>
            <div className="tiny muted" style={{ marginTop: 4 }}>Sejak {rrDID(box.hold.since)} · diperintah {box.hold.by}{box.hold.disputeId ? ' · sengketa ' + box.hold.disputeId : ''}</div>
          </div>
        )}

        {/* Perakitan SA 230 */}
        {box.status === 'Perakitan' && (
          <div className="panel" style={{ padding: '11px 13px', marginBottom: 14, background: 'var(--amber-bg)', borderColor: 'transparent' }}>
            <div className="tiny" style={{ fontWeight: 600, lineHeight: 1.5 }}>
              <I.layers size={12} style={{ verticalAlign: -2, color: 'var(--amber)' }} /> Perakitan berkas final (SA 230 ¶A21) — tenggat {rrDID(box.assembleBy)}{assembleDays != null && <> · <b>{assembleDays < 0 ? Math.abs(assembleDays) + ' hari lewat' : assembleDays + ' hari lagi'}</b></>}. Setelah dikunci, berkas menjadi read-only & masa retensi {cls.years} thn mulai berjalan.
            </div>
          </div>
        )}

        {/* Timeline retensi */}
        <SectionTitle>Masa Retensi & Disposal</SectionTitle>
        <div className="panel" style={{ padding: '12px 14px', marginBottom: 14 }}><RetentionBar box={box} /></div>

        {/* Meta */}
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
          <KV label="Kelas retensi" v={cls.jenis} />
          <KV label="Dasar" v={cls.dasar} />
          <KV label="Diarsipkan" v={rrDID(box.archivedOn)} />
          <KV label="Retensi s/d" v={rrDID(box.retentionUntil)} accent={box.status === 'Jatuh Tempo' ? 'var(--amber)' : undefined} />
          <KV label="Ukuran arsip" v={rrSize(box.sizeMB)} accent="var(--blue)" />
          <KV label="Jumlah berkas" v={box.docCount + ' dok'} />
          <KV label="Sumber data" v={box.source === 'DMS' ? 'Dirakit dari DMS (live)' : 'Kotak legacy (pra-DMS)'} />
          <KV label="Format" v={cls.format} />
        </div>

        {/* Dokumen DMS live */}
        <SectionTitle right={<span className="mono tiny muted">{docs.length} dok · tarikan DMS</span>}>Dokumen dalam Berkas</SectionTitle>
        {docs.length ? (
          <table className="dtbl" style={{ marginBottom: 12 }}>
            <thead><tr><th>Dokumen</th><th>Jenis</th><th className="num">Ver</th><th className="num">Ukuran</th><th>Status</th></tr></thead>
            <tbody>
              {docs.map(d => (
                <tr key={d.id} style={{ cursor: 'pointer' }} onClick={() => nav('dms', { from: 'records' })}>
                  <td style={{ fontWeight: 600, fontSize: 11 }} className="truncate">{d.name}<div className="tiny muted mono">{d.id}</div></td>
                  <td className="tiny">{d.type}</td>
                  <td className="num mono tiny">v{d.ver}</td>
                  <td className="num mono tiny">{d.sizeMB} MB</td>
                  <td>{d.legalHold ? <span className="badge b-red"><I.lock size={9} /> Hold</span> : d.archivedOn ? <span className="badge b-green">Terarsip</span> : <span className="badge b-amber">Perakitan</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="panel" style={{ padding: '10px 13px', marginBottom: 12, background: 'var(--surface-2)', borderColor: 'transparent' }}>
            <div className="tiny muted" style={{ lineHeight: 1.5 }}>Kotak legacy — {box.docCount} berkas diarsipkan sebelum dokumen granular dikelola di DMS. Indeks ringkas tersedia; berkas fisik/imaging di NAS arsip.</div>
          </div>
        )}

        <div className="row gap8" style={{ marginTop: 4 }}>
          <Btn sm onClick={() => nav('dms', { from: 'records' })}><I.archive size={13} /> Buka di DMS</Btn>
          {box.status === 'Jatuh Tempo' && <Btn sm variant="primary" disabled={!!box.hold}><I.trash size={13} /> Usul Pemusnahan</Btn>}
          {box.disposalPO && <span className="chip tiny" style={{ alignSelf: 'center' }}><I.cart size={11} /> {box.disposalPO}</span>}
        </div>
      </div>
    </PDrawer>
  );
}

/* ============================================================
   Tab: Ikhtisar — funnel siklus hidup + sorotan
   ============================================================ */
function RROverview({ boxes, nav, onPick }) {
  const R = window.RETENTION;
  const stages = R.lifecycle();
  const holds = R.activeHolds();
  const due = boxes.filter(b => b.status === 'Jatuh Tempo');
  const assembling = boxes.filter(b => b.status === 'Perakitan');
  return (
    <div className="view-pad" style={{ paddingTop: 14 }}>
      <div className="panel" style={{ padding: '11px 13px', marginBottom: 14, background: 'var(--blue-050)', borderColor: 'var(--blue-100)' }}>
        <div className="tiny" style={{ lineHeight: 1.55 }}><I.link2 size={13} style={{ verticalAlign: -2, color: 'var(--blue)' }} /> Setiap kotak arsip <b>dirakit dari dokumen DMS</b> perikatannya — ukuran & jumlah berkas adalah agregat live. Masa simpan ditarik dari <b>Kebijakan Retensi</b>, dan penangguhan dari <b>Registri Legal Hold</b> yang sama dengan modul Legal & DMS.</div>
      </div>

      {/* Funnel siklus hidup */}
      <SectionTitle>Siklus Hidup Arsip Perikatan</SectionTitle>
      <div className="row ac" style={{ gap: 0, marginBottom: 18, flexWrap: 'wrap' }}>
        {stages.map((s, i) => {
          const Ic = I[s.icon] || I.archive;
          return (
            <React.Fragment key={s.id}>
              <div className="panel" style={{ padding: '12px 14px', flex: 1, minWidth: 150, borderTop: '3px solid ' + s.color }}>
                <div className="row ac gap8" style={{ marginBottom: 6 }}>
                  <span style={{ width: 26, height: 26, borderRadius: 7, display: 'grid', placeItems: 'center', background: s.color + '1a', color: s.color, flex: '0 0 26px' }}><Ic size={14} /></span>
                  <span className="mono" style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.count}</span>
                </div>
                <div style={{ fontWeight: 600, fontSize: 12 }}>{s.label}</div>
                <div className="tiny muted">{s.sub}</div>
              </div>
              {i < stages.length - 1 && <div style={{ flex: '0 0 18px', textAlign: 'center', color: 'var(--ink-3)' }}><I.arrowRight size={14} /></div>}
            </React.Fragment>
          );
        })}
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 14, alignItems: 'start' }}>
        {/* Legal hold + perakitan */}
        <div>
          <SectionTitle right={<button className="chip tiny" style={{ cursor: 'pointer' }} onClick={() => nav('legal', { from: 'records' })}><I.arrowRight size={10} /> Legal</button>}>Legal Hold Aktif</SectionTitle>
          {holds.length ? holds.map(h => {
            const box = boxes.find(b => b.engId === h.engId);
            return (
              <div key={h.id} className="panel" style={{ padding: '10px 12px', marginBottom: 8, borderLeft: '3px solid var(--red)', cursor: box ? 'pointer' : 'default' }} onClick={() => box && onPick(box)}>
                <div className="row jb ac"><span className="tiny" style={{ fontWeight: 700 }}>{h.subject}</span><span className="mono tiny" style={{ color: 'var(--red)', fontWeight: 700 }}>{h.id}</span></div>
                <div className="tiny muted" style={{ lineHeight: 1.4, marginTop: 3 }}>{h.reason}</div>
                <div className="tiny muted mono" style={{ marginTop: 4 }}>{h.engId} · sejak {rrDID(h.since)}{h.disputeId ? ' · ' + h.disputeId : ''}</div>
              </div>
            );
          }) : <div className="tiny muted">Tidak ada legal hold aktif.</div>}

          {assembling.length > 0 && <>
            <SectionTitle>Perakitan SA 230 Berjalan</SectionTitle>
            {assembling.map(b => {
              const d = b.assembleBy ? R.daysTo(b.assembleBy) : null;
              return (
                <div key={b.id} className="panel" style={{ padding: '10px 12px', marginBottom: 8, borderLeft: '3px solid var(--amber)', cursor: 'pointer' }} onClick={() => onPick(b)}>
                  <div className="row jb ac"><span className="tiny" style={{ fontWeight: 700 }}>{b.client}</span><span className="mono tiny muted">{rrSize(b.sizeMB)}</span></div>
                  <div className="tiny muted" style={{ marginTop: 3 }}>Tenggat rakit {rrDID(b.assembleBy)} · {d != null ? (d < 0 ? Math.abs(d) + ' hari lewat' : d + ' hari lagi') : '—'}</div>
                </div>
              );
            })}
          </>}
        </div>

        {/* Jatuh tempo */}
        <div>
          <SectionTitle right={<button className="chip tiny" style={{ cursor: 'pointer' }} onClick={() => nav('procurement', { from: 'records' })}><I.arrowRight size={10} /> Pengadaan</button>}>Antrean Pemusnahan</SectionTitle>
          {due.length ? due.map(b => (
            <div key={b.id} className="panel" style={{ padding: '10px 12px', marginBottom: 8, borderLeft: '3px solid var(--blue)', cursor: 'pointer' }} onClick={() => onPick(b)}>
              <div className="row jb ac"><span className="tiny" style={{ fontWeight: 700 }}>{b.client}</span><span className="mono tiny muted">{b.fy}</span></div>
              <div className="row jb ac" style={{ marginTop: 3 }}>
                <span className="tiny muted">Retensi habis {rrDID(b.retentionUntil)}</span>
                {b.disposalPO ? <span className="chip tiny"><I.cart size={10} /> {b.disposalPO}</span> : <span className="badge b-green">Bebas hold</span>}
              </div>
            </div>
          )) : <div className="tiny muted">Tidak ada arsip jatuh tempo.</div>}

          <SectionTitle>Distribusi Kelas Retensi</SectionTitle>
          <div className="row ac gap14">
            <Donut size={96} thickness={14} segments={(function () {
              const by = {};
              boxes.forEach(b => { const j = R.classById(b.classId).jenis; by[j] = (by[j] || 0) + 1; });
              const cols = ['#005085', '#1f7a4d', '#9a6a00', '#5b3fa6', '#0a6b73'];
              return Object.keys(by).map((k, i) => ({ value: by[k], color: cols[i % cols.length] }));
            })()} center={<div><div className="mono" style={{ fontSize: 16, fontWeight: 800 }}>{boxes.length}</div><div className="tiny muted">kotak</div></div>} />
            <div style={{ flex: 1 }}>
              <KV label="Total arsip terkelola" v={boxes.length + ' kotak · ' + R.metrics().sizeGB.toFixed(1) + ' GB'} />
              <div style={{ height: 8 }} />
              <KV label="Dirakit dari DMS (live)" v={R.metrics().dmsBoxes + ' kotak'} accent="var(--blue)" sub={R.metrics().legacyBoxes + ' kotak legacy pra-DMS'} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Tab: Rekonsiliasi & Keterkaitan
   ============================================================ */
function RRRecon({ nav }) {
  const R = window.RETENTION;
  const recons = R.reconciliations();
  const links = [
    { id: 'dms', ic: 'archive', lbl: 'Document Management', rel: 'Dokumen, versi & klasifikasi — sumber kotak arsip' },
    { id: 'legal', ic: 'gavel', lbl: 'Kontrak & Legal', rel: 'Sengketa litigasi (LIT-03) → perintah legal hold' },
    { id: 'procurement', ic: 'cart', lbl: 'Pengadaan & Vendor', rel: 'PO pemusnahan arsip jatuh tempo (V-037)' },
    { id: 'firmops', ic: 'building', lbl: 'Cockpit Operasi', rel: 'Tenggat pemusnahan → kalender kewajiban terpadu' },
    { id: 'governance', ic: 'building', lbl: 'Governance (SOQM)', rel: 'Kebijakan retensi & disposal — ISQM 1' },
    { id: 'pppk', ic: 'report', lbl: 'Pelaporan PPPK', rel: 'Ketertelusuran arsip untuk inspeksi regulator' },
  ];
  return (
    <div className="view-pad" style={{ paddingTop: 14 }}>
      <SectionTitle>Rekonsiliasi Lintas-Modul (bukti satu sumber kebenaran)</SectionTitle>
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 18 }}>
        {recons.map(r => (
          <div key={r.id} className="panel" style={{ padding: '12px 13px', borderTop: '3px solid ' + (r.ok ? 'var(--green)' : 'var(--amber)') }}>
            <div className="row ac gap8" style={{ marginBottom: 8 }}>
              {r.ok ? <span className="badge b-green" style={{ textTransform: 'none' }}>✓ Menutup</span> : <span className="badge b-amber" style={{ textTransform: 'none' }}>≠ Selisih</span>}
              <div style={{ flex: 1 }} />
              <button className="btn sm icon" style={{ height: 22, width: 22 }} onClick={() => nav(r.to, { from: 'records' })} title="Buka modul"><I.arrowRight size={12} /></button>
            </div>
            <div style={{ fontWeight: 600, fontSize: 12, lineHeight: 1.3, marginBottom: 8 }}>{r.title}</div>
            <div className="row jb tiny" style={{ padding: '4px 0', borderBottom: '1px solid var(--line-soft)' }}><span className="muted">{r.a}</span><span className="mono" style={{ fontWeight: 700 }}>{r.unit === 'GB' ? r.av.toFixed(2) + ' GB' : r.av}</span></div>
            <div className="row jb tiny" style={{ padding: '4px 0' }}><span className="muted">{r.b}</span><span className="mono" style={{ fontWeight: 700 }}>{r.unit === 'GB' ? r.bv.toFixed(2) + ' GB' : r.bv}</span></div>
            <div className="tiny muted" style={{ marginTop: 8, lineHeight: 1.45 }}>{r.note}</div>
          </div>
        ))}
      </div>

      <SectionTitle>Peta Keterkaitan Modul</SectionTitle>
      <div className="panel" style={{ padding: '12px 14px', marginBottom: 14 }}>
        <div className="tiny muted" style={{ lineHeight: 1.6 }}>
          <b>Retensi & Arsip</b> adalah hilir <b>Document Management</b> (dokumen) dan <b>Engagement</b> (identitas perikatan), serta menerima perintah <b>Legal Hold</b> dari <b>Kontrak & Legal</b>. Tenggat pemusnahan mengalir ke <b>Cockpit Operasi</b> (kalender) dan dieksekusi via <b>Pengadaan</b> (PO vendor pemusnahan). Kebijakan diatur SSOT di <b>Governance (SOQM)</b>.
        </div>
      </div>
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {links.map(m => {
          const Ic = I[m.ic] || I.doc;
          return (
            <button key={m.id} type="button" className="lin-chip" style={{ borderLeftColor: 'var(--blue)' }} onClick={() => nav(m.id, { from: 'records' })} title={'Buka ' + m.lbl}>
              <span className="lin-ic" style={{ color: 'var(--blue)' }}><Ic size={14} /></span>
              <span className="lin-txt"><span className="lin-lbl">{m.lbl}</span><span className="lin-rel">{m.rel}</span></span>
              <span className="lin-go"><I.arrowRight size={12} /></span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
   Modul utama
   ============================================================ */
function RecordsRetention() {
  const R = window.RETENTION;
  const nav = useNav();
  const [tab, setTab] = useStateRR('overview');
  const [selId, setSelId] = useStateRR(null);
  const boxes = useMemoRR(() => R.archiveBoxes(), []);
  const holds = useMemoRR(() => R.holdRegistry(), []);
  const queue = useMemoRR(() => R.disposalQueue(), []);
  const m = useMemoRR(() => R.metrics(), []);
  const sel = boxes.find(b => b.id === selId) || null;
  const onPick = (b) => setSelId(b.id);

  const tabs = [
    { id: 'overview', label: 'Ikhtisar' },
    { id: 'register', label: 'Register Arsip', count: boxes.length },
    { id: 'policy', label: 'Kebijakan Retensi', count: R.RETENTION_CLASSES.length },
    { id: 'hold', label: 'Legal Hold', count: R.activeHolds().length },
    { id: 'destroy', label: 'Pemusnahan', count: m.due },
    { id: 'recon', label: 'Rekonsiliasi' },
  ];

  return (
    <>
      <SubBar moduleId="records" right={<div className="row gap8 ac"><span className="chip tiny"><I.shield size={11} /> SA 230 · SPM 1 · ISQM</span><Btn sm><I.download size={13} /> Ekspor Register</Btn></div>} />
      <div className="view-scroll"><div className="view-pad">
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
          <BoStat value={m.total} label={'Arsip Terkelola · ' + m.sizeGB.toFixed(1) + ' GB'} />
          <BoStat value={m.locked} label="Terkunci (read-only)" accent="var(--green)" />
          <BoStat value={m.due} label="Jatuh Tempo Pemusnahan" accent={m.due ? 'var(--amber)' : 'var(--green)'} />
          <BoStat value={m.holds} label="Legal Hold Aktif" accent={m.holds ? 'var(--red)' : 'var(--green)'} />
        </div>

        <Panel noBody>
          <div className="panel-h" style={{ padding: 0, background: 'var(--surface-2)' }}><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>

          {tab === 'overview' && <RROverview boxes={boxes} nav={nav} onPick={onPick} />}

          {tab === 'register' && (
            <table className="dtbl">
              <thead><tr><th>Kotak</th><th>Perikatan / Klien</th><th>FY</th><th>Sumber</th><th className="num">Berkas</th><th className="num">Ukuran</th><th>Diarsip</th><th>Retensi s/d</th><th>Status</th></tr></thead>
              <tbody>
                {boxes.map(b => (
                  <tr key={b.id} onClick={() => onPick(b)} style={{ cursor: 'pointer' }} className={b.id === selId ? 'sel' : ''}>
                    <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{b.id}</td>
                    <td><div style={{ fontWeight: 600, fontSize: 11.5 }}>{b.client}</div><div className="tiny muted mono">{b.engId}</div></td>
                    <td className="tiny mono">{b.fy}</td>
                    <td>{b.source === 'DMS' ? <span className="chip tiny" style={{ color: 'var(--blue)' }}><I.archive size={10} /> DMS</span> : <span className="chip tiny muted">Legacy</span>}</td>
                    <td className="num mono tiny">{b.docCount}</td>
                    <td className="num mono tiny">{rrSize(b.sizeMB)}</td>
                    <td className="tiny mono muted">{rrDID(b.archivedOn, { month: 'short', year: 'numeric' })}</td>
                    <td className="tiny mono" style={{ color: b.status === 'Jatuh Tempo' ? 'var(--amber)' : 'var(--ink-2)' }}>{b.retentionUntil ? rrDID(b.retentionUntil, { month: 'short', year: 'numeric' }) : '—'}</td>
                    <td><ArkBadge s={b.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === 'policy' && (
            <div>
              <div className="panel" style={{ padding: '10px 13px', margin: '12px 14px 0', background: 'var(--blue-050)', borderColor: 'var(--blue-100)' }}>
                <div className="tiny" style={{ lineHeight: 1.5 }}><I.shield size={12} style={{ verticalAlign: -2, color: 'var(--blue)' }} /> Tabel ini adalah <b>sumber tunggal masa simpan</b>. Masa retensi dokumen di DMS & masa simpan kotak arsip perikatan keduanya ditarik dari kelas di sini — satu perubahan kebijakan mengalir konsisten.</div>
              </div>
              <table className="dtbl">
                <thead><tr><th>Kelas Dokumen</th><th>Dasar Hukum / Standar</th><th className="num">Retensi</th><th>Format</th><th>Catatan</th></tr></thead>
                <tbody>
                  {R.RETENTION_CLASSES.map(c => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 600, fontSize: 11.5 }}>{c.jenis}{c.types.length ? <div className="tiny muted">DMS: {c.types.join(', ')}</div> : null}</td>
                      <td className="tiny muted">{c.dasar}</td>
                      <td className="num"><span className="mono" style={{ fontWeight: 700 }}>{c.years} thn</span></td>
                      <td className="tiny">{c.format}</td>
                      <td className="tiny muted" style={{ maxWidth: 240, whiteSpace: 'normal', lineHeight: 1.35 }}>{c.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'hold' && (
            <div className="view-pad" style={{ paddingTop: 14 }}>
              <div className="panel" style={{ padding: '10px 13px', marginBottom: 12, background: 'var(--surface-2)', borderColor: 'transparent' }}>
                <div className="tiny muted" style={{ lineHeight: 1.5 }}><I.gavel size={12} style={{ verticalAlign: -2 }} /> <b>Registri legal hold</b> adalah sumber tunggal penangguhan disposal. Modul Legal (sengketa) & DMS (dokumen ditahan) menunjuk ke registri yang sama — tidak ada hold ganda atau yang terlewat.</div>
              </div>
              <div style={{ display: 'grid', gap: 10 }}>
                {holds.map(h => (
                  <div key={h.id} className="panel" style={{ padding: '12px 14px', borderLeft: '3px solid ' + (h.status === 'Aktif' ? 'var(--red)' : 'var(--ink-3)') }}>
                    <div className="row jb ac" style={{ marginBottom: 6 }}>
                      <div className="row ac gap8">
                        <span className="mono tiny" style={{ fontWeight: 700, color: h.status === 'Aktif' ? 'var(--red)' : 'var(--ink-3)' }}>{h.id}</span>
                        <span style={{ fontWeight: 700, fontSize: 12.5 }}>{h.subject}</span>
                        <span className="badge b-gray" style={{ textTransform: 'none' }}>{h.engId} · FY{h.fy}</span>
                        {h.status === 'Aktif' ? <span className="badge b-red">Aktif</span> : <span className="badge b-gray">Dicabut {rrDID(h.releasedOn, { month: 'short', year: 'numeric' })}</span>}
                      </div>
                      {h.box && <button className="btn sm icon" style={{ height: 22, width: 22 }} onClick={() => setSelId(h.box.id)} title="Lihat kotak arsip"><I.archive size={12} /></button>}
                    </div>
                    <div className="tiny" style={{ lineHeight: 1.5, marginBottom: 8 }}>{h.reason}</div>
                    <div className="row gap14 ac" style={{ flexWrap: 'wrap' }}>
                      <span className="tiny muted">Sejak {rrDID(h.since)} · {h.by}</span>
                      {h.dmsHeldCount > 0 && <button className="chip tiny" style={{ cursor: 'pointer' }} onClick={() => nav('dms', { from: 'records' })}><I.archive size={10} /> {h.dmsHeldCount} dok DMS ditahan</button>}
                      {h.dispute && <button className="chip tiny" style={{ cursor: 'pointer', color: 'var(--red)' }} onClick={() => nav('legal', { from: 'records' })}><I.gavel size={10} /> {h.dispute.id} · {h.dispute.forum}</button>}
                      {h.claim && <button className="chip tiny" style={{ cursor: 'pointer' }} onClick={() => nav('insurance', { from: 'records' })}><I.umbrella size={10} /> Klaim {h.claim.id}</button>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'destroy' && (
            <div className="view-pad" style={{ paddingTop: 14 }}>
              <div className="panel" style={{ padding: '10px 13px', background: 'var(--amber-bg)', borderColor: 'transparent', marginBottom: 12 }}>
                <div className="tiny" style={{ fontWeight: 600, lineHeight: 1.5 }}><I.alert size={13} style={{ verticalAlign: -2, color: 'var(--amber)' }} /> {queue.length} kotak arsip melewati periode retensi & memenuhi syarat pemusnahan. Pemusnahan memerlukan persetujuan Kepala Mutu + berita acara, dan <b>tidak boleh</b> dalam legal hold. Eksekusi via vendor pemusnahan tersertifikasi (Pengadaan).</div>
              </div>
              <table className="dtbl">
                <thead><tr><th>Kotak</th><th>Perikatan / Klien</th><th>Retensi habis</th><th className="num">Ukuran</th><th>Legal hold?</th><th>Tahapan</th><th></th></tr></thead>
                <tbody>
                  {queue.map(b => (
                    <tr key={b.id}>
                      <td className="mono tiny" style={{ fontWeight: 700 }}>{b.id}</td>
                      <td><div style={{ fontWeight: 600, fontSize: 11.5 }}>{b.client}</div><div className="tiny muted mono">{b.engId} · {b.fy}</div></td>
                      <td className="tiny mono" style={{ color: 'var(--amber)' }}>{rrDID(b.retentionUntil)}</td>
                      <td className="num mono tiny">{rrSize(b.sizeMB)}</td>
                      <td>{b.hold ? <span className="badge b-red"><I.lock size={9} /> Ditahan</span> : <span className="badge b-green">Bebas</span>}</td>
                      <td>{b.poId ? <span className="chip tiny" style={{ cursor: 'pointer' }} onClick={() => nav('procurement', { from: 'records' })}><I.cart size={10} /> {b.poId}</span> : <span className="tiny muted">{b.stage}</span>}</td>
                      <td><Btn sm disabled={!b.eligible} onClick={() => onPick(b)}><I.trash size={12} /> {b.poId ? 'Berita Acara' : 'Usul Musnah'}</Btn></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="tiny muted" style={{ marginTop: 12, lineHeight: 1.5, padding: '0 2px' }}>Setelah pemusnahan, sistem mencatat berita acara permanen (jejak audit tamper-evident) — siapa, kapan, dasar kebijakan, & metode penghancuran. Kotak dalam legal hold dikecualikan otomatis hingga hold dicabut.</div>
            </div>
          )}

          {tab === 'recon' && <RRRecon nav={nav} />}
        </Panel>
      </div></div>

      <ArchiveDrawer box={sel} onClose={() => setSelId(null)} nav={nav} />
    </>
  );
}

Object.assign(window, { RecordsRetention, ArchiveDrawer, RetentionBar });

/* ---- lineage dock dua-arah untuk modul Retensi & Arsip ---- */
if (window.LINEAGE) {
  window.LINEAGE.records = {
    std: 'Backoffice · Retensi & Arsip (SA 230 / SPM 1 / ISQM)',
    up: [
      { id: 'dms', ic: 'archive', lbl: 'Document Management', rel: 'Dokumen, versi & klasifikasi → kotak arsip dirakit live' },
      { id: 'engagement', ic: 'briefcase', lbl: 'Engagement Mgmt', rel: 'Identitas perikatan & klien (sumber tunggal)' },
      { id: 'legal', ic: 'gavel', lbl: 'Kontrak & Legal', rel: 'Sengketa litigasi (LIT-03) → perintah legal hold' },
      { id: 'governance', ic: 'building', lbl: 'Governance (SOQM)', rel: 'Kebijakan retensi & disposal (ISQM 1)' },
    ],
    down: [
      { id: 'procurement', ic: 'cart', lbl: 'Pengadaan & Vendor', rel: 'Kotak jatuh tempo → PO pemusnahan (V-037)' },
      { id: 'firmops', ic: 'building', lbl: 'Cockpit Operasi', rel: 'Tenggat pemusnahan → kalender kewajiban terpadu' },
      { id: 'pppk', ic: 'report', lbl: 'Pelaporan PPPK', rel: 'Ketertelusuran arsip untuk inspeksi regulator' },
    ],
  };
}


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { ArchiveDrawer, RecordsRetention, RetentionBar };
