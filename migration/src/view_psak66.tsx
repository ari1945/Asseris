/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { AMS_CANON } from './canon';
import { useAudit, useFirm, useNav } from './contexts';
import { I } from './icons';
import { SubBar } from './shell';
import { Badge, Btn, Panel } from './ui';

/* ============================================================
   Asseris — PSAK 66 · Pengaturan Bersama (Joint Arrangements)
   Kertas kerja klasifikasi & audit pengaturan bersama yang DITARIK
   PENUH dari satu sumber kebenaran — TIDAK ada angka di-hardcode:
     · AMS_CANON.psak66(wtb) — mesin yang menarik:
         - Ventura bersama (KSO Sentosa-Andalan) → nilai tercatat metode
           ekuitas = GROUP_ASSOCIATES['AS-02'].carry, ANGKA YANG SAMA
           dipakai PSAK 65 sebagai pos di luar batas konsolidasi.
         - Pengendalian bersama (¶7-13) = GROUP_CONTROL['AS-02'] — elemen
           kuasa kolektif & persetujuan bulat yang sama dinilai Group Audit.
         - Operasi bersama → bagian aset tetap proporsional ditarik per tag
           dari Register Aset Tetap (PSAK 16 · assetRegister) → WTB 1-2100.
     Satu perubahan AJE-05 (penyusutan) mengalir serempak ke bagian aset
     operasi bersama; satu perubahan GROUP_ASSOCIATES mengalir ke PSAK 65.

   Cakupan: penilaian pengendalian bersama (¶7-13 · kuasa kolektif +
   persetujuan bulat), pohon keputusan klasifikasi (¶14-19, B16-B33 —
   kendaraan terpisah → bentuk hukum → ketentuan kontraktual → fakta lain),
   akuntansi operasi bersama (¶20-23 · bagian proporsional A/L/I/E), akuntansi
   ventura bersama (¶24-25 · metode ekuitas PSAK 15) dengan roll-forward &
   informasi keuangan ringkas (PSAK 67 ¶B12-B14), tie-out lintas-laporan,
   lineage sumber data, & checklist pengungkapan PSAK 67.
   ============================================================ */
const { useState: useStateP66, useMemo: useMemoP66, useEffect: useEffectP66 } = React;

/* peta asersi → prosedur audit pengaturan bersama */
const P66_ASSERT = [
  { asr: 'Penyajian — Klasifikasi', proc: 'Telaah perjanjian kontraktual: tentukan operasi bersama vs ventura bersama (¶14-19)', sa: 'SA 540', wp: 'G-3', state: 'ok' },
  { asr: 'Hak & Kewajiban — Kendali', proc: 'Uji keberadaan pengendalian bersama: kuasa kolektif & persetujuan bulat (¶7-9)', sa: 'SA 500', wp: 'G-3a', state: 'ok' },
  { asr: 'Penilaian — Metode ekuitas', proc: 'Re-perform roll-forward ekuitas ventura; vouching bagian laba & dividen ke info keuangan', sa: 'SA 540', wp: 'G-3b', state: 'ok' },
  { asr: 'Keberadaan — Bagian aset', proc: 'Telusuri bagian aset/liabilitas operasi bersama ke register & dokumen kepemilikan', sa: 'SA 501', wp: 'G-3c', state: 'warn' },
  { asr: 'Kelengkapan — Komitmen', proc: 'Telaah komitmen & liabilitas kontinjensi pengaturan bersama (PSAK 67 ¶23)', sa: 'SA 501', wp: 'G-3d', state: 'warn' },
];

function JaCard({ value, unit, label, sub, accent }: any) {
  return (
    <div className="panel" style={{ padding: '12px 14px', display: 'grid', gap: 2 }}>
      <div className="row ac gap4" style={{ alignItems: 'baseline' }}>
        <span className="mono" style={{ fontSize: 21, fontWeight: 700, color: accent || 'var(--navy)', lineHeight: 1 }}>{value}</span>
        {unit && <span className="tiny mono" style={{ color: 'var(--ink-4)', fontWeight: 600 }}>{unit}</span>}
      </div>
      <div className="tiny muted" style={{ fontWeight: 600 }}>{label}</div>
      {sub && <div className="tiny" style={{ color: 'var(--ink-4)' }}>{sub}</div>}
    </div>
  );
}

/* baris pohon keputusan klasifikasi (¶17 · Gambar 1) */
function DecisionStep({ n, q, par, ans, detail, terminal }: any) {
  return (
    <div className="row gap10" style={{ alignItems: 'flex-start', padding: '9px 0', borderTop: n > 1 ? '1px solid var(--line-soft)' : 0 }}>
      <span className="mono" style={{ flex: '0 0 22px', width: 22, height: 22, borderRadius: 6, background: terminal ? 'var(--navy)' : 'var(--blue-050)', color: terminal ? '#fff' : 'var(--navy)', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700, marginTop: 1 }}>{n}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="row ac gap6" style={{ flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.3 }}>{q}</span>
          {par && <span className="mono tiny" style={{ color: 'var(--ink-4)' }}>{par}</span>}
        </div>
        <div className="tiny" style={{ color: 'var(--ink-3)', lineHeight: 1.45, marginTop: 2 }}>{detail}</div>
      </div>
      <Badge kind={terminal ? 'purple' : 'blue'}>{ans}</Badge>
    </div>
  );
}

function PSAK66View() {
  const { fmt } = AMS;
  const firm = useFirm();
  const audit = useAudit();
  const nav = useNav();
  const loader = window.loadLS || ((k, d) => d);

  /* ——— SUMBER KEBENARAN ——— */
  const wtb = (audit && audit.wtb && audit.wtb.length) ? audit.wtb : ((AMS && AMS.WTB) || []);
  const p66 = useMemoP66(() => (AMS_CANON ? AMS_CANON.psak66(wtb) : null), [wtb]);

  const [unit, setUnit] = useStateP66(() => loader('ams.psak66.unit', 'jutaan'));
  const [tab, setTab] = useStateP66(() => loader('ams.psak66.tab', 'ikhtisar'));
  const [disc, setDisc] = window.useAmsPersist('psak66.disc.v1', () => (null));
  useEffectP66(() => { try { localStorage.setItem('ams.psak66.unit', JSON.stringify(unit)); } catch (e) {} }, [unit]);
  useEffectP66(() => { try { localStorage.setItem('ams.psak66.tab', JSON.stringify(tab)); } catch (e) {} }, [tab]);


  if (!p66) {
    return <><SubBar moduleId="psak66" /><div className="view-pad"><Panel title="PSAK 66"><div className="tiny muted">Mesin kanonik belum dimuat.</div></Panel></div></>;
  }

  const client = firm.activeClient || { name: 'PT Sentosa Makmur Tbk' };
  const eng = firm.activeEngagement || { id: 'ENG-2025-014', fy: 'FY2025' };
  const aje05 = ((AMS && AMS.AJE) || []).find(a => a.id === 'AJE-05');
  const discList = disc || p66.disclosure;
  const toggleDisc = (id: any) => setDisc((discList).map((r: any) => r.id === id ? { ...r, ok: !r.ok } : r));
  const discOk = discList.filter((d: any) => d.ok).length;
  const discReq = discList.filter((d: any) => !d.na).length;

  const { jv, jo, tieRows, tiePass } = p66;

  /* ——— skala penyajian (kanonik dalam Rp juta) ——— */
  const UN = unit === 'penuh' ? { mult: 1e6, short: 'Rp' } : { mult: 1, short: 'Rp jt' };
  const sc = (vJuta: any) => fmt(Math.round(vJuta * UN.mult), 0);
  const STATE = { ok: { I: 'checkCircle', c: 'var(--green)' }, warn: { I: 'alert', c: 'var(--amber)' } };

  /* ============ PANEL: pohon keputusan klasifikasi (¶14-19) ============ */
  const classifyPanel = (a: any) => {
    const isJv = a.classify === 'jv';
    return (
      <Panel noBody key={a.id}>
        <div className="panel-h">
          <h3>{a.name}</h3>
          <span className="sub mono">{a.id} · {a.interest}%</span>
          <div style={{ flex: 1 }} />
          <Badge kind={isJv ? 'blue' : 'green'}>{isJv ? 'Ventura bersama' : 'Operasi bersama'}</Badge>
        </div>
        <div style={{ padding: '4px 14px 10px' }}>
          <div className="tiny muted" style={{ lineHeight: 1.45, marginBottom: 6 }}>{a.activity} · sekutu: {a.partner} · sejak {a.since}</div>
          <DecisionStep n={1} q="Apakah pengaturan distrukturkan melalui kendaraan terpisah?" par="¶B19" ans={a.vehicle ? 'Ya' : 'Tidak'} detail={a.vehicleForm} />
          {a.vehicle ? (
            <>
              <DecisionStep n={2} q="Bentuk hukum kendaraan memberi hak atas aset neto?" par="¶B22-B24" ans={isJv ? 'Ya' : 'Dikesampingkan'} detail={a.legalForm} />
              <DecisionStep n={3} q="Ketentuan kontraktual mengubah hak/kewajiban?" par="¶B25-B28" ans={isJv ? 'Tidak' : 'Ya'} detail={a.contractTerms} />
              <DecisionStep n={4} q="Fakta & keadaan lain (mis. wajib serap keluaran)?" par="¶B29-B33" ans={isJv ? 'Tidak' : 'Ya'} detail={a.otherFacts} />
            </>
          ) : (
            <DecisionStep n={2} q="Tanpa kendaraan terpisah → hak atas aset, kewajiban atas liabilitas" par="¶B16" ans="Operasi bersama" detail="Para pihak mengakui bagian proporsional secara langsung." />
          )}
          <DecisionStep n={a.vehicle ? 5 : 3} terminal q={isJv ? 'Hak atas ASET NETO → Ventura bersama' : 'Hak atas ASET & kewajiban atas LIABILITAS → Operasi bersama'} par={isJv ? '¶24' : '¶20'} ans={isJv ? 'Metode ekuitas' : 'Bagian proporsional'} detail={isJv ? 'Investasi dicatat metode ekuitas (PSAK 15).' : 'Akui bagian aset, liabilitas, pendapatan & beban.'} />
        </div>
      </Panel>
    );
  };

  /* ============ PANEL: penilaian pengendalian bersama (¶7-13) ============ */
  const controlPanel = (
    <Panel noBody>
      <div className="panel-h"><h3>Penilaian Pengendalian Bersama</h3><span className="sub mono">¶7–13</span><div style={{ flex: 1 }} /><span className="tiny muted">2 elemen</span></div>
      <div style={{ padding: '4px 14px 12px', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
          <thead>
            <tr style={{ color: 'var(--ink-4)' }}>
              <th style={{ textAlign: 'left', fontWeight: 600, padding: '6px 4px' }}>Pengaturan</th>
              <th style={{ textAlign: 'center', fontWeight: 600, padding: '6px 4px' }}>Kuasa kolektif (¶B5-B11)</th>
              <th style={{ textAlign: 'center', fontWeight: 600, padding: '6px 4px' }}>Persetujuan bulat (¶B6)</th>
              <th style={{ textAlign: 'right', fontWeight: 600, padding: '6px 4px' }}>Bagian suara</th>
              <th style={{ textAlign: 'right', fontWeight: 600, padding: '6px 4px' }}>Simpulan</th>
            </tr>
          </thead>
          <tbody>
            {p66.arrangements.map((a: any, i: any) => (
              <tr key={i} style={{ borderTop: '1px solid var(--line-soft)' }}>
                <td style={{ padding: '8px 4px', fontWeight: 600 }}>{a.name}<div className="tiny muted" style={{ fontWeight: 400, lineHeight: 1.35 }}>{a.decisionRule}</div></td>
                <td style={{ textAlign: 'center', padding: '8px 4px' }}>{a.collective ? <span style={{ color: 'var(--green)' }}><I.checkCircle size={15} /></span> : '—'}</td>
                <td style={{ textAlign: 'center', padding: '8px 4px' }}>{a.unanimous ? <span style={{ color: 'var(--green)' }}><I.checkCircle size={15} /></span> : '—'}</td>
                <td className="mono" style={{ textAlign: 'right', padding: '8px 4px' }}>{a.interest}%</td>
                <td style={{ textAlign: 'right', padding: '8px 4px' }}><Badge kind="purple">Pengendalian bersama</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="panel" style={{ marginTop: 11, padding: '9px 11px', background: 'var(--blue-050)', borderColor: 'transparent' }}>
          <div className="row gap8" style={{ alignItems: 'flex-start' }}>
            <span style={{ color: 'var(--blue)', marginTop: 1 }}><I.shield size={15} /></span>
            <span style={{ fontSize: 11.5, lineHeight: 1.45 }}>
              Kedua pengaturan memenuhi <b>pengendalian bersama</b> (¶7): para pihak secara <b>kolektif mengendalikan</b> aktivitas relevan dan keputusan membutuhkan <b>persetujuan bulat</b>. Karena pengendalian BERSAMA (bukan pengendalian tunggal), entitas <b>tidak mengonsolidasi</b> — konsisten dengan penilaian <b onClick={() => nav('psak65', { from: 'psak66' })} style={{ color: 'var(--blue)', cursor: 'pointer' }}>GROUP_CONTROL AS-02 (PSAK 65)</b>.
            </span>
          </div>
        </div>
      </div>
    </Panel>
  );

  /* ============ PANEL: roll-forward metode ekuitas (ventura bersama) ============ */
  const equityPanel = (
    <Panel noBody>
      <div className="panel-h"><h3>Ventura Bersama — Metode Ekuitas</h3><span className="sub mono">¶24 · PSAK 15</span><div style={{ flex: 1 }} /><Badge kind={jv.carryTie ? 'green' : 'amber'}>{jv.name}</Badge></div>
      <div style={{ padding: '4px 14px 12px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <tbody>
            {[
              { l: 'Saldo awal — 1 Jan 2025', v: jv.openCarry, sub: true },
              { l: 'Bagian laba ventura (' + jv.interest + '% × Rp ' + fmt(jv.sf.profit) + ' jt)', v: jv.shareProfit, memo: '→ Laba Rugi' },
              { l: 'Dividen diterima', v: -jv.dividend },
              { l: 'Bagian penghasilan komprehensif lain (OCI)', v: jv.oci },
              { l: 'Saldo akhir — nilai tercatat (31 Des 2025)', v: jv.carry, total: true, memo: '= GROUP_ASSOCIATES' },
            ].map((r, i) => (
              <tr key={i} style={{ borderTop: r.total ? '1.5px solid var(--navy)' : (r.sub ? 0 : '1px solid var(--line-soft)'), background: r.total ? 'var(--blue-050)' : 'transparent' }}>
                <td style={{ padding: r.total ? '9px 6px' : '7px 6px', fontSize: r.total ? 12.5 : 12, fontWeight: r.total || r.sub ? 700 : 400, color: r.total ? 'var(--ink)' : 'var(--ink-2)' }}>
                  {r.l}{r.memo && <span className="tiny" style={{ color: 'var(--purple)', fontWeight: 600, marginLeft: 6 }}>{r.memo}</span>}
                </td>
                <td className="mono" style={{ textAlign: 'right', padding: r.total ? '9px 6px' : '7px 6px', fontWeight: r.total || r.sub ? 700 : 500, color: r.v < 0 ? 'var(--red)' : (r.total ? 'var(--navy)' : 'var(--ink)') }}>{r.v === 0 ? '—' : sc(r.v)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="panel" style={{ marginTop: 11, padding: '9px 11px', background: jv.carryTie ? 'var(--green-bg)' : 'var(--amber-bg)', borderColor: 'transparent' }}>
          <div className="row gap8" style={{ alignItems: 'flex-start' }}>
            <span style={{ color: jv.carryTie ? 'var(--green)' : 'var(--amber)', marginTop: 1 }}><I.checkCircle size={15} /></span>
            <span style={{ fontSize: 11.5, lineHeight: 1.45 }}>
              Roll-forward menutup ke nilai tercatat <b>Rp {sc(jv.carry)} {UN.short}</b> — angka yang SAMA disajikan <b onClick={() => nav('psak65', { from: 'psak66' })} style={{ color: 'var(--blue)', cursor: 'pointer' }}>PSAK 65</b> sebagai pos asosiasi/ventura di luar batas konsolidasi. Termasuk goodwill terkandung Rp {sc(jv.goodwillInCarry)} {UN.short} (selisih nilai tercatat vs bagian aset neto Rp {sc(jv.netAssetShare)} {UN.short}).
            </span>
          </div>
        </div>
      </div>
    </Panel>
  );

  /* ============ PANEL: informasi keuangan ringkas (PSAK 67 ¶B12-B14) ============ */
  const summaryFinPanel = (
    <Panel noBody>
      <div className="panel-h"><h3>Informasi Keuangan Ringkas Ventura</h3><span className="sub mono">PSAK 67 ¶B12-B14</span></div>
      <div style={{ padding: '4px 14px 12px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
          <tbody>
            {[
              { l: 'Total aset ventura (100%)', v: jv.sf.assets },
              { l: 'Total liabilitas ventura (100%)', v: -jv.sf.liab },
              { l: 'Aset neto ventura (100%)', v: jv.sf.assets - jv.sf.liab, sub: true },
              { l: 'Bagian entitas atas aset neto (' + jv.interest + '%)', v: jv.netAssetShare },
              { l: 'Goodwill terkandung dalam nilai tercatat', v: jv.goodwillInCarry, memo: 'PSAK 22' },
              { l: 'Nilai tercatat metode ekuitas', v: jv.carry, total: true },
            ].map((r, i) => (
              <tr key={i} style={{ borderTop: r.total ? '1.5px solid var(--navy)' : (r.sub ? '1px solid var(--line)' : '1px solid var(--line-soft)'), background: r.total ? 'var(--blue-050)' : 'transparent' }}>
                <td style={{ padding: '7px 6px', fontSize: r.total ? 12.5 : 11.5, fontWeight: r.total || r.sub ? 700 : 400, color: r.total ? 'var(--ink)' : 'var(--ink-2)' }}>{r.l}{r.memo && <span className="tiny" style={{ color: 'var(--purple)', fontWeight: 600, marginLeft: 6 }}>{r.memo}</span>}</td>
                <td className="mono" style={{ textAlign: 'right', padding: '7px 6px', fontWeight: r.total || r.sub ? 700 : 500, color: r.v < 0 ? 'var(--red)' : (r.total ? 'var(--navy)' : 'var(--ink)') }}>{sc(r.v)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="row" style={{ marginTop: 10, gap: 8 }}>
          <div className="panel" style={{ flex: 1, padding: '8px 10px', display: 'grid', gap: 1 }}>
            <div className="tiny muted">Pendapatan ventura (100%)</div>
            <div className="mono" style={{ fontWeight: 700, fontSize: 13 }}>{sc(jv.sf.rev)}</div>
          </div>
          <div className="panel" style={{ flex: 1, padding: '8px 10px', display: 'grid', gap: 1 }}>
            <div className="tiny muted">Laba ventura (100%)</div>
            <div className="mono" style={{ fontWeight: 700, fontSize: 13, color: 'var(--green)' }}>{sc(jv.sf.profit)}</div>
          </div>
          <div className="panel" style={{ flex: 1, padding: '8px 10px', display: 'grid', gap: 1, background: 'var(--blue-050)', borderColor: 'transparent' }}>
            <div className="tiny muted">Bagian laba ({jv.interest}%)</div>
            <div className="mono" style={{ fontWeight: 700, fontSize: 13, color: 'var(--blue)' }}>{sc(jv.shareProfit)}</div>
          </div>
        </div>
      </div>
    </Panel>
  );

  /* ============ PANEL: operasi bersama — bagian proporsional (¶20-23) ============ */
  const joPanel = (
    <Panel noBody>
      <div className="panel-h"><h3>Operasi Bersama — Bagian Proporsional</h3><span className="sub mono">¶20-23</span><div style={{ flex: 1 }} /><Badge kind="green">{jo.interest}% · {jo.name}</Badge></div>
      <div style={{ padding: '4px 14px 12px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ color: 'var(--ink-4)' }}>
              <th style={{ textAlign: 'left', fontWeight: 600, padding: '5px 6px' }}>Pos diakui (bagian entitas)</th>
              <th style={{ textAlign: 'left', fontWeight: 600, padding: '5px 6px' }}>Sumber</th>
              <th style={{ textAlign: 'right', fontWeight: 600, padding: '5px 6px' }}>{UN.short}</th>
            </tr>
          </thead>
          <tbody>
            {[
              { l: 'Bagian aset tetap (¶20a)', src: 'Register Aset Tetap → WTB 1-2100', v: jo.ppeShare, hi: true },
              { l: 'Bagian aset lancar (kas & piutang JO)', src: 'skedul operasi bersama', v: jo.shareCurrent },
              { l: 'Total bagian aset', src: '', v: jo.assetsShare, sub: true },
              { l: 'Bagian liabilitas (¶20b)', src: 'utang & pinjaman proyek', v: -jo.shareLiab },
              { l: 'Bagian aset neto operasi bersama', src: '', v: jo.netAssets, total: true },
            ].map((r, i) => (
              <tr key={i} style={{ borderTop: r.total ? '1.5px solid var(--navy)' : (r.sub ? '1px solid var(--line)' : '1px solid var(--line-soft)'), background: r.total ? 'var(--blue-050)' : (r.hi ? 'var(--green-bg)' : 'transparent') }}>
                <td style={{ padding: '7px 6px', fontSize: r.total ? 12.5 : 12, fontWeight: r.total || r.sub ? 700 : 400, color: r.total ? 'var(--ink)' : 'var(--ink-2)' }}>{r.l}</td>
                <td className="tiny" style={{ padding: '7px 6px', color: 'var(--ink-4)' }}>{r.src}</td>
                <td className="mono" style={{ textAlign: 'right', padding: '7px 6px', fontWeight: r.total || r.sub ? 700 : 500, color: r.v < 0 ? 'var(--red)' : (r.total ? 'var(--navy)' : 'var(--ink)') }}>{sc(r.v)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* aset tetap operasi bersama per tag register */}
        <div className="tiny muted upper" style={{ margin: '12px 0 5px', letterSpacing: '.04em' }}>Bagian Aset Tetap — per Nomor Tag (Register PSAK 16)</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
          <thead>
            <tr style={{ color: 'var(--ink-4)' }}>
              <th style={{ textAlign: 'left', fontWeight: 600, padding: '5px 6px' }}>Tag</th>
              <th style={{ textAlign: 'left', fontWeight: 600, padding: '5px 6px' }}>Aset</th>
              <th style={{ textAlign: 'right', fontWeight: 600, padding: '5px 6px' }}>Nilai buku neto</th>
            </tr>
          </thead>
          <tbody>
            {jo.tagRows.map((r: any, i: any) => (
              <tr key={i} style={{ borderTop: '1px solid var(--line-soft)' }}>
                <td className="mono" style={{ padding: '6px 6px', fontWeight: 600, color: 'var(--navy)' }}>{r.tag}</td>
                <td style={{ padding: '6px 6px' }}>{r.name}</td>
                <td className="mono" style={{ textAlign: 'right', padding: '6px 6px' }}>{sc(r.nbv)}</td>
              </tr>
            ))}
            <tr style={{ borderTop: '1.5px solid var(--navy)', fontWeight: 700 }}>
              <td style={{ padding: '7px 6px' }} colSpan={2}>Σ bagian aset tetap operasi bersama</td>
              <td className="mono" style={{ textAlign: 'right', padding: '7px 6px', color: 'var(--navy)' }}>{sc(jo.ppeShare)}</td>
            </tr>
          </tbody>
        </table>

        <div className="row" style={{ marginTop: 11, gap: 8 }}>
          <div className="panel" style={{ flex: 1, padding: '8px 10px', display: 'grid', gap: 1 }}>
            <div className="tiny muted">Bagian pendapatan (¶20d)</div>
            <div className="mono" style={{ fontWeight: 700, fontSize: 13 }}>{sc(jo.shareRev)}</div>
          </div>
          <div className="panel" style={{ flex: 1, padding: '8px 10px', display: 'grid', gap: 1 }}>
            <div className="tiny muted">Bagian beban (¶20e)</div>
            <div className="mono" style={{ fontWeight: 700, fontSize: 13, color: 'var(--red)' }}>{sc(jo.shareExp)}</div>
          </div>
          <div className="panel" style={{ flex: 1, padding: '8px 10px', display: 'grid', gap: 1, background: 'var(--green-bg)', borderColor: 'transparent' }}>
            <div className="tiny muted">Kontribusi laba</div>
            <div className="mono" style={{ fontWeight: 700, fontSize: 13, color: 'var(--green)' }}>{sc(jo.result)}</div>
          </div>
        </div>
        <div onClick={() => nav('psak16', { from: 'psak66' })} className="tiny" style={{ marginTop: 10, padding: '8px 10px', borderRadius: 7, background: 'var(--blue-050)', cursor: 'pointer', lineHeight: 1.45 }}>
          Bagian aset tetap operasi bersama <b>Rp {sc(jo.ppeShare)} {UN.short}</b> ditarik per tag dari <b>Register Aset Tetap (PSAK 16)</b> → menutup ke akun kontrol GL <b>WTB 1-2100</b>. Koreksi {aje05 ? <b>{aje05.id}</b> : 'penyusutan'} mengalir secara live ke nilai buku neto.
        </div>
      </div>
    </Panel>
  );

  /* ============ PANEL: asersi & prosedur ============ */
  const asersiPanel = (
    <Panel noBody>
      <div className="panel-h"><h3>Asersi & Prosedur Audit</h3><div style={{ flex: 1 }} /><span className="tiny muted">SA 500 · SA 540</span></div>
      <div>
        {P66_ASSERT.map((r, i) => {
          const st = (STATE as any)[r.state];
          return (
            <div key={i} className="row ac gap10" style={{ padding: '9px 14px', borderBottom: i < P66_ASSERT.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
              <span style={{ color: st.c, display: 'grid', placeItems: 'center', flex: '0 0 auto' }}>{r.state === 'ok' ? <I.checkCircle size={15} /> : <I.alert size={15} />}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.3 }}>{r.asr}</div>
                <div className="tiny muted">{r.proc}</div>
              </div>
              <Badge kind="gray">{r.sa}</Badge>
              <span className="mono tiny" style={{ color: 'var(--ink-4)', width: 34, textAlign: 'right' }}>{r.wp}</span>
            </div>
          );
        })}
      </div>
      <div className="tiny muted" style={{ padding: '9px 14px', lineHeight: 1.5, borderTop: '1px solid var(--line-soft)' }}>
        <b>Klasifikasi</b> pengaturan bersama (¶14-19) merupakan pertimbangan signifikan → didokumentasikan & ditelaah (SA 540). Perubahan ketentuan kontraktual diperlakukan ulang prospektif.
      </div>
    </Panel>
  );

  /* ============ PANEL: tie-out ============ */
  const tieoutPanel = (
    <Panel noBody>
      <div className="row ac jb" style={{ padding: '11px 13px', borderBottom: '1px solid var(--line)' }}>
        <div><div style={{ fontWeight: 700, fontSize: 13, color: 'var(--navy)' }}>Validasi & Tie-out</div><div className="tiny muted">Satu sumber kebenaran (GROUP & WTB)</div></div>
        <div style={{ textAlign: 'right' }}><div className="mono" style={{ fontSize: 17, fontWeight: 700, color: tiePass === tieRows.length ? 'var(--green)' : 'var(--amber)' }}>{tiePass}/{tieRows.length}</div><div className="tiny muted">lolos</div></div>
      </div>
      <div style={{ padding: 9, display: 'grid', gap: 7 }}>
        {tieRows.map((c: any) => (
          <div key={c.id} onClick={c.route ? () => nav(c.route, { from: 'psak66' }) : undefined} style={{ border: '1px solid var(--line)', borderRadius: 7, padding: '9px 10px', background: c.ok ? 'var(--surface)' : 'var(--amber-bg)', cursor: c.route ? 'pointer' : 'default' }}>
            <div className="row ac gap8" style={{ marginBottom: 5 }}>
              <span style={{ color: c.ok ? 'var(--green)' : 'var(--amber)', display: 'grid', placeItems: 'center' }}>{c.ok ? <I.checkCircle size={15} /> : <I.alert size={15} />}</span>
              <span style={{ fontWeight: 600, fontSize: 12, flex: 1, color: 'var(--ink)', lineHeight: 1.3 }}>{c.label}</span>
              <Badge kind="gray">{c.std}</Badge>
            </div>
            <div className="tiny muted" style={{ marginBottom: c.a || c.b ? 5 : 0, paddingLeft: 23, lineHeight: 1.4 }}>{c.note}</div>
            {(c.a || c.b) ? (
              <div className="row" style={{ paddingLeft: 23, gap: 0, fontFamily: 'var(--mono)', fontSize: 10.5 }}>
                <div style={{ flex: 1 }}><div className="tiny" style={{ color: 'var(--ink-4)' }}>A</div><div style={{ fontWeight: 600 }}>{sc(c.a)}</div></div>
                <div style={{ flex: 1 }}><div className="tiny" style={{ color: 'var(--ink-4)' }}>B</div><div style={{ fontWeight: 600 }}>{sc(c.b)}</div></div>
                <div style={{ flex: 1 }}><div className="tiny" style={{ color: 'var(--ink-4)' }}>Δ</div><div style={{ fontWeight: 700, color: c.ok ? 'var(--green)' : 'var(--red)' }}>{sc(c.diff)}</div></div>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </Panel>
  );

  /* ============ PANEL: lineage ============ */
  const lineagePanel = (
    <Panel noBody>
      <div className="panel-h"><h3>Sumber Data (Lineage)</h3><div style={{ flex: 1 }} /><span className="tiny muted">klik untuk telusuri</span></div>
      <div style={{ padding: 6 }}>
        {p66.lineage.map((r: any, i: any) => {
          const IconC = (I as any)[r.icon] || I.doc;
          return (
            <button key={i} onClick={() => nav(r.route, { from: 'psak66' })} className="row ac gap9" style={{ width: '100%', textAlign: 'left', padding: '8px 9px', borderRadius: 7, border: '1px solid transparent', background: 'none', cursor: 'pointer' }}
              onMouseEnter={(e: any) => { e.currentTarget.style.background = 'var(--blue-050)'; e.currentTarget.style.borderColor = 'var(--blue-100)'; }}
              onMouseLeave={(e: any) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.borderColor = 'transparent'; }}>
              <span style={{ color: 'var(--blue)', flex: '0 0 auto' }}><IconC size={15} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.3 }}>{r.k}</div>
                <div className="tiny muted mono">{r.src}</div>
              </div>
              <I.arrowRight size={13} style={{ color: 'var(--ink-4)' }} />
            </button>
          );
        })}
      </div>
      <div className="tiny muted" style={{ padding: '0 12px 11px', lineHeight: 1.5 }}>
        Tidak ada angka di-input ulang: nilai tercatat ventura ditarik dari GROUP_ASSOCIATES yang sama dipakai PSAK 65, & bagian aset tetap operasi bersama dari Register Aset Tetap (WTB 1-2100). Perubahan AJE & seed grup mengalir serempak.
      </div>
    </Panel>
  );

  /* ============ PANEL: pengungkapan ============ */
  const disclosurePanel = (
    <Panel noBody>
      <div className="panel-h"><h3>Pengungkapan PSAK 67</h3><span className="sub mono">IFRS 12</span><div style={{ flex: 1 }} /><span className="tiny muted">{discOk}/{discList.length}</span></div>
      <div>
        {discList.map((d: any, i: any) => (
          <label key={d.id} className="row gap9" style={{ padding: '8px 13px', cursor: d.na ? 'default' : 'pointer', alignItems: 'flex-start', borderBottom: i < discList.length - 1 ? '1px solid var(--line-soft)' : 0, opacity: d.na ? 0.6 : 1 }} onClick={() => !d.na && toggleDisc(d.id)}>
            <span style={{ flex: '0 0 16px', width: 16, height: 16, borderRadius: 4, marginTop: 1, border: '1.5px solid ' + (d.na ? 'var(--line)' : (d.ok ? 'var(--green)' : 'var(--amber)')), background: d.ok && !d.na ? 'var(--green)' : '#fff', display: 'grid', placeItems: 'center' }}>{d.ok && !d.na && <I.check size={11} style={{ color: '#fff' }} />}{d.na && <span className="mono" style={{ fontSize: 8, color: 'var(--ink-4)' }}>N/A</span>}</span>
            <span className="mono tiny" style={{ fontWeight: 700, color: 'var(--navy)', width: 78, flex: '0 0 78px', marginTop: 1 }}>{d.ref}</span>
            <span style={{ fontSize: 11.5, lineHeight: 1.4, color: d.ok ? 'var(--ink-2)' : 'var(--ink)', fontWeight: d.ok ? 400 : 600 }}>{d.t}</span>
          </label>
        ))}
      </div>
    </Panel>
  );

  /* ============ TABS ============ */
  const TABS = [
    { id: 'ikhtisar',  label: 'Ikhtisar & Klasifikasi', icon: 'columns', badge: tiePass + '/' + tieRows.length, bad: tiePass !== tieRows.length },
    { id: 'kendali',   label: 'Pengendalian Bersama',   icon: 'shield',  badge: String(p66.counts.total), bad: false },
    { id: 'ventura',   label: 'Ventura Bersama (Ekuitas)', icon: 'layers', badge: jv.carryTie ? '✓' : '!', bad: !jv.carryTie },
    { id: 'operasi',   label: 'Operasi Bersama',        icon: 'ledger',  badge: jo.ppeTags.length + ' tag', bad: false },
    { id: 'pengungkapan', label: 'Pengungkapan & Sumber', icon: 'doc',   badge: discOk + '/' + discList.length, bad: discOk < discReq },
  ];

  return (
    <>
      <SubBar moduleId="psak66" right={
        <div className="row gap8 ac">
          <Badge kind="green">PSAK 66 · IFRS 11</Badge>
          <div className="seg" style={{ width: 'fit-content' }}>
            <button className={unit === 'jutaan' ? 'on' : ''} onClick={() => setUnit('jutaan')}>Jutaan</button>
            <button className={unit === 'penuh' ? 'on' : ''} onClick={() => setUnit('penuh')}>Penuh</button>
          </div>
          <Btn sm onClick={() => nav('psak65', { from: 'psak66' })}><I.building size={13} /> PSAK 65 · Konsolidasi</Btn>
          <Btn sm onClick={() => nav('psak16', { from: 'psak66' })}><I.ledger size={13} /> PSAK 16 · Aset Tetap</Btn>
          <Btn sm onClick={() => nav('fsgen', { from: 'psak66' })}><I.report size={13} /> FS Generator</Btn>
          <Btn sm onClick={() => nav('groupaudit', { from: 'psak66' })}><I.users size={13} /> Group Audit</Btn>
          <Btn sm><I.download size={13} /> Kertas Kerja G-3</Btn>
        </div>
      } />
      <div className="view-scroll">
        <div className="view-pad" style={{ display: 'grid', gap: 12 }}>

          {/* summary */}
          <div className="grid" style={{ gridTemplateColumns: 'repeat(5,1fr)', gap: 10 }}>
            <JaCard value={p66.counts.total} label="Pengaturan bersama" sub={p66.counts.jv + ' ventura · ' + p66.counts.jo + ' operasi'} accent="var(--navy)" />
            <JaCard value={sc(jv.carry)} unit={UN.short} label="Ventura bersama — metode ekuitas" sub="= pos PSAK 65 (luar konsolidasi)" accent="var(--blue)" />
            <JaCard value={sc(jv.shareProfit)} unit={UN.short} label="Bagian laba ventura" sub={jv.interest + '% → Laba Rugi'} accent="var(--green)" />
            <JaCard value={sc(jo.netAssets)} unit={UN.short} label="Aset neto operasi bersama" sub={jo.interest + '% · bagian proporsional'} accent="var(--purple)" />
            <JaCard value={tiePass + '/' + tieRows.length} label="Tie-out lintas-laporan" sub={tiePass === tieRows.length ? 'seluruh rekonsiliasi menutup' : 'perlu ditelusuri'} accent={tiePass === tieRows.length ? 'var(--green)' : 'var(--amber)'} />
          </div>

          {/* tab bar */}
          <div className="row" style={{ gap: 0, borderBottom: '1px solid var(--line)', overflowX: 'auto', flexWrap: 'nowrap' }}>
            {TABS.map(t => {
              const IconT = (I as any)[t.icon] || I.doc;
              const on = tab === t.id;
              return (
                <button key={t.id} onClick={() => setTab(t.id)} className="row ac gap7" style={{
                  padding: '9px 15px', border: 'none', background: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                  fontSize: 12.5, fontWeight: on ? 700 : 500, color: on ? 'var(--navy)' : 'var(--ink-3)',
                  borderBottom: '2px solid ' + (on ? 'var(--navy)' : 'transparent'), marginBottom: -1,
                }}>
                  <IconT size={14} />
                  {t.label}
                  {t.badge && <span className="mono" style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 9, color: t.bad ? 'var(--amber)' : (on ? 'var(--navy)' : 'var(--ink-4)'), background: t.bad ? 'var(--amber-bg)' : (on ? 'var(--blue-050)' : 'var(--surface-2, #f1f3f6)') }}>{t.badge}</span>}
                </button>
              );
            })}
          </div>

          {/* ============ TAB: IKHTISAR & KLASIFIKASI ============ */}
          {tab === 'ikhtisar' && (
            <div className="grid" style={{ gridTemplateColumns: '1fr 336px', gap: 12, alignItems: 'start' }}>
              <div className="grid" style={{ gap: 12 }}>{p66.arrangements.map((a: any) => classifyPanel(a))}</div>
              {tieoutPanel}
            </div>
          )}

          {/* ============ TAB: PENGENDALIAN BERSAMA ============ */}
          {tab === 'kendali' && (
            <div className="grid" style={{ gridTemplateColumns: '1fr 336px', gap: 12, alignItems: 'start' }}>
              {controlPanel}
              {asersiPanel}
            </div>
          )}

          {/* ============ TAB: VENTURA BERSAMA ============ */}
          {tab === 'ventura' && (
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }}>{equityPanel}{summaryFinPanel}</div>
          )}

          {/* ============ TAB: OPERASI BERSAMA ============ */}
          {tab === 'operasi' && (
            <div className="grid" style={{ gridTemplateColumns: '1fr 336px', gap: 12, alignItems: 'start' }}>
              {joPanel}
              {asersiPanel}
            </div>
          )}

          {/* ============ TAB: PENGUNGKAPAN & SUMBER ============ */}
          {tab === 'pengungkapan' && (
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }}>{disclosurePanel}{lineagePanel}</div>
          )}

          <div className="tiny muted" style={{ padding: '0 2px 4px', lineHeight: 1.5 }}>
            Kertas kerja pengaturan bersama <b>{client.name}</b> ({eng.id} · {eng.fy}) disusun sesuai PSAK 66 dan ditarik penuh dari satu sumber kebenaran: nilai tercatat ventura bersama (metode ekuitas) = GROUP_ASSOCIATES yang SAMA dipakai PSAK 65 di luar batas konsolidasi, & bagian aset tetap operasi bersama dari Register Aset Tetap (WTB 1-2100). {aje05 ? <>Koreksi <b>{aje05.id}</b> ({aje05.desc}) berstatus {aje05.status} ikut tercermin pada bagian aset operasi bersama.</> : null} Status & pilihan tersimpan otomatis untuk jejak audit.
          </div>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { PSAK66View });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { PSAK66View };
