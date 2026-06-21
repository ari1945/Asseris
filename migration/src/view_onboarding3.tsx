/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { useAmsPersist } from './contexts.jsx';
import { I } from './icons.jsx';
import { Avatar, Badge, Donut, Panel, Progress, Stat } from './ui.jsx';
import { Funnel } from './view_fpm_parts';
import { obAccScore, obAccVerdict, obStage } from './view_onboarding';

/* ============================================================
   Asseris — Client Onboarding · extra tabs
   Analitik · Akseptasi (SA 220/300) · PMPJ / APU-PPT (AML/KYC).
   (4-gate board stays in view_onboarding.jsx; reuses obStage,
   obGates, obAccScore, obAccVerdict, OB_STAGES globals.)
   ============================================================ */
const { useState: useOB3 } = React;

const OB_CYCLE = { acceptance: 6, pmpj: 8, letter: 4, convert: 3 }; // mock SLA days/gate

/* ---------------- Analitik ---------------- */
function OBAnalitik() {
  const { fmt } = AMS;
  const [prospects] = useAmsPersist('prospects', () => AMS.PROSPECTS);

  const live = prospects.filter(p => !p.converted);
  const converted = prospects.filter(p => p.converted);
  const convRate = Math.round(converted.length / prospects.length * 100);
  const totalFee = live.reduce((s, p) => s + p.fee, 0);

  /* funnel: prospects that have cleared each gate */
  const order = ['acceptance', 'pmpj', 'letter', 'convert'];
  const reached = order.map((g, i) => {
    const n = prospects.filter(p => {
      const idx = order.indexOf(obStage(p));
      return p.converted || idx > i || (idx === i);
    }).length;
    return n;
  });
  const gateLabels = { acceptance: 'Akseptasi', pmpj: 'PMPJ / KYC', letter: 'Engagement Letter', convert: 'Konversi' };
  const gateColor = { acceptance: '#5b3fa6', pmpj: '#0a6b73', letter: '#005085', convert: '#1f7a4d' };
  const funnel = order.map((g, i) => ({ label: gateLabels[g], value: reached[i], disp: reached[i] + ' prospek', n: reached[i], color: gateColor[g] }));

  const bySource = (Object.values(prospects.reduce((m: any, p: any) => { const k = p.source || '—'; m[k] = m[k] || { k, n: 0, fee: 0 }; m[k].n++; m[k].fee += p.fee; return m; }, {})) as any[]).sort((a: any, b: any) => b.fee - a.fee);
  const byKind = ['Klien Baru', 'Keberlanjutan'].map(k => ({ k, n: prospects.filter(p => p.kind === k).length }));

  return (
    <div className="view-scroll"><div className="view-pad">
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 12 }}>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={prospects.length} label="Total Prospek" /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={convRate + '%'} label="Conversion Rate" accent="var(--green)" /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={'Rp ' + fmt(totalFee / 1e9, 2) + ' M'} label="Fee dalam Pipeline" accent="var(--blue)" /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={Object.values(OB_CYCLE).reduce((s, v) => s + v, 0) + ' hari'} label="Target Siklus Onboarding" /></div></Panel>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1.3fr 1fr', gap: 12, alignItems: 'start', marginBottom: 12 }}>
        <Panel title="Funnel Onboarding" sub="prospek melewati tiap gerbang">
          <div style={{ padding: '16px 14px' }}><Funnel stages={funnel} /></div>
        </Panel>
        <Panel title="Target Waktu per Gerbang" sub="SLA siklus (hari)">
          <div style={{ padding: 14, display: 'grid', gap: 11 }}>
            {order.map(g => (
              <div key={g}>
                <div className="row jb tiny" style={{ marginBottom: 3 }}><span className="row ac gap6"><span style={{ width: 9, height: 9, borderRadius: 2, background: gateColor[g] }} /><span style={{ fontWeight: 600 }}>{gateLabels[g]}</span></span><span className="mono" style={{ fontWeight: 700 }}>{OB_CYCLE[g]} hari</span></div>
                <Progress value={OB_CYCLE[g] / 21 * 100} color={gateColor[g]} />
              </div>
            ))}
            <div className="tiny muted" style={{ lineHeight: 1.5, marginTop: 2 }}>Siklus penuh dari prospek ke perikatan ditargetkan {Object.values(OB_CYCLE).reduce((s, v) => s + v, 0)} hari kerja, dengan PMPJ/EDD sebagai gerbang terpanjang.</div>
          </div>
        </Panel>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1.4fr 1fr', gap: 12, alignItems: 'start' }}>
        <Panel noBody>
          <div className="panel-h"><h3>Pipeline per Sumber</h3></div>
          <table className="dtbl">
            <thead><tr><th>Sumber</th><th className="num">Prospek</th><th className="num">Nilai Fee</th><th style={{ width: 180 }}>Porsi</th></tr></thead>
            <tbody>
              {bySource.map(s => (
                <tr key={s.k}>
                  <td className="mono tiny" style={{ fontWeight: 700 }}>{s.k}</td>
                  <td className="num">{s.n}</td>
                  <td className="num" style={{ fontWeight: 600 }}>Rp {fmt(s.fee / 1e6, 0)} jt</td>
                  <td><Progress value={s.fee / bySource[0].fee * 100} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
        <Panel title="Komposisi Prospek">
          <div style={{ padding: 14 }} className="row gap12 ac">
            <Donut segments={byKind.map((k, i) => ({ value: k.n || 0.1, color: i === 0 ? '#5b3fa6' : '#005085' }))} size={100} thickness={15}
              center={<><div className="mono" style={{ fontSize: 16, fontWeight: 700 }}>{prospects.length}</div><div className="tiny muted">prospek</div></>} />
            <div style={{ flex: 1 }}>
              {byKind.map((k, i) => (
                <div key={k.k} className="row jb ac" style={{ padding: '5px 0' }}>
                  <span className="row ac gap6"><span style={{ width: 9, height: 9, borderRadius: 2, background: i === 0 ? '#5b3fa6' : '#005085' }} /><span style={{ fontSize: 12, fontWeight: 600 }}>{k.k}</span></span>
                  <span className="mono tiny" style={{ fontWeight: 700 }}>{k.n}</span>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </div>
    </div></div>
  );
}

/* ---------------- Akseptasi (SA 220 / 300) ---------------- */
function OBAcceptance() {
  const [prospects] = useAmsPersist('prospects', () => AMS.PROSPECTS);
  const [selId, setSelId] = useOB3(prospects[0].id);
  const sel = prospects.find(p => p.id === selId) || prospects[0];
  const factors = (sel.acceptance && sel.acceptance.factors) || [];
  const score = obAccScore(sel);
  const verdict = obAccVerdict(score);

  const approved = prospects.filter(p => p.acceptance && p.acceptance.approved).length;
  const pending = prospects.filter(p => p.acceptance && !p.acceptance.approved).length;
  const conditional = prospects.filter(p => (p.acceptance && p.acceptance.decision || '').includes('Syarat')).length;
  const avgScore = (prospects.reduce((s, p) => s + obAccScore(p), 0) / prospects.length).toFixed(1);

  return (
    <div className="view-scroll"><div className="view-pad">
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 12 }}>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={approved} label="Disetujui" accent="var(--green)" /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={pending} label="Menunggu Keputusan" accent="var(--amber)" /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={conditional} label="Terima dengan Syarat" accent="var(--purple)" /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={avgScore} label="Rata-rata Skor Akseptasi" /></div></Panel>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1.3fr 1fr', gap: 12, alignItems: 'start' }}>
        <Panel noBody>
          <div className="panel-h"><h3>Registri Keputusan Penerimaan</h3><div style={{ flex: 1 }} /><span className="tiny muted">SA 220 · ISQM 1 · SA 300</span></div>
          <table className="dtbl">
            <thead><tr><th>Prospek</th><th className="num">Skor</th><th>Keputusan</th><th>Approver</th><th className="num">Tanggal</th></tr></thead>
            <tbody>
              {prospects.map(p => {
                const sc = obAccScore(p);
                const v = obAccVerdict(sc);
                return (
                  <tr key={p.id} className={p.id === selId ? 'sel' : ''} style={{ cursor: 'pointer' }} onClick={() => setSelId(p.id)}>
                    <td><div style={{ fontWeight: 600 }} className="truncate">{p.name.replace('PT ', '')}</div><div className="tiny muted">{p.kind}</div></td>
                    <td className="num"><span className="badge" style={{ background: 'var(--' + v.k + ')', color: '#fff', fontSize: 9 }}>{sc.toFixed(1)}</span></td>
                    <td><Badge kind={p.acceptance && p.acceptance.approved ? (v.k === 'red' ? 'red' : v.k === 'amber' ? 'amber' : 'green') : 'gray'}>{p.acceptance && p.acceptance.decision || 'Pending'}</Badge></td>
                    <td className="tiny muted truncate" style={{ maxWidth: 110 }}>{p.acceptance && p.acceptance.approver ? p.acceptance.approver.split(',')[0] : '—'}</td>
                    <td className="num tiny">{p.acceptance && p.acceptance.date || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Panel>

        <Panel noBody>
          <div style={{ background: 'linear-gradient(120deg,#3a2a6a,#5b3fa6)', color: '#fff', padding: '13px 16px' }}>
            <div className="row jb ac"><div><div style={{ fontWeight: 700, fontSize: 14 }} className="truncate">{sel.name}</div><div className="tiny" style={{ color: '#d4c8ee' }}>{sel.industry}</div></div>
              <div style={{ textAlign: 'center' }}><div className="mono" style={{ fontSize: 22, fontWeight: 800 }}>{score.toFixed(1)}</div><div className="tiny" style={{ color: '#d4c8ee' }}>skor tertimbang</div></div></div>
          </div>
          <div style={{ padding: 14 }}>
            <div className="row jb ac" style={{ marginBottom: 10 }}><span className="tiny muted upper">Putusan</span><Badge kind={verdict.k}>{verdict.l}</Badge></div>
            {factors.map((f, i) => (
              <div key={i} style={{ marginBottom: 9 }}>
                <div className="row jb tiny" style={{ marginBottom: 2 }}><span style={{ fontWeight: 600 }}>{f.k} <span className="muted">({f.w}%)</span></span><span className="mono" style={{ fontWeight: 700, color: f.s >= 4 ? 'var(--green)' : f.s >= 3 ? 'var(--amber)' : 'var(--red)' }}>{f.s}/5</span></div>
                <div style={{ display: 'flex', gap: 3 }}>{[1, 2, 3, 4, 5].map(n => <div key={n} style={{ flex: 1, height: 5, borderRadius: 2, background: n <= f.s ? (f.s >= 4 ? 'var(--green)' : f.s >= 3 ? 'var(--amber)' : 'var(--red)') : 'var(--surface-3)' }} />)}</div>
                {f.note && <div className="tiny muted" style={{ marginTop: 3, lineHeight: 1.4 }}>{f.note}</div>}
              </div>
            ))}
            {sel.acceptance && sel.acceptance.safeguard && (
              <div className="panel" style={{ padding: '9px 11px', background: 'var(--amber-bg)', borderColor: 'transparent', marginTop: 4 }}>
                <div className="tiny" style={{ fontWeight: 600, lineHeight: 1.5 }}><I.shield size={11} /> Safeguard: {sel.acceptance.safeguard}</div>
              </div>
            )}
          </div>
        </Panel>
      </div>
    </div></div>
  );
}

/* ---------------- PMPJ / APU-PPT (AML / KYC) ---------------- */
function OBAml() {
  const [prospects] = useAmsPersist('prospects', () => AMS.PROSPECTS);
  const withPmpj = prospects.filter(p => p.pmpj);
  const [selId, setSelId] = useOB3((withPmpj[0] || prospects[0]).id);
  const sel = prospects.find(p => p.id === selId) || prospects[0];
  const pmpj = sel.pmpj || {};

  const verified = withPmpj.filter(p => p.pmpj.verified).length;
  const edd = withPmpj.filter(p => (p.pmpj.cddLevel || '').includes('EDD')).length;
  const pepCount = withPmpj.filter(p => (p.pmpj.ubo || []).some(u => u.pep)).length;
  const strCount = withPmpj.filter(p => p.pmpj.str).length;
  const riskColor = { 'Tinggi': 'red', 'Sedang': 'amber', 'Rendah': 'green' };

  return (
    <div className="view-scroll"><div className="view-pad">
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 12 }}>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={verified + ' / ' + withPmpj.length} label="PMPJ Terverifikasi" accent="var(--green)" /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={edd} label="Enhanced DD (EDD)" accent="var(--amber)" /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={pepCount} label="UBO PEP Teridentifikasi" accent="var(--red)" /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={strCount} label="Laporan Transaksi (STR)" /></div></Panel>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1.2fr 1fr', gap: 12, alignItems: 'start' }}>
        <Panel noBody>
          <div className="panel-h"><h3>Registri PMPJ / KYC</h3><div style={{ flex: 1 }} /><span className="tiny muted">UU TPPU · PMK APU-PPT</span></div>
          <table className="dtbl">
            <thead><tr><th>Prospek</th><th>Risiko</th><th>Tingkat CDD</th><th className="num">UBO</th><th>PEP</th><th>Status</th></tr></thead>
            <tbody>
              {withPmpj.map(p => {
                const pep = (p.pmpj.ubo || []).some(u => u.pep);
                return (
                  <tr key={p.id} className={p.id === selId ? 'sel' : ''} style={{ cursor: 'pointer' }} onClick={() => setSelId(p.id)}>
                    <td className="truncate" style={{ maxWidth: 160, fontWeight: 600 }}>{p.name.replace('PT ', '')}</td>
                    <td><Badge kind={riskColor[p.pmpj.riskRating] || 'gray'}>{p.pmpj.riskRating}</Badge></td>
                    <td className="tiny">{p.pmpj.cddLevel}</td>
                    <td className="num">{(p.pmpj.ubo || []).length}</td>
                    <td>{pep ? <span className="badge b-red" style={{ fontSize: 9 }}>PEP</span> : <span className="badge b-green" style={{ fontSize: 9 }}>Bersih</span>}</td>
                    <td><Badge kind={p.pmpj.verified ? 'green' : 'amber'}>{p.pmpj.verified ? 'Terverifikasi' : 'Proses'}</Badge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Panel>

        <div className="grid" style={{ gap: 12 }}>
          <Panel title={'Pemilik Manfaat (UBO) · ' + sel.name.replace('PT ', '')} sub={pmpj.purpose}>
            <div style={{ padding: 12, display: 'grid', gap: 8 }}>
              {(pmpj.ubo || []).map((u, i) => (
                <div key={i} className="row ac gap10" style={{ padding: '8px 10px', borderRadius: 7, background: 'var(--surface-2)' }}>
                  <Avatar name={u.name} size={28} />
                  <div style={{ flex: 1, minWidth: 0 }}><div className="row ac gap6"><span style={{ fontSize: 12, fontWeight: 600 }} className="truncate">{u.name}</span>{u.pep && <span className="badge b-red" style={{ fontSize: 8.5 }}>PEP</span>}</div><div className="tiny muted">{u.role} · {u.idType} {u.idNo}</div></div>
                  <span className="mono" style={{ fontWeight: 700, fontSize: 13 }}>{u.pct}%</span>
                </div>
              ))}
              {!(pmpj.ubo || []).length && <div className="muted tiny">Data UBO belum tersedia.</div>}
            </div>
          </Panel>

          <Panel title="Penyaringan Daftar (Screening)" sub="PEP · DTTOT · Sanksi">
            <div style={{ padding: 12, display: 'grid', gap: 7 }}>
              {(pmpj.screening || []).map((s, i) => (
                <div key={i} className="row ac gap8" style={{ padding: '7px 9px', borderRadius: 7, background: s.hit ? 'var(--red-bg)' : 'var(--surface-2)' }}>
                  <span style={{ color: s.hit ? 'var(--red)' : 'var(--green)', flex: '0 0 16px' }}>{React.createElement(s.hit ? I.alert : I.checkCircle, { size: 15 })}</span>
                  <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12, fontWeight: 600 }} className="truncate">{s.name}</div><div className="tiny muted">{s.list}</div></div>
                  <span className="tiny" style={{ fontWeight: 600, color: s.hit ? 'var(--red)' : 'var(--green)', textAlign: 'right', maxWidth: 140 }}>{s.status}</span>
                </div>
              ))}
              {!(pmpj.screening || []).length && <div className="muted tiny">Tidak ada hasil penyaringan.</div>}
            </div>
          </Panel>
        </div>
      </div>
    </div></div>
  );
}

Object.assign(window, { OBAnalitik, OBAcceptance, OBAml });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { OBAcceptance, OBAml, OBAnalitik };
