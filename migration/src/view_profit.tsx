import React from 'react';
import { AMS } from './data';
import { useAuditHeavy, useFirm, useNav } from './contexts';
import { I } from './icons';
import { SubBar } from './shell';
import { Avatar, Btn, Panel, Seg, Stat } from './ui';
import { KvBox } from './view_analytical';
import { amsExportXlsx } from './export_xlsx';
import {
  PM_COST_CARD, pmExtraHours, pmPartners, pmRecovery, pmRecoveryTotals, pmRosterOf, pmRows, pmTotals,
  type PMClient, type PMEngagement, type PMPartner, type PMRecoveryRow, type PMRow,
  type PMScheduleRow, type PMTimeEntry, type PMTotals,
} from './profit_model';

/* ============================================================
   Asseris — Partner & Engagement Profitability (Package F)

   Berkas ini TIDAK menghitung apa pun sendiri: seluruh derivasi ada di
   `profit_model.ts` (dan diuji di `profit_isolation.test.ts`). Yang tersisa di
   sini adalah render — termasuk kewajiban merender KEADAAN KOSONG untuk baris
   yang ekonominya tak diketahui, alih-alih menampilkan nol atau meminjam angka
   perikatan lain. Lihat catatan cacat PF1/PF2 di kepala `profit_model.ts`.
   ============================================================ */
const { useState: useStatePRF, useMemo: useMemoPRF } = React;

/** placeholder tunggal untuk "tidak diketahui" — bukan 0, bukan 0% */
const NA = '—';

function Profitability() {
  const { fmt } = AMS;
  const nav = useNav();
  const { activeEngagement } = useFirm() as { activeEngagement?: { id?: string } | null };
  const { timeEntries } = useAuditHeavy(['timeEntries']);
  const [view, setView] = useStatePRF('engagement');
  const [sel, setSel] = useStatePRF(null);

  const A = AMS as unknown as {
    ENGAGEMENTS: PMEngagement[]; CLIENTS: PMClient[];
    SCHEDULE: PMScheduleRow[]; TIME_ENTRIES: PMTimeEntry[];
  };

  /* Jam timesheet yang diisi pengguna masuk ke perikatan AKTIF — `timeEntries`
     memang state ber-scope perikatan, jadi deltanya milik perikatan itu. */
  const rows: PMRow[] = useMemoPRF(() => pmRows({
    engagements: A.ENGAGEMENTS, clients: A.CLIENTS, schedule: A.SCHEDULE,
    rosterOf: pmRosterOf(timeEntries as PMTimeEntry[] | null),
    extraHours: pmExtraHours(
      timeEntries as PMTimeEntry[] | null, A.TIME_ENTRIES,
      (activeEngagement && activeEngagement.id) || null),
  }), [A, timeEntries, activeEngagement]);

  /* Cast di LUAR useMemo: tanpa @types/react, `React.useMemo` sendiri untyped →
     hasilnya `any` dan tipe di dalam callback tak akan sampai ke pemanggil
     (pola sama dengan use_firm_wip.ts). */
  const tot: PMTotals = useMemoPRF(() => pmTotals(rows), [rows]);
  const partners: PMPartner[] = useMemoPRF(() => pmPartners(rows), [rows]);
  const maxPartnerMargin = Math.max(1, ...partners.map((p) => p.margin));

  const marginColor = (p: number | null) => p === null ? 'var(--ink-2)'
    : p >= 45 ? 'var(--green)' : p >= 30 ? 'var(--blue)' : p >= 15 ? 'var(--amber)' : 'var(--red)';
  const selRow = sel ? rows.find((r) => r.id === sel) || null : null;
  const pct = (v: number | null, d = 0) => v === null ? NA : v.toFixed(d) + '%';
  const jt = (v: number | null, d = 0) => v === null ? NA : fmt(v / 1e6, d);
  const M = (v: number | null, d = 1) => v === null ? NA : 'Rp ' + fmt(v / 1e9, d) + ' M';

  const { rp } = AMS;
  const onExport = async () => {
    const engRows: (string | number)[][] = [];
    for (const r of rows) engRows.push([r.id, r.client, r.partner,
      r.fee === null ? NA : rp(r.fee), r.realized === null ? NA : Math.round(r.realized * 100) + '%',
      rp(r.stdCost), r.margin === null ? NA : rp(Math.round(r.margin)), pct(r.marginPct)]);
    const partRows: (string | number)[][] = [];
    for (const p of partners) partRows.push([p.partner, p.count, fmt(p.hours), rp(p.fee),
      rp(Math.round(p.billed)), rp(Math.round(p.margin)), pct(p.marginPct)]);
    await amsExportXlsx({
      kind: 'firm-profitability', scope: 'firm',
      fileName: 'Profitabilitas Firma.xlsx',
      /* nama firma dari SSOT (AMS.FIRM), bukan literal — pola #265 */
      firm: (AMS.FIRM as unknown as { name?: string }).name,
      title: 'Profitabilitas Engagement & Partner',
      meta: [`${tot.counted} dari ${rows.length} engagement masuk total · margin rata-rata `
        + `${pct(tot.avgMarginPct)} · realisasi fee ${pct(tot.avgRealizedPct)}`,
        ...(tot.incomplete.length
          ? [`Dikeluarkan dari total (fee/realisasi tak tercatat): ${tot.incomplete.join(', ')}`] : [])],
      sheets: [
        { name: 'Per Engagement', columns: ['Engagement', 'Klien', 'Partner', 'Fee', 'Realisasi Fee', 'Biaya Standar', 'Margin', 'Margin %'], rows: engRows, colWidths: [14, 26, 18, 18, 13, 18, 18, 10] },
        { name: 'Per Partner', columns: ['Partner', 'Engagement', 'Jam', 'Fee', 'Terealisasi', 'Margin', 'Margin %'], rows: partRows, colWidths: [22, 12, 10, 18, 18, 18, 10] },
      ],
    });
  };

  return (
    <>
      <SubBar moduleId="profitability" right={
        <div className="row gap8 ac">
          <Seg options={[{ value: 'engagement', label: 'Per Engagement' }, { value: 'partner', label: 'Per Partner' }, { value: 'leverage', label: 'Leverage & Recovery' }]} value={view} onChange={setView} />
          <Btn sm onClick={onExport}><I.download size={13} /> Export</Btn>
        </div>
      } />
      <div className="view-scroll"><div className="view-pad">
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={M(tot.billed)} label="Pendapatan Terealisasi" /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={M(tot.margin)} label="Margin Kotor" accent="var(--green)" /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={pct(tot.avgMarginPct)} label="Margin Rata-rata" accent={marginColor(tot.avgMarginPct)} /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={pct(tot.avgRealizedPct)} label="Realisasi Fee" /></div></Panel>
        </div>

        {tot.incomplete.length > 0 && (
          <Panel noBody>
            <div className="row ac gap8" style={{ padding: '9px 14px', background: 'var(--amber-bg)' }}>
              <I.alert size={14} />
              <div className="tiny" style={{ lineHeight: 1.45 }}>
                <b>{tot.incomplete.length} engagement tanpa fee/tarif realisasi tercatat</b> —{' '}
                {tot.incomplete.join(', ')}. Ekonominya tidak diketahui, jadi barisnya ditandai{' '}
                <b>{NA}</b> dan TIDAK ikut dijumlahkan ke KPI di atas. Angka total di halaman ini
                mencakup {tot.counted} dari {rows.length} engagement.
              </div>
            </div>
          </Panel>
        )}

        {view === 'engagement' ? (
          <div className="grid" style={{ gridTemplateColumns: selRow ? '1fr 330px' : '1fr', gap: 12, alignItems: 'start', marginTop: tot.incomplete.length ? 12 : 0 }}>
            <Panel noBody>
              <div className="panel-h"><h3>Profitabilitas per Engagement</h3><div style={{ flex: 1 }} /><span className="tiny muted">fee terealisasi − biaya standar · <b>~</b> = biaya ditaksir dari mix jadwal · klik baris</span></div>
              <table className="dtbl">
                <thead><tr><th>Engagement</th><th>Partner</th><th className="num">Fee</th><th className="num">Realisasi</th><th className="num">Biaya</th><th className="num">Margin</th><th className="num" style={{ width: 110 }}>Margin %</th></tr></thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className={r.id === sel ? 'sel' : ''} onClick={() => setSel(r.id)} style={{ cursor: 'pointer', opacity: r.incomplete ? 0.72 : 1 }}>
                      <td><div style={{ fontWeight: 600, fontSize: 12 }}>{r.client.replace('PT ', '')}</div><div className="mono tiny muted">{r.id}</div></td>
                      <td className="tiny muted truncate" style={{ maxWidth: 90 }}>{r.partner.split(' ')[0]}</td>
                      <td className="num">{jt(r.fee)}</td>
                      <td className="num tiny" style={{ color: r.realized === null ? 'var(--ink-2)' : r.realized >= 0.9 ? 'var(--green)' : 'var(--amber)' }}>{r.realized === null ? NA : Math.round(r.realized * 100) + '%'}</td>
                      <td className="num muted" title={'blended rate dari ' + r.costSource}>{jt(r.stdCost)}{r.costSource !== 'roster perikatan' && <span className="tiny muted" style={{ marginLeft: 3 }}>~</span>}</td>
                      <td className="num" style={{ fontWeight: 600, color: r.margin === null ? 'var(--ink-2)' : r.margin > 0 ? 'var(--ink)' : 'var(--num-neg)' }}>{jt(r.margin)}</td>
                      <td className="num">
                        {r.marginPct === null ? <span className="mono tiny muted">{NA}</span> : (
                          <div className="row ac gap6" style={{ justifyContent: 'flex-end' }}>
                            <div style={{ width: 42, height: 6, borderRadius: 3, background: 'var(--surface-3)' }}><div style={{ width: Math.max(4, Math.min(100, r.marginPct)) + '%', height: '100%', borderRadius: 3, background: marginColor(r.marginPct) }} /></div>
                            <span className="mono tiny" style={{ fontWeight: 700, color: marginColor(r.marginPct), width: 30 }}>{r.marginPct.toFixed(0)}%</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr><td colSpan={2}>TOTAL ({tot.counted}/{rows.length})</td><td className="num">{jt(tot.fee)}</td><td></td><td className="num">{jt(tot.stdCost)}</td><td className="num">{jt(tot.margin)}</td><td className="num">{pct(tot.avgMarginPct)}</td></tr></tfoot>
              </table>
            </Panel>

            {selRow && (
              <Panel noBody>
                <div style={{ background: 'var(--surface-2)', padding: '15px 18px', borderBottom: '1px solid var(--line)' }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{selRow.client}</div>
                  <div className="tiny muted mono">{selRow.id} · {selRow.partner}</div>
                </div>
                <div style={{ padding: 14 }}>
                  <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                    <KvBox label="Fee Kontrak" v={selRow.fee === null ? NA : 'Rp ' + fmt(selRow.fee / 1e6, 0) + ' jt'} />
                    <KvBox label="Realisasi Fee" v={selRow.realized === null ? NA : Math.round(selRow.realized * 100) + '%'} accent={selRow.realized === null ? 'var(--ink-2)' : selRow.realized >= 0.9 ? 'var(--green)' : 'var(--amber)'} />
                    <KvBox label="Effective Rate" v={selRow.effRate === null ? NA : 'Rp ' + fmt(selRow.effRate / 1e3, 0) + 'k/h'} />
                    <KvBox label="Recovery" v={selRow.recovery === null ? NA : selRow.recovery.toFixed(2) + '×'} />
                  </div>
                  <div className="panel" style={{ padding: '8px 10px', background: 'var(--surface-2)', borderColor: 'var(--line)', marginBottom: 12 }}>
                    <div className="tiny muted" style={{ lineHeight: 1.45 }}>Biaya dihitung dari <b>{fmt(selRow.hours)} jam aktual × Rp {fmt(selRow.blendedRate / 1e3, 0)}k/jam</b> pada <b>tarif biaya per grade</b> (FIRMFIN.WIP_COST), blended dari {selRow.costSource}.{selRow.costSource !== 'roster perikatan' && <> Perikatan ini tak punya roster, jadi angkanya <b>taksiran</b> dari mix jadwal mingguan — bukan biaya yang tercatat.</>}</div>
                  </div>
                  {selRow.incomplete ? (
                    <div className="panel" style={{ padding: '9px 11px', background: 'var(--amber-bg)', borderColor: 'transparent' }}>
                      <div className="tiny" style={{ fontWeight: 600, lineHeight: 1.4 }}>
                        {selRow.fee === null ? 'Fee kontrak' : 'Tarif realisasi fee'} engagement ini belum tercatat, sehingga
                        pendapatan terealisasi dan margin TIDAK dapat dihitung. Angka di atas bukan nol — ia tidak diketahui.
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="tiny muted upper" style={{ marginBottom: 8 }}>Dekomposisi Margin</div>
                      <div style={{ display: 'grid', gap: 7 }}>
                        {([['Fee terealisasi', selRow.billed!, 'var(--blue)'], ['(−) Biaya standar tim', -selRow.stdCost, 'var(--red)'], ['Margin kotor', selRow.margin!, 'var(--green)']] as [string, number, string][]).map(([l, v, c], i) => (
                          <div key={l}>
                            <div className="row jb tiny" style={{ marginBottom: 2 }}><span style={{ fontWeight: i === 2 ? 700 : 400 }}>{l}</span><span className="mono" style={{ fontWeight: 700, color: v < 0 ? 'var(--num-neg)' : 'var(--ink)' }}>{fmt(v / 1e6, 0)} jt</span></div>
                            <div style={{ height: 6, borderRadius: 3, background: 'var(--surface-3)' }}><div style={{ width: Math.min(100, Math.abs(v) / selRow.billed! * 100) + '%', height: '100%', borderRadius: 3, background: c }} /></div>
                          </div>
                        ))}
                      </div>
                      <div className="panel" style={{ marginTop: 12, padding: '9px 11px', background: (selRow.marginPct || 0) >= 30 ? 'var(--green-bg)' : 'var(--amber-bg)', borderColor: 'transparent' }}>
                        <div className="tiny" style={{ fontWeight: 600, lineHeight: 1.4 }}>{(selRow.marginPct || 0) >= 30 ? 'Margin sehat. Engagement berkontribusi positif terhadap laba firma.' : 'Margin di bawah target 30% — tinjau scope, fee, atau efisiensi tim.'}</div>
                      </div>
                    </>
                  )}
                  <Btn sm style={{ width: '100%', marginTop: 10 }} onClick={() => nav('time')}><I.clock size={13} /> Lihat Time & Budget</Btn>
                </div>
              </Panel>
            )}
          </div>
        ) : view === 'partner' ? (
          <Panel noBody>
            <div className="panel-h"><h3>Profitabilitas per Partner</h3><div style={{ flex: 1 }} /><span className="tiny muted">kontribusi margin ke firma</span></div>
            <div style={{ padding: '8px 14px 14px' }}>
              {partners.length === 0 && <div className="tiny muted" style={{ padding: '18px 0' }}>Belum ada engagement dengan fee & tarif realisasi tercatat — tidak ada kontribusi margin yang dapat dihitung.</div>}
              {partners.map((p) => (
                <div key={p.partner} style={{ padding: '11px 0', borderBottom: '1px solid var(--line-soft)' }}>
                  <div className="row ac gap10">
                    <Avatar name={p.partner} size={34} />
                    <div style={{ width: 150, flex: '0 0 150px' }}>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{p.partner}</div>
                      <div className="tiny muted">{p.count} engagement · {fmt(p.hours)} jam</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="row jb tiny" style={{ marginBottom: 3 }}><span className="muted">Margin kontribusi</span><span className="mono" style={{ fontWeight: 700 }}>Rp {fmt(p.margin / 1e6, 0)} jt · {pct(p.marginPct)}</span></div>
                      <div style={{ height: 12, borderRadius: 6, background: 'var(--surface-3)' }}><div style={{ width: (p.margin / maxPartnerMargin * 100) + '%', height: '100%', borderRadius: 6, background: marginColor(p.marginPct) }} /></div>
                    </div>
                    <div style={{ width: 90, flex: '0 0 90px', textAlign: 'right' }}>
                      <div className="mono" style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)' }}>Rp {fmt(p.fee / 1e9, 1)}M</div>
                      <div className="tiny muted">portofolio fee</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        ) : (
          <LeverageRecovery rows={rows} fmt={fmt} marginColor={marginColor} />
        )}
      </div></div>
    </>
  );
}

/* Leverage (staff pyramid) + WIP recovery / write-down analysis */
interface LevProps {
  rows: PMRow[];
  fmt: (v: number, d?: number) => string;
  marginColor: (p: number | null) => string;
}
const GRADE_C: Readonly<Record<string, string>> = { Partner: '#013a52', Manager: '#005085', Senior: '#0a6b8a', Junior: '#5b9bb5' };

function LeverageRecovery({ rows, fmt, marginColor }: LevProps) {
  const sched = (AMS as unknown as { SCHEDULE: PMScheduleRow[] }).SCHEDULE || [];
  // hours by grade across firm
  const byGrade: Record<string, number> = { Partner: 0, Manager: 0, Senior: 0, Junior: 0 };
  sched.forEach((m) => { const g = PM_COST_CARD[m.role] ? m.role : 'Senior'; m.alloc.forEach((a) => { byGrade[g] = (byGrade[g] || 0) + a.hrs; }); });
  const totalH = Object.values(byGrade).reduce((s, h) => s + h, 0) || 1;
  const pyramid = ['Partner', 'Manager', 'Senior', 'Junior'].map(g => ({ g, h: byGrade[g] || 0, pct: (byGrade[g] || 0) / totalH }));
  const leverage = (byGrade.Senior + byGrade.Junior) / Math.max(1, byGrade.Partner + byGrade.Manager);

  // recovery / write-down per engagement: WIP charge-out vs realized fee
  const rec: PMRecoveryRow[] = pmRecovery(rows);
  const t = pmRecoveryTotals(rec);
  const NAn = (v: number | null, d = 0) => v === null ? NA : fmt(v / 1e6, d);
  const NAp = (v: number | null) => v === null ? NA : (v * 100).toFixed(0) + '%';
  /* write-down positif → "(x)"; write-UP → "+x". Dulu tanda kurung dipaku di
     baris TOTAL, sehingga saat firma secara agregat write-UP layar menulis
     "((2.446))" dengan warna merah. */
  const wd = (v: number | null) => v === null ? NA
    : v > 0 ? '(' + fmt(v / 1e6, 0) + ')' : '+' + fmt(-v / 1e6, 0);
  const wdColor = (v: number | null) => v === null ? 'var(--ink-2)' : v > 0 ? 'var(--red)' : 'var(--green)';

  return (
    <div className="grid split" style={{ gridTemplateColumns: '360px 1fr', gap: 12, alignItems: 'start' }}>
      <div style={{ display: 'grid', gap: 12 }}>
        <Panel title="Piramida Leverage Tim" sub={'rasio ' + leverage.toFixed(1) + ' : 1 (staf : pemimpin)'}>
          <div style={{ display: 'grid', gap: 8 }}>
            {pyramid.map(p => (
              <div key={p.g}>
                <div className="row jb tiny" style={{ marginBottom: 3 }}><span style={{ fontWeight: 600 }}>{p.g}</span><span className="mono" style={{ fontWeight: 700 }}>{fmt(p.h)} jam · {(p.pct * 100).toFixed(0)}%</span></div>
                <div style={{ height: 14, borderRadius: 4, background: 'var(--surface-3)' }}><div style={{ width: (p.pct * 100) + '%', height: '100%', borderRadius: 4, background: GRADE_C[p.g] }} /></div>
              </div>
            ))}
          </div>
          <div className="panel" style={{ marginTop: 12, padding: '9px 11px', background: leverage >= 2.5 ? 'var(--green-bg)' : 'var(--amber-bg)', borderColor: 'transparent' }}>
            <div className="tiny" style={{ lineHeight: 1.5 }}>{leverage >= 2.5 ? 'Leverage sehat — porsi pekerjaan terdelegasi ke grade junior, menjaga efisiensi biaya & margin.' : 'Leverage rendah — terlalu banyak jam partner/manager. Delegasikan lebih banyak ke senior/junior untuk menaikkan margin.'}</div>
          </div>
        </Panel>
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <KvBox label="WIP Charge-out" v={'Rp ' + fmt(t.wip / 1e9, 1) + ' M'} />
          <KvBox label="Recovery Rate" v={NAp(t.recoveryPct)} accent={(t.recoveryPct || 0) >= 0.9 ? 'var(--green)' : 'var(--amber)'} />
          <KvBox label="Realisasi Fee" v={'Rp ' + fmt(t.billed / 1e9, 1) + ' M'} />
          <KvBox label="Write-down" v={'Rp ' + fmt(t.writedown / 1e6, 0) + ' jt'} accent="var(--red)" />
        </div>
      </div>

      <Panel noBody>
        <div className="panel-h"><h3>WIP Recovery & Write-down per Engagement</h3><div style={{ flex: 1 }} /><span className="tiny muted">charge-out vs fee terealisasi · Rp jt · <b>~</b> = ditaksir dari mix jadwal</span></div>
        <table className="dtbl">
          <thead><tr><th>Engagement</th><th>Partner</th><th className="num">Jam</th><th className="num">WIP Charge-out</th><th className="num">Fee Realisasi</th><th className="num">Write-up/(down)</th><th className="num" style={{ width: 110 }}>Recovery</th></tr></thead>
          <tbody>
            {rec.map((r) => (
              <tr key={r.id} style={{ opacity: r.incomplete ? 0.72 : 1 }}>
                <td><div style={{ fontWeight: 600, fontSize: 12 }}>{r.client.replace('PT ', '')}</div><div className="mono tiny muted">{r.id}</div></td>
                <td className="tiny muted truncate" style={{ maxWidth: 90 }}>{r.partner.split(' ')[0]}</td>
                <td className="num">{fmt(r.hours)}</td>
                <td className="num muted" title={'charge-out dari ' + r.costSource}>{fmt(r.wipCharge / 1e6, 0)}{r.costSource !== 'roster perikatan' && <span className="tiny muted" style={{ marginLeft: 3 }}>~</span>}</td>
                <td className="num">{NAn(r.billed)}</td>
                <td className="num" style={{ fontWeight: 600, color: wdColor(r.writedown) }}>{wd(r.writedown)}</td>
                <td className="num">{r.recoveryPct === null ? <span className="mono tiny muted">{NA}</span> : (
                  <div className="row ac gap6" style={{ justifyContent: 'flex-end' }}><div style={{ width: 42, height: 6, borderRadius: 3, background: 'var(--surface-3)' }}><div style={{ width: Math.min(100, r.recoveryPct * 100) + '%', height: '100%', borderRadius: 3, background: marginColor(r.recoveryPct * 100 - 50) }} /></div><span className="mono tiny" style={{ fontWeight: 700, width: 32 }}>{(r.recoveryPct * 100).toFixed(0)}%</span></div>
                )}</td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr><td colSpan={3}>TOTAL ({rec.length - t.incomplete.length}/{rec.length})</td><td className="num">{fmt(t.wip / 1e6, 0)}</td><td className="num">{fmt(t.billed / 1e6, 0)}</td><td className="num" style={{ color: wdColor(t.writedown) }}>{wd(t.writedown)}</td><td className="num">{NAp(t.recoveryPct)}</td></tr></tfoot>
        </table>
        <div className="tiny muted" style={{ padding: '8px 12px', lineHeight: 1.5 }}>WIP charge-out = jam × tarif charge-out per grade (FIRMFIN.WIP_BILL), atau nilai standar roster perikatan bila ada. Selisih terhadap fee terealisasi adalah <b>write-up</b> (fee &gt; standar) atau <b>write-down</b> (penghapusan WIP tak tertagih). Recovery di atas 100% berarti fee melampaui nilai standar jam yang TERCATAT — pada baris bertanda <b>~</b> jamnya sendiri taksiran, jadi bacalah sebagai indikasi bahwa pencatatan jamnya kurang, bukan sebagai laba. Recovery rata-rata firma <b>{NAp(t.recoveryPct)}</b>{t.incomplete.length > 0 && <> — dihitung dari {rec.length - t.incomplete.length} dari {rec.length} engagement; sisanya tak punya fee/tarif realisasi tercatat</>}.</div>
      </Panel>
    </div>
  );
}


export { Profitability };
