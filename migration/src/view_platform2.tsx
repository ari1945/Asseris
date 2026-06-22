/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { useAmsPersist, useAudit, useNav } from './contexts';
import { I } from './icons';
import { SubBar } from './shell';
import { Badge, Btn, Panel, Stat, Tabs } from './ui';
import { KvBox } from './view_analytical';
import { IMPORT } from './data_import';

/* ============================================================
   Asseris — Firm Platform · Impor & Integrasi Data (Bagian D-2)
   ------------------------------------------------------------
   Gerbang masuk data eksternal. Tiga mode: Konektor (master-detail),
   Antrean Impor (staging→validasi→posting), Rekonsiliasi SSOT
   (baris di-posting == record dikonsumsi modul hilir).
   Seluruh angka diturunkan IMPORT dari sumber kanonik —
   tidak ada salinan terpisah.
   ============================================================ */
const { useState: useStateIN, useEffect: useEffectIN } = React;

const INTEG_STATUS = { connected: { k: 'green', l: 'Terhubung' }, available: { k: 'gray', l: 'Tersedia' }, error: { k: 'red', l: 'Error' } };
const SYNC_STATE = { success: { k: 'green', l: 'Sukses' }, partial: { k: 'amber', l: 'Sebagian' }, failed: { k: 'red', l: 'Gagal' } };
const JOB_STATE = { posted: { k: 'green', l: 'Di-posting', ic: 'checkCircle' }, staged: { k: 'amber', l: 'Staging', ic: 'hourglass' }, failed: { k: 'red', l: 'Gagal', ic: 'alert' } };
const MODE_LABEL = { auto: 'Otomatis', semi: 'Semi-otomatis', manual: 'Manual' };

/* chip sumber → loncat ke modul pemilik data */
function ImSrc({ module, children, title }: any) {
  const nav = useNav();
  return (
    <button type="button" className="chip tiny" title={title || ('Buka ' + module)}
      onClick={() => module && nav(module, { from: 'integrations' })}
      style={{ cursor: 'pointer', border: '1px solid var(--line-strong)', background: 'var(--surface-2)', gap: 4 }}>
      {children} <I.arrowRight size={9} style={{ opacity: .6 }} />
    </button>
  );
}

function Integrations() {
  const { logActivity } = useAudit();
  const IM = IMPORT!; // IMPORT-IIFE only returns undefined if AMS absent; AMS is always loaded before this view renders
  const { fmt } = AMS;
  const [mode, setMode] = useAmsPersist('importmode', () => 'konektor');
  const [list, setList] = useAmsPersist('integrations3', () => IM.connectorsSeed());
  const [selId, setSelId] = useStateIN(IM.CONNECTORS[0].id);
  const [catFilter, setCatFilter] = useStateIN('Semua');
  // W9 — server read-model: fetch the real reconciliation for the wired connector and push it
  // into IMPORT so connectors()/reconciliation() below overlay live server figures. Null
  // until fetched / when the server is down (→ simulated blueprint fallback). `srv` re-renders.
  const [srv, setSrv] = useStateIN(null);
  const [busy, setBusy] = useStateIN(false);

  async function loadServer() {
    const [status, recon] = await Promise.all([
      (window as any).amsIntegrationStatus ? (window as any).amsIntegrationStatus() : null,
      (window as any).amsIntegrationReconcile ? (window as any).amsIntegrationReconcile() : null,
    ]);
    if (IM.setServerData) IM.setServerData({ recon });
    return { status, recon };
  }

  useEffectIN(() => {
    let live = true;
    loadServer().then(s => { if (live) setSrv(s); });
    return () => { live = false; };
  }, []);

  const onSyncBank = async () => {
    if (busy || !(window as any).amsIntegrationSync) return;
    setBusy(true);
    try {
      const r = await (window as any).amsIntegrationSync('bank');
      logActivity && logActivity({ who: ((AMS as any).USER && (AMS as any).USER.name) || 'Pengguna', action: 'SYNC', detail: `Bank Feed: ${r.status} · ${r.posted} baris → SSOT · ${r.tied ? 'tie-out 0' : 'selisih'}` });
      setSrv(await loadServer());
    } catch (e) {
      logActivity && logActivity({ who: ((AMS as any).USER && (AMS as any).USER.name) || 'Pengguna', action: 'SYNC', detail: 'Bank Feed sync ditolak/gagal' });
    } finally {
      setBusy(false);
    }
  };

  const sum = IM.summary();
  const connected = list.filter((i: any) => i.status === 'connected').length;
  const errors = list.filter((i: any) => i.status === 'error').length;

  const toggle = (id: any) => {
    setList((items: any) => items.map((i: any) => i.id === id ? { ...i, status: i.status === 'connected' ? 'available' : 'connected', last: i.status === 'connected' ? '—' : 'baru saja' } : i));
    const it = list.find((x: any) => x.id === id);
    logActivity && logActivity({ who: 'Anindya Pramesti', action: 'SYNC', detail: `Konektor ${it.name} ${it.status === 'connected' ? 'diputus' : 'dihubungkan'}` });
  };

  const cats = ['Semua', ...Array.from(new Set(list.map((i: any) => i.cat)))];
  const shown = list.filter((i: any) => catFilter === 'Semua' || i.cat === catFilter);
  const sel = list.find((i: any) => i.id === selId) || shown[0] || list[0];

  const modes = [
    { id: 'konektor', label: 'Konektor', count: list.length },
    { id: 'antrean', label: 'Antrean Impor', count: sum.jobs.length },
    { id: 'rekon', label: 'Rekonsiliasi SSOT' },
  ];

  return (
    <>
      <SubBar moduleId="integrations" right={<div className="row gap8 ac"><Badge kind="green">{connected} terhubung</Badge>{errors > 0 && <Badge kind="red">{errors} error</Badge>}{srv && srv.recon && srv.recon.bank && srv.recon.bank.tied && <Badge kind="green">Bank Feed: server · tie-out 0</Badge>}{srv && srv.status && srv.status.canManage && <Btn sm variant="primary" onClick={onSyncBank} disabled={busy}><I.sync size={13} /> {busy ? 'Menyinkron…' : 'Sinkronkan Bank'}</Btn>}<Btn sm><I.sync size={13} /> Sinkron Semua</Btn><Btn sm variant="primary"><I.plus size={13} /> Konektor</Btn></div>} />
      <div className="view-scroll"><div className="view-pad">

        {/* provenance banner */}
        <div className="panel" style={{ padding: '10px 13px', marginBottom: 12, background: 'var(--blue-050)', borderColor: 'transparent' }}>
          <div className="row ac jb" style={{ marginBottom: 7 }}>
            <span className="tiny" style={{ fontWeight: 700, letterSpacing: '.02em' }}><I.link2 size={12} style={{ verticalAlign: -2, color: 'var(--blue)' }} /> Impor → posting ke modul pemilik · satu sumber kebenaran</span>
            <span className="tiny muted">baris di-posting = record dikonsumsi · nol duplikasi</span>
          </div>
          <div className="row gap6 ac" style={{ flexWrap: 'wrap' }}>
            {IM.PROVENANCE.map(p => (
              <ImSrc key={p.field} module={p.module} title={p.field + ' ← ' + p.source}>
                <span style={{ fontWeight: 600 }}>{p.field}</span>
                <span className="muted" style={{ marginLeft: 3 }}>← {p.label}</span>
              </ImSrc>
            ))}
          </div>
        </div>

        <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={connected} label="Konektor Terhubung" accent="var(--green)" /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={fmt(sum.postedRows)} label="Baris Di-posting ke SSOT" accent="var(--blue)" /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={fmt(sum.stagedRows)} label="Menunggu Validasi" accent={sum.stagedRows ? 'var(--amber)' : 'var(--green)'} /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={sum.failedJobs.length} label="Impor Gagal" accent={sum.failedJobs.length ? 'var(--red)' : 'var(--green)'} /></div></Panel>
        </div>

        {/* mode switch */}
        <div className="row gap6" style={{ marginBottom: 12 }}>
          {modes.map(m => (
            <button key={m.id} className="chip" onClick={() => setMode(m.id)}
              style={{ height: 30, padding: '0 13px', fontWeight: 600, fontSize: 12, cursor: 'pointer', background: mode === m.id ? 'var(--navy)' : 'var(--surface-3)', color: mode === m.id ? '#fff' : 'var(--ink-2)', border: '1px solid ' + (mode === m.id ? 'var(--navy)' : 'var(--line)') }}>
              {m.label}{m.count != null && <span style={{ marginLeft: 6, opacity: .7 }}>{m.count}</span>}
            </button>
          ))}
        </div>

        {mode === 'konektor' && (
          <div className="grid" style={{ gridTemplateColumns: '0.86fr 1.3fr', gap: 12, alignItems: 'start' }}>
            <Panel noBody>
              <div className="panel-h"><h3>Konektor</h3><div style={{ flex: 1 }} /><span className="tiny muted">{shown.length}</span></div>
              <div className="row gap6" style={{ padding: '8px 12px', flexWrap: 'wrap', borderBottom: '1px solid var(--line-soft)' }}>
                {cats.map(c => <button key={c} className="chip x" style={{ height: 24, background: catFilter === c ? 'var(--blue)' : 'var(--surface-3)', color: catFilter === c ? '#fff' : 'var(--ink-2)' }} onClick={() => setCatFilter(c)}>{c}</button>)}
              </div>
              <div style={{ maxHeight: 560, overflow: 'auto' }}>
                {shown.map((it: any) => {
                  const IconC = (I as any)[it.icon] || I.panel;
                  const st = (INTEG_STATUS as any)[it.status];
                  const c: any = sum.connectors.find((x: any) => x.id === it.id) || {};
                  return (
                    <div key={it.id} onClick={() => setSelId(it.id)} className="row ac gap10"
                      style={{ padding: '11px 13px', borderBottom: '1px solid var(--line-soft)', cursor: 'pointer', background: it.id === sel.id ? 'var(--blue-050)' : 'transparent', borderLeft: '3px solid ' + (it.id === sel.id ? 'var(--blue)' : 'transparent') }}>
                      <span style={{ width: 36, height: 36, borderRadius: 9, background: 'var(--surface-3)', color: 'var(--navy)', display: 'grid', placeItems: 'center', flex: '0 0 36px', position: 'relative' }}>
                        <IconC size={18} />
                        <span style={{ position: 'absolute', right: -2, bottom: -2, width: 11, height: 11, borderRadius: '50%', border: '2px solid var(--surface)', background: it.status === 'connected' ? 'var(--green)' : it.status === 'error' ? 'var(--red)' : 'var(--ink-4)' }} />
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 600 }} className="truncate">{it.name}</div>
                        <div className="tiny muted">{it.cat} · {it.status === 'connected' ? AMS.fmt(c.posted || 0) + ' baris → SSOT' : st.l}</div>
                      </div>
                      {it.status === 'error' && <I.alert size={15} style={{ color: 'var(--red)' }} />}
                    </div>
                  );
                })}
              </div>
            </Panel>
            {sel && <IntegrationDetail key={sel.id} it={sel} onToggle={toggle} />}
          </div>
        )}

        {mode === 'antrean' && <ImportQueue sum={sum} />}
        {mode === 'rekon' && <ImportRecon IM={IM} sum={sum} />}

      </div></div>
    </>
  );
}

/* ---------------- Antrean Impor: staging → validasi → posting ---------------- */
function ImportQueue({ sum }: any) {
  const { fmt } = AMS;
  const nav = useNav();
  const [open, setOpen] = useStateIN(null);
  const jobs = sum.jobs;
  return (
    <Panel noBody>
      <div className="panel-h"><h3>Antrean Impor</h3><div style={{ flex: 1 }} /><span className="tiny muted">{jobs.length} berkas · staging → gerbang kontrol → posting</span></div>
      <table className="dtbl">
        <thead><tr><th></th><th>ID Impor</th><th>Dataset</th><th>Konektor</th><th>Modul Tujuan (SSOT)</th><th className="r">Baris</th><th>Mode</th><th>Status</th></tr></thead>
        <tbody>
          {jobs.map((j: any) => {
            const js = (JOB_STATE as any)[j.status];
            const JIc = (I as any)[js.ic] || I.panel;
            const isOpen = open === j.id;
            return (
              <React.Fragment key={j.id}>
                <tr style={{ cursor: 'pointer', background: isOpen ? 'var(--blue-050)' : undefined }} onClick={() => setOpen(isOpen ? null : j.id)}>
                  <td style={{ textAlign: 'center', color: 'var(--ink-3)' }}><I.chevDown size={12} style={{ transform: isOpen ? 'none' : 'rotate(-90deg)', transition: '.12s' }} /></td>
                  <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{j.id}</td>
                  <td className="tiny" style={{ fontWeight: 600, maxWidth: 200, whiteSpace: 'normal', lineHeight: 1.3 }}>{j.dataset}</td>
                  <td className="tiny muted">{j.connName}</td>
                  <td><button className="chip tiny" style={{ cursor: 'pointer', border: '1px solid var(--line-strong)', background: 'var(--surface-2)' }} onClick={(e: any) => { e.stopPropagation(); nav(j.target, { from: 'integrations' }); }}>{j.targetLabel} <I.arrowRight size={9} style={{ opacity: .6 }} /></button></td>
                  <td className="num mono">{fmt(j.rows)}{j.rejected ? <span style={{ color: 'var(--red)' }}> −{j.rejected}</span> : null}</td>
                  <td className="tiny">{(MODE_LABEL as any)[j.mode]}</td>
                  <td><span className="row ac gap4"><JIc size={12} style={{ color: 'var(--' + js.k + ')' }} /><Badge kind={js.k}>{js.l}</Badge></span></td>
                </tr>
                {isOpen && (
                  <tr><td colSpan={8} style={{ padding: 0, background: 'var(--surface-2)' }}>
                    <div style={{ padding: '12px 16px' }}>
                      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
                        <div>
                          <div className="tiny upper muted" style={{ fontWeight: 700, letterSpacing: '.05em', marginBottom: 8 }}>Pipeline impor</div>
                          <div style={{ display: 'grid', gap: 0 }}>
                            {[
                              { k: 'Staging', d: fmt(j.rows) + ' baris diterima dari ' + j.connName, ok: true },
                              { k: 'Validasi', d: j.rejected ? j.rejected + ' baris ditolak, ' + fmt(j.valid) + ' lolos' : fmt(j.valid) + ' baris lolos validasi', ok: j.rejected === 0 },
                              { k: 'Gerbang total kontrol', d: j.control.label + ' = ' + j.control.value, ok: j.gate },
                              { k: 'Posting ke ' + j.targetLabel, d: j.status === 'posted' ? fmt(j.valid) + ' record di-posting ke modul pemilik' : j.status === 'staged' ? 'Tertahan — menunggu koreksi & gerbang' : 'Dibatalkan', ok: j.status === 'posted' },
                            ].map((s, i, arr) => (
                              <div key={i} className="row gap10" style={{ alignItems: 'flex-start' }}>
                                <div style={{ display: 'grid', justifyItems: 'center' }}>
                                  <span style={{ width: 20, height: 20, borderRadius: '50%', display: 'grid', placeItems: 'center', background: s.ok ? 'var(--green)' : j.status === 'failed' ? 'var(--red)' : 'var(--amber)', color: '#fff', flex: '0 0 20px', fontSize: 11, fontWeight: 800 }}>{s.ok ? <I.check size={12} /> : (j.status === 'failed' ? '×' : '·')}</span>
                                  {i < arr.length - 1 && <span style={{ width: 2, height: 22, background: 'var(--line)' }} />}
                                </div>
                                <div style={{ paddingBottom: 8 }}>
                                  <div className="tiny" style={{ fontWeight: 600 }}>{s.k}</div>
                                  <div className="tiny muted">{s.d}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div className="tiny upper muted" style={{ fontWeight: 700, letterSpacing: '.05em', marginBottom: 8 }}>Detail & keterkaitan</div>
                          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '8px 12px' }}>
                            <KvBox label="Waktu impor" v={j.ts} />
                            <KvBox label="Diproses oleh" v={j.by} />
                            <KvBox label="Mode pemetaan" v={(MODE_LABEL as any)[j.mode]} />
                            <KvBox label="Total kontrol" v={j.control.value} accent={j.gate ? 'var(--green)' : 'var(--amber)'} />
                          </div>
                          {j.note && <div className="panel" style={{ padding: '9px 11px', marginTop: 10, background: j.status === 'failed' ? 'var(--red-bg)' : 'var(--amber-bg)', borderColor: 'transparent' }}><div className="tiny" style={{ fontWeight: 600, lineHeight: 1.5, color: j.status === 'failed' ? 'var(--red)' : 'var(--ink-2)' }}><I.alert size={12} style={{ verticalAlign: -2 }} /> {j.note}</div></div>}
                          {j.status === 'posted' && <div className="panel" style={{ padding: '9px 11px', marginTop: 10, background: 'var(--green-bg)', borderColor: 'transparent' }}><div className="tiny" style={{ fontWeight: 600, lineHeight: 1.5, color: 'var(--green)' }}><I.checkCircle size={12} style={{ verticalAlign: -2 }} /> {fmt(j.valid)} record dibaca LIVE oleh <b>{j.targetLabel}</b> — bukan salinan. Mengubah di sumber otomatis tampak di modul tujuan.</div></div>}
                        </div>
                      </div>
                    </div>
                  </td></tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </Panel>
  );
}

/* ---------------- Rekonsiliasi SSOT: posting == konsumsi ---------------- */
function ImportRecon({ IM, sum }: any) {
  const { fmt } = AMS;
  const nav = useNav();
  const recon = IM.reconciliation();
  return (
    <Panel noBody>
      <div className="panel-h"><h3>Rekonsiliasi SSOT — Impor ↔ Konsumsi</h3><div style={{ flex: 1 }} /><span className="row ac gap6">{sum.allTied ? <Badge kind="green">Semua menutup</Badge> : <Badge kind="amber">Periksa</Badge>}</span></div>
      <div style={{ padding: '12px 14px' }}>
        <div className="tiny muted" style={{ marginBottom: 12, lineHeight: 1.5 }}>Tiap konektor: <b>baris yang di-posting</b> ke modul pemilik harus sama dengan <b>record yang dikonsumsi</b> modul-modul hilir. Selisih 0 membuktikan tidak ada salinan terpisah — satu sumber kebenaran.</div>
        <div style={{ display: 'grid', gap: 12 }}>
          {recon.map((r: any) => {
            const IconC = (I as any)[r.icon] || I.panel;
            return (
              <div key={r.id} className="panel" style={{ padding: '12px 14px', boxShadow: 'none', border: '1px solid var(--line)' }}>
                <div className="row ac jb" style={{ marginBottom: 10 }}>
                  <span className="row ac gap8"><span style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--surface-3)', color: 'var(--navy)', display: 'grid', placeItems: 'center' }}><IconC size={16} /></span><span style={{ fontWeight: 700, fontSize: 13 }}>{r.name}</span>{r.serverBacked && <span className="chip tiny" style={{ background: 'var(--green-bg)', color: 'var(--green)', border: '1px solid var(--green)', fontWeight: 700 }}><I.checkCircle size={9} /> live · server</span>}</span>
                  {r.status === 'error' ? <Badge kind="red">Impor gagal</Badge> : r.tied ? <span className="row ac gap4" style={{ color: 'var(--green)', fontWeight: 700, fontSize: 12 }}><I.checkCircle size={14} /> Menutup (selisih 0)</span> : <Badge kind="amber">Selisih {fmt(Math.abs(r.posted - r.consumed))}</Badge>}
                </div>
                <div className="row ac gap8" style={{ flexWrap: 'wrap' }}>
                  <div className="panel" style={{ padding: '8px 12px', boxShadow: 'none', minWidth: 120 }}><div className="tiny muted upper">Di-posting</div><div className="mono" style={{ fontSize: 17, fontWeight: 800, color: 'var(--blue)' }}>{fmt(r.posted)}</div></div>
                  <I.arrowRight size={16} style={{ color: 'var(--ink-4)' }} />
                  <div style={{ flex: 1, minWidth: 200, display: 'grid', gap: 5 }}>
                    {r.feeds.map((f: any, i: any) => { const m = (window.MODULE_INDEX || {})[f.module] || { label: f.label, icon: 'panel' }; const MIc = (I as any)[m.icon] || I.panel; return (
                      <button key={i} className="row ac gap8" style={{ padding: '6px 9px', border: '1px solid var(--line-soft)', borderRadius: 7, background: 'var(--surface)', cursor: 'pointer', textAlign: 'left' }} onClick={() => nav(f.module, { from: 'integrations' })}>
                        <MIc size={14} style={{ color: 'var(--navy)' }} /><span className="tiny" style={{ flex: 1, fontWeight: 600 }}>{m.label || f.label}</span><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{fmt(f.n)}</span><span className="tiny muted">{f.unit}</span>
                      </button>
                    ); })}
                    {!r.feeds.length && <div className="tiny muted">Tidak ada modul hilir.</div>}
                  </div>
                  <I.arrowRight size={16} style={{ color: 'var(--ink-4)' }} />
                  <div className="panel" style={{ padding: '8px 12px', boxShadow: 'none', minWidth: 120 }}><div className="tiny muted upper">Dikonsumsi</div><div className="mono" style={{ fontSize: 17, fontWeight: 800, color: r.tied ? 'var(--green)' : 'var(--amber)' }}>{fmt(r.consumed)}</div></div>
                </div>
                <div className="row ac jb tiny muted" style={{ marginTop: 9, paddingTop: 8, borderTop: '1px solid var(--line-soft)' }}>
                  <span>Gerbang total kontrol: <b style={{ color: 'var(--ink-2)' }}>{r.control.label}</b> = {r.control.value}</span>
                  {r.staged ? <span style={{ color: 'var(--amber)' }}>{fmt(r.staged)} baris staging · {r.rejected} ditolak</span> : <span>{r.rejected ? r.rejected + ' ditolak' : 'tanpa pengecualian'}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Panel>
  );
}

function IntegrationDetail({ it, onToggle }: any) {
  const [tab, setTab] = useStateIN('ringkasan');
  const nav = useNav();
  const { fmt } = AMS;
  const IconC = (I as any)[it.icon] || I.panel;
  const st = (INTEG_STATUS as any)[it.status];
  const IM = IMPORT!; // IMPORT-IIFE only returns undefined if AMS absent; AMS is always loaded before this view renders
  const feeds = IM.feeds(it.id);
  const jobs = IM.jobsByConnector(it.id);
  const cdata = IM.connectors().find(c => c.id === it.id) || { posted: 0, consumed: 0, tied: true };
  const tabs = [{ id: 'ringkasan', label: 'Ringkasan' }, { id: 'impor', label: 'Impor Terbaru', count: jobs.length || null }, { id: 'lineage', label: 'Sumber Kebenaran', count: feeds.length || null }, { id: 'aktivitas', label: 'Aktivitas Sinkron', count: it.syncs.length }, { id: 'mapping', label: 'Pemetaan Field', count: it.mapping.length }, { id: 'akses', label: 'Izin & Kredensial' }, { id: 'webhook', label: 'Webhook', count: it.webhooks.length }];
  const isOn = it.status === 'connected';

  return (
    <Panel noBody>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
        <div className="row ac gap12">
          <span style={{ width: 46, height: 46, borderRadius: 11, background: 'var(--navy)', color: '#fff', display: 'grid', placeItems: 'center', flex: '0 0 46px' }}><IconC size={22} /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="row ac gap8"><span style={{ fontSize: 15, fontWeight: 700 }}>{it.name}</span><Badge kind={st.k}>{st.l}</Badge>{isOn && cdata.tied && <span className="row ac gap4" style={{ color: 'var(--green)', fontSize: 11, fontWeight: 700 }}><I.checkCircle size={12} /> SSOT menutup</span>}</div>
            <div className="tiny muted">{it.cat} · {it.desc}</div>
          </div>
          {it.status === 'error'
            ? <Btn sm style={{ color: 'var(--red)', borderColor: 'var(--red)' }}><I.sync size={13} /> Coba Lagi</Btn>
            : <Btn sm variant={isOn ? '' : 'primary'} onClick={() => onToggle(it.id)}>{isOn ? 'Putuskan' : 'Hubungkan'}</Btn>}
        </div>
      </div>
      <div style={{ padding: '0 12px', borderBottom: '1px solid var(--line)' }}><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>

      <div style={{ padding: '14px 16px', minHeight: 320 }}>
        {it.status === 'available' && tab !== 'akses' && tab !== 'lineage' ? (
          <div className="muted tiny" style={{ textAlign: 'center', padding: '40px 0' }}>
            <span style={{ width: 44, height: 44, borderRadius: 11, background: 'var(--surface-3)', color: 'var(--ink-4)', display: 'grid', placeItems: 'center', margin: '0 auto 10px' }}><IconC size={22} /></span>
            Konektor belum terhubung. Hubungkan untuk mengaktifkan impor, validasi & posting ke modul SSOT.
            <div style={{ marginTop: 12 }}><Btn sm variant="primary" onClick={() => onToggle(it.id)}><I.link2 size={13} /> Hubungkan Sekarang</Btn></div>
          </div>
        ) : (<>
          {tab === 'ringkasan' && (
            <>
              <div className="grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 14 }}>
                <div className="panel" style={{ padding: '9px 11px', boxShadow: 'none' }}><div className="tiny muted upper">Baris → SSOT</div><div style={{ fontSize: 17, fontWeight: 700, color: 'var(--blue)' }} className="mono">{fmt(cdata.posted)}</div></div>
                <div className="panel" style={{ padding: '9px 11px', boxShadow: 'none' }}><div className="tiny muted upper">Uptime 30 hari</div><div style={{ fontSize: 17, fontWeight: 700, color: it.uptime >= 99 ? 'var(--green)' : 'var(--amber)' }}>{it.uptime ? it.uptime.toFixed(1) + '%' : '—'}</div></div>
                <div className="panel" style={{ padding: '9px 11px', boxShadow: 'none' }}><div className="tiny muted upper">Volume sinkron 30h</div><div style={{ fontSize: 17, fontWeight: 700 }} className="mono">{fmt(it.vol)}</div></div>
              </div>
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '9px 14px', marginBottom: 14 }}>
                <KvBox label="Jadwal Sinkron" v={it.schedule} />
                <KvBox label="Sinkron Terakhir" v={it.last} />
                <KvBox label="Metode Otentikasi" v={it.auth} />
                <KvBox label="Kadaluarsa Kredensial" v={it.expiry} accent={it.expiry !== '—' && +new Date(it.expiry) - +new Date("2026-03-10") < 90 * 864e5 ? 'var(--amber)' : undefined} />
              </div>
              <div className="panel" style={{ padding: '9px 11px', boxShadow: 'none' }}>
                <div className="tiny muted upper" style={{ marginBottom: 3 }}>Endpoint</div>
                <div className="mono tiny" style={{ color: 'var(--blue)', wordBreak: 'break-all' }}>https://{it.endpoint}</div>
              </div>
              {it.status === 'error' && <div className="panel" style={{ padding: '9px 11px', marginTop: 10, background: 'var(--red-bg)', borderColor: 'transparent' }}><div className="row ac gap8 tiny" style={{ color: 'var(--red)', fontWeight: 600 }}><I.alert size={14} /> Sinkronisasi terakhir gagal. Impor tertahan — periksa ketersediaan layanan & kredensial.</div></div>}
            </>
          )}
          {tab === 'impor' && (
            <>
              <div className="tiny muted" style={{ marginBottom: 10, lineHeight: 1.5 }}>Berkas yang diimpor konektor ini, di-staging lalu di-posting ke modul pemiliknya. Baris di-posting = record yang dibaca modul tujuan.</div>
              {jobs.length ? (
                <table className="dtbl">
                  <thead><tr><th>ID</th><th>Dataset → Modul</th><th className="r">Baris</th><th>Total Kontrol</th><th>Status</th></tr></thead>
                  <tbody>
                    {jobs.map(j => { const js = (JOB_STATE as any)[j.status]; return (
                      <tr key={j.id}>
                        <td className="mono tiny" style={{ fontWeight: 700 }}>{j.id}</td>
                        <td className="tiny"><div style={{ fontWeight: 600 }}>{j.dataset}</div><button className="tiny" style={{ color: 'var(--blue)', background: 'none', border: 0, padding: 0, cursor: 'pointer', fontWeight: 600 }} onClick={() => nav(j.target, { from: 'integrations' })}>→ {j.targetLabel}</button></td>
                        <td className="num mono">{fmt(j.rows)}{j.rejected ? <span style={{ color: 'var(--red)' }}> −{j.rejected}</span> : null}</td>
                        <td className="tiny" style={{ color: j.gate ? 'var(--green)' : 'var(--amber)' }}>{j.gate ? '✓ ' : '· '}{j.control.value}</td>
                        <td><Badge kind={js.k}>{js.l}</Badge></td>
                      </tr>
                    ); })}
                  </tbody>
                </table>
              ) : <div className="tiny muted">Belum ada impor untuk konektor ini.</div>}
            </>
          )}
          {tab === 'aktivitas' && (
            <table className="dtbl">
              <thead><tr><th>Waktu</th><th>Status</th><th className="r">Record</th><th className="r">Durasi</th><th>Catatan</th></tr></thead>
              <tbody>
                {it.syncs.map((s: any, i: any) => (
                  <tr key={i}>
                    <td className="mono tiny muted">{s[0]}</td>
                    <td><Badge kind={(SYNC_STATE as any)[s[1]].k}>{(SYNC_STATE as any)[s[1]].l}</Badge></td>
                    <td className="num">{s[2]}</td>
                    <td className="num">{s[3]} dtk</td>
                    <td className="tiny" style={{ color: s[4] ? 'var(--red)' : 'var(--ink-3)' }}>{s[4] || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {tab === 'mapping' && (
            <>
              <div className="tiny muted" style={{ marginBottom: 10 }}>Pemetaan field dari sistem eksternal ke skema Asseris. Transformasi diterapkan saat ingest sebelum posting.</div>
              <table className="dtbl">
                <thead><tr><th>Field Sumber ({it.name.split(' ')[0]})</th><th style={{ width: 30 }}></th><th>Field Asseris</th></tr></thead>
                <tbody>
                  {it.mapping.map((m: any, i: any) => (
                    <tr key={i}><td style={{ fontWeight: 600 }}>{m[0]}</td><td><I.arrowRight size={13} style={{ color: 'var(--ink-4)' }} /></td><td className="mono tiny" style={{ color: 'var(--blue)' }}>{m[1]}</td></tr>
                  ))}
                  {!it.mapping.length && <tr><td colSpan={3} className="tiny muted">Pemetaan ditentukan saat konektor dihubungkan.</td></tr>}
                </tbody>
              </table>
            </>
          )}
          {tab === 'akses' && (
            <>
              <div className="tiny muted upper" style={{ marginBottom: 8 }}>Cakupan Izin (Scopes)</div>
              <div className="row gap6" style={{ flexWrap: 'wrap', marginBottom: 16 }}>
                {it.scopes.map((s: any, i: any) => <span key={i} className="chip mono tiny" style={{ height: 24 }}><I.lock size={11} /> {s}</span>)}
              </div>
              <div className="tiny muted upper" style={{ marginBottom: 8 }}>Kredensial</div>
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '9px 14px', marginBottom: 14 }}>
                <KvBox label="Metode" v={it.auth} />
                <KvBox label="Kadaluarsa" v={it.expiry} accent={it.expiry !== '—' && +new Date(it.expiry) - +new Date("2026-03-10") < 90 * 864e5 ? 'var(--amber)' : undefined} />
              </div>
              <div className="panel" style={{ padding: '9px 11px', boxShadow: 'none', marginBottom: 14 }}>
                <div className="tiny muted upper" style={{ marginBottom: 4 }}>API Key</div>
                <div className="row ac gap8"><span className="mono tiny" style={{ color: 'var(--ink-2)' }}>nsk_live_••••••••••••••••3f9a</span><Btn sm style={{ height: 24 }}>Rotasi</Btn></div>
              </div>
              <div className="row gap8"><Btn sm><I.sync size={13} /> Uji Koneksi</Btn><Btn sm style={{ color: 'var(--red)', borderColor: 'var(--red)' }}>Cabut Akses</Btn></div>
            </>
          )}
          {tab === 'webhook' && (
            <>
              <div className="tiny muted" style={{ marginBottom: 10 }}>Event yang memicu impor atau aksi otomatis di Asseris.</div>
              <div style={{ display: 'grid', gap: 8 }}>
                {it.webhooks.map((w: any, i: any) => (
                  <div key={i} className="panel row ac jb" style={{ padding: '9px 12px', boxShadow: 'none' }}>
                    <div><span className="mono tiny" style={{ fontWeight: 700 }}>{w[0]}</span></div>
                    <span className="badge" style={{ background: w[1] ? 'var(--green-bg)' : 'var(--surface-3)', color: w[1] ? 'var(--green)' : 'var(--ink-4)' }}>{w[1] ? 'Aktif' : 'Nonaktif'}</span>
                  </div>
                ))}
                {!it.webhooks.length && <div className="tiny muted">Tidak ada webhook terdaftar.</div>}
              </div>
            </>
          )}
          {tab === 'lineage' && (
            <>
              <div className="tiny muted" style={{ marginBottom: 12, lineHeight: 1.5 }}>Data dari konektor ini menjadi <b>sumber kebenaran tunggal</b> bagi modul berikut. Hitungan diambil live dari record yang sama yang dibaca modul hilir — tidak ada salinan terpisah.</div>
              <div style={{ display: 'grid', gap: 9 }}>
                {feeds.length ? feeds.map((f: any, i: any) => { const m = (window.MODULE_INDEX || {})[f.module] || { label: f.label, icon: 'panel' }; const MIc = (I as any)[m.icon] || I.panel; return (
                  <button key={i} className="panel row ac gap10" style={{ padding: '10px 12px', boxShadow: 'none', cursor: 'pointer', textAlign: 'left', width: '100%', border: '1px solid var(--line)' }} onClick={() => nav(f.module, { from: 'integrations' })} title={'Buka ' + (m.label || f.label)}>
                    <span style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--surface-3)', color: 'var(--navy)', display: 'grid', placeItems: 'center', flex: '0 0 34px' }}><MIc size={17} /></span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600 }}>{m.label || f.label}</div>
                      <div className="tiny muted">{AMS.fmt(f.n)} {f.unit}</div>
                    </div>
                    <span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{AMS.fmt(f.n)}</span>
                    <I.arrowRight size={13} style={{ color: 'var(--ink-4)' }} />
                  </button>
                ); }) : <div className="tiny muted">Belum ada modul hilir terdaftar untuk konektor ini.</div>}
              </div>
              {it.status === 'connected' && <div className="panel" style={{ padding: '9px 11px', marginTop: 12, boxShadow: 'none', background: 'var(--green-bg)', borderColor: 'transparent' }}><div className="row ac gap8 tiny" style={{ color: 'var(--green)', fontWeight: 600 }}><I.checkCircle size={14} /> Konsisten — {AMS.fmt(cdata.posted)} baris di-posting = {AMS.fmt(cdata.consumed)} dikonsumsi. Tanpa duplikasi.</div></div>}
            </>
          )}
        </>)}
      </div>
    </Panel>
  );
}

Object.assign(window, { Integrations });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { Integrations };
