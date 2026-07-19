import React from 'react';
import { useAmsPersist, useAuth, useFirm } from './contexts';
import { CAP } from './rbac';
import { I } from './icons';
import { SubBar } from './shell';
import { Badge, Btn, Panel, Stat } from './ui';
import { SCHEDULE } from './data_part1';
import {
  THREATS, rosterForEngagement, engagementIndependence, seedDeclarations,
  type EngagementDeclarations, type MemberDeclaration, type ThreatKey, type EngagementIndependence,
} from './member_independence';

/* ============================================================
   Asseris — Independensi per-Anggota Tim (SA 220.16–24 · ISQM 1 · Kode Etik)
   Matriks deklarasi anggota × ancaman untuk perikatan aktif. Setiap anggota
   menandatangani deklarasinya (self); Partner (FIRM_ADMIN) dapat mengelola
   atas nama. Kesimpulan independensi tingkat-perikatan (bersih/ter-safeguard/
   terblokir) menjadi prasyarat sign-off/opini (lihat useMemberIndependenceGate).
   Persist: StateDoc engagement-scope key 'memberIndep.v1' (capForWrite=WP_EDIT).
   ============================================================ */

const EMPTY_DECL: MemberDeclaration = { threats: {}, safeguards: '', note: '', signed: false };
const stamp = () => new Date().toISOString().slice(0, 10);

const statusMeta: Record<string, { kind: 'green' | 'amber' | 'red' | 'gray'; label: string }> = {
  clean: { kind: 'green', label: 'Bersih' },
  safeguarded: { kind: 'amber', label: 'Ter-safeguard' },
  threat: { kind: 'red', label: 'Ancaman tak-tersafeguard' },
  undeclared: { kind: 'gray', label: 'Belum dinyatakan' },
};

/* Hook bersama: kesimpulan independensi anggota untuk PERIKATAN AKTIF —
   dipakai modul ini & gerbang penerbitan opini (view_opinion_parts). */
export function useMemberIndependenceGate(): EngagementIndependence {
  const firm = useFirm();
  const engId = (firm && firm.activeEngagementId) || '';
  const roster = rosterForEngagement(SCHEDULE, engId);
  const [decls] = useAmsPersist('memberIndep.v1', () => seedDeclarations(roster));
  return engagementIndependence(roster, decls as EngagementDeclarations);
}

function MemberIndependence() {
  const auth = useAuth();
  const firm = useFirm();
  const engId = (firm && firm.activeEngagementId) || '';
  const roster = rosterForEngagement(SCHEDULE, engId);
  const [decls, setDecls] = useAmsPersist('memberIndep.v1', () => seedDeclarations(roster));

  const canAdmin = !!(auth && typeof auth.can === 'function' && auth.can(CAP.FIRM_ADMIN));
  const myName = (auth && auth.user && auth.user.name) || '';
  const canEdit = (member: string) => canAdmin || member === myName;

  const eng = engagementIndependence(roster, decls as EngagementDeclarations);

  const patchDecl = (member: string, patch: Partial<MemberDeclaration>) =>
    setDecls((prev: EngagementDeclarations) => ({ ...prev, [member]: { ...(prev[member] || EMPTY_DECL), ...patch } }));
  const toggleThreat = (member: string, key: ThreatKey) => {
    if (!canEdit(member)) return;
    const cur = (decls as EngagementDeclarations)[member] || EMPTY_DECL;
    patchDecl(member, { threats: { ...cur.threats, [key]: !cur.threats[key] } });
  };
  const setSafeguards = (member: string, v: string) => { if (canEdit(member)) patchDecl(member, { safeguards: v }); };
  const toggleSign = (member: string) => {
    if (!canEdit(member)) return;
    const cur = (decls as EngagementDeclarations)[member] || EMPTY_DECL;
    patchDecl(member, cur.signed ? { signed: false, signedAt: undefined } : { signed: true, signedAt: stamp() });
  };

  const clientName = (() => {
    for (const s of SCHEDULE) {
      const a = s.alloc.find((x) => x.eng === engId);
      if (a) return a.client;
    }
    return '';
  })();

  return (
    <>
      <SubBar moduleId="teamindep" right={<Badge kind={eng.blockers ? 'red' : 'green'}>{eng.blockers ? eng.blockers + ' pemblokir' : 'independensi bersih'}</Badge>} />
      <div className="view-scroll">
        <div className="view-pad">
          <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
            <Panel><div style={{ padding: '15px 18px' }}><Stat value={eng.total} label="Anggota Tim" /></div></Panel>
            <Panel><div style={{ padding: '15px 18px' }}><Stat value={eng.signed} label="Deklarasi Ditandatangani" accent={eng.signed < eng.total ? 'var(--amber)' : undefined} /></div></Panel>
            <Panel><div style={{ padding: '15px 18px' }}><Stat value={eng.withThreat} label="Ancaman Teridentifikasi" /></div></Panel>
            <Panel><div style={{ padding: '15px 18px' }}><Stat value={eng.blockers} label="Pemblokir Sign-off" accent={eng.blockers ? 'var(--red)' : undefined} /></div></Panel>
          </div>

          {/* Kesimpulan tingkat-perikatan */}
          <Panel style={{ marginBottom: 12 }}>
            <div className="row ac gap10" style={{ padding: '12px 16px' }}>
              <span style={{ color: eng.clear ? 'var(--green)' : 'var(--red)' }}>
                {eng.clear ? <I.checkCircle size={18} /> : <I.lock size={18} />}
              </span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>
                  {eng.clear ? 'Independensi tim bersih — prasyarat sign-off terpenuhi' : 'Independensi belum bersih — sign-off/opini diblokir'}
                </div>
                <div className="tiny muted" style={{ marginTop: 2 }}>
                  SA 220.16–24 · ISQM 1 · Kode Etik/IESBA 290 — setiap anggota menyatakan ancaman & pengaman; ancaman tak-tersafeguard atau deklarasi belum ditandatangani memblok penerbitan opini.
                </div>
              </div>
            </div>
          </Panel>

          <Panel noBody>
            <div className="panel-h">
              <h3>Matriks Independensi Anggota Tim — Perikatan {engId || '—'}{clientName ? ' · ' + clientName : ''}</h3>
              <div style={{ flex: 1 }} />
              <span className="tiny muted">Tandai ancaman · isi pengaman · tanda tangani (hanya baris Anda; Partner atas nama)</span>
            </div>
            {roster.length === 0 ? (
              <div className="tiny muted" style={{ padding: '14px 16px' }}>Belum ada anggota ter-staffing pada perikatan aktif (SSOT: SCHEDULE).</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="dtbl">
                  <thead><tr>
                    <th>Anggota</th><th>Peran</th>
                    {THREATS.map((t) => <th key={t.key} className="r" title={t.hint} style={{ writingMode: 'horizontal-tb', fontSize: 10.5 }}>{t.label}</th>)}
                    <th>Pengaman</th><th>Status</th><th>Deklarasi</th>
                  </tr></thead>
                  <tbody>
                    {eng.rows.map((r) => {
                      const d = (decls as EngagementDeclarations)[r.member] || EMPTY_DECL;
                      const editable = canEdit(r.member);
                      const sm = statusMeta[r.status];
                      return (
                        <tr key={r.member}>
                          <td className="truncate" style={{ maxWidth: 160 }}>
                            {r.member}{r.member === myName && <span className="tiny mono" style={{ color: 'var(--blue)', marginLeft: 5 }}>Anda</span>}
                          </td>
                          <td className="tiny muted">{r.role}</td>
                          {THREATS.map((t) => (
                            <td key={t.key} className="r">
                              <input type="checkbox" checked={!!d.threats[t.key]} disabled={!editable}
                                onChange={() => toggleThreat(r.member, t.key)} title={t.hint}
                                style={{ cursor: editable ? 'pointer' : 'default' }} />
                            </td>
                          ))}
                          <td>
                            <input className="input" value={d.safeguards || ''} disabled={!editable || !r.hasThreat}
                              onChange={(e: { target: { value: string } }) => setSafeguards(r.member, e.target.value)}
                              placeholder={r.hasThreat ? 'Pengaman atas ancaman…' : '—'}
                              style={{ width: 200, fontSize: 11, padding: '4px 7px', background: (editable && r.hasThreat) ? 'var(--surface)' : 'var(--surface-2)' }} />
                          </td>
                          <td><Badge kind={sm.kind}>{sm.label}</Badge></td>
                          <td>
                            {editable ? (
                              <Btn sm variant={r.signed ? 'ghost' : 'primary'} onClick={() => toggleSign(r.member)}>
                                {r.signed ? <><I.sync size={12} /> Batalkan</> : <><I.check size={12} /> Tandatangani</>}
                              </Btn>
                            ) : (
                              <span className="tiny muted">{r.signed ? '✓ ' + (r.signedAt || '') : 'Menunggu'}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { MemberIndependence });
export { MemberIndependence };
