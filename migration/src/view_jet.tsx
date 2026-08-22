/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { useAmsPersist, useCurrentAuditor, useFirm } from './contexts';
import { AiInsightPanel } from './ai_insights';
import { I } from './icons';
import { SubBar } from './shell';
import { Badge, Btn, Panel, Switch } from './ui';
import { DiagnosticPanel } from './diagnostics_panel';
import { AMS_FORENSIC } from './forensic_canon';
import { WpPanel } from './wp_signoff';
import {
  canRecord, jetFunnel, jetStampDate, recordDisposition, recordNote, selectedForTest,
} from './jet_selection';
import type { JetStage, JetStageId, JetState, JetStatus } from './jet_selection';

/* ============================================================
   Asseris — Journal Entry Testing (SA 240 / JET Tool)
   Pengujian jurnal terikat populasi forensik kanonik (AMS_FORENSIC):
   kriteria risiko, ambang, dan disposisi uji per-jurnal di-persist
   engagement-scoped; sign-off & kesimpulan via WpPanel (SA 230).

   CORONG POPULASI (2026-08-22). Corong di modul ini pernah dibangun dari dua
   literal populasi — identik untuk setiap perikatan, tak berhubungan dengan
   data klien mana pun — plus satu penambah tetap pada jumlah jurnal ter-flag
   yang ada semata agar corong menyempit secara meyakinkan; ketiganya lalu
   dicetak dengan "% dari tahap sebelumnya" di bawah lencana "SA 240 · ¶32",
   yaitu paragraf tentang pemilihan jurnal DARI POPULASI. Angka populasi adalah
   klaim audit, bukan hiasan tata letak: sekarang seluruh nilai corong turunan
   dari populasi yang benar-benar dimuat (jet_selection.ts, dapat diuji dengan
   populasi lain termasuk populasi KOSONG), dan layar MENYATAKAN bahwa populasi
   jurnal entitas belum ada di aplikasi alih-alih menyiratkan sebaliknya.
   ============================================================ */
const { useState: useStateJ } = React;

/* Kriteria & populasi jurnal ditarik dari sumber kanonik bersama
   (AMS_FORENSIC) — populasi yang SAMA dipakai Forensic Cash Flow. */
const JET_CRITERIA = (AMS_FORENSIC && AMS_FORENSIC.JET_CRITERIA) || [];
const JE_POP = (AMS_FORENSIC && AMS_FORENSIC.JOURNAL_POP) || [];

/* tipe struktural minimal event input — hindari explicit-any (ratchet) */
type Ev = { target: { value: string } };

const JET_SEED: JetState = {
  activeCrit: JET_CRITERIA.filter(c => c.on).map(c => c.id),
  minAmt: 0,
  tested: {},
};

/* Peran warna tiap tahap corong — token semantik, bukan hex (CLAUDE.md §5). */
const STAGE_TOKEN: Record<JetStageId, string> = {
  loaded: 'var(--navy)',
  criteria: 'var(--amber)',
  selected: 'var(--red)',
  disposed: 'var(--green)',
};

function JournalEntryTesting() {
  const { fmt } = AMS;
  const uid = React.useId();   /* id kontrol form unik per instans (gerbang a11y_field_labels) */
  const firm = useFirm();
  /* Identitas sesi nyata (W7). Kertas kerja yang penyusunnya bernama "Auditor"
     tidak memenuhi SA 230 — bila identitas tak tersedia, disposisi TIDAK
     dicatat sama sekali, bukan dicatat atas nama pengganti. */
  const { full: me } = useCurrentAuditor();
  const bolehCatat = canRecord(me);
  const locked = !!(firm && firm.locked);

  /* engagement-scoped (AMS_PERSIST_SCOPE: 'jet.v1' → engagement) — isolasi W7.5
     & RBAC WP_EDIT (bukan firm/FIRM_ADMIN). scopeId = perikatan aktif otomatis. */
  const [jet, setJet] = useAmsPersist('jet.v1', () => JET_SEED);
  const active: string[] = (jet && jet.activeCrit) || [];
  const minAmt: number = (jet && typeof jet.minAmt === 'number') ? jet.minAmt : 0;
  const tested = ((jet && jet.tested) || {}) as JetState['tested'];

  const [selId, setSelId] = useStateJ('JV-24-08841');

  const crit = JET_CRITERIA.map(c => ({ ...c, on: active.includes(c.id) }));
  const toggleCrit = (id: string) => { if (locked) return; setJet((s: JetState) => { const has = (s.activeCrit || []).includes(id); return { ...s, activeCrit: has ? s.activeCrit.filter(x => x !== id) : [...s.activeCrit, id] }; }); };
  const setMinAmt = (v: number) => { if (locked) return; setJet((s: JetState) => ({ ...s, minAmt: v })); };
  const stamp = () => jetStampDate(AMS.TODAY);   /* klok SSOT K-02, bukan jam sistem */
  const setTest = (id: string, status: JetStatus) => { if (locked || !bolehCatat) return; setJet((s: JetState) => recordDisposition(s, id, status, me, stamp())); };
  const setNote = (id: string, note: string) => { if (locked || !bolehCatat) return; setJet((s: JetState) => recordNote(s, id, note, me, stamp())); };

  /* skoring kriteria via canon bersama (SSOT) — populasi & kriteria SAMA dgn Forensic */
  const scored = AMS_FORENSIC.score(JE_POP, active);
  /* Dua penyaring kini terpisah: "memenuhi kriteria" (skor > 0) lalu "dipilih"
     (≥ ambang nilai). Dulu keduanya dihitung sekaligus, sehingga dua tahap
     corong selalu bernilai sama — dan itulah lubang yang ditambal `+38`. */
  const flagged = selectedForTest(scored, minAmt).sort((a, b) => b.score - a.score);
  const sel = scored.find(j => j.id === selId) || flagged[0];

  // user stratification
  const byUser: Record<string, number> = {};
  JE_POP.forEach(j => { byUser[j.user] = (byUser[j.user] || 0) + 1; });
  const userStrat = Object.entries(byUser).sort((a, b) => b[1] - a[1]);
  const maxUser = Math.max(...userStrat.map(u => u[1]));

  const exceptions = Object.values(tested).filter(t => t && t.status === 'exception').length;
  const critLabel = (id: string) => JET_CRITERIA.find(c => c.id === id)?.label || id;

  const funnel: JetStage[] = jetFunnel(scored, minAmt, tested);
  const dispoTitle = locked
    ? 'Perikatan terkunci — disposisi tak dapat diubah.'
    : (!bolehCatat ? 'Identitas sesi tak tersedia — disposisi tidak dicatat tanpa nama penyusun (SA 230).' : undefined);

  return (
    <>
      <SubBar moduleId="jet" right={
        <div className="row gap8 ac">
          <Badge kind="blue">SA 240 · ¶32</Badge>
          <Badge kind="amber">Populasi entitas belum dimuat</Badge>
          {locked && <Badge kind="gray">Terkunci</Badge>}
        </div>
      } />
      <div className="view-scroll">
        <div className="view-pad">
          <div style={{ marginBottom: 12 }}><DiagnosticPanel area="jet" title="Diagnostik JET — Temuan Otomatis" /></div>

          {/* Pernyataan populasi — berdiri SEBELUM corong, karena corong di
              bawahnya menghitung penyaringan, bukan cakupan. */}
          <Panel noBody>
            <div style={{ padding: '13px 16px', borderLeft: '3px solid var(--amber)', background: 'var(--amber-bg)' }}>
              <div className="row ac gap6" style={{ marginBottom: 5 }}>
                <I.alert size={14} />
                <b style={{ fontSize: 13 }}>Populasi jurnal entitas belum tersedia di aplikasi</b>
              </div>
              <div className="tiny" style={{ lineHeight: 1.5 }}>
                Buku besar klien belum dapat diimpor, sehingga Asseris tidak mengetahui berapa jumlah jurnal
                entitas maupun berapa di antaranya jurnal manual. Corong di bawah menghitung penyaringan atas{' '}
                <b>{fmt(JE_POP.length, 0)} baris jurnal</b> yang benar-benar dimuat ke JET — <b>cakupan terhadap
                populasi entitas tidak dapat disimpulkan darinya</b>, dan kesimpulan SA 240 ¶32 tentang pemilihan
                dari populasi belum dapat ditandatangani atas dasar layar ini.
              </div>
              <div className="tiny muted" style={{ lineHeight: 1.5, marginTop: 6 }}>
                Yang dibutuhkan agar corong menyatakan cakupan sesungguhnya: ekstrak buku besar per-perikatan
                (nomor jurnal · tanggal &amp; jam posting · user · akun D/K · nilai · penanda manual/otomatis),
                jumlah baris &amp; periode ekstrak untuk tie-out ke neraca saldo, serta alur impor dan validasinya.
                Populasi yang dimuat sekarang juga sama untuk setiap perikatan, sementara disposisi pengujiannya
                per-perikatan. Rinciannya: <span className="mono">docs/usulan-J-jet-impor-gl-populasi.md</span>.
              </div>
            </div>
          </Panel>

          {/* corong penyaringan — seluruh nilai turunan (jet_selection.ts) */}
          <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, margin: '12px 0' }}>
            {funnel.map(f => (
              <Panel key={f.id} noBody>
                <div style={{ padding: '15px 18px', borderTop: '3px solid ' + STAGE_TOKEN[f.id] }}>
                  <div className="mono" style={{ fontSize: 22, fontWeight: 700, color: 'var(--navy)' }}>{fmt(f.value, 0)}</div>
                  <div className="tiny muted upper">{f.label}</div>
                  {f.pctOfPrev !== null && (
                    <div className="tiny" style={{ marginTop: 3, color: 'var(--ink-4)' }}>{f.pctOfPrev.toFixed(1)}% dari tahap sebelumnya</div>
                  )}
                  <div className="tiny muted" style={{ marginTop: 6, lineHeight: 1.4 }}>{f.basis}</div>
                </div>
              </Panel>
            ))}
          </div>

          <div className="grid" style={{ gridTemplateColumns: '250px 1fr', gap: 12, alignItems: 'start' }}>
            {/* AI Tier-2: triage lintas-modul yang relevan ke JET */}
            <div style={{ gridColumn: '1 / -1' }}><AiInsightPanel scope="jet" title="AI · Triage Risiko Jurnal (lintas-modul)" embedded /></div>
            {/* criteria */}
            <div className="grid" style={{ gap: 12 }}>
              <Panel title="Kriteria Risiko" sub={active.length + ' aktif'}>
                <div style={{ padding: '2px 0' }}>
                  {crit.map(c => (
                    <div key={c.id} style={{ padding: '8px 2px', borderBottom: '1px solid var(--line-soft)' }}>
                      <Switch on={c.on} disabled={locked} label={c.label} onChange={() => toggleCrit(c.id)} />
                    </div>
                  ))}
                </div>
                <div className="divider" />
                <div className="row jb ac" style={{ marginBottom: 5 }}>
                  <label htmlFor={uid + '-minamt'} style={{ fontSize: 12, fontWeight: 600 }}>Ambang nilai minimum</label>
                  <span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>Rp {fmt(minAmt / 1e6, 0)} jt</span>
                </div>
                <input id={uid + '-minamt'} type="range" min="0" max="2000000000" step="50000000" value={minAmt} disabled={locked} onChange={(e: Ev) => setMinAmt(+e.target.value)} style={{ width: '100%', accentColor: 'var(--blue)' }} />
              </Panel>
              <Panel title="Stratifikasi per User" sub="frekuensi posting">
                <div style={{ display: 'grid', gap: 7 }}>
                  {userStrat.map(([u, n]) => (
                    <div key={u}>
                      <div className="row jb tiny" style={{ marginBottom: 2 }}><span className="mono">{u}</span><span className="mono" style={{ fontWeight: 700 }}>{n}</span></div>
                      <div style={{ height: 7, borderRadius: 4, background: 'var(--surface-3)' }}><div style={{ width: (n / maxUser * 100) + '%', height: '100%', borderRadius: 4, background: u.includes('adm') || u.includes('cfo') ? 'var(--amber)' : 'var(--blue)' }} /></div>
                    </div>
                  ))}
                </div>
                <div className="tiny muted" style={{ marginTop: 8, lineHeight: 1.4 }}>User non-rutin yang menjurnal manual (mis. <b className="mono">cfo.user</b>) menambah risiko management override.</div>
              </Panel>
            </div>

            {/* flagged table + detail */}
            <div className="grid" style={{ gap: 12 }}>
              <Panel noBody>
                <div className="panel-h"><h3>Jurnal Ter-flag</h3><div style={{ flex: 1 }} /><span className="tiny muted">{flagged.length} entri · {exceptions} eksepsi</span></div>
                <table className="dtbl">
                  <thead><tr>
                    <th>No. Jurnal</th><th>Tanggal</th><th>User</th><th className="num">Nilai (Rp)</th><th className="num" style={{ width: 60 }}>Skor</th><th style={{ width: 120 }}>Status Uji</th>
                  </tr></thead>
                  <tbody>
                    {flagged.map(j => (
                      <tr key={j.id} className={j.id === sel.id ? 'sel' : ''} onClick={() => setSelId(j.id)} style={{ cursor: 'pointer' }}>
                        <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{j.id}</td>
                        <td className="mono tiny">{j.date} <span className="muted">{j.time}</span></td>
                        <td className="mono tiny">{j.user}</td>
                        <td className="num">{fmt(j.amount)}</td>
                        <td className="num">
                          <span style={{ display: 'inline-grid', placeItems: 'center', width: 22, height: 22, borderRadius: 5, fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 11, color: 'var(--on-dark-fg)', background: j.score >= 4 ? 'var(--red-solid)' : j.score >= 2 ? 'var(--amber-solid)' : 'var(--green-solid)' }}>{j.score}</span>
                        </td>
                        <td>
                          {tested[j.id]?.status === 'clear' ? <Badge kind="green">Clear</Badge>
                            : tested[j.id]?.status === 'exception' ? <Badge kind="red">Eksepsi</Badge>
                              : <Badge kind="gray">Belum diuji</Badge>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Panel>

              {/* detail */}
              {sel && (
                <Panel noBody>
                  <div style={{ background: 'var(--surface-2)', padding: '15px 18px', borderBottom: '1px solid var(--line)' }} className="row ac gap8">
                    <span className="mono" style={{ fontWeight: 700, color: 'var(--blue)' }}>{sel.id}</span>
                    <span className="tiny muted mono">{sel.date} · {sel.time} · {sel.user}</span>
                    <div style={{ flex: 1 }} />
                    <span className="badge" style={{ background: sel.score >= 4 ? 'var(--red-solid)' : 'var(--amber-solid)', color: 'var(--on-dark-fg)' }}>Skor risiko {sel.score}</span>
                  </div>
                  <div style={{ padding: 14 }}>
                    <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div>
                        <div className="tiny muted upper" style={{ marginBottom: 6 }}>Entri Jurnal</div>
                        <table className="dtbl" style={{ border: '1px solid var(--line)' }}>
                          <thead><tr><th>Akun</th><th className="num">Debit</th><th className="num">Kredit</th></tr></thead>
                          <tbody>
                            <tr><td>{sel.dr}</td><td className="num">{fmt(sel.amount)}</td><td className="num muted">—</td></tr>
                            <tr><td>{sel.cr}</td><td className="num muted">—</td><td className="num">{fmt(sel.amount)}</td></tr>
                          </tbody>
                          <tfoot><tr><td>Total</td><td className="num">{fmt(sel.amount)}</td><td className="num">{fmt(sel.amount)}</td></tr></tfoot>
                        </table>
                      </div>
                      <div>
                        <div className="tiny muted upper" style={{ marginBottom: 6 }}>Alasan Ter-flag</div>
                        <div className="row wrap gap6" style={{ marginBottom: 14 }}>
                          {sel.hit.length ? sel.hit.map(h => <span key={h} className="badge b-red" style={{ textTransform: 'none', letterSpacing: 0 }}><I.flag size={11} /> {critLabel(h)}</span>) : <span className="tiny muted">Tidak ada (kriteria nonaktif)</span>}
                        </div>
                        <div className="tiny muted upper" style={{ marginBottom: 6 }}>Konklusi Pengujian</div>
                        <div className="row gap8">
                          <Btn sm variant={tested[sel.id]?.status === 'clear' ? 'primary' : undefined} disabled={locked || !bolehCatat} title={dispoTitle} onClick={() => setTest(sel.id, 'clear')}><I.check size={14} /> Tandai Clear</Btn>
                          <Btn sm disabled={locked || !bolehCatat} title={dispoTitle} onClick={() => setTest(sel.id, 'exception')} style={{ color: 'var(--red)', borderColor: 'var(--red)', background: tested[sel.id]?.status === 'exception' ? 'var(--red-bg)' : undefined }}><I.alert size={14} /> Eksepsi</Btn>
                        </div>
                        {!bolehCatat && <div className="tiny" style={{ marginTop: 6, color: 'var(--red)' }}>Identitas sesi tak tersedia — disposisi tidak dicatat tanpa nama penyusun (SA 230).</div>}
                        {tested[sel.id]?.status === 'exception' && (
                          <div style={{ marginTop: 10 }}>
                            <label htmlFor={uid + '-note'} className="tiny muted upper" style={{ display: 'block', marginBottom: 5 }}>Tindak Lanjut Jurnal Anomali</label>
                            <textarea id={uid + '-note'} className="input" rows={2} disabled={locked || !bolehCatat} value={tested[sel.id]?.note || ''} placeholder="Sifat & sebab penyimpangan, dokumen pendukung, dampak ke SAD / area lain…" onChange={(e: Ev) => setNote(sel.id, e.target.value)} style={{ width: '100%', resize: 'vertical', fontSize: 12, lineHeight: 1.45 }} />
                          </div>
                        )}
                        {tested[sel.id]?.at && <div className="tiny muted" style={{ marginTop: 8 }}>Disimpan oleh <b>{tested[sel.id]?.by}</b> · {tested[sel.id]?.at}</div>}
                      </div>
                    </div>
                  </div>
                </Panel>
              )}
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <WpPanel moduleId="jet" title="Kertas Kerja — Sign-off, Bukti & Kesimpulan (SA 240 / JET · SA 230)" />
          </div>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { JournalEntryTesting });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { JournalEntryTesting };
