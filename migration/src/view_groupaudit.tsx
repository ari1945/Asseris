/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { AMS_CANON } from './canon';
import { useAmsPersist, useAudit, useNav } from './contexts';
import { I } from './icons';
import { SubBar } from './shell.jsx';
import { Badge, Btn, Donut, Panel, Stat, Tabs } from './ui.jsx';
import { KvBox } from './view_analytical';
import { StdVersionStrip } from './view_ethics_parts';
import { GAConsol, GAElimReview, GAPackages } from './view_groupaudit_parts';

/* ============================================================
   Asseris — Group Audit (SA 600 / ISA 600 Revised)
   Lifecycle penuh audit grup:
   Struktur & Lingkup → Group Instructions → Evaluasi Auditor
   Komponen → Konsolidasi & Eliminasi → Temuan & Kesimpulan
   ============================================================ */
const { useState: useStateGA, useMemo: useMemoGA } = React;

const GROUP_MAT = 6_200_000_000;
const GROUP_PM = 4_650_000_000;
const GROUP_CTT = 310_000_000; // clearly trivial threshold

const GA_COMPONENTS = [
  { id: 'CP-01', name: 'PT Sentosa Makmur', role: 'Induk / Holding', country: 'Indonesia', ccy: 'IDR', fx: 1, own: 100, revPct: 58, astPct: 55, npat: 14_660_000_000, sig: 'Signifikan (ukuran)', scope: 'Full', mat: 4_250_000_000, auditor: 'Tim Grup (WHR)', kap: false, status: 'Reporting', risk: 'High', instr: '—', step: 5, evInd: 5, evComp: 5, evReg: 5, sad: 410_000_000 },
  { id: 'CP-02', name: 'PT Sentosa Logistik', role: 'Anak (Distribusi)', country: 'Indonesia', ccy: 'IDR', fx: 1, own: 99, revPct: 18, astPct: 16, npat: 11_900_000_000, sig: 'Signifikan (ukuran)', scope: 'Full', mat: 2_100_000_000, auditor: 'Tim Grup (WHR)', kap: false, status: 'Reporting', risk: 'Medium', instr: '—', step: 5, evInd: 5, evComp: 5, evReg: 5, sad: 150_000_000 },
  { id: 'CP-03', name: 'PT Sentosa Pangan', role: 'Anak (Manufaktur)', country: 'Indonesia', ccy: 'IDR', fx: 1, own: 80, revPct: 14, astPct: 15, npat: 7_200_000_000, sig: 'Signifikan (risiko)', scope: 'Specific', mat: 1_650_000_000, auditor: 'KAP Mitra Selaras', kap: true, status: 'Instructions', risk: 'High', instr: 'Terkirim', step: 1, evInd: 4, evComp: 3, evReg: 4, sad: 880_000_000 },
  { id: 'CP-04', name: 'PT Sentosa Retail', role: 'Anak (Ritel)', country: 'Indonesia', ccy: 'IDR', fx: 1, own: 75, revPct: 6, astPct: 8, npat: 2_600_000_000, sig: 'Tidak signifikan', scope: 'Analytical', mat: 0, auditor: 'Tim Grup (WHR)', kap: false, status: 'Pending', risk: 'Low', instr: '—', step: 0, evInd: 5, evComp: 5, evReg: 5, sad: 0 },
  { id: 'CP-05', name: 'Sentosa Trading Pte Ltd', role: 'Anak (Perdagangan)', country: 'Singapura', ccy: 'SGD', fx: 11_950, own: 100, revPct: 4, astPct: 6, npat: 4_050_000_000, sig: 'Signifikan (risiko)', scope: 'Full', mat: 1_400_000_000, auditor: 'KAP Lim & Tan (SG)', kap: true, status: 'Reviewed', risk: 'Medium', instr: 'Diterima', step: 4, evInd: 5, evComp: 4, evReg: 3, sad: 320_000_000 },
];

/* Prosedur reviu proses konsolidasi (tim audit grup · SA 600 / PSAK 65) */
const GA_CONSOL_PROC = [
  { ref: 'SA 600 ¶B86', t: 'Pahami proses konsolidasi entitas induk & pengendalian atasnya (paket konsolidasi, mapping akun, kebijakan grup)' },
  { ref: 'PSAK 65 ¶19', t: 'Uji keseragaman kebijakan akuntansi & tanggal pelaporan komponen sebelum digabung line-by-line' },
  { ref: 'PSAK 22 ¶32', t: 'Re-perform eliminasi investasi vs ekuitas anak; verifikasi goodwill & pengukuran NCI proporsional (¶19)' },
  { ref: 'PSAK 65 ¶B86(a)', t: 'Uji kelengkapan & akurasi eliminasi saldo antar-perusahaan (piutang/utang, penjualan/BPP)' },
  { ref: 'PSAK 65 ¶B86(c)', t: 'Uji eliminasi laba belum terealisasi dalam persediaan & dividen antar-perusahaan' },
  { ref: 'PSAK 10 ¶39', t: 'Uji translasi entitas asing — kurs penutup/rata-rata & selisih kurs ke OCI (CTA)' },
  { ref: 'PSAK 65 ¶B94', t: 'Uji atribusi laba tahun berjalan & ekuitas ke pemilik induk dan NCI' },
  { ref: 'SA 600 ¶42', t: 'Uji keseimbangan kertas kerja (A = L + E) & rekonsiliasi ke LK konsolidasian (FS Generator)' },
];

/* Keterkaitan lintas-modul kertas kerja konsolidasi (lineage dua arah) */
const GA_CONSOL_UP = [
  { id: 'wtb', ic: 'table', lbl: 'Working Trial Balance', rel: 'Entitas induk (PT Sentosa Makmur) — saldo standalone, live AJE' },
  { id: 'psak65', ic: 'building', lbl: 'PSAK 65 · Konsolidasian', rel: 'Mesin konsolidasi kanonik — kertas kerja, NCI & goodwill yang sama' },
  { id: 'related', ic: 'link2', lbl: 'Pihak Berelasi (PSAK 7)', rel: 'Daftar transaksi & saldo antar-perusahaan untuk eliminasi' },
  { id: 'confirm', ic: 'mail', lbl: 'Konfirmasi (SA 505)', rel: 'Rekonsiliasi saldo antar-perusahaan — selisih ELM-03' },
];
const GA_CONSOL_DOWN = [
  { id: 'psak48', ic: 'scale', lbl: 'PSAK 48 · Penurunan Nilai', rel: 'Goodwill konsolidasi → uji penurunan nilai UPK tahunan' },
  { id: 'psak46', ic: 'receipt', lbl: 'PSAK 46 · Pajak Tangguhan', rel: 'Konsekuensi pajak PPA & laba antar-perusahaan (22%)' },
  { id: 'fsgen', ic: 'report', lbl: 'FS Generator', rel: 'LPK & laba rugi konsolidasian → penyajian LK' },
  { id: 'sa701', ic: 'star', lbl: 'SA 701 · KAM', rel: 'Goodwill & konsolidasi sebagai Hal Audit Utama' },
];

/* ===== PAKET PELAPORAN KOMPONEN (impor konsolidasi) ===========
   Alur kerja audit grup: tiap komponen mengirim paket pelaporan (reporting
   package). Figur disunting/diimpor di tab ini → disimpan di ams.v1.gaPackages
   → ditarik AMS_CANON.psak65 sebagai pengganti seed (SSOT). Status = gerbang
   tata kelola: Diterima → Direkonsiliasi → Disetujui (atau Ditolak). */
const PKG_STATUS_KIND = { Disetujui: 'green', Direkonsiliasi: 'blue', Diterima: 'amber', Ditolak: 'red', Seed: 'gray' };
const PKG_STATUS_ORDER = ['Diterima', 'Direkonsiliasi', 'Disetujui'];
/* field paket yang dapat diimpor/disunting — dikelompokkan untuk editor & validasi neraca */
const PKG_FIELDS = [
  { sec: 'Laba rugi', items: [['rev', 'Pendapatan'], ['npat', 'Laba bersih (NPAT)']] },
  { sec: 'Aset', items: [['kas', 'Kas & setara'], ['piutang', 'Piutang usaha'], ['persediaan', 'Persediaan'], ['asetTetap', 'Aset tetap — neto'], ['asetLain', 'Aset lain']] },
  { sec: 'Liabilitas', items: [['utangUsaha', 'Utang usaha'], ['utangBank', 'Utang bank'], ['liabLain', 'Liabilitas lain']] },
  { sec: 'Ekuitas', items: [['modal', 'Modal saham'], ['rePre', 'Saldo laba pra-akuisisi'], ['rePost', 'Saldo laba pasca-akuisisi']] },
  { sec: 'Investasi induk', items: [['cost', 'Biaya perolehan investasi']] },
];
const PKG_NUM_KEYS = PKG_FIELDS.flatMap(g => g.items.map(i => i[0]));
const PKG_LABELS = Object.fromEntries(PKG_FIELDS.flatMap(g => g.items));

/* default paket: dibangun dari seed kanonik + status awal realistis (campuran) */
function gaDefaultPackages(wtb) {
  const subs = (AMS_CANON && AMS_CANON.psak65) ? AMS_CANON.psak65(wtb, {}).subs : [];
  const seedStatus = { 'CP-02': 'Disetujui', 'CP-03': 'Direkonsiliasi', 'CP-04': 'Diterima', 'CP-05': 'Diterima' };
  const seedRecv = { 'CP-02': '08 Jan 2026', 'CP-03': '10 Jan 2026', 'CP-04': '12 Jan 2026', 'CP-05': '13 Jan 2026' };
  const o = {};
  subs.forEach(s => {
    const p = { status: seedStatus[s.id] || 'Diterima', received: seedRecv[s.id] || null };
    PKG_NUM_KEYS.forEach(k => { p[k] = s[k]; });
    o[s.id] = p;
  });
  return o;
}

const GA_FINDINGS = [
  { id: 'GF-01', comp: 'PT Sentosa Pangan', auditor: 'KAP Mitra Selaras', area: 'Penilaian persediaan agrikultur (PSAK 69)', sev: 'Signifikan', sad: 880_000_000, status: 'Terbuka', note: 'Nilai wajar aset biologis menggunakan asumsi harga panen di atas kurva pasar; potensi overstatement.' },
  { id: 'GF-02', comp: 'Sentosa Trading Pte', auditor: 'KAP Lim & Tan (SG)', area: 'Cut-off pengakuan pendapatan ekspor', sev: 'Sedang', sad: 320_000_000, status: 'Dikoreksi', note: 'Tiga pengiriman FOB tercatat sebelum tanggal B/L; klien telah menyesuaikan.' },
  { id: 'GF-03', comp: 'PT Sentosa Makmur', auditor: 'Tim Grup (WHR)', area: 'Kapitalisasi biaya pengembangan', sev: 'Sedang', sad: 410_000_000, status: 'Terbuka', note: 'Sebagian biaya tahap riset dikapitalisasi tidak sesuai PSAK 19.' },
  { id: 'GF-04', comp: 'PT Sentosa Logistik', auditor: 'Tim Grup (WHR)', area: 'Akrual beban operasional kendaraan', sev: 'Trivial', sad: 150_000_000, status: 'Dikoreksi', note: 'Understatement akrual perawatan armada; di bawah CTT setelah koreksi.' },
];

const SCOPE_KIND = { Full: 'blue', Specific: 'purple', Analytical: 'gray' };
const STATUS_KIND_GA = { Reviewed: 'green', Reporting: 'blue', Instructions: 'amber', Pending: 'gray' };
const INSTR_STEPS = ['Instruksi', 'Acknowledged', 'Interim', 'Reporting Pkg', 'Clearance'];
const SEV_GA = { Signifikan: 'red', Sedang: 'amber', Trivial: 'gray' };

function gaRisk(r) { return r === 'High' ? 'var(--red)' : r === 'Medium' ? 'var(--amber)' : 'var(--green)'; }

/* ---------------------------------------------------------------- */
Object.assign(window, { GA_CONSOL_PROC, GA_CONSOL_UP, GA_CONSOL_DOWN, PKG_STATUS_KIND, PKG_FIELDS, PKG_NUM_KEYS }); // shared with view_groupaudit_parts.jsx (W2)

function GroupAudit() {
  const { fmt } = AMS;
  const nav = useNav();
  const audit = useAudit();
  const wtb = (audit && audit.wtb && audit.wtb.length) ? audit.wtb : ((AMS && AMS.WTB) || []);
  const [packages, setPackages] = useAmsPersist('gaPackages', () => gaDefaultPackages(wtb));
  const p65 = useMemoGA(() => (AMS_CANON && AMS_CANON.psak65) ? AMS_CANON.psak65(wtb, packages) : null, [wtb, packages]);
  const seedSubs = useMemoGA(() => (AMS_CANON && AMS_CANON.psak65) ? AMS_CANON.psak65(wtb, {}).subs : [], [wtb]);
  const [comps, setComps] = useAmsPersist('gaComps', () => GA_COMPONENTS);
  const [findings] = useAmsPersist('gaFindings', () => GA_FINDINGS);
  const [elimVerify, setElimVerify] = useAmsPersist('gaElimVerify', () => ({}));
  const [procDone, setProcDone] = useAmsPersist('gaConsolProc', () => ({}));
  const [tab, setTab] = useStateGA('scope');
  const [selId, setSelId] = useStateGA('CP-03');
  const sel = comps.find(c => c.id === selId);

  const covered = comps.filter(c => c.scope !== 'Analytical');
  const revCoverage = covered.reduce((s, c) => s + c.revPct, 0);
  const astCoverage = covered.reduce((s, c) => s + c.astPct, 0);
  const compAuditors = new Set(comps.filter(c => c.kap).map(c => c.auditor)).size;
  const kapComps = comps.filter(c => c.kap);
  const pkgReceived = kapComps.filter(c => c.instr === 'Diterima').length;
  const totalSad = findings.filter(f => f.status === 'Terbuka').reduce((s, f) => s + f.sad, 0);
  const openFindings = findings.filter(f => f.status === 'Terbuka').length;
  const interco = p65 ? p65.interco : [];
  const openElim = interco.filter(e => !(elimVerify[e.id] || e.status === 'Diverifikasi')).length;
  const pkgApproved = p65 ? p65.pkgApproved : 0;
  const pkgTotal = p65 ? p65.subs.length : 0;

  const setScope = (id, scope) => setComps(list => list.map(c => c.id === id ? { ...c, scope, mat: scope === 'Analytical' ? 0 : (c.mat || Math.round(GROUP_MAT * 0.35)) } : c));
  const setComp = (id, patch) => setComps(list => list.map(c => c.id === id ? { ...c, ...patch } : c));

  const tabs = [
    { id: 'scope', label: 'Struktur & Lingkup', count: comps.length },
    { id: 'instr', label: 'Group Instructions', count: kapComps.length },
    { id: 'auditor', label: 'Auditor Komponen', count: compAuditors },
    { id: 'packages', label: 'Paket Pelaporan', count: pkgTotal },
    { id: 'consol', label: 'Konsolidasi & Eliminasi', count: interco.length },
    { id: 'elimwp', label: 'Reviu Eliminasi (SA 600)', count: openElim },
    { id: 'findings', label: 'Temuan & Kesimpulan', count: openFindings },
  ];

  return (
    <>
      <SubBar moduleId="groupaudit" right={
        <div className="row gap8 ac">
          <Badge kind="blue">SA 600 (Revisi)</Badge>
          <Btn sm onClick={() => nav('psak65', { from: 'groupaudit' })}><I.columns size={13} /> Konsolidasi PSAK 65</Btn>
          <Btn sm><I.send size={13} /> Kirim Group Instructions</Btn>
          <Btn sm variant="primary"><I.download size={14} /> Group Audit Memo</Btn>
        </div>
      } />
      <div className="view-scroll">
        <div className="view-pad">
          {/* KPI row */}
          <div className="grid" style={{ gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginBottom: 12 }}>
            <Panel><div style={{ padding: '11px 14px' }}><Stat value={comps.length} label="Komponen Grup" /></div></Panel>
            <Panel><div style={{ padding: '11px 14px' }}><Stat value={revCoverage + '%'} label="Cakupan Pendapatan" accent={revCoverage >= 90 ? 'var(--green)' : 'var(--amber)'} /></div></Panel>
            <Panel><div style={{ padding: '11px 14px' }}><Stat value={astCoverage + '%'} label="Cakupan Aset" accent={astCoverage >= 85 ? 'var(--green)' : 'var(--amber)'} /></div></Panel>
            <Panel><div style={{ padding: '11px 14px' }}><Stat value={pkgApproved + '/' + pkgTotal} label="Paket Disetujui" accent={pkgApproved === pkgTotal ? 'var(--green)' : 'var(--amber)'} /></div></Panel>
            <Panel><div style={{ padding: '11px 14px' }}><Stat value={'Rp ' + fmt(totalSad / 1e6, 0) + ' jt'} label="SAD Grup Terbuka" accent={totalSad > GROUP_MAT ? 'var(--red)' : 'var(--amber)'} /></div></Panel>
          </div>

          <Panel noBody>
            <div className="panel-h" style={{ padding: 0, background: 'var(--surface-2)' }}><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>

            {tab === 'scope' && <GAScope {...{ comps, fmt, selId, setSelId, sel, setScope, setComp, revCoverage, astCoverage }} />}
            {tab === 'instr' && <GAInstr {...{ comps: kapComps, setComp, fmt }} />}
            {tab === 'auditor' && <GAAuditor {...{ comps: kapComps, setComp }} />}
            {tab === 'packages' && <GAPackages {...{ p65, packages, setPackages, seedSubs, fmt, nav, gotoTab: setTab }} />}
            {tab === 'consol' && <GAConsol {...{ p65, fmt, nav, gotoTab: setTab }} />}
            {tab === 'elimwp' && <GAElimReview {...{ p65, fmt, nav, elimVerify, setElimVerify, procDone, setProcDone }} />}
            {tab === 'findings' && <GAFindings {...{ findings, totalSad, fmt }} />}
          </Panel>

          <div className="tiny muted" style={{ marginTop: 8, lineHeight: 1.5 }}>
            SA 600 (Revisi): tim audit grup bertanggung jawab atas arah, supervisi, dan pelaksanaan audit grup — termasuk penentuan lingkup berbasis risiko, komunikasi dua arah dengan auditor komponen, evaluasi kecukupan bukti, serta agregasi temuan ke tingkat laporan keuangan konsolidasian.
          </div>
        </div>
      </div>
    </>
  );
}

/* ===== TAB 1 — STRUKTUR & LINGKUP ============================== */
function GAScope({ comps, fmt, selId, setSelId, sel, setScope, setComp, revCoverage, astCoverage }) {
  return (
    <div style={{ padding: 14 }}>
      <StdVersionStrip highlight="SA 600" />
      {/* group structure tree */}
      <div className="tiny muted upper" style={{ marginBottom: 8 }}>Struktur Grup — PT Sentosa Group (konsolidasian)</div>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(5,1fr)', gap: 8, marginBottom: 16 }}>
        {comps.map(c => (
          <div key={c.id} onClick={() => setSelId(c.id)}
            className="panel" style={{ padding: 0, cursor: 'pointer', overflow: 'hidden', outline: c.id === selId ? '2px solid var(--blue)' : 'none', outlineOffset: -1 }}>
            <div style={{ height: 4, background: gaRisk(c.risk) }} />
            <div style={{ padding: '9px 11px' }}>
              <div className="row ac jb" style={{ marginBottom: 6 }}>
                <span style={{ width: 26, height: 26, borderRadius: 7, background: c.role.startsWith('Induk') ? 'var(--navy)' : 'var(--surface-3)', color: c.role.startsWith('Induk') ? '#fff' : 'var(--ink-2)', display: 'grid', placeItems: 'center', fontSize: 9.5, fontWeight: 800 }}>{c.own}%</span>
                <Badge kind={SCOPE_KIND[c.scope]}>{c.scope}</Badge>
              </div>
              <div style={{ fontWeight: 700, fontSize: 12, lineHeight: 1.25 }}>{c.name}</div>
              <div className="tiny muted" style={{ marginTop: 2 }}>{c.role}</div>
              <div className="row ac gap6 tiny muted" style={{ marginTop: 6 }}>
                <I.building size={11} />{c.country} · {c.ccy}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 300px', gap: 12, alignItems: 'start' }}>
        <Panel noBody>
          <div className="panel-h"><h3>Penentuan Lingkup (Scoping) Berbasis Risiko</h3><div style={{ flex: 1 }} /><span className="tiny muted">Group materiality Rp {fmt(GROUP_MAT / 1e9, 1)} M · PM Rp {fmt(GROUP_PM / 1e9, 1)} M</span></div>
          <table className="dtbl">
            <thead><tr>
              <th>Komponen</th><th className="num">% Pdpt</th><th className="num">% Aset</th><th>Signifikansi</th><th style={{ width: 100 }}>Lingkup</th><th className="num">Komp. Mat.</th><th style={{ width: 100 }}>Status</th>
            </tr></thead>
            <tbody>
              {comps.map(c => (
                <tr key={c.id} className={c.id === selId ? 'sel' : ''} onClick={() => setSelId(c.id)} style={{ cursor: 'pointer' }}>
                  <td>
                    <div className="row ac gap8">
                      <span style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--navy)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 9, fontWeight: 700, flex: '0 0 24px' }}>{c.own}%</span>
                      <div style={{ minWidth: 0 }}><div className="truncate" style={{ fontWeight: 600, maxWidth: 170, fontSize: 12 }}>{c.name}</div><div className="tiny muted">{c.auditor}</div></div>
                    </div>
                  </td>
                  <td className="num">{c.revPct}%</td>
                  <td className="num">{c.astPct}%</td>
                  <td><span className="tiny" style={{ color: c.sig.includes('risiko') ? 'var(--red)' : c.sig.includes('ukuran') ? 'var(--blue)' : 'var(--ink-3)', fontWeight: 600 }}>{c.sig}</span></td>
                  <td><Badge kind={SCOPE_KIND[c.scope]}>{c.scope}</Badge></td>
                  <td className="num">{c.mat ? fmt(c.mat / 1e6, 0) + ' jt' : '—'}</td>
                  <td><Badge kind={STATUS_KIND_GA[c.status]}>{c.status}</Badge></td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr><td>CAKUPAN LINGKUP (Full + Specific)</td><td className="num">{revCoverage}%</td><td className="num">{astCoverage}%</td><td colSpan={4}></td></tr></tfoot>
          </table>
        </Panel>

        <div className="grid" style={{ gap: 12 }}>
          <Panel title="Cakupan Audit Grup">
            <div className="row" style={{ justifyContent: 'space-around' }}>
              {[['Pendapatan', revCoverage], ['Aset', astCoverage]].map(([l, v]) => (
                <div key={l} style={{ textAlign: 'center' }}>
                  <Donut segments={[{ value: v, color: v >= 90 ? '#1f7a4d' : '#9a6a00' }, { value: 100 - v, color: '#e7ebef' }]} size={84} thickness={12}
                    center={<div className="mono" style={{ fontSize: 16, fontWeight: 700, color: 'var(--navy)' }}>{v}%</div>} />
                  <div className="tiny muted" style={{ marginTop: 4 }}>{l}</div>
                </div>
              ))}
            </div>
            <div className="divider" />
            <div className="tiny muted" style={{ lineHeight: 1.5 }}>Cakupan lingkup audit (full + specific) untuk komponen signifikan. Target cakupan grup ≥ 85%.</div>
          </Panel>

          {sel && (
            <Panel noBody>
              <div style={{ background: 'var(--surface-2)', padding: '11px 14px', borderBottom: '1px solid var(--line)' }}>
                <div className="row ac gap8"><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{sel.id}</span><Badge kind={STATUS_KIND_GA[sel.status]}>{sel.status}</Badge></div>
                <div style={{ fontWeight: 700, fontSize: 13, marginTop: 3 }}>{sel.name}</div>
              </div>
              <div style={{ padding: 14 }}>
                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                  <KvBox label="Kepemilikan" v={sel.own + '%'} />
                  <KvBox label="Komp. Materiality" v={sel.mat ? 'Rp ' + fmt(sel.mat / 1e6, 0) + ' jt' : '—'} />
                  <KvBox label="Auditor" v={sel.auditor} />
                  <KvBox label="Tingkat Risiko" v={sel.risk} accent={gaRisk(sel.risk)} />
                </div>
                <div className="tiny muted upper" style={{ marginBottom: 6 }}>Tentukan Lingkup</div>
                <div className="seg" style={{ width: '100%' }}>
                  {['Full', 'Specific', 'Analytical'].map(s => (
                    <button key={s} className={sel.scope === s ? 'on' : ''} style={{ flex: 1 }} onClick={() => setScope(sel.id, s)}>{s}</button>
                  ))}
                </div>
                <div className="panel" style={{ padding: '9px 11px', background: 'var(--blue-050)', borderColor: 'transparent', marginTop: 12 }}>
                  <div className="tiny" style={{ lineHeight: 1.5 }}>
                    {sel.scope === 'Full' ? 'Full scope: audit atas informasi keuangan komponen menggunakan komponen materialitas.'
                      : sel.scope === 'Specific' ? 'Specific scope: prosedur atas saldo/transaksi/pengungkapan tertentu yang berisiko signifikan.'
                        : 'Analytical: prosedur analitis tingkat grup atas komponen tidak signifikan.'}
                  </div>
                </div>
              </div>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}

/* ===== TAB 2 — GROUP INSTRUCTIONS ============================= */
const INSTR_CONTENT = ['Lingkup & materialitas komponen', 'Risiko signifikan tingkat grup', 'Timeline & format reporting package', 'Konfirmasi independensi & etika', 'Daftar transaksi antar-perusahaan', 'Kebijakan akuntansi grup (PSAK)'];

function GAInstr({ comps, setComp, fmt }) {
  const advance = (c) => {
    const next = Math.min(c.step + 1, INSTR_STEPS.length);
    const instr = next >= 4 ? 'Diterima' : 'Terkirim';
    const status = next >= 5 ? 'Reviewed' : next >= 4 ? 'Reporting' : 'Instructions';
    setComp(c.id, { step: next, instr, status });
  };
  return (
    <div style={{ padding: 14, display: 'grid', gap: 12 }}>
      {comps.map(c => (
        <div key={c.id} className="panel" style={{ padding: 14, borderLeft: '3px solid ' + (c.step >= 5 ? 'var(--green)' : c.step >= 4 ? 'var(--blue)' : 'var(--amber)') }}>
          <div className="row jb ac" style={{ marginBottom: 12 }}>
            <div className="row ac gap8">
              <span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{c.id}</span>
              <span style={{ fontWeight: 700, fontSize: 13 }}>{c.name}</span>
              <Badge kind={SCOPE_KIND[c.scope]}>{c.scope}</Badge>
              <span className="tiny muted">· {c.auditor} ({c.country})</span>
            </div>
            <Badge kind={c.instr === 'Diterima' ? 'green' : c.instr === 'Terkirim' ? 'blue' : 'gray'}>{c.instr === '—' ? 'Belum dikirim' : c.instr}</Badge>
          </div>

          {/* milestone stepper */}
          <div className="row" style={{ alignItems: 'flex-start', marginBottom: 12 }}>
            {INSTR_STEPS.map((s, i) => {
              const done = i < c.step, active = i === c.step;
              return (
                <div key={s} style={{ flex: 1, position: 'relative', textAlign: 'center' }}>
                  {i > 0 && <div style={{ position: 'absolute', top: 11, right: '50%', width: '100%', height: 2, background: i <= c.step ? 'var(--blue)' : 'var(--line)' }} />}
                  <div style={{ position: 'relative', width: 22, height: 22, borderRadius: '50%', margin: '0 auto', display: 'grid', placeItems: 'center', background: done ? 'var(--blue)' : active ? '#fff' : 'var(--surface-3)', border: active ? '2px solid var(--blue)' : done ? '2px solid var(--blue)' : '2px solid var(--line)', color: done ? '#fff' : 'var(--ink-3)' }}>
                    {done ? <I.check size={12} /> : <span className="mono" style={{ fontSize: 10, fontWeight: 700 }}>{i + 1}</span>}
                  </div>
                  <div className="tiny" style={{ marginTop: 5, fontWeight: i <= c.step ? 600 : 400, color: i <= c.step ? 'var(--ink)' : 'var(--ink-4)' }}>{s}</div>
                </div>
              );
            })}
          </div>

          <div className="divider" />
          <div className="grid" style={{ gridTemplateColumns: '1.6fr 1fr', gap: 16, alignItems: 'center' }}>
            <div>
              <div className="tiny muted upper" style={{ marginBottom: 6 }}>Isi Group Instruction Package (SA 600 ¶40)</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 14px' }}>
                {INSTR_CONTENT.map((t, i) => (
                  <div key={i} className="row ac gap6 tiny"><span style={{ color: c.step >= 1 ? 'var(--green)' : 'var(--ink-4)' }}>{c.step >= 1 ? <I.check size={12} /> : <I.doc size={12} />}</span>{t}</div>
                ))}
              </div>
            </div>
            <div className="row gap8 ac" style={{ justifyContent: 'flex-end' }}>
              {c.step >= 5
                ? <div className="tiny" style={{ color: 'var(--green)', fontWeight: 600 }}><I.checkCircle size={13} style={{ verticalAlign: 'middle' }} /> Clearance selesai — bukti memadai</div>
                : <Btn sm variant="primary" onClick={() => advance(c)}>
                  {c.step === 0 ? <><I.send size={13} /> Kirim Instruksi</> : c.step >= 4 ? <><I.check size={13} /> Catat Clearance</> : c.step >= 3 ? <><I.download size={13} /> Terima Reporting Package</> : <><I.arrowRight size={13} /> Lanjut: {INSTR_STEPS[c.step]}</>}
                </Btn>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ===== TAB 3 — EVALUASI AUDITOR KOMPONEN ====================== */
const EV_DIMS = [['Independensi & etika', 'evInd'], ['Kompetensi profesional', 'evComp'], ['Pemahaman regulasi lokal', 'evReg']];

function GAAuditor({ comps, setComp }) {
  const evColor = v => v >= 4 ? 'var(--green)' : v >= 3 ? 'var(--amber)' : 'var(--red)';
  return (
    <div style={{ padding: 14 }}>
      <div className="tiny muted" style={{ marginBottom: 12, lineHeight: 1.5 }}>
        Evaluasi pemahaman tim grup atas auditor komponen (SA 600 ¶19–20): independensi, kompetensi profesional, dan pemahaman lingkungan regulasi. Tingkat keterlibatan tim grup ditentukan berdasarkan signifikansi komponen dan hasil evaluasi.
      </div>
      <div className="grid" style={{ gap: 12 }}>
        {comps.map(c => {
          const avg = ((c.evInd + c.evComp + c.evReg) / 3);
          const reliable = avg >= 3.5;
          return (
            <div key={c.id} className="panel" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="row jb ac" style={{ padding: '11px 14px', background: 'var(--surface-2)', borderBottom: '1px solid var(--line)' }}>
                <div className="row ac gap8">
                  <span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{c.id}</span>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>{c.auditor}</span>
                  <span className="tiny muted">→ {c.name} · {c.country}</span>
                </div>
                <span className="badge" style={{ background: reliable ? 'var(--green)' : 'var(--amber)', color: '#fff' }}>Skor {avg.toFixed(1)}/5</span>
              </div>
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr 1.2fr', gap: 16, padding: 14, alignItems: 'center' }}>
                {EV_DIMS.map(([lbl, key]) => {
                  const v = c[key];
                  return (
                    <div key={key}>
                      <div className="row jb ac" style={{ marginBottom: 4 }}>
                        <span className="tiny" style={{ fontWeight: 600 }}>{lbl}</span>
                        <span className="mono tiny" style={{ fontWeight: 700, color: evColor(v) }}>{v}/5</span>
                      </div>
                      <div className="row gap4">
                        {[1, 2, 3, 4, 5].map(n => <button key={n} onClick={() => setComp(c.id, { [key]: n })} style={{ flex: 1, height: 13, borderRadius: 3, border: 0, cursor: 'pointer', background: n <= v ? evColor(v) : 'var(--surface-3)' }} />)}
                      </div>
                    </div>
                  );
                })}
                <div className="panel" style={{ padding: '9px 11px', background: reliable ? 'var(--green-bg)' : 'var(--amber-bg)', borderColor: 'transparent' }}>
                  <div className="tiny muted upper" style={{ marginBottom: 2 }}>Keputusan Keterlibatan</div>
                  <div className="tiny" style={{ fontWeight: 600, color: reliable ? 'var(--green)' : 'var(--amber)', lineHeight: 1.4 }}>
                    {reliable ? 'Dapat diandalkan — review terbatas atas kertas kerja kunci.' : 'Keandalan terbatas — keterlibatan langsung tim grup pada area berisiko.'}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ===== TAB 3.5 (BARU) — PAKET PELAPORAN KOMPONEN (IMPOR) ====== */
function GAFindings({ findings, totalSad, fmt }) {
  const pct = Math.min(100, totalSad / GROUP_MAT * 100);
  const exceeds = totalSad > GROUP_MAT;
  return (
    <div style={{ padding: 14 }}>
      <div className="grid" style={{ gridTemplateColumns: '1.5fr 1fr', gap: 12, alignItems: 'start' }}>
        <Panel noBody>
          <div className="panel-h"><h3>Temuan Teragregasi dari Auditor Komponen</h3><div style={{ flex: 1 }} /><span className="tiny muted">{findings.length} temuan dilaporkan</span></div>
          <table className="dtbl">
            <thead><tr><th style={{ width: 60 }}>ID</th><th>Komponen / Area</th><th style={{ width: 100 }}>Tingkat</th><th className="num">Dampak (SAD)</th><th style={{ width: 100 }}>Status</th></tr></thead>
            <tbody>
              {findings.map(f => (
                <tr key={f.id}>
                  <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{f.id}</td>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: 12 }}>{f.area}</div>
                    <div className="tiny muted">{f.comp} · {f.auditor}</div>
                    <div className="tiny muted" style={{ lineHeight: 1.4, marginTop: 2, whiteSpace: 'normal' }}>{f.note}</div>
                  </td>
                  <td><Badge kind={SEV_GA[f.sev]}>{f.sev}</Badge></td>
                  <td className="num mono" style={{ color: f.status === 'Terbuka' ? 'var(--red)' : 'var(--ink-3)' }}>{f.sad ? fmt(f.sad / 1e6, 0) + ' jt' : '—'}</td>
                  <td><Badge kind={f.status === 'Terbuka' ? 'red' : 'green'}>{f.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <div className="grid" style={{ gap: 12 }}>
          <Panel title="Agregasi SAD vs Materialitas Grup">
            <div className="row jb ac" style={{ marginBottom: 4 }}>
              <span className="tiny muted">SAD terbuka teragregasi</span>
              <span className="mono" style={{ fontWeight: 700, color: exceeds ? 'var(--red)' : 'var(--amber)' }}>Rp {fmt(totalSad / 1e6, 0)} jt</span>
            </div>
            <div style={{ position: 'relative', height: 16, background: 'var(--surface-3)', borderRadius: 8, overflow: 'hidden', marginBottom: 6 }}>
              <div style={{ position: 'absolute', inset: 0, width: pct + '%', background: exceeds ? 'var(--red)' : 'var(--amber)', borderRadius: 8 }} />
            </div>
            <div className="row jb tiny muted">
              <span>0</span>
              <span>Group materiality Rp {fmt(GROUP_MAT / 1e9, 1)} M</span>
            </div>
            <div className="divider" />
            <div className="panel" style={{ padding: '8px 11px', background: exceeds ? 'var(--red-bg)' : 'var(--green-bg)', borderColor: 'transparent' }}>
              <div className="tiny" style={{ fontWeight: 600, color: exceeds ? 'var(--red)' : 'var(--green)', lineHeight: 1.4 }}>
                {exceeds ? 'SAD melampaui materialitas grup — diperlukan koreksi atau dampak opini.' : 'SAD teragregasi di bawah materialitas grup — tidak material terhadap LK konsolidasian.'}
              </div>
            </div>
          </Panel>

          <Panel title="Kesimpulan Audit Grup">
            <div style={{ display: 'grid', gap: 8 }}>
              {[
                ['Bukti audit yang cukup & tepat diperoleh atas komponen signifikan', true],
                ['Komunikasi dua arah dengan auditor komponen memadai', true],
                ['Proses konsolidasi & eliminasi ditelaah', true],
                ['SAD teragregasi di bawah materialitas grup', !exceeds],
              ].map(([t, ok], i) => (
                <div key={i} className="row ac gap8 tiny">
                  <span style={{ color: ok ? 'var(--green)' : 'var(--red)' }}>{ok ? <I.checkCircle size={14} /> : <I.alert size={14} />}</span>
                  <span style={{ lineHeight: 1.35 }}>{t}</span>
                </div>
              ))}
            </div>
            <div className="divider" />
            <Btn variant="primary" style={{ width: '100%' }}><I.download size={14} /> Finalisasi Group Audit Memo</Btn>
          </Panel>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { GroupAudit });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { GA_CONSOL_DOWN, GA_CONSOL_PROC, GA_CONSOL_UP, GroupAudit, PKG_FIELDS, PKG_NUM_KEYS, PKG_STATUS_KIND };
