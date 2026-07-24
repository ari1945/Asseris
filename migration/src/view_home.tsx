import React from 'react';
import { useAuth, useFirm, useNav, useAmsPersist } from './contexts';
import { CAP } from './rbac';
import { I, MODULE_INDEX } from './icons';
import { Badge, Btn, Panel, Stat } from './ui';
import { tasksMine } from './api';

/* ============================================================
   Asseris — Beranda berbasis peran (PRD "Restrukturisasi Navigasi & Beranda
   Berbasis Peran", Fase 5). Satu titik masuk pasca-login untuk KEENAM peran,
   dengan komposisi berbeda:
     · Auditor (Partner/Manager/Senior/Junior): Perikatan Saya + Tugas Saya
       (agregasi lintas-perikatan dari `tasks.mine`, Fase 4) + Non-Perikatan Saya
       (SKP/cuti self, Fase 3). Partner/Manager (ENGAGEMENT_VIEW_ALL): + oversight.
     · Firm-ops (Admin & HR Firma / Finance Firma): TANPA "Perikatan Saya" — mereka
       tak pernah anggota perikatan; Beranda mereka murni firm-ops (Area Kerja Saya +
       Tugas Saya yang, bagi mereka, kosong secara benar).
   Tak mengasumsikan `activeEngagement` terisi (2 persona baru tak punya) — semua akses
   context defensif. Read-only atas endpoint/hook yang sudah ber-gate isolasi/RBAC.
   ============================================================ */
const { useState: useStateHM, useEffect: useEffectHM, useMemo: useMemoHM } = React;

const HM_PRIO_KIND = { high: 'red', medium: 'amber', low: 'gray' };
const HM_PRIO_RANK = { high: 0, medium: 1, low: 2 };
const HM_SRC_ICON = { 'Review Note': 'doc', 'Siapkan WP': 'layers', 'Reviu WP': 'shield', 'Deadline': 'clock' };

/* Persona firm-ops → area kerja yang mereka kuasai (module id, PRD §8). Dipakai untuk
   kartu tautan-cepat "Area Kerja Saya" menggantikan panel "Perikatan Saya" auditor. */
const HM_FIRMOPS_AREAS: Record<string, { title: string; ids: string[] }> = {
  'Admin & HR Firma': { title: 'SDM & Kepatuhan', ids: ['hcm', 'payroll', 'leave', 'performance', 'cpe', 'ethics', 'independence', 'hrcase'] },
  'Finance Firma': { title: 'Keuangan Firma (ERP)', ids: ['firmgl', 'apar', 'revenue', 'treasury', 'cashbank', 'firmtax', 'profitability', 'wipreal'] },
};

const hmFirstName = (name: string) => (name || '').trim().split(/\s+/)[0] || 'Rekan';

/* Ikon di-lookup dinamis dari registry `I`; tanpa @types/react, beri tipe komponen
   yang mengembalikan JSX.Element (shim) agar bisa dipakai sebagai <IconC/>. `key` masuk
   tipe props tiap sub-komponen karena tak ada @types/react yang meng-special-case-nya. */
type HmIcon = (p: { size?: number }) => JSX.Element;
const hmIcon = (name: string | undefined): HmIcon => (I as Record<string, HmIcon>)[name || 'panel'] || (I as Record<string, HmIcon>).flag;

/* ---- kartu perikatan (Perikatan Saya) ---- */
function EngagementCard({ eng, client, onOpen }: { key?: string; eng: { id: string; fy?: string; phase?: string; risk?: string }; client: { name?: string } | undefined; onOpen: () => void }) {
  const riskKind = eng.risk === 'High' ? 'red' : eng.risk === 'Medium' ? 'amber' : 'green';
  return (
    <div className="panel" style={{ padding: 13, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div className="row ac gap8">
        <span style={{ width: 30, height: 30, borderRadius: 7, background: 'var(--navy)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 700, flex: '0 0 30px' }}>
          {(client?.name || '').replace('PT ', '').slice(0, 2).toUpperCase() || '—'}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="truncate" style={{ fontWeight: 600, fontSize: 12.5 }}>{client?.name || eng.id}</div>
          <div className="tiny muted mono">{eng.id} · {eng.fy} · {eng.phase}</div>
        </div>
        {eng.risk && <Badge kind={riskKind}>{eng.risk}</Badge>}
      </div>
      <Btn sm variant="primary" style={{ justifyContent: 'center' }} onClick={onOpen}><I.arrowRight size={13} /> Buka Cockpit</Btn>
    </div>
  );
}

/* ---- baris tugas (Tugas Saya) ---- */
function TaskLine({ task, onOpen }: { key?: string; task: { id: string; src: string; label: string; priority: string; engagementLabel?: string | null; wpRef?: string; from?: string }; onOpen: () => void }) {
  const IconC = hmIcon((HM_SRC_ICON as Record<string, string>)[task.src]);
  return (
    <div className="row ac gap8" style={{ padding: '9px 4px', borderBottom: '1px solid var(--line-soft)', cursor: 'pointer' }} onClick={onOpen}>
      <span className="mt-icobox" style={{ width: 26, height: 26, borderRadius: 6, flex: '0 0 26px' }}><IconC size={13} /></span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="truncate" style={{ fontSize: 12.5, fontWeight: 600 }}>{task.label}</div>
        <div className="row ac gap6 tiny muted" style={{ marginTop: 2 }}>
          <span>{task.src}{task.wpRef ? ' · ' + task.wpRef : ''}</span>
          {task.engagementLabel && <span className="chip tiny" style={{ height: 16 }}><I.briefcase size={10} /> {String(task.engagementLabel).replace('PT ', '')}</span>}
          {task.from && <span>dari {task.from}</span>}
        </div>
      </div>
      <Badge kind={(HM_PRIO_KIND as Record<string, string>)[task.priority] || 'gray'}>{task.priority}</Badge>
    </div>
  );
}

/* ---- kartu tautan-cepat modul (Area Kerja Saya / pintasan) ---- */
function QuickLink({ id, onOpen }: { key?: string; id: string; onOpen: () => void }) {
  const m = (MODULE_INDEX as Record<string, { label?: string; icon?: string }>)[id] || {};
  const IconC = hmIcon(m.icon);
  return (
    <button type="button" className="panel" onClick={onOpen}
      style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', border: '1px solid var(--line)', textAlign: 'left', background: 'var(--surface, #fff)' }}>
      <span style={{ width: 30, height: 30, borderRadius: 7, background: 'var(--blue-100)', color: 'var(--blue)', display: 'grid', placeItems: 'center', flex: '0 0 30px' }}><IconC size={16} /></span>
      <span style={{ fontSize: 12.5, fontWeight: 600 }}>{m.label || id}</span>
      <span style={{ flex: 1 }} />
      <I.arrowRight size={14} style={{ opacity: .5 }} />
    </button>
  );
}

function HomeView() {
  const auth = useAuth();
  const nav = useNav();
  const firm = useFirm();
  const user = (auth && auth.user) || {};
  const role = (auth && auth.role) || '';
  const can = (c: string) => !!(auth && typeof auth.can === 'function' && auth.can(c));

  const isFirmOps = role === 'Admin & HR Firma' || role === 'Finance Firma';
  const isOversight = can(CAP.ENGAGEMENT_VIEW_ALL);

  /* Perikatan yang boleh saya akses (W7.5). accessibleEngagementIds null = offline/unknown
     → jangan batasi (server tetap menegakkan). Firm-ops → [] (bukan anggota mana pun). */
  const engagements = (firm && firm.engagements) || [];
  const accIds = firm ? firm.accessibleEngagementIds : null;
  const myEngagements = useMemoHM(
    () => engagements.filter((e: { id: string }) => !accIds || accIds.includes(e.id)),
    [engagements, accIds],
  );

  /* Tugas Saya — agregasi lintas-perikatan dari server (Fase 4). Degradasi anggun. */
  const [taskData, setTaskData] = useStateHM(null);
  const [taskOffline, setTaskOffline] = useStateHM(false);
  useEffectHM(() => {
    let live = true;
    tasksMine().then((d) => { if (!live) return; if (d) setTaskData(d); else setTaskOffline(true); });
    return () => { live = false; };
  }, []);
  const tasks = (taskData && taskData.tasks) || [];
  const sortedTasks = useMemoHM(
    () => [...tasks].sort((a: { priority: string }, b: { priority: string }) => ((HM_PRIO_RANK as Record<string, number>)[a.priority] ?? 3) - ((HM_PRIO_RANK as Record<string, number>)[b.priority] ?? 3)),
    [taskData],
  );

  /* Non-Perikatan Saya — data personal self-scoped (Fase 3, via personal.get). */
  const [leaveReqs] = useAmsPersist('leaveReqs', []);
  const openLeave = Array.isArray(leaveReqs) ? leaveReqs.filter((l: { status?: string }) => l.status === 'Menunggu').length : 0;

  const openEngagement = (id: string) => {
    if (firm && typeof firm.setActiveEngagementId === 'function') firm.setActiveEngagementId(id);
    nav('cockpit', { from: 'home' });
  };

  /* Tugas Saya → tujuan yang tepat: tugas dari `tasks.mine` bisa membawa perikatan LAIN
     dari yang sedang aktif (mis. Review Note lintas-perikatan) dan/atau merujuk WP
     spesifik (wpRef). Tanpa dua langkah ini, nav(route) hanya membuka modul untuk
     perikatan yang KEBETULAN sedang aktif — bukan yang direferensikan tugasnya. Pola
     `ams.wpOpen` sama dengan yang sudah dipakai legacy My Tasks (view_mytasks.tsx) &
     view_wp.tsx (pembaca localStorage-nya). */
  const openTask = (task: { route?: string; engagementId?: string | null; wpRef?: string }) => {
    if (task.engagementId && firm && typeof firm.setActiveEngagementId === 'function') {
      firm.setActiveEngagementId(task.engagementId);
    }
    if (task.wpRef) { try { localStorage.setItem('ams.wpOpen', task.wpRef); } catch (e) { /* ignore */ } }
    nav(task.route || 'tasks', { from: 'home' });
  };

  const firmOps = (HM_FIRMOPS_AREAS as Record<string, { title: string; ids: string[] }>)[role];

  return (
    <div className="view-scroll"><div className="view-pad" style={{ display: 'grid', gap: 14 }}>

      {/* hero / sapaan */}
      <div className="panel" style={{ padding: '18px 20px', background: 'linear-gradient(120deg,#013a52,#005085)', color: '#fff', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 19, fontWeight: 800 }}>Selamat datang, {hmFirstName(user.name)}</div>
          <div style={{ fontSize: 12.5, color: '#bcd6e4', marginTop: 3 }}>
            {role}{isFirmOps ? ' · Operasi Firma' : isOversight ? ' · Oversight Portofolio' : ' · Ruang Kerja Perikatan'}
          </div>
        </div>
        <div className="row gap8">
          {!isFirmOps && <Btn sm onClick={() => nav('tasks', { from: 'home' })} style={{ background: 'rgba(255,255,255,.16)', color: '#fff', border: 'none' }}><I.check size={14} /> My Tasks</Btn>}
          {isOversight && <Btn sm onClick={() => nav('dashboard', { from: 'home' })} style={{ background: 'rgba(255,255,255,.16)', color: '#fff', border: 'none' }}><I.dashboard size={14} /> Firm Dashboard</Btn>}
        </div>
      </div>

      {/* oversight strip (Partner/Manager) */}
      {isOversight && (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={engagements.length} label="Perikatan Portofolio" /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={engagements.filter((e: { risk?: string }) => e.risk === 'High').length} label="Risiko Tinggi" accent="var(--red)" /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={sortedTasks.length} label="Tugas Saya Aktif" accent="var(--blue)" /></div></Panel>
          <Panel><div style={{ padding: '15px 18px', display: 'flex', alignItems: 'center', height: '100%' }}><Btn sm onClick={() => nav('dashboard', { from: 'home' })}><I.arrowRight size={13} /> Dashboard Firma</Btn></div></Panel>
        </div>
      )}

      <div className="grid" style={{ gridTemplateColumns: '1.4fr 1fr', gap: 14, alignItems: 'start' }}>

        {/* ---- kolom kiri ---- */}
        <div style={{ display: 'grid', gap: 14 }}>

          {/* Perikatan Saya (auditor) / Area Kerja Saya (firm-ops) */}
          {isFirmOps ? (
            <Panel title={'Area Kerja Saya' + (firmOps ? ' — ' + firmOps.title : '')} noBody>
              <div className="grid" style={{ gridTemplateColumns: 'repeat(2,1fr)', gap: 10, padding: 12 }}>
                {(firmOps ? firmOps.ids : []).map((id) => <QuickLink key={id} id={id} onOpen={() => nav(id, { from: 'home' })} />)}
              </div>
            </Panel>
          ) : (
            <Panel title="Perikatan Saya" noBody actions={isOversight ? <Btn sm onClick={() => nav('engagement', { from: 'home' })}>Semua</Btn> : null}>
              {myEngagements.length ? (
                <div className="grid" style={{ gridTemplateColumns: 'repeat(2,1fr)', gap: 10, padding: 12 }}>
                  {myEngagements.slice(0, 6).map((e: { id: string; clientId?: string; fy?: string; phase?: string; risk?: string }) => (
                    <EngagementCard key={e.id} eng={e} client={firm && firm.clientById ? firm.clientById(e.clientId) : undefined} onOpen={() => openEngagement(e.id)} />
                  ))}
                </div>
              ) : (
                <div className="muted tiny" style={{ padding: 28, textAlign: 'center' }}>
                  <I.briefcase size={22} style={{ display: 'block', margin: '0 auto 8px', opacity: .5 }} />
                  Belum ada perikatan tempat Anda menjadi anggota.
                </div>
              )}
            </Panel>
          )}

          {/* Tugas Saya */}
          <Panel title="Tugas Saya" sub={taskData ? `${sortedTasks.length} tugas · ${taskData.engagementCount} perikatan` : null} noBody
            actions={!isFirmOps ? <Btn sm onClick={() => nav('tasks', { from: 'home' })}>Buka penuh</Btn> : null}>
            <div style={{ padding: '4px 12px 10px' }}>
              {taskOffline && <div className="muted tiny" style={{ padding: 20, textAlign: 'center' }}>Server tak tersambung — buka <a style={{ color: 'var(--blue)', cursor: 'pointer' }} onClick={() => nav('tasks', { from: 'home' })}>My Tasks</a> untuk daftar lokal.</div>}
              {!taskOffline && !sortedTasks.length && (
                <div className="muted tiny" style={{ padding: 24, textAlign: 'center' }}>
                  <I.checkCircle size={22} style={{ color: 'var(--green)', display: 'block', margin: '0 auto 8px' }} />
                  Tidak ada tugas terbuka untuk Anda. 🎉
                </div>
              )}
              {sortedTasks.slice(0, 8).map((t: { id: string; src: string; label: string; priority: string; route: string; engagementId?: string | null; engagementLabel?: string | null; wpRef?: string; from?: string }) => (
                <TaskLine key={t.id} task={t} onOpen={() => openTask(t)} />
              ))}
              {sortedTasks.length > 8 && <div className="tiny muted" style={{ textAlign: 'center', paddingTop: 8 }}>+{sortedTasks.length - 8} tugas lain di My Tasks</div>}
            </div>
          </Panel>
        </div>

        {/* ---- kolom kanan: Data Personal Saya (SEMUA peran, termasuk firm-ops — mereka juga
             karyawan KAP). Menu modul People & Compliance sengaja TIDAK diurai; satu pintu
             terkonsolidasi agar tampilan level-karyawan sederhana (declutter). ---- */}
        <div style={{ display: 'grid', gap: 14 }}>
          <Panel title="Data Personal Saya" noBody>
            <div style={{ padding: 14, display: 'grid', gap: 12 }}>
              <div className="tiny muted" style={{ lineHeight: 1.5 }}>Ringkasan gaji &amp; pajak, PPL/SKP, cuti, dan data kepegawaian <b>milik Anda</b> dalam satu halaman.</div>
              <div className="row ac jb" style={{ padding: '4px 2px' }}>
                <span className="row ac gap8"><I.calendar size={15} style={{ color: 'var(--ink-3)' }} /><span style={{ fontSize: 12.5, fontWeight: 600 }}>Pengajuan Cuti</span></span>
                <Badge kind={openLeave ? 'amber' : 'gray'}>{openLeave} menunggu</Badge>
              </div>
              <Btn variant="primary" onClick={() => nav('personal', { from: 'home' })} style={{ width: '100%', justifyContent: 'center' }}><I.users size={14} /> Buka Data Personal Saya</Btn>
            </div>
          </Panel>
        </div>
      </div>

    </div></div>
  );
}

Object.assign(window, { HomeView });

export { HomeView };
