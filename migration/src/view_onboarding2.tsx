/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { I } from './icons';
import { Badge, Btn } from './ui.jsx';
import { OKv } from './view_onboarding';

/* ============================================================
   Asseris — Onboarding steps 2 & 3
   PMPJ / APU-PPT (KYC)  ·  Engagement Letter (SA 210)
   ============================================================ */
const { useState: useStateOB2 } = React;

/* ============================================================
   STEP 2 — PMPJ / APU-PPT  (Prinsip Mengenali Pengguna Jasa)
   ============================================================ */
const PMPJ_RISK = ['Rendah', 'Sedang', 'Tinggi'];
const CDD_BY_RISK = { Rendah: 'Sederhana', Sedang: 'Standar', Tinggi: 'Mendalam (EDD)' };

function StepPMPJ({ p, onPatch }) {
  const m = p.pmpj;
  const setP = (patch) => onPatch(pr => ({ ...pr, pmpj: { ...pr.pmpj, ...patch } }));
  const setUbo = (i, patch) => onPatch(pr => ({ ...pr, pmpj: { ...pr.pmpj, ubo: pr.pmpj.ubo.map((u, j) => j === i ? { ...u, ...patch } : u) } }));
  const addUbo = () => onPatch(pr => ({ ...pr, pmpj: { ...pr.pmpj, ubo: [...pr.pmpj.ubo, { name: '', pct: 0, role: '', idType: 'KTP', idNo: '', pep: false }] } }));
  const delUbo = (i) => onPatch(pr => ({ ...pr, pmpj: { ...pr.pmpj, ubo: pr.pmpj.ubo.filter((_, j) => j !== i) } }));

  const anyPep = m.ubo.some(u => u.pep);
  const anyHit = m.screening.some(s => s.hit);
  const recCdd = anyPep ? 'Mendalam (EDD)' : CDD_BY_RISK[m.riskRating];
  const uboTotal = m.ubo.reduce((s, u) => s + (+u.pct || 0), 0);
  const locked = m.verified;

  return (
    <div>
      <div className="row jb ac" style={{ marginBottom: 4 }}>
        <div><div style={{ fontSize: 15, fontWeight: 700 }}>PMPJ / APU-PPT — Mengenali Pengguna Jasa</div>
          <div className="tiny muted">Customer due diligence berbasis risiko · UU TPPU · PMK 155/2017 · pelaporan PPATK.</div></div>
        <Badge kind="blue">{m.cddLevel}</Badge>
      </div>

      {/* risk + cdd strip */}
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: 10, margin: '12px 0' }}>
        <div className="panel" style={{ padding: 12 }}>
          <div className="tiny muted upper" style={{ marginBottom: 6 }}>Penilaian Risiko APU-PPT</div>
          <div className="seg" style={{ width: '100%' }}>
            {PMPJ_RISK.map(r => <button key={r} className={m.riskRating === r ? 'on' : ''} style={{ flex: 1, fontSize: 11 }} disabled={locked} onClick={() => setP({ riskRating: r, cddLevel: anyPep ? 'Mendalam (EDD)' : CDD_BY_RISK[r] })}>{r}</button>)}
          </div>
        </div>
        <div className="panel" style={{ padding: 12 }}>
          <div className="tiny muted upper" style={{ marginBottom: 6 }}>Tingkat CDD</div>
          <select className="select" value={m.cddLevel} disabled={locked} onChange={e => setP({ cddLevel: e.target.value })} style={{ width: '100%' }}>
            {['Sederhana', 'Standar', 'Mendalam (EDD)'].map(c => <option key={c}>{c}</option>)}
          </select>
          {recCdd !== m.cddLevel && <div className="tiny" style={{ color: 'var(--amber)', marginTop: 5 }}>Disarankan: {recCdd}</div>}
        </div>
        <div className="panel" style={{ padding: 12 }}>
          <div className="tiny muted upper" style={{ marginBottom: 6 }}>Hasil Penapisan</div>
          <div className="row ac gap8">
            <span className={'badge b-' + (anyHit ? 'red' : 'green')}>{anyHit ? 'Ada kecocokan' : 'Bersih'}</span>
            {anyPep && <span className="badge b-amber">PEP teridentifikasi</span>}
          </div>
        </div>
      </div>

      <div className="field" style={{ marginBottom: 14 }}><label>Maksud & Tujuan Hubungan Usaha</label>
        <input className="input" value={m.purpose} disabled={locked} onChange={e => setP({ purpose: e.target.value })} />
      </div>

      {/* Beneficial owners */}
      <div className="panel" style={{ padding: 0, marginBottom: 14 }}>
        <div className="panel-h"><h3>Pemilik Manfaat (Beneficial Owner &gt; 25%)</h3><div style={{ flex: 1 }} />
          <span className="tiny mono" style={{ color: uboTotal === 100 ? 'var(--green)' : 'var(--amber)' }}>Σ {uboTotal}%</span>
          {!locked && <Btn sm onClick={addUbo}><I.plus size={12} /> Tambah</Btn>}
        </div>
        <table className="dtbl">
          <thead><tr><th>Nama</th><th>Peran</th><th className="num">%</th><th>Identitas</th><th>PEP</th>{!locked && <th></th>}</tr></thead>
          <tbody>
            {m.ubo.map((u, i) => (
              <tr key={i}>
                <td style={{ minWidth: 150 }}>{locked ? <span style={{ fontWeight: 600 }}>{u.name}</span> : <input className="input" value={u.name} onChange={e => setUbo(i, { name: e.target.value })} style={{ height: 24 }} placeholder="Nama" />}</td>
                <td className="tiny muted" style={{ minWidth: 130 }}>{locked ? u.role : <input className="input" value={u.role} onChange={e => setUbo(i, { role: e.target.value })} style={{ height: 24 }} placeholder="Peran" />}</td>
                <td className="num">{locked ? u.pct : <input className="input mono" type="number" value={u.pct} onChange={e => setUbo(i, { pct: +e.target.value })} style={{ height: 24, width: 56, textAlign: 'right' }} />}</td>
                <td className="tiny"><span className="chip tiny">{u.idType}</span> <span className="mono" style={{ fontSize: 10.5 }}>{u.idNo}</span></td>
                <td><span onClick={locked ? undefined : () => setUbo(i, { pep: !u.pep })} style={{ cursor: locked ? 'default' : 'pointer' }}><Badge kind={u.pep ? 'red' : 'gray'}>{u.pep ? 'PEP' : 'Bukan'}</Badge></span></td>
                {!locked && <td><button className="btn sm icon" onClick={() => delUbo(i)}><I.x size={13} /></button></td>}
              </tr>
            ))}
            {!m.ubo.length && <tr><td colSpan={locked ? 5 : 6} className="tiny muted" style={{ textAlign: 'center', padding: 16 }}>Belum ada pemilik manfaat dicatat.</td></tr>}
          </tbody>
        </table>
      </div>

      {/* screening */}
      <div className="panel" style={{ padding: 0, marginBottom: 14 }}>
        <div className="panel-h"><h3>Penapisan Daftar (PEP · DTTOT · OFAC/UN)</h3></div>
        <table className="dtbl">
          <thead><tr><th>Pihak</th><th>Daftar Diperiksa</th><th>Hasil</th><th>Tindak Lanjut</th></tr></thead>
          <tbody>
            {m.screening.map((s, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 600 }}>{s.name}</td>
                <td className="tiny muted">{s.list}</td>
                <td><Badge kind={s.hit ? 'red' : 'green'}>{s.hit ? 'Cocok' : 'Bersih'}</Badge></td>
                <td className="tiny">{s.status}</td>
              </tr>
            ))}
            {!m.screening.length && <tr><td colSpan={4} className="tiny muted" style={{ textAlign: 'center', padding: 16 }}>Belum ada penapisan.</td></tr>}
          </tbody>
        </table>
      </div>

      {anyPep && (
        <div className="panel" style={{ padding: '10px 13px', background: 'var(--amber-bg)', borderColor: 'transparent', marginBottom: 14 }}>
          <div className="row ac gap8"><span style={{ color: 'var(--amber)' }}><I.alert size={15} /></span><span className="tiny" style={{ fontWeight: 600, lineHeight: 1.5 }}>Pemilik manfaat PEP teridentifikasi — wajib Enhanced Due Diligence (EDD) dan persetujuan partner/pejabat senior sebelum menerima perikatan.</span></div>
        </div>
      )}

      {/* str + verify */}
      <div className="row jb ac" style={{ gap: 14, flexWrap: 'wrap' }}>
        <label className="row ac gap8" style={{ cursor: locked ? 'default' : 'pointer', fontSize: 12.5 }}>
          <span onClick={locked ? undefined : () => setP({ str: !m.str })} style={{ width: 36, height: 20, borderRadius: 11, background: m.str ? 'var(--red)' : 'var(--line-strong)', position: 'relative', transition: '.15s' }}><span style={{ position: 'absolute', top: 2, left: m.str ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: '.15s' }} /></span>
          Ajukan Laporan Transaksi Mencurigakan (LTKM) ke PPATK
        </label>
        {m.verified
          ? <div className="row ac gap8"><span className="badge b-green" style={{ padding: '3px 10px' }}><I.checkCircle size={13} /> PMPJ Terverifikasi</span><Btn sm onClick={() => setP({ verified: false })}><I.doc size={12} /> Buka kembali</Btn></div>
          : <Btn variant="primary" onClick={() => setP({ verified: true })}><I.shield size={14} /> Tetapkan PMPJ Selesai &amp; Terverifikasi</Btn>}
      </div>
    </div>
  );
}

/* ============================================================
   STEP 3 — Engagement Letter (SA 210)
   ============================================================ */
function StepLetter({ p, onPatch }) {
  const { fmt } = AMS;
  const FIRM: any = AMS.FIRM;
  const L = p.letter;
  const setL = (patch) => onPatch(pr => ({ ...pr, letter: { ...pr.letter, ...patch } }));
  const today = new Date().toISOString().slice(0, 10);
  const pushEvent = (t, who) => onPatch(pr => ({ ...pr, letter: { ...pr.letter, esign: [...(pr.letter.esign || []), { t, who, date: today }] } }));

  const generate = () => setL({ version: (L.version || 0) + 1, status: 'draft', esign: [...(L.esign || []), { t: 'Surat dibuat / diperbarui (v' + ((L.version || 0) + 1) + ')', who: p.manager, date: today }] });
  const send = () => { setL({ status: 'sent' }); pushEvent('Dikirim untuk TTE tersertifikasi (PrivyID · PSrE Kominfo)', 'Sistem'); };
  const mkSerial = () => 'METERAI-1015-' + Math.random().toString(16).slice(2, 6).toUpperCase() + '-' + Math.random().toString(16).slice(2, 6).toUpperCase();
  const sign = () => onPatch(pr => ({ ...pr, letter: { ...pr.letter,
    status: 'signed', signedBy: pr.name + ' (Direksi)', signedDate: today,
    psre: { provider: 'PrivyID', accred: 'PSrE Kominfo', algo: 'RSA-2048 / SHA-256', at: today },
    meterai: { serial: mkSerial(), denom: 10000, at: today, provider: 'Peruri' },
    legalBound: true,
    esign: [...(pr.letter.esign || []),
      { t: 'Ditandatangani — TTE tersertifikasi PSrE (PrivyID)', who: 'PrivyID · PSrE Kominfo', date: today },
      { t: 'e-Meterai Rp 10.000 dibubuhkan (Peruri)', who: 'Peruri', date: today },
    ] } }));

  const STAT = { draft: { k: 'gray', l: 'Draft' }, sent: { k: 'blue', l: 'Menunggu Tanda Tangan' }, signed: { k: 'green', l: 'Ditandatangani' } };
  const stt = STAT[L.status] || STAT.draft;
  const responsibilities = [
    'Menyusun laporan keuangan sesuai Standar Akuntansi Keuangan yang berlaku di Indonesia;',
    'Merancang, menerapkan, dan memelihara pengendalian internal yang relevan;',
    'Memberi akses tanpa batas atas informasi, catatan, dan personel yang relevan;',
    'Menyediakan representasi tertulis pada akhir perikatan (SA 580).',
  ];

  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 300px', gap: 14, alignItems: 'start' }}>
      {/* paper preview */}
      <div style={{ background: '#e7eaef', padding: 16, borderRadius: 8 }}>
        {L.version === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--ink-3)' }}>
            <div style={{ width: 52, height: 52, borderRadius: 12, background: 'var(--surface-3)', display: 'grid', placeItems: 'center', margin: '0 auto 14px', color: 'var(--ink-4)' }}><I.doc size={26} /></div>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink-2)' }}>Surat perikatan belum dibuat</div>
            <div className="tiny muted" style={{ margin: '6px 0 16px' }}>Buat draft SA 210 dari data prospek.</div>
            <Btn variant="primary" onClick={generate}><I.sparkle size={14} /> Buat Engagement Letter</Btn>
          </div>
        ) : (
          <div className="doc-paper" style={{ background: '#fff', maxWidth: 660, margin: '0 auto', padding: '40px 48px', boxShadow: 'var(--shadow)', fontSize: 11.5, lineHeight: 1.65, color: '#283b46' }}>
            <div className="row jb" style={{ alignItems: 'flex-start', marginBottom: 18, paddingBottom: 12, borderBottom: '2px solid #0c2430' }}>
              <div><div style={{ fontWeight: 800, fontSize: 15, color: '#0c2430' }}>{FIRM.name}</div><div className="mono" style={{ fontSize: 9.5, color: '#7a8893' }}>{FIRM.license}</div></div>
              <div style={{ textAlign: 'right' }}><div className="mono" style={{ fontSize: 9.5, color: '#7a8893' }}>No. {p.id}/EL/{new Date().getFullYear()}</div><div className="tiny" style={{ color: '#7a8893' }}>v{L.version} · {new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</div></div>
            </div>

            <div style={{ textAlign: 'center', fontWeight: 800, fontSize: 13, color: '#0c2430', marginBottom: 16, letterSpacing: '.02em' }}>SURAT PERIKATAN AUDIT</div>

            <p style={{ margin: '0 0 10px' }}>Kepada Yth. Direksi dan Pihak yang Bertanggung Jawab atas Tata Kelola<br /><b style={{ color: '#0c2430' }}>{p.name}</b><br />{p.city}</p>

            <p style={{ margin: '0 0 10px' }}>Dengan hormat,</p>
            <p style={{ margin: '0 0 10px' }}>Anda telah meminta kami untuk melaksanakan {p.service.toLowerCase()} atas laporan keuangan {p.name} yang terdiri dari laporan posisi keuangan per {p.fyEnd} serta laporan laba rugi, perubahan ekuitas, dan arus kas untuk tahun yang berakhir pada tanggal tersebut, sesuai <b>{p.standard}</b>. Surat ini menegaskan penerimaan dan pemahaman kami atas perikatan ini (SA 210).</p>

            <div style={{ fontWeight: 700, color: '#0c2430', margin: '14px 0 5px' }}>Ruang Lingkup</div>
            <p style={{ margin: '0 0 10px' }}>{L.scope}</p>

            <div style={{ fontWeight: 700, color: '#0c2430', margin: '14px 0 5px' }}>Tanggung Jawab Auditor</div>
            <p style={{ margin: '0 0 10px' }}>Kami akan melaksanakan audit dengan tujuan menyatakan opini atas laporan keuangan, berdasarkan Standar Audit yang ditetapkan IAPI. Audit dirancang untuk memperoleh keyakinan memadai, bukan absolut, atas bebasnya laporan keuangan dari kesalahan penyajian material.</p>

            <div style={{ fontWeight: 700, color: '#0c2430', margin: '14px 0 5px' }}>Tanggung Jawab Manajemen</div>
            <ul style={{ margin: '0 0 10px', paddingLeft: 18 }}>{responsibilities.map((r, i) => <li key={i} style={{ marginBottom: 3 }}>{r}</li>)}</ul>

            <div style={{ fontWeight: 700, color: '#0c2430', margin: '14px 0 5px' }}>Imbalan Jasa</div>
            <p style={{ margin: '0 0 10px' }}>Imbalan jasa profesional sebesar <b>Rp {fmt(p.fee)}</b> (belum termasuk PPN dan biaya langsung), ditagih bertahap sesuai kemajuan pekerjaan. Penyelesaian pelaporan ditargetkan {new Date(p.deadline).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}.</p>

            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 28 }}>
              <div><div className="tiny" style={{ color: '#7a8893', marginBottom: 30 }}>Menyetujui untuk {FIRM.short},</div><div style={{ borderTop: '1px solid #0c2430', paddingTop: 4, fontSize: 11 }}><b>{p.partner}</b><br />Rekan / Partner</div></div>
              <div><div className="tiny" style={{ color: '#7a8893', marginBottom: 30 }}>Menyetujui untuk {p.name.replace('PT ', '')},</div><div style={{ borderTop: '1px solid #0c2430', paddingTop: 4, fontSize: 11 }}><b>{L.signedBy || '________________'}</b><br />Direksi</div></div>
            </div>
            {L.status === 'signed' && <div style={{ marginTop: 18, display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
              <span className="badge b-green" style={{ fontSize: 10 }}>● TTE tersertifikasi PSrE · PrivyID · {L.signedDate}</span>
              {L.meterai && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: '1.5px dashed #b3261e', color: '#b3261e', borderRadius: 6, padding: '3px 9px', fontSize: 9.5, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>e-METERAI Rp 10.000 · {L.meterai.serial}</span>}
            </div>}
          </div>
        )}
      </div>

      {/* control panel */}
      <div style={{ display: 'grid', gap: 12 }}>
        <div className="panel" style={{ padding: 14 }}>
          <div className="row jb ac" style={{ marginBottom: 10 }}><span style={{ fontSize: 12.5, fontWeight: 700 }}>Status Surat</span><Badge kind={stt.k}>{stt.l}</Badge></div>
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <OKv label="Versi" v={'v' + L.version} />
            <OKv label="Standar" v="SA 210" />
          </div>
          {L.status === 'draft' && L.version > 0 && (
            <div className="field" style={{ marginTop: 10 }}><label>Ruang Lingkup</label><textarea className="input" value={L.scope} onChange={e => setL({ scope: e.target.value })} style={{ height: 64, padding: 8, lineHeight: 1.5, resize: 'vertical' }} /></div>
          )}
          <div style={{ display: 'grid', gap: 7, marginTop: 12 }}>
            {L.version > 0 && L.status === 'draft' && <>
              <Btn sm onClick={generate}><I.sync size={12} /> Perbarui (v{L.version + 1})</Btn>
              <Btn sm variant="primary" onClick={send}><I.send size={12} /> Kirim untuk e-Sign (PrivyID)</Btn>
            </>}
            {L.status === 'sent' && <Btn sm variant="primary" onClick={sign}><I.check size={12} /> Tandatangani (PSrE) & Bubuhkan e-Meterai</Btn>}
            {L.status === 'signed' && <Btn sm onClick={() => window.amsPrintDoc && window.amsPrintDoc()}><I.download size={12} /> Cetak / Export PDF</Btn>}
          </div>
        </div>

        <div className="panel" style={{ padding: 14 }}>
          <div className="row jb ac" style={{ marginBottom: 10 }}><span style={{ fontSize: 12.5, fontWeight: 700 }}>Keabsahan Hukum</span><Badge kind={L.legalBound ? 'green' : 'amber'}>{L.legalBound ? 'Mengikat' : 'Belum mengikat'}</Badge></div>
          <div style={{ display: 'grid', gap: 8 }}>
            <div className="row ac gap8"><span style={{ color: L.psre ? 'var(--green)' : 'var(--ink-4)', flex: '0 0 auto' }}>{L.psre ? <I.checkCircle size={15} /> : <I.clock size={15} />}</span><div style={{ flex: 1, minWidth: 0 }}><div className="tiny" style={{ fontWeight: 600 }}>TTE tersertifikasi (PSrE)</div><div className="tiny muted">{L.psre ? L.psre.provider + ' · ' + L.psre.accred : 'PrivyID · PSrE Kominfo'}</div></div></div>
            <div className="row ac gap8"><span style={{ color: L.meterai ? 'var(--green)' : 'var(--ink-4)', flex: '0 0 auto' }}>{L.meterai ? <I.checkCircle size={15} /> : <I.clock size={15} />}</span><div style={{ flex: 1, minWidth: 0 }}><div className="tiny" style={{ fontWeight: 600 }}>e-Meterai Rp 10.000 (Peruri)</div><div className="tiny muted">{L.meterai ? L.meterai.serial : 'Wajib untuk surat perikatan (UU 10/2020)'}</div></div></div>
          </div>
          <div className="tiny muted" style={{ marginTop: 10, lineHeight: 1.5, paddingTop: 10, borderTop: '1px solid var(--line-soft)' }}>TTE tersertifikasi PSrE berkekuatan hukum sah (UU ITE Ps. 11 jo. PP 71/2019); e-Meterai mengikat surat perikatan sebagai alat bukti.</div>
        </div>

        <div className="panel" style={{ padding: 14 }}>
          <div className="tiny muted upper" style={{ marginBottom: 10 }}>Jejak Tanda Tangan & Meterai</div>
          {(L.esign && L.esign.length) ? (
            <div style={{ display: 'grid', gap: 0 }}>
              {L.esign.map((e, i) => (
                <div key={i} className="row gap8" style={{ padding: '7px 0', borderBottom: i < L.esign.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
                  <span style={{ flex: '0 0 22px', width: 22, height: 22, borderRadius: '50%', background: 'var(--blue-100)', color: 'var(--blue)', display: 'grid', placeItems: 'center' }}><I.check size={12} /></span>
                  <div style={{ flex: 1 }}><div style={{ fontSize: 11.5, lineHeight: 1.4 }}>{e.t}</div><div className="tiny muted">{e.who} · {e.date}</div></div>
                </div>
              ))}
            </div>
          ) : <div className="tiny muted">Belum ada aktivitas tanda tangan.</div>}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { StepPMPJ, StepLetter });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { StepLetter, StepPMPJ };
