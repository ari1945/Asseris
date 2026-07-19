/* [codemod] ESM imports */
import React from 'react';
import { useAmsPersist, useFirm } from './contexts';
import { I } from './icons';
import { SubBar } from './shell';
import { Badge, Btn, Panel, Tabs } from './ui';
import { amsExportPdf } from './export_pdf';

/* ============================================================
   Asseris — Audit Opinion Generator
   Four-stage flow: Penentuan → Penyusun → KAM → Reviu & TTD
   (SA 700 / 705 / 701 / 706 / 570 / 710 / 720)
   ============================================================ */
const { useState: useStateO } = React;

/* F2/PR-B — shape KAM diperkaya: fsRef (rujukan LK/CALK, SA 701 ¶13) + include
   (toggle sertakan-di-laporan). Field baru OPSIONAL & backward-compatible: doc
   lama tanpa keduanya tetap valid (include absen = disertakan; fsRef absen = ''). */
const DEFAULT_KAMS_O = [
  { id: 'k1', risk: 'R-01', title: 'Pengakuan Pendapatan', why: 'Pendapatan diakui dari sejumlah besar transaksi dengan syarat yang beragam, dan terdapat tekanan untuk memenuhi ekspektasi pasar menjelang akhir periode — menimbulkan risiko pengakuan dini (cut-off).', how: 'Kami mengevaluasi kebijakan pengakuan pendapatan, menguji pisah batas (cut-off) atas transaksi signifikan di sekitar tanggal pelaporan, mengonfirmasi piutang, dan menginspeksi dokumen pengiriman serta perjanjian penjualan.', wpRef: 'C-300 · C-310', fsRef: 'CALK 3 & 24', include: true },
  { id: 'k2', risk: 'R-02', title: 'Penilaian Persediaan', why: 'Persediaan diukur pada nilai terendah antara biaya perolehan dan nilai realisasi neto; penentuan keusangan dan NRV melibatkan pertimbangan signifikan manajemen.', how: 'Kami mengobservasi stock opname, menguji perhitungan NRV terhadap harga jual aktual pascaperiode, dan mengevaluasi kelayakan cadangan keusangan persediaan.', wpRef: 'D-200', fsRef: 'CALK 9', include: true },
  { id: 'k3', risk: 'R-03', title: 'Cadangan Kerugian Penurunan Nilai Piutang (PSAK 71)', why: 'Estimasi kerugian kredit ekspektasian (ECL) bersifat judgmental dan sensitif terhadap asumsi loss rate serta data umur piutang.', how: 'Kami menguji model ECL, mengevaluasi kewajaran asumsi loss rate, menelusuri data umur piutang ke sumbernya, dan melakukan analisis sensitivitas.', wpRef: 'C-340', fsRef: 'CALK 8 & 31', include: true },
];

/* F2/PR-E — SSOT tunggal paragraf auditor pendahulu (SA 710 ¶13). Fakta pendahulu
   (periode lalu, jenis opini lalu, tanggal laporan lalu, nama) dulu HARDCODE TRIPLIKAT
   di view_opinion (OP_TXT.comparative), view_sa705 & view_sa710. Kini tinggal di
   opinionDoc.v1.comp — modul opini = SSOT konten laporan (Constraint §6); sa710 =
   permukaan penulisan (lensa), sa705 = konsumen. `comparativeParagraph` menurunkan
   teks tunggal yang dibaca ketiganya. Backward-compat: doc lama tanpa `comp` → default. */
type PredOpinionType = 'unmodified' | 'qualified' | 'adverse' | 'disclaimer';
const PRED_OPINION_LABEL: Record<PredOpinionType, string> = {
  unmodified: 'opini tanpa modifikasian',
  qualified: 'opini wajar dengan pengecualian',
  adverse: 'opini tidak wajar',
  disclaimer: 'tidak menyatakan suatu opini',
};
const DEFAULT_COMP_O = { priorPeriodEnd: '31 Desember 2024', predOpinion: 'unmodified' as PredOpinionType, predDate: '18 Maret 2025', predName: '' };

/* Paragraf komparatif tunggal — pendekatan (angka koresponding vs LK komparatif) ×
   fakta pendahulu. Pure & diekspor agar opini (laporan+PDF), sa705 & sa710 memakainya
   tanpa menyalin teks. `comp` boleh sebagian/absen (doc lama) → jatuh ke default. */
function comparativeParagraph(client: string, mode: string, comp?: Partial<typeof DEFAULT_COMP_O>): string {
  const c = comp || {};
  const end = c.priorPeriodEnd || DEFAULT_COMP_O.priorPeriodEnd;
  const date = c.predDate || DEFAULT_COMP_O.predDate;
  const who = c.predName ? `auditor independen ${c.predName}` : 'auditor independen lain';
  const op = PRED_OPINION_LABEL[(c.predOpinion as PredOpinionType)] || PRED_OPINION_LABEL.unmodified;
  return mode === 'corresponding'
    ? `Audit atas laporan keuangan ${client} untuk tahun yang berakhir ${end} (angka koresponding) dilaksanakan oleh ${who} yang menyatakan ${op} pada tanggal ${date} (SA 710).`
    : `Laporan keuangan komparatif ${client} untuk tahun yang berakhir ${end} telah diaudit oleh ${who} yang menyatakan ${op} pada tanggal ${date} (SA 710).`;
}

const DEFAULT_DOC_O = {
  type: 'unmodified',
  opts: { kam: true, gc: false, eom: false, om: false, comparative: true, otherInfo: true, legalReg: false },
  compMode: 'corresponding',
  /* F2/PR-E — fakta paragraf auditor pendahulu (SA 710). Ditulis di sa710, dibaca di sini & sa705. */
  comp: DEFAULT_COMP_O,
  basisText: 'Persediaan dinyatakan sebesar Rp 78,9 miliar. Kami tidak dapat memperoleh bukti audit yang cukup dan tepat mengenai kuantitas persediaan di gudang cabang karena kami tidak menghadiri perhitungan fisik persediaan.',
  kams: DEFAULT_KAMS_O,
  /* F2/PR-B — kumpulan hal yang dikomunikasikan ke TCWG namun BUKAN KAM (SA 701 ¶18):
     dokumentasi alasan pengecualian. Diedit di sa701 (Keterkaitan & TCWG); tak masuk laporan. */
  kamExcluded: [] as { id: string; matter: string; reason: string }[],
  scope: 'sufficient', misOverride: 'auto', gcStatus: 'none', method: 'rollover',
  reportDate: '2026-03-14', dualDate: '', signer: 'partner1',
  signoff: { manager: (null as any), partner: (null as any), eqr: (null as any) }, checklist: {},
  opinionBasis: '', opinionDecision: (null as any),
  finalized: false, finalizedDate: '',
};

/* W10.5 — opinion report prose, SINGLE-SOURCED so the on-screen preview (ReportBuilder) and the
   sealed PDF export (buildOpinionBlocks) can't drift. The four opinion paragraphs vary by type;
   the rest is standard SA 700 boilerplate. */
const OPINION_PARA_O = (type: any, basisTitle: any, client: any) => (({
  unmodified: `Menurut opini kami, laporan keuangan terlampir menyajikan secara wajar, dalam semua hal yang material, posisi keuangan ${client} tanggal 31 Desember 2025, serta kinerja keuangan dan arus kasnya untuk tahun yang berakhir pada tanggal tersebut, sesuai dengan Standar Akuntansi Keuangan di Indonesia.`,
  qualified: `Menurut opini kami, kecuali untuk dampak hal yang dijelaskan dalam paragraf "${basisTitle}", laporan keuangan terlampir menyajikan secara wajar, dalam semua hal yang material, posisi keuangan ${client} tanggal 31 Desember 2025, serta kinerja keuangan dan arus kasnya untuk tahun yang berakhir pada tanggal tersebut, sesuai dengan Standar Akuntansi Keuangan di Indonesia.`,
  adverse: `Menurut opini kami, karena signifikannya hal yang dijelaskan dalam paragraf "${basisTitle}", laporan keuangan terlampir tidak menyajikan secara wajar posisi keuangan ${client} tanggal 31 Desember 2025, serta kinerja keuangan dan arus kasnya untuk tahun yang berakhir pada tanggal tersebut, sesuai dengan Standar Akuntansi Keuangan di Indonesia.`,
  disclaimer: `Kami tidak menyatakan suatu opini atas laporan keuangan ${client} terlampir. Karena signifikannya hal yang dijelaskan dalam paragraf "${basisTitle}", kami tidak dapat memperoleh bukti audit yang cukup dan tepat untuk menyediakan suatu basis bagi opini audit atas laporan keuangan tersebut.`,
} as any)[type]);

const OP_TXT = {
  intro: (client: any) => `Kami telah mengaudit laporan keuangan ${client} (“Perusahaan”), yang terdiri dari laporan posisi keuangan tanggal 31 Desember 2025, serta laporan laba rugi, perubahan ekuitas, dan arus kas untuk tahun yang berakhir pada tanggal tersebut, dan suatu ikhtisar kebijakan akuntansi signifikan.`,
  basisStd: (modified: any) => `Kami melaksanakan audit kami berdasarkan Standar Audit (“SA”) yang ditetapkan oleh Institut Akuntan Publik Indonesia. Tanggung jawab kami menurut standar tersebut diuraikan lebih lanjut dalam paragraf Tanggung Jawab Auditor. Kami independen terhadap Perusahaan sesuai dengan ketentuan etika yang relevan, dan kami yakin bahwa bukti audit yang telah kami peroleh adalah cukup dan tepat untuk menyediakan suatu basis bagi opini ${modified ? '' : 'audit'} kami.`,
  gc: 'Kami mengarahkan perhatian pada Catatan atas laporan keuangan yang menjelaskan adanya ketidakpastian material yang dapat menyebabkan keraguan signifikan atas kemampuan Perusahaan untuk mempertahankan kelangsungan usahanya. Opini kami tidak dimodifikasi sehubungan dengan hal tersebut.',
  eom: 'Kami mengarahkan perhatian pada Catatan atas laporan keuangan mengenai penerapan PSAK 73 “Sewa” yang pertama kali diterapkan pada tahun berjalan. Opini kami tidak dimodifikasi sehubungan dengan hal tersebut.',
  kamIntro: 'Hal audit utama adalah hal-hal yang, menurut pertimbangan profesional kami, merupakan hal yang paling signifikan dalam audit kami atas laporan keuangan periode kini. Hal-hal tersebut ditangani dalam konteks audit kami atas laporan keuangan secara keseluruhan, dan kami tidak menyatakan opini terpisah atas hal-hal tersebut.',
  om: 'Laporan keuangan ini disusun untuk memenuhi ketentuan pelaporan kepada Otoritas Jasa Keuangan. Akibatnya, laporan keuangan mungkin tidak sesuai untuk tujuan lain.',
  otherInfo: 'Manajemen bertanggung jawab atas informasi lain, yang terdiri dari informasi yang tercakup dalam Laporan Tahunan, tetapi tidak termasuk laporan keuangan dan laporan auditor kami atasnya. Opini kami atas laporan keuangan tidak mencakup informasi lain tersebut dan kami tidak menyatakan suatu bentuk kesimpulan asurans apa pun atasnya. Sehubungan dengan audit kami, tanggung jawab kami adalah membaca informasi lain dan, dalam melakukannya, mempertimbangkan apakah terdapat inkonsistensi material dengan laporan keuangan.',
  mgmtResp: 'Manajemen bertanggung jawab atas penyusunan dan penyajian wajar laporan keuangan sesuai dengan Standar Akuntansi Keuangan di Indonesia, dan atas pengendalian internal yang dipandang perlu untuk memungkinkan penyusunan laporan keuangan yang bebas dari kesalahan penyajian material.',
  auditorResp: 'Tujuan kami adalah untuk memperoleh keyakinan memadai tentang apakah laporan keuangan secara keseluruhan bebas dari kesalahan penyajian material, baik yang disebabkan oleh kecurangan maupun kesalahan, dan untuk menerbitkan laporan auditor yang mencakup opini kami. Keyakinan memadai merupakan keyakinan tingkat tinggi, namun bukan merupakan jaminan bahwa audit yang dilaksanakan berdasarkan SA akan selalu mendeteksi kesalahan penyajian material yang ada.',
  legalReg: 'Sebagaimana diwajibkan oleh peraturan perundang-undangan, kami melaporkan bahwa pembukuan dan catatan yang diwajibkan telah diselenggarakan secara memadai sesuai dengan ketentuan yang berlaku.',
  /* comparative dipindah ke `comparativeParagraph` (SSOT, diturunkan dari doc.comp) — F2/PR-E. */
};

/* Ordered body blocks for the sealed PDF — mirrors ReportBuilder's preview, same prose source. */
function buildOpinionBlocks(doc: any, client: any, O: any) {
  const o = O.OPINIONS[doc.type];
  const modified = doc.type !== 'unmodified';
  const showKam = doc.opts.kam && doc.type !== 'disclaimer';
  const blocks: any[] = [
    { type: 'para', text: `Kepada Yth. Para Pemegang Saham, Dewan Komisaris, dan Direksi — ${client}` },
    { type: 'heading', text: 'Opini' + (modified ? ' ' + o.title : '') },
    { type: 'para', text: OP_TXT.intro(client) },
    { type: 'para', text: OPINION_PARA_O(doc.type, o.basisTitle, client) },
    { type: 'heading', text: o.basisTitle },
  ];
  if (modified) blocks.push({ type: 'para', text: doc.basisText });
  blocks.push({ type: 'para', text: OP_TXT.basisStd(modified) });
  if (doc.opts.gc) blocks.push({ type: 'heading', text: 'Ketidakpastian Material Terkait Kelangsungan Usaha' }, { type: 'para', text: OP_TXT.gc });
  if (doc.opts.eom) blocks.push({ type: 'heading', text: 'Penekanan Suatu Hal' }, { type: 'para', text: OP_TXT.eom });
  if (showKam) {
    blocks.push({ type: 'heading', text: 'Hal-Hal Audit Utama' }, { type: 'para', text: OP_TXT.kamIntro });
    // F2/PR-B — hanya KAM yang ditandai disertakan (include !== false) yang masuk laporan.
    doc.kams.filter((k: { include?: boolean }) => k.include !== false).forEach((k: any, i: any) => {
      blocks.push({ type: 'para', text: `${i + 1}. ${k.title}` });
      if (k.why) blocks.push({ type: 'para', text: k.why + (k.fsRef ? ` (Rujukan: ${k.fsRef}.)` : '') });
      if (k.how) blocks.push({ type: 'para', text: `Penanganan audit — ${k.how}` });
      if (k.wpRef) blocks.push({ type: 'para', text: `Ref. KKP: ${k.wpRef}` });
    });
  }
  if (doc.opts.om) blocks.push({ type: 'heading', text: 'Hal Lain' }, { type: 'para', text: OP_TXT.om });
  if (doc.opts.otherInfo) blocks.push({ type: 'heading', text: 'Informasi Lain' }, { type: 'para', text: OP_TXT.otherInfo });
  blocks.push(
    { type: 'heading', text: 'Tanggung Jawab Manajemen dan Pihak yang Bertanggung Jawab atas Tata Kelola' },
    { type: 'para', text: OP_TXT.mgmtResp },
    { type: 'heading', text: 'Tanggung Jawab Auditor atas Audit Laporan Keuangan' },
    { type: 'para', text: OP_TXT.auditorResp },
  );
  if (doc.opts.legalReg) blocks.push({ type: 'heading', text: 'Laporan atas Ketentuan Hukum dan Regulasi Lain' }, { type: 'para', text: OP_TXT.legalReg });
  if (doc.opts.comparative) blocks.push({ type: 'para', text: comparativeParagraph(client, doc.compMode, doc.comp) });
  const signer = O.SIGNERS[doc.signer] || O.SIGNERS.partner1;
  blocks.push({ type: 'signature', signers: [{ label: 'KAP Wijaya Hartono & Rekan', name: signer.name, role: `${signer.role} · Izin AP No. ${signer.reg}`, at: `Jakarta, ${fmtDateID(doc.reportDate)}` }] });
  return blocks;
}

function AuditOpinionGen() {
  const { activeClient, activeEngagement } = useFirm();
  const O = window.AMSOpinion;
  /* engagement-scoped (AMS_PERSIST_SCOPE: 'opinionDoc.v1' → engagement) — isolasi W7.5
     & RBAC WP_EDIT (bukan firm/FIRM_ADMIN). scopeId = perikatan aktif otomatis. */
  const [doc, setDoc] = useAmsPersist('opinionDoc.v1', () => DEFAULT_DOC_O);
  const patch = (p: any) => setDoc((d: any) => ({ ...d, ...p }));
  const [tab, setTab] = useStateO('determine');
  const [exporting, setExporting] = useStateO(false);

  // W10.5 — sealed audit-opinion PDF built from the SAME prose the preview renders (OP_TXT /
  // buildOpinionBlocks), so the document and its on-screen twin can't diverge.
  const onExportPdf = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      await amsExportPdf({
        kind: 'opinion', scope: 'engagement', scopeId: activeEngagement?.id,
        fileName: `Laporan Auditor Independen - ${client}.pdf`,
        firm: 'KAP Wijaya Hartono & Rekan',
        title: 'Laporan Auditor Independen',
        refNo: 'No. 142/WHR-CPA/AR/III/2026',
        meta: [`${activeEngagement?.id || ''} · ${client} · FY2025`, `${o.title} (SA 700/705/701)`],
        blocks: buildOpinionBlocks(doc, client, O),
      });
    } finally {
      setExporting(false);
    }
  };

  const o = O.OPINIONS[doc.type];
  const client = activeClient?.name || 'PT Sentosa Makmur Tbk';
  const kamCount = doc.opts.kam && doc.type !== 'disclaimer' ? doc.kams.filter((k: { include?: boolean }) => k.include !== false).length : 0;
  const signedCount = Object.values(doc.signoff).filter(Boolean).length;

  const TABS = [
    { id: 'determine', label: 'Penentuan Opini' },
    { id: 'builder', label: 'Penyusun Laporan' },
    { id: 'kam', label: 'Hal Audit Utama', count: kamCount },
    { id: 'signoff', label: 'Reviu & Tanda Tangan', count: signedCount || null },
  ];

  return (
    <>
      <SubBar moduleId="opinion" right={
        <div className="row gap8 ac">
          <Badge kind={o.k}>{o.short}</Badge>
          {doc.finalized && <Badge kind="green">Final</Badge>}
          <Badge kind="blue">SA 700 · 705 · 701</Badge>
          {tab === 'builder' && <Btn sm onClick={() => window.amsPrintDoc()}><I.doc size={13} /> Cetak</Btn>}
          {tab === 'builder' && <Btn sm onClick={onExportPdf} disabled={exporting}><I.download size={13} /> {exporting ? 'Menyiapkan…' : 'Export PDF'}</Btn>}
          <Btn sm variant="primary" onClick={() => setTab('signoff')}><I.checkCircle size={14} /> {doc.finalized ? 'Lihat Status' : 'Finalisasi'}</Btn>
        </div>
      } />
      <div className="view-scroll">
        <div className="view-pad" style={{ display: 'grid', gap: 12 }}>
          <OpinionFlowBar tab={tab} doc={doc} O={O} />
          <Tabs tabs={TABS} active={tab} onChange={setTab} />
          {tab === 'determine' && <><O.DeterminationPanel doc={doc} patch={patch} /><O.OpinionDecisionTree doc={doc} patch={patch} /></>}
          {tab === 'builder' && <ReportBuilder doc={doc} patch={patch} client={client} O={O} />}
          {tab === 'kam' && <O.KAMWorkshop doc={doc} patch={patch} />}
          {tab === 'signoff' && <O.OpinionSignoff doc={doc} patch={patch} />}
        </div>
      </div>
    </>
  );
}

/* progress strip across the 4 stages */
function OpinionFlowBar({ doc, O }: any) {
  const rec = O.recommendOpinion({
    misSev: doc.misOverride === 'auto' ? O.classifyMis(O.aggUncorr(doc.method), 4_250_000_000).sev : doc.misOverride,
    scope: doc.scope, gc: doc.gcStatus,
  });
  const aligned = rec.opinion === doc.type;
  const steps = [
    { label: 'Opini ditentukan', ok: true, note: O.OPINIONS[doc.type].title },
    { label: 'Rekomendasi selaras', ok: aligned, note: aligned ? 'Konsisten SA 705' : 'Tinjau ulang' },
    { label: 'KAM disusun', ok: doc.type === 'disclaimer' || !doc.opts.kam || doc.kams.length > 0, note: (doc.kams.length || 0) + ' hal' },
    { label: 'Tanda tangan', ok: Object.values(doc.signoff).filter(Boolean).length >= 2, note: doc.finalized ? 'Difinalisasi' : Object.values(doc.signoff).filter(Boolean).length + '/3' },
  ];
  return (
    <div className="panel row ac" style={{ padding: '9px 14px', gap: 0, flexWrap: 'wrap' }}>
      {steps.map((s, i) => (
        <React.Fragment key={i}>
          <div className="row ac gap8" style={{ flex: '0 0 auto' }}>
            <span style={{ width: 22, height: 22, borderRadius: '50%', background: s.ok ? 'var(--green)' : 'var(--surface-3)', color: s.ok ? '#fff' : 'var(--ink-3)', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 11 }}>{s.ok ? <I.check size={12} /> : i + 1}</span>
            <div><div style={{ fontSize: 12, fontWeight: 600 }}>{s.label}</div><div className="tiny muted">{s.note}</div></div>
          </div>
          {i < steps.length - 1 && <div style={{ flex: 1, height: 2, background: 'var(--line)', margin: '0 12px', minWidth: 24 }} />}
        </React.Fragment>
      ))}
    </div>
  );
}

/* ============================================================
   TAB 2 — Report Builder + live document preview
   ============================================================ */
function ReportBuilder({ doc, patch, client, O }: any) {
  const { activeClient } = useFirm();
  const o = O.OPINIONS[doc.type];
  const modified = doc.type !== 'unmodified';
  const toggle = (k: any) => patch({ opts: { ...doc.opts, [k]: !doc.opts[k] } });
  const signer = O.SIGNERS[doc.signer] || O.SIGNERS.partner1;
  const showKam = doc.opts.kam && doc.type !== 'disclaimer';

  const opinionPara = OPINION_PARA_O(doc.type, o.basisTitle, client);

  const DocH = O.DocH;

  return (
    <div className="grid" style={{ gridTemplateColumns: '320px 1fr', gap: 12, alignItems: 'start' }}>
      {/* config column */}
      <div className="grid" style={{ gap: 12 }}>
        <Panel title="Jenis Opini" sub="SA 705">
          <div style={{ display: 'grid', gap: 7 }}>
            {Object.entries(O.OPINIONS).map(([k, v]: [any, any]) => (
              <label key={k} className="row ac gap8" style={{ padding: '8px 10px', borderRadius: 7, cursor: 'pointer', border: '1px solid ' + (doc.type === k ? 'var(--blue)' : 'var(--line)'), background: doc.type === k ? 'var(--blue-050)' : '#fff' }} onClick={() => patch({ type: k })}>
                <span style={{ width: 15, height: 15, borderRadius: '50%', border: '2px solid ' + (doc.type === k ? 'var(--blue)' : 'var(--line-strong)'), display: 'grid', placeItems: 'center' }}>{doc.type === k && <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--blue)' }} />}</span>
                <span style={{ flex: 1, fontSize: 12.5, fontWeight: 600 }}>{v.title}</span>
                <Badge kind={v.k}>{v.short}</Badge>
              </label>
            ))}
          </div>
        </Panel>

        {modified && (
          <Panel title="Basis Modifikasi" sub="Uraian hal yang mendasari">
            <textarea value={doc.basisText} onChange={(e: any) => patch({ basisText: e.target.value })} className="input" style={{ width: '100%', height: 110, padding: 9, resize: 'vertical', lineHeight: 1.5, fontFamily: 'var(--ui)' }} />
          </Panel>
        )}

        <Panel title="Paragraf Tambahan">
          <div style={{ display: 'grid', gap: 2 }}>
            {[
              ['kam', 'Hal Audit Utama (KAM)', 'SA 701'],
              ['gc', 'Ketidakpastian Material — Going Concern', 'SA 570'],
              ['eom', 'Penekanan Suatu Hal (EOM)', 'SA 706'],
              ['om', 'Hal Lain (Other Matter)', 'SA 706'],
              ['otherInfo', 'Informasi Lain', 'SA 720'],
              ['legalReg', 'Ketentuan Hukum & Regulasi Lain', 'SA 700.43'],
              ['comparative', 'Informasi Komparatif', 'SA 710'],
            ].map(([k, lbl, sa]) => (
              <label key={k} className="row ac gap8" style={{ padding: '8px 4px', cursor: 'pointer', borderBottom: '1px solid var(--line-soft)' }} onClick={() => toggle(k)}>
                <span style={{ flex: '0 0 32px', width: 32, height: 18, borderRadius: 9, background: doc.opts[k] ? 'var(--blue)' : 'var(--line-strong)', position: 'relative', transition: '.15s' }}>
                  <span style={{ position: 'absolute', top: 2, left: doc.opts[k] ? 16 : 2, width: 14, height: 14, borderRadius: '50%', background: '#fff', transition: '.15s' }} />
                </span>
                <span style={{ flex: 1, fontSize: 12, fontWeight: 600 }}>{lbl}</span>
                <span className="tiny muted mono">{sa}</span>
              </label>
            ))}
          </div>
          {doc.opts.comparative && (
            <div style={{ marginTop: 9 }}>
              <div className="tiny muted upper" style={{ marginBottom: 5 }}>Pendekatan komparatif</div>
              <div className="seg" style={{ width: '100%' }}>
                {[['corresponding', 'Angka Koresponding'], ['comparative', 'LK Komparatif']].map(([v, l]) =>
                  <button key={v} className={doc.compMode === v ? 'on' : ''} style={{ flex: 1, fontSize: 11 }} onClick={() => patch({ compMode: v })}>{l}</button>)}
              </div>
            </div>
          )}
        </Panel>

        <Panel title="Penandatangan & Tanggal">
          <div className="grid" style={{ gap: 9 }}>
            <div><div className="tiny muted upper" style={{ marginBottom: 4 }}>Rekan penandatangan</div>
              <select className="select" style={{ width: '100%' }} value={doc.signer} onChange={(e: any) => patch({ signer: e.target.value })}>
                {Object.entries(O.SIGNERS).map(([k, s]: [any, any]) => <option key={k} value={k}>{s.name} ({s.reg})</option>)}
              </select></div>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 9 }}>
              <div><div className="tiny muted upper" style={{ marginBottom: 4 }}>Tanggal laporan</div>
                <input type="date" className="input" style={{ width: '100%' }} value={doc.reportDate} onChange={(e: any) => patch({ reportDate: e.target.value })} /></div>
              <div><div className="tiny muted upper" style={{ marginBottom: 4 }}>Dual dating</div>
                <input type="date" className="input" style={{ width: '100%' }} value={doc.dualDate} onChange={(e: any) => patch({ dualDate: e.target.value })} /></div>
            </div>
            <div className="tiny muted">Dual dating (SA 560) hanya untuk peristiwa kemudian spesifik setelah tanggal laporan.</div>
          </div>
        </Panel>
      </div>

      {/* live preview */}
      <Panel noBody style={{ overflow: 'hidden' }}>
        <div className="panel-h" style={{ background: 'var(--surface-2)' }}>
          <h3>Pratinjau Laporan</h3><span className="sub">diperbarui otomatis</span>
          <div style={{ flex: 1 }} />
          {doc.finalized && <Badge kind="green">Final · {doc.finalizedDate}</Badge>}
          <Badge kind={o.k}>{o.title}</Badge>
        </div>
        <div style={{ background: '#e7eaef', padding: 20, maxHeight: 'calc(100vh - 240px)', overflow: 'auto' }}>
          <div className="doc-paper" style={{ background: '#fff', maxWidth: 660, margin: '0 auto', padding: '46px 52px', boxShadow: 'var(--shadow)', fontSize: 12.5, lineHeight: 1.7, color: '#1a2730', position: 'relative' }}>
            {doc.finalized && <div style={{ position: 'absolute', top: 40, right: 30, border: '2.5px solid var(--green)', color: 'var(--green)', padding: '4px 12px', borderRadius: 6, fontWeight: 800, fontSize: 12, letterSpacing: '.1em', transform: 'rotate(8deg)', opacity: 0.85 }}>DITERBITKAN</div>}
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: '.04em' }}>LAPORAN AUDITOR INDEPENDEN</div>
              <div className="mono" style={{ fontSize: 10.5, color: '#7a8893', marginTop: 4 }}>No. 142/WHR-CPA/AR/III/2026</div>
            </div>

            <p style={{ margin: '0 0 4px' }}>Kepada Yth.</p>
            <p style={{ margin: '0 0 4px', fontWeight: 700 }}>Para Pemegang Saham, Dewan Komisaris, dan Direksi</p>
            <p style={{ margin: '0 0 20px', fontWeight: 700 }}>{client}</p>

            <DocH>Opini {modified ? o.title : ''}</DocH>
            <p style={{ margin: '0 0 12px', textAlign: 'justify' }}>{OP_TXT.intro(client)}</p>
            <p style={{ margin: '0 0 16px', textAlign: 'justify' }}>{opinionPara}</p>

            <DocH>{o.basisTitle}</DocH>
            {modified && <p style={{ margin: '0 0 10px', textAlign: 'justify' }}>{doc.basisText}</p>}
            <p style={{ margin: '0 0 16px', textAlign: 'justify' }}>{OP_TXT.basisStd(modified)}</p>

            {doc.opts.gc && <>
              <DocH>Ketidakpastian Material Terkait Kelangsungan Usaha</DocH>
              <p style={{ margin: '0 0 16px', textAlign: 'justify' }}>{OP_TXT.gc}</p>
            </>}

            {doc.opts.eom && <>
              <DocH>Penekanan Suatu Hal</DocH>
              <p style={{ margin: '0 0 16px', textAlign: 'justify' }}>{OP_TXT.eom}</p>
            </>}

            {showKam && <>
              <DocH>Hal-Hal Audit Utama</DocH>
              <p style={{ margin: '0 0 12px', textAlign: 'justify' }}>{OP_TXT.kamIntro}</p>
              {doc.kams.filter((k: { include?: boolean }) => k.include !== false).map((k: any, i: any) => (
                <div key={k.id} style={{ margin: '0 0 14px' }}>
                  <p style={{ margin: '0 0 4px', fontWeight: 700 }}>{i + 1}. {k.title}</p>
                  {k.why && <p style={{ margin: '0 0 4px', textAlign: 'justify' }}>{k.why}{k.fsRef ? ` (Rujukan: ${k.fsRef}.)` : ''}</p>}
                  {k.how && <p style={{ margin: 0, textAlign: 'justify' }}><i style={{ color: '#5a6770' }}>Penanganan audit — </i>{k.how}</p>}
                  {k.wpRef && <p className="mono" style={{ margin: '3px 0 0', fontSize: 10, color: '#9aa6ae' }}>Ref. KKP: {k.wpRef}</p>}
                </div>
              ))}
            </>}

            {doc.opts.om && <>
              <DocH>Hal Lain</DocH>
              <p style={{ margin: '0 0 16px', textAlign: 'justify' }}>{OP_TXT.om}</p>
            </>}

            {doc.opts.otherInfo && <>
              <DocH>Informasi Lain</DocH>
              <p style={{ margin: '0 0 16px', textAlign: 'justify' }}>{OP_TXT.otherInfo}</p>
            </>}

            <DocH>Tanggung Jawab Manajemen dan Pihak yang Bertanggung Jawab atas Tata Kelola</DocH>
            <p style={{ margin: '0 0 16px', textAlign: 'justify' }}>{OP_TXT.mgmtResp}</p>

            <DocH>Tanggung Jawab Auditor atas Audit Laporan Keuangan</DocH>
            <p style={{ margin: '0 0 ' + (doc.opts.legalReg || doc.opts.comparative ? '16px' : '20px'), textAlign: 'justify' }}>{OP_TXT.auditorResp}</p>

            {doc.opts.legalReg && <>
              <DocH>Laporan atas Ketentuan Hukum dan Regulasi Lain</DocH>
              <p style={{ margin: '0 0 16px', textAlign: 'justify' }}>{OP_TXT.legalReg}</p>
            </>}

            {doc.opts.comparative && <p style={{ margin: '0 0 20px', textAlign: 'justify', fontStyle: 'italic', color: '#5a6770' }}>{comparativeParagraph(client, doc.compMode, doc.comp)}</p>}

            <div style={{ marginTop: 30 }}>
              <p style={{ margin: '0 0 2px', fontWeight: 700 }}>KAP Wijaya Hartono &amp; Rekan</p>
              <div style={{ height: 40 }} />
              <p style={{ margin: '0 0 1px', fontWeight: 700, textDecoration: 'underline' }}>{signer.name}</p>
              <p style={{ margin: 0, color: '#5a6770' }}>{signer.role} · Izin Akuntan Publik No. {signer.reg}</p>
              <p style={{ margin: '8px 0 0', color: '#5a6770' }}>Jakarta, {fmtDateID(doc.reportDate)}{doc.dualDate ? ` (kecuali atas peristiwa kemudian tertentu — ${fmtDateID(doc.dualDate)})` : ''}</p>
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}

function fmtDateID(s: any) {
  if (!s) return '—';
  const M = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const [y, m, d] = s.split('-');
  return `${parseInt(d, 10)} ${M[parseInt(m, 10) - 1]} ${y}`;
}

Object.assign(window, { AuditOpinionGen });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { AuditOpinionGen };
/* F2/PR-A — seed opinionDoc.v1 di-single-source-kan agar modul lensa (view_sa705)
   memakai default IDENTIK. Bila sa705 dibuka sebelum modul opini pernah dirender,
   seed sama → tak ada mismatch/data-loss pada StateDoc bersama 'opinionDoc.v1'. */
export { DEFAULT_DOC_O };
/* F2/PR-E — SSOT paragraf komparatif/pendahulu (SA 710) dibagikan ke lensa sa710 & konsumen sa705. */
export { comparativeParagraph, DEFAULT_COMP_O, PRED_OPINION_LABEL };
export type { PredOpinionType };
