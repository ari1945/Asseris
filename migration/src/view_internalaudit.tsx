/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { useAuth, useFirm, useAmsPersist } from './contexts';
import { I } from './icons';
import { SubBar } from './shell';
import { Badge, Btn, Panel, Progress, Stat, Tabs } from './ui';
import { amsExportPdf } from './export_pdf';
import { KvBox } from './view_analytical';
import {
  IA_PROFILE_FIELDS, normalizeIaDoc,
  iaScore, iaVerdict, iaActor, iaConcludeBlockReason,
  iaMemoContext, sa610MemoBlockers, sa610ExportBlockReason,
  sa610MemoTitle, sa610MemoRefNo, sa610MemoMeta, sa610MemoFileName, buildSa610Blocks,
  type IaConclusion, type IaDoc, type IaFactor, type IaMemoContext, type IaProfile,
  type IaScore, type IaVerdict, type IaVerdictKind,
} from './internalaudit_memo';

/* ============================================================
   Asseris — Penggunaan Pekerjaan Audit Internal (SA 610)
   Deep workpaper: konteks & strategi, evaluasi fungsi IA,
   penggunaan pekerjaan, reperformansi, bantuan langsung (direct
   assistance), kesimpulan & dampak terhadap audit.

   Model kertas kerja, aritmetika skor, dan perakitan memo TERSEGEL hidup di
   `internalaudit_memo.ts` (murni & diuji). Berkas ini merender & menyunting.

   Yang dicabut arc ini — dan sebabnya, agar tak ditulis ulang:
     · `IA_PROFILE` — profil fungsi audit internal KLIEN sebagai konstanta modul:
       nama unit, garis pelaporan, nama kepala, jumlah personel, tanggal piagam.
       Sama untuk setiap klien, tak dapat disunting, dirender sebagai fakta di dua
       tempat. Kini isian auditor yang ter-persist, diseed KOSONG.
     · `IA_FACTORS_SEED` — skor 4/4/3 dengan sub-kriteria yang sudah dijawab.
       Kini kerangka pertanyaan ¶16 tanpa satu pun jawaban.
     · identitas literal pada memo TERSEGEL (`ENG-2025-014`, `FY2025`, nama KAP,
       jatuh-balik nama klien) — lihat kepala `internalaudit_memo.ts`.
     · blok "Sign-off" berisi tiga nama personel dengan tanggal dan `done: true`:
       tanda tangan yang tak pernah ada, tanpa otorisasi, tanpa jejak audit, sama
       untuk setiap perikatan. Modul ini TIDAK terdaftar di `WP_MODULE_MAP` dan
       karenanya tak punya rantai sign-off kanonik sama sekali. Yang menggantikan:
       rekaman kesimpulan yang benar-benar diambil seseorang (tombol "Simpulkan").
       Menyambungkannya ke `WpPanel` adalah keputusan alur kerja — usulannya ada di
       `docs/usulan-IA6-internalaudit-skor-dan-signoff.md`.

   MASIH KONSTANTA MODUL & DILAPORKAN, BUKAN DIPERBAIKI DI ARC INI:
   `IA_USE_AREAS`, `IA_REPERF`, `IA_DIRECT` — area penggunaan, hasil reperformansi,
   dan individu pemberi bantuan langsung beserta jamnya. Ketiganya menyatakan
   pekerjaan audit yang telah dilaksanakan, identik untuk setiap perikatan. Sama
   kelasnya dengan yang dicabut di atas; lingkupnya jauh lebih besar (tiga register
   + kontrol penyuntingnya) sehingga dipisahkan ke arc sendiri.
   ============================================================ */
const { useState: useStateIA, useMemo: useMemoIA } = React;

/* Peran warna verdict dienumerasi, BUKAN dirakit `var(--${k})`: token yang
   disusun saat runtime tak terbaca gerbang `css_tokens`, dan `--gray` tak pernah
   ada — substitusi yang gagal jatuh diam-diam ke warna warisan. */
const TONE_INK: Record<IaVerdictKind, string> = {
  green: 'var(--green)', amber: 'var(--amber)', red: 'var(--red)', gray: 'var(--ink-3)',
};
const TONE_BG: Record<IaVerdictKind, string> = {
  green: 'var(--green-bg)', amber: 'var(--amber-bg)', red: 'var(--red-bg)', gray: 'var(--surface-2)',
};

/* Tipe event struktural — proyek ini tanpa @types/react (shim W13), jadi
   React.ChangeEvent tak tersedia; cukup bentuk yang kita pakai. */
type FormEv = { target: { value: string } };

const SCORE_LABEL: Record<number, string> = {
  1: 'sangat tidak memadai', 2: 'tidak memadai', 3: 'cukup', 4: 'memadai', 5: 'sangat memadai',
};

const scoreInk = (v: number | null): string =>
  v === null ? 'var(--ink-4)' : v >= 4 ? 'var(--green)' : v >= 3 ? 'var(--amber)' : 'var(--red)';

const shown = (s: string): string => (s && s.trim()) || '—';

/* ---- Area penggunaan pekerjaan IA ---- */
const IA_USE_AREAS = [
  { id: 'U1', area: 'Pengujian pengendalian siklus penggajian', assertion: 'Akurasi · Keterjadian', lead: 'PR-3',
    judgment: 'Rendah', risk: 'Rendah', nature: 'Menggunakan hasil kerja', extent: 'Tinggi', reperf: 0.20, result: 'Memadai',
    desc: 'SPI telah menguji efektivitas operasi pengendalian otorisasi & pemrosesan penggajian sepanjang tahun. Pekerjaan relevan, lingkup memadai untuk diandalkan dengan reperformansi sebagian.' },
  { id: 'U2', area: 'Rekonsiliasi bank & kas rutin', assertion: 'Keberadaan', lead: 'A-2',
    judgment: 'Rendah', risk: 'Rendah', nature: 'Menggunakan hasil kerja', extent: 'Tinggi', reperf: 0.15, result: 'Memadai',
    desc: 'Rekonsiliasi bulanan diuji SPI atas 6 rekening utama. Sifat rutin & pertimbangan rendah — sesuai untuk diandalkan.' },
  { id: 'U3', area: 'Observasi stock opname cabang (3 lokasi)', assertion: 'Keberadaan · Kelengkapan', lead: 'C-1',
    judgment: 'Rendah', risk: 'Moderat', nature: 'Bantuan langsung', extent: 'Sedang', reperf: 0.33, result: 'Memadai',
    desc: 'Anggota SPI memberikan bantuan langsung mendampingi observasi opname di cabang terjauh, di bawah arahan & supervisi tim audit. Penghitungan ulang sebagian dilakukan auditor.' },
  { id: 'U4', area: 'Walkthrough siklus pendapatan', assertion: 'Keterjadian', lead: 'PR-1',
    judgment: 'Sedang', risk: 'Signifikan', nature: 'Menggunakan hasil kerja (terbatas)', extent: 'Rendah', reperf: 0.50, result: 'Perlu Perluasan',
    desc: 'Area mengandung pertimbangan & risiko signifikan (pengakuan pendapatan). Penggunaan dibatasi; reperformansi diperluas dan auditor melaksanakan prosedur substantif sendiri.' },
  { id: 'U5', area: 'Estimasi CKPN (PSAK 71)', assertion: 'Penilaian', lead: 'B-4',
    judgment: 'Tinggi', risk: 'Signifikan', nature: 'Tidak digunakan', extent: '—', reperf: 1.0, result: 'Dikecualikan',
    desc: 'Melibatkan pertimbangan signifikan atas asumsi forward-looking. Sesuai SA 610 ¶15, auditor tidak dapat mengandalkan pekerjaan IA untuk area ini — dikerjakan penuh oleh tim audit.' },
];

/* ---- Reperformansi: sampel pekerjaan IA yang diuji ulang ---- */
const IA_REPERF = [
  { id: 'RP-01', area: 'Penggajian', item: 'Uji 15 sampel otorisasi lembur', iaConcl: 'Efektif', reperf: 'Cocok', exc: 0, status: 'Sesuai' },
  { id: 'RP-02', area: 'Penggajian', item: 'Rekalkulasi 10 slip gaji', iaConcl: 'Akurat', reperf: 'Cocok', exc: 0, status: 'Sesuai' },
  { id: 'RP-03', area: 'Rekonsiliasi Bank', item: 'Telaah ulang 6 rekonsiliasi', iaConcl: 'Sesuai', reperf: 'Cocok', exc: 0, status: 'Sesuai' },
  { id: 'RP-04', area: 'Stock Opname', item: 'Hitung ulang 12 item persediaan', iaConcl: 'Akurat', reperf: '1 selisih minor', exc: 1, status: 'Selisih < CTT' },
  { id: 'RP-05', area: 'Pendapatan', item: 'Telaah ulang walkthrough & 8 sampel', iaConcl: 'Memadai', reperf: '2 dokumentasi kurang', exc: 2, status: 'Perlu Perluasan' },
];

/* ---- Direct assistance: individu & pembatasan ---- */
const IA_DIRECT = [
  { id: 'DA-1', name: 'Sari Anjani (QIA)', task: 'Pendampingan observasi opname cabang Surabaya', superv: 'Dimas R.', review: 'Penuh', hours: 24, status: 'Selesai' },
  { id: 'DA-2', name: 'Bagus Pratama', task: 'Vouching sampel pengeluaran kas (non-judgmental)', superv: 'Dimas R.', review: 'Penuh', hours: 16, status: 'Selesai' },
  { id: 'DA-3', name: 'Sari Anjani (QIA)', task: 'Konfirmasi piutang — penyiapan & follow-up', superv: 'Putri M.', review: 'Penuh', hours: 12, status: 'Berlangsung' },
];

const IA_PROHIBIT = [
  'Prosedur yang melibatkan pertimbangan signifikan (mis. estimasi akuntansi kompleks)',
  'Area dengan risiko salah saji material signifikan / fraud yang lebih tinggi',
  'Pekerjaan yang berkaitan dengan pekerjaan IA itu sendiri (self-review)',
  'Keputusan audit (penilaian kecukupan bukti, materialitas, opini)',
];

const IA_CSS = `
.ia-rowbtn{ display:block; width:100%; background:none; border:0; padding:0; margin:0; font:inherit; color:inherit; text-align:left; cursor:pointer; }
.ia-rowbtn:focus-visible{ outline:2px solid var(--blue); outline-offset:2px; border-radius:4px; }
.ia-rowbtn[aria-pressed="true"]{ color:var(--blue); }
.ia-cellbtn{ display:block; width:100%; background:none; border:0; padding:7px 9px; margin:0; font:inherit; font-weight:600; color:inherit; text-align:left; cursor:pointer; }
.ia-cellbtn:hover{ background:var(--surface-2); }
.ia-cellbtn:focus-visible{ outline:2px solid var(--blue); outline-offset:-2px; }
.ia-cellbtn[aria-pressed="true"]{ color:var(--blue); }
`;

/* ============================================================ */
function InternalAudit() {
  const firm = useFirm();
  const auth = useAuth();
  const [tab, setTab] = useStateIA('konteks');

  /* Dokumen kertas kerja SA 610. `normalizeIaDoc` adalah jalur kompatibilitas:
     sebelum arc ini kunci yang sama menyimpan LARIK faktor telanjang, dan
     dokumen itu masih ada di perikatan yang sudah dipakai. */
  const [raw, setRaw] = useAmsPersist('internalAudit.v1', () => normalizeIaDoc(null));
  const doc: IaDoc = useMemoIA(() => normalizeIaDoc(raw), [raw]);
  const patch = (fn: (d: IaDoc) => IaDoc) => setRaw((prev: unknown) => fn(normalizeIaDoc(prev)));

  const factors = doc.factors;
  const profile = doc.profile;
  const score = iaScore(factors);
  const verdict = iaVerdict(score.avg);

  const setV = (id: string, v: number | null) =>
    patch((d) => ({ ...d, factors: d.factors.map((f) => (f.id === id ? { ...f, v } : f)) }));
  const setFactorNote = (id: string, note: string) =>
    patch((d) => ({ ...d, factors: d.factors.map((f) => (f.id === id ? { ...f, note } : f)) }));
  const setSub = (id: string, idx: number, ok: boolean | null) =>
    patch((d) => ({ ...d, factors: d.factors.map((f) => (f.id === id
      ? { ...f, subs: f.subs.map((s, i) => (i === idx ? { ...s, ok } : s)) } : f)) }));
  const setSubNote = (id: string, idx: number, note: string) =>
    patch((d) => ({ ...d, factors: d.factors.map((f) => (f.id === id
      ? { ...f, subs: f.subs.map((s, i) => (i === idx ? { ...s, note } : s)) } : f)) }));
  const setProfileField = (key: keyof IaProfile, value: string) =>
    patch((d) => ({ ...d, profile: { ...d.profile, [key]: value } }));

  /* ---- Identitas memo: SATU sumber untuk muka berkas DAN scope segel ---- */
  const memoCtx: IaMemoContext = useMemoIA(
    () => iaMemoContext(firm, ((AMS as { FIRM?: { name?: string } }).FIRM || {}).name),
    [firm],
  );
  const memoBlockers = sa610MemoBlockers(memoCtx);
  const memoBlockReason = sa610ExportBlockReason(memoBlockers);

  /* ---- Kesimpulan: pelaku dari SESI, tanpa jaring ke data seed ---- */
  const actor = iaActor(auth && (auth as { user?: { id?: string; name?: string } }).user);
  const concludeBlock = iaConcludeBlockReason(verdict, actor);
  const concluded = doc.conclusion;
  const toggleConclude = () => {
    if (concluded) { patch((d) => ({ ...d, conclusion: null })); return; }
    if (concludeBlock || score.avg === null || !actor) return;
    const rec: IaConclusion = { by: actor, at: AMS.TODAY, avg: score.avg, verdict: verdict.label };
    patch((d) => ({ ...d, conclusion: rec }));
  };

  const tabs = [
    { id: 'konteks', label: 'Konteks & Strategi' },
    { id: 'evaluasi', label: 'Evaluasi Fungsi IA' },
    { id: 'penggunaan', label: 'Penggunaan Pekerjaan' },
    { id: 'reperform', label: 'Reperformansi' },
    { id: 'direct', label: 'Bantuan Langsung' },
    { id: 'kesimpulan', label: 'Kesimpulan & Dampak' },
  ];

  const [exporting, setExporting] = useStateIA(false);
  const onExportMemo = async () => {
    if (exporting) return;
    /* Berkas bersegel membawa identitas ke luar aplikasi dan tak dapat ditarik
       kembali. Identitas yang tak diketahui → TIDAK diterbitkan. */
    if (memoBlockers.length) return;
    setExporting(true);
    try {
      const input = { ctx: memoCtx, factors, profile, score, verdict, conclusion: doc.conclusion, date: AMS.TODAY };
      await amsExportPdf({
        kind: 'sa610-memo',
        scope: 'engagement', scopeId: memoCtx.engagementId,
        fileName: sa610MemoFileName(input),
        firm: memoCtx.firmName,
        title: sa610MemoTitle(input),
        refNo: sa610MemoRefNo(input),
        meta: sa610MemoMeta(input),
        blocks: buildSa610Blocks(input),
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <SubBar moduleId="internalaudit" right={
        <div className="row gap8 ac">
          <Badge kind="blue">SA 610</Badge>
          <Btn sm onClick={onExportMemo} disabled={exporting || memoBlockers.length > 0}
            title={memoBlockReason || 'Terbitkan memo SA 610 tersegel untuk perikatan aktif'}>
            <I.download size={13} /> {exporting ? 'Menyiapkan…' : 'Memo Penggunaan IA'}
          </Btn>
          <Btn sm variant={concluded ? '' : 'primary'} onClick={toggleConclude}
            disabled={!concluded && concludeBlock !== ''}
            title={concluded ? 'Buka kembali kesimpulan untuk dinilai ulang' : (concludeBlock || 'Rekam kesimpulan penggunaan pekerjaan audit internal')}>
            <I.check size={14} /> {concluded ? 'Dibuka kembali' : 'Simpulkan'}
          </Btn>
        </div>
      } />
      <div className="view-scroll"><div className="view-pad">

        {/* summary header */}
        <Panel noBody style={{ marginBottom: 12 }}>
          <div style={{ padding: '13px 16px', display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ minWidth: 200 }}>
              <div className="tiny muted upper" style={{ marginBottom: 3 }}>Fungsi Audit Internal</div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{shown(profile.unit)}</div>
              <div className="tiny muted">{shown(memoCtx.clientName)}</div>
            </div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Garis Pelaporan</div><div style={{ fontWeight: 600, fontSize: 12, maxWidth: 190, lineHeight: 1.35 }}>{shown(profile.reportLine)}</div></div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Tim Audit Internal</div><div className="mono" style={{ fontWeight: 700, fontSize: 12 }}>{shown(profile.headcount)} · {shown(profile.certified)} bersertifikat</div></div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Skor Evaluasi</div><div className="mono" style={{ fontWeight: 700, fontSize: 12, color: TONE_INK[verdict.k] }}>
              {score.avg === null ? score.scored + ' / ' + score.total + ' faktor' : score.avg.toFixed(1) + ' / 5'}
            </div></div>
            <div style={{ flex: 1 }} />
            <div style={{ textAlign: 'right' }}>
              <div className="tiny muted upper" style={{ marginBottom: 3 }}>Keputusan Penggunaan</div>
              <Badge kind={verdict.k} dot>{verdict.label}</Badge>
            </div>
          </div>
          {memoBlockers.length > 0 && (
            <div style={{ padding: '9px 16px', background: 'var(--amber-bg)', borderTop: '1px solid var(--line-soft)' }}>
              <span className="row ac gap8" style={{ fontSize: 12, lineHeight: 1.45 }}>
                <span style={{ color: 'var(--amber)', flex: '0 0 auto' }}><I.alert size={15} /></span>{memoBlockReason}
              </span>
            </div>
          )}
        </Panel>

        <div style={{ marginBottom: 12 }}><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>

        {tab === 'konteks' && <IAContext profile={profile} setProfileField={setProfileField} score={score} verdict={verdict} conclusion={doc.conclusion} />}
        {tab === 'evaluasi' && <IAEvaluation factors={factors} setV={setV} setFactorNote={setFactorNote} setSub={setSub} setSubNote={setSubNote} score={score} verdict={verdict} />}
        {tab === 'penggunaan' && <IAUsage />}
        {tab === 'reperform' && <IAReperform />}
        {tab === 'direct' && <IADirect />}
        {tab === 'kesimpulan' && <IAConclusionTab verdict={verdict} score={score} conclusion={doc.conclusion} blockReason={concludeBlock} />}

      </div></div>
      <style>{IA_CSS}</style>
    </>
  );
}

/* ---------------- Tab: Konteks & Strategi ---------------- */
interface ContextProps {
  profile: IaProfile;
  setProfileField: (key: keyof IaProfile, value: string) => void;
  score: IaScore;
  verdict: IaVerdict;
  conclusion: IaConclusion | null;
}

function IAContext({ profile, setProfileField, score, verdict, conclusion }: ContextProps) {
  /* Pohon keputusan DITURUNKAN dari keadaan kertas kerja. Sebelum arc ini ia
     memuat jawaban tetap — termasuk "Skor 3,7/5" yang ditulis tangan dan tidak
     lagi cocok dengan mesin begitu auditor menggeser satu skor. */
  const dikecualikan = IA_USE_AREAS.filter((a) => a.result === 'Dikecualikan').length;
  const decision = [
    { q: 'Apakah fungsi audit internal ada & relevan dengan audit?',
      a: profile.unit.trim() ? profile.unit.trim() : 'Belum diprofilkan — isi Profil Fungsi Audit Internal di samping.',
      ok: !!profile.unit.trim() },
    { q: 'Objektivitas, kompetensi & pendekatan sistematis memadai? (¶16)',
      a: score.avg === null
        ? `Belum — ${score.scored} dari ${score.total} faktor dinilai (lihat Evaluasi).`
        : `${verdict.label} — rata-rata ${score.avg.toFixed(1)}/5 (lihat Evaluasi).`,
      ok: verdict.k === 'green' },
    { q: 'Apakah area melibatkan pertimbangan signifikan / risiko signifikan? (¶15)',
      a: dikecualikan
        ? `${dikecualikan} area dikecualikan dari penggunaan (lihat Penggunaan Pekerjaan).`
        : 'Belum ada area yang ditandai dikecualikan.',
      ok: false },
    { q: 'Apakah penggunaan akan menyisakan keterlibatan auditor memadai? (¶18)',
      a: conclusion
        ? `Dinyatakan ${conclusion.at} oleh ${conclusion.by}.`
        : 'Belum dinyatakan — kesimpulan penggunaan belum diambil.',
      ok: !!conclusion },
  ];
  return (
    <div className="grid split" style={{ gridTemplateColumns: '1fr 360px', gap: 12, alignItems: 'start' }}>
      <div className="grid" style={{ gap: 12 }}>
        <Panel noBody>
          <div className="panel-h"><h3>Tujuan &amp; Lingkup (SA 610)</h3><div style={{ flex: 1 }} /></div>
          <div style={{ padding: 14 }}>
            <p style={{ margin: '0 0 12px', fontSize: 12, lineHeight: 1.55, color: 'var(--ink-2)' }}>
              Bila entitas memiliki fungsi audit internal, auditor menentukan apakah <b>pekerjaan fungsi audit internal
              dapat digunakan</b> untuk tujuan audit, dan jika ya, dalam <b>area mana</b> dan sampai <b>sejauh mana</b>.
              Auditor juga dapat memanfaatkan <b>bantuan langsung</b> dari individu fungsi audit internal di bawah arahan,
              supervisi, dan reviu auditor. Tanggung jawab atas opini tetap sepenuhnya pada auditor — tidak berkurang oleh
              penggunaan pekerjaan IA.
            </p>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              {[
                { ic: 'shield', t: 'Evaluasi Fungsi (¶16)', d: 'Objektivitas, kompetensi, dan pendekatan sistematis & disiplin.' },
                { ic: 'layers', t: 'Nature & Extent (¶17–20)', d: 'Menentukan area & seberapa banyak pekerjaan IA digunakan.' },
                { ic: 'flask', t: 'Reperformansi (¶24)', d: 'Auditor melaksanakan kembali sebagian pekerjaan IA yang digunakan.' },
              ].map((c, i) => {
                const Ic = (I as Record<string, (p: { size?: number }) => JSX.Element>)[c.ic];
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

        <Panel noBody>
          <div className="panel-h"><h3>Pohon Keputusan Penggunaan</h3><div style={{ flex: 1 }} /><Badge kind={verdict.k}>{verdict.label}</Badge></div>
          <div style={{ padding: '6px 14px 14px' }}>
            {decision.map((d, i) => (
              <div key={i} className="row gap10" style={{ padding: '11px 0', alignItems: 'flex-start', borderBottom: i < decision.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
                <span style={{ flex: '0 0 auto', marginTop: 1, color: d.ok ? 'var(--green)' : 'var(--amber)' }}>
                  {d.ok ? <I.checkCircle size={17} /> : <I.alert size={17} />}
                </span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>{d.q}</div>
                  <div className="tiny muted" style={{ lineHeight: 1.4 }}>{d.a}</div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid" style={{ gap: 12 }}>
        <Panel title="Profil Fungsi Audit Internal" sub="Isian auditor — tidak ada sumber data fungsi audit internal klien di aplikasi">
          <div style={{ display: 'grid', gap: 9 }}>
            {IA_PROFILE_FIELDS.map((f) => (
              <div key={f.key} className="field">
                <label htmlFor={'ia-prof-' + f.key}>{f.label}</label>
                <input id={'ia-prof-' + f.key} className="input" value={profile[f.key]} placeholder={f.hint}
                  onChange={(e: FormEv) => setProfileField(f.key, e.target.value)} />
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Strategi Koordinasi (SA 315/300)">
          <div style={{ display: 'grid', gap: 7 }}>
            {[
              'Peroleh rencana audit internal tahunan & laporan fungsi audit internal yang terbit selama periode.',
              'Selaraskan jadwal opname & pengujian pengendalian agar tidak tumpang tindih.',
              'Sepakati protokol akses kertas kerja & komunikasi temuan audit internal ke tim audit.',
            ].map((t, i) => (
              <div key={i} className="row gap8" style={{ fontSize: 12, alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--blue)', flex: '0 0 auto', marginTop: 1 }}><I.arrowRight size={14} /></span>{t}
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ---------------- Tab: Evaluasi Fungsi IA ---------------- */
interface EvalProps {
  factors: IaFactor[];
  setV: (id: string, v: number | null) => void;
  setFactorNote: (id: string, note: string) => void;
  setSub: (id: string, idx: number, ok: boolean | null) => void;
  setSubNote: (id: string, idx: number, note: string) => void;
  score: IaScore;
  verdict: IaVerdict;
}

const SUB_STATUS = [
  { value: '', label: 'Belum dinilai' },
  { value: 'ok', label: 'Terpenuhi' },
  { value: 'no', label: 'Perhatian' },
];

function IAEvaluation({ factors, setV, setFactorNote, setSub, setSubNote, score, verdict }: EvalProps) {
  const [selId, setSelId] = useStateIA('obj');
  const sel = factors.find((f) => f.id === selId);
  return (
    <div className="grid split" style={{ gridTemplateColumns: '360px 1fr', gap: 12, alignItems: 'start' }}>
      <Panel title="Tiga Faktor Evaluasi" sub="SA 610 ¶16 · skala 1–5">
        {factors.map((f) => (
          <div key={f.id}
            style={{ marginBottom: 12, padding: '10px 11px', borderRadius: 8,
              border: '1px solid ' + (f.id === selId ? 'var(--blue)' : 'var(--line-soft)'),
              background: f.id === selId ? 'var(--blue-050)' : 'transparent' }}>
            {/* IA5 — kartu faktor dulu `<div onClick>`: tak fokusabel, tak
                menanggapi Enter/Space. Kontrol pemilihnya kini native. */}
            <button type="button" className="ia-rowbtn" aria-pressed={f.id === selId}
              title={'Lihat sub-kriteria — ' + f.k} onClick={() => setSelId(f.id)}>
              <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700 }}>{f.k} <span className="mono tiny muted">{f.ref}</span></span>
                <span className="mono" style={{ fontWeight: 700, color: scoreInk(f.v) }}>{f.v === null ? '—' : f.v + '/5'}</span>
              </span>
            </button>
            <div className="field">
              <label htmlFor={'ia-skor-' + f.id}>Skor faktor</label>
              <select id={'ia-skor-' + f.id} className="select" value={f.v === null ? '' : String(f.v)}
                onChange={(e: FormEv) => setV(f.id, e.target.value === '' ? null : Number(e.target.value))}>
                <option value="">Belum dinilai</option>
                {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} — {SCORE_LABEL[n]}</option>)}
              </select>
            </div>
            <div className="tiny muted" style={{ marginTop: 5, lineHeight: 1.35 }}>{f.ask}</div>
          </div>
        ))}
        <div className="divider" />
        <div className="panel" style={{ padding: '11px 12px', background: TONE_BG[verdict.k], borderColor: 'transparent' }}>
          <div className="row ac gap10">
            <span className="mono" style={{ fontSize: 22, fontWeight: 800, color: TONE_INK[verdict.k] }}>
              {score.avg === null ? '—' : score.avg.toFixed(1)}
            </span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 12, color: TONE_INK[verdict.k] }}>{verdict.label}</div>
              <div className="tiny" style={{ lineHeight: 1.4, marginTop: 2 }}>{verdict.t}</div>
            </div>
          </div>
        </div>
      </Panel>

      {sel && (
        <Panel noBody>
          <div style={{ background: 'var(--surface-2)', padding: '15px 18px', borderBottom: '1px solid var(--line)' }}>
            <div className="row ac gap8">
              <span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{sel.ref}</span>
              <Badge kind={sel.v === null ? 'gray' : sel.v >= 4 ? 'green' : sel.v >= 3 ? 'amber' : 'red'}>{sel.v === null ? 'Belum dinilai' : sel.v + '/5'}</Badge>
            </div>
            <div style={{ fontWeight: 700, fontSize: 15, marginTop: 3 }}>{sel.k}</div>
            <div className="tiny muted" style={{ lineHeight: 1.4 }}>{sel.ask}</div>
          </div>
          <table className="dtbl">
            <thead><tr><th>Sub-kriteria Penilaian</th><th style={{ width: 150 }}>Status</th><th style={{ width: 240 }}>Catatan Auditor</th></tr></thead>
            <tbody>
              {sel.subs.map((s, i) => (
                <tr key={i}>
                  <td style={{ whiteSpace: 'normal', lineHeight: 1.4 }}>{s.t}</td>
                  <td>
                    <div className="field">
                      <label htmlFor={'ia-sub-' + sel.id + '-' + i}>Status</label>
                      <select id={'ia-sub-' + sel.id + '-' + i} className="select"
                        value={s.ok === null ? '' : s.ok ? 'ok' : 'no'}
                        onChange={(e: FormEv) => setSub(sel.id, i, e.target.value === '' ? null : e.target.value === 'ok')}>
                        {SUB_STATUS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                  </td>
                  <td>
                    <div className="field">
                      <label htmlFor={'ia-subnote-' + sel.id + '-' + i}>Catatan</label>
                      <input id={'ia-subnote-' + sel.id + '-' + i} className="input" value={s.note || ''}
                        placeholder="dasar penilaian" onChange={(e: FormEv) => setSubNote(sel.id, i, e.target.value)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding: 12 }}>
            <div className="field">
              <label htmlFor={'ia-note-' + sel.id}>Justifikasi skor faktor {sel.k}</label>
              <input id={'ia-note-' + sel.id} className="input" value={sel.note}
                placeholder="mengapa skor ini yang diberikan" onChange={(e: FormEv) => setFactorNote(sel.id, e.target.value)} />
            </div>
          </div>
          <div className="panel" style={{ margin: 12, padding: '10px 12px', background: 'var(--blue-050)', borderColor: 'var(--blue-100)' }}>
            <div className="row gap8" style={{ alignItems: 'flex-start' }}>
              <span style={{ color: 'var(--blue)', flex: '0 0 auto' }}><I.book size={15} /></span>
              <span style={{ fontSize: 12, lineHeight: 1.45 }}>
                Faktor <b>{sel.k}</b> dinilai atas {sel.subs.length} sub-kriteria. Catatan perhatian tidak dengan
                sendirinya meniadakan penggunaan, namun menyempitkan area & menaikkan tingkat reperformansi atas
                pekerjaan terkait.
              </span>
            </div>
          </div>
        </Panel>
      )}
    </div>
  );
}

/* ---------------- Tab: Penggunaan Pekerjaan ---------------- */
function IAUsage() {
  const [selId, setSelId] = useStateIA('U1');
  const sel = IA_USE_AREAS.find((a) => a.id === selId);
  const judgKind = (j: string) => (j === 'Tinggi' ? 'red' : j === 'Sedang' ? 'amber' : 'green');
  const natKind = (n: string) => (n.startsWith('Tidak') ? 'gray' : n.startsWith('Bantuan') ? 'purple' : 'blue');
  return (
    <div className="grid split" style={{ gridTemplateColumns: '1fr 340px', gap: 12, alignItems: 'start' }}>
      <Panel noBody>
        <div className="panel-h"><h3>Area Penggunaan Pekerjaan Audit Internal</h3><div style={{ flex: 1 }} /><span className="tiny muted">{IA_USE_AREAS.length} area</span></div>
        <div className="panel" style={{ margin: 0, padding: '8px 14px', borderRadius: 0, borderLeft: 0, borderRight: 0, borderTop: 0, background: 'var(--blue-050)', display: 'flex', gap: 16, fontSize: 11 }}>
          <span className="muted">Makin tinggi <b>pertimbangan</b> &amp; <b>risiko</b>, makin sedikit pekerjaan IA dapat digunakan dan makin besar reperformansi (SA 610 ¶15, ¶18–19).</span>
        </div>
        <table className="dtbl">
          <thead><tr><th>Area / Prosedur</th><th>Pertimbangan</th><th>Bentuk Penggunaan</th><th style={{ width: 56 }}>Tingkat</th><th style={{ width: 110 }}>Hasil</th></tr></thead>
          <tbody>
            {IA_USE_AREAS.map((a) => (
              <tr key={a.id} className={a.id === selId ? 'sel' : ''}>
                {/* IA5 — baris dulu `<tr onClick>` bergaya pointer. Kontrol
                    pemilihnya kini native, di dalam sel pertama. */}
                <td style={{ padding: 0 }}>
                  <button type="button" className="ia-cellbtn" aria-pressed={a.id === selId}
                    title={'Lihat pertimbangan penggunaan — ' + a.area} onClick={() => setSelId(a.id)}>
                    <span style={{ display: 'block', whiteSpace: 'normal', lineHeight: 1.35 }}>{a.area}</span>
                    <span className="tiny muted" style={{ display: 'block', fontWeight: 400 }}>{a.assertion}</span>
                  </button>
                </td>
                <td><Badge kind={judgKind(a.judgment)}>{a.judgment}</Badge></td>
                <td><Badge kind={natKind(a.nature)}>{a.nature}</Badge></td>
                <td className="tiny" style={{ fontWeight: 600, color: a.extent === 'Tinggi' ? 'var(--green)' : a.extent === 'Sedang' ? 'var(--amber)' : 'var(--ink-3)' }}>{a.extent}</td>
                <td><Badge kind={a.result === 'Memadai' ? 'green' : a.result === 'Dikecualikan' ? 'red' : 'amber'}>{a.result}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
      {sel && (
        <Panel noBody>
          <div style={{ background: 'var(--surface-2)', padding: '15px 18px', borderBottom: '1px solid var(--line)' }}>
            <div className="row ac gap8"><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>Lead {sel.lead}</span><Badge kind={natKind(sel.nature)}>{sel.nature}</Badge></div>
            <div style={{ fontWeight: 700, fontSize: 13, marginTop: 3, lineHeight: 1.3 }}>{sel.area}</div>
            <div className="tiny muted">{sel.assertion}</div>
          </div>
          <div style={{ padding: 14 }}>
            <div className="tiny muted upper" style={{ marginBottom: 4 }}>Pertimbangan Penggunaan</div>
            <p style={{ margin: '0 0 12px', fontSize: 12, lineHeight: 1.5 }}>{sel.desc}</p>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <KvBox label="Pertimbangan" v={sel.judgment} accent={judgKind(sel.judgment) === 'red' ? 'var(--red)' : judgKind(sel.judgment) === 'amber' ? 'var(--amber)' : 'var(--green)'} />
              <KvBox label="Risiko (RMM)" v={sel.risk} accent={sel.risk === 'Signifikan' ? 'var(--red)' : sel.risk === 'Moderat' ? 'var(--amber)' : 'var(--green)'} />
            </div>
            <div className="tiny muted upper" style={{ marginBottom: 5 }}>Tingkat Reperformansi Direncanakan</div>
            <div className="row ac gap8" style={{ marginBottom: 12 }}>
              <div style={{ flex: 1 }}><Progress value={sel.reperf * 100} color={sel.reperf >= 1 ? 'var(--red)' : sel.reperf >= 0.5 ? 'var(--amber)' : 'var(--green)'} /></div>
              <span className="mono tiny" style={{ fontWeight: 700 }}>{Math.round(sel.reperf * 100)}%</span>
            </div>
            {sel.result === 'Dikecualikan' && (
              <div className="panel" style={{ padding: '9px 11px', background: 'var(--red-bg)', borderColor: 'transparent', marginBottom: 12 }}>
                <div className="row ac gap8"><span style={{ color: 'var(--red)' }}><I.alert size={15} /></span><span style={{ fontSize: 12, lineHeight: 1.4 }}>Pertimbangan signifikan — SA 610 ¶15 melarang pengandalan. Dikerjakan penuh oleh tim audit.</span></div>
              </div>
            )}
            {/* IA2 — tombol "Buka WP {lead}" DICABUT, tidak diaktifkan. Rujukan yang
                dijanjikannya ('PR-3', 'A-2', 'C-1', 'PR-1', 'B-4') tidak ada di
                register kertas kerja mana pun: `WORKPAPERS` (data_part1.ts) hanya
                memuat ref huruf A · B · C · E · F · R, dan `WP_MODULE_MAP`
                (wp_signoff.tsx) tak mengenal satu pun di antaranya. Menyambungkannya
                ke `nav('workpapers')` akan menamai tujuan yang tak pernah ada —
                lebih buruk daripada tidak menamainya. */}
          </div>
        </Panel>
      )}
    </div>
  );
}

/* ---------------- Tab: Reperformansi ---------------- */
function IAReperform() {
  const totExc = IA_REPERF.reduce((s, r) => s + r.exc, 0);
  const ok = IA_REPERF.filter((r) => r.status === 'Sesuai').length;
  const perluasan = IA_REPERF.filter((r) => r.status === 'Perlu Perluasan').length;
  return (
    <div className="grid" style={{ gap: 12 }}>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        <Panel><div style={{ padding: '15px 18px' }}><Stat value={IA_REPERF.length} label="Pos Diuji Ulang" /></div></Panel>
        <Panel><div style={{ padding: '15px 18px' }}><Stat value={ok} label="Konsisten dgn IA" accent="var(--green)" /></div></Panel>
        <Panel><div style={{ padding: '15px 18px' }}><Stat value={totExc} label="Pengecualian" accent={totExc ? 'var(--amber)' : 'var(--green)'} /></div></Panel>
        {/* dulu literal '1' — angka yang tak ikut bergerak bersama tabelnya */}
        <Panel><div style={{ padding: '15px 18px' }}><Stat value={perluasan} label="Area Perlu Perluasan" accent={perluasan ? 'var(--amber)' : 'var(--green)'} /></div></Panel>
      </div>
      <Panel noBody>
        <div className="panel-h"><h3>Reperformansi atas Pekerjaan IA yang Digunakan (¶24)</h3><div style={{ flex: 1 }} /><span className="tiny muted">Auditor melaksanakan kembali sebagian pekerjaan</span></div>
        <table className="dtbl">
          <thead><tr><th style={{ width: 64 }}>Ref</th><th>Area</th><th>Pos yang Direperform</th><th>Simpulan IA</th><th>Hasil Auditor</th><th className="num" style={{ width: 64 }}>Selisih</th><th style={{ width: 130 }}>Status</th></tr></thead>
          <tbody>
            {IA_REPERF.map((r) => (
              <tr key={r.id}>
                <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{r.id}</td>
                <td style={{ fontWeight: 600 }}>{r.area}</td>
                <td className="tiny">{r.item}</td>
                <td className="tiny muted">{r.iaConcl}</td>
                <td className="tiny">{r.reperf}</td>
                <td className="num mono" style={{ color: r.exc ? 'var(--amber)' : 'var(--ink-4)', fontWeight: 700 }}>{r.exc || '—'}</td>
                <td>{r.status === 'Sesuai'
                  ? <span className="row ac gap6 tiny" style={{ color: 'var(--green)', fontWeight: 600 }}><I.check size={13} /> Sesuai</span>
                  : <Badge kind={r.status === 'Perlu Perluasan' ? 'red' : 'amber'}>{r.status}</Badge>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="panel" style={{ margin: 12, padding: '10px 12px', background: 'var(--amber-bg)', borderColor: 'transparent' }}>
          <div className="row gap8" style={{ alignItems: 'flex-start' }}>
            <span style={{ color: 'var(--amber)', flex: '0 0 auto' }}><I.flask size={15} /></span>
            <span style={{ fontSize: 12, lineHeight: 1.45 }}>
              Reperformansi mengonfirmasi simpulan audit internal pada area penggajian, bank &amp; opname (selisih opname
              &lt; clearly trivial threshold). Pada <b>siklus pendapatan</b>, ditemukan 2 kekurangan dokumentasi — tim audit
              <b> memperluas pengujian substantif sendiri</b> dan tidak mengandalkan pekerjaan IA atas area tersebut.
            </span>
          </div>
        </div>
      </Panel>
    </div>
  );
}

/* ---------------- Tab: Bantuan Langsung ---------------- */
function IADirect() {
  const totHrs = IA_DIRECT.reduce((s, d) => s + d.hours, 0);
  return (
    <div className="grid split" style={{ gridTemplateColumns: '1fr 340px', gap: 12, alignItems: 'start' }}>
      <div className="grid" style={{ gap: 12 }}>
        <Panel noBody>
          <div className="panel-h"><h3>Individu yang Memberikan Bantuan Langsung (¶26–33)</h3><div style={{ flex: 1 }} /><span className="tiny muted">{totHrs} jam</span></div>
          <table className="dtbl">
            <thead><tr><th style={{ width: 56 }}>Ref</th><th>Individu</th><th>Tugas yang Diberikan</th><th>Supervisi</th><th>Reviu</th><th className="num" style={{ width: 52 }}>Jam</th><th style={{ width: 96 }}>Status</th></tr></thead>
            <tbody>
              {IA_DIRECT.map((d) => (
                <tr key={d.id}>
                  <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{d.id}</td>
                  <td style={{ fontWeight: 600 }}>{d.name}</td>
                  <td className="tiny" style={{ whiteSpace: 'normal', lineHeight: 1.35 }}>{d.task}</td>
                  <td className="tiny muted">{d.superv}</td>
                  <td><Badge kind="green">{d.review}</Badge></td>
                  <td className="num mono">{d.hours}</td>
                  <td>{d.status === 'Selesai'
                    ? <span className="row ac gap6 tiny" style={{ color: 'var(--green)', fontWeight: 600 }}><I.check size={13} /> Selesai</span>
                    : <Badge kind="amber">Berlangsung</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
        <Panel noBody>
          <div className="panel-h"><h3>Pembatasan Bantuan Langsung (¶30–31)</h3><div style={{ flex: 1 }} /><Badge kind="red">Dilarang</Badge></div>
          <div style={{ padding: '6px 14px 14px' }}>
            <p className="tiny muted" style={{ margin: '4px 0 10px', lineHeight: 1.45 }}>Individu IA <b>tidak boleh</b> ditugaskan untuk hal-hal berikut saat memberikan bantuan langsung:</p>
            {IA_PROHIBIT.map((t, i) => (
              <div key={i} className="row gap8" style={{ padding: '8px 0', alignItems: 'flex-start', borderBottom: i < IA_PROHIBIT.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
                <span style={{ color: 'var(--red)', flex: '0 0 auto', marginTop: 1 }}><I.x size={15} /></span>
                <span style={{ fontSize: 12, lineHeight: 1.4 }}>{t}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid" style={{ gap: 12 }}>
        <Panel title="Prasyarat Bantuan Langsung">
          <div style={{ display: 'grid', gap: 7 }}>
            {[
              'Evaluasi ancaman objektivitas & kompetensi individu (¶29)',
              'Persetujuan tertulis entitas — individu boleh ikuti instruksi auditor (¶33a)',
              'Persetujuan tertulis individu IA — jaga kerahasiaan (¶33b)',
              'Arahan, supervisi & reviu memadai oleh auditor (¶34)',
            ].map((t, i) => (
              <div key={i} className="row gap8" style={{ fontSize: 12, alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--blue)', flex: '0 0 auto', marginTop: 1 }}><I.arrowRight size={15} /></span>
                <span style={{ lineHeight: 1.4 }}>{t}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Reviu Pekerjaan Bantuan Langsung">
          <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: 'var(--ink-2)' }}>
            Seluruh pekerjaan bantuan langsung direviu <b>100%</b> oleh anggota tim audit yang lebih senior.
            Sifat tugas dibatasi pada prosedur <b>non-judgmental</b> (observasi, vouching, penghitungan ulang).
            Auditor tetap mempertimbangkan kembali kecukupan keterlibatannya sendiri (¶32).
          </p>
        </Panel>
      </div>
    </div>
  );
}

/* ---------------- Tab: Kesimpulan & Dampak ---------------- */
interface ConclusionProps {
  verdict: IaVerdict;
  score: IaScore;
  conclusion: IaConclusion | null;
  blockReason: string;
}

function IAConclusionTab({ verdict, score, conclusion, blockReason }: ConclusionProps) {
  return (
    <div className="grid split" style={{ gridTemplateColumns: '1fr 340px', gap: 12, alignItems: 'start' }}>
      <div className="grid" style={{ gap: 12 }}>
        <Panel noBody>
          <div className="panel-h"><h3>Dampak terhadap Strategi &amp; Lingkup Audit (¶18)</h3><div style={{ flex: 1 }} /></div>
          <table className="dtbl">
            <thead><tr><th>Area</th><th>Tanpa Penggunaan IA</th><th>Dengan Penggunaan IA</th><th style={{ width: 120 }}>Efek</th></tr></thead>
            <tbody>
              {[
                { a: 'Pengujian pengendalian penggajian', wo: '40 sampel sendiri', w: '20 sampel + reperform 20%', e: 'Efisiensi' },
                { a: 'Rekonsiliasi bank', wo: '12 rekonsiliasi', w: 'Andalkan IA + reperform 15%', e: 'Efisiensi' },
                { a: 'Observasi opname cabang', wo: '3 tim ke 3 lokasi', w: 'Bantuan langsung di 1 lokasi', e: 'Efisiensi' },
                { a: 'Pengakuan pendapatan', wo: 'Substantif penuh', w: 'Substantif penuh (tdk berubah)', e: 'Tidak berubah' },
                { a: 'CKPN (PSAK 71)', wo: 'Dikerjakan tim audit', w: 'Dikerjakan tim audit', e: 'Tidak berubah' },
              ].map((r, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{r.a}</td>
                  <td className="tiny muted">{r.wo}</td>
                  <td className="tiny">{r.w}</td>
                  <td>{r.e === 'Efisiensi' ? <Badge kind="green">{r.e}</Badge> : <Badge kind="gray">{r.e}</Badge>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <Panel title="Kesimpulan Auditor (SA 610)">
          {/* Paragraf ini dulu MENYATAKAN bahwa fungsi audit internal "dinilai
              memenuhi" ketiga faktor — kalimat yang sama muncul juga ketika verdict
              merah. Teks kesimpulan kini berasal dari mesin yang sama dengan skornya. */}
          <p style={{ margin: '0 0 10px', fontSize: 12, lineHeight: 1.6 }}>{verdict.t}</p>
          <p style={{ margin: '0 0 10px', fontSize: 12, lineHeight: 1.6, color: 'var(--ink-2)' }}>
            Tanggung jawab atas opini tetap sepenuhnya pada auditor dan tidak berkurang oleh penggunaan pekerjaan
            fungsi audit internal (SA 610 ¶11). Bantuan langsung dibatasi pada prosedur non-judgmental, dengan arahan,
            supervisi, dan reviu auditor.
          </p>
          <div className="panel" style={{ padding: '10px 12px', background: TONE_BG[verdict.k], borderColor: 'transparent' }}>
            <div className="row ac gap8">
              <span style={{ color: TONE_INK[verdict.k] }}><I.checkCircle size={16} /></span>
              <span style={{ fontSize: 12, fontWeight: 600 }}>
                {score.avg === null
                  ? `Evaluasi ¶16 belum selesai — ${score.scored} dari ${score.total} faktor dinilai.`
                  : `Rata-rata evaluasi ¶16: ${score.avg.toFixed(1)} / 5 — ${verdict.label}.`}
              </span>
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid" style={{ gap: 12 }}>
        <Panel title="Dokumentasi (¶36–37)">
          <div style={{ display: 'grid', gap: 6 }}>
            {[
              { t: 'Evaluasi tiga faktor fungsi IA', wp: 'A-610.1' },
              { t: 'Nature & extent penggunaan', wp: 'A-610.2' },
              { t: 'Hasil reperformansi', wp: 'A-610.3' },
              { t: 'Perjanjian & reviu bantuan langsung', wp: 'A-610.4' },
            ].map((r, i) => (
              <div key={i} className="row jb ac" style={{ fontSize: 12, padding: '7px 9px', border: '1px solid var(--line-soft)', borderRadius: 6 }}>
                <span className="row ac gap8"><span style={{ color: 'var(--blue)' }}><I.doc size={14} /></span>{r.t}</span>
                <span className="mono tiny" style={{ color: 'var(--blue)', fontWeight: 700 }}>{r.wp}</span>
              </div>
            ))}
          </div>
        </Panel>
        {/* Panel "Sign-off" berisi tiga nama personel dengan tanggal dan `done: true`
            DICABUT: modul ini tak terdaftar di `WP_MODULE_MAP`, jadi tanda tangan itu
            tak pernah ada. Yang tersisa adalah rekaman yang benar-benar dibuat. */}
        <Panel title="Rekaman Kesimpulan">
          {conclusion ? (
            <div style={{ display: 'grid', gap: 8 }}>
              <KvBox label="Disimpulkan oleh" v={conclusion.by} />
              <KvBox label="Tanggal" v={conclusion.at} />
              <KvBox label="Rata-rata evaluasi ¶16" v={conclusion.avg.toFixed(1) + ' / 5'} />
              <KvBox label="Keputusan" v={conclusion.verdict} accent={TONE_INK[verdict.k]} />
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              <div className="tiny muted" style={{ lineHeight: 1.45 }}>
                Kesimpulan penggunaan pekerjaan fungsi audit internal belum diambil.
                {blockReason ? ' ' + blockReason + '.' : ' Gunakan tombol “Simpulkan” di bilah atas.'}
              </div>
              <div className="tiny muted" style={{ lineHeight: 1.45 }}>
                Modul ini belum tersambung ke rantai sign-off kertas kerja (penyusun · penelaah · rekan) —
                lihat usulan IA6.
              </div>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { InternalAudit };
