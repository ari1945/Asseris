/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { useAmsPersist, useAudit, useFirm, useNav } from './contexts';
import { I } from './icons';
import { SubBar } from './shell';
import { Badge, Btn, Panel, Stat, Tabs } from './ui';
import { SectionTitle } from './view_fpm_parts';
import {
  IP_ACCOUNT, IP_RENT_ACCOUNT, IP_DOC_EMPTY,
  invpropDoc, invpropGl, invpropNoi, invpropRollForward, invpropSubledger,
} from './invprop_derive';
import type { InvPropDoc, InvPropMovements, InvPropProperty, InvPropSens } from './invprop_derive';

/* ============================================================
   Asseris — Properti Investasi (PSAK 13 / IAS 40)
   Model nilai wajar (¶33). Nilai wajar Level 3 (KJPP/MAPPI).

   SUMBER ANGKA — modul ini dulu membawa empat konstanta (IP_PORTFOLIO, IP_ROLL,
   IP_PL, IP_SENS) dan menampilkannya untuk SETIAP perikatan; tak ada satu pun
   pembacaan konteks. Sekarang:

     · saldo awal   ← kolom komparatif `ly` akun 1-2600 neraca saldo perikatan
     · saldo akhir  ← akun 1-2600 basis DILAPORKAN (dibukukan + jurnal terposting)
     · pend. sewa   ← akun 4-1500 basis DILAPORKAN
     · mutasi · sub-ledger per-properti · beban operasi langsung · sensitivitas
       ← MASUKAN auditor (`invprop.v1`, berlingkup perikatan). Tak ada di neraca
         saldo, dan repo ini tak punya sumber lain untuknya — jadi ia lahir KOSONG
         dan modul MENGATAKANNYA, bukan mengisinya dengan angka karangan.

   Badge roll-forward kini membandingkan saldo awal + mutasi auditor TERHADAP
   saldo akhir buku besar: dua kolom, dua sumber. Pada keadaan awal ia MEMERAH,
   karena mutasinya memang belum pernah diaudit.
   ============================================================ */
const { useState: useStateIVP, useMemo: useMemoIVP, useId: useIdIVP } = React;

const numOf = (s: string): number => {
  const n = Number(String(s).replace(/[^0-9.-]/g, ''));
  return isFinite(n) ? n : 0;
};

/* Identitas larik STABIL untuk "belum ada neraca saldo": `|| []` melahirkan larik
   baru tiap render sehingga seluruh useMemo di bawahnya menghitung ulang. */
const IP_NO_WTB: [] = [];

/* Tombol hapus DI DALAM baris terang. Sengaja bukan `.top-btn`: kelas itu bergaya
   untuk header navy (`color:#bcd2de`) dan hampir tak terlihat di atas baris putih.
   Tanpa anotasi tipe: repo ini tak memasang @types/react, jadi
   `React.CSSProperties` tak ada (TS2694) — bentuknya disimpulkan saja. */
const ipDelBtn = {
  border: 0, background: 'transparent', color: 'var(--red)', cursor: 'pointer', padding: 2, lineHeight: 0,
};

const MV_ROWS: Array<{ k: keyof InvPropMovements; label: string; accent?: string }> = [
  { k: 'additions', label: 'Penambahan (akuisisi & belanja modal)' },
  { k: 'fvGain', label: 'Keuntungan nilai wajar — neto (Laba Rugi)', accent: 'var(--green)' },
  { k: 'disposals', label: 'Pelepasan (dikurangkan)' },
];

/* ---------- panel yang MEMBANTAH: detail tanpa sumber kanonik ---------- */
function IPEmpty({ title, body }: { title: string; body: string }) {
  return (
    <div className="panel" style={{ padding: '14px 16px', background: 'var(--amber-bg)', borderColor: 'transparent' }}>
      <div className="row ac gap8" style={{ alignItems: 'flex-start' }}>
        <I.alert size={15} style={{ color: 'var(--amber)', flexShrink: 0, marginTop: 1 }} />
        <div>
          <div style={{ fontSize: 'var(--fs-md)', fontWeight: 700 }}>{title}</div>
          <div className="tiny" style={{ color: 'var(--ink-2)', lineHeight: 1.5, marginTop: 2 }}>{body}</div>
        </div>
      </div>
    </div>
  );
}

/* ---------- formulir tambah properti (sub-ledger) ---------- */
function IPPropertyForm({ onAdd, taken }: { onAdd: (p: InvPropProperty) => void; taken: string[] }) {
  const uid = useIdIVP();
  const [open, setOpen] = useStateIVP(false);
  const [f, setF] = useStateIVP({ id: '', name: '', use: '', city: '', fv: '', area: '', yieldPct: '', occ: '' });
  const set = (k: string, v: string) => setF((p: Record<string, string>) => ({ ...p, [k]: v }));
  /* Kode GANDA ditolak DI MUKA, bukan diterima lalu gagal senyap: tombol hapus
     menyaring per kode, jadi dua baris berkode sama akan terhapus berdua. */
  const dupe = f.id.trim() !== '' && taken.indexOf(f.id.trim()) >= 0;
  const valid = f.id.trim() !== '' && f.name.trim() !== '' && numOf(f.fv) > 0 && !dupe;

  if (!open) {
    return <Btn sm onClick={() => setOpen(true)}><I.plus size={13} /> Tambah properti ke sub-ledger</Btn>;
  }
  return (
    <div className="panel" style={{ padding: '12px 14px' }}>
      <div className="grid" style={{ gridTemplateColumns: '110px 1.4fr 1fr', gap: 10, marginBottom: 10 }}>
        <div className="field">
          <label htmlFor={uid + '-id'}>Kode <span style={{ color: 'var(--red)' }}>*</span></label>
          <input id={uid + '-id'} className="input mono" value={f.id} onChange={(e: { target: { value: string } }) => set('id', e.target.value)} placeholder="IP-01"
            aria-invalid={dupe || undefined} aria-describedby={dupe ? uid + '-id-err' : undefined}
            style={dupe ? { borderColor: 'var(--red)' } : undefined} />
          {dupe && <span id={uid + '-id-err'} className="tiny" style={{ color: 'var(--red)' }}>Kode ini sudah ada di sub-ledger.</span>}
        </div>
        <div className="field">
          <label htmlFor={uid + '-name'}>Nama Properti <span style={{ color: 'var(--red)' }}>*</span></label>
          <input id={uid + '-name'} className="input" value={f.name} onChange={(e: { target: { value: string } }) => set('name', e.target.value)} placeholder="mis. Gedung perkantoran disewakan" />
        </div>
        <div className="field">
          <label htmlFor={uid + '-city'}>Lokasi</label>
          <input id={uid + '-city'} className="input" value={f.city} onChange={(e: { target: { value: string } }) => set('city', e.target.value)} />
        </div>
      </div>
      <div className="grid" style={{ gridTemplateColumns: '1.4fr 130px 110px 100px 100px', gap: 10, marginBottom: 10 }}>
        <div className="field">
          <label htmlFor={uid + '-use'}>Penggunaan (¶7)</label>
          <input id={uid + '-use'} className="input" value={f.use} onChange={(e: { target: { value: string } }) => set('use', e.target.value)} placeholder="Disewakan / apresiasi modal" />
        </div>
        <div className="field">
          <label htmlFor={uid + '-fv'}>Nilai Wajar (jt) <span style={{ color: 'var(--red)' }}>*</span></label>
          <input id={uid + '-fv'} className="input mono" value={f.fv} onChange={(e: { target: { value: string } }) => set('fv', e.target.value)} placeholder="0" />
        </div>
        <div className="field">
          <label htmlFor={uid + '-area'}>Luas (m²)</label>
          <input id={uid + '-area'} className="input mono" value={f.area} onChange={(e: { target: { value: string } }) => set('area', e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor={uid + '-yield'}>Yield (%)</label>
          <input id={uid + '-yield'} className="input mono" value={f.yieldPct} onChange={(e: { target: { value: string } }) => set('yieldPct', e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor={uid + '-occ'}>Hunian (%)</label>
          <input id={uid + '-occ'} className="input mono" value={f.occ} onChange={(e: { target: { value: string } }) => set('occ', e.target.value)} />
        </div>
      </div>
      <div className="row gap8" style={{ justifyContent: 'flex-end' }}>
        <Btn sm onClick={() => setOpen(false)}>Batal</Btn>
        <Btn sm variant="primary" disabled={!valid} style={{ opacity: valid ? 1 : .5 }} onClick={() => {
          onAdd({
            id: f.id.trim(), name: f.name.trim(), use: f.use.trim(), city: f.city.trim(),
            fv: numOf(f.fv), area: numOf(f.area),
            yieldPct: f.yieldPct.trim() === '' ? null : numOf(f.yieldPct),
            occ: f.occ.trim() === '' ? null : numOf(f.occ) / 100,
            level: 3,
          });
          setF({ id: '', name: '', use: '', city: '', fv: '', area: '', yieldPct: '', occ: '' });
          setOpen(false);
        }}><I.check size={13} /> Simpan properti</Btn>
      </div>
    </div>
  );
}

/* Id baris sensitivitas: MAX(id yang ada) + 1, mengikuti `nextId()` di view_wp.
   Sengaja bukan `Date.now()` (jam mesin, lihat arc Klok SSOT) dan bukan indeks
   larik — indeks berubah saat baris di tengah dihapus, dan id yang bergeser
   membuat tombol hapus menghapus baris yang salah. */
function nextSensId(list: InvPropSens[]): string {
  const max = list.reduce((m, s) => Math.max(m, parseInt(String(s.id).replace(/\D/g, ''), 10) || 0), 0);
  return 'SENS-' + String(max + 1).padStart(2, '0');
}

/* ---------- formulir tambah baris sensitivitas ---------- */
function IPSensForm({ onAdd }: { onAdd: (s: Omit<InvPropSens, 'id'>) => void }) {
  const uid = useIdIVP();
  const [open, setOpen] = useStateIVP(false);
  const [k, setK] = useStateIVP('');
  const [impact, setImpact] = useStateIVP('');
  const [note, setNote] = useStateIVP('');
  const valid = k.trim() !== '' && impact.trim() !== '';

  if (!open) {
    return <Btn sm onClick={() => setOpen(true)}><I.plus size={13} /> Tambah baris sensitivitas</Btn>;
  }
  return (
    <div className="panel" style={{ padding: '12px 14px' }}>
      <div className="grid" style={{ gridTemplateColumns: '1.6fr 140px', gap: 10, marginBottom: 10 }}>
        <div className="field">
          <label htmlFor={uid + '-k'}>Perubahan Input <span style={{ color: 'var(--red)' }}>*</span></label>
          <input id={uid + '-k'} className="input" value={k} onChange={(e: { target: { value: string } }) => setK(e.target.value)} placeholder="mis. Imbal hasil ekuivalen +0,50%" />
        </div>
        <div className="field">
          <label htmlFor={uid + '-impact'}>Dampak NW (jt) <span style={{ color: 'var(--red)' }}>*</span></label>
          <input id={uid + '-impact'} className="input mono" value={impact} onChange={(e: { target: { value: string } }) => setImpact(e.target.value)} placeholder="-915" />
        </div>
      </div>
      <div className="field" style={{ marginBottom: 10 }}>
        <label htmlFor={uid + '-note'}>Catatan</label>
        <input id={uid + '-note'} className="input" value={note} onChange={(e: { target: { value: string } }) => setNote(e.target.value)} placeholder="Arah & alasan hubungan input terhadap nilai wajar" />
      </div>
      <div className="row gap8" style={{ justifyContent: 'flex-end' }}>
        <Btn sm onClick={() => setOpen(false)}>Batal</Btn>
        <Btn sm variant="primary" disabled={!valid} style={{ opacity: valid ? 1 : .5 }} onClick={() => {
          onAdd({ k: k.trim(), impact: numOf(impact), note: note.trim() });
          setK(''); setImpact(''); setNote(''); setOpen(false);
        }}><I.check size={13} /> Simpan</Btn>
      </div>
    </div>
  );
}

function InvestmentProperty() {
  const { fmt } = AMS;
  const nav = useNav();
  const firm = useFirm();
  const audit = useAudit();
  const uid = useIdIVP();
  const [tab, setTab] = useStateIVP('porto');
  const [raw, setRaw] = useAmsPersist('invprop.v1', () => IP_DOC_EMPTY);

  /* SSOT — neraca saldo perikatan AKTIF. Sengaja TIDAK jatuh ke `AMS.WTB`:
     fallback itulah yang membuat modul lain menampilkan bagan akun perikatan
     lain. Perikatan tanpa akun 1-2600 harus MEMBANTAH, bukan meminjam. */
  const wtb = (audit && audit.wtb) || IP_NO_WTB;
  const aje = (audit && audit.aje) || undefined;

  const D: InvPropDoc = useMemoIVP(() => invpropDoc(raw), [raw]);
  const gl = useMemoIVP(() => invpropGl(wtb, aje), [wtb, aje]);
  const roll = useMemoIVP(() => invpropRollForward(gl, D.movements), [gl, D.movements]);
  const sub = useMemoIVP(() => invpropSubledger(D.properties, gl.close), [D.properties, gl.close]);
  const noi = invpropNoi(gl, D.opex);

  const eng = (firm && firm.activeEngagement) || null;
  const client = (firm && firm.activeClient) || null;

  const patch = (p: Partial<InvPropDoc>) =>
    setRaw((prev: Partial<InvPropDoc> | null) => ({ ...invpropDoc(prev), ...p }));
  const setMv = (k: keyof InvPropMovements, v: number) => {
    const m: InvPropMovements = { ...D.movements };
    m[k] = v;
    patch({ movements: m });
  };
  const propIds = useMemoIVP(() => D.properties.map(p => p.id), [D.properties]);
  const addProp = (p: InvPropProperty) => patch({ properties: [...D.properties, p] });
  const dropProp = (id: string) => patch({ properties: D.properties.filter(p => p.id !== id) });
  const addSens = (s: Omit<InvPropSens, 'id'>) => patch({ sens: [...D.sens, { id: nextSensId(D.sens), ...s }] });
  const dropSens = (id: string) => patch({ sens: D.sens.filter(s => s.id !== id) });

  const J = (n: number) => 'Rp ' + fmt(n, 0) + ' jt';
  const dash = <span className="muted">—</span>;

  /* rentang input takteramati DITURUNKAN dari sub-ledger yang diisi auditor —
     bukan pita statis yang menggambarkan portofolio karangan. */
  const ranges = useMemoIVP(() => {
    const ys = D.properties.map(p => p.yieldPct).filter((v): v is number => typeof v === 'number');
    const os = D.properties.map(p => p.occ).filter((v): v is number => typeof v === 'number').map(v => v * 100);
    const rng = (a: number[], d: number, suffix: string) => {
      if (!a.length) return null;
      const lo = Math.min(...a), hi = Math.max(...a);
      return (lo === hi ? fmt(lo, d) : fmt(lo, d) + '–' + fmt(hi, d)) + suffix;
    };
    return { yieldR: rng(ys, 2, '%'), occR: rng(os, 0, '%') };
  }, [D.properties, fmt]);

  const TABS = [
    { id: 'porto', label: 'Portofolio & Nilai Wajar' },
    { id: 'roll', label: 'Roll-forward & Laba Rugi' },
    { id: 'level', label: 'Hierarki & Sensitivitas' },
    { id: 'audit', label: 'Prosedur Audit' },
  ];

  const procs = [
    { ref: 'SA 620 ¶9-11', t: 'Evaluasi kompetensi, kapabilitas & objektivitas KJPP — izin Kemenkeu, keanggotaan MAPPI, independensi dari manajemen.', route: 'expert' },
    { ref: 'SA 540 ¶13', t: 'Uji kewajaran input takteramati (yield, ERV, hunian) terhadap data pasar & transaksi pembanding.', route: 'sa540' },
    { ref: 'SA 500 ¶8', t: 'Telaah laporan penilaian: ruang lingkup, tanggal penilaian, metode (pendapatan vs pasar), dan asumsi kunci.', route: 'evidence' },
    { ref: 'PSAK 68', t: 'Verifikasi klasifikasi hierarki nilai wajar (Level 3) dan kelengkapan pengungkapan input & sensitivitas.', route: 'psak68' },
    { ref: 'SA 240', t: 'Pertimbangan risiko kecurangan atas estimasi nilai wajar (bias manajemen menaikkan laba via keuntungan NW).', route: 'sa240' },
  ];

  /* ——— perikatan tanpa properti investasi: MEMBANTAH, tak mengarang ——— */
  if (!gl.present) {
    return (
      <>
        <SubBar moduleId="invprop" />
        <div className="view-scroll">
          <div className="view-pad" style={{ display: 'grid', gap: 12 }}>
            <IPEmpty
              title={'Perikatan ini tidak memiliki akun ' + IP_ACCOUNT + ' Properti Investasi'}
              body={'Neraca saldo ' + (eng ? eng.id : 'perikatan aktif') + (client && client.name ? ' · ' + client.name : '')
                + ' tidak memuat baris ' + IP_ACCOUNT + ', sehingga tidak ada saldo properti investasi yang dapat dilaporkan menurut PSAK 13. '
                + 'Modul ini sengaja tidak menampilkan portofolio: angka milik perikatan lain bukan angka perikatan ini. '
                + 'Bila entitas memang memiliki properti investasi, akun tersebut harus lebih dulu ada di neraca saldo.'}
            />
            <Panel title="Prosedur Audit — PSAK 13 / SA 540">
              <div style={{ padding: 12, display: 'grid', gap: 8 }}>
                {procs.map((p, i) => (
                  <button key={i} type="button" className="panel" style={{ padding: '11px 13px', textAlign: 'left', cursor: 'pointer', width: '100%' }} onClick={() => nav(p.route, { from: 'invprop' })}>
                    <div className="row ac gap8"><Badge kind="blue">{p.ref}</Badge><span style={{ fontSize: 'var(--fs-sm)', flex: 1, color: 'var(--ink-2)' }}>{p.t}</span><I.arrowRight size={14} style={{ color: 'var(--ink-4)' }} /></div>
                  </button>
                ))}
              </div>
            </Panel>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SubBar moduleId="invprop" right={
        <div className="row gap8 ac">
          <span className="tiny mono" style={{ color: roll.tie ? 'var(--green)' : 'var(--red)' }}>
            ● Roll-forward {roll.tie ? 'menutup' : (roll.empty ? 'belum diaudit' : 'selisih ' + fmt(Math.abs(roll.diff), 0) + ' jt')}
          </span>
          <Btn sm onClick={() => nav('psak68', { from: 'invprop' })}><I.layers size={13} /> PSAK 68 · Nilai Wajar</Btn>
          <Btn sm variant="primary" onClick={() => nav('expert', { from: 'invprop' })}><I.shield size={14} /> Pakar (SA 620)</Btn>
        </div>
      } />
      <div className="view-scroll">
        <div className="view-pad" style={{ display: 'grid', gap: 12 }}>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
            <Panel><div style={{ padding: '15px 18px' }}><Stat value={J(gl.close)} label={'Saldo buku besar · ' + IP_ACCOUNT} accent="var(--navy)" /></div></Panel>
            <Panel><div style={{ padding: '15px 18px' }}><Stat value={roll.empty ? '—' : J(D.movements.fvGain)} label="Keuntungan NW → Laba Rugi" accent="var(--green)" /></div></Panel>
            <Panel><div style={{ padding: '15px 18px' }}><Stat value={gl.rentPresent ? J(gl.rental) : '—'} label={'Pendapatan sewa · ' + IP_RENT_ACCOUNT} accent="var(--blue)" /></div></Panel>
            <Panel><div style={{ padding: '15px 18px' }}><Stat value={noi == null ? '—' : J(noi)} label="Hasil operasi neto (NOI)" /></div></Panel>
          </div>

          <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="panel-h" style={{ padding: 0, background: 'var(--surface-2)' }}>
              <Tabs tabs={TABS} active={tab} onChange={setTab} />
            </div>
            <div style={{ padding: 14 }}>

              {tab === 'porto' && <>
                <div className="tiny muted" style={{ marginBottom: 10, lineHeight: 1.5 }}>Properti investasi diukur pada <b>nilai wajar</b> (PSAK 13 ¶33); perubahan diakui di laba rugi. Properti dimiliki untuk memperoleh sewa dan/atau apresiasi modal — bukan dipakai sendiri (¶7).</div>

                {sub.empty
                  ? <div style={{ display: 'grid', gap: 10 }}>
                      <IPEmpty
                        title="Sub-ledger per-properti belum diisi"
                        body={'Buku besar ' + IP_ACCOUNT + ' mencatat ' + J(gl.close) + ', namun rinciannya per properti (nama, luas, yield, hunian, nilai wajar) tidak ada di neraca saldo dan tidak tersedia di sumber mana pun pada sistem ini. Isikan dari laporan penilaian KJPP agar total kontrol sub-ledger dapat direkonsiliasi ke buku besar (¶76).'}
                      />
                      <IPPropertyForm onAdd={addProp} taken={propIds} />
                    </div>
                  : <>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--fs-sm)' }}>
                      <thead><tr style={{ borderBottom: '1.5px solid var(--line-strong)' }}>
                        <th style={{ textAlign: 'left', padding: '8px 6px' }}>Properti</th>
                        <th style={{ textAlign: 'left', padding: '8px 6px' }}>Penggunaan</th>
                        <th style={{ textAlign: 'right', padding: '8px 6px' }}>Luas (m²)</th>
                        <th style={{ textAlign: 'right', padding: '8px 6px' }}>Yield</th>
                        <th style={{ textAlign: 'right', padding: '8px 6px' }}>Hunian</th>
                        <th style={{ textAlign: 'right', padding: '8px 6px' }}>Nilai Wajar</th>
                        <th style={{ width: 34 }} />
                      </tr></thead>
                      <tbody>
                        {D.properties.map(p => (
                          <tr key={p.id} style={{ borderBottom: '1px solid var(--line-soft)' }}>
                            <td style={{ padding: '8px 6px' }}><b>{p.name}</b><div className="tiny muted mono">{p.id}{p.city ? ' · ' + p.city : ''} · Level {p.level}</div></td>
                            <td style={{ padding: '8px 6px', color: 'var(--ink-2)' }}>{p.use || dash}</td>
                            <td className="num mono" style={{ textAlign: 'right', padding: '8px 6px' }}>{p.area ? fmt(p.area, 0) : '—'}</td>
                            <td className="num mono" style={{ textAlign: 'right', padding: '8px 6px' }}>{p.yieldPct != null ? fmt(p.yieldPct, 2) + '%' : '—'}</td>
                            <td className="num mono" style={{ textAlign: 'right', padding: '8px 6px' }}>{p.occ != null ? fmt(p.occ * 100, 0) + '%' : '—'}</td>
                            <td className="num mono" style={{ textAlign: 'right', padding: '8px 6px', fontWeight: 700 }}>{fmt(p.fv, 0)}</td>
                            <td style={{ textAlign: 'right', padding: '8px 6px' }}>
                              <button type="button" aria-label={'Hapus properti ' + p.id} title={'Hapus properti ' + p.id} onClick={() => dropProp(p.id)} style={ipDelBtn}><I.trash size={13} /></button>
                            </td>
                          </tr>
                        ))}
                        <tr style={{ borderTop: '2px solid var(--navy)', fontWeight: 800 }}>
                          <td style={{ padding: '9px 6px' }} colSpan={5}>Total kontrol sub-ledger</td>
                          <td className="num mono" style={{ textAlign: 'right', padding: '9px 6px' }}>{fmt(sub.sub, 0)}</td>
                          <td />
                        </tr>
                        <tr style={{ borderTop: '1px solid var(--line-soft)' }}>
                          <td className="tiny" style={{ padding: '9px 6px', color: 'var(--ink-2)' }} colSpan={5}>Buku besar {IP_ACCOUNT} (basis dilaporkan)</td>
                          <td className="num mono" style={{ textAlign: 'right', padding: '9px 6px' }}>{fmt(sub.gl, 0)}</td>
                          <td />
                        </tr>
                        <tr>
                          <td className="tiny" style={{ padding: '9px 6px', fontWeight: 700 }} colSpan={5}>Selisih</td>
                          <td className="num mono" style={{ textAlign: 'right', padding: '9px 6px', fontWeight: 800, color: sub.ok ? 'var(--green)' : 'var(--red)' }}>{fmt(sub.diff, 0)}</td>
                          <td />
                        </tr>
                      </tbody>
                    </table>
                    <div className="row jb ac" style={{ marginTop: 10 }}>
                      <span className="tiny" style={{ fontWeight: 600, color: sub.ok ? 'var(--green)' : 'var(--red)' }}>
                        {sub.ok ? '✓ Total kontrol sub-ledger menutup ke buku besar ' + IP_ACCOUNT + '.' : '● Sub-ledger belum menutup ke buku besar — selisih ' + fmt(Math.abs(sub.diff), 0) + ' jt.'}
                      </span>
                      <IPPropertyForm onAdd={addProp} taken={propIds} />
                    </div>
                  </>}
              </>}

              {tab === 'roll' && <>
                <div className="grid" style={{ gridTemplateColumns: '1.2fr 1fr', gap: 16, alignItems: 'start' }}>
                  <div>
                    <SectionTitle right={<span className="tiny muted">PSAK 13 ¶76</span>}>Rekonsiliasi Nilai Tercatat</SectionTitle>
                    <div style={{ display: 'grid', gap: 2 }}>
                      <div className="row jb ac" style={{ padding: '8px 10px', borderTop: '1px solid var(--line-soft)', background: 'var(--surface-2)' }}>
                        <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 700 }}>Saldo awal — komparatif audited {IP_ACCOUNT}</span>
                        <span className="mono" style={{ fontWeight: 600 }}>{fmt(roll.open, 0)}</span>
                      </div>
                      {MV_ROWS.map(r => (
                        <div key={r.k} className="row jb ac" style={{ padding: '6px 10px', borderTop: '1px solid var(--line-soft)' }}>
                          <label htmlFor={uid + '-mv-' + r.k} style={{ fontSize: 'var(--fs-sm)', color: r.accent || 'var(--ink)' }}>{r.label}</label>
                          <input
                            id={uid + '-mv-' + r.k}
                            className="input mono"
                            style={{ width: 120, textAlign: 'right' }}
                            value={String(D.movements[r.k])}
                            onChange={(e: { target: { value: string } }) => setMv(r.k, numOf(e.target.value))}
                          />
                        </div>
                      ))}
                      <div className="row jb ac" style={{ padding: '8px 10px', borderTop: '2px solid var(--navy)' }}>
                        <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 700 }}>Saldo akhir menurut roll-forward</span>
                        <span className="mono" style={{ fontWeight: 800 }}>{fmt(roll.computed, 0)}</span>
                      </div>
                      <div className="row jb ac" style={{ padding: '8px 10px', borderTop: '1px solid var(--line-soft)' }}>
                        <span className="tiny" style={{ color: 'var(--ink-2)' }}>Saldo akhir menurut buku besar {IP_ACCOUNT}</span>
                        <span className="mono" style={{ fontWeight: 600 }}>{fmt(roll.gl, 0)}</span>
                      </div>
                      <div className="row jb ac" style={{ padding: '8px 10px', borderTop: '1px solid var(--line-soft)' }}>
                        <span className="tiny" style={{ fontWeight: 700 }}>Selisih</span>
                        <span className="mono" style={{ fontWeight: 800, color: roll.tie ? 'var(--green)' : 'var(--red)' }}>{fmt(roll.diff, 0)}</span>
                      </div>
                    </div>
                    {roll.tie
                      ? <div className="tiny" style={{ marginTop: 8, color: 'var(--green)', fontWeight: 600 }}>✓ Roll-forward menutup ke saldo buku besar ({J(roll.gl)}).</div>
                      : <div className="tiny" style={{ marginTop: 8, color: 'var(--red)', fontWeight: 600, lineHeight: 1.5 }}>
                          ● {roll.empty
                            ? 'Mutasi tahun berjalan belum diaudit — penambahan, keuntungan nilai wajar & pelepasan masih nol, sehingga roll-forward belum menutup ke buku besar.'
                            : 'Roll-forward belum menutup ke buku besar. Selisih ' + fmt(Math.abs(roll.diff), 0) + ' jt belum dijelaskan.'}
                        </div>}
                  </div>
                  <div>
                    <SectionTitle right={<span className="tiny muted">¶75(f)</span>}>Diakui di Laba Rugi</SectionTitle>
                    <div style={{ display: 'grid', gap: 8 }}>
                      <div className="panel" style={{ padding: '10px 12px' }}><div className="row jb ac"><span className="tiny" style={{ fontWeight: 600 }}>Pendapatan sewa ({IP_RENT_ACCOUNT})</span><b className="mono" style={{ color: 'var(--green)' }}>{gl.rentPresent ? fmt(gl.rental, 0) : '—'}</b></div></div>
                      <div className="panel" style={{ padding: '10px 12px' }}>
                        <div className="row jb ac gap8">
                          <label htmlFor={uid + '-opex-rented'} className="tiny" style={{ fontWeight: 600 }}>Beban operasi langsung — properti menghasilkan sewa</label>
                          <input id={uid + '-opex-rented'} className="input mono" style={{ width: 110, textAlign: 'right' }} value={String(D.opex.rented)}
                            onChange={(e: { target: { value: string } }) => patch({ opex: { ...D.opex, rented: numOf(e.target.value), entered: true } })} />
                        </div>
                      </div>
                      <div className="panel" style={{ padding: '10px 12px' }}>
                        <div className="row jb ac gap8">
                          <label htmlFor={uid + '-opex-vacant'} className="tiny" style={{ fontWeight: 600 }}>Beban operasi langsung — properti tanpa sewa</label>
                          <input id={uid + '-opex-vacant'} className="input mono" style={{ width: 110, textAlign: 'right' }} value={String(D.opex.vacant)}
                            onChange={(e: { target: { value: string } }) => patch({ opex: { ...D.opex, vacant: numOf(e.target.value), entered: true } })} />
                        </div>
                      </div>
                      <div className="panel" style={{ padding: '10px 12px', borderLeft: '4px solid var(--green)' }}><div className="row jb ac"><span className="tiny" style={{ fontWeight: 700 }}>Keuntungan nilai wajar — neto</span><b className="mono" style={{ color: 'var(--green)' }}>{roll.empty ? '—' : fmt(D.movements.fvGain, 0)}</b></div></div>
                      {!D.opex.entered && <div className="tiny muted" style={{ lineHeight: 1.5 }}>Beban operasi langsung (¶75(f)(ii)–(iii)) belum diisi — NOI belum dapat dihitung. Neraca saldo tidak memisahkan beban ini dari beban umum &amp; administrasi.</div>}
                    </div>
                  </div>
                </div>
              </>}

              {tab === 'level' && <>
                <div className="panel" style={{ padding: '11px 13px', marginBottom: 12, background: 'var(--purple-bg)', borderColor: 'transparent' }}>
                  <div className="row ac gap8"><Badge kind="purple">Level 3</Badge><span className="tiny" style={{ color: 'var(--ink-2)', lineHeight: 1.5 }}>Nilai wajar properti investasi lazimnya memakai <b>input takteramati signifikan</b> (PSAK 68 ¶86), dinilai KJPP independen ber-izin MAPPI dengan metode pendapatan (kapitalisasi/DCF).</span></div>
                </div>
                <SectionTitle right={<span className="tiny muted">PSAK 68 ¶93(h)</span>}>Input Takteramati Utama</SectionTitle>
                {sub.empty
                  ? <div style={{ marginBottom: 14 }}><IPEmpty title="Rentang input takteramati belum dapat ditampilkan" body="Rentang yield dan tingkat hunian diturunkan dari sub-ledger per-properti, yang belum diisi. Isikan portofolio pada tab Portofolio & Nilai Wajar." /></div>
                  : <div className="grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 14 }}>
                      <div className="panel" style={{ padding: '11px 13px' }}><div className="tiny upper muted" style={{ fontWeight: 700 }}>Imbal hasil ekuivalen</div><div className="mono" style={{ fontSize: 'var(--fs-xl)', fontWeight: 700, color: 'var(--navy)' }}>{ranges.yieldR || '—'}</div><div className="tiny muted">Rentang sub-ledger · uji ke benchmark pasar</div></div>
                      <div className="panel" style={{ padding: '11px 13px' }}><div className="tiny upper muted" style={{ fontWeight: 700 }}>Tingkat hunian</div><div className="mono" style={{ fontSize: 'var(--fs-xl)', fontWeight: 700, color: 'var(--navy)' }}>{ranges.occR || '—'}</div><div className="tiny muted">Rentang sub-ledger</div></div>
                      <div className="panel" style={{ padding: '11px 13px' }}><div className="tiny upper muted" style={{ fontWeight: 700 }}>Properti dinilai</div><div className="mono" style={{ fontSize: 'var(--fs-xl)', fontWeight: 700, color: 'var(--navy)' }}>{fmt(D.properties.length, 0)}</div><div className="tiny muted">Seluruhnya Level 3</div></div>
                    </div>}

                <SectionTitle right={<span className="tiny muted">¶93(h)(ii)</span>}>Analisis Sensitivitas Nilai Wajar</SectionTitle>
                {D.sens.length === 0
                  ? <div style={{ display: 'grid', gap: 10 }}>
                      <IPEmpty
                        title="Analisis sensitivitas belum dikerjakan"
                        body="Sensitivitas nilai wajar terhadap perubahan input takteramati adalah hasil pekerjaan auditor atas laporan penilaian (¶93(h)(ii)) — bukan data yang dibukukan entitas, dan tidak tersedia di sumber mana pun pada sistem ini. Tambahkan barisnya setelah pengujian asumsi selesai."
                      />
                      <IPSensForm onAdd={addSens} />
                    </div>
                  : <>
                    <div style={{ display: 'grid', gap: 7 }}>
                      {D.sens.map(s => (
                        <div key={s.id} className="panel" style={{ padding: '10px 12px' }}>
                          <div className="row jb ac gap8">
                            <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, flex: 1 }}>{s.k}{s.note ? <div className="tiny muted" style={{ fontWeight: 400 }}>{s.note}</div> : null}</span>
                            <span className="mono" style={{ fontWeight: 700, color: s.impact < 0 ? 'var(--num-neg)' : 'var(--green)' }}>{s.impact < 0 ? '(' + fmt(-s.impact, 0) + ')' : '+' + fmt(s.impact, 0)} jt</span>
                            <button type="button" aria-label={'Hapus baris sensitivitas ' + s.k} title="Hapus baris sensitivitas" onClick={() => dropSens(s.id)} style={ipDelBtn}><I.trash size={13} /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: 10 }}><IPSensForm onAdd={addSens} /></div>
                  </>}
              </>}

              {tab === 'audit' && <>
                <div className="tiny muted" style={{ marginBottom: 10, lineHeight: 1.5 }}>Nilai wajar Level 3 merupakan <b>estimasi akuntansi risiko tinggi</b> (SA 540) yang bergantung pada pekerjaan pakar (SA 620/500).</div>
                <div style={{ display: 'grid', gap: 8 }}>
                  {procs.map((p, i) => (
                    <button key={i} type="button" className="panel" style={{ padding: '11px 13px', textAlign: 'left', cursor: 'pointer', width: '100%' }} onClick={() => nav(p.route, { from: 'invprop' })}>
                      <div className="row ac gap8"><Badge kind="blue">{p.ref}</Badge><span style={{ fontSize: 'var(--fs-sm)', flex: 1, color: 'var(--ink-2)' }}>{p.t}</span><I.arrowRight size={14} style={{ color: 'var(--ink-4)' }} /></div>
                    </button>
                  ))}
                </div>
              </>}

            </div>
          </div>
        </div>
      </div>
    </>
  );
}



/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { InvestmentProperty };
