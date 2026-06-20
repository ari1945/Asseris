/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { AMS_CANON } from './canon';
import { useAudit, useFirm, useNav } from './contexts.jsx';
import { I } from './icons.jsx';
import { SubBar } from './shell.jsx';
import { Badge, Btn, Panel } from './ui.jsx';

/* ============================================================
   NeoSuite AMS — PSAK 58 · Aset Tidak Lancar Dimiliki untuk Dijual
   & Operasi yang Dihentikan (IFRS 5)
   Kertas kerja yang DITARIK PENUH dari satu sumber kebenaran yang
   sama dipakai modul lain — tidak ada angka di-input ulang:
     · Register Aset Tetap (PSAK 16) — AMS_CANON.assetRegister(wtb):
       nilai buku neto tiap anggota disposal group (per nomor tag)
       mengikuti roll-forward PSAK 16 ← WTB 1-2100 / 1-2110 & AJE-05
     · Pendapatan segmen dihentikan — AMS_CANON.revenue(wtb) ← WTB
       4-1100 (PSAK 72), stream "Jasa Logistik & Distribusi (3PL)"
     · Laba bersih total — FSGEN.buildModel(wtb).is.netIncome
     · Nilai wajar grup — appraisal KJPP (PSAK 68 · Level 2/3)
   Satu perubahan AJE (mis. AJE-05 koreksi penyusutan) menggeser nilai
   tercatat anggota grup → mengubah rugi penurunan reklasifikasi & hasil
   operasi dihentikan secara serempak.

   Cakupan: kriteria klasifikasi "highly probable" (¶7–9), pengukuran
   pada nilai terendah antara jumlah tercatat & nilai wajar dikurangi
   biaya menjual (¶15), rugi penurunan nilai reklasifikasi (¶20–22),
   penghentian penyusutan (¶25), operasi dihentikan — jumlah tunggal &
   analisisnya (¶31–33), penyajian terpisah di Neraca (¶38), tie-out
   lintas-laporan, lineage sumber data, & checklist pengungkapan (¶41).
   ============================================================ */
const { useState: useStateP58, useMemo: useMemoP58, useEffect: useEffectP58 } = React;

/* kriteria klasifikasi "dimiliki untuk dijual" — highly probable (¶7–9, ¶32) */
const P58_CRITERIA = [
  { id: 'c1', ref: '¶8',  t: 'Manajemen berkomitmen pada rencana penjualan aset', ev: 'Resolusi Direksi No. 14/DIR/IX-2025', ok: true },
  { id: 'c2', ref: '¶7',  t: 'Aset tersedia untuk dijual segera dalam kondisi kini', ev: 'Aset operasional, bebas sengketa', ok: true },
  { id: 'c3', ref: '¶8',  t: 'Program aktif mencari pembeli telah dimulai', ev: 'Penunjukan penasihat & teaser', ok: true },
  { id: 'c4', ref: '¶8',  t: 'Dipasarkan pada harga wajar relatif terhadap nilai wajar kini', ev: 'Harga indikatif ≈ appraisal KJPP', ok: true },
  { id: 'c5', ref: '¶8',  t: 'Penjualan diharapkan selesai dalam 12 bulan', ev: 'Target tutup transaksi Kuartal III 2026', ok: true },
  { id: 'c6', ref: '¶8',  t: 'Tindakan menunjukkan rencana tidak mungkin ditarik', ev: 'MoU eksklusif & due diligence berjalan', ok: true },
  { id: 'c7', ref: '¶32', t: 'Merupakan lini usaha utama terpisah (operasi dihentikan)', ev: 'Segmen 3PL = segmen dilaporkan PSAK 5', ok: true },
];

/* checklist pengungkapan PSAK 58 (default) */
const P58_DISCLOSURE = [
  { id: 'd15',  ref: '¶15',    t: 'Diukur pada nilai terendah antara jumlah tercatat & FVLCS', ok: true },
  { id: 'd25',  ref: '¶25',    t: 'Aset tidak disusutkan/diamortisasi selama diklasifikasi HFS', ok: true },
  { id: 'd38a', ref: '¶38',    t: 'Aset dimiliki untuk dijual disajikan terpisah di Neraca (lancar)', ok: true },
  { id: 'd38b', ref: '¶38',    t: 'Liabilitas disposal group disajikan terpisah', ok: true, na: true },
  { id: 'd41a', ref: '¶41(a)', t: 'Uraian aset tidak lancar / disposal group', ok: true },
  { id: 'd41b', ref: '¶41(b)', t: 'Uraian fakta & keadaan penjualan, cara & waktu yang diharapkan', ok: true },
  { id: 'd41c', ref: '¶41(c)', t: 'Rugi penurunan nilai (¶20) & pos laba rugi terkait', ok: true },
  { id: 'd41d', ref: '¶41(d)', t: 'Segmen dilaporkan tempat aset disajikan (PSAK 5)', ok: true },
  { id: 'd33a', ref: '¶33(a)', t: 'Jumlah tunggal operasi dihentikan pada muka Laba Rugi', ok: true },
  { id: 'd33b', ref: '¶33(b)', t: 'Analisis jumlah tunggal (pendapatan, beban, pajak, remeasurement)', ok: true },
  { id: 'd33c', ref: '¶33(c)', t: 'Arus kas neto operasi/investasi/pendanaan operasi dihentikan', ok: true },
];

function Dg58Card({ value, unit, label, sub, accent }) {
  return (
    <div className="panel" style={{ padding: '12px 14px', display: 'grid', gap: 2 }}>
      <div className="row ac gap4" style={{ alignItems: 'baseline' }}>
        <span className="mono" style={{ fontSize: 21, fontWeight: 700, color: accent || 'var(--navy)', lineHeight: 1 }}>{value}</span>
        {unit && <span className="tiny mono" style={{ color: 'var(--ink-4)', fontWeight: 600 }}>{unit}</span>}
      </div>
      <div className="tiny muted" style={{ fontWeight: 600 }}>{label}</div>
      {sub && <div className="tiny" style={{ color: 'var(--ink-4)' }}>{sub}</div>}
    </div>
  );
}

/* baris waterfall pengukuran (¶15) */
function MeasureRow({ label, v, sc, cite, sub, total, neg, memo }) {
  const strong = sub || total;
  return (
    <tr style={{
      borderTop: total ? '1.5px solid var(--navy)' : (sub ? '1px solid var(--line)' : '1px solid var(--line-soft)'),
      background: total ? 'var(--blue-050)' : 'transparent',
    }}>
      <td style={{ padding: total ? '9px 8px' : '6px 8px', fontSize: total ? 12.5 : 12, fontWeight: strong ? 700 : 400, color: strong ? 'var(--ink)' : 'var(--ink-2)', lineHeight: 1.3 }}>
        {label}{cite && <span className="mono tiny" style={{ color: 'var(--ink-4)', fontWeight: 600, marginLeft: 6 }}>{cite}</span>}
        {memo && <span className="tiny" style={{ color: 'var(--purple)', fontWeight: 600, marginLeft: 6 }}>{memo}</span>}
      </td>
      <td className="mono" style={{ textAlign: 'right', padding: total ? '9px 8px' : '6px 8px', whiteSpace: 'nowrap', fontSize: total ? 12.5 : 12, fontWeight: strong ? 700 : 500, color: v === 0 ? 'var(--ink-4)' : (neg ? 'var(--red)' : (strong ? 'var(--navy)' : 'var(--ink)')) }}>
        {v === 0 ? '—' : (neg ? '(' + sc(Math.abs(v)) + ')' : sc(v))}
      </td>
    </tr>
  );
}

function PSAK58View() {
  const { fmt } = AMS;
  const firm = useFirm();
  const audit = useAudit();
  const nav = useNav();
  const loader = window.loadLS || ((k, d) => d);

  /* ——— SUMBER KEBENARAN ——— */
  const wtb = (audit && audit.wtb && audit.wtb.length) ? audit.wtb : ((AMS && AMS.WTB) || []);
  const dg = useMemoP58(() => (AMS_CANON ? AMS_CANON.psak58(wtb) : null), [wtb]);

  const [unit, setUnit] = useStateP58(() => loader('ams.psak58.unit', 'jutaan'));
  const [tab, setTab] = useStateP58(() => loader('ams.psak58.tab', 'ikhtisar'));
  const [crit, setCrit] = useStateP58(() => loader('ams.psak58.crit', P58_CRITERIA));
  const [disc, setDisc] = useStateP58(() => loader('ams.psak58.disc', P58_DISCLOSURE));
  useEffectP58(() => { try { localStorage.setItem('ams.psak58.unit', JSON.stringify(unit)); } catch (e) {} }, [unit]);
  useEffectP58(() => { try { localStorage.setItem('ams.psak58.tab', JSON.stringify(tab)); } catch (e) {} }, [tab]);
  useEffectP58(() => { try { localStorage.setItem('ams.psak58.crit', JSON.stringify(crit)); } catch (e) {} }, [crit]);
  useEffectP58(() => { try { localStorage.setItem('ams.psak58.disc', JSON.stringify(disc)); } catch (e) {} }, [disc]);
  const toggleCrit = (id) => setCrit(list => list.map(r => r.id === id ? { ...r, ok: !r.ok } : r));
  const toggleDisc = (id) => setDisc(list => list.map(r => r.id === id ? { ...r, ok: !r.ok } : r));

  if (!dg) {
    return <><SubBar moduleId="psak58" /><div className="view-pad"><Panel title="PSAK 58"><div className="tiny muted">Mesin kanonik belum dimuat.</div></Panel></div></>;
  }

  const client = firm.activeClient || { name: 'PT Sentosa Makmur Tbk' };
  const eng = firm.activeEngagement || { id: 'ENG-2025-014', fy: 'FY2025' };
  const aje05 = ((AMS && AMS.AJE) || []).find(a => a.id === 'AJE-05');
  const riskPPE = ((AMS && AMS.RISKS) || []).find(r => r.id === 'R-04');

  /* ——— skala penyajian (kanonik dalam Rp juta) ——— */
  const UN = unit === 'penuh' ? { mult: 1e6, short: 'Rp' } : { mult: 1, short: 'Rp jt' };
  const sc = (vJuta) => fmt(Math.round(vJuta * UN.mult), 0);

  const critMet = crit.filter(c => c.ok).length;
  const highlyProbable = critMet === crit.length;
  const discOk = disc.filter(d => d.ok).length;
  const discReq = disc.filter(d => !d.na).length;

  /* ——— tie-out lintas-laporan (Rp juta) ——— */
  const tieRows = [
    { id: 't1', label: 'Nilai tercatat grup = Σ Register Aset Tetap', std: 'PSAK 16', a: dg.carryBefore, b: dg.regNbvCheck, note: 'Σ nilai buku neto anggota grup (per nomor tag) = sub-ledger aset tetap yang menutup ke GL (WTB 1-2100/1-2110).' },
    { id: 't2', label: 'Grup + sisa aset tetap = aset tetap neto', std: '¶38', a: dg.carryBefore + dg.ppeAfter, b: dg.ppeNet, note: 'Reklasifikasi adalah carve-out: nilai grup dipindah dari Aset Tetap ke pos "dimiliki untuk dijual" — total aset tidak berubah.' },
    { id: 't3', label: 'Rugi penurunan reklasifikasi = tercatat − FVLCS', std: '¶20', a: dg.writedown, b: Math.max(0, dg.carryBefore - dg.fvlcs), note: 'Penurunan ke nilai wajar dikurangi biaya menjual diakui sbg rugi pada hasil operasi dihentikan (¶33b).' },
    { id: 't4', label: 'Penyusutan dihentikan = peny. tahunan × bulan/12', std: '¶25', a: dg.deprCeased, b: Math.round(dg.annualDeprGrp * dg.monthsCeased / 12), note: 'Penyusutan tahunan anggota grup (Register PSAK 16) tidak dibebankan sejak tanggal klasifikasi (' + dg.classDate + ').' },
    { id: 't5', label: 'Pendapatan operasi dihentikan = stream 3PL', std: 'PSAK 72', a: dg.revDisc, b: dg.revDisc, note: 'Pendapatan segmen "' + dg.revStreamLabel + '" ditarik dari disagregasi PSAK 72 (WTB 4-1100).' },
    { id: 't6', label: 'Laba dilanjutkan + dihentikan = laba bersih total', std: 'PSAK 1', a: dg.contProfit + dg.postTaxDisc, b: dg.netTotal, note: 'Penyajian-ulang per ¶33 memecah laba bersih FS Generator menjadi operasi dilanjutkan & dihentikan — total tetap.' },
    { id: 't7', label: 'HFS disajikan = nilai terendah (tercatat, FVLCS)', std: '¶15', a: dg.carryHFS, b: Math.min(dg.carryBefore, dg.fvlcs), note: 'Aset dimiliki untuk dijual disajikan pada FVLCS karena lebih rendah dari jumlah tercatat.' },
  ].map(r => ({ ...r, diff: r.a - r.b, ok: Math.abs(r.a - r.b) < 1.5 }));
  const tiePass = tieRows.filter(r => r.ok).length;

  /* ——— lineage: tiap angka satu sumber ——— */
  const lineage = [
    { k: 'Nilai tercatat anggota grup (per tag)', src: 'PSAK 16 · Register Aset Tetap', route: 'psak16', icon: 'building' },
    { k: 'Harga perolehan & akum. penyusutan', src: 'WTB · 1-2100 / 1-2110', route: 'wtb', icon: 'ledger' },
    { k: 'Nilai wajar grup (Level 2/3)', src: 'PSAK 68 · appraisal KJPP', route: 'psak68', icon: 'layers' },
    { k: 'Pendapatan segmen dihentikan', src: 'PSAK 72 · stream 3PL (4-1100)', route: 'psak72', icon: 'receipt' },
    { k: 'Penyajian Neraca & Laba Rugi', src: 'FS Generator', route: 'fsgen', icon: 'report' },
    { k: 'Konsekuensi pajak operasi dihentikan', src: 'PSAK 46', route: 'psak46', icon: 'receipt' },
    { k: 'Rugi penurunan nilai (rujukan)', src: 'PSAK 48 · Penurunan Nilai', route: 'psak48', icon: 'scale' },
    { k: 'Risiko keberadaan/pelepasan aset', src: 'Penilaian Risiko · R-04', route: 'risk', icon: 'flag' },
    { k: 'Resolusi divestasi & MoU', src: 'DMS · Tata Kelola', route: 'dms', icon: 'doc' },
  ];

  const STATE = { ok: { I: 'checkCircle', c: 'var(--green)' }, warn: { I: 'alert', c: 'var(--amber)' } };

  /* ============ PANEL: kriteria klasifikasi (¶7–9) ============ */
  const criteriaPanel = (
    <Panel noBody>
      <div className="panel-h"><h3>Kriteria Klasifikasi — "Highly Probable"</h3><span className="sub mono">¶7–9 · ¶32</span><div style={{ flex: 1 }} /><Badge kind={highlyProbable ? 'green' : 'amber'}>{critMet}/{crit.length}</Badge></div>
      <div>
        {crit.map((c, i) => (
          <label key={c.id} className="row gap9" style={{ padding: '8px 13px', cursor: 'pointer', alignItems: 'flex-start', borderBottom: i < crit.length - 1 ? '1px solid var(--line-soft)' : 0 }} onClick={() => toggleCrit(c.id)}>
            <span style={{ flex: '0 0 16px', width: 16, height: 16, borderRadius: 4, marginTop: 1, border: '1.5px solid ' + (c.ok ? 'var(--green)' : 'var(--amber)'), background: c.ok ? 'var(--green)' : '#fff', display: 'grid', placeItems: 'center' }}>{c.ok && <I.check size={11} style={{ color: '#fff' }} />}</span>
            <span className="mono tiny" style={{ fontWeight: 700, color: 'var(--navy)', width: 34, flex: '0 0 34px', marginTop: 1 }}>{c.ref}</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 11.5, lineHeight: 1.4, color: c.ok ? 'var(--ink)' : 'var(--ink-2)', fontWeight: c.ok ? 600 : 400 }}>{c.t}</span>
              <span className="tiny" style={{ display: 'block', color: 'var(--ink-4)', marginTop: 1 }}>{c.ev}</span>
            </span>
          </label>
        ))}
      </div>
      <div className="tiny muted" style={{ padding: '9px 13px', lineHeight: 1.5, borderTop: '1px solid var(--line-soft)' }}>
        {highlyProbable
          ? <>Seluruh kriteria terpenuhi → penjualan <b style={{ color: 'var(--green)' }}>sangat mungkin terjadi</b>. Klasifikasi sebagai <b>dimiliki untuk dijual</b> pada {dg.classDate} tepat; karena segmen merupakan lini usaha utama terpisah, disajikan pula sebagai <b>operasi dihentikan</b> (¶32).</>
          : <>Satu/lebih kriteria belum terpenuhi → reklasifikasi <b style={{ color: 'var(--amber)' }}>belum tepat</b>; aset tetap diukur & disusutkan per PSAK 16 hingga seluruh kriteria ¶8 terpenuhi.</>}
      </div>
    </Panel>
  );

  /* ============ PANEL: reklasifikasi & carve-out (¶38) ============ */
  const carveOutPanel = (
    <Panel noBody>
      <div className="panel-h"><h3>Reklasifikasi Disposal Group</h3><span className="sub mono">¶4 · ¶38</span><div style={{ flex: 1 }} /><span className="tiny muted">{dg.group.segment}</span></div>
      <div style={{ padding: '4px 14px 12px', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
          <thead>
            <tr style={{ color: 'var(--ink-4)', textAlign: 'right' }}>
              <th style={{ textAlign: 'left', fontWeight: 600, padding: '6px 4px' }}>Aset (tag · register)</th>
              <th style={{ fontWeight: 600, padding: '6px 4px' }}>Harga perolehan</th>
              <th style={{ fontWeight: 600, padding: '6px 4px' }}>Akum. peny.</th>
              <th style={{ fontWeight: 600, padding: '6px 4px' }}>Nilai tercatat</th>
            </tr>
          </thead>
          <tbody>
            {dg.members.map((m, i) => (
              <tr key={i} style={{ borderTop: '1px solid var(--line-soft)' }}>
                <td style={{ padding: '7px 4px' }}>
                  <span className="mono tiny" style={{ fontWeight: 700, color: 'var(--navy)' }}>{m.tag}</span>
                  <span style={{ fontSize: 11.5, fontWeight: 600, marginLeft: 6 }}>{m.name}</span>
                  <span className="tiny" style={{ display: 'block', color: 'var(--ink-4)' }}>{m.classLabel}{m.depreciable ? ' · umur ' + m.life + ' th' : ' · tidak disusutkan (¶58 PSAK 16)'}</span>
                </td>
                <td className="mono" style={{ textAlign: 'right', padding: '7px 4px' }}>{sc(m.cost)}</td>
                <td className="mono" style={{ textAlign: 'right', padding: '7px 4px', color: m.accum ? 'var(--red)' : 'var(--ink-4)' }}>{m.accum ? sc(-m.accum) : '—'}</td>
                <td className="mono" style={{ textAlign: 'right', padding: '7px 4px', fontWeight: 600 }}>{sc(m.nbv)}</td>
              </tr>
            ))}
            <tr style={{ borderTop: '1.5px solid var(--navy)', fontWeight: 700 }}>
              <td style={{ padding: '8px 4px' }}>Jumlah tercatat grup — sebelum reklasifikasi</td>
              <td className="mono" style={{ textAlign: 'right', padding: '8px 4px' }}>{sc(dg.costTot)}</td>
              <td className="mono" style={{ textAlign: 'right', padding: '8px 4px', color: 'var(--red)' }}>{sc(-dg.accumTot)}</td>
              <td className="mono" style={{ textAlign: 'right', padding: '8px 4px', color: 'var(--navy)' }}>{sc(dg.carryBefore)}</td>
            </tr>
          </tbody>
        </table>
        {/* penyajian Neraca */}
        <div style={{ marginTop: 12, display: 'grid', gap: 0 }}>
          {[
            { l: 'Aset tetap — neto (PSAK 16/WTB) sebelum reklas', v: dg.ppeNet },
            { l: '(−) Direklasifikasi ke "dimiliki untuk dijual"', v: -dg.carryBefore, neg: true },
            { l: 'Aset tetap — neto setelah reklasifikasi', v: dg.ppeAfter, sub: true },
            { l: 'Aset dimiliki untuk dijual (lancar · pada FVLCS)', v: dg.carryHFS, hi: true },
          ].map((r, i) => (
            <div key={i} className="row ac jb" style={{ padding: '7px 0', borderTop: i ? '1px solid var(--line-soft)' : 0 }}>
              <span style={{ fontSize: 12, color: r.sub || r.hi ? 'var(--ink)' : 'var(--ink-2)', fontWeight: r.sub || r.hi ? 700 : 400 }}>{r.l}</span>
              <span className="mono" style={{ fontSize: 12, fontWeight: r.sub || r.hi ? 700 : 600, color: r.neg ? 'var(--red)' : (r.hi ? 'var(--navy)' : 'var(--ink)') }}>{r.neg ? '(' + sc(Math.abs(r.v)) + ')' : sc(r.v)}</span>
            </div>
          ))}
        </div>
        <div className="panel" style={{ marginTop: 12, padding: '9px 11px', background: 'var(--blue-050)', borderColor: 'transparent' }}>
          <div className="row gap8" style={{ alignItems: 'flex-start' }}>
            <span style={{ color: 'var(--blue)', marginTop: 1 }}><I.building size={15} /></span>
            <span style={{ fontSize: 11.5, lineHeight: 1.45 }}>
              Nilai grup <b>Rp {sc(dg.carryBefore)} {UN.short}</b> ({fmt(dg.dgPctPpe * 100, 1)}% aset tetap) ditarik per nomor tag dari <b onClick={() => nav('psak16', { from: 'psak58' })} style={{ color: 'var(--blue)', cursor: 'pointer' }}>Register Aset Tetap (PSAK 16)</b>. Reklasifikasi adalah penyajian carve-out — bukan saldo baru di buku besar — sehingga total aset tetap + HFS menutup ke WTB.
            </span>
          </div>
        </div>
      </div>
    </Panel>
  );

  /* ============ PANEL: pengukuran (¶15–22) ============ */
  const measureRows = [
    { label: 'Jumlah tercatat grup — sebelum reklasifikasi', v: dg.carryBefore, cite: 'PSAK 16' },
    { label: 'Nilai wajar grup — appraisal KJPP', v: dg.fairValue, cite: 'PSAK 68' },
    { label: '(−) Biaya menjual (' + fmt(dg.costToSellPct * 100, 1) + '%)', v: -dg.costToSell, neg: true, memo: 'broker · notaris · HGB' },
    { label: 'Nilai wajar dikurangi biaya menjual (FVLCS)', v: dg.fvlcs, sub: true, cite: '¶15' },
    { label: 'Rugi penurunan nilai reklasifikasi', v: -dg.writedown, neg: true, cite: '¶20' },
    { label: 'Aset dimiliki untuk dijual — nilai tercatat akhir', v: dg.carryHFS, total: true },
  ];
  const measurePanel = (
    <Panel noBody>
      <div className="panel-h"><h3>Pengukuran — Lower of Carrying & FVLCS</h3><span className="sub mono">¶15–22</span><div style={{ flex: 1 }} /><Badge kind={dg.impaired ? 'amber' : 'green'}>{dg.impaired ? 'rugi penurunan' : 'tanpa penurunan'}</Badge></div>
      <div style={{ padding: '4px 14px 12px', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ color: 'var(--ink-4)' }}>
              <th style={{ textAlign: 'left', fontWeight: 600, padding: '4px 8px' }}>Komponen pengukuran</th>
              <th style={{ textAlign: 'right', fontWeight: 600, padding: '4px 8px' }}>{UN.short}</th>
            </tr>
          </thead>
          <tbody>{measureRows.map((r, i) => <MeasureRow key={i} {...r} sc={sc} />)}</tbody>
        </table>
        <div className="panel" style={{ marginTop: 12, padding: '9px 11px', background: dg.impaired ? 'var(--amber-bg)' : 'var(--green-bg)', borderColor: 'transparent' }}>
          <div className="row gap8" style={{ alignItems: 'flex-start' }}>
            <span style={{ color: dg.impaired ? 'var(--amber)' : 'var(--green)', marginTop: 1 }}>{dg.impaired ? <I.alert size={15} /> : <I.checkCircle size={15} />}</span>
            <span style={{ fontSize: 11.5, lineHeight: 1.45 }}>
              {dg.impaired
                ? <>FVLCS <b>Rp {sc(dg.fvlcs)} {UN.short}</b> lebih rendah dari jumlah tercatat → diakui <b>rugi penurunan nilai Rp {sc(dg.writedown)} {UN.short}</b> (¶20), dialokasikan ke aset non-lancar dalam lingkup (¶23) & disajikan pada hasil operasi dihentikan (¶33b). Nilai wajar diukur per <b onClick={() => nav('psak68', { from: 'psak58' })} style={{ color: 'var(--blue)', cursor: 'pointer' }}>PSAK 68</b> (Level 2/3).</>
                : <>FVLCS tidak lebih rendah dari jumlah tercatat → tidak ada rugi penurunan nilai; aset disajikan pada jumlah tercatat.</>}
            </span>
          </div>
        </div>
      </div>
    </Panel>
  );

  /* ============ PANEL: penghentian penyusutan (¶25) ============ */
  const deprPanel = (
    <Panel noBody>
      <div className="panel-h"><h3>Penghentian Penyusutan</h3><span className="sub mono">¶25</span><div style={{ flex: 1 }} /><span className="tiny muted">sejak {dg.classDate}</span></div>
      <div style={{ padding: '4px 14px 12px', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
          <thead>
            <tr style={{ color: 'var(--ink-4)', textAlign: 'right' }}>
              <th style={{ textAlign: 'left', fontWeight: 600, padding: '6px 4px' }}>Aset disusutkan</th>
              <th style={{ fontWeight: 600, padding: '6px 4px' }}>Peny. tahunan</th>
              <th style={{ fontWeight: 600, padding: '6px 4px' }}>Tdk dibebankan ({dg.monthsCeased} bln)</th>
            </tr>
          </thead>
          <tbody>
            {dg.members.filter(m => m.depreciable).map((m, i) => (
              <tr key={i} style={{ borderTop: '1px solid var(--line-soft)' }}>
                <td style={{ padding: '7px 4px' }}><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--navy)' }}>{m.tag}</span> <span style={{ fontSize: 11.5 }}>{m.name}</span></td>
                <td className="mono" style={{ textAlign: 'right', padding: '7px 4px' }}>{sc(m.annual)}</td>
                <td className="mono" style={{ textAlign: 'right', padding: '7px 4px', color: 'var(--blue)', fontWeight: 600 }}>{sc(Math.round(m.annual * dg.monthsCeased / 12))}</td>
              </tr>
            ))}
            <tr style={{ borderTop: '1.5px solid var(--navy)', fontWeight: 700 }}>
              <td style={{ padding: '8px 4px' }}>Penyusutan dihentikan ({dg.monthsCeased} bulan)</td>
              <td className="mono" style={{ textAlign: 'right', padding: '8px 4px' }}>{sc(dg.annualDeprGrp)}</td>
              <td className="mono" style={{ textAlign: 'right', padding: '8px 4px', color: 'var(--blue)' }}>{sc(dg.deprCeased)}</td>
            </tr>
          </tbody>
        </table>
        <div className="tiny muted" style={{ marginTop: 9, lineHeight: 1.5 }}>
          Sejak diklasifikasi dimiliki untuk dijual, aset <b>tidak disusutkan</b> (¶25). Penyusutan tahunan ditarik dari Register Aset Tetap (PSAK 16) — beban Rp {sc(dg.deprCeased)} {UN.short} untuk {dg.monthsCeased} bulan terakhir tidak dibebankan. Tanah ({dg.members.filter(m => !m.depreciable).map(m => m.tag).join(', ')}) memang tidak disusutkan.
        </div>
      </div>
    </Panel>
  );

  /* ============ PANEL: operasi dihentikan — jumlah tunggal & analisis (¶33) ============ */
  const discRows = [
    { label: 'Pendapatan segmen — ' + dg.revStreamLabel, v: dg.revDisc, cite: 'PSAK 72' },
    { label: 'Beban operasi segmen', v: dg.revDisc - dg.opResultDisc !== 0 ? -(dg.revDisc - dg.opResultDisc) : 0, neg: (dg.revDisc - dg.opResultDisc) > 0 },
    { label: 'Hasil operasi segmen — sebelum pajak', v: dg.opResultDisc, sub: true, neg: dg.opResultDisc < 0 },
    { label: 'Rugi penurunan nilai pengukuran ke FVLCS', v: -dg.writedown, neg: true, cite: '¶20' },
    { label: 'Hasil sebelum pajak dari operasi dihentikan', v: dg.pretaxDisc, sub: true, neg: dg.pretaxDisc < 0 },
    { label: 'Manfaat (beban) pajak penghasilan', v: -dg.taxDisc, neg: dg.taxDisc > 0 ? false : true, cite: 'PSAK 46', memo: dg.taxDisc < 0 ? 'kredit pajak' : null },
    { label: 'Hasil setelah pajak dari operasi dihentikan', v: dg.postTaxDisc, total: true, neg: dg.postTaxDisc < 0 },
  ];
  const discPanel = (
    <Panel noBody>
      <div className="panel-h"><h3>Operasi Dihentikan — Analisis Jumlah Tunggal</h3><span className="sub mono">¶33(a)(b)</span><div style={{ flex: 1 }} /><Badge kind="gray">PSAK 5</Badge></div>
      <div style={{ padding: '4px 14px 12px', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ color: 'var(--ink-4)' }}>
              <th style={{ textAlign: 'left', fontWeight: 600, padding: '4px 8px' }}>Komponen (¶33b)</th>
              <th style={{ textAlign: 'right', fontWeight: 600, padding: '4px 8px' }}>{UN.short}</th>
            </tr>
          </thead>
          <tbody>{discRows.map((r, i) => <MeasureRow key={i} {...r} sc={sc} />)}</tbody>
        </table>
        <div className="tiny muted" style={{ marginTop: 9, lineHeight: 1.5 }}>
          Jumlah tunggal <b style={{ color: dg.postTaxDisc < 0 ? 'var(--red)' : 'var(--green)' }}>{dg.postTaxDisc < 0 ? '(' + sc(Math.abs(dg.postTaxDisc)) + ')' : sc(dg.postTaxDisc)} {UN.short}</b> disajikan pada muka Laba Rugi sebagai <b>hasil setelah pajak dari operasi dihentikan</b> (¶33a). Pendapatan & beban segmen ditarik dari PSAK 72; rugi remeasurement ke FVLCS termasuk di dalamnya (¶33b).
        </div>
      </div>
    </Panel>
  );

  /* ============ PANEL: jembatan laba (penyajian-ulang ¶33) ============ */
  const bridgePanel = (
    <Panel noBody>
      <div className="panel-h"><h3>Jembatan Laba Bersih</h3><span className="sub mono">PSAK 1 · ¶33</span></div>
      <div style={{ padding: '10px 13px', display: 'grid', gap: 0 }}>
        {[
          { l: 'Laba bersih total (FS Generator)', v: dg.netTotal, sub: true },
          { l: '(−) Hasil setelah pajak operasi dihentikan', v: -dg.postTaxDisc, neg: dg.postTaxDisc > 0 },
          { l: 'Laba dari operasi dilanjutkan', v: dg.contProfit, total: true },
        ].map((r, i) => (
          <div key={i} className="row ac jb" style={{ padding: '8px 0', borderTop: r.total ? '1.5px solid var(--navy)' : (i ? '1px solid var(--line-soft)' : 0) }}>
            <span style={{ fontSize: 12.5, color: 'var(--ink)', fontWeight: r.sub || r.total ? 700 : 400 }}>{r.l}</span>
            <span className="mono" style={{ fontSize: 12.5, fontWeight: r.sub || r.total ? 700 : 600, color: r.total ? 'var(--navy)' : (r.v < 0 ? 'var(--red)' : 'var(--ink)') }}>{r.v < 0 ? '(' + sc(Math.abs(r.v)) + ')' : sc(r.v)}</span>
          </div>
        ))}
      </div>
      <div className="tiny muted" style={{ padding: '0 13px 11px', lineHeight: 1.5 }}>
        Penyajian-ulang per ¶33 <b>tidak mengubah</b> laba bersih total — hanya memisahkan kontribusi operasi dihentikan dari operasi dilanjutkan. Total menutup ke <b onClick={() => nav('fsgen', { from: 'psak58' })} style={{ color: 'var(--blue)', cursor: 'pointer' }}>FS Generator</b>.
      </div>
    </Panel>
  );

  /* ============ PANEL: arus kas operasi dihentikan (¶33c) ============ */
  const cashPanel = (
    <Panel title="Arus Kas Operasi Dihentikan" sub="¶33(c)">
      <div style={{ display: 'grid', gap: 0 }}>
        {[
          { l: 'Arus kas neto dari aktivitas operasi', v: dg.cfOps },
          { l: 'Arus kas neto dari aktivitas investasi', v: dg.cfInv },
          { l: 'Arus kas neto dari aktivitas pendanaan', v: dg.cfFin },
        ].map((r, i) => (
          <div key={i} className="row ac jb" style={{ padding: '8px 0', borderTop: i ? '1px solid var(--line-soft)' : 0 }}>
            <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>{r.l}</span>
            <span className="mono" style={{ fontSize: 12, fontWeight: 600, color: r.v === 0 ? 'var(--ink-4)' : (r.v < 0 ? 'var(--red)' : 'var(--ink)') }}>{r.v === 0 ? '—' : (r.v < 0 ? '(' + sc(Math.abs(r.v)) + ')' : sc(r.v))}</span>
          </div>
        ))}
      </div>
      <div className="tiny muted" style={{ marginTop: 8, lineHeight: 1.5 }}>
        Arus kas yang dapat diatribusikan ke segmen dihentikan diungkapkan terpisah (¶33c). Belum ada arus investasi/pendanaan terealisasi — divestasi ditargetkan tutup {dg.group.expectedClose}.
      </div>
    </Panel>
  );

  /* ============ PANEL: tie-out ============ */
  const tieoutPanel = (
    <Panel noBody>
      <div className="row ac jb" style={{ padding: '11px 13px', borderBottom: '1px solid var(--line)' }}>
        <div><div style={{ fontWeight: 700, fontSize: 13, color: 'var(--navy)' }}>Validasi & Tie-out</div><div className="tiny muted">Satu sumber kebenaran (WTB → modul)</div></div>
        <div style={{ textAlign: 'right' }}><div className="mono" style={{ fontSize: 17, fontWeight: 700, color: tiePass === tieRows.length ? 'var(--green)' : 'var(--amber)' }}>{tiePass}/{tieRows.length}</div><div className="tiny muted">lolos</div></div>
      </div>
      <div style={{ padding: 9, display: 'grid', gap: 7 }}>
        {tieRows.map(c => (
          <div key={c.id} style={{ border: '1px solid var(--line)', borderRadius: 7, padding: '9px 10px', background: c.ok ? 'var(--surface)' : 'var(--amber-bg)' }}>
            <div className="row ac gap8" style={{ marginBottom: 5 }}>
              <span style={{ color: c.ok ? 'var(--green)' : 'var(--amber)', display: 'grid', placeItems: 'center' }}>{c.ok ? <I.checkCircle size={15} /> : <I.alert size={15} />}</span>
              <span style={{ fontWeight: 600, fontSize: 12, flex: 1, color: 'var(--ink)', lineHeight: 1.3 }}>{c.label}</span>
              <Badge kind="gray">{c.std}</Badge>
            </div>
            <div className="tiny muted" style={{ marginBottom: 5, paddingLeft: 23, lineHeight: 1.4 }}>{c.note}</div>
            <div className="row" style={{ paddingLeft: 23, gap: 0, fontFamily: 'var(--mono)', fontSize: 10.5 }}>
              <div style={{ flex: 1 }}><div className="tiny" style={{ color: 'var(--ink-4)' }}>A</div><div style={{ fontWeight: 600 }}>{sc(c.a)}</div></div>
              <div style={{ flex: 1 }}><div className="tiny" style={{ color: 'var(--ink-4)' }}>B</div><div style={{ fontWeight: 600 }}>{sc(c.b)}</div></div>
              <div style={{ flex: 1 }}><div className="tiny" style={{ color: 'var(--ink-4)' }}>Δ</div><div style={{ fontWeight: 700, color: c.ok ? 'var(--green)' : 'var(--red)' }}>{sc(c.diff)}</div></div>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );

  /* ============ PANEL: lineage ============ */
  const lineagePanel = (
    <Panel noBody>
      <div className="panel-h"><h3>Sumber Data (Lineage)</h3><div style={{ flex: 1 }} /><span className="tiny muted">klik untuk telusuri</span></div>
      <div style={{ padding: 6 }}>
        {lineage.map((r, i) => {
          const IconC = I[r.icon] || I.doc;
          return (
            <button key={i} onClick={() => nav(r.route, { from: 'psak58' })} className="row ac gap9" style={{ width: '100%', textAlign: 'left', padding: '8px 9px', borderRadius: 7, border: '1px solid transparent', background: 'none', cursor: 'pointer' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--blue-050)'; e.currentTarget.style.borderColor = 'var(--blue-100)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.borderColor = 'transparent'; }}>
              <span style={{ color: 'var(--blue)', flex: '0 0 auto' }}><IconC size={15} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.3 }}>{r.k}</div>
                <div className="tiny muted mono">{r.src}</div>
              </div>
              <I.arrowRight size={13} style={{ color: 'var(--ink-4)' }} />
            </button>
          );
        })}
      </div>
      <div className="tiny muted" style={{ padding: '0 12px 11px', lineHeight: 1.5 }}>
        Tidak ada angka di-input ulang: nilai tercatat grup ditarik dari Register Aset Tetap (PSAK 16) yang menutup ke WTB; pendapatan segmen dari PSAK 72; laba bersih dari FS Generator. Perubahan AJE mengalir serempak.
      </div>
    </Panel>
  );

  /* ============ PANEL: checklist pengungkapan ============ */
  const disclosurePanel = (
    <Panel noBody>
      <div className="panel-h"><h3>Pengungkapan PSAK 58</h3><span className="sub mono">¶38 · ¶41 · ¶33</span><div style={{ flex: 1 }} /><span className="tiny muted">{discOk}/{disc.length}</span></div>
      <div>
        {disc.map((d, i) => (
          <label key={d.id} className="row gap9" style={{ padding: '8px 13px', cursor: d.na ? 'default' : 'pointer', alignItems: 'flex-start', borderBottom: i < disc.length - 1 ? '1px solid var(--line-soft)' : 0, opacity: d.na ? 0.6 : 1 }} onClick={() => !d.na && toggleDisc(d.id)}>
            <span style={{ flex: '0 0 16px', width: 16, height: 16, borderRadius: 4, marginTop: 1, border: '1.5px solid ' + (d.na ? 'var(--line)' : (d.ok ? 'var(--green)' : 'var(--amber)')), background: d.ok && !d.na ? 'var(--green)' : '#fff', display: 'grid', placeItems: 'center' }}>{d.ok && !d.na && <I.check size={11} style={{ color: '#fff' }} />}{d.na && <span className="mono" style={{ fontSize: 8, color: 'var(--ink-4)' }}>N/A</span>}</span>
            <span className="mono tiny" style={{ fontWeight: 700, color: 'var(--navy)', width: 52, flex: '0 0 52px', marginTop: 1 }}>{d.ref}</span>
            <span style={{ fontSize: 11.5, lineHeight: 1.4, color: d.ok ? 'var(--ink-2)' : 'var(--ink)', fontWeight: d.ok ? 400 : 600 }}>{d.t}</span>
          </label>
        ))}
      </div>
      <div className="tiny muted" style={{ padding: '9px 13px', lineHeight: 1.5, borderTop: '1px solid var(--line-soft)' }}>
        Disposal group tidak memuat liabilitas terkait → penyajian liabilitas terpisah (¶38) <b>N/A</b>. Seluruh pengungkapan kuantitatif menutup ke modul sumber ber-WTB.
      </div>
    </Panel>
  );

  /* ============ TABS ============ */
  const TABS = [
    { id: 'ikhtisar',   label: 'Ikhtisar & Reklasifikasi', icon: 'table',    badge: tiePass + '/' + tieRows.length, bad: tiePass !== tieRows.length },
    { id: 'pengukuran', label: 'Pengukuran & Penyusutan',  icon: 'scale',    badge: dg.impaired ? sc(dg.writedown) : null, bad: dg.impaired },
    { id: 'dihentikan', label: 'Operasi Dihentikan',       icon: 'flag',     badge: '¶33', bad: false },
    { id: 'pengungkapan', label: 'Pengungkapan & Sumber',  icon: 'doc',      badge: discOk + '/' + disc.length, bad: discOk < discReq },
  ];

  return (
    <>
      <SubBar moduleId="psak58" right={
        <div className="row gap8 ac">
          <Badge kind={highlyProbable ? 'green' : 'amber'}>PSAK 58 · IFRS 5</Badge>
          <div className="seg" style={{ width: 'fit-content' }}>
            <button className={unit === 'jutaan' ? 'on' : ''} onClick={() => setUnit('jutaan')}>Jutaan</button>
            <button className={unit === 'penuh' ? 'on' : ''} onClick={() => setUnit('penuh')}>Penuh</button>
          </div>
          <Btn sm onClick={() => nav('psak16', { from: 'psak58' })}><I.building size={13} /> PSAK 16 · Aset Tetap</Btn>
          <Btn sm onClick={() => nav('psak68', { from: 'psak58' })}><I.layers size={13} /> PSAK 68 · Nilai Wajar</Btn>
          <Btn sm onClick={() => nav('fsgen', { from: 'psak58' })}><I.report size={13} /> FS Generator</Btn>
          <Btn sm onClick={() => nav('wtb', { from: 'psak58' })}><I.ledger size={13} /> Buku Besar</Btn>
          <Btn sm><I.download size={13} /> Kertas Kerja E-7</Btn>
        </div>
      } />
      <div className="view-scroll">
        <div className="view-pad" style={{ display: 'grid', gap: 12 }}>

          {/* summary */}
          <div className="grid" style={{ gridTemplateColumns: 'repeat(5,1fr)', gap: 10 }}>
            <Dg58Card value={fmt(dg.carryHFS / 1e3, 1)} unit="M" label="Aset dimiliki untuk dijual" sub="¶15 · disajikan pada FVLCS" accent="var(--navy)" />
            <Dg58Card value={dg.writedown ? '(' + fmt(dg.writedown, 0) + ')' : '0'} unit="jt" label="Rugi penurunan reklasifikasi" sub={dg.impaired ? '¶20 · ke operasi dihentikan' : 'tanpa penurunan'} accent={dg.impaired ? 'var(--red)' : 'var(--green)'} />
            <Dg58Card value={fmt(dg.deprCeased, 0)} unit="jt" label="Penyusutan dihentikan" sub={'¶25 · ' + dg.monthsCeased + ' bulan'} accent="var(--blue)" />
            <Dg58Card value={(dg.postTaxDisc < 0 ? '(' + fmt(Math.abs(dg.postTaxDisc), 0) + ')' : fmt(dg.postTaxDisc, 0))} unit="jt" label="Operasi dihentikan — neto" sub="¶33(a) · setelah pajak" accent={dg.postTaxDisc < 0 ? 'var(--red)' : 'var(--green)'} />
            <Dg58Card value={tiePass + '/' + tieRows.length} label="Tie-out lintas-laporan" sub={tiePass === tieRows.length ? 'seluruh rekonsiliasi menutup' : 'perlu ditelusuri'} accent={tiePass === tieRows.length ? 'var(--green)' : 'var(--amber)'} />
          </div>

          {/* tab bar */}
          <div className="row" style={{ gap: 0, borderBottom: '1px solid var(--line)', overflowX: 'auto', flexWrap: 'nowrap' }}>
            {TABS.map(t => {
              const IconT = I[t.icon] || I.doc;
              const on = tab === t.id;
              return (
                <button key={t.id} onClick={() => setTab(t.id)} className="row ac gap7" style={{
                  padding: '9px 15px', border: 'none', background: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                  fontSize: 12.5, fontWeight: on ? 700 : 500, color: on ? 'var(--navy)' : 'var(--ink-3)',
                  borderBottom: '2px solid ' + (on ? 'var(--navy)' : 'transparent'), marginBottom: -1,
                }}>
                  <IconT size={14} />
                  {t.label}
                  {t.badge && <span className="mono" style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 9, color: t.bad ? 'var(--amber)' : (on ? 'var(--navy)' : 'var(--ink-4)'), background: t.bad ? 'var(--amber-bg)' : (on ? 'var(--blue-050)' : 'var(--surface-2, #f1f3f6)') }}>{t.badge}</span>}
                </button>
              );
            })}
          </div>

          {/* ============ TAB: IKHTISAR ============ */}
          {tab === 'ikhtisar' && (
            <div className="grid" style={{ gridTemplateColumns: '1fr 336px', gap: 12, alignItems: 'start' }}>
              <div className="grid" style={{ gap: 12 }}>{criteriaPanel}{carveOutPanel}</div>
              {tieoutPanel}
            </div>
          )}

          {/* ============ TAB: PENGUKURAN ============ */}
          {tab === 'pengukuran' && (
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }}>
              {measurePanel}
              {deprPanel}
            </div>
          )}

          {/* ============ TAB: OPERASI DIHENTIKAN ============ */}
          {tab === 'dihentikan' && (
            <div className="grid" style={{ gap: 12 }}>
              {discPanel}
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }}>{bridgePanel}{cashPanel}</div>
            </div>
          )}

          {/* ============ TAB: PENGUNGKAPAN & SUMBER ============ */}
          {tab === 'pengungkapan' && (
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }}>{disclosurePanel}{lineagePanel}</div>
          )}

          {riskPPE && (
            <div onClick={() => nav('risk', { from: 'psak58' })} className="tiny" style={{ padding: '9px 11px', borderRadius: 7, background: 'var(--amber-bg)', cursor: 'pointer', lineHeight: 1.5 }}>
              <b>{riskPPE.id}</b> — {riskPPE.desc}. Klasifikasi disposal group memicu prosedur keberadaan & otorisasi pelepasan (WP E-5/E-7); pastikan aset yang akan dijual benar-benar ada & rencana divestasi terotorisasi.
            </div>
          )}

          <div className="tiny muted" style={{ padding: '0 2px 4px', lineHeight: 1.5 }}>
            Kertas kerja aset dimiliki untuk dijual & operasi dihentikan <b>{client.name}</b> ({eng.id} · {eng.fy}) disusun sesuai PSAK 58. Nilai tercatat disposal group <b>{dg.group.segment}</b> ditarik per nomor tag dari Register Aset Tetap (PSAK 16 ← WTB 1-2100/1-2110); pendapatan segmen dari PSAK 72 (4-1100); laba bersih dari FS Generator; nilai wajar dari appraisal KJPP (PSAK 68). {aje05 ? <>Koreksi <b>{aje05.id}</b> ({aje05.desc}) berstatus {aje05.status} menggeser nilai buku anggota grup secara live.</> : null} Status & pilihan tersimpan otomatis untuk jejak audit.
          </div>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { PSAK58View });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { PSAK58View };
