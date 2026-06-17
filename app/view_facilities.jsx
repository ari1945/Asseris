/* ============================================================
   NeoSuite AMS — Aset & Fasilitas Kantor (DEEP) · 1/2
   Register aset = sub-ledger PSAK 16 tunggal. Semua angka diturunkan
   dari window.FAC (mesin penyusutan kanonik): NBV ← garis lurus ·
   pemeliharaan ← vendor master · lisensi ← vendor+Legal · sewa ← Legal ·
   asuransi ← polis · capex ← Pengadaan. Cockpit tak menyimpan salinan.
   Reuse: boJt/boM/BoBadge/BoTabPanel/BoStat (view_bo1); KV/SectionTitle/
   HBars (fpm_parts); Panel/Donut/Stat/Btn (ui); PDrawer (docparts); SubBar.
   ============================================================ */
const { useState: useStateFac, useMemo: useMemoFac } = React;

const FAC_STATUSC = { Digunakan: 'var(--green)', 'Perlu Servis': 'var(--amber)', 'Usul Hapus': 'var(--red)' };
const facPct = (x) => Math.round(x) + '%';

/* alert ringkas (diturunkan lintas-modul) */
function FacAlerts({ B, FA, firm, nav, setTab, setSel }) {
  const mt = FA.maintenance();
  const lic = FA.licenses(firm);
  const disp = (B.DISPOSALS || []).filter(d => d.status === 'Menunggu Approval');
  const items = [];
  mt.rows.filter(m => m.status === 'Terlambat' || m.days < 0).forEach(m => items.push({ tone: 'red', ic: 'alert', t: 'Pemeliharaan terlambat — ' + m.asset, s: m.type + ' · ' + m.vendor + ' · jatuh tempo ' + m.due, go: () => setTab('maint') }));
  mt.rows.filter(m => m.k3 && m.days >= 0 && m.days <= 30).forEach(m => items.push({ tone: 'amber', ic: 'shield', t: 'Inspeksi K3 mendekat — ' + m.asset, s: m.vendor + ' · ' + m.days + ' hari', go: () => setTab('maint') }));
  lic.filter(l => l.renew).forEach(l => items.push({ tone: 'amber', ic: 'key', t: 'Lisensi perlu perpanjangan — ' + l.name, s: 'Berakhir ' + l.exp + ' · ' + (l.days < 0 ? 'lewat' : l.days + ' hari'), go: () => setTab('license') }));
  disp.forEach(d => items.push({ tone: 'amber', ic: 'trash', t: 'Usul pelepasan aset — ' + d.asset, s: d.method + ' · perlu persetujuan ' + d.appr, go: () => setTab('register') }));
  return (
    <div style={{ display: 'grid', gap: 7 }}>
      {items.slice(0, 7).map((a, i) => (
        <button key={i} type="button" onClick={a.go} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--line)', borderLeft: '3px solid var(--' + a.tone + ')', background: 'var(--surface-1)', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
          <span style={{ color: 'var(--' + a.tone + ')', flex: '0 0 auto' }}>{React.createElement(window.I[a.ic] || window.I.alert, { size: 15 })}</span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="tiny truncate" style={{ fontWeight: 600, maxWidth: 300 }}>{a.t}</div>
            <div className="tiny muted truncate" style={{ maxWidth: 300 }}>{a.s}</div>
          </div>
          <window.I.arrowRight size={12} style={{ color: 'var(--ink-4)', flex: '0 0 auto' }} />
        </button>
      ))}
      {!items.length && <div className="tiny muted">Tidak ada peringatan terbuka.</div>}
    </div>
  );
}

/* ============================================================
   Modul utama — Aset & Fasilitas (deep)
   ============================================================ */
function Facilities() {
  const firm = useFirm();
  const nav = (typeof useNav === 'function') ? useNav() : (() => {});
  const FA = window.FAC;
  const B = window.BO;
  const [tab, setTab] = useStateFac('overview');
  const [sel, setSel] = useStateFac(null);

  const hl = useMemoFac(() => FA.headline(firm), [firm.engagements, firm.clients]);
  const reg = useMemoFac(() => FA.register(), []);
  const roll = useMemoFac(() => FA.rollForward(), []);

  const tabs = [
    { id: 'overview', label: 'Ikhtisar' },
    { id: 'register', label: 'Register Aset', count: reg.rows.length },
    { id: 'maint', label: 'Pemeliharaan & K3', count: (B.MAINTENANCE || []).length },
    { id: 'license', label: 'Lisensi & Langganan', count: (B.SOFTWARE_LICENSES || []).length },
    { id: 'space', label: 'Ruang & Okupansi' },
    { id: 'lease', label: 'Sewa & Asuransi' },
    { id: 'lineage', label: 'Sumber Kebenaran' },
  ];

  return (
    <>
      <SubBar moduleId="facilities" right={
        <div className="row gap8 ac">
          <span className="chip tiny"><I.link2 size={11} /> Sub-ledger PSAK 16 · sinkron GL Aset Tetap</span>
          <Btn sm><I.download size={13} /> Daftar Aset</Btn>
          <Btn sm variant="primary"><I.plus size={13} /> Daftarkan Aset</Btn>
        </div>
      } />
      <div className="view-scroll"><div className="view-pad">

        <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
          <BoStat value={boM(reg.totCost, 2)} label="Nilai Perolehan" />
          <BoStat value={boM(reg.totNbv, 2)} label="Nilai Buku Neto (derived)" accent="var(--green)" />
          <BoStat value={boJt(reg.totAnnual)} label="Penyusutan / Tahun" accent="var(--blue)" />
          <BoStat value={facPct(hl.occupancy)} label="Okupansi Ruang" accent={hl.maintOverdue ? 'var(--amber)' : 'var(--green)'} />
        </div>

        <BoTabPanel tabs={tabs} tab={tab} setTab={setTab}>

          {/* ===================== IKHTISAR ===================== */}
          {tab === 'overview' && (
            <div className="view-pad" style={{ paddingTop: 14 }}>
              <div className="panel" style={{ padding: '11px 13px', marginBottom: 12, background: 'var(--blue-050)', borderColor: 'var(--blue-100)' }}>
                <div className="row ac gap8" style={{ marginBottom: 5 }}><I.link2 size={15} style={{ color: 'var(--blue)' }} /><b style={{ fontSize: 12.5 }}>Satu register aset, satu mesin penyusutan</b></div>
                <div className="tiny muted" style={{ lineHeight: 1.55 }}>NBV <b>diturunkan</b> dari mesin garis lurus PSAK 16 (bukan diketik). Pemeliharaan & lisensi menunjuk <b>master vendor</b>, sewa & kontrak ke <b>Legal</b>, asuransi ke <b>polis</b>. Penyusutan mengalir ke <b>Biaya Operasi → Laba Rugi & Pajak</b>. Tab <b>Sumber Kebenaran</b> membuktikan tiap angka menutup.</div>
              </div>

              <div className="grid" style={{ gridTemplateColumns: '1.25fr 1fr', gap: 14, alignItems: 'start' }}>
                <Panel title="Roll-Forward Nilai Buku" sub="12 bulan ke 1 Mar 2026 · sumber: mesin penyusutan" actions={<button className="btn sm" style={{ height: 22 }} onClick={() => setTab('register')}><I.arrowRight size={11} /></button>}>
                  <div style={{ display: 'grid', gap: 6 }}>
                    {[
                      { k: 'NBV awal periode', v: roll.opening, sub: false },
                      { k: '+ Penambahan (capex)', v: roll.capex, sub: false, pos: true },
                      { k: '− Beban penyusutan', v: -roll.depreciation, sub: false },
                      { k: '− Pelepasan / write-off', v: -roll.disposalNbv, sub: false },
                    ].map((r, i) => (
                      <div key={i} className="row jb ac" style={{ padding: '4px 0', borderBottom: '1px solid var(--line-soft)' }}>
                        <span className="tiny" style={{ fontWeight: 600 }}>{r.k}</span>
                        <span className="mono tiny" style={{ fontWeight: 700, color: r.v < 0 ? 'var(--red)' : r.pos ? 'var(--green)' : 'var(--ink-1)' }}>{r.v < 0 ? '(' + boJt(-r.v) + ')' : boJt(r.v)}</span>
                      </div>
                    ))}
                    <div className="row jb ac" style={{ padding: '6px 0 0' }}>
                      <b style={{ fontSize: 12 }}>NBV akhir periode</b>
                      <span className="mono" style={{ fontWeight: 800, color: 'var(--green)' }}>{boM(roll.closing, 2)}</span>
                    </div>
                  </div>
                  <div style={{ height: 12 }} />
                  <SectionTitle right={<span className="mono tiny muted">NBV per kategori</span>}>Komposisi Aset</SectionTitle>
                  <HBars rows={reg.byCat.map((c, i) => ({ label: c.cat, value: c.nbv, color: FAC_PALETTE[i % FAC_PALETTE.length], right: boJt(c.nbv) }))} />
                </Panel>

                <div style={{ display: 'grid', gap: 14 }}>
                  <Panel title="Pemeliharaan Terdekat" sub="vendor master & K3">
                    <FacMaintMini FA={FA} nav={nav} setTab={setTab} />
                  </Panel>
                  <Panel title="Perlu Tindakan" sub="diturunkan lintas-modul">
                    <FacAlerts B={B} FA={FA} firm={firm} nav={nav} setTab={setTab} setSel={setSel} />
                  </Panel>
                </div>
              </div>
            </div>
          )}

          {/* ===================== REGISTER ASET ===================== */}
          {tab === 'register' && <FacRegister reg={reg} sel={sel} setSel={setSel} />}

          {/* ===================== tabs lanjutan (part 2) ===================== */}
          {tab === 'maint' && <FacMaintenance FA={FA} nav={nav} />}
          {tab === 'license' && <FacLicenses FA={FA} firm={firm} nav={nav} />}
          {tab === 'space' && <FacSpace FA={FA} />}
          {tab === 'lease' && <FacLeaseInsurance FA={FA} reg={reg} firm={firm} nav={nav} />}
          {tab === 'lineage' && <FacLineage FA={FA} firm={firm} nav={nav} />}

        </BoTabPanel>
      </div></div>

      {sel && <FacAssetDrawer asset={sel} onClose={() => setSel(null)} nav={nav} />}
    </>
  );
}

const FAC_PALETTE = ['#013a52', '#005085', '#0a6b73', '#2f7bb0', '#5b3fa6', '#9a6a00', '#1f7a4d'];

/* mini kalender pemeliharaan untuk overview */
function FacMaintMini({ FA, nav, setTab }) {
  const mt = FA.maintenance();
  return (
    <div style={{ display: 'grid', gap: 7 }}>
      {mt.rows.slice(0, 5).map(m => {
        const col = m.days < 0 ? 'var(--red)' : m.days <= 14 ? 'var(--amber)' : 'var(--green)';
        return (
          <div key={m.id} className="row ac gap8" style={{ padding: '6px 8px', borderRadius: 7, border: '1px solid var(--line)', cursor: 'pointer' }} onClick={() => setTab('maint')}>
            <span style={{ width: 24, height: 24, borderRadius: 6, display: 'grid', placeItems: 'center', flex: '0 0 24px', background: (m.k3 ? 'var(--purple)' : 'var(--blue)') + '1a', color: m.k3 ? 'var(--purple)' : 'var(--blue)' }}>{React.createElement(m.k3 ? window.I.shield : window.I.settings, { size: 12 })}</span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="tiny truncate" style={{ fontWeight: 600, maxWidth: 200 }}>{m.asset}</div>
              <div className="tiny muted">{m.type} · {m.vendorId ? <span style={{ color: 'var(--blue)' }}>{m.vendorId}</span> : m.vendor}</div>
            </div>
            <span className="mono tiny" style={{ fontWeight: 700, color: col, flex: '0 0 auto' }}>{m.days < 0 ? 'lewat ' + Math.abs(m.days) + 'h' : m.days + 'h'}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Register Aset (sub-ledger PSAK 16) ---------- */
function FacRegister({ reg, sel, setSel }) {
  return (
    <div>
      <div className="panel" style={{ padding: '10px 13px', margin: '12px 14px 0', background: 'var(--blue-050)', borderColor: 'var(--blue-100)' }}>
        <div className="tiny" style={{ lineHeight: 1.5 }}><I.layers size={13} style={{ verticalAlign: -2, color: 'var(--blue)' }} /> Buku besar pembantu aset tetap — <b>NBV, akumulasi & penyusutan diturunkan</b> dari satu mesin garis lurus (ref 1 Mar 2026). Klik baris untuk skedul penyusutan, vendor perolehan & riwayat pemeliharaan.</div>
      </div>
      <table className="dtbl zebra">
        <thead><tr>
          <th>Kode</th><th>Aset</th><th>Kategori</th><th className="num">Qty</th><th className="num">Perolehan</th><th className="num">Ak. Penyusutan</th><th className="num">NBV</th><th style={{ width: 120 }}>Umur Terpakai</th><th>Status</th>
        </tr></thead>
        <tbody>
          {reg.rows.map(a => (
            <tr key={a.id} onClick={() => setSel(a)} style={{ cursor: 'pointer' }} className={sel && sel.id === a.id ? 'sel' : ''}>
              <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{a.id}</td>
              <td><div style={{ fontWeight: 600, fontSize: 11.5 }}>{a.name}</div><div className="tiny muted mono">{new Date(a.acq).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })} · {a.life}th · {a.loc}</div></td>
              <td className="tiny">{a.cat}</td>
              <td className="num">{a.qty}</td>
              <td className="num">{boJt(a.cost)}</td>
              <td className="num muted">{boJt(a.accDep)}</td>
              <td className="num" style={{ fontWeight: 600, color: a.fullyDep ? 'var(--ink-4)' : 'inherit' }}>{a.nbv === 0 ? '—' : boJt(a.nbv)}</td>
              <td><div className="row ac gap6"><div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--surface-3)' }}><div style={{ width: facPct(a.pct * 100) + '', height: '100%', borderRadius: 3, background: a.fullyDep ? 'var(--ink-4)' : 'var(--blue)' }} /></div><span className="tiny mono" style={{ width: 30 }}>{facPct(a.pct * 100)}</span></div></td>
              <td><span className="badge" style={{ textTransform: 'none', background: (FAC_STATUSC[a.status] || '#888') + '1a', color: FAC_STATUSC[a.status] || '#888' }}>{a.status}</span></td>
            </tr>
          ))}
        </tbody>
        <tfoot><tr><td colSpan={4}>TOTAL</td><td className="num">{boM(reg.totCost, 2)}</td><td className="num">{boM(reg.totAcc, 2)}</td><td className="num">{boM(reg.totNbv, 2)}</td><td colSpan={2}></td></tr></tfoot>
      </table>
    </div>
  );
}

/* ---------- Drawer aset: skedul penyusutan + tautan SSOT ---------- */
function FacAssetDrawer({ asset, onClose, nav }) {
  const FA = window.FAC, B = window.BO;
  const a = FA.depreciate(asset);
  const vendor = a.vendorId ? ((B.VENDORS || []).find(v => v.id === a.vendorId) || null) : null;
  const policy = a.insured ? ((B.POLICIES || []).find(p => p.id === a.insured) || null) : null;
  const maint = (B.MAINTENANCE || []).filter(m => m.assetId === a.id);
  const startYear = new Date(a.acq).getFullYear();
  const annual = a.cost / a.life;
  let acc = 0;
  const sched = Array.from({ length: a.life }, (_, i) => { const yr = startYear + i; acc += annual; return { yr, dep: annual, acc, nbv: Math.max(0, a.cost - acc), current: yr === 2026 }; });

  return (
    <PDrawer open onClose={onClose} width={580}>
      <div className="pdrawer-h">
        <span className="pdrawer-ico" style={{ background: 'var(--blue-050)', color: 'var(--blue)' }}><I.building size={18} /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.3 }}>{a.name}</div>
          <div className="row ac gap8" style={{ marginTop: 4 }}>
            <span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{a.id}</span>
            <span className="badge b-gray" style={{ textTransform: 'none' }}>{a.cat}</span>
            <span className="badge" style={{ textTransform: 'none', background: (FAC_STATUSC[a.status] || '#888') + '1a', color: FAC_STATUSC[a.status] || '#888' }}>{a.status}</span>
          </div>
        </div>
      </div>
      <div style={{ padding: '4px 16px 22px', flex: 1, overflow: 'auto', minHeight: 0 }}>
        <SectionTitle>Data Aset <span className="tiny muted">(sub-ledger)</span></SectionTitle>
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
          <KV label="Harga perolehan" v={boJt(a.cost)} />
          <KV label="Tgl perolehan" v={a.acq} />
          <KV label="Masa manfaat" v={a.life + ' tahun · garis lurus'} />
          <KV label="Penyusutan / thn" v={boJt(Math.round(annual))} />
          <KV label="NBV kini" v={a.nbv === 0 ? '— (habis)' : boJt(a.nbv)} accent={a.fullyDep ? 'var(--ink-4)' : 'var(--green)'} />
          <KV label="Kuantitas / unit" v={a.qty} />
          <KV label="Lokasi" v={a.loc} />
          <KV label="Kustodian" v={a.custodian} />
        </div>

        <SectionTitle>Tautan Sumber Kebenaran</SectionTitle>
        <div style={{ display: 'grid', gap: 6, marginBottom: 14 }}>
          {vendor && (
            <button type="button" className="lin-chip" style={{ borderLeftColor: '#005085' }} onClick={() => nav('procurement', { from: 'facilities' })} title="Buka vendor di Pengadaan">
              <span className="lin-ic" style={{ color: '#005085' }}><I.cart size={14} /></span>
              <span className="lin-txt"><span className="lin-lbl">Vendor perolehan · {vendor.id}</span><span className="lin-rel">{vendor.name}</span></span>
              <span className="lin-go"><I.arrowRight size={12} /></span>
            </button>
          )}
          {policy && (
            <button type="button" className="lin-chip" style={{ borderLeftColor: '#9a6a00' }} onClick={() => nav('insurance', { from: 'facilities' })} title="Buka polis di Asuransi">
              <span className="lin-ic" style={{ color: '#9a6a00' }}><I.umbrella size={14} /></span>
              <span className="lin-txt"><span className="lin-lbl">Diasuransikan · {policy.id}</span><span className="lin-rel">{policy.jenis} · limit {boM(policy.limit, 0)}</span></span>
              <span className="lin-go"><I.arrowRight size={12} /></span>
            </button>
          )}
          <button type="button" className="lin-chip" style={{ borderLeftColor: '#1f7a4d' }} onClick={() => nav('firmgl', { from: 'facilities' })} title="Buka General Ledger">
            <span className="lin-ic" style={{ color: '#1f7a4d' }}><I.ledger size={14} /></span>
            <span className="lin-txt"><span className="lin-lbl">Akun GL · {a.gl}</span><span className="lin-rel">Posting perolehan & penyusutan</span></span>
            <span className="lin-go"><I.arrowRight size={12} /></span>
          </button>
        </div>

        <SectionTitle right={<span className="tiny muted">{a.life} tahun</span>}>Skedul Penyusutan (garis lurus)</SectionTitle>
        <table className="dtbl" style={{ marginBottom: maint.length ? 14 : 0 }}>
          <thead><tr><th>Tahun</th><th className="num">Penyusutan</th><th className="num">Akumulasi</th><th className="num">Nilai Buku</th></tr></thead>
          <tbody>
            {sched.map(s => (
              <tr key={s.yr} style={{ background: s.current ? 'var(--blue-050)' : undefined }}>
                <td style={{ fontWeight: s.current ? 700 : 600 }}>{s.yr}{s.current && <span className="tiny" style={{ color: 'var(--blue)' }}> · kini</span>}</td>
                <td className="num">{boJt(s.dep)}</td>
                <td className="num muted">{boJt(s.acc)}</td>
                <td className="num" style={{ fontWeight: 600 }}>{boJt(s.nbv)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {maint.length > 0 && (
          <>
            <SectionTitle right={<span className="tiny muted">{maint.length}</span>}>Riwayat & Jadwal Pemeliharaan</SectionTitle>
            <div style={{ display: 'grid', gap: 5 }}>
              {maint.map(m => (
                <div key={m.id} className="row ac jb" style={{ padding: '6px 9px', borderRadius: 7, border: '1px solid var(--line)' }}>
                  <span className="tiny" style={{ fontWeight: 600 }}>{m.type} · {m.vendor}</span>
                  <span className="row ac gap6"><span className="mono tiny muted">{m.due} · {boJt(m.cost)}</span><BoBadge s={m.status} /></span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </PDrawer>
  );
}

Object.assign(window, { Facilities, FacRegister, FacAssetDrawer, FacAlerts, FacMaintMini, FAC_PALETTE, FAC_STATUSC, facPct });
