/* [codemod] ESM imports */
import React from 'react';
import { useNav } from './contexts.jsx';
import { I } from './icons.jsx';
import { SubBar } from './shell.jsx';
import { Badge, Btn, Panel, Tabs } from './ui.jsx';
import { KvBox } from './view_analytical.jsx';
import { RowKv } from './view_calc.jsx';

/* ============================================================
   NeoSuite AMS — SA 800 · Audit LK Kerangka Bertujuan Khusus
   Deep workpaper: registri perikatan basis-khusus, penilaian
   keberterimaan kerangka, penentuan pengguna & tujuan,
   pertimbangan audit, serta pelaporan dengan paragraf
   Penekanan (basis akuntansi) & pembatasan distribusi.
   ============================================================ */
const { useState: useState800 } = React;

/* ---- Tipe kerangka bertujuan khusus ---- */
const SPF_TYPES = [
  { k: 'Basis Kas', ic: 'coins', color: 'teal', desc: 'Pengakuan saat kas diterima/dibayar — bukan akrual penuh.', ex: 'Koperasi, yayasan kecil, organisasi nirlaba.' },
  { k: 'Basis Pajak', ic: 'receipt', color: 'amber', desc: 'Disusun mengikuti ketentuan perpajakan untuk pelaporan SPT.', ex: 'LK fiskal untuk SPT Tahunan Badan.' },
  { k: 'Basis Regulatori', ic: 'gavel', color: 'purple', desc: 'Mengikuti ketentuan pelaporan otoritas/regulator tertentu.', ex: 'Laporan ke OJK, BI, atau Kementerian.' },
  { k: 'Basis Kontraktual', ic: 'doc', color: 'blue', desc: 'Mengikuti basis akuntansi yang ditetapkan dalam suatu perjanjian.', ex: 'Kepatuhan rasio (covenant) kepada bank.' },
];

/* ---- Registri perikatan SA 800 (Rp jt) ---- */
const SPF_ENG = [
  {
    id: 'SPF-01', client: 'Koperasi Karya Sejahtera', framework: 'Basis Kas', type: 'Basis Kas',
    purpose: 'Pelaporan posisi kas & sisa hasil usaha kepada anggota dalam Rapat Anggota Tahunan.',
    users: 'Anggota & Pengurus Koperasi', restricted: true, acceptable: 'Diterima', opinion: 'Wajar',
    fee: 85, assets: 12400,
    accept: [
      ['Kerangka relevan dengan tujuan & responsif terhadap kebutuhan pengguna', true],
      ['Basis kas diizinkan oleh AD/ART & regulasi koperasi', true],
      ['Pengguna memahami keterbatasan basis kas (bukan SAK akrual)', true],
      ['Penyajian wajar dapat dicapai dengan pengungkapan memadai', true],
    ],
    notes: 'Basis kas tepat untuk entitas berskala kecil; CALK menjelaskan basis & keterbatasannya.',
  },
  {
    id: 'SPF-02', client: 'PT Mitra Niaga Pajak', framework: 'Basis Pajak', type: 'Basis Pajak',
    purpose: 'Penyusunan laporan keuangan fiskal sebagai dasar pengisian SPT Tahunan PPh Badan.',
    users: 'Direktorat Jenderal Pajak & Manajemen', restricted: true, acceptable: 'Diterima', opinion: 'WDP',
    fee: 140, assets: 56800,
    accept: [
      ['Kerangka = ketentuan UU PPh & peraturan pelaksana yang berlaku', true],
      ['Tujuan fiskal jelas & pengguna teridentifikasi (otoritas pajak)', true],
      ['Perbedaan dengan SAK (mis. penyusutan, beda temporer) didokumentasikan', true],
      ['Pengakuan basis pajak tidak menyesatkan untuk tujuan fiskal', false],
    ],
    notes: 'Modifikasi opini WDP terkait perlakuan penyusutan aset tertentu yang belum sesuai ketentuan fiskal.',
  },
  {
    id: 'SPF-03', client: 'PT Sentra Dana Ventura', framework: 'Basis Regulatori', type: 'Basis Regulatori',
    purpose: 'Penyampaian laporan keuangan kepada OJK sesuai format & ketentuan POJK yang berlaku.',
    users: 'Otoritas Jasa Keuangan (OJK)', restricted: true, acceptable: 'Diterima', opinion: 'Wajar',
    fee: 220, assets: 184000,
    accept: [
      ['Kerangka regulatori bersifat mengikat & ditetapkan otoritas', true],
      ['Pengguna yang dituju adalah regulator (OJK) — terbatas', true],
      ['Format & klasifikasi mengikuti template POJK', true],
      ['Penyajian wajar / kepatuhan dievaluasi sesuai tujuan kerangka', true],
    ],
    notes: 'Kerangka kepatuhan (compliance framework) — opini dirumuskan atas dasar penyusunan sesuai POJK.',
  },
  {
    id: 'SPF-04', client: 'PT Bahari Logistik Prima', framework: 'Basis Kontraktual', type: 'Basis Kontraktual',
    purpose: 'Laporan kepatuhan rasio keuangan (debt covenant) berdasarkan definisi dalam perjanjian kredit.',
    users: 'Bank Kreditur Sindikasi', restricted: true, acceptable: 'Perlu telaah', opinion: 'Wajar',
    fee: 110, assets: 92500,
    accept: [
      ['Definisi akuntansi mengikuti klausul perjanjian kredit', true],
      ['Pengguna terbatas pada bank kreditur penandatangan perjanjian', true],
      ['Klausul tidak menimbulkan basis yang menyesatkan', true],
      ['Auditor memahami interpretasi klausul yang berpotensi ambigu', false],
    ],
    notes: 'Terdapat klausul definisi EBITDA yang ambigu — diklarifikasi dengan para pihak sebelum pelaporan.',
  },
];

/* ============================================================ */
function SA800View() {
  const [selId, setSelId] = useState800('SPF-01');
  const [tab, setTab] = useState800('registri');
  const sel = SPF_ENG.find(e => e.id === selId);

  const tabs = [
    { id: 'registri', label: 'Registri & Kerangka' },
    { id: 'keberterimaan', label: 'Keberterimaan & Pengguna' },
    { id: 'pertimbangan', label: 'Pertimbangan Audit' },
    { id: 'laporan', label: 'Pelaporan & Penekanan' },
  ];

  const restricted = SPF_ENG.filter(e => e.restricted).length;
  const modified = SPF_ENG.filter(e => e.opinion !== 'Wajar').length;

  return (
    <>
      <SubBar moduleId="sa800" right={
        <div className="row gap8 ac">
          <Badge kind="purple" dot>{restricted} laporan penggunaan terbatas</Badge>
          <Btn sm><I.download size={13} /> Memo SA 800</Btn>
          <Btn sm variant="primary"><I.sparkle size={14} /> AI Assist</Btn>
        </div>
      } />
      <div className="view-scroll"><div className="view-pad">

        <Panel noBody style={{ marginBottom: 12 }}>
          <div style={{ padding: '13px 16px', display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ minWidth: 230 }}>
              <div className="tiny muted upper" style={{ marginBottom: 3 }}>Standar Audit 800</div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>Audit LK — Kerangka Bertujuan Khusus</div>
              <div className="tiny muted">Pertimbangan khusus atas perikatan basis-khusus</div>
            </div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Perikatan Aktif</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5 }}>{SPF_ENG.length} perikatan</div></div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Penggunaan Terbatas</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--purple)' }}>{restricted} laporan</div></div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Opini Modifikasian</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--amber)' }}>{modified} perikatan</div></div>
            <div style={{ flex: 1 }} />
            <div style={{ textAlign: 'right' }}>
              <div className="tiny muted upper" style={{ marginBottom: 3 }}>Acuan</div>
              <Badge kind="blue">SA 800 · SA 700/705/706</Badge>
            </div>
          </div>
        </Panel>

        <div style={{ marginBottom: 12 }}><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>

        {tab === 'registri' && <F800Registri selId={selId} setSelId={setSelId} sel={sel} />}
        {tab === 'keberterimaan' && <F800Accept sel={sel} />}
        {tab === 'pertimbangan' && <F800Consider sel={sel} />}
        {tab === 'laporan' && <F800Report sel={sel} />}

      </div></div>
    </>
  );
}

/* ---- helper: ikon tipe kerangka ---- */
function spfColor(t) { const m = SPF_TYPES.find(x => x.k === t); return m ? m.color : 'gray'; }

/* ---------------- Tab: Registri & Kerangka ---------------- */
function F800Registri({ selId, setSelId, sel }) {
  return (
    <div className="grid" style={{ gap: 12 }}>
      <Panel noBody>
        <div className="panel-h"><h3>Tipe Kerangka Bertujuan Khusus (¶6–7)</h3><div style={{ flex: 1 }} /><Badge kind="blue">4 basis</Badge></div>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 0 }}>
          {SPF_TYPES.map((d, i) => {
            const Ic = I[d.ic];
            return (
              <div key={i} style={{ padding: 15, borderRight: i < 3 ? '1px solid var(--line-soft)' : 0 }}>
                <span style={{ width: 36, height: 36, borderRadius: 9, display: 'grid', placeItems: 'center', background: `var(--${d.color}-bg)`, color: `var(--${d.color})`, marginBottom: 10 }}><Ic size={18} /></span>
                <div style={{ fontWeight: 700, fontSize: 12.5 }}>{d.k}</div>
                <p className="tiny muted" style={{ margin: '4px 0 8px', lineHeight: 1.45 }}>{d.desc}</p>
                <div className="chip tiny" style={{ background: 'var(--surface-2)' }}>{d.ex}</div>
              </div>
            );
          })}
        </div>
      </Panel>

      <div className="grid" style={{ gridTemplateColumns: '1fr 380px', gap: 12, alignItems: 'start' }}>
        <Panel noBody>
          <div className="panel-h"><h3>Registri Perikatan Kerangka Khusus</h3><div style={{ flex: 1 }} /><span className="tiny muted">{SPF_ENG.length} perikatan</span></div>
          <table className="dtbl">
            <thead><tr><th style={{ width: 56 }}>Ref</th><th>Klien</th><th style={{ width: 120 }}>Kerangka</th><th style={{ width: 92 }}>Penggunaan</th><th style={{ width: 78 }}>Opini</th></tr></thead>
            <tbody>
              {SPF_ENG.map(e => (
                <tr key={e.id} className={e.id === selId ? 'sel' : ''} onClick={() => setSelId(e.id)} style={{ cursor: 'pointer' }}>
                  <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{e.id}</td>
                  <td style={{ fontWeight: 600, whiteSpace: 'normal', lineHeight: 1.35 }}>{e.client}</td>
                  <td><Badge kind={spfColor(e.type)}>{e.framework}</Badge></td>
                  <td>{e.restricted ? <Badge kind="purple">Terbatas</Badge> : <Badge kind="gray">Umum</Badge>}</td>
                  <td><Badge kind={e.opinion === 'Wajar' ? 'green' : e.opinion === 'WDP' ? 'amber' : 'red'}>{e.opinion}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        {sel && (
          <Panel noBody>
            <div style={{ background: 'var(--surface-2)', padding: '11px 14px', borderBottom: '1px solid var(--line)' }}>
              <div className="row ac gap8"><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{sel.id}</span><Badge kind={spfColor(sel.type)}>{sel.framework}</Badge></div>
              <div style={{ fontWeight: 700, fontSize: 13, marginTop: 4 }}>{sel.client}</div>
            </div>
            <div style={{ padding: 14 }}>
              <div className="tiny muted upper" style={{ marginBottom: 4 }}>Tujuan Penyusunan</div>
              <p style={{ margin: '0 0 12px', fontSize: 12, lineHeight: 1.5 }}>{sel.purpose}</p>
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                <KvBox label="Pengguna Dituju" v={sel.users} />
                <KvBox label="Total Aset (Rp jt)" v={sel.assets.toLocaleString('id-ID')} />
                <KvBox label="Keberterimaan" v={sel.acceptable} accent={sel.acceptable === 'Diterima' ? 'var(--green)' : 'var(--amber)'} />
                <KvBox label="Imbalan (Rp jt)" v={sel.fee.toLocaleString('id-ID')} />
              </div>
              <div className="panel" style={{ padding: '9px 11px', background: 'var(--surface-2)', borderColor: 'transparent' }}>
                <div className="row gap8" style={{ alignItems: 'flex-start' }}>
                  <span style={{ color: 'var(--blue)', flex: '0 0 auto' }}><I.flag size={14} /></span>
                  <span style={{ fontSize: 11.5, lineHeight: 1.4 }}>{sel.notes}</span>
                </div>
              </div>
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
}

/* ---------------- Tab: Keberterimaan & Pengguna ---------------- */
function F800Accept({ sel }) {
  if (!sel) return null;
  const done = sel.accept.filter(a => a[1]).length;
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 340px', gap: 12, alignItems: 'start' }}>
      <Panel noBody>
        <div className="panel-h"><h3>Penilaian Keberterimaan Kerangka (¶8)</h3><div style={{ flex: 1 }} /><Badge kind={done === sel.accept.length ? 'green' : 'amber'}>{done}/{sel.accept.length} terpenuhi</Badge></div>
        <div style={{ padding: '6px 14px 14px' }}>
          {sel.accept.map((a, i) => (
            <div key={i} className="row gap10" style={{ padding: '11px 0', alignItems: 'flex-start', borderBottom: i < sel.accept.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
              <span style={{ flex: '0 0 auto', marginTop: 1, color: a[1] ? 'var(--green)' : 'var(--amber)' }}>{a[1] ? <I.checkCircle size={16} /> : <I.clock size={16} />}</span>
              <div style={{ flex: 1, fontSize: 12.5, lineHeight: 1.45 }}>{a[0]}</div>
            </div>
          ))}
        </div>
        <div className="panel" style={{ margin: 12, padding: '10px 12px', background: 'var(--blue-050)', borderColor: 'var(--blue-100)' }}>
          <div className="row gap8" style={{ alignItems: 'flex-start' }}>
            <span style={{ color: 'var(--blue)', flex: '0 0 auto' }}><I.book size={15} /></span>
            <span style={{ fontSize: 11.5, lineHeight: 1.45 }}>Auditor harus memperoleh pemahaman atas <b>tujuan penyusunan</b>, <b>pengguna yang dituju</b>, & langkah manajemen menentukan <b>keberterimaan</b> kerangka pelaporan dalam konteks tersebut (¶8).</span>
          </div>
        </div>
      </Panel>

      <div className="grid" style={{ gap: 12 }}>
        <Panel title="Pengguna & Tujuan">
          <div style={{ display: 'grid', gap: 8 }}>
            <RowKv label="Pengguna Dituju" v={sel.users} />
            <RowKv label="Sifat Kerangka" v={sel.type === 'Basis Regulatori' || sel.type === 'Basis Kontraktual' ? 'Kepatuhan' : 'Penyajian Wajar'} />
            <RowKv label="Distribusi" v={sel.restricted ? 'Terbatas' : 'Umum'} />
          </div>
          <p className="tiny muted" style={{ margin: '10px 0 0', lineHeight: 1.5 }}>{sel.purpose}</p>
        </Panel>
        <Panel title="Kerangka: Penyajian vs Kepatuhan">
          <div style={{ display: 'grid', gap: 7 }}>
            {[
              ['Penyajian Wajar (fair presentation)', 'Memerlukan pengungkapan tambahan agar tidak menyesatkan.', 'green'],
              ['Kepatuhan (compliance)', 'Mengikuti ketentuan kerangka tanpa keharusan penyajian wajar.', 'purple'],
            ].map((r, i) => (
              <div key={i} className="panel" style={{ padding: '9px 11px', boxShadow: 'none', borderLeft: `3px solid var(--${r[2]})` }}>
                <div style={{ fontSize: 12, fontWeight: 700 }}>{r[0]}</div>
                <div className="tiny muted" style={{ marginTop: 2, lineHeight: 1.4 }}>{r[1]}</div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ---------------- Tab: Pertimbangan Audit ---------------- */
function F800Consider({ sel }) {
  const items = [
    { t: 'Terapkan seluruh SA yang relevan (200–700)', ref: '¶11', d: 'SA 800 melengkapi, bukan menggantikan; semua SA relevan tetap berlaku dalam audit kerangka khusus.', ic: 'layers' },
    { t: 'Pahami tujuan kerangka & adaptasi prosedur', ref: '¶13', d: 'Interpretasi SA disesuaikan dengan konteks kerangka bertujuan khusus.', ic: 'target' },
    { t: 'Evaluasi kecukupan pengungkapan basis akuntansi', ref: '¶13', d: 'CALK menjelaskan basis penyusunan & perbedaannya dari kerangka bertujuan umum.', ic: 'doc' },
    { t: 'Pertimbangkan apakah penyajian wajar tercapai', ref: '¶14', d: 'Untuk kerangka penyajian wajar — apakah pengungkapan tambahan diperlukan.', ic: 'checkCircle' },
    { t: 'Materialitas dalam konteks pengguna khusus', ref: 'SA 320', d: 'Tolok ukur materialitas mempertimbangkan kebutuhan informasi pengguna yang dituju.', ic: 'scale' },
  ];
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 340px', gap: 12, alignItems: 'start' }}>
      <Panel noBody>
        <div className="panel-h"><h3>Pertimbangan Audit Khusus (¶11–14)</h3><div style={{ flex: 1 }} /><span className="tiny muted">{sel ? sel.client : ''}</span></div>
        <div style={{ padding: '6px 14px 14px' }}>
          {items.map((a, i) => {
            const Ic = I[a.ic];
            return (
              <div key={i} className="row gap10" style={{ padding: '11px 0', alignItems: 'flex-start', borderBottom: i < items.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
                <span style={{ color: 'var(--blue)', flex: '0 0 auto', marginTop: 1 }}><Ic size={16} /></span>
                <div style={{ flex: 1 }}>
                  <div className="row jb ac"><div style={{ fontSize: 12.5, fontWeight: 700 }}>{a.t}</div><span className="mono tiny" style={{ color: 'var(--blue)', fontWeight: 700 }}>{a.ref}</span></div>
                  <div className="tiny muted" style={{ lineHeight: 1.45, marginTop: 2 }}>{a.d}</div>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      <div className="grid" style={{ gap: 12 }}>
        <Panel title="Tautan Modul Audit">
          <div style={{ display: 'grid', gap: 7 }}>
            {[['materiality', 'Materiality', 'scale'], ['evidence', 'Evidence Evaluation', 'search2'], ['opinion', 'Audit Opinion Generator', 'gavel']].map((r, i) => {
              const Ic = I[r[2]];
              return <NavRow800 key={i} to={r[0]} label={r[1]} ic={Ic} />;
            })}
          </div>
        </Panel>
        <Panel title="Risiko Spesifik Kerangka Khusus">
          <div style={{ display: 'grid', gap: 7 }}>
            {[
              'Salah interpretasi klausul/ketentuan kerangka',
              'Pengguna keliru menganggap LK = kerangka bertujuan umum',
              'Pengungkapan basis akuntansi tidak memadai',
            ].map((t, i) => (
              <div key={i} className="row gap8" style={{ fontSize: 11.5, alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--amber)', flex: '0 0 auto', marginTop: 1 }}><I.alert size={14} /></span>
                <span style={{ lineHeight: 1.4 }}>{t}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function NavRow800({ to, label, ic: Ic }) {
  const nav = useNav();
  return (
    <div onClick={() => nav(to)} className="row jb ac" style={{ fontSize: 12, padding: '8px 10px', border: '1px solid var(--line-soft)', borderRadius: 7, cursor: 'pointer' }}>
      <span className="row ac gap8"><span style={{ color: 'var(--blue)' }}><Ic size={14} /></span>{label}</span>
      <I.arrowRight size={14} style={{ color: 'var(--ink-4)' }} />
    </div>
  );
}

/* ---------------- Tab: Pelaporan & Penekanan ---------------- */
function F800Report({ sel }) {
  if (!sel) return null;
  const compliance = sel.type === 'Basis Regulatori' || sel.type === 'Basis Kontraktual';
  const opLabel = sel.opinion === 'Wajar' ? 'Tanpa Modifikasian' : sel.opinion === 'WDP' ? 'Dengan Pengecualian (WDP)' : 'Tidak Wajar';
  return (
    <div className="grid" style={{ gridTemplateColumns: '320px 1fr', gap: 12, alignItems: 'start' }}>
      <div className="grid" style={{ gap: 12 }}>
        <Panel title="Elemen Wajib Laporan SA 800">
          <div style={{ display: 'grid', gap: 7 }}>
            {[
              ['Penjelasan tujuan penyusunan LK', '¶13'],
              ['Paragraf Penekanan — basis akuntansi', '¶14'],
              ['Pembatasan distribusi & penggunaan', '¶14'],
              ['Rujukan kerangka pelaporan yang tepat', '¶13'],
            ].map((r, i) => (
              <div key={i} className="row jb ac" style={{ fontSize: 11.5, padding: '7px 9px', borderRadius: 6, background: 'var(--surface-2)' }}>
                <span className="row ac gap8"><span style={{ color: 'var(--green)' }}><I.check size={13} /></span>{r[0]}</span>
                <span className="mono tiny" style={{ color: 'var(--blue)', fontWeight: 700 }}>{r[1]}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Status Perikatan">
          <div style={{ display: 'grid', gap: 8 }}>
            <RowKv label="Bentuk Opini" v={opLabel} />
            <RowKv label="Tipe Kerangka" v={compliance ? 'Kepatuhan' : 'Penyajian Wajar'} />
            <RowKv label="Penggunaan" v={sel.restricted ? 'Terbatas' : 'Umum'} />
          </div>
          {sel.restricted && (
            <div className="panel" style={{ marginTop: 10, padding: '9px 11px', background: 'var(--purple-bg)', borderColor: 'transparent' }}>
              <div className="row gap8" style={{ alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--purple)', flex: '0 0 auto' }}><I.lock size={14} /></span>
                <span style={{ fontSize: 11, lineHeight: 1.4 }}>Laporan dibatasi hanya untuk <b>{sel.users}</b> dan tidak boleh didistribusikan kepada pihak lain.</span>
              </div>
            </div>
          )}
        </Panel>
      </div>

      <Panel noBody>
        <div className="panel-h"><h3>Pratinjau Laporan Auditor Independen</h3><div style={{ flex: 1 }} /><Btn sm><I.download size={13} /> Unduh</Btn></div>
        <div style={{ padding: 18 }}>
          <div className="doc-paper" style={{ background: '#fff', padding: '34px 40px', boxShadow: 'var(--shadow)', fontSize: 11.5, lineHeight: 1.7, color: '#283b46' }}>
            <div style={{ fontWeight: 800, fontSize: 13, color: '#0c2430', textAlign: 'center', marginBottom: 4 }}>LAPORAN AUDITOR INDEPENDEN</div>
            <div className="tiny" style={{ textAlign: 'center', color: '#7a8893', marginBottom: 16 }}>Audit atas Laporan Keuangan Bertujuan Khusus — SA 800</div>
            <p style={{ margin: '0 0 10px' }}>Kepada {sel.users} — {sel.client}</p>

            <div style={{ fontWeight: 700, color: '#0c2430', margin: '12px 0 4px' }}>Opini ({opLabel})</div>
            <p style={{ margin: '0 0 10px' }}>Kami telah mengaudit laporan keuangan {sel.client} yang disusun berdasarkan <b>{sel.framework}</b>. {sel.opinion === 'Wajar'
              ? (compliance ? 'Menurut opini kami, laporan keuangan disusun, dalam semua hal yang material, sesuai dengan kerangka yang berlaku.' : 'Menurut opini kami, laporan keuangan menyajikan secara wajar, dalam semua hal yang material, sesuai dengan basis akuntansi tersebut.')
              : 'Kecuali untuk dampak hal yang diuraikan dalam Basis untuk Opini, laporan keuangan disusun, dalam semua hal yang material, sesuai dengan basis akuntansi tersebut.'}</p>

            <div style={{ fontWeight: 700, color: '#0c2430', margin: '12px 0 4px' }}>Penekanan Suatu Hal — Basis Akuntansi</div>
            <p style={{ margin: '0 0 10px' }}>Kami mengarahkan perhatian pada Catatan atas Laporan Keuangan yang menjelaskan basis akuntansi. Laporan keuangan disusun untuk <b>{sel.purpose.toLowerCase()}</b> Sebagai akibatnya, laporan keuangan ini mungkin tidak sesuai untuk tujuan lain. Opini kami tidak dimodifikasi sehubungan dengan hal ini.</p>

            <div style={{ fontWeight: 700, color: '#0c2430', margin: '12px 0 4px' }}>Pembatasan Distribusi & Penggunaan</div>
            <p style={{ margin: 0 }}>Laporan kami ditujukan semata-mata untuk <b>{sel.users}</b> dan tidak ditujukan untuk, serta tidak boleh, didistribusikan kepada atau digunakan oleh pihak selain {sel.users}.</p>

            <div style={{ marginTop: 24, paddingTop: 10, borderTop: '1px solid #e0e5ea', fontSize: 11 }}><b>Hartono Wijaya, CPA</b> · Akuntan Publik<br /><span className="tiny" style={{ color: '#7a8893' }}>Jakarta, {new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</span></div>
          </div>
        </div>
      </Panel>
    </div>
  );
}

Object.assign(window, { SA800View });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { SA800View };
