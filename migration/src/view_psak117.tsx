/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { AMS_CANON } from './canon';
import { useAudit, useNav } from './contexts.jsx';
import { I } from './icons.jsx';
import { SubBar } from './shell.jsx';
import { Badge, Btn, Donut, Panel } from './ui.jsx';
import { wpSignersFor } from './wp_signoff.jsx';

/* ============================================================
   NeoSuite AMS — PSAK 117 · Kontrak Asuransi (adopsi IFRS 17)
   ------------------------------------------------------------
   Kertas kerja penyusunan & audit kontrak asuransi yang DITARIK
   PENUH dari satu sumber kebenaran: AMS_CANON.psak117().
   Cakupan:
     • Pemilihan model pengukuran — GMM / PAA / VFA (¶29, ¶53, ¶B101)
     • Blok pengukuran — FCF + RA + CSM → LRC; LIC klaim terjadi
     • Mutasi CSM (roll-forward) & unit perlindungan (coverage units)
     • Penyesuaian Risiko non-keuangan + tingkat keyakinan
     • Transisi — FRA / MRA / FVA per portofolio (¶C3–C24)
     • Hasil jasa asuransi (P&L ¶80–86) + sensitivitas
     • Kesimpulan audit estimasi aktuaria (SA 540 · SA 620) + KK-A1
   ============================================================ */
const { useState: useStateP117, useMemo: useMemoP117 } = React;

const P117_MODEL_META = {
  GMM: { kind: 'blue',  color: '#005085' },
  PAA: { kind: 'teal',  color: '#0a6b73' },
  VFA: { kind: 'purple', color: '#5b3fa6' },
};

function P117Card({ value, label, sub, accent }: any) {
  return (
    <div className="panel" style={{ padding: '12px 14px', display: 'grid', gap: 2 }}>
      <div className="mono" style={{ fontSize: 20, fontWeight: 700, color: accent || 'var(--navy)', lineHeight: 1.05 }}>{value}</div>
      <div className="tiny muted" style={{ fontWeight: 600 }}>{label}</div>
      {sub && <div className="tiny" style={{ color: 'var(--ink-4)' }}>{sub}</div>}
    </div>
  );
}

function P117Kv({ label, v, strong, accent }: any) {
  return (
    <div className="row jb ac">
      <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>{label}</span>
      <span className="mono" style={{ fontWeight: strong ? 700 : 600, fontSize: strong ? 14 : 12.5, color: accent || (strong ? 'var(--navy)' : 'inherit') }}>{v}</span>
    </div>
  );
}

function p117WpSignoffDefaults() {
  const TEAM: any = (AMS && AMS.TEAM) || [];
  const find = (kw) => (TEAM.find(t => t.role.includes(kw)) || {}).name || '—';
  return {
    preparer: { by: find('Senior'),  role: 'Auditor Senior', at: '11 Jan 2026' },
    reviewer: { by: find('Manager'), role: 'Manajer Audit',  at: '17 Jan 2026' },
    approver: { by: find('Partner'), role: 'Rekan Penanggung Jawab', at: '19 Jan 2026' },
  };
}

/* ============================================================
   KERTAS KERJA A-1 — lembar kerja formal, siap-reviu & cetak.
   Setiap angka ditarik dari prop `p117` (= AMS_CANON.psak117()).
   ============================================================ */
function P117WorkPaper({ p117, fmt, rp, nav }: any) {
  const FIRM: any = (AMS && AMS.FIRM) || { name: 'KAP Wijaya Hartono & Rekan', license: '' };
  const audit = useAudit();
  const so = wpSignersFor(audit, 'psak117', p117WpSignoffDefaults());
  const cl = p117.client;
  const Sect = ({ n, title, sub, children }: any) => (
    <div style={{ marginTop: 22 }}>
      <div className="row ac gap8" style={{ borderBottom: '1.5px solid var(--navy)', paddingBottom: 5, marginBottom: 11 }}>
        <span className="mono" style={{ width: 22, height: 22, flex: '0 0 22px', borderRadius: 5, background: 'var(--navy)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700 }}>{n}</span>
        <h4 style={{ margin: 0, fontSize: 13.5, color: 'var(--navy)', fontWeight: 700, letterSpacing: '.01em' }}>{title}</h4>
        {sub && <span className="tiny muted mono" style={{ marginLeft: 'auto' }}>{sub}</span>}
      </div>
      {children}
    </div>
  );
  const Meta = ({ k, v, mono }: any) => (
    <div style={{ display: 'grid', gap: 1 }}>
      <span className="tiny upper" style={{ letterSpacing: '.05em', color: 'var(--ink-4)', fontSize: 9.5, fontWeight: 700 }}>{k}</span>
      <span className={mono ? 'mono' : ''} style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>{v}</span>
    </div>
  );
  const Sign = ({ lbl, p, accent }: any) => (
    <div style={{ flex: 1, borderTop: '2px solid ' + (accent || 'var(--navy)'), paddingTop: 8 }}>
      <div className="tiny upper" style={{ letterSpacing: '.05em', color: 'var(--ink-4)', fontSize: 9.5, fontWeight: 700, marginBottom: 14 }}>{lbl}</div>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--navy)' }}>{p.by}</div>
      <div className="tiny muted">{p.role}</div>
      <div className="tiny mono" style={{ color: 'var(--ink-3)', marginTop: 3 }}>{p.at}</div>
    </div>
  );

  return (
    <div className="panel" style={{ background: '#fff', maxWidth: 880, margin: '0 auto', width: '100%', padding: '30px 38px 34px', boxShadow: 'var(--shadow)' }}>
      <div className="row jb" style={{ alignItems: 'flex-start', gap: 18, paddingBottom: 14, borderBottom: '2px solid var(--navy)' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--navy)', lineHeight: 1.2 }}>{FIRM.name}</div>
          <div className="mono tiny" style={{ color: 'var(--ink-4)' }}>{FIRM.license}</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', marginTop: 9 }}>Kertas Kerja — Valuasi Liabilitas Kontrak Asuransi</div>
          <div className="tiny muted">PSAK 117 (adopsi IFRS 17) · GMM · PAA · VFA · estimasi aktuaria</div>
        </div>
        <div style={{ textAlign: 'right', flex: '0 0 auto' }}>
          <div className="mono" style={{ display: 'inline-block', border: '1.5px solid var(--navy)', borderRadius: 7, padding: '5px 12px', fontSize: 17, fontWeight: 800, color: 'var(--navy)' }}>A-1</div>
          <div className="tiny muted" style={{ marginTop: 6 }}>Indeks lead schedule <b style={{ color: 'var(--ink)' }}>A</b> · Liabilitas Asuransi</div>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: '12px 18px', padding: '14px 0', borderBottom: '1px solid var(--line)' }}>
        <Meta k="Klien" v={cl.name} />
        <Meta k="NPWP" v={cl.npwp} mono />
        <Meta k="Periode" v="31 Desember 2025" />
        <Meta k="Sektor" v="Asuransi (OJK)" />
        <Meta k="Akun diaudit" v="Liab. Kontrak Asuransi" />
        <Meta k="Asersi utama" v="Penilaian & alokasi" />
        <Meta k="Risiko terkait" v="R-A1 · Estimasi signifikan" />
        <Meta k="Standar audit" v="SA 540 · SA 620" />
      </div>

      <Sect n="1" title="Tujuan & Lingkup">
        <p style={{ margin: 0, fontSize: 12, lineHeight: 1.65, color: 'var(--ink-2)' }}>
          Memperoleh bukti audit yang cukup dan tepat bahwa <b>liabilitas kontrak asuransi</b> telah diukur sesuai PSAK 117 — meliputi ketepatan pemilihan <b>model pengukuran</b> (GMM/PAA/VFA), keandalan <b>arus kas pemenuhan</b>, kewajaran <b>penyesuaian risiko</b> & tingkat keyakinan, ketepatan gulir <b>marjin jasa kontraktual (CSM)</b>, identifikasi <b>kontrak merugi</b>, serta konsistensi <b>pendekatan transisi</b>. Estimasi bersifat ketidakpastian tinggi → melibatkan pekerjaan Aktuaris sebagai pakar auditor (SA 620).
        </p>
      </Sect>

      <Sect n="2" title="Komposisi Liabilitas — per Model Pengukuran" sub="Rp juta">
        <table className="dtbl" style={{ width: '100%' }}>
          <thead><tr>
            <th style={{ textAlign: 'left' }}>Portofolio</th>
            <th style={{ textAlign: 'center', width: 56 }}>Model</th>
            <th style={{ textAlign: 'right', width: 92 }}>FCF</th>
            <th style={{ textAlign: 'right', width: 78 }}>RA</th>
            <th style={{ textAlign: 'right', width: 88 }}>CSM</th>
            <th style={{ textAlign: 'right', width: 96 }}>LRC</th>
          </tr></thead>
          <tbody>
            {p117.ports.map(p => (
              <tr key={p.id}>
                <td style={{ fontWeight: 600, fontSize: 12 }}>{p.name}</td>
                <td style={{ textAlign: 'center' }}><Badge kind={P117_MODEL_META[p.model].kind}>{p.model}</Badge></td>
                <td className="mono" style={{ textAlign: 'right' }}>{fmt(p.fcf)}</td>
                <td className="mono" style={{ textAlign: 'right' }}>{p.ra ? fmt(p.ra) : '—'}</td>
                <td className="mono" style={{ textAlign: 'right' }}>{p.csm != null ? fmt(p.csm) : <span className="muted">n/a</span>}</td>
                <td className="mono" style={{ textAlign: 'right', fontWeight: 700, color: 'var(--navy)' }}>{fmt(p.lrc)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background: 'var(--surface-2)' }}>
              <td colSpan={2} style={{ fontWeight: 700, color: 'var(--navy)' }}>LIABILITAS SISA PERLINDUNGAN (LRC)</td>
              <td className="mono" style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(p117.fcfTotal)}</td>
              <td className="mono" style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(p117.raLrc)}</td>
              <td className="mono" style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(p117.csmTotal)}</td>
              <td className="mono" style={{ textAlign: 'right', fontWeight: 800, color: 'var(--navy)' }}>{fmt(p117.lrcTotal)}</td>
            </tr>
          </tfoot>
        </table>
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 11 }}>
          <div className="panel" style={{ padding: '9px 12px', background: 'var(--surface-2)', boxShadow: 'none', display: 'grid', gap: 5 }}>
            <P117Kv label="Liab. Sisa Perlindungan (LRC)" v={fmt(p117.lrcTotal) + ' jt'} />
            <P117Kv label="Liab. Klaim Terjadi (LIC)" v={fmt(p117.licTotal) + ' jt'} />
            <P117Kv label="Total Liabilitas Kontrak Asuransi" v={fmt(p117.liabTotal) + ' jt'} strong />
          </div>
          <div className="panel" style={{ padding: '9px 12px', background: 'var(--surface-2)', boxShadow: 'none', display: 'grid', gap: 5 }}>
            <P117Kv label="Komponen kerugian (onerous)" v={fmt(p117.lcTotal) + ' jt'} accent="var(--red)" />
            <P117Kv label="Penyesuaian Risiko (LRC+LIC)" v={fmt(p117.raTotal) + ' jt'} />
            <P117Kv label="CSM — laba belum diakui" v={fmt(p117.csmTotal) + ' jt'} strong accent="var(--blue)" />
          </div>
        </div>
      </Sect>

      <Sect n="3" title="Mutasi Marjin Jasa Kontraktual (CSM)" sub="¶44 · roll-forward">
        <table className="dtbl" style={{ width: '100%' }}>
          <tbody>
            {p117.csmRoll.map((r, i) => (
              <tr key={i} style={{ background: r.tot ? 'var(--surface-2)' : 'transparent' }}>
                <td style={{ fontWeight: r.tot ? 700 : 500, color: r.tot ? 'var(--navy)' : 'var(--ink)', fontSize: 12 }}>{r.t}</td>
                <td className="mono" style={{ textAlign: 'right', fontWeight: 700, color: r.v < 0 ? 'var(--red)' : (r.tot ? 'var(--navy)' : 'var(--green)') }}>{r.v < 0 ? '(' + fmt(-r.v) + ')' : (r.tot ? '' : '+') + fmt(r.v)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="tiny muted" style={{ marginTop: 8, lineHeight: 1.55 }}>Saldo akhir CSM <b>{fmt(p117.csmClose)} jt</b> {p117.csmTie ? 'menutup persis' : 'TIDAK menutup'} ke total CSM portofolio (GMM+VFA). CSM dilepas ke laba rugi berdasarkan <b>unit perlindungan</b> periode berjalan.</div>
      </Sect>

      <Sect n="4" title="Kesimpulan Audit">
        <div className="panel" style={{ padding: '11px 13px', background: 'var(--green-bg)', borderColor: 'transparent' }}>
          <div className="row gap8" style={{ alignItems: 'flex-start' }}>
            <span style={{ color: 'var(--green)', marginTop: 1, flex: '0 0 auto' }}><I.checkCircle size={15} /></span>
            <div style={{ fontSize: 12, lineHeight: 1.6 }}>
              Berdasarkan telaah model aktuaria & pekerjaan Aktuaris (SA 620), pemilihan model pengukuran <b>(GMM/PAA/VFA)</b> tepat per portofolio; arus kas pemenuhan, penyesuaian risiko (persentil ke-{p117.raConfidence}) & gulir CSM <b>{fmt(p117.csmClose)} jt</b> wajar dan konsisten. Total liabilitas kontrak asuransi <b>{rp(p117.liabTotal)} jt</b> disajikan secara wajar sesuai PSAK 117; komponen kerugian kontrak merugi <b>{rp(p117.lcTotal)} jt</b> telah diakui. Valuasi merupakan <b>kandidat Hal Audit Utama (KAM)</b> mengingat ketidakpastian estimasi yang tinggi.
            </div>
          </div>
        </div>
      </Sect>

      <Sect n="5" title="Referensi Silang — Aliran Angka">
        <div className="row gap8" style={{ flexWrap: 'wrap' }}>
          {[
            { lbl: 'PSAK 46 · Pajak Tangguhan', id: 'psak46' }, { lbl: 'PSAK 68 · Nilai Wajar', id: 'psak68' },
            { lbl: 'PSAK 1 · Penyajian LK', id: 'psak1' }, { lbl: 'FS Generator', id: 'fsgen' },
            { lbl: 'SAD Ledger', id: 'sad' }, { lbl: 'Opini & KAM', id: 'opinion' },
          ].map(x => (
            <button key={x.id} onClick={() => nav(x.id, { from: 'psak117' })} className="row ac gap6" style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--surface)', cursor: 'pointer', fontSize: 11.5, fontWeight: 600, color: 'var(--ink-2)' }}>
              <I.link2 size={12} style={{ color: 'var(--blue)' }} />{x.lbl}
            </button>
          ))}
        </div>
      </Sect>

      <div className="row gap20" style={{ marginTop: 26, gap: 26 }}>
        <Sign lbl="Disusun oleh" p={so.preparer} accent="var(--blue)" />
        <Sign lbl="Direviu oleh" p={so.reviewer} accent="var(--amber)" />
        <Sign lbl="Disetujui" p={so.approver} accent="var(--green)" />
      </div>
      <div className="tiny muted" style={{ marginTop: 16, paddingTop: 10, borderTop: '1px solid var(--line-soft)', lineHeight: 1.5 }}>
        WP A-1 · dokumentasi audit SA 230. Angka ditarik dari satu sumber kebenaran <span className="mono">AMS_CANON.psak117()</span> — konsisten dengan seluruh tab modul. Status & jejak tersimpan otomatis.
      </div>
    </div>
  );
}

function PSAK117View() {
  const { fmt } = AMS;
  const nav = useNav();
  const loader = window.loadLS || ((k, d) => d);
  const canon = AMS_CANON;
  const p117 = useMemoP117(() => (canon as any).psak117(), []);

  const [tab, setTab] = useStateP117(() => loader('ams.psak117.tab', 'model'));
  const [done, setDone] = useStateP117(() => loader('ams.psak117.done', {}));
  React.useEffect(() => { try { localStorage.setItem('ams.psak117.tab', JSON.stringify(tab)); } catch (e) {} }, [tab]);
  React.useEffect(() => { try { localStorage.setItem('ams.psak117.done', JSON.stringify(done)); } catch (e) {} }, [done]);

  const rp = (x) => 'Rp ' + fmt(Math.round(x));
  const toggle = (id) => setDone(m => ({ ...m, [id]: !m[id] }));
  const doneCount = p117.proc.filter((p, i) => done[p.ref + i]).length;
  const score = Math.round(doneCount / p117.proc.length * 100);

  const liabSegs = [
    { label: 'LRC', value: p117.lrcTotal, color: '#005085' },
    { label: 'LIC', value: p117.licTotal, color: '#0a6b73' },
  ];

  const TABS = [
    { id: 'model', label: 'Model Pengukuran' },
    { id: 'blok', label: 'Blok Pengukuran' },
    { id: 'csm', label: 'CSM & Risiko' },
    { id: 'transisi', label: 'Transisi' },
    { id: 'hasil', label: 'Hasil & Sensitivitas' },
    { id: 'audit', label: 'Audit · SA 540' },
    { id: 'kk', label: 'Kertas Kerja A-1' },
  ];

  return (
    <>
      <SubBar moduleId="psak117" right={
        <div className="row gap8 ac">
          <Badge kind="blue">PSAK 117 · IFRS 17</Badge>
          <Btn sm onClick={() => nav('psak68', { from: 'psak117' })}><I.layers size={13} /> Nilai Wajar Pendasar</Btn>
          <Btn sm onClick={() => nav('psak46', { from: 'psak117' })}><I.receipt size={13} /> Dampak Pajak Tangguhan</Btn>
          <Btn sm onClick={() => setTab('kk')}><I.report size={13} /> Kertas Kerja A-1</Btn>
          <Btn sm variant="primary" onClick={() => nav('opinion', { from: 'psak117' })}><I.gavel size={14} /> Kandidat KAM</Btn>
        </div>
      } />
      <div className="view-scroll">
        <div className="view-pad" style={{ display: 'grid', gap: 12 }}>

          {/* summary cards */}
          <div className="grid" style={{ gridTemplateColumns: 'repeat(5,1fr)', gap: 10 }}>
            <P117Card value={rp(p117.liabTotal) + ' jt'} label="Total Liabilitas Kontrak Asuransi" sub="LRC + LIC" accent="var(--navy)" />
            <P117Card value={rp(p117.csmTotal) + ' jt'} label="Marjin Jasa Kontraktual (CSM)" sub="laba belum diakui" accent="var(--blue)" />
            <P117Card value={rp(p117.raTotal) + ' jt'} label="Penyesuaian Risiko" sub={'Persentil ke-' + p117.raConfidence} accent="var(--teal)" />
            <P117Card value={rp(p117.serviceResult) + ' jt'} label="Hasil Jasa Asuransi" sub="insurance service result" accent="var(--green)" />
            <P117Card value={rp(p117.lcTotal) + ' jt'} label="Komponen Kerugian (Onerous)" sub="diakui segera (¶47)" accent={p117.lcTotal > 0 ? 'var(--red)' : 'var(--green)'} />
          </div>

          {/* tabs */}
          <div className="row ac jb" style={{ flexWrap: 'wrap', gap: 8 }}>
            <div className="seg" style={{ width: 'fit-content', flexWrap: 'wrap' }}>
              {TABS.map(t => <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>{t.label}</button>)}
            </div>
            <span className="tiny muted">Satu sumber: <span className="mono">AMS_CANON.psak117()</span></span>
          </div>

          {/* ================= TAB · MODEL PENGUKURAN ================= */}
          {tab === 'model' && (
            <div className="grid" style={{ gridTemplateColumns: '1fr 332px', gap: 12, alignItems: 'start' }}>
              <div className="grid" style={{ gap: 12 }}>
                <Panel noBody>
                  <div className="panel-h"><h3>Pemilihan Model Pengukuran per Portofolio</h3><span className="sub mono">¶29 · ¶53 · ¶B101</span><div style={{ flex: 1 }} /><span className="tiny muted">Rp juta</span></div>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="dtbl" style={{ width: '100%' }}>
                      <thead><tr>
                        <th style={{ textAlign: 'left' }}>Portofolio</th>
                        <th style={{ textAlign: 'center', width: 58 }}>Model</th>
                        <th style={{ textAlign: 'left', width: 130 }}>Durasi</th>
                        <th style={{ textAlign: 'right', width: 96 }}>LRC</th>
                      </tr></thead>
                      <tbody>
                        {p117.ports.map(p => (
                          <tr key={p.id}>
                            <td>
                              <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.3 }}>{p.name}</div>
                              <div className="tiny muted" style={{ lineHeight: 1.4 }}>{p.note}</div>
                            </td>
                            <td style={{ textAlign: 'center' }}><Badge kind={P117_MODEL_META[p.model].kind}>{p.model}</Badge></td>
                            <td className="tiny" style={{ color: 'var(--ink-2)' }}>{p.dur}<div className="tiny muted">{p.onset}</div></td>
                            <td className="mono" style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(p.lrc)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="tiny muted" style={{ padding: '9px 14px 12px', lineHeight: 1.5 }}>
                    Setiap kelompok kontrak diukur dengan model yang sesuai karakteristiknya. <b>VFA</b> wajib untuk kontrak partisipasi langsung (unit-linked); <b>PAA</b> hanya boleh untuk perlindungan jangka pendek; selebihnya <b>GMM</b>.
                  </div>
                </Panel>

                <Panel noBody>
                  <div className="panel-h"><h3>Kriteria Eligibilitas Model</h3><span className="sub mono">pohon keputusan PSAK 117</span></div>
                  <div style={{ padding: '4px 14px 12px', display: 'grid', gap: 0 }}>
                    {p117.modelMix.map((m, i) => (
                      <div key={m.model} style={{ padding: '11px 0', borderBottom: i < 2 ? '1px solid var(--line-soft)' : 0 }}>
                        <div className="row ac gap8" style={{ marginBottom: 4 }}>
                          <Badge kind={P117_MODEL_META[m.model].kind}>{m.model}</Badge>
                          <span style={{ fontSize: 12.5, fontWeight: 700 }}>{m.label}</span>
                          <span className="tiny muted">{m.sub}</span>
                          <span style={{ flex: 1 }} />
                          <span className="tiny muted">{m.n} portofolio · {fmt(m.lrc)} jt</span>
                        </div>
                        <div className="tiny" style={{ color: 'var(--ink-2)', lineHeight: 1.5 }}>{m.crit}</div>
                      </div>
                    ))}
                  </div>
                </Panel>
              </div>

              <div className="grid" style={{ gap: 12 }}>
                <Panel title="Komposisi LRC per Model" sub="bauran model pengukuran">
                  <div className="row gap12 ac">
                    <Donut segments={p117.modelMix.map(m => ({ label: m.model, value: m.lrc, color: P117_MODEL_META[m.model].color }))} size={104} thickness={15}
                      center={<><div className="mono" style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>{fmt(Math.round(p117.lrcTotal / 1000))}rb</div><div className="tiny muted">jt</div></>} />
                    <div style={{ flex: 1 }}>
                      {p117.modelMix.map(m => (
                        <div key={m.model} className="row jb ac" style={{ padding: '4px 0' }}>
                          <span className="row ac gap6"><span style={{ width: 9, height: 9, borderRadius: 2, background: P117_MODEL_META[m.model].color }} /><span style={{ fontSize: 12, fontWeight: 600 }}>{m.model}</span></span>
                          <span className="mono tiny" style={{ fontWeight: 700 }}>{fmt(m.lrc)} jt</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Panel>

                <Panel title="PSAK 117 vs PSAK 62 (lama)" sub="perubahan kunci">
                  <div style={{ display: 'grid', gap: 0 }}>
                    {p117.key.map((a, i) => (
                      <div key={i} style={{ padding: '8px 0', borderBottom: i < p117.key.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
                        <div className="row ac jb"><span style={{ fontSize: 12, fontWeight: 600 }}>{a.k}</span><span className="mono" style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy)' }}>{a.v}</span></div>
                        <div className="tiny muted" style={{ lineHeight: 1.4, marginTop: 1 }}>{a.note}</div>
                      </div>
                    ))}
                  </div>
                </Panel>
              </div>
            </div>
          )}

          {/* ================= TAB · BLOK PENGUKURAN ================= */}
          {tab === 'blok' && (
            <div className="grid" style={{ gridTemplateColumns: '1.55fr 1fr', gap: 12, alignItems: 'start' }}>
              <Panel noBody>
                <div className="panel-h"><h3>Blok Pengukuran — Liabilitas Sisa Perlindungan (LRC)</h3><span className="sub mono">FCF + RA + CSM</span></div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="dtbl" style={{ width: '100%' }}>
                    <thead><tr>
                      <th style={{ textAlign: 'left' }}>Portofolio</th>
                      <th style={{ textAlign: 'right', width: 92 }}>Arus Kas Pemenuhan</th>
                      <th style={{ textAlign: 'right', width: 72 }}>Penyes. Risiko</th>
                      <th style={{ textAlign: 'right', width: 80 }}>CSM</th>
                      <th style={{ textAlign: 'right', width: 96 }}>LRC</th>
                    </tr></thead>
                    <tbody>
                      {p117.ports.map(p => (
                        <tr key={p.id}>
                          <td style={{ fontWeight: 600, fontSize: 12 }}>{p.name}{p.lc ? <span className="mono tiny" style={{ color: 'var(--red)', marginLeft: 6 }}>LC {fmt(p.lc)}</span> : null}</td>
                          <td className="mono" style={{ textAlign: 'right' }}>{fmt(p.fcf)}</td>
                          <td className="mono" style={{ textAlign: 'right' }}>{p.ra ? fmt(p.ra) : '—'}</td>
                          <td className="mono" style={{ textAlign: 'right' }}>{p.csm != null ? fmt(p.csm) : <span className="muted">n/a</span>}</td>
                          <td className="mono" style={{ textAlign: 'right', fontWeight: 700, color: 'var(--blue)' }}>{fmt(p.lrc)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: 'var(--surface-2)' }}>
                        <td style={{ fontWeight: 700, color: 'var(--navy)' }}>TOTAL LRC</td>
                        <td className="mono" style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(p117.fcfTotal)}</td>
                        <td className="mono" style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(p117.raLrc)}</td>
                        <td className="mono" style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(p117.csmTotal)}</td>
                        <td className="mono" style={{ textAlign: 'right', fontWeight: 800, color: 'var(--navy)' }}>{fmt(p117.lrcTotal)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <div className="tiny muted" style={{ padding: '9px 14px 12px', lineHeight: 1.5 }}>
                  <b>FCF</b> = estimasi nilai kini arus kas masa depan (premi, klaim, manfaat & beban) berbobot probabilitas. <b>RA</b> = kompensasi ketidakpastian risiko non-keuangan. <b>CSM</b> = laba belum diakui yang dilepas seiring jasa. PAA tidak memiliki CSM eksplisit; komponen kerugian (LC) diakui segera.
                </div>
              </Panel>

              <div className="grid" style={{ gap: 12 }}>
                <Panel noBody>
                  <div className="panel-h"><h3>Total Liabilitas Kontrak Asuransi</h3><span className="sub mono">LRC + LIC</span></div>
                  <div className="row gap12 ac" style={{ padding: '12px 14px' }}>
                    <Donut segments={liabSegs} size={104} thickness={15}
                      center={<><div className="mono" style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--navy)' }}>{fmt(Math.round(p117.liabTotal / 1000))}rb</div><div className="tiny muted">jt</div></>} />
                    <div style={{ flex: 1, display: 'grid', gap: 7 }}>
                      <P117Kv label="Liab. Sisa Perlindungan (LRC)" v={fmt(p117.lrcTotal)} />
                      <P117Kv label="Liab. Klaim Terjadi (LIC)" v={fmt(p117.licTotal)} />
                      <div style={{ borderTop: '1px solid var(--line-soft)', paddingTop: 7 }}>
                        <P117Kv label="Total liabilitas" v={fmt(p117.liabTotal) + ' jt'} strong />
                      </div>
                    </div>
                  </div>
                </Panel>

                <Panel title="Liabilitas Klaim Terjadi (LIC)" sub="klaim sudah terjadi & dilaporkan/IBNR">
                  <div style={{ display: 'grid', gap: 8 }}>
                    <P117Kv label="Estimasi nilai kini klaim" v={fmt(p117.lic.pv) + ' jt'} />
                    <P117Kv label="Penyesuaian risiko klaim" v={fmt(p117.lic.ra) + ' jt'} accent="var(--teal)" />
                    <div style={{ borderTop: '1px solid var(--line-soft)', paddingTop: 8 }}>
                      <P117Kv label="LIC total" v={fmt(p117.licTotal) + ' jt'} strong />
                    </div>
                  </div>
                  <div className="tiny muted" style={{ marginTop: 9, lineHeight: 1.5 }}>LIC mencakup klaim dilaporkan & <b>IBNR</b> (incurred but not reported). Tidak memuat CSM karena jasa telah diberikan; diukur pada FCF + RA.</div>
                </Panel>
              </div>
            </div>
          )}

          {/* ================= TAB · CSM & RISIKO ================= */}
          {tab === 'csm' && (
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }}>
              <Panel noBody>
                <div className="panel-h"><h3>Mutasi Marjin Jasa Kontraktual (CSM)</h3><span className="sub mono">¶44 · roll-forward</span><div style={{ flex: 1 }} /><span className="tiny muted">Rp juta</span></div>
                <div>
                  {p117.csmRoll.map((r, i) => (
                    <div key={i} className="row ac gap10" style={{ padding: '9px 14px', borderBottom: '1px solid var(--line-soft)', background: r.tot ? 'var(--surface-2)' : 'transparent' }}>
                      <div style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: r.tot ? 700 : 500, color: r.tot ? 'var(--navy)' : 'var(--ink)' }}>{r.t}</div>
                      {!r.tot && r.kind ? <Badge kind={r.kind}>{r.k === 'new' ? 'baru' : r.k === 'accr' ? 'akresi' : r.k === 'chg' ? 'estimasi' : 'release'}</Badge> : <span style={{ width: 54 }} />}
                      <div className="mono" style={{ width: 82, textAlign: 'right', fontWeight: 700, color: r.v < 0 ? 'var(--red)' : r.tot ? 'var(--navy)' : 'var(--green)' }}>{r.v < 0 ? '(' + fmt(-r.v) + ')' : (r.tot ? '' : '+') + fmt(r.v)}</div>
                    </div>
                  ))}
                </div>
                <div className="tiny muted" style={{ padding: '10px 14px 12px', lineHeight: 1.5 }}>
                  CSM menyerap perubahan estimasi terkait <b>jasa masa depan</b> sehingga tidak ada laba/rugi seketika. Pelepasan ke L/R didasarkan pada <b>unit perlindungan</b> periode berjalan. Saldo akhir {p117.csmTie ? <b style={{ color: 'var(--green)' }}>menutup ke total portofolio</b> : <b style={{ color: 'var(--red)' }}>tidak menutup</b>}.
                </div>
              </Panel>

              <div className="grid" style={{ gap: 12 }}>
                <Panel noBody>
                  <div className="panel-h"><h3>Mutasi Penyesuaian Risiko (RA)</h3><span className="sub mono">risiko non-keuangan</span><div style={{ flex: 1 }} /><span className="tiny muted">Rp juta</span></div>
                  <div>
                    {p117.raRoll.map((r, i) => (
                      <div key={i} className="row ac gap10" style={{ padding: '9px 14px', borderBottom: '1px solid var(--line-soft)', background: r.tot ? 'var(--surface-2)' : 'transparent' }}>
                        <div style={{ flex: 1, minWidth: 0, fontSize: 12, fontWeight: r.tot ? 700 : 500, color: r.tot ? 'var(--navy)' : 'var(--ink)' }}>{r.t}</div>
                        <div className="mono" style={{ width: 76, textAlign: 'right', fontWeight: 700, color: r.v < 0 ? 'var(--red)' : r.tot ? 'var(--navy)' : 'var(--green)' }}>{r.v < 0 ? '(' + fmt(-r.v) + ')' : (r.tot ? '' : '+') + fmt(r.v)}</div>
                      </div>
                    ))}
                  </div>
                  <div className="panel" style={{ margin: '11px 14px 12px', padding: '9px 11px', background: 'var(--teal-bg)', borderColor: 'transparent' }}>
                    <div className="row gap8"><span style={{ color: 'var(--teal)' }}><I.target size={15} /></span><span style={{ fontSize: 11.5, lineHeight: 1.5 }}>Tingkat keyakinan RA ditetapkan pada <b>persentil ke-{p117.raConfidence}</b> dari distribusi arus kas — diungkapkan sesuai ¶119.</span></div>
                  </div>
                </Panel>

                <Panel title="Unit Perlindungan — Dasar Pelepasan CSM" sub="¶B119 · coverage units">
                  <div style={{ display: 'grid', gap: 7 }}>
                    {p117.cuPorts.map(p => {
                      const w = p.cu / p117.cuSum;
                      return (
                        <div key={p.id}>
                          <div className="row jb ac" style={{ marginBottom: 3 }}>
                            <span style={{ fontSize: 12, fontWeight: 600 }}>{p.name.split(' (')[0]}</span>
                            <span className="mono tiny" style={{ fontWeight: 700, color: 'var(--navy)' }}>{(w * 100).toFixed(0)}%</span>
                          </div>
                          <div style={{ height: 7, borderRadius: 4, background: 'var(--surface-3)', overflow: 'hidden' }}><span style={{ display: 'block', height: '100%', width: (w * 100) + '%', background: P117_MODEL_META[p.model].color, borderRadius: 4 }} /></div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="tiny muted" style={{ marginTop: 9, lineHeight: 1.5 }}>Unit perlindungan mencerminkan kuantitas jasa & durasi tersisa per kelompok. Bobot ini menentukan porsi CSM <b>{fmt(Math.abs(p117.csmRoll.find(r => r.k === 'rel').v))} jt</b> yang dilepas ke laba rugi periode berjalan.</div>
                </Panel>
              </div>
            </div>
          )}

          {/* ================= TAB · TRANSISI ================= */}
          {tab === 'transisi' && (
            <div className="grid" style={{ gridTemplateColumns: '1fr 332px', gap: 12, alignItems: 'start' }}>
              <Panel noBody>
                <div className="panel-h"><h3>Pendekatan Transisi per Portofolio</h3><span className="sub mono">DOT {p117.dot} · ¶C3–C24</span></div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="dtbl" style={{ width: '100%' }}>
                    <thead><tr>
                      <th style={{ textAlign: 'left' }}>Portofolio</th>
                      <th style={{ textAlign: 'center', width: 56 }}>Model</th>
                      <th style={{ textAlign: 'left', width: 200 }}>Pendekatan Transisi</th>
                    </tr></thead>
                    <tbody>
                      {p117.ports.map(p => {
                        const tr = p117.transition[p.transition];
                        return (
                          <tr key={p.id}>
                            <td style={{ fontWeight: 600, fontSize: 12 }}>{p.name}</td>
                            <td style={{ textAlign: 'center' }}><Badge kind={P117_MODEL_META[p.model].kind}>{p.model}</Badge></td>
                            <td>
                              <div className="row ac gap6"><Badge kind={tr.short === 'FRA' ? 'green' : tr.short === 'MRA' ? 'amber' : 'purple'}>{tr.short}</Badge><span className="tiny" style={{ fontWeight: 600 }}>{tr.label}</span></div>
                              <div className="tiny muted mono">{tr.ref}</div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="tiny muted" style={{ padding: '9px 14px 12px', lineHeight: 1.5 }}>
                  FRA wajib kecuali tidak praktis. Untuk portofolio lama (data historis tak lengkap) digunakan MRA; bila pun MRA tidak praktis, digunakan FVA dengan CSM transisi = nilai wajar − FCF pada tanggal transisi.
                </div>
              </Panel>

              <div className="grid" style={{ gap: 12 }}>
                {Object.keys(p117.transition).map(key => {
                  const tr = p117.transition[key];
                  const n = p117.ports.filter(p => p.transition === key).length;
                  return (
                    <Panel key={key} title={tr.label} sub={tr.short + ' · ' + tr.ref}>
                      <div className="tiny" style={{ color: 'var(--ink-2)', lineHeight: 1.55 }}>{tr.desc}</div>
                      <div className="row ac jb" style={{ marginTop: 9, paddingTop: 8, borderTop: '1px solid var(--line-soft)' }}>
                        <span className="tiny muted">Diterapkan pada</span>
                        <span className="mono tiny" style={{ fontWeight: 700, color: 'var(--navy)' }}>{n} portofolio</span>
                      </div>
                    </Panel>
                  );
                })}
              </div>
            </div>
          )}

          {/* ================= TAB · HASIL & SENSITIVITAS ================= */}
          {tab === 'hasil' && (
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }}>
              <Panel noBody>
                <div className="panel-h"><h3>Hasil Jasa & Keuangan Asuransi</h3><span className="sub mono">¶80–86 · L/R</span><div style={{ flex: 1 }} /><span className="tiny muted">Rp juta</span></div>
                <div>
                  {p117.pnl.map((r, i) => (
                    <div key={i} className="row ac gap10" style={{ padding: '9px 14px', borderBottom: '1px solid var(--line-soft)', background: r.tot ? 'var(--surface-2)' : 'transparent' }}>
                      <div style={{ flex: 1, minWidth: 0, fontSize: 12, fontWeight: r.tot ? 700 : 500, color: r.tot ? 'var(--navy)' : 'var(--ink)' }}>{r.t}</div>
                      <div className="mono" style={{ width: 82, textAlign: 'right', fontWeight: 700, color: r.v < 0 ? 'var(--red)' : r.tot ? 'var(--navy)' : 'var(--green)' }}>{r.v < 0 ? '(' + fmt(-r.v) + ')' : fmt(r.v)}</div>
                    </div>
                  ))}
                </div>
                <div className="tiny muted" style={{ padding: '10px 14px 12px', lineHeight: 1.5 }}>
                  PSAK 117 memisahkan <b>hasil jasa asuransi</b> (underwriting) dari <b>hasil keuangan asuransi</b> (efek diskonto & imbal hasil) — meningkatkan komparabilitas vs penyajian PSAK 62.
                </div>
              </Panel>

              <Panel noBody>
                <div className="panel-h"><h3>Analisis Sensitivitas</h3><span className="sub mono">SA 540 · dampak ke CSM & ekuitas</span></div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="dtbl" style={{ width: '100%' }}>
                    <thead><tr>
                      <th style={{ textAlign: 'left' }}>Pemicu</th>
                      <th style={{ textAlign: 'right', width: 78 }}>Δ CSM</th>
                      <th style={{ textAlign: 'right', width: 84 }}>Δ Ekuitas</th>
                    </tr></thead>
                    <tbody>
                      {p117.sens.map((s, i) => (
                        <tr key={i}>
                          <td>
                            <div style={{ fontSize: 12, fontWeight: 600 }}>{s.driver}</div>
                            <div className="tiny muted" style={{ lineHeight: 1.4 }}>{s.note}</div>
                          </td>
                          <td className="mono" style={{ textAlign: 'right', fontWeight: 700, color: s.dCsm < 0 ? 'var(--red)' : s.dCsm > 0 ? 'var(--green)' : 'var(--ink-4)' }}>{s.dCsm === 0 ? '—' : (s.dCsm > 0 ? '+' : '(') + fmt(Math.abs(s.dCsm)) + (s.dCsm < 0 ? ')' : '')}</td>
                          <td className="mono" style={{ textAlign: 'right', fontWeight: 700, color: s.dEquity < 0 ? 'var(--red)' : 'var(--green)' }}>{s.dEquity > 0 ? '+' : '('}{fmt(Math.abs(s.dEquity))}{s.dEquity < 0 ? ')' : ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="tiny muted" style={{ padding: '9px 14px 12px', lineHeight: 1.5 }}>
                  Sensitivitas tertinggi pada <b>tingkat diskonto</b> & <b>asumsi mortalita/morbidita</b>. CSM meredam efek perubahan asumsi terkait jasa masa depan sebelum membebani laba rugi — area pertimbangan signifikan (kandidat KAM).
                </div>
              </Panel>
            </div>
          )}

          {/* ================= TAB · AUDIT SA 540 ================= */}
          {tab === 'audit' && (
            <div className="grid" style={{ gridTemplateColumns: '1fr 332px', gap: 12, alignItems: 'start' }}>
              <Panel noBody>
                <div className="panel-h"><h3>Prosedur Audit — Estimasi Aktuaria (SA 540 · SA 620)</h3><div style={{ flex: 1 }} /><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--navy)' }}>{doneCount}/{p117.proc.length}</span></div>
                <div className="row gap8" style={{ padding: '10px 14px', alignItems: 'flex-start', background: 'var(--blue-050)' }}>
                  <span style={{ color: 'var(--blue)', marginTop: 1 }}><I.target size={15} /></span>
                  <div style={{ fontSize: 11.5, lineHeight: 1.5 }}>Valuasi kontrak asuransi adalah <b>estimasi akuntansi berketidakpastian tinggi</b> (R-A1). Prosedur menguji metodologi model, asumsi aktuaria, kurva diskonto, penyesuaian risiko, gulir CSM & pekerjaan Aktuaris.</div>
                </div>
                <div>
                  {p117.proc.map((p, i) => {
                    const key = p.ref + i;
                    const isOn = !!done[key];
                    return (
                      <label key={key} className="row gap10" style={{ padding: '9px 14px', cursor: 'pointer', alignItems: 'flex-start', borderBottom: i < p117.proc.length - 1 ? '1px solid var(--line-soft)' : 0 }} onClick={() => toggle(key)}>
                        <span style={{ flex: '0 0 16px', width: 16, height: 16, borderRadius: 4, marginTop: 1, border: '1.5px solid ' + (isOn ? 'var(--green)' : 'var(--line-strong)'), background: isOn ? 'var(--green)' : '#fff', display: 'grid', placeItems: 'center' }}>{isOn && <I.check size={11} style={{ color: '#fff' }} />}</span>
                        <span className="mono tiny" style={{ fontWeight: 700, color: 'var(--navy)', width: 92, flex: '0 0 92px', marginTop: 1 }}>{p.ref}</span>
                        <span style={{ fontSize: 12, lineHeight: 1.4, color: isOn ? 'var(--ink-3)' : 'var(--ink)', textDecoration: isOn ? 'line-through' : 'none' }}>{p.t}</span>
                      </label>
                    );
                  })}
                </div>
              </Panel>

              <div className="grid" style={{ gap: 12 }}>
                <Panel noBody>
                  <div style={{ background: 'linear-gradient(120deg,#013a52,#005085)', color: '#fff', padding: '14px 16px' }}>
                    <div className="tiny upper" style={{ color: '#bcd6e4', letterSpacing: '.05em', marginBottom: 8 }}>Kesimpulan Audit — Estimasi Aktuaria</div>
                    <div className="row ac gap12">
                      <div style={{ fontSize: 34, fontWeight: 800, lineHeight: 1, fontFamily: 'JetBrains Mono, monospace' }}>{score}<span style={{ fontSize: 18 }}>%</span></div>
                      <div style={{ flex: 1 }}>
                        <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,.18)', overflow: 'hidden' }}><span style={{ display: 'block', height: '100%', width: score + '%', background: score === 100 ? '#4ade80' : '#7cc6ff', borderRadius: 4, transition: '.3s' }} /></div>
                        <div className="tiny" style={{ color: '#bcd6e4', marginTop: 6 }}>{doneCount}/{p117.proc.length} prosedur audit selesai</div>
                      </div>
                    </div>
                  </div>
                  <div style={{ padding: 14 }}>
                    <div className="panel" style={{ padding: '10px 12px', background: 'var(--teal-bg)', borderColor: 'transparent' }}>
                      <div className="row gap8" style={{ alignItems: 'flex-start' }}>
                        <span style={{ color: 'var(--teal)', marginTop: 1 }}><I.expert size={15} /></span>
                        <div style={{ fontSize: 12, lineHeight: 1.5 }}>Valuasi bergantung pada <b>pekerjaan Aktuaris</b>. Auditor mengevaluasi kompetensi, objektivitas & kecukupan bukti pakar sesuai <b>SA 620</b> sebelum menyimpulkan.</div>
                      </div>
                    </div>
                    <div className="row gap8" style={{ marginTop: 12 }}>
                      <Btn sm variant="primary" style={{ flex: 1 }} onClick={() => nav('opinion', { from: 'psak117' })}><I.gavel size={14} /> Kandidat KAM</Btn>
                      <Btn sm style={{ flex: 1 }} onClick={() => nav('evidence', { from: 'psak117' })}><I.search2 size={14} /> Evaluasi Bukti</Btn>
                    </div>
                  </div>
                </Panel>

                <Panel noBody>
                  <div className="panel-h"><h3>Keterkaitan Kertas Kerja</h3><span className="sub mono">lineage data</span></div>
                  <div className="row ac gap6" style={{ padding: '9px 14px 4px' }}><I.arrowRight size={13} style={{ color: 'var(--blue)' }} /><span className="tiny upper" style={{ fontWeight: 700, letterSpacing: '.04em', color: 'var(--ink-3)' }}>Hulu — sumber data</span></div>
                  <div style={{ display: 'grid', gap: 6, padding: '2px 12px 10px' }}>
                    {p117.upstream.map(m => { const IconC = I[m.ic] || I.doc; return (
                      <button key={m.id} onClick={() => nav(m.id, { from: 'psak117' })} className="row ac gap9" style={{ padding: '8px 10px', borderRadius: 7, border: '1px solid var(--line)', borderLeft: '3px solid var(--blue)', background: 'var(--surface)', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                        <span style={{ color: 'var(--blue)', flex: '0 0 auto' }}><IconC size={15} /></span>
                        <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12, fontWeight: 600 }}>{m.lbl}</div><div className="tiny muted" style={{ lineHeight: 1.35 }}>{m.rel}</div></div>
                        <I.arrowRight size={13} style={{ color: 'var(--ink-4)', flex: '0 0 auto' }} />
                      </button>
                    ); })}
                  </div>
                  <div className="row ac gap6" style={{ padding: '4px 14px 4px', borderTop: '1px solid var(--line-soft)' }}><I.arrowRight size={13} style={{ color: 'var(--green)' }} /><span className="tiny upper" style={{ fontWeight: 700, letterSpacing: '.04em', color: 'var(--ink-3)' }}>Hilir — pengguna angka</span></div>
                  <div style={{ display: 'grid', gap: 6, padding: '2px 12px 12px' }}>
                    {p117.downstream.map(m => { const IconC = I[m.ic] || I.doc; return (
                      <button key={m.id} onClick={() => nav(m.id, { from: 'psak117' })} className="row ac gap9" style={{ padding: '8px 10px', borderRadius: 7, border: '1px solid var(--line)', borderLeft: '3px solid var(--green)', background: 'var(--surface)', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                        <span style={{ color: 'var(--green)', flex: '0 0 auto' }}><IconC size={15} /></span>
                        <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12, fontWeight: 600 }}>{m.lbl}</div><div className="tiny muted" style={{ lineHeight: 1.35 }}>{m.rel}</div></div>
                        <I.arrowRight size={13} style={{ color: 'var(--ink-4)', flex: '0 0 auto' }} />
                      </button>
                    ); })}
                  </div>
                </Panel>
              </div>
            </div>
          )}

          {/* ================= TAB · KERTAS KERJA A-1 ================= */}
          {tab === 'kk' && (
            <div style={{ paddingBottom: 6 }}>
              <P117WorkPaper p117={p117} fmt={fmt} rp={rp} nav={nav} />
            </div>
          )}

          <div className="tiny muted" style={{ padding: '0 2px 4px', lineHeight: 1.5 }}>
            Kertas kerja ini menelusuri kontrak asuransi <b>{p117.client.name}</b> ({p117.client.sector}) terhadap PSAK 117 (adopsi IFRS 17, efektif {p117.effective}) — dari pemilihan model pengukuran (GMM/PAA/VFA), blok pengukuran (FCF + RA + CSM → LRC) & LIC, mutasi CSM & penyesuaian risiko, transisi (FRA/MRA/FVA), hasil jasa asuransi & sensitivitas, hingga kesimpulan audit estimasi aktuaria (SA 540 · SA 620) & Kertas Kerja A-1. Seluruh angka ditarik dari satu sumber kebenaran (AMS_CANON.psak117). Tab & status tersimpan otomatis untuk jejak audit.
          </div>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { PSAK117View });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { PSAK117View };
