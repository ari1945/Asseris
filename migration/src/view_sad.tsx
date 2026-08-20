/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { useAudit, useFirm, useNav, useAmsPersist, useMateriality } from './contexts';
import { ajeEffect, entityFigures } from './canon_base';
import { I } from './icons';
import { SubBar } from './shell';
import { reconcileUncorrectedMisstatements, type UncorrResult, type SadEntry, type AjeEntry } from './canon_validation';
import { EST_SEED, estimateMisstatements, type EstState } from './canon_estimates';
import { AMS_CANON } from './canon';
import { hydrateViuDerivations, type Psak48Like } from './canon_range';
import type { ViuParams } from './canon_viu';
import type { WTB } from './canon_types';
import { Avatar, Badge, Btn, Donut, Panel, Seg, Stat, Tabs } from './ui';
import { amsExportXlsx } from './export_xlsx';
import { amsExportPdf } from './export_pdf';
import { RowKv } from './view_calc';
import { amsDateIso } from './clock_ssot';

/* ============================================================
   Asseris — Evidence Evaluation · SAD Ledger (SA 450)
   Summary of Audit Differences — akumulasi, evaluasi agregat,
   pertimbangan kualitatif, komunikasi & disposisi.
   ============================================================ */
const { useState: useStateSD, useMemo: useMemoSD } = React;

/* effect figures in full Rupiah. pbt = efek laba sebelum pajak,
   na = efek aset neto (ekuitas). origin: tahun berjalan / lalu.
   disp: corrected | uncorrected | passed (diwaivekan) */
/* PR-C — `bsEffect` melengkapi tiap salah saji dengan efek terhadap pos LANCAR neraca
   (Rp penuh; aset naik positif, liabilitas naik positif). Tanpa field ini rasio lancar
   proyeksi TIDAK dapat dihitung: M-07 (reklas utang bank JP→lancar) berefek NOL pada
   laba sehingga `pbt`/`na` tak menangkapnya, dan besarannya dulu hanya hidup di dalam
   string catatan kualitatif. Itulah sebabnya angka covenant di-hardcode. */
const SAD_SEED = [
  { id: 'M-01', desc: 'Piutang fiktif belum dibalik (channel stuffing kuartal IV)', type: 'Factual', fsli: 'Pendapatan / Piutang Usaha', assertion: 'Keterjadian', initiator: 'Tim — Dewi A.', pbt: -1_950_000_000, na: -1_950_000_000, origin: 'current', disp: 'uncorrected', aje: 'PAJE-03', qual: ['fraud', 'trend', 'covenant'], bsEffect: { curAssets: -1_950_000_000, curLiab: 0 } },
  { id: 'M-02', desc: 'Koreksi penyusutan mesin produksi (umur manfaat terlalu panjang)', type: 'Factual', fsli: 'BPP / Akumulasi Penyusutan', assertion: 'Akurasi', initiator: 'Tim — Bagus P.', pbt: -1_120_000_000, na: -1_120_000_000, origin: 'current', disp: 'corrected', aje: 'AJE-05', qual: [], bsEffect: { curAssets: 0, curLiab: 0 } },
  { id: 'M-03', desc: 'Proyeksi salah saji hasil sampling piutang (SA 530)', type: 'Projected', fsli: 'Piutang Usaha', assertion: 'Keberadaan', initiator: 'Tim — Dewi A.', pbt: -640_000_000, na: -640_000_000, origin: 'current', disp: 'uncorrected', aje: 'SA 530', qual: ['estimate'], bsEffect: { curAssets: -640_000_000, curLiab: 0 } },
  /* M-04 DICABUT (arc estimasi PR-1). Baris ini DULU memaku "selisih estimasi CKPN
     Rp 680 jt" — angka yang tak berasal dari registri estimasi mana pun, dan yang
     membuat ledger tampak benar justru karena hasilnya dikarang. Salah saji estimasi
     kini DITURUNKAN dari `estimates.v1` via `estimateMisstatements()`; bila tak ada
     titik manajemen yang keluar rentang wajar auditor, memang tak ada barisnya. */
  { id: 'M-05', desc: 'Cut-off persediaan akhir tahun (penerimaan barang 31 Des)', type: 'Factual', fsli: 'Persediaan / BPP', assertion: 'Pisah Batas', initiator: 'Tim — Rina S.', pbt: -2_340_000_000, na: -2_340_000_000, origin: 'current', disp: 'corrected', aje: 'AJE-01', qual: [], bsEffect: { curAssets: -2_340_000_000, curLiab: 0 } },
  { id: 'M-06', desc: 'Akrual bonus manajemen belum dicatat', type: 'Factual', fsli: 'Beban Gaji / Akrual', assertion: 'Kelengkapan', initiator: 'Tim — Bagus P.', pbt: -980_000_000, na: -980_000_000, origin: 'current', disp: 'corrected', aje: 'AJE-04', qual: ['compensation'], bsEffect: { curAssets: 0, curLiab: 980_000_000 } },
  { id: 'M-07', desc: 'Reklasifikasi utang bank jatuh tempo ≤1 thn ke liabilitas lancar', type: 'Factual', fsli: 'Liabilitas Jk. Panjang → Lancar', assertion: 'Klasifikasi', initiator: 'Reviu — Mgr.', pbt: 0, na: 0, origin: 'current', disp: 'uncorrected', aje: 'PAJE-06', qual: ['classification', 'covenant'], bsEffect: { curAssets: 0, curLiab: 4_100_000_000 } },
  { id: 'M-08', desc: 'Beban dibayar di muka belum diamortisasi (carryover FY2024)', type: 'Judgmental', fsli: 'Beban Dibayar Dimuka', assertion: 'Penilaian', initiator: 'Saldo Awal', pbt: 0, na: -180_000_000, origin: 'prior', disp: 'uncorrected', aje: 'SUM-PY', qual: [], bsEffect: { curAssets: -180_000_000, curLiab: 0 } },
  { id: 'M-09', desc: 'Akrual beban listrik Desember (di bawah ambang remeh)', type: 'Factual', fsli: 'Beban Utilitas / Akrual', assertion: 'Kelengkapan', initiator: 'Tim — Rina S.', pbt: -95_000_000, na: -95_000_000, origin: 'current', disp: 'passed', aje: 'CTT', qual: [], bsEffect: { curAssets: 0, curLiab: 95_000_000 } },
];

/* SA 450.A21 — daftar pertimbangan kualitatif */
const QUAL_SEED = [
  { id: 'trend', text: 'Menutupi perubahan laba atau tren laba, khususnya terkait ekspektasi pasar', on: true, note: 'Reversal piutang fiktif M-01 menyembunyikan stagnasi pendapatan YoY (+0,4% vs klaim +9%).' },
  { id: 'losstoincome', text: 'Mengubah rugi menjadi laba (atau sebaliknya) untuk periode berjalan', on: false, note: '' },
  /* PR-C — catatan ini DULU memaku "1,38× → 1,19×", angka yang tak berasal dari mana pun
     (turunan WTB memberi rasio kini 1,62×). Kini diisi dari hitungan; teks statis di sini
     hanya menyatakan MENGAPA faktor ini relevan, bukan berapa angkanya. */
  { id: 'covenant', text: 'Memengaruhi rasio keuangan & kepatuhan terhadap covenant pinjaman', on: true, note: 'M-01 (pembalikan piutang) & M-07 (reklas utang bank ke lancar) sama-sama menekan rasio lancar — lihat panel Likuiditas & Covenant untuk angka terhitung.' },
  { id: 'segment', text: 'Berdampak pada informasi segmen yang dilaporkan', on: false, note: '' },
  { id: 'compensation', text: 'Menaikkan kompensasi/insentif manajemen (bonus berbasis laba)', on: true, note: 'Bonus M-06 telah dikoreksi; namun laba yang dipertahankan masih memengaruhi pool insentif.' },
  { id: 'regulatory', text: 'Berdampak pada kepatuhan terhadap regulasi/perjanjian kontraktual', on: false, note: '' },
  { id: 'relatedparty', text: 'Menyangkut/menyembunyikan transaksi dengan pihak berelasi', on: false, note: '' },
  { id: 'classification', text: 'Salah klasifikasi antar pos (mis. operasi vs non-operasi; lancar vs tidak lancar)', on: true, note: 'Reklas M-07 memindahkan Rp 4,1 M ke liabilitas lancar — material terhadap penyajian likuiditas.' },
  { id: 'fraud', text: 'Berkaitan dengan unsur kecurangan atau ketidakberesan yang teridentifikasi', on: true, note: 'M-01 berindikasi manipulasi pendapatan — eskalasi ke SA 240 & komunikasi TCWG wajib.' },
  { id: 'estimate', text: 'Berada pada batas rentang estimasi yang dapat diterima (bias terarah)', on: true, note: 'Arah pemilihan titik dalam rentang dinilai di SA 540 (indikator ¶32) — lihat panel Bias & kolom kecondongan laba, bukan dari baris SAD.' },
  { id: 'future', text: 'Memiliki dampak signifikan pada periode pelaporan mendatang', on: false, note: '' },
];

const DISP = {
  corrected:   { label: 'Dikoreksi',       kind: 'green' },
  uncorrected: { label: 'Tidak Dikoreksi', kind: 'amber' },
  passed:      { label: 'Diwaivekan',      kind: 'gray' },
};
const DISP_CYCLE = ['uncorrected', 'corrected', 'passed'];
type DispKey = keyof typeof DISP;
/* Satu tempat pemetaan disposisi → lencana; dipakai baris tersimpan MAUPUN turunan
   sehingga tak ada `as any` yang terduplikasi (ratchet no-explicit-any). */
function DispBadge({ disp }: { disp: string }) {
  const d = DISP[disp as DispKey] || DISP.uncorrected;
  return <Badge kind={d.kind}>{d.label}</Badge>;
}
const TYPE_KIND = { Factual: 'blue', Judgmental: 'purple', Projected: 'teal' };

/* ---- entity subtotals (FY2025, dilaporkan) ---- */
/* PR-A - `FS` DULU konstanta di sini (pbt 85.200 / revenue 331.900 / assets 316.558 /
   equity 160.456). Hanya tiga yang tie ke WTB, dan itu pun ke KOLOM BERBEDA: pendapatan
   ke `unadj`, total aset ke `adj`. PBT 85.200 tak tie ke mana pun (turunan WTB: unadj
   29.690). Kini ditarik dari `entityFigures()` + efek jurnal yang benar-benar diposting,
   memakai helper yang SAMA dengan modul AJE supaya "PBT dilaporkan" hanya ada satu. */

function SADLedger() {
  const { fmt } = AMS;
  const nav = useNav();
  const { activeEngagement } = useFirm();
  const { wtb, aje } = useAudit() as { wtb: WTB; aje: AjeEntry[] };
  const [stored, setItems] = useAmsPersist('sadItems.v1', () => SAD_SEED); // F1/PR-3: persist (dulu useState → hilang saat reload)
  const [quals, setQuals] = useAmsPersist('sadQual.v1', () => QUAL_SEED);
  const [tab, setTab] = useStateSD('ledger');
  const [method, setMethod] = useAmsPersist('sadMethod.v1', 'rollover');

  /* materialitas: SATU sumber dari SA 320 (Materiality Workspace) — PM%/CTT% & override
     yang sama dipakai PSAK 14 dkk., bukan lagi hardcode 75%/5%. */
  const _mat = useMateriality();   // PR-6b — satu pintu (ter-hidrasi server, reaktif)
  const om = (_mat && _mat.omFull != null) ? _mat.omFull : activeEngagement.materiality;
  const pm = (_mat && _mat.pmFull != null) ? _mat.pmFull : Math.round(om * 0.75);
  const ctt = (_mat && _mat.cttFull != null) ? _mat.cttFull : Math.round(om * 0.05);

  /* SA 450 — rekonsiliasi silang 3-arah (baca-saja): register jurnal AMS.AJE
     (Posted/Proposed) × ledger SAD ini × jenis opini (opinionDoc.v1 → SA 705).
     opinionDoc.v1 dibaca read-only; useServerState tak menulis saat mount →
     tak menyemai/merusak dokumen opini (default minimal hanya .type). */
  const [opinionDoc] = useAmsPersist('opinionDoc.v1', () => ({ type: 'unmodified' }));

  /* ARC ESTIMASI PR-1 — salah saji estimasi TIDAK disalin ke `sadItems.v1`: ia
     DITURUNKAN dari registri SA 540 pada tiap render, sehingga tak pernah ada dua
     angka yang bisa menyimpang. Registri dibaca read-only (useServerState tak
     menulis saat mount — pola yang sama dengan `opinionDoc.v1` di atas).
     Dasar pengukuran = BATAS TERDEKAT: titik manajemen di DALAM rentang wajar
     auditor tidak menghasilkan salah saji sama sekali. Itulah sebabnya baris
     seed `M-04` (selisih estimasi CKPN Rp 680 jt) DICABUT — ia angka yang tak
     berasal dari registri mana pun, dan pada data seed kelima estimasi berada
     di dalam rentangnya masing-masing.
     Baris turunan selalu `uncorrected` dan tak dapat disunting di sini: koreksi
     atas estimasi dinyatakan dengan memindahkan titik manajemen di SA 540. */
  const [estState] = useAmsPersist('estimates.v1', () => EST_SEED);
  /* PR-4 · Q3 — registri dihidrasi dengan skenario nilai pakai HIDUP sebelum
     diukur, memakai asumsi PSAK 48 yang sama dengan modul SA 540 & PSAK 48.
     Tanpa hidrasi di sini, ledger akan mengukur E-05 terhadap rentang lain
     daripada yang dilihat auditor di kertas kerjanya. */
  const [viuOverride] = useAmsPersist('viuParams.v1', () => ({} as Partial<ViuParams>));
  const items = useMemoSD(() => {
    const raw = (estState && (estState as EstState).register) || [];
    const p48 = AMS_CANON.psak48(wtb, aje, 'reported', viuOverride) as unknown as Psak48Like;
    return [...stored, ...estimateMisstatements(hydrateViuDerivations(raw, p48))];
  }, [stored, estState, wtb, aje, viuOverride]);

  /* Figur dilaporkan = WTB `unadj` + efek jurnal BERSTATUS POSTED. Sengaja BUKAN
     kolom `adj`: kolom itu memuat AJE-03 & AJE-05 yang masih Proposed, sehingga
     memakainya akan menyatakan salah saji sudah dikoreksi padahal partner belum
     menyetujui jurnalnya. Register AJE adalah otoritas atas status posting.
     CATATAN: sumber register di sini masih `AMS.AJE` (seed beku) - sama seperti
     rekonsiliasi di bawah; menyambungkannya ke state live adalah PR-C. */
  const FS = useMemoSD(() => {
    const f = entityFigures(wtb, 'unadj');
    const eff = ajeEffect(AMS.AJE, 'Posted');
    return {
      pbt: (f.pbt ?? 0) + eff.pbt,
      revenue: f.revenue ?? 0,
      assets: f.totalAssets ?? 0,
      equity: f.equity ?? 0,
    };
  }, [wtb]);
  /* PR-C — DULU `aje: AMS.AJE` (seed modul, beku) dan `aje` tak ada di deps: setiap
     perubahan status jurnal — termasuk persetujuan partner yang memposting lewat rantai
     SMM 1 — tidak menggerakkan rekonsiliasi ini, dan jurnal buatan auditor tak pernah
     masuk hitungan sama sekali. Kelas cache-dingin yang sama dengan #129/PR-6b, tetapi
     yang basi di sini adalah POPULASI SALAH SAJI YANG MENENTUKAN OPINI. */
  const recon: UncorrResult = useMemoSD(() => reconcileUncorrectedMisstatements({
    aje: aje || [],
    sad: items,
    om,
    opinionType: (opinionDoc && opinionDoc.type) || 'unmodified',
    method,
  }), [aje, items, om, opinionDoc, method]);

  /* PR-C — RASIO LANCAR TERHITUNG, bukan narasi ter-hardcode.
     Basis = WTB unadjusted + efek jurnal yang BENAR-BENAR diposting (helper `ajeEffect`
     yang sama dipakai modul AJE, sehingga kedua modul menyebut satu angka).
     Proyeksi = ditambah efek neraca seluruh salah saji tidak dikoreksi yang in-scope.
     Bila ada satu saja item tanpa `bsEffect`, proyeksi TIDAK ditampilkan — menyebut
     item mana yang belum lengkap lebih berguna daripada angka yang salah. */
  const liquidity = useMemoSD(() => {
    const f = entityFigures(wtb, 'unadj');
    const posted = ajeEffect(aje, 'Posted');
    const ca = (f.curAssets ?? 0) + posted.curAssets;
    const cl = (f.curLiab ?? 0) + posted.curLiab;
    const now = cl ? ca / cl : null;
    const scope = items.filter((m: SadEntry) => (m.disp || '') === 'uncorrected'
      && (method === 'ironcurtain' || (m.origin || 'current') === 'current'));
    const missing = scope.filter((m: SadEntry) => !m.bsEffect).map((m: SadEntry) => m.id);
    const dCa = scope.reduce((t: number, m: SadEntry) => t + ((m.bsEffect && m.bsEffect.curAssets) || 0), 0);
    const dCl = scope.reduce((t: number, m: SadEntry) => t + ((m.bsEffect && m.bsEffect.curLiab) || 0), 0);
    const after = (!missing.length && (cl + dCl)) ? (ca + dCa) / (cl + dCl) : null;
    return { now, after, missing, covenant: 1.20 };
  }, [wtb, aje, items, method]);

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

  /* K-06 lanjutan — wire tombol "Export SAD" + "Lampiran SUM" (dulu mati): ekspor XLSX
     tersegel ledger salah saji + lampiran surat manajemen. Angka Rp jt dari state SAD. */
  const [exporting, setExporting] = useStateSD(false);
  const onExportSAD = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const dispLbl: Record<string, string> = { uncorrected: 'Tidak Dikoreksi', corrected: 'Dikoreksi', passed: 'Diwaivekan' };
      /* SadEntry kanonik ramping (id/disp/aje/pbt/na/origin) — field tampilan
         (desc/fsli/type/assertion/initiator) diisi runtime oleh SAD_SEED/estimasi. */
      const rowOf = (m: SadEntry & { desc?: string; fsli?: string; type?: string; assertion?: string; initiator?: string }) => [
        m.id, m.desc || '', m.fsli || '', m.type || '', m.assertion || '', m.initiator || '',
        m.pbt ? fmt(Math.round(m.pbt / 1e6)) : '—', m.na ? fmt(Math.round(m.na / 1e6)) : '—',
        dispLbl[m.disp || ''] || m.disp || '', m.origin === 'prior' ? 'PY' : 'CY',
      ];
      const sadRows = items.map(rowOf);
      const sumRows = calc.uncorr.map(rowOf);
      const eng = activeEngagement;
      await amsExportXlsx({
        kind: 'sad-ledger', scope: 'engagement',
        fileName: `SAD Ledger (SA 450) - ${(eng as { clientName?: string }).clientName || 'Klien'}.xlsx`,
        title: `SAD Ledger — Akumulasi Salah Saji (SA 450)`,
        meta: [`${eng?.id || ''} · ${eng?.fy || 'FY2025'} · SA 450 · metode ${method === 'rollover' ? 'roll-over' : 'iron curtain'}`,
          `Tidak dikoreksi neto Rp ${fmt(Math.round(Math.abs(calc.rolloverNet) / 1e6))} jt (${(Math.abs(calc.rolloverNet) / om * 100).toFixed(0)}% OM) — Rp juta`],
        sheets: [
          { name: 'Ledger SAD', heading: 'Ikhtisar salah saji (Rp juta)',
            columns: ['Ref', 'Deskripsi', 'FS Line', 'Tipe', 'Asersi', 'Inisiator', 'Efek Laba', 'Efek Aset Neto', 'Disposisi', 'Asal'],
            rows: sadRows, colWidths: [10, 40, 16, 11, 12, 12, 12, 14, 13, 6] },
          { name: 'Lampiran SUM', heading: 'Lampiran Surat Untuk Manajemen — salah saji tidak dikoreksi (Rp juta)',
            columns: ['Ref', 'Deskripsi', 'Efek Laba', 'Efek Aset Neto'], rows: sumRows.map((r: (string | number)[]) => [r[0], r[1], r[6], r[7]]), colWidths: [10, 56, 14, 16] },
        ]});
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <SubBar moduleId="sad" right={
        <div className="row gap8 ac">
          <Badge kind="blue">SA 450</Badge>
          <Btn sm onClick={onExportSAD} disabled={exporting}><I.download size={13} /> {exporting ? 'Menyiapkan…' : 'Export SAD'}</Btn>
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

          {/* F4/SA450 — banner validasi silang 3-arah (AJE ↔ SAD ↔ opini) */}
          {recon.issues > 0 && (
            <div className="panel" style={{ margin: '0 0 12px', padding: '11px 13px', background: 'var(--amber-bg)', borderColor: 'transparent' }}>
              <div className="row gap8" style={{ alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--amber)', marginTop: 1 }}><I.alert size={16} /></span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 3 }}>
                    Validasi silang SA 450 — {recon.issues} inkonsistensi antar sumber kebenaran
                  </div>
                  <ul style={{ margin: '2px 0 0', paddingLeft: 16, fontSize: 12, lineHeight: 1.55, color: 'var(--ink-2)' }}>
                    {recon.stale.map((s) => (
                      <li key={s.sadId}><b className="mono">{s.sadId}</b> · {s.reason} (jurnal <span className="mono">{s.ajeId}</span> = {s.ajeStatus}).</li>
                    ))}
                    {recon.missingFromSad.length > 0 && (
                      <li>AJE usulan belum diakumulasi di ledger SAD: <span className="mono">{recon.missingFromSad.join(', ')}</span> — agregat SA 450 berisiko understated.</li>
                    )}
                    {recon.opinionInconsistent && (
                      <li>Agregat tidak dikoreksi <b>Rp {fmt(recon.aggAbs / 1e6, 0)} jt</b> ({recon.pctOfOm}% OM) melampaui materialitas keseluruhan, namun opini tersimpan masih <b>tanpa modifikasian</b> — pertimbangkan opini modifikasian (SA 705.7/.8).</li>
                    )}
                  </ul>
                  <div className="row gap8" style={{ marginTop: 8 }}>
                    {(recon.stale.length > 0 || recon.missingFromSad.length > 0) && (
                      <Btn sm onClick={() => nav('aje', { from: 'sad' })}><I.arrowRight size={12} /> Register AJE</Btn>
                    )}
                    {recon.opinionInconsistent && (
                      <Btn sm variant="primary" onClick={() => nav('opinion', { from: 'sad' })}><I.gavel size={13} /> Opinion Generator</Btn>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <Panel noBody>
            <div style={{ padding: '0 12px' }}><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>
          </Panel>

          <div style={{ marginTop: 12 }}>
            {tab === 'ledger' && <TabLedger items={items} cycleDisp={cycleDisp} calc={calc} fmt={fmt} ctt={ctt} />}
            {tab === 'aggregate' && <TabAggregate {...{ calc, method, setMethod, evalNet, evalGross, absNet, om, pm, ctt, exceedsOM, exceedsPM, concl, fmt, nav, FS, liquidity, recon }} />}
            {tab === 'qualitative' && <TabQualitative quals={quals} toggleQual={toggleQual} qualCount={qualCount} />}
            {tab === 'comms' && <TabComms {...{ items, calc, concl, exceedsOM, exceedsPM, absNet, om, fmt, nav, qualCount, onExportSAD, exporting }} />}
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
    <div className="grid split" style={{ gridTemplateColumns: '1fr 268px', gap: 12, alignItems: 'start' }}>
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
                  {m.derived && <div style={{ marginTop: 3 }}><Badge kind="purple">SA 540</Badge></div>}
                  {m.derived && m.rangeGrounded === false && (
                    <div style={{ marginTop: 3 }}>
                      <Badge kind="amber" title="Rentang auditor yang menghasilkan salah saji ini belum menyatakan dasarnya">Rentang tak berdasar</Badge>
                    </div>
                  )}
                </td>
                <td style={{ maxWidth: 250, whiteSpace: 'normal', lineHeight: 1.35, fontSize: 12, padding: '6px 9px' }}>
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
                  {m.derived ? (
                    /* Turunan registri SA 540 — disposisi TIDAK dapat diubah di sini.
                       Koreksi dinyatakan dengan memindahkan titik manajemen ke dalam
                       rentang wajar auditor, sehingga barisnya hilang dengan sendirinya. */
                    <span title="Turunan registri estimasi SA 540 — koreksi dengan memindahkan titik manajemen, bukan dari sini">
                      <DispBadge disp={m.disp} />
                    </span>
                  ) : (
                    <span onClick={() => cycleDisp(m.id)} style={{ cursor: 'pointer' }} title="Klik untuk ubah disposisi">
                      <DispBadge disp={m.disp} />
                    </span>
                  )}
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
            ]} center={<div><div className="mono" style={{ fontSize: 19, fontWeight: 700, color: 'var(--navy)' }}>{calc.factual + calc.judgmental + calc.projected}</div><div className="tiny muted">item</div></div>} />
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
      <span className="mono" style={{ fontWeight: 700, fontSize: 12 }}>{v}</span>
    </div>
  );
}

/* ============================================================
   TAB 2 — Evaluasi Agregat
   ============================================================ */
function TabAggregate({ calc, method, setMethod, evalNet, evalGross, absNet, om, pm, ctt, exceedsOM, exceedsPM, concl, fmt, nav, FS, liquidity, recon }: any) {
  const maxScale = Math.max(om * 1.12, absNet * 1.12, evalGross * 1.12);
  const pctOf = (v: any) => (v / maxScale) * 100;
  const barColor = exceedsOM ? 'var(--red)' : exceedsPM ? 'var(--amber)' : 'var(--green)';

  const afterPbt = FS.pbt + (method === 'rollover' ? calc.rolloverNet : 0);
  const afterEquity = FS.equity + calc.ironNet;

  return (
    <div className="grid split" style={{ gridTemplateColumns: '1fr 380px', gap: 12, alignItems: 'start' }}>
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
        {/* PR-C — selisih besaran salah saji vs koreksi yang dijurnalkan. Sebelumnya
            dimensi ini tak pernah diperiksa: jurnal yang lebih kecil dari salah sajinya
            tetap mengeluarkan SELURUH salah saji dari agregat SA 450. */}
        {recon && recon.valueDeltas && recon.valueDeltas.length > 0 && (
          <Panel title="Selisih Salah Saji vs Koreksi Dijurnalkan" sub="SA 450 — koreksi sebagian meninggalkan residu">
            <table className="dtbl">
              <thead><tr>
                <th>Salah Saji</th><th>Jurnal</th>
                <th className="num">Nilai SAD</th><th className="num">Nilai Jurnal</th>
                <th className="num">Selisih</th><th>Status</th>
              </tr></thead>
              <tbody>
                {recon.valueDeltas.map((d: { sadId: string; ajeId: string; sadAmount: number; ajeAmount: number; delta: number; ajeStatus: string; residual: boolean }) => (
                  <tr key={d.sadId + d.ajeId}>
                    <td className="mono tiny" style={{ fontWeight: 700 }}>{d.sadId}</td>
                    <td className="mono tiny" style={{ color: 'var(--blue)' }}>{d.ajeId}</td>
                    <td className="num">{fmt(d.sadAmount / 1e6, 0)}</td>
                    <td className="num">{fmt(d.ajeAmount / 1e6, 0)}</td>
                    <td className="num" style={{ fontWeight: 700, color: d.residual ? 'var(--amber)' : 'var(--ink-3)' }}>
                      {d.delta > 0 ? '+' : ''}{fmt(d.delta / 1e6, 0)}
                    </td>
                    <td>{d.residual
                      ? <Badge kind="amber">Residu tak dikoreksi</Badge>
                      : <span className="tiny muted">{
                          d.delta < 0 ? 'koreksi melebihi salah saji'
                            : d.ajeStatus === 'Posted' ? 'diposting · disposisi belum selaras'
                            : 'usulan · belum diposting'
                        }</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="tiny muted" style={{ padding: '8px 12px', lineHeight: 1.5 }}>
              Selisih bukan otomatis kesalahan — koreksi sebagian adalah pertimbangan yang sah.
              Yang ditandai <b>residu</b> adalah salah saji yang sudah dianggap dikoreksi padahal
              jurnalnya tidak menutup seluruhnya; bagian itu tetap masuk agregat SA 450
              {recon.residualUncorrected ? <> (<b className="mono">Rp {fmt(recon.residualUncorrected / 1e6, 0)} jt</b>)</> : null}.
            </div>
          </Panel>
        )}

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
              <span className="tiny" style={{ lineHeight: 1.5 }}>{liquidity.missing.length ? (
                <>Rasio lancar kini <b>{liquidity.now != null ? liquidity.now.toFixed(2) + '×' : '—'}</b>. Proyeksi belum dapat dihitung: efek neraca belum dilengkapi untuk <b className="mono">{liquidity.missing.join(', ')}</b>.</>
              ) : (
                <>Rasio lancar <b>{liquidity.now != null ? liquidity.now.toFixed(2) + '×' : '—'}</b> → <b>{liquidity.after != null ? liquidity.after.toFixed(2) + '×' : '—'}</b> bila seluruh salah saji tidak dikoreksi dibukukan. Ambang covenant <b>{liquidity.covenant.toFixed(2)}×</b> — {liquidity.after != null && liquidity.after < liquidity.covenant ? <b>tertembus</b> : 'tidak tertembus'}. Lihat tab Pertimbangan Kualitatif.</>
              )}</span>
            </div>
          </div>
        </Panel>
      </div>

      {/* right — comparison & conclusion */}
      <div className="grid" style={{ gap: 12 }}>
        <Panel noBody>
          <div style={{ background: 'linear-gradient(125deg,var(--navy-700),var(--blue-solid))', color: 'var(--on-dark-fg)', padding: '16px 18px' }}>
            <div className="tiny" style={{ color: 'var(--on-dark-muted)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 3 }}>Agregat Tidak Dikoreksi ({method === 'rollover' ? 'Neto, L/R' : 'Neto, Neraca'})</div>
            <div className="mono" style={{ fontSize: 28, fontWeight: 700, lineHeight: 1 }}>Rp {fmt(absNet / 1e6, 0)} jt</div>
            <div className="tiny" style={{ color: 'var(--on-dark-muted)', marginTop: 5 }}>Bruto Rp {fmt(evalGross / 1e6, 0)} jt · {calc.uncorr.length} item tidak dikoreksi</div>
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
    <div className="grid split" style={{ gridTemplateColumns: '1fr 300px', gap: 12, alignItems: 'start' }}>
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
                    <span style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.35 }}>{q.text}</span>
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
          <div style={{ background: 'linear-gradient(125deg,var(--navy-700),var(--blue-solid))', color: 'var(--on-dark-fg)', padding: '14px 16px' }}>
            <div className="tiny" style={{ color: 'var(--on-dark-muted)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Faktor Kualitatif Relevan</div>
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
function TabComms({ items, calc, concl, exceedsOM, exceedsPM, absNet, om, fmt, nav, qualCount, onExportSAD, exporting }: any) {
  const uncorr = calc.uncorr;
  const commLog = [
    { who: 'Manajemen (CFO)', date: '12 Mei 2026', kind: 'Permintaan Koreksi', status: 'Direspons', body: 'Daftar 8 salah saji teridentifikasi disampaikan; 4 dikoreksi melalui AJE-01/04/05.' },
    { who: 'Manajemen (CFO)', date: '28 Mei 2026', kind: 'Tindak Lanjut', status: 'Menolak', body: 'Manajemen menolak mengoreksi M-01, M-03, M-04, M-07 — dianggap tidak material secara individual.' },
    { who: 'TCWG (Komite Audit)', date: '03 Jun 2026', kind: 'Komunikasi SA 260', status: 'Terjadwal', body: 'Ringkasan salah saji tidak dikoreksi & dampak kualitatif (covenant, indikasi kecurangan) untuk rapat 09 Jun.' },
  ];
  const statusKind = { 'Direspons': 'green', 'Menolak': 'red', 'Terjadwal': 'amber' };

  /* Program A sisa — wire tombol "Surat Representasi" (SA 580, dulu mati): ekspor PDF
     tersegel surat representasi tertulis manajemen + lampiran daftar salah saji tak dikoreksi. */
  const onExportRep = () => {
    const FIRM = AMS.FIRM;
    const repItems = calc.uncorr;
    amsExportPdf({
      kind: 'representation-letter', scope: 'engagement',
      fileName: 'Surat Representasi Tertulis - Klien.pdf', title: 'Surat Representasi Tertulis (SA 580)',
      refNo: 'SA 580 · ' + amsDateIso(),
      meta: ['Kepada KAP Wijaya Hartono & Rekan', 'Daftar salah saji tidak dikoreksi terlampir', (exceedsOM ? 'Material — memengaruhi opini' : (exceedsPM ? 'Perlu evaluasi lanjut' : 'Tidak material kuantitatif'))],
      blocks: [
        { type: 'para', text: 'Kepada KAP Wijaya Hartono & Rekan' },
        { type: 'para', text: 'Surat ini diberikan sehubungan dengan audit laporan keuangan untuk tahun yang berakhir 31 Desember 2025, sesuai Standar Audit (SA) 580 — Representasi Tertulis.' },
        { type: 'para', text: 'Kami menegaskan, sejauh pengetahuan dan keyakinan kami, bahwa: (1) laporan keuangan telah disusun sesuai kerangka pelaporan keuangan yang berlaku; (2) informasi yang diberikan kepada auditor adalah lengkap dan benar; (3) seluruh transaksi telah dicatat dan mencerminkan substansi ekonominya.' },
        { type: 'heading', text: 'Lampiran — Daftar Salah Saji Tidak Dikoreksi' },
        { type: 'para', text: '"Kami berkeyakinan bahwa dampak dari salah saji yang tidak dikoreksi, baik secara individual maupun agregat, adalah tidak material terhadap laporan keuangan secara keseluruhan. Ikhtisar salah saji tersebut terlampir dalam representasi ini."' },
        ...(repItems.length ? [{ type: 'table', head: ['Ref', 'FS Line', 'Efek Laba (jt)'], body: repItems.map((m: { id: string; fsli?: string; pbt?: number }) => [m.id, m.fsli || '—', m.pbt ? fmt(m.pbt / 1e6, 0) : '—']) }] : [{ type: 'para', text: 'Tidak ada salah saji tidak dikoreksi.' }]),
        ...(exceedsOM || exceedsPM ? [{ type: 'para', text: 'Catatan: agregat salah saji tidak dikoreksi sebesar Rp ' + fmt(Math.abs(calc.rolloverNet) / 1e6, 0) + ' jt (' + (Math.abs(calc.rolloverNet) / om * 100).toFixed(0) + '% dari materialitas keseluruhan) — pertimbangan kualitatif (' + qualCount + ' faktor relevan) ikut dievaluasi.' }] : []),
        { type: 'signature', signers: [{ name: 'Manajemen', role: 'Direksi', at: amsDateIso() }] },
      ]}).catch(() => {});
  };

  return (
    <div className="grid split" style={{ gridTemplateColumns: '1fr 360px', gap: 12, alignItems: 'start' }}>
      <div className="grid" style={{ gap: 12 }}>
        <Panel noBody>
          <div className="panel-h"><h3>Riwayat Komunikasi</h3><div style={{ flex: 1 }} /><Badge kind="blue">SA 260 · SA 450.12</Badge></div>
          <div style={{ padding: 4 }}>
            {commLog.map((c, i) => (
              <div key={i} className="panel" style={{ margin: 8, padding: '10px 12px', boxShadow: 'none' }}>
                <div className="row jb ac" style={{ marginBottom: 4 }}>
                  <span className="row ac gap8"><Avatar name={c.who} size={22} /><span style={{ fontSize: 12, fontWeight: 700 }}>{c.who}</span><Badge kind="gray">{c.kind}</Badge></span>
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
              <Btn sm onClick={onExportSAD} disabled={exporting}><I.download size={13} /> {exporting ? 'Menyiapkan…' : 'Lampiran SUM'}</Btn>
              <Btn sm onClick={onExportRep}><I.doc size={13} /> Surat Representasi</Btn>
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
                <span style={{ fontSize: 12, fontWeight: 700, color: `var(--${concl.k})` }}>
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



/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { SADLedger, SAD_SEED };
