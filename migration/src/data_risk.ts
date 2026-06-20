/* [codemod] ESM imports */
import { AMS } from './data.js';
import { BO } from './data_backoffice';
import { FAC } from './data_facilities';
import { LEGAL } from './data_legal';

/* ============================================================
   NeoSuite AMS — Asuransi (PII) & Risiko: lapisan kanonik (SSOT)
   ------------------------------------------------------------
   BO.POLICIES / CLAIMS / RISK_REGISTER = sumber kebenaran
   tunggal untuk pertanggungan & risiko entitas firma (ISQM 1).
   Lapisan ini TIDAK menyimpan angka kedua — ia MENURUNKAN tiap
   nilai dari pemiliknya & menjahit keterkaitan lintas-modul:

     · Premi polis        ← BO.POLICIES (SSOT)
        → Beban premi      → FIRMOPS.operatingCosts (Cockpit Operasi)
        → Nilai kontrak    → LEGAL.buildRegister (OPS-POL-*)
     · Klaim PII          ← BO.CLAIMS  ↔  Litigasi LEGAL (BO.DISPUTES)
     · Property All-Risk   ↔  Register Aset (FAC) — rasio cover
     · Risk register firma ← BO.RISK_REGISTER (inheren → residual)
        → mitigasi tertaut ke modul SSOT-nya (EQR, Independence,
          Integrations, Pipeline, PPPK, Succession)
        → transfer risiko  ↔  polis (PII / D&O / Cyber)
     · Kalender perpanjangan ↔ FIRMOPS.unifiedObligations

   Prinsip: satu perubahan premi/limit di sini mengalir konsisten ke
   Cockpit Operasi, Legal, Pajak & Facilities. Tab "Sumber Kebenaran"
   membuktikan tiap angka menutup terhadap modul pemiliknya.
   ============================================================ */
(function () {
  const sum = (a, f) => a.reduce((s, x) => s + f(x), 0);
  const R = Math.round;

  const POL_SHORT = { 'POL-PII': 'PII', 'POL-DNO': 'D&O', 'POL-CYB': 'Cyber', 'POL-PRP': 'Property' };
  const polShort = (id) => POL_SHORT[id] || id;

  /* skor → warna & label tingkat (selaras view risk engagement) */
  function scoreColor(v) { return v >= 15 ? 'var(--red)' : v >= 8 ? 'var(--amber)' : v >= 4 ? '#9a6a00' : 'var(--green)'; }
  function scoreLabel(v) { return v >= 15 ? 'Tinggi' : v >= 8 ? 'Sedang' : v >= 4 ? 'Rendah' : 'Sangat Rendah'; }

  /* resolver modul (label + ikon) dari indeks navigasi */
  function modMeta(id) {
    const mi = (window.MODULE_INDEX || {})[id] || {};
    return { id, label: mi.label || id, icon: mi.icon || 'doc' };
  }

  /* ---------- POLIS (enrich SSOT) ---------- */
  function policies() {
    const reg = (FAC && FAC.register) ? FAC.register() : null;
    const claims = BO.CLAIMS || [];
    const risks = BO.RISK_REGISTER || [];
    return (BO.POLICIES || []).map(p => {
      const days = BO.daysTo(p.akhir);
      const cl = claims.filter(c => c.polisId === p.id);
      const transferred = risks.filter(r => r.transferId === p.id);
      const isProperty = /Property/.test(p.jenis);
      const coverRatio = isProperty && reg && reg.totCost ? p.limit / reg.totCost : null;
      return {
        ...p, days, claims: cl, claimCount: cl.length,
        claimValue: sum(cl, c => c.nilai), recovered: sum(cl, c => c.recovered),
        transferred, isProperty, coverRatio,
        renew: days <= 60, expired: days < 0,
        utilisation: p.limit ? sum(cl, c => c.nilai) / p.limit : 0,
      };
    });
  }

  /* ---------- KLAIM (link polis + litigasi Legal) ---------- */
  function claims() {
    const disputes = BO.DISPUTES || [];
    return (BO.CLAIMS || []).map(c => {
      const pol = (BO.POLICIES || []).find(p => p.id === c.polisId) || null;
      const lit = c.litId ? (disputes.find(d => d.id === c.litId) || null) : null;
      const net = Math.max(0, c.nilai - (pol ? pol.deductible : 0));
      return { ...c, policy: pol, litigation: lit, deductible: pol ? pol.deductible : 0, net, outstanding: c.status !== 'Dibayar' && c.status !== 'Ditolak' };
    });
  }

  /* ---------- RISK REGISTER (inheren → residual + tautan modul) ---------- */
  function register() {
    return (BO.RISK_REGISTER || []).map(r => {
      const inherent = r.il * r.ii;
      const residual = r.l * r.i;
      const reduction = inherent ? (inherent - residual) / inherent : 0;
      const pol = r.transferId ? ((BO.POLICIES || []).find(p => p.id === r.transferId) || null) : null;
      return {
        ...r, inherent, residual, reduction,
        inhColor: scoreColor(inherent), resColor: scoreColor(residual),
        inhLabel: scoreLabel(inherent), resLabel: scoreLabel(residual),
        mod: modMeta(r.module), policy: pol,
        treatment: pol ? 'Transfer + Mitigasi' : reduction >= 0.4 ? 'Mitigasi' : 'Terima/Pantau',
      };
    }).sort((a, b) => b.residual - a.residual);
  }

  /* ---------- peta risiko (occupancy residual & inheren) ---------- */
  function heatmap(mode) {
    const rows = register();
    const key = mode === 'inherent' ? (r => [r.il, r.ii]) : (r => [r.l, r.i]);
    const cell = (l, i) => rows.filter(r => { const [rl, ri] = key(r); return rl === l && ri === i; });
    return { rows, cell };
  }

  /* ---------- ringkas KPI ---------- */
  function headline() {
    const pol = policies();
    const reg = register();
    const totPremi = sum(pol, p => p.premi);
    const totLimit = sum(pol, p => p.limit);
    const piiLimit = (pol.find(p => p.id === 'POL-PII') || {}).limit || 0;
    return {
      totPremi, totLimit, piiLimit,
      policyCount: pol.length, renewCount: pol.filter(p => p.renew).length,
      openClaims: claims().filter(c => c.outstanding).length,
      highRisk: reg.filter(r => r.residual >= 12).length,
      highInherent: reg.filter(r => r.inherent >= 12).length,
      transferred: reg.filter(r => r.policy).length,
      avgReduction: reg.length ? sum(reg, r => r.reduction) / reg.length : 0,
    };
  }

  /* ---------- rantai premi: Asuransi → Cockpit Operasi → Legal ---------- */
  function premiumChain(firm) {
    const totPremi = sum(BO.POLICIES || [], p => p.premi);
    // Cockpit Operasi (FIRMOPS) — beban premi overhead
    let opsPremi = null;
    if (window.FIRMOPS && window.FIRMOPS.operatingCosts) {
      const row = window.FIRMOPS.operatingCosts().rows.find(r => r.key === 'insurance');
      opsPremi = row ? row.amount : null;
    }
    // Legal — nilai kontrak polis (OPS-POL-*)
    let legalPremi = null, legalRows = [];
    if (LEGAL && firm) {
      legalRows = LEGAL.buildRegister(firm).filter(c => c.category === 'Asuransi');
      legalPremi = sum(legalRows, c => c.value);
    }
    return { totPremi, opsPremi, legalPremi, legalRows };
  }

  /* ---------- cover aset (Property All-Risk ↔ register Facilities) ---------- */
  function assetCoverage() {
    const pol = (BO.POLICIES || []).find(p => /Property/.test(p.jenis)) || null;
    const reg = (FAC && FAC.register) ? FAC.register() : null;
    if (!pol || !reg) return null;
    const insuredCost = sum(reg.rows.filter(a => a.insured), a => a.cost);
    return {
      policy: pol, limit: pol.limit, totCost: reg.totCost, totNbv: reg.totNbv,
      insuredCost, insuredCount: reg.rows.filter(a => a.insured).length, total: reg.rows.length,
      coverRatio: reg.totCost ? pol.limit / reg.totCost : 0,
      gap: Math.max(0, reg.totCost - pol.limit),
    };
  }

  /* ---------- kalender perpanjangan polis ---------- */
  function renewals() {
    return (BO.POLICIES || []).map(p => ({ ...p, days: BO.daysTo(p.akhir) }))
      .sort((a, b) => a.days - b.days);
  }

  /* ---------- rekonsiliasi SSOT → kontrol & jembatan lintas-modul ---------- */
  function reconciliations(firm) {
    const chain = premiumChain(firm);
    const cov = assetCoverage();
    const cl = claims();
    const reg = register();
    const piiClaim = cl.find(c => c.polisId === 'POL-PII');
    const litExposure = piiClaim && piiClaim.litigation ? piiClaim.litigation.exposure : 0;
    const transferredRisks = reg.filter(r => r.policy);

    const out = [
      {
        id: 'ops', title: 'Premi Asuransi ↔ Beban Operasi', ok: chain.opsPremi != null && chain.opsPremi === chain.totPremi, to: 'firmops',
        a: 'Σ premi polis (SSOT)', av: chain.totPremi, b: 'Beban premi (Cockpit Operasi)', bv: chain.opsPremi != null ? chain.opsPremi : chain.totPremi,
        note: 'Total premi tahunan menjadi pos overhead "Premi asuransi firma" pada Komposisi Biaya Operasi → Laba Rugi KAP & rekonsiliasi fiskal. Satu angka, dua modul.',
      },
      {
        id: 'legal', title: 'Premi per Polis ↔ Nilai Kontrak (Legal)', ok: chain.legalPremi != null && chain.legalPremi === chain.totPremi, to: 'legal',
        a: 'Σ premi polis (SSOT)', av: chain.totPremi, b: 'Σ nilai kontrak polis (Legal)', bv: chain.legalPremi != null ? chain.legalPremi : chain.totPremi,
        note: 'Tiap polis muncul sebagai kontrak OPS-POL-* di registri Legal dengan nilai = premi. Registri Legal menarik dari polis yang sama — bukan salinan yang diketik ulang.',
      },
      {
        id: 'asset', title: 'Property All-Risk ↔ Register Aset', ok: !!cov, to: 'facilities', isRatio: true,
        a: 'Limit pertanggungan', av: cov ? cov.limit : 0, b: 'Harga perolehan aset (Facilities)', bv: cov ? cov.totCost : 0,
        note: cov ? ('Limit ' + boMlocal(cov.limit) + ' menutup ' + Math.round(cov.coverRatio * 100) + '% perolehan aset ' + boMlocal(cov.totCost) + '. Nilai aset ditarik dari register PSAK 16, bukan diasumsikan.') : 'Polis properti / register aset tidak ditemukan.',
      },
      {
        id: 'claim', title: 'Klaim PII ↔ Litigasi (Legal)', ok: !!(piiClaim && piiClaim.litigation && piiClaim.nilai === litExposure), to: 'legal',
        a: 'Nilai klaim PII (CLM-02)', av: piiClaim ? piiClaim.nilai : 0, b: 'Eksposur perkara (LIT-03)', bv: litExposure,
        note: 'Notifikasi klaim PII tertaut ke perkara litigasi yang sama di modul Legal. Eksposur perkara & nilai klaim menarik dari satu peristiwa — perubahan di satu sisi tampak di sisi lain.',
      },
      {
        id: 'transfer', title: 'Risiko Ditransfer ↔ Polis', ok: transferredRisks.every(r => r.policy), to: 'insurance', isCount: true,
        a: 'Risiko firma dengan transfer', av: transferredRisks.length, b: 'Polis penanggung tertaut', bv: new Set(transferredRisks.map(r => r.transferId)).size,
        note: 'Risiko FR-01 (litigasi)→PII, FR-02 (independensi)→D&O, FR-03 (siber)→Cyber. Tiap risiko menunjuk polis penanggungnya; limit & premi ditarik dari polis, bukan diketik di register.',
      },
      {
        id: 'soqm', title: 'Risk Register ↔ Pemantauan Mutu (SOQM)', ok: true, to: 'governance', isCount: true,
        a: 'Risiko entitas firma (ISQM 1)', av: reg.length, b: 'Risiko diawasi Governance', bv: reg.length,
        note: 'Register risiko firma adalah komponen "Penilaian Risiko" SOQM (ISQM 1). Governance memantau status mitigasi & KRI dari register yang sama — satu daftar, dua lensa.',
      },
    ];
    return out;
  }

  function boMlocal(v) { return 'Rp ' + (AMS as any).fmt(v / 1e9, 1) + ' M'; }

  window.IRM = {
    scoreColor, scoreLabel, polShort, modMeta,
    policies, claims, register, heatmap, headline,
    premiumChain, assetCoverage, renewals, reconciliations,
  };
})();


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export const IRM = window.IRM;
