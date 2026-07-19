/* [codemod] ESM imports */
import React from 'react';
import { useAmsPersist, useFirm, useNav } from './contexts';
import { I } from './icons';
import { SACanonChips, SACanonicalStatus, SASignoffMini } from './sa_canonical';
import { SubBar } from './shell';
import { Badge, Btn, Panel, Seg, Tabs } from './ui';
import { DEFAULT_DOC_O, DEFAULT_COMP_O, PRED_OPINION_LABEL, comparativeParagraph } from './view_opinion';
import type { PredOpinionType } from './view_opinion';

/* ============================================================
   Asseris — SA 710 · Informasi Komparatif —
   Angka Koresponding & Laporan Keuangan Komparatif

   F2/PR-E (PRD 2026-07-19) — dari display-only → kertas kerja
   tersimpan + LENSA atas SSOT opini. Pendekatan (compMode) &
   FAKTA auditor pendahulu (nama, jenis opini lalu, tgl laporan
   lalu, periode) ditulis di sini tetapi HIDUP di opinionDoc.v1
   (SSOT konten laporan; dibaca opini & sa705 — hapus triplikasi
   hardcode). Prosedur audit ¶7–9 & situasi khusus ¶11–14 =
   kertas kerja sa710 sendiri (comp710.v1). Sign-off PALSU
   (nama+status hardcode) diganti sign-off NYATA WP kanonik
   (SASignoffMini stdId=sa710 → SA_WP_MAP 900).
   ============================================================ */
const { useState: useState710 } = React;

/* ---- Katalog prosedur audit komparatif (¶7–9). Status hidup di comp710.v1. ---- */
const PROCS_710 = [
  { id: 'p1', t: 'Informasi komparatif sesuai jumlah & pengungkapan periode lalu (atau disajikan kembali bila tepat)', ref: '¶7(a)', seed: true },
  { id: 'p2', t: 'Kebijakan akuntansi komparatif konsisten dengan periode kini; perubahan dipertanggungjawabkan & diungkap memadai', ref: '¶7(b)', seed: true },
  { id: 'p3', t: 'Evaluasi penyajian kembali (restatement) atau reklasifikasi atas angka periode lalu', ref: '¶7 · A2', seed: true },
  { id: 'p4', t: 'Bila menyadari kemungkinan salah saji material pada angka periode lalu — lakukan prosedur tambahan', ref: '¶8', seed: false },
  { id: 'p5', t: 'Peroleh representasi tertulis untuk seluruh periode yang dirujuk opini (SA 580)', ref: '¶9', seed: true },
];

/* ---- Katalog situasi khusus (¶11–14). Flag & catatan hidup di comp710.v1;
   khusus 'predPY' (¶13) tercermin dari opinionDoc.opts.comparative (SSOT laporan). ---- */
const SITU_710 = [
  { id: 'predPY', ic: 'group', k: 'blue', t: 'Periode lalu diaudit auditor pendahulu (¶13)', d: 'Bila tidak dilarang hukum, auditor dapat menyatakan dalam paragraf Hal Lain bahwa angka koresponding diaudit auditor pendahulu — jenis opini, alasan modifikasi (bila ada), & tanggalnya.', report: true },
  { id: 'pyUnaudited', ic: 'search2', k: 'amber', t: 'Periode lalu tidak diaudit (¶14)', d: 'Auditor menyatakan dalam paragraf Hal Lain bahwa angka koresponding tidak diaudit. Namun tetap memperoleh bukti bahwa saldo awal bebas salah saji material (SA 510).', report: false },
  { id: 'pyMisstatement', ic: 'alert', k: 'red', t: 'Salah saji material pada angka periode lalu (¶11–12)', d: 'Bila LK PY (yang opininya tidak dimodifikasi) ternyata mengandung salah saji material yang belum diperbaiki, modifikasi opini atas angka koresponding dalam laporan periode kini.', report: false },
  { id: 'opinionDiffers', ic: 'flag', k: 'purple', t: 'Opini PY berbeda dari opini sebelumnya (¶A4)', d: 'Bila opini atas LK periode lalu berbeda dari yang sebelumnya dinyatakan, ungkapkan alasan perbedaan substansial dalam paragraf Hal Lain.', report: false },
];

/* ---- Bentuk kertas kerja tersimpan (comp710.v1) — HANYA prosedur & situasi;
   fakta pendahulu ada di opinionDoc.v1.comp. ---- */
interface ProcState { done: boolean; date: string; wpRef: string; note: string }
interface SituState { active: boolean; note: string }
interface Comp710Doc { procs: Record<string, ProcState>; situations: Record<string, SituState> }
type ODoc710 = typeof DEFAULT_DOC_O;
type CompFacts = typeof DEFAULT_COMP_O;
type SetODoc = (updater: (d: ODoc710) => ODoc710) => void;
type SetWp = (updater: (d: Comp710Doc) => Comp710Doc) => void;

const EMPTY_PROC: ProcState = { done: false, date: '', wpRef: '', note: '' };
const EMPTY_SITU: SituState = { active: false, note: '' };

function seedComp710(): Comp710Doc {
  const procs: Record<string, ProcState> = {};
  PROCS_710.forEach(p => { procs[p.id] = { done: p.seed, date: p.seed ? '2026-02-20' : '', wpRef: '', note: '' }; });
  const situations: Record<string, SituState> = {};
  SITU_710.forEach(s => { situations[s.id] = { active: s.id === 'predPY', note: '' }; });
  return { procs, situations };
}

/* ============================================================ */
function SA710View() {
  const firm = useFirm();
  const nav = useNav();
  const client = firm?.activeClient?.name || 'PT Sentosa Makmur Tbk';
  const engId = firm?.activeEngagement?.id || 'ENG-2025-014';
  const [tab, setTab] = useState710('jenis');

  /* SSOT bersama modul opini — pendekatan (compMode), inklusi paragraf (opts.comparative)
     & fakta pendahulu (comp). Engagement-scope (AMS_PERSIST_SCOPE) + isolasi W7.5. */
  const [odoc, setODoc] = useAmsPersist('opinionDoc.v1', () => DEFAULT_DOC_O) as [ODoc710, SetODoc];
  /* Kertas kerja sa710 sendiri — prosedur ¶7–9 & situasi ¶11–14. */
  const [wp, setWp] = useAmsPersist('comp710.v1', seedComp710) as [Comp710Doc, SetWp];

  const comp: CompFacts = { ...DEFAULT_COMP_O, ...(odoc.comp || {}) };
  const mode = odoc.compMode || 'corresponding';
  const compActive = odoc.opts?.comparative !== false;

  const patchComp = (p: Partial<CompFacts>) => setODoc(d => ({ ...d, comp: { ...DEFAULT_COMP_O, ...(d.comp || {}), ...p } }));
  const setMode = (m: string) => setODoc(d => ({ ...d, compMode: m }));
  const setCompActive = (on: boolean) => setODoc(d => ({ ...d, opts: { ...d.opts, comparative: on } }));
  const setProc = (id: string, p: Partial<ProcState>) => setWp(d => ({ ...d, procs: { ...d.procs, [id]: { ...(d.procs[id] || EMPTY_PROC), ...p } } }));
  const setSitu = (id: string, p: Partial<SituState>) => setWp(d => ({ ...d, situations: { ...d.situations, [id]: { ...(d.situations[id] || EMPTY_SITU), ...p } } }));

  const procDone = PROCS_710.filter(p => (wp.procs[p.id] || EMPTY_PROC).done).length;
  const openOpinion = () => { (nav as (id: string, opt?: { from?: string }) => void)('opinion', { from: 'sa710' }); };

  const tabs = [
    { id: 'jenis', label: 'Jenis & Persyaratan' },
    { id: 'prosedur', label: 'Prosedur Audit' },
    { id: 'khusus', label: 'Situasi Khusus' },
    { id: 'dampak', label: 'Dampak pada Laporan' },
  ];

  return (
    <>
      <SubBar moduleId="sa710" right={
        <div className="row gap8 ac">
          <SACanonChips stdId="sa710" />
          <Badge kind="blue" dot>{mode === 'corresponding' ? 'Angka Koresponding' : 'LK Komparatif'}</Badge>
          <Badge kind={procDone === PROCS_710.length ? 'green' : 'amber'} dot>{procDone}/{PROCS_710.length} prosedur</Badge>
          <Btn sm onClick={openOpinion}><I.doc size={13} /> Generator Opini</Btn>
        </div>
      } />
      <div className="view-scroll"><div className="view-pad">

        <Panel noBody style={{ marginBottom: 12 }}>
          <div style={{ padding: '13px 16px', display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ minWidth: 210 }}>
              <div className="tiny muted upper" style={{ marginBottom: 3 }}>Standar Audit 710</div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>Informasi Komparatif</div>
              <div className="tiny muted">{client} · {engId}</div>
            </div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Pendekatan</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5 }}>{mode === 'corresponding' ? 'Angka Koresponding' : 'LK Komparatif'}</div></div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Periode Komparatif</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5 }}>{comp.priorPeriodEnd}</div></div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Auditor PY</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--blue)' }}>{comp.predName ? comp.predName : 'Pendahulu'} — {PRED_OPINION_LABEL[comp.predOpinion].replace('opini ', '').replace('tanpa modifikasian', 'WTP')}</div></div>
            <div style={{ flex: 1 }} />
            <div style={{ textAlign: 'right' }}>
              <div className="tiny muted upper" style={{ marginBottom: 3 }}>Konsekuensi Laporan</div>
              <Badge kind={compActive ? 'blue' : 'gray'} dot>{compActive ? 'Paragraf Hal Lain (SA 706)' : 'Tanpa paragraf'}</Badge>
            </div>
          </div>
        </Panel>

        <SACanonicalStatus stdId="sa710" />

        <div style={{ marginBottom: 12 }}><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>

        {tab === 'jenis' && <F710Type mode={mode} setMode={setMode} />}
        {tab === 'prosedur' && <F710Procedures wp={wp} setProc={setProc} procDone={procDone} />}
        {tab === 'khusus' && <F710Special comp={comp} patchComp={patchComp} wp={wp} setSitu={setSitu} compActive={compActive} setCompActive={setCompActive} />}
        {tab === 'dampak' && <F710Impact client={client} mode={mode} comp={comp} compActive={compActive} />}

      </div></div>
    </>
  );
}

/* ---------------- Tab: Jenis & Persyaratan (pilih pendekatan → tulis compMode) ---------------- */
function F710Type({ mode, setMode }: { mode: string; setMode: (m: string) => void }) {
  const [sel, setSel] = useState710(mode === 'comparative' ? 'comp' : 'corr');
  const types = {
    corr: {
      key: 'corresponding', h: 'Angka Koresponding (Corresponding Figures)', color: 'blue',
      d: 'Jumlah & pengungkapan periode lalu disertakan sebagai bagian integral dari LK periode kini, dimaksudkan dibaca hanya dalam kaitannya dengan jumlah periode kini ("dalam konteks").',
      op: 'Opini auditor TIDAK merujuk angka koresponding (kecuali keadaan tertentu pada ¶11, 12, 14).',
      points: ['Lazim untuk LK entitas di Indonesia', 'Penekanan laporan pada angka periode kini', 'Opini menyatakan posisi/kinerja periode kini'],
    },
    comp: {
      key: 'comparative', h: 'Laporan Keuangan Komparatif (Comparative FS)', color: 'purple',
      d: 'Jumlah & pengungkapan periode lalu disertakan untuk diperbandingkan dengan periode kini dan, jika diaudit, dirujuk dalam opini auditor sebagai LK yang berdiri sendiri.',
      op: 'Opini auditor MERUJUK setiap periode yang disajikan dan diaudit.',
      points: ['Lazim pada yurisdiksi tertentu / persyaratan regulator', 'Setiap periode dirujuk dalam opini', 'Auditor dapat menyatakan opini berbeda antar periode'],
    },
  };
  const t = types[sel as 'corr' | 'comp'] || types.corr;
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }}>
      <Panel noBody>
        <div className="panel-h"><h3>Dua Kerangka Penyajian Komparatif (¶6–7)</h3><div style={{ flex: 1 }} /><span className="tiny muted">Klik untuk terapkan</span></div>
        <div style={{ padding: 14 }}>
          {(Object.entries(types) as [string, typeof types.corr][]).map(([k, v]) => {
            const applied = mode === v.key;
            return (
              <button key={k} onClick={() => { setSel(k); setMode(v.key); }} className="panel" style={{ width: '100%', padding: 0, textAlign: 'left', cursor: 'pointer', marginBottom: 10, border: applied ? `1.5px solid var(--${v.color})` : (sel === k ? '1.5px solid var(--line-strong)' : '1px solid var(--line)'), overflow: 'hidden' }}>
                <div style={{ padding: '12px 14px', background: applied ? 'var(--blue-050)' : (sel === k ? 'var(--surface-2)' : 'transparent') }}>
                  <div className="row jb ac"><div style={{ fontWeight: 700, fontSize: 12.5 }}>{v.h}</div><Badge kind={applied ? v.color : 'gray'}>{applied ? 'Diterapkan' : 'Pilih'}</Badge></div>
                  <div className="tiny muted" style={{ marginTop: 4, lineHeight: 1.45 }}>{v.d}</div>
                </div>
              </button>
            );
          })}
        </div>
      </Panel>

      <Panel noBody>
        <div style={{ background: 'linear-gradient(125deg,#013a52,#005085)', color: '#fff', padding: '14px 16px' }}>
          <Badge kind={mode === t.key ? t.color : 'gray'}>{mode === t.key ? 'Diterapkan' : 'Pratinjau'}</Badge>
          <div style={{ fontSize: 14.5, fontWeight: 700, marginTop: 8 }}>{t.h}</div>
        </div>
        <div style={{ padding: 16 }}>
          <div className="tiny muted upper" style={{ marginBottom: 4 }}>Implikasi pada Opini</div>
          <p style={{ margin: '0 0 14px', fontSize: 12.5, lineHeight: 1.55, fontWeight: 600 }}>{t.op}</p>
          <div className="tiny muted upper" style={{ marginBottom: 6 }}>Karakteristik</div>
          {t.points.map((p, i) => (
            <div key={i} className="row gap8" style={{ fontSize: 12, alignItems: 'flex-start', padding: '6px 0', borderBottom: i < t.points.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
              <span style={{ color: 'var(--blue)', flex: '0 0 auto', marginTop: 1 }}><I.check size={13} /></span><span style={{ lineHeight: 1.4 }}>{p}</span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

/* ---------------- Tab: Prosedur Audit (checklist editable → comp710.procs) ---------------- */
function F710Procedures({ wp, setProc, procDone }: { wp: Comp710Doc; setProc: (id: string, p: Partial<ProcState>) => void; procDone: number }) {
  const [selId, setSelId] = useState710('p4');
  const cat = PROCS_710.find(p => p.id === selId) || PROCS_710[0];
  const st = wp.procs[cat.id] || EMPTY_PROC;
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 340px', gap: 12, alignItems: 'start' }}>
      <div className="grid" style={{ gap: 12 }}>
        <Panel noBody>
          <div className="panel-h"><h3>Prosedur Audit atas Informasi Komparatif (¶7–9)</h3><div style={{ flex: 1 }} /><Badge kind={procDone === PROCS_710.length ? 'green' : 'blue'}>{procDone}/{PROCS_710.length}</Badge></div>
          <div style={{ padding: '6px 14px 14px' }}>
            {PROCS_710.map((p, i) => {
              const s = wp.procs[p.id] || EMPTY_PROC;
              return (
                <div key={p.id} onClick={() => setSelId(p.id)} className="row gap10" style={{ padding: '11px 0', alignItems: 'flex-start', borderBottom: i < PROCS_710.length - 1 ? '1px solid var(--line-soft)' : 0, cursor: 'pointer', background: p.id === selId ? 'var(--blue-050)' : 'transparent' }}>
                  <button className="btn sm icon" title={s.done ? 'Tandai belum' : 'Tandai selesai'} style={{ flex: '0 0 auto', marginTop: 1, height: 22, width: 22, color: s.done ? 'var(--green)' : 'var(--amber)' }} onClick={(e: { stopPropagation: () => void }) => { e.stopPropagation(); setProc(p.id, { done: !s.done, date: !s.done ? (s.date || '2026-02-20') : s.date }); }}>{s.done ? <I.checkCircle size={16} /> : <I.clock size={16} />}</button>
                  <div style={{ flex: 1, fontSize: 12.5, lineHeight: 1.45 }}>{p.t}{s.wpRef ? <span className="mono tiny muted"> · {s.wpRef}</span> : ''}</div>
                  <span className="mono tiny" style={{ color: 'var(--blue)', fontWeight: 700 }}>{p.ref}</span>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel noBody>
          <div className="panel-h"><h3>Konsistensi Kebijakan Akuntansi — PY vs CY</h3><div style={{ flex: 1 }} /><Badge kind="amber">1 reklasifikasi</Badge></div>
          <table className="dtbl">
            <thead><tr><th>Area</th><th>FY2024</th><th>FY2025</th><th style={{ width: 110 }}>Status</th></tr></thead>
            <tbody>
              <tr><td style={{ fontWeight: 600 }}>Pengakuan pendapatan</td><td className="tiny">PSAK 72</td><td className="tiny">PSAK 72</td><td><Badge kind="green">Konsisten</Badge></td></tr>
              <tr><td style={{ fontWeight: 600 }}>Penyajian beban distribusi</td><td className="tiny">Dalam HPP</td><td className="tiny">Pos terpisah</td><td><Badge kind="amber">Reklasifikasi</Badge></td></tr>
              <tr><td style={{ fontWeight: 600 }}>Pengukuran instrumen keuangan</td><td className="tiny">PSAK 71</td><td className="tiny">PSAK 71</td><td><Badge kind="green">Konsisten</Badge></td></tr>
            </tbody>
          </table>
          <div className="panel" style={{ margin: 12, padding: '10px 12px', background: 'var(--amber-bg)', borderColor: 'transparent' }}>
            <div className="row gap8" style={{ alignItems: 'flex-start' }}>
              <span style={{ color: 'var(--amber)', flex: '0 0 auto' }}><I.alert size={15} /></span>
              <span style={{ fontSize: 11.5, lineHeight: 1.45 }}>Beban distribusi direklasifikasi dari HPP menjadi pos terpisah; angka koresponding FY2024 disajikan kembali agar sebanding & diungkap dalam CALK. Tidak berdampak pada laba bersih.</span>
            </div>
          </div>
        </Panel>
      </div>

      <Panel noBody>
        <div style={{ background: 'var(--surface-2)', padding: '13px 16px', borderBottom: '1px solid var(--line)' }}>
          <div className="row ac gap8"><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{cat.ref}</span>{st.done ? <Badge kind="green" dot>Selesai</Badge> : <Badge kind="amber" dot>Menunggu</Badge>}</div>
          <div style={{ fontWeight: 600, fontSize: 12.5, marginTop: 6, lineHeight: 1.45 }}>{cat.t}</div>
        </div>
        <div style={{ padding: 14, display: 'grid', gap: 11 }}>
          <label className="row gap8 ac" style={{ cursor: 'pointer', fontSize: 12 }}>
            <input type="checkbox" checked={st.done} onChange={(e: { target: { checked: boolean } }) => setProc(cat.id, { done: e.target.checked, date: e.target.checked ? (st.date || '2026-02-20') : st.date })} />
            <span style={{ fontWeight: 600 }}>Prosedur telah dilaksanakan</span>
          </label>
          {st.done && (
            <div>
              <div className="tiny muted upper" style={{ marginBottom: 4 }}>Tanggal Pelaksanaan</div>
              <input type="date" className="input" style={{ width: '100%' }} value={st.date} onChange={(e: { target: { value: string } }) => setProc(cat.id, { date: e.target.value })} />
            </div>
          )}
          <div>
            <div className="tiny muted upper" style={{ marginBottom: 4 }}>Referensi Kertas Kerja</div>
            <input className="input" style={{ width: '100%' }} placeholder="mis. Z-100 · B-210" value={st.wpRef} onChange={(e: { target: { value: string } }) => setProc(cat.id, { wpRef: e.target.value })} />
          </div>
          <div>
            <div className="tiny muted upper" style={{ marginBottom: 4 }}>Catatan</div>
            <textarea className="input" value={st.note} placeholder="Catat hasil prosedur / pengecualian / tindak lanjut." onChange={(e: { target: { value: string } }) => setProc(cat.id, { note: e.target.value })} style={{ width: '100%', height: 70, padding: 8, resize: 'vertical', lineHeight: 1.5, fontFamily: 'var(--ui)' }} />
          </div>
        </div>
      </Panel>
    </div>
  );
}

/* ---------------- Tab: Situasi Khusus (fakta pendahulu → opinionDoc.comp; flag → comp710) ---------------- */
function F710Special({ comp, patchComp, wp, setSitu, compActive, setCompActive }: { comp: CompFacts; patchComp: (p: Partial<CompFacts>) => void; wp: Comp710Doc; setSitu: (id: string, p: Partial<SituState>) => void; compActive: boolean; setCompActive: (on: boolean) => void }) {
  const activeCount = SITU_710.filter(s => s.id === 'predPY' ? compActive : (wp.situations[s.id] || EMPTY_SITU).active).length;
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 360px', gap: 12, alignItems: 'start' }}>
      <Panel noBody>
        <div className="panel-h"><h3>Situasi Khusus & Konsekuensinya (¶11–14)</h3><div style={{ flex: 1 }} /><Badge kind="blue">{activeCount} aktif</Badge></div>
        <div style={{ padding: '6px 14px 14px' }}>
          {SITU_710.map((c, i) => {
            const Ic = (I as Record<string, (p: { size?: number }) => JSX.Element>)[c.ic] || I.alert;
            const isPred = c.id === 'predPY';
            const s = wp.situations[c.id] || EMPTY_SITU;
            const active = isPred ? compActive : s.active;
            return (
              <div key={c.id} className="row gap12" style={{ padding: '13px 0', alignItems: 'flex-start', borderBottom: i < SITU_710.length - 1 ? '1px solid var(--line-soft)' : 0, opacity: active ? 1 : 0.72 }}>
                <span style={{ flex: '0 0 36px', width: 36, height: 36, borderRadius: 9, display: 'grid', placeItems: 'center', background: `var(--${c.k}-bg)`, color: `var(--${c.k})` }}><Ic size={18} /></span>
                <div style={{ flex: 1 }}>
                  <div className="row jb ac">
                    <div style={{ fontSize: 12.5, fontWeight: 700 }}>{c.t}</div>
                    <label className="row ac gap6" style={{ cursor: 'pointer' }}>
                      <input type="checkbox" checked={active} onChange={(e: { target: { checked: boolean } }) => isPred ? setCompActive(e.target.checked) : setSitu(c.id, { active: e.target.checked })} />
                      <span className="tiny muted">{active ? 'Aktif' : 'N/A'}</span>
                    </label>
                  </div>
                  <div className="tiny muted" style={{ lineHeight: 1.45, margin: '3px 0 6px' }}>{c.d}</div>
                  {active && (
                    <input className="input" style={{ width: '100%' }} placeholder="Catatan situasi / tindak lanjut" value={s.note} onChange={(e: { target: { value: string } }) => setSitu(c.id, { note: e.target.value })} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel title="Fakta Auditor Pendahulu (SSOT opini · SA 710 ¶13)" sub="Ditulis di sini, dibaca Generator Opini & SA 705">
        <div style={{ display: 'grid', gap: 10 }}>
          <div>
            <div className="tiny muted upper" style={{ marginBottom: 4 }}>Nama Auditor Pendahulu</div>
            <input className="input" style={{ width: '100%' }} placeholder="Kosongkan → “auditor independen lain”" value={comp.predName} onChange={(e: { target: { value: string } }) => patchComp({ predName: e.target.value })} />
          </div>
          <div>
            <div className="tiny muted upper" style={{ marginBottom: 5 }}>Jenis Opini Periode Lalu</div>
            <Seg
              options={[{ value: 'unmodified', label: 'WTP' }, { value: 'qualified', label: 'WDP' }, { value: 'adverse', label: 'TW' }, { value: 'disclaimer', label: 'TMP' }]}
              value={comp.predOpinion}
              onChange={(v: PredOpinionType) => patchComp({ predOpinion: v })}
            />
            <div className="tiny muted" style={{ marginTop: 4 }}>{PRED_OPINION_LABEL[comp.predOpinion]}</div>
          </div>
          <div>
            <div className="tiny muted upper" style={{ marginBottom: 4 }}>Periode Komparatif</div>
            <input className="input" style={{ width: '100%' }} placeholder="31 Desember 2024" value={comp.priorPeriodEnd} onChange={(e: { target: { value: string } }) => patchComp({ priorPeriodEnd: e.target.value })} />
          </div>
          <div>
            <div className="tiny muted upper" style={{ marginBottom: 4 }}>Tanggal Laporan Pendahulu</div>
            <input className="input" style={{ width: '100%' }} placeholder="18 Maret 2025" value={comp.predDate} onChange={(e: { target: { value: string } }) => patchComp({ predDate: e.target.value })} />
          </div>
          <div className="panel" style={{ padding: '9px 11px', background: 'var(--blue-050)', borderColor: 'transparent' }}>
            <div className="row ac gap8"><span style={{ color: 'var(--blue)' }}><I.book size={14} /></span><span style={{ fontSize: 11, lineHeight: 1.4 }}>Fakta ini menyusun paragraf Hal Lain (¶13) — <b>sumber tunggal</b> untuk laporan auditor & modul opini/SA 705.</span></div>
          </div>
        </div>
      </Panel>
    </div>
  );
}

/* ---------------- Tab: Dampak pada Laporan (paragraf diturunkan SSOT + sign-off nyata) ---------------- */
function F710Impact({ client, mode, comp, compActive }: { client: string; mode: string; comp: CompFacts; compActive: boolean }) {
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 300px', gap: 12, alignItems: 'start' }}>
      <Panel noBody>
        <div className="panel-h"><h3>Paragraf Hal Lain — Auditor Pendahulu</h3><div style={{ flex: 1 }} /><Badge kind="teal">SA 710 ¶13 → SA 706</Badge></div>
        <div style={{ padding: 22 }}>
          <div style={{ maxWidth: 640, margin: '0 auto', fontSize: 12.5, lineHeight: 1.7 }}>
            <div style={{ fontWeight: 800, fontSize: 13.5, marginBottom: 8 }}>Hal Lain</div>
            {compActive
              ? <p style={{ margin: 0, color: 'var(--ink-2)' }}>{comparativeParagraph(client, mode, comp)}</p>
              : <p style={{ margin: 0, color: 'var(--ink-3)', fontStyle: 'italic' }}>Paragraf komparatif tidak disertakan dalam laporan (nonaktif pada tab Situasi Khusus / Generator Opini).</p>}
          </div>
        </div>
        <div className="panel" style={{ margin: 16, padding: '11px 13px', background: 'var(--blue-050)', borderColor: 'var(--blue-100)' }}>
          <div className="row gap8" style={{ alignItems: 'flex-start' }}>
            <span style={{ color: 'var(--blue)', flex: '0 0 auto' }}><I.book size={15} /></span>
            <span style={{ fontSize: 11.5, lineHeight: 1.45 }}>Teks di atas <b>diturunkan</b> dari SSOT <span className="mono">opinionDoc.v1.comp</span> — identik dengan yang tercetak di Generator Opini & tercermin di SA 705. {mode === 'corresponding' ? <>Karena pendekatan <b>angka koresponding</b>, opini <b>tidak merujuk</b> periode lalu; informasi pendahulu via paragraf <b>Hal Lain</b> (SA 706).</> : <>Pada <b>LK komparatif</b>, opini merujuk setiap periode yang diaudit.</>}</span>
          </div>
        </div>
      </Panel>

      <div className="grid" style={{ gap: 12 }}>
        <Panel title="Ringkasan Dampak Laporan">
          <div style={{ display: 'grid', gap: 8 }}>
            {([
              ['Opini periode kini', mode === 'corresponding' ? 'Tidak terpengaruh' : 'Merujuk tiap periode', mode === 'corresponding' ? 'green' : 'blue'],
              ['Rujukan ke angka PY dalam opini', mode === 'corresponding' ? 'Tidak ada' : 'Ada', mode === 'corresponding' ? 'green' : 'blue'],
              ['Paragraf Hal Lain', compActive ? 'Ditambahkan' : 'Tidak', compActive ? 'blue' : 'gray'],
              ['Penyajian kembali komparatif', 'Diungkap (PSAK 25)', 'amber'],
            ] as [string, string, string][]).map((r, i) => (
              <div key={i} className="row jb ac" style={{ fontSize: 11.5, padding: '7px 9px', border: '1px solid var(--line-soft)', borderRadius: 6 }}>
                <span>{r[0]}</span><Badge kind={r[2]}>{r[1]}</Badge>
              </div>
            ))}
          </div>
        </Panel>
        <SASignoffMini stdId="sa710" />
      </div>
    </div>
  );
}

Object.assign(window, { SA710View });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { SA710View };
