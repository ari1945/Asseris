/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { useFirm } from './contexts';
import { useInvoiceRegister } from './use_invoices';
import { I } from './icons';
import { SubBar } from './shell';
import { Badge, Btn, Panel, Stat, Tabs } from './ui';
import { KvBox } from './view_analytical';
import { RowKv } from './view_calc';
import { recognitionSchedule, type RevenueRow } from './revenue_psak72';

/* ============================================================
   Asseris — Firm Finance (ERP): Pendapatan & Penagihan
   WIP → Billing → Pengakuan Pendapatan (PSAK 72) · e-Faktur output ·
   Nota Kredit · Dunning / penagihan piutang.
   ============================================================ */
const { useState: useStateRV, useMemo: useMemoRV } = React;

/* Sel nomor perikatan = KONTROL, bukan `<tr onClick>`: memilih baris dulu
   mustahil tanpa tetikus (tak ada fokus, tak ada Enter/Spasi, tak ada nama
   yang dibacakan). Gaya di sini supaya tombol tetap terlihat seperti sel. */
const revIdBtnStyle: Record<string, string | number> = {
  background: 'none', border: 0, padding: '0', font: 'inherit', cursor: 'pointer',
  color: 'var(--blue)', fontWeight: 700, textAlign: 'left', width: '100%',
};

function FirmRevenue() {
  const { fmt } = AMS;
  const { engagements, clients } = useFirm();
  /* SATU PINTU register faktur (`use_invoices.ts`) — tertagih (PSAK 72) dan
     antrean dunning dulu membaca literal seed, jadi faktur yang baru dikirim
     atau baru lunas di modul Billing tak pernah sampai ke layar ini. */
  const { register: invoices } = useInvoiceRegister();
  const [tab, setTab] = useStateRV('recognition');
  const [sel, setSel] = useStateRV(null);
  const REF = new Date(AMS.TODAY); /* K-02: klok SSOT */

  /* PSAK 72 — skedul pengakuan. Aritmetikanya tinggal di `revenue_psak72.ts`
     (murni & teruji, modul ini dulu punya nol uji). Dua hal yang berubah bagi
     layar: nilai kontrak HANYA berasal dari fee klien — perikatan yang tak
     menemukan kliennya membawa lubang data yang TERBACA alih-alih proksi
     `materialitas × 0,4`; dan kolom metode berhenti mengarang klasifikasi
     PSAK 72, karena setiap baris di sini diukur dengan cara yang sama. */
  const schedule = useMemoRV(
    () => recognitionSchedule({ engagements, clients, invoices }),
    [engagements, clients, invoices],
  );
  const { rows: sched, gaps, totRecognized, totBilled, totAsset, totLiab, backlog } = schedule;

  /* Dunning — overdue / due invoices */
  const dun = invoices.filter((i: any) => i.status !== 'Paid' && i.status !== 'Draft').map((i: any) => {
    const daysOver = Math.round((+REF - +new Date(i.due)) / 864e5);
    const outstanding = i.amount - i.paid;
    const level = daysOver > 30 ? 3 : daysOver > 15 ? 2 : daysOver > 0 ? 1 : 0;
    return { ...i, daysOver, outstanding, level };
  }).filter((i: any) => i.outstanding > 0).sort((a: any, b: any) => b.daysOver - a.daysOver);
  const overdueTotal = dun.filter((d: any) => d.level > 0).reduce((s: any, d: any) => s + d.outstanding, 0);

  const CN: any = AMS.CREDIT_NOTES;
  const DUN_LEVEL = { 0: { k: 'gray', l: 'Belum jatuh tempo' }, 1: { k: 'blue', l: 'Pengingat 1' }, 2: { k: 'amber', l: 'Pengingat 2' }, 3: { k: 'red', l: 'Eskalasi' } };

  const tabs = [
    { id: 'recognition', label: 'Pengakuan Pendapatan (PSAK 72)' },
    { id: 'rollfwd', label: 'Aset & Liabilitas Kontrak' },
    { id: 'dunning', label: 'Dunning / Penagihan', count: dun.filter((d: any) => d.level > 0).length },
    { id: 'credit', label: 'Nota Kredit', count: CN.length },
  ];

  const selRow = sel ? sched.find((r: any) => r.id === sel) : null;

  return (
    <>
      <SubBar moduleId="revenue" right={<div className="row gap8 ac"><span className="chip tiny"><I.link2 size={11} /> e-Faktur DJP</span><span className="chip tiny muted" title="Read-only — penerbitan faktur dari WIP dikelola di CoreSys (roadmap)"><I.lock size={11} /> Read-only</span></div>} />
      <div className="view-scroll"><div className="view-pad">
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={'Rp ' + fmt(totRecognized / 1e9, 1) + ' M'} label="Pendapatan Diakui (PSAK 72)" accent="var(--green)" /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={'Rp ' + fmt(backlog / 1e9, 1) + ' M'} label="Backlog (belum diakui)" accent="var(--blue)" /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={'Rp ' + fmt(totAsset / 1e6, 0) + ' jt'} label="Aset Kontrak (belum ditagih)" accent="var(--blue)" /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={'Rp ' + fmt(totLiab / 1e6, 0) + ' jt'} label="Pendapatan Diterima Dimuka" accent="var(--amber)" /></div></Panel>
        </div>

        <Panel noBody>
          <div className="panel-h" style={{ padding: 0, background: 'var(--surface-2)' }}><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>

          {tab === 'recognition' && (
            <div className="grid" style={{ gridTemplateColumns: selRow ? '1fr 340px' : '1fr', gap: 0, alignItems: 'stretch' }}>
              <div style={{ minWidth: 0, borderRight: selRow ? '1px solid var(--line)' : 'none' }}>
                {gaps.length > 0 && (
                  <div className="tiny" style={{ margin: '10px 12px 0', padding: '7px 10px', background: 'var(--amber-bg)', borderRadius: 4, color: 'var(--amber)', fontWeight: 600, lineHeight: 1.5 }}>
                    <I.alert size={12} /> {gaps.length} perikatan tanpa nilai kontrak yang dinyatakan ({gaps.map((g: RevenueRow) => g.id).join(' · ')}) — klien tak ditemukan atau fee belum diisi. Barisnya TETAP tampil tetapi pendapatan diakui, aset & liabilitas kontraknya kosong dan tak ikut total; tagihannya tetap dihitung. Lengkapi fee klien di Registry untuk memasukkannya.
                  </div>
                )}
                <table className="dtbl">
                  <thead><tr><th>Engagement</th><th>Klien</th><th>Pengukuran</th><th className="num">Nilai Kontrak</th><th className="num">% Dilaporkan</th><th className="num">Diakui</th><th className="num">Ditagih</th><th className="num">Aset/(Liab) Kontrak</th></tr></thead>
                  <tbody>
                    {sched.map((r: RevenueRow) => {
                      const net = r.asset == null || r.liab == null ? null : r.asset - r.liab;
                      const open = r.id === sel;
                      return (
                        <tr key={r.id} className={open ? 'sel' : ''}>
                          <td className="mono tiny">
                            <button type="button" aria-expanded={open} style={revIdBtnStyle}
                              title={open ? 'Tutup skedul pengakuan rinci' : 'Buka skedul pengakuan rinci ' + r.id}
                              onClick={() => setSel(open ? null : r.id)}>{r.id}</button>
                          </td>
                          <td className="truncate" style={{ maxWidth: 140, fontWeight: 600 }}>{r.client.replace('PT ', '')}</td>
                          <td className="tiny muted">{r.measure}{r.classificationOpen && <> <Badge kind="amber">klasifikasi terbuka</Badge></>}</td>
                          <td className="num">{r.contract == null ? <span className="muted">belum ditetapkan</span> : fmt(r.contract / 1e6, 0)}</td>
                          <td className="num"><div className="row ac gap6" style={{ justifyContent: 'flex-end' }}><div style={{ width: 38, height: 6, borderRadius: 3, background: 'var(--surface-3)' }}><div style={{ width: (r.pct * 100) + '%', height: '100%', borderRadius: 3, background: 'var(--green-solid)' }} /></div><span className="tiny mono" style={{ width: 28 }}>{(r.pct * 100).toFixed(0)}%</span></div></td>
                          <td className="num" style={{ fontWeight: 600 }}>{r.recognized == null ? <span className="muted">—</span> : fmt(r.recognized / 1e6, 0)}</td>
                          <td className="num muted">{fmt(r.billed / 1e6, 0)}</td>
                          <td className="num" style={{ fontWeight: 600, color: net == null ? 'var(--ink-4)' : net > 0 ? 'var(--blue)' : net < 0 ? 'var(--amber)' : 'var(--ink-3)' }}>{net == null || net === 0 ? '—' : net > 0 ? fmt(net / 1e6, 0) : '(' + fmt(-net / 1e6, 0) + ')'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot><tr><td colSpan={5}>TOTAL (Rp jt)</td><td className="num">{fmt(totRecognized / 1e6, 0)}</td><td className="num">{fmt(totBilled / 1e6, 0)}</td><td className="num">{fmt((totAsset - totLiab) / 1e6, 0)}</td></tr></tfoot>
                </table>
                <div className="tiny muted" style={{ padding: '8px 12px' }}>Pendapatan diakui = nilai kontrak (fee klien) × <b>% penyelesaian yang dilaporkan</b> perikatan — bukan pengukuran masukan (jam yang dikeluarkan) maupun keluaran yang diserahkan; usulan penggantinya ada di <span className="mono">docs/usulan-R3-metode-pengukuran-psak72.md</span>. Kolom <b>Ditagih</b> dibaca dari register faktur. Tanda <b>klasifikasi terbuka</b> menandai perikatan non-audit: kewajiban pelaksanaannya mungkin diselesaikan pada satu titik waktu, sehingga persentase penyelesaian belum tentu ukuran yang tepat baginya — klasifikasinya belum ditetapkan. Pilih nomor perikatan untuk skedul pengakuan rinci.</div>
              </div>
              {selRow && <RecognitionDrill r={selRow} onClose={() => setSel(null)} />}
            </div>
          )}

          {tab === 'rollfwd' && (
            <div style={{ padding: 14 }}>
              <div className="tiny" style={{ marginBottom: 10, padding: '7px 10px', background: 'var(--amber-bg)', borderRadius: 4, color: 'var(--amber)', fontWeight: 600, lineHeight: 1.5 }}><I.alert size={12} /> Saldo awal (1 Jan) & komponen pergerakan berikut ILUSTRASI demo — faktor pembagi (×0,74/×0,32/…) disintesis agar menutup ke saldo akhir, BUKAN diturunkan dari buku besar (roadmap Ledger-based Reporting, Program E). Pada tabel di bawah, hanya <b>Ditagih</b> yang merupakan fakta: ia dibaca dari register faktur. <b>Diakui</b> adalah TURUNAN — fee klien × persentase penyelesaian yang <b>dilaporkan</b> perikatan, bukan hasil pengukuran masukan atau keluaran — sehingga aset & liabilitas kontrak yang diturunkan darinya ikut memikul ketidakpastian persentase itu.</div>
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <Panel title="Aset Kontrak — Roll-Forward" sub="unbilled receivable · PSAK 72">
                  <div style={{ display: 'grid', gap: 7 }}>
                    <RowKv label="Saldo awal (1 Jan)" v={'Rp ' + fmt(totAsset * 0.74 / 1e6, 0) + ' jt'} />
                    <RowKv label="+ Pendapatan diakui" v={'Rp ' + fmt(totRecognized * 0.32 / 1e6, 0) + ' jt'} />
                    <RowKv label="− Direklas ke piutang (ditagih)" v={'(Rp ' + fmt(totBilled * 0.28 / 1e6, 0) + ' jt)'} />
                    <div className="divider" />
                    <RowKv label="Saldo akhir aset kontrak" v={'Rp ' + fmt(totAsset / 1e6, 0) + ' jt'} strong />
                  </div>
                </Panel>
                <Panel title="Liabilitas Kontrak — Roll-Forward" sub="deferred revenue · PSAK 72">
                  <div style={{ display: 'grid', gap: 7 }}>
                    <RowKv label="Saldo awal (1 Jan)" v={'Rp ' + fmt(totLiab * 1.4 / 1e6, 0) + ' jt'} />
                    <RowKv label="+ Tagihan dimuka diterima" v={'Rp ' + fmt(totLiab * 0.9 / 1e6, 0) + ' jt'} />
                    <RowKv label="− Diakui sebagai pendapatan" v={'(Rp ' + fmt(totLiab * 1.3 / 1e6, 0) + ' jt)'} />
                    <div className="divider" />
                    <RowKv label="Saldo akhir liabilitas kontrak" v={'Rp ' + fmt(totLiab / 1e6, 0) + ' jt'} strong />
                  </div>
                </Panel>
              </div>
              <Panel noBody>
                <div className="panel-h"><h3>Posisi Kontrak per Engagement</h3><div style={{ flex: 1 }} /><span className="tiny muted">aset kontrak = diakui &gt; ditagih · liabilitas = ditagih &gt; diakui · Rp jt</span></div>
                <table className="dtbl">
                  <thead><tr><th>Engagement</th><th>Klien</th><th className="num">Diakui</th><th className="num">Ditagih</th><th className="num">Aset Kontrak</th><th className="num">Liab. Kontrak</th><th style={{ width: 150 }}>Diakui vs Ditagih</th></tr></thead>
                  <tbody>
                    {sched.filter((r: RevenueRow) => (r.asset || 0) > 0 || (r.liab || 0) > 0).map((r: RevenueRow) => {
                      const recognized = r.recognized || 0;
                      const mx = Math.max(recognized, r.billed) || 1;
                      return (
                        <tr key={r.id}>
                          <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{r.id}</td>
                          <td className="truncate" style={{ maxWidth: 130, fontWeight: 600 }}>{r.client.replace('PT ', '')}</td>
                          <td className="num">{fmt(recognized / 1e6, 0)}</td>
                          <td className="num muted">{fmt(r.billed / 1e6, 0)}</td>
                          <td className="num" style={{ fontWeight: 600, color: r.asset ? 'var(--blue)' : 'var(--ink-4)' }}>{r.asset ? fmt(r.asset / 1e6, 0) : '—'}</td>
                          <td className="num" style={{ fontWeight: 600, color: r.liab ? 'var(--amber)' : 'var(--ink-4)' }}>{r.liab ? fmt(r.liab / 1e6, 0) : '—'}</td>
                          <td>
                            <div style={{ position: 'relative', height: 16 }}>
                              <div style={{ position: 'absolute', top: 2, left: 0, width: '100%', height: 5, borderRadius: 3, background: 'var(--surface-3)' }}><div style={{ width: (recognized / mx * 100) + '%', height: '100%', borderRadius: 3, background: 'var(--green-solid)' }} /></div>
                              <div style={{ position: 'absolute', top: 9, left: 0, width: '100%', height: 5, borderRadius: 3, background: 'var(--surface-3)' }}><div style={{ width: (r.billed / mx * 100) + '%', height: '100%', borderRadius: 3, background: 'var(--blue-solid)' }} /></div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot><tr><td colSpan={2}>TOTAL</td><td className="num">{fmt(totRecognized / 1e6, 0)}</td><td className="num">{fmt(totBilled / 1e6, 0)}</td><td className="num">{fmt(totAsset / 1e6, 0)}</td><td className="num">{fmt(totLiab / 1e6, 0)}</td><td></td></tr></tfoot>
                </table>
                <div className="row gap14 tiny muted" style={{ padding: '8px 12px' }}><span className="row ac gap6"><span style={{ width: 18, height: 5, borderRadius: 3, background: 'var(--green-solid)', display: 'inline-block' }} /> Pendapatan diakui</span><span className="row ac gap6"><span style={{ width: 18, height: 5, borderRadius: 3, background: 'var(--blue-solid)', display: 'inline-block' }} /> Telah ditagih</span>{gaps.length > 0 && <span style={{ color: 'var(--amber)', fontWeight: 600 }}>{gaps.length} perikatan tanpa nilai kontrak tak dapat diposisikan di sini (lihat tab Pengakuan Pendapatan).</span>}</div>
              </Panel>
            </div>
          )}

          {tab === 'dunning' && (
            <table className="dtbl">
              <thead><tr><th>No. Faktur</th><th>Klien</th><th className="num">Outstanding</th><th>Jatuh Tempo</th><th className="num">Umur</th><th>Tingkat Pengingat</th><th></th></tr></thead>
              <tbody>
                {dun.map((d: any) => (
                  <tr key={d.id}>
                    <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{d.id}</td>
                    <td className="truncate" style={{ maxWidth: 170, fontWeight: 600 }}>{d.client.replace('PT ', '')}</td>
                    <td className="num" style={{ fontWeight: 600 }}>{fmt(d.outstanding / 1e6, 0)} jt</td>
                    <td className="mono tiny" style={{ color: d.daysOver > 0 ? 'var(--red)' : 'var(--ink-3)' }}>{new Date(d.due).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</td>
                    <td className="num tiny" style={{ color: d.daysOver > 30 ? 'var(--red)' : d.daysOver > 0 ? 'var(--amber)' : 'var(--ink-3)' }}>{d.daysOver > 0 ? d.daysOver + ' hr' : '—'}</td>
                    <td><Badge kind={(DUN_LEVEL as any)[d.level].k}>{(DUN_LEVEL as any)[d.level].l}</Badge></td>
                    <td className="tiny muted">{d.level > 0 ? 'Dunning otomatis (CoreSys)' : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === 'credit' && (
            <table className="dtbl">
              <thead><tr><th>No. Nota Kredit</th><th>Faktur Terkait</th><th>Klien</th><th>Alasan</th><th>Tanggal</th><th className="num">Nilai</th><th>Status</th></tr></thead>
              <tbody>
                {CN.map((c: any) => (
                  <tr key={c.id}>
                    <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{c.id}</td>
                    <td className="mono tiny muted">{c.inv}</td>
                    <td className="truncate" style={{ maxWidth: 160, fontWeight: 600 }}>{c.client.replace('PT ', '')}</td>
                    <td className="tiny muted">{c.reason}</td>
                    <td className="mono tiny muted">{new Date(c.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</td>
                    <td className="num" style={{ fontWeight: 600, color: 'var(--red)' }}>({fmt(c.amount / 1e6, 0)} jt)</td>
                    <td><Badge kind={c.status === 'Applied' ? 'green' : 'blue'}>{c.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      </div></div>
    </>
  );
}

/* Drill panel: single-engagement recognition schedule */
function RecognitionDrill({ r, onClose }: { r: RevenueRow; onClose: () => void }) {
  const { fmt } = AMS;
  const head = (
    <div style={{ background: 'var(--surface-2)', padding: '15px 18px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 13 }}>{r.client.replace('PT ', '')}</div><div className="tiny muted mono">{r.id} · {r.partner} · {r.measure}</div></div>
      <button aria-label="Tutup" className="top-btn" onClick={onClose}><I.x size={16} /></button>
    </div>
  );
  /* Tanpa nilai kontrak tak ada satu pun angka di panel ini yang punya dasar —
     jadi panelnya berkata begitu alih-alih menggambar kurva dari NaN. */
  if (r.contract == null || r.recognized == null) {
    return (
      <div style={{ minWidth: 0 }}>
        {head}
        <div style={{ padding: 14 }}>
          <div className="tiny" style={{ padding: '9px 11px', background: 'var(--amber-bg)', borderRadius: 4, color: 'var(--amber)', fontWeight: 600, lineHeight: 1.5 }}>
            <I.alert size={12} /> Nilai kontrak perikatan ini belum ditetapkan — kliennya tak ditemukan atau fee-nya belum diisi. Pendapatan diakui, aset & liabilitas kontrak tak dapat dihitung. Telah ditagih: Rp {fmt(r.billed / 1e6, 0)} jt.
          </div>
        </div>
      </div>
    );
  }
  const contract = r.contract, recognized = r.recognized;
  const net = (r.asset || 0) - (r.liab || 0);
  // ILUSTRASI: pemecahan bulanan disintesis linear — tak ada jurnal per bulan.
  const months = ['Okt', 'Nov', 'Des', 'Jan', 'Feb', 'Mar'];
  const cum = months.map((m, i) => {
    const frac = Math.min(r.pct, r.pct * (i + 1) / months.length);
    return { m, recog: Math.round(contract * frac) };
  });
  const waterfall: [string, number, string][] = [
    ['Nilai kontrak', contract, 'var(--ink-3)'],
    ['Diakui s.d. kini', recognized, 'var(--green)'],
    ['Telah ditagih', r.billed, 'var(--blue)'],
  ];
  return (
    <div style={{ minWidth: 0 }}>
      {head}
      <div style={{ padding: 14 }}>
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          <KvBox label="% Dilaporkan" v={(r.pct * 100).toFixed(0) + '%'} accent="var(--green)" />
          <KvBox label="Jam aktual / anggaran" v={r.hrs == null || r.budgetHrs == null ? '—' : fmt(r.hrs) + ' / ' + fmt(r.budgetHrs)} />
          <KvBox label="Aset Kontrak" v={r.asset ? 'Rp ' + fmt(r.asset / 1e6, 0) + ' jt' : '—'} accent="var(--blue)" />
          <KvBox label="Liab. Kontrak" v={r.liab ? 'Rp ' + fmt(r.liab / 1e6, 0) + ' jt' : '—'} accent="var(--amber)" />
        </div>
        <div className="tiny muted upper" style={{ marginBottom: 8 }}>Posisi Pengakuan</div>
        <div style={{ display: 'grid', gap: 7, marginBottom: 14 }}>
          {waterfall.map(([l, v, c]) => (
            <div key={l}>
              <div className="row jb tiny" style={{ marginBottom: 2 }}><span>{l}</span><span className="mono" style={{ fontWeight: 700 }}>{fmt(v / 1e6, 0)} jt</span></div>
              <div style={{ height: 7, borderRadius: 4, background: 'var(--surface-3)' }}><div style={{ width: Math.min(100, contract ? v / contract * 100 : 0) + '%', height: '100%', borderRadius: 4, background: c }} /></div>
            </div>
          ))}
        </div>
        <div className="tiny muted upper" style={{ marginBottom: 8 }}>Kurva Pengakuan (kumulatif) · ilustrasi</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 80, padding: '0 2px 6px', borderBottom: '1px solid var(--line)', marginBottom: 6 }}>
          {cum.map(c => {
            const mx = contract || 1;
            return (
              <div key={c.m} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: 3, height: '100%' }}>
                <div style={{ width: '70%', maxWidth: 22, height: (c.recog / mx * 64) + 'px', background: 'linear-gradient(180deg,#1f9d63,#1f7a4d)', borderRadius: '3px 3px 0 0' }} />
                <span className="tiny muted">{c.m}</span>
              </div>
            );
          })}
        </div>
        <div className="tiny muted" style={{ lineHeight: 1.5 }}>Pemecahan bulanan di atas <b>disintesis linear</b> dari persentase yang dilaporkan — tak ada jurnal pengakuan per bulan yang mendasarinya. Hanya titik akhirnya (diakui s.d. kini) yang setara angka tabel.</div>
        <div className="panel" style={{ marginTop: 10, padding: '9px 11px', background: net > 0 ? 'var(--blue-050)' : net < 0 ? 'var(--amber-bg)' : 'var(--surface-2)', borderColor: 'transparent' }}>
          <div className="tiny" style={{ lineHeight: 1.5 }}>{net > 0
            ? <>Pendapatan diakui <b>melebihi</b> tagihan sebesar Rp {fmt(net / 1e6, 0)} jt — diakui sebagai <b>aset kontrak</b>. Terbitkan faktur termin untuk menagih.</>
            : net < 0
              ? <>Tagihan <b>mendahului</b> penyelesaian sebesar Rp {fmt(-net / 1e6, 0)} jt — dicatat sebagai <b>liabilitas kontrak</b> (pendapatan diterima dimuka).</>
              : <>Tagihan selaras dengan pengakuan pendapatan.</>}</div>
        </div>
      </div>
    </div>
  );
}



/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { FirmRevenue };
