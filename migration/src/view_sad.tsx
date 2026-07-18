/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { useFirm, useNav } from './contexts';
import { I } from './icons';
import { SubBar } from './shell';
import { materialityFor } from './canon_selectors';
import { Avatar, Badge, Btn, Donut, Panel, Seg, Stat, Tabs } from './ui';
import { RowKv } from './view_calc';

/* ============================================================
   Asseris — Evidence Evaluation · SAD Ledger (SA 450)
   Summary of Audit Differences — akumulasi, evaluasi agregat,
   pertimbangan kualitatif, komunikasi & disposisi.
   ============================================================ */
const { useState: useStateSD, useMemo: useMemoSD } = React;

/* effect figures in full Rupiah. pbt = efek laba sebelum pajak,
   na = efek aset neto (ekuitas). origin: tahun berjalan / lalu.
   disp: corrected | uncorrected | passed (diwaivekan) */
const SAD_SEED = [
  { id: 'M-01', desc: 'Piutang fiktif belum dibalik (channel stuffing kuartal IV)', type: 'Factual', fsli: 'Pendapatan / Piutang Usaha', assertion: 'Keterjadian', initiator: 'Tim — Dewi A.', pbt: -1_950_000_000, na: -1_950_000_000, origin: 'current', disp: 'uncorrected', aje: 'PAJE-03', qual: ['fraud', 'trend', 'covenant'] },
  { id: 'M-02', desc: 'Koreksi penyusutan mesin produksi (umur manfaat terlalu panjang)', type: 'Factual', fsli: 'BPP / Akumulasi Penyusutan', assertion: 'Akurasi', initiator: 'Tim — Bagus P.', pbt: -1_120_000_000, na: -1_120_000_000, origin: 'current', disp: 'corrected', aje: 'AJE-05', qual: [] },
  { id: 'M-03', desc: 'Proyeksi salah saji hasil sampling piutang (SA 530)', type: 'Projected', fsli: 'Piutang Usaha', assertion: 'Keberadaan', initiator: 'Tim — Dewi A.', pbt: -640_000_000, na: -640_000_000, origin: 'current', disp: 'uncorrected', aje: 'SA 530', qual: ['estimate'] },
  { id: 'M-04', desc: 'Selisih estimasi cadangan kerugian penurunan nilai (PSAK 71)', type: 'Judgmental', fsli: 'CKPN / Beban Penyisihan', assertion: 'Penilaian', initiator: 'Reviu — Mgr.', pbt: -680_000_000, na: -680_000_000, origin: 'current', disp: 'uncorrected', aje: 'PAJE-02', qual: ['estimate'] },
  { id: 'M-05', desc: 'Cut-off persediaan akhir tahun (penerimaan barang 31 Des)', type: 'Factual', fsli: 'Persediaan / BPP', assertion: 'Pisah Batas', initiator: 'Tim — Rina S.', pbt: -2_340_000_000, na: -2_340_000_000, origin: 'current', disp: 'corrected', aje: 'AJE-01', qual: [] },
  { id: 'M-06', desc: 'Akrual bonus manajemen belum dicatat', type: 'Factual', fsli: 'Beban Gaji / Akrual', assertion: 'Kelengkapan', initiator: 'Tim — Bagus P.', pbt: -980_000_000, na: -980_000_000, origin: 'current', disp: 'corrected', aje: 'AJE-04', qual: ['compensation'] },
  { id: 'M-07', desc: 'Reklasifikasi utang bank jatuh tempo ≤1 thn ke liabilitas lancar', type: 'Factual', fsli: 'Liabilitas Jk. Panjang → Lancar', assertion: 'Klasifikasi', initiator: 'Reviu — Mgr.', pbt: 0, na: 0, origin: 'current', disp: 'uncorrected', aje: 'PAJE-06', qual: ['classification', 'covenant'] },
  { id: 'M-08', desc: 'Beban dibayar di muka belum diamortisasi (carryover FY2024)', type: 'Judgmental', fsli: 'Beban Dibayar Dimuka', assertion: 'Penilaian', initiator: 'Saldo Awal', pbt: 0, na: -180_000_000, origin: 'prior', disp: 'uncorrected', aje: 'SUM-PY', qual: [] },
  { id: 'M-09', desc: 'Akrual beban listrik Desember (di bawah ambang remeh)', type: 'Factual', fsli: 'Beban Utilitas / Akrual', assertion: 'Kelengkapan', initiator: 'Tim — Rina S.', pbt: -95_000_000, na: -95_000_000, origin: 'current', disp: 'passed', aje: 'CTT', qual: [] },
];

/* SA 450.A21 — daftar pertimbangan kualitatif */
const QUAL_SEED = [
  { id: 'trend', text: 'Menutupi perubahan laba atau tren laba, khususnya terkait ekspektasi pasar', on: true, note: 'Reversal piutang fiktif M-01 menyembunyikan stagnasi pendapatan YoY (+0,4% vs klaim +9%).' },
  { id: 'losstoincome', text: 'Mengubah rugi menjadi laba (atau sebaliknya) untuk periode berjalan', on: false, note: '' },
  { id: 'covenant', text: 'Memengaruhi rasio keuangan & kepatuhan terhadap covenant pinjaman', on: true, note: 'M-01 & M-07 menekan current ratio dari 1,38× menjadi 1,19× — di bawah ambang covenant 1,20×.' },
  { id: 'segment', text: 'Berdampak pada informasi segmen yang dilaporkan', on: false, note: '' },
  { id: 'compensation', text: 'Menaikkan kompensasi/insentif manajemen (bonus berbasis laba)', on: true, note: 'Bonus M-06 telah dikoreksi; namun laba yang dipertahankan masih memengaruhi pool insentif.' },
  { id: 'regulatory', text: 'Berdampak pada kepatuhan terhadap regulasi/perjanjian kontraktual', on: false, note: '' },
  { id: 'relatedparty', text: 'Menyangkut/menyembunyikan transaksi dengan pihak berelasi', on: false, note: '' },
  { id: 'classification', text: 'Salah klasifikasi antar pos (mis. operasi vs non-operasi; lancar vs tidak lancar)', on: true, note: 'Reklas M-07 memindahkan Rp 4,1 M ke liabilitas lancar — material terhadap penyajian likuiditas.' },
  { id: 'fraud', text: 'Berkaitan dengan unsur kecurangan atau ketidakberesan yang teridentifikasi', on: true, note: 'M-01 berindikasi manipulasi pendapatan — eskalasi ke SA 240 & komunikasi TCWG wajib.' },
  { id: 'estimate', text: 'Berada pada batas rentang estimasi yang dapat diterima (bias terarah)', on: true, note: 'M-03 & M-04 konsisten menurunkan beban — pola bias manajemen ke arah laba lebih tinggi.' },
  { id: 'future', text: 'Memiliki dampak signifikan pada periode pelaporan mendatang', on: false, note: '' },
];

const DISP = {
  corrected:   { label: 'Dikoreksi',       kind: 'green' },
  uncorrected: { label: 'Tidak Dikoreksi', kind: 'amber' },
  passed:      { label: 'Diwaivekan',      kind: 'gray' },
};
const DISP_CYCLE = ['uncorrected', 'corrected', 'passed'];
const TYPE_KIND = { Factual: 'blue', Judgmental: 'purple', Projected: 'teal' };

/* ---- entity subtotals (FY2025, dilaporkan) ---- */
const FS = { pbt: 85_200_000_000, revenue: 331_900_000_000, assets: 316_558_000_000, equity: 160_456_000_000 };

function SADLedger() {
  const { fmt } = AMS;
  const nav = useNav();
  const { activeEngagement } = useFirm();
  const [items, setItems] = useStateSD(SAD_SEED);
  const [quals, setQuals] = useStateSD(QUAL_SEED);
  const [tab, setTab] = useStateSD('ledger');
  const [method, setMethod] = useStateSD('rollover');

  /* materialitas: SATU sumber dari SA 320 (Materiality Workspace) — PM%/CTT% & override
     yang sama dipakai PSAK 14 dkk., bukan lagi hardcode 75%/5%. */
  const _mat = materialityFor({ engMateriality: activeEngagement.materiality });
  const om = (_mat && _mat.omFull != null) ? _mat.omFull : activeEngagement.materiality;
  const pm = (_mat && _mat.pmFull != null) ? _mat.pmFull : Math.round(om * 0.75);
  const ctt = (_mat && _mat.cttFull != null) ? _mat.cttFull : Math.round(om * 0.05);

  const cycleDisp = (id: any) => setItems((list: any) => list.map((m: any) => m.id === id
    ? { ...m, disp: DISP_CYCLE[(DISP_CYCLE.indexOf(m.disp) + 1) % DISP_CYCLE.length] } : m));
  const toggleQual = (id: any) => setQuals((list: any) => list.map((q: any) => q.id === id ? { ...q, on: !q.on } : q));

  const calc = useMemoSD(() => {
    const uncorr = items.filter((m: any) => m.disp === 'uncorrected');
    const curUncorr = uncorr.filter((m: any) => m.origin === 'current');
    const rolloverNet = curUncorr.reduce((s: any, m: any) => s + m.pbt, 0);
    const rolloverGross = curUncorr.reduce((s: any, m: any) => s + Math.abs(m.pbt), 0);
    const ironNet = uncorr.reduce((s: any, m: any) => s + m.na, 0);          // termasuk carryover
    const ironGross = uncorr.reduce((s: any, m: any) => s + Math.abs(m.na), 0);
    return {
      uncorr, rolloverNet, rolloverGross, ironNet, ironGross,
      corrected: items.filter((m: any) => m.disp === 'corrected').length,
      passed: items.filter((m: any) => m.disp === 'passed').length,
      factual: items.filter((m: any) => m.type === 'Factual').length,
      judgmental: items.filter((m: any) => m.type === 'Judgmental').length,
      projected: items.filter((m: any) => m.type === 'Projected').length,
    };
  }, [items]);

  const evalNet = method === 'rollover' ? calc.rolloverNet : calc.ironNet;
  const evalGross = method === 'rollover' ? calc.rolloverGross : calc.ironGross;
  const absNet = Math.abs(evalNet);
  const exceedsOM = absNet > om;
  const exceedsPM = absNet > pm;
  const qualCount = quals.filter((q: any) => q.on).length;

  const concl = exceedsOM
    ? { k: 'red', t: 'Agregat salah saji tidak dikoreksi MELEBIHI materialitas keseluruhan. Laporan keuangan mengandung salah saji material — pertimbangkan opini modifikasian (SA 705).' }
    : exceedsPM
    ? { k: 'amber', t: 'Agregat di atas performance materiality namun di bawah materialitas keseluruhan. Minta koreksi tambahan & evaluasi pertimbangan kualitatif sebelum simpulan opini.' }
    : { k: 'green', t: 'Agregat salah saji tidak dikoreksi di bawah materialitas keseluruhan — secara kuantitatif tidak material. Tetap evaluasi faktor kualitatif.' };

  const tabs = [
    { id: 'ledger', label: 'Ikhtisar Salah Saji', count: items.length },
    { id: 'aggregate', label: 'Evaluasi Agregat' },
    { id: 'qualitative', label: 'Pertimbangan Kualitatif', count: qualCount },
    { id: 'comms', label: 'Komunikasi & Disposisi' },
  ];

  return (
    <>
      <SubBar moduleId="sad" right={
        <div className="row gap8 ac">
          <Badge kind="blue">SA 450</Badge>
          <Btn sm><I.download size={13} /> Export SAD</Btn>
          <Btn sm variant="primary"><I.send size={14} /> Kirim ke Manajemen</Btn>
        </div>
      } />
      <div className="view-scroll">
        <div className="view-pad">
          {/* KPI strip — selalu tampil */}
          <div className="grid" style={{ gridTemplateColumns: 'repeat(6,1fr)', gap: 12, marginBottom: 12 }}>
            <KpiCard value={items.length} label="Total Terakumulasi" />
            <KpiCard value={calc.corrected} label="Dikoreksi" accent="var(--green)" />
            <KpiCard value={calc.uncorr.length} label="Tidak Dikoreksi" accent="var(--amber)" />
            <KpiCard value={calc.passed} label="Diwaivekan (<CTT)" accent="var(--ink-4)" />
            <KpiCard value={'Rp ' + fmt(Math.abs(calc.rolloverNet) / 1e6, 0)} label="Uncorrected Neto (jt)" accent={exceedsOM ? 'var(--red)' : exceedsPM ? 'var(--amber)' : 'var(--green)'} />
            <KpiCard value={(Math.abs(calc.rolloverNet) / om * 100).toFixed(0) + '%'} label="dari Overall Mat." accent={exceedsOM ? 'var(--red)' : exceedsPM ? 'var(--amber)' : 'var(--green)'} />
          </div>

          <Panel noBody>
            <div style={{ padding: '0 12px' }}><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>
          </Panel>

          <div style={{ marginTop: 12 }}>
            {tab === 'ledger' && <TabLedger items={items} cycleDisp={cycleDisp} calc={calc} fmt={fmt} ctt={ctt} />}
            {tab === 'aggregate' && <TabAggregate {...{ calc, method, setMethod, evalNet, evalGross, absNet, om, pm, ctt, exceedsOM, exceedsPM, concl, fmt, nav }} />}
            {tab === 'qualitative' && <TabQualitative quals={quals} toggleQual={toggleQual} qualCount={qualCount} />}
            {tab === 'comms' && <TabComms {...{ items, calc, concl, exceedsOM, exceedsPM, absNet, om, fmt, nav, qualCount }} />}
          </div>
        </div>
      </div>
    </>
  );
}

/* ---------- KPI card ---------- */
function KpiCard({ value, label, accent }: any) {
  return <Panel><div style={{ padding: '15px 18px' }}><Stat value={value} label={label} accent={accent} /></div></Panel>;
}

/* ============================================================
   TAB 1 — Ikhtisar Salah Saji (akumulasi)
   ============================================================ */
function TabLedger({ items, cycleDisp, calc, fmt, ctt }: any) {
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 268px', gap: 12, alignItems: 'start' }}>
      <Panel noBody>
        <div className="panel-h">
          <h3>Akumulasi Salah Saji Teridentifikasi</h3>
          <div style={{ flex: 1 }} />
          <span className="tiny muted">Klik disposisi untuk siklus · Efek dalam Rp jt</span>
          <Btn sm style={{ marginLeft: 10 }}><I.plus size={13} /> Tambah</Btn>
        </div>
        <table className="dtbl">
          <thead><tr>
            <th>Ref</th><th>Deskripsi & Akun</th><th>Tipe</th><th>Asersi</th><th>Inisiator</th>
            <th className="num">Efek Laba s/d Pajak</th><th className="num">Efek Aset Neto</th><th style={{ width: 110 }}>Disposisi</th>
          </tr></thead>
          <tbody>
            {items.map((m: any) => (
              <tr key={m.id} style={{ opacity: m.disp === 'corrected' ? 0.6 : m.disp === 'passed' ? 0.72 : 1 }}>
                <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)', verticalAlign: 'top', paddingTop: 6 }}>
                  {m.id}{m.origin === 'prior' && <div><Badge kind="gray">PY</Badge></div>}
                </td>
                <td style={{ maxWidth: 250, whiteSpace: 'normal', lineHeight: 1.35, fontSize: 11.5, padding: '6px 9px' }}>
                  {m.desc}
                  <div className="tiny muted" style={{ marginTop: 2 }}>{m.fsli} · <span className="mono">→ {m.aje}</span></div>
                  {m.qual.length > 0 && <div className="row gap6 wrap" style={{ marginTop: 4 }}><span className="tiny" style={{ color: 'var(--amber)', fontWeight: 700 }}>⚑ Kualitatif</span></div>}
                </td>
                <td style={{ verticalAlign: 'top', paddingTop: 6 }}><Badge kind={(TYPE_KIND as any)[m.type]}>{m.type}</Badge></td>
                <td className="tiny muted" style={{ verticalAlign: 'top', paddingTop: 7 }}>{m.assertion}</td>
                <td className="tiny muted" style={{ verticalAlign: 'top', paddingTop: 7 }}>{m.initiator}</td>
                <td className="num" style={{ verticalAlign: 'top', paddingTop: 6, color: m.pbt < 0 ? 'var(--red)' : m.pbt > 0 ? 'var(--green)' : 'var(--ink-4)' }}>{m.pbt === 0 ? '—' : fmt(m.pbt / 1e6, 0)}</td>
                <td className="num" style={{ verticalAlign: 'top', paddingTop: 6, color: m.na < 0 ? 'var(--red)' : m.na > 0 ? 'var(--green)' : 'var(--ink-4)' }}>{m.na === 0 ? '—' : fmt(m.na / 1e6, 0)}</td>
                <td style={{ verticalAlign: 'top', paddingTop: 5 }}>
                  <span onClick={() => cycleDisp(m.id)} style={{ cursor: 'pointer' }} title="Klik untuk ubah disposisi">
                    <Badge kind={(DISP as any)[m.disp].kind}>{(DISP as any)[m.disp].label}</Badge>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={5}>AGREGAT TIDAK DIKOREKSI — TAHUN BERJALAN (NETO)</td>
              <td className="num neg">{fmt(calc.rolloverNet / 1e6, 0)}</td>
              <td className="num neg">{fmt(calc.uncorr.filter((m: any) => m.origin === 'current').reduce((s: any, m: any) => s + m.na, 0) / 1e6, 0)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </Panel>

      {/* sidebar — komposisi & legenda */}
      <div className="grid" style={{ gap: 12 }}>
        <Panel title="Klasifikasi Salah Saji" sub="SA 450.A6">
          <div className="row ac gap12" style={{ marginBottom: 4 }}>
            <Donut size={88} thickness={13} segments={[
              { value: calc.factual, color: 'var(--blue)' },
              { value: calc.judgmental, color: 'var(--purple)' },
              { value: calc.projected, color: 'var(--teal)' },
            ]} center={<div><div className="mono" style={{ fontSize: 18, fontWeight: 700, color: 'var(--navy)' }}>{calc.factual + calc.judgmental + calc.projected}</div><div className="tiny muted">item</div></div>} />
            <div style={{ flex: 1, display: 'grid', gap: 6 }}>
              <LegendRow color="var(--blue)" label="Faktual" v={calc.factual} />
              <LegendRow color="var(--purple)" label="Pertimbangan" v={calc.judgmental} />
              <LegendRow color="var(--teal)" label="Proyeksi" v={calc.projected} />
            </div>
          </div>
        </Panel>

        <Panel title="Ambang Akumulasi">
          <div style={{ display: 'grid', gap: 7 }}>
            <RowKv label="Clearly Trivial (CTT)" v={'Rp ' + fmt(ctt / 1e6, 0) + ' jt'} />
            <div className="tiny muted" style={{ lineHeight: 1.5 }}>Salah saji di bawah CTT tidak diakumulasi (diwaivekan). Item bertanda <b>Diwaivekan</b> berada di bawah ambang ini.</div>
          </div>
        </Panel>

        <Panel title="Catatan SA 450" flat>
          <div className="tiny" style={{ lineHeight: 1.6, color: 'var(--ink-2)' }}>
            Auditor mengakumulasi seluruh salah saji selain yang jelas remeh, mengkomunikasikannya ke manajemen secara tepat waktu, dan meminta koreksi. Salah saji yang tidak dikoreksi dievaluasi secara individual & agregat terhadap materialitas.
          </div>
        </Panel>
      </div>
    </div>
  );
}

function LegendRow({ color, label, v }: any) {
  return (
    <div className="row jb ac">
      <span className="row ac gap6"><span style={{ width: 9, height: 9, borderRadius: 2, background: color }} /><span style={{ fontSize: 12 }}>{label}</span></span>
      <span className="mono" style={{ fontWeight: 700, fontSize: 12.5 }}>{v}</span>
    </div>
  );
}

/* ============================================================
   TAB 2 — Evaluasi Agregat
   ============================================================ */
function TabAggregate({ calc, method, setMethod, evalNet, evalGross, absNet, om, pm, ctt, exceedsOM, exceedsPM, concl, fmt, nav }: any) {
  const maxScale = Math.max(om * 1.12, absNet * 1.12, evalGross * 1.12);
  const pctOf = (v: any) => (v / maxScale) * 100;
  const barColor = exceedsOM ? 'var(--red)' : exceedsPM ? 'var(--amber)' : 'var(--green)';

  const afterPbt = FS.pbt + (method === 'rollover' ? calc.rolloverNet : 0);
  const afterEquity = FS.equity + calc.ironNet;

  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 380px', gap: 12, alignItems: 'start' }}>
      <div className="grid" style={{ gap: 12 }}>
        {/* method switch + bars */}
        <Panel noBody>
          <div className="panel-h">
            <h3>Agregat vs Materialitas</h3>
            <div style={{ flex: 1 }} />
            <Seg value={method} onChange={setMethod} options={[{ value: 'rollover', label: 'Rollover (L/R)' }, { value: 'ironcurtain', label: 'Iron-Curtain (Neraca)' }]} />
          </div>
          <div style={{ padding: '18px 22px 10px' }}>
            <div style={{ position: 'relative', height: 200, marginBottom: 28 }}>
              {[['Overall Mat. (OM)', om, 'var(--red)'], ['Performance Mat. (PM)', pm, 'var(--amber)'], ['Clearly Trivial', ctt, 'var(--ink-4)']].map(([l, v, c]) => (
                <div key={l} style={{ position: 'absolute', left: 0, right: 0, bottom: pctOf(v) + '%', borderTop: '1.5px dashed ' + c }}>
                  <span className="tiny mono" style={{ position: 'absolute', right: 0, top: -8, color: c, fontWeight: 700, background: '#fff', padding: '0 3px' }}>{l} · {fmt(v / 1e6, 0)}</span>
                </div>
              ))}
              {[['Neto', absNet, barColor, '14%'], ['Bruto', evalGross, 'var(--blue-400)', '44%']].map(([lbl, v, c, left]) => (
                <React.Fragment key={lbl}>
                  <div style={{ position: 'absolute', left, width: 92, bottom: 0, height: pctOf(v) + '%', background: c, borderRadius: '4px 4px 0 0', transition: 'height .25s', display: 'grid', placeItems: 'start center' }}>
                    <span className="mono tiny" style={{ color: '#fff', fontWeight: 700, marginTop: 5 }}>{fmt(v / 1e6, 0)}</span>
                  </div>
                  <div style={{ position: 'absolute', left, width: 92, bottom: -20, textAlign: 'center' }} className="tiny muted">{lbl}</div>
                </React.Fragment>
              ))}
            </div>
            <div className="tiny muted" style={{ lineHeight: 1.5 }}>
              {method === 'rollover'
                ? 'Metode Rollover menilai efek salah saji yang berasal dari periode berjalan terhadap laba/rugi tahun ini.'
                : 'Metode Iron-Curtain menilai efek kumulatif terhadap neraca, termasuk carryover salah saji tidak dikoreksi periode lalu.'}
            </div>
          </div>
        </Panel>

        {/* dampak terhadap subtotal */}
        <Panel title="Dampak terhadap Subtotal Laporan Keuangan">
          <table className="dtbl">
            <thead><tr><th>Pos</th><th className="num">Dilaporkan (Rp jt)</th><th className="num">Efek Uncorrected</th><th className="num">Setelah Koreksi</th><th className="num">Δ%</th></tr></thead>
            <tbody>
              <SubtotalRow label="Laba Sebelum Pajak" base={FS.pbt} eff={calc.rolloverNet} fmt={fmt} />
              <SubtotalRow label="Total Ekuitas" base={FS.equity} eff={calc.ironNet} fmt={fmt} />
              <SubtotalRow label="Total Aset" base={FS.assets} eff={calc.ironNet} fmt={fmt} />
              <SubtotalRow label="Total Pendapatan" base={FS.revenue} eff={-1_950_000_000} fmt={fmt} />
            </tbody>
          </table>
          <div className="panel" style={{ margin: '10px 12px 12px', padding: '9px 11px', background: 'var(--amber-bg)', borderColor: 'transparent' }}>
            <div className="row gap8 ac">
              <span style={{ color: 'var(--amber)' }}><I.alert size={15} /></span>
              <span className="tiny" style={{ lineHeight: 1.5 }}>Current ratio turun dari <b>1,38×</b> ke <b>1,19×</b> akibat M-01 & reklas M-07 — menembus ambang covenant <b>1,20×</b>. Lihat tab Pertimbangan Kualitatif.</span>
            </div>
          </div>
        </Panel>
      </div>

      {/* right — comparison & conclusion */}
      <div className="grid" style={{ gap: 12 }}>
        <Panel noBody>
          <div style={{ background: 'linear-gradient(125deg,#013a52,#005085)', color: '#fff', padding: '16px 18px' }}>
            <div className="tiny" style={{ color: '#bcd6e4', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 3 }}>Agregat Tidak Dikoreksi ({method === 'rollover' ? 'Neto, L/R' : 'Neto, Neraca'})</div>
            <div className="mono" style={{ fontSize: 30, fontWeight: 700, lineHeight: 1 }}>Rp {fmt(absNet / 1e6, 0)} jt</div>
            <div className="tiny" style={{ color: '#9fc0d2', marginTop: 5 }}>Bruto Rp {fmt(evalGross / 1e6, 0)} jt · {calc.uncorr.length} item tidak dikoreksi</div>
          </div>
          <div style={{ padding: '12px 16px', display: 'grid', gap: 7 }}>
            <RowKv label="% dari Overall Materiality" v={(absNet / om * 100).toFixed(0) + '%'} strong />
            <RowKv label="% dari Performance Mat." v={(absNet / pm * 100).toFixed(0) + '%'} />
            <RowKv label="Headroom ke OM" v={'Rp ' + fmt((om - absNet) / 1e6, 0) + ' jt'} />
          </div>
        </Panel>

        <Panel title="Kesimpulan Evaluasi (SA 450.11)">
          <div className="panel" style={{ padding: '11px 12px', background: `var(--${concl.k}-bg)`, borderColor: 'transparent' }}>
            <div className="row gap8">
              <span style={{ color: `var(--${concl.k})` }}>{concl.k === 'green' ? <I.checkCircle size={16} /> : <I.alert size={16} />}</span>
              <span style={{ fontSize: 12, lineHeight: 1.5 }}>{concl.t}</span>
            </div>
          </div>
          <div className="row gap8" style={{ marginTop: 12 }}>
            <Btn sm variant="primary" style={{ flex: 1 }} onClick={() => nav('opinion')}><I.gavel size={14} /> Opinion Generator</Btn>
            <Btn sm style={{ flex: 1 }}><I.sparkle size={14} /> Telaah AI</Btn>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function SubtotalRow({ label, base, eff, fmt }: any) {
  const after = base + eff;
  const pct = base ? (eff / base * 100) : 0;
  return (
    <tr>
      <td style={{ fontWeight: 600 }}>{label}</td>
      <td className="num">{fmt(base / 1e6, 0)}</td>
      <td className="num" style={{ color: eff < 0 ? 'var(--red)' : eff > 0 ? 'var(--green)' : 'var(--ink-4)' }}>{eff === 0 ? '—' : fmt(eff / 1e6, 0)}</td>
      <td className="num">{fmt(after / 1e6, 0)}</td>
      <td className="num" style={{ color: Math.abs(pct) > 2 ? 'var(--amber)' : 'var(--ink-3)' }}>{pct === 0 ? '—' : pct.toFixed(1) + '%'}</td>
    </tr>
  );
}

/* ============================================================
   TAB 3 — Pertimbangan Kualitatif (SA 450.A21)
   ============================================================ */
function TabQualitative({ quals, toggleQual, qualCount }: any) {
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 300px', gap: 12, alignItems: 'start' }}>
      <Panel noBody>
        <div className="panel-h">
          <h3>Pertimbangan Kualitatif atas Salah Saji</h3>
          <div style={{ flex: 1 }} />
          <span className="tiny muted">SA 450.A21 · {qualCount} faktor relevan</span>
        </div>
        <div style={{ padding: 4 }}>
          {quals.map((q: any) => (
            <div key={q.id} className="panel" style={{ margin: 8, padding: '10px 12px', boxShadow: 'none', borderColor: q.on ? 'var(--amber)' : 'var(--line)', background: q.on ? 'var(--amber-bg)' : '#fff' }}>
              <div className="row gap8" style={{ alignItems: 'flex-start' }}>
                <span onClick={() => toggleQual(q.id)} style={{ cursor: 'pointer', flex: '0 0 18px', marginTop: 1 }}>
                  <span style={{ width: 17, height: 17, borderRadius: 4, border: '1.5px solid ' + (q.on ? 'var(--amber)' : 'var(--line-strong)'), background: q.on ? 'var(--amber)' : '#fff', display: 'grid', placeItems: 'center' }}>
                    {q.on && <I.check size={12} style={{ color: '#fff' }} />}
                  </span>
                </span>
                <div style={{ flex: 1 }}>
                  <div className="row jb ac">
                    <span style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.35 }}>{q.text}</span>
                    {q.on && <Badge kind="amber">Relevan</Badge>}
                  </div>
                  {q.on && q.note && <div className="tiny" style={{ marginTop: 5, lineHeight: 1.5, color: 'var(--ink-2)' }}>{q.note}</div>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <div className="grid" style={{ gap: 12 }}>
        <Panel noBody>
          <div style={{ background: 'linear-gradient(125deg,#013a52,#005085)', color: '#fff', padding: '14px 16px' }}>
            <div className="tiny" style={{ color: '#bcd6e4', textTransform: 'uppercase', letterSpacing: '.08em' }}>Faktor Kualitatif Relevan</div>
            <div className="mono" style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.1 }}>{qualCount} / {quals.length}</div>
          </div>
          <div style={{ padding: '12px 14px' }}>
            <div className="tiny" style={{ lineHeight: 1.6, color: 'var(--ink-2)' }}>
              Salah saji yang secara kuantitatif <b>di bawah</b> materialitas tetap dapat dinilai material berdasarkan keadaan kualitatif. Indikasi kecurangan & pelanggaran covenant memerlukan eskalasi independen.
            </div>
          </div>
        </Panel>

        <Panel title="Tindak Lanjut">
          <div style={{ display: 'grid', gap: 8 }}>
            <ActionRow icon="alert" color="var(--red)" text="Eskalasi M-01 ke prosedur kecurangan (SA 240)" />
            <ActionRow icon="mail" color="var(--blue)" text="Komunikasikan dampak covenant ke TCWG (SA 260)" />
            <ActionRow icon="scale" color="var(--amber)" text="Dokumentasikan basis penilaian materialitas kualitatif" />
          </div>
        </Panel>
      </div>
    </div>
  );
}

function ActionRow({ icon, color, text }: any) {
  const IconC = (I as any)[icon] || I.flag;
  return (
    <div className="row gap8 ac">
      <span style={{ color }}><IconC size={15} /></span>
      <span style={{ fontSize: 12, lineHeight: 1.4 }}>{text}</span>
    </div>
  );
}

/* ============================================================
   TAB 4 — Komunikasi & Disposisi (SA 260 / SA 580)
   ============================================================ */
function TabComms({ items, calc, concl, exceedsOM, exceedsPM, absNet, om, fmt, nav, qualCount }: any) {
  const uncorr = calc.uncorr;
  const commLog = [
    { who: 'Manajemen (CFO)', date: '12 Mei 2026', kind: 'Permintaan Koreksi', status: 'Direspons', body: 'Daftar 8 salah saji teridentifikasi disampaikan; 4 dikoreksi melalui AJE-01/04/05.' },
    { who: 'Manajemen (CFO)', date: '28 Mei 2026', kind: 'Tindak Lanjut', status: 'Menolak', body: 'Manajemen menolak mengoreksi M-01, M-03, M-04, M-07 — dianggap tidak material secara individual.' },
    { who: 'TCWG (Komite Audit)', date: '03 Jun 2026', kind: 'Komunikasi SA 260', status: 'Terjadwal', body: 'Ringkasan salah saji tidak dikoreksi & dampak kualitatif (covenant, indikasi kecurangan) untuk rapat 09 Jun.' },
  ];
  const statusKind = { 'Direspons': 'green', 'Menolak': 'red', 'Terjadwal': 'amber' };

  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 360px', gap: 12, alignItems: 'start' }}>
      <div className="grid" style={{ gap: 12 }}>
        <Panel noBody>
          <div className="panel-h"><h3>Riwayat Komunikasi</h3><div style={{ flex: 1 }} /><Badge kind="blue">SA 260 · SA 450.12</Badge></div>
          <div style={{ padding: 4 }}>
            {commLog.map((c, i) => (
              <div key={i} className="panel" style={{ margin: 8, padding: '10px 12px', boxShadow: 'none' }}>
                <div className="row jb ac" style={{ marginBottom: 4 }}>
                  <span className="row ac gap8"><Avatar name={c.who} size={22} /><span style={{ fontSize: 12.5, fontWeight: 700 }}>{c.who}</span><Badge kind="gray">{c.kind}</Badge></span>
                  <span className="row ac gap8"><span className="tiny muted">{c.date}</span><Badge kind={(statusKind as any)[c.status]}>{c.status}</Badge></span>
                </div>
                <div className="tiny" style={{ lineHeight: 1.5, color: 'var(--ink-2)' }}>{c.body}</div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Ekstrak Representasi Tertulis (SA 580)">
          <div className="panel" style={{ padding: '12px 14px', background: 'var(--surface-2)', borderColor: 'var(--line)', boxShadow: 'none' }}>
            <div className="tiny muted upper" style={{ marginBottom: 6 }}>Lampiran — Daftar Salah Saji Tidak Dikoreksi</div>
            <div style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--ink-2)', fontStyle: 'italic' }}>
              "Kami berkeyakinan bahwa dampak dari salah saji yang tidak dikoreksi, baik secara individual maupun agregat, adalah tidak material terhadap laporan keuangan secara keseluruhan. Ikhtisar salah saji tersebut terlampir dalam representasi ini."
            </div>
            <div className="row gap8" style={{ marginTop: 10 }}>
              <Btn sm><I.download size={13} /> Lampiran SUM</Btn>
              <Btn sm><I.doc size={13} /> Surat Representasi</Btn>
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid" style={{ gap: 12 }}>
        <Panel title="Ringkasan untuk TCWG">
          <table className="dtbl">
            <thead><tr><th>Ref</th><th>Akun</th><th className="num">Efek (jt)</th></tr></thead>
            <tbody>
              {uncorr.map((m: any) => (
                <tr key={m.id}>
                  <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{m.id}</td>
                  <td className="tiny" style={{ whiteSpace: 'normal', lineHeight: 1.3 }}>{m.fsli}</td>
                  <td className="num neg">{m.pbt === 0 ? '—' : fmt(m.pbt / 1e6, 0)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr><td colSpan={2}>NETO (L/R)</td><td className="num neg">{fmt(calc.rolloverNet / 1e6, 0)}</td></tr></tfoot>
          </table>
        </Panel>

        <Panel noBody>
          <div className="panel-h"><h3>Disposisi Akhir</h3></div>
          <div style={{ padding: '12px 14px' }}>
            <div className="panel" style={{ padding: '10px 12px', background: `var(--${concl.k}-bg)`, borderColor: 'transparent', marginBottom: 10 }}>
              <div className="row gap8 ac" style={{ marginBottom: 4 }}>
                <span style={{ color: `var(--${concl.k})` }}>{concl.k === 'green' ? <I.checkCircle size={16} /> : <I.alert size={16} />}</span>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: `var(--${concl.k})` }}>
                  {exceedsOM ? 'Material — Modifikasi Opini' : exceedsPM ? 'Perlu Evaluasi Lanjut' : 'Tidak Material (Kuantitatif)'}
                </span>
              </div>
              <div className="tiny" style={{ lineHeight: 1.5 }}>{qualCount} faktor kualitatif relevan harus dipertimbangkan bersama agregat Rp {fmt(absNet / 1e6, 0)} jt ({(absNet / om * 100).toFixed(0)}% OM).</div>
            </div>
            <div className="grid" style={{ gap: 8 }}>
              <Btn variant="primary" onClick={() => nav('opinion')}><I.gavel size={15} /> Lanjut ke Opinion Generator</Btn>
              <Btn onClick={() => nav('eqr')}><I.checkCircle size={15} /> Rujuk ke EQR</Btn>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

Object.assign(window, { SADLedger });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { SADLedger };
