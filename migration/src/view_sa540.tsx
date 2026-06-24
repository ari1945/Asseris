/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { useAmsPersist, useAuth, useFirm } from './contexts';
import { amsExportPdf } from './export_pdf';
import { I } from './icons';
import { SACanonChips, SACanonicalStatus } from './sa_canonical';
import { SubBar } from './shell';
import { Badge, Btn, Panel, Tabs } from './ui';
import { KvBox } from './view_analytical';
import { WpPanel } from './wp_signoff';

/* ============================================================
   Asseris — SA 540 · Audit atas Estimasi Akuntansi
   Deep workpaper: inventaris estimasi & ketidakpastian,
   penilaian risiko bawaan (kompleksitas/subjektivitas/
   ketidakpastian), respons (uji proses manajemen & rentang
   independen), indikator bias, serta pengungkapan.
   ============================================================ */
const { useState: useState540, useMemo: useMemo540 } = React;

/* ---- Inventaris estimasi (Rp jt) ---- */
const EST_REG: Estimate[] = [
  { id: 'E-01', name: 'CKPN Piutang (ECL · PSAK 71)', acct: 'Cadangan Kerugian', mgmt: 4870, lo: 4600, hi: 6300, unc: 'Tinggi', risk: 'Signifikan', method: 'Model ECL forward-looking; PD × LGD × EAD per staging', assump: ['Probabilitas gagal bayar (PD) per kelompok umur', 'Loss given default (LGD) berbasis recovery historis', 'Overlay makroekonomi (PDB, suku bunga)'], approach: 'Rentang independen', note: 'Titik manajemen di batas bawah rentang auditor — indikasi understatement (lihat Bias).' },
  { id: 'E-02', name: 'Penyisihan Persediaan Usang', acct: 'Penyisihan Persediaan', mgmt: 2240, lo: 2050, hi: 2600, unc: 'Sedang', risk: 'Signifikan', method: 'Analisis umur & perputaran SKU; net realizable value', assump: ['Klasifikasi lambat-bergerak (> 180 hari)', 'Estimasi nilai jual bersih SKU usang', 'Rencana likuidasi/diskon manajemen'], approach: 'Uji proses manajemen', note: 'Dalam rentang; konsisten dengan temuan hitung fisik SA 501 (GBJ-03).' },
  { id: 'E-03', name: 'Provisi Garansi Produk', acct: 'Provisi', mgmt: 1080, lo: 980, hi: 1240, unc: 'Sedang', risk: 'Non-signifikan', method: 'Tingkat klaim historis × penjualan bergaransi', assump: ['Rasio klaim historis 36 bulan', 'Periode garansi rata-rata', 'Tren kualitas produk'], approach: 'Uji proses manajemen', note: 'Telaah retrospektif menunjukkan estimasi PY akurat (selisih −6%).' },
  { id: 'E-04', name: 'Liabilitas Imbalan Kerja (PSAK 24)', acct: 'Liabilitas Imbalan Pasti', mgmt: 9650, lo: 9100, hi: 10400, unc: 'Tinggi', risk: 'Signifikan', method: 'Projected Unit Credit oleh aktuaris independen', assump: ['Tingkat diskonto (obligasi korporasi)', 'Kenaikan gaji jangka panjang', 'Tingkat mortalita & pengunduran diri'], approach: 'Gunakan pakar (SA 620)', note: 'Asumsi diskonto di kisaran wajar; kompetensi & objektivitas aktuaris dievaluasi.' },
  { id: 'E-05', name: 'Uji Penurunan Nilai Goodwill', acct: 'Goodwill', mgmt: 0, lo: 0, hi: 1800, unc: 'Tinggi', risk: 'Signifikan', method: 'Value-in-use; arus kas terdiskonto (DCF) per UPK', assump: ['Tingkat pertumbuhan terminal', 'WACC (tingkat diskonto)', 'Proyeksi arus kas 5 tahun'], approach: 'Rentang independen', note: 'Tidak ada rugi penurunan nilai diakui; headroom tipis & sensitif terhadap WACC.' },
];

/* ---- Indikator bias manajemen (¶32) ---- */
const BIAS_ROWS: BiasRow[] = [
  { id: 'B-01', t: 'Perubahan estimasi/asumsi yang menggeser laba ke arah menguntungkan', est: 'CKPN Piutang', flag: 'amber', d: 'Titik di batas bawah rentang; overlay makro dikurangi vs PY.' },
  { id: 'B-02', t: 'Telaah retrospektif — selisih estimasi PY vs realisasi', est: 'CKPN Piutang', flag: 'amber', d: 'CKPN PY understated 42% terhadap realisasi (rujuk SA 240).' },
  { id: 'B-03', t: 'Seleksi titik dalam rentang tanpa dasar netral', est: 'Goodwill', flag: 'amber', d: 'WACC di batas bawah kisaran wajar — menaikkan value-in-use.' },
  { id: 'B-04', t: 'Konsistensi metode & asumsi antar periode', est: 'Imbalan Kerja', flag: 'green', d: 'Metode & sumber asumsi aktuaria konsisten dengan PY.' },
];

/* ---- model estimasi ter-persist engagement-scoped (SA 540 revisi) ---- */
type Estimate = { id: string; name: string; acct: string; mgmt: number; lo: number; hi: number; unc: string; risk: string; method: string; assump: string[]; approach: string; note: string; by?: string; at?: string };
type BiasRow = { id: string; t: string; est: string; flag: string; d: string; by?: string; at?: string };
type EstState = { register: Estimate[]; bias: BiasRow[] };
/* tipe struktural minimal event input — hindari explicit-any (ratchet) */
type Ev = { target: { value: string } };

const EST_UNC = ['Tinggi', 'Sedang', 'Rendah'];
const EST_RISK = ['Signifikan', 'Non-signifikan'];
const EST_APPROACH = ['Uji proses manajemen', 'Rentang independen', 'Gunakan pakar (SA 620)', 'Uji peristiwa kemudian'];
const BIAS_FLAG = ['amber', 'green'];

const EST_SEED: EstState = { register: EST_REG, bias: BIAS_ROWS };

function estToday() {
  try { return new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch (e) { return ''; }
}
function nextEId(list: Estimate[]) {
  const n = list.reduce((mx, e) => { const m = /E-(\d+)/.exec(e.id || ''); return m ? Math.max(mx, +m[1]) : mx; }, 0);
  return 'E-' + String(n + 1).padStart(2, '0');
}
function nextBId(list: BiasRow[]) {
  const n = list.reduce((mx, b) => { const m = /B-(\d+)/.exec(b.id || ''); return m ? Math.max(mx, +m[1]) : mx; }, 0);
  return 'B-' + String(n + 1).padStart(2, '0');
}

/* ============================================================ */
function SA540View() {
  const firm = useFirm();
  const auth = useAuth();
  const me = (auth && auth.user && auth.user.name) || 'Auditor';
  const client = firm?.activeClient?.name || 'PT Sentosa Makmur Tbk';
  const engId = firm?.activeEngagement?.id || 'default';
  const engLabel = firm?.activeEngagement?.id || 'ENG-2025-014';
  const locked = !!(firm && firm.locked);
  /* engagement-scoped (AMS_PERSIST_SCOPE: 'estimates.v1' → engagement) — isolasi W7.5
     & RBAC WP_EDIT (bukan firm/FIRM_ADMIN). scopeId = perikatan aktif otomatis. */
  const [est, setEst] = useAmsPersist('estimates.v1', () => EST_SEED);
  const register: Estimate[] = (est && est.register) || [];
  const bias: BiasRow[] = (est && est.bias) || [];
  const setRegister = (fn: (l: Estimate[]) => Estimate[]) => setEst((s: EstState) => ({ ...s, register: fn((s && s.register) || []) }));
  const setBias = (fn: (l: BiasRow[]) => BiasRow[]) => setEst((s: EstState) => ({ ...s, bias: fn((s && s.bias) || []) }));

  const [tab, setTab] = useState540('inventaris');
  const sig = register.filter(e => e.risk === 'Signifikan').length;
  const uncHi = register.filter(e => e.unc === 'Tinggi').length;
  const biasFlags = bias.filter(b => b.flag !== 'green').length;
  const tabs = [
    { id: 'inventaris', label: 'Inventaris Estimasi' },
    { id: 'risiko', label: 'Risiko & Ketidakpastian' },
    { id: 'respons', label: 'Respons & Rentang' },
    { id: 'bias', label: 'Bias & Pengungkapan' },
  ];

  const exportMemo = () => {
    const regRows = register.map(e => [e.id, e.name, e.mgmt.toLocaleString('id-ID'), e.lo.toLocaleString('id-ID') + '–' + e.hi.toLocaleString('id-ID'), e.unc, e.risk]);
    const biasRows = bias.map(b => [b.id, b.t, b.est, b.flag === 'green' ? 'Wajar' : 'Perhatian']);
    amsExportPdf({
      kind: 'memo-estimasi', scope: 'engagement', scopeId: engId,
      firm: (AMS.FIRM as { name?: string }).name || 'KAP', title: 'Memo Audit atas Estimasi Akuntansi (SA 540)',
      refNo: 'E-540 · ' + engLabel,
      meta: [client + ' · ' + engLabel, 'SA 540 (Revisi) — Estimasi Akuntansi & Pengungkapan', 'Dibuat: ' + estToday() + ' · ' + me],
      blocks: [
        { type: 'heading', text: 'Inventaris Estimasi (Rp jt)' },
        { type: 'table', head: ['Ref', 'Estimasi', 'Titik Mgmt', 'Rentang Auditor', 'Ketidakpastian', 'Risiko'], body: regRows.length ? regRows : [['—', '—', '—', '—', '—', '—']], columnStyles: { 1: { cellWidth: 150 } } },
        { type: 'heading', text: 'Indikator Kemungkinan Bias Manajemen (¶32)' },
        { type: 'table', head: ['Ref', 'Indikator', 'Estimasi', 'Status'], body: biasRows.length ? biasRows : [['—', '—', '—', '—']], columnStyles: { 1: { cellWidth: 220 } } },
      ],
    }).catch(() => {});
  };

  return (
    <>
      <SubBar moduleId="sa540" right={
        <div className="row gap8 ac">
          <SACanonChips stdId="sa540" />
          <Btn sm onClick={exportMemo}><I.download size={13} /> Memo Estimasi</Btn>
        </div>
      } />
      <div className="view-scroll"><div className="view-pad">

        <Panel noBody style={{ marginBottom: 12 }}>
          <div style={{ padding: '13px 16px', display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ minWidth: 210 }}>
              <div className="tiny muted upper" style={{ marginBottom: 3 }}>Standar Audit 540 (Revisi)</div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>Estimasi Akuntansi & Pengungkapan</div>
              <div className="tiny muted">{client} · {engLabel}</div>
            </div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Estimasi Teridentifikasi</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5 }}>{register.length} · {sig} signifikan</div></div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Ketidakpastian Tinggi</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--red)' }}>{uncHi} estimasi</div></div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Indikasi Bias</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--amber)' }}>{biasFlags} perhatian</div></div>
            <div style={{ flex: 1 }} />
            <div style={{ textAlign: 'right' }}>
              <div className="tiny muted upper" style={{ marginBottom: 3 }}>Sikap Auditor</div>
              <Badge kind="amber" dot>Skeptisisme Profesional</Badge>
            </div>
          </div>
        </Panel>

        <SACanonicalStatus stdId="sa540" />

        <div style={{ marginBottom: 12 }}><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>

        {tab === 'inventaris' && <F540Register register={register} setRegister={setRegister} me={me} locked={locked} />}
        {tab === 'risiko' && <F540Risk />}
        {tab === 'respons' && <F540Response />}
        {tab === 'bias' && <F540Bias bias={bias} setBias={setBias} me={me} locked={locked} />}

      </div></div>
    </>
  );
}

/* ---------------- Tab: Inventaris Estimasi ---------------- */
function F540Register({ register, setRegister, me, locked }: { register: Estimate[]; setRegister: (fn: (l: Estimate[]) => Estimate[]) => void; me: string; locked: boolean }) {
  const [selId, setSelId] = useState540('E-01');
  const sel = register.find(e => e.id === selId) || register[0] || null;
  const uncKind = (u: string) => u === 'Tinggi' ? 'red' : u === 'Sedang' ? 'amber' : 'green';
  const pos = sel && sel.hi > sel.lo ? Math.max(0, Math.min(100, ((sel.mgmt - sel.lo) / (sel.hi - sel.lo)) * 100)) : 50;
  const patch = (id: string, p: Partial<Estimate>) => setRegister(l => l.map(e => e.id === id ? { ...e, ...p, by: me, at: estToday() } : e));
  const add = () => {
    const id = nextEId(register);
    setRegister(l => [...l, { id, name: 'Estimasi baru', acct: '', mgmt: 0, lo: 0, hi: 0, unc: 'Sedang', risk: 'Non-signifikan', method: '', assump: [], approach: 'Uji proses manajemen', note: '', by: me, at: estToday() }]);
    setSelId(id);
  };
  const del = (id: string) => { setRegister(l => l.filter(e => e.id !== id)); setSelId(null); };
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 380px', gap: 12, alignItems: 'start' }}>
      <Panel noBody>
        <div className="panel-h"><h3>Inventaris Estimasi Akuntansi</h3><div style={{ flex: 1 }} /><span className="tiny muted" style={{ marginRight: 8 }}>{register.length} estimasi</span>{!locked && <Btn sm onClick={add}><I.plus size={12} /> Tambah</Btn>}</div>
        <table className="dtbl">
          <thead><tr><th style={{ width: 50 }}>Ref</th><th>Estimasi</th><th className="num">Titik Mgmt</th><th style={{ width: 88 }}>Ketidakpastian</th><th style={{ width: 96 }}>Risiko</th></tr></thead>
          <tbody>
            {register.map(e => (
              <tr key={e.id} className={e.id === (sel && sel.id) ? 'sel' : ''} onClick={() => setSelId(e.id)} style={{ cursor: 'pointer' }}>
                <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{e.id}</td>
                <td style={{ fontWeight: 600, whiteSpace: 'normal', lineHeight: 1.35 }}>{e.name}<div className="tiny muted" style={{ fontWeight: 400, marginTop: 2 }}>{e.acct}</div></td>
                <td className="num mono">{e.mgmt.toLocaleString('id-ID')}</td>
                <td><Badge kind={uncKind(e.unc)}>{e.unc}</Badge></td>
                <td><Badge kind={e.risk === 'Signifikan' ? 'red' : 'gray'}>{e.risk === 'Signifikan' ? 'Signifikan' : 'Non-sig.'}</Badge></td>
              </tr>
            ))}
            {!register.length && <tr><td colSpan={5} className="tiny muted" style={{ textAlign: 'center', padding: 18 }}>Belum ada estimasi tercatat.</td></tr>}
          </tbody>
        </table>
      </Panel>

      {sel && (
        <Panel noBody>
          <div style={{ background: 'var(--surface-2)', padding: '11px 14px', borderBottom: '1px solid var(--line)' }}>
            <div className="row ac jb">
              <div className="row ac gap8"><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{sel.id}</span><Badge kind={uncKind(sel.unc)}>Ketidakpastian {sel.unc}</Badge>{sel.risk === 'Signifikan' && <Badge kind="red">Signifikan</Badge>}</div>
              {!locked && <button className="btn sm icon" title="Hapus" onClick={() => del(sel.id)}><I.x size={13} /></button>}
            </div>
            {locked && <div style={{ fontWeight: 700, fontSize: 13, marginTop: 4, lineHeight: 1.35 }}>{sel.name}</div>}
          </div>
          <div style={{ padding: 14 }}>
            {!locked && (
              <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
                <div className="field"><label>Estimasi</label><input className="input" value={sel.name} onChange={(e: Ev) => patch(sel.id, { name: e.target.value })} /></div>
                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div className="field"><label>Akun</label><input className="input" value={sel.acct} onChange={(e: Ev) => patch(sel.id, { acct: e.target.value })} /></div>
                  <div className="field"><label>Pendekatan</label><select className="select" value={sel.approach} onChange={(e: Ev) => patch(sel.id, { approach: e.target.value })}>{EST_APPROACH.map(a => <option key={a}>{a}</option>)}</select></div>
                </div>
                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  <div className="field"><label>Titik Mgmt</label><input className="input mono" type="number" value={sel.mgmt} onChange={(e: Ev) => patch(sel.id, { mgmt: +e.target.value })} style={{ textAlign: 'right' }} /></div>
                  <div className="field"><label>Batas Bawah</label><input className="input mono" type="number" value={sel.lo} onChange={(e: Ev) => patch(sel.id, { lo: +e.target.value })} style={{ textAlign: 'right' }} /></div>
                  <div className="field"><label>Batas Atas</label><input className="input mono" type="number" value={sel.hi} onChange={(e: Ev) => patch(sel.id, { hi: +e.target.value })} style={{ textAlign: 'right' }} /></div>
                </div>
                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div className="field"><label>Ketidakpastian</label><select className="select" value={sel.unc} onChange={(e: Ev) => patch(sel.id, { unc: e.target.value })}>{EST_UNC.map(u => <option key={u}>{u}</option>)}</select></div>
                  <div className="field"><label>Risiko</label><select className="select" value={sel.risk} onChange={(e: Ev) => patch(sel.id, { risk: e.target.value })}>{EST_RISK.map(r => <option key={r}>{r}</option>)}</select></div>
                </div>
              </div>
            )}

            <div className="tiny muted upper" style={{ marginBottom: 4 }}>Metode Pengukuran</div>
            {locked ? <p style={{ margin: '0 0 12px', fontSize: 12, lineHeight: 1.5 }}>{sel.method}</p>
              : <textarea className="input" value={sel.method} onChange={(e: Ev) => patch(sel.id, { method: e.target.value })} style={{ height: 44, padding: 8, lineHeight: 1.4, resize: 'vertical', marginBottom: 12 }} />}

            <div className="tiny muted upper" style={{ marginBottom: 6 }}>Titik Manajemen vs Rentang Auditor (Rp jt)</div>
            <div style={{ position: 'relative', height: 30, marginBottom: 4 }}>
              <div style={{ position: 'absolute', top: 12, left: 0, right: 0, height: 6, borderRadius: 3, background: 'linear-gradient(90deg,var(--green),var(--amber),var(--red))', opacity: .25 }} />
              <div style={{ position: 'absolute', top: 12, left: 0, right: 0, height: 6, borderRadius: 3, border: '1px solid var(--line-strong)' }} />
              <div style={{ position: 'absolute', top: 6, left: `calc(${pos}% - 1px)`, width: 2, height: 18, background: 'var(--navy)' }} />
              <div style={{ position: 'absolute', top: -2, left: `${pos}%`, transform: 'translateX(-50%)' }}><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--navy)' }}>{sel.mgmt.toLocaleString('id-ID')}</span></div>
            </div>
            <div className="row jb tiny mono muted" style={{ marginBottom: 12 }}><span>{sel.lo.toLocaleString('id-ID')}</span><span>rentang independen auditor</span><span>{sel.hi.toLocaleString('id-ID')}</span></div>

            <div className="tiny muted upper" style={{ marginBottom: 5 }}>Asumsi Signifikan {!locked && <span className="muted" style={{ textTransform: 'none' }}>(satu per baris)</span>}</div>
            {locked ? sel.assump.map((a, i) => (
              <div key={i} className="row gap8" style={{ fontSize: 12, alignItems: 'flex-start', padding: '6px 0', borderBottom: i < sel.assump.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
                <span style={{ color: 'var(--blue)', flex: '0 0 auto', marginTop: 1 }}><I.arrowRight size={13} /></span><span style={{ lineHeight: 1.4 }}>{a}</span>
              </div>
            )) : <textarea className="input" value={sel.assump.join('\n')} onChange={(e: Ev) => patch(sel.id, { assump: e.target.value.split('\n').map(s => s.trim()).filter(Boolean) })} style={{ height: 64, padding: 8, lineHeight: 1.5, resize: 'vertical' }} placeholder="Asumsi signifikan, satu per baris…" />}

            <div className="tiny muted upper" style={{ margin: '12px 0 5px' }}>Catatan Auditor</div>
            {locked ? (
              <div className="panel" style={{ padding: '9px 11px', background: 'var(--surface-2)', borderColor: 'transparent' }}>
                <div className="row gap8" style={{ alignItems: 'flex-start' }}><span style={{ color: 'var(--blue)', flex: '0 0 auto' }}><I.flag size={14} /></span><span style={{ fontSize: 11.5, lineHeight: 1.4 }}>{sel.note}</span></div>
              </div>
            ) : <textarea className="input" value={sel.note} onChange={(e: Ev) => patch(sel.id, { note: e.target.value })} style={{ height: 50, padding: 8, lineHeight: 1.45, resize: 'vertical' }} placeholder="Catatan/kesimpulan atas estimasi…" />}
            {sel.by && <div className="tiny muted" style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--line-soft)' }}><I.check size={11} /> Diperbarui {sel.by} · {sel.at}</div>}
          </div>
        </Panel>
      )}
    </div>
  );
}

/* ---------------- Tab: Risiko & Ketidakpastian ---------------- */
function F540Risk() {
  const drivers = [
    { k: 'Kompleksitas', ic: 'layers', color: 'blue', d: 'Kerumitan metode/model & data yang dibutuhkan untuk membuat estimasi.', ex: 'Model ECL multi-skenario & DCF goodwill tergolong kompleks.' },
    { k: 'Subjektivitas', ic: 'sliders', color: 'purple', d: 'Keterbatasan pengetahuan/data objektif → pertimbangan manajemen.', ex: 'Pemilihan WACC & overlay makro melibatkan pertimbangan signifikan.' },
    { k: 'Ketidakpastian Estimasi', ic: 'target', color: 'red', d: 'Kerentanan terhadap kurangnya presisi pengukuran.', ex: 'Rentang hasil yang masuk akal lebar (CKPN, goodwill, imbalan kerja).' },
  ];
  return (
    <div className="grid" style={{ gap: 12 }}>
      <Panel noBody>
        <div className="panel-h"><h3>Faktor Risiko Bawaan Estimasi (¶ Pendekatan SA 540 Revisi)</h3><div style={{ flex: 1 }} /><Badge kind="blue">Spektrum risiko bawaan</Badge></div>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', gap: 0 }}>
          {drivers.map((d, i) => {
            const Ic = (I as any)[d.ic];
            return (
              <div key={i} style={{ padding: 16, borderRight: i < 2 ? '1px solid var(--line-soft)' : 0 }}>
                <span style={{ width: 38, height: 38, borderRadius: 9, display: 'grid', placeItems: 'center', background: `var(--${d.color}-bg)`, color: `var(--${d.color})`, marginBottom: 10 }}><Ic size={19} /></span>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{d.k}</div>
                <p className="tiny muted" style={{ margin: '4px 0 8px', lineHeight: 1.45 }}>{d.d}</p>
                <div className="chip tiny" style={{ background: 'var(--surface-2)' }}>{d.ex}</div>
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel noBody>
        <div className="panel-h"><h3>Pemetaan Ketidakpastian per Estimasi</h3><div style={{ flex: 1 }} /><span className="tiny muted">Kompleksitas × Subjektivitas</span></div>
        <table className="dtbl">
          <thead><tr><th>Estimasi</th><th style={{ width: 110 }}>Kompleksitas</th><th style={{ width: 110 }}>Subjektivitas</th><th style={{ width: 130 }}>Ketidakpastian</th><th style={{ width: 96 }}>Risiko</th></tr></thead>
          <tbody>
            {[
              ['CKPN Piutang (ECL)', 'Tinggi', 'Tinggi', 'Tinggi', 'red'],
              ['Penyisihan Persediaan', 'Sedang', 'Sedang', 'Sedang', 'amber'],
              ['Provisi Garansi', 'Rendah', 'Rendah', 'Sedang', 'gray'],
              ['Imbalan Kerja (PSAK 24)', 'Tinggi', 'Sedang', 'Tinggi', 'red'],
              ['Penurunan Nilai Goodwill', 'Tinggi', 'Tinggi', 'Tinggi', 'red'],
            ].map((r, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 600 }}>{r[0]}</td>
                <td><Badge kind={r[1] === 'Tinggi' ? 'red' : r[1] === 'Sedang' ? 'amber' : 'green'}>{r[1]}</Badge></td>
                <td><Badge kind={r[2] === 'Tinggi' ? 'red' : r[2] === 'Sedang' ? 'amber' : 'green'}>{r[2]}</Badge></td>
                <td><Badge kind={r[3] === 'Tinggi' ? 'red' : 'amber'}>{r[3]}</Badge></td>
                <td><Badge kind={r[4]}>{r[4] === 'red' ? 'Signifikan' : r[4] === 'amber' ? 'Elevasi' : 'Normal'}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="panel" style={{ margin: 12, padding: '10px 12px', background: 'var(--blue-050)', borderColor: 'var(--blue-100)' }}>
          <div className="row gap8" style={{ alignItems: 'flex-start' }}>
            <span style={{ color: 'var(--blue)', flex: '0 0 auto' }}><I.book size={15} /></span>
            <span style={{ fontSize: 11.5, lineHeight: 1.45 }}>SA 540 revisi menuntut penilaian risiko bawaan secara <b>terpisah</b> dari risiko pengendalian, dengan mempertimbangkan derajat <b>kompleksitas, subjektivitas, & ketidakpastian estimasi</b> pada spektrum risiko bawaan (¶4, ¶13).</span>
          </div>
        </div>
      </Panel>
    </div>
  );
}

/* ---------------- Tab: Respons & Rentang ---------------- */
function F540Response() {
  const approaches = [
    { k: 'Uji bagaimana manajemen membuat estimasi', ref: '¶18', d: 'Evaluasi metode, asumsi signifikan, & data; uji penerapan & matematika model.', used: 'Persediaan · Garansi' },
    { k: 'Uji peristiwa hingga tanggal laporan auditor', ref: '¶21(a)', d: 'Bukti dari peristiwa setelah periode yang menguatkan/menyangkal estimasi.', used: 'Piutang (penerimaan kas pasca-periode)' },
    { k: 'Kembangkan estimasi/rentang titik auditor', ref: '¶21(b)', d: 'Auditor menyusun nilai/rentang independen untuk mengevaluasi titik manajemen.', used: 'CKPN · Goodwill' },
    { k: 'Uji efektivitas pengendalian atas proses estimasi', ref: '¶20', d: 'Bila bermaksud mengandalkan kontrol atas penyusunan estimasi.', used: 'ITGC model ECL' },
  ];
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 340px', gap: 12, alignItems: 'start' }}>
      <div className="grid" style={{ gap: 12 }}>
        <Panel noBody>
          <div className="panel-h"><h3>Respons Audit atas Estimasi (¶18–21)</h3><div style={{ flex: 1 }} /></div>
          <div style={{ padding: '6px 14px 14px' }}>
            {approaches.map((a, i) => (
              <div key={i} className="row gap10" style={{ padding: '11px 0', alignItems: 'flex-start', borderBottom: i < approaches.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
                <span style={{ color: 'var(--blue)', flex: '0 0 auto', marginTop: 1 }}><I.checkCircle size={16} /></span>
                <div style={{ flex: 1 }}>
                  <div className="row jb ac"><div style={{ fontSize: 12.5, fontWeight: 700 }}>{a.k}</div><span className="mono tiny" style={{ color: 'var(--blue)', fontWeight: 700 }}>{a.ref}</span></div>
                  <div className="tiny muted" style={{ lineHeight: 1.45, margin: '2px 0 5px' }}>{a.d}</div>
                  <div className="chip tiny" style={{ background: 'var(--surface-2)' }}>Diterapkan pada: {a.used}</div>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel noBody>
          <div className="panel-h"><h3>Rentang Independen — CKPN Piutang (E-01)</h3><div style={{ flex: 1 }} /><Badge kind="amber">Titik mgmt di batas bawah</Badge></div>
          <div style={{ padding: 14 }}>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 12 }}>
              <KvBox label="Titik Manajemen" v="4.870" />
              <KvBox label="Rentang Auditor" v="4.600–6.300" accent="var(--blue)" />
              <KvBox label="Titik Tengah Auditor" v="5.450" accent="var(--amber)" />
            </div>
            <p style={{ margin: 0, fontSize: 12, lineHeight: 1.55 }}>Titik manajemen <b>4.870</b> berada di dekat batas bawah rentang auditor yang dipandang masuk akal. Selisih terhadap titik tengah ±<b>580 jt</b> dicatat sebagai <b>kemungkinan salah saji</b> ke SAD Ledger; dievaluasi bersama indikasi bias & telaah retrospektif (SA 240).</p>
          </div>
        </Panel>
      </div>

      <div className="grid" style={{ gap: 12 }}>
        <Panel title="Penggunaan Pakar (SA 620)">
          <div style={{ display: 'grid', gap: 7 }}>
            {[
              { t: 'Kompetensi & kapabilitas aktuaris dievaluasi', ok: true },
              { t: 'Objektivitas / independensi pakar dinilai', ok: true },
              { t: 'Ruang lingkup & asumsi pakar dipahami', ok: true },
              { t: 'Kewajaran temuan pakar dievaluasi', ok: true },
            ].map((r, i) => (
              <div key={i} className="row gap8" style={{ fontSize: 11.5, alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--green)', flex: '0 0 auto', marginTop: 1 }}><I.checkCircle size={15} /></span>
                <span style={{ lineHeight: 1.4 }}>{r.t}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Analisis Sensitivitas — Goodwill">
          <table className="dtbl" style={{ marginTop: -4 }}>
            <thead><tr><th>Asumsi</th><th className="num">Δ</th><th className="num">Δ Value-in-use</th></tr></thead>
            <tbody>
              <tr><td>WACC</td><td className="num mono tiny">+0,5%</td><td className="num mono" style={{ color: 'var(--red)' }}>−2.100</td></tr>
              <tr><td>Pertumbuhan terminal</td><td className="num mono tiny">−0,5%</td><td className="num mono" style={{ color: 'var(--red)' }}>−1.400</td></tr>
              <tr><td>Arus kas thn-1</td><td className="num mono tiny">−10%</td><td className="num mono" style={{ color: 'var(--red)' }}>−1.950</td></tr>
            </tbody>
          </table>
          <div className="panel" style={{ marginTop: 10, padding: '9px 11px', background: 'var(--amber-bg)', borderColor: 'transparent' }}>
            <div className="row ac gap8"><span style={{ color: 'var(--amber)' }}><I.alert size={14} /></span><span style={{ fontSize: 11, lineHeight: 1.4 }}>Headroom tipis — sensitif terhadap WACC. Pertimbangkan sebagai Hal Audit Utama (SA 701).</span></div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ---------------- Tab: Bias & Pengungkapan ---------------- */
function F540Bias({ bias, setBias, me, locked }: { bias: BiasRow[]; setBias: (fn: (l: BiasRow[]) => BiasRow[]) => void; me: string; locked: boolean }) {
  const patch = (id: string, p: Partial<BiasRow>) => setBias(l => l.map(b => b.id === id ? { ...b, ...p, by: me, at: estToday() } : b));
  const add = () => { const id = nextBId(bias); setBias(l => [...l, { id, t: 'Indikator bias baru', est: '', flag: 'amber', d: '', by: me, at: estToday() }]); };
  const del = (id: string) => setBias(l => l.filter(b => b.id !== id));
  const perhatian = bias.filter(b => b.flag !== 'green').length;
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 340px', gap: 12, alignItems: 'start' }}>
      <div className="grid" style={{ gap: 12 }}>
        <Panel noBody>
          <div className="panel-h"><h3>Indikator Kemungkinan Bias Manajemen (¶32)</h3><div style={{ flex: 1 }} /><Badge kind="amber">{perhatian} perhatian</Badge>{!locked && <Btn sm style={{ marginLeft: 8 }} onClick={add}><I.plus size={12} /> Tambah</Btn>}</div>
          <table className="dtbl">
            <thead><tr><th>Indikator</th><th style={{ width: 150 }}>Estimasi</th><th style={{ width: 120 }}>Status</th>{!locked && <th style={{ width: 30 }}></th>}</tr></thead>
            <tbody>
              {bias.map(b => (
                <tr key={b.id}>
                  <td style={{ fontWeight: 600, whiteSpace: 'normal', lineHeight: 1.35 }}>
                    {locked ? <>{b.t}<div className="tiny muted" style={{ fontWeight: 400, marginTop: 2 }}>{b.d}</div></>
                      : <div style={{ display: 'grid', gap: 4 }}>
                          <textarea className="input" value={b.t} onChange={(e: Ev) => patch(b.id, { t: e.target.value })} style={{ height: 34, padding: 6, lineHeight: 1.3, resize: 'vertical', fontWeight: 600 }} />
                          <input className="input" value={b.d} onChange={(e: Ev) => patch(b.id, { d: e.target.value })} placeholder="Detail/dasar…" style={{ height: 26, fontWeight: 400 }} />
                        </div>}
                  </td>
                  <td className="tiny">{locked ? b.est : <input className="input" value={b.est} onChange={(e: Ev) => patch(b.id, { est: e.target.value })} style={{ height: 26 }} />}</td>
                  <td>{locked ? (b.flag === 'green' ? <Badge kind="green">Wajar</Badge> : <Badge kind="amber">Perhatian</Badge>)
                    : <select className="select" value={b.flag} onChange={(e: Ev) => patch(b.id, { flag: e.target.value })} style={{ height: 28, fontSize: 11.5 }}>{BIAS_FLAG.map(f => <option key={f} value={f}>{f === 'green' ? 'Wajar' : 'Perhatian'}</option>)}</select>}</td>
                  {!locked && <td><button className="btn sm icon" title="Hapus" onClick={() => del(b.id)}><I.x size={12} /></button></td>}
                </tr>
              ))}
              {!bias.length && <tr><td colSpan={locked ? 3 : 4} className="tiny muted" style={{ textAlign: 'center', padding: 16 }}>Belum ada indikator bias.</td></tr>}
            </tbody>
          </table>
          <div className="panel" style={{ margin: 12, padding: '10px 12px', background: 'var(--amber-bg)', borderColor: 'transparent' }}>
            <div className="row gap8" style={{ alignItems: 'flex-start' }}>
              <span style={{ color: 'var(--amber)', flex: '0 0 auto' }}><I.alert size={15} /></span>
              <span style={{ fontSize: 11.5, lineHeight: 1.45 }}>Indikator bias <b>secara individual</b> belum tentu salah saji, namun <b>secara kolektif</b> dipertimbangkan dalam mengevaluasi kewajaran estimasi & implikasi terhadap audit secara keseluruhan (¶32, SA 240 ¶32b).</span>
            </div>
          </div>
        </Panel>

        <Panel noBody>
          <div className="panel-h"><h3>Evaluasi Pengungkapan Estimasi (¶26–27)</h3><div style={{ flex: 1 }} /></div>
          <div style={{ padding: '6px 14px 14px' }}>
            {[
              { t: 'Pengungkapan ketidakpastian estimasi memadai untuk estimasi risiko tinggi', done: true },
              { t: 'Asumsi signifikan & sensitivitas diungkap (CKPN, goodwill, imbalan kerja)', done: true },
              { t: 'Metode & sumber data utama dijelaskan dalam CALK', done: true },
              { t: 'Pengungkapan tidak menyesatkan & seimbang (tidak bias)', done: false },
            ].map((p, i) => (
              <div key={i} className="row gap10" style={{ padding: '10px 0', alignItems: 'flex-start', borderBottom: i < 3 ? '1px solid var(--line-soft)' : 0 }}>
                <span style={{ flex: '0 0 auto', marginTop: 1, color: p.done ? 'var(--green)' : 'var(--amber)' }}>{p.done ? <I.checkCircle size={16} /> : <I.clock size={16} />}</span>
                <div style={{ flex: 1, fontSize: 12.5, lineHeight: 1.45 }}>{p.t}</div>
              </div>
            ))}
          </div>
        </Panel>

        <WpPanel moduleId="sa540" title="Kertas Kerja — Sign-off, Bukti & Kesimpulan (SA 540/230)" />
      </div>

      <div className="grid" style={{ gap: 12 }}>
        <Panel title="Representasi Tertulis (¶37 → SA 580)">
          <p className="tiny muted" style={{ margin: '0 0 8px', lineHeight: 1.5 }}>Diperoleh representasi bahwa metode, asumsi, & data yang dipakai manajemen <b>wajar</b> untuk mencapai pengakuan/pengukuran sesuai kerangka pelaporan.</p>
          <div className="row jb ac" style={{ fontSize: 12, padding: '8px 10px', border: '1px solid var(--line-soft)', borderRadius: 7 }}>
            <span className="row ac gap8"><span style={{ color: 'var(--blue)' }}><I.doc size={14} /></span>Lihat Surat Representasi</span>
            <I.arrowRight size={14} style={{ color: 'var(--ink-4)' }} />
          </div>
        </Panel>
        <Panel title="Komunikasi TCWG (SA 260)">
          <div style={{ display: 'grid', gap: 7 }}>
            {['Area ketidakpastian estimasi tinggi & dampaknya', 'Indikasi bias manajemen yang teridentifikasi', 'Selisih titik mgmt vs rentang auditor (CKPN)'].map((t, i) => (
              <div key={i} className="row gap8" style={{ fontSize: 11.5, alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--blue)', flex: '0 0 auto', marginTop: 1 }}><I.mail size={14} /></span>
                <span style={{ lineHeight: 1.4 }}>{t}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

Object.assign(window, { SA540View });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { SA540View };
