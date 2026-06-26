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
import { engagementEntryGate, engagementEntryContext } from './engagement_entry_gate';
import { CAP } from './rbac';
import { I } from './icons';
import { Badge, Btn, Panel, Avatar, Progress } from './ui';
import { amsEvidenceCount } from './evidence';
import { finalisationGateCriteria } from './engagement_phase_gate';
import { checkWtbIntegrity } from './wtb_integrity';

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
  /* prosedur SA substantif yg sebelumnya TAK terpetakan → kini auditable
     (sign-off + bukti + kesimpulan SA 230 via SubBar global). Menutup sisi
     generik temuan S-01/SA-04/SA-08/SA-09/SA-10/SA-11. Data domain spesifik
     (mis. proyeksi arus kas, register konfirmasi) = track terpisah. */
  sa240:        { ref: 'sa240',        requiredEvidence: ['Notulen diskusi tim (brainstorming fraud, SA 240 ¶15)', 'Register risiko fraud & respons audit', 'Pengujian presumsi pengakuan pendapatan & jurnal anomali (JET)'] },
  goingconcern: { ref: 'goingconcern', requiredEvidence: ['Proyeksi arus kas & uji sensitivitas', 'Analisis kepatuhan covenant', 'Evaluasi rencana mitigasi manajemen (SA 570 ¶16)'] },
  subsequent:   { ref: 'subsequent',   requiredEvidence: ['Prosedur peristiwa kemudian s.d. tanggal laporan (SA 560 ¶6)', 'Risalah/notulen setelah tanggal neraca', 'Pertimbangan dual dating'] },
  related:      { ref: 'related',      requiredEvidence: ['Daftar pihak berelasi & sifat hubungan', 'Pengujian transaksi pihak berelasi (SA 550 ¶22)', 'Evaluasi kecukupan pengungkapan'] },
  confirm:      { ref: 'confirm',      requiredEvidence: ['Register konfirmasi (terkirim/dijawab)', 'Rekonsiliasi selisih jawaban', 'Prosedur alternatif untuk non-jawaban (SA 505 ¶12)'] },
  /* SA 250 — pertimbangan hukum & regulasi (NOCLAR). Register ketidakpatuhan
     engagement-scoped + keputusan jenjang pelaporan dipersist di view; lapisan
     ini menambah sign-off + bukti + kesimpulan SA 230 via SubBar global. */
  sa250:        { ref: 'sa250',        requiredEvidence: ['Memo pertimbangan hukum & regulasi (NOCLAR, SA 250)', 'Notulen diskusi manajemen/penasihat hukum atas ketidakpatuhan', 'Representasi tertulis ketidakpatuhan (SA 250 ¶16)'] },
  /* SA 620 — penggunaan pekerjaan pakar auditor. Register pakar engagement-scoped
     (persist di view); lapisan ini menambah sign-off + bukti + kesimpulan SA 230. */
  expert:       { ref: 'expert',       requiredEvidence: ['Laporan/kertas kerja pakar & dasar simpulan', 'Evaluasi kompetensi, kapabilitas & objektivitas pakar (SA 620 ¶9)', 'Evaluasi kecukupan pekerjaan pakar untuk tujuan audit (¶12)'] },
  /* SA 260/265 — komunikasi TCWG & defisiensi pengendalian. Register engagement-
     scoped (persist di view); lapisan ini menambah sign-off + bukti + kesimpulan SA 230. */
  sa260:        { ref: 'sa260',        requiredEvidence: ['Laporan/komunikasi tertulis kepada TCWG (SA 260 ¶16)', 'Risalah/notulen komunikasi dua arah dengan TCWG', 'Matriks hal wajib dikomunikasikan (¶14–17)'] },
  sa265:        { ref: 'sa265',        requiredEvidence: ['Surat komunikasi defisiensi signifikan kepada TCWG (SA 265 ¶9)', 'Register defisiensi & klasifikasi (signifikan/biasa)', 'Komunikasi defisiensi lain kepada manajemen (¶10)'] },
  /* SA 402 — organisasi jasa. Register organisasi jasa engagement-scoped (persist
     di view); lapisan ini menambah sign-off + bukti + kesimpulan SA 230. */
  serviceorg:   { ref: 'serviceorg',   requiredEvidence: ['Laporan auditor jasa (Type 1/2 · ISAE 3402/SOC 1)', 'Evaluasi auditor jasa & matriks CUEC', 'Prosedur atas pengecualian/gap/tanpa-laporan (SA 402)'] },
  /* SA 315/330/265 — pengendalian internal (ICFR). RCM & evaluasi defisiensi
     engagement-scoped (persist di view); lapisan ini menambah sign-off + bukti + kesimpulan SA 230. */
  icfr:         { ref: 'icfr',         requiredEvidence: ['Risk-control matrix & walkthrough (SA 315)', 'Kertas kerja Test of Controls (SA 330)', 'Register & evaluasi defisiensi + komunikasi (SA 265)'] },
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
  /* Otoritas sign-off REVIEWER = SIGNOFF_REVIEWER (Partner+Manager). Preparer tetap semua auditor (WP_EDIT).
     Menutup celah SoD: Junior/Senior tak boleh membubuhkan/menghapus tanda tangan reviewer. (rbac.ts SSOT) */
  const canReview = !auth || typeof auth.can !== 'function' || auth.can(CAP.SIGNOFF_REVIEWER);
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

  return { ref, me, chain, status, locked, canReview, sign, unsign,
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
  const { status, locked, canReview, sign, unsign, preparer, reviewer, me, conclusion } = useWpSignoff(moduleId);
  const hasConclusion = !!(conclusion && conclusion.text);
  const Line = ({ role, who, onSign, onUnsign, canSign, noAuthHint }: any) => (
    <div className="row ac gap8" style={{ padding: '7px 0' }}>
      <span style={{ width: 24, height: 24, borderRadius: '50%', flex: '0 0 24px', display: 'grid', placeItems: 'center',
        background: who ? 'var(--green-bg)' : 'var(--surface-3)', color: who ? 'var(--green)' : 'var(--ink-4)' }}>
        {who ? <I.check size={12} /> : <I.users size={11} />}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="tiny" style={{ fontWeight: 700 }}>{role}</div>
        {who ? <div className="tiny muted">{who.by} · {who.at}</div>
          : <div className="tiny muted">{!canSign && noAuthHint ? noAuthHint : 'belum ditandatangani'}</div>}
      </div>
      {who
        ? <button className="btn sm" disabled={locked || !canSign} onClick={onUnsign} title={canSign ? 'Buka kembali (lock lunak)' : 'Hanya otoritas berwenang'}><I.sync size={11} /> Buka</button>
        : <Btn sm variant={canSign ? 'primary' : ''} disabled={locked || !canSign} onClick={onSign}><I.check size={12} /> Sign-off</Btn>}
    </div>
  );
  return (
    <div>
      <Line role="Preparer" who={preparer} canSign onSign={() => sign('preparer')} onUnsign={() => unsign('preparer')} />
      <div style={{ borderTop: '1px solid var(--line-soft)' }} />
      <Line role="Reviewer" who={reviewer} canSign={!!preparer && canReview} noAuthHint={!canReview ? 'menunggu otoritas berwenang (reviewer)' : 'menunggu preparer'} onSign={() => sign('reviewer')} onUnsign={() => unsign('reviewer')} />
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
  let total = 0, signed = 0, withEvidence = 0, withConclusion = 0, notStarted = 0;
  moduleIds.forEach((mid: any) => {
    const ref = wpKeyFor(mid);
    if (seen.has(ref)) return;
    seen.add(ref);
    total++;
    const st = wpState[ref] || {};
    if (st.chain && st.chain.reviewer) signed++;
    const req = requiredEvidenceFor(mid);
    const att = (typeof amsEvidenceCount === 'function') ? amsEvidenceCount(mid) : 0;
    const hasConclusion = !!(st.conclusion && st.conclusion.text);
    if (req.length ? att >= req.length : att > 0) withEvidence++;
    if (hasConclusion) withConclusion++;
    // "belum dimulai" (isu #3): nol bukti DAN nol kesimpulan
    if (att === 0 && !hasConclusion) notStarted++;
  });
  return { total, signed, withEvidence, withConclusion, notStarted,
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

/* baca status finalisasi opini dari SSOT persist. Key opinionDoc kini statis
   'opinionDoc.v1' berlingkup engagement → cacheKey W6 'ams.v1.engagement.<engId>.opinionDoc.v1'
   (dulu komposit 'opinionDoc.'+engId scope firm; pembaca ini sebelumnya menunjuk
   key legacy pra-W6 yg tak pernah ditulis pasca-W6 → selalu basi). Murni-baca cache;
   fallback false bila berkas opini belum disentuh di browser ini. */
function opinionFinalized(firm: any) {
  try {
    const engId = firm && firm.activeEngagementId;
    if (!engId) return false;
    const raw = localStorage.getItem('ams.v1.engagement.' + engId + '.opinionDoc.v1');
    if (raw) { const d = JSON.parse(raw); if (d && typeof d.finalized === 'boolean') return d.finalized; }
  } catch (e) { /* localStorage/JSON gagal → anggap belum final */ }
  return false;
}

/* eqrStatusFor (Q-02) — status gerbang Penelaahan Mutu Perikatan (EQR, ISQM 2)
   untuk satu engagement, dibaca dari SSOT persist (ams.v1.eqrReviews.v2). Murni-
   baca; pola sama dgn opinionFinalized. `applicable`=true bila ADA review EQR
   utk engagement tsb (gerbang relevan); `cleared`=true bila SEMUA review-nya
   lolos gerbang (checklist tuntas + tak ada temuan terbuka). Mengikat penerbitan
   opini & pengarsipan ke penyelesaian EQR substantif — bukan sekadar centang. */
type EqrReview = { eng?: string; cleared?: boolean };
function eqrReviewsLS(): EqrReview[] {
  try {
    /* eqrReviews.v2 firm-scoped (registry lintas-engagement, tak di AMS_PERSIST_SCOPE)
       → cacheKey W6 'ams.v1.firm.<FIRM-WHR>.eqrReviews.v2'. Pembaca ini dulu menunjuk
       key legacy pra-W6 'ams.v1.eqrReviews.v2' yg tak ditulis pasca-W6 → basi (bug laten,
       sekelas pembaca opinionDoc). FIRM_SCOPE_ID konstan demo single-firm. */
    const raw = localStorage.getItem('ams.v1.firm.FIRM-WHR.eqrReviews.v2');
    if (raw) { const d = JSON.parse(raw); if (Array.isArray(d)) return d as EqrReview[]; }
  } catch (e) { /* localStorage/JSON gagal → pakai seed */ }
  try {
    const w = window as unknown as { AMS?: { EQR_REVIEWS?: EqrReview[] } };
    return (w.AMS && w.AMS.EQR_REVIEWS) || [];
  } catch (e) { return []; }
}
function eqrStatusFor(engId: string | null | undefined) {
  if (!engId) return { applicable: false, cleared: true, count: 0, clearedCount: 0 };
  const list = eqrReviewsLS().filter((r) => !!r && r.eng === engId);
  if (!list.length) return { applicable: false, cleared: true, count: 0, clearedCount: 0 };
  const clearedCount = list.filter((r) => !!r.cleared).length;
  return { applicable: true, cleared: clearedCount === list.length, count: list.length, clearedCount };
}

/* engagementGate — daftar prasyarat transisi ke fase berikutnya.
   →Finalisasi (isu #3, sadar-progres): kesimpulan SA 230 ≥80% + 0 WP
   belum-dimulai + 0 catatan prioritas-tinggi terbuka (severity 'warn',
   override mungkin). →Arsip: opini final + 100% WP ter-review + 0 catatan
   terbuka + EQR (severity 'confirm'). Maju-mundur/sama-fase = bebas. */
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
    /* SA 210/220 (M4): masuk Eksekusi (mulai fieldwork) menuntut keputusan
       penerimaan/keberlanjutan disetujui + surat perikatan signed. Severity
       'warn' (Q1 graduated, override-able & ter-log) → engagement hasil konversi
       (M3, mewarisi provenance) lolos TANPA dialog; jalur bypass (EngagementForm
       manual / seed legacy → default Pra-akseptasi M2) memunculkan dialog blocker.
       Resolusi engagement by engId yg sedang dipindah — bukan asumsi aktif. */
    severity = 'warn';
    const eng = (o.engId && firm && firm.engagements
      ? firm.engagements.find((x: { id?: string }) => x.id === o.engId) : null) || (firm && firm.activeEngagement);
    criteria = engagementEntryGate(engagementEntryContext(eng)).criteria;
  } else if (nextPhase === 'Finalisasi') {
    severity = 'warn';
    // Isu #3: gerbang sadar-progres eksekusi (kesimpulan SA 230 ≥80% + 0 WP
    // belum-dimulai + 0 catatan high). Logika ambang = util murni & teruji.
    // A1: integritas neraca saldo (W-WTB·2) — sumber & pemetaan identik modul
    // WTB (checkWtbIntegrity(wtb, aje)), kini dibaca gerbang finalisasi.
    const integ = checkWtbIntegrity((audit && audit.wtb) || [], (audit && audit.aje) || []);
    const wtbDetail = integ.status === 'ok' ? '' : [
      !integ.bsTied && 'neraca tak seimbang',
      !integ.adjConsistent && `${integ.adjMismatches.length} akun adjusted ≠ unadj+AJE`,
      !integ.ajeBalanced && 'kolom AJE tak seimbang',
      !integ.registerReconciled && `${integ.ajeMismatches.length} akun AJE WTB ≠ register`,
    ].filter(Boolean).join('; ');
    criteria = finalisationGateCriteria({
      conclusionPct: recap.conclusionPct,
      notStarted: recap.notStarted,
      highOpenCount: highOpen.length,
      wtbIntegrityOk: integ.status === 'ok',
      wtbIntegrityDetail: wtbDetail,
    });
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
    /* Q-02 (ISQM 2): bila engagement punya review EQR, ia WAJIB lolos gerbang
       sebelum arsip — defense-in-depth atas penegakan di penerbitan opini. */
    const eqr = eqrStatusFor(firm && firm.activeEngagementId);
    if (eqr.applicable) {
      criteria.push({ key: 'eqrCleared', label: 'Penelaahan mutu perikatan (EQR) lolos gerbang (ISQM 2)',
        met: eqr.cleared, detail: `${eqr.clearedCount}/${eqr.count} EQR lolos gerbang`, view: 'eqr' });
    }
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
  const auth = useAuth();
  /* Override gerbang (maju fase MESKI ada blocker) = Partner-only (PHASE_OVERRIDE).
     Maju fase saat prasyarat TERPENUHI tetap bebas. Lihat prd-phase-gate-override-rbac. */
  const canOverride: boolean = !auth || typeof auth.can !== 'function' || auth.can(CAP.PHASE_OVERRIDE);
  const setEngagementPhase = (firm && firm.setEngagementPhase) || (() => {});
  const logActivity = (audit && audit.logActivity) || (() => {});
  const [pending, setPending] = useStateWPS(null);
  const attempt = (engId: any, fromPhase: any, toPhase: any) => {
    const g = engagementGate(audit, firm, { nextPhase: toPhase, fromPhase, engId });
    const needsDialog = g.severity === 'confirm' ? true : (g.severity === 'warn' && !g.allMet);
    if (!needsDialog) { setEngagementPhase(engId, toPhase); return; }
    setPending({ engId, fromPhase, toPhase, gate: g });
  };
  const confirm = () => {
    if (!pending) return;
    // guard defense-in-depth: override (lanjut meski blocker) butuh Partner — UI sudah disable tombolnya.
    if (pending.gate.blockers.length && !canOverride) return;
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
  const auth = useAuth();
  if (!gate) return null;
  const isConfirm = gate.severity === 'confirm';
  const blocked = gate.blockers.length > 0;
  /* override (lanjut meski blocker) = Partner-only; konfirmasi tanpa-blocker tetap bebas. */
  const canOverride = !auth || typeof auth.can !== 'function' || auth.can(CAP.PHASE_OVERRIDE);
  const overrideBlocked = blocked && !canOverride;
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
        {overrideBlocked && (
          <div className="tiny" style={{ padding: '8px 16px', background: 'var(--red-bg)', color: 'var(--red)', fontWeight: 600 }}>
            <I.lock size={11} /> Hanya Partner yang dapat menembus prasyarat (override). Selesaikan prasyarat di atas, atau minta Partner.
          </div>
        )}
        <div className="row jb ac" style={{ padding: '11px 16px', borderTop: '1px solid var(--line)', background: 'var(--surface-2)' }}>
          <button className="btn sm" onClick={onCancel}>Batal</button>
          <Btn sm variant="primary" disabled={overrideBlocked} style={{ background: accent, borderColor: accent, opacity: overrideBlocked ? 0.5 : 1 }} onClick={overrideBlocked ? undefined : onConfirm}>
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
  PHASE_ORDER, engagementGate, EngagementGateSummary, usePhaseGate, PhaseGateDialog, eqrStatusFor,
};
