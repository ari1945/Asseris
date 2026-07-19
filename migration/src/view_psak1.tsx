/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { useFirm, useNav } from './contexts';
import { I } from './icons';
import { SubBar } from './shell';
import { Badge, Btn, Panel } from './ui';

/* ============================================================
   Asseris — PSAK 1 · Penyajian Laporan Keuangan
   Kertas kerja kepatuhan penyajian & pengungkapan:
   komponen LK lengkap (¶10), karakteristik umum (¶15–46),
   item baris minimum (¶54 / ¶82), klasifikasi lancar (¶60–76),
   identifikasi laporan (¶49–53) & pengungkapan kebijakan (¶117–124).
   ============================================================ */
const { useState: useStateP1, useMemo: useMemoP1 } = React;

/* ---- komponen LK lengkap (¶10) ---- */
const P1_COMPONENTS = [
  { id: 'sofp', ref: '¶10(a)', name: 'Laporan Posisi Keuangan', sub: 'Pada akhir periode pelaporan', st: 'ok' },
  { id: 'pl', ref: '¶10(b)', name: 'Laporan Laba Rugi & Penghasilan Komprehensif Lain', sub: 'Selama periode — sajian satu atau dua laporan', st: 'ok' },
  { id: 'soce', ref: '¶10(c)', name: 'Laporan Perubahan Ekuitas', sub: 'Selama periode pelaporan', st: 'ok' },
  { id: 'scf', ref: '¶10(d)', name: 'Laporan Arus Kas', sub: 'Selama periode — disusun sesuai PSAK 2', st: 'ok' },
  { id: 'notes', ref: '¶10(e)', name: 'Catatan atas Laporan Keuangan (CALK)', sub: 'Kebijakan akuntansi material & informasi penjelasan', st: 'review' },
  { id: 'comp', ref: '¶10(ea)', name: 'Informasi Komparatif Periode Sebelumnya', sub: 'Minimum satu periode komparatif', st: 'ok' },
  { id: 'sofp3', ref: '¶10(f)', name: 'Laporan Posisi Keuangan Awal Periode Komparatif', sub: 'Hanya bila ada penerapan retrospektif / penyajian kembali / reklasifikasi', st: 'na' },
];

/* ---- karakteristik umum (¶15–46) ---- */
const P1_FEATURES = [
  { id: 'fair', ref: '¶15–24', name: 'Penyajian Wajar & Kepatuhan terhadap SAK', note: 'Pernyataan kepatuhan eksplisit & tanpa pengecualian atas SAK tercantum di CALK.', st: 'ok' },
  { id: 'gc', ref: '¶25–26', name: 'Kelangsungan Usaha (Going Concern)', note: 'Manajemen menilai kemampuan entitas melanjutkan usaha — tanpa ketidakpastian material.', st: 'ok' },
  { id: 'accr', ref: '¶27–28', name: 'Dasar Akrual', note: 'Seluruh laporan disusun atas dasar akrual, kecuali laporan arus kas.', st: 'ok' },
  { id: 'mat', ref: '¶29–31', name: 'Materialitas & Agregasi', note: 'Pos material disajikan terpisah; pos serupa tak-material diagregasi.', st: 'ok' },
  { id: 'off', ref: '¶32–35', name: 'Saling Hapus (Offsetting)', note: 'Aset–liabilitas & penghasilan–beban tidak disaling-hapus kecuali disyaratkan SAK.', st: 'review' },
  { id: 'freq', ref: '¶36–37', name: 'Frekuensi Pelaporan', note: 'Laporan disajikan minimal tahunan, mencakup periode 12 bulan penuh.', st: 'ok' },
  { id: 'cinf', ref: '¶38–44', name: 'Informasi Komparatif', note: 'Komparatif angka & naratif disajikan untuk seluruh jumlah periode berjalan.', st: 'ok' },
  { id: 'cons', ref: '¶45–46', name: 'Konsistensi Penyajian', note: 'Penyajian & klasifikasi pos konsisten antar-periode pelaporan.', st: 'ok' },
];

/* ---- item baris minimum ---- */
const P1_LINES_SOFP = [
  ['Aset tetap', 1], ['Properti investasi', 1], ['Aset takberwujud', 1], ['Aset keuangan', 1],
  ['Investasi dengan metode ekuitas', 0], ['Aset biologis', 0], ['Persediaan', 1],
  ['Piutang dagang & piutang lain', 1], ['Kas & setara kas', 1], ['Aset dimiliki untuk dijual (PSAK 58)', 0],
  ['Utang dagang & terutang lain', 1], ['Provisi', 1], ['Liabilitas keuangan', 1],
  ['Liabilitas / aset pajak kini', 1], ['Liabilitas / aset pajak tangguhan', 1],
  ['Kepentingan nonpengendali (ekuitas)', 0], ['Modal saham & cadangan atribusi pemilik induk', 1],
];
const P1_LINES_PL = [
  ['Pendapatan', 1], ['Beban keuangan', 1], ['Bagian L/R entitas asosiasi & ventura (ekuitas)', 0],
  ['Beban pajak penghasilan', 1], ['L/R neto operasi dihentikan', 0], ['Laba rugi periode berjalan', 1],
  ['OCI — pos yang tidak akan direklasifikasi ke L/R', 1], ['OCI — pos yang akan direklasifikasi ke L/R', 1],
  ['Total penghasilan komprehensif periode', 1], ['Alokasi L/R: pemilik induk & KNP', 1],
];

const P1_DISCLOSURE = [
  { id: 'd1', ref: '¶51', t: 'Nama entitas, perubahan nama & status (entitas tunggal/grup) diidentifikasi jelas', ok: true },
  { id: 'd2', ref: '¶51', t: 'Tanggal/periode pelaporan, mata uang penyajian & level pembulatan diungkapkan', ok: true },
  { id: 'd3', ref: '¶117–124', t: 'Kebijakan akuntansi material & dasar pengukuran diungkapkan', ok: true },
  { id: 'd4', ref: '¶122', t: 'Pertimbangan signifikan manajemen dalam penerapan kebijakan akuntansi', ok: false },
  { id: 'd5', ref: '¶125–133', t: 'Sumber utama ketidakpastian estimasi & sensitivitasnya', ok: false },
  { id: 'd6', ref: '¶134–136', t: 'Pengelolaan modal (capital management) entitas', ok: true },
  { id: 'd7', ref: '¶137', t: 'Dividen diusulkan/diumumkan & dividen preferen kumulatif yang belum diakui', ok: true },
  { id: 'd8', ref: '¶138', t: 'Domisili, bentuk hukum, alamat terdaftar & sifat operasi/kegiatan utama', ok: true },
];

/* status meta — kamus per-konteks */
const P1_ST_COMP = {
  ok: { label: 'Tersaji', kind: 'green', icon: 'checkCircle' },
  review: { label: 'Perlu Reviu', kind: 'amber', icon: 'clock' },
  na: { label: 'N/A', kind: 'gray', icon: 'x' },
};
const P1_ST_FEAT = {
  ok: { label: 'Terpenuhi', kind: 'green', icon: 'checkCircle' },
  review: { label: 'Perhatian', kind: 'amber', icon: 'clock' },
  na: { label: 'N/A', kind: 'gray', icon: 'x' },
};
const P1_CYCLE = { ok: 'review', review: 'na', na: 'ok' };

function P1Card({ value, label, sub, accent }: any) {
  return (
    <div className="panel" style={{ padding: '12px 14px', display: 'grid', gap: 2 }}>
      <div className="mono" style={{ fontSize: 22, fontWeight: 700, color: accent || 'var(--navy)', lineHeight: 1 }}>{value}</div>
      <div className="tiny muted" style={{ fontWeight: 600 }}>{label}</div>
      {sub && <div className="tiny" style={{ color: 'var(--ink-4)' }}>{sub}</div>}
    </div>
  );
}

function StatusPill({ meta }: any) {
  const IconC = (I as any)[meta.icon] || I.check;
  return <Badge kind={meta.kind}><span className="row ac gap4" style={{ display: 'inline-flex' }}><IconC size={11} /> {meta.label}</span></Badge>;
}

function PSAK1View() {
  const { fmt } = AMS;
  const firm = useFirm();
  const nav = useNav();

  const [comps, setComps] = window.useAmsPersist('psak1.comps.v1', () => (P1_COMPONENTS));
  const [feats, setFeats] = window.useAmsPersist('psak1.feats.v1', () => (P1_FEATURES));
  const [disc, setDisc] = window.useAmsPersist('psak1.disc.v1', () => (P1_DISCLOSURE));
  const [lineTab, setLineTab] = useStateP1('sofp');
  const [linesSofp, setLinesSofp] = window.useAmsPersist('psak1.lsofp.v1', () => (P1_LINES_SOFP.map(l => ({ t: l[0], on: !!l[1] }))));
  const [linesPl, setLinesPl] = window.useAmsPersist('psak1.lpl.v1', () => (P1_LINES_PL.map(l => ({ t: l[0], on: !!l[1] }))));







  const cycle = (setter: any) => (id: any) => setter((list: any) => list.map((r: any) => r.id === id ? { ...r, st: (P1_CYCLE as any)[r.st] } : r));
  const cycleComp = cycle(setComps);
  const cycleFeat = cycle(setFeats);
  const toggleDisc = (id: any) => setDisc((list: any) => list.map((r: any) => r.id === id ? { ...r, ok: !r.ok } : r));
  const toggleLine = (id: any) => (i: any) => id === 'sofp'
    ? setLinesSofp((list: any) => list.map((r: any, idx: any) => idx === i ? { ...r, on: !r.on } : r))
    : setLinesPl((list: any) => list.map((r: any, idx: any) => idx === i ? { ...r, on: !r.on } : r));

  /* metrics */
  const compsAppl = comps.filter((c: any) => c.st !== 'na');
  const compsOk = comps.filter((c: any) => c.st === 'ok').length;
  const featsAppl = feats.filter((f: any) => f.st !== 'na');
  const featsOk = feats.filter((f: any) => f.st === 'ok').length;
  const linesAll = [...linesSofp, ...linesPl];
  const linesOn = linesAll.filter(l => l.on).length;
  const discOk = disc.filter((d: any) => d.ok).length;

  const denom = compsAppl.length + featsAppl.length + disc.length;
  const numer = compsOk + featsOk + discOk;
  const score = denom ? Math.round((numer / denom) * 100) : 0;
  const attention = comps.filter((c: any) => c.st === 'review').length + feats.filter((f: any) => f.st === 'review').length + disc.filter((d: any) => !d.ok).length;

  const client = firm.activeClient || { name: 'PT Sentosa Makmur Tbk' };
  const eng = firm.activeEngagement || { id: 'ENG-2025-014', fy: 'FY2025' };

  const ident = [
    { ref: '¶51(a)', k: 'Nama entitas pelapor', v: client.name },
    { ref: '¶51(c)', k: 'Periode pelaporan', v: '1 Jan – 31 Des 2025' },
    { ref: '¶51(d)', k: 'Mata uang penyajian', v: 'Rupiah (Rp)' },
    { ref: '¶51(e)', k: 'Level pembulatan', v: 'Satuan penuh' },
    { ref: '¶51(b)', k: 'Cakupan laporan', v: 'Konsolidasian' },
  ];

  /* klasifikasi lancar / tidak lancar — proporsi ilustratif (Rp miliar) */
  const classRows = [
    { k: 'Aset', cur: 184.2, non: 312.6, curL: 'Lancar', nonL: 'Tidak Lancar' },
    { k: 'Liabilitas', cur: 96.4, non: 158.0, curL: 'Jangka Pendek', nonL: 'Jangka Panjang' },
  ];

  const lines = lineTab === 'sofp' ? linesSofp : linesPl;
  const lineRefLabel = lineTab === 'sofp' ? '¶54 — Laporan Posisi Keuangan' : '¶82 / ¶82A — Laba Rugi & OCI';

  return (
    <>
      <SubBar moduleId="psak1" right={
        <div className="row gap8 ac">
          <Badge kind="green">PSAK 1 · IAS 1</Badge>
          <Btn sm onClick={() => nav('fsgen', { from: 'psak1' })}><I.report size={13} /> Buka FS Generator</Btn>
          <Btn sm><I.download size={13} /> Checklist Penyajian</Btn>
        </div>
      } />
      <div className="view-scroll">
        <div className="view-pad" style={{ display: 'grid', gap: 12 }}>

          {/* summary */}
          <div className="grid" style={{ gridTemplateColumns: 'repeat(5,1fr)', gap: 10 }}>
            <P1Card value={compsOk + '/' + comps.length} label="Komponen LK lengkap" sub="¶10 — set laporan" accent="var(--blue)" />
            <P1Card value={featsOk + '/' + feats.length} label="Karakteristik umum" sub="¶15–46 terpenuhi" accent="var(--green)" />
            <P1Card value={linesOn + '/' + linesAll.length} label="Item baris minimum" sub="¶54 & ¶82 tersaji" accent="var(--navy)" />
            <P1Card value={discOk + '/' + disc.length} label="Pengungkapan inti" sub="¶117–138" accent={discOk === disc.length ? 'var(--green)' : 'var(--amber)'} />
            <P1Card value={score + '%'} label="Skor kepatuhan penyajian" sub={attention ? attention + ' butuh perhatian' : 'tanpa pengecualian'} accent={score === 100 ? 'var(--green)' : 'var(--navy)'} />
          </div>

          <div className="grid" style={{ gridTemplateColumns: '1fr 332px', gap: 12, alignItems: 'start' }}>
            {/* ============ LEFT ============ */}
            <div className="grid" style={{ gap: 12 }}>

              {/* komponen LK */}
              <Panel noBody>
                <div className="panel-h"><h3>Komponen Laporan Keuangan Lengkap</h3><span className="sub mono">¶10</span><div style={{ flex: 1 }} /><span className="tiny muted">Klik status untuk mengubah</span></div>
                <div>
                  {comps.map((c: any, i: any) => {
                    const meta = (P1_ST_COMP as any)[c.st];
                    return (
                      <div key={c.id} className="row ac gap10" style={{ padding: '10px 14px', borderBottom: i < comps.length - 1 ? '1px solid var(--line-soft)' : 0, opacity: c.st === 'na' ? 0.62 : 1 }}>
                        <span className="mono tiny" style={{ fontWeight: 700, color: 'var(--navy)', width: 52, flex: '0 0 52px' }}>{c.ref}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.35 }}>{c.name}</div>
                          <div className="tiny muted">{c.sub}</div>
                        </div>
                        <button onClick={() => cycleComp(c.id)} style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer' }} title="Ubah status"><StatusPill meta={meta} /></button>
                      </div>
                    );
                  })}
                </div>
              </Panel>

              {/* karakteristik umum */}
              <Panel noBody>
                <div className="panel-h"><h3>Karakteristik Umum Penyajian</h3><span className="sub mono">¶15–46</span><div style={{ flex: 1 }} /><span className="tiny muted">{featsOk} terpenuhi · {feats.filter((f: any) => f.st === 'review').length} perhatian</span></div>
                <div>
                  {feats.map((f: any, i: any) => {
                    const meta = (P1_ST_FEAT as any)[f.st];
                    return (
                      <div key={f.id} className="row gap10" style={{ padding: '10px 14px', borderBottom: i < feats.length - 1 ? '1px solid var(--line-soft)' : 0, alignItems: 'flex-start', opacity: f.st === 'na' ? 0.62 : 1 }}>
                        <span className="mono tiny" style={{ fontWeight: 700, color: 'var(--navy)', width: 52, flex: '0 0 52px', marginTop: 1 }}>{f.ref}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.35 }}>{f.name}</div>
                          <div className="tiny muted" style={{ lineHeight: 1.45, marginTop: 1 }}>{f.note}</div>
                        </div>
                        <button onClick={() => cycleFeat(f.id)} style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', flex: '0 0 auto', marginTop: 1 }} title="Ubah penilaian"><StatusPill meta={meta} /></button>
                      </div>
                    );
                  })}
                </div>
              </Panel>

              {/* item baris minimum */}
              <Panel noBody>
                <div className="panel-h"><h3>Item Baris Minimum</h3><div style={{ flex: 1 }} />
                  <div className="seg" style={{ width: 'fit-content' }}>
                    <button className={lineTab === 'sofp' ? 'on' : ''} onClick={() => setLineTab('sofp')}>Posisi Keuangan</button>
                    <button className={lineTab === 'pl' ? 'on' : ''} onClick={() => setLineTab('pl')}>Laba Rugi & OCI</button>
                  </div>
                </div>
                <div style={{ padding: '8px 14px 4px' }} className="row ac jb">
                  <span className="tiny mono" style={{ color: 'var(--ink-3)' }}>{lineRefLabel}</span>
                  <span className="tiny muted">{lines.filter((l: any) => l.on).length}/{lines.length} disajikan terpisah</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, padding: '0 14px 12px' }}>
                  {lines.map((l: any, i: any) => (
                    <label key={i} className="row gap8" style={{ padding: '7px 0', cursor: 'pointer', alignItems: 'flex-start' }} onClick={() => toggleLine(lineTab)(i)}>
                      <span style={{ flex: '0 0 16px', width: 16, height: 16, borderRadius: 4, marginTop: 1, border: '1.5px solid ' + (l.on ? 'var(--green)' : 'var(--line-strong)'), background: l.on ? 'var(--green)' : '#fff', display: 'grid', placeItems: 'center' }}>{l.on && <I.check size={11} style={{ color: '#fff' }} />}</span>
                      <span style={{ fontSize: 11.5, lineHeight: 1.4, color: l.on ? 'var(--ink)' : 'var(--ink-4)' }}>{l.t}</span>
                    </label>
                  ))}
                </div>
                <div className="tiny muted" style={{ padding: '0 14px 12px', lineHeight: 1.5 }}>
                  Item baris tambahan, judul & subtotal disajikan bila relevan dengan pemahaman posisi/kinerja keuangan (¶55, ¶85). Pos tak-tersaji yang <b>tidak relevan</b> bagi entitas bukan merupakan ketidakpatuhan.
                </div>
              </Panel>

              {/* pengungkapan */}
              <Panel noBody>
                <div className="panel-h"><h3>Pengungkapan Struktur & Kebijakan</h3><span className="sub mono">¶112–138</span><div style={{ flex: 1 }} /><span className="tiny muted">{discOk}/{disc.length}</span></div>
                <div>
                  {disc.map((d: any, i: any) => (
                    <label key={d.id} className="row gap10" style={{ padding: '9px 14px', cursor: 'pointer', alignItems: 'flex-start', borderBottom: i < disc.length - 1 ? '1px solid var(--line-soft)' : 0 }} onClick={() => toggleDisc(d.id)}>
                      <span style={{ flex: '0 0 16px', width: 16, height: 16, borderRadius: 4, marginTop: 1, border: '1.5px solid ' + (d.ok ? 'var(--green)' : 'var(--amber)'), background: d.ok ? 'var(--green)' : '#fff', display: 'grid', placeItems: 'center' }}>{d.ok && <I.check size={11} style={{ color: '#fff' }} />}</span>
                      <span className="mono tiny" style={{ fontWeight: 700, color: 'var(--navy)', width: 60, flex: '0 0 60px', marginTop: 1 }}>{d.ref}</span>
                      <span style={{ fontSize: 12, lineHeight: 1.4, color: d.ok ? 'var(--ink-2)' : 'var(--ink)', fontWeight: d.ok ? 400 : 600 }}>{d.t}{!d.ok && <span className="tiny" style={{ color: 'var(--amber)', fontWeight: 700, marginLeft: 6 }}>belum lengkap</span>}</span>
                    </label>
                  ))}
                </div>
              </Panel>
            </div>

            {/* ============ RIGHT ============ */}
            <div className="grid" style={{ gap: 12 }}>

              {/* kesimpulan */}
              <Panel noBody>
                <div style={{ background: 'linear-gradient(120deg,#013a52,#005085)', color: '#fff', padding: '14px 16px' }}>
                  <div className="tiny upper" style={{ color: '#bcd6e4', letterSpacing: '.05em', marginBottom: 8 }}>Skor Kepatuhan Penyajian</div>
                  <div className="row ac gap12">
                    <div style={{ fontSize: 34, fontWeight: 800, lineHeight: 1, fontFamily: 'JetBrains Mono, monospace' }}>{score}<span style={{ fontSize: 18 }}>%</span></div>
                    <div style={{ flex: 1 }}>
                      <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,.18)', overflow: 'hidden' }}><span style={{ display: 'block', height: '100%', width: score + '%', background: score === 100 ? '#4ade80' : '#7cc6ff', borderRadius: 4, transition: '.3s' }} /></div>
                      <div className="tiny" style={{ color: '#bcd6e4', marginTop: 6 }}>{numer}/{denom} kriteria penyajian terpenuhi</div>
                    </div>
                  </div>
                </div>
                <div style={{ padding: 14 }}>
                  <div className="panel" style={{ padding: '9px 11px', background: attention ? 'var(--amber-bg)' : 'var(--green-bg)', borderColor: 'transparent', marginBottom: 12 }}>
                    <div className="row gap8" style={{ alignItems: 'flex-start' }}>
                      <span style={{ color: attention ? 'var(--amber)' : 'var(--green)', marginTop: 1 }}>{attention ? <I.clock size={15} /> : <I.checkCircle size={15} />}</span>
                      <span style={{ fontSize: 11.5, lineHeight: 1.45 }}>{attention
                        ? <><b>{attention} hal</b> memerlukan perhatian sebelum penyajian dapat dinyatakan patuh penuh terhadap PSAK 1.</>
                        : <>Penyajian LK <b>{client.name}</b> patuh penuh terhadap PSAK 1 — siap pernyataan kepatuhan tanpa pengecualian.</>}</span>
                    </div>
                  </div>
                  <div className="tiny muted upper" style={{ marginBottom: 5 }}>Pernyataan Kepatuhan (¶16)</div>
                  <div className="panel" style={{ padding: '9px 11px', background: 'var(--blue-050)', borderColor: 'var(--blue-100)' }}>
                    <div style={{ fontSize: 11.5, lineHeight: 1.5, fontStyle: 'italic', color: 'var(--ink-2)' }}>"Laporan keuangan {client.name} telah disusun dan disajikan sesuai dengan Standar Akuntansi Keuangan di Indonesia."</div>
                  </div>
                </div>
              </Panel>

              {/* identifikasi laporan */}
              <Panel title="Identifikasi Laporan" sub="¶49–53">
                <div style={{ display: 'grid', gap: 0 }}>
                  {ident.map((r, i) => (
                    <div key={i} className="row ac gap8" style={{ padding: '8px 0', borderBottom: i < ident.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
                      <span style={{ color: 'var(--green)', flex: '0 0 auto' }}><I.checkCircle size={14} /></span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="tiny muted">{r.k} <span className="mono" style={{ color: 'var(--ink-4)' }}>{r.ref}</span></div>
                        <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.3 }}>{r.v}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>

              {/* klasifikasi lancar/tidak lancar */}
              <Panel title="Klasifikasi Lancar / Tidak Lancar" sub="¶60–76">
                <div style={{ display: 'grid', gap: 14 }}>
                  {classRows.map((r, i) => {
                    const tot = r.cur + r.non;
                    const pct = (r.cur / tot) * 100;
                    return (
                      <div key={i}>
                        <div className="row ac jb" style={{ marginBottom: 5 }}>
                          <span style={{ fontSize: 12, fontWeight: 700 }}>{r.k}</span>
                          <span className="tiny muted mono">Rp {fmt(tot, 1)} M</span>
                        </div>
                        <div style={{ display: 'flex', height: 22, borderRadius: 5, overflow: 'hidden', border: '1px solid var(--line)' }}>
                          <div style={{ width: pct + '%', background: 'var(--blue)', display: 'grid', placeItems: 'center' }}><span className="tiny mono" style={{ color: '#fff', fontWeight: 700 }}>{Math.round(pct)}%</span></div>
                          <div style={{ width: (100 - pct) + '%', background: 'var(--navy)', display: 'grid', placeItems: 'center' }}><span className="tiny mono" style={{ color: '#fff', fontWeight: 700 }}>{Math.round(100 - pct)}%</span></div>
                        </div>
                        <div className="row ac jb tiny muted" style={{ marginTop: 4 }}>
                          <span className="row ac gap4"><span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--blue)' }} /> {r.curL} {fmt(r.cur, 1)}</span>
                          <span className="row ac gap4">{r.nonL} {fmt(r.non, 1)} <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--navy)' }} /></span>
                        </div>
                      </div>
                    );
                  })}
                  <div className="tiny muted" style={{ lineHeight: 1.5, paddingTop: 2, borderTop: '1px solid var(--line-soft)' }}>
                    Basis penyajian: <b>lancar / tidak lancar</b> (¶60). Jumlah yang diharapkan terpulihkan/diselesaikan &gt; 12 bulan diungkapkan terpisah (¶61).
                  </div>
                </div>
              </Panel>
            </div>
          </div>

          <div className="tiny muted" style={{ padding: '0 2px 4px', lineHeight: 1.5 }}>
            Kertas kerja ini menelusuri penyajian LK <b>{client.name}</b> ({eng.id} · {eng.fy}) terhadap PSAK 1 — dari kelengkapan komponen, karakteristik umum, item baris minimum, hingga pengungkapan struktur & kebijakan. Status tersimpan otomatis untuk jejak audit.
          </div>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { PSAK1View });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { PSAK1View };
