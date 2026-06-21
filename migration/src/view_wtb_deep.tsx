/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { useAudit, useNav } from './contexts';
import { I } from './icons';
import { Badge, Btn, Panel, Progress, Seg } from './ui.jsx';

/* ============================================================
   Asseris — WTB Deep modules
   · Command KPI band
   · Preliminary Analytical Review (SA 520)
   · FS Grouping & Reconciliation (ties to FS Generator)
   ============================================================ */
const { useState: useStateWD, useMemo: useMemoWD } = React;

/* Seeded auditor explanations for expected fluctuations (by GL code).
   A flagged account with no explanation here surfaces as "Perlu tindak lanjut". */
const DEFAULT_EXPL = {
  '1-1100': 'Kenaikan kas dari percepatan penagihan akhir tahun & penarikan fasilitas modal kerja; rekonsiliasi bank cocok (WP A).',
  '1-1200': 'Sejalan pertumbuhan penjualan 16,7%. DSO 54→56 hari (wajar). Cut-off & konfirmasi piutang dijalankan (WP B).',
  '1-1210': 'CKPN naik mengikuti model ECL PSAK 71 atas kenaikan piutang; loss rate per-stage di-review (WP B-7).',
  '1-1300': 'Penumpukan bahan baku antisipasi kenaikan harga. Uji NRV & observasi stock opname dilakukan (WP C).',
  '1-2100': 'Penambahan mesin produksi Rp 18,3 M; vouching otorisasi capex & cek fisik sampling (WP E).',
  '1-2110': 'Beban penyusutan periode berjalan sesuai kebijakan garis lurus; tidak ada perubahan estimasi umur manfaat.',
  '1-2400': 'Akun direclass dari Aset Tetap — lisensi software, paten & hubungan pelanggan (PSAK 19). Penambahan Rp 1,2 M dari pengembangan ERP dikapitalisasi & paten baru (WP E-INT).',
  '1-2410': 'Amortisasi garis lurus aset takberwujud berumur terbatas; lisensi umur tak-terbatas diuji penurunan nilai tahunan PSAK 48 (WP E-INT).',
  '1-2300': 'Akun baru — penerapan PSAK 73 (aset hak-guna) atas sewa gudang & kendaraan. Re-kalkulasi (WP F-1).',
  '1-2500': 'Kenaikan aset pajak tangguhan dari perbedaan temporer penyusutan & CKPN; di-review (WP G).',
  '2-1100': 'Sejalan kenaikan pembelian persediaan; rekonsiliasi utang & uji cut-off pembelian (WP AA).',
  '2-1200': 'Penarikan fasilitas modal kerja untuk pendanaan persediaan; konfirmasi bank diperoleh (WP BB).',
  '2-1300': 'Termasuk akrual bonus manajemen Rp 0,98 M (AJE-04) & akrual utilitas akhir tahun; uji pisah batas (WP CC).',
  '2-1400': 'Sejalan kenaikan laba & PPN keluaran akhir tahun; rekonsiliasi SPT (WP DD).',
  '2-1500': 'Akun baru — porsi lancar liabilitas sewa PSAK 73 (WP F-1).',
  '2-2100': 'Pelunasan terjadwal pokok utang bank jangka panjang Rp 3,5 M sesuai amortisasi; konfirmasi bank diperoleh (WP BB).',
  '2-2200': 'Akun baru — liabilitas sewa PSAK 73 (porsi jangka panjang); sesuai skedul amortisasi (WP F-1).',
  '3-2100': 'Kenaikan dari laba tahun berjalan Rp 14,7 M; tidak ada pembagian dividen pada periode.',
  '4-1100': 'Pertumbuhan volume 11% + kenaikan harga jual rata-rata 5%. Uji cut-off pengakuan pendapatan (WP B-3, R).',
  '5-1100': 'Sejalan kenaikan penjualan; rasio BPP/penjualan stabil 70% (LY 70%). Termasuk AJE-01 cut-off.',
  '5-2100': 'Sejalan volume penjualan; rasio beban penjualan terhadap penjualan stabil ~8%.',
  '5-3100': 'Termasuk akrual bonus manajemen Rp 0,98 M (AJE-04); sisanya kenaikan gaji & sewa kantor.',
  '5-5100': 'Sejalan kenaikan laba sebelum pajak; rekonsiliasi fiskal & tarif efektif di-review (WP W).',
};

const grpKind = (g) => g.startsWith('Aset') ? 'aset' : g.startsWith('Liabilitas') ? 'liab' : g === 'Ekuitas' ? 'ekuitas' : g === 'Pendapatan' ? 'pendapatan' : 'beban';

/* Shared WTB summary + analytical flags */
function computeWtbSummary(wtb, pm, opts?) {
  const absThr = (opts && opts.absThr != null) ? opts.absThr : pm;        // Rupiah
  const pctThr = (opts && opts.pctThr != null) ? opts.pctThr : 20;        // %
  let totAset = 0, liabMag = 0, ekuMag = 0, revMag = 0, beban = 0, overPm = 0;
  const rows = wtb.map(r => {
    const k = grpKind(r.group);
    if (k === 'aset') totAset += r.adj;
    else if (k === 'liab') liabMag += -r.adj;
    else if (k === 'ekuitas') ekuMag += -r.adj;
    else if (k === 'pendapatan') revMag += -r.adj;
    else beban += r.adj;
    if (Math.abs(r.adj) > pm) overPm++;
    const delta = r.adj - r.ly;
    const isNew = r.ly === 0;
    const pct = isNew ? (delta !== 0 ? Infinity : 0) : (delta / Math.abs(r.ly)) * 100;
    const flagged = Math.abs(delta) >= absThr || Math.abs(pct) >= pctThr;
    const noteText = (r.note != null && r.note !== '') ? r.note : (DEFAULT_EXPL[r.code] || '');
    const status = r.revStatus || (noteText ? 'explained' : 'followup');
    return { ...r, kind: k, delta, pct, isNew, flagged, noteText, status };
  });
  const laba = revMag - beban;
  const flagged = rows.filter(r => r.flagged);
  const explained = flagged.filter(r => r.status === 'explained').length;
  const followup = flagged.length - explained;
  return {
    rows, totAset, liabMag, ekuMag, revMag, beban, laba,
    neracaDiff: totAset - (liabMag + ekuMag),
    margin: revMag ? (laba / revMag) * 100 : 0,
    overPm, absThr, pctThr,
    flaggedCount: flagged.length, explained, followup,
  };
}
window.computeWtbSummary = computeWtbSummary;
window.DEFAULT_EXPL = DEFAULT_EXPL;

/* mini two-bar PY→CY trend */
function TrendBars({ py, cy, w = 46, h = 22 }: any) {
  const max = Math.max(Math.abs(py), Math.abs(cy)) || 1;
  const bh = (v) => Math.max(2, (Math.abs(v) / max) * (h - 2));
  const up = Math.abs(cy) >= Math.abs(py);
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <rect x={3} y={h - bh(py)} width={14} height={bh(py)} rx="1.5" fill="var(--ink-4)" opacity="0.5" />
      <rect x={26} y={h - bh(cy)} width={14} height={bh(cy)} rx="1.5" fill={up ? 'var(--blue)' : 'var(--amber)'} />
    </svg>
  );
}

/* ---------------- Command KPI band ---------------- */
function WtbKpiBand({ summary, pm, onGotoReview }: any) {
  const { fmt } = AMS;
  const M = (v) => 'Rp ' + fmt(v / 1e9, 1) + ' M';
  const balanced = Math.abs(summary.neracaDiff) < 1e6;
  const reviewPct = summary.flaggedCount ? Math.round((summary.explained / summary.flaggedCount) * 100) : 100;

  const Tile = ({ label, value, sub, accent, children, onClick }: any) => (
    <div className="panel" style={{ padding: '11px 13px', display: 'flex', flexDirection: 'column', gap: 3, cursor: onClick ? 'pointer' : 'default', position: 'relative' }} onClick={onClick}>
      <div className="tiny upper" style={{ color: 'var(--ink-4)', fontWeight: 700, letterSpacing: '.05em' }}>{label}</div>
      <div className="mono" style={{ fontSize: 19, fontWeight: 700, color: accent || 'var(--navy)', lineHeight: 1.05 }}>{value}</div>
      {children}
      {sub && <div className="tiny muted" style={{ marginTop: 1 }}>{sub}</div>}
    </div>
  );

  return (
    <div className="grid" style={{ gridTemplateColumns: 'repeat(5,1fr)', marginBottom: 12 }}>
      <Tile label="Total Aset" value={M(summary.totAset)} sub="Saldo setelah penyesuaian" />
      <Tile label="Posisi Neraca" value={balanced ? 'Seimbang' : 'Selisih'} accent={balanced ? 'var(--green)' : 'var(--red)'} sub={balanced ? 'Aset = Liabilitas + Ekuitas' : 'Selisih ' + M(Math.abs(summary.neracaDiff))} />
      <Tile label="Laba Bersih" value={M(summary.laba)} accent="var(--blue)" sub={'Margin ' + fmt(summary.margin, 1) + '% · Pendapatan − Beban'} />
      <Tile label={'Akun > PM'} value={summary.overPm + ' akun'} accent={summary.overPm ? 'var(--amber)' : 'var(--green)'} sub={'Performance Materiality Rp ' + fmt(pm / 1e6, 0) + ' jt'} />
      <Tile label="Telaah Pergerakan" value={summary.explained + ' / ' + summary.flaggedCount} accent={summary.followup ? 'var(--amber)' : 'var(--green)'} onClick={onGotoReview}
        sub={(summary.followup ? summary.followup + ' perlu tindak lanjut' : 'Selesai') + ' · SA 520'}>
        <div className="pbar" style={{ marginTop: 4 }}><span style={{ width: reviewPct + '%', background: summary.followup ? 'var(--amber)' : 'var(--green)' }} /></div>
      </Tile>
    </div>
  );
}

/* ---------------- Preliminary Analytical Review (SA 520) ---------------- */
function WtbAnalytical({ pm, onOpenAccount }: any) {
  const { fmt } = AMS;
  const { wtb, setWtbOverrides, addReviewNote, aje } = useAudit();
  const nav = useNav();
  const [absJt, setAbsJt] = useStateWD(Math.round(pm / 1e6));
  const [pct, setPct] = useStateWD(20);
  const [scope, setScope] = useStateWD('sig'); // sig | all
  const [selKey, setSelKey] = useStateWD(null);
  const [draft, setDraft] = useStateWD('');

  const summary = useMemoWD(() => computeWtbSummary(wtb, pm, { absThr: absJt * 1e6, pctThr: pct }), [wtb, pm, absJt, pct]);
  const list = scope === 'sig' ? summary.rows.filter(r => r.flagged) : summary.rows;
  const sel = summary.rows.find(r => r.key === selKey) || null;

  React.useEffect(() => { setDraft(sel ? sel.noteText : ''); }, [selKey]);

  const num = (n) => <span className={n < 0 ? 'neg' : ''}>{fmt(n / 1e6, 1)}</span>;
  const pctStr = (r) => r.isNew ? 'baru' : (r.pct > 0 ? '+' : '') + fmt(r.pct, 1) + '%';

  const save = (status) => {
    if (!sel) return;
    setWtbOverrides(o => ({ ...o, [sel.key]: { ...(o[sel.key] || {}), note: draft, revStatus: status } }));
  };
  const relAje = (code) => aje.filter(a => Array.isArray(a.lines)
    ? a.lines.some(l => l.code === code)
    : ((a.dr && a.dr.split(' ')[0] === code) || (a.cr && a.cr.split(' ')[0] === code)));

  return (
    <>
      {/* control + summary strip */}
      <div className="panel" style={{ padding: '10px 13px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div className="row ac gap8">
          <span className="tiny upper" style={{ fontWeight: 700, color: 'var(--ink-3)' }}>Ambang Fluktuasi</span>
          <div className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <span className="tiny muted">≥ Rp</span>
            <input className="input mono" style={{ width: 86, height: 26, textAlign: 'right' }} type="number" value={absJt} onChange={e => setAbsJt(Math.max(0, +e.target.value || 0))} />
            <span className="tiny muted">jt</span>
          </div>
          <span className="tiny muted">atau</span>
          <div className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <span className="tiny muted">≥</span>
            <input className="input mono" style={{ width: 56, height: 26, textAlign: 'right' }} type="number" value={pct} onChange={e => setPct(Math.max(0, +e.target.value || 0))} />
            <span className="tiny muted">%</span>
          </div>
          <button className="btn sm" onClick={() => { setAbsJt(Math.round(pm / 1e6)); setPct(20); }}><I.sync size={12} /> Reset ke PM</button>
        </div>
        <div className="vdivider" style={{ height: 26 }} />
        <div className="row ac gap12" style={{ flex: 1 }}>
          <div><div className="mono" style={{ fontWeight: 700, fontSize: 15, color: 'var(--navy)' }}>{summary.flaggedCount}</div><div className="tiny muted">fluktuasi signifikan</div></div>
          <div><div className="mono" style={{ fontWeight: 700, fontSize: 15, color: 'var(--green)' }}>{summary.explained}</div><div className="tiny muted">dijelaskan</div></div>
          <div><div className="mono" style={{ fontWeight: 700, fontSize: 15, color: summary.followup ? 'var(--amber)' : 'var(--ink-3)' }}>{summary.followup}</div><div className="tiny muted">perlu tindak lanjut</div></div>
          <div style={{ flex: 1, maxWidth: 200 }}><Progress value={summary.flaggedCount ? (summary.explained / summary.flaggedCount) * 100 : 100} color={summary.followup ? 'var(--amber)' : 'var(--green)'} /></div>
        </div>
        <Seg options={[{ value: 'sig', label: 'Signifikan' }, { value: 'all', label: 'Semua akun' }]} value={scope} onChange={setScope} />
      </div>

      <div className="grid" style={{ gridTemplateColumns: sel ? '1fr 340px' : '1fr', gap: 12, alignItems: 'start' }}>
        <div style={{ minWidth: 0 }}>
        <Panel noBody style={{ overflow: 'hidden' }}>
          <div className="panel-h"><h3>Prosedur Analitis Pendahuluan</h3><span className="sub">SA 520 · perbandingan saldo audited tahun lalu vs saldo kini (adjusted)</span></div>
          <div style={{ maxHeight: 'calc(100vh - 360px)', overflow: 'auto' }}>
            <table className="dtbl">
              <thead><tr>
                <th>Akun</th><th style={{ width: 38 }}>WP</th>
                <th className="num" style={{ width: 104 }}>TA Lalu</th>
                <th className="num" style={{ width: 104 }}>Saldo Kini</th>
                <th className="num" style={{ width: 100 }}>Δ Rp</th>
                <th className="num" style={{ width: 72 }}>Δ %</th>
                <th style={{ width: 56 }}>Tren</th>
                <th>Penjelasan</th>
                <th style={{ width: 130 }}>Status</th>
              </tr></thead>
              <tbody>
                {list.map(r => (
                  <tr key={r.key} onClick={() => setSelKey(r.key)} className={selKey === r.key ? 'sel' : ''} style={{ cursor: 'pointer' }}>
                    <td><div style={{ fontWeight: 600 }}>{r.name}</div><div className="mono tiny muted">{r.code}</div></td>
                    <td><span className="chip tiny" style={{ height: 18, padding: '0 6px', fontFamily: 'var(--mono)' }}>{r.lead}</span></td>
                    <td className="num muted">{num(r.ly)}</td>
                    <td className="num" style={{ fontWeight: 600 }}>{num(r.adj)}</td>
                    <td className="num" style={{ color: 'var(--ink-2)' }}>{r.delta > 0 ? '+' : ''}{num(r.delta)}</td>
                    <td className="num tiny" style={{ color: r.isNew ? 'var(--purple)' : Math.abs(r.pct) >= pct ? 'var(--amber)' : 'var(--ink-3)', fontWeight: 600 }}>{pctStr(r)}</td>
                    <td><TrendBars py={r.ly} cy={r.adj} /></td>
                    <td className="truncate tiny" style={{ maxWidth: 260, color: r.noteText ? 'var(--ink-2)' : 'var(--ink-4)' }}>{r.noteText || (r.flagged ? '— belum dijelaskan —' : 'dalam ambang')}</td>
                    <td>
                      {r.flagged
                        ? <Badge kind={r.status === 'explained' ? 'green' : 'amber'}>{r.status === 'explained' ? 'Dijelaskan' : 'Perlu tindak lanjut'}</Badge>
                        : <span className="tiny muted">— wajar —</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="row gap8 tiny muted" style={{ padding: '8px 12px' }}>
            <span className="row ac gap6"><span style={{ width: 11, height: 8, borderRadius: 2, background: 'var(--ink-4)', opacity: .5, display: 'inline-block' }} /> TA lalu</span>
            <span className="row ac gap6"><span style={{ width: 11, height: 8, borderRadius: 2, background: 'var(--blue)', display: 'inline-block' }} /> Saldo kini</span>
            <span>·</span><span>Nilai dalam jutaan Rupiah · klik baris untuk dokumentasi</span>
          </div>
        </Panel>
        </div>

        {/* documentation editor */}
        {sel && (() => {
          const rel = relAje(sel.code);
          return (
            <Panel noBody style={{ position: 'sticky', top: 0 }}>
              <div style={{ background: 'var(--surface-2)', padding: '10px 13px', borderBottom: '1px solid var(--line)' }}>
                <div className="row ac jb">
                  <span className="tiny upper" style={{ fontWeight: 700, color: 'var(--ink-3)' }}>Dokumentasi Telaah</span>
                  <button className="btn sm icon ghost" onClick={() => setSelKey(null)}><I.x size={14} /></button>
                </div>
                <div style={{ fontWeight: 700, fontSize: 13, marginTop: 4 }}>{sel.name}</div>
                <div className="mono tiny muted">{sel.code} · {sel.group}</div>
              </div>
              <div style={{ padding: 13 }}>
                <div className="row gap8" style={{ marginBottom: 10 }}>
                  <div className="panel" style={{ flex: 1, padding: '7px 10px', boxShadow: 'none', background: 'var(--surface-2)' }}>
                    <div className="tiny muted upper">TA Lalu</div>
                    <div className="mono" style={{ fontWeight: 700 }}>{fmt(sel.ly / 1e6, 1)}</div>
                  </div>
                  <div className="panel" style={{ flex: 1, padding: '7px 10px', boxShadow: 'none', background: 'var(--surface-2)' }}>
                    <div className="tiny muted upper">Saldo Kini</div>
                    <div className="mono" style={{ fontWeight: 700 }}>{fmt(sel.adj / 1e6, 1)}</div>
                  </div>
                  <div className="panel" style={{ flex: 1, padding: '7px 10px', boxShadow: 'none', background: sel.flagged ? 'var(--amber-bg)' : 'var(--green-bg)' }}>
                    <div className="tiny muted upper">Δ</div>
                    <div className="mono" style={{ fontWeight: 700, color: sel.flagged ? 'var(--amber)' : 'var(--green)' }}>{sel.isNew ? 'baru' : (sel.pct > 0 ? '+' : '') + fmt(sel.pct, 1) + '%'}</div>
                  </div>
                </div>

                {rel.length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <div className="tiny muted upper" style={{ marginBottom: 4 }}>AJE menyentuh akun ini</div>
                    {rel.map(a => (
                      <div key={a.id} className="row ac jb" style={{ padding: '4px 8px', border: '1px solid var(--line)', borderRadius: 5, marginBottom: 4 }}>
                        <span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{a.id}</span>
                        <span className="tiny truncate" style={{ flex: 1, margin: '0 8px', color: 'var(--ink-2)' }}>{a.desc}</span>
                        <Badge>{a.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}

                <div className="field" style={{ marginBottom: 10 }}>
                  <label>Penjelasan auditor</label>
                  <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={4}
                    placeholder="Jelaskan penyebab fluktuasi & prosedur yang dijalankan…"
                    style={{ width: '100%', border: '1px solid var(--line-strong)', borderRadius: 5, padding: '7px 9px', fontSize: 12, fontFamily: 'var(--ui)', resize: 'vertical', outline: 'none', color: 'var(--ink)' }} />
                  {!sel.note && DEFAULT_EXPL[sel.code] && <span className="tiny muted" style={{ marginTop: 3 }}>Saran sistem dimuat — sunting bila perlu.</span>}
                </div>

                <div className="row gap8" style={{ marginBottom: 8 }}>
                  <Btn sm variant="primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => save('explained')}><I.check size={13} /> Tandai Dijelaskan</Btn>
                  <Btn sm style={{ flex: 1, justifyContent: 'center' }} onClick={() => save('followup')}><I.flag size={13} /> Perlu Tindak Lanjut</Btn>
                </div>
                <div className="row gap8">
                  <Btn sm style={{ flex: 1, justifyContent: 'center' }} onClick={() => { addReviewNote({ text: `Telaah pergerakan ${sel.code} ${sel.name}: ${draft || 'mohon dokumentasikan penyebab fluktuasi.'}`, module: 'wtb', moduleLabel: 'Working Trial Balance', to: 'Dimas R.', priority: 'medium' }); nav('reviewnotes'); }}><I.doc size={13} /> Buat Review Note</Btn>
                  <Btn sm style={{ flex: 1, justifyContent: 'center' }} onClick={() => onOpenAccount && onOpenAccount(sel)}><I.table size={13} /> Buku Besar</Btn>
                </div>
              </div>
            </Panel>
          );
        })()}
      </div>
    </>
  );
}

/* ---------------- FS Grouping & Reconciliation ---------------- */
function WtbGrouping({ pm }: any) {
  const { fmt } = AMS;
  const { wtb } = useAudit();
  const nav = useNav();
  const summary = useMemoWD(() => computeWtbSummary(wtb, pm), [wtb, pm]);

  const M = (v) => fmt(v / 1e9, 1);
  // captions in display order with statement mapping
  const CAPS = [
    { g: 'Aset Lancar', stmt: 'Neraca', side: 'Aset' },
    { g: 'Aset Tidak Lancar', stmt: 'Neraca', side: 'Aset' },
    { g: 'Liabilitas Jk. Pendek', stmt: 'Neraca', side: 'Liabilitas & Ekuitas' },
    { g: 'Liabilitas Jk. Panjang', stmt: 'Neraca', side: 'Liabilitas & Ekuitas' },
    { g: 'Ekuitas', stmt: 'Neraca', side: 'Liabilitas & Ekuitas' },
    { g: 'Pendapatan', stmt: 'Laba Rugi', side: 'Laba Rugi' },
    { g: 'Beban', stmt: 'Laba Rugi', side: 'Laba Rugi' },
  ];
  const caps = CAPS.map(c => {
    const rows = summary.rows.filter(r => r.group === c.g);
    const total = rows.reduce((a, r) => a + r.adj, 0);
    const leads = [...new Set(rows.map(r => r.lead))];
    return { ...c, rows, total, mag: Math.abs(total), n: rows.length, leads };
  });
  const balanced = Math.abs(summary.neracaDiff) < 1e6;

  const ReconRow = ({ label, value, accent, strong, top, plain }: any) => (
    <div className="row ac jb" style={{ padding: '7px 0', borderTop: top ? '2px solid var(--line-strong)' : '1px solid var(--line-soft)' }}>
      <span style={{ fontWeight: strong ? 700 : 500, color: strong ? 'var(--navy)' : 'var(--ink-2)', fontSize: strong ? 13 : 12.5 }}>{label}</span>
      <span className="mono" style={{ fontWeight: strong ? 700 : 600, color: accent || 'var(--ink)', fontSize: strong ? 14 : 12.5 }}>{plain ? value : 'Rp ' + value + ' M'}</span>
    </div>
  );

  return (
    <>
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <Panel>
          <div className="panel-h"><h3>Rekonsiliasi Neraca</h3><span className="sub">Laporan Posisi Keuangan</span></div>
          <div style={{ padding: '6px 14px 12px' }}>
            <ReconRow label="Total Aset" value={M(summary.totAset)} strong />
            <ReconRow label="Total Liabilitas" value={M(summary.liabMag)} />
            <ReconRow label="Total Ekuitas" value={M(summary.ekuMag)} />
            <ReconRow label="Liabilitas + Ekuitas" value={M(summary.liabMag + summary.ekuMag)} strong />
            <ReconRow label="Selisih (Aset − Liab − Ekuitas)" value={M(summary.neracaDiff)} accent={balanced ? 'var(--green)' : 'var(--red)'} strong top />
            <div className="row ac gap6" style={{ marginTop: 9, color: balanced ? 'var(--green)' : 'var(--red)', fontSize: 12, fontWeight: 600 }}>
              {balanced ? <I.checkCircle size={15} /> : <I.alert size={15} />}{balanced ? 'Neraca seimbang — siap dipetakan ke laporan keuangan.' : 'Neraca tidak seimbang — periksa pemetaan akun.'}
            </div>
          </div>
        </Panel>
        <Panel>
          <div className="panel-h"><h3>Rekonsiliasi Laba Rugi</h3><span className="sub">Laporan Laba Rugi Komprehensif</span></div>
          <div style={{ padding: '6px 14px 12px' }}>
            <ReconRow label="Pendapatan Bersih" value={M(summary.revMag)} strong />
            <ReconRow label="Total Beban" value={M(summary.beban)} accent="var(--red)" />
            <ReconRow label="Laba Bersih Tahun Berjalan" value={M(summary.laba)} accent="var(--blue)" strong top />
            <ReconRow label={'Marjin Laba Bersih'} value={fmt(summary.margin, 1) + ' %'} plain />
            <div className="row ac gap6" style={{ marginTop: 9, color: 'var(--ink-3)', fontSize: 12 }}>
              <I.link2 size={15} style={{ color: 'var(--blue)' }} /> Laba bersih mengalir ke <b style={{ margin: '0 4px', color: 'var(--ink-2)' }}>Saldo Laba (3-2100)</b> pada penutupan.
            </div>
          </div>
        </Panel>
      </div>

      <Panel noBody>
        <div className="panel-h">
          <h3>Pemetaan ke Laporan Keuangan</h3><span className="sub">Caption WTB → baris LK · lead schedule</span>
          <div style={{ flex: 1 }} />
          <Btn sm variant="primary" onClick={() => nav('fsgen')}><I.report size={13} /> Buka FS Generator</Btn>
        </div>
        <table className="dtbl">
          <thead><tr>
            <th>Caption FS</th><th style={{ width: 130 }}>Laporan</th><th className="num" style={{ width: 70 }}>Akun</th>
            <th>Lead Schedule</th><th className="num" style={{ width: 130 }}>Saldo (Rp M)</th><th style={{ width: 220 }}>Bobot</th>
          </tr></thead>
          <tbody>
            {caps.map(c => {
              const denom = c.stmt === 'Neraca' ? (c.side === 'Aset' ? summary.totAset : summary.liabMag + summary.ekuMag) : (c.g === 'Pendapatan' ? summary.revMag : summary.beban);
              const w = denom ? (c.mag / denom) * 100 : 0;
              return (
                <tr key={c.g}>
                  <td style={{ fontWeight: 600 }}>{c.g}</td>
                  <td><Badge kind={c.stmt === 'Neraca' ? 'blue' : 'purple'}>{c.stmt}</Badge></td>
                  <td className="num muted">{c.n}</td>
                  <td><div className="row gap6 wrap">{c.leads.map(l => <span key={l} className="chip tiny" style={{ height: 18, padding: '0 6px', fontFamily: 'var(--mono)' }}>{l}</span>)}</div></td>
                  <td className="num" style={{ fontWeight: 600 }}>{M(c.mag)}</td>
                  <td>
                    <div className="row ac gap8">
                      <div className="pbar" style={{ flex: 1 }}><span style={{ width: w + '%', background: c.side === 'Aset' ? 'var(--blue)' : c.side === 'Liabilitas & Ekuitas' ? 'var(--teal)' : 'var(--purple)' }} /></div>
                      <span className="mono tiny muted" style={{ width: 38, textAlign: 'right' }}>{fmt(w, 0)}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="tiny muted" style={{ padding: '8px 12px' }}>Bobot dihitung terhadap total sisi laporan (Aset / Liabilitas+Ekuitas / Pendapatan / Beban). Saldo adjusted dalam miliar Rupiah.</div>
      </Panel>
    </>
  );
}

Object.assign(window, { WtbKpiBand, WtbAnalytical, WtbGrouping, TrendBars });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { DEFAULT_EXPL, TrendBars, WtbAnalytical, WtbGrouping, WtbKpiBand, computeWtbSummary };
