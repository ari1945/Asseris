/* [codemod] ESM imports */
import React from 'react';
import { useFirm, useNav } from './contexts.jsx';
import { I } from './icons.jsx';
import { SubBar } from './shell.jsx';
import { Badge, Btn, Panel } from './ui.jsx';
import { BoBadge, BoStat, BoTabPanel, boJt, boM } from './view_bo1.jsx';
import { KV, SectionTitle } from './view_fpm_parts.jsx';

/* ============================================================
   NeoSuite AMS — Asuransi (PII) & Manajemen Risiko (DEEP)
   Mesin kanonik: window.IRM (SSOT) — Polis, Klaim, Risk Register,
   Peta Risiko (inheren→residual) & Sumber Kebenaran (rekonsiliasi
   lintas-modul). Reuse: boJt/boM/BoBadge/BoTabPanel/BoStat (view_bo1);
   KV/SectionTitle (fpm_parts); Panel/Btn/Badge/Avatar (ui); SubBar.
   ============================================================ */
const { useState: useStateIns } = React;

const INS_RISK_LVL = ['', 'Sangat Rendah', 'Rendah', 'Sedang', 'Tinggi', 'Sangat Tinggi'];

/* chip navigasi lintas-modul (gaya lin-chip) */
function InsChip({ icon, lbl, rel, color = 'var(--blue)', onClick }) {
  const Ic = (window.I && (window.I[icon] || window.I.doc));
  return (
    <button type="button" className="lin-chip" style={{ borderLeftColor: color }} onClick={onClick} title={rel ? rel + ' — buka ' + lbl : 'Buka ' + lbl}>
      <span className="lin-ic" style={{ color }}>{Ic ? <Ic size={14} /> : null}</span>
      <span className="lin-txt"><span className="lin-lbl">{lbl}</span>{rel && <span className="lin-rel">{rel}</span>}</span>
      <span className="lin-go"><I.arrowRight size={12} /></span>
    </button>
  );
}

/* kotak skor L×I berwarna */
function ScoreBox({ v, color, size = 26 }) {
  return <span style={{ display: 'inline-grid', placeItems: 'center', minWidth: size, height: size, padding: '0 5px', borderRadius: 6, fontFamily: 'var(--mono)', fontWeight: 800, fontSize: 12, color: '#fff', background: color }}>{v}</span>;
}

function FirmInsurance() {
  const firm = useFirm();
  const nav = useNav();
  const IRM = window.IRM;
  const [tab, setTab] = useStateIns(() => { try { return localStorage.getItem('ams.ins.tab') || 'ikhtisar'; } catch (e) { return 'ikhtisar'; } });
  React.useEffect(() => { try { localStorage.setItem('ams.ins.tab', tab); } catch (e) {} }, [tab]);

  const pols = IRM.policies();
  const claims = IRM.claims();
  const reg = IRM.register();
  const hl = IRM.headline();

  const tabs = [
    { id: 'ikhtisar', label: 'Ikhtisar' },
    { id: 'policies', label: 'Polis', count: pols.length },
    { id: 'claims', label: 'Klaim', count: claims.length },
    { id: 'register', label: 'Risk Register', count: reg.length },
    { id: 'heatmap', label: 'Peta Risiko' },
    { id: 'lineage', label: 'Sumber Kebenaran' },
  ];

  return (
    <>
      <SubBar moduleId="insurance" right={
        <div className="row gap8 ac">
          <span className="chip tiny"><I.link2 size={11} /> SSOT · premi → Cockpit & Legal · ISQM 1</span>
          <Btn sm><I.download size={13} /> Risk Register</Btn>
          <Btn sm variant="primary"><I.plus size={13} /> Lapor Klaim</Btn>
        </div>
      } />
      <div className="view-scroll"><div className="view-pad">
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
          <BoStat value={boM(hl.piiLimit, 0)} label="Limit PII" accent="var(--blue)" />
          <BoStat value={boJt(hl.totPremi)} label="Premi Tahunan (4 polis)" />
          <BoStat value={hl.openClaims} label="Klaim Terbuka" accent={hl.openClaims ? 'var(--amber)' : 'var(--green)'} />
          <BoStat value={hl.highRisk} label="Risiko Tinggi — residual (≥12)" accent={hl.highRisk ? 'var(--red)' : 'var(--green)'} />
        </div>

        <BoTabPanel tabs={tabs} tab={tab} setTab={setTab}>
          {tab === 'ikhtisar' && <InsOverview pols={pols} claims={claims} reg={reg} hl={hl} nav={nav} setTab={setTab} />}
          {tab === 'policies' && <InsPolicies pols={pols} nav={nav} setTab={setTab} />}
          {tab === 'claims' && <InsClaims claims={claims} nav={nav} setTab={setTab} />}
          {tab === 'register' && <InsRegister reg={reg} nav={nav} setTab={setTab} />}
          {tab === 'heatmap' && <InsHeatmap IRM={IRM} reg={reg} />}
          {tab === 'lineage' && <InsLineage IRM={IRM} firm={firm} nav={nav} />}
        </BoTabPanel>
      </div></div>
    </>
  );
}

/* ===================== IKHTISAR ===================== */
function InsOverview({ pols, claims, reg, hl, nav, setTab }) {
  const maxLimit = Math.max(...pols.map(p => p.limit), 1);
  const alerts = [];
  pols.filter(p => p.renew).forEach(p => alerts.push({ tone: p.expired || p.days < 30 ? 'red' : 'amber', ic: 'umbrella', t: 'Polis perlu perpanjangan — ' + p.jenis, s: p.insurer + ' · berakhir ' + p.akhir + ' · ' + (p.days < 0 ? 'lewat ' + (-p.days) + 'h' : p.days + ' hari'), go: () => setTab('policies') }));
  claims.filter(c => c.outstanding).forEach(c => alerts.push({ tone: 'amber', ic: 'alert', t: 'Klaim terbuka — ' + c.id, s: c.perihal, go: () => setTab('claims') }));
  reg.filter(r => r.residual >= 12).forEach(r => alerts.push({ tone: 'red', ic: 'shield', t: 'Risiko tinggi — ' + r.id + ' (' + r.risk + ')', s: 'Residual ' + r.residual + ' · ' + r.treatment + ' · ' + r.owner, go: () => setTab('register') }));

  return (
    <div className="view-pad" style={{ paddingTop: 14 }}>
      <div className="panel" style={{ padding: '11px 13px', marginBottom: 12, background: 'var(--blue-050)', borderColor: 'var(--blue-100)' }}>
        <div className="row ac gap8" style={{ marginBottom: 5 }}><I.link2 size={15} style={{ color: 'var(--blue)' }} /><b style={{ fontSize: 12.5 }}>Satu register polis & risiko, satu sumber kebenaran</b></div>
        <div className="tiny muted" style={{ lineHeight: 1.55 }}>Premi <b>mengalir</b> ke <b>Cockpit Operasi</b> (overhead) & <b>Legal</b> (nilai kontrak) tanpa diketik ulang. Property All-Risk menarik nilai dari <b>Register Aset</b> (PSAK 16); klaim PII tertaut ke <b>Litigasi</b>; tiap risiko firma menunjuk <b>polis</b> & <b>modul mitigasi</b>-nya. Tab <b>Sumber Kebenaran</b> membuktikan tiap angka menutup.</div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1.15fr 1fr', gap: 14, alignItems: 'start' }}>
        <Panel title="Struktur Pertanggungan" sub="limit & pemakaian · sumber: polis" actions={<button className="btn sm" style={{ height: 22 }} onClick={() => setTab('policies')}><I.arrowRight size={11} /></button>}>
          <div style={{ display: 'grid', gap: 11 }}>
            {pols.map(p => {
              const pct = Math.max(3, p.limit / maxLimit * 100);
              const usePct = Math.min(100, p.utilisation * 100);
              return (
                <div key={p.id}>
                  <div className="row jb ac" style={{ marginBottom: 4 }}>
                    <span className="row ac gap6" style={{ fontSize: 12, fontWeight: 600 }}><span className="mono tiny" style={{ color: 'var(--blue)' }}>{window.IRM.polShort(p.id)}</span>{p.jenis}</span>
                    <span className="mono tiny" style={{ fontWeight: 700 }}>{boM(p.limit, 0)}</span>
                  </div>
                  <div style={{ height: 14, borderRadius: 4, background: 'var(--surface-3)', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ width: pct + '%', height: '100%', borderRadius: 4, background: 'var(--blue-100)' }} />
                    {usePct > 0 && <div style={{ position: 'absolute', top: 0, left: 0, width: (pct * usePct / 100) + '%', height: '100%', borderRadius: 4, background: 'var(--amber)' }} title="Pemakaian klaim" />}
                  </div>
                  <div className="row jb tiny muted" style={{ marginTop: 3 }}>
                    <span>Premi {boJt(p.premi)} · deductible {boJt(p.deductible)}</span>
                    <span>{p.transferred.length ? 'transfer ' + p.transferred.map(r => r.id).join(', ') : p.isProperty ? 'aset kantor' : '—'}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="divider" />
          <div className="row jb tiny"><span className="muted">Total limit gabungan</span><span className="mono" style={{ fontWeight: 700 }}>{boM(hl.totLimit, 0)}</span></div>
          <div className="row jb tiny" style={{ marginTop: 3 }}><span className="muted">Rata-rata penurunan risiko (inheren→residual)</span><span className="mono" style={{ fontWeight: 700, color: 'var(--green)' }}>{Math.round(hl.avgReduction * 100)}%</span></div>
        </Panel>

        <div className="grid" style={{ gap: 12 }}>
          <Panel title="Risiko Teratas" sub="residual · sumber: risk register firma" actions={<button className="btn sm" style={{ height: 22 }} onClick={() => setTab('register')}><I.arrowRight size={11} /></button>}>
            <div style={{ display: 'grid', gap: 8 }}>
              {reg.slice(0, 4).map(r => (
                <div key={r.id} className="row ac gap8" style={{ padding: '6px 0', borderBottom: '1px solid var(--line-soft)' }}>
                  <ScoreBox v={r.residual} color={r.resColor} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="tiny truncate" style={{ fontWeight: 600 }}>{r.id} · {r.risk}</div>
                    <div className="tiny muted">{r.treatment}{r.policy ? ' · ' + window.IRM.polShort(r.policy.id) : ''} · {r.kat}</div>
                  </div>
                  <span className="mono tiny" style={{ fontWeight: 700, color: r.trend === 'naik' ? 'var(--red)' : r.trend === 'turun' ? 'var(--green)' : 'var(--ink-4)' }}>{r.trend === 'naik' ? '▲' : r.trend === 'turun' ? '▼' : '▬'}</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title={'Tindakan Terbuka' + (alerts.length ? ' · ' + alerts.length : '')} noBody>
            <div style={{ padding: 12, display: 'grid', gap: 7 }}>
              {alerts.slice(0, 5).map((a, i) => (
                <button key={i} type="button" onClick={a.go} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--line)', borderLeft: '3px solid var(--' + a.tone + ')', background: 'var(--surface-1)', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                  <span style={{ color: 'var(--' + a.tone + ')', flex: '0 0 auto' }}>{React.createElement(window.I[a.ic] || window.I.alert, { size: 15 })}</span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="tiny truncate" style={{ fontWeight: 600, maxWidth: 260 }}>{a.t}</div>
                    <div className="tiny muted truncate" style={{ maxWidth: 260 }}>{a.s}</div>
                  </div>
                  <I.arrowRight size={12} style={{ color: 'var(--ink-4)', flex: '0 0 auto' }} />
                </button>
              ))}
              {!alerts.length && <div className="tiny muted">Tidak ada tindakan terbuka.</div>}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

/* ===================== POLIS (master-detail) ===================== */
function InsPolicies({ pols, nav, setTab }) {
  const [sel, setSel] = useStateIns(pols[0].id);
  const p = pols.find(x => x.id === sel) || pols[0];
  return (
    <div className="view-pad" style={{ paddingTop: 14 }}>
      <div className="grid" style={{ gridTemplateColumns: '1.25fr 1fr', gap: 14, alignItems: 'start' }}>
        <table className="dtbl" style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid var(--line)' }}>
          <thead><tr><th>Polis</th><th className="num">Limit</th><th className="num">Premi/thn</th><th>Berakhir</th><th>Status</th></tr></thead>
          <tbody>
            {pols.map(x => (
              <tr key={x.id} className={x.id === sel ? 'sel' : ''} onClick={() => setSel(x.id)} style={{ cursor: 'pointer' }}>
                <td><div style={{ fontWeight: 600, fontSize: 11.5 }}>{x.jenis}</div><div className="tiny muted mono">{x.id} · {x.insurer}</div></td>
                <td className="num">{boM(x.limit, 0)}</td>
                <td className="num">{boJt(x.premi)}</td>
                <td className="tiny mono" style={{ color: x.days < 30 ? 'var(--red)' : x.days < 60 ? 'var(--amber)' : 'var(--ink-2)' }}>{x.akhir}<span className="muted"> · {x.days}h</span></td>
                <td><BoBadge s={x.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>

        <Panel noBody>
          <div style={{ background: 'var(--surface-2)', padding: '11px 14px', borderBottom: '1px solid var(--line)' }} className="row ac gap8">
            <span style={{ width: 30, height: 30, borderRadius: 8, display: 'grid', placeItems: 'center', background: 'var(--blue-050)', color: 'var(--blue)' }}><I.umbrella size={16} /></span>
            <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 700, fontSize: 13 }}>{p.jenis}</div><div className="tiny muted mono">{p.id} · {p.policyNo}</div></div>
            <BoBadge s={p.status} />
          </div>
          <div style={{ padding: 14 }}>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
              <KV label="Penanggung" v={p.insurer} />
              <KV label="Broker" v={p.broker} />
              <KV label="Limit pertanggungan" v={boM(p.limit, 0)} accent="var(--blue)" />
              <KV label="Premi / tahun" v={boJt(p.premi)} />
              <KV label="Deductible" v={boJt(p.deductible)} />
              <KV label="Basis" v={p.basis} />
              <KV label="Tgl retroaktif" v={p.retro || '—'} />
              <KV label="Run-off" v={p.runoff} />
            </div>

            <div className="tiny muted upper" style={{ marginBottom: 4, letterSpacing: '.04em' }}>Ruang lingkup</div>
            <p className="tiny" style={{ margin: '0 0 8px', lineHeight: 1.5 }}>{p.covers}</p>
            <div className="tiny muted upper" style={{ marginBottom: 4, letterSpacing: '.04em' }}>Eksklusi utama</div>
            <p className="tiny muted" style={{ margin: '0 0 12px', lineHeight: 1.5 }}>{p.excl}</p>

            {p.transferred.length > 0 && <>
              <div className="tiny muted upper" style={{ marginBottom: 6, letterSpacing: '.04em' }}>Menanggung risiko firma</div>
              <div style={{ display: 'grid', gap: 6, marginBottom: 12 }}>
                {p.transferred.map(r => <InsChip key={r.id} icon="shield" color="var(--green)" lbl={r.id + ' · ' + r.risk} rel={'residual ' + (r.l * r.i) + ' · ' + r.owner} onClick={() => setTab('register')} />)}
              </div>
            </>}

            {p.isProperty && p.coverRatio != null && <div className="panel" style={{ padding: '9px 11px', marginBottom: 12, background: 'var(--surface-2)' }}>
              <div className="row jb tiny" style={{ marginBottom: 4 }}><span className="muted">Rasio cover vs perolehan aset</span><span className="mono" style={{ fontWeight: 700, color: p.coverRatio >= 1 ? 'var(--green)' : 'var(--amber)' }}>{Math.round(p.coverRatio * 100)}%</span></div>
              <div style={{ height: 8, borderRadius: 4, background: 'var(--surface-3)' }}><div style={{ width: Math.min(100, p.coverRatio * 100) + '%', height: '100%', borderRadius: 4, background: p.coverRatio >= 1 ? 'var(--green)' : 'var(--amber)' }} /></div>
            </div>}

            {p.claims.length > 0 && <>
              <div className="tiny muted upper" style={{ marginBottom: 6, letterSpacing: '.04em' }}>Klaim terhadap polis</div>
              <div style={{ display: 'grid', gap: 5, marginBottom: 12 }}>
                {p.claims.map(c => (
                  <button key={c.id} type="button" onClick={() => setTab('claims')} className="row jb ac" style={{ padding: '6px 9px', borderRadius: 7, border: '1px solid var(--line)', background: 'var(--surface-1)', cursor: 'pointer', width: '100%', textAlign: 'left' }}>
                    <span className="tiny"><span className="mono" style={{ fontWeight: 700, color: 'var(--blue)' }}>{c.id}</span> · {c.status}</span>
                    <span className="mono tiny" style={{ fontWeight: 700 }}>{boJt(c.nilai)}</span>
                  </button>
                ))}
              </div>
            </>}

            <div className="row gap8">
              <Btn sm onClick={() => nav('legal', { from: 'insurance' })}><I.gavel size={13} /> Kontrak OPS-{p.id}</Btn>
              <Btn sm onClick={() => nav('firmops', { from: 'insurance' })}><I.layers size={13} /> Beban di Cockpit</Btn>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ===================== KLAIM ===================== */
function InsClaims({ claims, nav, setTab }) {
  const [sel, setSel] = useStateIns(claims[0].id);
  const c = claims.find(x => x.id === sel) || claims[0];
  return (
    <div className="view-pad" style={{ paddingTop: 14 }}>
      <div className="grid" style={{ gridTemplateColumns: '1.3fr 1fr', gap: 14, alignItems: 'start' }}>
        <table className="dtbl" style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid var(--line)' }}>
          <thead><tr><th>ID</th><th>Polis</th><th>Perihal</th><th className="num">Nilai</th><th>Status</th></tr></thead>
          <tbody>
            {claims.map(x => (
              <tr key={x.id} className={x.id === sel ? 'sel' : ''} onClick={() => setSel(x.id)} style={{ cursor: 'pointer' }}>
                <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{x.id}</td>
                <td className="tiny" style={{ fontWeight: 600 }}>{x.polis}</td>
                <td className="tiny muted" style={{ maxWidth: 200, whiteSpace: 'normal', lineHeight: 1.3 }}>{x.perihal}</td>
                <td className="num">{boJt(x.nilai)}</td>
                <td><BoBadge s={x.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>

        <Panel noBody>
          <div style={{ background: 'var(--surface-2)', padding: '11px 14px', borderBottom: '1px solid var(--line)' }} className="row ac gap8">
            <span className="mono" style={{ fontWeight: 700, color: 'var(--blue)' }}>{c.id}</span>
            <div style={{ flex: 1 }} />
            <BoBadge s={c.status} />
          </div>
          <div style={{ padding: 14 }}>
            <p className="tiny" style={{ margin: '0 0 12px', lineHeight: 1.5, fontWeight: 600 }}>{c.perihal}</p>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
              <KV label="Polis" v={c.policy ? c.policy.jenis : c.polis} />
              <KV label="Tgl insiden" v={c.insiden} />
              <KV label="Tgl notifikasi" v={c.diajukan} />
              <KV label="Deductible" v={boJt(c.deductible)} />
              <KV label="Nilai klaim" v={boJt(c.nilai)} accent="var(--ink-1)" />
              <KV label="Net (− deductible)" v={boJt(c.net)} accent="var(--amber)" />
              <KV label="Cadangan (reserve)" v={c.reserve ? boJt(c.reserve) : '—'} />
              <KV label="Telah dipulihkan" v={c.recovered ? boJt(c.recovered) : '—'} accent={c.recovered ? 'var(--green)' : undefined} />
            </div>

            {c.litigation && <div className="panel" style={{ padding: '10px 12px', marginBottom: 12, background: 'var(--amber-bg)', borderColor: 'transparent' }}>
              <div className="row ac gap8" style={{ marginBottom: 4 }}><I.gavel size={14} style={{ color: 'var(--amber)' }} /><b className="tiny">Tertaut ke litigasi · {c.litigation.id}</b></div>
              <div className="tiny muted" style={{ lineHeight: 1.5 }}>{c.litigation.lawan} — {c.litigation.perkara}. Eksposur perkara <b>{boJt(c.litigation.exposure)}</b> = nilai klaim PII (satu peristiwa, dua modul).</div>
            </div>}

            <div className="row gap8">
              {c.litigation && <Btn sm variant="primary" onClick={() => nav('legal', { from: 'insurance' })}><I.gavel size={13} /> Buka Perkara {c.litigation.id}</Btn>}
              <Btn sm onClick={() => nav('legal', { from: 'insurance' })}><I.doc size={13} /> Berkas Klaim</Btn>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ===================== RISK REGISTER (master-detail) ===================== */
function InsRegister({ reg, nav, setTab }) {
  const [sel, setSel] = useStateIns(reg[0].id);
  const r = reg.find(x => x.id === sel) || reg[0];
  return (
    <div className="view-pad" style={{ paddingTop: 14 }}>
      <div className="grid" style={{ gridTemplateColumns: '1.3fr 1fr', gap: 14, alignItems: 'start' }}>
        <table className="dtbl" style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid var(--line)' }}>
          <thead><tr><th>ID</th><th>Risiko / Kategori</th><th className="num">Inheren</th><th className="num">Residual</th><th>Perlakuan</th></tr></thead>
          <tbody>
            {reg.map(x => (
              <tr key={x.id} className={x.id === sel ? 'sel' : ''} onClick={() => setSel(x.id)} style={{ cursor: 'pointer' }}>
                <td className="mono tiny" style={{ fontWeight: 700 }}>{x.id}</td>
                <td><div style={{ fontWeight: 600, fontSize: 11.5, maxWidth: 200, whiteSpace: 'normal', lineHeight: 1.3 }}>{x.risk}</div><div className="tiny muted">{x.kat}</div></td>
                <td className="num"><ScoreBox v={x.inherent} color={x.inhColor} size={22} /></td>
                <td className="num"><ScoreBox v={x.residual} color={x.resColor} size={22} /></td>
                <td className="tiny" style={{ fontWeight: 600 }}>{x.treatment}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <Panel noBody>
          <div style={{ background: 'var(--surface-2)', padding: '11px 14px', borderBottom: '1px solid var(--line)' }} className="row ac gap8">
            <span className="mono" style={{ fontWeight: 700 }}>{r.id}</span>
            <Badge>{r.kat}</Badge>
            <div style={{ flex: 1 }} />
            <span className="tiny mono" style={{ fontWeight: 700, color: r.trend === 'naik' ? 'var(--red)' : r.trend === 'turun' ? 'var(--green)' : 'var(--ink-4)' }}>{r.trend === 'naik' ? '▲ naik' : r.trend === 'turun' ? '▼ turun' : '▬ stabil'}</span>
          </div>
          <div style={{ padding: 14 }}>
            <p style={{ margin: '0 0 12px', fontSize: 12.5, fontWeight: 600, lineHeight: 1.4 }}>{r.risk}</p>

            <div className="row ac gap8" style={{ marginBottom: 12 }}>
              <div style={{ textAlign: 'center' }}><div className="tiny muted" style={{ marginBottom: 3 }}>Inheren</div><ScoreBox v={r.inherent} color={r.inhColor} size={30} /></div>
              <div style={{ flex: 1, position: 'relative', height: 30, display: 'grid', placeItems: 'center' }}>
                <div style={{ width: '100%', height: 3, background: 'var(--line)' }} />
                <span className="tiny mono" style={{ position: 'absolute', top: -2, background: 'var(--surface-1)', padding: '0 6px', fontWeight: 700, color: 'var(--green)' }}>−{Math.round(r.reduction * 100)}% kontrol</span>
                <I.arrowRight size={13} style={{ position: 'absolute', right: 0, color: 'var(--ink-4)' }} />
              </div>
              <div style={{ textAlign: 'center' }}><div className="tiny muted" style={{ marginBottom: 3 }}>Residual</div><ScoreBox v={r.residual} color={r.resColor} size={30} /></div>
            </div>

            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
              <KV label="Pemilik risiko" v={r.owner} />
              <KV label="Selera risiko" v={r.appetite} />
              <KV label="Perlakuan" v={r.treatment} />
              <KV label="Reviu terakhir" v={r.lastReview} />
            </div>

            <div className="panel" style={{ padding: '8px 11px', marginBottom: 12, background: r.kri.tone === 'red' ? 'var(--red-bg)' : r.kri.tone === 'amber' ? 'var(--amber-bg)' : 'var(--surface-2)', borderColor: 'transparent' }}>
              <div className="row jb ac"><span className="tiny muted">KRI · {r.kri.label}</span><span className="mono tiny" style={{ fontWeight: 700, color: r.kri.tone === 'red' ? 'var(--red)' : r.kri.tone === 'amber' ? 'var(--amber)' : 'var(--green)' }}>{r.kri.val}</span></div>
            </div>

            <div className="tiny muted upper" style={{ marginBottom: 6, letterSpacing: '.04em' }}>Kontrol mitigasi</div>
            <div style={{ display: 'grid', gap: 4, marginBottom: 12 }}>
              {r.controls.map((k, i) => <div key={i} className="row ac gap6 tiny"><I.checkCircle size={13} style={{ color: 'var(--green)', flex: '0 0 auto' }} /><span>{k}</span></div>)}
            </div>

            <div className="tiny muted upper" style={{ marginBottom: 6, letterSpacing: '.04em' }}>Tertaut ke (SSOT)</div>
            <div style={{ display: 'grid', gap: 6 }}>
              {r.policy && <InsChip icon="umbrella" color="var(--blue)" lbl={'Transfer · ' + r.policy.jenis} rel={'limit ' + boM(r.policy.limit, 0) + ' · premi ' + boJt(r.policy.premi)} onClick={() => setTab('policies')} />}
              <InsChip icon={r.mod.icon} color="var(--green)" lbl={'Mitigasi · ' + r.mod.label} rel="modul pelaksana kontrol" onClick={() => nav(r.module, { from: 'insurance' })} />
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ===================== PETA RISIKO (inheren ↔ residual) ===================== */
function InsHeatmap({ IRM, reg }) {
  const [mode, setMode] = useStateIns('residual');
  const hm = IRM.heatmap(mode);
  return (
    <div className="view-pad" style={{ paddingTop: 14 }}>
      <SectionTitle right={
        <div className="row gap6">
          {[['residual', 'Residual'], ['inherent', 'Inheren']].map(([id, lbl]) => (
            <button key={id} className={'btn sm' + (mode === id ? ' primary' : '')} style={{ height: 24 }} onClick={() => setMode(id)}>{lbl}</button>
          ))}
        </div>
      }>Matriks Kemungkinan (L) × Dampak (I) — {mode === 'inherent' ? 'sebelum kontrol' : 'setelah kontrol'}</SectionTitle>

      <div className="row gap14" style={{ alignItems: 'flex-start' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto repeat(5, 54px)', gap: 3 }}>
          <div />
          {[1, 2, 3, 4, 5].map(i => <div key={i} className="tiny muted" style={{ textAlign: 'center', fontWeight: 700 }}>I{i}</div>)}
          {[5, 4, 3, 2, 1].map(l => (
            <React.Fragment key={l}>
              <div className="tiny muted" style={{ fontWeight: 700, alignSelf: 'center', paddingRight: 4 }}>L{l}</div>
              {[1, 2, 3, 4, 5].map(i => {
                const sc = l * i;
                const here = hm.cell(l, i);
                return (
                  <div key={i} style={{ height: 54, borderRadius: 5, background: IRM.scoreColor(sc), opacity: here.length ? 1 : 0.16, display: 'grid', placeItems: 'center', color: '#fff', position: 'relative' }} title={here.map(h => h.id + ' ' + h.risk).join('\n')}>
                    {here.length > 0 && <span className="mono tiny" style={{ fontWeight: 800 }}>{here.map(h => h.id.replace('FR-', '')).join(',')}</span>}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>

        <div style={{ flex: 1, minWidth: 240 }}>
          <div className="tiny muted upper" style={{ marginBottom: 6, letterSpacing: '.05em', fontWeight: 700 }}>Legenda</div>
          {[['var(--red)', 'Tinggi (≥15) — eskalasi Rekan'], ['var(--amber)', 'Sedang (8–14) — pantau triwulanan'], ['#9a6a00', 'Rendah (4–7) — kontrol rutin'], ['var(--green)', 'Sangat rendah (<4) — terima']].map(([c, t]) => (
            <div key={t} className="row ac gap8" style={{ marginBottom: 6 }}><span style={{ width: 14, height: 14, borderRadius: 3, background: c, flex: '0 0 14px' }} /><span className="tiny">{t}</span></div>
          ))}
          <div className="panel" style={{ padding: '10px 12px', marginTop: 10 }}>
            <div className="tiny" style={{ fontWeight: 600, lineHeight: 1.55, marginBottom: 8 }}><I.shield size={13} style={{ verticalAlign: -2, color: 'var(--blue)' }} /> Pergerakan inheren → residual</div>
            <div style={{ display: 'grid', gap: 5 }}>
              {reg.map(r => (
                <div key={r.id} className="row ac gap6 tiny">
                  <span className="mono" style={{ fontWeight: 700, width: 38 }}>{r.id}</span>
                  <ScoreBox v={r.inherent} color={r.inhColor} size={19} />
                  <I.arrowRight size={11} style={{ color: 'var(--ink-4)' }} />
                  <ScoreBox v={r.residual} color={r.resColor} size={19} />
                  <span className="muted truncate" style={{ flex: 1, maxWidth: 150 }}>{r.risk}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===================== SUMBER KEBENARAN ===================== */
function InsLineage({ IRM, firm, nav }) {
  const recons = IRM.reconciliations(firm);
  const chain = IRM.premiumChain(firm);
  const flows = [
    { id: 'firmops', ic: 'layers', lbl: 'Cockpit Operasi', rel: 'Premi → pos overhead biaya operasi' },
    { id: 'legal', ic: 'gavel', lbl: 'Kontrak & Legal', rel: 'Polis → kontrak OPS-POL-* (nilai = premi)' },
    { id: 'facilities', ic: 'building', lbl: 'Aset & Fasilitas', rel: 'Nilai aset → dasar cover Property All-Risk' },
    { id: 'governance', ic: 'building', lbl: 'Governance (SOQM)', rel: 'Register risiko → penilaian risiko ISQM 1' },
    { id: 'firmtax', ic: 'report', lbl: 'Pajak Firma', rel: 'Premi (overhead) → rekonsiliasi fiskal' },
    { id: 'eqr', ic: 'checkCircle', lbl: 'EQR Workflow', rel: 'FR-01 → EQR wajib (mitigasi mutu)' },
  ];
  const fmtRecon = (r, v) => r.isCount ? v : (r.isRatio ? boM(v, 1) : boJt(v));
  return (
    <div className="view-pad" style={{ paddingTop: 14 }}>
      <SectionTitle>Rekonsiliasi SSOT → Kontrol Lintas-Modul</SectionTitle>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', gap: 10, marginBottom: 18 }}>
        {recons.map(r => (
          <div key={r.id} className="panel" style={{ padding: '12px 13px', borderTop: '3px solid ' + (r.ok ? 'var(--green)' : 'var(--amber)') }}>
            <div className="row ac gap8" style={{ marginBottom: 8 }}>
              {r.ok ? <span className="badge b-green" style={{ textTransform: 'none' }}>✓ Menutup</span> : <span className="badge b-amber" style={{ textTransform: 'none' }}>≠ Perlu reviu</span>}
              <div style={{ flex: 1 }} />
              <button className="btn sm icon" style={{ height: 22, width: 22 }} onClick={() => nav(r.to, { from: 'insurance' })} title="Buka modul"><I.arrowRight size={12} /></button>
            </div>
            <div style={{ fontWeight: 600, fontSize: 12, lineHeight: 1.3, marginBottom: 8, minHeight: 31 }}>{r.title}</div>
            <div className="row jb tiny" style={{ padding: '4px 0', borderBottom: '1px solid var(--line-soft)' }}><span className="muted truncate" style={{ maxWidth: 135 }}>{r.a}</span><span className="mono" style={{ fontWeight: 700 }}>{fmtRecon(r, r.av)}</span></div>
            <div className="row jb tiny" style={{ padding: '4px 0' }}><span className="muted truncate" style={{ maxWidth: 135 }}>{r.b}</span><span className="mono" style={{ fontWeight: 700 }}>{fmtRecon(r, r.bv)}</span></div>
            <div className="tiny muted" style={{ marginTop: 8, lineHeight: 1.45 }}>{r.note}</div>
          </div>
        ))}
      </div>

      <SectionTitle>Rantai Premi — Satu Angka, Tiga Modul</SectionTitle>
      <div className="panel" style={{ padding: '14px 16px', marginBottom: 8 }}>
        <div className="row ac" style={{ gap: 0, flexWrap: 'wrap' }}>
          {[
            { lbl: 'Asuransi (SSOT)', sub: 'Σ premi polis', v: chain.totPremi, c: 'var(--blue)' },
            { lbl: 'Cockpit Operasi', sub: 'beban premi overhead', v: chain.opsPremi, c: 'var(--green)' },
            { lbl: 'Kontrak & Legal', sub: 'Σ nilai OPS-POL-*', v: chain.legalPremi, c: 'var(--green)' },
          ].map((n, i) => (
            <React.Fragment key={n.lbl}>
              {i > 0 && <div style={{ display: 'grid', placeItems: 'center', padding: '0 14px' }}><I.arrowRight size={16} style={{ color: 'var(--ink-4)' }} /></div>}
              <div style={{ flex: '1 1 180px', padding: '10px 12px', borderRadius: 9, border: '1px solid var(--line)', borderLeft: '3px solid ' + n.c, background: 'var(--surface-1)' }}>
                <div className="tiny muted upper" style={{ letterSpacing: '.04em', marginBottom: 2 }}>{n.lbl}</div>
                <div className="mono" style={{ fontWeight: 800, fontSize: 16 }}>{n.v != null ? boJt(n.v) : '—'}</div>
                <div className="tiny muted">{n.sub}</div>
              </div>
            </React.Fragment>
          ))}
        </div>
        <div className="tiny muted" style={{ marginTop: 10, lineHeight: 1.55 }}><I.link2 size={12} style={{ verticalAlign: -2, color: 'var(--blue)' }} /> Premi tahunan dicatat <b>sekali</b> di register polis. Cockpit Operasi & registri Legal <b>menarik</b> angka yang sama — bukan menyalin. Ubah premi sebuah polis, ketiga modul ikut bergerak konsisten.</div>
      </div>

      <SectionTitle>Data Asuransi & Risiko Mengalir Ke</SectionTitle>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 8 }}>
        {flows.map(f => <InsChip key={f.id} icon={f.ic} color="var(--green)" lbl={f.lbl} rel={f.rel} onClick={() => nav(f.id, { from: 'insurance' })} />)}
      </div>
    </div>
  );
}

Object.assign(window, { FirmInsurance });

/* ---------- LINEAGE dock: keterkaitan dua-arah Asuransi & Risiko ----------
   Didaftarkan dari berkas babel ini (setelah related_modules.jsx memuat
   window.LINEAGE), seperti pola view_facilities2.jsx. */
if (window.LINEAGE) {
  window.LINEAGE.insurance = {
    std: 'Backoffice · Asuransi (PII) & Manajemen Risiko (ISQM 1)',
    up: [
      { id: 'legal', ic: 'gavel', lbl: 'Kontrak & Legal', rel: 'Litigasi (LIT-03) → notifikasi & dasar klaim PII (CLM-02)' },
      { id: 'facilities', ic: 'building', lbl: 'Aset & Fasilitas', rel: 'Nilai perolehan aset (PSAK 16) → dasar pertanggungan Property All-Risk' },
      { id: 'integrations', ic: 'link2', lbl: 'Integrations', rel: 'Insiden siber & kontrol TI → risiko FR-03 (Cyber)' },
      { id: 'governance', ic: 'building', lbl: 'Governance (SOQM)', rel: 'ISQM 1 — kebijakan mutu menetapkan selera & ambang risiko' },
    ],
    down: [
      { id: 'firmops', ic: 'layers', lbl: 'Cockpit Operasi', rel: 'Premi tahunan → pos overhead Komposisi Biaya Operasi' },
      { id: 'legal', ic: 'gavel', lbl: 'Kontrak & Legal', rel: 'Tiap polis → kontrak OPS-POL-* di registri (nilai = premi)' },
      { id: 'governance', ic: 'building', lbl: 'Governance (SOQM)', rel: 'Register risiko firma → komponen penilaian risiko SOQM' },
      { id: 'eqr', ic: 'checkCircle', lbl: 'EQR Workflow', rel: 'FR-01 → EQR wajib sebagai mitigasi mutu perikatan' },
      { id: 'pppk', ic: 'report', lbl: 'Pelaporan PPPK', rel: 'FR-05 risiko regulasi → kalender & ketertelusuran pelaporan' },
    ],
  };
}


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { FirmInsurance };
