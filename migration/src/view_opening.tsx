/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { PRIOR_YEAR } from './data_part1';
import { useAudit, useAuth, useFirm, useAmsPersist, useInitialTab, useNav } from './contexts';
import { tieOutPriorYear, TIE_LABEL, SOFP_GROUPS } from './prior_year';
import type { TieResult, TieRow } from './prior_year';
import { WpPanel, useWpSignoff } from './wp_signoff';
import { CAP } from './rbac';
import { I } from './icons';
import { SubBar } from './shell';
import { Badge, Btn, Panel, Progress, Tabs } from './ui';
import { KvBox } from './view_analytical';
import { OB_RISK_FACTORS, openingScore, openingVerdict, predecessorReadiness, PREDECESSOR_STEPS } from './opening_assessment';
import { type AssessmentFactor } from './assessment_model';
import { amsExportPdf } from './export_pdf';
import { amsExportXlsx } from './export_xlsx';
import { buildOpeningBlocks, buildOpeningSheets, openingMemoMeta, openingMemoRefNo, openingMemoTitle, type OpeningMemoInput } from './opening_memo';

/* ============================================================
   Asseris — Opening Balance / Saldo Awal (SA 510)
   Deep workpaper: konteks perikatan, penelusuran saldo awal,
   prosedur spesifik, konsistensi kebijakan, dampak opini.
   ============================================================ */
const { useState: useStateOPN } = React;

/* ---- referensi statis ----
   ATURAN BERKAS INI (O1): apa pun yang ditulis di sini adalah TEMPLAT — pertanyaan,
   prosedur yang disarankan, kondisi standar. TIDAK ADA JAWABAN. Kolom hasil, kolom
   bukti-yang-diperoleh, dan flag "konsisten" dulu berdiri di sini sebagai konstanta
   modul: identik untuk setiap klien dan setiap perikatan, dirender sebagai badge
   hijau "Memadai". Auditor yang membuka modul ini melihat prosedur atas persediaan,
   piutang, aset tetap, sewa, dan imbalan kerja sudah dinilai memadai sebelum ia
   mengerjakan apa pun. Angka salah bisa dikoreksi; catatan bahwa bukti telah
   diperoleh padahal tidak, adalah dokumentasi palsu. */

/* Pustaka prosedur yang DISARANKAN atas saldo awal akun yang lazim signifikan
   (SA 510 ¶6). Bukan daftar pekerjaan yang telah dilakukan, dan bukan penilaian
   risiko perikatan ini: `risk` adalah risiko yang LAZIM melekat pada saldo awal
   akun tersebut, dipakai untuk mengurutkan perhatian. Penilaian risiko perikatan
   ini ada di tab "Penilaian Tahun Pertama" (mesin `openingScore`). */
const OB_PROC_LIBRARY = [
  { id: 'C', acct: 'Persediaan', lead: 'C', assertion: 'Keberadaan · Penilaian', risk: 'Signifikan',
    proc: 'Telaah hasil stock opname & valuasi persediaan akhir TA-1, lalu uji roll-back pergerakan ke saldo awal TA kini. Bandingkan metode kos antar-periode.',
    needs: 'Berita acara opname penutup TA-1 · kertas kerja uji NRV · rekap mutasi periode antara · KKP persediaan auditor TA lalu' },
  { id: 'B', acct: 'Piutang Usaha & CKPN', lead: 'B', assertion: 'Keberadaan · Penilaian', risk: 'Signifikan',
    proc: 'Telaah konfirmasi & aging schedule TA-1; uji penerimaan kas subsequent atas saldo awal piutang; evaluasi dasar CKPN (PSAK 71) pembukaan.',
    needs: 'Aging piutang penutup TA-1 · jawaban konfirmasi TA lalu · bukti penerimaan kas setelah tanggal neraca · model ECL pembukaan' },
  { id: 'E', acct: 'Aset Tetap & Akm. Penyusutan', lead: 'E', assertion: 'Keberadaan · Hak', risk: 'Moderat',
    proc: 'Rekonsiliasi register aset tetap ke saldo awal harga perolehan & akumulasi penyusutan; uji eksistensi sampel aset material; verifikasi kebijakan & umur ekonomis konsisten.',
    needs: 'Register aset tetap penutup TA-1 · bukti kepemilikan sampel · kebijakan penyusutan & umur ekonomis kedua periode' },
  { id: 'F', acct: 'Aset Hak-Guna & Liabilitas Sewa', lead: 'F', assertion: 'Kelengkapan · Penilaian', risk: 'Signifikan',
    proc: 'Evaluasi perhitungan penerapan awal PSAK 73 pada tanggal neraca awal (identifikasi sewa, masa sewa, tingkat diskonto inkremental). Bila diterapkan retrospektif modifikasian, saldo awal timbul dari transisi — bukan dibawa dari TA-1.',
    needs: 'Memo transisi PSAK 73 · daftar kontrak sewa · perhitungan nilai kini & dasar tingkat diskonto' },
  { id: 'H', acct: 'Liabilitas Imbalan Kerja', lead: 'H', assertion: 'Penilaian', risk: 'Moderat',
    proc: 'Telaah laporan aktuaria pembukaan & kewajaran asumsi (tingkat diskonto, kenaikan gaji, mortalita) dibanding TA-1; verifikasi kontinuitas saldo.',
    needs: 'Laporan aktuaria penutup TA-1 · rekonsiliasi liabilitas · data karyawan pendukung' },
];

/* Area kebijakan akuntansi yang wajib DIBANDINGKAN antar-periode (SA 510 ¶6(b)).
   Pertanyaannya tetap ada; jawabannya tidak — perbandingan kebijakan periode lalu
   vs periode kini adalah temuan perikatan, bukan konstanta aplikasi. */
const OB_POLICY_AREAS = [
  { area: 'Penilaian persediaan', ask: 'Dasar kos (FIFO / rata-rata tertimbang) & dasar NRV — sama dengan TA-1?' },
  { area: 'Penyusutan aset tetap', ask: 'Metode, umur ekonomis & nilai residu — sama dengan TA-1?' },
  { area: 'Pengakuan pendapatan', ask: 'Identifikasi kewajiban pelaksanaan & saat pengakuan (PSAK 72) — sama dengan TA-1?' },
  { area: 'CKPN piutang', ask: 'Pendekatan ECL, segmentasi & matriks provisi (PSAK 71) — sama dengan TA-1?' },
  { area: 'Akuntansi sewa', ask: 'Standar yang diterapkan & metode transisi bila berubah (PSAK 73 C5–C13) — sama dengan TA-1?' },
  { area: 'Imbalan kerja', ask: 'Metode aktuaria & perlakuan pengukuran kembali (PSAK 24) — sama dengan TA-1?' },
];

/* Kondisi SA 510 ¶10–13 — kutipan standar. Kolom "status" (clear/watch) beserta
   catatan "Tidak ditemukan salah saji saldo awal; carry-forward terverifikasi"
   DICABUT: ketiganya adalah kesimpulan perikatan, dan ketiganya tampil hijau
   bahkan ketika belum ada satu pun sumber TA-1 untuk dibandingkan. */
const OB_OPINION_MATRIX = [
  { cond: 'Bukti audit cukup & tepat atas saldo awal tidak dapat diperoleh', mod: 'WDP / Tidak Menyatakan Pendapat', ref: '¶10' },
  { cond: 'Saldo awal mengandung salah saji yang berdampak material thd periode berjalan', mod: 'WDP / Tidak Wajar', ref: '¶11' },
  { cond: 'Kebijakan akuntansi tidak konsisten / perubahan tidak dipertanggungjawabkan & diungkapkan', mod: 'WDP / Tidak Wajar', ref: '¶12' },
];

/* ============================================================ */
interface OBState {
  engType: 'lanjutan' | 'awal';
  factors: AssessmentFactor[];
  predSteps: Record<string, boolean>;
  /* Nama KAP pendahulu — DIISI AUDITOR. Dulu literal 'KAP Sutrisno, Bambang &
     Rekan' di badan komponen, dan ia TIDAK berhenti di layar: `buildMemoInput`
     mengirimnya lewat `predecessorName` ke `openingMemoMeta`, sehingga memo PDF/
     XLSX TERSEGEL menamai satu kantor akuntan tertentu sebagai auditor pendahulu
     klien mana pun yang sedang dibuka. */
  predName: string;
  safeguards: string;
  /* WARISAN — hanya DIBACA. Kesimpulan auditor kini disimpan di rantai kertas
     kerja kanonik (`wpState['opening'].conclusion`, lewat `WpConclusion`):
     satu tempat, dengan disposisi terstruktur, pelaku, dan tanggal. Field ini
     dipertahankan supaya nilai yang sudah ter-persist di `opening.v1` tidak
     hilang dari memo tersegel. */
  conclusion: string;
  concluded: boolean;
}
const defaultOB = (): OBState => ({ engType: 'lanjutan', factors: OB_RISK_FACTORS(), predSteps: {}, predName: '', safeguards: '', conclusion: '', concluded: false });

/* Tanggal neraca awal = hari pertama tahun buku perikatan. Dulu literal
   "1 Jan 2025" — benar hanya untuk satu siklus. */
function openingDateLabel(cycle: string): string {
  const m = /(\d{4})/.exec(cycle || '');
  return m ? `1 Jan ${m[1]}` : '—';
}

function OpeningBalance() {
  const { fmt } = AMS;
  const { wtb, priorYearBalances } = useAudit();
  const nav = useNav();
  const auth = useAuth();
  const firm = useFirm();
  const [tab, setTab] = useInitialTab('opening', 'konteks');
  const [st, setSt] = useAmsPersist('opening.v1', defaultOB);
  const s: OBState = st;
  /* Pengalaman TA-1 per klien — registri yang SAMA yang ditulis modul Keberlanjutan
     (`useAmsPersist('priorYear', PRIOR_YEAR)`). Dulu modul ini menuliskan sendiri
     badge hijau "Wajar Tanpa Modifikasian" dan KvBox "Opini TA-1: WTP" sebagai
     literal — salah untuk C-031 (WDP) dan C-040 (WTP-EoM), dan justru pada dua
     klien itulah saldo awal paling perlu dicurigai (SA 510 ¶9). */
  const [priorYearMap] = useAmsPersist('priorYear', PRIOR_YEAR);

  const engType: 'lanjutan' | 'awal' = s.engType === 'awal' ? 'awal' : 'lanjutan';
  const factors: AssessmentFactor[] = (s.factors && s.factors.length) ? s.factors : OB_RISK_FACTORS();
  const score = openingScore(factors);
  const rv = openingVerdict(score);
  const readiness = predecessorReadiness(s.predSteps || {});
  const canEdit = !!(auth && typeof auth.can === 'function' && auth.can(CAP.WP_EDIT));

  /* Kesimpulan saldo awal DITURUNKAN — dulu badge ini hardcoded hijau "Dapat Diandalkan",
     tampil sama persis baik ketika belum ada sumber TA-1 maupun ketika tie-out menyisakan
     selisih tak dijelaskan. Hijau kini menuntut dua hal sekaligus: bukti tie-out bersih DAN
     auditor menekan "Simpulkan" (pola PR-3 — status hanya dari auditor, bukan dari sistem). */
  const obTie: TieResult = tieOutPriorYear((wtb || []) as { code: string; name?: string; ly?: number; group?: string }[], priorYearBalances);
  const obExceptions = obTie.untied + obTie.missing + obTie.orphan;
  const obVerdict: { k: string; l: string; t: string } = !obTie.hasSource
    ? { k: 'amber', l: 'Belum Dapat Disimpulkan', t: 'Belum ada sumber saldo audited TA-1 — tak ada pembanding independen untuk menyimpulkan saldo awal (SA 510 ¶6).' }
    : obExceptions > 0
      ? { k: 'amber', l: 'Selisih Belum Dijelaskan', t: `${obTie.untied} selisih · ${obTie.missing} belum tertelusur · ${obTie.orphan} hilang dari TB berjalan.` }
      : !s.concluded
        ? { k: 'blue', l: 'Menunggu Simpulan Auditor', t: 'Tie-out bersih. Kesimpulan menanti tindakan auditor — tekan "Simpulkan".' }
        : { k: 'green', l: 'Dapat Diandalkan', t: 'Tie-out bersih dan telah disimpulkan auditor.' };

  const setEngType = (v: 'lanjutan' | 'awal') => setSt((p: OBState) => ({ ...p, engType: v }));
  const patchFactor = (i: number, patch: Partial<AssessmentFactor>) => setSt((p: OBState) => {
    const base = (p.factors && p.factors.length) ? p.factors : OB_RISK_FACTORS();
    return { ...p, factors: base.map((f, idx) => (idx === i ? { ...f, ...patch } : f)) };
  });
  const toggleStep = (id: string) => setSt((p: OBState) => ({ ...p, predSteps: { ...(p.predSteps || {}), [id]: !(p.predSteps || {})[id] } }));
  const setSafeguards = (v: string) => setSt((p: OBState) => ({ ...p, safeguards: v }));
  const toggleConcluded = () => setSt((p: OBState) => ({ ...p, concluded: !p.concluded }));

  const tabs = [
    { id: 'konteks', label: 'Konteks & Strategi' },
    { id: 'nilai', label: 'Penilaian Tahun Pertama' },
    { id: 'trace', label: 'Penelusuran Saldo' },
    /* "Prosedur Spesifik" → "Prosedur (Saran)": labelnya ikut menjanjikan bahwa
       isinya prosedur perikatan ini. Isinya pustaka. */
    { id: 'proc', label: 'Prosedur (Saran)' },
    { id: 'policy', label: 'Konsistensi Kebijakan' },
    { id: 'opini', label: 'Kesimpulan & Opini' },
  ];

  // Info klien perikatan aktif untuk memo tersegel.
  const engId = (firm && firm.activeEngagementId) || '';
  const eng = ((firm && firm.engagements) || []).find((e: { id: string; clientId?: string; partner?: string; fy?: string }) => e.id === engId);
  const client = ((firm && firm.clients) || []).find((c: { id: string; name?: string; partner?: string; since?: number }) => c.id === (eng && eng.clientId));
  const clientName = (client && client.name) || 'Klien';
  const partnerName = (eng && eng.partner) || (client && client.partner) || '';
  const cycle = (eng && eng.fy) || '';
  const firmName = ((AMS as { FIRM?: { name?: string } }).FIRM || {}).name || 'Kantor Akuntan Publik';

  /* Pengalaman TA-1 klien ini — dibaca, tidak dikarang. Kosong = belum dicatat. */
  const py: { fy?: string; opinion?: string; findings?: number; findingsNote?: string; uncorrected?: number } =
    (priorYearMap as Record<string, { fy?: string; opinion?: string; findings?: number; findingsNote?: string; uncorrected?: number }>)[(client && client.id) || ''] || {};
  const priorOpinion = py.opinion || '';
  /* WTP = tanpa modifikasi. Apa pun selain itu adalah opini termodifikasi dan
     memerlukan pertimbangan atas saldo awal (SA 510 ¶9). */
  const priorClean = priorOpinion === 'WTP';
  const tenure = (client && typeof client.since === 'number' && cycle && /(\d{4})/.test(cycle))
    ? Number(/(\d{4})/.exec(cycle)?.[1]) - client.since + 1 : 0;

  /* Auditor pendahulu — nama & status akses berasal dari isian auditor pada
     perikatan ini, bukan dari nama KAP yang ditulis di dalam kode. */
  const predName = (s.predName || '').trim();
  const predecessor = engType === 'awal'
    ? { name: predName || '— belum diisi —', note: predName ? 'Auditor pendahulu perikatan tahun pertama' : 'Nama auditor pendahulu belum diisi (SA 510 ¶6)' }
    : { name: '— (diaudit sendiri TA lalu)', note: 'Tidak ada auditor pendahulu' };
  const setPredName = (v: string) => setSt((p: OBState) => ({ ...p, predName: v }));

  /* Kesimpulan auditor = rantai kertas kerja kanonik, dengan jatuh-balik ke nilai
     warisan `opening.v1`. Sebelum arc ini `s.conclusion` DIKIRIM ke memo tersegel
     tetapi tak ada satu pun kontrol yang bisa mengisinya — memo selalu jatuh ke
     kalimat bawaan `buildOpeningBlocks`. */
  const wpOb = useWpSignoff('opening');
  const wpConcl: { text?: string; disposition?: string; by?: string; at?: string } | null = wpOb.conclusion || null;
  const obConclusionText = ((wpConcl && wpConcl.text) || s.conclusion || '').trim();

  const [busyExport, setBusyExport] = useStateOPN(false);
  const buildMemoInput = (): OpeningMemoInput => ({
    client: clientName, clientId: (client && client.id) || engId, partner: partnerName, cycle, engType,
    /* Hanya nama yang benar-benar diketik auditor yang boleh tersegel. Kosong
       → `openingMemoMeta` mencetak '—', bukan placeholder layar. */
    predecessorName: engType === 'awal' ? predName : '', score, verdict: rv.l, factors, safeguards: s.safeguards,
    predecessorSteps: PREDECESSOR_STEPS.map((step) => ({ label: step.label, done: !!(s.predSteps || {})[step.id] })),
    conclusion: obConclusionText, date: AMS.TODAY,
  });
  const doExport = async (kind: 'pdf' | 'xlsx') => {
    if (busyExport) return;
    setBusyExport(true);
    try {
      const mi = buildMemoInput();
      /* Saldo awal (SA 510) adalah pekerjaan PERIKATAN. `openingMemoMeta` mengembalikan
         pasangan [label, nilai] — dulu diserahkan apa adanya ke `meta` yang menuntut
         baris teks, dan tipe `any` menyembunyikannya: barisnya tercetak sebagai
         "label,nilai". Dirata-kan di sini. */
      const base = { kind: 'opening-memo', scope: 'engagement' as const, title: openingMemoTitle(mi),
        meta: openingMemoMeta(mi).map(([k, v]) => `${k}: ${v}`) };
      if (kind === 'pdf') await amsExportPdf({ ...base, refNo: openingMemoRefNo(mi), fileName: `Memo Saldo Awal - ${clientName}.pdf`, blocks: buildOpeningBlocks(mi) });
      else await amsExportXlsx({ ...base, fileName: `Memo Saldo Awal - ${clientName}.xlsx`, sheets: buildOpeningSheets(mi) });
    } finally { setBusyExport(false); }
  };

  return (
    <>
      <SubBar moduleId="opening" right={
        <div className="row gap8 ac">
          <Badge kind="blue">SA 510</Badge>
          <span className={'badge b-' + rv.k} style={{ fontSize: 11, padding: '2px 8px' }} title={'Skor risiko saldo awal ' + score.toFixed(2)}>{rv.l}</span>
          <Btn sm disabled={busyExport} onClick={() => doExport('pdf')}><I.download size={13} /> Memo Saldo Awal</Btn>
          <Btn sm variant={s.concluded ? 'ghost' : 'primary'} onClick={toggleConcluded}><I.check size={14} /> {s.concluded ? 'Dibuka kembali' : 'Simpulkan'}</Btn>
        </div>
      } />
      <div className="view-scroll"><div className="view-pad">

        {/* summary header */}
        <Panel noBody style={{ marginBottom: 12 }}>
          <div style={{ padding: '13px 16px', display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <div className="tiny muted upper" style={{ marginBottom: 3 }}>Jenis Perikatan</div>
              <div className="seg" style={{ width: 'fit-content' }}>
                <button className={engType === 'lanjutan' ? 'on' : ''} onClick={() => setEngType('lanjutan')}>Lanjutan</button>
                <button className={engType === 'awal' ? 'on' : ''} onClick={() => setEngType('awal')}>Perikatan Awal</button>
              </div>
            </div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Auditor Pendahulu</div><div style={{ fontWeight: 700, fontSize: 12, maxWidth: 200 }}>{predecessor.name}</div></div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Opini TA Lalu{py.fy ? ' (' + py.fy + ')' : ''}</div><div style={{ marginTop: 2 }}>{
              priorOpinion
                ? <Badge kind={priorClean ? 'green' : 'amber'}>{priorOpinion}</Badge>
                : <span className="tiny muted">belum dicatat</span>
            }</div></div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Tgl Neraca Awal</div><div className="mono" style={{ fontWeight: 700, fontSize: 12 }}>{openingDateLabel(cycle)}</div></div>
            <div style={{ flex: 1 }} />
            <div style={{ textAlign: 'right' }}>
              <div className="tiny muted upper" style={{ marginBottom: 3 }}>Kesimpulan Saldo Awal</div>
              <span title={obVerdict.t}><Badge kind={obVerdict.k} dot>{obVerdict.l}</Badge></span>
            </div>
          </div>
        </Panel>

        <div style={{ marginBottom: 12 }}><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>

        {tab === 'konteks' && <OBContext engType={engType} predecessor={predecessor} predName={predName} setPredName={setPredName} predSteps={s.predSteps || {}} toggleStep={toggleStep} readiness={readiness} canEdit={canEdit} py={py} priorOpinion={priorOpinion} priorClean={priorClean} tenure={tenure} score={score} rv={rv} />}
        {tab === 'nilai' && <OBAssessment engType={engType} factors={factors} score={score} rv={rv} patchFactor={patchFactor} safeguards={s.safeguards} setSafeguards={setSafeguards} canEdit={canEdit} readiness={readiness} />}
        {tab === 'trace' && <OBTrace wtb={wtb} fmt={fmt} priorYearBalances={priorYearBalances} nav={nav} />}
        {tab === 'proc' && <OBProcedures nav={nav} />}
        {tab === 'policy' && <OBPolicy />}
        {tab === 'opini' && <OBConclusion concluded={s.concluded} obVerdict={obVerdict} score={score} rv={rv} wpConcl={wpConcl} conclusionText={obConclusionText} canEdit={canEdit} nav={nav} memoRef={openingMemoRefNo(buildMemoInput())} />}

      </div></div>
    </>
  );
}

/* ---------------- Tab: Konteks & Strategi ---------------- */
function OBContext({ engType, predecessor, predName, setPredName, predSteps, toggleStep, readiness, canEdit, py, priorOpinion, priorClean, tenure, score, rv }: any) {
  return (
    <div className="grid split" style={{ gridTemplateColumns: '1fr 360px', gap: 12, alignItems: 'start' }}>
      <div className="grid" style={{ gap: 12 }}>
        <Panel noBody>
          <div className="panel-h"><h3>Tujuan & Lingkup (SA 510)</h3><div style={{ flex: 1 }} /></div>
          <div style={{ padding: 14 }}>
            <p style={{ margin: '0 0 12px', fontSize: 12, lineHeight: 1.55, color: 'var(--ink-2)' }}>
              Auditor harus memperoleh bukti audit yang cukup dan tepat mengenai apakah <b>saldo awal</b> mengandung
              salah saji yang berdampak material terhadap laporan keuangan periode berjalan, serta apakah <b>kebijakan
              akuntansi</b> yang tercermin dalam saldo awal telah diterapkan secara konsisten.
            </p>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              {[
                { ic: 'layers', t: 'Saldo Awal Terbawa', d: 'Saldo akhir TA-1 dibawa dengan benar / disajikan kembali jika perlu.' },
                { ic: 'scale', t: 'Konsistensi Kebijakan', d: 'Kebijakan akuntansi diterapkan konsisten antar-periode.' },
                { ic: 'shield', t: 'Dampak ke Opini', d: 'Evaluasi apakah temuan memodifikasi opini periode kini.' },
              ].map((c, i) => {
                const Ic = (I as any)[c.ic];
                return (
                  <div key={i} className="panel" style={{ padding: '11px 12px', boxShadow: 'none' }}>
                    <span style={{ color: 'var(--blue)' }}><Ic size={18} /></span>
                    <div style={{ fontWeight: 700, fontSize: 12, margin: '6px 0 3px' }}>{c.t}</div>
                    <div className="tiny muted" style={{ lineHeight: 1.4 }}>{c.d}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </Panel>

        {engType === 'awal' ? (
          <Panel noBody>
            <div className="panel-h"><h3>Komunikasi dengan Auditor Pendahulu (SA 510 ¶6 · SA 300)</h3><div style={{ flex: 1 }} /><Badge kind="amber">Perikatan Awal</Badge></div>
            <div style={{ padding: 14 }}>
              <div className="panel" style={{ padding: '9px 11px', background: 'var(--amber-bg)', borderColor: 'transparent', marginBottom: 12 }}>
                <div className="row ac gap8"><span style={{ color: 'var(--amber)' }}><I.alert size={15} /></span><span style={{ fontSize: 12, lineHeight: 1.4 }}>Perikatan tahun pertama — saldo awal belum diaudit oleh KAP ini. Prosedur tambahan wajib dilaksanakan.</span></div>
              </div>
              <div className="row ac gap8" style={{ marginBottom: 10 }}>
                <div style={{ flex: 1 }}><Progress value={readiness.pct} color={readiness.ready ? 'var(--green)' : 'var(--amber)'} /></div>
                <span className="tiny" style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{readiness.done}/{readiness.total} · {readiness.pct}%</span>
              </div>
              <div style={{ display: 'grid', gap: 0 }}>
                {PREDECESSOR_STEPS.map((step, i) => (
                  <label key={step.id} className="row gap8" style={{ padding: '9px 0', alignItems: 'flex-start', borderBottom: i < PREDECESSOR_STEPS.length - 1 ? '1px solid var(--line-soft)' : 0, cursor: canEdit ? 'pointer' : 'default' }}>
                    <input type="checkbox" checked={!!predSteps[step.id]} disabled={!canEdit} onChange={() => toggleStep(step.id)} style={{ marginTop: 2 }} />
                    <span style={{ fontSize: 12, lineHeight: 1.45 }}>{step.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </Panel>
        ) : (
          <Panel noBody>
            <div className="panel-h"><h3>Strategi Saldo Awal — Perikatan Lanjutan</h3><div style={{ flex: 1 }} />{tenure > 0 && <Badge kind="green">Tahun ke-{tenure}</Badge>}</div>
            <div style={{ padding: 14 }}>
              {/* Dulu paragraf ini menyatakan opini TA-1 (WTP) dan menyimpulkan
                  "risiko saldo awal rendah" — dua kesimpulan tetap, untuk klien mana pun.
                  Kini opini dibaca dari registri, dan tingkat risikonya berasal dari
                  penilaian berbobot yang benar-benar diisi auditor. */}
              <p style={{ margin: '0 0 10px', fontSize: 12, lineHeight: 1.55, color: 'var(--ink-2)' }}>
                Saldo awal berasal dari laporan keuangan periode lalu yang <b>diaudit sendiri oleh KAP ini</b>
                {priorOpinion
                  ? <> dengan opini <b>{priorOpinion}</b>{!priorClean && <> — opini termodifikasi; hal yang menyebabkan modifikasi wajib dipertimbangkan atas saldo awal (SA 510 ¶9)</>}.</>
                  : <>. Opini periode lalu belum dicatat pada registri klien.</>}
                {py.uncorrected ? <> Salah saji tak dikoreksi TA-1 tercatat sebesar Rp {Math.round((py.uncorrected || 0) / 1e6).toLocaleString('id-ID')} jt — telusuri dampaknya pada saldo awal.</> : null}
                {py.findingsNote ? <> Temuan TA-1: {py.findingsNote}.</> : null} Fokus prosedur diarahkan pada:
              </p>
              <div style={{ display: 'grid', gap: 6 }}>
                {[
                  'Verifikasi carry-forward saldo akhir audited TA-1 → saldo awal periode kini (lihat tab Penelusuran).',
                  'Evaluasi dampak penerapan awal standar baru terhadap saldo pembukaan, bila ada.',
                  'Konfirmasi konsistensi kebijakan akuntansi material (lihat tab Konsistensi Kebijakan).',
                ].map((t, i) => (
                  /* Bulatan hijau ✓ diganti bulatan netral: ketiganya adalah RENCANA
                     fokus, dan tanda centang membacanya sebagai sudah dikerjakan. */
                  <div key={i} className="row gap8 ac" style={{ fontSize: 12 }}>
                    <span style={{ color: 'var(--ink-4)', flex: '0 0 auto' }}><I.circle size={13} /></span>{t}
                  </div>
                ))}
              </div>
            </div>
          </Panel>
        )}
      </div>

      <div className="grid" style={{ gap: 12 }}>
        <Panel title="Profil Auditor Pendahulu">
          <div style={{ display: 'grid', gap: 8 }}>
            {/* Nama KAP pendahulu DIKETIK auditor. Nilai ini tersegel ke memo
                SA 510, jadi ia tak boleh berasal dari kode. */}
            <label className="field" style={{ gap: 3 }}>
              <span className="tiny muted upper">KAP Pendahulu</span>
              <input className="input" value={predName} disabled={!canEdit || engType !== 'awal'}
                onChange={(e: { target: { value: string } }) => setPredName(e.target.value)}
                placeholder={engType === 'awal' ? 'Nama KAP auditor pendahulu…' : 'Tidak berlaku — perikatan lanjutan'}
                style={{ width: '100%', fontSize: 12, padding: '5px 8px', background: canEdit && engType === 'awal' ? 'var(--surface)' : 'var(--surface-2)' }} />
            </label>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {/* "Diperoleh" dulu tetap, tanpa memandang apakah langkah izinnya
                  ditandai. Kini ia CERMIN dari langkah `consent` di daftar SA 510 ¶6. */}
              <KvBox label="Akses KKP" v={engType !== 'awal' ? 'N/A' : (predSteps.consent ? 'Diperoleh' : 'Belum')}
                accent={engType !== 'awal' ? 'var(--ink-3)' : (predSteps.consent ? 'var(--green)' : 'var(--amber)')} />
              <KvBox label={'Opini ' + (py.fy || 'TA-1')} v={priorOpinion || '—'}
                accent={priorOpinion ? (priorClean ? 'var(--green)' : 'var(--amber)') : 'var(--ink-3)'} />
            </div>
            <div className="tiny muted" style={{ lineHeight: 1.4 }}>{predecessor.note}.</div>
          </div>
        </Panel>
        <Panel title="Penilaian Risiko Saldo Awal">
          {/* Tiga baris tetap ("Risiko Inheren: Rendah · Risiko Pengendalian: Rendah ·
              Area Pertimbangan Tinggi: Sewa") DICABUT: itu kesimpulan penilaian risiko,
              ditulis sebagai konstanta, sementara mesin penilaian berbobot yang
              sesungguhnya sudah ada satu tab di sebelahnya. */}
          <div className="row ac jb" style={{ marginBottom: 8 }}>
            <span className="tiny muted upper">Skor tertimbang</span>
            <div className="row ac gap8">
              <span style={{ fontSize: 19, fontWeight: 800, color: 'var(--' + rv.k + ')' }}>{score.toFixed(2)}</span>
              <span className={'badge b-' + rv.k} style={{ fontSize: 11, padding: '2px 8px' }}>{rv.l}</span>
            </div>
          </div>
          <div className="tiny muted" style={{ lineHeight: 1.5 }}>
            Diturunkan dari {OB_RISK_FACTORS().length} faktor berbobot yang dinilai auditor pada tab
            <b> Penilaian Tahun Pertama</b>. Skor bawaan 3 = belum dinilai, bukan "risiko sedang" yang terbukti.
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ---------------- Tab: Penilaian Tahun Pertama (SA 510) ---------------- */
function OBAssessment({ engType, factors, score, rv, patchFactor, safeguards, setSafeguards, canEdit, readiness }: {
  engType: string; factors: AssessmentFactor[]; score: number; rv: { k: string; l: string };
  patchFactor: (i: number, p: Partial<AssessmentFactor>) => void; safeguards: string; setSafeguards: (v: string) => void;
  canEdit: boolean; readiness: { done: number; total: number; pct: number; ready: boolean };
}) {
  return (
    <div className="grid" style={{ gridTemplateColumns: '1.35fr 340px', gap: 12, alignItems: 'start' }}>
      <Panel noBody>
        <div className="panel-h"><h3>Penilaian Berbobot Risiko Saldo Awal (SA 510)</h3><div style={{ flex: 1 }} /><span className="tiny muted">skor 1–5 · bobot Σ100</span></div>
        <div style={{ padding: '14px 16px' }}>
          <div className="row ac jb" style={{ marginBottom: 10 }}>
            <span className="tiny muted upper">Skor tertimbang</span>
            <div className="row ac gap8">
              <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--' + rv.k + ')' }}>{score.toFixed(2)}</span>
              <span className={'badge b-' + rv.k} style={{ fontSize: 11, padding: '2px 8px' }}>{rv.l}</span>
            </div>
          </div>
          <div style={{ marginBottom: 12 }}><Progress value={score / 5 * 100} color={'var(--' + rv.k + ')'} /></div>
          <div style={{ display: 'grid', gap: 12 }}>
            {factors.map((f: AssessmentFactor, i: number) => (
              <div key={i}>
                <div className="row ac jb" style={{ gap: 8, marginBottom: 5 }}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{f.k} <span className="tiny muted">· bobot {f.w}</span></span>
                  <div className="row" style={{ gap: 4 }}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button key={n} disabled={!canEdit} onClick={() => patchFactor(i, { s: n })}
                        style={{
                          width: 24, height: 24, borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: canEdit ? 'pointer' : 'default',
                          border: '1px solid ' + (n <= f.s ? 'transparent' : 'var(--line-strong)'),
                          background: n <= f.s ? (f.s >= 4 ? 'var(--green)' : f.s >= 3 ? 'var(--amber)' : 'var(--red)') : 'var(--surface-2)',
                          color: n <= f.s ? '#fff' : 'var(--ink-4)',
                        }}>{n}</button>
                    ))}
                  </div>
                </div>
                <input className="input" value={f.note || ''} disabled={!canEdit}
                  onChange={(e: { target: { value: string } }) => patchFactor(i, { note: e.target.value })}
                  placeholder="Catatan/justifikasi penilai…"
                  style={{ width: '100%', fontSize: 12, padding: '5px 8px', background: canEdit ? 'var(--surface)' : 'var(--surface-2)' }} />
              </div>
            ))}
          </div>
        </div>
      </Panel>

      <div className="grid" style={{ gap: 12 }}>
        <Panel title="Prosedur Tambahan / Pengaman">
          <textarea className="input" value={safeguards || ''} disabled={!canEdit}
            onChange={(e: { target: { value: string } }) => setSafeguards(e.target.value)}
            placeholder="Prosedur tambahan atas risiko saldo awal (mis. telaah KKP pendahulu, uji roll-back, konfirmasi, pakar)…"
            style={{ width: '100%', minHeight: 90, fontSize: 12, padding: '6px 8px', resize: 'vertical', background: canEdit ? 'var(--surface)' : 'var(--surface-2)' }} />
        </Panel>
        {engType === 'awal' && (
          <Panel title="Kesiapan Auditor Pendahulu (SA 510 ¶6)">
            <div className="row ac gap8">
              <div style={{ flex: 1 }}><Progress value={readiness.pct} color={readiness.ready ? 'var(--green)' : 'var(--amber)'} /></div>
              <span className="tiny" style={{ fontWeight: 700 }}>{readiness.pct}%</span>
            </div>
            <div className="tiny muted" style={{ marginTop: 6 }}>{readiness.ready ? 'Seluruh langkah komunikasi selesai.' : (readiness.total - readiness.done) + ' langkah tersisa — lihat tab Konteks & Strategi.'}</div>
          </Panel>
        )}
        <Panel title="Interpretasi">
          <div className="tiny muted" style={{ lineHeight: 1.5 }}>
            <b>≥4,0</b> saldo awal andal · <b>3,0–3,9</b> perlu prosedur tambahan · <b>&lt;3,0</b> risiko tinggi (potensi modifikasi opini, SA 510 ¶10–13).
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ---------------- Tab: Penelusuran Saldo ---------------- */
function OBTrace({ wtb, fmt, priorYearBalances, nav }: any) {
  /* Lingkup dari `prior_year.SOFP_GROUPS` — daftar yang SAMA yang dipakai mesin
     tie-out. Dulu berkas ini menyalinnya sebagai `OB_SOFP_GROUPS`: dua daftar
     untuk satu lingkup, yang bisa menyimpang tanpa ada yang tahu. */
  const rows = wtb.filter((r: any) => SOFP_GROUPS.includes(r.group));
  let totClose = 0, totOpen = 0, totDiff = 0;
  const grouped = SOFP_GROUPS.map(g => ({ g, items: rows.filter((r: any) => r.group === g) })).filter(x => x.items.length);
  let matched = 0, transition = 0;

  /* PR-4c — pembanding INDEPENDEN. Sebelumnya kolom "Saldo Akhir TA-1 (Audited)" dan
     "Saldo Awal TA Kini" SAMA-SAMA dibaca dari `r.ly`, sehingga selisihnya nol secara
     konstruksi dan setiap akun selalu "Cocok" — kertas kerja yang tak membuktikan apa pun
     (SA 510 ¶6 menuntut bukti bahwa saldo awal dibawa dengan benar). */
  const tie: TieResult = tieOutPriorYear(rows, priorYearBalances);
  const bySrc = new Map<string, TieRow>();
  for (const t of tie.rows) bySrc.set(t.code, t);

  return (
    <Panel noBody>
      <div className="panel-h"><h3>Penelusuran Saldo Akhir Audited TA-1 → Saldo Awal TA Kini</h3><div style={{ flex: 1 }} /><span className="tiny muted">Posisi keuangan · nilai Rp juta</span></div>
      {!tie.hasSource && (
        <div className="row ac gap8" style={{ margin: '10px 14px 0', padding: '9px 11px', border: '1px solid var(--amber)', background: 'var(--amber-bg)', borderRadius: 6 }}>
          <span style={{ color: 'var(--amber)', flex: '0 0 auto' }}><I.alert size={16} /></span>
          <span style={{ fontSize: 12, lineHeight: 1.45, color: 'var(--ink-2)', flex: 1 }}>
            <b>Belum ada sumber saldo audited TA-1.</b> Tanpa pembanding independen, penelusuran ini hanya dapat menampilkan saldo yang dibawa TB berjalan —
            ia tak dapat menyimpulkan bahwa saldo awal benar (SA 510 ¶6). Muat sumbernya dari LK audited TA-1 / kertas kerja auditor pendahulu.
          </span>
          <Btn sm variant="primary" onClick={() => nav && nav('wtb', { from: 'opening' })}><I.layers size={13} /> Muat Saldo TA-1</Btn>
        </div>
      )}
      <div className="panel" style={{ margin: '0', padding: '8px 14px', borderRadius: 0, borderLeft: 0, borderRight: 0, borderTop: 0, background: 'var(--blue-050)', display: 'flex', gap: 18, fontSize: 12 }}>
        <span className="row ac gap6"><span style={{ width: 9, height: 9, borderRadius: 2, background: 'var(--green-solid)' }} /> Carry-forward cocok</span>
        <span className="row ac gap6"><span style={{ width: 9, height: 9, borderRadius: 2, background: 'var(--amber-solid)' }} /> Nihil di TA-1, bersaldo berjalan — periksa penerapan standar baru</span>
      </div>
      <table className="dtbl">
        <thead><tr>
          <th style={{ width: 70 }}>Kode</th><th>Akun</th><th style={{ width: 48 }}>Lead</th>
          <th className="num">Saldo Akhir TA-1 (Audited)</th><th className="num">Saldo Awal TA Kini</th>
          <th className="num">Selisih</th><th style={{ width: 130 }}>Status</th>
        </tr></thead>
        <tbody>
          {grouped.map(({ g, items }) => (
            <React.Fragment key={g}>
              <tr className="group-row"><td colSpan={7}>{g}</td></tr>
              {items.map((r: any) => {
                /* O4 — `OB_TRANSITION` DICABUT. Tiga saldo rupiah (1-2300 13.100 jt ·
                   2-1500 −3.050 jt · 2-2200 −10.050 jt) ditulis sebagai konstanta dan
                   MENIMPA kolom "Saldo Awal TA Kini", sehingga tabel menampilkan saldo
                   awal yang tak ada di neraca saldo perikatan mana pun — dan tak ada di
                   mesin sewa (`leasePortfolio`) juga. Yang tersisa di sini hanya fakta
                   yang bisa dibaca: akun posisi keuangan yang saldo awalnya NOL tetapi
                   bersaldo pada periode berjalan mungkin timbul dari penerapan standar
                   baru — itu ditandai sebagai PERTANYAAN, bukan diisi dengan angka. */
                const t = bySrc.get(r.code);
                const opening = r.ly;
                /* Kandidat transisi: tak ada yang dibawa dari TA-1, tapi ada saldo
                   berjalan. Butuh skedul transisi dari auditor — belum dimuat. */
                const isT = !opening && !!r.unadj;
                /* Sumber ada → pakai saldo audited TA-1 yang sesungguhnya. Tanpa sumber,
                   kolom kiri dikosongkan (—) alih-alih menyalin `ly` dan mengklaim cocok. */
                const priorClose: number | null = tie.hasSource && t && t.priorClose != null ? t.priorClose : null;
                /* Selisih diambil dari mesin, tidak dihitung ulang di sini — dulu kedua
                   permukaan memakai rumus sendiri dan menghasilkan angka berbeda untuk
                   akun yang sama (drawer WTB: sebesar saldo; di sini: "—"). */
                const diff = t ? t.diff : 0;
                totClose += priorClose || 0; totOpen += opening; totDiff += diff;
                if (isT) transition++; else if (tie.hasSource && t && t.status === 'tied') matched++;
                return (
                  <tr key={r.code}>
                    <td className="mono tiny muted">{r.code}</td>
                    <td className="truncate" style={{ maxWidth: 240 }}>{r.name}</td>
                    <td className="mono tiny" style={{ color: 'var(--blue)', fontWeight: 700 }}>{r.lead}</td>
                    <td className="num mono">{priorClose != null ? fmt(priorClose / 1e6, 0) : <span className="muted">—</span>}</td>
                    <td className="num mono">{fmt(opening / 1e6, 0)}</td>
                    <td className="num mono" style={{ color: diff === 0 ? 'var(--ink-4)' : 'var(--amber)' }}>{diff === 0 ? '—' : fmt(diff / 1e6, 0)}</td>
                    <td>{isT
                      ? <span title="Saldo awal nihil pada TB berjalan namun akun bersaldo periode kini. Bila ini penerapan awal standar (mis. PSAK 73 retrospektif modifikasian), muat skedul transisinya — aplikasi tidak mengarang saldo pembukaannya."><Badge kind="amber">Transisi? belum dimuat</Badge></span>
                      : !tie.hasSource
                        ? <span className="tiny muted">— tak dapat diverifikasi —</span>
                        : t && t.status === 'tied'
                          ? <span className="row ac gap6 tiny" style={{ color: 'var(--green)', fontWeight: 600 }}><I.check size={13} /> Cocok</span>
                          : <Badge kind={t && t.status === 'missing' ? 'purple' : 'amber'}>{t ? TIE_LABEL[t.status] : TIE_LABEL['missing']}</Badge>}
                    </td>
                  </tr>
                );
              })}
            </React.Fragment>
          ))}
        </tbody>
        <tfoot><tr>
          <td colSpan={3}>{tie.hasSource
            ? `Total — ${matched} cocok · ${tie.untied} selisih · ${tie.missing} belum tertelusur · ${transition} kandidat transisi`
            : `Total — ${transition} kandidat transisi · sisanya TAK DAPAT DIVERIFIKASI (belum ada sumber TA-1)`}</td>
          <td className="num mono">{fmt(totClose / 1e6, 0)}</td>
          <td className="num mono">{fmt(totOpen / 1e6, 0)}</td>
          <td className="num mono" style={{ color: totDiff === 0 ? 'var(--ink-4)' : 'var(--amber)' }}>{fmt(totDiff / 1e6, 0)}</td>
          <td></td>
        </tr></tfoot>
      </table>
      {/* Simpulan tab ini DITURUNKAN dari tie-out, bukan kalimat tetap. Sebelumnya paragraf
          hijau "seluruh saldo ditelusuri tepat" tampil apa adanya — termasuk ketika belum ada
          sumber TA-1 sama sekali, tepat di bawah banner yang menyatakan sebaliknya. */}
      {(() => {
        const clean = tie.hasSource && tie.untied === 0 && tie.missing === 0 && tie.orphan === 0;
        const bg = !tie.hasSource ? 'var(--amber-bg)' : clean ? 'var(--green-bg)' : 'var(--amber-bg)';
        const fg = !tie.hasSource || !clean ? 'var(--amber)' : 'var(--green)';
        return (
          <div className="panel" style={{ margin: 12, padding: '9px 11px', background: bg, borderColor: 'transparent' }}>
            <div className="row ac gap8">
              <span style={{ color: fg, flex: '0 0 auto' }}>{clean ? <I.checkCircle size={15} /> : <I.alert size={15} />}</span>
              <span style={{ fontSize: 12, lineHeight: 1.4 }}>{
                !tie.hasSource
                  ? `Penelusuran belum dapat disimpulkan — belum ada sumber saldo audited TA-1 sebagai pembanding independen (SA 510 ¶6).${transition ? ` ${transition} akun bersaldo nihil di TA-1 namun bersaldo periode kini — muat skedul transisinya bila berasal dari penerapan standar baru.` : ''}`
                  : clean
                    ? `Seluruh ${tie.tied} saldo awal dalam lingkup tertelusur ke TA-1 audited.${transition ? ` ${transition} akun bersaldo nihil di TA-1 namun bersaldo periode kini — periksa apakah timbul dari penerapan standar baru dan muat skedul transisinya.` : ''}`
                    : `Penelusuran belum tuntas — ${tie.untied} selisih · ${tie.missing} belum tertelusur · ${tie.orphan} hilang dari TB berjalan. Jelaskan atau selesaikan sebelum menyimpulkan saldo awal dapat diandalkan.`
              }</span>
            </div>
          </div>
        );
      })()}
    </Panel>
  );
}

/* ---------------- Tab: Prosedur yang Disarankan ---------------- */
function OBProcedures({ nav }: { nav: ((id: string, o?: { from?: string }) => void) | null }) {
  const [selId, setSelId] = useStateOPN('C');
  const sel = OB_PROC_LIBRARY.find(s => s.id === selId);
  return (
    <div className="grid split" style={{ gridTemplateColumns: '1fr 340px', gap: 12, alignItems: 'start' }}>
      <Panel noBody>
        <div className="panel-h"><h3>Prosedur yang Disarankan atas Saldo Awal (pustaka SA 510)</h3><div style={{ flex: 1 }} /><span className="tiny muted">{OB_PROC_LIBRARY.length} akun</span></div>
        {/* Judul dan spanduk ini adalah inti perbaikan O1: tab ini DULU berjudul
            "Prosedur Audit Spesifik atas Saldo Awal Signifikan" dan menyajikan kolom
            "Hasil: Memadai" untuk setiap klien. */}
        <div className="row ac gap8" style={{ margin: '10px 14px', padding: '9px 11px', border: '1px solid var(--line)', background: 'var(--surface-2)', borderRadius: 6 }}>
          <span style={{ color: 'var(--blue)', flex: '0 0 auto' }}><I.book size={15} /></span>
          <span style={{ fontSize: 12, lineHeight: 1.45, color: 'var(--ink-2)' }}>
            Daftar ini <b>saran</b>, bukan catatan pekerjaan. Ia sama untuk setiap perikatan dan tidak mencatat apa
            yang sudah dikerjakan, bukti apa yang ada di tangan, atau kesimpulan apa pun. Pelaksanaan, bukti, dan
            kesimpulan didokumentasikan pada kertas kerja lead schedule dan pada blok kertas kerja di tab
            <b> Kesimpulan &amp; Opini</b>.
          </span>
        </div>
        <table className="dtbl">
          <thead><tr><th style={{ width: 44 }}>Lead</th><th>Akun</th><th>Asersi</th><th style={{ width: 110 }}>Risiko Umum</th></tr></thead>
          <tbody>
            {OB_PROC_LIBRARY.map(s => (
              <tr key={s.id} className={s.id === selId ? 'sel' : ''}>
                <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{s.lead}</td>
                {/* O3 — baris dulu `<tr onClick>` bergaya pointer: tak fokusabel,
                    tak menanggapi Enter/Space. Kontrol pemilihnya kini native. */}
                <td style={{ padding: 0 }}>
                  <button className="ob-procrow" aria-pressed={s.id === selId} onClick={() => setSelId(s.id)}
                    title={'Lihat prosedur yang disarankan — ' + s.acct}>{s.acct}</button>
                </td>
                <td className="tiny muted">{s.assertion}</td>
                <td><Badge kind={s.risk === 'Signifikan' ? 'red' : 'amber'}>{s.risk}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
      {sel && (
        <Panel noBody>
          <div style={{ background: 'var(--surface-2)', padding: '15px 18px', borderBottom: '1px solid var(--line)' }}>
            <div className="row ac gap8"><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>Lead {sel.lead}</span><Badge kind="blue">Saran</Badge></div>
            <div style={{ fontWeight: 700, fontSize: 13, marginTop: 3 }}>{sel.acct}</div>
            <div className="tiny muted">{sel.assertion}</div>
          </div>
          <div style={{ padding: 14 }}>
            <div className="tiny muted upper" style={{ marginBottom: 4 }}>Prosedur yang disarankan</div>
            <p style={{ margin: '0 0 12px', fontSize: 12, lineHeight: 1.5 }}>{sel.proc}</p>
            {/* "Bukti Diperoleh" → "Bukti yang perlu diperoleh". Nama dokumen
                bertanggal ("Berita Acara Opname 28 Des 2024") dicabut: tanggal itulah
                yang membuat daftar berhenti jadi saran dan mulai menyatakan bahwa
                dokumennya ada di tangan. */}
            <div className="tiny muted upper" style={{ marginBottom: 4 }}>Bukti yang perlu diperoleh</div>
            <p style={{ margin: '0 0 12px', fontSize: 12, lineHeight: 1.45, color: 'var(--ink-2)' }}>{sel.needs}</p>
            <div style={{ marginBottom: 12 }}>
              <KvBox label="Risiko umum saldo awal akun ini" v={sel.risk} accent={sel.risk === 'Signifikan' ? 'var(--red)' : 'var(--amber)'} />
            </div>
            {/* O2 — tombol dulu tanpa `onClick` dan menjanjikan WP 'C(OB)'/'F(OB)':
                rujukan yang tak ada di register kertas kerja mana pun. Kini ia hidup,
                menuju modul Working Papers, tanpa menyebut rujukan yang dikarang. */}
            <Btn sm variant="primary" style={{ width: '100%' }} onClick={() => nav && nav('workpapers', { from: 'opening' })}>
              <I.flask size={14} /> Buka Working Papers
            </Btn>
          </div>
        </Panel>
      )}
      <style>{`
        .ob-procrow { display:block; width:100%; text-align:left; background:none; border:0; font:inherit; font-weight:600; color:inherit; padding:7px 9px; cursor:pointer; }
        .ob-procrow:hover { background:var(--surface-2); }
        .ob-procrow:focus-visible { outline:2px solid var(--blue); outline-offset:-2px; }
        .ob-procrow[aria-pressed="true"] { color:var(--blue); }
      `}</style>
    </div>
  );
}

/* ---------------- Tab: Konsistensi Kebijakan ---------------- */
function OBPolicy() {
  return (
    <Panel noBody>
      <div className="panel-h"><h3>Konsistensi Kebijakan Akuntansi — Area yang Wajib Dibandingkan</h3><div style={{ flex: 1 }} /><span className="tiny muted">{OB_POLICY_AREAS.length} area</span></div>
      {/* Tabel ini DULU menjawab pertanyaannya sendiri: kolom "Kebijakan TA-1" dan
          "Kebijakan TA Kini" berisi kebijakan yang ditulis di dalam kode, dan kolom
          "Penilaian" menyimpulkan "Konsisten" — untuk setiap klien, sebelum ada yang
          membandingkan apa pun. Yang tersisa: pertanyaannya. */}
      <div className="row ac gap8" style={{ margin: '10px 14px', padding: '9px 11px', border: '1px solid var(--line)', background: 'var(--surface-2)', borderRadius: 6 }}>
        <span style={{ color: 'var(--blue)', flex: '0 0 auto' }}><I.scale size={15} /></span>
        <span style={{ fontSize: 12, lineHeight: 1.45, color: 'var(--ink-2)' }}>
          SA 510 ¶6(b) menuntut bukti bahwa kebijakan akuntansi yang tercermin dalam saldo awal diterapkan
          konsisten pada periode kini, dan bahwa perubahan telah dipertanggungjawabkan &amp; diungkapkan memadai.
          Perbandingan kebijakan adalah temuan perikatan — aplikasi tidak menyediakan jawabannya. Dokumentasikan
          hasilnya pada kesimpulan auditor di tab <b>Kesimpulan &amp; Opini</b>.
        </span>
      </div>
      <table className="dtbl">
        <thead><tr><th style={{ width: 220 }}>Area Kebijakan</th><th>Yang harus dibandingkan antar-periode</th></tr></thead>
        <tbody>
          {OB_POLICY_AREAS.map((p, i) => (
            <tr key={i}>
              <td style={{ fontWeight: 600 }}>{p.area}</td>
              <td className="tiny" style={{ whiteSpace: 'normal', lineHeight: 1.45 }}>{p.ask}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

/* ---------------- Tab: Kesimpulan & Opini ---------------- */
function OBConclusion({ concluded, obVerdict, score, rv, wpConcl, conclusionText, canEdit, nav, memoRef }: {
  concluded: boolean; obVerdict: { k: string; l: string; t: string }; score: number; rv: { k: string; l: string };
  wpConcl: { text?: string; disposition?: string; by?: string; at?: string } | null;
  conclusionText: string; canEdit: boolean;
  nav: ((id: string, o?: { from?: string }) => void) | null; memoRef: string;
}) {
  const kesimpulan = (conclusionText || '').trim();
  return (
    <div className="grid split" style={{ gridTemplateColumns: '1fr 340px', gap: 12, alignItems: 'start' }}>
      <div className="grid" style={{ gap: 12 }}>
        <Panel noBody>
          <div className="panel-h"><h3>Matriks Dampak terhadap Opini (SA 510 ¶10–13)</h3><div style={{ flex: 1 }} /><span className="tiny muted">kutipan standar</span></div>
          {/* Kolom "Status" (Bersih/Pantau) DICABUT. Ia menjawab ketiga kondisi ini
              dengan catatan "Bukti memadai diperoleh untuk seluruh saldo awal
              signifikan" dan "Tidak ditemukan salah saji saldo awal; carry-forward
              terverifikasi" — hijau bahkan pada perikatan yang belum punya satu pun
              sumber TA-1 untuk dibandingkan. */}
          <table className="dtbl">
            <thead><tr><th style={{ width: 44 }}>Ref</th><th>Kondisi</th><th style={{ width: 200 }}>Potensi Modifikasi</th></tr></thead>
            <tbody>
              {OB_OPINION_MATRIX.map((m, i) => (
                <tr key={i}>
                  <td className="mono tiny" style={{ color: 'var(--blue)', fontWeight: 700 }}>{m.ref}</td>
                  <td style={{ whiteSpace: 'normal', lineHeight: 1.4, fontSize: 12 }}>{m.cond}</td>
                  <td className="tiny">{m.mod}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="tiny muted" style={{ padding: '10px 14px', lineHeight: 1.5 }}>
            Apakah salah satu kondisi ini berlaku pada perikatan ini adalah pertimbangan auditor — nyatakan pada
            kesimpulan di bawah. Aplikasi tidak menilainya untuk Anda.
          </div>
        </Panel>

        <Panel title="Kesimpulan Auditor">
          <div className="row ac gap8" style={{ marginBottom: 10, flexWrap: 'wrap' }}>
            <span title={obVerdict.t}><Badge kind={obVerdict.k} dot>{obVerdict.l}</Badge></span>
            <span className="tiny muted">Skor risiko saldo awal {typeof score === 'number' ? score.toFixed(2) : '—'} / 5,00 · {rv.l}</span>
            {concluded ? <Badge kind="green" dot>Disimpulkan</Badge> : <Badge kind="amber">Draf — belum disimpulkan</Badge>}
          </div>
          {/* Paragraf tetap ("kami memperoleh bukti audit yang cukup dan tepat bahwa
              saldo awal … tidak mengandung salah saji … Tidak diperlukan modifikasi
              opini") DICABUT. Ia adalah kesimpulan audit yang ditulis aplikasi atas
              nama auditor, tampil untuk setiap klien, termasuk berdampingan dengan
              badge "Belum Dapat Disimpulkan" di kepala halaman.
              `conclusion` sudah ada di `OBState` dan sudah dikirim ke memo tersegel —
              tetapi TAK ADA satu pun kontrol yang bisa mengisinya, sehingga memo selalu
              jatuh ke kalimat bawaan. Kotak di bawah ini menutup kabel yang putus itu. */}
          <div className="tiny muted upper" style={{ marginBottom: 4 }}>Kesimpulan atas saldo awal (SA 510 ¶10–13) — masuk ke memo tersegel</div>
          {kesimpulan ? (
            <>
              <p style={{ margin: '0 0 8px', fontSize: 12, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{kesimpulan}</p>
              <div className="row ac gap8">
                {wpConcl && wpConcl.disposition && <Badge kind={wpConcl.disposition === 'Memadai' ? 'green' : wpConcl.disposition === 'Perlu tindak lanjut' ? 'amber' : 'red'} dot>{wpConcl.disposition}</Badge>}
                {wpConcl && wpConcl.by && <span className="tiny muted">{wpConcl.by} · {wpConcl.at}</span>}
              </div>
            </>
          ) : (
            <div className="tiny muted" style={{ lineHeight: 1.5 }}>
              <I.alert size={11} style={{ verticalAlign: -1 }} /> Belum ada kesimpulan tertulis. Tulis pada blok
              <b> Kertas Kerja Saldo Awal</b> di samping{canEdit ? '' : ' (perlu kewenangan sunting kertas kerja)'} —
              satu tempat, dengan disposisi, pelaku, dan tanggal. Sampai itu diisi, memo tersegel hanya mencetak
              ringkasan skor, bukan kesimpulan auditor.
            </div>
          )}
        </Panel>
      </div>

      <div className="grid" style={{ gap: 12 }}>
        <Panel title="Tautan Kertas Kerja">
          {/* Empat baris statis dengan rujukan 'C(OB)' · 'F(OB)' · 'A-512' — tak satu
              pun ada di register kertas kerja — diganti tautan ke modul yang NYATA.
              'A-510' dipertahankan karena itu memang nomor referensi memo ini
              (`openingMemoRefNo`). */}
          <div style={{ display: 'grid', gap: 6 }}>
            <div className="row jb ac" style={{ fontSize: 12, padding: '7px 9px', border: '1px solid var(--line-soft)', borderRadius: 6 }}>
              <span className="row ac gap8"><span style={{ color: 'var(--blue)' }}><I.doc size={14} /></span>Memo Saldo Awal (modul ini)</span>
              <span className="mono tiny" style={{ color: 'var(--blue)', fontWeight: 700 }}>{memoRef}</span>
            </div>
            {[
              { t: 'Neraca saldo & sumber TA-1', id: 'wtb' },
              { t: 'Register kertas kerja', id: 'workpapers' },
              { t: 'Sewa — PSAK 73', id: 'psak73' },
            ].map((r) => (
              <button key={r.id} className="ob-wplink" onClick={() => nav && nav(r.id, { from: 'opening' })} title={'Buka ' + r.t}>
                <span className="row ac gap8"><span style={{ color: 'var(--blue)' }}><I.doc size={14} /></span>{r.t}</span>
                <I.arrowRight size={13} />
              </button>
            ))}
          </div>
          <style>{`
            .ob-wplink { display:flex; justify-content:space-between; align-items:center; width:100%; font:inherit; font-size:12px; color:inherit; text-align:left; padding:7px 9px; border:1px solid var(--line-soft); border-radius:6px; background:none; cursor:pointer; }
            .ob-wplink:hover { background:var(--surface-2); }
            .ob-wplink:focus-visible { outline:2px solid var(--blue); outline-offset:-2px; }
          `}</style>
        </Panel>
        {/* Blok "Sign-off" DULU memuat tiga nama personel dan tanggal, dua di antaranya
            `done: true` — padahal `opening` tak pernah terdaftar di `WP_MODULE_MAP`
            dan tak punya rantai sign-off sama sekali. Kini modul ini terdaftar dan
            memakai rantai kanonik: penanda tangan nyata, dengan otorisasi & jejak audit. */}
        <WpPanel moduleId="opening" title="Kertas Kerja Saldo Awal — Sign-off & Bukti" />
      </div>
    </div>
  );
}



/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { OpeningBalance };
