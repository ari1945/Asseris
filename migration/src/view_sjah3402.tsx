/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { useNav } from './contexts.jsx';
import { I } from './icons.jsx';
import { SubBar } from './shell.jsx';
import { Badge, Btn, Panel, Progress, Tabs } from './ui.jsx';
import { KvBox } from './view_analytical';
import { RowKv } from './view_calc';

/* ============================================================
   NeoSuite AMS — SJAH 3402 · Laporan Asurans atas Pengendalian
   Organisasi Jasa (selaras ISAE 3402 / SOC 1). Deep methodology:
   anatomi perikatan (Type 1 vs Type 2 · langsung + asersi · tiga
   pihak · inclusive/carve-out), matriks tujuan pengendalian →
   kontrol, pengujian pengendalian (sifat, sampel, deviasi) dengan
   evaluasi deviasi, CUEC, serta opini tiga-bagian (deskripsi ·
   desain · efektivitas operasi).

   SUMBER KEBENARAN TUNGGAL: AMS.socEngine(exec). Seluruh
   agregat & opini ditarik dari engine — tak ada hardcode. Status
   pengujian disimpan di ams.v1.soc3402.exec & dibaca lintas modul
   (Asurans Lain · Portofolio Jasa · Organisasi Jasa SA 402 ·
   Matriks Kepatuhan).
   ============================================================ */
const { useState: useS42 } = React;

function SJAH3402View() {
  const nav = useNav();
  const [exec, setExec] = window.useAmsPersist('soc3402.exec', {});
  const [tab, setTab] = useS42('anatomi');
  const E = (AMS as any).socEngine(exec);
  const A = E.meta;

  const toggle = (id, seed) => setExec(s => {
    const cur = Object.prototype.hasOwnProperty.call(s, id) ? s[id] : seed;
    return { ...s, [id]: !cur };
  });

  const tabs = [
    { id: 'anatomi', label: 'Anatomi Perikatan' },
    { id: 'kontrol', label: 'Tujuan & Matriks Kontrol' },
    { id: 'pengujian', label: 'Pengujian & Hasil' },
    { id: 'laporan', label: 'Opini & Laporan' },
  ];

  return (
    <>
      <SubBar moduleId="sjah3402" right={
        <div className="row gap8 ac">
          <Badge kind="blue" dot>{A.reportType} · keyakinan {A.level}</Badge>
          <Btn sm onClick={() => nav('serviceorg', { from: 'sjah3402' })}><I.server size={13} /> SA 402 (sisi pengguna)</Btn>
          <Btn sm variant="primary"><I.sparkle size={14} /> AI Assist</Btn>
        </div>
      } />
      <div className="view-scroll"><div className="view-pad">

        {/* command band — semua angka dari engine */}
        <Panel noBody style={{ marginBottom: 12 }}>
          <div style={{ padding: '13px 16px', display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ minWidth: 240 }}>
              <div className="tiny muted upper" style={{ marginBottom: 3 }}>SJAH 3402 · selaras ISAE 3402 / SOC 1</div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{A.client.replace('PT ', '')} — Organisasi Jasa Penggajian</div>
              <div className="tiny muted">{A.id} · {A.system}</div>
            </div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Tipe Laporan</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--blue)' }}>{A.reportType}</div></div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Tujuan · Kontrol</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5 }}>{E.counts.objectives} · {E.counts.controls}</div></div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Deviasi · Pengecualian</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5, color: E.counts.exceptionsReported ? 'var(--red)' : (E.counts.deviationsNoted ? 'var(--amber)' : 'var(--green)') }}>{E.counts.deviationsNoted} · {E.counts.exceptionsReported}</div></div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Opini</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5, color: E.opinion.type === 'unqualified' ? 'var(--green)' : 'var(--red)' }}>{E.opinion.label}</div></div>
            <div style={{ flex: 1 }} />
            <div style={{ textAlign: 'right', minWidth: 120 }}>
              <div className="tiny muted upper" style={{ marginBottom: 4 }}>Progres Pengujian</div>
              <div className="row ac gap8" style={{ justifyContent: 'flex-end' }}>
                <div style={{ width: 90 }}><Progress value={E.progress} color={E.allTested ? 'var(--green)' : undefined} /></div>
                <span className="mono" style={{ fontWeight: 700, fontSize: 12.5 }}>{E.progress}%</span>
              </div>
            </div>
          </div>
        </Panel>

        <div style={{ marginBottom: 12 }}><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>

        {tab === 'anatomi' && <SocAnatomy E={E} A={A} />}
        {tab === 'kontrol' && <SocMatrix E={E} />}
        {tab === 'pengujian' && <SocTesting E={E} toggle={toggle} />}
        {tab === 'laporan' && <SocReport E={E} A={A} />}

      </div></div>
    </>
  );
}

/* ---------------- Tab: Anatomi Perikatan ---------------- */
function SocAnatomy({ E, A }) {
  const acc = A.terms.filter(t => t.ok).length;
  const nav = useNav();
  return (
    <div className="grid" style={{ gap: 12 }}>
      <Panel noBody>
        <div className="panel-h"><h3>Type 1 vs Type 2 (¶9)</h3><div style={{ flex: 1 }} /><Badge kind="blue">Perikatan ini: {A.reportType}</Badge></div>
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 0 }}>
          {[
            ['Type 1 — Desain pada satu tanggal', 'Opini atas kewajaran deskripsi & kesesuaian desain pengendalian per tanggal tertentu. Tidak menguji efektivitas operasi.', 'teal', A.reportType === 'Type 1'],
            ['Type 2 — Desain + Efektivitas Operasi', 'Mencakup Type 1 ditambah opini atas efektivitas operasi pengendalian sepanjang periode, beserta deskripsi pengujian & hasilnya.', 'blue', A.reportType === 'Type 2'],
          ].map((r, i) => (
            <div key={i} style={{ padding: 16, borderRight: i === 0 ? '1px solid var(--line-soft)' : 0, background: r[3] ? 'var(--' + r[2] + '-bg)' : 'transparent' }}>
              <div className="row jb ac"><div style={{ fontWeight: 700, fontSize: 13 }}>{r[0]}</div>{r[3] && <Badge kind={r[2]}>Perikatan ini</Badge>}</div>
              <p className="tiny muted" style={{ margin: '6px 0 0', lineHeight: 1.5 }}>{r[1]}</p>
            </div>
          ))}
        </div>
        <div className="panel" style={{ margin: 12, padding: '10px 12px', background: 'var(--blue-050)', borderColor: 'var(--blue-100)' }}>
          <div className="row gap8" style={{ alignItems: 'flex-start' }}>
            <span style={{ color: 'var(--blue)', flex: '0 0 auto' }}><I.book size={15} /></span>
            <span style={{ fontSize: 11.5, lineHeight: 1.45 }}>Perikatan <b>Type 2</b> menyediakan bukti efektivitas operasi sepanjang <b>{A.period}</b> — paling berguna bagi auditor entitas pengguna untuk mengandalkan pengendalian organisasi jasa (lihat tautan SA 402 di bilah atas).</span>
          </div>
        </div>
      </Panel>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }}>
        <Panel noBody>
          <div className="panel-h"><h3>Hubungan Tiga Pihak & Pendekatan</h3></div>
          <div style={{ padding: 14, display: 'grid', gap: 10 }}>
            {[
              ['group', 'blue', 'Auditor Jasa (Praktisi)', A.partner + ' — menyatakan opini atas pengendalian organisasi jasa.'],
              ['building', 'teal', 'Organisasi Jasa (Pihak Bertanggung Jawab)', A.responsibleParty + ' — menyusun deskripsi sistem & asersi tertulis.'],
              ['users', 'purple', 'Pengguna yang Dituju', A.intendedUsers],
            ].map((r, i) => {
              const Ic = I[r[0]];
              return (
                <div key={i} className="row gap10" style={{ alignItems: 'flex-start' }}>
                  <span style={{ width: 32, height: 32, borderRadius: 8, flex: '0 0 32px', display: 'grid', placeItems: 'center', background: `var(--${r[1]}-bg)`, color: `var(--${r[1]})` }}><Ic size={16} /></span>
                  <div><div style={{ fontWeight: 700, fontSize: 12 }}>{r[2]}</div><div className="tiny muted" style={{ lineHeight: 1.45, marginTop: 2 }}>{r[3]}</div></div>
                </div>
              );
            })}
            <div className="divider" />
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <KvBox label="Pendekatan" v={A.approach} accent="var(--navy)" />
              <KvBox label="Tingkat Keyakinan" v={A.level + ' (positif)'} accent="var(--blue)" />
            </div>
          </div>
        </Panel>

        <div className="grid" style={{ gap: 12 }}>
          <Panel noBody>
            <div className="panel-h"><h3>Organisasi Subservice (¶A14)</h3><div style={{ flex: 1 }} /><Badge kind={A.subservice.method === 'Carve-out' ? 'amber' : 'blue'}>{A.subservice.method}</Badge></div>
            <div style={{ padding: 14 }}>
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 0, marginBottom: 10 }}>
                {[
                  ['Inclusive', 'Kontrol subservice termasuk dalam deskripsi & lingkup pengujian.', A.subservice.method === 'Inclusive'],
                  ['Carve-out', 'Kontrol subservice dikecualikan; pengguna mengandalkan CSOC & laporan terpisah.', A.subservice.method === 'Carve-out'],
                ].map((r, i) => (
                  <div key={i} style={{ padding: '8px 10px', borderRight: i === 0 ? '1px solid var(--line-soft)' : 0, background: r[2] ? 'var(--surface-2)' : 'transparent', borderRadius: 6 }}>
                    <div className="row jb ac"><span style={{ fontWeight: 700, fontSize: 11.5 }}>{r[0]}</span>{r[2] && <I.check size={13} style={{ color: 'var(--blue)' }} />}</div>
                    <div className="tiny muted" style={{ lineHeight: 1.4, marginTop: 3 }}>{r[1]}</div>
                  </div>
                ))}
              </div>
              <div className="tiny" style={{ lineHeight: 1.5, color: 'var(--ink-2)' }}>{A.subservice.note}</div>
            </div>
          </Panel>
          <Panel title="Konteks Perikatan">
            <div style={{ display: 'grid', gap: 8 }}>
              <RowKv label="Periode" v={A.periodShort} />
              <RowKv label="Kriteria" v="Deskripsi & tujuan pengendalian manajemen" />
              <RowKv label="Penanggung Jawab" v={A.manager} />
              <RowKv label="Standar" v={A.std} />
            </div>
          </Panel>
        </div>
      </div>

      <Panel noBody>
        <div className="panel-h"><h3>Penerimaan Perikatan (¶13–17)</h3><div style={{ flex: 1 }} /><span className="mono tiny" style={{ fontWeight: 700, color: acc === A.terms.length ? 'var(--green)' : 'var(--amber)' }}>{acc}/{A.terms.length}</span></div>
        <div style={{ padding: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '7px 24px' }}>
          {A.terms.map((t, i) => (
            <div key={i} className="row gap8" style={{ alignItems: 'flex-start', fontSize: 12 }}>
              <span style={{ color: t.ok ? 'var(--green)' : 'var(--amber)', flex: '0 0 auto', marginTop: 1 }}>{t.ok ? <I.checkCircle size={15} /> : <I.clock size={15} />}</span>
              <span style={{ lineHeight: 1.45 }}>{t.k}</span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

/* ---------------- Tab: Tujuan & Matriks Kontrol ---------------- */
function SocMatrix({ E }) {
  return (
    <div className="grid" style={{ gap: 12 }}>
      <Panel noBody>
        <div className="panel-h"><h3>Matriks Tujuan Pengendalian → Kontrol</h3><div style={{ flex: 1 }} /><span className="tiny muted">{E.counts.objectives} tujuan · {E.counts.controls} kontrol</span></div>
        <table className="dtbl">
          <thead><tr>
            <th style={{ width: 52 }}>Ref</th><th>Kontrol</th><th style={{ width: 92 }}>Jenis</th>
            <th style={{ width: 120 }}>Frekuensi</th><th style={{ width: 150 }}>Sifat Uji</th><th style={{ width: 82 }}>Desain</th>
          </tr></thead>
          <tbody>
            {E.objectives.map(o => (
              <React.Fragment key={o.id}>
                <tr style={{ background: 'var(--surface-2)' }}>
                  <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{o.id}</td>
                  <td colSpan={4} style={{ fontWeight: 700, fontSize: 12 }}>{o.name}<div className="tiny muted" style={{ fontWeight: 400, marginTop: 1 }}>{o.desc}</div></td>
                  <td><Badge kind="green">Sesuai</Badge></td>
                </tr>
                {o.controls.map(c => (
                  <tr key={c.id}>
                    <td className="mono tiny muted" style={{ fontWeight: 700 }}>{c.id}</td>
                    <td style={{ whiteSpace: 'normal', lineHeight: 1.35, fontWeight: 500 }}>{c.name}</td>
                    <td><span className="chip tiny">{c.type}</span></td>
                    <td className="tiny muted">{c.freq}</td>
                    <td className="tiny">{c.nature.join(' · ')}</td>
                    <td><span style={{ color: 'var(--green)' }}><I.check size={14} /></span></td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
        <div className="panel" style={{ margin: 12, padding: '9px 11px', background: 'var(--blue-050)', borderColor: 'var(--blue-100)' }}>
          <div className="row gap8" style={{ alignItems: 'flex-start' }}>
            <span style={{ color: 'var(--blue)', flex: '0 0 auto' }}><I.target size={15} /></span>
            <span style={{ fontSize: 11.5, lineHeight: 1.45 }}>Tujuan pengendalian ditetapkan <b>manajemen organisasi jasa</b>; auditor jasa menilai kesesuaian desain kontrol untuk mencapai tiap tujuan, lalu (Type 2) menguji efektivitas operasinya sepanjang periode pada tab <b>Pengujian & Hasil</b>.</span>
          </div>
        </div>
      </Panel>
    </div>
  );
}

/* ---------------- Tab: Pengujian & Hasil ---------------- */
function SocTesting({ E, toggle }) {
  const natColor = { 'Inspeksi': 'blue', 'Reperformance': 'purple', 'Observasi': 'teal', 'Inquiry': 'amber' };
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 320px', gap: 12, alignItems: 'start' }}>
      <div className="grid" style={{ gap: 12 }}>
        <Panel noBody>
          <div className="panel-h"><h3>Pengujian Pengendalian — Efektivitas Operasi (Type 2)</h3><div style={{ flex: 1 }} /><span className="mono tiny" style={{ fontWeight: 700 }}>{E.counts.controlsTested}/{E.counts.controls} diuji{E.counts.deviationsNoted ? ' · ' + E.counts.deviationsNoted + ' deviasi' : ''}</span></div>
          <table className="dtbl">
            <thead><tr>
              <th style={{ width: 48 }}>Ref</th><th>Kontrol & Sifat Uji</th><th style={{ width: 92 }}>Sampel</th>
              <th style={{ width: 74 }}>Deviasi</th><th style={{ width: 96 }}>Hasil</th><th style={{ width: 88 }}>Status</th>
            </tr></thead>
            <tbody>
              {E.objectives.map(o => (
                <React.Fragment key={o.id}>
                  <tr style={{ background: 'var(--surface-2)' }}>
                    <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{o.id}</td>
                    <td colSpan={3} style={{ fontWeight: 700, fontSize: 11.5 }}>{o.name}</td>
                    <td colSpan={2}>{!o.allTested ? <Badge kind="gray">Berjalan {o.tested}/{o.total}</Badge> : (o.achieved ? <Badge kind="green">Tujuan tercapai</Badge> : <Badge kind="red">Belum tercapai</Badge>)}</td>
                  </tr>
                  {o.controls.map(c => (
                    <tr key={c.id}>
                      <td className="mono tiny muted" style={{ fontWeight: 700, verticalAlign: 'top' }}>{c.id}</td>
                      <td style={{ whiteSpace: 'normal', lineHeight: 1.35, verticalAlign: 'top' }}>{c.name}
                        <div className="row gap6" style={{ marginTop: 3, flexWrap: 'wrap' }}>{c.nature.map(n => <span key={n} className="chip tiny" style={{ background: `var(--${natColor[n] || 'blue'}-bg)`, color: `var(--${natColor[n] || 'blue'})` }}>{n}</span>)}</div>
                      </td>
                      <td className="mono tiny" style={{ verticalAlign: 'top' }}>{c.sample} / {c.pop}</td>
                      <td className="mono tiny" style={{ verticalAlign: 'top', fontWeight: 700, color: c.dev > 0 ? 'var(--amber)' : 'var(--ink-3)' }}>{c.dev}</td>
                      <td style={{ verticalAlign: 'top' }}>{c.tested
                        ? (c.dev === 0 ? <Badge kind="green">Efektif</Badge> : <Badge kind="amber">Deviasi</Badge>)
                        : <span className="tiny muted">—</span>}</td>
                      <td style={{ verticalAlign: 'top' }}>
                        <button onClick={() => toggle(c.id, c.seedDone)} className="chip" style={{ cursor: 'pointer', height: 24, fontWeight: 700, border: '1px solid ' + (c.tested ? 'var(--green)' : 'var(--line-strong)'), background: c.tested ? 'var(--green-bg)' : '#fff', color: c.tested ? 'var(--green)' : 'var(--ink-3)' }}>{c.tested ? 'Diuji' : 'Tandai'}</button>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </Panel>

        {E.controls.filter(c => c.deviationNoted).map(c => (
          <Panel key={c.id} noBody>
            <div className="panel-h"><h3>Evaluasi Deviasi — {c.id}</h3><div style={{ flex: 1 }} /><Badge kind={c.reportedException ? 'red' : 'green'}>{c.reportedException ? 'Pengecualian dilaporkan' : 'Tujuan tetap tercapai'}</Badge></div>
            <div style={{ padding: 14 }}>
              <div className="grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 12 }}>
                <KvBox label="Terisolasi" v={c.eval.isolated ? 'Ya' : 'Tidak'} accent={c.eval.isolated ? 'var(--green)' : 'var(--red)'} />
                <KvBox label="Remediasi" v={c.eval.remediated ? 'Sudah' : 'Belum'} accent={c.eval.remediated ? 'var(--green)' : 'var(--amber)'} />
                <KvBox label="Tujuan Tercapai" v={c.eval.objectiveAchieved ? 'Ya' : 'Tidak'} accent={c.eval.objectiveAchieved ? 'var(--green)' : 'var(--red)'} />
              </div>
              <div className="tiny" style={{ lineHeight: 1.55, color: 'var(--ink-2)' }}>{c.eval.note}</div>
            </div>
          </Panel>
        ))}
      </div>

      <div className="grid" style={{ gap: 12 }}>
        <Panel title="Sifat Pengujian (¶A20)">
          <p className="tiny muted" style={{ margin: '0 0 9px', lineHeight: 1.5 }}>Efektivitas operasi diuji melalui kombinasi prosedur sepanjang periode:</p>
          <div style={{ display: 'grid', gap: 6 }}>
            {[['Inquiry', 'amber'], ['Observasi', 'teal'], ['Inspeksi', 'blue'], ['Reperformance', 'purple']].map(([n, col]) => (
              <div key={n} className="row ac gap8" style={{ fontSize: 11.5, padding: '6px 9px', borderRadius: 6, background: 'var(--surface-2)' }}>
                <span style={{ width: 9, height: 9, borderRadius: 2, background: `var(--${col})` }} />{n}
              </div>
            ))}
          </div>
        </Panel>
        <Panel noBody>
          <div className="panel-h"><h3>CUEC</h3><div style={{ flex: 1 }} /><Badge kind="blue">{E.cuec.length}</Badge></div>
          <div style={{ padding: 12 }}>
            <p className="tiny muted" style={{ margin: '0 0 9px', lineHeight: 1.5 }}>Complementary User Entity Controls — diasumsikan beroperasi di entitas pengguna agar tujuan pengendalian tercapai. Satu sumber yang juga dirujuk modul SA 402.</p>
            <div style={{ display: 'grid', gap: 6 }}>
              {E.cuec.map((c, i) => (
                <div key={i} className="row gap8" style={{ fontSize: 11.5, alignItems: 'flex-start' }}>
                  <span className="mono tiny" style={{ flex: '0 0 22px', fontWeight: 700, color: 'var(--blue)' }}>{String(i + 1).padStart(2, '0')}</span>
                  <span style={{ lineHeight: 1.4 }}>{c}</span>
                </div>
              ))}
            </div>
          </div>
        </Panel>
        <div className="panel" style={{ padding: '11px 14px', background: E.canIssue ? 'var(--green-bg)' : 'var(--amber-bg)', borderColor: 'transparent' }}>
          <div className="row ac gap8" style={{ alignItems: 'flex-start' }}><span style={{ color: E.canIssue ? 'var(--green)' : 'var(--amber)', flex: '0 0 auto' }}>{E.canIssue ? <I.checkCircle size={16} /> : <I.clock size={16} />}</span>
            <span className="tiny" style={{ fontWeight: 600, lineHeight: 1.5 }}>{E.canIssue
              ? 'Seluruh kontrol diuji & tujuan tercapai — opini ' + E.opinion.label + ' dapat diterbitkan. Perubahan status mengalir konsisten ke Asurans Lain, Portofolio Jasa, & Organisasi Jasa SA 402.'
              : 'Lengkapi pengujian (' + E.counts.controlsTested + '/' + E.counts.controls + ' kontrol) sebelum menyimpulkan efektivitas operasi sepanjang periode.'}</span></div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Tab: Opini & Laporan ---------------- */
function SocReport({ E, A }) {
  const O = E.opinion;
  const today = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
  return (
    <div className="grid" style={{ gridTemplateColumns: '320px 1fr', gap: 12, alignItems: 'start' }}>
      <div className="grid" style={{ gap: 12 }}>
        <Panel title="Opini Tiga-Bagian (¶52)">
          <div style={{ display: 'grid', gap: 8 }}>
            {[
              ['Deskripsi disajikan wajar', E.descriptionFair],
              ['Pengendalian dirancang sesuai', E.designSuitable],
              ['Beroperasi efektif sepanjang periode', E.operatingEffective],
              ['Bebas pengecualian material', E.counts.exceptionsReported === 0],
            ].map((r, i) => (
              <div key={i} className="row jb ac" style={{ fontSize: 11.5, padding: '7px 9px', borderRadius: 6, background: 'var(--surface-2)' }}>
                <span>{r[0]}</span>
                <Badge kind={r[1] ? 'green' : 'amber'}>{r[1] ? 'Terpenuhi' : 'Tertunda'}</Badge>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Karakter Perikatan">
          <div style={{ display: 'grid', gap: 8 }}>
            <RowKv label="Tipe Laporan" v={A.reportType} />
            <RowKv label="Bentuk Opini" v="Positif (langsung)" />
            <RowKv label="Deviasi Tercatat" v={E.counts.deviationsNoted} />
            <RowKv label="Pengecualian" v={E.counts.exceptionsReported} />
            <RowKv label="Standar" v={A.std} />
          </div>
        </Panel>
      </div>

      <Panel noBody>
        <div className="panel-h"><h3>Pratinjau Laporan Asurans Auditor Jasa</h3><div style={{ flex: 1 }} /><Badge kind={E.canIssue ? 'green' : 'amber'}>{E.canIssue ? 'Siap terbit' : 'Draf'}</Badge></div>
        <div style={{ padding: 18 }}>
          <div className="doc-paper" style={{ background: '#fff', padding: '34px 40px', boxShadow: 'var(--shadow)', fontSize: 11.5, lineHeight: 1.7, color: '#283b46' }}>
            <div style={{ fontWeight: 800, fontSize: 13, color: '#0c2430', textAlign: 'center', marginBottom: 4 }}>LAPORAN ASURANS AUDITOR JASA INDEPENDEN</div>
            <div className="tiny" style={{ textAlign: 'center', color: '#7a8893', marginBottom: 16 }}>{A.std} · {A.reportType} · Keyakinan {A.level}</div>
            <p style={{ margin: '0 0 10px' }}>Kepada Manajemen {A.client}, entitas pengguna, dan auditor entitas pengguna</p>

            <div style={{ fontWeight: 700, color: '#0c2430', margin: '0 0 4px' }}>Lingkup</div>
            <p style={{ margin: '0 0 10px' }}>Kami melaksanakan perikatan untuk melaporkan deskripsi sistem <b>{A.system}</b>, kesesuaian desain, dan efektivitas operasi pengendalian sepanjang periode <b>{A.period}</b>, sesuai {A.std} dengan kriteria {A.criteria}.</p>

            <div style={{ fontWeight: 700, color: '#0c2430', margin: '12px 0 4px' }}>Opini (a) — Kewajaran Deskripsi</div>
            <p style={{ margin: '0 0 8px' }}>{O.description}</p>
            <div style={{ fontWeight: 700, color: '#0c2430', margin: '8px 0 4px' }}>Opini (b) — Kesesuaian Desain</div>
            <p style={{ margin: '0 0 8px' }}>{O.design}</p>
            <div style={{ fontWeight: 700, color: '#0c2430', margin: '8px 0 4px' }}>Opini (c) — Efektivitas Operasi</div>
            <p style={{ margin: '0 0 8px' }}>{O.operating}</p>

            <div style={{ fontWeight: 700, color: O.type === 'unqualified' ? '#1f7a4d' : '#b3261e', margin: '12px 0 4px' }}>Dasar Opini ({O.label})</div>
            <p style={{ margin: '0 0 10px', color: O.type === 'unqualified' ? '#2f5d47' : '#7a3030' }}>{O.basis}</p>

            <div style={{ fontWeight: 700, color: '#0c2430', margin: '8px 0 4px' }}>Pembatasan Penggunaan</div>
            <p style={{ margin: 0 }}>Laporan ini ditujukan semata-mata untuk entitas pengguna {A.client} dan auditor laporan keuangan mereka, serta tidak ditujukan untuk pihak lain.</p>

            <div style={{ marginTop: 24, paddingTop: 10, borderTop: '1px solid #e0e5ea', fontSize: 11 }}><b>{A.partner}</b> · Akuntan Publik<br /><span className="tiny" style={{ color: '#7a8893' }}>Jakarta, {today}</span></div>
          </div>
        </div>
      </Panel>
    </div>
  );
}

Object.assign(window, { SJAH3402View });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { SJAH3402View };
