/* [codemod] ESM imports */
import React from 'react';
import { I } from './icons.jsx';
import { Panel } from './ui.jsx';

/* ============================================================
   NeoSuite AMS — PSAK 16 · Komponen Register Aset Tetap (sub-ledger)
   Dipakai oleh view_psak16.jsx. Menampilkan:
     · AssetRegisterTable — buku besar pembantu aset tetap (data yang
       di-impor dari register-aset-tetap.xlsx) + footing total
     · SubLedgerRecon — rekonsiliasi total kontrol sub-ledger ↔ GL (WTB)
     · ImportMappingPanel — mekanisme impor Excel: pemetaan kolom,
       validasi, tingkat otomasi, & gerbang posting (control-total)
   Komponen di-assign ke window agar terlihat lintas-file Babel.
   ============================================================ */
const { useState: useStateP16R } = React;

/* ——— Register aset tetap (sub-ledger) ——— */
function AssetRegisterTable({ reg, sc, fmt }) {
  return (
    <Panel noBody>
      <div className="panel-h">
        <h3>Register Aset Tetap — Buku Besar Pembantu</h3>
        <span className="sub mono">{reg.count} aset</span>
        <div style={{ flex: 1 }} />
        <span className="tiny muted">sumber: register-aset-tetap.xlsx</span>
      </div>
      <div style={{ padding: '4px 14px 12px', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
          <thead>
            <tr style={{ color: 'var(--ink-4)', textAlign: 'right' }}>
              <th style={{ textAlign: 'left', fontWeight: 600, padding: '6px 4px' }}>Tag</th>
              <th style={{ textAlign: 'left', fontWeight: 600, padding: '6px 4px' }}>Nama Aset</th>
              <th style={{ textAlign: 'left', fontWeight: 600, padding: '6px 4px' }}>Kelompok</th>
              <th style={{ fontWeight: 600, padding: '6px 4px' }}>Perolehan</th>
              <th style={{ fontWeight: 600, padding: '6px 4px' }}>Umur</th>
              <th style={{ fontWeight: 600, padding: '6px 4px' }}>Harga perolehan</th>
              <th style={{ fontWeight: 600, padding: '6px 4px' }}>Akm. peny.</th>
              <th style={{ fontWeight: 600, padding: '6px 4px' }}>Nilai buku</th>
            </tr>
          </thead>
          <tbody>
            {reg.rows.map((r, i) => (
              <tr key={r.tag} style={{ borderTop: '1px solid var(--line-soft)' }}>
                <td className="mono" style={{ padding: '6px 4px', fontWeight: 600, color: 'var(--navy)' }}>{r.tag}</td>
                <td style={{ padding: '6px 4px' }}>{r.name}{r.fullyDep && <span className="tiny" style={{ color: 'var(--amber)', fontWeight: 600, marginLeft: 5 }}>tersusut penuh</span>}</td>
                <td style={{ padding: '6px 4px', color: 'var(--ink-3)' }}>{r.classLabel}</td>
                <td className="mono" style={{ textAlign: 'right', padding: '6px 4px', color: 'var(--ink-4)' }}>{r.acqYear}</td>
                <td className="mono" style={{ textAlign: 'right', padding: '6px 4px', color: 'var(--ink-4)' }}>{r.life ? r.life + ' th' : '—'}</td>
                <td className="mono" style={{ textAlign: 'right', padding: '6px 4px' }}>{sc(r.cost)}</td>
                <td className="mono" style={{ textAlign: 'right', padding: '6px 4px', color: 'var(--red)' }}>{r.accum ? sc(-r.accum) : '—'}</td>
                <td className="mono" style={{ textAlign: 'right', padding: '6px 4px', fontWeight: 600 }}>{sc(r.nbv)}</td>
              </tr>
            ))}
            <tr style={{ borderTop: '1.5px solid var(--navy)', fontWeight: 700 }}>
              <td colSpan={5} style={{ padding: '8px 4px' }}>Total register ({reg.count} aset)</td>
              <td className="mono" style={{ textAlign: 'right', padding: '8px 4px' }}>{sc(reg.sumCost)}</td>
              <td className="mono" style={{ textAlign: 'right', padding: '8px 4px', color: 'var(--red)' }}>{sc(-reg.sumAccum)}</td>
              <td className="mono" style={{ textAlign: 'right', padding: '8px 4px', color: 'var(--navy)' }}>{sc(reg.sumNbv)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

/* ——— Rekonsiliasi sub-ledger ↔ GL (akun kontrol) ——— */
function SubLedgerRecon({ reg, sc, nav }) {
  return (
    <Panel noBody>
      <div className="row ac jb" style={{ padding: '11px 13px', borderBottom: '1px solid var(--line)' }}>
        <div><div style={{ fontWeight: 700, fontSize: 13, color: 'var(--navy)' }}>Rekonsiliasi Sub-ledger ↔ GL</div><div className="tiny muted">Register foot ke akun kontrol WTB</div></div>
        <div style={{ textAlign: 'right' }}>
          <div className="mono" style={{ fontSize: 14, fontWeight: 700, color: reg.reconciled ? 'var(--green)' : 'var(--red)' }}>{reg.reconciled ? 'MENUTUP' : 'SELISIH'}</div>
          <div className="tiny muted">gerbang posting</div>
        </div>
      </div>
      <div style={{ padding: '6px 13px 12px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
          <thead>
            <tr style={{ color: 'var(--ink-4)', textAlign: 'right' }}>
              <th style={{ textAlign: 'left', fontWeight: 600, padding: '6px 2px' }}>Total kontrol</th>
              <th style={{ fontWeight: 600, padding: '6px 2px' }}>Sub-ledger</th>
              <th style={{ fontWeight: 600, padding: '6px 2px' }}>GL (WTB)</th>
              <th style={{ fontWeight: 600, padding: '6px 2px' }}>Selisih</th>
            </tr>
          </thead>
          <tbody>
            {reg.recon.map(r => (
              <tr key={r.id} style={{ borderTop: '1px solid var(--line-soft)' }}>
                <td style={{ padding: '7px 2px' }}><span style={{ fontWeight: 600 }}>{r.label}</span> <span className="mono tiny" style={{ color: 'var(--ink-4)' }}>{r.code}</span></td>
                <td className="mono" style={{ textAlign: 'right', padding: '7px 2px' }}>{sc(r.sub)}</td>
                <td className="mono" style={{ textAlign: 'right', padding: '7px 2px' }}>{sc(r.gl)}</td>
                <td className="mono" style={{ textAlign: 'right', padding: '7px 2px', fontWeight: 700, color: r.ok ? 'var(--green)' : 'var(--red)' }}>{r.ok ? '0' : sc(r.diff)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div onClick={() => nav('wtb', { from: 'psak16' })} className="tiny" style={{ marginTop: 9, padding: '8px 10px', borderRadius: 7, background: reg.reconciled ? 'var(--green-bg)' : 'var(--amber-bg)', cursor: 'pointer', lineHeight: 1.45 }}>
          {reg.reconciled
            ? <>Total register <b>menutup persis</b> ke akun kontrol GL (WTB 1-2100 & 1-2110). Posting di-izinkan — sub-ledger menjadi rincian pendukung saldo neraca tanpa selisih rekonsiliasi.</>
            : <>Terdapat selisih sub-ledger vs GL → posting <b>diblokir</b> hingga selisih ditelusuri (mis. aset dalam penyelesaian belum masuk register).</>}
        </div>
      </div>
    </Panel>
  );
}

/* ——— Mekanisme impor Excel: pemetaan, validasi, otomasi ——— */
function ImportMappingPanel({ reg, fmt, nav }) {
  const [mode, setMode] = useStateP16R(() => (window.loadLS ? window.loadLS('ams.psak16.importmode', 'auto') : 'auto'));
  const setM = (m) => { setMode(m); try { localStorage.setItem('ams.psak16.importmode', JSON.stringify(m)); } catch (e) {} };

  const checks = [
    { t: 'Header kolom cocok dengan template tersimpan', ok: true, n: '8/8 kolom' },
    { t: 'Kelompok dikenali (5 kategori ¶73)', ok: true, n: reg.count + ' baris' },
    { t: 'Harga perolehan & akumulasi bernilai numerik', ok: true, n: '0 galat' },
    { t: 'Tanggal perolehan format valid (memengaruhi umur)', ok: true, n: '0 galat' },
    { t: 'Tidak ada No. Aset (tag) duplikat', ok: true, n: 'unik' },
    { t: 'Total kontrol cocok dengan akun GL (WTB)', ok: reg.reconciled, n: reg.reconciled ? 'menutup' : 'selisih' },
  ];
  const passed = checks.filter(c => c.ok).length;

  const MODES = {
    auto:  { t: 'Otomatis', d: 'Template pemetaan klien tersimpan dari periode lalu. Header dikenali, baris terbaca & tervalidasi, di-posting otomatis bila total kontrol cocok GL. Cocok untuk re-impor periode berikutnya.' },
    semi:  { t: 'Semi-otomatis', d: 'Aplikasi menebak pemetaan kolom (fuzzy-match nama header) lalu meminta konfirmasi sebelum impor. Dipakai saat struktur file sedikit berubah.' },
    manual:{ t: 'Manual', d: 'Pengguna memetakan tiap kolom Excel ke field aplikasi satu per satu. Dipakai pada impor pertama / format file baru, lalu pemetaan disimpan jadi template.' },
  };

  return (
    <Panel noBody>
      <div className="panel-h">
        <h3>Mekanisme Impor — Pemetaan Excel</h3>
        <div style={{ flex: 1 }} />
        <span className="tiny muted">register-aset-tetap.xlsx</span>
      </div>
      <div style={{ padding: '10px 14px 14px', display: 'grid', gap: 12 }}>

        {/* file + tingkat otomasi */}
        <div className="row gap10" style={{ alignItems: 'stretch' }}>
          <div className="panel row ac gap9" style={{ flex: 1, padding: '9px 11px' }}>
            <span style={{ width: 32, height: 32, borderRadius: 7, background: 'var(--green-bg)', color: 'var(--green)', display: 'grid', placeItems: 'center', flex: '0 0 32px' }}><I.table size={16} /></span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>register-aset-tetap.xlsx</div>
              <div className="tiny muted">Sheet "Daftar Aset" · {reg.count} baris · 8 kolom terdeteksi</div>
            </div>
          </div>
        </div>

        <div>
          <div className="tiny upper muted" style={{ fontWeight: 700, letterSpacing: '.04em', marginBottom: 6 }}>Tingkat Otomasi</div>
          <div className="seg" style={{ width: '100%' }}>
            {Object.keys(MODES).map(k => (
              <button key={k} className={mode === k ? 'on' : ''} onClick={() => setM(k)} style={{ flex: 1 }}>{MODES[k].t}</button>
            ))}
          </div>
          <div className="tiny" style={{ marginTop: 7, lineHeight: 1.5, color: 'var(--ink-2)' }}>{MODES[mode].d}</div>
        </div>

        {/* pemetaan kolom */}
        <div>
          <div className="tiny upper muted" style={{ fontWeight: 700, letterSpacing: '.04em', marginBottom: 6 }}>Pemetaan Kolom → Field Aplikasi</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
              <thead>
                <tr style={{ color: 'var(--ink-4)', textAlign: 'left' }}>
                  <th style={{ fontWeight: 600, padding: '5px 6px' }}>Kol</th>
                  <th style={{ fontWeight: 600, padding: '5px 6px' }}>Header Excel</th>
                  <th style={{ fontWeight: 600, padding: '5px 6px' }}>Field aplikasi</th>
                  <th style={{ fontWeight: 600, padding: '5px 6px' }}>Tipe</th>
                  <th style={{ fontWeight: 600, padding: '5px 6px', textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {reg.map.map((m, i) => (
                  <tr key={m.col} style={{ borderTop: '1px solid var(--line-soft)' }}>
                    <td className="mono" style={{ padding: '6px 6px', color: 'var(--ink-4)' }}>{m.col}</td>
                    <td style={{ padding: '6px 6px' }}>{m.xls}{m.key && <span className="tiny" style={{ color: 'var(--purple)', fontWeight: 600, marginLeft: 5 }}>kunci</span>}{m.ctrl && <span className="mono tiny" style={{ color: 'var(--blue)', marginLeft: 5 }}>→{m.ctrl}</span>}</td>
                    <td className="mono" style={{ padding: '6px 6px', fontWeight: 600 }}>{m.field}</td>
                    <td style={{ padding: '6px 6px', color: 'var(--ink-3)' }}>{m.type}</td>
                    <td style={{ padding: '6px 6px', textAlign: 'center' }}><span style={{ color: 'var(--green)' }}><I.checkCircle size={14} /></span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="tiny muted" style={{ marginTop: 5, lineHeight: 1.45 }}>
            Field bertanda <span className="mono" style={{ color: 'var(--blue)' }}>→1-2100</span>/<span className="mono" style={{ color: 'var(--blue)' }}>→1-2110</span> menjadi <b>total kontrol</b> yang direkonsiliasi ke akun GL sebelum posting.
          </div>
        </div>

        {/* validasi */}
        <div>
          <div className="row ac jb" style={{ marginBottom: 6 }}>
            <div className="tiny upper muted" style={{ fontWeight: 700, letterSpacing: '.04em' }}>Validasi Pra-Posting</div>
            <span className="mono tiny" style={{ fontWeight: 700, color: passed === checks.length ? 'var(--green)' : 'var(--amber)' }}>{passed}/{checks.length}</span>
          </div>
          <div style={{ display: 'grid', gap: 0 }}>
            {checks.map((c, i) => (
              <div key={i} className="row ac gap8" style={{ padding: '6px 0', borderTop: i ? '1px solid var(--line-soft)' : 0 }}>
                <span style={{ color: c.ok ? 'var(--green)' : 'var(--amber)', flex: '0 0 auto', display: 'grid', placeItems: 'center' }}>{c.ok ? <I.checkCircle size={14} /> : <I.alert size={14} />}</span>
                <span style={{ fontSize: 11.5, flex: 1, lineHeight: 1.3 }}>{c.t}</span>
                <span className="mono tiny" style={{ color: 'var(--ink-4)' }}>{c.n}</span>
              </div>
            ))}
          </div>
          <div className="row ac jb" style={{ marginTop: 9, padding: '8px 10px', borderRadius: 7, background: reg.reconciled ? 'var(--green-bg)' : 'var(--amber-bg)' }}>
            <span style={{ fontSize: 11.5, fontWeight: 600, color: reg.reconciled ? 'var(--green)' : 'var(--amber)' }}>{reg.reconciled ? 'Lolos — siap di-posting ke kertas kerja' : 'Tertahan — selisih kontrol harus ditelusuri'}</span>
            <span className="mono tiny" style={{ fontWeight: 700, color: 'var(--ink-3)' }}>gerbang control-total</span>
          </div>
        </div>
      </div>
    </Panel>
  );
}

Object.assign(window, { AssetRegisterTable, SubLedgerRecon, ImportMappingPanel });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { AssetRegisterTable, ImportMappingPanel, SubLedgerRecon };
