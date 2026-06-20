/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { useAmsPersist, useNav } from './contexts.jsx';
import { I } from './icons.jsx';
import { SubBar } from './shell.jsx';
import { Badge, Btn, Panel, Seg, Stat, Tabs } from './ui.jsx';

/* ============================================================
   NeoSuite AMS — Jasa Non-Audit (SPAP): Portofolio + Reviu SPR 2400
   Taksonomi SPAP: Asurans (Reviu 2400, Asurans lain 3000/3402/3400)
   & Jasa Terkait/Selain Asurans (AUP 4400, Kompilasi 4410).
   ============================================================ */
const { useState: useNA } = React;

const NA_CAT_COLOR = { 'Reviu': '#0a6b73', 'Jasa Terkait': '#5b3fa6', 'Asurans Lain': '#005085', 'Advisory': '#9a6a00' };
const NA_ASR_KIND = (a) => a.includes('Tanpa') ? 'gray' : a.includes('Memadai') ? 'green' : 'blue';

/* ============================================================
   Hub — Portofolio Jasa Non-Audit
   ============================================================ */
function NonAuditPortfolio() {
  const { fmt } = AMS;
  const nav = useNav();
  const aupE = AMS.aupEngine ? AMS.aupEngine() : null;
  const pfiE = AMS.pfiEngine ? AMS.pfiEngine() : null;
  const socE = AMS.socEngine ? AMS.socEngine() : null;
  const ghgE = AMS.ghgEngine ? AMS.ghgEngine() : null;
  const pfrE = AMS.proformaEngine ? AMS.proformaEngine() : null;
  /* progres perikatan AUP, PFI & SOC 3402 DITARIK dari engine (satu sumber), bukan hardcode */
  const list = AMS.NONAUDIT.map(e => {
    if (aupE && e.id === aupE.meta.id) return { ...e, progress: aupE.progress };
    if (pfiE && e.id === pfiE.meta.id) return { ...e, progress: pfiE.progress, route: 'sjah3400' };
    if (socE && e.id === socE.meta.id) return { ...e, progress: socE.progress, route: 'sjah3402' };
    if (ghgE && e.id === ghgE.meta.id) return { ...e, progress: ghgE.progress, route: 'sjah3410' };
    if (pfrE && e.id === pfrE.meta.id) return { ...e, progress: pfrE.progress, route: 'sjah3420' };
    return e;
  });
  const [cat, setCat] = useNA('All');

  const cats = ['All', 'Reviu', 'Jasa Terkait', 'Asurans Lain', 'Advisory'];
  const shown = cat === 'All' ? list : list.filter(e => e.cat === cat);
  const totalFee = list.reduce((s, e) => s + e.fee, 0);

  /* SPAP taxonomy reference cards */
  const taxonomy = [
    { group: 'Perikatan Asurans', items: [
      { std: 'SA 200+', name: 'Audit Laporan Keuangan', asr: 'Keyakinan memadai', note: 'Opini positif', here: false },
      { std: 'SPR 2400', name: 'Reviu Laporan Keuangan', asr: 'Keyakinan terbatas', note: 'Keyakinan negatif', here: true },
      { std: 'SPA 3000', name: 'Asurans selain audit/reviu', asr: 'Memadai / terbatas', note: 'Hal pokok non-historis', here: true },
      { std: 'SPA 3400', name: 'Pemeriksaan Info Prospektif', asr: 'Terbatas', note: 'Proyeksi & prakiraan', here: true },
      { std: 'SPA 3402', name: 'Pengendalian Organisasi Jasa', asr: 'Memadai', note: 'Laporan Type 1/2', here: true },
    ]},
    { group: 'Perikatan Selain Asurans (Jasa Terkait)', items: [
      { std: 'SPSJL 4400', name: 'Prosedur yang Disepakati (AUP)', asr: 'Tanpa asurans', note: 'Temuan faktual', here: true },
      { std: 'SPSJL 4410', name: 'Kompilasi Informasi Keuangan', asr: 'Tanpa asurans', note: 'Tanpa verifikasi', here: true },
    ]},
  ];

  return (
    <>
      <SubBar moduleId="nonaudit" right={<div className="row gap8 ac"><Badge kind="blue">SPAP · Asurans & Jasa Terkait</Badge><Btn sm variant="primary" onClick={() => nav('onboarding')}><I.plus size={14} /> Perikatan Baru</Btn></div>} />
      <div className="view-scroll"><div className="view-pad">
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={list.length} label="Perikatan Non-Audit Aktif" /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={'Rp ' + fmt(totalFee / 1e6, 0) + ' jt'} label="Nilai Portofolio" accent="var(--green)" /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={list.filter(e => e.cat === 'Asurans Lain').length} label="Asurans Lain (3000-series)" accent="var(--blue)" /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={list.filter(e => e.assurance.includes('Tanpa')).length} label="Tanpa Asurans (4400/4410)" /></div></Panel>
        </div>

        <Panel noBody>
          <div className="panel-h"><h3>Portofolio Perikatan</h3><div style={{ flex: 1 }} /><Seg options={cats} value={cat} onChange={setCat} /></div>
          <table className="dtbl">
            <thead><tr><th>ID</th><th>Klien</th><th>Jenis Jasa</th><th>Standar</th><th>Tingkat Asurans</th><th>Partner</th><th className="num">Imbalan</th><th style={{ width: 120 }}>Progres</th><th></th></tr></thead>
            <tbody>
              {shown.map(e => (
                <tr key={e.id} onClick={() => nav(e.route)} style={{ cursor: 'pointer' }}>
                  <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{e.id}</td>
                  <td style={{ fontWeight: 600 }} className="truncate">{e.client.replace('PT ', '')}</td>
                  <td><span className="badge" style={{ background: NA_CAT_COLOR[e.cat] + '1a', color: NA_CAT_COLOR[e.cat] }}>{e.stdLabel}</span></td>
                  <td><span className="chip tiny">{e.std}</span></td>
                  <td><Badge kind={NA_ASR_KIND(e.assurance)}>{e.assurance}</Badge></td>
                  <td className="tiny">{e.partner.split(',')[0]}</td>
                  <td className="num">{fmt(e.fee / 1e6, 0)} jt</td>
                  <td><div className="row ac gap6"><div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--surface-3)' }}><div style={{ width: e.progress + '%', height: '100%', borderRadius: 3, background: e.progress >= 75 ? 'var(--green)' : 'var(--blue)' }} /></div><span className="tiny mono" style={{ width: 30 }}>{e.progress}%</span></div></td>
                  <td><I.chevron size={14} style={{ color: 'var(--ink-4)' }} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <div className="tiny muted upper" style={{ margin: '16px 0 8px' }}>Kerangka Jenis Jasa menurut SPAP</div>
        <div className="grid" style={{ gridTemplateColumns: '1.4fr 1fr', gap: 12, alignItems: 'start' }}>
          {taxonomy.map(t => (
            <Panel key={t.group} title={t.group}>
              <div style={{ display: 'grid', gap: 7 }}>
                {t.items.map(it => (
                  <div key={it.std} className="row ac jb" style={{ padding: '7px 9px', borderRadius: 6, background: it.here ? 'var(--blue-050)' : 'transparent', border: '1px solid ' + (it.here ? 'transparent' : 'var(--line-soft)') }}>
                    <div className="row ac gap8" style={{ minWidth: 0 }}><span className="chip tiny" style={{ minWidth: 64, textAlign: 'center' }}>{it.std}</span><div style={{ minWidth: 0 }}><div style={{ fontSize: 12, fontWeight: 600 }} className="truncate">{it.name}</div><div className="tiny muted">{it.note}</div></div></div>
                    <span className="tiny" style={{ color: 'var(--ink-3)', whiteSpace: 'nowrap' }}>{it.asr}</span>
                  </div>
                ))}
              </div>
            </Panel>
          ))}
        </div>
      </div></div>
    </>
  );
}

/* ============================================================
   Reviu Laporan Keuangan — SPR 2400 (limited assurance)
   ============================================================ */
const REV_CONCL = {
  unmodified: { k: 'green', l: 'Tanpa Modifikasian', txt: 'Berdasarkan reviu kami, tidak ada hal yang menjadi perhatian kami yang menyebabkan kami percaya bahwa laporan keuangan tidak menyajikan secara wajar, dalam semua hal yang material, sesuai dengan SAK (keyakinan terbatas / negatif).' },
  qualified: { k: 'amber', l: 'Dengan Pengecualian', txt: 'Kecuali untuk dampak hal tertentu, tidak ada hal yang menjadi perhatian kami yang menyebabkan kami percaya laporan keuangan tidak disajikan secara wajar sesuai SAK.' },
  adverse: { k: 'red', l: 'Merugikan (Adverse)', txt: 'Berdasarkan reviu kami, laporan keuangan tidak menyajikan secara wajar sesuai dengan SAK.' },
  disclaimer: { k: 'gray', l: 'Tidak Menyatakan Simpulan', txt: 'Kami tidak dapat memperoleh bukti yang cukup sebagai dasar simpulan; oleh karena itu kami tidak menyatakan simpulan.' },
};

function Review2400() {
  const { fmt } = AMS;
  const R = AMS.REVIEW_2400;
  const [inq, setInq] = useAmsPersist('review2400inq', () => R.inquiries);
  const [concl, setConcl] = useAmsPersist('review2400concl', R.conclusion);
  const [tab, setTab] = useNA('plan');

  const toggleInq = (i) => setInq(list => list.map((x, j) => j === i ? { ...x, done: !x.done } : x));
  const setResp = (i, v) => setInq(list => list.map((x, j) => j === i ? { ...x, resp: v } : x));
  const flagged = R.analytics.filter(a => a.varied).length;
  const inqDone = inq.filter(x => x.done).length;
  const ready = inqDone === inq.length;
  const c = REV_CONCL[concl];

  const tabs = [{ id: 'plan', label: 'Perencanaan' }, { id: 'analytics', label: 'Prosedur Analitis', count: flagged }, { id: 'inquiry', label: 'Inquiry Manajemen', count: inq.length - inqDone }, { id: 'report', label: 'Simpulan & Laporan' }];

  return (
    <>
      <SubBar moduleId="review2400" right={<div className="row gap8 ac"><Badge kind="blue">SPR 2400 · Keyakinan Terbatas</Badge></div>} />
      <div className="view-scroll"><div className="view-pad">
        <div className="panel" style={{ padding: '11px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ width: 38, height: 38, borderRadius: 9, background: '#0a6b73', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700 }}>R</span>
          <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 14 }}>{R.client}</div><div className="tiny muted">{R.id} · Reviu {R.fy} · Kerangka {R.framework} · Reviu memberikan keyakinan terbatas (bukan audit)</div></div>
          <div className="row gap8">
            <div style={{ textAlign: 'right' }}><div className="tiny muted">Anomali Analitis</div><div className="mono" style={{ fontWeight: 700, color: flagged ? 'var(--amber)' : 'var(--green)' }}>{flagged}</div></div>
            <div style={{ textAlign: 'right' }}><div className="tiny muted">Inquiry Selesai</div><div className="mono" style={{ fontWeight: 700 }}>{inqDone}/{inq.length}</div></div>
          </div>
        </div>

        <Panel noBody>
          <div className="panel-h" style={{ padding: 0, background: 'var(--surface-2)' }}><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>

          {tab === 'plan' && (() => {
            const P = AMS.REVIEW_2400_PLAN;
            return (
              <div style={{ padding: 16 }}>
                <div className="grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 14 }}>
                  <div className="panel" style={{ padding: 12 }}><div className="tiny muted upper" style={{ marginBottom: 4 }}>Materialitas Reviu</div><div className="mono" style={{ fontSize: 16, fontWeight: 700, color: 'var(--navy)' }}>Rp {fmt(P.materiality / 1e6, 0)} jt</div><div className="tiny muted">{P.benchmark}</div></div>
                  <div className="panel" style={{ padding: 12 }}><div className="tiny muted upper" style={{ marginBottom: 4 }}>Materialitas Pelaksanaan</div><div className="mono" style={{ fontSize: 16, fontWeight: 700 }}>Rp {fmt(P.pm / 1e6, 0)} jt</div><div className="tiny muted">75% dari materialitas</div></div>
                  <div className="panel" style={{ padding: 12 }}><div className="tiny muted upper" style={{ marginBottom: 4 }}>Sifat Perikatan</div><div style={{ fontSize: 13, fontWeight: 700, color: 'var(--teal)' }}>Keyakinan Terbatas</div><div className="tiny muted">inquiry & analitis</div></div>
                </div>
                <div className="tiny muted upper" style={{ marginBottom: 8 }}>Area Fokus & Pendekatan Reviu</div>
                <table className="dtbl">
                  <thead><tr><th>Area</th><th>Tingkat Risiko</th><th>Pertimbangan & Pendekatan</th></tr></thead>
                  <tbody>
                    {P.focus.map((f, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600 }}>{f.area}</td>
                        <td><Badge kind={f.risk === 'Tinggi' ? 'red' : f.risk === 'Sedang' ? 'amber' : 'gray'}>{f.risk}</Badge></td>
                        <td className="tiny muted" style={{ whiteSpace: 'normal' }}>{f.why}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="tiny muted" style={{ marginTop: 8, lineHeight: 1.5 }}>SPR 2400 ¶¶45–55: rancang prosedur reviu (terutama inquiry & analitis) berdasarkan pemahaman entitas dan area berisiko salah saji material untuk memperoleh keyakinan terbatas.</div>
              </div>
            );
          })()}

          {tab === 'analytics' && (
            <table className="dtbl">
              <thead><tr><th>Metrik / Rasio</th><th className="num">Tahun Lalu</th><th className="num">Tahun Ini</th><th>Status</th><th>Tindak Lanjut Inquiry</th></tr></thead>
              <tbody>
                {R.analytics.map((a, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{a.metric}</td>
                    <td className="num mono muted">{a.py}</td>
                    <td className="num mono" style={{ fontWeight: 600 }}>{a.cy}</td>
                    <td>{a.varied ? <Badge kind="amber">Fluktuasi Signifikan</Badge> : <Badge kind="green">Dalam Ekspektasi</Badge>}</td>
                    <td className="tiny muted" style={{ whiteSpace: 'normal', verticalAlign: 'top' }}>{a.note || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === 'inquiry' && (
            <div style={{ padding: 12, display: 'grid', gap: 8 }}>
              {inq.map((x, i) => (
                <div key={i} className="panel" style={{ padding: 12, boxShadow: 'none', borderLeft: '3px solid ' + (x.done ? 'var(--green)' : 'var(--line-strong)') }}>
                  <div className="row jb ac" style={{ marginBottom: 6 }}>
                    <span className="row ac gap8"><span onClick={() => toggleInq(i)} style={{ cursor: 'pointer', width: 18, height: 18, borderRadius: 5, display: 'grid', placeItems: 'center', background: x.done ? 'var(--green)' : 'var(--surface-3)', color: '#fff', flex: '0 0 18px' }}>{x.done && <I.check size={11} />}</span><span style={{ fontSize: 12.5, fontWeight: 600 }}>{x.q}</span></span>
                  </div>
                  <input className="input" value={x.resp} onChange={e => setResp(i, e.target.value)} placeholder="Catat respons manajemen / hasil prosedur analitis…" style={{ width: '100%' }} />
                </div>
              ))}
            </div>
          )}

          {tab === 'report' && (
            <div style={{ padding: 16 }}>
              <div className="grid" style={{ gridTemplateColumns: '1fr 1.3fr', gap: 16, alignItems: 'start' }}>
                <div>
                  <div className="tiny muted upper" style={{ marginBottom: 8 }}>Bentuk Simpulan Reviu</div>
                  <div style={{ display: 'grid', gap: 7 }}>
                    {Object.keys(REV_CONCL).map(k => (
                      <div key={k} onClick={() => setConcl(k)} className="panel" style={{ padding: '10px 12px', cursor: 'pointer', boxShadow: 'none', borderColor: concl === k ? 'var(--' + REV_CONCL[k].k + ')' : 'var(--line)', borderWidth: concl === k ? 2 : 1, background: concl === k ? 'var(--' + REV_CONCL[k].k + '-bg)' : 'transparent' }}>
                        <div className="row ac gap8"><span style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid var(--' + REV_CONCL[k].k + ')', background: concl === k ? 'var(--' + REV_CONCL[k].k + ')' : 'transparent', flex: '0 0 14px' }} /><span style={{ fontSize: 12.5, fontWeight: 600 }}>{REV_CONCL[k].l}</span></div>
                      </div>
                    ))}
                  </div>
                  {!ready && <div className="panel" style={{ marginTop: 12, padding: '9px 11px', background: 'var(--amber-bg)', borderColor: 'transparent' }}><div className="tiny" style={{ fontWeight: 600 }}><I.alert size={12} /> {inq.length - inqDone} inquiry belum selesai — lengkapi sebelum menerbitkan laporan reviu.</div></div>}
                </div>

                <div className="doc-paper" style={{ background: '#fff', padding: '32px 36px', boxShadow: 'var(--shadow)', fontSize: 11.5, lineHeight: 1.7, color: '#283b46' }}>
                  <div style={{ fontWeight: 800, fontSize: 13, color: '#0c2430', textAlign: 'center', marginBottom: 4 }}>LAPORAN REVIU AUDITOR INDEPENDEN</div>
                  <div className="tiny" style={{ textAlign: 'center', color: '#7a8893', marginBottom: 16 }}>Berdasarkan Standar Perikatan Reviu (SPR) 2400</div>
                  <p style={{ margin: '0 0 10px' }}>Kepada Direksi {R.client}</p>
                  <p style={{ margin: '0 0 10px' }}>Kami telah mereviu laporan keuangan terlampir, yang terdiri dari laporan posisi keuangan per 31 Desember 2025 serta laporan laba rugi, perubahan ekuitas, dan arus kas untuk tahun yang berakhir pada tanggal tersebut.</p>
                  <div style={{ fontWeight: 700, color: '#0c2430', margin: '12px 0 4px' }}>Tanggung Jawab Kami</div>
                  <p style={{ margin: '0 0 10px' }}>Reviu kami dilaksanakan sesuai SPR 2400. Suatu reviu terutama terdiri dari permintaan keterangan (inquiry) dan prosedur analitis, serta <b>memberikan keyakinan terbatas</b> — jauh lebih sempit lingkupnya dibanding audit, sehingga kami tidak menyatakan opini audit.</p>
                  <div style={{ fontWeight: 700, color: '#0c2430', margin: '12px 0 4px' }}>Simpulan ({c.l})</div>
                  <p style={{ margin: 0 }}>{c.txt}</p>
                  <div style={{ marginTop: 24, paddingTop: 10, borderTop: '1px solid #e0e5ea', fontSize: 11 }}><b>{R.client.includes('Cahaya') ? 'Sari Dewanti, CPA' : 'Partner'}</b> · Akuntan Publik<br /><span className="tiny" style={{ color: '#7a8893' }}>Jakarta, {new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</span></div>
                </div>
              </div>
            </div>
          )}
        </Panel>
      </div></div>
    </>
  );
}

Object.assign(window, { NonAuditPortfolio, Review2400 });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { NonAuditPortfolio, Review2400 };
