/* [codemod] ESM imports */
import React from 'react';
import { AMS_CANON } from './canon';
import { useAudit, useFirm, useNav } from './contexts.jsx';
import { I } from './icons.jsx';
import { SubBar } from './shell.jsx';
import { Badge, Btn, Donut, Panel } from './ui.jsx';
import { wpSignersFor } from './wp_signoff.jsx';

/* ============================================================
   NeoSuite AMS — PSAK 71 · Instrumen Keuangan (IFRS 9)
   ------------------------------------------------------------
   Kertas kerja penyusunan & audit instrumen keuangan yang DITARIK
   PENUH dari satu sumber kebenaran:
     · Working Trial Balance (useAudit().wtb) — piutang bruto 1-1200
       & CKPN 1-1210 (saldo dibukukan, AJE-02, audited)
     · AMS_CANON.psak71(wtb) — mesin ECL & klasifikasi yang SAMA
       dipakai Kalkulator ECL, tab Rekonsiliasi Angka, dan dirujuk
       PSAK 46 (DTA), PSAK 2 (add-back) & FS Generator
   Cakupan:
     • Klasifikasi & pengukuran — model bisnis + uji SPPI (¶4.1)
     • Penurunan nilai — pendekatan disederhanakan, matriks provisi,
       staging & SICR (¶5.5)
     • Overlay forward-looking — skenario makro berbobot probabilitas
       (¶5.5.17) + analisis sensitivitas
     • Mutasi CKPN (roll-forward) — menutup persis ke WTB
     • Rekonsiliasi & keterkaitan lintas-modul (satu sumber angka)
     • Kesimpulan audit estimasi (SA 540) + usulan AJE-02
   ============================================================ */
const { useState: useStateP71, useMemo: useMemoP71 } = React;

/* ---- klasifikasi & pengukuran instrumen keuangan (¶4.1) ---- */
const P71_CLASSIFY = [
  { id: 'cash',   side: 'aset', inst: 'Kas & setara kas',                 codes: ['1-1100'], bm: 'Dimiliki untuk menagih', sppi: true,  cls: 'Biaya perolehan diamortisasi', ecl: 'Umum · 12-bulan', note: 'Risiko kredit rendah → ECL imaterial' },
  { id: 'ar',     side: 'aset', inst: 'Piutang usaha — pihak ketiga',     codes: ['1-1200', '1-1210'], bm: 'Dimiliki untuk menagih', sppi: true, cls: 'Biaya perolehan diamortisasi', ecl: 'Disederhanakan · lifetime', note: 'Matriks provisi · fokus audit (R-03)', focus: true },
  { id: 'dep',    side: 'aset', inst: 'Deposito berjangka',               codes: [], approx: 6800, bm: 'Dimiliki untuk menagih', sppi: true, cls: 'Biaya perolehan diamortisasi', ecl: 'Umum · 12-bulan', note: 'Bank counterparty rating tinggi' },
  { id: 'bond',   side: 'aset', inst: 'Obligasi pemerintah (SUN)',        codes: [], approx: 4200, bm: 'Menagih & menjual', sppi: true,  cls: 'FVOCI', ecl: 'Umum · 12-bulan', note: 'Untung/rugi belum direalisasi → OCI' },
  { id: 'fwd',    side: 'aset', inst: 'Kontrak forward valas (lindung nilai)', codes: [], approx: 6400, bm: 'Lainnya (derivatif)', sppi: false, cls: 'FVTPL', ecl: '—', note: 'Lindung nilai arus kas · valuasi Pakar (IFRS 13)', link: 'expert' },
  { id: 'equity', side: 'aset', inst: 'Penyertaan saham non-pengendali',  codes: [], approx: 2100, bm: 'Lainnya', sppi: false, cls: 'FVOCI (elektif)', ecl: '—', note: 'Pilihan tak-dapat-dibatalkan (¶5.7.5)' },
  { id: 'ap',     side: 'liabilitas', inst: 'Utang usaha',                codes: ['2-1100'], bm: '—', sppi: null, cls: 'Biaya perolehan diamortisasi', ecl: '—', note: 'Tanpa komponen pendanaan signifikan' },
  { id: 'bank',   side: 'liabilitas', inst: 'Utang bank (pendek & panjang)', codes: ['2-1200', '2-2100'], bm: '—', sppi: null, cls: 'Biaya perolehan diamortisasi', ecl: '—', note: 'Diukur dgn suku bunga efektif' },
  { id: 'lease',  side: 'liabilitas', inst: 'Liabilitas sewa',            codes: ['2-1500', '2-2200'], bm: '—', sppi: null, cls: 'Di luar lingkup (PSAK 73)', ecl: '—', note: 'Diatur PSAK 73 · Sewa', link: 'psak73' },
];

/* ---- uji SPPI atas piutang usaha (¶4.1.2) ---- */
const P71_SPPI = [
  { q: 'Arus kas kontraktual semata pokok & bunga (SPPI)?', a: 'Ya — termin 30–90 hari, tanpa fitur konversi', ok: true },
  { q: 'Terdapat leverage yang memperbesar variabilitas arus kas?', a: 'Tidak', ok: true },
  { q: 'Fitur percepatan/perpanjangan yang menyimpang dari SPPI?', a: 'Tidak — denda keterlambatan wajar', ok: true },
  { q: 'Model bisnis: dimiliki untuk menagih arus kas kontraktual?', a: 'Ya — piutang ditagih sampai lunas', ok: true },
];

/* ---- prosedur audit estimasi ECL (SA 540 · PSAK 71) ---- */
const P71_PROC = [
  { ref: 'SA 540 ¶13', t: 'Pahami model ECL manajemen: sumber data aging, loss rate historis & overlay forward-looking' },
  { ref: 'SA 500',     t: 'Uji kelengkapan & akurasi data aging piutang — rekonsiliasi sub-ledger ke WTB 1-1200' },
  { ref: 'PSAK 71 ¶5.5', t: 'Evaluasi penetapan stage & kriteria SICR (kenaikan signifikan risiko kredit)' },
  { ref: 'SA 540 ¶15', t: 'Kembangkan ekspektasi independen loss rate dari data write-off & recovery 2022–2024' },
  { ref: 'SA 540 ¶18', t: 'Uji kewajaran overlay makroekonomi & bobot probabilitas skenario forward-looking' },
  { ref: 'SA 540 ¶A',  t: 'Uji sensitivitas: dampak ±1% loss rate & pergeseran bobot skenario terhadap CKPN' },
  { ref: 'SA 505',     t: 'Konfirmasi eksternal piutang signifikan & telaah penerimaan kas setelah tanggal neraca' },
  { ref: 'SA 240',     t: 'Evaluasi indikator bias manajemen pada estimasi CKPN (management override)' },
  { ref: 'PSAK 71 ¶35', t: 'Telaah kecukupan pengungkapan: rekonsiliasi cadangan, sensitivitas & eksposur risiko kredit' },
  { ref: 'SA 230',     t: 'Dokumentasikan dasar kesimpulan & jejak audit estimasi ECL (WP B-7)' },
];

/* ---- keterkaitan kertas kerja (lineage dua arah) ---- */
const P71_UPSTREAM = [
  { id: 'wtb',     ic: 'table',   lbl: 'Working Trial Balance',  rel: 'Piutang bruto 1-1200 & CKPN 1-1210 — sumber saldo' },
  { id: 'sampling', ic: 'flask',  lbl: 'Sampling (SA 530)',      rel: 'Sub-ledger piutang & pengujian saldo per debitur' },
  { id: 'confirm', ic: 'mail',    lbl: 'Konfirmasi (SA 505)',    rel: 'Konfirmasi eksternal piutang pihak ketiga' },
  { id: 'icfr',    ic: 'shield',  lbl: 'Pengendalian Internal',  rel: 'Kontrol pemberian kredit & penagihan' },
];
const P71_DOWNSTREAM = [
  { id: 'psak68',  ic: 'layers',  lbl: 'PSAK 68 · Nilai Wajar', rel: 'Pos FVOCI/FVTPL (obligasi, forward, saham) → hierarki nilai wajar' },
  { id: 'aje',     ic: 'ledger',  lbl: 'Adjusting Entries (AJE)', rel: 'AJE-02 — tambahan CKPN sesuai model ECL' },
  { id: 'psak46',  ic: 'receipt', lbl: 'PSAK 46 · Pajak Tangguhan', rel: 'CKPN belum deductible → aset pajak tangguhan' },
  { id: 'psak2',   ic: 'water',   lbl: 'PSAK 2 · Arus Kas',      rel: 'Beban ECL (non-kas) → add-back arus kas operasi' },
  { id: 'sad',     ic: 'scale',   lbl: 'SAD Ledger (SA 450)',    rel: 'Selisih estimasi CKPN → akumulasi salah saji (M-04)' },
  { id: 'fsgen',   ic: 'report',  lbl: 'FS Generator',           rel: 'Piutang neto & beban penurunan nilai → penyajian LK' },
];

/* ---- ketentuan kunci PSAK 71 ---- */
const P71_KEY = [
  { k: 'Model penurunan nilai', v: 'Expected Loss', note: 'Beralih dari incurred loss (PSAK 55) ke kerugian kredit ekspektasian — bersifat forward-looking.' },
  { k: 'Pendekatan piutang usaha', v: 'Disederhanakan', note: 'Lifetime ECL diakui sejak awal tanpa menilai SICR (¶5.5.15) — via matriks provisi.' },
  { k: 'Tiga stage (umum)', v: 'Stage 1·2·3', note: 'Stage 1: 12-bln ECL; Stage 2/3: lifetime ECL setelah SICR / kredit memburuk.' },
  { k: 'Forward-looking', v: '¶5.5.17', note: 'Estimasi mempertimbangkan informasi makroekonomi masa depan yang wajar & terdukung.' },
];

const P71_STAGE_META = {
  1: { color: '#1f7a4d', kind: 'green', lbl: 'Stage 1', sub: 'Performing · 12-bln' },
  2: { color: '#c79a1e', kind: 'amber', lbl: 'Stage 2', sub: 'Under-performing · lifetime (SICR)' },
  3: { color: '#b3261e', kind: 'red',   lbl: 'Stage 3', sub: 'Credit-impaired · lifetime' },
};

function P71Card({ value, label, sub, accent }) {
  return (
    <div className="panel" style={{ padding: '12px 14px', display: 'grid', gap: 2 }}>
      <div className="mono" style={{ fontSize: 21, fontWeight: 700, color: accent || 'var(--navy)', lineHeight: 1.05 }}>{value}</div>
      <div className="tiny muted" style={{ fontWeight: 600 }}>{label}</div>
      {sub && <div className="tiny" style={{ color: 'var(--ink-4)' }}>{sub}</div>}
    </div>
  );
}

function P71RowKv({ label, v, strong, accent }) {
  return (
    <div className="row jb ac">
      <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>{label}</span>
      <span className="mono" style={{ fontWeight: strong ? 700 : 600, fontSize: strong ? 14 : 12.5, color: accent || (strong ? 'var(--navy)' : 'inherit') }}>{v}</span>
    </div>
  );
}

/* ---- default penanda tangan kertas kerja (dipakai bila chain kanonik kosong) ---- */
function p71WpSignoffDefaults() {
  const TEAM = (window.AMS && window.AMS.TEAM) || [];
  const find = (kw) => (TEAM.find(t => t.role.includes(kw)) || {}).name || '—';
  return {
    preparer: { by: find('Senior'),  role: 'Auditor Senior', at: '08 Jan 2026' },
    reviewer: { by: find('Manager'), role: 'Manajer Audit',  at: '14 Jan 2026' },
    approver: { by: find('Partner'), role: 'Rekan Penanggung Jawab', at: '16 Jan 2026' },
  };
}

/* ============================================================
   KERTAS KERJA B-7 — lembar kerja formal, siap-reviu & cetak.
   Setiap angka ditarik dari prop `p71` (= AMS_CANON.psak71(wtb)),
   sehingga IDENTIK dengan tab analisis, Kalkulator ECL, PSAK 46/2/68,
   Rekonsiliasi & FS Generator. Tidak ada angka yang ditulis ulang.
   ============================================================ */
function P71WorkPaper({ p71, client, eng, fmt, rp, nav }) {
  const FIRM = (window.AMS && window.AMS.FIRM) || { name: 'KAP Wijaya Hartono & Rekan', license: '' };
  const audit = useAudit();
  const so = wpSignersFor(audit, 'psak71', p71WpSignoffDefaults());
  const r0 = (x) => Math.round(x);
  const Sect = ({ n, title, sub, children }) => (
    <div style={{ marginTop: 22 }}>
      <div className="row ac gap8" style={{ borderBottom: '1.5px solid var(--navy)', paddingBottom: 5, marginBottom: 11 }}>
        <span className="mono" style={{ width: 22, height: 22, flex: '0 0 22px', borderRadius: 5, background: 'var(--navy)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700 }}>{n}</span>
        <h4 style={{ margin: 0, fontSize: 13.5, color: 'var(--navy)', fontWeight: 700, letterSpacing: '.01em' }}>{title}</h4>
        {sub && <span className="tiny muted mono" style={{ marginLeft: 'auto' }}>{sub}</span>}
      </div>
      {children}
    </div>
  );
  const Meta = ({ k, v, mono }) => (
    <div style={{ display: 'grid', gap: 1 }}>
      <span className="tiny upper" style={{ letterSpacing: '.05em', color: 'var(--ink-4)', fontSize: 9.5, fontWeight: 700 }}>{k}</span>
      <span className={mono ? 'mono' : ''} style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>{v}</span>
    </div>
  );
  const Sign = ({ lbl, p, accent }) => (
    <div style={{ flex: 1, borderTop: '2px solid ' + (accent || 'var(--navy)'), paddingTop: 8 }}>
      <div className="tiny upper" style={{ letterSpacing: '.05em', color: 'var(--ink-4)', fontSize: 9.5, fontWeight: 700, marginBottom: 14 }}>{lbl}</div>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--navy)' }}>{p.by}</div>
      <div className="tiny muted">{p.role}</div>
      <div className="tiny mono" style={{ color: 'var(--ink-3)', marginTop: 3 }}>{p.at}</div>
    </div>
  );

  return (
    <div className="panel" style={{ background: '#fff', maxWidth: 880, margin: '0 auto', width: '100%', padding: '30px 38px 34px', boxShadow: 'var(--shadow)' }}>
      {/* kop kertas kerja */}
      <div className="row jb" style={{ alignItems: 'flex-start', gap: 18, paddingBottom: 14, borderBottom: '2px solid var(--navy)' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--navy)', lineHeight: 1.2 }}>{FIRM.name}</div>
          <div className="mono tiny" style={{ color: 'var(--ink-4)' }}>{FIRM.license}</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', marginTop: 9 }}>Kertas Kerja — Penurunan Nilai Piutang Usaha (ECL)</div>
          <div className="tiny muted">Kerugian Kredit Ekspektasian · PSAK 71 (IFRS 9) · pendekatan disederhanakan</div>
        </div>
        <div style={{ textAlign: 'right', flex: '0 0 auto' }}>
          <div className="mono" style={{ display: 'inline-block', border: '1.5px solid var(--navy)', borderRadius: 7, padding: '5px 12px', fontSize: 17, fontWeight: 800, color: 'var(--navy)' }}>B-7</div>
          <div className="tiny muted" style={{ marginTop: 6 }}>Indeks lead schedule <b style={{ color: 'var(--ink)' }}>B</b> · Piutang</div>
        </div>
      </div>

      {/* meta engagement */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: '12px 18px', padding: '14px 0', borderBottom: '1px solid var(--line)' }}>
        <Meta k="Klien" v={client.name} />
        <Meta k="NPWP" v={client.npwp || '01.234.567.8-045.000'} mono />
        <Meta k="Periode" v="31 Desember 2025" />
        <Meta k="Engagement" v={eng.id} mono />
        <Meta k="Akun diaudit" v="1-1200 · 1-1210" mono />
        <Meta k="Asersi utama" v="Penilaian & alokasi (valuation)" />
        <Meta k="Risiko terkait" v="R-03 · Estimasi signifikan" />
        <Meta k="Standar audit" v="SA 540 (Revisi)" />
      </div>

      {/* §1 tujuan */}
      <Sect n="1" title="Tujuan & Lingkup">
        <p style={{ margin: 0, fontSize: 12, lineHeight: 1.65, color: 'var(--ink-2)' }}>
          Memperoleh bukti audit yang cukup dan tepat bahwa <b>cadangan kerugian penurunan nilai (CKPN)</b> atas piutang usaha telah ditetapkan sesuai model <b>kerugian kredit ekspektasian (ECL)</b> PSAK 71 dengan pendekatan disederhanakan (lifetime ECL, ¶5.5.15), serta menilai kewajaran asumsi loss rate historis dan <b>overlay forward-looking</b> (¶5.5.17). Lingkup mencakup klasifikasi & uji SPPI, matriks provisi, staging, mutasi CKPN, dan dampak lintas-modul (pajak tangguhan, arus kas, penyajian LK).
        </p>
      </Sect>

      {/* §2 sumber data — single source */}
      <Sect n="2" title="Sumber Data — Satu Sumber Kebenaran" sub="Rp juta">
        <table className="dtbl" style={{ width: '100%' }}>
          <thead><tr>
            <th style={{ textAlign: 'left' }}>Input model</th>
            <th style={{ textAlign: 'left', width: 210 }}>Sumber terikat</th>
            <th style={{ textAlign: 'right', width: 96 }}>Nilai</th>
          </tr></thead>
          <tbody>
            <tr><td>Piutang usaha bruto (audited)</td><td className="mono tiny" style={{ color: 'var(--ink-3)' }}>WTB · 1-1200 (adjusted)</td><td className="mono" style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(r0(p71.grossAudited))}</td></tr>
            <tr><td>Piutang bruto pra-audit</td><td className="mono tiny" style={{ color: 'var(--ink-3)' }}>WTB · 1-1200 (unadjusted)</td><td className="mono" style={{ textAlign: 'right' }}>{fmt(r0(p71.grossUnadj))}</td></tr>
            <tr><td>CKPN dibukukan klien</td><td className="mono tiny" style={{ color: 'var(--ink-3)' }}>WTB · 1-1210 (unadjusted)</td><td className="mono" style={{ textAlign: 'right' }}>{fmt(r0(p71.ckpnBooked))}</td></tr>
            <tr><td>CKPN awal (PY audited)</td><td className="mono tiny" style={{ color: 'var(--ink-3)' }}>WTB · 1-1210 (prior year)</td><td className="mono" style={{ textAlign: 'right' }}>{fmt(r0(p71.ckpnPy))}</td></tr>
            <tr><td>Matriks aging & loss rate historis</td><td className="mono tiny" style={{ color: 'var(--ink-3)' }}>AMS_CANON · ECL_AGING</td><td className="mono tiny muted" style={{ textAlign: 'right' }}>5 bucket</td></tr>
            <tr><td>Write-off / recovery tahun berjalan</td><td className="mono tiny" style={{ color: 'var(--ink-3)' }}>AMS_CANON · ECL_HISTORY</td><td className="mono" style={{ textAlign: 'right' }}>{fmt(p71.writeOff)} / {fmt(p71.recovery)}</td></tr>
          </tbody>
        </table>
        <div className="tiny muted" style={{ marginTop: 8, lineHeight: 1.55 }}>Seluruh input dihitung satu kali pada <span className="mono">AMS_CANON.psak71(wtb)</span>. Setiap perubahan AJE pada WTB otomatis memperbarui kertas kerja ini beserta modul konsumen — tanpa angka ganda.</div>
      </Sect>

      {/* §3 perhitungan ECL */}
      <Sect n="3" title="Prosedur & Hasil — Perhitungan ECL" sub="matriks provisi × overlay">
        <table className="dtbl" style={{ width: '100%' }}>
          <thead><tr>
            <th style={{ textAlign: 'left' }}>Bucket umur</th>
            <th style={{ textAlign: 'center', width: 64 }}>Stage</th>
            <th style={{ textAlign: 'right', width: 96 }}>Eksposur</th>
            <th style={{ textAlign: 'right', width: 80 }}>Loss rate</th>
            <th style={{ textAlign: 'right', width: 88 }}>ECL</th>
          </tr></thead>
          <tbody>
            {p71.buckets.map(b => {
              const sm = P71_STAGE_META[b.stage];
              return (
                <tr key={b.id}>
                  <td style={{ fontWeight: 600 }}>{b.label}{b.sicr && <span className="mono tiny" style={{ color: 'var(--amber)', marginLeft: 6 }}>SICR</span>}</td>
                  <td style={{ textAlign: 'center' }}><Badge kind={sm.kind}>{sm.lbl}</Badge></td>
                  <td className="mono" style={{ textAlign: 'right' }}>{fmt(r0(b.gross))}</td>
                  <td className="mono" style={{ textAlign: 'right', color: 'var(--ink-2)' }}>{b.rate.toFixed(1)}%</td>
                  <td className="mono" style={{ textAlign: 'right', fontWeight: 700, color: 'var(--blue)' }}>{fmt(r0(b.ecl))}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ background: 'var(--surface-2)' }}>
              <td colSpan={2} style={{ fontWeight: 700, color: 'var(--navy)' }}>ECL MODEL AUDITOR</td>
              <td className="mono" style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(r0(p71.grossTot))}</td>
              <td className="mono" style={{ textAlign: 'right', fontWeight: 700 }}>{(p71.coverage * 100).toFixed(1)}%</td>
              <td className="mono" style={{ textAlign: 'right', fontWeight: 800, color: 'var(--navy)' }}>{fmt(r0(p71.eclModel))}</td>
            </tr>
          </tfoot>
        </table>
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 11 }}>
          <div className="panel" style={{ padding: '9px 12px', background: 'var(--surface-2)', boxShadow: 'none', display: 'grid', gap: 5 }}>
            <P71RowKv label="ECL basis matriks historis" v={fmt(r0(p71.baseTot)) + ' jt'} />
            <P71RowKv label={'Overlay forward-looking (×' + p71.overlay.toFixed(4) + ')'} v={'+' + fmt(r0(p71.overlayAmt)) + ' jt'} accent="var(--amber)" />
            <P71RowKv label="ECL model auditor" v={fmt(r0(p71.eclModel)) + ' jt'} strong />
          </div>
          <div className="panel" style={{ padding: '9px 12px', background: 'var(--surface-2)', boxShadow: 'none', display: 'grid', gap: 5 }}>
            <P71RowKv label="Piutang bruto (audited)" v={fmt(r0(p71.grossAudited)) + ' jt'} />
            <P71RowKv label="ECL / CKPN model" v={'(' + fmt(r0(p71.eclModel)) + ')'} accent="var(--red)" />
            <P71RowKv label="Piutang neto (carrying)" v={fmt(r0(p71.grossAudited - p71.eclModel)) + ' jt'} strong />
          </div>
        </div>
      </Sect>

      {/* §4 roll-forward */}
      <Sect n="4" title="Rekonsiliasi CKPN — Roll-forward" sub="menutup ke WTB 1-1210">
        <table className="dtbl" style={{ width: '100%' }}>
          <tbody>
            {[
              { t: 'Saldo awal CKPN (1 Jan 2025, PY audited)', v: p71.ckpnPy, tot: true },
              { t: 'Penghapusbukuan piutang (write-off)', v: -p71.writeOff },
              { t: 'Pemulihan piutang dihapusbukukan (recovery)', v: p71.recovery },
              { t: 'Beban penurunan nilai — dibukukan klien', v: r0(p71.chargeClient) },
              { t: 'Saldo CKPN dibukukan klien (pra-audit)', v: p71.ckpnBooked, tot: true },
              { t: 'Koreksi audit — AJE-02 (tambahan ECL)', v: p71.ckpnAje, accent: 'var(--amber)' },
              { t: 'Saldo akhir CKPN audited (31 Des 2025)', v: p71.ckpnAudited, tot: true },
            ].map((r, i) => (
              <tr key={i} style={{ background: r.tot ? 'var(--surface-2)' : 'transparent' }}>
                <td style={{ fontWeight: r.tot ? 700 : 500, color: r.tot ? 'var(--navy)' : 'var(--ink)', fontSize: 12 }}>{r.t}</td>
                <td className="mono" style={{ textAlign: 'right', fontWeight: 700, color: r.v < 0 ? 'var(--red)' : (r.accent || (r.tot ? 'var(--navy)' : 'var(--green)')) }}>{r.v < 0 ? '(' + fmt(-r.v) + ')' : (r.tot ? '' : '+') + fmt(r.v)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Sect>

      {/* §5 kesimpulan */}
      <Sect n="5" title="Kesimpulan Audit">
        <div className="panel" style={{ padding: '11px 13px', background: p71.gap > 100 ? 'var(--amber-bg)' : 'var(--green-bg)', borderColor: 'transparent' }}>
          <div className="row gap8" style={{ alignItems: 'flex-start' }}>
            <span style={{ color: p71.gap > 100 ? 'var(--amber)' : 'var(--green)', marginTop: 1, flex: '0 0 auto' }}><I.alert size={15} /></span>
            <div style={{ fontSize: 12, lineHeight: 1.6 }}>
              CKPN dibukukan klien <b>{rp(p71.ckpnBooked)} jt</b> <b>kurang saji {rp(p71.gap)} jt</b> dibanding model ECL auditor <b>{rp(p71.eclModel)} jt</b>. Diusulkan <b>AJE-02</b> sebesar <b>{rp(p71.ckpnAje)} jt</b> sehingga CKPN audited menjadi <b>{rp(p71.ckpnAudited)} jt</b>. Selisih residual terhadap model <b>{rp(Math.abs(p71.auditVariance))} jt</b> berada di bawah ambang toleransi (≤ Rp 25 jt) dan dicatat di SAD Ledger sebagai salah saji tak dikoreksi. Klasifikasi & pengukuran instrumen keuangan telah sesuai PSAK 71 ¶4.1; piutang usaha lolos uji SPPI → biaya perolehan diamortisasi.
            </div>
          </div>
        </div>
      </Sect>

      {/* §6 jurnal */}
      <Sect n="6" title="Usulan Jurnal — AJE-02">
        <table className="dtbl" style={{ width: '100%' }}>
          <thead><tr><th style={{ textAlign: 'left' }}>Akun</th><th style={{ textAlign: 'right', width: 96 }}>Debit</th><th style={{ textAlign: 'right', width: 96 }}>Kredit</th></tr></thead>
          <tbody>
            <tr><td>Dr · Beban Penurunan Nilai <span className="mono tiny muted">5-3100</span></td><td className="mono" style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(p71.ckpnAje)}</td><td></td></tr>
            <tr><td style={{ paddingLeft: 18 }}>Cr · CKPN Piutang <span className="mono tiny muted">1-1210</span></td><td></td><td className="mono" style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(p71.ckpnAje)}</td></tr>
          </tbody>
        </table>
      </Sect>

      {/* §7 referensi silang */}
      <Sect n="7" title="Referensi Silang — Aliran Angka">
        <div className="row gap8" style={{ flexWrap: 'wrap' }}>
          {[
            { lbl: 'WTB 1-1200/1-1210', id: 'wtb' }, { lbl: 'Kalkulator ECL', id: 'ecl' },
            { lbl: 'PSAK 46 · DTA', id: 'psak46' }, { lbl: 'PSAK 2 · Arus Kas', id: 'psak2' },
            { lbl: 'PSAK 68 · Nilai Wajar', id: 'psak68' }, { lbl: 'SAD Ledger', id: 'sad' },
            { lbl: 'AJE Ledger', id: 'aje' }, { lbl: 'FS Generator', id: 'fsgen' },
          ].map(x => (
            <button key={x.id} onClick={() => nav(x.id, { from: 'psak71' })} className="row ac gap6" style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--surface)', cursor: 'pointer', fontSize: 11.5, fontWeight: 600, color: 'var(--ink-2)' }}>
              <I.link2 size={12} style={{ color: 'var(--blue)' }} />{x.lbl}
            </button>
          ))}
        </div>
      </Sect>

      {/* sign-off */}
      <div className="row gap20" style={{ marginTop: 26, gap: 26 }}>
        <Sign lbl="Disusun oleh" p={so.preparer} accent="var(--blue)" />
        <Sign lbl="Direviu oleh" p={so.reviewer} accent="var(--amber)" />
        <Sign lbl="Disetujui" p={so.approver} accent="var(--green)" />
      </div>
      <div className="tiny muted" style={{ marginTop: 16, paddingTop: 10, borderTop: '1px solid var(--line-soft)', lineHeight: 1.5 }}>
        WP B-7 · dokumentasi audit SA 230. Angka ditarik dari satu sumber kebenaran <span className="mono">AMS_CANON.psak71(WTB)</span> — konsisten dengan seluruh modul konsumen. Status & jejak tersimpan otomatis.
      </div>
    </div>
  );
}

function PSAK71View() {
  const { fmt } = window.AMS;
  const firm = useFirm();
  const audit = useAudit();
  const nav = useNav();
  const loader = window.loadLS || ((k, d) => d);

  /* ——— SUMBER KEBENARAN ——— */
  const wtb = (audit && audit.wtb && audit.wtb.length) ? audit.wtb : ((window.AMS && window.AMS.WTB) || []);
  const canon = AMS_CANON;
  const p71 = useMemoP71(() => canon.psak71(wtb), [wtb]);
  const dt = useMemoP71(() => canon.deferredTax(wtb), [wtb]);
  /* nilai wajar pos non-WTB (obligasi/forward/saham) DITARIK dari satu sumber: PSAK 68.
     Tidak ada lagi angka FV ganda yang di-hardcode di modul ini. */
  const p68 = useMemoP71(() => canon.psak68(wtb), [wtb]);
  const fvById = useMemoP71(() => Object.fromEntries(p68.items.filter(i => i.p71id).map(i => [i.p71id, i])), [p68]);
  const wadj = (code) => { const r = wtb.find(x => x.code === code); return r ? Math.round(r.adj / 1e6) : 0; };

  const [tab, setTab] = useStateP71(() => loader('ams.psak71.tab', 'klasifikasi'));
  const [done, setDone] = useStateP71(() => loader('ams.psak71.done', {}));
  /* bobot skenario interaktif (what-if) — diseed dari canon, dinormalkan saat dipakai */
  const [probs, setProbs] = useStateP71(() => loader('ams.psak71.probs', null) || Object.fromEntries(p71.scenarios.map(s => [s.id, s.prob])));

  React.useEffect(() => { try { localStorage.setItem('ams.psak71.tab', JSON.stringify(tab)); } catch (e) {} }, [tab]);
  React.useEffect(() => { try { localStorage.setItem('ams.psak71.done', JSON.stringify(done)); } catch (e) {} }, [done]);
  React.useEffect(() => { try { localStorage.setItem('ams.psak71.probs', JSON.stringify(probs)); } catch (e) {} }, [probs]);

  const rp = (x) => 'Rp ' + fmt(Math.round(x));
  const toggle = (id) => setDone(m => ({ ...m, [id]: !m[id] }));
  const doneCount = P71_PROC.filter((p, i) => done[p.ref + i]).length;
  const score = Math.round(doneCount / P71_PROC.length * 100);

  const client = firm.activeClient || { name: 'PT Sentosa Makmur Tbk' };
  const eng = firm.activeEngagement || { id: 'ENG-2025-014', fy: 'FY2025' };

  /* what-if overlay live (tab forward-looking) */
  const probSum = p71.scenarios.reduce((a, s) => a + (probs[s.id] || 0), 0) || 1;
  const liveOverlay = p71.scenarios.reduce((a, s) => a + (probs[s.id] || 0) / probSum * s.mult, 0);
  const liveEcl = p71.buckets.reduce((a, b) => a + b.baseEcl, 0) * liveOverlay;

  const stageSegs = p71.stages.map(s => ({ label: P71_STAGE_META[s.stage].lbl, value: s.ecl, color: P71_STAGE_META[s.stage].color }));

  const TABS = [
    { id: 'klasifikasi', label: 'Klasifikasi & SPPI' },
    { id: 'matriks', label: 'Staging & Matriks ECL' },
    { id: 'overlay', label: 'Forward-Looking' },
    { id: 'mutasi', label: 'Mutasi CKPN' },
    { id: 'rekonsiliasi', label: 'Rekonsiliasi' },
    { id: 'audit', label: 'Audit · SA 540' },
    { id: 'kk', label: 'Kertas Kerja B-7' },
  ];

  return (
    <>
      <SubBar moduleId="psak71" right={
        <div className="row gap8 ac">
          <Badge kind="blue">PSAK 71 · IFRS 9</Badge>
          <Btn sm onClick={() => nav('psak68', { from: 'psak71' })}><I.layers size={13} /> Hierarki Nilai Wajar</Btn>
          <Btn sm onClick={() => nav('ecl', { from: 'psak71' })}><I.target size={13} /> Kalkulator ECL</Btn>
          <Btn sm onClick={() => nav('psak46', { from: 'psak71' })}><I.receipt size={13} /> Dampak Pajak Tangguhan</Btn>
          <Btn sm onClick={() => setTab('kk')}><I.report size={13} /> Kertas Kerja B-7</Btn>
          <Btn sm variant="primary" onClick={() => nav('aje', { from: 'psak71' })}><I.ledger size={14} /> Usulkan AJE-02</Btn>
        </div>
      } />
      <div className="view-scroll">
        <div className="view-pad" style={{ display: 'grid', gap: 12 }}>

          {/* summary cards — selalu tampil */}
          <div className="grid" style={{ gridTemplateColumns: 'repeat(5,1fr)', gap: 10 }}>
            <P71Card value={rp(p71.grossAudited) + ' jt'} label="Piutang bruto (audited)" sub="WTB 1-1200" accent="var(--navy)" />
            <P71Card value={rp(p71.eclModel) + ' jt'} label="ECL per model auditor" sub={'Coverage ' + (p71.coverage * 100).toFixed(1) + '% · lifetime'} accent="var(--blue)" />
            <P71Card value={rp(p71.ckpnBooked) + ' jt'} label="CKPN dibukukan klien" sub="WTB 1-1210 · pra-audit" />
            <P71Card value={'+' + rp(p71.gap) + ' jt'} label="Kurang saji (under-provision)" sub="→ usulan AJE-02" accent={p71.gap > 100 ? 'var(--red)' : 'var(--green)'} />
            <P71Card value={rp(p71.ckpnAudited) + ' jt'} label="CKPN audited (stlh AJE)" sub={'Selisih model ' + rp(Math.abs(p71.auditVariance)) + ' jt'} accent="var(--green)" />
          </div>

          {/* tabs */}
          <div className="row ac jb" style={{ flexWrap: 'wrap', gap: 8 }}>
            <div className="seg" style={{ width: 'fit-content', flexWrap: 'wrap' }}>
              {TABS.map(t => <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>{t.label}</button>)}
            </div>
            <span className="tiny muted">Satu sumber: <b>WTB</b> → <span className="mono">AMS_CANON.psak71(wtb)</span></span>
          </div>

          {/* ================= TAB · KLASIFIKASI & SPPI ================= */}
          {tab === 'klasifikasi' && (
            <div className="grid" style={{ gridTemplateColumns: '1fr 332px', gap: 12, alignItems: 'start' }}>
              <div className="grid" style={{ gap: 12 }}>
                <Panel noBody>
                  <div className="panel-h"><h3>Klasifikasi & Pengukuran Instrumen Keuangan</h3><span className="sub mono">model bisnis × uji SPPI (¶4.1)</span><div style={{ flex: 1 }} /><span className="tiny muted">Rp juta</span></div>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="dtbl" style={{ width: '100%' }}>
                      <thead><tr>
                        <th style={{ textAlign: 'left' }}>Instrumen</th>
                        <th style={{ textAlign: 'left', width: 120 }}>Model Bisnis</th>
                        <th style={{ textAlign: 'center', width: 54 }}>SPPI</th>
                        <th style={{ textAlign: 'left', width: 150 }}>Klasifikasi</th>
                        <th style={{ textAlign: 'right', width: 80 }}>Tercatat</th>
                      </tr></thead>
                      <tbody>
                        {['aset', 'liabilitas'].map(side => (
                          <React.Fragment key={side}>
                            <tr style={{ background: 'var(--surface-2)' }}><td colSpan={5} className="tiny upper" style={{ fontWeight: 700, letterSpacing: '.04em', color: 'var(--ink-3)' }}>{side === 'aset' ? 'Aset Keuangan' : 'Liabilitas Keuangan'}</td></tr>
                            {P71_CLASSIFY.filter(r => r.side === side).map(r => {
                              const fvSrc = fvById[r.id];
                              const carry = r.codes && r.codes.length ? Math.abs(r.codes.reduce((a, c) => a + wadj(c), 0)) : (fvSrc ? fvSrc.fv : r.approx);
                              return (
                                <tr key={r.id} onClick={r.link ? () => nav(r.link, { from: 'psak71' }) : undefined} style={{ cursor: r.link ? 'pointer' : 'default', background: r.focus ? 'var(--blue-050)' : undefined }}>
                                  <td>
                                    <div className="row ac gap6" style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.3 }}>
                                      <span>{r.inst}</span>
                                      {r.focus && <Badge kind="blue">Fokus</Badge>}
                                      {r.link && <I.link2 size={12} style={{ color: 'var(--blue)' }} />}
                                    </div>
                                    <div className="tiny muted" style={{ lineHeight: 1.4 }}>{r.note}{r.codes && r.codes.length ? <span className="mono" style={{ color: 'var(--ink-4)' }}> · {r.codes.join(' + ')}</span> : <span className="mono" style={{ color: 'var(--ink-4)' }}> · estimasi</span>}{r.ecl !== '—' && <span> · ECL: {r.ecl}</span>}</div>
                                  </td>
                                  <td className="tiny" style={{ color: 'var(--ink-2)' }}>{r.bm}</td>
                                  <td style={{ textAlign: 'center' }}>{r.sppi === null ? <span className="tiny muted">—</span> : r.sppi ? <span style={{ color: 'var(--green)' }}><I.check size={14} /></span> : <span style={{ color: 'var(--ink-4)' }}>n/a</span>}</td>
                                  <td><span className="mono tiny" style={{ fontWeight: 600 }}>{r.cls}</span></td>
                                  <td className="mono" style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(carry)}</td>
                                </tr>
                              );
                            })}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="tiny muted" style={{ padding: '9px 14px 12px', lineHeight: 1.5 }}>
                    Klasifikasi aset keuangan ditentukan oleh <b>model bisnis</b> pengelolaan & karakteristik <b>arus kas kontraktual (SPPI)</b>. Hanya instrumen lolos SPPI yang diukur pada <b>biaya perolehan diamortisasi</b> atau <b>FVOCI</b>; sisanya <b>FVTPL</b>. Saldo terambil dari WTB; pos tanpa kode merupakan estimasi pengungkapan.
                  </div>
                </Panel>
              </div>

              <div className="grid" style={{ gap: 12 }}>
                <Panel title="Uji SPPI — Piutang Usaha" sub="¶4.1.2 · pohon keputusan">
                  <div style={{ display: 'grid', gap: 9 }}>
                    {P71_SPPI.map((s, i) => (
                      <div key={i} className="row gap8" style={{ alignItems: 'flex-start' }}>
                        <span style={{ color: 'var(--green)', marginTop: 1, flex: '0 0 auto' }}><I.checkCircle size={15} /></span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.35 }}>{s.q}</div>
                          <div className="tiny muted" style={{ lineHeight: 1.4 }}>{s.a}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="panel" style={{ marginTop: 11, padding: '9px 11px', background: 'var(--green-bg)', borderColor: 'transparent' }}>
                    <div className="row gap8"><span style={{ color: 'var(--green)' }}><I.check size={15} /></span><span style={{ fontSize: 11.5, lineHeight: 1.5 }}>Piutang usaha lolos SPPI & model "dimiliki untuk menagih" → diukur pada <b>biaya perolehan diamortisasi</b>, dikenakan <b>ECL pendekatan disederhanakan</b>.</span></div>
                  </div>
                </Panel>

                <Panel title="Ketentuan Kunci PSAK 71" sub="vs PSAK 55 (incurred loss)">
                  <div style={{ display: 'grid', gap: 0 }}>
                    {P71_KEY.map((a, i) => (
                      <div key={i} style={{ padding: '8px 0', borderBottom: i < P71_KEY.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
                        <div className="row ac jb"><span style={{ fontSize: 12, fontWeight: 600 }}>{a.k}</span><span className="mono" style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy)' }}>{a.v}</span></div>
                        <div className="tiny muted" style={{ lineHeight: 1.4, marginTop: 1 }}>{a.note}</div>
                      </div>
                    ))}
                  </div>
                </Panel>
              </div>
            </div>
          )}

          {/* ================= TAB · STAGING & MATRIKS ECL ================= */}
          {tab === 'matriks' && (
            <div className="grid" style={{ gridTemplateColumns: '1.55fr 1fr', gap: 12, alignItems: 'start' }}>
              <Panel noBody>
                <div className="panel-h"><h3>Matriks Provisi — Aging × Loss Rate</h3><span className="sub mono">pendekatan disederhanakan · lifetime ECL</span></div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="dtbl" style={{ width: '100%' }}>
                    <thead><tr>
                      <th style={{ textAlign: 'left' }}>Bucket Umur</th>
                      <th style={{ textAlign: 'left', width: 70 }}>Stage</th>
                      <th style={{ textAlign: 'right', width: 96 }}>Eksposur Bruto</th>
                      <th style={{ textAlign: 'right', width: 72 }}>Loss Rate</th>
                      <th style={{ textAlign: 'right', width: 92 }}>ECL (Rp jt)</th>
                    </tr></thead>
                    <tbody>
                      {p71.buckets.map(b => {
                        const sm = P71_STAGE_META[b.stage];
                        return (
                          <tr key={b.id}>
                            <td style={{ fontWeight: 600 }}>{b.label}{b.sicr && <span className="mono tiny" style={{ color: 'var(--amber)', marginLeft: 6 }}>SICR</span>}</td>
                            <td><Badge kind={sm.kind}>{sm.lbl}</Badge></td>
                            <td className="mono" style={{ textAlign: 'right' }}>{fmt(Math.round(b.gross))}</td>
                            <td className="mono" style={{ textAlign: 'right', color: 'var(--ink-2)' }}>{b.rate.toFixed(1)}%</td>
                            <td className="mono" style={{ textAlign: 'right', fontWeight: 700, color: 'var(--blue)' }}>{fmt(Math.round(b.ecl))}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: 'var(--surface-2)' }}>
                        <td colSpan={2} style={{ fontWeight: 700, color: 'var(--navy)' }}>TOTAL</td>
                        <td className="mono" style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(Math.round(p71.grossTot))}</td>
                        <td className="mono" style={{ textAlign: 'right', fontWeight: 700 }}>{(p71.coverage * 100).toFixed(1)}%</td>
                        <td className="mono" style={{ textAlign: 'right', fontWeight: 800, color: 'var(--navy)' }}>{fmt(Math.round(p71.eclModel))}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <div className="tiny muted" style={{ padding: '9px 14px 12px', lineHeight: 1.5 }}>
                  Eksposur per bucket = bobot aging (asumsi model) × <b>piutang bruto WTB Rp {fmt(Math.round(p71.grossAudited))} jt</b> — terikat satu sumber. Loss rate = rate historis × overlay forward-looking <b>{p71.overlay.toFixed(4)}</b>. Loss rate naik tajam pada bucket macet karena <b>SICR</b> & kemungkinan gagal bayar lebih tinggi.
                </div>
              </Panel>

              <div className="grid" style={{ gap: 12 }}>
                <Panel title="Komposisi ECL per Stage" sub="¶5.5 · staging">
                  <div className="row gap12 ac">
                    <Donut segments={stageSegs} size={104} thickness={15}
                      center={<><div className="mono" style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)' }}>{fmt(Math.round(p71.eclModel / 1))}</div><div className="tiny muted">jt</div></>} />
                    <div style={{ flex: 1 }}>
                      {p71.stages.map(s => {
                        const sm = P71_STAGE_META[s.stage];
                        return (
                          <div key={s.stage} style={{ padding: '4px 0' }}>
                            <div className="row jb ac">
                              <span className="row ac gap6"><span style={{ width: 9, height: 9, borderRadius: 2, background: sm.color }} /><span style={{ fontSize: 12, fontWeight: 600 }}>{sm.lbl}</span></span>
                              <span className="mono" style={{ fontWeight: 700 }}>{fmt(Math.round(s.ecl))} jt</span>
                            </div>
                            <div className="tiny muted" style={{ paddingLeft: 15 }}>{sm.sub} · cov {(s.coverage * 100).toFixed(1)}%</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </Panel>

                <Panel title="Eksposur vs Cadangan" sub="bruto → neto piutang">
                  <div style={{ display: 'grid', gap: 8 }}>
                    <P71RowKv label="Piutang bruto (WTB 1-1200)" v={rp(p71.grossAudited) + ' jt'} />
                    <P71RowKv label="ECL / CKPN per model" v={'(' + fmt(Math.round(p71.eclModel)) + ')'} accent="var(--red)" />
                    <div style={{ borderTop: '1px solid var(--line-soft)', paddingTop: 8 }}>
                      <P71RowKv label="Piutang neto (carrying)" v={rp(p71.grossAudited - p71.eclModel) + ' jt'} strong />
                    </div>
                  </div>
                  <div className="tiny muted" style={{ marginTop: 10, lineHeight: 1.5 }}>
                    Pendekatan <b>disederhanakan</b> mengakui lifetime ECL untuk seluruh piutang sejak awal — tanpa menilai perpindahan Stage 1→2. Pelabelan stage di sini untuk <b>pengungkapan</b> tingkat risiko kredit.
                  </div>
                </Panel>
              </div>
            </div>
          )}

          {/* ================= TAB · FORWARD-LOOKING ================= */}
          {tab === 'overlay' && (
            <div className="grid" style={{ gridTemplateColumns: '1fr 332px', gap: 12, alignItems: 'start' }}>
              <div className="grid" style={{ gap: 12 }}>
                <Panel noBody>
                  <div className="panel-h"><h3>Overlay Makroekonomi Forward-Looking</h3><span className="sub mono">¶5.5.17 · skenario berbobot probabilitas</span><div style={{ flex: 1 }} /><Btn sm onClick={() => setProbs(Object.fromEntries(p71.scenarios.map(s => [s.id, s.prob])))}><I.sync size={12} /> Reset</Btn></div>
                  <div style={{ padding: '6px 14px 12px' }}>
                    {p71.scenarios.map(s => {
                      const w = (probs[s.id] || 0) / probSum;
                      return (
                        <div key={s.id} style={{ padding: '9px 0', borderBottom: '1px solid var(--line-soft)' }}>
                          <div className="row ac jb" style={{ marginBottom: 5 }}>
                            <div>
                              <span style={{ fontSize: 12.5, fontWeight: 600 }}>{s.label}</span>
                              <span className="tiny muted" style={{ marginLeft: 8 }}>{s.macro}</span>
                            </div>
                            <span className="mono tiny" style={{ fontWeight: 700, color: 'var(--navy)' }}>mult ×{s.mult.toFixed(2)}</span>
                          </div>
                          <div className="row ac gap10">
                            <input type="range" min="0" max="1" step="0.01" value={probs[s.id] || 0} onChange={e => setProbs(p => ({ ...p, [s.id]: +e.target.value }))} style={{ flex: 1, accentColor: 'var(--blue)' }} />
                            <span className="mono" style={{ width: 52, textAlign: 'right', fontWeight: 700, fontSize: 12.5 }}>{(w * 100).toFixed(0)}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="row ac jb" style={{ padding: '0 14px 12px' }}>
                    <span className="tiny muted">Overlay tertimbang = Σ (probabilitas × multiplier)</span>
                    <span className="mono" style={{ fontWeight: 800, color: 'var(--navy)' }}>×{liveOverlay.toFixed(4)}</span>
                  </div>
                </Panel>

                <Panel noBody>
                  <div className="panel-h"><h3>Dampak Overlay terhadap ECL</h3><span className="sub mono">basis historis → forward-looking</span></div>
                  <div style={{ padding: 14, display: 'grid', gap: 9 }}>
                    <P71RowKv label="ECL basis matriks historis" v={rp(p71.baseTot) + ' jt'} />
                    <P71RowKv label={'Overlay makro (×' + liveOverlay.toFixed(4) + ')'} v={'+' + rp(liveEcl - p71.baseTot) + ' jt'} accent="var(--amber)" />
                    <div style={{ borderTop: '1px solid var(--line-soft)', paddingTop: 9 }}>
                      <P71RowKv label="ECL forward-looking (what-if)" v={rp(liveEcl) + ' jt'} strong />
                    </div>
                    <div className="row jb ac">
                      <span className="tiny muted">Model kanonik (overlay {p71.overlay.toFixed(4)})</span>
                      <span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{rp(p71.eclModel)} jt</span>
                    </div>
                  </div>
                  <div className="tiny muted" style={{ padding: '0 14px 12px', lineHeight: 1.5 }}>
                    Geser bobot skenario untuk menguji sensitivitas estimasi. Model kanonik memakai bobot dasar (20/55/25). What-if hanya simulasi audit — tidak mengubah angka WTB.
                  </div>
                </Panel>
              </div>

              <div className="grid" style={{ gap: 12 }}>
                <Panel title="Analisis Sensitivitas" sub="SA 540 · ±1% loss rate">
                  <div style={{ display: 'grid', gap: 0 }}>
                    {[{ d: 1, lbl: '+1% loss rate (memburuk)', k: 'red' }, { d: -1, lbl: '−1% loss rate (membaik)', k: 'green' }].map((x, i) => {
                      const delta = p71.grossTot * 0.01 * x.d;
                      return (
                        <div key={i} className="row ac jb" style={{ padding: '9px 0', borderBottom: i === 0 ? '1px solid var(--line-soft)' : 0 }}>
                          <span style={{ fontSize: 12 }}>{x.lbl}</span>
                          <span className="mono" style={{ fontWeight: 700, color: 'var(--' + x.k + ')' }}>{x.d > 0 ? '+' : '−'}{rp(Math.abs(delta))} jt</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="panel" style={{ marginTop: 10, padding: '9px 11px', background: 'var(--surface-2)', borderColor: 'var(--line)' }}>
                    <div className="tiny muted" style={{ lineHeight: 1.5 }}>Sensitivitas tinggi pada bucket macet: pergeseran skenario ke <b>pesimistis</b> menaikkan ECL secara material — area pertimbangan signifikan (key audit matter potensial).</div>
                  </div>
                </Panel>

                <Panel title="Data Historis Loss Rate" sub="write-off & recovery (sub-ledger)">
                  <div style={{ display: 'grid', gap: 7 }}>
                    {p71.history.map((r, i) => (
                      <div key={i} className="row ac jb" style={{ padding: '3px 0' }}>
                        <span className="mono tiny" style={{ fontWeight: 700, color: 'var(--navy)' }}>{r.y}{r.current && <span className="tiny" style={{ color: 'var(--blue)', fontWeight: 600, marginLeft: 5 }}>berjalan</span>}</span>
                        <span className="tiny muted">write-off <b style={{ color: 'var(--ink)' }}>{fmt(r.writeOff)}</b> · recovery <b style={{ color: 'var(--ink)' }}>{fmt(r.recovery)}</b></span>
                      </div>
                    ))}
                  </div>
                  <div className="tiny muted" style={{ marginTop: 9, lineHeight: 1.5, paddingTop: 8, borderTop: '1px solid var(--line-soft)' }}>Tren recovery menurun → dasar menaikkan loss rate Stage 3. Ekspektasi independen auditor dibangun dari rata-rata bergerak. Tahun berjalan ({p71.writeOff}/{p71.recovery}) mengalir ke roll-forward CKPN — satu sumber.</div>
                </Panel>
              </div>
            </div>
          )}

          {/* ================= TAB · MUTASI CKPN ================= */}
          {tab === 'mutasi' && (
            <div className="grid" style={{ gridTemplateColumns: '1fr 332px', gap: 12, alignItems: 'start' }}>
              <Panel noBody>
                <div className="panel-h"><h3>Mutasi Cadangan Kerugian Penurunan Nilai (CKPN)</h3><span className="sub mono">roll-forward · menutup ke WTB 1-1210</span><div style={{ flex: 1 }} /><span className="tiny muted">Rp juta</span></div>
                <div>
                  {[
                    { t: 'Saldo awal — CKPN (1 Jan 2025, PY audited)', v: p71.ckpnPy, tot: true },
                    { t: 'Penghapusbukuan piutang (write-off)', v: -p71.writeOff, kind: 'red' },
                    { t: 'Pemulihan piutang telah dihapusbukukan (recovery)', v: p71.recovery, kind: 'green' },
                    { t: 'Beban penurunan nilai — dibukukan klien', v: p71.chargeClient, kind: 'blue' },
                    { t: 'Saldo CKPN dibukukan klien (pra-audit)', v: p71.ckpnBooked, tot: true, mid: true },
                    { t: 'Koreksi audit — AJE-02 (tambahan ECL)', v: p71.ckpnAje, kind: 'amber' },
                    { t: 'Saldo akhir — CKPN audited (31 Des 2025)', v: p71.ckpnAudited, tot: true },
                  ].map((r, i) => (
                    <div key={i} className="row ac gap10" style={{ padding: '9px 14px', borderBottom: '1px solid var(--line-soft)', background: r.tot ? 'var(--surface-2)' : 'transparent' }}>
                      <div style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: r.tot ? 700 : 500, color: r.tot ? 'var(--navy)' : 'var(--ink)' }}>{r.t}</div>
                      {!r.tot && r.kind ? <Badge kind={r.kind}>{r.kind === 'amber' ? 'AJE' : r.kind === 'blue' ? 'P&L' : r.kind === 'red' ? 'keluar' : 'masuk'}</Badge> : <span style={{ width: 54 }} />}
                      <div className="mono" style={{ width: 82, textAlign: 'right', fontWeight: 700, color: r.v < 0 ? 'var(--red)' : r.tot ? 'var(--navy)' : 'var(--green)' }}>{r.v < 0 ? '(' + fmt(Math.round(-r.v)) + ')' : (r.tot ? '' : '+') + fmt(Math.round(r.v))}</div>
                    </div>
                  ))}
                </div>
                <div className="tiny muted" style={{ padding: '10px 14px 12px', lineHeight: 1.5 }}>
                  Identitas roll-forward: saldo awal {fmt(p71.ckpnPy)} − write-off {fmt(p71.writeOff)} + recovery {fmt(p71.recovery)} + beban audited {fmt(Math.round(p71.chargeAudited))} = <b>saldo akhir {fmt(p71.ckpnAudited)} jt</b> (menutup persis ke WTB 1-1210 kolom adjusted). Write-off & recovery berasal dari sub-ledger piutang.
                </div>
              </Panel>

              <div className="grid" style={{ gap: 12 }}>
                <Panel title="Beban Penurunan Nilai (P&L)" sub="mengalir ke Laba Rugi & Arus Kas">
                  <div style={{ display: 'grid', gap: 8 }}>
                    <P71RowKv label="Beban ECL — dibukukan klien" v={fmt(Math.round(p71.chargeClient)) + ' jt'} />
                    <P71RowKv label="Tambahan via AJE-02" v={'+' + fmt(p71.ckpnAje) + ' jt'} accent="var(--amber)" />
                    <div style={{ borderTop: '1px solid var(--line-soft)', paddingTop: 8 }}>
                      <P71RowKv label="Beban ECL audited" v={fmt(Math.round(p71.chargeAudited)) + ' jt'} strong />
                    </div>
                  </div>
                  <button onClick={() => nav('psak2', { from: 'psak71' })} className="row ac jb" style={{ marginTop: 11, padding: '8px 10px', borderRadius: 7, border: '1px solid var(--line)', borderLeft: '3px solid var(--blue)', background: 'var(--surface)', cursor: 'pointer', width: '100%', textAlign: 'left' }}>
                    <div><div style={{ fontSize: 11.5, fontWeight: 600 }}>Add-back non-kas (PSAK 2)</div><div className="tiny muted">Beban ECL bersifat non-kas → arus kas operasi</div></div>
                    <I.arrowRight size={13} style={{ color: 'var(--ink-4)' }} />
                  </button>
                </Panel>

                <Panel title="Piutang Fiktif — AJE-03" sub="bukan komponen ECL">
                  <div className="panel" style={{ padding: '9px 11px', background: 'var(--amber-bg)', borderColor: 'transparent' }}>
                    <div className="row gap8" style={{ alignItems: 'flex-start' }}>
                      <span style={{ color: 'var(--amber)', marginTop: 1 }}><I.alert size={15} /></span>
                      <span style={{ fontSize: 11.5, lineHeight: 1.5 }}>Piutang bruto pra-audit {fmt(Math.round(p71.grossUnadj))} jt diturunkan {fmt(Math.round(p71.grossUnadj - p71.grossAudited))} jt (AJE-03 — pembalikan piutang fiktif/channel stuffing). Matriks ECL dihitung atas <b>bruto audited {fmt(Math.round(p71.grossAudited))} jt</b> agar tidak menutupi salah saji eksistensi.</span>
                    </div>
                  </div>
                </Panel>
              </div>
            </div>
          )}

          {/* ================= TAB · REKONSILIASI ================= */}
          {tab === 'rekonsiliasi' && (
            <div className="grid" style={{ gridTemplateColumns: '1fr 332px', gap: 12, alignItems: 'start' }}>
              <div className="grid" style={{ gap: 12 }}>
                <Panel noBody>
                  <div className="panel-h"><h3>Rekonsiliasi Angka — Satu Sumber Kebenaran</h3><span className="sub mono">model PSAK 71 ↔ WTB ↔ modul konsumen</span></div>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="dtbl" style={{ width: '100%' }}>
                      <thead><tr>
                        <th style={{ textAlign: 'left' }}>Pos</th>
                        <th style={{ textAlign: 'left', width: 160 }}>Sumber</th>
                        <th style={{ textAlign: 'right', width: 90 }}>Rp juta</th>
                        <th style={{ textAlign: 'center', width: 64 }}>Status</th>
                      </tr></thead>
                      <tbody>
                        {[
                          { pos: 'Piutang bruto', src: 'WTB · 1-1200 (adjusted)', val: p71.grossAudited, ok: true },
                          { pos: 'CKPN dibukukan klien', src: 'WTB · 1-1210 (unadjusted)', val: p71.ckpnBooked, ok: true },
                          { pos: 'ECL per model (PSAK 71)', src: 'AMS_CANON.psak71(wtb)', val: p71.eclModel, ok: true, hi: true },
                          { pos: 'Tambahan CKPN (AJE-02)', src: 'WTB · 1-1210 (aje)', val: p71.ckpnAje, ok: true },
                          { pos: 'CKPN audited', src: 'WTB · 1-1210 (adjusted)', val: p71.ckpnAudited, ok: true },
                          { pos: 'Selisih model vs audited', src: 'toleransi ≤ Rp 25 jt', val: p71.auditVariance, ok: Math.abs(p71.auditVariance) <= 25 },
                        ].map((r, i) => (
                          <tr key={i} style={{ background: r.hi ? 'var(--blue-050)' : undefined }}>
                            <td style={{ fontWeight: 600, fontSize: 12.5 }}>{r.pos}</td>
                            <td className="mono tiny" style={{ color: 'var(--ink-3)' }}>{r.src}</td>
                            <td className="mono" style={{ textAlign: 'right', fontWeight: 700 }}>{r.val < 0 ? '(' + fmt(Math.round(-r.val)) + ')' : fmt(Math.round(r.val))}</td>
                            <td style={{ textAlign: 'center' }}>{r.ok ? <span style={{ color: 'var(--green)' }}><I.checkCircle size={15} /></span> : <span style={{ color: 'var(--amber)' }}><I.alert size={15} /></span>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="tiny muted" style={{ padding: '9px 14px 12px', lineHeight: 1.5 }}>
                    Seluruh angka mengalir dari <b>WTB</b> melalui satu fungsi kanonik <span className="mono">psak71(wtb)</span>. Mengubah AJE pada WTB otomatis memperbarui modul ini, Kalkulator ECL, tab Rekonsiliasi Alur Data, PSAK 46 & FS Generator — tanpa angka ganda.
                  </div>
                </Panel>

                <Panel noBody>
                  <div className="panel-h"><h3>Dampak Pajak Tangguhan (PSAK 46)</h3><span className="sub mono">CKPN belum deductible × 22%</span><div style={{ flex: 1 }} /><Btn sm onClick={() => nav('psak46', { from: 'psak71' })}><I.arrowRight size={12} /> Buka PSAK 46</Btn></div>
                  <div style={{ padding: 14, display: 'grid', gap: 8 }}>
                    <P71RowKv label="Beda temporer dapat dikurangkan (CKPN)" v={fmt(p71.ckpnBooked) + ' jt'} />
                    <P71RowKv label="Tarif PPh Badan (UU HPP)" v={(p71.rate * 100).toFixed(0) + '%'} />
                    <div style={{ borderTop: '1px solid var(--line-soft)', paddingTop: 8 }}>
                      <P71RowKv label="Aset pajak tangguhan (DTA · ecl)" v={'Rp ' + fmt(Math.round(p71.ckpnBooked * p71.rate)) + ' jt'} strong accent="var(--green)" />
                    </div>
                  </div>
                  <div className="tiny muted" style={{ padding: '0 14px 12px', lineHeight: 1.5 }}>CKPN belum dapat dikurangkan secara fiskal hingga piutang benar-benar dihapusbukukan → menimbulkan <b>aset pajak tangguhan</b>. Konsumen pos ini di PSAK 46 (item beda temporer "ecl").</div>
                </Panel>
              </div>

              <div className="grid" style={{ gap: 12 }}>
                <Panel noBody>
                  <div className="panel-h"><h3>Keterkaitan Kertas Kerja</h3><span className="sub mono">lineage data</span></div>
                  <div className="row ac gap6" style={{ padding: '9px 14px 4px' }}><I.arrowRight size={13} style={{ color: 'var(--blue)' }} /><span className="tiny upper" style={{ fontWeight: 700, letterSpacing: '.04em', color: 'var(--ink-3)' }}>Hulu — sumber data</span></div>
                  <div style={{ display: 'grid', gap: 6, padding: '2px 12px 10px' }}>
                    {P71_UPSTREAM.map(m => { const IconC = I[m.ic] || I.doc; return (
                      <button key={m.id} onClick={() => nav(m.id, { from: 'psak71' })} className="row ac gap9" style={{ padding: '8px 10px', borderRadius: 7, border: '1px solid var(--line)', borderLeft: '3px solid var(--blue)', background: 'var(--surface)', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                        <span style={{ color: 'var(--blue)', flex: '0 0 auto' }}><IconC size={15} /></span>
                        <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12, fontWeight: 600 }}>{m.lbl}</div><div className="tiny muted" style={{ lineHeight: 1.35 }}>{m.rel}</div></div>
                        <I.arrowRight size={13} style={{ color: 'var(--ink-4)', flex: '0 0 auto' }} />
                      </button>
                    ); })}
                  </div>
                  <div className="row ac gap6" style={{ padding: '4px 14px 4px', borderTop: '1px solid var(--line-soft)' }}><I.arrowRight size={13} style={{ color: 'var(--green)' }} /><span className="tiny upper" style={{ fontWeight: 700, letterSpacing: '.04em', color: 'var(--ink-3)' }}>Hilir — pengguna angka</span></div>
                  <div style={{ display: 'grid', gap: 6, padding: '2px 12px 12px' }}>
                    {P71_DOWNSTREAM.map(m => { const IconC = I[m.ic] || I.doc; return (
                      <button key={m.id} onClick={() => nav(m.id, { from: 'psak71' })} className="row ac gap9" style={{ padding: '8px 10px', borderRadius: 7, border: '1px solid var(--line)', borderLeft: '3px solid var(--green)', background: 'var(--surface)', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                        <span style={{ color: 'var(--green)', flex: '0 0 auto' }}><IconC size={15} /></span>
                        <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12, fontWeight: 600 }}>{m.lbl}</div><div className="tiny muted" style={{ lineHeight: 1.35 }}>{m.rel}</div></div>
                        <I.arrowRight size={13} style={{ color: 'var(--ink-4)', flex: '0 0 auto' }} />
                      </button>
                    ); })}
                  </div>
                  <button onClick={() => nav('dataflow', { from: 'psak71' })} className="row ac gap8" style={{ padding: '9px 14px', borderTop: '1px solid var(--line-soft)', background: 'var(--surface-2)', cursor: 'pointer', width: '100%', textAlign: 'left', border: 'none' }}>
                    <I.link2 size={14} style={{ color: 'var(--navy)' }} /><span style={{ flex: 1, fontSize: 12, fontWeight: 600 }}>Lihat Rekonsiliasi Angka lintas-modul</span><I.arrowRight size={13} style={{ color: 'var(--ink-4)' }} />
                  </button>
                </Panel>
              </div>
            </div>
          )}

          {/* ================= TAB · AUDIT SA 540 ================= */}
          {tab === 'audit' && (
            <div className="grid" style={{ gridTemplateColumns: '1fr 332px', gap: 12, alignItems: 'start' }}>
              <Panel noBody>
                <div className="panel-h"><h3>Prosedur Audit — Estimasi ECL (SA 540)</h3><div style={{ flex: 1 }} /><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--navy)' }}>{doneCount}/{P71_PROC.length}</span></div>
                <div className="row gap8" style={{ padding: '10px 14px', alignItems: 'flex-start', background: 'var(--blue-050)' }}>
                  <span style={{ color: 'var(--blue)', marginTop: 1 }}><I.target size={15} /></span>
                  <div style={{ fontSize: 11.5, lineHeight: 1.5 }}>ECL adalah <b>estimasi akuntansi dengan ketidakpastian tinggi</b> (R-03 · Penilaian). Prosedur menguji data, asumsi loss rate, overlay forward-looking, serta indikator bias manajemen.</div>
                </div>
                <div>
                  {P71_PROC.map((p, i) => {
                    const key = p.ref + i;
                    const isOn = !!done[key];
                    return (
                      <label key={key} className="row gap10" style={{ padding: '9px 14px', cursor: 'pointer', alignItems: 'flex-start', borderBottom: i < P71_PROC.length - 1 ? '1px solid var(--line-soft)' : 0 }} onClick={() => toggle(key)}>
                        <span style={{ flex: '0 0 16px', width: 16, height: 16, borderRadius: 4, marginTop: 1, border: '1.5px solid ' + (isOn ? 'var(--green)' : 'var(--line-strong)'), background: isOn ? 'var(--green)' : '#fff', display: 'grid', placeItems: 'center' }}>{isOn && <I.check size={11} style={{ color: '#fff' }} />}</span>
                        <span className="mono tiny" style={{ fontWeight: 700, color: 'var(--navy)', width: 84, flex: '0 0 84px', marginTop: 1 }}>{p.ref}</span>
                        <span style={{ fontSize: 12, lineHeight: 1.4, color: isOn ? 'var(--ink-3)' : 'var(--ink)', textDecoration: isOn ? 'line-through' : 'none' }}>{p.t}</span>
                      </label>
                    );
                  })}
                </div>
              </Panel>

              <div className="grid" style={{ gap: 12 }}>
                <Panel noBody>
                  <div style={{ background: 'linear-gradient(120deg,#013a52,#005085)', color: '#fff', padding: '14px 16px' }}>
                    <div className="tiny upper" style={{ color: '#bcd6e4', letterSpacing: '.05em', marginBottom: 8 }}>Kesimpulan Audit — Estimasi ECL</div>
                    <div className="row ac gap12">
                      <div style={{ fontSize: 34, fontWeight: 800, lineHeight: 1, fontFamily: 'JetBrains Mono, monospace' }}>{score}<span style={{ fontSize: 18 }}>%</span></div>
                      <div style={{ flex: 1 }}>
                        <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,.18)', overflow: 'hidden' }}><span style={{ display: 'block', height: '100%', width: score + '%', background: score === 100 ? '#4ade80' : '#7cc6ff', borderRadius: 4, transition: '.3s' }} /></div>
                        <div className="tiny" style={{ color: '#bcd6e4', marginTop: 6 }}>{doneCount}/{P71_PROC.length} prosedur audit selesai</div>
                      </div>
                    </div>
                  </div>
                  <div style={{ padding: 14 }}>
                    <div className="panel" style={{ padding: '10px 12px', background: 'var(--amber-bg)', borderColor: 'transparent' }}>
                      <div className="row gap8" style={{ alignItems: 'flex-start' }}>
                        <span style={{ color: 'var(--amber)', marginTop: 1 }}><I.alert size={15} /></span>
                        <div style={{ fontSize: 12, lineHeight: 1.5 }}>CKPN klien <b>{rp(p71.ckpnBooked)} jt</b> lebih rendah <b>{rp(p71.gap)} jt</b> dari model ECL. Diusulkan <b>AJE-02</b> menambah cadangan menjadi <b>{rp(p71.ckpnAudited)} jt</b> sesuai PSAK 71.</div>
                      </div>
                    </div>
                    <div className="row gap8" style={{ marginTop: 12 }}>
                      <Btn sm variant="primary" style={{ flex: 1 }} onClick={() => nav('aje', { from: 'psak71' })}><I.ledger size={14} /> Buat AJE-02</Btn>
                      <Btn sm style={{ flex: 1 }} onClick={() => nav('sad', { from: 'psak71' })}><I.scale size={14} /> SAD Ledger</Btn>
                    </div>
                  </div>
                </Panel>

                <Panel title="Usulan Jurnal — AJE-02" sub="WP B-7 · PSAK 71">
                  <table className="dtbl" style={{ width: '100%' }}>
                    <tbody>
                      <tr><td style={{ fontSize: 12 }}>Dr · Beban Penurunan Nilai <span className="mono tiny muted">5-3100</span></td><td className="mono" style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(p71.ckpnAje)}</td><td></td></tr>
                      <tr><td style={{ fontSize: 12, paddingLeft: 18 }}>Cr · CKPN Piutang <span className="mono tiny muted">1-1210</span></td><td></td><td className="mono" style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(p71.ckpnAje)}</td></tr>
                    </tbody>
                  </table>
                  <div className="tiny muted" style={{ marginTop: 8, lineHeight: 1.5 }}>Menaikkan CKPN ke tingkat ECL model. Selisih sisa terhadap model {rp(Math.abs(p71.auditVariance))} jt di bawah ambang & dicatat di SAD sebagai salah saji tak dikoreksi bila relevan.</div>
                </Panel>
              </div>
            </div>
          )}

          {/* ================= TAB · KERTAS KERJA B-7 ================= */}
          {tab === 'kk' && (
            <div style={{ paddingBottom: 6 }}>
              <P71WorkPaper p71={p71} client={client} eng={eng} fmt={fmt} rp={rp} nav={nav} />
            </div>
          )}

          <div className="tiny muted" style={{ padding: '0 2px 4px', lineHeight: 1.5 }}>
            Kertas kerja ini menelusuri instrumen keuangan <b>{client.name}</b> ({eng.id} · {eng.fy}) terhadap PSAK 71 — dari klasifikasi & uji SPPI, penurunan nilai (matriks provisi, staging & SICR), overlay forward-looking & sensitivitas, mutasi CKPN, rekonsiliasi lintas-modul, hingga kesimpulan audit estimasi (SA 540) & usulan AJE-02. Seluruh angka ditarik dari satu sumber kebenaran (WTB → AMS_CANON.psak71). Tab & status tersimpan otomatis untuk jejak audit.
          </div>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { PSAK71View });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { PSAK71View };
