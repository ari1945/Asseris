/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { useNav } from './contexts';
import { I } from './icons';
import { SubBar } from './shell';
import { Badge, Btn, Panel, Tabs } from './ui';
import { KvBox } from './view_analytical';
import { RowKv } from './view_calc';
import { amsDateLongId } from './clock_ssot';

/* ============================================================
   Asseris — SPR 2400 · Perikatan Reviu atas LK Historis

   LAPISAN METODOLOGI/STANDAR. Isi standar (kontinum keyakinan, desain
   prosedur ¶45–57, pemicu prosedur tambahan, bentuk simpulan ¶86–96) memang
   literal di sini — itu materi standar, bukan fakta perikatan.

   Yang TIDAK boleh literal adalah FAKTA PERIKATAN. Sebelumnya berkas ini
   mengetik sendiri materialitas reviu, nama akuntan publik penanda tangan,
   dan id perikatan — padahal ketiganya sudah punya catatan kanonik:

     · materialitas / tolok ukur / mat. pelaksanaan → `AMS.REVIEW_2400_PLAN`
       (dirender modul `review2400` sebagai "Materialitas Reviu"; salinan di
       sini akan membusuk diam-diam begitu rencana reviu berubah)
     · identitas & simpulan terekam                → `AMS.REVIEW_2400`
     · rekan perikatan                             → registri `AMS.NONAUDIT`

   Catatan sengaja TIDAK memakai `useMateriality()`: hook itu membaca
   `useFirm().activeEngagement`, yaitu perikatan AUDIT aktif — entitas yang
   BERBEDA dari perikatan reviu yang ditautkan modul ini. Memakainya akan
   menampilkan materialitas entitas lain di bawah judul reviu.

   Angka perikatan HIDUP di modul `review2400`; modul ini menautkannya dan
   menyatakan bahwa yang ditampilkan adalah REKAMAN, bukan kertas kerja.
   Gerbang: `spr2400_conventions.test.ts`.
   ============================================================ */
const { useState: useState2400 } = React;

/* Tipe struktural MINIMAL — BUKAN `any`. `AMS.REVIEW_2400` & kawan-kawan
   lolos lewat index signature `[k: string]: unknown` di `AmsData`, jadi
   penyempitannya dilakukan di sini (pola yang sama dipakai `useMateriality()`
   di contexts.tsx). Satu `:any` baru di berkas ini meng-un-suppress seluruh
   berkas pada ratchet ESLint. */
type RevInquiry = { q: string; resp: string; done: boolean };
type RevRecord = { id: string; client: string; fy: string; framework: string; inquiries: RevInquiry[]; conclusion: string };
type RevPlan = { materiality: number; benchmark: string; pm: number };
type NonAuditRow = { id: string; partner?: string; manager?: string };

const revRecord = (): RevRecord | null => (AMS.REVIEW_2400 as RevRecord | undefined) || null;
const revPlan = (): RevPlan | null => (AMS.REVIEW_2400_PLAN as RevPlan | undefined) || null;
const revPartner = (id: string): string => {
  const rows = (AMS.NONAUDIT as NonAuditRow[] | undefined) || [];
  const hit = rows.find((r) => r.id === id);
  return (hit && hit.partner) || '';
};

/* ---- Kontinum tingkat keyakinan ----
   `color` = kind Badge (kelas `b-*`, di mana `gray` memang ada). `bar` =
   token CSS UTUH untuk isian batang — dienumerasi, bukan dirakit runtime,
   supaya pemindai token statis benar-benar bisa melihatnya. */
const ASSUR_CONTINUUM = [
  { k: 'Audit (SA 200+)', level: 'Memadai', pct: 95, color: 'blue', bar: 'var(--blue)', proc: 'Risk assessment, uji pengendalian, prosedur substantif menyeluruh', concl: 'Opini positif ("menyajikan secara wajar")' },
  { k: 'Reviu (SPR 2400)', level: 'Terbatas', pct: 60, color: 'teal', bar: 'var(--teal)', proc: 'Terutama inquiry & prosedur analitis', concl: 'Simpulan negatif ("tidak ada hal yang menjadi perhatian")', here: true },
  { k: 'Kompilasi (SPSJL 4410)', level: 'Tanpa', pct: 8, color: 'gray', bar: 'var(--ink-4)', proc: 'Penyusunan informasi tanpa verifikasi', concl: 'Tanpa simpulan asurans' },
];

/* ---- Prosedur reviu (desain) ---- */
const REV_PROC = [
  { area: 'Pemahaman Entitas', ref: '¶45', type: 'Inquiry', d: 'Bisnis, sistem akuntansi, & kebijakan untuk merancang prosedur reviu.', risk: 'Dasar' },
  { area: 'Prosedur Analitis', ref: '¶47', type: 'Analitis', d: 'Bandingkan saldo/rasio dengan ekspektasi, tren, & data industri.', risk: 'Tinggi' },
  { area: 'Inquiry Manajemen', ref: '¶48', type: 'Inquiry', d: 'Permintaan keterangan atas pos signifikan, estimasi, & kebijakan.', risk: 'Tinggi' },
  { area: 'Pihak Berelasi', ref: '¶49', type: 'Inquiry', d: 'Identifikasi & evaluasi transaksi dengan pihak berelasi.', risk: 'Sedang' },
  { area: 'Kelangsungan Usaha', ref: '¶52', type: 'Inquiry', d: 'Inquiry rencana manajemen bila terdapat indikasi keraguan.', risk: 'Sedang' },
  { area: 'Peristiwa Kemudian', ref: '¶57', type: 'Inquiry', d: 'Inquiry peristiwa yang memerlukan penyesuaian/pengungkapan.', risk: 'Sedang' },
];

/* ---- Pemicu prosedur tambahan ---- */
const ADD_TRIGGERS = [
  { t: 'Prosedur menemukan kemungkinan salah saji material', ref: '¶57', action: 'Rancang & laksanakan prosedur tambahan untuk memperoleh bukti memadai.' },
  { t: 'Jawaban inquiry tidak konsisten / tidak memuaskan', ref: '¶50', action: 'Evaluasi respons; tindak lanjuti dengan prosedur lain.' },
  { t: 'Fluktuasi analitis signifikan tanpa penjelasan wajar', ref: '¶56', action: 'Inquiry lanjutan & evaluasi bukti pendukung.' },
];

/* ---- Kriteria evaluasi kecukupan bukti (¶55) ----
   Ini KRITERIA, bukan status. Sebelumnya keempatnya dipasangkan flag
   true/true/true/false yang tak punya sumber mana pun dan terbaca sebagai
   status perikatan. Penilaiannya dilakukan di kertas kerja perikatan reviu. */
const EVID_CRITERIA = [
  'Bukti memadai untuk menyimpulkan tidak ada salah saji material yang teridentifikasi (¶55)',
  'Prosedur analitis & inquiry menghasilkan dasar simpulan yang masuk akal (¶47–48)',
  'Inkonsistensi/anomali ditindaklanjuti hingga tuntas (¶50, ¶56)',
  'Representasi tertulis manajemen diperoleh (¶61)',
];

/* ============================================================ */
function SPR2400View() {
  const [tab, setTab] = useState2400('kontinum');
  const nav = useNav();
  const R = revRecord();

  /* Drawer AI Co-pilot global (didaftarkan App). Sebelumnya tombol ini tak
     punya handler sama sekali — mati, tetapi tetap diumumkan pembaca layar. */
  const openCopilot = () => { if (window.__amsOpenCopilot) window.__amsOpenCopilot(); };

  const tabs = [
    { id: 'kontinum', label: 'Kontinum Keyakinan' },
    { id: 'prosedur', label: 'Prosedur Reviu' },
    { id: 'bukti', label: 'Materialitas & Bukti' },
    { id: 'simpulan', label: 'Bentuk Simpulan' },
  ];

  return (
    <>
      <SubBar moduleId="spr2400" right={
        <div className="row gap8 ac">
          <Badge kind="teal" dot>Keyakinan Terbatas</Badge>
          <Btn sm onClick={() => nav('review2400')}><I.search2 size={13} /> Perikatan Langsung</Btn>
          <Btn sm variant="primary" onClick={openCopilot}><I.sparkle size={14} /> AI Assist</Btn>
        </div>
      } />
      <div className="view-scroll"><div className="view-pad">

        <Panel noBody style={{ marginBottom: 12 }}>
          <div style={{ padding: '13px 16px', display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ minWidth: 230 }}>
              <div className="tiny muted upper" style={{ marginBottom: 3 }}>Standar Perikatan Reviu 2400</div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>Reviu atas Laporan Keuangan Historis</div>
              <div className="tiny muted">Perikatan asurans — keyakinan terbatas</div>
            </div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Sifat Keyakinan</div><div className="mono" style={{ fontWeight: 700, fontSize: 12, color: 'var(--teal)' }}>Terbatas (negatif)</div></div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Prosedur Utama</div><div className="mono" style={{ fontWeight: 700, fontSize: 12 }}>Inquiry & Analitis</div></div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Bentuk Opini</div><div className="mono" style={{ fontWeight: 700, fontSize: 12 }}>Simpulan negatif</div></div>
            <div style={{ flex: 1 }} />
            {/* "Tertaut", BUKAN "Aktif": modul ini lapisan standar & tidak
                ter-scope ke perikatan mana pun. Ia menautkan satu perikatan
                reviu — dan menyebut id itu dari rekamannya, bukan mengetiknya. */}
            <div style={{ textAlign: 'right' }}>
              <div className="tiny muted upper" style={{ marginBottom: 3 }}>Perikatan Reviu Tertaut</div>
              {R
                ? <><Badge kind="blue">{R.id}</Badge><div className="tiny muted" style={{ marginTop: 3 }}>{R.client} · {R.fy}</div></>
                : <span className="tiny muted">Tidak ada perikatan reviu tercatat</span>}
            </div>
          </div>
        </Panel>

        <div style={{ marginBottom: 12 }}><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>

        {tab === 'kontinum' && <F2400Continuum />}
        {tab === 'prosedur' && <F2400Proc />}
        {tab === 'bukti' && <F2400Evidence />}
        {tab === 'simpulan' && <F2400Concl />}

      </div></div>
    </>
  );
}

/* ---------------- Tab: Kontinum Keyakinan ---------------- */
function F2400Continuum() {
  return (
    <div className="grid" style={{ gap: 12 }}>
      <Panel noBody>
        <div className="panel-h"><h3>Kontinum Tingkat Keyakinan Jasa</h3><div style={{ flex: 1 }} /><Badge kind="teal">SPR 2400 = keyakinan terbatas</Badge></div>
        <div style={{ padding: 16 }}>
          {/* bar spektrum */}
          <div style={{ position: 'relative', height: 12, borderRadius: 6, background: 'linear-gradient(90deg,var(--surface-3),var(--teal-solid),var(--blue-solid))', marginBottom: 22 }}>
            <div style={{ position: 'absolute', left: '60%', top: -5, bottom: -5, width: 2, background: 'var(--navy-solid)' }} />
            <div style={{ position: 'absolute', left: '60%', top: -22, transform: 'translateX(-50%)' }}><span className="chip tiny" style={{ background: 'var(--teal-bg)', color: 'var(--teal)', fontWeight: 700 }}>Reviu di sini</span></div>
          </div>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
            {ASSUR_CONTINUUM.map((c, i) => (
              <div key={i} className="panel" style={{ padding: 13, boxShadow: 'none', borderColor: c.here ? 'var(--teal)' : 'var(--line)', borderWidth: c.here ? 2 : 1, background: c.here ? 'var(--teal-bg)' : 'transparent' }}>
                <div className="row jb ac"><div style={{ fontSize: 12, fontWeight: 700 }}>{c.k}</div><Badge kind={c.color}>{c.level}</Badge></div>
                <div style={{ margin: '10px 0 6px', height: 6, borderRadius: 3, background: 'var(--surface-3)' }}><div style={{ width: c.pct + '%', height: '100%', borderRadius: 3, background: c.bar }} /></div>
                <div className="tiny muted" style={{ lineHeight: 1.45, marginBottom: 8 }}>{c.proc}</div>
                <div className="chip tiny" style={{ background: 'var(--surface-2)', whiteSpace: 'normal', height: 'auto', lineHeight: 1.4, padding: '4px 8px' }}>{c.concl}</div>
              </div>
            ))}
          </div>
        </div>
      </Panel>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }}>
        <Panel noBody>
          <div className="panel-h"><h3>Audit vs Reviu — Perbandingan</h3></div>
          <table className="dtbl">
            <thead><tr><th>Aspek</th><th>Audit (SA)</th><th>Reviu (SPR 2400)</th></tr></thead>
            <tbody>
              {[
                ['Tingkat keyakinan', 'Memadai (tinggi)', 'Terbatas'],
                ['Prosedur utama', 'Risk assessment + substantif', 'Inquiry & analitis'],
                ['Uji pengendalian', 'Ya, bila diandalkan', 'Tidak'],
                ['Konfirmasi & observasi fisik', 'Umumnya ya', 'Tidak rutin'],
                ['Bentuk simpulan', 'Positif', 'Negatif'],
              ].map((r, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{r[0]}</td>
                  <td className="tiny">{r[1]}</td>
                  <td className="tiny" style={{ color: 'var(--teal)', fontWeight: 600 }}>{r[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <Panel noBody>
          <div className="panel-h"><h3>Prasyarat Perikatan Reviu (¶29–37)</h3></div>
          <div style={{ padding: '8px 14px 14px', display: 'grid', gap: 8 }}>
            {[
              'Kerangka pelaporan keuangan dapat diterima (mis. SAK / SAK EP)',
              'Persetujuan atas premis tanggung jawab manajemen',
              'Independensi & etika terpenuhi (SMM 1 / kode etik)',
              'Tidak ada pembatasan lingkup yang menghalangi simpulan',
            ].map((t, i) => (
              <div key={i} className="row gap8" style={{ fontSize: 12, alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--green)', flex: '0 0 auto', marginTop: 1 }}><I.checkCircle size={15} /></span>
                <span style={{ lineHeight: 1.45 }}>{t}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ---------------- Tab: Prosedur Reviu ---------------- */
function F2400Proc() {
  const tk = (t: any) => t === 'Analitis' ? 'purple' : 'teal';
  const R = revRecord();
  return (
    <div className="grid split" style={{ gridTemplateColumns: '1fr 340px', gap: 12, alignItems: 'start' }}>
      <Panel noBody>
        <div className="panel-h"><h3>Desain Prosedur Reviu (¶45–57)</h3><div style={{ flex: 1 }} /><span className="tiny muted">{REV_PROC.length} area</span></div>
        <table className="dtbl">
          <thead><tr><th>Area Prosedur</th><th style={{ width: 86 }}>Jenis</th><th style={{ width: 80 }}>Risiko</th><th style={{ width: 54 }}>Ref</th></tr></thead>
          <tbody>
            {REV_PROC.map((p, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 600, whiteSpace: 'normal', lineHeight: 1.35 }}>{p.area}<div className="tiny muted" style={{ fontWeight: 400, marginTop: 2 }}>{p.d}</div></td>
                <td><Badge kind={tk(p.type)}>{p.type}</Badge></td>
                <td><Badge kind={p.risk === 'Tinggi' ? 'red' : p.risk === 'Sedang' ? 'amber' : 'gray'}>{p.risk}</Badge></td>
                <td className="mono tiny" style={{ color: 'var(--blue)', fontWeight: 700 }}>{p.ref}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="panel" style={{ margin: 12, padding: '10px 12px', background: 'var(--teal-bg)', borderColor: 'transparent' }}>
          <div className="row gap8" style={{ alignItems: 'flex-start' }}>
            <span style={{ color: 'var(--teal)', flex: '0 0 auto' }}><I.book size={15} /></span>
            <span style={{ fontSize: 12, lineHeight: 1.45 }}>Reviu <b>terutama</b> terdiri dari <b>inquiry & prosedur analitis</b> — bukan pengujian rinci. Prosedur dirancang berdasarkan pemahaman entitas & area berisiko salah saji material (¶46–47).</span>
          </div>
        </div>
      </Panel>

      <div className="grid" style={{ gap: 12 }}>
        <Panel title="Pemicu Prosedur Tambahan (¶57)">
          <div style={{ display: 'grid', gap: 8 }}>
            {ADD_TRIGGERS.map((t, i) => (
              <div key={i} className="panel" style={{ padding: '9px 11px', boxShadow: 'none', borderLeft: '3px solid var(--amber)' }}>
                <div className="row jb ac"><div style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.35 }}>{t.t}</div><span className="mono tiny" style={{ color: 'var(--amber)', fontWeight: 700, flex: '0 0 auto', marginLeft: 6 }}>{t.ref}</span></div>
                <div className="tiny muted" style={{ marginTop: 4, lineHeight: 1.4 }}>{t.action}</div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Lihat di Perikatan Langsung">
          <NavRow2400 to="review2400" label={R ? `${R.id} · Analitis & Inquiry` : 'Perikatan reviu · Analitis & Inquiry'} />
          <p className="tiny muted" style={{ margin: '8px 0 0', lineHeight: 1.5 }}>Prosedur analitis & inquiry yang dilaksanakan beserta tindak lanjutnya tersedia pada workspace perikatan reviu.</p>
        </Panel>
      </div>
    </div>
  );
}

/* Kontrol NATIVE: sebelumnya `<div onClick>` — tak bisa dituju keyboard dan
   tak diumumkan sebagai kontrol oleh pembaca layar. */
type NavRow2400Props = { to: string; label: string };
function NavRow2400({ to, label }: NavRow2400Props) {
  const nav = useNav();
  return (
    <button
      type="button"
      onClick={() => nav(to)}
      className="row jb ac"
      style={{ width: '100%', textAlign: 'left', fontFamily: 'inherit', fontSize: 12, padding: '8px 10px', border: '1px solid var(--line-soft)', borderRadius: 7, background: 'transparent', color: 'inherit', cursor: 'pointer' }}
    >
      <span className="row ac gap8"><span style={{ color: 'var(--teal)' }}><I.search2 size={14} /></span>{label}</span>
      <I.arrowRight size={14} style={{ color: 'var(--ink-4)' }} />
    </button>
  );
}

/* ---------------- Tab: Materialitas & Bukti ---------------- */
function F2400Evidence() {
  const { fmt } = AMS;
  const nav = useNav();
  const R = revRecord();
  const P = revPlan();
  const inq = (R && R.inquiries) || [];
  const inqDone = inq.filter((x) => x.done).length;

  return (
    <div className="grid split" style={{ gridTemplateColumns: '1fr 340px', gap: 12, alignItems: 'start' }}>
      <div className="grid" style={{ gap: 12 }}>
        <Panel noBody>
          <div className="panel-h"><h3>Materialitas dalam Reviu (¶43–44)</h3></div>
          <div style={{ padding: 14 }}>
            <p style={{ margin: '0 0 12px', fontSize: 12, lineHeight: 1.55 }}>Konsep materialitas diterapkan serupa dengan audit — namun digunakan untuk merancang prosedur reviu &amp; mengevaluasi apakah laporan keuangan secara keseluruhan bebas dari salah saji material.</p>
            {P ? (
              <div className="grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                <KvBox label="Materialitas Reviu" v={`Rp ${fmt(P.materiality / 1e6, 0)} jt`} accent="var(--navy)" />
                <KvBox label="Tolok Ukur" v={P.benchmark} accent="var(--teal)" />
                <KvBox label="Mat. Pelaksanaan" v={`Rp ${fmt(P.pm / 1e6, 0)} jt`} />
              </div>
            ) : (
              <div className="tiny muted" style={{ lineHeight: 1.5 }}>Rencana reviu belum tercatat — materialitas tidak tersedia. Modul ini tidak menetapkan angka sendiri.</div>
            )}
            <p className="tiny muted" style={{ margin: '10px 0 0', lineHeight: 1.55 }}>
              Angka di atas adalah <b>rencana reviu yang tercatat</b> untuk {R ? <>{R.id} · {R.client}</> : 'perikatan reviu tertaut'} — bukan materialitas perikatan audit mana pun. Penetapan &amp; pengerjaannya ada di modul perikatan reviu.
            </p>
            <div style={{ marginTop: 10 }}>
              <Btn sm onClick={() => nav('review2400')}><I.search2 size={13} /> Buka perikatan reviu</Btn>
            </div>
          </div>
        </Panel>

        <Panel noBody>
          <div className="panel-h">
            <h3>Kecukupan Bukti untuk Keyakinan Terbatas (¶55)</h3>
            <div style={{ flex: 1 }} />
            {inq.length > 0 && <Badge kind={inqDone === inq.length ? 'green' : 'amber'}>{inqDone}/{inq.length} inquiry terjawab</Badge>}
          </div>
          <div style={{ padding: '8px 14px 14px' }}>
            {/* KRITERIA — tanpa flag status. Penilaian ada di kertas kerja. */}
            <div className="tiny muted upper" style={{ marginBottom: 8 }}>Kriteria evaluasi — dinilai di kertas kerja perikatan</div>
            <div style={{ display: 'grid', gap: 8 }}>
              {EVID_CRITERIA.map((t, i) => (
                <div key={i} className="row gap10" style={{ alignItems: 'flex-start' }}>
                  <span aria-hidden="true" style={{ flex: '0 0 auto', marginTop: 1, color: 'var(--ink-4)' }}>—</span>
                  <span style={{ fontSize: 12, lineHeight: 1.45 }}>{t}</span>
                </div>
              ))}
            </div>
            {inq.length > 0 && (
              <>
                <div className="tiny muted upper" style={{ margin: '14px 0 8px' }}>Status inquiry manajemen (rekaman perikatan)</div>
                <div style={{ display: 'grid', gap: 8 }}>
                  {inq.map((q, i) => (
                    <div key={i} className="row gap10" style={{ alignItems: 'flex-start' }}>
                      <span style={{ flex: '0 0 auto', marginTop: 1, color: q.done ? 'var(--green)' : 'var(--amber)' }}>{q.done ? <I.checkCircle size={16} /> : <I.clock size={16} />}</span>
                      <span style={{ fontSize: 12, lineHeight: 1.45 }}>{q.q}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </Panel>
      </div>

      <Panel title="Asurans Terbatas — Apa Artinya">
        <p className="tiny muted" style={{ margin: '0 0 10px', lineHeight: 1.55 }}>Tingkat risiko perikatan direduksi ke level yang <b>dapat diterima dalam keadaan perikatan</b>, namun lebih tinggi dibanding audit — menjadi dasar simpulan yang dinyatakan dalam <b>bentuk negatif</b>.</p>
        <div className="panel" style={{ padding: '10px 12px', background: 'var(--teal-bg)', borderColor: 'transparent' }}>
          <div className="tiny" style={{ lineHeight: 1.5, fontStyle: 'italic', color: 'var(--teal)' }}>"Tidak ada hal yang menjadi perhatian kami yang menyebabkan kami percaya bahwa laporan keuangan tidak disajikan secara wajar…"</div>
        </div>
        <div style={{ marginTop: 12, display: 'grid', gap: 7 }}>
          <RowKv label="Risiko perikatan" v="Lebih tinggi dari audit" />
          <RowKv label="Lingkup prosedur" v="Lebih sempit" />
          <RowKv label="Dasar simpulan" v="Masuk akal (negatif)" />
        </div>
      </Panel>
    </div>
  );
}

/* ---------------- Tab: Bentuk Simpulan ----------------
   Nada warna DIENUMERASI sebagai token utuh. Sebelumnya dirakit runtime
   (`var(--` + kunci + `)`) dengan salah satu kunci bernilai `gray` — dan
   `--gray` TIDAK PERNAH ADA di stylesheet mana pun, sehingga opsi keempat
   gagal DIAM (substitusi custom property yang gagal → deklarasi invalid →
   warna jatuh ke warisan, latar transparan). Perakitan runtime juga tak
   terbaca pemindai statis apa pun, termasuk `css_tokens.test.ts`. */
const CONCL_2400 = [
  { id: 'unmodified', badge: 'green', fg: 'var(--green)', bg: 'var(--green-bg)', l: 'Tanpa Modifikasian', ref: '¶86', d: 'Tidak ada hal yang menjadi perhatian yang menyebabkan auditor percaya LK tidak disajikan secara wajar.', txt: 'Berdasarkan reviu kami, tidak ada hal yang menjadi perhatian kami yang menyebabkan kami percaya bahwa laporan keuangan tidak menyajikan secara wajar, dalam semua hal yang material, sesuai dengan SAK.' },
  { id: 'qualified', badge: 'amber', fg: 'var(--amber)', bg: 'var(--amber-bg)', l: 'Dengan Pengecualian', ref: '¶94', d: 'Dampak hal tertentu material tetapi tidak pervasif terhadap laporan keuangan.', txt: 'Kecuali untuk dampak hal yang diuraikan dalam paragraf Basis, tidak ada hal yang menjadi perhatian kami yang menyebabkan kami percaya laporan keuangan tidak disajikan secara wajar sesuai SAK.' },
  { id: 'adverse', badge: 'red', fg: 'var(--red)', bg: 'var(--red-bg)', l: 'Merugikan (Adverse)', ref: '¶95', d: 'Dampak salah saji material & pervasif — LK tidak disajikan secara wajar.', txt: 'Berdasarkan reviu kami, karena signifikansi hal yang diuraikan, laporan keuangan tidak menyajikan secara wajar sesuai dengan SAK.' },
  { id: 'disclaimer', badge: 'gray', fg: 'var(--ink-3)', bg: 'var(--surface-3)', l: 'Tidak Menyatakan Simpulan', ref: '¶96', d: 'Pembatasan lingkup material & pervasif; bukti tidak cukup untuk menyimpulkan.', txt: 'Karena signifikansi hal yang diuraikan, kami tidak memperoleh bukti yang cukup sebagai dasar simpulan reviu; oleh karena itu kami tidak menyatakan simpulan.' },
];

function F2400Concl() {
  const R = revRecord();
  /* Simpulan TEREKAM perikatan — pemilih di bawah adalah alat belajar
     metodologi, dan pratinjau WAJIB menyatakan mana yang mana (preseden:
     field `basis` pada modul Treasury). */
  const rekamId = (R && R.conclusion) || '';
  const rekam = CONCL_2400.find((x) => x.id === rekamId) || null;
  const [sel, setSel] = useState2400(rekam ? rekam.id : CONCL_2400[0].id);
  const c = CONCL_2400.find((x) => x.id === sel) || CONCL_2400[0];
  const simulasi = !rekam || c.id !== rekam.id;
  const partner = R ? revPartner(R.id) : '';

  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 1.3fr', gap: 12, alignItems: 'start' }}>
      <Panel noBody>
        <div className="panel-h"><h3>Bentuk Simpulan Reviu</h3><div style={{ flex: 1 }} /><Badge kind="teal">Keyakinan negatif</Badge></div>
        {/* radiogroup NATIVE (fieldset + input[type=radio]): panah keyboard,
            semantik grup, dan nama aksesibel didapat gratis. Sebelumnya
            `<div onClick>` dengan lingkaran radio yang hanya digambar. */}
        <fieldset style={{ border: 0, margin: 0, padding: 14, display: 'grid', gap: 8 }}>
          <legend className="tiny muted upper" style={{ padding: 0, marginBottom: 4 }}>Pilih bentuk simpulan untuk melihat elemen laporannya</legend>
          {CONCL_2400.map((x) => {
            const on = sel === x.id;
            return (
              <label key={x.id} className="panel" style={{ display: 'block', padding: '11px 13px', cursor: 'pointer', boxShadow: 'none', borderColor: on ? x.fg : 'var(--line)', borderWidth: on ? 2 : 1, background: on ? x.bg : 'transparent' }}>
                <div className="row jb ac">
                  <span className="row ac gap8">
                    <input type="radio" name="spr2400-concl" value={x.id} checked={on} onChange={() => setSel(x.id)} />
                    <span style={{ fontSize: 12, fontWeight: 700 }}>{x.l}</span>
                    {rekam && rekam.id === x.id && <Badge kind="blue">Terekam</Badge>}
                  </span>
                  <span className="mono tiny" style={{ color: x.fg, fontWeight: 700 }}>{x.ref}</span>
                </div>
                <div className="tiny muted" style={{ marginTop: 5, lineHeight: 1.45, paddingLeft: 22 }}>{x.d}</div>
              </label>
            );
          })}
        </fieldset>
      </Panel>

      <Panel noBody>
        <div className="panel-h"><h3>Elemen Laporan Reviu (¶86)</h3><div style={{ flex: 1 }} /><Badge kind={c.badge}>{c.l}</Badge></div>
        <div style={{ padding: 18 }}>
          {/* BASIS — apa yang sedang ditampilkan, dan apa yang terekam. */}
          <div className="row gap8 ac" style={{ marginBottom: 10, flexWrap: 'wrap' }}>
            {simulasi
              ? <Badge kind="amber" dot>Simulasi metodologi — bukan simpulan perikatan</Badge>
              : <Badge kind="blue" dot>Simpulan terekam perikatan</Badge>}
            <span className="tiny muted">
              {rekam && R
                ? <>Simpulan terekam {R.id}: <b>{rekam.l}</b>{partner ? <> · rekan perikatan (registri): <b>{partner}</b></> : null}</>
                : <>Tidak ada simpulan terekam pada perikatan reviu tertaut.</>}
            </span>
          </div>
          {/* Hex di dalam `.doc-paper` mensimulasikan kertas cetak putih dan
              SENGAJA tidak ikut tema — di luar lingkup PR ini, dilaporkan. */}
          <div className="doc-paper" style={{ background: '#fff', padding: '32px 36px', boxShadow: 'var(--shadow)', fontSize: 12, lineHeight: 1.7, color: '#283b46' }}>
            <div style={{ fontWeight: 800, fontSize: 13, color: '#0c2430', textAlign: 'center', marginBottom: 4 }}>LAPORAN REVIU PRAKTISI INDEPENDEN</div>
            <div className="tiny" style={{ textAlign: 'center', color: '#7a8893', marginBottom: 16 }}>Templat elemen — Standar Perikatan Reviu (SPR) 2400</div>
            <div style={{ fontWeight: 700, color: '#0c2430', margin: '0 0 4px' }}>Tanggung Jawab Praktisi</div>
            <p style={{ margin: '0 0 10px' }}>Reviu dilaksanakan sesuai SPR 2400 — terutama terdiri dari inquiry &amp; prosedur analitis. Lingkupnya jauh lebih sempit dibanding audit sehingga <b>tidak menyatakan opini audit</b>.</p>
            <div style={{ fontWeight: 700, color: '#0c2430', margin: '12px 0 4px' }}>Simpulan — {c.l}</div>
            <p style={{ margin: 0 }}>{c.txt}</p>
            {/* TIDAK ditandatangani. Sebelumnya blok ini mencetak nama seorang
                akuntan publik nyata sebagai tanda tangan atas simpulan yang
                dipilih dari pemilih di sebelah — atestasi yang dikarang.
                Laporan reviu diterbitkan dari kertas kerja perikatan, bukan
                dari halaman metodologi. */}
            <div style={{ marginTop: 22, paddingTop: 10, borderTop: '1px solid #e0e5ea', fontSize: 11 }}>
              <div style={{ fontWeight: 700 }}>Elemen yang dilengkapi saat penerbitan (¶86)</div>
              <div className="tiny" style={{ color: '#7a8893', marginTop: 4, lineHeight: 1.6 }}>
                Nama &amp; tanda tangan praktisi · nomor registrasi akuntan publik · alamat kantor · tanggal laporan.
                Templat ini <b>tidak ditandatangani</b> — penandatanganan dilakukan pada kertas kerja perikatan reviu.
              </div>
              <div className="tiny" style={{ color: '#7a8893', marginTop: 6 }}>Templat dilihat: Jakarta, {amsDateLongId()}</div>
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}



/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { SPR2400View };
