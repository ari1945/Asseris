/* [codemod] ESM imports */
import { AMS } from './data';
import { I } from './icons';
import { BoBadge, boJt } from './view_bo1';
import { PDrawer } from './view_docparts';
import { KV, SectionTitle } from './view_fpm_parts';

/* ============================================================
   Asseris — Cockpit Operasi Firma · tab lanjutan
   Kalender Kewajiban Terpadu · Vendor & Konsumsi · Lineage & Rekonsiliasi
   ============================================================ */

/* ---------- KALENDER KEWAJIBAN TERPADU (agregasi semua sub-modul) ---------- */
function FopsCalendar({ obligations, calFilter, setCalFilter, nav }: any) {
  const F = window.FIRMOPS;
  const list = calFilter === 'all' ? obligations : obligations.filter((o: any) => o.module === calFilter);
  const buckets = [
    { key: 'lewat', lbl: 'Lewat Tempo', test: (d: any) => d < 0 },
    { key: 'kritis', lbl: '≤30 hari', test: (d: any) => d >= 0 && d < 30 },
    { key: 'segera', lbl: '31–90 hari', test: (d: any) => d >= 30 && d < 90 },
    { key: 'pantau', lbl: '> 90 hari', test: (d: any) => d >= 90 },
  ];
  const modCount = {};
  obligations.forEach((o: any) => { (modCount as any)[o.module] = ((modCount as any)[o.module] || 0) + 1; });

  return (
    <div className="view-pad" style={{ paddingTop: 14 }}>
      <div className="panel" style={{ padding: '11px 13px', marginBottom: 12, background: 'var(--blue-050)', borderColor: 'var(--blue-100)' }}>
        <div className="tiny" style={{ lineHeight: 1.55 }}><I.calendar size={13} style={{ verticalAlign: -2, color: 'var(--blue)' }} /> Satu kalender menarik tenggat dari <b>7 sub-modul</b> — approval PO, pemeliharaan & K3, masa lisensi, perpanjangan polis, izin firma/AP, pemusnahan arsip & perpanjangan kontrak. Mengubah tanggal di modul sumber memperbarui kalender ini otomatis.</div>
      </div>

      <div className="row ac gap8" style={{ marginBottom: 12, flexWrap: 'wrap' }}>
        <button className="chip tiny" onClick={() => setCalFilter('all')} style={{ cursor: 'pointer', background: calFilter === 'all' ? 'var(--navy)' : undefined, color: calFilter === 'all' ? '#fff' : undefined }}>Semua · {obligations.length}</button>
        {F.SUBMODULES.filter((m: any) => (modCount as any)[m.id]).map((m: any) => (
          <button key={m.id} className="chip tiny" onClick={() => setCalFilter(m.id)} style={{ cursor: 'pointer', background: calFilter === m.id ? m.c : undefined, color: calFilter === m.id ? '#fff' : undefined }}>{m.label} · {(modCount as any)[m.id]}</button>
        ))}
      </div>

      <div style={{ display: 'grid', gap: 16 }}>
        {buckets.map(bk => {
          const items = list.filter((o: any) => bk.test(o.days));
          if (!items.length) return null;
          const col = F.SEV_COLOR[bk.key];
          return (
            <div key={bk.key}>
              <div className="row ac gap8" style={{ marginBottom: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: col }} />
                <b style={{ fontSize: 12.5 }}>{bk.lbl}</b>
                <span className="tiny muted">· {items.length} kewajiban</span>
                <div style={{ flex: 1, height: 1, background: 'var(--line-soft)' }} />
              </div>
              <div style={{ display: 'grid', gap: 7 }}>
                {items.map((o: any, i: any) => {
                  const meta = F.SUBMODULES.find((s: any) => s.id === o.module) || {};
                  const Ic = (I as any)[meta.icon] || I.calendar;
                  return (
                    <div key={i} className="panel" style={{ padding: '9px 12px', cursor: 'pointer', borderLeft: '3px solid ' + col }} onClick={() => nav(o.module, { from: 'firmops' })}>
                      <div className="row ac gap10">
                        <span style={{ width: 26, height: 26, borderRadius: 6, display: 'grid', placeItems: 'center', flex: '0 0 26px', background: (meta.c || '#888') + '1a', color: meta.c }}><Ic size={13} /></span>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div className="row ac gap6"><span className="tiny" style={{ fontWeight: 600 }} >{o.kind}</span><span className="mono tiny muted">{o.ref}</span></div>
                          <div className="tiny muted truncate" style={{ maxWidth: 380 }}>{o.label}</div>
                        </div>
                        <div style={{ textAlign: 'right', flex: '0 0 auto' }}>
                          <div className="mono tiny" style={{ fontWeight: 700, color: col }}>{o.days < 0 ? 'lewat ' + Math.abs(o.days) + 'h' : o.days + ' hari'}</div>
                          <div className="tiny muted">{o.due}{o.amount ? ' · ' + boJt(o.amount) : ''}</div>
                        </div>
                        <span className="badge b-gray" style={{ textTransform: 'none', flex: '0 0 auto' }}>{meta.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- VENDOR & KONSUMSI (master vendor = sumber tunggal) ---------- */
function FopsVendors({ B, vSel, setVSel, nav }: any) {
  const F = window.FIRMOPS;
  return (
    <div>
      <div className="panel" style={{ padding: '11px 13px', margin: '12px 14px 0', background: 'var(--blue-050)', borderColor: 'var(--blue-100)' }}>
        <div className="tiny" style={{ lineHeight: 1.55 }}><I.link2 size={13} style={{ verticalAlign: -2, color: 'var(--blue)' }} /> <b>Master vendor</b> adalah satu-satunya sumber data counterparty. Modul Fasilitas, Arsip, Perjalanan & Legal <b>menunjuk</b> ke record vendor yang sama — tidak ada duplikasi NPWP/rekening/PMPJ. Kolom <b>Dikonsumsi oleh</b> menunjukkan modul pemakainya.</div>
      </div>
      <table className="dtbl">
        <thead><tr><th>ID</th><th>Vendor</th><th>Kategori</th><th className="num">Belanja YTD</th><th>PMPJ</th><th>Dikonsumsi oleh</th><th>Status</th></tr></thead>
        <tbody>
          {B.VENDORS.map((v: any) => {
            const cons = F.VENDOR_CONSUMERS[v.id] || [];
            return (
              <tr key={v.id} onClick={() => setVSel(v)} style={{ cursor: 'pointer' }} className={vSel && vSel.id === v.id ? 'sel' : ''}>
                <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{v.id}</td>
                <td><div style={{ fontWeight: 600, fontSize: 11.5 }}>{v.name}</div><div className="tiny muted mono">{v.npwp}</div></td>
                <td className="tiny">{v.cat}</td>
                <td className="num">{boJt(v.ytd)}</td>
                <td><BoBadge s={v.diligence} /></td>
                <td>
                  <div className="row gap4" style={{ flexWrap: 'wrap' }}>
                    {cons.map((c: any, i: any) => {
                      const meta = F.SUBMODULES.find((s: any) => s.id === c.m) || { label: c.m, c: '#888', icon: 'doc' };
                      const Ic = (I as any)[meta.icon] || I.doc;
                      return <span key={i} className="chip tiny" title={c.why} style={{ borderColor: meta.c + '55', color: meta.c }}><Ic size={10} /> {meta.label.split(' ')[0]}</span>;
                    })}
                    {!cons.length && <span className="tiny muted">—</span>}
                  </div>
                </td>
                <td><BoBadge s={v.status} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function FopsVendorDrawer({ v, onClose, nav }: any) {
  const F = window.FIRMOPS;
  const cons = F.VENDOR_CONSUMERS[v.id] || [];
  return (
    <PDrawer open={!!v} onClose={onClose} width={560}>
      <div className="pdrawer-h">
        <span className="pdrawer-ico" style={{ background: 'var(--blue-050)', color: 'var(--blue)' }}><I.cart size={18} /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.3 }}>{v.name}</div>
          <div className="row ac gap8" style={{ marginTop: 4 }}>
            <span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{v.id}</span>
            <span className="badge b-gray" style={{ textTransform: 'none' }}>{v.cat}</span>
            <BoBadge s={v.status} />
          </div>
        </div>
      </div>
      <div style={{ padding: '4px 16px 18px', flex: 1, overflow: 'auto', minHeight: 0 }}>
        <SectionTitle>Data Master (sumber tunggal)</SectionTitle>
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
          <KV label="NPWP" v={<span className="mono">{v.npwp}</span>} />
          <KV label="Mitra sejak" v={v.since} />
          <KV label="Belanja YTD" v={boJt(v.ytd)} accent="var(--blue)" />
          <KV label="Termin" v={v.terms} />
          <KV label="Rating" v={v.rating.toFixed(1) + ' / 5'} accent={v.rating >= 4 ? 'var(--green)' : 'var(--amber)'} />
          <KV label="PIC" v={v.pic} />
          <KV label="Risiko" v={v.risk} />
          <KV label="PMPJ / Diligence" v={v.diligence} accent={v.diligence === 'Lengkap' ? 'var(--green)' : v.diligence.includes('Gagal') ? 'var(--red)' : 'var(--amber)'} />
        </div>

        <SectionTitle right={<span className="mono tiny muted">{cons.length} modul</span>}>Dikonsumsi oleh Modul</SectionTitle>
        <div style={{ display: 'grid', gap: 7, marginBottom: 14 }}>
          {cons.length ? cons.map((c: any, i: any) => {
            const meta = F.SUBMODULES.find((s: any) => s.id === c.m) || { label: c.m, c: '#888', icon: 'doc' };
            const Ic = (I as any)[meta.icon] || I.doc;
            return (
              <button key={i} type="button" className="lin-chip" style={{ borderLeftColor: meta.c }} onClick={() => nav(c.m, { from: 'firmops' })} title={'Buka ' + meta.label}>
                <span className="lin-ic" style={{ color: meta.c }}><Ic size={14} /></span>
                <span className="lin-txt"><span className="lin-lbl">{meta.label}</span><span className="lin-rel">{c.why}</span></span>
                <span className="lin-go"><I.arrowRight size={12} /></span>
              </button>
            );
          }) : <div className="tiny muted">Belum ada modul lain yang menautkan vendor ini.</div>}
        </div>
        {v.diligence && v.diligence.includes('Gagal') && (
          <div className="panel" style={{ padding: '10px 12px', background: 'var(--red-bg)', borderColor: 'transparent' }}>
            <div className="tiny" style={{ lineHeight: 1.5 }}><I.alert size={13} style={{ verticalAlign: -2, color: 'var(--red)' }} /> Status pajak non-aktif — vendor <b>diblokir</b> dari PO baru. Terkait sengketa <b>LIT-01</b> (wanprestasi) di modul Legal.</div>
          </div>
        )}
      </div>
    </PDrawer>
  );
}

/* ---------- LINEAGE & REKONSILIASI ---------- */
function FopsLineage({ oc, spendRecon, nbv, register, B, nav }: any) {
  const F = window.FIRMOPS;
  const spendTotal = F.sum(spendRecon, (s: any) => s.recorded);
  const spendMaster = F.sum(spendRecon, (s: any) => s.master);
  const spendOk = spendRecon.every((s: any) => s.ok);
  const grossCost = F.sum(B.FIXED_ASSETS, (a: any) => a.cost);
  const accumDep = grossCost - nbv;

  const recons = [
    { id: 'r1', title: 'Belanja per kategori ↔ Master Vendor', ok: spendOk, a: 'Σ kategori belanja', av: spendTotal, b: 'Σ vendor.ytd', bv: spendMaster, note: spendOk ? 'Setiap kategori P&L menutup ke jumlah belanja vendor di master.' : 'Mayoritas kategori menutup ke master vendor; sisa Rp ' + AMS.fmt((spendTotal - spendMaster) / 1e6, 0) + ' jt pada “Lainnya” adalah belanja kecil tak-terkonsolidasi ke satu vendor — ditandai untuk ditinjau.', to: 'procurement' },
    { id: 'r2', title: 'Register Aset (sub-ledger) ↔ Kontrol GL', ok: true, a: 'Σ NBV register', av: nbv, b: 'Aset Tetap Kantor (GL)', bv: nbv, note: 'Harga perolehan Rp ' + AMS.fmt(grossCost / 1e6, 0) + ' jt − akumulasi penyusutan Rp ' + AMS.fmt(accumDep / 1e6, 0) + ' jt = NBV. Sub-ledger menutup ke GL.', to: 'facilities' },
    { id: 'r3', title: 'Kontrak Legal ↔ Vendor & Sub-Ledger', ok: true, a: 'Kontrak terpetakan', av: register.length, b: 'tertaut ke sumber', bv: register.length, note: 'Seluruh kontrak (sewa, lisensi, polis, MoU) menarik nilainya dari master vendor / polis / lisensi yang sama.', to: 'legal', isCount: true },
  ];

  return (
    <div className="view-pad" style={{ paddingTop: 14 }}>
      <SectionTitle>Rekonsiliasi Sub-Ledger → Kontrol</SectionTitle>
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 18 }}>
        {recons.map(r => (
          <div key={r.id} className="panel" style={{ padding: '12px 13px', borderTop: '3px solid ' + (r.ok ? 'var(--green)' : 'var(--amber)') }}>
            <div className="row ac gap8" style={{ marginBottom: 8 }}>
              {r.ok ? <span className="badge b-green" style={{ textTransform: 'none' }}>✓ Menutup</span> : <span className="badge b-amber" style={{ textTransform: 'none' }}>≠ Selisih</span>}
              <div style={{ flex: 1 }} />
              <button className="btn sm icon" style={{ height: 22, width: 22 }} onClick={() => nav(r.to, { from: 'firmops' })} title="Buka modul"><I.arrowRight size={12} /></button>
            </div>
            <div style={{ fontWeight: 600, fontSize: 12, lineHeight: 1.3, marginBottom: 8 }}>{r.title}</div>
            <div className="row jb tiny" style={{ padding: '4px 0', borderBottom: '1px solid var(--line-soft)' }}><span className="muted">{r.a}</span><span className="mono" style={{ fontWeight: 700 }}>{r.isCount ? r.av : boJt(r.av)}</span></div>
            <div className="row jb tiny" style={{ padding: '4px 0' }}><span className="muted">{r.b}</span><span className="mono" style={{ fontWeight: 700 }}>{r.isCount ? r.bv : boJt(r.bv)}</span></div>
            <div className="tiny muted" style={{ marginTop: 8, lineHeight: 1.45 }}>{r.note}</div>
          </div>
        ))}
      </div>

      <SectionTitle right={<span className="mono tiny muted">{spendRecon.length} kategori</span>}>Detail: Belanja ↔ Master Vendor</SectionTitle>
      <table className="dtbl" style={{ marginBottom: 18 }}>
        <thead><tr><th>Kategori Belanja (P&L)</th><th>Vendor Master</th><th className="num">Tercatat</th><th className="num">Master</th><th>Status</th></tr></thead>
        <tbody>
          {spendRecon.map((s: any) => (
            <tr key={s.cat} style={{ background: s.ok ? undefined : 'var(--amber-bg)' }}>
              <td style={{ fontWeight: 600, fontSize: 11.5 }}><span className="row ac gap8"><span style={{ width: 9, height: 9, borderRadius: 2, background: s.color }} />{s.cat}</span></td>
              <td className="tiny muted">{s.cats.join(', ')}</td>
              <td className="num">{boJt(s.recorded)}</td>
              <td className="num">{boJt(s.master)}</td>
              <td>{s.ok ? <span className="badge b-green" style={{ textTransform: 'none' }}>✓ Konsisten</span> : <span className="badge b-amber" style={{ textTransform: 'none' }}>Δ {boJt(s.recorded - s.master)}</span>}</td>
            </tr>
          ))}
        </tbody>
        <tfoot><tr><td colSpan={2}>TOTAL BELANJA YTD</td><td className="num">{boJt(spendTotal)}</td><td className="num">{boJt(spendMaster)}</td><td></td></tr></tfoot>
      </table>

      <SectionTitle>Peta Keterkaitan Modul (hub operasi)</SectionTitle>
      <div className="panel" style={{ padding: '12px 14px' }}>
        <div className="tiny muted" style={{ lineHeight: 1.6 }}>
          <b>Cockpit Operasi</b> berperan sebagai hub: ia <b>menarik</b> dari sub-ledger (vendor, aset, lisensi, polis, keanggotaan, perjalanan, arsip) dan <b>mengisi</b> Laba Rugi di <button type="button" className="lnk" onClick={() => nav('firmfinance', { from: 'firmops' })}>Firm Finance</button>. Kontrak dikelola SSOT di <button type="button" className="lnk" onClick={() => nav('legal', { from: 'firmops' })}>Kontrak &amp; Legal</button>; sengketa menaut ke <button type="button" className="lnk" onClick={() => nav('insurance', { from: 'firmops' })}>Asuransi &amp; Risiko</button> dan legal hold ke <button type="button" className="lnk" onClick={() => nav('records', { from: 'firmops' })}>Retensi &amp; Arsip</button>.
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { FopsCalendar, FopsVendors, FopsVendorDrawer, FopsLineage });

/* ---------- lineage dock dua-arah ---------- */
if (window.LINEAGE) {
  window.LINEAGE.firmops = {
    std: 'Backoffice · Cockpit Operasi Firma (hub sub-ledger)',
    up: [
      { id: 'procurement', ic: 'cart', lbl: 'Pengadaan & Vendor', rel: 'Master vendor & belanja YTD' },
      { id: 'facilities', ic: 'building', lbl: 'Aset & Fasilitas', rel: 'Register aset (NBV, penyusutan) & lisensi' },
      { id: 'insurance', ic: 'umbrella', lbl: 'Asuransi & Risiko', rel: 'Premi polis → beban operasi' },
      { id: 'licensing', ic: 'key', lbl: 'Lisensi & Perizinan', rel: 'Iuran keanggotaan & tenggat izin' },
      { id: 'travel', ic: 'plane', lbl: 'Perjalanan & Reimburse', rel: 'Biaya perjalanan → beban langsung' },
      { id: 'records', ic: 'archive', lbl: 'Retensi & Arsip', rel: 'Tenggat pemusnahan & legal hold' },
      { id: 'legal', ic: 'gavel', lbl: 'Kontrak & Legal', rel: 'Registri kontrak SSOT & perpanjangan' },
    ],
    down: [
      { id: 'firmfinance', ic: 'coins', lbl: 'Firm Finance', rel: 'Komposisi biaya → overhead & beban langsung (L/R)' },
      { id: 'firmgl', ic: 'ledger', lbl: 'General Ledger', rel: 'Sub-ledger aset & belanja → posting GL' },
      { id: 'firmtax', ic: 'report', lbl: 'Pajak Firma', rel: 'Penyusutan & biaya → rekonsiliasi fiskal' },
    ],
  };
}


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { FopsCalendar, FopsLineage, FopsVendorDrawer, FopsVendors };
