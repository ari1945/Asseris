/* ============================================================
   NeoSuite AMS — Group Audit (SA 600 / ISA 600 Revised)
   Lifecycle penuh audit grup:
   Struktur & Lingkup → Group Instructions → Evaluasi Auditor
   Komponen → Konsolidasi & Eliminasi → Temuan & Kesimpulan
   ============================================================ */
const { useState: useStateGA, useMemo: useMemoGA } = React;

const GROUP_MAT = 6_200_000_000;
const GROUP_PM = 4_650_000_000;
const GROUP_CTT = 310_000_000; // clearly trivial threshold

const GA_COMPONENTS = [
  { id: 'CP-01', name: 'PT Sentosa Makmur', role: 'Induk / Holding', country: 'Indonesia', ccy: 'IDR', fx: 1, own: 100, revPct: 58, astPct: 55, npat: 14_660_000_000, sig: 'Signifikan (ukuran)', scope: 'Full', mat: 4_250_000_000, auditor: 'Tim Grup (WHR)', kap: false, status: 'Reporting', risk: 'High', instr: '—', step: 5, evInd: 5, evComp: 5, evReg: 5, sad: 410_000_000 },
  { id: 'CP-02', name: 'PT Sentosa Logistik', role: 'Anak (Distribusi)', country: 'Indonesia', ccy: 'IDR', fx: 1, own: 99, revPct: 18, astPct: 16, npat: 11_900_000_000, sig: 'Signifikan (ukuran)', scope: 'Full', mat: 2_100_000_000, auditor: 'Tim Grup (WHR)', kap: false, status: 'Reporting', risk: 'Medium', instr: '—', step: 5, evInd: 5, evComp: 5, evReg: 5, sad: 150_000_000 },
  { id: 'CP-03', name: 'PT Sentosa Pangan', role: 'Anak (Manufaktur)', country: 'Indonesia', ccy: 'IDR', fx: 1, own: 80, revPct: 14, astPct: 15, npat: 7_200_000_000, sig: 'Signifikan (risiko)', scope: 'Specific', mat: 1_650_000_000, auditor: 'KAP Mitra Selaras', kap: true, status: 'Instructions', risk: 'High', instr: 'Terkirim', step: 1, evInd: 4, evComp: 3, evReg: 4, sad: 880_000_000 },
  { id: 'CP-04', name: 'PT Sentosa Retail', role: 'Anak (Ritel)', country: 'Indonesia', ccy: 'IDR', fx: 1, own: 75, revPct: 6, astPct: 8, npat: 2_600_000_000, sig: 'Tidak signifikan', scope: 'Analytical', mat: 0, auditor: 'Tim Grup (WHR)', kap: false, status: 'Pending', risk: 'Low', instr: '—', step: 0, evInd: 5, evComp: 5, evReg: 5, sad: 0 },
  { id: 'CP-05', name: 'Sentosa Trading Pte Ltd', role: 'Anak (Perdagangan)', country: 'Singapura', ccy: 'SGD', fx: 11_950, own: 100, revPct: 4, astPct: 6, npat: 4_050_000_000, sig: 'Signifikan (risiko)', scope: 'Full', mat: 1_400_000_000, auditor: 'KAP Lim & Tan (SG)', kap: true, status: 'Reviewed', risk: 'Medium', instr: 'Diterima', step: 4, evInd: 5, evComp: 4, evReg: 3, sad: 320_000_000 },
];

/* Prosedur reviu proses konsolidasi (tim audit grup · SA 600 / PSAK 65) */
const GA_CONSOL_PROC = [
  { ref: 'SA 600 ¶B86', t: 'Pahami proses konsolidasi entitas induk & pengendalian atasnya (paket konsolidasi, mapping akun, kebijakan grup)' },
  { ref: 'PSAK 65 ¶19', t: 'Uji keseragaman kebijakan akuntansi & tanggal pelaporan komponen sebelum digabung line-by-line' },
  { ref: 'PSAK 22 ¶32', t: 'Re-perform eliminasi investasi vs ekuitas anak; verifikasi goodwill & pengukuran NCI proporsional (¶19)' },
  { ref: 'PSAK 65 ¶B86(a)', t: 'Uji kelengkapan & akurasi eliminasi saldo antar-perusahaan (piutang/utang, penjualan/BPP)' },
  { ref: 'PSAK 65 ¶B86(c)', t: 'Uji eliminasi laba belum terealisasi dalam persediaan & dividen antar-perusahaan' },
  { ref: 'PSAK 10 ¶39', t: 'Uji translasi entitas asing — kurs penutup/rata-rata & selisih kurs ke OCI (CTA)' },
  { ref: 'PSAK 65 ¶B94', t: 'Uji atribusi laba tahun berjalan & ekuitas ke pemilik induk dan NCI' },
  { ref: 'SA 600 ¶42', t: 'Uji keseimbangan kertas kerja (A = L + E) & rekonsiliasi ke LK konsolidasian (FS Generator)' },
];

/* Keterkaitan lintas-modul kertas kerja konsolidasi (lineage dua arah) */
const GA_CONSOL_UP = [
  { id: 'wtb', ic: 'table', lbl: 'Working Trial Balance', rel: 'Entitas induk (PT Sentosa Makmur) — saldo standalone, live AJE' },
  { id: 'psak65', ic: 'building', lbl: 'PSAK 65 · Konsolidasian', rel: 'Mesin konsolidasi kanonik — kertas kerja, NCI & goodwill yang sama' },
  { id: 'related', ic: 'link2', lbl: 'Pihak Berelasi (PSAK 7)', rel: 'Daftar transaksi & saldo antar-perusahaan untuk eliminasi' },
  { id: 'confirm', ic: 'mail', lbl: 'Konfirmasi (SA 505)', rel: 'Rekonsiliasi saldo antar-perusahaan — selisih ELM-03' },
];
const GA_CONSOL_DOWN = [
  { id: 'psak48', ic: 'scale', lbl: 'PSAK 48 · Penurunan Nilai', rel: 'Goodwill konsolidasi → uji penurunan nilai UPK tahunan' },
  { id: 'psak46', ic: 'receipt', lbl: 'PSAK 46 · Pajak Tangguhan', rel: 'Konsekuensi pajak PPA & laba antar-perusahaan (22%)' },
  { id: 'fsgen', ic: 'report', lbl: 'FS Generator', rel: 'LPK & laba rugi konsolidasian → penyajian LK' },
  { id: 'sa701', ic: 'star', lbl: 'SA 701 · KAM', rel: 'Goodwill & konsolidasi sebagai Hal Audit Utama' },
];

/* ===== PAKET PELAPORAN KOMPONEN (impor konsolidasi) ===========
   Alur kerja audit grup: tiap komponen mengirim paket pelaporan (reporting
   package). Figur disunting/diimpor di tab ini → disimpan di ams.v1.gaPackages
   → ditarik AMS_CANON.psak65 sebagai pengganti seed (SSOT). Status = gerbang
   tata kelola: Diterima → Direkonsiliasi → Disetujui (atau Ditolak). */
const PKG_STATUS_KIND = { Disetujui: 'green', Direkonsiliasi: 'blue', Diterima: 'amber', Ditolak: 'red', Seed: 'gray' };
const PKG_STATUS_ORDER = ['Diterima', 'Direkonsiliasi', 'Disetujui'];
/* field paket yang dapat diimpor/disunting — dikelompokkan untuk editor & validasi neraca */
const PKG_FIELDS = [
  { sec: 'Laba rugi', items: [['rev', 'Pendapatan'], ['npat', 'Laba bersih (NPAT)']] },
  { sec: 'Aset', items: [['kas', 'Kas & setara'], ['piutang', 'Piutang usaha'], ['persediaan', 'Persediaan'], ['asetTetap', 'Aset tetap — neto'], ['asetLain', 'Aset lain']] },
  { sec: 'Liabilitas', items: [['utangUsaha', 'Utang usaha'], ['utangBank', 'Utang bank'], ['liabLain', 'Liabilitas lain']] },
  { sec: 'Ekuitas', items: [['modal', 'Modal saham'], ['rePre', 'Saldo laba pra-akuisisi'], ['rePost', 'Saldo laba pasca-akuisisi']] },
  { sec: 'Investasi induk', items: [['cost', 'Biaya perolehan investasi']] },
];
const PKG_NUM_KEYS = PKG_FIELDS.flatMap(g => g.items.map(i => i[0]));
const PKG_LABELS = Object.fromEntries(PKG_FIELDS.flatMap(g => g.items));

/* default paket: dibangun dari seed kanonik + status awal realistis (campuran) */
function gaDefaultPackages(wtb) {
  const subs = (window.AMS_CANON && window.AMS_CANON.psak65) ? window.AMS_CANON.psak65(wtb, {}).subs : [];
  const seedStatus = { 'CP-02': 'Disetujui', 'CP-03': 'Direkonsiliasi', 'CP-04': 'Diterima', 'CP-05': 'Diterima' };
  const seedRecv = { 'CP-02': '08 Jan 2026', 'CP-03': '10 Jan 2026', 'CP-04': '12 Jan 2026', 'CP-05': '13 Jan 2026' };
  const o = {};
  subs.forEach(s => {
    const p = { status: seedStatus[s.id] || 'Diterima', received: seedRecv[s.id] || null };
    PKG_NUM_KEYS.forEach(k => { p[k] = s[k]; });
    o[s.id] = p;
  });
  return o;
}

const GA_FINDINGS = [
  { id: 'GF-01', comp: 'PT Sentosa Pangan', auditor: 'KAP Mitra Selaras', area: 'Penilaian persediaan agrikultur (PSAK 69)', sev: 'Signifikan', sad: 880_000_000, status: 'Terbuka', note: 'Nilai wajar aset biologis menggunakan asumsi harga panen di atas kurva pasar; potensi overstatement.' },
  { id: 'GF-02', comp: 'Sentosa Trading Pte', auditor: 'KAP Lim & Tan (SG)', area: 'Cut-off pengakuan pendapatan ekspor', sev: 'Sedang', sad: 320_000_000, status: 'Dikoreksi', note: 'Tiga pengiriman FOB tercatat sebelum tanggal B/L; klien telah menyesuaikan.' },
  { id: 'GF-03', comp: 'PT Sentosa Makmur', auditor: 'Tim Grup (WHR)', area: 'Kapitalisasi biaya pengembangan', sev: 'Sedang', sad: 410_000_000, status: 'Terbuka', note: 'Sebagian biaya tahap riset dikapitalisasi tidak sesuai PSAK 19.' },
  { id: 'GF-04', comp: 'PT Sentosa Logistik', auditor: 'Tim Grup (WHR)', area: 'Akrual beban operasional kendaraan', sev: 'Trivial', sad: 150_000_000, status: 'Dikoreksi', note: 'Understatement akrual perawatan armada; di bawah CTT setelah koreksi.' },
];

const SCOPE_KIND = { Full: 'blue', Specific: 'purple', Analytical: 'gray' };
const STATUS_KIND_GA = { Reviewed: 'green', Reporting: 'blue', Instructions: 'amber', Pending: 'gray' };
const INSTR_STEPS = ['Instruksi', 'Acknowledged', 'Interim', 'Reporting Pkg', 'Clearance'];
const SEV_GA = { Signifikan: 'red', Sedang: 'amber', Trivial: 'gray' };

function gaRisk(r) { return r === 'High' ? 'var(--red)' : r === 'Medium' ? 'var(--amber)' : 'var(--green)'; }

/* ---------------------------------------------------------------- */
function GroupAudit() {
  const { fmt } = window.AMS;
  const nav = (typeof useNav === 'function') ? useNav() : (() => {});
  const audit = (typeof useAudit === 'function') ? useAudit() : {};
  const wtb = (audit && audit.wtb && audit.wtb.length) ? audit.wtb : ((window.AMS && window.AMS.WTB) || []);
  const [packages, setPackages] = useAmsPersist('gaPackages', () => gaDefaultPackages(wtb));
  const p65 = useMemoGA(() => (window.AMS_CANON && window.AMS_CANON.psak65) ? window.AMS_CANON.psak65(wtb, packages) : null, [wtb, packages]);
  const seedSubs = useMemoGA(() => (window.AMS_CANON && window.AMS_CANON.psak65) ? window.AMS_CANON.psak65(wtb, {}).subs : [], [wtb]);
  const [comps, setComps] = useAmsPersist('gaComps', () => GA_COMPONENTS);
  const [findings] = useAmsPersist('gaFindings', () => GA_FINDINGS);
  const [elimVerify, setElimVerify] = useAmsPersist('gaElimVerify', () => ({}));
  const [procDone, setProcDone] = useAmsPersist('gaConsolProc', () => ({}));
  const [tab, setTab] = useStateGA('scope');
  const [selId, setSelId] = useStateGA('CP-03');
  const sel = comps.find(c => c.id === selId);

  const covered = comps.filter(c => c.scope !== 'Analytical');
  const revCoverage = covered.reduce((s, c) => s + c.revPct, 0);
  const astCoverage = covered.reduce((s, c) => s + c.astPct, 0);
  const compAuditors = new Set(comps.filter(c => c.kap).map(c => c.auditor)).size;
  const kapComps = comps.filter(c => c.kap);
  const pkgReceived = kapComps.filter(c => c.instr === 'Diterima').length;
  const totalSad = findings.filter(f => f.status === 'Terbuka').reduce((s, f) => s + f.sad, 0);
  const openFindings = findings.filter(f => f.status === 'Terbuka').length;
  const interco = p65 ? p65.interco : [];
  const openElim = interco.filter(e => !(elimVerify[e.id] || e.status === 'Diverifikasi')).length;
  const pkgApproved = p65 ? p65.pkgApproved : 0;
  const pkgTotal = p65 ? p65.subs.length : 0;

  const setScope = (id, scope) => setComps(list => list.map(c => c.id === id ? { ...c, scope, mat: scope === 'Analytical' ? 0 : (c.mat || Math.round(GROUP_MAT * 0.35)) } : c));
  const setComp = (id, patch) => setComps(list => list.map(c => c.id === id ? { ...c, ...patch } : c));

  const tabs = [
    { id: 'scope', label: 'Struktur & Lingkup', count: comps.length },
    { id: 'instr', label: 'Group Instructions', count: kapComps.length },
    { id: 'auditor', label: 'Auditor Komponen', count: compAuditors },
    { id: 'packages', label: 'Paket Pelaporan', count: pkgTotal },
    { id: 'consol', label: 'Konsolidasi & Eliminasi', count: interco.length },
    { id: 'elimwp', label: 'Reviu Eliminasi (SA 600)', count: openElim },
    { id: 'findings', label: 'Temuan & Kesimpulan', count: openFindings },
  ];

  return (
    <>
      <SubBar moduleId="groupaudit" right={
        <div className="row gap8 ac">
          <Badge kind="blue">SA 600 (Revisi)</Badge>
          <Btn sm onClick={() => nav('psak65', { from: 'groupaudit' })}><I.columns size={13} /> Konsolidasi PSAK 65</Btn>
          <Btn sm><I.send size={13} /> Kirim Group Instructions</Btn>
          <Btn sm variant="primary"><I.download size={14} /> Group Audit Memo</Btn>
        </div>
      } />
      <div className="view-scroll">
        <div className="view-pad">
          {/* KPI row */}
          <div className="grid" style={{ gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginBottom: 12 }}>
            <Panel><div style={{ padding: '11px 14px' }}><Stat value={comps.length} label="Komponen Grup" /></div></Panel>
            <Panel><div style={{ padding: '11px 14px' }}><Stat value={revCoverage + '%'} label="Cakupan Pendapatan" accent={revCoverage >= 90 ? 'var(--green)' : 'var(--amber)'} /></div></Panel>
            <Panel><div style={{ padding: '11px 14px' }}><Stat value={astCoverage + '%'} label="Cakupan Aset" accent={astCoverage >= 85 ? 'var(--green)' : 'var(--amber)'} /></div></Panel>
            <Panel><div style={{ padding: '11px 14px' }}><Stat value={pkgApproved + '/' + pkgTotal} label="Paket Disetujui" accent={pkgApproved === pkgTotal ? 'var(--green)' : 'var(--amber)'} /></div></Panel>
            <Panel><div style={{ padding: '11px 14px' }}><Stat value={'Rp ' + fmt(totalSad / 1e6, 0) + ' jt'} label="SAD Grup Terbuka" accent={totalSad > GROUP_MAT ? 'var(--red)' : 'var(--amber)'} /></div></Panel>
          </div>

          <Panel noBody>
            <div className="panel-h" style={{ padding: 0, background: 'var(--surface-2)' }}><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>

            {tab === 'scope' && <GAScope {...{ comps, fmt, selId, setSelId, sel, setScope, setComp, revCoverage, astCoverage }} />}
            {tab === 'instr' && <GAInstr {...{ comps: kapComps, setComp, fmt }} />}
            {tab === 'auditor' && <GAAuditor {...{ comps: kapComps, setComp }} />}
            {tab === 'packages' && <GAPackages {...{ p65, packages, setPackages, seedSubs, fmt, nav, gotoTab: setTab }} />}
            {tab === 'consol' && <GAConsol {...{ p65, fmt, nav, gotoTab: setTab }} />}
            {tab === 'elimwp' && <GAElimReview {...{ p65, fmt, nav, elimVerify, setElimVerify, procDone, setProcDone }} />}
            {tab === 'findings' && <GAFindings {...{ findings, totalSad, fmt }} />}
          </Panel>

          <div className="tiny muted" style={{ marginTop: 8, lineHeight: 1.5 }}>
            SA 600 (Revisi): tim audit grup bertanggung jawab atas arah, supervisi, dan pelaksanaan audit grup — termasuk penentuan lingkup berbasis risiko, komunikasi dua arah dengan auditor komponen, evaluasi kecukupan bukti, serta agregasi temuan ke tingkat laporan keuangan konsolidasian.
          </div>
        </div>
      </div>
    </>
  );
}

/* ===== TAB 1 — STRUKTUR & LINGKUP ============================== */
function GAScope({ comps, fmt, selId, setSelId, sel, setScope, setComp, revCoverage, astCoverage }) {
  return (
    <div style={{ padding: 14 }}>
      <StdVersionStrip highlight="SA 600" />
      {/* group structure tree */}
      <div className="tiny muted upper" style={{ marginBottom: 8 }}>Struktur Grup — PT Sentosa Group (konsolidasian)</div>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(5,1fr)', gap: 8, marginBottom: 16 }}>
        {comps.map(c => (
          <div key={c.id} onClick={() => setSelId(c.id)}
            className="panel" style={{ padding: 0, cursor: 'pointer', overflow: 'hidden', outline: c.id === selId ? '2px solid var(--blue)' : 'none', outlineOffset: -1 }}>
            <div style={{ height: 4, background: gaRisk(c.risk) }} />
            <div style={{ padding: '9px 11px' }}>
              <div className="row ac jb" style={{ marginBottom: 6 }}>
                <span style={{ width: 26, height: 26, borderRadius: 7, background: c.role.startsWith('Induk') ? 'var(--navy)' : 'var(--surface-3)', color: c.role.startsWith('Induk') ? '#fff' : 'var(--ink-2)', display: 'grid', placeItems: 'center', fontSize: 9.5, fontWeight: 800 }}>{c.own}%</span>
                <Badge kind={SCOPE_KIND[c.scope]}>{c.scope}</Badge>
              </div>
              <div style={{ fontWeight: 700, fontSize: 12, lineHeight: 1.25 }}>{c.name}</div>
              <div className="tiny muted" style={{ marginTop: 2 }}>{c.role}</div>
              <div className="row ac gap6 tiny muted" style={{ marginTop: 6 }}>
                <I.building size={11} />{c.country} · {c.ccy}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 300px', gap: 12, alignItems: 'start' }}>
        <Panel noBody>
          <div className="panel-h"><h3>Penentuan Lingkup (Scoping) Berbasis Risiko</h3><div style={{ flex: 1 }} /><span className="tiny muted">Group materiality Rp {fmt(GROUP_MAT / 1e9, 1)} M · PM Rp {fmt(GROUP_PM / 1e9, 1)} M</span></div>
          <table className="dtbl">
            <thead><tr>
              <th>Komponen</th><th className="num">% Pdpt</th><th className="num">% Aset</th><th>Signifikansi</th><th style={{ width: 100 }}>Lingkup</th><th className="num">Komp. Mat.</th><th style={{ width: 100 }}>Status</th>
            </tr></thead>
            <tbody>
              {comps.map(c => (
                <tr key={c.id} className={c.id === selId ? 'sel' : ''} onClick={() => setSelId(c.id)} style={{ cursor: 'pointer' }}>
                  <td>
                    <div className="row ac gap8">
                      <span style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--navy)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 9, fontWeight: 700, flex: '0 0 24px' }}>{c.own}%</span>
                      <div style={{ minWidth: 0 }}><div className="truncate" style={{ fontWeight: 600, maxWidth: 170, fontSize: 12 }}>{c.name}</div><div className="tiny muted">{c.auditor}</div></div>
                    </div>
                  </td>
                  <td className="num">{c.revPct}%</td>
                  <td className="num">{c.astPct}%</td>
                  <td><span className="tiny" style={{ color: c.sig.includes('risiko') ? 'var(--red)' : c.sig.includes('ukuran') ? 'var(--blue)' : 'var(--ink-3)', fontWeight: 600 }}>{c.sig}</span></td>
                  <td><Badge kind={SCOPE_KIND[c.scope]}>{c.scope}</Badge></td>
                  <td className="num">{c.mat ? fmt(c.mat / 1e6, 0) + ' jt' : '—'}</td>
                  <td><Badge kind={STATUS_KIND_GA[c.status]}>{c.status}</Badge></td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr><td>CAKUPAN LINGKUP (Full + Specific)</td><td className="num">{revCoverage}%</td><td className="num">{astCoverage}%</td><td colSpan={4}></td></tr></tfoot>
          </table>
        </Panel>

        <div className="grid" style={{ gap: 12 }}>
          <Panel title="Cakupan Audit Grup">
            <div className="row" style={{ justifyContent: 'space-around' }}>
              {[['Pendapatan', revCoverage], ['Aset', astCoverage]].map(([l, v]) => (
                <div key={l} style={{ textAlign: 'center' }}>
                  <Donut segments={[{ value: v, color: v >= 90 ? '#1f7a4d' : '#9a6a00' }, { value: 100 - v, color: '#e7ebef' }]} size={84} thickness={12}
                    center={<div className="mono" style={{ fontSize: 16, fontWeight: 700, color: 'var(--navy)' }}>{v}%</div>} />
                  <div className="tiny muted" style={{ marginTop: 4 }}>{l}</div>
                </div>
              ))}
            </div>
            <div className="divider" />
            <div className="tiny muted" style={{ lineHeight: 1.5 }}>Cakupan lingkup audit (full + specific) untuk komponen signifikan. Target cakupan grup ≥ 85%.</div>
          </Panel>

          {sel && (
            <Panel noBody>
              <div style={{ background: 'var(--surface-2)', padding: '11px 14px', borderBottom: '1px solid var(--line)' }}>
                <div className="row ac gap8"><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{sel.id}</span><Badge kind={STATUS_KIND_GA[sel.status]}>{sel.status}</Badge></div>
                <div style={{ fontWeight: 700, fontSize: 13, marginTop: 3 }}>{sel.name}</div>
              </div>
              <div style={{ padding: 14 }}>
                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                  <KvBox label="Kepemilikan" v={sel.own + '%'} />
                  <KvBox label="Komp. Materiality" v={sel.mat ? 'Rp ' + fmt(sel.mat / 1e6, 0) + ' jt' : '—'} />
                  <KvBox label="Auditor" v={sel.auditor} />
                  <KvBox label="Tingkat Risiko" v={sel.risk} accent={gaRisk(sel.risk)} />
                </div>
                <div className="tiny muted upper" style={{ marginBottom: 6 }}>Tentukan Lingkup</div>
                <div className="seg" style={{ width: '100%' }}>
                  {['Full', 'Specific', 'Analytical'].map(s => (
                    <button key={s} className={sel.scope === s ? 'on' : ''} style={{ flex: 1 }} onClick={() => setScope(sel.id, s)}>{s}</button>
                  ))}
                </div>
                <div className="panel" style={{ padding: '9px 11px', background: 'var(--blue-050)', borderColor: 'transparent', marginTop: 12 }}>
                  <div className="tiny" style={{ lineHeight: 1.5 }}>
                    {sel.scope === 'Full' ? 'Full scope: audit atas informasi keuangan komponen menggunakan komponen materialitas.'
                      : sel.scope === 'Specific' ? 'Specific scope: prosedur atas saldo/transaksi/pengungkapan tertentu yang berisiko signifikan.'
                        : 'Analytical: prosedur analitis tingkat grup atas komponen tidak signifikan.'}
                  </div>
                </div>
              </div>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}

/* ===== TAB 2 — GROUP INSTRUCTIONS ============================= */
const INSTR_CONTENT = ['Lingkup & materialitas komponen', 'Risiko signifikan tingkat grup', 'Timeline & format reporting package', 'Konfirmasi independensi & etika', 'Daftar transaksi antar-perusahaan', 'Kebijakan akuntansi grup (PSAK)'];

function GAInstr({ comps, setComp, fmt }) {
  const advance = (c) => {
    const next = Math.min(c.step + 1, INSTR_STEPS.length);
    const instr = next >= 4 ? 'Diterima' : 'Terkirim';
    const status = next >= 5 ? 'Reviewed' : next >= 4 ? 'Reporting' : 'Instructions';
    setComp(c.id, { step: next, instr, status });
  };
  return (
    <div style={{ padding: 14, display: 'grid', gap: 12 }}>
      {comps.map(c => (
        <div key={c.id} className="panel" style={{ padding: 14, borderLeft: '3px solid ' + (c.step >= 5 ? 'var(--green)' : c.step >= 4 ? 'var(--blue)' : 'var(--amber)') }}>
          <div className="row jb ac" style={{ marginBottom: 12 }}>
            <div className="row ac gap8">
              <span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{c.id}</span>
              <span style={{ fontWeight: 700, fontSize: 13 }}>{c.name}</span>
              <Badge kind={SCOPE_KIND[c.scope]}>{c.scope}</Badge>
              <span className="tiny muted">· {c.auditor} ({c.country})</span>
            </div>
            <Badge kind={c.instr === 'Diterima' ? 'green' : c.instr === 'Terkirim' ? 'blue' : 'gray'}>{c.instr === '—' ? 'Belum dikirim' : c.instr}</Badge>
          </div>

          {/* milestone stepper */}
          <div className="row" style={{ alignItems: 'flex-start', marginBottom: 12 }}>
            {INSTR_STEPS.map((s, i) => {
              const done = i < c.step, active = i === c.step;
              return (
                <div key={s} style={{ flex: 1, position: 'relative', textAlign: 'center' }}>
                  {i > 0 && <div style={{ position: 'absolute', top: 11, right: '50%', width: '100%', height: 2, background: i <= c.step ? 'var(--blue)' : 'var(--line)' }} />}
                  <div style={{ position: 'relative', width: 22, height: 22, borderRadius: '50%', margin: '0 auto', display: 'grid', placeItems: 'center', background: done ? 'var(--blue)' : active ? '#fff' : 'var(--surface-3)', border: active ? '2px solid var(--blue)' : done ? '2px solid var(--blue)' : '2px solid var(--line)', color: done ? '#fff' : 'var(--ink-3)' }}>
                    {done ? <I.check size={12} /> : <span className="mono" style={{ fontSize: 10, fontWeight: 700 }}>{i + 1}</span>}
                  </div>
                  <div className="tiny" style={{ marginTop: 5, fontWeight: i <= c.step ? 600 : 400, color: i <= c.step ? 'var(--ink)' : 'var(--ink-4)' }}>{s}</div>
                </div>
              );
            })}
          </div>

          <div className="divider" />
          <div className="grid" style={{ gridTemplateColumns: '1.6fr 1fr', gap: 16, alignItems: 'center' }}>
            <div>
              <div className="tiny muted upper" style={{ marginBottom: 6 }}>Isi Group Instruction Package (SA 600 ¶40)</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 14px' }}>
                {INSTR_CONTENT.map((t, i) => (
                  <div key={i} className="row ac gap6 tiny"><span style={{ color: c.step >= 1 ? 'var(--green)' : 'var(--ink-4)' }}>{c.step >= 1 ? <I.check size={12} /> : <I.doc size={12} />}</span>{t}</div>
                ))}
              </div>
            </div>
            <div className="row gap8 ac" style={{ justifyContent: 'flex-end' }}>
              {c.step >= 5
                ? <div className="tiny" style={{ color: 'var(--green)', fontWeight: 600 }}><I.checkCircle size={13} style={{ verticalAlign: 'middle' }} /> Clearance selesai — bukti memadai</div>
                : <Btn sm variant="primary" onClick={() => advance(c)}>
                  {c.step === 0 ? <><I.send size={13} /> Kirim Instruksi</> : c.step >= 4 ? <><I.check size={13} /> Catat Clearance</> : c.step >= 3 ? <><I.download size={13} /> Terima Reporting Package</> : <><I.arrowRight size={13} /> Lanjut: {INSTR_STEPS[c.step]}</>}
                </Btn>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ===== TAB 3 — EVALUASI AUDITOR KOMPONEN ====================== */
const EV_DIMS = [['Independensi & etika', 'evInd'], ['Kompetensi profesional', 'evComp'], ['Pemahaman regulasi lokal', 'evReg']];

function GAAuditor({ comps, setComp }) {
  const evColor = v => v >= 4 ? 'var(--green)' : v >= 3 ? 'var(--amber)' : 'var(--red)';
  return (
    <div style={{ padding: 14 }}>
      <div className="tiny muted" style={{ marginBottom: 12, lineHeight: 1.5 }}>
        Evaluasi pemahaman tim grup atas auditor komponen (SA 600 ¶19–20): independensi, kompetensi profesional, dan pemahaman lingkungan regulasi. Tingkat keterlibatan tim grup ditentukan berdasarkan signifikansi komponen dan hasil evaluasi.
      </div>
      <div className="grid" style={{ gap: 12 }}>
        {comps.map(c => {
          const avg = ((c.evInd + c.evComp + c.evReg) / 3);
          const reliable = avg >= 3.5;
          return (
            <div key={c.id} className="panel" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="row jb ac" style={{ padding: '11px 14px', background: 'var(--surface-2)', borderBottom: '1px solid var(--line)' }}>
                <div className="row ac gap8">
                  <span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{c.id}</span>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>{c.auditor}</span>
                  <span className="tiny muted">→ {c.name} · {c.country}</span>
                </div>
                <span className="badge" style={{ background: reliable ? 'var(--green)' : 'var(--amber)', color: '#fff' }}>Skor {avg.toFixed(1)}/5</span>
              </div>
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr 1.2fr', gap: 16, padding: 14, alignItems: 'center' }}>
                {EV_DIMS.map(([lbl, key]) => {
                  const v = c[key];
                  return (
                    <div key={key}>
                      <div className="row jb ac" style={{ marginBottom: 4 }}>
                        <span className="tiny" style={{ fontWeight: 600 }}>{lbl}</span>
                        <span className="mono tiny" style={{ fontWeight: 700, color: evColor(v) }}>{v}/5</span>
                      </div>
                      <div className="row gap4">
                        {[1, 2, 3, 4, 5].map(n => <button key={n} onClick={() => setComp(c.id, { [key]: n })} style={{ flex: 1, height: 13, borderRadius: 3, border: 0, cursor: 'pointer', background: n <= v ? evColor(v) : 'var(--surface-3)' }} />)}
                      </div>
                    </div>
                  );
                })}
                <div className="panel" style={{ padding: '9px 11px', background: reliable ? 'var(--green-bg)' : 'var(--amber-bg)', borderColor: 'transparent' }}>
                  <div className="tiny muted upper" style={{ marginBottom: 2 }}>Keputusan Keterlibatan</div>
                  <div className="tiny" style={{ fontWeight: 600, color: reliable ? 'var(--green)' : 'var(--amber)', lineHeight: 1.4 }}>
                    {reliable ? 'Dapat diandalkan — review terbatas atas kertas kerja kunci.' : 'Keandalan terbatas — keterlibatan langsung tim grup pada area berisiko.'}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ===== TAB 3.5 (BARU) — PAKET PELAPORAN KOMPONEN (IMPOR) ====== */
function GAPackages({ p65, packages, setPackages, seedSubs, fmt, nav, gotoTab }) {
  if (!p65) return <div style={{ padding: 24 }} className="muted">Memuat paket pelaporan (AMS_CANON.psak65)…</div>;
  const [editId, setEditId] = useStateGA(null);
  const [impId, setImpId] = useStateGA(null);
  const [impText, setImpText] = useStateGA('');
  const [impErr, setImpErr] = useStateGA('');

  const todayStr = () => new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  const setPkg = (id, patch) => setPackages(m => ({ ...m, [id]: { ...m[id], ...patch } }));
  const setField = (id, k, val) => setPkg(id, { [k]: (val === '' ? 0 : Number(val)) });
  const setStatus = (id, status) => setPackages(m => {
    const cur = m[id] || {};
    const received = cur.received || (status !== 'Ditolak' ? todayStr() : null);
    return { ...m, [id]: { ...cur, status, received } };
  });
  const resetSeed = (id) => { const s = seedSubs.find(x => x.id === id); if (!s) return; const f = {}; PKG_NUM_KEYS.forEach(k => f[k] = s[k]); setPkg(id, f); };
  const resetAll = () => setPackages(m => { const n = {}; seedSubs.forEach(s => { const f = { status: (m[s.id] && m[s.id].status) || 'Diterima', received: (m[s.id] && m[s.id].received) || null }; PKG_NUM_KEYS.forEach(k => f[k] = s[k]); n[s.id] = f; }); return n; });
  const approveBalanced = () => setPackages(m => { const n = { ...m }; p65.subs.forEach(s => { if (s.balanced) n[s.id] = { ...n[s.id], status: 'Disetujui', received: (n[s.id] && n[s.id].received) || todayStr() }; }); return n; });
  const fillTemplate = (id) => { const pk = packages[id] || {}; const t = {}; PKG_NUM_KEYS.forEach(k => t[k] = pk[k]); t.status = pk.status; setImpId(id); setImpText(JSON.stringify(t, null, 2)); setImpErr(''); };
  const applyImport = (id) => {
    try {
      const obj = JSON.parse(impText);
      if (!obj || typeof obj !== 'object' || Array.isArray(obj)) throw new Error('bukan objek paket');
      const patch = {};
      PKG_NUM_KEYS.forEach(k => { if (typeof obj[k] === 'number' && isFinite(obj[k])) patch[k] = obj[k]; });
      if (typeof obj.status === 'string' && PKG_STATUS_KIND[obj.status]) patch.status = obj.status;
      if (typeof obj.received === 'string') patch.received = obj.received;
      if (!Object.keys(patch).length) throw new Error('tidak ada field figur yang dikenali');
      setPkg(id, patch); setImpId(null); setImpText(''); setImpErr('');
    } catch (e) { setImpErr('JSON tidak valid — ' + (e.message || 'parse error')); }
  };

  const c = p65.pkgCounts || {};
  const consolFinal = p65.pkgAllApproved && p65.pkgAllBalanced;
  const subs = p65.subs;

  const StatusActions = ({ s }) => {
    const id = s.id, st = s.pkgStatus;
    if (st === 'Disetujui') return <Btn sm onClick={() => setStatus(id, 'Direkonsiliasi')}><I.x size={11} /> Buka kembali</Btn>;
    if (st === 'Ditolak') return <Btn sm variant="primary" onClick={() => setStatus(id, 'Diterima')}><I.upload size={11} /> Terima ulang</Btn>;
    if (st === 'Direkonsiliasi') return (
      <div className="row gap6 ac">
        {s.balanced
          ? <Btn sm variant="primary" onClick={() => setStatus(id, 'Disetujui')}><I.checkCircle size={11} /> Setujui</Btn>
          : <span className="tiny" style={{ color: 'var(--red)', fontWeight: 600 }}>Belum menutup</span>}
        <Btn sm onClick={() => setStatus(id, 'Diterima')}>Kembalikan</Btn>
      </div>
    );
    /* Diterima / Seed */
    return (
      <div className="row gap6 ac">
        <Btn sm variant="primary" onClick={() => setStatus(id, 'Direkonsiliasi')}><I.check size={11} /> Rekonsiliasi</Btn>
        <Btn sm onClick={() => setStatus(id, 'Ditolak')}>Tolak</Btn>
      </div>
    );
  };

  return (
    <div style={{ padding: 14, display: 'grid', gap: 12 }}>
      {/* KPI */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(5,1fr)', gap: 10 }}>
        <KvBox label="Total paket komponen" v={subs.length} accent="var(--navy)" />
        <KvBox label="Diterima — perlu reviu" v={(c.Diterima || 0) + (c.Seed || 0)} accent={(c.Diterima || 0) + (c.Seed || 0) ? 'var(--amber)' : 'var(--green)'} />
        <KvBox label="Direkonsiliasi" v={c.Direkonsiliasi || 0} accent="var(--blue)" />
        <KvBox label="Disetujui" v={(c.Disetujui || 0) + '/' + subs.length} accent={p65.pkgAllApproved ? 'var(--green)' : 'var(--amber)'} />
        <KvBox label="Paket menutup (A=L+E)" v={p65.pkgAllBalanced ? 'Semua ✓' : (subs.filter(s => !s.balanced).length + ' tidak')} accent={p65.pkgAllBalanced ? 'var(--green)' : 'var(--red)'} />
      </div>

      {/* banner + aksi massal */}
      <div className="row ac gap8" style={{ padding: '9px 13px', borderRadius: 9, background: consolFinal ? 'var(--green-bg)' : 'var(--amber-bg)' }}>
        <span style={{ color: consolFinal ? 'var(--green)' : 'var(--amber)' }}>{consolFinal ? <I.checkCircle size={16} /> : <I.alert size={16} />}</span>
        <span className="tiny" style={{ flex: 1, lineHeight: 1.5 }}>
          {consolFinal
            ? <><b>Semua paket siap.</b> Figur konsolidasi ditarik dari paket komponen yang telah disetujui melalui AMS_CANON (sumber kebenaran tunggal).</>
            : <><b>Reviu paket berjalan.</b> Figur yang diimpor/disunting mengalir LIVE ke kertas kerja konsolidasi & PSAK 65. Setujui paket yang sudah menutup untuk finalisasi.</>}
        </span>
        <Btn sm onClick={approveBalanced}><I.checkCircle size={12} /> Setujui yang menutup</Btn>
        <Btn sm onClick={resetAll}><I.upload size={12} /> Reset figur ke seed</Btn>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 300px', gap: 12, alignItems: 'start' }}>
        {/* daftar paket + editor/impor */}
        <Panel noBody>
          <div className="panel-h"><h3>Paket Pelaporan Komponen</h3><span className="sub mono">SA 600 ¶B86 · alur Diterima → Direkonsiliasi → Disetujui</span><div style={{ flex: 1 }} /><span className="tiny muted">Rp juta</span></div>
          <table className="dtbl">
            <thead><tr>
              <th>Komponen & sumber</th><th style={{ width: 78 }}>Diterima</th><th className="num" style={{ width: 78 }}>Aset</th>
              <th className="num" style={{ width: 92 }}>Selisih A−(L+E)</th><th style={{ width: 116 }}>Status</th><th style={{ width: 172 }}></th>
            </tr></thead>
            <tbody>
              {subs.map(s => {
                const pk = packages[s.id] || {};
                const open = editId === s.id, imp = impId === s.id;
                return (
                  <React.Fragment key={s.id}>
                    <tr>
                      <td>
                        <div className="row ac gap8">
                          <span style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--navy)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 9, fontWeight: 700, flex: '0 0 24px' }}>{s.own}%</span>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: 12 }}>{s.name}</div>
                            <div className="tiny muted">{s.auditor} · {s.country} · {s.ccy}{s.ccy !== 'IDR' && <span> @ {fmt(s.fx / 1e3, 1)}k</span>}</div>
                          </div>
                        </div>
                      </td>
                      <td className="tiny">{pk.received || '—'}</td>
                      <td className="num mono">{fmt(s.assets)}</td>
                      <td className="num mono" style={{ fontWeight: 700, color: s.balanced ? 'var(--green)' : 'var(--red)' }}>{s.balanced ? '0 ✓' : fmt(s.internalBal)}</td>
                      <td><Badge kind={PKG_STATUS_KIND[s.pkgStatus] || 'gray'}>{s.pkgStatus === 'Seed' ? 'Seed' : s.pkgStatus}</Badge></td>
                      <td>
                        <div className="row gap6 ac" style={{ justifyContent: 'flex-end' }}>
                          <Btn sm onClick={() => { setEditId(open ? null : s.id); setImpId(null); }}><I.chevDown size={12} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: '.15s' }} /> {open ? 'Tutup' : 'Sunting'}</Btn>
                          <Btn sm onClick={() => imp ? setImpId(null) : fillTemplate(s.id)}><I.upload size={12} /> Impor</Btn>
                        </div>
                      </td>
                    </tr>
                    {(open || imp) && (
                      <tr><td colSpan={6} style={{ background: 'var(--surface-2)', padding: 0 }}>
                        <div style={{ padding: 14, display: 'grid', gap: 12 }}>
                          {open && (
                            <div>
                              <div className="row ac jb" style={{ marginBottom: 8 }}>
                                <div className="tiny upper" style={{ fontWeight: 700, letterSpacing: '.04em', color: 'var(--ink-3)' }}>Sunting figur paket — {s.id}</div>
                                <Btn sm onClick={() => resetSeed(s.id)}><I.upload size={11} /> Reset ke seed</Btn>
                              </div>
                              <div className="grid" style={{ gridTemplateColumns: 'repeat(5,1fr)', gap: 10 }}>
                                {PKG_FIELDS.map(g => (
                                  <div key={g.sec}>
                                    <div className="tiny muted upper" style={{ fontWeight: 700, marginBottom: 5, letterSpacing: '.03em' }}>{g.sec}</div>
                                    <div style={{ display: 'grid', gap: 6 }}>
                                      {g.items.map(([k, lbl]) => (
                                        <label key={k} style={{ display: 'grid', gap: 2 }}>
                                          <span className="tiny muted">{lbl}</span>
                                          <input type="number" value={pk[k] != null ? pk[k] : ''} onChange={e => setField(s.id, k, e.target.value)}
                                            style={{ width: '100%', padding: '5px 7px', border: '1px solid var(--line)', borderRadius: 6, fontSize: 12, fontFamily: 'var(--mono, monospace)', background: 'var(--surface)', color: 'var(--ink)' }} />
                                        </label>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <div className="row ac gap8" style={{ marginTop: 10, padding: '8px 11px', borderRadius: 7, background: s.balanced ? 'var(--green-bg)' : 'var(--red-bg)' }}>
                                <span style={{ color: s.balanced ? 'var(--green)' : 'var(--red)' }}>{s.balanced ? <I.checkCircle size={14} /> : <I.alert size={14} />}</span>
                                <span className="tiny" style={{ flex: 1, lineHeight: 1.5 }}>
                                  Aset Rp {fmt(s.assets)} jt = Liabilitas Rp {fmt(s.liab)} jt + Ekuitas Rp {fmt(s.equityNow)} jt · selisih <b className="mono">{fmt(s.internalBal)}</b> jt. {s.balanced ? 'Paket menutup — siap direkonsiliasi/disetujui.' : 'Paket belum menutup — perbaiki sebelum menyetujui.'}
                                </span>
                              </div>
                            </div>
                          )}
                          {imp && (
                            <div>
                              <div className="tiny upper" style={{ fontWeight: 700, letterSpacing: '.04em', color: 'var(--ink-3)', marginBottom: 6 }}>Impor paket (JSON) — {s.id}</div>
                              <div className="tiny muted" style={{ marginBottom: 6, lineHeight: 1.5 }}>Tempel paket pelaporan komponen dalam format JSON (field figur: {PKG_NUM_KEYS.join(', ')}; opsional <span className="mono">status</span>, <span className="mono">received</span>). Field yang tidak dikenali diabaikan.</div>
                              <textarea value={impText} onChange={e => { setImpText(e.target.value); setImpErr(''); }} spellCheck={false}
                                style={{ width: '100%', minHeight: 150, padding: 10, border: '1px solid var(--line)', borderRadius: 7, fontSize: 11.5, fontFamily: 'var(--mono, monospace)', lineHeight: 1.5, background: 'var(--surface)', color: 'var(--ink)', resize: 'vertical' }} />
                              {impErr && <div className="tiny" style={{ color: 'var(--red)', marginTop: 6, fontWeight: 600 }}><I.alert size={11} style={{ verticalAlign: 'middle' }} /> {impErr}</div>}
                              <div className="row gap8" style={{ marginTop: 8 }}>
                                <Btn sm variant="primary" onClick={() => applyImport(s.id)}><I.upload size={12} /> Impor & terapkan</Btn>
                                <Btn sm onClick={() => { setImpId(null); setImpText(''); setImpErr(''); }}>Batal</Btn>
                              </div>
                            </div>
                          )}
                        </div>
                      </td></tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
          <div className="tiny muted" style={{ padding: '9px 14px 12px', lineHeight: 1.5 }}>Selisih kolom A−(L+E) menguji paket menutup sebelum digabung (PSAK 65 ¶19 · keseragaman & integritas paket). Setiap perubahan figur mengalir LIVE ke <span className="mono">AMS_CANON.psak65</span> → tab Konsolidasi & PSAK 65.</div>
        </Panel>

        {/* right rail */}
        <div className="grid" style={{ gap: 12 }}>
          <Panel noBody>
            <div className="panel-h"><h3>Alur Paket Pelaporan</h3><span className="sub mono">SA 600</span></div>
            <div style={{ padding: 14, display: 'grid', gap: 0 }}>
              {[
                ['Diterima', 'amber', 'Paket masuk dari auditor komponen / tim grup; figur diimpor.'],
                ['Direkonsiliasi', 'blue', 'Diuji menutup (A=L+E) & seragam kebijakan akuntansi grup.'],
                ['Disetujui', 'green', 'Sign-off tim grup; figur masuk konsolidasi final.'],
              ].map((row, i, arr) => (
                <div key={row[0]} className="row gap9" style={{ alignItems: 'flex-start' }}>
                  <div style={{ display: 'grid', justifyItems: 'center', flex: '0 0 16px' }}>
                    <span style={{ width: 11, height: 11, borderRadius: 999, background: 'var(--' + row[1] + ')', marginTop: 3 }} />
                    {i < arr.length - 1 && <span style={{ width: 2, height: 30, background: 'var(--line)' }} />}
                  </div>
                  <div style={{ paddingBottom: i < arr.length - 1 ? 10 : 0 }}>
                    <div className="tiny" style={{ fontWeight: 700 }}>{row[0]}</div>
                    <div className="tiny muted" style={{ lineHeight: 1.4 }}>{row[2]}</div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Keterhubungan">
            <div className="tiny muted" style={{ lineHeight: 1.5, marginBottom: 10 }}>Figur paket → <b>AMS_CANON.psak65</b> → kertas kerja konsolidasi, NCI, goodwill (tie ke PSAK 48), serta LK konsolidasian (FS Generator). Satu sumber, konsisten lintas-modul.</div>
            <div style={{ display: 'grid', gap: 6 }}>
              <Btn sm style={{ width: '100%' }} onClick={() => gotoTab && gotoTab('consol')}><I.columns size={13} /> Lihat kertas kerja konsolidasi</Btn>
              <Btn sm style={{ width: '100%' }} onClick={() => nav('psak65', { from: 'groupaudit' })}><I.building size={13} /> Modul PSAK 65</Btn>
              <Btn sm style={{ width: '100%' }} onClick={() => nav('fsgen', { from: 'groupaudit' })}><I.report size={13} /> FS Generator</Btn>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

/* ===== TAB 4 — KONSOLIDASI & ELIMINASI ======================== */
/* Kertas kerja konsolidasi (re-performance tim audit grup · SA 600 ¶B86).
   SELURUH angka ditarik dari satu sumber kebenaran AMS_CANON.psak65(WTB) —
   identik dengan modul PSAK 65 (entitas induk live dari WTB). */
const ELIM_STAT = { Diverifikasi: 'green', Selisih: 'red', Review: 'amber' };
const ELIM_TYPE_KIND = { Pendapatan: 'blue', Laba: 'purple', Posisi: 'gray', OCI: 'amber' };
const SEC_KEY_GA = { Aset: 'aset', Liabilitas: 'liab', Ekuitas: 'ekuitas' };

function GAConsol({ p65, fmt, nav, gotoTab }) {
  if (!p65) return <div style={{ padding: 24 }} className="muted">Memuat model konsolidasi (AMS_CANON.psak65)…</div>;
  const rp = x => 'Rp ' + fmt(Math.round(x));
  const sgn = x => x < 0 ? '(' + fmt(Math.round(-x)) + ')' : fmt(Math.round(x));
  const balanced = p65.balCheck === 0;
  const gwTie = p65.goodwillTotal === p65.goodwillTie;
  const base = p65.indukSeparate + p65.subsNpat; // basis % kontribusi laba entitas

  const consolFinal = p65.pkgAllApproved && p65.pkgAllBalanced && balanced;

  return (
    <div style={{ padding: 14, display: 'grid', gap: 12 }}>
      {/* gerbang paket pelaporan — konsolidasi final hanya bila semua paket disetujui & menutup */}
      <div className="row ac gap8" style={{ padding: '9px 13px', borderRadius: 9, background: consolFinal ? 'var(--green-bg)' : 'var(--amber-bg)' }}>
        <span style={{ color: consolFinal ? 'var(--green)' : 'var(--amber)' }}>{consolFinal ? <I.checkCircle size={16} /> : <I.alert size={16} />}</span>
        <span className="tiny" style={{ flex: 1, lineHeight: 1.5 }}>
          {consolFinal
            ? <><b>Konsolidasi final.</b> Seluruh {p65.subs.length} paket pelaporan komponen telah diterima, direkonsiliasi & disetujui — figur ditarik dari paket via AMS_CANON (SSOT).</>
            : <><b>Konsolidasi provisional.</b> {p65.pkgApproved}/{p65.subs.length} paket komponen disetujui{!p65.pkgAllBalanced ? ' · ada paket belum menutup (aset ≠ liab + ekuitas)' : ''}. Selesaikan reviu paket sebelum finalisasi.</>}
        </span>
        <Btn sm onClick={() => gotoTab && gotoTab('packages')}><I.upload size={12} /> Paket Pelaporan</Btn>
      </div>
      {/* KPI — diturunkan dari canon */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(5,1fr)', gap: 10 }}>
        <KvBox label="Entitas dikonsolidasi" v={p65.counts.consolidated + ' anak'} accent="var(--navy)" />
        <KvBox label="Total aset konsolidasian" v={rp(p65.totals.aset.konsol) + ' jt'} accent="var(--blue)" />
        <KvBox label="Laba konsolidasi (NPAT)" v={rp(p65.consolNpat) + ' jt'} accent="var(--green)" />
        <KvBox label="Kepentingan nonpengendali" v={rp(p65.nciCloseTotal) + ' jt'} accent="var(--amber)" />
        <KvBox label="Goodwill konsolidasi" v={rp(p65.goodwillTotal) + ' jt'} accent={gwTie ? 'var(--navy)' : 'var(--red)'} />
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 320px', gap: 12, alignItems: 'start' }}>
        {/* worksheet — re-performance LPK */}
        <Panel noBody>
          <div className="panel-h"><h3>Kertas Kerja Konsolidasi — Re-performance (LPK)</h3><div style={{ flex: 1 }} /><span className="tiny muted">Induk + Σ Anak − Eliminasi = Konsolidasian · Rp juta</span></div>
          <table className="dtbl">
            <thead><tr>
              <th>Pos laporan posisi keuangan</th>
              <th className="num" style={{ width: 90 }}>Induk (WTB)</th>
              <th className="num" style={{ width: 78 }}>Σ Anak</th>
              <th className="num" style={{ width: 86 }}>Eliminasi</th>
              <th className="num" style={{ width: 96 }}>Konsolidasian</th>
            </tr></thead>
            <tbody>
              {['Aset', 'Liabilitas', 'Ekuitas'].map(sec => (
                <React.Fragment key={sec}>
                  <tr style={{ background: 'var(--surface-2)' }}><td colSpan={5} className="tiny upper" style={{ fontWeight: 700, letterSpacing: '.04em', color: 'var(--ink-3)' }}>{sec}</td></tr>
                  {p65.ws.filter(r => r.sec === sec).map(r => (
                    <tr key={r.cap} style={{ background: r.gw ? 'var(--blue-050)' : r.nci ? 'var(--amber-bg)' : undefined }}>
                      <td><div className="row ac gap6" style={{ fontSize: 12, fontWeight: r.gw || r.nci ? 700 : 500 }}><span>{r.label}</span>{r.seed && <span className="mono tiny" style={{ color: 'var(--ink-4)' }}>seed</span>}{r.gw && <Badge kind="blue">PSAK 22</Badge>}{r.nci && <Badge kind="amber">NCI</Badge>}</div></td>
                      <td className="num mono">{r.induk ? sgn(r.induk) : '—'}</td>
                      <td className="num mono">{r.anak ? sgn(r.anak) : '—'}</td>
                      <td className="num mono" style={{ color: r.elim ? 'var(--red)' : 'var(--ink-4)' }}>{r.elim ? sgn(r.elim) : '—'}</td>
                      <td className="num mono" style={{ fontWeight: 700, color: r.gw ? 'var(--blue)' : r.nci ? 'var(--amber)' : 'var(--navy)' }}>{sgn(r.konsol)}</td>
                    </tr>
                  ))}
                  <tr style={{ borderTop: '1.5px solid var(--line)' }}>
                    <td style={{ fontWeight: 700, color: 'var(--navy)' }}>Total {sec}</td>
                    <td className="num mono" style={{ fontWeight: 700 }}>{sgn(p65.totals[SEC_KEY_GA[sec]].induk)}</td>
                    <td className="num mono" style={{ fontWeight: 700 }}>{sgn(p65.totals[SEC_KEY_GA[sec]].anak)}</td>
                    <td className="num mono" style={{ fontWeight: 700, color: 'var(--red)' }}>{sgn(p65.totals[SEC_KEY_GA[sec]].elim)}</td>
                    <td className="num mono" style={{ fontWeight: 800, color: 'var(--navy)' }}>{sgn(p65.totals[SEC_KEY_GA[sec]].konsol)}</td>
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>
          <div className="row ac gap8" style={{ padding: '10px 14px', borderTop: '1px solid var(--line-soft)', background: balanced ? 'var(--green-bg)' : 'var(--red-bg)' }}>
            <span style={{ color: balanced ? 'var(--green)' : 'var(--red)' }}>{balanced ? <I.checkCircle size={15} /> : <I.alert size={15} />}</span>
            <span className="tiny" style={{ flex: 1, lineHeight: 1.5 }}>Re-performance tim grup: <b>Aset Rp {fmt(p65.totals.aset.konsol)} jt</b> = Liabilitas Rp {fmt(p65.totals.liab.konsol)} jt + Ekuitas Rp {fmt(p65.totals.ekuitas.konsol)} jt. Selisih <b className="mono">Rp {fmt(p65.balCheck)} jt</b> — kertas kerja menutup.</span>
          </div>
        </Panel>

        {/* right rail */}
        <div className="grid" style={{ gap: 12 }}>
          <Panel title="Status Konsolidasi">
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <KvBox label="Entitas anak" v={p65.counts.consolidated} />
              <KvBox label="Asosiasi/ventura" v={p65.counts.associates} accent="var(--blue)" />
              <KvBox label="Jurnal eliminasi" v={p65.interco.length} />
              <KvBox label="Pos LPK" v={p65.ws.length} />
            </div>
            <div className="panel" style={{ padding: '8px 11px', background: gwTie ? 'var(--green-bg)' : 'var(--red-bg)', borderColor: 'transparent', marginTop: 10 }}>
              <div className="tiny" style={{ fontWeight: 600, color: gwTie ? 'var(--green)' : 'var(--red)', lineHeight: 1.4 }}>
                {gwTie ? <I.checkCircle size={12} style={{ verticalAlign: 'middle' }} /> : <I.alert size={12} style={{ verticalAlign: 'middle' }} />} Goodwill Rp {fmt(p65.goodwillTotal)} jt {gwTie ? 'tie ke PSAK 48 (uji UPK) ✓' : '≠ angka PSAK 48 — telusuri.'}
              </div>
            </div>
            <div className="divider" />
            <div className="tiny muted" style={{ lineHeight: 1.5 }}>Angka ditarik dari <span className="mono">AMS_CANON.psak65(WTB)</span> — identik dengan modul <b>PSAK 65</b>. Setiap AJE pada entitas induk mengalir live ke kertas kerja ini.</div>
            <Btn sm style={{ width: '100%', marginTop: 10 }} onClick={() => nav('psak65', { from: 'groupaudit' })}><I.building size={13} /> Buka modul PSAK 65</Btn>
          </Panel>

          <Panel title={'Translasi FX — ' + p65.translation.name}>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <KvBox label="Kurs penutup" v={'Rp ' + fmt(p65.translation.closeRate)} />
              <KvBox label="Kurs rata-rata" v={'Rp ' + fmt(p65.translation.avgRate)} />
            </div>
            <div className="panel" style={{ padding: '8px 11px', background: 'var(--amber-bg)', borderColor: 'transparent', marginTop: 10 }}>
              <div className="tiny" style={{ fontWeight: 600, color: 'var(--amber)', lineHeight: 1.4 }}><I.alert size={12} style={{ verticalAlign: 'middle' }} /> Selisih kurs translasi (CTA) Rp {fmt(p65.translation.cta)} jt dicatat di OCI — PSAK 10 ¶39, menunggu review tim grup.</div>
            </div>
          </Panel>
        </div>
      </div>

      {/* roll-up laba konsolidasi */}
      <Panel noBody>
        <div className="panel-h"><h3>Roll-Up Konsolidasi — Laba Tahun Berjalan (NPAT)</h3><div style={{ flex: 1 }} /><span className="tiny muted">Rp juta</span></div>
        <table className="dtbl">
          <thead><tr><th>Entitas</th><th>Mata uang</th><th className="num">Kontribusi NPAT</th><th className="num">% Entitas</th></tr></thead>
          <tbody>
            <tr>
              <td><div style={{ fontWeight: 600, fontSize: 12 }}>PT Sentosa Makmur Tbk <span className="tiny muted">(induk · LK terpisah)</span></div><div className="tiny muted">incl. penghasilan dividen anak Rp {fmt(p65.dividendIncome)} jt</div></td>
              <td className="tiny">IDR</td>
              <td className="num mono">{fmt(p65.indukSeparate)}</td>
              <td className="num">{Math.round(p65.indukSeparate / base * 100)}%</td>
            </tr>
            {p65.subs.map(s => (
              <tr key={s.id}>
                <td><div style={{ fontWeight: 600, fontSize: 12 }}>{s.name}</div><div className="tiny muted">{s.role} · {s.country}</div></td>
                <td className="tiny">{s.ccy}{s.ccy !== 'IDR' && <span className="muted"> @ {fmt(s.fx / 1e3, 2)}k</span>}</td>
                <td className="num mono">{fmt(s.npat)}</td>
                <td className="num">{Math.round(s.npat / base * 100)}%</td>
              </tr>
            ))}
            <tr style={{ background: 'var(--surface-2)' }}>
              <td style={{ fontWeight: 700 }}>Subtotal entitas</td><td></td>
              <td className="num mono" style={{ fontWeight: 700 }}>{fmt(base)}</td><td className="num">100%</td>
            </tr>
            <tr>
              <td className="row ac gap6"><I.scale size={13} style={{ color: 'var(--red)' }} /> Eliminasi laba belum terealisasi (persediaan)</td><td></td>
              <td className="num mono" style={{ color: 'var(--red)' }}>({fmt(640)})</td><td></td>
            </tr>
            <tr>
              <td className="tiny muted" style={{ paddingLeft: 22 }}>Eliminasi penghasilan dividen antar-perusahaan</td><td></td>
              <td className="num mono tiny" style={{ color: 'var(--red)' }}>({fmt(2100)})</td><td></td>
            </tr>
          </tbody>
          <tfoot>
            <tr><td style={{ fontWeight: 700, color: 'var(--navy)' }}>NPAT KONSOLIDASIAN</td><td></td><td className="num mono" style={{ fontWeight: 800, color: 'var(--navy)' }}>{fmt(p65.consolNpat)}</td><td></td></tr>
            <tr><td className="tiny muted" style={{ paddingLeft: 14 }}>— Diatribusikan ke pemilik induk</td><td></td><td className="num mono tiny" style={{ fontWeight: 600 }}>{fmt(p65.ownersProfit)}</td><td></td></tr>
            <tr><td className="tiny muted" style={{ paddingLeft: 14 }}>— Diatribusikan ke NCI</td><td></td><td className="num mono tiny" style={{ fontWeight: 600, color: 'var(--amber)' }}>{fmt(p65.nciProfit)}</td><td></td></tr>
          </tfoot>
        </table>
        <button onClick={() => nav('fsgen', { from: 'groupaudit' })} className="row ac jb" style={{ padding: '10px 14px', borderTop: '1px solid var(--line-soft)', background: 'var(--surface-2)', cursor: 'pointer', width: '100%', textAlign: 'left', border: 'none' }}>
          <span className="tiny" style={{ lineHeight: 1.5 }}>NPAT konsolidasian & LPK mengalir ke <b>FS Generator</b> untuk penyajian laporan keuangan konsolidasian. Reviu rincian jurnal eliminasi pada tab <b>Reviu Eliminasi (SA 600)</b>.</span>
          <I.arrowRight size={13} style={{ color: 'var(--ink-4)' }} />
        </button>
      </Panel>
    </div>
  );
}

/* ===== TAB 5 (BARU) — REVIU ELIMINASI (SA 600) ================ */
function GAElimReview({ p65, fmt, nav, elimVerify, setElimVerify, procDone, setProcDone }) {
  if (!p65) return <div style={{ padding: 24 }} className="muted">Memuat model konsolidasi (AMS_CANON.psak65)…</div>;
  const rp = x => 'Rp ' + fmt(Math.round(x));
  const stat = e => (elimVerify[e.id] || e.status === 'Diverifikasi') ? 'Diverifikasi' : e.status;
  const toggleVerify = id => setElimVerify(m => ({ ...m, [id]: !m[id] }));
  const verifiedCount = p65.interco.filter(e => stat(e) === 'Diverifikasi').length;
  const elm03 = p65.interco.find(e => e.id === 'ELM-03') || { amount: 3200, diff: 180 };

  /* rekonsiliasi saldo antar-perusahaan — total & selisih dari canon (ELM-03);
     rincian penyebab dinormalkan agar Σ = selisih kanonik. */
  const arRecorded = elm03.amount;                 // piutang antar-pr. dibukukan induk
  const apRecorded = elm03.amount - (elm03.diff || 0); // utang antar-pr. dibukukan anak
  const reconCauses = [
    { t: 'Barang dalam perjalanan (FOB) belum diterima anak', v: 120 },
    { t: 'Nota debit retur belum dibukukan komponen', v: (elm03.diff || 180) - 120 },
  ];

  /* checklist prosedur */
  const procPct = Math.round(GA_CONSOL_PROC.filter((p, i) => procDone[p.ref + i]).length / GA_CONSOL_PROC.length * 100);
  const toggleProc = (key) => setProcDone(m => ({ ...m, [key]: !m[key] }));

  return (
    <div style={{ padding: 14, display: 'grid', gap: 12 }}>
      {/* KPI */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
        <KvBox label="Jurnal eliminasi" v={p65.interco.length} />
        <KvBox label="Terverifikasi" v={verifiedCount + '/' + p65.interco.length} accent={verifiedCount === p65.interco.length ? 'var(--green)' : 'var(--amber)'} />
        <KvBox label="Selisih belum direkonsiliasi" v={rp(elm03.diff || 0) + ' jt'} accent={(elm03.diff || 0) > 0 ? 'var(--red)' : 'var(--green)'} />
        <KvBox label="Prosedur reviu selesai" v={procPct + '%'} accent={procPct === 100 ? 'var(--green)' : 'var(--amber)'} />
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 320px', gap: 12, alignItems: 'start' }}>
        <div className="grid" style={{ gap: 12 }}>
          {/* eliminasi investasi (PSAK 22) */}
          <Panel noBody>
            <div className="panel-h"><h3>Eliminasi Investasi vs Ekuitas Anak</h3><span className="sub mono">metode akuisisi · PSAK 22 ¶32</span><div style={{ flex: 1 }} /><span className="tiny muted">Rp juta</span></div>
            <table className="dtbl">
              <tbody>
                <tr><td style={{ fontSize: 12, fontWeight: 600 }}>Dr · Modal saham anak (100%)</td><td className="num mono" style={{ fontWeight: 700 }}>{fmt(p65.subs.reduce((a, s) => a + s.modal, 0))}</td><td style={{ width: 90 }}></td></tr>
                <tr><td style={{ fontSize: 12, fontWeight: 600 }}>Dr · Saldo laba pra-akuisisi anak</td><td className="num mono" style={{ fontWeight: 700 }}>{fmt(p65.subs.reduce((a, s) => a + s.rePre, 0))}</td><td></td></tr>
                <tr style={{ background: 'var(--blue-050)' }}><td style={{ fontSize: 12, fontWeight: 700 }}>Dr · Goodwill (selisih lebih)</td><td className="num mono" style={{ fontWeight: 700, color: 'var(--blue)' }}>{fmt(p65.goodwillTotal)}</td><td></td></tr>
                <tr><td style={{ fontSize: 12, paddingLeft: 18 }}>Cr · Investasi pada entitas anak</td><td></td><td className="num mono" style={{ fontWeight: 700 }}>{fmt(p65.costTotal)}</td></tr>
                <tr style={{ background: 'var(--amber-bg)' }}><td style={{ fontSize: 12, paddingLeft: 18, fontWeight: 700 }}>Cr · Kepentingan nonpengendali (akuisisi)</td><td></td><td className="num mono" style={{ fontWeight: 700, color: 'var(--amber)' }}>{fmt(p65.nciAcqTotal)}</td></tr>
              </tbody>
            </table>
            <div className="tiny muted" style={{ padding: '9px 14px 12px', lineHeight: 1.5 }}>Tim grup me-re-perform eliminasi: investasi induk (biaya perolehan Rp {fmt(p65.costTotal)} jt) dieliminasi terhadap ekuitas anak pada tanggal akuisisi; selisih lebih = <b>goodwill Rp {fmt(p65.goodwillTotal)} jt</b>; NCI diukur proporsional atas aset neto teridentifikasi (¶19).</div>
          </Panel>

          {/* register jurnal eliminasi + sign-off */}
          <Panel noBody>
            <div className="panel-h"><h3>Register Jurnal Eliminasi Antar-Perusahaan</h3><span className="sub mono">PSAK 65 ¶B86</span><div style={{ flex: 1 }} /><span className="tiny muted">tandai “Verifikasi” untuk sign-off</span></div>
            <table className="dtbl">
              <thead><tr><th style={{ width: 60 }}>ID</th><th>Deskripsi & jurnal (Dr/Cr)</th><th style={{ width: 92 }}>Tipe</th><th className="num" style={{ width: 64 }}>Nilai</th><th style={{ width: 104 }}>Status</th><th style={{ width: 108 }}></th></tr></thead>
              <tbody>
                {p65.interco.map(e => {
                  const st = stat(e);
                  return (
                    <tr key={e.id}>
                      <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{e.id}</td>
                      <td>
                        <div className="tiny" style={{ fontWeight: 600 }}>{e.desc}</div>
                        <div className="tiny muted">Dr {e.dr} · Cr {e.cr}{e.diff ? <span style={{ color: 'var(--red)' }}> · selisih Rp {fmt(e.diff)} jt belum direkonsiliasi</span> : ''}</div>
                      </td>
                      <td><Badge kind={ELIM_TYPE_KIND[e.type] || 'gray'}>{e.type}</Badge></td>
                      <td className="num mono">{fmt(e.amount)}</td>
                      <td><Badge kind={ELIM_STAT[st]}>{st}</Badge></td>
                      <td>
                        {st === 'Diverifikasi'
                          ? <Btn sm onClick={() => toggleVerify(e.id)}><I.checkCircle size={12} /> Sign-off</Btn>
                          : <Btn sm variant="primary" onClick={() => toggleVerify(e.id)}><I.check size={12} /> Verifikasi</Btn>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="tiny muted" style={{ padding: '9px 14px 12px', lineHeight: 1.5 }}>Eliminasi & penyesuaian ditarik dari <span className="mono">AMS_CANON.psak65.interco</span> — sumber yang sama dipakai modul PSAK 65. Status sign-off disimpan sebagai overlay kertas kerja audit grup.</div>
          </Panel>

          {/* rekonsiliasi saldo antar-perusahaan */}
          <Panel noBody>
            <div className="panel-h"><h3>Rekonsiliasi Saldo Antar-Perusahaan</h3><span className="sub mono">ELM-03 · piutang vs utang</span><div style={{ flex: 1 }} /><span className="tiny muted">Rp juta</span></div>
            <table className="dtbl">
              <tbody>
                <tr><td style={{ fontSize: 12 }}>Piutang usaha antar-pr. dibukukan <b>Induk</b></td><td className="num mono" style={{ fontWeight: 700 }}>{fmt(arRecorded)}</td></tr>
                <tr><td style={{ fontSize: 12 }}>Utang usaha antar-pr. dibukukan <b>komponen anak</b></td><td className="num mono" style={{ fontWeight: 700 }}>({fmt(apRecorded)})</td></tr>
                <tr style={{ background: (elm03.diff || 0) ? 'var(--red-bg)' : 'var(--green-bg)' }}><td style={{ fontSize: 12, fontWeight: 700 }}>Selisih belum direkonsiliasi</td><td className="num mono" style={{ fontWeight: 800, color: (elm03.diff || 0) ? 'var(--red)' : 'var(--green)' }}>{fmt(elm03.diff || 0)}</td></tr>
                <tr><td colSpan={2} className="tiny upper" style={{ background: 'var(--surface-2)', fontWeight: 700, letterSpacing: '.04em', color: 'var(--ink-3)' }}>Penyebab teridentifikasi</td></tr>
                {reconCauses.map((c, i) => (
                  <tr key={i}><td className="tiny" style={{ paddingLeft: 18 }}>{c.t}</td><td className="num mono tiny">{fmt(c.v)}</td></tr>
                ))}
              </tbody>
            </table>
            <div className="row ac gap8" style={{ padding: '9px 14px', borderTop: '1px solid var(--line-soft)', background: 'var(--amber-bg)' }}>
              <span style={{ color: 'var(--amber)' }}><I.alert size={15} /></span>
              <span className="tiny" style={{ flex: 1, lineHeight: 1.5 }}>Selisih <b>Rp {fmt(elm03.diff || 0)} jt</b> perlu konfirmasi saldo & rekonsiliasi sebelum finalisasi (SA 505 · PSAK 7).</span>
              <Btn sm onClick={() => nav('confirm', { from: 'groupaudit' })}><I.mail size={12} /> Konfirmasi</Btn>
              <Btn sm onClick={() => nav('related', { from: 'groupaudit' })}><I.link2 size={12} /> Pihak Berelasi</Btn>
            </div>
          </Panel>
        </div>

        {/* right rail */}
        <div className="grid" style={{ gap: 12 }}>
          {/* NCI roll-forward */}
          <Panel noBody>
            <div className="panel-h"><h3>Roll-Forward NCI</h3><span className="sub mono">¶B94</span></div>
            <div style={{ padding: 14, display: 'grid', gap: 8 }}>
              <div className="row jb ac"><span className="tiny">NCI pada tanggal akuisisi</span><span className="mono" style={{ fontWeight: 600 }}>{fmt(p65.nciAcqTotal)} jt</span></div>
              <div className="row jb ac"><span className="tiny">+ Bagian laba pasca-akuisisi</span><span className="mono" style={{ fontWeight: 600, color: 'var(--green)' }}>+{fmt(p65.nciPostTotal)} jt</span></div>
              <div className="row jb ac" style={{ borderTop: '1px solid var(--line-soft)', paddingTop: 8 }}><span className="tiny" style={{ fontWeight: 700 }}>NCI akhir (ekuitas)</span><span className="mono" style={{ fontWeight: 800, color: 'var(--amber)' }}>{fmt(p65.nciCloseTotal)} jt</span></div>
            </div>
            <div className="tiny muted" style={{ padding: '0 14px 12px', lineHeight: 1.5 }}>Bagian NCI atas laba tahun berjalan Rp {fmt(p65.nciProfit)} jt; disajikan terpisah dari ekuitas pemilik induk.</div>
          </Panel>

          {/* prosedur reviu konsolidasi */}
          <Panel noBody>
            <div className="panel-h"><h3>Prosedur Reviu Konsolidasi</h3><span className="sub mono">SA 600 · PSAK 65</span></div>
            <div style={{ padding: '6px 12px 4px' }}>
              <div className="row jb ac" style={{ marginBottom: 6 }}><span className="tiny muted">Penyelesaian</span><span className="mono tiny" style={{ fontWeight: 700, color: procPct === 100 ? 'var(--green)' : 'var(--amber)' }}>{procPct}%</span></div>
              <Progress value={procPct} color={procPct === 100 ? 'var(--green)' : 'var(--amber)'} />
            </div>
            <div style={{ padding: '8px 12px 12px', display: 'grid', gap: 2 }}>
              {GA_CONSOL_PROC.map((p, i) => {
                const key = p.ref + i, on = !!procDone[key];
                return (
                  <button key={key} onClick={() => toggleProc(key)} className="row gap8" style={{ alignItems: 'flex-start', padding: '7px 6px', borderRadius: 7, border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                    <span style={{ flex: '0 0 16px', marginTop: 1, color: on ? 'var(--green)' : 'var(--ink-4)' }}>{on ? <I.checkCircle size={15} /> : <I.circle size={15} />}</span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{p.ref}</span>
                      <span className="tiny" style={{ display: 'block', lineHeight: 1.4, color: on ? 'var(--ink-3)' : 'var(--ink)', textDecoration: on ? 'line-through' : 'none' }}>{p.t}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </Panel>

          {/* keterkaitan modul */}
          <Panel noBody>
            <div className="panel-h"><h3>Keterkaitan Kertas Kerja</h3><span className="sub mono">lineage</span></div>
            <div className="row ac gap6" style={{ padding: '9px 14px 4px' }}><I.arrowRight size={13} style={{ color: 'var(--blue)' }} /><span className="tiny upper" style={{ fontWeight: 700, letterSpacing: '.04em', color: 'var(--ink-3)' }}>Hulu — sumber data</span></div>
            <div style={{ display: 'grid', gap: 6, padding: '2px 12px 10px' }}>
              {GA_CONSOL_UP.map(m => { const IconC = I[m.ic] || I.doc; return (
                <button key={m.id} onClick={() => nav(m.id, { from: 'groupaudit' })} className="row ac gap9" style={{ padding: '8px 10px', borderRadius: 7, border: '1px solid var(--line)', borderLeft: '3px solid var(--blue)', background: 'var(--surface)', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                  <span style={{ color: 'var(--blue)', flex: '0 0 auto' }}><IconC size={15} /></span>
                  <div style={{ flex: 1, minWidth: 0 }}><div className="tiny" style={{ fontWeight: 600 }}>{m.lbl}</div><div className="tiny muted" style={{ lineHeight: 1.35 }}>{m.rel}</div></div>
                  <I.arrowRight size={13} style={{ color: 'var(--ink-4)', flex: '0 0 auto' }} />
                </button>
              ); })}
            </div>
            <div className="row ac gap6" style={{ padding: '4px 14px', borderTop: '1px solid var(--line-soft)' }}><I.arrowRight size={13} style={{ color: 'var(--green)' }} /><span className="tiny upper" style={{ fontWeight: 700, letterSpacing: '.04em', color: 'var(--ink-3)' }}>Hilir — pengguna angka</span></div>
            <div style={{ display: 'grid', gap: 6, padding: '2px 12px 12px' }}>
              {GA_CONSOL_DOWN.map(m => { const IconC = I[m.ic] || I.doc; return (
                <button key={m.id} onClick={() => nav(m.id, { from: 'groupaudit' })} className="row ac gap9" style={{ padding: '8px 10px', borderRadius: 7, border: '1px solid var(--line)', borderLeft: '3px solid var(--green)', background: 'var(--surface)', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                  <span style={{ color: 'var(--green)', flex: '0 0 auto' }}><IconC size={15} /></span>
                  <div style={{ flex: 1, minWidth: 0 }}><div className="tiny" style={{ fontWeight: 600 }}>{m.lbl}</div><div className="tiny muted" style={{ lineHeight: 1.35 }}>{m.rel}</div></div>
                  <I.arrowRight size={13} style={{ color: 'var(--ink-4)', flex: '0 0 auto' }} />
                </button>
              ); })}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

/* ===== TAB 5 — TEMUAN TERAGREGASI & KESIMPULAN ================ */
function GAFindings({ findings, totalSad, fmt }) {
  const pct = Math.min(100, totalSad / GROUP_MAT * 100);
  const exceeds = totalSad > GROUP_MAT;
  return (
    <div style={{ padding: 14 }}>
      <div className="grid" style={{ gridTemplateColumns: '1.5fr 1fr', gap: 12, alignItems: 'start' }}>
        <Panel noBody>
          <div className="panel-h"><h3>Temuan Teragregasi dari Auditor Komponen</h3><div style={{ flex: 1 }} /><span className="tiny muted">{findings.length} temuan dilaporkan</span></div>
          <table className="dtbl">
            <thead><tr><th style={{ width: 60 }}>ID</th><th>Komponen / Area</th><th style={{ width: 100 }}>Tingkat</th><th className="num">Dampak (SAD)</th><th style={{ width: 100 }}>Status</th></tr></thead>
            <tbody>
              {findings.map(f => (
                <tr key={f.id}>
                  <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{f.id}</td>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: 12 }}>{f.area}</div>
                    <div className="tiny muted">{f.comp} · {f.auditor}</div>
                    <div className="tiny muted" style={{ lineHeight: 1.4, marginTop: 2, whiteSpace: 'normal' }}>{f.note}</div>
                  </td>
                  <td><Badge kind={SEV_GA[f.sev]}>{f.sev}</Badge></td>
                  <td className="num mono" style={{ color: f.status === 'Terbuka' ? 'var(--red)' : 'var(--ink-3)' }}>{f.sad ? fmt(f.sad / 1e6, 0) + ' jt' : '—'}</td>
                  <td><Badge kind={f.status === 'Terbuka' ? 'red' : 'green'}>{f.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <div className="grid" style={{ gap: 12 }}>
          <Panel title="Agregasi SAD vs Materialitas Grup">
            <div className="row jb ac" style={{ marginBottom: 4 }}>
              <span className="tiny muted">SAD terbuka teragregasi</span>
              <span className="mono" style={{ fontWeight: 700, color: exceeds ? 'var(--red)' : 'var(--amber)' }}>Rp {fmt(totalSad / 1e6, 0)} jt</span>
            </div>
            <div style={{ position: 'relative', height: 16, background: 'var(--surface-3)', borderRadius: 8, overflow: 'hidden', marginBottom: 6 }}>
              <div style={{ position: 'absolute', inset: 0, width: pct + '%', background: exceeds ? 'var(--red)' : 'var(--amber)', borderRadius: 8 }} />
            </div>
            <div className="row jb tiny muted">
              <span>0</span>
              <span>Group materiality Rp {fmt(GROUP_MAT / 1e9, 1)} M</span>
            </div>
            <div className="divider" />
            <div className="panel" style={{ padding: '8px 11px', background: exceeds ? 'var(--red-bg)' : 'var(--green-bg)', borderColor: 'transparent' }}>
              <div className="tiny" style={{ fontWeight: 600, color: exceeds ? 'var(--red)' : 'var(--green)', lineHeight: 1.4 }}>
                {exceeds ? 'SAD melampaui materialitas grup — diperlukan koreksi atau dampak opini.' : 'SAD teragregasi di bawah materialitas grup — tidak material terhadap LK konsolidasian.'}
              </div>
            </div>
          </Panel>

          <Panel title="Kesimpulan Audit Grup">
            <div style={{ display: 'grid', gap: 8 }}>
              {[
                ['Bukti audit yang cukup & tepat diperoleh atas komponen signifikan', true],
                ['Komunikasi dua arah dengan auditor komponen memadai', true],
                ['Proses konsolidasi & eliminasi ditelaah', true],
                ['SAD teragregasi di bawah materialitas grup', !exceeds],
              ].map(([t, ok], i) => (
                <div key={i} className="row ac gap8 tiny">
                  <span style={{ color: ok ? 'var(--green)' : 'var(--red)' }}>{ok ? <I.checkCircle size={14} /> : <I.alert size={14} />}</span>
                  <span style={{ lineHeight: 1.35 }}>{t}</span>
                </div>
              ))}
            </div>
            <div className="divider" />
            <Btn variant="primary" style={{ width: '100%' }}><I.download size={14} /> Finalisasi Group Audit Memo</Btn>
          </Panel>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { GroupAudit });
