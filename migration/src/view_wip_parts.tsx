import React from 'react';
import { AMS } from './data';
import { WIP_WRITEOFF_APPROVAL_MIN } from './data_firmfin';
import { I } from './icons';
import { Avatar, Badge, Btn, Donut, Panel, Seg } from './ui';
import { KvBox } from './view_analytical';
import { RowKv } from './view_calc';
import { SliderRow } from './view_materiality';
import type { WipModel, WipRow } from './use_firm_wip';

/* ============================================================
   Asseris — bagian modul WIP (Valuasi & Realisasi).
   Dipecah dari `view_wip.tsx` agar berkas utama tetap terbaca
   (CLAUDE.md §8). SEMUA angka di sini datang jadi lewat prop dari
   `FIRMFIN.wip()` — tak ada satu pun perhitungan di berkas ini
   selain agregasi per-partner (tab Realisasi) yang murni penjumlahan.
   ============================================================ */
const { useMemo: useMemoWipP } = React;

type Fmt = (v: number, d?: number) => string;
type Nav = (id: string, opts?: { from?: string; tab?: string; sel?: string | null }) => void;
type IconComp = (props: { size?: number }) => JSX.Element;

export const wipRealColor = (v: number): string => v >= 1 ? 'var(--green)' : v >= 0.92 ? 'var(--amber)' : 'var(--red)';
export const wipMarginColor = (v: number): string => v >= 0.38 ? 'var(--green)' : v >= 0.30 ? 'var(--amber)' : 'var(--red)';

/* ---------------- Tab 1 · Valuasi Perikatan — sub-buku register ---------------- */
export function WipRegisterTable(
  { W, jt, pc, sel, onSelect }:
  { W: WipModel; jt: Fmt; pc: Fmt; sel: string | null; onSelect: (id: string | null) => void },
) {
  const { fmt } = AMS as unknown as { fmt: Fmt };
  return (
    <Panel noBody>
      <div className="panel-h"><h3>Sub-buku Valuasi WIP per Perikatan</h3><div style={{ flex: 1 }} /><span className="tiny muted">tarif standar Rp {fmt(W.stdRate)}/jam · nilai dalam juta Rp · klik baris</span></div>
      <table className="dtbl">
        <thead><tr>
          <th>Perikatan</th><th>Partner</th><th className="num">Nilai Standar</th><th className="num">Penyesuaian</th><th className="num">Recoverable</th><th className="num">Difakturkan</th><th className="num">WIP</th><th>Umur</th><th className="num">Realisasi</th><th className="num">Margin</th>
        </tr></thead>
        <tbody>
          {W.registerAll.map((r) => {
            const adj = r.writeUp - r.writeDown;
            return (
              <tr key={r.id} className={r.id === sel ? 'sel' : ''} onClick={() => onSelect(r.id === sel ? null : r.id)} style={{ cursor: 'pointer' }}>
                <td>
                  <div style={{ fontWeight: 600 }} className="truncate">{r.clientShort}</div>
                  <div className="tiny muted mono">{r.id}{r.manualWriteDown > 0 && <span title="Termasuk write-down manual" style={{ color: 'var(--amber)', marginLeft: 5 }}>· manual</span>}</div>
                </td>
                <td className="tiny muted">{r.partner.split(' ')[0]}</td>
                <td className="num">{jt(r.std)}</td>
                <td className="num" style={{ color: adj > 0 ? 'var(--green)' : adj < 0 ? 'var(--red)' : 'var(--ink-4)' }}>{adj === 0 ? '—' : (adj > 0 ? '+' : '−') + jt(Math.abs(adj))}</td>
                <td className="num" style={{ fontWeight: 600 }}>{jt(r.recoverable)}</td>
                <td className="num muted">{r.billed ? jt(r.billed) : '—'}</td>
                <td className="num" style={{ fontWeight: 700, color: r.unbilled > 0 ? 'var(--blue)' : 'var(--teal)' }}>{r.unbilled < 0 ? '(' + jt(-r.unbilled) + ')' : jt(r.unbilled)}</td>
                <td><span className="tiny" style={{ fontWeight: 600, color: r.atRisk ? 'var(--red)' : r.age > 60 ? 'var(--amber)' : 'var(--ink-3)' }}>{r.age}h</span></td>
                <td className="num" style={{ fontWeight: 700, color: wipRealColor(r.realization) }}>{pc(r.realization)}</td>
                <td className="num" style={{ color: wipMarginColor(r.margin) }}>{pc(r.margin)}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot><tr>
          <td colSpan={2}>TOTAL · {W.registerAll.length} perikatan</td>
          <td className="num">{jt(W.totStd)}</td>
          <td className="num">{(W.totWriteUp - W.totWriteDown) >= 0 ? '+' : '−'}{jt(Math.abs(W.totWriteUp - W.totWriteDown))}</td>
          <td className="num">{jt(W.totRecoverable)}</td>
          <td className="num">{jt(W.totBilled)}</td>
          <td className="num">{jt(W.unbilledTotal)}</td>
          <td></td>
          <td className="num">{pc(W.avgRealization)}</td>
          <td className="num">{pc(W.avgMargin)}</td>
        </tr></tfoot>
      </table>
      {W.deferredIncome > 0 && (
        <div className="tiny muted" style={{ padding: '8px 12px', lineHeight: 1.5 }}>
          Termasuk posisi <b>over-billed</b> Rp {jt(W.deferredIncome)} jt (penagihan di muka) — disajikan terpisah sebagai <b>pendapatan diterima di muka</b> (liabilitas), bukan pengurang aset WIP.
        </div>
      )}
    </Panel>
  );
}

/* ---------------- Panel detail per-perikatan (waterfall + aksi write-down) ----------------
   Satu komponen menggantikan dua salinan (`WipDetail` di view_wip_firm + `WipValDetail`
   di view_firmfinance) yang dulu menampilkan rekonsiliasi sama dengan label berbeda. */
export function WipDetailPanel(
  { r, jt, pc, onClose, nav, canEdit, wdAmt, setWdAmt, onWriteDown, onReset }:
  {
    r: WipRow; jt: Fmt; pc: Fmt; onClose: () => void; nav: Nav; canEdit: boolean;
    wdAmt: number; setWdAmt: (v: number) => void; onWriteDown: () => void; onReset: () => void;
  },
) {
  const { fmt } = AMS as unknown as { fmt: Fmt };
  const Line = (
    { label, v, op, strong, accent }:
    { label: string; v: number; op?: string; strong?: boolean; accent?: string },
  ) => (
    <div className="row jb ac" style={{ padding: '7px 0', borderBottom: '1px solid var(--line-soft)' }}>
      <span className="tiny" style={{ fontWeight: strong ? 700 : 500, color: strong ? 'var(--ink)' : 'var(--ink-2)' }}>{op && <span className="mono" style={{ color: 'var(--ink-4)', marginRight: 5 }}>{op}</span>}{label}</span>
      <span className="mono" style={{ fontWeight: strong ? 800 : 600, fontSize: 12, color: accent || 'var(--ink)' }}>{(v < 0 ? '(' : '') + 'Rp ' + jt(Math.abs(v)) + ' jt' + (v < 0 ? ')' : '')}</span>
    </div>
  );
  return (
    <Panel noBody style={{ position: 'sticky', top: 0 }}>
      <div style={{ background: 'linear-gradient(125deg,#013a52,#005085)', color: '#fff', padding: '13px 15px' }}>
        <div className="row jb ac" style={{ marginBottom: 6 }}><span className="mono tiny" style={{ color: '#bcd6e4', fontWeight: 700 }}>{r.id}</span><button className="top-btn" onClick={onClose} aria-label="Tutup panel detail" title="Tutup"><I.x size={17} /></button></div>
        <div style={{ fontSize: 15, fontWeight: 700 }}>{r.clientShort}</div>
        <div className="tiny" style={{ color: '#bcd6e4' }}>{r.partner} · {r.type}</div>
      </div>
      <div style={{ padding: 14 }}>
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 9, marginBottom: 13 }}>
          <KvBox label="Realisasi" v={pc(r.realization)} accent={wipRealColor(r.realization)} />
          <KvBox label="Margin" v={pc(r.margin)} accent={wipMarginColor(r.margin)} />
        </div>
        <div className="tiny muted upper" style={{ marginBottom: 4 }}>Rekonsiliasi Valuasi WIP</div>
        <div style={{ marginBottom: 13 }}>
          <Line label={'Nilai standar (' + r.hours + ' jam)'} v={r.std} strong />
          {r.writeUp > 0 && <Line label="Write-up (premium)" v={r.writeUp} op="+" accent="var(--green)" />}
          {r.seedWriteDown > 0 && <Line label="Write-down sub-buku" v={-r.seedWriteDown} op="−" accent="var(--red)" />}
          {r.manualWriteDown > 0 && <Line label="Write-down manual" v={-r.manualWriteDown} op="−" accent="var(--red)" />}
          <Line label="Nilai dapat dipulihkan" v={r.recoverable} op="=" strong accent="var(--navy)" />
          <Line label="Telah difakturkan" v={-r.billed} op="−" />
          <Line label="Saldo WIP belum ditagih" v={r.unbilled} op="=" strong accent={r.unbilled > 0 ? 'var(--blue)' : 'var(--teal)'} />
        </div>
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 9, marginBottom: 12 }}>
          <KvBox label={'Umur · ' + r.bucket} v={r.age + ' hari'} accent={r.atRisk ? 'var(--red)' : r.age > 60 ? 'var(--amber)' : 'var(--ink-2)'} />
          <KvBox label={'Penyisihan (' + pc(r.provRate, 0) + ')'} v={'Rp ' + jt(Math.round(Math.max(0, r.unbilled) * r.provRate)) + ' jt'} accent="var(--red)" />
        </div>
        {r.unbilled < 0 && <div className="panel" style={{ padding: '8px 10px', background: 'var(--teal-bg)', borderColor: 'transparent', marginBottom: 12 }}><div className="tiny" style={{ fontWeight: 600 }}>Posisi over-billed — diakui sebagai pendapatan diterima di muka (liabilitas), bukan aset WIP.</div></div>}
        <div className="row gap8" style={{ flexWrap: 'wrap' }}>
          {r.unbilled > 0 && <Btn sm variant="primary" onClick={() => nav('billing', { from: 'wip' })}><I.receipt size={13} /> Terbitkan Faktur</Btn>}
          <Btn sm onClick={() => nav('time', { from: 'wip' })}><I.clock size={13} /> Jam & Anggaran</Btn>
          {canEdit && (
            <div className="row gap6 ac" style={{ border: '1px solid var(--line)', borderRadius: 6, padding: '2px 3px 2px 8px', background: 'var(--surface-2)' }}>
              <span className="tiny muted">Rp</span>
              <input className="input mono" type="number" min={0} step={1000000} value={wdAmt}
                onChange={(e: { target: { value: string } }) => setWdAmt(Math.max(0, +e.target.value))}
                style={{ width: 92, height: 22, fontSize: 12, textAlign: 'right', padding: '0 4px', border: 'none', background: 'transparent' }}
                aria-label="Nilai write-down (Rp)" />
              <Btn sm disabled={!(wdAmt > 0)} onClick={onWriteDown}><I.trend size={13} style={{ transform: 'scaleY(-1)' }} /> Write-down</Btn>
            </div>
          )}
          {canEdit && r.manualWriteDown > 0 && <Btn sm onClick={onReset}>Reset manual</Btn>}
          {!canEdit && <span className="tiny muted" style={{ width: '100%' }} title="Write-down dibatasi peran Finance Firma / Partner (SoD finansial)"><I.lock size={11} /> Write-down dikunci (peran Finance/Partner)</span>}
        </div>
        {canEdit && (
          <div className="tiny muted" style={{ marginTop: 8, lineHeight: 1.5 }}>
            Write-down manual kumulatif ≥ Rp {fmt(WIP_WRITEOFF_APPROVAL_MIN / 1e6, 0)} jt masuk antrean <b>Approvals</b> (Audit Manager → Managing Partner).
          </div>
        )}
      </div>
    </Panel>
  );
}

/* ---------------- Tab 2 · Realisasi & Margin ---------------- */
interface PartnerAgg { partner: string; n: number; std: number; recoverable: number; billed: number; wip: number; cost: number; realization: number; margin: number }

/** Agregasi per-partner atas sub-buku yang SAMA (bukan sumber angka kedua). */
export function wipByPartner(rows: WipRow[]): PartnerAgg[] {
  const m: Record<string, Omit<PartnerAgg, 'realization' | 'margin'>> = {};
  rows.forEach((r) => {
    const p = r.partner || '—';
    m[p] = m[p] || { partner: p, n: 0, std: 0, recoverable: 0, billed: 0, wip: 0, cost: 0 };
    m[p].n += 1; m[p].std += r.std; m[p].recoverable += r.recoverable;
    m[p].billed += r.billed; m[p].wip += Math.max(0, r.unbilled); m[p].cost += r.cost;
  });
  return Object.keys(m).map((k) => {
    const x = m[k];
    return {
      ...x,
      realization: x.std ? x.recoverable / x.std : 0,
      margin: x.recoverable ? (x.recoverable - x.cost) / x.recoverable : 0,
    };
  });
}

export function WipRealisasiTab(
  { W, jt, pc, view, setView, onOpenRow }:
  {
    W: WipModel; jt: Fmt; pc: Fmt; view: string; setView: (v: string) => void;
    onOpenRow: (id: string) => void;
  },
) {
  const { fmt } = AMS as unknown as { fmt: Fmt };
  /* cast di luar useMemo — hook React untyped di repo ini (tak ada @types/react) */
  const partners = useMemoWipP(() => wipByPartner(W.registerAll), [W.registerAll]) as PartnerAgg[];

  return (
    <div className="grid" style={{ gap: 12 }}>
      <div className="row jb ac">
        <span className="tiny muted">Sudut ekonomi atas sub-buku yang sama — nilai dalam juta Rp</span>
        <Seg options={['Perikatan', 'Partner']} value={view} onChange={setView} />
      </div>

      {view === 'Perikatan' ? (
        <Panel noBody>
          <div className="panel-h"><h3>Realisasi & Margin per Perikatan</h3><div style={{ flex: 1 }} /><span className="tiny muted">klik baris → buka valuasinya</span></div>
          <table className="dtbl">
            <thead><tr><th>Perikatan</th><th>Partner</th><th className="num">Nilai Standar</th><th className="num">Difakturkan</th><th className="num">Saldo WIP</th><th className="num">Write-down</th><th className="num">Realisasi</th><th className="num">Margin</th></tr></thead>
            <tbody>
              {W.registerAll.map((r) => (
                <tr key={r.id} onClick={() => onOpenRow(r.id)} style={{ cursor: 'pointer' }}>
                  <td><div style={{ fontWeight: 600 }} className="truncate">{r.clientShort}</div><div className="tiny muted mono">{r.id}</div></td>
                  <td className="tiny muted">{(r.partner || '—').split(' ')[0]}</td>
                  <td className="num">{jt(r.std)}</td>
                  <td className="num muted">{r.billed ? jt(r.billed) : '—'}</td>
                  <td className="num" style={{ fontWeight: 700, color: r.unbilled > 0 ? 'var(--blue)' : 'var(--ink-4)' }}>{jt(r.unbilled)}</td>
                  <td className="num" style={{ color: r.writeDown ? 'var(--red)' : 'var(--ink-4)' }}>{r.writeDown ? '(' + jt(r.writeDown) + ')' : '—'}</td>
                  <td className="num" style={{ fontWeight: 700, color: wipRealColor(r.realization) }}>{pc(r.realization)}</td>
                  <td className="num" style={{ color: wipMarginColor(r.margin) }}>{pc(r.margin)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr>
              <td colSpan={2}>TOTAL</td>
              <td className="num">{jt(W.totStd)}</td>
              <td className="num">{jt(W.totBilled)}</td>
              <td className="num">{jt(W.unbilledTotal)}</td>
              <td className="num">({jt(W.totWriteDown)})</td>
              <td className="num">{pc(W.avgRealization)}</td>
              <td className="num">{pc(W.avgMargin)}</td>
            </tr></tfoot>
          </table>
        </Panel>
      ) : (
        <Panel noBody>
          <div className="panel-h"><h3>Realisasi per Partner</h3><div style={{ flex: 1 }} /><span className="tiny muted">agregasi sub-buku yang sama</span></div>
          <table className="dtbl">
            <thead><tr><th>Partner</th><th className="num">Perikatan</th><th className="num">Nilai Standar</th><th className="num">Saldo WIP</th><th className="num">Realisasi</th><th className="num">Margin</th></tr></thead>
            <tbody>
              {partners.map((p) => (
                <tr key={p.partner}>
                  <td className="row ac gap8" style={{ height: 'var(--row-h)' }}><Avatar name={p.partner} size={22} /><span style={{ fontWeight: 600 }}>{p.partner}</span></td>
                  <td className="num muted">{p.n}</td>
                  <td className="num">{jt(p.std)}</td>
                  <td className="num" style={{ fontWeight: 700, color: 'var(--blue)' }}>{jt(p.wip)}</td>
                  <td className="num" style={{ fontWeight: 700, color: wipRealColor(p.realization) }}>{pc(p.realization)}</td>
                  <td className="num" style={{ color: wipMarginColor(p.margin) }}>{pc(p.margin)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}

      <Panel title="Realisasi vs Target" sub="target firma 95%">
        <div className="row ac" style={{ gap: 14 }}>
          <Donut size={104} thickness={15} segments={[
            { value: Math.min(W.avgRealization * 100, 100), color: wipRealColor(W.avgRealization) },
            { value: Math.max(0, 100 - W.avgRealization * 100), color: 'var(--surface-3)' },
          ]} center={<><div style={{ fontSize: 19, fontWeight: 800, color: wipRealColor(W.avgRealization) }}>{pc(W.avgRealization)}</div><div className="tiny muted">realisasi</div></>} />
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
            <KvBox label="Recoverable kotor" v={'Rp ' + fmt(W.totRecoverable / 1e9, 2) + ' M'} accent="var(--green)" />
            <KvBox label="Gap ke target 95%" v={(W.avgRealization >= 0.95 ? '+' : '') + fmt((W.avgRealization - 0.95) * 100, 1) + ' pts'} accent={W.avgRealization >= 0.95 ? 'var(--green)' : 'var(--red)'} />
            <KvBox label="Write-down manual" v={'Rp ' + jt(W.totManualWriteDown) + ' jt'} accent={W.totManualWriteDown > 0 ? 'var(--amber)' : 'var(--ink-3)'} />
          </div>
        </div>
      </Panel>
    </div>
  );
}

/* ---------------- Tab 3 · Pemulihan & Penyisihan ---------------- */
export function WipPemulihanTab(
  { W, jt, pc, provFactor, setProvFactor }:
  { W: WipModel; jt: Fmt; pc: Fmt; provFactor: number; setProvFactor: (v: number) => void },
) {
  const { fmt } = AMS as unknown as { fmt: Fmt };
  const agingMax = Math.max(...W.aging.map((a) => a.value), 1);
  const presets = [{ k: 'Dasar', f: 1 }, { k: 'Konservatif', f: 1.5 }, { k: 'Stress', f: 2 }];
  const activePreset = (presets.find(p => Math.abs(p.f - provFactor) < 0.001) || { k: 'Custom' }).k;
  return (
    <div className="grid" style={{ gridTemplateColumns: '1.5fr 1fr', gap: 12, alignItems: 'start' }}>
      <Panel noBody>
        <div className="panel-h"><h3>Matriks Penyisihan WIP berbasis Umur</h3><div style={{ flex: 1 }} /><span className="tiny muted">pola ECL · faktor kebijakan {fmt(provFactor, 2)}×</span></div>
        <table className="dtbl">
          <thead><tr><th>Umur belum tertagih</th><th className="num">Saldo WIP</th><th className="num">Perikatan</th><th style={{ width: 150 }}>Komposisi</th><th className="num">Tarif</th><th className="num">Penyisihan</th></tr></thead>
          <tbody>
            {W.aging.map((a) => (
              <tr key={a.key}>
                <td style={{ fontWeight: 600, color: a.key === 'b90p' ? 'var(--red)' : a.key === 'b90' ? 'var(--amber)' : 'var(--ink)' }}>{a.bucket}</td>
                <td className="num" style={{ fontWeight: 600 }}>{jt(a.value)}</td>
                <td className="num muted">{a.n || '—'}</td>
                <td><div style={{ height: 8, borderRadius: 5, background: 'var(--surface-3)', overflow: 'hidden' }}><span style={{ display: 'block', height: '100%', width: (a.value / agingMax * 100) + '%', background: a.key === 'b90p' ? 'var(--red)' : a.key === 'b90' ? 'var(--amber)' : 'var(--blue)' }} /></div></td>
                <td className="num tiny mono">{pc(a.rate, 1)}</td>
                <td className="num" style={{ fontWeight: 600, color: 'var(--red)' }}>{a.provision ? '(' + jt(a.provision) + ')' : '—'}</td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr><td>TOTAL</td><td className="num">{jt(W.unbilledTotal)}</td><td colSpan={3} className="num">Penyisihan teragregasi</td><td className="num" style={{ color: 'var(--red)' }}>({jt(W.provisionTotal)})</td></tr></tfoot>
        </table>
        <div className="panel" style={{ margin: '0 12px 12px', padding: '9px 11px', background: 'var(--amber-bg)', borderColor: 'transparent' }}>
          <div className="tiny" style={{ fontWeight: 600, lineHeight: 1.5 }}><I.clock size={11} /> Rp {jt(W.atRiskWIP)} jt WIP berusia &gt; 90 hari — penyisihan {pc(W.aging[3].rate, 0)}. Prioritaskan penerbitan faktur atau write-down untuk menjaga arus kas.</div>
        </div>
      </Panel>

      <Panel title="Kebijakan Penyisihan" sub="stres tarif matriks">
        <div className="row gap8 ac" style={{ marginBottom: 12 }}><Seg options={presets.map(p => p.k)} value={activePreset === 'Custom' ? presets[0].k : activePreset} onChange={(k: string) => setProvFactor((presets.find(p => p.k === k) || { f: 1 }).f)} /></div>
        <SliderRow label="Faktor kebijakan penyisihan" value={provFactor} min={0.5} max={2.5} step={0.1} suffix="×" onChange={setProvFactor} hint="Mengalikan tarif tiap bucket umur" />
        <div className="divider" />
        <div style={{ display: 'grid', gap: 7 }}>
          <RowKv label="WIP Bruto belum ditagih" v={'Rp ' + jt(W.unbilledTotal) + ' jt'} />
          <RowKv label={'Penyisihan (' + pc(W.provisionPct, 1) + ')'} v={'(Rp ' + jt(W.provisionTotal) + ' jt)'} />
          <RowKv label="Nilai dapat dipulihkan neto" v={'Rp ' + jt(W.netRecoverable) + ' jt'} strong />
        </div>
      </Panel>
    </div>
  );
}

/* ---------------- Tab 4 · Mutasi & Sumber Kebenaran ---------------- */
export function WipSumberTab({ W, jt, nav }: { W: WipModel; jt: Fmt; nav: Nav }) {
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }}>
      <Panel title="Mutasi WIP Belum Ditagih (roll-forward)" sub="sub-buku perikatan material">
        <div>
          {W.movement.map((m) => (
            <div key={m.k} className="row jb ac" style={{ padding: '8px 0', borderBottom: '1px solid var(--line-soft)' }}>
              <span style={{ fontSize: 12, fontWeight: m.strong ? 700 : 500, color: m.strong ? 'var(--ink)' : 'var(--ink-2)' }}>{m.op && <span className="mono" style={{ color: 'var(--ink-4)', marginRight: 6 }}>{m.op}</span>}{m.label}</span>
              <span className="mono" style={{ fontWeight: m.strong ? 800 : 600, fontSize: 13, color: m.accent === 'green' ? 'var(--green)' : m.accent === 'red' ? 'var(--red)' : m.strong ? 'var(--navy)' : 'var(--ink)' }}>{(m.value < 0 ? '(' : '') + 'Rp ' + jt(Math.abs(m.value)) + ' jt' + (m.value < 0 ? ')' : '')}</span>
            </div>
          ))}
        </div>
        <div className="tiny muted" style={{ marginTop: 10, lineHeight: 1.5 }}>WIP terbentuk dari jam ter-charge pada tarif standar; berkurang saat difakturkan (transfer ke piutang 1-200) atau di-write-down. Saldo akhir = sub-buku valuasi.</div>
      </Panel>

      <div className="grid" style={{ gap: 12 }}>
        <Panel title="Rekonsiliasi ke Kontrol GL 1-300" sub="bukti satu sumber kebenaran">
          <div>
            {W.bridge.map((b, i) => (
              <div key={i} className="row jb ac" style={{ padding: '8px 0', borderBottom: i < W.bridge.length - 1 ? '1px solid var(--line-soft)' : 'none', background: b.control ? 'var(--blue-050)' : 'transparent', margin: b.control ? '4px -6px 0' : 0, paddingLeft: b.control ? 6 : 0, paddingRight: b.control ? 6 : 0, borderRadius: b.control ? 4 : 0 }}>
                <span style={{ fontSize: 12, fontWeight: b.strong ? 700 : 500, color: b.strong ? 'var(--ink)' : 'var(--ink-2)' }}>{b.control ? '= ' : (b.strong ? '' : '+ ')}{b.label}</span>
                <span className="mono" style={{ fontWeight: b.strong ? 800 : 600, fontSize: 12, color: b.control ? 'var(--blue)' : 'var(--ink)' }}>Rp {jt(b.value)} jt</span>
              </div>
            ))}
          </div>
          <div className="row ac gap6" style={{ marginTop: 10 }}>
            <Badge kind={Math.abs(W.reconciling) < 1e6 ? 'green' : 'blue'}>{Math.abs(W.reconciling) < 1e6 ? 'Cocok persis' : 'Terjembatani'}</Badge>
            <span className="tiny muted">selisih teridentifikasi Rp {jt(W.reconciling)} jt</span>
          </div>
        </Panel>

        <Panel title="Provenansi & Keterkaitan" sub="lineage data WIP">
          <div className="tiny muted" style={{ marginBottom: 8, lineHeight: 1.5 }}>Sumber: sub-buku <b className="mono">WIP_ENG</b> × <b>Engagements</b> × <b>Clients</b> (jam × tarif standar). Perubahan di pemilik data mengalir otomatis ke seluruh modul di bawah.</div>
          <div className="row gap8" style={{ flexWrap: 'wrap' }}>
            {[
              { id: 'time', ic: 'clock', lbl: 'Time & Budget' },
              { id: 'billing', ic: 'receipt', lbl: 'Billing' },
              { id: 'revenue', ic: 'receipt', lbl: 'Pendapatan & WIP' },
              { id: 'firmfinance', ic: 'coins', lbl: 'Firm Finance' },
            ].map(x => {
              const Ic = (I as unknown as Record<string, IconComp>)[x.ic] || I.link2;
              return <button key={x.id} type="button" className="lin-chip" style={{ borderLeftColor: 'var(--blue)', flex: '1 1 45%' }} onClick={() => nav(x.id, { from: 'wip' })}><span className="lin-ic" style={{ color: 'var(--blue)' }}><Ic size={14} /></span><span className="lin-txt"><span className="lin-lbl">{x.lbl}</span></span><span className="lin-go"><I.arrowRight size={12} /></span></button>;
            })}
          </div>
        </Panel>
      </div>
    </div>
  );
}
