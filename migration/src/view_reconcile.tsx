/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { AMS_CANON } from './canon';
import { useAudit, useNav } from './contexts';
import { I } from './icons';
import { Badge, Btn, Panel, Stat } from './ui';

/* ============================================================
   Asseris — Rekonsiliasi Angka Lintas-Modul (tie-out)
   ------------------------------------------------------------
   Tab di modul Alur Data. Menjadikan Working Trial Balance (buku
   besar) sebagai SATU sumber kebenaran, lalu mencocokkan angka
   yang dipakai modul-modul konsumen (PSAK 24/46/71/73, ECL, FS
   Generator). Variance ditandai live mengikuti AJE yang diposting.
   ============================================================ */
const { useMemo: useMemoRC } = React;

const RC_STAT = {
  ok:   { kind: 'green', icon: 'checkCircle', label: 'Cocok' },
  warn: { kind: 'amber', icon: 'alert',       label: 'Telusuri' },
  err:  { kind: 'red',   icon: 'x',           label: 'Selisih' },
};

function rcJt(n: any) { return 'Rp ' + AMS.fmt(Math.round(n)) + ' jt'; }

/* ---- node kecil untuk diagram lineage ---- */
function RCNode({ icon, title, sub, accent, onClick }: any) {
  return (
    <div onClick={onClick} className="panel" style={{ padding: '9px 11px', minWidth: 0, flex: '1 1 0', cursor: onClick ? 'pointer' : 'default', borderTop: '3px solid ' + accent }}>
      <div className="row ac gap8" style={{ marginBottom: 1 }}>
        <span style={{ width: 22, height: 22, borderRadius: 6, background: accent, color: '#fff', display: 'grid', placeItems: 'center', flex: '0 0 22px' }}>{React.createElement((I as any)[icon] || I.panel, { size: 13 })}</span>
        <span style={{ fontSize: 12, fontWeight: 700 }} className="truncate">{title}</span>
      </div>
      <div className="tiny muted truncate">{sub}</div>
    </div>
  );
}
function RCArrow() {
  return <div style={{ display: 'flex', alignItems: 'center', padding: '0 4px', color: 'var(--ink-4)', flex: '0 0 auto' }}><I.arrowRight size={16} /></div>;
}

/* ---- satu baris rekonsiliasi (sumber → konsumen) ---- */
function RCRow({ r, nav }: any) {
  const st = (RC_STAT as any)[r.status];
  const tol = 1;
  return (
    <div className="panel" style={{ padding: 0, overflow: 'hidden', marginBottom: 10, borderLeft: '3px solid var(--' + st.kind + ')' }}>
      <div className="row ac gap8" style={{ padding: '10px 13px', borderBottom: '1px solid var(--line-soft)' }}>
        <span style={{ color: 'var(--' + st.kind + ')', flex: '0 0 16px' }}>{React.createElement((I as any)[st.icon] || I.panel, { size: 16 })}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="row ac gap8"><span style={{ fontSize: 13, fontWeight: 700 }} className="truncate">{r.pos}</span><Badge kind="gray">{r.ref}</Badge></div>
        </div>
        <span className="tiny muted" style={{ flex: '0 0 auto' }}>selisih {rcJt(r.variance)}</span>
        <Badge kind={st.kind}>{st.label}</Badge>
      </div>

      <div style={{ padding: '11px 13px', display: 'grid', gap: 9 }}>
        {/* sumber kebenaran */}
        <div onClick={r.sourceRoute ? () => nav(r.sourceRoute) : undefined} className="row ac gap8" style={{ padding: '8px 11px', borderRadius: 8, background: 'var(--navy-bg, var(--surface-2))', cursor: r.sourceRoute ? 'pointer' : 'default' }}>
          <span style={{ width: 7, height: 7, borderRadius: 99, background: 'var(--navy)', flex: '0 0 7px' }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="tiny upper muted" style={{ letterSpacing: '.05em', fontWeight: 700 }}>Sumber kebenaran</div>
            <div className="mono" style={{ fontSize: 11.5, fontWeight: 600 }}>{r.sourceLabel}</div>
          </div>
          <span className="mono" style={{ fontSize: 13, fontWeight: 800, whiteSpace: 'nowrap' }}>{rcJt(r.source)}</span>
          {r.sourceRoute && <I.chevron size={13} style={{ color: 'var(--ink-4)' }} />}
        </div>

        {/* konsumen */}
        <div style={{ display: 'grid', gap: 5, paddingLeft: 4 }}>
          {r.consumers.map((c: any, i: any) => {
            const off = Math.abs(c.val - r.source) > tol;
            return (
              <div key={i} onClick={c.module ? () => nav(c.module) : undefined} className="row ac gap8" style={{ padding: '5px 8px', borderRadius: 6, cursor: c.module ? 'pointer' : 'default' }}>
                <I.arrowRight size={11} style={{ color: 'var(--ink-4)', flex: '0 0 11px' }} />
                <span style={{ flex: 1, minWidth: 0, fontSize: 12 }} className="truncate">{c.label}</span>
                <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: off ? 'var(--amber)' : 'var(--ink)', whiteSpace: 'nowrap' }}>{rcJt(c.val)}</span>
                {off ? <span style={{ color: 'var(--amber)', flex: '0 0 14px' }}><I.alert size={13} /></span> : <span style={{ color: 'var(--green)', flex: '0 0 14px' }}><I.checkCircle size={13} /></span>}
              </div>
            );
          })}
        </div>

        {/* angka pendukung */}
        {r.extra && r.extra.length > 0 && (
          <div className="row" style={{ gap: 6, flexWrap: 'wrap', paddingLeft: 4 }}>
            {r.extra.map((e: any, i: any) => (
              <span key={i} className="row ac gap8" style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, background: 'var(--surface-2)' }}>
                <span className="muted">{e.label}</span><span className="mono" style={{ fontWeight: 700 }}>{rcJt(e.val)}</span>
              </span>
            ))}
          </div>
        )}

        <div className="tiny muted" style={{ lineHeight: 1.45 }}>{r.note}</div>
      </div>
    </div>
  );
}

function DFRekonsiliasi() {
  const nav = useNav();
  const { wtb } = useAudit();
  const canon = AMS_CANON;

  const R = useMemoRC(() => canon.reconcile(wtb), [wtb]);
  const rows = R.accounting;

  const ok = rows.filter((r: any) => r.status === 'ok').length;
  const warn = rows.filter((r: any) => r.status === 'warn').length;
  const err = rows.filter((r: any) => r.status === 'err').length;
  const dtaVar = Math.abs(R.dt.dtaVariance);

  /* ---- tie-out keuangan firma (fee perikatan aktif lintas-modul) ---- */
  const fmt = AMS.fmt;
  const pppk = ((AMS.PPPK_CLIENTS as any[]) || []).find(c => c.id === 'C-014');
  const crm = ((AMS.CRM_360 || {}) as any)['C-014'];
  const crmAudit = crm && crm.contracts ? crm.contracts.find((c: any) => /Audit/.test(c.type)) : null;
  const feePppk = pppk ? pppk.fee : null;                         // Rp juta
  const feeCrm = crmAudit ? Math.round(crmAudit.value / 1e6) : null;
  const feeTie = feePppk != null && feeCrm != null && Math.abs(feePppk - feeCrm) <= 1;

  return (
    <div className="view-scroll"><div className="view-pad">
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 12 }}>
        <Panel><div style={{ padding: '15px 18px' }}><Stat value={rows.length} label="Pos Terhubung ke Sumber" /></div></Panel>
        <Panel><div style={{ padding: '15px 18px' }}><Stat value={ok} label="Tie-out Cocok" accent="var(--green)" /></div></Panel>
        <Panel><div style={{ padding: '15px 18px' }}><Stat value={warn + err} label="Perlu Ditelusuri" accent={(warn + err) ? 'var(--amber)' : 'var(--green)'} /></div></Panel>
        <Panel><div style={{ padding: '15px 18px' }}><Stat value={rcJt(dtaVar)} label="Selisih DTA (model − buku)" accent={dtaVar > 1 ? 'var(--amber)' : 'var(--green)'} /></div></Panel>
      </div>

      {/* ---- lineage angka ---- */}
      <Panel title="Lineage Angka Akuntansi" sub="satu sumber (WTB) → kertas kerja → laporan" className="" >
        <div style={{ padding: 13 }}>
          <div className="row" style={{ alignItems: 'stretch', gap: 0, flexWrap: 'nowrap' }}>
            <RCNode icon="table" title="WTB" sub="Buku besar · saldo akun" accent="#1f7a4d" onClick={() => nav('wtb')} />
            <RCArrow />
            <div style={{ display: 'grid', gap: 6, flex: '1.3 1 0', minWidth: 0 }}>
              <RCNode icon="users" title="PSAK 24" sub="Imbalan kerja" accent="#5b3fa6" onClick={() => nav('psak24')} />
              <RCNode icon="coins" title="PSAK 71 · ECL" sub="CKPN piutang" accent="#5b3fa6" onClick={() => nav('ecl')} />
              <RCNode icon="building" title="PSAK 73" sub="Sewa / ROU" accent="#5b3fa6" onClick={() => nav('psak73')} />
            </div>
            <RCArrow />
            <RCNode icon="receipt" title="PSAK 46" sub="Pajak tangguhan" accent="#005085" onClick={() => nav('psak46')} />
            <RCArrow />
            <div style={{ display: 'grid', gap: 6, flex: '1 1 0', minWidth: 0 }}>
              <RCNode icon="ledger" title="FS Generator" sub="Laporan keuangan" accent="#b06a00" onClick={() => nav('fsgen')} />
              <RCNode icon="gavel" title="Opini Audit" sub="SA 700/705" accent="#b06a00" onClick={() => nav('opinion')} />
            </div>
          </div>
          <div className="tiny muted" style={{ marginTop: 10, lineHeight: 1.5 }}>Setiap pos pajak tangguhan di PSAK 46 ditelusuri ke saldo akun WTB melalui kertas kerja sumbernya. Memposting AJE di modul WTB/AJE otomatis memperbarui angka di seluruh rantai ini.</div>
        </div>
      </Panel>

      {/* ---- tabel rekonsiliasi ---- */}
      <div style={{ height: 12 }} />
      <div className="row jb ac" style={{ marginBottom: 8 }}>
        <h3 style={{ fontSize: 13, fontWeight: 700 }}>Rekonsiliasi Pos Akuntansi Entitas — PT Sentosa Makmur</h3>
        <Btn sm onClick={() => nav('wtb')}><I.table size={13} /> Buka WTB</Btn>
      </div>
      {rows.map((r: any) => <RCRow key={r.id} r={r} nav={nav} />)}

      {/* ---- tie-out keuangan firma ---- */}
      <div style={{ height: 6 }} />
      <Panel title="Tie-out Keuangan Firma" sub="fee perikatan lintas-modul (ENG-2025-014 · PT Sentosa Makmur)">
        <div style={{ padding: 13, display: 'grid', gap: 9 }}>
          <div className="row ac gap8" style={{ padding: '8px 11px', borderRadius: 8, background: 'var(--surface-2)' }}>
            <span style={{ width: 7, height: 7, borderRadius: 99, background: 'var(--navy)', flex: '0 0 7px' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="tiny upper muted" style={{ letterSpacing: '.05em', fontWeight: 700 }}>Sumber kebenaran</div>
              <div className="mono" style={{ fontSize: 11.5, fontWeight: 600 }}>Engagement Letter · CRM 360</div>
            </div>
            <span className="mono" style={{ fontSize: 13, fontWeight: 800 }}>{feeCrm != null ? rcJt(feeCrm) : '—'}</span>
          </div>
          <div style={{ display: 'grid', gap: 5, paddingLeft: 4 }}>
            <div onClick={() => nav('pppk')} className="row ac gap8" style={{ padding: '5px 8px', borderRadius: 6, cursor: 'pointer' }}>
              <I.arrowRight size={11} style={{ color: 'var(--ink-4)', flex: '0 0 11px' }} />
              <span style={{ flex: 1, fontSize: 12 }}>Laporan PPPK · fee tahunan</span>
              <span className="mono" style={{ fontSize: 12, fontWeight: 700 }}>{feePppk != null ? rcJt(feePppk) : '—'}</span>
              <span style={{ color: feeTie ? 'var(--green)' : 'var(--amber)', flex: '0 0 14px' }}>{React.createElement(feeTie ? I.checkCircle : I.alert, { size: 13 })}</span>
            </div>
            <div onClick={() => nav('crm')} className="row ac gap8" style={{ padding: '5px 8px', borderRadius: 6, cursor: 'pointer' }}>
              <I.arrowRight size={11} style={{ color: 'var(--ink-4)', flex: '0 0 11px' }} />
              <span style={{ flex: 1, fontSize: 12 }}>CRM · nilai kontrak audit</span>
              <span className="mono" style={{ fontSize: 12, fontWeight: 700 }}>{feeCrm != null ? rcJt(feeCrm) : '—'}</span>
              <span style={{ color: 'var(--green)', flex: '0 0 14px' }}><I.checkCircle size={13} /></span>
            </div>
            {crm && (
              <div className="row" style={{ gap: 6, flexWrap: 'wrap', paddingTop: 2 }}>
                <span className="row ac gap8" style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, background: 'var(--surface-2)' }}><span className="muted">Ditagih YTD</span><span className="mono" style={{ fontWeight: 700 }}>Rp {fmt(Math.round(crm.billedYtd / 1e6))} jt</span></span>
                <span className="row ac gap8" style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, background: 'var(--surface-2)' }}><span className="muted">Piutang outstanding</span><span className="mono" style={{ fontWeight: 700 }}>Rp {fmt(Math.round(crm.outstanding / 1e6))} jt</span></span>
              </div>
            )}
          </div>
          <div className="tiny muted" style={{ lineHeight: 1.45 }}>Fee perikatan konsisten antara Engagement Letter (CRM), Laporan PPPK, dan modul Billing. Propagasi data master (materialitas, partner, fee) ke seluruh modul ditunjukkan pada tab <b>Propagasi</b>.</div>
        </div>
      </Panel>

      <div className="tiny muted" style={{ marginTop: 12, lineHeight: 1.5 }}>Rekonsiliasi ini menjadikan Working Trial Balance sebagai satu sumber kebenaran. Pos bertanda <b>Telusuri</b> bukan kesalahan aplikasi melainkan selisih yang wajar untuk ditindaklanjuti auditor (mis. dasar fiskal vs komersial, atau pos beda temporer tahun lalu) — sengaja ditampilkan agar transparan, bukan disembunyikan.</div>
    </div></div>
  );
}

Object.assign(window, { DFRekonsiliasi });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { DFRekonsiliasi };
