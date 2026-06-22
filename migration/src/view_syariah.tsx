/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { AMS_CANON } from './canon';
import { useAudit, useNav } from './contexts';
import { I } from './icons';
import { SubBar } from './shell';
import { Badge, Btn, Donut, Panel } from './ui';
import { wpSignersFor } from './wp_signoff';

/* ============================================================
   Asseris — SAK Syariah · PSAK 101–112
   ------------------------------------------------------------
   Kertas kerja penyusunan & audit entitas syariah, DITARIK PENUH
   dari satu sumber kebenaran: AMS_CANON.syariah().
   Cakupan:
     • Penyajian LK Syariah (PSAK 101) — termasuk laporan khas
     • Daftar-uji per akad (PSAK 102–107)
     • Bagi hasil & pemurnian pendapatan non-halal
     • Zakat & Infak/Sedekah (PSAK 109) + Dana Kebajikan
     • Sukuk / Wakaf / Takaful (PSAK 108, 110, 112)
     • Audit & kepatuhan syariah (DPS) + Kertas Kerja S-1
   ============================================================ */
const { useState: useStateSY, useMemo: useMemoSY } = React;

const SY_KEL_COLOR = { 'Jual-beli': '#005085', 'Jual-beli pesanan': '#0a6b73', 'Bagi hasil': '#5b3fa6', 'Sewa': '#9a6a00' };
const SY_KEL_KIND  = { 'Jual-beli': 'blue', 'Jual-beli pesanan': 'teal', 'Bagi hasil': 'purple', 'Sewa': 'amber' };

function SYCard({ value, label, sub, accent }: any) {
  return (
    <div className="panel" style={{ padding: '12px 14px', display: 'grid', gap: 2 }}>
      <div className="mono" style={{ fontSize: 20, fontWeight: 700, color: accent || 'var(--navy)', lineHeight: 1.05 }}>{value}</div>
      <div className="tiny muted" style={{ fontWeight: 600 }}>{label}</div>
      {sub && <div className="tiny" style={{ color: 'var(--ink-4)' }}>{sub}</div>}
    </div>
  );
}

function SYKv({ label, v, strong, accent, indent }: any) {
  return (
    <div className="row jb ac">
      <span style={{ fontSize: 12, color: 'var(--ink-2)', paddingLeft: indent ? 14 : 0 }}>{label}</span>
      <span className="mono" style={{ fontWeight: strong ? 700 : 600, fontSize: strong ? 14 : 12.5, color: accent || (strong ? 'var(--navy)' : 'inherit') }}>{v}</span>
    </div>
  );
}

/* Laporan sumber & penggunaan — komponen tabel berbagi (zakat & kebajikan) */
function SYSourceUse({ title, sub, sumber, penggunaan, sumberLbl, pakaiLbl, saldoAwal, fmt, renderRow }: any) {
  const sumSrc = sumber.reduce((a: any, x: any) => a + x.v, 0);
  const sumUse = penggunaan.reduce((a: any, x: any) => a + x.v, 0);
  const kenaikan = sumSrc - sumUse;
  const saldo = saldoAwal + kenaikan;
  return (
    <div className="panel" style={{ overflow: 'hidden' }}>
      <div className="panel-h"><h3>{title}</h3><span className="sub mono">{sub}</span><div style={{ flex: 1 }} /><span className="tiny muted">Rp juta</span></div>
      <table className="dtbl" style={{ width: '100%' }}>
        <tbody>
          <tr style={{ background: 'var(--surface-2)' }}><td colSpan={2} className="tiny upper" style={{ fontWeight: 700, letterSpacing: '.04em', color: 'var(--ink-3)' }}>{sumberLbl}</td></tr>
          {sumber.map((s: any, i: any) => (
            <tr key={'s' + i}>
              <td style={{ fontSize: 12 }}>{renderRow ? renderRow(s) : s.k}</td>
              <td className="mono" style={{ textAlign: 'right' }}>{fmt(s.v)}</td>
            </tr>
          ))}
          <tr><td style={{ fontWeight: 700, color: 'var(--navy)', fontSize: 12 }}>Jumlah sumber</td><td className="mono" style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(sumSrc)}</td></tr>
          <tr style={{ background: 'var(--surface-2)' }}><td colSpan={2} className="tiny upper" style={{ fontWeight: 700, letterSpacing: '.04em', color: 'var(--ink-3)' }}>{pakaiLbl}</td></tr>
          {penggunaan.map((p: any, i: any) => (
            <tr key={'p' + i}><td style={{ fontSize: 12 }}>{p.k}</td><td className="mono" style={{ textAlign: 'right' }}>({fmt(p.v)})</td></tr>
          ))}
          <tr><td style={{ fontWeight: 700, color: 'var(--navy)', fontSize: 12 }}>Jumlah penggunaan</td><td className="mono" style={{ textAlign: 'right', fontWeight: 700 }}>({fmt(sumUse)})</td></tr>
        </tbody>
        <tfoot>
          <tr><td style={{ fontSize: 12 }}>Kenaikan/(penurunan) dana</td><td className="mono" style={{ textAlign: 'right', fontWeight: 700, color: kenaikan < 0 ? 'var(--red)' : 'var(--green)' }}>{kenaikan < 0 ? '(' + fmt(-kenaikan) + ')' : fmt(kenaikan)}</td></tr>
          <tr><td style={{ fontSize: 12 }}>Saldo awal dana</td><td className="mono" style={{ textAlign: 'right' }}>{fmt(saldoAwal)}</td></tr>
          <tr style={{ background: 'var(--surface-2)' }}><td style={{ fontWeight: 800, color: 'var(--navy)' }}>Saldo akhir dana</td><td className="mono" style={{ textAlign: 'right', fontWeight: 800, color: 'var(--navy)' }}>{fmt(saldo)}</td></tr>
        </tfoot>
      </table>
    </div>
  );
}

function sySignoffDefaults() {
  const TEAM = (AMS && AMS.TEAM) || [];
  const find = (kw: any) => TEAM.find((t) => t.role.includes(kw))?.name || '—';
  return {
    preparer: { by: find('Senior'),  role: 'Auditor Senior', at: '13 Jan 2026' },
    reviewer: { by: find('Manager'), role: 'Manajer Audit',  at: '18 Jan 2026' },
    approver: { by: find('Partner'), role: 'Rekan Penanggung Jawab', at: '20 Jan 2026' },
  };
}

/* ============================================================
   KERTAS KERJA S-1 — lembar kerja formal, siap-reviu & cetak.
   ============================================================ */
function SYWorkPaper({ sy, fmt, rp, nav }: any) {
  const FIRM: any = (AMS && AMS.FIRM) || { name: 'KAP Wijaya Hartono & Rekan', license: '' };
  const audit = useAudit();
  const so = wpSignersFor(audit, 'syariah', sySignoffDefaults());
  const cl = sy.client;
  const Sect = ({ n, title, sub, children }: any) => (
    <div style={{ marginTop: 22 }}>
      <div className="row ac gap8" style={{ borderBottom: '1.5px solid var(--navy)', paddingBottom: 5, marginBottom: 11 }}>
        <span className="mono" style={{ width: 22, height: 22, flex: '0 0 22px', borderRadius: 5, background: 'var(--navy)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700 }}>{n}</span>
        <h4 style={{ margin: 0, fontSize: 13.5, color: 'var(--navy)', fontWeight: 700, letterSpacing: '.01em' }}>{title}</h4>
        {sub && <span className="tiny muted mono" style={{ marginLeft: 'auto' }}>{sub}</span>}
      </div>
      {children}
    </div>
  );
  const Meta = ({ k, v, mono }: any) => (
    <div style={{ display: 'grid', gap: 1 }}>
      <span className="tiny upper" style={{ letterSpacing: '.05em', color: 'var(--ink-4)', fontSize: 9.5, fontWeight: 700 }}>{k}</span>
      <span className={mono ? 'mono' : ''} style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>{v}</span>
    </div>
  );
  const Sign = ({ lbl, p, accent }: any) => (
    <div style={{ flex: 1, borderTop: '2px solid ' + (accent || 'var(--navy)'), paddingTop: 8 }}>
      <div className="tiny upper" style={{ letterSpacing: '.05em', color: 'var(--ink-4)', fontSize: 9.5, fontWeight: 700, marginBottom: 14 }}>{lbl}</div>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--navy)' }}>{p.by}</div>
      <div className="tiny muted">{p.role}</div>
      <div className="tiny mono" style={{ color: 'var(--ink-3)', marginTop: 3 }}>{p.at}</div>
    </div>
  );

  return (
    <div className="panel" style={{ background: '#fff', maxWidth: 880, margin: '0 auto', width: '100%', padding: '30px 38px 34px', boxShadow: 'var(--shadow)' }}>
      <div className="row jb" style={{ alignItems: 'flex-start', gap: 18, paddingBottom: 14, borderBottom: '2px solid var(--navy)' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--navy)', lineHeight: 1.2 }}>{FIRM.name}</div>
          <div className="mono tiny" style={{ color: 'var(--ink-4)' }}>{FIRM.license}</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', marginTop: 9 }}>Kertas Kerja — Akuntansi & Kepatuhan Syariah</div>
          <div className="tiny muted">SAK Syariah · PSAK 101–112 · akad, zakat, dana kebajikan & pemurnian</div>
        </div>
        <div style={{ textAlign: 'right', flex: '0 0 auto' }}>
          <div className="mono" style={{ display: 'inline-block', border: '1.5px solid var(--navy)', borderRadius: 7, padding: '5px 12px', fontSize: 17, fontWeight: 800, color: 'var(--navy)' }}>S-1</div>
          <div className="tiny muted" style={{ marginTop: 6 }}>Indeks lead schedule <b style={{ color: 'var(--ink)' }}>S</b> · Syariah</div>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: '12px 18px', padding: '14px 0', borderBottom: '1px solid var(--line)' }}>
        <Meta k="Klien" v={cl.name} />
        <Meta k="NPWP" v={cl.npwp} mono />
        <Meta k="Periode" v="31 Desember 2025" />
        <Meta k="Kerangka" v={sy.framework} />
        <Meta k="Sektor" v="Bank Umum Syariah (OJK)" />
        <Meta k="Asersi utama" v="Penyajian, penilaian & kepatuhan" />
        <Meta k="Risiko terkait" v="R-S1 · Kepatuhan syariah" />
        <Meta k="Standar audit" v="SA 250 · SA 540 · SA 620" />
      </div>

      <Sect n="1" title="Tujuan & Lingkup">
        <p style={{ margin: 0, fontSize: 12, lineHeight: 1.65, color: 'var(--ink-2)' }}>
          Memperoleh bukti audit yang cukup dan tepat bahwa laporan keuangan disusun sesuai <b>SAK Syariah</b> — meliputi ketepatan pengakuan & pengukuran per <b>akad</b> (PSAK 102–107), penyajian <b>Dana Syirkah Temporer</b> & laporan keuangan syariah khas (PSAK 101), kelengkapan <b>dana zakat</b> (PSAK 109) & dana kebajikan, serta <b>pemurnian pendapatan non-halal</b>. Auditor mempertimbangkan opini <b>Dewan Pengawas Syariah (DPS)</b> atas kepatuhan prinsip syariah.
        </p>
      </Sect>

      <Sect n="2" title="Pembiayaan per Akad" sub="Rp juta">
        <table className="dtbl" style={{ width: '100%' }}>
          <thead><tr>
            <th style={{ textAlign: 'left' }}>Akad</th>
            <th style={{ textAlign: 'center', width: 76 }}>Standar</th>
            <th style={{ textAlign: 'left', width: 120 }}>Kelompok</th>
            <th style={{ textAlign: 'right', width: 100 }}>Nilai Tercatat</th>
          </tr></thead>
          <tbody>
            {sy.akad.map((a: any) => (
              <tr key={a.id}>
                <td style={{ fontWeight: 600, fontSize: 12 }}>{a.akad}</td>
                <td className="mono tiny" style={{ textAlign: 'center', color: 'var(--ink-3)' }}>{a.psak}</td>
                <td><Badge kind={(SY_KEL_KIND as any)[a.kel]}>{a.kel}</Badge></td>
                <td className="mono" style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(a.pokok)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background: 'var(--surface-2)' }}><td colSpan={3} style={{ fontWeight: 700, color: 'var(--navy)' }}>Pembiayaan bruto</td><td className="mono" style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(sy.pembiayaanBruto)}</td></tr>
            <tr><td colSpan={3} style={{ fontSize: 12 }}>CKPN pembiayaan</td><td className="mono" style={{ textAlign: 'right', color: 'var(--red)' }}>({fmt(sy.ckpn)})</td></tr>
            <tr style={{ background: 'var(--surface-2)' }}><td colSpan={3} style={{ fontWeight: 800, color: 'var(--navy)' }}>Pembiayaan neto</td><td className="mono" style={{ textAlign: 'right', fontWeight: 800, color: 'var(--navy)' }}>{fmt(sy.pembiayaanNeto)}</td></tr>
          </tfoot>
        </table>
      </Sect>

      <Sect n="3" title="Dana Zakat, Kebajikan & Pemurnian" sub="PSAK 109 · Rp juta">
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="panel" style={{ padding: '9px 12px', background: 'var(--surface-2)', boxShadow: 'none', display: 'grid', gap: 5 }}>
            <SYKv label="Sumber dana zakat" v={fmt(sy.zakatSumber)} />
            <SYKv label="Penyaluran (8 asnaf)" v={'(' + fmt(sy.zakatSalur) + ')'} accent="var(--red)" />
            <SYKv label="Saldo akhir dana zakat" v={fmt(sy.zakatSaldo) + ' jt'} strong />
          </div>
          <div className="panel" style={{ padding: '9px 12px', background: 'var(--surface-2)', boxShadow: 'none', display: 'grid', gap: 5 }}>
            <SYKv label="Pendapatan non-halal (pemurnian)" v={fmt(sy.purif)} accent="var(--amber)" />
            <SYKv label="Saldo akhir dana kebajikan" v={fmt(sy.kebSaldo) + ' jt'} strong />
            <SYKv label="Opini DPS" v={sy.dpsPct + '% terpenuhi'} accent={sy.dpsPct === 100 ? 'var(--green)' : 'var(--amber)'} />
          </div>
        </div>
      </Sect>

      <Sect n="4" title="Kesimpulan Audit">
        <div className="panel" style={{ padding: '11px 13px', background: sy.dpsPct === 100 ? 'var(--green-bg)' : 'var(--amber-bg)', borderColor: 'transparent' }}>
          <div className="row gap8" style={{ alignItems: 'flex-start' }}>
            <span style={{ color: sy.dpsPct === 100 ? 'var(--green)' : 'var(--amber)', marginTop: 1, flex: '0 0 auto' }}><I.alert size={15} /></span>
            <div style={{ fontSize: 12, lineHeight: 1.6 }}>
              Pengakuan & pengukuran per akad telah sesuai PSAK 102–107; <b>Dana Syirkah Temporer {rp(sy.dstTotal)} jt</b> disajikan terpisah sesuai PSAK 101. Pendapatan non-halal <b>{rp(sy.purif)} jt</b> telah dimurnikan ke dana kebajikan. Dana zakat tersalur ke 8 asnaf dengan saldo akhir <b>{rp(sy.zakatSaldo)} jt</b>. Opini DPS <b>{sy.dpsPct}% terpenuhi</b>{sy.dpsPct < 100 ? ' — terdapat catatan terbuka yang perlu ditindaklanjuti sebelum opini final.' : '.'} Kepatuhan syariah merupakan kandidat Hal Audit Utama (KAM).
            </div>
          </div>
        </div>
      </Sect>

      <Sect n="5" title="Referensi Silang — Aliran Angka">
        <div className="row gap8" style={{ flexWrap: 'wrap' }}>
          {[
            { lbl: 'PSAK 71 · CKPN', id: 'psak71' }, { lbl: 'Pengakuan Pendapatan', id: 'psak72' },
            { lbl: 'FS Generator', id: 'fsgen' }, { lbl: 'SAD Ledger', id: 'sad' }, { lbl: 'Opini & KAM', id: 'opinion' },
          ].map(x => (
            <button key={x.id} onClick={() => nav(x.id, { from: 'syariah' })} className="row ac gap6" style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--surface)', cursor: 'pointer', fontSize: 11.5, fontWeight: 600, color: 'var(--ink-2)' }}>
              <I.link2 size={12} style={{ color: 'var(--blue)' }} />{x.lbl}
            </button>
          ))}
        </div>
      </Sect>

      <div className="row gap20" style={{ marginTop: 26, gap: 26 }}>
        <Sign lbl="Disusun oleh" p={so.preparer} accent="var(--blue)" />
        <Sign lbl="Direviu oleh" p={so.reviewer} accent="var(--amber)" />
        <Sign lbl="Disetujui" p={so.approver} accent="var(--green)" />
      </div>
      <div className="tiny muted" style={{ marginTop: 16, paddingTop: 10, borderTop: '1px solid var(--line-soft)', lineHeight: 1.5 }}>
        WP S-1 · dokumentasi audit SA 230. Angka ditarik dari satu sumber kebenaran <span className="mono">AMS_CANON.syariah()</span> — konsisten dengan seluruh tab modul.
      </div>
    </div>
  );
}

function SyariahView() {
  const { fmt } = AMS;
  const nav = useNav();
  const loader = window.loadLS || ((k, d) => d);
  const canon = AMS_CANON;
  const sy = useMemoSY(() => (canon as any).syariah(), []);

  const [tab, setTab] = useStateSY(() => loader('ams.syariah.tab', 'penyajian'));
  const [done, setDone] = useStateSY(() => loader('ams.syariah.done', {}));
  React.useEffect(() => { try { localStorage.setItem('ams.syariah.tab', JSON.stringify(tab)); } catch (e) {} }, [tab]);
  React.useEffect(() => { try { localStorage.setItem('ams.syariah.done', JSON.stringify(done)); } catch (e) {} }, [done]);

  const rp = (x: any) => 'Rp ' + fmt(Math.round(x));
  const toggle = (id: any) => setDone((m: any) => ({ ...m, [id]: !m[id] }));
  const doneCount = sy.proc.filter((p: any, i: any) => done[p.ref + i]).length;
  const score = Math.round(doneCount / sy.proc.length * 100);

  const TABS = [
    { id: 'penyajian', label: 'Penyajian (PSAK 101)' },
    { id: 'akad', label: 'Daftar-Uji Akad' },
    { id: 'bagihasil', label: 'Bagi Hasil & Pemurnian' },
    { id: 'zis', label: 'Zakat & Kebajikan' },
    { id: 'sukuk', label: 'Sukuk · Wakaf · Takaful' },
    { id: 'audit', label: 'Audit & DPS' },
    { id: 'kk', label: 'Kertas Kerja S-1' },
  ];

  return (
    <>
      <SubBar moduleId="syariah" right={
        <div className="row gap8 ac">
          <Badge kind="purple">SAK Syariah · DSAS-IAI</Badge>
          <Btn sm onClick={() => nav('psak71', { from: 'syariah' })}><I.coins size={13} /> CKPN Pembiayaan</Btn>
          <Btn sm onClick={() => setTab('zis')}><I.scale size={13} /> Dana Zakat</Btn>
          <Btn sm onClick={() => setTab('kk')}><I.report size={13} /> Kertas Kerja S-1</Btn>
          <Btn sm variant="primary" onClick={() => nav('opinion', { from: 'syariah' })}><I.gavel size={14} /> Kandidat KAM</Btn>
        </div>
      } />
      <div className="view-scroll">
        <div className="view-pad" style={{ display: 'grid', gap: 12 }}>

          {/* summary cards */}
          <div className="grid" style={{ gridTemplateColumns: 'repeat(5,1fr)', gap: 10 }}>
            <SYCard value={rp(sy.pembiayaanNeto) + ' jt'} label="Pembiayaan Neto" sub="6 akad · setelah CKPN" accent="var(--navy)" />
            <SYCard value={rp(sy.dstTotal) + ' jt'} label="Dana Syirkah Temporer" sub="tabungan & deposito mudharabah" accent="var(--purple)" />
            <SYCard value={rp(sy.zakatSaldo) + ' jt'} label="Saldo Dana Zakat" sub="PSAK 109 · 8 asnaf" accent="var(--green)" />
            <SYCard value={rp(sy.purif) + ' jt'} label="Pendapatan Dimurnikan" sub="non-halal → dana kebajikan" accent="var(--amber)" />
            <SYCard value={sy.dpsPct + '%'} label="Kepatuhan Syariah (DPS)" sub={sy.dpsOk + '/' + sy.dps.temuan.length + ' butir terpenuhi'} accent={sy.dpsPct === 100 ? 'var(--green)' : 'var(--amber)'} />
          </div>

          {/* tabs */}
          <div className="row ac jb" style={{ flexWrap: 'wrap', gap: 8 }}>
            <div className="seg" style={{ width: 'fit-content', flexWrap: 'wrap' }}>
              {TABS.map(t => <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>{t.label}</button>)}
            </div>
            <span className="tiny muted">Satu sumber: <span className="mono">AMS_CANON.syariah()</span></span>
          </div>

          {/* ================= TAB · PENYAJIAN (PSAK 101) ================= */}
          {tab === 'penyajian' && (
            <div className="grid" style={{ gridTemplateColumns: '1fr 332px', gap: 12, alignItems: 'start' }}>
              <div className="grid" style={{ gap: 12 }}>
                <Panel noBody>
                  <div className="panel-h"><h3>Komponen Laporan Keuangan Syariah</h3><span className="sub mono">PSAK 101 ¶11</span></div>
                  <div style={{ padding: '6px 14px 12px', display: 'grid', gap: 0 }}>
                    {sy.lkKhas.map((s: any, i: any) => (
                      <div key={s.id} className="row ac gap10" style={{ padding: '9px 0', borderBottom: i < sy.lkKhas.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
                        <span style={{ color: s.khas ? 'var(--purple)' : 'var(--ink-4)', flex: '0 0 auto' }}><I.report size={15} /></span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.3 }}>{s.label}</div>
                          <div className="tiny muted mono">{s.psak}</div>
                        </div>
                        {s.khas && <Badge kind="purple">Khas Syariah</Badge>}
                      </div>
                    ))}
                  </div>
                  <div className="tiny muted" style={{ padding: '0 14px 12px', lineHeight: 1.5 }}>
                    Empat laporan tambahan membedakan LK syariah dari LK komersial: laporan <b>dana zakat</b>, <b>dana kebajikan</b>, <b>rekonsiliasi pendapatan & bagi hasil</b>, serta penyajian <b>Dana Syirkah Temporer</b> sebagai pos tersendiri.
                  </div>
                </Panel>

                <Panel noBody>
                  <div className="panel-h"><h3>Dana Syirkah Temporer (DST)</h3><span className="sub mono">bukan liabilitas · bukan ekuitas</span><div style={{ flex: 1 }} /><span className="tiny muted">Rp juta</span></div>
                  <table className="dtbl" style={{ width: '100%' }}>
                    <thead><tr><th style={{ textAlign: 'left' }}>Sumber dana</th><th style={{ textAlign: 'center', width: 90 }}>Nisbah</th><th style={{ textAlign: 'right', width: 110 }}>Saldo</th></tr></thead>
                    <tbody>
                      {sy.dst.map((d: any) => (
                        <tr key={d.id}><td style={{ fontWeight: 600, fontSize: 12 }}>{d.label}</td><td className="mono tiny" style={{ textAlign: 'center', color: 'var(--ink-2)' }}>{d.nisbah}</td><td className="mono" style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(d.amt)}</td></tr>
                      ))}
                    </tbody>
                    <tfoot><tr style={{ background: 'var(--surface-2)' }}><td colSpan={2} style={{ fontWeight: 700, color: 'var(--navy)' }}>Total DST</td><td className="mono" style={{ textAlign: 'right', fontWeight: 800, color: 'var(--navy)' }}>{fmt(sy.dstTotal)}</td></tr></tfoot>
                  </table>
                  <div className="tiny muted" style={{ padding: '9px 14px 12px', lineHeight: 1.5 }}>
                    DST mencerminkan dana nasabah berbasis akad <b>mudharabah</b>: pemilik dana menanggung risiko kerugian (kecuali kelalaian bank), sehingga tidak memenuhi definisi liabilitas maupun ekuitas → disajikan di antara keduanya (PSAK 101 ¶9).
                  </div>
                </Panel>
              </div>

              <div className="grid" style={{ gap: 12 }}>
                <Panel title="Komposisi Pembiayaan per Kelompok Akad" sub="Rp juta">
                  <div className="row gap12 ac">
                    <Donut segments={sy.byKel.map((k: any) => ({ label: k.kel, value: k.amt, color: (SY_KEL_COLOR as any)[k.kel] }))} size={104} thickness={15}
                      center={<><div className="mono" style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--navy)' }}>{fmt(Math.round(sy.pembiayaanBruto / 1000))}rb</div><div className="tiny muted">jt</div></>} />
                    <div style={{ flex: 1 }}>
                      {sy.byKel.map((k: any) => (
                        <div key={k.kel} className="row jb ac" style={{ padding: '4px 0' }}>
                          <span className="row ac gap6"><span style={{ width: 9, height: 9, borderRadius: 2, background: (SY_KEL_COLOR as any)[k.kel] }} /><span style={{ fontSize: 11.5, fontWeight: 600 }}>{k.kel}</span></span>
                          <span className="mono tiny" style={{ fontWeight: 700 }}>{fmt(k.amt)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Panel>

                <Panel title="Kerangka & Tata Kelola" sub="DSAS-IAI · DPS">
                  <div style={{ display: 'grid', gap: 8 }}>
                    <SYKv label="Kerangka pelaporan" v="SAK Syariah" />
                    <SYKv label="Penyusun standar" v="DSAS-IAI" />
                    <SYKv label="Pengawas kepatuhan" v={sy.dps.anggota + ' anggota DPS'} />
                    <SYKv label="Standar tercakup" v="PSAK 101–112" strong accent="var(--purple)" />
                  </div>
                  <div className="tiny muted" style={{ marginTop: 9, lineHeight: 1.5 }}>Kepatuhan syariah diawasi <b>Dewan Pengawas Syariah (DPS)</b> & fatwa DSN-MUI; auditor mempertimbangkannya sesuai SA 250 & SA 620.</div>
                </Panel>
              </div>
            </div>
          )}

          {/* ================= TAB · DAFTAR-UJI AKAD ================= */}
          {tab === 'akad' && (
            <div className="grid" style={{ gap: 12 }}>
              {sy.akad.map((a: any) => (
                <Panel key={a.id} noBody>
                  <div className="panel-h">
                    <h3>{a.akad}</h3>
                    <span className="sub mono">{a.psak}</span>
                    <div style={{ flex: 1 }} />
                    <Badge kind={(SY_KEL_KIND as any)[a.kel]}>{a.kel}</Badge>
                    <span className="mono" style={{ fontWeight: 700, color: 'var(--navy)', marginLeft: 10 }}>{fmt(a.pokok)} jt</span>
                  </div>
                  <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                    <div style={{ padding: '11px 14px', borderRight: '1px solid var(--line-soft)' }}>
                      <div className="tiny upper" style={{ fontWeight: 700, letterSpacing: '.04em', color: 'var(--ink-3)', marginBottom: 4 }}>Dasar Pengakuan</div>
                      <div style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--ink-2)' }}>{a.basis}</div>
                      <div className="tiny muted" style={{ marginTop: 7, lineHeight: 1.5 }}><b style={{ color: 'var(--ink-2)' }}>Penyajian:</b> {a.sajian}</div>
                      {a.marjin > 0 && <div className="mono tiny" style={{ marginTop: 6, color: 'var(--ink-3)' }}>Marjin/pendapatan ditangguhkan: {fmt(a.marjin)} jt</div>}
                    </div>
                    <div style={{ padding: '11px 14px' }}>
                      <div className="tiny upper" style={{ fontWeight: 700, letterSpacing: '.04em', color: 'var(--ink-3)', marginBottom: 4 }}>Fokus Audit</div>
                      <div className="row gap8" style={{ alignItems: 'flex-start' }}>
                        <span style={{ color: 'var(--blue)', marginTop: 1, flex: '0 0 auto' }}><I.search2 size={14} /></span>
                        <div style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--ink-2)' }}>{a.audit}</div>
                      </div>
                    </div>
                  </div>
                </Panel>
              ))}
              <div className="tiny muted" style={{ padding: '0 2px', lineHeight: 1.5 }}>
                Setiap akad memiliki substansi ekonomi & pola pengakuan berbeda. Prinsip utama audit: menguji <b>substansi syariah</b> (kepemilikan aset pada jual-beli, pembagian risiko pada bagi hasil) agar transaksi bukan pembiayaan berbunga yang dikemas sebagai akad syariah.
              </div>
            </div>
          )}

          {/* ================= TAB · BAGI HASIL & PEMURNIAN ================= */}
          {tab === 'bagihasil' && (
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }}>
              <Panel noBody>
                <div className="panel-h"><h3>Rekonsiliasi Pendapatan & Bagi Hasil</h3><span className="sub mono">PSAK 101 · revenue sharing</span><div style={{ flex: 1 }} /><span className="tiny muted">Rp juta</span></div>
                <table className="dtbl" style={{ width: '100%' }}>
                  <tbody>
                    <tr><td style={{ fontSize: 12 }}>Pendapatan marjin (murabahah/istishna)</td><td className="mono" style={{ textAlign: 'right' }}>{fmt(sy.bagiHasil.pendapatanMargin)}</td></tr>
                    <tr><td style={{ fontSize: 12 }}>Pendapatan bagi hasil (mudharabah/musyarakah)</td><td className="mono" style={{ textAlign: 'right' }}>{fmt(sy.bagiHasil.pendapatanPengelolaan - sy.bagiHasil.pendapatanMargin - sy.bagiHasil.pendapatanSewa)}</td></tr>
                    <tr><td style={{ fontSize: 12 }}>Pendapatan sewa (ijarah)</td><td className="mono" style={{ textAlign: 'right' }}>{fmt(sy.bagiHasil.pendapatanSewa)}</td></tr>
                    <tr style={{ background: 'var(--surface-2)' }}><td style={{ fontWeight: 700, color: 'var(--navy)', fontSize: 12 }}>Pendapatan pengelolaan dana (mudharib)</td><td className="mono" style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(sy.bagiHasil.pendapatanPengelolaan)}</td></tr>
                    <tr><td style={{ fontSize: 12 }}>Hak pihak ketiga atas bagi hasil DST</td><td className="mono" style={{ textAlign: 'right', color: 'var(--red)' }}>({fmt(sy.bagiHasil.hakPihakKetiga)})</td></tr>
                  </tbody>
                  <tfoot><tr style={{ background: 'var(--surface-2)' }}><td style={{ fontWeight: 800, color: 'var(--navy)' }}>Hak bank (pendapatan neto)</td><td className="mono" style={{ textAlign: 'right', fontWeight: 800, color: 'var(--navy)' }}>{fmt(sy.bagiHasil.hakBank)}</td></tr></tfoot>
                </table>
                <div className="tiny muted" style={{ padding: '9px 14px 12px', lineHeight: 1.5 }}>
                  Pendapatan yang dapat dibagihasilkan dialokasikan ke pemilik <b>Dana Syirkah Temporer</b> sesuai nisbah akad, sisanya menjadi hak bank. Distribusi mengikuti prinsip <b>profit-loss sharing</b>, bukan bunga tetap.
                </div>
              </Panel>

              <Panel noBody>
                <div className="panel-h"><h3>Pemurnian Pendapatan Non-Halal</h3><span className="sub mono">income purification</span><div style={{ flex: 1 }} /><span className="tiny muted">Rp juta</span></div>
                <table className="dtbl" style={{ width: '100%' }}>
                  <thead><tr><th style={{ textAlign: 'left' }}>Sumber dana kebajikan</th><th style={{ textAlign: 'center', width: 80 }}>Status</th><th style={{ textAlign: 'right', width: 80 }}>Nilai</th></tr></thead>
                  <tbody>
                    {sy.kebajikan.sumber.map((s: any, i: any) => (
                      <tr key={i}>
                        <td style={{ fontSize: 12 }}>{s.k}</td>
                        <td style={{ textAlign: 'center' }}>{s.purif ? <Badge kind="amber">Pemurnian</Badge> : s.halal ? <Badge kind="green">Halal</Badge> : <Badge kind="teal">Non-pokok</Badge>}</td>
                        <td className="mono" style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(s.v)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="panel" style={{ margin: '11px 14px 12px', padding: '10px 12px', background: 'var(--amber-bg)', borderColor: 'transparent' }}>
                  <div className="row gap8" style={{ alignItems: 'flex-start' }}>
                    <span style={{ color: 'var(--amber)', marginTop: 1 }}><I.alert size={15} /></span>
                    <div style={{ fontSize: 11.5, lineHeight: 1.5 }}>Pendapatan non-halal <b>{fmt(sy.purif)} jt</b> (mis. jasa giro bank konvensional) <b>tidak boleh</b> diakui sebagai pendapatan bank — dipisahkan ke <b>dana kebajikan</b> & disalurkan untuk kemaslahatan umum. Auditor menguji kelengkapan identifikasi & pemisahannya.</div>
                  </div>
                </div>
              </Panel>
            </div>
          )}

          {/* ================= TAB · ZAKAT & KEBAJIKAN ================= */}
          {tab === 'zis' && (
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }}>
              <SYSourceUse title="Laporan Sumber & Penyaluran Dana Zakat" sub="PSAK 109" sumberLbl="Sumber dana zakat" pakaiLbl="Penyaluran kepada 8 asnaf"
                sumber={sy.zakat.sumber} penggunaan={sy.zakat.penyaluran} saldoAwal={sy.zakat.saldoAwal} fmt={fmt} />
              <div className="grid" style={{ gap: 12 }}>
                <SYSourceUse title="Laporan Sumber & Penggunaan Dana Kebajikan" sub="PSAK 101 · Qardhul Hasan" sumberLbl="Sumber dana kebajikan" pakaiLbl="Penggunaan dana kebajikan"
                  sumber={sy.kebajikan.sumber} penggunaan={sy.kebajikan.penggunaan} saldoAwal={sy.kebajikan.saldoAwal} fmt={fmt}
                  renderRow={(s: any) => <span>{s.k}{s.purif && <span className="mono tiny" style={{ color: 'var(--amber)', marginLeft: 6 }}>pemurnian</span>}</span>} />
                <Panel title="Catatan PSAK 109" sub="zakat, infak & sedekah">
                  <div className="tiny" style={{ color: 'var(--ink-2)', lineHeight: 1.6 }}>
                    Dana zakat & dana kebajikan dikelola <b>terpisah</b> dari aset operasional bank dan <b>bukan</b> bagian laba rugi. Zakat entitas dihitung atas dasar yang ditetapkan (mis. <i>net invested funds</i>) dan disalurkan kepada delapan golongan (asnaf) yang berhak.
                  </div>
                </Panel>
              </div>
            </div>
          )}

          {/* ================= TAB · SUKUK · WAKAF · TAKAFUL ================= */}
          {tab === 'sukuk' && (
            <div className="grid" style={{ gridTemplateColumns: '1fr 332px', gap: 12, alignItems: 'start' }}>
              <div className="grid" style={{ gap: 12 }}>
                <Panel noBody>
                  <div className="panel-h"><h3>Sukuk</h3><span className="sub mono">PSAK 110</span><div style={{ flex: 1 }} /><span className="tiny muted">Rp juta</span></div>
                  <table className="dtbl" style={{ width: '100%' }}>
                    <thead><tr><th style={{ textAlign: 'left' }}>Instrumen</th><th style={{ textAlign: 'center', width: 90 }}>Sisi</th><th style={{ textAlign: 'right', width: 100 }}>Nilai</th></tr></thead>
                    <tbody>
                      {sy.sukuk.map((s: any) => (
                        <tr key={s.id}>
                          <td><div style={{ fontSize: 12.5, fontWeight: 600 }}>{s.label}</div><div className="tiny muted" style={{ lineHeight: 1.4 }}>{s.note}</div></td>
                          <td style={{ textAlign: 'center' }}><Badge kind={s.sisi === 'Aset' ? 'blue' : 'amber'}>{s.sisi}</Badge></td>
                          <td className="mono" style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(s.amt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="tiny muted" style={{ padding: '9px 14px 12px', lineHeight: 1.5 }}>Sukuk berbasis aset/usaha riil; imbalan berupa <b>bagi hasil / ujrah</b>, bukan bunga. Klasifikasi (biaya perolehan vs nilai wajar) mengikuti model bisnis & tujuan kepemilikan.</div>
                </Panel>
              </div>

              <div className="grid" style={{ gap: 12 }}>
                <Panel title="Wakaf (PSAK 112)" sub="bank sebagai nazhir">
                  <div style={{ display: 'grid', gap: 8 }}>
                    <SYKv label="Aset wakaf dikelola (CWLS)" v={fmt(sy.wakaf.aset) + ' jt'} strong accent="var(--teal)" />
                  </div>
                  <div className="tiny muted" style={{ marginTop: 9, lineHeight: 1.5 }}>{sy.wakaf.note}</div>
                </Panel>

                <Panel title="Asuransi Syariah (PSAK 108)" sub="takaful · dana tabarru'">
                  <div className="panel" style={{ padding: '10px 12px', background: 'var(--surface-2)', borderColor: 'var(--line)' }}>
                    <div className="row gap8" style={{ alignItems: 'flex-start' }}>
                      <span style={{ color: 'var(--ink-4)', marginTop: 1 }}><I.shield size={15} /></span>
                      <div className="tiny" style={{ lineHeight: 1.55, color: 'var(--ink-2)' }}>{sy.takaful.note}</div>
                    </div>
                  </div>
                </Panel>

                <Panel title="Cakupan Standar" sub="PSAK 101–112">
                  <div className="row gap6" style={{ flexWrap: 'wrap' }}>
                    {['101','102','103','104','105','106','107','108','109','110','111','112'].map(n => (
                      <span key={n} className="mono tiny" style={{ padding: '4px 8px', borderRadius: 6, background: 'var(--purple-bg)', color: 'var(--purple)', fontWeight: 700 }}>{n}</span>
                    ))}
                  </div>
                  <div className="tiny muted" style={{ marginTop: 9, lineHeight: 1.5 }}>Modul mencakup penyajian (101), akad (102–107), takaful (108), zakat (109), sukuk (110), wa'd (111) & wakaf (112).</div>
                </Panel>
              </div>
            </div>
          )}

          {/* ================= TAB · AUDIT & DPS ================= */}
          {tab === 'audit' && (
            <div className="grid" style={{ gridTemplateColumns: '1fr 332px', gap: 12, alignItems: 'start' }}>
              <Panel noBody>
                <div className="panel-h"><h3>Prosedur Audit — Entitas Syariah</h3><div style={{ flex: 1 }} /><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--navy)' }}>{doneCount}/{sy.proc.length}</span></div>
                <div className="row gap8" style={{ padding: '10px 14px', alignItems: 'flex-start', background: 'var(--blue-050)' }}>
                  <span style={{ color: 'var(--blue)', marginTop: 1 }}><I.target size={15} /></span>
                  <div style={{ fontSize: 11.5, lineHeight: 1.5 }}>Audit menguji <b>substansi akad</b>, penyajian Dana Syirkah Temporer, kelengkapan dana zakat & kebajikan, serta <b>pemurnian</b> pendapatan non-halal. Kepatuhan prinsip syariah dipertimbangkan via opini DPS (SA 250 & SA 620).</div>
                </div>
                <div>
                  {sy.proc.map((p: any, i: any) => {
                    const key = p.ref + i;
                    const isOn = !!done[key];
                    return (
                      <label key={key} className="row gap10" style={{ padding: '9px 14px', cursor: 'pointer', alignItems: 'flex-start', borderBottom: i < sy.proc.length - 1 ? '1px solid var(--line-soft)' : 0 }} onClick={() => toggle(key)}>
                        <span style={{ flex: '0 0 16px', width: 16, height: 16, borderRadius: 4, marginTop: 1, border: '1.5px solid ' + (isOn ? 'var(--green)' : 'var(--line-strong)'), background: isOn ? 'var(--green)' : '#fff', display: 'grid', placeItems: 'center' }}>{isOn && <I.check size={11} style={{ color: '#fff' }} />}</span>
                        <span className="mono tiny" style={{ fontWeight: 700, color: 'var(--navy)', width: 78, flex: '0 0 78px', marginTop: 1 }}>{p.ref}</span>
                        <span style={{ fontSize: 12, lineHeight: 1.4, color: isOn ? 'var(--ink-3)' : 'var(--ink)', textDecoration: isOn ? 'line-through' : 'none' }}>{p.t}</span>
                      </label>
                    );
                  })}
                </div>
              </Panel>

              <div className="grid" style={{ gap: 12 }}>
                <Panel noBody>
                  <div style={{ background: 'linear-gradient(120deg,#3a2a6b,#5b3fa6)', color: '#fff', padding: '14px 16px' }}>
                    <div className="tiny upper" style={{ color: '#d6cdf0', letterSpacing: '.05em', marginBottom: 8 }}>Kemajuan Audit Syariah</div>
                    <div className="row ac gap12">
                      <div style={{ fontSize: 34, fontWeight: 800, lineHeight: 1, fontFamily: 'JetBrains Mono, monospace' }}>{score}<span style={{ fontSize: 18 }}>%</span></div>
                      <div style={{ flex: 1 }}>
                        <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,.18)', overflow: 'hidden' }}><span style={{ display: 'block', height: '100%', width: score + '%', background: score === 100 ? '#4ade80' : '#c9b6ff', borderRadius: 4, transition: '.3s' }} /></div>
                        <div className="tiny" style={{ color: '#d6cdf0', marginTop: 6 }}>{doneCount}/{sy.proc.length} prosedur selesai</div>
                      </div>
                    </div>
                  </div>
                  <div style={{ padding: 14 }}>
                    <div className="tiny upper" style={{ fontWeight: 700, letterSpacing: '.04em', color: 'var(--ink-3)', marginBottom: 8 }}>Opini Dewan Pengawas Syariah</div>
                    <div style={{ display: 'grid', gap: 7 }}>
                      {sy.dps.temuan.map((t: any, i: any) => (
                        <div key={i} className="row gap8" style={{ alignItems: 'flex-start' }}>
                          <span style={{ color: t.ok ? 'var(--green)' : 'var(--amber)', marginTop: 1, flex: '0 0 auto' }}>{t.ok ? <I.checkCircle size={14} /> : <I.alert size={14} />}</span>
                          <span style={{ fontSize: 11.5, lineHeight: 1.45, color: t.ok ? 'var(--ink-2)' : 'var(--ink)' }}>{t.t}</span>
                        </div>
                      ))}
                    </div>
                    <div className="panel" style={{ marginTop: 11, padding: '9px 11px', background: sy.dpsPct === 100 ? 'var(--green-bg)' : 'var(--amber-bg)', borderColor: 'transparent' }}>
                      <div style={{ fontSize: 11.5, lineHeight: 1.5 }}><b>Opini DPS:</b> {sy.dps.opini} — {sy.dpsOk}/{sy.dps.temuan.length} butir terpenuhi.</div>
                    </div>
                  </div>
                </Panel>

                <Panel noBody>
                  <div className="panel-h"><h3>Keterkaitan Kertas Kerja</h3><span className="sub mono">lineage data</span></div>
                  <div className="row ac gap6" style={{ padding: '9px 14px 4px' }}><I.arrowRight size={13} style={{ color: 'var(--blue)' }} /><span className="tiny upper" style={{ fontWeight: 700, letterSpacing: '.04em', color: 'var(--ink-3)' }}>Hulu — sumber data</span></div>
                  <div style={{ display: 'grid', gap: 6, padding: '2px 12px 10px' }}>
                    {sy.upstream.map((m: any) => { const IconC = (I as any)[m.ic] || I.doc; return (
                      <button key={m.id} onClick={() => nav(m.id, { from: 'syariah' })} className="row ac gap9" style={{ padding: '8px 10px', borderRadius: 7, border: '1px solid var(--line)', borderLeft: '3px solid var(--blue)', background: 'var(--surface)', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                        <span style={{ color: 'var(--blue)', flex: '0 0 auto' }}><IconC size={15} /></span>
                        <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12, fontWeight: 600 }}>{m.lbl}</div><div className="tiny muted" style={{ lineHeight: 1.35 }}>{m.rel}</div></div>
                        <I.arrowRight size={13} style={{ color: 'var(--ink-4)', flex: '0 0 auto' }} />
                      </button>
                    ); })}
                  </div>
                  <div className="row ac gap6" style={{ padding: '4px 14px 4px', borderTop: '1px solid var(--line-soft)' }}><I.arrowRight size={13} style={{ color: 'var(--green)' }} /><span className="tiny upper" style={{ fontWeight: 700, letterSpacing: '.04em', color: 'var(--ink-3)' }}>Hilir — pengguna angka</span></div>
                  <div style={{ display: 'grid', gap: 6, padding: '2px 12px 12px' }}>
                    {sy.downstream.map((m: any) => { const IconC = (I as any)[m.ic] || I.doc; return (
                      <button key={m.id} onClick={() => nav(m.id, { from: 'syariah' })} className="row ac gap9" style={{ padding: '8px 10px', borderRadius: 7, border: '1px solid var(--line)', borderLeft: '3px solid var(--green)', background: 'var(--surface)', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                        <span style={{ color: 'var(--green)', flex: '0 0 auto' }}><IconC size={15} /></span>
                        <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12, fontWeight: 600 }}>{m.lbl}</div><div className="tiny muted" style={{ lineHeight: 1.35 }}>{m.rel}</div></div>
                        <I.arrowRight size={13} style={{ color: 'var(--ink-4)', flex: '0 0 auto' }} />
                      </button>
                    ); })}
                  </div>
                </Panel>
              </div>
            </div>
          )}

          {/* ================= TAB · KERTAS KERJA S-1 ================= */}
          {tab === 'kk' && (
            <div style={{ paddingBottom: 6 }}>
              <SYWorkPaper sy={sy} fmt={fmt} rp={rp} nav={nav} />
            </div>
          )}

          <div className="tiny muted" style={{ padding: '0 2px 4px', lineHeight: 1.5 }}>
            Kertas kerja ini menelusuri entitas syariah <b>{sy.client.name}</b> ({sy.client.sector}) terhadap <b>SAK Syariah (PSAK 101–112)</b> — dari penyajian LK syariah & Dana Syirkah Temporer (PSAK 101), daftar-uji per akad (PSAK 102–107), bagi hasil & pemurnian pendapatan non-halal, dana zakat (PSAK 109) & dana kebajikan, sukuk/wakaf/takaful (PSAK 108/110/112), hingga audit & kepatuhan syariah (DPS) dengan pertimbangan SA 250/540/620 & Kertas Kerja S-1. Seluruh angka ditarik dari satu sumber kebenaran (AMS_CANON.syariah). Tab & status tersimpan otomatis untuk jejak audit.
          </div>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { SyariahView });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { SyariahView };
