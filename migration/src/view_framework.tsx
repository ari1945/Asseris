/* [codemod] ESM imports */
import React from 'react';
import { useNav, useAmsPersist } from './contexts';
import { I } from './icons';
import { SubBar } from './shell';
import { Badge, Btn, Panel } from './ui';
import {
  fwDetermine, fwUmkmTier, fwPortfolio, FW_SALES_CEIL, FW_CAP_CEIL,
  FW_JUDGEMENT_KOSONG, FW_JUDGEMENT_LABEL,
  type FwEntity, type FwInput, type FwResult, type Tri, type FwCode,
  type FwJudgement, type FwJudgements,
} from './fw_canon';

/* ============================================================
   Asseris — Penentu Kerangka Pelaporan Berjenjang
   (SAK / SAK EP / SAK EMKM)
   ------------------------------------------------------------
   Alat keputusan di gerbang akseptasi/onboarding yang menetapkan
   kerangka pelaporan keuangan yang berlaku bagi suatu entitas —
   menjawab gap G4 (Evaluasi Kepatuhan SAK). Pohon keputusan:

     1. Akuntabilitas publik?  (emiten / fidusia lembaga keuangan)
            └─ YA → SAK (PSAK berbasis IFRS)
     2. Memenuhi kriteria UMKM (UU 20/2008 jo. PP 7/2021)?
            └─ TIDAK (entitas besar) → SAK EP
     3. Kebutuhan pengguna / kompleksitas transaksi?
            ├─ kompleks / pengguna canggih / pilih naik → SAK EP
            └─ sederhana → SAK EMKM

   Keluaran mengikat ke: jenis perikatan, bentuk opini (SA 700/800),
   kedalaman daftar-uji pengungkapan, FS Generator. Satu fungsi
   penentu (fwDetermine) dipakai untuk kandidat & seluruh portofolio
   (SSOT) — sehingga klasifikasi konsisten lintas modul.
   ============================================================ */
const { useState: useStateFW, useMemo: useMemoFW, useEffect: useEffectFW } = React;

/* metadata kerangka — hanya urusan TAMPILAN (warna, label, teks).
   Ambang & logika penetapan ada di `fw_canon.ts`. */
interface FwMeta {
  label: string; full: string; short: string;
  accent: string; text: string; fg: string; tint: string;
  opinion: string; who: string;
}
const FW_META: Record<FwCode, FwMeta> = {
  'SAK':      { label: 'SAK', full: 'SAK — Standar Akuntansi Keuangan (PSAK berbasis IFRS)', short: 'PSAK penuh', accent: 'var(--blue-solid)', text: 'var(--blue)', fg: 'var(--b-blue-fg)', tint: 'var(--blue-100)', opinion: 'SA 700 — kerangka bertujuan umum penyajian wajar', who: 'Entitas dengan akuntabilitas publik' },
  'SAK EP':   { label: 'SAK EP', full: 'SAK Entitas Privat (efektif 1 Jan 2025, pengganti SAK ETAP)', short: 'Entitas Privat', accent: 'var(--teal-solid)', text: 'var(--teal)', fg: 'var(--b-teal-fg)', tint: 'var(--teal-bg)', opinion: 'SA 700 — kerangka bertujuan umum penyajian wajar', who: 'Entitas tanpa akuntabilitas publik' },
  'SAK EMKM': { label: 'SAK EMKM', full: 'SAK Entitas Mikro, Kecil, dan Menengah', short: 'Mikro–Menengah', accent: 'var(--purple-solid)', text: 'var(--purple)', fg: 'var(--b-purple-fg)', tint: 'var(--purple-bg)', opinion: 'SA 700/800 — basis akuntansi sesuai SAK EMKM', who: 'UMKM tanpa akuntabilitas publik' },
};
const FW_ORDER: readonly FwCode[] = ['SAK', 'SAK EP', 'SAK EMKM'];

/* ---- format Rupiah dalam miliar/triliun ---- */
function fwRp(v: number | null) {
  if (v === null) return '—';
  if (v >= 1e12) return 'Rp ' + (v / 1e12).toLocaleString('id-ID', { maximumFractionDigits: 2 }) + ' T';
  if (v >= 1e9) return 'Rp ' + (v / 1e9).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + ' M';
  return 'Rp ' + (v / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 0 }) + ' jt';
}

/* Kontrol ringkas di dalam baris tabel — supaya pertanyaan yang menahan
   penetapan dapat dijawab DI TEMPAT. Tanpa ini portofolio hanya mengeluh
   "belum dinilai" tanpa memberi jalan menjawabnya, dan keadaan jujur berubah
   menjadi jalan buntu. */
function FWTriMini({ label, value, onChange }: { label: string; value: Tri; onChange: (v: Tri) => void }) {
  const opsi: ReadonlyArray<readonly [string, Tri]> = [['Ya', true], ['Tidak', false]];
  return (
    <div style={{ display: 'grid', gap: 3, marginBottom: 6 }}>
      <div className="tiny" style={{ color: 'var(--ink-3)', lineHeight: 1.35 }}>{label}</div>
      <div className="row gap8" style={{ gap: 4 }}>
        {opsi.map(([teks, v]) => (
          <button key={teks} onClick={() => onChange(v)} aria-pressed={value === v}
            style={{
              fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6, cursor: 'pointer',
              border: '1px solid ' + (value === v ? 'var(--blue)' : 'var(--line)'),
              background: value === v ? 'var(--blue-100)' : 'var(--surface)',
              color: value === v ? 'var(--b-blue-fg)' : 'var(--ink-2)',
            }}>{teks}</button>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   PORTOFOLIO & MESIN — keduanya kini milik `fw_canon.ts`.

   Sebelumnya berkas ini memikul `fwDetermine` DAN larik `FW_PORTFOLIO`
   berisi 9 entri literal yang membayangi `AMS.CLIENTS` — dua di antaranya
   membantah sumbernya. Modul ini sekarang hanya MENGGAMBAR; angka dan
   keputusan datang dari kanon.
   ============================================================ */

/* ---- matriks pembanding tiga kerangka ---- */
const FW_COMPARE = [
  { dim: 'Dasar pengaturan', sak: 'PSAK berbasis IFRS (DSAK-IAI) — lengkap', ep: 'SAK EP — satu buku, modul mandiri', emkm: 'SAK EMKM — ringkas, basis akrual' },
  { dim: 'Pengguna yang dituju', sak: 'Investor & kreditur pasar modal, regulator', ep: 'Pengguna eksternal entitas privat (bank, pemegang saham)', emkm: 'Manajemen, kreditur mikro, fiskus' },
  { dim: 'Pengukuran nilai wajar', sak: 'Luas (PSAK 68, instrumen keuangan, properti investasi)', ep: 'Terbatas — sebagian besar model biaya', emkm: 'Tidak ada — biaya historis sepenuhnya' },
  { dim: 'Pajak tangguhan (PSAK 46)', sak: 'Wajib diakui', ep: 'Wajib (versi sederhana)', emkm: 'Tidak diakui — beban pajak = pajak terutang' },
  { dim: 'Komponen LK', sak: '5 laporan + CALK lengkap', ep: '5 laporan + CALK proporsional', emkm: '3 laporan: Posisi Keuangan, L/R, CALK' },
  { dim: 'Konsolidasi & instrumen', sak: 'PSAK 65/71/72/73 berlaku penuh', ep: 'Diatur, lebih sederhana', emkm: 'Tidak diwajibkan konsolidasi' },
  { dim: 'Bentuk opini auditor', sak: 'SA 700 — penyajian wajar', ep: 'SA 700 — penyajian wajar', emkm: 'SA 700/800 — basis akuntansi tertentu' },
];

/* ---- standar perikatan terkait keluaran penentu ---- */
const FW_STD_LINKS = [
  { code: 'SA 210', title: 'Persetujuan Ketentuan Perikatan — keberterimaan kerangka pelaporan', view: null },
  { code: 'SA 700', title: 'Perumusan Opini & Pelaporan atas LK', view: 'sa705' },
  { code: 'SA 800', title: 'Pertimbangan Khusus — kerangka bertujuan khusus', view: 'sa800' },
];

/* ============================================================
   sub-komponen kecil
   ============================================================ */
function FWStat({ value, label, sub, accent }: any) {
  return (
    <div className="panel" style={{ padding: '12px 14px', display: 'grid', gap: 2 }}>
      <div style={{ fontSize: 19, fontWeight: 800, color: accent || 'var(--navy)', lineHeight: 1.05, letterSpacing: '-.01em' }}>{value}</div>
      <div className="tiny muted" style={{ fontWeight: 700 }}>{label}</div>
      {sub && <div className="tiny" style={{ color: 'var(--ink-4)' }}>{sub}</div>}
    </div>
  );
}

function FWChip({ fw, sm }: { fw: FwCode | null; sm?: boolean }) {
  /* Kerangka yang belum disimpulkan digambar sebagai keadaan tersendiri —
     BUKAN chip kosong dan bukan chip kerangka mana pun. */
  if (!fw) return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700,
      fontSize: sm ? 11 : 12, padding: sm ? '3px 8px' : '4px 10px', borderRadius: 20,
      color: 'var(--ink-3)', background: 'var(--surface-2)', border: '1px dashed var(--line-strong)', whiteSpace: 'nowrap',
    }}>Belum disimpulkan</span>
  );
  const m = FW_META[fw];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700,
      fontSize: sm ? 11 : 12, padding: sm ? '3px 8px' : '4px 10px', borderRadius: 20,
      color: m.fg, background: m.tint, border: '1px solid color-mix(in srgb, ' + m.accent + ' 20%, transparent)', whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: m.accent }} />{m.label}
    </span>
  );
}

/* toggle baris ya/tidak */
function FWToggle({ label, hint, value, onChange, yes = 'Ya', no = 'Tidak' }: any) {
  return (
    <div className="row jb ac" style={{ gap: 12, padding: '9px 0', borderBottom: '1px solid var(--line-soft)' }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>{label}</div>
        {hint && <div className="tiny" style={{ color: 'var(--ink-4)', marginTop: 2, lineHeight: 1.4 }}>{hint}</div>}
      </div>
      <div className="seg" style={{ flex: '0 0 auto' }}>
        <button className={value ? 'on' : ''} onClick={() => onChange(true)}>{yes}</button>
        <button className={!value ? 'on' : ''} onClick={() => onChange(false)}>{no}</button>
      </div>
    </div>
  );
}

/* Kontrol pertimbangan penilai — TIGA keadaan, bukan dua.
   "Belum" harus dapat dipilih dan harus menjadi keadaan awal: kontrol dua-keadaan
   memaksa jawaban palsu sejak render pertama, dan jawaban palsu itulah yang
   dulu diam-diam menetapkan kerangka. */
function FWTri({ label, hint, value, onChange }: { label: string; hint?: string; value: Tri; onChange: (v: Tri) => void }) {
  const opsi: ReadonlyArray<readonly [string, Tri]> = [['Ya', true], ['Tidak', false], ['Belum', null]];
  return (
    <div className="row jb ac" style={{ gap: 12, padding: '9px 0', borderBottom: '1px solid var(--line-soft)' }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>{label}</div>
        {hint && <div className="tiny" style={{ color: 'var(--ink-4)', marginTop: 2, lineHeight: 1.4 }}>{hint}</div>}
      </div>
      <div className="seg" style={{ flex: '0 0 auto' }}>
        {opsi.map(([teks, v]) => (
          <button key={teks} className={value === v ? 'on' : ''} onClick={() => onChange(v)}
            aria-pressed={value === v}>{teks}</button>
        ))}
      </div>
    </div>
  );
}

/* slider ukuran usaha dengan penanda ambang */
function FWSlider({ label, value, onChange, max, ceil, unit }: any) {
  const v = value === null ? 0 : value;
  const pct = Math.min(100, (v / max) * 100);
  const ceilPct = Math.min(100, (ceil / max) * 100);
  const over = value !== null && value > ceil;
  return (
    <div style={{ padding: '10px 0', borderBottom: '1px solid var(--line-soft)' }}>
      <div className="row jb ac" style={{ marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 600 }}>{label}</span>
        <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: over ? 'var(--amber)' : 'var(--green)' }}>{fwRp(value)}</span>
      </div>
      <div style={{ position: 'relative' }}>
        <input type="range" className="fw-range" min={0} max={max} step={max / 200} value={v}
          onChange={(e: any) => onChange(Number(e.target.value))}
          style={{ width: '100%', accentColor: over ? 'var(--amber)' : 'var(--teal)' }} />
        <div style={{ position: 'absolute', left: ceilPct + '%', top: -2, bottom: 14, width: 2, background: 'var(--red-solid)', opacity: .7, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', left: ceilPct + '%', top: -16, transform: 'translateX(-50%)', fontSize: 11, fontWeight: 700, color: 'var(--red)', whiteSpace: 'nowrap', pointerEvents: 'none' }}>batas UMKM {unit}</div>
      </div>
    </div>
  );
}

/* ============================================================
   POHON KEPUTUSAN — visual, menyala mengikuti jalur kandidat
   ============================================================ */
function FWGateNode({ n, q, active, dim, accent }: any) {
  return (
    <div style={{
      border: '1.5px solid ' + (active ? (accent || 'var(--navy)') : 'var(--line)'),
      background: active ? 'var(--surface)' : 'var(--surface-2)',
      borderRadius: 10, padding: '10px 12px', opacity: dim ? .5 : 1, transition: '.15s',
      boxShadow: active ? '0 1px 8px rgba(7,30,42,.08)' : 'none',
    }}>
      <div className="row ac gap8">
        <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: 'var(--blue)', background: 'var(--blue-100)', padding: '2px 6px', borderRadius: 5 }}>{n}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>{q}</span>
      </div>
    </div>
  );
}

function FWBranch({ label, taken, dim, accent }: any) {
  return (
    <div className="row ac gap8" style={{ paddingLeft: 14, opacity: dim ? .4 : 1, transition: '.15s' }}>
      <span style={{ width: 18, height: 1.5, background: taken ? accent : 'var(--line-strong)' }} />
      <span style={{
        fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 12,
        color: taken ? '#fff' : 'var(--ink-3)', background: taken ? accent : 'var(--surface-2)',
        border: '1px solid ' + (taken ? accent : 'var(--line)'),
      }}>{label}</span>
    </div>
  );
}

function FWTree({ result }: any) {
  const g = result.gate, b = result.branch;
  const A = { 1: 'var(--blue-solid)', 2: 'var(--teal-solid)', 3: 'var(--purple-solid)' };
  return (
    <div style={{ display: 'grid', gap: 7 }}>
      {/* Gate 1 */}
      <FWGateNode n="1" q="Memiliki akuntabilitas publik?" active={g >= 1} accent={A[1]} />
      <FWBranch label={b === 'pa' ? 'YA → SAK' : 'Tidak'} taken={b === 'pa'} accent={A[1]} dim={g > 1 && b !== 'pa' ? false : false} />
      {/* Gate 2 */}
      <FWGateNode n="2" q="Memenuhi kriteria UMKM (UU 20/2008 jo. PP 7/2021)?" active={g >= 2} dim={g < 2} accent={A[2]} />
      <FWBranch label={b === 'big' ? 'TIDAK (besar) → SAK EP' : (g >= 2 ? 'Ya (UMKM)' : '—')} taken={b === 'big'} dim={g < 2} accent={A[2]} />
      {/* Gate 3 */}
      <FWGateNode n="3" q="Kompleksitas transaksi / kebutuhan pengguna LK?" active={g >= 3} dim={g < 3} accent={A[3]} />
      <div className="row" style={{ gap: 10, paddingLeft: 14 }}>
        <FWBranch label={b === 'ep' ? 'Kompleks → SAK EP' : 'Kompleks'} taken={b === 'ep'} dim={g < 3} accent={A[3]} />
        <FWBranch label={b === 'emkm' ? 'Sederhana → SAK EMKM' : 'Sederhana'} taken={b === 'emkm'} dim={g < 3} accent={A[3]} />
      </div>
    </div>
  );
}

/** Satu baris tabel portofolio: entitas + hasil penentuan + tingkat usaha. */
type FwRow = FwEntity & FwResult & { tier: string };

/* ============================================================
   VIEW UTAMA
   ============================================================ */
function FrameworkView() {
  const nav = useNav();
  const loader = window.loadLS || ((k, d) => d);

  /* Kandidat aktif — prospek baru yang BELUM DINILAI. Ketiga pertimbangan
     sengaja mulai dari `null` (belum dijawab), bukan `false`: alat ini
     menirukan penilaian sungguhan, dan penilaian sungguhan dimulai dari
     tidak tahu. Angka ukuran usaha boleh berangka karena ia dugaan awal
     yang memang disunting lewat slider. */
  const DEFAULT: FwEntity = {
    id: 'NEW', name: 'PT Mitra Andalan Sejahtera', sector: 'Perdagangan Umum',
    listed: false, ...FW_JUDGEMENT_KOSONG, sales: 28e9, capital: 7e9,
    eng: 'Calon klien · onboarding', engId: null, figuresAvailable: true,
  };
  const [candRaw, setCand] = useStateFW(() => loader('ams.framework.cand.v2', DEFAULT));
  const cand: FwEntity = candRaw as FwEntity;
  const [picked, setPicked] = useStateFW('NEW');
  /* Jawaban pertimbangan per klien — SSOT server, lingkup firma
     (`capForWrite` = ENGAGEMENT_MANAGE, allowlist di server/stateAccess.ts). */
  const [judgements, setJudgements] = useAmsPersist('framework.judgements.v1', {});
  const jawab = (clientId: string, field: keyof FwJudgement, v: Tri) =>
    setJudgements((d: FwJudgements) => ({ ...d, [clientId]: { ...(d || {})[clientId], [field]: v } }));

  useEffectFW(() => { try { localStorage.setItem('ams.framework.cand.v2', JSON.stringify(cand)); } catch (e) {} }, [cand]);

  const set = (patch: Partial<FwEntity>) => setCand((c: FwEntity) => ({ ...c, ...patch }));
  const loadEntity = (ent: FwEntity) => {
    setPicked(ent.id);
    setCand({ ...ent });
  };

  const result: FwResult = useMemoFW(() => fwDetermine(cand as FwInput), [cand]);
  /* `m` null selama kerangka belum dapat disimpulkan — tiap pembaca menjaganya. */
  const m = result.fw ? FW_META[result.fw] : null;
  const umkmTier = fwUmkmTier(cand.capital, cand.sales);

  /* Portofolio firma — dirakit dari CLIENTS + neraca saldo di `fw_canon`,
     lalu dinilai lewat fungsi penentu yang SAMA (SSOT). */
  const roster: FwEntity[] = useMemoFW(() => fwPortfolio((judgements || {}) as FwJudgements), [judgements]);
  const portfolio: FwRow[] = useMemoFW(
    () => roster.map((e): FwRow => ({ ...e, ...fwDetermine(e), tier: fwUmkmTier(e.capital, e.sales) })),
    [roster]);
  const counts = FW_ORDER.map(k => ({ k, n: portfolio.filter(p => p.fw === k).length }));
  const belum = portfolio.filter(p => p.fw === null).length;

  return (
    <>
      <SubBar moduleId="framework" right={
        <div className="row gap8 ac">
          <Badge kind="blue">SA 210 · Kerangka Pelaporan</Badge>
          <Btn sm onClick={() => nav('fsgen', { from: 'framework' })}><I.report size={13} /> FS Generator</Btn>
          <Btn sm onClick={() => nav('compmatrix', { from: 'framework' })}><I.table size={13} /> Matriks Kepatuhan</Btn>
          <Btn sm onClick={() => nav('opinion', { from: 'framework' })}><I.gavel size={13} /> Opini</Btn>
        </div>
      } />
      <div className="view-scroll">
        <div className="view-pad" style={{ display: 'grid', gap: 12 }}>

          {/* ---------- ringkasan ---------- */}
          <div className="grid" style={{ gridTemplateColumns: 'repeat(5,1fr)', gap: 10 }}>
            <FWStat value={m ? m.label : 'Belum'} label="Kerangka kandidat" sub={cand.name} accent={m ? m.text : 'var(--ink-3)'} />
            <FWStat value={counts[0].n} label="Portofolio · SAK" sub="akuntabilitas publik" accent={FW_META['SAK'].text} />
            <FWStat value={counts[1].n} label="Portofolio · SAK EP" sub="entitas privat" accent={FW_META['SAK EP'].text} />
            <FWStat value={counts[2].n} label="Portofolio · SAK EMKM" sub="mikro–menengah" accent={FW_META['SAK EMKM'].text} />
            <FWStat value={belum} label="Belum dapat disimpulkan" sub="pertimbangan penilai belum dijawab" accent={belum ? 'var(--amber)' : 'var(--green)'} />
          </div>

          {/* ---------- penentu interaktif + verdict ---------- */}
          <div className="grid split" style={{ gridTemplateColumns: '1fr 380px', gap: 12, alignItems: 'start' }}>

            {/* KIRI — input keputusan */}
            <div style={{ display: 'grid', gap: 12 }}>
              <Panel title="Entitas yang dinilai" sub="muat dari portofolio atau sunting manual">
                <div style={{ padding: '4px 0 2px' }}>
                  <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                    <button onClick={() => loadEntity(DEFAULT)}
                      style={fwPickBtn(picked === 'NEW')}>+ Entitas baru</button>
                    {roster.map(e => (
                      <button key={e.id} onClick={() => loadEntity(e)} style={fwPickBtn(picked === e.id)} title={e.name}>
                        {e.name.replace(/^PT /, '').replace(/ \(UMKM\)$/, '')}
                      </button>
                    ))}
                  </div>
                  <div className="row jb ac" style={{ gap: 10 }}>
                    <div style={{ minWidth: 0 }}>
                      <input value={cand.name} onChange={(e: any) => set({ name: e.target.value })}
                        style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', border: 'none', borderBottom: '1px dashed var(--line-strong)', background: 'transparent', padding: '2px 0', width: '100%', outline: 'none' }} />
                      <div className="tiny muted" style={{ marginTop: 3 }}>{cand.sector} · {cand.eng}</div>
                    </div>
                    <div style={{ flex: '0 0 auto', textAlign: 'right' }}>
                      <div className="tiny muted upper">Tingkat usaha</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: umkmTier === 'Besar' ? 'var(--ink)' : 'var(--teal)' }}>{umkmTier}</div>
                    </div>
                  </div>
                </div>
              </Panel>

              <Panel noBody>
                <div style={{ padding: '12px 14px' }}>
                  <div className="row ac gap8" style={{ marginBottom: 4 }}>
                    <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: 'var(--blue-solid)', width: 18, height: 18, borderRadius: 5, display: 'grid', placeItems: 'center' }}>1</span>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>Uji akuntabilitas publik</span>
                  </div>
                  <p className="tiny muted" style={{ margin: '0 0 6px', lineHeight: 1.5 }}>Bila salah satu terpenuhi, entitas <b>wajib</b> menggunakan SAK (PSAK berbasis IFRS).</p>
                  <FWToggle label="Terdaftar / dalam proses pendaftaran di pasar modal"
                    hint="Emiten / perusahaan publik — menerbitkan instrumen di pasar publik."
                    value={cand.listed} onChange={(v: boolean) => set({ listed: v })} />
                  <FWTri label="Menguasai aset dalam kapasitas fidusia (usaha utama)"
                    hint="Bank, asuransi, dana pensiun, sekuritas, multifinance, reksa dana."
                    value={cand.fiduciary} onChange={v => set({ fiduciary: v })} />
                </div>
              </Panel>

              <Panel noBody>
                <div style={{ padding: '12px 14px', opacity: (result.gate ?? 0) >= 2 ? 1 : .55, pointerEvents: (result.gate ?? 0) >= 2 ? 'auto' : 'none' }}>
                  <div className="row ac gap8" style={{ marginBottom: 4 }}>
                    <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: 'var(--teal-solid)', width: 18, height: 18, borderRadius: 5, display: 'grid', placeItems: 'center' }}>2</span>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>Uji ambang UMKM</span>
                    <span className="tiny muted">UU 20/2008 jo. PP 7/2021 · di luar tanah & bangunan</span>
                  </div>
                  <p className="tiny muted" style={{ margin: '0 0 6px', lineHeight: 1.5 }}>Melebihi salah satu ambang → entitas <b>besar</b> → SAK EP. Di bawah keduanya → lanjut ke uji kompleksitas.</p>
                  <FWSlider label="Penjualan tahunan" value={cand.sales} onChange={(v: number) => set({ sales: v })} max={120e9} ceil={FW_SALES_CEIL} unit="50 M" />
                  <FWSlider label="Modal usaha (ekuitas usaha)" value={cand.capital} onChange={(v: number) => set({ capital: v })} max={20e9} ceil={FW_CAP_CEIL} unit="10 M" />
                </div>
              </Panel>

              <Panel noBody>
                <div style={{ padding: '12px 14px', opacity: (result.gate ?? 0) >= 3 ? 1 : .55, pointerEvents: (result.gate ?? 0) >= 3 ? 'auto' : 'none' }}>
                  <div className="row ac gap8" style={{ marginBottom: 4 }}>
                    <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: 'var(--purple-solid)', width: 18, height: 18, borderRadius: 5, display: 'grid', placeItems: 'center' }}>3</span>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>Pertimbangan pengguna & kompleksitas</span>
                  </div>
                  <p className="tiny muted" style={{ margin: '0 0 6px', lineHeight: 1.5 }}>Entitas UMKM <b>boleh memilih</b> kerangka yang lebih tinggi. Bila ada kompleksitas atau pengguna canggih → SAK EP; jika tidak → SAK EMKM.</p>
                  <FWTri label="Transaksi kompleks / pengguna LK canggih"
                    hint="Instrumen keuangan, sewa material, konsolidasi, kreditur bank besar, rencana go-public."
                    value={cand.complex} onChange={v => set({ complex: v })} />
                  <FWTri label="Entitas memilih naik ke SAK EP (sukarela)"
                    hint="Pilihan strategis demi komparabilitas / akses pendanaan."
                    value={cand.elect} onChange={v => set({ elect: v })} />
                </div>
              </Panel>
            </div>

            {/* KANAN — verdict + pohon + implikasi */}
            <div style={{ display: 'grid', gap: 12 }}>
              {m ? (
              <div className="panel" style={{ padding: 0, overflow: 'hidden', borderTop: '3px solid ' + m.accent }}>
                <div style={{ padding: '16px 16px 14px', background: m.tint }}>
                  <div className="tiny upper" style={{ color: m.fg, fontWeight: 700, letterSpacing: '.08em' }}>Kerangka pelaporan ditetapkan</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: m.fg, letterSpacing: '-.02em', margin: '4px 0 2px' }}>{m.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-2)', fontWeight: 600 }}>{m.full}</div>
                </div>
                <div style={{ padding: '12px 16px' }}>
                  <div className="row ac gap8" style={{ marginBottom: 8 }}>
                    <span style={{ color: m.text }}><I.checkCircle size={15} /></span>
                    <span className="tiny" style={{ fontWeight: 700, color: 'var(--ink)' }}>Dasar penetapan (Gerbang {result.gate})</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.55 }}>{result.why}</p>
                </div>
              </div>
              ) : (
              /* BELUM DISIMPULKAN — keadaan penuh, bukan kartu kosong. Menampilkan
                 kerangka tebakan di sini persis cacat yang ditutup PR-1. */
              <div className="panel" style={{ padding: 0, overflow: 'hidden', borderTop: '3px dashed var(--line-strong)' }}>
                <div style={{ padding: '16px 16px 14px', background: 'var(--surface-2)' }}>
                  <div className="tiny upper" style={{ color: 'var(--ink-3)', fontWeight: 700, letterSpacing: '.08em' }}>Kerangka pelaporan</div>
                  <div style={{ fontSize: 19, fontWeight: 800, color: 'var(--ink-2)', letterSpacing: '-.01em', margin: '4px 0 2px' }}>Belum dapat disimpulkan</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-2)', fontWeight: 600 }}>{result.why}</div>
                </div>
                <div style={{ padding: '12px 16px' }}>
                  <div className="row ac gap8" style={{ marginBottom: 8 }}>
                    <span style={{ color: 'var(--amber)' }}><I.alert size={15} /></span>
                    <span className="tiny" style={{ fontWeight: 700, color: 'var(--ink)' }}>Menunggu jawaban (Gerbang {result.gate})</span>
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 5 }}>
                    {result.pending.map((q, i) => (
                      <li key={i} style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.5 }}>{q}</li>
                    ))}
                  </ul>
                </div>
              </div>
              )}

              <Panel title="Pohon keputusan">
                <FWTree result={result} />
              </Panel>

              <Panel title="Implikasi mengikat" sub="keluaran → modul hilir">
                {/* Implikasi MENGIKAT tidak dapat dinyatakan sebelum kerangkanya
                    ditetapkan. Versi lama menurunkan bentuk opini dan kedalaman
                    pengungkapan lewat ternari yang jatuh ke cabang EMKM ketika
                    kerangkanya tak diketahui — menerbitkan konsekuensi dari
                    keputusan yang belum pernah diambil. */}
                {m ? (
                <div style={{ display: 'grid', gap: 9 }}>
                  {[
                    { ic: 'doc', k: 'Jenis perikatan', v: cand.listed ? 'Audit LK (PIE) — rotasi AP 5 th' : (result.fw === 'SAK EMKM' ? 'Audit / Kompilasi (SPSJL 4410)' : 'Audit / Reviu LK') },
                    { ic: 'gavel', k: 'Bentuk opini (SA 700/800)', v: m.opinion },
                    { ic: 'checkCircle', k: 'Kedalaman daftar-uji pengungkapan', v: result.fw === 'SAK' ? 'Penuh (CALK lengkap)' : result.fw === 'SAK EP' ? 'Proporsional' : 'Minimal (3 laporan)' },
                    { ic: 'report', k: 'Profil FS Generator', v: m.short },
                  ].map((r, i) => (
                    <div key={i} className="row gap8" style={{ alignItems: 'flex-start' }}>
                      {(() => { const IcC = (I as any)[r.ic] || I.doc; return <span style={{ color: m.text, flex: '0 0 auto', marginTop: 1 }}><IcC size={14} /></span>; })()}
                      <div style={{ minWidth: 0 }}>
                        <div className="tiny muted" style={{ fontWeight: 600 }}>{r.k}</div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>{r.v}</div>
                      </div>
                    </div>
                  ))}
                </div>
                ) : (
                <p className="tiny" style={{ margin: 0, color: 'var(--ink-3)', lineHeight: 1.55 }}>
                  Jenis perikatan, bentuk opini, dan kedalaman pengungkapan mengikuti kerangka
                  yang ditetapkan. Selesaikan uji di sebelah kiri lebih dulu — implikasi tidak
                  diturunkan dari kerangka yang belum disimpulkan.
                </p>
                )}
                <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--line-soft)' }}>
                  <div className="tiny muted upper" style={{ marginBottom: 6 }}>Standar perikatan terkait</div>
                  <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                    {FW_STD_LINKS.map((s, i) => (
                      <button key={i} onClick={() => { if (s.view) nav(s.view, { from: 'framework' }); else if (window.__amsOpenSA) window.__amsOpenSA({ code: s.code, title: s.title }); }}
                        style={{ fontSize: 11, fontWeight: 600, padding: '4px 9px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--surface-2)', color: 'var(--blue)', cursor: 'pointer' }}
                        title={s.title}>{s.code}</button>
                    ))}
                  </div>
                </div>
              </Panel>
            </div>
          </div>

          {/* ---------- matriks pembanding ---------- */}
          <Panel title="Pembanding tiga kerangka" sub="ringkasan perbedaan pengakuan, pengukuran & penyajian" noBody>
            <div style={{ overflowX: 'auto' }}>
              <table className="fw-tbl">
                <thead>
                  <tr>
                    <th style={{ minWidth: 170 }}>Dimensi</th>
                    {FW_ORDER.map(k => (
                      <th key={k} style={{ color: (FW_META as any)[k].text }}>{(FW_META as any)[k].label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {FW_COMPARE.map((r, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 700, color: 'var(--ink)' }}>{r.dim}</td>
                      <td>{r.sak}</td>
                      <td>{r.ep}</td>
                      <td>{r.emkm}</td>
                    </tr>
                  ))}
                  <tr>
                    <td style={{ fontWeight: 700, color: 'var(--ink)' }}>Kriteria pemicu</td>
                    <td>Akuntabilitas publik (emiten / fidusia)</td>
                    <td>Tanpa akuntabilitas publik · entitas besar atau UMKM yang memilih naik</td>
                    <td>UMKM (modal ≤ Rp 10 M / penjualan ≤ Rp 50 M) · pelaporan sederhana</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Panel>

          {/* ---------- penerapan portofolio ---------- */}
          <Panel title="Penerapan ke portofolio firma" sub="identitas dari registri klien · ukuran usaha dari neraca saldo perikatan · klasifikasi lewat satu fungsi penentu" noBody>
            <div style={{ overflowX: 'auto' }}>
              <table className="fw-tbl">
                <thead>
                  <tr>
                    <th style={{ minWidth: 200 }}>Entitas</th>
                    <th>Sektor</th>
                    <th style={{ textAlign: 'center' }}>Akunt. publik</th>
                    <th style={{ textAlign: 'right' }}>Penjualan th.</th>
                    <th style={{ textAlign: 'right' }}>Modal usaha</th>
                    <th style={{ textAlign: 'center' }}>Tingkat</th>
                    <th>Kerangka</th>
                    <th>Dasar</th>
                  </tr>
                </thead>
                <tbody>
                  {portfolio.map((p: FwRow) => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 700, color: 'var(--ink)' }}>{p.name}<div className="tiny muted" style={{ fontWeight: 500 }}>{p.eng}</div></td>
                      <td>{p.sector}</td>
                      <td style={{ textAlign: 'center' }}>
                        {p.listed || p.fiduciary === true
                          ? <span style={{ color: 'var(--blue)', fontWeight: 700, fontSize: 11 }}>{p.listed && p.fiduciary === true ? 'Emiten + LJK' : p.listed ? 'Emiten' : 'LJK fidusia'}</span>
                          : p.fiduciary === null
                            ? <span className="tiny" style={{ color: 'var(--amber)', fontWeight: 600 }}>belum dinilai</span>
                            : <span className="tiny muted">—</span>}
                      </td>
                      <td className="mono" style={{ textAlign: 'right', fontSize: 12 }}>{fwRp(p.sales)}</td>
                      <td className="mono" style={{ textAlign: 'right', fontSize: 12 }}>{fwRp(p.capital)}</td>
                      <td style={{ textAlign: 'center' }}><span className="tiny" style={{ fontWeight: 600, color: p.tier === 'Besar' ? 'var(--ink-2)' : 'var(--teal)' }}>{p.tier}</span></td>
                      <td><FWChip fw={p.fw} sm /></td>
                      <td className="tiny" style={{ color: 'var(--ink-3)', maxWidth: 230, lineHeight: 1.4 }}>
                        {p.branch === 'pa' ? 'Akuntabilitas publik'
                          : p.branch === 'big' ? 'Entitas besar (> ambang UMKM)'
                          : p.branch === 'ep' ? 'UMKM → naik ke EP (kompleksitas)'
                          : p.branch === 'emkm' ? 'UMKM · pelaporan sederhana'
                          : p.pendingKeys.map(k => (k === 'figures'
                              ? <div key={k} className="tiny" style={{ color: 'var(--ink-3)', lineHeight: 1.35 }}>Neraca saldo perikatan belum tersedia — tak dapat dijawab manual.</div>
                              : <FWTriMini key={k} label={FW_JUDGEMENT_LABEL[k]} value={p[k]}
                                  onChange={v => jawab(p.id, k, v)} />))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ padding: '10px 14px', borderTop: '1px solid var(--line-soft)', background: 'var(--surface-2)' }}>
              <div className="row gap8" style={{ alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--amber)', flex: '0 0 auto', marginTop: 1 }}><I.alert size={14} /></span>
                <p className="tiny" style={{ margin: 0, color: 'var(--ink-2)', lineHeight: 1.5 }}>
                  <b>Modal usaha didekati dengan ekuitas neraca saldo.</b> PP 7/2021 mengecualikan tanah &amp; bangunan tempat usaha dari modal usaha; neraca saldo perikatan tidak memisahkan keduanya, sehingga angka di kolom itu adalah <b>aproksimasi yang diungkapkan</b>, bukan modal usaha menurut definisi peraturan. Klien tanpa perikatan berjalan tidak memiliki neraca saldo — kolomnya sengaja kosong, bukan nol. Salah pilih kerangka berdampak langsung pada jenis perikatan dan bentuk opini (SA 700/800), sehingga penetapan ini menjadi gerbang pada onboarding.
                </p>
              </div>
            </div>
          </Panel>

        </div>
      </div>

      <style>{`
        .fw-range{ height: 4px; border-radius: 3px; }
        .fw-tbl{ width:100%; border-collapse:collapse; font-size:12px; }
        .fw-tbl th{ text-align:left; background:var(--surface-2); color:var(--ink-3); font-size:11px; text-transform:uppercase; letter-spacing:.05em; padding:8px 11px; font-weight:700; border-bottom:1px solid var(--line); white-space:nowrap; }
        .fw-tbl td{ padding:9px 11px; border-bottom:1px solid var(--line-soft); vertical-align:top; color:var(--ink-2); }
        .fw-tbl tbody tr:last-child td{ border-bottom:none; }
        .fw-tbl tbody tr:hover td{ background:var(--surface-2); }
      `}</style>
    </>
  );
}

function fwPickBtn(on: any) {
  return {
    fontSize: 11, fontWeight: 600, padding: '5px 9px', borderRadius: 7, cursor: 'pointer',
    border: '1px solid ' + (on ? 'var(--blue)' : 'var(--line)'),
    background: on ? 'var(--blue-100)' : 'var(--surface-2)',
    color: on ? 'var(--blue)' : 'var(--ink-2)', whiteSpace: 'nowrap',
  };
}

/* ---- LINEAGE dock dua-arah (didaftarkan setelah related_modules.jsx) ---- */
if (window.LINEAGE) {
  window.LINEAGE.framework = {
    std: 'SAK · Penentu Kerangka Pelaporan Berjenjang (SA 210)',
    up: [
      { id: 'onboarding', ic: 'briefcase', lbl: 'Client Onboarding', rel: 'Profil entitas (akuntabilitas publik, ukuran) → input penentu' },
      { id: 'compmatrix', ic: 'table', lbl: 'Matriks Kepatuhan', rel: 'Registri kerangka pelaporan → cakupan standar' },
      { id: 'kb', ic: 'book', lbl: 'Knowledge Base', rel: 'Definisi akuntabilitas publik & kriteria UMKM' },
    ],
    down: [
      { id: 'sakep', ic: 'book', lbl: 'SAK EP · Entitas Privat', rel: 'Penetapan EP → daftar-uji penerapan & transisi' },
      { id: 'fsgen', ic: 'report', lbl: 'Financial Statement Gen.', rel: 'Kerangka terpilih → struktur & pengungkapan LK' },
      { id: 'opinion', ic: 'gavel', lbl: 'Audit Opinion Generator', rel: 'Kerangka berlaku → acuan & bentuk opini (SA 700/800)' },
    ],
  };
}



/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
/* `fwDetermine` di-ekspor-ulang demi pemanggil lama; sumbernya `fw_canon.ts`. */
export { FrameworkView, fwDetermine };
