/* [codemod] ESM imports */
import React from 'react';
import { useAudit, useAuth, useFirm, useAmsPersist, useNav } from './contexts';
import { CAP } from './rbac';
import { fluxCounts } from './flux_state';
import { I } from './icons';
import { SACanonChips, SACanonicalStatus } from './sa_canonical';
import { SubBar } from './shell';
import { Badge, Btn, Panel, Progress, Tabs } from './ui';
import { KvBox } from './view_analytical';

/* ============================================================
   Asseris — SA 520 · Prosedur Analitis
   Deep workpaper: prosedur analitis substantif (pengembangan
   ekspektasi, ambang selisih, investigasi), keandalan data &
   disagregasi, serta prosedur analitis mendekati akhir audit.
   ============================================================ */
const { useState: useState520, useMemo: useMemo520 } = React;

/* ---- Prosedur analitis substantif (Rp jt) ----
   PR-3c: dulu konstanta ini DIRENDER LANGSUNG — modul ini satu-satunya permukaan SA 520
   yang terdaftar di `WP_MODULE_MAP` (punya sign-off & bukti wajib), tetapi seluruh isinya
   literal dan tak satu pun tersimpan: ekspektasi, aktual, ambang, dan hasil investigasi
   semuanya hardcode. Sign-off tanpa isi. Kini dipakai sebagai NILAI AWAL state
   `sa520.v1` (engagement + WP_EDIT) yang dapat disunting & bertahan. */
const SAP_ROWS = [
  { id: 'AP-01', acct: 'Pendapatan', assertion: 'Kelengkapan · Keterjadian', basis: 'Volume × harga rata-rata per lini, disesuaikan musiman', exp: 258400, act: 260010, rel: 'Tinggi', disag: 'Bulanan × lini produk', note: 'Selaras dengan ekspektasi; lonjakan Des dirujuk silang ke SA 240 (cut-off).' },
  { id: 'AP-02', acct: 'Beban Pokok Penjualan', assertion: 'Keakuratan', basis: 'Rasio HPP/Pendapatan PY disetel perubahan bauran', exp: 179300, act: 178420, rel: 'Tinggi', disag: 'Bulanan × lini produk', note: 'Margin kotor stabil; selisih dalam ambang.' },
  { id: 'AP-03', acct: 'Beban Gaji & Tunjangan', assertion: 'Kelengkapan · Keakuratan', basis: 'Headcount rata-rata × gaji + kenaikan 7%', exp: 41200, act: 43850, rel: 'Tinggi', disag: 'Bulanan × departemen', note: 'Selisih > ambang — bonus insidental Q4 (didukung daftar gaji).' },
  { id: 'AP-04', acct: 'Beban Penyusutan', assertion: 'Keakuratan', basis: 'Saldo aset × tarif penyusutan per kelas', exp: 14600, act: 14580, rel: 'Tinggi', disag: 'Per kelas aset', note: 'Sangat dekat ekspektasi (data berasal dari register aset).' },
  { id: 'AP-05', acct: 'Beban Bunga', assertion: 'Keakuratan · Kelengkapan', basis: 'Saldo pinjaman rata-rata × suku bunga efektif', exp: 9800, act: 11240, rel: 'Tinggi', disag: 'Per fasilitas pinjaman', note: 'Selisih > ambang — tambahan utilisasi RCF Sep; ditelusuri ke perjanjian.' },
  { id: 'AP-06', acct: 'Beban Utilitas', assertion: 'Kelengkapan', basis: 'Konsumsi × tarif, tren 36 bulan', exp: 6100, act: 6040, rel: 'Sedang', disag: 'Bulanan × lokasi', note: 'Wajar; data tarif eksternal andal.' },
];

/* ============================================================ */
function SA520View() {
  const firm = useFirm();
  const auth = useAuth();
  const nav = useNav();
  const client = firm?.activeClient?.name || 'PT Sentosa Makmur Tbk';
  const [tab, setTab] = useState520('substantif');
  const locked = !!(firm && firm.locked);
  const canEdit = (!auth || typeof auth.can !== 'function' || auth.can(CAP.WP_EDIT)) && !locked;

  /* PR-3c — kertas kerja tersimpan (engagement + WP_EDIT), seed sebagai nilai awal. */
  const [doc, setDoc] = useAmsPersist('sa520.v1', () => ({ thr: 2.5, rows: SAP_ROWS }));
  const thr: number = (doc && typeof doc.thr === 'number') ? doc.thr : 2.5;
  const docRows: typeof SAP_ROWS = (doc && Array.isArray(doc.rows) && doc.rows.length) ? doc.rows : SAP_ROWS;
  const setThr = (v: number) => { if (canEdit) setDoc((d: { thr: number }) => ({ ...d, thr: v })); };
  const patchRow = (id: string, patch: Record<string, unknown>) => {
    if (!canEdit) return;
    setDoc((d: { rows?: typeof SAP_ROWS }) => ({
      ...d,
      rows: ((d && d.rows) || SAP_ROWS).map(r => (r.id === id ? { ...r, ...patch } : r)),
    }));
  };

  /* PR-3c — roll-up telaah fluktuasi dari SSOT bersama (`fluxState.v1`), sehingga kertas
     kerja SA 520 memantulkan pekerjaan NYATA di tab WTB / modul Analytical, bukan angka
     literalnya sendiri. */
  const { wtb, fluxState, fluxThreshold } = useAudit();
  const fluxRollup = useMemo520(() => {
    const pctThr = (fluxThreshold && typeof fluxThreshold.pctThr === 'number') ? fluxThreshold.pctThr : 20;
    const absThr = (fluxThreshold && fluxThreshold.absJt != null) ? fluxThreshold.absJt * 1e6 : null;
    const flaggedCodes = (wtb || [])
      .filter((r: { adj?: number; ly?: number }) => {
        const delta = (r.adj || 0) - (r.ly || 0);
        const pct = r.ly ? (delta / Math.abs(r.ly)) * 100 : (delta !== 0 ? Infinity : 0);
        return (absThr != null && Math.abs(delta) >= absThr) || Math.abs(pct) >= pctThr;
      })
      .map((r: { code: string }) => r.code);
    return { counts: fluxCounts(flaggedCodes, fluxState), pctThr };
  }, [wtb, fluxState, fluxThreshold]);

  const tabs = [
    { id: 'substantif', label: 'Analitis Substantif' },
    { id: 'keandalan', label: 'Keandalan Data' },
    { id: 'penutup', label: 'Analitis Penutup' },
  ];

  const rows = useMemo520(() => docRows.map(r => {
    const diff = r.act - r.exp;
    const pct = r.exp ? (diff / r.exp) * 100 : 0;
    const flag = Math.abs(pct) > thr;
    return { ...r, diff, pct, flag };
  }), [docRows, thr]);
  const flagged = rows.filter((r: any) => r.flag).length;

  return (
    <>
      <SubBar moduleId="sa520" right={
        <div className="row gap8 ac">
          <SACanonChips stdId="sa520" />
          <Btn sm><I.download size={13} /> Kertas Kerja Analitis</Btn>
          <Btn sm variant="primary"><I.sparkle size={14} /> AI Assist</Btn>
        </div>
      } />
      <div className="view-scroll"><div className="view-pad">

        <Panel noBody style={{ marginBottom: 12 }}>
          <div style={{ padding: '13px 16px', display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ minWidth: 210 }}>
              <div className="tiny muted upper" style={{ marginBottom: 3 }}>Standar Audit 520</div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>Prosedur Analitis</div>
              <div className="tiny muted">{client} · ENG-2025-014</div>
            </div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Prosedur Substantif</div><div className="mono" style={{ fontWeight: 700, fontSize: 12 }}>{SAP_ROWS.length} area akun</div></div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Ambang Selisih</div><div className="mono" style={{ fontWeight: 700, fontSize: 12, color: 'var(--blue)' }}>{thr.toFixed(1)}% · ≈ MK</div></div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Selisih Ditindaklanjuti</div><div className="mono" style={{ fontWeight: 700, fontSize: 12, color: flagged ? 'var(--amber)' : 'var(--green)' }}>{flagged} dari {SAP_ROWS.length}</div></div>
            <div style={{ flex: 1 }} />
            <div style={{ textAlign: 'right' }}>
              <div className="tiny muted upper" style={{ marginBottom: 3 }}>Tahap</div>
              <Badge kind="blue" dot>Pelaksanaan + Penutupan</Badge>
            </div>
          </div>
        </Panel>

        <SACanonicalStatus stdId="sa520" />

        <div style={{ marginBottom: 12 }}><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>

        {/* PR-3c — telaah fluktuasi NYATA (SSOT bersama), bukan angka literal modul ini */}
        <Panel noBody style={{ marginBottom: 12 }}>
          <div className="panel-h">
            <h3>Telaah Fluktuasi Neraca Saldo (¶5)</h3>
            <span className="sub">dari kertas kerja WTB · ambang bersama {fluxRollup.pctThr}%</span>
            <div style={{ flex: 1 }} />
            <Btn sm onClick={() => nav('wtb', { from: 'sa520', tab: 'review' })}><I.table size={13} /> Buka Telaah Pergerakan</Btn>
          </div>
          <div className="row ac gap18" style={{ padding: '11px 16px', flexWrap: 'wrap' }}>
            <div><div className="mono" style={{ fontWeight: 700, fontSize: 15, color: 'var(--navy)' }}>{fluxRollup.counts.total}</div><div className="tiny muted">fluktuasi signifikan</div></div>
            <div><div className="mono" style={{ fontWeight: 700, fontSize: 15, color: 'var(--green)' }}>{fluxRollup.counts.explained}</div><div className="tiny muted">dijelaskan</div></div>
            <div><div className="mono" style={{ fontWeight: 700, fontSize: 15, color: fluxRollup.counts.followup ? 'var(--amber)' : 'var(--ink-3)' }}>{fluxRollup.counts.followup}</div><div className="tiny muted">perlu tindak lanjut</div></div>
            <div><div className="mono" style={{ fontWeight: 700, fontSize: 15, color: fluxRollup.counts.unexplained ? 'var(--red)' : 'var(--ink-3)' }}>{fluxRollup.counts.unexplained}</div><div className="tiny muted">tak dapat dijelaskan</div></div>
            <div><div className="mono" style={{ fontWeight: 700, fontSize: 15, color: fluxRollup.counts.unreviewed ? 'var(--amber)' : 'var(--ink-3)' }}>{fluxRollup.counts.unreviewed}</div><div className="tiny muted">belum ditelaah</div></div>
            <div style={{ flex: 1, minWidth: 140 }}><Progress value={fluxRollup.counts.total ? (fluxRollup.counts.explained / fluxRollup.counts.total) * 100 : 100} color={fluxRollup.counts.outstanding ? 'var(--amber)' : 'var(--green)'} /></div>
          </div>
        </Panel>

        {tab === 'substantif' && <F520Substantive rows={rows} thr={thr} setThr={setThr} flagged={flagged} patchRow={patchRow} canEdit={canEdit} />}
        {tab === 'keandalan' && <F520Reliability />}
        {tab === 'penutup' && <F520Final />}

      </div></div>
    </>
  );
}

/* ---------------- Tab: Analitis Substantif ---------------- */
function F520Substantive({ rows, thr, setThr, flagged, patchRow, canEdit }: any) {
  const [selId, setSelId] = useState520('AP-03');
  const sel = rows.find((r: any) => r.id === selId);
  return (
    <div className="grid" style={{ gap: 12 }}>
      <Panel noBody>
        <div className="panel-h"><h3>Pengembangan Ekspektasi & Ambang Selisih</h3><div style={{ flex: 1 }} />
          <div className="row ac gap10">
            <span className="tiny muted">Ambang yang dapat diterima</span>
            <input type="range" min="1" max="5" step="0.5" value={thr} onChange={(e: any) => setThr(parseFloat(e.target.value))} style={{ width: 130, accentColor: 'var(--blue)' }} />
            <span className="mono" style={{ fontWeight: 700, fontSize: 13, color: 'var(--blue)', minWidth: 42 }}>{thr.toFixed(1)}%</span>
          </div>
        </div>
        <table className="dtbl">
          <thead><tr><th style={{ width: 54 }}>Ref</th><th>Akun</th><th className="num">Ekspektasi</th><th className="num">Tercatat</th><th className="num">Selisih</th><th className="num">%</th><th style={{ width: 96 }}>Status</th></tr></thead>
          <tbody>
            {rows.map((r: any) => (
              <tr key={r.id} className={r.id === selId ? 'sel' : ''} onClick={() => setSelId(r.id)} style={{ cursor: 'pointer' }}>
                <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{r.id}</td>
                <td style={{ fontWeight: 600 }}>{r.acct}<div className="tiny muted" style={{ fontWeight: 400 }}>{r.assertion}</div></td>
                <td className="num mono">{r.exp.toLocaleString('id-ID')}</td>
                <td className="num mono">{r.act.toLocaleString('id-ID')}</td>
                <td className="num mono" style={{ color: r.diff < 0 ? 'var(--green)' : 'var(--ink)' }}>{r.diff > 0 ? '+' : ''}{r.diff.toLocaleString('id-ID')}</td>
                <td className="num mono" style={{ color: r.flag ? 'var(--amber)' : 'var(--ink-3)', fontWeight: r.flag ? 700 : 400 }}>{r.pct > 0 ? '+' : ''}{r.pct.toFixed(1)}%</td>
                <td>{r.flag ? <Badge kind="amber">Investigasi</Badge> : <Badge kind="green">Dalam ambang</Badge>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="panel" style={{ margin: 12, padding: '10px 12px', background: 'var(--surface-2)', borderColor: 'transparent' }}>
          <div className="row gap8" style={{ alignItems: 'flex-start' }}>
            <span style={{ color: 'var(--blue)', flex: '0 0 auto' }}><I.sliders size={15} /></span>
            <span style={{ fontSize: 12, lineHeight: 1.45 }}>Ambang selisih ditetapkan ±<b>{thr.toFixed(1)}%</b> (mendekati materialitas kinerja). Selisih melebihi ambang wajib <b>diselidiki</b> — inquiry manajemen <i>dan</i> prosedur audit lain bila perlu (¶7). Geser slider untuk menguji sensitivitas: kini <b>{flagged}</b> selisih perlu tindak lanjut.</span>
          </div>
        </div>
      </Panel>

      {sel && (
        <div className="grid" style={{ gridTemplateColumns: '1fr 360px', gap: 12, alignItems: 'start' }}>
          <Panel noBody>
            <div className="panel-h"><h3>{sel.id} · {sel.acct} — Telaah Selisih</h3><div style={{ flex: 1 }} /><Badge kind={sel.flag ? 'amber' : 'green'}>{sel.flag ? 'Di atas ambang' : 'Dalam ambang'}</Badge></div>
            <div style={{ padding: 14 }}>
              <div className="grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 12 }}>
                <KvBox label="Ekspektasi (jt)" v={sel.exp.toLocaleString('id-ID')} />
                <KvBox label="Tercatat (jt)" v={sel.act.toLocaleString('id-ID')} />
                <KvBox label="Selisih %" v={(sel.pct > 0 ? '+' : '') + sel.pct.toFixed(1) + '%'} accent={sel.flag ? 'var(--amber)' : 'var(--green)'} />
              </div>
              {/* PR-3c — ekspektasi & hasil investigasi kini DAPAT DISUNTING dan tersimpan
                  (dulu literal: kertas kerja ber-sign-off tanpa isi yang bisa diubah auditor). */}
              <div className="row gap10" style={{ marginBottom: 12 }}>
                <div className="field" style={{ flex: 1 }}>
                  <label>Ekspektasi (Rp jt)</label>
                  <input className="input mono" type="number" style={{ height: 28, textAlign: 'right' }} value={sel.exp} disabled={!canEdit}
                    onChange={(e: { target: { value: string } }) => patchRow(sel.id, { exp: +e.target.value || 0 })} />
                </div>
                <div className="field" style={{ flex: 1 }}>
                  <label>Tercatat (Rp jt)</label>
                  <input className="input mono" type="number" style={{ height: 28, textAlign: 'right' }} value={sel.act} disabled={!canEdit}
                    onChange={(e: { target: { value: string } }) => patchRow(sel.id, { act: +e.target.value || 0 })} />
                </div>
              </div>
              <div className="tiny muted upper" style={{ marginBottom: 4 }}>Dasar Ekspektasi (¶5c)</div>
              <textarea className="input" rows={2} style={{ width: '100%', marginBottom: 12, padding: 8, resize: 'vertical', fontFamily: 'var(--ui)', lineHeight: 1.5 }}
                value={sel.basis} disabled={!canEdit}
                onChange={(e: { target: { value: string } }) => patchRow(sel.id, { basis: e.target.value })} />
              <div className="tiny muted upper" style={{ marginBottom: 4 }}>Hasil Investigasi / Catatan</div>
              <textarea className="input" rows={3} style={{ width: '100%', padding: 8, resize: 'vertical', fontFamily: 'var(--ui)', lineHeight: 1.5 }}
                value={sel.note} disabled={!canEdit}
                placeholder="Catat prosedur investigasi & bukti korroborasi (¶7)…"
                onChange={(e: { target: { value: string } }) => patchRow(sel.id, { note: e.target.value })} />
              {sel.flag && (
                <div className="panel" style={{ padding: '9px 11px', background: 'var(--amber-bg)', borderColor: 'transparent', marginTop: 12 }}>
                  <div className="row ac gap8"><span style={{ color: 'var(--amber)' }}><I.alert size={15} /></span><span style={{ fontSize: 12, lineHeight: 1.4 }}>Selisih melampaui ambang — penjelasan manajemen diuji terhadap bukti pendukung; tidak diterima tanpa korroborasi (¶7).</span></div>
                </div>
              )}
            </div>
          </Panel>

          <Panel noBody>
            <div className="panel-h"><h3>Empat Syarat Analitis Substantif (¶5)</h3><div style={{ flex: 1 }} /></div>
            <div style={{ padding: '6px 0' }}>
              {[
                { t: 'Kesesuaian prosedur untuk asersi tertentu', ref: '¶5(a)', ok: true },
                { t: 'Keandalan data (sumber, komparabilitas, kontrol)', ref: '¶5(b)', ok: true },
                { t: 'Ekspektasi cukup tepat untuk deteksi salah saji material', ref: '¶5(c)', ok: true },
                { t: 'Ambang selisih yang dapat diterima tanpa investigasi', ref: '¶5(d)', ok: true },
              ].map((c, i) => (
                <div key={i} className="row gap10" style={{ padding: '10px 14px', alignItems: 'flex-start', borderBottom: i < 3 ? '1px solid var(--line-soft)' : 0 }}>
                  <span style={{ color: 'var(--green)', flex: '0 0 auto', marginTop: 1 }}><I.checkCircle size={16} /></span>
                  <div style={{ flex: 1, fontSize: 12, lineHeight: 1.4 }}>{c.t}</div>
                  <span className="mono tiny" style={{ color: 'var(--blue)', fontWeight: 700 }}>{c.ref}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}

/* ---------------- Tab: Keandalan Data ---------------- */
function F520Reliability() {
  const factors = [
    { t: 'Sumber data', d: 'Data independen dari luar entitas lebih andal daripada internal.', ex: 'Tarif utilitas & suku bunga acuan dari sumber eksternal.', k: 'green', lvl: 'Andal' },
    { t: 'Komparabilitas', d: 'Data industri agregat mungkin perlu disetel agar sebanding.', ex: 'Bauran produk berubah — rasio PY disetel sebelum dipakai.', k: 'amber', lvl: 'Disetel' },
    { t: 'Relevansi & sifat', d: 'Apakah ekspektasi dirancang untuk mengidentifikasi salah saji.', ex: 'Disagregasi bulanan × lini meningkatkan ketepatan.', k: 'green', lvl: 'Relevan' },
    { t: 'Kontrol atas penyiapan', d: 'Kontrol atas keakuratan & kelengkapan data yang dipakai.', ex: 'Data volume dari sistem WMS yang diuji ITGC (efektif).', k: 'green', lvl: 'Terkontrol' },
  ];
  return (
    <div className="grid" style={{ gap: 12 }}>
      <Panel noBody>
        <div className="panel-h"><h3>Evaluasi Keandalan Data (¶5b · A12–A14)</h3><div style={{ flex: 1 }} /><Badge kind="blue">Prasyarat ketepatan</Badge></div>
        <div style={{ padding: '6px 14px 14px' }}>
          {factors.map((f, i) => (
            <div key={i} className="row gap12" style={{ padding: '12px 0', alignItems: 'flex-start', borderBottom: i < factors.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
              <span style={{ flex: '0 0 36px', width: 36, height: 36, borderRadius: 9, display: 'grid', placeItems: 'center', background: `var(--${f.k}-bg)`, color: `var(--${f.k})` }}><I.check size={17} /></span>
              <div style={{ flex: 1 }}>
                <div className="row jb ac"><div style={{ fontSize: 12, fontWeight: 700 }}>{f.t}</div><Badge kind={f.k}>{f.lvl}</Badge></div>
                <div className="tiny muted" style={{ lineHeight: 1.45, margin: '2px 0 5px' }}>{f.d}</div>
                <div className="chip tiny" style={{ background: 'var(--surface-2)' }}>{f.ex}</div>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }}>
        <Panel title="Tingkat Disagregasi & Ketepatan">
          <p style={{ margin: '0 0 10px', fontSize: 12, lineHeight: 1.5, color: 'var(--ink-2)' }}>Makin terdisagregasi data, makin tinggi ketepatan ekspektasi dalam mendeteksi salah saji. Pendapatan dianalisis bulanan per lini, bukan agregat tahunan.</p>
          <div style={{ display: 'grid', gap: 8 }}>
            {[['Agregat tahunan', 25, 'gray'], ['Per kuartal', 50, 'amber'], ['Bulanan × lini produk', 92, 'green']].map((r, i) => (
              <div key={i}>
                <div className="row jb tiny" style={{ marginBottom: 3 }}><span>{r[0]}</span><span className="mono">{r[1]}% ketepatan</span></div>
                <Progress value={r[1]} color={`var(--${r[2]})`} />
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Hubungan dengan Pengujian Lain">
          <div style={{ display: 'grid', gap: 7 }}>
            {[
              { t: 'Analitis sebagai prosedur penilaian risiko (SA 315)', ok: true },
              { t: 'Analitis substantif — bukti atas asersi (tab ini)', ok: true },
              { t: 'Uji rincian sebagai pelengkap untuk asersi berisiko', ok: true },
              { t: 'Analitis penutup mendekati akhir audit (¶6)', ok: false },
            ].map((r, i) => (
              <div key={i} className="row gap8" style={{ fontSize: 12, alignItems: 'flex-start' }}>
                <span style={{ color: r.ok ? 'var(--green)' : 'var(--amber)', flex: '0 0 auto', marginTop: 1 }}>{r.ok ? <I.checkCircle size={15} /> : <I.clock size={15} />}</span>
                <span style={{ lineHeight: 1.4 }}>{r.t}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ---------------- Tab: Analitis Penutup ---------------- */
function F520Final() {
  const checks = [
    { t: 'LK konsisten dengan pemahaman auditor atas entitas', ok: true },
    { t: 'Tidak ada hubungan tak biasa yang belum terjelaskan', ok: true },
    { t: 'Tren rasio kunci sejalan dengan kondisi bisnis & industri', ok: true },
    { t: 'Indikator going concern tidak memburuk (rujuk SA 570)', ok: true },
    { t: 'Pos-pos pengungkapan baru/material telah dianalisis', ok: false },
  ];
  const ratios = [
    { k: 'Marjin Kotor', py: '31,2%', cy: '31,5%', v: 'Stabil', ok: true },
    { k: 'Marjin Bersih', py: '8,9%', cy: '9,3%', v: 'Naik tipis', ok: true },
    { k: 'Perputaran Piutang', py: '6,1×', cy: '5,4×', v: 'Melambat', ok: false },
    { k: 'Rasio Lancar', py: '1,8×', cy: '1,9×', v: 'Membaik', ok: true },
    { k: 'DER', py: '1,1×', cy: '1,2×', v: 'Naik tipis', ok: true },
  ];
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 340px', gap: 12, alignItems: 'start' }}>
      <div className="grid" style={{ gap: 12 }}>
        <Panel noBody>
          <div className="panel-h"><h3>Prosedur Analitis Mendekati Akhir Audit (¶6)</h3><div style={{ flex: 1 }} /><Badge kind="amber">1 dalam proses</Badge></div>
          <div style={{ padding: '6px 14px 14px' }}>
            {checks.map((c, i) => (
              <div key={i} className="row gap10" style={{ padding: '10px 0', alignItems: 'flex-start', borderBottom: i < checks.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
                <span style={{ flex: '0 0 auto', marginTop: 1, color: c.ok ? 'var(--green)' : 'var(--amber)' }}>{c.ok ? <I.checkCircle size={16} /> : <I.clock size={16} />}</span>
                <div style={{ flex: 1, fontSize: 12, lineHeight: 1.45 }}>{c.t}</div>
              </div>
            ))}
          </div>
          <div className="panel" style={{ margin: 12, padding: '10px 12px', background: 'var(--blue-050)', borderColor: 'var(--blue-100)' }}>
            <div className="row gap8" style={{ alignItems: 'flex-start' }}>
              <span style={{ color: 'var(--blue)', flex: '0 0 auto' }}><I.book size={15} /></span>
              <span style={{ fontSize: 12, lineHeight: 1.45 }}>Tujuannya membantu auditor menyimpulkan apakah LK <b>konsisten secara keseluruhan</b> dengan pemahamannya. Hubungan tak konsisten yang teridentifikasi pada tahap ini dapat mengungkap risiko salah saji material yang belum dikenali sebelumnya.</span>
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid" style={{ gap: 12 }}>
        <Panel title="Rasio Kunci — PY vs CY">
          <table className="dtbl" style={{ marginTop: -4 }}>
            <thead><tr><th>Rasio</th><th className="num">PY</th><th className="num">CY</th><th style={{ width: 30 }}></th></tr></thead>
            <tbody>
              {ratios.map((r, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{r.k}<div className="tiny muted" style={{ fontWeight: 400 }}>{r.v}</div></td>
                  <td className="num mono tiny">{r.py}</td>
                  <td className="num mono tiny">{r.cy}</td>
                  <td>{r.ok ? <span style={{ color: 'var(--green)' }}><I.check size={14} /></span> : <span style={{ color: 'var(--amber)' }}><I.alert size={14} /></span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="panel" style={{ marginTop: 10, padding: '9px 11px', background: 'var(--amber-bg)', borderColor: 'transparent' }}>
            <div className="row ac gap8"><span style={{ color: 'var(--amber)' }}><I.alert size={14} /></span><span style={{ fontSize: 11, lineHeight: 1.4 }}>Perputaran piutang melambat — dirujuk ke pengujian CKPN (SA 540) & konfirmasi (SA 505).</span></div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

Object.assign(window, { SA520View });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { SA520View };
