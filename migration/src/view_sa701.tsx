/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { useFirm, useAmsPersist, useNav } from './contexts';
import { I } from './icons';
import { SubBar } from './shell';
import { Badge, Btn, Panel, Tabs } from './ui';
import { AMSOpinion } from './view_opinion_parts';
import { DEFAULT_DOC_O } from './view_opinion';
import { SACanonChips, SACanonicalStatus, SASignoffMini } from './sa_canonical';

/* ============================================================
   Asseris — SA 701 · Pengomunikasian Hal Audit Utama (KAM)
   F2/PR-B: kini LENSA atas SSOT KAM bersama `opinionDoc.v1.kams`
   (register yang sama dengan Generator Opini, mengalir ke laporan
   auditor). Register KAM memakai ulang AMSOpinion.KAMWorkshop; corong
   penentuan, penyajian laporan, & keterkaitan TCWG DITURUNKAN dari
   doc. Kumpulan "dikomunikasikan tapi bukan KAM" (¶18) diedit di sini.
   ============================================================ */
const { useState: useState701 } = React;

type ODoc = typeof DEFAULT_DOC_O & { mod705?: unknown };
type Patch = (p: Record<string, unknown>) => void;
type Kam = { id: string; risk?: string | null; title: string; why: string; how: string; wpRef?: string; fsRef?: string; include?: boolean };
type Excluded = { id: string; matter: string; reason: string };

/* ============================================================ */
function SA701View() {
  const firm = useFirm();
  const nav = useNav();
  const client = firm?.activeClient?.name || 'PT Sentosa Makmur Tbk';
  const engId = firm?.activeEngagement?.id || 'ENG-2025-014';
  const listed = firm?.activeClient?.listed;
  const [tab, setTab] = useState701('penentuan');
  /* SSOT KAM bersama modul opini — engagement-scope + isolasi W7.5. Seed identik. */
  const [doc, setDoc] = useAmsPersist('opinionDoc.v1', () => DEFAULT_DOC_O);
  const patch: Patch = (p) => setDoc((d: ODoc) => ({ ...d, ...p }));

  const kams: Kam[] = doc.kams || [];
  const included = kams.filter((k) => k.include !== false);
  const suppressed = doc.type === 'disclaimer'; // TMP → tak ada bagian KAM (SA 701.15)

  const tabs = [
    { id: 'penentuan', label: 'Penentuan KAM' },
    { id: 'register', label: 'Register KAM', count: kams.length || null },
    { id: 'laporan', label: 'Penyajian Laporan' },
    { id: 'komunikasi', label: 'Keterkaitan & TCWG' },
  ];

  const openOpinion = () => { (nav as (id: string, opt?: { from?: string }) => void)('opinion', { from: 'sa701' }); };

  return (
    <>
      <SubBar moduleId="sa701" right={
        <div className="row gap8 ac">
          <SACanonChips stdId="sa701" />
          <Badge kind={suppressed ? 'red' : 'teal'} dot>{suppressed ? 'TMP — tanpa KAM' : `${included.length} KAM ditentukan`}</Badge>
          <Btn sm onClick={openOpinion}><I.doc size={13} /> Generator Opini</Btn>
        </div>
      } />
      <div className="view-scroll"><div className="view-pad">

        <Panel noBody style={{ marginBottom: 12 }}>
          <div style={{ padding: '13px 16px', display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ minWidth: 210 }}>
              <div className="tiny muted upper" style={{ marginBottom: 3 }}>Standar Audit 701</div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>Pengomunikasian Hal Audit Utama</div>
              <div className="tiny muted">{client} · {listed ? 'Entitas Terdaftar' : 'Entitas'} · {engId}</div>
            </div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Hal ke TCWG</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5 }}>{kams.length + (doc.kamExcluded?.length || 0)} hal</div></div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">KAM Final</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--teal)' }}>{suppressed ? '—' : `${included.length} hal audit utama`}</div></div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Penerapan</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5 }}>{listed ? 'Wajib — entitas terdaftar' : 'Sesuai pertimbangan/ketentuan'}</div></div>
            <div style={{ flex: 1 }} />
            <div style={{ textAlign: 'right' }}>
              <div className="tiny muted upper" style={{ marginBottom: 3 }}>Letak dalam Laporan</div>
              <Badge kind="blue" dot>Setelah paragraf Basis Opini</Badge>
            </div>
          </div>
        </Panel>

        {suppressed && (
          <Panel noBody style={{ marginBottom: 12 }}>
            <div className="row gap8" style={{ padding: '11px 14px', background: 'var(--amber-bg)', alignItems: 'flex-start' }}>
              <span style={{ color: 'var(--amber)', flex: '0 0 auto', marginTop: 1 }}><I.alert size={15} /></span>
              <span style={{ fontSize: 12, lineHeight: 1.5 }}>Opini saat ini <b>Tidak Menyatakan Pendapat (TMP)</b> — auditor tidak mencantumkan bagian Hal Audit Utama kecuali diharuskan peraturan (SA 701.15). Ubah jenis opini di <b>Modifikasi Opini (SA 705)</b> atau Generator Opini.</span>
            </div>
          </Panel>
        )}

        <div style={{ marginBottom: 12 }}><SACanonicalStatus stdId="sa701" /></div>
        <div style={{ marginBottom: 12 }}><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>

        {tab === 'penentuan' && <F701Funnel doc={doc} />}
        {tab === 'register' && <F701Register doc={doc} patch={patch} />}
        {tab === 'laporan' && <F701Report client={client} doc={doc} suppressed={suppressed} />}
        {tab === 'komunikasi' && <F701Comms doc={doc} patch={patch} />}

        <div style={{ marginTop: 12 }}><SASignoffMini stdId="sa701" /></div>

      </div></div>
    </>
  );
}

/* ---------------- Tab: Penentuan (corong, DITURUNKAN) ---------------- */
function F701Funnel({ doc }: { doc: ODoc }) {
  const kams: Kam[] = doc.kams || [];
  const excluded: Excluded[] = doc.kamExcluded || [];
  const included = kams.filter((k) => k.include !== false).length;
  const nTcwg = kams.length + excluded.length;
  const funnel = [
    { stage: 'Dikomunikasikan ke TCWG (SA 260)', n: nTcwg, ref: '¶9', color: 'blue', d: 'Seluruh hal yang dikomunikasikan kepada pihak tata kelola (kandidat KAM + hal yang dikecualikan).' },
    { stage: 'Perhatian signifikan auditor', n: kams.length, ref: '¶9(a–c)', color: 'purple', d: 'Hal yang memerlukan perhatian signifikan auditor — kandidat KAM yang disusun.' },
    { stage: 'Hal Audit Utama (KAM)', n: included, ref: '¶10', color: 'teal', d: 'Hal paling signifikan dalam audit periode berjalan — disertakan pada laporan.' },
  ];
  const sigRisks = (AMS.RISKS || []).filter((r) => r.inherent === 'Significant');
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 340px', gap: 12, alignItems: 'start' }}>
      <Panel noBody>
        <div className="panel-h"><h3>Corong Penentuan Hal Audit Utama (¶9–10)</h3><div style={{ flex: 1 }} /><Badge kind="blue">Diturunkan dari register</Badge></div>
        <div style={{ padding: 18 }}>
          {funnel.map((f, i) => {
            const w = [100, 74, 50][i];
            return (
              <div key={i} style={{ marginBottom: i < 2 ? 8 : 0 }}>
                <div style={{ width: w + '%', margin: '0 auto', background: `var(--${f.color}-bg)`, border: `1.5px solid var(--${f.color})`, borderRadius: 10, padding: '12px 16px', textAlign: 'center' }}>
                  <div className="row ac jc gap8"><span className="mono" style={{ fontSize: 22, fontWeight: 800, color: `var(--${f.color})` }}>{f.n}</span><span style={{ fontWeight: 700, fontSize: 12.5 }}>{f.stage}</span></div>
                  <div className="tiny muted" style={{ marginTop: 3, lineHeight: 1.4 }}>{f.d}</div>
                </div>
                {i < 2 && <div style={{ textAlign: 'center', color: 'var(--ink-4)', margin: '2px 0' }}><I.chevDown size={16} /></div>}
              </div>
            );
          })}
        </div>
        <div className="panel" style={{ margin: 12, padding: '10px 12px', background: 'var(--blue-050)', borderColor: 'var(--blue-100)' }}>
          <div className="row gap8" style={{ alignItems: 'flex-start' }}>
            <span style={{ color: 'var(--blue)', flex: '0 0 auto' }}><I.book size={15} /></span>
            <span style={{ fontSize: 11.5, lineHeight: 1.45 }}>KAM dipilih dari hal yang dikomunikasikan ke TCWG yang <b>memerlukan perhatian signifikan auditor</b> (¶9), lalu ditentukan hal mana yang <b>paling signifikan</b> (¶10). Kelola kandidat di tab <b>Register KAM</b>; hal yang dikecualikan di <b>Keterkaitan & TCWG</b>.</span>
          </div>
        </div>
      </Panel>

      <div className="grid" style={{ gap: 12 }}>
        <Panel title="Kandidat dari Register Risiko" sub="Risiko signifikan — SA 315/701.9">
          <div style={{ display: 'grid', gap: 7 }}>
            {sigRisks.length === 0 && <div className="tiny muted">Tidak ada risiko bertanda signifikan pada register.</div>}
            {sigRisks.map((r) => {
              const used = kams.some((k) => k.risk === r.id);
              return (
                <div key={r.id} className="row gap8" style={{ fontSize: 11.5, alignItems: 'flex-start' }}>
                  <span style={{ color: used ? 'var(--teal)' : 'var(--ink-4)', flex: '0 0 auto', marginTop: 1 }}>{used ? <I.checkCircle size={13} /> : <I.circle size={13} />}</span>
                  <span style={{ lineHeight: 1.4 }}><span className="mono" style={{ fontWeight: 700, color: 'var(--blue)' }}>{r.id}</span> — {r.area}{used ? ' · menjadi KAM' : ''}</span>
                </div>
              );
            })}
          </div>
          <div className="tiny muted" style={{ marginTop: 9, lineHeight: 1.45 }}>Promosikan risiko menjadi KAM pada tab <b>Register KAM</b>.</div>
        </Panel>
        <Panel title="Kriteria Perhatian Signifikan (¶9)">
          <div style={{ display: 'grid', gap: 9 }}>
            {[
              ['Area risiko salah saji material tinggi / risiko signifikan (SA 315)', 'a'],
              ['Pertimbangan auditor signifikan atas area estimasi dengan ketidakpastian tinggi', 'b'],
              ['Dampak peristiwa/transaksi signifikan terhadap audit', 'c'],
            ].map((r, i) => (
              <div key={i} className="row gap8" style={{ fontSize: 11.5, alignItems: 'flex-start' }}>
                <span style={{ flex: '0 0 20px', width: 20, height: 20, borderRadius: 5, background: 'var(--blue-050)', color: 'var(--blue)', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 10 }}>{r[1]}</span>
                <span style={{ lineHeight: 1.4 }}>{r[0]}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ---------------- Tab: Register KAM (memakai ulang KAMWorkshop) ---------------- */
function F701Register({ doc, patch }: { doc: ODoc; patch: Patch }) {
  const KAMWorkshop = AMSOpinion.KAMWorkshop;
  return (
    <div className="grid" style={{ gap: 12 }}>
      <div className="panel" style={{ padding: '9px 12px', background: 'var(--blue-050)', borderColor: 'var(--blue-100)' }}>
        <div className="row gap8" style={{ alignItems: 'flex-start' }}>
          <span style={{ color: 'var(--blue)', flex: '0 0 auto' }}><I.link2 size={14} /></span>
          <span style={{ fontSize: 11.5, lineHeight: 1.45 }}>Register ini adalah <b>sumber kebenaran tunggal</b> KAM — sama dengan Generator Opini & bagian "Hal Audit Utama" pada laporan auditor. Perubahan tersinkron otomatis.</span>
        </div>
      </div>
      <KAMWorkshop doc={doc} patch={patch} />
    </div>
  );
}

/* ---------------- Tab: Penyajian Laporan (DITURUNKAN dari KAM disertakan) ---------------- */
function F701Report({ client, doc, suppressed }: { client: string; doc: ODoc; suppressed: boolean }) {
  const kams: Kam[] = (doc.kams || []).filter((k) => k.include !== false);
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 300px', gap: 12, alignItems: 'start' }}>
      <Panel noBody>
        <div className="panel-h"><h3>Draf Bagian "Hal Audit Utama" — Laporan Auditor</h3><div style={{ flex: 1 }} /><Badge kind="blue">Pratinjau</Badge></div>
        <div style={{ padding: 22 }}>
          <div style={{ maxWidth: 660, margin: '0 auto', fontSize: 12.5, lineHeight: 1.65 }}>
            {suppressed ? (
              <div className="row gap8" style={{ alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--amber)', flex: '0 0 auto', marginTop: 1 }}><I.alert size={15} /></span>
                <span style={{ lineHeight: 1.5 }}>Opini Tidak Menyatakan Pendapat — bagian Hal Audit Utama tidak disajikan (SA 701.15).</span>
              </div>
            ) : kams.length === 0 ? (
              <div className="tiny muted" style={{ padding: '18px 0', textAlign: 'center' }}>Belum ada KAM yang disertakan. Tambahkan/aktifkan KAM di tab Register KAM.</div>
            ) : (<>
              <div style={{ fontWeight: 800, fontSize: 13.5, marginBottom: 6 }}>Hal Audit Utama</div>
              <p style={{ margin: '0 0 14px', color: 'var(--ink-2)' }}>Hal audit utama adalah hal-hal yang, menurut pertimbangan profesional kami, merupakan hal yang paling signifikan dalam audit kami atas laporan keuangan periode kini. Hal-hal tersebut ditangani dalam konteks audit kami atas laporan keuangan secara keseluruhan, dan dalam merumuskan opini kami, kami tidak menyatakan suatu opini terpisah atas hal-hal tersebut.</p>
              {kams.map((k, i) => (
                <div key={k.id} style={{ marginBottom: 14, paddingBottom: 14, borderBottom: i < kams.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>{k.title}</div>
                  {k.why && <p style={{ margin: '0 0 6px', color: 'var(--ink-2)' }}>{k.why}{k.fsRef ? ` (Rujukan: ${k.fsRef}.)` : ''}</p>}
                  {k.how && <><div className="tiny" style={{ fontWeight: 700, color: 'var(--teal)', marginBottom: 3 }}>Bagaimana hal tersebut ditangani dalam audit kami:</div>
                    <p style={{ margin: 0, color: 'var(--ink-2)' }}>{k.how}</p></>}
                </div>
              ))}
            </>)}
          </div>
        </div>
      </Panel>

      <div className="grid" style={{ gap: 12 }}>
        <Panel title="Letak & Urutan dalam Laporan">
          <div style={{ display: 'grid', gap: 6 }}>
            {['Opini', 'Basis Opini', 'Hal Audit Utama ◄', 'Tanggung Jawab Manajemen', 'Tanggung Jawab Auditor', 'Tanda Tangan & Tanggal'].map((t, i) => (
              <div key={i} className="row ac gap8" style={{ fontSize: 11.5, padding: '6px 9px', borderRadius: 6, background: t.includes('◄') ? 'var(--teal-bg)' : 'var(--surface-2)', fontWeight: t.includes('◄') ? 700 : 500 }}>
                <span className="mono tiny" style={{ color: 'var(--ink-4)' }}>{i + 1}</span>{t.replace(' ◄', '')}
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Catatan Penyajian">
          <p className="tiny muted" style={{ margin: 0, lineHeight: 1.5 }}>Bagian ini diturunkan dari register KAM (yang <b>disertakan</b>) dan identik dengan laporan tersegel Generator Opini. KAM <b>tidak</b> menggantikan pengungkapan manajemen, opini modifikasi (SA 705), maupun pelaporan going concern (SA 570).</p>
        </Panel>
      </div>
    </div>
  );
}

/* ---------------- Tab: Keterkaitan & TCWG (linkage diturunkan + editor ¶18) ---------------- */
function F701Comms({ doc, patch }: { doc: ODoc; patch: Patch }) {
  const kams: Kam[] = doc.kams || [];
  const excluded: Excluded[] = doc.kamExcluded || [];
  const setExcluded = (fn: (x: Excluded[]) => Excluded[]) => patch({ kamExcluded: fn(excluded) });
  const addExcluded = () => setExcluded((x) => [...x, { id: 'ex' + (x.length + 1) + '-' + x.reduce((s, e) => s + e.id.length, 0), matter: '', reason: '' }]);
  const updExcluded = (id: string, p: Partial<Excluded>) => setExcluded((x) => x.map((e) => e.id === id ? { ...e, ...p } : e));
  const rmExcluded = (id: string) => setExcluded((x) => x.filter((e) => e.id !== id));

  return (
    <div className="grid" style={{ gap: 12 }}>
      <Panel noBody>
        <div className="panel-h"><h3>Keterkaitan KAM dengan Penilaian Risiko</h3><div style={{ flex: 1 }} /><Badge kind="blue">Diturunkan</Badge></div>
        <table className="dtbl">
          <thead><tr><th>KAM</th><th>Risiko Terkait</th><th>Rujukan LK</th><th style={{ width: 110 }}>Di Laporan</th></tr></thead>
          <tbody>
            {kams.length === 0 && <tr><td colSpan={4} className="tiny muted" style={{ textAlign: 'center', padding: 14 }}>Belum ada KAM pada register.</td></tr>}
            {kams.map((k) => (
              <tr key={k.id}>
                <td style={{ fontWeight: 600 }}>{k.title}</td>
                <td className="tiny">{k.risk || '—'}</td>
                <td className="tiny mono">{k.fsRef || '—'}</td>
                <td><Badge kind={k.include !== false ? 'green' : 'default'}>{k.include !== false ? 'Disertakan' : 'Dikecualikan'}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }}>
        <Panel title="Dikomunikasikan namun Bukan KAM (¶18)"
          actions={<Btn sm onClick={addExcluded}><I.plus size={13} /> Tambah</Btn>}>
          <div className="tiny muted" style={{ marginBottom: 9, lineHeight: 1.5 }}>Dokumentasikan hal yang dikomunikasikan ke TCWG namun <b>ditentukan bukan</b> KAM, beserta alasannya (SA 701.18).</div>
          <div style={{ display: 'grid', gap: 9 }}>
            {excluded.length === 0 && <div className="tiny muted">Belum ada hal yang dikecualikan.</div>}
            {excluded.map((e) => (
              <div key={e.id} className="panel" style={{ padding: 10, display: 'grid', gap: 7 }}>
                <div className="row ac gap8">
                  <input className="input" style={{ flex: 1 }} placeholder="Hal (mis. Sewa PSAK 73)" value={e.matter} onChange={(ev: { target: { value: string } }) => updExcluded(e.id, { matter: ev.target.value })} />
                  <button className="p-act" onClick={() => rmExcluded(e.id)} title="Hapus" style={{ color: 'var(--red)' }}><I.x size={13} /></button>
                </div>
                <textarea className="input" placeholder="Alasan tidak menjadi KAM…" value={e.reason} onChange={(ev: { target: { value: string } }) => updExcluded(e.id, { reason: ev.target.value })} style={{ height: 52, padding: 8, resize: 'vertical', lineHeight: 1.5, fontFamily: 'var(--ui)' }} />
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Komunikasi & Dokumentasi (¶17–18)">
          <div style={{ display: 'grid', gap: 8 }}>
            {[
              { t: 'KAM yang ditentukan dikomunikasikan ke TCWG/Komite Audit (¶17)', ok: kams.filter((k) => k.include !== false).length > 0 },
              { t: 'Hal yang dipertimbangkan namun tidak menjadi KAM didokumentasikan (¶18)', ok: excluded.length > 0 },
              { t: 'Setiap KAM memuat alasan (why) & penanganan (how)', ok: kams.length > 0 && kams.every((k) => k.why && k.how) },
              { t: 'Setiap KAM memiliki rujukan LK / kertas kerja', ok: kams.length > 0 && kams.every((k) => k.fsRef || k.wpRef) },
            ].map((r, i) => (
              <div key={i} className="row gap8" style={{ fontSize: 11.5, alignItems: 'flex-start' }}>
                <span style={{ color: r.ok ? 'var(--green)' : 'var(--ink-4)', flex: '0 0 auto', marginTop: 1 }}>{r.ok ? <I.checkCircle size={15} /> : <I.circle size={14} />}</span>
                <span style={{ lineHeight: 1.4 }}>{r.t}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

Object.assign(window, { SA701View });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { SA701View };
