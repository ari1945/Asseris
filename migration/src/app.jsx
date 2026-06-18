/* [codemod] ESM imports */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppProviders, NavContext, NavFromContext } from './contexts.jsx';
import { Copilot } from './copilot.jsx';
import { I, MODULE_INDEX } from './icons.jsx';
import { MiniMap } from './minimap.jsx';
import { ModuleLineage, StandardLinkback } from './related_modules.jsx';
import { Sidebar, SubBar, TopBar } from './shell.jsx';
import { Btn, StubView } from './ui.jsx';
import { AJEView } from './view_aje.jsx';
import { AnalyticalReview } from './view_analytical.jsx';
import { AssociatesEquity } from './view_assoc.jsx';
import { AuditCommitteeView } from './view_auditcomm.jsx';
import { AuditTimeline } from './view_audittimeline.jsx';
import { FirmBI } from './view_bi.jsx';
import { FirmLicensing, FirmTravel } from './view_bo3.jsx';
import { ECLCalculator, SamplingEngine } from './view_calc.jsx';
import { CapacityPlanning } from './view_capacity.jsx';
import { ClientPortal } from './view_clientportal.jsx';
import { AuditProgramme } from './view_cockpit.jsx';
import { EngagementCockpit } from './view_cockpit2.jsx';
import { ComplianceView } from './view_compliance.jsx';
import { ComplianceMatrix } from './view_compmatrix.jsx';
import { ConfirmationHub } from './view_confirm.jsx';
import { CryptoCompliance } from './view_crypto.jsx';
import { FirmDashboard } from './view_dashboard.jsx';
import { DataFlow } from './view_dataflow.jsx';
import { DeliveryMilestones } from './view_delivery.jsx';
import { DisclosureChecklist } from './view_disclosure.jsx';
import { DocManagement } from './view_dms.jsx';
import { DueDiligence } from './view_duediligence.jsx';
import { EQRWorkflow } from './view_eqr.jsx';
import { EvidenceEvaluation } from './view_evidence.jsx';
import { WTBView } from './view_execution.jsx';
import { Facilities } from './view_facilities.jsx';
import { ManagementLetter } from './view_final3.jsx';
import { ClientCRM, EngagementMgmt } from './view_firm.jsx';
import { FirmFinance, WIPValuation } from './view_firmfinance.jsx';
import { FirmAPAR, FirmGL } from './view_firmgl.jsx';
import { FirmOps } from './view_firmops.jsx';
import { FirmRevenue } from './view_firmrevenue.jsx';
import { FirmTax } from './view_firmtax.jsx';
import { CashBank, FirmTreasury, FixedAssets } from './view_firmtreasury.jsx';
import { ForensicCashFlow } from './view_forensic.jsx';
import { TaxAuditDiagnostic } from './view_diagnostics.jsx';
import { FrameworkView } from './view_framework.jsx';
import { FSGenerator } from './view_fsgen.jsx';
import { GoingConcern } from './view_goingconcern.jsx';
import { Governance } from './view_governance.jsx';
import { GroupAudit } from './view_groupaudit.jsx';
import { LeaveAttendance, Performance } from './view_hrops.jsx';
import { InternalControl } from './view_icfr.jsx';
import { FirmInsurance } from './view_insurance.jsx';
import { InternalAudit } from './view_internalaudit.jsx';
import { InvestmentProperty } from './view_invprop.jsx';
import { ISAK35View } from './view_isak35.jsx';
import { SOQM } from './view_isqm.jsx';
import { JournalEntryTesting } from './view_jet.jsx';
import { KnowledgeBase } from './view_kb.jsx';
import { LeaseCalculator } from './view_lease.jsx';
import { FirmLegal } from './view_legal2.jsx';
import { MaterialityCalc } from './view_materiality.jsx';
import { StrategyMemo } from './view_misc1.jsx';
import { Templates } from './view_misc2.jsx';
import { MyTasks } from './view_mytasks.jsx';
import { NewDisclosures2024 } from './view_newdisc.jsx';
import { NonAuditPortfolio, Review2400 } from './view_nonaudit.jsx';
import { OJKFilingView } from './view_ojkfiling.jsx';
import { ClientOnboarding } from './view_onboarding.jsx';
import { OpeningBalance } from './view_opening.jsx';
import { AuditOpinionGen } from './view_opinion.jsx';
import { CommandPalette } from './view_palette.jsx';
import { Payroll } from './view_payroll.jsx';
import { EthicsDeclaration, HRCases } from './view_pc_conduct.jsx';
import { OrgChart, SuccessionPlanning } from './view_pc_org.jsx';
import { Learning, Recruitment } from './view_pc_talent.jsx';
import { PDPView } from './view_pdp.jsx';
import { CPETracker, HCM, Independence } from './view_people.jsx';
import { Billing, SalesPipeline } from './view_pipeline.jsx';
import { Approvals } from './view_platform.jsx';
import { Integrations } from './view_platform2.jsx';
import { AuditTrail } from './view_platform3.jsx';
import { PPPKReport } from './view_pppk.jsx';
import { PresentasiKlien } from './view_presentasi.jsx';
import { Procurement } from './view_procurement.jsx';
import { Profitability } from './view_profit.jsx';
import { PSAK1View } from './view_psak1.jsx';
import { PSAK117View } from './view_psak117.jsx';
import { PSAK14View } from './view_psak14.jsx';
import { PSAK16View } from './view_psak16.jsx';
import { PSAK19View } from './view_psak19.jsx';
import { PSAK2View } from './view_psak2.jsx';
import { PSAK22View } from './view_psak22.jsx';
import { PSAK24View } from './view_psak24.jsx';
import { PSAK25View } from './view_psak25.jsx';
import { PSAK46View } from './view_psak46.jsx';
import { PSAK48View } from './view_psak48.jsx';
import { PSAK58View } from './view_psak58.jsx';
import { PSAK65View } from './view_psak65.jsx';
import { PSAK66View } from './view_psak66.jsx';
import { PSAK68View } from './view_psak68.jsx';
import { PSAK71View } from './view_psak71.jsx';
import { PSAK72View } from './view_psak72.jsx';
import { RecordsRetention } from './view_records.jsx';
import { RelatedParties } from './view_related.jsx';
import { OtherAssurance, RelatedServices } from './view_relatedsvc.jsx';
import { RiskAssessment } from './view_risk.jsx';
import { SA200View } from './view_sa200.jsx';
import { SA230View } from './view_sa230.jsx';
import { SA240View } from './view_sa240.jsx';
import { SA250View, SA260View, SA265View } from './view_sa2comm.jsx';
import { SA501View } from './view_sa501.jsx';
import { SA520View } from './view_sa520.jsx';
import { SA530View } from './view_sa530.jsx';
import { SA540View } from './view_sa540.jsx';
import { SA580View } from './view_sa580.jsx';
import { SA701View } from './view_sa701.jsx';
import { SA705View } from './view_sa705.jsx';
import { SA710View } from './view_sa710.jsx';
import { SA720View } from './view_sa720.jsx';
import { SA800View } from './view_sa800.jsx';
import { SA805View } from './view_sa805.jsx';
import { SA810View } from './view_sa810.jsx';
import { SADLedger } from './view_sad.jsx';
import { SAKRoadmapView } from './view_sakroadmap.jsx';
import { ResourceScheduler } from './view_scheduler.jsx';
import { SectorChecklistView } from './view_sectorck.jsx';
import { SegmentInfo } from './view_segmen.jsx';
import { ServiceOrg } from './view_serviceorg.jsx';
import { SettingsView } from './view_settings.jsx';
import { SJAH3000View } from './view_sjah3000.jsx';
import { SJAH3400View } from './view_sjah3400.jsx';
import { SJAH3402View } from './view_sjah3402.jsx';
import { SJAH3410View } from './view_sjah3410.jsx';
import { SJAH3420View } from './view_sjah3420.jsx';
import { UseOfExpert } from './view_specifics2.jsx';
import { SPR2400View } from './view_spr2400.jsx';
import { SPR2410View } from './view_spr2410.jsx';
import { SubsequentEvents } from './view_subsequent.jsx';
import { SustainabilityView } from './view_sustain.jsx';
import { SyariahView } from './view_syariah.jsx';
import { TaxPPh23 } from './view_tax23.jsx';
import { TimeBudget } from './view_timebudget.jsx';
import { WIPRealization } from './view_wip_firm.jsx';
import { ReviewNotes } from './view_workspace.jsx';
import { WorkingPapers } from './view_wp.jsx';

/* ============================================================
   NeoSuite AMS — Main app + router
   ============================================================ */
const { useState: useStateApp, useEffect: useEffectApp } = React;

class ViewErrorBoundary extends React.Component {
  constructor(p) { super(p); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidUpdate(prev) { if (prev.routeKey !== this.props.routeKey && this.state.err) this.setState({ err: null }); }
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

function viewFor(moduleId) {
  switch (moduleId) {
    case 'dashboard':  return <FirmDashboard />;
    case 'bi':         return <FirmBI />;
    case 'crm':        return <ClientCRM />;
    case 'risk':       return <RiskAssessment />;
    case 'engagement': return <EngagementMgmt />;
    case 'onboarding': return <ClientOnboarding />;
    case 'dataflow':   return <DataFlow />;
    case 'wtb':        return <WTBView />;
    case 'aje':        return <AJEView />;
    case 'materiality':return <MaterialityCalc />;
    case 'sampling':   return <SamplingEngine />;
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
function StubViewWrap({ moduleId }) {
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
function StandardRefCard({ data, onNavigate, onClose }) {
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
          Prosedur <b>{(MODULE_INDEX[data.fromModule] || {}).label || data.fromModule}</b> dirancang untuk memenuhi persyaratan <b>{data.code} · {data.title}</b>{data.phase ? <> pada fase <b>{data.phase}</b></> : null}. Status pemenuhan & ketertelusuran terpusat di Matriks Kepatuhan.
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <Btn variant="primary" onClick={() => { onClose(); onNavigate('compmatrix'); }}><I.table size={14} /> Lihat di Matriks Kepatuhan</Btn>
      </div>
    </div>
  );
}

function SARefDrawer({ data, onClose, onNavigate }) {
  const open = !!data;
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
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
  const [route, setRoute] = useStateApp(() => localStorage.getItem('ams.route') || 'dashboard');
  const [collapsed, setCollapsed] = useStateApp(() => localStorage.getItem('ams.sidebarCollapsed') === '1');
  const [copilot, setCopilot] = useStateApp(false);
  const [palette, setPalette] = useStateApp(false);
  const [minimap, setMiniMap] = useStateApp(false);
  const [saRef, setSaRef] = useStateApp(null);
  const [navFrom, setNavFrom] = useStateApp(null);

  const navigate = React.useCallback((id, opts) => {
    setNavFrom(opts && opts.from ? opts.from : null);
    try {
      if ((MODULE_INDEX[id] || {}).deep) {
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
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette(p => !p); }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'm') { e.preventDefault(); setMiniMap(p => !p); }
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
          <Sidebar active={route} onNavigate={navigate} collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
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

function Root() {
  return <AppProviders><App /></AppProviders>;
}

ReactDOM.createRoot(document.getElementById('root')).render(<Root />);


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export const __amsOpenCopilot = window.__amsOpenCopilot;
export const __amsOpenMiniMap = window.__amsOpenMiniMap;
export const __amsOpenSA = window.__amsOpenSA;
export const __amsSetSidebar = window.__amsSetSidebar;
