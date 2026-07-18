/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { useAudit, useNav } from './contexts';
import { I } from './icons';
import { SubBar } from './shell';
import { Avatar, Badge, Btn, Panel, Seg, Stat } from './ui';
import { KvBox } from './view_analytical';

/* ============================================================
   Asseris — Firm Platform · Audit Trail (Bagian D-3)
   Filter lanjutan · grafik aktivitas · drawer detail entri · hash-chain (tamper-evident)
   ============================================================ */
const { useState: useStateAT, useMemo: useMemoAT } = React;

/* Seed sistem & jejak firma kanonik kini diturunkan dari
   AMS.PLATFORM.buildAuditStream() (lihat data_platform.js) —
   satu sumber kebenaran, digabung dengan log aktivitas live. */

const AT_ACT_COLOR = { LOGIN: 'gray', SIGN: 'purple', APPROVE: 'green', REJECT: 'red', UPLOAD: 'blue', SYNC: 'teal', EDIT: 'amber', SEND: 'blue', CREATE: 'blue', DELETE: 'red', EXPORT: 'purple' };

/* deterministic pseudo-hash for the tamper-evident chain demo */
function pseudoHash(str: any) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  const hex = (h >>> 0).toString(16).padStart(8, '0');
  return (hex + hex.split('').reverse().join('')).slice(0, 16);
}

function AuditTrail() {
  const { logEntries } = useAudit();
  const nav = useNav();
  const [q, setQ] = useStateAT('');
  const [actFilter, setActFilter] = useStateAT('All');
  const [userFilter, setUserFilter] = useStateAT('All');
  const [selIdx, setSelIdx] = useStateAT(null);

  /* === SUMBER KEBENARAN: arus terpadu dari log live + jejak firma kanonik + seed sistem === */
  const base = ((AMS as any).PLATFORM && (AMS as any).PLATFORM.buildAuditStream(logEntries)) || [];
  /* attach hash chain (oldest -> newest) */
  const all = useMemoAT(() => {
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

  const users = ['All', ...Array.from(new Set(all.map((a: any) => a.who)))];
  const actions = ['All', ...Array.from(new Set(all.map((a: any) => a.action)))];
  const filtered = all.filter((a: any) =>
    (actFilter === 'All' || a.action === actFilter) &&
    (userFilter === 'All' || a.who === userFilter) &&
    (q === '' || (a.who + a.detail + a.target + a.module).toLowerCase().includes(q.toLowerCase())));

  /* activity by day for the mini chart (last 5 days present in seed) */
  const byDay = useMemoAT(() => {
    const m = {};
    all.forEach((a: any) => { const d = a.ts.slice(5, 10); (m as any)[d] = ((m as any)[d] || 0) + 1; });
    return Object.entries(m).sort((a, b) => a[0] < b[0] ? -1 : 1);
  }, [all]);
  const actCounts = useMemoAT(() => {
    const m: any = {};
    all.forEach((a: any) => { m[a.action] = (m[a.action] || 0) + 1; });
    return Object.entries(m).sort((a: any, b: any) => b[1] - a[1]);
  }, [all]);

  const sel = selIdx != null ? filtered[selIdx] : null;

  return (
    <>
      <SubBar moduleId="audittrail" right={<div className="row gap8 ac"><Badge kind="blue"><I.lock size={11} style={{ verticalAlign: -1, marginRight: 3 }} />Immutable Log</Badge><Btn sm><I.download size={13} /> Export Log</Btn></div>} />
      <div className="view-scroll"><div className="view-pad">
        {/* KPI + integrity */}
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={AMS.fmt(all.length)} label="Total Entri" /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={all.filter((a: any) => a.ts.startsWith('2026-03-10') || a.ts.startsWith('2026-03-09')).length} label="Aktivitas 24 Jam" /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={new Set(all.map((a: any) => a.who)).size} label="Pengguna Unik" /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><div className="row ac gap8"><span style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--green-bg)', color: 'var(--green)', display: 'grid', placeItems: 'center', flex: '0 0 30px' }}><I.shield size={17} /></span><div><div style={{ fontSize: 14, fontWeight: 700, color: 'var(--green)' }}>Terverifikasi</div><div className="s-lbl">Integritas Hash-Chain</div></div></div></div></Panel>
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
                    <div style={{ width: '100%', maxWidth: 38, height: (n / max) * 70 + 6, background: 'var(--blue)', borderRadius: '3px 3px 0 0', opacity: i === byDay.length - 1 ? 1 : 0.5 }} />
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
                    <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--surface-3)', overflow: 'hidden' }}><span style={{ display: 'block', height: '100%', width: (n / max) * 100 + '%', background: 'var(--blue)' }} /></div>
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
            <thead><tr><th style={{ width: 44 }}>#</th><th style={{ width: 140 }}>Waktu</th><th>Pengguna</th><th style={{ width: 96 }}>Aksi</th><th>Detail</th><th style={{ width: 130 }}>Modul</th><th style={{ width: 110 }}>Hash</th></tr></thead>
            <tbody>
              {filtered.map((a: any, i: any) => (
                <tr key={i} onClick={() => setSelIdx(i)} className={selIdx === i ? 'sel' : ''} style={{ cursor: 'pointer' }}>
                  <td className="mono tiny muted">{String(a.seq).padStart(3, '0')}</td>
                  <td className="mono tiny muted">{a.ts}</td>
                  <td><div className="row ac gap8"><Avatar name={a.who} size={22} /><div style={{ minWidth: 0 }}><div style={{ fontWeight: 600, fontSize: 12 }} className="truncate">{a.who}</div><div className="tiny muted">{a.role}</div></div></div></td>
                  <td><Badge kind={(AT_ACT_COLOR as any)[a.action] || 'gray'}>{a.action}</Badge></td>
                  <td className="tiny" style={{ color: 'var(--ink-2)' }}>{a.detail}</td>
                  <td className="tiny muted">{a.module}</td>
                  <td className="mono tiny" style={{ color: 'var(--ink-4)' }}>{a.hash.slice(0, 8)}…</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
        <div className="tiny muted" style={{ marginTop: 8, lineHeight: 1.5 }}>Arus ini menyatukan tiga sumber kanonik: <b>log aktivitas live</b> (mis. persetujuan di modul Approvals), <b>jejak firma</b>, dan <b>peristiwa sistem</b> — satu sumber kebenaran, tanpa duplikasi. Setiap entri di-hash dan ditautkan ke entri sebelumnya (hash-chain) sehingga perubahan retroaktif terdeteksi. Klik entri untuk detail & navigasi ke modul sumber. Retensi 10 tahun sesuai ISQM.</div>
      </div></div>
      {sel && <AuditEntryDrawer e={sel} onClose={() => setSelIdx(null)} nav={nav} />}
    </>
  );
}

function AuditEntryDrawer({ e, onClose, nav }: any) {
  const meta = (window.MODULE_INDEX || {})[e.sourceModule];
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,20,30,.32)', zIndex: 88 }} onClick={onClose}>
      <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 460, maxWidth: '94vw', background: 'var(--surface)', boxShadow: 'var(--shadow-lg)', display: 'flex', flexDirection: 'column' }} onClick={(ev: any) => ev.stopPropagation()}>
        <div style={{ background: 'linear-gradient(125deg,#013a52,#005085)', color: '#fff', padding: '15px 18px' }}>
          <div className="row jb ac" style={{ marginBottom: 8 }}>
            <span className="mono tiny" style={{ fontWeight: 700, color: '#bcd6e4' }}>ENTRI #{String(e.seq).padStart(3, '0')}</span>
            <button className="top-btn" onClick={onClose}><I.x size={18} /></button>
          </div>
          <div className="row ac gap8"><Badge kind={(AT_ACT_COLOR as any)[e.action] || 'gray'}>{e.action}</Badge><span style={{ fontSize: 15, fontWeight: 700 }}>{e.target}</span></div>
          <div className="tiny" style={{ color: '#bcd6e4', marginTop: 4 }}>{e.detail}</div>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '9px 14px', marginBottom: 14 }}>
            <KvBox label="Pengguna" v={e.who} />
            <KvBox label="Peran" v={e.role} />
            <KvBox label="Waktu (WIB)" v={e.ts} />
            <KvBox label="Modul" v={e.module} />
            <KvBox label="Alamat IP" v={e.ip} />
            <KvBox label="Sesi" v={e.sess} />
          </div>
          <div className="panel" style={{ padding: '9px 11px', boxShadow: 'none', marginBottom: 14 }}>
            <div className="tiny muted upper" style={{ marginBottom: 3 }}>Perangkat / Agen</div>
            <div style={{ fontSize: 12.5, fontWeight: 600 }}>{e.device}</div>
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

          {/* hash chain integrity */}
          <div className="tiny muted upper" style={{ marginBottom: 8 }}>Bukti Integritas (Hash-Chain)</div>
          <div className="panel" style={{ padding: 12, boxShadow: 'none', background: 'var(--surface-2)', borderColor: 'transparent' }}>
            <div style={{ marginBottom: 8 }}>
              <div className="tiny muted">Hash entri sebelumnya</div>
              <div className="mono tiny" style={{ color: 'var(--ink-3)', wordBreak: 'break-all' }}>{e.prevHash}</div>
            </div>
            <div className="row ac gap6" style={{ marginBottom: 8 }}><I.chevDown size={13} style={{ color: 'var(--ink-4)' }} /><span className="tiny muted">+ payload entri ini</span></div>
            <div style={{ marginBottom: 10 }}>
              <div className="tiny muted">Hash entri ini</div>
              <div className="mono" style={{ fontSize: 12, fontWeight: 700, color: 'var(--blue)', wordBreak: 'break-all' }}>{e.hash}</div>
            </div>
            <div className="row ac gap6" style={{ padding: '7px 9px', background: 'var(--green-bg)', borderRadius: 6 }}>
              <I.checkCircle size={15} style={{ color: 'var(--green)' }} />
              <span className="tiny" style={{ fontWeight: 600, color: 'var(--green)' }}>Rantai utuh — entri tidak dimodifikasi sejak dicatat.</span>
            </div>
          </div>
        </div>
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--line)', display: 'flex', gap: 8 }}>
          {meta && nav && <Btn style={{ flex: 1 }} onClick={() => { nav(e.sourceModule, { from: 'audittrail' }); onClose(); }}><I.arrowRight size={14} /> Buka {meta.label}</Btn>}
          <Btn variant="primary" style={{ flex: meta ? '0 0 auto' : 1 }}><I.download size={14} /> Unduh Bukti</Btn>
          <Btn icon><I.shield size={14} /></Btn>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { AuditTrail });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { AuditTrail };
