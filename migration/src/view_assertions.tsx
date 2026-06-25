/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { useAudit, useFirm, useNav } from './contexts';
import {
  assertionCoverage, assertionsByGroup, groupForAccountCode, ASSERTION_STATUS_META,
} from './canon_selectors';
import type { AssertionGroup, AssertionId, AssertionCell, LeadAssertionCoverage } from './canon_selectors';
import { wpProcedureInputs, WP_META } from './view_wp';
import { ajeAssertionIds } from './view_aje';
import { I } from './icons';
import { SubBar } from './shell';
import { Badge, Btn, Panel, Stat } from './ui';

/* ============================================================
   Asseris — Matriks Asersi (SA 315/330) · peta lintas-modul
   Baris = lead schedule signifikan (pos > PM ∪ ber-risiko asersi-level);
   kolom = asersi relevan. Sel = status cakupan (risiko → prosedur →
   bukti → koreksi AJE → kesimpulan). Angka identik dengan tab Prosedur
   WP (SSOT wpProcedureInputs + mesin cakupan kanon) — tidak ada salinan.
   ============================================================ */
const { useState: useStateAX, useMemo: useMemoAX } = React;

interface LeadInfo {
  lead: string; group: AssertionGroup; section: string; title: string;
  bal: number; maxAbs: number; hasAsrRisk: boolean;
}

const GLYPH: Record<string, string> = {
  concluded: '✓', exception: '∆', 'in-progress': '◐', planned: '○', gap: '!',
};

function AssertionMatrix() {
  const { fmt, rp } = AMS;
  const audit = useAudit();
  const { wtb, risks, aje } = audit;
  const { activeEngagement, activeClient } = useFirm();
  const nav = useNav();
  const [sel, setSel] = useStateAX(null as { lead: string; id: AssertionId } | null);

  const om = activeEngagement.materiality, pm = Math.round(om * 0.75);

  /* lead schedule terkumpul dari WTB + flag risiko asersi-level */
  const leads: LeadInfo[] = useMemoAX(() => {
    const map = new Map<string, LeadInfo & { codes: string[] }>();
    wtb.forEach((r: any) => {
      if (!r.lead) return;
      let e = map.get(r.lead);
      if (!e) {
        e = { lead: r.lead, group: groupForAccountCode(r.code), section: r.group, title: (WP_META as any)[r.lead]?.title || r.name, bal: 0, maxAbs: 0, hasAsrRisk: false, codes: [] };
        map.set(r.lead, e);
      }
      e.bal += r.adj; e.maxAbs = Math.max(e.maxAbs, Math.abs(r.adj)); e.codes.push(r.code);
    });
    (risks || []).forEach((r: any) => {
      const ref = String(r.wp || '').split('-')[0];
      const e = map.get(ref);
      if (e && r.assertionLvl) e.hasAsrRisk = true;
    });
    return [...map.values()];
  }, [wtb, risks]);

  /* signifikan: pos > PM ∪ akun ber-risiko asersi-level (Q-a default) */
  const significant = leads.filter(l => l.maxAbs >= pm || l.hasAsrRisk);

  /* cakupan per lead (SSOT) */
  const covByLead = useMemoAX(() => {
    const m = new Map<string, LeadAssertionCoverage>();
    significant.forEach(l => {
      const st = (audit.wpState || {})[l.lead] || {};
      const relRisks = (risks || []).filter((r: any) => String(r.wp || '').split('-')[0] === l.lead)
        .map((r: any) => ({ id: r.id, area: r.area, assertion: r.assertion, inherent: r.inherent, fraud: !!r.fraud, desc: r.desc }));
      m.set(l.lead, assertionCoverage({
        leadRef: l.lead, group: l.group, procedures: wpProcedureInputs(l.lead, audit), risks: relRisks,
        evidence: (st.evidence || []).map((e: any) => ({ tier: e.tier, asr: e.asr || [] })),
        concl: st.asrConcl || {},
      }));
    });
    return m;
  }, [significant, audit, risks]);

  /* KPI agregat */
  const agg = useMemoAX(() => {
    let relevant = 0, covered = 0, concluded = 0, gap = 0, exc = 0;
    covByLead.forEach((c: LeadAssertionCoverage) => { relevant += c.relevantCount; covered += c.coveredCount; concluded += c.concludedCount; gap += c.gapCount; exc += c.exceptionCount; });
    return { relevant, covered, concluded, gap, exc };
  }, [covByLead]);

  const saldo = significant.filter(l => l.group === 'saldo');
  const transaksi = significant.filter(l => l.group === 'transaksi');

  const selCov = sel ? covByLead.get(sel.lead) : null;
  const selCell: AssertionCell | null = selCov ? (selCov.cells.find((c: AssertionCell) => c.assertion.id === sel!.id) || null) : null;

  return (
    <>
      <SubBar moduleId="asersi" right={
        <div className="row gap8 ac">
          <Badge kind="blue">SA 315 · 330</Badge>
          <span className="tiny muted mono">PM Rp {fmt(pm / 1e6, 0)} jt</span>
        </div>
      } />
      <div className="view-scroll"><div className="view-pad">

        {/* KPI band */}
        <div className="grid" style={{ gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginBottom: 12 }}>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={agg.relevant} label="Asersi Relevan (SA 315)" /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={`${agg.covered}/${agg.relevant}`} label="Ditanggapi Prosedur" accent="var(--blue)" /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={`${agg.concluded}/${agg.relevant}`} label="Disimpulkan" accent={agg.concluded === agg.relevant ? 'var(--green)' : 'var(--ink)'} /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={agg.gap} label="Gap (belum ditanggapi)" accent={agg.gap ? 'var(--red)' : 'var(--green)'} /></div></Panel>
          <Panel><div style={{ padding: '11px 14px' }}><Stat value={agg.exc} label="Pengecualian" accent={agg.exc ? 'var(--red)' : 'var(--ink)'} /></div></Panel>
        </div>

        <div className="grid" style={{ gridTemplateColumns: sel ? 'minmax(0,1fr) 340px' : '1fr', gap: 12, alignItems: 'start' }}>
          <div style={{ minWidth: 0, display: 'grid', gap: 12 }}>
            <MatrixTable title="Asersi atas Saldo Akun & Pengungkapan" group="saldo" leads={saldo} covByLead={covByLead} sel={sel} onPick={setSel} fmt={fmt} pm={pm} />
            <MatrixTable title="Asersi atas Kelompok Transaksi & Peristiwa" group="transaksi" leads={transaksi} covByLead={covByLead} sel={sel} onPick={setSel} fmt={fmt} pm={pm} />
            <MatrixLegend />
          </div>

          {sel && selCell && selCov && (
            <CellDetail lead={sel.lead} cell={selCell} cov={selCov} aje={aje} fmt={fmt} rp={rp} nav={nav} onClose={() => setSel(null)} />
          )}
        </div>
      </div></div>
    </>
  );
}

/* ---- satu matriks (saldo / transaksi) ---- */
function MatrixTable({ title, group, leads, covByLead, sel, onPick, fmt, pm }: {
  title: string; group: AssertionGroup; leads: LeadInfo[]; covByLead: Map<string, LeadAssertionCoverage>;
  sel: { lead: string; id: AssertionId } | null; onPick: (s: { lead: string; id: AssertionId }) => void; fmt: any; pm: number;
}) {
  const cols = assertionsByGroup(group);
  if (!leads.length) return null;
  /* kelompokkan baris per seksi LK */
  const sections = [...new Set(leads.map(l => l.section))];
  return (
    <Panel noBody>
      <div className="panel-h"><h3>{title}</h3><div style={{ flex: 1 }} /><span className="tiny muted">{leads.length} lead signifikan · klik sel untuk benang penuh</span></div>
      <div style={{ overflowX: 'auto' }}>
        <table className="dtbl">
          <thead><tr>
            <th style={{ minWidth: 150 }}>Lead Schedule</th>
            <th className="num" style={{ width: 84 }}>Saldo (jt)</th>
            {cols.map(c => <th key={c.id} style={{ width: 52, textAlign: 'center' }} title={c.label + ' — ' + c.desc}>{c.abbr}</th>)}
          </tr></thead>
          <tbody>
            {sections.map(secName => (
              <React.Fragment key={secName}>
                <tr className="group-row"><td colSpan={2 + cols.length}>{secName}</td></tr>
                {leads.filter(l => l.section === secName).map(l => {
                  const cov = covByLead.get(l.lead);
                  const cellById = new Map<AssertionId, AssertionCell>();
                  cov?.cells.forEach(c => cellById.set(c.assertion.id, c));
                  return (
                    <tr key={l.lead}>
                      <td>
                        <span className="row ac gap6">
                          <span className="chip tiny" style={{ height: 18, padding: '0 6px', fontFamily: 'var(--mono)' }}>{l.lead}</span>
                          <span style={{ fontWeight: 600, fontSize: 12 }}>{l.title}</span>
                          {l.hasAsrRisk && <span title="Risiko tingkat asersi" style={{ color: 'var(--red)', display: 'inline-flex' }}><I.shield size={12} /></span>}
                        </span>
                      </td>
                      <td className="num" style={{ fontWeight: 600 }}>{fmt(l.bal / 1e6, 0)}</td>
                      {cols.map(c => {
                        const cell = cellById.get(c.id);
                        const active = sel?.lead === l.lead && sel?.id === c.id;
                        return <MatrixCell key={c.id} cell={cell} active={active} onClick={() => onPick({ lead: l.lead, id: c.id })} />;
                      })}
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function MatrixCell({ cell, active, onClick }: any) {
  /* tak relevan & tak diuji → titik redup, tak interaktif */
  if (!cell || (!cell.relevant && !cell.procedures.length)) {
    return <td style={{ textAlign: 'center', color: 'var(--ink-5, var(--ink-4))' }}>·</td>;
  }
  const sm = ASSERTION_STATUS_META[cell.status as keyof typeof ASSERTION_STATUS_META];
  const faint = !cell.relevant; // tambahan (diuji tapi tak ditandai relevan)
  return (
    <td style={{ textAlign: 'center', padding: 3 }}>
      <button onClick={onClick} title={`${cell.assertion.label} · ${sm.l}${cell.risks.length ? ` · ${cell.risks.length} risiko` : ''}${cell.procedures.length ? ` · ${cell.procedures.length} prosedur` : ''}`}
        style={{
          width: 28, height: 24, borderRadius: 5, cursor: 'pointer', fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 13,
          border: active ? '2px solid var(--navy)' : '1px solid var(--line)',
          background: faint ? 'var(--surface-2)' : `var(--${sm.k}-bg)`,
          color: faint ? 'var(--ink-4)' : `var(--${sm.k})`, opacity: faint ? 0.7 : 1,
        }}>{GLYPH[cell.status] || '·'}</button>
    </td>
  );
}

function MatrixLegend() {
  const items: Array<[string, string]> = [
    ['concluded', 'Disimpulkan'], ['in-progress', 'Berjalan'], ['planned', 'Direncanakan'], ['exception', 'Pengecualian'], ['gap', 'Belum ditanggapi (relevan, tanpa prosedur)'],
  ];
  return (
    <div className="panel" style={{ padding: '9px 13px' }}>
      <div className="row wrap gap12">
        {items.map(([k, l]) => {
          const sm = ASSERTION_STATUS_META[k as keyof typeof ASSERTION_STATUS_META];
          return (
            <span key={k} className="row ac gap6 tiny">
              <span className="mono" style={{ width: 22, height: 18, display: 'inline-grid', placeItems: 'center', borderRadius: 4, fontWeight: 700, background: `var(--${sm.k}-bg)`, color: `var(--${sm.k})` }}>{GLYPH[k]}</span>
              {l}
            </span>
          );
        })}
        <span className="row ac gap6 tiny"><span className="mono" style={{ width: 22, textAlign: 'center', color: 'var(--ink-4)' }}>·</span> Tak relevan / tak diuji</span>
      </div>
    </div>
  );
}

/* ---- panel benang penuh satu sel (risiko → prosedur → bukti → AJE → kesimpulan) ---- */
function CellDetail({ lead, cell, cov, aje, fmt, rp, nav, onClose }: {
  lead: string; cell: AssertionCell; cov: LeadAssertionCoverage; aje: any[]; fmt: any; rp: any; nav: any; onClose: () => void;
}) {
  const sm = ASSERTION_STATUS_META[cell.status as keyof typeof ASSERTION_STATUS_META];
  const relAje = (aje || []).filter(a => String(a.ref || '').split('-')[0] === lead && ajeAssertionIds(a).includes(cell.assertion.id));
  const openWp = () => { try { localStorage.setItem('ams.wpOpen', lead); } catch (e) {} nav('workpapers'); };

  return (
    <Panel noBody style={{ position: 'sticky', top: 0 }}>
      <div style={{ background: 'var(--surface-2)', padding: '10px 13px', borderBottom: '1px solid var(--line)' }}>
        <div className="row ac jb">
          <span className="chip tiny" style={{ fontFamily: 'var(--mono)' }}>WP {lead}</span>
          <button className="btn sm icon ghost" onClick={onClose}><I.x size={14} /></button>
        </div>
        <div style={{ fontWeight: 700, fontSize: 13, marginTop: 6 }}>{cell.assertion.label}</div>
        <div className="tiny muted">{cell.assertion.group === 'transaksi' ? 'Asersi transaksi' : 'Asersi saldo'} · {cell.assertion.desc}</div>
        <div style={{ marginTop: 7 }}><Badge kind={sm.k}>{sm.l}</Badge>{!cell.relevant && <span style={{ marginLeft: 6 }}><Badge kind="gray">tambahan</Badge></span>}</div>
      </div>
      <div style={{ padding: 13, display: 'grid', gap: 12 }}>

        <Thread label="Risiko (RoMM · SA 315)" count={cell.risks.length}>
          {cell.risks.length ? cell.risks.map(r => (
            <div key={r.id} className="row ac gap6" style={{ padding: '5px 0', borderBottom: '1px solid var(--line-soft)' }}>
              {r.fraud && <span title="Risiko kecurangan (SA 240)" style={{ color: 'var(--red)', display: 'inline-flex' }}><I.alert size={12} /></span>}
              <span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{r.id}</span>
              <span className="tiny" style={{ flex: 1 }}>{r.desc}</span>
              <Badge kind={r.inherent === 'Significant' ? 'red' : 'amber'}>{r.inherent}</Badge>
            </div>
          )) : <Empty t="Tak ada risiko spesifik tertaut asersi ini." />}
        </Thread>

        <Thread label="Prosedur (SA 330)" count={cell.procedures.length}>
          {cell.procedures.length ? cell.procedures.map((p, i) => {
            const ps = ASSERTION_STATUS_META[(p.status === 'Selesai' ? 'concluded' : p.status === 'Pengecualian' ? 'exception' : p.status === 'Berjalan' ? 'in-progress' : 'planned') as keyof typeof ASSERTION_STATUS_META];
            return (
              <div key={i} className="row ac gap8" style={{ padding: '5px 0', borderBottom: '1px solid var(--line-soft)' }}>
                <span className="tiny" style={{ flex: 1 }}>{p.text}</span>
                <Badge kind={ps.k}>{p.status}</Badge>
              </div>
            );
          }) : <Empty t="Belum ada prosedur menanggapi asersi ini (gap)." warn />}
        </Thread>

        <Thread label="Bukti (SA 500)" count={cell.evidenceCount}>
          {cell.evidenceCount
            ? <div className="tiny">{cell.evidenceCount} bukti ber-tag · rata-rata keandalan <b className="mono">{cell.apprAvg.toFixed(1)}/5</b></div>
            : <Empty t="Belum ada bukti ber-tag asersi ini." />}
        </Thread>

        <Thread label="Koreksi (AJE · SA 450)" count={relAje.length}>
          {relAje.length ? relAje.map(a => (
            <div key={a.id} className="row ac jb" style={{ padding: '5px 0', borderBottom: '1px solid var(--line-soft)' }}>
              <span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{a.id}</span>
              <span className="tiny truncate" style={{ flex: 1, margin: '0 8px' }}>{a.desc}</span>
              <span className="mono tiny">{rp ? rp(a.amount) : fmt(a.amount)}</span>
            </div>
          )) : <Empty t="Tak ada jurnal penyesuaian mengoreksi asersi ini." />}
        </Thread>

        {(cell.concl || cell.signedOff) && (
          <div className="panel" style={{ padding: '9px 11px', background: 'var(--blue-050)', borderColor: 'transparent', borderLeft: '3px solid var(--blue)' }}>
            <div className="tiny muted upper" style={{ fontWeight: 700, marginBottom: 3 }}>Kesimpulan auditor</div>
            <div className="tiny" style={{ lineHeight: 1.5 }}>{cell.concl || (cell.signedOff ? 'Ditandai disimpulkan tanpa catatan.' : '')}</div>
          </div>
        )}

        <div className="row gap8">
          <Btn sm style={{ flex: 1, justifyContent: 'center' }} onClick={openWp}><I.layers size={13} /> Buka WP {lead}</Btn>
          <Btn sm style={{ flex: 1, justifyContent: 'center' }} onClick={() => nav('aje')}><I.ledger size={13} /> Lihat AJE</Btn>
        </div>
      </div>
    </Panel>
  );
}

function Thread({ label, count, children }: any) {
  return (
    <div>
      <div className="row ac jb" style={{ marginBottom: 4 }}>
        <span className="tiny upper" style={{ fontWeight: 700, color: 'var(--ink-3)' }}>{label}</span>
        <span className="tiny muted">{count}</span>
      </div>
      {children}
    </div>
  );
}
const Empty = ({ t, warn }: { t: string; warn?: boolean }) => (
  <div className="tiny" style={{ color: warn ? 'var(--red)' : 'var(--ink-4)', padding: '3px 0' }}>{t}</div>
);

Object.assign(window, { AssertionMatrix });

/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { AssertionMatrix };
