/* [codemod] ESM imports */
import { useAudit, useFirm, useNav } from './contexts.jsx';
import { I, MODULE_INDEX } from './icons.jsx';
import { Badge, Panel, Stat } from './ui.jsx';

/* ============================================================
   NeoSuite AMS — Lapisan Referensi + Status SA (Sumber Tunggal)
   ------------------------------------------------------------
   Halaman SA 5xx adalah lapisan RUJUKAN (pedagogi standar, statis)
   + STATUS yang dibaca langsung dari kertas kerja kanonik
   (wpState + WTB + risiko) via window.deriveWpStatus. Tidak ada
   salinan status perikatan yang disimpan di halaman SA.
   ============================================================ */

/* Peta Standar Audit → kertas kerja kanonik yang memenuhinya */
const SA_WP_MAP = {
  sa501: { refs: ['C', 'R'], focus: 'Observasi persediaan (C) & evaluasi informasi segmen pada pendapatan (R). Litigasi & klaim dirujuk ke register hukum.' },
  sa520: { refs: ['R', 'S', 'U'], focus: 'Prosedur analitis substantif atas Pendapatan (R), Beban Pokok Penjualan (S) & Beban Operasi (U).' },
  sa530: { refs: ['B', 'AA'], focus: 'Sampling audit — konfirmasi piutang MUS (B) & uji utang usaha (AA).' },
  sa540: { refs: ['B', 'E', 'F', 'H'], focus: 'Estimasi akuntansi — CKPN/ECL (B), penyusutan (E), sewa PSAK 73 (F) & imbalan kerja (H).' },
  sa580: { refs: ['810', '900'], focus: 'Representasi tertulis pada finalisasi — evaluasi salah saji (810) & draf laporan/opini (900).' },
};

/* status WP → warna badge (selaras dengan modul Kertas Kerja) */
function saStatusKind(s) {
  return s === 'Reviewed' ? 'green' : s === 'In Review' ? 'blue' : s === 'In Progress' ? 'amber' : 'gray';
}
function saCoverageBadge(cov) {
  if (!cov) return <span className="muted tiny">—</span>;
  if (cov.level === 'full') return <Badge kind="teal">≥ PM</Badge>;
  if (cov.level === 'partial') return <Badge kind="blue">Parsial</Badge>;
  return <Badge kind="gray">Trivial</Badge>;
}

/* baca status kanonik untuk seluruh WP yang dipetakan ke sebuah standar */
function useSACanon(stdId) {
  const audit = useAudit();
  const firm = useFirm();
  const navigate = useNav();
  const map = SA_WP_MAP[stdId] || { refs: [], focus: '' };
  const derive = window.deriveWpStatus;
  const rows = (derive ? map.refs.map(r => derive(r, audit, firm)) : []).filter(Boolean);
  const agg = rows.reduce((a, r) => ({
    done: a.done + r.done, total: a.total + r.total, exc: a.exc + r.exc,
    openNotes: a.openNotes + r.openNotes, fullySigned: a.fullySigned + (r.fullySigned ? 1 : 0),
    risks: a.risks + r.relRisks.length, covFull: a.covFull + (r.coverage && r.coverage.level === 'full' ? 1 : 0),
  }), { done: 0, total: 0, exc: 0, openNotes: 0, fullySigned: 0, risks: 0, covFull: 0 });
  agg.pct = agg.total ? Math.round(agg.done / agg.total * 100) : 0;
  agg.count = rows.length;
  return { rows, agg, map, navigate };
}

/* deretan badge ringkas untuk SubBar — menggantikan badge status statis */
function SACanonChips({ stdId }) {
  const { rows, agg } = useSACanon(stdId);
  if (!rows.length) return null;
  const kind = agg.exc > 0 ? 'amber' : agg.openNotes > 0 ? 'amber' : agg.done === agg.total ? 'green' : 'blue';
  return (
    <>
      <Badge kind={kind} dot>{agg.done}/{agg.total} prosedur · {agg.fullySigned}/{agg.count} WP ter-review</Badge>
      {agg.openNotes > 0 && <Badge kind="amber">{agg.openNotes} catatan</Badge>}
      {agg.exc > 0 && <Badge kind="red">{agg.exc} pengecualian</Badge>}
    </>
  );
}

/* rangkaian titik sign-off (preparer → reviewer → partner → EQR) */
function SignoffDots({ signoff }) {
  return (
    <span className="row ac" style={{ gap: 4 }}>
      {signoff.map((l, i) => (
        <span key={l.key} title={`${l.role}${l.signed ? ' · ' + l.signed.by + ' (' + l.signed.at + ')' : ' · belum'}`}
          style={{ width: 16, height: 16, borderRadius: '50%', display: 'grid', placeItems: 'center', flex: '0 0 16px',
            background: l.signed ? 'var(--green-bg)' : 'var(--surface-3)', color: l.signed ? 'var(--green)' : 'var(--ink-4)',
            border: '1px solid ' + (l.signed ? 'var(--green)' : 'var(--line-strong)') }}>
          {l.signed ? <I.check size={10} /> : <span className="mono" style={{ fontSize: 8, fontWeight: 700 }}>{i + 1}</span>}
        </span>
      ))}
    </span>
  );
}

/* Panel utama — lapisan referensi + status kanonik */
function SACanonicalStatus({ stdId }) {
  const { rows, agg, map, navigate } = useSACanon(stdId);
  const meta = (typeof MODULE_INDEX !== 'undefined' && MODULE_INDEX[stdId]) || { label: stdId };
  const open = (ref) => { if (window.openCanonicalWp) window.openCanonicalWp(navigate, ref); };

  if (!rows.length) return null;

  const stats = [
    { v: `${agg.done}/${agg.total}`, l: 'Prosedur Selesai', a: agg.done === agg.total ? 'var(--green)' : 'var(--blue)' },
    { v: agg.exc, l: 'Pengecualian', a: agg.exc ? 'var(--red)' : 'var(--ink)' },
    { v: agg.openNotes, l: 'Catatan Review Terbuka', a: agg.openNotes ? 'var(--amber)' : 'var(--ink)' },
    { v: `${agg.fullySigned}/${agg.count}`, l: 'WP Ter-review Penuh', a: agg.fullySigned === agg.count ? 'var(--green)' : 'var(--amber)' },
    { v: agg.risks, l: 'Risiko Teralamatkan', a: agg.risks ? 'var(--purple)' : 'var(--ink)' },
  ];

  return (
    <Panel noBody style={{ marginBottom: 12, borderColor: 'var(--blue-100, var(--line))' }}>
      <div className="panel-h" style={{ background: 'var(--blue-050)', borderBottom: '1px solid var(--line)' }}>
        <span className="row ac gap8">
          <span style={{ width: 26, height: 26, borderRadius: 7, background: 'var(--navy)', color: '#fff', display: 'grid', placeItems: 'center', flex: '0 0 26px' }}><I.layers size={14} /></span>
          <span>
            <span style={{ display: 'block', fontWeight: 700, fontSize: 13 }}>Status Perikatan · Sumber Tunggal</span>
            <span className="tiny muted" style={{ fontWeight: 400 }}>Dibaca langsung dari Kertas Kerja kanonik — tanpa salinan data di halaman ini</span>
          </span>
        </span>
        <div style={{ flex: 1 }} />
        <button className="btn sm" onClick={() => navigate('workpapers')}><I.arrowRight size={13} /> Buka Kertas Kerja</button>
      </div>

      {/* strip ringkasan agregat */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(5,1fr)', gap: 0, borderBottom: '1px solid var(--line-soft)' }}>
        {stats.map((s, i) => (
          <div key={i} style={{ padding: '11px 16px', borderRight: i < stats.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
            <Stat value={s.v} label={s.l} accent={s.a} />
            {i === 0 && <div className="pbar" style={{ marginTop: 6 }}><span style={{ width: agg.pct + '%', background: agg.pct === 100 ? 'var(--green)' : 'var(--blue)' }} /></div>}
          </div>
        ))}
      </div>

      {/* peta WP kanonik */}
      <table className="dtbl">
        <thead><tr>
          <th style={{ width: 54 }}>Ref</th><th>Kertas Kerja</th>
          <th style={{ width: 104 }}>Status</th>
          <th style={{ width: 138 }}>Prosedur</th>
          <th style={{ width: 78 }}>Cakupan</th>
          <th style={{ width: 60, textAlign: 'center' }}>Catatan</th>
          <th style={{ width: 96 }}>Sign-off</th>
          <th style={{ width: 92 }}></th>
        </tr></thead>
        <tbody>
          {rows.map(r => {
            const pct = r.total ? Math.round(r.done / r.total * 100) : 0;
            return (
              <tr key={r.ref} style={{ cursor: 'pointer' }} onClick={() => open(r.ref)}>
                <td className="mono" style={{ fontWeight: 700, color: 'var(--blue)' }}>{r.ref}</td>
                <td style={{ fontWeight: 600 }}>
                  <span className="row ac gap6">{r.title}
                    {r.exc > 0 && <span title={r.exc + ' pengecualian'} style={{ color: 'var(--red)', display: 'inline-flex' }}><I.alert size={12} /></span>}
                    {r.relRisks.length > 0 && <span title={r.relRisks.length + ' risiko teralamatkan'} style={{ color: 'var(--purple)', display: 'inline-flex' }}><I.shield size={12} /></span>}
                  </span>
                  <span className="tiny muted" style={{ fontWeight: 400 }}>{r.section}</span>
                </td>
                <td><Badge kind={saStatusKind(r.status)}>{r.status}</Badge></td>
                <td>
                  <div className="row ac gap6">
                    <div className="pbar" style={{ flex: 1 }}><span style={{ width: pct + '%', background: pct === 100 ? 'var(--green)' : 'var(--blue)' }} /></div>
                    <span className="mono tiny muted" style={{ flex: '0 0 30px', textAlign: 'right' }}>{r.done}/{r.total}</span>
                  </div>
                </td>
                <td>{saCoverageBadge(r.coverage)}</td>
                <td style={{ textAlign: 'center' }}>{r.openNotes > 0 ? <Badge kind="amber">{r.openNotes}</Badge> : <span className="muted tiny">—</span>}</td>
                <td><SignoffDots signoff={r.signoff} /></td>
                <td><button className="btn sm" onClick={(e) => { e.stopPropagation(); open(r.ref); }}>Buka WP <I.arrowRight size={12} /></button></td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div style={{ padding: '9px 14px', background: 'var(--surface-2)', borderTop: '1px solid var(--line)' }}>
        <div className="row gap8" style={{ alignItems: 'flex-start' }}>
          <span style={{ color: 'var(--blue)', flex: '0 0 auto', marginTop: 1 }}><I.book size={13} /></span>
          <span className="tiny muted" style={{ lineHeight: 1.45 }}>{map.focus} <b style={{ color: 'var(--ink-2)' }}>Konten di bawah adalah rujukan standar (statis)</b> — seluruh angka & status perikatan hanya hidup di Kertas Kerja kanonik dan diperbarui di sana.</span>
        </div>
      </div>
    </Panel>
  );
}

/* Kartu Sign-off ringkas — menggantikan kartu sign-off statis di halaman SA */
function SASignoffMini({ stdId }) {
  const { rows, navigate } = useSACanon(stdId);
  const open = (ref) => { if (window.openCanonicalWp) window.openCanonicalWp(navigate, ref); };
  return (
    <Panel title="Sign-off (Kertas Kerja)" sub="Sumber tunggal — dari WP kanonik">
      <div style={{ display: 'grid', gap: 9 }}>
        {rows.map((r, i) => (
          <div key={r.ref} className="row jb ac" style={{ fontSize: 12, paddingBottom: 9, borderBottom: i < rows.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
            <div className="row ac gap8" style={{ minWidth: 0 }}>
              <span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)', flex: '0 0 auto' }}>{r.ref}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600 }} className="truncate">{r.title}</div>
                <div className="tiny"><Badge kind={saStatusKind(r.status)}>{r.status}</Badge></div>
              </div>
            </div>
            <div className="row ac gap8" style={{ flex: '0 0 auto' }}>
              <SignoffDots signoff={r.signoff} />
              <button className="btn sm icon" title="Buka WP kanonik" onClick={() => open(r.ref)}><I.arrowRight size={13} /></button>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

Object.assign(window, { SA_WP_MAP, useSACanon, SACanonChips, SACanonicalStatus, SASignoffMini, SignoffDots });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { SACanonChips, SACanonicalStatus, SASignoffMini, SA_WP_MAP, SignoffDots, useSACanon };
