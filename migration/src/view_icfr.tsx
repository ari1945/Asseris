/* [codemod] ESM imports */
import React from 'react';
import { I } from './icons';
import { SubBar } from './shell.jsx';
import { Badge, Btn, Panel, Seg, Stat, Tabs } from './ui.jsx';
import { KvBox } from './view_analytical';

/* ============================================================
   Asseris — Internal Control (ICFR)
   Tabs: Ringkasan & COSO · Risk-Control Matrix · ITGC · Evaluasi Defisiensi
   Refs: SA 315 (pemahaman) · SA 330 (uji kontrol) · SA 265 (komunikasi defisiensi)
   ============================================================ */
const { useState: useStateIC } = React;

const ASSERTIONS = ['C', 'E', 'A', 'V', 'CO', 'RO']; // Completeness, Existence, Accuracy, Valuation, Cut-off, Rights&Obligations
const ASSERTION_FULL = { C: 'Completeness', E: 'Existence / Occurrence', A: 'Accuracy', V: 'Valuation', CO: 'Cut-off', RO: 'Rights & Obligations' };

const IC_CYCLES = [
  { id: 'rev', name: 'Pendapatan & Piutang', amt: 'Rp 842 M', sig: true, controls: [
    { id: 'R-01', desc: 'Persetujuan kredit pelanggan oleh Credit Manager sebelum order diproses', type: 'Preventive', nature: 'Manual', freq: 'Per transaksi', asr: ['E', 'V'], wt: true, design: 'Effective', oper: 'Effective' },
    { id: 'R-02', desc: 'Three-way match otomatis (SO–DO–Invoice) dalam sistem ERP', type: 'Preventive', nature: 'Automated', freq: 'Per transaksi', asr: ['C', 'A', 'CO'], wt: true, design: 'Effective', oper: 'Effective', itgc: 'access' },
    { id: 'R-03', desc: 'Review bulanan aging piutang oleh Finance Controller', type: 'Detective', nature: 'Manual', freq: 'Bulanan', asr: ['V'], wt: true, design: 'Effective', oper: 'Deficiency' },
    { id: 'R-04', desc: 'Rekonsiliasi sub-ledger piutang ke buku besar', type: 'Detective', nature: 'Manual', freq: 'Bulanan', asr: ['C', 'A'], wt: false, design: 'Effective', oper: 'Not tested' },
  ]},
  { id: 'pur', name: 'Pembelian & Utang', amt: 'Rp 514 M', sig: true, controls: [
    { id: 'P-01', desc: 'Purchase requisition disetujui sesuai matriks otorisasi', type: 'Preventive', nature: 'Manual', freq: 'Per transaksi', asr: ['E', 'RO'], wt: true, design: 'Effective', oper: 'Effective' },
    { id: 'P-02', desc: 'Pencocokan PO–GR–Invoice otomatis sebelum pembayaran', type: 'Preventive', nature: 'Automated', freq: 'Per transaksi', asr: ['C', 'A'], wt: true, design: 'Effective', oper: 'Effective', itgc: 'access' },
    { id: 'P-03', desc: 'Review pembayaran ganda (duplicate payment) oleh sistem', type: 'Detective', nature: 'Automated', freq: 'Per transaksi', asr: ['A'], wt: true, design: 'Effective', oper: 'Effective', itgc: 'change' },
  ]},
  { id: 'inv', name: 'Persediaan', amt: 'Rp 376 M', sig: true, controls: [
    { id: 'I-01', desc: 'Stock opname berkala dengan rekonsiliasi selisih', type: 'Detective', nature: 'Manual', freq: 'Kuartalan', asr: ['E', 'C'], wt: true, design: 'Effective', oper: 'Effective' },
    { id: 'I-02', desc: 'Review keusangan & perhitungan NRV persediaan', type: 'Detective', nature: 'Manual', freq: 'Kuartalan', asr: ['V'], wt: true, design: 'Deficiency', oper: 'Deficiency' },
    { id: 'I-03', desc: 'Pembatasan akses fisik gudang (access card)', type: 'Preventive', nature: 'Automated', freq: 'Berkelanjutan', asr: ['E'], wt: false, design: 'Effective', oper: 'Not tested', itgc: 'access' },
  ]},
  { id: 'pay', name: 'Penggajian', amt: 'Rp 198 M', sig: false, controls: [
    { id: 'G-01', desc: 'Persetujuan perubahan master data karyawan oleh HR Head', type: 'Preventive', nature: 'Manual', freq: 'Per perubahan', asr: ['E', 'A'], wt: true, design: 'Effective', oper: 'Effective' },
    { id: 'G-02', desc: 'Rekonsiliasi payroll register ke buku besar', type: 'Detective', nature: 'Manual', freq: 'Bulanan', asr: ['C', 'A'], wt: true, design: 'Effective', oper: 'Effective' },
  ]},
  { id: 'cash', name: 'Kas & Bank', amt: 'Rp 121 M', sig: false, controls: [
    { id: 'C-01', desc: 'Rekonsiliasi bank bulanan di-review independen', type: 'Detective', nature: 'Manual', freq: 'Bulanan', asr: ['E', 'C', 'A'], wt: true, design: 'Effective', oper: 'Effective' },
    { id: 'C-02', desc: 'Dual authorization untuk transfer > Rp 500 jt', type: 'Preventive', nature: 'Automated', freq: 'Per transaksi', asr: ['E', 'RO'], wt: true, design: 'Effective', oper: 'Effective', itgc: 'access' },
  ]},
  { id: 'fr', name: 'Pelaporan Keuangan', amt: 'Seluruh akun', sig: true, controls: [
    { id: 'F-01', desc: 'Review jurnal manual oleh Financial Controller sebelum posting', type: 'Detective', nature: 'Manual', freq: 'Per jurnal', asr: ['A', 'CO'], wt: true, design: 'Effective', oper: 'Deficiency' },
    { id: 'F-02', desc: 'Rekonsiliasi seluruh akun neraca sebelum closing', type: 'Detective', nature: 'Manual', freq: 'Bulanan', asr: ['C', 'A', 'V'], wt: true, design: 'Effective', oper: 'Effective' },
  ]},
];

const WT_STEPS = ['Pilih transaksi representatif dari populasi', 'Inspeksi dokumen sumber & bukti otorisasi', 'Telusuri pemrosesan melalui sistem/proses', 'Konfirmasi pelaksanaan kontrol oleh pelaksana', 'Evaluasi rancangan & implementasi kontrol'];

/* ---- COSO 2013: 5 komponen · 17 prinsip (entity-level controls) ---- */
const COSO = [
  { id: 'ce', no: 'I', name: 'Lingkungan Pengendalian', en: 'Control Environment', icon: 'building',
    desc: 'Fondasi disiplin & struktur — integritas, nilai etika, kompetensi, dan pengawasan dewan.',
    principles: [
      { n: 1, t: 'Komitmen terhadap integritas & nilai etika', pf: 'Ya', note: 'Kode etik formal ditandatangani tahunan; kanal whistleblowing aktif & ditindaklanjuti.' },
      { n: 2, t: 'Pengawasan independen oleh Dewan Komisaris / Komite Audit', pf: 'Ya', note: 'Komite Audit 3 anggota (2 independen), rapat kuartalan, piagam terdokumentasi.' },
      { n: 3, t: 'Penetapan struktur, wewenang & tanggung jawab', pf: 'Ya', note: 'Bagan organisasi & matriks otorisasi (LoA) mutakhir.' },
      { n: 4, t: 'Komitmen terhadap kompetensi', pf: 'Ya', note: 'Program pelatihan & evaluasi kompetensi berkala per fungsi.' },
      { n: 5, t: 'Penegakan akuntabilitas atas tanggung jawab pengendalian', pf: 'Sebagian', note: 'KPI pengendalian belum sepenuhnya tertaut ke remunerasi/penilaian kinerja.' },
    ]},
  { id: 'ra', no: 'II', name: 'Penilaian Risiko', en: 'Risk Assessment', icon: 'target',
    desc: 'Penetapan sasaran yang jelas serta identifikasi & analisis risiko pencapaiannya.',
    principles: [
      { n: 6, t: 'Penetapan sasaran yang memadai & jelas', pf: 'Ya', note: 'Sasaran pelaporan keuangan selaras SAK & ekspektasi regulator.' },
      { n: 7, t: 'Identifikasi & analisis risiko', pf: 'Ya', note: 'Risk register entitas dimutakhirkan tahunan oleh manajemen.' },
      { n: 8, t: 'Penilaian risiko kecurangan (fraud)', pf: 'Sebagian', note: 'Fraud risk assessment formal belum mencakup skenario override manajemen secara eksplisit.' },
      { n: 9, t: 'Identifikasi & analisis perubahan signifikan', pf: 'Ya', note: 'Dampak ERP go-live & PSAK baru dinilai sebelum implementasi.' },
    ]},
  { id: 'ca', no: 'III', name: 'Aktivitas Pengendalian', en: 'Control Activities', icon: 'sliders',
    desc: 'Pemilihan & pengembangan aktivitas pengendalian, termasuk pengendalian umum teknologi.',
    principles: [
      { n: 10, t: 'Pemilihan & pengembangan aktivitas pengendalian', pf: 'Ya', note: 'RCM lengkap untuk 6 siklus signifikan; campuran preventif & detektif.' },
      { n: 11, t: 'Pemilihan & pengembangan pengendalian umum atas teknologi (ITGC)', pf: 'Ya', note: 'ITGC ERP teruji; lihat tab ITGC (1 defisiensi SoD terbuka).' },
      { n: 12, t: 'Penerapan melalui kebijakan & prosedur', pf: 'Ya', note: 'SOP terdokumentasi & disosialisasikan ke pelaksana.' },
    ]},
  { id: 'ic', no: 'IV', name: 'Informasi & Komunikasi', en: 'Information & Communication', icon: 'link2',
    desc: 'Memperoleh/menghasilkan informasi relevan-berkualitas serta mengomunikasikannya.',
    principles: [
      { n: 13, t: 'Penggunaan informasi yang relevan & berkualitas', pf: 'Ya', note: 'Sumber data closing tervalidasi; data dictionary terpelihara.' },
      { n: 14, t: 'Komunikasi internal atas tujuan & tanggung jawab pengendalian', pf: 'Ya', note: 'Kebijakan & eskalasi terkomunikasi via intranet & onboarding.' },
      { n: 15, t: 'Komunikasi eksternal (regulator, auditor, pihak terkait)', pf: 'Ya', note: 'Mekanisme pelaporan eksternal & respons keluhan tersedia.' },
    ]},
  { id: 'mo', no: 'V', name: 'Pemantauan', en: 'Monitoring Activities', icon: 'pulse',
    desc: 'Evaluasi berkelanjutan & terpisah serta evaluasi dan komunikasi defisiensi.',
    principles: [
      { n: 16, t: 'Evaluasi berkelanjutan dan/atau terpisah', pf: 'Ya', note: 'Internal Audit menjalankan reviu berbasis risiko atas siklus utama.' },
      { n: 17, t: 'Evaluasi & komunikasi defisiensi secara tepat waktu', pf: 'Sebagian', note: 'Pelacakan remediasi temuan IA belum konsisten ditutup tepat waktu.' },
    ]},
];

/* ---- ITGC: 4 domain (dasar keandalan kontrol aplikasi otomatis) ---- */
const ITGC = [
  { id: 'access', name: 'Akses ke Program & Data', en: 'Access to Programs & Data', icon: 'lock', status: 'Deficiency',
    sys: 'ERP SAP S/4HANA · Payroll · Bank Portal',
    controls: [
      { t: 'Provisioning & deprovisioning user lewat tiket disetujui atasan', r: 'Effective' },
      { t: 'User access review (UAR) periodik tiap kuartal', r: 'Effective' },
      { t: 'Segregation of Duties — konflik role kritikal dimonitor & dibersihkan', r: 'Deficiency' },
      { t: 'Pengelolaan akun istimewa (privileged/superuser) & logging', r: 'Effective' },
      { t: 'Kebijakan kata sandi kuat + MFA untuk akses jarak jauh', r: 'Effective' },
    ]},
  { id: 'change', name: 'Manajemen Perubahan Program', en: 'Program Changes', icon: 'sync', status: 'Effective',
    sys: 'ERP SAP S/4HANA',
    controls: [
      { t: 'Permintaan perubahan disetujui sebelum migrasi ke produksi', r: 'Effective' },
      { t: 'Pengujian & UAT terdokumentasi sebelum rilis', r: 'Effective' },
      { t: 'Pemisahan lingkungan dev / QA / produksi', r: 'Effective' },
      { t: 'Emergency change ditinjau retrospektif & disahkan', r: 'Effective' },
    ]},
  { id: 'dev', name: 'Pengembangan Program (SDLC)', en: 'Program Development', icon: 'layers', status: 'Effective',
    sys: 'Proyek ERP go-live & enhancement',
    controls: [
      { t: 'Metodologi SDLC dengan tahapan & approval gate', r: 'Effective' },
      { t: 'User acceptance testing sebelum cut-over', r: 'Effective' },
      { t: 'Kontrol konversi & rekonsiliasi migrasi data', r: 'Effective' },
    ]},
  { id: 'ops', name: 'Operasi Komputer', en: 'Computer Operations', icon: 'server', status: 'Effective',
    sys: 'Data center & batch scheduler',
    controls: [
      { t: 'Penjadwalan & pemantauan batch job + penanganan kegagalan', r: 'Effective' },
      { t: 'Backup berkala & pengujian pemulihan (restore test)', r: 'Effective' },
      { t: 'Manajemen insiden & masalah dengan SLA', r: 'Effective' },
    ]},
];
const ITGC_LABEL = { access: 'Akses ke Program & Data', change: 'Manajemen Perubahan', dev: 'Pengembangan Program', ops: 'Operasi Komputer' };

/* ============================================================ */
function InternalControl() {
  const [tab, setTab] = useStateIC('overview');
  const [data, setData] = useStateIC(IC_CYCLES);

  const allControls = data.flatMap(c => c.controls);
  const defCount = allControls.filter(c => c.design === 'Deficiency' || c.oper === 'Deficiency').length + 1; // +1 ITGC SoD

  const tabs = [
    { id: 'overview', label: 'Ringkasan & COSO' },
    { id: 'matrix', label: 'Risk-Control Matrix', count: allControls.length },
    { id: 'itgc', label: 'ITGC' },
    { id: 'deficiency', label: 'Evaluasi Defisiensi', count: defCount },
  ];

  return (
    <>
      <SubBar moduleId="icfr" right={
        <div className="row gap8 ac">
          <Badge kind="blue">SA 315 · 330 · 265</Badge>
          <Btn sm><I.download size={13} /> Export Matriks</Btn>
          <Btn sm variant="primary"><I.plus size={14} /> Kontrol Baru</Btn>
        </div>
      } />
      <div className="view-scroll">
        <div className="view-pad">
          <div style={{ marginBottom: 12 }}><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>
          {tab === 'overview' && <ICEntityLevel data={data} />}
          {tab === 'matrix' && <ICMatrix data={data} setData={setData} />}
          {tab === 'itgc' && <ICITGC data={data} />}
          {tab === 'deficiency' && <ICDeficiency data={data} />}
        </div>
      </div>
    </>
  );
}

/* ============================================================
   TAB 1 — Ringkasan & COSO entity-level controls
   ============================================================ */
const cosoPF = (cy) => { // component-level present & functioning verdict
  const part = cy.principles.filter(p => p.pf === 'Sebagian').length;
  const no = cy.principles.filter(p => p.pf === 'Tidak').length;
  return no ? 'red' : part ? 'amber' : 'green';
};

function ICEntityLevel({ data }) {
  const [selId, setSelId] = useStateIC('ce');
  const sel = COSO.find(c => c.id === selId);

  const allP = COSO.flatMap(c => c.principles);
  const full = allP.filter(p => p.pf === 'Ya').length;
  const part = allP.filter(p => p.pf === 'Sebagian').length;

  const sigCycles = data.filter(c => c.sig).length;

  return (
    <div className="grid" style={{ gap: 12 }}>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={`${full}/17`} label="Prinsip ada & berfungsi" accent="var(--green)" /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={part} label="Perlu peningkatan" accent="var(--amber)" /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={`${sigCycles}/${data.length}`} label="Siklus signifikan" /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value="Andalkan" label="Strategi kontrol" accent="var(--blue)" /></div></Panel>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '260px 1fr', gap: 12, alignItems: 'start' }}>
        {/* component rail */}
        <Panel title="Komponen COSO 2013">
          <div style={{ display: 'grid', gap: 4 }}>
            {COSO.map(cy => {
              const k = cosoPF(cy);
              const on = cy.id === selId;
              return (
                <div key={cy.id} onClick={() => setSelId(cy.id)} style={{ padding: '10px 11px', borderRadius: 8, cursor: 'pointer', background: on ? 'var(--blue-050)' : 'transparent', border: '1px solid ' + (on ? 'var(--blue)' : 'var(--line-soft)') }}>
                  <div className="row ac gap8">
                    <span style={{ width: 26, height: 26, borderRadius: 7, flex: '0 0 26px', display: 'grid', placeItems: 'center', background: on ? 'var(--blue)' : 'var(--surface-3)', color: on ? '#fff' : 'var(--ink-3)' }}>{(I[cy.icon] || I.panel)({ size: 15 })}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="row ac gap6"><span className="mono tiny muted" style={{ fontWeight: 700 }}>{cy.no}</span><span style={{ fontSize: 12.5, fontWeight: 600 }}>{cy.name}</span></div>
                      <div className="tiny muted">{cy.principles.length} prinsip</div>
                    </div>
                    <span style={{ width: 9, height: 9, borderRadius: '50%', background: `var(--${k})` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        {/* component detail */}
        <div className="grid" style={{ gap: 12 }}>
          <Panel noBody>
            <div style={{ background: 'var(--surface-2)', padding: '12px 16px', borderBottom: '1px solid var(--line)' }} className="row ac gap10">
              <span style={{ width: 34, height: 34, borderRadius: 9, display: 'grid', placeItems: 'center', background: 'var(--blue-100)', color: 'var(--blue)', flex: '0 0 34px' }}>{(I[sel.icon] || I.panel)({ size: 19 })}</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{sel.no}. {sel.name}</div>
                <div className="tiny muted">{sel.en}</div>
              </div>
              <div style={{ flex: 1 }} />
              <Badge kind={cosoPF(sel) === 'green' ? 'green' : cosoPF(sel) === 'amber' ? 'amber' : 'red'}>{cosoPF(sel) === 'green' ? 'Memadai' : cosoPF(sel) === 'amber' ? 'Perlu peningkatan' : 'Defisiensi'}</Badge>
            </div>
            <div style={{ padding: '10px 16px', fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.5, borderBottom: '1px solid var(--line-soft)' }}>{sel.desc}</div>
            <div style={{ padding: '4px 0' }}>
              {sel.principles.map((p, i) => {
                const c = p.pf === 'Ya' ? 'var(--green)' : p.pf === 'Sebagian' ? 'var(--amber)' : 'var(--red)';
                return (
                  <div key={p.n} className="row gap10" style={{ padding: '11px 16px', alignItems: 'flex-start', borderBottom: i < sel.principles.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
                    <span className="mono tiny" style={{ flex: '0 0 26px', width: 26, height: 22, borderRadius: 6, background: 'var(--surface-3)', color: 'var(--ink-3)', display: 'grid', placeItems: 'center', fontWeight: 700 }}>P{p.n}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.4 }}>{p.t}</div>
                      <div className="tiny muted" style={{ marginTop: 2, lineHeight: 1.45 }}>{p.note}</div>
                    </div>
                    <span className="row ac gap6 tiny" style={{ flex: '0 0 auto', color: c, fontWeight: 600 }}>
                      {p.pf === 'Ya' ? <I.checkCircle size={14} /> : <I.alert size={14} />}{p.pf === 'Ya' ? 'Ada & berfungsi' : p.pf}
                    </span>
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel noBody>
            <div className="panel" style={{ padding: '11px 13px', background: 'var(--blue-050)', borderColor: 'var(--blue-100)', margin: 12 }}>
              <div className="row gap8" style={{ alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--blue)', flex: '0 0 auto' }}><I.book size={15} /></span>
                <span style={{ fontSize: 12, lineHeight: 1.55 }}>
                  <b>Kesimpulan entity-level (SA 315.21).</b> {full} dari 17 prinsip <b>ada &amp; berfungsi</b>; {part} prinsip perlu peningkatan (P5 akuntabilitas, P8 risiko kecurangan, P17 komunikasi defisiensi) namun tidak menghalangi strategi <b>mengandalkan pengendalian</b> pada siklus signifikan. Defisiensi entity-level dipertimbangkan saat menilai sifat &amp; luas pengujian substantif dan kerentanan terhadap <b>override manajemen</b>.
                </span>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   TAB 2 — Risk-Control Matrix + walkthrough + Test of Controls
   ============================================================ */
function ICMatrix({ data, setData }) {
  const [cycleId, setCycleId] = useStateIC('rev');
  const [selCtrl, setSelCtrl] = useStateIC('R-03');

  const cycle = data.find(c => c.id === cycleId);
  const ctrl = cycle.controls.find(c => c.id === selCtrl) || cycle.controls[0];

  const allControls = data.flatMap(c => c.controls);
  const deficiencies = allControls.filter(c => c.design === 'Deficiency' || c.oper === 'Deficiency').length;
  const tested = allControls.filter(c => c.oper !== 'Not tested').length;
  const effective = allControls.filter(c => c.oper === 'Effective').length;

  const setOper = (result) => setData(ds => ds.map(cy => cy.id !== cycleId ? cy : {
    ...cy, controls: cy.controls.map(c => c.id === ctrl.id ? { ...c, oper: result, wt: true } : c)
  }));

  const cycleEff = (cy) => {
    const def = cy.controls.filter(c => c.design === 'Deficiency' || c.oper === 'Deficiency').length;
    return def === 0 ? 'green' : def === 1 ? 'amber' : 'red';
  };
  const resultBadge = (v) => v === 'Effective' ? <Badge kind="green">{v}</Badge> : v === 'Deficiency' ? <Badge kind="red">{v}</Badge> : <Badge kind="gray">Not tested</Badge>;

  return (
    <div className="grid" style={{ gap: 12 }}>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={allControls.length} label="Total Kontrol" /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={`${tested}/${allControls.length}`} label="Telah Diuji" /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={effective} label="Operasi Efektif" accent="var(--green)" /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={deficiencies} label="Defisiensi" accent="var(--red)" /></div></Panel>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '220px 1fr', gap: 12, alignItems: 'start' }}>
        {/* cycles */}
        <Panel title="Siklus Bisnis">
          <div style={{ display: 'grid', gap: 2 }}>
            {data.map(cy => (
              <div key={cy.id} onClick={() => { setCycleId(cy.id); setSelCtrl(cy.controls[0].id); }} style={{ padding: '9px 10px', borderRadius: 7, cursor: 'pointer', background: cy.id === cycleId ? 'var(--blue-050)' : 'transparent', border: '1px solid ' + (cy.id === cycleId ? 'var(--blue)' : 'transparent') }}>
                <div className="row jb ac">
                  <span className="row ac gap6" style={{ fontSize: 12.5, fontWeight: 600 }}>{cy.name}{cy.sig && <span className="badge b-red" style={{ fontSize: 8, padding: '0 4px' }}>SIG</span>}</span>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: `var(--${cycleEff(cy)})` }} />
                </div>
                <div className="tiny muted">{cy.controls.length} kontrol · {cy.amt}</div>
              </div>
            ))}
          </div>
        </Panel>

        {/* matrix + detail */}
        <div className="grid" style={{ gap: 12 }}>
          <Panel noBody>
            <div className="panel-h"><h3>Risk-Control Matrix · {cycle.name}</h3><div style={{ flex: 1 }} /><span className="tiny muted">Klik kontrol untuk walkthrough</span></div>
            <table className="dtbl">
              <thead><tr>
                <th style={{ width: 54 }}>ID</th><th>Deskripsi Kontrol</th><th style={{ width: 80 }}>Tipe</th><th style={{ width: 78 }}>Sifat</th>
                {ASSERTIONS.map(a => <th key={a} className="num" style={{ width: 26 }} title={ASSERTION_FULL[a]}>{a}</th>)}
                <th style={{ width: 92 }}>Operasi</th>
              </tr></thead>
              <tbody>
                {cycle.controls.map(c => (
                  <tr key={c.id} className={c.id === ctrl.id ? 'sel' : ''} onClick={() => setSelCtrl(c.id)} style={{ cursor: 'pointer' }}>
                    <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{c.id}</td>
                    <td className="truncate" style={{ maxWidth: 280, whiteSpace: 'normal', lineHeight: 1.35, fontSize: 11.5 }}>{c.desc}</td>
                    <td><span className="tiny" style={{ color: c.type === 'Preventive' ? 'var(--blue)' : 'var(--purple)', fontWeight: 600 }}>{c.type === 'Preventive' ? 'Preventif' : 'Detektif'}</span></td>
                    <td><span className="chip tiny" style={{ height: 18 }}>{c.nature === 'Automated' ? 'Otomatis' : 'Manual'}</span></td>
                    {ASSERTIONS.map(a => (
                      <td key={a} className="num">{c.asr.includes(a) ? <span style={{ color: 'var(--green)' }}>●</span> : <span style={{ color: 'var(--line)' }}>·</span>}</td>
                    ))}
                    <td>{resultBadge(c.oper)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>

          {/* walkthrough detail */}
          <Panel noBody>
            <div style={{ background: 'var(--surface-2)', padding: '11px 14px', borderBottom: '1px solid var(--line)' }} className="row ac gap8">
              <span className="mono" style={{ fontWeight: 700, color: 'var(--blue)' }}>{ctrl.id}</span>
              <Badge kind={ctrl.type === 'Preventive' ? 'blue' : 'purple'}>{ctrl.type === 'Preventive' ? 'Preventif' : 'Detektif'}</Badge>
              <span className="chip tiny">{ctrl.nature === 'Automated' ? 'Otomatis' : 'Manual'}</span>
              {ctrl.itgc && <span className="chip tiny" style={{ background: 'var(--blue-100)', color: 'var(--blue)' }} title="Bergantung pada ITGC"><I.lock size={10} /> ITGC: {ITGC_LABEL[ctrl.itgc]}</span>}
              <span className="tiny muted">· {ctrl.freq}</span>
              <div style={{ flex: 1 }} />
              <span className="tiny muted">Asersi:</span>
              {ctrl.asr.map(a => <span key={a} className="badge b-green" style={{ padding: '1px 6px' }} title={ASSERTION_FULL[a]}>{a}</span>)}
            </div>
            <div style={{ padding: 14 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 12 }}>{ctrl.desc}</div>
              <div className="grid" style={{ gridTemplateColumns: '1.3fr 1fr', gap: 18 }}>
                <div>
                  <div className="tiny muted upper" style={{ marginBottom: 8 }}>Langkah Walkthrough (SA 315)</div>
                  <div style={{ display: 'grid', gap: 0 }}>
                    {WT_STEPS.map((s, i) => (
                      <div key={i} className="row gap8" style={{ padding: '6px 0', borderBottom: i < WT_STEPS.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
                        <span style={{ flex: '0 0 20px', width: 20, height: 20, borderRadius: '50%', background: ctrl.wt ? 'var(--green-bg)' : 'var(--surface-3)', color: ctrl.wt ? 'var(--green)' : 'var(--ink-4)', display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 700 }}>{ctrl.wt ? <I.check size={12} /> : i + 1}</span>
                        <span style={{ fontSize: 12, lineHeight: 1.4 }}>{s}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="tiny muted upper" style={{ marginBottom: 8 }}>Kesimpulan Pengujian</div>
                  <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                    <KvBox label="Rancangan (D&I)" v={ctrl.design} accent={ctrl.design === 'Effective' ? 'var(--green)' : 'var(--red)'} />
                    <KvBox label="Efektivitas Operasi" v={ctrl.oper} accent={ctrl.oper === 'Effective' ? 'var(--green)' : ctrl.oper === 'Deficiency' ? 'var(--red)' : 'var(--ink-4)'} />
                  </div>
                  {(ctrl.design === 'Deficiency' || ctrl.oper === 'Deficiency') && (
                    <div className="panel" style={{ padding: '9px 11px', background: 'var(--red-bg)', borderColor: 'transparent', marginBottom: 12 }}>
                      <div className="row ac gap8"><span style={{ color: 'var(--red)' }}><I.alert size={15} /></span><span style={{ fontSize: 11.5, lineHeight: 1.4 }}>Defisiensi teridentifikasi — nilai severity di tab <b>Evaluasi Defisiensi</b> &amp; rancang prosedur substantif tambahan.</span></div>
                    </div>
                  )}
                  <div className="tiny muted upper" style={{ marginBottom: 6 }}>Test of Controls (Atribut · SA 330)</div>
                  <TestOfControls ctrl={ctrl} onConclude={(result) => setOper(result)} />
                </div>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

/* Attribute Test of Controls — sample size by frequency, record deviations, conclude */
const { useState: useStateTOC } = React;
const TOC_SAMPLE = { 'Per transaksi': 25, 'Per jurnal': 25, 'Berkelanjutan': 25, 'Bulanan': 12, 'Kuartalan': 5, 'Per perubahan': 15, 'Per perikatan': 2 };
function TestOfControls({ ctrl, onConclude }) {
  const baseN = TOC_SAMPLE[ctrl.freq] || 25;
  const [n] = useStateTOC(baseN);
  const [tested, setTested] = useStateTOC(0);
  const [dev, setDev] = useStateTOC(0);
  const devRate = tested ? (dev / tested * 100) : 0;
  const tdr = 5; // tolerable deviation rate %
  const projUpper = tested ? devRate + (dev === 0 ? (300 / tested) : devRate * 0.9) : 100;
  const done = tested >= n;
  const effective = done && projUpper <= tdr;

  const run = () => {
    const expectDev = (ctrl.design === 'Deficiency' || ctrl.oper === 'Deficiency') ? Math.max(2, Math.round(n * 0.12)) : (ctrl.oper === 'Effective' ? 0 : (Math.random() < 0.3 ? 1 : 0));
    setTested(n); setDev(expectDev);
  };
  React.useEffect(() => { setTested(0); setDev(0); }, [ctrl.id]);

  return (
    <div>
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 9 }}>
        <KvBox label="Ukuran Sampel" v={n + ' item'} />
        <KvBox label="Diuji" v={tested + '/' + n} />
        <KvBox label="Deviasi" v={dev} accent={dev ? 'var(--red)' : 'var(--green)'} />
      </div>
      {!done ? (
        <Btn sm variant="primary" style={{ width: '100%' }} onClick={run}><I.flask size={13} /> Jalankan Pengujian ({n} item · frekuensi {ctrl.freq})</Btn>
      ) : (
        <>
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 9 }}>
            <KvBox label="Tingkat Deviasi" v={devRate.toFixed(1) + '%'} accent={devRate > tdr ? 'var(--red)' : 'var(--green)'} />
            <KvBox label="Batas Atas (vs TDR 5%)" v={Math.min(100, projUpper).toFixed(1) + '%'} accent={projUpper > tdr ? 'var(--red)' : 'var(--green)'} />
          </div>
          <div className="panel" style={{ padding: '9px 11px', background: effective ? 'var(--green-bg)' : 'var(--red-bg)', borderColor: 'transparent', marginBottom: 9 }}>
            <div className="row ac gap8"><span style={{ color: effective ? 'var(--green)' : 'var(--red)' }}>{effective ? <I.checkCircle size={15} /> : <I.alert size={15} />}</span>
              <span className="tiny" style={{ fontWeight: 600, lineHeight: 1.4 }}>{effective ? 'Batas atas deviasi ≤ TDR — kontrol beroperasi efektif; andalkan & kurangi prosedur substantif.' : 'Batas atas deviasi > TDR — kontrol tidak efektif; perlakukan sebagai defisiensi & rancang prosedur substantif tambahan (tautkan ke SAD).'}</span>
            </div>
          </div>
          <div className="row gap6">
            <Btn sm onClick={run}><I.sync size={13} /> Ulang</Btn>
            <Btn sm variant="primary" style={{ flex: 1 }} onClick={() => onConclude(effective ? 'Effective' : 'Deficiency')}><I.check size={13} /> Simpulkan: {effective ? 'Efektif' : 'Defisiensi'}</Btn>
          </div>
        </>
      )}
    </div>
  );
}

/* ============================================================
   TAB 3 — ITGC (IT General Controls)
   ============================================================ */
function ICITGC({ data }) {
  const [selId, setSelId] = useStateIC('access');
  const sel = ITGC.find(d => d.id === selId);

  // automated app controls that depend on each ITGC domain
  const autoControls = data.flatMap(cy => cy.controls.filter(c => c.nature === 'Automated').map(c => ({ ...c, cycle: cy.name })));
  const dependents = autoControls.filter(c => c.itgc === selId);
  const effDomains = ITGC.filter(d => d.status === 'Effective').length;

  const rBadge = (r) => r === 'Effective' ? <Badge kind="green">Efektif</Badge> : r === 'Deficiency' ? <Badge kind="red">Defisiensi</Badge> : <Badge kind="gray">Belum diuji</Badge>;

  return (
    <div className="grid" style={{ gap: 12 }}>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={`${effDomains}/4`} label="Domain ITGC efektif" accent={effDomains === 4 ? 'var(--green)' : 'var(--amber)'} /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={autoControls.length} label="Kontrol aplikasi otomatis" /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value="1" label="Defisiensi ITGC (SoD)" accent="var(--red)" /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value="SAP S/4" label="Sistem signifikan" accent="var(--blue)" /></div></Panel>
      </div>

      <Panel noBody>
        <div className="panel" style={{ padding: '11px 13px', background: 'var(--blue-050)', borderColor: 'var(--blue-100)', margin: 12 }}>
          <div className="row gap8" style={{ alignItems: 'flex-start' }}>
            <span style={{ color: 'var(--blue)', flex: '0 0 auto' }}><I.book size={15} /></span>
            <span style={{ fontSize: 12, lineHeight: 1.55 }}>
              <b>Prinsip keandalan.</b> Kontrol aplikasi yang <b>otomatis</b> hanya dapat diandalkan bila <b>ITGC pendukungnya efektif</b> (akses, perubahan, pengembangan, operasi). Defisiensi ITGC dapat meniadakan keandalan kontrol otomatis terkait dan memicu pengujian substantif tambahan.
            </span>
          </div>
        </div>
      </Panel>

      <div className="grid" style={{ gridTemplateColumns: '280px 1fr', gap: 12, alignItems: 'start' }}>
        <Panel title="Domain ITGC">
          <div style={{ display: 'grid', gap: 4 }}>
            {ITGC.map(d => {
              const on = d.id === selId;
              const k = d.status === 'Effective' ? 'green' : d.status === 'Deficiency' ? 'red' : 'amber';
              return (
                <div key={d.id} onClick={() => setSelId(d.id)} style={{ padding: '10px 11px', borderRadius: 8, cursor: 'pointer', background: on ? 'var(--blue-050)' : 'transparent', border: '1px solid ' + (on ? 'var(--blue)' : 'var(--line-soft)') }}>
                  <div className="row ac gap8">
                    <span style={{ width: 26, height: 26, borderRadius: 7, flex: '0 0 26px', display: 'grid', placeItems: 'center', background: on ? 'var(--blue)' : 'var(--surface-3)', color: on ? '#fff' : 'var(--ink-3)' }}>{(I[d.icon] || I.panel)({ size: 15 })}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600 }}>{d.name}</div>
                      <div className="tiny muted">{d.controls.length} kontrol</div>
                    </div>
                    <span style={{ width: 9, height: 9, borderRadius: '50%', background: `var(--${k})` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        <div className="grid" style={{ gap: 12 }}>
          <Panel noBody>
            <div style={{ background: 'var(--surface-2)', padding: '12px 16px', borderBottom: '1px solid var(--line)' }} className="row ac gap10">
              <span style={{ width: 34, height: 34, borderRadius: 9, display: 'grid', placeItems: 'center', background: 'var(--blue-100)', color: 'var(--blue)', flex: '0 0 34px' }}>{(I[sel.icon] || I.panel)({ size: 19 })}</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{sel.name}</div>
                <div className="tiny muted">{sel.en} · {sel.sys}</div>
              </div>
              <div style={{ flex: 1 }} />
              {rBadge(sel.status)}
            </div>
            <table className="dtbl">
              <thead><tr><th style={{ width: 30 }}>#</th><th>Pengendalian Umum TI</th><th style={{ width: 110 }}>Hasil Uji</th></tr></thead>
              <tbody>
                {sel.controls.map((c, i) => (
                  <tr key={i}>
                    <td className="mono tiny muted">{i + 1}</td>
                    <td style={{ fontSize: 12, whiteSpace: 'normal', lineHeight: 1.4 }}>{c.t}</td>
                    <td>{rBadge(c.r)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {sel.status === 'Deficiency' && (
              <div className="panel" style={{ padding: '9px 11px', background: 'var(--red-bg)', borderColor: 'transparent', margin: 12 }}>
                <div className="row gap8" style={{ alignItems: 'flex-start' }}><span style={{ color: 'var(--red)' }}><I.alert size={15} /></span><span className="tiny" style={{ lineHeight: 1.5 }}><b>Defisiensi SoD.</b> Sejumlah user memiliki kombinasi role konflik (buat &amp; setujui PO). Mitigasi: reviu detektif manual atas transaksi berisiko + perluasan substantif. Dieskalasi ke tab <b>Evaluasi Defisiensi</b>.</span></div>
              </div>
            )}
          </Panel>

          {/* dependency mapping */}
          <Panel noBody>
            <div className="panel-h"><h3>Kontrol Aplikasi yang Bergantung · {sel.name}</h3></div>
            {dependents.length === 0 ? (
              <div style={{ padding: 16 }} className="tiny muted">Tidak ada kontrol aplikasi otomatis yang dipetakan ke domain ini.</div>
            ) : (
              <table className="dtbl">
                <thead><tr><th style={{ width: 54 }}>ID</th><th>Kontrol Aplikasi (Otomatis)</th><th>Siklus</th><th style={{ width: 140 }}>Keandalan</th></tr></thead>
                <tbody>
                  {dependents.map(c => {
                    const reliable = sel.status === 'Effective';
                    return (
                      <tr key={c.id}>
                        <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{c.id}</td>
                        <td style={{ fontSize: 11.5, whiteSpace: 'normal', lineHeight: 1.35 }}>{c.desc}</td>
                        <td className="tiny muted">{c.cycle}</td>
                        <td>{reliable ? <span className="row ac gap6 tiny" style={{ color: 'var(--green)', fontWeight: 600 }}><I.checkCircle size={13} /> Dapat diandalkan</span> : <span className="row ac gap6 tiny" style={{ color: 'var(--amber)', fontWeight: 600 }}><I.alert size={13} /> Andalkan + mitigasi</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   TAB 4 — Evaluasi & Agregasi Defisiensi (SA 265)
   ============================================================ */
const LEVELS = ['Defisiensi Pengendalian', 'Defisiensi Signifikan', 'Kelemahan Material'];
const LEVEL_KIND = { 'Defisiensi Pengendalian': 'gray', 'Defisiensi Signifikan': 'amber', 'Kelemahan Material': 'red' };

function classifyDef(mag, lik, comp) {
  let lvl = (mag === 'Material' && lik === 'Wajar mungkin') ? 2 : (mag === 'Material' || lik === 'Wajar mungkin') ? 1 : 0;
  if (comp) lvl = Math.max(0, lvl - 1); // kontrol kompensasi efektif menurunkan severity
  return LEVELS[lvl];
}
const COMMS = {
  'Kelemahan Material': { who: 'Tertulis ke TCWG + Manajemen', ref: 'SA 265.9', resp: 'Perluas prosedur substantif; pertimbangkan dampak laporan; tautkan ke SAD.', icon: 'mail', kind: 'red' },
  'Defisiensi Signifikan': { who: 'Tertulis ke TCWG', ref: 'SA 265.9', resp: 'Rancang prosedur substantif responsif; cantumkan di management letter.', icon: 'mail', kind: 'amber' },
  'Defisiensi Pengendalian': { who: 'Management letter (pertimbangan profesional)', ref: 'SA 265.10', resp: 'Catat & pantau; dampak substantif terbatas.', icon: 'doc', kind: 'blue' },
};

/* seed assessments for each known deficiency */
const DEF_SEED = {
  'R-03': { mag: 'Material', lik: 'Wajar mungkin', comp: true, sad: 'SAD-04', cmp: 'Rekonsiliasi sub-ledger bulanan (R-04) sebagian memitigasi.' },
  'I-02': { mag: 'Material', lik: 'Wajar mungkin', comp: false, sad: 'SAD-07', cmp: 'Tidak ada kontrol kompensasi efektif atas penilaian NRV.' },
  'F-01': { mag: 'Material', lik: 'Remote', comp: false, sad: 'SAD-02', cmp: 'Rekonsiliasi akun (F-02) memberi keyakinan terbatas.' },
  'ITGC-SoD': { mag: 'Imaterial', lik: 'Wajar mungkin', comp: true, sad: 'SAD-05', cmp: 'Reviu detektif manual atas transaksi konflik role.' },
};

function ICDeficiency({ data }) {
  // collect deficiencies from matrix + ITGC SoD
  const matrixDefs = data.flatMap(cy => cy.controls
    .filter(c => c.design === 'Deficiency' || c.oper === 'Deficiency')
    .map(c => ({ id: c.id, src: cy.name, desc: c.desc, kind: c.design === 'Deficiency' ? 'Rancangan' : 'Operasi' })));
  const itgcDef = { id: 'ITGC-SoD', src: 'ITGC · Akses', desc: 'Segregation of Duties — kombinasi role konflik pada ERP (buat & setujui PO/pembayaran).', kind: 'Rancangan' };
  const defs = [...matrixDefs, itgcDef];

  const [assess, setAssess] = useStateIC(() => {
    const init = {};
    defs.forEach(d => { init[d.id] = DEF_SEED[d.id] || { mag: 'Material', lik: 'Wajar mungkin', comp: false, sad: '—', cmp: '—' }; });
    return init;
  });
  const [selId, setSelId] = useStateIC(defs[0]?.id);

  const classOf = (id) => { const a = assess[id]; return classifyDef(a.mag, a.lik, a.comp); };
  const counts = LEVELS.map(l => defs.filter(d => classOf(d.id) === l).length);
  const sel = defs.find(d => d.id === selId) || defs[0];
  const a = assess[sel.id];
  const cls = classifyDef(a.mag, a.lik, a.comp);
  const comm = COMMS[cls];

  const setA = (patch) => setAssess(s => ({ ...s, [sel.id]: { ...s[sel.id], ...patch } }));

  return (
    <div className="grid" style={{ gap: 12 }}>
      {/* aggregation summary */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={defs.length} label="Total Defisiensi" /></div></Panel>
        {LEVELS.map((l, i) => (
          <Panel key={l}><div style={{ padding: '11px 14px' }}><Stat value={counts[i]} label={l} accent={`var(--${LEVEL_KIND[l] === 'gray' ? 'ink-3' : LEVEL_KIND[l]})`} /></div></Panel>
        ))}
      </div>

      {counts[2] > 0 && (
        <Panel noBody>
          <div className="panel" style={{ padding: '11px 13px', background: 'var(--red-bg)', borderColor: 'transparent', margin: 12 }}>
            <div className="row gap8" style={{ alignItems: 'flex-start' }}><span style={{ color: 'var(--red)' }}><I.alert size={16} /></span><span style={{ fontSize: 12, lineHeight: 1.55 }}><b>{counts[2]} kelemahan material teragregasi.</b> Wajib dikomunikasikan secara tertulis kepada TCWG &amp; manajemen (SA 265.9) tepat waktu, dengan deskripsi dan dampak potensialnya terhadap laporan keuangan.</span></div>
          </div>
        </Panel>
      )}

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }}>
        {/* deficiency register */}
        <Panel noBody>
          <div className="panel-h"><h3>Register Defisiensi</h3><div style={{ flex: 1 }} /><span className="tiny muted">{defs.length} item · SA 265</span></div>
          <table className="dtbl">
            <thead><tr><th style={{ width: 64 }}>ID</th><th>Sumber</th><th style={{ width: 150 }}>Klasifikasi</th></tr></thead>
            <tbody>
              {defs.map(d => (
                <tr key={d.id} className={d.id === selId ? 'sel' : ''} onClick={() => setSelId(d.id)} style={{ cursor: 'pointer' }}>
                  <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{d.id}</td>
                  <td><div style={{ fontSize: 12, fontWeight: 600 }}>{d.src}</div><div className="tiny muted truncate" style={{ maxWidth: 230, whiteSpace: 'normal', lineHeight: 1.3 }}>{d.desc}</div></td>
                  <td><Badge kind={LEVEL_KIND[classOf(d.id)]}>{classOf(d.id)}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        {/* severity evaluator */}
        <Panel noBody>
          <div style={{ background: 'var(--surface-2)', padding: '11px 14px', borderBottom: '1px solid var(--line)' }} className="row ac gap8">
            <span className="mono" style={{ fontWeight: 700, color: 'var(--blue)' }}>{sel.id}</span>
            <span className="tiny muted">{sel.src}</span>
            <span className="chip tiny">{sel.kind}</span>
            <div style={{ flex: 1 }} />
            <Badge kind={LEVEL_KIND[cls]}>{cls}</Badge>
          </div>
          <div style={{ padding: 14 }}>
            <div style={{ fontSize: 12, lineHeight: 1.5, marginBottom: 14, color: 'var(--ink-2)' }}>{sel.desc}</div>

            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <div className="tiny muted upper" style={{ marginBottom: 5 }}>Magnitudo (potensi salah saji)</div>
                <Seg options={[{ value: 'Imaterial', label: 'Imaterial' }, { value: 'Material', label: 'Material' }]} value={a.mag} onChange={(v) => setA({ mag: v })} />
              </div>
              <div>
                <div className="tiny muted upper" style={{ marginBottom: 5 }}>Kemungkinan terjadi</div>
                <Seg options={[{ value: 'Remote', label: 'Remote' }, { value: 'Wajar mungkin', label: 'Wajar mungkin' }]} value={a.lik} onChange={(v) => setA({ lik: v })} />
              </div>
            </div>

            {/* 2x2 severity matrix */}
            <div className="tiny muted upper" style={{ marginBottom: 6 }}>Matriks Severity</div>
            <div className="grid" style={{ gridTemplateColumns: '70px 1fr 1fr', gap: 4, marginBottom: 14 }}>
              {[['Wajar mungkin'], ['Remote']].map(([lik]) => (
                <React.Fragment key={lik}>
                  <div className="tiny muted" style={{ display: 'grid', placeItems: 'center', textAlign: 'center', fontWeight: 600 }}>{lik}</div>
                  {['Imaterial', 'Material'].map(mag => {
                    const cellCls = classifyDef(mag, lik, a.comp);
                    const active = a.mag === mag && a.lik === lik;
                    const kc = LEVEL_KIND[cellCls];
                    const bg = kc === 'red' ? 'var(--red-bg)' : kc === 'amber' ? 'var(--amber-bg)' : 'var(--surface-2)';
                    const fg = kc === 'red' ? 'var(--red)' : kc === 'amber' ? 'var(--amber)' : 'var(--ink-3)';
                    return (
                      <div key={mag} style={{ padding: '9px 8px', borderRadius: 7, background: bg, border: '2px solid ' + (active ? fg : 'transparent'), textAlign: 'center' }}>
                        <div style={{ fontSize: 10.5, fontWeight: 700, color: fg, lineHeight: 1.25 }}>{cellCls.replace('Defisiensi ', 'Def. ')}</div>
                        {active && <div className="tiny" style={{ color: fg, marginTop: 2, fontWeight: 600 }}>● posisi</div>}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
              <div />
              <div className="tiny muted" style={{ textAlign: 'center', fontWeight: 600 }}>Imaterial</div>
              <div className="tiny muted" style={{ textAlign: 'center', fontWeight: 600 }}>Material →</div>
            </div>

            <label className="row ac gap8" style={{ marginBottom: 14, cursor: 'pointer' }} onClick={() => setA({ comp: !a.comp })}>
              <span style={{ flex: '0 0 32px', width: 32, height: 18, borderRadius: 9, background: a.comp ? 'var(--green)' : 'var(--line-strong)', position: 'relative', transition: '.15s' }}>
                <span style={{ position: 'absolute', top: 2, left: a.comp ? 16 : 2, width: 14, height: 14, borderRadius: '50%', background: '#fff', transition: '.15s' }} />
              </span>
              <span style={{ fontSize: 12, fontWeight: 600 }}>Kontrol kompensasi efektif tersedia</span>
            </label>
            {a.comp && <div className="tiny muted" style={{ marginTop: -8, marginBottom: 14, paddingLeft: 40, lineHeight: 1.4 }}>{a.cmp}</div>}

            {/* communication + response */}
            <div className="panel" style={{ padding: '11px 13px', background: comm.kind === 'red' ? 'var(--red-bg)' : comm.kind === 'amber' ? 'var(--amber-bg)' : 'var(--blue-050)', borderColor: 'transparent' }}>
              <div className="row ac gap8" style={{ marginBottom: 8 }}>
                <span style={{ color: `var(--${comm.kind})` }}>{(I[comm.icon] || I.mail)({ size: 16 })}</span>
                <span style={{ fontSize: 12.5, fontWeight: 700 }}>Komunikasi: {comm.who}</span>
                <div style={{ flex: 1 }} />
                <span className="chip tiny mono">{comm.ref}</span>
              </div>
              <div className="tiny" style={{ lineHeight: 1.5, marginBottom: 10 }}>{comm.resp}</div>
              <div className="row gap6">
                <span className="chip tiny" style={{ background: 'var(--surface)', cursor: 'pointer' }}><I.scale size={11} /> Tautkan {a.sad}</span>
                <span className="chip tiny" style={{ background: 'var(--surface)', cursor: 'pointer' }}><I.send size={11} /> Draft komunikasi TCWG</span>
              </div>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

Object.assign(window, { InternalControl });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { InternalControl };
