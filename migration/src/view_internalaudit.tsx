/* [codemod] ESM imports */
import React from 'react';
import { useFirm } from './contexts';
import { I } from './icons';
import { SubBar } from './shell';
import { Badge, Btn, Panel, Progress, Stat, Tabs } from './ui';
import { KvBox } from './view_analytical';

/* ============================================================
   Asseris — Penggunaan Pekerjaan Audit Internal (SA 610)
   Deep workpaper: konteks & strategi, evaluasi fungsi IA,
   penggunaan pekerjaan, reperformansi, bantuan langsung (direct
   assistance), kesimpulan & dampak terhadap audit.
   ============================================================ */
const { useState: useStateIA, useMemo: useMemoIA } = React;

/* ---- IAF profile (reference) ---- */
const IA_PROFILE = {
  unit: 'Satuan Pengawasan Intern (SPI)',
  reportLine: 'Komite Audit (administratif ke Direktur Utama)',
  head: 'Wijaya Kusuma, QIA · CIA',
  headcount: 7,
  certified: 5,
  charter: '14 Feb 2023',
  plan: 'Risk-based annual plan disetujui Komite Audit',
  methodology: 'IPPF (IIA) · ada manual & QA internal',
};

/* ---- Evaluasi fungsi IA: 3 faktor SA 610 ¶16, masing-masing sub-kriteria ---- */
const IA_FACTORS_SEED = [
  { id: 'obj', k: 'Objektivitas', ref: '¶16(a)', v: 4,
    note: 'Status organisasi & kebijakan menjaga objektivitas penilaian.',
    subs: [
      { t: 'SPI melapor fungsional langsung ke Komite Audit', ok: true },
      { t: 'Tidak ada tanggung jawab operasional yang menimbulkan konflik', ok: true },
      { t: 'Kebijakan rotasi & deklarasi independensi anggota SPI ada', ok: true },
      { t: 'Remunerasi tidak dikaitkan dengan area yang diaudit', ok: false, note: 'Skema bonus sebagian terkait KPI divisi — perhatian.' },
    ] },
  { id: 'comp', k: 'Kompetensi', ref: '¶16(b)', v: 4,
    note: 'Kualifikasi, sertifikasi & pengembangan profesional memadai.',
    subs: [
      { t: '5 dari 7 anggota bersertifikat (QIA/CIA)', ok: true },
      { t: 'Pengalaman rata-rata > 6 tahun di bidang audit', ok: true },
      { t: 'Program CPE/PPL terstruktur & terdokumentasi', ok: true },
      { t: 'Kompetensi TI/IT audit untuk lingkungan ERP', ok: false, note: 'Cakupan IT audit masih terbatas pada kontrol umum.' },
    ] },
  { id: 'sys', k: 'Pendekatan Sistematis & Disiplin', ref: '¶16(c)', v: 3,
    note: 'Metodologi, perencanaan berbasis risiko & QA.',
    subs: [
      { t: 'Perencanaan tahunan berbasis risiko & disetujui', ok: true },
      { t: 'Program kerja, kertas kerja & supervisi terdokumentasi', ok: true },
      { t: 'Program QA & peningkatan mutu (QAIP) berjalan penuh', ok: false, note: 'Asesmen mutu eksternal (EQA) belum dilakukan 5 tahun terakhir.' },
      { t: 'Konsistensi dokumentasi antar penugasan', ok: false, note: 'Sebagian KKP belum seragam — temuan inspeksi internal.' },
    ] },
];

/* ---- Area penggunaan pekerjaan IA ---- */
const IA_USE_AREAS = [
  { id: 'U1', area: 'Pengujian pengendalian siklus penggajian', assertion: 'Akurasi · Keterjadian', lead: 'PR-3',
    judgment: 'Rendah', risk: 'Rendah', nature: 'Menggunakan hasil kerja', extent: 'Tinggi', reperf: 0.20, result: 'Memadai',
    desc: 'SPI telah menguji efektivitas operasi pengendalian otorisasi & pemrosesan penggajian sepanjang tahun. Pekerjaan relevan, lingkup memadai untuk diandalkan dengan reperformansi sebagian.' },
  { id: 'U2', area: 'Rekonsiliasi bank & kas rutin', assertion: 'Keberadaan', lead: 'A-2',
    judgment: 'Rendah', risk: 'Rendah', nature: 'Menggunakan hasil kerja', extent: 'Tinggi', reperf: 0.15, result: 'Memadai',
    desc: 'Rekonsiliasi bulanan diuji SPI atas 6 rekening utama. Sifat rutin & pertimbangan rendah — sesuai untuk diandalkan.' },
  { id: 'U3', area: 'Observasi stock opname cabang (3 lokasi)', assertion: 'Keberadaan · Kelengkapan', lead: 'C-1',
    judgment: 'Rendah', risk: 'Moderat', nature: 'Bantuan langsung', extent: 'Sedang', reperf: 0.33, result: 'Memadai',
    desc: 'Anggota SPI memberikan bantuan langsung mendampingi observasi opname di cabang terjauh, di bawah arahan & supervisi tim audit. Penghitungan ulang sebagian dilakukan auditor.' },
  { id: 'U4', area: 'Walkthrough siklus pendapatan', assertion: 'Keterjadian', lead: 'PR-1',
    judgment: 'Sedang', risk: 'Signifikan', nature: 'Menggunakan hasil kerja (terbatas)', extent: 'Rendah', reperf: 0.50, result: 'Perlu Perluasan',
    desc: 'Area mengandung pertimbangan & risiko signifikan (pengakuan pendapatan). Penggunaan dibatasi; reperformansi diperluas dan auditor melaksanakan prosedur substantif sendiri.' },
  { id: 'U5', area: 'Estimasi CKPN (PSAK 71)', assertion: 'Penilaian', lead: 'B-4',
    judgment: 'Tinggi', risk: 'Signifikan', nature: 'Tidak digunakan', extent: '—', reperf: 1.0, result: 'Dikecualikan',
    desc: 'Melibatkan pertimbangan signifikan atas asumsi forward-looking. Sesuai SA 610 ¶15, auditor tidak dapat mengandalkan pekerjaan IA untuk area ini — dikerjakan penuh oleh tim audit.' },
];

/* ---- Reperformansi: sampel pekerjaan IA yang diuji ulang ---- */
const IA_REPERF = [
  { id: 'RP-01', area: 'Penggajian', item: 'Uji 15 sampel otorisasi lembur', iaConcl: 'Efektif', reperf: 'Cocok', exc: 0, status: 'Sesuai' },
  { id: 'RP-02', area: 'Penggajian', item: 'Rekalkulasi 10 slip gaji', iaConcl: 'Akurat', reperf: 'Cocok', exc: 0, status: 'Sesuai' },
  { id: 'RP-03', area: 'Rekonsiliasi Bank', item: 'Telaah ulang 6 rekonsiliasi', iaConcl: 'Sesuai', reperf: 'Cocok', exc: 0, status: 'Sesuai' },
  { id: 'RP-04', area: 'Stock Opname', item: 'Hitung ulang 12 item persediaan', iaConcl: 'Akurat', reperf: '1 selisih minor', exc: 1, status: 'Selisih < CTT' },
  { id: 'RP-05', area: 'Pendapatan', item: 'Telaah ulang walkthrough & 8 sampel', iaConcl: 'Memadai', reperf: '2 dokumentasi kurang', exc: 2, status: 'Perlu Perluasan' },
];

/* ---- Direct assistance: individu & pembatasan ---- */
const IA_DIRECT = [
  { id: 'DA-1', name: 'Sari Anjani (QIA)', task: 'Pendampingan observasi opname cabang Surabaya', superv: 'Dimas R.', review: 'Penuh', hours: 24, status: 'Selesai' },
  { id: 'DA-2', name: 'Bagus Pratama', task: 'Vouching sampel pengeluaran kas (non-judgmental)', superv: 'Dimas R.', review: 'Penuh', hours: 16, status: 'Selesai' },
  { id: 'DA-3', name: 'Sari Anjani (QIA)', task: 'Konfirmasi piutang — penyiapan & follow-up', superv: 'Putri M.', review: 'Penuh', hours: 12, status: 'Berlangsung' },
];

const IA_PROHIBIT = [
  'Prosedur yang melibatkan pertimbangan signifikan (mis. estimasi akuntansi kompleks)',
  'Area dengan risiko salah saji material signifikan / fraud yang lebih tinggi',
  'Pekerjaan yang berkaitan dengan pekerjaan IA itu sendiri (self-review)',
  'Keputusan audit (penilaian kecukupan bukti, materialitas, opini)',
];

/* ============================================================ */
function InternalAudit() {
  const firm = useFirm();
  const client = firm?.activeClient?.name || 'PT Sentosa Makmur Tbk';
  const [tab, setTab] = useStateIA('konteks');
  const [factors, setFactors] = useStateIA(IA_FACTORS_SEED);

  const setV = (id, v) => setFactors(fs => fs.map(f => f.id === id ? { ...f, v } : f));
  const avg = factors.reduce((s, f) => s + f.v, 0) / factors.length;
  const verdict = avg >= 3.5
    ? { k: 'green', label: 'Dapat Diandalkan', t: 'Fungsi audit internal memenuhi ketiga faktor SA 610 ¶16. Pekerjaan dapat digunakan dengan reperformansi atas sebagian, kecuali area pertimbangan signifikan.' }
    : avg >= 2.5
    ? { k: 'amber', label: 'Andalan Terbatas', t: 'Penggunaan terbatas — perluas reperformansi & evaluasi per area. Area pertimbangan signifikan dikerjakan sendiri oleh tim audit.' }
    : { k: 'red', label: 'Tidak Dapat Diandalkan', t: 'Faktor SA 610 tidak terpenuhi — laksanakan seluruh prosedur audit secara mandiri.' };

  const tabs = [
    { id: 'konteks', label: 'Konteks & Strategi' },
    { id: 'evaluasi', label: 'Evaluasi Fungsi IA' },
    { id: 'penggunaan', label: 'Penggunaan Pekerjaan' },
    { id: 'reperform', label: 'Reperformansi' },
    { id: 'direct', label: 'Bantuan Langsung' },
    { id: 'kesimpulan', label: 'Kesimpulan & Dampak' },
  ];

  return (
    <>
      <SubBar moduleId="internalaudit" right={
        <div className="row gap8 ac">
          <Badge kind="blue">SA 610</Badge>
          <Btn sm><I.download size={13} /> Memo Penggunaan IA</Btn>
          <Btn sm variant="primary"><I.check size={14} /> Simpulkan</Btn>
        </div>
      } />
      <div className="view-scroll"><div className="view-pad">

        {/* summary header */}
        <Panel noBody style={{ marginBottom: 12 }}>
          <div style={{ padding: '13px 16px', display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ minWidth: 200 }}>
              <div className="tiny muted upper" style={{ marginBottom: 3 }}>Fungsi Audit Internal</div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{IA_PROFILE.unit}</div>
              <div className="tiny muted">{client}</div>
            </div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Garis Pelaporan</div><div style={{ fontWeight: 600, fontSize: 12, maxWidth: 190, lineHeight: 1.35 }}>{IA_PROFILE.reportLine}</div></div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Tim SPI</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5 }}>{IA_PROFILE.headcount} org · {IA_PROFILE.certified} bersertifikat</div></div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Skor Evaluasi</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5, color: `var(--${verdict.k})` }}>{avg.toFixed(1)} / 5</div></div>
            <div style={{ flex: 1 }} />
            <div style={{ textAlign: 'right' }}>
              <div className="tiny muted upper" style={{ marginBottom: 3 }}>Keputusan Penggunaan</div>
              <Badge kind={verdict.k} dot>{verdict.label}</Badge>
            </div>
          </div>
        </Panel>

        <div style={{ marginBottom: 12 }}><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>

        {tab === 'konteks' && <IAContext />}
        {tab === 'evaluasi' && <IAEvaluation factors={factors} setV={setV} avg={avg} verdict={verdict} />}
        {tab === 'penggunaan' && <IAUsage />}
        {tab === 'reperform' && <IAReperform />}
        {tab === 'direct' && <IADirect />}
        {tab === 'kesimpulan' && <IAConclusion verdict={verdict} />}

      </div></div>
    </>
  );
}

/* ---------------- Tab: Konteks & Strategi ---------------- */
function IAContext() {
  const decision = [
    { q: 'Apakah fungsi IF ada & relevan dengan audit?', a: 'Ya — SPI menguji pengendalian & area yang relevan.', ok: true },
    { q: 'Objektivitas, kompetensi & pendekatan sistematis memadai? (¶16)', a: 'Ya, dengan catatan (lihat Evaluasi). Skor 3,7/5.', ok: true },
    { q: 'Apakah area melibatkan pertimbangan signifikan / risiko signifikan? (¶15)', a: 'Sebagian — area tsb dikecualikan dari penggunaan.', ok: false },
    { q: 'Apakah penggunaan akan menyisakan keterlibatan auditor memadai? (¶18)', a: 'Ya — auditor tetap melaksanakan prosedur signifikan & reperformansi.', ok: true },
  ];
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 360px', gap: 12, alignItems: 'start' }}>
      <div className="grid" style={{ gap: 12 }}>
        <Panel noBody>
          <div className="panel-h"><h3>Tujuan & Lingkup (SA 610)</h3><div style={{ flex: 1 }} /></div>
          <div style={{ padding: 14 }}>
            <p style={{ margin: '0 0 12px', fontSize: 12.5, lineHeight: 1.55, color: 'var(--ink-2)' }}>
              Bila entitas memiliki fungsi audit internal, auditor menentukan apakah <b>pekerjaan fungsi audit internal
              dapat digunakan</b> untuk tujuan audit, dan jika ya, dalam <b>area mana</b> dan sampai <b>sejauh mana</b>.
              Auditor juga dapat memanfaatkan <b>bantuan langsung</b> dari individu fungsi audit internal di bawah arahan,
              supervisi, dan reviu auditor. Tanggung jawab atas opini tetap sepenuhnya pada auditor — tidak berkurang oleh
              penggunaan pekerjaan IA.
            </p>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              {[
                { ic: 'shield', t: 'Evaluasi Fungsi (¶16)', d: 'Objektivitas, kompetensi, dan pendekatan sistematis & disiplin.' },
                { ic: 'layers', t: 'Nature & Extent (¶17–20)', d: 'Menentukan area & seberapa banyak pekerjaan IA digunakan.' },
                { ic: 'flask', t: 'Reperformansi (¶24)', d: 'Auditor melaksanakan kembali sebagian pekerjaan IA yang digunakan.' },
              ].map((c, i) => {
                const Ic = I[c.ic];
                return (
                  <div key={i} className="panel" style={{ padding: '11px 12px', boxShadow: 'none' }}>
                    <span style={{ color: 'var(--blue)' }}><Ic size={18} /></span>
                    <div style={{ fontWeight: 700, fontSize: 12, margin: '6px 0 3px' }}>{c.t}</div>
                    <div className="tiny muted" style={{ lineHeight: 1.4 }}>{c.d}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </Panel>

        <Panel noBody>
          <div className="panel-h"><h3>Pohon Keputusan Penggunaan</h3><div style={{ flex: 1 }} /><Badge kind="green">Memenuhi syarat</Badge></div>
          <div style={{ padding: '6px 14px 14px' }}>
            {decision.map((d, i) => (
              <div key={i} className="row gap10" style={{ padding: '11px 0', alignItems: 'flex-start', borderBottom: i < decision.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
                <span style={{ flex: '0 0 auto', marginTop: 1, color: d.ok ? 'var(--green)' : 'var(--amber)' }}>
                  {d.ok ? <I.checkCircle size={17} /> : <I.alert size={17} />}
                </span>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 2 }}>{d.q}</div>
                  <div className="tiny muted" style={{ lineHeight: 1.4 }}>{d.a}</div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid" style={{ gap: 12 }}>
        <Panel title="Profil Fungsi Audit Internal">
          <div style={{ display: 'grid', gap: 8 }}>
            <KvBox label="Kepala SPI" v={IA_PROFILE.head} />
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <KvBox label="Anggota" v={IA_PROFILE.headcount + ' org'} />
              <KvBox label="Bersertifikat" v={IA_PROFILE.certified + ' / ' + IA_PROFILE.headcount} accent="var(--green)" />
            </div>
            <KvBox label="Piagam Audit Internal" v={'Disahkan ' + IA_PROFILE.charter} />
            <KvBox label="Metodologi" v={IA_PROFILE.methodology} />
            <div className="tiny muted" style={{ lineHeight: 1.4 }}>{IA_PROFILE.plan}.</div>
          </div>
        </Panel>
        <Panel title="Strategi Koordinasi (SA 315/300)">
          <div style={{ display: 'grid', gap: 7 }}>
            {[
              'Peroleh rencana audit internal tahunan & laporan SPI terbit selama periode.',
              'Selaraskan jadwal opname & pengujian pengendalian agar tidak tumpang tindih.',
              'Sepakati protokol akses kertas kerja & komunikasi temuan SPI ke tim audit.',
            ].map((t, i) => (
              <div key={i} className="row gap8" style={{ fontSize: 12, alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--blue)', flex: '0 0 auto', marginTop: 1 }}><I.arrowRight size={14} /></span>{t}
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ---------------- Tab: Evaluasi Fungsi IA ---------------- */
function IAEvaluation({ factors, setV, avg, verdict }) {
  const [selId, setSelId] = useStateIA('obj');
  const sel = factors.find(f => f.id === selId);
  return (
    <div className="grid" style={{ gridTemplateColumns: '360px 1fr', gap: 12, alignItems: 'start' }}>
      <Panel title="Tiga Faktor Evaluasi" sub="SA 610 ¶16 · skala 1–5">
        {factors.map(f => (
          <div key={f.id} onClick={() => setSelId(f.id)}
            style={{ marginBottom: 12, padding: '10px 11px', borderRadius: 8, cursor: 'pointer',
              border: '1px solid ' + (f.id === selId ? 'var(--blue)' : 'var(--line-soft)'),
              background: f.id === selId ? 'var(--blue-050)' : 'transparent' }}>
            <div className="row jb ac" style={{ marginBottom: 6 }}>
              <span className="row ac gap6" style={{ fontSize: 12.5, fontWeight: 700 }}>{f.k}<span className="mono tiny muted">{f.ref}</span></span>
              <span className="mono" style={{ fontWeight: 700, color: f.v >= 4 ? 'var(--green)' : f.v >= 3 ? 'var(--amber)' : 'var(--red)' }}>{f.v}/5</span>
            </div>
            <input type="range" min="1" max="5" value={f.v} onClick={e => e.stopPropagation()} onChange={e => setV(f.id, +e.target.value)} style={{ width: '100%', accentColor: 'var(--blue)' }} />
            <div className="tiny muted" style={{ marginTop: 3, lineHeight: 1.35 }}>{f.note}</div>
          </div>
        ))}
        <div className="divider" />
        <div className="panel" style={{ padding: '11px 12px', background: `var(--${verdict.k}-bg)`, borderColor: 'transparent' }}>
          <div className="row ac gap10">
            <span className="mono" style={{ fontSize: 22, fontWeight: 800, color: `var(--${verdict.k})` }}>{avg.toFixed(1)}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 12.5, color: `var(--${verdict.k})` }}>{verdict.label}</div>
              <div className="tiny" style={{ lineHeight: 1.4, marginTop: 2 }}>{verdict.t}</div>
            </div>
          </div>
        </div>
      </Panel>

      {sel && (
        <Panel noBody>
          <div style={{ background: 'var(--surface-2)', padding: '11px 14px', borderBottom: '1px solid var(--line)' }}>
            <div className="row ac gap8"><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{sel.ref}</span><Badge kind={sel.v >= 4 ? 'green' : sel.v >= 3 ? 'amber' : 'red'}>{sel.v}/5</Badge></div>
            <div style={{ fontWeight: 700, fontSize: 13.5, marginTop: 3 }}>{sel.k}</div>
            <div className="tiny muted">{sel.note}</div>
          </div>
          <table className="dtbl">
            <thead><tr><th>Sub-kriteria Penilaian</th><th style={{ width: 130 }}>Status</th></tr></thead>
            <tbody>
              {sel.subs.map((s, i) => (
                <tr key={i}>
                  <td style={{ whiteSpace: 'normal', lineHeight: 1.4 }}>
                    {s.t}
                    {s.note && <div className="tiny" style={{ color: 'var(--amber)', marginTop: 3 }}>{s.note}</div>}
                  </td>
                  <td>{s.ok
                    ? <span className="row ac gap6 tiny" style={{ color: 'var(--green)', fontWeight: 600 }}><I.check size={13} /> Terpenuhi</span>
                    : <span className="row ac gap6 tiny" style={{ color: 'var(--amber)', fontWeight: 600 }}><I.flag size={13} /> Perhatian</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="panel" style={{ margin: 12, padding: '10px 12px', background: 'var(--blue-050)', borderColor: 'var(--blue-100)' }}>
            <div className="row gap8" style={{ alignItems: 'flex-start' }}>
              <span style={{ color: 'var(--blue)', flex: '0 0 auto' }}><I.book size={15} /></span>
              <span style={{ fontSize: 11.5, lineHeight: 1.45 }}>
                Faktor <b>{sel.k}</b> dievaluasi atas {sel.subs.length} sub-kriteria. Catatan perhatian tidak meniadakan
                penggunaan, namun menyempitkan area & menaikkan tingkat reperformansi atas pekerjaan terkait.
              </span>
            </div>
          </div>
        </Panel>
      )}
    </div>
  );
}

/* ---------------- Tab: Penggunaan Pekerjaan ---------------- */
function IAUsage() {
  const [selId, setSelId] = useStateIA('U1');
  const sel = IA_USE_AREAS.find(a => a.id === selId);
  const judgKind = j => j === 'Tinggi' ? 'red' : j === 'Sedang' ? 'amber' : 'green';
  const natKind = n => n.startsWith('Tidak') ? 'gray' : n.startsWith('Bantuan') ? 'purple' : 'blue';
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 340px', gap: 12, alignItems: 'start' }}>
      <Panel noBody>
        <div className="panel-h"><h3>Area Penggunaan Pekerjaan Audit Internal</h3><div style={{ flex: 1 }} /><span className="tiny muted">{IA_USE_AREAS.length} area</span></div>
        <div className="panel" style={{ margin: 0, padding: '8px 14px', borderRadius: 0, borderLeft: 0, borderRight: 0, borderTop: 0, background: 'var(--blue-050)', display: 'flex', gap: 16, fontSize: 11 }}>
          <span className="muted">Makin tinggi <b>pertimbangan</b> & <b>risiko</b>, makin sedikit pekerjaan IA dapat digunakan dan makin besar reperformansi (SA 610 ¶15, ¶18–19).</span>
        </div>
        <table className="dtbl">
          <thead><tr><th>Area / Prosedur</th><th>Pertimbangan</th><th>Bentuk Penggunaan</th><th style={{ width: 56 }}>Tingkat</th><th style={{ width: 110 }}>Hasil</th></tr></thead>
          <tbody>
            {IA_USE_AREAS.map(a => (
              <tr key={a.id} className={a.id === selId ? 'sel' : ''} onClick={() => setSelId(a.id)} style={{ cursor: 'pointer' }}>
                <td style={{ fontWeight: 600, whiteSpace: 'normal', lineHeight: 1.35 }} className="truncate">{a.area}<div className="tiny muted" style={{ fontWeight: 400 }}>{a.assertion}</div></td>
                <td><Badge kind={judgKind(a.judgment)}>{a.judgment}</Badge></td>
                <td><Badge kind={natKind(a.nature)}>{a.nature}</Badge></td>
                <td className="tiny" style={{ fontWeight: 600, color: a.extent === 'Tinggi' ? 'var(--green)' : a.extent === 'Sedang' ? 'var(--amber)' : 'var(--ink-3)' }}>{a.extent}</td>
                <td><Badge kind={a.result === 'Memadai' ? 'green' : a.result === 'Dikecualikan' ? 'red' : 'amber'}>{a.result}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
      {sel && (
        <Panel noBody>
          <div style={{ background: 'var(--surface-2)', padding: '11px 14px', borderBottom: '1px solid var(--line)' }}>
            <div className="row ac gap8"><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>Lead {sel.lead}</span><Badge kind={natKind(sel.nature)}>{sel.nature}</Badge></div>
            <div style={{ fontWeight: 700, fontSize: 13, marginTop: 3, lineHeight: 1.3 }}>{sel.area}</div>
            <div className="tiny muted">{sel.assertion}</div>
          </div>
          <div style={{ padding: 14 }}>
            <div className="tiny muted upper" style={{ marginBottom: 4 }}>Pertimbangan Penggunaan</div>
            <p style={{ margin: '0 0 12px', fontSize: 12, lineHeight: 1.5 }}>{sel.desc}</p>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <KvBox label="Pertimbangan" v={sel.judgment} accent={judgKind(sel.judgment) === 'red' ? 'var(--red)' : judgKind(sel.judgment) === 'amber' ? 'var(--amber)' : 'var(--green)'} />
              <KvBox label="Risiko (RMM)" v={sel.risk} accent={sel.risk === 'Signifikan' ? 'var(--red)' : sel.risk === 'Moderat' ? 'var(--amber)' : 'var(--green)'} />
            </div>
            <div className="tiny muted upper" style={{ marginBottom: 5 }}>Tingkat Reperformansi Direncanakan</div>
            <div className="row ac gap8" style={{ marginBottom: 12 }}>
              <div style={{ flex: 1 }}><Progress value={sel.reperf * 100} color={sel.reperf >= 1 ? 'var(--red)' : sel.reperf >= 0.5 ? 'var(--amber)' : 'var(--green)'} /></div>
              <span className="mono tiny" style={{ fontWeight: 700 }}>{Math.round(sel.reperf * 100)}%</span>
            </div>
            {sel.result === 'Dikecualikan' && (
              <div className="panel" style={{ padding: '9px 11px', background: 'var(--red-bg)', borderColor: 'transparent', marginBottom: 12 }}>
                <div className="row ac gap8"><span style={{ color: 'var(--red)' }}><I.alert size={15} /></span><span style={{ fontSize: 11.5, lineHeight: 1.4 }}>Pertimbangan signifikan — SA 610 ¶15 melarang pengandalan. Dikerjakan penuh oleh tim audit.</span></div>
              </div>
            )}
            <Btn sm variant="primary" style={{ width: '100%' }}><I.flask size={14} /> Buka WP {sel.lead}</Btn>
          </div>
        </Panel>
      )}
    </div>
  );
}

/* ---------------- Tab: Reperformansi ---------------- */
function IAReperform() {
  const totExc = IA_REPERF.reduce((s, r) => s + r.exc, 0);
  const ok = IA_REPERF.filter(r => r.status === 'Sesuai').length;
  return (
    <div className="grid" style={{ gap: 12 }}>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={IA_REPERF.length} label="Pos Diuji Ulang" /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={ok} label="Konsisten dgn IA" accent="var(--green)" /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={totExc} label="Pengecualian" accent={totExc ? 'var(--amber)' : 'var(--green)'} /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={'1'} label="Area Perlu Perluasan" accent="var(--amber)" /></div></Panel>
      </div>
      <Panel noBody>
        <div className="panel-h"><h3>Reperformansi atas Pekerjaan IA yang Digunakan (¶24)</h3><div style={{ flex: 1 }} /><span className="tiny muted">Auditor melaksanakan kembali sebagian pekerjaan</span></div>
        <table className="dtbl">
          <thead><tr><th style={{ width: 64 }}>Ref</th><th>Area</th><th>Pos yang Direperform</th><th>Simpulan IA</th><th>Hasil Auditor</th><th className="num" style={{ width: 64 }}>Selisih</th><th style={{ width: 130 }}>Status</th></tr></thead>
          <tbody>
            {IA_REPERF.map(r => (
              <tr key={r.id}>
                <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{r.id}</td>
                <td style={{ fontWeight: 600 }}>{r.area}</td>
                <td className="tiny">{r.item}</td>
                <td className="tiny muted">{r.iaConcl}</td>
                <td className="tiny">{r.reperf}</td>
                <td className="num mono" style={{ color: r.exc ? 'var(--amber)' : 'var(--ink-4)', fontWeight: 700 }}>{r.exc || '—'}</td>
                <td>{r.status === 'Sesuai'
                  ? <span className="row ac gap6 tiny" style={{ color: 'var(--green)', fontWeight: 600 }}><I.check size={13} /> Sesuai</span>
                  : <Badge kind={r.status === 'Perlu Perluasan' ? 'red' : 'amber'}>{r.status}</Badge>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="panel" style={{ margin: 12, padding: '10px 12px', background: 'var(--amber-bg)', borderColor: 'transparent' }}>
          <div className="row gap8" style={{ alignItems: 'flex-start' }}>
            <span style={{ color: 'var(--amber)', flex: '0 0 auto' }}><I.flask size={15} /></span>
            <span style={{ fontSize: 11.5, lineHeight: 1.45 }}>
              Reperformansi mengonfirmasi simpulan SPI pada area penggajian, bank & opname (selisih opname &lt; clearly
              trivial threshold). Pada <b>siklus pendapatan</b>, ditemukan 2 kekurangan dokumentasi — tim audit
              <b> memperluas pengujian substantif sendiri</b> dan tidak mengandalkan pekerjaan IA atas area tersebut.
            </span>
          </div>
        </div>
      </Panel>
    </div>
  );
}

/* ---------------- Tab: Bantuan Langsung ---------------- */
function IADirect() {
  const totHrs = IA_DIRECT.reduce((s, d) => s + d.hours, 0);
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 340px', gap: 12, alignItems: 'start' }}>
      <div className="grid" style={{ gap: 12 }}>
        <Panel noBody>
          <div className="panel-h"><h3>Individu yang Memberikan Bantuan Langsung (¶26–33)</h3><div style={{ flex: 1 }} /><span className="tiny muted">{totHrs} jam</span></div>
          <table className="dtbl">
            <thead><tr><th style={{ width: 56 }}>Ref</th><th>Individu</th><th>Tugas yang Diberikan</th><th>Supervisi</th><th>Reviu</th><th className="num" style={{ width: 52 }}>Jam</th><th style={{ width: 96 }}>Status</th></tr></thead>
            <tbody>
              {IA_DIRECT.map(d => (
                <tr key={d.id}>
                  <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{d.id}</td>
                  <td style={{ fontWeight: 600 }}>{d.name}</td>
                  <td className="tiny" style={{ whiteSpace: 'normal', lineHeight: 1.35 }}>{d.task}</td>
                  <td className="tiny muted">{d.superv}</td>
                  <td><Badge kind="green">{d.review}</Badge></td>
                  <td className="num mono">{d.hours}</td>
                  <td>{d.status === 'Selesai'
                    ? <span className="row ac gap6 tiny" style={{ color: 'var(--green)', fontWeight: 600 }}><I.check size={13} /> Selesai</span>
                    : <Badge kind="amber">Berlangsung</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
        <Panel noBody>
          <div className="panel-h"><h3>Pembatasan Bantuan Langsung (¶30–31)</h3><div style={{ flex: 1 }} /><Badge kind="red">Dilarang</Badge></div>
          <div style={{ padding: '6px 14px 14px' }}>
            <p className="tiny muted" style={{ margin: '4px 0 10px', lineHeight: 1.45 }}>Individu IA <b>tidak boleh</b> ditugaskan untuk hal-hal berikut saat memberikan bantuan langsung:</p>
            {IA_PROHIBIT.map((t, i) => (
              <div key={i} className="row gap8" style={{ padding: '8px 0', alignItems: 'flex-start', borderBottom: i < IA_PROHIBIT.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
                <span style={{ color: 'var(--red)', flex: '0 0 auto', marginTop: 1 }}><I.x size={15} /></span>
                <span style={{ fontSize: 12, lineHeight: 1.4 }}>{t}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid" style={{ gap: 12 }}>
        <Panel title="Prasyarat Bantuan Langsung">
          <div style={{ display: 'grid', gap: 7 }}>
            {[
              { t: 'Evaluasi ancaman objektivitas & kompetensi individu (¶29)', ok: true },
              { t: 'Persetujuan tertulis entitas — individu boleh ikuti instruksi auditor (¶33a)', ok: true },
              { t: 'Persetujuan tertulis individu IA — jaga kerahasiaan (¶33b)', ok: true },
              { t: 'Arahan, supervisi & reviu memadai oleh auditor (¶34)', ok: true },
            ].map((r, i) => (
              <div key={i} className="row gap8" style={{ fontSize: 11.5, alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--green)', flex: '0 0 auto', marginTop: 1 }}><I.checkCircle size={15} /></span>
                <span style={{ lineHeight: 1.4 }}>{r.t}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Reviu Pekerjaan Bantuan Langsung">
          <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.5, color: 'var(--ink-2)' }}>
            Seluruh pekerjaan bantuan langsung direviu <b>100%</b> oleh anggota tim audit yang lebih senior.
            Sifat tugas dibatasi pada prosedur <b>non-judgmental</b> (observasi, vouching, penghitungan ulang).
            Auditor tetap mempertimbangkan kembali kecukupan keterlibatannya sendiri (¶32).
          </p>
        </Panel>
      </div>
    </div>
  );
}

/* ---------------- Tab: Kesimpulan & Dampak ---------------- */
function IAConclusion({ verdict }) {
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 340px', gap: 12, alignItems: 'start' }}>
      <div className="grid" style={{ gap: 12 }}>
        <Panel noBody>
          <div className="panel-h"><h3>Dampak terhadap Strategi & Lingkup Audit (¶18)</h3><div style={{ flex: 1 }} /></div>
          <table className="dtbl">
            <thead><tr><th>Area</th><th>Tanpa Penggunaan IA</th><th>Dengan Penggunaan IA</th><th style={{ width: 120 }}>Efek</th></tr></thead>
            <tbody>
              {[
                { a: 'Pengujian pengendalian penggajian', wo: '40 sampel sendiri', w: '20 sampel + reperform 20%', e: 'Efisiensi' },
                { a: 'Rekonsiliasi bank', wo: '12 rekonsiliasi', w: 'Andalkan IA + reperform 15%', e: 'Efisiensi' },
                { a: 'Observasi opname cabang', wo: '3 tim ke 3 lokasi', w: 'Bantuan langsung di 1 lokasi', e: 'Efisiensi' },
                { a: 'Pengakuan pendapatan', wo: 'Substantif penuh', w: 'Substantif penuh (tdk berubah)', e: 'Tidak berubah' },
                { a: 'CKPN (PSAK 71)', wo: 'Dikerjakan tim audit', w: 'Dikerjakan tim audit', e: 'Tidak berubah' },
              ].map((r, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{r.a}</td>
                  <td className="tiny muted">{r.wo}</td>
                  <td className="tiny">{r.w}</td>
                  <td>{r.e === 'Efisiensi' ? <Badge kind="green">{r.e}</Badge> : <Badge kind="gray">{r.e}</Badge>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <Panel title="Kesimpulan Auditor (SA 610)">
          <p style={{ margin: '0 0 10px', fontSize: 12.5, lineHeight: 1.6 }}>
            Fungsi audit internal (SPI) entitas dinilai memenuhi faktor <b>objektivitas, kompetensi, serta pendekatan
            sistematis & disiplin</b> (skor {verdict.label === 'Dapat Diandalkan' ? '≥ 3,5' : 'evaluasi'}). Pekerjaan IA
            <b> digunakan untuk area berpertimbangan & berisiko rendah hingga moderat</b> dengan reperformansi atas
            sebagian pekerjaan. Area yang melibatkan <b>pertimbangan signifikan</b> (pengakuan pendapatan, CKPN PSAK 71)
            <b> dikecualikan</b> sesuai SA 610 ¶15 dan dikerjakan sepenuhnya oleh tim audit. Bantuan langsung dibatasi
            pada prosedur non-judgmental, dengan arahan, supervisi, dan reviu penuh. <b>Keterlibatan auditor tetap
            memadai</b> dan tanggung jawab atas opini tidak berkurang.
          </p>
          <div className="panel" style={{ padding: '10px 12px', background: `var(--${verdict.k}-bg)`, borderColor: 'transparent' }}>
            <div className="row ac gap8"><span style={{ color: `var(--${verdict.k})` }}><I.checkCircle size={16} /></span><span style={{ fontSize: 12, fontWeight: 600 }}>Penggunaan pekerjaan IA terdokumentasi memadai — siap dirujuk ke strategi audit & ringkasan reviu.</span></div>
          </div>
        </Panel>
      </div>

      <div className="grid" style={{ gap: 12 }}>
        <Panel title="Dokumentasi (¶36–37)">
          <div style={{ display: 'grid', gap: 6 }}>
            {[
              { t: 'Evaluasi tiga faktor fungsi IA', wp: 'A-610.1' },
              { t: 'Nature & extent penggunaan', wp: 'A-610.2' },
              { t: 'Hasil reperformansi', wp: 'A-610.3' },
              { t: 'Perjanjian & reviu bantuan langsung', wp: 'A-610.4' },
            ].map((r, i) => (
              <div key={i} className="row jb ac" style={{ fontSize: 12, padding: '7px 9px', border: '1px solid var(--line-soft)', borderRadius: 6 }}>
                <span className="row ac gap8"><span style={{ color: 'var(--blue)' }}><I.doc size={14} /></span>{r.t}</span>
                <span className="mono tiny" style={{ color: 'var(--blue)', fontWeight: 700 }}>{r.wp}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Sign-off">
          <div style={{ display: 'grid', gap: 9 }}>
            {[
              { role: 'Disiapkan', who: 'Dimas Raharjo', when: '07 Mar', done: true },
              { role: 'Direview', who: 'Anindya Pramesti', when: '09 Mar', done: true },
              { role: 'Disetujui Partner', who: 'Hartono Wijaya', when: '—', done: false },
            ].map((s, i) => (
              <div key={i} className="row jb ac" style={{ fontSize: 12, paddingBottom: 8, borderBottom: i < 2 ? '1px solid var(--line-soft)' : 0 }}>
                <div><div className="tiny muted upper">{s.role}</div><div style={{ fontWeight: 600 }}>{s.who}</div></div>
                {s.done ? <span className="row ac gap6 tiny" style={{ color: 'var(--green)', fontWeight: 600 }}><I.checkCircle size={14} /> {s.when}</span> : <Badge kind="amber">Menunggu</Badge>}
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

Object.assign(window, { InternalAudit });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { InternalAudit };
