/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { useAmsPersist, useAudit, useAuth, useNav } from './contexts';
import { I } from './icons';
import { SubBar } from './shell';
import { Badge, Btn, Panel, Stat, Tabs } from './ui';
import { RowKv } from './view_calc';
import { CAP } from './rbac';
import { TAX23 } from './data_pph23';
import { glActor, glWriteAllowed } from './firm_gl_actor';
import {
  BUPOT_MASA, PROVENANCE_LABEL, PROVENANCE_TONE, bupotRows, pphSummaryRows,
} from './firmtax_bupot';
import type { Provenance } from './firmtax_bupot';

/* ============================================================
   Asseris — Firm Finance (ERP): Pajak Firma
   PPN / e-Faktur · PPh 21/23/4(2) · SPT Tahunan Badan ·
   kalender kewajiban perpajakan KAP itu sendiri.
   ============================================================ */
const { useState: useStateTX } = React;

const TAX_STAT = { 'Lapor': 'green', 'Bayar': 'blue', 'Belum Lapor': 'amber', 'Draft': 'gray', 'Terlambat': 'red' };

/* Penanda asal sebuah baris — WAJIB pada setiap baris tabel yang bercampur.
   Sebelumnya hanya baris kanonik yang bertanda ("SSOT"), sehingga baris karangan
   dikenali hanya lewat KETIADAAN chip. Ketiadaan tidak terbaca. */
function ProvChip({ p, title }: { p: Provenance; title?: string }) {
  const tone = PROVENANCE_TONE[p];
  return (
    <span
      className="chip tiny"
      title={title || PROVENANCE_LABEL[p]}
      style={{ height: 16, marginLeft: 6, color: tone.fg, borderColor: 'transparent', background: tone.bg }}
    >
      {p === 'kanonik' ? <I.link2 size={10} /> : <I.alert size={10} />} {PROVENANCE_LABEL[p]}
    </span>
  );
}

/* Idiom repo untuk tabel yang SELURUH barisnya berasal dari seed (dipakai juga di
   view_firmrevenue & view_firmtreasury): satu pernyataan di tingkat tabel, bukan
   chip per-baris yang jadi derau ketika tak ada yang membedakannya. */
function IlustrasiBanner({ children }: { children?: unknown }) {
  return (
    <div className="tiny" style={{ margin: '10px 14px', padding: '7px 10px', background: 'var(--amber-bg)', borderRadius: 4, color: 'var(--amber)', fontWeight: 600, lineHeight: 1.5 }}>
      <I.alert size={12} /> {children}
    </div>
  );
}

function FirmTax() {
  const { fmt } = AMS;
  const navTX = useNav();
  const EF: any = AMS.EFAKTUR;
  const PPH: any = AMS.PPH_WITHHELD;
  const [tab, setTab] = useStateTX('kalender');
  const [obs, setObs] = useAmsPersist('firmtax', () => AMS.TAX_OBLIGATIONS);
  /* SoD finansial (Program E): tandai lapor = FIRMFIN_EDIT (server capForWrite
     sudah menegakkan 'firmtax'; gate UI mencegah ditolak senyap). */
  const auth = useAuth();
  const canEdit = !!(auth && typeof auth.can === 'function' && auth.can(CAP.FIRMFIN_EDIT));
  const { logActivity } = useAudit();
  /* FT3 — pelaku jejak dari SESI. Dulu `(AMS.USER && AMS.USER.name) || 'Pengguna'`:
     `AMS.USER` adalah data seed, jadi jejak `TAX_FILED` — menandai sebuah kewajiban
     pajak telah dilaporkan — mencatat nama yang tak ada hubungannya dengan siapa
     yang menekan tombol, dan mencatat literal 'Pengguna' bila seed kosong.
     Catatan: `useCurrentAuditor()` TIDAK dipakai di sini meski ia identitas sesi,
     karena ia sengaja JATUH KEMBALI ke `AMS.USER.name` (contexts.tsx:282) — jaring
     itu benar untuk memfilter "milik saya", tetapi untuk ATRIBUSI TULIS ia justru
     cacat yang sama. Pola yang dipakai = `glActor`/`glWriteAllowed` (firm_gl_actor.ts),
     yang sudah menutup cacat identik di Firm GL dan AP/AR. */
  const who = glActor(auth && auth.user);
  const canFile = glWriteAllowed(canEdit, who);
  /* Alasan ditulis di sini, bukan diambil dari `glWriteBlockReason`: kalimat di sana
     berbunyi "Posting jurnal", yang salah modul. Predikatnya yang dibagi, bukan teksnya. */
  const fileBlockReason = !canEdit
    ? 'Penandaan pelaporan dibatasi peran Finance Firma / Partner (SoD finansial)'
    : 'Identitas sesi tidak tersedia — penandaan dinonaktifkan agar jejak kepatuhan tidak mencatat nama yang salah';

  const ppnOut = EF.filter((e: any) => e.kind === 'Keluaran').reduce((s: any, e: any) => s + e.ppn, 0);
  const ppnIn = EF.filter((e: any) => e.kind === 'Masukan').reduce((s: any, e: any) => s + e.ppn, 0);
  const ppnPayable = ppnOut - ppnIn;
  const pphTotal = PPH.reduce((s: any, p: any) => s + p.tax, 0);
  const cit = obs.find((o: any) => o.jenis.includes('Badan'));

  /* PPh 23 ditarik dari modul kanonik (SSOT) — bukan angka kedua.
     FT5 — `TAX23` diimpor ESM. Penerbitnya (`data_pph23.ts`) eager di main.tsx:29,
     jadi cabang lama `window.TAX23 ? … : null` tak pernah aktif; ia kode mati, bukan
     bug yang diperbaiki. Perakit `pphSummaryRows` tetap menerima `null` karena ia
     modul murni yang harus dapat diuji tanpa lapisan data. */
  const T23 = TAX23.summary();
  const goTax = () => navTX('tax', { from: 'firmtax' });
  const PPHrows = pphSummaryRows({ withheld: PPH, t23: T23 });
  const masaLabel = (TAX23.MASA_LABEL as Record<string, string>)[BUPOT_MASA] || BUPOT_MASA;
  const ebupot = bupotRows({
    masa: BUPOT_MASA,
    register: TAX23.register(),
    withheld: PPH,
    payrollPeriod: (AMS.PAYROLL_RATES as { period?: string } | undefined)?.period || null,
  });

  const markFiled = (i: any) => {
    if (!canFile || !who) return;
    const o = obs[i];
    setObs((list: any) => list.map((x: { status: string }, j: number) => j === i ? { ...x, status: 'Lapor' } : x));
    logActivity && logActivity({ who, action: 'TAX_FILED', detail: `${o ? o.jenis + ' · ' : ''}${o ? o.period : ''} ditandai Lapor` });
  };
  const tabs = [{ id: 'kalender', label: 'Kalender Kewajiban', count: obs.filter((o: any) => o.status === 'Belum Lapor' || o.status === 'Draft').length }, { id: 'ppn', label: 'PPN / e-Faktur (Coretax)' }, { id: 'pph', label: 'PPh Pot/Put' }, { id: 'spt', label: 'SPT Tahunan Badan' }, { id: 'deferred', label: 'Pajak Tangguhan' }];

  /* 6-month PPN trend (Rp jt) — keluaran / masukan / kurang bayar */
  const ppnTrend = [
    { m: 'Okt', out: 1180, in: 360 }, { m: 'Nov', out: 1320, in: 410 }, { m: 'Des', out: 1490, in: 520 },
    { m: 'Jan', out: 1095, in: 340 }, { m: 'Feb', out: ppnOut / 1e6, in: ppnIn / 1e6 }, { m: 'Mar', out: 1240, in: 395 },
  ].map(r => ({ ...r, pay: r.out - r.in }));

  /* Deferred tax — temporary differences × 22%
     FT4 (TEMUAN TERTAUT, SENGAJA TIDAK DIPINDAHKAN) — 22% adalah tarif statuter yang
     pernah berubah (25% → 22%, UU HPP) dan dapat berubah lagi. Salinannya sudah ada di
     `canon_base.ts:7` (RATE, diekspor sebagai `AMS_CANON.RATE`) dan dibaca sebagai
     fallback di `data_proforma.ts:129`. Rumah yang BENAR baginya adalah set bermasa
     berlaku di `regrefCatalog()` dengan `enforcement: 'block'` — itu lingkup prompt
     27-regref (R3), yang pada HEAD ini BELUM dikerjakan: `REGREF_EXPECTED_IDS` masih
     berisi lima id (bpjs · ter · ptkp · biaya-jabatan · hari-libur), tanpa tarif PPh
     badan. Karena itu salinan ini DIBIARKAN di tempatnya: memindahkannya ke berkas
     data sebagai konstanta baru hanya akan menambah rumah ketiga yang harus dicabut
     lagi nanti. Jangan menyalinnya lagi. */
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
      <SubBar moduleId="firmtax" right={<div className="row gap8 ac"><span className="chip tiny"><I.link2 size={11} /> DJP Coretax: terhubung</span><span className="chip tiny muted" title="Read-only — pelaporan SPT dikelola di CoreSys / Coretax (roadmap)"><I.lock size={11} /> Read-only</span></div>} />
      <div className="view-scroll"><div className="view-pad">
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={'Rp ' + fmt(ppnPayable / 1e6, 0) + ' jt'} label="PPN Kurang Bayar (Feb)" accent="var(--amber)" /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={'Rp ' + fmt(pphTotal / 1e6, 0) + ' jt'} label="PPh Dipotong/Disetor" /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={'Rp ' + fmt(cit.amount / 1e9, 2) + ' M'} label="Estimasi PPh Badan FY2025" accent="var(--red)" /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={obs.filter((o: any) => o.status === 'Belum Lapor' || o.status === 'Draft').length} label="Kewajiban Belum Selesai" accent="var(--amber)" /></div></Panel>
        </div>

        <Panel noBody>
          <div className="panel-h" style={{ padding: 0, background: 'var(--surface-2)' }}><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>

          {tab === 'kalender' && (<>
            <IlustrasiBanner>Kalender kewajiban ini ILUSTRASI demo — jenis, masa, dan jumlahnya berasal dari data seed (<code>AMS.TAX_OBLIGATIONS</code>), belum diturunkan dari SPT/Coretax maupun buku besar firma. Yang nyata di sini hanya status yang Anda ubah sendiri, beserta jejaknya.</IlustrasiBanner>
            <table className="dtbl">
              <thead><tr><th>Jenis Pajak</th><th>Masa</th><th>Jatuh Tempo</th><th className="num">Jumlah</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {obs.map((o: any, i: any) => {
                  const days = Math.round((+new Date(o.due) - +new Date(AMS.TODAY)) / 864e5);
                  return (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{o.jenis}</td>
                      <td className="tiny muted">{o.period}</td>
                      <td className="mono tiny" style={{ color: days <= 7 ? 'var(--red)' : days <= 20 ? 'var(--amber)' : 'var(--ink-3)' }}>{new Date(o.due).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })} {days >= 0 ? '· ' + days + 'h lagi' : '· lewat'}</td>
                      <td className="num">{fmt(o.amount / 1e6, 0)} jt</td>
                      <td><Badge kind={(TAX_STAT as any)[o.status]}>{o.status}</Badge></td>
                      <td>{(o.status === 'Belum Lapor' || o.status === 'Draft' || o.status === 'Bayar') && (canFile
                        ? <button className="btn sm" style={{ height: 22 }} onClick={() => markFiled(i)}>Tandai Lapor</button>
                        : <span className="tiny muted" title={fileBlockReason}><I.lock size={11} /> kunci</span>)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>)}

          {tab === 'ppn' && (
            <div style={{ padding: 14 }}>
              <div className="grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 14 }}>
                <div className="panel" style={{ padding: 12 }}><div className="tiny muted upper">PPN Keluaran</div><div className="mono" style={{ fontSize: 19, fontWeight: 700, color: 'var(--navy)' }}>Rp {fmt(ppnOut / 1e6, 1)} jt</div><div className="tiny muted">{EF.filter((e: any) => e.kind === 'Keluaran').length} faktur keluaran</div></div>
                <div className="panel" style={{ padding: 12 }}><div className="tiny muted upper">PPN Masukan</div><div className="mono" style={{ fontSize: 19, fontWeight: 700, color: 'var(--green)' }}>Rp {fmt(ppnIn / 1e6, 1)} jt</div><div className="tiny muted">dapat dikreditkan</div></div>
                <div className="panel" style={{ padding: 12, background: 'var(--amber-bg)', borderColor: 'transparent' }}><div className="tiny muted upper">PPN Kurang Bayar</div><div className="mono" style={{ fontSize: 19, fontWeight: 700, color: 'var(--amber)' }}>Rp {fmt(ppnPayable / 1e6, 1)} jt</div><div className="tiny muted">setor maks. akhir bulan berikutnya</div></div>
              </div>
              <div className="panel" style={{ padding: 14, marginBottom: 14 }}>
                <div className="row jb ac" style={{ marginBottom: 12 }}><div className="tiny upper" style={{ fontWeight: 700, color: 'var(--blue)' }}>Tren PPN 6 Bulan</div><div className="row gap14 tiny muted"><span className="row ac gap6"><span style={{ width: 14, height: 8, borderRadius: 2, background: '#005085', display: 'inline-block' }} /> Keluaran</span><span className="row ac gap6"><span style={{ width: 14, height: 8, borderRadius: 2, background: '#1f9d63', display: 'inline-block' }} /> Masukan</span><span className="row ac gap6"><span style={{ width: 14, height: 3, background: 'var(--amber-solid)', display: 'inline-block' }} /> Kurang bayar</span></div></div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 18, height: 130, padding: '0 4px 6px', borderBottom: '1px solid var(--line)' }}>
                  {ppnTrend.map(t => {
                    const mx = Math.max(...ppnTrend.map(x => x.out)) * 1.15;
                    return (
                      <div key={t.m} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                        <div className="row" style={{ alignItems: 'flex-end', gap: 3, height: 100, width: '100%', justifyContent: 'center' }}>
                          <div style={{ width: 14, height: (t.out / mx * 100) + '%', background: 'linear-gradient(180deg,#0a6b8a,var(--blue-solid))', borderRadius: '3px 3px 0 0' }} title={'Keluaran ' + fmt(t.out, 0)} />
                          <div style={{ width: 14, height: (t.in / mx * 100) + '%', background: 'linear-gradient(180deg,#27b277,#1f9d63)', borderRadius: '3px 3px 0 0' }} title={'Masukan ' + fmt(t.in, 0)} />
                        </div>
                        <span className="tiny mono" style={{ color: 'var(--amber)', fontWeight: 700 }}>{fmt(t.pay, 0)}</span>
                        <span className="tiny muted">{t.m}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="tiny muted" style={{ marginTop: 8 }}>PPN kurang bayar bulanan (keluaran − masukan) · Rp jt · disetor &amp; dilaporkan via SPT Masa PPN. <b style={{ color: 'var(--amber)' }}>Hanya batang Feb yang dihitung dari daftar faktur di bawah</b> — lima bulan lainnya ILUSTRASI demo yang diketik di dalam modul.</div>
              </div>
              <IlustrasiBanner>Daftar faktur di bawah ILUSTRASI demo — ia adalah <b>fixture konektor Coretax</b> (<code>server/src/integrations/providers/coretaxFixture.ts</code>), bukan tarikan dari e-Faktur milik firma. Nomor serinya sengaja identik dengan fixture itu agar control total Σ PPN Keluaran di kokpit Integrasi menutup; ia bukan nomor faktur yang pernah diterbitkan.</IlustrasiBanner>
              <table className="dtbl">
                <thead><tr><th>No. Seri Faktur Pajak</th><th>Lawan Transaksi</th><th>Jenis</th><th className="num">DPP</th><th className="num">PPN 11%</th><th>Status e-Faktur</th></tr></thead>
                <tbody>
                  {EF.map((e: any) => (
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
                  {PPHrows.map((p) => (
                    <tr key={p.jenis}>
                      <td style={{ fontWeight: 700, color: 'var(--blue)' }}>
                        {p.jenis}
                        <ProvChip p={p.provenance} title={p.note} />
                        {p.route && <button type="button" className="btn sm" style={{ height: 18, marginLeft: 6 }} onClick={goTax}>Buka register</button>}
                      </td>
                      <td>{p.basis}</td>
                      <td className="num"><span className="chip tiny">{p.rate}</span></td>
                      <td className="num">{fmt(p.dpp / 1e6, 0)} jt</td>
                      <td className="num" style={{ fontWeight: 600 }}>{fmt(p.tax / 1e6, 1)} jt</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr><td colSpan={4}>TOTAL PPh DIPOTONG/DISETOR <span className="tiny muted" style={{ fontWeight: 400 }}>— campuran: {PPHrows.filter(p => p.provenance === 'kanonik').length} baris kanonik + {PPHrows.filter(p => p.provenance !== 'kanonik').length} baris ilustrasi</span></td><td className="num">{fmt(PPHrows.reduce((s, p) => s + p.tax, 0) / 1e6, 1)} jt</td></tr></tfoot>
              </table>
              <div className="panel" style={{ marginTop: 12, padding: '10px 13px', background: 'var(--blue-050)', borderColor: 'var(--blue-100)' }}>
                <div className="tiny" style={{ lineHeight: 1.55 }}>Bukti Potong Unifikasi diterbitkan otomatis via <b>Coretax DJP</b> (menggantikan e-Bupot/e-Faktur lama sejak 2025). PPh 21 disetor maks. tgl 10 bulan berikutnya; PPh 23 & 4(2) menyertakan bukti potong ke lawan transaksi — identitas OP memakai NIK sebagai NPWP.</div>
              </div>
              <div className="row jb ac" style={{ margin: '16px 0 8px' }}><span className="tiny upper" style={{ fontWeight: 700, color: 'var(--blue)' }}>Bukti Potong Unifikasi · Coretax · {masaLabel}</span><button type="button" className="chip tiny" style={{ cursor: 'pointer', height: 20 }} onClick={goTax}><I.receipt size={11} /> Kelola di modul Pajak PPh 23</button></div>
              <table className="dtbl">
                <thead><tr><th>No. Bukti Potong</th><th>Jenis</th><th>Lawan Transaksi</th><th className="num">DPP</th><th className="num">Tarif</th><th className="num">PPh</th><th>Status</th></tr></thead>
                <tbody>
                  {ebupot.map(b => (
                    <tr key={b.key}>
                      {/* Nomor dokumen hanya ada untuk baris kanonik. Tanda hubung di
                          sini BUKAN kekosongan data yang menunggu diisi — ia menyatakan
                          bahwa baris itu tak punya bukti potong, dan tak boleh dikarang. */}
                      <td className="mono tiny" style={{ color: b.no ? 'var(--blue)' : 'var(--ink-3)' }}>{b.no || '—'}</td>
                      <td style={{ fontWeight: 700, color: 'var(--blue)' }}>{b.jenis}<ProvChip p={b.provenance} title={b.note} /></td>
                      <td className="truncate" style={{ maxWidth: 200, fontWeight: 600 }}>{b.pihak || <span className="muted" style={{ fontWeight: 400 }}>tidak dinyatakan</span>}</td>
                      <td className="num">{b.dpp === null ? '—' : fmt(b.dpp / 1e6, 0) + ' jt'}</td>
                      <td className="num">{b.rate ? <span className="chip tiny">{b.rate}</span> : '—'}</td>
                      <td className="num" style={{ fontWeight: 600 }}>{b.tax === null ? '—' : fmt(b.tax / 1e6, 1) + ' jt'}</td>
                      <td>{b.status ? <Badge kind={b.status === 'Terbit' ? 'green' : 'amber'}>{b.status}</Badge> : <span className="tiny muted">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="tiny muted" style={{ marginTop: 8, lineHeight: 1.55 }}>
                Baris ber-chip <b>SSOT</b> berasal dari register pemotongan PPh 23 — nomor, lawan transaksi, dan status penerbitannya nyata.
                Baris <b>ilustrasi</b> hanya membawa agregat seed: tak ada register bukti potongnya, sehingga nomor dokumen dan lawan transaksinya tidak dinyatakan.
                Baris <b>belum tersedia</b> tak membawa angka sama sekali — alasannya ada pada chip-nya.
              </div>
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
                      ].map(([l, v, bold]: any[]) => (
                        <tr key={l} style={{ fontWeight: bold ? 700 : 400, background: bold ? 'var(--surface-2)' : 'transparent' }}>
                          <td style={{ padding: '7px 9px', borderBottom: '1px solid var(--line-soft)' }}>{l}</td>
                          <td className="num" style={{ padding: '7px 9px', borderBottom: '1px solid var(--line-soft)', color: v < 0 ? 'var(--green)' : 'inherit' }}>{v < 0 ? '(' + fmt(-v / 1e6, 0) + ')' : fmt(v / 1e6, 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="tiny muted" style={{ marginTop: 8 }}>dalam jutaan Rupiah · tarif PPh Badan 22% (UU HPP)</div>
                  <div className="tiny" style={{ marginTop: 6, padding: '7px 10px', background: 'var(--amber-bg)', borderRadius: 4, color: 'var(--amber)', fontWeight: 600, lineHeight: 1.5 }}><I.alert size={12} /> Angka rekonsiliasi ini ILUSTRASI demo — belum diturunkan dari buku besar firma (roadmap Ledger-based Reporting, Program E). Saat penyusunan SPT 1771 tersambung ke GL, saldo akun akan mengalir otomatis.</div>
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
                    <div className="row ac gap8" style={{ marginBottom: 8 }}><span style={{ color: 'var(--amber)' }}><I.alert size={15} /></span><span style={{ fontSize: 12, fontWeight: 700 }}>Status: Draft</span></div>
                    <div className="tiny muted" style={{ lineHeight: 1.5, marginBottom: 10 }}>Lampiran (1771, daftar nominatif, laporan keuangan audited) belum lengkap.</div>
                    <div className="chip tiny muted" style={{ width: 'fit-content' }} title="Read-only — penyusunan SPT 1771 dikelola di CoreSys / Coretax (roadmap)"><I.lock size={11} /> Penyusunan SPT: CoreSys (roadmap)</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'deferred' && (
            <div style={{ padding: 14 }}>
              <IlustrasiBanner>Keempat beda temporer di bawah ILUSTRASI demo — nilai tercatat dan dasar pajaknya diketik di dalam modul, belum diturunkan dari register aset tetap, WIP, maupun imbalan kerja firma (PRD Keuangan Firma PR-4: “PPh Badan firma memakai mesin PSAK 46 milik firma sendiri”). Tarif 22%-nya juga belum menjadi referensi regulatori bermasa berlaku.</IlustrasiBanner>
              <div className="grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 14 }}>
                <div className="panel" style={{ padding: 12, background: 'var(--green-bg)', borderColor: 'transparent' }}><div className="tiny muted upper">Aset Pajak Tangguhan (DTA)</div><div className="mono" style={{ fontSize: 19, fontWeight: 700, color: 'var(--green)' }}>Rp {fmt(dtaSum / 1e6, 0)} jt</div></div>
                <div className="panel" style={{ padding: 12, background: 'var(--amber-bg)', borderColor: 'transparent' }}><div className="tiny muted upper">Liabilitas Pajak Tangguhan (DTL)</div><div className="mono" style={{ fontSize: 19, fontWeight: 700, color: 'var(--amber)' }}>Rp {fmt(dtlSum / 1e6, 0)} jt</div></div>
                <div className="panel" style={{ padding: 12 }}><div className="tiny muted upper">Pajak Tangguhan Neto</div><div className="mono" style={{ fontSize: 19, fontWeight: 700, color: netDeferred >= 0 ? 'var(--green)' : 'var(--red)' }}>{netDeferred >= 0 ? 'DTA ' : 'DTL '}Rp {fmt(Math.abs(netDeferred) / 1e6, 0)} jt</div></div>
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
                  <div className="row ac gap8" style={{ marginBottom: 8 }}><span style={{ color: 'var(--blue)' }}><I.report size={15} /></span><span style={{ fontSize: 12, fontWeight: 700 }}>PSAK 46 — Pajak Penghasilan</span></div>
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



/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { FirmTax };
