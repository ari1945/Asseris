/* ============================================================
   NeoSuite AMS — Lapisan Kertas Kerja: Sign-off + Bukti (P2)
   ------------------------------------------------------------
   Komponen BERSAMA yang menjadikan modul "kertas kerja auditable":
   tanda tangan preparer→reviewer (2-tingkat, lock LUNAK) + tautan
   bukti (required vs attached) + lencana kelengkapan.

   SUMBER KEBENARAN TUNGGAL: memakai `wpState`/`setWp` kanonik dari
   useAudit() (sama dgn modul Working Papers & deriveWpStatus) —
   BUKAN store paralel. Modul dipetakan ke ref WP kanonik (huruf)
   bila ada; selain itu memakai id modul sebagai key WP.
   Bukti memakai store evidence global (per-modul) yg sudah ada.
   ============================================================ */
import React from 'react';
import { useAudit, useAuth, useFirm } from './contexts.jsx';
import { I } from './icons.jsx';
import { Badge, Btn, Panel, Avatar, Progress } from './ui.jsx';
import { amsEvidenceCount } from './evidence.jsx';

const { useState: useStateWPS } = React;

/* ---- Fase 0: peta modul → ref WP kanonik + bukti yang diwajibkan (seed dari SA/WP) ---- */
const WP_MODULE_MAP = {
  /* dipetakan ke ref huruf kanonik → berbagi sign-off dgn register Kertas Kerja */
  psak14:  { ref: 'C',   requiredEvidence: ['Berita acara stock opname', 'Kertas kerja uji NRV'] },
  psak16:  { ref: 'E',   requiredEvidence: ['Register aset tetap', 'Vouching penambahan signifikan'] },
  psak71:  { ref: 'B',   requiredEvidence: ['Aging piutang', 'Model ECL PSAK 71', 'Konfirmasi piutang'] },
  psak73:  { ref: 'F',   requiredEvidence: ['Daftar kontrak sewa', 'Kalkulasi ROU & liabilitas sewa'] },
  lease:   { ref: 'F',   requiredEvidence: ['Daftar kontrak sewa', 'Kalkulasi ROU & liabilitas sewa'] },
  psak24:  { ref: 'H',   requiredEvidence: ['Laporan aktuaria', 'Rekonsiliasi data karyawan'] },
  revenue: { ref: 'R',   requiredEvidence: ['Analitis pendapatan', 'Sampel kontrak penjualan'] },
  psak72:  { ref: 'R',   requiredEvidence: ['Analisis 5-langkah pengakuan pendapatan', 'Sampel kontrak penjualan', 'Uji cut-off pendapatan'] },
  sad:     { ref: '810', requiredEvidence: ['Daftar salah saji (SAD)', 'Surat representasi manajemen'] },
  opinion: { ref: '900', requiredEvidence: ['Draf laporan auditor', 'Checklist pengungkapan LK'] },
  calc:    { ref: '300', requiredEvidence: ['Kertas kerja perhitungan materialitas'] },
  /* tanpa ref huruf → key = id modul (WP berlingkup modul) */
  psak1:   { ref: 'psak1',  requiredEvidence: ['Checklist penyajian & pengungkapan LK', 'Uji asumsi kelangsungan usaha'] },
  psak2:   { ref: 'psak2',  requiredEvidence: ['Rekonsiliasi arus kas (metode tidak langsung)', 'Klasifikasi operasi/investasi/pendanaan'] },
  psak19:  { ref: 'psak19', requiredEvidence: ['Register aset takberwujud', 'Uji amortisasi & penurunan nilai'] },
  psak46:  { ref: 'psak46', requiredEvidence: ['Rekonsiliasi fiskal', 'Skedul pajak tangguhan'] },
  psak48:  { ref: 'psak48', requiredEvidence: ['Uji penurunan nilai (value-in-use/DCF)'] },
  psak22:  { ref: 'psak22', requiredEvidence: ['Alokasi harga akuisisi (PPA)', 'Laporan penilai (KJPP)'] },
  psak25:  { ref: 'psak25', requiredEvidence: ['Register estimasi & perubahan kebijakan'] },
  psak57:  { ref: 'psak57', requiredEvidence: ['Register provisi & klaim', 'Surat penasihat hukum'] },
  psak58:  { ref: 'psak58', requiredEvidence: ['Penilaian disposal group', 'Resolusi divestasi'] },
  psak65:  { ref: 'psak65', requiredEvidence: ['Kertas kerja konsolidasi', 'Paket pelaporan komponen'] },
  psak66:  { ref: 'psak66', requiredEvidence: ['Perjanjian pengaturan bersama'] },
  psak68:  { ref: 'psak68', requiredEvidence: ['Laporan penilai nilai wajar (KJPP)'] },
  segmen:  { ref: 'segmen', requiredEvidence: ['Kertas kerja informasi segmen'] },
  assoc:   { ref: 'assoc',  requiredEvidence: ['Kertas kerja entitas asosiasi (ekuitas)'] },
  /* modul LK & standar sektor spesialis (blok tanda tangan kertas kerja CETAK + sign-off kanonik) */
  fsgen:   { ref: 'fsgen',   requiredEvidence: ['Kertas kerja tie-out laporan keuangan', 'Checklist penyajian & pengungkapan LK'] },
  isak35:  { ref: 'isak35',  requiredEvidence: ['Laporan keuangan entitas nonlaba (ISAK 35)', 'Checklist klasifikasi aset neto'] },
  psak117: { ref: 'psak117', requiredEvidence: ['Laporan aktuaria kontrak asuransi', 'Kertas kerja valuasi GMM/PAA/VFA'] },
  syariah: { ref: 'syariah', requiredEvidence: ['Opini Dewan Pengawas Syariah', 'Kertas kerja pemurnian & dana kebajikan'] },
  /* modul prosedur SA (seri 500 · bukti audit) */
  sa501:   { ref: 'sa501',  requiredEvidence: ['Observasi persediaan', 'Konfirmasi litigasi & klaim'] },
  sa520:   { ref: 'sa520',  requiredEvidence: ['Ekspektasi & ambang investigasi analitis', 'Investigasi varians signifikan'] },
  sa530:   { ref: 'sa530',  requiredEvidence: ['Penentuan ukuran sampel', 'Evaluasi hasil & proyeksi salah saji'] },
  sa540:   { ref: 'sa540',  requiredEvidence: ['Evaluasi estimasi akuntansi'] },
  sa580:   { ref: 'sa580',  requiredEvidence: ['Surat representasi tertulis manajemen'] },
  spr2410: { ref: 'spr2410', requiredEvidence: ['Kertas kerja prosedur reviu interim'] },
  /* Core Execution — kertas kerja pelaksanaan substantif */
  aje:        { ref: 'aje',        requiredEvidence: ['Dukungan jurnal penyesuaian (AJE)', 'Persetujuan manajemen atas AJE'] },
  analytical: { ref: 'analytical', requiredEvidence: ['Kertas kerja reviu analitis', 'Penjelasan & korroborasi fluktuasi'] },
  sampling:   { ref: 'sampling',   requiredEvidence: ['Parameter & metode sampling', 'Daftar item terpilih & hasil pengujian'] },
  jet:        { ref: 'jet',        requiredEvidence: ['Kriteria pengujian jurnal (JET)', 'Tindak lanjut jurnal anomali'] },
};

/* Modul yang TERPETAKAN tapi punya kontrol sign-off khusus sendiri di view-nya
   → jangan tampilkan chip "Kertas Kerja" SubBar (hindari duplikasi kontrol).
   `opinion`: tab OpinionSignoff (3-tingkat + checklist + finalize) yang me-mirror ke wpState['900']. */
const WP_SUBBAR_HIDE = { opinion: true };

function wpKeyFor(moduleId) {
  const m = WP_MODULE_MAP[moduleId];
  return (m && m.ref) || moduleId;
}
function requiredEvidenceFor(moduleId) {
  const m = WP_MODULE_MAP[moduleId];
  return (m && m.requiredEvidence) || [];
}
function wpToday() {
  try { return new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch (e) { return ''; }
}

/* ---- Penanda tangan kanonik untuk blok tanda tangan kertas kerja CETAK ----
   Membaca chain dari wpState (preparer/reviewer/partner) dengan fallback ke
   default statis, agar lembar cetak tetap lengkap sebelum ditandatangani secara
   live. Begitu auditor sign-off via SubBar/register WP, blok cetak ikut nyata.
   Fungsi MURNI (bukan hook) — panggil dengan `audit` dari useAudit() di komponen. */
function wpSignersFor(audit, moduleId, defaults) {
  const d = defaults || {};
  const ref = wpKeyFor(moduleId);
  const chain = ((audit && audit.wpState && audit.wpState[ref]) || {}).chain || {};
  const merge = (slot, def) => {
    const c = chain[slot];
    if (!c) return def || null;
    return { by: c.by, at: c.at, role: (def && def.role) || '' };
  };
  return {
    preparer: merge('preparer', d.preparer),
    reviewer: merge('reviewer', d.reviewer),
    approver: merge('partner', d.approver),
  };
}

/* ---- hook: state sign-off kanonik per modul ---- */
function useWpSignoff(moduleId) {
  const audit = useAudit();
  const auth = useAuth();
  const firm = useFirm();
  const me = (auth && auth.user && auth.user.name) || 'Auditor';
  const ref = wpKeyFor(moduleId);
  const st = (audit.wpState && audit.wpState[ref]) || {};
  const chain = st.chain || {};
  const setWp = audit.setWp || (() => {});
  const locked = !!(firm && firm.locked);      // arsip/selesai engagement = read-only (sign-off lunak: boleh buka kembali selama belum diarsipkan)
  const status = chain.reviewer ? 'reviewed' : chain.preparer ? 'prepared' : 'draft';

  const sign = (level) => {
    const at = wpToday();
    if (level === 'preparer') {
      setWp(ref, { chain: { ...chain, preparer: { by: me, at } }, status: st.status === 'Reviewed' ? st.status : 'In Review' });
    } else {
      setWp(ref, { chain: { ...chain, preparer: chain.preparer || { by: me, at }, reviewer: { by: me, at } }, status: 'Reviewed', reviewer: me, signedAt: at });
    }
  };
  const unsign = (level) => {
    const nc = { ...chain };
    if (level === 'reviewer') {
      delete nc.reviewer;
      setWp(ref, { chain: nc, status: nc.preparer ? 'In Review' : 'In Progress', reviewer: null, signedAt: null });
    } else {
      delete nc.preparer; delete nc.reviewer;
      setWp(ref, { chain: nc, status: 'In Progress', reviewer: null, signedAt: null });
    }
  };
  return { ref, me, chain, status, locked, sign, unsign,
    preparer: chain.preparer || null, reviewer: chain.reviewer || null };
}

/* ---- kelengkapan bukti (required vs attached) ---- */
function useWpEvidence(moduleId) {
  const req = requiredEvidenceFor(moduleId);
  const attached = (typeof amsEvidenceCount === 'function') ? amsEvidenceCount(moduleId) : 0;
  const level = req.length === 0 ? (attached > 0 ? 'ok' : 'none')
    : attached >= req.length ? 'ok' : attached > 0 ? 'partial' : 'missing';
  return { req, attached, level };
}

/* ---- Lencana kelengkapan gabungan (sign-off + bukti) ---- */
function WpStatusBadge({ moduleId }) {
  const s = useWpSignoff(moduleId);
  const e = useWpEvidence(moduleId);
  const soKind = s.status === 'reviewed' ? 'green' : s.status === 'prepared' ? 'blue' : 'gray';
  const soLbl = s.status === 'reviewed' ? 'Ditelaah' : s.status === 'prepared' ? 'Disiapkan' : 'Draf';
  const evKind = e.level === 'ok' ? 'teal' : e.level === 'partial' ? 'amber' : 'gray';
  return (
    <span className="row ac" style={{ gap: 6 }}>
      <Badge kind={soKind} dot>{soLbl}</Badge>
      <Badge kind={evKind}><I.upload size={11} /> {e.attached}{e.req.length ? '/' + e.req.length : ''} bukti</Badge>
    </span>
  );
}

/* ---- Kartu sign-off 2-tingkat (preparer → reviewer), lock lunak ---- */
function WpSignoff({ moduleId }) {
  const { status, locked, sign, unsign, preparer, reviewer, me } = useWpSignoff(moduleId);
  const Line = ({ role, who, onSign, onUnsign, canSign }) => (
    <div className="row ac gap8" style={{ padding: '7px 0' }}>
      <span style={{ width: 24, height: 24, borderRadius: '50%', flex: '0 0 24px', display: 'grid', placeItems: 'center',
        background: who ? 'var(--green-bg)' : 'var(--surface-3)', color: who ? 'var(--green)' : 'var(--ink-4)' }}>
        {who ? <I.check size={12} /> : <I.users size={11} />}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="tiny" style={{ fontWeight: 700 }}>{role}</div>
        {who ? <div className="tiny muted">{who.by} · {who.at}</div> : <div className="tiny muted">belum ditandatangani</div>}
      </div>
      {who
        ? <button className="btn sm" disabled={locked} onClick={onUnsign} title="Buka kembali (lock lunak)"><I.sync size={11} /> Buka</button>
        : <Btn sm variant={canSign ? 'primary' : ''} disabled={locked || !canSign} onClick={onSign}><I.check size={12} /> Sign-off</Btn>}
    </div>
  );
  return (
    <div>
      <Line role="Preparer" who={preparer} canSign onSign={() => sign('preparer')} onUnsign={() => unsign('preparer')} />
      <div style={{ borderTop: '1px solid var(--line-soft)' }} />
      <Line role="Reviewer" who={reviewer} canSign={!!preparer} onSign={() => sign('reviewer')} onUnsign={() => unsign('reviewer')} />
      {locked && <div className="tiny muted" style={{ marginTop: 6 }}><I.lock size={11} /> Engagement diarsipkan — read-only.</div>}
    </div>
  );
}

/* ---- Tautan bukti: required vs attached + arahkan ke kontrol Bukti global (SubBar) ---- */
function WpEvidenceLink({ moduleId }) {
  const { req, attached, level } = useWpEvidence(moduleId);
  const kind = level === 'ok' ? 'teal' : level === 'partial' ? 'amber' : 'red';
  return (
    <div>
      <div className="row ac gap8" style={{ marginBottom: 6 }}>
        <Badge kind={kind}><I.upload size={11} /> {attached} terlampir{req.length ? ' · ' + req.length + ' diwajibkan' : ''}</Badge>
      </div>
      {req.length > 0 ? (
        <ul style={{ margin: 0, paddingLeft: 16 }}>
          {req.map((r, i) => (
            <li key={i} className="tiny" style={{ color: i < attached ? 'var(--ink-2)' : 'var(--ink-4)', padding: '1px 0' }}>
              {i < attached ? '✓ ' : '○ '}{r}
            </li>
          ))}
        </ul>
      ) : <div className="tiny muted">Tidak ada bukti spesifik diwajibkan.</div>}
      <div className="tiny muted" style={{ marginTop: 6 }}>Lampirkan via tombol <strong>Bukti</strong> di bilah atas modul.</div>
    </div>
  );
}

/* ---- Panel gabungan: drop-in untuk view modul ("kertas kerja auditable") ---- */
function WpPanel({ moduleId, title }) {
  return (
    <Panel title={title || 'Kertas Kerja — Sign-off & Bukti'}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <div className="tiny muted" style={{ fontWeight: 700, marginBottom: 2 }}>RANTAI SIGN-OFF</div>
          <WpSignoff moduleId={moduleId} />
        </div>
        <div>
          <div className="tiny muted" style={{ fontWeight: 700, marginBottom: 2 }}>BUKTI AUDIT</div>
          <WpEvidenceLink moduleId={moduleId} />
        </div>
      </div>
    </Panel>
  );
}

/* ---- Kontrol SubBar global: "Kertas Kerja" (status + popover sign-off & bukti) ----
   Mirip EvidenceControl: tampil hanya untuk modul yang terpetakan di WP_MODULE_MAP. */
function WpSubBarControl({ moduleId }) {
  const [open, setOpen] = useStateWPS(false);
  const s = useWpSignoff(moduleId);
  if (!WP_MODULE_MAP[moduleId] || WP_SUBBAR_HIDE[moduleId]) return null;
  const dotKind = s.status === 'reviewed' ? 'var(--green)' : s.status === 'prepared' ? 'var(--blue)' : 'var(--ink-4)';
  return (
    <div style={{ position: 'relative' }}>
      <button className="subbar-ev" onClick={() => setOpen(o => !o)} title="Sign-off & bukti kertas kerja">
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: dotKind, display: 'inline-block' }} />
        Kertas Kerja
      </button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 74 }} onClick={() => setOpen(false)} />
          <div className="ev-pop" style={{ width: 340 }}>
            <div className="ev-pop-h" style={{ padding: '10px 12px', borderBottom: '1px solid var(--line)', fontWeight: 700, fontSize: 12.5 }}>
              Kertas Kerja — Sign-off &amp; Bukti
            </div>
            <div style={{ padding: 12 }}>
              <div className="tiny muted" style={{ fontWeight: 700, marginBottom: 2 }}>RANTAI SIGN-OFF</div>
              <WpSignoff moduleId={moduleId} />
              <div style={{ borderTop: '1px solid var(--line)', margin: '10px 0' }} />
              <div className="tiny muted" style={{ fontWeight: 700, marginBottom: 4 }}>BUKTI AUDIT</div>
              <WpEvidenceLink moduleId={moduleId} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ---- Rekap kelengkapan per-engagement (Fase 4) ----
   Dedupe per ref kanonik: modul ber-alias (lease/psak73→F, revenue/psak72→R)
   berbagi WP yg sama → dihitung SEKALI, bukan ganda. */
function wpCompletenessFor(audit, moduleIds) {
  const wpState = (audit && audit.wpState) || {};
  const seen = new Set();
  let total = 0, signed = 0, withEvidence = 0;
  moduleIds.forEach(mid => {
    const ref = wpKeyFor(mid);
    if (seen.has(ref)) return;
    seen.add(ref);
    total++;
    const st = wpState[ref] || {};
    if (st.chain && st.chain.reviewer) signed++;
    const req = requiredEvidenceFor(mid);
    const att = (typeof amsEvidenceCount === 'function') ? amsEvidenceCount(mid) : 0;
    if (req.length ? att >= req.length : att > 0) withEvidence++;
  });
  return { total, signed, withEvidence,
    signedPct: total ? Math.round(signed / total * 100) : 0,
    evidencePct: total ? Math.round(withEvidence / total * 100) : 0 };
}

/* ---- Widget rekap kelengkapan (drop-in untuk Cockpit/Finalisasi) ----
   Dua bar: kertas kerja ter-review (sign-off reviewer) + berbukti lengkap.
   Sumber = wpState kanonik + store evidence; lingkup = semua modul auditable. */
function WpCompletenessRecap({ moduleIds }) {
  const audit = useAudit();
  const ids = moduleIds || Object.keys(WP_MODULE_MAP);
  const r = wpCompletenessFor(audit, ids);
  const Row = ({ label, pct, count, total, color }) => (
    <div style={{ marginBottom: 9 }}>
      <div className="row jb ac" style={{ marginBottom: 4 }}>
        <span className="tiny" style={{ fontWeight: 600 }}>{label}</span>
        <span className="mono tiny" style={{ fontWeight: 700, color }}>
          {pct}% <span className="muted" style={{ fontWeight: 500 }}>· {count}/{total}</span>
        </span>
      </div>
      <Progress value={pct} color={color} />
    </div>
  );
  return (
    <div>
      <Row label="Kertas kerja ter-review (sign-off)" pct={r.signedPct} count={r.signed} total={r.total} color="var(--green)" />
      <Row label="Kertas kerja berbukti lengkap" pct={r.evidencePct} count={r.withEvidence} total={r.total} color="var(--teal)" />
    </div>
  );
}

Object.assign(window, {
  WP_MODULE_MAP, wpKeyFor, requiredEvidenceFor, wpSignersFor,
  useWpSignoff, useWpEvidence, WpStatusBadge, WpSignoff, WpEvidenceLink, WpPanel, WpSubBarControl, wpCompletenessFor, WpCompletenessRecap,
});

export {
  WP_MODULE_MAP, wpKeyFor, requiredEvidenceFor, wpSignersFor,
  useWpSignoff, useWpEvidence, WpStatusBadge, WpSignoff, WpEvidenceLink, WpPanel, WpSubBarControl, wpCompletenessFor, WpCompletenessRecap,
};
