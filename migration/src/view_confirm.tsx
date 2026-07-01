/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { useAmsPersist, useNav } from './contexts';
import { I } from './icons';
import { SubBar } from './shell';
import { Badge, Btn, Donut, MiniBars, Panel, Seg, Stat, Tabs } from './ui';
import { KvBox } from './view_analytical';
import { CF_AREA, CONFIRMATIONS, CONF_TYPES, CfAltProcedures, CfMeta, CfReconWorksheet, CfReliability, CfTrack, STATUS_KIND } from './view_confirm_parts';

/* ============================================================
   Asseris — Confirmation Hub (Pusat Konfirmasi Pihak Ketiga)
   Tabs: Ringkasan · Daftar Konfirmasi · Rekonsiliasi & Tindak Lanjut
   (constants + reusable parts live in view_confirm_parts.jsx)
   ============================================================ */
const { useState: useStateCF, useMemo: useMemoCF } = React;

/* ---------- enriched detail rail (Register tab) ---------- */
function CfDetailPanel(props: any) {
  const { sel, recon, setRecon, altChecks, setAltChecks, relChecks, setRelChecks, onMarkReceived, onResolveRecon, onResolveAlt } = props;
  const { fmt } = AMS;
  if (!sel) return null;
  const variance = sel.resp != null ? sel.resp - sel.amount : 0;
  const outstanding = sel.status === 'Sent' || sel.status === 'No Reply';

  return (
    <Panel noBody>
      <div style={{ background: 'linear-gradient(120deg,#013a52,#005085)', color: '#fff', padding: '13px 15px' }}>
        <div className="row ac gap8" style={{ marginBottom: 4 }}>
          <span className="mono" style={{ fontWeight: 700 }}>{sel.id}</span>
          <Badge kind={(CONF_TYPES as any)[sel.type].k}>{sel.type}</Badge>
          <div style={{ flex: 1 }} />
          <Badge kind={(STATUS_KIND as any)[sel.status]}>{sel.status}</Badge>
        </div>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{sel.party}</div>
        <div className="tiny" style={{ color: '#bcd6e4' }}>Dikirim {sel.sent} · jatuh tempo {sel.due} · {sel.days} hari berjalan</div>
      </div>
      <div style={{ padding: 14, maxHeight: 'calc(100vh - 250px)', overflow: 'auto' }}>
        {/* method / channel / contact */}
        <div className="panel" style={{ padding: '10px 12px', boxShadow: 'none', marginBottom: 12, display: 'grid', gap: 9 }}>
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 9 }}>
            <CfMeta icon="send" label="Metode" value={sel.method + ' · ' + (sel.method === 'Positif' ? 'minta jawaban' : 'jawab bila beda')} />
            <CfMeta icon="mail" label="Kanal" value={sel.channel} accent={sel.channel === 'e-Confirm' ? 'var(--green)' : null} />
          </div>
          <CfMeta icon="users" label="Kontak Counterparty" value={sel.contact} />
        </div>

        {/* balances */}
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <KvBox label="Saldo per Buku" v={sel.amount ? 'Rp ' + fmt(sel.amount / 1e6, 0) + ' jt' : '—'} />
          <KvBox label="Saldo per Respons" v={sel.resp != null ? 'Rp ' + fmt(sel.resp / 1e6, 0) + ' jt' : 'Belum ada'} accent={sel.resp == null ? 'var(--ink-4)' : (variance ? 'var(--red)' : 'var(--green)')} />
        </div>

        {/* reliability — only once a response exists */}
        {sel.resp != null && <CfReliability item={sel} checks={relChecks} setChecks={setRelChecks} />}

        {/* exception handling */}
        {sel.status === 'Discrepancy' && (
          <div style={{ marginBottom: 12 }}><CfReconWorksheet item={sel} recon={recon} setRecon={setRecon} onResolve={onResolveRecon} compact /></div>
        )}
        {sel.status === 'No Reply' && (
          <div style={{ marginBottom: 12 }}><CfAltProcedures item={sel} checks={altChecks} setChecks={setAltChecks} onResolve={onResolveAlt} /></div>
        )}

        {/* attachments */}
        <div className="tiny muted upper" style={{ marginBottom: 6 }}>Dokumen</div>
        <div style={{ display: 'grid', gap: 5, marginBottom: 12 }}>
          {[
            { n: 'Surat konfirmasi — ' + sel.id + '.pdf', s: 'Terkirim ' + sel.sent, ok: true },
            sel.resp != null
              ? { n: 'Respons ' + sel.party.replace('PT ', '').slice(0, 22) + '.pdf', s: 'Diterima +' + sel.days + ' hari', ok: true }
              : { n: 'Menunggu dokumen respons', s: sel.days + ' hari berjalan', ok: false },
          ].map((f, i) => (
            <div key={i} className="row ac gap8" style={{ padding: '6px 9px', border: '1px solid var(--line)', borderRadius: 5, background: f.ok ? '#fff' : 'var(--surface-2)' }}>
              <span style={{ color: f.ok ? 'var(--blue)' : 'var(--ink-4)' }}><I.doc size={15} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="truncate" style={{ fontSize: 11.5, fontWeight: 600, color: f.ok ? 'var(--ink)' : 'var(--ink-4)' }}>{f.n}</div>
                <div className="tiny muted">{f.s}</div>
              </div>
              {f.ok && <button className="btn sm icon" title="Unduh"><I.download size={13} /></button>}
            </div>
          ))}
        </div>

        {/* follow-up / reminder log */}
        <div className="tiny muted upper" style={{ marginBottom: 6 }}>Riwayat & Tindak Lanjut</div>
        <div style={{ display: 'grid', gap: 0, marginBottom: 12 }}>
          {[
            ['Draft konfirmasi disiapkan', sel.sent],
            ['Konfirmasi dikirim (' + sel.channel + ')', sel.sent],
            ...(Array.from({ length: sel.reminders }, (_, i) => ['Pengingat ke-' + (i + 1) + ' dikirim', '+' + ((i + 1) * 10) + ' hari'])),
            ...(sel.resp != null ? [['Respons diterima & divalidasi', '+' + sel.days + ' hari']] : [['Menunggu respons', sel.days + ' hari berjalan']]),
          ].map((h, i, arr) => {
            const last = i === arr.length - 1;
            const pending = last && sel.resp == null;
            const reminder = h[0].startsWith('Pengingat');
            return (
              <div key={i} className="row gap8" style={{ padding: '5px 0' }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: pending ? 'var(--amber)' : reminder ? 'var(--blue-400)' : 'var(--green)', marginTop: 3, flex: '0 0 9px' }} />
                <div style={{ flex: 1 }}><span style={{ fontSize: 12 }}>{h[0]}</span><span className="tiny muted mono" style={{ float: 'right' }}>{h[1]}</span></div>
              </div>
            );
          })}
        </div>

        {/* actions */}
        <div className="row gap8">
          {outstanding && <Btn sm style={{ flex: 1 }}><I.send size={13} /> Kirim Pengingat</Btn>}
          {outstanding && <Btn sm variant="primary" style={{ flex: 1 }} onClick={() => onMarkReceived(sel.id)}><I.check size={14} /> Tandai Diterima</Btn>}
          {!outstanding && (
            <div className="panel" style={{ flex: 1, padding: '8px 11px', background: 'var(--green-bg)', borderColor: 'transparent', fontSize: 11.5, fontWeight: 600, color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <I.checkCircle size={14} /> {sel.status === 'Discrepancy' ? 'Selisih dalam rekonsiliasi' : 'Bukti konfirmasi memadai'}
            </div>
          )}
        </div>
      </div>
    </Panel>
  );
}

/* ---------- Tab 1 · Ringkasan ---------- */
function CfOverview({ items, segs, rate, onJump }: any) {
  const { fmt } = AMS;
  const responded = items.filter((c: any) => c.resp != null).length;
  const concluded = items.filter((c: any) => c.status === 'Received').length;
  const discrepancies = items.filter((c: any) => c.status === 'Discrepancy').length;
  const noReply = items.filter((c: any) => c.status === 'No Reply').length;
  const outstanding = items.filter((c: any) => c.status === 'Sent' || c.status === 'No Reply').length;
  const total = items.length;

  // pipeline funnel
  const pipe = [
    { l: 'Disiapkan', v: total, c: 'var(--ink-4)' },
    { l: 'Dikirim', v: total, c: 'var(--blue-400)' },
    { l: 'Direspons', v: responded, c: 'var(--blue)' },
    { l: 'Tervalidasi', v: items.filter((c: any) => c.resp != null && c.validated).length, c: 'var(--teal)' },
    { l: 'Disimpulkan', v: concluded, c: 'var(--green)' },
  ];

  // turnaround (received only) + aging (outstanding)
  const respDays = items.filter((c: any) => c.resp != null).map((c: any) => c.days);
  const avgDays = respDays.length ? Math.round(respDays.reduce((a: any, b: any) => a + b, 0) / respDays.length) : 0;
  const aging = [
    { l: '0–15 hari', v: items.filter((c: any) => c.resp == null && c.days <= 15).length, c: 'var(--green)' },
    { l: '16–30 hari', v: items.filter((c: any) => c.resp == null && c.days > 15 && c.days <= 30).length, c: 'var(--amber)' },
    { l: '> 30 hari', v: items.filter((c: any) => c.resp == null && c.days > 30).length, c: 'var(--red)' },
  ];

  // worklist
  const work = [
    ...items.filter((c: any) => c.status === 'Discrepancy').map((c: any) => ({ c, kind: 'Diskrepansi', col: 'var(--red)', txt: 'Selisih ' + fmt((c.resp - c.amount) / 1e6, 1) + ' jt — perlu rekonsiliasi' })),
    ...items.filter((c: any) => c.status === 'No Reply').map((c: any) => ({ c, kind: 'Tanpa Respons', col: 'var(--amber)', txt: c.days + ' hari — jalankan prosedur alternatif' })),
    ...items.filter((c: any) => c.status === 'Sent' && c.days > 25).map((c: any) => ({ c, kind: 'Jatuh Tempo', col: 'var(--blue)', txt: c.days + ' hari — kirim pengingat' })),
  ];

  return (
    <div className="grid" style={{ gap: 12 }}>
      {/* coverage */}
      <Panel title="Analisis Cakupan Konfirmasi" sub="SA 505 — cakupan nilai per area laporan keuangan" actions={<Badge kind="blue">Per Nilai</Badge>}>
        <div style={{ padding: '4px 0' }}>
          {CF_AREA.map((a, idx) => {
            const its = items.filter((c: any) => c.type === a.type);
            const conf = its.reduce((s: any, c: any) => s + c.amount, 0);
            const resp = its.filter((c: any) => c.resp != null).reduce((s: any, c: any) => s + c.amount, 0);
            const cov = a.pop ? conf / a.pop * 100 : 0;
            const respPct = conf ? resp / conf * 100 : 0;
            return (
              <div key={a.type} style={{ padding: '10px 14px', borderTop: idx ? '1px solid var(--line-soft)' : 0 }}>
                <div className="row jb ac" style={{ marginBottom: 6 }}>
                  <span className="row ac gap8">
                    <span style={{ color: 'var(--' + (CONF_TYPES as any)[a.type].k.replace('blue', 'blue').replace('teal', 'teal').replace('purple', 'purple').replace('red', 'red') + ')' }}>{React.createElement((I as any)[(CONF_TYPES as any)[a.type].icon], { size: 15 })}</span>
                    <span style={{ fontWeight: 600, fontSize: 12.5 }}>{a.caption}</span>
                    <Badge kind={(CONF_TYPES as any)[a.type].k}>{its.length} konf.</Badge>
                  </span>
                  <span className="mono tiny muted">populasi Rp {fmt(a.pop / 1e6, 0)} jt</span>
                </div>
                <div className="grid" style={{ gridTemplateColumns: '1fr 116px 116px', gap: 12, alignItems: 'center' }}>
                  <div>
                    <CfTrack pct={cov} color={'var(--' + (CONF_TYPES as any)[a.type].k + ')'} />
                    <div className="tiny muted" style={{ marginTop: 4 }}>{a.note}</div>
                  </div>
                  <div>
                    <div className="mono" style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)' }}>{cov.toFixed(0)}%</div>
                    <div className="tiny muted upper">cakupan nilai</div>
                  </div>
                  <div>
                    <div className="mono" style={{ fontSize: 15, fontWeight: 700, color: respPct >= 75 ? 'var(--green)' : 'var(--amber)' }}>{respPct.toFixed(0)}%</div>
                    <div className="tiny muted upper">direspons</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      <div className="grid" style={{ gridTemplateColumns: '1.3fr 1fr', gap: 12, alignItems: 'start' }}>
        {/* pipeline */}
        <Panel title="Siklus Konfirmasi" sub="status pipeline">
          <div style={{ padding: '6px 14px 12px' }}>
            {pipe.map((s, i) => {
              const pct = Math.round(s.v / pipe[0].v * 100);
              return (
                <div key={s.l} style={{ marginBottom: i < pipe.length - 1 ? 11 : 0 }}>
                  <div className="row jb ac" style={{ marginBottom: 4 }}>
                    <span className="row ac gap8" style={{ fontSize: 12 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: s.c }} />{s.l}</span>
                    <span className="mono" style={{ fontWeight: 700, fontSize: 12.5 }}>{s.v}<span className="muted" style={{ fontWeight: 500 }}> / {pipe[0].v}</span></span>
                  </div>
                  <CfTrack pct={pct} color={s.c} h={7} />
                </div>
              );
            })}
            <div className="row jb ac" style={{ marginTop: 13, paddingTop: 11, borderTop: '1px solid var(--line)' }}>
              <span className="tiny muted upper">Belum direspons</span>
              <span className="mono" style={{ fontWeight: 700, color: outstanding ? 'var(--amber)' : 'var(--green)' }}>{outstanding} konfirmasi</span>
            </div>
          </div>
        </Panel>

        {/* turnaround + aging */}
        <Panel title="Turnaround & Aging" sub="hari ke respons">
          <div style={{ padding: '12px 14px' }}>
            <div className="row gap12 ac" style={{ marginBottom: 12 }}>
              <div>
                <div className="mono" style={{ fontSize: 26, fontWeight: 700, color: 'var(--navy)', lineHeight: 1 }}>{avgDays}<span style={{ fontSize: 13, color: 'var(--ink-3)' }}> hari</span></div>
                <div className="tiny muted upper">Rata-rata turnaround</div>
              </div>
              <div style={{ flex: 1 }} />
              <MiniBars data={respDays.length ? respDays : [0]} width={120} height={40} color="#0a6b73" />
            </div>
            <div className="tiny muted upper" style={{ marginBottom: 6 }}>Aging — outstanding</div>
            <div style={{ display: 'grid', gap: 7 }}>
              {aging.map(a => (
                <div key={a.l} className="row ac gap8">
                  <span style={{ width: 9, height: 9, borderRadius: 2, background: a.c, flex: '0 0 9px' }} />
                  <span style={{ fontSize: 11.5, flex: 1 }}>{a.l}</span>
                  <span className="mono" style={{ fontWeight: 700, color: a.c }}>{a.v}</span>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </div>

      {/* worklist */}
      <Panel title="Tindak Lanjut & Pengecualian" sub={work.length + ' butir memerlukan tindakan'} actions={<Btn sm onClick={() => onJump('worklist')}>Buka workbench <I.arrowRight size={13} /></Btn>}>
        {work.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--green)' }}><I.checkCircle size={22} /><div style={{ fontSize: 12.5, fontWeight: 600, marginTop: 6 }}>Tidak ada pengecualian terbuka</div></div>
        ) : (
          <div>
            {work.map((w, i) => (
              <div key={w.c.id} className="row ac gap10" style={{ padding: '9px 14px', borderTop: i ? '1px solid var(--line-soft)' : 0, cursor: 'pointer' }} onClick={() => onJump('worklist', w.c.id)}>
                <span style={{ width: 6, height: 30, borderRadius: 3, background: w.col, flex: '0 0 6px' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="row ac gap6"><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{w.c.id}</span><span style={{ fontSize: 12.5, fontWeight: 600 }} className="truncate">{w.c.party}</span></div>
                  <div className="tiny muted">{w.txt}</div>
                </div>
                <Badge kind={w.kind === 'Diskrepansi' ? 'red' : w.kind === 'Tanpa Respons' ? 'amber' : 'blue'}>{w.kind}</Badge>
                <I.chevron size={14} style={{ color: 'var(--ink-4)' }} />
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

/* ---------- Tab 3 · Rekonsiliasi & Tindak Lanjut ---------- */
function CfWorklist(props: any) {
  const { items, recon, setRecon, altChecks, setAltChecks, onResolveRecon, onResolveAlt, focusId, nav } = props;
  const { fmt } = AMS;
  const discs = items.filter((c: any) => c.status === 'Discrepancy');
  const noReplies = items.filter((c: any) => c.status === 'No Reply');
  const grossDiff = discs.reduce((s: any, c: any) => s + Math.abs(c.resp - c.amount), 0);

  // synthetic audit trail
  const trail: any[] = [];
  items.forEach((c: any) => {
    trail.push({ t: c.sent, who: 'Sistem', ev: 'Konfirmasi ' + c.id + ' dikirim via ' + c.channel + ' ke ' + c.party.replace('PT ', ''), col: 'var(--blue-400)' });
    for (let i = 0; i < c.reminders; i++) trail.push({ t: c.sent, who: 'Dimas R.', ev: 'Pengingat ke-' + (i + 1) + ' — ' + c.id + ' (' + c.party.replace('PT ', '') + ')', col: 'var(--amber)' });
    if (c.resp != null) trail.push({ t: '+' + c.days + 'h', who: c.channel === 'e-Confirm' ? 'e-Confirm' : 'Dimas R.', ev: 'Respons ' + c.id + ' diterima' + (c.status === 'Discrepancy' ? ' — DISKREPANSI Rp ' + fmt(Math.abs(c.resp - c.amount) / 1e6, 0) + ' jt' : ' & divalidasi'), col: c.status === 'Discrepancy' ? 'var(--red)' : 'var(--green)' });
  });

  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 320px', gap: 12, alignItems: 'start' }}>
      <div className="grid" style={{ gap: 12 }}>
        {/* discrepancies */}
        <Panel title="Diskrepansi — Rekonsiliasi" sub={discs.length + ' butir · selisih bruto Rp ' + fmt(grossDiff / 1e6, 1) + ' jt'} actions={<Badge kind="red">{discs.length} terbuka</Badge>}>
          <div style={{ padding: discs.length ? 12 : 0, display: 'grid', gap: 12 }}>
            {discs.length === 0 && <div style={{ padding: 22, textAlign: 'center', color: 'var(--green)' }}><I.checkCircle size={20} /><div className="tiny" style={{ marginTop: 5, fontWeight: 600 }}>Seluruh diskrepansi terekonsiliasi</div></div>}
            {discs.map((c: any) => (
              <div key={c.id} id={'wl-' + c.id} className="grid" style={{ gridTemplateColumns: '210px 1fr', gap: 12, alignItems: 'start', padding: focusId === c.id ? 8 : 0, background: focusId === c.id ? 'var(--blue-050)' : 'transparent', borderRadius: 6, outline: focusId === c.id ? '1px solid var(--blue-100)' : 'none' }}>
                <div>
                  <div className="row ac gap6" style={{ marginBottom: 3 }}><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{c.id}</span><Badge kind={(CONF_TYPES as any)[c.type].k}>{c.type}</Badge></div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{c.party}</div>
                  <div className="tiny muted" style={{ marginTop: 2 }}>{c.contact.split(' · ')[0]}</div>
                  <div className="panel" style={{ marginTop: 8, padding: '7px 9px', boxShadow: 'none', background: 'var(--surface-2)' }}>
                    <div className="row jb tiny"><span className="muted">Buku</span><span className="mono">{fmt(c.amount / 1e6, 1)}</span></div>
                    <div className="row jb tiny"><span className="muted">Respons</span><span className="mono">{fmt(c.resp / 1e6, 1)}</span></div>
                    <div className="row jb tiny" style={{ marginTop: 2, paddingTop: 2, borderTop: '1px solid var(--line)' }}><span style={{ fontWeight: 700 }}>Selisih</span><span className="mono" style={{ fontWeight: 700, color: 'var(--red)' }}>{fmt((c.resp - c.amount) / 1e6, 1)}</span></div>
                  </div>
                </div>
                <CfReconWorksheet item={c} recon={recon} setRecon={setRecon} onResolve={onResolveRecon} />
              </div>
            ))}
          </div>
        </Panel>

        {/* no replies */}
        <Panel title="Tanpa Respons — Prosedur Alternatif" sub={noReplies.length + ' butir memerlukan bukti alternatif'} actions={<Badge kind="amber">{noReplies.length} terbuka</Badge>}>
          <div style={{ padding: noReplies.length ? 12 : 0, display: 'grid', gap: 12 }}>
            {noReplies.length === 0 && <div style={{ padding: 22, textAlign: 'center', color: 'var(--green)' }}><I.checkCircle size={20} /><div className="tiny" style={{ marginTop: 5, fontWeight: 600 }}>Seluruh non-respons telah disimpulkan</div></div>}
            {noReplies.map((c: any) => (
              <div key={c.id} id={'wl-' + c.id} className="grid" style={{ gridTemplateColumns: '210px 1fr', gap: 12, alignItems: 'start', padding: focusId === c.id ? 8 : 0, background: focusId === c.id ? 'var(--blue-050)' : 'transparent', borderRadius: 6, outline: focusId === c.id ? '1px solid var(--blue-100)' : 'none' }}>
                <div>
                  <div className="row ac gap6" style={{ marginBottom: 3 }}><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{c.id}</span><Badge kind={(CONF_TYPES as any)[c.type].k}>{c.type}</Badge></div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{c.party}</div>
                  <div className="row ac gap6" style={{ marginTop: 6 }}>
                    <Badge kind="amber">{c.days} hari</Badge>
                    <span className="tiny muted">{c.reminders}× pengingat</span>
                  </div>
                  {c.amount > 0 && <div className="tiny muted mono" style={{ marginTop: 6 }}>Saldo: Rp {fmt(c.amount / 1e6, 0)} jt</div>}
                </div>
                <CfAltProcedures item={c} checks={altChecks} setChecks={setAltChecks} onResolve={onResolveAlt} />
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* side: SAD projection + audit trail */}
      <div className="grid" style={{ gap: 12 }}>
        <Panel title="Proyeksi ke SAD" sub="salah saji teridentifikasi">
          <div style={{ padding: '12px 14px' }}>
            <div className="mono" style={{ fontSize: 24, fontWeight: 700, color: grossDiff ? 'var(--red)' : 'var(--green)', lineHeight: 1 }}>Rp {fmt(grossDiff / 1e6, 1)} <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>jt</span></div>
            <div className="tiny muted" style={{ marginTop: 3 }}>selisih bruto dari {discs.length} diskrepansi</div>
            <div className="divider" />
            <div className="tiny" style={{ lineHeight: 1.55, color: 'var(--ink-2)' }}>
              Selisih yang <b>tak terjelaskan</b> setelah rekonsiliasi <b>dibawa auditor</b> ke <b>Summary of Audit Differences</b> (SA 450) untuk evaluasi terhadap materialitas.
            </div>
            <Btn sm style={{ width: '100%', marginTop: 10 }} onClick={() => nav('sad', { from: 'confirm' })}><I.arrowRight size={13} /> Buka SAD Ledger</Btn>
          </div>
        </Panel>

        <Panel title="Jejak Audit e-Confirmation" sub="log dispatch & respons">
          <div style={{ padding: '8px 12px', maxHeight: 420, overflow: 'auto' }}>
            {trail.slice(0, 16).map((e, i) => (
              <div key={i} className="row gap8" style={{ padding: '6px 0', borderTop: i ? '1px solid var(--line-soft)' : 0 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: e.col, marginTop: 4, flex: '0 0 8px' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11.5, lineHeight: 1.4 }}>{e.ev}</div>
                  <div className="tiny muted mono">{e.who} · {e.t}</div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ---------- Status Kertas Kerja SA 505 (Fase 2 · module-only) ----------
   Cermin kelengkapan 3 bukti wajib WP_MODULE_MAP.confirm dari hasil kerja
   nyata & persisten (engagement-scoped). Tanda tangan + lampiran dokumen
   tetap via panel "Kertas Kerja" SubBar global (wpState, server-enforced). */
function CfWpStatus({ wp }: any) {
  return (
    <Panel title="Status Kertas Kerja SA 505" sub="kelengkapan prosedur dari hasil kerja (persisten · per-perikatan)"
      actions={<Badge kind={wp.all ? 'green' : 'amber'}>{wp.done}/{wp.reqs.length} bukti wajib</Badge>}>
      <div style={{ padding: '4px 0' }}>
        {wp.reqs.map((r: any, i: any) => (
          <div key={i} className="row ac gap10" style={{ padding: '9px 14px', borderTop: i ? '1px solid var(--line-soft)' : 0 }}>
            <span style={{ color: r.done ? 'var(--green)' : 'var(--ink-4)', flex: '0 0 17px' }}>
              {r.done ? <I.checkCircle size={17} /> : <span style={{ width: 15, height: 15, borderRadius: '50%', border: '2px solid var(--line-strong)', display: 'inline-block' }} />}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600 }}>{r.label}</div>
              <div className="tiny muted">{r.detail}</div>
            </div>
            <Badge kind={r.done ? 'green' : 'gray'}>{r.done ? 'Terpenuhi' : 'Belum'}</Badge>
          </div>
        ))}
      </div>
      <div className="tiny muted" style={{ padding: '8px 14px 2px', lineHeight: 1.5, borderTop: '1px solid var(--line)' }}>
        Tanda tangan preparer/reviewer &amp; lampiran bukti dokumen via panel <b>Kertas Kerja</b> di bilah atas
        (SA 230, server-enforced). Status di atas mencerminkan kelengkapan prosedur SA 505 dari hasil kerja modul ini.
      </div>
    </Panel>
  );
}

/* ============================================================
   Root — ConfirmationHub
   ============================================================ */
function ConfirmationHub() {
  const { fmt } = AMS;
  const nav = useNav();

  /* Fase 1 — kesimpulan kerja SA 505 PERSISTEN & engagement-scoped (bertahan reload,
     terisolasi per-perikatan). UI-state (tab/filter/seleksi) tetap efemeral lokal.
     Bentuk: override per-id atas seed CONFIRMATIONS + sub-state rekonsiliasi/alternatif/
     keandalan. Key statis 'confirmState.v1' + AMS_PERSIST_SCOPE=engagement → isolasi
     dibawa scopeId, capForWrite=WP_EDIT (semua auditor) + isolasi W7.5. */
  const [cfState, setCfState] = useAmsPersist('confirmState.v1', { overrides: {}, recon: {}, altChecks: {}, relChecks: {} });
  const { recon, altChecks, relChecks } = cfState;

  const [tab, setTab] = useStateCF('overview');
  const [fType, setFType] = useStateCF('All');
  const [fStatus, setFStatus] = useStateCF('All');
  const [selId, setSelId] = useStateCF('CF-005');
  const [focusId, setFocusId] = useStateCF(null);

  // items = seed + override persisten (status/resp/validated hasil kerja auditor)
  const items = useMemoCF(() => CONFIRMATIONS.map((c: any) => {
    const ov = (cfState.overrides as any)[c.id];
    return ov ? { ...c, ...ov } : c;
  }), [cfState.overrides]);

  // setter adaptor: tulis slice ke dalam objek persisten (mempertahankan signatur updater lama)
  const setRecon = (u: any) => setCfState((s: any) => ({ ...s, recon: typeof u === 'function' ? u(s.recon) : u }));
  const setAltChecks = (u: any) => setCfState((s: any) => ({ ...s, altChecks: typeof u === 'function' ? u(s.altChecks) : u }));
  const setRelChecks = (u: any) => setCfState((s: any) => ({ ...s, relChecks: typeof u === 'function' ? u(s.relChecks) : u }));
  const setOverride = (id: any, patch: any) => setCfState((s: any) => ({ ...s, overrides: { ...s.overrides, [id]: { ...(s.overrides[id] || {}), ...patch } } }));

  const filtered = items.filter((c: any) => (fType === 'All' || c.type === fType) && (fStatus === 'All' || c.status === fStatus));
  const sel = items.find((c: any) => c.id === selId) || filtered[0];

  const total = items.length;
  const received = items.filter((c: any) => c.status === 'Received' || c.status === 'Discrepancy').length;
  const outstanding = items.filter((c: any) => c.status === 'Sent' || c.status === 'No Reply').length;
  const discrepancies = items.filter((c: any) => c.status === 'Discrepancy').length;
  const noReply = items.filter((c: any) => c.status === 'No Reply').length;
  const rate = Math.round(received / total * 100);

  const segs = [
    { label: 'Received', value: items.filter((c: any) => c.status === 'Received').length, color: '#1f7a4d' },
    { label: 'Discrepancy', value: discrepancies, color: '#b3261e' },
    { label: 'Sent', value: items.filter((c: any) => c.status === 'Sent').length, color: '#005085' },
    { label: 'No Reply', value: noReply, color: '#c79a1e' },
  ];

  const markReceived = (id: any) => { const c = items.find((x: any) => x.id === id); setOverride(id, { status: 'Received', resp: c ? c.amount : null, validated: true }); };
  const resolveRecon = (id: any) => setOverride(id, { status: 'Received' });
  const resolveAlt = (id: any) => setOverride(id, { status: 'Received' });

  /* Fase 2 — Status Kertas Kerja SA 505 (module-only, engagement-scoped via items).
     Petakan 3 bukti wajib WP_MODULE_MAP.confirm → kelengkapan dari hasil kerja nyata.
     TIDAK menyentuh store evidence global (ams.v1.evidence tak ber-scope perikatan →
     auto-attach akan bocor antar-perikatan). Tanda tangan & lampiran dokumen tetap via
     panel "Kertas Kerja" SubBar global (wpState, server-enforced). */
  const cfWp = useMemoCF(() => {
    const dispatched = items.filter((c: any) => c.status !== 'Draft').length;
    const discOpen = items.filter((c: any) => c.status === 'Discrepancy').length;
    const noReplyOpen = items.filter((c: any) => c.status === 'No Reply').length;
    const reqs = [
      { label: 'Register konfirmasi (terkirim/dijawab)', done: total > 0 && dispatched === total, detail: dispatched + '/' + total + ' konfirmasi terkirim' },
      { label: 'Rekonsiliasi selisih jawaban', done: discOpen === 0, detail: discOpen === 0 ? 'nihil diskrepansi terbuka' : discOpen + ' diskrepansi terbuka' },
      { label: 'Prosedur alternatif untuk non-jawaban (SA 505 ¶12)', done: noReplyOpen === 0, detail: noReplyOpen === 0 ? 'nihil non-jawaban terbuka' : noReplyOpen + ' non-jawaban terbuka' },
    ];
    const done = reqs.filter(r => r.done).length;
    return { reqs, done, all: done === reqs.length };
  }, [items, total]);

  const jump = (t: any, id: any) => { setTab(t); if (id) { setFocusId(id); setSelId(id); } };

  const tabs = [
    { id: 'overview', label: 'Ringkasan' },
    { id: 'register', label: 'Daftar Konfirmasi', count: total },
    { id: 'worklist', label: 'Rekonsiliasi & Tindak Lanjut', count: discrepancies + noReply },
  ];

  return (
    <>
      <SubBar moduleId="confirm" right={
        <div className="row gap8 ac">
          <Badge kind="gray" title="Simulasi — pengiriman & impor saldo nyata via konektor (W9)">demo</Badge>
          <Btn sm title="Simulasi — impor saldo nyata via konektor (W9)"><I.upload size={13} /> Import Saldo</Btn>
          <Btn sm title="Simulasi — pengiriman nyata via konektor (W9)"><I.send size={13} /> Kirim Pengingat ({outstanding})</Btn>
          <Btn sm variant="primary" title="Simulasi — pengiriman nyata via konektor (W9)"><I.send size={14} /> Kirim Batch Konfirmasi</Btn>
        </div>
      } />
      <div className="view-scroll">
        <div className="view-pad">
          {/* KPI strip — persistent across tabs */}
          <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr) 1.2fr', gap: 12, marginBottom: 12 }}>
            <Panel><div style={{ padding: '11px 14px' }}><Stat value={total} label="Total Konfirmasi" /></div></Panel>
            <Panel><div style={{ padding: '11px 14px' }}><Stat value={rate + '%'} label="Response Rate" accent={rate >= 75 ? 'var(--green)' : 'var(--amber)'} /></div></Panel>
            <Panel><div style={{ padding: '11px 14px' }}><Stat value={outstanding} label="Outstanding" accent={outstanding ? 'var(--amber)' : 'var(--green)'} /></div></Panel>
            <Panel><div style={{ padding: '11px 14px' }}><Stat value={discrepancies} label="Diskrepansi" accent={discrepancies ? 'var(--red)' : 'var(--green)'} /></div></Panel>
            <Panel><div style={{ padding: '8px 14px' }}>
              <div className="row gap12 ac">
                <Donut segments={segs} size={62} thickness={10} center={<div className="mono" style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>{rate}%</div>} />
                <div style={{ flex: 1 }}>
                  {segs.map(s => <div key={s.label} className="row jb ac" style={{ fontSize: 10.5 }}><span className="row ac" style={{ gap: 5 }}><span style={{ width: 7, height: 7, borderRadius: 2, background: s.color }} />{s.label}</span><b className="mono">{s.value}</b></div>)}
                </div>
              </div>
            </div></Panel>
          </div>

          {/* tabs */}
          <div style={{ marginBottom: 12 }}><Tabs tabs={tabs} active={tab} onChange={(t: any) => { setTab(t); setFocusId(null); }} /></div>

          {tab === 'overview' && <div className="grid" style={{ gap: 12 }}><CfWpStatus wp={cfWp} /><CfOverview items={items} segs={segs} rate={rate} onJump={jump} /></div>}

          {tab === 'register' && (
            <>
              <div className="row jb ac" style={{ marginBottom: 10 }}>
                <div className="row ac gap8">
                  <span className="tiny muted upper">Tipe:</span>
                  <Seg options={['All', ...Object.keys(CONF_TYPES)]} value={fType} onChange={setFType} />
                </div>
                <div className="row ac gap8">
                  <span className="tiny muted upper">Status:</span>
                  <Seg options={['All', 'Received', 'Sent', 'Discrepancy', 'No Reply']} value={fStatus} onChange={setFStatus} />
                </div>
              </div>
              <div className="grid" style={{ gridTemplateColumns: '1fr 384px', gap: 12, alignItems: 'start' }}>
                <Panel noBody>
                  <div style={{ maxHeight: 'calc(100vh - 360px)', overflow: 'auto' }}>
                    <table className="dtbl">
                      <thead><tr>
                        <th style={{ width: 58 }}>ID</th><th>Pihak / Counterparty</th><th>Tipe</th><th style={{ width: 70 }}>Metode</th>
                        <th className="num">Saldo Buku</th><th className="num">Respons</th><th className="num" style={{ width: 52 }}>Umur</th><th style={{ width: 108 }}>Status</th>
                      </tr></thead>
                      <tbody>
                        {filtered.map((c: any) => {
                          const vr = c.resp != null ? c.resp - c.amount : null;
                          return (
                            <tr key={c.id} className={c.id === selId ? 'sel' : ''} onClick={() => setSelId(c.id)} style={{ cursor: 'pointer' }}>
                              <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{c.id}</td>
                              <td className="truncate" style={{ maxWidth: 190, fontWeight: 600 }}>{c.party}</td>
                              <td><Badge kind={(CONF_TYPES as any)[c.type].k}>{c.type}</Badge></td>
                              <td className="tiny" style={{ color: c.channel === 'e-Confirm' ? 'var(--green)' : 'var(--ink-3)', fontWeight: 600 }}>{c.method[0]} · {c.channel === 'e-Confirm' ? 'e-Conf' : c.channel}</td>
                              <td className="num">{c.amount ? fmt(c.amount / 1e6, 0) : '—'}</td>
                              <td className="num">{c.resp != null ? fmt(c.resp / 1e6, 0) : <span className="muted">pending</span>}</td>
                              <td className="num tiny" style={{ color: c.days > 30 && (c.status === 'Sent' || c.status === 'No Reply') ? 'var(--red)' : 'var(--ink-3)' }}>{c.days}h</td>
                              <td>
                                <span className="row ac gap6">
                                  <Badge kind={(STATUS_KIND as any)[c.status]}>{c.status}</Badge>
                                  {vr != null && vr !== 0 && <span className="tiny mono" style={{ color: 'var(--red)' }} title="Selisih">Δ{fmt(vr / 1e6, 0)}</span>}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Panel>
                <CfDetailPanel
                  sel={sel} recon={recon} setRecon={setRecon} altChecks={altChecks} setAltChecks={setAltChecks}
                  relChecks={relChecks} setRelChecks={setRelChecks}
                  onMarkReceived={markReceived} onResolveRecon={resolveRecon} onResolveAlt={resolveAlt}
                />
              </div>
            </>
          )}

          {tab === 'worklist' && (
            <CfWorklist
              items={items} recon={recon} setRecon={setRecon} altChecks={altChecks} setAltChecks={setAltChecks}
              onResolveRecon={resolveRecon} onResolveAlt={resolveAlt} focusId={focusId} nav={nav}
            />
          )}
        </div>
      </div>
    </>
  );
}

Object.assign(window, { ConfirmationHub });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { ConfirmationHub };
