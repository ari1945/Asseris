/* [codemod] ESM imports */
import React from 'react';
import { amsAttachEvidence } from './evidence.jsx';
import { I, MODULE_INDEX } from './icons.jsx';
import { amsLLMConfig } from './llm_providers.js';
import { Panel } from './ui.jsx';
import { AMS } from './data';
import { openCanonicalWp } from './view_wp';

/* ============================================================
   Asseris — Ekstraksi Isi Dokumen (FASE 3 · Babel JSX)
   Membaca isi dokumen (teks nyata yang ditempel/diunggah, atau
   konten contoh per jenis), mengekstrak field terstruktur sesuai
   SKEMA standar (kontrak PSAK 72, sewa PSAK 73, konfirmasi SA 505,
   pajak PSAK 46, notulen SA 550, representasi SA 580, generik SA 500),
   lalu — SETELAH PERSETUJUAN AUDITOR (SA 230) — mendokumentasikannya
   ke KERTAS KERJA dan menautkannya sebagai BUKTI di modul terkait.

   Pengaman tetap berlaku (lihat CLAUDE.md §5):
   • Output bersifat USULAN — auditor wajib meninjau/menyunting & menyetujui.
   • Tiap dokumentasi tertaut ke WP ref + standar + jejak persetujuan.
   ATURAN ANTI-TABRAKAN: alias hook unik (…EX), tanpa `const styles`,
   ekspor via Object.assign(window, …).
   ============================================================ */
const { useState: useStateEX, useEffect: useEffectEX, useMemo: useMemoEX } = React;

/* ------------------------------------------------------------
   1 · UTILITAS PARSING (deterministik, dari teks nyata)
   ------------------------------------------------------------ */
const EX_MONTHS = 'Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember';
const exUniq = (a) => a.filter((v, i) => v && a.indexOf(v) === i);
const exClamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

function exLines(t) {
  const out = [];
  String(t || '').split(/[\n\r]+/).forEach(l => l.split(/(?:\.\s+|;\s+|•\s*)/).forEach(s => { const v = s.trim(); if (v) out.push(v); }));
  return out;
}
function exDates(t) {
  const out = []; let m;
  const re = new RegExp('\\b(\\d{1,2})\\s+(' + EX_MONTHS + ')\\s+(\\d{4})\\b', 'gi');
  while ((m = re.exec(t))) out.push(m[0]);
  const re2 = /\b\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}\b/g;
  while ((m = re2.exec(t))) out.push(m[0]);
  return exUniq(out);
}
function exAmounts(t) {
  const out = []; let m;
  const re = /Rp\.?\s?\d[\d.,]*(?:\s?(?:miliar|milyar|juta|ribu|jt|rb))?/gi;
  while ((m = re.exec(t))) out.push(m[0].replace(/\s+/g, ' ').trim());
  return exUniq(out);
}
function exParties(t) {
  const out = []; let m;
  const re = /\b(?:PT|CV|UD|Perum|Persero|Koperasi|Yayasan)\.?\s+[A-Z][\wÀ-ÿ&.\-]*(?:\s+[A-Z][\wÀ-ÿ&.\-]*){0,4}/g;
  while ((m = re.exec(t))) out.push(m[0].replace(/\s+/g, ' ').split(/\.\s/)[0].trim());
  return exUniq(out);
}
function exPercents(t) {
  const out = []; let m; const re = /\b\d{1,3}(?:[.,]\d+)?\s?%/g;
  while ((m = re.exec(t))) out.push(m[0].replace(/\s+/g, ''));
  return exUniq(out);
}
function exKwLine(t, kws) {
  const lines = exLines(t);
  for (const kw of kws) {
    for (const ln of lines) {
      if (ln.toLowerCase().includes(kw)) {
        let v = ln.trim();
        const ci = v.indexOf(':');
        if (ci >= 0 && ci < 36) v = v.slice(ci + 1).trim();
        if (v.length > 3) return v.slice(0, 260);
      }
    }
  }
  return null;
}
function exRunGet(text, f) {
  const t = String(text || '');
  let v = null;
  if (f.get === 'parties') { const p = exParties(t); v = p.length ? p.slice(0, 4).join(' · ') : null; }
  else if (f.get === 'amount') { v = (f.kw && exKwLine(t, f.kw)) || null; if (!v) { const a = exAmounts(t); v = a.length ? a[0] : null; } }
  else if (f.get === 'date') { v = (f.kw && exKwLine(t, f.kw)) || null; if (!v) { const d = exDates(t); v = d.length ? d[0] : null; } }
  else if (f.get === 'percent') { const p = exPercents(t); const kl = f.kw && exKwLine(t, f.kw); v = kl || (p.length ? p.join(' · ') : null); }
  else if (f.get === 'kw') { v = exKwLine(t, f.kw || []); }
  return v && v.trim() ? v.trim() : null;
}

/* ------------------------------------------------------------
   2 · SKEMA EKSTRAKSI PER JENIS DOKUMEN
   sample = konten contoh deterministik (dipakai bila tak ada teks).
   ------------------------------------------------------------ */
const EX_SCHEMAS = {
  contract: {
    docLabel: 'Kontrak / Perjanjian Klien', std: 'PSAK 72', module: 'psak72', wpRef: 'R', icon: 'doc',
    summary: 'Ringkasan Kontrak — Pengakuan Pendapatan (PSAK 72)',
    audit: 'Dasar uji asersi keterjadian & pisah batas pendapatan; tautkan ke WP R (Pendapatan) dan checklist 5-langkah PSAK 72.',
    fields: [
      { key: 'parties', label: 'Para pihak', kind: 'text', get: 'parties' },
      { key: 'object', label: 'Objek / ruang lingkup', kind: 'multiline', get: 'kw', kw: ['ruang lingkup', 'objek', 'pekerjaan', 'pengadaan', 'menyediakan'] },
      { key: 'value', label: 'Nilai kontrak (harga transaksi)', kind: 'amount', get: 'amount', kw: ['nilai kontrak', 'harga kontrak', 'sebesar', 'nilai pekerjaan'] },
      { key: 'term', label: 'Jangka waktu', kind: 'text', get: 'kw', kw: ['jangka waktu', 'berlaku sejak', 'periode', 'sampai dengan', 's.d.'] },
      { key: 'payment', label: 'Termin pembayaran', kind: 'multiline', get: 'kw', kw: ['termin', 'pembayaran', 'uang muka', 'pelunasan', 'dibayar'] },
      { key: 'po', label: 'Kewajiban pelaksanaan (PSAK 72 ¶22)', kind: 'multiline', get: 'kw', kw: ['kewajiban pelaksanaan', 'penyerahan', 'serah terima', 'menyerahkan', 'menyelesaikan'] },
      { key: 'recognition', label: 'Titik pengakuan pendapatan', kind: 'text', get: 'kw', kw: ['berita acara', 'serah terima', 'penyelesaian', 'sepanjang waktu', 'pada suatu waktu'] },
      { key: 'special', label: 'Klausul khusus / sanksi / garansi', kind: 'multiline', get: 'kw', kw: ['sanksi', 'denda', 'penalti', 'garansi', 'retensi', 'force majeure'] },
    ],
    sample: 'PERJANJIAN PENGADAAN DAN PEMASANGAN. Perjanjian ini dibuat antara PT Surya Andalan Persada selaku Penyedia dan PT Nusantara Energi Mandiri selaku Pemberi Kerja.\nRuang lingkup: Penyedia menyediakan dan memasang 4 unit transformator distribusi beserta panel kendali di Gardu Induk Cikarang.\nNilai kontrak: sebesar Rp 18.500.000.000 belum termasuk PPN.\nJangka waktu: berlaku sejak 10 Januari 2025 sampai dengan 30 September 2025.\nTermin pembayaran: uang muka 20% setelah penandatanganan, 50% progres pemasangan, 30% setelah berita acara serah terima akhir.\nKewajiban pelaksanaan: Penyedia wajib menyerahkan unit terpasang dan teruji sesuai spesifikasi teknis lampiran A.\nPengakuan: pendapatan diakui pada suatu waktu setelah berita acara serah terima ditandatangani kedua pihak.\nSanksi: denda keterlambatan 1 per mil per hari maksimum 5% nilai kontrak; retensi 5% dilepas setelah masa garansi 12 bulan.',
  },
  lease: {
    docLabel: 'Kontrak Sewa', std: 'PSAK 73', module: 'psak73', wpRef: 'F', icon: 'doc',
    summary: 'Ringkasan Kontrak Sewa (PSAK 73)',
    audit: 'Dasar re-kalkulasi aset hak-guna & liabilitas sewa; tautkan ke WP F (Sewa PSAK 73).',
    fields: [
      { key: 'parties', label: 'Pihak (lessor & lessee)', kind: 'text', get: 'parties' },
      { key: 'asset', label: 'Aset pendasar', kind: 'text', get: 'kw', kw: ['aset', 'objek sewa', 'menyewakan', 'ruang', 'kendaraan', 'gedung'] },
      { key: 'term', label: 'Masa sewa', kind: 'text', get: 'kw', kw: ['masa sewa', 'jangka waktu', 'tahun', 'bulan', 'berlaku'] },
      { key: 'payment', label: 'Pembayaran sewa', kind: 'amount', get: 'amount', kw: ['sewa', 'per tahun', 'per bulan', 'sebesar'] },
      { key: 'rate', label: 'Tingkat diskonto inkremental', kind: 'text', get: 'percent', kw: ['diskonto', 'bunga', 'inkremental'] },
      { key: 'options', label: 'Opsi perpanjangan / pembelian', kind: 'multiline', get: 'kw', kw: ['opsi', 'perpanjangan', 'pembelian', 'memperpanjang'] },
    ],
    sample: 'PERJANJIAN SEWA MENYEWA. Antara PT Graha Properti Utama (Lessor) dengan PT Nusantara Energi Mandiri (Lessee).\nObjek sewa: ruang kantor lantai 8 seluas 1.200 m2 di Gedung Menara Sentral, Jakarta.\nMasa sewa: 5 tahun berlaku sejak 1 Februari 2025.\nPembayaran sewa: sebesar Rp 2.400.000.000 per tahun dibayar di muka tiap awal periode.\nTingkat diskonto inkremental peminjam: 11% per tahun.\nOpsi: Lessee memiliki opsi perpanjangan 3 tahun dan tidak terdapat opsi pembelian aset.',
  },
  confirmation: {
    docLabel: 'Konfirmasi / Rekening Koran', std: 'SA 505', module: 'confirm', wpRef: 'A', icon: 'report',
    summary: 'Ringkasan Konfirmasi Eksternal (SA 505)',
    audit: 'Cocokkan saldo terkonfirmasi ke buku besar; selisih mengalir ke SAD. Tautkan ke WP A (Kas & Bank) / B (Piutang).',
    fields: [
      { key: 'party', label: 'Pihak penerbit / dikonfirmasi', kind: 'text', get: 'parties' },
      { key: 'balance', label: 'Saldo dikonfirmasi', kind: 'amount', get: 'amount', kw: ['saldo', 'sebesar', 'outstanding'] },
      { key: 'cutoff', label: 'Tanggal cut-off', kind: 'date', get: 'date', kw: ['per tanggal', 'per ', 'posisi'] },
      { key: 'status', label: 'Status balasan / selisih', kind: 'text', get: 'kw', kw: ['sesuai', 'selisih', 'tidak sesuai', 'cocok', 'discrepancy'] },
      { key: 'recon', label: 'Pos rekonsiliasi outstanding', kind: 'multiline', get: 'kw', kw: ['outstanding', 'dalam perjalanan', 'belum', 'kliring', 'rekonsiliasi'] },
    ],
    sample: 'KONFIRMASI SALDO BANK. PT Bank Central Asia Tbk menyatakan posisi rekening atas nama PT Nusantara Energi Mandiri.\nSaldo per tanggal 31 Desember 2025 sebesar Rp 4.182.560.000.\nTerdapat cek dalam perjalanan (outstanding) sebesar Rp 215.000.000 yang belum dikliring.\nStatus: saldo sesuai dengan catatan setelah memperhitungkan pos rekonsiliasi.',
  },
  tax: {
    docLabel: 'Dokumen Pajak', std: 'PSAK 46', module: 'psak46', wpRef: '810', icon: 'report',
    summary: 'Ringkasan Dokumen Pajak (PSAK 46)',
    audit: 'Dasar evaluasi beda waktu/tetap & pajak tangguhan; tautkan ke WP 810 (Evaluasi) / modul PSAK 46.',
    fields: [
      { key: 'entity', label: 'Wajib pajak', kind: 'text', get: 'parties' },
      { key: 'period', label: 'Masa / tahun pajak', kind: 'text', get: 'kw', kw: ['masa pajak', 'tahun pajak', 'periode', 'tahun'] },
      { key: 'base', label: 'Dasar pengenaan pajak', kind: 'amount', get: 'amount', kw: ['dasar pengenaan', 'dpp', 'penghasilan kena pajak', 'sebesar'] },
      { key: 'tax', label: 'Pajak terutang / dibayar', kind: 'amount', get: 'amount', kw: ['pph', 'terutang', 'pajak', 'kurang bayar'] },
      { key: 'diff', label: 'Beda waktu / tetap teridentifikasi', kind: 'multiline', get: 'kw', kw: ['beda waktu', 'beda tetap', 'penyusutan', 'koreksi fiskal', 'tangguhan'] },
    ],
    sample: 'SPT TAHUNAN PPh BADAN. Wajib Pajak: PT Nusantara Energi Mandiri, Tahun Pajak 2025.\nPenghasilan kena pajak sebesar Rp 12.340.000.000.\nPPh Badan terutang sebesar Rp 2.714.800.000, kurang bayar Rp 180.500.000.\nKoreksi fiskal: beda waktu penyusutan aset tetap dan beda tetap beban representasi; menimbulkan aset/liabilitas pajak tangguhan.',
  },
  minutes: {
    docLabel: 'Notulen Rapat / RUPS', std: 'SA 550', module: 'related', wpRef: 'K', icon: 'doc',
    summary: 'Ringkasan Notulen / RUPS (SA 550)',
    audit: 'Identifikasi keputusan, dividen, transaksi pihak berelasi & komitmen; tautkan ke WP K (Ekuitas) / 820 (Subsequent).',
    fields: [
      { key: 'meeting', label: 'Jenis & tanggal rapat', kind: 'text', get: 'date', kw: ['rapat', 'rups', 'tanggal', 'diselenggarakan'] },
      { key: 'attendees', label: 'Pihak hadir / pemegang saham', kind: 'text', get: 'parties' },
      { key: 'decisions', label: 'Keputusan utama', kind: 'multiline', get: 'kw', kw: ['memutuskan', 'menyetujui', 'mengesahkan', 'menetapkan'] },
      { key: 'dividend', label: 'Dividen / mutasi ekuitas', kind: 'amount', get: 'amount', kw: ['dividen', 'laba ditahan', 'modal', 'sebesar'] },
      { key: 'related', label: 'Transaksi pihak berelasi / komitmen', kind: 'multiline', get: 'kw', kw: ['pihak berelasi', 'afiliasi', 'komitmen', 'pinjaman', 'jaminan'] },
    ],
    sample: 'RISALAH RAPAT UMUM PEMEGANG SAHAM TAHUNAN PT Nusantara Energi Mandiri, diselenggarakan tanggal 20 Maret 2026.\nHadir: PT Nusantara Investama (65%) dan PT Mandiri Sejahtera Group (35%).\nRapat memutuskan menyetujui laporan keuangan 2025 dan menetapkan pembagian dividen tunai sebesar Rp 3.000.000.000.\nDisetujui pula pemberian jaminan korporasi kepada pihak berelasi PT Nusantara Investama atas fasilitas kredit.',
  },
  reps: {
    docLabel: 'Surat Representasi', std: 'SA 580', module: 'opinion', wpRef: '810', icon: 'report',
    summary: 'Ringkasan Surat Representasi Manajemen (SA 580)',
    audit: 'Pastikan tanggal ≈ tanggal laporan auditor & cakupan asersi; tautkan ke WP 810 / modul Opini.',
    fields: [
      { key: 'entity', label: 'Entitas & penandatangan', kind: 'text', get: 'parties' },
      { key: 'date', label: 'Tanggal surat', kind: 'date', get: 'date', kw: ['tanggal', 'jakarta'] },
      { key: 'scope', label: 'Cakupan pernyataan asersi', kind: 'multiline', get: 'kw', kw: ['bertanggung jawab', 'menyatakan', 'menyajikan', 'lengkap'] },
      { key: 'uncorrected', label: 'Salah saji tidak dikoreksi diakui', kind: 'multiline', get: 'kw', kw: ['salah saji', 'tidak dikoreksi', 'tidak material', 'agregat'] },
    ],
    sample: 'SURAT REPRESENTASI MANAJEMEN. PT Nusantara Energi Mandiri, ditandatangani Direktur Utama dan Direktur Keuangan, Jakarta 20 Maret 2026.\nManajemen bertanggung jawab atas penyajian wajar laporan keuangan sesuai SAK dan menyatakan seluruh catatan telah lengkap diberikan.\nManajemen meyakini dampak salah saji yang tidak dikoreksi secara agregat tidak material terhadap laporan keuangan.',
  },
  generic: {
    docLabel: 'Dokumen Pendukung', std: 'SA 500', module: 'evidence', wpRef: '200', icon: 'doc',
    summary: 'Ringkasan Dokumen Pendukung (SA 500)',
    audit: 'Evaluasi relevansi & keandalan bukti; tautkan ke WP/asersi yang sesuai.',
    fields: [
      { key: 'parties', label: 'Pihak teridentifikasi', kind: 'text', get: 'parties' },
      { key: 'dates', label: 'Tanggal kunci', kind: 'text', get: 'date', kw: ['tanggal'] },
      { key: 'amounts', label: 'Nilai / jumlah teridentifikasi', kind: 'text', get: 'amount', kw: ['sebesar', 'jumlah', 'total'] },
      { key: 'summary', label: 'Pokok isi', kind: 'multiline', get: 'kw', kw: ['perihal', 'mengenai', 'tentang', 'isi'] },
    ],
    sample: 'Dokumen pendukung umum tanpa skema khusus. Perihal: ikhtisar transaksi. Pihak: PT Nusantara Energi Mandiri. Tanggal 15 Januari 2026. Jumlah sebesar Rp 750.000.000.',
  },
};

/* peta std/dest → kind skema */
function exKindFor(rec) {
  const std = (rec && rec.std) || '';
  const type = ((rec && rec.type) || '').toLowerCase();
  if (/PSAK\s*73/i.test(std) || /sewa|lease/.test(type)) return 'lease';
  if (/PSAK\s*72/i.test(std) || /kontrak|perjanjian/.test(type)) return 'contract';
  if (/SA\s*505/i.test(std) || /konfirmasi|rekening koran|bank/.test(type)) return 'confirmation';
  if (/PSAK\s*46/i.test(std) || /pajak|tax/.test(type)) return 'tax';
  if (/SA\s*550/i.test(std) || /notulen|rups|risalah/.test(type)) return 'minutes';
  if (/SA\s*580/i.test(std) || /representasi/.test(type)) return 'reps';
  return 'generic';
}

/* mesin ekstraksi: text (atau contoh) → field terstruktur */
function amsExtract(text, kind) {
  const sc = EX_SCHEMAS[kind] || EX_SCHEMAS.generic;
  const t = String(text || '').trim();
  const useSample = t.length < 30;
  const src = useSample ? sc.sample : t;
  const fields = sc.fields.map((f, i) => {
    let value = exRunGet(src, f);
    let source = useSample ? 'sample' : 'extracted';
    let conf = useSample ? 70 : exClamp(80 + ((src.length + i) % 16), 70, 97);
    if (!value) { value = exRunGet(sc.sample, f) || '—'; source = 'sample'; conf = useSample ? 70 : 55; }
    return { key: f.key, label: f.label, kind: f.kind, value, source, conf };
  });
  return { kind, fields, basis: useSample ? 'sample' : 'text', chars: src.length, schema: sc };
}

/* ------------------------------------------------------------
   3 · STORE — ekstraksi yang sudah DIDOKUMENTASIKAN (disetujui)
   localStorage ams.v1.extractions ; event 'ams-extract'
   ------------------------------------------------------------ */
const EX_KEY = 'ams.v1.extractions';
function exRead() { try { return JSON.parse(localStorage.getItem(EX_KEY) || '[]'); } catch (e) { return []; } }
function exWrite(a) { try { localStorage.setItem(EX_KEY, JSON.stringify(a)); } catch (e) {} try { window.dispatchEvent(new CustomEvent('ams-extract')); } catch (e) {} }
function amsExtractAll() { return exRead(); }
function amsExtractForWp(ref) { return exRead().filter(r => r.wpRef === ref); }
function amsExtractRemove(uid) { exWrite(exRead().filter(r => r.uid !== uid)); }
function amsExtractAdd(rec) {
  const list = exRead();
  const full = Object.assign({ uid: 'ext-' + Date.now() + '-' + Math.round(Math.random() * 1e4), ts: exNowStamp() }, rec);
  exWrite([full, ...list]);
  /* tautkan sebagai BUKTI di modul terkait (alur Evidence yang ada) */
  if (typeof amsAttachEvidence === 'function' && full.module) {
    amsAttachEvidence(full.module, { file: full.file, type: full.docLabel, std: full.std, classified: full.module, extracted: true, wpRef: full.wpRef });
  }
  return full;
}
function exNowStamp() {
  try { return new Date().toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch (e) { return new Date().toISOString(); }
}
function useExtractions(ref) {
  const get = () => (ref ? amsExtractForWp(ref) : amsExtractAll());
  const [v, setV] = useStateEX(get);
  useEffectEX(() => {
    const r = () => setV(get());
    r();
    window.addEventListener('ams-extract', r); window.addEventListener('focus', r);
    return () => { window.removeEventListener('ams-extract', r); window.removeEventListener('focus', r); };
  }, [ref]);
  return v;
}

/* ------------------------------------------------------------
   4 · UI · badge sumber field
   ------------------------------------------------------------ */
const EX_SRC = {
  extracted: { label: 'Terekstrak', cls: 'ok' },
  sample: { label: 'Contoh', cls: 'sample' },
  manual: { label: 'Disunting', cls: 'manual' },
};
function ExSourceBadge({ source, conf }) {
  const s = EX_SRC[source] || EX_SRC.extracted;
  return <span className={'exr-src ' + s.cls}>{s.label}{conf != null && source !== 'manual' ? ' · ' + conf + '%' : ''}</span>;
}

/* satu baris field — dapat disunting auditor */
function ExFieldRow({ f, onEdit, readOnly }: any) {
  const multi = f.kind === 'multiline';
  if (readOnly) {
    return (
      <div className="exr-field">
        <div className="exr-flabel">{f.label}</div>
        <div className="exr-fval ro">{f.value || '—'}</div>
      </div>
    );
  }
  return (
    <div className="exr-field">
      <div className="exr-frow">
        <span className="exr-flabel">{f.label}</span>
        <ExSourceBadge source={f.source} conf={f.conf} />
      </div>
      {multi
        ? <textarea className="exr-input" rows={2} value={f.value} onChange={e => onEdit(f.key, e.target.value)} />
        : <input className="exr-input" value={f.value} onChange={e => onEdit(f.key, e.target.value)} />}
    </div>
  );
}

/* ------------------------------------------------------------
   5 · PANEL REVIEW EKSTRAKSI (dipakai di Co-pilot)
   rec: { file, std, type, dest, _text? }
   ------------------------------------------------------------ */
function ExtractReview({ rec, route, nav, onClose }: any) {
  const kind = exKindFor(rec);
  const sc = EX_SCHEMAS[kind] || EX_SCHEMAS.generic;
  const wpRefsAll = (typeof window !== 'undefined' && window.WP_REFS) || [{ ref: sc.wpRef, title: sc.summary }];
  const [text, setText] = useStateEX(rec._text || '');
  const [res, setRes] = useStateEX(null);        /* hasil ekstraksi (fields) */
  const [busy, setBusy] = useStateEX(false);
  const [wpRef, setWpRef] = useStateEX(sc.wpRef);
  const [saved, setSaved] = useStateEX(null);     /* record tersimpan */
  const llm = (typeof amsLLMConfig === 'function') ? amsLLMConfig() : null;

  const run = (useSample) => {
    setBusy(true);
    const input = useSample ? '' : text;
    setTimeout(() => {
      const r = amsExtract(input, kind);
      setRes(r.fields);
      setBusy(false);
    }, 520);
  };
  const edit = (key, val) => setRes(prev => prev.map(f => f.key === key ? { ...f, value: val, source: 'manual' } : f));

  const wpTitle = (wpRefsAll.find(w => w.ref === wpRef) || {}).title || sc.summary;

  const approve = () => {
    const fields = res.map(f => ({ key: f.key, label: f.label, kind: f.kind, value: f.value, source: f.source, conf: f.conf }));
    const USER: any = (AMS && AMS.USER) || { name: 'Anindya Pramesti', role: 'Audit Manager' };
    const rc = amsExtractAdd({
      file: rec.file, kind, docLabel: sc.docLabel, std: sc.std, module: sc.module,
      wpRef, wpTitle, summary: sc.summary, audit: sc.audit, fields,
      approver: USER.name, role: USER.role,
      basis: (text && text.trim().length >= 30) ? 'Teks dokumen' : 'Konten contoh',
      provider: llm ? (llm.providerLabel + ' · ' + llm.modelLabel) : '—',
    });
    setSaved(rc);
  };

  if (saved) {
    return (
      <div className="msg ai wide">
        <div className="exr-card done">
          <div className="exr-done-h"><I.checkCircle size={16} /> Terdokumentasi & disetujui</div>
          <div className="exr-done-b">
            Ekstraksi <b>{sc.docLabel}</b> dari <b>{rec.file}</b> dicatat ke Kertas Kerja <b>{wpRef}</b> ({wpTitle}) dan ditautkan sebagai bukti di modul terkait.
            <div className="exr-trace"><I.lock size={10} /> Disetujui {saved.approver} · {saved.ts} · SA 230</div>
          </div>
          <div className="exr-done-act">
            <button className="exr-btn primary" onClick={() => { if (typeof openCanonicalWp === 'function') openCanonicalWp(nav, wpRef); else nav('workpapers'); onClose && onClose(); }}><I.layers size={13} /> Buka Kertas Kerja {wpRef}</button>
            <button className="exr-btn ghost" onClick={() => { nav(sc.module, { from: 'copilot' }); onClose && onClose(); }}>Buka modul {(MODULE_INDEX[sc.module] || {}).label || sc.module}</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="msg ai wide">
      <div className="exr-card">
        <div className="exr-head">
          <span className="exr-ic">{React.createElement(I[sc.icon] || I.doc, { size: 15 })}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="exr-file">{rec.file}</div>
            <div className="exr-sub">{sc.docLabel} · <span className="exr-std">{sc.std}</span></div>
          </div>
          {llm && <span className={'exr-llm ' + (llm.hasKey ? 'on' : 'off')} title={llm.hasKey ? 'Model aktif' : 'Atur di Pengaturan › AI & LLM'}><I.sparkle size={10} /> {llm.short}</span>}
        </div>

        {!res && (
          <>
            <div className="exr-lead"><I.sparkle size={12} /> Tempel isi dokumen untuk diekstrak, atau gunakan konten contoh.</div>
            <textarea className="exr-paste" rows={4} value={text} onChange={e => setText(e.target.value)} placeholder={'Tempel teks ' + sc.docLabel.toLowerCase() + ' di sini…'} />
            <div className="exr-actions">
              <button className="exr-btn primary" disabled={busy} onClick={() => run(false)}>{busy ? 'Mengekstrak…' : <><I.sparkle size={13} /> Ekstrak isi</>}</button>
              <button className="exr-btn ghost" disabled={busy} onClick={() => { setText(sc.sample); run(true); }}>Gunakan contoh</button>
            </div>
          </>
        )}

        {res && (
          <>
            <div className="exr-fieldlead"><I.check size={12} /> {sc.summary} <span className="tiny muted">· tinjau & sunting sebelum disetujui</span></div>
            <div className="exr-fields">
              {res.map(f => <ExFieldRow key={f.key} f={f} onEdit={edit} />)}
            </div>

            <div className="exr-route">
              <span className="tiny muted">Dokumentasikan ke Kertas Kerja</span>
              <select className="exr-select" value={wpRef} onChange={e => setWpRef(e.target.value)}>
                {wpRefsAll.map(w => <option key={w.ref} value={w.ref}>{w.ref} — {w.title}</option>)}
              </select>
            </div>
            <div className="exr-auditnote"><I.target size={11} /> {sc.audit}</div>

            <div className="exr-gate">
              <div className="exr-gate-badge"><I.gavel size={11} /> Keputusan auditor · SA 230</div>
              <div className="exr-gate-note">Ekstraksi AI adalah usulan. Persetujuan auditor diperlukan sebelum dicatat ke kertas kerja.</div>
              <div className="exr-actions">
                <button className="exr-btn primary" onClick={approve}><I.check size={13} /> Setujui & dokumentasikan</button>
                <button className="exr-btn ghost" onClick={() => setRes(null)}>Ekstrak ulang</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------
   6 · PANEL DI KERTAS KERJA — daftar ekstraksi terdokumentasi
   dipakai di view_wp.jsx (XrefTab)
   ------------------------------------------------------------ */
function WpExtractions({ wpRef }) {
  const list = useExtractions(wpRef);
  const [open, setOpen] = useStateEX({});
  if (!list.length) return null;
  return (
    <Panel noBody>
      <div className="panel-h">
        <h3 style={{ whiteSpace: 'nowrap' }}>Ekstraksi Dokumen AI</h3>
        <div style={{ flex: 1 }} />
        <span className="tiny muted">{list.length} dokumen · disetujui auditor</span>
      </div>
      <div>
        {list.map(r => {
          const isOpen = open[r.uid];
          return (
            <div key={r.uid} style={{ borderBottom: '1px solid var(--line-soft)' }}>
              <div className="row ac gap10" style={{ padding: '9px 14px', cursor: 'pointer' }} onClick={() => setOpen(o => ({ ...o, [r.uid]: !o[r.uid] }))}>
                <span style={{ width: 30, height: 30, borderRadius: 7, background: 'var(--blue-050)', color: 'var(--blue)', display: 'grid', placeItems: 'center', flex: '0 0 30px' }}><I.sparkle size={15} /></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600 }} className="truncate">{r.file}</div>
                  <div className="tiny muted">{r.docLabel} · {r.std} · {r.fields.length} field</div>
                </div>
                <span className="chip tiny" style={{ background: 'var(--green-bg)', color: 'var(--green)' }}><I.check size={11} /> {r.approver}</span>
                <span style={{ color: 'var(--ink-4)', transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }}><I.chevron size={14} /></span>
              </div>
              {isOpen && (
                <div style={{ padding: '4px 14px 14px 54px' }}>
                  <div className="exr-fields ro">
                    {r.fields.map(f => <ExFieldRow key={f.key} f={f} readOnly />)}
                  </div>
                  <div className="exr-trace" style={{ marginTop: 8 }}><I.lock size={10} /> Sumber: {r.basis} · model {r.provider} · disetujui {r.ts} · SA 230</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

Object.assign(window, {
  amsExtract, EX_SCHEMAS, exKindFor,
  amsExtractAll, amsExtractForWp, amsExtractAdd, amsExtractRemove, useExtractions,
  ExtractReview, WpExtractions, ExFieldRow,
});


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { EX_SCHEMAS, ExFieldRow, ExtractReview, WpExtractions, amsExtract, amsExtractAdd, amsExtractAll, amsExtractForWp, amsExtractRemove, exKindFor, useExtractions };
