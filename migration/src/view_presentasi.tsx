/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { AMS_CANON } from './canon';
import { useFirm, useNav } from './contexts.jsx';
import { I } from './icons.jsx';
import { SubBar } from './shell.jsx';
import { Badge, Btn } from './ui.jsx';
import { ML_FINDINGS_SEED } from './view_final3';

/* ============================================================
   Asseris — Mode Presentasi Klien
   Alur slide tiga fase rapat dengan klien:
     01 · Rapat Pembukaan (kickoff)
     02 · Penyampaian Temuan
     03 · Pembahasan Hasil Akhir & Opini
   Semua figur ditarik HIDUP dari sumber kebenaran tunggal:
     · useFirm()  → klien & perikatan aktif
     · AMS_CANON.materiality / AMS.RISKS / AMS.PBC_REQUESTS / AMS.AJE
     · localStorage 'mgmtletter.findings.v2' (atau seed ML)
     · localStorage 'opinionDoc.<eng>' + AMSOpinion.OPINIONS
   Skala slide tetap 1280×720 → di-scale agar pas di layar (embed & layar penuh).
   ============================================================ */
const { useState: useStatePR, useEffect: useEffectPR, useMemo: useMemoPR, useRef: useRefPR, useCallback: useCallbackPR } = React;

/* ---------- palet per-fase ---------- */
const PR_PHASES = [
  { id: 'p1', no: '01', tag: 'Rapat Pembukaan',        sub: 'Kickoff Meeting',        color: '#005085', icon: 'flag' },
  { id: 'p2', no: '02', tag: 'Penyampaian Temuan',     sub: 'Findings Discussion',    color: '#9a6a00', icon: 'mail' },
  { id: 'p3', no: '03', tag: 'Pembahasan Hasil Akhir', sub: 'Closing & Opinion',      color: '#1f7a4d', icon: 'gavel' },
];
const PR_SEV = { Significant: { l: 'Signifikan', c: 'var(--red)', bg: 'var(--red-bg)' }, Deficiency: { l: 'Defisiensi', c: 'var(--amber)', bg: 'var(--amber-bg)' }, Observation: { l: 'Observasi', c: 'var(--blue)', bg: 'var(--blue-100)' } };

/* ---------- ambil data hidup ---------- */
function prLoadLS(key, fb) {
  try { const s = localStorage.getItem('ams.v1.' + key); return s != null ? JSON.parse(s) : fb; } catch (e) { return fb; }
}
function prData(firm) {
  const CANON: any = AMS_CANON || {};
  const eng = firm.activeEngagement || {};
  const client = firm.activeClient || {};
  const engId = eng.id || 'x';

  let mat = {};
  try { mat = CANON.materiality ? CANON.materiality({ engMateriality: eng.materiality }) : {}; } catch (e) { mat = {}; }

  const risks = ((AMS as any).RISKS || []).filter(r => r.inherent === 'Significant');
  const pbc = ((AMS as any).PBC_REQUESTS || []).filter(p => !eng.id || p.eng === eng.id);
  const pbcBy = pbc.reduce((m, p) => { m[p.status] = (m[p.status] || 0) + 1; return m; }, {});

  const seed = (typeof ML_FINDINGS_SEED !== 'undefined') ? ML_FINDINGS_SEED : [];
  const findings = prLoadLS('mgmtletter.findings.v2', seed) || seed;
  const finalF = findings.filter(f => f.stage === 'final');
  const finSummary = {
    total: findings.length,
    final: finalF.length,
    sig: finalF.filter(f => f.sev === 'Significant').length,
    def: finalF.filter(f => f.sev === 'Deficiency').length,
    obs: finalF.filter(f => f.sev === 'Observation').length,
    tuntas: findings.filter(f => f.stage === 'tuntas').length,
    diskusi: findings.filter(f => f.stage === 'diskusi' || f.stage === 'draft').length,
  };
  /* urut keparahan: Significant → Deficiency → Observation */
  const sevRank = { Significant: 0, Deficiency: 1, Observation: 2 };
  const finalSorted = [...finalF].sort((a, b) => (sevRank[a.sev] - sevRank[b.sev]));

  const opDoc = prLoadLS('opinionDoc.' + engId, null);
  const opType = opDoc?.type || 'unmodified';
  const OPN = (window.AMSOpinion && window.AMSOpinion.OPINIONS) || {};
  const op = OPN[opType] || { title: 'Wajar Tanpa Modifikasian', short: 'WTM', k: 'green' };
  const kamCount = (opDoc?.opts?.kam !== false && opType !== 'disclaimer') ? (opDoc?.kams?.length || 3) : 0;
  const opFinal = !!opDoc?.finalized;
  const reportDate = opDoc?.reportDate || '2026-03-14';

  const aje = AMS.AJE || [];
  const ajePosted = aje.filter(a => a.status === 'Posted');
  const ajeProposed = aje.filter(a => a.status !== 'Posted');

  const team = ((AMS as any).TEAM || []).slice(0, 6);

  return { AMS, eng, client, mat, risks, pbc, pbcBy, findings, finalSorted, finSummary, op, opType, kamCount, opFinal, reportDate, aje, ajePosted, ajeProposed, team };
}

const prRp = (n) => (AMS && AMS.rp) ? AMS.rp(n) : ('Rp ' + (n || 0).toLocaleString('id-ID'));
const prDate = (d) => { try { return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }); } catch (e) { return d; } };

/* ============================================================
   PRIMITIF SLIDE
   ============================================================ */
function PRSlide({ children, bg }: any) {
  return <div className="pr-slide" style={{ background: bg || '#fff' }}>{children}</div>;
}
function PRKicker({ phase }) {
  const Ico = (I && I[phase.icon]) || (() => null);
  return (
    <div className="pr-kicker" style={{ color: phase.color }}>
      <span className="pr-kicker-ico" style={{ background: phase.color }}><Ico size={17} /></span>
      <span className="pr-kicker-no">{phase.no}</span>
      <span className="pr-kicker-tag">{phase.tag}</span>
    </div>
  );
}
function PRFoot({ data, n, total }) {
  return (
    <div className="pr-foot">
      <span>{((AMS as any)?.FIRM?.name) || 'KAP'}</span>
      <span className="pr-foot-mid">{data.client?.name} · {data.eng?.fy}</span>
      <span className="pr-foot-pg">{String(n).padStart(2, '0')} / {String(total).padStart(2, '0')}</span>
    </div>
  );
}
function PRStat({ label, value, sub, color }: any) {
  return (
    <div className="pr-stat">
      <div className="pr-stat-v" style={{ color: color || 'var(--navy)' }}>{value}</div>
      <div className="pr-stat-l">{label}</div>
      {sub && <div className="pr-stat-s">{sub}</div>}
    </div>
  );
}

/* ============================================================
   SLIDE: SAMPUL & PEMBATAS FASE
   ============================================================ */
function PRCover({ data }) {
  return (
    <PRSlide bg="var(--navy)">
      <div className="pr-cover">
        <div className="pr-cover-top">
          <span className="pr-cover-firm">{((AMS as any)?.FIRM?.name) || 'KAP'}</span>
          <span className="pr-cover-lic">{((AMS as any)?.FIRM?.license) || ''}</span>
        </div>
        <div className="pr-cover-mid">
          <div className="pr-cover-eyebrow">Presentasi Klien · Audit Laporan Keuangan {data.eng?.fy}</div>
          <h1 className="pr-cover-title">{data.client?.name}</h1>
          <div className="pr-cover-sub">{data.client?.industry} · {data.client?.city}</div>
        </div>
        <div className="pr-cover-flow">
          {PR_PHASES.map(p => (
            <div key={p.id} className="pr-cover-flow-item">
              <span className="pr-cover-flow-no" style={{ color: '#fff', borderColor: p.color, background: p.color }}>{p.no}</span>
              <div>
                <div className="pr-cover-flow-tag">{p.tag}</div>
                <div className="pr-cover-flow-sub">{p.sub}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="pr-cover-foot">
          <span>{data.eng?.id} · {data.eng?.standard}</span>
          <span>Disusun oleh {data.eng?.partner}</span>
        </div>
      </div>
    </PRSlide>
  );
}
function PRSection({ phase, headline, points }) {
  const Ico = (I && I[phase.icon]) || (() => null);
  return (
    <PRSlide bg="var(--navy)">
      <div className="pr-section">
        <div className="pr-section-no" style={{ color: phase.color }}>{phase.no}</div>
        <div className="pr-section-body">
          <div className="pr-section-tag"><span className="pr-section-ico" style={{ background: phase.color }}><Ico size={20} /></span>{phase.sub}</div>
          <h2 className="pr-section-h">{headline}</h2>
          <ul className="pr-section-list">
            {points.map((p, i) => <li key={i}><span style={{ color: phase.color }}>—</span> {p}</li>)}
          </ul>
        </div>
      </div>
    </PRSlide>
  );
}

/* ============================================================
   FASE 1 — RAPAT PEMBUKAAN
   ============================================================ */
function PRScope({ data, n, total }) {
  const ph = PR_PHASES[0], e = data.eng;
  const rows = [
    ['Entitas', data.client?.name], ['Jenis Perikatan', e?.type], ['Periode', e?.fy + ' · berakhir 31 Des 2025'],
    ['Standar', e?.standard], ['Rekan Perikatan', e?.partner], ['Manajer Audit', e?.manager], ['Tenggat Laporan', prDate(e?.deadline)],
  ];
  return (
    <PRSlide>
      <div className="pr-pad">
        <PRKicker phase={ph} />
        <h2 className="pr-h">Ruang Lingkup & Tim Perikatan</h2>
        <p className="pr-lede">Kami mengaudit laporan keuangan {data.client?.name} untuk tahun buku {e?.fy} sesuai {e?.standard}. Berikut kesepakatan ruang lingkup dan tim yang menangani perikatan Anda.</p>
        <div className="pr-2col">
          <div className="pr-card">
            <div className="pr-card-h">Identitas Perikatan</div>
            <div className="pr-defs">
              {rows.map(([k, v]) => <div key={k} className="pr-def"><span>{k}</span><b>{v}</b></div>)}
            </div>
          </div>
          <div className="pr-card">
            <div className="pr-card-h">Tim Audit</div>
            <div className="pr-team">
              {data.team.map((t, i) => (
                <div key={i} className="pr-team-row">
                  <span className="pr-ava">{t.name.split(' ').map(w => w[0]).slice(0, 2).join('')}</span>
                  <div><div className="pr-team-n">{t.name}</div><div className="pr-team-r">{t.role}</div></div>
                </div>
              ))}
            </div>
            <div className="pr-progress-wrap">
              <div className="pr-progress-top"><span>Kemajuan perikatan</span><b>{e?.progress}%</b></div>
              <div className="pr-progress"><span style={{ width: (e?.progress || 0) + '%', background: ph.color }} /></div>
            </div>
          </div>
        </div>
      </div>
      <PRFoot data={data} n={n} total={total} />
    </PRSlide>
  );
}
function PRMateriality({ data, n, total }) {
  const ph = PR_PHASES[0], m = data.mat;
  return (
    <PRSlide>
      <div className="pr-pad">
        <PRKicker phase={ph} />
        <h2 className="pr-h">Materialitas & Pendekatan Audit</h2>
        <p className="pr-lede">Materialitas menetapkan ambang salah saji yang dapat memengaruhi keputusan pengguna laporan keuangan. Angka di bawah menjadi dasar luas pengujian kami.</p>
        <div className="pr-stat-row">
          <PRStat label="Materialitas Keseluruhan (OM)" value={prRp(m.omFull || 0)} sub={m.benchLabel ? (m.pct + '% · ' + m.benchLabel) : 'Basis benchmark'} color="var(--navy)" />
          <PRStat label="Materialitas Pelaksanaan (PM)" value={prRp(m.pmFull || 0)} sub={(m.pmPct || 0) + '% dari OM'} color="var(--blue)" />
          <PRStat label="Ambang Sepele (CTT)" value={prRp(m.cttFull || 0)} sub={(m.cttPct || 0) + '% dari OM'} color="var(--amber)" />
        </div>
        <div className="pr-2col" style={{ marginTop: 26 }}>
          <div className="pr-card">
            <div className="pr-card-h">Pendekatan Berbasis Risiko</div>
            <ul className="pr-bullets">
              <li>Audit dirancang mengikuti area dengan risiko salah saji material tertinggi.</li>
              <li>Salah saji teridentifikasi dievaluasi terhadap materialitas; di atas ambang sepele dicatat pada <b>Summary of Audit Differences (SAD)</b>.</li>
              <li>Prosedur diperluas pada area pendapatan, persediaan, dan estimasi (ECL).</li>
            </ul>
          </div>
          <div className="pr-card pr-card-soft">
            <div className="pr-card-h">Yang Diharapkan dari Manajemen</div>
            <ul className="pr-bullets">
              <li>Ketersediaan dokumen tepat waktu melalui Portal Klien (PBC).</li>
              <li>Akses ke personel kunci dan sistem akuntansi.</li>
              <li>Tanggapan tertulis atas temuan dan surat representasi pada finalisasi.</li>
            </ul>
          </div>
        </div>
      </div>
      <PRFoot data={data} n={n} total={total} />
    </PRSlide>
  );
}
function PRRisks({ data, n, total }) {
  const ph = PR_PHASES[0];
  return (
    <PRSlide>
      <div className="pr-pad">
        <PRKicker phase={ph} />
        <h2 className="pr-h">Area Berisiko Signifikan</h2>
        <p className="pr-lede">Kami memfokuskan upaya audit pada {data.risks.length} area berikut. Transparansi sejak awal membantu manajemen menyiapkan dukungan yang relevan.</p>
        <div className="pr-risk-grid">
          {data.risks.slice(0, 4).map((r, i) => (
            <div key={r.id} className="pr-risk">
              <div className="pr-risk-top">
                <span className="pr-risk-area">{r.area}</span>
                {r.fraud && <span className="pr-chip pr-chip-red">Risiko Kecurangan</span>}
                <span className="pr-chip">{r.assertion}</span>
              </div>
              <div className="pr-risk-desc">{r.desc}</div>
              <div className="pr-risk-resp"><span>Respons audit</span> {r.response}</div>
            </div>
          ))}
        </div>
      </div>
      <PRFoot data={data} n={n} total={total} />
    </PRSlide>
  );
}
function PRPbc({ data, n, total }) {
  const ph = PR_PHASES[0];
  const order = ['Diterima', 'Direviu', 'Diminta', 'Terlambat'];
  const labels = { Diterima: 'Diterima', Direviu: 'Direviu', Diminta: 'Menunggu', Terlambat: 'Terlambat' };
  const colors = { Diterima: 'var(--blue)', Direviu: 'var(--green)', Diminta: 'var(--ink-3)', Terlambat: 'var(--red)' };
  const cats = [...new Set(data.pbc.map(p => p.cat))];
  return (
    <PRSlide>
      <div className="pr-pad">
        <PRKicker phase={ph} />
        <h2 className="pr-h">Kebutuhan Data Klien (PBC)</h2>
        <p className="pr-lede">Seluruh permintaan dokumen dikelola di <b>Portal Klien</b> — terlacak, aman, dan terhubung langsung ke kertas kerja. Status saat ini:</p>
        <div className="pr-stat-row">
          {order.map(s => <PRStat key={s} label={labels[s]} value={data.pbcBy[s] || 0} color={colors[s]} />)}
          <PRStat label="Total Permintaan" value={data.pbc.length} color="var(--navy)" />
        </div>
        <div className="pr-card" style={{ marginTop: 26 }}>
          <div className="pr-card-h">Cakupan Permintaan</div>
          <div className="pr-cat-row">
            {cats.map(c => <span key={c} className="pr-cat">{c}</span>)}
          </div>
          <div className="pr-note" style={{ borderColor: ph.color }}>
            Item yang melewati tenggat akan ditandai otomatis dan diingatkan melalui portal. Mohon prioritaskan dokumen berstatus <b style={{ color: 'var(--red)' }}>Terlambat</b>.
          </div>
        </div>
      </div>
      <PRFoot data={data} n={n} total={total} />
    </PRSlide>
  );
}

/* ============================================================
   FASE 2 — PENYAMPAIAN TEMUAN
   ============================================================ */
function PRFindingsSummary({ data, n, total }) {
  const ph = PR_PHASES[1], s = data.finSummary;
  return (
    <PRSlide>
      <div className="pr-pad">
        <PRKicker phase={ph} />
        <h2 className="pr-h">Ringkasan Temuan Audit</h2>
        <p className="pr-lede">Dari {s.total} hal yang dibahas selama audit, {s.final} dicantumkan pada Surat Manajemen final. {s.tuntas} hal tuntas saat diskusi dan dikeluarkan dari surat.</p>
        <div className="pr-stat-row">
          <PRStat label="Defisiensi Signifikan" value={s.sig} sub="Wajib komunikasi TCWG (SA 265)" color="var(--red)" />
          <PRStat label="Defisiensi" value={s.def} sub="Perbaikan proses" color="var(--amber)" />
          <PRStat label="Observasi" value={s.obs} sub="Saran perbaikan" color="var(--blue)" />
          <PRStat label="Tuntas saat Diskusi" value={s.tuntas} sub="Dikeluarkan dari surat" color="var(--green)" />
        </div>
        <div className="pr-card" style={{ marginTop: 26 }}>
          <div className="pr-card-h">Cara Kami Menyampaikan</div>
          <div className="pr-flow3">
            {['Setiap temuan disusun: Kondisi → Sebab → Kriteria → Akibat → Rekomendasi', 'Dibahas terbuka; manajemen memberi tanggapan tertulis', 'Defisiensi signifikan dikomunikasikan resmi ke pihak tata kelola (TCWG)'].map((t, i) => (
              <div key={i} className="pr-flow3-item"><span className="pr-flow3-no" style={{ background: ph.color }}>{i + 1}</span>{t}</div>
            ))}
          </div>
        </div>
      </div>
      <PRFoot data={data} n={n} total={total} />
    </PRSlide>
  );
}
function PRFinding({ data, f, idx, count, n, total }) {
  const ph = PR_PHASES[1];
  const sev = PR_SEV[f.sev] || PR_SEV.Observation;
  return (
    <PRSlide>
      <div className="pr-pad">
        <div className="pr-finding-head">
          <PRKicker phase={ph} />
          <span className="pr-finding-count">Temuan {idx} dari {count}</span>
        </div>
        <div className="pr-finding-titlerow">
          <span className="pr-sev" style={{ color: sev.c, background: sev.bg }}>{sev.l}</span>
          <span className="pr-finding-area">{f.area} · {f.ref}</span>
        </div>
        <h2 className="pr-h pr-h-sm">{f.title}</h2>
        <div className="pr-finding-grid">
          <div className="pr-fblock">
            <div className="pr-fblock-h">Kondisi</div>
            <p>{f.cond}</p>
          </div>
          <div className="pr-fblock pr-fblock-accent" style={{ borderColor: ph.color }}>
            <div className="pr-fblock-h" style={{ color: ph.color }}>Rekomendasi</div>
            <p>{f.rec}</p>
          </div>
          <div className="pr-fblock pr-fblock-resp">
            <div className="pr-fblock-h">Tanggapan Manajemen · <span style={{ color: f.respStatus === 'Setuju' ? 'var(--green)' : 'var(--amber)' }}>{f.respStatus}</span></div>
            <p>{f.resp}</p>
            {(f.pic || f.target) && <div className="pr-fblock-meta">Penanggung jawab: <b>{f.pic}</b>{f.target && f.target !== '—' ? <> · Target: <b>{f.target}</b></> : null}</div>}
          </div>
        </div>
      </div>
      <PRFoot data={data} n={n} total={total} />
    </PRSlide>
  );
}

/* ============================================================
   FASE 3 — HASIL AKHIR & OPINI
   ============================================================ */
function PROpinion({ data, n, total }) {
  const ph = PR_PHASES[2];
  const kindCol = { green: 'var(--green)', amber: 'var(--amber)', red: 'var(--red)' }[data.op.k] || 'var(--green)';
  return (
    <PRSlide>
      <div className="pr-pad">
        <PRKicker phase={ph} />
        <h2 className="pr-h">Opini Audit</h2>
        <p className="pr-lede">Berdasarkan bukti audit yang cukup dan tepat, opini yang kami usulkan atas laporan keuangan {data.eng?.fy} adalah:</p>
        <div className="pr-opinion" style={{ borderColor: kindCol }}>
          <div className="pr-opinion-badge" style={{ background: kindCol }}>{data.op.short}</div>
          <div className="pr-opinion-body">
            <div className="pr-opinion-title">{data.op.title}</div>
            <div className="pr-opinion-meta">
              <span className={'pr-opinion-state ' + (data.opFinal ? 'is-final' : '')}>{data.opFinal ? '● Final — Ditandatangani' : '○ Draf — Menunggu Finalisasi'}</span>
              <span>Tanggal laporan: <b>{prDate(data.reportDate)}</b></span>
            </div>
          </div>
        </div>
        <div className="pr-stat-row" style={{ marginTop: 24 }}>
          <PRStat label="Hal Audit Utama (KAM)" value={data.kamCount} sub="Dikomunikasikan dalam laporan" color="var(--navy)" />
          <PRStat label="Standar Pelaporan" value="SA 700" sub="700 · 701 · 705 · 706" color="var(--blue)" />
          <PRStat label="Defisiensi Signifikan" value={data.finSummary.sig} sub="Disampaikan ke TCWG" color="var(--red)" />
        </div>
      </div>
      <PRFoot data={data} n={n} total={total} />
    </PRSlide>
  );
}
function PRAdjustments({ data, n, total }) {
  const ph = PR_PHASES[2];
  return (
    <PRSlide>
      <div className="pr-pad">
        <PRKicker phase={ph} />
        <h2 className="pr-h">Penyesuaian & Selisih Audit</h2>
        <p className="pr-lede">Penyesuaian yang telah disepakati tercermin pada laporan keuangan final. Selisih yang tidak dikoreksi dievaluasi terhadap materialitas pada SAD.</p>
        <div className="pr-stat-row">
          <PRStat label="Jurnal Disepakati (Posted)" value={data.ajePosted.length} sub="Tercermin di LK final" color="var(--green)" />
          <PRStat label="Penyesuaian Diusulkan" value={data.ajeProposed.length} sub="Dalam pembahasan / SAD" color="var(--amber)" />
          <PRStat label="Ambang Sepele (CTT)" value={prRp(data.mat.cttFull || 0)} color="var(--navy)" />
        </div>
        <div className="pr-card" style={{ marginTop: 24 }}>
          <div className="pr-card-h">Daftar Penyesuaian (AJE)</div>
          <table className="pr-table">
            <thead><tr><th>Ref</th><th>Uraian</th><th>Status</th><th className="pr-r">Nilai</th></tr></thead>
            <tbody>
              {data.aje.map(a => (
                <tr key={a.id}>
                  <td className="pr-mono">{a.id}</td>
                  <td>{a.desc}</td>
                  <td><span className="pr-pill" style={{ color: a.status === 'Posted' ? 'var(--green)' : 'var(--amber)', background: a.status === 'Posted' ? 'var(--green-bg)' : 'var(--amber-bg)' }}>{a.status === 'Posted' ? 'Disepakati' : 'Diusulkan'}</span></td>
                  <td className="pr-r pr-mono">{prRp(a.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <PRFoot data={data} n={n} total={total} />
    </PRSlide>
  );
}
function PRNext({ data, n, total }) {
  const ph = PR_PHASES[2];
  const steps = [
    ['Surat Representasi', 'Manajemen menandatangani surat representasi tertulis (SA 580) sebelum penerbitan laporan.'],
    ['Penerbitan Laporan', 'Laporan auditor independen diterbitkan pada ' + prDate(data.reportDate) + ' setelah seluruh prosedur finalisasi tuntas.'],
    ['Surat Manajemen', 'Surat Manajemen final memuat ' + data.finSummary.final + ' temuan beserta tanggapan dan rencana tindak lanjut.'],
    ['Tindak Lanjut', 'Pemantauan implementasi rekomendasi akan ditinjau pada perikatan periode berikutnya.'],
  ];
  return (
    <PRSlide bg="var(--navy)">
      <div className="pr-pad pr-next">
        <div className="pr-next-eyebrow" style={{ color: '#7fd0a8' }}>Penutup · Langkah Selanjutnya</div>
        <h2 className="pr-next-h">Terima kasih atas kerja sama Anda</h2>
        <div className="pr-next-grid">
          {steps.map(([t, d], i) => (
            <div key={i} className="pr-next-item">
              <span className="pr-next-no" style={{ borderColor: ph.color }}>{i + 1}</span>
              <div><div className="pr-next-t">{t}</div><div className="pr-next-d">{d}</div></div>
            </div>
          ))}
        </div>
        <div className="pr-next-foot">
          <span>{data.eng?.partner} · Rekan Perikatan</span>
          <span>{((AMS as any)?.FIRM?.name)} · {((AMS as any)?.FIRM?.license)}</span>
        </div>
      </div>
    </PRSlide>
  );
}

/* ============================================================
   PEMBANGUN DAFTAR SLIDE
   ============================================================ */
function prBuildSlides(data) {
  const list = [];
  const push = (key, phase, title, el) => list.push({ key, phase, title, el });
  push('cover', null, 'Sampul', (n, t) => <PRCover data={data} />);
  push('sec-p1', 'p1', 'Pembatas — Rapat Pembukaan', (n, t) => <PRSection phase={PR_PHASES[0]} headline="Menyepakati ruang lingkup, fokus risiko, dan kebutuhan data" points={['Ruang lingkup, periode, dan tim perikatan', 'Materialitas dan pendekatan berbasis risiko', 'Area berisiko signifikan yang menjadi fokus', 'Daftar kebutuhan dokumen klien (PBC)']} />);
  push('scope', 'p1', 'Ruang Lingkup & Tim', (n, t) => <PRScope data={data} n={n} total={t} />);
  push('materiality', 'p1', 'Materialitas & Pendekatan', (n, t) => <PRMateriality data={data} n={n} total={t} />);
  push('risks', 'p1', 'Area Berisiko Signifikan', (n, t) => <PRRisks data={data} n={n} total={t} />);
  push('pbc', 'p1', 'Kebutuhan Data (PBC)', (n, t) => <PRPbc data={data} n={n} total={t} />);

  push('sec-p2', 'p2', 'Pembatas — Penyampaian Temuan', (n, t) => <PRSection phase={PR_PHASES[1]} headline="Menyampaikan temuan secara terbuka dan terdokumentasi" points={['Ringkasan temuan menurut tingkat keparahan', 'Pembahasan rinci tiap temuan signifikan', 'Tanggapan dan rencana tindak lanjut manajemen']} />);
  push('find-summary', 'p2', 'Ringkasan Temuan', (n, t) => <PRFindingsSummary data={data} n={n} total={t} />);
  data.finalSorted.forEach((f, i) => push('find-' + f.id, 'p2', 'Temuan: ' + f.title, (n, t) => <PRFinding data={data} f={f} idx={prFindOrder(data, f.id)} count={prIncludedFindingCount(data)} n={n} total={t} />));

  push('sec-p3', 'p3', 'Pembatas — Hasil Akhir', (n, t) => <PRSection phase={PR_PHASES[2]} headline="Menyimpulkan hasil audit dan langkah finalisasi" points={['Opini audit dan dasarnya', 'Penyesuaian disepakati dan selisih audit', 'Langkah finalisasi dan tindak lanjut']} />);
  push('opinion', 'p3', 'Opini Audit', (n, t) => <PROpinion data={data} n={n} total={t} />);
  push('adjustments', 'p3', 'Penyesuaian & Selisih', (n, t) => <PRAdjustments data={data} n={n} total={t} />);
  push('next', 'p3', 'Penutup & Langkah Selanjutnya', (n, t) => <PRNext data={data} n={n} total={t} />);
  return list;
}
/* nomor & jumlah temuan disesuaikan dengan yang aktif (terpilih) — diisi runtime */
let PR_ACTIVE_FINDINGS = null;
function prFindOrder(data, id) {
  const arr = PR_ACTIVE_FINDINGS || data.finalSorted.map(f => f.id);
  const i = arr.indexOf(id); return (i < 0 ? 0 : i) + 1;
}
function prIncludedFindingCount(data) {
  return (PR_ACTIVE_FINDINGS || data.finalSorted.map(f => f.id)).length;
}

/* ============================================================
   STAGE (scaling 1280×720) + KONTROL
   ============================================================ */
function PresentasiKlien() {
  const firm = useFirm();
  const nav = useNav();
  const data = useMemoPR(() => prData(firm), [firm.activeEngagement, firm.activeClient]);
  const allSlides = useMemoPR(() => prBuildSlides(data), [data]);

  const [included, setIncluded] = useStatePR(() => prLoadLS('presentasi.included', {}) || {});
  const setInc = (next) => setIncluded(() => { try { localStorage.setItem('ams.v1.presentasi.included', JSON.stringify(next)); } catch (e) {} return next; });
  const slides = useMemoPR(() => { const f = allSlides.filter(s => included[s.key] !== false); return f.length ? f : allSlides; }, [allSlides, included]);
  const total = slides.length;
  /* penomoran & jumlah temuan mengikuti yang terpilih */
  PR_ACTIVE_FINDINGS = slides.filter(s => s.key.indexOf('find-') === 0 && s.key !== 'find-summary').map(s => s.key.slice(5));

  const [idx, setIdx] = useStatePR(() => {
    const v = parseInt(prLoadLS('presentasi.idx', 0), 10); return isNaN(v) ? 0 : Math.max(0, Math.min(v, total - 1));
  });
  const [fs, setFs] = useStatePR(false);
  const [cfg, setCfg] = useStatePR(false);

  /* jaga idx tetap valid saat jumlah slide berubah */
  useEffectPR(() => { setIdx(i => Math.max(0, Math.min(i, total - 1))); }, [total]);

  /* grup untuk panel "Susun" */
  const cfgGroups = useMemoPR(() => [
    { id: 'intro', label: 'Pembuka', color: 'var(--navy)', items: allSlides.filter(s => s.phase === null) },
    { id: 'p1', label: '01 · Rapat Pembukaan', color: PR_PHASES[0].color, items: allSlides.filter(s => s.phase === 'p1') },
    { id: 'p2', label: '02 · Penyampaian Temuan', color: PR_PHASES[1].color, items: allSlides.filter(s => s.phase === 'p2') },
    { id: 'p3', label: '03 · Pembahasan Hasil Akhir', color: PR_PHASES[2].color, items: allSlides.filter(s => s.phase === 'p3') },
  ], [allSlides]);
  const toggleKey = (k) => setInc(Object.assign({}, included, { [k]: included[k] === false ? true : false }));
  const setGroupOn = (items, on) => { const next = Object.assign({}, included); items.forEach(it => { next[it.key] = on; }); setInc(next); };
  const activeCount = allSlides.filter(s => included[s.key] !== false).length;
  const frameRef = useRefPR(null);
  const [scale, setScale] = useStatePR(0.5);

  const go = useCallbackPR((d) => setIdx(i => { const v = Math.max(0, Math.min(total - 1, i + d)); try { localStorage.setItem('ams.v1.presentasi.idx', JSON.stringify(v)); } catch (e) {} return v; }), [total]);
  const jump = useCallbackPR((v) => setIdx(() => { const x = Math.max(0, Math.min(total - 1, v)); try { localStorage.setItem('ams.v1.presentasi.idx', JSON.stringify(x)); } catch (e) {} return x; }), [total]);

  /* re-scale slide to frame width */
  useEffectPR(() => {
    const el = frameRef.current; if (!el) return;
    const measure = () => { const w = el.clientWidth; if (w) setScale(w / 1280); };
    measure();
    const raf1 = requestAnimationFrame(measure);
    const raf2 = requestAnimationFrame(() => requestAnimationFrame(measure));
    let ro = null;
    if (typeof ResizeObserver !== 'undefined') { ro = new ResizeObserver(measure); ro.observe(el); }
    window.addEventListener('resize', measure);
    return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2); if (ro) ro.disconnect(); window.removeEventListener('resize', measure); };
  }, [fs]);

  /* keyboard nav */
  useEffectPR(() => {
    const onKey = (e) => {
      if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); go(1); }
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); go(-1); }
      else if (e.key === 'Escape' && fs) { setFs(false); }
      else if ((e.key === 'f' || e.key === 'F') && !e.metaKey && !e.ctrlKey) { setFs(v => !v); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, fs]);

  const cur = slides[idx];
  const phase = cur && cur.phase ? PR_PHASES.find(p => p.id === cur.phase) : null;

  return (
    <>
      <style>{PR_CSS}</style>
      {typeof SubBar === 'function' && (
        <SubBar moduleId="presentasi" right={
          <div className="row gap8 ac">
            {typeof Badge === 'function' && <Badge kind="blue">{activeCount < allSlides.length ? (activeCount + ' / ' + allSlides.length + ' slide') : (allSlides.length + ' slide')}</Badge>}
            <Btn sm onClick={() => setCfg(true)}><I.sliders size={13} /> Susun Slide</Btn>
            <Btn sm onClick={() => setFs(true)}><I.play size={13} /> Mode Layar Penuh</Btn>
          </div>
        } />
      )}
      <div className="view-scroll">
        <div className={'pr-wrap' + (fs ? ' pr-fs' : '')}>
          {fs && (
            <button className="pr-fs-exit" onClick={() => setFs(false)} title="Keluar (Esc)"><I.x size={16} /> Tutup</button>
          )}
          <div className="pr-stage">
            <div className="pr-frame" ref={frameRef}>
              <div className="pr-canvas" style={{ transform: 'scale(' + scale + ')' }}>
                {typeof cur.el === 'function' ? cur.el(idx + 1, total) : cur.el}
              </div>
            </div>
            <button className="pr-arrow pr-arrow-l" disabled={idx === 0} onClick={() => go(-1)} aria-label="Sebelumnya"><I.arrowLeft size={22} /></button>
            <button className="pr-arrow pr-arrow-r" disabled={idx === total - 1} onClick={() => go(1)} aria-label="Berikutnya"><I.arrowRight size={22} /></button>
          </div>

          <div className="pr-controls">
            <div className="pr-controls-l">
              {PR_PHASES.map(p => {
                const first = slides.findIndex(s => s.phase === p.id);
                const isActive = phase && phase.id === p.id;
                return (
                  <button key={p.id} className={'pr-phasebtn' + (isActive ? ' is-active' : '')} style={isActive ? { borderColor: p.color, color: p.color } : null} disabled={first < 0} onClick={() => first >= 0 && jump(first)}>
                    <span className="pr-phasebtn-no">{p.no}</span>{p.tag}
                  </button>
                );
              })}
            </div>
            <div className="pr-controls-r">
              <button className="pr-navbtn" disabled={idx === 0} onClick={() => go(-1)}><I.arrowLeft size={15} /></button>
              <span className="pr-counter">{String(idx + 1).padStart(2, '0')} <i>/</i> {String(total).padStart(2, '0')}</span>
              <button className="pr-navbtn" disabled={idx === total - 1} onClick={() => go(1)}><I.arrowRight size={15} /></button>
            </div>
          </div>
          <div className="pr-dots">
            {slides.map((s, i) => {
              const c = s.phase ? (PR_PHASES.find(p => p.id === s.phase) || {}).color : 'var(--navy)';
              return <span key={i} role="button" className={'pr-dot' + (i === idx ? ' is-on' : '')} style={i === idx ? { background: c, borderColor: c } : null} onClick={() => jump(i)} title={'Slide ' + (i + 1)} />;
            })}
          </div>
        </div>
      </div>

      {cfg && (
        <div className="pr-cfg-backdrop" onClick={() => setCfg(false)}>
          <div className="pr-cfg" onClick={(e) => e.stopPropagation()}>
            <div className="pr-cfg-head">
              <div>
                <div className="pr-cfg-title">Susun Presentasi</div>
                <div className="pr-cfg-sub">Pilih bagian yang ingin ditampilkan · <b>{activeCount}</b> dari {allSlides.length} slide aktif</div>
              </div>
              <button className="pr-cfg-x" onClick={() => setCfg(false)}><I.x size={16} /></button>
            </div>
            <div className="pr-cfg-body">
              {cfgGroups.map(g => {
                const onCount = g.items.filter(it => included[it.key] !== false).length;
                const allOn = onCount === g.items.length;
                return (
                  <div key={g.id} className="pr-cfg-group">
                    <div className="pr-cfg-glabel">
                      <span className="pr-cfg-dot" style={{ background: g.color }} />
                      <span className="pr-cfg-gname">{g.label}</span>
                      <span className="pr-cfg-gcount">{onCount}/{g.items.length}</span>
                      <button className="pr-cfg-gtoggle" onClick={() => setGroupOn(g.items, !allOn)}>{allOn ? 'Kosongkan' : 'Pilih semua'}</button>
                    </div>
                    <div className="pr-cfg-items">
                      {g.items.map(it => {
                        const on = included[it.key] !== false;
                        return (
                          <button key={it.key} className={'pr-cfg-item' + (on ? ' is-on' : '')} onClick={() => toggleKey(it.key)}>
                            <span className="pr-cfg-check" style={on ? { background: g.color, borderColor: g.color } : null}>{on && <I.check size={12} />}</span>
                            <span className="pr-cfg-itext">{it.title}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="pr-cfg-foot">
              <button className="pr-cfg-reset" onClick={() => setInc({})}><I.sync size={13} /> Tampilkan Semua</button>
              <button className="pr-cfg-done" onClick={() => { setIdx(0); setCfg(false); }}><I.play size={13} /> Mulai Presentasi · {activeCount} slide</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ============================================================
   CSS (scoped pr-)
   ============================================================ */
const PR_CSS = `
.pr-dot, .pr-arrow, .pr-navbtn, .pr-phasebtn, .pr-fs-exit, .pr-flow3-no, .pr-next-no { -webkit-appearance: none; appearance: none; }
.pr-wrap { padding: 18px 20px 26px; max-width: 1120px; margin: 0 auto; }
.pr-stage { position: relative; }
.pr-frame { position: relative; width: 100%; aspect-ratio: 16 / 9; background: #fff; border: 1px solid var(--line); border-radius: 12px; overflow: hidden; box-shadow: 0 18px 48px -22px rgba(0,44,63,.5), 0 2px 8px rgba(0,44,63,.08); }
.pr-canvas { position: absolute; top: 0; left: 0; width: 1280px; height: 720px; transform-origin: top left; }
.pr-slide { width: 1280px; height: 720px; position: relative; overflow: hidden; font-family: var(--ui); color: var(--ink); }

/* nav arrows over stage */
.pr-arrow { position: absolute; top: 50%; transform: translateY(-50%); width: 46px; height: 46px; border-radius: 50%; border: 1px solid var(--line); background: rgba(255,255,255,.92); color: var(--navy); display: grid; place-items: center; cursor: pointer; box-shadow: 0 4px 14px rgba(0,44,63,.16); transition: background .15s, opacity .15s; }
.pr-arrow:hover { background: #fff; }
.pr-arrow:disabled { opacity: 0; pointer-events: none; }
.pr-arrow-l { left: -23px; } .pr-arrow-r { right: -23px; }

/* controls */
.pr-controls { display: flex; align-items: center; justify-content: space-between; margin-top: 16px; gap: 12px; flex-wrap: wrap; }
.pr-controls-l { display: flex; gap: 8px; flex-wrap: wrap; }
.pr-phasebtn { display: flex; align-items: center; gap: 8px; padding: 7px 13px; border: 1px solid var(--line); background: #fff; border-radius: 8px; font-size: 12.5px; font-weight: 600; color: var(--ink-3); cursor: pointer; font-family: var(--ui); transition: all .15s; }
.pr-phasebtn:hover { border-color: var(--line-strong); color: var(--ink); }
.pr-phasebtn.is-active { background: var(--surface-2); }
.pr-phasebtn-no { font-family: var(--mono); font-size: 11px; opacity: .7; }
.pr-controls-r { display: flex; align-items: center; gap: 10px; }
.pr-navbtn { width: 34px; height: 34px; border-radius: 8px; border: 1px solid var(--line); background: #fff; color: var(--navy); display: grid; place-items: center; cursor: pointer; }
.pr-navbtn:hover { background: var(--surface-2); }
.pr-navbtn:disabled { opacity: .35; cursor: default; }
.pr-counter { font-family: var(--mono); font-size: 14px; font-weight: 600; color: var(--ink); letter-spacing: .04em; }
.pr-counter i { color: var(--ink-4); font-style: normal; }
.pr-dots { display: flex; gap: 6px; justify-content: center; margin-top: 14px; flex-wrap: wrap; }
.pr-dot { width: 9px; height: 9px; border-radius: 50%; border: 1px solid var(--line-strong); background: transparent; cursor: pointer; padding: 0; transition: all .15s; display: inline-block; box-sizing: border-box; }
.pr-dot:hover { background: var(--line-strong); }
.pr-dot.is-on { transform: scale(1.15); }

/* fullscreen */
.pr-fs { position: fixed; inset: 0; z-index: 9999; background: #06141d; max-width: none; margin: 0; padding: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.pr-fs .pr-stage { width: min(100vw, 168vh); }
.pr-fs .pr-frame { border-radius: 6px; border: none; }
.pr-fs .pr-controls { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); margin: 0; background: rgba(8,22,31,.86); padding: 9px 14px; border-radius: 12px; backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,.1); }
.pr-fs .pr-phasebtn { background: transparent; color: rgba(255,255,255,.6); border-color: rgba(255,255,255,.16); }
.pr-fs .pr-phasebtn.is-active { background: rgba(255,255,255,.08); }
.pr-fs .pr-navbtn { background: transparent; color: #fff; border-color: rgba(255,255,255,.2); }
.pr-fs .pr-counter { color: #fff; }
.pr-fs .pr-counter i { color: rgba(255,255,255,.45); }
.pr-fs .pr-dots { display: none; }
.pr-fs .pr-arrow-l { left: 18px; } .pr-fs .pr-arrow-r { right: 18px; }
.pr-fs-exit { position: fixed; top: 18px; right: 20px; z-index: 10000; display: flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 9px; border: 1px solid rgba(255,255,255,.18); background: rgba(8,22,31,.7); color: #fff; font-family: var(--ui); font-size: 13px; font-weight: 600; cursor: pointer; }
.pr-fs-exit:hover { background: rgba(8,22,31,.95); }

/* ---- slide internals ---- */
.pr-pad { padding: 62px 76px 64px; height: 100%; box-sizing: border-box; display: flex; flex-direction: column; }
.pr-foot { position: absolute; left: 76px; right: 76px; bottom: 24px; display: flex; justify-content: space-between; align-items: center; font-size: 12.5px; color: var(--ink-4); border-top: 1px solid var(--line-soft); padding-top: 13px; }
.pr-foot-mid { color: var(--ink-3); font-weight: 500; }
.pr-foot-pg { font-family: var(--mono); letter-spacing: .04em; }
.pr-kicker { display: flex; align-items: center; gap: 12px; font-weight: 700; }
.pr-kicker-ico { width: 30px; height: 30px; border-radius: 8px; color: #fff; display: grid; place-items: center; }
.pr-kicker-no { font-family: var(--mono); font-size: 15px; letter-spacing: .05em; }
.pr-kicker-tag { font-size: 16px; letter-spacing: .02em; }
.pr-h { font-size: 44px; line-height: 1.08; letter-spacing: -.02em; color: var(--navy); margin: 18px 0 0; font-weight: 800; text-wrap: balance; }
.pr-h-sm { font-size: 33px; margin-top: 12px; }
.pr-lede { font-size: 18px; line-height: 1.5; color: var(--ink-2); max-width: 980px; margin: 16px 0 0; text-wrap: pretty; }

.pr-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 22px; margin-top: 28px; flex: 1; min-height: 0; }
.pr-card { border: 1px solid var(--line); border-radius: 12px; padding: 24px 26px; background: #fff; }
.pr-card-soft { background: var(--surface-2); }
.pr-card-h { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: var(--ink-3); margin-bottom: 16px; }
.pr-defs { display: grid; gap: 0; }
.pr-def { display: flex; justify-content: space-between; gap: 18px; padding: 10px 0; border-bottom: 1px solid var(--line-soft); font-size: 16px; }
.pr-def:last-child { border-bottom: none; }
.pr-def span { color: var(--ink-3); } .pr-def b { color: var(--ink); font-weight: 600; text-align: right; }
.pr-team { display: grid; gap: 13px; }
.pr-team-row { display: flex; align-items: center; gap: 12px; }
.pr-ava { width: 38px; height: 38px; border-radius: 9px; background: var(--navy); color: #fff; display: grid; place-items: center; font-size: 13px; font-weight: 700; flex: 0 0 38px; }
.pr-team-n { font-size: 16px; font-weight: 600; }
.pr-team-r { font-size: 13.5px; color: var(--ink-3); }
.pr-progress-wrap { margin-top: 20px; }
.pr-progress-top { display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 7px; color: var(--ink-2); }
.pr-progress { height: 9px; border-radius: 5px; background: var(--surface-3); overflow: hidden; }
.pr-progress span { display: block; height: 100%; border-radius: 5px; }

.pr-stat-row { display: flex; gap: 18px; margin-top: 30px; }
.pr-stat { flex: 1; border: 1px solid var(--line); border-radius: 12px; padding: 22px 22px; background: #fff; }
.pr-stat-v { font-size: 30px; font-weight: 800; letter-spacing: -.01em; font-family: var(--mono); font-variant-numeric: tabular-nums; line-height: 1.1; }
.pr-stat-l { font-size: 14px; font-weight: 600; color: var(--ink-2); margin-top: 8px; }
.pr-stat-s { font-size: 12.5px; color: var(--ink-3); margin-top: 3px; }

.pr-bullets { margin: 0; padding-left: 0; list-style: none; display: grid; gap: 13px; }
.pr-bullets li { position: relative; padding-left: 20px; font-size: 16px; line-height: 1.45; color: var(--ink-2); }
.pr-bullets li::before { content: ''; position: absolute; left: 2px; top: 9px; width: 7px; height: 7px; border-radius: 50%; background: var(--blue); }
.pr-card-soft .pr-bullets li::before { background: var(--amber); }

.pr-risk-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-top: 30px; flex: 1; }
.pr-risk { border: 1px solid var(--line); border-radius: 12px; padding: 20px 22px; background: #fff; display: flex; flex-direction: column; }
.pr-risk-top { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 10px; }
.pr-risk-area { font-size: 18px; font-weight: 700; color: var(--navy); margin-right: 4px; }
.pr-chip { font-size: 11.5px; font-weight: 600; padding: 3px 9px; border-radius: 20px; background: var(--surface-3); color: var(--ink-2); }
.pr-chip-red { background: var(--red-bg); color: var(--red); }
.pr-risk-desc { font-size: 15px; line-height: 1.45; color: var(--ink-2); flex: 1; }
.pr-risk-resp { font-size: 14px; color: var(--ink-2); margin-top: 13px; padding-top: 12px; border-top: 1px solid var(--line-soft); }
.pr-risk-resp span { display: block; font-size: 11.5px; text-transform: uppercase; letter-spacing: .06em; color: var(--ink-3); margin-bottom: 3px; font-weight: 700; }

.pr-cat-row { display: flex; flex-wrap: wrap; gap: 9px; }
.pr-cat { font-size: 14.5px; font-weight: 600; padding: 8px 15px; border-radius: 8px; background: var(--surface-2); border: 1px solid var(--line-soft); color: var(--ink-2); }
.pr-note { margin-top: 18px; padding: 13px 16px; border-left: 3px solid; background: var(--surface-2); border-radius: 0 8px 8px 0; font-size: 14.5px; line-height: 1.5; color: var(--ink-2); }
.pr-flow3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
.pr-flow3-item { font-size: 15px; line-height: 1.45; color: var(--ink-2); padding-top: 14px; border-top: 2px solid var(--line); }
.pr-flow3-no { display: inline-grid; place-items: center; width: 26px; height: 26px; border-radius: 50%; color: #fff; font-size: 13px; font-weight: 700; margin-bottom: 10px; }

/* finding */
.pr-finding-head { display: flex; align-items: center; justify-content: space-between; }
.pr-finding-count { font-family: var(--mono); font-size: 13px; font-weight: 600; color: var(--ink-3); }
.pr-finding-titlerow { display: flex; align-items: center; gap: 12px; margin-top: 16px; }
.pr-sev { font-size: 13px; font-weight: 700; padding: 4px 12px; border-radius: 20px; }
.pr-finding-area { font-size: 14px; color: var(--ink-3); font-weight: 500; }
.pr-finding-grid { display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: auto auto; gap: 16px 18px; margin-top: 22px; flex: 1; min-height: 0; }
.pr-fblock { border: 1px solid var(--line); border-radius: 11px; padding: 17px 20px; background: #fff; overflow: hidden; }
.pr-fblock:first-child { grid-row: span 2; }
.pr-fblock-h { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--ink-3); margin-bottom: 9px; }
.pr-fblock p { margin: 0; font-size: 15px; line-height: 1.5; color: var(--ink-2); text-wrap: pretty; }
.pr-fblock-accent { border-width: 1px; border-left-width: 4px; background: var(--surface-2); }
.pr-fblock-resp { background: var(--surface-2); }
.pr-fblock-meta { margin-top: 11px; padding-top: 10px; border-top: 1px solid var(--line-soft); font-size: 13px; color: var(--ink-3); }

/* opinion */
.pr-opinion { display: flex; align-items: stretch; gap: 0; margin-top: 28px; border: 2px solid; border-radius: 14px; overflow: hidden; }
.pr-opinion-badge { display: grid; place-items: center; font-size: 42px; font-weight: 800; color: #fff; padding: 0 38px; letter-spacing: .01em; }
.pr-opinion-body { padding: 26px 32px; display: flex; flex-direction: column; justify-content: center; gap: 12px; }
.pr-opinion-title { font-size: 32px; font-weight: 800; color: var(--navy); line-height: 1.1; }
.pr-opinion-meta { display: flex; gap: 26px; font-size: 15px; color: var(--ink-2); flex-wrap: wrap; }
.pr-opinion-state { font-weight: 600; color: var(--amber); }
.pr-opinion-state.is-final { color: var(--green); }

/* table */
.pr-table { width: 100%; border-collapse: collapse; font-size: 14.5px; }
.pr-table th { text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: .05em; color: var(--ink-3); font-weight: 700; padding: 0 12px 11px; border-bottom: 1.5px solid var(--line); }
.pr-table td { padding: 11px 12px; border-bottom: 1px solid var(--line-soft); color: var(--ink-2); vertical-align: middle; }
.pr-table tr:last-child td { border-bottom: none; }
.pr-r { text-align: right; } .pr-mono { font-family: var(--mono); font-variant-numeric: tabular-nums; }
.pr-pill { font-size: 12px; font-weight: 600; padding: 3px 11px; border-radius: 18px; }

/* cover */
.pr-cover { height: 100%; padding: 70px 80px; box-sizing: border-box; display: flex; flex-direction: column; color: #fff; position: relative; }
.pr-cover::after { content: ''; position: absolute; right: -120px; top: -120px; width: 460px; height: 460px; border-radius: 50%; border: 1px solid rgba(255,255,255,.08); }
.pr-cover-top { display: flex; justify-content: space-between; align-items: baseline; font-size: 14px; color: var(--on-navy); letter-spacing: .02em; }
.pr-cover-firm { font-weight: 700; color: #fff; }
.pr-cover-mid { margin-top: auto; margin-bottom: auto; }
.pr-cover-eyebrow { font-size: 16px; color: #7fb8d8; font-weight: 600; letter-spacing: .04em; }
.pr-cover-title { font-size: 60px; font-weight: 800; line-height: 1.04; letter-spacing: -.025em; margin: 18px 0 0; text-wrap: balance; max-width: 900px; }
.pr-cover-sub { font-size: 19px; color: var(--on-navy); margin-top: 16px; }
.pr-cover-flow { display: flex; gap: 38px; margin-top: 46px; }
.pr-cover-flow-item { display: flex; align-items: center; gap: 13px; }
.pr-cover-flow-no { width: 38px; height: 38px; border-radius: 9px; display: grid; place-items: center; font-family: var(--mono); font-size: 15px; font-weight: 700; border: 1px solid; }
.pr-cover-flow-tag { font-size: 16px; font-weight: 700; }
.pr-cover-flow-sub { font-size: 13px; color: var(--on-navy-dim); }
.pr-cover-foot { display: flex; justify-content: space-between; font-size: 14px; color: var(--on-navy-dim); margin-top: 46px; padding-top: 22px; border-top: 1px solid rgba(255,255,255,.12); }

/* section divider */
.pr-section { height: 100%; display: flex; align-items: center; gap: 50px; padding: 0 90px; color: #fff; }
.pr-section-no { font-family: var(--mono); font-size: 200px; font-weight: 800; line-height: .85; letter-spacing: -.04em; opacity: .9; }
.pr-section-tag { display: flex; align-items: center; gap: 12px; font-size: 17px; font-weight: 600; color: var(--on-navy); letter-spacing: .03em; }
.pr-section-ico { width: 36px; height: 36px; border-radius: 9px; color: #fff; display: grid; place-items: center; }
.pr-section-h { font-size: 42px; font-weight: 800; line-height: 1.12; letter-spacing: -.02em; margin: 18px 0 26px; max-width: 640px; text-wrap: balance; }
.pr-section-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 14px; }
.pr-section-list li { font-size: 18px; color: var(--on-navy); display: flex; gap: 12px; }
.pr-section-list li span { font-weight: 800; }

/* next/close */
.pr-next { color: #fff; justify-content: center; }
.pr-next-eyebrow { font-size: 16px; font-weight: 700; letter-spacing: .05em; }
.pr-next-h { font-size: 50px; font-weight: 800; letter-spacing: -.02em; margin: 16px 0 38px; line-height: 1.06; text-wrap: balance; }
.pr-next-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 22px 50px; }
.pr-next-item { display: flex; gap: 16px; }
.pr-next-no { flex: 0 0 40px; width: 40px; height: 40px; border-radius: 50%; border: 2px solid; display: grid; place-items: center; font-family: var(--mono); font-size: 17px; font-weight: 700; color: #fff; }
.pr-next-t { font-size: 19px; font-weight: 700; margin-bottom: 5px; }
.pr-next-d { font-size: 15px; line-height: 1.5; color: var(--on-navy); }
.pr-next-foot { display: flex; justify-content: space-between; font-size: 14px; color: var(--on-navy-dim); margin-top: 50px; padding-top: 22px; border-top: 1px solid rgba(255,255,255,.12); }

/* ---- config "Susun" modal ---- */
.pr-cfg-backdrop { position: fixed; inset: 0; z-index: 10001; background: rgba(8,22,31,.5); backdrop-filter: blur(3px); display: flex; align-items: center; justify-content: center; padding: 24px; }
.pr-cfg { width: 560px; max-width: 100%; max-height: 88vh; background: var(--surface); border: 1px solid var(--line); border-radius: 14px; box-shadow: 0 24px 60px -16px rgba(0,44,63,.5); display: flex; flex-direction: column; overflow: hidden; }
.pr-cfg-head { display: flex; align-items: flex-start; justify-content: space-between; padding: 20px 22px 16px; border-bottom: 1px solid var(--line-soft); }
.pr-cfg-title { font-size: 18px; font-weight: 800; color: var(--navy); }
.pr-cfg-sub { font-size: 13px; color: var(--ink-3); margin-top: 4px; }
.pr-cfg-x { -webkit-appearance: none; appearance: none; width: 32px; height: 32px; border-radius: 8px; border: 1px solid var(--line); background: #fff; color: var(--ink-2); display: grid; place-items: center; cursor: pointer; }
.pr-cfg-x:hover { background: var(--surface-2); }
.pr-cfg-body { padding: 8px 22px 14px; overflow-y: auto; }
.pr-cfg-group { padding: 14px 0; border-bottom: 1px solid var(--line-soft); }
.pr-cfg-group:last-child { border-bottom: none; }
.pr-cfg-glabel { display: flex; align-items: center; gap: 9px; margin-bottom: 10px; }
.pr-cfg-dot { width: 10px; height: 10px; border-radius: 50%; flex: 0 0 10px; }
.pr-cfg-gname { font-size: 13.5px; font-weight: 700; color: var(--ink); text-transform: uppercase; letter-spacing: .03em; }
.pr-cfg-gcount { font-family: var(--mono); font-size: 12px; color: var(--ink-4); }
.pr-cfg-gtoggle { -webkit-appearance: none; appearance: none; margin-left: auto; border: none; background: none; color: var(--blue); font-size: 12.5px; font-weight: 600; cursor: pointer; font-family: var(--ui); padding: 2px 4px; }
.pr-cfg-gtoggle:hover { text-decoration: underline; }
.pr-cfg-items { display: grid; gap: 4px; }
.pr-cfg-item { -webkit-appearance: none; appearance: none; display: flex; align-items: center; gap: 11px; width: 100%; text-align: left; padding: 9px 10px; border: 1px solid transparent; border-radius: 9px; background: none; cursor: pointer; font-family: var(--ui); transition: background .12s; }
.pr-cfg-item:hover { background: var(--surface-2); }
.pr-cfg-check { flex: 0 0 20px; width: 20px; height: 20px; border-radius: 6px; border: 1.5px solid var(--line-strong); background: #fff; display: grid; place-items: center; color: #fff; transition: all .12s; }
.pr-cfg-itext { font-size: 14px; color: var(--ink-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pr-cfg-item.is-on .pr-cfg-itext { color: var(--ink); font-weight: 500; }
.pr-cfg-foot { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 15px 22px; border-top: 1px solid var(--line-soft); background: var(--surface-2); }
.pr-cfg-reset { -webkit-appearance: none; appearance: none; display: inline-flex; align-items: center; gap: 7px; border: 1px solid var(--line); background: #fff; color: var(--ink-2); font-size: 13px; font-weight: 600; padding: 9px 14px; border-radius: 9px; cursor: pointer; font-family: var(--ui); }
.pr-cfg-reset:hover { background: var(--surface-3); }
.pr-cfg-done { -webkit-appearance: none; appearance: none; display: inline-flex; align-items: center; gap: 7px; border: none; background: var(--navy); color: #fff; font-size: 13.5px; font-weight: 700; padding: 10px 18px; border-radius: 9px; cursor: pointer; font-family: var(--ui); }
.pr-cfg-done:hover { background: var(--navy-600); }
`;

Object.assign(window, { PresentasiKlien });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { PresentasiKlien };
