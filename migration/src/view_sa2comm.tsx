/* [codemod] ESM imports */
import React from 'react';
import { useFirm } from './contexts.jsx';
import { I } from './icons.jsx';
import { SubBar } from './shell.jsx';
import { Badge, Btn, Panel, Tabs } from './ui.jsx';
import { KvBox } from './view_analytical.jsx';

/* ============================================================
   NeoSuite AMS — SA 250 / 260 / 265
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

const NOCLAR_REGISTER = [
  { id: 'NC-01', area: 'Perpajakan', cat: 'direct', desc: 'Koreksi PPN masukan yang dikreditkan atas faktur tidak lengkap — potensi kurang bayar & sanksi.', fsImpact: 'Material — provisi pajak', status: 'Dievaluasi', sev: 'Tinggi' },
  { id: 'NC-02', area: 'Lingkungan', cat: 'indirect', desc: 'Perpanjangan izin pengolahan limbah (IPLC) cabang Bekasi terlambat 2 bulan.', fsImpact: 'Tidak material langsung; risiko sanksi/penghentian', status: 'Dipantau', sev: 'Sedang' },
  { id: 'NC-03', area: 'Ketenagakerjaan', cat: 'indirect', desc: 'Tunggakan iuran BPJS Ketenagakerjaan 1 bulan — telah dilunasi pasca-periode.', fsImpact: 'Tidak material', status: 'Selesai', sev: 'Rendah' },
  { id: 'NC-04', area: 'Perizinan', cat: 'indirect', desc: 'Indikasi transaksi tanpa kontrak baku pada 1 segmen — dugaan, perlu klarifikasi hukum.', fsImpact: 'Dalam evaluasi', status: 'Investigasi', sev: 'Sedang' },
];

function SA250View() {
  const firm = useFirm();
  const client = firm?.activeClient?.name || 'PT Sentosa Makmur Tbk';
  const [tab, setTab] = useStateSC('kerangka');
  const tabs = [{ id: 'kerangka', label: 'Kerangka & Kategori' }, { id: 'register', label: 'Register Ketidakpatuhan' }, { id: 'pelaporan', label: 'Respons & Pelaporan' }];
  return (
    <>
      <SubBar moduleId="sa250" right={<div className="row gap8 ac"><Badge kind="amber" dot>{NOCLAR_REGISTER.filter(r => r.status === 'Investigasi' || r.status === 'Dievaluasi').length} dalam tindak lanjut</Badge><Btn sm><I.download size={13} /> Memo NOCLAR</Btn><Btn sm variant="primary"><I.sparkle size={14} /> AI Assist</Btn></div>} />
      <div className="view-scroll"><div className="view-pad">
        <Panel noBody style={{ marginBottom: 12 }}>
          <div style={{ padding: '13px 16px', display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ minWidth: 210 }}><div className="tiny muted upper" style={{ marginBottom: 3 }}>Standar Audit 250</div><div style={{ fontWeight: 700, fontSize: 13 }}>Hukum & Regulasi (NOCLAR)</div><div className="tiny muted">{client} · ENG-2025-014</div></div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Ketidakpatuhan</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5 }}>{NOCLAR_REGISTER.length} teridentifikasi</div></div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Dampak Langsung LK</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--red)' }}>1 material</div></div>
            <div style={{ flex: 1 }} />
            <div style={{ textAlign: 'right' }}><div className="tiny muted upper" style={{ marginBottom: 3 }}>Tanggung Jawab Utama</div><Badge kind="blue">Kepatuhan = Manajemen</Badge></div>
          </div>
        </Panel>
        <div style={{ marginBottom: 12 }}><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>
        {tab === 'kerangka' && <S250Framework />}
        {tab === 'register' && <S250Register />}
        {tab === 'pelaporan' && <S250Reporting />}
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

function S250Register() {
  const [selId, setSelId] = useStateSC('NC-01');
  const sel = NOCLAR_REGISTER.find(r => r.id === selId);
  const sevKind = s => s === 'Tinggi' ? 'red' : s === 'Sedang' ? 'amber' : 'gray';
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 360px', gap: 12, alignItems: 'start' }}>
      <Panel noBody>
        <div className="panel-h"><h3>Register Ketidakpatuhan</h3><div style={{ flex: 1 }} /><span className="tiny muted">{NOCLAR_REGISTER.length} pos</span></div>
        <table className="dtbl">
          <thead><tr><th style={{ width: 56 }}>Ref</th><th>Area / Uraian</th><th style={{ width: 92 }}>Kategori</th><th style={{ width: 84 }}>Status</th></tr></thead>
          <tbody>
            {NOCLAR_REGISTER.map(r => (
              <tr key={r.id} className={r.id === selId ? 'sel' : ''} onClick={() => setSelId(r.id)} style={{ cursor: 'pointer' }}>
                <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{r.id}</td>
                <td style={{ fontWeight: 600, whiteSpace: 'normal', lineHeight: 1.35 }}>{r.area}<div className="tiny muted" style={{ fontWeight: 400, marginTop: 1 }}>{r.desc}</div></td>
                <td><Badge kind={r.cat === 'direct' ? 'red' : 'amber'}>{r.cat === 'direct' ? 'Langsung' : 'Operasi'}</Badge></td>
                <td><Badge kind={r.status === 'Selesai' ? 'green' : r.status === 'Investigasi' ? 'red' : 'amber'}>{r.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
      {sel && (
        <Panel noBody>
          <div style={{ background: 'var(--surface-2)', padding: '11px 14px', borderBottom: '1px solid var(--line)' }}>
            <div className="row ac gap8"><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{sel.id}</span><Badge kind={sevKind(sel.sev)}>{sel.sev}</Badge><Badge kind={sel.cat === 'direct' ? 'red' : 'amber'}>{sel.cat === 'direct' ? 'Dampak Langsung' : 'Fundamental Operasi'}</Badge></div>
            <div style={{ fontWeight: 700, fontSize: 13, marginTop: 4 }}>{sel.area}</div>
          </div>
          <div style={{ padding: 14 }}>
            <p style={{ margin: '0 0 12px', fontSize: 12, lineHeight: 1.5 }}>{sel.desc}</p>
            <KvBox label="Dampak terhadap LK" v={sel.fsImpact} accent={sel.fsImpact.startsWith('Material') ? 'var(--red)' : 'var(--ink-3)'} />
            <div style={{ height: 10 }} />
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
          </div>
        </Panel>
      )}
    </div>
  );
}

function S250Reporting() {
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 340px', gap: 12, alignItems: 'start' }}>
      <Panel noBody>
        <div className="panel-h"><h3>Jenjang Pelaporan Ketidakpatuhan</h3><div style={{ flex: 1 }} /></div>
        <table className="dtbl">
          <thead><tr><th>Penerima</th><th>Kondisi</th><th style={{ width: 64 }}>Ref</th><th style={{ width: 120 }}>Status</th></tr></thead>
          <tbody>
            {[
              { to: 'Manajemen', cond: 'Ketidakpatuhan selain yang jelas tidak signifikan', ref: '¶22', st: 'Dilakukan', k: 'green' },
              { to: 'Pihak Tata Kelola (TCWG)', cond: 'Bila melibatkan manajemen, atau disengaja & material', ref: '¶23', st: 'Dijadwalkan', k: 'blue' },
              { to: 'Otoritas / Regulator', cond: 'Bila diwajibkan hukum (dapat mengalahkan kerahasiaan)', ref: '¶28–29', st: 'Tidak berlaku', k: 'gray' },
              { to: 'Laporan Auditor', cond: 'Bila ketidakpatuhan berdampak material & tidak tercermin memadai', ref: '¶26', st: 'Tidak diperlukan', k: 'gray' },
            ].map((r, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 600 }}>{r.to}</td>
                <td className="tiny" style={{ whiteSpace: 'normal', lineHeight: 1.4 }}>{r.cond}</td>
                <td className="mono tiny" style={{ color: 'var(--blue)', fontWeight: 700 }}>{r.ref}</td>
                <td><Badge kind={r.k}>{r.st}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="panel" style={{ margin: 12, padding: '10px 12px', background: 'var(--blue-050)', borderColor: 'var(--blue-100)' }}>
          <div className="row gap8" style={{ alignItems: 'flex-start' }}><span style={{ color: 'var(--blue)', flex: '0 0 auto' }}><I.book size={15} /></span><span style={{ fontSize: 11.5, lineHeight: 1.45 }}>Tanggung jawab mencegah & mendeteksi ketidakpatuhan ada pada <b>manajemen & TCWG</b>. Auditor bukan penegak hukum; tujuannya memperoleh bukti & merespons ketidakpatuhan yang teridentifikasi.</span></div>
        </div>
      </Panel>
      <div className="grid" style={{ gap: 12 }}>
        <Panel title="Dampak terhadap Opini">
          <div style={{ display: 'grid', gap: 7 }}>
            {[
              { t: 'Ketidakpatuhan langsung tercermin memadai dalam LK', ok: true },
              { t: 'Provisi pajak (NC-01) dievaluasi & cukup', ok: true },
              { t: 'NC-04 selesai diinvestigasi', ok: false },
            ].map((r, i) => (
              <div key={i} className="row gap8" style={{ fontSize: 11.5, alignItems: 'flex-start' }}><span style={{ color: r.ok ? 'var(--green)' : 'var(--amber)', flex: '0 0 auto', marginTop: 1 }}>{r.ok ? <I.checkCircle size={15} /> : <I.clock size={15} />}</span><span style={{ lineHeight: 1.4 }}>{r.t}</span></div>
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
const TCWG_MATRIX = [
  { id: 'M1', item: 'Tanggung jawab auditor terkait audit LK', ref: '¶14', form: 'Tertulis', when: 'Perencanaan', status: 'Selesai', via: 'Surat Perikatan' },
  { id: 'M2', item: 'Lingkup & saat audit yang direncanakan', ref: '¶15', form: 'Lisan', when: 'Perencanaan', status: 'Selesai', via: 'Rapat pembukaan' },
  { id: 'M3', item: 'Temuan signifikan dari audit', ref: '¶16', form: 'Tertulis', when: 'Penyelesaian', status: 'Berlangsung', via: 'Laporan kepada TCWG' },
  { id: 'M4', item: 'Pandangan auditor atas kualitas praktik akuntansi', ref: '¶16(a)', form: 'Tertulis', when: 'Penyelesaian', status: 'Berlangsung', via: 'Laporan kepada TCWG' },
  { id: 'M5', item: 'Pernyataan independensi (entitas terdaftar)', ref: '¶17', form: 'Tertulis', when: 'Penyelesaian', status: 'Dijadwalkan', via: 'Surat independensi' },
  { id: 'M6', item: 'Kesulitan signifikan selama audit', ref: '¶16(b)', form: 'Tertulis', when: 'Penyelesaian', status: 'Tidak ada', via: '—' },
];

const TCWG_FINDINGS = [
  { t: 'Estimasi CKPN — telaah retrospektif menunjukkan understatement berulang', area: 'Estimasi', sev: 'Tinggi', link: 'SA 240 / 540' },
  { t: 'Defisiensi signifikan pengendalian penutupan & jurnal manual', area: 'Pengendalian', sev: 'Tinggi', link: 'SA 265' },
  { t: 'Konsentrasi pendapatan akhir periode & uji cut-off', area: 'Pendapatan', sev: 'Sedang', link: 'SA 240' },
  { t: 'Keterlambatan perpanjangan izin lingkungan (IPLC)', area: 'Kepatuhan', sev: 'Sedang', link: 'SA 250' },
];

function SA260View() {
  const firm = useFirm();
  const client = firm?.activeClient?.name || 'PT Sentosa Makmur Tbk';
  const [tab, setTab] = useStateSC('pihak');
  const tabs = [{ id: 'pihak', label: 'Pihak & Bentuk' }, { id: 'matriks', label: 'Matriks Komunikasi' }, { id: 'temuan', label: 'Temuan Signifikan' }];
  const done = TCWG_MATRIX.filter(m => m.status === 'Selesai').length;
  return (
    <>
      <SubBar moduleId="sa260" right={<div className="row gap8 ac"><Badge kind="blue">{done}/{TCWG_MATRIX.length} terkomunikasikan</Badge><Btn sm><I.download size={13} /> Laporan ke TCWG</Btn><Btn sm variant="primary"><I.sparkle size={14} /> AI Assist</Btn></div>} />
      <div className="view-scroll"><div className="view-pad">
        <Panel noBody style={{ marginBottom: 12 }}>
          <div style={{ padding: '13px 16px', display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ minWidth: 210 }}><div className="tiny muted upper" style={{ marginBottom: 3 }}>Standar Audit 260</div><div style={{ fontWeight: 700, fontSize: 13 }}>Komunikasi dengan TCWG</div><div className="tiny muted">{client} · ENG-2025-014</div></div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Pihak Tata Kelola</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5 }}>Komite Audit (3 anggota)</div></div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Temuan Signifikan</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--amber)' }}>{TCWG_FINDINGS.length} hal</div></div>
            <div style={{ flex: 1 }} />
            <div style={{ textAlign: 'right' }}><div className="tiny muted upper" style={{ marginBottom: 3 }}>Komunikasi</div><Badge kind="blue" dot>Dua Arah</Badge></div>
          </div>
        </Panel>
        <div style={{ marginBottom: 12 }}><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>
        {tab === 'pihak' && <S260Parties />}
        {tab === 'matriks' && <S260Matrix done={done} />}
        {tab === 'temuan' && <S260Findings />}
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

function S260Matrix({ done }) {
  const stKind = s => s === 'Selesai' ? 'green' : s === 'Berlangsung' ? 'blue' : s === 'Tidak ada' ? 'gray' : 'amber';
  return (
    <Panel noBody>
      <div className="panel-h"><h3>Matriks Komunikasi TCWG (¶14–17)</h3><div style={{ flex: 1 }} /><Badge kind="green">{done} selesai</Badge></div>
      <table className="dtbl">
        <thead><tr><th style={{ width: 48 }}>Ref</th><th>Hal yang Dikomunikasikan</th><th style={{ width: 64 }}>SA</th><th style={{ width: 84 }}>Bentuk</th><th style={{ width: 110 }}>Saat</th><th>Saluran</th><th style={{ width: 110 }}>Status</th></tr></thead>
        <tbody>
          {TCWG_MATRIX.map(m => (
            <tr key={m.id}>
              <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{m.id}</td>
              <td style={{ fontWeight: 600, whiteSpace: 'normal', lineHeight: 1.35 }}>{m.item}</td>
              <td className="mono tiny" style={{ color: 'var(--blue)', fontWeight: 700 }}>{m.ref}</td>
              <td>{m.form === 'Tertulis' ? <Badge kind="blue">Tertulis</Badge> : <span className="tiny muted">{m.form}</span>}</td>
              <td className="tiny">{m.when}</td>
              <td className="tiny muted">{m.via}</td>
              <td><Badge kind={stKind(m.status)}>{m.status}</Badge></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="panel" style={{ margin: 12, padding: '10px 12px', background: 'var(--blue-050)', borderColor: 'var(--blue-100)' }}><div className="row gap8" style={{ alignItems: 'flex-start' }}><span style={{ color: 'var(--blue)', flex: '0 0 auto' }}><I.book size={15} /></span><span style={{ fontSize: 11.5, lineHeight: 1.45 }}>Defisiensi signifikan pengendalian internal dikomunikasikan tertulis sesuai <b>SA 265</b>; hal terkait kecurangan sesuai <b>SA 240</b>. Matriks ini memastikan tidak ada hal wajib yang terlewat.</span></div></div>
    </Panel>
  );
}

function S260Findings() {
  const sevKind = s => s === 'Tinggi' ? 'red' : s === 'Sedang' ? 'amber' : 'gray';
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 340px', gap: 12, alignItems: 'start' }}>
      <Panel noBody>
        <div className="panel-h"><h3>Temuan Signifikan dari Audit (¶16)</h3><div style={{ flex: 1 }} /><span className="tiny muted">{TCWG_FINDINGS.length} hal</span></div>
        <div style={{ padding: '4px 0' }}>
          {TCWG_FINDINGS.map((f, i) => (
            <div key={i} className="row gap10" style={{ padding: '12px 14px', alignItems: 'flex-start', borderBottom: i < TCWG_FINDINGS.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
              <span style={{ flex: '0 0 auto', marginTop: 1, color: `var(--${sevKind(f.sev)})` }}><I.flag size={16} /></span>
              <div style={{ flex: 1 }}><div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.4 }}>{f.t}</div><div className="tiny muted" style={{ marginTop: 3 }}>Area: {f.area}</div></div>
              <div className="row ac gap6" style={{ flex: '0 0 auto' }}><span className="chip tiny" style={{ height: 18 }}>{f.link}</span><Badge kind={sevKind(f.sev)}>{f.sev}</Badge></div>
            </div>
          ))}
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
        <Panel title="Sign-off">
          {[{ role: 'Disiapkan', who: 'Anindya Pramesti', when: '10 Mar', done: true }, { role: 'Disetujui Partner', who: 'Hartono Wijaya', when: '—', done: false }].map((s, i) => (
            <div key={i} className="row jb ac" style={{ fontSize: 12, paddingBottom: 8, borderBottom: i < 1 ? '1px solid var(--line-soft)' : 0, marginBottom: i < 1 ? 8 : 0 }}>
              <div><div className="tiny muted upper">{s.role}</div><div style={{ fontWeight: 600 }}>{s.who}</div></div>
              {s.done ? <span className="row ac gap6 tiny" style={{ color: 'var(--green)', fontWeight: 600 }}><I.checkCircle size={14} /> {s.when}</span> : <Badge kind="amber">Menunggu</Badge>}
            </div>
          ))}
        </Panel>
      </div>
    </div>
  );
}

/* ============================================================
   SA 265 · DEFISIENSI PENGENDALIAN INTERNAL
   ============================================================ */
const DEFICIENCIES = [
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
  const client = firm?.activeClient?.name || 'PT Sentosa Makmur Tbk';
  const [tab, setTab] = useStateSC('register');
  const sig = DEFICIENCIES.filter(d => d.sig).length;
  const tabs = [{ id: 'register', label: 'Register & Klasifikasi' }, { id: 'indikator', label: 'Indikator Signifikan' }, { id: 'komunikasi', label: 'Komunikasi' }];
  return (
    <>
      <SubBar moduleId="sa265" right={<div className="row gap8 ac"><Badge kind="red" dot>{sig} defisiensi signifikan</Badge><Btn sm><I.download size={13} /> Surat ke TCWG</Btn><Btn sm variant="primary"><I.sparkle size={14} /> AI Assist</Btn></div>} />
      <div className="view-scroll"><div className="view-pad">
        <Panel noBody style={{ marginBottom: 12 }}>
          <div style={{ padding: '13px 16px', display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ minWidth: 210 }}><div className="tiny muted upper" style={{ marginBottom: 3 }}>Standar Audit 265</div><div style={{ fontWeight: 700, fontSize: 13 }}>Defisiensi Pengendalian Internal</div><div className="tiny muted">{client} · ENG-2025-014</div></div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Teridentifikasi</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5 }}>{DEFICIENCIES.length} defisiensi</div></div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Signifikan</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--red)' }}>{sig} → tertulis TCWG</div></div>
            <div style={{ flex: 1 }} />
            <div style={{ textAlign: 'right' }}><div className="tiny muted upper" style={{ marginBottom: 3 }}>Komunikasi</div><Badge kind="red" dot>Tertulis Wajib (¶9)</Badge></div>
          </div>
        </Panel>
        <div style={{ marginBottom: 12 }}><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>
        {tab === 'register' && <S265Register />}
        {tab === 'indikator' && <S265Indicators />}
        {tab === 'komunikasi' && <S265Comms sig={sig} />}
      </div></div>
    </>
  );
}

function S265Register() {
  const [selId, setSelId] = useStateSC('D-01');
  const sel = DEFICIENCIES.find(d => d.id === selId);
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 360px', gap: 12, alignItems: 'start' }}>
      <Panel noBody>
        <div className="panel-h"><h3>Register Defisiensi Pengendalian</h3><div style={{ flex: 1 }} /><span className="tiny muted">{DEFICIENCIES.length} pos · {DEFICIENCIES.filter(d => d.sig).length} signifikan</span></div>
        <table className="dtbl">
          <thead><tr><th style={{ width: 48 }}>Ref</th><th>Defisiensi</th><th style={{ width: 96 }}>Klasifikasi</th><th style={{ width: 130 }}>Komunikasi</th></tr></thead>
          <tbody>
            {DEFICIENCIES.map(d => (
              <tr key={d.id} className={d.id === selId ? 'sel' : ''} onClick={() => setSelId(d.id)} style={{ cursor: 'pointer' }}>
                <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{d.id}</td>
                <td style={{ fontWeight: 600, whiteSpace: 'normal', lineHeight: 1.35 }}>{d.t}</td>
                <td><Badge kind={d.sig ? 'red' : 'gray'}>{d.sig ? 'Signifikan' : 'Biasa'}</Badge></td>
                <td className="tiny muted">{d.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="panel" style={{ margin: 12, padding: '10px 12px', background: 'var(--surface-2)', borderColor: 'transparent' }}><div className="row gap8" style={{ alignItems: 'flex-start' }}><span style={{ color: 'var(--blue)', flex: '0 0 auto' }}><I.book size={15} /></span><span style={{ fontSize: 11.5, lineHeight: 1.45 }}>Defisiensi = kontrol dirancang/diterapkan/dioperasikan sehingga tidak mampu mencegah atau mendeteksi & mengoreksi salah saji tepat waktu (¶6a). <b>Signifikan</b> bila, atas pertimbangan auditor, cukup penting untuk diperhatikan TCWG (¶6b).</span></div></div>
      </Panel>
      {sel && (
        <Panel noBody>
          <div style={{ background: sel.sig ? 'var(--red-bg)' : 'var(--surface-2)', padding: '11px 14px', borderBottom: '1px solid var(--line)' }}>
            <div className="row ac gap8"><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{sel.id}</span><Badge kind={sel.sig ? 'red' : 'gray'}>{sel.sig ? 'Signifikan' : 'Biasa'}</Badge></div>
            <div style={{ fontWeight: 700, fontSize: 13, marginTop: 4, lineHeight: 1.35 }}>{sel.t}</div>
          </div>
          <div style={{ padding: 14 }}>
            <div className="tiny muted upper" style={{ marginBottom: 4 }}>Penyebab</div>
            <p style={{ margin: '0 0 12px', fontSize: 12, lineHeight: 1.5 }}>{sel.cause}</p>
            <div className="tiny muted upper" style={{ marginBottom: 4 }}>Dampak Potensial</div>
            <p style={{ margin: '0 0 12px', fontSize: 12, lineHeight: 1.5 }}>{sel.impact}</p>
            <KvBox label="Bentuk Komunikasi" v={sel.status} accent={sel.sig ? 'var(--red)' : 'var(--ink-3)'} />
            {sel.sig && <div className="panel" style={{ marginTop: 12, padding: '9px 11px', background: 'var(--red-bg)', borderColor: 'transparent' }}><div className="row ac gap8"><span style={{ color: 'var(--red)' }}><I.alert size={15} /></span><span style={{ fontSize: 11.5, lineHeight: 1.4 }}>Defisiensi signifikan — wajib dikomunikasikan <b>tertulis</b> kepada TCWG (¶9).</span></div></div>}
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

function S265Comms({ sig }) {
  const today = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
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
            <ol style={{ margin: '0 0 10px', paddingLeft: 18 }}>
              {DEFICIENCIES.filter(d => d.sig).map((d, i) => (
                <li key={i} style={{ marginBottom: 7 }}><b>{d.t}.</b> {d.impact}.</li>
              ))}
            </ol>
            <p style={{ margin: '10px 0 0' }}>Kami siap mendiskusikan hal-hal di atas & membantu manajemen merancang rencana perbaikan.</p>
            <p style={{ margin: '14px 0 0' }}>Hormat kami,</p>
            <p style={{ margin: '2px 0 0', fontWeight: 700, color: '#0c2430' }}>KAP Wijaya, Pramesti & Rekan</p>
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
      </div>
    </div>
  );
}

Object.assign(window, { SA250View, SA260View, SA265View });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { SA250View, SA260View, SA265View };
