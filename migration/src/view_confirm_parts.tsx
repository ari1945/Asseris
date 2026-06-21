/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { I } from './icons.jsx';
import { Badge, Btn } from './ui.jsx';

/* ============================================================
   Asseris — Confirmation Hub · data & reusable parts
   (loaded before view_confirm.jsx)
   ============================================================ */
const { useState: useStateCFP } = React;

const CONF_TYPES = {
  Bank: { k: 'blue', icon: 'building', sa: 'SA 505 · SA 500' },
  Piutang: { k: 'teal', icon: 'receipt', sa: 'SA 505 ¶A1' },
  Utang: { k: 'purple', icon: 'coins', sa: 'SA 505 · Kelengkapan' },
  Legal: { k: 'amber', icon: 'gavel', sa: 'SA 501 ¶9-10' },
  'Pihak Berelasi': { k: 'red', icon: 'link2', sa: 'SA 550 ¶22' },
};

const STATUS_KIND = { Received: 'green', Sent: 'blue', Discrepancy: 'red', 'No Reply': 'amber', Draft: 'gray', Reconciled: 'green' };

/* method (positif/negatif) · channel · counterparty contact · reminders · response due · reliability validated */
const CONFIRMATIONS = [
  { id: 'CF-001', type: 'Bank', party: 'PT Bank Central Asia Tbk', amount: 14_200_000_000, sent: '08-01-2026', due: '22-01-2026', status: 'Received', resp: 14_200_000_000, days: 6, method: 'Positif', channel: 'e-Confirm', contact: 'Trade Confirmation Desk · confirm@bca.co.id', reminders: 0, validated: true },
  { id: 'CF-002', type: 'Bank', party: 'PT Bank Mandiri Tbk', amount: 6_500_000_000, sent: '08-01-2026', due: '22-01-2026', status: 'Received', resp: 6_500_000_000, days: 9, method: 'Positif', channel: 'e-Confirm', contact: 'Audit Confirmation Unit · confirm@bankmandiri.co.id', reminders: 0, validated: true },
  { id: 'CF-003', type: 'Bank', party: 'PT Bank Negara Indonesia', amount: 1_205_300_000, sent: '08-01-2026', due: '22-01-2026', status: 'Sent', resp: null, days: 32, method: 'Positif', channel: 'e-Confirm', contact: 'Confirmation Center · confirm@bni.co.id', reminders: 1, validated: false },
  { id: 'CF-004', type: 'Piutang', party: 'PT Ritel Maju Bersama', amount: 4_120_000_000, sent: '10-01-2026', due: '24-01-2026', status: 'Received', resp: 4_120_000_000, days: 8, method: 'Positif', channel: 'Email', contact: 'Rina Marlina · Finance Mgr · ar@ritelmaju.co.id', reminders: 0, validated: true },
  { id: 'CF-005', type: 'Piutang', party: 'PT Distribusi Andal', amount: 2_880_000_000, sent: '10-01-2026', due: '24-01-2026', status: 'Discrepancy', resp: 2_530_000_000, days: 11, method: 'Positif', channel: 'Pos', contact: 'Bagian Hutang · keuangan@distribusiandal.co.id', reminders: 0, validated: true },
  { id: 'CF-006', type: 'Piutang', party: 'CV Sumber Rejeki', amount: 1_340_000_000, sent: '10-01-2026', due: '24-01-2026', status: 'No Reply', resp: null, days: 41, method: 'Positif', channel: 'Pos', contact: 'Bp. Hendra · Pemilik · (belum merespons)', reminders: 2, validated: false },
  { id: 'CF-007', type: 'Piutang', party: 'PT Niaga Sentosa', amount: 1_120_000_000, sent: '10-01-2026', due: '24-01-2026', status: 'Received', resp: 1_120_000_000, days: 14, method: 'Positif', channel: 'Email', contact: 'Dewi Anggraini · AP · ap@niagasentosa.id', reminders: 0, validated: true },
  { id: 'CF-008', type: 'Piutang', party: 'PT Mitra Dagang Utama', amount: 980_000_000, sent: '12-01-2026', due: '26-01-2026', status: 'Sent', resp: null, days: 28, method: 'Negatif', channel: 'Email', contact: 'Finance · finance@mitradagang.co.id', reminders: 1, validated: false },
  { id: 'CF-009', type: 'Utang', party: 'PT Pemasok Bahan Baku', amount: 8_400_000_000, sent: '11-01-2026', due: '25-01-2026', status: 'Received', resp: 8_400_000_000, days: 7, method: 'Positif', channel: 'Email', contact: 'Collection Dept · collection@pemasokbb.co.id', reminders: 0, validated: true },
  { id: 'CF-010', type: 'Utang', party: 'PT Logistik Andalan', amount: 2_100_000_000, sent: '11-01-2026', due: '25-01-2026', status: 'Discrepancy', resp: 2_340_000_000, days: 12, method: 'Positif', channel: 'Pos', contact: 'Piutang · ar@logistikandalan.co.id', reminders: 0, validated: true },
  { id: 'CF-011', type: 'Legal', party: 'Kantor Hukum Surya & Partners', amount: 0, sent: '09-01-2026', due: '23-01-2026', status: 'Received', resp: 0, days: 10, method: 'Positif', channel: 'Pos', contact: 'Surya Wijaya, S.H. · litigasi@suryapartners.id', reminders: 0, validated: true },
  { id: 'CF-012', type: 'Legal', party: 'Wibowo Law Office', amount: 0, sent: '09-01-2026', due: '23-01-2026', status: 'No Reply', resp: null, days: 44, method: 'Positif', channel: 'Pos', contact: 'Agus Wibowo, S.H., M.H. · (belum merespons)', reminders: 2, validated: false },
  { id: 'CF-013', type: 'Pihak Berelasi', party: 'PT Sentosa Holding (induk)', amount: 5_600_000_000, sent: '13-01-2026', due: '27-01-2026', status: 'Received', resp: 5_600_000_000, days: 5, method: 'Positif', channel: 'Email', contact: 'Group Treasury · treasury@sentosaholding.co.id', reminders: 0, validated: true },
  { id: 'CF-014', type: 'Pihak Berelasi', party: 'PT Makmur Properti (afiliasi)', amount: 1_850_000_000, sent: '13-01-2026', due: '27-01-2026', status: 'Sent', resp: null, days: 26, method: 'Positif', channel: 'Email', contact: 'Finance · finance@makmurproperti.co.id', reminders: 1, validated: false },
];

/* FS areas confirmed — for SA 505 coverage analysis (population = saldo akun per WTB) */
const CF_AREA = [
  { type: 'Bank', caption: 'Kas & Setara Kas', pop: 21_905_300_000, note: 'Konfirmasi bank juga mencakup fasilitas pinjaman & jaminan.' },
  { type: 'Piutang', caption: 'Piutang Usaha — Pihak Ketiga', pop: 51_322_400_000, note: 'Sisa populasi: pengujian penerimaan kas subsekuen & analitis.' },
  { type: 'Utang', caption: 'Utang Usaha', pop: 44_900_300_000, note: 'Dilengkapi pencarian liabilitas tak tercatat (completeness).' },
  { type: 'Pihak Berelasi', caption: 'Saldo Pihak Berelasi', pop: 7_450_000_000, note: 'Seluruh saldo material pihak berelasi dikonfirmasi (SA 550).' },
];

const CF_RECON_PRESETS = {
  Piutang: ['Barang dalam perjalanan (FOB destination)', 'Retur penjualan belum dicatat pelanggan', 'Pembayaran dalam perjalanan', 'Selisih kurs / pembulatan'],
  Utang: ['Barang/jasa diterima belum difaktur', 'Pembayaran dalam perjalanan', 'Nota debit belum dicatat', 'Selisih kurs'],
  default: ['Item dalam perjalanan', 'Transaksi belum dicatat', 'Pembayaran dalam perjalanan'],
};

const CF_ALT_PROCS = {
  Piutang: ['Vouching penerimaan kas setelah tanggal neraca (subsequent receipts)', 'Inspeksi dokumen pengiriman, faktur & bukti serah terima', 'Pengujian perjanjian / kontrak penjualan pendukung'],
  Legal: ['Tinjau notulen rapat direksi & korespondensi hukum', 'Inquiry tertulis ke manajemen atas litigasi & klaim', 'Telusuri pembayaran jasa hukum & kecukupan provisi'],
  Utang: ['Cari liabilitas tak tercatat (search for unrecorded liabilities)', 'Vouching pembayaran setelah tanggal neraca', 'Cocokkan ke faktur pemasok & laporan penerimaan barang'],
  default: ['Vouching penerimaan kas / pembayaran setelah tanggal neraca', 'Inspeksi dokumen sumber pendukung', 'Pengujian perjanjian / kontrak terkait'],
};

const CF_RELIABILITY = [
  'Respons diterima langsung oleh auditor (bukan melalui klien)',
  'Identitas & alamat penjawab diverifikasi secara independen',
  'Kanal resmi — kop surat asli / e-Confirm tervalidasi',
  'Ditandatangani / diotorisasi pejabat berwenang',
];

const cfAltList = (t) => CF_ALT_PROCS[t] || CF_ALT_PROCS.default;
const cfReconPresets = (t) => CF_RECON_PRESETS[t] || CF_RECON_PRESETS.default;

/* ---- small presentational helpers ---- */
function CfTrack({ pct, color = 'var(--blue)', h = 8 }: any) {
  return (
    <div style={{ height: h, borderRadius: 6, background: 'var(--surface-3)', overflow: 'hidden' }}>
      <span style={{ display: 'block', height: '100%', width: Math.max(2, Math.min(100, pct)) + '%', background: color, borderRadius: 6, transition: 'width .3s' }} />
    </div>
  );
}

function CfMeta({ icon, label, value, accent }: any) {
  return (
    <div className="row ac gap8" style={{ minWidth: 0 }}>
      <span style={{ color: 'var(--ink-4)', flex: '0 0 auto', marginTop: 1 }}>{React.createElement(I[icon], { size: 14 })}</span>
      <div style={{ minWidth: 0 }}>
        <div className="tiny muted upper" style={{ letterSpacing: '.05em' }}>{label}</div>
        <div className="truncate" style={{ fontSize: 12, fontWeight: 600, color: accent || 'var(--ink)' }}>{value}</div>
      </div>
    </div>
  );
}

/* ---- Reconciliation worksheet (reusable, shared state) ---- */
function CfReconWorksheet({ item, recon, setRecon, onResolve, compact }: any) {
  const { fmt } = AMS;
  const variance = (item.resp != null ? item.resp - item.amount : 0);
  const rows = recon[item.id] || [];
  const reconTotal = rows.reduce((s, r) => s + (+r.amount || 0), 0);
  const unexplained = variance - reconTotal;
  const add = (label) => setRecon(r => ({ ...r, [item.id]: [...(r[item.id] || []), { label, amount: unexplained }] }));
  const remove = (i) => setRecon(r => ({ ...r, [item.id]: (r[item.id] || []).filter((_, idx) => idx !== i) }));
  const resolved = Math.abs(unexplained) < 1e6;

  return (
    <div className="panel" style={{ padding: '11px 12px', background: 'var(--surface-2)', borderColor: 'var(--line)' }}>
      <div className="row jb ac" style={{ marginBottom: 8 }}>
        <span className="row ac gap6" style={{ fontWeight: 700, fontSize: 12 }}><span style={{ color: 'var(--red)' }}><I.scale size={15} /></span> Kertas Rekonsiliasi</span>
        <span className="tiny muted">SA 505 ¶14</span>
      </div>
      <div style={{ display: 'grid', gap: 4, marginBottom: 8 }}>
        <div className="row jb tiny"><span>Saldo per buku (klien)</span><span className="mono" style={{ fontWeight: 600 }}>{fmt(item.amount / 1e6, 1)}</span></div>
        <div className="row jb tiny"><span>Saldo per respons (counterparty)</span><span className="mono" style={{ fontWeight: 600 }}>{fmt(item.resp / 1e6, 1)}</span></div>
        <div className="row jb tiny" style={{ paddingTop: 3, borderTop: '1px solid var(--line)' }}><span style={{ fontWeight: 700 }}>Selisih awal</span><span className="mono" style={{ fontWeight: 700, color: 'var(--red)' }}>{fmt(variance / 1e6, 1)}</span></div>
      </div>
      {rows.length > 0 && (
        <div style={{ display: 'grid', gap: 3, marginBottom: 7 }}>
          {rows.map((r, i) => (
            <div key={i} className="row jb ac tiny" style={{ background: '#fff', borderRadius: 4, padding: '3px 7px' }}>
              <span className="truncate" style={{ maxWidth: compact ? 180 : 230 }}>{r.label}</span>
              <span className="row ac gap6"><span className="mono">{fmt((+r.amount || 0) / 1e6, 1)}</span><button onClick={() => remove(i)} style={{ border: 0, background: 'transparent', color: 'var(--red)', cursor: 'pointer', padding: 0 }}><I.x size={11} /></button></span>
            </div>
          ))}
        </div>
      )}
      <div className="row jb ac" style={{ padding: '5px 0', borderTop: '1px solid var(--line)', marginBottom: 8 }}>
        <span className="tiny" style={{ fontWeight: 700 }}>Selisih belum dijelaskan</span>
        <span className="mono" style={{ fontWeight: 700, color: resolved ? 'var(--green)' : 'var(--amber)' }}>{fmt(unexplained / 1e6, 1)} jt</span>
      </div>
      {!resolved ? (
        <>
          <div className="tiny muted" style={{ marginBottom: 5 }}>Tambahkan item rekonsiliasi (mengisi sisa selisih):</div>
          <div className="row wrap gap6">
            {cfReconPresets(item.type).map((lbl) => (
              <button key={lbl} className="chip x" style={{ cursor: 'pointer' }} onClick={() => add(lbl)}>+ {lbl}</button>
            ))}
          </div>
        </>
      ) : (
        <div className="panel" style={{ padding: '8px 10px', background: 'var(--green-bg)', borderColor: 'transparent' }}>
          <div className="row ac jb">
            <span className="row ac gap6" style={{ fontSize: 11.5, fontWeight: 600 }}><span style={{ color: 'var(--green)' }}><I.checkCircle size={15} /></span> Selisih terjelaskan penuh</span>
            <Btn sm variant="primary" onClick={() => onResolve(item.id)}><I.check size={13} /> Terekonsiliasi</Btn>
          </div>
        </div>
      )}
      {variance < 0 && (
        <div className="tiny muted" style={{ marginTop: 8, lineHeight: 1.5 }}>
          <I.flag size={11} style={{ verticalAlign: '-1px', color: 'var(--amber)' }} /> Selisih bersih {fmt(Math.abs(variance) / 1e6, 1)} jt diteruskan ke <b>Ringkasan Salah Saji (SAD)</b> bila tak terjelaskan.
        </div>
      )}
    </div>
  );
}

/* ---- Alternative procedures (reusable, shared state) ---- */
function CfAltProcedures({ item, checks, setChecks, onResolve }: any) {
  const list = cfAltList(item.type);
  const state = checks[item.id] || list.map(() => false);
  const done = state.filter(Boolean).length;
  const all = done === list.length;
  const toggle = (i) => setChecks(c => {
    const cur = (c[item.id] || list.map(() => false)).slice();
    cur[i] = !cur[i];
    return { ...c, [item.id]: cur };
  });
  return (
    <div className="panel" style={{ padding: '11px 12px', background: 'var(--amber-bg)', borderColor: 'transparent' }}>
      <div className="row jb ac" style={{ marginBottom: 8 }}>
        <span className="row ac gap6" style={{ fontWeight: 700, fontSize: 12 }}><span style={{ color: 'var(--amber)' }}><I.search2 size={15} /></span> Prosedur Alternatif</span>
        <span className="tiny" style={{ fontWeight: 700, color: 'var(--amber)' }}>{done}/{list.length} · SA 505 ¶12</span>
      </div>
      <div style={{ display: 'grid', gap: 6 }}>
        {list.map((p, i) => (
          <label key={i} className="row ac gap8" style={{ fontSize: 11.5, cursor: 'pointer', lineHeight: 1.35 }} onClick={(e) => { e.preventDefault(); toggle(i); }}>
            <span style={{ width: 15, height: 15, borderRadius: 3, border: '1.5px solid var(--amber)', background: state[i] ? 'var(--amber)' : 'transparent', display: 'grid', placeItems: 'center', flex: '0 0 15px' }}>{state[i] && <I.check size={10} style={{ color: '#fff' }} />}</span>
            <span style={{ textDecoration: state[i] ? 'line-through' : 'none', color: state[i] ? 'var(--ink-3)' : 'var(--ink)' }}>{p}</span>
          </label>
        ))}
      </div>
      <div className="row jb ac" style={{ marginTop: 9, paddingTop: 8, borderTop: '1px solid rgba(154,106,0,.2)' }}>
        <span className="tiny" style={{ fontWeight: 600, color: all ? 'var(--green)' : 'var(--amber)' }}>{all ? 'Bukti alternatif memadai' : 'Lengkapi seluruh prosedur'}</span>
        <Btn sm variant={all ? 'primary' : ''} disabled={!all} style={!all ? { opacity: .5 } : null} onClick={() => all && onResolve(item.id)}><I.check size={13} /> Simpulkan</Btn>
      </div>
    </div>
  );
}

/* ---- Reliability validation (SA 505 ¶10-11) ---- */
function CfReliability({ item, checks, setChecks }: any) {
  const def = item.validated ? CF_RELIABILITY.map(() => true) : CF_RELIABILITY.map((_, i) => i < 2);
  const state = checks[item.id] || def;
  const done = state.filter(Boolean).length;
  const all = done === CF_RELIABILITY.length;
  const toggle = (i) => setChecks(c => {
    const cur = (c[item.id] || def).slice();
    cur[i] = !cur[i];
    return { ...c, [item.id]: cur };
  });
  return (
    <div className="panel" style={{ padding: '10px 12px', background: 'var(--surface-2)', borderColor: 'var(--line)', marginBottom: 12 }}>
      <div className="row jb ac" style={{ marginBottom: 7 }}>
        <span className="row ac gap6" style={{ fontWeight: 700, fontSize: 12 }}><span style={{ color: all ? 'var(--green)' : 'var(--amber)' }}><I.shield size={14} /></span> Validasi Keandalan Respons</span>
        <Badge kind={all ? 'green' : 'amber'}>{all ? 'Andal' : done + '/' + CF_RELIABILITY.length}</Badge>
      </div>
      {item.channel === 'e-Confirm' && (
        <div className="tiny" style={{ color: 'var(--green)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}><I.checkCircle size={12} /> Diterima via kanal e-Confirm terverifikasi — risiko intersepsi rendah.</div>
      )}
      <div style={{ display: 'grid', gap: 5 }}>
        {CF_RELIABILITY.map((c, i) => (
          <label key={i} className="row ac gap8" style={{ fontSize: 11, cursor: 'pointer', lineHeight: 1.3 }} onClick={(e) => { e.preventDefault(); toggle(i); }}>
            <span style={{ width: 14, height: 14, borderRadius: 3, border: '1.5px solid ' + (state[i] ? 'var(--green)' : 'var(--line-strong)'), background: state[i] ? 'var(--green)' : 'transparent', display: 'grid', placeItems: 'center', flex: '0 0 14px' }}>{state[i] && <I.check size={9} style={{ color: '#fff' }} />}</span>
            <span style={{ color: state[i] ? 'var(--ink-2)' : 'var(--ink-3)' }}>{c}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, {
  CONF_TYPES, STATUS_KIND, CONFIRMATIONS, CF_AREA, CF_RELIABILITY,
  cfAltList, cfReconPresets, CfTrack, CfMeta,
  CfReconWorksheet, CfAltProcedures, CfReliability,
});


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { CF_AREA, CF_RELIABILITY, CONFIRMATIONS, CONF_TYPES, CfAltProcedures, CfMeta, CfReconWorksheet, CfReliability, CfTrack, STATUS_KIND, cfAltList, cfReconPresets };
