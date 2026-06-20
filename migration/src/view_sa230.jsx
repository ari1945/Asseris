/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { AMS_CANON } from './canon';
import { useAudit, useFirm, useNav } from './contexts.jsx';
import { I } from './icons.jsx';
import { SignoffDots } from './sa_canonical.jsx';
import { SubBar } from './shell.jsx';
import { Badge, Btn, Panel, Tabs } from './ui.jsx';

/* ============================================================
   NeoSuite AMS — SA 230 · Dokumentasi Audit
   ------------------------------------------------------------
   Halaman standar MENDALAM untuk SA 230. SELURUH angka & status
   ditarik dari SUMBER KEBENARAN TUNGGAL:
     · window.WP_REFS + window.deriveWpStatus  (status & sign-off WP)
     · window.collectWpNotes                    (catatan reviu / ¶10)
     · useAudit().risks                         (hal signifikan / ¶8c)
     · AMS_CANON.materiality                    (basis pertimbangan)
     · DMS (modul kanonik) untuk perakitan & retensi (¶14–16)
   Tidak ada salinan privat status perikatan yang disimpan di sini.
   Tabs: Ikhtisar · Atribut (¶8–9) · Hal Signifikan (¶8c/¶10) ·
         Penyimpangan & Inkonsistensi (¶11–13) · Perakitan & Retensi.
   ============================================================ */
const { useState: useStateD2, useMemo: useMemoD2 } = React;

/* REF "hari ini" — selaras dengan modul DMS (sumber perakitan) */
const D2_REF = new Date('2026-03-09');
/* tanggal laporan terencana untuk perikatan aktif (kanonik di DMS DOC-0623) */
const D2_REPORT_DATE = new Date('2026-03-20');
const D2_RETENTION_YEARS = 10;     // SPM 1 / kebijakan firma (Pengaturan)
const D2_ASSEMBLY_DAYS = 60;       // SA 230 ¶A21

const d2fmtDate = (d) => d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const d2addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const d2addYears = (d, n) => { const x = new Date(d); x.setFullYear(x.getFullYear() + n); return x; };

/* ---- baca seluruh status WP kanonik sekali, untuk semua tab ---- */
function useDocCanon() {
  const audit = useAudit();
  const firm = useFirm();
  const nav = useNav();
  const refs = window.WP_REFS || [];
  const derive = window.deriveWpStatus;

  return useMemoD2(() => {
    const rows = (derive ? refs.map(r => derive(r.ref, audit, firm)) : []).filter(Boolean);
    const sig = (l) => (l ? l.signed : null);
    const enriched = rows.map(r => {
      const prep = sig(r.signoff.find(s => s.key === 'preparer'));
      const rev = sig(r.signoff.find(s => s.key === 'reviewer'));
      // ¶9 atribut dokumentasi (5):
      const attr = {
        prepared: !!prep,                 // disiapkan oleh + tanggal
        reviewed: !!rev,                  // direviu oleh + tanggal
        procedures: r.total > 0 && r.done === r.total,  // sifat/saat/lingkup terdokumentasi
        notesCleared: r.openNotes === 0,  // catatan reviu tuntas
        identifying: r.hasLead,           // karakteristik identifikasi (skedul utama ↔ WTB)
      };
      const sat = Object.values(attr).filter(Boolean).length;
      return { ...r, prep, rev, attr, sat, attrPct: Math.round(sat / 5 * 100) };
    });

    const total = enriched.length || 1;
    const procDone = enriched.reduce((a, r) => a + r.done, 0);
    const procTotal = enriched.reduce((a, r) => a + r.total, 0);
    const openNotes = enriched.reduce((a, r) => a + r.openNotes, 0);
    const exc = enriched.reduce((a, r) => a + r.exc, 0);
    const reviewed = enriched.filter(r => r.status === 'Reviewed').length;
    const fullySigned = enriched.filter(r => r.fullySigned).length;
    const noReviewer = enriched.filter(r => !r.attr.reviewed);
    const notStarted = enriched.filter(r => r.status === 'Not Started');
    const withLead = enriched.filter(r => r.hasLead);
    const sumSat = enriched.reduce((a, r) => a + r.sat, 0);
    const docPct = Math.round(sumSat / (enriched.length * 5 || 1) * 100);

    const agg = {
      total: enriched.length, procDone, procTotal,
      procPct: procTotal ? Math.round(procDone / procTotal * 100) : 0,
      openNotes, exc, reviewed,
      reviewPct: Math.round(reviewed / total * 100),
      fullySigned, signPct: Math.round(fullySigned / total * 100),
      noReviewer, notStarted, withLead, docPct,
      blocking: openNotes + exc + noReviewer.length,
    };
    return { rows: enriched, agg, audit, firm, nav };
  }, [refs, audit.wpState, audit.risks, audit.wtb, firm.activeEngagement]);
}

/* ============================================================ */
function SA230View() {
  const firm = useFirm();
  const client = firm?.activeClient?.name || 'PT Sentosa Makmur Tbk';
  const eng = firm?.activeEngagement?.id || 'ENG-2025-014';
  const [tab, setTab] = useStateD2('ikhtisar');
  const C = useDocCanon();

  const tabs = [
    { id: 'ikhtisar', label: 'Ikhtisar Dokumentasi' },
    { id: 'atribut', label: 'Atribut (¶8–9)', count: C.agg.blocking || undefined },
    { id: 'signifikan', label: 'Hal Signifikan (¶8c/10)' },
    { id: 'penyimpangan', label: 'Penyimpangan & Inkonsistensi' },
    { id: 'perakitan', label: 'Perakitan & Retensi' },
    { id: 'keterkaitan', label: 'Keterkaitan Modul' },
  ];

  return (
    <>
      <SubBar moduleId="sa230" right={
        <div className="row gap8 ac">
          <Badge kind={C.agg.blocking ? 'amber' : 'green'} dot>{C.agg.docPct}% kelengkapan</Badge>
          <Badge kind="blue">SA 230</Badge>
          <Btn sm onClick={() => C.nav('dms', { from: 'sa230' })}><I.layers size={13} /> Berkas Final (DMS)</Btn>
          <Btn sm variant="primary"><I.download size={14} /> Memo Dokumentasi</Btn>
        </div>
      } />
      <div className="view-scroll"><div className="view-pad">

        {/* hero — konteks perikatan */}
        <Panel noBody style={{ marginBottom: 12 }}>
          <div style={{ padding: '13px 16px', display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ minWidth: 232 }}>
              <div className="tiny muted upper" style={{ marginBottom: 3 }}>Standar Audit 230</div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>Dokumentasi Audit</div>
              <div className="tiny muted">{client} · {eng}</div>
            </div>
            <div className="vdivider" style={{ height: 38 }} />
            <D2Hero label="KK Ter-review Penuh" value={`${C.agg.fullySigned}/${C.agg.total}`} />
            <div className="vdivider" style={{ height: 38 }} />
            <D2Hero label="Prosedur Terdokumentasi" value={`${C.agg.procPct}%`} />
            <div className="vdivider" style={{ height: 38 }} />
            <D2Hero label="Catatan Reviu Terbuka" value={C.agg.openNotes} accent={C.agg.openNotes ? 'var(--amber)' : 'var(--green)'} />
            <div className="vdivider" style={{ height: 38 }} />
            <D2Hero label="Pengecualian" value={C.agg.exc} accent={C.agg.exc ? 'var(--red)' : 'var(--green)'} />
            <div style={{ flex: 1 }} />
            <div style={{ textAlign: 'right' }}>
              <div className="tiny muted upper" style={{ marginBottom: 3 }}>Sumber Data</div>
              <Badge kind="teal" dot>Kertas Kerja kanonik</Badge>
            </div>
          </div>
        </Panel>

        <div style={{ marginBottom: 12 }}><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>

        {tab === 'ikhtisar' && <D2Ikhtisar C={C} />}
        {tab === 'atribut' && <D2Atribut C={C} />}
        {tab === 'signifikan' && <D2Signifikan C={C} />}
        {tab === 'penyimpangan' && <D2Penyimpangan C={C} />}
        {tab === 'perakitan' && <D2Perakitan C={C} />}
        {tab === 'keterkaitan' && <D2Keterkaitan C={C} />}

      </div></div>
    </>
  );
}

function D2Hero({ label, value, accent }) {
  return (
    <div>
      <div className="tiny muted upper">{label}</div>
      <div className="mono" style={{ fontWeight: 700, fontSize: 13, color: accent || 'var(--ink)' }}>{value}</div>
    </div>
  );
}

/* ============================================================
   TAB 1 — Ikhtisar Dokumentasi (Uji Auditor Berpengalaman ¶8)
   ============================================================ */
function D2Ikhtisar({ C }) {
  const { agg, nav } = C;
  const ready = agg.blocking === 0;
  // tiga kriteria ¶8, masing-masing bersumber dari WP kanonik
  const crit = [
    {
      n: 'a', para: '¶8(a)', title: 'Sifat, saat & lingkup prosedur audit',
      sub: 'Termasuk kepatuhan terhadap ketentuan SA',
      pct: agg.procPct, detail: `${agg.procDone}/${agg.procTotal} langkah prosedur terdokumentasi pada ${agg.total} kertas kerja`,
    },
    {
      n: 'b', para: '¶8(b)', title: 'Hasil prosedur & bukti audit yang diperoleh',
      sub: 'Skedul utama tertaut ke buku besar (WTB) & lampiran bukti',
      pct: Math.round(agg.withLead.length / (agg.total || 1) * 100),
      detail: `${agg.withLead.length}/${agg.total} kertas kerja memuat skedul utama tertaut WTB`,
    },
    {
      n: 'c', para: '¶8(c)', title: 'Hal signifikan, kesimpulan & pertimbangan profesional',
      sub: 'Reviu tuntas & sign-off lengkap sebagai jejak kesimpulan',
      pct: agg.signPct, detail: `${agg.fullySigned}/${agg.total} kertas kerja ter-review penuh · ${agg.openNotes} catatan terbuka`,
    },
  ];

  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 340px', gap: 12, alignItems: 'start' }}>
      <div className="grid" style={{ gap: 12 }}>
        {/* uji auditor berpengalaman */}
        <Panel noBody>
          <div className="panel-h">
            <h3>Uji "Auditor Berpengalaman" (SA 230.¶8)</h3>
            <div style={{ flex: 1 }} />
            <span className="tiny muted">Apakah auditor berpengalaman, tanpa kaitan sebelumnya, dapat memahami audit ini?</span>
          </div>
          <div style={{ padding: 12, display: 'grid', gap: 10 }}>
            {crit.map(c => <D2Criterion key={c.n} {...c} />)}
          </div>
          <div style={{ padding: '10px 14px', background: 'var(--surface-2)', borderTop: '1px solid var(--line)' }}>
            <div className="row gap8" style={{ alignItems: 'flex-start' }}>
              <span style={{ color: 'var(--blue)', marginTop: 1 }}><I.book size={13} /></span>
              <span className="tiny muted" style={{ lineHeight: 1.5 }}>Dokumentasi harus cukup memungkinkan auditor berpengalaman yang tidak memiliki kaitan sebelumnya dengan audit untuk memahami sifat, saat & lingkup prosedur, hasilnya, serta hal signifikan & kesimpulan. Seluruh metrik di atas dibaca langsung dari modul Kertas Kerja.</span>
            </div>
          </div>
        </Panel>

        {/* komposisi dokumentasi per seksi */}
        <Panel title="Kelengkapan Dokumentasi per Seksi" sub="Rata-rata atribut ¶9 terpenuhi (skedul · penyusun · pereviu · prosedur · catatan)">
          <D2SectionBars rows={C.rows} />
        </Panel>
      </div>

      {/* kanan — gerbang kesiapan + pintasan */}
      <div className="grid" style={{ gap: 12 }}>
        <Panel noBody>
          <div style={{ background: ready ? 'linear-gradient(125deg,#0b5d3b,#127a4e)' : 'linear-gradient(125deg,#013a52,#005085)', color: '#fff', padding: '16px 18px' }}>
            <div className="tiny" style={{ color: '#bcd6e4', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 3 }}>Kelengkapan Dokumentasi</div>
            <div className="mono" style={{ fontSize: 34, fontWeight: 700, lineHeight: 1 }}>{agg.docPct}%</div>
            <div className="tiny" style={{ color: '#9fc0d2', marginTop: 5 }}>{ready ? 'Siap dirakit menjadi berkas final' : `${agg.blocking} hal menghambat finalisasi`}</div>
          </div>
          <div style={{ padding: '12px 16px', display: 'grid', gap: 8 }}>
            <D2Gate ok={agg.noReviewer.length === 0} label="Seluruh KK memiliki pereviu & tanggal" v={`${agg.total - agg.noReviewer.length}/${agg.total}`} />
            <D2Gate ok={agg.openNotes === 0} label="Catatan reviu tuntas" v={agg.openNotes === 0 ? 'Nihil' : agg.openNotes + ' terbuka'} />
            <D2Gate ok={agg.exc === 0} label="Pengecualian prosedur terselesaikan" v={agg.exc === 0 ? 'Nihil' : agg.exc + ' aktif'} />
            <D2Gate ok={agg.notStarted.length === 0} label="Tidak ada KK belum dimulai" v={`${agg.notStarted.length}`} />
          </div>
          <div style={{ padding: '0 14px 14px', display: 'grid', gap: 8 }}>
            <Btn variant="primary" onClick={() => nav('workpapers', { from: 'sa230' })}><I.layers size={15} /> Buka Kertas Kerja</Btn>
            <Btn onClick={() => nav('reviewnotes', { from: 'sa230' })}><I.mail size={14} /> Catatan Reviu (Clearance)</Btn>
          </div>
        </Panel>

        <Panel title="Acuan SA 230" flat>
          <div style={{ display: 'grid', gap: 7 }}>
            {[
              ['¶8', 'Bentuk, isi & lingkup dokumentasi'],
              ['¶9', 'Pembuat, pereviu, tanggal & karakteristik identifikasi'],
              ['¶10–11', 'Diskusi hal signifikan & penanganan inkonsistensi'],
              ['¶12', 'Penyimpangan dari ketentuan relevan'],
              ['¶14–16', 'Perakitan berkas final & perubahan setelahnya'],
            ].map(r => (
              <div key={r[0]} className="row gap8 ac">
                <span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)', flex: '0 0 52px' }}>{r[0]}</span>
                <span className="tiny" style={{ lineHeight: 1.35 }}>{r[1]}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function D2Criterion({ para, title, sub, pct, detail }) {
  const color = pct >= 90 ? 'var(--green)' : pct >= 60 ? 'var(--blue)' : 'var(--amber)';
  return (
    <div className="panel" style={{ padding: '11px 13px', boxShadow: 'none', borderColor: 'var(--line)' }}>
      <div className="row jb ac" style={{ marginBottom: 6 }}>
        <span className="row ac gap8">
          <span style={{ width: 22, height: 22, borderRadius: 6, background: 'var(--navy)', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 11 }} className="mono">{para.replace('¶8', '')}</span>
          <span><span style={{ fontWeight: 700, fontSize: 12.5, display: 'block' }}>{title}</span><span className="tiny muted">{sub}</span></span>
        </span>
        <span className="mono" style={{ fontWeight: 700, fontSize: 16, color }}>{pct}%</span>
      </div>
      <div className="pbar"><span style={{ width: pct + '%', background: color }} /></div>
      <div className="tiny muted" style={{ marginTop: 6 }}>{detail}</div>
    </div>
  );
}

function D2Gate({ ok, label, v }) {
  return (
    <div className="row jb ac">
      <span className="row ac gap8" style={{ minWidth: 0 }}>
        <span style={{ color: ok ? 'var(--green)' : 'var(--amber)', flex: '0 0 auto' }}>{ok ? <I.checkCircle size={15} /> : <I.alert size={15} />}</span>
        <span style={{ fontSize: 12, lineHeight: 1.3 }}>{label}</span>
      </span>
      <span className="mono tiny" style={{ fontWeight: 700, color: ok ? 'var(--green)' : 'var(--amber)', flex: '0 0 auto' }}>{v}</span>
    </div>
  );
}

function D2SectionBars({ rows }) {
  // kelompokkan menurut seksi WP
  const groups = {};
  rows.forEach(r => { (groups[r.section] = groups[r.section] || []).push(r); });
  const entries = Object.entries(groups);
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {entries.map(([sec, list]) => {
        const sumSat = list.reduce((a, r) => a + r.sat, 0);
        const pct = Math.round(sumSat / (list.length * 5) * 100);
        const color = pct >= 90 ? 'var(--green)' : pct >= 55 ? 'var(--blue)' : 'var(--amber)';
        return (
          <div key={sec}>
            <div className="row jb ac" style={{ marginBottom: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>{sec || '—'}</span>
              <span className="tiny muted"><span className="mono" style={{ fontWeight: 700, color }}>{pct}%</span> · {list.length} KK</span>
            </div>
            <div className="pbar"><span style={{ width: pct + '%', background: color }} /></div>
          </div>
        );
      })}
    </div>
  );
}

/* ============================================================
   TAB 2 — Atribut Dokumentasi (¶8–¶9)  — MATRIKS INTI
   ============================================================ */
function D2Atribut({ C }) {
  const { rows, agg, nav } = C;
  const [filter, setFilter] = useStateD2('all');
  const open = (ref) => { if (window.openCanonicalWp) window.openCanonicalWp(nav, ref); else nav('workpapers'); };

  const filters = [
    { id: 'all', label: 'Semua', n: rows.length },
    { id: 'gap', label: 'Atribut Kurang', n: rows.filter(r => r.sat < 5).length },
    { id: 'noreviewer', label: 'Tanpa Pereviu', n: agg.noReviewer.length },
    { id: 'notes', label: 'Catatan Terbuka', n: rows.filter(r => r.openNotes > 0).length },
    { id: 'exc', label: 'Pengecualian', n: rows.filter(r => r.exc > 0).length },
  ];
  const visible = rows.filter(r =>
    filter === 'all' ? true :
    filter === 'gap' ? r.sat < 5 :
    filter === 'noreviewer' ? !r.attr.reviewed :
    filter === 'notes' ? r.openNotes > 0 :
    filter === 'exc' ? r.exc > 0 : true);

  const ATTR_DEFS = [
    ['identifying', 'Karakteristik ID', 'Skedul utama tertaut ke WTB (¶9 / A12)'],
    ['procedures', 'Prosedur', 'Sifat/saat/lingkup terdokumentasi (¶8a)'],
    ['prepared', 'Penyusun', 'Pembuat & tanggal penyelesaian (¶9a)'],
    ['reviewed', 'Pereviu', 'Pereviu & tanggal reviu (¶9b)'],
    ['notesCleared', 'Catatan', 'Catatan reviu tuntas (¶10)'],
  ];

  return (
    <div className="grid" style={{ gap: 12 }}>
      <div className="row ac gap8" style={{ flexWrap: 'wrap' }}>
        {filters.map(f => (
          <button key={f.id} className={'chip' + (filter === f.id ? ' active' : '')} onClick={() => setFilter(f.id)}
            style={{ cursor: 'pointer', border: '1px solid ' + (filter === f.id ? 'var(--navy)' : 'var(--line)'), background: filter === f.id ? 'var(--navy)' : '#fff', color: filter === f.id ? '#fff' : 'var(--ink-2)', borderRadius: 7, padding: '5px 11px', fontSize: 12, fontWeight: 600 }}>
            {f.label} <span className="mono" style={{ opacity: .7 }}>{f.n}</span>
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <span className="tiny muted">Klik baris untuk buka KK kanonik · 5 atribut ¶9 per KK</span>
      </div>

      <Panel noBody>
        <table className="dtbl">
          <thead><tr>
            <th style={{ width: 46 }}>Ref</th>
            <th>Kertas Kerja</th>
            <th style={{ width: 92 }}>Status</th>
            {ATTR_DEFS.map(a => <th key={a[0]} style={{ width: 70, textAlign: 'center' }} title={a[2]}>{a[1]}</th>)}
            <th style={{ width: 88 }}>Sign-off</th>
            <th style={{ width: 74 }}>Lengkap</th>
          </tr></thead>
          <tbody>
            {visible.map(r => (
              <tr key={r.ref} style={{ cursor: 'pointer' }} onClick={() => open(r.ref)}>
                <td className="mono" style={{ fontWeight: 700, color: 'var(--blue)' }}>{r.ref}</td>
                <td>
                  <div style={{ fontWeight: 600, fontSize: 12 }}>{r.title}</div>
                  <div className="tiny muted">{r.section}{r.relRisks.length > 0 && <span> · <span style={{ color: 'var(--purple)' }}>{r.relRisks.length} risiko</span></span>}</div>
                </td>
                <td><Badge kind={r.status === 'Reviewed' ? 'green' : r.status === 'In Review' ? 'blue' : r.status === 'In Progress' ? 'amber' : 'gray'}>{r.status}</Badge></td>
                {ATTR_DEFS.map(a => (
                  <td key={a[0]} style={{ textAlign: 'center' }}>
                    {a[0] === 'notesCleared' && r.openNotes > 0
                      ? <span title={r.openNotes + ' catatan terbuka'}><Badge kind="amber">{r.openNotes}</Badge></span>
                      : a[0] === 'procedures' && r.exc > 0
                      ? <span title={r.exc + ' pengecualian'} style={{ color: 'var(--red)', display: 'inline-flex' }}><I.alert size={14} /></span>
                      : <D2Tick ok={r.attr[a[0]]} />}
                  </td>
                ))}
                <td onClick={(e) => e.stopPropagation()}>{window.SignoffDots ? <SignoffDots signoff={r.signoff} /> : null}</td>
                <td>
                  <div className="row ac gap6">
                    <div className="pbar" style={{ flex: 1 }}><span style={{ width: r.attrPct + '%', background: r.attrPct === 100 ? 'var(--green)' : r.attrPct >= 60 ? 'var(--blue)' : 'var(--amber)' }} /></div>
                    <span className="mono tiny" style={{ flex: '0 0 26px', textAlign: 'right', fontWeight: 700 }}>{r.sat}/5</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3}>AGREGAT — {agg.total} KERTAS KERJA</td>
              <td colSpan={5} style={{ textAlign: 'center' }} className="tiny muted">{agg.docPct}% rata-rata atribut terpenuhi</td>
              <td></td>
              <td className="mono" style={{ fontWeight: 700 }}>{agg.docPct}%</td>
            </tr>
          </tfoot>
        </table>
      </Panel>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(5,1fr)', gap: 10 }}>
        {ATTR_DEFS.map(a => {
          const ok = rows.filter(r => r.attr[a[0]]).length;
          const pct = Math.round(ok / (rows.length || 1) * 100);
          return (
            <Panel key={a[0]}><div style={{ padding: '11px 13px' }}>
              <div className="tiny muted upper" style={{ marginBottom: 2 }}>{a[1]}</div>
              <div className="row jb ac"><span className="mono" style={{ fontSize: 19, fontWeight: 700 }}>{ok}<span className="muted" style={{ fontSize: 13 }}>/{rows.length}</span></span><span className="mono tiny" style={{ fontWeight: 700, color: pct === 100 ? 'var(--green)' : 'var(--amber)' }}>{pct}%</span></div>
              <div className="tiny muted" style={{ marginTop: 3, lineHeight: 1.3 }}>{a[2]}</div>
            </div></Panel>
          );
        })}
      </div>
    </div>
  );
}

function D2Tick({ ok }) {
  return ok
    ? <span style={{ color: 'var(--green)', display: 'inline-flex' }}><I.check size={15} /></span>
    : <span style={{ color: 'var(--ink-4)', fontWeight: 700 }}>—</span>;
}

/* ============================================================
   TAB 3 — Hal Signifikan & Pertimbangan Profesional (¶8c, ¶10)
   ============================================================ */
function D2Signifikan({ C }) {
  const { rows, audit, nav } = C;
  const fmt = AMS.fmt;
  const risks = (audit.risks || []).filter(r => r.inherent === 'Significant');
  const leadStatus = (wp) => {
    const lead = (wp || '').split('-')[0];
    const r = rows.find(x => x.ref === lead);
    return r ? r : null;
  };
  // catatan reviu (¶10 — diskusi hal signifikan)
  const notes = (window.collectWpNotes ? window.collectWpNotes(audit.wpState || {}) : []).filter(n => n.status === 'open');
  const excRows = rows.filter(r => r.exc > 0);

  // materialitas — basis pertimbangan (AMS_CANON)
  const eng = (C.firm && C.firm.activeEngagement) || {};
  const mat = (AMS_CANON && AMS_CANON.materiality)
    ? AMS_CANON.materiality({ engMateriality: eng.materiality }) : null;

  const judgments = [
    { area: 'Materialitas', ref: 'SA 320', mod: 'materiality', t: mat ? `Overall materiality Rp ${fmt(mat.omFull / 1e6, 0)} jt; performance Rp ${fmt(mat.pmFull / 1e6, 0)} jt` : 'Penetapan benchmark & materialitas kinerja', basis: 'Ditarik dari Materiality Workspace (kanonik)' },
    { area: 'Estimasi ECL (PSAK 71)', ref: 'SA 540', mod: 'ecl', t: 'Asumsi PD/LGD & overlay makro forward-looking dinilai dalam rentang yang dapat diterima', basis: 'Re-perform model · WP B' },
    { area: 'Pengakuan Pendapatan', ref: 'SA 240/315', mod: 'sa240', t: 'Asumsi risiko kecurangan pendapatan; cut-off diperluas atas indikasi channel stuffing', basis: 'Register risiko · WP R' },
    { area: 'Override Manajemen', ref: 'SA 240', mod: 'jet', t: 'Jurnal manual non-standar diuji berbasis kriteria risiko (JET)', basis: 'Journal Entry Testing' },
  ];

  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 340px', gap: 12, alignItems: 'start' }}>
      <div className="grid" style={{ gap: 12 }}>
        <Panel noBody>
          <div className="panel-h"><h3>Register Hal Signifikan</h3><div style={{ flex: 1 }} /><span className="tiny muted">Risiko signifikan (RoMM) → tempat & status dokumentasi</span></div>
          <table className="dtbl">
            <thead><tr><th style={{ width: 52 }}>Risiko</th><th>Hal Signifikan</th><th style={{ width: 86 }}>KK</th><th style={{ width: 104 }}>Status Doc.</th><th style={{ width: 64, textAlign: 'center' }}>Catatan</th></tr></thead>
            <tbody>
              {risks.map(rk => {
                const ls = leadStatus(rk.wp);
                return (
                  <tr key={rk.id} style={{ cursor: ls ? 'pointer' : 'default' }} onClick={() => ls && window.openCanonicalWp && window.openCanonicalWp(nav, ls.ref)}>
                    <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)', verticalAlign: 'top', paddingTop: 8 }}>
                      {rk.id}{rk.fraud && <div><Badge kind="red">Fraud</Badge></div>}
                    </td>
                    <td style={{ maxWidth: 300, whiteSpace: 'normal', lineHeight: 1.35, padding: '7px 9px' }}>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{rk.area}</span>
                      <div className="tiny muted" style={{ marginTop: 1 }}>{rk.desc}</div>
                      <div className="tiny" style={{ marginTop: 3, color: 'var(--ink-3)' }}><b>Respons:</b> {rk.response}</div>
                    </td>
                    <td className="mono tiny" style={{ verticalAlign: 'top', paddingTop: 8, fontWeight: 700, color: 'var(--blue)' }}>{rk.wp}{ls && <div className="tiny muted" style={{ fontWeight: 400 }}>{ls.title}</div>}</td>
                    <td style={{ verticalAlign: 'top', paddingTop: 7 }}>{ls ? <Badge kind={ls.status === 'Reviewed' ? 'green' : ls.status === 'In Review' ? 'blue' : ls.status === 'In Progress' ? 'amber' : 'gray'}>{ls.status}</Badge> : <Badge kind="gray">—</Badge>}</td>
                    <td style={{ textAlign: 'center', verticalAlign: 'top', paddingTop: 7 }}>{ls && ls.openNotes > 0 ? <Badge kind="amber">{ls.openNotes}</Badge> : <span className="muted tiny">—</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{ padding: '9px 14px', background: 'var(--surface-2)', borderTop: '1px solid var(--line)' }}>
            <span className="tiny muted" style={{ lineHeight: 1.45 }}>SA 230.¶8(c)/¶A8 — hal signifikan, pertimbangan profesional & kesimpulan harus terdokumentasi. Daftar risiko & status KK ditarik dari Risk Assessment + Kertas Kerja kanonik.</span>
          </div>
        </Panel>

        {/* pertimbangan profesional */}
        <Panel title="Log Pertimbangan Profesional Signifikan" sub="SA 230.¶8(c) — basis pertimbangan ditarik dari modul kanonik">
          <div style={{ display: 'grid', gap: 8 }}>
            {judgments.map((j, i) => (
              <div key={i} className="panel row jb ac" style={{ padding: '10px 12px', boxShadow: 'none', gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <div className="row ac gap8" style={{ marginBottom: 2 }}><span style={{ fontSize: 12.5, fontWeight: 700 }}>{j.area}</span><Badge kind="blue">{j.ref}</Badge></div>
                  <div className="tiny" style={{ lineHeight: 1.4 }}>{j.t}</div>
                  <div className="tiny muted" style={{ marginTop: 2 }}>{j.basis}</div>
                </div>
                <button className="btn sm icon" title="Buka modul" onClick={() => nav(j.mod, { from: 'sa230' })}><I.arrowRight size={13} /></button>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* kanan — diskusi & pengecualian */}
      <div className="grid" style={{ gap: 12 }}>
        <Panel noBody>
          <div style={{ background: 'linear-gradient(125deg,#013a52,#005085)', color: '#fff', padding: '14px 16px' }}>
            <div className="tiny" style={{ color: '#bcd6e4', textTransform: 'uppercase', letterSpacing: '.08em' }}>Hal Signifikan Aktif</div>
            <div className="mono" style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.1 }}>{risks.length}</div>
            <div className="tiny" style={{ color: '#9fc0d2', marginTop: 4 }}>{risks.filter(r => r.fraud).length} terkait kecurangan</div>
          </div>
          <div style={{ padding: '12px 14px', display: 'grid', gap: 7 }}>
            <div className="row jb ac"><span className="tiny">Catatan reviu terbuka (¶10)</span><span className="mono" style={{ fontWeight: 700, color: notes.length ? 'var(--amber)' : 'var(--green)' }}>{notes.length}</span></div>
            <div className="row jb ac"><span className="tiny">Pengecualian terdokumentasi</span><span className="mono" style={{ fontWeight: 700, color: excRows.length ? 'var(--red)' : 'var(--green)' }}>{excRows.reduce((a, r) => a + r.exc, 0)}</span></div>
          </div>
        </Panel>

        <Panel title="Diskusi Hal Signifikan (¶10)" sub="Catatan reviu terbuka — sumber tunggal">
          <div style={{ display: 'grid', gap: 8 }}>
            {notes.slice(0, 6).map((n, i) => (
              <div key={i} className="panel" style={{ padding: '9px 11px', boxShadow: 'none' }}>
                <div className="row jb ac" style={{ marginBottom: 3 }}>
                  <span className="row ac gap6"><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{n.wpRef}</span><span className="tiny muted">{n.author} → {n.to}</span></span>
                  {n.priority && <Badge kind={n.priority === 'high' ? 'red' : n.priority === 'medium' ? 'amber' : 'gray'}>{n.priority}</Badge>}
                </div>
                <div className="tiny" style={{ lineHeight: 1.4 }}>{n.text}</div>
              </div>
            ))}
            {notes.length === 0 && <div className="tiny muted" style={{ textAlign: 'center', padding: 14 }}>Tidak ada catatan reviu terbuka.</div>}
            <Btn sm onClick={() => nav('reviewnotes', { from: 'sa230' })}><I.arrowRight size={13} /> Buka semua catatan</Btn>
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ============================================================
   TAB 4 — Penyimpangan & Inkonsistensi (¶11–¶13)
   ============================================================ */
function D2Penyimpangan({ C }) {
  const { rows, nav } = C;
  const excRows = rows.filter(r => r.exc > 0);

  // ¶11 — inkonsistensi: pengecualian prosedur yang perlu rekonsiliasi dengan kesimpulan
  const inkonsistensi = excRows.map(r => ({
    ref: r.ref, title: r.title,
    t: `${r.exc} pengecualian prosedur — wajib direkonsiliasi dengan kesimpulan akhir KK & dampaknya ke SAD (SA 450).`,
    status: r.openNotes > 0 ? 'Dalam Penanganan' : 'Terdokumentasi', kind: r.openNotes > 0 ? 'amber' : 'blue',
  }));

  const cards = [
    {
      ref: '¶11', icon: 'link2', title: 'Inkonsistensi dengan Kesimpulan Akhir',
      desc: 'Bila informasi tidak konsisten dengan kesimpulan akhir mengenai hal signifikan, dokumentasikan bagaimana ketidaksesuaian itu ditangani.',
      body: inkonsistensi.length
        ? <D2DepTable items={inkonsistensi} onOpen={(ref) => window.openCanonicalWp && window.openCanonicalWp(nav, ref)} />
        : <D2Empty text="Tidak ada bukti yang bertentangan dengan kesimpulan akhir. Seluruh pengecualian telah direkonsiliasi & ditindaklanjuti ke SAD Ledger." />,
    },
    {
      ref: '¶12 / A18–A19', icon: 'gavel', title: 'Penyimpangan dari Ketentuan Relevan SA',
      desc: 'Bila auditor menyimpang dari suatu ketentuan relevan, dokumentasikan prosedur alternatif yang dilakukan & alasan penyimpangan.',
      body: <D2Empty text="Nihil — tidak ada penyimpangan dari ketentuan relevan SA pada periode berjalan. Seluruh ketentuan yang relevan dengan keadaan terpenuhi." ok />,
    },
    {
      ref: '¶13 / A20', icon: 'clock', title: 'Hal yang Timbul Setelah Tanggal Laporan',
      desc: 'Prosedur audit baru/bukti baru/kesimpulan baru setelah tanggal laporan auditor harus didokumentasikan: kapan, oleh & direviu siapa, serta alasannya.',
      body: <D2Empty text={`Belum berlaku — tanggal laporan terencana ${d2fmtDate(D2_REPORT_DATE)} belum tercapai. Kanal perubahan setelah tanggal laporan aktif setelah opini ditandatangani.`} />,
    },
  ];

  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 320px', gap: 12, alignItems: 'start' }}>
      <div className="grid" style={{ gap: 12 }}>
        {cards.map(c => {
          const CIcon = I[c.icon] || I.book;
          return (
          <Panel key={c.ref} noBody>
            <div className="panel-h">
              <span className="row ac gap8"><span style={{ color: 'var(--blue)' }}><CIcon size={15} /></span><h3 style={{ margin: 0 }}>{c.title}</h3></span>
              <div style={{ flex: 1 }} />
              <Badge kind="blue">{c.ref}</Badge>
            </div>
            <div style={{ padding: '11px 14px' }}>
              <div className="tiny muted" style={{ lineHeight: 1.5, marginBottom: 10 }}>{c.desc}</div>
              {c.body}
            </div>
          </Panel>
          );
        })}
      </div>

      <div className="grid" style={{ gap: 12 }}>
        <Panel noBody>
          <div style={{ background: excRows.length ? 'linear-gradient(125deg,#013a52,#005085)' : 'linear-gradient(125deg,#0b5d3b,#127a4e)', color: '#fff', padding: '14px 16px' }}>
            <div className="tiny" style={{ color: '#bcd6e4', textTransform: 'uppercase', letterSpacing: '.08em' }}>Inkonsistensi Aktif</div>
            <div className="mono" style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.1 }}>{inkonsistensi.length}</div>
            <div className="tiny" style={{ color: '#9fc0d2', marginTop: 4 }}>{excRows.reduce((a, r) => a + r.exc, 0)} pengecualian prosedur</div>
          </div>
          <div style={{ padding: '12px 14px', display: 'grid', gap: 8 }}>
            <D2Gate ok={true} label="Penyimpangan ketentuan SA" v="Nihil" />
            <D2Gate ok={inkonsistensi.every(i => i.kind !== 'amber')} label="Inkonsistensi tertangani" v={inkonsistensi.filter(i => i.kind === 'amber').length === 0 ? 'Ya' : 'Sebagian'} />
            <D2Gate ok={true} label="Perubahan pasca-laporan" v="Belum berlaku" />
          </div>
          <div style={{ padding: '0 14px 14px' }}>
            <Btn sm onClick={() => nav('sad', { from: 'sa230' })} style={{ width: '100%' }}><I.scale size={13} /> SAD Ledger (SA 450)</Btn>
          </div>
        </Panel>

        <Panel title="Disiplin Dokumentasi" flat>
          <div className="tiny" style={{ lineHeight: 1.6, color: 'var(--ink-2)' }}>
            Setiap penyimpangan, inkonsistensi, atau perubahan setelah tanggal laporan harus menyebut <b>siapa</b> membuat & mereviu, <b>kapan</b>, serta <b>alasannya</b>. Tidak ada penghapusan dokumentasi sebelum periode retensi berakhir (¶15).
          </div>
        </Panel>
      </div>
    </div>
  );
}

function D2DepTable({ items, onOpen }) {
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {items.map(it => (
        <div key={it.ref} className="panel row jb ac" style={{ padding: '9px 11px', boxShadow: 'none', gap: 10, borderColor: it.kind === 'amber' ? 'var(--amber)' : 'var(--line)' }}>
          <div style={{ minWidth: 0 }}>
            <div className="row ac gap8" style={{ marginBottom: 2 }}><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>KK {it.ref}</span><span style={{ fontSize: 12, fontWeight: 600 }}>{it.title}</span></div>
            <div className="tiny muted" style={{ lineHeight: 1.4 }}>{it.t}</div>
          </div>
          <div className="row ac gap8" style={{ flex: '0 0 auto' }}>
            <Badge kind={it.kind}>{it.status}</Badge>
            <button className="btn sm icon" onClick={() => onOpen(it.ref)}><I.arrowRight size={13} /></button>
          </div>
        </div>
      ))}
    </div>
  );
}

function D2Empty({ text, ok }) {
  return (
    <div className="panel" style={{ padding: '11px 13px', boxShadow: 'none', background: ok ? 'var(--green-bg)' : 'var(--surface-2)', borderColor: 'transparent' }}>
      <div className="row gap8" style={{ alignItems: 'flex-start' }}>
        <span style={{ color: ok ? 'var(--green)' : 'var(--ink-4)', marginTop: 1 }}>{ok ? <I.checkCircle size={15} /> : <I.book size={15} />}</span>
        <span className="tiny" style={{ lineHeight: 1.5, color: 'var(--ink-2)' }}>{text}</span>
      </div>
    </div>
  );
}

/* ============================================================
   TAB 5 — Perakitan Berkas Final & Retensi (¶14–¶16)
   ============================================================ */
function D2Perakitan({ C }) {
  const { agg, nav } = C;
  const reportDate = D2_REPORT_DATE;
  const assemblyDue = d2addDays(reportDate, D2_ASSEMBLY_DAYS);
  const retentionUntil = d2addYears(reportDate, D2_RETENTION_YEARS);
  const daysToReport = Math.round((reportDate - D2_REF) / 864e5);
  const daysToAssembly = Math.round((assemblyDue - D2_REF) / 864e5);
  const preReport = daysToReport > 0;
  // kelengkapan berkas = % atribut dokumentasi (SSOT)
  const filePct = agg.docPct;

  // ¶16 — perubahan setelah perakitan (kanonik di DMS; periode berjalan: belum dirakit)
  const postAssembly = []; // belum ada — berkas belum dirakit

  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 340px', gap: 12, alignItems: 'start' }}>
      <div className="grid" style={{ gap: 12 }}>
        {/* lini masa perakitan */}
        <Panel noBody>
          <div className="panel-h"><h3>Lini Masa Perakitan Berkas Final</h3><div style={{ flex: 1 }} /><Badge kind="blue">SA 230 ¶14 · ¶A21</Badge></div>
          <div style={{ padding: '16px 18px' }}>
            <D2Timeline
              points={[
                { lbl: 'Tanggal Laporan', date: reportDate, k: 'navy', sub: 'Opini ditandatangani' },
                { lbl: 'Batas Perakitan', date: assemblyDue, k: 'amber', sub: `≤ ${D2_ASSEMBLY_DAYS} hari (¶A21)` },
                { lbl: 'Akhir Retensi', date: retentionUntil, k: 'green', sub: `${D2_RETENTION_YEARS} tahun` },
              ]}
            />
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 18 }}>
              <D2Mini label="Status Perakitan" value={preReport ? 'Pra-laporan' : daysToAssembly >= 0 ? 'Dalam Jendela' : 'Lewat Tenggat'} accent={preReport ? 'var(--blue)' : daysToAssembly >= 0 ? 'var(--amber)' : 'var(--red)'} />
              <D2Mini label="Tenggat Perakitan" value={d2fmtDate(assemblyDue)} />
              <D2Mini label={preReport ? 'Menuju Tgl Laporan' : 'Sisa Hari Perakitan'} value={(preReport ? daysToReport : daysToAssembly) + ' hari'} accent={!preReport && daysToAssembly < 14 ? 'var(--red)' : 'var(--ink)'} />
            </div>
            <div className="panel" style={{ marginTop: 14, padding: '10px 12px', background: 'var(--surface-2)', borderColor: 'var(--line)', boxShadow: 'none' }}>
              <div className="row jb ac" style={{ marginBottom: 6 }}>
                <span className="tiny" style={{ fontWeight: 600 }}>Kelengkapan berkas untuk perakitan</span>
                <span className="mono tiny" style={{ fontWeight: 700, color: filePct === 100 ? 'var(--green)' : 'var(--amber)' }}>{filePct}%</span>
              </div>
              <div className="pbar"><span style={{ width: filePct + '%', background: filePct === 100 ? 'var(--green)' : 'var(--blue)' }} /></div>
              <div className="tiny muted" style={{ marginTop: 6, lineHeight: 1.45 }}>Perakitan bersifat administratif (tanpa prosedur audit baru). {agg.blocking > 0 ? <span style={{ color: 'var(--amber)' }}>{agg.blocking} hal masih menghambat finalisasi — selesaikan sebelum mengunci berkas.</span> : 'Tidak ada hal yang menghambat — berkas siap dirakit & dikunci.'}</div>
            </div>
          </div>
        </Panel>

        {/* perubahan setelah perakitan ¶16 */}
        <Panel noBody>
          <div className="panel-h"><span className="row ac gap8"><span style={{ color: 'var(--blue)' }}><I.lock size={14} /></span><h3 style={{ margin: 0 }}>Perubahan Setelah Perakitan (¶16)</h3></span><div style={{ flex: 1 }} /><Btn sm onClick={() => nav('dms', { from: 'sa230' })}><I.arrowRight size={13} /> Riwayat di DMS</Btn></div>
          <div style={{ padding: '11px 14px' }}>
            {postAssembly.length === 0
              ? <D2Empty text="Berkas final perikatan ini belum dirakit — belum ada perubahan pasca-perakitan. Setelah berkas dikunci, setiap penambahan/perubahan dicatat dengan siapa, kapan & alasannya, serta tidak ada dokumentasi yang dihapus sebelum akhir retensi (¶15)." />
              : null}
            <div className="tiny muted" style={{ marginTop: 10, lineHeight: 1.5 }}>Riwayat versi & log akses berkas final dikelola di modul <b>Manajemen Dokumen (DMS)</b> sebagai sumber kanonik — termasuk checksum SHA-256 & imutabilitas WORM.</div>
          </div>
        </Panel>
      </div>

      {/* kanan — retensi, kepemilikan, kerahasiaan */}
      <div className="grid" style={{ gap: 12 }}>
        <Panel noBody>
          <div style={{ background: 'linear-gradient(125deg,#013a52,#005085)', color: '#fff', padding: '16px 18px' }}>
            <div className="tiny" style={{ color: '#bcd6e4', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 3 }}>Periode Retensi</div>
            <div className="mono" style={{ fontSize: 30, fontWeight: 700, lineHeight: 1 }}>{D2_RETENTION_YEARS} tahun</div>
            <div className="tiny" style={{ color: '#9fc0d2', marginTop: 5 }}>s.d. {d2fmtDate(retentionUntil)}</div>
          </div>
          <div style={{ padding: '12px 16px', display: 'grid', gap: 8 }}>
            <D2KV label="Mulai retensi" v={d2fmtDate(reportDate)} />
            <D2KV label="Dasar kebijakan" v="SPM 1 / Pengaturan Firma" />
            <D2KV label="Format arsip" v="Elektronik · AES-256" />
          </div>
        </Panel>

        <Panel title="Kepemilikan & Kerahasiaan" sub="SPM 1 / SA 230 ¶A23">
          <div style={{ display: 'grid', gap: 8 }}>
            <D2Doc icon="shield" t="Kepemilikan berkas" d="Dokumentasi audit adalah milik firma (KAP)." />
            <D2Doc icon="lock" t="Kerahasiaan" d="Akses dibatasi & terenkripsi; setiap akses tercatat dalam jejak audit." />
            <D2Doc icon="check" t="Imutabilitas (WORM)" d="Berkas final dikunci write-once; perubahan/penghapusan diblokir." />
            <D2Doc icon="hourglass" t="Legal hold" d="Penahanan retensi otomatis saat ada sengketa/litigasi." />
          </div>
        </Panel>

        <Panel title="Acuan Perakitan" flat>
          <div className="tiny" style={{ lineHeight: 1.6, color: 'var(--ink-2)' }}>
            SA 230 ¶14 & ¶A21 — perakitan berkas audit final diselesaikan tepat waktu, umumnya <b>tidak lebih dari 60 hari</b> setelah tanggal laporan auditor. Setelah perakitan, dokumentasi tidak boleh dihapus sebelum akhir periode retensi (¶15).
          </div>
        </Panel>
      </div>
    </div>
  );
}

function D2Timeline({ points }) {
  return (
    <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', padding: '0 4px' }}>
      <div style={{ position: 'absolute', left: 28, right: 28, top: 9, height: 2, background: 'var(--line-strong)' }} />
      {points.map((p, i) => (
        <div key={i} style={{ position: 'relative', textAlign: 'center', flex: 1 }}>
          <div style={{ width: 18, height: 18, borderRadius: '50%', background: `var(--${p.k})`, margin: '0 auto', border: '3px solid #fff', boxShadow: '0 0 0 1px var(--line-strong)' }} />
          <div className="tiny" style={{ fontWeight: 700, marginTop: 7 }}>{p.lbl}</div>
          <div className="mono tiny" style={{ color: 'var(--ink-2)' }}>{d2fmtDate(p.date)}</div>
          <div className="tiny muted">{p.sub}</div>
        </div>
      ))}
    </div>
  );
}

function D2Mini({ label, value, accent }) {
  return (
    <div className="panel" style={{ padding: '10px 12px', boxShadow: 'none' }}>
      <div className="tiny muted upper" style={{ marginBottom: 2 }}>{label}</div>
      <div className="mono" style={{ fontWeight: 700, fontSize: 14, color: accent || 'var(--ink)' }}>{value}</div>
    </div>
  );
}

function D2KV({ label, v }) {
  return <div className="row jb ac"><span className="tiny muted">{label}</span><span className="mono tiny" style={{ fontWeight: 700 }}>{v}</span></div>;
}

function D2Doc({ icon, t, d }) {
  const DIcon = I[icon] || I.book;
  return (
    <div className="row gap8" style={{ alignItems: 'flex-start' }}>
      <span style={{ color: 'var(--blue)', flex: '0 0 auto', marginTop: 1 }}><DIcon size={14} /></span>
      <div><div style={{ fontSize: 12, fontWeight: 600 }}>{t}</div><div className="tiny muted" style={{ lineHeight: 1.4 }}>{d}</div></div>
    </div>
  );
}

/* ============================================================
   TAB 6 — Keterkaitan Modul (Jaring Dokumentasi)
   SA 230 sebagai hub dokumentasi: HULU memberi materi yang wajib
   didokumentasikan; HILIR memakai dokumentasi sebagai bukti
   kelengkapan, dasar telaah mutu & opini. Status tiap tautan
   ditarik dari sumber kanonik yang sama (tanpa salinan privat).
   ============================================================ */
function D2Keterkaitan({ C }) {
  const { rows, agg, audit, nav } = C;
  const fmt = AMS.fmt;
  const open = (id) => nav(id, { from: 'sa230' });

  // hal signifikan terdokumentasi (lead WP ada & ≥ in-review)
  const sig = (audit.risks || []).filter(r => r.inherent === 'Significant');
  const leadOf = (wp) => rows.find(x => x.ref === (wp || '').split('-')[0]);
  const sigDoc = sig.filter(r => { const l = leadOf(r.wp); return l && l.status !== 'Not Started'; }).length;

  // materialitas (basis pertimbangan) dari canon
  const eng = (C.firm && C.firm.activeEngagement) || {};
  const mat = (AMS_CANON && AMS_CANON.materiality)
    ? AMS_CANON.materiality({ engMateriality: eng.materiality }) : null;

  const ready = agg.blocking === 0;
  const stamp = (ok, warn) => ok ? 'var(--green)' : (warn ? 'var(--amber)' : 'var(--blue)');

  const up = [
    { id: 'workpapers', ic: 'layers', lbl: 'Working Papers', para: '¶8(a–b)',
      art: 'Sifat, saat & lingkup prosedur + hasilnya',
      val: `${agg.fullySigned}/${agg.total} KK ter-review`, pct: agg.signPct, c: stamp(agg.signPct === 100, agg.signPct < 100),
      rel: 'Setiap kertas kerja adalah unit dokumentasi — basis seluruh metrik ¶9.' },
    { id: 'risk', ic: 'shield', lbl: 'Risk Assessment', para: '¶8(c)',
      art: 'Hal signifikan & RoMM',
      val: `${sigDoc}/${sig.length} risiko terdok.`, pct: sig.length ? Math.round(sigDoc / sig.length * 100) : 100, c: stamp(sigDoc === sig.length, sigDoc < sig.length),
      rel: 'Risiko signifikan menentukan apa yang wajib didokumentasikan & disimpulkan.' },
    { id: 'materiality', ic: 'target', lbl: 'Materiality', para: '¶8(c)',
      art: 'Basis pertimbangan profesional',
      val: mat ? `OM Rp ${fmt(mat.omFull / 1e6, 0)} jt` : 'Ditetapkan', pct: 100, c: 'var(--green)',
      rel: 'Ambang materialitas menjadi dasar kesimpulan & pertimbangan profesional.' },
    { id: 'reviewnotes', ic: 'mail', lbl: 'Review Notes', para: '¶9(c)/¶10',
      art: 'Diskusi hal signifikan & clearance',
      val: agg.openNotes ? `${agg.openNotes} terbuka` : 'Tuntas', pct: agg.openNotes ? Math.max(10, 100 - agg.openNotes * 12) : 100, c: stamp(agg.openNotes === 0, agg.openNotes > 0),
      rel: 'Catatan reviu tuntas = jejak siapa mereviu, kapan & resolusi hal signifikan.' },
    { id: 'evidence', ic: 'search2', lbl: 'Evaluasi Bukti', para: '¶8(b) · SA 500',
      art: 'Bukti audit yang diperoleh',
      val: `${agg.withLead.length}/${agg.total} tertaut WTB`, pct: Math.round(agg.withLead.length / (agg.total || 1) * 100), c: stamp(agg.withLead.length === agg.total, true),
      rel: 'Bukti per asersi & skedul utama tertaut WTB membentuk isi dokumentasi.' },
  ];

  const exc = agg.exc;
  const down = [
    { id: 'dms', ic: 'archive', lbl: 'Manajemen Dokumen', para: '¶14–16',
      art: 'Perakitan berkas final & retensi',
      val: `${agg.docPct}% siap rakit`, pct: agg.docPct, c: stamp(agg.docPct === 100, agg.docPct < 100),
      rel: 'Berkas final dirakit ≤60 hari, dikunci WORM, retensi 10 tahun (kanonik di DMS).' },
    { id: 'eqr', ic: 'checkCircle', lbl: 'EQR Workflow', para: 'SA 220 / ISQM 1',
      art: 'Telaah mutu perikatan',
      val: ready ? 'Siap ditelaah' : `${agg.blocking} penghambat`, pct: ready ? 100 : Math.max(10, agg.docPct), c: stamp(ready, !ready),
      rel: 'Pereviu mutu menelaah kecukupan dokumentasi sebelum opini diterbitkan.' },
    { id: 'sad', ic: 'scale', lbl: 'SAD Ledger', para: '¶11 · SA 450',
      art: 'Inkonsistensi & pengecualian',
      val: exc ? `${exc} pengecualian` : 'Nihil', pct: exc ? 60 : 100, c: stamp(exc === 0, exc > 0),
      rel: 'Pengecualian/inkonsistensi prosedur mengalir ke akumulasi salah saji (SA 450).' },
    { id: 'opinion', ic: 'gavel', lbl: 'Audit Opinion', para: 'SA 700',
      art: 'Dasar kesimpulan & opini',
      val: ready ? 'Fondasi lengkap' : 'Menunggu finalisasi', pct: ready ? 100 : agg.docPct, c: stamp(ready, !ready),
      rel: 'Dokumentasi memadai adalah fondasi kesimpulan & opini auditor.' },
    { id: 'audittrail', ic: 'lock', lbl: 'Audit Trail', para: '¶16',
      art: 'Jejak akses & perubahan',
      val: 'Tamper-evident', pct: 100, c: 'var(--green)',
      rel: 'Perubahan pasca-perakitan tercatat permanen — siapa, kapan & alasannya.' },
  ];

  return (
    <div className="grid" style={{ gap: 12 }}>
      <Panel noBody>
        <div className="panel-h">
          <span className="row ac gap8"><span style={{ color: 'var(--blue)' }}><I.link2 size={15} /></span><h3 style={{ margin: 0 }}>Jaring Dokumentasi — SA 230 sebagai Hub</h3></span>
          <div style={{ flex: 1 }} />
          <span className="tiny muted">Status tiap tautan ditarik dari modul kanonik · klik untuk membuka</span>
        </div>

        <div className="d2net">
          {/* HULU */}
          <div className="d2net-col">
            <div className="d2net-colh up"><span className="mono">↓</span> Hulu · memberi materi dokumentasi</div>
            {up.map(m => <D2LinkCard key={m.id} m={m} dir="up" onOpen={open} />)}
          </div>

          {/* HUB */}
          <div className="d2net-hub">
            <div className="d2net-node">
              <div className="tiny" style={{ color: '#bcd6e4', textTransform: 'uppercase', letterSpacing: '.08em' }}>Standar Audit</div>
              <div className="mono" style={{ fontSize: 30, fontWeight: 700, lineHeight: 1, marginTop: 2 }}>230</div>
              <div className="tiny" style={{ color: '#cfe0ea', marginTop: 4, fontWeight: 600 }}>Dokumentasi Audit</div>
              <div style={{ height: 1, background: 'rgba(255,255,255,.18)', margin: '11px 0' }} />
              <div className="mono" style={{ fontSize: 22, fontWeight: 700, lineHeight: 1, color: ready ? '#7ee2b0' : '#ffd27a' }}>{agg.docPct}%</div>
              <div className="tiny" style={{ color: '#9fc0d2', marginTop: 2 }}>kelengkapan dokumentasi</div>
            </div>
            <div className="d2net-flow tiny muted">Hulu menetapkan <b>apa</b> yang didokumentasikan; Hilir memakai dokumentasi sebagai <b>bukti</b> kelengkapan & dasar opini.</div>
          </div>

          {/* HILIR */}
          <div className="d2net-col">
            <div className="d2net-colh down"><span className="mono">↓</span> Hilir · memakai dokumentasi</div>
            {down.map(m => <D2LinkCard key={m.id} m={m} dir="down" onOpen={open} />)}
          </div>
        </div>

        <div style={{ padding: '10px 14px', background: 'var(--surface-2)', borderTop: '1px solid var(--line)' }}>
          <div className="row gap8" style={{ alignItems: 'flex-start' }}>
            <span style={{ color: 'var(--blue)', marginTop: 1 }}><I.book size={13} /></span>
            <span className="tiny muted" style={{ lineHeight: 1.5 }}>SA 230 tidak menyimpan salinan privat — seluruh status di atas dibaca langsung dari Kertas Kerja, Risk Assessment, Materiality, Review Notes & DMS. Dock <b>Keterkaitan Modul</b> di bawah halaman menampilkan peta hulu–hilir yang sama.</span>
          </div>
        </div>
      </Panel>

      {/* matriks ketertelusuran paragraf → modul */}
      <Panel title="Ketertelusuran Paragraf SA 230 → Modul" sub="Tiap ketentuan dokumentasi dipetakan ke modul tempat ia dipenuhi & dibuktikan">
        <table className="dtbl">
          <thead><tr>
            <th style={{ width: 92 }}>Paragraf</th>
            <th>Ketentuan</th>
            <th style={{ width: 200 }}>Dipenuhi di Modul</th>
            <th style={{ width: 120 }}>Status</th>
            <th style={{ width: 44 }}></th>
          </tr></thead>
          <tbody>
            {[
              { p: '¶8(a)', t: 'Sifat, saat & lingkup prosedur audit', mid: 'workpapers', v: `${agg.procPct}%`, ok: agg.procPct === 100 },
              { p: '¶8(b)', t: 'Hasil prosedur & bukti audit yang diperoleh', mid: 'evidence', v: `${agg.withLead.length}/${agg.total}`, ok: agg.withLead.length === agg.total },
              { p: '¶8(c)', t: 'Hal signifikan, kesimpulan & pertimbangan profesional', mid: 'risk', v: `${sigDoc}/${sig.length}`, ok: sigDoc === sig.length },
              { p: '¶9(a–b)', t: 'Pembuat, pereviu, tanggal & karakteristik identifikasi', mid: 'workpapers', v: `${agg.total - agg.noReviewer.length}/${agg.total}`, ok: agg.noReviewer.length === 0 },
              { p: '¶10', t: 'Diskusi hal signifikan & resolusinya', mid: 'reviewnotes', v: agg.openNotes ? `${agg.openNotes} terbuka` : 'Tuntas', ok: agg.openNotes === 0 },
              { p: '¶11', t: 'Penanganan inkonsistensi dengan kesimpulan', mid: 'sad', v: exc ? `${exc} eksepsi` : 'Nihil', ok: exc === 0 },
              { p: '¶14–16', t: 'Perakitan berkas final, retensi & perubahan', mid: 'dms', v: `${agg.docPct}%`, ok: ready },
            ].map((r, i) => {
              const m = (window.MODULE_INDEX || {})[r.mid] || { label: r.mid, icon: 'doc' };
              const Ic = I[m.icon] || I.doc;
              return (
                <tr key={i} style={{ cursor: 'pointer' }} onClick={() => open(r.mid)}>
                  <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{r.p}</td>
                  <td style={{ whiteSpace: 'normal', lineHeight: 1.35, fontSize: 12 }}>{r.t}</td>
                  <td><span className="row ac gap6"><span style={{ color: 'var(--navy)' }}><Ic size={13} /></span><span style={{ fontSize: 12, fontWeight: 600 }}>{m.label}</span></span></td>
                  <td><Badge kind={r.ok ? 'green' : 'amber'} dot>{r.v}</Badge></td>
                  <td style={{ textAlign: 'right' }}><span style={{ color: 'var(--ink-4)' }}><I.arrowRight size={13} /></span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}

function D2LinkCard({ m, dir, onOpen }) {
  const Ic = I[m.ic] || I.doc;
  return (
    <button type="button" className="d2link" onClick={() => onOpen(m.id)} title={'Buka ' + m.lbl}
      style={{ borderLeftColor: m.c }}>
      <div className="row jb ac" style={{ marginBottom: 3 }}>
        <span className="row ac gap6" style={{ minWidth: 0 }}>
          <span style={{ color: m.c, flex: '0 0 auto' }}><Ic size={14} /></span>
          <span style={{ fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.lbl}</span>
        </span>
        <span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)', flex: '0 0 auto' }}>{m.para}</span>
      </div>
      <div className="tiny" style={{ fontWeight: 600, color: 'var(--ink-2)', marginBottom: 5 }}>{m.art}</div>
      <div className="tiny muted" style={{ lineHeight: 1.4, marginBottom: 7 }}>{m.rel}</div>
      <div className="row ac gap6">
        <div className="pbar" style={{ flex: 1 }}><span style={{ width: m.pct + '%', background: m.c }} /></div>
        <span className="mono tiny" style={{ fontWeight: 700, color: m.c, flex: '0 0 auto' }}>{m.val}</span>
        <span style={{ color: 'var(--ink-4)', flex: '0 0 auto' }}><I.arrowRight size={12} /></span>
      </div>
    </button>
  );
}

Object.assign(window, { SA230View });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { SA230View };
