/* ============================================================
   NeoSuite AMS — Icon set (stroke SVG) + module registry
   ============================================================ */

const Icon = ({ d, size = 16, fill = false, sw = 1.7, style, children }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill ? 'currentColor' : 'none'}
       stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={style}>
    {children || <path d={d} />}
  </svg>
);

const I = {
  dashboard: (p) => <Icon {...p}><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></Icon>,
  users: (p) => <Icon {...p}><circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M16 6a3 3 0 0 1 0 6"/><path d="M18 14c2 .6 3.5 2.3 3.5 4.5"/></Icon>,
  briefcase: (p) => <Icon {...p}><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M3 12h18"/></Icon>,
  shield: (p) => <Icon {...p}><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/></Icon>,
  target: (p) => <Icon {...p}><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1" fill="currentColor"/></Icon>,
  sliders: (p) => <Icon {...p}><path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h8M16 18h4"/><circle cx="16" cy="6" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="14" cy="18" r="2"/></Icon>,
  doc: (p) => <Icon {...p}><path d="M6 2h8l4 4v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"/><path d="M14 2v4h4M8 13h8M8 17h6"/></Icon>,
  table: (p) => <Icon {...p}><rect x="3" y="4" width="18" height="16" rx="1.5"/><path d="M3 9h18M3 14h18M9 4v16M15 4v16"/></Icon>,
  ledger: (p) => <Icon {...p}><path d="M4 4h16v16H4z"/><path d="M8 4v16M4 9h4M4 14h4"/><path d="M11 8h6M11 12h6M11 16h4"/></Icon>,
  layers: (p) => <Icon {...p}><path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5M3 17l9 5 9-5" opacity=".55"/></Icon>,
  trend: (p) => <Icon {...p}><path d="M3 17l5-5 4 3 8-8"/><path d="M17 7h4v4"/></Icon>,
  dice: (p) => <Icon {...p}><rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9" cy="9" r="1.2" fill="currentColor"/><circle cx="15" cy="15" r="1.2" fill="currentColor"/><circle cx="15" cy="9" r="1.2" fill="currentColor"/><circle cx="9" cy="15" r="1.2" fill="currentColor"/></Icon>,
  flask: (p) => <Icon {...p}><path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3"/><path d="M7.5 15h9"/></Icon>,
  mail: (p) => <Icon {...p}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></Icon>,
  pulse: (p) => <Icon {...p}><path d="M3 12h4l2-6 4 12 2-6h6"/></Icon>,
  clock: (p) => <Icon {...p}><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/></Icon>,
  calendar: (p) => <Icon {...p}><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/></Icon>,
  link2: (p) => <Icon {...p}><path d="M9 12h6"/><path d="M10 7H7a5 5 0 0 0 0 10h3M14 7h3a5 5 0 0 1 0 10h-3"/></Icon>,
  group: (p) => <Icon {...p}><circle cx="7" cy="7" r="3"/><circle cx="17" cy="7" r="3"/><circle cx="12" cy="17" r="3"/><path d="M7 10v2a3 3 0 0 0 3 3M17 10v2a3 3 0 0 1-3 3"/></Icon>,
  expert: (p) => <Icon {...p}><circle cx="12" cy="8" r="4"/><path d="M5 21a7 7 0 0 1 14 0"/><path d="M12 2v2M9 5l1 1M15 5l-1 1"/></Icon>,
  server: (p) => <Icon {...p}><rect x="3" y="4" width="18" height="7" rx="1.5"/><rect x="3" y="13" width="18" height="7" rx="1.5"/><path d="M7 7.5h.01M7 16.5h.01"/></Icon>,
  scale: (p) => <Icon {...p}><path d="M12 3v18M7 21h10M5 7l-2 5h4zM19 7l-2 5h4z"/><path d="M12 5l-7 2M12 5l7 2"/></Icon>,
  search2: (p) => <Icon {...p}><circle cx="11" cy="11" r="6"/><path d="M20 20l-3.5-3.5"/></Icon>,
  book: (p) => <Icon {...p}><path d="M4 4h11a2 2 0 0 1 2 2v14H6a2 2 0 0 1-2-2z"/><path d="M17 6h3v14h-3"/></Icon>,
  gavel: (p) => <Icon {...p}><path d="M13 5l6 6-3 3-6-6z"/><path d="M9 9l-5 5 2 2 5-5"/><path d="M14 19h7"/></Icon>,
  coins: (p) => <Icon {...p}><ellipse cx="9" cy="7" rx="6" ry="3"/><path d="M3 7v5c0 1.7 2.7 3 6 3"/><ellipse cx="15" cy="14" rx="6" ry="3"/><path d="M9 14v3c0 1.7 2.7 3 6 3s6-1.3 6-3v-3"/></Icon>,
  receipt: (p) => <Icon {...p}><path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2z"/><path d="M9 8h6M9 12h6"/></Icon>,
  lock: (p) => <Icon {...p}><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></Icon>,
  building: (p) => <Icon {...p}><rect x="5" y="3" width="14" height="18" rx="1"/><path d="M9 7h.01M15 7h.01M9 11h.01M15 11h.01M9 15h.01M15 15h.01M10 21v-3h4v3"/></Icon>,
  hourglass: (p) => <Icon {...p}><path d="M7 3h10M7 21h10M7 3c0 4 4 5 5 7 1-2 5-3 5-7M7 21c0-4 4-5 5-7 1 2 5 3 5 7"/></Icon>,
  water: (p) => <Icon {...p}><path d="M12 3c4 5 7 8 7 12a7 7 0 0 1-14 0c0-4 3-7 7-12z"/></Icon>,
  template: (p) => <Icon {...p}><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 9v12"/></Icon>,
  report: (p) => <Icon {...p}><path d="M6 2h9l5 5v15H6z"/><path d="M14 2v5h5"/><path d="M9 13l2 2 4-4"/></Icon>,
  bell: (p) => <Icon {...p}><path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6"/><path d="M10 19a2 2 0 0 0 4 0"/></Icon>,
  chevron: (p) => <Icon {...p}><path d="M9 6l6 6-6 6"/></Icon>,
  chevDown: (p) => <Icon {...p}><path d="M6 9l6 6 6-6"/></Icon>,
  grip: (p) => <Icon {...p}><circle cx="9" cy="6" r="1.3" fill="currentColor"/><circle cx="15" cy="6" r="1.3" fill="currentColor"/><circle cx="9" cy="12" r="1.3" fill="currentColor"/><circle cx="15" cy="12" r="1.3" fill="currentColor"/><circle cx="9" cy="18" r="1.3" fill="currentColor"/><circle cx="15" cy="18" r="1.3" fill="currentColor"/></Icon>,
  dots: (p) => <Icon {...p}><circle cx="5" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="19" cy="12" r="1.5" fill="currentColor"/></Icon>,
  plus: (p) => <Icon {...p}><path d="M12 5v14M5 12h14"/></Icon>,
  filter: (p) => <Icon {...p}><path d="M3 5h18l-7 8v6l-4-2v-4z"/></Icon>,
  download: (p) => <Icon {...p}><path d="M12 3v12m-5-5l5 5 5-5M5 21h14"/></Icon>,
  upload: (p) => <Icon {...p}><path d="M12 21V9m-5 5l5-5 5 5M5 3h14"/></Icon>,
  check: (p) => <Icon {...p}><path d="M5 12l5 5 9-11"/></Icon>,
  checkCircle: (p) => <Icon {...p}><circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/></Icon>,
  flag: (p) => <Icon {...p}><path d="M5 21V4h13l-2 4 2 4H5"/></Icon>,
  sync: (p) => <Icon {...p}><path d="M20 11a8 8 0 0 0-14-4M4 5v4h4M4 13a8 8 0 0 0 14 4M20 19v-4h-4"/></Icon>,
  send: (p) => <Icon {...p}><path d="M21 3L10 14M21 3l-7 18-4-7-7-4z"/></Icon>,
  sparkle: (p) => <Icon {...p}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/></Icon>,
  x: (p) => <Icon {...p}><path d="M6 6l12 12M18 6L6 18"/></Icon>,
  settings: (p) => <Icon {...p}><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/></Icon>,
  alert: (p) => <Icon {...p}><path d="M12 3l9 16H3z"/><path d="M12 10v4M12 17h.01"/></Icon>,
  panel: (p) => <Icon {...p}><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/></Icon>,
  arrowRight: (p) => <Icon {...p}><path d="M5 12h14M13 6l6 6-6 6"/></Icon>,
  arrowLeft: (p) => <Icon {...p}><path d="M19 12H5M11 6l-6 6 6 6"/></Icon>,
  star: (p) => <Icon {...p}><path d="M12 3l2.6 5.5 6 .8-4.4 4.1 1.1 5.9L12 16.9 6.7 19.3l1.1-5.9L3.4 9.3l6-.8z"/></Icon>,
  columns: (p) => <Icon {...p}><rect x="3" y="4" width="5.2" height="16" rx="1.2"/><rect x="9.4" y="4" width="5.2" height="16" rx="1.2"/><rect x="15.8" y="4" width="5.2" height="16" rx="1.2"/></Icon>,
  list: (p) => <Icon {...p}><path d="M8 6h13M8 12h13M8 18h13"/><circle cx="3.6" cy="6" r="1.1" fill="currentColor"/><circle cx="3.6" cy="12" r="1.1" fill="currentColor"/><circle cx="3.6" cy="18" r="1.1" fill="currentColor"/></Icon>,
  trash: (p) => <Icon {...p}><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/></Icon>,
  circle: (p) => <Icon {...p}><circle cx="12" cy="12" r="8"/></Icon>,
  play: (p) => <Icon {...p}><path d="M8 5v14l11-7z"/></Icon>,
  grip2: (p) => <Icon {...p}><circle cx="9" cy="7" r="1.2" fill="currentColor"/><circle cx="15" cy="7" r="1.2" fill="currentColor"/><circle cx="9" cy="12" r="1.2" fill="currentColor"/><circle cx="15" cy="12" r="1.2" fill="currentColor"/><circle cx="9" cy="17" r="1.2" fill="currentColor"/><circle cx="15" cy="17" r="1.2" fill="currentColor"/></Icon>,
  cart: (p) => <Icon {...p}><circle cx="9" cy="20" r="1.4" fill="currentColor"/><circle cx="17" cy="20" r="1.4" fill="currentColor"/><path d="M3 4h2l2.4 11.5a1.5 1.5 0 0 0 1.5 1.2h7.6a1.5 1.5 0 0 0 1.5-1.2L21 8H6"/></Icon>,
  plane: (p) => <Icon {...p}><path d="M10.5 13.5L3 11l1-2 7.5 1L17 4.5a2 2 0 0 1 2.8 2.8L15 12.5l1 7.5-2 1-2.5-7.5-3 3 .2 2.8-1.6.7-1.4-3-3-1.4.7-1.6 2.8.2z"/></Icon>,
  umbrella: (p) => <Icon {...p}><path d="M12 3v2M3 12a9 9 0 0 1 18 0z"/><path d="M12 12v6a2.5 2.5 0 0 0 5 0"/></Icon>,
  archive: (p) => <Icon {...p}><rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9M9 13h6"/></Icon>,
  key: (p) => <Icon {...p}><circle cx="8" cy="8" r="4"/><path d="M11 11l8 8M16 16l2-2M18 18l2-2"/></Icon>,
  wrench: (p) => <Icon {...p}><path d="M15 3a5 5 0 0 0-4.5 7.3L3 17.8 6.2 21l7.5-7.5A5 5 0 1 0 15 3z"/><circle cx="15.5" cy="8.5" r="1" fill="currentColor"/></Icon>,
};

/* ---- Module registry: groups -> modules ---- */
/* deep: has a real view; otherwise renders a designed stub */
const MODULES = [
  { group: 'Engagement Workspace', items: [
    { id: 'cockpit',     label: 'Engagement Cockpit', icon: 'dashboard', deep: true },
    { id: 'tasks',       label: 'My Tasks', icon: 'check', deep: true },
    { id: 'programme',   label: 'Audit Programme', icon: 'flask', deep: true },
    { id: 'reviewnotes', label: 'Review Notes', icon: 'doc', deep: true },
    { id: 'time',        label: 'Time & Budget', icon: 'clock', deep: true },
  ]},
  { group: 'Practice Operations', items: [
    { id: 'pipeline',    label: 'Sales Pipeline', icon: 'trend', deep: true },
    { id: 'delivery',    label: 'Delivery & Milestones', icon: 'flag', deep: true },
    { id: 'audittimeline', label: 'Jadwal & Lini Masa Audit', icon: 'calendar', tag: 'NEW', deep: true },
    { id: 'wipreal',     label: 'WIP & Realisasi', icon: 'hourglass', deep: true },
    { id: 'billing',     label: 'Billing & Invoicing', icon: 'receipt', deep: true },
    { id: 'scheduler',   label: 'Resource Scheduler', icon: 'users', deep: true },
    { id: 'capacity',    label: 'Capacity Planning', icon: 'pulse', deep: true },
  ]},
  { group: 'People & Compliance', items: [
    { id: 'hcm',          label: 'Human Capital', icon: 'users', deep: true },
    { id: 'orgchart',     label: 'Struktur Organisasi', icon: 'group', tag: 'NEW', deep: true },
    { id: 'recruitment',  label: 'Rekrutmen & Onboarding', icon: 'briefcase', tag: 'NEW', deep: true },
    { id: 'learning',     label: 'Pelatihan & Kompetensi', icon: 'flask', tag: 'NEW', deep: true },
    { id: 'succession',   label: 'Suksesi & Karier', icon: 'trend', tag: 'NEW', deep: true },
    { id: 'payroll',      label: 'Payroll & PPh 21', icon: 'coins', deep: true },
    { id: 'leave',        label: 'Cuti & Kehadiran', icon: 'calendar', deep: true },
    { id: 'performance',  label: 'Siklus Kinerja', icon: 'target', deep: true },
    { id: 'cpe',          label: 'CPE / PPL Tracker', icon: 'book', deep: true },
    { id: 'ethics',       label: 'Kode Etik & AML/PMPJ', icon: 'scale', tag: 'NEW', deep: true },
    { id: 'independence', label: 'Independence & Rotasi', icon: 'shield', deep: true },
    { id: 'hrcase',       label: 'Sanksi & Disiplin', icon: 'gavel', tag: 'NEW', deep: true },
  ]},
  { group: 'Firm Finance (ERP)', items: [
    { id: 'firmgl',       label: 'General Ledger', icon: 'ledger', deep: true },
    { id: 'apar',         label: 'AP / AR Firma', icon: 'coins', deep: true },
    { id: 'revenue',      label: 'Pendapatan & WIP', icon: 'receipt', deep: true },
    { id: 'treasury',     label: 'Anggaran & Arus Kas', icon: 'pulse', deep: true },
    { id: 'cashbank',     label: 'Kas, Bank & Rekonsiliasi', icon: 'building', deep: true },
    { id: 'fixedassets',  label: 'Aset Tetap Kantor', icon: 'layers', deep: true },
    { id: 'firmtax',      label: 'Pajak Firma', icon: 'report', deep: true },
    { id: 'profitability',label: 'Profitability', icon: 'trend', deep: true },
  ]},
  { group: 'Firm Platform', items: [
    { id: 'approvals',    label: 'Approvals', icon: 'checkCircle', deep: true },
    { id: 'integrations', label: 'Integrations', icon: 'link2', deep: true },
    { id: 'audittrail',   label: 'Audit Trail', icon: 'lock', deep: true },
  ]},
  { group: 'Jasa Non-Audit (SPAP)', items: [
    { id: 'nonaudit',     label: 'Portofolio Jasa', icon: 'briefcase', deep: true },
    { id: 'review2400',   label: 'Reviu LK (SPR 2400)', icon: 'search2', deep: true },
    { id: 'relatedsvc',   label: 'Jasa Terkait (4400/4410)', icon: 'flask', deep: true },
    { id: 'assurance',    label: 'Asurans Lain (SPA)', icon: 'shield', deep: true },
    { id: 'duediligence', label: 'Due Diligence', icon: 'search2', deep: true },
  ]},
  { group: 'Mutu, Risiko & Regulasi', items: [
    { id: 'governance', label: 'Governance (SOQM)', icon: 'building', deep: true },
    { id: 'soqm',       label: 'SOQM Operasional', icon: 'shield', deep: true },
    { id: 'eqr',        label: 'EQR Workflow', icon: 'checkCircle', deep: true },
    { id: 'pppk',       label: 'Pelaporan PPPK', icon: 'report', deep: true },
  ]},
  { group: 'OJK · Pasar Modal & Keberlanjutan', items: [
    { id: 'sustain',   label: 'Laporan Keberlanjutan (POJK 51)', icon: 'water', tag: 'NEW', deep: true },
    { id: 'sectorck',  label: 'Daftar-Uji Sektor Jasa Keuangan', icon: 'scale', tag: 'NEW', deep: true },
    { id: 'ojkfiling', label: 'Batas Waktu & e-Filing OJK/BEI', icon: 'clock', tag: 'NEW', deep: true },
    { id: 'auditcomm', label: 'Komite Audit (POJK 55/2015)', icon: 'group', tag: 'NEW', deep: true },
  ]},
  { group: 'Portal & Dokumen', items: [
    { id: 'presentasi',   label: 'Presentasi Klien', icon: 'play', tag: 'NEW', deep: true },
    { id: 'clientportal', label: 'Portal Klien / PBC', icon: 'users', deep: true },
    { id: 'dms',          label: 'Manajemen Dokumen', icon: 'layers', deep: true },
  ]},
  { group: 'Firm Practice Management', items: [
    { id: 'dashboard', label: 'Firm Dashboard', icon: 'dashboard', deep: true },
    { id: 'bi',        label: 'BI & Konsolidasi', icon: 'trend', deep: true },
    { id: 'crm',       label: 'Client CRM',     icon: 'users', deep: true },
    { id: 'risk',      label: 'Risk Assessment', icon: 'shield', deep: true },
    { id: 'engagement',label: 'Engagement Mgmt', icon: 'briefcase', deep: true },
    { id: 'onboarding',label: 'Onboarding Klien', icon: 'flag', deep: true },
    { id: 'dataflow',  label: 'Alur Data & Integritas', icon: 'link2', deep: true },
  ]},
  { group: 'Core Planning', items: [
    { id: 'materiality', label: 'Materiality', icon: 'target', deep: true },
    { id: 'icfr',        label: 'Internal Control', icon: 'sliders', deep: true },
    { id: 'strategy',    label: 'Strategy Memo', icon: 'doc', deep: true },
  ]},
  { group: 'Core Execution', items: [
    { id: 'wtb',        label: 'Working Trial Balance', icon: 'table', deep: true, tag: 'WTB' },
    { id: 'aje',        label: 'Adjusting Entries (AJE)', icon: 'ledger', deep: true },
    { id: 'workpapers', label: 'Working Papers', icon: 'layers', deep: true },
    { id: 'analytical', label: 'Analytical Review', icon: 'trend', deep: true },
    { id: 'sampling',   label: 'Sampling Engine', icon: 'dice', deep: true },
    { id: 'jet',        label: 'Journal Entry Testing', icon: 'flask', deep: true },
  ]},
  { group: 'Core Specifics', items: [
    { id: 'confirm',    label: 'Confirmation Hub', icon: 'mail', deep: true },
    { id: 'goingconcern', label: 'Going Concern', icon: 'pulse', deep: true },
    { id: 'opening',    label: 'Opening Balance', icon: 'clock', deep: true },
    { id: 'subsequent', label: 'Subsequent Events', icon: 'calendar', deep: true },
    { id: 'related',    label: 'Related Parties', icon: 'link2', deep: true },
    { id: 'groupaudit', label: 'Group Audit', icon: 'group', deep: true },
    { id: 'internalaudit', label: 'Internal Audit', icon: 'shield', deep: true },
    { id: 'expert',     label: 'Use of Expert', icon: 'expert', deep: true },
    { id: 'serviceorg', label: 'Service Org', icon: 'server', deep: true },
    { id: 'sad',        label: 'SAD Ledger', icon: 'scale', deep: true },
    { id: 'evidence',   label: 'Evidence Evaluation', icon: 'search2', deep: true },
  ]},
  { group: 'Referensi & Indeks', items: [
    { id: 'compmatrix', label: 'Matriks Kepatuhan', icon: 'table', tag: 'NEW', deep: true },
    { id: 'templates',  label: 'Template Library', icon: 'template', deep: true },
    { id: 'kb',         label: 'Knowledge Base', icon: 'book', deep: true },
  ]},
  { group: 'SA · Tanggung Jawab (200)', items: [
    { id: 'sa200', label: 'SA 200 · Tujuan Keseluruhan', icon: 'shield', tag: 'NEW', deep: true },
    { id: 'sa230', label: 'SA 230 · Dokumentasi Audit', icon: 'layers', tag: 'NEW', deep: true },
    { id: 'sa240', label: 'SA 240 · Kecurangan (Fraud)', icon: 'flask', deep: true },
    { id: 'sa250', label: 'SA 250 · Hukum & Regulasi', icon: 'gavel', deep: true },
    { id: 'sa260', label: 'SA 260 · Komunikasi TCWG', icon: 'mail', deep: true },
    { id: 'sa265', label: 'SA 265 · Defisiensi Pengendalian', icon: 'shield', deep: true },
  ]},
  { group: 'SA · Bukti Audit (500)', items: [
    { id: 'sa501', label: 'SA 501 · Bukti Spesifik', icon: 'doc', deep: true },
    { id: 'sa520', label: 'SA 520 · Prosedur Analitis', icon: 'trend', deep: true },
    { id: 'sa530', label: 'SA 530 · Sampling Audit', icon: 'dice', deep: true },
    { id: 'sa540', label: 'SA 540 · Estimasi Akuntansi', icon: 'target', deep: true },
    { id: 'sa580', label: 'SA 580 · Representasi Tertulis', icon: 'doc', deep: true },
  ]},
  { group: 'SA · Pelaporan (700)', items: [
    { id: 'sa701', label: 'SA 701 · Hal Audit Utama', icon: 'star', deep: true },
    { id: 'sa705', label: 'SA 705/706 · Modifikasi Opini', icon: 'gavel', deep: true },
    { id: 'sa710', label: 'SA 710 · Komparatif', icon: 'table', deep: true },
    { id: 'sa720', label: 'SA 720 · Informasi Lain', icon: 'doc', deep: true },
  ]},
  { group: 'SA · Area Khusus & Perikatan', items: [
    { id: 'sa800', label: 'SA 800 · Kerangka Khusus', icon: 'book', deep: true },
    { id: 'sa805', label: 'SA 805 · LK Tunggal & Elemen', icon: 'columns', tag: 'NEW', deep: true },
    { id: 'sa810', label: 'SA 810 · Ringkasan LK', icon: 'report', tag: 'NEW', deep: true },
    { id: 'spr2400', label: 'SPR 2400 · Reviu', icon: 'search2', deep: true },
    { id: 'spr2410', label: 'SPR 2410 · Reviu Interim', icon: 'pulse', tag: 'NEW', deep: true },
    { id: 'sjah3000', label: 'SJAH 3000 · Asurans', icon: 'shield', deep: true },
    { id: 'sjah3400', label: 'SJAH 3400 · Info Prospektif', icon: 'trend', tag: 'NEW', deep: true },
    { id: 'sjah3402', label: 'SJAH 3402 · Org. Jasa', icon: 'server', tag: 'NEW', deep: true },
    { id: 'sjah3410', label: 'SJAH 3410 · Emisi GRK', icon: 'flask', tag: 'NEW', deep: true },
    { id: 'sjah3420', label: 'SJAH 3420 · Info Proforma', icon: 'layers', tag: 'NEW', deep: true },
  ]},
  { group: 'Akuntansi (PSAK & SAK)', items: [
    { id: 'psak1', label: 'PSAK 1 · Penyajian LK', icon: 'report', tag: 'NEW', deep: true },
    { id: 'psak2', label: 'PSAK 2 · Laporan Arus Kas', icon: 'water', tag: 'NEW', deep: true },
    { id: 'psak14', label: 'PSAK 14 · Persediaan', icon: 'layers', tag: 'NEW', deep: true },
    { id: 'psak16', label: 'PSAK 16 · Aset Tetap', icon: 'building', tag: 'NEW', deep: true },
    { id: 'psak19', label: 'PSAK 19 · Aset Takberwujud', icon: 'sparkle', tag: 'NEW', deep: true },
    { id: 'psak22', label: 'PSAK 22 · Kombinasi Bisnis', icon: 'columns', tag: 'NEW', deep: true },
    { id: 'psak24', label: 'PSAK 24 · Imbalan Kerja', icon: 'users', tag: 'NEW', deep: true },
    { id: 'psak25', label: 'PSAK 25 · Kebijakan, Estimasi & Kesalahan', icon: 'sync', tag: 'NEW', deep: true },
    { id: 'psak46', label: 'PSAK 46 · Pajak Penghasilan', icon: 'receipt', tag: 'NEW', deep: true },
    { id: 'psak48', label: 'PSAK 48/57 · Penurunan Nilai & Provisi', icon: 'scale', tag: 'NEW', deep: true },
    { id: 'psak58', label: 'PSAK 58 · Aset Dijual & Operasi Dihentikan', icon: 'archive', tag: 'NEW', deep: true },
    { id: 'psak65', label: 'PSAK 65 · Laporan Konsolidasian', icon: 'building', tag: 'NEW', deep: true },
    { id: 'psak66', label: 'PSAK 66 · Pengaturan Bersama', icon: 'columns', tag: 'NEW', deep: true },
    { id: 'psak68', label: 'PSAK 68 · Pengukuran Nilai Wajar', icon: 'layers', tag: 'NEW', deep: true },
    { id: 'psak71', label: 'PSAK 71 · Instrumen Keuangan', icon: 'coins', deep: true },
    { id: 'psak72', label: 'PSAK 72 · Pendapatan', icon: 'receipt', tag: 'NEW', deep: true },
    { id: 'psak73', label: 'PSAK 73 · Sewa', icon: 'building', deep: true },
    { id: 'psak117', label: 'PSAK 117 · Kontrak Asuransi', icon: 'shield', tag: 'NEW', deep: true },
    { id: 'isak35', label: 'ISAK 35 · Entitas Nonlaba', icon: 'users', tag: 'NEW', deep: true },
    { id: 'segmen', label: 'PSAK 5 · Informasi Segmen', icon: 'columns', tag: 'NEW', deep: true },
    { id: 'invprop', label: 'PSAK 13 · Properti Investasi', icon: 'building', tag: 'NEW', deep: true },
    { id: 'assoc', label: 'PSAK 15 · Investasi Asosiasi', icon: 'layers', tag: 'NEW', deep: true },
    { id: 'newdisc', label: 'Pengungkapan Baru 2024', icon: 'sparkle', tag: 'NEW', deep: true },
    { id: 'sakroadmap', label: 'Roadmap SAK & Pelacak ISAK', icon: 'hourglass', tag: 'NEW', deep: true },
    { id: 'sakep', label: 'SAK EP · Entitas Privat', icon: 'book', tag: 'NEW', deep: true },
    { id: 'framework', label: 'Penentu Kerangka (SAK/EP/EMKM)', icon: 'scale', tag: 'NEW', deep: true },
    { id: 'ecl',   label: 'Kalkulator ECL', icon: 'target', tag: 'ECL', deep: true },
  ]},
  { group: 'Akuntansi Syariah (SAK Syariah)', items: [
    { id: 'syariah', label: 'SAK Syariah · PSAK 101–112', icon: 'book', tag: 'NEW', deep: true },
  ]},
  { group: 'Finalisasi & Pelaporan', items: [
    { id: 'fsgen',   label: 'Financial Statement Gen.', icon: 'report', deep: true },
    { id: 'disclosure', label: 'Daftar-Uji Pengungkapan', icon: 'checkCircle', tag: 'NEW', deep: true },
    { id: 'opinion', label: 'Audit Opinion Generator', icon: 'gavel', deep: true },
    { id: 'mgmtletter', label: 'Management Letter', icon: 'mail', deep: true },
  ]},
  { group: 'Backoffice & Firm Mgmt', items: [
    { id: 'firmops',     label: 'Cockpit Operasi Firma', icon: 'layers', tag: 'NEW', deep: true },
    { id: 'firmfinance', label: 'Firm Finance', icon: 'coins', deep: true },
    { id: 'procurement', label: 'Pengadaan & Vendor', icon: 'cart', tag: 'NEW', deep: true },
    { id: 'facilities',  label: 'Aset & Fasilitas Kantor', icon: 'building', tag: 'NEW', deep: true },
    { id: 'records',     label: 'Retensi & Arsip (SA 230)', icon: 'archive', tag: 'NEW', deep: true },
    { id: 'legal',       label: 'Kontrak & Legal Firma', icon: 'gavel', tag: 'NEW', deep: true },
    { id: 'insurance',   label: 'Asuransi (PII) & Risiko', icon: 'umbrella', tag: 'NEW', deep: true },
    { id: 'travel',      label: 'Perjalanan & Reimbursement', icon: 'plane', tag: 'NEW', deep: true },
    { id: 'licensing',   label: 'Lisensi & Perizinan', icon: 'key', tag: 'NEW', deep: true },
    { id: 'tax',     label: 'Pajak PPh 23', icon: 'receipt', deep: true },
    { id: 'crypto',  label: 'Compliance & Kriptografi', icon: 'lock', deep: true },
    { id: 'pdp',     label: 'Pelindungan Data Pribadi (PDP)', icon: 'shield', tag: 'NEW', deep: true },
    { id: 'wip',     label: 'WIP Valuation', icon: 'hourglass', deep: true },
    { id: 'forensic', label: 'Forensic Cash Flow', icon: 'water', deep: true },
  ]},
];

const MODULE_INDEX = {};
MODULES.forEach(g => g.items.forEach(m => { MODULE_INDEX[m.id] = { ...m, group: g.group }; }));

/* ---- Two-tier navigation: workspaces (top-level context) ----
   "Standar" dilebur ke "Perikatan": tiap prosedur menautkan SA terkait
   lewat chip "Standar Terkait" (lihat RELATED_SA). Halaman SA mendalam tetap
   ada namun disembunyikan dari sidebar (HIDDEN_GROUPS) — dibuka via chip,
   Matriks Kepatuhan, atau ⌘K. */
const WORKSPACES = [
  { id: 'engagement', label: 'Perikatan', icon: 'briefcase', desc: 'Kerja audit per-engagement',
    groups: ['Engagement Workspace', 'Referensi & Indeks', 'Core Planning', 'Core Execution', 'Core Specifics', 'Finalisasi & Pelaporan'] },
  { id: 'firm', label: 'Firma', icon: 'building', desc: 'Operasi & tata kelola firma',
    groups: ['Firm Practice Management', 'Practice Operations', 'People & Compliance', 'Firm Finance (ERP)', 'Jasa Non-Audit (SPAP)', 'SA · Area Khusus & Perikatan', 'Mutu, Risiko & Regulasi', 'OJK · Pasar Modal & Keberlanjutan', 'Portal & Dokumen', 'Firm Platform', 'Backoffice & Firm Mgmt'] },
];
/* Grup yang tetap dapat diakses (⌘K + chip + Matriks Kepatuhan) tapi tidak
   muncul di sidebar mana pun — menjaga sidebar Perikatan tetap ramping. */
const HIDDEN_GROUPS = ['SA · Tanggung Jawab (200)', 'SA · Bukti Audit (500)', 'SA · Pelaporan (700)', 'Akuntansi (PSAK & SAK)', 'Akuntansi Syariah (SAK Syariah)'];

const GROUP_WS = {};
WORKSPACES.forEach(w => w.groups.forEach(g => { GROUP_WS[g] = w.id; }));
const wsForModule = (id) => {
  const g = (MODULE_INDEX[id] || {}).group;
  if (HIDDEN_GROUPS.includes(g)) return null; // jangan paksa pindah workspace untuk halaman tersembunyi
  return GROUP_WS[g] || 'firm';
};

/* ---- Peta prosedur Perikatan → Standar Audit (SA) terkait ----
   `view` = id halaman SA mendalam bila tersedia (dibuka di drawer);
   tanpa `view`, chip membuka kartu rujukan ringkas + tautan Matriks Kepatuhan. */
const RELATED_SA = {
  // Perencanaan
  strategy:    [{ code: 'SA 300', title: 'Perencanaan Audit LK', phase: 'Perencanaan' }],
  materiality: [{ code: 'SA 320', title: 'Materialitas dalam Perencanaan & Pelaksanaan', phase: 'Perencanaan' }],
  icfr:        [{ code: 'SA 315', title: 'Identifikasi & Penilaian ROMM', phase: 'Perencanaan' }, { code: 'SA 265', title: 'Defisiensi Pengendalian Internal', phase: 'Pelaporan', view: 'sa265' }, { code: 'SA 250', title: 'Pertimbangan Hukum & Regulasi', phase: 'Perencanaan', view: 'sa250' }],
  // Pelaksanaan — inti
  wtb:         [{ code: 'SA 500', title: 'Bukti Audit', phase: 'Pelaksanaan' }],
  workpapers:  [{ code: 'SA 330', title: 'Respons Auditor terhadap Risiko', phase: 'Pelaksanaan' }, { code: 'SA 230', title: 'Dokumentasi Audit', phase: 'Pelaksanaan', view: 'sa230' }],
  analytical:  [{ code: 'SA 520', title: 'Prosedur Analitis', phase: 'Pelaksanaan', view: 'sa520' }],
  sampling:    [{ code: 'SA 530', title: 'Sampling Audit', phase: 'Pelaksanaan', view: 'sa530' }],
  jet:         [{ code: 'SA 240', title: 'Tanggung Jawab atas Kecurangan (Fraud)', phase: 'Pelaksanaan', view: 'sa240' }, { code: 'SA 330', title: 'Respons Auditor terhadap Risiko', phase: 'Pelaksanaan' }],
  evidence:    [{ code: 'SA 500', title: 'Bukti Audit', phase: 'Pelaksanaan' }, { code: 'SA 501', title: 'Bukti Audit — Unsur Tertentu', phase: 'Pelaksanaan', view: 'sa501' }],
  // Pelaksanaan — spesifik
  confirm:     [{ code: 'SA 505', title: 'Konfirmasi Eksternal', phase: 'Pelaksanaan' }],
  goingconcern:[{ code: 'SA 570', title: 'Kelangsungan Usaha', phase: 'Pelaporan' }],
  opening:     [{ code: 'SA 510', title: 'Saldo Awal — Perikatan Tahun Pertama', phase: 'Perencanaan' }],
  subsequent:  [{ code: 'SA 560', title: 'Peristiwa Kemudian', phase: 'Pelaporan' }],
  related:     [{ code: 'SA 550', title: 'Pihak Berelasi', phase: 'Pelaksanaan' }],
  groupaudit:  [{ code: 'SA 600', title: 'Audit Grup (Komponen)', phase: 'Pelaksanaan' }],
  expert:      [{ code: 'SA 620', title: 'Penggunaan Pekerjaan Pakar Auditor', phase: 'Pelaksanaan' }],
  serviceorg:  [{ code: 'SA 402', title: 'Pertimbangan Audit atas Organisasi Jasa', phase: 'Pelaksanaan' }],
  sad:         [{ code: 'SA 450', title: 'Evaluasi Salah Saji', phase: 'Pelaporan' }],
  aje:         [{ code: 'SA 450', title: 'Evaluasi Salah Saji', phase: 'Pelaporan' }],
  // Finalisasi & pelaporan
  fsgen:       [{ code: 'SA 700', title: 'Perumusan Opini & Pelaporan atas LK', phase: 'Pelaporan' }, { code: 'SA 710', title: 'Informasi Komparatif', phase: 'Pelaporan', view: 'sa710' }, { code: 'SA 720', title: 'Informasi Lain', phase: 'Pelaporan', view: 'sa720' }],
  opinion:     [{ code: 'SA 700', title: 'Perumusan Opini & Pelaporan atas LK', phase: 'Pelaporan' }, { code: 'SA 701', title: 'Hal Audit Utama (KAM)', phase: 'Pelaporan', view: 'sa701' }, { code: 'SA 705/706', title: 'Modifikasi Opini', phase: 'Pelaporan', view: 'sa705' }, { code: 'SA 580', title: 'Representasi Tertulis', phase: 'Pelaporan', view: 'sa580' }, { code: 'SA 720', title: 'Informasi Lain', phase: 'Pelaporan', view: 'sa720' }],
  mgmtletter:  [{ code: 'SA 260', title: 'Komunikasi dengan TCWG', phase: 'Pelaporan', view: 'sa260' }, { code: 'SA 265', title: 'Defisiensi Pengendalian Internal', phase: 'Pelaporan', view: 'sa265' }],
  psak1:       [{ code: 'SA 700', title: 'Perumusan Opini & Pelaporan atas LK', phase: 'Pelaporan' }, { code: 'SA 710', title: 'Informasi Komparatif', phase: 'Pelaporan', view: 'sa710' }],
  psak14:      [{ code: 'SA 501', title: 'Bukti Audit — Observasi Persediaan', phase: 'Pelaksanaan', view: 'sa501' }, { code: 'SA 540', title: 'Audit Estimasi Akuntansi (NRV)', phase: 'Pelaksanaan', view: 'sa540' }, { code: 'SA 520', title: 'Prosedur Analitis', phase: 'Pelaksanaan', view: 'sa520' }],
  psak16:      [{ code: 'SA 501', title: 'Bukti Audit — Inspeksi Aset Berwujud', phase: 'Pelaksanaan', view: 'sa501' }, { code: 'SA 540', title: 'Audit Estimasi Akuntansi (umur manfaat & residu)', phase: 'Pelaksanaan', view: 'sa540' }, { code: 'SA 520', title: 'Prosedur Analitis (penyusutan)', phase: 'Pelaksanaan', view: 'sa520' }],
  psak19:      [{ code: 'SA 540', title: 'Audit Estimasi Akuntansi (umur manfaat & uji penurunan nilai)', phase: 'Pelaksanaan', view: 'sa540' }, { code: 'SA 500', title: 'Bukti Audit — Kapitalisasi & Hak Hukum', phase: 'Pelaksanaan' }, { code: 'SA 520', title: 'Prosedur Analitis (amortisasi)', phase: 'Pelaksanaan', view: 'sa520' }],
  psak24:      [{ code: 'SA 540', title: 'Audit Estimasi Akuntansi', phase: 'Pelaksanaan', view: 'sa540' }, { code: 'SA 500', title: 'Bukti Audit — Pakar Manajemen', phase: 'Pelaksanaan' }, { code: 'SA 620', title: 'Penggunaan Pekerjaan Pakar Auditor', phase: 'Pelaksanaan' }],
  psak25:      [{ code: 'SA 540', title: 'Audit Estimasi Akuntansi', phase: 'Pelaksanaan', view: 'sa540' }, { code: 'SA 710', title: 'Informasi Komparatif', phase: 'Pelaporan', view: 'sa710' }, { code: 'SA 450', title: 'Evaluasi Salah Saji', phase: 'Pelaporan', view: 'sad' }],
  psak46:      [{ code: 'SA 540', title: 'Audit Estimasi Akuntansi (recoverability DTA)', phase: 'Pelaksanaan', view: 'sa540' }, { code: 'SA 500', title: 'Bukti Audit — Perhitungan Pajak', phase: 'Pelaksanaan' }, { code: 'SA 450', title: 'Evaluasi Salah Saji', phase: 'Pelaporan', view: 'sad' }],
  psak71:      [{ code: 'SA 540', title: 'Audit Estimasi Akuntansi (ECL / CKPN)', phase: 'Pelaksanaan', view: 'sa540' }, { code: 'SA 505', title: 'Konfirmasi Eksternal Piutang', phase: 'Pelaksanaan' }, { code: 'SA 530', title: 'Sampling Audit', phase: 'Pelaksanaan', view: 'sa530' }, { code: 'SA 240', title: 'Bias Manajemen atas Estimasi', phase: 'Pelaksanaan', view: 'sa240' }],
  psak72:      [{ code: 'SA 240', title: 'Risiko Kecurangan Pengakuan Pendapatan (¶26)', phase: 'Pelaksanaan', view: 'sa240' }, { code: 'SA 505', title: 'Konfirmasi Eksternal Piutang', phase: 'Pelaksanaan' }, { code: 'SA 520', title: 'Prosedur Analitis (pendapatan)', phase: 'Pelaksanaan', view: 'sa520' }, { code: 'SA 530', title: 'Sampling Audit', phase: 'Pelaksanaan', view: 'sa530' }],
  psak117:     [{ code: 'SA 540', title: 'Audit Estimasi Akuntansi (valuasi liabilitas asuransi)', phase: 'Pelaksanaan', view: 'sa540' }, { code: 'SA 620', title: 'Penggunaan Pekerjaan Pakar Auditor (Aktuaris)', phase: 'Pelaksanaan' }, { code: 'SA 500', title: 'Bukti Audit — Data Polis & Klaim', phase: 'Pelaksanaan' }, { code: 'SA 701', title: 'Hal Audit Utama (KAM)', phase: 'Pelaporan', view: 'sa701' }],
  isak35:      [{ code: 'SA 250', title: 'Pertimbangan Hukum & Regulasi (UU Yayasan & syarat hibah)', phase: 'Perencanaan', view: 'sa250' }, { code: 'SA 505', title: 'Konfirmasi Eksternal (komitmen donor & piutang hibah)', phase: 'Pelaksanaan' }, { code: 'SA 540', title: 'Audit Estimasi Akuntansi (ECL piutang & masa manfaat aset)', phase: 'Pelaksanaan', view: 'sa540' }, { code: 'SA 700', title: 'Perumusan Opini & Pelaporan atas LK', phase: 'Pelaporan' }],
  syariah:     [{ code: 'SA 250', title: 'Pertimbangan Hukum & Regulasi (kepatuhan syariah)', phase: 'Perencanaan', view: 'sa250' }, { code: 'SA 620', title: 'Penggunaan Pekerjaan Pakar (Dewan Pengawas Syariah)', phase: 'Pelaksanaan' }, { code: 'SA 540', title: 'Audit Estimasi Akuntansi (CKPN pembiayaan)', phase: 'Pelaksanaan', view: 'sa540' }, { code: 'SA 701', title: 'Hal Audit Utama (KAM)', phase: 'Pelaporan', view: 'sa701' }],
  ecl:         [{ code: 'SA 540', title: 'Audit Estimasi Akuntansi (ECL / CKPN)', phase: 'Pelaksanaan', view: 'sa540' }, { code: 'SA 530', title: 'Sampling Audit', phase: 'Pelaksanaan', view: 'sa530' }],
  sakroadmap:  [{ code: 'SA 700', title: 'Perumusan Opini — keberterimaan & kelengkapan kerangka pelaporan', phase: 'Pelaporan' }, { code: 'PSAK 25', title: 'Pengungkapan Standar Terbit Belum Efektif (¶30–31)', phase: 'Akuntansi' }, { code: 'SA 250', title: 'Pertimbangan Hukum & Regulasi (perubahan kerangka)', phase: 'Perencanaan', view: 'sa250' }],
  // Perencanaan, penerimaan perikatan & kendali mutu
  programme:   [{ code: 'SA 300', title: 'Perencanaan Audit LK', phase: 'Perencanaan' }, { code: 'SA 330', title: 'Respons Auditor terhadap Risiko', phase: 'Pelaksanaan' }],
  onboarding:  [{ code: 'SA 210', title: 'Persetujuan Ketentuan Perikatan', phase: 'Perencanaan' }, { code: 'SA 220', title: 'Pengendalian Mutu Perikatan Audit', phase: 'Perencanaan' }],
  crm:         [{ code: 'SA 210', title: 'Persetujuan Ketentuan Perikatan', phase: 'Perencanaan' }],
  eqr:         [{ code: 'SA 220', title: 'Pengendalian Mutu Perikatan Audit', phase: 'Pelaporan' }],
  reviewnotes: [{ code: 'SA 220', title: 'Pengendalian Mutu Perikatan Audit', phase: 'Pelaksanaan' }],
  dataflow:    [{ code: 'SA 500', title: 'Bukti Audit', phase: 'Pelaksanaan' }, { code: 'SA 230', title: 'Dokumentasi Audit', phase: 'Pelaksanaan' }],
  internalaudit: [{ code: 'SA 610', title: 'Penggunaan Pekerjaan Auditor Internal', phase: 'Pelaksanaan' }],
  framework:   [{ code: 'SA 210', title: 'Persetujuan Ketentuan Perikatan — keberterimaan kerangka pelaporan', phase: 'Perencanaan' }, { code: 'SA 700', title: 'Perumusan Opini & Pelaporan atas LK', phase: 'Pelaporan', view: 'sa705' }, { code: 'SA 800', title: 'Pertimbangan Khusus — Kerangka Bertujuan Khusus', phase: 'Area Khusus', view: 'sa800' }],
  sjah3420:    [{ code: 'SJAH 3420', title: 'Asurans Penyusunan Informasi Keuangan Proforma', phase: 'Perikatan Lain' }, { code: 'PSAK 22', title: 'Kombinasi Bisnis — dasar penyesuaian proforma', phase: 'Akuntansi' }, { code: 'PSAK 65', title: 'Laporan Keuangan Konsolidasian — sumber tidak disesuaikan', phase: 'Akuntansi' }],
  // OJK · Pasar Modal & Keberlanjutan
  sustain:     [{ code: 'SA 720', title: 'Tanggung Jawab Auditor atas Informasi Lain (Laporan Keberlanjutan)', phase: 'Pelaporan', view: 'sa720' }, { code: 'SJAH 3410', title: 'Asurans Laporan Emisi GRK', phase: 'Perikatan Lain', view: 'sjah3410' }, { code: 'SA 250', title: 'Pertimbangan Hukum & Regulasi (POJK 51/2017)', phase: 'Perencanaan', view: 'sa250' }],
  sectorck:    [{ code: 'SA 250', title: 'Pertimbangan Hukum & Regulasi Sektoral (POJK/SEOJK)', phase: 'Perencanaan', view: 'sa250' }, { code: 'SA 315', title: 'Identifikasi & Penilaian ROMM (industri teregulasi)', phase: 'Perencanaan' }, { code: 'SA 540', title: 'Audit Estimasi Akuntansi (CKPN / cadangan teknis)', phase: 'Pelaksanaan', view: 'sa540' }],
  ojkfiling:   [{ code: 'SA 700', title: 'Perumusan Opini & Pelaporan atas LK', phase: 'Pelaporan' }, { code: 'SA 560', title: 'Peristiwa Kemudian — sebelum tanggal penyampaian', phase: 'Pelaporan' }, { code: 'SA 230', title: 'Dokumentasi Audit (bukti tanda terima)', phase: 'Pelaporan', view: 'sa230' }],
  auditcomm:   [{ code: 'SA 260', title: 'Komunikasi dengan TCWG', phase: 'Pelaporan', view: 'sa260' }, { code: 'SA 265', title: 'Defisiensi Pengendalian Internal', phase: 'Pelaporan', view: 'sa265' }, { code: 'SA 701', title: 'Hal Audit Utama (KAM)', phase: 'Pelaporan', view: 'sa701' }],
};

Object.assign(window, { Icon, I, MODULES, MODULE_INDEX, WORKSPACES, GROUP_WS, wsForModule, HIDDEN_GROUPS, RELATED_SA });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { GROUP_WS, HIDDEN_GROUPS, I, Icon, MODULES, MODULE_INDEX, RELATED_SA, WORKSPACES, wsForModule };
