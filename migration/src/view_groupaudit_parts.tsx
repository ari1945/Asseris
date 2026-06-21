/* [codemod] ESM imports */
import React from 'react';
import { I } from './icons.jsx';
import { Badge, Btn, Panel, Progress } from './ui.jsx';
import { KvBox } from './view_analytical';
import { GA_CONSOL_DOWN, GA_CONSOL_PROC, GA_CONSOL_UP, PKG_FIELDS, PKG_NUM_KEYS, PKG_STATUS_KIND } from './view_groupaudit';

/* ============================================================
   NeoSuite AMS — Group Audit (bagian): GAPackages · GAConsol · GAElimReview
   Dipecah dari view_groupaudit.jsx (W2). Dimuat SEBELUM view_groupaudit.jsx.
   Konstanta bersama (GA_CONSOL_*, PKG_*) tetap di file utama & dipublikasikan
   ke window agar tetap satu sumber; komponen di sini diekspor balik ke window.
   ============================================================ */
const { useState: useStateGAP } = React;

function GAPackages({ p65, packages, setPackages, seedSubs, fmt, nav, gotoTab }) {
  const [editId, setEditId] = useStateGAP(null);
  const [impId, setImpId] = useStateGAP(null);
  const [impText, setImpText] = useStateGAP('');
  const [impErr, setImpErr] = useStateGAP('');
  if (!p65) return <div style={{ padding: 24 }} className="muted">Memuat paket pelaporan (AMS_CANON.psak65)…</div>;

  const todayStr = () => new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  const setPkg = (id, patch) => setPackages(m => ({ ...m, [id]: { ...m[id], ...patch } }));
  const setField = (id, k, val) => setPkg(id, { [k]: (val === '' ? 0 : Number(val)) });
  const setStatus = (id, status) => setPackages(m => {
    const cur = m[id] || {};
    const received = cur.received || (status !== 'Ditolak' ? todayStr() : null);
    return { ...m, [id]: { ...cur, status, received } };
  });
  const resetSeed = (id) => { const s = seedSubs.find(x => x.id === id); if (!s) return; const f = {}; PKG_NUM_KEYS.forEach(k => f[k] = s[k]); setPkg(id, f); };
  const resetAll = () => setPackages(m => { const n = {}; seedSubs.forEach(s => { const f = { status: (m[s.id] && m[s.id].status) || 'Diterima', received: (m[s.id] && m[s.id].received) || null }; PKG_NUM_KEYS.forEach(k => f[k] = s[k]); n[s.id] = f; }); return n; });
  const approveBalanced = () => setPackages(m => { const n = { ...m }; p65.subs.forEach(s => { if (s.balanced) n[s.id] = { ...n[s.id], status: 'Disetujui', received: (n[s.id] && n[s.id].received) || todayStr() }; }); return n; });
  const fillTemplate = (id) => { const pk: any = packages[id] || {}; const t: any = {}; PKG_NUM_KEYS.forEach(k => t[k] = pk[k]); t.status = pk.status; setImpId(id); setImpText(JSON.stringify(t, null, 2)); setImpErr(''); };
  const applyImport = (id) => {
    try {
      const obj = JSON.parse(impText);
      if (!obj || typeof obj !== 'object' || Array.isArray(obj)) throw new Error('bukan objek paket');
      const patch: any = {};
      PKG_NUM_KEYS.forEach(k => { if (typeof obj[k] === 'number' && isFinite(obj[k])) patch[k] = obj[k]; });
      if (typeof obj.status === 'string' && PKG_STATUS_KIND[obj.status]) patch.status = obj.status;
      if (typeof obj.received === 'string') patch.received = obj.received;
      if (!Object.keys(patch).length) throw new Error('tidak ada field figur yang dikenali');
      setPkg(id, patch); setImpId(null); setImpText(''); setImpErr('');
    } catch (e) { setImpErr('JSON tidak valid — ' + (e.message || 'parse error')); }
  };

  const c = p65.pkgCounts || {};
  const consolFinal = p65.pkgAllApproved && p65.pkgAllBalanced;
  const subs = p65.subs;

  const StatusActions = ({ s }) => {
    const id = s.id, st = s.pkgStatus;
    if (st === 'Disetujui') return <Btn sm onClick={() => setStatus(id, 'Direkonsiliasi')}><I.x size={11} /> Buka kembali</Btn>;
    if (st === 'Ditolak') return <Btn sm variant="primary" onClick={() => setStatus(id, 'Diterima')}><I.upload size={11} /> Terima ulang</Btn>;
    if (st === 'Direkonsiliasi') return (
      <div className="row gap6 ac">
        {s.balanced
          ? <Btn sm variant="primary" onClick={() => setStatus(id, 'Disetujui')}><I.checkCircle size={11} /> Setujui</Btn>
          : <span className="tiny" style={{ color: 'var(--red)', fontWeight: 600 }}>Belum menutup</span>}
        <Btn sm onClick={() => setStatus(id, 'Diterima')}>Kembalikan</Btn>
      </div>
    );
    /* Diterima / Seed */
    return (
      <div className="row gap6 ac">
        <Btn sm variant="primary" onClick={() => setStatus(id, 'Direkonsiliasi')}><I.check size={11} /> Rekonsiliasi</Btn>
        <Btn sm onClick={() => setStatus(id, 'Ditolak')}>Tolak</Btn>
      </div>
    );
  };

  return (
    <div style={{ padding: 14, display: 'grid', gap: 12 }}>
      {/* KPI */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(5,1fr)', gap: 10 }}>
        <KvBox label="Total paket komponen" v={subs.length} accent="var(--navy)" />
        <KvBox label="Diterima — perlu reviu" v={(c.Diterima || 0) + (c.Seed || 0)} accent={(c.Diterima || 0) + (c.Seed || 0) ? 'var(--amber)' : 'var(--green)'} />
        <KvBox label="Direkonsiliasi" v={c.Direkonsiliasi || 0} accent="var(--blue)" />
        <KvBox label="Disetujui" v={(c.Disetujui || 0) + '/' + subs.length} accent={p65.pkgAllApproved ? 'var(--green)' : 'var(--amber)'} />
        <KvBox label="Paket menutup (A=L+E)" v={p65.pkgAllBalanced ? 'Semua ✓' : (subs.filter(s => !s.balanced).length + ' tidak')} accent={p65.pkgAllBalanced ? 'var(--green)' : 'var(--red)'} />
      </div>

      {/* banner + aksi massal */}
      <div className="row ac gap8" style={{ padding: '9px 13px', borderRadius: 9, background: consolFinal ? 'var(--green-bg)' : 'var(--amber-bg)' }}>
        <span style={{ color: consolFinal ? 'var(--green)' : 'var(--amber)' }}>{consolFinal ? <I.checkCircle size={16} /> : <I.alert size={16} />}</span>
        <span className="tiny" style={{ flex: 1, lineHeight: 1.5 }}>
          {consolFinal
            ? <><b>Semua paket siap.</b> Figur konsolidasi ditarik dari paket komponen yang telah disetujui melalui AMS_CANON (sumber kebenaran tunggal).</>
            : <><b>Reviu paket berjalan.</b> Figur yang diimpor/disunting mengalir LIVE ke kertas kerja konsolidasi & PSAK 65. Setujui paket yang sudah menutup untuk finalisasi.</>}
        </span>
        <Btn sm onClick={approveBalanced}><I.checkCircle size={12} /> Setujui yang menutup</Btn>
        <Btn sm onClick={resetAll}><I.upload size={12} /> Reset figur ke seed</Btn>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 300px', gap: 12, alignItems: 'start' }}>
        {/* daftar paket + editor/impor */}
        <Panel noBody>
          <div className="panel-h"><h3>Paket Pelaporan Komponen</h3><span className="sub mono">SA 600 ¶B86 · alur Diterima → Direkonsiliasi → Disetujui</span><div style={{ flex: 1 }} /><span className="tiny muted">Rp juta</span></div>
          <table className="dtbl">
            <thead><tr>
              <th>Komponen & sumber</th><th style={{ width: 78 }}>Diterima</th><th className="num" style={{ width: 78 }}>Aset</th>
              <th className="num" style={{ width: 92 }}>Selisih A−(L+E)</th><th style={{ width: 116 }}>Status</th><th style={{ width: 172 }}></th>
            </tr></thead>
            <tbody>
              {subs.map(s => {
                const pk = packages[s.id] || {};
                const open = editId === s.id, imp = impId === s.id;
                return (
                  <React.Fragment key={s.id}>
                    <tr>
                      <td>
                        <div className="row ac gap8">
                          <span style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--navy)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 9, fontWeight: 700, flex: '0 0 24px' }}>{s.own}%</span>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: 12 }}>{s.name}</div>
                            <div className="tiny muted">{s.auditor} · {s.country} · {s.ccy}{s.ccy !== 'IDR' && <span> @ {fmt(s.fx / 1e3, 1)}k</span>}</div>
                          </div>
                        </div>
                      </td>
                      <td className="tiny">{pk.received || '—'}</td>
                      <td className="num mono">{fmt(s.assets)}</td>
                      <td className="num mono" style={{ fontWeight: 700, color: s.balanced ? 'var(--green)' : 'var(--red)' }}>{s.balanced ? '0 ✓' : fmt(s.internalBal)}</td>
                      <td><Badge kind={PKG_STATUS_KIND[s.pkgStatus] || 'gray'}>{s.pkgStatus === 'Seed' ? 'Seed' : s.pkgStatus}</Badge></td>
                      <td>
                        <div className="row gap6 ac" style={{ justifyContent: 'flex-end' }}>
                          <Btn sm onClick={() => { setEditId(open ? null : s.id); setImpId(null); }}><I.chevDown size={12} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: '.15s' }} /> {open ? 'Tutup' : 'Sunting'}</Btn>
                          <Btn sm onClick={() => imp ? setImpId(null) : fillTemplate(s.id)}><I.upload size={12} /> Impor</Btn>
                        </div>
                      </td>
                    </tr>
                    {(open || imp) && (
                      <tr><td colSpan={6} style={{ background: 'var(--surface-2)', padding: 0 }}>
                        <div style={{ padding: 14, display: 'grid', gap: 12 }}>
                          {open && (
                            <div>
                              <div className="row ac jb" style={{ marginBottom: 8 }}>
                                <div className="tiny upper" style={{ fontWeight: 700, letterSpacing: '.04em', color: 'var(--ink-3)' }}>Sunting figur paket — {s.id}</div>
                                <Btn sm onClick={() => resetSeed(s.id)}><I.upload size={11} /> Reset ke seed</Btn>
                              </div>
                              <div className="grid" style={{ gridTemplateColumns: 'repeat(5,1fr)', gap: 10 }}>
                                {PKG_FIELDS.map(g => (
                                  <div key={g.sec}>
                                    <div className="tiny muted upper" style={{ fontWeight: 700, marginBottom: 5, letterSpacing: '.03em' }}>{g.sec}</div>
                                    <div style={{ display: 'grid', gap: 6 }}>
                                      {g.items.map(([k, lbl]) => (
                                        <label key={k} style={{ display: 'grid', gap: 2 }}>
                                          <span className="tiny muted">{lbl}</span>
                                          <input type="number" value={pk[k] != null ? pk[k] : ''} onChange={e => setField(s.id, k, e.target.value)}
                                            style={{ width: '100%', padding: '5px 7px', border: '1px solid var(--line)', borderRadius: 6, fontSize: 12, fontFamily: 'var(--mono, monospace)', background: 'var(--surface)', color: 'var(--ink)' }} />
                                        </label>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <div className="row ac gap8" style={{ marginTop: 10, padding: '8px 11px', borderRadius: 7, background: s.balanced ? 'var(--green-bg)' : 'var(--red-bg)' }}>
                                <span style={{ color: s.balanced ? 'var(--green)' : 'var(--red)' }}>{s.balanced ? <I.checkCircle size={14} /> : <I.alert size={14} />}</span>
                                <span className="tiny" style={{ flex: 1, lineHeight: 1.5 }}>
                                  Aset Rp {fmt(s.assets)} jt = Liabilitas Rp {fmt(s.liab)} jt + Ekuitas Rp {fmt(s.equityNow)} jt · selisih <b className="mono">{fmt(s.internalBal)}</b> jt. {s.balanced ? 'Paket menutup — siap direkonsiliasi/disetujui.' : 'Paket belum menutup — perbaiki sebelum menyetujui.'}
                                </span>
                              </div>
                            </div>
                          )}
                          {imp && (
                            <div>
                              <div className="tiny upper" style={{ fontWeight: 700, letterSpacing: '.04em', color: 'var(--ink-3)', marginBottom: 6 }}>Impor paket (JSON) — {s.id}</div>
                              <div className="tiny muted" style={{ marginBottom: 6, lineHeight: 1.5 }}>Tempel paket pelaporan komponen dalam format JSON (field figur: {PKG_NUM_KEYS.join(', ')}; opsional <span className="mono">status</span>, <span className="mono">received</span>). Field yang tidak dikenali diabaikan.</div>
                              <textarea value={impText} onChange={e => { setImpText(e.target.value); setImpErr(''); }} spellCheck={false}
                                style={{ width: '100%', minHeight: 150, padding: 10, border: '1px solid var(--line)', borderRadius: 7, fontSize: 11.5, fontFamily: 'var(--mono, monospace)', lineHeight: 1.5, background: 'var(--surface)', color: 'var(--ink)', resize: 'vertical' }} />
                              {impErr && <div className="tiny" style={{ color: 'var(--red)', marginTop: 6, fontWeight: 600 }}><I.alert size={11} style={{ verticalAlign: 'middle' }} /> {impErr}</div>}
                              <div className="row gap8" style={{ marginTop: 8 }}>
                                <Btn sm variant="primary" onClick={() => applyImport(s.id)}><I.upload size={12} /> Impor & terapkan</Btn>
                                <Btn sm onClick={() => { setImpId(null); setImpText(''); setImpErr(''); }}>Batal</Btn>
                              </div>
                            </div>
                          )}
                        </div>
                      </td></tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
          <div className="tiny muted" style={{ padding: '9px 14px 12px', lineHeight: 1.5 }}>Selisih kolom A−(L+E) menguji paket menutup sebelum digabung (PSAK 65 ¶19 · keseragaman & integritas paket). Setiap perubahan figur mengalir LIVE ke <span className="mono">AMS_CANON.psak65</span> → tab Konsolidasi & PSAK 65.</div>
        </Panel>

        {/* right rail */}
        <div className="grid" style={{ gap: 12 }}>
          <Panel noBody>
            <div className="panel-h"><h3>Alur Paket Pelaporan</h3><span className="sub mono">SA 600</span></div>
            <div style={{ padding: 14, display: 'grid', gap: 0 }}>
              {[
                ['Diterima', 'amber', 'Paket masuk dari auditor komponen / tim grup; figur diimpor.'],
                ['Direkonsiliasi', 'blue', 'Diuji menutup (A=L+E) & seragam kebijakan akuntansi grup.'],
                ['Disetujui', 'green', 'Sign-off tim grup; figur masuk konsolidasi final.'],
              ].map((row, i, arr) => (
                <div key={row[0]} className="row gap9" style={{ alignItems: 'flex-start' }}>
                  <div style={{ display: 'grid', justifyItems: 'center', flex: '0 0 16px' }}>
                    <span style={{ width: 11, height: 11, borderRadius: 999, background: 'var(--' + row[1] + ')', marginTop: 3 }} />
                    {i < arr.length - 1 && <span style={{ width: 2, height: 30, background: 'var(--line)' }} />}
                  </div>
                  <div style={{ paddingBottom: i < arr.length - 1 ? 10 : 0 }}>
                    <div className="tiny" style={{ fontWeight: 700 }}>{row[0]}</div>
                    <div className="tiny muted" style={{ lineHeight: 1.4 }}>{row[2]}</div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Keterhubungan">
            <div className="tiny muted" style={{ lineHeight: 1.5, marginBottom: 10 }}>Figur paket → <b>AMS_CANON.psak65</b> → kertas kerja konsolidasi, NCI, goodwill (tie ke PSAK 48), serta LK konsolidasian (FS Generator). Satu sumber, konsisten lintas-modul.</div>
            <div style={{ display: 'grid', gap: 6 }}>
              <Btn sm style={{ width: '100%' }} onClick={() => gotoTab && gotoTab('consol')}><I.columns size={13} /> Lihat kertas kerja konsolidasi</Btn>
              <Btn sm style={{ width: '100%' }} onClick={() => nav('psak65', { from: 'groupaudit' })}><I.building size={13} /> Modul PSAK 65</Btn>
              <Btn sm style={{ width: '100%' }} onClick={() => nav('fsgen', { from: 'groupaudit' })}><I.report size={13} /> FS Generator</Btn>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

/* ===== TAB 4 — KONSOLIDASI & ELIMINASI ======================== */
/* Kertas kerja konsolidasi (re-performance tim audit grup · SA 600 ¶B86).
   SELURUH angka ditarik dari satu sumber kebenaran AMS_CANON.psak65(WTB) —
   identik dengan modul PSAK 65 (entitas induk live dari WTB). */
const ELIM_STAT = { Diverifikasi: 'green', Selisih: 'red', Review: 'amber' };
const ELIM_TYPE_KIND = { Pendapatan: 'blue', Laba: 'purple', Posisi: 'gray', OCI: 'amber' };
const SEC_KEY_GA = { Aset: 'aset', Liabilitas: 'liab', Ekuitas: 'ekuitas' };

function GAConsol({ p65, fmt, nav, gotoTab }) {
  if (!p65) return <div style={{ padding: 24 }} className="muted">Memuat model konsolidasi (AMS_CANON.psak65)…</div>;
  const rp = x => 'Rp ' + fmt(Math.round(x));
  const sgn = x => x < 0 ? '(' + fmt(Math.round(-x)) + ')' : fmt(Math.round(x));
  const balanced = p65.balCheck === 0;
  const gwTie = p65.goodwillTotal === p65.goodwillTie;
  const base = p65.indukSeparate + p65.subsNpat; // basis % kontribusi laba entitas

  const consolFinal = p65.pkgAllApproved && p65.pkgAllBalanced && balanced;

  return (
    <div style={{ padding: 14, display: 'grid', gap: 12 }}>
      {/* gerbang paket pelaporan — konsolidasi final hanya bila semua paket disetujui & menutup */}
      <div className="row ac gap8" style={{ padding: '9px 13px', borderRadius: 9, background: consolFinal ? 'var(--green-bg)' : 'var(--amber-bg)' }}>
        <span style={{ color: consolFinal ? 'var(--green)' : 'var(--amber)' }}>{consolFinal ? <I.checkCircle size={16} /> : <I.alert size={16} />}</span>
        <span className="tiny" style={{ flex: 1, lineHeight: 1.5 }}>
          {consolFinal
            ? <><b>Konsolidasi final.</b> Seluruh {p65.subs.length} paket pelaporan komponen telah diterima, direkonsiliasi & disetujui — figur ditarik dari paket via AMS_CANON (SSOT).</>
            : <><b>Konsolidasi provisional.</b> {p65.pkgApproved}/{p65.subs.length} paket komponen disetujui{!p65.pkgAllBalanced ? ' · ada paket belum menutup (aset ≠ liab + ekuitas)' : ''}. Selesaikan reviu paket sebelum finalisasi.</>}
        </span>
        <Btn sm onClick={() => gotoTab && gotoTab('packages')}><I.upload size={12} /> Paket Pelaporan</Btn>
      </div>
      {/* KPI — diturunkan dari canon */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(5,1fr)', gap: 10 }}>
        <KvBox label="Entitas dikonsolidasi" v={p65.counts.consolidated + ' anak'} accent="var(--navy)" />
        <KvBox label="Total aset konsolidasian" v={rp(p65.totals.aset.konsol) + ' jt'} accent="var(--blue)" />
        <KvBox label="Laba konsolidasi (NPAT)" v={rp(p65.consolNpat) + ' jt'} accent="var(--green)" />
        <KvBox label="Kepentingan nonpengendali" v={rp(p65.nciCloseTotal) + ' jt'} accent="var(--amber)" />
        <KvBox label="Goodwill konsolidasi" v={rp(p65.goodwillTotal) + ' jt'} accent={gwTie ? 'var(--navy)' : 'var(--red)'} />
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 320px', gap: 12, alignItems: 'start' }}>
        {/* worksheet — re-performance LPK */}
        <Panel noBody>
          <div className="panel-h"><h3>Kertas Kerja Konsolidasi — Re-performance (LPK)</h3><div style={{ flex: 1 }} /><span className="tiny muted">Induk + Σ Anak − Eliminasi = Konsolidasian · Rp juta</span></div>
          <table className="dtbl">
            <thead><tr>
              <th>Pos laporan posisi keuangan</th>
              <th className="num" style={{ width: 90 }}>Induk (WTB)</th>
              <th className="num" style={{ width: 78 }}>Σ Anak</th>
              <th className="num" style={{ width: 86 }}>Eliminasi</th>
              <th className="num" style={{ width: 96 }}>Konsolidasian</th>
            </tr></thead>
            <tbody>
              {['Aset', 'Liabilitas', 'Ekuitas'].map(sec => (
                <React.Fragment key={sec}>
                  <tr style={{ background: 'var(--surface-2)' }}><td colSpan={5} className="tiny upper" style={{ fontWeight: 700, letterSpacing: '.04em', color: 'var(--ink-3)' }}>{sec}</td></tr>
                  {p65.ws.filter(r => r.sec === sec).map(r => (
                    <tr key={r.cap} style={{ background: r.gw ? 'var(--blue-050)' : r.nci ? 'var(--amber-bg)' : undefined }}>
                      <td><div className="row ac gap6" style={{ fontSize: 12, fontWeight: r.gw || r.nci ? 700 : 500 }}><span>{r.label}</span>{r.seed && <span className="mono tiny" style={{ color: 'var(--ink-4)' }}>seed</span>}{r.gw && <Badge kind="blue">PSAK 22</Badge>}{r.nci && <Badge kind="amber">NCI</Badge>}</div></td>
                      <td className="num mono">{r.induk ? sgn(r.induk) : '—'}</td>
                      <td className="num mono">{r.anak ? sgn(r.anak) : '—'}</td>
                      <td className="num mono" style={{ color: r.elim ? 'var(--red)' : 'var(--ink-4)' }}>{r.elim ? sgn(r.elim) : '—'}</td>
                      <td className="num mono" style={{ fontWeight: 700, color: r.gw ? 'var(--blue)' : r.nci ? 'var(--amber)' : 'var(--navy)' }}>{sgn(r.konsol)}</td>
                    </tr>
                  ))}
                  <tr style={{ borderTop: '1.5px solid var(--line)' }}>
                    <td style={{ fontWeight: 700, color: 'var(--navy)' }}>Total {sec}</td>
                    <td className="num mono" style={{ fontWeight: 700 }}>{sgn(p65.totals[SEC_KEY_GA[sec]].induk)}</td>
                    <td className="num mono" style={{ fontWeight: 700 }}>{sgn(p65.totals[SEC_KEY_GA[sec]].anak)}</td>
                    <td className="num mono" style={{ fontWeight: 700, color: 'var(--red)' }}>{sgn(p65.totals[SEC_KEY_GA[sec]].elim)}</td>
                    <td className="num mono" style={{ fontWeight: 800, color: 'var(--navy)' }}>{sgn(p65.totals[SEC_KEY_GA[sec]].konsol)}</td>
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>
          <div className="row ac gap8" style={{ padding: '10px 14px', borderTop: '1px solid var(--line-soft)', background: balanced ? 'var(--green-bg)' : 'var(--red-bg)' }}>
            <span style={{ color: balanced ? 'var(--green)' : 'var(--red)' }}>{balanced ? <I.checkCircle size={15} /> : <I.alert size={15} />}</span>
            <span className="tiny" style={{ flex: 1, lineHeight: 1.5 }}>Re-performance tim grup: <b>Aset Rp {fmt(p65.totals.aset.konsol)} jt</b> = Liabilitas Rp {fmt(p65.totals.liab.konsol)} jt + Ekuitas Rp {fmt(p65.totals.ekuitas.konsol)} jt. Selisih <b className="mono">Rp {fmt(p65.balCheck)} jt</b> — kertas kerja menutup.</span>
          </div>
        </Panel>

        {/* right rail */}
        <div className="grid" style={{ gap: 12 }}>
          <Panel title="Status Konsolidasi">
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <KvBox label="Entitas anak" v={p65.counts.consolidated} />
              <KvBox label="Asosiasi/ventura" v={p65.counts.associates} accent="var(--blue)" />
              <KvBox label="Jurnal eliminasi" v={p65.interco.length} />
              <KvBox label="Pos LPK" v={p65.ws.length} />
            </div>
            <div className="panel" style={{ padding: '8px 11px', background: gwTie ? 'var(--green-bg)' : 'var(--red-bg)', borderColor: 'transparent', marginTop: 10 }}>
              <div className="tiny" style={{ fontWeight: 600, color: gwTie ? 'var(--green)' : 'var(--red)', lineHeight: 1.4 }}>
                {gwTie ? <I.checkCircle size={12} style={{ verticalAlign: 'middle' }} /> : <I.alert size={12} style={{ verticalAlign: 'middle' }} />} Goodwill Rp {fmt(p65.goodwillTotal)} jt {gwTie ? 'tie ke PSAK 48 (uji UPK) ✓' : '≠ angka PSAK 48 — telusuri.'}
              </div>
            </div>
            <div className="divider" />
            <div className="tiny muted" style={{ lineHeight: 1.5 }}>Angka ditarik dari <span className="mono">AMS_CANON.psak65(WTB)</span> — identik dengan modul <b>PSAK 65</b>. Setiap AJE pada entitas induk mengalir live ke kertas kerja ini.</div>
            <Btn sm style={{ width: '100%', marginTop: 10 }} onClick={() => nav('psak65', { from: 'groupaudit' })}><I.building size={13} /> Buka modul PSAK 65</Btn>
          </Panel>

          <Panel title={'Translasi FX — ' + p65.translation.name}>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <KvBox label="Kurs penutup" v={'Rp ' + fmt(p65.translation.closeRate)} />
              <KvBox label="Kurs rata-rata" v={'Rp ' + fmt(p65.translation.avgRate)} />
            </div>
            <div className="panel" style={{ padding: '8px 11px', background: 'var(--amber-bg)', borderColor: 'transparent', marginTop: 10 }}>
              <div className="tiny" style={{ fontWeight: 600, color: 'var(--amber)', lineHeight: 1.4 }}><I.alert size={12} style={{ verticalAlign: 'middle' }} /> Selisih kurs translasi (CTA) Rp {fmt(p65.translation.cta)} jt dicatat di OCI — PSAK 10 ¶39, menunggu review tim grup.</div>
            </div>
          </Panel>
        </div>
      </div>

      {/* roll-up laba konsolidasi */}
      <Panel noBody>
        <div className="panel-h"><h3>Roll-Up Konsolidasi — Laba Tahun Berjalan (NPAT)</h3><div style={{ flex: 1 }} /><span className="tiny muted">Rp juta</span></div>
        <table className="dtbl">
          <thead><tr><th>Entitas</th><th>Mata uang</th><th className="num">Kontribusi NPAT</th><th className="num">% Entitas</th></tr></thead>
          <tbody>
            <tr>
              <td><div style={{ fontWeight: 600, fontSize: 12 }}>PT Sentosa Makmur Tbk <span className="tiny muted">(induk · LK terpisah)</span></div><div className="tiny muted">incl. penghasilan dividen anak Rp {fmt(p65.dividendIncome)} jt</div></td>
              <td className="tiny">IDR</td>
              <td className="num mono">{fmt(p65.indukSeparate)}</td>
              <td className="num">{Math.round(p65.indukSeparate / base * 100)}%</td>
            </tr>
            {p65.subs.map(s => (
              <tr key={s.id}>
                <td><div style={{ fontWeight: 600, fontSize: 12 }}>{s.name}</div><div className="tiny muted">{s.role} · {s.country}</div></td>
                <td className="tiny">{s.ccy}{s.ccy !== 'IDR' && <span className="muted"> @ {fmt(s.fx / 1e3, 2)}k</span>}</td>
                <td className="num mono">{fmt(s.npat)}</td>
                <td className="num">{Math.round(s.npat / base * 100)}%</td>
              </tr>
            ))}
            <tr style={{ background: 'var(--surface-2)' }}>
              <td style={{ fontWeight: 700 }}>Subtotal entitas</td><td></td>
              <td className="num mono" style={{ fontWeight: 700 }}>{fmt(base)}</td><td className="num">100%</td>
            </tr>
            <tr>
              <td className="row ac gap6"><I.scale size={13} style={{ color: 'var(--red)' }} /> Eliminasi laba belum terealisasi (persediaan)</td><td></td>
              <td className="num mono" style={{ color: 'var(--red)' }}>({fmt(640)})</td><td></td>
            </tr>
            <tr>
              <td className="tiny muted" style={{ paddingLeft: 22 }}>Eliminasi penghasilan dividen antar-perusahaan</td><td></td>
              <td className="num mono tiny" style={{ color: 'var(--red)' }}>({fmt(2100)})</td><td></td>
            </tr>
          </tbody>
          <tfoot>
            <tr><td style={{ fontWeight: 700, color: 'var(--navy)' }}>NPAT KONSOLIDASIAN</td><td></td><td className="num mono" style={{ fontWeight: 800, color: 'var(--navy)' }}>{fmt(p65.consolNpat)}</td><td></td></tr>
            <tr><td className="tiny muted" style={{ paddingLeft: 14 }}>— Diatribusikan ke pemilik induk</td><td></td><td className="num mono tiny" style={{ fontWeight: 600 }}>{fmt(p65.ownersProfit)}</td><td></td></tr>
            <tr><td className="tiny muted" style={{ paddingLeft: 14 }}>— Diatribusikan ke NCI</td><td></td><td className="num mono tiny" style={{ fontWeight: 600, color: 'var(--amber)' }}>{fmt(p65.nciProfit)}</td><td></td></tr>
          </tfoot>
        </table>
        <button onClick={() => nav('fsgen', { from: 'groupaudit' })} className="row ac jb" style={{ padding: '10px 14px', borderTop: '1px solid var(--line-soft)', background: 'var(--surface-2)', cursor: 'pointer', width: '100%', textAlign: 'left', border: 'none' }}>
          <span className="tiny" style={{ lineHeight: 1.5 }}>NPAT konsolidasian & LPK mengalir ke <b>FS Generator</b> untuk penyajian laporan keuangan konsolidasian. Reviu rincian jurnal eliminasi pada tab <b>Reviu Eliminasi (SA 600)</b>.</span>
          <I.arrowRight size={13} style={{ color: 'var(--ink-4)' }} />
        </button>
      </Panel>
    </div>
  );
}

/* ===== TAB 5 (BARU) — REVIU ELIMINASI (SA 600) ================ */
function GAElimReview({ p65, fmt, nav, elimVerify, setElimVerify, procDone, setProcDone }) {
  if (!p65) return <div style={{ padding: 24 }} className="muted">Memuat model konsolidasi (AMS_CANON.psak65)…</div>;
  const rp = x => 'Rp ' + fmt(Math.round(x));
  const stat = e => (elimVerify[e.id] || e.status === 'Diverifikasi') ? 'Diverifikasi' : e.status;
  const toggleVerify = id => setElimVerify(m => ({ ...m, [id]: !m[id] }));
  const verifiedCount = p65.interco.filter(e => stat(e) === 'Diverifikasi').length;
  const elm03 = p65.interco.find(e => e.id === 'ELM-03') || { amount: 3200, diff: 180 };

  /* rekonsiliasi saldo antar-perusahaan — total & selisih dari canon (ELM-03);
     rincian penyebab dinormalkan agar Σ = selisih kanonik. */
  const arRecorded = elm03.amount;                 // piutang antar-pr. dibukukan induk
  const apRecorded = elm03.amount - (elm03.diff || 0); // utang antar-pr. dibukukan anak
  const reconCauses = [
    { t: 'Barang dalam perjalanan (FOB) belum diterima anak', v: 120 },
    { t: 'Nota debit retur belum dibukukan komponen', v: (elm03.diff || 180) - 120 },
  ];

  /* checklist prosedur */
  const procPct = Math.round(GA_CONSOL_PROC.filter((p, i) => procDone[p.ref + i]).length / GA_CONSOL_PROC.length * 100);
  const toggleProc = (key) => setProcDone(m => ({ ...m, [key]: !m[key] }));

  return (
    <div style={{ padding: 14, display: 'grid', gap: 12 }}>
      {/* KPI */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
        <KvBox label="Jurnal eliminasi" v={p65.interco.length} />
        <KvBox label="Terverifikasi" v={verifiedCount + '/' + p65.interco.length} accent={verifiedCount === p65.interco.length ? 'var(--green)' : 'var(--amber)'} />
        <KvBox label="Selisih belum direkonsiliasi" v={rp(elm03.diff || 0) + ' jt'} accent={(elm03.diff || 0) > 0 ? 'var(--red)' : 'var(--green)'} />
        <KvBox label="Prosedur reviu selesai" v={procPct + '%'} accent={procPct === 100 ? 'var(--green)' : 'var(--amber)'} />
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 320px', gap: 12, alignItems: 'start' }}>
        <div className="grid" style={{ gap: 12 }}>
          {/* eliminasi investasi (PSAK 22) */}
          <Panel noBody>
            <div className="panel-h"><h3>Eliminasi Investasi vs Ekuitas Anak</h3><span className="sub mono">metode akuisisi · PSAK 22 ¶32</span><div style={{ flex: 1 }} /><span className="tiny muted">Rp juta</span></div>
            <table className="dtbl">
              <tbody>
                <tr><td style={{ fontSize: 12, fontWeight: 600 }}>Dr · Modal saham anak (100%)</td><td className="num mono" style={{ fontWeight: 700 }}>{fmt(p65.subs.reduce((a, s) => a + s.modal, 0))}</td><td style={{ width: 90 }}></td></tr>
                <tr><td style={{ fontSize: 12, fontWeight: 600 }}>Dr · Saldo laba pra-akuisisi anak</td><td className="num mono" style={{ fontWeight: 700 }}>{fmt(p65.subs.reduce((a, s) => a + s.rePre, 0))}</td><td></td></tr>
                <tr style={{ background: 'var(--blue-050)' }}><td style={{ fontSize: 12, fontWeight: 700 }}>Dr · Goodwill (selisih lebih)</td><td className="num mono" style={{ fontWeight: 700, color: 'var(--blue)' }}>{fmt(p65.goodwillTotal)}</td><td></td></tr>
                <tr><td style={{ fontSize: 12, paddingLeft: 18 }}>Cr · Investasi pada entitas anak</td><td></td><td className="num mono" style={{ fontWeight: 700 }}>{fmt(p65.costTotal)}</td></tr>
                <tr style={{ background: 'var(--amber-bg)' }}><td style={{ fontSize: 12, paddingLeft: 18, fontWeight: 700 }}>Cr · Kepentingan nonpengendali (akuisisi)</td><td></td><td className="num mono" style={{ fontWeight: 700, color: 'var(--amber)' }}>{fmt(p65.nciAcqTotal)}</td></tr>
              </tbody>
            </table>
            <div className="tiny muted" style={{ padding: '9px 14px 12px', lineHeight: 1.5 }}>Tim grup me-re-perform eliminasi: investasi induk (biaya perolehan Rp {fmt(p65.costTotal)} jt) dieliminasi terhadap ekuitas anak pada tanggal akuisisi; selisih lebih = <b>goodwill Rp {fmt(p65.goodwillTotal)} jt</b>; NCI diukur proporsional atas aset neto teridentifikasi (¶19).</div>
          </Panel>

          {/* register jurnal eliminasi + sign-off */}
          <Panel noBody>
            <div className="panel-h"><h3>Register Jurnal Eliminasi Antar-Perusahaan</h3><span className="sub mono">PSAK 65 ¶B86</span><div style={{ flex: 1 }} /><span className="tiny muted">tandai “Verifikasi” untuk sign-off</span></div>
            <table className="dtbl">
              <thead><tr><th style={{ width: 60 }}>ID</th><th>Deskripsi & jurnal (Dr/Cr)</th><th style={{ width: 92 }}>Tipe</th><th className="num" style={{ width: 64 }}>Nilai</th><th style={{ width: 104 }}>Status</th><th style={{ width: 108 }}></th></tr></thead>
              <tbody>
                {p65.interco.map(e => {
                  const st = stat(e);
                  return (
                    <tr key={e.id}>
                      <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{e.id}</td>
                      <td>
                        <div className="tiny" style={{ fontWeight: 600 }}>{e.desc}</div>
                        <div className="tiny muted">Dr {e.dr} · Cr {e.cr}{e.diff ? <span style={{ color: 'var(--red)' }}> · selisih Rp {fmt(e.diff)} jt belum direkonsiliasi</span> : ''}</div>
                      </td>
                      <td><Badge kind={ELIM_TYPE_KIND[e.type] || 'gray'}>{e.type}</Badge></td>
                      <td className="num mono">{fmt(e.amount)}</td>
                      <td><Badge kind={ELIM_STAT[st]}>{st}</Badge></td>
                      <td>
                        {st === 'Diverifikasi'
                          ? <Btn sm onClick={() => toggleVerify(e.id)}><I.checkCircle size={12} /> Sign-off</Btn>
                          : <Btn sm variant="primary" onClick={() => toggleVerify(e.id)}><I.check size={12} /> Verifikasi</Btn>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="tiny muted" style={{ padding: '9px 14px 12px', lineHeight: 1.5 }}>Eliminasi & penyesuaian ditarik dari <span className="mono">AMS_CANON.psak65.interco</span> — sumber yang sama dipakai modul PSAK 65. Status sign-off disimpan sebagai overlay kertas kerja audit grup.</div>
          </Panel>

          {/* rekonsiliasi saldo antar-perusahaan */}
          <Panel noBody>
            <div className="panel-h"><h3>Rekonsiliasi Saldo Antar-Perusahaan</h3><span className="sub mono">ELM-03 · piutang vs utang</span><div style={{ flex: 1 }} /><span className="tiny muted">Rp juta</span></div>
            <table className="dtbl">
              <tbody>
                <tr><td style={{ fontSize: 12 }}>Piutang usaha antar-pr. dibukukan <b>Induk</b></td><td className="num mono" style={{ fontWeight: 700 }}>{fmt(arRecorded)}</td></tr>
                <tr><td style={{ fontSize: 12 }}>Utang usaha antar-pr. dibukukan <b>komponen anak</b></td><td className="num mono" style={{ fontWeight: 700 }}>({fmt(apRecorded)})</td></tr>
                <tr style={{ background: (elm03.diff || 0) ? 'var(--red-bg)' : 'var(--green-bg)' }}><td style={{ fontSize: 12, fontWeight: 700 }}>Selisih belum direkonsiliasi</td><td className="num mono" style={{ fontWeight: 800, color: (elm03.diff || 0) ? 'var(--red)' : 'var(--green)' }}>{fmt(elm03.diff || 0)}</td></tr>
                <tr><td colSpan={2} className="tiny upper" style={{ background: 'var(--surface-2)', fontWeight: 700, letterSpacing: '.04em', color: 'var(--ink-3)' }}>Penyebab teridentifikasi</td></tr>
                {reconCauses.map((c, i) => (
                  <tr key={i}><td className="tiny" style={{ paddingLeft: 18 }}>{c.t}</td><td className="num mono tiny">{fmt(c.v)}</td></tr>
                ))}
              </tbody>
            </table>
            <div className="row ac gap8" style={{ padding: '9px 14px', borderTop: '1px solid var(--line-soft)', background: 'var(--amber-bg)' }}>
              <span style={{ color: 'var(--amber)' }}><I.alert size={15} /></span>
              <span className="tiny" style={{ flex: 1, lineHeight: 1.5 }}>Selisih <b>Rp {fmt(elm03.diff || 0)} jt</b> perlu konfirmasi saldo & rekonsiliasi sebelum finalisasi (SA 505 · PSAK 7).</span>
              <Btn sm onClick={() => nav('confirm', { from: 'groupaudit' })}><I.mail size={12} /> Konfirmasi</Btn>
              <Btn sm onClick={() => nav('related', { from: 'groupaudit' })}><I.link2 size={12} /> Pihak Berelasi</Btn>
            </div>
          </Panel>
        </div>

        {/* right rail */}
        <div className="grid" style={{ gap: 12 }}>
          {/* NCI roll-forward */}
          <Panel noBody>
            <div className="panel-h"><h3>Roll-Forward NCI</h3><span className="sub mono">¶B94</span></div>
            <div style={{ padding: 14, display: 'grid', gap: 8 }}>
              <div className="row jb ac"><span className="tiny">NCI pada tanggal akuisisi</span><span className="mono" style={{ fontWeight: 600 }}>{fmt(p65.nciAcqTotal)} jt</span></div>
              <div className="row jb ac"><span className="tiny">+ Bagian laba pasca-akuisisi</span><span className="mono" style={{ fontWeight: 600, color: 'var(--green)' }}>+{fmt(p65.nciPostTotal)} jt</span></div>
              <div className="row jb ac" style={{ borderTop: '1px solid var(--line-soft)', paddingTop: 8 }}><span className="tiny" style={{ fontWeight: 700 }}>NCI akhir (ekuitas)</span><span className="mono" style={{ fontWeight: 800, color: 'var(--amber)' }}>{fmt(p65.nciCloseTotal)} jt</span></div>
            </div>
            <div className="tiny muted" style={{ padding: '0 14px 12px', lineHeight: 1.5 }}>Bagian NCI atas laba tahun berjalan Rp {fmt(p65.nciProfit)} jt; disajikan terpisah dari ekuitas pemilik induk.</div>
          </Panel>

          {/* prosedur reviu konsolidasi */}
          <Panel noBody>
            <div className="panel-h"><h3>Prosedur Reviu Konsolidasi</h3><span className="sub mono">SA 600 · PSAK 65</span></div>
            <div style={{ padding: '6px 12px 4px' }}>
              <div className="row jb ac" style={{ marginBottom: 6 }}><span className="tiny muted">Penyelesaian</span><span className="mono tiny" style={{ fontWeight: 700, color: procPct === 100 ? 'var(--green)' : 'var(--amber)' }}>{procPct}%</span></div>
              <Progress value={procPct} color={procPct === 100 ? 'var(--green)' : 'var(--amber)'} />
            </div>
            <div style={{ padding: '8px 12px 12px', display: 'grid', gap: 2 }}>
              {GA_CONSOL_PROC.map((p, i) => {
                const key = p.ref + i, on = !!procDone[key];
                return (
                  <button key={key} onClick={() => toggleProc(key)} className="row gap8" style={{ alignItems: 'flex-start', padding: '7px 6px', borderRadius: 7, border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                    <span style={{ flex: '0 0 16px', marginTop: 1, color: on ? 'var(--green)' : 'var(--ink-4)' }}>{on ? <I.checkCircle size={15} /> : <I.circle size={15} />}</span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{p.ref}</span>
                      <span className="tiny" style={{ display: 'block', lineHeight: 1.4, color: on ? 'var(--ink-3)' : 'var(--ink)', textDecoration: on ? 'line-through' : 'none' }}>{p.t}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </Panel>

          {/* keterkaitan modul */}
          <Panel noBody>
            <div className="panel-h"><h3>Keterkaitan Kertas Kerja</h3><span className="sub mono">lineage</span></div>
            <div className="row ac gap6" style={{ padding: '9px 14px 4px' }}><I.arrowRight size={13} style={{ color: 'var(--blue)' }} /><span className="tiny upper" style={{ fontWeight: 700, letterSpacing: '.04em', color: 'var(--ink-3)' }}>Hulu — sumber data</span></div>
            <div style={{ display: 'grid', gap: 6, padding: '2px 12px 10px' }}>
              {GA_CONSOL_UP.map(m => { const IconC = I[m.ic] || I.doc; return (
                <button key={m.id} onClick={() => nav(m.id, { from: 'groupaudit' })} className="row ac gap9" style={{ padding: '8px 10px', borderRadius: 7, border: '1px solid var(--line)', borderLeft: '3px solid var(--blue)', background: 'var(--surface)', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                  <span style={{ color: 'var(--blue)', flex: '0 0 auto' }}><IconC size={15} /></span>
                  <div style={{ flex: 1, minWidth: 0 }}><div className="tiny" style={{ fontWeight: 600 }}>{m.lbl}</div><div className="tiny muted" style={{ lineHeight: 1.35 }}>{m.rel}</div></div>
                  <I.arrowRight size={13} style={{ color: 'var(--ink-4)', flex: '0 0 auto' }} />
                </button>
              ); })}
            </div>
            <div className="row ac gap6" style={{ padding: '4px 14px', borderTop: '1px solid var(--line-soft)' }}><I.arrowRight size={13} style={{ color: 'var(--green)' }} /><span className="tiny upper" style={{ fontWeight: 700, letterSpacing: '.04em', color: 'var(--ink-3)' }}>Hilir — pengguna angka</span></div>
            <div style={{ display: 'grid', gap: 6, padding: '2px 12px 12px' }}>
              {GA_CONSOL_DOWN.map(m => { const IconC = I[m.ic] || I.doc; return (
                <button key={m.id} onClick={() => nav(m.id, { from: 'groupaudit' })} className="row ac gap9" style={{ padding: '8px 10px', borderRadius: 7, border: '1px solid var(--line)', borderLeft: '3px solid var(--green)', background: 'var(--surface)', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                  <span style={{ color: 'var(--green)', flex: '0 0 auto' }}><IconC size={15} /></span>
                  <div style={{ flex: 1, minWidth: 0 }}><div className="tiny" style={{ fontWeight: 600 }}>{m.lbl}</div><div className="tiny muted" style={{ lineHeight: 1.35 }}>{m.rel}</div></div>
                  <I.arrowRight size={13} style={{ color: 'var(--ink-4)', flex: '0 0 auto' }} />
                </button>
              ); })}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

/* ===== TAB 5 — TEMUAN TERAGREGASI & KESIMPULAN ================ */

Object.assign(window, { GAPackages, GAConsol, GAElimReview });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { GAConsol, GAElimReview, GAPackages };
