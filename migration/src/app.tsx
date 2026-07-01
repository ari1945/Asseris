/* [codemod] ESM imports */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { hydrateCoreFromApi, api, setAuthToken } from './api';
import { AppProviders, NavContext, NavFromContext } from './contexts';
import { LoginScreen } from './view_login';
import { Copilot } from './copilot';
import { I, MODULE_INDEX } from './icons';
import { MiniMap } from './minimap';
import { ModuleLineage, StandardLinkback } from './related_modules';
import { Sidebar, SubBar, TopBar } from './shell';
import { Btn, StubView } from './ui';
import { AJEView } from './view_aje';
import { AnalyticalReview } from './view_analytical';
import { AssociatesEquity } from './view_assoc';
import { AuditCommitteeView } from './view_auditcomm';
import { AuditTimeline } from './view_audittimeline';
import { FirmBI } from './view_bi';
import { FirmLicensing, FirmTravel } from './view_bo3';
import { ECLCalculator } from './view_calc';
import { CapacityPlanning } from './view_capacity';
import { ClientPortal } from './view_clientportal';
import { AuditProgramme } from './view_cockpit';
import { EngagementCockpit } from './view_cockpit2';
import { ComplianceView } from './view_compliance';
import { ComplianceMatrix } from './view_compmatrix';
import { ConfirmationHub } from './view_confirm';
import { CryptoCompliance } from './view_crypto';
import { FirmDashboard } from './view_dashboard';
import { HomeView } from './view_home';
import { DataFlow } from './view_dataflow';
import { DeliveryMilestones } from './view_delivery';
import { DisclosureChecklist } from './view_disclosure';
import { DocManagement } from './view_dms';
import { DueDiligence } from './view_duediligence';
import { EQRWorkflow } from './view_eqr';
import { EvidenceEvaluation } from './view_evidence';
import { WTBView } from './view_execution';
import { Facilities } from './view_facilities';
import { ManagementLetter } from './view_final3';
import { ClientCRM, EngagementMgmt } from './view_firm';
import { FirmFinance, WIPValuation } from './view_firmfinance';
import { FirmAPAR, FirmGL } from './view_firmgl';
import { FirmOps } from './view_firmops';
import { FirmRevenue } from './view_firmrevenue';
import { FirmTax } from './view_firmtax';
import { CashBank, FirmTreasury, FixedAssets } from './view_firmtreasury';
import { ForensicCashFlow } from './view_forensic';
import { TaxAuditDiagnostic } from './view_diagnostics';
import { FrameworkView } from './view_framework';
import { FSGenerator } from './view_fsgen';
import { GoingConcern } from './view_goingconcern';
import { Governance } from './view_governance';
import { GroupAudit } from './view_groupaudit';
import { LeaveAttendance, Performance } from './view_hrops';
import { InternalControl } from './view_icfr';
import { FirmInsurance } from './view_insurance';
import { InternalAudit } from './view_internalaudit';
import { InvestmentProperty } from './view_invprop';
import { ISAK35View } from './view_isak35';
import { SOQM } from './view_isqm';
import { JournalEntryTesting } from './view_jet';
import { KnowledgeBase } from './view_kb';
import { LeaseCalculator } from './view_lease';
import { FirmLegal } from './view_legal2';
import { MaterialityCalc } from './view_materiality';
import { StrategyMemo } from './view_misc1';
import { Templates } from './view_misc2';
import { MyTasks } from './view_mytasks';
import { NewDisclosures2024 } from './view_newdisc';
import { NonAuditPortfolio, Review2400 } from './view_nonaudit';
import { OJKFilingView } from './view_ojkfiling';
import { ClientOnboarding } from './view_onboarding';
import { ContinuanceRegister } from './view_continuance';
import { OpeningBalance } from './view_opening';
import { AuditOpinionGen } from './view_opinion';
import { CommandPalette } from './view_palette';
import { Payroll } from './view_payroll';
import { EthicsDeclaration, HRCases } from './view_pc_conduct';
import { OrgChart, SuccessionPlanning } from './view_pc_org';
import { Learning, Recruitment } from './view_pc_talent';
import { PDPView } from './view_pdp';
import { CPETracker, HCM, Independence } from './view_people';
import { Billing, SalesPipeline } from './view_pipeline';
import { Approvals } from './view_platform';
import { Integrations } from './view_platform2';
import { AuditTrail } from './view_platform3';
import { PPPKReport } from './view_pppk';
import { PresentasiKlien } from './view_presentasi';
import { Procurement } from './view_procurement';
import { Profitability } from './view_profit';
import { PSAK1View } from './view_psak1';
import { PSAK117View } from './view_psak117';
import { PSAK14View } from './view_psak14';
import { PSAK16View } from './view_psak16';
import { PSAK19View } from './view_psak19';
import { PSAK2View } from './view_psak2';
import { PSAK22View } from './view_psak22';
import { PSAK24View } from './view_psak24';
import { PSAK25View } from './view_psak25';
import { PSAK46View } from './view_psak46';
import { PSAK48View } from './view_psak48';
import { PSAK58View } from './view_psak58';
import { PSAK65View } from './view_psak65';
import { PSAK66View } from './view_psak66';
import { PSAK68View } from './view_psak68';
import { PSAK71View } from './view_psak71';
import { PSAK72View } from './view_psak72';
import { RecordsRetention } from './view_records';
import { RelatedParties } from './view_related';
import { OtherAssurance, RelatedServices } from './view_relatedsvc';
import { RiskAssessment } from './view_risk';
import { SA200View } from './view_sa200';
import { SA230View } from './view_sa230';
import { SA240View } from './view_sa240';
import { SA250View, SA260View, SA265View } from './view_sa2comm';
import { SA501View } from './view_sa501';
import { SA520View } from './view_sa520';
import { SA530View } from './view_sa530';
import { SA540View } from './view_sa540';
import { SA580View } from './view_sa580';
import { SA701View } from './view_sa701';
import { SA705View } from './view_sa705';
import { SA710View } from './view_sa710';
import { SA720View } from './view_sa720';
import { SA800View } from './view_sa800';
import { SA805View } from './view_sa805';
import { SA810View } from './view_sa810';
import { SADLedger } from './view_sad';
import { SAKRoadmapView } from './view_sakroadmap';
import { ResourceScheduler } from './view_scheduler';
import { SectorChecklistView } from './view_sectorck';
import { SegmentInfo } from './view_segmen';
import { ServiceOrg } from './view_serviceorg';
import { SettingsView } from './view_settings';
import { SJAH3000View } from './view_sjah3000';
import { SJAH3400View } from './view_sjah3400';
import { SJAH3402View } from './view_sjah3402';
import { SJAH3410View } from './view_sjah3410';
import { SJAH3420View } from './view_sjah3420';
import { UseOfExpert } from './view_specifics2';
import { SPR2400View } from './view_spr2400';
import { SPR2410View } from './view_spr2410';
import { SubsequentEvents } from './view_subsequent';
import { SustainabilityView } from './view_sustain';
import { SyariahView } from './view_syariah';
import { TaxPPh23 } from './view_tax23';
import { TimeBudget } from './view_timebudget';
import { WIPRealization } from './view_wip_firm';
import { ReviewNotes } from './view_workspace';
import { WorkingPapers } from './view_wp';
import { AssertionMatrix } from './view_assertions';

/* ============================================================
   Asseris — Main app + router
   ============================================================ */
const { useState: useStateApp, useEffect: useEffectApp } = React;

/* React di-resolve dari JS tanpa @types → `React.Component` ter-infer parsial
   (tanpa state/props/setState). Tier app relaks: pakai basis ber-tipe `any`
   agar boundary kelas tak menabrak TS2339; perilaku runtime identik. */
const ReactComponentBase: any = React.Component;
class ViewErrorBoundary extends ReactComponentBase {
  constructor(p: any) { super(p); this.state = { err: null }; }
  static getDerivedStateFromError(err: any) { return { err }; }
  componentDidUpdate(prev: any) { if (prev.routeKey !== this.props.routeKey && this.state.err) this.setState({ err: null }); }
  render() {
    if (this.state.err) {
      return <div className="view-pad" style={{ padding: 24 }}>
        <div className="panel" style={{ padding: 18, borderTop: '3px solid var(--red)' }}>
          <div style={{ fontWeight: 700, marginBottom: 8, color: 'var(--red)' }}>Gagal merender modul “{this.props.routeKey}”.</div>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 11, color: 'var(--ink-2)', fontFamily: 'var(--mono)', lineHeight: 1.5 }}>{String(this.state.err && (this.state.err.stack || this.state.err.message || this.state.err))}</pre>
        </div>
      </div>;
    }
    return this.props.children;
  }
}

function viewFor(moduleId: any) {
  switch (moduleId) {
    case 'home':       return <HomeView />;
    case 'dashboard':  return <FirmDashboard />;
    case 'bi':         return <FirmBI />;
    case 'crm':        return <ClientCRM />;
    case 'risk':       return <RiskAssessment />;
    case 'engagement': return <EngagementMgmt />;
    case 'onboarding': return <ClientOnboarding />;
    case 'continuance': return <ContinuanceRegister />;
    case 'dataflow':   return <DataFlow />;
    case 'wtb':        return <WTBView />;
    case 'aje':        return <AJEView />;
    case 'materiality':return <MaterialityCalc />;
    case 'sampling':   return <SA530View />;  /* alias redirect — modul SA 530 dikonsolidasi ke sa530 */
    case 'ecl':        return <ECLCalculator />;
    case 'goingconcern': return <GoingConcern />;
    case 'jet':        return <JournalEntryTesting />;
    case 'diagnostic': return <TaxAuditDiagnostic />;
    case 'opinion':    return <AuditOpinionGen />;
    case 'presentasi': return <PresentasiKlien />;
    case 'analytical': return <AnalyticalReview />;
    case 'confirm':    return <ConfirmationHub />;
    case 'psak1':      return <PSAK1View />;
    case 'psak2':      return <PSAK2View />;
    case 'psak14':     return <PSAK14View />;
    case 'psak16':     return <PSAK16View />;
    case 'psak19':     return <PSAK19View />;
    case 'psak22':     return <PSAK22View />;
    case 'psak24':     return <PSAK24View />;
    case 'psak25':     return <PSAK25View />;
    case 'psak46':     return <PSAK46View />;
    case 'psak48':     return <PSAK48View />;
    case 'psak58':     return <PSAK58View />;
    case 'psak65':     return <PSAK65View />;
    case 'psak66':     return <PSAK66View />;
    case 'psak68':     return <PSAK68View />;
    case 'psak71':     return <PSAK71View />;
    case 'psak72':     return <PSAK72View />;
    case 'psak117':    return <PSAK117View />;
    case 'isak35':     return <ISAK35View />;
    case 'framework':  return <FrameworkView />;
    case 'syariah':    return <SyariahView />;
    case 'segmen':     return <SegmentInfo />;
    case 'invprop':    return <InvestmentProperty />;
    case 'assoc':      return <AssociatesEquity />;
    case 'newdisc':    return <NewDisclosures2024 />;
    case 'sakroadmap': return <SAKRoadmapView />;
    case 'disclosure': return <DisclosureChecklist />;
    case 'psak73':     return <LeaseCalculator />;
    case 'icfr':       return <InternalControl />;
    case 'fsgen':      return <FSGenerator />;
    case 'related':    return <RelatedParties />;
    case 'subsequent': return <SubsequentEvents />;
    case 'sad':        return <SADLedger />;
    case 'firmfinance':return <FirmFinance />;
    case 'firmops':    return <FirmOps />;
    case 'wip':        return <WIPValuation />;
    case 'forensic':   return <ForensicCashFlow />;
    case 'procurement':return <Procurement />;    case 'facilities': return <Facilities />;
    case 'records':    return <RecordsRetention />;
    case 'legal':      return <FirmLegal />;
    case 'insurance':  return <FirmInsurance />;
    case 'travel':     return <FirmTravel />;
    case 'licensing':  return <FirmLicensing />;
    case 'groupaudit': return <GroupAudit />;
    case 'internalaudit': return <InternalAudit />;
    case 'expert':     return <UseOfExpert />;
    case 'serviceorg': return <ServiceOrg />;
    case 'opening':    return <OpeningBalance />;
    case 'strategy':   return <StrategyMemo />;
    case 'workpapers': return <WorkingPapers />;
    case 'asersi':     return <AssertionMatrix />;
    case 'governance': return <Governance />;
    case 'nonaudit':   return <NonAuditPortfolio />;
    case 'review2400': return <Review2400 />;
    case 'relatedsvc': return <RelatedServices />;
    case 'assurance':  return <OtherAssurance />;
    case 'duediligence': return <DueDiligence />;
    case 'soqm':       return <SOQM />;
    case 'eqr':        return <EQRWorkflow />;
    case 'pppk':       return <PPPKReport />;
    case 'clientportal': return <ClientPortal />;
    case 'dms':        return <DocManagement />;
    case 'tax':        return <TaxPPh23 />;
    case 'templates':  return <Templates />;
    case 'kb':         return <KnowledgeBase />;
    case 'evidence':   return <EvidenceEvaluation />;
    case 'mgmtletter': return <ManagementLetter />;
    case 'crypto':     return <CryptoCompliance />;
    case 'pdp':        return <PDPView />;
    case 'cockpit':    return <EngagementCockpit />;
    case 'programme':  return <AuditProgramme />;
    case 'reviewnotes':return <ReviewNotes />;
    case 'time':       return <TimeBudget />;
    case 'tasks':      return <MyTasks />;
    case 'pipeline':   return <SalesPipeline />;
    case 'billing':    return <Billing />;
    case 'scheduler':  return <ResourceScheduler />;
    case 'delivery':   return <DeliveryMilestones />;
    case 'audittimeline': return <AuditTimeline />;
    case 'wipreal':    return <WIPRealization />;
    case 'capacity':   return <CapacityPlanning />;
    case 'hcm':        return <HCM />;
    case 'payroll':    return <Payroll />;
    case 'leave':      return <LeaveAttendance />;
    case 'performance': return <Performance />;
    case 'cpe':        return <CPETracker />;
    case 'independence': return <Independence />;
    case 'orgchart':   return <OrgChart />;
    case 'succession': return <SuccessionPlanning />;
    case 'recruitment': return <Recruitment />;
    case 'learning':   return <Learning />;
    case 'ethics':     return <EthicsDeclaration />;
    case 'hrcase':     return <HRCases />;
    case 'firmgl':     return <FirmGL />;
    case 'apar':       return <FirmAPAR />;
    case 'profitability': return <Profitability />;
    case 'treasury':   return <FirmTreasury />;
    case 'cashbank':   return <CashBank />;
    case 'fixedassets': return <FixedAssets />;
    case 'firmtax':    return <FirmTax />;
    case 'revenue':    return <FirmRevenue />;
    case 'approvals':  return <Approvals />;
    case 'integrations': return <Integrations />;
    case 'audittrail': return <AuditTrail />;
    case 'settings':   return <SettingsView />;
    case 'compmatrix': return <ComplianceMatrix />;
    case 'sa200':      return <SA200View />;
    case 'sa230':      return <SA230View />;
    case 'sa240':      return <SA240View />;
    case 'sa250':      return <SA250View />;
    case 'sa260':      return <SA260View />;
    case 'sa265':      return <SA265View />;
    case 'sa501':      return <SA501View />;
    case 'sa520':      return <SA520View />;
    case 'sa530':      return <SA530View />;
    case 'sa540':      return <SA540View />;
    case 'sa580':      return <SA580View />;
    case 'sa701':      return <SA701View />;
    case 'sa705':      return <SA705View />;
    case 'sa710':      return <SA710View />;
    case 'sa720':      return <SA720View />;
    case 'sa800':      return <SA800View />;
    case 'sa805':      return <SA805View />;
    case 'sa810':      return <SA810View />;
    case 'spr2400':    return <SPR2400View />;
    case 'spr2410':    return <SPR2410View />;
    case 'sjah3000':   return <SJAH3000View />;
    case 'sjah3400':   return <SJAH3400View />;
    case 'sjah3402':   return <SJAH3402View />;
    case 'sjah3410':   return <SJAH3410View />;
    case 'sjah3420':   return <SJAH3420View />;
    case 'sustain':    return <SustainabilityView />;
    case 'sectorck':   return <SectorChecklistView />;
    case 'ojkfiling':  return <OJKFilingView />;
    case 'auditcomm':  return <AuditCommitteeView />;
    default:
      if (window.COMPLIANCE_CONFIG && window.COMPLIANCE_CONFIG[moduleId]) return <ComplianceView stdId={moduleId} />;
      return <StubViewWrap moduleId={moduleId} />;
  }
}

/* stub views get their own subbar */
function StubViewWrap({ moduleId }: any) {
  return (
    <>
      <SubBar moduleId={moduleId} right={<Btn sm variant="primary"><I.sparkle size={14} /> AI Assist</Btn>} />
      <div className="view-scroll"><StubView moduleId={moduleId} /></div>
    </>
  );
}

/* ---- Drawer rujukan Standar (SA) — meluncur dari kanan ----
   Membuka halaman SA mendalam tanpa meninggalkan prosedur. Untuk standar
   tanpa halaman khusus, menampilkan kartu rujukan + tautan Matriks Kepatuhan. */
function StandardRefCard({ data, onNavigate, onClose }: any) {
  return (
    <div className="view-pad">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--navy)', color: '#fff', display: 'grid', placeItems: 'center', flex: '0 0 44px' }}><I.shield size={20} /></span>
        <div>
          <div className="mono" style={{ fontSize: 15, fontWeight: 700 }}>{data.code}</div>
          <div className="muted" style={{ fontSize: 13 }}>{data.title}</div>
        </div>
      </div>
      <div className="panel" style={{ padding: 14, marginBottom: 12 }}>
        <div className="tiny muted upper" style={{ marginBottom: 4 }}>Keterkaitan</div>
        <div style={{ fontSize: 13, lineHeight: 1.55 }}>
          Prosedur <b>{((MODULE_INDEX as any)[data.fromModule] || {}).label || data.fromModule}</b> dirancang untuk memenuhi persyaratan <b>{data.code} · {data.title}</b>{data.phase ? <> pada fase <b>{data.phase}</b></> : null}. Status pemenuhan & ketertelusuran terpusat di Matriks Kepatuhan.
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <Btn variant="primary" onClick={() => { onClose(); onNavigate('compmatrix'); }}><I.table size={14} /> Lihat di Matriks Kepatuhan</Btn>
      </div>
    </div>
  );
}

function SARefDrawer({ data, onClose, onNavigate }: any) {
  const open = !!data;
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: any) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
  if (!open) return null;
  return (
    <>
      <div className="sa-drawer-backdrop" onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(15,23,42,.34)' }} />
      <aside className="sa-drawer" style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(780px, 94vw)', zIndex: 91, background: 'var(--bg, #fff)', boxShadow: '-18px 0 50px rgba(15,23,42,.22)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderBottom: '1px solid var(--line)', flex: '0 0 auto' }}>
          <span className="tiny upper" style={{ fontWeight: 700, letterSpacing: '.05em', color: 'var(--ink-3)', display: 'flex', alignItems: 'center', gap: 6 }}><I.shield size={13} /> Rujukan Standar Audit</span>
          <span className="mono" style={{ fontWeight: 700, fontSize: 13 }}>{data.code}</span>
          <div style={{ flex: 1 }} />
          {data.view && (
            <Btn sm onClick={() => { const v = data.view; onClose(); onNavigate(v); }}><I.arrowRight size={13} /> Halaman penuh</Btn>
          )}
          <button className="top-btn" title="Tutup" onClick={onClose} style={{ width: 30, height: 30 }}><I.x size={16} /></button>
        </div>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: data.view ? 'hidden' : 'auto' }}>
          {data.view ? viewFor(data.view) : <StandardRefCard data={data} onNavigate={onNavigate} onClose={onClose} />}
        </div>
      </aside>
    </>
  );
}

function App() {
  /* Fase 7 — default landing berbasis peran = Beranda (bukan lagi 'dashboard' statis).
     Rute terakhir tetap dipulihkan saat reload (lihat Root.enter: hanya login EKSPLISIT
     yang memaksa 'home'); Firm Dashboard tetap 1 klik bagi Partner/Manager. */
  const [route, setRoute] = useStateApp(() => localStorage.getItem('ams.route') || 'home');
  const [collapsed, setCollapsed] = useStateApp(() => localStorage.getItem('ams.sidebarCollapsed') === '1');
  const [copilot, setCopilot] = useStateApp(false);
  const [palette, setPalette] = useStateApp(false);
  const [minimap, setMiniMap] = useStateApp(false);
  const [saRef, setSaRef] = useStateApp(null);
  const [navFrom, setNavFrom] = useStateApp(null);

  const navigate = React.useCallback((id: any, opts: any) => {
    setNavFrom(opts && opts.from ? opts.from : null);
    try {
      if (((MODULE_INDEX as any)[id] || {}).deep) {
        const prev = JSON.parse(localStorage.getItem('ams.recent') || '[]');
        const next = [id, ...(Array.isArray(prev) ? prev : []).filter(x => x !== id)].slice(0, 8);
        localStorage.setItem('ams.recent', JSON.stringify(next));
        window.dispatchEvent(new Event('ams:recent'));
      }
    } catch (e) {}
    setRoute(id); setPalette(false); setSaRef(null);
  }, []);
  useEffectApp(() => { window.__amsOpenSA = setSaRef; return () => { delete window.__amsOpenSA; }; }, []);

  useEffectApp(() => { localStorage.setItem('ams.route', route); }, [route]);
  useEffectApp(() => { localStorage.setItem('ams.sidebarCollapsed', collapsed ? '1' : '0'); }, [collapsed]);
  useEffectApp(() => { window.__amsSetSidebar = setCollapsed; }, []);
  useEffectApp(() => { window.__amsOpenCopilot = () => setCopilot(true); return () => { delete window.__amsOpenCopilot; }; }, []);
  useEffectApp(() => { window.__amsOpenMiniMap = () => setMiniMap(true); return () => { delete window.__amsOpenMiniMap; }; }, []);
  useEffectApp(() => {
    if (localStorage.getItem('ams.dark') === '1') document.body.classList.add('dark');
    if (localStorage.getItem('ams.dense') === '1') document.body.classList.add('dense');
    try { const s = JSON.parse(localStorage.getItem('ams.v1.settings') || '{}'); window.amsApplyPrefs && window.amsApplyPrefs(s); } catch (e) {}
  }, []);
  useEffectApp(() => {
    const onKey = (e: any) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette((p: any) => !p); }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'm') { e.preventDefault(); setMiniMap((p: any) => !p); }
      if (e.key === 'Escape') setPalette(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <NavContext.Provider value={navigate}>
     <NavFromContext.Provider value={navFrom}>
      <div className="app">
        <TopBar route={route} onOpenCopilot={() => setCopilot(true)} onOpenPalette={() => setPalette(true)} onOpenMiniMap={() => setMiniMap(true)} onNavigate={navigate} />
        <div className="app-body">
          <Sidebar active={route} onNavigate={navigate} collapsed={collapsed} onToggle={() => setCollapsed((c: any) => !c)} />
          <div className="main-col">
            <ViewErrorBoundary routeKey={route}>{viewFor(route)}</ViewErrorBoundary>
            <ModuleLineage moduleId={route} />
            <StandardLinkback moduleId={route} />
          </div>
        </div>
        <button className="copilot-fab" onClick={() => setCopilot(true)}>
          <I.sparkle size={18} /> AI Co-pilot
        </button>
        <Copilot open={copilot} onClose={() => setCopilot(false)} route={route} />
        {typeof MiniMap !== 'undefined' && <MiniMap open={minimap} route={route} onClose={() => setMiniMap(false)} onNavigate={navigate} />}
        {palette && <CommandPalette onClose={() => setPalette(false)} onNavigate={navigate} />}
        <SARefDrawer data={saRef} onClose={() => setSaRef(null)} onNavigate={navigate} />
      </div>
     </NavFromContext.Provider>
    </NavContext.Provider>
  );
}

const DEFAULT_ENG_ID = 'ENG-2025-014';

function BootSplash({ label }: any) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh',
      font: '14px system-ui,sans-serif', color: '#8a93a2' }}>{label}</div>
  );
}

/* W7 Fase 2 — boot gate is now session-aware:
     checking → ask the server who we are (auth.me)
     login    → no/expired session → render <LoginScreen>
     ready    → authenticated → hydrate core entities (W6 Fase 3) for THIS user, then mount
   Hydration runs AFTER auth (bootstrap is a protectedProcedure) and BEFORE <App> renders, so
   canon's lazy FIG/SRC still build from the DB WTB. A 401 mid-session (ams:auth-expired) drops
   back to login. */
function Root() {
  const { useState: useStateRT, useEffect: useEffectRT, useCallback: useCallbackRT } = React;
  const [phase, setPhase] = useStateRT('checking');
  const [me, setMe] = useStateRT(null);

  const enter = useCallbackRT(async (user: any, fresh: boolean = true) => {
    setMe(user);
    // Fase 7 — login EKSPLISIT (via LoginScreen) selalu mendarat di Beranda berbasis peran;
    // reload sesi (auth.me, fresh=false) TIDAK menyentuh rute → pengguna kembali ke tempatnya.
    if (fresh) { try { localStorage.setItem('ams.route', 'home'); } catch (e) { /* private mode */ } }
    try { await hydrateCoreFromApi(DEFAULT_ENG_ID, user.id); } catch (e) { /* offline: data.js fallback */ }
    setPhase('ready');
  }, []);

  const logout = useCallbackRT(() => {
    (api as any).auth.logout.mutate().catch(() => {});
    setAuthToken(null);
    setMe(null);
    setPhase('login');
  }, []);

  useEffectRT(() => {
    let cancelled = false;
    (api as any).auth.me.query()
      .then((user: any) => { if (!cancelled) { user ? enter(user, false) : setPhase('login'); } })
      .catch(() => { if (!cancelled) setPhase('login'); });
    const onExpired = () => { setAuthToken(null); setMe(null); setPhase('login'); };
    window.addEventListener('ams:auth-expired', onExpired);
    return () => { cancelled = true; window.removeEventListener('ams:auth-expired', onExpired); };
  }, [enter]);

  if (phase === 'checking') return <BootSplash label="Memeriksa sesi…" />;
  if (phase === 'login') return <LoginScreen onLoggedIn={enter} />;
  return <AppProviders me={me} onLogout={logout}><App /></AppProviders>;
}

const _rootEl = document.getElementById('root');
ReactDOM.createRoot(_rootEl).render(<Root />);


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export const __amsOpenCopilot = window.__amsOpenCopilot;
export const __amsOpenMiniMap = window.__amsOpenMiniMap;
export const __amsOpenSA = window.__amsOpenSA;
export const __amsSetSidebar = window.__amsSetSidebar;
