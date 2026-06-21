/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { useFirm, useNav } from './contexts.jsx';
import { I } from './icons.jsx';
import { SubBar } from './shell.jsx';
import { Btn, Donut, Panel } from './ui.jsx';
import { BoStat, BoTabPanel, boJt, boM } from './view_bo1.jsx';
import { FopsCalendar, FopsLineage, FopsVendorDrawer, FopsVendors } from './view_firmops2';
import { BO } from './data_backoffice';
import { LEGAL } from './data_legal';
import { SectionTitle } from './view_fpm_parts.jsx';

/* ============================================================
   NeoSuite AMS — Cockpit Operasi Firma (Backoffice & Firm Mgmt)
   Pusat kendali operasional firma: kesehatan sub-modul, komposisi
   biaya operasi (sumber sub-ledger), kalender kewajiban terpadu,
   konsumsi vendor, & rekonsiliasi lintas-modul.
   Reuse: boJt, boM, BoBadge, BoTabPanel, BoStat (view_bo1);
          KV, SectionTitle (fpm_parts); Panel, Donut, Stat (ui).
   ============================================================ */
const { useState: useStateFops, useMemo: useMemoFops } = React;

const FOPS_CLS = { Overhead: { c: '#5b3fa6', lbl: 'Overhead & Umum' }, Direct: { c: '#0a6b73', lbl: 'Beban Langsung' } };
const FOPS_PALETTE = ['#013a52', '#005085', '#0a6b73', '#2f7bb0', '#5b3fa6', '#9a6a00', '#1f7a4d', '#b3261e'];

/* kartu kesehatan sub-modul (klik → buka modul mendalam) */
function FopsModuleCard({ m, stat, sub, status, statusKind, onNav }) {
  const Ic = I[m.icon] || I.building;
  return (
    <button type="button" className="panel fops-card" onClick={() => onNav(m.id, { from: 'firmops' })}
      style={{ padding: '12px 13px', textAlign: 'left', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 7, border: '1px solid var(--line)', background: 'var(--surface-1)' }}>
      <div className="row ac gap8">
        <span style={{ width: 28, height: 28, borderRadius: 7, display: 'grid', placeItems: 'center', flex: '0 0 28px', background: m.c + '1a', color: m.c }}><Ic size={15} /></span>
        <span style={{ fontWeight: 600, fontSize: 12, lineHeight: 1.2 }}>{m.label}</span>
        <span style={{ marginLeft: 'auto', color: 'var(--ink-4)' }}><I.arrowRight size={13} /></span>
      </div>
      <div className="row ac jb" style={{ marginTop: 2 }}>
        <div>
          <div className="mono" style={{ fontSize: 17, fontWeight: 800, color: 'var(--navy)', lineHeight: 1 }}>{stat}</div>
          <div className="tiny muted" style={{ marginTop: 3 }}>{sub}</div>
        </div>
        {status && <span className={'badge b-' + statusKind} style={{ textTransform: 'none', flex: '0 0 auto' }}>{status}</span>}
      </div>
    </button>
  );
}

function FirmOps() {
  const firm = useFirm();
  const nav = useNav();
  const [tab, setTab] = useStateFops('overview');
  const [vSel, setVSel] = useStateFops(null);
  const [calFilter, setCalFilter] = useStateFops('all');

  const B = BO;
  const F = window.FIRMOPS;
  const oc = useMemoFops(() => F.operatingCosts(), []);
  const obligations = useMemoFops(() => F.unifiedObligations(firm), [firm.engagements, firm.clients]);
  const spendRecon = useMemoFops(() => F.spendReconciliation(), []);
  const register = useMemoFops(() => (LEGAL ? LEGAL.buildRegister(firm) : []), [firm.engagements, firm.clients]);

  /* agregat ringkas */
  const nbv = F.sum(B.FIXED_ASSETS, a => a.nbv);
  const spendYtd = F.sum(B.SPEND_BY_CAT, s => s.v);
  const dueSoon = obligations.filter(o => o.days <= 90);
  const overdue = obligations.filter(o => o.days < 0);

  /* kesehatan tiap sub-modul (derived) */
  const pendingPO = B.PURCHASE_ORDERS.filter(p => p.status === 'Menunggu Approval');
  const maintLate = B.MAINTENANCE.filter(m => m.status === 'Terlambat');
  const archDue = B.ARCHIVES.filter(a => a.status === 'Jatuh Tempo');
  const holds = B.LEGAL_HOLDS.filter(h => h.status === 'Aktif');
  /* Retensi & Arsip — DITARIK dari lapisan kanonik (SSOT) bila tersedia. */
  const RET = window.RETENTION ? window.RETENTION.metrics() : null;
  const recArchives = RET ? RET.total : B.ARCHIVES.length;
  const recDue = RET ? RET.due : archDue.length;
  const recHolds = RET ? RET.holds : holds.length;
  const openLit = B.DISPUTES.filter(d => d.status !== 'Putusan');
  const polDue = B.POLICIES.filter(p => B.daysTo(p.akhir) <= 60);
  const travPend = B.TRIPS.filter(t => t.status === 'Menunggu Approval');
  const overCap = B.REIMBURSEMENTS.filter(r => r.klaim > r.plafon);
  const licSoon = [...B.FIRM_LICENSES, ...B.MEMBERSHIPS].filter(x => x.exp && B.daysTo(x.exp) <= 120);
  const pplShort = B.AP_LICENSES.filter(a => a.ppl < a.pplReq);

  const health = {
    procurement: { stat: boM(spendYtd, 1), sub: 'belanja YTD · ' + B.VENDORS.filter(v => v.status === 'Aktif').length + ' vendor aktif', status: pendingPO.length + ' PO pending', statusKind: pendingPO.length ? 'amber' : 'green' },
    facilities: { stat: boM(nbv, 1), sub: 'NBV aset · okupansi ' + Math.round(F.sum(B.SPACE, f => f.occ) / F.sum(B.SPACE, f => f.seats) * 100) + '%', status: maintLate.length ? maintLate.length + ' maint telat' : 'terjaga', statusKind: maintLate.length ? 'red' : 'green' },
    records: { stat: recArchives + ' arsip', sub: recDue + ' jatuh tempo musnah', status: recHolds + ' legal hold', statusKind: recHolds ? 'red' : 'green' },
    legal: { stat: register.length + ' kontrak', sub: 'registri SSOT terpadu', status: openLit.length + ' perkara', statusKind: openLit.length ? 'amber' : 'green' },
    insurance: { stat: boM(B.POLICIES.find(p => p.id === 'POL-PII').limit, 0), sub: 'limit PII · ' + B.POLICIES.length + ' polis', status: polDue.length ? polDue.length + ' jatuh tempo' : 'tercakup', statusKind: polDue.length ? 'amber' : 'green' },
    travel: { stat: 'Rp ' + AMS.fmt(F.sum(B.TRAVEL_TREND, t => t.v), 0) + ' jt', sub: 'biaya YTD · ' + travPend.length + ' pengajuan', status: overCap.length ? overCap.length + ' lewat plafon' : 'sesuai plafon', statusKind: overCap.length ? 'amber' : 'green' },
    licensing: { stat: B.AP_LICENSES.length + ' AP · ' + B.FIRM_LICENSES.length + ' izin', sub: licSoon.length + ' perpanjangan ≤120h', status: pplShort.length ? pplShort.length + ' PPL kurang' : 'patuh', statusKind: pplShort.length ? 'red' : 'green' },
  };

  const tabs = [
    { id: 'overview', label: 'Ikhtisar Operasi' },
    { id: 'opex', label: 'Komposisi Biaya Operasi' },
    { id: 'calendar', label: 'Kalender Kewajiban', count: dueSoon.length },
    { id: 'vendor', label: 'Vendor & Konsumsi', count: B.VENDORS.length },
    { id: 'lineage', label: 'Lineage & Rekonsiliasi' },
  ];

  return (
    <>
      <SubBar moduleId="firmops" right={
        <div className="row gap8 ac">
          {overdue.length > 0 && <span className="chip tiny" style={{ color: 'var(--red)' }} title="Kewajiban melewati tenggat"><I.alert size={11} /> {overdue.length} lewat tempo</span>}
          <span className="chip tiny"><I.link2 size={11} /> {register.length} kontrak · {B.VENDORS.length} vendor</span>
          <Btn sm><I.download size={13} /> Paket Operasi</Btn>
        </div>
      } />
      <div className="view-scroll"><div className="view-pad">

        <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
          <BoStat value={boM(oc.overheadAnnual, 2)} label="Beban Overhead (run-rate/thn)" accent="var(--purple)" />
          <BoStat value={boM(spendYtd, 1)} label="Belanja Vendor YTD" />
          <BoStat value={boM(nbv, 1)} label="Nilai Buku Aset (NBV)" accent="var(--blue)" />
          <BoStat value={dueSoon.length} label="Kewajiban Jatuh Tempo ≤90h" accent={overdue.length ? 'var(--red)' : dueSoon.length ? 'var(--amber)' : 'var(--green)'} />
        </div>

        <BoTabPanel tabs={tabs} tab={tab} setTab={setTab}>

          {/* ====================== IKHTISAR ====================== */}
          {tab === 'overview' && (
            <div className="view-pad" style={{ paddingTop: 14 }}>
              <SectionTitle right={<span className="tiny muted">klik kartu untuk membuka modul mendalam</span>}>Kesehatan Sub-Modul Operasi</SectionTitle>
              <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 16 }}>
                {F.SUBMODULES.map(m => <FopsModuleCard key={m.id} m={m} {...health[m.id]} onNav={nav} />)}
                <div className="panel" style={{ padding: '12px 13px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6, background: 'var(--blue-050)', borderColor: 'var(--blue-100)' }}>
                  <div className="row ac gap8"><I.link2 size={14} style={{ color: 'var(--blue)' }} /><b style={{ fontSize: 11.5 }}>Satu sumber kebenaran</b></div>
                  <div className="tiny muted" style={{ lineHeight: 1.45 }}>Tiap angka ditarik dari sub-ledger pemiliknya. Cockpit tidak menyimpan salinan.</div>
                </div>
              </div>

              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 14, alignItems: 'start' }}>
                <Panel title="Komposisi Beban Operasi" sub="run-rate · sumber sub-ledger">
                  <div className="row gap14" style={{ alignItems: 'center' }}>
                    <Donut size={120} thickness={17}
                      segments={oc.rows.map((r, i) => ({ label: r.label, value: r.amount, color: FOPS_PALETTE[i % FOPS_PALETTE.length] }))}
                      center={<><div className="mono" style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>{AMS.fmt(oc.total / 1e9, 1)}M</div><div className="tiny muted">total</div></>} />
                    <div style={{ flex: 1 }}>
                      {oc.rows.map((r, i) => (
                        <div key={r.key} className="row jb ac" style={{ padding: '4px 0', borderBottom: '1px solid var(--line-soft)', cursor: 'pointer' }} onClick={() => { setTab('opex'); }}>
                          <span className="row ac gap8" style={{ minWidth: 0 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: FOPS_PALETTE[i % FOPS_PALETTE.length], flex: '0 0 8px' }} /><span className="tiny truncate" style={{ fontWeight: 600, maxWidth: 168 }}>{r.label}</span></span>
                          <span className="mono tiny" style={{ fontWeight: 700, flex: '0 0 auto' }}>{boJt(r.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Panel>

                <Panel title="Kewajiban Terdekat" sub={dueSoon.length + ' item ≤90 hari · lintas modul'}>
                  <div style={{ display: 'grid', gap: 7 }}>
                    {obligations.slice(0, 7).map((o, i) => {
                      const meta = F.SUBMODULES.find(s => s.id === o.module) || {};
                      const Ic = I[meta.icon] || I.calendar;
                      const col = F.SEV_COLOR[F.sev(o.days)];
                      return (
                        <div key={i} className="row ac gap8" style={{ padding: '6px 8px', borderRadius: 7, border: '1px solid var(--line)', cursor: 'pointer' }} onClick={() => nav(o.module, { from: 'firmops' })}>
                          <span style={{ width: 24, height: 24, borderRadius: 6, display: 'grid', placeItems: 'center', flex: '0 0 24px', background: (meta.c || '#888') + '1a', color: meta.c }}><Ic size={12} /></span>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div className="tiny truncate" style={{ fontWeight: 600, maxWidth: 230 }}>{o.label}</div>
                            <div className="tiny muted">{o.kind} · {o.ref}</div>
                          </div>
                          <span className="mono tiny" style={{ fontWeight: 700, color: col, flex: '0 0 auto' }}>{o.days < 0 ? 'lewat ' + Math.abs(o.days) + 'h' : o.days + 'h'}</span>
                        </div>
                      );
                    })}
                  </div>
                  <button type="button" className="lin-cta" onClick={() => setTab('calendar')} style={{ marginTop: 10 }}>
                    <I.calendar size={13} /> Buka kalender kewajiban terpadu
                  </button>
                </Panel>
              </div>
            </div>
          )}

          {/* ====================== KOMPOSISI BIAYA OPERASI ====================== */}
          {tab === 'opex' && (
            <div className="view-pad" style={{ paddingTop: 14 }}>
              <div className="panel" style={{ padding: '12px 14px', marginBottom: 12, background: 'var(--blue-050)', borderColor: 'var(--blue-100)' }}>
                <div className="row ac gap8" style={{ marginBottom: 6 }}><I.link2 size={15} style={{ color: 'var(--blue)' }} /><b style={{ fontSize: 12.5 }}>Biaya operasi diturunkan dari sub-ledger — bukan diinput ulang</b></div>
                <div className="tiny muted" style={{ lineHeight: 1.55 }}>Tiap baris menunjuk modul sumbernya (sewa ← master vendor, penyusutan ← register aset PSAK 16, premi ← polis, iuran ← keanggotaan). Klasifikasi <b>Overhead</b>/<b>Beban Langsung</b> menentukan pos di Laba Rugi KAP (<b>Firm Finance</b>).</div>
              </div>
              <table className="dtbl">
                <thead><tr><th>Komponen Biaya</th><th>Klasifikasi</th><th>Dasar</th><th>Sumber (Sub-Ledger)</th><th className="num">Nilai (run-rate)</th><th></th></tr></thead>
                <tbody>
                  {oc.rows.map(r => (
                    <tr key={r.key}>
                      <td><div style={{ fontWeight: 600, fontSize: 11.5 }}>{r.label}</div><div className="tiny muted" style={{ maxWidth: 280, whiteSpace: 'normal', lineHeight: 1.3 }}>{r.detail}</div></td>
                      <td><span className="badge" style={{ textTransform: 'none', background: FOPS_CLS[r.cls].c + '1a', color: FOPS_CLS[r.cls].c }}>{FOPS_CLS[r.cls].lbl}</span></td>
                      <td className="tiny"><span className={'badge ' + (r.basis === 'tahunan' ? 'b-blue' : 'b-gray')} style={{ textTransform: 'none' }}>{r.basis === 'tahunan' ? 'Tahunan' : 'YTD'}</span></td>
                      <td className="tiny muted">{r.src}</td>
                      <td className="num" style={{ fontWeight: 600 }}>{boJt(r.amount)}</td>
                      <td><button className="btn sm" style={{ height: 22 }} onClick={() => nav(r.module, { from: 'firmops' })} title="Buka modul sumber"><I.arrowRight size={11} /></button></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr><td colSpan={4}>OVERHEAD & UMUM (run-rate tahunan + YTD)</td><td className="num">{boJt(oc.overheadYtd)}</td><td></td></tr>
                  <tr><td colSpan={4}>BEBAN LANGSUNG (alat audit + perjalanan)</td><td className="num">{boJt(oc.directTotal)}</td><td></td></tr>
                </tfoot>
              </table>

              <div className="panel" style={{ padding: '11px 13px', marginTop: 12 }}>
                <div className="row ac gap8" style={{ marginBottom: 6 }}><I.coins size={14} style={{ color: 'var(--navy)' }} /><b style={{ fontSize: 12 }}>Kontribusi ke Laba Rugi KAP</b><div style={{ flex: 1 }} /><button className="btn sm" onClick={() => nav('firmfinance', { from: 'firmops' })}><I.arrowRight size={11} /> Firm Finance</button></div>
                <div className="tiny muted" style={{ lineHeight: 1.55 }}>Komponen <b>Overhead</b> (Rp {AMS.fmt(oc.overheadAnnual / 1e6, 0)} jt/thn dasar tahunan) mengisi pos <b>“Beban overhead &amp; umum”</b>, dan <b>Beban Langsung</b> menambah <b>“Beban langsung staf &amp; pengiriman”</b> di Ikhtisar Laba Rugi KAP. Cockpit ini adalah sub-ledger; Firm Finance adalah buku besar ringkasannya.</div>
              </div>
            </div>
          )}

          {tab === 'calendar' && <FopsCalendar obligations={obligations} calFilter={calFilter} setCalFilter={setCalFilter} nav={nav} />}
          {tab === 'vendor' && <FopsVendors B={B} vSel={vSel} setVSel={setVSel} nav={nav} />}
          {tab === 'lineage' && <FopsLineage oc={oc} spendRecon={spendRecon} nbv={nbv} register={register} B={B} nav={nav} />}

        </BoTabPanel>
      </div></div>

      {vSel && <FopsVendorDrawer v={vSel} onClose={() => setVSel(null)} nav={nav} />}
    </>
  );
}
Object.assign(window, { FirmOps, FopsModuleCard, FOPS_CLS });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { FOPS_CLS, FirmOps, FopsModuleCard };
