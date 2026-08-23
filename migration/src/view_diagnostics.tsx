/* [codemod] ESM imports */
import React from 'react';
import { I } from './icons';
import { SubBar } from './shell';
import { Panel, Stat } from './ui';
import { DiagnosticPanel, diagSevCount, useDiagnosticState } from './diagnostics_panel';

/* ============================================================
   Asseris — Tax Audit Diagnostic (view agregat · P4 Fase 1)
   Ringkasan + seluruh temuan dari mesin DETERMINISTIK amsDiagnostics.

   View ini TIDAK menghitung apa pun sendiri: sebaran severity dari
   `diagSevCount`, keadaan detektor dari `useDiagnosticState` (yang merakit ctx
   perikatan lewat `engagementDiagInputs`).

   Kartu keempat dulu berbunyi `Object.keys(byDetector).length` di bawah label
   "Detektor aktif" — yaitu jumlah detektor yang MENGHASILKAN temuan, bukan yang
   berjalan. Detektor yang berjalan-dan-bersih dan detektor yang tak dapat
   berjalan sama-sama tak terhitung, sehingga keduanya tampak identik: angka yang
   lebih kecil. Untuk modul diagnostik justru sebaliknya — "berjalan & bersih"
   adalah informasi asurans, dan "tidak dapat berjalan" adalah peringatan.

   Kartu "Severity rendah" juga bukan penambahan hiasan: `c.low` sudah dihitung
   sejak awal lalu dibuang, padahal di dalamnya ada `benford-insufficient` —
   temuan yang memberi tahu auditor bahwa pengujiannya TIDAK konklusif.
   ============================================================ */
function TaxAuditDiagnostic() {
  const { findings, statuses, summary } = useDiagnosticState();
  const c = diagSevCount(findings);
  const takBerjalan = statuses.filter((d) => d.state === 'unavailable');

  return (
    <>
      <SubBar moduleId="diagnostic" right={
        <span className="tiny muted">Deterministik · SA 240 · PSAK 46</span>
      } />
      <div className="view-scroll">
        <div className="view-pad" style={{ display: 'grid', gap: 12 }}>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(5,1fr)', gap: 12 }}>
            <Panel><div style={{ padding: '15px 18px' }}><Stat value={findings.length} label="Total temuan" /></div></Panel>
            <Panel><div style={{ padding: '15px 18px' }}><Stat value={c.high} label="Severity tinggi" accent="var(--red)" /></div></Panel>
            <Panel><div style={{ padding: '15px 18px' }}><Stat value={c.med} label="Severity sedang" accent="var(--amber)" /></div></Panel>
            <Panel><div style={{ padding: '15px 18px' }}><Stat value={c.low} label="Severity rendah" accent="var(--blue)" /></div></Panel>
            <Panel>
              <div style={{ padding: '15px 18px' }}
                title={`${summary.found} menemukan · ${summary.clean} berjalan & bersih · ${summary.unavailable} tidak dapat berjalan`}>
                <Stat value={`${summary.ran}/${summary.total}`} label="Detektor berjalan"
                  accent={summary.unavailable ? 'var(--amber)' : undefined} />
              </div>
            </Panel>
          </div>

          {takBerjalan.length > 0 && (
            <div className="tiny" style={{ color: 'var(--amber)', display: 'flex', alignItems: 'flex-start', gap: 6, lineHeight: 1.5 }}>
              <I.alert size={12} style={{ flex: '0 0 auto', marginTop: 2 }} />
              <span>
                <b>{takBerjalan.length} detektor tidak dapat berjalan</b> — {takBerjalan.map((d) => d.label).join(' · ')}.
                Nol temuan dari detektor itu <b>bukan simpulan</b>: masukannya tidak ada. {takBerjalan[0].reason}
              </span>
            </div>
          )}

          <div className="tiny muted" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <I.alert size={12} /> Temuan dihitung dari data kanonik perikatan aktif (aturan + statistik), bukan model bahasa. Tiap temuan adalah <strong>usulan</strong> — auditor memutuskan tindak lanjut.
          </div>

          <DiagnosticPanel title="Seluruh Temuan Diagnostik" />
        </div>
      </div>
    </>
  );
}


export { TaxAuditDiagnostic };
