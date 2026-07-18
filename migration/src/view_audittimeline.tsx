/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { useFirm, useNav } from './contexts';
import { I } from './icons';
import { SubBar } from './shell';
import { Btn, Panel, Progress, Seg, Stat } from './ui';

/* ============================================================
   Asseris — Jadwal & Lini Masa Audit (Practice Operations)
   Gantt aktivitas per-perikatan untuk diserahkan ke klien.
   SSOT: fase & milestone ditarik dari AMS.DELIVERY;
   "hari ini" dari DELIVERY_WINDOW.today. Aktivitas granular diperinci
   dari template di dalam jendela fase nyata; progres dihitung dari today.
   ============================================================ */
const { useState: useStateATL, useMemo: useMemoATL } = React;

const ATL_PHASE_COLOR = { Perencanaan: '#005085', Eksekusi: '#5b3fa6', Finalisasi: '#1f7a4d' };
const ATL_MS_COLOR = { done: '#1f7a4d', due: '#9a6a00', upcoming: '#61717c' };
const ATL_d = (s: any) => new Date(s + 'T00:00:00');
const ATL_ms = (s: any) => ATL_d(s).getTime();
const ATL_fmt = (s: any) => ATL_d(s).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
const ATL_fmtY = (s: any) => ATL_d(s).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
const ATL_daysTo = (s: any, today: any) => Math.round((ATL_ms(s) - ATL_ms(today)) / 864e5);
const ATL_iso = (t: any) => new Date(t).toISOString().slice(0, 10);
const ATL_tint = (hex: any, a: any) => { const n = parseInt(hex.slice(1), 16); return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')'; };

/* template aktivitas per fase — fraksi [a,b] di dalam jendela fase nyata.
   mod = modul/prosedur terkait yang dibuka saat baris diklik.
   tab (opsional, PRD 2026-07-18) = tab/lensa awal yang diseed di modul-tujuan
   via useInitialTab; tanpa tab → modul memakai default/last-used (perilaku lama). */
const ATL_TASKS = {
  Perencanaan: [
    { n: 'Penerimaan & keberlanjutan perikatan', ref: 'A-100', a: 0, b: .28, mod: 'onboarding' },
    { n: 'Pemahaman entitas & lingkungan', ref: 'A-200', a: .18, b: .55, mod: 'risk', tab: 'register' },
    { n: 'Penilaian risiko & penetapan materialitas', ref: 'A-300', a: .42, b: .78, mod: 'materiality' },
    { n: 'Penyusunan strategi & program audit', ref: 'A-310', a: .66, b: .92, mod: 'programme' },
    { n: 'Permintaan data awal (daftar PBC)', ref: 'A-410', a: .82, b: 1, mod: 'clientportal' },
  ],
  Eksekusi: [
    { n: 'Kas, bank & konfirmasi bank', ref: 'C-100', a: 0, b: .22, mod: 'confirm', tab: 'Bank' },
    { n: 'Piutang usaha & penurunan nilai (ECL)', ref: 'C-200', a: 0, b: .42, mod: 'ecl' },
    { n: 'Persediaan & penilaian', ref: 'C-300', a: .12, b: .46, mod: 'psak14', tab: 'nrv' },
    { n: 'Aset tetap & penyusutan', ref: 'C-400', a: .26, b: .60, mod: 'psak16', tab: 'register' },
    { n: 'Pendapatan & pengujian cut-off', ref: 'C-500', a: .30, b: .72, mod: 'psak72' },
    { n: 'Liabilitas & konfirmasi utang', ref: 'C-600', a: .46, b: .76, mod: 'confirm', tab: 'Utang' },
    { n: 'Pajak kini & tangguhan', ref: 'C-700', a: .58, b: .86, mod: 'psak46' },
    { n: 'Penyesuaian (AJE) & WTB final', ref: 'C-900', a: .84, b: 1, mod: 'aje' },
  ],
  Finalisasi: [
    { n: 'Reviu manajer', ref: 'R-200', a: 0, b: .42, mod: 'reviewnotes' },
    { n: 'Penilaian peristiwa kemudian', ref: 'R-300', a: .22, b: .62, mod: 'subsequent' },
    { n: 'Reviu partner', ref: 'R-400', a: .44, b: .76, mod: 'reviewnotes' },
    { n: 'Engagement Quality Review (EQR)', ref: 'R-500', a: .62, b: .9, mod: 'eqr' },
    { n: 'Penerbitan laporan auditor & opini', ref: 'R-700', a: .85, b: 1, mod: 'opinion' },
  ],
};

function ATL_lerp(ph: any, f: any) { return ATL_iso(ATL_ms(ph.start) + f * (ATL_ms(ph.end) - ATL_ms(ph.start))); }
function ATL_pct(s: any, e: any, today: any, done: any) {
  if (done) return 100;
  const t = ATL_ms(today), a = ATL_ms(s), b = ATL_ms(e);
  if (t <= a) return 0; if (t >= b) return 100;
  return Math.round((t - a) / (b - a) * 100);
}

function AuditTimeline() {
  const A: any = AMS;
  const { CLIENTS, ENGAGEMENTS, DELIVERY, DELIVERY_WINDOW, FIRM, fmt } = A;
  const today = DELIVERY_WINDOW.today;
  const firm = useFirm();
  const nav = useNav();

  // perikatan yang punya rencana pengiriman
  const planned = DELIVERY.map((d: any) => d.id);
  const defaultEng = (firm && firm.activeEngagementId && planned.includes(firm.activeEngagementId))
    ? firm.activeEngagementId : planned[0];
  const [engId, setEngId] = useStateATL(defaultEng);
  const [mode, setMode] = useStateATL('internal');

  const eng = ENGAGEMENTS.find((e: any) => e.id === engId) || {};
  const client = CLIENTS.find((c: any) => c.id === eng.clientId) || {};
  const plan = DELIVERY.find((d: any) => d.id === engId) || { phases: [], milestones: [] };
  const done = eng.status === 'Completed' || eng.phase === 'Arsip';

  // expand template → aktivitas di dalam jendela fase nyata
  const groups = useMemoATL(() => plan.phases.map((ph: any) => {
    const tpl = (ATL_TASKS as any)[ph.name] || [];
    const tasks = tpl.map((t: any) => {
      const s = ATL_lerp(ph, t.a), e = ATL_lerp(ph, t.b);
      return { ...t, s, e, pct: ATL_pct(s, e, today, done) };
    });
    return { ph, tasks };
  }), [engId, mode]);

  // jendela waktu = rentang fase + milestone (+ padding)
  const allDates: any[] = [];
  plan.phases.forEach((p: any) => { allDates.push(ATL_ms(p.start), ATL_ms(p.end)); });
  plan.milestones.forEach((m: any) => allDates.push(ATL_ms(m.date)));
  const pad = 4 * 864e5;
  const t0 = Math.min(...allDates) - pad, t1 = Math.max(...allDates) + pad;
  const frac = (s: any) => ((ATL_ms(s) - t0) / (t1 - t0)) * 100;

  const months = useMemoATL(() => {
    const out = []; const d = new Date(t0); d.setDate(1);
    while (d.getTime() <= t1) {
      out.push({ label: d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }), pos: ((d.getTime() - t0) / (t1 - t0)) * 100 });
      d.setMonth(d.getMonth() + 1);
    }
    return out;
  }, [engId]);

  // KPI
  const phEnd = plan.phases.length ? plan.phases[plan.phases.length - 1].end : null;
  const signMs = plan.milestones.find((m: any) => /sign|opini/i.test(m.label));
  const target = signMs ? signMs.date : eng.deadline;
  const durWk = plan.phases.length ? Math.round((ATL_ms(phEnd) - ATL_ms(plan.phases[0].start)) / 864e5 / 7) : 0;
  const dueSoon = plan.milestones.filter((m: any) => m.status !== 'done' && ATL_daysTo(m.date, today) >= 0 && ATL_daysTo(m.date, today) <= 14).length;
  const burn = eng.budgetHrs ? Math.round((eng.actualHrs || 0) / eng.budgetHrs * 100) : 0;
  const firmName = (FIRM && FIRM.name) || 'Kantor Akuntan Publik';

  const engSelect = (
    <select value={engId} onChange={(e: any) => setEngId(e.target.value)}
      style={{ height: 28, borderRadius: 4, border: '1px solid var(--line-strong)', background: 'var(--surface)', color: 'var(--ink)', fontSize: 12, fontWeight: 600, padding: '0 8px', maxWidth: 260 }}>
      {planned.map((id: any) => {
        const e2 = ENGAGEMENTS.find((x: any) => x.id === id) || {}; const c2 = CLIENTS.find((x: any) => x.id === e2.clientId) || {};
        return <option key={id} value={id}>{(c2.name || id)} · {id}</option>;
      })}
    </select>
  );

  return (
    <>
      <SubBar moduleId="audittimeline" right={
        <div className="row gap8 ac">
          {engSelect}
          <Seg options={[{ value: 'internal', label: 'Internal' }, { value: 'klien', label: 'Tampilan Klien' }]} value={mode} onChange={setMode} />
          <Btn sm onClick={() => window.print()}><I.download size={13} /> Cetak / PDF</Btn>
        </div>
      } />
      <div className="view-scroll"><div className="view-pad">

        {/* kop dokumen — tampil penuh di mode klien */}
        <Panel noBody style={{ marginBottom: 12, overflow: 'hidden' }}>
          <div style={{ background: 'linear-gradient(125deg,#013143,#002C3F)', color: '#eaf2f7', padding: mode === 'klien' ? '18px 20px' : '13px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 18 }}>
            <div>
              {mode === 'klien' && <div style={{ fontSize: 12, fontWeight: 600, color: '#9fb9c8', marginBottom: 6 }}>{firmName}</div>}
              <div style={{ fontSize: mode === 'klien' ? 19 : 15, fontWeight: 700, letterSpacing: '-.01em' }}>Jadwal &amp; Lini Masa Audit</div>
              <div style={{ fontSize: 12.5, color: '#bcd6e4', marginTop: 3 }}>{client.name || eng.id} · {eng.fy} · {eng.type}</div>
            </div>
            <div style={{ textAlign: 'right', fontSize: 11, color: '#9fb9c8', lineHeight: 1.7 }}>
              <div>Perikatan <b style={{ color: '#eaf2f7' }} className="mono">{eng.id}</b></div>
              <div>Partner <b style={{ color: '#eaf2f7' }}>{eng.partner || '—'}</b></div>
              <div>Per <b style={{ color: '#eaf2f7' }}>{ATL_fmtY(today)}</b></div>
            </div>
          </div>
        </Panel>

        {/* KPI tiles */}
        <div className="grid" style={{ gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginBottom: 12 }}>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={plan.phases.length ? ATL_fmt(plan.phases[0].start) : '—'} label="Mulai Perikatan" /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={phEnd ? ATL_fmt(phEnd) : '—'} label="Selesai Fieldwork" /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={target ? ATL_fmt(target) : '—'} label="Target Tanda Tangan Opini" accent="var(--green)" /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={'± ' + durWk + ' mg'} label="Durasi · 3 fase" /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}>
            <div className="row ac jb" style={{ marginBottom: 6 }}><span className="s-val" style={{ fontSize: 20, color: 'var(--navy)' }}>{eng.progress}%</span><span className="tiny muted">progres</span></div>
            <Progress value={eng.progress} color="var(--blue)" />
            <div className="s-lbl" style={{ marginTop: 6 }}>Progres Keseluruhan</div>
          </div></Panel>
        </div>

        {/* legend */}
        <div className="row ac" style={{ gap: 16, flexWrap: 'wrap', marginBottom: 10, fontSize: 11.5, color: 'var(--ink-2)' }}>
          {Object.entries(ATL_PHASE_COLOR).map(([k, v]) => <span key={k} className="row ac gap6"><span style={{ width: 20, height: 10, borderRadius: 3, background: v }} />{k}</span>)}
          <span style={{ width: 1, height: 14, background: 'var(--line)' }} />
          <span className="row ac gap6"><span style={{ width: 11, height: 11, transform: 'rotate(45deg)', background: 'var(--ink-2)', borderRadius: 2 }} />Milestone</span>
          {mode === 'internal' && <span className="row ac gap6"><span style={{ width: 20, height: 10, borderRadius: 3, background: 'linear-gradient(90deg,var(--blue) 60%,' + ATL_tint('#005085', .22) + ' 60%)' }} />Progres aktual</span>}
          <span className="row ac gap6"><span style={{ width: 0, borderLeft: '2px dashed var(--red)', height: 13 }} />Hari ini</span>
        </div>

        {/* GANTT */}
        <Panel noBody style={{ marginBottom: 12, overflow: 'hidden' }}>
          <div style={{ display: 'flex', overflowX: 'auto' }}>
            <ATL_Chart mode={mode} groups={groups} plan={plan} months={months} frac={frac} today={today} done={done} onOpen={(t: any) => t && t.mod && nav(t.mod, { from: 'audittimeline', tab: t.tab })} />
          </div>
        </Panel>

        {/* milestone list (klien) / burn (internal) */}
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }}>
          <Panel title="Milestone Kunci" sub={mode === 'klien' ? 'tanggal penyerahan' : 'status pelaksanaan'}>
            <div style={{ display: 'grid', gap: 0 }}>
              {plan.milestones.map((m: any, i: any) => {
                const dl = ATL_daysTo(m.date, today);
                return (
                  <div key={i} className="row ac jb" style={{ padding: '8px 0', borderBottom: i < plan.milestones.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
                    <span className="row ac gap8" style={{ minWidth: 0 }}>
                      <span style={{ width: 11, height: 11, background: (ATL_MS_COLOR as any)[m.status], transform: 'rotate(45deg)', borderRadius: 2, flex: '0 0 11px' }} />
                      <span className="truncate" style={{ fontSize: 12.5, fontWeight: 600 }}>{m.label}</span>
                    </span>
                    <span style={{ textAlign: 'right' }}>
                      <div className="mono tiny" style={{ fontWeight: 700 }}>{ATL_fmtY(m.date)}</div>
                      <div className="tiny" style={{ color: m.status === 'done' ? 'var(--green)' : dl < 0 ? 'var(--red)' : dl <= 14 ? 'var(--amber)' : 'var(--ink-3)' }}>
                        {m.status === 'done' ? 'selesai' : dl < 0 ? Math.abs(dl) + ' hari lewat' : 'dalam ' + dl + ' hari'}
                      </div>
                    </span>
                  </div>
                );
              })}
            </div>
          </Panel>

          {mode === 'internal' ? (
            <Panel title="Catatan Internal" sub="anggaran & ketergantungan">
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 9, marginBottom: 12 }}>
                <ATL_Kv label="Deadline Perikatan" v={eng.deadline ? ATL_fmt(eng.deadline) : '—'} accent={eng.deadline && ATL_daysTo(eng.deadline, today) <= 14 ? 'var(--red)' : null} />
                <ATL_Kv label="Milestone ≤ 14 hari" v={dueSoon} accent={dueSoon ? 'var(--amber)' : 'var(--green)'} />
                <ATL_Kv label="Burn Jam" v={burn + '%'} accent={burn > eng.progress + 12 ? 'var(--red)' : 'var(--green)'} />
                <ATL_Kv label="Jam" v={fmt(eng.actualHrs || 0) + '/' + fmt(eng.budgetHrs || 0)} />
              </div>
              <div className="tiny muted" style={{ lineHeight: 1.6 }}>
                <b style={{ color: 'var(--blue)' }}><I.arrowRight size={11} style={{ verticalAlign: -1 }} /> Klik aktivitas</b> pada Gantt untuk membuka modul prosedur terkait — gunakan tombol <b>Kembali</b> di header modul untuk balik ke jadwal. Tanggal aktivitas diperinci dari jendela fase pada rencana pengiriman; persentase batang dihitung dari posisi <b>hari ini</b> ({ATL_fmt(today)}). Milestone &amp; batas fase bersumber dari data perikatan (SSOT).
              </div>
              <div className="row gap8" style={{ marginTop: 12 }}>
                <Btn sm onClick={() => nav('delivery', { from: 'audittimeline' })}><I.flag size={13} /> Delivery &amp; Milestones</Btn>
                <Btn sm onClick={() => nav('scheduler', { from: 'audittimeline' })}><I.users size={13} /> Alokasi Tim</Btn>
              </div>
            </Panel>
          ) : (
            <Panel title="Catatan & Asumsi" sub="untuk klien">
              <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11.5, color: 'var(--ink-2)', lineHeight: 1.65 }}>
                <li>Lini masa mengasumsikan kelengkapan &amp; ketepatan waktu penyerahan dokumen PBC sesuai daftar permintaan; keterlambatan dapat menggeser milestone berikutnya.</li>
                <li>Observasi <i>stock opname</i> dilaksanakan pada/menjelang tanggal tutup buku; konfirmasi pihak ketiga dikirim pada awal pelaksanaan substantif.</li>
                <li>Tanggal tanda tangan opini bersifat <b>target</b> dan bergantung pada penyelesaian EQR, surat representasi manajemen, serta penilaian peristiwa kemudian.</li>
                <li>Jadwal dapat direvisi melalui kesepakatan tertulis antara KAP dan manajemen klien.</li>
              </ul>
            </Panel>
          )}
        </div>

      </div></div>
    </>
  );
}

function ATL_Kv({ label, v, accent }: any) {
  return (
    <div className="panel" style={{ padding: '8px 10px', background: 'var(--surface-2)', borderColor: 'transparent' }}>
      <div className="tiny muted upper" style={{ fontSize: 9.5 }}>{label}</div>
      <div className="mono" style={{ fontSize: 14, fontWeight: 700, marginTop: 2, color: accent || 'var(--ink)' }}>{v}</div>
    </div>
  );
}

/* ---- chart: kolom label + timeline ---- */
function ATL_Chart({ mode, groups, plan, months, frac, today, done, onOpen }: any) {
  const LBLW = mode === 'klien' ? 188 : 250;
  const ROW = 30, HEAD = 28;
  const [hov, setHov] = useStateATL(null);

  // bangun daftar baris seragam (label + lane) agar sejajar
  const rows: any[] = [];
  if (mode === 'klien') {
    groups.forEach((g: any) => rows.push({ type: 'phase', g }));
  } else {
    groups.forEach((g: any) => { rows.push({ type: 'phase', g }); g.tasks.forEach((t: any) => rows.push({ type: 'task', t, ph: g.ph })); });
  }
  const totalH = HEAD + rows.length * ROW;
  const phaseRowH = mode === 'klien' ? 34 : ROW;

  return (
    <div style={{ display: 'flex', minWidth: 560, flex: 1 }}>
      {/* labels */}
      <div style={{ flex: '0 0 ' + LBLW + 'px', width: LBLW, borderRight: '2px solid var(--line-strong)', background: 'var(--surface)' }}>
        <div style={{ height: HEAD, borderBottom: '1px solid var(--line)' }} />
        {rows.map((r, i) => {
          if (r.type === 'phase') {
            const c = (ATL_PHASE_COLOR as any)[r.g.ph.name];
            return (
              <div key={i} style={{ height: mode === 'klien' ? phaseRowH : ROW, display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', borderBottom: '1px solid var(--line-soft)', background: mode === 'klien' ? 'var(--surface)' : 'var(--surface-3)' }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: c, flex: '0 0 10px' }} />
                <span style={{ fontWeight: 700, fontSize: mode === 'klien' ? 12.5 : 11, textTransform: mode === 'klien' ? 'none' : 'uppercase', letterSpacing: mode === 'klien' ? 0 : '.04em', color: 'var(--navy)' }}>{r.g.ph.name}</span>
              </div>
            );
          }
          return (
            <div key={i} onClick={() => onOpen && onOpen(r.t)} onMouseEnter={() => setHov(r.t.ref)} onMouseLeave={() => setHov(null)}
              title={'Buka modul terkait — ' + r.t.n}
              style={{ height: ROW, display: 'flex', alignItems: 'center', gap: 8, padding: '0 10px 0 24px', borderBottom: '1px solid var(--line-soft)', position: 'relative', cursor: 'pointer', background: hov === r.t.ref ? 'var(--blue-050)' : 'transparent' }}>
              <span style={{ position: 'absolute', left: 14, width: 6, height: 6, borderRadius: '50%', background: ATL_tint((ATL_PHASE_COLOR as any)[r.ph.name], 1) }} />
              <span className="truncate" style={{ fontSize: 11.5, color: hov === r.t.ref ? 'var(--blue)' : 'var(--ink-2)', fontWeight: hov === r.t.ref ? 600 : 400, flex: 1 }}>{r.t.n}</span>
              <span className="mono tiny" style={{ color: 'var(--ink-4)', fontSize: 9.5 }}>{r.t.ref}</span>
              <I.arrowRight size={12} style={{ color: hov === r.t.ref ? 'var(--blue)' : 'var(--ink-4)', opacity: hov === r.t.ref ? 1 : .4, flex: '0 0 auto' }} />
            </div>
          );
        })}
      </div>

      {/* timeline */}
      <div style={{ flex: 1, position: 'relative', minWidth: 360 }}>
        {/* month header */}
        <div style={{ height: HEAD, borderBottom: '1px solid var(--line)', position: 'relative' }}>
          {months.map((m: any, i: any) => (
            <span key={i} className="tiny muted upper" style={{ position: 'absolute', left: m.pos + '%', top: 8, fontSize: 9.5, letterSpacing: '.03em', borderLeft: '1px solid var(--line)', paddingLeft: 4, height: 18 }}>{m.label}</span>
          ))}
        </div>

        {/* gridlines + today (overlay) */}
        <div style={{ position: 'absolute', top: HEAD, left: 0, right: 0, bottom: 0, pointerEvents: 'none' }}>
          {months.map((m: any, i: any) => <span key={i} style={{ position: 'absolute', left: m.pos + '%', top: 0, bottom: 0, width: 1, background: 'var(--line-soft)' }} />)}
          <span style={{ position: 'absolute', left: frac(today) + '%', top: 0, bottom: 0, width: 0, borderLeft: '2px dashed var(--red)', zIndex: 4 }} />
          <span className="mono" style={{ position: 'absolute', left: frac(today) + '%', top: -20, transform: 'translateX(-50%)', background: 'var(--red)', color: '#fff', fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3, whiteSpace: 'nowrap', zIndex: 5 }}>Hari ini · {ATL_fmt(today)}</span>
        </div>

        {/* lanes */}
        {rows.map((r, i) => {
          if (r.type === 'phase') {
            const c = (ATL_PHASE_COLOR as any)[r.g.ph.name];
            const s = r.g.ph.start, e = r.g.ph.end;
            const isKlien = mode === 'klien';
            return (
              <div key={i} style={{ height: isKlien ? phaseRowH : ROW, position: 'relative', borderBottom: '1px solid var(--line-soft)', background: isKlien ? 'transparent' : 'rgba(0,80,133,.03)' }}>
                <div title={r.g.ph.name + ' · ' + ATL_fmt(s) + ' – ' + ATL_fmt(e)}
                  style={{ position: 'absolute', left: frac(s) + '%', width: Math.max(0.6, frac(e) - frac(s)) + '%', top: isKlien ? 8 : 11, height: isKlien ? 18 : 8, background: isKlien ? c : ATL_tint(c, .5), borderRadius: 4, opacity: done ? .55 : 1, boxShadow: isKlien ? '0 1px 2px rgba(7,30,42,.14)' : 'none', display: 'flex', alignItems: 'center' }}>
                  {isKlien && (frac(e) - frac(s)) > 14 && <span style={{ color: '#fff', fontSize: 9.5, fontWeight: 600, padding: '0 8px', whiteSpace: 'nowrap', textShadow: '0 1px 1px rgba(0,0,0,.18)' }}>{ATL_fmt(s)} – {ATL_fmt(e)}</span>}
                </div>
                {/* milestones di lane fase (mode klien) — yang jatuh di rentang fase */}
                {isKlien && plan.milestones.filter((m: any) => ATL_ms(m.date) >= ATL_ms(s) - 3 * 864e5 && ATL_ms(m.date) <= ATL_ms(e) + 3 * 864e5).map((m: any, mi: any) => (
                  <span key={mi} title={m.label + ' · ' + ATL_fmt(m.date)} style={{ position: 'absolute', top: 9, left: 'calc(' + frac(m.date) + '% - 7px)', width: 14, height: 14, background: (ATL_MS_COLOR as any)[m.status], transform: 'rotate(45deg)', borderRadius: 2, border: '2px solid var(--surface)', zIndex: 3 }} />
                ))}
              </div>
            );
          }
          // task lane
          const L = frac(r.t.s), W = Math.max(0.8, frac(r.t.e) - frac(r.t.s)), c = (ATL_PHASE_COLOR as any)[r.ph.name];
          const active = hov === r.t.ref;
          return (
            <div key={i} onClick={() => onOpen && onOpen(r.t)} onMouseEnter={() => setHov(r.t.ref)} onMouseLeave={() => setHov(null)}
              style={{ height: ROW, position: 'relative', borderBottom: '1px solid var(--line-soft)', cursor: 'pointer', background: active ? 'var(--blue-050)' : 'transparent' }}>
              <div title={r.t.n + ' · ' + ATL_fmt(r.t.s) + ' – ' + ATL_fmt(r.t.e) + ' (' + r.t.pct + '%)'}
                style={{ position: 'absolute', left: L + '%', width: W + '%', top: 7, height: 16, background: ATL_tint(c, .24), borderRadius: 4, overflow: 'hidden', boxShadow: active ? '0 0 0 2px ' + ATL_tint(c, .55) : '0 1px 2px rgba(7,30,42,.12)' }}>
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: r.t.pct + '%', background: c, borderRadius: '4px 0 0 4px' }} />
                {W > 7 && <span style={{ position: 'absolute', left: 6, top: 0, bottom: 0, display: 'flex', alignItems: 'center', fontSize: 9, fontWeight: 700, color: '#fff', textShadow: '0 1px 1px rgba(0,0,0,.18)' }}>{r.t.pct}%</span>}
              </div>
            </div>
          );
        })}

        <div style={{ height: 0 }} />
      </div>
    </div>
  );
}

Object.assign(window, { AuditTimeline });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { AuditTimeline };
