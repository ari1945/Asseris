/* ============================================================
   Asseris — Lapisan Kertas Kerja: Sign-off + Bukti (P2)
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
import { useAudit, useAuth, useFirm, useNav } from './contexts';
import { I } from './icons';
import { Badge, Btn, Panel, Avatar, Progress } from './ui';
import { amsEvidenceCount } from './evidence';

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
  /* revenue recognition WP (ref 'R') disurfacek HANYA via psak72 — modul `revenue`
     adalah halaman penagihan firma (FirmRevenue/WIP), bukan WP audit; dahulu keliru
     dipetakan ke ref 'R' → kontaminasi silang wpState['R'] milik psak72 (dihapus Fase 3). */
  psak72:  { ref: 'R',   requiredEvidence: ['Analisis 5-langkah pengakuan pendapatan', 'Sampel kontrak penjualan', 'Uji cut-off pendapatan'] },
  sad:     { ref: '810', requiredEvidence: ['Daftar salah saji (SAD)', 'Surat representasi manajemen'] },
  opinion: { ref: '900', requiredEvidence: ['Draf laporan auditor', 'Checklist pengungkapan LK'] },
  materiality: { ref: '300', requiredEvidence: ['Kertas kerja perhitungan materialitas'] },
  /* tanpa ref huruf → key = id modul (WP berlingkup modul) */
  psak1:   { ref: 'psak1',  requiredEvidence: ['Checklist penyajian & pengungkapan LK', 'Uji asumsi kelangsungan usaha'] },
  psak2:   { ref: 'psak2',  requiredEvidence: ['Rekonsiliasi arus kas (metode tidak langsung)', 'Klasifikasi operasi/investasi/pendanaan'] },
  psak19:  { ref: 'psak19', requiredEvidence: ['Register aset takberwujud', 'Uji amortisasi & penurunan nilai'] },
  psak46:  { ref: 'psak46', requiredEvidence: ['Rekonsiliasi fiskal', 'Skedul pajak tangguhan'] },
  psak48:  { ref: 'psak48', requiredEvidence: ['Uji penurunan nilai (value-in-use/DCF)'] },
  psak22:  { ref: 'psak22', requiredEvidence: ['Alokasi harga akuisisi (PPA)', 'Laporan penilai (KJPP)'] },
  psak25:  { ref: 'psak25', requiredEvidence: ['Register estimasi & perubahan kebijakan'] },
  /* psak57 (provisi & kontinjensi) TIDAK punya view/route tersendiri — materinya
     disurfacek di dalam view_psak48 (memakai canon.psak57). Entri orphan dihapus
     Fase 3 agar tak jadi WP hantu yang tak pernah bisa diselesaikan di rekap. */
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
  /* modul dokumentasi audit (SA 230) — kesimpulan kelengkapan & perakitan berkas */
  sa230:   { ref: 'sa230',  requiredEvidence: ['Memo dokumentasi audit (SA 230)', 'Daftar simak perakitan & retensi berkas final'] },
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

/* Taksonomi disposisi kesimpulan auditor (P1). Daftar tetap + rasional bebas. */
const WP_DISPOSITIONS = ['Memadai', 'Perlu tindak lanjut', 'Eskalasi ke partner'];

function wpKeyFor(moduleId: any) {
  const m = (WP_MODULE_MAP as any)[moduleId];
  return (m && m.ref) || moduleId;
}
function requiredEvidenceFor(moduleId: any) {
  const m = (WP_MODULE_MAP as any)[moduleId];
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
function wpSignersFor(audit: any, moduleId: any, defaults: any) {
  const d = defaults || {};
  const ref = wpKeyFor(moduleId);
  const chain = ((audit && audit.wpState && audit.wpState[ref]) || {}).chain || {};
  const merge = (slot: any, def: any) => {
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
function useWpSignoff(moduleId: any) {
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

  const sign = (level: any) => {
    const at = wpToday();
    if (level === 'preparer') {
      setWp(ref, { chain: { ...chain, preparer: { by: me, at } }, status: st.status === 'Reviewed' ? st.status : 'In Review' });
    } else {
      setWp(ref, { chain: { ...chain, preparer: chain.preparer || { by: me, at }, reviewer: { by: me, at } }, status: 'Reviewed', reviewer: me, signedAt: at });
    }
  };
  const unsign = (level: any) => {
    const nc = { ...chain };
    if (level === 'reviewer') {
      delete nc.reviewer;
      setWp(ref, { chain: nc, status: nc.preparer ? 'In Review' : 'In Progress', reviewer: null, signedAt: null });
    } else {
      delete nc.preparer; delete nc.reviewer;
      setWp(ref, { chain: nc, status: 'In Progress', reviewer: null, signedAt: null });
    }
  };
  /* ---- kesimpulan auditor (P1): persist ke wpState[ref].conclusion ---- */
  const conclusion = st.conclusion || null;
  const saveConclusion = (text: any, disposition: any) =>
    setWp(ref, { conclusion: { text, disposition, by: me, at: wpToday() } });

  return { ref, me, chain, status, locked, sign, unsign,
    preparer: chain.preparer || null, reviewer: chain.reviewer || null,
    conclusion, saveConclusion };
}

/* ---- kelengkapan bukti (required vs attached) ---- */
function useWpEvidence(moduleId: any) {
  const req = requiredEvidenceFor(moduleId);
  const attached = (typeof amsEvidenceCount === 'function') ? amsEvidenceCount(moduleId) : 0;
  const level = req.length === 0 ? (attached > 0 ? 'ok' : 'none')
    : attached >= req.length ? 'ok' : attached > 0 ? 'partial' : 'missing';
  return { req, attached, level };
}

/* ---- Lencana kelengkapan gabungan (sign-off + bukti) ---- */
function WpStatusBadge({ moduleId }: any) {
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
function WpSignoff({ moduleId }: any) {
  const { status, locked, sign, unsign, preparer, reviewer, me, conclusion } = useWpSignoff(moduleId);
  const hasConclusion = !!(conclusion && conclusion.text);
  const Line = ({ role, who, onSign, onUnsign, canSign }: any) => (
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
      {!hasConclusion && (
        reviewer
          ? <div className="tiny" style={{ marginTop: 6, color: 'var(--amber)', fontWeight: 600 }}><I.alert size={11} /> Ditelaah tanpa kesimpulan terdokumentasi (SA 230) — lengkapi di bawah.</div>
          : <div className="tiny muted" style={{ marginTop: 6 }}><I.alert size={11} /> Belum ada kesimpulan auditor (SA 230) — sarankan isi sebelum telaah.</div>
      )}
      {locked && <div className="tiny muted" style={{ marginTop: 6 }}><I.lock size={11} /> Engagement diarsipkan — read-only.</div>}
    </div>
  );
}

/* ---- Tautan bukti: required vs attached + arahkan ke kontrol Bukti global (SubBar) ---- */
function WpEvidenceLink({ moduleId }: any) {
  const { req, attached, level } = useWpEvidence(moduleId);
  const kind = level === 'ok' ? 'teal' : level === 'partial' ? 'amber' : 'red';
  return (
    <div>
      <div className="row ac gap8" style={{ marginBottom: 6 }}>
        <Badge kind={kind}><I.upload size={11} /> {attached} terlampir{req.length ? ' · ' + req.length + ' diwajibkan' : ''}</Badge>
      </div>
      {req.length > 0 ? (
        <ul style={{ margin: 0, paddingLeft: 16 }}>
          {req.map((r: any, i: any) => (
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

/* ---- Kesimpulan auditor (P1): editable + persist ke wpState[ref].conclusion ----
   Penilaian auditor (SA 230) — BERDAMPINGAN dengan verdict otomatis canon, bukan
   menggantikannya. Disposisi terstruktur + rasional bebas, lock LUNAK. */
function WpConclusion({ moduleId }: any) {
  const { conclusion, saveConclusion, locked } = useWpSignoff(moduleId);
  const baseText = (conclusion && conclusion.text) || '';
  const baseDisp = (conclusion && conclusion.disposition) || WP_DISPOSITIONS[0];
  const [text, setText] = useStateWPS(baseText);
  const [disp, setDisp] = useStateWPS(baseDisp);
  const dirty = text !== baseText || disp !== baseDisp;
  const dispKind = (d: any) => d === 'Memadai' ? 'green' : d === 'Perlu tindak lanjut' ? 'amber' : 'red';
  return (
    <div>
      <div className="field" style={{ marginBottom: 8 }}>
        <label className="tiny muted" style={{ fontWeight: 700 }}>Disposisi</label>
        <select className="select" value={disp} onChange={(e: any) => setDisp(e.target.value)} disabled={locked}>
          {WP_DISPOSITIONS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>
      <textarea className="input" value={text} onChange={(e: any) => setText(e.target.value)} disabled={locked}
        placeholder="Dasar kesimpulan & pertimbangan profesional (SA 230)…"
        style={{ height: 70, padding: 9, resize: 'vertical', lineHeight: 1.5, fontFamily: 'var(--ui)', width: '100%', marginBottom: 8 }} />
      <div className="row ac jb">
        {conclusion
          ? <span className="tiny muted"><I.check size={11} /> {conclusion.by} · {conclusion.at}</span>
          : <span className="tiny muted">Belum ada kesimpulan</span>}
        <Btn sm variant={dirty && !locked && text.trim() ? 'primary' : ''} disabled={locked || !dirty || !text.trim()} onClick={() => saveConclusion(text.trim(), disp)}><I.check size={12} /> Simpan</Btn>
      </div>
      {conclusion && <div className="row ac" style={{ gap: 6, marginTop: 6 }}><Badge kind={dispKind(conclusion.disposition)} dot>{conclusion.disposition}</Badge></div>}
    </div>
  );
}

/* ---- Panel gabungan: drop-in untuk view modul ("kertas kerja auditable") ---- */
function WpPanel({ moduleId, title }: any) {
  return (
    <Panel title={title || 'Kertas Kerja — Sign-off, Bukti & Kesimpulan'}>
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
      <div style={{ borderTop: '1px solid var(--line)', margin: '12px 0 10px' }} />
      <div className="tiny muted" style={{ fontWeight: 700, marginBottom: 4 }}>KESIMPULAN AUDITOR</div>
      <WpConclusion moduleId={moduleId} />
    </Panel>
  );
}

/* ---- Kontrol SubBar global: "Kertas Kerja" (status + popover sign-off & bukti) ----
   Mirip EvidenceControl: tampil hanya untuk modul yang terpetakan di WP_MODULE_MAP. */
function WpSubBarControl({ moduleId }: any) {
  const [open, setOpen] = useStateWPS(false);
  const s = useWpSignoff(moduleId);
  if (!(WP_MODULE_MAP as any)[moduleId] || (WP_SUBBAR_HIDE as any)[moduleId]) return null;
  const dotKind = s.status === 'reviewed' ? 'var(--green)' : s.status === 'prepared' ? 'var(--blue)' : 'var(--ink-4)';
  return (
    <div style={{ position: 'relative' }}>
      <button className="subbar-ev" onClick={() => setOpen((o: any) => !o)} title="Sign-off & bukti kertas kerja">
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: dotKind, display: 'inline-block' }} />
        Kertas Kerja
      </button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 74 }} onClick={() => setOpen(false)} />
          <div className="ev-pop" style={{ width: 340 }}>
            <div className="ev-pop-h" style={{ padding: '10px 12px', borderBottom: '1px solid var(--line)', fontWeight: 700, fontSize: 12.5 }}>
              Kertas Kerja — Sign-off, Bukti &amp; Kesimpulan
            </div>
            <div style={{ padding: 12, maxHeight: '70vh', overflowY: 'auto' }}>
              <div className="tiny muted" style={{ fontWeight: 700, marginBottom: 2 }}>RANTAI SIGN-OFF</div>
              <WpSignoff moduleId={moduleId} />
              <div style={{ borderTop: '1px solid var(--line)', margin: '10px 0' }} />
              <div className="tiny muted" style={{ fontWeight: 700, marginBottom: 4 }}>BUKTI AUDIT</div>
              <WpEvidenceLink moduleId={moduleId} />
              <div style={{ borderTop: '1px solid var(--line)', margin: '10px 0' }} />
              <div className="tiny muted" style={{ fontWeight: 700, marginBottom: 4 }}>KESIMPULAN AUDITOR</div>
              <WpConclusion moduleId={moduleId} />
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
function wpCompletenessFor(audit: any, moduleIds: any) {
  const wpState = (audit && audit.wpState) || {};
  const seen = new Set();
  let total = 0, signed = 0, withEvidence = 0, withConclusion = 0;
  moduleIds.forEach((mid: any) => {
    const ref = wpKeyFor(mid);
    if (seen.has(ref)) return;
    seen.add(ref);
    total++;
    const st = wpState[ref] || {};
    if (st.chain && st.chain.reviewer) signed++;
    const req = requiredEvidenceFor(mid);
    const att = (typeof amsEvidenceCount === 'function') ? amsEvidenceCount(mid) : 0;
    if (req.length ? att >= req.length : att > 0) withEvidence++;
    if (st.conclusion && st.conclusion.text) withConclusion++;
  });
  return { total, signed, withEvidence, withConclusion,
    signedPct: total ? Math.round(signed / total * 100) : 0,
    evidencePct: total ? Math.round(withEvidence / total * 100) : 0,
    conclusionPct: total ? Math.round(withConclusion / total * 100) : 0 };
}

/* ---- Widget rekap kelengkapan (drop-in untuk Cockpit/Finalisasi) ----
   Tiga bar: kertas kerja ter-review (sign-off reviewer) + berbukti lengkap +
   berkesimpulan (penilaian auditor SA 230). Sumber = wpState kanonik + store
   evidence; lingkup = semua modul auditable. */
function WpCompletenessRecap({ moduleIds }: any) {
  const audit = useAudit();
  const ids = moduleIds || Object.keys(WP_MODULE_MAP);
  const r = wpCompletenessFor(audit, ids);
  const Row = ({ label, pct, count, total, color }: any) => (
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
      <Row label="Kertas kerja berkesimpulan (SA 230)" pct={r.conclusionPct} count={r.withConclusion} total={r.total} color="var(--blue)" />
    </div>
  );
}

/* ============================================================
   P5 — Gerbang Fase Lifecycle Engagement (Fase 0: helper + ringkasan)
   ------------------------------------------------------------
   Mengikat transisi fase (`setEngagementPhase`) ke kelengkapan kertas
   kerja yg SUDAH terukur (SSOT: wpCompletenessFor + reviewNotes + opini).
   Fungsi MURNI — belum menegakkan (penegakan = Fase 1). Konsisten lock
   LUNAK: gerbang bertingkat (warn → confirm), override selalu mungkin.
   ============================================================ */
const PHASE_ORDER = ['Perencanaan', 'Eksekusi', 'Finalisasi', 'Arsip'];

/* baca status finalisasi opini dari SSOT persist (ams.v1.opinionDoc.<engId>).
   Murni-baca; fallback false bila berkas opini belum disentuh. */
function opinionFinalized(firm: any) {
  try {
    const engId = firm && firm.activeEngagementId;
    if (!engId) return false;
    const raw = localStorage.getItem('ams.v1.opinionDoc.' + engId);
    if (raw) { const d = JSON.parse(raw); if (d && typeof d.finalized === 'boolean') return d.finalized; }
  } catch (e) { /* localStorage/JSON gagal → anggap belum final */ }
  return false;
}

/* engagementGate — daftar prasyarat transisi ke fase berikutnya.
   Kriteria mengikuti spek disetujui (Q2): →Finalisasi butuh 0 catatan
   prioritas-tinggi terbuka; →Arsip butuh opini final + 100% WP ter-review
   + 0 catatan terbuka. Maju-mundur/sama-fase = bebas (severity 'none'). */
function engagementGate(audit: any, firm: any, opts: any) {
  const o = opts || {};
  const moduleIds = o.moduleIds || Object.keys(WP_MODULE_MAP);
  const fromPhase = o.fromPhase || (firm && firm.activeEngagement && firm.activeEngagement.phase) || 'Perencanaan';
  const fromIdx = PHASE_ORDER.indexOf(fromPhase);
  const nextPhase = o.nextPhase || PHASE_ORDER[Math.min(fromIdx + 1, PHASE_ORDER.length - 1)];
  const toIdx = PHASE_ORDER.indexOf(nextPhase);

  // mundur / tetap → tak bergerbang
  if (toIdx <= fromIdx) {
    return { fromPhase, nextPhase, severity: 'none', criteria: [], blockers: [], allMet: true };
  }

  const recap = wpCompletenessFor(audit, moduleIds);
  const notes = (audit && (audit.reviewNotesActive || audit.reviewNotes)) || [];  // P5 Fase 2: engagement-scope
  const openNotes = notes.filter((n: any) => n.status === 'open');
  const highOpen = openNotes.filter((n: any) => n.priority === 'high');
  const opFinal = opinionFinalized(firm);

  let criteria: any[] = [];
  let severity = 'warn';
  if (nextPhase === 'Eksekusi') {
    severity = 'warn';
    criteria = []; // Perencanaan→Eksekusi: tak ada prasyarat keras (informasional)
  } else if (nextPhase === 'Finalisasi') {
    severity = 'warn';
    criteria = [
      { key: 'noHighNotes', label: 'Tidak ada catatan review prioritas tinggi terbuka',
        met: highOpen.length === 0, detail: `${highOpen.length} catatan prioritas tinggi terbuka`, view: 'cockpit' },
    ];
  } else if (nextPhase === 'Arsip') {
    severity = 'confirm'; // titik lock — gesekan layak (graduated, Q1)
    criteria = [
      { key: 'opinionFinal', label: 'Laporan auditor difinalisasi (SA 700)',
        met: opFinal, detail: opFinal ? 'Opini terkunci' : 'Opini belum difinalisasi', view: 'opinion' },
      { key: 'allReviewed', label: 'Seluruh kertas kerja kunci ter-review (sign-off)',
        met: recap.signed === recap.total, detail: `${recap.signed}/${recap.total} WP ter-review (${recap.signedPct}%)`, view: 'wp' },
      { key: 'noOpenNotes', label: 'Seluruh catatan review terselesaikan',
        met: openNotes.length === 0, detail: `${openNotes.length} catatan terbuka`, view: 'cockpit' },
    ];
  }
  const blockers = criteria.filter(c => !c.met);
  return { fromPhase, nextPhase, severity, criteria, blockers, allMet: blockers.length === 0 };
}

/* EngagementGateSummary — ringkasan prasyarat + tautan "buka modul" untuk
   menyelesaikan blocker. Drop-in (firm board / dialog konfirmasi Fase 1). */
function EngagementGateSummary({ nextPhase, moduleIds, gate, compact }: any) {
  const audit = useAudit();
  const firm = useFirm();
  const nav = useNav();
  const g = gate || engagementGate(audit, firm, { nextPhase, moduleIds });
  if (g.severity === 'none' || g.criteria.length === 0) {
    return <div className="tiny muted"><I.check size={11} /> Tidak ada prasyarat untuk transisi ke <strong>{g.nextPhase}</strong>.</div>;
  }
  const tone = g.allMet ? 'var(--green)' : g.severity === 'confirm' ? 'var(--red)' : 'var(--amber)';
  return (
    <div>
      {!compact && (
        <div className="tiny" style={{ fontWeight: 700, marginBottom: 6, color: tone }}>
          {g.allMet ? <I.checkCircle size={12} /> : <I.alert size={12} />} Prasyarat → {g.nextPhase}
          {' '}<span className="muted" style={{ fontWeight: 500 }}>· {g.criteria.length - g.blockers.length}/{g.criteria.length} terpenuhi</span>
        </div>
      )}
      <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none' }}>
        {g.criteria.map((c: any) => (
          <li key={c.key} className="row ac jb" style={{ gap: 8, padding: '4px 0' }}>
            <span className="row ac gap6" style={{ minWidth: 0 }}>
              <span style={{ color: c.met ? 'var(--green)' : 'var(--ink-4)', flex: '0 0 auto', marginTop: 1 }}>
                {c.met ? <I.checkCircle size={13} /> : <I.alert size={13} />}
              </span>
              <span style={{ minWidth: 0 }}>
                <span className="tiny" style={{ fontWeight: 600, color: c.met ? 'var(--ink-1)' : 'var(--ink-2)' }}>{c.label}</span>
                <span className="tiny muted" style={{ display: 'block' }}>{c.detail}</span>
              </span>
            </span>
            {!c.met && c.view && (
              <button className="btn sm" style={{ flex: '0 0 auto' }} onClick={() => nav(c.view, { from: 'firm' })}>Buka</button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* usePhaseGate (Fase 1) — penegakan transisi fase. Bungkus `setEngagementPhase`:
   - →Arsip (severity 'confirm'): SELALU minta konfirmasi (titik lock); bila ada
     blocker → tombol override + jejak `logActivity({type:'gate-override'})`.
   - →Finalisasi (severity 'warn'): dialog hanya bila ada blocker (peringatan).
   - lainnya / terpenuhi tanpa lock: lanjут langsung.
   Konsumen merender <PhaseGateDialog> dari state `pending`. */
function usePhaseGate() {
  const audit = useAudit();
  const firm = useFirm();
  const setEngagementPhase = (firm && firm.setEngagementPhase) || (() => {});
  const logActivity = (audit && audit.logActivity) || (() => {});
  const [pending, setPending] = useStateWPS(null);
  const attempt = (engId: any, fromPhase: any, toPhase: any) => {
    const g = engagementGate(audit, firm, { nextPhase: toPhase, fromPhase });
    const needsDialog = g.severity === 'confirm' ? true : (g.severity === 'warn' && !g.allMet);
    if (!needsDialog) { setEngagementPhase(engId, toPhase); return; }
    setPending({ engId, fromPhase, toPhase, gate: g });
  };
  const confirm = () => {
    if (!pending) return;
    setEngagementPhase(pending.engId, pending.toPhase);
    if (pending.gate.blockers.length) {
      logActivity({ type: 'gate-override', module: 'engagement',
        text: `Transisi ${pending.fromPhase}→${pending.toPhase} (${pending.engId}) menembus ${pending.gate.blockers.length} prasyarat (override).` });
    }
    setPending(null);
  };
  const cancel = () => setPending(null);
  return { attempt, pending, confirm, cancel };
}

/* PhaseGateDialog — modal konfirmasi/peringatan transisi fase. */
function PhaseGateDialog({ gate, fromPhase, toPhase, onConfirm, onCancel }: any) {
  if (!gate) return null;
  const isConfirm = gate.severity === 'confirm';
  const blocked = gate.blockers.length > 0;
  const accent = isConfirm ? 'var(--red)' : 'var(--amber)';
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,20,30,.32)', zIndex: 95, display: 'grid', placeItems: 'center' }} onClick={onCancel}>
      <div className="panel" style={{ width: 460, maxWidth: '94vw', padding: 0, overflow: 'hidden' }} onClick={(ev: any) => ev.stopPropagation()}>
        <div style={{ padding: '13px 16px', borderBottom: '1px solid var(--line)', borderTop: `3px solid ${accent}` }}>
          <div className="row ac gap8" style={{ fontWeight: 700, fontSize: 13.5 }}>
            <span style={{ color: accent }}><I.alert size={15} /></span>
            {isConfirm ? 'Konfirmasi pengarsipan engagement' : `Transisi ${fromPhase} → ${toPhase}`}
          </div>
          <div className="tiny muted" style={{ marginTop: 3 }}>
            {isConfirm
              ? (blocked
                ? 'Mengarsipkan akan mengunci engagement (read-only). Prasyarat berikut BELUM terpenuhi:'
                : 'Semua prasyarat terpenuhi. Mengarsipkan akan mengunci engagement (read-only).')
              : 'Beberapa prasyarat belum terpenuhi. Anda tetap dapat melanjutkan:'}
          </div>
        </div>
        <div style={{ padding: '12px 16px' }}>
          <EngagementGateSummary gate={gate} compact />
        </div>
        <div className="row jb ac" style={{ padding: '11px 16px', borderTop: '1px solid var(--line)', background: 'var(--surface-2)' }}>
          <button className="btn sm" onClick={onCancel}>Batal</button>
          <Btn sm variant="primary" style={{ background: accent, borderColor: accent }} onClick={onConfirm}>
            {isConfirm
              ? (blocked ? <><I.lock size={13} /> Tetap arsipkan (override)</> : <><I.lock size={13} /> Arsipkan &amp; kunci</>)
              : <>Lanjutkan</>}
          </Btn>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  WP_MODULE_MAP, WP_DISPOSITIONS, wpKeyFor, requiredEvidenceFor, wpSignersFor,
  useWpSignoff, useWpEvidence, WpStatusBadge, WpSignoff, WpEvidenceLink, WpConclusion, WpPanel, WpSubBarControl, wpCompletenessFor, WpCompletenessRecap,
  PHASE_ORDER, engagementGate, EngagementGateSummary, usePhaseGate, PhaseGateDialog,
});

export {
  WP_MODULE_MAP, WP_DISPOSITIONS, wpKeyFor, requiredEvidenceFor, wpSignersFor,
  useWpSignoff, useWpEvidence, WpStatusBadge, WpSignoff, WpEvidenceLink, WpConclusion, WpPanel, WpSubBarControl, wpCompletenessFor, WpCompletenessRecap,
  PHASE_ORDER, engagementGate, EngagementGateSummary, usePhaseGate, PhaseGateDialog,
};
