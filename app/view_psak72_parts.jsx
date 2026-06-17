/* ============================================================
   NeoSuite AMS — PSAK 72 · Komponen pendukung (dipakai view_psak72.jsx)
   Presentasional saja (tanpa state) — menerima `rev` (AMS_CANON.revenue),
   `sc` (skala penyajian), `fmt`, `nav`. Semua angka ditarik dari mesin
   kanonik yang sama dipakai FS Generator & PSAK 71 — tidak ada angka baru.
     · P72_FiveStep      — model 5 langkah pengakuan pendapatan (¶9-45)
     · P72_SspTable      — alokasi harga transaksi ke kewajiban pelaksanaan (¶73-80)
     · P72_ContractBal   — roll-forward saldo kontrak (¶105, ¶116)
   ============================================================ */

/* ---- Step 1: kriteria kontrak (¶9 a-e) ---- */
const P72_STEP1 = [
  { k: '¶9(a)', t: 'Kontrak disetujui & para pihak berkomitmen memenuhi kewajiban', ok: true },
  { k: '¶9(b)', t: 'Hak masing-masing pihak atas barang/jasa dapat diidentifikasi', ok: true },
  { k: '¶9(c)', t: 'Termin pembayaran atas barang/jasa dapat diidentifikasi', ok: true },
  { k: '¶9(d)', t: 'Kontrak memiliki substansi komersial', ok: true },
  { k: '¶9(e)', t: 'Kemungkinan besar imbalan tertagih (collectibility) — diuji via ECL PSAK 71', ok: true },
];
/* ---- Step 2: kewajiban pelaksanaan (¶22-30, ¶B28-B40) ---- */
const P72_STEP2 = [
  { t: 'Penyerahan barang jadi', dist: true, note: 'Distinct — dapat dimanfaatkan tersendiri (¶27)' },
  { t: 'Jasa logistik & pengiriman (3PL)', dist: true, note: 'Distinct bila dijanjikan terpisah; bukan biaya pemenuhan' },
  { t: 'Garansi diperpanjang (service-type)', dist: true, note: 'POB terpisah — jasa di luar assurance (¶B28-B33)' },
  { t: 'Garansi wajib (assurance-type)', dist: false, note: 'Bukan POB → provisi PSAK 57' },
  { t: 'Hak material — poin loyalitas pelanggan', dist: true, note: 'Hak material → POB terpisah (¶B40)' },
];
/* ---- Step 3: komponen harga transaksi (¶47-72) ---- */
const P72_STEP3 = [
  { t: 'Imbalan tetap (harga kontrak/PO)', st: 'Termasuk', tone: 'ink', ref: '¶47' },
  { t: 'Konsiderasi variabel — retur, rabat, diskon', st: 'Diestimasi & dibatasi', tone: 'blue', ref: '¶50-56' },
  { t: 'Pembatasan estimasi (constraint)', st: 'Expected value, dibatasi ¶56', tone: 'blue', ref: '¶56' },
  { t: 'Komponen pendanaan signifikan', st: 'N/A — termin < 12 bln', tone: 'muted', ref: '¶60-65' },
  { t: 'Utang ke pelanggan (insentif dagang)', st: 'Pengurang pendapatan', tone: 'amber', ref: '¶70-72' },
  { t: 'Imbalan nonkas', st: 'N/A', tone: 'muted', ref: '¶66-69' },
];
/* ---- Step 5: kriteria pengakuan (¶35 over-time / ¶38 point-in-time) ---- */
const P72_STEP5_OVER = [
  { k: '¶35(a)', t: 'Pelanggan menerima & mengonsumsi manfaat bersamaan (3PL, garansi)', ok: true },
  { k: '¶35(b)', t: 'Pelaksanaan menciptakan/meningkatkan aset yang dikendalikan pelanggan', ok: false },
  { k: '¶35(c)', t: 'Aset tanpa penggunaan alternatif + hak tagih atas kinerja terlaksana', ok: false },
];
const P72_STEP5_POINT = [
  { k: '¶38(a)', t: 'Entitas memiliki hak kini atas pembayaran', ok: true },
  { k: '¶38(b)', t: 'Pelanggan memiliki kepemilikan hukum atas aset', ok: true },
  { k: '¶38(c)', t: 'Pengalihan fisik aset telah terjadi', ok: true },
  { k: '¶38(d)', t: 'Risiko & manfaat signifikan kepemilikan beralih', ok: true },
  { k: '¶38(e)', t: 'Pelanggan telah menerima aset', ok: true },
];

function P72StepHead({ n, title, cite, accent }) {
  return (
    <div className="row ac gap10" style={{ marginBottom: 9 }}>
      <span className="mono" style={{ flex: '0 0 26px', width: 26, height: 26, borderRadius: 8, display: 'grid', placeItems: 'center', background: accent || 'var(--navy)', color: '#fff', fontWeight: 700, fontSize: 13 }}>{n}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)', lineHeight: 1.2 }}>{title}</div>
      </div>
      <span className="sub mono" style={{ color: 'var(--ink-4)' }}>{cite}</span>
    </div>
  );
}

function P72CritRow({ k, t, ok, last }) {
  return (
    <div className="row gap9" style={{ padding: '7px 0', alignItems: 'flex-start', borderTop: '1px solid var(--line-soft)' }}>
      <span style={{ flex: '0 0 16px', width: 16, height: 16, borderRadius: 4, marginTop: 1, display: 'grid', placeItems: 'center', background: ok ? 'var(--green)' : '#fff', border: '1.5px solid ' + (ok ? 'var(--green)' : 'var(--line-strong)') }}>
        {ok ? <I.check size={11} style={{ color: '#fff' }} /> : <I.x size={10} style={{ color: 'var(--ink-4)' }} />}
      </span>
      <span className="mono tiny" style={{ fontWeight: 700, color: 'var(--navy)', width: 50, flex: '0 0 50px', marginTop: 1 }}>{k}</span>
      <span style={{ fontSize: 11.5, lineHeight: 1.4, color: ok ? 'var(--ink-2)' : 'var(--ink-4)' }}>{t}</span>
    </div>
  );
}

/* ===== Model 5 Langkah (¶9-45) ===== */
function P72_FiveStep({ rev, sc, fmt }) {
  const tone = { ink: 'var(--ink)', blue: 'var(--blue)', amber: 'var(--amber)', muted: 'var(--ink-4)' };
  return (
    <div className="grid" style={{ gap: 12 }}>
      {/* Step 1 */}
      <Panel>
        <P72StepHead n="1" title="Identifikasi kontrak dengan pelanggan" cite="¶9-16" />
        <div>{P72_STEP1.map((r, i) => <P72CritRow key={i} {...r} />)}</div>
        <div className="tiny muted" style={{ marginTop: 8, lineHeight: 1.45 }}>
          Seluruh lima kriteria ¶9 terpenuhi untuk pesanan rutin. Kombinasi kontrak (¶17) & modifikasi (¶18-21) ditelaah untuk kontrak distributor berjenjang. Kolektibilitas ditambatkan ke pengujian ECL <b>PSAK 71</b>.
        </div>
      </Panel>
      {/* Step 2 */}
      <Panel>
        <P72StepHead n="2" title="Identifikasi kewajiban pelaksanaan (POB)" cite="¶22-30" />
        <div style={{ display: 'grid', gap: 0 }}>
          {P72_STEP2.map((r, i) => (
            <div key={i} className="row ac gap9" style={{ padding: '7px 0', borderTop: '1px solid var(--line-soft)' }}>
              <Badge kind={r.dist ? 'green' : 'gray'}>{r.dist ? 'POB' : 'Bukan POB'}</Badge>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.25 }}>{r.t}</div>
                <div className="tiny muted">{r.note}</div>
              </div>
            </div>
          ))}
        </div>
      </Panel>
      {/* Step 3 */}
      <Panel>
        <P72StepHead n="3" title="Menentukan harga transaksi" cite="¶47-72" accent="var(--blue)" />
        <div style={{ display: 'grid', gap: 0 }}>
          {P72_STEP3.map((r, i) => (
            <div key={i} className="row ac jb gap9" style={{ padding: '7px 0', borderTop: '1px solid var(--line-soft)' }}>
              <span style={{ fontSize: 12, color: 'var(--ink-2)', flex: 1 }}>{r.t}<span className="mono tiny" style={{ color: 'var(--ink-4)', marginLeft: 6 }}>{r.ref}</span></span>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: tone[r.tone] }}>{r.st}</span>
            </div>
          ))}
        </div>
        <div className="panel" style={{ marginTop: 9, padding: '8px 10px', background: 'var(--blue-050)', borderColor: 'transparent' }}>
          <div className="tiny" style={{ lineHeight: 1.45 }}>
            Harga transaksi neto entitas <b className="mono">Rp {sc(rev.revBooked)}</b> = bruto <span className="mono">Rp {sc(rev.grossBilling)}</span> dikurangi konsiderasi variabel & utang ke pelanggan <span className="mono">Rp {sc(rev.grossBilling - rev.revBooked)}</span> (lihat Jembatan Harga Transaksi). Konsiderasi variabel diestimasi dengan <b>nilai ekspektasian</b> & dibatasi (¶56) agar pembalikan signifikan tidak terjadi.
          </div>
        </div>
      </Panel>
      {/* Step 4 */}
      <Panel>
        <P72StepHead n="4" title="Alokasi harga transaksi ke POB" cite="¶73-80" />
        <P72_SspTable rev={rev} sc={sc} fmt={fmt} embedded />
      </Panel>
      {/* Step 5 */}
      <Panel>
        <P72StepHead n="5" title="Pengakuan saat kewajiban pelaksanaan terpenuhi" cite="¶31-45" accent="var(--green)" />
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <div className="row ac jb" style={{ marginBottom: 2 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>Sepanjang waktu</span>
              <span className="mono tiny" style={{ color: 'var(--blue)', fontWeight: 700 }}>Rp {sc(rev.overTime)}</span>
            </div>
            <div className="tiny muted" style={{ marginBottom: 4 }}>¶35 — jasa 3PL & garansi diperpanjang</div>
            {P72_STEP5_OVER.map((r, i) => <P72CritRow key={i} {...r} />)}
          </div>
          <div>
            <div className="row ac jb" style={{ marginBottom: 2 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>Titik waktu</span>
              <span className="mono tiny" style={{ color: 'var(--navy)', fontWeight: 700 }}>Rp {sc(rev.pointTime)}</span>
            </div>
            <div className="tiny muted" style={{ marginBottom: 4 }}>¶38 — penyerahan barang (indikator pengendalian)</div>
            {P72_STEP5_POINT.map((r, i) => <P72CritRow key={i} {...r} />)}
          </div>
        </div>
        <div className="tiny muted" style={{ marginTop: 8, lineHeight: 1.45 }}>
          Mayoritas pendapatan (<b>{fmt(rev.pointTime / rev.revBooked * 100, 0)}%</b>) diakui pada <b>titik waktu</b> saat pengendalian barang beralih (FOB destination). Sisanya diakui <b>sepanjang waktu</b> dengan metode output. Inilah area cut-off kritis → lihat tab Cut-off & Pengakuan (R-01).
        </div>
      </Panel>
    </div>
  );
}

/* ===== Alokasi SSP (¶73-80) ===== */
function P72_SspTable({ rev, sc, fmt, embedded }) {
  const c = rev.contract;
  const table = (
    <div style={{ overflowX: 'auto' }}>
      <div className="tiny muted" style={{ marginBottom: 6 }}>
        Kontrak demonstrasi <b className="mono">{c.id}</b> — {c.name} · harga transaksi <b className="mono">Rp {sc(c.price)}</b>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
        <thead>
          <tr style={{ color: 'var(--ink-4)', textAlign: 'right' }}>
            <th style={{ textAlign: 'left', fontWeight: 600, padding: '5px 4px' }}>Kewajiban pelaksanaan</th>
            <th style={{ fontWeight: 600, padding: '5px 4px' }}>SSP</th>
            <th style={{ fontWeight: 600, padding: '5px 4px' }}>% SSP</th>
            <th style={{ fontWeight: 600, padding: '5px 4px' }}>Alokasi</th>
            <th style={{ textAlign: 'left', fontWeight: 600, padding: '5px 10px' }}>Pengakuan</th>
          </tr>
        </thead>
        <tbody>
          {rev.pobs.map((p, i) => (
            <tr key={i} style={{ borderTop: '1px solid var(--line-soft)' }}>
              <td style={{ padding: '7px 4px', fontWeight: 600 }}>{p.label}</td>
              <td className="mono" style={{ textAlign: 'right', padding: '7px 4px', color: 'var(--ink-4)' }}>{sc(p.ssp)}</td>
              <td className="mono" style={{ textAlign: 'right', padding: '7px 4px', color: 'var(--ink-4)' }}>{fmt(p.pctSsp * 100, 1)}%</td>
              <td className="mono" style={{ textAlign: 'right', padding: '7px 4px', fontWeight: 700, color: 'var(--navy)' }}>{sc(p.alloc)}</td>
              <td style={{ padding: '7px 10px' }}><Badge kind={p.timing === 'over' ? 'blue' : 'gray'}>{p.timing === 'over' ? 'Sepanjang waktu' : 'Titik waktu'}</Badge> <span className="tiny muted">{p.when}</span></td>
            </tr>
          ))}
          <tr style={{ borderTop: '1.5px solid var(--navy)', fontWeight: 700 }}>
            <td style={{ padding: '8px 4px' }}>Σ Harga jual berdiri sendiri (SSP)</td>
            <td className="mono" style={{ textAlign: 'right', padding: '8px 4px' }}>{sc(rev.sspSum)}</td>
            <td className="mono" style={{ textAlign: 'right', padding: '8px 4px', color: 'var(--ink-4)' }}>100%</td>
            <td className="mono" style={{ textAlign: 'right', padding: '8px 4px', color: 'var(--navy)' }}>{sc(rev.pobAlloc)}</td>
            <td style={{ padding: '8px 10px' }} className="tiny muted">faktor {fmt(rev.sspFactor, 3)}</td>
          </tr>
        </tbody>
      </table>
      <div className="tiny muted" style={{ marginTop: 8, lineHeight: 1.45 }}>
        Harga transaksi dialokasikan <b>pro-rata</b> terhadap SSP relatif (¶76). Σ alokasi <b className="mono">Rp {sc(rev.pobAlloc)}</b> menutup persis ke harga transaksi <b className="mono">Rp {sc(c.price)}</b>. SSP barang teramati dari price list; garansi memakai pendekatan biaya-plus (¶79).
      </div>
    </div>
  );
  if (embedded) return table;
  return (
    <Panel noBody>
      <div className="panel-h"><h3>Alokasi Harga Transaksi (SSP)</h3><span className="sub mono">¶73-80</span></div>
      <div style={{ padding: '4px 14px 12px' }}>{table}</div>
    </Panel>
  );
}

/* ===== Roll-forward saldo kontrak (¶105, ¶116) ===== */
function P72_ContractBal({ rev, sc, nav }) {
  const b = rev.balances;
  const cards = [
    { id: 'recv', label: 'Piutang usaha (hak tanpa syarat)', ref: 'WTB 1-1200', open: b.recvOpen, close: b.recvClose, accent: 'var(--navy)',
      rows: [['Saldo awal (audited 2024)', b.recvOpen], ['Mutasi neto penagihan & pelunasan', b.recvClose - b.recvOpen], ['Saldo akhir (WTB adjusted)', b.recvClose, true]],
      note: 'Hak tanpa syarat atas imbalan — menutup ke WTB 1-1200 (PSAK 71 · ECL).', route: 'psak71' },
    { id: 'ca', label: 'Aset kontrak (hak bersyarat)', ref: '¶105', open: b.caOpen, close: b.caClose, accent: 'var(--blue)',
      rows: [['Saldo awal', b.caOpen], ['Pendapatan diakui melebihi penagihan', b.caAdd], ['Reklasifikasi ke piutang saat ditagih', -b.caReclass], ['Saldo akhir', b.caClose, true]],
      note: 'Hak atas imbalan yang masih bergantung pada kondisi (jasa over-time belum ditagih).', route: 'wtb' },
    { id: 'cl', label: 'Liabilitas kontrak (uang muka)', ref: '¶106', open: b.clOpen, close: b.clClose, accent: 'var(--amber)',
      rows: [['Saldo awal', b.clOpen], ['Uang muka & penagihan di muka diterima', b.clAdd], ['Pendapatan diakui dari saldo (¶116b)', -b.clRecog], ['Saldo akhir', b.clClose, true]],
      note: 'Kewajiban menyerahkan barang/jasa atas imbalan yang telah/akan diterima.', route: 'wtb' },
  ];
  return (
    <div className="grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', gap: 12, alignItems: 'start' }}>
      {cards.map(c => (
        <Panel key={c.id} noBody>
          <div className="panel-h"><h3 style={{ fontSize: 12.5 }}>{c.label}</h3><span className="sub mono">{c.ref}</span></div>
          <div style={{ padding: '6px 13px 10px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
              <tbody>
                {c.rows.map((r, i) => (
                  <tr key={i} style={{ borderTop: r[2] ? '1.5px solid var(--navy)' : (i ? '1px solid var(--line-soft)' : 0) }}>
                    <td style={{ padding: r[2] ? '8px 0' : '6px 0', fontSize: 11.5, color: r[2] ? 'var(--ink)' : 'var(--ink-2)', fontWeight: r[2] ? 700 : 400, lineHeight: 1.3 }}>{r[0]}</td>
                    <td className="mono" style={{ textAlign: 'right', padding: r[2] ? '8px 0' : '6px 0', fontWeight: r[2] ? 700 : 500, color: r[1] < 0 ? 'var(--red)' : (r[2] ? c.accent : 'var(--ink)') }}>{r[1] === 0 ? '—' : sc(r[1])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div onClick={() => nav(c.route, { from: 'psak72' })} className="tiny muted" style={{ marginTop: 8, lineHeight: 1.4, cursor: 'pointer' }}>{c.note}</div>
          </div>
        </Panel>
      ))}
    </div>
  );
}

Object.assign(window, { P72_FiveStep, P72_SspTable, P72_ContractBal });
