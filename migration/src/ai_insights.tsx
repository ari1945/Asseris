/* [codemod] ESM imports */
import React from 'react';
import { useAudit, useNav } from './contexts';
import { I, MODULE_INDEX } from './icons';
import { PROGRAMME } from './view_cockpit';
import { AMS } from './data';

/* ============================================================
   Asseris — AI Insights (Tier 2)
   Membawa AI keluar dari panel chat & menanamkannya di modul kerja.

   Inti: amsCrossChecks() — mesin DETERMINISTIK yang MENGKORELASIKAN
   beberapa modul untuk menemukan kontradiksi yang tak terlihat oleh
   satu modul pun (mis. risiko fraud signifikan vs AJE koreksi yang
   belum dibukukan; persediaan naik YoY vs uji NRV belum tuntas).

   Pengaman Tier 1 tetap berlaku:
   • Angka & temuan dihitung dari data langsung (bukan dikarang).
   • Tiap temuan adalah USULAN AI → auditor "Tindak lanjuti" / "Abaikan
     + alasan"; keputusan tercatat ke jejak audit & persisten.
   • Keterlusuran: tiap temuan menautkan modul/standar sumber.
   ============================================================ */
const { useMemo: useMemoAI } = React;

const AI_SEV = {
  high: { rank: 3, tone: 'red', label: 'Tinggi' },
  med: { rank: 2, tone: 'amber', label: 'Sedang' },
  low: { rank: 1, tone: 'blue', label: 'Rendah' },
};

/* angka → "Rp x,xx M" / "Rp xxx jt" */
function aiRp(n) {
  const a = Math.abs(n || 0);
  if (a >= 1e9) return 'Rp ' + (n / 1e9).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' M';
  return 'Rp ' + Math.round((n || 0) / 1e6).toLocaleString('id-ID') + ' jt';
}

/* ------------------------------------------------------------
   MESIN KORELASI LINTAS-MODUL (deterministik)
   ctx: { aje, risks, wtb, workpapers, programme, confirmations }
   ------------------------------------------------------------ */
function amsCrossChecks(ctx) {
  const aje = ctx.aje || [];
  const risks = ctx.risks || [];
  const wtb = ctx.wtb || [];
  const wps = ctx.workpapers || [];
  const prog = ctx.programme || [];
  const confs = ctx.confirmations || [];
  const out = [];

  const wtbVal = (code, field?) => {
    const r = wtb.find(x => x.code === code) || {};
    return (field === 'ly' ? r.ly : (r.adj != null ? r.adj : r.unadj)) || 0;
  };
  const progArea = (match) => prog.find(p => p.area && match.test(p.area));

  /* 1) Risiko fraud signifikan ⨯ AJE koreksi fraud masih Proposed */
  const fraudRisks = risks.filter(r => r.fraud && /Significant/i.test(r.inherent || ''));
  const fraudAje = aje.filter(a => a.status === 'Proposed' && /fiktif|fraud|channel|override|berelasi|dini/i.test(a.desc));
  if (fraudRisks.length && fraudAje.length) {
    const amt = fraudAje.reduce((s, a) => s + (a.amount || 0), 0);
    out.push({
      id: 'fraud-aje', sev: 'high', std: 'SA 240 · SA 450',
      title: 'Risiko fraud signifikan vs AJE koreksi belum dibukukan',
      detail: `RoMM fraud terbuka (${fraudRisks.map(r => r.area).join(', ')}) sementara ${fraudAje.length} AJE bermuatan fraud masih Proposed — ${fraudAje.map(a => a.id).join(', ')} senilai ${aiRp(amt)}. Opini tidak dapat difinalisasi sebelum keputusan posting/justifikasi terdokumentasi.`,
      modules: ['aje', 'risk'], refs: ['aje', 'risk', 'sad'],
    });
  }

  /* 2) Persediaan naik YoY ⨯ uji NRV belum tuntas / ada pengecualian */
  const invAdj = wtbVal('1-1300'), invLy = wtbVal('1-1300', 'ly');
  const invPct = invLy ? (invAdj - invLy) / invLy * 100 : 0;
  const invArea = progArea(/Persediaan/i);
  const invOpen = invArea ? invArea.procs.filter(p => p.exc > 0 || p.status !== 'done') : [];
  if (invPct >= 8 && invOpen.length) {
    const exc = invOpen.reduce((s, p) => s + (p.exc || 0), 0);
    out.push({
      id: 'inv-nrv', sev: exc > 0 ? 'high' : 'med', std: 'PSAK 14 · SA 540',
      title: 'Persediaan naik YoY namun uji NRV belum tuntas',
      detail: `Persediaan adjusted ${aiRp(invAdj)} — naik ${invPct.toFixed(0)}% dari ${aiRp(invLy)} (audited LY). Uji NRV/keusangan (${invArea.procs.map(p => p.wp).join(', ')}) masih ${exc > 0 ? exc + ' pengecualian terbuka' : 'belum selesai'}. Flag analitis perlu ditindaklanjuti sebelum penilaian persediaan disimpulkan.`,
      modules: ['wtb', 'psak14'], refs: ['psak14', 'analytical', 'wtb'],
    });
  }

  /* 3) Pengecualian JET ⨯ simpulan management override belum ditarik */
  const overrideArea = progArea(/Override/i);
  const jetExc = overrideArea ? overrideArea.procs.reduce((s, p) => s + (p.exc || 0), 0) : 0;
  const overrideRisk = risks.find(r => /override/i.test(r.area) && /Significant/i.test(r.inherent || ''));
  if (jetExc > 0 && overrideRisk) {
    out.push({
      id: 'jet-override', sev: 'high', std: 'SA 240 ¶32',
      title: 'Pengecualian JET belum dikaitkan ke simpulan override',
      detail: `${jetExc} pengecualian pada Journal Entry Testing (respons atas ${overrideRisk.id} ${overrideRisk.area}) belum dievaluasi tuntas. SA 240 mensyaratkan setiap entri menyimpang ditelusuri & disimpulkan terhadap risiko pengesampingan pengendalian.`,
      modules: ['jet', 'risk'], refs: ['jet', 'risk', 'sa240'],
    });
  }

  /* 4) Konfirmasi No-Reply lama ⨯ prosedur alternatif perlu dikonfirmasi */
  const noReply = confs.filter(c => c.status === 'No Reply' && (c.days || 0) >= 30);
  if (noReply.length) {
    out.push({
      id: 'conf-noreply', sev: 'med', std: 'SA 505 ¶12',
      title: `${noReply.length} konfirmasi No-Reply > 30 hari tanpa prosedur alternatif terverifikasi`,
      detail: `${noReply.map(c => `${c.party.replace(/^PT |^CV /, '')} (${c.days} hr)`).join(', ')}. Untuk non-respons konfirmasi positif, SA 505 mewajibkan prosedur alternatif (mis. subsequent receipt / vouching) — status penyelesaiannya perlu dipastikan.`,
      modules: ['confirm'], refs: ['confirm', 'sad'],
    });
  }

  /* 5) Diskrepansi konfirmasi ⨯ rekonsiliasi ke SAD/ECL */
  const discrep = confs.filter(c => c.status === 'Discrepancy');
  if (discrep.length) {
    const arDisc = discrep.filter(c => c.type === 'Piutang');
    out.push({
      id: 'conf-discrep', sev: 'med', std: 'SA 505 · SA 450',
      title: `${discrep.length} diskrepansi konfirmasi belum tuntas direkonsiliasi`,
      detail: `${discrep.map(c => `${c.party.replace(/^PT |^CV /, '')} (selisih ${aiRp(Math.abs((c.amount || 0) - (c.resp || 0)))})`).join('; ')}. Selisih yang tak terjelaskan harus mengalir ke SAD Ledger${arDisc.length ? ' dan dipertimbangkan terhadap kecukupan ECL piutang' : ''}.`,
      modules: ['confirm'], refs: ['confirm', 'sad', ...(arDisc.length ? ['ecl'] : [])],
    });
  }

  /* 6) Kertas kerja tanpa reviewer jelang finalisasi */
  const noRev = wps.filter(w => w.reviewer === '—' || !w.reviewer);
  if (noRev.length) {
    out.push({
      id: 'wp-noreviewer', sev: 'med', std: 'SA 230 · ISQM 1',
      title: `${noRev.length} kertas kerja belum memiliki reviewer`,
      detail: `${noRev.map(w => w.ref + ' ' + (w.title || '')).join(' · ')}. Reviu kertas kerja wajib selesai sebelum gate kesiapan opini (SA 220/ISQM).`,
      modules: ['workpapers'], refs: ['workpapers'],
    });
  }

  return out.sort((a, b) => AI_SEV[b.sev].rank - AI_SEV[a.sev].rank);
}

/* ------------------------------------------------------------
   HOOK — rakit konteks dari provider + global, hitung temuan,
   kelola keputusan (persisten + jejak audit).
   ------------------------------------------------------------ */
function useAiInsights(scope) {
  const audit = useAudit();
  const nav = useNav();
  const [decisions, setDecisions] = window.useAmsPersist('aiInsights.v1', () => ({}));
  const USER: any = (AMS && AMS.USER) || { name: 'Anindya Pramesti', role: 'Audit Manager' };

  const all = useMemoAI(() => amsCrossChecks({
    aje: audit.aje, risks: audit.risks, wtb: audit.wtb, workpapers: audit.workpapers,
    programme: (typeof PROGRAMME !== 'undefined' && PROGRAMME) || window.PROGRAMME,
    confirmations: window.CONFIRMATIONS,
  }), [audit.aje, audit.risks, audit.wtb, audit.workpapers]);

  const insights = scope ? all.filter(i => i.modules.includes(scope) || i.refs.includes(scope)) : all;

  const decide = (ins, verdict, reason) => {
    const when = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    setDecisions(d => ({ ...d, [ins.id]: { verdict, who: USER.name, role: USER.role, when, reason: reason || '' } }));
    if (audit.logActivity) audit.logActivity({
      who: USER.name,
      what: `${verdict === 'follow' ? 'menindaklanjuti' : 'menutup (abaikan)'} temuan AI lintas-modul — ${ins.title}${reason ? ' · ' + reason : ''}`,
      mod: 'ai', icon: verdict === 'follow' ? 'check' : 'flag',
    });
    if (window.logAiUsage) window.logAiUsage({ q: 'Lintas-modul: ' + ins.title, sent: false, anon: false, decision: verdict });
    if (verdict === 'follow' && ins.refs && ins.refs[0]) nav(ins.refs[0]);
  };

  return { insights, all, decisions, decide, openCount: insights.filter(i => !decisions[i.id]).length };
}

/* ------------------------------------------------------------
   KOMPONEN — panel + kartu temuan dengan gerbang keputusan
   ------------------------------------------------------------ */
function AiInsChips({ refs, onOpen }: any) {
  return (
    <div className="aiins-refs">
      <span className="aiins-refs-lbl"><I.link2 size={11} /> Sumber</span>
      {refs.map(id => {
        const m = MODULE_INDEX[id] || { label: id, icon: 'panel' };
        const RI = I[m.icon] || I.panel;
        return <button key={id} className="aiins-ref" onClick={() => onOpen(id)}><RI size={11} /> {m.label}<I.arrowRight size={10} /></button>;
      })}
    </div>
  );
}

function AiInsightCard({ ins, decision, onDecide, onOpen }: any) {
  const [mode, setMode] = React.useState(null);
  const [reason, setReason] = React.useState('');
  const sev = AI_SEV[ins.sev];

  return (
    <div className={'aiins-card ' + (decision ? 'done' : sev.tone)}>
      <div className="aiins-top">
        <span className={'aiins-sev ' + sev.tone}><I.alert size={12} /> {sev.label}</span>
        <span className="aiins-title">{ins.title}</span>
        {ins.std && <span className="aiins-std">{ins.std}</span>}
      </div>
      <div className="aiins-detail">{ins.detail}</div>
      <AiInsChips refs={ins.refs} onOpen={onOpen} />

      {decision ? (
        <div className={'aiins-decided ' + (decision.verdict === 'follow' ? 'ok' : 'ov')}>
          <span>{decision.verdict === 'follow' ? <I.checkCircle size={13} /> : <I.flag size={13} />}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="aiins-decided-t">{decision.verdict === 'follow' ? 'Ditindaklanjuti' : 'Diabaikan'} oleh <b>{decision.who}</b> · {decision.when}</div>
            {decision.reason ? <div className="aiins-decided-r">“{decision.reason}”</div> : null}
            <div className="aiins-trace"><I.lock size={9} /> tercatat ke jejak audit</div>
          </div>
        </div>
      ) : (
        <div className="aiins-gate">
          <span className="aiins-gate-badge"><I.sparkle size={10} /> Usulan AI · keputusan auditor</span>
          {mode !== 'dismiss' ? (
            <div className="aiins-actions">
              <button className="aiins-follow" onClick={() => onDecide(ins, 'follow', '')}><I.arrowRight size={12} /> Tindak lanjuti</button>
              <button className="aiins-dismiss" onClick={() => setMode('dismiss')}>Abaikan</button>
            </div>
          ) : (
            <div className="aiins-dismiss-box">
              <textarea className="aiins-input" rows={2} value={reason} onChange={e => setReason(e.target.value)} placeholder="Alasan diabaikan / pertimbangan auditor (wajib dicatat)…" />
              <div className="aiins-actions">
                <button className="aiins-cancel" onClick={() => { setMode(null); setReason(''); }}>Batal</button>
                <button className="aiins-confirm" disabled={!reason.trim()} onClick={() => onDecide(ins, 'dismiss', reason.trim())}><I.check size={12} /> Catat</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AiInsightPanel({ scope, title, embedded }: any) {
  const { insights, decisions, decide, openCount } = useAiInsights(scope);
  const nav = useNav();
  const [showDone, setShowDone] = React.useState(false);

  if (!insights.length) {
    return (
      <div className={'aiins-wrap' + (embedded ? ' embed' : '')}>
        <div className="aiins-head">
          <span className="aiins-h-ic"><I.sparkle size={14} /></span>
          <span className="aiins-h-t">{title || 'AI · Deteksi Kontradiksi Lintas-Modul'}</span>
        </div>
        <div className="aiins-empty"><I.checkCircle size={15} /> Tidak ada kontradiksi lintas-modul terdeteksi.</div>
      </div>
    );
  }

  const open = insights.filter(i => !decisions[i.id]);
  const done = insights.filter(i => decisions[i.id]);
  const list = showDone ? insights : open;

  return (
    <div className={'aiins-wrap' + (embedded ? ' embed' : '')}>
      <div className="aiins-head">
        <span className="aiins-h-ic"><I.sparkle size={14} /></span>
        <span className="aiins-h-t">{title || 'AI · Deteksi Kontradiksi Lintas-Modul'}</span>
        <span className="aiins-h-sub">mengkorelasikan {scope ? 'modul ini dengan' : ''} beberapa modul · {openCount} terbuka</span>
        <div style={{ flex: 1 }} />
        {done.length > 0 && <button className="aiins-toggle" onClick={() => setShowDone(s => !s)}>{showDone ? 'Sembunyikan diputuskan' : `Tampilkan ${done.length} diputuskan`}</button>}
      </div>
      <div className="aiins-list">
        {list.length === 0
          ? <div className="aiins-empty"><I.checkCircle size={15} /> Semua temuan telah diputuskan auditor.</div>
          : list.map(ins => (
            <AiInsightCard key={ins.id} ins={ins} decision={decisions[ins.id]} onDecide={decide} onOpen={nav} />
          ))}
      </div>
      <div className="aiins-foot"><I.lock size={10} /> Temuan dihitung dari data langsung · setiap keputusan tercatat untuk reviu mutu (ISQM 1)</div>
    </div>
  );
}

Object.assign(window, { amsCrossChecks, useAiInsights, AiInsightPanel });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { AiInsightPanel, amsCrossChecks, useAiInsights };
