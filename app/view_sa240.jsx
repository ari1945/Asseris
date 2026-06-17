/* ============================================================
   NeoSuite AMS — SA 240 · Tanggung Jawab Auditor atas Kecurangan
   Deep workpaper: penilaian risiko fraud, segitiga fraud,
   register risiko, asumsi risiko (pendapatan & override
   manajemen), respons & JET, serta komunikasi.
   ============================================================ */
const { useState: useStateF, useMemo: useMemoF } = React;

/* ---- Faktor risiko fraud (segitiga) ---- */
const FRAUD_TRIANGLE = {
  pressure: {
    k: 'Tekanan / Insentif', ref: '¶24 · Lamp.1', color: 'red', icon: 'trend',
    sub: 'Kondisi yang menekan manajemen/karyawan untuk melakukan kecurangan.',
    factors: [
      { t: 'Target laba agresif & kovenan utang ketat (DER mendekati batas bank)', sev: 'Tinggi', on: true },
      { t: 'Sebagian besar remunerasi manajemen terkait pencapaian EBITDA', sev: 'Tinggi', on: true },
      { t: 'Tekanan menjaga harga saham menjelang rencana right issue', sev: 'Sedang', on: true },
      { t: 'Likuiditas tertekan — arus kas operasi negatif 2 kuartal', sev: 'Sedang', on: false },
    ],
  },
  opportunity: {
    k: 'Peluang', ref: '¶24 · Lamp.1', color: 'amber', icon: 'lock',
    sub: 'Kondisi yang memungkinkan kecurangan terjadi (kontrol lemah/dapat ditembus).',
    factors: [
      { t: 'Transaksi signifikan dengan pihak berelasi di luar kegiatan normal', sev: 'Tinggi', on: true },
      { t: 'Dominasi manajemen oleh satu orang tanpa kontrol kompensasi', sev: 'Sedang', on: true },
      { t: 'Estimasi akuntansi yang melibatkan pertimbangan subjektif signifikan', sev: 'Tinggi', on: true },
      { t: 'Pemisahan tugas (SoD) lemah pada siklus pengeluaran kas', sev: 'Sedang', on: false },
    ],
  },
  rationalization: {
    k: 'Rasionalisasi / Sikap', ref: '¶24 · Lamp.1', color: 'purple', icon: 'users',
    sub: 'Sikap/justifikasi yang memungkinkan pelaku membenarkan tindakannya.',
    factors: [
      { t: 'Riwayat pelanggaran regulasi / sengketa dengan otoritas pajak', sev: 'Sedang', on: true },
      { t: 'Komitmen manajemen pada proyeksi pasar yang tidak realistis', sev: 'Sedang', on: true },
      { t: 'Toleransi tinggi atas penyimpangan minor dari kebijakan', sev: 'Rendah', on: false },
      { t: 'Hubungan auditor–manajemen tegang / pembatasan akses', sev: 'Rendah', on: false },
    ],
  },
};

/* ---- Register risiko fraud ---- */
const FRAUD_REGISTER = [
  { id: 'FR-01', risk: 'Pengakuan pendapatan dipercepat (channel stuffing menjelang tutup buku)', type: 'Pelaporan Keuangan Curang', assertion: 'Keterjadian · Cut-off', acct: 'Pendapatan & Piutang', sig: true, presumed: true, lvl: 'Signifikan',
    response: 'Uji cut-off rinci 2 minggu sebelum/sesudah tutup buku; konfirmasi piutang & telaah retur pasca-periode; analitik tren margin per bulan.', status: 'Berlangsung' },
  { id: 'FR-02', risk: 'Override manajemen melalui jurnal manual non-standar pada periode tutup', type: 'Pelaporan Keuangan Curang', assertion: 'Seluruh asersi', acct: 'Lintas akun', sig: true, presumed: true, lvl: 'Signifikan',
    response: 'Journal Entry Testing berbasis kriteria risiko; telaah penyesuaian akhir periode; evaluasi bias estimasi.', status: 'Berlangsung' },
  { id: 'FR-03', risk: 'Kapitalisasi beban yang seharusnya dibebankan untuk mempercantik laba', type: 'Pelaporan Keuangan Curang', assertion: 'Klasifikasi · Akurasi', acct: 'Aset Tetap & Beban', sig: true, presumed: false, lvl: 'Signifikan',
    response: 'Vouching penambahan aset > materialitas kinerja; uji kebijakan kapitalisasi vs realisasi.', status: 'Direncanakan' },
  { id: 'FR-04', risk: 'Penyalahgunaan aset — pengeluaran kas fiktif ke pemasok bayangan', type: 'Penyalahgunaan Aset', assertion: 'Keterjadian', acct: 'Kas & Beban', sig: false, presumed: false, lvl: 'Moderat',
    response: 'Uji master vendor (duplikasi rekening/NPWP); analitik Benford atas pembayaran; vouching otorisasi.', status: 'Direncanakan' },
  { id: 'FR-05', risk: 'Estimasi CKPN diturunkan untuk mengelola laba (bias manajemen)', type: 'Pelaporan Keuangan Curang', assertion: 'Penilaian', acct: 'Cadangan Kerugian', sig: true, presumed: false, lvl: 'Signifikan',
    response: 'Telaah retrospektif estimasi; uji asumsi forward-looking; kembangkan rentang independen.', status: 'Berlangsung' },
];

/* ---- Prosedur wajib atas asumsi risiko ---- */
const OVERRIDE_PROC = [
  { t: 'Uji ketepatan jurnal & penyesuaian lain yang dicatat dalam buku besar', ref: '¶32(a)', wp: 'F-240.JET', done: true },
  { t: 'Telaah estimasi akuntansi atas indikasi bias manajemen (termasuk telaah retrospektif)', ref: '¶32(b)', wp: 'F-240.EST', done: true },
  { t: 'Evaluasi rasionalitas bisnis transaksi signifikan di luar kegiatan normal', ref: '¶32(c)', wp: 'F-240.SUT', done: false },
];

/* ---- Komunikasi ---- */
const FRAUD_COMMS = [
  { to: 'Manajemen', ref: '¶40–41', when: 'Tepat waktu', what: 'Fraud teridentifikasi/dicurigai yang melibatkan karyawan dengan peran kontrol, atau berdampak material.', status: 'N/A — belum ada indikasi' },
  { to: 'Pihak Tata Kelola (TCWG)', ref: '¶41–42', when: 'Tepat waktu', what: 'Fraud yang melibatkan manajemen; kelemahan signifikan kontrol anti-fraud; hal yang relevan dengan tanggung jawab TCWG.', status: 'Dijadwalkan — rapat penutupan' },
  { to: 'Regulator / Otoritas', ref: '¶43 · A65–67', when: 'Bila diwajibkan', what: 'Pelaporan ke pihak di luar entitas bila diharuskan hukum/regulasi (mengalahkan kewajiban kerahasiaan).', status: 'Tidak berlaku periode ini' },
];

/* ============================================================ */
function SA240View() {
  const firm = (typeof useFirm === 'function') ? useFirm() : null;
  const client = firm?.activeClient?.name || 'PT Sentosa Makmur Tbk';
  const [tab, setTab] = useStateF('risiko');

  const sigCount = FRAUD_REGISTER.filter(r => r.sig).length;
  const tabs = [
    { id: 'risiko', label: 'Penilaian Risiko' },
    { id: 'segitiga', label: 'Segitiga Fraud' },
    { id: 'register', label: 'Register Risiko' },
    { id: 'asumsi', label: 'Asumsi Risiko' },
    { id: 'respons', label: 'Respons & JET' },
    { id: 'komunikasi', label: 'Komunikasi' },
  ];

  return (
    <>
      <SubBar moduleId="sa240" right={
        <div className="row gap8 ac">
          <Badge kind="red" dot>2 Risiko Signifikan Wajib</Badge>
          <Btn sm><I.download size={13} /> Memo Risiko Fraud</Btn>
          <Btn sm variant="primary"><I.sparkle size={14} /> AI Assist</Btn>
        </div>
      } />
      <div className="view-scroll"><div className="view-pad">

        {/* summary header */}
        <Panel noBody style={{ marginBottom: 12 }}>
          <div style={{ padding: '13px 16px', display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ minWidth: 210 }}>
              <div className="tiny muted upper" style={{ marginBottom: 3 }}>Standar Audit 240</div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>Tanggung Jawab atas Kecurangan</div>
              <div className="tiny muted">{client} · ENG-2025-014</div>
            </div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Risiko Fraud Teridentifikasi</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5 }}>{FRAUD_REGISTER.length} risiko · {sigCount} signifikan</div></div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Risiko Wajib (Presumsi)</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--red)' }}>Pendapatan · Override</div></div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Brainstorming Tim</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5 }}>06 Mar · 5 peserta</div></div>
            <div style={{ flex: 1 }} />
            <div style={{ textAlign: 'right' }}>
              <div className="tiny muted upper" style={{ marginBottom: 3 }}>Sikap Auditor</div>
              <Badge kind="amber" dot>Skeptisisme Profesional</Badge>
            </div>
          </div>
        </Panel>

        <div style={{ marginBottom: 12 }}><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>

        {tab === 'risiko' && <F240Risk client={client} />}
        {tab === 'segitiga' && <F240Triangle />}
        {tab === 'register' && <F240Register />}
        {tab === 'asumsi' && <F240Assumptions />}
        {tab === 'respons' && <F240Response />}
        {tab === 'komunikasi' && <F240Comms client={client} />}

      </div></div>
    </>
  );
}

/* ---------------- Tab: Penilaian Risiko ---------------- */
function F240Risk({ client }) {
  const steps = [
    { ic: 'group', t: 'Diskusi Tim Perikatan (¶15)', d: 'Brainstorming kerentanan LK terhadap fraud — di mana & bagaimana LK dapat dicurangi, termasuk override manajemen.', tag: 'Selesai 06 Mar', ok: true },
    { ic: 'mail', t: 'Inquiry Manajemen & Pihak Lain (¶17–21)', d: 'Tanya manajemen, audit internal, TCWG & personel lain mengenai risiko, dugaan, & proses anti-fraud.', tag: '4 dari 5 selesai', ok: true },
    { ic: 'flask', t: 'Identifikasi Faktor Risiko Fraud (¶24)', d: 'Pertimbangkan tekanan, peluang, & rasionalisasi (segitiga fraud) atas pelaporan keuangan & penyalahgunaan aset.', tag: 'Lihat Segitiga', ok: true },
    { ic: 'trend', t: 'Prosedur Analitis Awal (¶22)', d: 'Identifikasi hubungan tak biasa/tak terduga (mis. lonjakan pendapatan akhir periode, margin anomali).', tag: '2 anomali ditandai', ok: true },
    { ic: 'target', t: 'Penetapan Risiko Signifikan (¶25–27)', d: 'Pendapatan dianggap berisiko fraud (presumsi); override manajemen selalu risiko signifikan.', tag: '2 presumsi', ok: true },
  ];
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 360px', gap: 12, alignItems: 'start' }}>
      <div className="grid" style={{ gap: 12 }}>
        <Panel noBody>
          <div className="panel-h"><h3>Proses Penilaian Risiko Kecurangan</h3><div style={{ flex: 1 }} /><Badge kind="blue">SA 240 · SA 315</Badge></div>
          <div style={{ padding: '6px 14px 14px' }}>
            {steps.map((s, i) => {
              const Ic = I[s.ic];
              return (
                <div key={i} className="row gap10" style={{ padding: '11px 0', alignItems: 'flex-start', borderBottom: i < steps.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
                  <span style={{ flex: '0 0 30px', width: 30, height: 30, borderRadius: 8, display: 'grid', placeItems: 'center', background: 'var(--blue-050)', color: 'var(--blue)' }}><Ic size={16} /></span>
                  <div style={{ flex: 1 }}>
                    <div className="row jb ac"><div style={{ fontSize: 12.5, fontWeight: 700 }}>{s.t}</div><Badge kind={s.ok ? 'green' : 'amber'}>{s.tag}</Badge></div>
                    <div className="tiny muted" style={{ lineHeight: 1.45, marginTop: 3 }}>{s.d}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel noBody>
          <div className="panel-h"><h3>Anomali dari Prosedur Analitis Awal</h3><div style={{ flex: 1 }} /><span className="tiny muted">2 ditandai untuk tindak lanjut</span></div>
          <table className="dtbl">
            <thead><tr><th>Indikator</th><th>Observasi</th><th style={{ width: 120 }}>Tindak Lanjut</th></tr></thead>
            <tbody>
              <tr><td style={{ fontWeight: 600 }}>Konsentrasi pendapatan Desember</td><td className="tiny">28% pendapatan tahunan tercatat di Desember (vs rata-rata 11%/bln).</td><td><Badge kind="red">FR-01</Badge></td></tr>
              <tr><td style={{ fontWeight: 600 }}>Margin kotor naik tak lazim</td><td className="tiny">GPM Q4 +6,2 pp tanpa perubahan bauran produk/harga jelas.</td><td><Badge kind="amber">Telaah</Badge></td></tr>
              <tr><td style={{ fontWeight: 600 }}>Jurnal manual akhir bulan</td><td className="tiny">Volume jurnal manual H-3 tutup buku 3,1× rata-rata.</td><td><Badge kind="red">FR-02</Badge></td></tr>
            </tbody>
          </table>
        </Panel>
      </div>

      <div className="grid" style={{ gap: 12 }}>
        <Panel title="Inquiry — Status">
          <div style={{ display: 'grid', gap: 7 }}>
            {[
              { t: 'Direksi & manajemen kunci', ok: true },
              { t: 'Satuan Pengawas Intern (SPI)', ok: true },
              { t: 'Komite Audit / TCWG', ok: true },
              { t: 'Personel operasional terpilih', ok: true },
              { t: 'Penasihat hukum internal', ok: false },
            ].map((r, i) => (
              <div key={i} className="row jb ac" style={{ fontSize: 12 }}>
                <span>{r.t}</span>
                {r.ok ? <span className="row ac gap6 tiny" style={{ color: 'var(--green)', fontWeight: 600 }}><I.check size={13} /> Selesai</span> : <Badge kind="amber">Dijadwalkan</Badge>}
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Catatan Skeptisisme Profesional" sub="SA 200 ¶15">
          <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.55, color: 'var(--ink-2)' }}>
            Tim mempertahankan sikap skeptis terlepas dari pengalaman masa lalu atas <b>kejujuran & integritas</b>
            manajemen {client}. Representasi tidak diterima sebagai pengganti bukti; dokumen menjelang tutup buku
            diuji keasliannya bila terdapat indikasi.
          </p>
        </Panel>
        <Panel title="Dokumentasi (¶44–47)">
          <div style={{ display: 'grid', gap: 6 }}>
            {[['Diskusi tim & keputusan', 'F-240.1'], ['Faktor risiko teridentifikasi', 'F-240.2'], ['Respons keseluruhan & spesifik', 'F-240.3']].map((r, i) => (
              <div key={i} className="row jb ac" style={{ fontSize: 12, padding: '7px 9px', border: '1px solid var(--line-soft)', borderRadius: 6 }}>
                <span className="row ac gap8"><span style={{ color: 'var(--blue)' }}><I.doc size={14} /></span>{r[0]}</span>
                <span className="mono tiny" style={{ color: 'var(--blue)', fontWeight: 700 }}>{r[1]}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ---------------- Tab: Segitiga Fraud ---------------- */
function F240Triangle() {
  const [selId, setSelId] = useStateF('pressure');
  const sel = FRAUD_TRIANGLE[selId];
  const keys = Object.keys(FRAUD_TRIANGLE);
  const sevKind = s => s === 'Tinggi' ? 'red' : s === 'Sedang' ? 'amber' : 'gray';
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }}>
      <Panel noBody>
        <div className="panel-h"><h3>Tiga Kondisi Kecurangan</h3><div style={{ flex: 1 }} /><span className="tiny muted">Klik untuk telaah faktor</span></div>
        <div style={{ padding: 16 }}>
          {/* triangle diagram */}
          <div style={{ position: 'relative', width: '100%', maxWidth: 320, margin: '4px auto 14px', aspectRatio: '1.15 / 1' }}>
            {keys.map((k, i) => {
              const t = FRAUD_TRIANGLE[k];
              const pos = i === 0 ? { top: 0, left: '50%', transform: 'translateX(-50%)' }
                : i === 1 ? { bottom: 0, left: 0 } : { bottom: 0, right: 0 };
              const on = k === selId;
              const Tic = I[t.icon];
              return (
                <button key={k} onClick={() => setSelId(k)} style={{
                  position: 'absolute', ...pos, width: 116, padding: '9px 8px', borderRadius: 10, cursor: 'pointer',
                  border: '1.5px solid ' + (on ? `var(--${t.color})` : 'var(--line)'),
                  background: on ? `var(--${t.color}-bg)` : 'var(--surface-1, #fff)', textAlign: 'center',
                  boxShadow: on ? '0 2px 10px rgba(0,0,0,.08)' : 'none' }}>
                  <span style={{ color: `var(--${t.color})` }}><Tic size={18} /></span>
                  <div style={{ fontWeight: 700, fontSize: 11.5, marginTop: 3, color: on ? `var(--${t.color})` : 'var(--ink)' }}>{t.k}</div>
                  <div className="mono tiny" style={{ color: 'var(--ink-4)' }}>{t.factors.filter(f => f.on).length} aktif</div>
                </button>
              );
            })}
            <svg viewBox="0 0 100 88" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: -1 }} preserveAspectRatio="none">
              <polygon points="50,8 12,80 88,80" fill="none" stroke="var(--line-strong)" strokeWidth="0.6" strokeDasharray="2 2" />
            </svg>
          </div>
          <p className="tiny muted" style={{ margin: 0, lineHeight: 1.5, textAlign: 'center' }}>
            Ketiga kondisi tidak harus seluruhnya teramati agar risiko fraud ada. Auditor mengidentifikasi faktor
            risiko sebagai sinyal, bukan bukti, terjadinya kecurangan (SA 240 ¶A28).
          </p>
        </div>
      </Panel>

      <Panel noBody>
        <div style={{ background: `var(--${sel.color}-bg)`, padding: '12px 14px', borderBottom: '1px solid var(--line)' }}>
          <div className="row ac gap8">{(() => { const Sic = I[sel.icon]; return <span style={{ color: `var(--${sel.color})` }}><Sic size={18} /></span>; })()}<span className="mono tiny" style={{ fontWeight: 700, color: `var(--${sel.color})` }}>{sel.ref}</span></div>
          <div style={{ fontWeight: 700, fontSize: 14, marginTop: 4 }}>{sel.k}</div>
          <div className="tiny" style={{ color: 'var(--ink-2)', marginTop: 2, lineHeight: 1.4 }}>{sel.sub}</div>
        </div>
        <div style={{ padding: '6px 0' }}>
          {sel.factors.map((f, i) => (
            <div key={i} className="row gap10" style={{ padding: '10px 14px', alignItems: 'flex-start', borderBottom: i < sel.factors.length - 1 ? '1px solid var(--line-soft)' : 0, opacity: f.on ? 1 : 0.5 }}>
              <span style={{ flex: '0 0 auto', marginTop: 1, color: f.on ? `var(--${sel.color})` : 'var(--ink-4)' }}>{f.on ? <I.checkCircle size={16} /> : <I.circle size={16} />}</span>
              <div style={{ flex: 1, fontSize: 12.5, lineHeight: 1.45 }}>{f.t}</div>
              <Badge kind={sevKind(f.sev)}>{f.sev}</Badge>
            </div>
          ))}
        </div>
        <div className="panel" style={{ margin: 12, padding: '10px 12px', background: 'var(--surface-2)', borderColor: 'transparent' }}>
          <div className="row gap8" style={{ alignItems: 'flex-start' }}>
            <span style={{ color: `var(--${sel.color})`, flex: '0 0 auto' }}><I.flag size={15} /></span>
            <span style={{ fontSize: 11.5, lineHeight: 1.45 }}>Faktor <b>{sel.k.toLowerCase()}</b> yang aktif diteruskan ke <b>Register Risiko Fraud</b> untuk dipetakan ke asersi & respons audit.</span>
          </div>
        </div>
      </Panel>
    </div>
  );
}

/* ---------------- Tab: Register Risiko ---------------- */
function F240Register() {
  const [selId, setSelId] = useStateF('FR-01');
  const sel = FRAUD_REGISTER.find(r => r.id === selId);
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 360px', gap: 12, alignItems: 'start' }}>
      <Panel noBody>
        <div className="panel-h"><h3>Register Risiko Kecurangan</h3><div style={{ flex: 1 }} /><span className="tiny muted">{FRAUD_REGISTER.length} risiko · {FRAUD_REGISTER.filter(r => r.presumed).length} presumsi wajib</span></div>
        <table className="dtbl">
          <thead><tr><th style={{ width: 56 }}>Ref</th><th>Risiko Kecurangan</th><th>Jenis</th><th style={{ width: 92 }}>Tingkat</th></tr></thead>
          <tbody>
            {FRAUD_REGISTER.map(r => (
              <tr key={r.id} className={r.id === selId ? 'sel' : ''} onClick={() => setSelId(r.id)} style={{ cursor: 'pointer' }}>
                <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{r.id}</td>
                <td style={{ fontWeight: 600, whiteSpace: 'normal', lineHeight: 1.35 }}>{r.risk}
                  <div className="tiny muted" style={{ fontWeight: 400, marginTop: 2 }}>{r.acct} · {r.assertion}{r.presumed && <span style={{ color: 'var(--red)', fontWeight: 600 }}> · presumsi ¶26/¶31</span>}</div>
                </td>
                <td className="tiny">{r.type === 'Penyalahgunaan Aset' ? <Badge kind="amber">Aset</Badge> : <Badge kind="purple">Pelaporan</Badge>}</td>
                <td><Badge kind={r.lvl === 'Signifikan' ? 'red' : 'amber'}>{r.lvl}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
      {sel && (
        <Panel noBody>
          <div style={{ background: 'var(--surface-2)', padding: '11px 14px', borderBottom: '1px solid var(--line)' }}>
            <div className="row ac gap8"><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{sel.id}</span><Badge kind={sel.lvl === 'Signifikan' ? 'red' : 'amber'}>{sel.lvl}</Badge>{sel.presumed && <Badge kind="red">Presumsi Wajib</Badge>}</div>
            <div style={{ fontWeight: 700, fontSize: 13, marginTop: 4, lineHeight: 1.35 }}>{sel.risk}</div>
          </div>
          <div style={{ padding: 14 }}>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <KvBox label="Akun Terdampak" v={sel.acct} />
              <KvBox label="Asersi" v={sel.assertion} />
              <KvBox label="Jenis Fraud" v={sel.type} />
              <KvBox label="Status" v={sel.status} accent={sel.status === 'Berlangsung' ? 'var(--blue)' : 'var(--ink-3)'} />
            </div>
            <div className="tiny muted upper" style={{ marginBottom: 4 }}>Respons Audit yang Direncanakan</div>
            <p style={{ margin: '0 0 12px', fontSize: 12, lineHeight: 1.5 }}>{sel.response}</p>
            {sel.sig && (
              <div className="panel" style={{ padding: '9px 11px', background: 'var(--red-bg)', borderColor: 'transparent', marginBottom: 12 }}>
                <div className="row ac gap8"><span style={{ color: 'var(--red)' }}><I.alert size={15} /></span><span style={{ fontSize: 11.5, lineHeight: 1.4 }}>Risiko signifikan — wajib respons spesifik & pengujian substantif; tidak boleh hanya mengandalkan kontrol (¶30).</span></div>
              </div>
            )}
            <Btn sm variant="primary" style={{ width: '100%' }}><I.arrowRight size={14} /> Buka Respons Terkait</Btn>
          </div>
        </Panel>
      )}
    </div>
  );
}

/* ---------------- Tab: Asumsi Risiko ---------------- */
function F240Assumptions() {
  return (
    <div className="grid" style={{ gap: 12 }}>
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }}>
        {/* Revenue recognition */}
        <Panel noBody>
          <div style={{ background: 'linear-gradient(125deg,#5a1410,#8a2a1e)', color: '#fff', padding: '14px 16px' }}>
            <div className="row jb ac"><Badge kind="red">Presumsi ¶26</Badge><span className="mono tiny" style={{ color: '#f0c9c4' }}>Risiko Signifikan</span></div>
            <div style={{ fontSize: 15, fontWeight: 700, marginTop: 8 }}>Risiko Fraud Pengakuan Pendapatan</div>
            <p style={{ margin: '6px 0 0', fontSize: 11.5, lineHeight: 1.5, color: '#f0d4cf' }}>Auditor wajib menganggap terdapat risiko fraud pada pengakuan pendapatan, kecuali presumsi dapat dibantah & terdokumentasi (¶47).</p>
          </div>
          <div style={{ padding: 14 }}>
            <div className="tiny muted upper" style={{ marginBottom: 6 }}>Evaluasi Presumsi</div>
            <div className="row ac gap8" style={{ padding: '9px 11px', background: 'var(--red-bg)', borderRadius: 7, marginBottom: 12 }}>
              <span style={{ color: 'var(--red)' }}><I.checkCircle size={16} /></span>
              <span style={{ fontSize: 12, fontWeight: 600 }}>Presumsi <b>dipertahankan</b> — tidak dibantah untuk entitas ini.</span>
            </div>
            <div className="tiny muted upper" style={{ marginBottom: 5 }}>Respons Spesifik</div>
            {[
              'Uji cut-off pendapatan rinci ±2 minggu sekitar tanggal pelaporan',
              'Konfirmasi piutang & telaah nota retur / kredit pasca-periode',
              'Analitik tren pendapatan & margin bulanan untuk pola tak lazim',
              'Telaah kontrak penjualan akhir periode atas syarat tak biasa (bill-and-hold, hak retur)',
            ].map((t, i) => (
              <div key={i} className="row gap8" style={{ fontSize: 12, alignItems: 'flex-start', padding: '6px 0', borderBottom: i < 3 ? '1px solid var(--line-soft)' : 0 }}>
                <span style={{ color: 'var(--red)', flex: '0 0 auto', marginTop: 1 }}><I.arrowRight size={13} /></span><span style={{ lineHeight: 1.4 }}>{t}</span>
              </div>
            ))}
          </div>
        </Panel>

        {/* Management override */}
        <Panel noBody>
          <div style={{ background: 'linear-gradient(125deg,#3a2a05,#6b4e0a)', color: '#fff', padding: '14px 16px' }}>
            <div className="row jb ac"><Badge kind="amber">Presumsi ¶31</Badge><span className="mono tiny" style={{ color: '#e8d6a8' }}>Selalu Signifikan</span></div>
            <div style={{ fontSize: 15, fontWeight: 700, marginTop: 8 }}>Risiko Override Manajemen</div>
            <p style={{ margin: '6px 0 0', fontSize: 11.5, lineHeight: 1.5, color: '#ecdcb0' }}>Manajemen berada pada posisi unik untuk melakukan fraud dengan menembus kontrol. Risiko ini <b>selalu</b> ada & tidak dapat dibantah.</p>
          </div>
          <div style={{ padding: 14 }}>
            <div className="tiny muted upper" style={{ marginBottom: 6 }}>Prosedur Wajib (¶32)</div>
            {OVERRIDE_PROC.map((p, i) => (
              <div key={i} className="row gap10" style={{ padding: '9px 0', alignItems: 'flex-start', borderBottom: i < OVERRIDE_PROC.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
                <span style={{ flex: '0 0 auto', marginTop: 1, color: p.done ? 'var(--green)' : 'var(--amber)' }}>{p.done ? <I.checkCircle size={16} /> : <I.clock size={16} />}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, lineHeight: 1.4 }}>{p.t}</div>
                  <div className="row ac gap6" style={{ marginTop: 3 }}><span className="mono tiny" style={{ color: 'var(--blue)', fontWeight: 700 }}>{p.ref}</span><span className="chip tiny" style={{ height: 17 }}>{p.wp}</span></div>
                </div>
              </div>
            ))}
            <Btn sm variant="primary" style={{ width: '100%', marginTop: 12 }}><I.flask size={14} /> Buka Journal Entry Testing</Btn>
          </div>
        </Panel>
      </div>

      <Panel noBody>
        <div className="panel-h"><h3>Telaah Retrospektif Estimasi — Indikasi Bias (¶32b)</h3><div style={{ flex: 1 }} /><Badge kind="amber">1 perhatian</Badge></div>
        <table className="dtbl">
          <thead><tr><th>Estimasi</th><th className="num">Estimasi PY</th><th className="num">Realisasi</th><th className="num">Selisih</th><th style={{ width: 150 }}>Indikasi Bias</th></tr></thead>
          <tbody>
            <tr><td style={{ fontWeight: 600 }}>CKPN Piutang</td><td className="num">3.420</td><td className="num">4.870</td><td className="num" style={{ color: 'var(--red)' }}>+42%</td><td><Badge kind="amber">Konsisten understated</Badge></td></tr>
            <tr><td style={{ fontWeight: 600 }}>Provisi Garansi</td><td className="num">1.150</td><td className="num">1.080</td><td className="num" style={{ color: 'var(--green)' }}>−6%</td><td><Badge kind="green">Wajar</Badge></td></tr>
            <tr><td style={{ fontWeight: 600 }}>Penyisihan Persediaan Usang</td><td className="num">2.060</td><td className="num">2.240</td><td className="num">+9%</td><td><Badge kind="green">Wajar</Badge></td></tr>
          </tbody>
        </table>
        <div className="panel" style={{ margin: 12, padding: '10px 12px', background: 'var(--amber-bg)', borderColor: 'transparent' }}>
          <div className="row gap8" style={{ alignItems: 'flex-start' }}>
            <span style={{ color: 'var(--amber)', flex: '0 0 auto' }}><I.alert size={15} /></span>
            <span style={{ fontSize: 11.5, lineHeight: 1.45 }}>CKPN tahun lalu ternyata <b>understated 42%</b> terhadap realisasi — pola yang dapat mengindikasikan <b>bias manajemen</b> untuk menahan laba. Estimasi tahun berjalan ditelaah ulang dengan rentang independen (lihat FR-05).</span>
          </div>
        </div>
      </Panel>
    </div>
  );
}

/* ---------------- Tab: Respons & JET ---------------- */
function F240Response() {
  const overall = [
    { t: 'Penugasan & supervisi personel — tambah anggota berpengalaman pada area pendapatan & estimasi', ref: '¶29(a)' },
    { t: 'Evaluasi kebijakan akuntansi — perhatikan pemilihan & penerapan yang dapat menggeser laba', ref: '¶29(b)' },
    { t: 'Unsur ketidakterdugaan (unpredictability) — variasikan sifat, saat, & luas prosedur', ref: '¶29(c)' },
  ];
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 340px', gap: 12, alignItems: 'start' }}>
      <div className="grid" style={{ gap: 12 }}>
        <Panel noBody>
          <div className="panel-h"><h3>Respons Keseluruhan (¶28–29)</h3><div style={{ flex: 1 }} /></div>
          <div style={{ padding: '6px 14px 14px' }}>
            {overall.map((r, i) => (
              <div key={i} className="row gap10" style={{ padding: '10px 0', alignItems: 'flex-start', borderBottom: i < overall.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
                <span style={{ color: 'var(--blue)', flex: '0 0 auto', marginTop: 1 }}><I.checkCircle size={16} /></span>
                <div style={{ flex: 1, fontSize: 12.5, lineHeight: 1.45 }}>{r.t}</div>
                <span className="mono tiny" style={{ color: 'var(--blue)', fontWeight: 700 }}>{r.ref}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel noBody>
          <div className="panel-h"><h3>Journal Entry Testing — Ringkasan</h3><div style={{ flex: 1 }} /><Badge kind="blue">¶32(a)</Badge></div>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 0 }}>
            {[
              { v: '12.480', l: 'Total Jurnal' },
              { v: '316', l: 'Terpilih (Kriteria Risiko)', a: 'var(--blue)' },
              { v: '289', l: 'Selesai Diuji', a: 'var(--green)' },
              { v: '4', l: 'Eksepsi', a: 'var(--amber)' },
            ].map((s, i) => (
              <div key={i} style={{ padding: '12px 14px', borderRight: i < 3 ? '1px solid var(--line-soft)' : 0 }}><Stat value={s.v} label={s.l} accent={s.a} /></div>
            ))}
          </div>
          <div style={{ padding: '0 14px 14px' }}>
            <div className="tiny muted upper" style={{ margin: '4px 0 6px' }}>Kriteria Seleksi Berisiko</div>
            <div className="row gap6" style={{ flexWrap: 'wrap' }}>
              {['Jurnal ke akun kas/pendapatan', 'Entri akhir pekan/hari libur', 'Pembuat tak lazim', 'Nilai bulat besar', 'Akun jarang dipakai', 'Tanpa narasi/dokumen'].map((c, i) => (
                <span key={i} className="chip tiny">{c}</span>
              ))}
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid" style={{ gap: 12 }}>
        <Panel title="Eksepsi JET — Tindak Lanjut">
          <div style={{ display: 'grid', gap: 8 }}>
            {[
              { id: 'JE-7741', d: 'Reklas pendapatan H-1 tutup buku tanpa dokumen', s: 'Investigasi', k: 'red' },
              { id: 'JE-8120', d: 'Jurnal beban dibalik di Jan (window dressing?)', s: 'Investigasi', k: 'red' },
              { id: 'JE-6655', d: 'Pembulatan estimasi tanpa kertas kerja', s: 'Klarifikasi', k: 'amber' },
              { id: 'JE-9002', d: 'Entri akhir pekan oleh non-akuntansi', s: 'Dijelaskan', k: 'green' },
            ].map((e, i) => (
              <div key={i} style={{ padding: '8px 10px', border: '1px solid var(--line-soft)', borderRadius: 7 }}>
                <div className="row jb ac"><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{e.id}</span><Badge kind={e.k}>{e.s}</Badge></div>
                <div className="tiny" style={{ marginTop: 3, lineHeight: 1.4 }}>{e.d}</div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Tautan Modul">
          <div style={{ display: 'grid', gap: 7 }}>
            {[['Journal Entry Testing', 'flask'], ['Estimasi Akuntansi (SA 540)', 'target'], ['Pihak Berelasi (SA 550)', 'link2'], ['Representasi Tertulis (SA 580)', 'doc']].map((r, i) => {
              const Lic = I[r[1]];
              return (
              <button key={i} className="row jb ac" style={{ fontSize: 12, padding: '8px 10px', border: '1px solid var(--line-soft)', borderRadius: 7, cursor: 'pointer', background: 'transparent', width: '100%' }}>
                <span className="row ac gap8"><span style={{ color: 'var(--blue)' }}><Lic size={14} /></span>{r[0]}</span>
                <I.arrowRight size={14} style={{ color: 'var(--ink-4)' }} />
              </button>
            ); })}
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ---------------- Tab: Komunikasi ---------------- */
function F240Comms({ client }) {
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 340px', gap: 12, alignItems: 'start' }}>
      <div className="grid" style={{ gap: 12 }}>
        <Panel noBody>
          <div className="panel-h"><h3>Komunikasi Kecurangan (¶40–43)</h3><div style={{ flex: 1 }} /></div>
          <table className="dtbl">
            <thead><tr><th>Penerima</th><th>Hal yang Dikomunikasikan</th><th style={{ width: 60 }}>Ref</th><th style={{ width: 140 }}>Status</th></tr></thead>
            <tbody>
              {FRAUD_COMMS.map((c, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{c.to}<div className="tiny muted" style={{ fontWeight: 400 }}>{c.when}</div></td>
                  <td className="tiny" style={{ whiteSpace: 'normal', lineHeight: 1.4 }}>{c.what}</td>
                  <td className="mono tiny" style={{ color: 'var(--blue)', fontWeight: 700 }}>{c.ref}</td>
                  <td><Badge kind={c.status.startsWith('Dijadwalkan') ? 'blue' : 'gray'}>{c.status.split('—')[0].trim()}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="panel" style={{ margin: 12, padding: '10px 12px', background: 'var(--blue-050)', borderColor: 'var(--blue-100)' }}>
            <div className="row gap8" style={{ alignItems: 'flex-start' }}>
              <span style={{ color: 'var(--blue)', flex: '0 0 auto' }}><I.book size={15} /></span>
              <span style={{ fontSize: 11.5, lineHeight: 1.45 }}>Jika auditor mengidentifikasi fraud yang melibatkan <b>manajemen</b>, komunikasi langsung ditujukan ke <b>TCWG</b> secara tepat waktu (¶41). Kewajiban pelaporan kepada pihak eksternal dapat <b>mengalahkan</b> kewajiban kerahasiaan bila diatur hukum (¶43).</span>
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid" style={{ gap: 12 }}>
        <Panel title="Dampak terhadap Opini">
          <div style={{ display: 'grid', gap: 7 }}>
            {[
              { t: 'Tidak ada salah saji material akibat fraud teridentifikasi', ok: true },
              { t: 'Bukti cukup & tepat diperoleh atas risiko presumsi', ok: true },
              { t: 'Representasi tertulis fraud diperoleh (SA 580)', ok: true },
              { t: 'Eksepsi JET tuntas dijelaskan/diinvestigasi', ok: false },
            ].map((r, i) => (
              <div key={i} className="row gap8" style={{ fontSize: 11.5, alignItems: 'flex-start' }}>
                <span style={{ color: r.ok ? 'var(--green)' : 'var(--amber)', flex: '0 0 auto', marginTop: 1 }}>{r.ok ? <I.checkCircle size={15} /> : <I.clock size={15} />}</span>
                <span style={{ lineHeight: 1.4 }}>{r.t}</span>
              </div>
            ))}
          </div>
          <div className="divider" />
          <div className="panel" style={{ padding: '10px 12px', background: 'var(--amber-bg)', borderColor: 'transparent' }}>
            <div className="row ac gap8"><span style={{ color: 'var(--amber)' }}><I.clock size={15} /></span><span style={{ fontSize: 11.5, fontWeight: 600 }}>2 eksepsi JET dalam investigasi — simpulan opini menunggu penyelesaian.</span></div>
          </div>
        </Panel>
        <Panel title="Sign-off">
          <div style={{ display: 'grid', gap: 9 }}>
            {[
              { role: 'Disiapkan', who: 'Putri Maharani', when: '08 Mar', done: true },
              { role: 'Direview', who: 'Anindya Pramesti', when: '—', done: false },
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

Object.assign(window, { SA240View });
