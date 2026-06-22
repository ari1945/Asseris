/* [codemod] ESM imports */
import React from 'react';
import { useNav } from './contexts';
import { I } from './icons';
import { SubBar } from './shell';
import { Badge, Btn, Panel, Tabs } from './ui';
import { KvBox } from './view_analytical';
import { RowKv } from './view_calc';

/* ============================================================
   Asseris — SA 805 · Audit LK Tunggal & Elemen Tertentu
   Pertimbangan khusus: audit atas satu laporan keuangan
   tunggal atau atas suatu elemen, akun, atau pos tertentu
   dari laporan keuangan. Registri perikatan, keberterimaan
   kerangka & materialitas elemen, keterkaitan dengan opini
   atas LK lengkap (¶15–16), dan pelaporan opini terpisah.
   ============================================================ */
const { useState: useState805 } = React;

/* ---- Ruang lingkup SA 805 (¶ A1–A5) ---- */
const SPE_SCOPE = [
  { k: 'LK Tunggal', ic: 'report', color: 'blue', desc: 'Satu laporan keuangan tersendiri — mis. neraca saja, atau laporan penerimaan & pengeluaran kas.', ex: 'Neraca · Laba Rugi · Arus Kas' },
  { k: 'Elemen / Akun', ic: 'columns', color: 'teal', desc: 'Suatu akun atau pos tunggal beserta pengungkapan terkait dalam LK.', ex: 'Piutang Usaha · Persediaan · Provisi' },
  { k: 'Skedul / Pos', ic: 'table', color: 'amber', desc: 'Skedul yang menjadi bagian LK — mis. skedul royalti, partisipasi laba, atau sewa.', ex: 'Royalti · Bonus · Skedul Sewa' },
  { k: 'In-Conjunction', ic: 'layers', color: 'purple', desc: 'Diaudit bersamaan dengan audit LK lengkap — opini tetap dinyatakan terpisah.', ex: 'Opini terpisah dari LK lengkap' },
];

/* ---- Registri perikatan SA 805 (Rp jt) ---- */
const SPE_ENG = [
  {
    id: 'SPE-01', client: 'PT Andalan Distribusi', subject: 'Skedul Piutang Usaha & CKPN', scope: 'Elemen / Akun',
    element: 'Piutang Usaha', framework: 'SAK — pos tunggal', conjunction: true, completeOpinion: 'WTM (Wajar)',
    matElement: 180, value: 24600, fee: 60, opinion: 'Wajar', standalone: false,
    purpose: 'audit atas skedul piutang usaha & cadangan kerugian penurunan nilai untuk keperluan pengajuan fasilitas anjak piutang ke bank.',
    users: 'Manajemen & Bank Pemberi Fasilitas',
    accept: [
      ['Kerangka pelaporan untuk pos tunggal dapat diterima & relevan', true],
      ['Opini atas LK lengkap WTM — tidak menghalangi opini atas elemen (¶15)', true],
      ['Materialitas elemen ditetapkan lebih rendah dari materialitas LK lengkap', true],
      ['Seluruh SA relevan diterapkan atas audit elemen', true],
    ],
    notes: 'Diaudit bersamaan dengan LK lengkap (WTM). Karena elemen bukan bagian besar yang menjadikan opini bertentangan, opini wajar atas elemen dapat dinyatakan terpisah.',
  },
  {
    id: 'SPE-02', client: 'Yayasan Cahaya Bangsa', subject: 'Laporan Penerimaan & Pengeluaran Kas', scope: 'LK Tunggal',
    element: 'Laporan Arus Kas (basis kas)', framework: 'Basis Kas — bertujuan khusus', conjunction: false, completeOpinion: '—',
    matElement: 95, value: 8400, fee: 48, opinion: 'Wajar', standalone: true,
    purpose: 'pelaporan penerimaan & pengeluaran kas program kepada pemberi dana hibah sebagai pertanggungjawaban penggunaan dana.',
    users: 'Lembaga Donor & Pembina Yayasan',
    accept: [
      ['Laporan tunggal disusun atas basis kas — kerangka bertujuan khusus', true],
      ['Tujuan & pengguna laporan teridentifikasi dengan jelas', true],
      ['Pengungkapan basis penyusunan memadai (bukan akrual penuh)', true],
      ['Materialitas mempertimbangkan kebutuhan pemberi dana', true],
    ],
    notes: 'Perikatan berdiri sendiri (tidak ada audit LK lengkap). Laporan auditor merujuk SA 805 & SA 800 untuk basis kas; distribusi terbatas pada pemberi dana.',
  },
  {
    id: 'SPE-03', client: 'PT Kreasi Media Nusantara', subject: 'Skedul Royalti & Bagi Hasil Lisensi', scope: 'Skedul / Pos',
    element: 'Skedul Royalti', framework: 'Basis Kontraktual — perjanjian lisensi', conjunction: false, completeOpinion: '—',
    matElement: 70, value: 5200, fee: 55, opinion: 'WDP', standalone: true,
    purpose: 'audit atas skedul perhitungan royalti & bagi hasil untuk pelaporan kepada pemberi lisensi sesuai klausul perjanjian.',
    users: 'Pemberi Lisensi (Licensor)',
    accept: [
      ['Basis perhitungan mengikuti definisi pendapatan dalam perjanjian lisensi', true],
      ['Pengguna terbatas pada para pihak penandatangan perjanjian', true],
      ['Klausul dasar perhitungan royalti yang ambigu telah diklarifikasi', false],
      ['Materialitas ditetapkan atas nilai skedul royalti', true],
    ],
    notes: 'Opini WDP — terdapat selisih dasar pengakuan pendapatan kotor vs neto pada satu kanal distribusi yang belum disepakati para pihak hingga tanggal laporan.',
  },
  {
    id: 'SPE-04', client: 'PT Bahtera Samudra Line', subject: 'Neraca Tunggal per 31 Des 2025', scope: 'LK Tunggal',
    element: 'Neraca (Laporan Posisi Keuangan)', framework: 'SAK — laporan tunggal', conjunction: true, completeOpinion: 'TMP (Disclaimer)',
    matElement: 220, value: 142000, fee: 90, opinion: 'Terkendala', standalone: false,
    purpose: 'audit atas neraca tersendiri yang diminta kreditur, sementara audit LK lengkap berakhir dengan tidak menyatakan pendapat.',
    users: 'Kreditur & Manajemen',
    accept: [
      ['Kerangka pelaporan neraca tunggal dapat diterima', true],
      ['Opini atas LK lengkap = TMP (disclaimer) — picu pembatasan ¶15', false],
      ['Neraca merupakan bagian besar dari LK lengkap → potensi pertentangan', false],
      ['Opini wajar terpisah atas neraca tidak tepat bila bertentangan', false],
    ],
    notes: '¶15: opini wajar atas neraca tunggal TIDAK dapat dinyatakan karena bertentangan dengan TMP atas LK lengkap. Perikatan dipending — disarankan tidak menerbitkan opini terpisah atau hanya bila disajikan tidak bersama LK lengkap & bukan bagian besar.',
  },
];

/* ============================================================ */
function SA805View() {
  const [selId, setSelId] = useState805('SPE-01');
  const [tab, setTab] = useState805('registri');
  const sel = SPE_ENG.find(e => e.id === selId);

  const tabs = [
    { id: 'registri', label: 'Registri & Ruang Lingkup' },
    { id: 'keberterimaan', label: 'Keberterimaan & Materialitas' },
    { id: 'keterkaitan', label: 'Keterkaitan Opini (¶15–16)' },
    { id: 'laporan', label: 'Pelaporan & Opini Terpisah' },
  ];

  const conj = SPE_ENG.filter(e => e.conjunction).length;
  const constrained = SPE_ENG.filter(e => e.opinion === 'Terkendala').length;

  return (
    <>
      <SubBar moduleId="sa805" right={
        <div className="row gap8 ac">
          {constrained > 0 && <Badge kind="red" dot>{constrained} terkendala ¶15</Badge>}
          <Btn sm><I.download size={13} /> Memo SA 805</Btn>
          <Btn sm variant="primary"><I.sparkle size={14} /> AI Assist</Btn>
        </div>
      } />
      <div className="view-scroll"><div className="view-pad">

        <Panel noBody style={{ marginBottom: 12 }}>
          <div style={{ padding: '13px 16px', display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ minWidth: 240 }}>
              <div className="tiny muted upper" style={{ marginBottom: 3 }}>Standar Audit 805</div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>Audit LK Tunggal & Elemen Tertentu</div>
              <div className="tiny muted">Pertimbangan khusus atas satu LK / akun / pos</div>
            </div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Perikatan</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5 }}>{SPE_ENG.length} aktif</div></div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">In-Conjunction</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--purple)' }}>{conj} perikatan</div></div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Terkendala ¶15</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--red)' }}>{constrained} perikatan</div></div>
            <div style={{ flex: 1 }} />
            <div style={{ textAlign: 'right' }}>
              <div className="tiny muted upper" style={{ marginBottom: 3 }}>Acuan</div>
              <Badge kind="blue">SA 805 · SA 700/705/706</Badge>
            </div>
          </div>
        </Panel>

        <div style={{ marginBottom: 12 }}><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>

        {tab === 'registri' && <F805Registri selId={selId} setSelId={setSelId} sel={sel} />}
        {tab === 'keberterimaan' && <F805Accept sel={sel} />}
        {tab === 'keterkaitan' && <F805Link sel={sel} />}
        {tab === 'laporan' && <F805Report sel={sel} />}

      </div></div>
    </>
  );
}

/* ---- helper warna ruang lingkup ---- */
function speColor(t) { const m = SPE_SCOPE.find(x => x.k === t); return m ? m.color : 'gray'; }
function opnKind(o) { return o === 'Wajar' ? 'green' : o === 'WDP' ? 'amber' : o === 'Terkendala' ? 'red' : 'gray'; }

/* ---------------- Tab: Registri & Ruang Lingkup ---------------- */
function F805Registri({ selId, setSelId, sel }) {
  return (
    <div className="grid" style={{ gap: 12 }}>
      <Panel noBody>
        <div className="panel-h"><h3>Ruang Lingkup Perikatan SA 805 (¶A1–A5)</h3><div style={{ flex: 1 }} /><Badge kind="blue">4 bentuk</Badge></div>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 0 }}>
          {SPE_SCOPE.map((d, i) => {
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

      <div className="grid" style={{ gridTemplateColumns: '1fr 384px', gap: 12, alignItems: 'start' }}>
        <Panel noBody>
          <div className="panel-h"><h3>Registri Perikatan LK Tunggal & Elemen</h3><div style={{ flex: 1 }} /><span className="tiny muted">{SPE_ENG.length} perikatan</span></div>
          <table className="dtbl">
            <thead><tr><th style={{ width: 60 }}>Ref</th><th>Klien & Subjek</th><th style={{ width: 116 }}>Lingkup</th><th style={{ width: 78 }}>Conj.</th><th style={{ width: 86 }}>Opini</th></tr></thead>
            <tbody>
              {SPE_ENG.map(e => (
                <tr key={e.id} className={e.id === selId ? 'sel' : ''} onClick={() => setSelId(e.id)} style={{ cursor: 'pointer' }}>
                  <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{e.id}</td>
                  <td style={{ whiteSpace: 'normal', lineHeight: 1.35 }}><div style={{ fontWeight: 600 }}>{e.client}</div><div className="tiny muted">{e.subject}</div></td>
                  <td><Badge kind={speColor(e.scope)}>{e.scope}</Badge></td>
                  <td>{e.conjunction ? <Badge kind="purple">Ya</Badge> : <Badge kind="gray">Standalone</Badge>}</td>
                  <td><Badge kind={opnKind(e.opinion)}>{e.opinion}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        {sel && (
          <Panel noBody>
            <div style={{ background: 'var(--surface-2)', padding: '11px 14px', borderBottom: '1px solid var(--line)' }}>
              <div className="row ac gap8"><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{sel.id}</span><Badge kind={speColor(sel.scope)}>{sel.scope}</Badge></div>
              <div style={{ fontWeight: 700, fontSize: 13, marginTop: 4 }}>{sel.client}</div>
              <div className="tiny muted">{sel.subject}</div>
            </div>
            <div style={{ padding: 14 }}>
              <div className="tiny muted upper" style={{ marginBottom: 4 }}>Tujuan Audit</div>
              <p style={{ margin: '0 0 12px', fontSize: 12, lineHeight: 1.5 }}>Perikatan {sel.purpose}</p>
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                <KvBox label="Subjek / Elemen" v={sel.element} />
                <KvBox label="Nilai Subjek (Rp jt)" v={sel.value.toLocaleString('id-ID')} />
                <KvBox label="Materialitas Elemen" v={'Rp ' + sel.matElement.toLocaleString('id-ID') + ' jt'} accent="var(--blue)" />
                <KvBox label="Opini LK Lengkap" v={sel.completeOpinion} accent={sel.completeOpinion.startsWith('TMP') || sel.completeOpinion.startsWith('TW') ? 'var(--red)' : undefined} />
              </div>
              <div className="panel" style={{ padding: '9px 11px', background: 'var(--surface-2)', borderColor: 'transparent' }}>
                <div className="row gap8" style={{ alignItems: 'flex-start' }}>
                  <span style={{ color: sel.opinion === 'Terkendala' ? 'var(--red)' : 'var(--blue)', flex: '0 0 auto' }}><I.flag size={14} /></span>
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

/* ---------------- Tab: Keberterimaan & Materialitas ---------------- */
function F805Accept({ sel }) {
  if (!sel) return null;
  const done = sel.accept.filter(a => a[1]).length;
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 340px', gap: 12, alignItems: 'start' }}>
      <Panel noBody>
        <div className="panel-h"><h3>Penerimaan Perikatan & Keberterimaan Kerangka (¶6–9)</h3><div style={{ flex: 1 }} /><Badge kind={done === sel.accept.length ? 'green' : 'amber'}>{done}/{sel.accept.length} terpenuhi</Badge></div>
        <div style={{ padding: '6px 14px 14px' }}>
          {sel.accept.map((a, i) => (
            <div key={i} className="row gap10" style={{ padding: '11px 0', alignItems: 'flex-start', borderBottom: i < sel.accept.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
              <span style={{ flex: '0 0 auto', marginTop: 1, color: a[1] ? 'var(--green)' : 'var(--red)' }}>{a[1] ? <I.checkCircle size={16} /> : <I.alert size={16} />}</span>
              <div style={{ flex: 1, fontSize: 12.5, lineHeight: 1.45 }}>{a[0]}</div>
            </div>
          ))}
        </div>
        <div className="panel" style={{ margin: 12, padding: '10px 12px', background: 'var(--blue-050)', borderColor: 'var(--blue-100)' }}>
          <div className="row gap8" style={{ alignItems: 'flex-start' }}>
            <span style={{ color: 'var(--blue)', flex: '0 0 auto' }}><I.book size={15} /></span>
            <span style={{ fontSize: 11.5, lineHeight: 1.45 }}>Auditor menentukan keberterimaan <b>kerangka pelaporan</b> yang diterapkan, apakah audit dapat dilakukan atas <b>satu elemen</b> tersendiri, & menyepakati <b>bentuk opini</b> bersama manajemen (¶6–9).</span>
          </div>
        </div>
      </Panel>

      <div className="grid" style={{ gap: 12 }}>
        <Panel title="Materialitas Elemen (¶ A11)">
          <div style={{ display: 'grid', gap: 8 }}>
            <RowKv label="Nilai Subjek" v={'Rp ' + sel.value.toLocaleString('id-ID') + ' jt'} />
            <RowKv label="Materialitas Elemen" v={'Rp ' + sel.matElement.toLocaleString('id-ID') + ' jt'} />
            <RowKv label="% atas Subjek" v={(sel.matElement / sel.value * 100).toFixed(1) + '%'} />
          </div>
          <p className="tiny muted" style={{ margin: '10px 0 0', lineHeight: 1.5 }}>Materialitas untuk satu elemen/akun umumnya <b>lebih rendah</b> dari materialitas atas LK lengkap — ditetapkan relatif terhadap nilai elemen, bukan total aset/laba entitas.</p>
        </Panel>
        <Panel title="Pengguna & Bentuk Kerangka">
          <div style={{ display: 'grid', gap: 7 }}>
            <RowKv label="Pengguna Dituju" v={sel.users} />
            <RowKv label="Kerangka" v={sel.framework} />
            <RowKv label="Distribusi" v={sel.standalone ? 'Terbatas' : 'Sesuai LK lengkap'} />
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ---------------- Tab: Keterkaitan Opini (¶15–16) ---------------- */
function F805Link({ sel }) {
  if (!sel) return null;
  const adverse = sel.completeOpinion.startsWith('TMP') || sel.completeOpinion.startsWith('TW');
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 340px', gap: 12, alignItems: 'start' }}>
      <div className="grid" style={{ gap: 12 }}>
        <Panel noBody>
          <div className="panel-h"><h3>Keterkaitan dengan Opini atas LK Lengkap</h3><div style={{ flex: 1 }} /><Badge kind={adverse ? 'red' : 'green'}>{sel.completeOpinion}</Badge></div>
          <div style={{ padding: 14 }}>
            <div className="grid" style={{ gridTemplateColumns: '1fr 24px 1fr', gap: 0, alignItems: 'center' }}>
              <div className="panel" style={{ padding: '12px 14px', boxShadow: 'none', borderColor: 'var(--line)' }}>
                <div className="tiny muted upper" style={{ marginBottom: 4 }}>Audit LK Lengkap</div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{sel.completeOpinion}</div>
                <div className="tiny muted" style={{ marginTop: 3, lineHeight: 1.4 }}>{sel.conjunction ? 'Diaudit bersamaan dengan elemen' : 'Tidak ada audit LK lengkap (standalone)'}</div>
              </div>
              <div style={{ display: 'grid', placeItems: 'center', color: 'var(--ink-4)' }}><I.arrowRight size={18} /></div>
              <div className="panel" style={{ padding: '12px 14px', boxShadow: 'none', borderLeft: `3px solid var(--${opnKind(sel.opinion)})` }}>
                <div className="tiny muted upper" style={{ marginBottom: 4 }}>Opini Elemen (SA 805)</div>
                <div style={{ fontWeight: 700, fontSize: 13, color: `var(--${opnKind(sel.opinion)})` }}>{sel.opinion === 'Terkendala' ? 'Tidak dapat dinyatakan wajar' : sel.opinion}</div>
                <div className="tiny muted" style={{ marginTop: 3, lineHeight: 1.4 }}>{sel.element}</div>
              </div>
            </div>
          </div>
        </Panel>

        <Panel noBody>
          <div className="panel-h"><h3>Aturan Pembatasan ¶15–16</h3></div>
          <div style={{ padding: '6px 14px 14px' }}>
            {[
              { ok: !adverse, t: '¶15 — Opini modifikasian / TMP atas LK lengkap', d: 'Bila opini atas LK lengkap adalah tidak wajar (TW) atau tidak menyatakan pendapat (TMP), auditor TIDAK boleh menyatakan opini wajar tanpa modifikasi atas elemen yang merupakan bagian besar dari LK tersebut.' },
              { ok: true, t: '¶16 — Pengecualian penyajian terpisah', d: 'Opini wajar atas elemen tetap mungkin bila: (a) tidak dilarang regulasi; (b) opini disajikan TIDAK bersama LK lengkap; & (c) elemen bukan bagian besar dari LK lengkap.' },
              { ok: true, t: 'Paragraf Hal Lain bila perlu', d: 'Untuk membedakan opini elemen dari opini LK lengkap, gunakan paragraf Hal Lain (SA 706) merujuk tanggal & jenis opini atas LK lengkap.' },
            ].map((r, i) => (
              <div key={i} className="row gap10" style={{ padding: '11px 0', alignItems: 'flex-start', borderBottom: i < 2 ? '1px solid var(--line-soft)' : 0 }}>
                <span style={{ flex: '0 0 auto', marginTop: 1, color: r.ok ? 'var(--green)' : 'var(--red)' }}>{r.ok ? <I.checkCircle size={16} /> : <I.alert size={16} />}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700 }}>{r.t}</div>
                  <div className="tiny muted" style={{ lineHeight: 1.45, marginTop: 2 }}>{r.d}</div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid" style={{ gap: 12 }}>
        <Panel title={adverse ? 'Status: Terkendala ¶15' : 'Status: Dapat Diopinikan'}>
          <div className="panel" style={{ padding: '11px 12px', background: adverse ? 'var(--red-bg)' : 'var(--green-bg)', borderColor: 'transparent' }}>
            <div className="row gap8" style={{ alignItems: 'flex-start' }}>
              <span style={{ color: adverse ? 'var(--red)' : 'var(--green)', flex: '0 0 auto' }}>{adverse ? <I.alert size={15} /> : <I.checkCircle size={15} />}</span>
              <span style={{ fontSize: 11.5, lineHeight: 1.45 }}>{adverse
                ? <>Opini wajar atas <b>{sel.element}</b> bertentangan dengan {sel.completeOpinion} atas LK lengkap. Pertimbangkan menunda penerbitan atau menerapkan pengecualian ¶16.</>
                : <>Opini atas <b>{sel.element}</b> dapat dinyatakan terpisah; opini atas LK lengkap ({sel.completeOpinion || 'tidak ada'}) tidak menimbulkan pertentangan.</>}</span>
            </div>
          </div>
        </Panel>
        <Panel title="Tautan Modul">
          <div style={{ display: 'grid', gap: 7 }}>
            {[['materiality', 'Materiality', 'scale'], ['opinion', 'Audit Opinion Generator', 'gavel'], ['sa705', 'SA 705/706 · Modifikasi', 'doc']].map((r, i) => {
              const Ic = I[r[2]];
              return <NavRow805 key={i} to={r[0]} label={r[1]} ic={Ic} />;
            })}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function NavRow805({ to, label, ic: Ic }: any) {
  const nav = useNav();
  return (
    <div onClick={() => nav(to)} className="row jb ac" style={{ fontSize: 12, padding: '8px 10px', border: '1px solid var(--line-soft)', borderRadius: 7, cursor: 'pointer' }}>
      <span className="row ac gap8"><span style={{ color: 'var(--blue)' }}><Ic size={14} /></span>{label}</span>
      <I.arrowRight size={14} style={{ color: 'var(--ink-4)' }} />
    </div>
  );
}

/* ---------------- Tab: Pelaporan & Opini Terpisah ---------------- */
function F805Report({ sel }) {
  if (!sel) return null;
  const constrained = sel.opinion === 'Terkendala';
  const opLabel = sel.opinion === 'Wajar' ? 'Tanpa Modifikasian' : sel.opinion === 'WDP' ? 'Dengan Pengecualian (WDP)' : 'Terkendala (¶15)';
  return (
    <div className="grid" style={{ gridTemplateColumns: '320px 1fr', gap: 12, alignItems: 'start' }}>
      <div className="grid" style={{ gap: 12 }}>
        <Panel title="Elemen Wajib Laporan SA 805">
          <div style={{ display: 'grid', gap: 7 }}>
            {[
              ['Judul & subjek audit (elemen/LK tunggal)', '¶11'],
              ['Identifikasi kerangka pelaporan elemen', '¶11'],
              ['Opini terpisah atas elemen/LK tunggal', '¶11'],
              ['Paragraf Hal Lain — rujuk opini LK lengkap', '¶14'],
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
            <RowKv label="Diaudit Bersamaan" v={sel.conjunction ? 'Ya — LK lengkap' : 'Tidak (standalone)'} />
            <RowKv label="Opini LK Lengkap" v={sel.completeOpinion} />
          </div>
          {constrained && (
            <div className="panel" style={{ marginTop: 10, padding: '9px 11px', background: 'var(--red-bg)', borderColor: 'transparent' }}>
              <div className="row gap8" style={{ alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--red)', flex: '0 0 auto' }}><I.alert size={14} /></span>
                <span style={{ fontSize: 11, lineHeight: 1.4 }}>Penerbitan opini wajar atas elemen ditahan — bertentangan dengan opini {sel.completeOpinion} atas LK lengkap (¶15).</span>
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
            <div className="tiny" style={{ textAlign: 'center', color: '#7a8893', marginBottom: 16 }}>Audit atas {sel.subject} — SA 805</div>
            <p style={{ margin: '0 0 10px' }}>Kepada {sel.users} — {sel.client}</p>

            <div style={{ fontWeight: 700, color: '#0c2430', margin: '12px 0 4px' }}>Opini ({opLabel})</div>
            <p style={{ margin: '0 0 10px' }}>Kami telah mengaudit <b>{sel.subject.toLowerCase()}</b> {sel.client} ("{sel.element}") yang disusun berdasarkan {sel.framework}. {constrained
              ? 'Karena opini kami atas laporan keuangan lengkap entitas adalah ' + sel.completeOpinion + ', kami tidak dapat dan tidak menyatakan opini wajar atas elemen ini bila disajikan bersama laporan keuangan lengkap tersebut (SA 805 ¶15).'
              : sel.opinion === 'Wajar'
                ? 'Menurut opini kami, ' + sel.element.toLowerCase() + ' menyajikan secara wajar, dalam semua hal yang material, sesuai dengan kerangka pelaporan tersebut.'
                : 'Kecuali untuk dampak hal yang diuraikan dalam Basis untuk Opini Dengan Pengecualian, ' + sel.element.toLowerCase() + ' menyajikan secara wajar, dalam semua hal yang material, sesuai dengan kerangka pelaporan tersebut.'}</p>

            {sel.conjunction && (
              <>
                <div style={{ fontWeight: 700, color: '#0c2430', margin: '12px 0 4px' }}>Hal Lain</div>
                <p style={{ margin: '0 0 10px' }}>Kami telah mengaudit laporan keuangan lengkap {sel.client} untuk tahun yang berakhir pada tanggal yang sama, dan dalam laporan kami tertanggal {new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })} kami menyatakan opini <b>{sel.completeOpinion}</b> atas laporan keuangan tersebut.</p>
              </>
            )}

            <div style={{ fontWeight: 700, color: '#0c2430', margin: '12px 0 4px' }}>Tanggung Jawab atas Audit Elemen</div>
            <p style={{ margin: 0 }}>Audit ini dilaksanakan sesuai Standar Audit (SA), termasuk SA 805. Materialitas ditetapkan atas {sel.element.toLowerCase()} secara tersendiri, sebesar Rp {sel.matElement.toLocaleString('id-ID')} juta.</p>

            <div style={{ marginTop: 24, paddingTop: 10, borderTop: '1px solid #e0e5ea', fontSize: 11 }}><b>Hartono Wijaya, CPA</b> · Akuntan Publik<br /><span className="tiny" style={{ color: '#7a8893' }}>Jakarta, {new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</span></div>
          </div>
        </div>
      </Panel>
    </div>
  );
}

Object.assign(window, { SA805View });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { SA805View };
