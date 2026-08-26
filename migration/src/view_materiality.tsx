/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import type { Benchmark, MaterialityConfig, WTB } from './canon_types';
import { benchmarksFromWTB, wtbOn } from './canon_base';
import type { AjeLike } from './canon_base';
import { consolidatedBenchmarks, engagementBenchmarks } from './canon_part3';
import { useAudit, useFirm, useMateriality, useNav } from './contexts';
import { I } from './icons';
import { SubBar } from './shell';
import { Badge, Btn, LockBanner, Panel, Tabs } from './ui';
import { MatComponent, MatImpact, MatMemo, MatRevision, MatSpecific } from './view_materiality_parts';

/* ============================================================
   Asseris — Materiality Workspace (SA 320 · SA 450 · SA 600)
   Tabbed: Penentuan · Spesifik · Komponen · Dampak & SAD · Revisi · Memo
   Heavy tab panels live in view_materiality_parts.jsx
   ============================================================ */
const { useState: useStateM, useMemo: useMemoM } = React;

/* PR-A — tabel benchmark SA 320 DULU konstanta di sini, dan itulah akar cacatnya:
   PBT 85.200 jt tak pernah menyentuh buku besar (turunan WTB: 29.690 jt) sehingga
   OM kelebihan 2,87×, sementara tabel yang sama mencampur basis — pendapatan dari
   kolom unadjusted, total aset dari kolom adjusted. Kini diturunkan dari WTB
   perikatan aktif lewat `benchmarksFromWTB()`. Lihat PRD PR-A. */

const QUAL_FACTORS = [
  { id: 'listed', label: 'Entitas tercatat (publik)', note: 'Perhatian investor & OJK → cenderung lebih konservatif' },
  { id: 'covenant', label: 'Kovenan pembiayaan ketat', note: 'Salah saji kecil dapat memicu pelanggaran kovenan' },
  { id: 'firstyear', label: 'Audit tahun pertama', note: 'Risiko lebih tinggi pada saldo awal' },
  { id: 'fraud', label: 'Indikasi risiko kecurangan', note: 'SA 240 — turunkan ambang' },
];

/* PR-H2 — nama field konfigurasi dalam bahasa auditor, untuk banner cacat konfigurasi. */
const MAT_FIELD_LABEL: Record<string, string> = {
  benchId: 'benchmark',
  pct:     'persentase benchmark',
  pmPct:   'performance materiality (%)',
  cttPct:  'ambang jelas remeh (%)',
};

const TABS = [
  { id: 'det',  label: 'Penentuan' },
  { id: 'spec', label: 'Materialitas Spesifik' },
  { id: 'comp', label: 'Komponen (Grup)' },
  { id: 'sad',  label: 'Dampak & SAD' },
  { id: 'rev',  label: 'Revisi & Riwayat' },
  { id: 'memo', label: 'Memo & Persetujuan' },
];

function MaterialityCalc() {
  const { fmt } = AMS;
  const { activeEngagement, locked } = useFirm();
  const nav = useNav();

  const [tab, setTab] = window.useAmsPersist('mat.tab', 'det');
  const [quals, setQuals] = window.useAmsPersist('mat.quals', { listed: true, fraud: true });
  /* PR-6b — konfigurasi materialitas kini dimiliki AuditProvider (dihidrasi saat boot,
     jadi 8 modul hilir tak lagi memakai default pada cache dingin). Modul ini MENGIKAT
     ke sana alih-alih membuka `useAmsPersist` sendiri: dua instance `useServerState` atas
     satu kunci TIDAK saling sinkron dalam satu sesi, jadi menjadi pemilik kedua akan
     membuat suntingan di sini tak terlihat oleh WTB/SA 530 sampai remount — split-brain
     baru, kelas bug yang justru sedang diperbaiki. */
  const { matConfig, setMatConfig, wtb, aje } = useAudit() as {
    matConfig: MaterialityConfig; setMatConfig: (p: Partial<MaterialityConfig>) => void; wtb: WTB; aje: AjeLike[];
  };
  /* Basis `unadj` — SAMA dengan yang dikirim `useMateriality()` ke canon. Keduanya
     memanggil fungsi murni yang sama atas WTB yang sama, jadi tak ada split-brain:
     editor di modul ini dan OM yang dipakai modul hilir selalu satu tabel. */
  const BENCHMARKS = useMemoM(() => engagementBenchmarks(wtb), [wtb]);
  /* PR-H2 — laju (pct/pmPct/cttPct) TIDAK lagi diambil mentah dari `matConfig`; lihat
     di bawah setelah `useMateriality()`. Konfigurasi server dapat menyimpan `null`
     (ENG-2025-040), dan nilai itu dulu mengalir apa adanya ke slider (`value={null}`
     → peringatan React) serta ke label rail ("Performance · null%"). `benchId` &
     `appliedOverride` tetap dari config: yang pertama sudah punya fallback via
     `find(...) || BENCHMARKS[0]`, yang kedua `null`-nya BERARTI "tanpa override". */
  const { benchId, appliedOverride } = matConfig;
  const setBenchId = (v: string) => setMatConfig({ benchId: v });
  const setPct = (v: number) => setMatConfig({ pct: v });
  const setPmPct = (v: number) => setMatConfig({ pmPct: v });
  const setCttPct = (v: number) => setMatConfig({ cttPct: v });
  const setAppliedOverride = (v: number | null) => setMatConfig({ appliedOverride: v });

  /* Tanpa WTB, tabel kosong → tak ada benchmark. `null` (bukan baris nol) supaya
     UI dapat menyatakan "TB belum diimpor" alih-alih memamerkan OM Rp 0 yang
     tampak otoritatif. */
  const bench = BENCHMARKS.find((b: Benchmark) => b.id === benchId) || BENCHMARKS[0] || null;
  /* PR-6·0 — OM/PM/CTT ditarik dari canon, BUKAN dihitung ulang di sini. Dulu modul ini
     menghitung `om = bench.value × pct` sendiri sementara seluruh modul hilir memakai
     `materialityFor().omFull` yang (dulu) mengembalikan `engMateriality` → SATU perikatan
     menampilkan DUA PM (3.195 jt di sini vs 5.100 jt di WTB/SA 530), dan ukuran sampel
     SA 530 ikut berbeda 232 vs ~577 item. Dua akibat lain dari hitung-sendiri itu:
     (a) `mat.appliedOverride` DIABAIKAN di modul yang justru menerbitkannya — setelah
     "Terapkan ke Engagement", OM di rail tetap hitung benchmark; (b) rail berlabel
     "Terterapkan" menampilkan nilai baris perikatan walau tak ada yang pernah diterapkan.
     Canon adalah satu-satunya sumber presedens: override ?? benchmark × pct. */
  const mat = useMateriality();
  /* Laju TERSELESAIKAN dari canon — satu resolusi, dipakai editor DAN modul hilir.
     Membaca `matConfig` mentah di sini akan membuat slider menampilkan nilai yang
     berbeda dari ambang yang benar-benar berlaku begitu canon memakai default. */
  const { pct, pmPct, cttPct } = mat;
  const calcOM = bench ? Math.round(bench.value * pct / 100) : null;  // hitung benchmark live (pembanding editor)
  const om = mat.omFull != null ? mat.omFull : (calcOM ?? 0);
  const pm = mat.pmFull != null ? mat.pmFull : Math.round(om * pmPct / 100);
  /* PR-H4 · BASIS + REGISTER REAKTIF. Dulu `AMS.WTB.filter(r => Math.abs(r.adj) > pm)`:
     dua cacat sekaligus — (1) `AMS.WTB` adalah singleton BEKU, jadi hitungan ini tak
     bergerak saat WTB perikatan berubah (pola cache-dingin yang sama dgn #129/PR-6b);
     (2) kolom `adj` memuat usulan, sehingga "akun melampaui PM" menyaring populasi yang
     berbeda dari saldo yang akan tersaji di LK. Ambangnya PM — keputusan tentang LUAS
     PENGUJIAN — jadi salah populasi berarti salah ruang lingkup. */
  const akunDiAtasPm = useMemoM(() => (wtb || []).filter(r => Math.abs(wtbOn(wtb, aje, r.code, 'reported')) > pm).length, [wtb, aje, pm]);
  const ctt = mat.cttFull != null ? mat.cttFull : Math.round(om * cttPct / 100);
  /* `applied` = angka yang dipakai sbg PEMBANDING drift oleh tab Penentuan/Revisi/Memo:
     override bila ada, else nilai administratif di baris perikatan. Tetap seperti dulu —
     yang berubah hanya bahwa ia TIDAK LAGI menjadi OM di modul hilir. */
  const applied = appliedOverride != null ? appliedOverride : activeEngagement.materiality;
  /* PR-A - OM tahun lalu DULU di-hardcode 3_900_000_000. Kini diturunkan dari kolom
     `ly` WTB memakai benchmark & persentase yang SAMA, sehingga perbandingan YoY
     membandingkan dua angka yang benar-benar sebanding (bukan satu angka turunan
     melawan satu konstanta). null bila komparatif tak tersedia. */
  /* SA 600 PR-3b — komparatif tahun lalu HANYA sah bila populasinya sama. Sejak
     benchmark ditarik dari figur KONSOLIDASIAN, kolom `ly` WTB (saldo standalone
     induk) bukan pembanding yang sah: menampilkannya menghasilkan "+150%" yang
     sepenuhnya artefak perpindahan populasi, bukan perubahan materialitas.
     Paket pelaporan komponen tak membawa figur tahun lalu, sehingga OM grup TL
     memang belum dapat diturunkan → komparatif disembunyikan, bukan dikarang.
     (Mengaktifkannya kembali = tambahkan figur komparatif ke paket komponen.) */
  const konsolidasi = useMemoM(() => consolidatedBenchmarks(wtb).length > 0, [wtb]);
  const priorBench = useMemoM(
    () => (konsolidasi ? undefined : benchmarksFromWTB(wtb, 'ly').find((b: Benchmark) => b.id === benchId)),
    [wtb, benchId, konsolidasi]);
  const priorOM = priorBench ? Math.round(priorBench.value * pct / 100) : null;

  const rp = (n: any) => 'Rp ' + fmt(n);
  const pickBench = (id: any) => { const b = BENCHMARKS.find((x: any) => x.id === id); setBenchId(id); if (b) setPct(b.def); };
  const activeQuals = Object.keys(quals).filter(k => quals[k]).length;
  /* menerapkan = memaku hitung benchmark saat ini sbg override otoritatif (bukan `om`,
     yang bisa sudah berupa override lama → tombol jadi no-op senyap) */
  const onApply = () => { if (calcOM != null) setAppliedOverride(calcOM); };

  return (
    <>
      <SubBar moduleId="materiality" right={
        <div className="row gap8 ac">
          <Badge kind="blue">SA 320 · SA 450 · SA 600</Badge>
          <Btn sm onClick={() => setTab('memo')}><I.download size={13} /> Memo Materialitas</Btn>
          <Btn sm variant="primary" onClick={onApply}><I.check size={14} /> Terapkan ke Engagement</Btn>
        </div>
      } />
      <div className="view-scroll">
        {/* sticky tabs + persistent summary rail */}
        <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--surface)', borderBottom: '1px solid var(--line)' }}>
          <div style={{ padding: '0 14px' }}>
            <Tabs tabs={TABS} active={tab} onChange={setTab} />
          </div>
          <div className="row ac" style={{ gap: 0, padding: '0 14px', background: 'var(--surface-2)', borderTop: '1px solid var(--line-soft)' }}>
            {/* PR-6·0 · K0c — rail menyatakan BASIS OM yang berlaku, dan bila basisnya
                override maka hitung benchmark tetap ditampilkan agar selisihnya terlihat
                (bukan dua angka tanpa penjelasan di dua modul berbeda). */}
            {/* PR-I — tanpa benchmark, ambang TIDAK ADA; menampilkan "Rp 0" memberi angka
                yang tampak otoritatif untuk sesuatu yang belum pernah ditetapkan. Komentar
                di atas `bench` sudah menyatakan niat ini sejak PR-A ("bukan baris nol"),
                tetapi rail tetap jatuh ke 0 karena `om = mat.omFull ?? (calcOM ?? 0)`. */}
            <RailChip
              label={mat.basis === 'none' ? 'Overall (OM) · belum ditetapkan' : (mat.basis === 'override' ? 'Overall (OM) · terterapkan' : 'Overall (OM) · hitung benchmark')}
              value={mat.basis === 'none' ? 'TB belum diimpor' : rp(om)} strong />
            <RailChip label={`Performance · ${pmPct}%`} value={mat.basis === 'none' ? '—' : rp(pm)} />
            <RailChip label={`Jelas Remeh · ${cttPct}%`} value={mat.basis === 'none' ? '—' : rp(ctt)} />
            <RailChip label="Benchmark" value={bench ? `${bench.label} · ${pct}%` : 'TB belum diimpor'} />
            {mat.basis === 'override' && calcOM != null && calcOM !== om && (
              <RailChip label="Hitung benchmark kini" value={rp(calcOM)} />
            )}
            <div style={{ flex: 1 }} />
            <RailChip
              label={appliedOverride != null ? 'Terterapkan' : 'Baris perikatan · belum diterapkan'}
              value={rp(applied)} align="right" last />
          </div>
        </div>

        <div className="view-pad">
          {locked && <LockBanner />}

          {/* PR-I — perikatan tanpa neraca saldo TIDAK punya materialitas. Dulu ia
              diam-diam memakai konsolidasi klien lain (singleton `AMS.WTB`) dan
              menyajikannya berlabel "hitung benchmark". Kini dinyatakan, dan diberi
              jalan keluarnya. */}
          {mat.basis === 'none' && (
            <div className="panel" style={{ padding: '9px 12px', background: 'var(--amber-bg)', borderColor: 'transparent', marginBottom: 10 }}>
              <div className="tiny" style={{ fontWeight: 600, color: 'var(--amber)', lineHeight: 1.45 }}>
                <I.alert size={12} style={{ verticalAlign: 'middle' }} /> Neraca saldo perikatan ini belum diimpor, sehingga benchmark SA 320 tidak dapat diturunkan dan materialitas <b>belum ditetapkan</b>. Angka apa pun yang ditampilkan sebagai ambang tanpa TB akan berasal dari perikatan lain — karena itu tidak ditampilkan.
                <span style={{ textDecoration: 'underline', cursor: 'pointer', marginLeft: 6 }} onClick={() => nav('wtb', { from: 'materiality' })}>Impor neraca saldo</span>
              </div>
            </div>
          )}

          {/* PR-H2 — ambang yang diam-diam memakai default adalah ambang yang tak
              seorang pun tetapkan. Sebelum ini, konfigurasi ber-`null` menghasilkan
              PM Rp 0 tanpa satu pun pernyataan di layar. */}
          {mat.configDefects.length > 0 && (
            <div className="panel" style={{ padding: '8px 11px', background: 'var(--amber-bg)', borderColor: 'transparent', marginBottom: 10 }}>
              <div className="tiny" style={{ fontWeight: 600, color: 'var(--amber)', lineHeight: 1.4 }}>
                <I.alert size={12} style={{ verticalAlign: 'middle' }} /> Konfigurasi materialitas perikatan ini tidak memuat nilai untuk{' '}
                {mat.configDefects.map((f: string) => MAT_FIELD_LABEL[f] || f).join(' · ')} — default dipakai
                (benchmark {pct}% · PM {pmPct}% · jelas remeh {cttPct}%). Setel lalu simpan agar ambang ini
                menjadi keputusan yang tercatat (SA 320 ¶10-11), bukan warisan default.
              </div>
            </div>
          )}

          {tab === 'det' && (
            <MatDetermination
              bench={bench} benchmarks={BENCHMARKS} benchId={benchId} pickBench={pickBench}
              pct={pct} setPct={setPct} pmPct={pmPct} setPmPct={setPmPct} cttPct={cttPct} setCttPct={setCttPct}
              quals={quals} setQuals={setQuals} activeQuals={activeQuals}
              om={om} pm={pm} ctt={ctt} applied={applied} hasOverride={appliedOverride != null}
              priorOM={priorOM} rp={rp} locked={locked} akunDiAtasPm={akunDiAtasPm} />
          )}
          {tab === 'spec' && <MatSpecific om={om} pmPct={pmPct} locked={locked} />}
          {tab === 'comp' && <MatComponent om={om} cttPct={cttPct} locked={locked} />}
          {tab === 'sad'  && <MatImpact om={om} pm={pm} ctt={ctt} locked={locked} />}
          {tab === 'rev'  && <MatRevision om={om} applied={applied} locked={locked} />}
          {tab === 'memo' && <MatMemo bench={bench} pct={pct} pmPct={pmPct} cttPct={cttPct} om={om} pm={pm} ctt={ctt} applied={applied} onApply={onApply} locked={locked} />}
        </div>
      </div>
    </>
  );
}

/* ---------- Determination tab ---------- */
function MatDetermination({ bench, benchmarks, benchId, pickBench, pct, setPct, pmPct, setPmPct, cttPct, setCttPct, quals, setQuals, activeQuals, om, pm, ctt, applied, hasOverride, priorOM, rp, locked, akunDiAtasPm }: any) {
  const { fmt } = AMS;
  const nav = useNav();
  const toggleQ = (id: any) => setQuals((q: any) => ({ ...q, [id]: !q[id] }));

  /* PR-A · Q4 — tanpa neraca saldo tak ada benchmark, jadi tak ada materialitas
     yang dapat DITETAPKAN. Menyatakannya terbuka; jangan render kalkulator di atas
     angka nol yang tampak otoritatif. */
  if (!bench) {
    return (
      <Panel title="1 · Pemilihan Benchmark" sub="Dasar penentuan materialitas keseluruhan">
        <div className="panel" style={{ padding: '12px 14px', background: 'var(--amber-bg)', borderColor: 'transparent' }}>
          <div className="row gap8 ac">
            <span style={{ color: 'var(--amber)' }}><I.alert size={16} /></span>
            <span className="tiny" style={{ lineHeight: 1.5 }}>
              Neraca saldo perikatan ini belum diimpor, sehingga benchmark SA 320 tak dapat
              diturunkan. Angka pada baris perikatan adalah <b>nilai administratif</b>, bukan
              materialitas yang ditetapkan. Impor TB lebih dulu di modul Working Trial Balance.
            </span>
          </div>
        </div>
      </Panel>
    );
  }

  return (
    <div className="grid" style={{ gridTemplateColumns: '1.15fr 1fr', gap: 12, alignItems: 'start' }}>
      {/* LEFT — inputs */}
      <div className="grid" style={{ gap: 12 }}>
        <Panel title="1 · Pemilihan Benchmark" sub="Dasar penentuan materialitas keseluruhan">
          <table className="dtbl">
            <thead><tr><th style={{ width: 28 }}></th><th>Benchmark</th><th className="num">Nilai (Rp)</th><th className="num" style={{ width: 90 }}>Kisaran %</th></tr></thead>
            <tbody>
              {benchmarks.map((b: Benchmark) => (
                <tr key={b.id} className={b.id === benchId ? 'sel' : ''} onClick={() => !locked && pickBench(b.id)} style={{ cursor: locked ? 'default' : 'pointer' }}>
                  <td><span style={{ width: 15, height: 15, borderRadius: '50%', border: '2px solid ' + (b.id === benchId ? 'var(--blue)' : 'var(--line-strong)'), display: 'grid', placeItems: 'center' }}>{b.id === benchId && <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--blue-solid)' }} />}</span></td>
                  <td><div style={{ fontWeight: 600 }}>{b.label}</div><div className="tiny muted">{b.note}</div></td>
                  <td className="num">{fmt(b.value)}</td>
                  <td className="num tiny muted">{b.lo}–{b.hi}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <Panel title="2 · Persentase yang Diterapkan">
          <div style={{ padding: '4px 2px' }}>
            <SliderRow label={`Persentase Benchmark (${bench.label})`} value={pct} min={bench.lo} max={bench.hi} step={0.25} suffix="%" onChange={setPct} hint={`Kisaran lazim ${bench.lo}–${bench.hi}%`} disabled={locked} />
            <SliderRow label="Performance Materiality (% dari OM)" value={pmPct} min={50} max={90} step={1} suffix="%" onChange={setPmPct} hint="Buffer risiko agregasi salah saji" disabled={locked} />
            <SliderRow label="Clearly Trivial Threshold (% dari OM)" value={cttPct} min={1} max={10} step={0.5} suffix="%" onChange={setCttPct} hint="Ambang salah saji yang jelas remeh" disabled={locked} />
          </div>
        </Panel>

        <Panel title="3 · Faktor Kualitatif" sub="Pertimbangan yang menurunkan ambang">
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {QUAL_FACTORS.map(f => {
              const on = !!quals[f.id];
              return (
                <div key={f.id} onClick={() => !locked && toggleQ(f.id)}
                  className="panel" style={{ padding: '9px 11px', cursor: locked ? 'default' : 'pointer', background: on ? 'var(--blue-050)' : 'var(--surface)', borderColor: on ? 'var(--blue-100)' : 'var(--line)' }}>
                  <div className="row ac gap8">
                    <span style={{ width: 16, height: 16, borderRadius: 4, border: '2px solid ' + (on ? 'var(--blue)' : 'var(--line-strong)'), background: on ? 'var(--blue)' : 'transparent', display: 'grid', placeItems: 'center', flex: '0 0 16px' }}>{on && <I.check size={11} color="#fff" />}</span>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{f.label}</span>
                  </div>
                  <div className="tiny muted" style={{ marginTop: 4, lineHeight: 1.4 }}>{f.note}</div>
                </div>
              );
            })}
          </div>
          {activeQuals > 0 && (
            <div className="tiny" style={{ marginTop: 10, color: 'var(--ink-2)', lineHeight: 1.5 }}>
              <b>{activeQuals} faktor</b> aktif — pertimbangkan persentase pada batas bawah kisaran ({bench.lo}%) dan dokumentasikan alasan profesional.
            </div>
          )}
        </Panel>
      </div>

      {/* RIGHT — results */}
      <div className="grid" style={{ gap: 12 }}>
        <Panel noBody>
          <div style={{ background: 'linear-gradient(125deg,#013a52,#005085)', color: '#fff', padding: '16px 18px' }}>
            <div className="tiny" style={{ color: '#bcd6e4', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 3 }}>Overall Materiality (OM)</div>
            <div className="mono" style={{ fontSize: 28, fontWeight: 700, lineHeight: 1 }}>{rp(om)}</div>
            <div className="tiny" style={{ color: '#9fc0d2', marginTop: 5 }}>= {fmt(bench.value / 1e9, 1)} M × {pct}% ({bench.label})</div>
          </div>
          <div style={{ padding: '14px 18px' }}>
            {[
              ['Overall Materiality', om, '#005085', 100],
              ['Performance Materiality', pm, '#2f7bb0', pmPct],
              ['Clearly Trivial', ctt, '#9ac0db', cttPct],
            ].map(([lbl, val, color, w]) => (
              <div key={lbl} style={{ marginBottom: 11 }}>
                <div className="row jb ac" style={{ marginBottom: 3 }}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{lbl}</span>
                  <span className="mono" style={{ fontWeight: 700 }}>{rp(val)}</span>
                </div>
                <div style={{ height: 10, borderRadius: 6, background: 'var(--surface-3)' }}>
                  <div style={{ width: Math.max(4, w) + '%', height: '100%', borderRadius: 6, background: color }} />
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Perbandingan & Validasi">
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '12px 16px' }}>
            <Compare label="OM Berlaku (dipakai seluruh modul)" a={om} />
            <Compare label={hasOverride ? 'OM Terterapkan (locked)' : 'Nilai di baris perikatan'} a={applied} />
            <Compare label="OM Tahun Lalu" a={priorOM} />
            <div>
              <div className="tiny muted upper" style={{ marginBottom: 2 }}>Perubahan YoY</div>
              {priorOM ? (
                <div className="mono" style={{ fontSize: 15, fontWeight: 700, color: om > priorOM ? 'var(--amber)' : 'var(--green)' }}>
                  {om > priorOM ? '+' : ''}{((om - priorOM) / priorOM * 100).toFixed(1)}%
                </div>
              ) : (
                <div className="tiny muted">komparatif TA-1 tak tersedia</div>
              )}
            </div>
          </div>
          <div className="divider" />
          <div className="panel" style={{ padding: '10px 12px', background: Math.abs(om - applied) / applied > 0.1 ? 'var(--amber-bg)' : 'var(--green-bg)', borderColor: 'transparent' }}>
            <div className="row ac gap8">
              <span style={{ color: Math.abs(om - applied) / applied > 0.1 ? 'var(--amber)' : 'var(--green)' }}>
                {Math.abs(om - applied) / applied > 0.1 ? <I.alert size={16} /> : <I.checkCircle size={16} />}
              </span>
              <span style={{ fontSize: 12, fontWeight: 600 }}>
                {/* PR-6·0 — teks dibedakan: "menyimpang dari yang diterapkan" hanya benar
                    bila memang ADA override terterapkan. Tanpa override, pembandingnya
                    adalah nilai administratif di baris perikatan yang belum pernah
                    diterapkan — dan nilai itu TIDAK dipakai sebagai OM oleh modul mana pun. */}
                {Math.abs(om - applied) / applied > 0.1
                  ? (hasOverride
                      ? `OM usulan menyimpang ${(Math.abs(om - applied) / applied * 100).toFixed(0)}% dari yang diterapkan — perlu dokumentasi & persetujuan partner.`
                      : `Nilai di baris perikatan (${rp(applied)}) menyimpang ${(Math.abs(om - applied) / applied * 100).toFixed(0)}% dari OM yang berlaku — belum ada yang diterapkan. Tekan "Terapkan ke Engagement" atau perbarui baris perikatan.`)
                  : (hasOverride
                      ? 'OM usulan konsisten dengan nilai yang diterapkan pada engagement.'
                      : 'Nilai di baris perikatan konsisten dengan OM yang berlaku.')}
              </span>
            </div>
          </div>
        </Panel>

        <Panel title="Dampak ke Working Trial Balance">
          <div className="row jb ac">
            <span className="tiny muted">Akun melebihi Performance Materiality ({rp(pm)})</span>
            <Badge kind="red">{akunDiAtasPm} akun</Badge>
          </div>
          <div className="divider" />
          <div className="row gap8">
            <Btn sm style={{ flex: 1 }} onClick={() => nav('wtb')}><I.table size={14} /> Lihat di WTB</Btn>
            <Btn sm style={{ flex: 1 }}><I.sparkle size={14} /> Tanya AI Co-pilot</Btn>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function SliderRow({ label, value, min, max, step, suffix, onChange, hint, disabled }: any) {
  /* PR-H2 — pertahanan lapis terakhir: nilai tak terpakai (mis. `null` dari konfigurasi
     materialitas server) tak boleh mencapai DOM. React memperingatkan `value` null pada
     input terkendali, dan slider-nya melompat ke `min` tanpa satu pun penjelasan. */
  const v = (typeof value === 'number' && Number.isFinite(value)) ? value : min;
  return (
    <div style={{ marginBottom: 15 }}>
      <div className="row jb ac" style={{ marginBottom: 5 }}>
        <span style={{ fontSize: 12, fontWeight: 600 }}>{label}</span>
        <span className="mono" style={{ fontWeight: 700, color: 'var(--blue)' }}>{v}{suffix}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={v} disabled={disabled} onChange={(e: any) => onChange(+e.target.value)} style={{ width: '100%', accentColor: 'var(--blue)', opacity: disabled ? .5 : 1 }} />
      {hint && <div className="tiny muted" style={{ marginTop: 2 }}>{hint}</div>}
    </div>
  );
}

function Compare({ label, a }: any) {
  const { fmt } = AMS;
  return (
    <div>
      <div className="tiny muted upper" style={{ marginBottom: 2 }}>{label}</div>
      <div className="mono" style={{ fontSize: 15, fontWeight: 700 }}>{a != null ? 'Rp ' + fmt(a) : '—'}</div>
    </div>
  );
}

function RailChip({ label, value, strong, align, last }: any) {
  return (
    <div style={{ padding: '7px 16px 7px 0', marginRight: last ? 0 : 16, borderRight: last ? 'none' : '1px solid var(--line)', textAlign: align || 'left' }}>
      <div className="tiny muted upper" style={{ fontSize: 11, letterSpacing: '.06em' }}>{label}</div>
      <div className="mono" style={{ fontWeight: 700, fontSize: strong ? 'var(--fs-md)' : 'var(--fs-sm)', color: strong ? 'var(--blue)' : 'var(--ink)' }}>{value}</div>
    </div>
  );
}

/* PR-A — `BENCHMARKS` TIDAK lagi dipublikasikan ke window: tabelnya kini turunan
   WTB per-perikatan, sementara window bersifat global & statis. Fallback
   `window.BENCHMARKS` di canon_part4 kini hanya terpakai oleh stub uji. */


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { Compare, MaterialityCalc, SliderRow };
