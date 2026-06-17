/* ============================================================
   NeoSuite AMS — SA 580 · Representasi Tertulis
   Deep workpaper: daftar representasi wajib & spesifik (peta
   ke SA lain), draf surat representasi, serta evaluasi
   keandalan, kontradiksi bukti, & dampak pada opini.
   ============================================================ */
const { useState: useState580, useMemo: useMemo580 } = React;

/* ---- Daftar representasi ---- */
const REP_ITEMS = [
  { id: 'R-01', cat: 'Wajib', src: 'SA 580 ¶10', t: 'Manajemen telah memenuhi tanggung jawabnya atas penyusunan LK sesuai kerangka pelaporan, termasuk penyajian wajar.', got: true },
  { id: 'R-02', cat: 'Wajib', src: 'SA 580 ¶11', t: 'Seluruh informasi & akses yang relevan telah diberikan; seluruh transaksi telah dicatat & tercermin dalam LK.', got: true },
  { id: 'R-03', cat: 'Spesifik', src: 'SA 240 ¶39', t: 'Manajemen mengakui tanggung jawab atas desain & implementasi kontrol untuk mencegah/mendeteksi fraud; telah mengungkapkan hasil penilaian risiko fraud & dugaan fraud.', got: true },
  { id: 'R-04', cat: 'Spesifik', src: 'SA 250 ¶16', t: 'Seluruh instansi ketidakpatuhan/dugaan ketidakpatuhan terhadap peraturan perundang-undangan yang diketahui telah diungkapkan.', got: true },
  { id: 'R-05', cat: 'Spesifik', src: 'SA 450 ¶14', t: 'Dampak salah saji tidak dikoreksi tidak material, baik individual maupun agregat (daftar dilampirkan).', got: true },
  { id: 'R-06', cat: 'Spesifik', src: 'SA 540 ¶37', t: 'Metode, data & asumsi signifikan yang dipakai dalam membuat estimasi akuntansi adalah wajar.', got: true },
  { id: 'R-07', cat: 'Spesifik', src: 'SA 550 ¶26', t: 'Identitas pihak berelasi & seluruh transaksi/saldo dengan pihak berelasi telah diungkapkan secara memadai.', got: true },
  { id: 'R-08', cat: 'Spesifik', src: 'SA 560 ¶9', t: 'Seluruh peristiwa setelah tanggal LK yang memerlukan penyesuaian/pengungkapan telah disesuaikan/diungkapkan.', got: true },
  { id: 'R-09', cat: 'Spesifik', src: 'SA 570 ¶16', t: 'Rencana tindakan masa depan terkait kelangsungan usaha & kelayakannya telah diungkapkan kepada auditor.', got: false },
  { id: 'R-10', cat: 'Spesifik', src: 'SA 501 / 720', t: 'Litigasi & klaim telah diungkapkan; informasi lain dalam laporan tahunan konsisten dengan LK.', got: true },
];

/* ============================================================ */
function SA580View() {
  const firm = (typeof useFirm === 'function') ? useFirm() : null;
  const client = firm?.activeClient?.name || 'PT Sentosa Makmur Tbk';
  const [tab, setTab] = useState580('daftar');

  const got = REP_ITEMS.filter(r => r.got).length;
  const tabs = [
    { id: 'daftar', label: 'Daftar Representasi' },
    { id: 'surat', label: 'Surat Representasi' },
    { id: 'keandalan', label: 'Keandalan & Dampak' },
  ];

  return (
    <>
      <SubBar moduleId="sa580" right={
        <div className="row gap8 ac">
          <SACanonChips stdId="sa580" />
          <Badge kind={got === REP_ITEMS.length ? 'green' : 'amber'} dot>{got}/{REP_ITEMS.length} representasi</Badge>
          <Btn sm><I.send size={13} /> Kirim Draf ke Klien</Btn>
          <Btn sm variant="primary"><I.sparkle size={14} /> AI Assist</Btn>
        </div>
      } />
      <div className="view-scroll"><div className="view-pad">

        <Panel noBody style={{ marginBottom: 12 }}>
          <div style={{ padding: '13px 16px', display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ minWidth: 210 }}>
              <div className="tiny muted upper" style={{ marginBottom: 3 }}>Standar Audit 580</div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>Representasi Tertulis</div>
              <div className="tiny muted">{client} · ENG-2025-014</div>
            </div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Representasi</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5 }}>{REP_ITEMS.length} butir · {got} diperoleh</div></div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Penanda Tangan</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5 }}>Dirut & Direktur Keuangan</div></div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Tanggal Surat</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--blue)' }}>= tgl laporan auditor</div></div>
            <div style={{ flex: 1 }} />
            <div style={{ textAlign: 'right' }}>
              <div className="tiny muted upper" style={{ marginBottom: 3 }}>Sifat Bukti</div>
              <Badge kind="amber" dot>Pelengkap — bukan pengganti</Badge>
            </div>
          </div>
        </Panel>

        <SACanonicalStatus stdId="sa580" />

        <div style={{ marginBottom: 12 }}><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>

        {tab === 'daftar' && <F580List got={got} />}
        {tab === 'surat' && <F580Letter client={client} />}
        {tab === 'keandalan' && <F580Reliability />}

      </div></div>
    </>
  );
}

/* ---------------- Tab: Daftar Representasi ---------------- */
function F580List({ got }) {
  const [selId, setSelId] = useState580('R-06');
  const sel = REP_ITEMS.find(r => r.id === selId);
  const wajib = REP_ITEMS.filter(r => r.cat === 'Wajib').length;
  return (
    <div className="grid" style={{ gap: 12 }}>
      <Panel noBody>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 0 }}>
          {[
            { v: REP_ITEMS.length, l: 'Total Representasi' },
            { v: wajib, l: 'Wajib (¶10–11)', a: 'var(--blue)' },
            { v: REP_ITEMS.length - wajib, l: 'Spesifik (SA lain)', a: 'var(--purple)' },
            { v: REP_ITEMS.length - got, l: 'Belum Diperoleh', a: 'var(--amber)' },
          ].map((s, i) => (
            <div key={i} style={{ padding: '12px 16px', borderRight: i < 3 ? '1px solid var(--line-soft)' : 0 }}><Stat value={s.v} label={s.l} accent={s.a} /></div>
          ))}
        </div>
      </Panel>

      <div className="grid" style={{ gridTemplateColumns: '1fr 360px', gap: 12, alignItems: 'start' }}>
        <Panel noBody>
          <div className="panel-h"><h3>Daftar Representasi & Peta ke Standar</h3><div style={{ flex: 1 }} /><span className="tiny muted">Klik untuk rincian</span></div>
          <table className="dtbl">
            <thead><tr><th style={{ width: 48 }}>Ref</th><th>Representasi</th><th style={{ width: 92 }}>Kategori</th><th style={{ width: 60 }}>Status</th></tr></thead>
            <tbody>
              {REP_ITEMS.map(r => (
                <tr key={r.id} className={r.id === selId ? 'sel' : ''} onClick={() => setSelId(r.id)} style={{ cursor: 'pointer' }}>
                  <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{r.id}</td>
                  <td style={{ fontWeight: 500, whiteSpace: 'normal', lineHeight: 1.4 }}>{r.t}<div className="tiny muted" style={{ marginTop: 2 }}>{r.src}</div></td>
                  <td><Badge kind={r.cat === 'Wajib' ? 'blue' : 'purple'}>{r.cat}</Badge></td>
                  <td>{r.got ? <span style={{ color: 'var(--green)' }}><I.checkCircle size={16} /></span> : <span style={{ color: 'var(--amber)' }}><I.clock size={16} /></span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        {sel && (
          <Panel noBody>
            <div style={{ background: 'var(--surface-2)', padding: '11px 14px', borderBottom: '1px solid var(--line)' }}>
              <div className="row ac gap8"><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{sel.id}</span><Badge kind={sel.cat === 'Wajib' ? 'blue' : 'purple'}>{sel.cat}</Badge><span className="mono tiny" style={{ color: 'var(--ink-3)' }}>{sel.src}</span></div>
              <div style={{ fontWeight: 600, fontSize: 12.5, marginTop: 6, lineHeight: 1.45 }}>{sel.t}</div>
            </div>
            <div style={{ padding: 14 }}>
              <div className="row jb ac" style={{ marginBottom: 12 }}>
                <span className="tiny muted upper">Status Perolehan</span>
                {sel.got ? <Badge kind="green" dot>Diperoleh</Badge> : <Badge kind="amber" dot>Menunggu</Badge>}
              </div>
              <div className="tiny muted upper" style={{ marginBottom: 4 }}>Mengapa Diminta</div>
              <p style={{ margin: '0 0 12px', fontSize: 12, lineHeight: 1.5 }}>
                {sel.cat === 'Wajib'
                  ? 'Representasi dasar yang diwajibkan SA 580 untuk menegaskan pemenuhan premis audit oleh manajemen (tanggung jawab atas LK & penyediaan informasi).'
                  : 'Representasi spesifik yang diwajibkan SA terkait sebagai bukti pendukung; melengkapi—bukan menggantikan—bukti audit lain atas hal tersebut.'}
              </p>
              {!sel.got && (
                <div className="panel" style={{ padding: '9px 11px', background: 'var(--amber-bg)', borderColor: 'transparent' }}>
                  <div className="row ac gap8"><span style={{ color: 'var(--amber)' }}><I.alert size={15} /></span><span style={{ fontSize: 11.5, lineHeight: 1.4 }}>Belum diterima — diperlukan sebelum tanggal laporan auditor. Ditindaklanjuti bersama finalisasi going concern (SA 570).</span></div>
                </div>
              )}
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
}

/* ---------------- Tab: Surat Representasi (dokumen) ---------------- */
function F580Letter({ client }) {
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 300px', gap: 12, alignItems: 'start' }}>
      <Panel noBody>
        <div className="panel-h"><h3>Draf Surat Representasi Manajemen</h3><div style={{ flex: 1 }} /><Badge kind="blue">Kop Surat Klien</Badge></div>
        <div style={{ padding: 22, background: 'var(--surface-1, #fff)' }}>
          <div style={{ maxWidth: 640, margin: '0 auto', fontSize: 12.5, lineHeight: 1.65, color: 'var(--ink)' }}>
            <div className="row jb" style={{ marginBottom: 18, alignItems: 'flex-start' }}>
              <div style={{ fontWeight: 800, fontSize: 14 }}>{client}</div>
              <div className="tiny muted" style={{ textAlign: 'right' }}>Jl. Industri Raya No. 12<br />Cikarang, Jawa Barat</div>
            </div>
            <div className="tiny muted" style={{ marginBottom: 14 }}>[Tanggal — sama dengan tanggal laporan auditor independen]</div>
            <div style={{ marginBottom: 14 }}>Kepada Yth.<br /><b>Kantor Akuntan Publik Wijaya, Pramesti & Rekan</b><br />Auditor Independen</div>
            <p style={{ margin: '0 0 12px' }}>Surat representasi ini diberikan sehubungan dengan audit Saudara atas laporan keuangan {client} untuk tahun yang berakhir 31 Desember 2025, untuk tujuan menyatakan opini apakah laporan keuangan disajikan secara wajar, dalam semua hal yang material, sesuai dengan Standar Akuntansi Keuangan di Indonesia.</p>
            <p style={{ margin: '0 0 8px' }}>Kami menegaskan bahwa, sepanjang pengetahuan dan keyakinan terbaik kami:</p>

            <div style={{ fontWeight: 700, margin: '14px 0 6px' }}>Laporan Keuangan</div>
            {[
              'Kami telah memenuhi tanggung jawab atas penyusunan dan penyajian wajar laporan keuangan sesuai kerangka pelaporan keuangan yang berlaku.',
              'Asumsi signifikan yang kami gunakan dalam membuat estimasi akuntansi, termasuk yang diukur pada nilai wajar, adalah wajar (SA 540).',
              'Hubungan dan transaksi dengan pihak berelasi telah dicatat dan diungkapkan secara memadai (SA 550).',
              'Seluruh peristiwa setelah tanggal laporan keuangan yang memerlukan penyesuaian atau pengungkapan telah disesuaikan atau diungkapkan (SA 560).',
              'Dampak salah saji yang tidak dikoreksi tidak material, baik secara individual maupun agregat (SA 450 — daftar terlampir).',
            ].map((t, i) => (
              <div key={i} className="row gap8" style={{ alignItems: 'flex-start', margin: '6px 0' }}><span style={{ color: 'var(--blue)', flex: '0 0 auto', marginTop: 2 }}><I.check size={14} /></span><span>{t}</span></div>
            ))}

            <div style={{ fontWeight: 700, margin: '14px 0 6px' }}>Informasi yang Diberikan</div>
            {[
              'Kami telah memberikan akses kepada seluruh informasi yang relevan dan tanpa batas, serta seluruh transaksi telah dicatat dan tercermin dalam laporan keuangan.',
              'Kami mengakui tanggung jawab atas rancangan dan implementasi pengendalian internal untuk mencegah dan mendeteksi kecurangan, dan telah mengungkapkan hasil penilaian risiko kecurangan (SA 240).',
              'Kami telah mengungkapkan seluruh ketidakpatuhan atau dugaan ketidakpatuhan terhadap peraturan perundang-undangan (SA 250).',
              'Kami telah mengungkapkan seluruh litigasi dan klaim yang aktual maupun mungkin terjadi (SA 501).',
            ].map((t, i) => (
              <div key={i} className="row gap8" style={{ alignItems: 'flex-start', margin: '6px 0' }}><span style={{ color: 'var(--blue)', flex: '0 0 auto', marginTop: 2 }}><I.check size={14} /></span><span>{t}</span></div>
            ))}

            <div className="row" style={{ gap: 60, marginTop: 26 }}>
              <div><div style={{ borderTop: '1px solid var(--ink-3)', width: 180, paddingTop: 6 }} className="tiny">Direktur Utama</div></div>
              <div><div style={{ borderTop: '1px solid var(--ink-3)', width: 180, paddingTop: 6 }} className="tiny">Direktur Keuangan</div></div>
            </div>
          </div>
        </div>
      </Panel>

      <div className="grid" style={{ gap: 12 }}>
        <Panel title="Ketentuan Bentuk & Tanggal (¶14–15)">
          <div style={{ display: 'grid', gap: 8 }}>
            {[
              { t: 'Berbentuk surat ditujukan kepada auditor', ok: true },
              { t: 'Ditandatangani manajemen dengan tanggung jawab yang tepat', ok: true },
              { t: 'Bertanggal sedekat mungkin, namun tidak setelah, tanggal laporan auditor', ok: true },
              { t: 'Mencakup periode seluruh laporan keuangan yang dirujuk', ok: true },
            ].map((r, i) => (
              <div key={i} className="row gap8" style={{ fontSize: 11.5, alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--green)', flex: '0 0 auto', marginTop: 1 }}><I.checkCircle size={15} /></span>
                <span style={{ lineHeight: 1.4 }}>{r.t}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Tindakan">
          <div style={{ display: 'grid', gap: 7 }}>
            <Btn sm variant="primary" style={{ width: '100%' }}><I.send size={14} /> Kirim ke Portal Klien</Btn>
            <Btn sm style={{ width: '100%' }}><I.download size={14} /> Unduh PDF</Btn>
            <Btn sm style={{ width: '100%' }}><I.sparkle size={14} /> Sesuaikan dengan AI</Btn>
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ---------------- Tab: Keandalan & Dampak ---------------- */
function F580Reliability() {
  const scenarios = [
    { ic: 'flask', k: 'amber', t: 'Representasi tidak konsisten dengan bukti audit lain (¶18)', d: 'Lakukan prosedur untuk menyelesaikan masalah; pertimbangkan ulang keandalan representasi lain & integritas manajemen.', sts: 'Tidak ada inkonsistensi teridentifikasi', stsk: 'green' },
    { ic: 'shield', k: 'red', t: 'Keraguan atas kompetensi, integritas, etika manajemen (¶19)', d: 'Tentukan dampaknya terhadap keandalan representasi (lisan/tertulis) & bukti audit secara umum.', sts: 'Integritas manajemen tidak diragukan', stsk: 'green' },
    { ic: 'alert', k: 'red', t: 'Manajemen tidak memberikan representasi yang diminta (¶20)', d: 'Diskusikan dengan manajemen; evaluasi integritas & dampak pada opini — dapat berujung tidak menyatakan pendapat (¶20, A26).', sts: 'Seluruh representasi wajib diperoleh', stsk: 'green' },
  ];
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 340px', gap: 12, alignItems: 'start' }}>
      <div className="grid" style={{ gap: 12 }}>
        <Panel noBody>
          <div className="panel-h"><h3>Evaluasi Keandalan Representasi (¶18–20)</h3><div style={{ flex: 1 }} /></div>
          <div style={{ padding: '6px 14px 14px' }}>
            {scenarios.map((s, i) => {
              const Ic = I[s.ic];
              return (
                <div key={i} className="row gap12" style={{ padding: '12px 0', alignItems: 'flex-start', borderBottom: i < scenarios.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
                  <span style={{ flex: '0 0 34px', width: 34, height: 34, borderRadius: 8, display: 'grid', placeItems: 'center', background: `var(--${s.k}-bg)`, color: `var(--${s.k})` }}><Ic size={17} /></span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, lineHeight: 1.35 }}>{s.t}</div>
                    <div className="tiny muted" style={{ lineHeight: 1.45, margin: '3px 0 6px' }}>{s.d}</div>
                    <Badge kind={s.stsk}>{s.sts}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel noBody>
          <div className="panel-h"><h3>Hubungan dengan Bukti Audit Lain</h3><div style={{ flex: 1 }} /><Badge kind="amber">Pelengkap</Badge></div>
          <div className="panel" style={{ margin: 14, padding: '11px 13px', background: 'var(--amber-bg)', borderColor: 'transparent' }}>
            <div className="row gap8" style={{ alignItems: 'flex-start' }}>
              <span style={{ color: 'var(--amber)', flex: '0 0 auto' }}><I.book size={15} /></span>
              <span style={{ fontSize: 11.5, lineHeight: 1.5 }}>Representasi tertulis adalah <b>bukti audit yang perlu</b>, namun <b>tidak memberikan bukti yang cukup & tepat</b> dengan sendirinya. Diperolehnya representasi <b>tidak memengaruhi</b> sifat/luas bukti audit lain atas tanggung jawab manajemen (¶4).</span>
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid" style={{ gap: 12 }}>
        <Panel title="Dampak terhadap Opini">
          <div style={{ display: 'grid', gap: 7 }}>
            {[
              { t: 'Representasi wajib (¶10–11) diperoleh', ok: true },
              { t: 'Tidak ada kontradiksi dengan bukti lain', ok: true },
              { t: 'Integritas manajemen tidak diragukan', ok: true },
              { t: 'Representasi going concern (SA 570) menunggu', ok: false },
            ].map((r, i) => (
              <div key={i} className="row gap8" style={{ fontSize: 11.5, alignItems: 'flex-start' }}>
                <span style={{ color: r.ok ? 'var(--green)' : 'var(--amber)', flex: '0 0 auto', marginTop: 1 }}>{r.ok ? <I.checkCircle size={15} /> : <I.clock size={15} />}</span>
                <span style={{ lineHeight: 1.4 }}>{r.t}</span>
              </div>
            ))}
          </div>
          <div className="divider" />
          <div className="panel" style={{ padding: '10px 12px', background: 'var(--surface-2)', borderColor: 'transparent' }}>
            <div className="row ac gap8"><span style={{ color: 'var(--blue)' }}><I.gavel size={15} /></span><span style={{ fontSize: 11.5, fontWeight: 600 }}>Tidak ada dampak modifikasi — menunggu 1 representasi final sebelum simpulan opini.</span></div>
          </div>
        </Panel>
        <SASignoffMini stdId="sa580" />
      </div>
    </div>
  );
}

Object.assign(window, { SA580View });
