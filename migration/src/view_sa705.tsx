/* [codemod] ESM imports */
import React from 'react';
import { useFirm } from './contexts.jsx';
import { I } from './icons.jsx';
import { SubBar } from './shell.jsx';
import { Badge, Btn, Panel, Seg, Tabs } from './ui.jsx';

/* ============================================================
   Asseris — SA 705 & 706 · Modifikasi Opini & Paragraf
   Penekanan Suatu Hal / Hal Lain
   Deep workpaper: alat penentu jenis opini (interaktif),
   matriks sifat × pervasif, basis modifikasi & rumusan opini,
   serta paragraf Penekanan Suatu Hal & Hal Lain (SA 706).
   ============================================================ */
const { useState: useState705, useMemo: useMemo705 } = React;

/* matriks keputusan opini */
function opinionFor(nature, perv) {
  if (nature === 'none') return { key: 'wtp', label: 'Wajar Tanpa Modifikasi', short: 'WTP', color: 'green', ref: 'SA 700', desc: 'Laporan keuangan disajikan wajar dalam semua hal material — tidak ada modifikasi.' };
  if (nature === 'miss') return perv === 'perv'
    ? { key: 'adverse', label: 'Tidak Wajar (Adverse)', short: 'TW', color: 'red', ref: 'SA 705 ¶8', desc: 'Salah saji material dan pervasif terhadap laporan keuangan secara keseluruhan.' }
    : { key: 'qual', label: 'Wajar Dengan Pengecualian', short: 'WDP', color: 'amber', ref: 'SA 705 ¶7', desc: 'Salah saji material namun tidak pervasif — pengecualian atas hal tertentu.' };
  // inability
  return perv === 'perv'
    ? { key: 'disclaimer', label: 'Tidak Menyatakan Pendapat', short: 'TMP', color: 'red', ref: 'SA 705 ¶9–10', desc: 'Tidak mampu memperoleh bukti yang cukup & tepat; kemungkinan dampak material dan pervasif.' }
    : { key: 'qual', label: 'Wajar Dengan Pengecualian', short: 'WDP', color: 'amber', ref: 'SA 705 ¶7', desc: 'Tidak mampu memperoleh bukti atas hal tertentu — material namun tidak pervasif.' };
}

/* ============================================================ */
function SA705View() {
  const firm = useFirm();
  const client = firm?.activeClient?.name || 'PT Sentosa Makmur Tbk';
  const [tab, setTab] = useState705('penentuan');

  const tabs = [
    { id: 'penentuan', label: 'Penentu Opini' },
    { id: 'matriks', label: 'Matriks Modifikasi' },
    { id: 'rumusan', label: 'Basis & Rumusan' },
    { id: 'eom', label: 'Penekanan & Hal Lain (706)' },
  ];

  return (
    <>
      <SubBar moduleId="sa705" right={
        <div className="row gap8 ac">
          <Badge kind="green" dot>Simpulan: WTP (tanpa modifikasi)</Badge>
          <Btn sm><I.download size={13} /> Memo Opini</Btn>
          <Btn sm variant="primary"><I.sparkle size={14} /> AI Assist</Btn>
        </div>
      } />
      <div className="view-scroll"><div className="view-pad">

        <Panel noBody style={{ marginBottom: 12 }}>
          <div style={{ padding: '13px 16px', display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ minWidth: 210 }}>
              <div className="tiny muted upper" style={{ marginBottom: 3 }}>Standar Audit 705 & 706</div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>Modifikasi Opini & Paragraf Tambahan</div>
              <div className="tiny muted">{client} · ENG-2025-014</div>
            </div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Simpulan Saat Ini</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--green)' }}>Wajar Tanpa Modifikasi</div></div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Penekanan Suatu Hal</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5 }}>Tidak ada</div></div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Paragraf Hal Lain</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--blue)' }}>1 (komparatif)</div></div>
            <div style={{ flex: 1 }} />
            <div style={{ textAlign: 'right' }}>
              <div className="tiny muted upper" style={{ marginBottom: 3 }}>Salah Saji Belum Dikoreksi</div>
              <Badge kind="green" dot>Di bawah materialitas</Badge>
            </div>
          </div>
        </Panel>

        <div style={{ marginBottom: 12 }}><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>

        {tab === 'penentuan' && <F705Decider />}
        {tab === 'matriks' && <F705Matrix />}
        {tab === 'rumusan' && <F705Wording client={client} />}
        {tab === 'eom' && <F705Eom client={client} />}

      </div></div>
    </>
  );
}

/* ---------------- Tab: Penentu Opini (interaktif) ---------------- */
function F705Decider() {
  const [nature, setNature] = useState705('none');
  const [perv, setPerv] = useState705('notperv');
  const out = opinionFor(nature, perv);
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 380px', gap: 12, alignItems: 'start' }}>
      <Panel noBody>
        <div className="panel-h"><h3>Alat Penentu Jenis Opini (SA 705 ¶2–10)</h3><div style={{ flex: 1 }} /><Badge kind="blue">Interaktif</Badge></div>
        <div style={{ padding: 18 }}>
          <div style={{ marginBottom: 18 }}>
            <div className="row jb ac" style={{ marginBottom: 7 }}><span style={{ fontSize: 12.5, fontWeight: 700 }}>1 · Sifat hal yang menimbulkan modifikasi</span><span className="mono tiny muted">¶4–5</span></div>
            <Seg options={[
              { value: 'none', label: 'Tidak ada' },
              { value: 'miss', label: 'Salah saji material' },
              { value: 'inability', label: 'Tak mampu peroleh bukti' },
            ]} value={nature} onChange={setNature} />
            <p className="tiny muted" style={{ margin: '7px 0 0', lineHeight: 1.45 }}>{nature === 'none' ? 'Laporan keuangan bebas dari salah saji material & bukti cukup diperoleh.' : nature === 'miss' ? 'Salah saji material: kebijakan akuntansi tidak tepat, jumlah keliru, atau pengungkapan tidak memadai.' : 'Pembatasan ruang lingkup: keadaan, kondisi entitas, atau pembatasan manajemen menghalangi perolehan bukti.'}</p>
          </div>

          <div style={{ marginBottom: 18, opacity: nature === 'none' ? 0.4 : 1, pointerEvents: nature === 'none' ? 'none' : 'auto' }}>
            <div className="row jb ac" style={{ marginBottom: 7 }}><span style={{ fontSize: 12.5, fontWeight: 700 }}>2 · Pervasif terhadap LK secara keseluruhan?</span><span className="mono tiny muted">¶6</span></div>
            <Seg options={[
              { value: 'notperv', label: 'Material, tidak pervasif' },
              { value: 'perv', label: 'Material & pervasif' },
            ]} value={perv} onChange={setPerv} />
            <p className="tiny muted" style={{ margin: '7px 0 0', lineHeight: 1.45 }}>Pervasif: dampak tidak terbatas pada unsur tertentu, mewakili/dapat mewakili proporsi substansial LK, atau (untuk pengungkapan) fundamental bagi pemahaman pengguna.</p>
          </div>

          <div className="panel" style={{ padding: '11px 13px', background: 'var(--surface-2)', borderColor: 'transparent' }}>
            <div className="tiny muted upper" style={{ marginBottom: 6 }}>Logika</div>
            <div className="mono" style={{ fontSize: 11.5, lineHeight: 1.7 }}>
              sifat = <b>{nature === 'none' ? 'tidak ada' : nature === 'miss' ? 'salah saji material' : 'tak mampu peroleh bukti'}</b><br />
              {nature !== 'none' && <>pervasif = <b>{perv === 'perv' ? 'ya' : 'tidak'}</b> → </>}
              <span style={{ color: `var(--${out.color})`, fontWeight: 700 }}>opini = {out.label}</span>
            </div>
          </div>
        </div>
      </Panel>

      <div className="grid" style={{ gap: 12 }}>
        <Panel noBody>
          <div style={{ background: out.color === 'green' ? 'linear-gradient(125deg,#0f3d28,#1f7a4d)' : out.color === 'amber' ? 'linear-gradient(125deg,#5a3d05,#9a6a00)' : 'linear-gradient(125deg,#5a1410,#b3261e)', color: '#fff', padding: '18px 18px 16px', textAlign: 'center' }}>
            <div className="tiny upper" style={{ opacity: .8, letterSpacing: '.05em' }}>Jenis Opini</div>
            <div className="mono" style={{ fontSize: 34, fontWeight: 800, lineHeight: 1.1, margin: '6px 0 2px' }}>{out.short}</div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{out.label}</div>
            <div className="tiny" style={{ opacity: .85, marginTop: 6 }}>{out.ref}</div>
          </div>
          <div style={{ padding: 14 }}>
            <p style={{ margin: 0, fontSize: 12, lineHeight: 1.55 }}>{out.desc}</p>
            {out.key !== 'wtp' && (
              <div className="panel" style={{ padding: '9px 11px', background: 'var(--blue-050)', borderColor: 'var(--blue-100)', marginTop: 12 }}>
                <div className="row gap8" style={{ alignItems: 'flex-start' }}>
                  <span style={{ color: 'var(--blue)', flex: '0 0 auto' }}><I.mail size={14} /></span>
                  <span style={{ fontSize: 11, lineHeight: 1.4 }}>Komunikasikan modifikasi yang diharapkan & rumusannya kepada TCWG sebelum menerbitkan laporan (¶30).</span>
                </div>
              </div>
            )}
          </div>
        </Panel>
        <Panel title="Simpulan Engagement Ini">
          <div className="row ac gap8" style={{ padding: '9px 11px', background: 'var(--green-bg)', borderRadius: 7 }}>
            <span style={{ color: 'var(--green)' }}><I.checkCircle size={16} /></span>
            <span style={{ fontSize: 12, fontWeight: 600 }}>Tidak ada modifikasi — salah saji belum dikoreksi di bawah materialitas & bukti cukup diperoleh.</span>
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ---------------- Tab: Matriks Modifikasi ---------------- */
function F705Matrix() {
  const cell = (nature, perv) => opinionFor(nature, perv);
  const Cell = ({ o }: any) => (
    <td style={{ padding: 0 }}>
      <div style={{ margin: 6, padding: '12px 10px', borderRadius: 8, background: `var(--${o.color}-bg)`, border: `1px solid var(--${o.color})`, textAlign: 'center' }}>
        <div className="mono" style={{ fontWeight: 800, fontSize: 16, color: `var(--${o.color})` }}>{o.short}</div>
        <div className="tiny" style={{ fontWeight: 600, marginTop: 2 }}>{o.label}</div>
        <div className="mono tiny muted" style={{ marginTop: 3 }}>{o.ref}</div>
      </div>
    </td>
  );
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 320px', gap: 12, alignItems: 'start' }}>
      <Panel noBody>
        <div className="panel-h"><h3>Matriks Jenis Opini — Sifat × Pervasif (¶ A1)</h3><div style={{ flex: 1 }} /></div>
        <div style={{ padding: 14 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ width: '34%', textAlign: 'left', padding: '8px 10px', fontSize: 11, color: 'var(--ink-3)' }}>Sifat hal ↓ / Pervasif →</th>
                <th style={{ padding: '8px 10px', fontSize: 11.5, fontWeight: 700 }}>Material, tidak pervasif</th>
                <th style={{ padding: '8px 10px', fontSize: 11.5, fontWeight: 700 }}>Material & pervasif</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: '8px 10px', fontWeight: 600, fontSize: 12 }}>Salah saji material pada LK</td>
                <Cell o={cell('miss', 'notperv')} />
                <Cell o={cell('miss', 'perv')} />
              </tr>
              <tr>
                <td style={{ padding: '8px 10px', fontWeight: 600, fontSize: 12 }}>Ketidakmampuan memperoleh bukti yang cukup & tepat</td>
                <Cell o={cell('inability', 'notperv')} />
                <Cell o={cell('inability', 'perv')} />
              </tr>
            </tbody>
          </table>
        </div>
        <div className="panel" style={{ margin: 12, padding: '10px 12px', background: 'var(--blue-050)', borderColor: 'var(--blue-100)' }}>
          <div className="row gap8" style={{ alignItems: 'flex-start' }}>
            <span style={{ color: 'var(--blue)', flex: '0 0 auto' }}><I.book size={15} /></span>
            <span style={{ fontSize: 11.5, lineHeight: 1.45 }}>Jenis modifikasi bergantung pada (a) <b>sifat</b> hal — salah saji vs ketidakmampuan memperoleh bukti, dan (b) <b>pertimbangan pervasif</b> dampaknya/kemungkinan dampaknya terhadap laporan keuangan (¶2).</span>
          </div>
        </div>
      </Panel>

      <div className="grid" style={{ gap: 12 }}>
        <Panel title="Definisi Pervasif (¶5)">
          <div style={{ display: 'grid', gap: 8 }}>
            {['Tidak terbatas pada unsur, akun, atau pos tertentu LK', 'Bila terbatas — mewakili/dapat mewakili proporsi substansial dari LK', 'Terkait pengungkapan: fundamental bagi pemahaman pengguna LK'].map((t, i) => (
              <div key={i} className="row gap8" style={{ fontSize: 11.5, alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--blue)', flex: '0 0 auto', marginTop: 1 }}><I.arrowRight size={13} /></span>
                <span style={{ lineHeight: 1.4 }}>{t}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Letak Paragraf Basis">
          <p className="tiny muted" style={{ margin: 0, lineHeight: 1.5 }}>Paragraf <b>"Basis untuk Opini ..."</b> ditempatkan <b>tepat sebelum</b> paragraf Opini dan menjelaskan sebab serta dampak kuantitatif (bila praktis) dari modifikasi (¶16–21).</p>
        </Panel>
      </div>
    </div>
  );
}

/* ---------------- Tab: Basis & Rumusan ---------------- */
function F705Wording({ client }: any) {
  const [view, setView] = useState705('wdp');
  const samples = {
    wdp: { h: 'Wajar Dengan Pengecualian', op: `Menurut opini kami, kecuali untuk dampak hal yang diuraikan dalam paragraf Basis untuk Opini Wajar Dengan Pengecualian, laporan keuangan terlampir menyajikan secara wajar, dalam semua hal yang material, posisi keuangan ${client} ...`, basis: 'Persediaan disajikan pada laporan posisi keuangan sebesar Rp X. Manajemen tidak menyatakan persediaan pada nilai yang lebih rendah antara biaya perolehan dan nilai realisasi neto, melainkan hanya pada biaya perolehan ... Catatan akuntansi entitas menunjukkan bahwa seandainya manajemen menyatakan persediaan pada ..., maka ...', color: 'amber' },
    adverse: { h: 'Tidak Wajar', op: 'Menurut opini kami, karena signifikansi hal yang diuraikan dalam paragraf Basis untuk Opini Tidak Wajar, laporan keuangan terlampir tidak menyajikan secara wajar posisi keuangan ... sesuai dengan Standar Akuntansi Keuangan di Indonesia.', basis: 'Sebagaimana dijelaskan, entitas tidak mengonsolidasikan laporan keuangan entitas anak yang diakuisisi ... karena belum dapat menentukan nilai wajar ... Dampak terhadap laporan keuangan konsolidasian bersifat material dan pervasif.', color: 'red' },
    tmp: { h: 'Tidak Menyatakan Pendapat', op: 'Kami tidak menyatakan suatu opini atas laporan keuangan terlampir. Karena signifikansi hal yang diuraikan dalam paragraf Basis untuk Tidak Menyatakan Pendapat, kami tidak memperoleh bukti audit yang cukup dan tepat untuk menjadi basis opini audit ...', basis: 'Investasi entitas pada entitas asosiasi ... Kami tidak memperoleh akses ke informasi keuangan, manajemen, dan auditor entitas asosiasi tersebut. Akibatnya, kami tidak dapat menentukan apakah diperlukan penyesuaian ...', color: 'red' },
  };
  const s = samples[view];
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 300px', gap: 12, alignItems: 'start' }}>
      <Panel noBody>
        <div className="panel-h"><h3>Contoh Rumusan Basis & Opini (¶16–27)</h3><div style={{ flex: 1 }} />
          <Seg options={[{ value: 'wdp', label: 'WDP' }, { value: 'adverse', label: 'Tidak Wajar' }, { value: 'tmp', label: 'TMP' }]} value={view} onChange={setView} />
        </div>
        <div style={{ padding: 20 }}>
          <div style={{ maxWidth: 640, margin: '0 auto', fontSize: 12.5, lineHeight: 1.65 }}>
            <div className="row ac gap8" style={{ marginBottom: 6 }}><span style={{ fontWeight: 800, fontSize: 13.5 }}>Basis untuk Opini {s.h}</span><Badge kind={s.color}>{view.toUpperCase()}</Badge></div>
            <p style={{ margin: '0 0 16px', color: 'var(--ink-2)' }}>{s.basis} Kami melaksanakan audit berdasarkan Standar Audit. Tanggung jawab kami menurut standar tersebut diuraikan lebih lanjut dalam paragraf Tanggung Jawab Auditor. Kami independen terhadap entitas ... dan kami yakin bahwa bukti audit yang telah kami peroleh adalah cukup dan tepat untuk menjadi basis bagi opini {view === 'tmp' ? '— namun lihat keterbatasan di atas' : 'kami'}.</p>
            <div style={{ fontWeight: 800, fontSize: 13.5, marginBottom: 6 }}>Opini {view === 'tmp' ? '— Tidak Menyatakan Pendapat' : s.h}</div>
            <p style={{ margin: 0, color: 'var(--ink-2)' }}>{s.op}</p>
          </div>
        </div>
      </Panel>

      <div className="grid" style={{ gap: 12 }}>
        <Panel title="Dampak terhadap Elemen Laporan">
          <div style={{ display: 'grid', gap: 7 }}>
            {[
              ['Judul "Opini" disesuaikan', true],
              ['Paragraf Basis sebelum Opini', true],
              ['Pernyataan "bukti cukup & tepat" — disesuaikan untuk TMP', view === 'tmp'],
              ['Tanggung Jawab Auditor — diringkas untuk TMP', view === 'tmp'],
            ].map((r, i) => (
              <div key={i} className="row gap8" style={{ fontSize: 11.5, alignItems: 'flex-start' }}>
                <span style={{ color: r[1] ? 'var(--amber)' : 'var(--ink-4)', flex: '0 0 auto', marginTop: 1 }}>{r[1] ? <I.alert size={14} /> : <I.circle size={13} />}</span>
                <span style={{ lineHeight: 1.4 }}>{r[0]}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Catatan">
          <p className="tiny muted" style={{ margin: 0, lineHeight: 1.5 }}>Untuk Tidak Menyatakan Pendapat, auditor <b>tidak</b> mencantumkan bagian KAM (SA 701) kecuali diharuskan hukum, dan tidak menyatakan kepatuhan independensi/etika dalam bentuk positif penuh.</p>
        </Panel>
      </div>
    </div>
  );
}

/* ---------------- Tab: Penekanan & Hal Lain (SA 706) ---------------- */
function F705Eom({ client }: any) {
  return (
    <div className="grid" style={{ gap: 12 }}>
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }}>
        <Panel noBody>
          <div style={{ background: 'linear-gradient(125deg,#013a52,#005085)', color: '#fff', padding: '14px 16px' }}>
            <div className="row jb ac"><Badge kind="blue">SA 706 ¶8</Badge><span className="mono tiny" style={{ color: '#bcd6e4' }}>Status: Tidak ada</span></div>
            <div style={{ fontSize: 15, fontWeight: 700, marginTop: 8 }}>Penekanan Suatu Hal (Emphasis of Matter)</div>
            <p style={{ margin: '6px 0 0', fontSize: 11.5, lineHeight: 1.5, color: '#bcd6e4' }}>Merujuk hal yang telah <b>disajikan/diungkap dengan tepat</b> dalam LK yang, menurut pertimbangan auditor, demikian penting hingga fundamental bagi pemahaman pengguna.</p>
          </div>
          <div style={{ padding: 14 }}>
            <div className="tiny muted upper" style={{ marginBottom: 6 }}>Contoh Pemicu</div>
            {['Ketidakpastian luar biasa atas litigasi/regulasi mendatang', 'Penerapan dini standar akuntansi baru yang berdampak pervasif', 'Bencana besar yang berdampak signifikan pada posisi keuangan'].map((t, i) => (
              <div key={i} className="row gap8" style={{ fontSize: 12, alignItems: 'flex-start', padding: '6px 0', borderBottom: i < 2 ? '1px solid var(--line-soft)' : 0 }}>
                <span style={{ color: 'var(--blue)', flex: '0 0 auto', marginTop: 1 }}><I.arrowRight size={13} /></span><span style={{ lineHeight: 1.4 }}>{t}</span>
              </div>
            ))}
            <div className="panel" style={{ padding: '9px 11px', background: 'var(--surface-2)', borderColor: 'transparent', marginTop: 12 }}>
              <div className="row ac gap8"><span style={{ color: 'var(--ink-3)' }}><I.circle size={14} /></span><span style={{ fontSize: 11.5, fontWeight: 600 }}>Tidak diperlukan untuk engagement ini.</span></div>
            </div>
          </div>
        </Panel>

        <Panel noBody>
          <div style={{ background: 'linear-gradient(125deg,#063b40,#0a6b73)', color: '#fff', padding: '14px 16px' }}>
            <div className="row jb ac"><Badge kind="teal">SA 706 ¶10</Badge><span className="mono tiny" style={{ color: '#b9e0e3' }}>Status: 1 paragraf</span></div>
            <div style={{ fontSize: 15, fontWeight: 700, marginTop: 8 }}>Paragraf Hal Lain (Other Matter)</div>
            <p style={{ margin: '6px 0 0', fontSize: 11.5, lineHeight: 1.5, color: '#b9e0e3' }}>Merujuk hal <b>selain</b> yang disajikan/diungkap dalam LK yang relevan bagi pemahaman pengguna atas audit, tanggung jawab auditor, atau laporan auditor.</p>
          </div>
          <div style={{ padding: 14 }}>
            <div className="tiny muted upper" style={{ marginBottom: 6 }}>Paragraf Aktif</div>
            <div className="panel" style={{ padding: '11px 13px', background: 'var(--teal-bg)', borderColor: 'transparent', marginBottom: 10 }}>
              <div className="row ac gap8" style={{ marginBottom: 5 }}><Badge kind="teal">Hal Lain</Badge><span className="mono tiny" style={{ color: 'var(--teal)' }}>terkait SA 710</span></div>
              <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.5 }}>Laporan keuangan {client} untuk tahun yang berakhir 31 Desember 2024 (angka komparatif) diaudit oleh auditor independen <b>pendahulu</b> yang menyatakan opini Wajar Tanpa Modifikasi pada 18 Maret 2025.</p>
            </div>
            <div className="tiny muted upper" style={{ marginBottom: 6 }}>Contoh Lain</div>
            {['Pembatasan distribusi/penggunaan laporan (kerangka khusus)', 'Pelaporan atas lebih dari satu kerangka pelaporan'].map((t, i) => (
              <div key={i} className="row gap8" style={{ fontSize: 11.5, alignItems: 'flex-start', padding: '5px 0' }}>
                <span style={{ color: 'var(--ink-4)', flex: '0 0 auto', marginTop: 1 }}><I.circle size={12} /></span><span style={{ lineHeight: 1.4 }}>{t}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel noBody>
        <div className="panel-h"><h3>Perbedaan Kunci: Penekanan vs Hal Lain vs KAM</h3><div style={{ flex: 1 }} /></div>
        <table className="dtbl">
          <thead><tr><th>Aspek</th><th>Penekanan Suatu Hal</th><th>Hal Lain</th><th>KAM (SA 701)</th></tr></thead>
          <tbody>
            <tr><td style={{ fontWeight: 600 }}>Sumber hal</td><td className="tiny">Tersaji/diungkap dalam LK</td><td className="tiny">Di luar LK</td><td className="tiny">Hal paling signifikan dlm audit</td></tr>
            <tr><td style={{ fontWeight: 600 }}>Tujuan</td><td className="tiny">Mengarahkan perhatian</td><td className="tiny">Relevansi pemahaman audit/laporan</td><td className="tiny">Transparansi audit</td></tr>
            <tr><td style={{ fontWeight: 600 }}>Memengaruhi opini?</td><td><Badge kind="green">Tidak</Badge></td><td><Badge kind="green">Tidak</Badge></td><td><Badge kind="green">Tidak</Badge></td></tr>
            <tr><td style={{ fontWeight: 600 }}>Wajib?</td><td className="tiny">Sesuai pertimbangan</td><td className="tiny">Sesuai pertimbangan</td><td className="tiny">Wajib — entitas terdaftar</td></tr>
          </tbody>
        </table>
      </Panel>
    </div>
  );
}

Object.assign(window, { SA705View });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { SA705View };
