/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { AMS_CANON } from './canon';
import { FSGEN } from './fsgen_model';
import { useAudit, useFirm, useNav } from './contexts.jsx';
import { I } from './icons.jsx';
import { SubBar } from './shell.jsx';
import { Badge, Btn, Panel } from './ui.jsx';
import { P72_ContractBal, P72_FiveStep, P72_SspTable } from './view_psak72_parts';

/* ============================================================
   Asseris — PSAK 72 · Pendapatan dari Kontrak dengan Pelanggan
   Kertas kerja penyusunan & audit Pendapatan yang DITARIK PENUH dari
   satu sumber kebenaran:
     · Working Trial Balance (useAudit().wtb) — akun 4-1100 (Penjualan
       Bersih) & 1-1200 (Piutang Usaha)
     · AMS_CANON.revenue(wtb) — mesin derivasi pendapatan yang sama
       menambatkan disagregasi, jembatan harga transaksi, alokasi SSP,
       & saldo kontrak; koreksi cut-off ditarik dari AJE-03
     · FSGEN.buildModel(wtb) — penyajian Laba Rugi (Penjualan) & CALK 15
   Tidak ada angka di-hardcode. Koreksi AJE-03 (pengakuan dini / channel
   stuffing) mengalir serempak ke jembatan, FS Generator, Piutang (PSAK 71),
   & tab Rekonsiliasi.

   Cakupan: model 5 langkah (¶9-45) — identifikasi kontrak, kewajiban
   pelaksanaan, harga transaksi, alokasi SSP, & pengakuan titik/sepanjang
   waktu; disagregasi pendapatan (¶114) per lini/waktu/saluran/geografi;
   jembatan harga transaksi & konsiderasi variabel (¶47-72); saldo kontrak
   (¶105, ¶116); risiko kecurangan pendapatan & cut-off (R-01 · SA 240 · SA 330);
   asersi & prosedur; tie-out lintas-laporan; lineage; checklist pengungkapan
   (¶110-129).
   ============================================================ */
const { useState: useStateP72, useMemo: useMemoP72, useEffect: useEffectP72 } = React;

/* asersi → prosedur audit pendapatan */
const P72_ASSERT = [
  { asr: 'Keterjadian (Occurrence)', proc: 'Cut-off testing diperluas & konfirmasi atas pengakuan dini (channel stuffing) — R-01', sa: 'SA 240', wp: 'R-1', state: 'warn' },
  { asr: 'Pisah Batas (Cut-off)', proc: 'Telusuri pengiriman di sekitar tutup buku ke tanggal pengakuan pendapatan', sa: 'SA 500', wp: 'R-2', state: 'warn' },
  { asr: 'Kelengkapan', proc: 'Rekonsiliasi pendapatan ke buku besar & pencocokan pengiriman tak terfaktur', sa: 'SA 500', wp: 'R-3', state: 'ok' },
  { asr: 'Akurasi — Konsiderasi Variabel', proc: 'Uji estimasi retur/rabat (nilai ekspektasian) & pembatasan (¶56)', sa: 'SA 540', wp: 'R-4', state: 'ok' },
  { asr: 'Hak — Kolektibilitas', proc: 'Konfirmasi eksternal piutang & evaluasi kolektibilitas (ECL)', sa: 'SA 505', wp: 'B-7', state: 'ok' },
  { asr: 'Penyajian & Disagregasi', proc: 'Evaluasi prinsipal vs agen (gross/net ¶B34) & kelengkapan disagregasi', sa: 'SA 700', wp: 'R-6', state: 'ok' },
];

/* prosedur respons risiko kecurangan & cut-off (occurrence) */
const P72_PROC = [
  { id: 'p1', t: 'Cut-off testing diperluas — sampel pengiriman 10 hari sebelum/sesudah 31 Des', sa: 'SA 330', done: true },
  { id: 'p2', t: 'Konfirmasi eksternal saldo & syarat penjualan ke pelanggan besar', sa: 'SA 505', done: true },
  { id: 'p3', t: 'Telaah retur penjualan pasca-tahun (subsequent returns)', sa: 'SA 560', done: false },
  { id: 'p4', t: 'Analitis pendapatan bulanan & per lini — uji lonjakan Desember', sa: 'SA 520', done: true },
  { id: 'p5', t: 'Pengujian jurnal pendapatan tak lazim (journal entry testing)', sa: 'SA 240', done: true },
  { id: 'p6', t: 'Telaah term kontrak: bill-and-hold, hak retur, side agreement', sa: 'SA 500', done: false },
];

/* checklist pengungkapan PSAK 72 (¶110-129) */
const P72_DISCLOSURE = [
  { id: 'q113', ref: '¶113', t: 'Pendapatan dari kontrak dengan pelanggan disajikan terpisah', ok: true },
  { id: 'q114', ref: '¶114', t: 'Disagregasi pendapatan per kategori (lini, waktu, saluran, geografi)', ok: true },
  { id: 'q116', ref: '¶116', t: 'Saldo awal & akhir piutang, aset kontrak & liabilitas kontrak', ok: true },
  { id: 'q117', ref: '¶117', t: 'Penjelasan perubahan signifikan saldo kontrak', ok: true },
  { id: 'q119', ref: '¶119', t: 'Informasi kewajiban pelaksanaan (kapan terpenuhi, termin pembayaran)', ok: true },
  { id: 'q120', ref: '¶120', t: 'Harga transaksi dialokasikan ke POB belum terpenuhi (backlog)', ok: false },
  { id: 'q123', ref: '¶123', t: 'Pertimbangan signifikan penentuan waktu pemenuhan POB', ok: true },
  { id: 'q126', ref: '¶126', t: 'Metode & input estimasi konsiderasi variabel serta pembatasannya', ok: true },
  { id: 'q91',  ref: '¶91',  t: 'Biaya perolehan & pemenuhan kontrak yang dikapitalisasi', ok: true, na: true },
];

function RevCard({ value, unit, label, sub, accent }: any) {
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

function P72BridgeRow({ label, v, cite, sc, sub, total, vc, memo }: any) {
  const strong = sub || total;
  return (
    <tr style={{
      borderTop: total ? '1.5px solid var(--navy)' : (sub ? '1px solid var(--line)' : '1px solid var(--line-soft)'),
      background: total ? 'var(--blue-050)' : 'transparent',
    }}>
      <td style={{ padding: total ? '9px 8px' : '6px 8px', fontSize: total ? 12.5 : 12, fontWeight: strong ? 700 : 400, color: strong ? 'var(--ink)' : 'var(--ink-2)', lineHeight: 1.3 }}>
        {label}
        {memo && <span className="tiny" style={{ color: 'var(--amber)', fontWeight: 600, marginLeft: 6 }}>{memo}</span>}
      </td>
      <td className="mono tiny" style={{ textAlign: 'right', padding: '0 8px', color: 'var(--ink-4)', whiteSpace: 'nowrap' }}>{cite || ''}</td>
      <td className="mono" style={{
        textAlign: 'right', padding: total ? '9px 8px' : '6px 8px', whiteSpace: 'nowrap',
        fontSize: total ? 12.5 : 12, fontWeight: strong ? 700 : 500,
        color: v === 0 ? 'var(--ink-4)' : (v < 0 ? 'var(--red)' : (total ? 'var(--navy)' : (vc ? 'var(--ink)' : 'var(--ink)'))),
      }}>{v === 0 ? '—' : (v < 0 ? '(' + sc(Math.abs(v)) + ')' : sc(v))}</td>
    </tr>
  );
}

function PSAK72View() {
  const { fmt } = AMS;
  const firm = useFirm();
  const audit = useAudit();
  const nav = useNav();
  const loader = window.loadLS || ((k, d) => d);

  /* ——— SUMBER KEBENARAN ——— */
  const wtb = (audit && audit.wtb && audit.wtb.length) ? audit.wtb : ((AMS && AMS.WTB) || []);
  const model = useMemoP72(() => (FSGEN ? FSGEN.buildModel(wtb) : null), [wtb]);
  const rev = useMemoP72(() => (AMS_CANON ? AMS_CANON.revenue(wtb) : null), [wtb]);

  const [unit, setUnit] = useStateP72(() => loader('ams.psak72.unit', 'jutaan'));
  const [tab, setTab] = useStateP72(() => loader('ams.psak72.tab', 'ikhtisar'));
  const [dim, setDim] = useStateP72(() => loader('ams.psak72.dim', 'lini'));
  const [disc, setDisc] = useStateP72(() => loader('ams.psak72.disc', P72_DISCLOSURE));
  const [proc, setProc] = useStateP72(() => loader('ams.psak72.proc', P72_PROC));
  useEffectP72(() => { try { localStorage.setItem('ams.psak72.unit', JSON.stringify(unit)); } catch (e) {} }, [unit]);
  useEffectP72(() => { try { localStorage.setItem('ams.psak72.tab', JSON.stringify(tab)); } catch (e) {} }, [tab]);
  useEffectP72(() => { try { localStorage.setItem('ams.psak72.dim', JSON.stringify(dim)); } catch (e) {} }, [dim]);
  useEffectP72(() => { try { localStorage.setItem('ams.psak72.disc', JSON.stringify(disc)); } catch (e) {} }, [disc]);
  useEffectP72(() => { try { localStorage.setItem('ams.psak72.proc', JSON.stringify(proc)); } catch (e) {} }, [proc]);
  const toggleDisc = (id) => setDisc(list => list.map(r => r.id === id ? { ...r, ok: !r.ok } : r));
  const toggleProc = (id) => setProc(list => list.map(r => r.id === id ? { ...r, done: !r.done } : r));

  if (!model || !rev) {
    return <><SubBar moduleId="psak72" /><div className="view-pad"><Panel title="PSAK 72"><div className="tiny muted">Mesin FS Generator / kanonik belum dimuat.</div></Panel></div></>;
  }

  const client = firm.activeClient || { name: 'PT Sentosa Makmur Tbk' };
  const eng = firm.activeEngagement || { id: 'ENG-2025-014', fy: 'FY2025' };
  const riskRev = (((AMS && AMS.RISKS) as any[]) || []).find(r => r.id === 'R-01');

  /* ——— skala penyajian (kanonik dalam Rp juta) ——— */
  const UN = unit === 'penuh' ? { mult: 1e6, short: 'Rp' } : { mult: 1, short: 'Rp jt' };
  const sc = (vJuta) => fmt(Math.round(vJuta * UN.mult), 0);

  /* ——— disagregasi aktif ——— */
  const DIMS = { lini: rev.streams, saluran: rev.channels, geografi: rev.geo };
  const dimRows = DIMS[dim] || rev.streams;
  const dimMax = Math.max(...dimRows.map(r => r.amount), 1);

  /* ——— tie-out lintas-laporan (Rp juta) ——— */
  const M = (full) => full / 1e6;
  const tieRows = [
    { id: 't1', label: 'Pendapatan dibukukan = Laba Rugi FS Generator', std: '¶113', a: rev.revBooked, b: M(model.is.sales.cy), note: 'Pendapatan neto = pos Penjualan pada Laporan Laba Rugi (FS Generator).' },
    { id: 't2', label: 'Pendapatan = WTB 4-1100 (adjusted)', std: '¶113', a: rev.revAdjWTB, b: -M((wtb.find(r => r.code === '4-1100') || {}).adj || 0), note: 'Pendapatan neto menutup ke buku besar Penjualan Bersih (kredit, dibalik positif).' },
    { id: 't3', label: 'Σ disagregasi per lini = pendapatan dibukukan', std: '¶114', a: rev.streamsTot, b: rev.revBooked, note: 'Jumlah seluruh lini produk = total pendapatan (alokasi pengungkapan dinormalkan).' },
    { id: 't4', label: 'Σ alokasi SSP = harga transaksi kontrak', std: '¶76', a: rev.pobAlloc, b: rev.contract.price, note: 'Alokasi pro-rata ke kewajiban pelaksanaan menutup ke harga transaksi.' },
    { id: 't5', label: 'Jembatan harga transaksi menutup (bruto − variabel)', std: '¶47', a: rev.grossBilling - rev.vc.retur - rev.vc.rabat - rev.vc.diskonDini, b: rev.revBooked, note: 'Bruto dikurangi konsiderasi variabel & utang ke pelanggan = pendapatan neto.' },
    { id: 't6', label: 'Pendapatan komparatif 2024 = WTB 4-1100 (ly)', std: '¶113', a: rev.revPY, b: -M((wtb.find(r => r.code === '4-1100') || {}).ly || 0), note: 'Pendapatan periode lalu = saldo audited komparatif (kolom ly WTB).' },
    { id: 't7', label: 'Koreksi cut-off = AJE-03 (occurrence)', std: 'SA 240', a: rev.cutoffRev, b: rev.aje03 ? M(rev.aje03.amount) : 0, note: 'Koreksi pengakuan dini (' + (rev.aje03 ? rev.aje03.status : '—') + ') Rp ' + fmt(rev.cutoffRev) + ' jt ditarik dari Buku Besar AJE.' },
    { id: 't8', label: 'Piutang usaha (akhir) = WTB 1-1200 (adjusted)', std: '¶105', a: rev.balances.recvClose, b: M((wtb.find(r => r.code === '1-1200') || {}).adj || 0), note: 'Hak tanpa syarat atas imbalan menutup ke buku besar Piutang Usaha (PSAK 71).' },
  ].map(r => ({ ...r, diff: r.a - r.b, ok: Math.abs(r.a - r.b) < 1.5 }));
  const tiePass = tieRows.filter(r => r.ok).length;

  /* ——— lineage ——— */
  const lineage = [
    { k: 'Pendapatan neto (Penjualan Bersih)', src: 'WTB · 4-1100', route: 'wtb', icon: 'ledger' },
    { k: 'Piutang usaha (hak tanpa syarat)', src: 'WTB · 1-1200', route: 'wtb', icon: 'ledger' },
    { k: 'Penyajian Laba Rugi & CALK 15', src: 'FS Generator', route: 'fsgen', icon: 'report' },
    { k: 'Kolektibilitas & ECL piutang', src: 'PSAK 71 · Instrumen Keuangan', route: 'psak71', icon: 'coins' },
    { k: 'Koreksi cut-off / pengakuan dini', src: 'Buku Besar · AJE-03', route: 'aje', icon: 'scale' },
    { k: 'Risiko kecurangan pendapatan (R-01)', src: 'Penilaian Risiko', route: 'risk', icon: 'flag' },
    { k: 'Pengujian kecurangan pendapatan', src: 'SA 240 · presumsi ¶26', route: 'sa240', icon: 'shield' },
    { k: 'Konfirmasi eksternal piutang', src: 'SA 505 · Konfirmasi', route: 'confirm', icon: 'mail' },
    { k: 'Prosedur analitis pendapatan', src: 'SA 520 · Analitis', route: 'sa520', icon: 'trend' },
    { k: 'Sampling pengujian rinci', src: 'SA 530 · Sampling', route: 'sa530', icon: 'dice' },
  ];

  const discOk = disc.filter(d => d.ok).length;
  const procDone = proc.filter(p => p.done).length;
  const pointPct = rev.pointTime / rev.revBooked;
  const STATE = { ok: { c: 'var(--green)' }, warn: { c: 'var(--amber)' } };

  /* ============ PANEL: jembatan harga transaksi ============ */
  const bridgePanel = (
    <Panel noBody>
      <div className="panel-h">
        <h3>Jembatan Harga Transaksi</h3>
        <span className="sub mono">¶47-72</span>
        <div style={{ flex: 1 }} />
        <span className="tiny muted">{UN.short} · ditarik dari WTB</span>
      </div>
      <div style={{ padding: '4px 14px 12px', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ color: 'var(--ink-4)' }}>
              <th style={{ textAlign: 'left', fontWeight: 600, padding: '4px 8px' }}>Komponen</th>
              <th style={{ textAlign: 'right', fontWeight: 600, padding: '4px 8px' }}>Ref</th>
              <th style={{ textAlign: 'right', fontWeight: 600, padding: '4px 8px' }}>Nilai</th>
            </tr>
          </thead>
          <tbody>
            {rev.bridge.map((r, i) => <P72BridgeRow key={i} {...r} sc={sc} />)}
          </tbody>
        </table>
        <div className="panel" style={{ marginTop: 12, padding: '9px 11px', background: rev.cutoffPosted ? 'var(--green-bg)' : 'var(--amber-bg)', borderColor: 'transparent' }}>
          <div className="row gap8" style={{ alignItems: 'flex-start' }}>
            <span style={{ color: rev.cutoffPosted ? 'var(--green)' : 'var(--amber)', marginTop: 1 }}><I.alert size={15} /></span>
            <span style={{ fontSize: 11.5, lineHeight: 1.45 }}>
              <b>Konsiderasi variabel</b> Rp {sc(rev.grossBilling - rev.revBooked)} {UN.short} (retur, rabat, diskon) mengurangi bruto ke neto dibukukan. Koreksi audit <b>AJE-03</b> ({rev.aje03 ? rev.aje03.status : '—'}) Rp {fmt(rev.cutoffRev)} jt membalik pengakuan dini (channel stuffing) — pendapatan audited <b className="mono">Rp {sc(rev.revAudited)}</b> {UN.short}.
            </span>
          </div>
        </div>
      </div>
    </Panel>
  );

  /* ============ PANEL: disagregasi (¶114) ============ */
  const disaggPanel = (
    <Panel noBody>
      <div className="panel-h">
        <h3>Disagregasi Pendapatan</h3><span className="sub mono">¶114</span>
        <div style={{ flex: 1 }} />
        <div className="seg" style={{ width: 'fit-content' }}>
          <button className={dim === 'lini' ? 'on' : ''} onClick={() => setDim('lini')}>Lini</button>
          <button className={dim === 'saluran' ? 'on' : ''} onClick={() => setDim('saluran')}>Saluran</button>
          <button className={dim === 'geografi' ? 'on' : ''} onClick={() => setDim('geografi')}>Geografi</button>
        </div>
      </div>
      <div style={{ padding: '8px 14px 12px', display: 'grid', gap: 8 }}>
        {dimRows.map((r, i) => (
          <div key={i} style={{ display: 'grid', gap: 3 }}>
            <div className="row ac jb">
              <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--ink-2)' }}>{r.label}{r.timing && <Badge kind={r.timing === 'over' ? 'blue' : 'gray'} >{r.timing === 'over' ? 'sepanjang' : 'titik'}</Badge>}</span>
              <span className="mono" style={{ fontSize: 11.5, fontWeight: 700 }}>{sc(r.amount)} <span className="tiny muted">· {fmt(r.amount / rev.revBooked * 100, 1)}%</span></span>
            </div>
            <div style={{ height: 7, borderRadius: 4, background: 'var(--surface-2, #f1f3f6)', overflow: 'hidden' }}>
              <div style={{ width: (r.amount / dimMax * 100) + '%', height: '100%', background: r.timing === 'over' ? 'var(--blue)' : 'var(--navy)', borderRadius: 4 }} />
            </div>
          </div>
        ))}
        <div className="row" style={{ marginTop: 4, gap: 8 }}>
          <div className="panel" style={{ flex: 1, padding: '8px 10px', display: 'grid', gap: 1 }}>
            <div className="tiny muted">Titik waktu (¶38)</div>
            <div className="mono" style={{ fontWeight: 700, fontSize: 13, color: 'var(--navy)' }}>{sc(rev.pointTime)} <span className="tiny muted">{fmt(pointPct * 100, 0)}%</span></div>
          </div>
          <div className="panel" style={{ flex: 1, padding: '8px 10px', display: 'grid', gap: 1 }}>
            <div className="tiny muted">Sepanjang waktu (¶35)</div>
            <div className="mono" style={{ fontWeight: 700, fontSize: 13, color: 'var(--blue)' }}>{sc(rev.overTime)} <span className="tiny muted">{fmt((1 - pointPct) * 100, 0)}%</span></div>
          </div>
        </div>
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

  /* ============ PANEL: risiko kecurangan & cut-off (R-01) ============ */
  const fraudPanel = (
    <Panel noBody>
      <div className="panel-h"><h3>Risiko Kecurangan Pendapatan</h3><span className="sub mono">SA 240 · ¶26</span><div style={{ flex: 1 }} /><Badge kind="red">R-01 · Significant</Badge></div>
      <div style={{ padding: '10px 13px', display: 'grid', gap: 10 }}>
        {riskRev && (
          <div onClick={() => nav('risk', { from: 'psak72' })} style={{ cursor: 'pointer', padding: '9px 10px', borderRadius: 8, background: 'var(--amber-bg)', lineHeight: 1.45 }}>
            <div className="row ac gap7" style={{ marginBottom: 3 }}><b style={{ fontSize: 12 }}>{riskRev.id}</b><Badge kind="gray">{riskRev.assertion}</Badge><span className="tiny muted">{riskRev.wp}</span></div>
            <div className="tiny" style={{ color: 'var(--ink-2)' }}>{riskRev.desc}. Respons: {riskRev.response}.</div>
          </div>
        )}
        <div className="row" style={{ gap: 8 }}>
          <div className="panel" style={{ flex: 1, padding: '8px 10px', display: 'grid', gap: 1 }}>
            <div className="tiny muted">Salah saji teridentifikasi</div>
            <div className="mono" style={{ fontWeight: 700, fontSize: 13, color: 'var(--red)' }}>{sc(rev.cutoffRev)} <span className="tiny muted">jt</span></div>
            <div className="tiny" style={{ color: 'var(--ink-4)' }}>arah: lebih saji (overstatement)</div>
          </div>
          <div className="panel" style={{ flex: 1, padding: '8px 10px', display: 'grid', gap: 1 }}>
            <div className="tiny muted">Koreksi (AJE-03)</div>
            <div className="mono" style={{ fontWeight: 700, fontSize: 13, color: 'var(--amber)' }}>{rev.aje03 ? rev.aje03.status : '—'}</div>
            <div className="tiny" style={{ color: 'var(--ink-4)' }}>dr 4-1100 · cr 1-1200</div>
          </div>
        </div>
        <div className="tiny muted" style={{ lineHeight: 1.5 }}>
          SA 240 ¶26 menetapkan <b>presumsi risiko kecurangan pada pengakuan pendapatan</b>. Prosedur cut-off & konfirmasi mengidentifikasi pengiriman menjelang tutup buku yang diakui dini (channel stuffing). Koreksi <b>AJE-03</b> membalik pendapatan & piutang fiktif; pendapatan audited turun ke <b className="mono">Rp {sc(rev.revAudited)}</b> {UN.short}.
        </div>
      </div>
    </Panel>
  );

  /* ============ PANEL: prosedur respons ============ */
  const procPanel = (
    <Panel noBody>
      <div className="panel-h"><h3>Prosedur Respons (Cut-off & Occurrence)</h3><div style={{ flex: 1 }} /><span className="tiny muted">{procDone}/{proc.length}</span></div>
      <div>
        {proc.map((p, i) => (
          <label key={p.id} className="row gap9" style={{ padding: '8px 13px', cursor: 'pointer', alignItems: 'flex-start', borderBottom: i < proc.length - 1 ? '1px solid var(--line-soft)' : 0 }} onClick={() => toggleProc(p.id)}>
            <span style={{ flex: '0 0 16px', width: 16, height: 16, borderRadius: 4, marginTop: 1, border: '1.5px solid ' + (p.done ? 'var(--green)' : 'var(--line-strong)'), background: p.done ? 'var(--green)' : '#fff', display: 'grid', placeItems: 'center' }}>{p.done && <I.check size={11} style={{ color: '#fff' }} />}</span>
            <span style={{ flex: 1, fontSize: 11.5, lineHeight: 1.4, color: p.done ? 'var(--ink-2)' : 'var(--ink)', fontWeight: p.done ? 400 : 600 }}>{p.t}</span>
            <Badge kind="gray">{p.sa}</Badge>
          </label>
        ))}
      </div>
    </Panel>
  );

  /* ============ PANEL: asersi & prosedur ============ */
  const asersiPanel = (
    <Panel noBody>
      <div className="panel-h"><h3>Asersi & Prosedur Audit</h3><div style={{ flex: 1 }} /><span className="tiny muted">SA 240 · SA 505 · SA 520</span></div>
      <div>
        {P72_ASSERT.map((r, i) => {
          const st = STATE[r.state];
          return (
            <div key={i} className="row ac gap10" style={{ padding: '9px 14px', borderBottom: i < P72_ASSERT.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
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
        Asersi <b>Keterjadian & Pisah Batas</b> merupakan fokus utama (R-01 · risiko kecurangan). Estimasi <b>konsiderasi variabel</b> (retur/rabat) diuji per SA 540 sebagai estimasi akuntansi.
      </div>
    </Panel>
  );

  /* ============ PANEL: checklist pengungkapan ============ */
  const disclosurePanel = (
    <Panel noBody>
      <div className="panel-h"><h3>Pengungkapan PSAK 72</h3><span className="sub mono">¶110-129</span><div style={{ flex: 1 }} /><span className="tiny muted">{discOk}/{disc.length}</span></div>
      <div>
        {disc.map((d, i) => (
          <label key={d.id} className="row gap9" style={{ padding: '8px 13px', cursor: d.na ? 'default' : 'pointer', alignItems: 'flex-start', borderBottom: i < disc.length - 1 ? '1px solid var(--line-soft)' : 0, opacity: d.na ? 0.6 : 1 }} onClick={() => !d.na && toggleDisc(d.id)}>
            <span style={{ flex: '0 0 16px', width: 16, height: 16, borderRadius: 4, marginTop: 1, border: '1.5px solid ' + (d.na ? 'var(--line)' : (d.ok ? 'var(--green)' : 'var(--amber)')), background: d.ok && !d.na ? 'var(--green)' : '#fff', display: 'grid', placeItems: 'center' }}>{d.ok && !d.na && <I.check size={11} style={{ color: '#fff' }} />}{d.na && <span className="mono" style={{ fontSize: 8, color: 'var(--ink-4)' }}>N/A</span>}</span>
            <span className="mono tiny" style={{ fontWeight: 700, color: 'var(--navy)', width: 46, flex: '0 0 46px', marginTop: 1 }}>{d.ref}</span>
            <span style={{ fontSize: 11.5, lineHeight: 1.4, color: d.ok ? 'var(--ink-2)' : 'var(--ink)', fontWeight: d.ok ? 400 : 600 }}>{d.t}</span>
          </label>
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
            <button key={i} onClick={() => nav(r.route, { from: 'psak72' })} className="row ac gap9" style={{ width: '100%', textAlign: 'left', padding: '8px 9px', borderRadius: 7, border: '1px solid transparent', background: 'none', cursor: 'pointer' }}
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
        Tidak ada angka di-input ulang: pendapatan & piutang ditarik dari WTB yang sama dipakai FS Generator & PSAK 71. Koreksi AJE-03 mengalir serempak ke jembatan, disagregasi, & saldo kontrak.
      </div>
    </Panel>
  );

  /* ============ TABS ============ */
  const TABS = [
    { id: 'ikhtisar',     label: 'Ikhtisar & Disagregasi', icon: 'table',  badge: tiePass + '/' + tieRows.length, bad: tiePass !== tieRows.length },
    { id: 'model5',       label: 'Model 5 Langkah',         icon: 'layers', badge: null },
    { id: 'saldokontrak', label: 'Saldo Kontrak',           icon: 'ledger', badge: null },
    { id: 'cutoff',       label: 'Cut-off & Pengakuan',     icon: 'flag',   badge: rev.cutoffPosted ? null : '1', bad: !rev.cutoffPosted },
    { id: 'pengungkapan', label: 'Pengungkapan & Sumber',   icon: 'doc',    badge: discOk + '/' + disc.length, bad: discOk < disc.filter(d => !d.na).length },
  ];

  return (
    <>
      <SubBar moduleId="psak72" right={
        <div className="row gap8 ac">
          <Badge kind="green">PSAK 72 · IFRS 15</Badge>
          <div className="seg" style={{ width: 'fit-content' }}>
            <button className={unit === 'jutaan' ? 'on' : ''} onClick={() => setUnit('jutaan')}>Jutaan</button>
            <button className={unit === 'penuh' ? 'on' : ''} onClick={() => setUnit('penuh')}>Penuh</button>
          </div>
          <Btn sm onClick={() => nav('risk', { from: 'psak72' })}><I.flag size={13} /> R-01 · Risiko</Btn>
          <Btn sm onClick={() => nav('sa240', { from: 'psak72' })}><I.shield size={13} /> SA 240</Btn>
          <Btn sm onClick={() => nav('psak71', { from: 'psak72' })}><I.coins size={13} /> PSAK 71</Btn>
          <Btn sm onClick={() => nav('fsgen', { from: 'psak72' })}><I.report size={13} /> FS Generator</Btn>
          <Btn sm onClick={() => nav('wtb', { from: 'psak72' })}><I.ledger size={13} /> Buku Besar</Btn>
          <Btn sm><I.download size={13} /> Kertas Kerja R</Btn>
        </div>
      } />
      <div className="view-scroll">
        <div className="view-pad" style={{ display: 'grid', gap: 12 }}>

          {/* summary */}
          <div className="grid" style={{ gridTemplateColumns: 'repeat(5,1fr)', gap: 10 }}>
            <RevCard value={fmt(rev.revAudited / 1e3, 1)} unit="M" label="Pendapatan neto — audited" sub="¶113 · WTB 4-1100 + AJE-03" accent="var(--navy)" />
            <RevCard value={(rev.growthAudited >= 0 ? '+' : '−') + fmt(Math.abs(rev.growthAudited) * 100, 1) + '%'} label="Pertumbuhan YoY (audited)" sub={'vs Rp ' + fmt(rev.revPY / 1e3, 1) + ' M (2024)'} accent="var(--blue)" />
            <RevCard value={fmt(pointPct * 100, 0) + '%'} label="Diakui titik waktu" sub={'sisanya ' + fmt((1 - pointPct) * 100, 0) + '% sepanjang waktu'} accent="var(--purple)" />
            <RevCard value={fmt(rev.cutoffRev, 0)} unit="jt" label="Koreksi cut-off (AJE-03)" sub={rev.cutoffPosted ? 'telah di-posting' : 'usulan — pengakuan dini'} accent={rev.cutoffPosted ? 'var(--green)' : 'var(--amber)'} />
            <RevCard value={tiePass + '/' + tieRows.length} label="Tie-out lintas-laporan" sub={tiePass === tieRows.length ? 'seluruh rekonsiliasi menutup' : 'perlu ditelusuri'} accent={tiePass === tieRows.length ? 'var(--green)' : 'var(--amber)'} />
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
              <div className="grid" style={{ gap: 12 }}>{bridgePanel}{disaggPanel}</div>
              {tieoutPanel}
            </div>
          )}

          {/* ============ TAB: MODEL 5 LANGKAH ============ */}
          {tab === 'model5' && <P72_FiveStep rev={rev} sc={sc} fmt={fmt} />}

          {/* ============ TAB: SALDO KONTRAK ============ */}
          {tab === 'saldokontrak' && (
            <div className="grid" style={{ gap: 12 }}>
              <P72_ContractBal rev={rev} sc={sc} nav={nav} />
              <P72_SspTable rev={rev} sc={sc} fmt={fmt} />
            </div>
          )}

          {/* ============ TAB: CUT-OFF & PENGAKUAN ============ */}
          {tab === 'cutoff' && (
            <div className="grid" style={{ gap: 12 }}>
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }}>{fraudPanel}{procPanel}</div>
              {asersiPanel}
            </div>
          )}

          {/* ============ TAB: PENGUNGKAPAN & SUMBER ============ */}
          {tab === 'pengungkapan' && (
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }}>{disclosurePanel}{lineagePanel}</div>
          )}

          <div className="tiny muted" style={{ padding: '0 2px 4px', lineHeight: 1.5 }}>
            Kertas kerja pendapatan <b>{client.name}</b> ({eng.id} · {eng.fy}) disusun sesuai PSAK 72 dan ditarik penuh dari Working Trial Balance (4-1100 & 1-1200) melalui mesin kanonik yang sama dipakai FS Generator (CALK 15), PSAK 71 (kolektibilitas/ECL), & tab Rekonsiliasi Angka. {rev.aje03 ? <>Koreksi <b>{rev.aje03.id}</b> ({rev.aje03.desc}) berstatus {rev.aje03.status} membalik pengakuan dini sebesar Rp {fmt(rev.cutoffRev)} jt.</> : null} Status & pilihan tersimpan otomatis untuk jejak audit.
          </div>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { PSAK72View });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { PSAK72View };
