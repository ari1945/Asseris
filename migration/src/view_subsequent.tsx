/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { I } from './icons';
import { SubBar } from './shell.jsx';
import { Badge, Btn, Panel } from './ui.jsx';

/* ============================================================
   Asseris — Subsequent Events (SA 560 / PSAK 8)
   ============================================================ */
const { useState: useStateSE } = React;

const SE_EVENTS = [
  { id: 'SE-01', date: '2026-01-12', day: 12, title: 'Pelanggan utama (PT Distribusi Andal) mengajukan PKPU', type: 'adjusting', amount: 2_530_000_000, desc: 'Kondisi sudah ada pada tgl neraca — piutang Rp 2,53 M perlu dievaluasi penurunan nilainya.', treatment: 'Sesuaikan CKPN / hapus buku piutang per 31 Des 2025.' },
  { id: 'SE-02', date: '2026-01-28', day: 28, title: 'Kebakaran di gudang cabang Cikarang', type: 'nonadjusting', amount: 4_100_000_000, desc: 'Peristiwa terjadi setelah tgl neraca — tidak menyesuaikan, namun material untuk diungkapkan.', treatment: 'Ungkapkan dalam CALK (sifat & estimasi dampak keuangan).' },
  { id: 'SE-03', date: '2026-02-10', day: 41, title: 'Penarikan fasilitas kredit baru Rp 20 M', type: 'nonadjusting', amount: 20_000_000_000, desc: 'Pendanaan baru untuk ekspansi — peristiwa non-penyesuai.', treatment: 'Ungkapkan dalam CALK peristiwa setelah periode pelaporan.' },
  { id: 'SE-04', date: '2026-02-18', day: 49, title: 'Putusan pengadilan atas gugatan pemasok', type: 'adjusting', amount: 850_000_000, desc: 'Mengonfirmasi kewajiban yang sudah ada pada tgl neraca — provisi perlu disesuaikan.', treatment: 'Akui/sesuaikan provisi liabilitas Rp 850 jt per 31 Des 2025.' },
  { id: 'SE-05', date: '2026-03-05', day: 64, title: 'Deklarasi dividen interim oleh Direksi', type: 'nonadjusting', amount: 6_000_000_000, desc: 'Dividen dideklarasi setelah tgl neraca — tidak diakui sebagai liabilitas per 31 Des.', treatment: 'Ungkapkan dalam CALK; tidak diakui sebagai liabilitas.' },
];

const SE_PROCEDURES = [
  { t: 'Inquiry kepada manajemen atas peristiwa setelah tgl neraca', done: true },
  { t: 'Telaah notulen RUPS/Direksi/Komisaris hingga tgl laporan', done: true },
  { t: 'Telaah laporan keuangan interim terkini', done: true },
  { t: 'Inquiry status litigasi & klaim ke penasihat hukum', done: false },
  { t: 'Peroleh representasi tertulis manajemen (SA 580)', done: false },
];

function SubsequentEvents() {
  const { fmt } = AMS;
  const [events, setEvents] = useStateSE(SE_EVENTS);
  const [selId, setSelId] = useStateSE('SE-01');
  const [procs, setProcs] = useStateSE(SE_PROCEDURES);

  const sel = events.find(e => e.id === selId);
  const adjusting = events.filter(e => e.type === 'adjusting').length;
  const setType = (id, type) => setEvents(list => list.map(e => e.id === id ? { ...e, type } : e));
  const toggleProc = (i) => setProcs(ps => ps.map((p, idx) => idx === i ? { ...p, done: !p.done } : p));
  const procDone = procs.filter(p => p.done).length;
  const periodDays = 73; // 31 Dec 2025 -> 14 Mar 2026

  return (
    <>
      <SubBar moduleId="subsequent" right={
        <div className="row gap8 ac">
          <Badge kind="blue">SA 560 · PSAK 8</Badge>
          <Btn sm><I.download size={13} /> Memo Subsequent Events</Btn>
          <Btn sm variant="primary"><I.plus size={14} /> Catat Peristiwa</Btn>
        </div>
      } />
      <div className="view-scroll">
        <div className="view-pad">
          {/* timeline */}
          <Panel noBody style={{ marginBottom: 12 }}>
            <div style={{ padding: '14px 18px 18px' }}>
              <div className="row jb ac" style={{ marginBottom: 14 }}>
                <span style={{ fontWeight: 700, fontSize: 13 }}>Periode Peristiwa Kemudian</span>
                <span className="tiny muted">31 Des 2025 (tgl neraca) → 14 Mar 2026 (tgl laporan) · {periodDays} hari</span>
              </div>
              <div style={{ position: 'relative', height: 64, margin: '0 8px' }}>
                {/* line */}
                <div style={{ position: 'absolute', top: 30, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg,var(--blue),var(--navy))', borderRadius: 3 }} />
                {/* endpoints */}
                <div style={{ position: 'absolute', left: 0, top: 22, textAlign: 'left' }}><div style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--navy)', border: '2px solid #fff', boxShadow: '0 0 0 1px var(--navy)' }} /><div className="tiny mono" style={{ marginTop: 8, color: 'var(--navy)', fontWeight: 700 }}>31 Des</div></div>
                <div style={{ position: 'absolute', right: 0, top: 22, textAlign: 'right' }}><div style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--navy)', border: '2px solid #fff', boxShadow: '0 0 0 1px var(--navy)', marginLeft: 'auto' }} /><div className="tiny mono" style={{ marginTop: 8, color: 'var(--navy)', fontWeight: 700 }}>14 Mar</div></div>
                {/* events */}
                {events.map(e => {
                  const pct = (e.day / periodDays) * 96 + 2;
                  const isSel = e.id === selId;
                  return (
                    <div key={e.id} onClick={() => setSelId(e.id)} title={e.title} style={{ position: 'absolute', left: pct + '%', top: 24, transform: 'translateX(-50%)', cursor: 'pointer', textAlign: 'center' }}>
                      <div style={{ width: isSel ? 16 : 12, height: isSel ? 16 : 12, borderRadius: '50%', background: e.type === 'adjusting' ? 'var(--red)' : 'var(--amber)', border: '2px solid #fff', boxShadow: isSel ? '0 0 0 2px var(--navy)' : '0 0 0 1px rgba(0,0,0,.15)', transition: '.1s', marginTop: isSel ? -2 : 0 }} />
                      <div className="tiny mono" style={{ marginTop: 6, color: 'var(--ink-3)' }}>{e.id}</div>
                    </div>
                  );
                })}
              </div>
              <div className="row gap12" style={{ marginTop: 6 }}>
                <span className="row ac gap6 tiny"><span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--red)' }} /> Penyesuai (Type 1)</span>
                <span className="row ac gap6 tiny"><span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--amber)' }} /> Non-Penyesuai (Type 2)</span>
              </div>
            </div>
          </Panel>

          <div className="grid" style={{ gridTemplateColumns: '1fr 320px', gap: 12, alignItems: 'start' }}>
            <div className="grid" style={{ gap: 12 }}>
              <Panel noBody>
                <div className="panel-h"><h3>Daftar Peristiwa Kemudian</h3><div style={{ flex: 1 }} /><span className="tiny muted">{adjusting} penyesuai · {events.length - adjusting} non-penyesuai</span></div>
                <table className="dtbl">
                  <thead><tr><th>ID</th><th>Tanggal</th><th>Peristiwa</th><th className="num">Dampak (Rp)</th><th style={{ width: 130 }}>Klasifikasi</th></tr></thead>
                  <tbody>
                    {events.map(e => (
                      <tr key={e.id} className={e.id === selId ? 'sel' : ''} onClick={() => setSelId(e.id)} style={{ cursor: 'pointer' }}>
                        <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{e.id}</td>
                        <td className="mono tiny">{new Date(e.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</td>
                        <td className="truncate" style={{ maxWidth: 320, whiteSpace: 'normal', lineHeight: 1.35, fontSize: 11.5 }}>{e.title}</td>
                        <td className="num">{fmt(e.amount / 1e6, 0)} jt</td>
                        <td>{e.type === 'adjusting' ? <Badge kind="red">Penyesuai</Badge> : <Badge kind="amber">Non-Penyesuai</Badge>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Panel>

              {sel && (
                <Panel noBody>
                  <div style={{ background: 'var(--surface-2)', padding: '11px 14px', borderBottom: '1px solid var(--line)' }} className="row ac gap8">
                    <span className="mono" style={{ fontWeight: 700, color: 'var(--blue)' }}>{sel.id}</span>
                    <span className="tiny muted mono">{new Date(sel.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                    <div style={{ flex: 1 }} />
                    <span className="tiny muted">Dampak Rp {fmt(sel.amount / 1e6, 0)} jt</span>
                  </div>
                  <div style={{ padding: 14 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>{sel.title}</div>
                    <p style={{ margin: '0 0 12px', fontSize: 12.5, lineHeight: 1.5, color: 'var(--ink-2)' }}>{sel.desc}</p>
                    <div className="panel" style={{ padding: '9px 11px', background: 'var(--blue-050)', borderColor: 'var(--blue-100)', marginBottom: 14 }}>
                      <div className="tiny muted upper" style={{ marginBottom: 2 }}>Perlakuan Akuntansi (PSAK 8)</div>
                      <div style={{ fontSize: 12.5, fontWeight: 600 }}>{sel.treatment}</div>
                    </div>
                    <div className="tiny muted upper" style={{ marginBottom: 6 }}>Klasifikasi — geser sesuai pertimbangan</div>
                    <div className="seg" style={{ width: 'fit-content' }}>
                      <button className={sel.type === 'adjusting' ? 'on' : ''} onClick={() => setType(sel.id, 'adjusting')}>Penyesuai (Type 1)</button>
                      <button className={sel.type === 'nonadjusting' ? 'on' : ''} onClick={() => setType(sel.id, 'nonadjusting')}>Non-Penyesuai (Type 2)</button>
                    </div>
                  </div>
                </Panel>
              )}
            </div>

            <Panel title="Prosedur Audit (SA 560)" sub={procDone + '/' + procs.length}>
              <div style={{ display: 'grid', gap: 0 }}>
                {procs.map((p, i) => (
                  <label key={i} className="row gap8" style={{ padding: '8px 0', cursor: 'pointer', alignItems: 'flex-start', borderBottom: i < procs.length - 1 ? '1px solid var(--line-soft)' : 0 }} onClick={() => toggleProc(i)}>
                    <span style={{ flex: '0 0 16px', width: 16, height: 16, borderRadius: 4, marginTop: 1, border: '1.5px solid ' + (p.done ? 'var(--green)' : 'var(--line-strong)'), background: p.done ? 'var(--green)' : '#fff', display: 'grid', placeItems: 'center' }}>{p.done && <I.check size={11} style={{ color: '#fff' }} />}</span>
                    <span style={{ fontSize: 11.5, lineHeight: 1.4, color: p.done ? 'var(--ink-3)' : 'var(--ink)' }}>{p.t}</span>
                  </label>
                ))}
              </div>
              <div className="divider" />
              <div className="panel" style={{ padding: '9px 11px', background: procDone === procs.length ? 'var(--green-bg)' : 'var(--amber-bg)', borderColor: 'transparent' }}>
                <div className="row ac gap8"><span style={{ color: procDone === procs.length ? 'var(--green)' : 'var(--amber)' }}>{procDone === procs.length ? <I.checkCircle size={15} /> : <I.clock size={15} />}</span>
                  <span style={{ fontSize: 11.5, lineHeight: 1.4 }}>{procDone === procs.length ? 'Seluruh prosedur selesai — siap kesimpulan & representasi tertulis.' : `${procs.length - procDone} prosedur belum diselesaikan hingga tgl laporan.`}</span>
                </div>
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { SubsequentEvents });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { SubsequentEvents };
