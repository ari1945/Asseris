/* ============================================================
   NeoSuite AMS — Canonical figures (single source of truth)
   ------------------------------------------------------------
   Satu lapisan angka kanonik yang ditarik oleh banyak kertas
   kerja agar konsisten lintas-modul. Tujuannya: setiap angka
   pajak tangguhan di PSAK 46 dapat ditelusuri ke modul sumbernya
   (PSAK 24, PSAK 71/ECL, PSAK 73) dan ke Buku Besar (WTB),
   bukan di-hardcode.

   PRINSIP: Working Trial Balance (AMS.WTB / useAudit().wtb)
   adalah SUMBER KEBENARAN untuk saldo akun. Angka akuntansi di
   bawah ini DITARIK dari WTB by-code, sehingga satu perubahan AJE
   mengalir konsisten ke seluruh modul yang memakai AMS_CANON.

   Semua nilai dalam Rp JUTA kecuali data sewa (rupiah penuh,
   lalu dinormalkan ke juta saat dipakai PSAK 46).
   Tarif PPh Badan 22% (UU HPP No. 7/2021).
   ============================================================ */
import { RATE, ASOF, jt, wtbRow, wtbVal, WTB_MAP, figuresFromWTB, LEASES, leaseCalc, elapsedMonths, leasePortfolio, FISCAL, SRC, FIG, resetFigures } from './canon_base';
import { deferredTax, INV_MIX, INV_FG_AGING, INV_ITEMS, inventory, PPE_CLASSES, fixedAssets, REGISTER_SEED, REGISTER_MAP, assetRegister, REV_STREAMS, REV_CHANNELS, REV_GEO, REV_VC, REV_SSP_CONTRACT, REV_CONTRACT_BAL, revenue, INTAN_CLASSES, intangibles } from './canon_part1';
import { RESTATE, psak25, ECL_AGING, ECL_SCENARIOS, ECL_HISTORY, psak71, FV_PORTFOLIO, psak68, GOODWILL, P48, P48_INDICATORS, valueInUse, psak48, PROV_REGISTER, P57_TREAT, psak57 } from './canon_part2';
import { P58_GROUP, psak58, reconcile, GROUP_SUBS, GROUP_ASSOCIATES, GROUP_CONTROL, INTERCO, psak65 } from './canon_part3';
import { JOINT_ARR, P66_DISCLOSURE, psak66, PPA_DEALS, P22_PROC, psak22, materiality } from './canon_part4';

/* [legacy-track slice 10] ESM-only canon: angka kanonik kini di-EXPORT sebagai
   objek modul (bukan lagi window.AMS_CANON). Augmentasi domain (isak35/ojk/
   syariah/psak117/sakroadmap/legaldigital) meng-`Object.assign` objek yang SAMA
   via `import { AMS_CANON }` — instans tunggal, perilaku identik. */
export const AMS_CANON = {
  RATE, ASOF, LEASES, leaseCalc, leasePortfolio, deferredTax, reconcile,
  materiality,
  psak22, PPA_DEALS, P22_PROC,
  psak65, GROUP_SUBS, GROUP_ASSOCIATES, GROUP_CONTROL, INTERCO,
  psak66, JOINT_ARR, P66_DISCLOSURE,
  inventory, INV_MIX, INV_FG_AGING, INV_ITEMS,
  fixedAssets, PPE_CLASSES, assetRegister, REGISTER_SEED, REGISTER_MAP,
  revenue, REV_STREAMS, REV_CHANNELS, REV_GEO, REV_VC, REV_SSP_CONTRACT, REV_CONTRACT_BAL,
  intangibles, INTAN_CLASSES,
  psak71, ECL_AGING, ECL_SCENARIOS, ECL_HISTORY,
  psak68, FV_PORTFOLIO,
  psak48, valueInUse, GOODWILL, P48_INDICATORS,
  psak57, PROV_REGISTER, P57_TREAT,
  psak58, P58_GROUP,
  psak25, RESTATE,
  figuresFromWTB, WTB_MAP, FISCAL, FIG,
};

/* W6 Fase 3 — drop canon's lazy FIG/SRC memo after WTB re-hydration (boot).
   Exposed as a standalone global, NOT on AMS_CANON, so the canon fingerprint
   (regression gate) stays byte-identical to the W0 baseline. Imperative bus →
   tetap di window (bukan namespace data). */
window.amsResetFigures = resetFigures;
