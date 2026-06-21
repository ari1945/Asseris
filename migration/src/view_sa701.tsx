/* [codemod] ESM imports */
import React from 'react';
import { useFirm } from './contexts.jsx';
import { I } from './icons.jsx';
import { SubBar } from './shell.jsx';
import { Badge, Btn, Panel, Tabs } from './ui.jsx';

/* ============================================================
   Asseris — SA 701 · Pengomunikasian Hal Audit Utama (KAM)
   Deep workpaper: corong penentuan KAM, register KAM (mengapa
   & bagaimana ditangani + rujukan LK), draf bagian KAM dalam
   laporan auditor, serta keterkaitan risiko & komunikasi TCWG.
   ============================================================ */
const { useState: useState701, useMemo: useMemo701 } = React;

/* ---- Hal yang dikomunikasikan ke TCWG → corong KAM ---- */
const KAM_FUNNEL = [
  { stage: 'Dikomunikasikan ke TCWG (SA 260)', n: 9, ref: '¶9', color: 'blue', d: 'Seluruh hal signifikan yang dikomunikasikan kepada pihak tata kelola.' },
  { stage: 'Perhatian signifikan auditor', n: 5, ref: '¶9(a–c)', color: 'purple', d: 'Area risiko tinggi, pertimbangan signifikan, & peristiwa penting.' },
  { stage: 'Hal Audit Utama (KAM)', n: 3, ref: '¶10', color: 'teal', d: 'Hal yang paling signifikan dalam audit periode berjalan.' },
];

/* ---- Register KAM ---- */
const KAM_REG = [
  { id: 'KAM-1', title: 'Pengakuan Pendapatan & Pisah-Batas', risk: 'Risiko fraud (presumsi SA 240); konsentrasi pendapatan Desember 28%.', why: 'Pendapatan adalah angka paling material & terdapat risiko fraud presumsi pada pengakuan; ketepatan pisah-batas memerlukan pertimbangan signifikan.', how: ['Uji cut-off rinci ±2 minggu sekitar tanggal pelaporan', 'Konfirmasi piutang & telaah retur pasca-periode', 'Analitik tren pendapatan & margin bulanan per lini', 'Telaah kontrak akhir periode (bill-and-hold, hak retur)'], ref: 'CALK 3 & 24', link: 'SA 240 · SA 520 · PSAK 72' },
  { id: 'KAM-2', title: 'Penyisihan Kerugian Kredit (ECL)', risk: 'Estimasi ketidakpastian tinggi; titik manajemen di batas bawah rentang auditor.', why: 'Pengukuran CKPN melibatkan model forward-looking dengan asumsi signifikan (PD, LGD, overlay makro) yang sangat subjektif.', how: ['Evaluasi metodologi ECL & uji staging', 'Uji asumsi PD/LGD terhadap data historis', 'Kembangkan rentang independen & bandingkan titik manajemen', 'Telaah retrospektif estimasi PY (indikasi bias)'], ref: 'CALK 8 & 31', link: 'SA 540 · PSAK 71' },
  { id: 'KAM-3', title: 'Uji Penurunan Nilai Goodwill', risk: 'Headroom tipis; nilai terpulihkan sensitif terhadap WACC.', why: 'Value-in-use bergantung pada proyeksi arus kas & tingkat diskonto; perubahan kecil asumsi berdampak material pada kesimpulan penurunan nilai.', how: ['Evaluasi model DCF & integritas proyeksi manajemen', 'Uji WACC & pertumbuhan terminal terhadap data pasar', 'Lakukan analisis sensitivitas atas asumsi kunci', 'Evaluasi kecukupan pengungkapan ketidakpastian'], ref: 'CALK 12', link: 'SA 540 · PSAK 48' },
];

/* ============================================================ */
function SA701View() {
  const firm = useFirm();
  const client = firm?.activeClient?.name || 'PT Sentosa Makmur Tbk';
  const [tab, setTab] = useState701('penentuan');

  const tabs = [
    { id: 'penentuan', label: 'Penentuan KAM' },
    { id: 'register', label: 'Register KAM' },
    { id: 'laporan', label: 'Penyajian Laporan' },
    { id: 'komunikasi', label: 'Keterkaitan & TCWG' },
  ];

  return (
    <>
      <SubBar moduleId="sa701" right={
        <div className="row gap8 ac">
          <Badge kind="teal" dot>3 KAM ditentukan</Badge>
          <Btn sm><I.download size={13} /> Memo KAM</Btn>
          <Btn sm variant="primary"><I.sparkle size={14} /> AI Assist</Btn>
        </div>
      } />
      <div className="view-scroll"><div className="view-pad">

        <Panel noBody style={{ marginBottom: 12 }}>
          <div style={{ padding: '13px 16px', display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ minWidth: 210 }}>
              <div className="tiny muted upper" style={{ marginBottom: 3 }}>Standar Audit 701</div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>Pengomunikasian Hal Audit Utama</div>
              <div className="tiny muted">{client} · Entitas Terdaftar · ENG-2025-014</div>
            </div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Hal ke TCWG</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5 }}>9 hal</div></div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">KAM Final</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--teal)' }}>3 hal audit utama</div></div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Penerapan</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5 }}>Wajib — entitas terdaftar</div></div>
            <div style={{ flex: 1 }} />
            <div style={{ textAlign: 'right' }}>
              <div className="tiny muted upper" style={{ marginBottom: 3 }}>Letak dalam Laporan</div>
              <Badge kind="blue" dot>Setelah paragraf Basis Opini</Badge>
            </div>
          </div>
        </Panel>

        <div style={{ marginBottom: 12 }}><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>

        {tab === 'penentuan' && <F701Funnel />}
        {tab === 'register' && <F701Register />}
        {tab === 'laporan' && <F701Report client={client} />}
        {tab === 'komunikasi' && <F701Comms />}

      </div></div>
    </>
  );
}

/* ---------------- Tab: Penentuan (corong) ---------------- */
function F701Funnel() {
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 340px', gap: 12, alignItems: 'start' }}>
      <Panel noBody>
        <div className="panel-h"><h3>Corong Penentuan Hal Audit Utama (¶9–10)</h3><div style={{ flex: 1 }} /><Badge kind="blue">Proses seleksi</Badge></div>
        <div style={{ padding: 18 }}>
          {KAM_FUNNEL.map((f, i) => {
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
            <span style={{ fontSize: 11.5, lineHeight: 1.45 }}>KAM dipilih dari hal yang dikomunikasikan ke TCWG yang <b>memerlukan perhatian signifikan auditor</b> (¶9), lalu ditentukan hal mana yang <b>paling signifikan</b> dalam audit periode berjalan (¶10). KAM <b>bukan</b> pengganti opini modifikasi maupun pengungkapan manajemen.</span>
          </div>
        </div>
      </Panel>

      <div className="grid" style={{ gap: 12 }}>
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
        <Panel title="Hal yang Tidak Menjadi KAM">
          <div style={{ display: 'grid', gap: 7 }}>
            {['Saldo kas & setara kas (risiko rendah)', 'Beban operasi rutin', 'Sewa — penerapan PSAK 73 (tidak kompleks tahun ini)', 'Perpajakan kini (tanpa ketidakpastian signifikan)', 'Aset tetap (penambahan tidak material)', 'Modal & ekuitas'].map((t, i) => (
              <div key={i} className="row gap8" style={{ fontSize: 11.5, alignItems: 'flex-start', opacity: .85 }}>
                <span style={{ color: 'var(--ink-4)', flex: '0 0 auto', marginTop: 1 }}><I.circle size={13} /></span>
                <span style={{ lineHeight: 1.4 }}>{t}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ---------------- Tab: Register KAM ---------------- */
function F701Register() {
  const [selId, setSelId] = useState701('KAM-1');
  const sel = KAM_REG.find(k => k.id === selId);
  return (
    <div className="grid" style={{ gridTemplateColumns: '300px 1fr', gap: 12, alignItems: 'start' }}>
      <div className="grid" style={{ gap: 10 }}>
        {KAM_REG.map(k => (
          <button key={k.id} onClick={() => setSelId(k.id)} className="panel" style={{ padding: 0, textAlign: 'left', cursor: 'pointer', border: k.id === selId ? '1.5px solid var(--teal)' : '1px solid var(--line)', overflow: 'hidden' }}>
            <div style={{ padding: '11px 13px', background: k.id === selId ? 'var(--teal-bg)' : 'transparent' }}>
              <div className="row ac gap8"><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--teal)' }}>{k.id}</span></div>
              <div style={{ fontWeight: 700, fontSize: 12.5, marginTop: 4, lineHeight: 1.3 }}>{k.title}</div>
              <div className="tiny muted" style={{ marginTop: 3, lineHeight: 1.4 }}>{k.risk}</div>
            </div>
          </button>
        ))}
      </div>

      {sel && (
        <Panel noBody>
          <div style={{ background: 'linear-gradient(125deg,#063b40,#0a6b73)', color: '#fff', padding: '14px 16px' }}>
            <div className="row jb ac"><Badge kind="teal">{sel.id}</Badge><span className="mono tiny" style={{ color: '#b9e0e3' }}>{sel.link}</span></div>
            <div style={{ fontSize: 15, fontWeight: 700, marginTop: 8 }}>{sel.title}</div>
          </div>
          <div style={{ padding: 16 }}>
            <div className="tiny muted upper" style={{ marginBottom: 4 }}>Mengapa Termasuk KAM (¶13)</div>
            <p style={{ margin: '0 0 14px', fontSize: 12.5, lineHeight: 1.55 }}>{sel.why}</p>
            <div className="tiny muted upper" style={{ marginBottom: 6 }}>Bagaimana Ditangani dalam Audit (¶13)</div>
            <div style={{ marginBottom: 14 }}>
              {sel.how.map((h, i) => (
                <div key={i} className="row gap8" style={{ fontSize: 12, alignItems: 'flex-start', padding: '7px 0', borderBottom: i < sel.how.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
                  <span style={{ color: 'var(--teal)', flex: '0 0 auto', marginTop: 1 }}><I.check size={14} /></span><span style={{ lineHeight: 1.4 }}>{h}</span>
                </div>
              ))}
            </div>
            <div className="row gap10">
              <div className="chip tiny"><I.doc size={12} /> Rujukan LK: {sel.ref}</div>
              <div className="chip tiny" style={{ background: 'var(--teal-bg)' }}><I.link2 size={12} /> {sel.link}</div>
            </div>
          </div>
        </Panel>
      )}
    </div>
  );
}

/* ---------------- Tab: Penyajian Laporan ---------------- */
function F701Report({ client }) {
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 300px', gap: 12, alignItems: 'start' }}>
      <Panel noBody>
        <div className="panel-h"><h3>Draf Bagian "Hal Audit Utama" — Laporan Auditor</h3><div style={{ flex: 1 }} /><Badge kind="blue">Pratinjau</Badge></div>
        <div style={{ padding: 22 }}>
          <div style={{ maxWidth: 660, margin: '0 auto', fontSize: 12.5, lineHeight: 1.65 }}>
            <div style={{ fontWeight: 800, fontSize: 13.5, marginBottom: 6 }}>Hal Audit Utama</div>
            <p style={{ margin: '0 0 14px', color: 'var(--ink-2)' }}>Hal audit utama adalah hal-hal yang, menurut pertimbangan profesional kami, merupakan hal yang paling signifikan dalam audit kami atas laporan keuangan periode kini. Hal-hal tersebut ditangani dalam konteks audit kami atas laporan keuangan secara keseluruhan, dan dalam merumuskan opini kami, kami tidak menyatakan suatu opini terpisah atas hal-hal tersebut.</p>
            {KAM_REG.map((k, i) => (
              <div key={i} style={{ marginBottom: 14, paddingBottom: 14, borderBottom: i < KAM_REG.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>{k.title}</div>
                <p style={{ margin: '0 0 6px', color: 'var(--ink-2)' }}>{k.why} (Rujukan: {k.ref}.)</p>
                <div className="tiny" style={{ fontWeight: 700, color: 'var(--teal)', marginBottom: 3 }}>Bagaimana hal tersebut ditangani dalam audit kami:</div>
                <p style={{ margin: 0, color: 'var(--ink-2)' }}>Prosedur kami mencakup, antara lain: {k.how.join('; ').toLowerCase()}.</p>
              </div>
            ))}
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
          <p className="tiny muted" style={{ margin: 0, lineHeight: 1.5 }}>Setiap KAM merujuk pengungkapan terkait dalam LK (bila ada). KAM <b>tidak</b> menggantikan pengungkapan manajemen, opini modifikasi (SA 705), maupun pelaporan going concern (SA 570).</p>
        </Panel>
      </div>
    </div>
  );
}

/* ---------------- Tab: Keterkaitan & TCWG ---------------- */
function F701Comms() {
  return (
    <div className="grid" style={{ gap: 12 }}>
      <Panel noBody>
        <div className="panel-h"><h3>Keterkaitan KAM dengan Penilaian Risiko & Modul</h3><div style={{ flex: 1 }} /></div>
        <table className="dtbl">
          <thead><tr><th>KAM</th><th>Risiko Signifikan Terkait</th><th>Modul Pengujian</th><th style={{ width: 96 }}>Status</th></tr></thead>
          <tbody>
            {[
              ['KAM-1 · Pendapatan', 'Fraud pengakuan pendapatan (SA 240)', 'Cut-off · Konfirmasi · Analitis', 'green'],
              ['KAM-2 · ECL', 'Estimasi ketidakpastian tinggi (SA 540)', 'Kalkulator ECL · Rentang independen', 'amber'],
              ['KAM-3 · Goodwill', 'Penurunan nilai — headroom tipis', 'DCF · Analisis sensitivitas', 'amber'],
            ].map((r, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 600 }}>{r[0]}</td>
                <td className="tiny">{r[1]}</td>
                <td className="tiny">{r[2]}</td>
                <td><Badge kind={r[3]}>{r[3] === 'green' ? 'Tuntas' : 'Finalisasi'}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }}>
        <Panel title="Komunikasi dengan TCWG (¶17)">
          <div style={{ display: 'grid', gap: 8 }}>
            {[
              { t: 'KAM yang ditentukan dikomunikasikan ke Komite Audit', ok: true },
              { t: 'Hal yang dipertimbangkan namun tidak menjadi KAM dibahas', ok: true },
              { t: 'Tidak ada KAM yang dikomunikasikan (bila ada) didokumentasikan', ok: true },
            ].map((r, i) => (
              <div key={i} className="row gap8" style={{ fontSize: 11.5, alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--green)', flex: '0 0 auto', marginTop: 1 }}><I.checkCircle size={15} /></span>
                <span style={{ lineHeight: 1.4 }}>{r.t}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Dokumentasi (¶18)">
          <div style={{ display: 'grid', gap: 6 }}>
            {[['Hal yang memerlukan perhatian signifikan & dasar pertimbangan', 'F-701.1'], ['Alasan tiap hal menjadi / tidak menjadi KAM', 'F-701.2'], ['Pertimbangan bila tidak ada KAM untuk dilaporkan', 'F-701.3']].map((r, i) => (
              <div key={i} className="row jb ac" style={{ fontSize: 12, padding: '7px 9px', border: '1px solid var(--line-soft)', borderRadius: 6 }}>
                <span className="row ac gap8"><span style={{ color: 'var(--teal)' }}><I.doc size={14} /></span>{r[0]}</span>
                <span className="mono tiny" style={{ color: 'var(--teal)', fontWeight: 700 }}>{r[1]}</span>
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
