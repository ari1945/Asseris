/* [codemod] ESM imports */
import React from 'react';
import { I } from './icons.jsx';

/* ============================================================
   NeoSuite AMS — Jasa Non-Audit (lanjutan)
   Laporan deliverable SPAP (AUP 4400 · Kompilasi 4410 · Asurans
   3000/3402/3400) + workspace Financial Due Diligence.
   ============================================================ */
const { useState: useNA2 } = React;

/* ============================================================
   Drawer Laporan Deliverable — render laporan sesuai standar
   ============================================================ */
function NAReport({ kind, engId, onClose }) {
  const { fmt } = window.AMS;
  const FIRM = window.AMS.FIRM;
  const today = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
  const Paper = ({ title, std, children, signer }) => (
    <div className="doc-paper" style={{ background: '#fff', maxWidth: 640, margin: '0 auto', padding: '40px 48px', boxShadow: 'var(--shadow)', fontSize: 11.5, lineHeight: 1.7, color: '#283b46' }}>
      <div className="row jb" style={{ alignItems: 'flex-start', marginBottom: 16, paddingBottom: 12, borderBottom: '2px solid #0c2430' }}>
        <div><div style={{ fontWeight: 800, fontSize: 14, color: '#0c2430' }}>{FIRM.name}</div><div className="mono" style={{ fontSize: 9.5, color: '#7a8893' }}>{FIRM.license}</div></div>
        <div className="tiny" style={{ color: '#7a8893', textAlign: 'right' }}>{std}</div>
      </div>
      <div style={{ fontWeight: 800, fontSize: 13, color: '#0c2430', textAlign: 'center', marginBottom: 16, letterSpacing: '.01em' }}>{title}</div>
      {children}
      <div style={{ marginTop: 26, paddingTop: 10, borderTop: '1px solid #e0e5ea', fontSize: 11 }}><b>{signer}</b> · Akuntan Publik<br /><span className="tiny" style={{ color: '#7a8893' }}>Jakarta, {today}</span></div>
    </div>
  );

  let body = null;
  if (kind === 'aup') {
    const E = window.AMS.aupEngine();
    const A = E.meta;
    const procs = E.procedures;
    const doneProcs = procs.filter(p => p.done);
    body = (
      <Paper title="LAPORAN TEMUAN FAKTUAL" std="SPSJL 4400" signer={A.id.includes('047') ? 'Rudi Gunawan, CPA' : 'Akuntan Publik'}>
        <p style={{ margin: '0 0 10px' }}>Kepada {A.requester}</p>
        <p style={{ margin: '0 0 10px' }}>Kami telah melaksanakan prosedur yang disepakati sebagaimana tercantum di bawah, sehubungan dengan <b>{A.subject}</b> {A.client}. Perikatan ini dilaksanakan sesuai Standar Perikatan Jasa Terkait (SPSJL) 4400.</p>
        <div style={{ fontWeight: 700, color: '#0c2430', margin: '12px 0 5px' }}>Prosedur & Temuan Faktual</div>
        <ol style={{ margin: '0 0 10px', paddingLeft: 18 }}>
          {doneProcs.map(p => <li key={p.no} style={{ marginBottom: 6 }}>{p.proc}<br /><span style={{ color: p.exception ? '#b3261e' : '#1f7a4d' }}><b>Temuan:</b> {p.finding}</span></li>)}
        </ol>
        {E.exceptions > 0 && <p style={{ margin: '0 0 10px' }}><b>Ikhtisar pengecualian:</b> dari {doneProcs.length} prosedur yang dilaksanakan, terdapat <b>{E.exceptions} pengecualian</b> sebagaimana ditandai di atas.</p>}
        <div style={{ fontWeight: 700, color: '#0c2430', margin: '12px 0 5px' }}>Pernyataan</div>
        <p style={{ margin: 0 }}>Karena prosedur di atas <b>bukan merupakan audit maupun reviu</b> yang dilaksanakan sesuai Standar Audit atau Standar Perikatan Reviu, kami <b>tidak menyatakan opini maupun keyakinan apa pun</b>. Seandainya kami melaksanakan prosedur tambahan, hal lain mungkin teridentifikasi dan dilaporkan. Laporan ini semata-mata ditujukan untuk pihak yang menyepakati prosedur dan <b>tidak boleh didistribusikan</b> kepada pihak lain.</p>
      </Paper>
    );
  } else if (kind === 'cmp') {
    const C = window.AMS.COMPILATION_4410;
    body = (
      <Paper title="LAPORAN KOMPILASI AKUNTAN" std="SPSJL 4410" signer="Sari Dewanti, CPA">
        <p style={{ margin: '0 0 10px' }}>Kepada Manajemen {C.client}</p>
        <p style={{ margin: '0 0 10px' }}>Kami telah mengompilasi laporan keuangan {C.client} untuk periode {C.period}, berdasarkan informasi yang diberikan oleh manajemen, sesuai dengan kerangka pelaporan <b>{C.framework}</b> dan Standar Perikatan Jasa Terkait (SPSJL) 4410.</p>
        <div style={{ fontWeight: 700, color: '#0c2430', margin: '12px 0 5px' }}>Tanggung Jawab Manajemen</div>
        <p style={{ margin: '0 0 10px' }}>Manajemen bertanggung jawab atas laporan keuangan tersebut dan atas keakuratan serta kelengkapan informasi yang digunakan untuk mengompilasinya.</p>
        <div style={{ fontWeight: 700, color: '#0c2430', margin: '12px 0 5px' }}>Tanggung Jawab Kami</div>
        <p style={{ margin: 0 }}>Kami melaksanakan perikatan kompilasi dengan menerapkan keahlian akuntansi dan pelaporan keuangan untuk membantu manajemen menyusun laporan keuangan. Kami <b>tidak mengaudit maupun mereviu</b>, sehingga kami <b>tidak menyatakan opini audit maupun simpulan reviu</b> atau bentuk keyakinan apa pun atas laporan keuangan ini.</p>
      </Paper>
    );
  } else if (kind === 'dd') {
    const D = window.AMS.DUE_DILIGENCE;
    const reported = D.ebitdaBridge.find(b => b.type === 'base').v / 1e9;
    const normalized = D.normEbitda;
    const netDebt = D.netDebtBridge.reduce((s, x) => s + x.v, 0);
    const ev = normalized * D.valuation.multiple;
    const nwcAdj = D.nwcCompletion - D.nwcPeg;
    const equity100 = ev - netDebt + nwcAdj;
    const equityStake = equity100 * D.stakePct / 100;
    const fmt1 = (n) => fmt(n, 1);
    body = (
      <Paper title="LAPORAN FINANCIAL DUE DILIGENCE" std="Advisory · Non-Asurans · Penggunaan Terbatas" signer={D.partner}>
        <p style={{ margin: '0 0 10px' }}>Kepada Manajemen & Dewan {D.client}</p>
        <p style={{ margin: '0 0 10px' }}>Sehubungan dengan rencana <b>{D.dealType} {D.target}</b>, kami melaksanakan financial due diligence atas target untuk periode {D.period}. {D.rationale}</p>
        <div style={{ fontWeight: 700, color: '#0c2430', margin: '12px 0 5px' }}>Temuan Utama — Quality of Earnings</div>
        <p style={{ margin: '0 0 10px' }}>EBITDA dilaporkan sebesar Rp {fmt1(reported)} M, setelah penyesuaian normalisasi (beban non-rutin, gaji pemilik, pendapatan non-berulang, sewa pihak berelasi) menjadi <b>EBITDA ternormalisasi Rp {fmt1(normalized)} M</b> sebagai dasar penilaian.</p>
        <div style={{ fontWeight: 700, color: '#0c2430', margin: '12px 0 5px' }}>Indikasi Valuasi (Enterprise → Equity Value)</div>
        <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse', margin: '0 0 10px' }}>
          <tbody>
            {[
              ['Enterprise Value (EBITDA ternormalisasi × ' + fmt1(D.valuation.multiple) + 'x)', ev, false],
              ['(−) Net debt & item debt-like', -netDebt, false],
              ['(' + (nwcAdj < 0 ? '−' : '+') + ') Penyesuaian modal kerja vs peg', nwcAdj, false],
              ['Equity Value (100%)', equity100, true],
              ['Indikasi harga ' + D.stakePct + '% saham', equityStake, true],
            ].map((r, i) => (
              <tr key={i} style={{ borderTop: '1px solid #e0e5ea' }}>
                <td style={{ padding: '4px 0', fontWeight: r[2] ? 700 : 400 }}>{r[0]}</td>
                <td style={{ padding: '4px 0', textAlign: 'right', fontWeight: r[2] ? 700 : 400, fontVariantNumeric: 'tabular-nums' }}>Rp {fmt1(Math.abs(r[1]))} M</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ fontWeight: 700, color: '#0c2430', margin: '12px 0 5px' }}>Red Flags & Implikasi terhadap Perjanjian (SPA)</div>
        <ul style={{ margin: '0 0 10px', paddingLeft: 18 }}>
          {D.redFlags.map((f, i) => <li key={i} style={{ marginBottom: 5 }}><b>[{f.sev}]</b> {f.t}<br /><span style={{ color: '#1f5673' }}><b>Implikasi:</b> {f.spa}</span></li>)}
        </ul>
        <div style={{ fontWeight: 700, color: '#0c2430', margin: '12px 0 5px' }}>Pernyataan</div>
        <p style={{ margin: 0 }}>Pekerjaan kami merupakan jasa advisory dan <b>bukan audit, reviu, atau perikatan asurans</b>; oleh karena itu kami <b>tidak menyatakan opini atau keyakinan</b>. Laporan ini disusun semata-mata untuk mendukung keputusan transaksi manajemen dan <b>tidak boleh didistribusikan</b> kepada pihak lain tanpa persetujuan tertulis kami.</p>
      </Paper>
    );
  } else if (kind && kind.startsWith('asr:')) {
    const id = kind.slice(4);
    const isPfi = window.AMS.pfiEngine && window.AMS.PFI_3400 && id === window.AMS.PFI_3400.id;
    if (isPfi) {
      const E = window.AMS.pfiEngine();
      const A = E.meta;
      body = (
        <Paper title="LAPORAN PEMERIKSAAN INFORMASI KEUANGAN PROSPEKTIF" std={A.std + ' · ' + A.pfiType} signer={A.partner}>
          <p style={{ margin: '0 0 10px' }}>Kepada Direksi {A.client} dan {A.intendedUser}</p>
          <p style={{ margin: '0 0 10px' }}>Kami telah memeriksa <b>{A.subject}</b>, beserta asumsi-asumsi pokoknya, sesuai dengan Standar Jasa Asurans (SJAH) 3400. Manajemen bertanggung jawab atas proyeksi tersebut termasuk asumsi-asumsi yang menjadi dasarnya.</p>
          <div style={{ fontWeight: 700, color: '#0c2430', margin: '12px 0 5px' }}>Simpulan atas Asumsi (Keyakinan Negatif)</div>
          <p style={{ margin: '0 0 10px' }}>{E.conclusion.negativeAssurance}</p>
          <div style={{ fontWeight: 700, color: '#0c2430', margin: '12px 0 5px' }}>Opini atas Penyusunan</div>
          <p style={{ margin: '0 0 10px' }}>{E.conclusion.properlyPrepared}</p>
          <div style={{ fontWeight: 700, color: '#b3261e', margin: '12px 0 5px' }}>Paragraf Peringatan</div>
          <p style={{ margin: 0 }}>{E.conclusion.caveat}</p>
        </Paper>
      );
      return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,20,30,.45)', zIndex: 90, display: 'flex', justifyContent: 'flex-end' }} onClick={onClose}>
          <div style={{ width: 760, maxWidth: '96vw', height: '100%', background: '#e7eaef', display: 'flex', flexDirection: 'column' }} onClick={ev => ev.stopPropagation()}>
            <div style={{ background: 'linear-gradient(125deg,#013a52,#005085)', color: '#fff', padding: '13px 18px', display: 'flex', alignItems: 'center', gap: 12, flex: '0 0 auto' }}>
              <I.doc size={18} /><div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 14 }}>Pratinjau Laporan</div><div className="tiny" style={{ color: '#bcd6e4' }}>Deliverable formal sesuai standar SPAP</div></div>
              <button className="top-btn" onClick={() => window.amsPrintDoc && window.amsPrintDoc()}><I.download size={16} /></button>
              <button className="top-btn" onClick={onClose}><I.x size={18} /></button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>{body}</div>
          </div>
        </div>
      );
    }
    const e = window.AMS.ASSURANCE_ENG[id];
    const m = window.AMS.NONAUDIT.find(x => x.id === id);
    const limited = !e.level.includes('Memadai');
    body = (
      <Paper title="LAPORAN ASURANS INDEPENDEN" std={e.std} signer={m.partner}>
        <p style={{ margin: '0 0 10px' }}>Kepada Direksi {m.client}</p>
        <p style={{ margin: '0 0 10px' }}>Kami telah melaksanakan perikatan asurans dengan <b>keyakinan {e.level.toLowerCase()}</b> atas <b>{e.subject}</b>, berdasarkan kriteria <b>{e.criteria}</b>, sesuai {e.std}.</p>
        <div style={{ fontWeight: 700, color: '#0c2430', margin: '12px 0 5px' }}>Tanggung Jawab Kami</div>
        <p style={{ margin: '0 0 10px' }}>Tanggung jawab kami adalah menyatakan {limited ? 'suatu simpulan asurans terbatas' : 'suatu opini asurans memadai'} atas hal pokok berdasarkan bukti yang kami peroleh. {limited ? 'Prosedur asurans terbatas lebih sempit dibanding asurans memadai.' : 'Kami merancang prosedur untuk memperoleh keyakinan memadai.'}</p>
        <div style={{ fontWeight: 700, color: '#0c2430', margin: '12px 0 5px' }}>{limited ? 'Simpulan' : 'Opini'}</div>
        <p style={{ margin: 0 }}>{limited
          ? 'Berdasarkan prosedur yang dilaksanakan dan bukti yang diperoleh, tidak ada hal yang menjadi perhatian kami yang menyebabkan kami percaya bahwa ' + e.subject.toLowerCase() + ' tidak disusun, dalam semua hal yang material, sesuai dengan ' + e.criteria + '.'
          : 'Menurut opini kami, ' + e.subject.toLowerCase() + ' disajikan secara wajar, dalam semua hal yang material, sesuai dengan ' + e.criteria + '.'}</p>
      </Paper>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,20,30,.45)', zIndex: 90, display: 'flex', justifyContent: 'flex-end' }} onClick={onClose}>
      <div style={{ width: 760, maxWidth: '96vw', height: '100%', background: '#e7eaef', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        <div style={{ background: 'linear-gradient(125deg,#013a52,#005085)', color: '#fff', padding: '13px 18px', display: 'flex', alignItems: 'center', gap: 12, flex: '0 0 auto' }}>
          <I.doc size={18} /><div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 14 }}>Pratinjau Laporan</div><div className="tiny" style={{ color: '#bcd6e4' }}>Deliverable formal sesuai standar SPAP</div></div>
          <button className="top-btn" onClick={() => window.amsPrintDoc && window.amsPrintDoc()}><I.download size={16} /></button>
          <button className="top-btn" onClick={onClose}><I.x size={18} /></button>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>{body}</div>
      </div>
    </div>
  );
}

Object.assign(window, { NAReport });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { NAReport };
