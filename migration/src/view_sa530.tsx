/* [codemod] ESM imports */
import React from 'react';
import { useFirm } from './contexts.jsx';
import { I } from './icons.jsx';
import { SACanonChips, SACanonicalStatus } from './sa_canonical.jsx';
import { SubBar } from './shell.jsx';
import { Badge, Btn, Panel, Progress, Seg, Stat, Tabs } from './ui.jsx';
import { KvBox } from './view_analytical';

/* ============================================================
   NeoSuite AMS — SA 530 · Sampling Audit
   Deep workpaper: desain & populasi, kalkulator ukuran sampel
   (MUS interaktif), metode seleksi, serta evaluasi hasil &
   proyeksi salah saji ke populasi.
   ============================================================ */
const { useState: useState530, useMemo: useMemo530 } = React;

/* Faktor keandalan (Poisson, 0 salah saji) & faktor ekspansi */
const CONF_FACTORS = {
  90: { rf: 2.31, ef: 1.5, risk: 10 },
  95: { rf: 3.00, ef: 1.6, risk: 5 },
  99: { rf: 4.61, ef: 1.9, risk: 1 },
};

/* Salah saji ditemukan dalam sampel (Rp jt) */
const SAMPLE_FINDINGS = [
  { id: 'S-018', bv: 1240, av: 1180, type: 'Lebih saji nilai faktur' },
  { id: 'S-047', bv: 880, av: 812, type: 'Pisah-batas — barang belum dikirim' },
  { id: 'S-103', bv: 1560, av: 1560, type: 'Tidak ada salah saji' },
  { id: 'S-129', bv: 430, av: 388, type: 'Diskon belum dibukukan' },
];

/* ============================================================ */
function SA530View() {
  const firm = useFirm();
  const client = firm?.activeClient?.name || 'PT Sentosa Makmur Tbk';
  const [tab, setTab] = useState530('kalkulator');

  /* state kalkulator (lifted agar terlihat di evaluasi) */
  const [bv, setBv] = useState530(245000);   // nilai populasi (jt)
  const [conf, setConf] = useState530(95);
  const [tm, setTm] = useState530(7000);      // salah saji yang dapat ditoleransi
  const [em, setEm] = useState530(1200);      // ekspektasi salah saji

  const calc = useMemo530(() => {
    const f = CONF_FACTORS[conf];
    const basic = tm - em * f.ef;
    const n = basic > 0 ? Math.ceil((bv * f.rf) / basic) : 9999;
    const interval = Math.round(bv / n);
    return { ...f, basic, n, interval };
  }, [bv, conf, tm, em]);

  const tabs = [
    { id: 'desain', label: 'Desain & Populasi' },
    { id: 'kalkulator', label: 'Ukuran Sampel' },
    { id: 'seleksi', label: 'Metode Seleksi' },
    { id: 'evaluasi', label: 'Evaluasi Hasil' },
  ];

  return (
    <>
      <SubBar moduleId="sa530" right={
        <div className="row gap8 ac">
          <SACanonChips stdId="sa530" />
          <Btn sm><I.download size={13} /> Kertas Kerja Sampling</Btn>
          <Btn sm variant="primary"><I.sparkle size={14} /> AI Assist</Btn>
        </div>
      } />
      <div className="view-scroll"><div className="view-pad">

        <Panel noBody style={{ marginBottom: 12 }}>
          <div style={{ padding: '13px 16px', display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ minWidth: 210 }}>
              <div className="tiny muted upper" style={{ marginBottom: 3 }}>Standar Audit 530</div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>Sampling Audit</div>
              <div className="tiny muted">{client} · Piutang Usaha · ENG-2025-014</div>
            </div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Populasi (Rp jt)</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5 }}>{bv.toLocaleString('id-ID')} · 4.182 item</div></div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Ukuran Sampel</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--blue)' }}>{calc.n} item</div></div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Keyakinan</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5 }}>{conf}% · risiko {calc.risk}%</div></div>
            <div style={{ flex: 1 }} />
            <div style={{ textAlign: 'right' }}>
              <div className="tiny muted upper" style={{ marginBottom: 3 }}>Metode</div>
              <Badge kind="purple" dot>MUS (PPS)</Badge>
            </div>
          </div>
        </Panel>

        <SACanonicalStatus stdId="sa530" />

        <div style={{ marginBottom: 12 }}><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>

        {tab === 'desain' && <F530Design />}
        {tab === 'kalkulator' && <F530Calc bv={bv} setBv={setBv} conf={conf} setConf={setConf} tm={tm} setTm={setTm} em={em} setEm={setEm} calc={calc} />}
        {tab === 'seleksi' && <F530Selection interval={calc.interval} n={calc.n} />}
        {tab === 'evaluasi' && <F530Evaluation interval={calc.interval} tm={tm} />}

      </div></div>
    </>
  );
}

/* ---------------- Tab: Desain & Populasi ---------------- */
function F530Design() {
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 340px', gap: 12, alignItems: 'start' }}>
      <div className="grid" style={{ gap: 12 }}>
        <Panel noBody>
          <div className="panel-h"><h3>Desain Sampel (¶6–7)</h3><div style={{ flex: 1 }} /><Badge kind="blue">Keberadaan & Keakuratan</Badge></div>
          <div style={{ padding: '6px 14px 14px' }}>
            {[
              { ic: 'target', t: 'Tujuan prosedur audit', d: 'Memperoleh bukti atas keberadaan & keakuratan saldo piutang usaha melalui konfirmasi/vouching.' },
              { ic: 'table', t: 'Karakteristik populasi', d: 'Saldo piutang 4.182 pelanggan; nilai Rp 245 M; sebaran condong — beberapa saldo besar dominan.' },
              { ic: 'layers', t: 'Stratifikasi', d: 'Saldo individual > materialitas kinerja diuji 100% (top stratum); sisanya jadi populasi sampling MUS.' },
              { ic: 'alert', t: 'Definisi penyimpangan (deviasi)', d: 'Selisih nilai tercatat vs nilai teraudit per item; pos nol/negatif & kredit ditangani terpisah.' },
            ].map((s, i) => {
              const Ic = I[s.ic];
              return (
                <div key={i} className="row gap10" style={{ padding: '11px 0', alignItems: 'flex-start', borderBottom: i < 3 ? '1px solid var(--line-soft)' : 0 }}>
                  <span style={{ flex: '0 0 30px', width: 30, height: 30, borderRadius: 8, display: 'grid', placeItems: 'center', background: 'var(--blue-050)', color: 'var(--blue)' }}><Ic size={16} /></span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700 }}>{s.t}</div>
                    <div className="tiny muted" style={{ lineHeight: 1.45, marginTop: 3 }}>{s.d}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel noBody>
          <div className="panel-h"><h3>Stratifikasi Populasi</h3><div style={{ flex: 1 }} /><span className="tiny muted">Top stratum diuji penuh</span></div>
          <table className="dtbl">
            <thead><tr><th>Stratum</th><th className="num">Item</th><th className="num">Nilai (jt)</th><th style={{ width: 130 }}>Pendekatan</th></tr></thead>
            <tbody>
              <tr><td style={{ fontWeight: 600 }}>Saldo &gt; MK (individual signifikan)</td><td className="num mono">37</td><td className="num mono">96.400</td><td><Badge kind="purple">Uji 100%</Badge></td></tr>
              <tr><td style={{ fontWeight: 600 }}>Saldo dalam populasi sampling</td><td className="num mono">4.118</td><td className="num mono">245.000</td><td><Badge kind="blue">MUS</Badge></td></tr>
              <tr><td style={{ fontWeight: 600 }}>Saldo nol / kredit (anomali)</td><td className="num mono">27</td><td className="num mono">(2.300)</td><td><Badge kind="amber">Telaah khusus</Badge></td></tr>
            </tbody>
          </table>
        </Panel>
      </div>

      <div className="grid" style={{ gap: 12 }}>
        <Panel title="Risiko Sampling vs Non-Sampling">
          <div style={{ display: 'grid', gap: 10 }}>
            <div>
              <div className="row ac gap6" style={{ fontWeight: 700, fontSize: 12, marginBottom: 3 }}><span style={{ color: 'var(--blue)' }}><I.dice size={14} /></span>Risiko Sampling</div>
              <p className="tiny muted" style={{ margin: 0, lineHeight: 1.5 }}>Kesimpulan dari sampel berbeda dari kesimpulan bila seluruh populasi diuji. Dikendalikan lewat ukuran sampel & metode (¶A3).</p>
            </div>
            <div className="divider" />
            <div>
              <div className="row ac gap6" style={{ fontWeight: 700, fontSize: 12, marginBottom: 3 }}><span style={{ color: 'var(--amber)' }}><I.alert size={14} /></span>Risiko Non-Sampling</div>
              <p className="tiny muted" style={{ margin: 0, lineHeight: 1.5 }}>Kesalahan karena faktor manusia — prosedur tak tepat, salah interpretasi bukti. Dikendalikan lewat supervisi & review.</p>
            </div>
          </div>
        </Panel>
        <Panel title="Faktor Penentu Ukuran Sampel (¶ Lamp. 2–3)">
          <div style={{ display: 'grid', gap: 7 }}>
            {[['Risiko salah saji material ↑', 'Sampel ↑'], ['Salah saji yang ditoleransi ↑', 'Sampel ↓'], ['Ekspektasi salah saji ↑', 'Sampel ↑'], ['Stratifikasi efektif', 'Sampel ↓'], ['Jumlah unit populasi', 'Hampir tak berpengaruh']].map((r, i) => (
              <div key={i} className="row jb ac" style={{ fontSize: 11.5, padding: '6px 9px', border: '1px solid var(--line-soft)', borderRadius: 6 }}>
                <span>{r[0]}</span><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{r[1]}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ---------------- Tab: Kalkulator Ukuran Sampel ---------------- */
function F530Calc({ bv, setBv, conf, setConf, tm, setTm, em, setEm, calc }) {
  const Field = ({ label, hint, children }) => (
    <div style={{ marginBottom: 16 }}>
      <div className="row jb ac" style={{ marginBottom: 6 }}><span style={{ fontSize: 12, fontWeight: 600 }}>{label}</span><span className="tiny muted">{hint}</span></div>
      {children}
    </div>
  );
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 380px', gap: 12, alignItems: 'start' }}>
      <Panel noBody>
        <div className="panel-h"><h3>Kalkulator Ukuran Sampel — Monetary Unit Sampling</h3><div style={{ flex: 1 }} /><Badge kind="purple">PPS</Badge></div>
        <div style={{ padding: 18 }}>
          <Field label="Nilai populasi yang disampel (Rp jt)" hint={bv.toLocaleString('id-ID')}>
            <input type="range" min="50000" max="400000" step="5000" value={bv} onChange={e => setBv(parseInt(e.target.value))} style={{ width: '100%', accentColor: 'var(--blue)' }} />
          </Field>
          <Field label="Tingkat keyakinan" hint={`risiko penerimaan keliru ${calc.risk}%`}>
            <Seg options={[{ value: 90, label: '90%' }, { value: 95, label: '95%' }, { value: 99, label: '99%' }]} value={conf} onChange={setConf} />
          </Field>
          <Field label="Salah saji yang dapat ditoleransi — TM (Rp jt)" hint={tm.toLocaleString('id-ID')}>
            <input type="range" min="3000" max="14000" step="250" value={tm} onChange={e => setTm(parseInt(e.target.value))} style={{ width: '100%', accentColor: 'var(--blue)' }} />
          </Field>
          <Field label="Ekspektasi salah saji — EM (Rp jt)" hint={em.toLocaleString('id-ID')}>
            <input type="range" min="0" max="4000" step="100" value={em} onChange={e => setEm(parseInt(e.target.value))} style={{ width: '100%', accentColor: 'var(--blue)' }} />
          </Field>

          <div className="panel" style={{ padding: '11px 13px', background: 'var(--surface-2)', borderColor: 'transparent', marginTop: 4 }}>
            <div className="tiny muted upper" style={{ marginBottom: 6 }}>Rumus MUS</div>
            <div className="mono" style={{ fontSize: 12.5, lineHeight: 1.7 }}>
              n = (NilaiPopulasi × RF) ÷ (TM − EM × EF)<br />
              n = ({bv.toLocaleString('id-ID')} × {calc.rf}) ÷ ({tm.toLocaleString('id-ID')} − {em.toLocaleString('id-ID')} × {calc.ef})<br />
              <span style={{ color: calc.basic > 0 ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>n = {calc.basic > 0 ? calc.n + ' item' : 'tak terdefinisi — TM terlalu kecil'}</span>
            </div>
          </div>
        </div>
      </Panel>

      <div className="grid" style={{ gap: 12 }}>
        <Panel noBody>
          <div style={{ background: 'linear-gradient(125deg,#013a52,#005085)', color: '#fff', padding: '18px 18px 16px', textAlign: 'center' }}>
            <div className="tiny upper" style={{ color: '#bcd6e4', letterSpacing: '.05em' }}>Ukuran Sampel Direkomendasikan</div>
            <div className="mono" style={{ fontSize: 46, fontWeight: 800, lineHeight: 1.1, margin: '6px 0 2px' }}>{calc.basic > 0 ? calc.n : '—'}</div>
            <div className="tiny" style={{ color: '#bcd6e4' }}>unit moneter terpilih</div>
          </div>
          <div style={{ padding: 14, display: 'grid', gap: 10 }}>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <KvBox label="Interval Sampling (jt)" v={calc.basic > 0 ? calc.interval.toLocaleString('id-ID') : '—'} accent="var(--purple)" />
              <KvBox label="Faktor Keandalan" v={calc.rf} />
              <KvBox label="Faktor Ekspansi" v={calc.ef} />
              <KvBox label="Presisi Dasar (jt)" v={calc.basic > 0 ? Math.round(calc.basic).toLocaleString('id-ID') : '—'} />
            </div>
          </div>
        </Panel>
        <Panel title="Catatan Pertimbangan">
          <div className="panel" style={{ padding: '10px 12px', background: 'var(--blue-050)', borderColor: 'var(--blue-100)' }}>
            <div className="row gap8" style={{ alignItems: 'flex-start' }}>
              <span style={{ color: 'var(--blue)', flex: '0 0 auto' }}><I.book size={15} /></span>
              <span style={{ fontSize: 11.5, lineHeight: 1.45 }}>Ukuran populasi (jumlah item) <b>tidak</b> berpengaruh signifikan pada ukuran sampel untuk populasi besar (¶A11). Penentu utama: keyakinan yang diinginkan, TM, dan ekspektasi salah saji.</span>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ---------------- Tab: Metode Seleksi ---------------- */
function F530Selection({ interval, n }) {
  const methods = [
    { k: 'MUS / PPS', sel: true, d: 'Seleksi proporsional terhadap nilai (probability-proportional-to-size). Item bernilai lebih besar berpeluang lebih besar terpilih.', use: 'Dipakai — efektif untuk uji lebih saji & populasi condong.', tag: 'Dipilih' },
    { k: 'Acak (random)', sel: false, d: 'Setiap unit pengambilan punya peluang sama terpilih. Memerlukan penomoran populasi.', use: 'Alternatif bila fokus pada deviasi atribut, bukan nilai.', tag: 'Tersedia' },
    { k: 'Sistematis', sel: false, d: 'Titik awal acak lalu interval tetap. Hati-hati pola periodik dalam populasi.', use: 'Cocok bila tidak ada pola sistematik berkorelasi.', tag: 'Tersedia' },
    { k: 'Haphazard', sel: false, d: 'Tanpa teknik terstruktur namun tanpa bias sadar. Tidak untuk sampling statistik.', use: 'Hanya untuk pendekatan non-statistik.', tag: 'Tidak dipakai' },
  ];
  return (
    <div className="grid" style={{ gap: 12 }}>
      <Panel noBody>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', gap: 0 }}>
          {[
            { v: n, l: 'Unit Terpilih', a: 'var(--blue)' },
            { v: interval.toLocaleString('id-ID'), l: 'Interval (Rp jt)', a: 'var(--purple)' },
            { v: '1 titik', l: 'Mulai Acak', a: 'var(--ink)' },
          ].map((s, i) => (
            <div key={i} style={{ padding: '12px 16px', borderRight: i < 2 ? '1px solid var(--line-soft)' : 0 }}><Stat value={s.v} label={s.l} accent={s.a} /></div>
          ))}
        </div>
      </Panel>

      <Panel noBody>
        <div className="panel-h"><h3>Metode Seleksi Sampel (¶ Lamp. 4)</h3><div style={{ flex: 1 }} /><span className="tiny muted">4 metode dipertimbangkan</span></div>
        <div style={{ padding: '6px 14px 14px' }}>
          {methods.map((m, i) => (
            <div key={i} className="row gap12" style={{ padding: '12px 0', alignItems: 'flex-start', borderBottom: i < methods.length - 1 ? '1px solid var(--line-soft)' : 0, opacity: m.k === 'Haphazard' ? 0.6 : 1 }}>
              <span style={{ flex: '0 0 34px', width: 34, height: 34, borderRadius: 8, display: 'grid', placeItems: 'center', background: m.sel ? 'var(--purple-bg)' : 'var(--surface-2)', color: m.sel ? 'var(--purple)' : 'var(--ink-3)' }}>{m.sel ? <I.checkCircle size={17} /> : <I.dice size={16} />}</span>
              <div style={{ flex: 1 }}>
                <div className="row jb ac"><div style={{ fontSize: 12.5, fontWeight: 700 }}>{m.k}</div><Badge kind={m.sel ? 'purple' : m.tag === 'Tidak dipakai' ? 'gray' : 'blue'}>{m.tag}</Badge></div>
                <div className="tiny muted" style={{ lineHeight: 1.45, margin: '3px 0 5px' }}>{m.d}</div>
                <div className="chip tiny" style={{ background: m.sel ? 'var(--purple-bg)' : 'var(--surface-2)' }}>{m.use}</div>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

/* ---------------- Tab: Evaluasi Hasil ---------------- */
function F530Evaluation({ interval, tm }) {
  const rows = SAMPLE_FINDINGS.map(f => {
    const ms = f.bv - f.av;
    const taint = f.bv ? ms / f.bv : 0;
    const proj = Math.round(taint * interval);
    return { ...f, ms, taint, proj };
  });
  const totalProj = rows.reduce((s, r) => s + r.proj, 0);
  const exceptions = rows.filter(r => r.ms !== 0).length;
  const within = totalProj < tm;
  return (
    <div className="grid" style={{ gap: 12 }}>
      <Panel noBody>
        <div className="panel-h"><h3>Proyeksi Salah Saji ke Populasi (¶13–14)</h3><div style={{ flex: 1 }} /><Badge kind={exceptions ? 'amber' : 'green'}>{exceptions} salah saji ditemukan</Badge></div>
        <table className="dtbl">
          <thead><tr><th style={{ width: 60 }}>Ref</th><th>Sifat</th><th className="num">Tercatat</th><th className="num">Teraudit</th><th className="num">Salah Saji</th><th className="num">Tainting</th><th className="num">Proyeksi</th></tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id}>
                <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{r.id}</td>
                <td style={{ fontWeight: 600, whiteSpace: 'normal' }}>{r.type}</td>
                <td className="num mono">{r.bv.toLocaleString('id-ID')}</td>
                <td className="num mono">{r.av.toLocaleString('id-ID')}</td>
                <td className="num mono" style={{ color: r.ms ? 'var(--amber)' : 'var(--ink-4)' }}>{r.ms ? r.ms.toLocaleString('id-ID') : '—'}</td>
                <td className="num mono tiny">{(r.taint * 100).toFixed(1)}%</td>
                <td className="num mono" style={{ fontWeight: 700, color: r.proj ? 'var(--red)' : 'var(--ink-4)' }}>{r.proj ? r.proj.toLocaleString('id-ID') : '—'}</td>
              </tr>
            ))}
            <tr style={{ fontWeight: 700, background: 'var(--surface-2)' }}>
              <td colSpan="6">Proyeksi salah saji total (untuk item &lt; interval)</td>
              <td className="num mono" style={{ color: 'var(--red)' }}>{totalProj.toLocaleString('id-ID')}</td>
            </tr>
          </tbody>
        </table>
      </Panel>

      <div className="grid" style={{ gridTemplateColumns: '1fr 340px', gap: 12, alignItems: 'start' }}>
        <Panel noBody>
          <div className="panel-h"><h3>Kesimpulan Sampel (¶15)</h3><div style={{ flex: 1 }} /></div>
          <div style={{ padding: 14 }}>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <KvBox label="Proyeksi Salah Saji (jt)" v={totalProj.toLocaleString('id-ID')} accent="var(--red)" />
              <KvBox label="Dapat Ditoleransi (jt)" v={tm.toLocaleString('id-ID')} accent="var(--green)" />
            </div>
            <div style={{ marginBottom: 10 }}>
              <div className="row jb tiny" style={{ marginBottom: 4 }}><span className="muted">Proyeksi vs Toleransi</span><span className="mono" style={{ fontWeight: 700 }}>{Math.round(totalProj / tm * 100)}%</span></div>
              <Progress value={Math.round(totalProj / tm * 100)} color={within ? 'var(--green)' : 'var(--red)'} />
            </div>
            <div className="panel" style={{ padding: '10px 12px', background: within ? 'var(--green-bg)' : 'var(--red-bg)', borderColor: 'transparent' }}>
              <div className="row gap8" style={{ alignItems: 'flex-start' }}>
                <span style={{ color: within ? 'var(--green)' : 'var(--red)', flex: '0 0 auto' }}>{within ? <I.checkCircle size={16} /> : <I.alert size={16} />}</span>
                <span style={{ fontSize: 11.5, lineHeight: 1.45 }}>{within
                  ? <>Proyeksi salah saji (<b>{totalProj.toLocaleString('id-ID')} jt</b>) <b>di bawah</b> salah saji yang ditoleransi. Ditambah pertimbangan risiko sampling, populasi dapat diterima — namun salah saji aktual dicatat ke <b>SAD Ledger</b>.</>
                  : <>Proyeksi salah saji <b>melampaui</b> toleransi — pertimbangkan perluasan sampel atau prosedur alternatif, dan diskusikan koreksi dengan manajemen.</>}</span>
              </div>
            </div>
          </div>
        </Panel>

        <div className="grid" style={{ gap: 12 }}>
          <Panel title="Sifat & Sebab Penyimpangan (¶12)">
            <p className="tiny muted" style={{ margin: 0, lineHeight: 1.5 }}>Auditor menyelidiki sifat & penyebab setiap penyimpangan serta mengevaluasi dampaknya pada tujuan prosedur & area audit lain. Tidak ada indikasi <b>anomali</b> (kesalahan satu kali yang bukan representatif) — semua diperlakukan representatif & diproyeksikan.</p>
          </Panel>
          <Panel title="Tautan Modul">
            <div style={{ display: 'grid', gap: 7 }}>
              {[['SAD Ledger — catat salah saji', 'scale'], ['Confirmation Hub (SA 505)', 'mail'], ['Materiality — TM & MK', 'target']].map((r, i) => {
                const Lic = I[r[1]];
                return (
                  <div key={i} className="row jb ac" style={{ fontSize: 12, padding: '8px 10px', border: '1px solid var(--line-soft)', borderRadius: 7 }}>
                    <span className="row ac gap8"><span style={{ color: 'var(--blue)' }}><Lic size={14} /></span>{r[0]}</span>
                    <I.arrowRight size={14} style={{ color: 'var(--ink-4)' }} />
                  </div>
                );
              })}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { SA530View });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { SA530View };
