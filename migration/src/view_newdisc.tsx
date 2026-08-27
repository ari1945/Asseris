/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { AMS_CANON } from './canon';
import { fxAt } from './canon_fx';
import { useAudit, useFirm, useNav } from './contexts';
import { I } from './icons';
import { DEFAULT_ENG_ID } from './persist_scope';
import { P2_MIN_RATE, P2_THRESHOLD_EUR, pillarTwo, supplierFinance } from './newdisc_derive';
import type { P2Component, P2JurisRow } from './newdisc_derive';
import { SubBar } from './shell';
import { Badge, Btn, Panel, Stat, Tabs } from './ui';
import { SectionTitle } from './view_fpm_parts';

/* ============================================================
   Asseris — Pengungkapan Baru 2024
   Tiga pengungkapan yang menonjol pada LK efektif 2024:
     · Pilar Dua OECD — pajak tambahan global (amandemen PSAK 46/212)
     · Dampak Perubahan Iklim (Lampiran C) — pengaruh ke estimasi
     · Pendanaan Pemasok (supplier finance) — amandemen PSAK 2/7

   ANGKA: tak satu pun lahir di berkas ini. Seluruh besaran Pilar Dua & utang
   usaha diturunkan `newdisc_derive.ts` dari neraca saldo perikatan aktif dan
   dari struktur grup kanonik (`AMS_CANON.GROUP_SUBS`) yang SAMA dipakai PSAK 65
   & Group Audit. Yang tak dapat diturunkan DIBANTAH, bukan dikarang — lihat
   panel "tak dapat diasersikan" pada tab Pilar Dua & Pendanaan Pemasok.
   ============================================================ */
const { useState: useStateND, useMemo: useMemoND } = React;

/* link kecil ke modul sumber (TrSrc tidak global) */
function Src({ module, children }: any) {
  const nav = useNav();
  return <b onClick={() => nav(module)} style={{ color: 'var(--blue)', cursor: 'pointer', fontWeight: 600 }}>{children}</b>;
}

/* Panel penolakan — dipakai tiap kali sebuah besaran TIDAK dapat diturunkan.
   Bentuknya sengaja seragam supaya "modul ini diam karena tak tahu" terbaca
   sebagai keadaan yang disengaja, bukan sebagai panel yang lupa diisi. */
function CannotAssert({ title, children }: { title: string; children?: unknown }) {
  return (
    <div className="panel" data-testid="newdisc-cannot-assert"
      style={{ padding: '11px 13px', marginBottom: 12, borderLeft: '4px solid var(--amber)' }}>
      <div className="row ac gap8" style={{ marginBottom: 4 }}>
        <span style={{ color: 'var(--amber)' }}><I.alert size={15} /></span>
        <b style={{ fontSize: 12 }}>{title}</b>
      </div>
      <div className="tiny" style={{ color: 'var(--ink-2)', lineHeight: 1.55, paddingLeft: 23 }}>{children}</div>
    </div>
  );
}

function NewDisclosures2024() {
  const { fmt } = AMS;
  const { wtb } = useAudit();
  const firm = useFirm();
  const nav = useNav();
  const [tab, setTab] = useStateND('pilar2');

  const engId = (firm && firm.activeEngagement && firm.activeEngagement.id) || DEFAULT_ENG_ID;
  /* Tanggal pelaporan perikatan (akhir periode) — dasar pencarian kurs. */
  const reportDate = AMS_CANON.ASOF.y + '-' + String(AMS_CANON.ASOF.m).padStart(2, '0') + '-31';
  const parentName = (firm && firm.activeClient && firm.activeClient.name) || 'Entitas induk';

  /* Memo BENAR-BENAR membaca `wtb` (lewat pillarTwo/supplierFinance → entityFigures).
     Sebelumnya larik dependensi `[wtb]` berdiri di atas badan memo yang hanya
     membaca konstanta modul: dihitung ulang tiap perubahan neraca saldo dan
     selalu menjawab angka yang sama. */
  const D = useMemoND(() => {
    /* Struktur grup kanonik milik perikatan seed. Memakainya untuk perikatan lain
       berarti menampilkan entitas anak KLIEN LAIN — kelas kebocoran yang sama
       dengan neraca saldo lintas-perikatan (PR-J). Di luar itu: daftar kosong,
       dan `pillarTwo` akan menandai `groupScoped: false`. */
    const owns = engId === DEFAULT_ENG_ID;
    const subs: P2Component[] = owns
      ? (AMS_CANON.GROUP_SUBS || []).map(s => ({
          id: s.id, name: s.name, country: s.country, pbt: s.pbt, tax: s.tax, rev: s.rev,
        }))
      : [];
    const interco = owns ? (AMS_CANON.INTERCO || []) : [];
    const elimRev = interco.filter(e => e.type === 'Pendapatan').reduce((a, e) => a + e.amount, 0);
    const elimProfit = interco.filter(e => e.type === 'Laba').reduce((a, e) => a + e.amount, 0);
    /* Kurs dari registry BERMASA BERLAKU pada tanggal pelaporan — bukan tabel
       kurs tanpa masa berlaku (dicabut CB1). Bila tak tercakup, `eurRate` null
       dan `pillarTwo` menolak menyimpulkan cakupan, bukan memakai kurs masa lain. */
    const look = fxAt(reportDate);
    const eurRate = look.value ? look.value.closing.EUR : null;
    return {
      fx: look,
      p2: pillarTwo({ wtb, parentName, components: subs, elimRev, elimProfit, eurRate }),
      sf: supplierFinance(wtb),
    };
  }, [wtb, engId, parentName, reportDate]);

  const p2 = D.p2;
  const sf = D.sf;
  const J = (n: number) => 'Rp ' + fmt(n, 0) + ' jt';
  const pct = (n: number | null) => (n == null ? '—' : fmt(n, 1) + '%');

  const TABS = [{ id: 'pilar2', label: 'Pilar Dua (Top-up Tax)' }, { id: 'iklim', label: 'Perubahan Iklim' }, { id: 'supplier', label: 'Pendanaan Pemasok' }];

  const CLIMATE_AREAS = [
    { area: 'Umur manfaat & nilai residu aset tetap', impact: 'Transisi rendah-karbon dapat mempercepat keusangan mesin → peninjauan umur manfaat.', ref: 'PSAK 16', route: 'psak16' },
    { area: 'Uji penurunan nilai (UPK & goodwill)', impact: 'Asumsi arus kas & tingkat diskonto memasukkan risiko transisi/fisik iklim.', ref: 'PSAK 48', route: 'psak48' },
    { area: 'Kerugian kredit ekspektasian (ECL)', impact: 'Overlay forward-looking mempertimbangkan eksposur pelanggan sektor sensitif-iklim.', ref: 'PSAK 71', route: 'psak71' },
    { area: 'Provisi & liabilitas lingkungan', impact: 'Kewajiban restorasi/emisi dinilai bila ada kewajiban kini akibat regulasi.', ref: 'PSAK 57', route: 'psak48' },
    { area: 'Kelangsungan usaha', impact: 'Risiko iklim material dipertimbangkan dalam penilaian going concern.', ref: 'PSAK 1', route: 'goingconcern' },
  ];

  return (
    <>
      <SubBar moduleId="newdisc" right={
        <div className="row gap8 ac">
          <Badge kind="amber">Baru · efektif 2024</Badge>
          <Btn sm onClick={() => nav('psak46', { from: 'newdisc' })}><I.receipt size={13} /> PSAK 46</Btn>
          <Btn sm variant="primary" onClick={() => nav('fsgen', { from: 'newdisc' })}><I.report size={14} /> FS Generator</Btn>
        </div>
      } />
      <div className="view-scroll">
        <div className="view-pad" style={{ display: 'grid', gap: 12 }}>
          <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="panel-h" style={{ padding: 0, background: 'var(--surface-2)' }}>
              <Tabs tabs={TABS} active={tab} onChange={setTab} />
            </div>
            <div style={{ padding: 14 }}>

              {tab === 'pilar2' && <>
                <div className="grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 12 }}>
                  <Panel><div style={{ padding: '15px 18px' }}><Stat value={P2_MIN_RATE.toFixed(0) + '%'} label="Tarif minimum efektif (GloBE)" accent="var(--navy)" /></div></Panel>
                  <Panel><div style={{ padding: '15px 18px' }}>
                    <Stat value={pct(p2.etrGroup)} label={p2.groupScoped ? 'ETR grup konsolidasian' : 'ETR entitas induk (grup belum terdaftar)'}
                      accent={p2.etrGroup == null ? 'var(--ink-4)' : (p2.etrGroup >= P2_MIN_RATE ? 'var(--green)' : 'var(--amber)')} />
                  </div></Panel>
                  <Panel><div style={{ padding: '15px 18px' }}>
                    {/* null = TAK DAPAT DIASERSIKAN. Menampilkan "Rp 0 jt" di sini akan
                        mengucapkan kesimpulan ("tak ada eksposur") yang tak dimiliki. */}
                    <Stat value={p2.topUp == null ? 'Tak dapat diasersikan' : J(p2.topUp)}
                      label="Eksposur top-up tax" accent={p2.topUp == null ? 'var(--ink-4)' : 'var(--amber)'} />
                  </div></Panel>
                </div>

                {!p2.available && (
                  <CannotAssert title="Neraca saldo perikatan ini belum tersedia">
                    Profil pajak per yurisdiksi diturunkan dari neraca saldo entitas induk (<Src module="wtb">WTB</Src>) dan struktur grup kanonik. Tanpa neraca saldo, ETR maupun eksposur pajak tambahan tidak dapat dihitung — dan tidak dikarang.
                  </CannotAssert>
                )}

                {p2.available && !p2.groupScoped && (
                  <CannotAssert title="Struktur grup per-yurisdiksi belum terdaftar untuk perikatan ini">
                    Hanya yurisdiksi <b>entitas induk</b> yang dapat diturunkan (dari neraca saldonya sendiri). Entitas anak, yurisdiksi asing, dan karenanya uji ambang cakupan GloBE belum dapat disimpulkan. Struktur grup kanonik (<Src module="psak65">PSAK 65</Src> · <Src module="groupaudit">SA 600</Src>) melekat pada perikatan <span className="mono">{DEFAULT_ENG_ID}</span> dan <b>tidak dipinjamkan</b> ke perikatan lain.
                  </CannotAssert>
                )}

                {p2.available && (
                  <div className="panel" style={{ padding: '11px 13px', marginBottom: 12, borderLeft: '4px solid ' + (p2.inScope ? 'var(--amber)' : 'var(--green)') }}>
                    <div className="row ac gap8" style={{ marginBottom: 4 }}>
                      <b style={{ fontSize: 12 }}>Uji ambang cakupan GloBE</b>
                      <Badge kind={p2.inScope ? 'amber' : (p2.scopeKnown ? 'green' : 'gray')}>
                        {!p2.scopeKnown ? 'Belum dapat disimpulkan' : (p2.inScope ? 'Masuk cakupan' : 'Di luar cakupan')}
                      </Badge>
                    </div>
                    <div className="tiny" style={{ color: 'var(--ink-2)', lineHeight: 1.55 }}>
                      Aturan GloBE berlaku bagi grup dengan pendapatan konsolidasian <b>≥ EUR {fmt(P2_THRESHOLD_EUR / 1e6, 0)} juta</b> (OECD Model Rules Art. 1.1; PMK 136/2024).
                      {' '}Pendapatan {p2.groupScoped ? 'konsolidasian' : 'entitas induk'} terhitung: <b className="mono">{J(p2.totRev)}</b>.
                      {p2.thresholdRp != null
                        ? <> Ambang setara <b>{J(p2.thresholdRp)}</b> pada kurs penutup <span className="mono">{reportDate}</span>.</>
                        : <> Ambang <b>tidak dapat dinyatakan dalam rupiah</b>: registry kurs bermasa berlaku tak mencakup tanggal pelaporan <span className="mono">{reportDate}</span>{D.fx.note ? <> — {D.fx.note}</> : null}. Memakai kurs masa lain untuk menyimpulkan cakupan adalah cacat yang sama dengan yang dicabut <Src module="cashbank">registry kurs</Src>.</>}
                      {p2.scopeKnown && !p2.inScope && <> Grup berada <b>di bawah ambang</b>, sehingga pajak tambahan tidak berlaku dan eksposurnya <b>tidak diasersikan</b> — bukan dinyatakan nol.</>}
                    </div>
                  </div>
                )}

                <div className="panel" style={{ padding: '11px 13px', marginBottom: 12, borderLeft: '4px solid var(--blue)' }}>
                  <div className="tiny" style={{ color: 'var(--ink-2)', lineHeight: 1.55 }}>
                    <b>Pengecualian sementara (amandemen PSAK 46/212):</b> Grup <b>menerapkan pengecualian wajib</b> dari pengakuan & pengungkapan aset/liabilitas pajak tangguhan yang timbul dari aturan Pilar Dua OECD. Legislasi belum berlaku efektif di Indonesia pada periode pelaporan; Grup mengungkapkan eksposur yang <b>diketahui/dapat diestimasi secara wajar</b>.
                  </div>
                </div>

                {p2.available && <>
                  <SectionTitle right={<span className="tiny muted">ETR per yurisdiksi · turunan WTB + struktur grup</span>}>Profil Pajak per Yurisdiksi</SectionTitle>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead><tr style={{ borderBottom: '1.5px solid var(--line-strong)' }}>
                      <th style={{ textAlign: 'left', padding: '7px 6px' }}>Yurisdiksi</th>
                      <th style={{ textAlign: 'right', padding: '7px 6px' }}>Laba sebelum pajak</th>
                      <th style={{ textAlign: 'right', padding: '7px 6px' }}>Beban pajak</th>
                      <th style={{ textAlign: 'right', padding: '7px 6px' }}>ETR</th>
                      <th style={{ textAlign: 'right', padding: '7px 6px' }}>Top-up</th>
                    </tr></thead>
                    <tbody>
                      {p2.juris.map((j: P2JurisRow) => (
                        <tr key={j.country} data-testid="p2-juris-row" style={{ borderBottom: '1px solid var(--line-soft)' }}>
                          <td style={{ padding: '7px 6px' }}>
                            <b>{j.country}</b>
                            <div className="tiny muted">{j.entities.join(' · ')}</div>
                          </td>
                          <td className="num mono" style={{ textAlign: 'right', padding: '7px 6px' }}>{fmt(j.pbt, 0)}</td>
                          <td className="num mono" style={{ textAlign: 'right', padding: '7px 6px' }}>{fmt(j.tax, 0)}</td>
                          <td className="num mono" style={{ textAlign: 'right', padding: '7px 6px', color: j.etr != null && j.etr < P2_MIN_RATE ? 'var(--amber)' : 'var(--ink-2)', fontWeight: 700 }}>{pct(j.etr)}</td>
                          <td className="num mono" style={{ textAlign: 'right', padding: '7px 6px', color: j.topUp ? 'var(--amber)' : 'var(--ink-4)' }}>{j.topUp == null ? '—' : (j.topUp ? fmt(j.topUp, 0) : '—')}</td>
                        </tr>
                      ))}
                      <tr style={{ borderTop: '1.5px solid var(--line-strong)' }}>
                        <td style={{ padding: '7px 6px', fontWeight: 700 }}>Total</td>
                        <td className="num mono" style={{ textAlign: 'right', padding: '7px 6px', fontWeight: 700 }}>{fmt(p2.totPbt, 0)}</td>
                        <td className="num mono" style={{ textAlign: 'right', padding: '7px 6px', fontWeight: 700 }}>{fmt(p2.totTax, 0)}</td>
                        <td className="num mono" style={{ textAlign: 'right', padding: '7px 6px', fontWeight: 700 }}>{pct(p2.etrGroup)}</td>
                        <td className="num mono" style={{ textAlign: 'right', padding: '7px 6px', fontWeight: 700 }}>{p2.topUp == null ? '—' : fmt(p2.topUp, 0)}</td>
                      </tr>
                    </tbody>
                  </table>
                  <div className="tiny muted" style={{ marginTop: 8, fontStyle: 'italic' }}>
                    Laba & beban pajak entitas induk ditarik dari <Src module="wtb">WTB</Src> (kolom adjusted); entitas anak dari paket komponen yang SAMA dipakai <Src module="psak65">PSAK 65</Src> & <Src module="groupaudit">Group Audit</Src>. Eliminasi laba antar-perusahaan dibebankan pada yurisdiksi induk sebagai penjual. Angka Rp juta.
                  </div>
                </>}
              </>}

              {tab === 'iklim' && <>
                <div className="panel" style={{ padding: '11px 13px', marginBottom: 12, background: 'var(--teal-bg)', borderColor: 'transparent' }}>
                  <div className="tiny" style={{ color: 'var(--ink-2)', lineHeight: 1.55 }}>
                    <b>Lampiran C — Dampak perubahan iklim.</b> Grup menilai dampak risiko iklim (fisik & transisi) terhadap estimasi dan pertimbangan dalam LK. Pengungkapan dijaga <b>konsisten</b> dengan laporan keberlanjutan/manajemen (kewajiban pelaporan emisi). Tidak terdapat dampak penyesuai material teridentifikasi pada periode ini.
                  </div>
                </div>
                <SectionTitle right={<span className="tiny muted">Area terdampak</span>}>Pengaruh Iklim terhadap Estimasi Akuntansi</SectionTitle>
                <div style={{ display: 'grid', gap: 8 }}>
                  {CLIMATE_AREAS.map((c, i) => (
                    <div key={i} className="panel" style={{ padding: '11px 13px', cursor: 'pointer' }} onClick={() => nav(c.route, { from: 'newdisc' })}>
                      <div className="row ac gap8" style={{ marginBottom: 3 }}>
                        <span style={{ color: 'var(--teal)' }}><I.pulse size={15} /></span>
                        <b style={{ fontSize: 12, flex: 1 }}>{c.area}</b>
                        <Badge kind="gray">{c.ref}</Badge>
                        <I.arrowRight size={13} style={{ color: 'var(--ink-4)' }} />
                      </div>
                      <div className="tiny" style={{ color: 'var(--ink-2)', lineHeight: 1.45, paddingLeft: 23 }}>{c.impact}</div>
                    </div>
                  ))}
                </div>
                <div className="panel" style={{ marginTop: 12, padding: '10px 12px', background: 'var(--surface-2)', borderColor: 'transparent' }}>
                  <div className="tiny" style={{ color: 'var(--ink-3)', lineHeight: 1.5 }}>Bersinggungan dengan jasa <b>asurans emisi GRK (SJAH 3410)</b> — kandidat layanan keberlanjutan firma di <Src module="compmatrix">Matriks Kepatuhan</Src>.</div>
                </div>
              </>}

              {tab === 'supplier' && <>
                <div className="grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 12 }}>
                  <Panel><div style={{ padding: '15px 18px' }}>
                    {/* POPULASI, bukan jumlah dalam pengaturan — labelnya harus mengatakan itu. */}
                    <Stat value={sf.tradePayables == null ? '—' : J(sf.tradePayables)}
                      label="Utang usaha per buku besar" accent="var(--navy)" />
                  </div></Panel>
                  <Panel><div style={{ padding: '15px 18px' }}>
                    <Stat value={sf.carrying == null ? 'Tak dapat diasersikan' : J(sf.carrying)}
                      label="Nilai tercatat dalam pengaturan" accent={sf.carrying == null ? 'var(--ink-4)' : 'var(--blue)'} />
                  </div></Panel>
                  <Panel><div style={{ padding: '15px 18px' }}>
                    <Stat value={sf.rangeDays == null ? 'Tak dapat diasersikan' : sf.rangeDays}
                      label="Rentang jatuh tempo pengaturan" accent={sf.rangeDays == null ? 'var(--ink-4)' : undefined} />
                  </div></Panel>
                </div>

                {!sf.registered && (
                  <CannotAssert title="Register pengaturan pendanaan pemasok belum ada">
                    Amandemen PSAK 2 & PSAK 7 menuntut pengungkapan <b>syarat & ketentuan</b>, <b>nilai tercatat</b> liabilitas dalam pengaturan, jumlah yang <b>telah ditarik</b> penyedia, serta <b>rentang jatuh tempo</b> dibandingkan termin normal pemasok. Tak satu pun dapat diturunkan dari neraca saldo: buku besar hanya menyimpan <b>utang usaha agregat</b>, dan bagian yang berada di dalam pengaturan bukan himpunan yang sama. Angka-angka itu karena itu <b>tidak ditampilkan</b> sampai registernya ada — menyamakan nilai tercatat dengan seluruh utang usaha hanya akan menukar satu karangan dengan karangan lain.
                  </CannotAssert>
                )}

                <div className="panel" style={{ padding: '11px 13px', marginBottom: 12, borderLeft: '4px solid var(--blue)' }}>
                  <div className="tiny" style={{ color: 'var(--ink-2)', lineHeight: 1.55 }}>
                    <b>Amandemen PSAK 2 & PSAK 7 (efektif 2024).</b> Bila entitas mengikat pengaturan pendanaan pemasok dan karakteristiknya tetap menyerupai utang dagang, liabilitas disajikan sebagai <b>Utang Usaha</b> — bukan pinjaman — dengan pengungkapan terpisah atas nilai tercatat, jangka waktu, dan dampak likuiditas. Penentuan klasifikasi itu <b>keputusan berbasis bukti perikatan</b>, bukan bawaan modul.
                  </div>
                </div>

                <SectionTitle right={<span className="tiny muted">Penyajian & klasifikasi</span>}>Ikhtisar Pengaturan</SectionTitle>
                <div style={{ display: 'grid', gap: 6, maxWidth: 620 }}>
                  {[
                    ['Utang usaha per buku besar (populasi)', sf.tradePayables],
                    ['Nilai tercatat dalam pengaturan', sf.carrying],
                    ['Telah ditarik penyedia (dibayar lebih awal ke pemasok)', sf.drawn],
                    ['Utang usaha di luar pengaturan', sf.outsideArrangement],
                    ['Jumlah penyedia keuangan', sf.providers],
                  ].map((r, i) => (
                    <div key={i} className="row jb ac" style={{ padding: '8px 10px', borderBottom: '1px solid var(--line-soft)' }}>
                      <span style={{ fontSize: 12 }}>{r[0]}</span>
                      <span className="mono" style={{ fontWeight: 600, color: r[1] == null ? 'var(--ink-4)' : undefined }}>
                        {r[1] == null ? 'tak diketahui' : fmt(r[1] as number, 0)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="panel" style={{ marginTop: 12, padding: '10px 12px' }}>
                  <div className="tiny upper muted" style={{ fontWeight: 700, marginBottom: 5 }}>Risiko likuiditas</div>
                  <div className="tiny" style={{ color: 'var(--ink-2)', lineHeight: 1.5 }}>Konsentrasi pembayaran pada penyedia pendanaan dapat meningkatkan risiko likuiditas bila fasilitas ditarik. Dampak arus kas diungkapkan terpisah dalam <Src module="fsgen">Laporan Arus Kas</Src> (PSAK 2).</div>
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
export { NewDisclosures2024 };
