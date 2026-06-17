/* ============================================================
   NeoSuite AMS — PSAK 48/57 · Penurunan Nilai Aset & Provisi
   ------------------------------------------------------------
   Dua standar berpasangan dalam satu modul:
     · PSAK 48 (IAS 36) — Penurunan Nilai Aset
     · PSAK 57 (IAS 37) — Provisi, Liabilitas & Aset Kontinjensi
   Seluruh angka DITARIK dari satu sumber kebenaran:
     · AMS_CANON.psak48(wtb) — nilai tercatat UPK ditarik dari modul
       sumber ber-WTB (PSAK 16 aset tetap, PSAK 19 takberwujud,
       PSAK 73 ROU) + goodwill akuisisi; jumlah terpulihkan via DCF
       nilai pakai, headroom & sensitivitas.
     · AMS_CANON.psak57(wtb) — register provisi & klaim (SUMBER yang
       SAMA dibaca SA 501 litigasi & SA 540 estimasi garansi);
       klasifikasi diturunkan dari pohon keputusan ¶14/27/86,
       roll-forward ¶84, dampak pajak tangguhan → PSAK 46.
   ============================================================ */
const { useState: useStateP48, useMemo: useMemoP48 } = React;

/* ---- ketentuan kunci PSAK 48 ---- */
const P48_KEY = [
  { k: 'Jumlah terpulihkan', v: 'Tertinggi dari', note: 'Nilai wajar dikurangi biaya pelepasan ATAU nilai pakai (value-in-use) — mana yang lebih tinggi (¶18).' },
  { k: 'Rugi penurunan nilai', v: 'Tercatat > terpulihkan', note: 'Diakui bila nilai tercatat melampaui jumlah terpulihkan; segera dibebankan ke laba rugi (¶59).' },
  { k: 'Goodwill & tak-terbatas', v: 'Uji tahunan', note: 'Goodwill & aset takberwujud umur tak-terbatas diuji minimal setahun sekali, terlepas indikator (¶10, ¶90).' },
  { k: 'Pembalikan (¶110-123)', v: 'Kecuali goodwill', note: 'Rugi non-goodwill dapat dipulihkan bila estimasi berubah; rugi goodwill TIDAK boleh dibalik (¶124).' },
];

/* ---- ketentuan kunci PSAK 57 ---- */
const P57_KEY = [
  { k: 'Pengakuan provisi (¶14)', v: '3 syarat kumulatif', note: 'Kewajiban kini (hukum/konstruktif) akibat peristiwa lalu · arus keluar besar kemungkinan · estimasi andal.' },
  { k: 'Liabilitas kontinjensi', v: 'Diungkap, tak diakui', note: 'Kewajiban mungkin, atau kini namun arus keluar tidak besar kemungkinan / tak terukur andal (¶27-28).' },
  { k: 'Aset kontinjensi (¶31-35)', v: 'Tidak diakui', note: 'Tidak diakui; diungkap bila arus masuk manfaat besar kemungkinan (probable).' },
  { k: 'Pengukuran (¶36-52)', v: 'Estimasi terbaik', note: 'Estimasi terbaik pengeluaran penyelesaian; didiskontokan bila nilai waktu uang material.' },
];

/* ---- prosedur audit (SA 540 estimasi · SA 501 litigasi · SA 500 pakar) ---- */
const P48_PROC = [
  { ref: 'SA 540 ¶13', t: 'Pahami proses manajemen mengidentifikasi indikator penurunan nilai & menyusun uji UPK' },
  { ref: 'PSAK 48 ¶12', t: 'Evaluasi kelengkapan asesmen indikator eksternal & internal pada tanggal pelaporan' },
  { ref: 'SA 540 ¶15', t: 'Kembangkan ekspektasi independen atas jumlah terpulihkan — re-perform DCF nilai pakai' },
  { ref: 'PSAK 48 ¶33', t: 'Uji kewajaran proyeksi arus kas: dasar anggaran, horizon ≤ 5 th, tingkat pertumbuhan terminal' },
  { ref: 'PSAK 48 ¶55', t: 'Uji ketepatan tingkat diskonto (WACC) pra-pajak — bandingkan dengan biaya modal pasar' },
  { ref: 'PSAK 48 ¶134f', t: 'Lakukan analisis sensitivitas asumsi utama (WACC, pertumbuhan, arus kas) terhadap headroom' },
  { ref: 'SA 501 ¶9', t: 'Identifikasi litigasi & klaim: inquiry manajemen, telaah risalah TCWG & beban jasa hukum' },
  { ref: 'SA 501 ¶10', t: 'Kirim surat permintaan keterangan ke penasihat hukum eksternal; tindak lanjut non-respons' },
  { ref: 'PSAK 57 ¶14', t: 'Evaluasi klasifikasi tiap perkara: provisi diakui vs kontinjensi diungkap vs remote' },
  { ref: 'PSAK 57 ¶36', t: 'Uji pengukuran provisi: estimasi terbaik, kebutuhan diskonto & roll-forward (¶84)' },
  { ref: 'PSAK 48 ¶126', t: 'Telaah kecukupan pengungkapan CALK — rugi, UPK, asumsi utama & sensitivitas' },
  { ref: 'SA 230', t: 'Dokumentasikan dasar kesimpulan penurunan nilai & provisi (WP P-48/57)' },
];

/* ---- keterkaitan kertas kerja (lineage dua arah) ---- */
const P48_UPSTREAM = [
  { id: 'psak16', ic: 'building', lbl: 'PSAK 16 · Aset Tetap',        rel: 'Nilai tercatat neto aset tetap → komponen UPK Operasi Inti' },
  { id: 'psak19', ic: 'sparkle',  lbl: 'PSAK 19 · Aset Takberwujud',  rel: 'Takberwujud terbatas + lisensi tak-terbatas (uji tahunan ¶10)' },
  { id: 'psak73', ic: 'building', lbl: 'PSAK 73 · Sewa',              rel: 'Aset hak-guna (ROU) → komponen nilai tercatat UPK' },
  { id: 'psak22', ic: 'columns',  lbl: 'PSAK 22 · Kombinasi Bisnis',  rel: 'Goodwill akuisisi Rp 6.800 jt (alokasi PPA) → UPK diuji tahunan (¶90)' },
  { id: 'sa540',  ic: 'target',   lbl: 'SA 540 · Estimasi',           rel: 'Estimasi garansi & uji goodwill (E-03, E-05) — register provisi & rentang' },
  { id: 'sa501',  ic: 'gavel',    lbl: 'SA 501 · Litigasi & Klaim',   rel: 'Register litigasi yang SAMA → klasifikasi provisi/kontinjensi' },
];
const P48_DOWNSTREAM = [
  { id: 'psak46', ic: 'receipt', lbl: 'PSAK 46 · Pajak Tangguhan',   rel: 'Provisi deductible saat realisasi → beda temporer (aset pajak tangguhan)' },
  { id: 'fsgen',  ic: 'report',  lbl: 'FS Generator',                rel: 'Rugi penurunan nilai, provisi & pengungkapan kontinjensi → CALK' },
  { id: 'sa701',  ic: 'flag',    lbl: 'SA 701 · Hal Audit Utama',    rel: 'Uji penurunan goodwill (headroom tipis) → kandidat KAM-3' },
  { id: 'sad',    ic: 'scale',   lbl: 'SAD Ledger (SA 450)',         rel: 'Selisih estimasi terpulihkan / provisi → akumulasi salah saji' },
];

function P48Card({ value, label, sub, accent }) {
  return (
    <div className="panel" style={{ padding: '12px 14px', display: 'grid', gap: 2 }}>
      <div className="mono" style={{ fontSize: 21, fontWeight: 700, color: accent || 'var(--navy)', lineHeight: 1.05 }}>{value}</div>
      <div className="tiny muted" style={{ fontWeight: 600 }}>{label}</div>
      {sub && <div className="tiny" style={{ color: 'var(--ink-4)' }}>{sub}</div>}
    </div>
  );
}

function P48Kv({ label, v, strong, accent }) {
  return (
    <div className="row jb ac">
      <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>{label}</span>
      <span className="mono" style={{ fontWeight: strong ? 700 : 600, fontSize: strong ? 14 : 12.5, color: accent || (strong ? 'var(--navy)' : 'inherit') }}>{v}</span>
    </div>
  );
}

function PSAK48View() {
  const { fmt } = window.AMS;
  const firm = (typeof useFirm === 'function') ? useFirm() : {};
  const audit = (typeof useAudit === 'function') ? useAudit() : {};
  const nav = (typeof useNav === 'function') ? useNav() : (() => {});
  const loader = window.loadLS || ((k, d) => d);

  /* ——— SUMBER KEBENARAN ——— */
  const wtb = (audit && audit.wtb && audit.wtb.length) ? audit.wtb : ((window.AMS && window.AMS.WTB) || []);
  const canon = window.AMS_CANON;
  const p48 = useMemoP48(() => canon.psak48(wtb), [wtb]);
  const p57 = useMemoP48(() => canon.psak57(wtb), [wtb]);

  const [tab, setTab] = useStateP48(() => loader('ams.psak48.tab', 'impair'));
  const [done, setDone] = useStateP48(() => loader('ams.psak48.done', {}));
  const [selProv, setSelProv] = useStateP48(() => loader('ams.psak48.selprov', 'LIT-02'));

  React.useEffect(() => { try { localStorage.setItem('ams.psak48.tab', JSON.stringify(tab)); } catch (e) {} }, [tab]);
  React.useEffect(() => { try { localStorage.setItem('ams.psak48.done', JSON.stringify(done)); } catch (e) {} }, [done]);
  React.useEffect(() => { try { localStorage.setItem('ams.psak48.selprov', JSON.stringify(selProv)); } catch (e) {} }, [selProv]);

  const rp = (x) => 'Rp ' + fmt(Math.round(x));
  const toggle = (id) => setDone(m => ({ ...m, [id]: !m[id] }));
  const doneCount = P48_PROC.filter((p, i) => done[p.ref + i]).length;

  const client = firm.activeClient || { name: 'PT Sentosa Makmur Tbk' };
  const impaired = p48.totalImpair > 0;
  const headKind = p48.headroomPct < 0 ? 'red' : p48.headroomPct < 0.08 ? 'amber' : 'green';

  const TABS = [
    { id: 'impair', label: 'Penurunan Nilai · PSAK 48' },
    { id: 'provisi', label: 'Provisi & Kontinjensi · PSAK 57' },
    { id: 'rekonsiliasi', label: 'Rekonsiliasi' },
    { id: 'audit', label: 'Audit · SA 540/501' },
  ];

  const sel = p57.items.find(i => i.id === selProv) || p57.items[0];
  const provSegs = [
    { label: 'Provisi diakui', value: p57.provisionTotal, color: '#b3261e' },
    { label: 'Kontinjensi', value: p57.contingentTotal, color: '#c79a1e' },
    { label: 'Remote', value: p57.remoteTotal, color: '#9aa3ad' },
  ];

  return (
    <>
      <SubBar moduleId="psak48" right={
        <div className="row gap8 ac">
          <Badge kind="blue">PSAK 48 · IAS 36</Badge>
          <Badge kind="blue">PSAK 57 · IAS 37</Badge>
          <Btn sm onClick={() => nav('sa501', { from: 'psak48' })}><I.gavel size={13} /> Litigasi SA 501</Btn>
          <Btn sm onClick={() => nav('psak46', { from: 'psak48' })}><I.receipt size={13} /> Dampak Pajak</Btn>
          <Btn sm onClick={() => nav('psak58', { from: 'psak48' })}><I.archive size={13} /> Aset Dijual (PSAK 58)</Btn>
          <Btn sm><I.download size={13} /> Kertas Kerja P-48/57</Btn>
        </div>
      } />
      <div className="view-scroll">
        <div className="view-pad" style={{ display: 'grid', gap: 12 }}>

          {/* summary cards */}
          <div className="grid" style={{ gridTemplateColumns: 'repeat(5,1fr)', gap: 10 }}>
            <P48Card value={rp(p48.tested) + ' jt'} label="Nilai tercatat diuji (PSAK 48)" sub="UPK Operasi Inti + lisensi tak-terbatas" accent="var(--navy)" />
            <P48Card value={rp(p48.recoverable) + ' jt'} label="Jumlah terpulihkan UPK" sub={'Nilai pakai · WACC ' + (p48.params.wacc * 100).toFixed(1) + '%'} accent="var(--blue)" />
            <P48Card value={(p48.headroomPct * 100).toFixed(1) + '%'} label="Headroom UPK Inti" sub={'Rp ' + fmt(Math.round(p48.headroom)) + ' jt · ' + (headKind === 'amber' ? 'tipis' : headKind === 'red' ? 'defisit' : 'memadai')} accent={headKind === 'red' ? 'var(--red)' : headKind === 'amber' ? 'var(--amber)' : 'var(--green)'} />
            <P48Card value={rp(p57.provisionTotal) + ' jt'} label="Provisi diakui (PSAK 57)" sub={p57.counts.provision + ' pos · roll-forward ¶84'} accent="var(--red)" />
            <P48Card value={rp(p57.contingentTotal) + ' jt'} label="Liabilitas kontinjensi" sub={p57.counts.contingent + ' perkara diungkap'} accent="var(--amber)" />
          </div>

          {/* tabs */}
          <div className="row ac jb" style={{ flexWrap: 'wrap', gap: 8 }}>
            <div className="seg" style={{ width: 'fit-content', flexWrap: 'wrap' }}>
              {TABS.map(t => <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>{t.label}</button>)}
            </div>
            <span className="tiny muted">Satu sumber: <span className="mono">AMS_CANON.psak48 / .psak57</span> ← PSAK 16/19/73 · SA 501/540</span>
          </div>

          {/* ================= TAB · PENURUNAN NILAI (PSAK 48) ================= */}
          {tab === 'impair' && (
            <div className="grid" style={{ gridTemplateColumns: '1fr 332px', gap: 12, alignItems: 'start' }}>
              <div className="grid" style={{ gap: 12 }}>

                <Panel noBody>
                  <div className="panel-h"><h3>Uji Penurunan Nilai — UPK Operasi Inti</h3><span className="sub mono">¶18 · tercatat vs terpulihkan</span><div style={{ flex: 1 }} /><span className="tiny muted">Rp juta</span></div>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="dtbl" style={{ width: '100%' }}>
                      <thead><tr>
                        <th style={{ textAlign: 'left' }}>Komponen nilai tercatat UPK</th>
                        <th style={{ textAlign: 'left', width: 150 }}>Sumber (ber-WTB)</th>
                        <th style={{ textAlign: 'right', width: 96 }}>Nilai Tercatat</th>
                      </tr></thead>
                      <tbody>
                        {p48.parts.map(pt => (
                          <tr key={pt.id} onClick={() => pt.route !== 'psak48' && nav(pt.route, { from: 'psak48' })} style={{ cursor: pt.route !== 'psak48' ? 'pointer' : 'default' }}>
                            <td style={{ fontSize: 12.5, fontWeight: 600 }}>{pt.label}</td>
                            <td className="mono tiny" style={{ color: 'var(--ink-3)' }}>{pt.code}</td>
                            <td className="mono" style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(pt.val)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={{ background: 'var(--surface-2)' }}>
                          <td colSpan={2} style={{ fontWeight: 700, color: 'var(--navy)' }}>NILAI TERCATAT UPK</td>
                          <td className="mono" style={{ textAlign: 'right', fontWeight: 800, color: 'var(--navy)' }}>{fmt(p48.carry)}</td>
                        </tr>
                        <tr>
                          <td colSpan={2} style={{ fontWeight: 600 }}>Jumlah terpulihkan (nilai pakai · DCF)</td>
                          <td className="mono" style={{ textAlign: 'right', fontWeight: 700, color: 'var(--blue)' }}>{fmt(p48.recoverable)}</td>
                        </tr>
                        <tr style={{ background: headKind === 'amber' ? 'var(--amber-bg)' : headKind === 'red' ? 'var(--red-bg)' : 'var(--green-bg)' }}>
                          <td colSpan={2} style={{ fontWeight: 700 }}>Headroom {impaired ? '/ (rugi penurunan nilai)' : ''} ({(p48.headroomPct * 100).toFixed(1)}%)</td>
                          <td className="mono" style={{ textAlign: 'right', fontWeight: 800, color: p48.headroom < 0 ? 'var(--red)' : 'var(--green)' }}>{p48.headroom < 0 ? '(' + fmt(Math.round(-p48.headroom)) + ')' : fmt(Math.round(p48.headroom))}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  <div className="tiny muted" style={{ padding: '9px 14px 12px', lineHeight: 1.5 }}>
                    Tiap komponen ditarik dari modul pemiliknya yang ber-sumber WTB (aset tetap PSAK 16, takberwujud PSAK 19, ROU PSAK 73) + goodwill akuisisi. {impaired ? <b>Rugi penurunan nilai Rp {fmt(p48.impairLoss)} jt diakui.</b> : <>Jumlah terpulihkan melampaui nilai tercatat — <b>tidak ada rugi penurunan nilai diakui</b>, namun headroom <b>{headKind === 'amber' ? 'tipis & sensitif' : 'memadai'}</b>.</>}
                  </div>
                </Panel>

                <Panel noBody>
                  <div className="panel-h"><h3>Nilai Pakai (Value-in-Use) — Arus Kas Terdiskonto</h3><span className="sub mono">¶30-57 · WACC {(p48.params.wacc * 100).toFixed(1)}% · g {(p48.params.terminal * 100).toFixed(1)}%</span><div style={{ flex: 1 }} /><span className="tiny muted">Rp juta</span></div>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="dtbl" style={{ width: '100%' }}>
                      <thead><tr>
                        <th style={{ textAlign: 'left', width: 90 }}>Tahun</th>
                        <th style={{ textAlign: 'right' }}>Arus Kas</th>
                        <th style={{ textAlign: 'right' }}>Faktor Diskonto</th>
                        <th style={{ textAlign: 'right' }}>Nilai Kini</th>
                      </tr></thead>
                      <tbody>
                        {p48.viu.flows.map(f => (
                          <tr key={f.y}>
                            <td style={{ fontWeight: 600 }}>Tahun {f.y}</td>
                            <td className="mono" style={{ textAlign: 'right' }}>{fmt(Math.round(f.cf))}</td>
                            <td className="mono tiny" style={{ textAlign: 'right', color: 'var(--ink-3)' }}>{(1 / Math.pow(1 + p48.params.wacc, f.y)).toFixed(3)}</td>
                            <td className="mono" style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(Math.round(f.pv))}</td>
                          </tr>
                        ))}
                        <tr>
                          <td style={{ fontWeight: 600 }}>Nilai terminal</td>
                          <td className="mono" style={{ textAlign: 'right' }}>{fmt(Math.round(p48.viu.tv))}</td>
                          <td className="mono tiny" style={{ textAlign: 'right', color: 'var(--ink-3)' }}>{(1 / Math.pow(1 + p48.params.wacc, p48.params.years)).toFixed(3)}</td>
                          <td className="mono" style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(Math.round(p48.viu.tvPv))}</td>
                        </tr>
                      </tbody>
                      <tfoot>
                        <tr style={{ background: 'var(--surface-2)' }}>
                          <td colSpan={3} style={{ fontWeight: 700, color: 'var(--navy)' }}>JUMLAH TERPULIHKAN (NILAI PAKAI)</td>
                          <td className="mono" style={{ textAlign: 'right', fontWeight: 800, color: 'var(--navy)' }}>{fmt(p48.recoverable)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </Panel>

                <Panel noBody>
                  <div className="panel-h"><h3>Uji Tahunan Lisensi Umur Tak-Terbatas</h3><span className="sub mono">¶10 · terlepas indikator</span><div style={{ flex: 1 }} /><Btn sm onClick={() => nav('psak19', { from: 'psak48' })}><I.arrowRight size={12} /> PSAK 19</Btn></div>
                  <div style={{ padding: 14 }} className="grid">
                    <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                      <P48Card value={fmt(p48.license.carry)} label="Nilai tercatat lisensi" sub="dari PSAK 19" />
                      <P48Card value={fmt(p48.license.recoverable)} label="Jumlah terpulihkan" sub="value-in-use auditor" accent="var(--blue)" />
                      <P48Card value={fmt(p48.license.headroom)} label="Headroom" sub={(p48.license.carry ? (p48.license.headroom / p48.license.carry * 100).toFixed(0) : 0) + '% · tidak turun nilai'} accent="var(--green)" />
                    </div>
                    <div className="tiny muted" style={{ marginTop: 10, lineHeight: 1.5 }}>Lisensi operasi berumur tak-terbatas tidak diamortisasi (PSAK 19 ¶107) sehingga <b>wajib diuji penurunan nilai tahunan</b>. Angka terpulihkan ditarik dari perhitungan PSAK 19 — bukan dihitung ulang di sini.</div>
                  </div>
                </Panel>
              </div>

              <div className="grid" style={{ gap: 12 }}>
                <Panel noBody>
                  <div className="panel-h"><h3>Asesmen Indikator</h3><span className="sub mono">¶12 · eksternal & internal</span></div>
                  <div style={{ display: 'grid', gap: 0 }}>
                    {p48.indicators.map((ind, i) => (
                      <div key={ind.id} className="row gap10" style={{ padding: '9px 14px', alignItems: 'flex-start', borderBottom: i < p48.indicators.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
                        <span style={{ flex: '0 0 auto', marginTop: 1, color: ind.present ? 'var(--amber)' : 'var(--ink-4)' }}>{ind.present ? <I.alert size={15} /> : <span style={{ display: 'inline-block', width: 15, textAlign: 'center', fontWeight: 700 }}>–</span>}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.35 }}>{ind.t}</div>
                          <div className="tiny muted">{ind.scope}{ind.note ? ' · ' + ind.note : ''}</div>
                        </div>
                        {ind.present && <Badge kind="amber">terindikasi</Badge>}
                      </div>
                    ))}
                  </div>
                  <div className="tiny muted" style={{ padding: '9px 14px 12px', lineHeight: 1.5 }}>
                    <b>{p48.indicatorCount} dari {p48.indicators.length}</b> indikator terdeteksi → memicu uji penurunan nilai UPK. Goodwill & lisensi tak-terbatas diuji tahunan terlepas indikator (¶10).
                  </div>
                </Panel>

                <Panel noBody>
                  <div className="panel-h"><h3>Sensitivitas Asumsi Utama</h3><span className="sub mono">¶134f · vs headroom</span><div style={{ flex: 1 }} /><span className="tiny muted">Rp juta</span></div>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="dtbl" style={{ width: '100%' }}>
                      <thead><tr>
                        <th style={{ textAlign: 'left' }}>Skenario</th>
                        <th style={{ textAlign: 'right', width: 70 }}>Terpulihkan</th>
                        <th style={{ textAlign: 'right', width: 76 }}>Headroom</th>
                      </tr></thead>
                      <tbody>
                        {p48.sens.map((sn, i) => (
                          <tr key={i}>
                            <td style={{ fontSize: 11.5, lineHeight: 1.3 }}>{sn.label}<div className="tiny muted mono">{sn.shock}</div></td>
                            <td className="mono" style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(sn.rec)}</td>
                            <td className="mono" style={{ textAlign: 'right', fontWeight: 700, color: sn.head < 0 ? 'var(--red)' : 'var(--green)' }}>{sn.head < 0 ? '(' + fmt(-sn.head) + ')' : '+' + fmt(sn.head)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="panel" style={{ margin: '0 12px 12px', padding: '9px 11px', background: 'var(--amber-bg)', borderColor: 'transparent' }}>
                    <div className="row gap8" style={{ alignItems: 'flex-start' }}>
                      <span style={{ color: 'var(--amber)', marginTop: 1 }}><I.alert size={15} /></span>
                      <span style={{ fontSize: 11.5, lineHeight: 1.5 }}>Kenaikan WACC <b>+1%</b> atau penurunan arus kas <b>−5%</b> menghapus headroom & menimbulkan rugi penurunan nilai — area pertimbangan signifikan & kandidat <b>KAM (SA 701)</b>.</span>
                    </div>
                  </div>
                </Panel>

                <Panel title="Ketentuan Kunci PSAK 48" sub="IAS 36">
                  <div style={{ display: 'grid', gap: 0 }}>
                    {P48_KEY.map((a, i) => (
                      <div key={i} style={{ padding: '8px 0', borderBottom: i < P48_KEY.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
                        <div className="row ac jb"><span style={{ fontSize: 12, fontWeight: 600 }}>{a.k}</span><span className="mono" style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--navy)' }}>{a.v}</span></div>
                        <div className="tiny muted" style={{ lineHeight: 1.4, marginTop: 1 }}>{a.note}</div>
                      </div>
                    ))}
                  </div>
                </Panel>
              </div>
            </div>
          )}

          {/* ================= TAB · PROVISI & KONTINJENSI (PSAK 57) ================= */}
          {tab === 'provisi' && (
            <div className="grid" style={{ gridTemplateColumns: '1fr 360px', gap: 12, alignItems: 'start' }}>
              <div className="grid" style={{ gap: 12 }}>
                <Panel noBody>
                  <div className="panel-h"><h3>Register Provisi, Klaim & Litigasi</h3><span className="sub mono">klasifikasi diturunkan dari ¶14/27/86</span><div style={{ flex: 1 }} /><span className="tiny muted">{p57.items.length} pos · Rp juta</span></div>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="dtbl" style={{ width: '100%' }}>
                      <thead><tr>
                        <th style={{ width: 64 }}>Ref</th>
                        <th style={{ textAlign: 'left' }}>Pos / Perkara</th>
                        <th style={{ textAlign: 'right', width: 70 }}>Klaim</th>
                        <th style={{ textAlign: 'right', width: 78 }}>Diakui</th>
                        <th style={{ textAlign: 'center', width: 130 }}>Kemungkinan</th>
                        <th style={{ textAlign: 'left', width: 150 }}>Perlakuan</th>
                      </tr></thead>
                      <tbody>
                        {p57.items.map(it => (
                          <tr key={it.id} className={it.id === selProv ? 'sel' : ''} onClick={() => setSelProv(it.id)} style={{ cursor: 'pointer' }}>
                            <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{it.id}</td>
                            <td style={{ fontWeight: 600, whiteSpace: 'normal', lineHeight: 1.3 }}>{it.party}<div className="tiny muted" style={{ fontWeight: 400 }}>{it.nature} · {it.counsel}</div></td>
                            <td className="mono" style={{ textAlign: 'right' }}>{fmt(it.claim)}</td>
                            <td className="mono" style={{ textAlign: 'right', fontWeight: 700, color: it.recognized ? 'var(--red)' : 'var(--ink-4)' }}>{it.recognized ? fmt(it.recognized) : '—'}</td>
                            <td style={{ textAlign: 'center' }}><Badge kind={it.likely === 'Besar Kemungkinan' ? 'red' : it.likely === 'Mungkin' ? 'amber' : 'gray'}>{it.likely}</Badge></td>
                            <td><Badge kind={it.kind === 'red' ? 'red' : it.kind === 'amber' ? 'amber' : 'gray'}>{it.disc}</Badge></td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={{ background: 'var(--surface-2)' }}>
                          <td colSpan={3} style={{ fontWeight: 700, color: 'var(--navy)' }}>PROVISI DIAKUI (NERACA)</td>
                          <td className="mono" style={{ textAlign: 'right', fontWeight: 800, color: 'var(--red)' }}>{fmt(p57.provisionTotal)}</td>
                          <td colSpan={2} className="tiny muted" style={{ paddingLeft: 8 }}>kontinjensi diungkap Rp {fmt(p57.contingentTotal)} jt</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  <div className="tiny muted" style={{ padding: '9px 14px 12px', lineHeight: 1.5 }}>
                    Register ini adalah <b>sumber yang sama</b> dibaca modul <b>SA 501</b> (litigasi & klaim) dan <b>SA 540</b> (estimasi provisi garansi). Perlakuan akuntansi diturunkan otomatis dari tingkat kemungkinan — bukan diketik ganda.
                  </div>
                </Panel>

                <Panel noBody>
                  <div className="panel-h"><h3>Mutasi Provisi (Roll-Forward)</h3><span className="sub mono">¶84 · menutup ke saldo akhir</span><div style={{ flex: 1 }} />{p57.rollTies ? <Badge kind="green">menutup</Badge> : <Badge kind="amber">selisih</Badge>}</div>
                  <div>
                    {[
                      { t: 'Saldo awal — 1 Jan 2025', v: p57.rf.opening, tot: true },
                      { t: 'Provisi ditambahkan th berjalan', v: p57.rf.addl, kind: 'green' },
                      { t: 'Provisi digunakan (pembayaran)', v: -p57.rf.used, kind: 'red' },
                      { t: 'Provisi dibalik (tak terpakai)', v: -p57.rf.reversed, kind: 'gray' },
                      { t: 'Akresi diskonto (unwinding)', v: p57.rf.unwind, kind: 'blue' },
                      { t: 'Saldo akhir — 31 Des 2025', v: p57.rf.closing, tot: true },
                    ].map((r, i) => (
                      <div key={i} className="row ac gap10" style={{ padding: '9px 14px', borderBottom: '1px solid var(--line-soft)', background: r.tot ? 'var(--surface-2)' : 'transparent' }}>
                        <div style={{ flex: 1, fontSize: 12.5, fontWeight: r.tot ? 700 : 500, color: r.tot ? 'var(--navy)' : 'var(--ink)' }}>{r.t}</div>
                        <div className="mono" style={{ width: 90, textAlign: 'right', fontWeight: 700, color: r.v < 0 ? 'var(--red)' : r.tot ? 'var(--navy)' : (r.v === 0 ? 'var(--ink-4)' : 'var(--green)') }}>{r.v < 0 ? '(' + fmt(-r.v) + ')' : (r.tot ? '' : (r.v === 0 ? '—' : '+')) + (r.v === 0 ? '' : fmt(r.v))}</div>
                      </div>
                    ))}
                  </div>
                  <div className="tiny muted" style={{ padding: '10px 14px 12px', lineHeight: 1.5 }}>
                    Saldo akhir Rp {fmt(p57.rf.closing)} jt menutup persis ke total provisi diakui Rp {fmt(p57.provisionTotal)} jt (garansi + litigasi LIT-02). Roll-forward ini wajib diungkap untuk tiap kelas provisi (¶84).
                  </div>
                </Panel>
              </div>

              <div className="grid" style={{ gap: 12 }}>
                {sel && (
                  <Panel noBody>
                    <div style={{ background: 'var(--surface-2)', padding: '11px 14px', borderBottom: '1px solid var(--line)' }}>
                      <div className="row ac gap8"><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{sel.id}</span><Badge kind={sel.kind}>{sel.disc}</Badge></div>
                      <div style={{ fontWeight: 700, fontSize: 13, marginTop: 4, lineHeight: 1.3 }}>{sel.party}</div>
                    </div>
                    <div style={{ padding: 14, display: 'grid', gap: 8 }}>
                      <P48Kv label="Nilai klaim / eksposur" v={fmt(sel.claim) + ' jt'} />
                      <P48Kv label="Estimasi terbaik" v={fmt(sel.estimate) + ' jt'} />
                      <P48Kv label="Diakui sebagai provisi" v={sel.recognized ? fmt(sel.recognized) + ' jt' : '—'} strong accent={sel.recognized ? 'var(--red)' : 'var(--green)'} />
                      <P48Kv label="Surat hukum" v={sel.resp ? 'Dibalas' : 'Menunggu'} accent={sel.resp ? 'var(--green)' : 'var(--amber)'} />
                      <P48Kv label="Status" v={sel.status} />
                      <div style={{ borderTop: '1px solid var(--line-soft)', paddingTop: 8 }}>
                        <div className="tiny muted upper" style={{ marginBottom: 4 }}>Penilaian</div>
                        <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5 }}>{sel.assess}</p>
                      </div>
                      {!sel.resp && (
                        <div className="panel" style={{ padding: '9px 11px', background: 'var(--amber-bg)', borderColor: 'transparent' }}>
                          <div className="row ac gap8"><span style={{ color: 'var(--amber)' }}><I.mail size={15} /></span><span style={{ fontSize: 11.5, lineHeight: 1.4 }}>Surat ke penasihat hukum eksternal belum dibalas (SA 501 ¶10) — tindak lanjut sebelum tanggal laporan.</span></div>
                        </div>
                      )}
                    </div>
                  </Panel>
                )}

                <Panel title="Klasifikasi (Pohon Keputusan)" sub="¶14 · 27 · 86">
                  <div className="row gap12 ac">
                    <Donut segments={provSegs} size={104} thickness={15}
                      center={<><div className="mono" style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>{p57.items.length}</div><div className="tiny muted">pos</div></>} />
                    <div style={{ flex: 1 }}>
                      {[
                        { lbl: 'Provisi diakui', c: '#b3261e', v: p57.provisionTotal, n: p57.counts.provision, d: 'kewajiban kini · arus keluar besar kemungkinan' },
                        { lbl: 'Liabilitas kontinjensi', c: '#c79a1e', v: p57.contingentTotal, n: p57.counts.contingent, d: 'diungkap, tidak diakui' },
                        { lbl: 'Remote', c: '#9aa3ad', v: p57.remoteTotal, n: p57.counts.remote, d: 'tidak diakui/diungkap' },
                      ].map((g, i) => (
                        <div key={i} style={{ padding: '4px 0' }}>
                          <div className="row jb ac"><span className="row ac gap6"><span style={{ width: 9, height: 9, borderRadius: 2, background: g.c }} /><span style={{ fontSize: 12, fontWeight: 600 }}>{g.lbl}</span></span><span className="mono" style={{ fontWeight: 700 }}>{fmt(g.v)} jt</span></div>
                          <div className="tiny muted" style={{ paddingLeft: 15 }}>{g.n} pos · {g.d}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Panel>

                <Panel title="Dampak Pajak Tangguhan" sub="PSAK 46 · provisi deductible saat realisasi">
                  <div style={{ display: 'grid', gap: 8 }}>
                    <P48Kv label="Provisi diakui (total)" v={fmt(p57.provisionTotal) + ' jt'} />
                    <P48Kv label="Beda temporer dimodelkan (garansi)" v={fmt(p57.tempDiffModeled) + ' jt'} />
                    <P48Kv label="Tarif PPh Badan (UU HPP)" v={(p57.rate * 100).toFixed(0) + '%'} />
                    <div style={{ borderTop: '1px solid var(--line-soft)', paddingTop: 8 }}>
                      <P48Kv label="Aset pajak tangguhan provisi" v={fmt(p57.dtAsset) + ' jt'} strong accent="var(--blue)" />
                    </div>
                  </div>
                  <div className="tiny muted" style={{ marginTop: 9, lineHeight: 1.5 }}>Beda temporer mengalir ke pos <span className="mono">prv</span> di <b>PSAK 46</b>. Provisi litigasi LIT-02 tidak <i>deductible</i> hingga penyelesaian hukum → tidak dimodelkan sebagai beda temporer.</div>
                  <button onClick={() => nav('psak46', { from: 'psak48' })} className="row ac jb" style={{ marginTop: 11, padding: '8px 10px', borderRadius: 7, border: '1px solid var(--line)', borderLeft: '3px solid var(--blue)', background: 'var(--surface)', cursor: 'pointer', width: '100%', textAlign: 'left' }}>
                    <div><div style={{ fontSize: 11.5, fontWeight: 600 }}>Buka PSAK 46</div><div className="tiny muted">Beda temporer & DTA</div></div>
                    <I.arrowRight size={13} style={{ color: 'var(--ink-4)' }} />
                  </button>
                </Panel>

                <Panel title="Ketentuan Kunci PSAK 57" sub="IAS 37">
                  <div style={{ display: 'grid', gap: 0 }}>
                    {P57_KEY.map((a, i) => (
                      <div key={i} style={{ padding: '8px 0', borderBottom: i < P57_KEY.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
                        <div className="row ac jb"><span style={{ fontSize: 12, fontWeight: 600 }}>{a.k}</span><span className="mono" style={{ fontSize: 11, fontWeight: 700, color: 'var(--navy)' }}>{a.v}</span></div>
                        <div className="tiny muted" style={{ lineHeight: 1.4, marginTop: 1 }}>{a.note}</div>
                      </div>
                    ))}
                  </div>
                </Panel>
              </div>
            </div>
          )}

          {/* ================= TAB · REKONSILIASI ================= */}
          {tab === 'rekonsiliasi' && (
            <div className="grid" style={{ gridTemplateColumns: '1fr 332px', gap: 12, alignItems: 'start' }}>
              <div className="grid" style={{ gap: 12 }}>
                <Panel noBody>
                  <div className="panel-h"><h3>Rekonsiliasi Angka — Satu Sumber Kebenaran</h3><span className="sub mono">PSAK 48/57 ↔ modul sumber ↔ konsumen</span></div>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="dtbl" style={{ width: '100%' }}>
                      <thead><tr>
                        <th style={{ textAlign: 'left' }}>Pos</th>
                        <th style={{ textAlign: 'left', width: 180 }}>Sumber</th>
                        <th style={{ textAlign: 'right', width: 84 }}>Rp juta</th>
                        <th style={{ textAlign: 'center', width: 56 }}>Status</th>
                      </tr></thead>
                      <tbody>
                        {[
                          { pos: 'Aset tetap neto (komponen UPK)', src: 'PSAK 16 ← WTB 1-2100/2110', val: p48.parts.find(x => x.id === 'ppe').val, ok: true, hi: true },
                          { pos: 'Takberwujud terbatas (komponen UPK)', src: 'PSAK 19 ← WTB 1-2400/2410', val: p48.parts.find(x => x.id === 'intanFin').val, ok: true, hi: true },
                          { pos: 'Aset hak-guna ROU (komponen UPK)', src: 'PSAK 73 ← WTB 1-2300', val: p48.parts.find(x => x.id === 'rou').val, ok: true, hi: true },
                          { pos: 'Nilai tercatat UPK (total)', src: 'AMS_CANON.psak48 · carry', val: p48.carry, ok: true },
                          { pos: 'Jumlah terpulihkan (nilai pakai)', src: 'psak48 · DCF value-in-use', val: p48.recoverable, ok: true },
                          { pos: 'Lisensi tak-terbatas — terpulihkan', src: 'PSAK 19 · indefCarry/recov', val: p48.license.recoverable, ok: true },
                          { pos: 'Provisi diakui (Neraca)', src: 'PSAK 57 · PROV_REGISTER', val: p57.provisionTotal, ok: true, hi: true },
                          { pos: 'Roll-forward provisi (saldo akhir)', src: 'psak57 · rf.closing', val: p57.rf.closing, ok: p57.rollTies },
                          { pos: 'Beda temporer provisi → PSAK 46', src: 'FISCAL.provisi · 22%', val: p57.tempDiffModeled, ok: true },
                        ].map((r, i) => (
                          <tr key={i} style={{ background: r.hi ? 'var(--blue-050)' : undefined }}>
                            <td style={{ fontWeight: 600, fontSize: 12.5 }}>{r.pos}</td>
                            <td className="mono tiny" style={{ color: 'var(--ink-3)' }}>{r.src}</td>
                            <td className="mono" style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(Math.round(r.val))}</td>
                            <td style={{ textAlign: 'center' }}>{r.ok ? <span style={{ color: 'var(--green)' }}><I.checkCircle size={15} /></span> : <span style={{ color: 'var(--amber)' }}><I.alert size={15} /></span>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="tiny muted" style={{ padding: '9px 14px 12px', lineHeight: 1.5 }}>
                    PSAK 48/57 tidak menyimpan saldo terpisah: komponen UPK ditarik dari <b>PSAK 16/19/73</b> (ber-sumber WTB), register provisi dari <b>PROV_REGISTER</b> yang sama dibaca <b>SA 501/540</b>. Mengubah AJE atau klasifikasi di modul sumber otomatis memperbarui uji penurunan nilai & provisi di sini.
                  </div>
                </Panel>
              </div>

              <div className="grid" style={{ gap: 12 }}>
                <Panel noBody>
                  <div className="panel-h"><h3>Keterkaitan Kertas Kerja</h3><span className="sub mono">lineage data</span></div>
                  <div className="row ac gap6" style={{ padding: '9px 14px 4px' }}><I.arrowRight size={13} style={{ color: 'var(--blue)' }} /><span className="tiny upper" style={{ fontWeight: 700, letterSpacing: '.04em', color: 'var(--ink-3)' }}>Hulu — sumber nilai tercatat</span></div>
                  <div style={{ display: 'grid', gap: 6, padding: '2px 12px 10px' }}>
                    {P48_UPSTREAM.map(m => { const IconC = I[m.ic] || I.doc; return (
                      <button key={m.id} onClick={() => nav(m.id, { from: 'psak48' })} className="row ac gap9" style={{ padding: '8px 10px', borderRadius: 7, border: '1px solid var(--line)', borderLeft: '3px solid var(--blue)', background: 'var(--surface)', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                        <span style={{ color: 'var(--blue)', flex: '0 0 auto' }}><IconC size={15} /></span>
                        <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12, fontWeight: 600 }}>{m.lbl}</div><div className="tiny muted" style={{ lineHeight: 1.35 }}>{m.rel}</div></div>
                        <I.arrowRight size={13} style={{ color: 'var(--ink-4)', flex: '0 0 auto' }} />
                      </button>
                    ); })}
                  </div>
                  <div className="row ac gap6" style={{ padding: '4px 14px 4px', borderTop: '1px solid var(--line-soft)' }}><I.arrowRight size={13} style={{ color: 'var(--green)' }} /><span className="tiny upper" style={{ fontWeight: 700, letterSpacing: '.04em', color: 'var(--ink-3)' }}>Hilir — pengguna angka</span></div>
                  <div style={{ display: 'grid', gap: 6, padding: '2px 12px 12px' }}>
                    {P48_DOWNSTREAM.map(m => { const IconC = I[m.ic] || I.doc; return (
                      <button key={m.id} onClick={() => nav(m.id, { from: 'psak48' })} className="row ac gap9" style={{ padding: '8px 10px', borderRadius: 7, border: '1px solid var(--line)', borderLeft: '3px solid var(--green)', background: 'var(--surface)', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                        <span style={{ color: 'var(--green)', flex: '0 0 auto' }}><IconC size={15} /></span>
                        <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12, fontWeight: 600 }}>{m.lbl}</div><div className="tiny muted" style={{ lineHeight: 1.35 }}>{m.rel}</div></div>
                        <I.arrowRight size={13} style={{ color: 'var(--ink-4)', flex: '0 0 auto' }} />
                      </button>
                    ); })}
                  </div>
                  <button onClick={() => nav('dataflow', { from: 'psak48' })} className="row ac gap8" style={{ padding: '9px 14px', borderTop: '1px solid var(--line-soft)', background: 'var(--surface-2)', cursor: 'pointer', width: '100%', textAlign: 'left', border: 'none' }}>
                    <I.link2 size={14} style={{ color: 'var(--navy)' }} /><span style={{ flex: 1, fontSize: 12, fontWeight: 600 }}>Lihat Rekonsiliasi Angka lintas-modul</span><I.arrowRight size={13} style={{ color: 'var(--ink-4)' }} />
                  </button>
                </Panel>
              </div>
            </div>
          )}

          {/* ================= TAB · AUDIT ================= */}
          {tab === 'audit' && (
            <div className="grid" style={{ gridTemplateColumns: '1fr 332px', gap: 12, alignItems: 'start' }}>
              <Panel noBody>
                <div className="panel-h"><h3>Prosedur Audit — Penurunan Nilai & Provisi (SA 540 · 501 · 500)</h3><div style={{ flex: 1 }} /><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--navy)' }}>{doneCount}/{P48_PROC.length}</span></div>
                <div className="row gap8" style={{ padding: '10px 14px', alignItems: 'flex-start', background: 'var(--blue-050)' }}>
                  <span style={{ color: 'var(--blue)', marginTop: 1 }}><I.target size={15} /></span>
                  <div style={{ fontSize: 11.5, lineHeight: 1.5 }}>Penurunan nilai (terutama nilai pakai goodwill) & provisi adalah estimasi dengan ketidakpastian tinggi. Prosedur menguji asesmen indikator, proyeksi arus kas & tingkat diskonto, klasifikasi provisi/kontinjensi, serta komunikasi penasihat hukum.</div>
                </div>
                <div>
                  {P48_PROC.map((p, i) => {
                    const key = p.ref + i;
                    const isOn = !!done[key];
                    return (
                      <label key={key} className="row gap10" style={{ padding: '9px 14px', cursor: 'pointer', alignItems: 'flex-start', borderBottom: i < P48_PROC.length - 1 ? '1px solid var(--line-soft)' : 0 }} onClick={() => toggle(key)}>
                        <span style={{ flex: '0 0 16px', width: 16, height: 16, borderRadius: 4, marginTop: 1, border: '1.5px solid ' + (isOn ? 'var(--green)' : 'var(--line-strong)'), background: isOn ? 'var(--green)' : '#fff', display: 'grid', placeItems: 'center' }}>{isOn && <I.check size={11} style={{ color: '#fff' }} />}</span>
                        <span className="mono tiny" style={{ fontWeight: 700, color: 'var(--navy)', width: 92, flex: '0 0 92px', marginTop: 1 }}>{p.ref}</span>
                        <span style={{ fontSize: 12, lineHeight: 1.4, color: isOn ? 'var(--ink-3)' : 'var(--ink)', textDecoration: isOn ? 'line-through' : 'none' }}>{p.t}</span>
                      </label>
                    );
                  })}
                </div>
              </Panel>

              <div className="grid" style={{ gap: 12 }}>
                <Panel title="Kesimpulan Audit" sub="WP P-48/57">
                  <div style={{ display: 'grid', gap: 8 }}>
                    <P48Kv label="Rugi penurunan nilai diakui" v={rp(p48.totalImpair) + ' jt'} strong accent={p48.totalImpair > 0 ? 'var(--red)' : 'var(--green)'} />
                    <P48Kv label="Headroom UPK Inti" v={(p48.headroomPct * 100).toFixed(1) + '%'} accent={headKind === 'amber' ? 'var(--amber)' : 'var(--green)'} />
                    <P48Kv label="Provisi diakui" v={rp(p57.provisionTotal) + ' jt'} accent="var(--red)" />
                    <P48Kv label="Kontinjensi diungkap" v={rp(p57.contingentTotal) + ' jt'} accent="var(--amber)" />
                  </div>
                  <div className="panel" style={{ marginTop: 11, padding: '9px 11px', background: headKind === 'amber' ? 'var(--amber-bg)' : 'var(--green-bg)', borderColor: 'transparent' }}>
                    <div className="row gap8" style={{ alignItems: 'flex-start' }}>
                      <span style={{ color: headKind === 'amber' ? 'var(--amber)' : 'var(--green)', marginTop: 1 }}>{headKind === 'amber' ? <I.alert size={15} /> : <I.checkCircle size={15} />}</span>
                      <span style={{ fontSize: 11.5, lineHeight: 1.5 }}>Tidak ada rugi penurunan nilai diakui, namun <b>headroom UPK tipis ({(p48.headroomPct * 100).toFixed(1)}%)</b> & sensitif terhadap WACC → diusulkan sebagai <b>Hal Audit Utama</b> dan diungkap dalam CALK (asumsi & sensitivitas).</span>
                    </div>
                  </div>
                  <button onClick={() => nav('sa701', { from: 'psak48' })} className="row ac jb" style={{ marginTop: 11, padding: '8px 10px', borderRadius: 7, border: '1px solid var(--line)', borderLeft: '3px solid var(--navy)', background: 'var(--surface)', cursor: 'pointer', width: '100%', textAlign: 'left' }}>
                    <div><div style={{ fontSize: 11.5, fontWeight: 600 }}>Buka SA 701 · KAM</div><div className="tiny muted">Hal Audit Utama (KAM-3)</div></div>
                    <I.arrowRight size={13} style={{ color: 'var(--ink-4)' }} />
                  </button>
                </Panel>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
