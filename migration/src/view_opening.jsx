/* [codemod] ESM imports */
import React from 'react';
import { useAudit } from './contexts.jsx';
import { I } from './icons.jsx';
import { SubBar } from './shell.jsx';
import { Badge, Btn, Panel, Tabs } from './ui.jsx';
import { KvBox } from './view_analytical.jsx';

/* ============================================================
   NeoSuite AMS — Opening Balance / Saldo Awal (SA 510)
   Deep workpaper: konteks perikatan, penelusuran saldo awal,
   prosedur spesifik, konsistensi kebijakan, dampak opini.
   ============================================================ */
const { useState: useStateOPN } = React;

/* ---- static reference data ---- */
const OB_TRANSITION = { '1-2300': 13_100_000_000, '2-1500': -3_050_000_000, '2-2200': -10_050_000_000 };
const OB_SOFP_GROUPS = ['Aset Lancar', 'Aset Tidak Lancar', 'Liabilitas Jk. Pendek', 'Liabilitas Jk. Panjang', 'Ekuitas'];

const OB_SPECIFIC = [
  { id: 'C', acct: 'Persediaan', lead: 'C', assertion: 'Keberadaan · Penilaian', risk: 'Signifikan',
    proc: 'Telaah hasil stock opname & valuasi persediaan akhir TA-1, lalu uji roll-back pergerakan ke saldo awal TA kini. Bandingkan metode kos (rata-rata tertimbang) antar-periode.',
    evidence: 'KKP auditor TA lalu C-1…C-4; Berita Acara Opname 28 Des 2024; rekap mutasi Jan 2025', result: 'Memadai', wp: 'C(OB)' },
  { id: 'B', acct: 'Piutang Usaha & CKPN', lead: 'B', assertion: 'Keberadaan · Penilaian', risk: 'Signifikan',
    proc: 'Telaah konfirmasi & aging schedule TA-1; uji penerimaan kas subsequent atas saldo awal piutang; evaluasi dasar CKPN (PSAK 71) pembukaan.',
    evidence: 'Konfirmasi B-2 TA lalu; mutasi penerimaan Jan–Mar 2025; model ECL pembukaan', result: 'Memadai', wp: 'B(OB)' },
  { id: 'E', acct: 'Aset Tetap & Akm. Penyusutan', lead: 'E', assertion: 'Keberadaan · Hak', risk: 'Moderat',
    proc: 'Rekonsiliasi register aset tetap ke saldo awal harga perolehan & akumulasi penyusutan; uji eksistensi sampel aset material; verifikasi kebijakan & umur ekonomis konsisten.',
    evidence: 'Register aset tetap audited TA-1; KKP E-1/E-3; bukti kepemilikan sampel', result: 'Memadai', wp: 'E(OB)' },
  { id: 'F', acct: 'Aset Hak-Guna & Liabilitas Sewa', lead: 'F', assertion: 'Kelengkapan · Penilaian', risk: 'Signifikan',
    proc: 'Evaluasi perhitungan penerapan awal PSAK 73 per 1 Jan 2025 (identifikasi sewa, masa sewa, tingkat diskonto inkremental). Saldo awal timbul dari transisi — bukan dibawa dari TA-1.',
    evidence: 'Memo transisi PSAK 73; daftar kontrak sewa; perhitungan present value', result: 'Dalam Proses', wp: 'F(OB)' },
  { id: 'H', acct: 'Liabilitas Imbalan Kerja', lead: 'H', assertion: 'Penilaian', risk: 'Moderat',
    proc: 'Telaah laporan aktuaria pembukaan & kewajaran asumsi (tingkat diskonto, kenaikan gaji, mortalita) dibanding TA-1; verifikasi kontinuitas saldo.',
    evidence: 'Laporan aktuaria 31 Des 2024 (audited); rekonsiliasi liabilitas', result: 'Memadai', wp: 'H(OB)' },
];

const OB_POLICY = [
  { area: 'Penilaian persediaan', prior: 'Rata-rata tertimbang', cur: 'Rata-rata tertimbang', ok: true },
  { area: 'Penyusutan aset tetap', prior: 'Garis lurus', cur: 'Garis lurus', ok: true },
  { area: 'Pengakuan pendapatan', prior: 'PSAK 72 (5 langkah)', cur: 'PSAK 72 (5 langkah)', ok: true },
  { area: 'CKPN piutang', prior: 'PSAK 71 — ECL', cur: 'PSAK 71 — ECL', ok: true },
  { area: 'Akuntansi sewa', prior: 'PSAK 30 (sewa operasi)', cur: 'PSAK 73 (right-of-use)', ok: false, note: 'Penerapan standar baru (bukan inkonsistensi) — dampak transisi diungkapkan dalam CALK.' },
  { area: 'Imbalan kerja', prior: 'PSAK 24', cur: 'PSAK 24', ok: true },
];

const OB_OPINION_MATRIX = [
  { cond: 'Bukti audit cukup & tepat atas saldo awal tidak dapat diperoleh', mod: 'WDP / Tidak Menyatakan Pendapat', ref: '¶10', status: 'clear', note: 'Bukti memadai diperoleh untuk seluruh saldo awal signifikan.' },
  { cond: 'Saldo awal mengandung salah saji yang berdampak material thd periode berjalan', mod: 'WDP / Tidak Wajar', ref: '¶11', status: 'clear', note: 'Tidak ditemukan salah saji saldo awal; carry-forward terverifikasi.' },
  { cond: 'Kebijakan akuntansi tidak konsisten / perubahan tidak dipertanggungjawabkan & diungkapkan', mod: 'WDP / Tidak Wajar', ref: '¶12', status: 'watch', note: 'Konsisten. Perubahan ke PSAK 73 merupakan penerapan standar baru, diungkapkan memadai.' },
];

/* ============================================================ */
function OpeningBalance() {
  const { fmt } = window.AMS;
  const { wtb } = useAudit();
  const [tab, setTab] = useStateOPN('konteks');
  const [engType, setEngType] = useStateOPN('lanjutan'); // 'lanjutan' | 'awal'

  const tabs = [
    { id: 'konteks', label: 'Konteks & Strategi' },
    { id: 'trace', label: 'Penelusuran Saldo' },
    { id: 'proc', label: 'Prosedur Spesifik' },
    { id: 'policy', label: 'Konsistensi Kebijakan' },
    { id: 'opini', label: 'Kesimpulan & Opini' },
  ];

  const predecessor = engType === 'awal'
    ? { name: 'KAP Sutrisno, Bambang & Rekan', note: 'Auditor pendahulu — izin akses KKP diperoleh' }
    : { name: '— (diaudit sendiri TA lalu)', note: 'Tidak ada auditor pendahulu' };

  return (
    <>
      <SubBar moduleId="opening" right={
        <div className="row gap8 ac">
          <Badge kind="blue">SA 510</Badge>
          <Btn sm><I.download size={13} /> Memo Saldo Awal</Btn>
          <Btn sm variant="primary"><I.check size={14} /> Simpulkan</Btn>
        </div>
      } />
      <div className="view-scroll"><div className="view-pad">

        {/* summary header */}
        <Panel noBody style={{ marginBottom: 12 }}>
          <div style={{ padding: '13px 16px', display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <div className="tiny muted upper" style={{ marginBottom: 3 }}>Jenis Perikatan</div>
              <div className="seg" style={{ width: 'fit-content' }}>
                <button className={engType === 'lanjutan' ? 'on' : ''} onClick={() => setEngType('lanjutan')}>Lanjutan</button>
                <button className={engType === 'awal' ? 'on' : ''} onClick={() => setEngType('awal')}>Perikatan Awal</button>
              </div>
            </div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Auditor Pendahulu</div><div style={{ fontWeight: 700, fontSize: 12.5, maxWidth: 200 }}>{predecessor.name}</div></div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Opini TA Lalu (2024)</div><div style={{ marginTop: 2 }}><Badge kind="green">Wajar Tanpa Modifikasian</Badge></div></div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Tgl Neraca Awal</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5 }}>1 Jan 2025</div></div>
            <div style={{ flex: 1 }} />
            <div style={{ textAlign: 'right' }}>
              <div className="tiny muted upper" style={{ marginBottom: 3 }}>Kesimpulan Saldo Awal</div>
              <Badge kind="green" dot>Dapat Diandalkan</Badge>
            </div>
          </div>
        </Panel>

        <div style={{ marginBottom: 12 }}><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>

        {tab === 'konteks' && <OBContext engType={engType} predecessor={predecessor} />}
        {tab === 'trace' && <OBTrace wtb={wtb} fmt={fmt} />}
        {tab === 'proc' && <OBProcedures fmt={fmt} />}
        {tab === 'policy' && <OBPolicy />}
        {tab === 'opini' && <OBConclusion />}

      </div></div>
    </>
  );
}

/* ---------------- Tab: Konteks & Strategi ---------------- */
function OBContext({ engType, predecessor }) {
  const initialSteps = [
    'Peroleh izin klien untuk berkomunikasi & mengakses KKP auditor pendahulu',
    'Telaah KKP auditor pendahulu atas saldo akun signifikan & area pertimbangan',
    'Evaluasi kompetensi & independensi auditor pendahulu',
    'Inquiry alasan pergantian auditor & isu signifikan yang belum terselesaikan',
  ];
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 360px', gap: 12, alignItems: 'start' }}>
      <div className="grid" style={{ gap: 12 }}>
        <Panel noBody>
          <div className="panel-h"><h3>Tujuan & Lingkup (SA 510)</h3><div style={{ flex: 1 }} /></div>
          <div style={{ padding: 14 }}>
            <p style={{ margin: '0 0 12px', fontSize: 12.5, lineHeight: 1.55, color: 'var(--ink-2)' }}>
              Auditor harus memperoleh bukti audit yang cukup dan tepat mengenai apakah <b>saldo awal</b> mengandung
              salah saji yang berdampak material terhadap laporan keuangan periode berjalan, serta apakah <b>kebijakan
              akuntansi</b> yang tercermin dalam saldo awal telah diterapkan secara konsisten.
            </p>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              {[
                { ic: 'layers', t: 'Saldo Awal Terbawa', d: 'Saldo akhir TA-1 dibawa dengan benar / disajikan kembali jika perlu.' },
                { ic: 'scale', t: 'Konsistensi Kebijakan', d: 'Kebijakan akuntansi diterapkan konsisten antar-periode.' },
                { ic: 'shield', t: 'Dampak ke Opini', d: 'Evaluasi apakah temuan memodifikasi opini periode kini.' },
              ].map((c, i) => {
                const Ic = I[c.ic];
                return (
                  <div key={i} className="panel" style={{ padding: '11px 12px', boxShadow: 'none' }}>
                    <span style={{ color: 'var(--blue)' }}><Ic size={18} /></span>
                    <div style={{ fontWeight: 700, fontSize: 12, margin: '6px 0 3px' }}>{c.t}</div>
                    <div className="tiny muted" style={{ lineHeight: 1.4 }}>{c.d}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </Panel>

        {engType === 'awal' ? (
          <Panel noBody>
            <div className="panel-h"><h3>Komunikasi dengan Auditor Pendahulu (SA 510 ¶6 · SA 300)</h3><div style={{ flex: 1 }} /><Badge kind="amber">Perikatan Awal</Badge></div>
            <div style={{ padding: 14 }}>
              <div className="panel" style={{ padding: '9px 11px', background: 'var(--amber-bg)', borderColor: 'transparent', marginBottom: 12 }}>
                <div className="row ac gap8"><span style={{ color: 'var(--amber)' }}><I.alert size={15} /></span><span style={{ fontSize: 11.5, lineHeight: 1.4 }}>Perikatan tahun pertama — saldo awal belum diaudit oleh KAP ini. Prosedur tambahan wajib dilaksanakan.</span></div>
              </div>
              <div style={{ display: 'grid', gap: 0 }}>
                {initialSteps.map((s, i) => (
                  <div key={i} className="row gap8" style={{ padding: '9px 0', alignItems: 'flex-start', borderBottom: i < initialSteps.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
                    <span className="mono tiny" style={{ flex: '0 0 20px', fontWeight: 700, color: 'var(--blue)' }}>{String(i + 1).padStart(2, '0')}</span>
                    <span style={{ fontSize: 12, lineHeight: 1.45 }}>{s}</span>
                  </div>
                ))}
              </div>
            </div>
          </Panel>
        ) : (
          <Panel noBody>
            <div className="panel-h"><h3>Strategi Saldo Awal — Perikatan Lanjutan</h3><div style={{ flex: 1 }} /><Badge kind="green">Tahun ke-10</Badge></div>
            <div style={{ padding: 14 }}>
              <p style={{ margin: '0 0 10px', fontSize: 12.5, lineHeight: 1.55, color: 'var(--ink-2)' }}>
                Saldo awal TA 2025 berasal dari laporan keuangan 2024 yang <b>diaudit sendiri oleh KAP ini</b> dengan opini
                Wajar Tanpa Modifikasian. Risiko saldo awal rendah; fokus prosedur diarahkan pada:
              </p>
              <div style={{ display: 'grid', gap: 6 }}>
                {[
                  'Verifikasi carry-forward saldo akhir audited 2024 → saldo awal 2025 (lihat tab Penelusuran).',
                  'Evaluasi dampak penerapan awal PSAK 73 terhadap saldo pembukaan (transisi 1 Jan 2025).',
                  'Konfirmasi konsistensi kebijakan akuntansi material (lihat tab Konsistensi Kebijakan).',
                ].map((t, i) => (
                  <div key={i} className="row gap8 ac" style={{ fontSize: 12 }}>
                    <span style={{ color: 'var(--green)', flex: '0 0 auto' }}><I.checkCircle size={15} /></span>{t}
                  </div>
                ))}
              </div>
            </div>
          </Panel>
        )}
      </div>

      <div className="grid" style={{ gap: 12 }}>
        <Panel title="Profil Auditor Pendahulu">
          <div style={{ display: 'grid', gap: 8 }}>
            <KvBox label="KAP" v={predecessor.name} />
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <KvBox label="Akses KKP" v={engType === 'awal' ? 'Diperoleh' : 'N/A'} accent={engType === 'awal' ? 'var(--green)' : 'var(--ink-3)'} />
              <KvBox label="Opini TA-1" v="WTP" accent="var(--green)" />
            </div>
            <div className="tiny muted" style={{ lineHeight: 1.4 }}>{predecessor.note}.</div>
          </div>
        </Panel>
        <Panel title="Penilaian Risiko Saldo Awal">
          <div style={{ display: 'grid', gap: 9 }}>
            {[
              { k: 'Risiko Inheren', v: engType === 'awal' ? 'Moderat' : 'Rendah', c: engType === 'awal' ? 'var(--amber)' : 'var(--green)' },
              { k: 'Risiko Pengendalian', v: 'Rendah', c: 'var(--green)' },
              { k: 'Area Pertimbangan Tinggi', v: 'Sewa (PSAK 73)', c: 'var(--amber)' },
            ].map((r, i) => (
              <div key={i} className="row jb ac" style={{ fontSize: 12, paddingBottom: 8, borderBottom: i < 2 ? '1px solid var(--line-soft)' : 0 }}>
                <span className="muted">{r.k}</span><span style={{ fontWeight: 700, color: r.c }}>{r.v}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ---------------- Tab: Penelusuran Saldo ---------------- */
function OBTrace({ wtb, fmt }) {
  const rows = wtb.filter(r => OB_SOFP_GROUPS.includes(r.group));
  let totClose = 0, totOpen = 0, totDiff = 0;
  const grouped = OB_SOFP_GROUPS.map(g => ({ g, items: rows.filter(r => r.group === g) })).filter(x => x.items.length);
  let matched = 0, transition = 0;

  return (
    <Panel noBody>
      <div className="panel-h"><h3>Penelusuran Saldo Akhir Audited TA-1 → Saldo Awal TA Kini</h3><div style={{ flex: 1 }} /><span className="tiny muted">Posisi keuangan · nilai Rp juta</span></div>
      <div className="panel" style={{ margin: '0', padding: '8px 14px', borderRadius: 0, borderLeft: 0, borderRight: 0, borderTop: 0, background: 'var(--blue-050)', display: 'flex', gap: 18, fontSize: 11.5 }}>
        <span className="row ac gap6"><span style={{ width: 9, height: 9, borderRadius: 2, background: 'var(--green)' }} /> Carry-forward cocok</span>
        <span className="row ac gap6"><span style={{ width: 9, height: 9, borderRadius: 2, background: 'var(--amber)' }} /> Saldo timbul dari transisi PSAK 73 (1 Jan 2025)</span>
      </div>
      <table className="dtbl">
        <thead><tr>
          <th style={{ width: 70 }}>Kode</th><th>Akun</th><th style={{ width: 48 }}>Lead</th>
          <th className="num">Saldo Akhir TA-1 (Audited)</th><th className="num">Saldo Awal TA Kini</th>
          <th className="num">Selisih</th><th style={{ width: 130 }}>Status</th>
        </tr></thead>
        <tbody>
          {grouped.map(({ g, items }) => (
            <React.Fragment key={g}>
              <tr className="group-row"><td colSpan={7}>{g}</td></tr>
              {items.map(r => {
                const isT = OB_TRANSITION[r.code] != null;
                const priorClose = isT ? 0 : r.ly;
                const opening = isT ? OB_TRANSITION[r.code] : r.ly;
                const diff = opening - priorClose;
                totClose += priorClose; totOpen += opening; totDiff += diff;
                if (isT) transition++; else matched++;
                return (
                  <tr key={r.code}>
                    <td className="mono tiny muted">{r.code}</td>
                    <td className="truncate" style={{ maxWidth: 240 }}>{r.name}</td>
                    <td className="mono tiny" style={{ color: 'var(--blue)', fontWeight: 700 }}>{r.lead}</td>
                    <td className="num mono">{fmt(priorClose / 1e6, 0)}</td>
                    <td className="num mono">{fmt(opening / 1e6, 0)}</td>
                    <td className="num mono" style={{ color: diff === 0 ? 'var(--ink-4)' : 'var(--amber)' }}>{diff === 0 ? '—' : fmt(diff / 1e6, 0)}</td>
                    <td>{isT
                      ? <Badge kind="amber">Transisi PSAK 73</Badge>
                      : <span className="row ac gap6 tiny" style={{ color: 'var(--green)', fontWeight: 600 }}><I.check size={13} /> Cocok</span>}
                    </td>
                  </tr>
                );
              })}
            </React.Fragment>
          ))}
        </tbody>
        <tfoot><tr>
          <td colSpan={3}>Total — {matched} cocok · {transition} transisi</td>
          <td className="num mono">{fmt(totClose / 1e6, 0)}</td>
          <td className="num mono">{fmt(totOpen / 1e6, 0)}</td>
          <td className="num mono" style={{ color: totDiff === 0 ? 'var(--ink-4)' : 'var(--amber)' }}>{fmt(totDiff / 1e6, 0)}</td>
          <td></td>
        </tr></tfoot>
      </table>
      <div className="panel" style={{ margin: 12, padding: '9px 11px', background: 'var(--green-bg)', borderColor: 'transparent' }}>
        <div className="row ac gap8"><span style={{ color: 'var(--green)' }}><I.checkCircle size={15} /></span><span style={{ fontSize: 11.5, lineHeight: 1.4 }}>Seluruh saldo akhir audited 2024 ditelusuri tepat ke saldo awal 2025. Selisih hanya berasal dari pengakuan transisi PSAK 73 yang telah diuji terpisah (lihat Prosedur Spesifik — Lead F).</span></div>
      </div>
    </Panel>
  );
}

/* ---------------- Tab: Prosedur Spesifik ---------------- */
function OBProcedures({ fmt }) {
  const [selId, setSelId] = useStateOPN('C');
  const sel = OB_SPECIFIC.find(s => s.id === selId);
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 340px', gap: 12, alignItems: 'start' }}>
      <Panel noBody>
        <div className="panel-h"><h3>Prosedur Audit Spesifik atas Saldo Awal Signifikan</h3><div style={{ flex: 1 }} /><span className="tiny muted">{OB_SPECIFIC.length} akun</span></div>
        <table className="dtbl">
          <thead><tr><th style={{ width: 44 }}>Lead</th><th>Akun</th><th>Asersi</th><th>Risiko</th><th style={{ width: 110 }}>Hasil</th></tr></thead>
          <tbody>
            {OB_SPECIFIC.map(s => (
              <tr key={s.id} className={s.id === selId ? 'sel' : ''} onClick={() => setSelId(s.id)} style={{ cursor: 'pointer' }}>
                <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{s.lead}</td>
                <td style={{ fontWeight: 600 }} className="truncate">{s.acct}</td>
                <td className="tiny muted">{s.assertion}</td>
                <td><Badge kind={s.risk === 'Signifikan' ? 'red' : 'amber'}>{s.risk}</Badge></td>
                <td><Badge kind={s.result === 'Memadai' ? 'green' : 'amber'}>{s.result}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
      {sel && (
        <Panel noBody>
          <div style={{ background: 'var(--surface-2)', padding: '11px 14px', borderBottom: '1px solid var(--line)' }}>
            <div className="row ac gap8"><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>Lead {sel.lead}</span><Badge kind={sel.result === 'Memadai' ? 'green' : 'amber'}>{sel.result}</Badge></div>
            <div style={{ fontWeight: 700, fontSize: 13, marginTop: 3 }}>{sel.acct}</div>
            <div className="tiny muted">{sel.assertion}</div>
          </div>
          <div style={{ padding: 14 }}>
            <div className="tiny muted upper" style={{ marginBottom: 4 }}>Prosedur</div>
            <p style={{ margin: '0 0 12px', fontSize: 12, lineHeight: 1.5 }}>{sel.proc}</p>
            <div className="tiny muted upper" style={{ marginBottom: 4 }}>Bukti Diperoleh</div>
            <p style={{ margin: '0 0 12px', fontSize: 11.5, lineHeight: 1.45, color: 'var(--ink-2)' }}>{sel.evidence}</p>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <KvBox label="Tingkat Risiko" v={sel.risk} accent={sel.risk === 'Signifikan' ? 'var(--red)' : 'var(--amber)'} />
              <KvBox label="Hasil" v={sel.result} accent={sel.result === 'Memadai' ? 'var(--green)' : 'var(--amber)'} />
            </div>
            <Btn sm variant="primary" style={{ width: '100%' }}><I.flask size={14} /> Buka WP {sel.wp}</Btn>
          </div>
        </Panel>
      )}
    </div>
  );
}

/* ---------------- Tab: Konsistensi Kebijakan ---------------- */
function OBPolicy() {
  const inconsistent = OB_POLICY.filter(p => !p.ok).length;
  return (
    <Panel noBody>
      <div className="panel-h"><h3>Evaluasi Konsistensi Kebijakan Akuntansi</h3><div style={{ flex: 1 }} /><span className="tiny muted">{OB_POLICY.length - inconsistent} konsisten · {inconsistent} perubahan standar</span></div>
      <table className="dtbl">
        <thead><tr><th>Area Kebijakan</th><th>Kebijakan TA-1 (2024)</th><th>Kebijakan TA Kini (2025)</th><th style={{ width: 150 }}>Penilaian</th></tr></thead>
        <tbody>
          {OB_POLICY.map((p, i) => (
            <tr key={i}>
              <td style={{ fontWeight: 600 }}>{p.area}</td>
              <td className="tiny muted">{p.prior}</td>
              <td className="tiny">{p.cur}</td>
              <td>{p.ok
                ? <span className="row ac gap6 tiny" style={{ color: 'var(--green)', fontWeight: 600 }}><I.check size={13} /> Konsisten</span>
                : <Badge kind="amber">Standar Baru</Badge>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="panel" style={{ margin: 12, padding: '10px 12px', background: 'var(--amber-bg)', borderColor: 'transparent' }}>
        <div className="row gap8" style={{ alignItems: 'flex-start' }}>
          <span style={{ color: 'var(--amber)', flex: '0 0 auto' }}><I.scale size={15} /></span>
          <span style={{ fontSize: 11.5, lineHeight: 1.45 }}><b>Akuntansi sewa — PSAK 30 → PSAK 73.</b> Bukan inkonsistensi kebijakan, melainkan penerapan standar baru secara modified retrospective per 1 Jan 2025. Dampak transisi diakui pada saldo pembukaan dan diungkapkan dalam CALK — tidak memerlukan modifikasi opini.</span>
        </div>
      </div>
    </Panel>
  );
}

/* ---------------- Tab: Kesimpulan & Opini ---------------- */
function OBConclusion() {
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 340px', gap: 12, alignItems: 'start' }}>
      <div className="grid" style={{ gap: 12 }}>
        <Panel noBody>
          <div className="panel-h"><h3>Matriks Dampak terhadap Opini (SA 510 ¶10–13)</h3><div style={{ flex: 1 }} /></div>
          <table className="dtbl">
            <thead><tr><th style={{ width: 44 }}>Ref</th><th>Kondisi</th><th style={{ width: 180 }}>Potensi Modifikasi</th><th style={{ width: 90 }}>Status</th></tr></thead>
            <tbody>
              {OB_OPINION_MATRIX.map((m, i) => (
                <tr key={i}>
                  <td className="mono tiny" style={{ color: 'var(--blue)', fontWeight: 700 }}>{m.ref}</td>
                  <td style={{ whiteSpace: 'normal', lineHeight: 1.4, fontSize: 11.5 }}>{m.cond}<div className="tiny muted" style={{ marginTop: 3 }}>{m.note}</div></td>
                  <td className="tiny">{m.mod}</td>
                  <td>{m.status === 'clear' ? <Badge kind="green">Bersih</Badge> : <Badge kind="amber">Pantau</Badge>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <Panel title="Kesimpulan Auditor">
          <p style={{ margin: '0 0 10px', fontSize: 12.5, lineHeight: 1.6 }}>
            Berdasarkan prosedur yang dilaksanakan, kami memperoleh bukti audit yang cukup dan tepat bahwa
            <b> saldo awal per 1 Januari 2025 tidak mengandung salah saji yang berdampak material</b> terhadap
            laporan keuangan periode berjalan, dan kebijakan akuntansi telah diterapkan secara konsisten.
            Pengakuan transisi PSAK 73 atas Aset Hak-Guna dan Liabilitas Sewa telah dievaluasi terpisah dan
            diungkapkan memadai. <b>Tidak diperlukan modifikasi opini</b> sehubungan dengan saldo awal.
          </p>
          <div className="panel" style={{ padding: '10px 12px', background: 'var(--green-bg)', borderColor: 'transparent' }}>
            <div className="row ac gap8"><span style={{ color: 'var(--green)' }}><I.checkCircle size={16} /></span><span style={{ fontSize: 12, fontWeight: 600 }}>Saldo awal dapat diandalkan — siap dirujuk ke kesimpulan audit & laporan auditor.</span></div>
          </div>
        </Panel>
      </div>

      <div className="grid" style={{ gap: 12 }}>
        <Panel title="Tautan Kertas Kerja">
          <div style={{ display: 'grid', gap: 6 }}>
            {[
              { t: 'Penelusuran carry-forward', wp: 'A-510' },
              { t: 'Prosedur persediaan (OB)', wp: 'C(OB)' },
              { t: 'Memo transisi PSAK 73', wp: 'F(OB)' },
              { t: 'Konsistensi kebijakan', wp: 'A-512' },
            ].map((r, i) => (
              <div key={i} className="row jb ac" style={{ fontSize: 12, padding: '7px 9px', border: '1px solid var(--line-soft)', borderRadius: 6 }}>
                <span className="row ac gap8"><span style={{ color: 'var(--blue)' }}><I.doc size={14} /></span>{r.t}</span>
                <span className="mono tiny" style={{ color: 'var(--blue)', fontWeight: 700 }}>{r.wp}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Sign-off">
          <div style={{ display: 'grid', gap: 9 }}>
            {[
              { role: 'Disiapkan', who: 'Dimas Raharjo', when: '06 Mar', done: true },
              { role: 'Direview', who: 'Anindya Pramesti', when: '09 Mar', done: true },
              { role: 'Disetujui Partner', who: 'Hartono Wijaya', when: '—', done: false },
            ].map((s, i) => (
              <div key={i} className="row jb ac" style={{ fontSize: 12, paddingBottom: 8, borderBottom: i < 2 ? '1px solid var(--line-soft)' : 0 }}>
                <div><div className="tiny muted upper">{s.role}</div><div style={{ fontWeight: 600 }}>{s.who}</div></div>
                {s.done ? <span className="row ac gap6 tiny" style={{ color: 'var(--green)', fontWeight: 600 }}><I.checkCircle size={14} /> {s.when}</span> : <Badge kind="amber">Menunggu</Badge>}
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

Object.assign(window, { OpeningBalance });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { OpeningBalance };
