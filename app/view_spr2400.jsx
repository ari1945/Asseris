/* ============================================================
   NeoSuite AMS — SPR 2400 · Perikatan Reviu atas LK Historis
   Deep methodology: kontinum keyakinan (audit vs reviu vs
   kompilasi), desain prosedur inquiry & analitis, pemicu
   prosedur tambahan, materialitas & kecukupan bukti, serta
   bentuk simpulan keyakinan negatif. Tertaut ke perikatan
   reviu langsung (REV-2025-022).
   ============================================================ */
const { useState: useState2400 } = React;

/* ---- Kontinum tingkat keyakinan ---- */
const ASSUR_CONTINUUM = [
  { k: 'Audit (SA 200+)', level: 'Memadai', pct: 95, color: 'blue', proc: 'Risk assessment, uji pengendalian, prosedur substantif menyeluruh', concl: 'Opini positif ("menyajikan secara wajar")' },
  { k: 'Reviu (SPR 2400)', level: 'Terbatas', pct: 60, color: 'teal', proc: 'Terutama inquiry & prosedur analitis', concl: 'Simpulan negatif ("tidak ada hal yang menjadi perhatian")', here: true },
  { k: 'Kompilasi (SPSJL 4410)', level: 'Tanpa', pct: 8, color: 'gray', proc: 'Penyusunan informasi tanpa verifikasi', concl: 'Tanpa simpulan asurans' },
];

/* ---- Prosedur reviu (desain) ---- */
const REV_PROC = [
  { area: 'Pemahaman Entitas', ref: '¶45', type: 'Inquiry', d: 'Bisnis, sistem akuntansi, & kebijakan untuk merancang prosedur reviu.', risk: 'Dasar' },
  { area: 'Prosedur Analitis', ref: '¶47', type: 'Analitis', d: 'Bandingkan saldo/rasio dengan ekspektasi, tren, & data industri.', risk: 'Tinggi' },
  { area: 'Inquiry Manajemen', ref: '¶48', type: 'Inquiry', d: 'Permintaan keterangan atas pos signifikan, estimasi, & kebijakan.', risk: 'Tinggi' },
  { area: 'Pihak Berelasi', ref: '¶49', type: 'Inquiry', d: 'Identifikasi & evaluasi transaksi dengan pihak berelasi.', risk: 'Sedang' },
  { area: 'Kelangsungan Usaha', ref: '¶52', type: 'Inquiry', d: 'Inquiry rencana manajemen bila terdapat indikasi keraguan.', risk: 'Sedang' },
  { area: 'Peristiwa Kemudian', ref: '¶57', type: 'Inquiry', d: 'Inquiry peristiwa yang memerlukan penyesuaian/pengungkapan.', risk: 'Sedang' },
];

/* ---- Pemicu prosedur tambahan ---- */
const ADD_TRIGGERS = [
  { t: 'Prosedur menemukan kemungkinan salah saji material', ref: '¶57', action: 'Rancang & laksanakan prosedur tambahan untuk memperoleh bukti memadai.' },
  { t: 'Jawaban inquiry tidak konsisten / tidak memuaskan', ref: '¶50', action: 'Evaluasi respons; tindak lanjuti dengan prosedur lain.' },
  { t: 'Fluktuasi analitis signifikan tanpa penjelasan wajar', ref: '¶56', action: 'Inquiry lanjutan & evaluasi bukti pendukung.' },
];

/* ============================================================ */
function SPR2400View() {
  const [tab, setTab] = useState2400('kontinum');
  const nav = (typeof useNav === 'function') ? useNav() : () => {};

  const tabs = [
    { id: 'kontinum', label: 'Kontinum Keyakinan' },
    { id: 'prosedur', label: 'Prosedur Reviu' },
    { id: 'bukti', label: 'Materialitas & Bukti' },
    { id: 'simpulan', label: 'Bentuk Simpulan' },
  ];

  return (
    <>
      <SubBar moduleId="spr2400" right={
        <div className="row gap8 ac">
          <Badge kind="teal" dot>Keyakinan Terbatas</Badge>
          <Btn sm onClick={() => nav('review2400')}><I.search2 size={13} /> Perikatan Langsung</Btn>
          <Btn sm variant="primary"><I.sparkle size={14} /> AI Assist</Btn>
        </div>
      } />
      <div className="view-scroll"><div className="view-pad">

        <Panel noBody style={{ marginBottom: 12 }}>
          <div style={{ padding: '13px 16px', display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ minWidth: 230 }}>
              <div className="tiny muted upper" style={{ marginBottom: 3 }}>Standar Perikatan Reviu 2400</div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>Reviu atas Laporan Keuangan Historis</div>
              <div className="tiny muted">Perikatan asurans — keyakinan terbatas</div>
            </div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Sifat Keyakinan</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--teal)' }}>Terbatas (negatif)</div></div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Prosedur Utama</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5 }}>Inquiry & Analitis</div></div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Bentuk Opini</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5 }}>Simpulan negatif</div></div>
            <div style={{ flex: 1 }} />
            <div style={{ textAlign: 'right' }}>
              <div className="tiny muted upper" style={{ marginBottom: 3 }}>Perikatan Aktif</div>
              <Badge kind="blue">REV-2025-022</Badge>
            </div>
          </div>
        </Panel>

        <div style={{ marginBottom: 12 }}><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>

        {tab === 'kontinum' && <F2400Continuum />}
        {tab === 'prosedur' && <F2400Proc />}
        {tab === 'bukti' && <F2400Evidence />}
        {tab === 'simpulan' && <F2400Concl />}

      </div></div>
    </>
  );
}

/* ---------------- Tab: Kontinum Keyakinan ---------------- */
function F2400Continuum() {
  return (
    <div className="grid" style={{ gap: 12 }}>
      <Panel noBody>
        <div className="panel-h"><h3>Kontinum Tingkat Keyakinan Jasa</h3><div style={{ flex: 1 }} /><Badge kind="teal">SPR 2400 = keyakinan terbatas</Badge></div>
        <div style={{ padding: 16 }}>
          {/* bar spektrum */}
          <div style={{ position: 'relative', height: 12, borderRadius: 6, background: 'linear-gradient(90deg,var(--surface-3),var(--teal),var(--blue))', marginBottom: 22 }}>
            <div style={{ position: 'absolute', left: '60%', top: -5, bottom: -5, width: 2, background: 'var(--navy)' }} />
            <div style={{ position: 'absolute', left: '60%', top: -22, transform: 'translateX(-50%)' }}><span className="chip tiny" style={{ background: 'var(--teal-bg)', color: 'var(--teal)', fontWeight: 700 }}>Reviu di sini</span></div>
          </div>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
            {ASSUR_CONTINUUM.map((c, i) => (
              <div key={i} className="panel" style={{ padding: 13, boxShadow: 'none', borderColor: c.here ? 'var(--teal)' : 'var(--line)', borderWidth: c.here ? 2 : 1, background: c.here ? 'var(--teal-bg)' : 'transparent' }}>
                <div className="row jb ac"><div style={{ fontSize: 12.5, fontWeight: 700 }}>{c.k}</div><Badge kind={c.color}>{c.level}</Badge></div>
                <div style={{ margin: '10px 0 6px', height: 6, borderRadius: 3, background: 'var(--surface-3)' }}><div style={{ width: c.pct + '%', height: '100%', borderRadius: 3, background: `var(--${c.color === 'gray' ? 'ink-4' : c.color})` }} /></div>
                <div className="tiny muted" style={{ lineHeight: 1.45, marginBottom: 8 }}>{c.proc}</div>
                <div className="chip tiny" style={{ background: 'var(--surface-2)', whiteSpace: 'normal', height: 'auto', lineHeight: 1.4, padding: '4px 8px' }}>{c.concl}</div>
              </div>
            ))}
          </div>
        </div>
      </Panel>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }}>
        <Panel noBody>
          <div className="panel-h"><h3>Audit vs Reviu — Perbandingan</h3></div>
          <table className="dtbl">
            <thead><tr><th>Aspek</th><th>Audit (SA)</th><th>Reviu (SPR 2400)</th></tr></thead>
            <tbody>
              {[
                ['Tingkat keyakinan', 'Memadai (tinggi)', 'Terbatas'],
                ['Prosedur utama', 'Risk assessment + substantif', 'Inquiry & analitis'],
                ['Uji pengendalian', 'Ya, bila diandalkan', 'Tidak'],
                ['Konfirmasi & observasi fisik', 'Umumnya ya', 'Tidak rutin'],
                ['Bentuk simpulan', 'Positif', 'Negatif'],
              ].map((r, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{r[0]}</td>
                  <td className="tiny">{r[1]}</td>
                  <td className="tiny" style={{ color: 'var(--teal)', fontWeight: 600 }}>{r[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <Panel noBody>
          <div className="panel-h"><h3>Prasyarat Perikatan Reviu (¶29–37)</h3></div>
          <div style={{ padding: '8px 14px 14px', display: 'grid', gap: 8 }}>
            {[
              'Kerangka pelaporan keuangan dapat diterima (mis. SAK / SAK EP)',
              'Persetujuan atas premis tanggung jawab manajemen',
              'Independensi & etika terpenuhi (SPM 1 / kode etik)',
              'Tidak ada pembatasan lingkup yang menghalangi simpulan',
            ].map((t, i) => (
              <div key={i} className="row gap8" style={{ fontSize: 12, alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--green)', flex: '0 0 auto', marginTop: 1 }}><I.checkCircle size={15} /></span>
                <span style={{ lineHeight: 1.45 }}>{t}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ---------------- Tab: Prosedur Reviu ---------------- */
function F2400Proc() {
  const tk = t => t === 'Analitis' ? 'purple' : 'teal';
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 340px', gap: 12, alignItems: 'start' }}>
      <Panel noBody>
        <div className="panel-h"><h3>Desain Prosedur Reviu (¶45–57)</h3><div style={{ flex: 1 }} /><span className="tiny muted">{REV_PROC.length} area</span></div>
        <table className="dtbl">
          <thead><tr><th>Area Prosedur</th><th style={{ width: 86 }}>Jenis</th><th style={{ width: 80 }}>Risiko</th><th style={{ width: 54 }}>Ref</th></tr></thead>
          <tbody>
            {REV_PROC.map((p, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 600, whiteSpace: 'normal', lineHeight: 1.35 }}>{p.area}<div className="tiny muted" style={{ fontWeight: 400, marginTop: 2 }}>{p.d}</div></td>
                <td><Badge kind={tk(p.type)}>{p.type}</Badge></td>
                <td><Badge kind={p.risk === 'Tinggi' ? 'red' : p.risk === 'Sedang' ? 'amber' : 'gray'}>{p.risk}</Badge></td>
                <td className="mono tiny" style={{ color: 'var(--blue)', fontWeight: 700 }}>{p.ref}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="panel" style={{ margin: 12, padding: '10px 12px', background: 'var(--teal-bg)', borderColor: 'transparent' }}>
          <div className="row gap8" style={{ alignItems: 'flex-start' }}>
            <span style={{ color: 'var(--teal)', flex: '0 0 auto' }}><I.book size={15} /></span>
            <span style={{ fontSize: 11.5, lineHeight: 1.45 }}>Reviu <b>terutama</b> terdiri dari <b>inquiry & prosedur analitis</b> — bukan pengujian rinci. Prosedur dirancang berdasarkan pemahaman entitas & area berisiko salah saji material (¶46–47).</span>
          </div>
        </div>
      </Panel>

      <div className="grid" style={{ gap: 12 }}>
        <Panel title="Pemicu Prosedur Tambahan (¶57)">
          <div style={{ display: 'grid', gap: 8 }}>
            {ADD_TRIGGERS.map((t, i) => (
              <div key={i} className="panel" style={{ padding: '9px 11px', boxShadow: 'none', borderLeft: '3px solid var(--amber)' }}>
                <div className="row jb ac"><div style={{ fontSize: 11.5, fontWeight: 700, lineHeight: 1.35 }}>{t.t}</div><span className="mono tiny" style={{ color: 'var(--amber)', fontWeight: 700, flex: '0 0 auto', marginLeft: 6 }}>{t.ref}</span></div>
                <div className="tiny muted" style={{ marginTop: 4, lineHeight: 1.4 }}>{t.action}</div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Lihat di Perikatan Langsung">
          <NavRow2400 to="review2400" label="REV-2025-022 · Analitis & Inquiry" />
          <p className="tiny muted" style={{ margin: '8px 0 0', lineHeight: 1.5 }}>Prosedur analitis & inquiry yang dilaksanakan beserta tindak lanjutnya tersedia pada workspace perikatan reviu.</p>
        </Panel>
      </div>
    </div>
  );
}

function NavRow2400({ to, label }) {
  const nav = (typeof useNav === 'function') ? useNav() : () => {};
  return (
    <div onClick={() => nav(to)} className="row jb ac" style={{ fontSize: 12, padding: '8px 10px', border: '1px solid var(--line-soft)', borderRadius: 7, cursor: 'pointer' }}>
      <span className="row ac gap8"><span style={{ color: 'var(--teal)' }}><I.search2 size={14} /></span>{label}</span>
      <I.arrowRight size={14} style={{ color: 'var(--ink-4)' }} />
    </div>
  );
}

/* ---------------- Tab: Materialitas & Bukti ---------------- */
function F2400Evidence() {
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 340px', gap: 12, alignItems: 'start' }}>
      <div className="grid" style={{ gap: 12 }}>
        <Panel noBody>
          <div className="panel-h"><h3>Materialitas dalam Reviu (¶43–44)</h3></div>
          <div style={{ padding: 14 }}>
            <p style={{ margin: '0 0 12px', fontSize: 12, lineHeight: 1.55 }}>Konsep materialitas diterapkan serupa dengan audit — namun digunakan untuk merancang prosedur reviu & mengevaluasi apakah laporan keuangan secara keseluruhan bebas dari salah saji material.</p>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
              <KvBox label="Materialitas (Rp jt)" v="900" accent="var(--navy)" />
              <KvBox label="Tolok Ukur" v="1% pendapatan" accent="var(--teal)" />
              <KvBox label="Mat. Pelaksanaan" v="675" />
            </div>
          </div>
        </Panel>

        <Panel noBody>
          <div className="panel-h"><h3>Kecukupan Bukti untuk Keyakinan Terbatas (¶55)</h3></div>
          <div style={{ padding: '8px 14px 14px', display: 'grid', gap: 8 }}>
            {[
              ['Bukti memadai untuk menyimpulkan tidak ada salah saji material yang teridentifikasi', true],
              ['Prosedur analitis & inquiry menghasilkan dasar simpulan yang masuk akal', true],
              ['Inkonsistensi/anomali ditindaklanjuti hingga tuntas', true],
              ['Representasi tertulis manajemen diperoleh (¶61)', false],
            ].map((r, i) => (
              <div key={i} className="row gap10" style={{ alignItems: 'flex-start' }}>
                <span style={{ flex: '0 0 auto', marginTop: 1, color: r[1] ? 'var(--green)' : 'var(--amber)' }}>{r[1] ? <I.checkCircle size={16} /> : <I.clock size={16} />}</span>
                <span style={{ fontSize: 12.5, lineHeight: 1.45 }}>{r[0]}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="Asurans Terbatas — Apa Artinya">
        <p className="tiny muted" style={{ margin: '0 0 10px', lineHeight: 1.55 }}>Tingkat risiko perikatan direduksi ke level yang <b>dapat diterima dalam keadaan perikatan</b>, namun lebih tinggi dibanding audit — menjadi dasar simpulan yang dinyatakan dalam <b>bentuk negatif</b>.</p>
        <div className="panel" style={{ padding: '10px 12px', background: 'var(--teal-bg)', borderColor: 'transparent' }}>
          <div className="tiny" style={{ lineHeight: 1.5, fontStyle: 'italic', color: 'var(--teal)' }}>"Tidak ada hal yang menjadi perhatian kami yang menyebabkan kami percaya bahwa laporan keuangan tidak disajikan secara wajar…"</div>
        </div>
        <div style={{ marginTop: 12, display: 'grid', gap: 7 }}>
          <RowKv label="Risiko perikatan" v="Lebih tinggi dari audit" />
          <RowKv label="Lingkup prosedur" v="Lebih sempit" />
          <RowKv label="Dasar simpulan" v="Masuk akal (negatif)" />
        </div>
      </Panel>
    </div>
  );
}

/* ---------------- Tab: Bentuk Simpulan ---------------- */
const CONCL_2400 = [
  { k: 'green', l: 'Tanpa Modifikasian', ref: '¶86', d: 'Tidak ada hal yang menjadi perhatian yang menyebabkan auditor percaya LK tidak disajikan secara wajar.' },
  { k: 'amber', l: 'Dengan Pengecualian', ref: '¶94', d: 'Dampak hal tertentu material tetapi tidak pervasif terhadap laporan keuangan.' },
  { k: 'red', l: 'Merugikan (Adverse)', ref: '¶95', d: 'Dampak salah saji material & pervasif — LK tidak disajikan secara wajar.' },
  { k: 'gray', l: 'Tidak Menyatakan Simpulan', ref: '¶96', d: 'Pembatasan lingkup material & pervasif; bukti tidak cukup untuk menyimpulkan.' },
];

function F2400Concl() {
  const [sel, setSel] = useState2400(0);
  const c = CONCL_2400[sel];
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 1.3fr', gap: 12, alignItems: 'start' }}>
      <Panel noBody>
        <div className="panel-h"><h3>Bentuk Simpulan Reviu</h3><div style={{ flex: 1 }} /><Badge kind="teal">Keyakinan negatif</Badge></div>
        <div style={{ padding: 14, display: 'grid', gap: 8 }}>
          {CONCL_2400.map((x, i) => (
            <div key={i} onClick={() => setSel(i)} className="panel" style={{ padding: '11px 13px', cursor: 'pointer', boxShadow: 'none', borderColor: sel === i ? `var(--${x.k})` : 'var(--line)', borderWidth: sel === i ? 2 : 1, background: sel === i ? `var(--${x.k}-bg)` : 'transparent' }}>
              <div className="row jb ac">
                <div className="row ac gap8"><span style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid var(--${x.k})`, background: sel === i ? `var(--${x.k})` : 'transparent', flex: '0 0 14px' }} /><span style={{ fontSize: 12.5, fontWeight: 700 }}>{x.l}</span></div>
                <span className="mono tiny" style={{ color: `var(--${x.k})`, fontWeight: 700 }}>{x.ref}</span>
              </div>
              <div className="tiny muted" style={{ marginTop: 5, lineHeight: 1.45, paddingLeft: 22 }}>{x.d}</div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel noBody>
        <div className="panel-h"><h3>Elemen Laporan Reviu (¶86)</h3><div style={{ flex: 1 }} /><Badge kind={c.k}>{c.l}</Badge></div>
        <div style={{ padding: 18 }}>
          <div className="doc-paper" style={{ background: '#fff', padding: '32px 36px', boxShadow: 'var(--shadow)', fontSize: 11.5, lineHeight: 1.7, color: '#283b46' }}>
            <div style={{ fontWeight: 800, fontSize: 13, color: '#0c2430', textAlign: 'center', marginBottom: 4 }}>LAPORAN REVIU PRAKTISI INDEPENDEN</div>
            <div className="tiny" style={{ textAlign: 'center', color: '#7a8893', marginBottom: 16 }}>Berdasarkan Standar Perikatan Reviu (SPR) 2400</div>
            <div style={{ fontWeight: 700, color: '#0c2430', margin: '0 0 4px' }}>Tanggung Jawab Praktisi</div>
            <p style={{ margin: '0 0 10px' }}>Reviu dilaksanakan sesuai SPR 2400 — terutama terdiri dari inquiry & prosedur analitis. Lingkupnya jauh lebih sempit dibanding audit sehingga <b>tidak menyatakan opini audit</b>.</p>
            <div style={{ fontWeight: 700, color: '#0c2430', margin: '12px 0 4px' }}>Simpulan — {c.l}</div>
            <p style={{ margin: 0 }}>{sel === 0
              ? 'Berdasarkan reviu kami, tidak ada hal yang menjadi perhatian kami yang menyebabkan kami percaya bahwa laporan keuangan tidak menyajikan secara wajar, dalam semua hal yang material, sesuai dengan SAK.'
              : sel === 1
              ? 'Kecuali untuk dampak hal yang diuraikan dalam paragraf Basis, tidak ada hal yang menjadi perhatian kami yang menyebabkan kami percaya laporan keuangan tidak disajikan secara wajar sesuai SAK.'
              : sel === 2
              ? 'Berdasarkan reviu kami, karena signifikansi hal yang diuraikan, laporan keuangan tidak menyajikan secara wajar sesuai dengan SAK.'
              : 'Karena signifikansi hal yang diuraikan, kami tidak memperoleh bukti yang cukup sebagai dasar simpulan reviu; oleh karena itu kami tidak menyatakan simpulan.'}</p>
            <div style={{ marginTop: 22, paddingTop: 10, borderTop: '1px solid #e0e5ea', fontSize: 11 }}><b>Sari Dewanti, CPA</b> · Akuntan Publik<br /><span className="tiny" style={{ color: '#7a8893' }}>Jakarta, {new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</span></div>
          </div>
        </div>
      </Panel>
    </div>
  );
}

Object.assign(window, { SPR2400View });
