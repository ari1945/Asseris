/* [codemod] ESM imports */
import React from 'react';
import { AMS_CANON } from './canon';
import { useFirm } from './contexts';
import { I } from './icons';
import { SACanonChips, SACanonicalStatus, SASignoffMini } from './sa_canonical';
import { SubBar } from './shell.jsx';
import { Badge, Btn, Panel, Progress, Stat, Tabs } from './ui.jsx';
import { KvBox } from './view_analytical';

/* ============================================================
   Asseris — SA 501 · Bukti Audit: Pertimbangan Spesifik
   atas Unsur Pilihan (Persediaan · Litigasi & Klaim · Segmen)
   Deep workpaper: kehadiran perhitungan fisik, prosedur
   observasi, komunikasi penasihat hukum, register perkara,
   serta evaluasi penyajian informasi segmen.
   ============================================================ */
const { useState: useState501, useMemo: useMemo501 } = React;

/* ---- Lokasi perhitungan fisik persediaan ---- */
const INV_LOCATIONS = [
  { id: 'GBJ-01', loc: 'Gudang Pusat — Cikarang', val: 38420, pct: 52, attend: true, planner: 'Tim A (3 staf)', counts: 24, dev: 0, cond: 'Baik', note: 'Kontrol cut-off kuat; tag terkontrol berurutan.' },
  { id: 'GBJ-02', loc: 'Gudang Distribusi — Surabaya', val: 19180, pct: 26, attend: true, planner: 'Tim B (2 staf)', counts: 18, dev: 1, cond: 'Baik', note: '1 selisih minor (10 unit) — koreksi dicatat manajemen.' },
  { id: 'GBJ-03', loc: 'Gudang Bahan Baku — Cikarang', val: 9860, pct: 13, attend: true, planner: 'Tim A (1 staf)', counts: 12, dev: 0, cond: 'Sebagian usang', note: '3 SKU lambat-bergerak ditandai untuk uji penyisihan (SA 540).' },
  { id: 'GBJ-04', loc: 'Konsinyasi — Distributor Medan', val: 4980, pct: 7, attend: false, planner: 'Konfirmasi pihak ketiga', counts: 0, dev: 0, cond: 'n/a', note: 'Tidak dihadiri — konfirmasi + prosedur alternatif (¶8).' },
  { id: 'GBJ-05', loc: 'Barang Dalam Perjalanan (FOB)', val: 1620, pct: 2, attend: false, planner: 'Dokumen pengiriman', counts: 0, dev: 0, cond: 'n/a', note: 'Vouching B/L & syarat Incoterm untuk hak kepemilikan & cut-off.' },
];

/* ---- Prosedur kehadiran perhitungan fisik (¶4–5) ---- */
const INV_PROC = [
  { t: 'Evaluasi instruksi & prosedur manajemen untuk pencatatan & pengendalian hasil perhitungan', ref: '¶4(a)', done: true },
  { t: 'Observasi pelaksanaan prosedur perhitungan oleh personel entitas', ref: '¶4(b)', done: true },
  { t: 'Inspeksi persediaan untuk memastikan keberadaan & menilai kondisinya', ref: '¶4(c)', done: true },
  { t: 'Laksanakan perhitungan uji (test count) dua arah ke & dari catatan', ref: '¶4(d)', done: true },
  { t: 'Uji pisah-batas (cut-off) penerimaan & pengeluaran sekitar tanggal hitung', ref: '¶A9', done: true },
  { t: 'Prosedur atas catatan persediaan akhir — rekonsiliasi ke hitung fisik', ref: '¶5', done: false },
];

/* ---- Register litigasi & klaim — SUMBER TUNGGAL: AMS_CANON.PROV_REGISTER ----
   Dibaca juga oleh modul PSAK 48/57 & SA 540, sehingga klasifikasi (provisi/
   kontinjensi) dan nilai klaim tidak pernah berbeda antar modul. `prov` & `disc`
   diturunkan dari tingkat kemungkinan via pohon keputusan PSAK 57 (¶14/27/86). */
function getLitCases() {
  const C: any = AMS_CANON || {};
  const reg = C.PROV_REGISTER || [];
  const TREAT = C.P57_TREAT || {};
  return reg.filter(p => p.kind === 'litigation').map(p => {
    const t = TREAT[p.likely] || {};
    return { ...p, prov: t.treat === 'provision' ? p.estimate : 0, disc: t.disc || 'Diungkap (kontinjensi)' };
  });
}
const LIT_CASES = getLitCases();

/* ============================================================ */
function SA501View() {
  const firm = useFirm();
  const client = firm?.activeClient?.name || 'PT Sentosa Makmur Tbk';
  const [tab, setTab] = useState501('ringkasan');

  const invTotal = INV_LOCATIONS.reduce((s, l) => s + l.val, 0);
  const litExposure = LIT_CASES.reduce((s, c) => s + c.claim, 0);

  const tabs = [
    { id: 'ringkasan', label: 'Ringkasan' },
    { id: 'persediaan', label: 'Persediaan' },
    { id: 'litigasi', label: 'Litigasi & Klaim' },
    { id: 'segmen', label: 'Informasi Segmen' },
  ];

  return (
    <>
      <SubBar moduleId="sa501" right={
        <div className="row gap8 ac">
          <SACanonChips stdId="sa501" />
          <Btn sm><I.download size={13} /> Memo Bukti Spesifik</Btn>
          <Btn sm variant="primary"><I.sparkle size={14} /> AI Assist</Btn>
        </div>
      } />
      <div className="view-scroll"><div className="view-pad">

        <Panel noBody style={{ marginBottom: 12 }}>
          <div style={{ padding: '13px 16px', display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ minWidth: 210 }}>
              <div className="tiny muted upper" style={{ marginBottom: 3 }}>Standar Audit 501</div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>Bukti Audit — Unsur Pilihan</div>
              <div className="tiny muted">{client} · ENG-2025-014</div>
            </div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Persediaan (Rp jt)</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5 }}>{invTotal.toLocaleString('id-ID')} · 5 lokasi</div></div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Eksposur Litigasi (Rp jt)</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--amber)' }}>{litExposure.toLocaleString('id-ID')} · 4 perkara</div></div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Penasihat Hukum</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5 }}>3 dari 4 surat dibalas</div></div>
            <div style={{ flex: 1 }} />
            <div style={{ textAlign: 'right' }}>
              <div className="tiny muted upper" style={{ marginBottom: 3 }}>Tanggal Hitung Fisik</div>
              <Badge kind="blue" dot>31 Des 2025 · dihadiri</Badge>
            </div>
          </div>
        </Panel>

        <SACanonicalStatus stdId="sa501" />

        <div style={{ marginBottom: 12 }}><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>

        {tab === 'ringkasan' && <F501Overview invTotal={invTotal} litExposure={litExposure} />}
        {tab === 'persediaan' && <F501Inventory invTotal={invTotal} />}
        {tab === 'litigasi' && <F501Litigation />}
        {tab === 'segmen' && <F501Segment />}

      </div></div>
    </>
  );
}

/* ---------------- Tab: Ringkasan ---------------- */
function F501Overview({ invTotal, litExposure }) {
  const areas = [
    { ic: 'layers', k: 'blue', t: 'Persediaan (¶4–8)', sub: 'Bila persediaan material — hadiri perhitungan fisik & laksanakan prosedur atas catatan akhir.', m1: ['Nilai tercatat', invTotal.toLocaleString('id-ID') + ' jt'], m2: ['Lokasi dihadiri', '3 dari 5'], status: 'Berlangsung', sk: 'blue' },
    { ic: 'gavel', k: 'amber', t: 'Litigasi & Klaim (¶9–12)', sub: 'Rancang prosedur untuk identifikasi litigasi/klaim yang dapat menimbulkan risiko salah saji material.', m1: ['Eksposur klaim', litExposure.toLocaleString('id-ID') + ' jt'], m2: ['Surat hukum dibalas', '3 dari 4'], status: '1 menunggu balasan', sk: 'amber' },
    { ic: 'columns', k: 'purple', t: 'Informasi Segmen (¶13)', sub: 'Evaluasi penyajian & pengungkapan informasi segmen sesuai kerangka pelaporan (PSAK 5).', m1: ['Segmen dilaporkan', '3 segmen'], m2: ['Rekonsiliasi total', 'Cocok'], status: 'Selesai', sk: 'green' },
  ];
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 340px', gap: 12, alignItems: 'start' }}>
      <div className="grid" style={{ gap: 12 }}>
        <Panel noBody>
          <div className="panel-h"><h3>Tiga Area Bukti Spesifik SA 501</h3><div style={{ flex: 1 }} /><Badge kind="blue">Ruang Lingkup</Badge></div>
          <div style={{ padding: '6px 14px 14px' }}>
            {areas.map((a, i) => {
              const Ic = I[a.ic];
              return (
                <div key={i} className="row gap12" style={{ padding: '13px 0', alignItems: 'flex-start', borderBottom: i < areas.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
                  <span style={{ flex: '0 0 38px', width: 38, height: 38, borderRadius: 9, display: 'grid', placeItems: 'center', background: `var(--${a.k}-bg)`, color: `var(--${a.k})` }}><Ic size={19} /></span>
                  <div style={{ flex: 1 }}>
                    <div className="row jb ac"><div style={{ fontSize: 13, fontWeight: 700 }}>{a.t}</div><Badge kind={a.sk}>{a.status}</Badge></div>
                    <div className="tiny muted" style={{ lineHeight: 1.45, margin: '3px 0 8px' }}>{a.sub}</div>
                    <div className="row gap8">
                      <div className="chip tiny"><b style={{ fontFamily: 'var(--mono)' }}>{a.m1[1]}</b> · {a.m1[0]}</div>
                      <div className="chip tiny"><b style={{ fontFamily: 'var(--mono)' }}>{a.m2[1]}</b> · {a.m2[0]}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>

      <div className="grid" style={{ gap: 12 }}>
        <Panel title="Keterkaitan Standar">
          <div style={{ display: 'grid', gap: 7 }}>
            {[['SA 500 · Bukti Audit', 'doc'], ['SA 540 · Estimasi (penyisihan persediaan)', 'target'], ['SA 505 · Konfirmasi Eksternal (konsinyasi)', 'mail'], ['SA 230 · Dokumentasi Audit', 'layers']].map((r, i) => {
              const Lic = I[r[1]];
              return (
                <div key={i} className="row jb ac" style={{ fontSize: 12, padding: '8px 10px', border: '1px solid var(--line-soft)', borderRadius: 7 }}>
                  <span className="row ac gap8"><span style={{ color: 'var(--blue)' }}><Lic size={14} /></span>{r[0]}</span>
                  <I.arrowRight size={14} style={{ color: 'var(--ink-4)' }} />
                </div>
              );
            })}
          </div>
        </Panel>
        <SASignoffMini stdId="sa501" />
      </div>
    </div>
  );
}

/* ---------------- Tab: Persediaan ---------------- */
function F501Inventory({ invTotal }) {
  const [selId, setSelId] = useState501('GBJ-01');
  const sel = INV_LOCATIONS.find(l => l.id === selId);
  const attended = INV_LOCATIONS.filter(l => l.attend);
  const attendedVal = attended.reduce((s, l) => s + l.val, 0);
  return (
    <div className="grid" style={{ gap: 12 }}>
      <Panel noBody>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 0 }}>
          {[
            { v: invTotal.toLocaleString('id-ID'), l: 'Nilai Persediaan (Rp jt)' },
            { v: Math.round(attendedVal / invTotal * 100) + '%', l: 'Cakupan Dihadiri', a: 'var(--green)' },
            { v: '66', l: 'Total Test Count', a: 'var(--blue)' },
            { v: '1', l: 'Selisih (dikoreksi)', a: 'var(--amber)' },
          ].map((s, i) => (
            <div key={i} style={{ padding: '12px 16px', borderRight: i < 3 ? '1px solid var(--line-soft)' : 0 }}><Stat value={s.v} label={s.l} accent={s.a} /></div>
          ))}
        </div>
      </Panel>

      <div className="grid" style={{ gridTemplateColumns: '1fr 340px', gap: 12, alignItems: 'start' }}>
        <Panel noBody>
          <div className="panel-h"><h3>Lokasi & Hasil Perhitungan Fisik</h3><div style={{ flex: 1 }} /><span className="tiny muted">Klik baris untuk rincian</span></div>
          <table className="dtbl">
            <thead><tr><th style={{ width: 60 }}>Ref</th><th>Lokasi</th><th className="num">Nilai</th><th className="num">% </th><th style={{ width: 96 }}>Kehadiran</th></tr></thead>
            <tbody>
              {INV_LOCATIONS.map(l => (
                <tr key={l.id} className={l.id === selId ? 'sel' : ''} onClick={() => setSelId(l.id)} style={{ cursor: 'pointer' }}>
                  <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{l.id}</td>
                  <td style={{ fontWeight: 600 }}>{l.loc}<div className="tiny muted" style={{ fontWeight: 400 }}>{l.planner}</div></td>
                  <td className="num mono">{l.val.toLocaleString('id-ID')}</td>
                  <td className="num mono tiny">{l.pct}%</td>
                  <td>{l.attend ? <Badge kind="green">Dihadiri</Badge> : <Badge kind="amber">Alternatif</Badge>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        {sel && (
          <Panel noBody>
            <div style={{ background: 'var(--surface-2)', padding: '11px 14px', borderBottom: '1px solid var(--line)' }}>
              <div className="row ac gap8"><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{sel.id}</span>{sel.attend ? <Badge kind="green">Dihadiri</Badge> : <Badge kind="amber">Prosedur Alternatif</Badge>}</div>
              <div style={{ fontWeight: 700, fontSize: 13, marginTop: 4 }}>{sel.loc}</div>
            </div>
            <div style={{ padding: 14 }}>
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                <KvBox label="Nilai (Rp jt)" v={sel.val.toLocaleString('id-ID')} />
                <KvBox label="% Total" v={sel.pct + '%'} />
                <KvBox label="Test Count" v={sel.counts || '—'} accent={sel.counts ? 'var(--blue)' : 'var(--ink-3)'} />
                <KvBox label="Selisih" v={sel.dev} accent={sel.dev ? 'var(--amber)' : 'var(--green)'} />
              </div>
              <div className="tiny muted upper" style={{ marginBottom: 4 }}>Kondisi Persediaan</div>
              <div style={{ marginBottom: 12 }}><Badge kind={sel.cond === 'Baik' ? 'green' : sel.cond === 'n/a' ? 'gray' : 'amber'}>{sel.cond}</Badge></div>
              <div className="tiny muted upper" style={{ marginBottom: 4 }}>Catatan Lapangan</div>
              <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5 }}>{sel.note}</p>
              {!sel.attend && (
                <div className="panel" style={{ padding: '9px 11px', background: 'var(--amber-bg)', borderColor: 'transparent', marginTop: 12 }}>
                  <div className="row ac gap8"><span style={{ color: 'var(--amber)' }}><I.alert size={15} /></span><span style={{ fontSize: 11.5, lineHeight: 1.4 }}>Tidak dapat dihadiri — laksanakan prosedur alternatif untuk bukti yang cukup atas keberadaan & kondisi (¶7–8).</span></div>
                </div>
              )}
            </div>
          </Panel>
        )}
      </div>

      <Panel noBody>
        <div className="panel-h"><h3>Prosedur Kehadiran Perhitungan Fisik (¶4–5)</h3><div style={{ flex: 1 }} /><Badge kind="blue">{INV_PROC.filter(p => p.done).length}/{INV_PROC.length} selesai</Badge></div>
        <div style={{ padding: '6px 14px 14px' }}>
          {INV_PROC.map((p, i) => (
            <div key={i} className="row gap10" style={{ padding: '10px 0', alignItems: 'flex-start', borderBottom: i < INV_PROC.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
              <span style={{ flex: '0 0 auto', marginTop: 1, color: p.done ? 'var(--green)' : 'var(--amber)' }}>{p.done ? <I.checkCircle size={16} /> : <I.clock size={16} />}</span>
              <div style={{ flex: 1, fontSize: 12.5, lineHeight: 1.45 }}>{p.t}</div>
              <span className="mono tiny" style={{ color: 'var(--blue)', fontWeight: 700 }}>{p.ref}</span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

/* ---------------- Tab: Litigasi & Klaim ---------------- */
function F501Litigation() {
  const [selId, setSelId] = useState501('LIT-01');
  const sel = LIT_CASES.find(c => c.id === selId);
  const likKind = l => l === 'Besar Kemungkinan' ? 'red' : l === 'Mungkin' ? 'amber' : 'gray';
  return (
    <div className="grid" style={{ gap: 12 }}>
      <div className="grid" style={{ gridTemplateColumns: '1fr 360px', gap: 12, alignItems: 'start' }}>
        <Panel noBody>
          <div className="panel-h"><h3>Register Litigasi, Klaim & Penilaian (¶9)</h3><div style={{ flex: 1 }} /><span className="tiny muted">{LIT_CASES.length} perkara</span></div>
          <table className="dtbl">
            <thead><tr><th style={{ width: 56 }}>Ref</th><th>Perkara</th><th className="num">Klaim</th><th className="num">Provisi</th><th style={{ width: 120 }}>Kemungkinan</th></tr></thead>
            <tbody>
              {LIT_CASES.map(c => (
                <tr key={c.id} className={c.id === selId ? 'sel' : ''} onClick={() => setSelId(c.id)} style={{ cursor: 'pointer' }}>
                  <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{c.id}</td>
                  <td style={{ fontWeight: 600, whiteSpace: 'normal', lineHeight: 1.35 }}>{c.party}<div className="tiny muted" style={{ fontWeight: 400, marginTop: 2 }}>{c.nature} · {c.counsel}</div></td>
                  <td className="num mono">{c.claim.toLocaleString('id-ID')}</td>
                  <td className="num mono" style={{ color: c.prov ? 'var(--ink)' : 'var(--ink-4)' }}>{c.prov ? c.prov.toLocaleString('id-ID') : '—'}</td>
                  <td><Badge kind={likKind(c.likely)}>{c.likely}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        {sel && (
          <Panel noBody>
            <div style={{ background: 'var(--surface-2)', padding: '11px 14px', borderBottom: '1px solid var(--line)' }}>
              <div className="row ac gap8"><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{sel.id}</span><Badge kind={likKind(sel.likely)}>{sel.likely}</Badge></div>
              <div style={{ fontWeight: 700, fontSize: 13, marginTop: 4, lineHeight: 1.35 }}>{sel.party}</div>
            </div>
            <div style={{ padding: 14 }}>
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                <KvBox label="Nilai Klaim (jt)" v={sel.claim.toLocaleString('id-ID')} />
                <KvBox label="Provisi (jt)" v={sel.prov ? sel.prov.toLocaleString('id-ID') : '—'} accent={sel.prov ? 'var(--red)' : 'var(--green)'} />
                <KvBox label="Sifat" v={sel.nature} />
                <KvBox label="Surat Hukum" v={sel.resp ? 'Dibalas' : 'Menunggu'} accent={sel.resp ? 'var(--green)' : 'var(--amber)'} />
              </div>
              <div className="tiny muted upper" style={{ marginBottom: 4 }}>Penilaian Penasihat Hukum</div>
              <p style={{ margin: '0 0 12px', fontSize: 12, lineHeight: 1.5 }}>{sel.assess}</p>
              <div className="tiny muted upper" style={{ marginBottom: 4 }}>Perlakuan Akuntansi (PSAK 57)</div>
              <Badge kind={sel.disc.startsWith('Provisi') ? 'red' : sel.disc.startsWith('Diungkap') ? 'amber' : 'gray'}>{sel.disc}</Badge>
              {!sel.resp && (
                <div className="panel" style={{ padding: '9px 11px', background: 'var(--amber-bg)', borderColor: 'transparent', marginTop: 12 }}>
                  <div className="row ac gap8"><span style={{ color: 'var(--amber)' }}><I.mail size={15} /></span><span style={{ fontSize: 11.5, lineHeight: 1.4 }}>Surat permintaan keterangan langsung ke penasihat hukum eksternal belum dibalas (¶10) — tindak lanjut sebelum tanggal laporan.</span></div>
                </div>
              )}
            </div>
          </Panel>
        )}
      </div>

      <Panel noBody>
        <div className="panel-h"><h3>Prosedur & Komunikasi Penasihat Hukum (¶9–12)</h3><div style={{ flex: 1 }} /></div>
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 0 }}>
          <div style={{ padding: '6px 14px 14px', borderRight: '1px solid var(--line-soft)' }}>
            <div className="tiny muted upper" style={{ margin: '6px 0 6px' }}>Prosedur Identifikasi</div>
            {[
              ['Inquiry manajemen & in-house counsel atas perkara', '¶9(a)'],
              ['Telaah risalah rapat TCWG & korespondensi hukum', '¶9(b)'],
              ['Telaah akun beban jasa hukum & faktur firma hukum', '¶9(c)'],
            ].map((r, i) => (
              <div key={i} className="row gap10" style={{ padding: '8px 0', alignItems: 'flex-start', borderBottom: i < 2 ? '1px solid var(--line-soft)' : 0 }}>
                <span style={{ color: 'var(--green)', flex: '0 0 auto', marginTop: 1 }}><I.checkCircle size={15} /></span>
                <div style={{ flex: 1, fontSize: 12, lineHeight: 1.4 }}>{r[0]}</div>
                <span className="mono tiny" style={{ color: 'var(--blue)', fontWeight: 700 }}>{r[1]}</span>
              </div>
            ))}
          </div>
          <div style={{ padding: '6px 14px 14px' }}>
            <div className="tiny muted upper" style={{ margin: '6px 0 6px' }}>Surat Permintaan Keterangan (¶10–11)</div>
            <div style={{ display: 'grid', gap: 7 }}>
              {[
                { t: 'Hadiputranto & Rekan', s: 'Dibalas 06 Jan', k: 'green' },
                { t: 'Internal Legal (in-house)', s: 'Dibalas 05 Jan', k: 'green' },
                { t: 'Penasihat hukum ketenagakerjaan', s: 'Dibalas 06 Jan', k: 'green' },
                { t: 'Konfirmasi klaim garansi (LIT-04)', s: 'Menunggu balasan', k: 'amber' },
              ].map((r, i) => (
                <div key={i} className="row jb ac" style={{ fontSize: 12, padding: '7px 9px', border: '1px solid var(--line-soft)', borderRadius: 6 }}>
                  <span className="row ac gap8"><span style={{ color: r.k === 'green' ? 'var(--green)' : 'var(--amber)' }}><I.mail size={14} /></span>{r.t}</span>
                  <Badge kind={r.k}>{r.s}</Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="panel" style={{ margin: 12, padding: '10px 12px', background: 'var(--blue-050)', borderColor: 'var(--blue-100)' }}>
          <div className="row gap8" style={{ alignItems: 'flex-start' }}>
            <span style={{ color: 'var(--blue)', flex: '0 0 auto' }}><I.book size={15} /></span>
            <span style={{ fontSize: 11.5, lineHeight: 1.45 }}>Jika manajemen menolak memberi izin komunikasi dengan penasihat hukum, atau penasihat menolak menjawab dengan memadai, dan auditor tak dapat memperoleh bukti alternatif yang cukup — terdapat <b>pembatasan ruang lingkup</b> → opini dimodifikasi (¶11, SA 705).</span>
          </div>
        </div>
      </Panel>
    </div>
  );
}

/* ---------------- Tab: Informasi Segmen ---------------- */
function F501Segment() {
  const SEG = [
    { seg: 'Segmen Manufaktur', rev: 142500, profit: 21300, assets: 188000 },
    { seg: 'Segmen Distribusi', rev: 86200, profit: 9800, assets: 64500 },
    { seg: 'Segmen Jasa & Lainnya', rev: 31300, profit: 4100, assets: 22800 },
  ];
  const totRev = SEG.reduce((s, x) => s + x.rev, 0);
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 340px', gap: 12, alignItems: 'start' }}>
      <div className="grid" style={{ gap: 12 }}>
        <Panel noBody>
          <div className="panel-h"><h3>Informasi Segmen Dilaporkan (PSAK 5)</h3><div style={{ flex: 1 }} /><Badge kind="green">Rekonsiliasi cocok</Badge></div>
          <table className="dtbl">
            <thead><tr><th>Segmen Operasi</th><th className="num">Pendapatan</th><th className="num">% </th><th className="num">Laba Segmen</th><th className="num">Aset Segmen</th></tr></thead>
            <tbody>
              {SEG.map((s, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{s.seg}</td>
                  <td className="num mono">{s.rev.toLocaleString('id-ID')}</td>
                  <td className="num mono tiny">{Math.round(s.rev / totRev * 100)}%</td>
                  <td className="num mono">{s.profit.toLocaleString('id-ID')}</td>
                  <td className="num mono">{s.assets.toLocaleString('id-ID')}</td>
                </tr>
              ))}
              <tr style={{ fontWeight: 700, background: 'var(--surface-2)' }}>
                <td>Total — cocok ke LK konsolidasi</td>
                <td className="num mono">{totRev.toLocaleString('id-ID')}</td>
                <td className="num mono tiny">100%</td>
                <td className="num mono">{SEG.reduce((a, x) => a + x.profit, 0).toLocaleString('id-ID')}</td>
                <td className="num mono">{SEG.reduce((a, x) => a + x.assets, 0).toLocaleString('id-ID')}</td>
              </tr>
            </tbody>
          </table>
        </Panel>

        <Panel noBody>
          <div className="panel-h"><h3>Prosedur Evaluasi Penyajian & Pengungkapan (¶13)</h3><div style={{ flex: 1 }} /></div>
          <div style={{ padding: '6px 14px 14px' }}>
            {[
              { t: 'Peroleh pemahaman atas metode manajemen dalam menentukan informasi segmen', done: true },
              { t: 'Evaluasi apakah metode menghasilkan pengungkapan sesuai kerangka pelaporan', done: true },
              { t: 'Uji penerapan metode — alokasi pendapatan, beban & aset antar segmen', done: true },
              { t: 'Lakukan prosedur analitis atau pengujian lain yang sesuai atas data segmen', done: false },
            ].map((p, i) => (
              <div key={i} className="row gap10" style={{ padding: '10px 0', alignItems: 'flex-start', borderBottom: i < 3 ? '1px solid var(--line-soft)' : 0 }}>
                <span style={{ flex: '0 0 auto', marginTop: 1, color: p.done ? 'var(--green)' : 'var(--amber)' }}>{p.done ? <I.checkCircle size={16} /> : <I.clock size={16} />}</span>
                <div style={{ flex: 1, fontSize: 12.5, lineHeight: 1.45 }}>{p.t}</div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid" style={{ gap: 12 }}>
        <Panel title="Komposisi Pendapatan Segmen">
          <div style={{ display: 'grid', gap: 9 }}>
            {SEG.map((s, i) => (
              <div key={i}>
                <div className="row jb tiny" style={{ marginBottom: 3 }}><span style={{ fontWeight: 600 }}>{s.seg}</span><span className="mono">{Math.round(s.rev / totRev * 100)}%</span></div>
                <Progress value={Math.round(s.rev / totRev * 100)} color={['#005085', '#1f7a4d', '#7a5cc0'][i]} />
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Kesimpulan SA 501">
          <div className="panel" style={{ padding: '10px 12px', background: 'var(--green-bg)', borderColor: 'transparent' }}>
            <div className="row gap8" style={{ alignItems: 'flex-start' }}>
              <span style={{ color: 'var(--green)', flex: '0 0 auto' }}><I.checkCircle size={15} /></span>
              <span style={{ fontSize: 11.5, lineHeight: 1.45 }}>Informasi segmen disajikan & diungkapkan sesuai PSAK 5; total tersaji <b>rekonsiliasi tepat</b> ke laporan keuangan konsolidasi. Tidak ada salah saji material teridentifikasi.</span>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

Object.assign(window, { SA501View });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { SA501View };
