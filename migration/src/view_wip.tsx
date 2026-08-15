import React from 'react';
import { AMS } from './data';
import { useAmsPersist, useAudit, useAuth, useInitialSelection, useInitialTab, useNav } from './contexts';
import { CAP } from './rbac';
import { I } from './icons';
import { SubBar } from './shell';
import { Btn, Panel, Stat, Tabs } from './ui';
import { amsExportXlsx } from './export_xlsx';
import { WIP_WRITEOFF_APPROVAL_MIN } from './data_firmfin';
import { useFirmWip } from './use_firm_wip';
import {
  WipDetailPanel, WipPemulihanTab, WipRealisasiTab, WipRegisterTable, WipSumberTab,
  wipByPartner, wipMarginColor, wipRealColor,
} from './view_wip_parts';

/* ============================================================
   Asseris — WIP · Valuasi & Realisasi (route `wip`)

   Peleburan dua modul yang menyajikan SATU sub-buku: `wip` (WIP · Valuasi,
   dulu di view_firmfinance) + `wipreal` (WIP · Realisasi, dulu view_wip_firm).
   Keduanya sudah memanggil mesin yang sama (`FIRMFIN.wip` lewat `useFirmWip`),
   tetapi menduplikasi tabel register, panel waterfall, donut realisasi, aging
   dan ekspor — lalu saling menaut dengan tombol "buka yang satunya".
   Rujukan: docs/prd-wip-merge-valuasi-realisasi.md (Q-1=`wip`, Q-2=Operasi
   Praktik, Q-3=Opsi A).

   SUMBER KEBENARAN: `useFirmWip(provFactor)` → `FIRMFIN.wip(ctx, provFactor,
   liveByEng, adj)`. Berkas ini TIDAK menghitung ulang apa pun — termasuk
   write-down manual, yang kini masuk di hulu (`wip.adj`) sehingga Dashboard,
   cockpit Beranda, Firm Finance dan ekspor melihat angka yang sama.
   ============================================================ */
const { useState: useStateWip, useMemo: useMemoWip } = React;

type Fmt = (v: number, d?: number) => string;

function WIPModule() {
  const { fmt } = AMS as unknown as { fmt: Fmt };
  const nav = useNav();
  const [tab, setTab] = useInitialTab('wip', 'valuasi') as [string, (v: string) => void];
  const [sel, setSel] = useStateWip(useInitialSelection('wip')) as [string | null, (v: string | null) => void];
  const [view, setView] = useStateWip('Perikatan');
  const [provFactor, setProvFactor] = useAmsPersist('wip.provFactor', 1) as [number, (v: number) => void];
  const [wdAmt, setWdAmt] = useStateWip(25_000_000);
  const [exporting, setExporting] = useStateWip(false);

  const auth = useAuth();
  const canEdit = !!(auth && typeof auth.can === 'function' && auth.can(CAP.FIRMFIN_EDIT));
  const { logActivity } = useAudit();
  const who = (AMS.USER && AMS.USER.name) || 'Pengguna';

  const { wip: W, liveByEng, adj, setAdj } = useFirmWip(provFactor);

  const jt: Fmt = (v, d = 0) => fmt(v / 1e6, d);
  const M: Fmt = (v, d = 2) => fmt(v / 1e9, d);
  const pc: Fmt = (v, d = 0) => fmt(v * 100, d) + '%';

  const selRow = sel ? W.registerAll.find((r) => r.id === sel) || null : null;

  const tabs = useMemoWip(() => [
    { id: 'valuasi', label: 'Valuasi Perikatan' },
    { id: 'realisasi', label: 'Realisasi & Margin' },
    { id: 'pemulihan', label: 'Pemulihan & Penyisihan' },
    { id: 'sumber', label: 'Mutasi & Sumber Kebenaran', count: W.movement.length + W.bridge.length },
  ], [W.movement.length, W.bridge.length]);

  /* Write-down manual — MENULIS `wip.adj` lewat setter milik useFirmWip, jadi
     tak ada salinan state kedua yang bisa menyimpang dari pembaca lain. */
  const applyWriteDown = () => {
    if (!canEdit || !selRow || wdAmt <= 0) return;
    const id = selRow.id;
    setAdj((a) => ({ ...a, [id]: (a[id] || 0) + wdAmt }));
    if (logActivity) logActivity({ who, action: 'WIP_WRITEDOWN', detail: `Write-down ${id} +Rp ${fmt(wdAmt / 1e6, 0)} jt` });
  };
  const resetWriteDown = () => {
    if (!canEdit || !selRow) return;
    const id = selRow.id;
    setAdj((a) => { const n = { ...a }; delete n[id]; return n; });
    if (logActivity) logActivity({ who, action: 'WIP_WRITEDOWN', detail: `Write-down manual ${id} direset` });
  };

  const openValuationRow = (id: string) => { setTab('valuasi'); setSel(id); };

  /* Satu ekspor menggantikan dua (dulu "Valuasi WIP Perikatan.xlsx" +
     "Laporan WIP & Realisasi.xlsx" dari register yang sama). */
  const onExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const valuasi: (string | number)[][] = W.registerAll.map((r) => [
        r.id, r.clientShort, r.partner, jt(r.std), jt(r.writeUp - r.writeDown), jt(r.recoverable),
        r.billed ? jt(r.billed) : '—', jt(r.unbilled), r.age + 'h', pc(r.realization), pc(r.margin),
      ]);
      const partnerRows: (string | number)[][] = wipByPartner(W.registerAll).map((p) => [
        p.partner, p.n, jt(p.std), jt(p.wip), pc(p.realization), pc(p.margin),
      ]);
      await amsExportXlsx({
        kind: 'firm-wip', scope: 'firm',
        fileName: 'WIP — Valuasi & Realisasi.xlsx',
        firm: 'KAP Wijaya Hartono & Rekan',
        title: 'Sub-buku WIP per Perikatan — Valuasi & Realisasi',
        meta: [
          `WIP belum ditagih Rp ${M(W.unbilledTotal)} M · recoverable neto Rp ${M(W.netRecoverable)} M · realisasi ${pc(W.avgRealization)} · penyisihan ${pc(W.provisionPct, 1)}`,
          `Write-down total Rp ${jt(W.totWriteDown)} jt (manual Rp ${jt(W.totManualWriteDown)} jt) · nilai dalam Rp juta`,
        ],
        sheets: [
          {
            name: 'Valuasi WIP', heading: 'Valuasi per perikatan (Rp juta)',
            columns: ['Perikatan', 'Klien', 'Partner', 'Nilai Standar', 'Penyesuaian', 'Recoverable', 'Difakturkan', 'WIP', 'Umur', 'Realisasi', 'Margin'],
            rows: valuasi,
            totals: ['TOTAL', `${W.registerAll.length} perikatan`, '', jt(W.totStd), jt(W.totWriteUp - W.totWriteDown), jt(W.totRecoverable), jt(W.totBilled), jt(W.unbilledTotal), '', pc(W.avgRealization), pc(W.avgMargin)],
            colWidths: [14, 24, 16, 14, 12, 14, 12, 12, 8, 10, 10],
          },
          {
            name: 'Realisasi per Partner', heading: 'Realisasi & margin per partner (Rp juta)',
            columns: ['Partner', 'Perikatan', 'Nilai Standar', 'Saldo WIP', 'Realisasi', 'Margin'],
            rows: partnerRows,
            totals: ['TOTAL', W.registerAll.length, jt(W.totStd), jt(W.unbilledTotal), pc(W.avgRealization), pc(W.avgMargin)],
            colWidths: [22, 12, 15, 14, 12, 12],
          },
        ],
      });
    } finally {
      setExporting(false);
    }
  };

  /* Ambang otorisasi terlampaui → beri tahu di layar tempat tindakannya
     dilakukan, bukan hanya di modul Approvals. */
  const pendingApproval = useMemoWip(
    () => W.registerAll.filter((r) => r.manualWriteDown >= WIP_WRITEOFF_APPROVAL_MIN),
    [W.registerAll]);

  return (
    <>
      <SubBar moduleId="wip" right={
        <div className="row gap8 ac">
          {liveByEng && <span className="chip tiny" style={{ background: 'var(--green-bg)', color: 'var(--green)', cursor: 'pointer' }} title="Nilai standar engagement aktif ditarik dari jam aktual Time & Budget (live)" onClick={() => nav('time', { from: 'wip' })}><I.clock size={11} /> Sinkron T&B</span>}
          <span className="chip tiny" title="Seluruh angka ditarik dari sub-buku WIP_ENG → kontrol GL 1-300"><I.link2 size={11} /> Satu sumber kebenaran</span>
          <Btn sm onClick={() => nav('firmfinance', { from: 'wip' })}><I.table size={13} /> Kontrol GL 1-300</Btn>
          <Btn sm onClick={onExport} disabled={exporting}><I.download size={13} /> {exporting ? 'Menyiapkan…' : 'Export WIP'}</Btn>
          <Btn sm variant="primary" onClick={() => nav('billing', { from: 'wip' })}><I.receipt size={14} /> Buat Tagihan</Btn>
        </div>
      } />
      <div className="view-scroll"><div className="view-pad">
        {/* headline KPI — semua diturunkan dari FIRMFIN.wip() */}
        <div className="grid" style={{ gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginBottom: 12 }}>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={'Rp ' + M(W.unbilledTotal) + ' M'} label="Saldo WIP Belum Ditagih" accent="var(--blue)" /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={'Rp ' + M(W.netRecoverable) + ' M'} label="Nilai Dapat Dipulihkan Neto" accent="var(--green)" /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={pc(W.avgRealization)} label="Realisasi Rata-rata" accent={wipRealColor(W.avgRealization)} /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={pc(W.avgMargin)} label="Margin Rata-rata" accent={wipMarginColor(W.avgMargin)} /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={'Rp ' + jt(W.provisionTotal) + ' jt'} label={'Penyisihan WIP · ' + pc(W.provisionPct, 1)} accent="var(--red)" /></div></Panel>
        </div>

        {pendingApproval.length > 0 && (
          <div className="panel" style={{ padding: '9px 12px', background: 'var(--amber-bg)', borderColor: 'transparent', marginBottom: 12 }}>
            <div className="row jb ac gap8">
              <div className="tiny" style={{ fontWeight: 600, lineHeight: 1.5 }}>
                <I.alert size={11} /> {pendingApproval.length} write-down manual ≥ Rp {jt(WIP_WRITEOFF_APPROVAL_MIN)} jt menunggu otorisasi Audit Manager → Managing Partner.
              </div>
              <Btn sm onClick={() => nav('approvals', { from: 'wip' })}><I.checkCircle size={13} /> Buka Approvals</Btn>
            </div>
          </div>
        )}

        <Panel noBody>
          <div className="panel-h" style={{ padding: 0, background: 'var(--surface-2)' }}><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>
          <div style={{ padding: 14 }}>

            {tab === 'valuasi' && (
              <div className="grid" style={{ gridTemplateColumns: selRow ? '1fr 360px' : '1fr', gap: 12, alignItems: 'start' }}>
                <WipRegisterTable W={W} jt={jt} pc={pc} sel={sel} onSelect={setSel} />
                {selRow && <WipDetailPanel r={selRow} jt={jt} pc={pc} nav={nav} onClose={() => setSel(null)}
                  canEdit={canEdit} wdAmt={wdAmt} setWdAmt={setWdAmt}
                  onWriteDown={applyWriteDown} onReset={resetWriteDown} />}
              </div>
            )}

            {tab === 'realisasi' && (
              <WipRealisasiTab W={W} jt={jt} pc={pc} view={view} setView={setView}
                onOpenRow={openValuationRow} nav={nav} />
            )}

            {tab === 'pemulihan' && (
              <WipPemulihanTab W={W} jt={jt} pc={pc} provFactor={provFactor} setProvFactor={setProvFactor} />
            )}

            {tab === 'sumber' && <WipSumberTab W={W} jt={jt} nav={nav} />}

          </div>
        </Panel>

        {Object.keys(adj).length > 0 && (
          <div className="tiny muted" style={{ marginTop: 10, lineHeight: 1.5 }}>
            {Object.keys(adj).length} perikatan membawa write-down manual (total Rp {jt(W.totManualWriteDown)} jt) di atas sub-buku. Nilai ini sudah tercermin di Dashboard, Beranda, Firm Finance &amp; ekspor.
          </div>
        )}
      </div></div>
    </>
  );
}

export { WIPModule };
