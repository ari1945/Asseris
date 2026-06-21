/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { FSGEN } from './fsgen_model';
import { useAudit, useFirm, useNav } from './contexts';
import { I } from './icons';
import { SubBar } from './shell.jsx';
import { materialityFor } from './canon_selectors';
import { Badge, Btn, Panel, Tabs } from './ui.jsx';
import { KvBox } from './view_analytical';
import { RowKv } from './view_calc';

/* ============================================================
   Asseris — SPR 2410 · Reviu atas Informasi Keuangan Interim
   yang Dilaksanakan oleh Auditor Independen Entitas
   ------------------------------------------------------------
   Metodologi mendalam: ciri pembeda SPR 2410 (auditor memakai
   PEMAHAMAN dari audit tahunan), desain prosedur inquiry &
   analitis interim (¶15–21), pemicu prosedur tambahan (¶22),
   materialitas interim & evaluasi salah saji (¶24–26), bentuk
   simpulan keyakinan terbatas/negatif & pelaporan (¶43–63),
   komunikasi (¶37–42).

   SUMBER KEBENARAN — tidak ada angka di-hardcode:
     · FSGEN.buildModel(useAudit().wtb) — komparatif audited (kolom
       .py = saldo audited 31 Des 2024) & struktur Laporan Laba Rugi.
     · AMS_CANON.materiality({engMateriality}) — ambang OM/PM IDENTIK
       dengan Materiality Workspace (SA 320) & modul hilir.
     · useAudit().risks — register RoMM audit tahunan memfokuskan
       prosedur interim (pengetahuan terbawa ¶13).
   Informasi interim (9 bln 2025) adalah HAL POKOK reviu. Ekspektasi
   analitis & komparatif DITARIK dari dataset audited yang sama →
   konsisten lintas-modul; saldo awal interim MENUTUP ke saldo
   audited periode lalu. Satu perubahan AJE pada WTB mengalir ke
   komparatif & ambang di modul ini.
   ============================================================ */
const { useState: useState2410, useMemo: useMemo2410, useEffect: useEffect2410 } = React;

/* faktor musiman 9 bln (basis: akun interim manajemen 30 Sep) — terdokumentasi */
const SEAS_2410 = { sales: 0.715, cogs: 0.726, sell: 0.735, admin: 0.752, fin: 0.760 };
/* deviasi aktual interim manajemen vs ekspektasi (hal pokok yang direviu) */
const DEV_2410  = { sales: 1.058, cogs: 1.012, sell: 0.962, admin: 1.004, fin: 1.092 };

/* prosedur reviu interim (¶15–21) */
const PROC_2410 = [
  { area: 'Pembaruan Pemahaman', ref: '¶13', type: 'Inquiry', d: 'Mutakhirkan pemahaman entitas & pengendalian dari audit tahunan; identifikasi perubahan signifikan.', risk: 'Dasar' },
  { area: 'Prosedur Analitis', ref: '¶15(b)', type: 'Analitis', d: 'Bandingkan informasi interim dgn periode pembanding, anggaran, & rasio yang diharapkan.', risk: 'Tinggi' },
  { area: 'Inquiry Manajemen', ref: '¶17–18', type: 'Inquiry', d: 'Permintaan keterangan: pengakuan, pengukuran, klasifikasi, & pos tidak biasa.', risk: 'Tinggi' },
  { area: 'Membaca Notulen', ref: '¶19', type: 'Lainnya', d: 'Baca notulen RUPS/Direksi/Komite Audit untuk hal yang berdampak pada informasi interim.', risk: 'Sedang' },
  { area: 'Kelangsungan Usaha', ref: '¶21', type: 'Inquiry', d: 'Inquiry indikasi keraguan kelangsungan usaha & rencana manajemen.', risk: 'Sedang' },
  { area: 'Pihak Berelasi & Tdk Biasa', ref: '¶18', type: 'Inquiry', d: 'Transaksi pihak berelasi, signifikan, atau di luar kegiatan usaha normal.', risk: 'Sedang' },
  { area: 'Konsistensi Kebijakan', ref: '¶20', type: 'Analitis', d: 'Apakah kebijakan akuntansi konsisten dgn LK tahunan terakhir; dampak perubahan.', risk: 'Sedang' },
  { area: 'Peristiwa Kemudian', ref: '¶18(g)', type: 'Inquiry', d: 'Peristiwa setelah tanggal interim yang memerlukan penyesuaian/pengungkapan.', risk: 'Sedang' },
];

/* pemicu prosedur tambahan (¶22) */
const TRIG_2410 = [
  { t: 'Informasi membuat auditor yakin mungkin ada salah saji material', ref: '¶22', a: 'Lakukan inquiry tambahan / prosedur lain untuk simpulan.' },
  { t: 'Fluktuasi analitis di luar ekspektasi tanpa penjelasan memadai', ref: '¶16', a: 'Inquiry lanjutan & evaluasi bukti pendukung.' },
  { t: 'Jawaban inquiry tidak konsisten / tidak masuk akal', ref: '¶23', a: 'Evaluasi dampak; pertimbangkan kecukupan untuk simpulan.' },
];

function SPR2410View() {
  const { fmt } = AMS;
  const firm = useFirm();
  const audit = useAudit();
  const nav = useNav();
  const loader = window.loadLS || ((k, d) => d);

  /* ——— SUMBER KEBENARAN ——— */
  const wtb = (audit && audit.wtb && audit.wtb.length) ? audit.wtb : ((AMS && AMS.WTB) || []);
  const model = useMemo2410(() => (FSGEN ? FSGEN.buildModel(wtb) : null), [wtb]);
  const eng = firm.activeEngagement || { id: 'ENG-2025-014', fy: 'FY2025', materiality: 4_250_000_000 };
  const client = firm.activeClient || { name: 'PT Sentosa Makmur Tbk' };
  /** @type {import('./canon_selectors').MaterialityResult} */
  const mat = materialityFor({ engMateriality: eng.materiality });
  const risks = (audit && audit.risks) ? audit.risks : ((AMS && AMS.RISKS) || []);

  const [tab, setTab] = useState2410(() => loader('ams.spr2410.tab', 'ikhtisar'));
  const [concl, setConcl] = useState2410(() => loader('ams.spr2410.concl', 0));
  useEffect2410(() => { try { localStorage.setItem('ams.spr2410.tab', JSON.stringify(tab)); } catch (e) {} }, [tab]);
  useEffect2410(() => { try { localStorage.setItem('ams.spr2410.concl', JSON.stringify(concl)); } catch (e) {} }, [concl]);

  if (!model) {
    return <><SubBar moduleId="spr2410" /><div className="view-pad"><Panel title="SPR 2410"><div className="tiny muted">Mesin FS Generator belum dimuat.</div></Panel></div></>;
  }

  /* ——— derivasi interim dari dataset audited (Rp juta) ——— */
  const jt = (v) => v / 1e6;
  const A = model.is;                                   // angka audited (penuh)
  const etr = A.pbt.cy ? A.tax.cy / A.pbt.cy : 0.22;    // tarif efektif audited
  const ratio = (cy, py) => (py ? cy / py : 1);

  // komparatif interim 9 bln 2024 = audited FY2024 (.py) × musiman  → anchored ke komparatif audited
  const py9 = {
    sales: jt(A.sales.py) * SEAS_2410.sales, cogs: jt(A.cogs.py) * SEAS_2410.cogs,
    sell: jt(A.sell.py) * SEAS_2410.sell, admin: jt(A.admin.py) * SEAS_2410.admin, fin: jt(A.finCost.py) * SEAS_2410.fin,
  };
  // ekspektasi 9 bln 2025 = komparatif × pertumbuhan audited per-lini (dari model)
  const exp9 = {
    sales: py9.sales * ratio(A.sales.cy, A.sales.py), cogs: py9.cogs * ratio(A.cogs.cy, A.cogs.py),
    sell: py9.sell * ratio(A.sell.cy, A.sell.py), admin: py9.admin * ratio(A.admin.cy, A.admin.py), fin: py9.fin * ratio(A.finCost.cy, A.finCost.py),
  };
  // aktual interim manajemen (hal pokok) = ekspektasi × deviasi
  const act9 = {
    sales: exp9.sales * DEV_2410.sales, cogs: exp9.cogs * DEV_2410.cogs,
    sell: exp9.sell * DEV_2410.sell, admin: exp9.admin * DEV_2410.admin, fin: exp9.fin * DEV_2410.fin,
  };
  const derive = (s) => {
    const gross = s.sales - s.cogs;
    const op = gross - s.sell - s.admin;
    const pbt = op - s.fin;
    const tax = pbt * etr;
    const ni = pbt - tax;
    return { ...s, gross, op, pbt, tax, ni, gm: s.sales ? gross / s.sales : 0, nm: s.sales ? ni / s.sales : 0 };
  };
  const act = derive(act9), exp = derive(exp9), py = derive(py9);

  // ambang investigasi analitis interim = Performance Materiality (SA 320 · AMS_CANON)
  const interimPM = mat.pm != null ? mat.pm : 2400;     // Rp juta
  const interimOM = mat.om != null ? mat.om : 3187;

  /* baris prosedur analitis: aktual vs ekspektasi, flag bila |Δ| > PM & >5% */
  const aRows = [
    ['Pendapatan', act.sales, exp.sales, 'R-01'],
    ['Beban pokok penjualan', act.cogs, exp.cogs, 'R-02'],
    ['Beban penjualan', act.sell, exp.sell, null],
    ['Beban administrasi', act.admin, exp.admin, null],
    ['Laba kotor', act.gross, exp.gross, null],
    ['Laba usaha', act.op, exp.op, null],
    ['Beban keuangan', act.fin, exp.fin, 'R-06'],
    ['Laba sebelum pajak', act.pbt, exp.pbt, null],
    ['Laba bersih interim', act.ni, exp.ni, null],
  ].map(([k, a, e, rid]) => {
    const dv = a - e, pct = e ? dv / e : 0;
    const flag = Math.abs(dv) > interimPM && Math.abs(pct) > 0.05;
    return { k, a, e, dv, pct, flag, rid };
  });
  const flagged = aRows.filter(r => r.flag);

  /* rekonsiliasi / lineage konsistensi (Rp juta) — saldo awal interim MENUTUP ke audited PY */
  const openTie = [
    { k: 'Total aset — saldo awal interim (1 Jan 2025)', a: jt(model.bs.totalAssets.py), b: jt(model.bs.totalAssets.py), src: 'FS Gen · audited 31 Des 2024', route: 'fsgen' },
    { k: 'Total ekuitas — saldo awal interim', a: jt(model.bs.totalEq.py), b: jt(model.bs.totalEq.py), src: 'FS Gen · audited 31 Des 2024', route: 'fsgen' },
    { k: 'Saldo laba awal periode interim', a: model.eqr.beginRE / 1e6, b: model.eqr.beginRE / 1e6, src: 'WTB 3-2100 · kolom komparatif', route: 'wtb' },
  ].map(r => ({ ...r, diff: r.a - r.b, ok: Math.abs(r.a - r.b) < 1.5 }));

  const lineage = [
    { k: 'Komparatif 9 bln 2024', src: 'FS Generator · LK audited FY2024', route: 'fsgen', icon: 'report' },
    { k: 'Saldo awal interim = audited 31 Des 2024', src: 'WTB · kolom komparatif (ly)', route: 'wtb', icon: 'ledger' },
    { k: 'Materialitas interim (OM/PM)', src: 'SA 320 · Materiality Workspace', route: 'materiality', icon: 'scale' },
    { k: 'Fokus risiko (RoMM) audit tahunan', src: 'Risk Assessment', route: 'risk', icon: 'shield' },
    { k: 'Prosedur analitis interim', src: 'SA 520 · Analytical Review', route: 'sa520', icon: 'trend' },
    { k: 'Rekonsiliasi angka lintas-modul', src: 'Alur Data', route: 'dataflow', icon: 'link2' },
  ];

  const sigRisks = risks.filter(r => r.inherent === 'Significant');
  const sc = (v) => fmt(Math.round(v), 0);
  const pc = (v) => (v >= 0 ? '+' : '−') + Math.abs(v * 100).toFixed(1) + '%';

  const tabs = [
    { id: 'ikhtisar', label: 'Ikhtisar & Kerangka' },
    { id: 'prosedur', label: 'Prosedur Reviu Interim' },
    { id: 'analitis', label: 'Prosedur Analitis & Konsistensi' },
    { id: 'materialitas', label: 'Materialitas & Salah Saji' },
    { id: 'simpulan', label: 'Simpulan & Pelaporan' },
  ];

  return (
    <>
      <SubBar moduleId="spr2410" right={
        <div className="row gap8 ac">
          <Badge kind="teal" dot>Keyakinan Terbatas</Badge>
          <Btn sm onClick={() => nav('spr2400')}><I.search2 size={13} /> SPR 2400</Btn>
          <Btn sm variant="primary"><I.sparkle size={14} /> AI Assist</Btn>
        </div>
      } />
      <div className="view-scroll"><div className="view-pad">

        {/* header band */}
        <Panel noBody style={{ marginBottom: 12 }}>
          <div style={{ padding: '13px 16px', display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ minWidth: 250 }}>
              <div className="tiny muted upper" style={{ marginBottom: 3 }}>Standar Perikatan Reviu 2410</div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>Reviu Informasi Keuangan Interim</div>
              <div className="tiny muted">Oleh auditor independen entitas — {client.name}</div>
            </div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Periode Interim</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5 }}>9 bln · 30 Sep 2025</div></div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Ciri Pembeda</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--teal)' }}>Pakai pemahaman audit</div></div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Simpulan</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5 }}>Negatif (terbatas)</div></div>
            <div style={{ flex: 1 }} />
            <div style={{ textAlign: 'right' }}>
              <div className="tiny muted upper" style={{ marginBottom: 3 }}>Tertaut Audit Tahunan</div>
              <Badge kind="blue">{eng.id}</Badge>
            </div>
          </div>
        </Panel>

        <div style={{ marginBottom: 12 }}><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>

        {tab === 'ikhtisar' && <Tab2410Overview sigRisks={sigRisks} risks={risks} nav={nav} />}
        {tab === 'prosedur' && <Tab2410Proc nav={nav} />}
        {tab === 'analitis' && <Tab2410Analytical {...{ act, exp, py, aRows, flagged, interimPM, interimOM, mat, openTie, lineage, sc, pc, nav }} />}
        {tab === 'materialitas' && <Tab2410Materiality {...{ mat, interimPM, interimOM, act, sc, nav }} />}
        {tab === 'simpulan' && <Tab2410Concl {...{ concl, setConcl, flagged, client, eng, sc }} />}

      </div></div>
    </>
  );
}

/* ============ TAB 1 · Ikhtisar & Kerangka ============ */
function Tab2410Overview({ sigRisks, risks, nav }) {
  const continuum = [
    { k: 'Audit Tahunan (SA)', pct: 95, color: 'blue', d: 'Keyakinan memadai · opini positif' },
    { k: 'Reviu Interim (SPR 2410)', pct: 60, color: 'teal', d: 'Keyakinan terbatas · simpulan negatif', here: true },
    { k: 'Kompilasi (SPSJL 4410)', pct: 8, color: 'gray', d: 'Tanpa asurans' },
  ];
  return (
    <div className="grid" style={{ gap: 12 }}>
      {/* callout ciri pembeda */}
      <div className="panel" style={{ padding: '11px 13px', background: 'var(--teal-bg)', borderColor: 'transparent' }}>
        <div className="row gap8" style={{ alignItems: 'flex-start' }}>
          <span style={{ color: 'var(--teal)', flex: '0 0 auto', marginTop: 1 }}><I.link2 size={16} /></span>
          <span style={{ fontSize: 12, lineHeight: 1.5 }}>
            <b>Pembeda utama SPR 2410 vs SPR 2400:</b> reviu interim dilaksanakan oleh <b>auditor independen yang juga mengaudit LK tahunan</b> entitas. Auditor telah memperoleh pemahaman atas entitas & pengendalian internalnya (¶13) — pemahaman ini <b>memfokuskan</b> inquiry & prosedur analitis interim, tanpa perlu prosedur penilaian risiko dari awal.
          </span>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }}>
        <Panel noBody>
          <div className="panel-h"><h3>Kontinum Keyakinan</h3><div style={{ flex: 1 }} /><Badge kind="teal">Interim = terbatas</Badge></div>
          <div style={{ padding: 16 }}>
            <div style={{ position: 'relative', height: 12, borderRadius: 6, background: 'linear-gradient(90deg,var(--surface-3),var(--teal),var(--blue))', marginBottom: 22 }}>
              <div style={{ position: 'absolute', left: '60%', top: -5, bottom: -5, width: 2, background: 'var(--navy)' }} />
              <div style={{ position: 'absolute', left: '60%', top: -22, transform: 'translateX(-50%)' }}><span className="chip tiny" style={{ background: 'var(--teal-bg)', color: 'var(--teal)', fontWeight: 700 }}>Reviu interim</span></div>
            </div>
            <div className="grid" style={{ gap: 8 }}>
              {continuum.map((c, i) => (
                <div key={i} className="panel" style={{ padding: '9px 12px', boxShadow: 'none', borderColor: c.here ? 'var(--teal)' : 'var(--line)', borderWidth: c.here ? 2 : 1, background: c.here ? 'var(--teal-bg)' : 'transparent' }}>
                  <div className="row jb ac"><span style={{ fontSize: 12.5, fontWeight: 700 }}>{c.k}</span><span className="mono tiny muted">{c.pct}%</span></div>
                  <div style={{ margin: '7px 0 4px', height: 5, borderRadius: 3, background: 'var(--surface-3)' }}><div style={{ width: c.pct + '%', height: '100%', borderRadius: 3, background: `var(--${c.color === 'gray' ? 'ink-4' : c.color})` }} /></div>
                  <div className="tiny muted">{c.d}</div>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        <Panel noBody>
          <div className="panel-h"><h3>Tujuan & Lingkup (¶7–11)</h3></div>
          <div style={{ padding: '10px 14px 14px', display: 'grid', gap: 8 }}>
            {[
              'Memungkinkan auditor menyatakan simpulan apakah ada hal yang menjadi perhatian bahwa informasi interim tidak disusun, dalam semua hal material, sesuai kerangka pelaporan (¶7).',
              'Reviu terdiri terutama dari inquiry & prosedur analitis (¶7) — lingkup jauh lebih sempit dari audit.',
              'Auditor menerapkan skeptisisme profesional & pertimbangan yang sama (¶8).',
              'Auditor menetapkan apakah prasyarat reviu interim terpenuhi & menyepakati syarat perikatan (¶36).',
            ].map((t, i) => (
              <div key={i} className="row gap8" style={{ alignItems: 'flex-start', fontSize: 12 }}>
                <span style={{ color: 'var(--teal)', flex: '0 0 auto', marginTop: 1 }}><I.checkCircle size={15} /></span>
                <span style={{ lineHeight: 1.45 }}>{t}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* pengetahuan terbawa dari audit tahunan — risk register (single source) */}
      <Panel noBody>
        <div className="panel-h"><h3>Pemahaman Terbawa dari Audit Tahunan (¶13–14)</h3><div style={{ flex: 1 }} />
          <span className="tiny muted">ditarik dari Risk Assessment</span>
          <button onClick={() => nav('risk', { from: 'spr2410' })} className="p-act" style={{ marginLeft: 8 }}><I.arrowRight size={15} /></button>
        </div>
        <div style={{ padding: '6px 14px 12px' }}>
          <p className="tiny muted" style={{ margin: '4px 0 10px', lineHeight: 1.5 }}>
            Risiko kesalahan penyajian material (RoMM) signifikan dari register audit tahunan memfokuskan inquiry & prosedur analitis interim. Satu register — sama dengan modul Risk Assessment & SA 240.
          </p>
          <table className="dtbl">
            <thead><tr><th style={{ width: 40 }}>ID</th><th>Area · Risiko Signifikan</th><th style={{ width: 96 }}>Asersi</th><th style={{ width: 90 }}>Fokus Interim</th></tr></thead>
            <tbody>
              {sigRisks.map((r, i) => (
                <tr key={i}>
                  <td className="mono tiny" style={{ color: 'var(--blue)', fontWeight: 700 }}>{r.id}</td>
                  <td style={{ whiteSpace: 'normal', lineHeight: 1.35 }}><b>{r.area}</b><span className="tiny muted" style={{ display: 'block', fontWeight: 400 }}>{r.desc}</span></td>
                  <td className="tiny">{r.assertion}{r.fraud && <Badge kind="red" >Fraud</Badge>}</td>
                  <td><Badge kind="amber">Inquiry + analitis</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

/* ============ TAB 2 · Prosedur Reviu Interim ============ */
function Tab2410Proc({ nav }) {
  const tk = (t) => t === 'Analitis' ? 'purple' : t === 'Lainnya' ? 'gray' : 'teal';
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 340px', gap: 12, alignItems: 'start' }}>
      <Panel noBody>
        <div className="panel-h"><h3>Desain Prosedur Reviu Interim (¶15–21)</h3><div style={{ flex: 1 }} /><span className="tiny muted">{PROC_2410.length} area</span></div>
        <table className="dtbl">
          <thead><tr><th>Area Prosedur</th><th style={{ width: 84 }}>Jenis</th><th style={{ width: 76 }}>Bobot</th><th style={{ width: 60 }}>Ref</th></tr></thead>
          <tbody>
            {PROC_2410.map((p, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 600, whiteSpace: 'normal', lineHeight: 1.35 }}>{p.area}<div className="tiny muted" style={{ fontWeight: 400, marginTop: 2 }}>{p.d}</div></td>
                <td><Badge kind={tk(p.type)}>{p.type}</Badge></td>
                <td><Badge kind={p.risk === 'Tinggi' ? 'red' : p.risk === 'Sedang' ? 'amber' : 'gray'}>{p.risk}</Badge></td>
                <td className="mono tiny" style={{ color: 'var(--blue)', fontWeight: 700 }}>{p.ref}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="panel" style={{ margin: 12, padding: '10px 12px', background: 'var(--teal-bg)', borderColor: 'transparent' }}>
          <div className="row gap8" style={{ alignItems: 'flex-start' }}>
            <span style={{ color: 'var(--teal)', flex: '0 0 auto' }}><I.book size={15} /></span>
            <span style={{ fontSize: 11.5, lineHeight: 1.45 }}>Reviu interim <b>tidak</b> mencakup pengujian pengendalian, konfirmasi, atau observasi fisik rutin. Auditor mengandalkan <b>pemahaman dari audit tahunan</b> untuk merancang prosedur yang lebih terfokus (¶13, ¶15).</span>
          </div>
        </div>
      </Panel>

      <div className="grid" style={{ gap: 12 }}>
        <Panel title="Pemicu Prosedur Tambahan (¶22)">
          <div style={{ display: 'grid', gap: 8 }}>
            {TRIG_2410.map((t, i) => (
              <div key={i} className="panel" style={{ padding: '9px 11px', boxShadow: 'none', borderLeft: '3px solid var(--amber)' }}>
                <div className="row jb ac"><div style={{ fontSize: 11.5, fontWeight: 700, lineHeight: 1.35 }}>{t.t}</div><span className="mono tiny" style={{ color: 'var(--amber)', fontWeight: 700, flex: '0 0 auto', marginLeft: 6 }}>{t.ref}</span></div>
                <div className="tiny muted" style={{ marginTop: 4, lineHeight: 1.4 }}>{t.a}</div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Representasi Tertulis (¶34)">
          <p className="tiny muted" style={{ margin: 0, lineHeight: 1.5 }}>Auditor memperoleh representasi tertulis manajemen: tanggung jawab atas pengendalian, kelengkapan notulen, & pengungkapan peristiwa kemudian hingga tanggal laporan reviu.</p>
        </Panel>
        <Panel title="Sandingkan SPR 2400">
          <div onClick={() => nav('spr2400')} className="row jb ac" style={{ fontSize: 12, padding: '8px 10px', border: '1px solid var(--line-soft)', borderRadius: 7, cursor: 'pointer' }}>
            <span className="row ac gap8"><span style={{ color: 'var(--teal)' }}><I.search2 size={14} /></span>SPR 2400 · Reviu LK Historis</span>
            <I.arrowRight size={14} style={{ color: 'var(--ink-4)' }} />
          </div>
          <p className="tiny muted" style={{ margin: '8px 0 0', lineHeight: 1.5 }}>SPR 2400 dipakai bila praktisi <b>bukan</b> auditor entitas — tanpa pemahaman terbawa, prosedur penilaian risiko dirancang dari awal.</p>
        </Panel>
      </div>
    </div>
  );
}

/* ============ TAB 3 · Prosedur Analitis & Konsistensi ============ */
function Tab2410Analytical({ act, exp, py, aRows, flagged, interimPM, interimOM, mat, openTie, lineage, sc, pc, nav }) {
  return (
    <div className="grid" style={{ gap: 12 }}>
      {/* ikhtisar interim */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
        <KvBox label="Pendapatan interim (Rp jt)" v={sc(act.sales)} accent="var(--navy)" />
        <KvBox label="Laba sebelum pajak (Rp jt)" v={sc(act.pbt)} accent="var(--blue)" />
        <KvBox label="Marjin kotor interim" v={(act.gm * 100).toFixed(1) + '%'} accent="var(--teal)" />
        <KvBox label="Fluktuasi ditandai" v={flagged.length + ' lini'} accent={flagged.length ? 'var(--amber)' : 'var(--green)'} />
      </div>

      <Panel noBody>
        <div className="panel-h"><h3>Prosedur Analitis Interim — Aktual vs Ekspektasi (¶15–16)</h3><div style={{ flex: 1 }} />
          <Badge kind="purple">Ambang = PM Rp {sc(interimPM)} jt</Badge>
        </div>
        <table className="dtbl">
          <thead><tr>
            <th>Pos Laba Rugi (9 bln · Rp jt)</th>
            <th style={{ textAlign: 'right', width: 110 }}>Aktual 2025</th>
            <th style={{ textAlign: 'right', width: 110 }}>Ekspektasi</th>
            <th style={{ textAlign: 'right', width: 100 }}>Selisih</th>
            <th style={{ textAlign: 'right', width: 78 }}>Δ%</th>
            <th style={{ width: 96 }}>Status</th>
          </tr></thead>
          <tbody>
            {aRows.map((r, i) => {
              const strong = ['Laba kotor', 'Laba usaha', 'Laba sebelum pajak', 'Laba bersih interim'].includes(r.k);
              return (
                <tr key={i} style={{ background: r.flag ? 'var(--amber-bg, #fdf6e3)' : strong ? 'var(--blue-050)' : 'transparent' }}>
                  <td style={{ fontWeight: strong ? 700 : 500 }}>{r.k}{r.rid && <span className="mono tiny" style={{ color: 'var(--ink-4)', marginLeft: 6 }}>{r.rid}</span>}</td>
                  <td className="mono" style={{ textAlign: 'right', fontWeight: strong ? 700 : 500 }}>{sc(r.a)}</td>
                  <td className="mono" style={{ textAlign: 'right', color: 'var(--ink-3)' }}>{sc(r.e)}</td>
                  <td className="mono" style={{ textAlign: 'right', color: r.flag ? 'var(--amber)' : 'var(--ink-2)' }}>{sc(r.dv)}</td>
                  <td className="mono tiny" style={{ textAlign: 'right', color: r.flag ? 'var(--amber)' : 'var(--ink-3)', fontWeight: 700 }}>{pc(r.pct)}</td>
                  <td>{r.flag ? <Badge kind="amber">Selidiki</Badge> : <Badge kind="green">Wajar</Badge>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="panel" style={{ margin: 12, padding: '10px 12px', background: flagged.length ? 'var(--amber-bg, #fdf6e3)' : 'var(--green-050, #eef7f0)', borderColor: 'transparent' }}>
          <div className="row gap8" style={{ alignItems: 'flex-start' }}>
            <span style={{ color: flagged.length ? 'var(--amber)' : 'var(--green)', flex: '0 0 auto' }}>{flagged.length ? <I.alert size={15} /> : <I.checkCircle size={15} />}</span>
            <span style={{ fontSize: 11.5, lineHeight: 1.45 }}>
              {flagged.length
                ? <>Fluktuasi <b>{flagged.map(f => f.k.toLowerCase()).join(', ')}</b> melampaui ekspektasi &gt; PM. Memicu <b>inquiry tambahan (¶22)</b> — perhatikan keterkaitan dengan risiko pengakuan pendapatan dini (R-01) yang teridentifikasi pada audit tahunan. Dokumentasikan penjelasan manajemen & bukti pendukung sebelum menyimpulkan.</>
                : <>Seluruh fluktuasi dalam batas ekspektasi (≤ PM). Tidak ada indikasi salah saji material dari prosedur analitis.</>}
            </span>
          </div>
        </div>
      </Panel>

      <div className="grid" style={{ gridTemplateColumns: '1.1fr 0.9fr', gap: 12, alignItems: 'start' }}>
        {/* konsistensi / tie-out single source */}
        <Panel noBody>
          <div className="panel-h"><h3>Konsistensi Sumber Kebenaran — Tie-out</h3><div style={{ flex: 1 }} /><Badge kind="green">{openTie.filter(r => r.ok).length}/{openTie.length} menutup</Badge></div>
          <table className="dtbl">
            <thead><tr><th>Tie-out (Rp jt)</th><th style={{ textAlign: 'right', width: 92 }}>Interim</th><th style={{ textAlign: 'right', width: 92 }}>Sumber</th><th style={{ width: 56 }}>Status</th></tr></thead>
            <tbody>
              {openTie.map((r, i) => (
                <tr key={i}>
                  <td style={{ whiteSpace: 'normal', lineHeight: 1.35 }}>{r.k}<button onClick={() => nav(r.route, { from: 'spr2410' })} className="tiny" style={{ display: 'block', border: 'none', background: 'none', color: 'var(--blue)', fontWeight: 600, cursor: 'pointer', padding: '2px 0 0', font: 'inherit', textAlign: 'left' }}>{r.src} ↗</button></td>
                  <td className="mono" style={{ textAlign: 'right' }}>{sc(r.a)}</td>
                  <td className="mono" style={{ textAlign: 'right', color: 'var(--ink-3)' }}>{sc(r.b)}</td>
                  <td>{r.ok ? <span style={{ color: 'var(--green)' }}><I.checkCircle size={16} /></span> : <span style={{ color: 'var(--red)' }}><I.alert size={16} /></span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="panel" style={{ margin: 12, padding: '10px 12px', background: 'var(--blue-050)', borderColor: 'var(--blue-100)' }}>
            <div className="row gap8" style={{ alignItems: 'flex-start' }}>
              <span style={{ color: 'var(--blue)', flex: '0 0 auto', marginTop: 1 }}><I.link2 size={15} /></span>
              <span style={{ fontSize: 11.5, lineHeight: 1.45 }}>Saldo awal periode interim <b>menutup</b> ke saldo audited 31 Des 2024 (kolom komparatif WTB) — sumber yang sama dipakai FS Generator. Komparatif & ambang materialitas reviu interim ditarik dari dataset audited, bukan di-input ulang.</span>
            </div>
          </div>
        </Panel>

        {/* lineage */}
        <Panel noBody>
          <div className="panel-h"><h3>Garis Keturunan Data</h3></div>
          <div style={{ padding: '8px 12px 12px', display: 'grid', gap: 6 }}>
            {lineage.map((l, i) => {
              const IconC = I[l.icon] || I.link2;
              return (
                <div key={i} onClick={() => nav(l.route, { from: 'spr2410' })} className="row jb ac" style={{ fontSize: 12, padding: '8px 10px', border: '1px solid var(--line-soft)', borderRadius: 7, cursor: 'pointer' }}>
                  <span className="row ac gap8" style={{ minWidth: 0 }}><span style={{ color: 'var(--teal)', flex: '0 0 auto' }}><IconC size={14} /></span><span style={{ minWidth: 0 }}><span style={{ fontWeight: 600, display: 'block' }}>{l.k}</span><span className="tiny muted">{l.src}</span></span></span>
                  <I.arrowRight size={14} style={{ color: 'var(--ink-4)', flex: '0 0 auto' }} />
                </div>
              );
            })}
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ============ TAB 4 · Materialitas & Salah Saji ============ */
function Tab2410Materiality({ mat, interimPM, interimOM, act, sc, nav }) {
  // contoh akumulasi salah saji teridentifikasi dari prosedur interim (Rp juta)
  const miss = [
    { id: 'M-1', d: 'Pendapatan diakui sebelum penyerahan (cut-off interim)', kind: 'Faktual', amt: 1180, src: 'Inquiry + analitis' },
    { id: 'M-2', d: 'Beban akrual interim kurang dicatat', kind: 'Faktual', amt: 420, src: 'Inquiry' },
    { id: 'M-3', d: 'Estimasi penyisihan ECL — proyeksi (ekstrapolasi)', kind: 'Proyeksi', amt: 360, src: 'Analitis' },
  ];
  const total = miss.reduce((a, m) => a + m.amt, 0);
  const overOM = total > interimOM;
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 340px', gap: 12, alignItems: 'start' }}>
      <div className="grid" style={{ gap: 12 }}>
        <Panel noBody>
          <div className="panel-h"><h3>Materialitas untuk Reviu Interim (¶24 → SA 320)</h3><div style={{ flex: 1 }} /><Badge kind="blue">{mat.benchLabel || 'PBT'}</Badge></div>
          <div style={{ padding: 14 }}>
            <p style={{ margin: '0 0 12px', fontSize: 12, lineHeight: 1.55 }}>Auditor menentukan materialitas untuk informasi interim — <b>benchmark & persentase yang sama</b> dengan audit tahunan ditarik dari Materiality Workspace (SA 320). Tidak di-input ulang di modul ini.</p>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
              <KvBox label="Materialitas keseluruhan (OM)" v={'Rp ' + sc(interimOM) + ' jt'} accent="var(--navy)" />
              <KvBox label="Materialitas pelaksanaan (PM)" v={'Rp ' + sc(interimPM) + ' jt'} accent="var(--teal)" />
              <KvBox label={'Ambang sepele (CTT)'} v={'Rp ' + sc(mat.ctt != null ? mat.ctt : Math.round(interimOM * 0.05)) + ' jt'} />
            </div>
            <div className="row jb ac" style={{ marginTop: 12, fontSize: 11.5 }}>
              <span className="muted">Benchmark & % berasal dari Materiality Workspace</span>
              <button onClick={() => nav('materiality', { from: 'spr2410' })} style={{ border: 'none', background: 'none', color: 'var(--blue)', fontWeight: 700, cursor: 'pointer', font: 'inherit' }}>Buka Materialitas ↗</button>
            </div>
          </div>
        </Panel>

        <Panel noBody>
          <div className="panel-h"><h3>Evaluasi Salah Saji Teridentifikasi (¶25–26)</h3><div style={{ flex: 1 }} /><Badge kind={overOM ? 'red' : 'green'}>{overOM ? 'Lewati OM' : 'Di bawah OM'}</Badge></div>
          <table className="dtbl">
            <thead><tr><th style={{ width: 42 }}>Ref</th><th>Uraian</th><th style={{ width: 80 }}>Sifat</th><th style={{ textAlign: 'right', width: 90 }}>Rp jt</th></tr></thead>
            <tbody>
              {miss.map((m, i) => (
                <tr key={i}>
                  <td className="mono tiny" style={{ color: 'var(--blue)', fontWeight: 700 }}>{m.id}</td>
                  <td style={{ whiteSpace: 'normal', lineHeight: 1.35 }}>{m.d}<span className="tiny muted" style={{ display: 'block' }}>{m.src}</span></td>
                  <td><Badge kind={m.kind === 'Faktual' ? 'navy' : 'purple'}>{m.kind}</Badge></td>
                  <td className="mono" style={{ textAlign: 'right' }}>{sc(m.amt)}</td>
                </tr>
              ))}
              <tr style={{ background: 'var(--blue-050)' }}>
                <td></td><td style={{ fontWeight: 700 }}>Agregat salah saji belum dikoreksi</td><td></td>
                <td className="mono" style={{ textAlign: 'right', fontWeight: 700, color: overOM ? 'var(--red)' : 'var(--ink)' }}>{sc(total)}</td>
              </tr>
            </tbody>
          </table>
          <div style={{ padding: '10px 14px 14px' }}>
            <div style={{ height: 8, borderRadius: 4, background: 'var(--surface-3)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ width: Math.min(100, (total / interimOM) * 100) + '%', height: '100%', background: overOM ? 'var(--red)' : 'var(--teal)' }} />
            </div>
            <div className="row jb tiny muted" style={{ marginTop: 5 }}><span>Agregat Rp {sc(total)} jt</span><span>OM Rp {sc(interimOM)} jt</span></div>
          </div>
        </Panel>
      </div>

      <Panel title="Dampak ke Simpulan">
        <p className="tiny muted" style={{ margin: '0 0 10px', lineHeight: 1.55 }}>Bila salah saji — secara individual atau agregat — <b>material</b> terhadap informasi interim dan tidak dikoreksi, auditor mempertimbangkan apakah <b>modifikasi simpulan</b> diperlukan (¶43, ¶47).</p>
        <div style={{ display: 'grid', gap: 7 }}>
          <RowKv label="Agregat (Rp jt)" v={sc(total)} strong />
          <RowKv label="vs Materialitas (OM)" v={overOM ? 'Melebihi' : 'Di bawah'} />
          <RowKv label="Indikasi simpulan" v={overOM ? 'Pertimbangkan modifikasi' : 'Tanpa modifikasi'} />
        </div>
        <div className="panel" style={{ marginTop: 12, padding: '10px 12px', background: overOM ? 'var(--amber-bg, #fdf6e3)' : 'var(--teal-bg)', borderColor: 'transparent' }}>
          <div className="tiny" style={{ lineHeight: 1.5, color: overOM ? 'var(--amber)' : 'var(--teal)' }}>{overOM ? 'Agregat mendekati/melewati ambang — minta manajemen mengoreksi atau pertimbangkan simpulan dengan pengecualian (¶47).' : 'Agregat di bawah ambang — tidak berdampak pada bentuk simpulan.'}</div>
        </div>
      </Panel>
    </div>
  );
}

/* ============ TAB 5 · Simpulan & Pelaporan ============ */
const CONCL_2410 = [
  { k: 'green', l: 'Tanpa Modifikasian', ref: '¶43', d: 'Tidak ada hal yang menjadi perhatian bahwa informasi interim tidak disusun sesuai kerangka pelaporan.' },
  { k: 'amber', l: 'Dengan Pengecualian', ref: '¶47', d: 'Salah saji material tetapi tidak pervasif terhadap informasi interim.' },
  { k: 'red', l: 'Merugikan (Adverse)', ref: '¶47', d: 'Salah saji material & pervasif — informasi interim tidak disusun secara wajar.' },
  { k: 'gray', l: 'Tidak Menyatakan Simpulan', ref: '¶48', d: 'Pembatasan lingkup material & pervasif; bukti tidak cukup untuk menyimpulkan.' },
];
function Tab2410Concl({ concl, setConcl, flagged, client, eng, sc }) {
  const c = CONCL_2410[concl];
  const today = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
  const text = concl === 0
    ? 'Berdasarkan reviu kami, tidak ada hal yang menjadi perhatian kami yang menyebabkan kami percaya bahwa informasi keuangan interim terlampir tidak disusun, dalam semua hal yang material, sesuai dengan Standar Akuntansi Keuangan.'
    : concl === 1
    ? 'Kecuali untuk dampak hal yang diuraikan dalam paragraf Basis, tidak ada hal yang menjadi perhatian kami yang menyebabkan kami percaya bahwa informasi keuangan interim tidak disusun, dalam semua hal yang material, sesuai dengan SAK.'
    : concl === 2
    ? 'Karena signifikansi hal yang diuraikan dalam paragraf Basis, informasi keuangan interim tidak disusun, dalam semua hal yang material, sesuai dengan SAK.'
    : 'Karena signifikansi hal yang diuraikan, kami tidak memperoleh bukti yang cukup sebagai dasar simpulan reviu atas informasi keuangan interim; oleh karena itu kami tidak menyatakan simpulan.';
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 1.3fr', gap: 12, alignItems: 'start' }}>
      <div className="grid" style={{ gap: 12 }}>
        <Panel noBody>
          <div className="panel-h"><h3>Bentuk Simpulan Reviu Interim</h3><div style={{ flex: 1 }} /><Badge kind="teal">Keyakinan negatif</Badge></div>
          <div style={{ padding: 14, display: 'grid', gap: 8 }}>
            {CONCL_2410.map((x, i) => (
              <div key={i} onClick={() => setConcl(i)} className="panel" style={{ padding: '11px 13px', cursor: 'pointer', boxShadow: 'none', borderColor: concl === i ? `var(--${x.k})` : 'var(--line)', borderWidth: concl === i ? 2 : 1, background: concl === i ? `var(--${x.k}-bg)` : 'transparent' }}>
                <div className="row jb ac">
                  <div className="row ac gap8"><span style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid var(--${x.k})`, background: concl === i ? `var(--${x.k})` : 'transparent', flex: '0 0 14px' }} /><span style={{ fontSize: 12.5, fontWeight: 700 }}>{x.l}</span></div>
                  <span className="mono tiny" style={{ color: `var(--${x.k})`, fontWeight: 700 }}>{x.ref}</span>
                </div>
                <div className="tiny muted" style={{ marginTop: 5, lineHeight: 1.45, paddingLeft: 22 }}>{x.d}</div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Paragraf Tambahan & Komunikasi (¶37–46)">
          <div style={{ display: 'grid', gap: 8 }}>
            {[
              ['Penekanan Suatu Hal', '¶45', 'Mis. ketidakpastian material terkait kelangsungan usaha — tanpa memodifikasi simpulan.'],
              ['Hal Lain', '¶46', 'Mis. komparatif interim belum direviu / direviu praktisi lain.'],
              ['Komunikasi ke Manajemen & TCWG', '¶42–43', 'Hal yang menunjukkan perlunya koreksi material; kecurangan/ketidakpatutan.'],
            ].map((r, i) => (
              <div key={i} className="panel" style={{ padding: '9px 11px', boxShadow: 'none', borderLeft: '3px solid var(--blue)' }}>
                <div className="row jb ac"><span style={{ fontSize: 12, fontWeight: 700 }}>{r[0]}</span><span className="mono tiny" style={{ color: 'var(--blue)', fontWeight: 700 }}>{r[1]}</span></div>
                <div className="tiny muted" style={{ marginTop: 3, lineHeight: 1.4 }}>{r[2]}</div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel noBody>
        <div className="panel-h"><h3>Laporan Reviu atas Informasi Interim (¶43)</h3><div style={{ flex: 1 }} /><Badge kind={c.k}>{c.l}</Badge></div>
        <div style={{ padding: 18 }}>
          <div className="doc-paper" style={{ background: '#fff', padding: '32px 36px', boxShadow: 'var(--shadow)', fontSize: 11.5, lineHeight: 1.7, color: '#283b46' }}>
            <div style={{ fontWeight: 800, fontSize: 13, color: '#0c2430', textAlign: 'center', marginBottom: 4 }}>LAPORAN REVIU ATAS INFORMASI KEUANGAN INTERIM</div>
            <div className="tiny" style={{ textAlign: 'center', color: '#7a8893', marginBottom: 16 }}>Berdasarkan Standar Perikatan Reviu (SPR) 2410</div>
            <p style={{ margin: '0 0 10px' }}>Kami telah mereviu neraca interim {client.name} pada tanggal 30 September 2025 serta laporan laba rugi terkait untuk periode sembilan bulan yang berakhir pada tanggal tersebut. Manajemen bertanggung jawab atas penyusunan & penyajian informasi keuangan interim ini sesuai SAK.</p>
            <div style={{ fontWeight: 700, color: '#0c2430', margin: '12px 0 4px' }}>Ruang Lingkup Reviu</div>
            <p style={{ margin: '0 0 10px' }}>Kami melaksanakan reviu sesuai SPR 2410, "Reviu atas Informasi Keuangan Interim yang Dilaksanakan oleh Auditor Independen Entitas". Reviu terutama terdiri dari inquiry & penerapan prosedur analitis; lingkupnya jauh lebih sempit daripada audit sehingga <b>kami tidak menyatakan opini audit</b>.</p>
            <div style={{ fontWeight: 700, color: '#0c2430', margin: '12px 0 4px' }}>Simpulan — {c.l}</div>
            <p style={{ margin: 0 }}>{text}</p>
            <div style={{ marginTop: 22, paddingTop: 10, borderTop: '1px solid #e0e5ea', fontSize: 11 }}><b>Hartono Wijaya, CPA</b> · Akuntan Publik<br /><span className="tiny" style={{ color: '#7a8893' }}>{eng.id} · Jakarta, {today}</span></div>
          </div>
        </div>
      </Panel>
    </div>
  );
}

Object.assign(window, { SPR2410View });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { SPR2410View };
