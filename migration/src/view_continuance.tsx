import React from 'react';
import { useAmsPersist, useAuth, useFirm, useInitialSelection, useNav } from './contexts';
import { CAP } from './rbac';
import { I } from './icons';
import { SubBar } from './shell';
import { Badge, Btn, Panel, Stat } from './ui';
import { INDEPENDENCE, INVOICES } from './data_part1';
import {
  continuanceFlags,
  type Attention,
  type ContinuanceDecision,
  type StoredDecision,
  type TriggerSeverity,
} from './continuance_engine';

/* ============================================================
   Asseris — Keberlanjutan Klien (ISQM 1 ¶33–34 / SA 220)
   Register pengawasan KEBERLANJUTAN atas portofolio klien aktif
   (bukan penerimaan klien baru — itu modul `onboarding`). Pemicu
   diturunkan dari kanon via continuance_engine; keputusan persist
   firm-scope. Gate: lihat = ENGAGEMENT_VIEW_ALL, putuskan = FIRM_ADMIN.
   ============================================================ */
const { useState: useStateCN } = React;

const REF_YEAR = 2026; // siklus keberlanjutan yang dinilai (FY2025 audit → keputusan FY2026)

/* seed keputusan demo (state firm-scope; sisanya default "Tertunda") */
const CONTINUANCE_SEED: Record<string, StoredDecision> = {
  'C-058': { decision: 'Lanjut', approver: 'Rudi Gunawan, CPA', date: '2026-01-12' },
  'C-031': { decision: 'Lanjut dengan Syarat', approver: 'Hartono Wijaya, CPA', date: '2026-01-20', conditions: 'Perkuat prosedur aset biologis & pertimbangkan rotasi tim senior.' },
};

const DECISIONS: ContinuanceDecision[] = ['Lanjut', 'Lanjut dengan Syarat', 'Tidak Dilanjutkan'];

const attnKind = (a: Attention) => (a === 'Tinggi' ? 'red' : a === 'Sedang' ? 'amber' : 'green');
const decKind = (d: ContinuanceDecision) => (d === 'Lanjut' ? 'green' : d === 'Lanjut dengan Syarat' ? 'amber' : d === 'Tidak Dilanjutkan' ? 'red' : 'gray');
const sevColor = (s: TriggerSeverity) => (s === 'high' ? 'var(--red)' : s === 'med' ? 'var(--amber)' : 'var(--ink-4)');

function ContinuanceRegister() {
  const auth = useAuth();
  const nav = useNav();
  const { clients } = useFirm();
  const [decisions, setDecisions] = useAmsPersist('continuanceDecisions', CONTINUANCE_SEED);

  const canView = !!(auth && typeof auth.can === 'function' && auth.can(CAP.ENGAGEMENT_VIEW_ALL));
  const canDecide = !!(auth && typeof auth.can === 'function' && auth.can(CAP.FIRM_ADMIN));

  const sum = continuanceFlags(clients, INDEPENDENCE, INVOICES, decisions, REF_YEAR);
  // Deep-link (mis. dari Lini Masa Audit): buka langsung baris klien perikatan
  // terpilih bila valid; jika tidak, jatuh ke default (baris teratas) → nol regresi.
  const seedClient = useInitialSelection('continuance');
  const [selId, setSelId] = useStateCN(
    seedClient && sum.rows.some((r) => r.clientId === seedClient) ? seedClient
      : (sum.rows[0] ? sum.rows[0].clientId : '')
  );
  const sel = sum.rows.find((r) => r.clientId === selId) || sum.rows[0];

  const setDecision = (clientId: string, decision: ContinuanceDecision) => {
    if (!canDecide) return;
    const today = new Date().toISOString().slice(0, 10);
    const approver = (auth && auth.user && auth.user.name) || 'Partner';
    setDecisions((prev: Record<string, StoredDecision>) => {
      const next = { ...prev };
      next[clientId] = { decision, approver, date: today, conditions: prev[clientId] ? prev[clientId].conditions : undefined };
      return next;
    });
  };
  const resetDecision = (clientId: string) => {
    if (!canDecide) return;
    setDecisions((prev: Record<string, StoredDecision>) => {
      const next = { ...prev };
      delete next[clientId];
      return next;
    });
  };

  if (!canView) {
    return (
      <>
        <SubBar moduleId="continuance" />
        <div className="view-scroll"><div className="view-pad">
          <Panel>
            <div className="row ac gap10" style={{ padding: '14px 16px' }}>
              <span style={{ color: 'var(--amber)' }}><I.lock size={18} /></span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>Akses terbatas — pengawasan oversight</div>
                <div className="tiny muted" style={{ marginTop: 2 }}>Keputusan keberlanjutan portofolio hanya untuk Partner/Manajer (oversight). Server tetap menegakkan isolasi data.</div>
              </div>
            </div>
          </Panel>
        </div></div>
      </>
    );
  }

  return (
    <>
      <SubBar moduleId="continuance" right={<Badge kind={sum.pending ? 'amber' : 'green'}>{sum.pending} perlu keputusan</Badge>} />
      <div className="view-scroll">
        <div className="view-pad">
          <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
            <Panel><div style={{ padding: '11px 14px' }}><Stat value={sum.total} label="Klien Aktif" /></div></Panel>
            <Panel><div style={{ padding: '11px 14px' }}><Stat value={sum.pending} label="Perlu Keputusan" accent={sum.pending ? 'var(--amber)' : undefined} /></div></Panel>
            <Panel><div style={{ padding: '11px 14px' }}><Stat value={sum.attentionHigh} label="Perhatian Tinggi" accent="var(--red)" /></div></Panel>
            <Panel><div style={{ padding: '11px 14px' }}><Stat value={sum.rotationFlags} label="Pemicu Rotasi AP" /></div></Panel>
          </div>

          <div className="grid" style={{ gridTemplateColumns: '1fr 380px', gap: 12, alignItems: 'start' }}>
            {/* Register */}
            <Panel noBody>
              <div className="panel-h"><h3>Register Keberlanjutan — Portofolio Aktif</h3><div style={{ flex: 1 }} /><span className="tiny muted">Klik baris untuk detail & keputusan</span></div>
              <table className="dtbl">
                <thead><tr>
                  <th>Klien</th><th>Partner</th><th className="r">Asosiasi</th><th>Pemicu</th><th>Perhatian</th><th>Keputusan</th>
                </tr></thead>
                <tbody>
                  {sum.rows.map((r) => (
                    <tr key={r.clientId} onClick={() => setSelId(r.clientId)}
                      style={{ cursor: 'pointer', background: sel && sel.clientId === r.clientId ? 'var(--blue-100)' : undefined }}>
                      <td className="truncate" style={{ maxWidth: 170 }}>
                        {r.client.replace('PT ', '')}{r.pie && <span className="tiny mono" style={{ color: 'var(--blue)', marginLeft: 5 }}>PIE</span>}
                      </td>
                      <td className="truncate tiny muted" style={{ maxWidth: 110 }}>{r.partner.split(',')[0]}</td>
                      <td className="num tiny">{r.assocYears} th</td>
                      <td>
                        {r.triggers.length === 0
                          ? <span className="tiny muted">—</span>
                          : <span className="row ac gap4">
                            {r.triggers.slice(0, 4).map((t, i) => <span key={i} title={t.label + ' — ' + t.detail} style={{ width: 9, height: 9, borderRadius: 2, background: sevColor(t.severity) }} />)}
                            <span className="tiny muted" style={{ marginLeft: 2 }}>{r.triggers.length}</span>
                          </span>}
                      </td>
                      <td><Badge kind={attnKind(r.attention)}>{r.attention}</Badge></td>
                      <td><Badge kind={decKind(r.decision)} dot={r.decided}>{r.decision}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>

            {/* Detail & keputusan */}
            {sel && (
              <div className="grid" style={{ gap: 12 }}>
                <Panel title={sel.client.replace('PT ', '')} sub={`${sel.industry} · ${sel.partner.split(',')[0]}`}>
                  <div style={{ padding: '12px 14px' }}>
                    <div className="row ac gap8" style={{ marginBottom: 10 }}>
                      <Badge kind={attnKind(sel.attention)}>Perhatian {sel.attention}</Badge>
                      {sel.pie && <Badge kind="blue">Emiten / PIE</Badge>}
                      <Badge kind={sel.risk === 'High' ? 'red' : sel.risk === 'Medium' ? 'amber' : 'gray'}>Risiko {sel.risk}</Badge>
                    </div>

                    <div className="tiny muted upper" style={{ marginBottom: 6 }}>Pemicu keberlanjutan</div>
                    {sel.triggers.length === 0
                      ? <div className="tiny muted" style={{ marginBottom: 8 }}>Tidak ada pemicu signifikan — kandidat keberlanjutan rutin.</div>
                      : <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 10 }}>
                        {sel.triggers.map((t, i) => (
                          <div key={i} className="row gap8" style={{ alignItems: 'flex-start' }}>
                            <span style={{ width: 9, height: 9, borderRadius: 2, background: sevColor(t.severity), marginTop: 4, flex: '0 0 9px' }} />
                            <div><div style={{ fontSize: 12, fontWeight: 600 }}>{t.label}</div><div className="tiny muted">{t.detail}</div></div>
                          </div>
                        ))}
                      </div>}

                    <div className="divider" />
                    <div className="row ac jb" style={{ marginBottom: 8 }}>
                      <span className="tiny muted upper">Keputusan</span>
                      <Badge kind={decKind(sel.decision)} dot={sel.decided}>{sel.decision}</Badge>
                    </div>
                    {sel.decided && (
                      <div className="tiny muted" style={{ marginBottom: 8 }}>
                        Oleh {sel.approver} · {sel.decidedDate}{sel.conditions ? <div style={{ marginTop: 3 }}>Syarat: {sel.conditions}</div> : null}
                      </div>
                    )}

                    {canDecide ? (
                      <>
                        <div className="row wrap gap6">
                          {DECISIONS.map((d) => (
                            <Btn key={d} sm variant={sel.decision === d ? 'primary' : ''} onClick={() => setDecision(sel.clientId, d)}>{d}</Btn>
                          ))}
                          {sel.decided && <Btn sm variant="ghost" onClick={() => resetDecision(sel.clientId)}><I.sync size={13} /> Tertunda</Btn>}
                        </div>
                        <div className="tiny muted" style={{ marginTop: 6 }}>Persetujuan dicatat atas nama Anda ({(auth && auth.user && auth.user.name) || 'Partner'}) — SA 220 / ISQM 1.</div>
                      </>
                    ) : (
                      <div className="tiny muted">Hanya Partner (otoritas firma) yang dapat memutuskan keberlanjutan. Anda dapat menelaah.</div>
                    )}
                  </div>
                </Panel>

                <Panel title="Tindak lanjut">
                  <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 7 }}>
                    <Btn sm variant="ghost" onClick={() => nav('onboarding', { from: 'continuance' })}><I.flag size={13} /> PMPJ / Engagement Letter (SA 210)</Btn>
                    <Btn sm variant="ghost" onClick={() => nav('pppk', { from: 'continuance' })}><I.report size={13} /> Rotasi AP & Pelaporan PPPK</Btn>
                    <Btn sm variant="ghost" onClick={() => nav('governance', { from: 'continuance' })}><I.building size={13} /> ISQM 1 · Komponen C4</Btn>
                  </div>
                </Panel>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { ContinuanceRegister });

export { ContinuanceRegister };
