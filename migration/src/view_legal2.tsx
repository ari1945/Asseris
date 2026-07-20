/* [codemod] ESM imports */
import React from 'react';
import { useFirm, useNav } from './contexts';
import { I } from './icons';
import { SubBar } from './shell';
import { Btn, Donut, Panel, Stat } from './ui';
import { BoBadge, BoStat, BoTabPanel, boJt, boM } from './view_bo1';
import { KV, SectionTitle } from './view_fpm_parts';
import { LGL_CAT, LglContractDrawer, LglSourceChip, ReconBadge } from './view_legal';
import { BO } from './data_backoffice';
import { LEGAL } from './data_legal';

/* ============================================================
   Asseris — Kontrak & Legal Firma · komponen utama (tabs)
   ============================================================ */
const { useState: useStateLgl2, useMemo: useMemoLgl2 } = React;

/* ---------- timeline tenggat (dipakai Ikhtisar & tab Kewajiban) ---------- */
function LglRenewalTimeline({ items, onSel }: any) {
  const sorted = [...items].filter(c => c.end).sort((a, b) => LEGAL.daysTo(a.end) - LEGAL.daysTo(b.end));
  if (!sorted.length) return <div className="tiny muted" style={{ padding: 12 }}>Tidak ada kontrak dengan tenggat dalam jangkauan.</div>;
  return (
    <div style={{ display: 'grid', gap: 9 }}>
      {sorted.map(c => {
        const d = LEGAL.daysTo(c.end);
        const pct = Math.max(4, Math.min(100, 100 - (d / 180 * 100)));
        const col = d < 30 ? 'var(--red)' : d < 120 ? 'var(--amber)' : 'var(--green)';
        const cat = (LGL_CAT as any)[c.category] || LGL_CAT.Layanan;
        return (
          <div key={c.id} className="panel" style={{ padding: '10px 12px', cursor: 'pointer' }} onClick={() => onSel && onSel(c)}>
            <div className="row jb ac" style={{ marginBottom: 6 }}>
              <span className="row ac gap8" style={{ minWidth: 0 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: cat.c, flex: '0 0 8px' }} />
                <span style={{ fontWeight: 600, fontSize: 12.5 }} className="truncate">{c.party}</span>
                <span className="tiny muted">· {cat.lbl}</span>
              </span>
              <span className="mono tiny" style={{ fontWeight: 700, color: col, flex: '0 0 auto' }}>{d < 0 ? 'lewat ' + Math.abs(d) + 'h' : d + ' hari'}</span>
            </div>
            <div style={{ height: 7, borderRadius: 4, background: 'var(--surface-3)' }}><div style={{ width: pct + '%', height: '100%', borderRadius: 4, background: col }} /></div>
            <div className="row jb tiny muted" style={{ marginTop: 4 }}><span>Berakhir {c.end} · {c.renewal}</span><span>{c.value === 0 ? 'MoU' : boJt(c.value)}</span></div>
          </div>
        );
      })}
    </div>
  );
}

function FirmLegal() {
  const firm = useFirm();
  const nav = useNav();
  const [tab, setTab] = useStateLgl2('overview');
  const [sel, setSel] = useStateLgl2(null);
  const [selDispute, setSelDispute] = useStateLgl2('LIT-03');
  const [catFilter, setCatFilter] = useStateLgl2('all');

  const register = useMemoLgl2(() => LEGAL.buildRegister(firm), [firm.engagements, firm.clients]);
  const legacy = useMemoLgl2(() => LEGAL.reconcileLegacy(firm), [firm.clients]);
  const disputes = BO.DISPUTES;
  const selCase = disputes.find((d: any) => d.id === selDispute);

  const totalValue = register.reduce((s: any, c: any) => s + c.value, 0);
  const renewSoon = register.filter((c: any) => c.end && LEGAL.daysTo(c.end) <= 120);
  const openLit = disputes.filter((d: any) => d.status !== 'Putusan');
  const exposure = openLit.reduce((s: any, d: any) => s + d.exposure, 0);
  const driftCount = legacy.filter((r: any) => r.state !== 'ok').length;
  const okCount = legacy.filter((r: any) => r.state === 'ok').length;

  /* komposisi per kategori */
  const byCat = useMemoLgl2(() => {
    const m = {};
    register.forEach((c: any) => { ((m as any)[c.category] = (m as any)[c.category] || { n: 0, v: 0 }); (m as any)[c.category].n++; (m as any)[c.category].v += c.value; });
    return Object.keys(m).map(k => ({ cat: k, ...(m as any)[k], color: ((LGL_CAT as any)[k] || {}).c }));
  }, [register]);

  const engLetters = register.filter((c: any) => c.category === 'Perikatan');
  const engTotal = engLetters.reduce((s: any, c: any) => s + c.value, 0);
  const filteredReg = catFilter === 'all' ? register : register.filter((c: any) => c.category === catFilter);

  const tabs = [
    { id: 'overview', label: 'Ikhtisar' },
    { id: 'registry', label: 'Registri Kontrak', count: register.length },
    { id: 'engagement', label: 'Surat Perikatan', count: engLetters.length },
    { id: 'obligations', label: 'Kewajiban & Tenggat', count: renewSoon.length },
    { id: 'dispute', label: 'Sengketa & Litigasi', count: disputes.length },
    { id: 'lineage', label: 'Lineage & Rekonsiliasi', count: driftCount || undefined },
  ];

  return (
    <>
      <SubBar moduleId="legal" right={
        <div className="row gap8 ac">
          {driftCount > 0 && <span className="chip tiny" style={{ color: 'var(--amber)' }} title="Entri registri legacy yang belum selaras dengan SSOT"><I.alert size={11} /> {driftCount} perlu sinkron</span>}
          <span className="chip tiny"><I.gavel size={11} /> {openLit.length} perkara aktif</span>
          <span className="chip tiny muted" title="Read-only — entri kontrak dikelola di CoreSys (roadmap)"><I.lock size={11} /> Read-only</span>
        </div>
      } />
      <div className="view-scroll"><div className="view-pad">

        <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
          <BoStat value={register.length} label="Total Kontrak Terkelola" />
          <BoStat value={boM(totalValue, 1)} label="Nilai Portofolio Kontrak" accent="var(--blue)" />
          <BoStat value={renewSoon.length} label="Tenggat ≤120 hari" accent={renewSoon.length ? 'var(--amber)' : 'var(--green)'} />
          <BoStat value={boM(exposure, 1)} label="Eksposur Litigasi" accent="var(--red)" />
        </div>

        <BoTabPanel tabs={tabs} tab={tab} setTab={setTab}>

          {/* ====================== IKHTISAR ====================== */}
          {tab === 'overview' && (
            <div className="view-pad" style={{ paddingTop: 14 }}>
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 14, alignItems: 'start' }}>
                <Panel title="Komposisi Portofolio Kontrak" sub="berdasarkan kategori sumber">
                  <div className="row gap14" style={{ alignItems: 'center' }}>
                    <Donut segments={byCat.map((x: any) => ({ label: x.cat, value: Math.max(x.v, 1), color: x.color }))} size={118} thickness={17}
                      center={<><div className="mono" style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)' }}>{register.length}</div><div className="tiny muted">kontrak</div></>} />
                    <div style={{ flex: 1 }}>
                      {byCat.map((x: any) => (
                        <div key={x.cat} className="row jb ac" style={{ padding: '5px 0', borderBottom: '1px solid var(--line-soft)' }}>
                          <span className="row ac gap8"><span style={{ width: 9, height: 9, borderRadius: 2, background: x.color }} /><span style={{ fontSize: 12, fontWeight: 600 }}>{((LGL_CAT as any)[x.cat] || {}).lbl || x.cat}</span><span className="tiny muted">· {x.n}</span></span>
                          <span className="mono tiny" style={{ fontWeight: 700 }}>{x.v === 0 ? '—' : boJt(x.v)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Panel>

                <Panel title="Kesehatan Sumber Kebenaran" sub="ketertelusuran registri">
                  <div style={{ display: 'grid', gap: 10 }}>
                    <div className="panel" style={{ padding: '11px 13px', background: 'var(--green-bg)', borderColor: 'transparent' }}>
                      <div className="row ac gap8"><I.link2 size={15} style={{ color: 'var(--green)' }} /><b style={{ fontSize: 12.5 }}>100% kontrak tertaut ke modul sumber</b></div>
                      <div className="tiny muted" style={{ marginTop: 5, lineHeight: 1.5 }}>Seluruh {register.length} kontrak menarik nilainya dari Engagement/CRM, Vendor, Lisensi, atau Asuransi — tidak ada angka yang disalin manual.</div>
                    </div>
                    <div className="row gap10">
                      <div className="panel" style={{ flex: 1, padding: '10px 12px' }}><Stat value={okCount} label="Legacy konsisten" accent="var(--green)" /></div>
                      <div className="panel" style={{ flex: 1, padding: '10px 12px' }}><Stat value={driftCount} label="Perlu sinkronisasi" accent={driftCount ? 'var(--amber)' : 'var(--green)'} /></div>
                    </div>
                    <button type="button" className="lin-cta" onClick={() => setTab('lineage')} style={{ alignSelf: 'flex-start' }}>
                      <I.search2 size={13} /> Buka Lineage & Rekonsiliasi
                    </button>
                  </div>
                </Panel>
              </div>

              <div className="grid" style={{ gridTemplateColumns: '1.2fr 1fr', gap: 14, alignItems: 'start', marginTop: 14 }}>
                <Panel title="Tenggat & Perpanjangan Terdekat" sub="≤180 hari">
                  <LglRenewalTimeline items={renewSoon.length ? renewSoon : register} onSel={setSel} />
                </Panel>
                <Panel title="Eksposur Litigasi" sub={openLit.length + ' perkara aktif'}>
                  <div style={{ display: 'grid', gap: 9 }}>
                    {disputes.map((d: any) => (
                      <div key={d.id} className="row jb ac" style={{ padding: '8px 10px', borderRadius: 7, border: '1px solid var(--line)', cursor: 'pointer' }} onClick={() => { setSelDispute(d.id); setTab('dispute'); }}>
                        <div style={{ minWidth: 0 }}>
                          <div className="row ac gap6"><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{d.id}</span><BoBadge s={d.status} /></div>
                          <div className="tiny muted truncate" style={{ maxWidth: 230, marginTop: 2 }}>{d.lawan}</div>
                        </div>
                        <span className="mono tiny" style={{ fontWeight: 700, color: d.risk === 'Tinggi' ? 'var(--red)' : 'var(--ink-2)' }}>{boJt(d.exposure)}</span>
                      </div>
                    ))}
                  </div>
                </Panel>
              </div>
            </div>
          )}

          {/* ====================== REGISTRI ====================== */}
          {tab === 'registry' && (
            <div>
              <div className="row ac gap8" style={{ padding: '10px 14px 0', flexWrap: 'wrap' }}>
                <span className="tiny muted" style={{ fontWeight: 600 }}>Filter:</span>
                <button className={'chip tiny' + (catFilter === 'all' ? ' on' : '')} onClick={() => setCatFilter('all')} style={{ cursor: 'pointer', background: catFilter === 'all' ? 'var(--navy)' : undefined, color: catFilter === 'all' ? '#fff' : undefined }}>Semua · {register.length}</button>
                {Object.keys(LGL_CAT).map(k => {
                  const n = register.filter((c: any) => c.category === k).length;
                  if (!n) return null;
                  return <button key={k} className="chip tiny" onClick={() => setCatFilter(k)} style={{ cursor: 'pointer', background: catFilter === k ? (LGL_CAT as any)[k].c : undefined, color: catFilter === k ? '#fff' : undefined }}>{(LGL_CAT as any)[k].lbl} · {n}</button>;
                })}
              </div>
              <table className="dtbl">
                <thead><tr><th>ID</th><th>Pihak / Counterparty</th><th>Kategori</th><th className="num">Nilai</th><th>Berakhir</th><th>Sumber Kebenaran</th><th>Status</th></tr></thead>
                <tbody>
                  {filteredReg.map((c: any) => {
                    const d = c.end ? LEGAL.daysTo(c.end) : null;
                    const cat = (LGL_CAT as any)[c.category] || LGL_CAT.Layanan;
                    return (
                      <tr key={c.id} onClick={() => setSel(c)} style={{ cursor: 'pointer' }} className={sel && sel.id === c.id ? 'sel' : ''}>
                        <td className="mono tiny" style={{ fontWeight: 700, color: cat.c }}>{c.id}</td>
                        <td style={{ fontWeight: 600, fontSize: 11.5 }}>{c.party}<div className="tiny muted" style={{ fontWeight: 400 }}>{c.type.replace(/^(Surat Perikatan|Lisensi|Polis) — /, '')}</div></td>
                        <td><span className="badge b-gray" style={{ textTransform: 'none' }}>{cat.lbl}</span></td>
                        <td className="num">{c.value === 0 ? '—' : boJt(c.value)}</td>
                        <td className="tiny mono" style={{ color: d == null ? 'var(--ink-3)' : d < 30 ? 'var(--red)' : d < 120 ? 'var(--amber)' : 'var(--ink-2)' }}>{c.end || '—'}{d != null ? <span className="muted"> · {d}h</span> : null}</td>
                        <td><LglSourceChip kind={c.source.kind} id={c.source.id} onNav={nav} /></td>
                        <td><BoBadge s={c.status} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ====================== SURAT PERIKATAN ====================== */}
          {tab === 'engagement' && (
            <div className="view-pad" style={{ paddingTop: 14 }}>
              <div className="panel" style={{ padding: '12px 14px', marginBottom: 12, background: 'var(--blue-050)', borderColor: 'var(--blue-100)' }}>
                <div className="row ac gap8" style={{ marginBottom: 6 }}><I.link2 size={15} style={{ color: 'var(--blue)' }} /><b style={{ fontSize: 12.5 }}>Satu sumber kebenaran: nilai surat perikatan = fee klien</b></div>
                <div className="tiny muted" style={{ lineHeight: 1.55 }}>Tiap surat perikatan dibangkitkan dari <b>Engagement Mgmt</b>; nilainya mengikuti <b>fee klien di CRM</b>. Total nilai perikatan <b>{boJt(engTotal)}</b> identik dengan portofolio fee di CRM dan menjadi dasar termin di <b>Billing</b> — tidak ada angka ganda.</div>
              </div>
              <table className="dtbl">
                <thead><tr><th>ID</th><th>Klien</th><th>Jenis Perikatan</th><th>Standar</th><th className="num">Nilai (fee)</th><th>Partner</th><th>Status</th><th>Tautan</th></tr></thead>
                <tbody>
                  {engLetters.map((c: any) => (
                    <tr key={c.id}>
                      <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{c.id}</td>
                      <td style={{ fontWeight: 600, fontSize: 11.5, cursor: 'pointer' }} onClick={() => setSel(c)}>{c.party}</td>
                      <td className="tiny">{c.type.replace('Surat Perikatan — ', '')}</td>
                      <td className="tiny muted">{c.meta.standard}</td>
                      <td className="num" style={{ fontWeight: 600 }}>{boJt(c.value)}</td>
                      <td className="tiny">{c.owner}</td>
                      <td><BoBadge s={c.status} /></td>
                      <td>
                        <div className="row gap4">
                          <button className="btn sm icon" title="Buka di CRM (fee klien)" style={{ height: 22, width: 22 }} onClick={() => nav('crm', { from: 'legal' })}><I.users size={12} /></button>
                          <button className="btn sm icon" title="Buka di Engagement Mgmt" style={{ height: 22, width: 22 }} onClick={() => nav('engagement', { from: 'legal' })}><I.briefcase size={12} /></button>
                          <button className="btn sm icon" title="Buka di Billing" style={{ height: 22, width: 22 }} onClick={() => nav('billing', { from: 'legal' })}><I.receipt size={12} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr><td colSpan={4}>TOTAL NILAI PERIKATAN (= portofolio fee CRM)</td><td className="num">{boJt(engTotal)}</td><td colSpan={3}></td></tr></tfoot>
              </table>
            </div>
          )}

          {/* ====================== KEWAJIBAN & TENGGAT ====================== */}
          {tab === 'obligations' && (
            <div className="view-pad" style={{ paddingTop: 14 }}>
              <SectionTitle right={<span className="mono tiny muted">{renewSoon.length} kontrak ≤120 hari</span>}>Garis Waktu Tenggat & Perpanjangan</SectionTitle>
              <LglRenewalTimeline items={renewSoon.length ? renewSoon : register} onSel={setSel} />
              <div className="panel" style={{ padding: '10px 12px', marginTop: 12, background: 'var(--amber-bg)', borderColor: 'transparent' }}>
                <div className="tiny" style={{ lineHeight: 1.55 }}><I.bell size={13} style={{ verticalAlign: -2, color: 'var(--amber)' }} /> Tenggat ditarik langsung dari tanggal berakhir di modul sumber (deadline engagement, masa lisensi, jatuh tempo polis). Mengubah tanggal di modul sumber memperbarui kalender ini secara otomatis.</div>
              </div>
            </div>
          )}

          {/* ====================== SENGKETA & LITIGASI ====================== */}
          {tab === 'dispute' && (
            <div className="view-pad" style={{ paddingTop: 14 }}>
              <div className="grid" style={{ gridTemplateColumns: '1.25fr 1fr', gap: 14, alignItems: 'start' }}>
                <table className="dtbl" style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid var(--line)' }}>
                  <thead><tr><th>ID</th><th>Lawan / Perkara</th><th className="num">Eksposur</th><th>Risiko</th><th>Status</th></tr></thead>
                  <tbody>
                    {disputes.map((d: any) => (
                      <tr key={d.id} className={d.id === selDispute ? 'sel' : ''} onClick={() => setSelDispute(d.id)} style={{ cursor: 'pointer' }}>
                        <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{d.id}</td>
                        <td><div style={{ fontWeight: 600, fontSize: 11.5 }}>{d.lawan}</div><div className="tiny muted truncate" style={{ maxWidth: 220 }}>{d.perkara}</div></td>
                        <td className="num">{boJt(d.exposure)}</td>
                        <td><BoBadge s={d.risk} /></td>
                        <td><BoBadge s={d.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {selCase && (
                  <Panel noBody>
                    <div style={{ background: 'var(--surface-2)', padding: '10px 14px', borderBottom: '1px solid var(--line)' }} className="row ac gap8">
                      <span className="mono" style={{ fontWeight: 700, color: 'var(--blue)' }}>{selCase.id}</span>
                      <div style={{ flex: 1 }} />
                      <BoBadge s={selCase.risk} />
                    </div>
                    <div style={{ padding: 14 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{selCase.lawan}</div>
                      <div className="tiny muted" style={{ lineHeight: 1.5, marginBottom: 10 }}>{selCase.perkara}</div>
                      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                        <KV label="Forum" v={selCase.forum} />
                        <KV label="Kuasa Hukum" v={selCase.kuasa} />
                        <KV label="Eksposur" v={boJt(selCase.exposure)} accent="var(--red)" />
                        <KV label="Sejak" v={selCase.mulai} />
                      </div>
                      <SectionTitle>Keterkaitan Lintas-Modul</SectionTitle>
                      <div style={{ display: 'grid', gap: 7 }}>
                        {((LEGAL.DISPUTE_LINKS as any)[selCase.id] || []).map((lk: any, i: any) => {
                          const Ic = (I as any)[lk.icon] || I.link2;
                          return (
                            <button key={i} type="button" className="lin-chip" style={{ borderLeftColor: 'var(--red)' }} onClick={() => nav(lk.module, { from: 'legal' })} title={'Buka ' + lk.label}>
                              <span className="lin-ic" style={{ color: 'var(--red)' }}><Ic size={14} /></span>
                              <span className="lin-txt"><span className="lin-lbl">{lk.label}</span><span className="lin-rel">{lk.rel}</span></span>
                              <span className="lin-go"><I.arrowRight size={12} /></span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </Panel>
                )}
              </div>
            </div>
          )}

          {/* ====================== LINEAGE & REKONSILIASI ====================== */}
          {tab === 'lineage' && (
            <div className="view-pad" style={{ paddingTop: 14 }}>
              <SectionTitle right={<span className="badge b-green" style={{ textTransform: 'none' }}>{register.length}/{register.length} tertaut</span>}>Ketertelusuran Sumber (registri aktif)</SectionTitle>
              <table className="dtbl" style={{ marginBottom: 18 }}>
                <thead><tr><th>Kontrak</th><th>Kategori</th><th className="num">Nilai (ditarik)</th><th>Modul Sumber</th><th>Status</th></tr></thead>
                <tbody>
                  {register.map((c: any) => (
                    <tr key={c.id}>
                      <td className="mono tiny" style={{ fontWeight: 700 }}>{c.id}<div className="tiny muted" style={{ fontWeight: 400 }}>{c.party}</div></td>
                      <td className="tiny">{((LGL_CAT as any)[c.category] || {}).lbl}</td>
                      <td className="num">{c.value === 0 ? '—' : boJt(c.value)}</td>
                      <td><LglSourceChip kind={c.source.kind} id={c.source.id} onNav={nav} /></td>
                      <td><span className="badge b-green" style={{ textTransform: 'none' }}>✓ Tertaut</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <SectionTitle right={<span className="mono tiny muted">{okCount} konsisten · {driftCount} perlu tindakan</span>}>Rekonsiliasi Registri Legacy → SSOT</SectionTitle>
              <div className="panel" style={{ padding: '10px 12px', marginBottom: 10, background: driftCount ? 'var(--amber-bg)' : 'var(--green-bg)', borderColor: 'transparent' }}>
                <div className="tiny" style={{ lineHeight: 1.55 }}>
                  <I.shield size={13} style={{ verticalAlign: -2, color: driftCount ? 'var(--amber)' : 'var(--green)' }} /> Registri lama (entri manual KTR-xxx) dibandingkan terhadap sumber kebenaran. <b>Selisih</b> menandai nilai tercatat ≠ nilai sumber; <b>orphan</b> menandai entri yang tak punya sumber (mis. klien tidak terdaftar di CRM) dan harus ditinjau.
                </div>
              </div>
              <table className="dtbl">
                <thead><tr><th>Legacy</th><th>Pihak</th><th>Jenis</th><th className="num">Tercatat</th><th className="num">Sumber (SSOT)</th><th className="num">Selisih</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {legacy.map((r: any) => {
                    const diff = r.srcValue == null ? null : r.recorded - r.srcValue;
                    return (
                      <tr key={r.id} style={{ background: r.state === 'ok' ? undefined : r.state === 'drift' ? 'var(--amber-bg)' : 'var(--red-bg)' }}>
                        <td className="mono tiny" style={{ fontWeight: 700 }}>{r.id}</td>
                        <td className="tiny" style={{ fontWeight: 600 }}>{r.party}</td>
                        <td className="tiny muted">{r.type}</td>
                        <td className="num">{boJt(r.recorded)}</td>
                        <td className="num">{r.srcValue == null ? '—' : boJt(r.srcValue)}</td>
                        <td className="num" style={{ color: diff ? 'var(--red)' : 'var(--ink-3)', fontWeight: diff ? 700 : 400 }}>{diff == null ? '—' : diff === 0 ? '0' : (diff > 0 ? '+' : '') + boJt(diff).replace('Rp ', '')}</td>
                        <td><ReconBadge state={r.state} /></td>
                        <td>{r.src ? <button className="btn sm" style={{ height: 22 }} onClick={() => nav((LEGAL.SOURCE_META as any)[r.src.kind].module, { from: 'legal' })}><I.arrowRight size={11} /> Sumber</button> : <span className="tiny muted">tinjau</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="tiny muted" style={{ marginTop: 10, lineHeight: 1.5 }}>Contoh orphan: <b>KTR-145</b> (Bank Niaga Sejahtera) tidak ditemukan di daftar klien CRM — kemungkinan salah entri; klien dengan fee setara adalah PT Mandiri Sejahtera Finance. Item ini perlu dipetakan ulang atau dihapus dari registri.</div>
            </div>
          )}

        </BoTabPanel>
      </div></div>

      <LglContractDrawer c={sel} onClose={() => setSel(null)} onNav={nav} />
    </>
  );
}

Object.assign(window, { FirmLegal, LglRenewalTimeline });

/* lineage dock dua-arah untuk modul Kontrak & Legal (SSOT) */
if (window.LINEAGE) {
  window.LINEAGE.legal = {
    std: 'Backoffice · Kontrak & Legal (Single Source of Truth)',
    up: [
      { id: 'engagement', ic: 'briefcase', lbl: 'Engagement Mgmt', rel: 'Surat perikatan & tenggat → registri kontrak' },
      { id: 'crm', ic: 'users', lbl: 'Client CRM', rel: 'Fee klien = nilai surat perikatan (sumber tunggal)' },
      { id: 'procurement', ic: 'cart', lbl: 'Pengadaan & Vendor', rel: 'Kontrak vendor, sewa & MoU' },
      { id: 'facilities', ic: 'building', lbl: 'Aset & Fasilitas', rel: 'Lisensi software → kontrak & masa berlaku' },
      { id: 'insurance', ic: 'umbrella', lbl: 'Asuransi (PII) & Risiko', rel: 'Polis (premi) & risk register' },
    ],
    down: [
      { id: 'billing', ic: 'receipt', lbl: 'Billing & Invoicing', rel: 'Nilai perikatan → termin & faktur' },
      { id: 'records', ic: 'archive', lbl: 'Retensi & Arsip', rel: 'Legal hold atas sengketa → tahan disposal' },
      { id: 'insurance', ic: 'umbrella', lbl: 'Asuransi (PII) & Risiko', rel: 'Sengketa → klaim PII & eksposur risiko' },
      { id: 'governance', ic: 'building', lbl: 'Governance (SOQM)', rel: 'Kepatuhan kontraktual & litigasi → mutu firma' },
    ],
  };
}


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { FirmLegal, LglRenewalTimeline };
