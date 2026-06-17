/* [codemod] ESM imports */
import React from 'react';
import { ExtractReview } from './ai_extract.jsx';
import { AiInsightPanel } from './ai_insights.jsx';
import { useAmsPersist, useFirm, useNav } from './contexts.jsx';
import { AMS } from './data.js';
import { amsAttachEvidence } from './evidence.jsx';
import { I, MODULE_INDEX, RELATED_SA } from './icons.jsx';
import { amsLLMConfig } from './llm_providers.js';

/* ============================================================
   NeoSuite AMS — AI Co-pilot (rekonstruksi)
   Satu file mandiri yang menyediakan:
     1. window.classifyDoc(name, opts, idx) — mesin klasifikasi
        dokumen (dipakai evidence.jsx, view_dms.jsx, view_clientportal.jsx)
     2. <Copilot open onClose route> — panel asisten:
        chat AI (window.claude.complete + fallback Mode demo),
        intake & klasifikasi dokumen, panel tata kelola ISQM 1.
   ATURAN ANTI-TABRAKAN: alias hook unik (…CP), tanpa `const styles`,
   ekspor lewat Object.assign(window, …). Lihat CLAUDE.md §2.
   ============================================================ */
const { useState: useStateCP, useEffect: useEffectCP, useRef: useRefCP, useCallback: useCbCP } = React;

/* ------------------------------------------------------------
   1 · MESIN KLASIFIKASI DOKUMEN
   Pencocokan kata-kunci nama berkas → { type, std, dest, conf, extract, alts }.
   `dest` selalu id modul valid di MODULE_INDEX. Kontrak inti yang dibaca
   konsumen lain: { uid, file, type, std, dest }. Field tambahan diabaikan
   dengan aman oleh evidence/DMS/portal.
   ------------------------------------------------------------ */
const CP_RULES = [
  { re: /(neraca\s*saldo|trial\s*balance|\bwtb\b|tb[_\- ])/i, type: 'Neraca Saldo (WTB)', std: 'SA 500', dest: 'wtb',
    extract: ['Total debit = total kredit (seimbang)', 'Periode tutup buku teridentifikasi', '± 180 akun buku besar'], alts: ['aje', 'analytical'] },
  { re: /(jurnal|adjust|reklas|\baje\b|penyesuaian)/i, type: 'Jurnal Penyesuaian', std: 'SA 450', dest: 'aje',
    extract: ['Nomor & tanggal jurnal', 'Akun debit/kredit terstruktur', 'Memo & otorisasi penyiapan'], alts: ['wtb', 'sad'] },
  { re: /(konfirmasi|confirmation|confirm|jawaban\s*bank)/i, type: 'Konfirmasi Eksternal', std: 'SA 505', dest: 'confirm',
    extract: ['Pihak penerima & saldo dikonfirmasi', 'Tanggal cut-off konfirmasi', 'Status balasan (positif/negatif)'], alts: ['psak71', 'wtb'] },
  { re: /(rekening\s*koran|bank\s*statement|mutasi\s*bank|e[-\s]?statement)/i, type: 'Rekening Koran Bank', std: 'SA 505', dest: 'confirm',
    extract: ['Saldo akhir per bank', 'Rentang mutasi periode', 'Pos rekonsiliasi outstanding'], alts: ['wtb', 'cashbank'] },
  { re: /(aging|piutang|receivable|\bar\b|umur\s*piutang)/i, type: 'Aging Piutang', std: 'PSAK 71', dest: 'psak71',
    extract: ['Bucket umur 0–30 / 31–60 / >90 hari', 'Saldo piutang per pelanggan', 'Indikasi penurunan nilai (ECL)'], alts: ['confirm', 'ecl'] },
  { re: /(persediaan|inventory|stock\s*opname|stok)/i, type: 'Daftar Persediaan', std: 'PSAK 14', dest: 'psak14',
    extract: ['Kuantitas & nilai per SKU', 'Dasar penilaian (FIFO/rata-rata)', 'Indikasi NRV < biaya perolehan'], alts: ['analytical', 'sampling'] },
  { re: /(aset\s*tetap|fixed\s*asset|\bfa\b|register\s*aset|penyusutan|depres)/i, type: 'Daftar Aset Tetap', std: 'PSAK 16', dest: 'psak16',
    extract: ['Harga perolehan & akumulasi penyusutan', 'Umur manfaat & metode', 'Mutasi penambahan/pelepasan'], alts: ['invprop', 'analytical'] },
  { re: /(sewa|lease|\bpsak\s*73\b)/i, type: 'Kontrak Sewa', std: 'PSAK 73', dest: 'psak73',
    extract: ['Jangka & pembayaran sewa', 'Tingkat diskonto inkremental', 'Hak-guna-aset & liabilitas sewa'], alts: ['psak16', 'legal'] },
  { re: /(kontrak|contract|perjanjian|\bpo\b|purchase\s*order|sales\s*order)/i, type: 'Kontrak/Perjanjian', std: 'PSAK 72', dest: 'psak72',
    extract: ['Kewajiban pelaksanaan teridentifikasi', 'Harga transaksi & termin', 'Titik pengakuan pendapatan'], alts: ['related', 'legal'] },
  { re: /(laporan\s*keuangan|financial\s*statement|\bfs\b|laba\s*rugi|balance\s*sheet|income)/i, type: 'Laporan Keuangan', std: 'SA 700', dest: 'fsgen',
    extract: ['Komponen LK lengkap', 'Angka komparatif tahun lalu', 'Kesesuaian penyajian PSAK 1'], alts: ['disclosure', 'opinion'] },
  { re: /(notulen|minutes|risalah|rups|board)/i, type: 'Notulen Rapat', std: 'SA 550', dest: 'related',
    extract: ['Keputusan & pihak terlibat', 'Transaksi pihak berelasi', 'Komitmen & kontinjensi'], alts: ['subsequent', 'goingconcern'] },
  { re: /(gaji|payroll|pph\s*21|slip|tunjangan)/i, type: 'Daftar Gaji', std: 'PSAK 24', dest: 'psak24',
    extract: ['Total beban imbalan kerja', 'Potongan PPh 21', 'Headcount per periode'], alts: ['payroll', 'analytical'] },
  { re: /(aktuaria|imbalan\s*kerja|pension|pesangon|dplk)/i, type: 'Laporan Aktuaria', std: 'PSAK 24', dest: 'psak24',
    extract: ['Asumsi diskonto & kenaikan gaji', 'Liabilitas imbalan pasti', 'Keuntungan/kerugian aktuarial (OCI)'], alts: ['psak46', 'analytical'] },
  { re: /(pajak|tax|spt|coretax|e[-\s]?bupot|faktur)/i, type: 'Dokumen Pajak', std: 'PSAK 46', dest: 'psak46',
    extract: ['Dasar pengenaan pajak', 'Beda waktu/tetap teridentifikasi', 'Aset/liabilitas pajak tangguhan'], alts: ['fsgen', 'firmtax'] },
  { re: /(representasi|rep\s*letter|management\s*rep|surat\s*pernyataan)/i, type: 'Surat Representasi', std: 'SA 580', dest: 'opinion',
    extract: ['Pernyataan tanggung jawab manajemen', 'Tanggal ≈ tanggal laporan auditor', 'Cakupan asersi LK'], alts: ['subsequent', 'goingconcern'] },
  { re: /(sampl|populasi|seleksi)/i, type: 'Populasi Sampling', std: 'SA 530', dest: 'sampling',
    extract: ['Ukuran & nilai populasi', 'Stratifikasi item kunci', 'Parameter risiko sampling'], alts: ['jet', 'analytical'] },
];

function classifyDoc(name, opts, idx) {
  const file = (name && name.name) ? name.name : String(name || 'dokumen');
  const i = (typeof idx === 'number') ? idx : 0;
  const uid = 'cls-' + Date.now() + '-' + i + '-' + Math.round(Math.random() * 1e4);
  const hit = CP_RULES.find(r => r.re.test(file));
  if (hit) {
    const conf = Math.min(98, 86 + ((file.length + i) % 12));
    return { uid, file, type: hit.type, std: hit.std, dest: hit.dest, conf, extract: hit.extract.slice(), alts: hit.alts.slice(), low: false };
  }
  /* fallback — keyakinan rendah, arahkan ke Evidence Evaluation */
  return {
    uid, file, type: 'Dokumen Pendukung', std: 'SA 500', dest: 'evidence',
    conf: 58 + (file.length % 10), low: true,
    extract: ['Jenis tidak dikenali otomatis dari nama berkas', 'Perlu konfirmasi auditor untuk routing'],
    alts: ['workpapers', 'wtb', 'dataflow'],
  };
}

/* ------------------------------------------------------------
   2 · RENDER MARKDOWN RINGAN (heading, hr, tabel, kode, tebal)
   ------------------------------------------------------------ */
function cpInline(text, keyBase) {
  /* **tebal** dan `kode` inline */
  const parts = [];
  let rest = String(text); let k = 0;
  const re = /(\*\*([^*]+)\*\*|`([^`]+)`)/;
  let m;
  while ((m = re.exec(rest))) {
    if (m.index > 0) parts.push(rest.slice(0, m.index));
    if (m[2] != null) parts.push(<b key={keyBase + '-b' + (k++)}>{m[2]}</b>);
    else parts.push(<code key={keyBase + '-c' + (k++)}>{m[3]}</code>);
    rest = rest.slice(m.index + m[0].length);
  }
  if (rest) parts.push(rest);
  return parts;
}

function CpMarkdown({ text }) {
  const lines = String(text || '').split('\n');
  const out = []; let i = 0; let key = 0; let guard = 0;
  while (i < lines.length) {
    if (++guard > 5000) break; /* pengaman keras: jangan pernah bisa membekukan UI */
    const ln = lines[i];
    if (/^\s*#{1,3}\s+/.test(ln)) {
      out.push(<div key={key++} className="ai-md-h">{cpInline(ln.replace(/^\s*#{1,3}\s+/, ''), 'h' + key)}</div>);
      i++; continue;
    }
    if (/^\s*---\s*$/.test(ln)) { out.push(<div key={key++} className="ai-md-hr" />); i++; continue; }
    /* tabel: dua baris+ yang memuat pipa, baris ke-2 adalah pemisah --- */
    if (ln.indexOf('|') >= 0 && i + 1 < lines.length && /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1]) && lines[i + 1].indexOf('-') >= 0) {
      const head = ln.split('|').map(s => s.trim()).filter((s, idx, a) => !(s === '' && (idx === 0 || idx === a.length - 1)));
      const rows = []; let j = i + 2;
      while (j < lines.length && lines[j].indexOf('|') >= 0) {
        rows.push(lines[j].split('|').map(s => s.trim()).filter((s, idx, a) => !(s === '' && (idx === 0 || idx === a.length - 1))));
        j++;
      }
      out.push(
        <table key={key++} className="ai-md-table">
          <thead><tr>{head.map((h, hi) => <th key={hi}>{cpInline(h, 'th' + key + hi)}</th>)}</tr></thead>
          <tbody>{rows.map((r, ri) => <tr key={ri}>{r.map((c, ci) => <td key={ci}>{cpInline(c, 'td' + key + ri + ci)}</td>)}</tr>)}</tbody>
        </table>
      );
      i = j; continue;
    }
    if (/^\s*$/.test(ln)) { i++; continue; }
    /* paragraf: kumpulkan baris berurutan. do-while menjamin i selalu maju
       minimal 1 baris (baris ber-'|' yang BUKAN tabel valid jatuh ke sini
       dan harus tetap dikonsumsi agar tidak terjadi infinite loop). */
    const buf = [];
    do { buf.push(lines[i]); i++; }
    while (i < lines.length && !/^\s*$/.test(lines[i]) && !/^\s*#{1,3}\s+/.test(lines[i]) && !/^\s*---\s*$/.test(lines[i]) &&
           !(lines[i].indexOf('|') >= 0 && i + 1 < lines.length && /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1]) && lines[i + 1].indexOf('-') >= 0));
    if (buf.length) out.push(<div key={key++} style={{ margin: '2px 0' }}>{buf.map((b, bi) => <React.Fragment key={bi}>{cpInline(b, 'p' + key + bi)}{bi < buf.length - 1 ? <br /> : null}</React.Fragment>)}</div>);
  }
  return <>{out}</>;
}

/* ------------------------------------------------------------
   3 · KARTU INTAKE — hasil klasifikasi satu berkas
   ------------------------------------------------------------ */
const cpExtIcon = (n) => /\.(xlsx|xls|csv)$/i.test(n || '') ? 'table' : (/\.(png|jpg|jpeg|gif|webp)$/i.test(n || '') ? 'panel' : 'doc');

function CpIntakeCard({ rec, onAttach, onExtract, route }) {
  const [done, setDone] = useStateCP(null); /* id modul tujuan setelah dilampirkan */
  const dest = (typeof MODULE_INDEX !== 'undefined' && MODULE_INDEX[rec.dest]) || { label: rec.dest };
  const FI = I[cpExtIcon(rec.file)] || I.doc;
  /* chip konteks: modul aktif sebagai tujuan alternatif bila relevan & belum tercakup */
  const ctxMod = (route && typeof MODULE_INDEX !== 'undefined' && MODULE_INDEX[route] && route !== rec.dest && !(rec.alts || []).includes(route)) ? MODULE_INDEX[route] : null;

  if (done) {
    const dm = (MODULE_INDEX[done] || { label: done });
    return (
      <div className="intake-card">
        <div className="intake-done">
          <I.checkCircle size={15} /> Terlampir & terklasifikasi ke <b>{dm.label}</b>
          <button onClick={() => onAttach(rec, done, true)}>Buka modul</button>
        </div>
      </div>
    );
  }

  return (
    <div className="intake-card">
      <div className="intake-head">
        <span className="intake-ic"><FI size={15} /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="intake-fname">{rec.file}</div>
          <div className="intake-type">{rec.type}</div>
          {rec.learned && <div className="intake-learned"><I.sparkle size={10} /> Disesuaikan dari koreksi Anda sebelumnya</div>}
          {rec.low && <div className="intake-ambig"><I.alert size={10} /> Klasifikasi ambigu — konfirmasi tujuan</div>}
        </div>
        <span className={'intake-conf' + (rec.low ? ' low' : '')}>{rec.conf}%</span>
      </div>

      {rec.extract && rec.extract.length > 0 && (
        <div className="intake-extract">
          {rec.extract.map((e, i) => (
            <div key={i} className="intake-erow"><span className="ek"><I.check size={12} /></span><span>{e}</span></div>
          ))}
        </div>
      )}

      <div className="intake-route">
        <span className="tiny muted">Rute ke</span>
        <span className="intake-dest"><I.arrowRight size={13} /> {dest.label} <span className="intake-std">{rec.std}</span></span>
      </div>

      {rec.low && (
        <div className="intake-confirm-note"><I.alert size={12} /> Keyakinan rendah — tinjau & konfirmasi tujuan sebelum melampirkan.</div>
      )}

      {ctxMod && (
        <div className="intake-ctx">
          <I.target size={12} /> Konteks: Anda sedang di
          <button className="intake-alt ctx" onClick={() => { onAttach({ ...rec, dest: route }, route, false, true); setDone(route); }}>{ctxMod.label}</button>
        </div>
      )}

      <div className="intake-actions">
        <button className="intake-primary" onClick={() => { onAttach(rec, rec.dest, false, false); setDone(rec.dest); }}>
          <I.check size={13} /> Lampirkan ke {dest.label}
        </button>
        {typeof onExtract === 'function' && (
          <button className="intake-ghost" onClick={() => onExtract(rec)} title="Ekstrak isi dokumen ke kertas kerja"><I.sparkle size={12} /> Ekstrak isi</button>
        )}
        <button className="intake-ghost" onClick={() => onAttach(rec, rec.dest, true)} title="Buka modul tujuan tanpa melampirkan">Buka</button>
      </div>

      {rec.alts && rec.alts.length > 0 && (
        <div className="intake-alts">
          <span>Atau:</span>
          {rec.alts.map(a => {
            const am = (MODULE_INDEX[a] || { label: a });
            return <button key={a} className="intake-alt" onClick={() => { onAttach({ ...rec, dest: a }, a, false, true); setDone(a); }}>{am.label}</button>;
          })}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------
   4 · PANEL TATA KELOLA AI (ISQM 1)
   ------------------------------------------------------------ */
function CpGovernance({ ctxText, share, onShare, log, onClear, onClose, acc }) {
  const queries = log.length;
  const withCtx = log.filter(l => l.ctx).length;
  const pct = queries ? Math.round((withCtx / queries) * 100) : 0;
  const accAccepted = (acc && acc.accepted) || 0;
  const accCorrected = (acc && acc.corrected) || 0;
  const accTotal = accAccepted + accCorrected;
  const accPct = accTotal ? Math.round((accAccepted / accTotal) * 100) : null;
  const accCol = accPct == null ? 'var(--ink-3)' : (accPct >= 85 ? 'var(--green)' : accPct >= 60 ? 'var(--amber)' : 'var(--red)');
  return (
    <div className="copilot-gov">
      <div className="gov-h">
        <span><I.shield size={15} /> Tata Kelola AI · ISQM 1</span>
        <button className="top-btn" onClick={onClose}><I.x size={16} /></button>
      </div>
      <div className="gov-body">
        <div className="gov-sec">
          <div className="gov-lbl">Kebijakan penggunaan</div>
          <div className="gov-txt">AI Co-pilot bersifat <b>asistif</b>: keluaran adalah usulan, bukan keputusan audit. Setiap kesimpulan tetap menjadi <b>pertimbangan profesional auditor</b> (SA 200) dan harus diverifikasi terhadap bukti. Interaksi dicatat untuk keterlusuran dokumentasi (SA 230).</div>
        </div>

        <label className="gov-toggle">
          <input type="checkbox" checked={share} onChange={e => onShare(e.target.checked)} />
          <span>Bagikan konteks perikatan ke AI
            <span className="gov-sub">Klien, perikatan aktif, materialitas, dan modul saat ini disertakan agar jawaban lebih relevan. Matikan untuk pertanyaan umum/anonim.</span>
          </span>
        </label>

        {share && (
          <div className="gov-sec">
            <div className="gov-lbl">Konteks yang dibagikan</div>
            <div className="gov-ctx">{ctxText}</div>
          </div>
        )}

        <div className="gov-sec">
          <div className="gov-lbl">Akurasi klasifikasi AI</div>
          <div className="gov-acc">
            <div className="gov-acc-num" style={{ color: accCol }}>{accPct == null ? '—' : accPct + '%'}</div>
            <div className="gov-acc-meta">
              {accTotal === 0
                ? 'Belum ada usulan klasifikasi yang ditindaklanjuti. Akurasi dihitung dari rasio usulan yang diterima auditor tanpa koreksi.'
                : <><b>{accAccepted}</b> dari <b>{accTotal}</b> usulan diterima tanpa koreksi · <b>{accCorrected}</b> dikoreksi. AI menyesuaikan rute dari koreksi Anda.</>}
            </div>
          </div>
          {accTotal > 0 && (
            <div className="gov-accbar"><span style={{ width: accPct + '%', background: accCol }} /></div>
          )}
        </div>

        <div className="gov-sec">
          <div className="gov-lbl">Statistik sesi</div>
          <div className="gov-stat">
            <div><b>{queries}</b><span>Kueri sesi</span></div>
            <div><b>{withCtx}</b><span>Dengan konteks</span></div>
            <div><b>{pct}%</b><span>Rasio konteks</span></div>
          </div>
        </div>

        <div className="gov-sec">
          <div className="gov-lbl" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Log kueri (keterlusuran)</span>
            {queries > 0 && <button onClick={onClear} style={{ background: 'none', border: 0, color: 'var(--blue)', fontWeight: 700, fontSize: 10, cursor: 'pointer' }}>Bersihkan</button>}
          </div>
          {queries === 0
            ? <div className="gov-txt">Belum ada kueri pada sesi ini.</div>
            : (
              <div className="gov-log">
                {log.slice(0, 24).map((l, i) => (
                  <div key={i} className="gov-log-row">
                    <span className="gov-log-ts">{l.ts}</span>
                    <span className="gov-log-q">{l.q}</span>
                    <span className={'gov-log-tag ' + (l.ctx ? 'on' : 'off')}>{l.ctx ? 'konteks' : 'anonim'}</span>
                  </div>
                ))}
              </div>
            )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------
   4b · GERBANG KEPUTUSAN AUDITOR (SA 230 · keterlusuran)
   AI mengusulkan; auditor wajib Terima / Override dengan alasan.
   ------------------------------------------------------------ */
const cpNowHM = () => new Date().toTimeString().slice(0, 5);

const CP_GATE_DEF = {
  note: 'Usulan AI memerlukan persetujuan auditor sebelum dicatat sebagai dasar kesimpulan.',
  rec: 'Usulan diterima: catat AJE koreksi atas salah saji teridentifikasi & evaluasi ulang agregat salah saji terhadap materialitas (SA 450.11).',
};
const CP_GATE_INTRO = '## Evaluasi salah saji (SA 450)\nAgregat salah saji tidak dikoreksi mendekati ambang **materialitas pelaksanaan**. AI mengusulkan **mencatat AJE koreksi** lalu menilai dampaknya terhadap opini.\n\nKeputusan ini memerlukan **persetujuan auditor** — terima atau override di bawah.';

function CpGate({ gate, onDecide }) {
  const [mode, setMode] = useStateCP(null); /* null | 'override' */
  const [reason, setReason] = useStateCP('');
  const dec = gate.decision;

  if (dec) {
    const ok = dec.type === 'ok';
    return (
      <div className={'ai-decided ' + (ok ? 'ok' : 'ov')}>
        <span className="ai-decided-ic">{ok ? <I.checkCircle size={15} /> : <I.alert size={15} />}</span>
        <div>
          <div className="ai-decided-t">{ok ? 'Usulan AI diterima oleh auditor' : 'Auditor meng-override usulan AI'}</div>
          <div className="ai-decided-r">{ok ? gate.rec : '“' + dec.reason + '”'}</div>
          <div className="ai-decided-trace"><I.lock size={9} /> SA 230 · terekam {dec.ts}</div>
        </div>
      </div>
    );
  }

  if (mode === 'override') {
    return (
      <div className="ai-gate">
        <textarea className="ai-gate-input" rows={2} autoFocus
          placeholder="Alasan auditor meng-override usulan (wajib untuk dokumentasi SA 230)…"
          value={reason} onChange={e => setReason(e.target.value)} />
        <div className="ai-gate-actions">
          <button className="ai-gate-cancel" onClick={() => { setMode(null); setReason(''); }}>Batal</button>
          <button className="ai-gate-confirm" disabled={!reason.trim()} onClick={() => onDecide({ type: 'ov', reason: reason.trim(), ts: cpNowHM() })}><I.check size={12} /> Rekam override</button>
        </div>
      </div>
    );
  }

  return (
    <div className="ai-gate">
      <div className="ai-gate-head">
        <span className="ai-gate-badge"><I.gavel size={11} /> Keputusan auditor</span>
        <span className="ai-gate-note">{gate.note}</span>
      </div>
      <div className="ai-gate-actions">
        <button className="ai-gate-accept" onClick={() => onDecide({ type: 'ok', ts: cpNowHM() })}><I.check size={13} /> Terima usulan</button>
        <button className="ai-gate-override" onClick={() => setMode('override')}><I.x size={12} /> Override</button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------
   4c · POHON KEPUTUSAN OPINI — SA 705
   Matriks ¶7-10: sumber (salah saji / pembatasan bukti) × pervasif.
   ------------------------------------------------------------ */
function CpOpinionTree({ nav, onClose }) {
  const [source, setSource] = useStateCP(null);      /* 'none' | 'mis' | 'scope' */
  const [pervasive, setPervasive] = useStateCP(null); /* false | true */
  const [recorded, setRecorded] = useStateCP(false);
  const col = { green: 'var(--green)', amber: 'var(--amber)', red: 'var(--red)' };

  const outcome = (() => {
    if (source === 'none') return { kind: 'green', title: 'Opini Tanpa Modifikasian (WTP)', sa: 'SA 700', basis: 'LK menyajikan secara wajar dalam semua hal yang material; bukti audit cukup & tepat telah diperoleh.' };
    if (source && pervasive != null) {
      if (source === 'mis') return pervasive
        ? { kind: 'red', title: 'Opini Tidak Wajar (Adverse)', sa: 'SA 705 ¶8', basis: 'Salah saji material DAN pervasif terhadap laporan keuangan.' }
        : { kind: 'amber', title: 'Opini Wajar Dengan Pengecualian (WDP)', sa: 'SA 705 ¶7(a)', basis: 'Salah saji material namun TIDAK pervasif terhadap laporan keuangan.' };
      return pervasive
        ? { kind: 'red', title: 'Tidak Menyatakan Pendapat (TMP)', sa: 'SA 705 ¶9', basis: 'Tidak dapat memperoleh bukti audit yang cukup & tepat; kemungkinan dampak material DAN pervasif.' }
        : { kind: 'amber', title: 'Opini Wajar Dengan Pengecualian (WDP)', sa: 'SA 705 ¶7(b)', basis: 'Tidak dapat memperoleh bukti audit cukup & tepat; kemungkinan dampak material namun TIDAK pervasif.' };
    }
    return null;
  })();

  const reset = () => { setSource(null); setPervasive(null); setRecorded(false); };
  const optBtns = (opts) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '7px 0 2px' }}>
      {opts.map(o => <button key={o.v} className="intake-alt" onClick={o.on}>{o.l}</button>)}
    </div>
  );
  const answeredPill = (label) => <div className="opdt-a" style={{ background: 'var(--blue-050)', color: 'var(--blue)' }}><I.check size={12} /> {label}</div>;

  return (
    <div className="msg ai wide">
      <div className="intake-lead"><I.gavel size={12} /> Penentuan opini — SA 705</div>
      <div className="opdt-guard"><I.shield size={15} /><span>Alat bantu keputusan. Penentuan opini final tetap <b>pertimbangan profesional auditor</b> dan tunduk pada penelaahan EQR (SA 220). Setiap jawaban terekam untuk dokumentasi (SA 230).</span></div>
      <div className="opdt-tree">
        <div className="opdt-node">
          <div className="opdt-rail"><div className="opdt-dot" style={{ background: 'var(--blue)' }}>1</div><div className="opdt-line" /></div>
          <div className="opdt-body">
            <div className="opdt-q">Adakah hal yang berpotensi memodifikasi opini? <span className="opdt-sa">SA 705 ¶6</span></div>
            {source
              ? answeredPill(source === 'none' ? 'Tidak ada — LK wajar & bukti cukup' : source === 'mis' ? 'Salah saji material (SA 450)' : 'Tidak dapat memperoleh bukti cukup')
              : optBtns([
                  { v: 'none', l: 'Tidak ada', on: () => setSource('none') },
                  { v: 'mis', l: 'Salah saji material', on: () => setSource('mis') },
                  { v: 'scope', l: 'Pembatasan bukti', on: () => setSource('scope') },
                ])}
          </div>
        </div>

        {source && source !== 'none' && (
          <div className="opdt-node">
            <div className="opdt-rail"><div className="opdt-dot" style={{ background: 'var(--blue)' }}>2</div><div className="opdt-line" /></div>
            <div className="opdt-body">
              <div className="opdt-q">Seberapa luas dampaknya terhadap LK? <span className="opdt-sa">SA 705 ¶5(a)</span></div>
              {pervasive != null
                ? answeredPill(pervasive ? 'Material DAN pervasif' : 'Material, tidak pervasif')
                : optBtns([
                    { v: 'no', l: 'Tidak pervasif', on: () => setPervasive(false) },
                    { v: 'yes', l: 'Pervasif', on: () => setPervasive(true) },
                  ])}
              <div className="opdt-input"><I.sparkle size={12} /> “Pervasif”: dampak tidak terbatas pada unsur tertentu, atau mewakili proporsi substansial LK (¶5a).</div>
            </div>
          </div>
        )}

        {outcome && (
          <div className="opdt-node">
            <div className="opdt-rail"><div className="opdt-dot" style={{ background: col[outcome.kind] }}><I.gavel size={12} /></div></div>
            <div className="opdt-body">
              <div className="opdt-outcome" style={{ borderColor: col[outcome.kind] }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: col[outcome.kind], display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>{outcome.title}<span className="opdt-sa">{outcome.sa}</span></div>
                <div className="opdt-basis">{outcome.basis}</div>
                {recorded
                  ? <div className="opdt-recorded"><I.checkCircle size={14} /><div>Terekam sebagai usulan ke <b>Audit Opinion Generator</b>. Auditor wajib memfinalisasi & memperoleh persetujuan EQR.<div className="opdt-trace"><I.lock size={9} /> SA 230 · keterlusuran</div></div></div>
                  : <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                      <button className="intake-primary" style={{ flex: '0 0 auto', padding: '0 14px' }} onClick={() => setRecorded(true)}><I.check size={13} /> Rekam usulan</button>
                      <button className="intake-ghost" onClick={() => { nav('opinion', { from: 'copilot' }); onClose && onClose(); }}>Buka Audit Opinion</button>
                      <button className="intake-ghost" onClick={reset}>Ulangi</button>
                    </div>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------
   5 · KOMPONEN UTAMA — <Copilot open onClose route>
   ------------------------------------------------------------ */
const CP_SAMPLES = [
  'Neraca Saldo FY2025.xlsx',
  'Konfirmasi Bank BCA.pdf',
  'Kontrak Penjualan PLN.pdf',
  'Aging Piutang Q4.xlsx',
  'Daftar Aset Tetap 2025.xlsx',
];

const CP_GREETING = {
  role: 'ai',
  text: '## Selamat datang di AI Co-pilot\nSaya membantu menyusun memo, menelusuri standar (SA/PSAK), dan **mengklasifikasi dokumen** ke modul yang tepat.\n\nUnggah bukti lewat tombol di bawah, atau ajukan pertanyaan audit. Jawaban saya bersifat **asistif** — pertimbangan profesional tetap di tangan Anda.',
};

function Copilot({ open, onClose, route }) {
  const nav = useNav();
  const firm = useFirm();
  const persist = useAmsPersist;

  const [msgs, setMsgs] = persist('copilot.msgs2', [CP_GREETING]);
  const [input, setInput] = useStateCP('');
  const [busy, setBusy] = useStateCP(false);
  const [intake, setIntake] = useStateCP([]); /* kartu hasil klasifikasi */
  const [drag, setDrag] = useStateCP(false);
  const [gov, setGov] = useStateCP(false);
  const [share, setShare] = persist('copilot.govshare', true);
  const [log, setLog] = persist('copilot.govlog', []);
  const [learn, setLearn] = persist('copilot.learn', {});
  const [acc, setAcc] = persist('copilot.acc', { accepted: 0, corrected: 0 });
  const [showIns, setShowIns] = useStateCP(false);
  const msgsRef = useRefCP(null);
  const fileRef = useRefCP(null);

  const activeClient = firm.activeClient || {};
  const activeEng = firm.activeEngagement || {};
  const moduleLabel = (typeof MODULE_INDEX !== 'undefined' && MODULE_INDEX[route] && MODULE_INDEX[route].label) || route || '—';
  const llm = (typeof amsLLMConfig === 'function') ? amsLLMConfig() : null;

  const ctxText = [
    'Klien      : ' + (activeClient.name || activeClient.label || '—'),
    'Perikatan  : ' + (activeEng.id || activeEng.code || '—'),
    'Materialitas: ' + (activeEng.materiality ? (window.AMS && AMS.rp ? AMS.rp(activeEng.materiality) : activeEng.materiality) : '—'),
    'Modul aktif: ' + moduleLabel + ' (' + (route || '—') + ')',
  ].join('\n');

  useEffectCP(() => {
    if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight;
  }, [msgs, intake, busy]);

  /* ---- referensi kontekstual (deep-link ke standar) ---- */
  const refsFor = useCbCP(() => {
    const rel = (typeof RELATED_SA !== 'undefined' && RELATED_SA[route]) || [];
    return rel.slice(0, 3).map(r => ({ label: r.code, title: r.title, view: r.view }));
  }, [route]);

  const pushLog = (q) => {
    const ts = new Date().toTimeString().slice(0, 5);
    setLog(prev => [{ ts, q: q.slice(0, 80), ctx: share }, ...prev].slice(0, 60));
  };

  const demoReply = (q) => {
    const rel = (typeof RELATED_SA !== 'undefined' && RELATED_SA[route]) || [];
    const relLine = rel.length ? '\n\n**Standar terkait modul ini:** ' + rel.map(r => r.code).join(' · ') : '';
    const provLine = llm ? ('Provider aktif: **' + llm.providerLabel + ' · ' + llm.modelLabel + '** — ' + (llm.hasKey ? 'kunci tersimpan (jawaban templat di prototipe ini).' : 'belum ada kunci API.')) : 'Koneksi LLM tidak tersedia di lingkungan ini, jadi saya menjawab dari templat.';
    return '## Mode demo\n' + provLine + '\n\nUntuk *"' + q.slice(0, 120) + '"*, langkah yang lazim:\n\n- Tetapkan asersi & risiko relevan (SA 315).\n- Rancang prosedur responsif dan tautkan bukti (SA 330/500).\n- Dokumentasikan kesimpulan di kertas kerja (SA 230).' + relLine + '\n\n> Atur provider & kunci di **Pengaturan › AI & LLM**.';
  };

  const send = async (raw) => {
    const q = (raw != null ? raw : input).trim();
    if (!q || busy) return;
    setInput('');
    setMsgs(prev => [...prev, { role: 'user', text: q }]);
    pushLog(q);
    setBusy(true);
    const refs = refsFor();
    try {
      let answer;
      if (window.claude && typeof window.claude.complete === 'function') {
        const sys = 'Anda adalah AI Co-pilot dalam aplikasi audit firma akuntan publik Indonesia (NeoSuite AMS). Jawab ringkas dalam Bahasa Indonesia, berbasis Standar Audit (SA) & PSAK. Keluaran bersifat asistif untuk pertimbangan auditor — jangan menyatakan keputusan final. Gunakan markdown ringkas (judul ##, daftar, tabel bila relevan).';
        const ctx = share ? ('\n\nKonteks perikatan:\n' + ctxText) : '';
        answer = await window.claude.complete(sys + ctx + '\n\nPertanyaan auditor:\n' + q);
        if (!answer || !String(answer).trim()) answer = demoReply(q);
      } else {
        await new Promise(r => setTimeout(r, 650));
        answer = demoReply(q);
      }
      setMsgs(prev => [...prev, { role: 'ai', text: String(answer), refs, prov: share }]);
    } catch (e) {
      setMsgs(prev => [...prev, { role: 'ai', text: demoReply(q), refs, prov: share }]);
    } finally {
      setBusy(false);
    }
    const lc = q.toLowerCase();
    if (/(opini|sa\s*705|modifikasi opini|jenis opini)/.test(lc)) setMsgs(prev => [...prev, { role: 'ai', kind: 'opdt' }]);
    else if (/(salah saji|sa\s*450|agregat saji|evaluasi salah)/.test(lc)) setMsgs(prev => [...prev, { role: 'ai', text: CP_GATE_INTRO, gate: { ...CP_GATE_DEF } }]);
  };

  /* ---- intake berkas (dengan pembelajaran adaptif) ---- */
  const applyLearn = (rec) => {
    const pref = learn[rec.type];
    if (pref && pref !== rec.dest && MODULE_INDEX[pref]) {
      const alts = [rec.dest, ...(rec.alts || [])].filter((a, i, arr) => a !== pref && arr.indexOf(a) === i).slice(0, 3);
      return { ...rec, dest: pref, learned: true, alts };
    }
    return rec;
  };
  const addFiles = (fl) => {
    const arr = Array.from(fl || []).filter(Boolean);
    if (!arr.length) return;
    const recs = arr.map((f, i) => applyLearn(classifyDoc(f.name || f, {}, i)));
    setMsgs(prev => [...prev, { role: 'user', kind: 'files', files: arr.map(f => f.name || String(f)) }]);
    setIntake(prev => [...recs, ...prev]);
    /* baca teks nyata untuk berkas berbasis teks → prefill ekstraksi */
    recs.forEach((r, i) => {
      const fo = arr[i];
      if (fo && fo.name && /\.(txt|csv|md|json|html?|xml|tsv|log)$/i.test(fo.name) && typeof FileReader !== 'undefined') {
        try {
          const rd = new FileReader();
          rd.onload = () => { const tx = String(rd.result || '').slice(0, 20000); setIntake(prev => prev.map(x => x.uid === r.uid ? { ...x, _text: tx } : x)); };
          rd.readAsText(fo);
        } catch (e) {}
      }
    });
  };

  const onAttach = (rec, dest, openOnly, corrected) => {
    if (!openOnly && typeof amsAttachEvidence === 'function') {
      amsAttachEvidence(dest, { file: rec.file, type: rec.type, std: rec.std, classified: dest });
    }
    if (!openOnly) {
      setAcc(prev => ({ accepted: (prev.accepted || 0) + (corrected ? 0 : 1), corrected: (prev.corrected || 0) + (corrected ? 1 : 0) }));
      if (corrected && rec.type) setLearn(prev => ({ ...prev, [rec.type]: dest }));
    }
    if (openOnly) {
      setIntake(prev => prev.filter(r => r.uid !== rec.uid));
      nav(dest, { from: 'copilot' });
      onClose && onClose();
    }
  };

  const decideGate = (i, d) => setMsgs(prev => prev.map((mm, idx) => idx === i ? { ...mm, gate: { ...mm.gate, decision: d } } : mm));
  const launchOpinion = () => setMsgs(prev => [...prev, { role: 'ai', kind: 'opdt' }]);
  const launchGate = () => setMsgs(prev => [...prev, { role: 'ai', text: CP_GATE_INTRO, gate: { ...CP_GATE_DEF } }]);
  const onExtract = (rec) => {
    const clean = { file: rec.file, std: rec.std, type: rec.type, dest: rec.dest, _text: rec._text || '' };
    setMsgs(prev => [...prev, { role: 'ai', kind: 'extract', rec: clean }]);
  };
  const launchExtract = () => setMsgs(prev => [...prev, { role: 'ai', kind: 'extract', rec: { file: 'Kontrak Penjualan PLN.pdf', std: 'PSAK 72', type: 'Kontrak/Perjanjian', dest: 'psak72' } }]);

  const openRef = (r) => {
    if (r.view && window.__amsOpenSA) window.__amsOpenSA({ code: r.label, title: r.title, view: r.view });
    else if (window.__amsOpenSA) window.__amsOpenSA({ code: r.label, title: r.title });
  };

  return (
    <div className={'copilot' + (open ? ' open' : '')}
      onDragEnter={e => { e.preventDefault(); setDrag(true); }}
      onDragOver={e => e.preventDefault()}
      onDragLeave={e => { e.preventDefault(); if (e.currentTarget === e.target) setDrag(false); }}
      onDrop={e => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer && e.dataTransfer.files); }}>

      <div className="copilot-h">
        <span style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,.15)', display: 'grid', placeItems: 'center', flex: '0 0 28px' }}><I.sparkle size={16} /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, lineHeight: 1.2 }}>AI Co-pilot</div>
          <div style={{ fontSize: 10.5, opacity: .8 }}>{share ? 'Konteks: ' + moduleLabel : 'Mode anonim'} · {llm ? llm.modelLabel : 'asistif'}</div>
        </div>
        <button className="top-btn" title="Insight lintas-modul (kontradiksi)" style={{ color: '#fff', background: showIns ? 'rgba(255,255,255,.18)' : 'transparent', borderRadius: 7 }} onClick={() => setShowIns(v => !v)}><I.target size={17} /></button>
        <button className="top-btn" title="Tata kelola AI (ISQM 1)" style={{ color: '#fff' }} onClick={() => setGov(true)}><I.shield size={17} /></button>
        <button className="top-btn" title="Tutup" style={{ color: '#fff' }} onClick={onClose}><I.x size={17} /></button>
      </div>

      <div className="copilot-msgs" ref={msgsRef}>
        {showIns && typeof AiInsightPanel === 'function' && (
          <div className="msg ai wide">
            <div className="intake-lead"><I.target size={12} /> Insight lintas-modul</div>
            <AiInsightPanel embedded title="Kontradiksi & sinyal lintas-modul" />
          </div>
        )}
        {msgs.map((m, i) => {
          if (m.kind === 'opdt') return <CpOpinionTree key={i} nav={nav} onClose={onClose} />;
          if (m.kind === 'extract') return (typeof ExtractReview === 'function') ? <ExtractReview key={i} rec={m.rec} route={route} nav={nav} onClose={onClose} /> : null;
          if (m.kind === 'files') {
            return (
              <div key={i} className="msg user files-msg">
                {m.files.map((f, fi) => {
                  const FI = I[cpExtIcon(f)] || I.doc;
                  return <span key={fi} className="file-chip"><FI size={12} /><span className="fc-name">{f}</span></span>;
                })}
              </div>
            );
          }
          if (m.role === 'user') return <div key={i} className="msg user">{m.text}</div>;
          return (
            <div key={i} className="msg ai">
              <div className="bubble">
                <CpMarkdown text={m.text} />
                {m.refs && m.refs.length > 0 && (
                  <div className="ai-refs">
                    <span className="ai-refs-lbl"><I.link2 size={11} /> Rujukan</span>
                    {m.refs.map((r, ri) => (
                      <button key={ri} className="ai-ref" title={r.title} onClick={() => openRef(r)}>{r.label}<I.arrowRight size={11} /></button>
                    ))}
                  </div>
                )}
                {m.gate && <CpGate gate={m.gate} onDecide={(d) => decideGate(i, d)} />}
                {m.prov && (
                  <div className="ai-prov"><I.checkCircle size={11} /> Tertaut konteks perikatan terverifikasi (AMS_CANON)</div>
                )}
              </div>
            </div>
          );
        })}

        {intake.length > 0 && (
          <div className="msg ai wide">
            <div className="intake-lead"><I.sparkle size={12} /> Klasifikasi dokumen</div>
            {intake.map(rec => <CpIntakeCard key={rec.uid} rec={rec} onAttach={onAttach} onExtract={onExtract} route={route} />)}
          </div>
        )}

        {busy && (
          <div className="msg ai">
            <div className="bubble intake-analyzing">
              <span className="typing-dot" /><span className="typing-dot" style={{ animationDelay: '.15s' }} /><span className="typing-dot" style={{ animationDelay: '.3s' }} />
            </div>
          </div>
        )}
      </div>

      <div className="copilot-samples" style={{ paddingBottom: 0 }}>
        <button className="sample-chip" onClick={launchGate} title="Sisipkan gerbang keputusan auditor (SA 450)"><I.scale size={11} /> Evaluasi salah saji (SA 450)</button>
        <button className="sample-chip" onClick={launchOpinion} title="Mulai pohon keputusan opini (SA 705)"><I.gavel size={11} /> Pohon opini (SA 705)</button>
        <button className="sample-chip" onClick={launchExtract} title="Ekstrak isi dokumen ke kertas kerja"><I.doc size={11} /> Ekstrak dokumen → KK</button>
      </div>
      <div className="copilot-samples">
        {CP_SAMPLES.map(s => (
          <button key={s} className="sample-chip" onClick={() => addFiles([{ name: s }])} title="Simulasikan unggah & klasifikasi">
            {React.createElement(I[cpExtIcon(s)] || I.doc, { size: 11 })} {s}
          </button>
        ))}
      </div>

      <div className="copilot-intake">
        <button className="intake-up" onClick={() => fileRef.current && fileRef.current.click()}><I.upload size={13} /> Unggah & klasifikasi</button>
        <span className="tiny muted">AI mengarahkan ke modul yang tepat</span>
        <input ref={fileRef} type="file" multiple style={{ display: 'none' }} onChange={e => { addFiles(e.target.files); e.target.value = ''; }} />
      </div>

      <div className="copilot-input">
        <input value={input} placeholder="Tanya audit, standar, atau minta draf memo…"
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') send(); }} />
        <button className="copilot-send" onClick={() => send()} disabled={busy} title="Kirim"><I.send size={15} /></button>
      </div>

      {drag && (
        <div className="copilot-drop">
          <I.upload size={26} />
          <b>Lepas untuk mengunggah</b>
          <span className="tiny">AI akan mengklasifikasi & menautkan ke modul</span>
        </div>
      )}

      {gov && (
        <CpGovernance ctxText={ctxText} share={share} onShare={setShare} log={log} acc={acc}
          onClear={() => setLog([])} onClose={() => setGov(false)} />
      )}
    </div>
  );
}

Object.assign(window, { classifyDoc, Copilot, CpMarkdown });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { Copilot, CpMarkdown, classifyDoc };
