/* [codemod] ESM imports */
import React from 'react';
import { useAmsPersist, useNav } from './contexts.jsx';
import { I } from './icons.jsx';
import { SubBar } from './shell.jsx';
import { Badge, Btn, Panel, Stat, Tabs } from './ui.jsx';
import { RowKv } from './view_calc.jsx';

/* ============================================================
   NeoSuite AMS — Firm Finance (ERP): Pajak Firma
   PPN / e-Faktur · PPh 21/23/4(2) · SPT Tahunan Badan ·
   kalender kewajiban perpajakan KAP itu sendiri.
   ============================================================ */
const { useState: useStateTX } = React;

const TAX_STAT = { 'Lapor': 'green', 'Bayar': 'blue', 'Belum Lapor': 'amber', 'Draft': 'gray', 'Terlambat': 'red' };

function FirmTax() {
  const { fmt } = window.AMS;
  const navTX = (typeof useNav === 'function') ? useNav() : (() => {});
  const EF = window.AMS.EFAKTUR;
  const PPH = window.AMS.PPH_WITHHELD;
  const [tab, setTab] = useStateTX('kalender');
  const [obs, setObs] = useAmsPersist('firmtax', () => window.AMS.TAX_OBLIGATIONS);

  const ppnOut = EF.filter(e => e.kind === 'Keluaran').reduce((s, e) => s + e.ppn, 0);
  const ppnIn = EF.filter(e => e.kind === 'Masukan').reduce((s, e) => s + e.ppn, 0);
  const ppnPayable = ppnOut - ppnIn;
  const pphTotal = PPH.reduce((s, p) => s + p.tax, 0);
  const cit = obs.find(o => o.jenis.includes('Badan'));

  /* PPh 23 ditarik dari modul kanonik (SSOT) — bukan angka kedua */
  const T23 = window.TAX23 ? window.TAX23.summary() : null;
  const goTax = () => navTX('tax', { from: 'firmtax' });
  const PPHrows = PPH.map(p => (p.jenis === 'PPh 23' && T23)
    ? { ...p, basis: 'Jasa vendor — register PPh 23 (SSOT)', dpp: T23.totalDpp, tax: T23.totalPph, canon: true } : p);
  const ebupotFeb = [
    ...(T23 ? window.TAX23.register().filter(r => r.masa === '2026-02')
        .map(r => ({ no: r.id, jenis: 'PPh 23', pihak: r.name, dpp: r.dpp, rate: r.effRate + '%', tax: r.pph, canon: true })) : []),
    { no: '1.2-02.26-0001849', jenis: 'PPh 4(2)', pihak: 'PT Properti Graha Kantor', dpp: 480_000_000, rate: '10%', tax: 48_000_000 },
    { no: '1.1-02.26-0009921', jenis: 'PPh 21', pihak: '38 karyawan (kolektif)', dpp: 1_400_000_000, rate: 'TER', tax: 210_000_000 },
  ];

  const markFiled = (i) => setObs(list => list.map((o, j) => j === i ? { ...o, status: 'Lapor' } : o));
  const tabs = [{ id: 'kalender', label: 'Kalender Kewajiban', count: obs.filter(o => o.status === 'Belum Lapor' || o.status === 'Draft').length }, { id: 'ppn', label: 'PPN / e-Faktur (Coretax)' }, { id: 'pph', label: 'PPh Pot/Put' }, { id: 'spt', label: 'SPT Tahunan Badan' }, { id: 'deferred', label: 'Pajak Tangguhan' }];

  /* 6-month PPN trend (Rp jt) — keluaran / masukan / kurang bayar */
  const ppnTrend = [
    { m: 'Okt', out: 1180, in: 360 }, { m: 'Nov', out: 1320, in: 410 }, { m: 'Des', out: 1490, in: 520 },
    { m: 'Jan', out: 1095, in: 340 }, { m: 'Feb', out: ppnOut / 1e6, in: ppnIn / 1e6 }, { m: 'Mar', out: 1240, in: 395 },
  ].map(r => ({ ...r, pay: r.out - r.in }));

  /* Deferred tax — temporary differences × 22% */
  const RATE = 0.22;
  const tempDiff = [
    { item: 'Penyusutan aset tetap (komersial vs fiskal)', carry: 6_100_000_000, taxbase: 5_620_000_000, kind: 'taxable' },
    { item: 'Penyisihan WIP tak tertagih', carry: 1_395_000_000, taxbase: 0, kind: 'deductible' },
    { item: 'Liabilitas imbalan kerja (PSAK 24)', carry: 920_000_000, taxbase: 0, kind: 'deductible' },
    { item: 'Penyisihan penurunan nilai piutang', carry: 320_000_000, taxbase: 0, kind: 'deductible' },
  ].map(d => {
    const diff = Math.abs(d.carry - d.taxbase);
    const dt = Math.round(diff * RATE) * (d.kind === 'deductible' ? 1 : -1); // DTA positive, DTL negative
    return { ...d, diff, dt };
  });
  const netDeferred = tempDiff.reduce((s, d) => s + d.dt, 0);
  const dtaSum = tempDiff.filter(d => d.dt > 0).reduce((s, d) => s + d.dt, 0);
  const dtlSum = -tempDiff.filter(d => d.dt < 0).reduce((s, d) => s + d.dt, 0);

  return (
    <>
      <SubBar moduleId="firmtax" right={<div className="row gap8 ac"><span className="chip tiny"><I.link2 size={11} /> DJP Coretax: terhubung</span><Btn sm variant="primary"><I.upload size={13} /> Lapor SPT Masa</Btn></div>} />
      <div className="view-scroll"><div className="view-pad">
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={'Rp ' + fmt(ppnPayable / 1e6, 0) + ' jt'} label="PPN Kurang Bayar (Feb)" accent="var(--amber)" /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={'Rp ' + fmt(pphTotal / 1e6, 0) + ' jt'} label="PPh Dipotong/Disetor" /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={'Rp ' + fmt(cit.amount / 1e9, 2) + ' M'} label="Estimasi PPh Badan FY2025" accent="var(--red)" /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={obs.filter(o => o.status === 'Belum Lapor' || o.status === 'Draft').length} label="Kewajiban Belum Selesai" accent="var(--amber)" /></div></Panel>
        </div>

        <Panel noBody>
          <div className="panel-h" style={{ padding: 0, background: 'var(--surface-2)' }}><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>

          {tab === 'kalender' && (
            <table className="dtbl">
              <thead><tr><th>Jenis Pajak</th><th>Masa</th><th>Jatuh Tempo</th><th className="num">Jumlah</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {obs.map((o, i) => {
                  const days = Math.round((new Date(o.due) - new Date('2026-03-09')) / 864e5);
                  return (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{o.jenis}</td>
                      <td className="tiny muted">{o.period}</td>
                      <td className="mono tiny" style={{ color: days <= 7 ? 'var(--red)' : days <= 20 ? 'var(--amber)' : 'var(--ink-3)' }}>{new Date(o.due).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })} {days >= 0 ? '· ' + days + 'h lagi' : '· lewat'}</td>
                      <td className="num">{fmt(o.amount / 1e6, 0)} jt</td>
                      <td><Badge kind={TAX_STAT[o.status]}>{o.status}</Badge></td>
                      <td>{(o.status === 'Belum Lapor' || o.status === 'Draft' || o.status === 'Bayar') && <button className="btn sm" style={{ height: 22 }} onClick={() => markFiled(i)}>Tandai Lapor</button>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {tab === 'ppn' && (
            <div style={{ padding: 14 }}>
              <div className="grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 14 }}>
                <div className="panel" style={{ padding: 12 }}><div className="tiny muted upper">PPN Keluaran</div><div className="mono" style={{ fontSize: 18, fontWeight: 700, color: 'var(--navy)' }}>Rp {fmt(ppnOut / 1e6, 1)} jt</div><div className="tiny muted">{EF.filter(e => e.kind === 'Keluaran').length} faktur keluaran</div></div>
                <div className="panel" style={{ padding: 12 }}><div className="tiny muted upper">PPN Masukan</div><div className="mono" style={{ fontSize: 18, fontWeight: 700, color: 'var(--green)' }}>Rp {fmt(ppnIn / 1e6, 1)} jt</div><div className="tiny muted">dapat dikreditkan</div></div>
                <div className="panel" style={{ padding: 12, background: 'var(--amber-bg)', borderColor: 'transparent' }}><div className="tiny muted upper">PPN Kurang Bayar</div><div className="mono" style={{ fontSize: 18, fontWeight: 700, color: 'var(--amber)' }}>Rp {fmt(ppnPayable / 1e6, 1)} jt</div><div className="tiny muted">setor maks. akhir bulan berikutnya</div></div>
              </div>
              <div className="panel" style={{ padding: 14, marginBottom: 14 }}>
                <div className="row jb ac" style={{ marginBottom: 12 }}><div className="tiny upper" style={{ fontWeight: 700, color: 'var(--blue)' }}>Tren PPN 6 Bulan</div><div className="row gap14 tiny muted"><span className="row ac gap6"><span style={{ width: 14, height: 8, borderRadius: 2, background: '#005085', display: 'inline-block' }} /> Keluaran</span><span className="row ac gap6"><span style={{ width: 14, height: 8, borderRadius: 2, background: '#1f9d63', display: 'inline-block' }} /> Masukan</span><span className="row ac gap6"><span style={{ width: 14, height: 3, background: 'var(--amber)', display: 'inline-block' }} /> Kurang bayar</span></div></div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 18, height: 130, padding: '0 4px 6px', borderBottom: '1px solid var(--line)' }}>
                  {ppnTrend.map(t => {
                    const mx = Math.max(...ppnTrend.map(x => x.out)) * 1.15;
                    return (
                      <div key={t.m} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                        <div className="row" style={{ alignItems: 'flex-end', gap: 3, height: 100, width: '100%', justifyContent: 'center' }}>
                          <div style={{ width: 14, height: (t.out / mx * 100) + '%', background: 'linear-gradient(180deg,#0a6b8a,#005085)', borderRadius: '3px 3px 0 0' }} title={'Keluaran ' + fmt(t.out, 0)} />
                          <div style={{ width: 14, height: (t.in / mx * 100) + '%', background: 'linear-gradient(180deg,#27b277,#1f9d63)', borderRadius: '3px 3px 0 0' }} title={'Masukan ' + fmt(t.in, 0)} />
                        </div>
                        <span className="tiny mono" style={{ color: 'var(--amber)', fontWeight: 700 }}>{fmt(t.pay, 0)}</span>
                        <span className="tiny muted">{t.m}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="tiny muted" style={{ marginTop: 8 }}>PPN kurang bayar bulanan (keluaran − masukan) · Rp jt · disetor & dilaporkan via SPT Masa PPN.</div>
              </div>
              <table className="dtbl">
                <thead><tr><th>No. Seri Faktur Pajak</th><th>Lawan Transaksi</th><th>Jenis</th><th className="num">DPP</th><th className="num">PPN 11%</th><th>Status e-Faktur</th></tr></thead>
                <tbody>
                  {EF.map(e => (
                    <tr key={e.no}>
                      <td className="mono tiny" style={{ color: 'var(--blue)' }}>{e.no}</td>
                      <td style={{ fontWeight: 600 }} className="truncate">{e.client.replace('PT ', '')}</td>
                      <td><Badge kind={e.kind === 'Keluaran' ? 'blue' : 'purple'}>{e.kind}</Badge></td>
                      <td className="num">{fmt(e.dpp / 1e6, 0)} jt</td>
                      <td className="num" style={{ fontWeight: 600 }}>{fmt(e.ppn / 1e6, 1)} jt</td>
                      <td><Badge kind={e.status === 'Approved' ? 'green' : e.status === 'Pending' ? 'amber' : 'gray'}>{e.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'pph' && (
            <div style={{ padding: 14 }}>
              <table className="dtbl">
                <thead><tr><th>Jenis PPh</th><th>Objek / Dasar</th><th className="num">Tarif</th><th className="num">DPP</th><th className="num">PPh Dipotong</th></tr></thead>
                <tbody>
                  {PPHrows.map(p => (
                    <tr key={p.jenis} style={{ cursor: p.canon ? 'pointer' : 'default' }} onClick={p.canon ? goTax : undefined}>
                      <td style={{ fontWeight: 700, color: 'var(--blue)' }}>{p.jenis}{p.canon && <span className="chip tiny" style={{ height: 16, marginLeft: 6, color: 'var(--green)', borderColor: 'transparent', background: 'var(--green-bg)' }} title="Ditarik dari modul Pajak PPh 23"><I.link2 size={10} /> SSOT</span>}</td>
                      <td>{p.basis}</td>
                      <td className="num"><span className="chip tiny">{p.rate}</span></td>
                      <td className="num">{fmt(p.dpp / 1e6, 0)} jt</td>
                      <td className="num" style={{ fontWeight: 600 }}>{fmt(p.tax / 1e6, 1)} jt</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr><td colSpan={4}>TOTAL PPh DIPOTONG/DISETOR</td><td className="num">{fmt(PPHrows.reduce((s, p) => s + p.tax, 0) / 1e6, 1)} jt</td></tr></tfoot>
              </table>
              <div className="panel" style={{ marginTop: 12, padding: '10px 13px', background: 'var(--blue-050)', borderColor: 'var(--blue-100)' }}>
                <div className="tiny" style={{ lineHeight: 1.55 }}>Bukti Potong Unifikasi diterbitkan otomatis via <b>Coretax DJP</b> (menggantikan e-Bupot/e-Faktur lama sejak 2025). PPh 21 disetor maks. tgl 10 bulan berikutnya; PPh 23 & 4(2) menyertakan bukti potong ke lawan transaksi — identitas OP memakai NIK sebagai NPWP.</div>
              </div>
              <div className="row jb ac" style={{ margin: '16px 0 8px' }}><span className="tiny upper" style={{ fontWeight: 700, color: 'var(--blue)' }}>Bukti Potong Unifikasi · Coretax · Feb 2026</span>{T23 && <button className="chip tiny" style={{ cursor: 'pointer', height: 20 }} onClick={goTax}><I.receipt size={11} /> Kelola di modul Pajak PPh 23</button>}</div>
              <table className="dtbl">
                <thead><tr><th>No. Bukti Potong</th><th>Jenis</th><th>Lawan Transaksi</th><th className="num">DPP</th><th className="num">Tarif</th><th className="num">PPh</th><th>Status</th></tr></thead>
                <tbody>
                  {ebupotFeb.map(b => (
                    <tr key={b.no}>
                      <td className="mono tiny" style={{ color: 'var(--blue)' }}>{b.no}</td>
                      <td style={{ fontWeight: 700, color: 'var(--blue)' }}>{b.jenis}</td>
                      <td className="truncate" style={{ maxWidth: 200, fontWeight: 600 }}>{b.pihak}</td>
                      <td className="num">{fmt(b.dpp / 1e6, 0)} jt</td>
                      <td className="num"><span className="chip tiny">{b.rate}</span></td>
                      <td className="num" style={{ fontWeight: 600 }}>{fmt(b.tax / 1e6, 1)} jt</td>
                      <td><Badge kind="green">Terbit</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'spt' && (
            <div style={{ padding: 14 }}>
              <div className="grid" style={{ gridTemplateColumns: '1.3fr 1fr', gap: 14, alignItems: 'start' }}>
                <Panel title="Rekonsiliasi Fiskal — SPT Tahunan Badan FY2025">
                  <table className="dtbl">
                    <tbody>
                      {[
                        ['Laba komersial sebelum pajak', 5_640_000_000, false],
                        ['Koreksi positif (beban non-deductible)', 480_000_000, false],
                        ['Koreksi negatif (penghasilan final)', -360_000_000, false],
                        ['Penghasilan Kena Pajak', 5_760_000_000, true],
                        ['PPh Badan terutang (22%)', 1_267_200_000, false],
                        ['Kredit pajak (PPh 25 + 23)', -1_152_000_000, false],
                        ['PPh Pasal 29 — Kurang Bayar', 115_200_000, true],
                      ].map(([l, v, bold]) => (
                        <tr key={l} style={{ fontWeight: bold ? 700 : 400, background: bold ? 'var(--surface-2)' : 'transparent' }}>
                          <td style={{ padding: '7px 9px', borderBottom: '1px solid var(--line-soft)' }}>{l}</td>
                          <td className="num" style={{ padding: '7px 9px', borderBottom: '1px solid var(--line-soft)', color: v < 0 ? 'var(--green)' : 'inherit' }}>{v < 0 ? '(' + fmt(-v / 1e6, 0) + ')' : fmt(v / 1e6, 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="tiny muted" style={{ marginTop: 8 }}>dalam jutaan Rupiah · tarif PPh Badan 22% (UU HPP)</div>
                </Panel>
                <div style={{ display: 'grid', gap: 12 }}>
                  <div className="panel" style={{ padding: 14, textAlign: 'center' }}>
                    <div className="tiny muted upper" style={{ marginBottom: 6 }}>PPh 29 Kurang Bayar</div>
                    <div className="mono" style={{ fontSize: 28, fontWeight: 800, color: 'var(--red)' }}>Rp 115 jt</div>
                    <div className="tiny muted" style={{ marginBottom: 10 }}>setor sebelum lapor SPT</div>
                    <div className="divider" />
                    <RowKv label="Tenggat Lapor" v="30 Apr 2026" strong />
                    <RowKv label="Effective Tax Rate" v="22,5%" />
                  </div>
                  <div className="panel" style={{ padding: 14 }}>
                    <div className="row ac gap8" style={{ marginBottom: 8 }}><span style={{ color: 'var(--amber)' }}><I.alert size={15} /></span><span style={{ fontSize: 12.5, fontWeight: 700 }}>Status: Draft</span></div>
                    <div className="tiny muted" style={{ lineHeight: 1.5, marginBottom: 10 }}>Lampiran (1771, daftar nominatif, laporan keuangan audited) belum lengkap.</div>
                    <Btn sm variant="primary" style={{ width: '100%' }}><I.doc size={13} /> Susun SPT 1771</Btn>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'deferred' && (
            <div style={{ padding: 14 }}>
              <div className="grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 14 }}>
                <div className="panel" style={{ padding: 12, background: 'var(--green-bg)', borderColor: 'transparent' }}><div className="tiny muted upper">Aset Pajak Tangguhan (DTA)</div><div className="mono" style={{ fontSize: 18, fontWeight: 700, color: 'var(--green)' }}>Rp {fmt(dtaSum / 1e6, 0)} jt</div></div>
                <div className="panel" style={{ padding: 12, background: 'var(--amber-bg)', borderColor: 'transparent' }}><div className="tiny muted upper">Liabilitas Pajak Tangguhan (DTL)</div><div className="mono" style={{ fontSize: 18, fontWeight: 700, color: 'var(--amber)' }}>Rp {fmt(dtlSum / 1e6, 0)} jt</div></div>
                <div className="panel" style={{ padding: 12 }}><div className="tiny muted upper">Pajak Tangguhan Neto</div><div className="mono" style={{ fontSize: 18, fontWeight: 700, color: netDeferred >= 0 ? 'var(--green)' : 'var(--red)' }}>{netDeferred >= 0 ? 'DTA ' : 'DTL '}Rp {fmt(Math.abs(netDeferred) / 1e6, 0)} jt</div></div>
              </div>
              <table className="dtbl">
                <thead><tr><th>Beda Temporer</th><th className="num">Nilai Tercatat</th><th className="num">Dasar Pajak</th><th className="num">Beda Temporer</th><th>Sifat</th><th className="num">DTA/(DTL) 22%</th></tr></thead>
                <tbody>
                  {tempDiff.map(d => (
                    <tr key={d.item}>
                      <td style={{ fontWeight: 600 }}>{d.item}</td>
                      <td className="num">{fmt(d.carry / 1e6, 0)}</td>
                      <td className="num muted">{fmt(d.taxbase / 1e6, 0)}</td>
                      <td className="num">{fmt(d.diff / 1e6, 0)}</td>
                      <td><Badge kind={d.kind === 'deductible' ? 'green' : 'amber'}>{d.kind === 'deductible' ? 'Dapat dikurangkan' : 'Kena pajak'}</Badge></td>
                      <td className="num" style={{ fontWeight: 600, color: d.dt >= 0 ? 'var(--green)' : 'var(--red)' }}>{d.dt >= 0 ? fmt(d.dt / 1e6, 0) : '(' + fmt(-d.dt / 1e6, 0) + ')'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr><td colSpan={5}>PAJAK TANGGUHAN NETO</td><td className="num" style={{ color: netDeferred >= 0 ? 'var(--green)' : 'var(--red)' }}>{netDeferred >= 0 ? fmt(netDeferred / 1e6, 0) : '(' + fmt(-netDeferred / 1e6, 0) + ')'}</td></tr></tfoot>
              </table>
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 14, alignItems: 'start' }}>
                <Panel title="Rekonsiliasi Beban Pajak" sub="FY2025 · Rp jt">
                  <div style={{ display: 'grid', gap: 7 }}>
                    <RowKv label="Beban pajak kini (PPh Badan 22%)" v={'Rp ' + fmt(1_267 , 0) + ' jt'} />
                    <RowKv label="Beban/(manfaat) pajak tangguhan" v={(netDeferred >= 0 ? '(Rp ' + fmt(netDeferred / 1e6, 0) + ' jt)' : 'Rp ' + fmt(-netDeferred / 1e6, 0) + ' jt')} />
                    <div className="divider" />
                    <RowKv label="Total beban pajak penghasilan" v={'Rp ' + fmt(1_267 - netDeferred / 1e6, 0) + ' jt'} strong />
                  </div>
                </Panel>
                <div className="panel" style={{ padding: '11px 13px', background: 'var(--blue-050)', borderColor: 'var(--blue-100)' }}>
                  <div className="row ac gap8" style={{ marginBottom: 8 }}><span style={{ color: 'var(--blue)' }}><I.report size={15} /></span><span style={{ fontSize: 12.5, fontWeight: 700 }}>PSAK 46 — Pajak Penghasilan</span></div>
                  <div className="tiny" style={{ lineHeight: 1.6 }}>Aset/liabilitas pajak tangguhan diukur dengan tarif <b>22%</b> yang berlaku saat beda temporer terpulihkan. DTA neto sebesar <b>Rp {fmt(Math.abs(netDeferred) / 1e6, 0)} jt</b> diakui karena firma memiliki laba kena pajak yang memadai untuk pemulihannya.</div>
                </div>
              </div>
            </div>
          )}
        </Panel>
      </div></div>
    </>
  );
}

Object.assign(window, { FirmTax });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { FirmTax };
