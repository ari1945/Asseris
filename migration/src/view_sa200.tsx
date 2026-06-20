/* [codemod] ESM imports */
import React from 'react';
import { useFirm } from './contexts.jsx';
import { I } from './icons.jsx';
import { SubBar } from './shell.jsx';
import { Badge, Btn, Panel, Progress, Tabs } from './ui.jsx';

/* ============================================================
   NeoSuite AMS — SA 200 · Tujuan Keseluruhan Auditor Independen
   Deep workpaper: tujuan & premis, skeptisisme & pertimbangan
   profesional, model risiko audit, keyakinan memadai &
   keterbatasan bawaan, serta etika & independensi.
   ============================================================ */
const { useState: useStateS2, useMemo: useMemoS2 } = React;

/* ---- Premis audit (¶13) ---- */
const SA200_PREMISE = [
  { t: 'Penyusunan laporan keuangan sesuai kerangka pelaporan yang berlaku (SAK)', who: 'Manajemen', ref: '¶13(a)', ok: true },
  { t: 'Perancangan, penerapan & pemeliharaan pengendalian internal yang relevan', who: 'Manajemen', ref: '¶13(b)(i)', ok: true },
  { t: 'Akses tanpa batas ke seluruh informasi, catatan & personel yang relevan', who: 'Manajemen', ref: '¶13(b)(ii)', ok: true },
  { t: 'Penyediaan bukti tambahan yang diminta auditor untuk tujuan audit', who: 'Manajemen', ref: '¶13(b)(iii)', ok: false },
];

/* ---- Sikap & pertimbangan ---- */
const SA200_SKEPTIS = [
  { t: 'Bukti audit yang bertentangan dengan keandalan dokumen & respons inquiry', ex: 'Kontrak penjualan akhir periode diuji keasliannya, tidak diterima begitu saja.' },
  { t: 'Kondisi yang mengindikasikan kemungkinan fraud', ex: 'Lonjakan pendapatan Desember diselidiki lebih lanjut (lihat SA 240).' },
  { t: 'Keadaan yang menuntut prosedur audit tambahan di luar yang disyaratkan', ex: 'Estimasi CKPN ditelaah dengan rentang independen.' },
];

/* ============================================================ */
function SA200View() {
  const firm = useFirm();
  const client = firm?.activeClient?.name || 'PT Sentosa Makmur Tbk';
  const [tab, setTab] = useStateS2('tujuan');

  const tabs = [
    { id: 'tujuan', label: 'Tujuan & Premis' },
    { id: 'skeptis', label: 'Skeptisisme & Pertimbangan' },
    { id: 'risiko', label: 'Model Risiko Audit' },
    { id: 'keyakinan', label: 'Keyakinan & Keterbatasan' },
    { id: 'etika', label: 'Etika & Independensi' },
  ];

  return (
    <>
      <SubBar moduleId="sa200" right={
        <div className="row gap8 ac">
          <Badge kind="blue">Standar Payung 200</Badge>
          <Btn sm><I.download size={13} /> Memo Tujuan Audit</Btn>
          <Btn sm variant="primary"><I.sparkle size={14} /> AI Assist</Btn>
        </div>
      } />
      <div className="view-scroll"><div className="view-pad">

        <Panel noBody style={{ marginBottom: 12 }}>
          <div style={{ padding: '13px 16px', display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ minWidth: 230 }}>
              <div className="tiny muted upper" style={{ marginBottom: 3 }}>Standar Audit 200</div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>Tujuan Keseluruhan Auditor Independen</div>
              <div className="tiny muted">{client} · ENG-2025-014</div>
            </div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Kerangka Pelaporan</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5 }}>SAK · Tujuan Umum</div></div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Tingkat Keyakinan</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5 }}>Memadai (bukan absolut)</div></div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Basis Standar</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5 }}>SA (IAPI)</div></div>
            <div style={{ flex: 1 }} />
            <div style={{ textAlign: 'right' }}>
              <div className="tiny muted upper" style={{ marginBottom: 3 }}>Status Prasyarat</div>
              <Badge kind="amber" dot>1 premis tertunda</Badge>
            </div>
          </div>
        </Panel>

        <div style={{ marginBottom: 12 }}><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>

        {tab === 'tujuan' && <S200Objectives />}
        {tab === 'skeptis' && <S200Skeptis />}
        {tab === 'risiko' && <S200RiskModel />}
        {tab === 'keyakinan' && <S200Assurance />}
        {tab === 'etika' && <S200Ethics />}

      </div></div>
    </>
  );
}

/* ---------------- Tab: Tujuan & Premis ---------------- */
function S200Objectives() {
  const obj = [
    { ic: 'shield', t: 'Memperoleh keyakinan memadai', d: 'Apakah laporan keuangan secara keseluruhan bebas dari kesalahan penyajian material, baik karena fraud maupun kesalahan — sebagai basis opini.', ref: '¶11(a)' },
    { ic: 'report', t: 'Melaporkan & mengomunikasikan', d: 'Menyatakan opini atas laporan keuangan dan berkomunikasi sebagaimana disyaratkan SA, sesuai temuan auditor.', ref: '¶11(b)' },
  ];
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 360px', gap: 12, alignItems: 'start' }}>
      <div className="grid" style={{ gap: 12 }}>
        <Panel noBody>
          <div className="panel-h"><h3>Tujuan Keseluruhan Auditor (¶11)</h3><div style={{ flex: 1 }} /></div>
          <div style={{ padding: 14 }}>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {obj.map((o, i) => {
                const Ic = I[o.ic];
                return (
                  <div key={i} className="panel" style={{ padding: '13px 14px', boxShadow: 'none' }}>
                    <div className="row jb ac"><span style={{ color: 'var(--blue)' }}><Ic size={20} /></span><span className="mono tiny" style={{ color: 'var(--blue)', fontWeight: 700 }}>{o.ref}</span></div>
                    <div style={{ fontWeight: 700, fontSize: 13, margin: '8px 0 4px' }}>{o.t}</div>
                    <div className="tiny muted" style={{ lineHeight: 1.5 }}>{o.d}</div>
                  </div>
                );
              })}
            </div>
            <div className="panel" style={{ marginTop: 12, padding: '11px 13px', background: 'var(--blue-050)', borderColor: 'var(--blue-100)' }}>
              <div className="row gap8" style={{ alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--blue)', flex: '0 0 auto' }}><I.book size={15} /></span>
                <span style={{ fontSize: 12, lineHeight: 1.5 }}>SA 200 adalah <b>standar payung</b> yang menetapkan tujuan menyeluruh, lingkup, & sifat audit. Seluruh SA lain (210–720, area khusus) dibaca dalam konteks tujuan ini — termasuk modul <b>SA 240, 250, 260, 265</b> pada kelompok ini.</span>
              </div>
            </div>
          </div>
        </Panel>

        <Panel noBody>
          <div className="panel-h"><h3>Premis Pelaksanaan Audit (¶13)</h3><div style={{ flex: 1 }} /><Badge kind="amber">Tanggung jawab manajemen</Badge></div>
          <div style={{ padding: '6px 14px 14px' }}>
            <p className="tiny muted" style={{ margin: '4px 0 8px', lineHeight: 1.45 }}>Audit dilaksanakan atas premis bahwa manajemen & TCWG mengakui & memahami tanggung jawab berikut. Tanpa premis ini, audit tidak dapat dilaksanakan.</p>
            {SA200_PREMISE.map((p, i) => (
              <div key={i} className="row gap10" style={{ padding: '10px 0', alignItems: 'flex-start', borderBottom: i < SA200_PREMISE.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
                <span style={{ flex: '0 0 auto', marginTop: 1, color: p.ok ? 'var(--green)' : 'var(--amber)' }}>{p.ok ? <I.checkCircle size={16} /> : <I.clock size={16} />}</span>
                <div style={{ flex: 1, fontSize: 12.5, lineHeight: 1.45 }}>{p.t}</div>
                <span className="mono tiny" style={{ color: 'var(--blue)', fontWeight: 700, flex: '0 0 auto' }}>{p.ref}</span>
              </div>
            ))}
            <div className="panel" style={{ marginTop: 10, padding: '9px 11px', background: 'var(--amber-bg)', borderColor: 'transparent' }}>
              <div className="row ac gap8"><span style={{ color: 'var(--amber)' }}><I.alert size={15} /></span><span style={{ fontSize: 11.5, lineHeight: 1.4 }}>Konfirmasi tertulis premis diperoleh via <b>Surat Perikatan (SA 210)</b> & <b>Representasi Tertulis (SA 580)</b>. Satu butir akses bukti masih menunggu konfirmasi manajemen.</span></div>
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid" style={{ gap: 12 }}>
        <Panel title="Hierarki Standar Terkait">
          <div style={{ display: 'grid', gap: 6 }}>
            {[
              { c: 'SA 200', t: 'Tujuan keseluruhan (payung)', here: true },
              { c: 'SA 210', t: 'Persetujuan ketentuan perikatan', mod: 'onboarding' },
              { c: 'SA 220', t: 'Pengendalian mutu audit', mod: 'soqm' },
              { c: 'SA 230', t: 'Dokumentasi audit', mod: 'dms' },
              { c: 'SA 240', t: 'Tanggung jawab atas fraud', mod: 'sa240' },
              { c: 'SA 260/265', t: 'Komunikasi TCWG & defisiensi', mod: 'sa260' },
            ].map((r, i) => (
              <div key={i} className="row jb ac" style={{ fontSize: 12, padding: '8px 10px', borderRadius: 6, border: '1px solid ' + (r.here ? 'var(--blue)' : 'var(--line-soft)'), background: r.here ? 'var(--blue-050)' : 'transparent' }}>
                <span className="row ac gap8"><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)', minWidth: 64 }}>{r.c}</span>{r.t}</span>
                {r.here ? <Badge kind="blue">Di sini</Badge> : <I.arrowRight size={13} style={{ color: 'var(--ink-4)' }} />}
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Lingkup Audit">
          <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.55, color: 'var(--ink-2)' }}>
            Audit atas laporan keuangan tujuan umum periode <b>31 Des 2025</b>, disusun sesuai <b>Standar Akuntansi
            Keuangan</b>. Opini ditujukan kepada pemegang saham. Audit tidak ditujukan untuk menyatakan keyakinan atas
            kelangsungan usaha di masa depan maupun efisiensi pengelolaan oleh manajemen.
          </p>
        </Panel>
      </div>
    </div>
  );
}

/* ---------------- Tab: Skeptisisme & Pertimbangan ---------------- */
function S200Skeptis() {
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }}>
      <Panel noBody>
        <div style={{ background: 'linear-gradient(125deg,#013a52,#005085)', color: '#fff', padding: '14px 16px' }}>
          <div className="row ac gap8"><span><I.search2 size={18} /></span><span className="mono tiny" style={{ color: '#bcd6e4', fontWeight: 700 }}>¶15 · A18–A22</span></div>
          <div style={{ fontSize: 15, fontWeight: 700, marginTop: 6 }}>Skeptisisme Profesional</div>
          <p style={{ margin: '6px 0 0', fontSize: 11.5, lineHeight: 1.5, color: '#bcd6e4' }}>Sikap yang mencakup pikiran yang selalu mempertanyakan, waspada terhadap kondisi yang mungkin mengindikasikan salah saji, & penilaian kritis atas bukti audit.</p>
        </div>
        <div style={{ padding: 14 }}>
          <div className="tiny muted upper" style={{ marginBottom: 8 }}>Penerapan pada Engagement Ini</div>
          {SA200_SKEPTIS.map((s, i) => (
            <div key={i} style={{ padding: '10px 0', borderBottom: i < SA200_SKEPTIS.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
              <div className="row gap8" style={{ alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--blue)', flex: '0 0 auto', marginTop: 1 }}><I.checkCircle size={15} /></span>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.4 }}>{s.t}</div>
                  <div className="tiny muted" style={{ marginTop: 3, lineHeight: 1.45, fontStyle: 'italic' }}>{s.ex}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <div className="grid" style={{ gap: 12 }}>
        <Panel noBody>
          <div className="panel-h"><h3>Pertimbangan Profesional (¶16)</h3><div style={{ flex: 1 }} /><Badge kind="purple">Judgment</Badge></div>
          <div style={{ padding: 14 }}>
            <p style={{ margin: '0 0 12px', fontSize: 12, lineHeight: 1.55, color: 'var(--ink-2)' }}>Penerapan pelatihan, pengetahuan, & pengalaman yang relevan dalam mengambil keputusan terinformasi sepanjang audit. Area utama yang menuntut pertimbangan:</p>
            {[
              { t: 'Materialitas & risiko audit', m: 'materiality' },
              { t: 'Sifat, saat & luas prosedur audit', m: 'programme' },
              { t: 'Kecukupan & ketepatan bukti audit', m: 'evidence' },
              { t: 'Evaluasi pertimbangan manajemen dalam menerapkan kerangka', m: 'analytical' },
            ].map((r, i) => (
              <div key={i} className="row jb ac" style={{ fontSize: 12, padding: '9px 0', borderBottom: i < 3 ? '1px solid var(--line-soft)' : 0 }}>
                <span className="row ac gap8"><span style={{ color: 'var(--purple)' }}><I.target size={14} /></span>{r.t}</span>
                <span className="chip tiny" style={{ height: 18 }}>{r.m}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Sikap vs Pertimbangan">
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="panel" style={{ padding: '11px 12px', boxShadow: 'none', background: 'var(--blue-050)' }}>
              <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--blue)' }}>Skeptisisme</div>
              <div className="tiny muted" style={{ marginTop: 4, lineHeight: 1.45 }}>Sikap mental — <b>bagaimana</b> auditor memandang bukti & klaim manajemen.</div>
            </div>
            <div className="panel" style={{ padding: '11px 12px', boxShadow: 'none', background: 'var(--purple-bg)' }}>
              <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--purple)' }}>Pertimbangan</div>
              <div className="tiny muted" style={{ marginTop: 4, lineHeight: 1.45 }}>Proses keputusan — <b>apa</b> yang auditor putuskan berdasar pengetahuan & bukti.</div>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ---------------- Tab: Model Risiko Audit ---------------- */
function S200RiskModel() {
  const [ir, setIr] = useStateS2(80);
  const [cr, setCr] = useStateS2(60);
  const targetAR = 5; // %
  const dr = Math.min(100, Math.round((targetAR / (ir / 100 * cr / 100)) * 1) / 1 * 1);
  const drClamped = Math.min(100, (targetAR / (ir / 100 * cr / 100)));
  const drPct = Math.round(drClamped);
  const rmm = Math.round(ir / 100 * cr / 100 * 100);
  const lvl = (v) => v >= 70 ? { k: 'red', t: 'Tinggi' } : v >= 40 ? { k: 'amber', t: 'Sedang' } : { k: 'green', t: 'Rendah' };
  const drLvl = drPct <= 30 ? { k: 'red', t: 'Rendah — perluas substantif' } : drPct <= 60 ? { k: 'amber', t: 'Sedang' } : { k: 'green', t: 'Tinggi — substantif terbatas' };

  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 380px', gap: 12, alignItems: 'start' }}>
      <div className="grid" style={{ gap: 12 }}>
        <Panel noBody>
          <div className="panel-h"><h3>Model Risiko Audit</h3><div style={{ flex: 1 }} /><span className="mono tiny muted">AR = IR × CR × DR</span></div>
          <div style={{ padding: 16 }}>
            <p style={{ margin: '0 0 14px', fontSize: 12, lineHeight: 1.55, color: 'var(--ink-2)' }}>
              Risiko audit (AR) adalah risiko auditor menyatakan opini tidak tepat ketika LK mengandung salah saji
              material. Auditor menjaga AR pada tingkat <b>rendah yang dapat diterima</b> ({targetAR}%) dengan menyesuaikan
              risiko deteksi (DR) terhadap risiko kesalahan penyajian material (RMM = IR × CR) yang dinilai.
            </p>

            {/* IR / CR sliders */}
            {[
              { lab: 'Risiko Bawaan (Inherent Risk)', desc: 'Kerentanan asersi terhadap salah saji sebelum mempertimbangkan kontrol.', v: ir, set: setIr, ref: '¶A34' },
              { lab: 'Risiko Pengendalian (Control Risk)', desc: 'Risiko salah saji tidak dicegah/dideteksi tepat waktu oleh pengendalian internal.', v: cr, set: setCr, ref: '¶A34' },
            ].map((s, i) => {
              const L = lvl(s.v);
              return (
                <div key={i} style={{ marginBottom: 16 }}>
                  <div className="row jb ac" style={{ marginBottom: 4 }}>
                    <span className="row ac gap6" style={{ fontSize: 12.5, fontWeight: 700 }}>{s.lab}<span className="mono tiny muted">{s.ref}</span></span>
                    <span className="row ac gap8"><Badge kind={L.k}>{L.t}</Badge><span className="mono" style={{ fontWeight: 700, fontSize: 13 }}>{s.v}%</span></span>
                  </div>
                  <div className="tiny muted" style={{ marginBottom: 6, lineHeight: 1.4 }}>{s.desc}</div>
                  <input type="range" min="10" max="100" step="5" value={s.v} onChange={e => s.set(+e.target.value)} style={{ width: '100%', accentColor: L.k === 'red' ? 'var(--red)' : L.k === 'amber' ? 'var(--amber)' : 'var(--green)' }} />
                </div>
              );
            })}

            {/* RMM + DR result */}
            <div className="divider" />
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <div className="panel" style={{ padding: '12px', boxShadow: 'none', textAlign: 'center', background: 'var(--surface-2)' }}>
                <div className="tiny muted upper">RMM (IR×CR)</div>
                <div className="mono" style={{ fontSize: 24, fontWeight: 800, color: `var(--${lvl(rmm).k})`, margin: '4px 0 2px' }}>{rmm}%</div>
                <Badge kind={lvl(rmm).k}>{lvl(rmm).t}</Badge>
              </div>
              <div className="panel" style={{ padding: '12px', boxShadow: 'none', textAlign: 'center', background: 'var(--surface-2)' }}>
                <div className="tiny muted upper">Target AR</div>
                <div className="mono" style={{ fontSize: 24, fontWeight: 800, color: 'var(--ink)', margin: '4px 0 2px' }}>{targetAR}%</div>
                <Badge kind="green">Rendah</Badge>
              </div>
              <div className="panel" style={{ padding: '12px', boxShadow: 'none', textAlign: 'center', background: `var(--${drLvl.k}-bg)`, border: '1px solid var(--' + drLvl.k + ')' }}>
                <div className="tiny muted upper">Risiko Deteksi (DR)</div>
                <div className="mono" style={{ fontSize: 24, fontWeight: 800, color: `var(--${drLvl.k})`, margin: '4px 0 2px' }}>{drPct}%</div>
                <Badge kind={drLvl.k}>{drLvl.t.split('—')[0].trim()}</Badge>
              </div>
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid" style={{ gap: 12 }}>
        <Panel title="Implikasi terhadap Strategi" sub="Hubungan terbalik DR ↔ prosedur">
          <div className="panel" style={{ padding: '12px 13px', background: `var(--${drLvl.k}-bg)`, borderColor: 'transparent', marginBottom: 10 }}>
            <div className="row ac gap8" style={{ marginBottom: 6 }}><span style={{ color: `var(--${drLvl.k})` }}><I.target size={16} /></span><span style={{ fontWeight: 700, fontSize: 12.5, color: `var(--${drLvl.k})` }}>{drLvl.t}</span></div>
            <div className="tiny" style={{ lineHeight: 1.5 }}>
              {drPct <= 30
                ? 'RMM tinggi memaksa DR rendah: tingkatkan luas pengujian substantif, gunakan staf berpengalaman, & laksanakan prosedur pada tanggal pelaporan, bukan interim.'
                : drPct <= 60
                ? 'RMM moderat: kombinasikan uji pengendalian & substantif dengan ukuran sampel proporsional terhadap risiko.'
                : 'RMM rendah memungkinkan DR lebih tinggi: prosedur substantif dapat dikurangi, sebagian dapat dilaksanakan pada interim.'}
            </div>
          </div>
          <div style={{ display: 'grid', gap: 7 }}>
            {[
              { t: 'Ukuran sampel substantif', v: drPct <= 30 ? 'Besar' : drPct <= 60 ? 'Sedang' : 'Kecil' },
              { t: 'Saat pengujian', v: drPct <= 30 ? 'Tanggal pelaporan' : 'Interim + roll-forward' },
              { t: 'Sifat prosedur', v: drPct <= 30 ? 'Lebih andal / langsung' : 'Campuran' },
            ].map((r, i) => (
              <div key={i} className="row jb ac" style={{ fontSize: 12 }}><span className="muted">{r.t}</span><b>{r.v}</b></div>
            ))}
          </div>
        </Panel>
        <Panel title="Catatan Konseptual">
          <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.55, color: 'var(--ink-2)' }}>
            Model risiko audit adalah <b>alat bantu konseptual</b>, bukan rumus matematis yang presisi (¶A34, A40).
            Risiko bawaan & pengendalian merupakan risiko entitas yang ada terlepas dari audit; risiko deteksi terkait
            efektivitas prosedur auditor. Risiko deteksi tidak dapat ditekan menjadi nol karena <b>keterbatasan bawaan</b>.
          </p>
        </Panel>
      </div>
    </div>
  );
}

/* ---------------- Tab: Keyakinan & Keterbatasan ---------------- */
function S200Assurance() {
  const limits = [
    { t: 'Sifat pelaporan keuangan', d: 'Banyak pos melibatkan pertimbangan & estimasi subjektif yang memiliki rentang hasil yang dapat diterima.', ref: '¶A45' },
    { t: 'Sifat prosedur audit', d: 'Bukti audit umumnya persuasif, bukan konklusif; ada batas praktis & hukum atas akses informasi.', ref: '¶A47' },
    { t: 'Penggunaan sampling & pengujian', d: 'Audit tidak menguji 100% populasi; selalu ada risiko sampling.', ref: '¶A48' },
    { t: 'Fraud yang disembunyikan', d: 'Kolusi & pemalsuan dapat menyebabkan salah saji material tidak terdeteksi meski audit direncanakan dengan benar.', ref: '¶A51' },
    { t: 'Ketepatan waktu & biaya', d: 'Audit diselesaikan dalam kerangka waktu & biaya yang wajar — bukan tanpa batas.', ref: '¶A48' },
  ];
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 360px', gap: 12, alignItems: 'start' }}>
      <Panel noBody>
        <div className="panel-h"><h3>Keterbatasan Bawaan Audit (¶A45–A52)</h3><div style={{ flex: 1 }} /><Badge kind="amber">Mengapa bukan absolut</Badge></div>
        <div style={{ padding: '6px 14px 14px' }}>
          <p className="tiny muted" style={{ margin: '4px 0 10px', lineHeight: 1.5 }}>Keyakinan memadai bersifat tinggi, namun <b>bukan absolut</b>. Keterbatasan berikut menghalangi auditor memperoleh keyakinan mutlak:</p>
          {limits.map((l, i) => (
            <div key={i} className="row gap10" style={{ padding: '11px 0', alignItems: 'flex-start', borderBottom: i < limits.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
              <span style={{ flex: '0 0 26px', width: 26, height: 26, borderRadius: 7, display: 'grid', placeItems: 'center', background: 'var(--amber-bg)', color: 'var(--amber)' }}><I.alert size={14} /></span>
              <div style={{ flex: 1 }}>
                <div className="row jb ac"><div style={{ fontSize: 12.5, fontWeight: 700 }}>{l.t}</div><span className="mono tiny" style={{ color: 'var(--blue)', fontWeight: 700 }}>{l.ref}</span></div>
                <div className="tiny muted" style={{ lineHeight: 1.45, marginTop: 3 }}>{l.d}</div>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <div className="grid" style={{ gap: 12 }}>
        <Panel noBody>
          <div style={{ background: 'linear-gradient(125deg,#0d3b22,#1f7a4d)', color: '#fff', padding: '16px' }}>
            <div className="tiny upper" style={{ color: '#bfe3cf', letterSpacing: '.05em' }}>Tingkat Keyakinan</div>
            <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>Memadai</div>
            <div style={{ fontSize: 11.5, color: '#bfe3cf', marginTop: 2 }}>Tinggi, tetapi bukan absolut</div>
          </div>
          <div style={{ padding: 14 }}>
            <div className="tiny muted upper" style={{ marginBottom: 8 }}>Spektrum Keyakinan</div>
            {[
              { t: 'Audit (SA)', lvl: 'Memadai', w: 88, k: 'green' },
              { t: 'Reviu (SPR 2400)', lvl: 'Terbatas', w: 55, k: 'amber' },
              { t: 'Kompilasi (SPJ 4410)', lvl: 'Tanpa keyakinan', w: 18, k: 'gray' },
            ].map((r, i) => (
              <div key={i} style={{ marginBottom: 10 }}>
                <div className="row jb ac" style={{ marginBottom: 3 }}><span style={{ fontSize: 12, fontWeight: 600 }}>{r.t}</span><Badge kind={r.k}>{r.lvl}</Badge></div>
                <Progress value={r.w} color={r.k === 'green' ? 'var(--green)' : r.k === 'amber' ? 'var(--amber)' : 'var(--ink-4)'} />
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Konsekuensi pada Opini">
          <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.55, color: 'var(--ink-2)' }}>
            Karena keterbatasan bawaan, opini auditor <b>bukan jaminan</b> atas viabilitas masa depan entitas maupun
            efektivitas pengelolaan. Laporan auditor secara eksplisit menjelaskan tanggung jawab auditor & keterbatasan
            ini (lihat <b>Audit Opinion Generator</b>).
          </p>
        </Panel>
      </div>
    </div>
  );
}

/* ---------------- Tab: Etika & Independensi ---------------- */
function S200Ethics() {
  const principles = [
    { t: 'Integritas', d: 'Tegas & jujur dalam seluruh hubungan profesional & bisnis.', ok: true },
    { t: 'Objektivitas', d: 'Tidak membiarkan bias, benturan kepentingan, atau pengaruh tak semestinya.', ok: true },
    { t: 'Kompetensi & Kecermatan', d: 'Memelihara pengetahuan & keterampilan profesional pada tingkat yang disyaratkan.', ok: true },
    { t: 'Kerahasiaan', d: 'Menjaga informasi yang diperoleh selama hubungan profesional.', ok: true },
    { t: 'Perilaku Profesional', d: 'Mematuhi peraturan & menghindari tindakan yang mendiskreditkan profesi.', ok: true },
  ];
  const threats = [
    { t: 'Kepentingan pribadi', s: 'Tidak ada', k: 'green' },
    { t: 'Telaah pribadi (self-review)', s: 'Tidak ada — jasa non-asurans dibatasi', k: 'green' },
    { t: 'Advokasi', s: 'Tidak ada', k: 'green' },
    { t: 'Kedekatan (familiarity)', s: 'Dipantau — rotasi partner Th-5', k: 'amber' },
    { t: 'Intimidasi', s: 'Tidak ada', k: 'green' },
  ];
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }}>
      <Panel noBody>
        <div className="panel-h"><h3>Ketentuan Etika Relevan (¶14)</h3><div style={{ flex: 1 }} /><Badge kind="blue">Kode Etik IAPI</Badge></div>
        <div style={{ padding: '6px 14px 14px' }}>
          <p className="tiny muted" style={{ margin: '4px 0 8px', lineHeight: 1.45 }}>Auditor mematuhi ketentuan etika yang relevan, termasuk independensi, terkait perikatan audit atas laporan keuangan.</p>
          {principles.map((p, i) => (
            <div key={i} className="row gap10" style={{ padding: '9px 0', alignItems: 'flex-start', borderBottom: i < principles.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
              <span style={{ color: 'var(--green)', flex: '0 0 auto', marginTop: 1 }}><I.checkCircle size={15} /></span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700 }}>{p.t}</div>
                <div className="tiny muted" style={{ lineHeight: 1.4, marginTop: 2 }}>{p.d}</div>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <div className="grid" style={{ gap: 12 }}>
        <Panel noBody>
          <div className="panel-h"><h3>Evaluasi Ancaman Independensi</h3><div style={{ flex: 1 }} /><Badge kind="green">Dapat diterima</Badge></div>
          <table className="dtbl">
            <thead><tr><th>Jenis Ancaman</th><th style={{ width: 200 }}>Status / Pengamanan</th></tr></thead>
            <tbody>
              {threats.map((t, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{t.t}</td>
                  <td><span className="row ac gap6"><span style={{ width: 7, height: 7, borderRadius: '50%', background: `var(--${t.k})` }} /><span className="tiny">{t.s}</span></span></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="panel" style={{ margin: 12, padding: '10px 12px', background: 'var(--blue-050)', borderColor: 'var(--blue-100)' }}>
            <div className="row ac gap8"><span style={{ color: 'var(--blue)' }}><I.shield size={15} /></span><span style={{ fontSize: 11.5, lineHeight: 1.4 }}>Evaluasi lengkap pada modul <b>Independence & Rotasi</b>. Surat pernyataan independensi tim diperoleh.</span></div>
          </div>
        </Panel>
        <Panel title="Sign-off Partner">
          <div className="row jb ac" style={{ fontSize: 12, paddingBottom: 8 }}>
            <div><div className="tiny muted upper">Disetujui Partner</div><div style={{ fontWeight: 600 }}>Hartono Wijaya, CPA</div></div>
            <span className="row ac gap6 tiny" style={{ color: 'var(--green)', fontWeight: 600 }}><I.checkCircle size={14} /> 05 Mar</span>
          </div>
          <p className="tiny muted" style={{ margin: '4px 0 0', lineHeight: 1.45 }}>Independensi firma & tim atas klien dikonfirmasi sebelum penerimaan perikatan & dipantau berkelanjutan.</p>
        </Panel>
      </div>
    </div>
  );
}

Object.assign(window, { SA200View });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { SA200View };
