/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { useAuditHeavy, useFirm, useNav } from './contexts';
import { I } from './icons';
import { SubBar } from './shell';
import { Avatar, Badge, Btn, Donut, LockBanner, Panel, Stat, Tabs } from './ui';
import { amsExportXlsx } from './export_xlsx';
import { useInvoiceRegister } from './use_invoices';
import { PHASE_ORDER, PHASE_LABEL } from './phase_canon';
import { wpModuleStatuses, WP_MODULE_MAP } from './wp_signoff';
import {
  tbModel, tbBilling, tbEntryValue, tbLabelMinggu, tbTanggalPanjang,
  type TBBilling, type TBClient, type TBModel, type TBTimeEntry, type TBWeeklySeries,
} from './timebudget_model';

/* ============================================================
   Asseris — Time & Budget (expanded module)
   Tabs: Ringkasan · Anggaran per Fase · Timesheet · Tim & Utilisasi · Ekonomi
   ============================================================ */
const { useState: useTB, useMemo: useTBMemo } = React;

/* Tarif, roster, anggaran per fase & seri mingguan TIDAK hidup di sini lagi:
   semuanya diturunkan dari perikatan aktif oleh `timebudget_model.ts`. Yang
   tersisa di berkas ini hanyalah presentasi. */
const TB_ROLE_COLOR = { 'Engagement Partner': '#5b3fa6', 'Audit Manager': '#005085', 'Senior Auditor': '#0a6b73', 'Junior Auditor': '#9a6a00' };

const tbJt = (n: any) => 'Rp ' + AMS.fmt(Math.round(n / 1e6)) + ' jt';
const tbM  = (n: any) => 'Rp ' + AMS.fmt(n / 1e9, 2) + ' M';

/* Besaran rupiah yang bergantung pada NILAI KONTRAK boleh tak terukur. '—'
   bukan 'Rp 0 jt': nol berarti "sudah diukur, hasilnya nihil", dan itu
   pernyataan yang berbeda. Lihat TB5 di `timebudget_model.ts`. */
const TB_KOSONG = '—';
const tbJtN = (n: number | null) => (n == null ? TB_KOSONG : tbJt(n));
const tbMN  = (n: number | null) => (n == null ? TB_KOSONG : tbM(n));
/* Rasio yang pembilang/penyebutnya tak terukur — atau penyebutnya nol —
   menghasilkan null, bukan 0% dan bukan NaN%. */
const tbRatio = (num: number | null, den: number | null): number | null =>
  num == null || den == null || den === 0 ? null : num / den;
const tbPct = (r: number | null) => (r == null ? TB_KOSONG : Math.round(r * 100) + '%');

/* ----- shared derived model (reactive to live timesheet) -----
   Seluruh derivasi ada di `timebudget_model.ts` (murni, diuji di node oleh
   `timebudget_isolation.test.ts`). `null` = perikatan aktif tak punya
   roster/timesheet — dan itu dirender sebagai keadaan kosong, BUKAN ditambal
   dengan angka perikatan lain. */
function useTBModel(
  timeEntries: TBTimeEntry[],
  e: { id: string; clientId?: string; progress?: number },
  clients: readonly TBClient[],
  wpState: unknown,
): TBModel | null {
  return useTBMemo(() => {
    /* Kelengkapan terbukti per fase dari kertas kerja — kanon yang sama yang
       dipakai cockpit (`phaseRollups`). Dulu `% Selesai` di tab ini adalah
       literal 100/65/30/20 untuk setiap perikatan. */
    const wpStatuses = wpModuleStatuses({ wpState } as never, Object.keys(WP_MODULE_MAP));
    return tbModel(timeEntries, e, clients, undefined, wpStatuses);
  }, [timeEntries, e, clients, wpState]);
}

/* small horizontal budget/actual bar */
function TBBar({ budget, actual, pct, max }: any) {
  const over = actual > budget;
  const bw = (budget / max) * 100, aw = (actual / max) * 100;
  return (
    <div style={{ position: 'relative', height: 18 }}>
      <div style={{ position: 'absolute', inset: 0, width: bw + '%', background: 'var(--surface-3)', borderRadius: 4 }} />
      <div style={{ position: 'absolute', top: 3, bottom: 3, width: aw + '%', background: over ? 'var(--red)' : 'var(--blue)', borderRadius: 3 }} />
      {/* pct null = TAK TERUKUR ⇒ tak ada penanda. Penanda di 0% akan terbaca
          sebagai "nol persen terbukti", yang pernyataannya berbeda. */}
      {pct != null && <div style={{ position: 'absolute', top: 0, bottom: 0, left: `calc(${(pct / 100) * bw}% - 1px)`, width: 2, background: 'var(--navy-solid)' }} title={'Terbukti ' + Math.round(pct) + '%'} />}
    </div>
  );
}

function TimeBudget() {
  /* `clients` DARI KONTEKS FIRMA, bukan `AMS.CLIENTS`. Register klien hidup di
     server-state (`useServerState('clients', …)`) dan dapat disunting; membaca
     literal seed di sini berarti fee yang baru diperbarui tak pernah sampai ke
     ekonomi perikatan — sementara `activeClient` di komponen yang SAMA sudah
     membaca register yang hidup. Dua sumber untuk satu angka. */
  const { activeEngagement, activeClient, clients, locked } = useFirm();
  const { timeEntries, addTimeEntry, team, wpState } = useAuditHeavy(['timeEntries']);
  /* SATU PINTU register faktur (`use_invoices.ts`, #275) — penagihan perikatan
     ini dulu disintesis dari fee (TB6). */
  const { register: invoices } = useInvoiceRegister();
  const [tab, setTab] = useTB('overview');
  const e = activeEngagement;
  const m = useTBModel(timeEntries, e, clients, wpState);
  const billing = useTBMemo(
    () => tbBilling(invoices, e?.id, m ? m.fee : null, m ? m.revRecognized : null),
    [invoices, e, m],
  );
  const [exporting, setExporting] = useTB(false);

  /* K-06 lanjutan — wire tombol "Export Timesheet" (dulu mati): ekspor XLSX tersegel
     timesheet + anggaran per fase. */
  /* `activeEngagement` TIDAK punya `clientName` — dulu nama berkas ekspor selalu
     jatuh ke literal 'Klien'. Nama klien hanya hidup di CLIENTS (lewat activeClient). */
  const namaKlien = (activeClient as { name?: string } | null)?.name || e?.id || 'Klien';

  const onExportXlsx = async () => {
    if (exporting || !m) return;
    setExporting(true);
    try {
      const tsRows = timeEntries.map((t: { date: string; member: string; task: string; phase: string; hours: number }) => [
        t.date, t.member.split(',')[0], t.task, t.phase, t.hours.toFixed(1),
      ]);
      const phaseRows = m.phases.map((p) => [
        p.id, p.label, Math.round(p.budget), Math.round(p.actual),
        p.provenPct == null ? '—' : Math.round(p.provenPct) + '%', Math.round(p.variance),
      ]);
      /* Jam yang tak dapat diatribusikan ke fase ikut diekspor sebagai barisnya
         sendiri — kalau tidak, jumlah kolom Aktual takkan menutup ke perikatan. */
      phaseRows.push(['—', 'Tanpa fase (jam pembuka roster)', '', Math.round(m.untaggedHrs), '—', '']);
      const rosterRows = m.roster.map((r: { name: string; role: string; budget: number; actual: number }) => [
        r.name.split(',')[0], r.role, Math.round(r.budget), r.actual.toFixed(1),
      ]);
      await amsExportXlsx({
        kind: 'timesheet-export', scope: 'engagement', scopeId: e?.id,
        fileName: `Timesheet & Anggaran - ${namaKlien}.xlsx`,
        firm: 'KAP Wijaya Hartono & Rekan',
        title: 'Timesheet & Anggaran Perikatan',
        meta: [`${e?.id || ''} · ${e?.fy || ''} · ${m.fee == null ? 'nilai kontrak belum ditetapkan' : 'fee ' + tbJt(m.fee)}`,
          `Jam aktual ${m.actualTotal}/${m.budgetTotal} · burn ${(m.burn * 100).toFixed(0)}% — jam`],
        sheets: [
          { name: 'Timesheet', heading: 'Timesheet (jam)',
            columns: ['Tanggal', 'Anggota', 'Tugas', 'Fase', 'Jam'], rows: tsRows, colWidths: [12, 20, 34, 14, 8] },
          { name: 'Anggaran Fase', heading: 'Anggaran vs aktual per fase (jam)',
            columns: ['Fase', 'Label', 'Anggaran', 'Aktual', '% terbukti', 'Varians'], rows: phaseRows, colWidths: [12, 32, 12, 12, 12, 12] },
          { name: 'Roster', heading: 'Roster tim (jam)',
            columns: ['Anggota', 'Peran', 'Anggaran', 'Aktual'], rows: rosterRows, colWidths: [22, 22, 12, 12] },
        ],
      });
    } finally {
      setExporting(false);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Ringkasan' },
    { id: 'phase', label: 'Anggaran per Fase' },
    { id: 'timesheet', label: 'Timesheet', count: timeEntries.length },
    { id: 'team', label: 'Tim & Utilisasi' },
    { id: 'econ', label: 'Ekonomi' },
  ];

  return (
    <>
      <SubBar moduleId="time" right={
        <div className="row gap8 ac">
          <Badge kind="blue">{e.id}</Badge>
          <Btn sm><I.sparkle size={13} /> Analisis AI</Btn>
          <Btn sm onClick={onExportXlsx} disabled={exporting || !m} title={m ? undefined : 'Perikatan ini belum punya roster/timesheet — tak ada yang bisa diekspor'}><I.download size={13} /> {exporting ? 'Menyiapkan…' : 'Export Timesheet'}</Btn>
        </div>
      } />
      <div className="view-scroll"><div className="view-pad">
        {locked && <LockBanner />}
        {!m ? <TBNoRoster engId={e.id} klien={namaKlien} /> : (
          <>
            <div style={{ marginBottom: 12 }}><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>
            {tab === 'overview' && <TBOverview m={m} e={e} klien={namaKlien} />}
            {tab === 'phase' && <TBPhase m={m} e={e} />}
            {tab === 'timesheet' && <TBTimesheet m={m} timeEntries={timeEntries} addTimeEntry={addTimeEntry} team={team} locked={locked} />}
            {tab === 'team' && <TBTeam m={m} />}
            {tab === 'econ' && <TBEconomics m={m} billing={billing} klien={namaKlien} />}
          </>
        )}
      </div></div>
    </>
  );
}

/* =================== KEADAAN KOSONG (tanpa roster) ===================
   TB1 — perikatan tanpa roster/timesheet. Yang ditampilkan di sini adalah
   KETIADAAN DATA, bukan nol: nol berarti "sudah diukur, hasilnya nihil", dan
   itu pernyataan yang berbeda. Sebelum PR ini layar ini menampilkan seluruh
   ekonomi perikatan demo di bawah judul perikatan aktif. */
function TBNoRoster({ engId, klien }: { engId: string; klien: string }) {
  const nav = useNav();
  return (
    <Panel>
      <div style={{ padding: '28px 24px', maxWidth: 640 }}>
        <div className="row ac gap8" style={{ marginBottom: 10 }}>
          <span style={{ color: 'var(--amber)' }}><I.clock size={19} /></span>
          <h3 style={{ margin: 0, fontSize: 'var(--fs-lg)' }}>Belum ada roster & timesheet untuk perikatan ini</h3>
        </div>
        <p className="muted" style={{ margin: '0 0 12px', fontSize: 'var(--fs-md)', lineHeight: 1.55 }}>
          <strong>{klien}</strong> ({engId}) belum punya alokasi tim beranggaran jam,
          sehingga jam aktual, nilai standar (WIP), biaya waktu, utilisasi, dan ekonomi
          perikatan <em>tidak terukur</em> — bukan nol.
        </p>
        <p className="muted" style={{ margin: '0 0 16px', fontSize: 'var(--fs-sm)', lineHeight: 1.55 }}>
          Angka pada modul ini hanya boleh berasal dari perikatan yang sedang aktif.
          Selama rosternya kosong, tidak ada angka yang jujur untuk ditampilkan di sini.
        </p>
        <div className="row gap8 ac">
          <Btn sm variant="primary" onClick={() => nav('scheduler', { from: 'time' })}>
            <I.users size={13} /> Alokasikan tim di Resource Scheduler
          </Btn>
          <Btn sm onClick={() => nav('engagement', { from: 'time' })}>
            <I.briefcase size={13} /> Buka Engagement Management
          </Btn>
        </div>
      </div>
    </Panel>
  );
}

/* =================== LUBANG DATA: NILAI KONTRAK ===================
   TB5 — keadaan yang dulu ditambal diam-diam oleh `TB_FEE_FALLBACK`. Sekarang
   ia berbunyi, dan menyebut apa yang TETAP terukur supaya pembaca tak mengira
   seluruh halaman ini tak dapat dipakai. */
function TBFeeGap({ klien }: { klien: string }) {
  return (
    <div className="panel" style={{ padding: '9px 11px', marginBottom: 12, background: 'var(--amber-bg)', borderColor: 'transparent' }}>
      <div className="row ac gap8">
        <span style={{ color: 'var(--amber)' }}><I.alert size={15} /></span>
        <span className="tiny" style={{ fontWeight: 600, lineHeight: 1.5 }}>
          Nilai kontrak <strong>{klien}</strong> belum ditetapkan: register klien tidak
          membawa fee untuk perikatan ini. Fee disepakati, pendapatan diakui, margin, dan
          realisasi karena itu <em>tidak terukur</em> dan ditandai “{TB_KOSONG}” — bukan
          ditaksir. Jam, nilai standar (WIP), dan biaya waktu di bawah tetap terukur.
        </span>
      </div>
    </div>
  );
}

/* =================== RINGKASAN =================== */
function TBOverview({ m, e, klien }: { m: TBModel; e: any; klien: string }) {
  const { fmt } = AMS;
  const burnPct = Math.round(m.burn * 100);
  const onTrack = m.burn <= e.progress / 100 + 0.05;
  const eacVar = m.budgetTotal - m.eacHrs; // + = di bawah anggaran
  const marginRatio = tbRatio(m.marginCompletion, m.fee);
  return (
    <>
      {m.feeGap && <TBFeeGap klien={klien} />}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(6,1fr)', gap: 12, marginBottom: 12 }}>
        <Panel><div style={{ padding: '15px 18px' }}><Stat value={fmt(m.actualTotal)} label="Jam Aktual" /></div></Panel>
        <Panel><div style={{ padding: '15px 18px' }}><Stat value={fmt(m.budgetTotal)} label="Anggaran Jam" /></div></Panel>
        <Panel><div style={{ padding: '15px 18px' }}><Stat value={fmt(m.remaining)} label="Sisa Jam" accent={m.remaining < 120 ? 'var(--red)' : 'var(--green)'} /></div></Panel>
        <Panel><div style={{ padding: '15px 18px' }}><Stat value={burnPct + '%'} label="Budget Burn" accent={burnPct > 95 ? 'var(--red)' : burnPct > 85 ? 'var(--amber)' : 'var(--green)'} /></div></Panel>
        <Panel><div style={{ padding: '15px 18px' }}><Stat value={fmt(Math.round(m.eacHrs))} label="Proyeksi (EAC)" accent={eacVar < 0 ? 'var(--red)' : 'var(--ink)'} /></div></Panel>
        <Panel><div style={{ padding: '15px 18px' }}><Stat value={tbPct(marginRatio)} label="Margin Proyeksi" accent={marginRatio == null ? undefined : 'var(--green)'} /></div></Panel>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1.5fr 1fr', gap: 12, alignItems: 'start', marginBottom: 12 }}>
        <Panel title="Budget Burn vs Progress Audit">
          <div style={{ marginBottom: 12 }}>
            <div className="row jb tiny" style={{ marginBottom: 4 }}><span style={{ fontWeight: 600 }}>Jam terpakai</span><span className="mono">{fmt(m.actualTotal)} / {fmt(m.budgetTotal)} jam</span></div>
            <div style={{ height: 14, borderRadius: 7, background: 'var(--surface-3)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ width: Math.min(100, m.burn * 100) + '%', height: '100%', borderRadius: 7, background: m.burn > 0.95 ? 'var(--red)' : m.burn > 0.85 ? 'var(--amber)' : 'var(--blue)' }} />
              <div style={{ position: 'absolute', top: 0, bottom: 0, left: e.progress + '%', width: 2, background: 'var(--navy-solid)' }} title="Progress audit" />
            </div>
            <div className="row jb tiny muted" style={{ marginTop: 5 }}><span>Burn {burnPct}%</span><span>Progress audit {e.progress}% (garis hitam)</span></div>
          </div>
          <div className="panel" style={{ padding: '9px 11px', background: onTrack ? 'var(--green-bg)' : 'var(--amber-bg)', borderColor: 'transparent' }}>
            <div className="row ac gap8">
              <span style={{ color: onTrack ? 'var(--green)' : 'var(--amber)' }}>{onTrack ? <I.check size={15} /> : <I.alert size={15} />}</span>
              <span className="tiny" style={{ fontWeight: 600 }}>
                {onTrack
                  ? `Sesuai jalur — burn ${burnPct}% selaras dengan progress ${e.progress}%. Proyeksi penyelesaian ${fmt(Math.round(m.eacHrs))} jam (${eacVar >= 0 ? 'di bawah' : 'melampaui'} anggaran ${fmt(Math.abs(Math.round(eacVar)))} jam).`
                  : `Burn melampaui progress — risiko over-budget. Tinjau alokasi & ruang lingkup sisa pekerjaan.`}
              </span>
            </div>
          </div>
        </Panel>

        <Panel title="Proyeksi Penyelesaian (EAC)" sub="metode earned-value">
          <div style={{ display: 'grid', gap: 9 }}>
            <EacRow label="Jam aktual sampai saat ini" v={fmt(m.actualTotal) + ' jam'} />
            <EacRow label="Estimasi sisa (ETC)" v={fmt(Math.round(m.etcHrs)) + ' jam'} />
            <div className="divider" />
            <EacRow label="Estimate at Completion" v={fmt(Math.round(m.eacHrs)) + ' jam'} strong />
            <EacRow label="Varians vs anggaran" v={(eacVar >= 0 ? '+' : '−') + fmt(Math.abs(Math.round(eacVar))) + ' jam'} accent={eacVar >= 0 ? 'var(--green)' : 'var(--red)'} />
            <EacRow label="Biaya pada penyelesaian" v={tbJt(m.costBudget)} />
            <EacRow label="Recovery rate (realisasi)" v={tbPct(m.realization)} accent={m.realization == null ? undefined : m.realization >= 1 ? 'var(--green)' : 'var(--amber)'} />
          </div>
        </Panel>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }}>
        <Panel title="Anggaran vs Aktual per Fase">
          <div style={{ display: 'grid', gap: 11 }}>
            {m.phases.map((p) => {
              const maxB = Math.max(...m.phases.map((x) => Math.max(x.budget, x.actual)));
              return (
                <div key={p.id}>
                  <div className="row jb tiny" style={{ marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>{p.label}</span>
                    <span className="mono muted">{fmt(p.actual, 1)} / {fmt(Math.round(p.budget))} jam · {p.provenPct == null ? '—' : Math.round(p.provenPct) + '%'}</span>
                  </div>
                  <TBBar budget={p.budget} actual={p.actual} pct={p.provenPct} max={maxB} />
                </div>
              );
            })}
          </div>
          <div className="row gap8 ac tiny muted" style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--line-soft)' }}>
            <span className="row ac gap6"><span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--blue-solid)' }} /> Aktual</span>
            <span className="row ac gap6"><span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--surface-3)' }} /> Anggaran</span>
            <span className="row ac gap6"><span style={{ width: 2, height: 12, background: 'var(--navy-solid)' }} /> % terbukti (kertas kerja)</span>
          </div>
        </Panel>

        <TBWeeklyPanel weekly={m.weekly} />
      </div>
    </>
  );
}
/* TB4 — seri jam mingguan DITURUNKAN dari tanggal entri timesheet.
   Delapan pasang literal yang dulu ada di sini (W1…W8, puncak dipaku "(W4)")
   adalah minggu kerja yang tidak pernah terjadi. Jam PEMBUKA roster tidak
   bertanggal, jadi tidak muncul di sini — itu dikatakan, bukan ditambal. */
function TBWeeklyPanel({ weekly }: { weekly: TBWeeklySeries }) {
  const { fmt } = AMS;
  const { weeks, peak } = weekly;
  const maxWk = Math.max(...weeks.map(w => w.h), 1);
  const rentang = weekly.from && weekly.to
    ? `${tbLabelMinggu(weekly.from)} – ${tbLabelMinggu(weekly.to)}`
    : 'belum ada entri';
  return (
    <Panel title="Tren Jam Mingguan" sub={`dari timesheet · ${rentang}`}>
      {weeks.length === 0 ? (
        <div className="muted" style={{ padding: '28px 12px', textAlign: 'center', fontSize: 'var(--fs-sm)' }}>
          Belum ada entri timesheet bertanggal pada perikatan ini.
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 132, padding: '6px 2px 4px', borderBottom: '1px solid var(--line)' }}>
            {weeks.map((w, i) => (
              <div key={w.start} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                <span className="mono tiny" style={{ fontWeight: 700, color: 'var(--ink-2)' }}>{fmt(w.h, 1)}</span>
                <div title={`${w.start} – ${w.end}: ${fmt(w.h, 1)} jam`} style={{ width: '100%', height: (w.h / maxWk) * 96, borderRadius: '3px 3px 0 0', background: i === weeks.length - 1 ? 'var(--blue-400)' : 'var(--blue)', opacity: i === weeks.length - 1 ? 0.55 : 1 }} />
              </div>
            ))}
          </div>
          <div className="row jb" style={{ marginTop: 4 }}>
            {weeks.map(w => <span key={w.start} className="tiny muted" style={{ flex: 1, textAlign: 'center' }}>{w.wk}</span>)}
          </div>
          <div className="row jb tiny muted" style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--line-soft)' }}>
            <span>Rata-rata {fmt(weekly.avg, 1)} jam/minggu</span>
            {peak && <span>Puncak {fmt(peak.h, 1)} jam (pekan {peak.wk})</span>}
          </div>
          <div className="tiny muted" style={{ marginTop: 8 }}>
            Hanya jam timesheet bertanggal. Jam pembuka roster tidak punya tanggal, jadi tidak masuk seri ini.
          </div>
        </>
      )}
    </Panel>
  );
}

function EacRow({ label, v, strong, accent }: any) {
  return (
    <div className="row jb ac" style={{ fontSize: strong ? 13 : 12 }}>
      <span style={{ fontWeight: strong ? 700 : 500, color: strong ? 'var(--ink)' : 'var(--ink-2)' }}>{label}</span>
      <span className="mono" style={{ fontWeight: strong ? 800 : 600, color: accent || 'var(--ink)' }}>{v}</span>
    </div>
  );
}

/* =================== ANGGARAN PER FASE =================== */
/* =================== ANGGARAN PER FASE ===================
   TB7 — tab ini dulu menampilkan lima besaran karangan sekaligus: anggaran
   fase dari bobot KEDUA (cockpit punya sendiri, angkanya berbeda), `% Selesai`
   literal, EAC per fase yang diturunkan dari literal itu, kolom `Periode`
   berisi kalender perikatan demo, dan panel "Timeline Fase" yang menggambar
   Gantt dari geometri yang dipaku (`left=[4,30,67,86]`, `width=[24,36,16,12]`)
   — posisi yang tak berasal dari tanggal mana pun karena tanggal per-fase tak
   ada di data mana pun. Semuanya dicabut; yang tersisa punya sumber. */
function TBPhase({ m, e }: { m: TBModel; e: any }) {
  const { fmt } = AMS;
  /* Tenggat DARI perikatan aktif — satu-satunya tanggal yang benar-benar ada. */
  const tenggat = tbTanggalPanjang(e?.deadline);
  const totB = m.phases.reduce((s, p) => s + p.budget, 0);
  const totA = m.phases.reduce((s, p) => s + p.actual, 0);
  const terukur = m.phases.some((p) => p.provenPct != null);
  return (
    <>
      <Panel noBody className="">
        <div className="panel-h">
          <h3>Anggaran Jam per Fase Audit</h3>
          <div style={{ flex: 1 }} />
          <span className="tiny muted" title="Pembagian anggaran antar-fase memakai bobot alokasi kanon (phase_canon) — model, bukan pengukuran per fase. Kolom aktual & % terbukti adalah pengukuran.">
            anggaran = model alokasi · aktual &amp; % terbukti = pengukuran
          </span>
        </div>
        <table className="dtbl">
          <thead><tr><th>Fase</th><th className="num">Anggaran</th><th className="num">Aktual (timesheet)</th><th className="num">% terbukti</th><th className="num">Varians</th><th>Status</th></tr></thead>
          <tbody>
            {m.phases.map((p) => {
              const pp = p.provenPct;
              const st = pp == null ? 'Tak terukur' : pp >= 99.5 ? 'Selesai' : pp > 0 ? 'Berjalan' : 'Belum mulai';
              const stKind = st === 'Selesai' ? 'green' : st === 'Berjalan' ? 'blue' : 'gray';
              const v = p.variance;
              return (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600 }}>{p.label}</td>
                  <td className="num mono">{fmt(Math.round(p.budget))}</td>
                  <td className="num mono" style={{ fontWeight: 600 }}>{fmt(p.actual, 1)}</td>
                  <td className="num mono">{pp == null ? '—' : Math.round(pp) + '%'}</td>
                  <td className="num mono" style={{ color: v < 0 ? 'var(--red)' : 'var(--ink-2)', fontWeight: 600 }}>{v >= 0 ? '+' : '−'}{fmt(Math.abs(Math.round(v)))}</td>
                  <td><Badge kind={stKind}>{st}</Badge></td>
                </tr>
              );
            })}
            {/* Jam yang tak dapat diatribusikan ke fase DINYATAKAN, tidak
                disebar menurut bobot anggaran — pola `untaggedHrs` cockpit. */}
            <tr>
              <td className="muted" style={{ fontStyle: 'italic' }}>Tanpa fase — jam pembuka roster</td>
              <td className="num mono muted">—</td>
              <td className="num mono muted" style={{ fontWeight: 600 }}>{fmt(m.untaggedHrs, 1)}</td>
              <td className="num mono muted">—</td>
              <td className="num mono muted">—</td>
              <td><Badge kind="gray">Tak berfase</Badge></td>
            </tr>
          </tbody>
          <tfoot><tr><td>TOTAL</td><td className="num">{fmt(Math.round(totB))}</td><td className="num">{fmt(totA + m.untaggedHrs, 1)}</td><td className="num">—</td><td className="num">{fmt(Math.round(totB - totA - m.untaggedHrs))}</td><td></td></tr></tfoot>
        </table>
      </Panel>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12, alignItems: 'start' }}>
        <Panel title="Apa yang diukur di tab ini" sub={tenggat ? `tenggat perikatan ${tenggat}` : 'tenggat perikatan belum ditetapkan'}>
          <div className="tiny muted" style={{ display: 'grid', gap: 9, lineHeight: 1.55 }}>
            <div><b>Anggaran per fase</b> adalah <b>model alokasi</b>: jam anggaran perikatan dibagi menurut bobot kanon (<span className="mono">phase_canon</span>) — bobot yang sama yang dipakai Engagement Cockpit, sehingga kedua layar tak lagi menjawab berbeda untuk perikatan yang sama.</div>
            <div><b>Aktual per fase</b> adalah <b>fakta</b>: jam timesheet bertanggal, dikelompokkan menurut fase yang dicatat pada entrinya.</div>
            <div><b>% terbukti</b> {terukur
              ? <>adalah <b>pengukuran</b>: kelengkapan kertas kerja fase itu (bukti · kesimpulan · sign-off), kanon yang sama dengan pipeline fase di Cockpit. Ia menjawab “berapa yang <i>terdokumentasi</i>”, bukan “berapa yang manajer nyatakan selesai”.</>
              : <>belum terukur pada perikatan ini — status kertas kerjanya belum tersedia, dan itu ditandai “—”, bukan 0%.</>}</div>
            <div><b>Tidak ada kolom periode & tidak ada lini masa fase</b>: tanggal mulai/selesai per fase tidak ada di data mana pun. Yang bertanggal hanyalah tenggat perikatan, tenggat opini, dan batas arsip — semuanya di Engagement Cockpit.</div>
            <div><b>Tidak ada EAC per fase</b>: memproyeksikannya dari kelengkapan dokumentasi akan mencampur jam yang dikonsumsi dengan ketertinggalan dokumentasi. Proyeksi jam tingkat perikatan ada di tab Ringkasan.</div>
          </div>
        </Panel>

        <Panel title="Komposisi Jam per Peran" sub="aktual berjalan">
          <TBRoleMix m={m} />
        </Panel>
      </div>
    </>
  );
}

/* role composition donut + legend */
function TBRoleMix({ m }: any) {
  const { fmt } = AMS;
  const byRole: any = {};
  m.roster.forEach((r: any) => { byRole[r.role] = (byRole[r.role] || 0) + r.actual; });
  const segs = Object.entries(byRole).map(([role, h]: [string, any]) => ({ value: h, color: (TB_ROLE_COLOR as any)[role], role, h }));
  const tot = segs.reduce((s, x) => s + x.value, 0);
  return (
    <div className="row gap8 ac" style={{ alignItems: 'center', gap: 18 }}>
      <Donut segments={segs} size={120} thickness={18} center={<div><div className="mono" style={{ fontWeight: 800, fontSize: 15 }}>{fmt(Math.round(tot))}</div><div className="tiny muted">jam</div></div>} />
      <div style={{ flex: 1, display: 'grid', gap: 8 }}>
        {segs.map(s => (
          <div key={s.role} className="row jb ac tiny">
            <span className="row ac gap6"><span style={{ width: 10, height: 10, borderRadius: 2, background: s.color }} /><span style={{ fontWeight: 600 }}>{s.role}</span></span>
            <span className="mono muted">{fmt(Math.round(s.h))}j · {Math.round(s.h / tot * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* =================== TIMESHEET =================== */
function TBTimesheet({ m, timeEntries, addTimeEntry, team, locked }: any) {
  const uid = React.useId();
  const { fmt } = AMS;
  const [form, setForm] = useTB({ member: 'Anindya Pramesti', phase: 'Eksekusi', task: '', hours: '' });
  const [fMember, setFMember] = useTB('all');
  const [fPhase, setFPhase] = useTB('all');

  const filtered = timeEntries.filter((t: any) => (fMember === 'all' || t.member === fMember) && (fPhase === 'all' || t.phase === fPhase));
  const totalLogged = filtered.reduce((s: any, t: any) => s + t.hours, 0);

  const submit = () => {
    if (locked || !form.task.trim() || !(+form.hours > 0)) return;
    addTimeEntry({ member: form.member, phase: form.phase, task: form.task, hours: +form.hours, date: AMS.TODAY });
    setForm((f: any) => ({ ...f, task: '', hours: '' }));
  };
  /* Dari kanon. Daftar literal di sini adalah daftar fase KEEMPAT di aplikasi,
     dan ia yang menulis 'Pelaporan' ke data — ejaan yang cockpit tak kenal,
     sehingga jamnya jatuh ke "jam tak bertanda" di layar itu. */
  const phaseOpts = PHASE_ORDER;

  return (
    <div className="grid split" style={{ gridTemplateColumns: '1fr 320px', gap: 12, alignItems: 'start' }}>
      <Panel noBody>
        <div className="panel-h">
          <h3>Catatan Waktu (Timesheet)</h3>
          <div style={{ flex: 1 }} />
          <select className="select" value={fMember} onChange={(ev: any) => setFMember(ev.target.value)} style={{ height: 24, fontSize: 12 }}>
            <option value="all">Semua anggota</option>
            {team.map((t: any) => <option key={t.name} value={t.name}>{t.name.split(',')[0]}</option>)}
          </select>
          <select className="select" value={fPhase} onChange={(ev: any) => setFPhase(ev.target.value)} style={{ height: 24, fontSize: 12 }}>
            <option value="all">Semua fase</option>
            {phaseOpts.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        {!locked && (
          <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--line)', background: 'var(--surface-2)', display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div className="field" style={{ flex: '1 1 120px' }}><label htmlFor={uid+'-anggota'}>Anggota</label><select id={uid+'-anggota'} className="select" value={form.member} onChange={(ev: any) => setForm((f: any) => ({ ...f, member: ev.target.value }))}>{team.map((t: any) => <option key={t.name}>{t.name}</option>)}</select></div>
            <div className="field" style={{ flex: '0 0 110px' }}><label htmlFor={uid+'-fase'}>Fase</label><select id={uid+'-fase'} className="select" value={form.phase} onChange={(ev: any) => setForm((f: any) => ({ ...f, phase: ev.target.value }))}>{phaseOpts.map(p => <option key={p}>{p}</option>)}</select></div>
            <div className="field" style={{ flex: '2 1 160px' }}><label htmlFor={uid+'-tugas'}>Tugas</label><input id={uid+'-tugas'} className="input" value={form.task} onChange={(ev: any) => setForm((f: any) => ({ ...f, task: ev.target.value }))} placeholder="Deskripsi pekerjaan" /></div>
            <div className="field" style={{ flex: '0 0 64px' }}><label htmlFor={uid+'-jam'}>Jam</label><input id={uid+'-jam'} className="input mono" type="number" value={form.hours} onChange={(ev: any) => setForm((f: any) => ({ ...f, hours: ev.target.value }))} style={{ textAlign: 'right' }} /></div>
            <Btn sm variant="primary" onClick={submit}><I.plus size={13} /> Catat</Btn>
          </div>
        )}
        <div style={{ maxHeight: 420, overflow: 'auto' }}>
          <table className="dtbl">
            <thead><tr><th>Tanggal</th><th>Anggota</th><th>Tugas</th><th>Fase</th><th className="num">Jam</th><th className="num">Nilai (std)</th></tr></thead>
            <tbody>
              {filtered.map((t: any) => {
                const val = tbEntryValue(m.roster, t.member, t.hours);
                return (
                  <tr key={t.id}>
                    <td className="mono tiny muted">{new Date(t.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</td>
                    <td className="truncate" style={{ maxWidth: 120, fontWeight: 600 }}>{t.member.split(',')[0]}</td>
                    <td className="tiny muted truncate" style={{ maxWidth: 200 }}>{t.task}</td>
                    <td><Badge kind="blue">{t.phase}</Badge></td>
                    <td className="num mono" style={{ fontWeight: 600 }}>{t.hours.toFixed(1)}</td>
                    <td className="num mono tiny muted">{tbJt(val)}</td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={6} className="muted" style={{ textAlign: 'center', padding: 22 }}>Tidak ada entri untuk filter ini.</td></tr>}
            </tbody>
            <tfoot><tr><td colSpan={4}>TOTAL ({filtered.length} entri)</td><td className="num">{fmt(totalLogged, 1)}</td><td></td></tr></tfoot>
          </table>
        </div>
      </Panel>

      <div style={{ display: 'grid', gap: 12 }}>
        <Panel title="Jam per Anggota">
          <div style={{ display: 'grid', gap: 9 }}>
            {m.roster.slice().sort((a: any, b: any) => b.actual - a.actual).map((r: any) => {
              const max = Math.max(...m.roster.map((x: any) => x.actual), 1);
              return (
                <div key={r.name}>
                  <div className="row jb tiny" style={{ marginBottom: 3 }}><span className="row ac gap6"><Avatar name={r.name} size={20} /><span style={{ fontWeight: 600 }}>{r.name.split(' ')[0]}</span></span><span className="mono" style={{ fontWeight: 700 }}>{fmt(r.actual, 1)}j</span></div>
                  <div style={{ height: 7, borderRadius: 4, background: 'var(--surface-3)' }}><div style={{ width: (r.actual / max * 100) + '%', height: '100%', borderRadius: 4, background: (TB_ROLE_COLOR as any)[r.role] }} /></div>
                </div>
              );
            })}
          </div>
        </Panel>
        <Panel title="Jam per Fase">
          <div style={{ display: 'grid', gap: 9 }}>
            {m.phases.map((p: any) => {
              const max = Math.max(...m.phases.map((x: any) => x.actual), 1);
              return (
                <div key={p.id}>
                  <div className="row jb tiny" style={{ marginBottom: 3 }}><span style={{ fontWeight: 600 }}>{p.label}</span><span className="mono muted">{fmt(p.actual, 0)}j</span></div>
                  <div style={{ height: 7, borderRadius: 4, background: 'var(--surface-3)' }}><div style={{ width: (p.actual / max * 100) + '%', height: '100%', borderRadius: 4, background: 'var(--teal-solid)' }} /></div>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* =================== TIM & UTILISASI =================== */
function TBTeam({ m }: any) {
  const { fmt } = AMS;
  const maxA = Math.max(...m.roster.map((r: any) => r.budget));
  return (
    <>
      <Panel noBody>
        <div className="panel-h"><h3>Realisasi & Utilisasi per Anggota</h3><div style={{ flex: 1 }} /><span className="tiny muted">tarif standar (charge-out) per jam</span></div>
        <table className="dtbl">
          <thead><tr><th>Anggota</th><th>Peran</th><th className="num">Tarif/jam</th><th className="num">Anggaran</th><th className="num">Aktual</th><th className="num">Varians</th><th style={{ width: 150 }}>Anggaran vs Aktual</th><th className="num">Util.</th><th className="num">Nilai (std)</th></tr></thead>
          <tbody>
            {m.roster.map((r: any) => (
              <tr key={r.name}>
                <td><span className="row ac gap8"><Avatar name={r.name} size={22} /><span style={{ fontWeight: 600 }}>{r.name.split(',')[0]}</span></span></td>
                <td><span className="row ac gap6"><span style={{ width: 8, height: 8, borderRadius: 2, background: (TB_ROLE_COLOR as any)[r.role] }} /><span className="tiny">{r.role}</span></span></td>
                <td className="num mono tiny">{tbJt(r.bill)}</td>
                <td className="num mono">{fmt(r.budget)}</td>
                <td className="num mono" style={{ fontWeight: 600 }}>{fmt(r.actual, 1)}</td>
                <td className="num mono" style={{ color: r.variance < 0 ? 'var(--red)' : 'var(--green)' }}>{r.variance >= 0 ? '+' : '−'}{fmt(Math.abs(r.variance), 1)}</td>
                <td><TBBar budget={r.budget} actual={r.actual} max={maxA} /></td>
                <td className="num mono" style={{ fontWeight: 600, color: r.util > 100 ? 'var(--red)' : r.util > 85 ? 'var(--amber)' : 'var(--ink)' }}>{r.util}%</td>
                <td className="num mono tiny">{tbJt(r.billVal)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr><td colSpan={3}>TOTAL</td><td className="num">{fmt(m.budgetTotal)}</td><td className="num">{fmt(m.actualTotal, 1)}</td><td className="num">{m.remaining >= 0 ? '+' : '−'}{fmt(Math.abs(m.remaining), 1)}</td><td></td><td className="num">{Math.round(m.actualTotal / m.budgetTotal * 100)}%</td><td className="num">{tbJt(m.stdValue)}</td></tr></tfoot>
        </table>
      </Panel>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12, alignItems: 'start' }}>
        <Panel title="Utilisasi vs Anggaran">
          <div style={{ display: 'grid', gap: 11 }}>
            {m.roster.map((r: any) => (
              <div key={r.name}>
                <div className="row jb tiny" style={{ marginBottom: 3 }}><span style={{ fontWeight: 600 }}>{r.name.split(' ')[0]}</span><span className="mono" style={{ color: r.util > 100 ? 'var(--red)' : 'var(--ink-2)', fontWeight: 700 }}>{r.util}%</span></div>
                <div style={{ height: 8, borderRadius: 4, background: 'var(--surface-3)', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ width: Math.min(100, r.util) + '%', height: '100%', borderRadius: 4, background: r.util > 100 ? 'var(--red)' : r.util > 85 ? 'var(--amber)' : 'var(--green)' }} />
                </div>
              </div>
            ))}
          </div>
          <div className="tiny muted" style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--line-soft)' }}>Utilisasi = jam aktual ÷ anggaran jam per anggota pada engagement ini.</div>
        </Panel>
        <Panel title="Komposisi Tim" sub="jam aktual per peran"><TBRoleMix m={m} /></Panel>
      </div>
    </>
  );
}

/* =================== EKONOMI =================== */
function TBEconomics({ m, billing, klien }: { m: TBModel; billing: TBBilling; klien: string }) {
  const { fmt } = AMS;
  /* Write-up/-down = fee − nilai standar anggaran; tak bermakna tanpa fee. */
  const wd = m.fee == null ? null : m.fee - m.stdValueBudget;
  const marginRatio = tbRatio(m.marginCompletion, m.fee);
  const marginNowRatio = tbRatio(m.marginNow, m.revRecognized);
  return (
    <>
      {m.feeGap && <TBFeeGap klien={klien} />}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
        <Panel><div style={{ padding: '15px 18px' }}><Stat value={tbMN(m.fee)} label="Fee Disepakati" /></div></Panel>
        <Panel><div style={{ padding: '15px 18px' }}><Stat value={tbM(m.costBudget)} label="Biaya pd Penyelesaian" /></div></Panel>
        <Panel><div style={{ padding: '15px 18px' }}><Stat value={tbMN(m.marginCompletion)} label="Margin Proyeksi" accent={m.marginCompletion == null ? undefined : 'var(--green)'} /></div></Panel>
        <Panel><div style={{ padding: '15px 18px' }}><Stat value={tbPct(marginRatio)} label="Margin %" accent={marginRatio == null ? undefined : marginRatio >= 0.4 ? 'var(--green)' : 'var(--amber)'} /></div></Panel>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1.4fr 1fr', gap: 12, alignItems: 'start' }}>
        <Panel title="Ekonomi Engagement" sub="saat ini vs proyeksi penyelesaian">
          <table className="dtbl">
            <thead><tr><th>Komponen</th><th className="num">Saat ini ({tbPct(m.recogPct)})</th><th className="num">Penyelesaian (100%)</th></tr></thead>
            <tbody>
              <tr><td>Jam tercatat</td><td className="num mono">{fmt(m.actualTotal, 0)} j</td><td className="num mono">{fmt(Math.round(m.eacHrs))} j</td></tr>
              <tr><td>Nilai standar (WIP @ charge-out)</td><td className="num mono">{tbJt(m.stdValue)}</td><td className="num mono">{tbJt(m.stdValueBudget)}</td></tr>
              <tr><td>Biaya langsung (fully-loaded)</td><td className="num mono">{tbJt(m.costActual)}</td><td className="num mono">{tbJt(m.costBudget)}</td></tr>
              <tr><td>Pendapatan diakui (metode masukan)</td><td className="num mono">{tbJtN(m.revRecognized)}</td><td className="num mono">{tbJtN(m.fee)}</td></tr>
              <tr style={{ background: 'var(--surface-2)' }}><td style={{ fontWeight: 700 }}>Margin kotor</td><td className="num mono" style={{ fontWeight: 700, color: m.marginNow == null ? 'var(--ink-2)' : 'var(--green)' }}>{tbJtN(m.marginNow)}</td><td className="num mono" style={{ fontWeight: 700, color: m.marginCompletion == null ? 'var(--ink-2)' : 'var(--green)' }}>{tbJtN(m.marginCompletion)}</td></tr>
              <tr><td>Margin %</td><td className="num mono">{tbPct(marginNowRatio)}</td><td className="num mono">{tbPct(marginRatio)}</td></tr>
              <tr><td>Tarif efektif blended</td><td className="num mono">{tbJt(m.blendedBill)}/j</td><td className="num mono">{tbJt(m.stdValueBudget / m.budgetTotal)}/j</td></tr>
            </tbody>
          </table>
          {/* Catatan kaki ini masih berbunyi "persentase penyelesaian sesuai
              progress audit" sesudah #278 mengganti dasarnya menjadi metode
              masukan berpagar — label kolomnya sudah benar, kalimatnya belum.
              Diselaraskan di sini karena ia menjelaskan baris yang sama. */}
          <div className="tiny muted" style={{ marginTop: 8 }}>WIP = work-in-progress dinilai pada tarif standar. Pendapatan diakui mengikuti metode <b>masukan berpagar</b> (jam aktual ÷ jam anggaran, dijepit 100%; perikatan yang kewajiban pelaksanaannya tuntas diakui penuh) — bukan persentase penyelesaian yang dilaporkan perikatan.</div>
        </Panel>

        <div style={{ display: 'grid', gap: 12 }}>
          <Panel title="Realisasi (Recovery Rate)">
            {wd == null || m.realization == null ? (
              <div className="tiny muted" style={{ lineHeight: 1.55 }}>
                Realisasi = fee disepakati ÷ nilai standar anggaran ({tbJt(m.stdValueBudget)}).
                Tanpa nilai kontrak, rasio itu <em>tidak terukur</em> — dan tidak digantikan taksiran.
              </div>
            ) : (
              <div className="row gap8 ac" style={{ gap: 18 }}>
                <Donut
                  segments={wd >= 0
                    ? [{ value: m.stdValueBudget, color: 'var(--blue)' }, { value: wd, color: 'var(--green)' }]
                    : [{ value: m.fee, color: 'var(--blue)' }, { value: -wd, color: 'var(--red)' }]}
                  size={120} thickness={18}
                  center={<div><div className="mono" style={{ fontWeight: 800, fontSize: 19, color: m.realization >= 1 ? 'var(--green)' : 'var(--amber)' }}>{tbPct(m.realization)}</div><div className="tiny muted">realisasi</div></div>}
                />
                <div style={{ flex: 1, display: 'grid', gap: 8 }}>
                  <EacRow label="Nilai standar (budget)" v={tbJt(m.stdValueBudget)} />
                  <EacRow label="Fee disepakati" v={tbJtN(m.fee)} />
                  <div className="divider" />
                  <EacRow label={wd >= 0 ? 'Write-up' : 'Write-down'} v={(wd >= 0 ? '+' : '−') + tbJt(Math.abs(wd)).replace('Rp ', '')} accent={wd >= 0 ? 'var(--green)' : 'var(--red)'} strong />
                </div>
              </div>
            )}
          </Panel>
          <TBBillingPanel m={m} billing={billing} />
        </div>
      </div>
    </>
  );
}

/* --- TB6 · PENAGIHAN: register faktur, bukan pecahan fee ---
   Panel ini dulu berbunyi "Sudah ditagih (2 termin)" = fee × 0,5, "Sisa nilai
   kontrak" = fee × 0,5, dan "Termin ke-3 (fee × 0,3) jatuh tempo saat fieldwork
   selesai (31 Mar)". Ketiganya disintesis, dan yang pertama SALAH bahkan pada
   seed: perikatan demo sudah menerbitkan dua faktur senilai 1.480 jt terhadap
   fee 1.850 jt, bukan 925 jt. Termin ketiga itu tak ada di register mana pun —
   yang dilabelinya justru faktur Termin 2 milik perikatan demo — jadi klaimnya
   DICABUT tanpa pengganti karangan. Yang ditampilkan kini adalah faktur yang
   benar-benar terbit dan belum lunas, dengan tanggal jatuh tempo miliknya. */
function TBBillingPanel({ m, billing }: { m: TBModel; billing: TBBilling }) {
  const b = billing;
  const kabar = b.nextDue
    ? `Faktur ${b.nextDue.id}${b.nextDue.milestone ? ' · ' + b.nextDue.milestone : ''} — ${tbJt(b.nextDue.outstanding)} belum lunas, jatuh tempo ${tbTanggalPanjang(b.nextDue.due)}.`
    : b.drafts > 0
      ? `Tidak ada faktur terbit yang menyisakan tagihan. ${b.drafts} faktur masih berstatus draf — belum menagih apa pun.`
      : b.issued > 0
        ? 'Seluruh faktur perikatan ini sudah lunas menurut register.'
        : 'Register faktur belum memuat satu pun faktur untuk perikatan ini.';
  return (
    <Panel title="Penagihan & WIP" sub="dari register faktur">
      <div style={{ display: 'grid', gap: 9 }}>
        <EacRow label={`Sudah ditagih (${b.issued} faktur terbit)`} v={tbJt(b.billed)} />
        <EacRow label="Aset kontrak (diakui > ditagih)" v={tbJtN(b.contractAsset)} accent={b.contractAsset ? 'var(--amber)' : undefined} />
        <EacRow label="Liabilitas kontrak (ditagih > diakui)" v={tbJtN(b.contractLiab)} accent={b.contractLiab ? 'var(--amber)' : undefined} />
        <EacRow label="Sisa nilai kontrak" v={tbJtN(b.remainingContract)} accent={b.remainingContract != null && b.remainingContract < 0 ? 'var(--num-neg)' : undefined} />
        <div className="divider" />
        <div className="panel" style={{ padding: '9px 11px', background: 'var(--blue-050)', borderColor: 'transparent' }}>
          <div className="row ac gap8"><span style={{ color: 'var(--blue)' }}><I.receipt size={15} /></span><span className="tiny" style={{ fontWeight: 600, lineHeight: 1.5 }}>{kabar}</span></div>
        </div>
      </div>
      <div className="tiny muted" style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--line-soft)', lineHeight: 1.5 }}>
        <b>Ditagih</b> adalah fakta register faktur (status ≠ draf), bukan pecahan fee.
        Aset & liabilitas kontrak membandingkannya dengan pendapatan diakui{m.revRecognized == null ? ' — yang belum terukur' : ''}.
      </div>
    </Panel>
  );
}



/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { TimeBudget };
