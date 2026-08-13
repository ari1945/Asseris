import React from 'react';
import { I, MODULE_INDEX } from './icons';
import { Badge, Panel } from './ui';
import {
  TOOLKIT_DOCS, TOOLKIT_DOC_COUNT, TOOLKIT_SECTION_TITLE, TOOLKIT_KIND_LABEL,
  TOOLKIT_HOME_LABEL, TOOLKIT_DANGLING_REFS, TOOLKIT_OUT_OF_SCOPE,
  toolkitHomes, objectivesForDoc,
  type ToolkitDoc, type ToolkitHome,
} from './canon_smm_toolkit';

/* ============================================================
   Asseris — Tab "Dokumentasi SMM" · Peta Toolkit IAPI (PR-8a-1)
   ------------------------------------------------------------
   Menjawab pertanyaan yang selama ini tak bisa dijawab aplikasi:
   "Respons terhadap tujuan mutu ini berbentuk dokumen apa, dan
   modul mana yang menampungnya?"

   Yang membuat panel ini alat, bukan brosur: ia menyatakan
   dokumen yang BELUM punya rumah, rujukan Matriks yang
   MENGGANTUNG, dan bagian SMM 1 yang memang DI LUAR cakupan
   Toolkit — ketiganya keadaan yang bisa "gagal".
   ============================================================ */
const { useState: useTK } = React;

const HOME_KIND: Record<ToolkitHome, string> = { mapped: 'green', partial: 'amber', none: 'red' };

function ModuleChips({ doc, nav }: { doc: ToolkitDoc; nav?: (id: string, o?: unknown) => void }) {
  return (
    <span className="row ac gap6" style={{ flexWrap: 'wrap' }}>
      {doc.modules.map((m) => {
        const meta = (MODULE_INDEX as Record<string, { label?: string } | undefined>)[m];
        return (
          <button
            key={m}
            type="button"
            className="lin-cta"
            title={'Buka modul ' + (meta && meta.label ? meta.label : m)}
            onClick={() => nav && nav(m, { from: 'soqm' })}
          >
            {meta && meta.label ? meta.label : m}
          </button>
        );
      })}
    </span>
  );
}

function SoqmToolkitMap({ nav }: { nav?: (id: string, o?: unknown) => void }) {
  const [openSection, setOpenSection] = useTK(null as number | null);
  const homes = toolkitHomes();
  const gapDocs = [...homes.partial, ...homes.none];

  return (
    <div style={{ padding: 14, display: 'grid', gap: 14 }}>
      {/* Kepala — batas aset, bukan proforma */}
      <div className="panel" style={{ padding: '15px 18px', background: 'var(--blue-050)', borderColor: 'transparent', boxShadow: 'none' }}>
        <div className="row ac gap8">
          <span style={{ color: 'var(--blue)' }}>{I ? <I.layers size={16} /> : null}</span>
          <div className="tiny" style={{ lineHeight: 1.55 }}>
            <b>Toolkit Manajemen Mutu V3 (IAPI)</b> memuat {TOOLKIT_DOC_COUNT} dokumen ilustratif (1.1–9.7), dan{' '}
            <b>Matriks Ilustrasi Risiko Mutu V3</b> memetakan tiap tujuan mutu mandatori ke dokumen yang menjadi
            ilustrasi responsnya. Keduanya bersifat <b>ilustratif, bukan proforma</b> — Matriks melarang eksplisit
            memakai contohnya tanpa mempertimbangkan relevansi bagi sifat &amp; kondisi KAP. Peta di bawah menyimpan
            nomor, judul, dan jenis dokumen sebagai rujukan; isi dokumen tidak disalin.
          </div>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
        <TkKpi label="Dokumen Toolkit" v={TOOLKIT_DOC_COUNT} sub="1.1 s.d. 9.7 · 9 seksi" />
        <TkKpi label="Ada Modul Penampung" v={homes.mapped.length} accent="var(--green)" sub="artefaknya punya rumah" />
        <TkKpi label="Celah Artefak" v={gapDocs.length} accent={gapDocs.length ? 'var(--amber)' : 'var(--green)'}
          sub="prosesnya ada, dokumennya belum" />
        <TkKpi label="Rujukan Menggantung" v={TOOLKIT_DANGLING_REFS.length}
          accent={TOOLKIT_DANGLING_REFS.length ? 'var(--amber)' : 'var(--green)'} sub="cacat pada materi IAPI" />
      </div>

      {/* Celah artefak — ditampilkan lebih dulu; ini yang bisa ditindaklanjuti */}
      {gapDocs.length > 0 && (
        <Panel title="Dokumen Toolkit yang belum punya artefak di Asseris" sub="temuan produk — bukan sekadar baris peta yang kosong">
          <div style={{ display: 'grid', gap: 8 }}>
            {gapDocs.map((d) => (
              <div key={d.no} className="panel" style={{ padding: '10px 12px', boxShadow: 'none', borderLeft: '3px solid var(--' + (d.home === 'none' ? 'red' : 'amber') + ')' }}>
                <div className="row jb ac" style={{ marginBottom: 3 }}>
                  <span style={{ fontSize: 12, fontWeight: 700 }}><span className="mono">{d.no}</span> · {d.title}</span>
                  <Badge kind={HOME_KIND[d.home]}>{TOOLKIT_HOME_LABEL[d.home]}</Badge>
                </div>
                <div className="tiny muted" style={{ lineHeight: 1.5, marginBottom: 5 }}>{d.gap}</div>
                <ModuleChips doc={d} nav={nav} />
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* Peta penuh, dikelompokkan per seksi */}
      <Panel title="Peta 41 Dokumen Toolkit → Modul Asseris" sub="klik nama modul untuk membukanya; klik seksi untuk melipat">
        <div style={{ display: 'grid', gap: 4 }}>
          {Object.keys(TOOLKIT_SECTION_TITLE).map(Number).map((s) => {
            const docs = TOOLKIT_DOCS.filter((d) => d.section === s);
            const open = openSection === null || openSection === s;
            return (
              <div key={s}>
                <button
                  type="button"
                  className="soqm-src"
                  style={{ width: '100%' }}
                  aria-expanded={open}
                  onClick={() => setOpenSection(openSection === s ? -1 : s)}
                >
                  <span className="tiny upper" style={{ fontWeight: 700 }}>{s} · {TOOLKIT_SECTION_TITLE[s]}</span>
                  <span className="tiny muted">{docs.length} dokumen</span>
                </button>
                {open && (
                  <table className="dtbl">
                    <thead>
                      <tr><th style={{ width: 52 }}>No.</th><th>Dokumen</th><th style={{ width: 118 }}>Jenis</th><th>Modul Penampung</th><th style={{ width: 92 }} className="num">Tujuan</th></tr>
                    </thead>
                    <tbody>
                      {docs.map((d) => {
                        const objs = objectivesForDoc(d.no);
                        return (
                          <tr key={d.no}>
                            <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{d.no}</td>
                            <td className="tiny" style={{ fontWeight: 600 }}>
                              {d.title}
                              {d.home !== 'mapped' && <span className="tiny" style={{ color: 'var(--amber)', fontWeight: 700 }}> · celah</span>}
                            </td>
                            <td className="tiny muted">{TOOLKIT_KIND_LABEL[d.kind]}</td>
                            <td><ModuleChips doc={d} nav={nav} /></td>
                            <td className="num tiny muted" title={objs.join(' · ') || 'Tidak dirujuk Matriks'}>
                              {objs.length || '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })}
        </div>
      </Panel>

      {/* Rujukan menggantung pada materi IAPI */}
      {TOOLKIT_DANGLING_REFS.length > 0 && (
        <Panel title="Rujukan Matriks yang menggantung" sub="dilaporkan apa adanya — peta yang membuang rujukan tak dikenal akan tampak lengkap padahal tidak">
          <div style={{ display: 'grid', gap: 8 }}>
            {TOOLKIT_DANGLING_REFS.map((d) => (
              <div key={d.no} className="panel" style={{ padding: '10px 12px', boxShadow: 'none', borderLeft: '3px solid var(--amber)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 3 }}><span className="mono">{d.no}</span> · {d.citedAs}</div>
                <div className="tiny muted" style={{ lineHeight: 1.5 }}>{d.note}</div>
                <div className="tiny" style={{ marginTop: 4 }}>Dirujuk pada tujuan: <span className="mono">{d.objectives.join(' · ')}</span></div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* Batas aset — supaya tidak terbaca sebagai kekurangan firma */}
      <Panel title="Di luar cakupan Toolkit &amp; Matriks IAPI" sub="ketiadaan dokumen di bagian ini adalah batas asetnya, BUKAN celah firma">
        <div style={{ display: 'grid', gap: 6 }}>
          {TOOLKIT_OUT_OF_SCOPE.map((x) => (
            <div key={x.ref} className="row gap8" style={{ alignItems: 'flex-start' }}>
              <span style={{ color: 'var(--ink-3)', flex: '0 0 auto', marginTop: 1 }}>{I ? <I.book size={13} /> : null}</span>
              <div className="tiny" style={{ lineHeight: 1.5 }}><b>{x.ref}</b> — {x.why}</div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function TkKpi({ label, v, sub, accent }: { label: string; v: string | number; sub?: string; accent?: string }) {
  return (
    <div className="panel" style={{ padding: '11px 13px', boxShadow: 'none' }}>
      <div className="tiny muted upper" style={{ marginBottom: 3 }}>{label}</div>
      <div className="mono" style={{ fontSize: 19, fontWeight: 800, color: accent || 'var(--ink)' }}>{v}</div>
      {sub && <div className="tiny muted" style={{ marginTop: 2, lineHeight: 1.35 }}>{sub}</div>}
    </div>
  );
}

export { SoqmToolkitMap };
