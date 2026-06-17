/* ============================================================
   NeoSuite AMS — SA 540 · Audit atas Estimasi Akuntansi
   Deep workpaper: inventaris estimasi & ketidakpastian,
   penilaian risiko bawaan (kompleksitas/subjektivitas/
   ketidakpastian), respons (uji proses manajemen & rentang
   independen), indikator bias, serta pengungkapan.
   ============================================================ */
const { useState: useState540, useMemo: useMemo540 } = React;

/* ---- Inventaris estimasi (Rp jt) ---- */
const EST_REG = [
  { id: 'E-01', name: 'CKPN Piutang (ECL · PSAK 71)', acct: 'Cadangan Kerugian', mgmt: 4870, lo: 4600, hi: 6300, unc: 'Tinggi', risk: 'Signifikan', method: 'Model ECL forward-looking; PD × LGD × EAD per staging', assump: ['Probabilitas gagal bayar (PD) per kelompok umur', 'Loss given default (LGD) berbasis recovery historis', 'Overlay makroekonomi (PDB, suku bunga)'], approach: 'Rentang independen', note: 'Titik manajemen di batas bawah rentang auditor — indikasi understatement (lihat Bias).' },
  { id: 'E-02', name: 'Penyisihan Persediaan Usang', acct: 'Penyisihan Persediaan', mgmt: 2240, lo: 2050, hi: 2600, unc: 'Sedang', risk: 'Signifikan', method: 'Analisis umur & perputaran SKU; net realizable value', assump: ['Klasifikasi lambat-bergerak (> 180 hari)', 'Estimasi nilai jual bersih SKU usang', 'Rencana likuidasi/diskon manajemen'], approach: 'Uji proses manajemen', note: 'Dalam rentang; konsisten dengan temuan hitung fisik SA 501 (GBJ-03).' },
  { id: 'E-03', name: 'Provisi Garansi Produk', acct: 'Provisi', mgmt: 1080, lo: 980, hi: 1240, unc: 'Sedang', risk: 'Non-signifikan', method: 'Tingkat klaim historis × penjualan bergaransi', assump: ['Rasio klaim historis 36 bulan', 'Periode garansi rata-rata', 'Tren kualitas produk'], approach: 'Uji proses manajemen', note: 'Telaah retrospektif menunjukkan estimasi PY akurat (selisih −6%).' },
  { id: 'E-04', name: 'Liabilitas Imbalan Kerja (PSAK 24)', acct: 'Liabilitas Imbalan Pasti', mgmt: 9650, lo: 9100, hi: 10400, unc: 'Tinggi', risk: 'Signifikan', method: 'Projected Unit Credit oleh aktuaris independen', assump: ['Tingkat diskonto (obligasi korporasi)', 'Kenaikan gaji jangka panjang', 'Tingkat mortalita & pengunduran diri'], approach: 'Gunakan pakar (SA 620)', note: 'Asumsi diskonto di kisaran wajar; kompetensi & objektivitas aktuaris dievaluasi.' },
  { id: 'E-05', name: 'Uji Penurunan Nilai Goodwill', acct: 'Goodwill', mgmt: 0, lo: 0, hi: 1800, unc: 'Tinggi', risk: 'Signifikan', method: 'Value-in-use; arus kas terdiskonto (DCF) per UPK', assump: ['Tingkat pertumbuhan terminal', 'WACC (tingkat diskonto)', 'Proyeksi arus kas 5 tahun'], approach: 'Rentang independen', note: 'Tidak ada rugi penurunan nilai diakui; headroom tipis & sensitif terhadap WACC.' },
];

/* ---- Indikator bias manajemen (¶32) ---- */
const BIAS_ROWS = [
  { t: 'Perubahan estimasi/asumsi yang menggeser laba ke arah menguntungkan', est: 'CKPN Piutang', flag: 'amber', d: 'Titik di batas bawah rentang; overlay makro dikurangi vs PY.' },
  { t: 'Telaah retrospektif — selisih estimasi PY vs realisasi', est: 'CKPN Piutang', flag: 'amber', d: 'CKPN PY understated 42% terhadap realisasi (rujuk SA 240).' },
  { t: 'Seleksi titik dalam rentang tanpa dasar netral', est: 'Goodwill', flag: 'amber', d: 'WACC di batas bawah kisaran wajar — menaikkan value-in-use.' },
  { t: 'Konsistensi metode & asumsi antar periode', est: 'Imbalan Kerja', flag: 'green', d: 'Metode & sumber asumsi aktuaria konsisten dengan PY.' },
];

/* ============================================================ */
function SA540View() {
  const firm = (typeof useFirm === 'function') ? useFirm() : null;
  const client = firm?.activeClient?.name || 'PT Sentosa Makmur Tbk';
  const [tab, setTab] = useState540('inventaris');

  const sig = EST_REG.filter(e => e.risk === 'Signifikan').length;
  const tabs = [
    { id: 'inventaris', label: 'Inventaris Estimasi' },
    { id: 'risiko', label: 'Risiko & Ketidakpastian' },
    { id: 'respons', label: 'Respons & Rentang' },
    { id: 'bias', label: 'Bias & Pengungkapan' },
  ];

  return (
    <>
      <SubBar moduleId="sa540" right={
        <div className="row gap8 ac">
          <SACanonChips stdId="sa540" />
          <Btn sm><I.download size={13} /> Memo Estimasi</Btn>
          <Btn sm variant="primary"><I.sparkle size={14} /> AI Assist</Btn>
        </div>
      } />
      <div className="view-scroll"><div className="view-pad">

        <Panel noBody style={{ marginBottom: 12 }}>
          <div style={{ padding: '13px 16px', display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ minWidth: 210 }}>
              <div className="tiny muted upper" style={{ marginBottom: 3 }}>Standar Audit 540 (Revisi)</div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>Estimasi Akuntansi & Pengungkapan</div>
              <div className="tiny muted">{client} · ENG-2025-014</div>
            </div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Estimasi Teridentifikasi</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5 }}>{EST_REG.length} · {sig} signifikan</div></div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Ketidakpastian Tinggi</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--red)' }}>{EST_REG.filter(e => e.unc === 'Tinggi').length} estimasi</div></div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Indikasi Bias</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--amber)' }}>2 perhatian</div></div>
            <div style={{ flex: 1 }} />
            <div style={{ textAlign: 'right' }}>
              <div className="tiny muted upper" style={{ marginBottom: 3 }}>Sikap Auditor</div>
              <Badge kind="amber" dot>Skeptisisme Profesional</Badge>
            </div>
          </div>
        </Panel>

        <SACanonicalStatus stdId="sa540" />

        <div style={{ marginBottom: 12 }}><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>

        {tab === 'inventaris' && <F540Register />}
        {tab === 'risiko' && <F540Risk />}
        {tab === 'respons' && <F540Response />}
        {tab === 'bias' && <F540Bias />}

      </div></div>
    </>
  );
}

/* ---------------- Tab: Inventaris Estimasi ---------------- */
function F540Register() {
  const [selId, setSelId] = useState540('E-01');
  const sel = EST_REG.find(e => e.id === selId);
  const uncKind = u => u === 'Tinggi' ? 'red' : u === 'Sedang' ? 'amber' : 'green';
  /* posisi titik manajemen dalam rentang auditor 0..100 */
  const pos = sel.hi > sel.lo ? Math.max(0, Math.min(100, ((sel.mgmt - sel.lo) / (sel.hi - sel.lo)) * 100)) : 50;
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 380px', gap: 12, alignItems: 'start' }}>
      <Panel noBody>
        <div className="panel-h"><h3>Inventaris Estimasi Akuntansi</h3><div style={{ flex: 1 }} /><span className="tiny muted">{EST_REG.length} estimasi</span></div>
        <table className="dtbl">
          <thead><tr><th style={{ width: 50 }}>Ref</th><th>Estimasi</th><th className="num">Titik Mgmt</th><th style={{ width: 88 }}>Ketidakpastian</th><th style={{ width: 96 }}>Risiko</th></tr></thead>
          <tbody>
            {EST_REG.map(e => (
              <tr key={e.id} className={e.id === selId ? 'sel' : ''} onClick={() => setSelId(e.id)} style={{ cursor: 'pointer' }}>
                <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{e.id}</td>
                <td style={{ fontWeight: 600, whiteSpace: 'normal', lineHeight: 1.35 }}>{e.name}<div className="tiny muted" style={{ fontWeight: 400, marginTop: 2 }}>{e.acct}</div></td>
                <td className="num mono">{e.mgmt.toLocaleString('id-ID')}</td>
                <td><Badge kind={uncKind(e.unc)}>{e.unc}</Badge></td>
                <td><Badge kind={e.risk === 'Signifikan' ? 'red' : 'gray'}>{e.risk === 'Signifikan' ? 'Signifikan' : 'Non-sig.'}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      {sel && (
        <Panel noBody>
          <div style={{ background: 'var(--surface-2)', padding: '11px 14px', borderBottom: '1px solid var(--line)' }}>
            <div className="row ac gap8"><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{sel.id}</span><Badge kind={uncKind(sel.unc)}>Ketidakpastian {sel.unc}</Badge>{sel.risk === 'Signifikan' && <Badge kind="red">Signifikan</Badge>}</div>
            <div style={{ fontWeight: 700, fontSize: 13, marginTop: 4, lineHeight: 1.35 }}>{sel.name}</div>
          </div>
          <div style={{ padding: 14 }}>
            <div className="tiny muted upper" style={{ marginBottom: 4 }}>Metode Pengukuran</div>
            <p style={{ margin: '0 0 12px', fontSize: 12, lineHeight: 1.5 }}>{sel.method}</p>

            <div className="tiny muted upper" style={{ marginBottom: 6 }}>Titik Manajemen vs Rentang Auditor (Rp jt)</div>
            <div style={{ position: 'relative', height: 30, marginBottom: 4 }}>
              <div style={{ position: 'absolute', top: 12, left: 0, right: 0, height: 6, borderRadius: 3, background: 'linear-gradient(90deg,var(--green),var(--amber),var(--red))', opacity: .25 }} />
              <div style={{ position: 'absolute', top: 12, left: 0, right: 0, height: 6, borderRadius: 3, border: '1px solid var(--line-strong)' }} />
              <div style={{ position: 'absolute', top: 6, left: `calc(${pos}% - 1px)`, width: 2, height: 18, background: 'var(--navy)' }} />
              <div style={{ position: 'absolute', top: -2, left: `${pos}%`, transform: 'translateX(-50%)' }}><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--navy)' }}>{sel.mgmt.toLocaleString('id-ID')}</span></div>
            </div>
            <div className="row jb tiny mono muted" style={{ marginBottom: 12 }}><span>{sel.lo.toLocaleString('id-ID')}</span><span>rentang independen auditor</span><span>{sel.hi.toLocaleString('id-ID')}</span></div>

            <div className="tiny muted upper" style={{ marginBottom: 5 }}>Asumsi Signifikan</div>
            {sel.assump.map((a, i) => (
              <div key={i} className="row gap8" style={{ fontSize: 12, alignItems: 'flex-start', padding: '6px 0', borderBottom: i < sel.assump.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
                <span style={{ color: 'var(--blue)', flex: '0 0 auto', marginTop: 1 }}><I.arrowRight size={13} /></span><span style={{ lineHeight: 1.4 }}>{a}</span>
              </div>
            ))}
            <div className="panel" style={{ padding: '9px 11px', background: 'var(--surface-2)', borderColor: 'transparent', marginTop: 12 }}>
              <div className="row gap8" style={{ alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--blue)', flex: '0 0 auto' }}><I.flag size={14} /></span>
                <span style={{ fontSize: 11.5, lineHeight: 1.4 }}>{sel.note}</span>
              </div>
            </div>
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
            const Ic = I[d.ic];
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
function F540Bias() {
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 340px', gap: 12, alignItems: 'start' }}>
      <div className="grid" style={{ gap: 12 }}>
        <Panel noBody>
          <div className="panel-h"><h3>Indikator Kemungkinan Bias Manajemen (¶32)</h3><div style={{ flex: 1 }} /><Badge kind="amber">2 perhatian</Badge></div>
          <table className="dtbl">
            <thead><tr><th>Indikator</th><th style={{ width: 130 }}>Estimasi</th><th style={{ width: 86 }}>Status</th></tr></thead>
            <tbody>
              {BIAS_ROWS.map((b, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600, whiteSpace: 'normal', lineHeight: 1.35 }}>{b.t}<div className="tiny muted" style={{ fontWeight: 400, marginTop: 2 }}>{b.d}</div></td>
                  <td className="tiny">{b.est}</td>
                  <td>{b.flag === 'green' ? <Badge kind="green">Wajar</Badge> : <Badge kind="amber">Perhatian</Badge>}</td>
                </tr>
              ))}
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
