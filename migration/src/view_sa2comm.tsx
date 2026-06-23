/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { useAmsPersist, useAuth, useFirm } from './contexts';
import { amsExportPdf } from './export_pdf';
import { I } from './icons';
import { SubBar } from './shell';
import { Badge, Btn, Panel, Tabs } from './ui';
import { KvBox } from './view_analytical';
import { WpPanel } from './wp_signoff';

/* ============================================================
   Asseris — SA 250 / 260 / 265
   SA 250 · Hukum & Regulasi (NOCLAR)
   SA 260 · Komunikasi dengan Pihak Tata Kelola (TCWG)
   SA 265 · Defisiensi Pengendalian Internal
   ============================================================ */
const { useState: useStateSC, useMemo: useMemoSC } = React;

/* ============================================================
   SA 250 · HUKUM & REGULASI
   ============================================================ */
const NOCLAR_CATS = {
  direct: { k: 'Dampak Langsung pada LK', ref: '¶6(a)', color: 'red',
    sub: 'Ketentuan yang secara langsung menentukan jumlah & pengungkapan material dalam LK.',
    examples: ['Peraturan perpajakan (PPh, PPN)', 'Ketentuan dana pensiun & imbalan kerja', 'Regulasi pelaporan keuangan sektoral (OJK)'] },
  indirect: { k: 'Fundamental bagi Operasi', ref: '¶6(b)', color: 'amber',
    sub: 'Ketentuan lain yang kepatuhannya fundamental bagi kelangsungan operasi atau menghindari sanksi material.',
    examples: ['Izin usaha & lingkungan (AMDAL)', 'Ketenagakerjaan & K3', 'Anti-monopoli & perlindungan data', 'Anti-pencucian uang (APU/PPT)'] },
};

/* ---- model NOCLAR ter-persist engagement-scoped (Fase 2/3) ---- */
type NoclarItem = { id: string; area: string; cat: 'direct' | 'indirect'; desc: string; fsImpact: string; status: string; sev: string; by?: string; at?: string };
type ReportTier = { id: string; to: string; cond: string; ref: string; status: string; by?: string; at?: string };
type NoclarState = { items: NoclarItem[]; report: ReportTier[] };
/* tipe struktural minimal untuk event input/select/textarea — hindari explicit-any (ratchet) */
type Ev = { target: { value: string } };

const NOCLAR_STATUS = ['Investigasi', 'Dievaluasi', 'Dipantau', 'Selesai'];
const NOCLAR_SEV = ['Tinggi', 'Sedang', 'Rendah'];
const REPORT_STATUS = ['Dilakukan', 'Berlangsung', 'Dijadwalkan', 'Tidak diperlukan', 'Tidak berlaku'];

const NOCLAR_ITEMS_SEED: NoclarItem[] = [
  { id: 'NC-01', area: 'Perpajakan', cat: 'direct', desc: 'Koreksi PPN masukan yang dikreditkan atas faktur tidak lengkap — potensi kurang bayar & sanksi.', fsImpact: 'Material — provisi pajak', status: 'Dievaluasi', sev: 'Tinggi' },
  { id: 'NC-02', area: 'Lingkungan', cat: 'indirect', desc: 'Perpanjangan izin pengolahan limbah (IPLC) cabang Bekasi terlambat 2 bulan.', fsImpact: 'Tidak material langsung; risiko sanksi/penghentian', status: 'Dipantau', sev: 'Sedang' },
  { id: 'NC-03', area: 'Ketenagakerjaan', cat: 'indirect', desc: 'Tunggakan iuran BPJS Ketenagakerjaan 1 bulan — telah dilunasi pasca-periode.', fsImpact: 'Tidak material', status: 'Selesai', sev: 'Rendah' },
  { id: 'NC-04', area: 'Perizinan', cat: 'indirect', desc: 'Indikasi transaksi tanpa kontrak baku pada 1 segmen — dugaan, perlu klarifikasi hukum.', fsImpact: 'Dalam evaluasi', status: 'Investigasi', sev: 'Sedang' },
];

const NOCLAR_REPORT_SEED: ReportTier[] = [
  { id: 'RT-mgmt', to: 'Manajemen', cond: 'Ketidakpatuhan selain yang jelas tidak signifikan', ref: '¶22', status: 'Dilakukan' },
  { id: 'RT-tcwg', to: 'Pihak Tata Kelola (TCWG)', cond: 'Bila melibatkan manajemen, atau disengaja & material', ref: '¶23', status: 'Dijadwalkan' },
  { id: 'RT-auth', to: 'Otoritas / Regulator', cond: 'Bila diwajibkan hukum (dapat mengalahkan kerahasiaan)', ref: '¶28–29', status: 'Tidak berlaku' },
  { id: 'RT-rep', to: 'Laporan Auditor', cond: 'Bila ketidakpatuhan berdampak material & tidak tercermin memadai', ref: '¶26', status: 'Tidak diperlukan' },
];

const NOCLAR_SEED = { items: NOCLAR_ITEMS_SEED, report: NOCLAR_REPORT_SEED };

function nocToday() {
  try { return new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch (e) { return ''; }
}
function nextNcId(items: NoclarItem[]) {
  const n = items.reduce((mx, it) => { const m = /NC-(\d+)/.exec(it.id || ''); return m ? Math.max(mx, +m[1]) : mx; }, 0);
  return 'NC-' + String(n + 1).padStart(2, '0');
}

function SA250View() {
  const firm = useFirm();
  const auth = useAuth();
  const me = (auth && auth.user && auth.user.name) || 'Auditor';
  const client = firm?.activeClient?.name || 'PT Sentosa Makmur Tbk';
  const engId = firm?.activeEngagement?.id || 'default';
  const engLabel = firm?.activeEngagement?.id || 'ENG-2025-014';
  const locked = !!(firm && firm.locked);
  const [data, setData] = useAmsPersist('noclar.' + engId, () => NOCLAR_SEED);
  const items: NoclarItem[] = (data && data.items) || [];
  const report: ReportTier[] = (data && data.report) || [];
  const setItems = (fn: (l: NoclarItem[]) => NoclarItem[]) => setData((d: NoclarState) => ({ ...d, items: fn((d && d.items) || []) }));
  const setReport = (fn: (l: ReportTier[]) => ReportTier[]) => setData((d: NoclarState) => ({ ...d, report: fn((d && d.report) || []) }));

  const followUp = items.filter(r => r.status === 'Investigasi' || r.status === 'Dievaluasi').length;
  const directMaterial = items.filter(r => r.cat === 'direct' && /^material/i.test(r.fsImpact || '')).length;

  const [tab, setTab] = useStateSC('kerangka');
  const tabs = [{ id: 'kerangka', label: 'Kerangka & Kategori' }, { id: 'register', label: 'Register Ketidakpatuhan' }, { id: 'pelaporan', label: 'Respons & Pelaporan' }];

  const exportMemo = () => {
    const sevRank: Record<string, number> = { Tinggi: 0, Sedang: 1, Rendah: 2 };
    const rows = [...items].sort((a, b) => (sevRank[a.sev] ?? 9) - (sevRank[b.sev] ?? 9))
      .map(r => [r.id, r.area, r.cat === 'direct' ? 'Langsung' : 'Operasi', r.sev, r.status, r.desc]);
    const repRows = report.map(r => [r.to, r.ref, r.status, r.by ? r.by + ' · ' + (r.at || '') : '—']);
    amsExportPdf({
      kind: 'memo-noclar', scope: 'engagement', scopeId: engId,
      firm: (AMS.FIRM && (AMS.FIRM as { name?: string }).name) || 'KAP', title: 'Memo Pertimbangan Hukum & Regulasi (NOCLAR — SA 250)',
      refNo: 'L-250 · ' + engLabel,
      meta: [client + ' · ' + engLabel, 'SA 250 — Pertimbangan atas Peraturan Perundang-undangan dalam Audit', 'Dibuat: ' + nocToday() + ' · ' + me],
      blocks: [
        { type: 'heading', text: 'Register Ketidakpatuhan Teridentifikasi' },
        { type: 'table', head: ['Ref', 'Area', 'Kategori', 'Severitas', 'Status', 'Uraian'],
          body: rows.length ? rows : [['—', '—', '—', '—', '—', 'Tidak ada ketidakpatuhan tercatat.']],
          columnStyles: { 0: { cellWidth: 38 }, 5: { cellWidth: 170 } } },
        { type: 'heading', text: 'Jenjang Pelaporan (SA 250 ¶22–29)' },
        { type: 'table', head: ['Penerima', 'Ref', 'Status', 'Jejak'], body: repRows },
        { type: 'para', text: 'Tanggung jawab mencegah & mendeteksi ketidakpatuhan ada pada manajemen & pihak tata kelola. Auditor memperoleh bukti audit cukup & tepat atas kepatuhan terhadap ketentuan yang berdampak langsung & material pada LK, serta melaksanakan prosedur terbatas atas ketentuan lain (SA 250 ¶13–14).' },
      ],
    }).catch(() => {});
  };

  return (
    <>
      <SubBar moduleId="sa250" right={<div className="row gap8 ac"><Badge kind="amber" dot>{followUp} dalam tindak lanjut</Badge><Btn sm onClick={exportMemo}><I.download size={13} /> Memo NOCLAR</Btn></div>} />
      <div className="view-scroll"><div className="view-pad">
        <Panel noBody style={{ marginBottom: 12 }}>
          <div style={{ padding: '13px 16px', display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ minWidth: 210 }}><div className="tiny muted upper" style={{ marginBottom: 3 }}>Standar Audit 250</div><div style={{ fontWeight: 700, fontSize: 13 }}>Hukum & Regulasi (NOCLAR)</div><div className="tiny muted">{client} · {engLabel}</div></div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Ketidakpatuhan</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5 }}>{items.length} teridentifikasi</div></div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Dampak Langsung LK</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5, color: directMaterial ? 'var(--red)' : 'var(--ink-3)' }}>{directMaterial} material</div></div>
            <div style={{ flex: 1 }} />
            <div style={{ textAlign: 'right' }}><div className="tiny muted upper" style={{ marginBottom: 3 }}>Tanggung Jawab Utama</div><Badge kind="blue">Kepatuhan = Manajemen</Badge></div>
          </div>
        </Panel>
        <div style={{ marginBottom: 12 }}><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>
        {tab === 'kerangka' && <S250Framework />}
        {tab === 'register' && <S250Register items={items} setItems={setItems} me={me} locked={locked} />}
        {tab === 'pelaporan' && <S250Reporting report={report} setReport={setReport} me={me} locked={locked} />}
      </div></div>
    </>
  );
}

function S250Framework() {
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }}>
      {Object.entries(NOCLAR_CATS).map(([key, c]) => (
        <Panel key={key} noBody>
          <div style={{ background: `var(--${c.color}-bg)`, padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
            <div className="row jb ac"><span className="mono tiny" style={{ fontWeight: 700, color: `var(--${c.color})` }}>SA 250 {c.ref}</span><Badge kind={c.color === 'red' ? 'red' : 'amber'}>{c.color === 'red' ? 'Respons lebih dalam' : 'Prosedur terbatas'}</Badge></div>
            <div style={{ fontWeight: 700, fontSize: 14, marginTop: 6 }}>{c.k}</div>
            <div className="tiny" style={{ color: 'var(--ink-2)', marginTop: 3, lineHeight: 1.45 }}>{c.sub}</div>
          </div>
          <div style={{ padding: 14 }}>
            <div className="tiny muted upper" style={{ marginBottom: 8 }}>Contoh Ketentuan</div>
            {c.examples.map((e, i) => (
              <div key={i} className="row gap8" style={{ fontSize: 12, alignItems: 'flex-start', padding: '7px 0', borderBottom: i < c.examples.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
                <span style={{ color: `var(--${c.color})`, flex: '0 0 auto', marginTop: 1 }}><I.gavel size={13} /></span><span style={{ lineHeight: 1.4 }}>{e}</span>
              </div>
            ))}
            <div className="panel" style={{ marginTop: 12, padding: '10px 12px', background: 'var(--surface-2)', borderColor: 'transparent' }}>
              <div className="tiny muted upper" style={{ marginBottom: 4 }}>Prosedur Auditor</div>
              <div className="tiny" style={{ lineHeight: 1.5 }}>{key === 'direct'
                ? 'Memperoleh bukti audit cukup & tepat atas kepatuhan terhadap ketentuan yang berdampak langsung & material pada penentuan jumlah/pengungkapan LK (¶13).'
                : 'Melaksanakan prosedur terbatas: inquiry manajemen & inspeksi korespondensi dengan otoritas/regulator untuk membantu mengidentifikasi ketidakpatuhan (¶14).'}</div>
            </div>
          </div>
        </Panel>
      ))}
      <Panel className="span2" noBody style={{ gridColumn: '1 / -1' }}>
        <div className="panel-h"><h3>Prosedur Pemahaman Awal</h3><div style={{ flex: 1 }} /><Badge kind="green">4 dari 4 selesai</Badge></div>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 0 }}>
          {[
            { t: 'Pemahaman kerangka hukum & industri', ref: '¶12' },
            { t: 'Inquiry kepatuhan ke manajemen', ref: '¶12' },
            { t: 'Inspeksi korespondensi regulator', ref: '¶14' },
            { t: 'Representasi tertulis ketidakpatuhan', ref: '¶16' },
          ].map((p, i) => (
            <div key={i} style={{ padding: '14px', borderRight: i < 3 ? '1px solid var(--line-soft)' : 0 }}>
              <span style={{ color: 'var(--green)' }}><I.checkCircle size={18} /></span>
              <div style={{ fontWeight: 600, fontSize: 12, margin: '6px 0 3px', lineHeight: 1.35 }}>{p.t}</div>
              <span className="mono tiny" style={{ color: 'var(--blue)', fontWeight: 700 }}>{p.ref}</span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function S250Register({ items, setItems, me, locked }: { items: NoclarItem[]; setItems: (fn: (l: NoclarItem[]) => NoclarItem[]) => void; me: string; locked: boolean }) {
  const list: NoclarItem[] = items || [];
  const [selId, setSelId] = useStateSC(list[0]?.id || null);
  const sel = list.find((r: NoclarItem) => r.id === selId) || list[0] || null;
  const sevKind = (s: string) => s === 'Tinggi' ? 'red' : s === 'Sedang' ? 'amber' : 'gray';
  const stKind = (s: string) => s === 'Selesai' ? 'green' : s === 'Investigasi' ? 'red' : 'amber';

  const patch = (id: string, p: Partial<NoclarItem>) =>
    setItems((l: NoclarItem[]) => l.map(it => it.id === id ? { ...it, ...p, by: me, at: nocToday() } : it));
  const addItem = () => {
    const id = nextNcId(list);
    setItems((l: NoclarItem[]) => [{ id, area: 'Ketidakpatuhan baru', cat: 'indirect', desc: '', fsImpact: 'Dalam evaluasi', status: 'Investigasi', sev: 'Sedang', by: me, at: nocToday() } as NoclarItem, ...l]);
    setSelId(id);
  };
  const delItem = (id: string) => { setItems((l: NoclarItem[]) => l.filter(it => it.id !== id)); setSelId(null); };

  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 360px', gap: 12, alignItems: 'start' }}>
      <Panel noBody>
        <div className="panel-h"><h3>Register Ketidakpatuhan</h3><div style={{ flex: 1 }} />
          <span className="tiny muted" style={{ marginRight: 8 }}>{list.length} pos</span>
          {!locked && <Btn sm onClick={addItem}><I.plus size={12} /> Tambah</Btn>}
        </div>
        <table className="dtbl">
          <thead><tr><th style={{ width: 56 }}>Ref</th><th>Area / Uraian</th><th style={{ width: 92 }}>Kategori</th><th style={{ width: 84 }}>Status</th></tr></thead>
          <tbody>
            {list.map((r: NoclarItem) => (
              <tr key={r.id} className={r.id === (sel && sel.id) ? 'sel' : ''} onClick={() => setSelId(r.id)} style={{ cursor: 'pointer' }}>
                <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{r.id}</td>
                <td style={{ fontWeight: 600, whiteSpace: 'normal', lineHeight: 1.35 }}>{r.area}<div className="tiny muted" style={{ fontWeight: 400, marginTop: 1 }}>{r.desc}</div></td>
                <td><Badge kind={r.cat === 'direct' ? 'red' : 'amber'}>{r.cat === 'direct' ? 'Langsung' : 'Operasi'}</Badge></td>
                <td><Badge kind={stKind(r.status)}>{r.status}</Badge></td>
              </tr>
            ))}
            {!list.length && <tr><td colSpan={4} className="tiny muted" style={{ textAlign: 'center', padding: 18 }}>Belum ada ketidakpatuhan tercatat. {!locked && 'Klik "Tambah" untuk mulai.'}</td></tr>}
          </tbody>
        </table>
      </Panel>
      {sel && (
        <Panel noBody>
          <div style={{ background: 'var(--surface-2)', padding: '11px 14px', borderBottom: '1px solid var(--line)' }}>
            <div className="row ac jb">
              <div className="row ac gap8"><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{sel.id}</span><Badge kind={sevKind(sel.sev)}>{sel.sev}</Badge><Badge kind={sel.cat === 'direct' ? 'red' : 'amber'}>{sel.cat === 'direct' ? 'Dampak Langsung' : 'Fundamental Operasi'}</Badge></div>
              {!locked && <button className="btn sm icon" title="Hapus pos" onClick={() => delItem(sel.id)}><I.x size={13} /></button>}
            </div>
          </div>
          <div style={{ padding: 14 }}>
            {locked ? (
              <>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>{sel.area}</div>
                <p style={{ margin: '0 0 12px', fontSize: 12, lineHeight: 1.5 }}>{sel.desc}</p>
                <KvBox label="Dampak terhadap LK" v={sel.fsImpact} accent={/^material/i.test(sel.fsImpact || '') ? 'var(--red)' : 'var(--ink-3)'} />
              </>
            ) : (
              <div style={{ display: 'grid', gap: 9 }}>
                <div className="field"><label>Area</label><input className="input" value={sel.area} onChange={(e: Ev) => patch(sel.id, { area: e.target.value })} /></div>
                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 9 }}>
                  <div className="field"><label>Kategori</label><select className="select" value={sel.cat} onChange={(e: Ev) => patch(sel.id, { cat: e.target.value as NoclarItem['cat'] })}><option value="direct">Dampak Langsung (¶6a)</option><option value="indirect">Fundamental Operasi (¶6b)</option></select></div>
                  <div className="field"><label>Severitas</label><select className="select" value={sel.sev} onChange={(e: Ev) => patch(sel.id, { sev: e.target.value })}>{NOCLAR_SEV.map(s => <option key={s}>{s}</option>)}</select></div>
                </div>
                <div className="field"><label>Uraian</label><textarea className="input" value={sel.desc} onChange={(e: Ev) => patch(sel.id, { desc: e.target.value })} style={{ height: 58, padding: 8, lineHeight: 1.5, resize: 'vertical' }} placeholder="Uraian ketidakpatuhan & dasar identifikasi…" /></div>
                <div className="field"><label>Dampak terhadap LK</label><input className="input" value={sel.fsImpact} onChange={(e: Ev) => patch(sel.id, { fsImpact: e.target.value })} placeholder="mis. Material — provisi pajak" /></div>
                <div className="field"><label>Status</label><select className="select" value={sel.status} onChange={(e: Ev) => patch(sel.id, { status: e.target.value })}>{NOCLAR_STATUS.map(s => <option key={s}>{s}</option>)}</select></div>
              </div>
            )}
            <div style={{ height: 12 }} />
            <div className="tiny muted upper" style={{ marginBottom: 5 }}>Respons Audit</div>
            {[
              'Evaluasi dampak terhadap jumlah & pengungkapan LK',
              'Diskusi dengan manajemen & (bila perlu) penasihat hukum',
              sel.cat === 'direct' ? 'Uji kecukupan provisi/pengungkapan terkait' : 'Pertimbangkan dampak terhadap risiko kelangsungan & opini',
            ].map((t, i) => (
              <div key={i} className="row gap8" style={{ fontSize: 11.5, alignItems: 'flex-start', padding: '5px 0' }}>
                <span style={{ color: 'var(--blue)', flex: '0 0 auto', marginTop: 1 }}><I.arrowRight size={13} /></span><span style={{ lineHeight: 1.4 }}>{t}</span>
              </div>
            ))}
            {sel.by && <div className="tiny muted" style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--line-soft)' }}><I.check size={11} /> Diperbarui {sel.by} · {sel.at}</div>}
          </div>
        </Panel>
      )}
    </div>
  );
}

function S250Reporting({ report, setReport, me, locked }: { report: ReportTier[]; setReport: (fn: (l: ReportTier[]) => ReportTier[]) => void; me: string; locked: boolean }) {
  const tiers: ReportTier[] = report || [];
  const repKind = (s: string) => s === 'Dilakukan' ? 'green' : s === 'Berlangsung' ? 'blue' : s === 'Dijadwalkan' ? 'amber' : 'gray';
  const setStatus = (id: string, status: string) =>
    setReport((l: ReportTier[]) => l.map(r => r.id === id ? { ...r, status, by: me, at: nocToday() } : r));
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 340px', gap: 12, alignItems: 'start' }}>
      <Panel noBody>
        <div className="panel-h"><h3>Jenjang Pelaporan Ketidakpatuhan</h3><div style={{ flex: 1 }} /><span className="tiny muted">SA 250 ¶22–29</span></div>
        <table className="dtbl">
          <thead><tr><th>Penerima</th><th>Kondisi</th><th style={{ width: 56 }}>Ref</th><th style={{ width: 150 }}>Status</th><th style={{ width: 120 }}>Jejak</th></tr></thead>
          <tbody>
            {tiers.map((r: ReportTier) => (
              <tr key={r.id}>
                <td style={{ fontWeight: 600 }}>{r.to}</td>
                <td className="tiny" style={{ whiteSpace: 'normal', lineHeight: 1.4 }}>{r.cond}</td>
                <td className="mono tiny" style={{ color: 'var(--blue)', fontWeight: 700 }}>{r.ref}</td>
                <td>
                  {locked
                    ? <Badge kind={repKind(r.status)}>{r.status}</Badge>
                    : <select className="select" value={r.status} onChange={(e: Ev) => setStatus(r.id, e.target.value)} style={{ height: 28, fontSize: 11.5 }}>{REPORT_STATUS.map(s => <option key={s}>{s}</option>)}</select>}
                </td>
                <td className="tiny muted">{r.by ? <span title={r.by + ' · ' + (r.at || '')}><I.check size={10} /> {r.at}</span> : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="panel" style={{ margin: 12, padding: '10px 12px', background: 'var(--blue-050)', borderColor: 'var(--blue-100)' }}>
          <div className="row gap8" style={{ alignItems: 'flex-start' }}><span style={{ color: 'var(--blue)', flex: '0 0 auto' }}><I.book size={15} /></span><span style={{ fontSize: 11.5, lineHeight: 1.45 }}>Tanggung jawab mencegah & mendeteksi ketidakpatuhan ada pada <b>manajemen & TCWG</b>. Auditor bukan penegak hukum; tujuannya memperoleh bukti & merespons ketidakpatuhan yang teridentifikasi. Kesimpulan auditor atas kecukupan respons dicatat via <b>Kertas Kerja</b> (bilah atas).</span></div>
        </div>
      </Panel>
      <div className="grid" style={{ gap: 12 }}>
        <Panel title="Pertimbangan Dampak terhadap Opini">
          <div style={{ display: 'grid', gap: 7 }}>
            {[
              'Ketidakpatuhan dengan dampak langsung tercermin memadai dalam LK (¶13)',
              'Kecukupan provisi/pengungkapan atas sanksi & kewajiban dievaluasi',
              'Seluruh item register berstatus terselesaikan/terpantau sebelum opini',
            ].map((t, i) => (
              <div key={i} className="row gap8" style={{ fontSize: 11.5, alignItems: 'flex-start' }}><span style={{ color: 'var(--blue)', flex: '0 0 auto', marginTop: 1 }}><I.arrowRight size={14} /></span><span style={{ lineHeight: 1.4 }}>{t}</span></div>
            ))}
          </div>
        </Panel>
        <Panel title="Dokumentasi (¶29–30)">
          <div style={{ display: 'grid', gap: 6 }}>
            {[['Ketidakpatuhan teridentifikasi', 'L-250.1'], ['Diskusi & hasil dengan manajemen', 'L-250.2'], ['Representasi tertulis', 'L-250.3']].map((r, i) => (
              <div key={i} className="row jb ac" style={{ fontSize: 12, padding: '7px 9px', border: '1px solid var(--line-soft)', borderRadius: 6 }}><span className="row ac gap8"><span style={{ color: 'var(--blue)' }}><I.doc size={14} /></span>{r[0]}</span><span className="mono tiny" style={{ color: 'var(--blue)', fontWeight: 700 }}>{r[1]}</span></div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ============================================================
   SA 260 · KOMUNIKASI DENGAN TCWG
   ============================================================ */
/* ---- model SA 260/265 ter-persist engagement-scoped (Fase 2/3) ---- */
type TcwgMatrixRow = { id: string; item: string; ref: string; form: string; when: string; status: string; via: string; by?: string; at?: string };
type TcwgFinding = { id: string; t: string; area: string; sev: string; link: string; by?: string; at?: string };
type TcwgState = { matrix: TcwgMatrixRow[]; findings: TcwgFinding[] };
type Deficiency = { id: string; t: string; cause: string; impact: string; sig: boolean; status: string; by?: string; at?: string };

const TCWG_MATRIX_STATUS = ['Selesai', 'Berlangsung', 'Dijadwalkan', 'Tidak ada'];
const FINDING_SEV = ['Tinggi', 'Sedang', 'Rendah'];
const DEFIC_COMM = ['Tertulis ke TCWG', 'Lisan ke manajemen'];

const TCWG_MATRIX_SEED: TcwgMatrixRow[] = [
  { id: 'M1', item: 'Tanggung jawab auditor terkait audit LK', ref: '¶14', form: 'Tertulis', when: 'Perencanaan', status: 'Selesai', via: 'Surat Perikatan' },
  { id: 'M2', item: 'Lingkup & saat audit yang direncanakan', ref: '¶15', form: 'Lisan', when: 'Perencanaan', status: 'Selesai', via: 'Rapat pembukaan' },
  { id: 'M3', item: 'Temuan signifikan dari audit', ref: '¶16', form: 'Tertulis', when: 'Penyelesaian', status: 'Berlangsung', via: 'Laporan kepada TCWG' },
  { id: 'M4', item: 'Pandangan auditor atas kualitas praktik akuntansi', ref: '¶16(a)', form: 'Tertulis', when: 'Penyelesaian', status: 'Berlangsung', via: 'Laporan kepada TCWG' },
  { id: 'M5', item: 'Pernyataan independensi (entitas terdaftar)', ref: '¶17', form: 'Tertulis', when: 'Penyelesaian', status: 'Dijadwalkan', via: 'Surat independensi' },
  { id: 'M6', item: 'Kesulitan signifikan selama audit', ref: '¶16(b)', form: 'Tertulis', when: 'Penyelesaian', status: 'Tidak ada', via: '—' },
];

const TCWG_FINDINGS_SEED: TcwgFinding[] = [
  { id: 'TF-01', t: 'Estimasi CKPN — telaah retrospektif menunjukkan understatement berulang', area: 'Estimasi', sev: 'Tinggi', link: 'SA 240 / 540' },
  { id: 'TF-02', t: 'Defisiensi signifikan pengendalian penutupan & jurnal manual', area: 'Pengendalian', sev: 'Tinggi', link: 'SA 265' },
  { id: 'TF-03', t: 'Konsentrasi pendapatan akhir periode & uji cut-off', area: 'Pendapatan', sev: 'Sedang', link: 'SA 240' },
  { id: 'TF-04', t: 'Keterlambatan perpanjangan izin lingkungan (IPLC)', area: 'Kepatuhan', sev: 'Sedang', link: 'SA 250' },
];

const TCWG_SEED: TcwgState = { matrix: TCWG_MATRIX_SEED, findings: TCWG_FINDINGS_SEED };

function nextTfId(list: TcwgFinding[]) {
  const n = list.reduce((mx, f) => { const m = /TF-(\d+)/.exec(f.id || ''); return m ? Math.max(mx, +m[1]) : mx; }, 0);
  return 'TF-' + String(n + 1).padStart(2, '0');
}
function nextDId(list: Deficiency[]) {
  const n = list.reduce((mx, d) => { const m = /D-(\d+)/.exec(d.id || ''); return m ? Math.max(mx, +m[1]) : mx; }, 0);
  return 'D-' + String(n + 1).padStart(2, '0');
}

function SA260View() {
  const firm = useFirm();
  const auth = useAuth();
  const me = (auth && auth.user && auth.user.name) || 'Auditor';
  const client = firm?.activeClient?.name || 'PT Sentosa Makmur Tbk';
  const engId = firm?.activeEngagement?.id || 'default';
  const engLabel = firm?.activeEngagement?.id || 'ENG-2025-014';
  const locked = !!(firm && firm.locked);
  const [data, setData] = useAmsPersist('tcwg.' + engId, () => TCWG_SEED);
  const matrix: TcwgMatrixRow[] = (data && data.matrix) || [];
  const findings: TcwgFinding[] = (data && data.findings) || [];
  const setMatrix = (fn: (l: TcwgMatrixRow[]) => TcwgMatrixRow[]) => setData((d: TcwgState) => ({ ...d, matrix: fn((d && d.matrix) || []) }));
  const setFindings = (fn: (l: TcwgFinding[]) => TcwgFinding[]) => setData((d: TcwgState) => ({ ...d, findings: fn((d && d.findings) || []) }));
  const done = matrix.filter(m => m.status === 'Selesai').length;

  const [tab, setTab] = useStateSC('pihak');
  const tabs = [{ id: 'pihak', label: 'Pihak & Bentuk' }, { id: 'matriks', label: 'Matriks Komunikasi' }, { id: 'temuan', label: 'Temuan Signifikan' }];

  const exportReport = () => {
    const sevRank: Record<string, number> = { Tinggi: 0, Sedang: 1, Rendah: 2 };
    const mRows = matrix.map(m => [m.id, m.item, m.ref, m.form, m.status]);
    const fRows = [...findings].sort((a, b) => (sevRank[a.sev] ?? 9) - (sevRank[b.sev] ?? 9)).map(f => [f.sev, f.area, f.t, f.link]);
    amsExportPdf({
      kind: 'memo-tcwg', scope: 'engagement', scopeId: engId,
      firm: (AMS.FIRM as { name?: string }).name || 'KAP', title: 'Laporan kepada Pihak yang Bertanggung Jawab atas Tata Kelola (SA 260)',
      refNo: 'L-260 · ' + engLabel,
      meta: [client + ' · ' + engLabel, 'SA 260 — Komunikasi dengan TCWG', 'Dibuat: ' + nocToday() + ' · ' + me],
      blocks: [
        { type: 'heading', text: 'Matriks Hal yang Dikomunikasikan (¶14–17)' },
        { type: 'table', head: ['Ref', 'Hal', 'SA', 'Bentuk', 'Status'], body: mRows.length ? mRows : [['—', '—', '—', '—', '—']], columnStyles: { 1: { cellWidth: 200 } } },
        { type: 'heading', text: 'Temuan Signifikan dari Audit (¶16)' },
        { type: 'table', head: ['Severitas', 'Area', 'Temuan', 'Kaitan'], body: fRows.length ? fRows : [['—', '—', 'Tidak ada temuan tercatat.', '—']], columnStyles: { 2: { cellWidth: 220 } } },
      ],
    }).catch(() => {});
  };

  return (
    <>
      <SubBar moduleId="sa260" right={<div className="row gap8 ac"><Badge kind="blue">{done}/{matrix.length} terkomunikasikan</Badge><Btn sm onClick={exportReport}><I.download size={13} /> Laporan ke TCWG</Btn></div>} />
      <div className="view-scroll"><div className="view-pad">
        <Panel noBody style={{ marginBottom: 12 }}>
          <div style={{ padding: '13px 16px', display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ minWidth: 210 }}><div className="tiny muted upper" style={{ marginBottom: 3 }}>Standar Audit 260</div><div style={{ fontWeight: 700, fontSize: 13 }}>Komunikasi dengan TCWG</div><div className="tiny muted">{client} · {engLabel}</div></div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Pihak Tata Kelola</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5 }}>Komite Audit (3 anggota)</div></div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Temuan Signifikan</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--amber)' }}>{findings.length} hal</div></div>
            <div style={{ flex: 1 }} />
            <div style={{ textAlign: 'right' }}><div className="tiny muted upper" style={{ marginBottom: 3 }}>Komunikasi</div><Badge kind="blue" dot>Dua Arah</Badge></div>
          </div>
        </Panel>
        <div style={{ marginBottom: 12 }}><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>
        {tab === 'pihak' && <S260Parties />}
        {tab === 'matriks' && <S260Matrix done={done} matrix={matrix} setMatrix={setMatrix} me={me} locked={locked} />}
        {tab === 'temuan' && <S260Findings findings={findings} setFindings={setFindings} me={me} locked={locked} />}
      </div></div>
    </>
  );
}

function S260Parties() {
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }}>
      <Panel noBody>
        <div className="panel-h"><h3>Identifikasi Pihak Tata Kelola (¶11–13)</h3><div style={{ flex: 1 }} /></div>
        <div style={{ padding: 14 }}>
          <p style={{ margin: '0 0 12px', fontSize: 12, lineHeight: 1.55, color: 'var(--ink-2)' }}>Auditor menentukan pihak yang tepat dalam struktur tata kelola entitas untuk berkomunikasi. Bila komunikasi dilakukan dengan subkelompok (mis. Komite Audit), auditor mempertimbangkan apakah perlu juga berkomunikasi dengan badan tata kelola secara keseluruhan.</p>
          {[
            { who: 'Komite Audit', role: 'Penerima utama komunikasi audit', note: '3 anggota · 2 independen', primary: true },
            { who: 'Dewan Komisaris', role: 'Pengawasan; menerima ikhtisar bila relevan', note: 'Diberi tembusan laporan' },
            { who: 'Direksi (Manajemen)', role: 'Bukan TCWG bila juga dikelola pihak lain', note: 'Komunikasi terpisah' },
          ].map((p, i) => (
            <div key={i} className="row gap10" style={{ padding: '10px 0', alignItems: 'flex-start', borderBottom: i < 2 ? '1px solid var(--line-soft)' : 0 }}>
              <span style={{ flex: '0 0 30px', width: 30, height: 30, borderRadius: 8, display: 'grid', placeItems: 'center', background: p.primary ? 'var(--blue-050)' : 'var(--surface-2)', color: p.primary ? 'var(--blue)' : 'var(--ink-3)' }}><I.group size={16} /></span>
              <div style={{ flex: 1 }}>
                <div className="row jb ac"><div style={{ fontSize: 12.5, fontWeight: 700 }}>{p.who}</div>{p.primary && <Badge kind="blue">Utama</Badge>}</div>
                <div className="tiny muted" style={{ lineHeight: 1.4, marginTop: 2 }}>{p.role}</div>
                <div className="tiny" style={{ color: 'var(--ink-3)', marginTop: 2 }}>{p.note}</div>
              </div>
            </div>
          ))}
        </div>
      </Panel>
      <div className="grid" style={{ gap: 12 }}>
        <Panel title="Bentuk & Saat Komunikasi (¶18–21)">
          <div style={{ display: 'grid', gap: 9 }}>
            {[
              { t: 'Tertulis', d: 'Untuk temuan signifikan yang menurut pertimbangan auditor tidak memadai bila lisan.', k: 'blue' },
              { t: 'Lisan', d: 'Untuk hal yang tidak signifikan; didokumentasikan dalam kertas kerja.', k: 'gray' },
              { t: 'Tepat waktu', d: 'Memungkinkan TCWG mengambil tindakan yang sesuai.', k: 'green' },
            ].map((r, i) => (
              <div key={i} className="panel" style={{ padding: '10px 12px', boxShadow: 'none' }}>
                <div className="row jb ac"><span style={{ fontWeight: 700, fontSize: 12.5 }}>{r.t}</span><Badge kind={r.k}>{r.k === 'blue' ? 'Disyaratkan' : r.k === 'green' ? 'Prinsip' : 'Diizinkan'}</Badge></div>
                <div className="tiny muted" style={{ marginTop: 3, lineHeight: 1.45 }}>{r.d}</div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Kecukupan Komunikasi Dua Arah (¶22)">
          <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.55, color: 'var(--ink-2)' }}>Auditor mengevaluasi apakah komunikasi dua arah antara auditor & TCWG telah <b>memadai</b> untuk tujuan audit. Bila tidak, auditor mengevaluasi dampaknya terhadap penilaian risiko & kemampuan memperoleh bukti, serta mengambil tindakan yang sesuai.</p>
          <div className="panel" style={{ marginTop: 10, padding: '9px 11px', background: 'var(--green-bg)', borderColor: 'transparent' }}><div className="row ac gap8"><span style={{ color: 'var(--green)' }}><I.checkCircle size={15} /></span><span style={{ fontSize: 11.5, fontWeight: 600 }}>Komunikasi dua arah dinilai memadai periode ini.</span></div></div>
        </Panel>
      </div>
    </div>
  );
}

function S260Matrix({ done, matrix, setMatrix, me, locked }: { done: number; matrix: TcwgMatrixRow[]; setMatrix: (fn: (l: TcwgMatrixRow[]) => TcwgMatrixRow[]) => void; me: string; locked: boolean }) {
  const stKind = (s: string) => s === 'Selesai' ? 'green' : s === 'Berlangsung' ? 'blue' : s === 'Tidak ada' ? 'gray' : 'amber';
  const setStatus = (id: string, status: string) => setMatrix(l => l.map(m => m.id === id ? { ...m, status, by: me, at: nocToday() } : m));
  return (
    <Panel noBody>
      <div className="panel-h"><h3>Matriks Komunikasi TCWG (¶14–17)</h3><div style={{ flex: 1 }} /><Badge kind="green">{done} selesai</Badge></div>
      <table className="dtbl">
        <thead><tr><th style={{ width: 48 }}>Ref</th><th>Hal yang Dikomunikasikan</th><th style={{ width: 56 }}>SA</th><th style={{ width: 78 }}>Bentuk</th><th style={{ width: 96 }}>Saat</th><th style={{ width: 150 }}>Status</th><th style={{ width: 90 }}>Jejak</th></tr></thead>
        <tbody>
          {matrix.map(m => (
            <tr key={m.id}>
              <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{m.id}</td>
              <td style={{ fontWeight: 600, whiteSpace: 'normal', lineHeight: 1.35 }}>{m.item}<div className="tiny muted" style={{ fontWeight: 400 }}>{m.via}</div></td>
              <td className="mono tiny" style={{ color: 'var(--blue)', fontWeight: 700 }}>{m.ref}</td>
              <td>{m.form === 'Tertulis' ? <Badge kind="blue">Tertulis</Badge> : <span className="tiny muted">{m.form}</span>}</td>
              <td className="tiny">{m.when}</td>
              <td>{locked
                ? <Badge kind={stKind(m.status)}>{m.status}</Badge>
                : <select className="select" value={m.status} onChange={(e: Ev) => setStatus(m.id, e.target.value)} style={{ height: 28, fontSize: 11.5 }}>{TCWG_MATRIX_STATUS.map(s => <option key={s}>{s}</option>)}</select>}
              </td>
              <td className="tiny muted">{m.by ? <span title={m.by + ' · ' + (m.at || '')}><I.check size={10} /> {m.at}</span> : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="panel" style={{ margin: 12, padding: '10px 12px', background: 'var(--blue-050)', borderColor: 'var(--blue-100)' }}><div className="row gap8" style={{ alignItems: 'flex-start' }}><span style={{ color: 'var(--blue)', flex: '0 0 auto' }}><I.book size={15} /></span><span style={{ fontSize: 11.5, lineHeight: 1.45 }}>Defisiensi signifikan pengendalian internal dikomunikasikan tertulis sesuai <b>SA 265</b>; hal terkait kecurangan sesuai <b>SA 240</b>. Sign-off & kesimpulan auditor (SA 230) direkam via <b>Kertas Kerja</b> (bilah atas).</span></div></div>
    </Panel>
  );
}

function S260Findings({ findings, setFindings, me, locked }: { findings: TcwgFinding[]; setFindings: (fn: (l: TcwgFinding[]) => TcwgFinding[]) => void; me: string; locked: boolean }) {
  const sevKind = (s: string) => s === 'Tinggi' ? 'red' : s === 'Sedang' ? 'amber' : 'gray';
  const patch = (id: string, p: Partial<TcwgFinding>) => setFindings(l => l.map(f => f.id === id ? { ...f, ...p, by: me, at: nocToday() } : f));
  const addF = () => { const id = nextTfId(findings); setFindings(l => [...l, { id, t: '', area: '', sev: 'Sedang', link: '', by: me, at: nocToday() }]); };
  const delF = (id: string) => setFindings(l => l.filter(f => f.id !== id));
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 340px', gap: 12, alignItems: 'start' }}>
      <Panel noBody>
        <div className="panel-h"><h3>Temuan Signifikan dari Audit (¶16)</h3><div style={{ flex: 1 }} /><span className="tiny muted" style={{ marginRight: 8 }}>{findings.length} hal</span>{!locked && <Btn sm onClick={addF}><I.plus size={12} /> Tambah</Btn>}</div>
        <div style={{ padding: '4px 0' }}>
          {findings.map((f, i) => (
            <div key={f.id} className="row gap10" style={{ padding: '12px 14px', alignItems: 'flex-start', borderBottom: i < findings.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
              <span style={{ flex: '0 0 auto', marginTop: 3, color: `var(--${sevKind(f.sev)})` }}><I.flag size={16} /></span>
              {locked ? (
                <>
                  <div style={{ flex: 1 }}><div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.4 }}>{f.t}</div><div className="tiny muted" style={{ marginTop: 3 }}>Area: {f.area}</div></div>
                  <div className="row ac gap6" style={{ flex: '0 0 auto' }}><span className="chip tiny" style={{ height: 18 }}>{f.link}</span><Badge kind={sevKind(f.sev)}>{f.sev}</Badge></div>
                </>
              ) : (
                <div style={{ flex: 1, display: 'grid', gap: 6 }}>
                  <textarea className="input" value={f.t} onChange={(e: Ev) => patch(f.id, { t: e.target.value })} placeholder="Uraian temuan signifikan…" style={{ height: 42, padding: 7, lineHeight: 1.4, resize: 'vertical' }} />
                  <div className="row gap6 ac">
                    <input className="input" value={f.area} onChange={(e: Ev) => patch(f.id, { area: e.target.value })} placeholder="Area" style={{ height: 26, flex: 1 }} />
                    <input className="input" value={f.link} onChange={(e: Ev) => patch(f.id, { link: e.target.value })} placeholder="Kaitan (SA …)" style={{ height: 26, width: 110 }} />
                    <select className="select" value={f.sev} onChange={(e: Ev) => patch(f.id, { sev: e.target.value })} style={{ height: 26, width: 92, fontSize: 11.5 }}>{FINDING_SEV.map(s => <option key={s}>{s}</option>)}</select>
                    <button className="btn sm icon" title="Hapus" onClick={() => delF(f.id)}><I.x size={12} /></button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {!findings.length && <div className="tiny muted" style={{ textAlign: 'center', padding: 18 }}>Belum ada temuan signifikan tercatat.</div>}
        </div>
      </Panel>
      <div className="grid" style={{ gap: 12 }}>
        <Panel title="Cakupan Laporan kepada TCWG">
          <div style={{ display: 'grid', gap: 7 }}>
            {['Pandangan atas aspek kualitatif praktik akuntansi', 'Kesulitan signifikan (jika ada)', 'Salah saji tidak dikoreksi (SAD)', 'Defisiensi signifikan pengendalian (SA 265)', 'Hal lain yang signifikan & relevan'].map((t, i) => (
              <div key={i} className="row gap8" style={{ fontSize: 11.5, alignItems: 'flex-start' }}><span style={{ color: 'var(--blue)', flex: '0 0 auto', marginTop: 1 }}><I.arrowRight size={13} /></span><span style={{ lineHeight: 1.4 }}>{t}</span></div>
            ))}
          </div>
        </Panel>
        <WpPanel moduleId="sa260" title="Kertas Kerja — Sign-off, Bukti & Kesimpulan" />
      </div>
    </div>
  );
}

/* ============================================================
   SA 265 · DEFISIENSI PENGENDALIAN INTERNAL
   ============================================================ */
const DEFICIENCIES_SEED: Deficiency[] = [
  { id: 'D-01', t: 'Jurnal manual penutupan tanpa reviu & otorisasi independen', cause: 'Tidak ada kontrol reviu atas jurnal > ambang tertentu', impact: 'Risiko salah saji/override manajemen (lihat SA 240)', sig: true, status: 'Tertulis ke TCWG' },
  { id: 'D-02', t: 'Rekonsiliasi akun signifikan tidak direviu tepat waktu', cause: 'Beban kerja tim akuntansi saat tutup buku', impact: 'Salah saji dapat tidak terdeteksi pada periode berjalan', sig: true, status: 'Tertulis ke TCWG' },
  { id: 'D-03', t: 'Pemisahan tugas lemah pada master vendor & pembayaran', cause: 'Satu personel dapat membuat vendor & melepas pembayaran', impact: 'Risiko pembayaran fiktif', sig: true, status: 'Tertulis ke TCWG' },
  { id: 'D-04', t: 'Pengendalian akses aplikasi tidak direviu berkala', cause: 'Belum ada siklus user access review', impact: 'Hak akses berlebih tidak terdeteksi', sig: false, status: 'Lisan ke manajemen' },
  { id: 'D-05', t: 'Dokumentasi persetujuan pengeluaran kas kecil tidak lengkap', cause: 'Kebiasaan operasional', impact: 'Minor; nilai di bawah materialitas', sig: false, status: 'Lisan ke manajemen' },
];

const SIG_INDICATORS = [
  'Bukti adanya kecurangan oleh manajemen (terlepas dari materialitas)',
  'Tidak adanya proses penilaian risiko entitas',
  'Defisiensi yang sebelumnya dikomunikasikan namun belum diperbaiki',
  'Ketidakmampuan menyusun LK yang andal',
  'Penyajian kembali (restatement) LK untuk mencerminkan koreksi salah saji material',
];

function SA265View() {
  const firm = useFirm();
  const auth = useAuth();
  const me = (auth && auth.user && auth.user.name) || 'Auditor';
  const client = firm?.activeClient?.name || 'PT Sentosa Makmur Tbk';
  const engId = firm?.activeEngagement?.id || 'default';
  const engLabel = firm?.activeEngagement?.id || 'ENG-2025-014';
  const locked = !!(firm && firm.locked);
  const [defs, setDefs] = useAmsPersist('deficiencies.' + engId, () => DEFICIENCIES_SEED);
  const list: Deficiency[] = defs || [];
  const sig = list.filter(d => d.sig).length;

  const [tab, setTab] = useStateSC('register');
  const tabs = [{ id: 'register', label: 'Register & Klasifikasi' }, { id: 'indikator', label: 'Indikator Signifikan' }, { id: 'komunikasi', label: 'Komunikasi' }];

  const exportLetter = () => {
    const rows = list.filter(d => d.sig).map(d => [d.id, d.t, d.impact]);
    amsExportPdf({
      kind: 'memo-sa265', scope: 'engagement', scopeId: engId,
      firm: (AMS.FIRM as { name?: string }).name || 'KAP', title: 'Komunikasi Defisiensi Signifikan Pengendalian Internal (SA 265)',
      refNo: 'L-265 · ' + engLabel,
      meta: [client + ' · ' + engLabel, 'SA 265 — Komunikasi Defisiensi kepada TCWG', 'Dibuat: ' + nocToday() + ' · ' + me],
      blocks: [
        { type: 'para', text: 'Kepada Yth. Komite Audit / Pihak yang Bertanggung Jawab atas Tata Kelola. Sehubungan dengan audit atas laporan keuangan, kami menyampaikan defisiensi signifikan dalam pengendalian internal yang kami identifikasi. Komunikasi ini disusun semata untuk TCWG & manajemen; audit kami tidak dirancang untuk menyatakan opini atas efektivitas pengendalian internal.' },
        { type: 'heading', text: 'Defisiensi Signifikan yang Teridentifikasi (¶9)' },
        { type: 'table', head: ['Ref', 'Defisiensi', 'Dampak Potensial'], body: rows.length ? rows : [['—', 'Tidak ada defisiensi signifikan.', '—']], columnStyles: { 1: { cellWidth: 200 }, 2: { cellWidth: 180 } } },
      ],
    }).catch(() => {});
  };

  return (
    <>
      <SubBar moduleId="sa265" right={<div className="row gap8 ac"><Badge kind="red" dot>{sig} defisiensi signifikan</Badge><Btn sm onClick={exportLetter}><I.download size={13} /> Surat ke TCWG</Btn></div>} />
      <div className="view-scroll"><div className="view-pad">
        <Panel noBody style={{ marginBottom: 12 }}>
          <div style={{ padding: '13px 16px', display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ minWidth: 210 }}><div className="tiny muted upper" style={{ marginBottom: 3 }}>Standar Audit 265</div><div style={{ fontWeight: 700, fontSize: 13 }}>Defisiensi Pengendalian Internal</div><div className="tiny muted">{client} · {engLabel}</div></div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Teridentifikasi</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5 }}>{list.length} defisiensi</div></div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Signifikan</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--red)' }}>{sig} → tertulis TCWG</div></div>
            <div style={{ flex: 1 }} />
            <div style={{ textAlign: 'right' }}><div className="tiny muted upper" style={{ marginBottom: 3 }}>Komunikasi</div><Badge kind="red" dot>Tertulis Wajib (¶9)</Badge></div>
          </div>
        </Panel>
        <div style={{ marginBottom: 12 }}><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>
        {tab === 'register' && <S265Register defs={list} setDefs={setDefs} me={me} locked={locked} />}
        {tab === 'indikator' && <S265Indicators />}
        {tab === 'komunikasi' && <S265Comms sig={sig} defs={list} />}
      </div></div>
    </>
  );
}

function S265Register({ defs, setDefs, me, locked }: { defs: Deficiency[]; setDefs: (v: Deficiency[]) => void; me: string; locked: boolean }) {
  const list: Deficiency[] = defs || [];
  const [selId, setSelId] = useStateSC(list[0]?.id || null);
  const sel = list.find(d => d.id === selId) || list[0] || null;
  const patch = (id: string, p: Partial<Deficiency>) => setDefs(list.map(d => d.id === id ? { ...d, ...p, by: me, at: nocToday() } : d));
  const addD = () => {
    const id = nextDId(list);
    setDefs([...list, { id, t: 'Defisiensi baru', cause: '', impact: '', sig: false, status: 'Lisan ke manajemen', by: me, at: nocToday() }]);
    setSelId(id);
  };
  const delD = (id: string) => { setDefs(list.filter(d => d.id !== id)); setSelId(null); };
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 360px', gap: 12, alignItems: 'start' }}>
      <Panel noBody>
        <div className="panel-h"><h3>Register Defisiensi Pengendalian</h3><div style={{ flex: 1 }} /><span className="tiny muted" style={{ marginRight: 8 }}>{list.length} pos · {list.filter(d => d.sig).length} signifikan</span>{!locked && <Btn sm onClick={addD}><I.plus size={12} /> Tambah</Btn>}</div>
        <table className="dtbl">
          <thead><tr><th style={{ width: 48 }}>Ref</th><th>Defisiensi</th><th style={{ width: 96 }}>Klasifikasi</th><th style={{ width: 130 }}>Komunikasi</th></tr></thead>
          <tbody>
            {list.map(d => (
              <tr key={d.id} className={d.id === (sel && sel.id) ? 'sel' : ''} onClick={() => setSelId(d.id)} style={{ cursor: 'pointer' }}>
                <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{d.id}</td>
                <td style={{ fontWeight: 600, whiteSpace: 'normal', lineHeight: 1.35 }}>{d.t}</td>
                <td><Badge kind={d.sig ? 'red' : 'gray'}>{d.sig ? 'Signifikan' : 'Biasa'}</Badge></td>
                <td className="tiny muted">{d.status}</td>
              </tr>
            ))}
            {!list.length && <tr><td colSpan={4} className="tiny muted" style={{ textAlign: 'center', padding: 18 }}>Belum ada defisiensi tercatat.</td></tr>}
          </tbody>
        </table>
        <div className="panel" style={{ margin: 12, padding: '10px 12px', background: 'var(--surface-2)', borderColor: 'transparent' }}><div className="row gap8" style={{ alignItems: 'flex-start' }}><span style={{ color: 'var(--blue)', flex: '0 0 auto' }}><I.book size={15} /></span><span style={{ fontSize: 11.5, lineHeight: 1.45 }}>Defisiensi = kontrol dirancang/diterapkan/dioperasikan sehingga tidak mampu mencegah atau mendeteksi & mengoreksi salah saji tepat waktu (¶6a). <b>Signifikan</b> bila, atas pertimbangan auditor, cukup penting untuk diperhatikan TCWG (¶6b).</span></div></div>
      </Panel>
      {sel && (
        <Panel noBody>
          <div style={{ background: sel.sig ? 'var(--red-bg)' : 'var(--surface-2)', padding: '11px 14px', borderBottom: '1px solid var(--line)' }}>
            <div className="row ac jb">
              <div className="row ac gap8"><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{sel.id}</span><Badge kind={sel.sig ? 'red' : 'gray'}>{sel.sig ? 'Signifikan' : 'Biasa'}</Badge></div>
              {!locked && <button className="btn sm icon" title="Hapus" onClick={() => delD(sel.id)}><I.x size={13} /></button>}
            </div>
          </div>
          <div style={{ padding: 14 }}>
            {locked ? (
              <>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, lineHeight: 1.35 }}>{sel.t}</div>
                <div className="tiny muted upper" style={{ marginBottom: 4 }}>Penyebab</div>
                <p style={{ margin: '0 0 12px', fontSize: 12, lineHeight: 1.5 }}>{sel.cause}</p>
                <div className="tiny muted upper" style={{ marginBottom: 4 }}>Dampak Potensial</div>
                <p style={{ margin: '0 0 12px', fontSize: 12, lineHeight: 1.5 }}>{sel.impact}</p>
                <KvBox label="Bentuk Komunikasi" v={sel.status} accent={sel.sig ? 'var(--red)' : 'var(--ink-3)'} />
              </>
            ) : (
              <div style={{ display: 'grid', gap: 9 }}>
                <div className="field"><label>Defisiensi</label><textarea className="input" value={sel.t} onChange={(e: Ev) => patch(sel.id, { t: e.target.value })} style={{ height: 46, padding: 8, lineHeight: 1.4, resize: 'vertical' }} /></div>
                <div className="field"><label>Penyebab</label><textarea className="input" value={sel.cause} onChange={(e: Ev) => patch(sel.id, { cause: e.target.value })} style={{ height: 46, padding: 8, lineHeight: 1.4, resize: 'vertical' }} /></div>
                <div className="field"><label>Dampak Potensial</label><textarea className="input" value={sel.impact} onChange={(e: Ev) => patch(sel.id, { impact: e.target.value })} style={{ height: 46, padding: 8, lineHeight: 1.4, resize: 'vertical' }} /></div>
                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 9 }}>
                  <div className="field"><label>Klasifikasi</label><select className="select" value={sel.sig ? 'sig' : 'biasa'} onChange={(e: Ev) => patch(sel.id, { sig: e.target.value === 'sig', status: e.target.value === 'sig' ? 'Tertulis ke TCWG' : 'Lisan ke manajemen' })}><option value="sig">Signifikan</option><option value="biasa">Biasa</option></select></div>
                  <div className="field"><label>Komunikasi</label><select className="select" value={sel.status} onChange={(e: Ev) => patch(sel.id, { status: e.target.value })}>{DEFIC_COMM.map(s => <option key={s}>{s}</option>)}</select></div>
                </div>
              </div>
            )}
            {sel.sig && <div className="panel" style={{ marginTop: 12, padding: '9px 11px', background: 'var(--red-bg)', borderColor: 'transparent' }}><div className="row ac gap8"><span style={{ color: 'var(--red)' }}><I.alert size={15} /></span><span style={{ fontSize: 11.5, lineHeight: 1.4 }}>Defisiensi signifikan — wajib dikomunikasikan <b>tertulis</b> kepada TCWG (¶9).</span></div></div>}
            {sel.by && <div className="tiny muted" style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--line-soft)' }}><I.check size={11} /> Diperbarui {sel.by} · {sel.at}</div>}
          </div>
        </Panel>
      )}
    </div>
  );
}

function S265Indicators() {
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 340px', gap: 12, alignItems: 'start' }}>
      <Panel noBody>
        <div className="panel-h"><h3>Indikator Defisiensi Signifikan (¶A7)</h3><div style={{ flex: 1 }} /><Badge kind="amber">Pertimbangan auditor</Badge></div>
        <div style={{ padding: '6px 14px 14px' }}>
          <p className="tiny muted" style={{ margin: '4px 0 10px', lineHeight: 1.5 }}>Signifikansi bergantung pada potensi salah saji & kemungkinan terjadinya, bukan apakah salah saji benar-benar terjadi. Indikator yang mengarah ke "signifikan":</p>
          {SIG_INDICATORS.map((t, i) => (
            <div key={i} className="row gap10" style={{ padding: '10px 0', alignItems: 'flex-start', borderBottom: i < SIG_INDICATORS.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
              <span style={{ flex: '0 0 22px', width: 22, height: 22, borderRadius: 6, display: 'grid', placeItems: 'center', background: 'var(--red-bg)', color: 'var(--red)', fontWeight: 700, fontSize: 11 }} className="mono">{i + 1}</span>
              <span style={{ fontSize: 12.5, lineHeight: 1.45 }}>{t}</span>
            </div>
          ))}
        </div>
      </Panel>
      <div className="grid" style={{ gap: 12 }}>
        <Panel title="Pohon Klasifikasi">
          <div style={{ display: 'grid', gap: 8 }}>
            {[
              { q: 'Apakah terdapat defisiensi pengendalian?', a: 'Ya — 5 teridentifikasi', k: 'amber' },
              { q: 'Cukup penting untuk perhatian TCWG?', a: '3 ya → signifikan', k: 'red' },
              { q: 'Sisanya?', a: '2 → komunikasi ke manajemen', k: 'gray' },
            ].map((r, i) => (
              <div key={i} className="panel" style={{ padding: '10px 12px', boxShadow: 'none' }}>
                <div className="tiny muted" style={{ lineHeight: 1.4 }}>{r.q}</div>
                <div className="row ac gap6" style={{ marginTop: 4 }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: `var(--${r.k})` }} /><span style={{ fontSize: 12, fontWeight: 700 }}>{r.a}</span></div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Kaitan dengan SA Lain">
          <div style={{ display: 'grid', gap: 6 }}>
            {[['SA 315', 'Pemahaman pengendalian internal'], ['SA 240', 'Defisiensi terkait anti-fraud'], ['SA 260', 'Disampaikan dalam laporan TCWG'], ['Management Letter', 'Defisiensi biasa ke manajemen']].map((r, i) => (
              <div key={i} className="row jb ac" style={{ fontSize: 12, padding: '7px 9px', border: '1px solid var(--line-soft)', borderRadius: 6 }}><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{r[0]}</span><span className="tiny muted">{r[1]}</span></div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function S265Comms({ sig, defs }: { sig: number; defs: Deficiency[] }) {
  const today = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
  const firmName = (AMS.FIRM as { name?: string }).name || 'KAP';
  const sigDefs = (defs || []).filter(d => d.sig);
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 320px', gap: 12, alignItems: 'start' }}>
      <Panel noBody>
        <div className="panel-h"><h3>Draf Surat Defisiensi Signifikan kepada TCWG</h3><div style={{ flex: 1 }} /><Badge kind="red">¶9–¶11</Badge></div>
        <div style={{ padding: 20, background: 'var(--surface-2)' }}>
          <div style={{ background: '#fff', maxWidth: 600, margin: '0 auto', padding: '34px 40px', boxShadow: 'var(--shadow)', fontSize: 11.5, lineHeight: 1.7, color: '#283b46', borderRadius: 4 }}>
            <div style={{ textAlign: 'center', fontWeight: 800, fontSize: 12.5, color: '#0c2430', marginBottom: 14, letterSpacing: '.02em' }}>KOMUNIKASI DEFISIENSI SIGNIFIKAN PENGENDALIAN INTERNAL</div>
            <p style={{ margin: '0 0 10px' }}>Kepada Yth. Komite Audit / Pihak yang Bertanggung Jawab atas Tata Kelola</p>
            <p style={{ margin: '0 0 10px' }}>Sehubungan dengan audit kami atas laporan keuangan untuk tahun yang berakhir 31 Desember 2025, kami menyampaikan defisiensi signifikan dalam pengendalian internal yang kami identifikasi selama audit.</p>
            <p style={{ margin: '0 0 6px' }}>Komunikasi ini disusun semata untuk informasi & penggunaan TCWG dan manajemen, serta tidak ditujukan untuk pihak lain. Audit kami tidak dirancang untuk menyatakan opini atas efektivitas pengendalian internal.</p>
            <div style={{ fontWeight: 700, color: '#0c2430', margin: '12px 0 5px' }}>Defisiensi Signifikan yang Teridentifikasi</div>
            {sigDefs.length ? (
              <ol style={{ margin: '0 0 10px', paddingLeft: 18 }}>
                {sigDefs.map((d, i) => (
                  <li key={i} style={{ marginBottom: 7 }}><b>{d.t}.</b> {d.impact}.</li>
                ))}
              </ol>
            ) : <p style={{ margin: '0 0 10px', fontStyle: 'italic', color: '#6b7c88' }}>Tidak terdapat defisiensi signifikan yang perlu dikomunikasikan tertulis periode ini.</p>}
            <p style={{ margin: '10px 0 0' }}>Kami siap mendiskusikan hal-hal di atas & membantu manajemen merancang rencana perbaikan.</p>
            <p style={{ margin: '14px 0 0' }}>Hormat kami,</p>
            <p style={{ margin: '2px 0 0', fontWeight: 700, color: '#0c2430' }}>{firmName}</p>
            <p style={{ margin: 0, color: '#6b7c88' }}>{today}</p>
          </div>
        </div>
      </Panel>
      <div className="grid" style={{ gap: 12 }}>
        <Panel title="Persyaratan Komunikasi">
          <div style={{ display: 'grid', gap: 7 }}>
            {[
              { t: `Defisiensi signifikan → tertulis ke TCWG (${sig})`, ref: '¶9', ok: true },
              { t: 'Defisiensi lain → manajemen pada level tepat', ref: '¶10', ok: true },
              { t: 'Memuat deskripsi & dampak potensial', ref: '¶11(a)', ok: true },
              { t: 'Menjelaskan tujuan & batasan audit kontrol', ref: '¶11(b)', ok: true },
            ].map((r, i) => (
              <div key={i} className="row gap8" style={{ fontSize: 11.5, alignItems: 'flex-start' }}><span style={{ color: r.ok ? 'var(--green)' : 'var(--amber)', flex: '0 0 auto', marginTop: 1 }}><I.checkCircle size={15} /></span><div style={{ flex: 1, lineHeight: 1.4 }}>{r.t}</div><span className="mono tiny" style={{ color: 'var(--blue)', fontWeight: 700 }}>{r.ref}</span></div>
            ))}
          </div>
        </Panel>
        <Panel title="Waktu Komunikasi (¶9)">
          <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.55, color: 'var(--ink-2)' }}>Komunikasi tertulis defisiensi signifikan dilakukan <b>tepat waktu</b> — selambatnya pada penyelesaian audit. Untuk hal mendesak, komunikasi dapat dilakukan lebih awal agar TCWG dapat mengambil tindakan korektif.</p>
        </Panel>
        <WpPanel moduleId="sa265" title="Kertas Kerja — Sign-off, Bukti & Kesimpulan" />
      </div>
    </div>
  );
}

Object.assign(window, { SA250View, SA260View, SA265View });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { SA250View, SA260View, SA265View };
