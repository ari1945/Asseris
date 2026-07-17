/* ============================================================
   Asseris — Sample data
   KAP Wijaya Hartono & Rekan  ·  fictional Indonesian firm
   ============================================================ */
import type { AmsData } from './types/globals';
import { fmt, rp } from './data_base';
import { FIRM, USER, CLIENTS, ENGAGEMENTS, WTB, AJE, RISKS, TEAM, WORKPAPERS, ACTIVITY, DEADLINES, REVIEW_NOTES, TIME_ENTRIES, PIPELINE, INVOICES, SCHEDULE, STAFF, UNITS, FIRM_STAFF, CPE_REQ, CPE_LOG, INDEPENDENCE, FIRM_COA, FIRM_GL, FIRM_AP, ACC_FACTORS, PROSPECTS } from './data_part1';
import { FX_RATES, BANK_ACCOUNTS, BANK_RECON, FIRM_BUDGET, CASH_FORECAST, FIXED_ASSETS, TAX_OBLIGATIONS, EFAKTUR, PPH_WITHHELD, CREDIT_NOTES, PAYROLL, PAYROLL_RATES, LEAVE_BALANCE, LEAVE_REQUESTS, PERF_CYCLE, SOQM_RISKS, COMPLAINTS, EQR_REVIEWS, PPPK_REPORT, PBC_REQUESTS, PORTAL_MSGS, DMS_DOCS, NONAUDIT, REVIEW_2400, AUP_4400, aupNarrate, aupEvalMeasure, aupEngine, COMPILATION_4410, PFI_3400 } from './data_part2';
import { pfiEngine, SOC_3402, socEngine, GHG_3410, ghgEngine, ASSURANCE_ENG, BI_DATA, REVIEW_2400_PLAN } from './data_part3';
import { DD_OPP, DD_PROS, DD_REG, DD_EBITDA_BRIDGE, DD_NORM_EBITDA, DUE_DILIGENCE, QM_COMPONENTS, QM_ROLES, QM_PROVIDERS, QM_CULTURE, QM_EVAL, QM_INSPECTIONS, QM_INSP_FINDINGS, QM_MON_ACTIVITIES, EQR_META, PPPK_CLIENTS, PPPK_PPL, PPPK_ROTATION, PPPK_HISTORY, DELIVERY_WINDOW, DELIVERY, WIP_ENG, WIP_AGING, CAPACITY, _engIndex, _cliIndex, engById, clientById, shortName, bareName, staffByName, industryTag, engMeta } from './data_part4';

/* load-time seed normalization (was trailing in the IIFE; runs after all imports) */
QM_INSPECTIONS.forEach((ins: any) => {
  const m = engMeta(ins.eng);
  if (m) { ins.clientId = m.clientId; ins.client = m.client; ins.partner = m.partner; ins.scope = m.scope; ins.pie = m.pie; ins.manager = m.manager; }
});
EQR_REVIEWS.forEach((r: any) => {
  const m = engMeta(r.eng);
  if (m) { r.clientId = m.clientId; r.client = m.client; r.partner = m.partnerFull; r.pie = m.pie; r.type = m.pie ? 'Wajib (PIE)' : (r.type || 'Berbasis Risiko'); }
});
COMPLAINTS.forEach((c: any) => {
  const hit = CLIENTS.find((cl) => { const t = shortName(cl.name).split(' ').slice(0, 2).join(' '); return t && ((c.source || '').includes(t) || (c.subject || '').includes(t)); });
  if (hit) { c.clientId = hit.id; c.clientName = hit.name; }
});


/* W6 Fase 3 — the core entities below (FIRM/USER/CLIENTS/ENGAGEMENTS/WTB/TEAM)
   are now the OFFLINE FALLBACK fixture. At boot, api.js · hydrateCoreFromApi
   overwrites them on the AMS singleton with the DB-sourced copy (seeded byte-identical),
   making the API the operative SSOT. They stay here as a synchronous load-time
   source (some data_*.js read AMS.CLIENTS/WTB at module-load) and for the
   no-server path. Remaining arrays are not-yet-modeled demo data (future waves). */
export const AMS: AmsData = {
  fmt, rp, FIRM, USER, CLIENTS, ENGAGEMENTS, WTB, AJE, RISKS, TEAM,
  engById, clientById, staffByName, engMeta, shortName,
  DELIVERY, DELIVERY_WINDOW, WIP_ENG, WIP_AGING, CAPACITY,
  QM_COMPONENTS, QM_ROLES, QM_PROVIDERS, QM_CULTURE, QM_EVAL,
  QM_INSPECTIONS, QM_INSP_FINDINGS, QM_MON_ACTIVITIES, EQR_META,
  PPPK_CLIENTS, PPPK_PPL, PPPK_ROTATION, PPPK_HISTORY,
  WORKPAPERS, ACTIVITY, DEADLINES,
  REVIEW_NOTES, TIME_ENTRIES, PIPELINE, INVOICES, SCHEDULE, STAFF, UNITS, FIRM_STAFF, CPE_REQ, CPE_LOG, INDEPENDENCE,
  FIRM_COA, FIRM_GL, FIRM_AP, PROSPECTS,
  FX_RATES, BANK_ACCOUNTS, BANK_RECON, FIRM_BUDGET, CASH_FORECAST, FIXED_ASSETS,
  TAX_OBLIGATIONS, EFAKTUR, PPH_WITHHELD, CREDIT_NOTES,
  PAYROLL, PAYROLL_RATES, LEAVE_BALANCE, LEAVE_REQUESTS, PERF_CYCLE,
  SOQM_RISKS, COMPLAINTS, EQR_REVIEWS, PPPK_REPORT, PBC_REQUESTS, PORTAL_MSGS, DMS_DOCS,
  NONAUDIT, REVIEW_2400, AUP_4400, aupEngine, COMPILATION_4410, ASSURANCE_ENG, BI_DATA,
  REVIEW_2400_PLAN, DUE_DILIGENCE, PFI_3400, pfiEngine, SOC_3402, socEngine,
  GHG_3410, ghgEngine,
};
