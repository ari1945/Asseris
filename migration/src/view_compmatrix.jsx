/* [codemod] ESM imports */
import React from 'react';
import { useNav } from './contexts.jsx';
import { I, MODULE_INDEX } from './icons.jsx';
import { SubBar } from './shell.jsx';
import { Badge, Btn, Progress } from './ui.jsx';

/* ============================================================
   NeoSuite AMS — Matriks Kepatuhan (Standards Register / Index)
   Satu sumber kebenaran: tiap SA/PSAK dipetakan ke checklist,
   modul fungsional, atau ditandai belum tercakup (gap).
   ============================================================ */
const { useState: useStateMX, useMemo: useMemoMX } = React;

/* type → badge kind */
const STD_TYPE_KIND = { SA: 'blue', PSAK: 'green', SAK: 'green', SPR: 'amber', SJAH: 'amber', SPA: 'amber', SPM: 'navy', KEPAP: 'navy' };
const PHASE_ORDER = ['Perencanaan', 'Pelaksanaan', 'Pelaporan', 'Perikatan Lain', 'Mutu', 'Akuntansi'];

/* Penomoran PSAK selaras-IFRS (efektif 2024) — alias atas nomor lama.
   LK Indonesia terbit kini memakai skema ini (mis. margin "201p54", "115p105").
   Satu sumber kebenaran; ditampilkan ganda di Matriks & header modul. */
const IFRS_ALIAS = {
  'PSAK 1':     { code: 'PSAK 201',     base: 'IAS 1' },
  'PSAK 2':     { code: 'PSAK 207',     base: 'IAS 7' },
  'PSAK 7':     { code: 'PSAK 224',     base: 'IAS 24' },
  'PSAK 8':     { code: 'PSAK 210',     base: 'IAS 10' },
  'PSAK 5':     { code: 'PSAK 108',     base: 'IFRS 8' },
  'PSAK 13':    { code: 'PSAK 240',     base: 'IAS 40' },
  'PSAK 15':    { code: 'PSAK 228',     base: 'IAS 28' },
  'PSAK 14':    { code: 'PSAK 202',     base: 'IAS 2' },
  'PSAK 16':    { code: 'PSAK 216',     base: 'IAS 16' },
  'PSAK 19':    { code: 'PSAK 238',     base: 'IAS 38' },
  'PSAK 22':    { code: 'PSAK 103',     base: 'IFRS 3' },
  'PSAK 24':    { code: 'PSAK 219',     base: 'IAS 19' },
  'PSAK 25':    { code: 'PSAK 208',     base: 'IAS 8' },
  'PSAK 46':    { code: 'PSAK 212',     base: 'IAS 12' },
  'PSAK 58':    { code: 'PSAK 105',     base: 'IFRS 5' },
  'PSAK 65':    { code: 'PSAK 110',     base: 'IFRS 10' },
  'PSAK 66':    { code: 'PSAK 111',     base: 'IFRS 11' },
  'PSAK 68':    { code: 'PSAK 113',     base: 'IFRS 13' },
  'PSAK 71':    { code: 'PSAK 109',     base: 'IFRS 9 / 7' },
  'PSAK 72':    { code: 'PSAK 115',     base: 'IFRS 15' },
  'PSAK 73':    { code: 'PSAK 116',     base: 'IFRS 16' },
  'PSAK 48/57': { code: 'PSAK 236/237', base: 'IAS 36 / 37' },
};

/* coverage: 'checklist' (punya COMPLIANCE_CONFIG) | 'module' (modul fungsional) | 'gap' (belum) */
const STANDARDS_REGISTRY = [
  // ——— SA 200: Tanggung jawab umum ———
  { code: 'SA 200', title: 'Tujuan Keseluruhan Auditor Independen', type: 'SA', phase: 'Perencanaan', coverage: 'module', module: 'sa200' },
  { code: 'SA 210', title: 'Persetujuan Ketentuan Perikatan Audit', type: 'SA', phase: 'Perencanaan', coverage: 'module', module: 'engagement' },
  { code: 'SA 220', title: 'Pengendalian Mutu untuk Audit LK', type: 'SA', phase: 'Mutu', coverage: 'module', module: 'soqm' },
  { code: 'SA 230', title: 'Dokumentasi Audit', type: 'SA', phase: 'Pelaksanaan', coverage: 'module', module: 'sa230' },
  { code: 'SA 240', title: 'Tanggung Jawab atas Kecurangan (Fraud)', type: 'SA', phase: 'Pelaksanaan', coverage: 'module', module: 'sa240' },
  { code: 'SA 250', title: 'Hukum & Regulasi dalam Audit LK', type: 'SA', phase: 'Pelaksanaan', coverage: 'module', module: 'sa250' },
  { code: 'SA 260', title: 'Komunikasi dengan TCWG', type: 'SA', phase: 'Pelaporan', coverage: 'module', module: 'sa260' },
  { code: 'SA 265', title: 'Defisiensi Pengendalian Internal', type: 'SA', phase: 'Pelaporan', coverage: 'module', module: 'sa265' },
  // ——— SA 300/400: Penilaian & respons risiko ———
  { code: 'SA 300', title: 'Perencanaan Audit LK', type: 'SA', phase: 'Perencanaan', coverage: 'module', module: 'strategy' },
  { code: 'SA 315', title: 'Identifikasi & Penilaian ROMM', type: 'SA', phase: 'Perencanaan', coverage: 'module', module: 'risk' },
  { code: 'SA 320', title: 'Materialitas dalam Perencanaan & Pelaksanaan', type: 'SA', phase: 'Perencanaan', coverage: 'module', module: 'materiality' },
  { code: 'SA 330', title: 'Respons Auditor terhadap Risiko', type: 'SA', phase: 'Pelaksanaan', coverage: 'module', module: 'workpapers' },
  { code: 'SA 402', title: 'Pertimbangan Audit atas Organisasi Jasa', type: 'SA', phase: 'Pelaksanaan', coverage: 'module', module: 'serviceorg' },
  { code: 'SA 450', title: 'Evaluasi Salah Saji', type: 'SA', phase: 'Pelaporan', coverage: 'module', module: 'sad' },
  // ——— SA 500: Bukti audit ———
  { code: 'SA 500', title: 'Bukti Audit', type: 'SA', phase: 'Pelaksanaan', coverage: 'module', module: 'evidence' },
  { code: 'SA 501', title: 'Bukti Audit \u2014 Unsur Tertentu', type: 'SA', phase: 'Pelaksanaan', coverage: 'checklist', module: 'sa501' },
  { code: 'SA 505', title: 'Konfirmasi Eksternal', type: 'SA', phase: 'Pelaksanaan', coverage: 'module', module: 'confirm' },
  { code: 'SA 510', title: 'Perikatan Audit Tahun Pertama \u2014 Saldo Awal', type: 'SA', phase: 'Perencanaan', coverage: 'module', module: 'opening' },
  { code: 'SA 520', title: 'Prosedur Analitis', type: 'SA', phase: 'Pelaksanaan', coverage: 'checklist', module: 'sa520' },
  { code: 'SA 530', title: 'Sampling Audit', type: 'SA', phase: 'Pelaksanaan', coverage: 'checklist', module: 'sa530' },
  { code: 'SA 540', title: 'Audit Estimasi Akuntansi', type: 'SA', phase: 'Pelaksanaan', coverage: 'checklist', module: 'sa540' },
  { code: 'SA 550', title: 'Pihak Berelasi', type: 'SA', phase: 'Pelaksanaan', coverage: 'module', module: 'related' },
  { code: 'SA 560', title: 'Peristiwa Kemudian', type: 'SA', phase: 'Pelaporan', coverage: 'module', module: 'subsequent' },
  { code: 'SA 570', title: 'Kelangsungan Usaha', type: 'SA', phase: 'Pelaporan', coverage: 'module', module: 'goingconcern' },
  { code: 'SA 580', title: 'Representasi Tertulis', type: 'SA', phase: 'Pelaporan', coverage: 'checklist', module: 'sa580' },
  // ——— SA 600: Penggunaan pekerjaan pihak lain ———
  { code: 'SA 600', title: 'Audit Grup (Komponen)', type: 'SA', phase: 'Pelaksanaan', coverage: 'module', module: 'groupaudit' },
  { code: 'SA 610', title: 'Penggunaan Pekerjaan Auditor Internal', type: 'SA', phase: 'Pelaksanaan', coverage: 'module', module: 'internalaudit' },
  { code: 'SA 620', title: 'Penggunaan Pekerjaan Pakar Auditor', type: 'SA', phase: 'Pelaksanaan', coverage: 'module', module: 'expert' },
  // ——— SA 700: Kesimpulan & pelaporan ———
  { code: 'SA 700', title: 'Perumusan Opini & Pelaporan atas LK', type: 'SA', phase: 'Pelaporan', coverage: 'module', module: 'opinion' },
  { code: 'SA 701', title: 'Hal Audit Utama (KAM)', type: 'SA', phase: 'Pelaporan', coverage: 'checklist', module: 'sa701' },
  { code: 'SA 705', title: 'Modifikasi Opini Auditor Independen', type: 'SA', phase: 'Pelaporan', coverage: 'checklist', module: 'sa705' },
  { code: 'SA 706', title: 'Paragraf Penekanan Suatu Hal & Hal Lain', type: 'SA', phase: 'Pelaporan', coverage: 'checklist', module: 'sa705' },
  { code: 'SA 710', title: 'Informasi Komparatif', type: 'SA', phase: 'Pelaporan', coverage: 'checklist', module: 'sa710' },
  { code: 'SA 720', title: 'Informasi Lain dalam Laporan Tahunan', type: 'SA', phase: 'Pelaporan', coverage: 'checklist', module: 'sa720' },
  // ——— SA 800: Area khusus ———
  { code: 'SA 800', title: 'Audit LK Kerangka Bertujuan Khusus', type: 'SA', phase: 'Pelaporan', coverage: 'module', module: 'sa800' },
  { code: 'SA 805', title: 'Audit LK Tunggal & Elemen Tertentu', type: 'SA', phase: 'Pelaporan', coverage: 'module', module: 'sa805' },
  { code: 'SA 810', title: 'Perikatan Pelaporan atas Ringkasan LK', type: 'SA', phase: 'Pelaporan', coverage: 'module', module: 'sa810' },
  // ——— Mutu firma & etika ———
  { code: 'SPM 1', title: 'Pengelolaan Mutu (SOQM)', type: 'SPM', phase: 'Mutu', coverage: 'module', module: 'governance' },
  { code: 'SPM 2', title: 'Reviu Pengendalian Mutu Perikatan (EQR)', type: 'SPM', phase: 'Mutu', coverage: 'module', module: 'eqr' },
  { code: 'KEPAP', title: 'Kode Etik Profesi Akuntan Publik — Independensi & Etika', type: 'KEPAP', phase: 'Mutu', coverage: 'module', module: 'governance' },
  // ——— Perikatan selain audit ———
  { code: 'SPR 2400', title: 'Perikatan Reviu atas LK Historis', type: 'SPR', phase: 'Perikatan Lain', coverage: 'module', module: 'spr2400' },
  { code: 'SPR 2410', title: 'Reviu atas Informasi Keuangan Interim', type: 'SPR', phase: 'Perikatan Lain', coverage: 'module', module: 'spr2410' },
  { code: 'SPA 4400', title: 'Perikatan Prosedur yang Disepakati', type: 'SPA', phase: 'Perikatan Lain', coverage: 'module', module: 'relatedsvc' },
  { code: 'SPA 4410', title: 'Perikatan Kompilasi', type: 'SPA', phase: 'Perikatan Lain', coverage: 'module', module: 'relatedsvc' },
  { code: 'SJAH 3000', title: 'Perikatan Asurans selain Audit/Reviu', type: 'SJAH', phase: 'Perikatan Lain', coverage: 'module', module: 'sjah3000' },
  { code: 'SJAH 3400', title: 'Pemeriksaan Informasi Keuangan Prospektif', type: 'SJAH', phase: 'Perikatan Lain', coverage: 'module', module: 'sjah3400' },
  { code: 'SJAH 3402', title: 'Laporan Asurans atas Pengendalian Organisasi Jasa', type: 'SJAH', phase: 'Perikatan Lain', coverage: 'module', module: 'sjah3402' },
  { code: 'SJAH 3410', title: 'Perikatan Asurans atas Laporan Emisi Gas Rumah Kaca', type: 'SJAH', phase: 'Perikatan Lain', coverage: 'module', module: 'sjah3410' },
  { code: 'SJAH 3420', title: 'Asurans atas Penyusunan Informasi Keuangan Proforma', type: 'SJAH', phase: 'Perikatan Lain', coverage: 'module', module: 'sjah3420' },
  // ——— Kerangka akuntansi (PSAK) ———
  { code: 'PSAK 1', title: 'Penyajian Laporan Keuangan', type: 'PSAK', phase: 'Akuntansi', coverage: 'module', module: 'psak1' },
  { code: 'PSAK 2', title: 'Laporan Arus Kas', type: 'PSAK', phase: 'Akuntansi', coverage: 'module', module: 'psak2' },
  { code: 'PSAK 7', title: 'Pengungkapan Pihak Berelasi', type: 'PSAK', phase: 'Akuntansi', coverage: 'module', module: 'related' },
  { code: 'PSAK 8', title: 'Peristiwa Setelah Periode Pelaporan', type: 'PSAK', phase: 'Akuntansi', coverage: 'module', module: 'subsequent' },
  { code: 'PSAK 5', title: 'Segmen Operasi', type: 'PSAK', phase: 'Akuntansi', coverage: 'module', module: 'segmen' },
  { code: 'PSAK 13', title: 'Properti Investasi', type: 'PSAK', phase: 'Akuntansi', coverage: 'module', module: 'invprop' },
  { code: 'PSAK 15', title: 'Investasi pada Entitas Asosiasi & Ventura Bersama', type: 'PSAK', phase: 'Akuntansi', coverage: 'module', module: 'assoc' },
  { code: 'PSAK 14', title: 'Persediaan', type: 'PSAK', phase: 'Akuntansi', coverage: 'module', module: 'psak14' },
  { code: 'PSAK 16', title: 'Aset Tetap', type: 'PSAK', phase: 'Akuntansi', coverage: 'module', module: 'psak16' },
  { code: 'PSAK 19', title: 'Aset Takberwujud', type: 'PSAK', phase: 'Akuntansi', coverage: 'module', module: 'psak19' },
  { code: 'PSAK 22', title: 'Kombinasi Bisnis', type: 'PSAK', phase: 'Akuntansi', coverage: 'module', module: 'psak22' },
  { code: 'PSAK 24', title: 'Imbalan Kerja', type: 'PSAK', phase: 'Akuntansi', coverage: 'module', module: 'psak24' },
  { code: 'PSAK 25', title: 'Kebijakan Akuntansi, Perubahan Estimasi & Kesalahan', type: 'PSAK', phase: 'Akuntansi', coverage: 'module', module: 'psak25' },
  { code: 'PSAK 46', title: 'Pajak Penghasilan', type: 'PSAK', phase: 'Akuntansi', coverage: 'module', module: 'psak46' },
  { code: 'PSAK 58', title: 'Aset Dimiliki untuk Dijual & Operasi Dihentikan', type: 'PSAK', phase: 'Akuntansi', coverage: 'module', module: 'psak58' },
  { code: 'PSAK 66', title: 'Pengaturan Bersama (Joint Arrangements)', type: 'PSAK', phase: 'Akuntansi', coverage: 'module', module: 'psak66' },
  { code: 'PSAK 71', title: 'Instrumen Keuangan', type: 'PSAK', phase: 'Akuntansi', coverage: 'checklist', module: 'psak71' },
  { code: 'PSAK 72', title: 'Pendapatan dari Kontrak dengan Pelanggan', type: 'PSAK', phase: 'Akuntansi', coverage: 'checklist', module: 'psak72' },
  { code: 'PSAK 73', title: 'Sewa', type: 'PSAK', phase: 'Akuntansi', coverage: 'module', module: 'psak73' },
  { code: 'SAK EP', title: 'SAK Entitas Privat (pengganti SAK ETAP)', type: 'SAK', phase: 'Akuntansi', coverage: 'checklist', module: 'sakep' },
  { code: 'PSAK 65', title: 'Laporan Keuangan Konsolidasian', type: 'PSAK', phase: 'Akuntansi', coverage: 'module', module: 'psak65' },
  { code: 'PSAK 68', title: 'Pengukuran Nilai Wajar', type: 'PSAK', phase: 'Akuntansi', coverage: 'module', module: 'psak68' },
  { code: 'PSAK 48/57', title: 'Penurunan Nilai Aset & Provisi', type: 'PSAK', phase: 'Akuntansi', coverage: 'module', module: 'psak48' },
];

const COV_META = {
  checklist: { label: 'Checklist', kind: 'green' },
  module: { label: 'Modul khusus', kind: 'blue' },
  gap: { label: 'Belum tercakup', kind: 'gray' },
};

const COLS = '108px minmax(200px,1fr) 64px 150px 150px 84px';

function MxCard({ value, label, accent, sub }) {
  return (
    <div className="panel" style={{ padding: '12px 14px', display: 'grid', gap: 2 }}>
      <div className="mono" style={{ fontSize: 22, fontWeight: 700, color: accent || 'var(--navy)', lineHeight: 1 }}>{value}</div>
      <div className="tiny muted" style={{ fontWeight: 600 }}>{label}</div>
      {sub && <div className="tiny" style={{ color: 'var(--ink-4)' }}>{sub}</div>}
    </div>
  );
}

function ComplianceMatrix() {
  const nav = useNav();
  const loader = window.loadLS || ((k, d) => d);
  const [q, setQ] = useStateMX('');
  const [type, setType] = useStateMX('Semua');
  const [cov, setCov] = useStateMX('Semua');
  const [hideNA, setHideNA] = useStateMX(false);
  const [appl, setAppl] = useStateMX(() => loader('ams.std.applicable', {}));
  React.useEffect(() => { try { localStorage.setItem('ams.std.applicable', JSON.stringify(appl)); } catch (e) {} }, [appl]);
  const [newNum, setNewNum] = useStateMX(() => loader('ams.std.newnum', false));
  React.useEffect(() => { try { localStorage.setItem('ams.std.newnum', JSON.stringify(newNum)); } catch (e) {} }, [newNum]);

  const isApplicable = (code) => appl[code] !== false;
  const toggleAppl = (code) => setAppl(a => ({ ...a, [code]: a[code] === false ? true : false }));

  const types = ['Semua', 'SA', 'PSAK', 'SAK', 'SPR', 'SJAH', 'SPM', 'SPA', 'KEPAP'];
  const covs = [['Semua', 'Semua'], ['checklist', 'Checklist'], ['module', 'Modul'], ['gap', 'Belum']];

  const rows = useMemoMX(() => STANDARDS_REGISTRY.filter(r => {
    if (type !== 'Semua' && r.type !== type) return false;
    if (cov !== 'Semua' && r.coverage !== cov) return false;
    if (hideNA && !isApplicable(r.code)) return false;
    if (q) { const a = IFRS_ALIAS[r.code]; const s = (r.code + ' ' + r.title + (a ? ' ' + a.code + ' ' + a.base : '')).toLowerCase(); if (!s.includes(q.toLowerCase())) return false; }
    return true;
  }), [type, cov, hideNA, q, appl]);

  // summary across the full registry (applicable only)
  const applRows = STANDARDS_REGISTRY.filter(r => isApplicable(r.code));
  const nChecklist = applRows.filter(r => r.coverage === 'checklist').length;
  const nModule = applRows.filter(r => r.coverage === 'module').length;
  const nGap = applRows.filter(r => r.coverage === 'gap').length;
  const pcts = applRows.filter(r => r.coverage === 'checklist').map(r => (window.compliancePct ? (window.compliancePct(r.module) || { pct: 0 }).pct : 0));
  const avgPct = pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : 0;

  // group visible rows by phase
  const byPhase = PHASE_ORDER.map(ph => ({ phase: ph, items: rows.filter(r => r.phase === ph) })).filter(g => g.items.length);

  const chip = (active, onClick, label, key) => (
    <button key={key} onClick={onClick} className="chip" style={{ cursor: 'pointer', border: '1px solid ' + (active ? 'var(--blue)' : 'var(--line-strong)'), background: active ? 'var(--blue)' : '#fff', color: active ? '#fff' : 'var(--ink-2)', fontWeight: active ? 700 : 600, height: 26 }}>{label}</button>
  );

  return (
    <>
      <SubBar moduleId="compmatrix" right={
        <div className="row gap8 ac">
          <Badge kind="blue">{STANDARDS_REGISTRY.length} standar terdaftar</Badge>
          <Btn sm><I.download size={13} /> Export Register</Btn>
        </div>
      } />
      <div className="view-scroll">
        <div className="view-pad" style={{ display: 'grid', gap: 12 }}>
          {/* summary */}
          <div className="grid" style={{ gridTemplateColumns: 'repeat(5,1fr)', gap: 10 }}>
            <MxCard value={STANDARDS_REGISTRY.length} label="Total standar" sub="SA · PSAK · SAK · Perikatan" />
            <MxCard value={nChecklist} label="Checklist kepatuhan" accent="var(--green)" sub="diuji per-engagement" />
            <MxCard value={nModule} label="Tertaut modul khusus" accent="var(--blue)" sub="alur kerja fungsional" />
            <MxCard value={nGap} label="Belum tercakup" accent={nGap ? 'var(--amber)' : 'var(--green)'} sub="kandidat backlog" />
            <MxCard value={avgPct + '%'} label="Rerata kepatuhan" accent={avgPct === 100 ? 'var(--green)' : 'var(--navy)'} sub="checklist berlaku" />
          </div>

          {/* filters */}
          <div className="panel" style={{ padding: 12, display: 'grid', gap: 10 }}>
            <div className="row ac gap10" style={{ flexWrap: 'wrap' }}>
              <div className="row ac" style={{ flex: '1 1 240px', minWidth: 220, border: '1px solid var(--line-strong)', borderRadius: 8, padding: '0 10px', height: 34, gap: 8 }}>
                <I.search2 size={15} style={{ color: 'var(--ink-4)' }} />
                <input value={q} onChange={e => setQ(e.target.value)} placeholder="Cari nomor atau judul standar…" style={{ border: 'none', outline: 'none', flex: 1, fontSize: 13, background: 'transparent' }} />
                {q && <button className="p-act" onClick={() => setQ('')} title="Bersihkan"><I.x size={14} /></button>}
              </div>
              <label className="row ac gap6 tiny" style={{ cursor: 'pointer', userSelect: 'none', fontWeight: 600, color: 'var(--ink-2)' }}>
                <input type="checkbox" checked={hideNA} onChange={e => setHideNA(e.target.checked)} style={{ width: 15, height: 15, accentColor: 'var(--blue)' }} />
                Sembunyikan N/A
              </label>
              <label className="row ac gap6 tiny" style={{ cursor: 'pointer', userSelect: 'none', fontWeight: 600, color: 'var(--ink-2)' }} title="Tampilkan penomoran PSAK selaras-IFRS (efektif 2024) sebagai nomor utama">
                <input type="checkbox" checked={newNum} onChange={e => setNewNum(e.target.checked)} style={{ width: 15, height: 15, accentColor: 'var(--blue)' }} />
                Penomoran selaras-IFRS
              </label>
            </div>
            <div className="row ac gap10" style={{ flexWrap: 'wrap' }}>
              <span className="tiny muted" style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', width: 56 }}>Tipe</span>
              <div className="row gap6" style={{ flexWrap: 'wrap' }}>{types.map(t => chip(type === t, () => setType(t), t, t))}</div>
            </div>
            <div className="row ac gap10" style={{ flexWrap: 'wrap' }}>
              <span className="tiny muted" style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', width: 56 }}>Cakupan</span>
              <div className="row gap6" style={{ flexWrap: 'wrap' }}>{covs.map(c => chip(cov === c[0], () => setCov(c[0]), c[1], c[0]))}</div>
            </div>
          </div>

          {/* table */}
          <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: COLS, gap: 10, padding: '9px 14px', borderBottom: '1px solid var(--line)', background: 'var(--surface-2)' }}>
              {['Kode', 'Standar', 'Tipe', 'Cakupan', 'Progres / Status', 'Berlaku'].map((h, i) => (
                <span key={i} className="tiny muted" style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', textAlign: i >= 4 ? 'left' : 'left' }}>{h}</span>
              ))}
            </div>
            {byPhase.length === 0 && (
              <div className="row ac jc" style={{ padding: 28, color: 'var(--ink-4)', fontSize: 13 }}>Tidak ada standar yang cocok dengan filter.</div>
            )}
            {byPhase.map(g => (
              <div key={g.phase}>
                <div className="row ac gap8" style={{ padding: '7px 14px', background: 'var(--surface-3)', borderBottom: '1px solid var(--line-soft)' }}>
                  <span className="tiny" style={{ fontWeight: 700, color: 'var(--ink-2)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{g.phase}</span>
                  <span className="tiny muted">{g.items.length}</span>
                </div>
                {g.items.map(r => {
                  const cm = COV_META[r.coverage];
                  const al = IFRS_ALIAS[r.code];
                  const na = !isApplicable(r.code);
                  const navigable = r.coverage !== 'gap' && r.module;
                  const prog = r.coverage === 'checklist' && window.compliancePct ? window.compliancePct(r.module) : null;
                  return (
                    <div key={r.code} onClick={() => navigable && nav(r.module, { from: 'compmatrix' })}
                      style={{ display: 'grid', gridTemplateColumns: COLS, gap: 10, padding: '10px 14px', borderBottom: '1px solid var(--line-soft)', alignItems: 'center', cursor: navigable ? 'pointer' : 'default', opacity: na ? 0.5 : 1 }}
                      onMouseEnter={e => { if (navigable) e.currentTarget.style.background = 'var(--blue-050)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                      <div style={{ minWidth: 0 }}>
                        <div className="mono" style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy)' }}>{newNum && al ? al.code : r.code}</div>
                        {al && <div className="mono" style={{ fontSize: 9.5, color: 'var(--ink-4)', marginTop: 2, whiteSpace: 'nowrap' }}>{newNum ? ('lama ' + r.code) : ('\u2261 ' + al.code)}</div>}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.35 }}>{r.title}</div>
                        {r.coverage === 'module' && <div className="tiny muted">→ {(MODULE_INDEX[r.module] || {}).label || r.module}</div>}
                        {r.coverage === 'gap' && <div className="tiny" style={{ color: 'var(--amber)' }}>Kandidat untuk ditambahkan</div>}
                      </div>
                      <span><Badge kind={STD_TYPE_KIND[r.type] || 'gray'}>{r.type}</Badge></span>
                      <span><Badge kind={cm.kind}>{cm.label}</Badge></span>
                      <div>
                        {prog ? (
                          <div className="row ac gap8">
                            <div style={{ flex: 1, maxWidth: 90 }}><Progress value={prog.pct} color={prog.pct === 100 ? 'var(--green)' : undefined} /></div>
                            <span className="mono tiny" style={{ fontWeight: 700, color: prog.pct === 100 ? 'var(--green)' : 'var(--ink-2)' }}>{prog.pct}%</span>
                          </div>
                        ) : r.coverage === 'module' ? (
                          <span className="tiny muted row ac gap4">Buka modul <I.arrowRight size={12} /></span>
                        ) : (
                          <span className="tiny" style={{ color: 'var(--ink-4)' }}>—</span>
                        )}
                      </div>
                      <button onClick={e => { e.stopPropagation(); toggleAppl(r.code); }} title="Tandai keberlakuan untuk engagement aktif"
                        className="chip" style={{ cursor: 'pointer', height: 22, fontWeight: 700, border: '1px solid ' + (na ? 'var(--line-strong)' : 'var(--green)'), background: na ? 'var(--surface-3)' : 'var(--green-bg)', color: na ? 'var(--ink-4)' : 'var(--green)' }}>
                        {na ? 'N/A' : 'Berlaku'}
                      </button>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="tiny muted" style={{ padding: '0 2px 4px', lineHeight: 1.5 }}>
            Matriks ini memetakan setiap standar ke satu rumah: <b>Checklist</b> (diuji langsung di tab ini), <b>Modul khusus</b> (alur kerja fungsional terpisah), atau <b>Belum tercakup</b> (backlog). Keberlakuan disetel per-engagement aktif — standar N/A tetap tercatat untuk jejak audit.
          </div>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { STANDARDS_REGISTRY, ComplianceMatrix });

/* module -> alias selaras-IFRS, untuk chip di header modul (SubBar) */
const MODULE_IFRS = {};
STANDARDS_REGISTRY.forEach(r => { const a = IFRS_ALIAS[r.code]; if (a && r.module && !MODULE_IFRS[r.module]) MODULE_IFRS[r.module] = { ...a, legacy: r.code }; });
Object.assign(window, { STD_IFRS_ALIAS: IFRS_ALIAS, MODULE_IFRS });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { ComplianceMatrix, MODULE_IFRS, STANDARDS_REGISTRY };
export const STD_IFRS_ALIAS = window.STD_IFRS_ALIAS;
