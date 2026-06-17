/* [codemod] ESM imports */
import React from 'react';
import { useAudit, useFirm, useNav } from './contexts.jsx';
import { I } from './icons.jsx';
import { SubBar } from './shell.jsx';
import { Badge, Btn, Panel } from './ui.jsx';

/* ============================================================
   NeoSuite AMS — PSAK 19 · Aset Takberwujud (Intangible Assets)
   Kertas kerja penyusunan & audit Aset Takberwujud yang DITARIK PENUH
   dari satu sumber kebenaran:
     · Working Trial Balance (useAudit().wtb) — akun 1-2400 (Harga
       Perolehan) & 1-2410 (Akumulasi Amortisasi). Kedua akun ini
       DIRECLASS dari Aset Tetap (1-2100/1-2110): lisensi software,
       paten & hubungan pelanggan yang sebelumnya tercatat sebagai
       aset tetap. Total Aset Tidak Lancar tidak berubah — hanya
       pengklasifikasian ulang antar-pos.
     · AMS_CANON.intangibles(wtb) — mesin derivasi takberwujud yang
       sama dipakai tab Rekonsiliasi Angka.
     · FSGEN.buildModel(wtb) — penyajian Neraca (Aset takberwujud —
       neto) & add-back amortisasi pada Arus Kas.
   Tidak ada angka di-hardcode. Satu perubahan AJE pada WTB mengalir
   serempak ke roll-forward, FS Generator, Arus Kas, & Rekonsiliasi.

   Cakupan: definisi & kriteria pengakuan — keteridentifikasian,
   kendali, manfaat ekonomi (¶8–17); aset diperoleh terpisah (¶24–32);
   aset takberwujud internal — riset DIBEBANKAN (¶54) vs pengembangan
   DIKAPITALISASI bila enam kriteria ¶57 terpenuhi; goodwill & merek
   internal TIDAK diakui (¶48, ¶63); pengukuran setelah pengakuan —
   model biaya vs revaluasi (¶72–87, butuh pasar aktif ¶78); umur
   manfaat terbatas (amortisasi garis lurus ¶97–106) vs TAK-TERBATAS
   (tidak diamortisasi, uji penurunan nilai TAHUNAN ¶107–110 → PSAK 48);
   penghentian pengakuan (¶112); rekonsiliasi nilai tercatat (¶118e)
   yang menutup ke WTB; tie-out lintas-laporan; lineage; & checklist
   pengungkapan (¶118–128).
   ============================================================ */
const { useState: useStateP19, useMemo: useMemoP19, useEffect: useEffectP19 } = React;

/* peta asersi → prosedur audit aset takberwujud */
const P19_ASSERT = [
  { asr: 'Keberadaan & Hak', proc: 'Inspeksi bukti kepemilikan hukum: sertifikat paten, perjanjian lisensi, kontrak akuisisi', sa: 'SA 500', wp: 'E-INT-1', state: 'ok' },
  { asr: 'Pengakuan — Internal', proc: 'Uji pemenuhan enam kriteria ¶57 atas pengembangan dikapitalisasi; riset dibebankan', sa: 'SA 500', wp: 'E-INT-2', state: 'warn' },
  { asr: 'Kelengkapan', proc: 'Telaah beban riset/pengembangan & belanja TI — kapitalisasi vs beban (¶54, ¶68)', sa: 'SA 500', wp: 'E-INT-3', state: 'ok' },
  { asr: 'Penilaian — Amortisasi', proc: 'Re-perform amortisasi & telaah umur manfaat / metode (¶104)', sa: 'SA 540', wp: 'E-INT-4', state: 'ok' },
  { asr: 'Penilaian — Penurunan nilai', proc: 'Uji penurunan nilai TAHUNAN lisensi umur tak-terbatas (¶108 → PSAK 48)', sa: 'SA 540', wp: 'E-INT-5', state: 'warn' },
  { asr: 'Penyajian', proc: 'Klasifikasi per kelompok & kelengkapan pengungkapan (¶118–128)', sa: 'SA 700', wp: 'E-INT-6', state: 'ok' },
];

/* enam kriteria kapitalisasi biaya pengembangan (¶57) */
const P19_DEVCRIT = [
  { id: 'c1', t: 'Kelayakan teknis penyelesaian aset agar dapat digunakan/dijual', ok: true },
  { id: 'c2', t: 'Niat menyelesaikan aset & menggunakan atau menjualnya', ok: true },
  { id: 'c3', t: 'Kemampuan untuk menggunakan atau menjual aset', ok: true },
  { id: 'c4', t: 'Aset menghasilkan kemungkinan besar manfaat ekonomi masa depan (ada pasar / kegunaan internal)', ok: true },
  { id: 'c5', t: 'Tersedia sumber daya teknis, keuangan & lain untuk menyelesaikan', ok: true },
  { id: 'c6', t: 'Kemampuan mengukur secara andal pengeluaran selama pengembangan', ok: false },
];

/* indikasi penurunan nilai (¶111 → PSAK 48 ¶12) — wajib + indikator */
const P19_IMPAIR = [
  { id: 'm01', t: 'Lisensi umur tak-terbatas — uji WAJIB tahunan (¶108)', src: 'wajib', flag: true },
  { id: 'm02', t: 'Aset belum tersedia untuk digunakan — uji WAJIB tahunan (¶108)', src: 'wajib', flag: false },
  { id: 'm03', t: 'Keusangan teknologi perangkat lunak / perubahan platform', src: 'internal', flag: true },
  { id: 'm04', t: 'Hilang/berakhirnya hak hukum atau perlindungan paten', src: 'eksternal', flag: false },
  { id: 'm05', t: 'Kinerja ekonomi aset lebih buruk dari ekspektasi', src: 'internal', flag: false },
  { id: 'm06', t: 'Perubahan merugikan pasar / lingkungan hukum', src: 'eksternal', flag: false },
];

/* checklist pengungkapan PSAK 19 (default) */
const P19_DISCLOSURE = [
  { id: 'q118a', ref: '¶118(a)', t: 'Umur manfaat terbatas/tak-terbatas; bila terbatas — umur atau tarif amortisasi', ok: true },
  { id: 'q118b', ref: '¶118(b)', t: 'Metode amortisasi aset berumur manfaat terbatas (garis lurus)', ok: true },
  { id: 'q118c', ref: '¶118(c)', t: 'Jumlah tercatat bruto & akumulasi amortisasi, awal & akhir periode', ok: true },
  { id: 'q118d', ref: '¶118(d)', t: 'Pos Laba Rugi yang memuat amortisasi aset takberwujud', ok: true },
  { id: 'q118e', ref: '¶118(e)', t: 'Rekonsiliasi jumlah tercatat: penambahan, amortisasi, penurunan nilai', ok: true },
  { id: 'q122a', ref: '¶122(a)', t: 'Aset umur tak-terbatas: jumlah tercatat & alasan penetapan tak-terbatas', ok: false },
  { id: 'q122b', ref: '¶122(b)', t: 'Uraian, jumlah tercatat & sisa amortisasi aset individual yang material', ok: true },
  { id: 'q126',  ref: '¶126',    t: 'Jumlah agregat pengeluaran riset & pengembangan yang dibebankan', ok: false },
  { id: 'q124',  ref: '¶124',    t: 'Pengungkapan model revaluasi (bila diterapkan — butuh pasar aktif ¶78)', ok: true, na: true },
];

function ItCard({ value, unit, label, sub, accent }) {
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

/* baris matriks roll-forward (¶118e): Harga Perolehan | Akum. Amortisasi | Neto */
function RfRowP19({ label, hp, ak, net, sc, sub, total, memo }) {
  const strong = sub || total;
  const cell = (v, contra) => (
    <td className="mono" style={{
      textAlign: 'right', padding: total ? '9px 8px' : '6px 8px', whiteSpace: 'nowrap',
      fontSize: total ? 12.5 : 12, fontWeight: strong ? 700 : 500,
      color: v === 0 ? 'var(--ink-4)' : (contra && v < 0 ? 'var(--red)' : (strong ? 'var(--navy)' : 'var(--ink)')),
    }}>{v === 0 ? '—' : sc(v)}</td>
  );
  return (
    <tr style={{
      borderTop: total ? '1.5px solid var(--navy)' : (sub ? '1px solid var(--line)' : '1px solid var(--line-soft)'),
      background: total ? 'var(--blue-050)' : 'transparent',
    }}>
      <td style={{ padding: total ? '9px 8px' : '6px 8px', fontSize: total ? 12.5 : 12, fontWeight: strong ? 700 : 400, color: strong ? 'var(--ink)' : 'var(--ink-2)', lineHeight: 1.3 }}>
        {label}{memo && <span className="tiny" style={{ color: 'var(--purple)', fontWeight: 600, marginLeft: 6 }}>{memo}</span>}
      </td>
      {cell(hp)}
      {cell(ak, true)}
      {cell(net)}
    </tr>
  );
}

function PSAK19View() {
  const { fmt } = window.AMS;
  const firm = (typeof useFirm === 'function') ? useFirm() : {};
  const audit = (typeof useAudit === 'function') ? useAudit() : {};
  const nav = (typeof useNav === 'function') ? useNav() : (() => {});
  const loader = window.loadLS || ((k, d) => d);

  /* ——— SUMBER KEBENARAN ——— */
  const wtb = (audit && audit.wtb && audit.wtb.length) ? audit.wtb : ((window.AMS && window.AMS.WTB) || []);
  const model = useMemoP19(() => (window.FSGEN ? window.FSGEN.buildModel(wtb) : null), [wtb]);
  const it = useMemoP19(() => (window.AMS_CANON ? window.AMS_CANON.intangibles(wtb) : null), [wtb]);

  const [unit, setUnit] = useStateP19(() => loader('ams.psak19.unit', 'jutaan'));
  const [measure, setMeasure] = useStateP19(() => loader('ams.psak19.measure', 'cost'));
  const [tab, setTab] = useStateP19(() => loader('ams.psak19.tab', 'ikhtisar'));
  const [disc, setDisc] = useStateP19(() => loader('ams.psak19.disc', P19_DISCLOSURE));
  const [impair, setImpair] = useStateP19(() => loader('ams.psak19.impair', P19_IMPAIR));
  const [crit, setCrit] = useStateP19(() => loader('ams.psak19.crit', P19_DEVCRIT));
  useEffectP19(() => { try { localStorage.setItem('ams.psak19.unit', JSON.stringify(unit)); } catch (e) {} }, [unit]);
  useEffectP19(() => { try { localStorage.setItem('ams.psak19.measure', JSON.stringify(measure)); } catch (e) {} }, [measure]);
  useEffectP19(() => { try { localStorage.setItem('ams.psak19.tab', JSON.stringify(tab)); } catch (e) {} }, [tab]);
  useEffectP19(() => { try { localStorage.setItem('ams.psak19.disc', JSON.stringify(disc)); } catch (e) {} }, [disc]);
  useEffectP19(() => { try { localStorage.setItem('ams.psak19.impair', JSON.stringify(impair)); } catch (e) {} }, [impair]);
  useEffectP19(() => { try { localStorage.setItem('ams.psak19.crit', JSON.stringify(crit)); } catch (e) {} }, [crit]);
  const toggleDisc = (id) => setDisc(list => list.map(r => r.id === id ? { ...r, ok: !r.ok } : r));
  const toggleImpair = (id) => setImpair(list => list.map(r => r.id === id ? { ...r, flag: !r.flag } : r));
  const toggleCrit = (id) => setCrit(list => list.map(r => r.id === id ? { ...r, ok: !r.ok } : r));

  if (!model || !it) {
    return <><SubBar moduleId="psak19" /><div className="view-pad"><Panel title="PSAK 19"><div className="tiny muted">Mesin FS Generator / kanonik belum dimuat.</div></Panel></div></>;
  }

  const client = firm.activeClient || { name: 'PT Sentosa Makmur Tbk' };
  const eng = firm.activeEngagement || { id: 'ENG-2025-014', fy: 'FY2025' };

  /* ——— skala penyajian (kanonik dalam Rp juta) ——— */
  const UN = unit === 'penuh' ? { mult: 1e6, short: 'Rp' } : { mult: 1, short: 'Rp jt' };
  const sc = (vJuta) => fmt(Math.round(vJuta * UN.mult), 0);
  const M = (full) => full / 1e6;

  /* ——— rekonsiliasi nilai tercatat (¶118e) ——— */
  const acqAdd = it.additions - it.devAdditionsYr;
  const closeUnauditedNet = it.grossClose - it.accumClient;
  const rf = [
    { label: 'Saldo awal — 1 Jan 2025 (audited)', hp: it.grossOpen, ak: -it.accumOpen, net: it.netOpen },
    { label: 'Penambahan — perolehan terpisah & akuisisi (¶25)', hp: acqAdd, ak: 0, net: acqAdd, memo: 'WP E-INT-1' },
    { label: 'Penambahan — pengembangan dikapitalisasi (¶57)', hp: it.devAdditionsYr, ak: 0, net: it.devAdditionsYr, memo: '6 kriteria' },
    { label: 'Pelepasan / penghentian (¶112)', hp: 0, ak: 0, net: 0, memo: 'nihil tercatat' },
    { label: 'Amortisasi periode (¶97)', hp: 0, ak: -it.amortAudited, net: -it.amortAudited },
    { label: 'Rugi penurunan nilai (¶111 · lisensi tak-terbatas)', hp: 0, ak: -it.impairLoss, net: -it.impairLoss, memo: it.impairLoss ? 'PSAK 48' : 'nihil — headroom' },
    { label: 'Saldo akhir — audited (31 Des 2025)', hp: it.grossClose, ak: -it.accumAudit, net: it.netClose, total: true },
  ];

  /* ——— tie-out lintas-laporan (semua ditarik live, dalam Rp juta) ——— */
  const asetBS = model.bs.nca.find(l => l.key === 'takberwujud');
  const ppeBS = model.bs.nca.find(l => l.key === 'asettetap');
  const tieRows = [
    { id: 't1', label: 'Roll-forward menutup ke saldo neraca', std: '¶118(e)', a: it.netClose, b: M(asetBS.cy), note: 'Awal + penambahan − amortisasi − penurunan nilai = Aset takberwujud neto (WTB 1-2400 + 1-2410 adjusted).' },
    { id: 't2', label: 'Harga perolehan = WTB 1-2400', std: '¶118(c)', a: it.grossClose, b: M((wtb.find(r => r.code === '1-2400') || {}).adj || 0), note: 'Jumlah tercatat bruto menutup ke buku besar harga perolehan takberwujud.' },
    { id: 't3', label: 'Akumulasi amortisasi = WTB 1-2410', std: '¶118(c)', a: -it.accumAudit, b: M((wtb.find(r => r.code === '1-2410') || {}).adj || 0), note: 'Akumulasi amortisasi (kontra-aset) menutup ke buku besar 1-2410 adjusted.' },
    { id: 't4', label: 'Amortisasi = add-back Arus Kas (PSAK 2)', std: 'PSAK 2', a: it.amortAudited, b: M(model.meta.amortization), note: 'Beban amortisasi audited = kenaikan akumulasi amortisasi (add-back non-kas, digabung penyusutan PSAK 16).' },
    { id: 't5', label: 'Penambahan & kapitalisasi = arus kas investasi', std: 'PSAK 2', a: it.additions, b: M(-model.meta.intanAdd), note: 'Mutasi neto harga perolehan = perolehan & kapitalisasi takberwujud pada Arus Kas Investasi.' },
    { id: 't6', label: 'Saldo awal = komparatif WTB 2024', std: '¶118(c)', a: it.netOpen, b: M(((wtb.find(r => r.code === '1-2400') || {}).ly || 0) + ((wtb.find(r => r.code === '1-2410') || {}).ly || 0)), note: 'Nilai tercatat neto awal = saldo audited periode lalu (kolom komparatif WTB).' },
  ].map(r => ({ ...r, diff: r.a - r.b, ok: Math.abs(r.a - r.b) < 1.5 }));
  const tiePass = tieRows.filter(r => r.ok).length;

  /* ——— lineage: tiap angka punya satu sumber ——— */
  const lineage = [
    { k: 'Harga perolehan takberwujud', src: 'WTB · 1-2400', route: 'wtb', icon: 'ledger' },
    { k: 'Akumulasi amortisasi', src: 'WTB · 1-2410', route: 'wtb', icon: 'ledger' },
    { k: 'Reklasifikasi dari Aset Tetap', src: 'PSAK 16 · 1-2100/2110', route: 'psak16', icon: 'building' },
    { k: 'Penyajian Neraca & CALK 7b', src: 'FS Generator', route: 'fsgen', icon: 'report' },
    { k: 'Amortisasi (add-back) & kapitalisasi', src: 'PSAK 2 · Arus Kas', route: 'psak2', icon: 'water' },
    { k: 'Beda temporer → pajak tangguhan', src: 'PSAK 46', route: 'psak46', icon: 'receipt' },
    { k: 'Uji penurunan nilai tahunan', src: 'SA 540 · PSAK 48', route: 'sa540', icon: 'target' },
    { k: 'Rekonsiliasi angka lintas-modul', src: 'Alur Data', route: 'dataflow', icon: 'link2' },
  ];

  const discReq = disc.filter(d => !d.na);
  const discOk = disc.filter(d => d.ok).length;
  const impFlags = impair.filter(m => m.flag).length;
  const critOk = crit.filter(c => c.ok).length;
  const amTol = 0.10;
  const amWithin = Math.abs(it.amortVarPct) <= amTol;
  const STATEP19 = { ok: { I: 'checkCircle', c: 'var(--green)' }, warn: { I: 'alert', c: 'var(--amber)' } };

  /* ============ PANEL: callout reklasifikasi (single source) ============ */
  const reclassCallout = (
    <div className="panel" style={{ padding: '10px 12px', background: 'var(--blue-050)', borderColor: 'var(--blue-100)' }}>
      <div className="row gap8" style={{ alignItems: 'flex-start' }}>
        <span style={{ color: 'var(--blue)', marginTop: 1 }}><I.link2 size={15} /></span>
        <span style={{ fontSize: 11.5, lineHeight: 1.45 }}>
          Akun <b>1-2400 / 1-2410</b> direklasifikasi dari Aset Tetap (lisensi software, paten & hubungan pelanggan yang sebelumnya tercatat pada 1-2100/1-2110). <b>Total Aset Tidak Lancar tidak berubah</b> — hanya pengklasifikasian ulang antar-pos agar penyajian sesuai PSAK 19. Aset tetap neto kini Rp {sc(ppeBS.cy / 1e6)} {UN.short}; takberwujud neto Rp {sc(it.netClose)} {UN.short}. Klik <button onClick={() => nav('psak16', { from: 'psak19' })} style={{ border: 'none', background: 'none', color: 'var(--blue)', fontWeight: 700, cursor: 'pointer', padding: 0, font: 'inherit' }}>PSAK 16</button> untuk menelusuri.
        </span>
      </div>
    </div>
  );

  /* ============ PANEL: roll-forward (¶118e) ============ */
  const rollforwardPanel = (
    <Panel noBody>
      <div className="panel-h">
        <h3>Rekonsiliasi Nilai Tercatat (Roll-forward)</h3>
        <span className="sub mono">¶118(e)</span>
        <div style={{ flex: 1 }} />
        <span className="tiny muted">{UN.short} · ditarik dari WTB</span>
      </div>
      <div style={{ padding: '4px 14px 12px', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ color: 'var(--ink-4)' }}>
              <th style={{ textAlign: 'left', fontWeight: 600, padding: '4px 8px' }}>Mutasi</th>
              <th style={{ textAlign: 'right', fontWeight: 600, padding: '4px 8px' }}>Harga Perolehan</th>
              <th style={{ textAlign: 'right', fontWeight: 600, padding: '4px 8px' }}>Akum. Amortisasi</th>
              <th style={{ textAlign: 'right', fontWeight: 600, padding: '4px 8px' }}>Nilai Tercatat</th>
            </tr>
          </thead>
          <tbody>
            {rf.map((r, i) => <RfRowP19 key={i} {...r} sc={sc} />)}
          </tbody>
        </table>
        <div className="panel" style={{ marginTop: 12, padding: '9px 11px', background: 'var(--green-bg)', borderColor: 'transparent' }}>
          <div className="row gap8" style={{ alignItems: 'flex-start' }}>
            <span style={{ color: 'var(--green)', marginTop: 1 }}><I.checkCircle size={15} /></span>
            <span style={{ fontSize: 11.5, lineHeight: 1.45 }}>
              <b>Penambahan</b> Rp {sc(it.additions)} {UN.short} terdiri atas perolehan terpisah Rp {sc(acqAdd)} & pengembangan dikapitalisasi Rp {sc(it.devAdditionsYr)} {UN.short} (¶57). <b>Amortisasi</b> Rp {sc(it.amortAudited)} {UN.short} hanya atas aset berumur terbatas; lisensi umur tak-terbatas Rp {sc(it.indefCarry)} {UN.short} tidak diamortisasi (¶107) — saldo akhir neto menutup persis ke <b>WTB 1-2400 + 1-2410</b> (= Aset takberwujud neto pada Neraca).
            </span>
          </div>
        </div>
      </div>
    </Panel>
  );

  /* ============ PANEL: klasifikasi per kelompok (¶118) ============ */
  const klasifikasiPanel = (
    <Panel noBody>
      <div className="panel-h"><h3>Klasifikasi per Kelompok</h3><span className="sub mono">¶118 · ¶88–96</span><div style={{ flex: 1 }} /><span className="tiny muted">bruto − akum = neto</span></div>
      <div style={{ padding: '4px 14px 12px', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
          <thead>
            <tr style={{ color: 'var(--ink-4)', textAlign: 'right' }}>
              <th style={{ textAlign: 'left', fontWeight: 600, padding: '6px 4px' }}>Kelompok</th>
              <th style={{ fontWeight: 600, padding: '6px 4px' }}>Harga perolehan</th>
              <th style={{ fontWeight: 600, padding: '6px 4px' }}>Akum. amort.</th>
              <th style={{ fontWeight: 600, padding: '6px 4px' }}>Nilai tercatat</th>
              <th style={{ fontWeight: 600, padding: '6px 4px' }}>Umur</th>
              <th style={{ fontWeight: 600, padding: '6px 4px' }}>Sisa</th>
            </tr>
          </thead>
          <tbody>
            {it.classes.map((c, i) => (
              <tr key={i} style={{ borderTop: '1px solid var(--line-soft)' }}>
                <td style={{ padding: '7px 4px', fontWeight: 600 }}>{c.label}{c.note && <span className="tiny" style={{ color: 'var(--ink-4)', fontWeight: 400, marginLeft: 5 }}>{c.note}</span>}</td>
                <td className="mono" style={{ textAlign: 'right', padding: '7px 4px' }}>{sc(c.gross)}</td>
                <td className="mono" style={{ textAlign: 'right', padding: '7px 4px', color: c.accum ? 'var(--red)' : 'var(--ink-4)' }}>{c.accum ? sc(-c.accum) : '—'}</td>
                <td className="mono" style={{ textAlign: 'right', padding: '7px 4px', fontWeight: 600 }}>{sc(c.carry)}</td>
                <td className="mono" style={{ textAlign: 'right', padding: '7px 4px', color: c.indefinite ? 'var(--purple)' : 'var(--ink-4)', fontWeight: c.indefinite ? 700 : 400 }}>{c.indefinite ? '∞' : c.life + ' th'}</td>
                <td className="mono" style={{ textAlign: 'right', padding: '7px 4px', color: 'var(--ink-4)' }}>{c.remLife != null ? fmt(c.remLife, 1) + ' th' : 'uji'}</td>
              </tr>
            ))}
            <tr style={{ borderTop: '1.5px solid var(--navy)', fontWeight: 700 }}>
              <td style={{ padding: '8px 4px' }}>Total aset takberwujud</td>
              <td className="mono" style={{ textAlign: 'right', padding: '8px 4px' }}>{sc(it.grossTot)}</td>
              <td className="mono" style={{ textAlign: 'right', padding: '8px 4px', color: 'var(--red)' }}>{sc(-it.accumTot)}</td>
              <td className="mono" style={{ textAlign: 'right', padding: '8px 4px', color: 'var(--navy)' }}>{sc(it.carryTot)}</td>
              <td className="mono" style={{ textAlign: 'right', padding: '8px 4px', color: 'var(--ink-4)' }}>—</td>
              <td className="mono" style={{ textAlign: 'right', padding: '8px 4px', color: 'var(--ink-4)' }}>—</td>
            </tr>
          </tbody>
        </table>
        <div className="tiny muted" style={{ marginTop: 8, lineHeight: 1.5 }}>
          Lisensi operasi berumur <b style={{ color: 'var(--purple)' }}>tak-terbatas</b> (∞) Rp {sc(it.indefCarry)} {UN.short} tidak diamortisasi (¶107) — wajib diuji penurunan nilai tahunan (¶108). Sisa kelompok berumur terbatas Rp {sc(it.finiteCarry)} {UN.short} diamortisasi garis lurus.
        </div>
      </div>
    </Panel>
  );

  /* ============ PANEL: uji kewajaran amortisasi (SA 520 / ¶97-106) ============ */
  const ujiPanel = (
    <Panel noBody>
      <div className="panel-h"><h3>Uji Kewajaran Amortisasi</h3><span className="sub mono">SA 520 · ¶97–106</span><div style={{ flex: 1 }} /><Badge kind={amWithin ? 'green' : 'amber'}>WP E-INT-4</Badge></div>
      <div style={{ padding: '4px 14px 12px', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
          <thead>
            <tr style={{ color: 'var(--ink-4)', textAlign: 'right' }}>
              <th style={{ textAlign: 'left', fontWeight: 600, padding: '6px 4px' }}>Kelompok</th>
              <th style={{ fontWeight: 600, padding: '6px 4px' }}>Dasar (bruto)</th>
              <th style={{ fontWeight: 600, padding: '6px 4px' }}>Umur</th>
              <th style={{ fontWeight: 600, padding: '6px 4px' }}>Amort. harapan</th>
              <th style={{ fontWeight: 600, padding: '6px 4px' }}>Tarif</th>
            </tr>
          </thead>
          <tbody>
            {it.classes.map((c, i) => (
              <tr key={i} style={{ borderTop: '1px solid var(--line-soft)' }}>
                <td style={{ padding: '7px 4px', fontWeight: 600 }}>{c.label}</td>
                <td className="mono" style={{ textAlign: 'right', padding: '7px 4px' }}>{c.life ? sc(c.gross) : '—'}</td>
                <td className="mono" style={{ textAlign: 'right', padding: '7px 4px', color: c.indefinite ? 'var(--purple)' : 'var(--ink-4)' }}>{c.indefinite ? '∞' : c.life + ' th'}</td>
                <td className="mono" style={{ textAlign: 'right', padding: '7px 4px', color: 'var(--blue)', fontWeight: 600 }}>{c.life ? sc(c.annualAmort) : 'tidak'}</td>
                <td className="mono" style={{ textAlign: 'right', padding: '7px 4px', color: 'var(--ink-4)' }}>{c.life ? fmt(c.rate * 100, 1) + '%' : '—'}</td>
              </tr>
            ))}
            <tr style={{ borderTop: '1.5px solid var(--navy)', fontWeight: 700 }}>
              <td style={{ padding: '8px 4px' }}>Amortisasi harapan (ekspektasi independen)</td>
              <td className="mono" style={{ textAlign: 'right', padding: '8px 4px' }}>{sc(it.classes.filter(c => c.life).reduce((a, c) => a + c.gross, 0))}</td>
              <td style={{ padding: '8px 4px' }}></td>
              <td className="mono" style={{ textAlign: 'right', padding: '8px 4px', color: 'var(--blue)' }}>{sc(it.expectedAmort)}</td>
              <td style={{ padding: '8px 4px' }}></td>
            </tr>
          </tbody>
        </table>
        <div className="row" style={{ marginTop: 10, gap: 8 }}>
          <div className="panel" style={{ flex: 1, padding: '8px 10px', display: 'grid', gap: 1 }}>
            <div className="tiny muted">Dibukukan (audited)</div>
            <div className="mono" style={{ fontWeight: 700, fontSize: 13 }}>{sc(it.amortAudited)}</div>
          </div>
          <div className="panel" style={{ flex: 1, padding: '8px 10px', display: 'grid', gap: 1 }}>
            <div className="tiny muted">Ekspektasi (SA 520)</div>
            <div className="mono" style={{ fontWeight: 700, fontSize: 13, color: 'var(--blue)' }}>{sc(it.expectedAmort)}</div>
          </div>
          <div className="panel" style={{ flex: 1, padding: '8px 10px', display: 'grid', gap: 1, background: amWithin ? 'var(--green-bg)' : 'var(--amber-bg)', borderColor: 'transparent' }}>
            <div className="tiny muted">Selisih ({fmt(it.amortVarPct * 100, 1)}%)</div>
            <div className="mono" style={{ fontWeight: 700, fontSize: 13, color: amWithin ? 'var(--green)' : 'var(--amber)' }}>{(it.amortVariance >= 0 ? '+' : '−')}{sc(Math.abs(it.amortVariance))}</div>
          </div>
        </div>
        <div className="tiny muted" style={{ marginTop: 8, lineHeight: 1.5 }}>
          Ekspektasi garis lurus atas harga perolehan bruto kelompok berumur terbatas {amWithin ? <><b style={{ color: 'var(--green)' }}>mengkorroborasi</b> beban dibukukan dalam toleransi {fmt(amTol * 100, 0)}%</> : <><b style={{ color: 'var(--amber)' }}>menyimpang</b> di atas toleransi</>}. Umur manfaat & metode ditelaah tiap akhir tahun (¶104) — diperlakukan prospektif jika berubah.
        </div>
      </div>
    </Panel>
  );

  /* ============ PANEL: pengukuran setelah pengakuan (¶72-87) ============ */
  const pengukuranPanel = (
    <Panel noBody>
      <div className="panel-h"><h3>Pengukuran Setelah Pengakuan</h3><span className="sub mono">¶72–87</span></div>
      <div style={{ padding: '10px 13px', display: 'grid', gap: 9 }}>
        <div className="seg" style={{ width: '100%' }}>
          <button className={measure === 'cost' ? 'on' : ''} onClick={() => setMeasure('cost')} style={{ flex: 1 }}>Model biaya</button>
          <button className={measure === 'reval' ? 'on' : ''} onClick={() => setMeasure('reval')} style={{ flex: 1 }}>Model revaluasi</button>
        </div>
        {measure === 'cost' ? (
          <div style={{ fontSize: 11.5, lineHeight: 1.5 }}>Entitas menerapkan <b>model biaya</b> (¶74): aset disajikan pada biaya perolehan dikurangi akumulasi amortisasi & rugi penurunan nilai. Diterapkan konsisten untuk seluruh kelompok.</div>
        ) : (
          <div className="panel" style={{ padding: '8px 10px', background: 'var(--amber-bg)', borderColor: 'transparent' }}>
            <div className="row gap6" style={{ alignItems: 'flex-start' }}>
              <span style={{ color: 'var(--amber)', marginTop: 1 }}><I.alert size={14} /></span>
              <span className="tiny" style={{ lineHeight: 1.45 }}>Model revaluasi (¶75) hanya boleh bila terdapat <b>pasar aktif</b> (¶78) — jarang ada untuk paten/merek/software unik. <b>Tidak diterapkan</b> entitas — pengungkapan ¶124 N/A.</span>
            </div>
          </div>
        )}
        <div style={{ fontSize: 11, lineHeight: 1.5, color: 'var(--ink-3)', borderTop: '1px solid var(--line-soft)', paddingTop: 8 }}>
          <b>Umur manfaat (¶88):</b> dinilai terbatas atau tak-terbatas. Lisensi operasi dinilai <b>tak-terbatas</b> (¶90) karena dapat diperbarui tanpa biaya signifikan → tidak diamortisasi (¶107). <b>Telaah (¶109):</b> penilaian umur tak-terbatas ditinjau tiap periode; perubahan ke terbatas → indikasi penurunan nilai.
        </div>
      </div>
    </Panel>
  );

  /* ============ PANEL: riset vs pengembangan & enam kriteria (¶54-67) ============ */
  const devPanel = (
    <Panel noBody>
      <div className="panel-h"><h3>Aset Takberwujud Internal</h3><span className="sub mono">¶51–67</span><div style={{ flex: 1 }} /><span className="tiny muted">{critOk}/{crit.length} kriteria</span></div>
      <div style={{ padding: '10px 13px', display: 'grid', gap: 9 }}>
        <div className="row" style={{ gap: 8 }}>
          <div className="panel" style={{ flex: 1, padding: '8px 10px', display: 'grid', gap: 1, background: 'var(--amber-bg)', borderColor: 'transparent' }}>
            <div className="tiny muted">Fase riset — DIBEBANKAN (¶54)</div>
            <div className="mono" style={{ fontWeight: 700, fontSize: 13, color: 'var(--amber)' }}>{sc(it.researchExpensed)}</div>
            <div className="tiny" style={{ color: 'var(--ink-4)' }}>{UN.short} · ke Laba Rugi</div>
          </div>
          <div className="panel" style={{ flex: 1, padding: '8px 10px', display: 'grid', gap: 1, background: 'var(--green-bg)', borderColor: 'transparent' }}>
            <div className="tiny muted">Fase pengembangan — KAPITALISASI (¶57)</div>
            <div className="mono" style={{ fontWeight: 700, fontSize: 13, color: 'var(--green)' }}>{sc(it.devCapitalized)}</div>
            <div className="tiny" style={{ color: 'var(--ink-4)' }}>{UN.short} · nilai tercatat</div>
          </div>
        </div>
        <div className="tiny muted" style={{ lineHeight: 1.5 }}>Kapitalisasi hanya bila <b>seluruh enam kriteria ¶57</b> terpenuhi sejak tanggal pemenuhan. Pengeluaran riset & pengeluaran sebelum kriteria terpenuhi <b>tidak dapat</b> dikapitalisasi balik (¶71).</div>
        <div style={{ display: 'grid', gap: 0, borderTop: '1px solid var(--line-soft)', marginTop: 2 }}>
          {crit.map((c, i) => (
            <label key={c.id} className="row gap9" style={{ padding: '7px 0', cursor: 'pointer', alignItems: 'flex-start', borderBottom: i < crit.length - 1 ? '1px solid var(--line-soft)' : 0 }} onClick={() => toggleCrit(c.id)}>
              <span style={{ flex: '0 0 16px', width: 16, height: 16, borderRadius: 4, marginTop: 1, border: '1.5px solid ' + (c.ok ? 'var(--green)' : 'var(--amber)'), background: c.ok ? 'var(--green)' : '#fff', display: 'grid', placeItems: 'center' }}>{c.ok ? <I.check size={11} style={{ color: '#fff' }} /> : <span className="mono" style={{ fontSize: 9, color: 'var(--amber)', fontWeight: 700 }}>{i + 1}</span>}</span>
              <span style={{ fontSize: 11.5, lineHeight: 1.35, color: c.ok ? 'var(--ink-2)' : 'var(--ink)', fontWeight: c.ok ? 400 : 600 }}>{c.t}</span>
            </label>
          ))}
        </div>
        <div className="tiny" style={{ padding: '8px 9px', borderRadius: 7, background: critOk === crit.length ? 'var(--green-bg)' : 'var(--amber-bg)', lineHeight: 1.45 }}>
          {critOk === crit.length
            ? <>Seluruh enam kriteria terpenuhi — kapitalisasi pengembangan <b>didukung</b>. Dokumentasi pemenuhan kriteria diuji (WP E-INT-2).</>
            : <>Kriteria <b>belum lengkap</b> ({critOk}/{crit.length}) — keandalan pengukuran biaya pengembangan perlu bukti tambahan. Bila tak terpenuhi, pengeluaran <b>dibebankan</b> (potensi salah saji kapitalisasi → SAD).</>}
        </div>
      </div>
    </Panel>
  );

  /* ============ PANEL: penurunan nilai (¶108 → PSAK 48) ============ */
  const impairPanel = (
    <Panel noBody>
      <div className="panel-h"><h3>Penurunan Nilai</h3><span className="sub mono">¶108→PSAK 48</span><div style={{ flex: 1 }} /><span className="tiny muted">{impFlags} indikasi</span></div>
      <div className="panel" style={{ margin: '10px 13px 4px', padding: '9px 11px', background: 'var(--blue-050)', borderColor: 'var(--blue-100)' }}>
        <div className="row jb ac" style={{ marginBottom: 4 }}>
          <span className="tiny" style={{ fontWeight: 700, color: 'var(--navy)' }}>Lisensi umur tak-terbatas — uji WAJIB tahunan</span>
          <Badge kind={it.impairLoss ? 'red' : 'green'}>{it.impairLoss ? 'turun nilai' : 'tidak turun'}</Badge>
        </div>
        <div className="row" style={{ gap: 0, fontFamily: 'var(--mono)', fontSize: 11 }}>
          <div style={{ flex: 1 }}><div className="tiny" style={{ color: 'var(--ink-4)' }}>Nilai tercatat</div><div style={{ fontWeight: 700 }}>{sc(it.indefCarry)}</div></div>
          <div style={{ flex: 1 }}><div className="tiny" style={{ color: 'var(--ink-4)' }}>Jumlah terpulihkan</div><div style={{ fontWeight: 700, color: 'var(--blue)' }}>{sc(it.recoverable)}</div></div>
          <div style={{ flex: 1 }}><div className="tiny" style={{ color: 'var(--ink-4)' }}>Headroom</div><div style={{ fontWeight: 700, color: 'var(--green)' }}>+{sc(it.recoverable - it.indefCarry)}</div></div>
        </div>
      </div>
      <div>
        {impair.map((m, i) => (
          <label key={m.id} className="row gap9" style={{ padding: '7px 13px', cursor: m.src === 'wajib' ? 'default' : 'pointer', alignItems: 'flex-start', borderBottom: i < impair.length - 1 ? '1px solid var(--line-soft)' : 0, opacity: m.src === 'wajib' ? 0.95 : 1 }} onClick={() => m.src !== 'wajib' && toggleImpair(m.id)}>
            <span style={{ flex: '0 0 16px', width: 16, height: 16, borderRadius: 4, marginTop: 1, border: '1.5px solid ' + (m.flag ? (m.src === 'wajib' ? 'var(--purple)' : 'var(--amber)') : 'var(--line)'), background: m.flag ? (m.src === 'wajib' ? 'var(--purple)' : 'var(--amber)') : '#fff', display: 'grid', placeItems: 'center' }}>{m.flag && <I.check size={11} style={{ color: '#fff' }} />}</span>
            <span style={{ fontSize: 11.5, lineHeight: 1.35, color: m.flag ? 'var(--ink)' : 'var(--ink-2)', fontWeight: m.flag ? 600 : 400 }}>{m.t}<span className="tiny" style={{ color: 'var(--ink-4)', fontWeight: 400, marginLeft: 5 }}>· {m.src}</span></span>
          </label>
        ))}
      </div>
      <div className="tiny muted" style={{ padding: '8px 13px', lineHeight: 1.5, borderTop: '1px solid var(--line-soft)' }}>
        Aset umur tak-terbatas & aset belum siap digunakan diuji <b>tanpa memandang indikasi</b> (¶108). Jumlah terpulihkan {sc(it.recoverable)} {UN.short} {it.impairLoss ? 'di bawah' : 'melampaui'} nilai tercatat → {it.impairLoss ? <b style={{ color: 'var(--red)' }}>rugi penurunan nilai Rp {sc(it.impairLoss)} {UN.short}</b> : 'tidak ada rugi penurunan nilai ' + eng.fy}.
      </div>
    </Panel>
  );

  /* ============ PANEL: asersi & prosedur ============ */
  const asersiPanel = (
    <Panel noBody>
      <div className="panel-h"><h3>Asersi & Prosedur Audit</h3><div style={{ flex: 1 }} /><span className="tiny muted">SA 500 · SA 540</span></div>
      <div>
        {P19_ASSERT.map((r, i) => {
          const st = STATEP19[r.state];
          return (
            <div key={i} className="row ac gap10" style={{ padding: '9px 14px', borderBottom: i < P19_ASSERT.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
              <span style={{ color: st.c, display: 'grid', placeItems: 'center', flex: '0 0 auto' }}>{r.state === 'ok' ? <I.checkCircle size={15} /> : <I.alert size={15} />}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.3 }}>{r.asr}</div>
                <div className="tiny muted">{r.proc}</div>
              </div>
              <Badge kind="gray">{r.sa}</Badge>
              <span className="mono tiny" style={{ color: 'var(--ink-4)', width: 56, textAlign: 'right' }}>{r.wp}</span>
            </div>
          );
        })}
      </div>
      <div className="tiny muted" style={{ padding: '9px 14px', lineHeight: 1.5, borderTop: '1px solid var(--line-soft)' }}>
        <b>Goodwill internal & merek yang dihasilkan internal TIDAK diakui</b> (¶48, ¶63) — diuji bahwa tidak ada kapitalisasi atas pos tersebut. Umur manfaat & uji penurunan nilai merupakan estimasi akuntansi signifikan → diuji per <b>SA 540</b>.
      </div>
    </Panel>
  );

  /* ============ PANEL: tie-out ============ */
  const tieoutPanel = (
    <Panel noBody>
      <div className="row ac jb" style={{ padding: '11px 13px', borderBottom: '1px solid var(--line)' }}>
        <div><div style={{ fontWeight: 700, fontSize: 13, color: 'var(--navy)' }}>Validasi & Tie-out</div><div className="tiny muted">Satu sumber kebenaran (WTB → FSGEN)</div></div>
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
            <button key={i} onClick={() => nav(r.route, { from: 'psak19' })} className="row ac gap9" style={{ width: '100%', textAlign: 'left', padding: '8px 9px', borderRadius: 7, border: '1px solid transparent', background: 'none', cursor: 'pointer' }}
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
        Tidak ada angka di-input ulang: harga perolehan & akumulasi amortisasi ditarik dari WTB yang sama dipakai FS Generator, Arus Kas, & tab Rekonsiliasi Angka. Perubahan AJE mengalir serempak.
      </div>
    </Panel>
  );

  /* ============ PANEL: checklist pengungkapan ============ */
  const disclosurePanel = (
    <Panel noBody>
      <div className="panel-h"><h3>Pengungkapan PSAK 19</h3><span className="sub mono">¶118–128</span><div style={{ flex: 1 }} /><span className="tiny muted">{discOk}/{disc.length}</span></div>
      <div>
        {disc.map((d, i) => (
          <label key={d.id} className="row gap9" style={{ padding: '8px 13px', cursor: d.na ? 'default' : 'pointer', alignItems: 'flex-start', borderBottom: i < disc.length - 1 ? '1px solid var(--line-soft)' : 0, opacity: d.na ? 0.6 : 1 }} onClick={() => !d.na && toggleDisc(d.id)}>
            <span style={{ flex: '0 0 16px', width: 16, height: 16, borderRadius: 4, marginTop: 1, border: '1.5px solid ' + (d.na ? 'var(--line)' : (d.ok ? 'var(--green)' : 'var(--amber)')), background: d.ok && !d.na ? 'var(--green)' : '#fff', display: 'grid', placeItems: 'center' }}>{d.ok && !d.na && <I.check size={11} style={{ color: '#fff' }} />}{d.na && <span className="mono" style={{ fontSize: 8, color: 'var(--ink-4)' }}>N/A</span>}</span>
            <span className="mono tiny" style={{ fontWeight: 700, color: 'var(--navy)', width: 58, flex: '0 0 58px', marginTop: 1 }}>{d.ref}</span>
            <span style={{ fontSize: 11.5, lineHeight: 1.4, color: d.ok ? 'var(--ink-2)' : 'var(--ink)', fontWeight: d.ok ? 400 : 600 }}>{d.t}</span>
          </label>
        ))}
      </div>
    </Panel>
  );

  /* ============ TABS ============ */
  const TABS = [
    { id: 'ikhtisar',     label: 'Ikhtisar & Roll-forward', icon: 'table',  badge: tiePass + '/' + tieRows.length, bad: tiePass !== tieRows.length },
    { id: 'amortisasi',   label: 'Amortisasi & Pengukuran', icon: 'scale',  badge: fmt(it.amortVarPct * 100, 1) + '%', bad: !amWithin },
    { id: 'pengembangan', label: 'Pengembangan & Penurunan Nilai', icon: 'sparkle', badge: critOk + '/' + crit.length, bad: critOk < crit.length },
    { id: 'pengungkapan', label: 'Pengungkapan & Sumber',   icon: 'doc',    badge: discOk + '/' + disc.length, bad: discOk < discReq.length },
  ];

  return (
    <>
      <SubBar moduleId="psak19" right={
        <div className="row gap8 ac">
          <Badge kind="green">PSAK 19 · IAS 38</Badge>
          <div className="seg" style={{ width: 'fit-content' }}>
            <button className={unit === 'jutaan' ? 'on' : ''} onClick={() => setUnit('jutaan')}>Jutaan</button>
            <button className={unit === 'penuh' ? 'on' : ''} onClick={() => setUnit('penuh')}>Penuh</button>
          </div>
          <Btn sm onClick={() => nav('psak16', { from: 'psak19' })}><I.building size={13} /> PSAK 16</Btn>
          <Btn sm onClick={() => nav('sa540', { from: 'psak19' })}><I.target size={13} /> SA 540 · Estimasi</Btn>
          <Btn sm onClick={() => nav('fsgen', { from: 'psak19' })}><I.report size={13} /> FS Generator</Btn>
          <Btn sm onClick={() => nav('wtb', { from: 'psak19' })}><I.ledger size={13} /> Buku Besar</Btn>
          <Btn sm><I.download size={13} /> Kertas Kerja E-INT</Btn>
        </div>
      } />
      <div className="view-scroll">
        <div className="view-pad" style={{ display: 'grid', gap: 12 }}>

          {/* summary */}
          <div className="grid" style={{ gridTemplateColumns: 'repeat(5,1fr)', gap: 10 }}>
            <ItCard value={fmt(it.netClose / 1e3, 2)} unit="M" label="Aset takberwujud — neto audited" sub="31 Des 2025 · WTB 1-2400/2410" accent="var(--navy)" />
            <ItCard value={fmt(it.amortAudited / 1e3, 2)} unit="M" label="Beban amortisasi" sub="¶97 · add-back Arus Kas" accent="var(--blue)" />
            <ItCard value={fmt(it.additions / 1e3, 2)} unit="M" label="Penambahan & kapitalisasi" sub="¶25 · ¶57 · arus kas investasi" accent="var(--purple)" />
            <ItCard value={fmt(it.indefCarry / 1e3, 2)} unit="M" label="Lisensi umur tak-terbatas" sub={it.impairLoss ? 'turun nilai → ¶111' : 'uji tahunan · tidak turun (¶108)'} accent={it.impairLoss ? 'var(--red)' : 'var(--green)'} />
            <ItCard value={tiePass + '/' + tieRows.length} label="Tie-out lintas-laporan" sub={tiePass === tieRows.length ? 'seluruh rekonsiliasi menutup' : 'perlu ditelusuri'} accent={tiePass === tieRows.length ? 'var(--green)' : 'var(--amber)'} />
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
              <div className="grid" style={{ gap: 12 }}>{reclassCallout}{rollforwardPanel}{klasifikasiPanel}</div>
              {tieoutPanel}
            </div>
          )}

          {/* ============ TAB: AMORTISASI ============ */}
          {tab === 'amortisasi' && (
            <div className="grid" style={{ gridTemplateColumns: '1fr 336px', gap: 12, alignItems: 'start' }}>
              {ujiPanel}
              {pengukuranPanel}
            </div>
          )}

          {/* ============ TAB: PENGEMBANGAN & PENURUNAN NILAI ============ */}
          {tab === 'pengembangan' && (
            <div className="grid" style={{ gap: 12 }}>
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }}>{devPanel}{impairPanel}</div>
              {asersiPanel}
            </div>
          )}

          {/* ============ TAB: PENGUNGKAPAN & SUMBER ============ */}
          {tab === 'pengungkapan' && (
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }}>{disclosurePanel}{lineagePanel}</div>
          )}

          <div className="tiny muted" style={{ padding: '0 2px 4px', lineHeight: 1.5 }}>
            Kertas kerja aset takberwujud <b>{client.name}</b> ({eng.id} · {eng.fy}) disusun sesuai PSAK 19 dan ditarik penuh dari Working Trial Balance (1-2400 & 1-2410) melalui mesin kanonik yang sama dipakai FS Generator (CALK 7b), Arus Kas (add-back amortisasi), & tab Rekonsiliasi Angka. Pos direklasifikasi dari Aset Tetap (PSAK 16) — total aset tidak lancar tidak berubah. Status & pilihan tersimpan otomatis untuk jejak audit.
          </div>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { PSAK19View });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { PSAK19View };
