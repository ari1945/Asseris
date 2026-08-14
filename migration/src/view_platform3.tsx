/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { useAudit, useAuditHeavy, useNav } from './contexts';
import { I } from './icons';
import { SubBar } from './shell';
import { Avatar, Badge, Btn, Panel, Seg, Stat } from './ui';
import { KvBox } from './view_analytical';
import { auditList, auditVerify } from './api';
import { resolveAuditView, deriveStats, type AuditRow, type VerifyState } from './audit_trail_core';
import { amsExportPdf } from './export_pdf';

/* ============================================================
   Asseris — Firm Platform · Audit Trail (PRD prd-audit-trail-server-chain.md)
   Sumber kebenaran = server chain (audit.list / audit.verify).
   Badge "Terverifikasi" HANYA tampil bila verify server true.
   ============================================================ */
const { useState: useStateAT, useMemo: useMemoAT, useEffect: useEffectAT } = React;

/* Seed sistem & jejak firma kanonik kini diturunkan dari
   AMS.PLATFORM.buildAuditStream() (lihat data_platform.js) —
   dipakai HANYA sebagai fallback saat server tak tersedia. */

const AT_ACT_COLOR: Record<string, string> = { LOGIN: 'gray', SIGN: 'purple', APPROVE: 'green', REJECT: 'red', UPLOAD: 'blue', SYNC: 'teal', EDIT: 'amber', SEND: 'blue', CREATE: 'blue', DELETE: 'red', EXPORT: 'purple', LLM_NARRATE: 'teal', ARCHIVE: 'purple', ATTACH_PURGE_APPROVE: 'red', LOGOUT: 'gray' };

/* deterministic pseudo-hash for the tamper-evident chain demo — dipertahankan HANYA
   untuk fallback lokal (server tak tersedia). Bukan sumber klaim integritas. */
function pseudoHash(str: any) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  const hex = (h >>> 0).toString(16).padStart(8, '0');
  return (hex + hex.split('').reverse().join('')).slice(0, 16);
}

function AuditTrail() {
  const { logEntries } = useAuditHeavy(['logEntries']);
  const nav = useNav();
  const [q, setQ] = useStateAT('');
  const [actFilter, setActFilter] = useStateAT('All');
  const [userFilter, setUserFilter] = useStateAT('All');
  const [selIdx, setSelIdx] = useStateAT(null);
  const [serverRows, setServerRows] = useStateAT(null as AuditRow[] | null);
  const [verify, setVerify] = useStateAT(null as VerifyState | null);
  const [exportMsg, setExportMsg] = useStateAT(null as string | null);

  /* P-2/P-3 — server chain adalah sumber kebenaran. auditList/auditVerify
     degrade ke null saat server mati / peran tanpa AUDIT_VIEW (api.ts:96-112). */
  useEffectAT(() => {
    let live = true;
    (async () => {
      const [rows, v] = await Promise.all([auditList(200), auditVerify()]);
      if (!live) return;
      if (rows) setServerRows(rows);
      if (v) setVerify(v);
    })();
    return () => { live = false; };
  }, []);

  /* fallback lokal — HANYA dipakai bila server tak tersedia */
  const fallbackRows = useMemoAT(() => {
    const base = ((AMS as any).PLATFORM && (AMS as any).PLATFORM.buildAuditStream(logEntries)) || [];
    const asc = [...base].slice().reverse();
    let prev = '0000000000000000';
    const withHash = asc.map((e, i) => {
      const h = pseudoHash(e.ts + e.who + e.action + (e.target || '') + e.detail + prev);
      const row = { ...e, prevHash: prev, hash: h, seq: i + 1 };
      prev = h;
      return row;
    });
    return withHash.reverse();
  }, [logEntries]);

  /* satu resolusi: server bila ada, fallback bila tidak — klaim integritas jujur */
  const view = useMemoAT(() => resolveAuditView(serverRows, verify, fallbackRows as any), [serverRows, verify, fallbackRows]);
  const all = view.rows as any[];

  const users = ['All', ...Array.from(new Set(all.map((a: any) => (a.actorUserId || a.who))))];
  const actions = ['All', ...Array.from(new Set(all.map((a: any) => a.action)))];
  const filtered = all.filter((a: any) =>
    (actFilter === 'All' || a.action === actFilter) &&
    (userFilter === 'All' || (a.actorUserId || a.who) === userFilter) &&
    (q === '' || ((a.actorUserId || a.who) + (a.detail || '') + (a.key || '') + (a.scopeId || '')).toLowerCase().includes(q.toLowerCase())));

  const stats = useMemoAT(() => deriveStats(all), [all]);
  const byDay = stats.byDay;
  const actCounts = stats.actCounts;

  const sel = selIdx != null ? filtered[selIdx] : null;

  /* P-4 — ekspor tersegel dari data yang DITAMPILKAN (server bila ada) */
  const doExport = async () => {
    setExportMsg(null);
    const r = await amsExportPdf({
      kind: 'audit-log', scope: 'firm', scopeId: 'WHR',
      fileName: `Jejak Audit - ${new Date().toISOString().slice(0, 10)}.pdf`,
      firm: 'KAP Wijaya Hartono & Rekan',
      title: 'Jejak Audit Sistem (Append-Only Hash-Chain)',
      refNo: `AUD-${all.length}-${new Date().toISOString().slice(0, 10)}`,
      meta: [
        `Sumber: ${view.source === 'server' ? 'server chain (audit.list)' : 'arus turunan lokal (server tidak tersedia)'}`,
        `Entri: ${all.length} · Verifikasi: ${view.verified === true ? 'OK' : view.verified === false ? `GAGAL di #${view.brokenAt}` : 'tidak dijalankan'}`,
      ],
      blocks: [
        { type: 'heading', text: 'Rekap' },
        { type: 'kv', rows: [['Total entri', String(all.length)], ['Pengguna unik', String(stats.uniqueUsers)], ['Sumber', view.source === 'server' ? 'Server chain' : 'Fallback lokal']] },
        { type: 'heading', text: 'Entri' },
        { type: 'table', head: ['#', 'Waktu', 'Pengguna', 'Peran', 'Aksi', 'Detail', 'Hash'], body: all.slice(0, 300).map((a: any) => [String(a.seq), String(a.ts), String(a.actorUserId || a.who), String(a.actorRole || a.role || ''), String(a.action), String(a.detail || ''), String(a.hash || '').slice(0, 16)]) },
      ],
    });
    if (r && r.sealed) setExportMsg(`Tersegel (Ed25519) — ${r.contentHash ? r.contentHash.slice(0, 12) : ''}…`);
    else if (r) setExportMsg('Terunduh — TIDAK TERSEGEL (server/izin ekspor tidak tersedia)');
    else setExportMsg('Gagal membuat PDF');
  };

  return (
    <>
      <SubBar moduleId="audittrail" right={<div className="row gap8 ac"><Badge kind="blue"><I.lock size={11} style={{ verticalAlign: -1, marginRight: 3 }} />Immutable Log</Badge><Btn sm onClick={doExport}><I.download size={13} /> Export Log</Btn></div>} />
      <div className="view-scroll"><div className="view-pad">
        {/* KPI + integrity */}
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={AMS.fmt(all.length)} label="Total Entri" /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={byDay.length ? byDay[byDay.length - 1][1] : 0} label="Aktivitas Hari Terakhir" /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={stats.uniqueUsers} label="Pengguna Unik" /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}>
            {view.verified === true ? (
              <div className="row ac gap8"><span style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--green-bg)', color: 'var(--green)', display: 'grid', placeItems: 'center', flex: '0 0 30px' }}><I.shield size={17} /></span><div><div style={{ fontSize: 15, fontWeight: 700, color: 'var(--green)' }}>Terverifikasi</div><div className="s-lbl">Rantai server utuh · {view.count} entri</div></div></div>
            ) : view.verified === false ? (
              <div className="row ac gap8"><span style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--red-bg)', color: 'var(--red)', display: 'grid', placeItems: 'center', flex: '0 0 30px' }}><I.shield size={17} /></span><div><div style={{ fontSize: 15, fontWeight: 700, color: 'var(--red)' }}>GAGAL VERIFIKASI</div><div className="s-lbl">Rantai rusak di entri #{view.brokenAt ?? '?'}</div></div></div>
            ) : view.source === 'fallback' ? (
              <div className="row ac gap8"><span style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--amber-bg)', color: 'var(--amber)', display: 'grid', placeItems: 'center', flex: '0 0 30px' }}><I.shield size={17} /></span><div><div style={{ fontSize: 15, fontWeight: 700, color: 'var(--amber)' }}>Server Tak Tersedia</div><div className="s-lbl">Arus turunan lokal — BUKAN jejak terverifikasi</div></div></div>
            ) : (
              <div className="row ac gap8"><span style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--amber-bg)', color: 'var(--amber)', display: 'grid', placeItems: 'center', flex: '0 0 30px' }}><I.shield size={17} /></span><div><div style={{ fontSize: 15, fontWeight: 700, color: 'var(--amber)' }}>Verifikasi Menunggu</div><div className="s-lbl">Data server ditampilkan; chain belum diverifikasi</div></div></div>
            )}
          </div></Panel>
        </div>

        {/* charts row */}
        <div className="grid" style={{ gridTemplateColumns: '1.4fr 1fr', gap: 12, marginBottom: 12 }}>
          <Panel noBody>
            <div className="panel-h"><h3>Aktivitas per Hari</h3><div style={{ flex: 1 }} /><span className="tiny muted">{byDay.length} hari terakhir</span></div>
            <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'flex-end', gap: 14, height: 120 }}>
              {byDay.map(([d, n]: any, i: any) => {
                const max = Math.max(...byDay.map((x: any) => x[1]));
                return (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, justifyContent: 'flex-end', height: '100%' }}>
                    <span className="mono tiny" style={{ fontWeight: 700 }}>{n}</span>
                    <div style={{ width: '100%', maxWidth: 38, height: (n / max) * 70 + 6, background: 'var(--blue-solid)', borderRadius: '3px 3px 0 0', opacity: i === byDay.length - 1 ? 1 : 0.5 }} />
                    <span className="tiny muted mono">{d}</span>
                  </div>
                );
              })}
            </div>
          </Panel>
          <Panel noBody>
            <div className="panel-h"><h3>Sebaran Aksi</h3></div>
            <div style={{ padding: '12px 16px', display: 'grid', gap: 7 }}>
              {actCounts.slice(0, 6).map(([a, n]: any, i: any) => {
                const max = actCounts[0][1];
                return (
                  <div key={i} className="row ac gap8">
                    <Badge kind={(AT_ACT_COLOR as any)[a] || 'gray'}>{a}</Badge>
                    <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--surface-3)', overflow: 'hidden' }}><span style={{ display: 'block', height: '100%', width: (n / max) * 100 + '%', background: 'var(--blue-solid)' }} /></div>
                    <span className="mono tiny" style={{ width: 18, textAlign: 'right', fontWeight: 700 }}>{n}</span>
                  </div>
                );
              })}
            </div>
          </Panel>
        </div>

        {/* filters */}
        <div className="row jb ac" style={{ marginBottom: 12, gap: 10, flexWrap: 'wrap' }}>
          <div className="global-search" style={{ background: 'var(--surface)', border: '1px solid var(--line)', height: 30, maxWidth: 300 }}>
            <I.search2 size={14} style={{ color: 'var(--ink-4)' }} /><input style={{ color: 'var(--ink)' }} placeholder="Cari pengguna, target, atau aktivitas…" value={q} onChange={(e: any) => setQ(e.target.value)} />
          </div>
          <div className="row gap8 ac">
            <select className="select" style={{ height: 30, width: 'auto' }} value={userFilter} onChange={(e: any) => { setUserFilter(e.target.value); setSelIdx(null); }}>{users.map(u => <option key={u} value={u}>{u === 'All' ? 'Semua pengguna' : u}</option>)}</select>
            <Seg options={actions.slice(0, 6)} value={actFilter} onChange={(v: any) => { setActFilter(v); setSelIdx(null); }} />
          </div>
        </div>

        <Panel noBody>
          <div className="panel-h"><h3>Jejak Audit Sistem</h3><div style={{ flex: 1 }} /><span className="tiny muted">{filtered.length} entri · tak dapat diubah · klik untuk detail</span></div>
          <table className="dtbl">
            <thead><tr><th style={{ width: 44 }}>#</th><th style={{ width: 150 }}>Waktu</th><th>Pengguna</th><th style={{ width: 96 }}>Aksi</th><th>Detail</th><th style={{ width: 130 }}>Lingkup</th><th style={{ width: 110 }}>Hash</th></tr></thead>
            <tbody>
              {filtered.map((a: any, i: any) => (
                <tr key={i} onClick={() => setSelIdx(i)} className={selIdx === i ? 'sel' : ''} style={{ cursor: 'pointer' }}>
                  <td className="mono tiny muted">{String(a.seq).padStart(3, '0')}</td>
                  <td className="mono tiny muted">{typeof a.ts === 'string' && a.ts.includes('T') ? new Date(a.ts).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) : a.ts}</td>
                  <td><div className="row ac gap8"><Avatar name={a.actorUserId || a.who} size={22} /><div style={{ minWidth: 0 }}><div style={{ fontWeight: 600, fontSize: 12 }} className="truncate">{a.actorUserId || a.who}</div><div className="tiny muted">{a.actorRole || a.role}</div></div></div></td>
                  <td><Badge kind={(AT_ACT_COLOR as any)[a.action] || 'gray'}>{a.action}</Badge></td>
                  <td className="tiny" style={{ color: 'var(--ink-2)' }}>{a.detail}</td>
                  <td className="tiny muted">{a.scopeId || a.module || a.scope || '—'}</td>
                  <td className="mono tiny" style={{ color: 'var(--ink-4)' }}>{(a.hash || '').slice(0, 8)}…</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
        <div className="tiny muted" style={{ marginTop: 8, lineHeight: 1.5 }}>{view.source === 'server'
          ? <>Sumber: <b>server chain append-only</b> (audit.list). Setiap entri di-hash SHA-256 dan ditautkan ke entri sebelumnya; <b>audit.verify</b> memverifikasi ulang seluruh rantai server-side — perubahan retroaktif terdeteksi. Detail = metadata saja (tanpa isi kertas kerja). Retensi 10 tahun (kebijakan KAP atas dokumentasi perikatan, SA 230).</>
          : <>Server chain tidak tersedia (server mati atau peran tanpa <span className="mono">AUDIT_VIEW</span>) — menampilkan <b>arus turunan lokal</b> dari log aktivitas. Bukan jejak append-only otoritatif; badge verifikasi sengaja tidak ditampilkan.</>}
        </div>
      </div></div>
      {exportMsg && <div style={{ padding: '6px 14px', background: 'var(--amber-bg)', color: 'var(--amber)', fontSize: 12 }}>{exportMsg}</div>}
      {sel && <AuditEntryDrawer e={sel} onClose={() => setSelIdx(null)} nav={nav} verified={view.verified} />}
    </>
  );
}

/* K-06 lanjutan — bukti per entri (drawer): ekspor PDF tersegel kartu entri audit.
   Didefinisikan di modul agar dapat memakai amsExportPdf (sudah diimpor).
   `AuditRow` kanonik ramping (seq/ts/actor/action/scope/key/detail) — field
   tampilan (who/role/module/sourceModule/before/after) diisi runtime seed. */
type AuditEntryLike = AuditRow & { who?: string; role?: string; module?: string; scope?: string; sourceModule?: string; before?: unknown; after?: unknown };
async function exportEntryPdf(eRaw: AuditEntryLike) {
  const e = eRaw as AuditEntryLike;
  const who = e.actorUserId || e.who || '—';
  const scopeLbl = e.scopeId || e.module || e.scope || '—';
  await amsExportPdf({
    kind: 'audit-entry', scope: 'firm', scopeId: 'WHR',
    fileName: `Bukti Audit #${String(e.seq).padStart(3, '0')}.pdf`,
    firm: 'KAP Wijaya Hartono & Rekan',
    title: 'Bukti Entri Audit — Jejak Append-Only',
    refNo: `AUD-${String(e.seq).padStart(3, '0')}`,
    meta: [`Aksi ${e.action} · ${who} · ${e.ts || ''}`,
      `Lingkup ${scopeLbl} · sumber ${e.sourceModule || '—'}`],
    blocks: [
      { type: 'kv', rows: [
        ['Entri', '#' + String(e.seq).padStart(3, '0')],
        ['Aksi', e.action],
        ['Pengguna', who],
        ['Peran', e.actorRole || e.role || '—'],
        ['Waktu', typeof e.ts === 'string' ? e.ts : '—'],
        ['Lingkup', scopeLbl],
        ['Kunci', e.key || '—'],
        ['Detail', e.detail || '—'],
      ] },
      ...((e.before || e.after) ? [
        { type: 'heading', text: 'Perubahan Nilai' },
        { type: 'kv', rows: [
          ['Sebelum', JSON.stringify(e.before)],
          ['Sesudah', JSON.stringify(e.after)],
        ] },
      ] : []),
    ],
  });
}

function AuditEntryDrawer({ e, onClose, nav, verified }: any) {
  const meta = (window.MODULE_INDEX || {})[e.sourceModule];
  /* K-06 lanjutan — wire tombol "Unduh Bukti" (dulu mati): ekspor PDF tersegel kartu entri. */
  const [exportingEntry, setExportingEntry] = React.useState(false);
  const doExportEntry = async () => {
    if (exportingEntry) return;
    setExportingEntry(true);
    try { await exportEntryPdf(e); } finally { setExportingEntry(false); }
  };
  /* field server (audit.list) vs field fallback (seed) — tampilkan apa yang ada */
  const who = e.actorUserId || e.who || '—';
  const role = e.actorRole || e.role || '';
  const scopeLbl = e.scopeId || e.module || e.scope || '—';
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,20,30,.32)', zIndex: 88 }} onClick={onClose}>
      <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 460, maxWidth: '94vw', background: 'var(--surface)', boxShadow: 'var(--shadow-lg)', display: 'flex', flexDirection: 'column' }} onClick={(ev: any) => ev.stopPropagation()}>
        <div style={{ background: 'linear-gradient(125deg,#013a52,#005085)', color: '#fff', padding: '15px 18px' }}>
          <div className="row jb ac" style={{ marginBottom: 8 }}>
            <span className="mono tiny" style={{ fontWeight: 700, color: '#bcd6e4' }}>ENTRI #{String(e.seq).padStart(3, '0')}</span>
            <button className="top-btn" onClick={onClose}><I.x size={18} /></button>
          </div>
          <div className="row ac gap8"><Badge kind={(AT_ACT_COLOR as any)[e.action] || 'gray'}>{e.action}</Badge><span style={{ fontSize: 15, fontWeight: 700 }}>{e.target || who}</span></div>
          <div className="tiny" style={{ color: '#bcd6e4', marginTop: 4 }}>{e.detail}</div>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '9px 14px', marginBottom: 14 }}>
            <KvBox label="Pengguna" v={who} />
            <KvBox label="Peran" v={role} />
            <KvBox label="Waktu (WIB)" v={typeof e.ts === 'string' && e.ts.includes('T') ? new Date(e.ts).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) : e.ts} />
            <KvBox label="Lingkup" v={scopeLbl} />
            <KvBox label="Kunci" v={e.key || '—'} />
            <KvBox label="Aksi" v={e.action} />
          </div>
          {(e.before || e.after) && (
            <>
              <div className="tiny muted upper" style={{ marginBottom: 8 }}>Perubahan Nilai</div>
              <div style={{ display: 'grid', gap: 8, marginBottom: 14 }}>
                <div className="panel" style={{ padding: '8px 11px', boxShadow: 'none', background: 'var(--red-bg)', borderColor: 'transparent' }}><div className="tiny" style={{ color: 'var(--red)', fontWeight: 600 }}>− Sebelum</div><div className="tiny mono" style={{ color: 'var(--ink-2)' }}>{e.before}</div></div>
                <div className="panel" style={{ padding: '8px 11px', boxShadow: 'none', background: 'var(--green-bg)', borderColor: 'transparent' }}><div className="tiny" style={{ color: 'var(--green)', fontWeight: 600 }}>+ Sesudah</div><div className="tiny mono" style={{ color: 'var(--ink-2)' }}>{e.after}</div></div>
              </div>
            </>
          )}

          {(e.cert || e.hashFile) && (
            <div className="panel" style={{ padding: '9px 11px', boxShadow: 'none', marginBottom: 14 }}>
              <div className="tiny muted upper" style={{ marginBottom: 3 }}>{e.cert ? 'Sertifikat Tanda Tangan' : 'Hash Berkas'}</div>
              <div className="mono tiny" style={{ color: 'var(--blue)' }}>{e.cert || e.hashFile}</div>
            </div>
          )}

          {/* hash chain integrity — klaim jujur sesuai verifikasi server (P-3) */}
          <div className="tiny muted upper" style={{ marginBottom: 8 }}>Bukti Integritas (Hash-Chain)</div>
          <div className="panel" style={{ padding: 12, boxShadow: 'none', background: 'var(--surface-2)', borderColor: 'transparent' }}>
            <div style={{ marginBottom: 8 }}>
              <div className="tiny muted">Hash entri sebelumnya</div>
              <div className="mono tiny" style={{ color: 'var(--ink-3)', wordBreak: 'break-all' }}>{e.prevHash || '—'}</div>
            </div>
            <div className="row ac gap6" style={{ marginBottom: 8 }}><I.chevDown size={13} style={{ color: 'var(--ink-4)' }} /><span className="tiny muted">+ payload entri ini</span></div>
            <div style={{ marginBottom: 10 }}>
              <div className="tiny muted">Hash entri ini</div>
              <div className="mono" style={{ fontSize: 12, fontWeight: 700, color: 'var(--blue)', wordBreak: 'break-all' }}>{e.hash || '—'}</div>
            </div>
            {verified === true ? (
              <div className="row ac gap6" style={{ padding: '7px 9px', background: 'var(--green-bg)', borderRadius: 6 }}>
                <I.checkCircle size={15} style={{ color: 'var(--green)' }} />
                <span className="tiny" style={{ fontWeight: 600, color: 'var(--green)' }}>Rantai server utuh — entri tidak dimodifikasi sejak dicatat (audit.verify).</span>
              </div>
            ) : verified === false ? (
              <div className="row ac gap6" style={{ padding: '7px 9px', background: 'var(--red-bg)', borderRadius: 6 }}>
                <I.x size={15} style={{ color: 'var(--red)' }} />
                <span className="tiny" style={{ fontWeight: 600, color: 'var(--red)' }}>Rantai GAGAL diverifikasi server — jejak dicurigai dimodifikasi.</span>
              </div>
            ) : (
              <div className="row ac gap6" style={{ padding: '7px 9px', background: 'var(--amber-bg)', borderRadius: 6 }}>
                <I.alert size={15} style={{ color: 'var(--amber)' }} />
                <span className="tiny" style={{ fontWeight: 600, color: 'var(--amber)' }}>Integritas belum diverifikasi (server chain tidak tersedia / verifikasi menunggu).</span>
              </div>
            )}
          </div>
        </div>
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--line)', display: 'flex', gap: 8 }}>
          {meta && nav && <Btn style={{ flex: 1 }} onClick={() => { nav(e.sourceModule, { from: 'audittrail' }); onClose(); }}><I.arrowRight size={14} /> Buka {meta.label}</Btn>}
          <Btn variant="primary" style={{ flex: meta ? '0 0 auto' : 1 }} onClick={doExportEntry} disabled={exportingEntry}><I.download size={14} /> {exportingEntry ? 'Menyiapkan…' : 'Unduh Bukti'}</Btn>
          <Btn icon title="Informasi integritas entri"><I.shield size={14} /></Btn>
        </div>
      </div>
    </div>
  );
}



/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { AuditTrail };
