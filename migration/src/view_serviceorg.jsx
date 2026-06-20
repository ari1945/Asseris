/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { useNav } from './contexts.jsx';
import { I } from './icons.jsx';
import { SubBar } from './shell.jsx';
import { Badge, Btn, Panel, Tabs } from './ui.jsx';
import { KvBox } from './view_analytical.jsx';

/* ============================================================
   NeoSuite AMS — Service Organization / Organisasi Jasa (SA 402)
   Deep workpaper: pemetaan dampak, register laporan asurans (Type 1/2),
   evaluasi auditor jasa, CUEC, subservice & pengecualian, kesimpulan.
   ============================================================ */
const { useState: useStateSO } = React;

/* ---- service organizations register ---- */
const SO_ORGS = [
  {
    id: 'SO-01', name: 'PT Payroll Solusi Indonesia', svc: 'Pemrosesan Penggajian (outsourced payroll)',
    reportType: 'Type 2', std: 'ISAE 3402', period: 'Jan – Des 2025', coverage: 'full',
    auditor: 'KAP Wibisana, Surya & Rekan', opinion: 'Tanpa Modifikasi', method: 'Inclusive',
    subservice: null, icfr: true, sig: 'Tinggi', exc: 0, cuec: 5,
    areas: 'Beban Gaji · Utang Gaji · PPh 21 · BPJS', assertions: 'Akurasi · Kelengkapan · Pisah Batas',
    strategy: 'Andalkan kontrol Type 2 + uji CUEC + substantif terbatas', status: 'Memadai',
  },
  {
    id: 'SO-02', name: 'CloudKas Data Center', svc: 'Hosting ERP & General IT Controls',
    reportType: 'Type 2', std: 'SOC 1 (ISAE 3402)', period: 'Jul 2024 – Jun 2025', coverage: 'gap',
    auditor: 'Pratama Tech Assurance LLP', opinion: 'Dengan Pengecualian (qualified)', method: 'Carve-out',
    subservice: 'AWS (IaaS) — metode carve-out', icfr: true, sig: 'Tinggi', exc: 2, cuec: 8,
    areas: 'ITGC lintas siklus (akses, perubahan, operasi)', assertions: 'Seluruh asersi yang bergantung sistem',
    strategy: 'Roll-forward gap Jul–Des + prosedur tambahan atas 2 pengecualian', status: 'Ada Pengecualian',
  },
  {
    id: 'SO-03', name: 'PT Kustodian Sentral Efek', svc: 'Kustodi Efek & Administrasi Investasi',
    reportType: 'Type 1', std: 'ISAE 3402', period: 'Per 31 Des 2025', coverage: 'design',
    auditor: 'KAP Hadi Sasmita & Rekan', opinion: 'Tanpa Modifikasi (desain)', method: 'Inclusive',
    subservice: null, icfr: true, sig: 'Moderat', exc: 0, cuec: 3,
    areas: 'Investasi · Pendapatan Investasi', assertions: 'Keberadaan · Hak · Penilaian',
    strategy: 'Type 1 hanya desain — uji efektivitas operasi secara langsung / substantif', status: 'Type 1 — Desain Saja',
  },
  {
    id: 'SO-04', name: 'BillTrust Collections BPO', svc: 'Penagihan & Lockbox Piutang',
    reportType: 'Tidak Ada', std: '—', period: '—', coverage: 'none',
    auditor: '—', opinion: '—', method: '—',
    subservice: null, icfr: true, sig: 'Moderat', exc: null, cuec: 0,
    areas: 'Piutang Usaha · Penerimaan Kas', assertions: 'Keberadaan · Pisah Batas',
    strategy: 'Tidak ada laporan asurans — prosedur alternatif: kunjungan + uji kontrol / substantif diperluas',
    status: 'Perlu Prosedur Alternatif',
  },
];

/* ---- SO-01 (PT Payroll Solusi) adalah organisasi jasa yang LAPORAN Type 2-nya
   kita terbitkan sendiri via perikatan SJAH 3402 (ASR-2025-081). Tarik field
   kunci dari SUMBER KEBENARAN TUNGGAL socEngine agar sisi auditor-pengguna (SA 402)
   tak pernah menyimpang dari perikatan auditor-jasa. ---- */
(function syncSO01FromSocEngine() {
  try {
    const uav = AMS && AMS.socEngine && AMS.socEngine().userAuditorView;
    if (!uav) return;
    const so = SO_ORGS.find(o => o.id === 'SO-01');
    if (!so) return;
    Object.assign(so, {
      reportType: uav.reportType, std: uav.std, period: uav.period,
      opinion: uav.opinion === 'Tanpa Modifikasi' ? 'Tanpa Modifikasi' : uav.opinion,
      method: uav.method, exc: uav.exc, cuec: uav.cuec,
      areas: uav.areas, assertions: uav.assertions,
      objectives: uav.objectives, controls: uav.controls,
      sourceEng: 'ASR-2025-081', sourceModule: 'sjah3402',
    });
  } catch (e) {}
})();

/* ---- CUEC per service org ---- */
const SO_CUEC = {
  'SO-01': [
    { c: 'Otorisasi & verifikasi data master karyawan sebelum dikirim ke penyedia', owner: 'HR & Payroll Lead', freq: 'Per perubahan', tested: true, result: 'Efektif' },
    { c: 'Rekonsiliasi register gaji penyedia ke buku besar entitas', owner: 'Accounting Manager', freq: 'Bulanan', tested: true, result: 'Efektif' },
    { c: 'Review & approval batch pembayaran gaji sebelum rilis', owner: 'Finance Controller', freq: 'Bulanan', tested: true, result: 'Efektif' },
    { c: 'Pembatasan & review akses user entitas ke portal penyedia', owner: 'IT Security', freq: 'Triwulanan', tested: true, result: 'Efektif' },
    { c: 'Rekonsiliasi setoran PPh 21 & BPJS ke laporan penyedia', owner: 'Tax Officer', freq: 'Bulanan', tested: true, result: 'Efektif' },
  ],
  'SO-02': [
    { c: 'Manajemen akses pengguna entitas ke aplikasi ERP (provisioning & deprovisioning)', owner: 'IT Security', freq: 'Per perubahan', tested: true, result: 'Efektif' },
    { c: 'Review berkala hak akses & SoD pengguna entitas', owner: 'IT Security', freq: 'Triwulanan', tested: true, result: 'Defisiensi minor' },
    { c: 'Otorisasi & UAT atas perubahan konfigurasi yang diminta entitas', owner: 'IT Change Manager', freq: 'Per perubahan', tested: true, result: 'Efektif' },
    { c: 'Pemantauan job batch & tindak lanjut kegagalan proses', owner: 'IT Operations', freq: 'Harian', tested: true, result: 'Efektif' },
    { c: 'Validasi kelengkapan & integritas data interface ke sub-ledger', owner: 'Accounting Manager', freq: 'Bulanan', tested: true, result: 'Efektif' },
    { c: 'Pengujian rencana backup & pemulihan di sisi entitas', owner: 'IT Operations', freq: 'Semesteran', tested: false, result: 'Belum diuji' },
    { c: 'Review laporan eksepsi keamanan dari penyedia', owner: 'IT Security', freq: 'Bulanan', tested: true, result: 'Efektif' },
    { c: 'Rekonsiliasi data master kunci antara ERP & sumber entitas', owner: 'Accounting Manager', freq: 'Bulanan', tested: true, result: 'Efektif' },
  ],
  'SO-03': [
    { c: 'Rekonsiliasi posisi efek penyedia ke catatan investasi entitas', owner: 'Investment Officer', freq: 'Bulanan', tested: true, result: 'Efektif' },
    { c: 'Otorisasi instruksi transaksi efek sebelum dikirim ke kustodian', owner: 'Treasury Manager', freq: 'Per transaksi', tested: true, result: 'Efektif' },
    { c: 'Review independen atas pernyataan rekening kustodian', owner: 'Finance Controller', freq: 'Bulanan', tested: true, result: 'Efektif' },
  ],
  'SO-04': [],
};

/* ---- control exceptions (from service auditor reports) ---- */
const SO_EXCEPTIONS = [
  {
    id: 'EX-01', org: 'SO-02', ctrl: 'CC6.2 — Deprovisioning akses pengguna yang resign',
    dev: '3 dari 25 sampel: akses dinonaktifkan > 30 hari setelah tanggal resign',
    cause: 'Tiket SDM tidak terhubung otomatis ke proses deprovisioning IT',
    impact: 'Risiko akses tidak sah ke modul GL & AP selama jendela penundaan',
    addl: 'Uji langsung daftar user aktif vs HR master per 31 Des; tidak ada transaksi mencurigakan dari akun terdampak; CUEC review akses entitas mengkompensasi',
    residual: 'Rendah', resolved: true,
  },
  {
    id: 'EX-02', org: 'SO-02', ctrl: 'CC8.1 — Pengujian (UAT) sebelum migrasi perubahan ke produksi',
    dev: '2 dari 18 perubahan: bukti UAT tidak terdokumentasi lengkap',
    cause: 'Hotfix darurat di-deploy melalui jalur expedited tanpa arsip UAT formal',
    impact: 'Risiko perubahan tak teruji memengaruhi pemrosesan transaksi keuangan',
    addl: 'Inspeksi sifat 2 hotfix (non-financial logic); uji substantif atas output siklus terdampak periode pasca-deploy; tidak ada anomali',
    residual: 'Rendah', resolved: true,
  },
];

/* ---- service auditor competence/independence checklist ---- */
const SO_AUDITOR_EVAL = [
  { k: 'Reputasi & kompetensi profesional auditor jasa', ok: true },
  { k: 'Independensi auditor jasa terhadap organisasi jasa', ok: true },
  { k: 'Standar yang digunakan memadai (ISAE 3402 / SOC 1)', ok: true },
  { k: 'Tanggal & periode laporan relevan dengan periode audit', ok: 'partial' },
  { k: 'Lingkup laporan mencakup kontrol relevan bagi entitas', ok: true },
];

/* ============================================================ */
function ServiceOrg() {
  const [tab, setTab] = useStateSO('peta');

  const total = SO_ORGS.length;
  const type2 = SO_ORGS.filter(o => o.reportType === 'Type 2').length;
  const totalExc = SO_ORGS.reduce((s, o) => s + (o.exc || 0), 0);
  const noReport = SO_ORGS.filter(o => o.reportType === 'Tidak Ada').length;

  const tabs = [
    { id: 'peta', label: 'Konteks & Peta Dampak' },
    { id: 'register', label: 'Register Laporan Asurans' },
    { id: 'cuec', label: 'CUEC' },
    { id: 'exc', label: 'Subservice & Pengecualian' },
    { id: 'simpul', label: 'Kesimpulan & Dampak' },
  ];

  return (
    <>
      <SubBar moduleId="serviceorg" right={
        <div className="row gap8 ac">
          <Badge kind="blue">SA 402</Badge>
          <Btn sm><I.download size={13} /> Memo Organisasi Jasa</Btn>
          <Btn sm variant="primary"><I.plus size={14} /> Tambah Organisasi Jasa</Btn>
        </div>
      } />
      <div className="view-scroll"><div className="view-pad">

        {/* summary header */}
        <Panel noBody style={{ marginBottom: 12 }}>
          <div style={{ padding: '13px 16px', display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
            <div><div className="tiny muted upper">Organisasi Jasa</div><div className="mono" style={{ fontWeight: 800, fontSize: 19 }}>{total}</div></div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Laporan Type 2</div><div className="mono" style={{ fontWeight: 800, fontSize: 19, color: 'var(--green)' }}>{type2}</div></div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Pengecualian Kontrol</div><div className="mono" style={{ fontWeight: 800, fontSize: 19, color: 'var(--red)' }}>{totalExc}</div></div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Tanpa Laporan</div><div className="mono" style={{ fontWeight: 800, fontSize: 19, color: 'var(--amber)' }}>{noReport}</div></div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Metode Dominan</div><div style={{ fontWeight: 700, fontSize: 12.5 }}>Carve-out & Inclusive</div></div>
            <div style={{ flex: 1 }} />
            <div style={{ textAlign: 'right' }}>
              <div className="tiny muted upper" style={{ marginBottom: 3 }}>Kesimpulan Keseluruhan</div>
              <Badge kind="amber" dot>Terkendali — perlu prosedur tambahan</Badge>
            </div>
          </div>
        </Panel>

        <div style={{ marginBottom: 12 }}><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>

        {tab === 'peta' && <SOImpact />}
        {tab === 'register' && <SORegister />}
        {tab === 'cuec' && <SOCuec />}
        {tab === 'exc' && <SOExceptions />}
        {tab === 'simpul' && <SOConclusion />}

      </div></div>
    </>
  );
}

/* ---------------- Tab: Konteks & Peta Dampak ---------------- */
function SOImpact() {
  const sigBadge = (s) => s === 'Tinggi' ? 'red' : s === 'Moderat' ? 'amber' : 'gray';
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 360px', gap: 12, alignItems: 'start' }}>
      <div className="grid" style={{ gap: 12 }}>
        <Panel noBody>
          <div className="panel-h"><h3>Tujuan & Lingkup (SA 402)</h3><div style={{ flex: 1 }} /></div>
          <div style={{ padding: 14 }}>
            <p style={{ margin: '0 0 12px', fontSize: 12.5, lineHeight: 1.55, color: 'var(--ink-2)' }}>
              Entitas menggunakan <b>organisasi jasa</b> yang layanannya merupakan bagian dari sistem informasi
              relevan terhadap pelaporan keuangan. Auditor harus memperoleh pemahaman atas bagaimana entitas
              menggunakan jasa tersebut, menilai risiko salah saji material, dan merancang prosedur yang responsif —
              baik dengan <b>mengandalkan laporan auditor jasa (Type 1/2)</b> maupun prosedur di organisasi jasa.
            </p>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              {[
                { ic: 'layers', t: 'Pemahaman Jasa', d: 'Sifat & signifikansi jasa serta dampaknya pada ICFR entitas.' },
                { ic: 'shield', t: 'Bukti atas Kontrol', d: 'Type 1 (desain) vs Type 2 (desain + efektivitas operasi).' },
                { ic: 'scale', t: 'Respons & Opini', d: 'CUEC, prosedur tambahan, dan dampak pembatasan lingkup.' },
              ].map((c, i) => {
                const Ic = I[c.ic];
                return (
                  <div key={i} className="panel" style={{ padding: '11px 12px', boxShadow: 'none' }}>
                    <span style={{ color: 'var(--blue)' }}><Ic size={18} /></span>
                    <div style={{ fontWeight: 700, fontSize: 12, margin: '6px 0 3px' }}>{c.t}</div>
                    <div className="tiny muted" style={{ lineHeight: 1.4 }}>{c.d}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </Panel>

        <Panel noBody>
          <div className="panel-h"><h3>Peta Dampak Organisasi Jasa terhadap Laporan Keuangan</h3><div style={{ flex: 1 }} /><span className="tiny muted">{SO_ORGS.length} organisasi · keterkaitan asersi</span></div>
          <table className="dtbl">
            <thead><tr>
              <th style={{ width: 64 }}>ID</th><th>Organisasi Jasa</th><th>Akun / Siklus Terdampak</th>
              <th>Asersi Terkait</th><th style={{ width: 88 }}>ICFR</th><th style={{ width: 96 }}>Signifikansi</th>
            </tr></thead>
            <tbody>
              {SO_ORGS.map(o => (
                <tr key={o.id}>
                  <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{o.id}</td>
                  <td><div style={{ fontWeight: 600 }} className="truncate">{o.name}</div><div className="tiny muted truncate" style={{ maxWidth: 200 }}>{o.svc}</div></td>
                  <td className="tiny" style={{ whiteSpace: 'normal', lineHeight: 1.4 }}>{o.areas}</td>
                  <td className="tiny muted" style={{ whiteSpace: 'normal', lineHeight: 1.4 }}>{o.assertions}</td>
                  <td>{o.icfr ? <span className="row ac gap6 tiny" style={{ color: 'var(--green)', fontWeight: 600 }}><I.check size={13} /> Relevan</span> : <span className="tiny muted">Tidak</span>}</td>
                  <td><Badge kind={sigBadge(o.sig)}>{o.sig}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="panel" style={{ margin: 12, padding: '9px 11px', background: 'var(--blue-050)', borderColor: 'var(--blue-100)' }}>
            <div className="row gap8" style={{ alignItems: 'flex-start' }}>
              <span style={{ color: 'var(--blue)', flex: '0 0 auto' }}><I.target size={15} /></span>
              <span style={{ fontSize: 11.5, lineHeight: 1.45 }}>Empat organisasi jasa mempengaruhi sistem informasi pelaporan keuangan. CloudKas (ITGC) bersifat pervasif lintas siklus — kegagalan kontrolnya berpotensi memengaruhi seluruh asersi yang bergantung sistem.</span>
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid" style={{ gap: 12 }}>
        <Panel title="Pemahaman yang Diperoleh (SA 402 ¶9–11)">
          <div style={{ display: 'grid', gap: 0 }}>
            {[
              'Sifat jasa & signifikansinya terhadap entitas, termasuk pengaruhnya pada ICFR',
              'Sifat & materialitas transaksi yang diproses organisasi jasa',
              'Tingkat interaksi antara aktivitas entitas & organisasi jasa',
              'Sifat hubungan termasuk ketentuan kontraktual yang relevan',
            ].map((s, i) => (
              <div key={i} className="row gap8" style={{ padding: '9px 0', alignItems: 'flex-start', borderBottom: i < 3 ? '1px solid var(--line-soft)' : 0 }}>
                <span className="mono tiny" style={{ flex: '0 0 20px', fontWeight: 700, color: 'var(--blue)' }}>{String(i + 1).padStart(2, '0')}</span>
                <span style={{ fontSize: 12, lineHeight: 1.45 }}>{s}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Sumber Pemahaman">
          <div style={{ display: 'grid', gap: 6 }}>
            {[
              { ic: 'doc', t: 'Kontrak & SLA layanan' },
              { ic: 'doc', t: 'Laporan auditor jasa (ISAE 3402 / SOC 1)' },
              { ic: 'mail', t: 'Inquiry manajemen & user dept.' },
              { ic: 'search2', t: 'Walkthrough alur transaksi end-to-end' },
            ].map((r, i) => {
              const Ic = I[r.ic];
              return (
                <div key={i} className="row ac gap8" style={{ fontSize: 12, padding: '7px 9px', border: '1px solid var(--line-soft)', borderRadius: 6 }}>
                  <span style={{ color: 'var(--blue)' }}><Ic size={14} /></span>{r.t}
                </div>
              );
            })}
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ---------------- Tab: Register Laporan Asurans ---------------- */
function SORegister() {
  const [selId, setSelId] = useStateSO('SO-02');
  const sel = SO_ORGS.find(o => o.id === selId);
  const nav = useNav();

  const covMap = {
    full: { label: 'Periode penuh', kind: 'green' },
    gap: { label: 'Ada gap periode', kind: 'amber' },
    design: { label: 'Hanya desain (Type 1)', kind: 'amber' },
    none: { label: 'Tidak ada laporan', kind: 'red' },
  };

  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 340px', gap: 12, alignItems: 'start' }}>
      <Panel noBody>
        <div className="panel-h"><h3>Register Laporan Auditor Jasa</h3><div style={{ flex: 1 }} /><span className="tiny muted">Type 1/2 · ISAE 3402 / SOC 1</span></div>
        <table className="dtbl">
          <thead><tr>
            <th style={{ width: 64 }}>ID</th><th>Organisasi Jasa</th><th style={{ width: 96 }}>Laporan</th>
            <th>Periode</th><th>Opini Auditor Jasa</th>
          </tr></thead>
          <tbody>
            {SO_ORGS.map(o => (
              <tr key={o.id} className={o.id === selId ? 'sel' : ''} onClick={() => setSelId(o.id)} style={{ cursor: 'pointer' }}>
                <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{o.id}</td>
                <td><div style={{ fontWeight: 600 }} className="truncate">{o.name}</div><div className="tiny muted truncate" style={{ maxWidth: 190 }}>{o.std}</div></td>
                <td><Badge kind={o.reportType === 'Type 2' ? 'green' : o.reportType === 'Type 1' ? 'amber' : 'red'}>{o.reportType}</Badge></td>
                <td className="tiny mono muted">{o.period}</td>
                <td>{o.opinion === '—'
                  ? <span className="tiny muted">—</span>
                  : <Badge kind={o.opinion.includes('Pengecualian') ? 'red' : 'green'}>{o.opinion.split(' (')[0]}</Badge>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      {sel && (
        <div className="grid" style={{ gap: 12 }}>
          <Panel noBody>
            <div style={{ background: 'var(--surface-2)', padding: '11px 14px', borderBottom: '1px solid var(--line)' }}>
              <div className="row ac gap8"><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{sel.id}</span><Badge kind={sel.reportType === 'Type 2' ? 'green' : sel.reportType === 'Type 1' ? 'amber' : 'red'}>{sel.reportType} · {sel.std}</Badge></div>
              <div style={{ fontWeight: 700, fontSize: 13, marginTop: 3 }}>{sel.name}</div>
              <div className="tiny muted">{sel.svc}</div>
            </div>
            <div style={{ padding: 14 }}>
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                <KvBox label="Auditor Jasa" v={sel.auditor === '—' ? 'Tidak ada' : sel.auditor} />
                <KvBox label="Metode Pelaporan" v={sel.method} accent={sel.method === 'Carve-out' ? 'var(--amber)' : sel.method === '—' ? 'var(--ink-3)' : 'var(--blue)'} />
              </div>
              <div className="tiny muted upper" style={{ marginBottom: 4 }}>Cakupan Periode</div>
              <SOCoverageBar coverage={sel.coverage} />
              <div style={{ marginTop: 6 }}>
                <Badge kind={covMap[sel.coverage].kind}>{covMap[sel.coverage].label}</Badge>
              </div>
              {sel.coverage === 'gap' && <div className="panel" style={{ padding: '9px 11px', background: 'var(--amber-bg)', borderColor: 'transparent', marginTop: 10 }}><div className="row gap8" style={{ alignItems: 'flex-start' }}><span style={{ color: 'var(--amber)' }}><I.clock size={15} /></span><span style={{ fontSize: 11.5, lineHeight: 1.4 }}>Laporan berakhir 30 Jun 2025 — gap Jul–Des 2025 terhadap tanggal neraca. Diperlukan prosedur roll-forward (inquiry perubahan kontrol, bridge letter, uji langsung).</span></div></div>}
              {sel.coverage === 'design' && <div className="panel" style={{ padding: '9px 11px', background: 'var(--amber-bg)', borderColor: 'transparent', marginTop: 10 }}><div className="row gap8" style={{ alignItems: 'flex-start' }}><span style={{ color: 'var(--amber)' }}><I.alert size={15} /></span><span style={{ fontSize: 11.5, lineHeight: 1.4 }}>Type 1 hanya menyatakan kesesuaian desain pada satu tanggal — tidak memberi bukti efektivitas operasi. Uji efektivitas dilakukan langsung atau ganti dengan substantif.</span></div></div>}
              {sel.coverage === 'none' && <div className="panel" style={{ padding: '9px 11px', background: 'var(--red-bg)', borderColor: 'transparent', marginTop: 10 }}><div className="row gap8" style={{ alignItems: 'flex-start' }}><span style={{ color: 'var(--red)' }}><I.alert size={15} /></span><span style={{ fontSize: 11.5, lineHeight: 1.4 }}>Tidak tersedia laporan auditor jasa. Terapkan prosedur alternatif: kunjungan ke organisasi jasa, gunakan auditor lain, atau perluas prosedur substantif di entitas.</span></div></div>}
              {sel.sourceModule && <div className="panel" style={{ padding: '9px 11px', background: 'var(--blue-050)', borderColor: 'var(--blue-100)', marginTop: 10 }}><div className="row gap8 ac" style={{ alignItems: 'flex-start' }}><span style={{ color: 'var(--blue)', flex: '0 0 auto' }}><I.shield size={15} /></span><div style={{ flex: 1 }}><span style={{ fontSize: 11.5, lineHeight: 1.4 }}>Laporan Type 2 ini <b>kita terbitkan sendiri</b> via perikatan SJAH 3402 ({sel.sourceEng}). Tipe laporan, opini, deviasi & {sel.cuec} CUEC ditarik dari satu sumber kebenaran.</span><div style={{ marginTop: 7 }}><Btn sm onClick={() => nav('sjah3402', { from: 'serviceorg' })}><I.arrowRight size={13} /> Buka Modul SJAH 3402</Btn></div></div></div></div>}
            </div>
          </Panel>

          {sel.reportType !== 'Tidak Ada' && (
            <Panel title="Evaluasi Auditor Jasa (SA 402 ¶13–14)">
              <div style={{ display: 'grid', gap: 0 }}>
                {SO_AUDITOR_EVAL.map((r, i) => (
                  <div key={i} className="row jb ac gap8" style={{ padding: '8px 0', borderBottom: i < SO_AUDITOR_EVAL.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
                    <span style={{ fontSize: 11.5, lineHeight: 1.4, flex: 1 }}>{r.k}</span>
                    {r.ok === true
                      ? <span style={{ color: 'var(--green)', flex: '0 0 auto' }}><I.checkCircle size={15} /></span>
                      : <Badge kind="amber">Catatan</Badge>}
                  </div>
                ))}
              </div>
              {sel.coverage !== 'full' && <div className="tiny muted" style={{ marginTop: 8, lineHeight: 1.4 }}>Catatan: periode laporan tidak sepenuhnya selaras dengan periode audit — lihat cakupan periode di atas.</div>}
            </Panel>
          )}
        </div>
      )}
    </div>
  );
}

function SOCoverageBar({ coverage }) {
  /* 12-month strip: filled = covered by service auditor report */
  const months = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
  const fill = {
    full: months.map(() => true),
    gap: [false, false, false, false, false, false, true, true, true, true, true, true].map(v => !v ? true : false), // Jul24-Jun25 → Jan-Jun covered, Jul-Dec gap (relative to audit year)
    design: months.map((_, i) => i === 11),
    none: months.map(() => false),
  }[coverage];
  return (
    <div className="row gap6 ac" style={{ marginTop: 4 }}>
      {months.map((m, i) => (
        <div key={i} style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ height: 18, borderRadius: 3, background: fill[i] ? (coverage === 'design' ? 'var(--amber)' : 'var(--green)') : 'var(--line)', opacity: fill[i] ? 1 : 0.7 }} />
          <div className="mono" style={{ fontSize: 8.5, color: 'var(--ink-4)', marginTop: 2 }}>{m}</div>
        </div>
      ))}
    </div>
  );
}

/* ---------------- Tab: CUEC ---------------- */
function SOCuec() {
  const orgsWithCuec = SO_ORGS.filter(o => o.cuec > 0);
  const [selId, setSelId] = useStateSO('SO-02');
  const sel = SO_ORGS.find(o => o.id === selId);
  const rows = SO_CUEC[selId] || [];
  const tested = rows.filter(r => r.tested).length;
  const issues = rows.filter(r => r.result !== 'Efektif' && r.tested).length;

  return (
    <div className="grid" style={{ gap: 12 }}>
      <Panel noBody>
        <div className="panel-h"><h3>Complementary User Entity Controls (CUEC)</h3><div style={{ flex: 1 }} />
          <div className="seg" style={{ width: 'fit-content' }}>
            {orgsWithCuec.map(o => (
              <button key={o.id} className={o.id === selId ? 'on' : ''} onClick={() => setSelId(o.id)}>{o.id}</button>
            ))}
          </div>
        </div>
        <div className="panel" style={{ margin: 0, padding: '8px 14px', borderRadius: 0, borderLeft: 0, borderRight: 0, borderTop: 0, background: 'var(--blue-050)', display: 'flex', gap: 18, alignItems: 'center', fontSize: 11.5 }}>
          <span><b>{sel.name}</b> — {sel.cuec} CUEC diidentifikasi dari laporan auditor jasa</span>
          <span className="row ac gap6"><span style={{ width: 9, height: 9, borderRadius: 2, background: 'var(--green)' }} /> {tested} diuji</span>
          <span className="row ac gap6"><span style={{ width: 9, height: 9, borderRadius: 2, background: 'var(--amber)' }} /> {issues} dengan catatan</span>
        </div>
        <table className="dtbl">
          <thead><tr>
            <th style={{ width: 36 }}>#</th><th>Kontrol Pelengkap di Entitas</th><th style={{ width: 150 }}>Pemilik</th>
            <th style={{ width: 110 }}>Frekuensi</th><th style={{ width: 140 }}>Hasil Uji</th>
          </tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td className="mono tiny muted">{String(i + 1).padStart(2, '0')}</td>
                <td style={{ whiteSpace: 'normal', lineHeight: 1.4, fontWeight: 500 }}>{r.c}</td>
                <td className="tiny muted">{r.owner}</td>
                <td className="tiny">{r.freq}</td>
                <td>{r.result === 'Efektif'
                  ? <span className="row ac gap6 tiny" style={{ color: 'var(--green)', fontWeight: 600 }}><I.check size={13} /> Efektif</span>
                  : r.result === 'Belum diuji'
                    ? <Badge kind="gray">Belum diuji</Badge>
                    : <Badge kind="amber">{r.result}</Badge>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {issues > 0 && (
          <div className="panel" style={{ margin: 12, padding: '9px 11px', background: 'var(--amber-bg)', borderColor: 'transparent' }}>
            <div className="row gap8" style={{ alignItems: 'flex-start' }}>
              <span style={{ color: 'var(--amber)', flex: '0 0 auto' }}><I.alert size={15} /></span>
              <span style={{ fontSize: 11.5, lineHeight: 1.45 }}>Tanpa CUEC yang beroperasi efektif di sisi entitas, kontrol organisasi jasa tidak cukup untuk mencapai tujuan pengendalian. Defisiensi & CUEC yang belum diuji ditindaklanjuti dengan prosedur substantif/uji langsung.</span>
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}

/* ---------------- Tab: Subservice & Pengecualian ---------------- */
function SOExceptions() {
  const subs = SO_ORGS.filter(o => o.subservice);
  return (
    <div className="grid" style={{ gap: 12 }}>
      <Panel noBody>
        <div className="panel-h"><h3>Organisasi Subservice & Metode Pelaporan</h3><div style={{ flex: 1 }} /></div>
        <table className="dtbl">
          <thead><tr><th style={{ width: 64 }}>Induk</th><th>Organisasi Jasa</th><th style={{ width: 120 }}>Metode</th><th>Subservice & Penanganan</th></tr></thead>
          <tbody>
            {SO_ORGS.map(o => (
              <tr key={o.id}>
                <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{o.id}</td>
                <td style={{ fontWeight: 600 }} className="truncate">{o.name}</td>
                <td>{o.method === '—' ? <span className="tiny muted">—</span> : <Badge kind={o.method === 'Carve-out' ? 'amber' : 'blue'}>{o.method}</Badge>}</td>
                <td className="tiny" style={{ whiteSpace: 'normal', lineHeight: 1.4 }}>{o.subservice || (o.method === 'Inclusive' ? 'Tidak ada subservice / tercakup inclusive' : '—')}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="panel" style={{ margin: 12, padding: '9px 11px', background: 'var(--blue-050)', borderColor: 'var(--blue-100)' }}>
          <div className="row gap8" style={{ alignItems: 'flex-start' }}>
            <span style={{ color: 'var(--blue)', flex: '0 0 auto' }}><I.layers size={15} /></span>
            <span style={{ fontSize: 11.5, lineHeight: 1.45 }}><b>Metode carve-out</b> (CloudKas → AWS) mengecualikan kontrol subservice dari lingkup laporan. Auditor harus memperoleh bukti terpisah atas kontrol AWS yang relevan (mis. SOC 1 AWS) atau menilai dampaknya melalui CUEC & prosedur substantif.</span>
          </div>
        </div>
      </Panel>

      <Panel noBody>
        <div className="panel-h"><h3>Register Pengecualian Kontrol & Evaluasi Dampak</h3><div style={{ flex: 1 }} /><span className="tiny muted">{SO_EXCEPTIONS.length} pengecualian dari laporan auditor jasa</span></div>
        <div style={{ padding: 12, display: 'grid', gap: 10 }}>
          {SO_EXCEPTIONS.map(ex => {
            const org = SO_ORGS.find(o => o.id === ex.org);
            return (
              <div key={ex.id} className="panel" style={{ padding: 0, boxShadow: 'none', overflow: 'hidden' }}>
                <div style={{ background: 'var(--surface-2)', padding: '9px 12px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span className="mono tiny" style={{ fontWeight: 700, color: 'var(--red)' }}>{ex.id}</span>
                  <span style={{ fontWeight: 700, fontSize: 12.5 }}>{ex.ctrl}</span>
                  <span className="tiny muted">· {org.name}</span>
                  <div style={{ flex: 1 }} />
                  {ex.resolved ? <Badge kind="green" dot>Teratasi</Badge> : <Badge kind="red">Terbuka</Badge>}
                  <Badge kind={ex.residual === 'Rendah' ? 'green' : 'amber'}>Residual {ex.residual}</Badge>
                </div>
                <div style={{ padding: 12 }} className="grid">
                  <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <div className="tiny muted upper" style={{ marginBottom: 3 }}>Deviasi yang Dilaporkan</div>
                      <div style={{ fontSize: 11.5, lineHeight: 1.45, marginBottom: 10 }}>{ex.dev}</div>
                      <div className="tiny muted upper" style={{ marginBottom: 3 }}>Akar Penyebab</div>
                      <div style={{ fontSize: 11.5, lineHeight: 1.45 }}>{ex.cause}</div>
                    </div>
                    <div>
                      <div className="tiny muted upper" style={{ marginBottom: 3 }}>Dampak Potensial</div>
                      <div style={{ fontSize: 11.5, lineHeight: 1.45, marginBottom: 10 }}>{ex.impact}</div>
                      <div className="tiny muted upper" style={{ marginBottom: 3 }}>Prosedur Tambahan Auditor</div>
                      <div style={{ fontSize: 11.5, lineHeight: 1.45 }}>{ex.addl}</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

/* ---------------- Tab: Kesimpulan & Dampak ---------------- */
function SOConclusion() {
  const reliance = [
    { id: 'SO-01', rely: 'Andalkan penuh', addl: 'Uji 5 CUEC (efektif) + substantif rekonsiliasi gaji', kind: 'green' },
    { id: 'SO-02', rely: 'Andalkan parsial', addl: 'Roll-forward gap + prosedur tambahan 2 pengecualian + bukti AWS (carve-out)', kind: 'amber' },
    { id: 'SO-03', rely: 'Terbatas (desain)', addl: 'Uji efektivitas operasi langsung / substantif posisi & pendapatan investasi', kind: 'amber' },
    { id: 'SO-04', rely: 'Tidak diandalkan', addl: 'Prosedur alternatif: kunjungan + substantif diperluas atas piutang & penerimaan', kind: 'red' },
  ];
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 340px', gap: 12, alignItems: 'start' }}>
      <div className="grid" style={{ gap: 12 }}>
        <Panel noBody>
          <div className="panel-h"><h3>Keputusan Pengandalan & Respons per Organisasi Jasa</h3><div style={{ flex: 1 }} /></div>
          <table className="dtbl">
            <thead><tr><th style={{ width: 64 }}>ID</th><th style={{ width: 150 }}>Tingkat Pengandalan</th><th>Respons Audit yang Direncanakan</th></tr></thead>
            <tbody>
              {reliance.map(r => {
                const org = SO_ORGS.find(o => o.id === r.id);
                return (
                  <tr key={r.id}>
                    <td><div className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{r.id}</div><div className="tiny muted truncate" style={{ maxWidth: 60 }}>{org.name.split(' ').slice(0, 2).join(' ')}</div></td>
                    <td><Badge kind={r.kind}>{r.rely}</Badge></td>
                    <td className="tiny" style={{ whiteSpace: 'normal', lineHeight: 1.45 }}>{r.addl}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Panel>

        <Panel noBody>
          <div className="panel-h"><h3>Dampak terhadap Opini (SA 402 ¶20–22)</h3><div style={{ flex: 1 }} /></div>
          <table className="dtbl">
            <thead><tr><th style={{ width: 44 }}>Ref</th><th>Kondisi</th><th style={{ width: 170 }}>Potensi Dampak</th><th style={{ width: 90 }}>Status</th></tr></thead>
            <tbody>
              {[
                { ref: '¶20', cond: 'Bukti cukup & tepat atas kontrol organisasi jasa tidak dapat diperoleh (pembatasan lingkup)', mod: 'WDP / Tidak Menyatakan Pendapat', status: 'watch', note: 'SO-04 tanpa laporan — diatasi prosedur alternatif yang memadai; tidak ada pembatasan lingkup.' },
                { ref: '¶21', cond: 'Referensi ke pekerjaan auditor jasa dalam laporan auditor entitas', mod: 'Tidak mengurangi tanggung jawab', status: 'clear', note: 'Tidak dilakukan referensi; tanggung jawab opini tetap pada KAP entitas.' },
                { ref: '¶22', cond: 'Pengecualian kontrol berdampak material & tidak terkompensasi', mod: 'WDP / Tidak Wajar', status: 'clear', note: '2 pengecualian SO-02 terkompensasi CUEC & prosedur substantif; residual rendah.' },
              ].map((m, i) => (
                <tr key={i}>
                  <td className="mono tiny" style={{ color: 'var(--blue)', fontWeight: 700 }}>{m.ref}</td>
                  <td style={{ whiteSpace: 'normal', lineHeight: 1.4, fontSize: 11.5 }}>{m.cond}<div className="tiny muted" style={{ marginTop: 3 }}>{m.note}</div></td>
                  <td className="tiny">{m.mod}</td>
                  <td>{m.status === 'clear' ? <Badge kind="green">Bersih</Badge> : <Badge kind="amber">Pantau</Badge>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <Panel title="Kesimpulan Auditor">
          <p style={{ margin: '0 0 10px', fontSize: 12.5, lineHeight: 1.6 }}>
            Kami memperoleh pemahaman memadai atas keempat organisasi jasa dan dampaknya terhadap sistem informasi
            pelaporan keuangan entitas. Untuk <b>PT Payroll Solusi</b> dan <b>Kustodian Sentral Efek</b>, bukti dari
            laporan auditor jasa dan CUEC yang teruji memadai. Untuk <b>CloudKas</b>, gap periode dan 2 pengecualian
            kontrol telah ditangani melalui roll-forward serta prosedur tambahan, dengan residual rendah. Untuk
            <b> BillTrust</b> yang tanpa laporan asurans, dilaksanakan prosedur alternatif yang cukup. <b>Tidak diperlukan
            modifikasi opini</b> sehubungan dengan penggunaan organisasi jasa.
          </p>
          <div className="panel" style={{ padding: '10px 12px', background: 'var(--green-bg)', borderColor: 'transparent' }}>
            <div className="row ac gap8"><span style={{ color: 'var(--green)' }}><I.checkCircle size={16} /></span><span style={{ fontSize: 12, fontWeight: 600 }}>Risiko atas organisasi jasa terkendali — bukti cukup & tepat diperoleh, siap dirujuk ke kesimpulan audit.</span></div>
          </div>
        </Panel>
      </div>

      <div className="grid" style={{ gap: 12 }}>
        <Panel title="Tautan Kertas Kerja">
          <div style={{ display: 'grid', gap: 6 }}>
            {[
              { t: 'Memo pemahaman organisasi jasa', wp: 'A-402' },
              { t: 'Evaluasi laporan & auditor jasa', wp: 'A-402.1' },
              { t: 'Matriks CUEC & pengujian', wp: 'A-402.2' },
              { t: 'Roll-forward & gap CloudKas', wp: 'A-402.3' },
              { t: 'Prosedur alternatif BillTrust', wp: 'A-402.4' },
            ].map((r, i) => (
              <div key={i} className="row jb ac" style={{ fontSize: 12, padding: '7px 9px', border: '1px solid var(--line-soft)', borderRadius: 6 }}>
                <span className="row ac gap8"><span style={{ color: 'var(--blue)' }}><I.doc size={14} /></span>{r.t}</span>
                <span className="mono tiny" style={{ color: 'var(--blue)', fontWeight: 700 }}>{r.wp}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Sign-off">
          <div style={{ display: 'grid', gap: 9 }}>
            {[
              { role: 'Disiapkan', who: 'Dimas Raharjo', when: '07 Mar', done: true },
              { role: 'Direview', who: 'Anindya Pramesti', when: '10 Mar', done: true },
              { role: 'Disetujui Partner', who: 'Hartono Wijaya', when: '—', done: false },
            ].map((s, i) => (
              <div key={i} className="row jb ac" style={{ fontSize: 12, paddingBottom: 8, borderBottom: i < 2 ? '1px solid var(--line-soft)' : 0 }}>
                <div><div className="tiny muted upper">{s.role}</div><div style={{ fontWeight: 600 }}>{s.who}</div></div>
                {s.done ? <span className="row ac gap6 tiny" style={{ color: 'var(--green)', fontWeight: 600 }}><I.checkCircle size={14} /> {s.when}</span> : <Badge kind="amber">Menunggu</Badge>}
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

Object.assign(window, { ServiceOrg });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { ServiceOrg };
