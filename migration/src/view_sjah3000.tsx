/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { useNav } from './contexts';
import { I } from './icons';
import { SubBar } from './shell';
import { Badge, Btn, Panel, Tabs } from './ui';
import { KvBox } from './view_analytical';
import { RowKv } from './view_calc';

/* ============================================================
   Asseris — SJAH 3000 · Perikatan Asurans selain Audit/Reviu
   (selaras ISAE/SPA 3000). Deep methodology: lima elemen
   perikatan asurans, asersi-berbasis vs langsung, registri hal
   pokok & keberterimaan kriteria, bukti/materialitas, serta
   bentuk simpulan asurans (memadai/terbatas). Tertaut ke
   portofolio Asurans Lain.
   ============================================================ */
const { useState: useState3000 } = React;

/* ---- Lima elemen perikatan asurans (¶24) ---- */
const ASR_ELEMENTS = [
  { k: 'Hubungan Tiga Pihak', ic: 'group', color: 'blue', d: 'Praktisi, pihak bertanggung jawab, & pengguna yang dituju.' },
  { k: 'Hal Pokok', ic: 'target', color: 'teal', d: 'Subject matter yang diukur/dievaluasi terhadap kriteria.' },
  { k: 'Kriteria', ic: 'scale', color: 'purple', d: 'Tolok ukur yang sesuai untuk mengukur/mengevaluasi hal pokok.' },
  { k: 'Bukti', ic: 'search2', color: 'amber', d: 'Bukti yang cukup & tepat sebagai dasar simpulan.' },
  { k: 'Laporan Asurans', ic: 'report', color: 'blue', d: 'Simpulan tertulis yang menyampaikan keyakinan yang diperoleh.' },
];

/* ---- Registri hal pokok & kriteria ---- */
const ASR_ENG = [
  {
    id: 'ASR-080', client: 'PT Hijau Energi Terbarukan', subject: 'Laporan Emisi Gas Rumah Kaca (Scope 1 & 2) FY2025',
    std: 'SPA 3000', kind: 'Asersi-berbasis', level: 'Terbatas', color: 'teal',
    criteria: 'GHG Protocol Corporate Standard & ISO 14064-1',
    suit: [['Relevan', true], ['Lengkap', true], ['Andal', true], ['Netral', true], ['Dapat dipahami', true]],
    matters: [
      ['Emisi Scope 1 (pembakaran langsung)', '12.480 tCO₂e', 'Rekalkulasi konsumsi bahan bakar × faktor emisi'],
      ['Emisi Scope 2 (listrik dibeli)', '8.640 tCO₂e', 'Rekonsiliasi tagihan PLN × faktor grid'],
      ['Batas organisasi & operasional', 'Pendekatan kendali operasional', 'Telaah peta entitas konsolidasi'],
    ],
    concl: 'Tidak ada hal yang menjadi perhatian kami yang menyebabkan kami percaya laporan emisi GRK tidak disusun, dalam semua hal yang material, sesuai kriteria.',
  },
  {
    id: 'ASR-090', client: 'PT Mega Properti Sentosa', subject: 'Informasi Keuangan Prospektif — Proyeksi 5 Tahun',
    std: 'SPA 3400', kind: 'Asersi-berbasis', level: 'Terbatas', color: 'amber',
    criteria: 'Asumsi terbaik manajemen & basis penyusunan PSAK',
    suit: [['Relevan', true], ['Lengkap', true], ['Andal', true], ['Netral', false], ['Dapat dipahami', true]],
    matters: [
      ['Asumsi pertumbuhan pendapatan', '8–11% p.a.', 'Evaluasi kewajaran vs tren historis & pasar'],
      ['Asumsi tingkat hunian', '82% stabil', 'Bandingkan dengan data industri properti'],
      ['Basis penyusunan proyeksi', 'Konsisten PSAK', 'Telaah kebijakan akuntansi yang diterapkan'],
    ],
    concl: 'Berdasarkan pemeriksaan bukti pendukung asumsi, tidak ada hal yang menjadi perhatian kami; namun realisasi mungkin berbeda karena ketidakpastian (WTM proyeksi).',
  },
  {
    id: 'ASR-081', client: 'PT Payroll Solusi Indonesia', subject: 'Pengendalian Organisasi Jasa Payroll (Type 2)',
    std: 'SPA 3402', kind: 'Langsung', level: 'Memadai', color: 'blue',
    criteria: 'Tujuan pengendalian yang ditetapkan manajemen organisasi jasa',
    suit: [['Relevan', true], ['Lengkap', true], ['Andal', true], ['Netral', true], ['Dapat dipahami', true]],
    matters: [
      ['Desain pengendalian akses sistem', 'Efektif', 'Inspeksi konfigurasi & uji penetrasi'],
      ['Efektivitas operasi (periode uji)', '12 bulan', 'Uji ulang sampel transaksi penggajian'],
      ['Pengendalian penghitungan PPh 21', 'Efektif', 'Rekalkulasi sampel & rekonsiliasi'],
    ],
    concl: 'Menurut opini kami, dalam semua hal yang material, pengendalian dirancang & beroperasi secara efektif sepanjang periode untuk mencapai tujuan pengendalian.',
  },
];

/* ASR-081 (Pengendalian Organisasi Jasa) ditarik dari SUMBER KEBENARAN TUNGGAL
   socEngine (SJAH 3402) agar hal pokok & simpulan konsisten dengan modul penuh. */
(function syncAsr081FromSocEngine() {
  try {
    const eng = AMS && (AMS as any).socEngine && (AMS as any).socEngine();
    if (!eng) return;
    const a = ASR_ENG.find(e => e.id === 'ASR-081');
    if (!a) return;
    a.matters = eng.matters.map((x: any) => [x.m, x.claim, x.proc]);
    a.level = eng.assuranceEntry.level;
    a.concl = eng.opinion.operating;
  } catch (e) {}
})();

/* ASR-080 (Emisi GRK) ditarik dari SUMBER KEBENARAN TUNGGAL ghgEngine (SJAH 3410)
   — angka emisi dihitung dari aktivitas × faktor. Menjamin hal pokok & simpulan
   konsisten dengan modul penuh (mis. Scope 2 tak lagi berbeda antar modul). */
(function syncAsr080FromGhgEngine() {
  try {
    const eng = AMS && (AMS as any).ghgEngine && (AMS as any).ghgEngine();
    if (!eng) return;
    const a = ASR_ENG.find(e => e.id === 'ASR-080');
    if (!a) return;
    a.std = eng.meta.std;
    a.matters = eng.matters.map((x: any) => [x.m, x.claim, x.proc]);
    a.level = eng.assuranceEntry.level;
    a.concl = eng.conclusion.negativeAssurance;
  } catch (e) {}
})();

/* ============================================================ */
function SJAH3000View() {
  const [selId, setSelId] = useState3000('ASR-080');
  const [tab, setTab] = useState3000('anatomi');
  const sel = ASR_ENG.find(e => e.id === selId);
  const nav = useNav();

  const tabs = [
    { id: 'anatomi', label: 'Anatomi Perikatan' },
    { id: 'pokok', label: 'Hal Pokok & Kriteria' },
    { id: 'bukti', label: 'Bukti & Materialitas' },
    { id: 'laporan', label: 'Simpulan Asurans' },
  ];

  const memadai = ASR_ENG.filter(e => e.level === 'Memadai').length;

  return (
    <>
      <SubBar moduleId="sjah3000" right={
        <div className="row gap8 ac">
          <Badge kind="blue" dot>{ASR_ENG.length} perikatan asurans</Badge>
          <Btn sm onClick={() => nav('assurance')}><I.shield size={13} /> Portofolio Asurans</Btn>
          <Btn sm variant="primary"><I.sparkle size={14} /> AI Assist</Btn>
        </div>
      } />
      <div className="view-scroll"><div className="view-pad">

        <Panel noBody style={{ marginBottom: 12 }}>
          <div style={{ padding: '13px 16px', display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ minWidth: 230 }}>
              <div className="tiny muted upper" style={{ marginBottom: 3 }}>SJAH 3000 · selaras SPA/ISAE 3000</div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>Asurans selain Audit/Reviu Info Historis</div>
              <div className="tiny muted">Hal pokok non-historis & kriteria khusus</div>
            </div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Perikatan</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5 }}>{ASR_ENG.length} aktif</div></div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Keyakinan Memadai</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--blue)' }}>{memadai} perikatan</div></div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Keyakinan Terbatas</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--teal)' }}>{ASR_ENG.length - memadai} perikatan</div></div>
            <div style={{ flex: 1 }} />
            <div style={{ textAlign: 'right' }}>
              <div className="tiny muted upper" style={{ marginBottom: 3 }}>Seri Standar</div>
              <Badge kind="purple">SPA 3000/3400/3402</Badge>
            </div>
          </div>
        </Panel>

        <div style={{ marginBottom: 12 }}><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>

        {tab === 'anatomi' && <F3000Anatomy />}
        {tab === 'pokok' && <F3000Subject selId={selId} setSelId={setSelId} sel={sel} />}
        {tab === 'bukti' && <F3000Evidence sel={sel} />}
        {tab === 'laporan' && <F3000Report sel={sel} />}

      </div></div>
    </>
  );
}

/* ---------------- Tab: Anatomi Perikatan ---------------- */
function F3000Anatomy() {
  return (
    <div className="grid" style={{ gap: 12 }}>
      <Panel noBody>
        <div className="panel-h"><h3>Lima Elemen Perikatan Asurans (¶24)</h3><div style={{ flex: 1 }} /><Badge kind="blue">Kerangka asurans</Badge></div>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(5,1fr)', gap: 0 }}>
          {ASR_ELEMENTS.map((d, i) => {
            const Ic = (I as any)[d.ic];
            return (
              <div key={i} style={{ padding: 15, borderRight: i < 4 ? '1px solid var(--line-soft)' : 0 }}>
                <span style={{ width: 34, height: 34, borderRadius: 9, display: 'grid', placeItems: 'center', background: `var(--${d.color}-bg)`, color: `var(--${d.color})`, marginBottom: 9 }}><Ic size={17} /></span>
                <div style={{ fontWeight: 700, fontSize: 12 }}>{d.k}</div>
                <p className="tiny muted" style={{ margin: '4px 0 0', lineHeight: 1.4 }}>{d.d}</p>
              </div>
            );
          })}
        </div>
      </Panel>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }}>
        <Panel noBody>
          <div className="panel-h"><h3>Tipe Perikatan</h3></div>
          <div style={{ padding: 14, display: 'grid', gap: 10 }}>
            {[
              ['Asersi-berbasis (attestation)', 'Pihak bertanggung jawab mengukur hal pokok terhadap kriteria; praktisi menyimpulkan atas asersi tersebut.', 'teal', 'Laporan emisi GRK · proyeksi keuangan'],
              ['Langsung (direct)', 'Praktisi sendiri mengukur/mengevaluasi hal pokok terhadap kriteria & melaporkan hasilnya.', 'blue', 'Laporan pengendalian organisasi jasa'],
            ].map((r, i) => (
              <div key={i} className="panel" style={{ padding: '11px 13px', boxShadow: 'none', borderLeft: `3px solid var(--${r[2]})` }}>
                <div style={{ fontSize: 12.5, fontWeight: 700 }}>{r[0]}</div>
                <div className="tiny muted" style={{ margin: '4px 0 7px', lineHeight: 1.45 }}>{r[1]}</div>
                <div className="chip tiny" style={{ background: 'var(--surface-2)' }}>{r[3]}</div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel noBody>
          <div className="panel-h"><h3>Memadai vs Terbatas</h3></div>
          <table className="dtbl">
            <thead><tr><th>Aspek</th><th>Memadai</th><th>Terbatas</th></tr></thead>
            <tbody>
              {[
                ['Risiko perikatan', 'Direduksi rendah', 'Direduksi ke level dapat diterima'],
                ['Sifat & luas prosedur', 'Menyeluruh', 'Lebih terbatas'],
                ['Bentuk simpulan', 'Positif', 'Negatif'],
                ['Seri standar', 'SPA 3000 (memadai)', 'SPA 3000 (terbatas)'],
              ].map((r, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{r[0]}</td>
                  <td className="tiny" style={{ color: 'var(--blue)', fontWeight: 600 }}>{r[1]}</td>
                  <td className="tiny" style={{ color: 'var(--teal)', fontWeight: 600 }}>{r[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="panel" style={{ margin: 12, padding: '10px 12px', background: 'var(--blue-050)', borderColor: 'var(--blue-100)' }}>
            <div className="row gap8" style={{ alignItems: 'flex-start' }}>
              <span style={{ color: 'var(--blue)', flex: '0 0 auto' }}><I.book size={15} /></span>
              <span style={{ fontSize: 11.5, lineHeight: 1.45 }}>SPA 3000 mengatur perikatan asurans atas hal pokok <b>selain</b> informasi keuangan historis — mis. keberlanjutan, KPI, kepatuhan, & pengendalian.</span>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ---------------- Tab: Hal Pokok & Kriteria ---------------- */
function F3000Subject({ selId, setSelId, sel }: any) {
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 380px', gap: 12, alignItems: 'start' }}>
      <Panel noBody>
        <div className="panel-h"><h3>Registri Hal Pokok & Kriteria</h3><div style={{ flex: 1 }} /><span className="tiny muted">{ASR_ENG.length} perikatan</span></div>
        <table className="dtbl">
          <thead><tr><th style={{ width: 64 }}>Ref</th><th>Hal Pokok</th><th style={{ width: 78 }}>Standar</th><th style={{ width: 86 }}>Keyakinan</th></tr></thead>
          <tbody>
            {ASR_ENG.map(e => (
              <tr key={e.id} className={e.id === selId ? 'sel' : ''} onClick={() => setSelId(e.id)} style={{ cursor: 'pointer' }}>
                <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{e.id}</td>
                <td style={{ fontWeight: 600, whiteSpace: 'normal', lineHeight: 1.35 }}>{e.subject}<div className="tiny muted" style={{ fontWeight: 400, marginTop: 2 }}>{e.client}</div></td>
                <td><span className="chip tiny">{e.std}</span></td>
                <td><Badge kind={e.level === 'Memadai' ? 'blue' : 'teal'}>{e.level}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      {sel && (
        <Panel noBody>
          <div style={{ background: 'var(--surface-2)', padding: '15px 18px', borderBottom: '1px solid var(--line)' }}>
            <div className="row ac gap8"><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{sel.id}</span><Badge kind={sel.color}>{sel.std}</Badge><Badge kind={sel.kind === 'Langsung' ? 'blue' : 'teal'}>{sel.kind}</Badge></div>
            <div style={{ fontWeight: 700, fontSize: 12.5, marginTop: 4, lineHeight: 1.35 }}>{sel.subject}</div>
          </div>
          <div style={{ padding: 14 }}>
            <div className="tiny muted upper" style={{ marginBottom: 4 }}>Kriteria Diterapkan</div>
            <p style={{ margin: '0 0 12px', fontSize: 12, lineHeight: 1.5 }}>{sel.criteria}</p>

            <div className="tiny muted upper" style={{ marginBottom: 6 }}>Keberterimaan Kriteria (¶24)</div>
            <div style={{ display: 'grid', gap: 6, marginBottom: 12 }}>
              {sel.suit.map((s: any, i: any) => (
                <div key={i} className="row jb ac" style={{ fontSize: 11.5, padding: '5px 9px', borderRadius: 6, background: 'var(--surface-2)' }}>
                  <span>{s[0]}</span>
                  {s[1] ? <Badge kind="green">Memenuhi</Badge> : <Badge kind="amber">Perhatian</Badge>}
                </div>
              ))}
            </div>

            <div className="tiny muted upper" style={{ marginBottom: 6 }}>Hal Pokok & Prosedur Pengukuran</div>
            {sel.matters.map((m: any, i: any) => (
              <div key={i} style={{ padding: '8px 0', borderBottom: i < sel.matters.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
                <div className="row jb ac"><span style={{ fontSize: 11.5, fontWeight: 600 }}>{m[0]}</span><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--teal)' }}>{m[1]}</span></div>
                <div className="tiny muted" style={{ marginTop: 2, lineHeight: 1.4 }}>{m[2]}</div>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}

/* ---------------- Tab: Bukti & Materialitas ---------------- */
function F3000Evidence({ sel }: any) {
  if (!sel) return null;
  const limited = sel.level === 'Terbatas';
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 340px', gap: 12, alignItems: 'start' }}>
      <div className="grid" style={{ gap: 12 }}>
        <Panel noBody>
          <div className="panel-h"><h3>Prosedur Asurans — {sel.id}</h3><div style={{ flex: 1 }} /><Badge kind={limited ? 'teal' : 'blue'}>{sel.level}</Badge></div>
          <div style={{ padding: '8px 14px 14px', display: 'grid', gap: 9 }}>
            {[
              ['Pahami hal pokok & konteks perikatan', '¶46', true],
              ['Identifikasi & nilai risiko salah saji material atas info hal pokok', '¶47', true],
              [limited ? 'Rancang prosedur (terutama inquiry & analitis)' : 'Rancang prosedur menyeluruh (uji rinci & pengendalian)', '¶48', true],
              ['Pertimbangkan estimasi & area pertimbangan signifikan', '¶49', true],
              ['Evaluasi kecukupan & ketepatan bukti yang diperoleh', '¶64', !limited],
            ].map((r, i) => (
              <div key={i} className="row gap10" style={{ alignItems: 'flex-start' }}>
                <span style={{ flex: '0 0 auto', marginTop: 1, color: r[2] ? 'var(--green)' : 'var(--amber)' }}>{r[2] ? <I.checkCircle size={16} /> : <I.clock size={16} />}</span>
                <div style={{ flex: 1 }} className="row jb ac">
                  <span style={{ fontSize: 12.5, lineHeight: 1.45 }}>{r[0]}</span>
                  <span className="mono tiny" style={{ color: 'var(--blue)', fontWeight: 700, flex: '0 0 auto', marginLeft: 8 }}>{r[1]}</span>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel noBody>
          <div className="panel-h"><h3>Materialitas dalam Asurans (¶50)</h3></div>
          <div style={{ padding: 14 }}>
            <p style={{ margin: '0 0 12px', fontSize: 12, lineHeight: 1.55 }}>Materialitas dipertimbangkan terhadap informasi hal pokok — mencakup faktor <b>kuantitatif</b> & <b>kualitatif</b> sesuai kebutuhan pengguna yang dituju.</p>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
              <KvBox label="Sifat Hal Pokok" v={sel.std === 'SPA 3402' ? 'Kualitatif' : 'Kuantitatif'} accent="var(--navy)" />
              <KvBox label="Ambang Kuantitatif" v={(sel.std === 'SPA 3000' || sel.subject.includes('Emisi')) ? '5% emisi' : sel.std === 'SPA 3400' ? '10% proyeksi' : 'N/A'} accent="var(--teal)" />
              <KvBox label="Faktor Kualitatif" v="Pengguna dituju" />
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid" style={{ gap: 12 }}>
        <Panel title="Independensi & Etika (¶20)">
          <div style={{ display: 'grid', gap: 7 }}>
            {['Praktisi mematuhi kode etik & ketentuan independensi', 'Kompetensi & kapabilitas tim memadai untuk hal pokok', 'Pengendalian mutu perikatan diterapkan (SPM 1)'].map((t, i) => (
              <div key={i} className="row gap8" style={{ fontSize: 11.5, alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--green)', flex: '0 0 auto', marginTop: 1 }}><I.checkCircle size={15} /></span>
                <span style={{ lineHeight: 1.4 }}>{t}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Lihat di Portofolio">
          <NavRow3000 to="assurance" label="Asurans Lain (SPA) — workspace" />
          <p className="tiny muted" style={{ margin: '8px 0 0', lineHeight: 1.5 }}>Subject matter & simpulan per perikatan tersedia pada workspace Asurans Lain.</p>
        </Panel>
      </div>
    </div>
  );
}

function NavRow3000({ to, label }: any) {
  const nav = useNav();
  return (
    <div onClick={() => nav(to)} className="row jb ac" style={{ fontSize: 12, padding: '8px 10px', border: '1px solid var(--line-soft)', borderRadius: 7, cursor: 'pointer' }}>
      <span className="row ac gap8"><span style={{ color: 'var(--blue)' }}><I.shield size={14} /></span>{label}</span>
      <I.arrowRight size={14} style={{ color: 'var(--ink-4)' }} />
    </div>
  );
}

/* ---------------- Tab: Simpulan Asurans ---------------- */
function F3000Report({ sel }: any) {
  if (!sel) return null;
  const limited = sel.level === 'Terbatas';
  return (
    <div className="grid" style={{ gridTemplateColumns: '320px 1fr', gap: 12, alignItems: 'start' }}>
      <div className="grid" style={{ gap: 12 }}>
        <Panel title="Elemen Wajib Laporan (¶69)">
          <div style={{ display: 'grid', gap: 7 }}>
            {[
              ['Judul & pihak yang dituju', '¶69a'],
              ['Identifikasi hal pokok & kriteria', '¶69e'],
              ['Tanggung jawab para pihak', '¶69h'],
              ['Ringkasan pekerjaan dilaksanakan', '¶69k'],
              ['Simpulan asurans', '¶69m'],
            ].map((r, i) => (
              <div key={i} className="row jb ac" style={{ fontSize: 11.5, padding: '7px 9px', borderRadius: 6, background: 'var(--surface-2)' }}>
                <span className="row ac gap8"><span style={{ color: 'var(--green)' }}><I.check size={13} /></span>{r[0]}</span>
                <span className="mono tiny" style={{ color: 'var(--blue)', fontWeight: 700 }}>{r[1]}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Karakter Perikatan">
          <div style={{ display: 'grid', gap: 8 }}>
            <RowKv label="Tingkat Keyakinan" v={sel.level} />
            <RowKv label="Tipe" v={sel.kind} />
            <RowKv label="Bentuk Simpulan" v={limited ? 'Negatif' : 'Positif'} />
            <RowKv label="Standar" v={sel.std} />
          </div>
        </Panel>
      </div>

      <Panel noBody>
        <div className="panel-h"><h3>Pratinjau Laporan Asurans Independen</h3><div style={{ flex: 1 }} /><Btn sm><I.download size={13} /> Unduh</Btn></div>
        <div style={{ padding: 18 }}>
          <div className="doc-paper" style={{ background: '#fff', padding: '34px 40px', boxShadow: 'var(--shadow)', fontSize: 11.5, lineHeight: 1.7, color: '#283b46' }}>
            <div style={{ fontWeight: 800, fontSize: 13, color: '#0c2430', textAlign: 'center', marginBottom: 4 }}>LAPORAN ASURANS INDEPENDEN</div>
            <div className="tiny" style={{ textAlign: 'center', color: '#7a8893', marginBottom: 16 }}>Keyakinan {sel.level} — {sel.std} ({sel.kind})</div>
            <p style={{ margin: '0 0 10px' }}>Kepada Manajemen {sel.client}</p>

            <div style={{ fontWeight: 700, color: '#0c2430', margin: '0 0 4px' }}>Hal Pokok & Kriteria</div>
            <p style={{ margin: '0 0 10px' }}>Kami melaksanakan perikatan asurans atas <b>{sel.subject}</b>, yang diukur/dievaluasi berdasarkan {sel.criteria}.</p>

            <div style={{ fontWeight: 700, color: '#0c2430', margin: '12px 0 4px' }}>Ringkasan Pekerjaan Kami</div>
            <p style={{ margin: '0 0 10px' }}>{limited
              ? 'Perikatan keyakinan terbatas mencakup terutama inquiry & prosedur analitis serta evaluasi bukti. Prosedur lebih terbatas dibanding perikatan keyakinan memadai.'
              : 'Perikatan keyakinan memadai mencakup penilaian risiko, pengujian bukti pendukung, & evaluasi kesesuaian terhadap kriteria secara menyeluruh.'}</p>

            <div style={{ fontWeight: 700, color: '#0c2430', margin: '12px 0 4px' }}>Simpulan ({limited ? 'Bentuk Negatif' : 'Bentuk Positif'})</div>
            <p style={{ margin: 0 }}>{sel.concl}</p>

            <div style={{ marginTop: 24, paddingTop: 10, borderTop: '1px solid #e0e5ea', fontSize: 11 }}><b>Rudi Gunawan, CPA</b> · Akuntan Publik<br /><span className="tiny" style={{ color: '#7a8893' }}>Jakarta, {new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</span></div>
          </div>
        </div>
      </Panel>
    </div>
  );
}

Object.assign(window, { SJAH3000View });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { SJAH3000View };
