/* ============================================================
   Asseris — canon part3 (engine + seed) (W3 split dari canon.js; perilaku identik).
   ============================================================ */
import { ASOF, RATE, figuresFromWTB, fsgenModel, jt, wtbVal } from './canon_base';
import { assetRegister, deferredTax, fixedAssets, intangibles, inventory, revenue } from './canon_part1';
import { GOODWILL, psak48, psak57, psak68, psak71 } from './canon_part2';
import { psak66 } from './canon_part4';
import type { WTB } from './canon_types';

  const P58_GROUP = {
    id: 'logistik',
    segment: 'Jasa Logistik & Distribusi (3PL)',
    plan: 'Resolusi Direksi No. 14/DIR/IX-2025 (22 Sep 2025) — divestasi unit logistik',
    classDate: '30-09-2025',          // tanggal klasifikasi sbg dimiliki untuk dijual
    expectedClose: 'Kuartal III 2026',
    buyer: 'MoU eksklusif — PT Trans Kargo Nusantara',
    tags: ['LD-002', 'BD-102', 'VH-302'],   // nomor tag pada Register Aset Tetap (PSAK 16)
    revStream: 'logis',               // pendapatan segmen → stream PSAK 72
    opMarginPct: -0.045,              // marjin operasi pra-pajak segmen (rugi → alasan divestasi)
    fairValue: 28600,                 // nilai wajar grup — appraisal KJPP (PSAK 68 L2/L3), Rp jt
    costToSellPct: 0.028,             // biaya menjual: broker, notaris, balik nama HGB
  };

  function psak58(wtb?: WTB) {
    const R = Math.round;
    const reg = assetRegister(wtb);
    const rev = revenue(wtb);
    const fa  = reg.fa;                                       // = fixedAssets(wtb)

    /* anggota disposal group ditarik dari Register Aset Tetap (sub-ledger ber-WTB) */
    const members = P58_GROUP.tags.map(tag => {
      const r: Partial<(typeof reg.rows)[number]> = reg.rows.find(x => x.tag === tag) || {};
      return {
        tag, name: r.name || tag, classLabel: r.classLabel || '', cls: r.cls || '',
        cost: r.cost || 0, accum: r.accum || 0, nbv: r.nbv || 0,
        life: r.life || null, annual: r.annual || 0, depreciable: !!r.life, acq: r.acq || '',
      };
    });
    const carryBefore = members.reduce((a, m) => a + m.nbv, 0);    // nilai tercatat sblm reklas
    const costTot     = members.reduce((a, m) => a + m.cost, 0);
    const accumTot    = members.reduce((a, m) => a + m.accum, 0);
    const regNbvCheck = carryBefore;                               // identik — tie ke register

    /* FVLCS (¶15) — nilai wajar dikurangi biaya menjual */
    const fairValue  = P58_GROUP.fairValue;
    const costToSell = R(fairValue * P58_GROUP.costToSellPct);
    const fvlcs      = fairValue - costToSell;

    /* pengukuran: lower of carrying & FVLCS → rugi penurunan reklasifikasi (¶20) */
    const writedown = Math.max(0, carryBefore - fvlcs);
    const carryHFS  = Math.min(carryBefore, fvlcs);               // nilai tercatat HFS stlh ukur
    const impaired  = writedown > 0;

    /* penghentian penyusutan (¶25) — bulan tersisa setelah tanggal klasifikasi */
    const [, cm, cyr]   = P58_GROUP.classDate.split('-').map(Number);
    const monthsCeased  = Math.max(0, (ASOF.y - cyr) * 12 + (ASOF.m - cm));   // 30 Sep→31 Des = 3
    const annualDeprGrp = members.reduce((a, m) => a + m.annual, 0);
    const deprCeased    = R(annualDeprGrp * monthsCeased / 12);   // peny. yg TIDAK dibebankan (¶25)

    /* operasi dihentikan (¶31-33) — segmen 3PL merupakan lini usaha utama terpisah */
    const revStream   = rev.streams.find(s => s.id === P58_GROUP.revStream) || { amount: 0, label: '', pct: 0 };
    const revDisc     = R(revStream.amount);                     // pendapatan segmen → WTB 4-1100
    const opResultDisc = R(revDisc * P58_GROUP.opMarginPct);     // hasil operasi pra-pajak (rugi)
    const pretaxDisc  = opResultDisc - writedown;                // termasuk rugi remeasurement (¶33b)
    const taxDisc     = R(pretaxDisc * RATE);                    // konsekuensi pajak (¶33b) — kredit bila rugi
    const postTaxDisc = pretaxDisc - taxDisc;                    // JUMLAH TUNGGAL disajikan (¶33a)

    /* jembatan laba: total (FSGEN) = dilanjutkan + dihentikan (penyajian-ulang, total tetap).
       fsgenModel() = null di headless/test (DI seam belum didaftarkan) — perilaku identik dgn
       guard `window.FSGEN ?` sebelumnya; di app, fsgen_model mendaftarkan buildModel saat boot. */
    const model     = fsgenModel(wtb);
    const netTotal  = model ? R(model.is.netIncome.cy / 1e6) : 0;
    const salesTot  = model ? R(model.is.sales.cy / 1e6) : 0;
    const contProfit = netTotal - postTaxDisc;                   // laba dari operasi dilanjutkan

    /* analisis arus kas operasi dihentikan (¶33c) — derivasi */
    const cfOps = R(opResultDisc + deprCeased);                  // ≈ arus kas operasi (peny. non-kas)
    const cfInv = 0;                                             // belum ada divestasi terealisasi
    const cfFin = 0;

    /* penyajian Neraca (¶38): carve-out dari Aset Tetap */
    const ppeNet   = R(fa.netClose);                             // aset tetap neto (PSAK 16/WTB)
    const ppeAfter = R(ppeNet - carryBefore);                    // sisa aset tetap stlh reklas

    /* ringkasan untuk kartu & analitis */
    const dgPctPpe = ppeNet ? carryBefore / ppeNet : 0;          // porsi grup thd aset tetap
    const revPctTot = salesTot ? revDisc / salesTot : 0;

    return {
      group: P58_GROUP, members,
      carryBefore, costTot, accumTot, regNbvCheck,
      fairValue, costToSell, costToSellPct: P58_GROUP.costToSellPct, fvlcs,
      writedown, carryHFS, impaired,
      classDate: P58_GROUP.classDate, monthsCeased, annualDeprGrp, deprCeased,
      revDisc, revStreamLabel: revStream.label, opResultDisc, opMarginPct: P58_GROUP.opMarginPct,
      pretaxDisc, taxDisc, postTaxDisc, rate: RATE,
      netTotal, salesTot, contProfit,
      cfOps, cfInv, cfFin,
      ppeNet, ppeAfter, dgPctPpe, revPctTot,
    };
  }

  /* ============================================================
     reconcile(wtb) — rekonsiliasi angka lintas-modul.
     Mengembalikan baris tie-out: tiap pos punya SATU sumber (WTB/
     modul) lalu mencocokkan nilai yang dipakai modul-modul konsumen.
     Dipakai oleh tab "Rekonsiliasi Angka" di modul Alur Data.
     ============================================================ */
  function reconcile(wtb?: WTB) {
    const s = figuresFromWTB(wtb);
    const dt = deferredTax(wtb);
    const inv = inventory(wtb);
    const fa = fixedAssets(wtb);
    const intan = intangibles(wtb);
    const p68 = psak68(wtb);
    const p48 = psak48(wtb);
    const p57 = psak57(wtb);
    const tol = 1; // toleransi Rp 1 jt (pembulatan)
    interface ReconInput {
      id: string; pos: string; unit?: string; sourceLabel?: string; sourceRoute?: string;
      source: number; ref?: string; note?: string; warnOnly?: boolean; statusOverride?: string;
      consumers: Array<{ module?: string; label?: string; val: number }>;
      extra?: Array<{ label: string; val: number }>;
    }
    const row = (o: ReconInput) => {
      const vals = o.consumers.map(c => c.val);
      const max = Math.max(o.source, ...vals), min = Math.min(o.source, ...vals);
      const variance = Math.round(max - min);
      const status = o.statusOverride || (variance <= tol ? 'ok' : (o.warnOnly ? 'warn' : 'err'));
      return { ...o, variance, status };
    };

    /* ECL model (PSAK 71) — ditarik dari SATU sumber: psak71(wtb). Tidak ada lagi
       duplikasi loss-rate di reconcile maupun view_calc. */
    const p71 = psak71(wtb);
    const eclModel = Math.round(p71.eclModel);

    const accounting = [
      row({
        id: 'dbo', pos: 'Liabilitas Imbalan Kerja (DBO)', unit: 'Rp juta',
        sourceLabel: 'WTB · 2-2300', sourceRoute: 'wtb', source: s.dboBooked, ref: 'PSAK 24',
        note: 'Nilai tercatat liabilitas imbalan pasti; jadi beda temporer dapat dikurangkan (dasar pajak 0).',
        consumers: [
          { module: 'psak24', label: 'PSAK 24 · Imbalan Kerja', val: dt.items.find(i => i.id === 'eb')!.car! },
          { module: 'psak46', label: 'PSAK 46 · beda temporer (eb)', val: dt.items.find(i => i.id === 'eb')!.car! },
        ],
      }),
      row({
        id: 'ckpn', pos: 'CKPN / ECL Piutang', unit: 'Rp juta',
        sourceLabel: 'WTB · 1-1210', sourceRoute: 'wtb', source: s.ckpnBooked, ref: 'PSAK 71',
        warnOnly: true,
        note: 'PSAK 46 memakai saldo dibukukan klien (Rp ' + s.ckpnBooked + ' jt). Model ECL Rp ' + eclModel + ' jt → AJE menaikkan ke saldo audited Rp ' + s.ckpnAudited + ' jt. Pertimbangkan dasar audited untuk beda temporer.',
        consumers: [
          { module: 'ecl', label: 'Kalkulator ECL · dibukukan', val: s.ckpnBooked },
          { module: 'psak46', label: 'PSAK 46 · beda temporer (ecl)', val: dt.items.find(i => i.id === 'ecl')!.diff },
        ],
        extra: [
          { label: 'Model ECL (PSAK 71)', val: eclModel },
          { label: 'Saldo audited (stlh AJE)', val: s.ckpnAudited },
        ],
      }),
      row({
        id: 'ppe', pos: 'Aset Tetap — nilai tercatat neto', unit: 'Rp juta',
        sourceLabel: 'WTB · 1-2100 + 1-2110', sourceRoute: 'wtb', source: s.ppeNetCarry, ref: 'PSAK 16',
        warnOnly: true,
        note: 'Beda temporer aset tetap (Rp ' + dt.items.find(i => i.id === 'ppe')!.diff + ' jt) berasal dari selisih dengan dasar pajak (kertas kerja fiskal), bukan seluruh nilai tercatat. Carrying per WTB ditunjukkan untuk ketertelusuran.',
        consumers: [
          { module: 'psak16', label: 'PSAK 16 · nilai tercatat neto', val: Math.round(fa.netClose) },
          { module: 'fsgen', label: 'FS Generator · Aset tetap (Neraca)', val: Math.round(fa.netClose) },
          { module: 'psak46', label: 'PSAK 46 · carrying (sub-pool)', val: dt.items.find(i => i.id === 'ppe')!.car! },
        ],
        extra: [
          { label: 'Penyusutan audited (PSAK 16)', val: Math.round(fa.deprAudited) },
          { label: 'Belanja modal neto (capex)', val: Math.round(fa.capexNet) },
          { label: 'Beda temporer aset tetap (PSAK 46)', val: dt.items.find(i => i.id === 'ppe')!.diff },
        ],
      }),
      row({
        id: 'intan', pos: 'Aset Takberwujud — nilai tercatat neto', unit: 'Rp juta',
        sourceLabel: 'WTB · 1-2400 + 1-2410', sourceRoute: 'wtb', source: s.intanNetCarry, ref: 'PSAK 19',
        warnOnly: true,
        note: 'Pos direclass dari Aset Tetap (lisensi/paten). Nilai tercatat neto Rp ' + Math.round(intan.netClose) + ' jt; termasuk lisensi umur tak-terbatas Rp ' + Math.round(intan.indefCarry) + ' jt yang diuji penurunan nilai tahunan (PSAK 48). Amortisasi audited Rp ' + Math.round(intan.amortAudited) + ' jt mengalir ke add-back Arus Kas.',
        consumers: [
          { module: 'psak19', label: 'PSAK 19 · nilai tercatat neto', val: Math.round(intan.netClose) },
          { module: 'fsgen', label: 'FS Generator · Aset takberwujud (Neraca)', val: Math.round(intan.netClose) },
        ],
        extra: [
          { label: 'Amortisasi audited (PSAK 19)', val: Math.round(intan.amortAudited) },
          { label: 'Penambahan / kapitalisasi (capex)', val: Math.round(intan.additions) },
          { label: 'Lisensi umur tak-terbatas (uji PSAK 48)', val: Math.round(intan.indefCarry) },
        ],
      }),
      row({
        id: 'fvfin', pos: 'Aset keuangan diukur pada nilai wajar', unit: 'Rp juta',
        sourceLabel: 'AMS_CANON.psak68 · FV_PORTFOLIO', sourceRoute: 'psak68', source: p68.finTotal, ref: 'PSAK 68 · IFRS 13',
        note: 'SUN (Level 1) + forward valas (Level 2) + saham privat (Level 3) = Rp ' + p68.finTotal + ' jt. Angka yang SAMA dipakai PSAK 71 untuk pos non-WTB (FVOCI/FVTPL) — satu seed kanonik, tanpa duplikasi.',
        consumers: [
          { module: 'psak71', label: 'PSAK 71 · instrumen FVOCI/FVTPL', val: p68.finTotal },
        ],
        extra: [
          { label: 'Level 1 (harga kuotasi pasar aktif)', val: p68.byLevel[0].amt },
          { label: 'Level 2 (input teramati)', val: p68.byLevel[1].amt },
          { label: 'Level 3 (input tak teramati)', val: p68.byLevel[2].amt },
        ],
      }),
      row({
        id: 'fvreval', pos: 'Tanah & bangunan — model revaluasi (NW)', unit: 'Rp juta',
        sourceLabel: 'Pakar · KJPP Mitra (WP V-2)', sourceRoute: 'expert', source: p68.revalTotal, ref: 'PSAK 16 · PSAK 68',
        note: 'Nilai wajar revaluasi Rp ' + p68.revalTotal + ' jt (tanah Level 2 pendekatan pasar + bangunan Level 3 DRC) ditarik dari laporan penilai yang SAMA dirujuk modul Penggunaan Pakar & Specifics (V-2). Surplus revaluasi → OCI; pajak tangguhan Rp ' + p68.dtlOci + ' jt dirujuk PSAK 46.',
        consumers: [
          { module: 'specifics', label: 'Evaluasi Pakar · V-2 (SA 500)', val: p68.revalTotal },
        ],
        extra: [
          { label: 'Tanah (Level 2 · pendekatan pasar)', val: p68.get('land')!.fv },
          { label: 'Bangunan (Level 3 · DRC)', val: p68.get('build')!.fv },
          { label: 'Pajak tangguhan surplus (OCI · PSAK 46)', val: p68.dtlOci },
        ],
      }),
      row({
        id: 'lease', pos: 'Liabilitas Sewa & ROU (PSAK 73)', unit: 'Rp juta',
        sourceLabel: 'WTB · 1-2300 / 2-1500+2-2200', sourceRoute: 'wtb', source: s.rouCarry, ref: 'PSAK 73',
        warnOnly: true,
        note: 'ROU per WTB Rp ' + s.rouCarry + ' jt; liabilitas sewa Rp ' + s.leaseLiab + ' jt. Portofolio kalkulator PSAK 73 dipakai PSAK 46 untuk beda temporer neto.',
        consumers: [
          { module: 'psak73', label: 'PSAK 73 · ROU portofolio', val: Math.round(dt.lease.rou) },
        ],
        extra: [
          { label: 'Liab. sewa per WTB', val: s.leaseLiab },
          { label: 'Liab. sewa portofolio', val: Math.round(dt.lease.liab) },
          { label: 'Beda temporer neto (PSAK 46)', val: dt.items.find(i => i.id === 'lse')!.diff },
        ],
      }),
      row({
        id: 'inv', pos: 'Persediaan — nilai tercatat neto', unit: 'Rp juta',
        sourceLabel: 'WTB · 1-1300', sourceRoute: 'wtb', source: inv.closeNet, ref: 'PSAK 14',
        warnOnly: true,
        note: 'Saldo akhir audited Rp ' + Math.round(inv.closeNet) + ' jt = saldo pra-audit Rp ' + Math.round(inv.closeUnadj) + ' jt + AJE pisah batas Rp ' + Math.round(inv.ajeInv) + ' jt (AJE-01). Uji NRV mengusulkan penurunan tambahan Rp ' + Math.round(inv.shortfallWD) + ' jt yang belum dibukukan (potensi salah saji → SAD).',
        consumers: [
          { module: 'psak14', label: 'PSAK 14 · roll-forward persediaan', val: Math.round(inv.closeNet) },
          { module: 'fsgen', label: 'FS Generator · Persediaan (Neraca)', val: Math.round(inv.closeNet) },
        ],
        extra: [
          { label: 'BPP audited (WTB 5-1100)', val: Math.round(inv.cogsAdj) },
          { label: 'Cadangan NRV dibukukan', val: Math.round(inv.bookedWD) },
          { label: 'Usulan penurunan NRV (SA 540)', val: Math.round(inv.shortfallWD) },
        ],
      }),
      row({
        id: 'dta', pos: 'Aset Pajak Tangguhan (DTA) neto', unit: 'Rp juta',
        sourceLabel: 'WTB · 1-2500', sourceRoute: 'wtb', source: s.dtaReported, ref: 'PSAK 46',
        warnOnly: true,
        note: 'DTA model PSAK 46 (jumlah beda temporer × 22%) vs DTA per buku besar. Selisih Rp ' + Math.abs(dt.dtaVariance) + ' jt perlu ditelusuri (mis. pos beda temporer tahun lalu belum dimodelkan).',
        consumers: [
          { module: 'psak46', label: 'PSAK 46 · DTA model (closing)', val: dt.closing },
        ],
      }),
      row({
        id: 'tax', pos: 'Beban Pajak Kini', unit: 'Rp juta',
        sourceLabel: 'PSAK 46 · PKP × 22%', sourceRoute: 'psak46', source: dt.currentTax, ref: 'PSAK 46',
        warnOnly: true,
        note: 'Pajak kini = PKP Rp ' + dt.pkp + ' jt × 22% = Rp ' + dt.currentTax + ' jt. Beban pajak dibukukan di WTB (5-5100) Rp ' + s.taxExpBooked + ' jt mencakup komponen kini & tangguhan.',
        consumers: [
          { module: 'wtb', label: 'WTB 5-5100 · beban pajak dibukukan', val: s.taxExpBooked },
          { module: 'fsgen', label: 'FS Generator · beban pajak', val: dt.taxExpense },
        ],
      }),
      row({
        id: 'impair', pos: 'Penurunan Nilai Aset — uji UPK (PSAK 48)', unit: 'Rp juta',
        sourceLabel: 'AMS_CANON.psak48 · DCF', sourceRoute: 'psak48', source: p48.carry, ref: 'PSAK 48',
        warnOnly: true,
        note: 'Nilai tercatat UPK Operasi Inti Rp ' + p48.carry + ' jt (aset tetap + takberwujud + ROU + goodwill) ditarik dari modul sumber ber-WTB. Jumlah terpulihkan (nilai pakai) Rp ' + p48.recoverable + ' jt → headroom Rp ' + Math.round(p48.headroom) + ' jt (' + (p48.headroomPct * 100).toFixed(1) + '%). Rugi penurunan nilai Rp ' + p48.impairLoss + ' jt.',
        consumers: [
          { module: 'psak16', label: 'PSAK 16 · aset tetap neto (komponen UPK)', val: p48.parts.find(x => x.id === 'ppe')!.val },
          { module: 'psak19', label: 'PSAK 19 · takberwujud terbatas (komponen UPK)', val: p48.parts.find(x => x.id === 'intanFin')!.val },
        ],
        extra: [
          { label: 'Lisensi tak-terbatas — uji tahunan (¶10)', val: p48.license.carry },
          { label: 'Jumlah terpulihkan lisensi (PSAK 19)', val: p48.license.recoverable },
          { label: 'Total rugi penurunan nilai diakui', val: p48.totalImpair },
        ],
      }),
      row({
        id: 'prov', pos: 'Provisi diakui (PSAK 57)', unit: 'Rp juta',
        sourceLabel: 'AMS_CANON.psak57 · PROV_REGISTER', sourceRoute: 'psak57', source: p57.provisionTotal, ref: 'PSAK 57',
        warnOnly: true,
        note: 'Provisi diakui Rp ' + p57.provisionTotal + ' jt (garansi Rp ' + p57.items.find(i => i.id === 'PRV-WAR')!.recognized + ' jt + litigasi LIT-02 Rp ' + p57.items.find(i => i.id === 'LIT-02')!.recognized + ' jt) menutup ke roll-forward (¶84). Liabilitas kontinjensi diungkap Rp ' + p57.contingentTotal + ' jt. Beda temporer ke PSAK 46 = Rp ' + p57.tempDiffModeled + ' jt (porsi garansi deductible).',
        consumers: [
          { module: 'sa501', label: 'SA 501 · register litigasi (provisi)', val: p57.litigation.reduce((a, i) => a + i.recognized, 0) },
          { module: 'sa540', label: 'SA 540 · estimasi provisi garansi', val: p57.items.find(i => i.id === 'PRV-WAR')!.recognized },
          { module: 'psak46', label: 'PSAK 46 · beda temporer provisi (prv)', val: p57.tempDiffModeled },
        ],
        extra: [
          { label: 'Roll-forward saldo akhir (¶84)', val: p57.rf.closing },
          { label: 'Liabilitas kontinjensi (diungkap)', val: p57.contingentTotal },
          { label: 'Klaim remote (tidak diungkap)', val: p57.remoteTotal },
        ],
      }),
    ];

    const p66 = psak66(wtb);
    accounting.push(row({
      id: 'ja', pos: 'Pengaturan Bersama (PSAK 66)', unit: 'Rp juta',
      sourceLabel: 'AMS_CANON.GROUP_ASSOCIATES · AS-02', sourceRoute: 'psak66', source: p66.jv!.carry!, ref: 'PSAK 66 · 15',
      warnOnly: true,
      note: 'Ventura bersama (KSO Sentosa-Andalan) disajikan metode ekuitas Rp ' + p66.jv!.carry + ' jt — nilai tercatat yang SAMA dipakai PSAK 65 di luar batas konsolidasi. Operasi bersama: bagian aset tetap Rp ' + p66.jo!.ppeShare + ' jt ditarik dari Register Aset Tetap (WTB 1-2100). Pengendalian BERSAMA → tidak dikonsolidasi.',
      consumers: [
        { module: 'psak65', label: 'PSAK 65 · asosiasi/ventura (ekuitas)', val: p66.jv!.carry! },
        { module: 'psak16', label: 'PSAK 16 · bagian aset tetap operasi bersama', val: p66.jo!.ppeShare! },
      ],
      extra: [
        { label: 'Bagian laba ventura → Laba Rugi', val: p66.jv!.shareProfit! },
        { label: 'Bagian aset neto operasi bersama', val: p66.jo!.netAssets! },
        { label: 'Tie-out lintas-laporan (lolos)', val: p66.tiePass },
      ],
    }));

    return { accounting, dt, inv, fa, intan, figures: s, eclModel, p71, p68, p48, p57, p66 };
  }

  /* ---------- PSAK 65 · Laporan Keuangan Konsolidasian (IFRS 10) ----------
     Modul "konsolidasi induk". INDUK (PT Sentosa Makmur Tbk) ditarik PENUH dari
     WTB — sehingga setiap AJE yang mengubah saldo entitas induk otomatis mengalir
     ke kertas kerja konsolidasi, NCI, dan LK konsolidasian. Entitas ANAK di-seed
     kanonik (buku besar pembantu komponen) dengan neraca yang menutup (aset =
     liabilitas + ekuitas) dan laba yang tie ke kontribusi NPAT.

     SATU SUMBER untuk lintas-modul:
       · INDUK             → WTB (AMS.WTB / useAudit().wtb) — live AJE
       · Goodwill akuisisi → Σ goodwill per-anak = Rp 6.800 jt = AMS_CANON.GOODWILL
                             (dipakai PSAK 48 uji penurunan nilai UPK tahunan)
       · Struktur grup &   → GROUP_SUBS / INTERCO yang SAMA dipakai modul
         eliminasi            Group Audit (SA 600) — tidak ada angka ganda
       · Pajak tangguhan   → tarif 22% (UU HPP) untuk konsekuensi PPA/laba antar-pr.

     Metode akuisisi (PSAK 22 ¶32): Investasi induk dieliminasi terhadap ekuitas
     anak pada tanggal akuisisi; selisih = goodwill; NCI diukur proporsional atas
     aset neto teridentifikasi (¶19). Rp juta. */

  /* entitas ANAK — buku besar pembantu komponen (seed kanonik, neraca menutup) */
  const GROUP_SUBS = [
    { id: 'CP-02', name: 'PT Sentosa Logistik', role: 'Anak — Distribusi', country: 'Indonesia', ccy: 'IDR', fx: 1,
      own: 99, acq: '2017', sig: 'Signifikan (ukuran)', scope: 'Full', risk: 'Medium', auditor: 'Tim Grup (WHR)',
      rev: 60000, npat: 11900, kas: 6000, piutang: 14000, persediaan: 4000, asetTetap: 28000, asetLain: 3000,
      utangUsaha: 9000, utangBank: 14000, liabLain: 3000, modal: 12000, rePre: 6000, rePost: 11000, cost: 18000 },
    { id: 'CP-03', name: 'PT Sentosa Pangan', role: 'Anak — Manufaktur F&B', country: 'Indonesia', ccy: 'IDR', fx: 1,
      own: 80, acq: '2019', sig: 'Signifikan (risiko)', scope: 'Specific', risk: 'High', auditor: 'KAP Mitra Selaras',
      rev: 47000, npat: 7200, kas: 4000, piutang: 11000, persediaan: 9000, asetTetap: 20000, asetLain: 3000,
      utangUsaha: 8000, utangBank: 12000, liabLain: 4800, modal: 10000, rePre: 4000, rePost: 8200, cost: 14000 },
    { id: 'CP-04', name: 'PT Sentosa Retail', role: 'Anak — Ritel', country: 'Indonesia', ccy: 'IDR', fx: 1,
      own: 75, acq: '2020', sig: 'Tidak signifikan', scope: 'Analytical', risk: 'Low', auditor: 'Tim Grup (WHR)',
      rev: 20000, npat: 2600, kas: 2000, piutang: 5000, persediaan: 8000, asetTetap: 8000, asetLain: 2000,
      utangUsaha: 5000, utangBank: 6000, liabLain: 2400, modal: 6000, rePre: 2000, rePost: 3600, cost: 7220 },
    { id: 'CP-05', name: 'Sentosa Trading Pte Ltd', role: 'Anak — Perdagangan', country: 'Singapura', ccy: 'SGD', fx: 11950,
      own: 100, acq: '2018', sig: 'Signifikan (risiko)', scope: 'Full', risk: 'Medium', auditor: 'KAP Lim & Tan (SG)',
      rev: 13000, npat: 4050, kas: 5000, piutang: 9000, persediaan: 6000, asetTetap: 4000, asetLain: 2000,
      utangUsaha: 4000, utangBank: 5000, liabLain: 2500, modal: 5000, rePre: 3000, rePost: 6500, cost: 10600 },
  ];

  /* investee TANPA pengendalian — batas konsolidasi (asosiasi & ventura bersama) */
  const GROUP_ASSOCIATES = [
    { id: 'AS-01', name: 'PT Mitra Sentosa Distribusi', own: 30, treat: 'Asosiasi · ekuitas (PSAK 15)', carry: 8400, std: 'PSAK 15', note: 'Pengaruh signifikan (20–50%), tanpa pengendalian → tidak dikonsolidasi.' },
    { id: 'AS-02', name: 'KSO Sentosa-Andalan', own: 50, treat: 'Ventura bersama · ekuitas (PSAK 66)', carry: 3100, std: 'PSAK 66', note: 'Pengendalian bersama berdasarkan perjanjian kontraktual → metode ekuitas.' },
  ];

  /* penilaian PENGENDALIAN per investee (IFRS 10 / PSAK 65 ¶7) — tiga elemen */
  const GROUP_CONTROL = [
    { id: 'CP-02', power: true, returns: true, link: true, voting: 99, deFacto: false, concl: 'Dikonsolidasi', note: 'Hak suara mayoritas 99% memberi kuasa langsung atas aktivitas relevan.' },
    { id: 'CP-03', power: true, returns: true, link: true, voting: 80, deFacto: false, concl: 'Dikonsolidasi', note: 'Kuasa 80% + eksposur imbal hasil variabel (laba & dividen).' },
    { id: 'CP-04', power: true, returns: true, link: true, voting: 75, deFacto: false, concl: 'Dikonsolidasi', note: 'Kuasa 75%; sisa 25% NCI tanpa hak proteksi yang menghalangi.' },
    { id: 'CP-05', power: true, returns: true, link: true, voting: 100, deFacto: false, concl: 'Dikonsolidasi', note: 'Dimiliki penuh; entitas asing → translasi PSAK 10.' },
    { id: 'AS-01', power: false, returns: true, link: false, voting: 30, deFacto: false, concl: 'Asosiasi (tidak dikonsolidasi)', note: 'Pengaruh signifikan, bukan pengendalian → ekuitas (PSAK 15).' },
    { id: 'AS-02', power: false, returns: true, link: false, voting: 50, deFacto: true, concl: 'Ventura bersama (tidak dikonsolidasi)', note: 'Pengendalian bersama kontraktual → ekuitas (PSAK 66).' },
  ];

  /* jurnal eliminasi & penyesuaian konsolidasi (selain eliminasi investasi) —
     SATU sumber yang juga dipakai modul Group Audit (SA 600). */
  const INTERCO: Array<{ id: string; desc: string; type: string; amount: number; status: string; dr: string; cr: string; cap: string | null; diff?: number; oci?: boolean }> = [
    { id: 'ELM-01', desc: 'Penjualan antar-perusahaan (Induk → Logistik)', type: 'Pendapatan', amount: 8400, status: 'Diverifikasi', dr: 'Penjualan', cr: 'Beban Pokok Penjualan', cap: null },
    { id: 'ELM-02', desc: 'Laba belum terealisasi dalam persediaan', type: 'Laba', amount: 640, status: 'Diverifikasi', dr: 'Beban Pokok Penjualan', cr: 'Persediaan', cap: 'persediaan' },
    { id: 'ELM-03', desc: 'Piutang / utang antar-perusahaan', type: 'Posisi', amount: 3200, status: 'Selisih', diff: 180, dr: 'Utang Usaha', cr: 'Piutang Usaha', cap: 'interco' },
    { id: 'ELM-04', desc: 'Dividen dari entitas anak (Pangan, Trading)', type: 'Laba', amount: 2100, status: 'Diverifikasi', dr: 'Penghasilan Dividen (Induk)', cr: 'Saldo Laba Anak', cap: null },
    { id: 'ELM-05', desc: 'Selisih kurs translasi — Sentosa Trading (SGD)', type: 'OCI', amount: 410, status: 'Review', oci: true, dr: '— (OCI)', cr: 'CTA — Selisih Kurs Translasi', cap: null },
  ];

  interface PkgData { status?: string; received?: string; [field: string]: unknown }

  function psak65(wtb?: WTB, pkgOverride?: Record<string, PkgData> | null) {
    const R = Math.round;
    const aj = (code: string) => jt(wtbVal(wtb, code, 'adj'));

    /* —— paket pelaporan komponen (impor) ——
       Status & figur tiap anak dapat diimpor/disunting di modul Group Audit
       (disimpan di ams.v1.gaPackages). Figur menggantikan seed → mengalir LIVE
       ke kertas kerja konsolidasi & PSAK 65; status = overlay tata kelola
       (tidak mengubah angka). Argumen pkgOverride dipakai pemanggil yang ingin
       angka selalu segar tanpa lag localStorage. */
    const PKG_OVR: Record<string, PkgData> | null = pkgOverride || (function (): Record<string, PkgData> | null {
      try { const s = localStorage.getItem('ams.v1.gaPackages'); return s ? JSON.parse(s) : null; }
      catch (e) { return null; }
    })();
    const PKG_NUMF = ['rev', 'npat', 'kas', 'piutang', 'persediaan', 'asetTetap', 'asetLain', 'utangUsaha', 'utangBank', 'liabLain', 'modal', 'rePre', 'rePost', 'cost'];
    const effSubs = GROUP_SUBS.map(s => {
      const p = PKG_OVR && PKG_OVR[s.id];
      if (!p) return { ...s, pkgStatus: 'Seed', pkgReceived: null as string | null };
      const m = { ...s, pkgStatus: (p.status as string) || 'Diterima', pkgReceived: (p.received as string) || null as string | null };
      PKG_NUMF.forEach(k => { const v = (p as Record<string, unknown>)[k]; if (typeof v === 'number' && isFinite(v)) (m as unknown as Record<string, number>)[k] = v; });
      return m;
    });
    const par = {
      kas: aj('1-1100'),
      piutang: aj('1-1200') + aj('1-1210'),                 // neto (1-1210 negatif)
      persediaan: aj('1-1300'),
      asetLain: aj('1-1400') + aj('1-1500') + aj('1-2300') + aj('1-2500'),
      asetTetap: aj('1-2100') + aj('1-2110'),               // 1-2110 negatif
      takber: aj('1-2400') + aj('1-2410'),
      utangUsaha: -aj('2-1100'),
      utangBank: -(aj('2-1200') + aj('2-2100')),
      liabLain: -(aj('2-1300') + aj('2-1400') + aj('2-1500') + aj('2-2200') + aj('2-2300')),
      modal: -aj('3-1100'),
      saldoLabaWTB: -aj('3-2100'),
    };
    const pSales = -aj('4-1100'), pCogs = aj('5-1100'),
          pOpex = aj('5-2100') + aj('5-3100'), pFin = aj('5-4100'), pTax = aj('5-5100');
    const pPbt = pSales - pCogs - pOpex - pFin;
    const npatParent = pPbt - pTax;                          // laba induk per WTB
    const dividendIncome = 2100;                             // penghasilan dividen dari anak (buku terpisah induk)

    /* —— eliminasi investasi (akuisisi · PSAK 22 ¶32) per anak —— */
    const RATE65 = 0.22;
    const subs = effSubs.map(s => {
      const equityAcq = s.modal + s.rePre;                  // aset neto teridentifikasi @ akuisisi (proxy)
      const equityNow = s.modal + s.rePre + s.rePost;
      const nciPct = (100 - s.own) / 100;
      const goodwill = R(s.cost - s.own / 100 * equityAcq); // selisih lebih = goodwill (PSAK 22)
      const nciAcq = R(nciPct * equityAcq);                 // NCI proporsional aset neto (¶19)
      const nciPost = R(nciPct * s.rePost);                 // bagian NCI atas laba pasca-akuisisi
      const nciClose = nciAcq + nciPost;
      const nciProfit = R(nciPct * s.npat);                 // bagian NCI atas laba tahun berjalan
      const assets = s.kas + s.piutang + s.persediaan + s.asetTetap + s.asetLain;
      const liab = s.utangUsaha + s.utangBank + s.liabLain;
      const internalBal = R(assets - liab - equityNow);     // paket menutup bila = 0 (aset = liab + ekuitas)
      return { ...s, equityAcq, equityNow, nciPct, goodwill, nciAcq, nciPost, nciClose, nciProfit, assets, liab, internalBal, balanced: internalBal === 0 };
    });

    const sum = (k: string) => subs.reduce((a, x) => a + (x as unknown as Record<string, number>)[k], 0);
    const goodwillTotal = sum('goodwill');                  // = 6.800 → tie ke AMS_CANON.GOODWILL
    const costTotal = sum('cost');
    const nciAcqTotal = sum('nciAcq');
    const nciPostTotal = sum('nciPost');
    const nciCloseTotal = sum('nciClose');
    const nciProfitTotal = sum('nciProfit');
    const subModalTotal = sum('modal');
    const subRePreTotal = sum('rePre');
    const subRePostTotal = sum('rePost');

    /* —— kertas kerja konsolidasi (laporan posisi keuangan ringkas) ——
       Induk + investasi(seed) + Σ Anak − Eliminasi = Konsolidasian. Karena tiap
       jurnal eliminasi berimbang & tiap kolom menutup, konsolidasian otomatis tie. */
    const unrInv = INTERCO.find(e => e.id === 'ELM-02')!.amount;   // laba blm terealisasi persediaan
    const intercoAR = INTERCO.find(e => e.id === 'ELM-03')!.amount; // piutang/utang antar-pr.
    const indukSaldoLaba = par.saldoLabaWTB + npatParent;         // termasuk laba th berjalan

    const ws = [
      { sec: 'Aset', cap: 'kas',        label: 'Kas & setara kas',            induk: par.kas,        anak: sum('kas'),        elim: 0 },
      { sec: 'Aset', cap: 'piutang',    label: 'Piutang usaha — neto',        induk: par.piutang,    anak: sum('piutang'),    elim: -intercoAR },
      { sec: 'Aset', cap: 'persediaan', label: 'Persediaan',                  induk: par.persediaan, anak: sum('persediaan'), elim: -unrInv },
      { sec: 'Aset', cap: 'asetLain',   label: 'Aset lancar & tidak lancar lain', induk: par.asetLain, anak: sum('asetLain'), elim: 0 },
      { sec: 'Aset', cap: 'asetTetap',  label: 'Aset tetap — neto',           induk: par.asetTetap,  anak: sum('asetTetap'),  elim: 0 },
      { sec: 'Aset', cap: 'takber',     label: 'Aset takberwujud — neto',     induk: par.takber,     anak: 0,                 elim: 0 },
      { sec: 'Aset', cap: 'investasi',  label: 'Investasi pada entitas anak', induk: costTotal,      anak: 0,                 elim: -costTotal, seed: true },
      { sec: 'Aset', cap: 'goodwill',   label: 'Goodwill (PSAK 22)',          induk: 0,              anak: 0,                 elim: goodwillTotal, gw: true },
      { sec: 'Liabilitas', cap: 'utangUsaha', label: 'Utang usaha',           induk: par.utangUsaha, anak: sum('utangUsaha'), elim: -intercoAR },
      { sec: 'Liabilitas', cap: 'utangBank',  label: 'Utang bank',            induk: par.utangBank,  anak: sum('utangBank'),  elim: 0 },
      { sec: 'Liabilitas', cap: 'liabLain',   label: 'Liabilitas lain',       induk: par.liabLain,   anak: sum('liabLain'),   elim: 0 },
      { sec: 'Ekuitas', cap: 'modal',     label: 'Modal saham',               induk: par.modal,        anak: subModalTotal,   elim: -subModalTotal },
      { sec: 'Ekuitas', cap: 'saldoLaba', label: 'Saldo laba',                induk: indukSaldoLaba,   anak: subRePreTotal + subRePostTotal, elim: -(subRePreTotal) - unrInv - nciPostTotal },
      { sec: 'Ekuitas', cap: 'invSeed',   label: 'Saldo laba — pendanaan investasi induk', induk: costTotal, anak: 0,        elim: 0, seed: true },
      { sec: 'Ekuitas', cap: 'nci',       label: 'Kepentingan nonpengendali (NCI)', induk: 0,           anak: 0,             elim: nciAcqTotal + nciPostTotal, nci: true },
    ].map(r => ({ ...r, konsol: r.induk + r.anak + r.elim }));

    const totBy = (sec: string, col: 'induk' | 'anak' | 'elim' | 'konsol') => ws.filter(r => r.sec === sec).reduce((a, r) => a + r[col], 0);
    const totals = {
      aset:      { induk: totBy('Aset', 'induk'), anak: totBy('Aset', 'anak'), elim: totBy('Aset', 'elim'), konsol: totBy('Aset', 'konsol') },
      liab:      { induk: totBy('Liabilitas', 'induk'), anak: totBy('Liabilitas', 'anak'), elim: totBy('Liabilitas', 'elim'), konsol: totBy('Liabilitas', 'konsol') },
      ekuitas:   { induk: totBy('Ekuitas', 'induk'), anak: totBy('Ekuitas', 'anak'), elim: totBy('Ekuitas', 'elim'), konsol: totBy('Ekuitas', 'konsol') },
    };
    const balCheck = R(totals.aset.konsol - totals.liab.konsol - totals.ekuitas.konsol); // = 0 jika menutup

    /* —— roll-up laba (laporan laba rugi konsolidasian) —— */
    const indukSeparate = npatParent + dividendIncome;       // laba entitas induk (LK terpisah)
    const subsNpat = sum('npat');
    const elimLaba = INTERCO.filter(e => e.type === 'Laba').reduce((a, e) => a + e.amount, 0); // 640 + 2100
    const consolNpat = indukSeparate + subsNpat - elimLaba;
    const nciProfit = nciProfitTotal;
    const ownersProfit = consolNpat - nciProfit;

    /* —— translasi entitas asing (PSAK 10) — Sentosa Trading —— */
    const trad = subs.find(s => s.id === 'CP-05')!;
    const translation = { name: trad.name, ccy: 'SGD', closeRate: 11950, avgRate: 11720,
      netAssetsSgd: R(trad.equityNow / 11.95), cta: INTERCO.find(e => e.id === 'ELM-05')!.amount };

    /* —— rekonsiliasi lintas-modul (lineage satu sumber) —— */
    const recon = [
      { pos: 'Laba entitas induk (NPAT standalone)', src: 'WTB · 4/5-xxxx (adjusted)', route: 'wtb', val: npatParent, ok: true, hi: true },
      { pos: 'Goodwill konsolidasi (PSAK 22)', src: 'Σ eliminasi investasi per-anak', route: 'psak22', val: goodwillTotal, ok: true },
      { pos: 'Goodwill diuji PSAK 48 (UPK)', src: 'AMS_CANON.GOODWILL', route: 'psak48', val: GOODWILL, ok: goodwillTotal === GOODWILL, hi: true },
      { pos: 'Kepentingan nonpengendali (NCI)', src: 'Σ NCI akuisisi + pasca-akuisisi', route: null, val: nciCloseTotal, ok: true },
      { pos: 'Eliminasi piutang/utang antar-pr.', src: 'INTERCO · ELM-03', route: 'groupaudit', val: intercoAR, ok: true },
      { pos: 'LPK konsolidasian menutup (A = L + E)', src: 'kertas kerja konsolidasi', route: null, val: balCheck, ok: balCheck === 0 },
    ];

    /* —— agregat paket pelaporan komponen (tata kelola impor) —— */
    const pkgApproved = subs.filter(s => s.pkgStatus === 'Disetujui').length;
    const pkgAllApproved = subs.length > 0 && subs.every(s => s.pkgStatus === 'Disetujui');
    const pkgAllBalanced = subs.every(s => s.balanced);
    const pkgCounts = subs.reduce((m, s) => { m[s.pkgStatus] = (m[s.pkgStatus] || 0) + 1; return m; }, {} as Record<string, number>);

    return {
      rate: RATE65, subs, associates: GROUP_ASSOCIATES, control: GROUP_CONTROL, interco: INTERCO,
      par, npatParent, dividendIncome, indukSeparate,
      goodwillTotal, costTotal, nciAcqTotal, nciPostTotal, nciCloseTotal, nciProfitTotal,
      ws, totals, balCheck,
      subsNpat, elimLaba, consolNpat, nciProfit, ownersProfit,
      translation, recon,
      goodwillTie: GOODWILL,
      pkgApproved, pkgAllApproved, pkgAllBalanced, pkgCounts,
      counts: { subs: GROUP_SUBS.length, associates: GROUP_ASSOCIATES.length, consolidated: GROUP_SUBS.length },
    };
  }

  /* ---------- PSAK 66 · Pengaturan Bersama (Joint Arrangements / IFRS 11) ----------
     Modul ini TIDAK menyimpan saldo sendiri — seluruh angka ditarik dari SATU
     sumber kebenaran yang SAMA dipakai modul lain, sehingga klasifikasi & nilai
     tercatat konsisten lintas-modul:

       · Ventura bersama (KSO Sentosa-Andalan) → nilai tercatat metode ekuitas
         (PSAK 15) = GROUP_ASSOCIATES['AS-02'].carry — ANGKA YANG SAMA dipakai
         PSAK 65 sebagai pos di luar batas konsolidasi (asosiasi/ventura). Tidak
         dikonsolidasi → tie ke PSAK 65 (counts.consolidated hanya entitas anak).
       · Penilaian pengendalian bersama (¶7-13) = GROUP_CONTROL['AS-02'] — elemen
         kuasa kolektif + persetujuan bulat yang SAMA dinilai modul Group Audit.
       · Operasi bersama (Proyek Terminal Logistik Terpadu) → bagian proporsional
         aset/liabilitas/pendapatan/beban (¶20). Bagian ASET TETAP operasi bersama
         ditarik PER NOMOR TAG dari Register Aset Tetap (PSAK 16 · assetRegister) →
         menutup ke akun kontrol GL WTB 1-2100. Koreksi AJE-05 (penyusutan) ikut
         tercermin secara live.

     Klasifikasi (¶14-19, B16-B33): kendaraan terpisah? → bentuk hukum → ketentuan
     kontraktual → fakta & keadaan lain. Hak atas aset NETO ⇒ ventura bersama
     (ekuitas). Hak atas aset & kewajiban atas liabilitas ⇒ operasi bersama
     (bagian proporsional). Rp juta. */

export { P58_GROUP, psak58, reconcile, GROUP_SUBS, GROUP_ASSOCIATES, GROUP_CONTROL, INTERCO, psak65 };
