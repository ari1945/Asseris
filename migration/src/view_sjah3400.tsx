/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { useNav } from './contexts.jsx';
import { I } from './icons.jsx';
import { SubBar } from './shell.jsx';
import { Badge, Btn, Panel, Progress, Tabs } from './ui.jsx';
import { KvBox } from './view_analytical';
import { RowKv } from './view_calc';

/* ============================================================
   NeoSuite AMS — SJAH 3400 · Pemeriksaan Informasi Keuangan
   Prospektif (PFI) — selaras ISAE/SPA 3400. Deep methodology:
   penerimaan & anatomi (prakiraan vs proyeksi), asumsi terbaik vs
   hipotetis, pemeriksaan & bukti (model direkomputasi), serta
   bentuk simpulan dwi-bagian (keyakinan negatif atas asumsi +
   opini atas penyusunan) dengan paragraf peringatan WAJIB.

   SUMBER KEBENARAN TUNGGAL: AMS.pfiEngine(exec). Seluruh
   angka & temuan ditarik dari engine — tak ada hardcode. Status
   pelaksanaan disimpan di ams.v1.pfi3400.exec & dibaca lintas
   modul (Asurans Lain · Portofolio Jasa · Matriks Kepatuhan).
   ============================================================ */
const { useState: useS34 } = React;

function SJAH3400View() {
  const { fmt } = AMS;
  const nav = useNav();
  const [exec, setExec] = window.useAmsPersist('pfi3400.exec', {});
  const [tab, setTab] = useS34('penerimaan');
  const E = (AMS as any).pfiEngine(exec);
  const A = E.meta;

  const toggle = (no, seed) => setExec(s => {
    const cur = Object.prototype.hasOwnProperty.call(s, no) ? s[no] : seed;
    return { ...s, [no]: !cur };
  });

  const tabs = [
    { id: 'penerimaan', label: 'Penerimaan & Anatomi' },
    { id: 'asumsi', label: 'Asumsi & Kewajaran' },
    { id: 'pemeriksaan', label: 'Pemeriksaan & Bukti' },
    { id: 'laporan', label: 'Simpulan & Laporan' },
  ];

  return (
    <>
      <SubBar moduleId="sjah3400" right={
        <div className="row gap8 ac">
          <Badge kind="amber" dot>{A.pfiType} · keyakinan {A.level}</Badge>
          <Btn sm onClick={() => nav('assurance', { from: 'sjah3400' })}><I.shield size={13} /> Portofolio Asurans</Btn>
          <Btn sm variant="primary"><I.sparkle size={14} /> AI Assist</Btn>
        </div>
      } />
      <div className="view-scroll"><div className="view-pad">

        {/* command band — semua angka dari engine */}
        <Panel noBody style={{ marginBottom: 12 }}>
          <div style={{ padding: '13px 16px', display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ minWidth: 250 }}>
              <div className="tiny muted upper" style={{ marginBottom: 3 }}>SJAH 3400 · selaras ISAE/SPA 3400</div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{A.project} — {A.client.replace('PT ', '')}</div>
              <div className="tiny muted">{A.id} · {A.subject.split('(')[0].trim()}</div>
            </div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Jenis PFI</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--purple)' }}>{A.pfiType}</div></div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">CAGR Pendapatan</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5, color: E.derived.cagr <= E.derived.cagrCap ? 'var(--teal)' : 'var(--red)' }}>{(E.derived.cagr * 100).toFixed(1).replace('.', ',')}%</div></div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Tie-out Model</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5, color: E.derived.ebitdaTie ? 'var(--green)' : 'var(--red)' }}>{E.derived.ebitdaTie ? 'Cocok' : 'Selisih'}</div></div>
            <div style={{ flex: 1 }} />
            <div style={{ textAlign: 'right', minWidth: 120 }}>
              <div className="tiny muted upper" style={{ marginBottom: 4 }}>Progres Pemeriksaan</div>
              <div className="row ac gap8" style={{ justifyContent: 'flex-end' }}>
                <div style={{ width: 90 }}><Progress value={E.progress} color={E.complete ? 'var(--green)' : undefined} /></div>
                <span className="mono" style={{ fontWeight: 700, fontSize: 12.5 }}>{E.progress}%</span>
              </div>
            </div>
          </div>
        </Panel>

        <div style={{ marginBottom: 12 }}><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>

        {tab === 'penerimaan' && <PfiAcceptance E={E} A={A} />}
        {tab === 'asumsi' && <PfiAssumptions E={E} />}
        {tab === 'pemeriksaan' && <PfiExamination E={E} toggle={toggle} />}
        {tab === 'laporan' && <PfiReport E={E} A={A} />}

      </div></div>
    </>
  );
}

/* ---------------- Tab: Penerimaan & Anatomi ---------------- */
function PfiAcceptance({ E, A }) {
  const acc = A.terms.filter(t => t.ok).length;
  return (
    <div className="grid" style={{ gap: 12 }}>
      <Panel noBody>
        <div className="panel-h"><h3>Prakiraan vs Proyeksi (¶6–8)</h3><div style={{ flex: 1 }} /><Badge kind="purple">Klasifikasi: {A.pfiType}</Badge></div>
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 0 }}>
          {[
            ['Prakiraan (Forecast)', 'Disusun atas dasar asumsi terbaik manajemen (best-estimate) mengenai peristiwa & tindakan yang diharapkan terjadi.', 'teal', A.pfiType === 'Prakiraan'],
            ['Proyeksi (Projection)', 'Disusun atas dasar asumsi hipotetis ("andaikan") atau campuran asumsi terbaik & hipotetis — bersifat "what-if".', 'purple', A.pfiType === 'Proyeksi'],
          ].map((r, i) => (
            <div key={i} style={{ padding: 16, borderRight: i === 0 ? '1px solid var(--line-soft)' : 0, background: r[3] ? 'var(--' + r[2] + '-bg)' : 'transparent' }}>
              <div className="row jb ac"><div style={{ fontWeight: 700, fontSize: 13 }}>{r[0]}</div>{r[3] && <Badge kind={r[2]}>Perikatan ini</Badge>}</div>
              <p className="tiny muted" style={{ margin: '6px 0 0', lineHeight: 1.5 }}>{r[2] === 'purple' ? r[1] : r[1]}</p>
            </div>
          ))}
        </div>
        <div className="panel" style={{ margin: 12, padding: '10px 12px', background: 'var(--amber-bg)', borderColor: 'transparent' }}>
          <div className="row gap8" style={{ alignItems: 'flex-start' }}>
            <span style={{ color: 'var(--amber)', flex: '0 0 auto' }}><I.alert size={15} /></span>
            <span style={{ fontSize: 11.5, lineHeight: 1.45 }}>Karena memuat <b>{E.hypoA.length} asumsi hipotetis</b> (konstruksi & pencairan kredit), informasi prospektif ini diklasifikasikan sebagai <b>proyeksi</b> — bentuk simpulan menuntut paragraf peringatan (caveat) yang lebih tegas.</span>
          </div>
        </div>
      </Panel>

      <div className="grid" style={{ gridTemplateColumns: '1.3fr 1fr', gap: 12, alignItems: 'start' }}>
        <Panel noBody>
          <div className="panel-h"><h3>Penerimaan Perikatan (¶10–12)</h3><div style={{ flex: 1 }} /><span className="mono tiny" style={{ fontWeight: 700, color: acc === A.terms.length ? 'var(--green)' : 'var(--amber)' }}>{acc}/{A.terms.length}</span></div>
          <div style={{ padding: 12, display: 'grid', gap: 7 }}>
            {A.terms.map((t, i) => (
              <div key={i} className="row gap8" style={{ alignItems: 'flex-start', fontSize: 12 }}>
                <span style={{ color: t.ok ? 'var(--green)' : 'var(--amber)', flex: '0 0 auto', marginTop: 1 }}>{t.ok ? <I.checkCircle size={15} /> : <I.clock size={15} />}</span>
                <span style={{ lineHeight: 1.45 }}>{t.k}</span>
              </div>
            ))}
          </div>
        </Panel>

        <div className="grid" style={{ gap: 12 }}>
          <Panel title="Konteks Perikatan">
            <div style={{ display: 'grid', gap: 8 }}>
              <RowKv label="Hal Pokok" v={A.pfiType + ' 3 tahun'} />
              <RowKv label="Periode" v={A.periods.join(' · ')} />
              <RowKv label="Titik Tolak" v="31 Des 2025" />
              <RowKv label="Tingkat Keyakinan" v={A.level + ' (negatif)'} />
              <RowKv label="Standar" v={A.std} />
            </div>
          </Panel>
          <Panel title="Pengguna & Tujuan">
            <div style={{ fontSize: 11.5, lineHeight: 1.55 }}>
              <div className="tiny muted upper" style={{ marginBottom: 3 }}>Pengguna yang Dituju</div>
              <p style={{ margin: '0 0 8px' }}>{A.intendedUser}</p>
              <div className="tiny muted upper" style={{ marginBottom: 3 }}>Tujuan</div>
              <p style={{ margin: 0 }}>{A.purpose}</p>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Tab: Asumsi & Kewajaran ---------------- */
function PfiAssumptions({ E }) {
  const KIND = { best: ['Terbaik (best-estimate)', 'teal'], hypo: ['Hipotetis (andaikan)', 'purple'] };
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 320px', gap: 12, alignItems: 'start' }}>
      <Panel noBody>
        <div className="panel-h"><h3>Registri Asumsi & Penilaian Kewajaran (¶17)</h3><div style={{ flex: 1 }} /><Badge kind={E.reasonableAll ? 'green' : 'amber'}>{E.reasonableAll ? 'Seluruh asumsi wajar' : 'Perlu perhatian'}</Badge></div>
        <table className="dtbl">
          <thead><tr><th style={{ width: 44 }}>Ref</th><th>Asumsi</th><th style={{ width: 150 }}>Jenis</th><th>Dasar / Bukti</th><th style={{ width: 90 }}>Penilaian</th></tr></thead>
          <tbody>
            {E.assumptions.map(a => (
              <tr key={a.id}>
                <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{a.id}</td>
                <td style={{ fontWeight: 600, whiteSpace: 'normal', lineHeight: 1.35 }}>{a.k}</td>
                <td><Badge kind={KIND[a.kind][1]}>{KIND[a.kind][0]}</Badge></td>
                <td className="tiny muted" style={{ whiteSpace: 'normal', lineHeight: 1.4 }}>{a.basis}{a.kind === 'hypo' && <span style={{ color: a.disclosed ? 'var(--green)' : 'var(--amber)', fontWeight: 600 }}> · {a.disclosed ? 'diungkap' : 'belum diungkap'}</span>}</td>
                <td><Badge kind={a.reasonable ? 'green' : 'amber'}>{a.reasonable ? 'Wajar' : 'Perhatian'}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <div className="grid" style={{ gap: 12 }}>
        <Panel title="Komposisi Asumsi">
          <div style={{ display: 'grid', gap: 10 }}>
            <KvBox label="Asumsi Terbaik" v={E.bestA.length + ' asumsi'} accent="var(--teal)" />
            <KvBox label="Asumsi Hipotetis" v={E.hypoA.length + ' asumsi'} accent="var(--purple)" />
            <KvBox label="Pengungkapan Hipotetis" v={E.hyposDisclosed ? 'Lengkap' : 'Belum lengkap'} accent={E.hyposDisclosed ? 'var(--green)' : 'var(--amber)'} />
          </div>
        </Panel>
        <Panel title="Keyakinan atas Asumsi (¶27)">
          <p className="tiny" style={{ margin: 0, lineHeight: 1.55 }}>SJAH 3400 hanya memungkinkan <b>keyakinan negatif</b> atas asumsi: praktisi menyatakan tak ada hal yang membuatnya percaya asumsi <i>tidak</i> memberikan dasar memadai bagi proyeksi. Bukti diperoleh dari sumber internal & eksternal yang konsisten.</p>
        </Panel>
      </div>
    </div>
  );
}

/* ---------------- Tab: Pemeriksaan & Bukti ---------------- */
function PfiExamination({ E, toggle }) {
  const { fmt } = AMS;
  const D = E.derived, M = E.meta.model, P = E.periods;
  const jt = (v) => 'Rp ' + fmt(v) + ' jt';
  const rows = [
    ['Pendapatan', M.rev, false],
    ['Beban operasional', M.opex, false],
    ['EBITDA (= Pendapatan − Beban)', D.ebitda, true],
    ['Penyusutan & amortisasi', M.da, false],
    ['Laba sebelum pajak', D.npbt, true],
    ['Pajak final properti (2,5%)', D.tax, false],
    ['Laba bersih', D.npat, true],
  ];
  return (
    <div className="grid" style={{ gap: 12 }}>
      <div className="grid" style={{ gridTemplateColumns: '1.15fr 1fr', gap: 12, alignItems: 'start' }}>
        <Panel noBody>
          <div className="panel-h"><h3>Rekomputasi Model Proyeksi (¶19)</h3><div style={{ flex: 1 }} /><Badge kind={D.ebitdaTie ? 'green' : 'red'}>{D.ebitdaTie ? 'Aritmetika cocok' : 'Selisih'}</Badge></div>
          <table className="dtbl">
            <thead><tr><th>Baris (Rp jt)</th>{P.map(p => <th key={p} className="num">{p}</th>)}</tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} style={{ background: r[2] ? 'var(--surface-2)' : 'transparent' }}>
                  <td style={{ fontWeight: r[2] ? 700 : 500 }}>{r[0]}</td>
                  {r[1].map((v, j) => <td key={j} className="num mono" style={{ fontWeight: r[2] ? 700 : 400, color: r[2] ? 'var(--ink)' : 'var(--ink-2)' }}>{fmt(v)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="panel" style={{ margin: 12, padding: '9px 12px', background: 'var(--surface-2)', boxShadow: 'none' }}>
            <div className="tiny" style={{ lineHeight: 1.5 }}>Tie-out otomatis: EBITDA {P[0]} = {fmt(M.rev[0])} − {fmt(M.opex[0])} = <b>{fmt(D.ebitda[0])}</b> jt, dibandingkan angka yang disajikan manajemen. Setiap perubahan angka sumber langsung mengalir ke seluruh turunan & simpulan.</div>
          </div>
        </Panel>

        <div className="grid" style={{ gap: 12 }}>
          <Panel title="Uji Sensitivitas (¶18)">
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <KvBox label={'Hunian −' + D.sensPpt + ' ppt → Pendapatan'} v={'−' + jt(D.sensRevDrop)} accent="var(--red)" />
              <KvBox label="Laba bersih thn-1 sesudah guncangan" v={jt(D.sensNpat)} accent="var(--navy)" />
            </div>
            <p className="tiny muted" style={{ margin: 0, lineHeight: 1.5 }}>Penurunan tingkat hunian {D.sensPpt} ppt dari {E.meta.occupancy.value}% menurunkan pendapatan tahun pertama secara proporsional — menyoroti sensitivitas proyeksi terhadap asumsi kunci.</p>
          </Panel>
          <Panel title="Materialitas & Cakupan (¶13)">
            <div style={{ display: 'grid', gap: 8 }}>
              <RowKv label="Acuan pasar hunian" v={E.meta.occupancy.market + '%'} />
              <RowKv label="Band kewajaran" v={E.meta.occupancy.lo + '–' + E.meta.occupancy.hi + '%'} />
              <RowKv label="Ambang CAGR pasar" v={(D.cagrCap * 100).toFixed(0) + '%'} />
            </div>
          </Panel>
        </div>
      </div>

      <Panel noBody>
        <div className="panel-h"><h3>Prosedur Pemeriksaan & Temuan</h3><div style={{ flex: 1 }} /><span className="mono tiny" style={{ fontWeight: 700 }}>{E.done}/{E.total} selesai{E.exceptions ? ' · ' + E.exceptions + ' pengecualian' : ''}</span></div>
        <table className="dtbl">
          <thead><tr><th style={{ width: 48 }}>Ref</th><th style={{ width: '22%' }}>Prosedur</th><th>Temuan (dihitung)</th><th style={{ width: 96 }}>Hasil</th><th style={{ width: 96 }}>Status</th></tr></thead>
          <tbody>
            {E.procedures.map(p => (
              <tr key={p.no}>
                <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{p.ref}</td>
                <td style={{ fontWeight: 600, whiteSpace: 'normal', lineHeight: 1.35, verticalAlign: 'top' }}>{p.short}<div className="tiny muted" style={{ fontWeight: 400, marginTop: 2 }}>{p.proc}</div></td>
                <td className="tiny" style={{ whiteSpace: 'normal', lineHeight: 1.45, verticalAlign: 'top', color: p.done ? (p.pass ? 'var(--ink-2)' : 'var(--red)') : 'var(--ink-4)' }}>{p.finding}</td>
                <td style={{ verticalAlign: 'top' }}>{p.done ? <Badge kind={p.pass ? 'green' : 'red'}>{p.pass ? 'Lolos' : 'Pengecualian'}</Badge> : <span className="tiny muted">—</span>}</td>
                <td style={{ verticalAlign: 'top' }}>
                  <button onClick={() => toggle(p.no, p.seedDone)} className="chip" style={{ cursor: 'pointer', height: 24, fontWeight: 700, border: '1px solid ' + (p.done ? 'var(--green)' : 'var(--line-strong)'), background: p.done ? 'var(--green-bg)' : '#fff', color: p.done ? 'var(--green)' : 'var(--ink-3)' }}>{p.done ? 'Selesai' : 'Tandai'}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="panel" style={{ margin: 12, padding: '10px 13px', background: E.canConclude ? 'var(--green-bg)' : 'var(--amber-bg)', borderColor: 'transparent' }}>
          <div className="row ac gap8"><span style={{ color: E.canConclude ? 'var(--green)' : 'var(--amber)' }}>{E.canConclude ? <I.checkCircle size={16} /> : <I.clock size={16} />}</span>
            <span className="tiny" style={{ fontWeight: 600, lineHeight: 1.5 }}>{E.canConclude
              ? 'Seluruh prosedur selesai tanpa pengecualian — simpulan keyakinan negatif & opini penyusunan dapat dirumuskan; laporan SJAH 3400 siap diterbitkan.'
              : 'Lengkapi prosedur pemeriksaan (' + E.done + '/' + E.total + ') sebelum merumuskan simpulan. Perubahan status mengalir konsisten ke Asurans Lain, Portofolio Jasa, & Matriks Kepatuhan.'}</span></div>
        </div>
      </Panel>
    </div>
  );
}

/* ---------------- Tab: Simpulan & Laporan ---------------- */
function PfiReport({ E, A }) {
  const C = E.conclusion;
  const today = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
  return (
    <div className="grid" style={{ gridTemplateColumns: '320px 1fr', gap: 12, alignItems: 'start' }}>
      <div className="grid" style={{ gap: 12 }}>
        <Panel title="Bentuk Simpulan (¶27)">
          <div style={{ display: 'grid', gap: 8 }}>
            {[
              ['Keyakinan negatif atas asumsi', E.assumpReasonable],
              ['Opini atas penyusunan (positif)', E.derived.ebitdaTie],
              ['Penyajian sesuai kerangka', E.presentationDone],
              ['Paragraf peringatan (caveat) wajib', true],
            ].map((r, i) => (
              <div key={i} className="row jb ac" style={{ fontSize: 11.5, padding: '7px 9px', borderRadius: 6, background: 'var(--surface-2)' }}>
                <span>{r[0]}</span>
                <Badge kind={r[1] ? 'green' : 'amber'}>{r[1] ? 'Siap' : 'Tertunda'}</Badge>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Karakter Perikatan">
          <div style={{ display: 'grid', gap: 8 }}>
            <RowKv label="Jenis PFI" v={A.pfiType} />
            <RowKv label="Keyakinan" v={A.level} />
            <RowKv label="Asumsi → bentuk" v="Negatif" />
            <RowKv label="Penyusunan → bentuk" v="Positif" />
            <RowKv label="Standar" v={A.std} />
          </div>
        </Panel>
      </div>

      <Panel noBody>
        <div className="panel-h"><h3>Pratinjau Laporan Pemeriksaan PFI</h3><div style={{ flex: 1 }} /><Badge kind={E.canConclude ? 'green' : 'amber'}>{E.canConclude ? 'Siap terbit' : 'Draf'}</Badge></div>
        <div style={{ padding: 18 }}>
          <div className="doc-paper" style={{ background: '#fff', padding: '34px 40px', boxShadow: 'var(--shadow)', fontSize: 11.5, lineHeight: 1.7, color: '#283b46' }}>
            <div style={{ fontWeight: 800, fontSize: 13, color: '#0c2430', textAlign: 'center', marginBottom: 4 }}>LAPORAN PEMERIKSAAN INFORMASI KEUANGAN PROSPEKTIF</div>
            <div className="tiny" style={{ textAlign: 'center', color: '#7a8893', marginBottom: 16 }}>{A.std} · {A.pfiType} · Keyakinan {A.level}</div>
            <p style={{ margin: '0 0 10px' }}>Kepada Direksi {A.client} dan {A.intendedUser}</p>

            <div style={{ fontWeight: 700, color: '#0c2430', margin: '0 0 4px' }}>Hal Pokok</div>
            <p style={{ margin: '0 0 10px' }}>Kami telah memeriksa <b>{A.subject}</b> beserta asumsi-asumsi pokoknya, sesuai dengan {A.std} dan kriteria {A.criteria}.</p>

            <div style={{ fontWeight: 700, color: '#0c2430', margin: '12px 0 4px' }}>Simpulan atas Asumsi (Keyakinan Negatif)</div>
            <p style={{ margin: '0 0 10px' }}>{C.negativeAssurance}</p>

            <div style={{ fontWeight: 700, color: '#0c2430', margin: '12px 0 4px' }}>Opini atas Penyusunan</div>
            <p style={{ margin: '0 0 10px' }}>{C.properlyPrepared}</p>

            <div style={{ fontWeight: 700, color: '#b3261e', margin: '12px 0 4px' }}>Paragraf Peringatan</div>
            <p style={{ margin: 0, color: '#7a3030' }}>{C.caveat}</p>

            <div style={{ marginTop: 24, paddingTop: 10, borderTop: '1px solid #e0e5ea', fontSize: 11 }}><b>{A.partner}</b> · Akuntan Publik<br /><span className="tiny" style={{ color: '#7a8893' }}>Jakarta, {today}</span></div>
          </div>
        </div>
      </Panel>
    </div>
  );
}

Object.assign(window, { SJAH3400View });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { SJAH3400View };
