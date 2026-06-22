/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { AMS_CANON } from './canon';
import { FSGEN } from './fsgen_model';
import { useAudit, useFirm, useNav } from './contexts';
import { I } from './icons';
import { SubBar } from './shell';
import { Badge, Btn, Panel } from './ui';
import { AssetRegisterTable, ImportMappingPanel, SubLedgerRecon } from './view_psak16_register';
import { amsExportXlsx } from './export_xlsx.js';

/* ============================================================
   Asseris — PSAK 16 · Aset Tetap (Property, Plant & Equipment)
   Kertas kerja penyusunan & audit Aset Tetap yang DITARIK PENUH dari
   satu sumber kebenaran:
     · Working Trial Balance (useAudit().wtb) — akun 1-2100 (Harga
       Perolehan) & 1-2110 (Akumulasi Penyusutan)
     · AMS_CANON.fixedAssets(wtb) — mesin derivasi aset tetap yang sama
       dipakai tab Rekonsiliasi Angka & dirujuk PSAK 46 / PSAK 2
     · FSGEN.buildModel(wtb) — penyajian Neraca (Aset tetap — neto) &
       add-back penyusutan pada Arus Kas
   Tidak ada angka di-hardcode. Satu perubahan AJE (mis. AJE-05 koreksi
   penyusutan) mengalir serempak ke roll-forward, FS Generator, PSAK 46,
   Arus Kas, & Rekonsiliasi.

   Cakupan: pengakuan & komponen biaya perolehan (¶15–22), pengukuran
   setelah pengakuan — model biaya vs revaluasi (¶29–31), penyusutan
   garis lurus, komponensasi & telaah umur/nilai residu (¶43–62), uji
   kewajaran penyusutan (SA 520), indikasi penurunan nilai (¶63 → PSAK 48),
   penghentian pengakuan & laba/rugi pelepasan (¶67–72), rekonsiliasi
   nilai tercatat (¶73e) yang menutup ke WTB, tie-out lintas-laporan,
   lineage sumber data, & checklist pengungkapan (¶73–79).
   ============================================================ */
const { useState: useStateP16, useMemo: useMemoP16, useEffect: useEffectP16 } = React;

/* peta asersi → prosedur audit aset tetap (rujuk WP E & SA terkait) */
const P16_ASSERT = [
  { asr: 'Keberadaan', proc: 'Inspeksi fisik aset tetap & vouching penambahan ke dokumen otorisasi capex', sa: 'SA 501', wp: 'E-1', state: 'ok' },
  { asr: 'Kelengkapan', proc: 'Telaah perbaikan & pemeliharaan untuk capex yang seharusnya dikapitalisasi', sa: 'SA 500', wp: 'E-2', state: 'ok' },
  { asr: 'Hak & Kewajiban', proc: 'Periksa bukti kepemilikan (sertifikat HGB, BPKB) & aset yang dijaminkan', sa: 'SA 500', wp: 'E-3', state: 'ok' },
  { asr: 'Penilaian — Penyusutan', proc: 'Re-perform penyusutan & uji kewajaran umur manfaat/nilai residu', sa: 'SA 540', wp: 'E-4', state: 'warn' },
  { asr: 'Keberadaan — Pelepasan', proc: 'Telusuri pelepasan/penghapusan; pastikan aset dilepas dihapusbukukan', sa: 'SA 501', wp: 'E-5', state: 'warn' },
  { asr: 'Penyajian', proc: 'Klasifikasi per kelompok (¶73) & kelengkapan pengungkapan', sa: 'SA 700', wp: 'E-6', state: 'ok' },
];

/* indikasi penurunan nilai (¶63 → PSAK 48 ¶12) */
const P16_IMPAIR = [
  { id: 'm01', t: 'Penurunan signifikan nilai pasar aset', src: 'eksternal', flag: false },
  { id: 'm02', t: 'Perubahan teknologi/pasar yang merugikan', src: 'eksternal', flag: false },
  { id: 'm03', t: 'Kenaikan suku bunga memengaruhi nilai pakai', src: 'eksternal', flag: true },
  { id: 'm04', t: 'Bukti keusangan/kerusakan fisik aset', src: 'internal', flag: true },
  { id: 'm05', t: 'Aset menganggur / rencana penghentian operasi', src: 'internal', flag: false },
  { id: 'm06', t: 'Kinerja ekonomi aset lebih buruk dari ekspektasi', src: 'internal', flag: false },
];

/* checklist pengungkapan PSAK 16 (default) */
const P16_DISCLOSURE = [
  { id: 'q73a', ref: '¶73(a)', t: 'Dasar pengukuran jumlah tercatat bruto (model biaya)', ok: true },
  { id: 'q73b', ref: '¶73(b)', t: 'Metode penyusutan yang digunakan (garis lurus)', ok: true },
  { id: 'q73c', ref: '¶73(c)', t: 'Umur manfaat atau tarif penyusutan per kelompok', ok: true },
  { id: 'q73d', ref: '¶73(d)', t: 'Jumlah tercatat bruto & akumulasi penyusutan, awal & akhir periode', ok: true },
  { id: 'q73e', ref: '¶73(e)', t: 'Rekonsiliasi jumlah tercatat: penambahan, pelepasan, penyusutan', ok: true },
  { id: 'q74a', ref: '¶74(a)', t: 'Aset tetap yang dijaminkan atas liabilitas', ok: false },
  { id: 'q74c', ref: '¶74(c)', t: 'Komitmen kontraktual untuk perolehan aset tetap', ok: false },
  { id: 'q51',  ref: '¶51',    t: 'Telaah nilai residu & umur manfaat dilakukan setiap akhir tahun', ok: true },
  { id: 'q77',  ref: '¶77',    t: 'Pengungkapan revaluasi (jika model revaluasi diterapkan)', ok: true, na: true },
];

function FaCard({ value, unit, label, sub, accent }: any) {
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

/* baris matriks roll-forward (¶73e): Harga Perolehan | Akum. Penyusutan | Neto */
function RfMatrixRow({ label, hp, ak, net, sc, sub, total, memo }: any) {
  const strong = sub || total;
  const cell = (v: any, contra?: any) => (
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

function PSAK16View() {
  const { fmt, rp } = AMS;
  const firm = useFirm();
  const audit = useAudit();
  const nav = useNav();
  const loader = window.loadLS || ((k, d) => d);

  /* ——— SUMBER KEBENARAN ——— */
  const wtb = (audit && audit.wtb && audit.wtb.length) ? audit.wtb : ((AMS && AMS.WTB) || []);
  const model = useMemoP16(() => (FSGEN ? FSGEN.buildModel(wtb) : null), [wtb]);
  const fa = useMemoP16(() => (AMS_CANON ? AMS_CANON.fixedAssets(wtb) : null), [wtb]);
  const reg = useMemoP16(() => (AMS_CANON ? AMS_CANON.assetRegister(wtb) : null), [wtb]);

  const [unit, setUnit] = useStateP16(() => loader('ams.psak16.unit', 'jutaan'));
  const [measure, setMeasure] = useStateP16(() => loader('ams.psak16.measure', 'cost'));
  const [regTab, setRegTab] = useStateP16(() => loader('ams.psak16.regtab', 'register'));
  const [tab, setTab] = useStateP16(() => loader('ams.psak16.tab', 'ikhtisar'));
  const [disc, setDisc] = useStateP16(() => loader('ams.psak16.disc', P16_DISCLOSURE));
  const [impair, setImpair] = useStateP16(() => loader('ams.psak16.impair', P16_IMPAIR));
  const [exporting, setExporting] = useStateP16(false);
  useEffectP16(() => { try { localStorage.setItem('ams.psak16.unit', JSON.stringify(unit)); } catch (e) {} }, [unit]);
  useEffectP16(() => { try { localStorage.setItem('ams.psak16.measure', JSON.stringify(measure)); } catch (e) {} }, [measure]);
  useEffectP16(() => { try { localStorage.setItem('ams.psak16.regtab', JSON.stringify(regTab)); } catch (e) {} }, [regTab]);
  useEffectP16(() => { try { localStorage.setItem('ams.psak16.tab', JSON.stringify(tab)); } catch (e) {} }, [tab]);
  useEffectP16(() => { try { localStorage.setItem('ams.psak16.disc', JSON.stringify(disc)); } catch (e) {} }, [disc]);
  useEffectP16(() => { try { localStorage.setItem('ams.psak16.impair', JSON.stringify(impair)); } catch (e) {} }, [impair]);
  const toggleDisc = (id: any) => setDisc((list: any) => list.map((r: any) => r.id === id ? { ...r, ok: !r.ok } : r));
  const toggleImpair = (id: any) => setImpair((list: any) => list.map((r: any) => r.id === id ? { ...r, flag: !r.flag } : r));

  if (!model || !fa) {
    return <><SubBar moduleId="psak16" /><div className="view-pad"><Panel title="PSAK 16"><div className="tiny muted">Mesin FS Generator / kanonik belum dimuat.</div></Panel></div></>;
  }

  const client = firm.activeClient || { name: 'PT Sentosa Makmur Tbk' };
  const eng = firm.activeEngagement || { id: 'ENG-2025-014', fy: 'FY2025' };
  const aje05 = ((AMS && AMS.AJE) || []).find(a => a.id === 'AJE-05');
  const riskPPE = (((AMS && AMS.RISKS) || []) as any[]).find(r => r.id === 'R-04');

  // W10.5 Fase 2 — sealed XLSX "Kertas Kerja E": the PSAK 16 fixed-asset sub-ledger + the
  // sub-ledger↔GL control-total reconciliation, full-rupiah via rp() (SSOT = AMS_CANON.assetRegister).
  const onExportXlsx = async () => {
    if (exporting || !reg) return;
    setExporting(true);
    try {
      const assetRows = reg.rows.map((r: any) => [r.tag, r.name + (r.fullyDep ? ' (tersusut penuh)' : ''), r.classLabel, r.acqYear, r.life ? r.life + ' th' : '—', rp(r.cost), r.accum ? rp(-r.accum) : '—', rp(r.nbv)]);
      const reconRows = reg.recon.map((r: any) => [r.label, r.code, rp(r.sub), rp(r.gl), r.ok ? '0' : rp(r.diff), r.ok ? 'Menutup' : 'Selisih']);
      await amsExportXlsx({
        kind: 'fixed-asset-register', scope: 'engagement', scopeId: eng?.id,
        fileName: `Register Aset Tetap (KK-E) - ${client?.name || 'Klien'}.xlsx`,
        firm: 'KAP Wijaya Hartono & Rekan',
        title: `Register Aset Tetap — Kertas Kerja E (PSAK 16) — ${client?.name || ''}`,
        meta: [`${eng?.id || ''} · ${eng?.fy || 'FY2025'} · PSAK 16 / IAS 16`,
          `${reg.count} aset · rekonsiliasi sub-ledger ↔ GL: ${reg.reconciled ? 'MENUTUP' : 'SELISIH'} · saldo penuh dalam Rupiah`],
        sheets: [
          { name: 'Register Sub-ledger',
            columns: ['Tag', 'Nama Aset', 'Kelompok', 'Perolehan', 'Umur', 'Harga Perolehan', 'Akm. Penyusutan', 'Nilai Buku'],
            rows: assetRows,
            totals: ['', `TOTAL (${reg.count} aset)`, '', '', '', rp(reg.sumCost), rp(-reg.sumAccum), rp(reg.sumNbv)],
            colWidths: [12, 38, 18, 11, 9, 22, 22, 22] },
          { name: 'Rekonsiliasi GL',
            columns: ['Total Kontrol', 'Akun GL', 'Sub-ledger', 'GL (WTB)', 'Selisih', 'Status'],
            rows: reconRows, colWidths: [28, 12, 22, 22, 18, 12] },
        ],
      });
    } finally {
      setExporting(false);
    }
  };

  /* ——— skala penyajian (kanonik dalam Rp juta) ——— */
  const UN = unit === 'penuh' ? { mult: 1e6, short: 'Rp' } : { mult: 1, short: 'Rp jt' };
  const sc = (vJuta: any) => fmt(Math.round(vJuta * UN.mult), 0);

  /* ——— rekonsiliasi nilai tercatat (¶73e) ——— */
  const closeUnauditedNet = fa.grossClose - fa.accumClient;
  const rf = [
    { label: 'Saldo awal — 1 Jan 2025 (audited)', hp: fa.grossOpen, ak: -fa.accumOpen, net: fa.netOpen },
    { label: 'Penambahan (perolehan bruto)', hp: fa.additions, ak: 0, net: fa.additions, memo: 'vouching E-1' },
    { label: 'Pelepasan / penghentian (¶67)', hp: 0, ak: 0, net: 0, memo: 'nihil tercatat' },
    { label: 'Beban penyusutan — dibukukan klien', hp: 0, ak: -fa.deprClient, net: -fa.deprClient },
    { label: 'Saldo akhir — sebelum audit', hp: fa.grossClose, ak: -fa.accumClient, net: closeUnauditedNet, sub: true },
    { label: 'Koreksi audit · penyusutan (AJE-05)', hp: 0, ak: -fa.ajeDepr, net: -fa.ajeDepr, memo: aje05 ? aje05.status : 'Proposed' },
    { label: 'Saldo akhir — audited (31 Des 2025)', hp: fa.grossClose, ak: -fa.accumAudit, net: fa.netClose, total: true },
  ];

  /* ——— tie-out lintas-laporan (semua ditarik live, dalam Rp juta) ——— */
  const M = (full: any) => full / 1e6;
  const asetBS = model.bs.nca.find((l: any) => l.key === 'asettetap');
  const tieRows = [
    { id: 't1', label: 'Roll-forward menutup ke saldo neraca', std: '¶73(e)', a: fa.netClose, b: M(asetBS.cy), note: 'Awal + penambahan − pelepasan − penyusutan ± AJE = Aset tetap neto (WTB 1-2100 + 1-2110 adjusted).' },
    { id: 't2', label: 'Harga perolehan = WTB 1-2100', std: '¶73(d)', a: fa.grossClose, b: M((wtb.find((r: any) => r.code === '1-2100') || {}).adj || 0), note: 'Jumlah tercatat bruto menutup ke buku besar harga perolehan.' },
    { id: 't3', label: 'Akumulasi penyusutan = WTB 1-2110', std: '¶73(d)', a: -fa.accumAudit, b: M((wtb.find((r: any) => r.code === '1-2110') || {}).adj || 0), note: 'Akumulasi penyusutan (kontra-aset) menutup ke buku besar 1-2110 adjusted.' },
    { id: 't4', label: 'Penyusutan = add-back Arus Kas (PSAK 2)', std: 'PSAK 2', a: fa.deprAudited, b: M(model.meta.depreciation), note: 'Beban penyusutan audited = kenaikan akumulasi penyusutan (add-back non-kas).' },
    { id: 't5', label: 'Belanja modal neto = arus kas investasi', std: 'PSAK 2', a: fa.capexNet, b: M(-model.meta.capex), note: 'Mutasi neto harga perolehan = perolehan aset tetap pada Arus Kas Investasi.' },
    { id: 't6', label: 'Saldo awal = komparatif WTB 2024', std: '¶73(d)', a: fa.netOpen, b: M(((wtb.find((r: any) => r.code === '1-2100') || {}).ly || 0) + ((wtb.find((r: any) => r.code === '1-2110') || {}).ly || 0)), note: 'Nilai tercatat neto awal = saldo audited periode lalu (kolom komparatif WTB).' },
    { id: 't7', label: 'Koreksi penyusutan terposting = AJE-05', std: 'SA 450', a: fa.ajeDepr, b: -M((wtb.find((r: any) => r.code === '1-2110') || {}).aje || 0), note: 'AJE-05 (' + (aje05 ? aje05.status : '—') + ') Rp ' + fmt(Math.abs(fa.ajeDepr)) + ' jt tercermin pada saldo adjusted.' },
  ].map(r => ({ ...r, diff: r.a - r.b, ok: Math.abs(r.a - r.b) < 1.5 }));
  const tiePass = tieRows.filter(r => r.ok).length;

  /* ——— lineage: tiap angka punya satu sumber ——— */
  const lineage = [
    { k: 'Harga perolehan aset tetap', src: 'WTB · 1-2100', route: 'wtb', icon: 'ledger' },
    { k: 'Akumulasi penyusutan', src: 'WTB · 1-2110', route: 'wtb', icon: 'ledger' },
    { k: 'Penyajian Neraca & CALK 7', src: 'FS Generator', route: 'fsgen', icon: 'report' },
    { k: 'Penyusutan (add-back) & capex', src: 'PSAK 2 · Arus Kas', route: 'psak2', icon: 'water' },
    { k: 'Beda temporer → pajak tangguhan', src: 'PSAK 46', route: 'psak46', icon: 'receipt' },
    { k: 'Koreksi penyusutan (AJE-05)', src: 'Buku Besar · AJE', route: 'aje', icon: 'scale' },
    { k: 'Risiko pelepasan aset (R-04)', src: 'Penilaian Risiko', route: 'risk', icon: 'flag' },
    { k: 'Estimasi umur manfaat & residu', src: 'SA 540 · Estimasi', route: 'sa540', icon: 'target' },
    { k: 'Inspeksi fisik aset tetap', src: 'SA 501 · WP E-1', route: 'sa501', icon: 'search2' },
  ];

  const discOk = disc.filter((d: any) => d.ok).length;
  const impFlags = impair.filter((m: any) => m.flag).length;
  const depTol = 0.10;                                 // toleransi 10% atas ekspektasi penyusutan
  const depWithin = Math.abs(fa.depVarPct) <= depTol;
  const STATE = { ok: { I: 'checkCircle', c: 'var(--green)' }, warn: { I: 'alert', c: 'var(--amber)' } };

  /* ============ PANEL: roll-forward (¶73e) ============ */
  const rollforwardPanel = (
    <Panel noBody>
      <div className="panel-h">
        <h3>Rekonsiliasi Nilai Tercatat (Roll-forward)</h3>
        <span className="sub mono">¶73(e)</span>
        <div style={{ flex: 1 }} />
        <span className="tiny muted">{UN.short} · ditarik dari WTB</span>
      </div>
      <div style={{ padding: '4px 14px 12px', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ color: 'var(--ink-4)' }}>
              <th style={{ textAlign: 'left', fontWeight: 600, padding: '4px 8px' }}>Mutasi</th>
              <th style={{ textAlign: 'right', fontWeight: 600, padding: '4px 8px' }}>Harga Perolehan</th>
              <th style={{ textAlign: 'right', fontWeight: 600, padding: '4px 8px' }}>Akum. Penyusutan</th>
              <th style={{ textAlign: 'right', fontWeight: 600, padding: '4px 8px' }}>Nilai Tercatat</th>
            </tr>
          </thead>
          <tbody>
            {rf.map((r, i) => <RfMatrixRow key={i} {...r} sc={sc} />)}
          </tbody>
        </table>
        <div className="panel" style={{ marginTop: 12, padding: '9px 11px', background: 'var(--green-bg)', borderColor: 'transparent' }}>
          <div className="row gap8" style={{ alignItems: 'flex-start' }}>
            <span style={{ color: 'var(--green)', marginTop: 1 }}><I.checkCircle size={15} /></span>
            <span style={{ fontSize: 11.5, lineHeight: 1.45 }}>
              <b>Penambahan</b> Rp {sc(fa.additions)} {UN.short} = mutasi neto harga perolehan WTB (belanja modal {eng.fy}); tidak ada pelepasan dibukukan klien — keberadaan diuji terpisah (R-04). Koreksi audit <b>AJE-05</b> Rp {fmt(Math.abs(fa.ajeDepr))} jt menaikkan penyusutan — saldo akhir neto menutup persis ke <b>WTB 1-2100 + 1-2110</b> (= Aset tetap neto pada Neraca).
            </span>
          </div>
        </div>
      </div>
    </Panel>
  );

  /* ============ PANEL: klasifikasi per kelompok (¶73) ============ */
  const klasifikasiPanel = (
    <Panel noBody>
      <div className="panel-h"><h3>Klasifikasi per Kelompok Aset</h3><span className="sub mono">¶73 · ¶50–57</span><div style={{ flex: 1 }} /><span className="tiny muted">bruto − akum = neto</span></div>
      <div style={{ padding: '4px 14px 12px', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
          <thead>
            <tr style={{ color: 'var(--ink-4)', textAlign: 'right' }}>
              <th style={{ textAlign: 'left', fontWeight: 600, padding: '6px 4px' }}>Kelompok</th>
              <th style={{ fontWeight: 600, padding: '6px 4px' }}>Harga perolehan</th>
              <th style={{ fontWeight: 600, padding: '6px 4px' }}>Akum. peny.</th>
              <th style={{ fontWeight: 600, padding: '6px 4px' }}>Nilai tercatat</th>
              <th style={{ fontWeight: 600, padding: '6px 4px' }}>Umur</th>
              <th style={{ fontWeight: 600, padding: '6px 4px' }}>Tarif</th>
            </tr>
          </thead>
          <tbody>
            {fa.classes.map((c: any, i: any) => (
              <tr key={i} style={{ borderTop: '1px solid var(--line-soft)' }}>
                <td style={{ padding: '7px 4px', fontWeight: 600 }}>{c.label}{c.note && <span className="tiny" style={{ color: 'var(--ink-4)', fontWeight: 400, marginLeft: 5 }}>{c.note}</span>}</td>
                <td className="mono" style={{ textAlign: 'right', padding: '7px 4px' }}>{sc(c.gross)}</td>
                <td className="mono" style={{ textAlign: 'right', padding: '7px 4px', color: 'var(--red)' }}>{sc(-c.accum)}</td>
                <td className="mono" style={{ textAlign: 'right', padding: '7px 4px', fontWeight: 600 }}>{sc(c.carry)}</td>
                <td className="mono" style={{ textAlign: 'right', padding: '7px 4px', color: 'var(--ink-4)' }}>{c.life ? c.life + ' th' : '—'}</td>
                <td className="mono" style={{ textAlign: 'right', padding: '7px 4px', color: 'var(--ink-4)' }}>{c.life ? fmt(c.rate * 100, 1) + '%' : '—'}</td>
              </tr>
            ))}
            <tr style={{ borderTop: '1.5px solid var(--navy)', fontWeight: 700 }}>
              <td style={{ padding: '8px 4px' }}>Total aset tetap</td>
              <td className="mono" style={{ textAlign: 'right', padding: '8px 4px' }}>{sc(fa.grossTot)}</td>
              <td className="mono" style={{ textAlign: 'right', padding: '8px 4px', color: 'var(--red)' }}>{sc(-fa.accumTot)}</td>
              <td className="mono" style={{ textAlign: 'right', padding: '8px 4px', color: 'var(--navy)' }}>{sc(fa.carryTot)}</td>
              <td className="mono" style={{ textAlign: 'right', padding: '8px 4px', color: 'var(--ink-4)' }}>—</td>
              <td className="mono" style={{ textAlign: 'right', padding: '8px 4px', color: 'var(--ink-4)' }}>—</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Panel>
  );

  /* ============ PANEL: uji kewajaran penyusutan (SA 520 / ¶60-62) ============ */
  const ujiPanel = (
    <Panel noBody>
      <div className="panel-h"><h3>Uji Kewajaran Penyusutan</h3><span className="sub mono">SA 520 · ¶60–62</span><div style={{ flex: 1 }} /><Badge kind={depWithin ? 'green' : 'amber'}>WP E-4</Badge></div>
      <div style={{ padding: '4px 14px 12px', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
          <thead>
            <tr style={{ color: 'var(--ink-4)', textAlign: 'right' }}>
              <th style={{ textAlign: 'left', fontWeight: 600, padding: '6px 4px' }}>Kelompok</th>
              <th style={{ fontWeight: 600, padding: '6px 4px' }}>Dasar disusutkan</th>
              <th style={{ fontWeight: 600, padding: '6px 4px' }}>Umur</th>
              <th style={{ fontWeight: 600, padding: '6px 4px' }}>Peny. harapan</th>
              <th style={{ fontWeight: 600, padding: '6px 4px' }}>Sisa umur</th>
            </tr>
          </thead>
          <tbody>
            {fa.classes.map((c: any, i: any) => (
              <tr key={i} style={{ borderTop: '1px solid var(--line-soft)' }}>
                <td style={{ padding: '7px 4px', fontWeight: 600 }}>{c.label}</td>
                <td className="mono" style={{ textAlign: 'right', padding: '7px 4px' }}>{c.life ? sc(c.base) : '—'}</td>
                <td className="mono" style={{ textAlign: 'right', padding: '7px 4px', color: 'var(--ink-4)' }}>{c.life ? c.life + ' th' : '—'}</td>
                <td className="mono" style={{ textAlign: 'right', padding: '7px 4px', color: 'var(--blue)', fontWeight: 600 }}>{c.life ? sc(c.annualDep) : '—'}</td>
                <td className="mono" style={{ textAlign: 'right', padding: '7px 4px', color: 'var(--ink-4)' }}>{c.remLife != null ? fmt(c.remLife, 1) + ' th' : '—'}</td>
              </tr>
            ))}
            <tr style={{ borderTop: '1.5px solid var(--navy)', fontWeight: 700 }}>
              <td style={{ padding: '8px 4px' }}>Penyusutan harapan (ekspektasi independen)</td>
              <td className="mono" style={{ textAlign: 'right', padding: '8px 4px' }}>{sc(fa.classes.reduce((a: any, c: any) => a + c.base, 0))}</td>
              <td style={{ padding: '8px 4px' }}></td>
              <td className="mono" style={{ textAlign: 'right', padding: '8px 4px', color: 'var(--blue)' }}>{sc(fa.expectedDep)}</td>
              <td style={{ padding: '8px 4px' }}></td>
            </tr>
          </tbody>
        </table>
        <div className="row" style={{ marginTop: 10, gap: 8 }}>
          <div className="panel" style={{ flex: 1, padding: '8px 10px', display: 'grid', gap: 1 }}>
            <div className="tiny muted">Dibukukan (audited)</div>
            <div className="mono" style={{ fontWeight: 700, fontSize: 13 }}>{sc(fa.deprAudited)}</div>
          </div>
          <div className="panel" style={{ flex: 1, padding: '8px 10px', display: 'grid', gap: 1 }}>
            <div className="tiny muted">Ekspektasi (SA 520)</div>
            <div className="mono" style={{ fontWeight: 700, fontSize: 13, color: 'var(--blue)' }}>{sc(fa.expectedDep)}</div>
          </div>
          <div className="panel" style={{ flex: 1, padding: '8px 10px', display: 'grid', gap: 1, background: depWithin ? 'var(--green-bg)' : 'var(--amber-bg)', borderColor: 'transparent' }}>
            <div className="tiny muted">Selisih ({fmt(fa.depVarPct * 100, 1)}%)</div>
            <div className="mono" style={{ fontWeight: 700, fontSize: 13, color: depWithin ? 'var(--green)' : 'var(--amber)' }}>{(fa.depVariance >= 0 ? '+' : '−')}{sc(Math.abs(fa.depVariance))}</div>
          </div>
        </div>
        <div className="tiny muted" style={{ marginTop: 8, lineHeight: 1.5 }}>
          Ekspektasi garis lurus atas dasar yang dapat disusutkan {depWithin ? <><b style={{ color: 'var(--green)' }}>mengkorroborasi</b> beban dibukukan dalam toleransi {fmt(depTol * 100, 0)}%</> : <><b style={{ color: 'var(--amber)' }}>menyimpang</b> di atas toleransi</>}. Sisa selisih dijelaskan konvensi setengah-tahun atas penambahan {eng.fy}. Koreksi <b>AJE-05</b> mempersempit selisih.
        </div>
      </div>
    </Panel>
  );

  /* ============ PANEL: pelepasan (¶67-72) ============ */
  const pelepasanPanel = (
    <Panel title="Penghentian Pengakuan & Pelepasan" sub="¶67–72 · keberadaan (R-04)">
      <div style={{ display: 'grid', gap: 0 }}>
        {[
          { l: 'Pelepasan/penghapusan dibukukan klien', v: 0 },
          { l: 'Nilai tercatat diuji keberadaannya (E-5)', v: fa.disposalTested },
          { l: 'Pelepasan tak-tercatat teridentifikasi', v: fa.disposalUnrec, flag: true },
        ].map((r, i) => (
          <div key={i} className="row ac jb" style={{ padding: '8px 0', borderTop: i ? '1px solid var(--line-soft)' : 0 }}>
            <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>{r.l}</span>
            <span className="mono" style={{ fontSize: 12, fontWeight: 600, color: r.flag ? (r.v ? 'var(--red)' : 'var(--green)') : 'var(--ink)' }}>{r.v ? sc(r.v) : (r.flag ? 'NIHIL' : '—')}</span>
          </div>
        ))}
      </div>
      {riskPPE && (
        <div onClick={() => nav('risk', { from: 'psak16' })} className="tiny" style={{ marginTop: 8, padding: '8px 9px', borderRadius: 7, background: 'var(--amber-bg)', cursor: 'pointer', lineHeight: 1.45 }}>
          <b>{riskPPE.id}</b> — {riskPPE.desc}. Prosedur: telusuri otorisasi pelepasan, pencatatan kas hasil, & inspeksi fisik sampling aset (WP E-5). Selisih laba/rugi pelepasan diakui pada Laba Rugi (¶71) — tidak ada pelepasan material {eng.fy}.
        </div>
      )}
      <div onClick={() => nav('psak58', { from: 'psak16' })} className="row ac jb tiny" style={{ marginTop: 8, padding: '8px 10px', borderRadius: 7, background: 'var(--blue-050)', cursor: 'pointer', lineHeight: 1.45 }}>
        <span><b>PSAK 58</b> — aset yang akan dilepas via penjualan direklasifikasi ke <b>dimiliki untuk dijual</b> (¶6): penyusutan dihentikan & diukur pada nilai terendah jumlah tercatat vs FVLCS. Segmen logistik telah diklasifikasi demikian.</span>
        <I.arrowRight size={13} style={{ color: 'var(--ink-4)', flex: '0 0 auto', marginLeft: 8 }} />
      </div>
    </Panel>
  );

  /* ============ PANEL: indikasi penurunan nilai (¶63 → PSAK 48) ============ */
  const impairPanel = (
    <Panel noBody>
      <div className="panel-h"><h3>Indikasi Penurunan Nilai</h3><span className="sub mono">¶63→PSAK 48</span><div style={{ flex: 1 }} /><span className="tiny muted">{impFlags} indikasi</span></div>
      <div>
        {impair.map((m: any, i: any) => (
          <label key={m.id} className="row gap9" style={{ padding: '7px 13px', cursor: 'pointer', alignItems: 'flex-start', borderBottom: i < impair.length - 1 ? '1px solid var(--line-soft)' : 0 }} onClick={() => toggleImpair(m.id)}>
            <span style={{ flex: '0 0 16px', width: 16, height: 16, borderRadius: 4, marginTop: 1, border: '1.5px solid ' + (m.flag ? 'var(--amber)' : 'var(--line)'), background: m.flag ? 'var(--amber)' : '#fff', display: 'grid', placeItems: 'center' }}>{m.flag && <I.check size={11} style={{ color: '#fff' }} />}</span>
            <span style={{ fontSize: 11.5, lineHeight: 1.35, color: m.flag ? 'var(--ink)' : 'var(--ink-2)', fontWeight: m.flag ? 600 : 400 }}>{m.t}<span className="tiny" style={{ color: 'var(--ink-4)', fontWeight: 400, marginLeft: 5 }}>· {m.src}</span></span>
          </label>
        ))}
      </div>
      <div className="tiny muted" style={{ padding: '8px 13px', lineHeight: 1.5, borderTop: '1px solid var(--line-soft)' }}>
        {impFlags > 0 ? <>Terdapat <b>{impFlags} indikasi</b> → uji penurunan nilai (PSAK 48): bandingkan jumlah tercatat dgn jumlah terpulihkan. Tidak ada rugi penurunan material teridentifikasi {eng.fy}.</> : <>Tidak ada indikasi penurunan nilai pada {eng.fy} — uji formal tidak diwajibkan.</>}
      </div>
    </Panel>
  );

  /* ============ PANEL: asersi & prosedur ============ */
  const asersiPanel = (
    <Panel noBody>
      <div className="panel-h"><h3>Asersi & Prosedur Audit</h3><div style={{ flex: 1 }} /><span className="tiny muted">SA 501 · SA 540</span></div>
      <div>
        {P16_ASSERT.map((r, i) => {
          const st = (STATE as any)[r.state];
          return (
            <div key={i} className="row ac gap10" style={{ padding: '9px 14px', borderBottom: i < P16_ASSERT.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
              <span style={{ color: st.c, display: 'grid', placeItems: 'center', flex: '0 0 auto' }}>{r.state === 'ok' ? <I.checkCircle size={15} /> : <I.alert size={15} />}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.3 }}>{r.asr}</div>
                <div className="tiny muted">{r.proc}</div>
              </div>
              <Badge kind="gray">{r.sa}</Badge>
              <span className="mono tiny" style={{ color: 'var(--ink-4)', width: 30, textAlign: 'right' }}>{r.wp}</span>
            </div>
          );
        })}
      </div>
      <div className="tiny muted" style={{ padding: '9px 14px', lineHeight: 1.5, borderTop: '1px solid var(--line-soft)' }}>
        Estimasi <b>umur manfaat & nilai residu</b> (¶51) merupakan estimasi akuntansi signifikan → diuji per <b>SA 540</b>. Koreksi penyusutan (AJE-05) timbul dari pengujian ini.
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
          const IconC = (I as any)[r.icon] || I.doc;
          return (
            <button key={i} onClick={() => nav(r.route, { from: 'psak16' })} className="row ac gap9" style={{ width: '100%', textAlign: 'left', padding: '8px 9px', borderRadius: 7, border: '1px solid transparent', background: 'none', cursor: 'pointer' }}
              onMouseEnter={(e: any) => { e.currentTarget.style.background = 'var(--blue-050)'; e.currentTarget.style.borderColor = 'var(--blue-100)'; }}
              onMouseLeave={(e: any) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.borderColor = 'transparent'; }}>
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
        Tidak ada angka di-input ulang: harga perolehan & akumulasi penyusutan ditarik dari WTB yang sama dipakai FS Generator, PSAK 46, & Arus Kas. Perubahan AJE mengalir serempak.
      </div>
    </Panel>
  );

  /* ============ PANEL: pengukuran setelah pengakuan ============ */
  const pengukuranPanel = (
    <Panel noBody>
      <div className="panel-h"><h3>Pengukuran Setelah Pengakuan</h3><span className="sub mono">¶29–31</span></div>
      <div style={{ padding: '10px 13px', display: 'grid', gap: 9 }}>
        <div className="seg" style={{ width: '100%' }}>
          <button className={measure === 'cost' ? 'on' : ''} onClick={() => setMeasure('cost')} style={{ flex: 1 }}>Model biaya</button>
          <button className={measure === 'reval' ? 'on' : ''} onClick={() => setMeasure('reval')} style={{ flex: 1 }}>Model revaluasi</button>
        </div>
        {measure === 'cost' ? (
          <div style={{ fontSize: 11.5, lineHeight: 1.5 }}>Entitas menerapkan <b>model biaya</b> (¶30): aset disajikan pada biaya perolehan dikurangi akumulasi penyusutan & rugi penurunan nilai. Diterapkan konsisten untuk seluruh kelompok.</div>
        ) : (
          <div className="panel" style={{ padding: '8px 10px', background: 'var(--amber-bg)', borderColor: 'transparent' }}>
            <div className="row gap6" style={{ alignItems: 'flex-start' }}>
              <span style={{ color: 'var(--amber)', marginTop: 1 }}><I.alert size={14} /></span>
              <span className="tiny" style={{ lineHeight: 1.45 }}>Model revaluasi (¶31) mensyaratkan revaluasi seluruh kelompok secara reguler & surplus revaluasi diakui di OCI. <b>Tidak diterapkan</b> entitas — pengungkapan ¶77 N/A.</span>
            </div>
          </div>
        )}
        <div style={{ fontSize: 11, lineHeight: 1.5, color: 'var(--ink-3)', borderTop: '1px solid var(--line-soft)', paddingTop: 8 }}>
          <b>Komponensasi (¶43–47):</b> komponen signifikan (mis. mesin & bangunan) disusutkan terpisah. <b>Telaah estimasi (¶51):</b> umur manfaat & nilai residu ditelaah tiap akhir tahun — perubahan diperlakukan prospektif.
        </div>
      </div>
    </Panel>
  );

  /* ============ PANEL: checklist pengungkapan ============ */
  const disclosurePanel = (
    <Panel noBody>
      <div className="panel-h"><h3>Pengungkapan PSAK 16</h3><span className="sub mono">¶73–79</span><div style={{ flex: 1 }} /><span className="tiny muted">{discOk}/{disc.length}</span></div>
      <div>
        {disc.map((d: any, i: any) => (
          <label key={d.id} className="row gap9" style={{ padding: '8px 13px', cursor: d.na ? 'default' : 'pointer', alignItems: 'flex-start', borderBottom: i < disc.length - 1 ? '1px solid var(--line-soft)' : 0, opacity: d.na ? 0.6 : 1 }} onClick={() => !d.na && toggleDisc(d.id)}>
            <span style={{ flex: '0 0 16px', width: 16, height: 16, borderRadius: 4, marginTop: 1, border: '1.5px solid ' + (d.na ? 'var(--line)' : (d.ok ? 'var(--green)' : 'var(--amber)')), background: d.ok && !d.na ? 'var(--green)' : '#fff', display: 'grid', placeItems: 'center' }}>{d.ok && !d.na && <I.check size={11} style={{ color: '#fff' }} />}{d.na && <span className="mono" style={{ fontSize: 8, color: 'var(--ink-4)' }}>N/A</span>}</span>
            <span className="mono tiny" style={{ fontWeight: 700, color: 'var(--navy)', width: 52, flex: '0 0 52px', marginTop: 1 }}>{d.ref}</span>
            <span style={{ fontSize: 11.5, lineHeight: 1.4, color: d.ok ? 'var(--ink-2)' : 'var(--ink)', fontWeight: d.ok ? 400 : 600 }}>{d.t}</span>
          </label>
        ))}
      </div>
    </Panel>
  );

  /* ============ BLOCK: register & impor ============ */
  const registerBlock = reg && (
    <div className="grid" style={{ gap: 12 }}>
      <div className="row ac jb">
        <div>
          <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--navy)' }}>Register Aset Tetap & Impor Lampiran</div>
          <div className="tiny muted">Buku besar pembantu dari <span className="mono">register-aset-tetap.xlsx</span> — direkonsiliasi ke akun kontrol GL</div>
        </div>
        <div className="seg" style={{ width: 'fit-content' }}>
          <button className={regTab === 'register' ? 'on' : ''} onClick={() => setRegTab('register')}>Register Sub-ledger</button>
          <button className={regTab === 'import' ? 'on' : ''} onClick={() => setRegTab('import')}>Pemetaan Impor Excel</button>
        </div>
      </div>
      <div className="grid" style={{ gridTemplateColumns: '1fr 336px', gap: 12, alignItems: 'start' }}>
        <div className="grid" style={{ gap: 12 }}>
          {regTab === 'register'
            ? <AssetRegisterTable reg={reg} sc={sc} fmt={fmt} />
            : <ImportMappingPanel reg={reg} fmt={fmt} nav={nav} />}
        </div>
        <SubLedgerRecon reg={reg} sc={sc} nav={nav} />
      </div>
    </div>
  );

  /* ============ TABS ============ */
  const TABS = [
    { id: 'ikhtisar',     label: 'Ikhtisar & Roll-forward', icon: 'table',  badge: tiePass + '/' + tieRows.length, bad: tiePass !== tieRows.length },
    { id: 'penyusutan',   label: 'Penyusutan & Pengukuran', icon: 'scale',  badge: fmt(fa.depVarPct * 100, 1) + '%', bad: !depWithin },
    { id: 'pelepasan',    label: 'Pelepasan & Penurunan',   icon: 'alert',  badge: impFlags ? String(impFlags) : null, bad: false },
    { id: 'register',     label: 'Register & Impor',        icon: 'ledger', badge: reg ? String(reg.count) : null, bad: reg && !reg.reconciled },
    { id: 'pengungkapan', label: 'Pengungkapan & Sumber',   icon: 'doc',    badge: discOk + '/' + disc.length, bad: discOk < disc.filter((d: any) => !d.na).length },
  ];

  return (
    <>
      <SubBar moduleId="psak16" right={
        <div className="row gap8 ac">
          <Badge kind="green">PSAK 16 · IAS 16</Badge>
          <div className="seg" style={{ width: 'fit-content' }}>
            <button className={unit === 'jutaan' ? 'on' : ''} onClick={() => setUnit('jutaan')}>Jutaan</button>
            <button className={unit === 'penuh' ? 'on' : ''} onClick={() => setUnit('penuh')}>Penuh</button>
          </div>
          <Btn sm onClick={() => nav('sa501', { from: 'psak16' })}><I.search2 size={13} /> SA 501 · Inspeksi</Btn>
          <Btn sm onClick={() => nav('psak46', { from: 'psak16' })}><I.receipt size={13} /> PSAK 46</Btn>
          <Btn sm onClick={() => nav('fsgen', { from: 'psak16' })}><I.report size={13} /> FS Generator</Btn>
          <Btn sm onClick={() => nav('wtb', { from: 'psak16' })}><I.ledger size={13} /> Buku Besar</Btn>
          <Btn sm onClick={onExportXlsx} disabled={exporting}><I.download size={13} /> {exporting ? 'Menyiapkan…' : 'Kertas Kerja E (XLSX)'}</Btn>
        </div>
      } />
      <div className="view-scroll">
        <div className="view-pad" style={{ display: 'grid', gap: 12 }}>

          {/* summary */}
          <div className="grid" style={{ gridTemplateColumns: 'repeat(5,1fr)', gap: 10 }}>
            <FaCard value={fmt(fa.netClose / 1e3, 1)} unit="M" label="Aset tetap — neto audited" sub="31 Des 2025 · WTB 1-2100/2110" accent="var(--navy)" />
            <FaCard value={fmt(fa.deprAudited / 1e3, 1)} unit="M" label="Beban penyusutan" sub="¶62 · add-back Arus Kas" accent="var(--blue)" />
            <FaCard value={fmt(fa.capexNet / 1e3, 1)} unit="M" label="Belanja modal — neto" sub="¶16 · arus kas investasi" accent="var(--purple)" />
            <FaCard value={(fa.depVariance >= 0 ? '+' : '−') + fmt(Math.abs(fa.depVariance), 0)} unit="jt" label="Selisih uji penyusutan" sub={depWithin ? 'dalam toleransi ' + fmt(fa.depVarPct * 100, 1) + '% (SA 520)' : 'di luar toleransi → telaah'} accent={depWithin ? 'var(--green)' : 'var(--amber)'} />
            <FaCard value={tiePass + '/' + tieRows.length} label="Tie-out lintas-laporan" sub={tiePass === tieRows.length ? 'seluruh rekonsiliasi menutup' : 'perlu ditelusuri'} accent={tiePass === tieRows.length ? 'var(--green)' : 'var(--amber)'} />
          </div>

          {/* tab bar */}
          <div className="row" style={{ gap: 0, borderBottom: '1px solid var(--line)', overflowX: 'auto', flexWrap: 'nowrap' }}>
            {TABS.map(t => {
              const IconT = (I as any)[t.icon] || I.doc;
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
              <div className="grid" style={{ gap: 12 }}>{rollforwardPanel}{klasifikasiPanel}</div>
              {tieoutPanel}
            </div>
          )}

          {/* ============ TAB: PENYUSUTAN ============ */}
          {tab === 'penyusutan' && (
            <div className="grid" style={{ gridTemplateColumns: '1fr 336px', gap: 12, alignItems: 'start' }}>
              {ujiPanel}
              {pengukuranPanel}
            </div>
          )}

          {/* ============ TAB: PELEPASAN & PENURUNAN ============ */}
          {tab === 'pelepasan' && (
            <div className="grid" style={{ gap: 12 }}>
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }}>{pelepasanPanel}{impairPanel}</div>
              {asersiPanel}
            </div>
          )}

          {/* ============ TAB: REGISTER & IMPOR ============ */}
          {tab === 'register' && registerBlock}

          {/* ============ TAB: PENGUNGKAPAN & SUMBER ============ */}
          {tab === 'pengungkapan' && (
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }}>{disclosurePanel}{lineagePanel}</div>
          )}

          <div className="tiny muted" style={{ padding: '0 2px 4px', lineHeight: 1.5 }}>
            Kertas kerja aset tetap <b>{client.name}</b> ({eng.id} · {eng.fy}) disusun sesuai PSAK 16 dan ditarik penuh dari Working Trial Balance (1-2100 & 1-2110) melalui mesin kanonik yang sama dipakai FS Generator (CALK 7), PSAK 46 (beda temporer), Arus Kas (add-back penyusutan), & tab Rekonsiliasi Angka. {aje05 ? <>Koreksi <b>{aje05.id}</b> ({aje05.desc}) berstatus {aje05.status} telah tercermin pada saldo adjusted.</> : null} Status & pilihan tersimpan otomatis untuk jejak audit.
          </div>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { PSAK16View });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { PSAK16View };
