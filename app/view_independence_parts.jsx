/* ============================================================
   NeoSuite AMS — Independensi: dimensi etika di luar rotasi (G6)
   Tab tambahan untuk modul Independence:
     · Ketergantungan Imbalan (IESBA 410)
     · Pra-Persetujuan NAS (IESBA 600-series)
     · Asosiasi Jangka Panjang (IESBA 540)
   Komponen di-ekspor ke window untuk dipakai view_people.jsx.
   ============================================================ */
const { useState: useStateIP } = React;

/* ---- Ketergantungan Imbalan ---- */
function FeeDependencyTab() {
  const A = window.AMS, fmt = A.fmt;
  const F = A.FEE_DEPENDENCY;
  const rows = F.rows;
  const triggers = rows.filter(r => r.trigger);
  const barCol = (r) => r.trigger ? 'var(--red)' : r.overCur ? 'var(--amber)' : 'var(--green)';

  return (
    <div style={{ padding: 14 }}>
      <p style={{ margin: '0 0 12px', fontSize: 12, lineHeight: 1.55, color: 'var(--ink-2)', maxWidth: 760 }}>
        Untuk klien <b>kepentingan publik (PIE)</b>, total imbalan dari satu klien (termasuk entitas berelasi) yang melampaui <b>{F.threshold}% total imbalan firma</b> selama <b>dua tahun berturut-turut</b> memicu pengamanan & komunikasi ke pihak tata kelola (TCWG). Imbalan ditarik dari <span className="mono">PPPK_CLIENTS</span> (sumber tunggal); persentase dihitung atas total imbalan firma Rp {fmt(F.firmRevCur)} jt (TA-1: Rp {fmt(F.firmRevPrior)} jt).
      </p>
      {triggers.length > 0 && (
        <div className="panel" style={{ padding: '11px 14px', marginBottom: 12, background: 'var(--red-bg)', borderColor: 'transparent' }}>
          <div className="row ac gap8"><span style={{ color: 'var(--red)' }}><I.alert size={16} /></span><span className="tiny" style={{ fontWeight: 600, lineHeight: 1.5 }}>{triggers.length} klien PIE melampaui ambang {F.threshold}% dua tahun berturut: <b>{triggers.map(t => t.name.replace('PT ', '')).join(', ')}</b> — wajib pengamanan & komunikasi TCWG (IESBA 410).</span></div>
        </div>
      )}
      <table className="dtbl">
        <thead><tr><th>Klien</th><th>PIE</th><th className="num">Imbalan TA</th><th style={{ width: 150 }}>% Imbalan Firma (2 thn)</th><th>Status</th><th>Pengamanan</th></tr></thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id}>
              <td style={{ fontWeight: 600, fontSize: 12.5 }}>{r.name.replace('PT ', '')}{r.sektorJK && <span className="badge b-teal" style={{ fontSize: 8, padding: '0 4px', marginLeft: 5 }}>JK</span>}</td>
              <td>{r.pie ? <Badge kind="red">PIE</Badge> : <span className="tiny muted">Non-PIE</span>}</td>
              <td className="num mono tiny">Rp {fmt(r.curFee)} jt</td>
              <td>
                <div className="row ac gap6" style={{ marginBottom: 3 }}>
                  <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--surface-3)', position: 'relative' }}>
                    <div style={{ width: Math.min(100, r.curPct / 25 * 100) + '%', height: '100%', borderRadius: 3, background: barCol(r) }} />
                    <div title={'Ambang ' + F.threshold + '%'} style={{ position: 'absolute', left: (F.threshold / 25 * 100) + '%', top: -2, bottom: -2, width: 1.5, background: 'var(--ink-3)' }} />
                  </div>
                  <span className="mono tiny" style={{ fontWeight: 700, color: barCol(r), width: 38, textAlign: 'right' }}>{r.curPct}%</span>
                </div>
                <div className="tiny muted mono">TA-1: {r.priorPct}%</div>
              </td>
              <td><Badge kind={r.trigger ? 'red' : r.overCur ? 'amber' : 'green'}>{r.status}</Badge></td>
              <td className="tiny muted" style={{ whiteSpace: 'normal', lineHeight: 1.4, maxWidth: 230 }}>{r.safeguard}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="tiny muted" style={{ marginTop: 8, lineHeight: 1.5 }}>Garis vertikal pada bilah = ambang {F.threshold}% (IESBA 410). Imbalan jatuh tempo yang lama setara pinjaman & menambah ancaman kepentingan pribadi — dipantau bersama piutang klien.</div>
    </div>
  );
}

/* ---- Pra-Persetujuan Jasa Selain Asurans (NAS) ---- */
function NASPreApprovalTab() {
  const A = window.AMS;
  const list = A.NAS_PREAPPROVAL, prohib = A.NAS_PROHIBITION;
  const [sel, setSel] = useStateIP(null);
  const rejected = list.filter(n => n.status === 'Ditolak').length;
  const pending = list.filter(n => n.status === 'Menunggu').length;
  const srCol = (s) => s === 'Tinggi' ? 'var(--red)' : s === 'Sedang' ? 'var(--amber)' : 'var(--green)';
  const stKind = (s) => s === 'Disetujui' ? 'green' : s === 'Ditolak' ? 'red' : 'amber';

  return (
    <div style={{ padding: 14 }}>
      <p style={{ margin: '0 0 12px', fontSize: 12, lineHeight: 1.55, color: 'var(--ink-2)', maxWidth: 770 }}>
        Setiap jasa selain asurans (NAS) untuk klien audit melewati <b>pra-persetujuan</b> dengan menautkan jenis jasa ke <b>daftar larangan IESBA</b> untuk klien PIE. Jasa yang menimbulkan ancaman telaah-pribadi yang tidak dapat dimitigasi <b>dilarang</b> dan ditolak.
      </p>
      <div className="grid" style={{ gridTemplateColumns: sel ? '1fr 320px' : '1fr', gap: 12, alignItems: 'start' }}>
        <Panel noBody>
          <div className="panel-h"><h3>Portofolio NAS — Pra-Persetujuan</h3><div style={{ flex: 1 }} /><span className="row ac gap6">{rejected > 0 && <Badge kind="red">{rejected} ditolak</Badge>}{pending > 0 && <Badge kind="amber">{pending} menunggu</Badge>}</span></div>
          <table className="dtbl">
            <thead><tr><th>Ref</th><th>Klien / Jasa</th><th>PIE</th><th>Telaah-Pribadi</th><th>Keputusan</th></tr></thead>
            <tbody>
              {list.map(n => (
                <tr key={n.id} className={n.id === (sel && sel.id) ? 'sel' : ''} onClick={() => setSel(n)} style={{ cursor: 'pointer' }}>
                  <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{n.id}</td>
                  <td style={{ whiteSpace: 'normal', lineHeight: 1.35 }}><span style={{ fontWeight: 600, fontSize: 12 }}>{n.client.replace('PT ', '')}</span><div className="tiny muted">{n.svc}</div></td>
                  <td>{n.pie ? <Badge kind="red">PIE</Badge> : <span className="tiny muted">Non-PIE</span>}</td>
                  <td><span className="tiny" style={{ fontWeight: 600, color: srCol(n.selfReview) }}>{n.selfReview}</span></td>
                  <td><Badge kind={stKind(n.status)}>{n.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
        {sel ? (
          <Panel noBody>
            <div style={{ background: 'var(--surface-2)', padding: '11px 14px', borderBottom: '1px solid var(--line)' }}>
              <div className="row ac gap8"><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{sel.id}</span><Badge kind={stKind(sel.status)}>{sel.status}</Badge>{sel.prohibited && <Badge kind="red">Dilarang</Badge>}</div>
              <div style={{ fontWeight: 700, fontSize: 13, marginTop: 4 }}>{sel.client.replace('PT ', '')}</div>
            </div>
            <div style={{ padding: 14 }}>
              <div className="tiny muted upper" style={{ marginBottom: 4 }}>Jasa</div>
              <div style={{ fontSize: 12.5, marginBottom: 12, lineHeight: 1.45 }}>{sel.svc}</div>
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                <KvBox label="Kategori" v={sel.cat} />
                <KvBox label="Ancaman Telaah-Pribadi" v={sel.selfReview} accent={srCol(sel.selfReview)} />
              </div>
              <div className="panel" style={{ padding: '9px 11px', boxShadow: 'none', background: sel.prohibited ? 'var(--red-bg)' : 'var(--green-bg)', borderColor: 'transparent', marginBottom: 12 }}>
                <div className="tiny" style={{ fontWeight: 600, lineHeight: 1.45, color: sel.prohibited ? 'var(--red)' : '#155c3a' }}>{sel.prohibited ? <I.alert size={12} /> : <I.check size={12} />} {sel.basis}</div>
              </div>
              {sel.approver !== '—' && <KvBox label="Disetujui oleh" v={sel.approver} />}
            </div>
          </Panel>
        ) : (
          <Panel noBody>
            <div className="panel-h"><h3>Daftar Larangan NAS (PIE)</h3></div>
            <div style={{ padding: 10, display: 'grid', gap: 6 }}>
              {prohib.map(p => (
                <div key={p.ref} className="row ac gap8" style={{ padding: '7px 9px', border: '1px solid var(--line-soft)', borderRadius: 7 }}>
                  <span className="badge b-gray tiny mono" style={{ flex: '0 0 auto' }}>{p.ref}</span>
                  <span className="tiny" style={{ lineHeight: 1.35 }}>{p.svc}</span>
                </div>
              ))}
            </div>
            <div className="tiny muted" style={{ padding: '0 12px 12px', lineHeight: 1.5 }}>Klik baris portofolio untuk rincian keputusan & dasar IESBA.</div>
          </Panel>
        )}
      </div>
    </div>
  );
}

/* ---- Asosiasi Jangka Panjang ---- */
function LongAssociationTab() {
  const A = window.AMS;
  const list = A.LONG_ASSOCIATION;
  const flagCol = { over: 'var(--red)', due: 'var(--amber)', warn: 'var(--amber)', ok: 'var(--green)' };
  const flagLbl = { over: 'Melebihi batas', due: 'Rotasi tahun depan', warn: 'Tinjau', ok: 'Dalam batas' };
  return (
    <div style={{ padding: 14 }}>
      <p style={{ margin: '0 0 12px', fontSize: 12, lineHeight: 1.55, color: 'var(--ink-2)', maxWidth: 760 }}>
        Asosiasi jangka panjang personel senior (termasuk di luar AP penanda tangan — manajer kunci & EQR) dengan klien audit menimbulkan ancaman <b>kedekatan</b> (IESBA 540). Dipantau bersama pengamanan & rencana rotasi personel kunci.
      </p>
      <table className="dtbl">
        <thead><tr><th>Personel</th><th>Peran</th><th>Klien</th><th className="num">Masa Asosiasi</th><th>Rezim</th><th>Tindakan / Pengamanan</th></tr></thead>
        <tbody>
          {list.map((m, i) => (
            <tr key={i}>
              <td><div className="row ac gap8"><Avatar name={m.name} size={24} /><span style={{ fontWeight: 600 }}>{m.name}</span></div></td>
              <td className="tiny">{m.role}</td>
              <td className="tiny">{m.client.replace('PT ', '')}</td>
              <td className="num"><span className="mono" style={{ fontWeight: 700, color: flagCol[m.flag] }}>{m.years} th</span></td>
              <td className="tiny muted">{m.regime}</td>
              <td style={{ whiteSpace: 'normal', lineHeight: 1.4 }}><div className="row ac gap6" style={{ marginBottom: 2 }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: flagCol[m.flag] }} /><span className="tiny" style={{ fontWeight: 600, color: flagCol[m.flag] }}>{flagLbl[m.flag]}</span></div><span className="tiny muted">{m.action}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

Object.assign(window, { FeeDependencyTab, NASPreApprovalTab, LongAssociationTab });
