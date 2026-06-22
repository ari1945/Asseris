/* [codemod] ESM imports */
import React from 'react';
import { useNav } from './contexts';
import { I } from './icons';
import { SubBar } from './shell';
import { Badge, Btn, Panel } from './ui';

/* ============================================================
   Asseris — Penentu Kerangka Pelaporan Berjenjang
   (SAK / SAK EP / SAK EMKM)
   ------------------------------------------------------------
   Alat keputusan di gerbang akseptasi/onboarding yang menetapkan
   kerangka pelaporan keuangan yang berlaku bagi suatu entitas —
   menjawab gap G4 (Evaluasi Kepatuhan SAK). Pohon keputusan:

     1. Akuntabilitas publik?  (emiten / fidusia lembaga keuangan)
            └─ YA → SAK (PSAK berbasis IFRS)
     2. Memenuhi kriteria UMKM (UU 20/2008 jo. PP 7/2021)?
            └─ TIDAK (entitas besar) → SAK EP
     3. Kebutuhan pengguna / kompleksitas transaksi?
            ├─ kompleks / pengguna canggih / pilih naik → SAK EP
            └─ sederhana → SAK EMKM

   Keluaran mengikat ke: jenis perikatan, bentuk opini (SA 700/800),
   kedalaman daftar-uji pengungkapan, FS Generator. Satu fungsi
   penentu (fwDetermine) dipakai untuk kandidat & seluruh portofolio
   (SSOT) — sehingga klasifikasi konsisten lintas modul.
   ============================================================ */
const { useState: useStateFW, useMemo: useMemoFW, useEffect: useEffectFW } = React;

const FW_SALES_CEIL = 50e9;   /* batas atas penjualan tahunan UMKM (Rp 50 miliar) */
const FW_CAP_CEIL = 10e9;     /* batas atas modal usaha UMKM, di luar tanah & bangunan (Rp 10 miliar) */

/* metadata kerangka */
const FW_META = {
  'SAK':      { label: 'SAK', full: 'SAK — Standar Akuntansi Keuangan (PSAK berbasis IFRS)', short: 'PSAK penuh', accent: '#005085', tint: 'rgba(0,80,133,.10)', opinion: 'SA 700 — kerangka bertujuan umum penyajian wajar', who: 'Entitas dengan akuntabilitas publik' },
  'SAK EP':   { label: 'SAK EP', full: 'SAK Entitas Privat (efektif 1 Jan 2025, pengganti SAK ETAP)', short: 'Entitas Privat', accent: '#0a6b73', tint: 'var(--teal-bg)', opinion: 'SA 700 — kerangka bertujuan umum penyajian wajar', who: 'Entitas tanpa akuntabilitas publik' },
  'SAK EMKM': { label: 'SAK EMKM', full: 'SAK Entitas Mikro, Kecil, dan Menengah', short: 'Mikro–Menengah', accent: '#5b3fa6', tint: 'var(--purple-bg)', opinion: 'SA 700/800 — basis akuntansi sesuai SAK EMKM', who: 'UMKM tanpa akuntabilitas publik' },
};
const FW_ORDER = ['SAK', 'SAK EP', 'SAK EMKM'];

/* ---- format Rupiah dalam miliar/triliun ---- */
function fwRp(v: any) {
  if (v >= 1e12) return 'Rp ' + (v / 1e12).toLocaleString('id-ID', { maximumFractionDigits: 2 }) + ' T';
  if (v >= 1e9) return 'Rp ' + (v / 1e9).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + ' M';
  return 'Rp ' + (v / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 0 }) + ' jt';
}

/* ---- tingkat UMKM dari modal usaha (PP 7/2021) ---- */
function fwUmkmTier(cap: any, sales: any) {
  if (cap > FW_CAP_CEIL || sales > FW_SALES_CEIL) return 'Besar';
  if (cap > 5e9 || sales > 15e9) return 'Menengah';
  if (cap > 1e9 || sales > 2e9) return 'Kecil';
  return 'Mikro';
}

/* ============================================================
   MESIN PENENTU — satu sumber kebenaran (dipakai kandidat & portofolio)
   ============================================================ */
function fwDetermine(e: any) {
  if (e.listed) return { fw: 'SAK', gate: 1, branch: 'pa', why: 'Tercatat / dalam proses pendaftaran di pasar modal — memiliki akuntabilitas publik (emiten/perusahaan publik).' };
  if (e.fiduciary) return { fw: 'SAK', gate: 1, branch: 'pa', why: 'Menguasai aset dalam kapasitas fidusia bagi sekelompok besar masyarakat sebagai salah satu usaha utamanya (lembaga jasa keuangan).' };
  const byCap = e.capital <= FW_CAP_CEIL;
  const bySales = e.sales <= FW_SALES_CEIL;
  const umkm = byCap && bySales;
  if (!umkm) return { fw: 'SAK EP', gate: 2, branch: 'big', why: 'Tanpa akuntabilitas publik, namun melampaui ambang UMKM (entitas besar) → wajib SAK EP.' };
  if (e.complex || e.elect) return { fw: 'SAK EP', gate: 3, branch: 'ep', why: e.elect && !e.complex ? 'Memenuhi kriteria UMKM, tetapi entitas memilih naik ke SAK EP secara sukarela.' : 'Memenuhi kriteria UMKM, namun kompleksitas transaksi / kebutuhan pengguna LK menuntut kerangka SAK EP.' };
  return { fw: 'SAK EMKM', gate: 3, branch: 'emkm', why: 'Tanpa akuntabilitas publik, memenuhi kriteria UMKM, dan kebutuhan pelaporan sederhana → SAK EMKM.' };
}

/* ============================================================
   PORTOFOLIO — atribut entitas (disintesis dari CLIENTS + kompilasi UMKM).
   Framework dihitung lewat fwDetermine → membuktikan SSOT lintas-portofolio.
   ============================================================ */
const FW_PORTFOLIO = [
  { id: 'C-014', name: 'PT Sentosa Makmur Tbk', sector: 'Manufaktur · Consumer Goods', listed: true, fiduciary: false, sales: 1.21e12, capital: 4.1e11, complex: true, elect: false, eng: 'Audit LK · FY2025' },
  { id: 'C-031', name: 'PT Bumi Hijau Agrindo Tbk', sector: 'Agribisnis · Perkebunan', listed: true, fiduciary: false, sales: 7.4e11, capital: 2.6e11, complex: true, elect: false, eng: 'Audit LK · FY2025' },
  { id: 'C-040', name: 'PT Mandiri Sejahtera Finance', sector: 'Jasa Keuangan · Multifinance', listed: true, fiduciary: true, sales: 9.8e11, capital: 5.2e11, complex: true, elect: false, eng: 'Audit LK · FY2025' },
  { id: 'C-063', name: 'PT Graha Properti Investama Tbk', sector: 'Properti & Real Estate', listed: true, fiduciary: false, sales: 8.6e11, capital: 6.1e11, complex: true, elect: false, eng: 'Audit LK · FY2025' },
  { id: 'C-022', name: 'PT Cahaya Logistik Nusantara', sector: 'Transportasi & Logistik', listed: false, fiduciary: false, sales: 9.5e10, capital: 4.0e10, complex: false, elect: false, eng: 'Reviu SPR 2400 · FY2025' },
  { id: 'C-058', name: 'PT Samudra Pangan Lestari', sector: 'Manufaktur · F&B', listed: false, fiduciary: false, sales: 6.2e10, capital: 2.2e10, complex: false, elect: false, eng: 'Audit LK · FY2025' },
  { id: 'C-052', name: 'PT Karya Beton Perkasa', sector: 'Konstruksi & Material', listed: false, fiduciary: false, sales: 3.8e10, capital: 9.0e9, complex: true, elect: false, eng: 'Audit LK (proposal) · FY2025' },
  { id: 'C-047', name: 'PT Teknologi Andalan Digital', sector: 'Teknologi · SaaS', listed: false, fiduciary: false, sales: 1.8e10, capital: 6.0e9, complex: true, elect: false, eng: 'Agreed-Upon Procedures · FY2025' },
  { id: 'CMP-071', name: 'PT Sinar Kreatif Mandiri (UMKM)', sector: 'Perdagangan · Ritel Kreatif', listed: false, fiduciary: false, sales: 4.2e9, capital: 1.5e9, complex: false, elect: false, eng: 'Kompilasi SPSJL 4410 · FY2025' },
];

/* ---- matriks pembanding tiga kerangka ---- */
const FW_COMPARE = [
  { dim: 'Dasar pengaturan', sak: 'PSAK berbasis IFRS (DSAK-IAI) — lengkap', ep: 'SAK EP — satu buku, modul mandiri', emkm: 'SAK EMKM — ringkas, basis akrual' },
  { dim: 'Pengguna yang dituju', sak: 'Investor & kreditur pasar modal, regulator', ep: 'Pengguna eksternal entitas privat (bank, pemegang saham)', emkm: 'Manajemen, kreditur mikro, fiskus' },
  { dim: 'Pengukuran nilai wajar', sak: 'Luas (PSAK 68, instrumen keuangan, properti investasi)', ep: 'Terbatas — sebagian besar model biaya', emkm: 'Tidak ada — biaya historis sepenuhnya' },
  { dim: 'Pajak tangguhan (PSAK 46)', sak: 'Wajib diakui', ep: 'Wajib (versi sederhana)', emkm: 'Tidak diakui — beban pajak = pajak terutang' },
  { dim: 'Komponen LK', sak: '5 laporan + CALK lengkap', ep: '5 laporan + CALK proporsional', emkm: '3 laporan: Posisi Keuangan, L/R, CALK' },
  { dim: 'Konsolidasi & instrumen', sak: 'PSAK 65/71/72/73 berlaku penuh', ep: 'Diatur, lebih sederhana', emkm: 'Tidak diwajibkan konsolidasi' },
  { dim: 'Bentuk opini auditor', sak: 'SA 700 — penyajian wajar', ep: 'SA 700 — penyajian wajar', emkm: 'SA 700/800 — basis akuntansi tertentu' },
];

/* ---- standar perikatan terkait keluaran penentu ---- */
const FW_STD_LINKS = [
  { code: 'SA 210', title: 'Persetujuan Ketentuan Perikatan — keberterimaan kerangka pelaporan', view: null },
  { code: 'SA 700', title: 'Perumusan Opini & Pelaporan atas LK', view: 'sa705' },
  { code: 'SA 800', title: 'Pertimbangan Khusus — kerangka bertujuan khusus', view: 'sa800' },
];

/* ============================================================
   sub-komponen kecil
   ============================================================ */
function FWStat({ value, label, sub, accent }: any) {
  return (
    <div className="panel" style={{ padding: '12px 14px', display: 'grid', gap: 2 }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: accent || 'var(--navy)', lineHeight: 1.05, letterSpacing: '-.01em' }}>{value}</div>
      <div className="tiny muted" style={{ fontWeight: 700 }}>{label}</div>
      {sub && <div className="tiny" style={{ color: 'var(--ink-4)' }}>{sub}</div>}
    </div>
  );
}

function FWChip({ fw, sm }: any) {
  const m = (FW_META as any)[fw];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700,
      fontSize: sm ? 11 : 12, padding: sm ? '3px 8px' : '4px 10px', borderRadius: 20,
      color: m.accent, background: m.tint, border: '1px solid ' + m.accent + '33', whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: m.accent }} />{m.label}
    </span>
  );
}

/* toggle baris ya/tidak */
function FWToggle({ label, hint, value, onChange, yes = 'Ya', no = 'Tidak' }: any) {
  return (
    <div className="row jb ac" style={{ gap: 12, padding: '9px 0', borderBottom: '1px solid var(--line-soft)' }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)' }}>{label}</div>
        {hint && <div className="tiny" style={{ color: 'var(--ink-4)', marginTop: 2, lineHeight: 1.4 }}>{hint}</div>}
      </div>
      <div className="seg" style={{ flex: '0 0 auto' }}>
        <button className={value ? 'on' : ''} onClick={() => onChange(true)}>{yes}</button>
        <button className={!value ? 'on' : ''} onClick={() => onChange(false)}>{no}</button>
      </div>
    </div>
  );
}

/* slider ukuran usaha dengan penanda ambang */
function FWSlider({ label, value, onChange, max, ceil, unit }: any) {
  const pct = Math.min(100, (value / max) * 100);
  const ceilPct = Math.min(100, (ceil / max) * 100);
  const over = value > ceil;
  return (
    <div style={{ padding: '10px 0', borderBottom: '1px solid var(--line-soft)' }}>
      <div className="row jb ac" style={{ marginBottom: 8 }}>
        <span style={{ fontSize: 12.5, fontWeight: 600 }}>{label}</span>
        <span className="mono" style={{ fontSize: 12.5, fontWeight: 700, color: over ? 'var(--amber)' : 'var(--green)' }}>{fwRp(value)}</span>
      </div>
      <div style={{ position: 'relative' }}>
        <input type="range" className="fw-range" min={0} max={max} step={max / 200} value={value}
          onChange={(e: any) => onChange(Number(e.target.value))}
          style={{ width: '100%', accentColor: over ? 'var(--amber)' : 'var(--teal)' }} />
        <div style={{ position: 'absolute', left: ceilPct + '%', top: -2, bottom: 14, width: 2, background: 'var(--red)', opacity: .7, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', left: ceilPct + '%', top: -16, transform: 'translateX(-50%)', fontSize: 9.5, fontWeight: 700, color: 'var(--red)', whiteSpace: 'nowrap', pointerEvents: 'none' }}>batas UMKM {unit}</div>
      </div>
    </div>
  );
}

/* ============================================================
   POHON KEPUTUSAN — visual, menyala mengikuti jalur kandidat
   ============================================================ */
function FWGateNode({ n, q, active, dim, accent }: any) {
  return (
    <div style={{
      border: '1.5px solid ' + (active ? (accent || 'var(--navy)') : 'var(--line)'),
      background: active ? 'var(--surface)' : 'var(--surface-2)',
      borderRadius: 10, padding: '10px 12px', opacity: dim ? .5 : 1, transition: '.15s',
      boxShadow: active ? '0 1px 8px rgba(7,30,42,.08)' : 'none',
    }}>
      <div className="row ac gap8">
        <span className="mono" style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--blue)', background: 'var(--blue-100,#e2edf4)', padding: '2px 6px', borderRadius: 5 }}>{n}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>{q}</span>
      </div>
    </div>
  );
}

function FWBranch({ label, taken, dim, accent }: any) {
  return (
    <div className="row ac gap8" style={{ paddingLeft: 14, opacity: dim ? .4 : 1, transition: '.15s' }}>
      <span style={{ width: 18, height: 1.5, background: taken ? accent : 'var(--line-strong)' }} />
      <span style={{
        fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 12,
        color: taken ? '#fff' : 'var(--ink-3)', background: taken ? accent : 'var(--surface-2)',
        border: '1px solid ' + (taken ? accent : 'var(--line)'),
      }}>{label}</span>
    </div>
  );
}

function FWTree({ result }: any) {
  const g = result.gate, b = result.branch;
  const A = { 1: '#005085', 2: '#0a6b73', 3: '#5b3fa6' };
  return (
    <div style={{ display: 'grid', gap: 7 }}>
      {/* Gate 1 */}
      <FWGateNode n="1" q="Memiliki akuntabilitas publik?" active={g >= 1} accent={A[1]} />
      <FWBranch label={b === 'pa' ? 'YA → SAK' : 'Tidak'} taken={b === 'pa'} accent={A[1]} dim={g > 1 && b !== 'pa' ? false : false} />
      {/* Gate 2 */}
      <FWGateNode n="2" q="Memenuhi kriteria UMKM (UU 20/2008 jo. PP 7/2021)?" active={g >= 2} dim={g < 2} accent={A[2]} />
      <FWBranch label={b === 'big' ? 'TIDAK (besar) → SAK EP' : (g >= 2 ? 'Ya (UMKM)' : '—')} taken={b === 'big'} dim={g < 2} accent={A[2]} />
      {/* Gate 3 */}
      <FWGateNode n="3" q="Kompleksitas transaksi / kebutuhan pengguna LK?" active={g >= 3} dim={g < 3} accent={A[3]} />
      <div className="row" style={{ gap: 10, paddingLeft: 14 }}>
        <FWBranch label={b === 'ep' ? 'Kompleks → SAK EP' : 'Kompleks'} taken={b === 'ep'} dim={g < 3} accent={A[3]} />
        <FWBranch label={b === 'emkm' ? 'Sederhana → SAK EMKM' : 'Sederhana'} taken={b === 'emkm'} dim={g < 3} accent={A[3]} />
      </div>
    </div>
  );
}

/* ============================================================
   VIEW UTAMA
   ============================================================ */
function FrameworkView() {
  const nav = useNav();
  const loader = window.loadLS || ((k, d) => d);

  /* kandidat aktif — default prospek baru bertipe menengah */
  const DEFAULT = { id: 'NEW', name: 'PT Mitra Andalan Sejahtera', sector: 'Perdagangan Umum', listed: false, fiduciary: false, sales: 28e9, capital: 7e9, complex: false, elect: false, eng: 'Calon klien · onboarding' };
  const [cand, setCand] = useStateFW(() => loader('ams.framework.cand', DEFAULT));
  const [picked, setPicked] = useStateFW('NEW');

  useEffectFW(() => { try { localStorage.setItem('ams.framework.cand', JSON.stringify(cand)); } catch (e) {} }, [cand]);

  const set = (patch: any) => setCand((c: any) => ({ ...c, ...patch }));
  const loadEntity = (ent: any) => {
    setPicked(ent.id);
    setCand({ ...ent });
  };

  const result = useMemoFW(() => fwDetermine(cand), [cand]);
  const m = (FW_META as any)[result.fw];
  const umkmTier = fwUmkmTier(cand.capital, cand.sales);

  /* hitung sebaran portofolio (lewat fungsi penentu yang sama — SSOT) */
  const portfolio = useMemoFW(() => FW_PORTFOLIO.map(e => ({ ...e, ...fwDetermine(e), tier: fwUmkmTier(e.capital, e.sales) })), []);
  const counts = FW_ORDER.map(k => ({ k, n: portfolio.filter((p: any) => p.fw === k).length }));

  return (
    <>
      <SubBar moduleId="framework" right={
        <div className="row gap8 ac">
          <Badge kind="blue">SA 210 · Kerangka Pelaporan</Badge>
          <Btn sm onClick={() => nav('fsgen', { from: 'framework' })}><I.report size={13} /> FS Generator</Btn>
          <Btn sm onClick={() => nav('compmatrix', { from: 'framework' })}><I.table size={13} /> Matriks Kepatuhan</Btn>
          <Btn sm onClick={() => nav('opinion', { from: 'framework' })}><I.gavel size={13} /> Opini</Btn>
        </div>
      } />
      <div className="view-scroll">
        <div className="view-pad" style={{ display: 'grid', gap: 12 }}>

          {/* ---------- ringkasan ---------- */}
          <div className="grid" style={{ gridTemplateColumns: 'repeat(5,1fr)', gap: 10 }}>
            <FWStat value={m.label} label="Kerangka kandidat" sub={cand.name} accent={m.accent} />
            <FWStat value={counts[0].n} label="Portofolio · SAK" sub="akuntabilitas publik" accent={FW_META['SAK'].accent} />
            <FWStat value={counts[1].n} label="Portofolio · SAK EP" sub="entitas privat" accent={FW_META['SAK EP'].accent} />
            <FWStat value={counts[2].n} label="Portofolio · SAK EMKM" sub="mikro–menengah" accent={FW_META['SAK EMKM'].accent} />
            <FWStat value={'1 Jan 2025'} label="SAK EP efektif" sub="menggantikan SAK ETAP" accent="var(--navy)" />
          </div>

          {/* ---------- penentu interaktif + verdict ---------- */}
          <div className="grid" style={{ gridTemplateColumns: '1fr 380px', gap: 12, alignItems: 'start' }}>

            {/* KIRI — input keputusan */}
            <div style={{ display: 'grid', gap: 12 }}>
              <Panel title="Entitas yang dinilai" sub="muat dari portofolio atau sunting manual">
                <div style={{ padding: '4px 0 2px' }}>
                  <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                    <button onClick={() => loadEntity(DEFAULT)}
                      style={fwPickBtn(picked === 'NEW')}>+ Entitas baru</button>
                    {FW_PORTFOLIO.map(e => (
                      <button key={e.id} onClick={() => loadEntity(e)} style={fwPickBtn(picked === e.id)} title={e.name}>
                        {e.name.replace(/^PT /, '').replace(/ \(UMKM\)$/, '')}
                      </button>
                    ))}
                  </div>
                  <div className="row jb ac" style={{ gap: 10 }}>
                    <div style={{ minWidth: 0 }}>
                      <input value={cand.name} onChange={(e: any) => set({ name: e.target.value })}
                        style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', border: 'none', borderBottom: '1px dashed var(--line-strong)', background: 'transparent', padding: '2px 0', width: '100%', outline: 'none' }} />
                      <div className="tiny muted" style={{ marginTop: 3 }}>{cand.sector} · {cand.eng}</div>
                    </div>
                    <div style={{ flex: '0 0 auto', textAlign: 'right' }}>
                      <div className="tiny muted upper">Tingkat usaha</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: umkmTier === 'Besar' ? 'var(--ink)' : 'var(--teal)' }}>{umkmTier}</div>
                    </div>
                  </div>
                </div>
              </Panel>

              <Panel noBody>
                <div style={{ padding: '12px 14px' }}>
                  <div className="row ac gap8" style={{ marginBottom: 4 }}>
                    <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: '#005085', width: 18, height: 18, borderRadius: 5, display: 'grid', placeItems: 'center' }}>1</span>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>Uji akuntabilitas publik</span>
                  </div>
                  <p className="tiny muted" style={{ margin: '0 0 6px', lineHeight: 1.5 }}>Bila salah satu terpenuhi, entitas <b>wajib</b> menggunakan SAK (PSAK berbasis IFRS).</p>
                  <FWToggle label="Terdaftar / dalam proses pendaftaran di pasar modal"
                    hint="Emiten / perusahaan publik — menerbitkan instrumen di pasar publik."
                    value={cand.listed} onChange={(v: any) => set({ listed: v })} />
                  <FWToggle label="Menguasai aset dalam kapasitas fidusia (usaha utama)"
                    hint="Bank, asuransi, dana pensiun, sekuritas, multifinance, reksa dana."
                    value={cand.fiduciary} onChange={(v: any) => set({ fiduciary: v })} />
                </div>
              </Panel>

              <Panel noBody>
                <div style={{ padding: '12px 14px', opacity: result.gate >= 2 ? 1 : .55, pointerEvents: result.gate >= 2 ? 'auto' : 'none' }}>
                  <div className="row ac gap8" style={{ marginBottom: 4 }}>
                    <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: '#0a6b73', width: 18, height: 18, borderRadius: 5, display: 'grid', placeItems: 'center' }}>2</span>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>Uji ambang UMKM</span>
                    <span className="tiny muted">UU 20/2008 jo. PP 7/2021 · di luar tanah & bangunan</span>
                  </div>
                  <p className="tiny muted" style={{ margin: '0 0 6px', lineHeight: 1.5 }}>Melebihi salah satu ambang → entitas <b>besar</b> → SAK EP. Di bawah keduanya → lanjut ke uji kompleksitas.</p>
                  <FWSlider label="Penjualan tahunan" value={cand.sales} onChange={(v: any) => set({ sales: v })} max={120e9} ceil={FW_SALES_CEIL} unit="50 M" />
                  <FWSlider label="Modal usaha (ekuitas usaha)" value={cand.capital} onChange={(v: any) => set({ capital: v })} max={20e9} ceil={FW_CAP_CEIL} unit="10 M" />
                </div>
              </Panel>

              <Panel noBody>
                <div style={{ padding: '12px 14px', opacity: result.gate >= 3 ? 1 : .55, pointerEvents: result.gate >= 3 ? 'auto' : 'none' }}>
                  <div className="row ac gap8" style={{ marginBottom: 4 }}>
                    <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: '#5b3fa6', width: 18, height: 18, borderRadius: 5, display: 'grid', placeItems: 'center' }}>3</span>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>Pertimbangan pengguna & kompleksitas</span>
                  </div>
                  <p className="tiny muted" style={{ margin: '0 0 6px', lineHeight: 1.5 }}>Entitas UMKM <b>boleh memilih</b> kerangka yang lebih tinggi. Bila ada kompleksitas atau pengguna canggih → SAK EP; jika tidak → SAK EMKM.</p>
                  <FWToggle label="Transaksi kompleks / pengguna LK canggih"
                    hint="Instrumen keuangan, sewa material, konsolidasi, kreditur bank besar, rencana go-public."
                    value={cand.complex} onChange={(v: any) => set({ complex: v })} />
                  <FWToggle label="Entitas memilih naik ke SAK EP (sukarela)"
                    hint="Pilihan strategis demi komparabilitas / akses pendanaan."
                    value={cand.elect} onChange={(v: any) => set({ elect: v })} />
                </div>
              </Panel>
            </div>

            {/* KANAN — verdict + pohon + implikasi */}
            <div style={{ display: 'grid', gap: 12 }}>
              <div className="panel" style={{ padding: 0, overflow: 'hidden', borderTop: '3px solid ' + m.accent }}>
                <div style={{ padding: '16px 16px 14px', background: m.tint }}>
                  <div className="tiny upper" style={{ color: m.accent, fontWeight: 700, letterSpacing: '.08em' }}>Kerangka pelaporan ditetapkan</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: m.accent, letterSpacing: '-.02em', margin: '4px 0 2px' }}>{m.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-2)', fontWeight: 600 }}>{m.full}</div>
                </div>
                <div style={{ padding: '12px 16px' }}>
                  <div className="row ac gap8" style={{ marginBottom: 8 }}>
                    <span style={{ color: m.accent }}><I.checkCircle size={15} /></span>
                    <span className="tiny" style={{ fontWeight: 700, color: 'var(--ink)' }}>Dasar penetapan (Gerbang {result.gate})</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.55 }}>{result.why}</p>
                </div>
              </div>

              <Panel title="Pohon keputusan">
                <FWTree result={result} />
              </Panel>

              <Panel title="Implikasi mengikat" sub="keluaran → modul hilir">
                <div style={{ display: 'grid', gap: 9 }}>
                  {[
                    { ic: 'doc', k: 'Jenis perikatan', v: cand.listed ? 'Audit LK (PIE) — rotasi AP 5 th' : (result.fw === 'SAK EMKM' ? 'Audit / Kompilasi (SPSJL 4410)' : 'Audit / Reviu LK') },
                    { ic: 'gavel', k: 'Bentuk opini (SA 700/800)', v: m.opinion },
                    { ic: 'checkCircle', k: 'Kedalaman daftar-uji pengungkapan', v: result.fw === 'SAK' ? 'Penuh (CALK lengkap)' : result.fw === 'SAK EP' ? 'Proporsional' : 'Minimal (3 laporan)' },
                    { ic: 'report', k: 'Profil FS Generator', v: m.short },
                  ].map((r, i) => (
                    <div key={i} className="row gap8" style={{ alignItems: 'flex-start' }}>
                      {(() => { const IcC = (I as any)[r.ic] || I.doc; return <span style={{ color: m.accent, flex: '0 0 auto', marginTop: 1 }}><IcC size={14} /></span>; })()}
                      <div style={{ minWidth: 0 }}>
                        <div className="tiny muted" style={{ fontWeight: 600 }}>{r.k}</div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>{r.v}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--line-soft)' }}>
                  <div className="tiny muted upper" style={{ marginBottom: 6 }}>Standar perikatan terkait</div>
                  <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                    {FW_STD_LINKS.map((s, i) => (
                      <button key={i} onClick={() => { if (s.view) nav(s.view, { from: 'framework' }); else if (window.__amsOpenSA) window.__amsOpenSA({ code: s.code, title: s.title }); }}
                        style={{ fontSize: 11, fontWeight: 600, padding: '4px 9px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--surface-2)', color: 'var(--blue)', cursor: 'pointer' }}
                        title={s.title}>{s.code}</button>
                    ))}
                  </div>
                </div>
              </Panel>
            </div>
          </div>

          {/* ---------- matriks pembanding ---------- */}
          <Panel title="Pembanding tiga kerangka" sub="ringkasan perbedaan pengakuan, pengukuran & penyajian" noBody>
            <div style={{ overflowX: 'auto' }}>
              <table className="fw-tbl">
                <thead>
                  <tr>
                    <th style={{ minWidth: 170 }}>Dimensi</th>
                    {FW_ORDER.map(k => (
                      <th key={k} style={{ color: (FW_META as any)[k].accent }}>{(FW_META as any)[k].label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {FW_COMPARE.map((r, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 700, color: 'var(--ink)' }}>{r.dim}</td>
                      <td>{r.sak}</td>
                      <td>{r.ep}</td>
                      <td>{r.emkm}</td>
                    </tr>
                  ))}
                  <tr>
                    <td style={{ fontWeight: 700, color: 'var(--ink)' }}>Kriteria pemicu</td>
                    <td>Akuntabilitas publik (emiten / fidusia)</td>
                    <td>Tanpa akuntabilitas publik · entitas besar atau UMKM yang memilih naik</td>
                    <td>UMKM (modal ≤ Rp 10 M / penjualan ≤ Rp 50 M) · pelaporan sederhana</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Panel>

          {/* ---------- penerapan portofolio ---------- */}
          <Panel title="Penerapan ke portofolio firma" sub="klasifikasi dihitung satu fungsi penentu (SSOT) — konsisten ke FS Generator, Opini & Matriks Kepatuhan" noBody>
            <div style={{ overflowX: 'auto' }}>
              <table className="fw-tbl">
                <thead>
                  <tr>
                    <th style={{ minWidth: 200 }}>Entitas</th>
                    <th>Sektor</th>
                    <th style={{ textAlign: 'center' }}>Akunt. publik</th>
                    <th style={{ textAlign: 'right' }}>Penjualan th.</th>
                    <th style={{ textAlign: 'right' }}>Modal usaha</th>
                    <th style={{ textAlign: 'center' }}>Tingkat</th>
                    <th>Kerangka</th>
                    <th>Dasar</th>
                  </tr>
                </thead>
                <tbody>
                  {portfolio.map((p: any) => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 700, color: 'var(--ink)' }}>{p.name}<div className="tiny muted" style={{ fontWeight: 500 }}>{p.eng}</div></td>
                      <td>{p.sector}</td>
                      <td style={{ textAlign: 'center' }}>
                        {p.listed || p.fiduciary
                          ? <span style={{ color: 'var(--blue)', fontWeight: 700, fontSize: 11 }}>{p.listed && p.fiduciary ? 'Emiten + LJK' : p.listed ? 'Emiten' : 'LJK fidusia'}</span>
                          : <span className="tiny muted">—</span>}
                      </td>
                      <td className="mono" style={{ textAlign: 'right', fontSize: 11.5 }}>{fwRp(p.sales)}</td>
                      <td className="mono" style={{ textAlign: 'right', fontSize: 11.5 }}>{fwRp(p.capital)}</td>
                      <td style={{ textAlign: 'center' }}><span className="tiny" style={{ fontWeight: 600, color: p.tier === 'Besar' ? 'var(--ink-2)' : 'var(--teal)' }}>{p.tier}</span></td>
                      <td><FWChip fw={p.fw} sm /></td>
                      <td className="tiny" style={{ color: 'var(--ink-3)', maxWidth: 230, lineHeight: 1.4 }}>{p.branch === 'pa' ? 'Akuntabilitas publik' : p.branch === 'big' ? 'Entitas besar (> ambang UMKM)' : p.branch === 'ep' ? 'UMKM → naik ke EP (kompleksitas)' : 'UMKM · pelaporan sederhana'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ padding: '10px 14px', borderTop: '1px solid var(--line-soft)', background: 'var(--surface-2)' }}>
              <div className="row gap8" style={{ alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--amber)', flex: '0 0 auto', marginTop: 1 }}><I.alert size={14} /></span>
                <p className="tiny" style={{ margin: 0, color: 'var(--ink-2)', lineHeight: 1.5 }}>
                  <b>Catatan:</b> entitas SAK EMKM umumnya masuk perikatan <b>kompilasi (SPSJL 4410)</b>, bukan audit penuh — lihat PT Sinar Kreatif Mandiri. Salah pilih kerangka berdampak langsung pada jenis perikatan dan bentuk opini (SA 700/800), sehingga penetapan ini menjadi gerbang pada onboarding.
                </p>
              </div>
            </div>
          </Panel>

        </div>
      </div>

      <style>{`
        .fw-range{ height: 4px; border-radius: 3px; }
        .fw-tbl{ width:100%; border-collapse:collapse; font-size:12px; }
        .fw-tbl th{ text-align:left; background:var(--surface-2); color:var(--ink-3); font-size:10px; text-transform:uppercase; letter-spacing:.05em; padding:8px 11px; font-weight:700; border-bottom:1px solid var(--line); white-space:nowrap; }
        .fw-tbl td{ padding:9px 11px; border-bottom:1px solid var(--line-soft); vertical-align:top; color:var(--ink-2); }
        .fw-tbl tbody tr:last-child td{ border-bottom:none; }
        .fw-tbl tbody tr:hover td{ background:var(--surface-2); }
      `}</style>
    </>
  );
}

function fwPickBtn(on: any) {
  return {
    fontSize: 11, fontWeight: 600, padding: '5px 9px', borderRadius: 7, cursor: 'pointer',
    border: '1px solid ' + (on ? 'var(--blue)' : 'var(--line)'),
    background: on ? 'var(--blue-100,#e2edf4)' : 'var(--surface-2)',
    color: on ? 'var(--blue)' : 'var(--ink-2)', whiteSpace: 'nowrap',
  };
}

/* ---- LINEAGE dock dua-arah (didaftarkan setelah related_modules.jsx) ---- */
if (window.LINEAGE) {
  window.LINEAGE.framework = {
    std: 'SAK · Penentu Kerangka Pelaporan Berjenjang (SA 210)',
    up: [
      { id: 'onboarding', ic: 'briefcase', lbl: 'Client Onboarding', rel: 'Profil entitas (akuntabilitas publik, ukuran) → input penentu' },
      { id: 'compmatrix', ic: 'table', lbl: 'Matriks Kepatuhan', rel: 'Registri kerangka pelaporan → cakupan standar' },
      { id: 'kb', ic: 'book', lbl: 'Knowledge Base', rel: 'Definisi akuntabilitas publik & kriteria UMKM' },
    ],
    down: [
      { id: 'sakep', ic: 'book', lbl: 'SAK EP · Entitas Privat', rel: 'Penetapan EP → daftar-uji penerapan & transisi' },
      { id: 'fsgen', ic: 'report', lbl: 'Financial Statement Gen.', rel: 'Kerangka terpilih → struktur & pengungkapan LK' },
      { id: 'opinion', ic: 'gavel', lbl: 'Audit Opinion Generator', rel: 'Kerangka berlaku → acuan & bentuk opini (SA 700/800)' },
    ],
  };
}

Object.assign(window, { FrameworkView, fwDetermine, FW_PORTFOLIO });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { FW_PORTFOLIO, FrameworkView, fwDetermine };
