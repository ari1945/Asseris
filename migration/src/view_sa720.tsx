/* [codemod] ESM imports */
import React from 'react';
import { useFirm } from './contexts.jsx';
import { I } from './icons.jsx';
import { SubBar } from './shell.jsx';
import { Badge, Btn, Panel, Tabs } from './ui.jsx';
import { KvBox } from './view_analytical';

/* ============================================================
   NeoSuite AMS — SA 720 · Tanggung Jawab Auditor atas
   Informasi Lain
   Deep workpaper: lingkup informasi lain (laporan tahunan),
   telaah inkonsistensi material vs LK & pengetahuan auditor,
   respons atas kesalahan penyajian, serta paragraf "Informasi
   Lain" dalam laporan auditor.
   ============================================================ */
const { useState: useState720, useMemo: useMemo720 } = React;

/* ---- Komponen informasi lain dalam laporan tahunan ---- */
const OI_DOCS = [
  { id: 'OI-1', name: 'Ikhtisar Data Keuangan Penting', when: 'Sebelum tgl laporan', got: true, cons: 'Konsisten', k: 'green', note: 'Angka 5-tahun cocok ke LK auditan; tidak ada inkonsistensi.' },
  { id: 'OI-2', name: 'Laporan Direksi & Analisis Manajemen (MD&A)', when: 'Sebelum tgl laporan', got: true, cons: 'Inkonsistensi (diperbaiki)', k: 'amber', note: 'Pertumbuhan pendapatan tertulis 14% — LK menunjukkan 12,3%. Manajemen mengoreksi narasi.' },
  { id: 'OI-3', name: 'Laporan Dewan Komisaris', when: 'Sebelum tgl laporan', got: true, cons: 'Konsisten', k: 'green', note: 'Pernyataan tata kelola selaras dengan pengetahuan auditor.' },
  { id: 'OI-4', name: 'Laporan Keberlanjutan (ESG)', when: 'Sebelum tgl laporan', got: true, cons: 'Konsisten', k: 'green', note: 'Data emisi non-keuangan; tidak ada angka keuangan yang bertentangan dengan LK.' },
  { id: 'OI-5', name: 'Laporan Tata Kelola Perusahaan (GCG)', when: 'Setelah tgl laporan', got: false, cons: 'Menunggu', k: 'gray', note: 'Akan diterima setelah tanggal laporan; prosedur dilakukan saat tersedia (¶ A52).' },
];

/* ============================================================ */
function SA720View() {
  const firm = useFirm();
  const client = firm?.activeClient?.name || 'PT Sentosa Makmur Tbk';
  const [tab, setTab] = useState720('lingkup');

  const incons = OI_DOCS.filter(d => d.cons.startsWith('Inkonsistensi')).length;
  const tabs = [
    { id: 'lingkup', label: 'Lingkup Informasi Lain' },
    { id: 'telaah', label: 'Telaah Inkonsistensi' },
    { id: 'respons', label: 'Respons & Pelaporan' },
    { id: 'status', label: 'Status & Komunikasi' },
  ];

  return (
    <>
      <SubBar moduleId="sa720" right={
        <div className="row gap8 ac">
          <Badge kind={incons ? 'amber' : 'green'} dot>{incons} inkonsistensi (diperbaiki)</Badge>
          <Btn sm><I.download size={13} /> Kertas Kerja Info Lain</Btn>
          <Btn sm variant="primary"><I.sparkle size={14} /> AI Assist</Btn>
        </div>
      } />
      <div className="view-scroll"><div className="view-pad">

        <Panel noBody style={{ marginBottom: 12 }}>
          <div style={{ padding: '13px 16px', display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ minWidth: 210 }}>
              <div className="tiny muted upper" style={{ marginBottom: 3 }}>Standar Audit 720</div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>Informasi Lain</div>
              <div className="tiny muted">{client} · Laporan Tahunan · ENG-2025-014</div>
            </div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Komponen Info Lain</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5 }}>{OI_DOCS.length} dokumen</div></div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Diperoleh Sebelum Tgl Laporan</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5 }}>{OI_DOCS.filter(d => d.got).length} dari {OI_DOCS.length}</div></div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Kesalahan Penyajian</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--green)' }}>Nihil (telah dikoreksi)</div></div>
            <div style={{ flex: 1 }} />
            <div style={{ textAlign: 'right' }}>
              <div className="tiny muted upper" style={{ marginBottom: 3 }}>Bagian Laporan</div>
              <Badge kind="blue" dot>"Informasi Lain" (¶21–24)</Badge>
            </div>
          </div>
        </Panel>

        <div style={{ marginBottom: 12 }}><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>

        {tab === 'lingkup' && <F720Scope />}
        {tab === 'telaah' && <F720Review />}
        {tab === 'respons' && <F720Response />}
        {tab === 'status' && <F720Status client={client} />}

      </div></div>
    </>
  );
}

/* ---------------- Tab: Lingkup ---------------- */
function F720Scope() {
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 340px', gap: 12, alignItems: 'start' }}>
      <Panel noBody>
        <div className="panel-h"><h3>Komponen Informasi Lain dalam Laporan Tahunan (¶12)</h3><div style={{ flex: 1 }} /></div>
        <table className="dtbl">
          <thead><tr><th style={{ width: 50 }}>Ref</th><th>Dokumen</th><th style={{ width: 150 }}>Waktu Diperoleh</th><th style={{ width: 80 }}>Status</th></tr></thead>
          <tbody>
            {OI_DOCS.map(d => (
              <tr key={d.id}>
                <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{d.id}</td>
                <td style={{ fontWeight: 600 }}>{d.name}</td>
                <td className="tiny">{d.when}</td>
                <td>{d.got ? <Badge kind="green">Diperoleh</Badge> : <Badge kind="gray">Menunggu</Badge>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="panel" style={{ margin: 12, padding: '10px 12px', background: 'var(--blue-050)', borderColor: 'var(--blue-100)' }}>
          <div className="row gap8" style={{ alignItems: 'flex-start' }}>
            <span style={{ color: 'var(--blue)', flex: '0 0 auto' }}><I.book size={15} /></span>
            <span style={{ fontSize: 11.5, lineHeight: 1.45 }}>Informasi lain adalah informasi <b>keuangan & non-keuangan</b> dalam laporan tahunan, <b>selain</b> laporan keuangan & laporan auditor. <b>Tidak termasuk:</b> prospektus, siaran pers, atau materi tata kelola yang berdiri sendiri di luar laporan tahunan (¶ A8–A10).</span>
          </div>
        </div>
      </Panel>

      <div className="grid" style={{ gap: 12 }}>
        <Panel title="Tanggung Jawab Auditor (¶11)">
          <div style={{ display: 'grid', gap: 9 }}>
            {[
              ['Membaca informasi lain', 'Wajib'],
              ['Mempertimbangkan inkonsistensi material dengan LK', 'Wajib'],
              ['Mempertimbangkan inkonsistensi dengan pengetahuan auditor', 'Wajib'],
              ['Menanggapi bila ada kesalahan penyajian material', 'Wajib'],
              ['Melaporkan dalam bagian "Informasi Lain"', 'Wajib'],
            ].map((r, i) => (
              <div key={i} className="row jb ac" style={{ fontSize: 11.5, padding: '6px 9px', border: '1px solid var(--line-soft)', borderRadius: 6 }}>
                <span style={{ lineHeight: 1.35 }}>{r[0]}</span><Badge kind="blue">{r[1]}</Badge>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Batasan Tanggung Jawab">
          <p className="tiny muted" style={{ margin: 0, lineHeight: 1.5 }}>Membaca & mempertimbangkan informasi lain <b>bukan</b> perikatan asurans atas informasi tersebut. Auditor <b>tidak</b> memberikan opini atau kesimpulan asurans apa pun atas informasi lain (¶ A2).</p>
        </Panel>
      </div>
    </div>
  );
}

/* ---------------- Tab: Telaah Inkonsistensi ---------------- */
function F720Review() {
  const [selId, setSelId] = useState720('OI-2');
  const sel = OI_DOCS.find(d => d.id === selId);
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 360px', gap: 12, alignItems: 'start' }}>
      <Panel noBody>
        <div className="panel-h"><h3>Hasil Telaah per Dokumen (¶14–15)</h3><div style={{ flex: 1 }} /><span className="tiny muted">Klik untuk rincian</span></div>
        <table className="dtbl">
          <thead><tr><th style={{ width: 50 }}>Ref</th><th>Dokumen</th><th style={{ width: 170 }}>Hasil Telaah</th></tr></thead>
          <tbody>
            {OI_DOCS.map(d => (
              <tr key={d.id} className={d.id === selId ? 'sel' : ''} onClick={() => setSelId(d.id)} style={{ cursor: 'pointer' }}>
                <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{d.id}</td>
                <td style={{ fontWeight: 600, whiteSpace: 'normal', lineHeight: 1.35 }}>{d.name}</td>
                <td><Badge kind={d.k}>{d.cons}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="panel" style={{ margin: 12, padding: '10px 12px', background: 'var(--surface-2)', borderColor: 'transparent' }}>
          <div className="row gap8" style={{ alignItems: 'flex-start' }}>
            <span style={{ color: 'var(--blue)', flex: '0 0 auto' }}><I.search2 size={15} /></span>
            <span style={{ fontSize: 11.5, lineHeight: 1.45 }}>Telaah mencakup dua arah: (a) konsistensi dengan <b>laporan keuangan</b>, dan (b) konsistensi dengan <b>pengetahuan auditor</b> yang diperoleh selama audit (¶14).</span>
          </div>
        </div>
      </Panel>

      {sel && (
        <Panel noBody>
          <div style={{ background: 'var(--surface-2)', padding: '11px 14px', borderBottom: '1px solid var(--line)' }}>
            <div className="row ac gap8"><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{sel.id}</span><Badge kind={sel.k}>{sel.cons}</Badge></div>
            <div style={{ fontWeight: 700, fontSize: 13, marginTop: 4 }}>{sel.name}</div>
          </div>
          <div style={{ padding: 14 }}>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <KvBox label="Diperoleh" v={sel.got ? 'Ya' : 'Menunggu'} accent={sel.got ? 'var(--green)' : 'var(--amber)'} />
              <KvBox label="Waktu" v={sel.when.replace('tgl', 'tgl lap.')} />
            </div>
            <div className="tiny muted upper" style={{ marginBottom: 4 }}>Catatan Telaah</div>
            <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5 }}>{sel.note}</p>
            {sel.cons.startsWith('Inkonsistensi') && (
              <div className="panel" style={{ padding: '9px 11px', background: 'var(--amber-bg)', borderColor: 'transparent', marginTop: 12 }}>
                <div className="row ac gap8"><span style={{ color: 'var(--amber)' }}><I.alert size={15} /></span><span style={{ fontSize: 11.5, lineHeight: 1.4 }}>Inkonsistensi material teridentifikasi → diskusi manajemen → narasi diperbaiki (¶16). Tidak ada dampak ke laporan auditor.</span></div>
              </div>
            )}
          </div>
        </Panel>
      )}
    </div>
  );
}

/* ---------------- Tab: Respons & Pelaporan ---------------- */
function F720Response() {
  return (
    <div className="grid" style={{ gap: 12 }}>
      <Panel noBody>
        <div className="panel-h"><h3>Alur Respons atas Kesalahan Penyajian Material (¶16–18)</h3><div style={{ flex: 1 }} /></div>
        <div style={{ padding: 16 }}>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
            {[
              { n: 1, t: 'Identifikasi inkonsistensi material', d: 'Pada informasi lain ATAU pada LK.', k: 'blue' },
              { n: 2, t: 'Diskusi dengan manajemen', d: 'Tentukan apakah informasi lain atau LK yang perlu direvisi.', k: 'blue' },
              { n: 3, t: 'Manajemen merevisi?', d: 'Bila ya → selesai. Bila menolak → eskalasi.', k: 'amber' },
              { n: 4, t: 'Komunikasi TCWG & tindakan lain', d: 'Pertimbangkan implikasi hukum / penarikan diri.', k: 'red' },
            ].map((s, i) => (
              <div key={i} className="panel" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '10px 12px', background: `var(--${s.k}-bg)`, borderBottom: '1px solid var(--line-soft)' }}>
                  <div className="row ac gap8"><span className="mono" style={{ width: 22, height: 22, borderRadius: 6, background: `var(--${s.k})`, color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 11 }}>{s.n}</span><span style={{ fontSize: 12, fontWeight: 700 }}>{s.t}</span></div>
                </div>
                <div style={{ padding: '10px 12px' }}><div className="tiny muted" style={{ lineHeight: 1.45 }}>{s.d}</div></div>
              </div>
            ))}
          </div>
        </div>
        <div className="panel" style={{ margin: 16, padding: '11px 13px', background: 'var(--green-bg)', borderColor: 'transparent' }}>
          <div className="row gap8" style={{ alignItems: 'flex-start' }}>
            <span style={{ color: 'var(--green)', flex: '0 0 auto' }}><I.checkCircle size={15} /></span>
            <span style={{ fontSize: 11.5, lineHeight: 1.45 }}>Untuk engagement ini, satu inkonsistensi (MD&A · OI-2) <b>telah dikoreksi</b> manajemen. Tidak ada kesalahan penyajian material yang tidak terselesaikan — laporan auditor <b>tidak dimodifikasi</b>.</span>
          </div>
        </div>
      </Panel>

      <Panel noBody>
        <div className="panel-h"><h3>Draf Bagian "Informasi Lain" — Laporan Auditor (¶22–24)</h3><div style={{ flex: 1 }} /><Badge kind="blue">Pratinjau</Badge></div>
        <div style={{ padding: 20 }}>
          <div style={{ maxWidth: 660, margin: '0 auto', fontSize: 12.5, lineHeight: 1.65 }}>
            <div style={{ fontWeight: 800, fontSize: 13.5, marginBottom: 6 }}>Informasi Lain</div>
            <p style={{ margin: '0 0 10px', color: 'var(--ink-2)' }}>Manajemen bertanggung jawab atas informasi lain. Informasi lain terdiri dari informasi yang tercakup dalam laporan tahunan, tetapi tidak mencakup laporan keuangan dan laporan auditor kami atasnya.</p>
            <p style={{ margin: '0 0 10px', color: 'var(--ink-2)' }}>Opini kami atas laporan keuangan tidak mencakup informasi lain tersebut, dan kami tidak menyatakan suatu bentuk kesimpulan asurans apa pun atasnya.</p>
            <p style={{ margin: 0, color: 'var(--ink-2)' }}>Dalam kaitannya dengan audit kami atas laporan keuangan, tanggung jawab kami adalah membaca informasi lain dan, dalam melakukannya, mempertimbangkan apakah terdapat inkonsistensi material dengan laporan keuangan atau dengan pengetahuan yang kami peroleh dalam audit, atau tampak terdapat kesalahan penyajian material. ... Berdasarkan pekerjaan yang telah kami lakukan, kami menyimpulkan bahwa tidak terdapat kesalahan penyajian material atas informasi lain ini yang harus kami laporkan.</p>
          </div>
        </div>
      </Panel>
    </div>
  );
}

/* ---------------- Tab: Status & Komunikasi ---------------- */
function F720Status({ client }) {
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 340px', gap: 12, alignItems: 'start' }}>
      <div className="grid" style={{ gap: 12 }}>
        <Panel noBody>
          <div className="panel-h"><h3>Informasi Lain Diperoleh Setelah Tanggal Laporan (¶ A52)</h3><div style={{ flex: 1 }} /><Badge kind="amber">1 menunggu</Badge></div>
          <div style={{ padding: 14 }}>
            <p style={{ margin: '0 0 12px', fontSize: 12, lineHeight: 1.55 }}>Laporan Tata Kelola Perusahaan (OI-5) akan diterbitkan <b>setelah</b> tanggal laporan auditor. Auditor tetap wajib membacanya saat tersedia; bila ditemukan kesalahan penyajian material, pertimbangkan implikasi & komunikasikan dengan TCWG.</p>
            <div className="row gap10" style={{ alignItems: 'center', padding: '11px 13px', background: 'var(--surface-2)', borderRadius: 8 }}>
              <span style={{ color: 'var(--amber)' }}><I.clock size={18} /></span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700 }}>OI-5 · Laporan Tata Kelola (GCG)</div>
                <div className="tiny muted">Dijadwalkan terbit dengan laporan tahunan — prosedur pembacaan tertunda.</div>
              </div>
              <Badge kind="amber">Tindak lanjut</Badge>
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid" style={{ gap: 12 }}>
        <Panel title="Komunikasi & Representasi">
          <div style={{ display: 'grid', gap: 7 }}>
            {[
              { t: 'Inkonsistensi material dikomunikasikan ke TCWG', ok: true },
              { t: 'Representasi tertulis info lain (SA 580)', ok: true },
              { t: 'Pernyataan komponen laporan tahunan dari manajemen', ok: true },
              { t: 'Prosedur OI-5 (pasca tanggal laporan)', ok: false },
            ].map((r, i) => (
              <div key={i} className="row gap8" style={{ fontSize: 11.5, alignItems: 'flex-start' }}>
                <span style={{ color: r.ok ? 'var(--green)' : 'var(--amber)', flex: '0 0 auto', marginTop: 1 }}>{r.ok ? <I.checkCircle size={15} /> : <I.clock size={15} />}</span>
                <span style={{ lineHeight: 1.4 }}>{r.t}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Sign-off">
          <div style={{ display: 'grid', gap: 9 }}>
            {[
              { role: 'Disiapkan', who: 'Putri Maharani', when: '10 Jan', done: true },
              { role: 'Direview', who: 'Anindya Pramesti', when: '—', done: false },
              { role: 'Disetujui Partner', who: 'Hartono Wijaya', when: '—', done: false },
            ].map((s, i) => (
              <div key={i} className="row jb ac" style={{ fontSize: 12, paddingBottom: 8, borderBottom: i < 2 ? '1px solid var(--line-soft)' : 0 }}>
                <div><div className="tiny muted upper">{s.role}</div><div style={{ fontWeight: 600 }}>{s.who}</div></div>
                {s.done ? <span className="row ac gap6 tiny" style={{ color: 'var(--green)', fontWeight: 600 }}><I.checkCircle size={14} /> {s.when}</span> : <Badge kind="amber">Menunggu</Badge>}
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

Object.assign(window, { SA720View });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { SA720View };
