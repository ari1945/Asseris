/* [codemod] ESM imports */
import React from 'react';
import { I } from './icons';
import { Badge, Btn, Panel, Seg } from './ui.jsx';
import { useWpSignoff } from './wp_signoff.jsx';

/* ============================================================
   Asseris — FS Generator · Workspace panels
   Left rail (statement nav · presentation · sign-off) and
   right dock (validation/tie-out · account mapping · disclosure checklist).
   ============================================================ */
const { useMemo: useMemoFP } = React;

/* ---------------- Left rail: statement navigator ---------------- */
function FSStatementNav({ items, active, onChange }) {
  return (
    <Panel noBody className="">
      <div className="panel-h" style={{ padding: '8px 12px' }}>
        <h3 style={{ fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--navy)' }}>Komponen Laporan</h3>
      </div>
      <div style={{ padding: 5 }}>
        {items.map(s => {
          const on = active === s.id;
          const col = s.status === 'ok' ? 'var(--green)' : s.status === 'warn' ? 'var(--amber)' : 'var(--red)';
          return (
            <button key={s.id} onClick={() => onChange(s.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', textAlign: 'left',
                border: 0, background: on ? 'var(--blue-100)' : 'transparent', color: on ? 'var(--blue)' : 'var(--ink-2)',
                borderRadius: 6, padding: '7px 9px', cursor: 'pointer', fontWeight: on ? 700 : 500, fontSize: 12.5 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: col, flex: '0 0 7px' }} title={s.statusLabel} />
              <span style={{ flex: 1 }}>{s.label}</span>
              <span className="mono tiny" style={{ color: on ? 'var(--blue)' : 'var(--ink-4)' }}>{s.tag}</span>
            </button>
          );
        })}
      </div>
    </Panel>
  );
}

/* ---------------- Left rail: presentation controls ---------------- */
function FSPresentation({ unit, setUnit, comparative, setComparative, rounding, setRounding, cfMethod, setCfMethod, listed }) {
  return (
    <Panel noBody>
      <div className="panel-h" style={{ padding: '8px 12px' }}>
        <h3 style={{ fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--navy)' }}>Penyajian</h3>
      </div>
      <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 11 }}>
        <div className="field">
          <label>Satuan angka</label>
          <Seg options={[{ value: 'jutaan', label: 'Jutaan' }, { value: 'ribuan', label: 'Ribuan' }, { value: 'penuh', label: 'Penuh' }]} value={unit} onChange={setUnit} />
        </div>
        {cfMethod && (
          <div className="field">
            <label>Metode arus kas</label>
            <Seg options={[{ value: 'direct', label: 'Langsung' }, { value: 'indirect', label: 'Tidak Langsung' }]} value={cfMethod} onChange={setCfMethod} />
            {listed
              ? <div className="tiny" style={{ color: 'var(--amber)', marginTop: 5, lineHeight: 1.45 }}>Entitas tercatat — <b>OJK mewajibkan metode langsung</b>.</div>
              : <div className="tiny muted" style={{ marginTop: 5, lineHeight: 1.45 }}>Metode langsung wajib bagi emiten; tidak langsung lazim untuk entitas non-publik.</div>}
          </div>
        )}
        <div className="row ac jb">
          <span style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>Kolom komparatif 2024</span>
          <Toggle on={comparative} set={() => setComparative(v => !v)} />
        </div>
        <div className="row ac jb">
          <span style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>Pembulatan ke satuan</span>
          <Toggle on={rounding} set={() => setRounding(v => !v)} />
        </div>
        <div className="tiny muted" style={{ lineHeight: 1.5 }}>
          Mata uang penyajian <b style={{ color: 'var(--ink-2)' }}>Rupiah (IDR)</b>. Standar <b style={{ color: 'var(--ink-2)' }}>SAK · PSAK</b>. Periode <b style={{ color: 'var(--ink-2)' }}>FY2025</b>.
        </div>
      </div>
    </Panel>
  );
}

function Toggle({ on, set }) {
  return (
    <span onClick={set} style={{ width: 36, height: 20, borderRadius: 11, background: on ? 'var(--blue)' : 'var(--line-strong)', position: 'relative', cursor: 'pointer', flex: '0 0 36px', transition: '.15s' }}>
      <span style={{ position: 'absolute', top: 2, left: on ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: '.15s' }} />
    </span>
  );
}

/* ---------------- Left rail: review sign-off (kanonik wpState['fsgen']) ---------------- */
function FSSignoff({ moduleId }) {
  const s = useWpSignoff(moduleId || 'fsgen');
  const Step = ({ signed, role, fallbackWho, canSign, onSign }) => (
    <div className="row ac jb" style={{ padding: '7px 0', borderBottom: '1px solid var(--line-soft)' }}>
      <div>
        <div className="tiny upper" style={{ color: 'var(--ink-4)', fontWeight: 700 }}>{role}</div>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: signed ? 'var(--ink)' : 'var(--ink-4)' }}>{signed ? signed.by : fallbackWho}</div>
        {signed && <div className="tiny mono muted">{signed.at}</div>}
      </div>
      {signed
        ? <Badge kind="green"><I.check size={11} /> Selesai</Badge>
        : <Btn sm disabled={!canSign} onClick={onSign}>Tandatangani</Btn>}
    </div>
  );
  const allDone = !!s.reviewer;
  return (
    <Panel noBody>
      <div className="panel-h" style={{ padding: '8px 12px' }}>
        <h3 style={{ fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--navy)' }}>Status & Tanda Tangan</h3>
      </div>
      <div style={{ padding: '4px 12px 12px' }}>
        <Step signed={s.preparer} role="Disusun oleh" fallbackWho={s.me} canSign={!s.locked} onSign={() => s.sign('preparer')} />
        <Step signed={s.reviewer} role="Direviu oleh" fallbackWho="menunggu reviewer" canSign={!s.locked && !!s.preparer} onSign={() => s.sign('reviewer')} />
        <div className="row ac jb" style={{ paddingTop: 10 }}>
          <span style={{ fontSize: 12.5, fontWeight: 600 }}>Status laporan</span>
          <Badge kind={allDone ? 'green' : 'amber'}>{allDone ? 'Final — siap EQR' : 'Draft kerja'}</Badge>
        </div>
      </div>
    </Panel>
  );
}

/* ---------------- Right dock: tie-out / validation ---------------- */
function FSValidationPanel({ checks, sc, unitShort }) {
  const passed = checks.filter(c => c.ok).length;
  return (
    <div>
      <div className="row ac jb" style={{ padding: '11px 13px', borderBottom: '1px solid var(--line)' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--navy)' }}>Validasi & Tie-out</div>
          <div className="tiny muted">Rekonsiliasi silang antar laporan</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="mono" style={{ fontSize: 17, fontWeight: 700, color: passed === checks.length ? 'var(--green)' : 'var(--amber)' }}>{passed}/{checks.length}</div>
          <div className="tiny muted">lolos</div>
        </div>
      </div>
      <div style={{ padding: 9, display: 'flex', flexDirection: 'column', gap: 7 }}>
        {checks.map(c => (
          <div key={c.id} style={{ border: '1px solid var(--line)', borderRadius: 7, padding: '9px 10px', background: c.ok ? 'var(--surface)' : 'var(--amber-bg)' }}>
            <div className="row ac gap8" style={{ marginBottom: 5 }}>
              <span style={{ color: c.ok ? 'var(--green)' : 'var(--amber)', display: 'grid', placeItems: 'center' }}>
                {c.ok ? <I.checkCircle size={16} /> : <I.alert size={16} />}
              </span>
              <span style={{ fontWeight: 600, fontSize: 12.5, flex: 1, color: 'var(--ink)' }}>{c.label}</span>
              <Badge kind="gray">{c.std}</Badge>
            </div>
            <div className="tiny muted" style={{ marginBottom: 6, paddingLeft: 24, lineHeight: 1.45 }}>{c.note}</div>
            <div className="row" style={{ paddingLeft: 24, gap: 0, fontFamily: 'var(--mono)', fontSize: 11 }}>
              <div style={{ flex: 1 }}>
                <div className="tiny" style={{ color: 'var(--ink-4)' }}>A</div>
                <div style={{ fontWeight: 600 }}>{sc(c.a)}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div className="tiny" style={{ color: 'var(--ink-4)' }}>B</div>
                <div style={{ fontWeight: 600 }}>{sc(c.b)}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div className="tiny" style={{ color: 'var(--ink-4)' }}>Selisih</div>
                <div style={{ fontWeight: 700, color: c.ok ? 'var(--green)' : 'var(--red)' }}>{sc(c.diff)}</div>
              </div>
            </div>
            <div className="tiny" style={{ paddingLeft: 24, marginTop: 4, color: 'var(--ink-4)' }}>Acuan: {c.ref}</div>
          </div>
        ))}
        <div className="tiny muted" style={{ padding: '4px 2px', lineHeight: 1.5 }}>
          Toleransi pembulatan Rp 1 jt. Nilai dalam {unitShort}. Pemeriksaan dijalankan ulang otomatis setiap WTB / AJE berubah.
        </div>
      </div>
    </div>
  );
}

/* ---------------- Right dock: account → FS mapping ---------------- */
function FSMappingPanel({ model, wtb, sc, activeKey, onPick }) {
  const byCode = useMemoFP(() => { const o = {}; wtb.forEach(r => o[r.code] = r); return o; }, [wtb]);
  const sections = [
    { t: 'Aset Lancar', lines: model.bs.ca },
    { t: 'Aset Tidak Lancar', lines: model.bs.nca },
    { t: 'Liabilitas Jangka Pendek', lines: model.bs.cl },
    { t: 'Liabilitas Jangka Panjang', lines: model.bs.ncl },
    { t: 'Ekuitas', lines: model.bs.eq },
  ];
  return (
    <div>
      <div style={{ padding: '11px 13px', borderBottom: '1px solid var(--line)' }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--navy)' }}>Pemetaan Akun → Laporan</div>
        <div className="tiny muted">Caption LK ditelusuri ke kode WTB (saldo adjusted)</div>
      </div>
      <div style={{ padding: 9 }}>
        {sections.map(sec => (
          <div key={sec.t} style={{ marginBottom: 10 }}>
            <div className="tiny upper" style={{ fontWeight: 700, color: 'var(--ink-4)', letterSpacing: '.05em', padding: '2px 2px 6px' }}>{sec.t}</div>
            {sec.lines.map(l => {
              const on = activeKey === l.key;
              return (
                <div key={l.key} onClick={() => onPick && onPick(l.key)}
                  style={{ border: '1px solid ' + (on ? 'var(--blue)' : 'var(--line)'), borderRadius: 6, padding: '7px 9px', marginBottom: 5, cursor: 'pointer', background: on ? 'var(--blue-050)' : 'var(--surface)' }}>
                  <div className="row ac jb" style={{ marginBottom: 3 }}>
                    <span style={{ fontWeight: 600, fontSize: 12 }}>{l.label}</span>
                    <span className="mono tiny" style={{ fontWeight: 700 }}>{sc(l.cy)}</span>
                  </div>
                  {l.codes.map(c => {
                    const r = byCode[c] || {};
                    return (
                      <div key={c} className="row ac jb" style={{ padding: '2px 0' }}>
                        <span className="row ac gap6">
                          <span className="mono tiny" style={{ color: 'var(--blue)', fontWeight: 600 }}>{c}</span>
                          <span className="tiny" style={{ color: 'var(--ink-3)' }}>{r.name}</span>
                        </span>
                        <span className="row ac gap6">
                          {r.lead && <span className="chip tiny" style={{ height: 16, padding: '0 5px', fontFamily: 'var(--mono)' }}>{r.lead}</span>}
                          <span className="mono tiny muted">{sc(r.adj || 0)}</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Right dock: PSAK disclosure checklist ---------------- */
function FSDisclosurePanel({ disclosures, setDisclosures, locked }) {
  const done = disclosures.filter(d => d.done).length;
  const pct = Math.round((done / disclosures.length) * 100);
  const toggle = (id) => !locked && setDisclosures(list => list.map(d => d.id === id ? { ...d, done: !d.done } : d));
  return (
    <div>
      <div style={{ padding: '11px 13px', borderBottom: '1px solid var(--line)' }}>
        <div className="row ac jb">
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--navy)' }}>Checklist Pengungkapan</div>
            <div className="tiny muted">Kelengkapan CALK terhadap PSAK</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="mono" style={{ fontSize: 17, fontWeight: 700, color: pct === 100 ? 'var(--green)' : 'var(--amber)' }}>{pct}%</div>
            <div className="tiny muted">{done}/{disclosures.length} item</div>
          </div>
        </div>
        <div className="pbar" style={{ marginTop: 8 }}><span style={{ width: pct + '%', background: pct === 100 ? 'var(--green)' : 'var(--amber)' }} /></div>
      </div>
      <div style={{ padding: 9, display: 'flex', flexDirection: 'column', gap: 5 }}>
        {disclosures.map(d => (
          <div key={d.id} onClick={() => toggle(d.id)}
            style={{ display: 'flex', alignItems: 'flex-start', gap: 9, padding: '7px 9px', border: '1px solid var(--line)', borderRadius: 6, cursor: locked ? 'default' : 'pointer', background: d.done ? 'var(--green-bg)' : 'var(--surface)' }}>
            <span style={{ width: 16, height: 16, borderRadius: 4, flex: '0 0 16px', marginTop: 1, border: '1.5px solid ' + (d.done ? 'var(--green)' : 'var(--line-strong)'), background: d.done ? 'var(--green)' : '#fff', display: 'grid', placeItems: 'center', color: '#fff' }}>
              {d.done && <I.check size={11} />}
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--ink)', lineHeight: 1.35 }}>{d.label}</div>
              <div className="row ac gap6" style={{ marginTop: 3 }}>
                <Badge kind="blue">{d.psak}</Badge>
                <span className="tiny muted">Catatan {d.note}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { FSStatementNav, FSPresentation, FSSignoff, FSValidationPanel, FSMappingPanel, FSDisclosurePanel });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { FSDisclosurePanel, FSMappingPanel, FSPresentation, FSSignoff, FSStatementNav, FSValidationPanel };
