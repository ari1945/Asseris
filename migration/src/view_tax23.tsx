/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { useAmsPersist, useNav } from './contexts.jsx';
import { I } from './icons.jsx';
import { SubBar } from './shell.jsx';
import { Badge, Btn, Donut, Panel, Stat, Tabs } from './ui.jsx';
import { RowKv } from './view_calc.jsx';

/* ============================================================
   NeoSuite AMS — Modul Pajak PPh Pasal 23 (Firm Backoffice)
   Register pemotongan, Bukti Potong Unifikasi (Coretax DJP), SPT
   Masa, kepatuhan NPWP/NIK & rekonsiliasi ke GL — semuanya
   DITURUNKAN dari lapisan kanonik window.TAX23 (SSOT). Tidak ada angka ganda.
   ============================================================ */
const { useState: useStateT23 } = React;

const T23_STAT = { 'Lapor': 'green', 'Disetor': 'blue', 'Terutang': 'amber', 'Draft': 'gray' };
const T23_KIND_COLOR = { jasa: '#005085', modal: '#5b3fa6', sewa: '#0a6b73' };
const T23_KIND_LABEL = { jasa: 'Jasa (2%)', modal: 'Penghasilan modal (15%)', sewa: 'Sewa harta (2%)' };
const t23Date = (s) => { if (!s) return '—'; const [y, m, d] = s.split('-'); return d + '/' + m + '/' + y.slice(2); };

function TaxPPh23() {
  const { fmt } = AMS;
  const T = window.TAX23;
  const nav = useNav();
  const [tab, setTab] = useStateT23('ikhtisar');
  const [extra, setExtra] = useAmsPersist('tax23.extra', []);
  const [ov, setOv] = useAmsPersist('tax23.ov', {});
  const [form, setForm] = useStateT23(false);
  const [sel, setSel] = useStateT23(null);
  const [fMasa, setFMasa] = useStateT23('Semua');
  const [fStat, setFStat] = useStateT23('Semua');
  const [q, setQ] = useStateT23('');

  const opts = { extra, ov };
  const s = T.summary(opts);
  const masas = T.byMasa(opts);
  const tie = T.glTieOut(opts);
  const rows = s.rows;

  const toggleStatus = (id) => setOv(o => {
    const cur = (rows.find(r => r.id === id) || {}).status;
    const next = cur === 'Disetor' || cur === 'Lapor' ? 'Terutang' : 'Disetor';
    return { ...o, [id]: next };
  });

  /* objek mix per sifat penghasilan */
  const kindMix = ['jasa', 'sewa', 'modal'].map(k => ({
    k, label: T23_KIND_LABEL[k], color: T23_KIND_COLOR[k],
    value: rows.filter(r => r.kind === k).reduce((a, r) => a + r.pph, 0),
    dpp: rows.filter(r => r.kind === k).reduce((a, r) => a + r.dpp, 0),
    n: rows.filter(r => r.kind === k).length,
  })).filter(x => x.value > 0);

  const nextMasa = masas.find(m => m.status !== 'Lapor') || masas[masas.length - 1];

  const tabs = [
    { id: 'ikhtisar', label: 'Ikhtisar' },
    { id: 'register', label: 'Register Bukti Potong', count: s.count },
    { id: 'spt', label: 'SPT Masa Unifikasi', count: masas.length },
    { id: 'lawan', label: 'Lawan Transaksi' },
    { id: 'rekon', label: 'Rekonsiliasi & Lineage' },
  ];

  const fRows = rows.filter(r =>
    (fMasa === 'Semua' || r.masa === fMasa) &&
    (fStat === 'Semua' || r.status === fStat) &&
    (q === '' || (r.name + ' ' + r.obj + ' ' + r.id).toLowerCase().includes(q.toLowerCase())));

  return (
    <>
      <SubBar moduleId="tax" right={<div className="row gap8 ac">
        <span className="chip tiny"><I.link2 size={11} /> DJP Coretax · Bukti Potong Unifikasi</span>
        <Btn sm><I.download size={13} /> SPT Masa</Btn>
        <Btn sm variant="primary" onClick={() => setForm(true)}><I.plus size={14} /> Bukti Potong</Btn>
      </div>} />
      <div className="view-scroll"><div className="view-pad">

        {/* KPI ringkas — selalu tampak */}
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={'Rp ' + fmt(s.totalPph / 1e6, 1) + ' jt'} label={'PPh 23 Dipotong · YTD (' + s.count + ' bupot)'} /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={'Rp ' + fmt(s.disetor / 1e6, 1) + ' jt'} label="Telah Disetor / Dilaporkan" accent="var(--green)" /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={'Rp ' + fmt(s.terutang / 1e6, 1) + ' jt'} label="Masih Terutang" accent="var(--amber)" /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={s.noNpwpCount} label={'Tanpa NPWP/NIK · tarif ganda (+Rp ' + fmt(s.extraCost / 1e6, 1) + ' jt)'} accent={s.noNpwpCount ? 'var(--red)' : 'var(--green)'} /></div></Panel>
        </div>

        <Panel noBody>
          <div className="panel-h" style={{ padding: 0, background: 'var(--surface-2)' }}><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>

          {tab === 'ikhtisar' && (
            <div style={{ padding: 14 }}>
              <div className="grid" style={{ gridTemplateColumns: '1.45fr 1fr', gap: 14, alignItems: 'start' }}>
                <div style={{ display: 'grid', gap: 14 }}>
                  {/* tren PPh per masa */}
                  <div className="panel" style={{ padding: 14 }}>
                    <div className="row jb ac" style={{ marginBottom: 14 }}>
                      <div className="tiny upper" style={{ fontWeight: 700, color: 'var(--blue)' }}>PPh 23 per Masa Pajak</div>
                      <div className="row gap14 tiny muted">
                        <span className="row ac gap6"><span style={{ width: 14, height: 8, borderRadius: 2, background: '#1f9d63', display: 'inline-block' }} /> Disetor</span>
                        <span className="row ac gap6"><span style={{ width: 14, height: 8, borderRadius: 2, background: '#cf9412', display: 'inline-block' }} /> Terutang</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 26, height: 150, padding: '0 6px 6px', borderBottom: '1px solid var(--line)' }}>
                      {masas.map(m => {
                        const mx = Math.max(...masas.map(x => x.pph)) * 1.18 || 1;
                        const ter = m.pph - m.disetor;
                        return (
                          <div key={m.masa} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, height: '100%', justifyContent: 'flex-end' }}>
                            <span className="tiny mono" style={{ fontWeight: 700, color: 'var(--ink-2)' }}>{fmt(m.pph / 1e6, 1)}</span>
                            <div style={{ width: 46, height: (m.pph / mx * 100) + '%', minHeight: 4, borderRadius: '4px 4px 0 0', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#cf9412' }} title={m.label}>
                              <div style={{ height: (m.pph ? m.disetor / m.pph * 100 : 0) + '%', background: 'linear-gradient(180deg,#27b277,#1f9d63)' }} />
                            </div>
                            <span className="tiny" style={{ fontWeight: 600 }}>{m.label.split(' ')[0]}</span>
                            <Badge kind={T23_STAT[m.status] || 'gray'}>{m.status}</Badge>
                          </div>
                        );
                      })}
                    </div>
                    <div className="tiny muted" style={{ marginTop: 10, lineHeight: 1.5 }}>PPh 23 dipotong per Masa Pajak · Rp jt. Setor maks. tgl 10 & lapor SPT Masa Unifikasi maks. tgl 20 bulan berikutnya.</div>
                  </div>

                  {/* komposisi objek */}
                  <div className="panel" style={{ padding: 14 }}>
                    <div className="tiny upper" style={{ fontWeight: 700, color: 'var(--blue)', marginBottom: 12 }}>Komposisi Objek Pemotongan</div>
                    <div className="row gap16 ac">
                      <Donut size={104} thickness={15} segments={kindMix.map(k => ({ value: k.value, color: k.color }))}
                        center={<div style={{ textAlign: 'center' }}><div className="mono" style={{ fontSize: 15, fontWeight: 800 }}>{fmt(s.totalPph / 1e6, 0)}</div><div className="tiny muted">jt PPh</div></div>} />
                      <div style={{ flex: 1, display: 'grid', gap: 8 }}>
                        {kindMix.map(k => (
                          <div key={k.k} className="row jb ac">
                            <span className="row ac gap8"><span style={{ width: 10, height: 10, borderRadius: 3, background: k.color }} /><span style={{ fontSize: 12.5, fontWeight: 600 }}>{k.label}</span></span>
                            <span className="row ac gap10"><span className="tiny muted">{k.n} bupot · DPP {fmt(k.dpp / 1e6, 0)} jt</span><span className="mono" style={{ fontWeight: 700, fontSize: 12.5 }}>{fmt(k.value / 1e6, 1)} jt</span></span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* rail kanan */}
                <div style={{ display: 'grid', gap: 12 }}>
                  {nextMasa && (
                    <div className="panel" style={{ padding: 14, background: 'var(--amber-bg)', borderColor: 'transparent' }}>
                      <div className="row jb ac" style={{ marginBottom: 6 }}><span className="tiny upper" style={{ fontWeight: 700, color: 'var(--amber)' }}>Tenggat Terdekat</span><Badge kind={T23_STAT[nextMasa.status]}>{nextMasa.status}</Badge></div>
                      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>SPT Masa {nextMasa.label}</div>
                      <div style={{ display: 'grid', gap: 6 }}>
                        <RowKv label="Setor (tgl 10)" v={t23Date(nextMasa.setorDue) + (nextMasa.setorDays >= 0 ? ' · ' + nextMasa.setorDays + 'h' : ' · lewat')} strong />
                        <RowKv label="Lapor (tgl 20)" v={t23Date(nextMasa.laporDue) + (nextMasa.laporDays >= 0 ? ' · ' + nextMasa.laporDays + 'h' : ' · lewat')} />
                        <RowKv label="PPh masa ini" v={'Rp ' + fmt(nextMasa.pph / 1e6, 1) + ' jt'} />
                      </div>
                      <Btn sm variant="primary" style={{ width: '100%', marginTop: 10 }} onClick={() => setTab('spt')}><I.upload size={13} /> Susun SPT Masa</Btn>
                    </div>
                  )}

                  {/* tie-out GL */}
                  <div className="panel" style={{ padding: 14 }}>
                    <div className="row jb ac" style={{ marginBottom: 10 }}><span className="tiny upper" style={{ fontWeight: 700, color: 'var(--blue)' }}>Tie-out ke General Ledger</span><span className="chip tiny" style={{ cursor: 'pointer' }} onClick={() => nav('firmgl', { from: 'tax' })}>{tie.glCode}</span></div>
                    <div style={{ display: 'grid', gap: 7 }}>
                      <RowKv label={'Kontrol ' + tie.glName} v={'Rp ' + fmt(tie.control / 1e6, 0) + ' jt'} strong />
                      <RowKv label="PPh 23 terutang (modul ini)" v={'Rp ' + fmt(tie.pph23Terutang / 1e6, 1) + ' jt'} />
                      <RowKv label="PPh 21 / 4(2) / PPN — lainnya" v={'Rp ' + fmt(tie.lainnya / 1e6, 0) + ' jt'} />
                    </div>
                    <div style={{ height: 8, borderRadius: 4, background: 'var(--surface-3)', overflow: 'hidden', marginTop: 10, display: 'flex' }}>
                      <div style={{ width: (tie.pct * 100) + '%', background: 'var(--amber)' }} title="PPh 23 terutang" />
                      <div style={{ flex: 1, background: '#9fb2c0' }} title="Pajak lainnya" />
                    </div>
                    <div className="tiny muted" style={{ marginTop: 8, lineHeight: 1.5 }}>PPh 23 terutang menutup ke pos kontrol <b>Utang Pajak (2-200)</b> bersama PPh 21, PPh 4(2) & PPN.</div>
                  </div>

                  {s.noNpwpCount > 0 && (
                    <div className="panel" style={{ padding: '11px 13px', background: 'var(--red-bg)', borderColor: 'transparent' }}>
                      <div className="row ac gap8" style={{ marginBottom: 6 }}><span style={{ color: 'var(--red)' }}><I.alert size={15} /></span><span style={{ fontSize: 12.5, fontWeight: 700 }}>{s.noNpwpCount} lawan transaksi tanpa NPWP</span></div>
                      <div className="tiny" style={{ lineHeight: 1.55 }}>Dikenakan tarif <b>100% lebih tinggi</b> (UU PPh Ps. 23(1a)). Beban tambahan firma <b>Rp {fmt(s.extraCost / 1e6, 1)} jt</b> — mintakan NPWP untuk menghindari pungutan ekstra.</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {tab === 'register' && (
            <>
              <div className="row jb ac wrap gap8" style={{ padding: '12px 14px', borderBottom: '1px solid var(--line-soft)' }}>
                <div className="row gap6 wrap ac">
                  {['Semua', '2026-01', '2026-02', '2026-03'].map(m => (
                    <button key={m} className="chip x" style={{ cursor: 'pointer', background: fMasa === m ? 'var(--blue)' : 'var(--surface-3)', color: fMasa === m ? '#fff' : 'var(--ink-2)' }} onClick={() => setFMasa(m)}>{m === 'Semua' ? 'Semua Masa' : (T.MASA_LABEL[m] || m)}</button>
                  ))}
                  <span style={{ width: 1, height: 18, background: 'var(--line)', margin: '0 2px' }} />
                  {['Semua', 'Draft', 'Terutang', 'Disetor', 'Lapor'].map(st => (
                    <button key={st} className="chip x" style={{ cursor: 'pointer', background: fStat === st ? 'var(--navy)' : 'var(--surface-3)', color: fStat === st ? '#fff' : 'var(--ink-2)' }} onClick={() => setFStat(st)}>{st}</button>
                  ))}
                </div>
                <div className="global-search" style={{ background: 'var(--surface)', border: '1px solid var(--line)', height: 30, maxWidth: 230 }}>
                  <I.search2 size={14} style={{ color: 'var(--ink-4)' }} /><input style={{ color: 'var(--ink)' }} placeholder="Cari lawan / objek / no…" value={q} onChange={e => setQ(e.target.value)} />
                </div>
              </div>
              <table className="dtbl">
                <thead><tr><th>No. Bukti / Coretax</th><th>Lawan Transaksi</th><th>Objek Pajak</th><th>Masa</th><th className="num">DPP</th><th className="num" style={{ width: 56 }}>Tarif</th><th className="num">PPh 23</th><th>Bukti Potong</th><th>Status</th></tr></thead>
                <tbody>
                  {fRows.map(r => (
                    <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => setSel(r)}>
                      <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{r.id}</td>
                      <td style={{ maxWidth: 200 }}>
                        <div className="row ac gap6"><span className="truncate" style={{ fontWeight: 600 }}>{r.name.replace('PT ', '')}</span>{r.master && <span className="chip tiny" style={{ height: 16, background: 'var(--navy-050,var(--surface-3))', color: 'var(--navy)', borderColor: 'transparent' }} title="Tertaut master vendor">{r.vendorId}</span>}</div>
                        <div className="tiny" style={{ color: r.hasNpwp ? 'var(--ink-4)' : 'var(--red)', fontWeight: r.hasNpwp ? 400 : 700 }}>{r.hasNpwp ? (r.isOP ? r.npwp + ' · NIK' : r.npwp) : 'TANPA NPWP'}</div>
                      </td>
                      <td className="tiny"><span style={{ fontWeight: 600 }}>{r.obj}</span></td>
                      <td className="tiny muted mono">{r.masa.split('-')[1]}/{r.masa.slice(2, 4)}</td>
                      <td className="num">{fmt(r.dpp / 1e6, 0)}</td>
                      <td className="num"><span className="chip tiny" style={{ height: 18, color: r.surcharge ? 'var(--red)' : 'inherit', borderColor: r.surcharge ? 'var(--red)' : undefined }}>{r.effRate}%</span></td>
                      <td className="num" style={{ fontWeight: 700 }}>{fmt(r.pph / 1e6, 2)}</td>
                      <td>{r.bupotIssued ? <span className="row ac gap4" style={{ color: 'var(--green)', fontSize: 11 }}><I.checkCircle size={14} /> Terbit</span> : <Badge kind="gray">Draft</Badge>}</td>
                      <td onClick={e => { e.stopPropagation(); toggleStatus(r.id); }}><span style={{ cursor: 'pointer' }} title="Klik untuk setor / batal setor"><Badge kind={T23_STAT[r.status]}>{r.status}</Badge></span></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr><td colSpan={4}>TOTAL · {fRows.length} bukti potong</td><td className="num">{fmt(fRows.reduce((a, r) => a + r.dpp, 0) / 1e6, 0)}</td><td></td><td className="num">{fmt(fRows.reduce((a, r) => a + r.pph, 0) / 1e6, 2)}</td><td colSpan={2}></td></tr></tfoot>
              </table>
            </>
          )}

          {tab === 'spt' && (
            <div style={{ padding: 14 }}>
              <div className="tiny muted" style={{ marginBottom: 12, lineHeight: 1.5 }}>Tiap Masa Pajak diringkas dari register kanonik menjadi satu <b>SPT Masa PPh Unifikasi</b>. Setor maks. tgl 10, lapor maks. tgl 20 bulan berikutnya.</div>
              <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 12 }}>
                {masas.map(m => {
                  const pctDep = m.pph ? m.disetor / m.pph : 0;
                  const urgent = m.status !== 'Lapor' && m.laporDays <= 12;
                  return (
                    <div key={m.masa} className="panel" style={{ padding: 0, overflow: 'hidden' }}>
                      <div className="row jb ac" style={{ padding: '11px 13px', background: 'var(--surface-2)', borderBottom: '1px solid var(--line-soft)' }}>
                        <div><div style={{ fontWeight: 700, fontSize: 13.5 }}>{m.label}</div><div className="tiny muted">{m.count} bukti potong · Unifikasi</div></div>
                        <Badge kind={T23_STAT[m.status] || 'amber'}>{m.status}</Badge>
                      </div>
                      <div style={{ padding: 13, display: 'grid', gap: 7 }}>
                        <RowKv label="Total DPP" v={'Rp ' + fmt(m.dpp / 1e6, 0) + ' jt'} />
                        <RowKv label="PPh 23 dipotong" v={'Rp ' + fmt(m.pph / 1e6, 2) + ' jt'} strong />
                        <div style={{ height: 7, borderRadius: 4, background: 'var(--surface-3)', overflow: 'hidden' }}><div style={{ width: (pctDep * 100) + '%', height: '100%', background: 'var(--green)' }} /></div>
                        <div className="tiny muted">{fmt(pctDep * 100, 0)}% telah disetor (Rp {fmt(m.disetor / 1e6, 1)} jt)</div>
                        <div className="divider" style={{ margin: '4px 0' }} />
                        <div className="row jb tiny"><span className="muted">Setor (tgl 10)</span><span className="mono" style={{ fontWeight: 600, color: m.setorDays < 0 && m.status !== 'Lapor' ? 'var(--red)' : 'var(--ink-2)' }}>{t23Date(m.setorDue)}</span></div>
                        <div className="row jb tiny"><span className="muted">Lapor (tgl 20)</span><span className="mono" style={{ fontWeight: 600, color: urgent ? 'var(--amber)' : 'var(--ink-2)' }}>{t23Date(m.laporDue)}{m.status !== 'Lapor' && m.laporDays >= 0 ? ' · ' + m.laporDays + 'h' : ''}</span></div>
                      </div>
                      <div style={{ padding: '0 13px 13px' }}>
                        {m.status === 'Lapor'
                          ? <div className="row ac gap6 tiny" style={{ color: 'var(--green)', fontWeight: 600, justifyContent: 'center', padding: '7px 0', background: 'var(--green-bg)', borderRadius: 6 }}><I.checkCircle size={13} /> SPT Masa telah dilaporkan</div>
                          : <Btn sm variant={m.status === 'Siap Lapor' ? 'primary' : ''} style={{ width: '100%' }}><I.upload size={13} /> {m.status === 'Siap Lapor' ? 'Lapor SPT Masa' : 'Setor & Susun SPT'}</Btn>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'lawan' && <T23Counterparty opts={opts} nav={nav} />}

          {tab === 'rekon' && <T23Reconcile opts={opts} nav={nav} />}
        </Panel>
      </div></div>

      {sel && <T23Detail r={sel} onClose={() => setSel(null)} nav={nav} toggle={toggleStatus} />}
      {form && <BuktiPotongForm onClose={() => setForm(false)} nextId={'1.2-03.26-' + String(4615 + extra.length).padStart(7, '0')} onAdd={(r) => { setExtra(e => [...e, r]); setForm(false); }} />}
    </>
  );
}

/* ---------------- Tab: Lawan Transaksi ---------------- */
function T23Counterparty({ opts, nav }) {
  const { fmt } = AMS;
  const groups = window.TAX23.byCounterparty(opts);
  const withNpwp = groups.filter(g => g.hasNpwp).length;
  const masterN = groups.filter(g => g.master).length;
  return (
    <div style={{ padding: 14 }}>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 14 }}>
        <div className="panel" style={{ padding: 12 }}><div className="tiny muted upper">Lawan Transaksi</div><div className="mono" style={{ fontSize: 18, fontWeight: 700 }}>{groups.length}</div><div className="tiny muted">{masterN} tertaut master vendor</div></div>
        <div className="panel" style={{ padding: 12, background: 'var(--green-bg)', borderColor: 'transparent' }}><div className="tiny muted upper">Ber-NPWP</div><div className="mono" style={{ fontSize: 18, fontWeight: 700, color: 'var(--green)' }}>{withNpwp}/{groups.length}</div><div className="tiny muted">tarif normal</div></div>
        <div className="panel" style={{ padding: 12, background: groups.length - withNpwp ? 'var(--red-bg)' : 'var(--surface)', borderColor: 'transparent' }}><div className="tiny muted upper">Tanpa NPWP</div><div className="mono" style={{ fontSize: 18, fontWeight: 700, color: 'var(--red)' }}>{groups.length - withNpwp}</div><div className="tiny muted">tarif 100% lebih tinggi</div></div>
      </div>
      <table className="dtbl">
        <thead><tr><th>Lawan Transaksi</th><th>NPWP</th><th>Kategori</th><th>Objek</th><th className="num">Bupot</th><th className="num">DPP</th><th className="num">PPh 23</th><th></th></tr></thead>
        <tbody>
          {groups.map(g => (
            <tr key={g.key}>
              <td style={{ fontWeight: 600, maxWidth: 200 }} className="truncate">{g.name}{g.master && <span className="chip tiny" style={{ height: 16, marginLeft: 6, background: 'var(--navy-050,var(--surface-3))', color: 'var(--navy)', borderColor: 'transparent' }}>{g.vendorId}</span>}</td>
              <td className="mono tiny" style={{ color: g.hasNpwp ? 'var(--ink-3)' : 'var(--red)', fontWeight: g.hasNpwp ? 400 : 700 }}>{g.hasNpwp ? (g.isOP ? g.npwp + ' · NIK' : g.npwp) : 'TANPA NPWP'}</td>
              <td className="tiny muted">{g.cat}</td>
              <td className="tiny"><div className="row gap4 wrap">{g.objs.slice(0, 2).map(o => <span key={o} className="chip tiny" style={{ height: 17 }}>{o.replace('Jasa ', '')}</span>)}{g.objs.length > 2 && <span className="tiny muted">+{g.objs.length - 2}</span>}</div></td>
              <td className="num">{g.n}</td>
              <td className="num">{fmt(g.dpp / 1e6, 0)}</td>
              <td className="num" style={{ fontWeight: 700 }}>{fmt(g.pph / 1e6, 2)}</td>
              <td>{g.master ? <button className="chip tiny" style={{ cursor: 'pointer', height: 20 }} onClick={() => nav('procurement', { from: 'tax' })}><I.cart size={11} /> Vendor 360</button> : <span className="tiny muted">non-master</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="panel" style={{ marginTop: 12, padding: '10px 13px', background: 'var(--blue-050)', borderColor: 'var(--blue-100)' }}>
        <div className="tiny" style={{ lineHeight: 1.55 }}>Identitas & NPWP lawan transaksi yang berstatus <b>vendor master</b> ditarik langsung dari registri <span className="mono">BO.VENDORS</span> di modul Pengadaan — satu sumber kebenaran. Perbaikan NPWP di master otomatis menyetel ulang tarif pemotongan di sini.</div>
      </div>
    </div>
  );
}

/* ---------------- Tab: Rekonsiliasi & Lineage ---------------- */
function T23Reconcile({ opts, nav }) {
  const { fmt } = AMS;
  const T = window.TAX23;
  const s = T.summary(opts);
  const tie = T.glTieOut(opts);
  const prov = T.provenance(opts);
  const firmtaxAgg = ((AMS.PPH_WITHHELD as any[]) || []).find(p => p.jenis === 'PPh 23');

  const flow = [
    { ic: 'cart', lbl: 'Master Vendor & AP', sub: 'BO.VENDORS · FIRM_AP', mod: 'procurement', color: 'var(--blue)' },
    { ic: 'receipt', lbl: 'Register PPh 23', sub: s.count + ' bukti potong (SSOT)', mod: 'tax', color: 'var(--navy)' },
    { ic: 'ledger', lbl: 'General Ledger', sub: 'Kontrol Utang Pajak 2-200', mod: 'firmgl', color: 'var(--amber)' },
    { ic: 'report', lbl: 'Pajak Firma', sub: 'PPh Pot/Put · SPT Masa', mod: 'firmtax', color: 'var(--green)' },
  ];

  return (
    <div style={{ padding: 14 }}>
      {/* alur SSOT */}
      <div className="panel" style={{ padding: 14, marginBottom: 14 }}>
        <div className="tiny upper" style={{ fontWeight: 700, color: 'var(--blue)', marginBottom: 12 }}>Aliran Satu Sumber Kebenaran</div>
        <div className="row ac" style={{ gap: 0, flexWrap: 'wrap' }}>
          {flow.map((f, i) => (
            <React.Fragment key={f.lbl}>
              <button className="panel" style={{ flex: 1, minWidth: 150, padding: '11px 12px', textAlign: 'left', cursor: 'pointer', borderLeft: '3px solid ' + f.color, boxShadow: 'none' }} onClick={() => nav(f.mod, { from: 'tax' })}>
                <div className="row ac gap8" style={{ marginBottom: 3 }}><span style={{ color: f.color }}>{React.createElement(I[f.ic], { size: 15 })}</span><span style={{ fontSize: 12.5, fontWeight: 700 }}>{f.lbl}</span></div>
                <div className="tiny muted">{f.sub}</div>
              </button>
              {i < flow.length - 1 && <span style={{ color: 'var(--ink-4)', padding: '0 6px' }}><I.arrowRight size={16} /></span>}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 14, alignItems: 'start' }}>
        {/* tie-out GL */}
        <Panel title="Rekonsiliasi ke Pos Kontrol GL" sub={tie.glCode + ' · ' + tie.glName}>
          <table className="dtbl">
            <tbody>
              <tr><td style={{ padding: '7px 9px' }}>PPh 23 terutang (Terutang + Draft)</td><td className="num" style={{ padding: '7px 9px', fontWeight: 700 }}>{fmt(tie.pph23Terutang / 1e6, 1)}</td></tr>
              <tr><td style={{ padding: '7px 9px' }}>PPh 21 / PPh 4(2) / PPN — modul terkait</td><td className="num muted" style={{ padding: '7px 9px' }}>{fmt(tie.lainnya / 1e6, 0)}</td></tr>
              <tr style={{ background: 'var(--surface-2)', fontWeight: 700 }}><td style={{ padding: '8px 9px' }}>Kontrol Utang Pajak (2-200)</td><td className="num" style={{ padding: '8px 9px' }}>{fmt(tie.control / 1e6, 0)}</td></tr>
            </tbody>
          </table>
          <div className="row ac gap8" style={{ marginTop: 10, padding: '8px 11px', background: 'var(--green-bg)', borderRadius: 6 }}>
            <span style={{ color: 'var(--green)' }}><I.checkCircle size={15} /></span>
            <span className="tiny" style={{ fontWeight: 600 }}>Tertutup — PPh 23 terutang ≤ saldo kontrol; sisanya pajak lain.</span>
          </div>
          <div className="tiny muted" style={{ marginTop: 8 }}>dalam jutaan Rupiah</div>
        </Panel>

        {/* konsistensi lintas modul */}
        <Panel title="Konsistensi Lintas Modul" sub="agregat dibaca balik oleh Pajak Firma">
          <div style={{ display: 'grid', gap: 7 }}>
            <RowKv label="PPh 23 dipotong — modul ini (SSOT)" v={'Rp ' + fmt(s.totalPph / 1e6, 2) + ' jt'} strong />
            <RowKv label="Baris PPh 23 — Pajak Firma (firmtax)" v={firmtaxAgg ? 'Rp ' + fmt((firmtaxAgg.tax || s.totalPph) / 1e6, 2) + ' jt' : '—'} />
            <div className="row ac gap8" style={{ marginTop: 4, padding: '8px 11px', background: 'var(--blue-050)', borderRadius: 6 }}>
              <span style={{ color: 'var(--blue)' }}><I.link2 size={15} /></span>
              <span className="tiny" style={{ lineHeight: 1.5 }}>Modul <b>Pajak Firma</b> tidak menyimpan angka PPh 23 sendiri — ia menarik agregat dari register ini. Satu perubahan di sini mengalir ke SPT Pot/Put.</span>
            </div>
            <button className="lin-cta" style={{ marginTop: 6 }} onClick={() => nav('firmtax', { from: 'tax' })}><I.report size={13} /> Buka di Pajak Firma</button>
          </div>
        </Panel>
      </div>

      {/* provenance */}
      <Panel title="Provenance Tiap Figur" className="" >
        <div style={{ display: 'grid', gap: 0 }}>
          {prov.map((p, i) => (
            <div key={p.label} className="row jb ac" style={{ padding: '9px 0', borderBottom: i < prov.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="row ac gap6"><span style={{ fontSize: 12.5, fontWeight: 600 }}>{p.label}</span>{p.tied && <span style={{ color: 'var(--green)' }} title="Tertaut & tertutup"><I.checkCircle size={12} /></span>}</div>
                <div className="tiny muted">{p.source}</div>
              </div>
              <div className="row ac gap10">
                <span className="mono tiny" style={{ fontWeight: 700 }}>{p.money ? 'Rp ' + fmt(p.value / 1e6, 1) + ' jt' : p.value}</span>
                <button className="chip tiny" style={{ cursor: 'pointer', height: 20 }} onClick={() => nav(p.owner, { from: 'tax' })}>{p.ownerLabel}</button>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* pengecualian */}
      <Panel title="Bukan Objek PPh 23 — Kontrol Pengecualian" className="" >
        <div className="tiny muted" style={{ marginBottom: 10, lineHeight: 1.5 }}>Pembayaran berikut sengaja tidak dipotong PPh 23 — diperlakukan di modul lain agar tidak terjadi pemotongan ganda atau salah objek.</div>
        <table className="dtbl">
          <thead><tr><th>Lawan Transaksi</th><th>Pembayaran</th><th>Alasan</th><th></th></tr></thead>
          <tbody>
            {T.EXCLUSIONS.map((e, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 600 }}>{e.party}{e.vendorId && <span className="chip tiny" style={{ height: 16, marginLeft: 6, background: 'var(--surface-3)', borderColor: 'transparent' }}>{e.vendorId}</span>}</td>
                <td className="tiny">{e.obj}</td>
                <td className="tiny muted">{e.why}</td>
                <td><button className="chip tiny" style={{ cursor: 'pointer', height: 20 }} onClick={() => nav(e.module, { from: 'tax' })}><I.arrowRight size={11} /> Modul</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}

/* ---------------- Detail drawer ---------------- */
function T23Detail({ r, onClose, nav, toggle }) {
  const { fmt } = AMS;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,20,30,.4)', zIndex: 90, display: 'flex', justifyContent: 'flex-end' }} onClick={onClose}>
      <div className="panel" style={{ width: 480, maxWidth: '94vw', height: '100%', borderRadius: 0, display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-lg)' }} onClick={e => e.stopPropagation()}>
        <div style={{ background: 'linear-gradient(125deg,#013a52,#005085)', color: '#fff', padding: '15px 18px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <I.receipt size={20} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="mono tiny" style={{ color: '#bcd6e4' }}>{r.id}</div>
            <div style={{ fontWeight: 700, fontSize: 15, marginTop: 2 }}>{r.name}</div>
            <div className="tiny" style={{ color: '#bcd6e4' }}>Bukti Potong Unifikasi · Coretax DJP · Masa {r.masaLabel}</div>
          </div>
          <button className="top-btn" onClick={onClose}><I.x size={18} /></button>
        </div>
        <div style={{ padding: 18, overflowY: 'auto', flex: 1, display: 'grid', gap: 14, alignContent: 'start' }}>
          <div className="panel" style={{ padding: 13, background: r.surcharge ? 'var(--red-bg)' : 'var(--surface-2)', borderColor: 'transparent' }}>
            <div className="row jb ac"><span className="tiny muted upper">PPh 23 Dipotong</span><Badge kind={T23_STAT[r.status]}>{r.status}</Badge></div>
            <div className="mono" style={{ fontSize: 26, fontWeight: 800, color: r.surcharge ? 'var(--red)' : 'var(--navy)' }}>Rp {fmt(r.pph)}</div>
            <div className="tiny muted">DPP Rp {fmt(r.dpp / 1e6, 0)} jt × {r.effRate}%{r.surcharge ? ' (tarif ganda — tanpa NPWP)' : ''}</div>
          </div>

          <div style={{ display: 'grid', gap: 7 }}>
            <RowKv label="Objek Pajak" v={r.obj} strong />
            <RowKv label="Dasar Hukum" v={r.art} />
            <RowKv label="Tarif Normal" v={r.rate + '%' + (r.surcharge ? ' → ' + r.effRate + '% (×2)' : '')} />
            <RowKv label={r.isOP ? 'NIK (NPWP OP)' : 'NPWP'} v={r.hasNpwp ? r.npwp : 'Tidak ber-NPWP'} />
            <RowKv label="Tanggal Potong" v={t23Date(r.tgl)} />
            {r.ntpn && <RowKv label="NTPN" v={r.ntpn} />}
          </div>

          {r.desc && <div className="tiny" style={{ lineHeight: 1.55, color: 'var(--ink-2)', padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 7 }}>{r.desc}</div>}

          <div>
            <div className="tiny muted upper" style={{ marginBottom: 7, letterSpacing: '.04em' }}>Tautan Sumber (lineage)</div>
            <div style={{ display: 'grid', gap: 7 }}>
              {r.master && (
                <button className="lin-chip" style={{ borderLeftColor: 'var(--blue)' }} onClick={() => nav('procurement', { from: 'tax' })}>
                  <span className="lin-ic" style={{ color: 'var(--blue)' }}><I.cart size={14} /></span>
                  <span className="lin-txt"><span className="lin-lbl">Master Vendor · {r.vendorId}</span><span className="lin-rel">Identitas & NPWP ditarik dari registri vendor</span></span>
                  <span className="lin-go"><I.arrowRight size={12} /></span>
                </button>
              )}
              {r.apId && (
                <div className="lin-chip" style={{ borderLeftColor: 'var(--teal,#0a6b73)', cursor: 'default' }}>
                  <span className="lin-ic" style={{ color: 'var(--teal,#0a6b73)' }}><I.coins size={14} /></span>
                  <span className="lin-txt"><span className="lin-lbl">Faktur AP · {r.apId}</span><span className="lin-rel">DPP berasal dari faktur vendor (AP/AR)</span></span>
                </div>
              )}
              {r.poId && (
                <div className="lin-chip" style={{ borderLeftColor: 'var(--teal,#0a6b73)', cursor: 'default' }}>
                  <span className="lin-ic" style={{ color: 'var(--teal,#0a6b73)' }}><I.cart size={14} /></span>
                  <span className="lin-txt"><span className="lin-lbl">Komitmen PO · {r.poId}</span><span className="lin-rel">Pengadaan jasa terkait pemotongan</span></span>
                </div>
              )}
              <button className="lin-chip" style={{ borderLeftColor: 'var(--amber)' }} onClick={() => nav('firmgl', { from: 'tax' })}>
                <span className="lin-ic" style={{ color: 'var(--amber)' }}><I.ledger size={14} /></span>
                <span className="lin-txt"><span className="lin-lbl">General Ledger · 2-200</span><span className="lin-rel">PPh terutang → pos kontrol Utang Pajak</span></span>
                <span className="lin-go"><I.arrowRight size={12} /></span>
              </button>
            </div>
          </div>
        </div>
        <div style={{ padding: '13px 18px', borderTop: '1px solid var(--line)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Btn onClick={onClose}>Tutup</Btn>
          <Btn><I.download size={13} /> Unduh Bukti Potong</Btn>
          {r.status !== 'Lapor' && <Btn variant="primary" onClick={() => { toggle(r.id); onClose(); }}><I.check size={13} /> {r.deposited ? 'Batalkan Setor' : 'Tandai Disetor'}</Btn>}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Form bukti potong baru ---------------- */
function BuktiPotongForm({ onClose, onAdd, nextId }) {
  const { fmt } = AMS;
  const OBJ = window.TAX23.OBJECTS;
  const [party, setParty] = useStateT23('');
  const [npwp, setNpwp] = useStateT23('');
  const [obj, setObj] = useStateT23('Jasa konsultan');
  const [dpp, setDpp] = useStateT23(0);
  const [masa, setMasa] = useStateT23('2026-03');
  const rate = (OBJ[obj] || { rate: 2 }).rate;
  const hasNpwp = npwp.trim().length > 0;
  const effRate = rate * (hasNpwp ? 1 : 2);
  const pph = Math.round(dpp * effRate / 100);
  const valid = party.trim() && dpp > 0;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,20,30,.4)', zIndex: 95, display: 'grid', placeItems: 'center' }} onClick={onClose}>
      <div className="panel" style={{ width: 540, maxWidth: '94vw', boxShadow: 'var(--shadow-lg)' }} onClick={e => e.stopPropagation()}>
        <div style={{ background: 'linear-gradient(125deg,#013a52,#005085)', color: '#fff', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 10, borderRadius: '4px 4px 0 0' }}>
          <I.receipt size={18} /><div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 14 }}>Bukti Potong PPh 23 Baru</div><div className="tiny" style={{ color: '#bcd6e4' }}>{nextId} · Bukti Potong Unifikasi (Coretax)</div></div>
          <button className="top-btn" onClick={onClose}><I.x size={18} /></button>
        </div>
        <div style={{ padding: 16, display: 'grid', gap: 12 }}>
          <div className="grid" style={{ gridTemplateColumns: '1.5fr 1fr', gap: 10 }}>
            <div className="field"><label>Lawan Transaksi</label><input className="input" value={party} onChange={e => setParty(e.target.value)} placeholder="PT / CV penerima penghasilan" /></div>
            <div className="field"><label>Masa Pajak</label><select className="select" value={masa} onChange={e => setMasa(e.target.value)}>{['2026-01', '2026-02', '2026-03'].map(m => <option key={m} value={m}>{window.TAX23.MASA_LABEL[m]}</option>)}</select></div>
          </div>
          <div className="field"><label>NPWP / NIK <span className="tiny muted">— NIK 16 digit = NPWP OP (Coretax); kosongkan bila tidak ber-NPWP (tarif ×2)</span></label><input className="input mono" value={npwp} onChange={e => setNpwp(e.target.value)} placeholder="00.000.000.0-000" /></div>
          <div className="grid" style={{ gridTemplateColumns: '1.5fr 1fr', gap: 10 }}>
            <div className="field"><label>Objek Pajak</label><select className="select" value={obj} onChange={e => setObj(e.target.value)}>{Object.keys(OBJ).map(o => <option key={o}>{o}</option>)}</select></div>
            <div className="field"><label>DPP (Rp)</label><input className="input mono" type="number" value={dpp} onChange={e => setDpp(+e.target.value)} style={{ textAlign: 'right' }} /></div>
          </div>
          <div className="panel" style={{ padding: '11px 13px', background: hasNpwp ? 'var(--surface-2)' : 'var(--red-bg)', borderColor: 'transparent' }}>
            <div className="row jb ac" style={{ marginBottom: 4 }}><span className="tiny muted">Tarif {rate}%{!hasNpwp ? ' × 2 (tanpa NPWP) = ' + effRate + '%' : ''} · {(OBJ[obj] || {}).art}</span><span className="mono tiny" style={{ fontWeight: 700, color: hasNpwp ? 'inherit' : 'var(--red)' }}>{effRate}%</span></div>
            <div className="row jb ac"><span style={{ fontSize: 12, fontWeight: 700 }}>PPh 23 Dipotong</span><span className="mono" style={{ fontSize: 16, fontWeight: 700, color: 'var(--navy)' }}>Rp {fmt(pph)}</span></div>
          </div>
        </div>
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Btn onClick={onClose}>Batal</Btn>
          <Btn variant="primary" disabled={!valid} style={{ opacity: valid ? 1 : .5 }} onClick={() => onAdd({ id: nextId, party, npwp: npwp.trim() || null, obj, dpp, masa, tgl: masa + '-09', status: 'Terutang', desc: 'Bukti potong manual' })}><I.check size={14} /> Terbitkan Bukti Potong</Btn>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { TaxPPh23 });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { TaxPPh23 };
