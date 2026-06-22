/* [codemod] ESM imports */
import React from 'react';
import { useFirm } from './contexts';
import { I } from './icons';
import { SubBar } from './shell';
import { Badge, Btn, Panel, Tabs } from './ui';

/* ============================================================
   Asseris — SA 710 · Informasi Komparatif —
   Angka Koresponding & Laporan Keuangan Komparatif
   Deep workpaper: jenis & persyaratan, prosedur audit atas
   komparatif, situasi khusus (auditor pendahulu, salah saji
   PY, PY tidak diaudit), serta dampak pada laporan auditor.
   ============================================================ */
const { useState: useState710, useMemo: useMemo710 } = React;

/* ============================================================ */
function SA710View() {
  const firm = useFirm();
  const client = firm?.activeClient?.name || 'PT Sentosa Makmur Tbk';
  const [tab, setTab] = useState710('jenis');

  const tabs = [
    { id: 'jenis', label: 'Jenis & Persyaratan' },
    { id: 'prosedur', label: 'Prosedur Audit' },
    { id: 'khusus', label: 'Situasi Khusus' },
    { id: 'dampak', label: 'Dampak pada Laporan' },
  ];

  return (
    <>
      <SubBar moduleId="sa710" right={
        <div className="row gap8 ac">
          <Badge kind="blue" dot>Angka Koresponding</Badge>
          <Btn sm><I.download size={13} /> Kertas Kerja Komparatif</Btn>
          <Btn sm variant="primary"><I.sparkle size={14} /> AI Assist</Btn>
        </div>
      } />
      <div className="view-scroll"><div className="view-pad">

        <Panel noBody style={{ marginBottom: 12 }}>
          <div style={{ padding: '13px 16px', display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ minWidth: 210 }}>
              <div className="tiny muted upper" style={{ marginBottom: 3 }}>Standar Audit 710</div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>Informasi Komparatif</div>
              <div className="tiny muted">{client} · ENG-2025-014</div>
            </div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Pendekatan</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5 }}>Angka Koresponding</div></div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Periode Komparatif</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5 }}>FY2024</div></div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Auditor PY</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--blue)' }}>Pendahulu — WTP</div></div>
            <div style={{ flex: 1 }} />
            <div style={{ textAlign: 'right' }}>
              <div className="tiny muted upper" style={{ marginBottom: 3 }}>Konsekuensi Laporan</div>
              <Badge kind="blue" dot>Paragraf Hal Lain (SA 706)</Badge>
            </div>
          </div>
        </Panel>

        <div style={{ marginBottom: 12 }}><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>

        {tab === 'jenis' && <F710Type />}
        {tab === 'prosedur' && <F710Procedures />}
        {tab === 'khusus' && <F710Special client={client} />}
        {tab === 'dampak' && <F710Impact client={client} />}

      </div></div>
    </>
  );
}

/* ---------------- Tab: Jenis & Persyaratan ---------------- */
function F710Type() {
  const [sel, setSel] = useState710('corr');
  const types = {
    corr: {
      h: 'Angka Koresponding (Corresponding Figures)', tag: 'Diterapkan', color: 'blue',
      d: 'Jumlah & pengungkapan periode lalu disertakan sebagai bagian integral dari LK periode kini, dimaksudkan dibaca hanya dalam kaitannya dengan jumlah periode kini ("dalam konteks").',
      op: 'Opini auditor TIDAK merujuk angka koresponding (kecuali keadaan tertentu pada ¶11, 12, 14).',
      points: ['Lazim untuk LK entitas di Indonesia', 'Penekanan laporan pada angka periode kini', 'Opini menyatakan posisi/kinerja periode kini'],
    },
    comp: {
      h: 'Laporan Keuangan Komparatif (Comparative FS)', tag: 'Tidak diterapkan', color: 'gray',
      d: 'Jumlah & pengungkapan periode lalu disertakan untuk diperbandingkan dengan periode kini dan, jika diaudit, dirujuk dalam opini auditor sebagai LK yang berdiri sendiri.',
      op: 'Opini auditor MERUJUK setiap periode yang disajikan dan diaudit.',
      points: ['Lazim pada yurisdiksi tertentu / persyaratan regulator', 'Setiap periode dirujuk dalam opini', 'Auditor dapat menyatakan opini berbeda antar periode'],
    },
  };
  const t = (types as any)[sel];
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }}>
      <Panel noBody>
        <div className="panel-h"><h3>Dua Kerangka Penyajian Komparatif (¶6–7)</h3><div style={{ flex: 1 }} /></div>
        <div style={{ padding: 14 }}>
          {Object.entries(types).map(([k, v]) => (
            <button key={k} onClick={() => setSel(k)} className="panel" style={{ width: '100%', padding: 0, textAlign: 'left', cursor: 'pointer', marginBottom: 10, border: sel === k ? `1.5px solid var(--${v.color === 'gray' ? 'ink-3' : v.color})` : '1px solid var(--line)', overflow: 'hidden' }}>
              <div style={{ padding: '12px 14px', background: sel === k ? (v.color === 'gray' ? 'var(--surface-2)' : 'var(--blue-050)') : 'transparent' }}>
                <div className="row jb ac"><div style={{ fontWeight: 700, fontSize: 12.5 }}>{v.h}</div><Badge kind={v.color}>{v.tag}</Badge></div>
                <div className="tiny muted" style={{ marginTop: 4, lineHeight: 1.45 }}>{v.d}</div>
              </div>
            </button>
          ))}
        </div>
      </Panel>

      <Panel noBody>
        <div style={{ background: t.color === 'gray' ? 'var(--surface-2)' : 'linear-gradient(125deg,#013a52,#005085)', color: t.color === 'gray' ? 'var(--ink)' : '#fff', padding: '14px 16px' }}>
          <Badge kind={t.color}>{t.tag}</Badge>
          <div style={{ fontSize: 14.5, fontWeight: 700, marginTop: 8 }}>{t.h}</div>
        </div>
        <div style={{ padding: 16 }}>
          <div className="tiny muted upper" style={{ marginBottom: 4 }}>Implikasi pada Opini</div>
          <p style={{ margin: '0 0 14px', fontSize: 12.5, lineHeight: 1.55, fontWeight: 600 }}>{t.op}</p>
          <div className="tiny muted upper" style={{ marginBottom: 6 }}>Karakteristik</div>
          {t.points.map((p: any, i: any) => (
            <div key={i} className="row gap8" style={{ fontSize: 12, alignItems: 'flex-start', padding: '6px 0', borderBottom: i < t.points.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
              <span style={{ color: t.color === 'gray' ? 'var(--ink-4)' : 'var(--blue)', flex: '0 0 auto', marginTop: 1 }}><I.check size={13} /></span><span style={{ lineHeight: 1.4 }}>{p}</span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

/* ---------------- Tab: Prosedur Audit ---------------- */
function F710Procedures() {
  const procs = [
    { t: 'Informasi komparatif sesuai jumlah & pengungkapan periode lalu (atau disajikan kembali bila tepat)', ref: '¶7(a)', done: true },
    { t: 'Kebijakan akuntansi komparatif konsisten dengan periode kini; perubahan dipertanggungjawabkan & diungkap memadai', ref: '¶7(b)', done: true },
    { t: 'Evaluasi penyajian kembali (restatement) atau reklasifikasi atas angka periode lalu', ref: '¶7 · A2', done: true },
    { t: 'Bila menyadari kemungkinan salah saji material pada angka periode lalu — lakukan prosedur tambahan', ref: '¶8', done: false },
    { t: 'Peroleh representasi tertulis untuk seluruh periode yang dirujuk opini (SA 580)', ref: '¶9', done: true },
  ];
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 340px', gap: 12, alignItems: 'start' }}>
      <div className="grid" style={{ gap: 12 }}>
        <Panel noBody>
          <div className="panel-h"><h3>Prosedur Audit atas Informasi Komparatif (¶7–9)</h3><div style={{ flex: 1 }} /><Badge kind="blue">{procs.filter(p => p.done).length}/{procs.length}</Badge></div>
          <div style={{ padding: '6px 14px 14px' }}>
            {procs.map((p, i) => (
              <div key={i} className="row gap10" style={{ padding: '11px 0', alignItems: 'flex-start', borderBottom: i < procs.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
                <span style={{ flex: '0 0 auto', marginTop: 1, color: p.done ? 'var(--green)' : 'var(--amber)' }}>{p.done ? <I.checkCircle size={16} /> : <I.clock size={16} />}</span>
                <div style={{ flex: 1, fontSize: 12.5, lineHeight: 1.45 }}>{p.t}</div>
                <span className="mono tiny" style={{ color: 'var(--blue)', fontWeight: 700 }}>{p.ref}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel noBody>
          <div className="panel-h"><h3>Konsistensi Kebijakan Akuntansi — PY vs CY</h3><div style={{ flex: 1 }} /><Badge kind="amber">1 reklasifikasi</Badge></div>
          <table className="dtbl">
            <thead><tr><th>Area</th><th>FY2024</th><th>FY2025</th><th style={{ width: 110 }}>Status</th></tr></thead>
            <tbody>
              <tr><td style={{ fontWeight: 600 }}>Pengakuan pendapatan</td><td className="tiny">PSAK 72</td><td className="tiny">PSAK 72</td><td><Badge kind="green">Konsisten</Badge></td></tr>
              <tr><td style={{ fontWeight: 600 }}>Penyajian beban distribusi</td><td className="tiny">Dalam HPP</td><td className="tiny">Pos terpisah</td><td><Badge kind="amber">Reklasifikasi</Badge></td></tr>
              <tr><td style={{ fontWeight: 600 }}>Pengukuran instrumen keuangan</td><td className="tiny">PSAK 71</td><td className="tiny">PSAK 71</td><td><Badge kind="green">Konsisten</Badge></td></tr>
            </tbody>
          </table>
          <div className="panel" style={{ margin: 12, padding: '10px 12px', background: 'var(--amber-bg)', borderColor: 'transparent' }}>
            <div className="row gap8" style={{ alignItems: 'flex-start' }}>
              <span style={{ color: 'var(--amber)', flex: '0 0 auto' }}><I.alert size={15} /></span>
              <span style={{ fontSize: 11.5, lineHeight: 1.45 }}>Beban distribusi direklasifikasi dari HPP menjadi pos terpisah; angka koresponding FY2024 disajikan kembali agar sebanding & diungkap dalam CALK. Tidak berdampak pada laba bersih.</span>
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid" style={{ gap: 12 }}>
        <Panel title="Agih ke Angka Teraudit PY">
          <div style={{ display: 'grid', gap: 7 }}>
            {[
              { t: 'Saldo awal cocok ke LK auditan FY2024', ok: true },
              { t: 'Saldo laba ditahan tertelusur', ok: true },
              { t: 'Pengungkapan komparatif lengkap', ok: true },
              { t: 'Penyajian kembali diungkap (PSAK 25)', ok: true },
            ].map((r, i) => (
              <div key={i} className="row gap8" style={{ fontSize: 11.5, alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--green)', flex: '0 0 auto', marginTop: 1 }}><I.checkCircle size={15} /></span>
                <span style={{ lineHeight: 1.4 }}>{r.t}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Tautan Modul">
          <div style={{ display: 'grid', gap: 7 }}>
            {[['Opening Balance (SA 510)', 'clock'], ['Representasi Tertulis (SA 580)', 'doc'], ['Audit Opinion Generator', 'gavel']].map((r, i) => {
              const Lic = (I as any)[r[1]];
              return (
                <div key={i} className="row jb ac" style={{ fontSize: 12, padding: '8px 10px', border: '1px solid var(--line-soft)', borderRadius: 7 }}>
                  <span className="row ac gap8"><span style={{ color: 'var(--blue)' }}><Lic size={14} /></span>{r[0]}</span>
                  <I.arrowRight size={14} style={{ color: 'var(--ink-4)' }} />
                </div>
              );
            })}
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ---------------- Tab: Situasi Khusus ---------------- */
function F710Special({ client }: any) {
  const cases = [
    { ic: 'group', k: 'blue', t: 'Periode lalu diaudit auditor pendahulu (¶13)', active: true,
      d: 'Bila tidak dilarang hukum, auditor dapat menyatakan dalam paragraf Hal Lain bahwa angka koresponding diaudit auditor pendahulu — jenis opini, alasan modifikasi (bila ada), & tanggalnya.',
      sts: 'Berlaku — paragraf Hal Lain ditambahkan' },
    { ic: 'search2', k: 'amber', t: 'Periode lalu tidak diaudit (¶14)', active: false,
      d: 'Auditor menyatakan dalam paragraf Hal Lain bahwa angka koresponding tidak diaudit. Namun tetap memperoleh bukti bahwa saldo awal bebas salah saji material (SA 510).',
      sts: 'Tidak berlaku — PY diaudit' },
    { ic: 'alert', k: 'red', t: 'Salah saji material pada angka periode lalu (¶11–12)', active: false,
      d: 'Bila LK PY (yang opininya tidak dimodifikasi) ternyata mengandung salah saji material yang belum diperbaiki, modifikasi opini atas angka koresponding dalam laporan periode kini.',
      sts: 'Tidak teridentifikasi' },
    { ic: 'flag', k: 'purple', t: 'Opini PY berbeda dari opini sebelumnya (¶ A4)', active: false,
      d: 'Bila opini atas LK periode lalu berbeda dari yang sebelumnya dinyatakan, ungkapkan alasan perbedaan substansial dalam paragraf Hal Lain.',
      sts: 'Tidak berlaku' },
  ];
  return (
    <div className="grid" style={{ gap: 12 }}>
      <Panel noBody>
        <div className="panel-h"><h3>Situasi Khusus & Konsekuensinya (¶11–14)</h3><div style={{ flex: 1 }} /><Badge kind="blue">1 aktif</Badge></div>
        <div style={{ padding: '6px 14px 14px' }}>
          {cases.map((c, i) => {
            const Ic = (I as any)[c.ic];
            return (
              <div key={i} className="row gap12" style={{ padding: '13px 0', alignItems: 'flex-start', borderBottom: i < cases.length - 1 ? '1px solid var(--line-soft)' : 0, opacity: c.active ? 1 : 0.72 }}>
                <span style={{ flex: '0 0 36px', width: 36, height: 36, borderRadius: 9, display: 'grid', placeItems: 'center', background: `var(--${c.k}-bg)`, color: `var(--${c.k})` }}><Ic size={18} /></span>
                <div style={{ flex: 1 }}>
                  <div className="row jb ac"><div style={{ fontSize: 12.5, fontWeight: 700 }}>{c.t}</div>{c.active ? <Badge kind={c.k}>Aktif</Badge> : <Badge kind="gray">N/A</Badge>}</div>
                  <div className="tiny muted" style={{ lineHeight: 1.45, margin: '3px 0 6px' }}>{c.d}</div>
                  <div className="chip tiny" style={{ background: c.active ? `var(--${c.k}-bg)` : 'var(--surface-2)' }}>{c.sts}</div>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

/* ---------------- Tab: Dampak pada Laporan ---------------- */
function F710Impact({ client }: any) {
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 300px', gap: 12, alignItems: 'start' }}>
      <Panel noBody>
        <div className="panel-h"><h3>Draf Paragraf Hal Lain — Auditor Pendahulu</h3><div style={{ flex: 1 }} /><Badge kind="teal">SA 710 ¶13 → SA 706</Badge></div>
        <div style={{ padding: 22 }}>
          <div style={{ maxWidth: 640, margin: '0 auto', fontSize: 12.5, lineHeight: 1.7 }}>
            <div style={{ fontWeight: 800, fontSize: 13.5, marginBottom: 8 }}>Hal Lain</div>
            <p style={{ margin: 0, color: 'var(--ink-2)' }}>
              Laporan keuangan {client} untuk tahun yang berakhir pada tanggal 31 Desember 2024 diaudit oleh auditor independen pendahulu yang menyatakan opini tanpa modifikasi atas laporan keuangan tersebut pada tanggal 18 Maret 2025.
            </p>
          </div>
        </div>
        <div className="panel" style={{ margin: 16, padding: '11px 13px', background: 'var(--blue-050)', borderColor: 'var(--blue-100)' }}>
          <div className="row gap8" style={{ alignItems: 'flex-start' }}>
            <span style={{ color: 'var(--blue)', flex: '0 0 auto' }}><I.book size={15} /></span>
            <span style={{ fontSize: 11.5, lineHeight: 1.45 }}>Karena pendekatan <b>angka koresponding</b>, opini auditor <b>tidak merujuk</b> periode lalu. Informasi auditor pendahulu disampaikan melalui paragraf <b>Hal Lain</b> (SA 706), bukan dalam opini.</span>
          </div>
        </div>
      </Panel>

      <div className="grid" style={{ gap: 12 }}>
        <Panel title="Ringkasan Dampak Laporan">
          <div style={{ display: 'grid', gap: 8 }}>
            {[
              ['Opini periode kini', 'Tidak terpengaruh', 'green'],
              ['Rujukan ke angka PY dalam opini', 'Tidak ada', 'green'],
              ['Paragraf Hal Lain', 'Ditambahkan', 'blue'],
              ['Penyajian kembali komparatif', 'Diungkap (PSAK 25)', 'amber'],
            ].map((r, i) => (
              <div key={i} className="row jb ac" style={{ fontSize: 11.5, padding: '7px 9px', border: '1px solid var(--line-soft)', borderRadius: 6 }}>
                <span>{r[0]}</span><Badge kind={r[2]}>{r[1]}</Badge>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Sign-off">
          <div style={{ display: 'grid', gap: 9 }}>
            {[
              { role: 'Disiapkan', who: 'Dimas Raharja', when: '10 Jan', done: true },
              { role: 'Direview', who: 'Anindya Pramesti', when: '—', done: false },
            ].map((s, i) => (
              <div key={i} className="row jb ac" style={{ fontSize: 12, paddingBottom: 8, borderBottom: i < 1 ? '1px solid var(--line-soft)' : 0 }}>
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

Object.assign(window, { SA710View });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { SA710View };
