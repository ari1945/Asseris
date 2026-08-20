/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { useAudit, useAuth, useFirm, useAmsPersist, useMateriality } from './contexts';
import { I } from './icons';
import { SubBar } from './shell';
import { Badge, Btn, Check, Panel, Progress, Stat, Tabs } from './ui';
import { amsExportPdf } from './export_pdf';
import { KvBox } from './view_analytical';
import {
  IA_PROFILE_FIELDS, normalizeIaDoc,
  IA_JUDGMENT_LEVELS, IA_RISK_LEVELS, IA_NATURE_KINDS, IA_EXTENT_LEVELS, IA_USE_RESULTS,
  IA_REPERF_DISPOSITIONS, IA_REVIEW_LEVELS, IA_DIRECT_STATUSES,
  newIaUseArea, newIaReperfItem, newIaDirectItem,
  iaScore, iaVerdict, iaActor, iaConcludeBlockReason,
  iaAreaIsReliant, iaUseAreaConflicts, iaUseAreaIncomplete, iaUseAreaImpact,
  iaDiffAgainstCtt, iaReperfConflicts, iaReperfSummarize, iaAreasWithoutReperf,
  iaDirectBlockers, iaDirectStatusBlockReason, iaDirectViolations, iaDirectHours,
  iaDocumentationChecklist,
  iaMemoContext, sa610MemoBlockers, sa610ExportBlockReason,
  sa610MemoTitle, sa610MemoRefNo, sa610MemoMeta, sa610MemoFileName, buildSa610Blocks,
  type IaConclusion, type IaDirectItem, type IaDirectStatus, type IaDoc, type IaFactor,
  type IaMemoContext, type IaProfile, type IaReperfItem, type IaScore, type IaUseArea,
  type IaVerdict, type IaVerdictKind, type Sa610MemoInput,
} from './internalaudit_memo';

/* ============================================================
   Asseris — Penggunaan Pekerjaan Audit Internal (SA 610)
   Deep workpaper: konteks & strategi, evaluasi fungsi IA,
   penggunaan pekerjaan, reperformansi, bantuan langsung (direct
   assistance), kesimpulan & dampak terhadap audit.

   Model kertas kerja, aritmetika skor, mesin pertentangan, dan perakitan memo
   TERSEGEL hidup di `internalaudit_memo.ts` (murni & diuji). Berkas ini merender
   & menyunting.

   Yang dicabut arc IA1–IA5 — dan sebabnya, agar tak ditulis ulang:
     · `IA_PROFILE` — profil fungsi audit internal KLIEN sebagai konstanta modul:
       nama unit, garis pelaporan, nama kepala, jumlah personel, tanggal piagam.
       Sama untuk setiap klien, tak dapat disunting, dirender sebagai fakta di dua
       tempat. Kini isian auditor yang ter-persist, diseed KOSONG.
     · `IA_FACTORS_SEED` — skor 4/4/3 dengan sub-kriteria yang sudah dijawab.
     · identitas literal pada memo TERSEGEL (`ENG-2025-014`, `FY2025`, nama KAP,
       jatuh-balik nama klien) — lihat kepala `internalaudit_memo.ts`.
     · blok "Sign-off" berisi tiga nama personel dengan tanggal dan `done: true`.

   Yang dicabut arc IA7 — tiga register yang MENYATAKAN pekerjaan audit:
     · `IA_USE_AREAS` — lima area penggunaan ber-`result: 'Memadai'` dengan uraian
       dalam bentuk telah-dikerjakan, dan kolom `lead` ('PR-3','A-2','C-1','PR-1',
       'B-4') yang tak ada di `WORKPAPERS` maupun `WP_MODULE_MAP`;
     · `IA_REPERF` — lima pos reperformansi beserta HASIL auditor, jumlah
       pengecualian, dan status 'Selisih < CTT' yang menyebut ambang jelas-remeh
       tanpa pernah membacanya dari kanon materialitas perikatan;
     · `IA_DIRECT` — tiga INDIVIDU BERNAMA beserta penyelia, jam, dan status
       'Selesai', bersanding dengan panel "Prasyarat" berisi empat centang hijau
       yang dipaku (¶29/¶33) sehingga tak pernah dapat merah;
     · tabel "Dampak terhadap Strategi & Lingkup Audit (¶18)" — lima baris literal
       ("40 sampel sendiri" jadi "20 sampel + reperform 20%") yang tak pernah
       bergerak mengikuti satu pun keputusan;
     · daftar "Dokumentasi (¶36–37)" bersama rujukan arsip 'A-610.1' s.d.
       'A-610.4' — indeks berkas yang tak ada di register kertas kerja mana pun,
       dan tak satu pun butirnya punya keadaan "belum";
     · paragraf naratif yang menyimpulkan hasil reperformansi, dan klaim bahwa
       seluruh pekerjaan bantuan langsung "direviu 100%".

   Ketiganya kini register ter-persist per perikatan, diseed KOSONG, dapat
   disunting, dengan mesin yang MEMBANTAH jawaban yang tak konsisten alih-alih
   menyediakan jawabannya.

   BELUM: rantai sign-off `WpPanel` dan pemindahan ambang skor ke
   `assessment_model` — keputusan alur kerja, lihat
   `docs/usulan-IA6-internalaudit-skor-dan-signoff.md`.
   ============================================================ */
const { useState: useStateIA, useMemo: useMemoIA, useId: useIdIA } = React;

/* Tipe event struktural — proyek ini tanpa @types/react (shim W13), jadi
   React.ChangeEvent tak tersedia; cukup bentuk yang kita pakai. */
type FormEv = { target: { value: string } };

/* Peran warna verdict dienumerasi, BUKAN dirakit `var(--${k})`: token yang
   disusun saat runtime tak terbaca gerbang `css_tokens`, dan `--gray` tak pernah
   ada — substitusi yang gagal jatuh diam-diam ke warna warisan. */
const TONE_INK: Record<IaVerdictKind, string> = {
  green: 'var(--green)', amber: 'var(--amber)', red: 'var(--red)', gray: 'var(--ink-3)',
};
const TONE_BG: Record<IaVerdictKind, string> = {
  green: 'var(--green-bg)', amber: 'var(--amber-bg)', red: 'var(--red-bg)', gray: 'var(--surface-2)',
};

const SCORE_LABEL: Record<number, string> = {
  1: 'sangat tidak memadai', 2: 'tidak memadai', 3: 'cukup', 4: 'memadai', 5: 'sangat memadai',
};

const scoreInk = (v: number | null): string =>
  v === null ? 'var(--ink-4)' : v >= 4 ? 'var(--green)' : v >= 3 ? 'var(--amber)' : 'var(--red)';

const shown = (s: string): string => (s && s.trim()) || '—';

const numOrNull = (s: string, min?: number, max?: number): number | null => {
  const t = (s || '').trim();
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n)) return null;
  if (min !== undefined && n < min) return min;
  if (max !== undefined && n > max) return max;
  return n;
};

/* Larangan ¶30–31 adalah kutipan TUNTUTAN standar, bukan pernyataan tentang
   pekerjaan yang sudah dilakukan — karena itu ia tetap konstanta. */
const IA_PROHIBIT = [
  'Prosedur yang melibatkan pertimbangan signifikan (mis. estimasi akuntansi kompleks)',
  'Area dengan risiko salah saji material signifikan / fraud yang lebih tinggi',
  'Pekerjaan yang berkaitan dengan pekerjaan fungsi audit internal itu sendiri (self-review)',
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
.ia-empty{ padding:22px 16px; text-align:center; color:var(--ink-3); font-size:12px; line-height:1.5; }
.ia-conflict{ border-left:3px solid var(--amber); background:var(--amber-bg); border-radius:6px; padding:8px 11px; font-size:12px; line-height:1.45; }
.ia-conflict ul{ margin:4px 0 0; padding-left:17px; }
`;

/* ---- Primitif isian berlabel. Label dan kontrolnya BERSAUDARA di sumber,
   sehingga pemindai `a11y_field_labels` benar-benar melihat pasangannya. ---- */

function TextField({ id, label, value, onChange, placeholder }: {
  id: string; label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} className="input" value={value} placeholder={placeholder}
        onChange={(e: FormEv) => onChange(e.target.value)} />
    </div>
  );
}

function NumField({ id, label, value, onChange, placeholder, min, max }: {
  id: string; label: string; value: number | null; onChange: (v: number | null) => void;
  placeholder?: string; min?: number; max?: number;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} className="input" type="number" inputMode="decimal" min={min} max={max}
        value={value === null ? '' : String(value)} placeholder={placeholder}
        onChange={(e: FormEv) => onChange(numOrNull(e.target.value, min, max))} />
    </div>
  );
}

function ChoiceField({ id, label, value, options, onChange, emptyLabel, blockedReason }: {
  id: string; label: string; value: string; options: readonly string[];
  onChange: (v: string) => void; emptyLabel?: string;
  /** alasan sebuah opsi terkunci — dipanggil per opsi; '' berarti boleh */
  blockedReason?: (v: string) => string;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select id={id} className="select" value={value} onChange={(e: FormEv) => onChange(e.target.value)}>
        {options.map((o) => {
          const why = o && blockedReason ? blockedReason(o) : '';
          const locked = !!why && o !== value;
          return (
            <option key={o || '_'} value={o} disabled={locked} title={why || undefined}>
              {o === '' ? (emptyLabel || '— belum dipilih —') : o}{locked ? ' (terkunci)' : ''}
            </option>
          );
        })}
      </select>
    </div>
  );
}

function ConflictBox({ reasons, title }: { reasons: string[]; title: string }) {
  if (!reasons.length) return null;
  return (
    <div className="ia-conflict" style={{ marginTop: 4 }}>
      <span className="row ac gap8" style={{ fontWeight: 700 }}>
        <span style={{ color: 'var(--amber)' }}><I.alert size={14} /></span>{title}
      </span>
      <ul>{reasons.map((r, i) => <li key={i}>{r}</li>)}</ul>
    </div>
  );
}

/* ============================================================ */
function InternalAudit() {
  const firm = useFirm();
  const auth = useAuth();
  const audit = useAudit();
  const mat = useMateriality();
  const [tab, setTab] = useStateIA('konteks');

  /* Dokumen kertas kerja SA 610. `normalizeIaDoc` adalah jalur kompatibilitas:
     sebelum arc IA1–IA5 kunci yang sama menyimpan LARIK faktor telanjang, dan
     dokumen ver 2 (tanpa register) masih ada di perikatan yang sudah dipakai. */
  const [raw, setRaw] = useAmsPersist('internalAudit.v1', () => normalizeIaDoc(null));
  const doc: IaDoc = useMemoIA(() => normalizeIaDoc(raw), [raw]);
  const patch = (fn: (d: IaDoc) => IaDoc) => setRaw((prev: unknown) => fn(normalizeIaDoc(prev)));

  const factors = doc.factors;
  const profile = doc.profile;
  const score = iaScore(factors);
  const verdict = iaVerdict(score.avg);

  /* Ambang jelas remeh perikatan — dibaca dari kanon materialitas, bukan ditulis
     ke dalam string status seperti 'Selisih < CTT' sebelum arc IA7. */
  const cttFull: number | null = mat && typeof mat.cttFull === 'number' ? mat.cttFull : null;
  const workpapers = (audit && audit.workpapers) || [];

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

  /* ---- Register ---- */
  const addUseArea = () => patch((d) => ({ ...d, useAreas: [...d.useAreas, newIaUseArea(d.useAreas)] }));
  const patchUseArea = (id: string, p: Partial<IaUseArea>) =>
    patch((d) => ({ ...d, useAreas: d.useAreas.map((a) => (a.id === id ? { ...a, ...p } : a)) }));
  /* Menghapus area ikut MELEPAS tautan pos reperformansi yang menunjuknya —
     tautan ke area yang tak ada lagi terbaca sebagai reperformansi atas sesuatu
     yang tak pernah dicatat. */
  const removeUseArea = (id: string) => patch((d) => ({
    ...d,
    useAreas: d.useAreas.filter((a) => a.id !== id),
    reperf: d.reperf.map((r) => (r.areaId === id ? { ...r, areaId: '' } : r)),
  }));

  const addReperf = () => patch((d) => ({ ...d, reperf: [...d.reperf, newIaReperfItem(d.reperf)] }));
  const patchReperf = (id: string, p: Partial<IaReperfItem>) =>
    patch((d) => ({ ...d, reperf: d.reperf.map((r) => (r.id === id ? { ...r, ...p } : r)) }));
  const removeReperf = (id: string) => patch((d) => ({ ...d, reperf: d.reperf.filter((r) => r.id !== id) }));

  const addDirect = () => patch((d) => ({ ...d, direct: [...d.direct, newIaDirectItem(d.direct)] }));
  const patchDirect = (id: string, p: Partial<IaDirectItem>) =>
    patch((d) => ({ ...d, direct: d.direct.map((x) => (x.id === id ? { ...x, ...p } : x)) }));
  const removeDirect = (id: string) => patch((d) => ({ ...d, direct: d.direct.filter((x) => x.id !== id) }));

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

  const memoInput = (): Sa610MemoInput => ({
    ctx: memoCtx, factors, profile, score, verdict, conclusion: doc.conclusion,
    useAreas: doc.useAreas, reperf: doc.reperf, direct: doc.direct, cttFull, date: AMS.TODAY,
  });

  const [exporting, setExporting] = useStateIA(false);
  const onExportMemo = async () => {
    if (exporting) return;
    /* Berkas bersegel membawa identitas ke luar aplikasi dan tak dapat ditarik
       kembali. Identitas yang tak diketahui → TIDAK diterbitkan. */
    if (memoBlockers.length) return;
    setExporting(true);
    try {
      const input = memoInput();
      await amsExportPdf({
        kind: 'sa610-memo', scope: 'engagement',
        fileName: sa610MemoFileName(input),
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

        {tab === 'konteks' && <IAContext profile={profile} setProfileField={setProfileField} score={score} verdict={verdict} conclusion={doc.conclusion} useAreas={doc.useAreas} />}
        {tab === 'evaluasi' && <IAEvaluation factors={factors} setV={setV} setFactorNote={setFactorNote} setSub={setSub} setSubNote={setSubNote} score={score} verdict={verdict} />}
        {tab === 'penggunaan' && <IAUsage areas={doc.useAreas} add={addUseArea} patchRow={patchUseArea} removeRow={removeUseArea} workpapers={workpapers} />}
        {tab === 'reperform' && <IAReperform rows={doc.reperf} areas={doc.useAreas} add={addReperf} patchRow={patchReperf} removeRow={removeReperf} cttFull={cttFull} />}
        {tab === 'direct' && <IADirect rows={doc.direct} add={addDirect} patchRow={patchDirect} removeRow={removeDirect} />}
        {tab === 'kesimpulan' && <IAConclusionTab doc={doc} verdict={verdict} score={score} blockReason={concludeBlock} />}

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
  useAreas: IaUseArea[];
}

function IAContext({ profile, setProfileField, score, verdict, conclusion, useAreas }: ContextProps) {
  const uid = useIdIA();
  /* Pohon keputusan DITURUNKAN dari keadaan kertas kerja. Sebelum arc IA1–IA5 ia
     memuat jawaban tetap — termasuk "Skor 3,7/5" yang ditulis tangan dan tidak
     lagi cocok dengan mesin begitu auditor menggeser satu skor. */
  const dikecualikan = useAreas.filter((a) => a.result === 'Dikecualikan').length;
  const berpertimbangan = useAreas.filter((a) => a.judgment === 'Tinggi' || a.risk === 'Signifikan').length;
  const decision = [
    { q: 'Apakah fungsi audit internal ada & relevan dengan audit?',
      a: profile.unit.trim() ? profile.unit.trim() : 'Belum diprofilkan — isi Profil Fungsi Audit Internal di samping.',
      ok: !!profile.unit.trim() },
    { q: 'Objektivitas, kompetensi & pendekatan sistematis memadai? (¶16)',
      a: score.avg === null
        ? `Belum — ${score.scored} dari ${score.total} faktor dinilai (lihat Evaluasi).`
        : `${verdict.label} — rata-rata ${score.avg.toFixed(1)}/5 (lihat Evaluasi).`,
      ok: verdict.k === 'green' },
    { q: 'Apakah area melibatkan pertimbangan signifikan / risiko signifikan? (¶15, ¶19)',
      a: useAreas.length === 0
        ? 'Belum ada area penggunaan yang dicatat (lihat Penggunaan Pekerjaan).'
        : `${berpertimbangan} dari ${useAreas.length} area berpertimbangan tinggi / berisiko signifikan · ${dikecualikan} dikecualikan.`,
      ok: useAreas.length > 0 && berpertimbangan === dikecualikan },
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
              <TextField key={f.key} id={uid + '-prof-' + f.key} label={f.label}
                value={profile[f.key]} placeholder={f.hint}
                onChange={(v) => setProfileField(f.key, v)} />
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
  const uid = useIdIA();
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
              <label htmlFor={uid + '-skor-' + f.id}>Skor faktor</label>
              <select id={uid + '-skor-' + f.id} className="select" value={f.v === null ? '' : String(f.v)}
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
                      <label htmlFor={uid + '-sub-' + sel.id + '-' + i}>Status</label>
                      <select id={uid + '-sub-' + sel.id + '-' + i} className="select"
                        value={s.ok === null ? '' : s.ok ? 'ok' : 'no'}
                        onChange={(e: FormEv) => setSub(sel.id, i, e.target.value === '' ? null : e.target.value === 'ok')}>
                        {SUB_STATUS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                  </td>
                  <td>
                    <TextField id={uid + '-subnote-' + sel.id + '-' + i} label="Catatan"
                      value={s.note || ''} placeholder="dasar penilaian"
                      onChange={(v) => setSubNote(sel.id, i, v)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding: 12 }}>
            <TextField id={uid + '-note-' + sel.id} label={'Justifikasi skor faktor ' + sel.k}
              value={sel.note} placeholder="mengapa skor ini yang diberikan"
              onChange={(v) => setFactorNote(sel.id, v)} />
          </div>
          <div className="panel" style={{ margin: 12, padding: '10px 12px', background: 'var(--blue-050)', borderColor: 'var(--blue-100)' }}>
            <div className="row gap8" style={{ alignItems: 'flex-start' }}>
              <span style={{ color: 'var(--blue)', flex: '0 0 auto' }}><I.book size={15} /></span>
              <span style={{ fontSize: 12, lineHeight: 1.45 }}>
                Faktor <b>{sel.k}</b> dinilai atas {sel.subs.length} sub-kriteria. Catatan perhatian tidak dengan
                sendirinya meniadakan penggunaan, namun menyempitkan area &amp; menaikkan tingkat reperformansi atas
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
interface UsageProps {
  areas: IaUseArea[];
  add: () => void;
  patchRow: (id: string, p: Partial<IaUseArea>) => void;
  removeRow: (id: string) => void;
  workpapers: Array<{ ref: string; title: string }>;
}

const judgKind = (j: string) => (j === 'Tinggi' ? 'red' : j === 'Sedang' ? 'amber' : j === '' ? 'gray' : 'green');
const riskKind = (r: string) => (r === 'Signifikan' ? 'red' : r === 'Moderat' ? 'amber' : r === '' ? 'gray' : 'green');
const natKind = (n: string) => (n === '' || n.startsWith('Tidak') ? 'gray' : n.startsWith('Bantuan') ? 'purple' : 'blue');
const resKind = (r: string) => (r === 'Memadai' ? 'green' : r === 'Dikecualikan' ? 'red' : r === '' ? 'gray' : 'amber');

function IAUsage({ areas, add, patchRow, removeRow, workpapers }: UsageProps) {
  const uid = useIdIA();
  const [selId, setSelId] = useStateIA('');
  const sel = areas.find((a) => a.id === selId) || null;
  /* Rujukan kertas kerja HANYA dari kertas kerja yang benar-benar ada di
     perikatan. Sebelum arc IA7 kolom ini string bebas berisi 'PR-3'/'A-2'/… —
     rujukan yang tak resolve ke mana pun. */
  const wpOptions = ['', ...workpapers.map((w) => w.ref)];
  const wpTitle = (ref: string) => {
    const w = workpapers.find((x) => x.ref === ref);
    return w ? w.ref + ' — ' + w.title : ref;
  };
  return (
    <div className="grid split" style={{ gridTemplateColumns: '1fr 340px', gap: 12, alignItems: 'start' }}>
      <Panel noBody>
        <div className="panel-h">
          <h3>Area Penggunaan Pekerjaan Audit Internal</h3><div style={{ flex: 1 }} />
          <span className="tiny muted" style={{ marginRight: 8 }}>{areas.length} area</span>
          <Btn sm onClick={add} title="Tambah area penggunaan"><I.plus size={13} /> Tambah area</Btn>
        </div>
        <div className="panel" style={{ margin: 0, padding: '8px 14px', borderRadius: 0, borderLeft: 0, borderRight: 0, borderTop: 0, background: 'var(--blue-050)', display: 'flex', gap: 16, fontSize: 11 }}>
          <span className="muted">Makin tinggi <b>pertimbangan</b> &amp; <b>risiko</b>, makin sedikit pekerjaan IA dapat digunakan dan makin besar reperformansi (SA 610 ¶15, ¶18–19).</span>
        </div>
        {areas.length === 0 ? (
          <div className="ia-empty">
            <div style={{ marginBottom: 10 }}>
              Belum ada area penggunaan yang dicatat untuk perikatan ini. Area, pertimbangan, risiko, bentuk &amp;
              tingkat penggunaan diisi auditor — tidak ada yang disediakan lebih dulu.
            </div>
            <Btn sm variant="primary" onClick={add} title="Tambah area penggunaan pertama"><I.plus size={13} /> Tambah area pertama</Btn>
          </div>
        ) : (
          <table className="dtbl">
            <thead><tr><th style={{ width: 76 }}>Ref</th><th>Area / Prosedur</th><th style={{ width: 104 }}>Pertimbangan</th><th style={{ width: 104 }}>Risiko</th><th>Bentuk Penggunaan</th><th style={{ width: 110 }}>Hasil</th><th style={{ width: 44 }} /></tr></thead>
            <tbody>
              {areas.map((a) => {
                const c = iaUseAreaConflicts(a);
                return (
                  <tr key={a.id} className={a.id === selId ? 'sel' : ''}>
                    <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{a.id}</td>
                    {/* IA5 — baris dulu `<tr onClick>` bergaya pointer. Kontrol
                        pemilihnya kini native, di dalam sel pertama. */}
                    <td style={{ padding: 0 }}>
                      <button type="button" className="ia-cellbtn" aria-pressed={a.id === selId}
                        title={'Sunting area ' + a.id} onClick={() => setSelId(a.id)}>
                        <span style={{ display: 'block', whiteSpace: 'normal', lineHeight: 1.35 }}>
                          {a.area.trim() || '— belum diberi nama —'}
                          {c.length > 0 && <span style={{ color: 'var(--amber)', marginLeft: 6 }} title="Ada pertentangan"><I.alert size={12} /></span>}
                        </span>
                        <span className="tiny muted" style={{ display: 'block', fontWeight: 400 }}>{a.assertion.trim() || 'asersi belum diisi'}</span>
                      </button>
                    </td>
                    <td><Badge kind={judgKind(a.judgment)}>{a.judgment || '—'}</Badge></td>
                    <td><Badge kind={riskKind(a.risk)}>{a.risk || '—'}</Badge></td>
                    <td><Badge kind={natKind(a.nature)}>{a.nature || '—'}</Badge></td>
                    <td><Badge kind={resKind(a.result)}>{a.result || '—'}</Badge></td>
                    <td>
                      <Btn sm icon title={'Hapus area ' + a.id} aria-label={'Hapus area ' + a.id}
                        onClick={() => { if (a.id === selId) setSelId(''); removeRow(a.id); }}>
                        <I.trash size={13} />
                      </Btn>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Panel>

      {sel ? (
        <Panel noBody>
          <div style={{ background: 'var(--surface-2)', padding: '15px 18px', borderBottom: '1px solid var(--line)' }}>
            <div className="row ac gap8">
              <span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{sel.id}</span>
              <Badge kind={natKind(sel.nature)}>{sel.nature || 'Bentuk belum ditentukan'}</Badge>
            </div>
            <div style={{ fontWeight: 700, fontSize: 13, marginTop: 3, lineHeight: 1.3 }}>{sel.area.trim() || '— belum diberi nama —'}</div>
            <div className="tiny muted">Dampak terhadap lingkup audit: {iaUseAreaImpact(sel)}</div>
          </div>
          <div style={{ padding: 14, display: 'grid', gap: 9 }}>
            <TextField id={uid + '-area-' + sel.id} label="Area / prosedur" value={sel.area}
              placeholder="mis. pengujian pengendalian siklus penggajian"
              onChange={(v) => patchRow(sel.id, { area: v })} />
            <TextField id={uid + '-asr-' + sel.id} label="Asersi yang disentuh" value={sel.assertion}
              placeholder="mis. Akurasi · Keterjadian" onChange={(v) => patchRow(sel.id, { assertion: v })} />
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 9 }}>
              <ChoiceField id={uid + '-jud-' + sel.id} label="Pertimbangan yang terlibat" value={sel.judgment}
                options={IA_JUDGMENT_LEVELS} onChange={(v) => patchRow(sel.id, { judgment: v as IaUseArea['judgment'] })} />
              <ChoiceField id={uid + '-rsk-' + sel.id} label="Risiko (RMM)" value={sel.risk}
                options={IA_RISK_LEVELS} onChange={(v) => patchRow(sel.id, { risk: v as IaUseArea['risk'] })} />
            </div>
            <ChoiceField id={uid + '-nat-' + sel.id} label="Bentuk penggunaan" value={sel.nature}
              options={IA_NATURE_KINDS} onChange={(v) => patchRow(sel.id, { nature: v as IaUseArea['nature'] })} />
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 9 }}>
              <ChoiceField id={uid + '-ext-' + sel.id} label="Tingkat penggunaan" value={sel.extent}
                options={IA_EXTENT_LEVELS} onChange={(v) => patchRow(sel.id, { extent: v as IaUseArea['extent'] })} />
              <NumField id={uid + '-rpf-' + sel.id} label="Reperformansi direncanakan (%)" value={sel.reperfPct}
                min={0} max={100} placeholder="0–100" onChange={(v) => patchRow(sel.id, { reperfPct: v })} />
            </div>
            {sel.reperfPct !== null && (
              <div className="row ac gap8">
                <div style={{ flex: 1 }}>
                  <Progress value={sel.reperfPct} color={sel.reperfPct >= 100 ? 'var(--red)' : sel.reperfPct >= 50 ? 'var(--amber)' : 'var(--green)'} />
                </div>
                <span className="mono tiny" style={{ fontWeight: 700 }}>{sel.reperfPct}%</span>
              </div>
            )}
            <ChoiceField id={uid + '-res-' + sel.id} label="Hasil evaluasi area" value={sel.result}
              options={IA_USE_RESULTS} onChange={(v) => patchRow(sel.id, { result: v as IaUseArea['result'] })} />
            <div className="field">
              <label htmlFor={uid + '-wp-' + sel.id}>Kertas kerja terkait</label>
              <select id={uid + '-wp-' + sel.id} className="select" value={sel.wpRef}
                onChange={(e: FormEv) => patchRow(sel.id, { wpRef: e.target.value })}>
                {wpOptions.map((r) => <option key={r || '_'} value={r}>{r === '' ? '— belum ditautkan —' : wpTitle(r)}</option>)}
              </select>
            </div>
            <TextField id={uid + '-not-' + sel.id} label="Pertimbangan auditor" value={sel.note}
              placeholder="dasar keputusan penggunaan untuk area ini"
              onChange={(v) => patchRow(sel.id, { note: v })} />
            <ConflictBox reasons={iaUseAreaConflicts(sel)} title="Jawaban pada area ini saling bertentangan" />
            {sel.result === 'Dikecualikan' && (
              <div className="panel" style={{ padding: '9px 11px', background: 'var(--red-bg)', borderColor: 'transparent' }}>
                <div className="row ac gap8"><span style={{ color: 'var(--red)' }}><I.alert size={15} /></span><span style={{ fontSize: 12, lineHeight: 1.4 }}>Area dikecualikan dari penggunaan — dikerjakan penuh oleh tim audit (SA 610 ¶18).</span></div>
              </div>
            )}
            {iaUseAreaIncomplete(sel) && (
              <div className="tiny muted" style={{ lineHeight: 1.45 }}>
                Area ini belum lengkap: nama area, pertimbangan, risiko, bentuk penggunaan, dan hasil harus terisi
                sebelum ia dapat menopang kesimpulan.
              </div>
            )}
          </div>
        </Panel>
      ) : (
        <Panel title="Detail Area">
          <div className="tiny muted" style={{ lineHeight: 1.5 }}>
            {areas.length === 0
              ? 'Register masih kosong. Tambahkan area penggunaan untuk mulai mencatat pertimbangan, risiko, bentuk & tingkat penggunaan pekerjaan fungsi audit internal.'
              : 'Pilih satu area pada tabel untuk menyuntingnya.'}
          </div>
        </Panel>
      )}
    </div>
  );
}

/* ---------------- Tab: Reperformansi ---------------- */
interface ReperfProps {
  rows: IaReperfItem[];
  areas: IaUseArea[];
  add: () => void;
  patchRow: (id: string, p: Partial<IaReperfItem>) => void;
  removeRow: (id: string) => void;
  cttFull: number | null;
}

function IAReperform({ rows, areas, add, patchRow, removeRow, cttFull }: ReperfProps) {
  const uid = useIdIA();
  const { rp } = AMS;
  const [selId, setSelId] = useStateIA('');
  const sel = rows.find((r) => r.id === selId) || null;
  const sum = iaReperfSummarize(rows, cttFull);
  const uncovered = iaAreasWithoutReperf(areas, rows);
  const areaOptions = ['', ...areas.map((a) => a.id)];
  const areaLabel = (id: string) => {
    const a = areas.find((x) => x.id === id);
    return a ? a.id + ' — ' + (a.area.trim() || 'belum diberi nama') : id;
  };
  return (
    <div className="grid" style={{ gap: 12 }}>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        <Panel><div style={{ padding: '15px 18px' }}><Stat value={sum.total} label="Pos Diuji Ulang" /></div></Panel>
        <Panel><div style={{ padding: '15px 18px' }}><Stat value={sum.agreed} label="Konsisten dgn IA" accent={sum.agreed ? 'var(--green)' : 'var(--ink-3)'} /></div></Panel>
        <Panel><div style={{ padding: '15px 18px' }}><Stat value={sum.exceptions} label="Pengecualian" accent={sum.exceptions ? 'var(--amber)' : 'var(--ink-3)'} /></div></Panel>
        {/* dulu literal '1' — angka yang tak ikut bergerak bersama tabelnya */}
        <Panel><div style={{ padding: '15px 18px' }}><Stat value={sum.expand} label="Perlu Perluasan" accent={sum.expand ? 'var(--amber)' : 'var(--ink-3)'} /></div></Panel>
      </div>

      <div className="grid split" style={{ gridTemplateColumns: '1fr 340px', gap: 12, alignItems: 'start' }}>
        <Panel noBody>
          <div className="panel-h">
            <h3>Reperformansi atas Pekerjaan IA yang Digunakan (¶24)</h3><div style={{ flex: 1 }} />
            <span className="tiny muted" style={{ marginRight: 8 }}>
              Ambang jelas remeh: {cttFull === null ? 'tidak tersedia' : rp(cttFull)}
            </span>
            <Btn sm onClick={add} title="Tambah pos reperformansi"><I.plus size={13} /> Tambah pos</Btn>
          </div>
          {rows.length === 0 ? (
            <div className="ia-empty">
              <div style={{ marginBottom: 10 }}>
                Belum ada pos reperformansi yang dicatat. SA 610 ¶24 menuntut auditor melaksanakan kembali sebagian
                pekerjaan fungsi audit internal yang digunakan — hasilnya dicatat di sini, bukan disediakan lebih dulu.
              </div>
              <Btn sm variant="primary" onClick={add} title="Tambah pos reperformansi pertama"><I.plus size={13} /> Tambah pos pertama</Btn>
            </div>
          ) : (
            <table className="dtbl">
              <thead><tr><th style={{ width: 84 }}>Ref</th><th style={{ width: 84 }}>Area</th><th>Pos yang Direperform</th><th className="num" style={{ width: 72 }}>Pengecualian</th><th className="num" style={{ width: 110 }}>Selisih</th><th style={{ width: 150 }}>Disposisi</th><th style={{ width: 44 }} /></tr></thead>
              <tbody>
                {rows.map((r) => {
                  const c = iaReperfConflicts(r, cttFull);
                  const dv = iaDiffAgainstCtt(r.diffRp, cttFull);
                  return (
                    <tr key={r.id} className={r.id === selId ? 'sel' : ''}>
                      <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{r.id}</td>
                      <td className="mono tiny muted">{r.areaId || '—'}</td>
                      <td style={{ padding: 0 }}>
                        <button type="button" className="ia-cellbtn" aria-pressed={r.id === selId}
                          title={'Sunting pos ' + r.id} onClick={() => setSelId(r.id)}>
                          <span style={{ display: 'block', whiteSpace: 'normal', lineHeight: 1.35 }}>
                            {r.item.trim() || '— belum diisi —'}
                            {c.length > 0 && <span style={{ color: 'var(--amber)', marginLeft: 6 }} title="Ada pertentangan"><I.alert size={12} /></span>}
                          </span>
                          <span className="tiny muted" style={{ display: 'block', fontWeight: 400 }}>{r.auditorResult.trim() || 'hasil auditor belum diisi'}</span>
                        </button>
                      </td>
                      <td className="num mono" style={{ color: r.exceptions ? 'var(--amber)' : 'var(--ink-4)', fontWeight: 700 }}>{r.exceptions === null ? '—' : r.exceptions}</td>
                      <td className="num mono" style={{ color: dv === 'above' ? 'var(--num-neg)' : 'var(--ink-3)' }}>{r.diffRp === null ? '—' : rp(r.diffRp)}</td>
                      <td><Badge kind={r.disposition === 'Sesuai' ? 'green' : r.disposition === 'Perlu Perluasan' ? 'red' : r.disposition === '' ? 'gray' : 'amber'}>{r.disposition || '—'}</Badge></td>
                      <td>
                        <Btn sm icon title={'Hapus pos ' + r.id} aria-label={'Hapus pos ' + r.id}
                          onClick={() => { if (r.id === selId) setSelId(''); removeRow(r.id); }}>
                          <I.trash size={13} />
                        </Btn>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {uncovered.length > 0 && (
            <div className="ia-conflict" style={{ margin: 12 }}>
              <span className="row ac gap8" style={{ fontWeight: 700 }}>
                <span style={{ color: 'var(--amber)' }}><I.alert size={14} /></span>
                Area yang diandalkan tetapi belum direperform (¶24)
              </span>
              <ul>{uncovered.map((a) => <li key={a.id}>{a.id} — {a.area.trim() || 'belum diberi nama'}</li>)}</ul>
            </div>
          )}
        </Panel>

        {sel ? (
          <Panel noBody>
            <div style={{ background: 'var(--surface-2)', padding: '15px 18px', borderBottom: '1px solid var(--line)' }}>
              <span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{sel.id}</span>
              <div style={{ fontWeight: 700, fontSize: 13, marginTop: 3, lineHeight: 1.3 }}>{sel.item.trim() || '— belum diisi —'}</div>
            </div>
            <div style={{ padding: 14, display: 'grid', gap: 9 }}>
              <div className="field">
                <label htmlFor={uid + '-ar-' + sel.id}>Area penggunaan yang diuji ulang</label>
                <select id={uid + '-ar-' + sel.id} className="select" value={sel.areaId}
                  onChange={(e: FormEv) => patchRow(sel.id, { areaId: e.target.value })}>
                  {areaOptions.map((a) => <option key={a || '_'} value={a}>{a === '' ? '— belum ditautkan —' : areaLabel(a)}</option>)}
                </select>
              </div>
              <TextField id={uid + '-it-' + sel.id} label="Pos yang direperform" value={sel.item}
                placeholder="mis. rekalkulasi 10 slip gaji" onChange={(v) => patchRow(sel.id, { item: v })} />
              <TextField id={uid + '-ic-' + sel.id} label="Simpulan fungsi audit internal" value={sel.iaConclusion}
                placeholder="apa yang disimpulkan fungsi IA" onChange={(v) => patchRow(sel.id, { iaConclusion: v })} />
              <TextField id={uid + '-au-' + sel.id} label="Hasil pelaksanaan ulang oleh auditor" value={sel.auditorResult}
                placeholder="apa yang ditemukan auditor" onChange={(v) => patchRow(sel.id, { auditorResult: v })} />
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 9 }}>
                <NumField id={uid + '-ex-' + sel.id} label="Jumlah pengecualian" value={sel.exceptions} min={0}
                  placeholder="0" onChange={(v) => patchRow(sel.id, { exceptions: v })} />
                <NumField id={uid + '-df-' + sel.id} label="Selisih moneter (Rp)" value={sel.diffRp}
                  placeholder="kosongkan bila tak dikuantifikasi" onChange={(v) => patchRow(sel.id, { diffRp: v })} />
              </div>
              <ChoiceField id={uid + '-dp-' + sel.id} label="Disposisi auditor" value={sel.disposition}
                options={IA_REPERF_DISPOSITIONS} onChange={(v) => patchRow(sel.id, { disposition: v as IaReperfItem['disposition'] })} />
              <KvBox label="Uji terhadap ambang jelas remeh perikatan"
                v={cttFull === null
                  ? 'Ambang belum tersedia'
                  : sel.diffRp === null
                    ? 'Selisih belum dikuantifikasi — ambang ' + rp(cttFull)
                    : (iaDiffAgainstCtt(sel.diffRp, cttFull) === 'below' ? 'Di bawah ambang ' : 'MELAMPAUI ambang ') + rp(cttFull)}
                accent={iaDiffAgainstCtt(sel.diffRp, cttFull) === 'above' ? 'var(--red)' : undefined} />
              <ConflictBox reasons={iaReperfConflicts(sel, cttFull)} title="Jawaban pada pos ini saling bertentangan" />
            </div>
          </Panel>
        ) : (
          <Panel title="Detail Pos">
            <div className="tiny muted" style={{ lineHeight: 1.5 }}>
              {rows.length === 0
                ? 'Register masih kosong. Setiap pos mencatat apa yang disimpulkan fungsi audit internal dan apa yang ditemukan auditor ketika melaksanakannya kembali.'
                : 'Pilih satu pos pada tabel untuk menyuntingnya.'}
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
}

/* ---------------- Tab: Bantuan Langsung ---------------- */
interface DirectProps {
  rows: IaDirectItem[];
  add: () => void;
  patchRow: (id: string, p: Partial<IaDirectItem>) => void;
  removeRow: (id: string) => void;
}

function IADirect({ rows, add, patchRow, removeRow }: DirectProps) {
  const uid = useIdIA();
  const [selId, setSelId] = useStateIA('');
  const sel = rows.find((d) => d.id === selId) || null;
  const totHrs = iaDirectHours(rows);
  const violations = iaDirectViolations(rows);
  const reviewedFull = rows.filter((d) => d.review === 'Penuh').length;
  return (
    <div className="grid split" style={{ gridTemplateColumns: '1fr 340px', gap: 12, alignItems: 'start' }}>
      <div className="grid" style={{ gap: 12 }}>
        <Panel noBody>
          <div className="panel-h">
            <h3>Individu yang Memberikan Bantuan Langsung (¶26–33)</h3><div style={{ flex: 1 }} />
            <span className="tiny muted" style={{ marginRight: 8 }}>{totHrs} jam</span>
            <Btn sm onClick={add} title="Tambah individu"><I.plus size={13} /> Tambah individu</Btn>
          </div>
          {rows.length === 0 ? (
            <div className="ia-empty">
              <div style={{ marginBottom: 10 }}>
                Tidak ada bantuan langsung yang dicatat untuk perikatan ini. Bila fungsi audit internal memberikan
                bantuan langsung, catat individunya di sini beserta persetujuan tertulis ¶33 — nama, jam, dan
                statusnya tidak disediakan lebih dulu.
              </div>
              <Btn sm variant="primary" onClick={add} title="Tambah individu pertama"><I.plus size={13} /> Tambah individu pertama</Btn>
            </div>
          ) : (
            <table className="dtbl">
              <thead><tr><th style={{ width: 84 }}>Ref</th><th>Individu</th><th>Tugas yang Diberikan</th><th style={{ width: 110 }}>Penyelia</th><th style={{ width: 90 }}>Reviu</th><th className="num" style={{ width: 52 }}>Jam</th><th style={{ width: 108 }}>Status</th><th style={{ width: 44 }} /></tr></thead>
              <tbody>
                {rows.map((d) => {
                  const missing = iaDirectBlockers(d);
                  return (
                    <tr key={d.id} className={d.id === selId ? 'sel' : ''}>
                      <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{d.id}</td>
                      <td style={{ padding: 0 }}>
                        <button type="button" className="ia-cellbtn" aria-pressed={d.id === selId}
                          title={'Sunting baris ' + d.id} onClick={() => setSelId(d.id)}>
                          <span style={{ display: 'block' }}>
                            {d.name.trim() || '— belum diisi —'}
                            {missing.length > 0 && <span style={{ color: 'var(--amber)', marginLeft: 6 }} title="Prasyarat ¶29/¶33 belum terpenuhi"><I.alert size={12} /></span>}
                          </span>
                        </button>
                      </td>
                      <td className="tiny" style={{ whiteSpace: 'normal', lineHeight: 1.35 }}>{d.task.trim() || '—'}</td>
                      <td className="tiny muted">{d.supervisor.trim() || '—'}</td>
                      <td><Badge kind={d.review === 'Penuh' ? 'green' : d.review === '' ? 'gray' : 'amber'}>{d.review || '—'}</Badge></td>
                      <td className="num mono">{d.hours === null ? '—' : d.hours}</td>
                      <td><Badge kind={d.status === 'Selesai' ? 'green' : d.status === 'Berlangsung' ? 'amber' : 'gray'}>{d.status || '—'}</Badge></td>
                      <td>
                        <Btn sm icon title={'Hapus baris ' + d.id} aria-label={'Hapus baris ' + d.id}
                          onClick={() => { if (d.id === selId) setSelId(''); removeRow(d.id); }}>
                          <I.trash size={13} />
                        </Btn>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {violations.length > 0 && (
            <div className="ia-conflict" style={{ margin: 12 }}>
              <span className="row ac gap8" style={{ fontWeight: 700 }}>
                <span style={{ color: 'var(--amber)' }}><I.alert size={14} /></span>
                Status yang melampaui prasyarat SA 610
              </span>
              <ul>{violations.map((v) => <li key={v.id}>{v.id} · {v.name} — {v.reason}</li>)}</ul>
            </div>
          )}
        </Panel>

        <Panel noBody>
          <div className="panel-h"><h3>Pembatasan Bantuan Langsung (¶30–31)</h3><div style={{ flex: 1 }} /><Badge kind="red">Dilarang</Badge></div>
          <div style={{ padding: '6px 14px 14px' }}>
            <p className="tiny muted" style={{ margin: '4px 0 10px', lineHeight: 1.45 }}>Individu fungsi audit internal <b>tidak boleh</b> ditugaskan untuk hal-hal berikut saat memberikan bantuan langsung:</p>
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
        {sel ? (
          <Panel noBody>
            <div style={{ background: 'var(--surface-2)', padding: '15px 18px', borderBottom: '1px solid var(--line)' }}>
              <span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{sel.id}</span>
              <div style={{ fontWeight: 700, fontSize: 13, marginTop: 3 }}>{sel.name.trim() || '— belum diisi —'}</div>
            </div>
            <div style={{ padding: 14, display: 'grid', gap: 9 }}>
              <TextField id={uid + '-nm-' + sel.id} label="Individu fungsi audit internal" value={sel.name}
                placeholder="nama & kualifikasi" onChange={(v) => patchRow(sel.id, { name: v })} />
              <TextField id={uid + '-tk-' + sel.id} label="Tugas yang diberikan" value={sel.task}
                placeholder="prosedur non-judgmental" onChange={(v) => patchRow(sel.id, { task: v })} />
              <TextField id={uid + '-sv-' + sel.id} label="Penyelia dari tim audit (¶34)" value={sel.supervisor}
                placeholder="anggota tim audit yang mengarahkan" onChange={(v) => patchRow(sel.id, { supervisor: v })} />
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 9 }}>
                <ChoiceField id={uid + '-rv-' + sel.id} label="Tingkat reviu auditor" value={sel.review}
                  options={IA_REVIEW_LEVELS} onChange={(v) => patchRow(sel.id, { review: v as IaDirectItem['review'] })} />
                <NumField id={uid + '-hr-' + sel.id} label="Jam yang diberikan" value={sel.hours} min={0}
                  placeholder="jam" onChange={(v) => patchRow(sel.id, { hours: v })} />
              </div>
              <div style={{ display: 'grid', gap: 6, padding: '9px 11px', border: '1px solid var(--line-soft)', borderRadius: 6 }}>
                <div className="tiny muted upper">Prasyarat sebelum bantuan diberikan</div>
                <Check on={sel.objectivityEvaluated} label="Ancaman objektivitas & kompetensi individu dievaluasi (¶29)"
                  onChange={(v: boolean) => patchRow(sel.id, { objectivityEvaluated: v })} />
                <Check on={sel.entityConsent} label="Persetujuan tertulis entitas diperoleh (¶33(a))"
                  onChange={(v: boolean) => patchRow(sel.id, { entityConsent: v })} />
                <Check on={sel.individualConsent} label="Persetujuan tertulis individu diperoleh (¶33(b))"
                  onChange={(v: boolean) => patchRow(sel.id, { individualConsent: v })} />
              </div>
              <ChoiceField id={uid + '-st-' + sel.id} label="Status pekerjaan" value={sel.status}
                options={IA_DIRECT_STATUSES}
                blockedReason={(v) => iaDirectStatusBlockReason(sel, v as IaDirectStatus)}
                onChange={(v) => {
                  /* Gerbang ¶29/¶33/¶34: status yang prasyaratnya belum terpenuhi
                     tidak dapat dipilih. Opsinya juga dinonaktifkan di daftar. */
                  if (iaDirectStatusBlockReason(sel, v as IaDirectStatus)) return;
                  patchRow(sel.id, { status: v as IaDirectItem['status'] });
                }} />
              <ConflictBox reasons={iaDirectBlockers(sel)} title="Prasyarat SA 610 yang belum terpenuhi" />
            </div>
          </Panel>
        ) : (
          <Panel title="Prasyarat Bantuan Langsung">
            <p className="tiny muted" style={{ margin: '0 0 8px', lineHeight: 1.5 }}>
              Keempat hal berikut adalah TUNTUTAN standar, bukan daftar yang sudah terpenuhi. Statusnya dicatat
              per individu pada register di samping, dan status pekerjaan terkunci sampai prasyaratnya terpenuhi.
            </p>
            <div style={{ display: 'grid', gap: 7 }}>
              {[
                'Evaluasi ancaman objektivitas & kompetensi individu (¶29)',
                'Persetujuan tertulis entitas — individu boleh ikuti instruksi auditor (¶33(a))',
                'Persetujuan tertulis individu — jaga kerahasiaan (¶33(b))',
                'Arahan, supervisi & reviu memadai oleh auditor (¶34)',
              ].map((t, i) => (
                <div key={i} className="row gap8" style={{ fontSize: 12, alignItems: 'flex-start' }}>
                  <span style={{ color: 'var(--blue)', flex: '0 0 auto', marginTop: 1 }}><I.arrowRight size={15} /></span>
                  <span style={{ lineHeight: 1.4 }}>{t}</span>
                </div>
              ))}
            </div>
          </Panel>
        )}
        <Panel title="Reviu Pekerjaan Bantuan Langsung">
          <p style={{ margin: '0 0 8px', fontSize: 12, lineHeight: 1.5, color: 'var(--ink-2)' }}>
            SA 610 ¶34 menuntut auditor mengarahkan, mensupervisi, dan mereviu pekerjaan bantuan langsung; ¶32
            menuntut auditor mempertimbangkan kembali kecukupan keterlibatannya sendiri. Sifat tugas dibatasi pada
            prosedur <b>non-judgmental</b>.
          </p>
          {/* dulu: klaim literal "Seluruh pekerjaan bantuan langsung direviu 100%" */}
          <KvBox label="Baris yang direviu penuh"
            v={rows.length === 0 ? 'tidak ada bantuan langsung' : reviewedFull + ' dari ' + rows.length}
            accent={rows.length > 0 && reviewedFull < rows.length ? 'var(--amber)' : undefined} />
        </Panel>
      </div>
    </div>
  );
}

/* ---------------- Tab: Kesimpulan & Dampak ---------------- */
interface ConclusionProps {
  doc: IaDoc;
  verdict: IaVerdict;
  score: IaScore;
  blockReason: string;
}

function IAConclusionTab({ doc, verdict, score, blockReason }: ConclusionProps) {
  const conclusion = doc.conclusion;
  const areas = doc.useAreas;
  const docs = iaDocumentationChecklist(doc);
  const reliant = areas.filter(iaAreaIsReliant).length;
  return (
    <div className="grid split" style={{ gridTemplateColumns: '1fr 340px', gap: 12, alignItems: 'start' }}>
      <div className="grid" style={{ gap: 12 }}>
        <Panel noBody>
          <div className="panel-h"><h3>Dampak terhadap Strategi &amp; Lingkup Audit (¶18)</h3><div style={{ flex: 1 }} /><span className="tiny muted">{reliant} dari {areas.length} area diandalkan</span></div>
          {/* Tabel ini dulu LIMA BARIS LITERAL ("40 sampel sendiri" jadi "20 sampel +
              reperform 20%") yang tak pernah bergerak mengikuti satu pun keputusan.
              Kini setiap baris turunan register area penggunaan. */}
          {areas.length === 0 ? (
            <div className="ia-empty">Belum ada area penggunaan yang dicatat, sehingga dampak terhadap strategi &amp; lingkup audit belum dapat dinyatakan.</div>
          ) : (
            <table className="dtbl">
              <thead><tr><th style={{ width: 76 }}>Ref</th><th>Area</th><th>Bentuk Penggunaan</th><th style={{ width: 80 }}>Tingkat</th><th className="num" style={{ width: 90 }}>Reperformansi</th><th style={{ width: 140 }}>Efek</th></tr></thead>
              <tbody>
                {areas.map((a) => {
                  const eff = iaUseAreaImpact(a);
                  return (
                    <tr key={a.id}>
                      <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{a.id}</td>
                      <td style={{ fontWeight: 600, whiteSpace: 'normal', lineHeight: 1.35 }}>{a.area.trim() || '— belum diberi nama —'}</td>
                      <td className="tiny">{a.nature || '—'}</td>
                      <td className="tiny">{a.extent || '—'}</td>
                      <td className="num mono tiny">{a.reperfPct === null ? '—' : a.reperfPct + '%'}</td>
                      <td><Badge kind={eff === 'Efisiensi' ? 'green' : eff === 'Prosedur diperluas' ? 'amber' : 'gray'}>{eff}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
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
        <Panel title="Dokumentasi (¶36–37)" sub="Diturunkan dari isi kertas kerja, bukan daftar berkas">
          {/* dulu: empat butir bersama rujukan arsip 'A-610.1' s.d. 'A-610.4' —
              indeks berkas yang tak ada di register kertas kerja mana pun, dan tak
              satu pun butir punya keadaan "belum". */}
          <div style={{ display: 'grid', gap: 6 }}>
            {docs.map((r, i) => (
              <div key={i} className="row jb ac" style={{ fontSize: 12, padding: '7px 9px', border: '1px solid var(--line-soft)', borderRadius: 6, gap: 8 }}>
                <span className="row gap8" style={{ alignItems: 'flex-start' }}>
                  <span style={{ color: r.done ? 'var(--green)' : 'var(--ink-4)', flex: '0 0 auto', marginTop: 1 }}>
                    {r.done ? <I.checkCircle size={14} /> : <I.circle size={14} />}
                  </span>
                  <span style={{ lineHeight: 1.4 }}>{r.t}</span>
                </span>
                <span className="mono tiny" style={{ color: 'var(--blue)', fontWeight: 700, flex: '0 0 auto' }}>{r.ref}</span>
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
