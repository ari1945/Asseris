/* [codemod] ESM imports */
import React from 'react';
import { useFirm } from './contexts';
import { I } from './icons';
import { SubBar } from './shell.jsx';
import { Badge, Btn, Panel, Tabs } from './ui.jsx';
import { KvBox } from './view_analytical';

/* ============================================================
   Asseris — Core Specifics: Internal Audit (610), Use of Expert (620),
   Service Org (402), Opening Balance (510)
   ============================================================ */
const { useState: useStateSP2, useMemo: useMemoSP2 } = React;

/* Internal Audit (SA 610) lives in view_internalaudit.jsx — deep workpaper */

/* ============================================================
   USE OF EXPERT — Pekerjaan Pakar Auditor (SA 620)
   Deep workpaper: penentuan kebutuhan, evaluasi kompetensi/
   kapabilitas/objektivitas (¶9), pemahaman bidang & kesepakatan
   (¶10–11), evaluasi kecukupan pekerjaan (¶12), kesimpulan &
   rujukan dalam laporan auditor (¶14–15).
   ============================================================ */

const EXPERTS_SEED = [
  {
    id: 'EX-01', name: 'Aktuaria Padma Radhika', firm: 'KKA Padma Radhika & Rekan',
    field: 'Aktuaria — Imbalan Pasca-Kerja', type: 'Pakar Manajemen',
    account: 'Liabilitas Imbalan Kerja', amount: 'Rp 13,08 M', assertion: 'Penilaian & Alokasi',
    frf: 'PSAK 24', risk: 'Signifikan', wp: 'H-2',
    factors: [
      { id: 'comp', k: 'Kompetensi', ref: '¶A14–A20', v: 4, note: 'Kualifikasi & pengalaman aktuaria memadai untuk PSAK 24.',
        subs: [
          { t: 'Aktuaris bersertifikat (FSAI) terdaftar di PAI & OJK', ok: true },
          { t: 'Pengalaman > 15 tahun valuasi imbalan kerja sektor sejenis', ok: true },
          { t: 'Reputasi profesional baik — tidak ada sanksi asosiasi', ok: true },
          { t: 'Pemahaman atas PSAK 24 sebagai kerangka pelaporan', ok: true },
        ] },
      { id: 'cap', k: 'Kapabilitas', ref: '¶A14–A20', v: 4, note: 'Sumber daya, perangkat & waktu memadai menyelesaikan penugasan.',
        subs: [
          { t: 'Tim aktuaria & perangkat lunak valuasi (ProVal) tersedia', ok: true },
          { t: 'Waktu cukup sebelum tenggat pelaporan (laporan 28 Feb)', ok: true },
          { t: 'Akses penuh ke data sensus karyawan dari entitas', ok: true },
          { t: 'Kapasitas merespons pertanyaan reviu auditor tepat waktu', ok: false, note: 'Respons atas tanya-jawab asumsi sempat tertunda 5 hari.' },
        ] },
      { id: 'obj', k: 'Objektivitas', ref: '¶A21–A22', v: 3, note: 'Pakar manajemen — ditunjuk & dibayar entitas; ancaman dievaluasi.',
        subs: [
          { t: 'Tidak ada hubungan keuangan/keluarga dengan manajemen selain fee', ok: true },
          { t: 'Tidak terlibat dalam pencatatan/penyusunan LK entitas', ok: true },
          { t: 'Ditunjuk & dibayar oleh manajemen (ancaman kepentingan-diri)', ok: false, note: 'Pakar manajemen — auditor menambah pengujian independen atas asumsi.' },
          { t: 'Pengaman: reviu asumsi independen oleh tim audit (¶A22)', ok: true },
        ] },
    ],
    understanding: {
      nature: 'Valuasi liabilitas imbalan pasca-kerja (pesangon, penghargaan masa kerja & uang pisah) dengan metode Projected Unit Credit.',
      standards: 'PSAK 24 (Imbalan Kerja) · pedoman aktuaria PAI · tabel mortalita TMI-IV',
      methods: 'Projected Unit Credit; pengakuan biaya jasa kini, bunga neto & pengukuran kembali (OCI).',
      data: 'Data sensus 1.240 karyawan: usia, masa kerja, gaji pokok, status — bersumber dari modul HRIS entitas.',
    },
    agreement: [
      { dim: 'Lingkup, tujuan & ruang lingkup pekerjaan', ref: '¶11(a)', ok: true },
      { dim: 'Peran & tanggung jawab masing-masing pihak', ref: '¶11(b)', ok: true },
      { dim: 'Sifat, saat & luas komunikasi (laporan & temuan)', ref: '¶11(c)', ok: true },
      { dim: 'Kerahasiaan informasi entitas (engagement letter)', ref: '¶11(d)', ok: true },
    ],
    workEval: {
      findings: { status: 'Memadai', note: 'Simpulan liabilitas Rp 13,08 M relevan & konsisten dengan bukti audit lain (mutasi karyawan, gaji).' },
      methods: { status: 'Memadai', note: 'Metode Projected Unit Credit sesuai PSAK 24; konsisten dengan tahun lalu.' },
      data: { status: 'Catatan', note: 'Data sensus diuji ke catatan HR; ditemukan 3 selisih tanggal lahir minor — direkonsiliasi, dampak tidak material.' },
      adequacy: 'Memadai dengan catatan',
      assumptions: [
        { key: 'Tingkat diskonto', expertVal: '6,90%', benchmark: '6,7%–7,1% (yield SUN ~ jangka)', assess: 'Wajar' },
        { key: 'Kenaikan gaji', expertVal: '7,00%', benchmark: '5,5%–6,5% (historis 3 thn)', assess: 'Ditantang' },
        { key: 'Tingkat mortalita', expertVal: 'TMI-IV', benchmark: 'TMI-IV (standar)', assess: 'Wajar' },
        { key: 'Usia pensiun normal', expertVal: '56 thn', benchmark: 'PKB entitas', assess: 'Wajar' },
        { key: 'Tingkat pengunduran diri', expertVal: 'Skala usia', benchmark: 'Data turnover entitas', assess: 'Wajar' },
      ],
    },
  },
  {
    id: 'EX-02', name: 'KJPP Surya Nilai', firm: 'KJPP Surya Nilai & Rekan',
    field: 'Penilaian Properti (Revaluasi)', type: 'Pakar Manajemen',
    account: 'Aset Tetap — Tanah & Bangunan', amount: 'Rp 84,50 M', assertion: 'Penilaian',
    frf: 'PSAK 16 · SPI', risk: 'Moderat', wp: 'E-6',
    factors: [
      { id: 'comp', k: 'Kompetensi', ref: '¶A14–A20', v: 4, note: 'KJPP berizin & penilai publik bersertifikat MAPPI.',
        subs: [
          { t: 'Penilai Publik berizin Kemenkeu & terdaftar OJK', ok: true },
          { t: 'Anggota MAPPI dengan klasifikasi izin properti', ok: true },
          { t: 'Pengalaman penilaian aset tetap industri sejenis', ok: true },
          { t: 'Mengikuti SPI (Standar Penilaian Indonesia) terkini', ok: true },
        ] },
      { id: 'cap', k: 'Kapabilitas', ref: '¶A14–A20', v: 4, note: 'Tim & metodologi memadai; inspeksi lapangan dilakukan.',
        subs: [
          { t: 'Tim penilai & surveyor melakukan inspeksi fisik objek', ok: true },
          { t: 'Akses data pembanding pasar (transaksi & penawaran)', ok: true },
          { t: 'Waktu penugasan sesuai jadwal pelaporan', ok: true },
          { t: 'Dokumentasi laporan penilaian lengkap & dapat ditelusuri', ok: true },
        ] },
      { id: 'obj', k: 'Objektivitas', ref: '¶A21–A22', v: 4, note: 'Profesi penilai dengan kode etik; ditunjuk manajemen.',
        subs: [
          { t: 'Tidak ada kepentingan kepemilikan atas objek dinilai', ok: true },
          { t: 'Tunduk pada KEPI (Kode Etik Penilai Indonesia)', ok: true },
          { t: 'Ditunjuk & dibayar manajemen (ancaman terbatas)', ok: false, note: 'Diimbangi standar profesi & reviu auditor atas pembanding.' },
          { t: 'Penugasan bukan kontingen pada hasil penilaian', ok: true },
        ] },
    ],
    understanding: {
      nature: 'Penilaian nilai wajar tanah & bangunan untuk model revaluasi PSAK 16 per tanggal pelaporan.',
      standards: 'PSAK 16 (Aset Tetap) · SPI (KEPI/SPI 2018) · IVS',
      methods: 'Pendekatan pasar (data pembanding) untuk tanah; pendekatan biaya terdepresiasi untuk bangunan.',
      data: 'Sertifikat hak atas tanah, IMB, denah, dan 12 data pembanding pasar dalam radius lokasi objek.',
    },
    agreement: [
      { dim: 'Lingkup, tujuan & ruang lingkup pekerjaan', ref: '¶11(a)', ok: true },
      { dim: 'Peran & tanggung jawab masing-masing pihak', ref: '¶11(b)', ok: true },
      { dim: 'Sifat, saat & luas komunikasi (laporan & temuan)', ref: '¶11(c)', ok: true },
      { dim: 'Kerahasiaan informasi entitas (engagement letter)', ref: '¶11(d)', ok: true },
    ],
    workEval: {
      findings: { status: 'Memadai', note: 'Nilai wajar Rp 84,50 M relevan; surplus revaluasi konsisten dengan mutasi aset tetap.' },
      methods: { status: 'Memadai', note: 'Pendekatan pasar & biaya sesuai SPI; bobot antar pendekatan wajar.' },
      data: { status: 'Memadai', note: 'Data pembanding diuji ke sumber; lokasi & luas objek dikonfirmasi ke dokumen legal.' },
      adequacy: 'Memadai',
      assumptions: [
        { key: 'Pendekatan tanah', expertVal: 'Pasar (sales comparison)', benchmark: 'Sesuai SPI', assess: 'Wajar' },
        { key: 'Penyesuaian pembanding', expertVal: '−8% s/d +12%', benchmark: 'Rentang lazim pasar', assess: 'Wajar' },
        { key: 'Biaya pengganti bangunan', expertVal: 'Rp/m² per kelas', benchmark: 'Indeks konstruksi', assess: 'Wajar' },
        { key: 'Penyusutan fisik', expertVal: 'Umur efektif', benchmark: 'Kondisi terinspeksi', assess: 'Wajar' },
      ],
    },
  },
  {
    id: 'EX-03', name: 'Dr. Ir. Hendra Wijaya', firm: 'Pakar Auditor (ditunjuk KAP)',
    field: 'Valuasi Instrumen Derivatif', type: 'Pakar Auditor',
    account: 'Kontrak Forward Valas (Level 2)', amount: 'Rp 6,40 M', assertion: 'Penilaian',
    frf: 'PSAK 71 · IFRS 13', risk: 'Signifikan', wp: 'V-3',
    factors: [
      { id: 'comp', k: 'Kompetensi', ref: '¶A14–A20', v: 5, note: 'Pakar auditor — kualifikasi valuasi instrumen keuangan tinggi.',
        subs: [
          { t: 'Doktor keuangan kuantitatif & holder sertifikasi valuasi (CFA)', ok: true },
          { t: 'Pengalaman valuasi derivatif & fair value Level 2/3', ok: true },
          { t: 'Pemahaman IFRS 13 / PSAK 68 hierarki nilai wajar', ok: true },
          { t: 'Riwayat penugasan untuk KAP tanpa temuan mutu', ok: true },
        ] },
      { id: 'cap', k: 'Kapabilitas', ref: '¶A14–A20', v: 5, note: 'Perangkat model & data pasar memadai.',
        subs: [
          { t: 'Akses terminal data pasar (kurva forward & OIS)', ok: true },
          { t: 'Model valuasi tervalidasi & terdokumentasi', ok: true },
          { t: 'Waktu penugasan memadai dalam jadwal audit', ok: true },
          { t: 'Mampu menghasilkan kertas kerja yang dapat direviu', ok: true },
        ] },
      { id: 'obj', k: 'Objektivitas', ref: '¶A21–A22', v: 5, note: 'Pakar auditor — independen dari entitas; dikonfirmasi.',
        subs: [
          { t: 'Tidak memiliki hubungan dengan entitas yang diaudit', ok: true },
          { t: 'Konfirmasi independensi & benturan kepentingan ditandatangani', ok: true },
          { t: 'Ditunjuk & dibayar oleh KAP, bukan manajemen', ok: true },
          { t: 'Tunduk pada kebijakan independensi & mutu KAP', ok: true },
        ] },
    ],
    understanding: {
      nature: 'Penentuan nilai wajar kontrak forward valas USD untuk lindung nilai utang impor (mark-to-model).',
      standards: 'PSAK 71 (Instrumen Keuangan) · IFRS 13 / PSAK 68 (Pengukuran Nilai Wajar)',
      methods: 'Diskonto arus kas forward; kurva forward valas & faktor diskonto OIS pada tanggal pengukuran.',
      data: 'Term sheet kontrak (nosional, kurs forward, tenor), kurva pasar tanggal pelaporan dari penyedia data.',
    },
    agreement: [
      { dim: 'Lingkup, tujuan & ruang lingkup pekerjaan', ref: '¶11(a)', ok: true },
      { dim: 'Peran & tanggung jawab masing-masing pihak', ref: '¶11(b)', ok: true },
      { dim: 'Sifat, saat & luas komunikasi (laporan & temuan)', ref: '¶11(c)', ok: true },
      { dim: 'Kerahasiaan informasi entitas (engagement letter)', ref: '¶11(d)', ok: false },
    ],
    workEval: {
      findings: { status: 'Proses', note: 'Valuasi awal Rp 6,40 M; rekonsiliasi terhadap nilai entitas masih ditelaah.' },
      methods: { status: 'Proses', note: 'Model diskonto arus kas sedang ditelaah atas pemilihan kurva diskonto.' },
      data: { status: 'Proses', note: 'Kurva pasar & term sheet sedang divalidasi ke sumber independen.' },
      adequacy: 'Dalam Proses',
      assumptions: [
        { key: 'Kurva forward valas', expertVal: 'USD/IDR forward', benchmark: 'Penyedia data pasar', assess: 'Proses' },
        { key: 'Faktor diskonto', expertVal: 'Kurva OIS', benchmark: 'Praktik pasar', assess: 'Proses' },
        { key: 'Risiko kredit (CVA/DVA)', expertVal: 'Disesuaikan', benchmark: 'IFRS 13 ¶42', assess: 'Proses' },
      ],
    },
  },
];

/* adequacy → badge kind */
function adqKind(a) {
  return a === 'Memadai' ? 'green' : a === 'Memadai dengan catatan' ? 'amber'
    : a === 'Dalam Proses' ? 'blue' : 'red';
}
/* background token (blue has no -bg var → use blue-050) */
function adqBg(a) {
  const k = adqKind(a);
  return k === 'blue' ? 'var(--blue-050)' : `var(--${k}-bg)`;
}
function statusKind(s) {
  return s === 'Memadai' ? 'green' : s === 'Catatan' ? 'amber' : s === 'Proses' ? 'blue' : 'red';
}
function vColor(v) { return v >= 4 ? 'var(--green)' : v >= 3 ? 'var(--amber)' : 'var(--red)'; }

function verdictForAvg(avg) {
  return avg >= 4
    ? { k: 'green', label: 'Dapat Diandalkan', t: 'Kompetensi, kapabilitas & objektivitas pakar memadai (¶9). Pekerjaan pakar dapat digunakan sebagai bukti audit setelah evaluasi kecukupan (¶12).' }
    : avg >= 3
    ? { k: 'amber', label: 'Andalan dengan Pengaman', t: 'Memadai dengan catatan — terdapat ancaman objektivitas/kapabilitas. Terapkan pengaman & pengujian independen tambahan atas asumsi & data.' }
    : { k: 'red', label: 'Tidak Memadai', t: 'Faktor ¶9 tidak terpenuhi — jangan andalkan pekerjaan pakar; cari pakar lain atau laksanakan prosedur alternatif.' };
}

/* ============================================================ */
function UseOfExpert() {
  const firm = useFirm();
  const client = firm?.activeClient?.name || 'PT Sentosa Makmur Tbk';
  const [experts, setExperts] = useStateSP2(EXPERTS_SEED);
  const [selId, setSelId] = useStateSP2('EX-01');
  const [tab, setTab] = useStateSP2('konteks');
  const sel = experts.find(e => e.id === selId);

  const setV = (expId, fId, v) => setExperts(es => es.map(e => e.id === expId
    ? { ...e, factors: e.factors.map(f => f.id === fId ? { ...f, v } : f) } : e));

  const avgOf = e => e.factors.reduce((s, f) => s + f.v, 0) / e.factors.length;
  const selAvg = sel ? avgOf(sel) : 0;
  const selVerdict = verdictForAvg(selAvg);

  const tabs = [
    { id: 'konteks', label: 'Konteks & Kebutuhan' },
    { id: 'evaluasi', label: 'Evaluasi Pakar' },
    { id: 'lingkup', label: 'Lingkup & Kesepakatan' },
    { id: 'hasil', label: 'Evaluasi Hasil' },
    { id: 'kesimpulan', label: 'Kesimpulan & Pelaporan' },
  ];

  const expTab = tab !== 'konteks' && tab !== 'kesimpulan';

  return (
    <>
      <SubBar moduleId="expert" right={
        <div className="row gap8 ac">
          <Badge kind="blue">SA 620</Badge>
          <Btn sm><I.download size={13} /> Memo Penggunaan Pakar</Btn>
          <Btn sm variant="primary"><I.plus size={14} /> Tambah Pakar</Btn>
        </div>
      } />
      <div className="view-scroll"><div className="view-pad">

        {/* summary header */}
        <Panel noBody style={{ marginBottom: 12 }}>
          <div style={{ padding: '13px 16px', display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ minWidth: 188 }}>
              <div className="tiny muted upper" style={{ marginBottom: 3 }}>Penggunaan Pekerjaan Pakar</div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>SA 620 · Auditor's Expert</div>
              <div className="tiny muted">{client}</div>
            </div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Pakar Terdaftar</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5 }}>{experts.length} pakar</div></div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Tipe</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5 }}>{experts.filter(e => e.type === 'Pakar Auditor').length} auditor · {experts.filter(e => e.type === 'Pakar Manajemen').length} manajemen</div></div>
            <div className="vdivider" style={{ height: 38 }} />
            <div><div className="tiny muted upper">Risiko Signifikan</div><div className="mono" style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--red)' }}>{experts.filter(e => e.risk === 'Signifikan').length} area</div></div>
            <div style={{ flex: 1 }} />
            <div style={{ textAlign: 'right' }}>
              <div className="tiny muted upper" style={{ marginBottom: 3 }}>Status Evaluasi Pekerjaan</div>
              <div className="row gap6 ac" style={{ justifyContent: 'flex-end' }}>
                <Badge kind="green">{experts.filter(e => e.workEval.adequacy.startsWith('Memadai')).length} memadai</Badge>
                <Badge kind="blue">{experts.filter(e => e.workEval.adequacy === 'Dalam Proses').length} proses</Badge>
              </div>
            </div>
          </div>
        </Panel>

        {/* expert selector strip (visible on expert-scoped tabs) */}
        {expTab && (
          <div className="grid" style={{ gridTemplateColumns: `repeat(${experts.length}, 1fr)`, gap: 10, marginBottom: 12 }}>
            {experts.map(e => {
              const a = avgOf(e); const on = e.id === selId;
              return (
                <div key={e.id} onClick={() => setSelId(e.id)} className="panel" style={{
                  padding: '10px 12px', cursor: 'pointer', boxShadow: 'none',
                  border: '1px solid ' + (on ? 'var(--blue)' : 'var(--line)'),
                  background: on ? 'var(--blue-050)' : 'var(--surface)' }}>
                  <div className="row ac jb">
                    <span className="row ac gap6"><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{e.id}</span>
                      <Badge kind={e.type === 'Pakar Auditor' ? 'purple' : 'blue'}>{e.type.replace('Pakar ', '')}</Badge></span>
                    <span className="mono tiny" style={{ fontWeight: 700, color: vColor(a) }}>{a.toFixed(1)}/5</span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 12.5, marginTop: 5 }} className="truncate">{e.name}</div>
                  <div className="tiny muted truncate">{e.field}</div>
                  <div className="row ac jb" style={{ marginTop: 7 }}>
                    <span className="mono tiny muted">{e.account} · {e.amount}</span>
                    <Badge kind={adqKind(e.workEval.adequacy)}>{e.workEval.adequacy === 'Memadai dengan catatan' ? 'Catatan' : e.workEval.adequacy}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ marginBottom: 12 }}><Tabs tabs={tabs} active={tab} onChange={setTab} /></div>

        {tab === 'konteks' && <ExpContext experts={experts} avgOf={avgOf} />}
        {tab === 'evaluasi' && sel && <ExpEvaluation exp={sel} setV={setV} avg={selAvg} verdict={selVerdict} />}
        {tab === 'lingkup' && sel && <ExpAgreement exp={sel} />}
        {tab === 'hasil' && sel && <ExpWorkEval exp={sel} />}
        {tab === 'kesimpulan' && <ExpConclusion experts={experts} avgOf={avgOf} />}

      </div></div>
    </>
  );
}

/* ---------------- Tab: Konteks & Kebutuhan ---------------- */
function ExpContext({ experts, avgOf }) {
  const decision = [
    { q: 'Apakah area memerlukan keahlian di luar bidang akuntansi & audit?', a: 'Ya — aktuaria, penilaian properti & valuasi derivatif memerlukan pakar.', ok: true },
    { q: 'Tersedia pakar dengan kompetensi, kapabilitas & objektivitas? (¶9)', a: 'Ya — dievaluasi per pakar (lihat tab Evaluasi Pakar).', ok: true },
    { q: 'Apakah area melibatkan risiko salah saji material signifikan?', a: 'Sebagian — imbalan kerja & derivatif berisiko signifikan; perdalam evaluasi.', ok: false },
    { q: 'Apakah lingkup & kesepakatan pakar didokumentasikan? (¶11)', a: 'Ya untuk pakar manajemen; engagement letter pakar auditor menunggu finalisasi.', ok: false },
  ];
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 360px', gap: 12, alignItems: 'start' }}>
      <div className="grid" style={{ gap: 12 }}>
        <Panel noBody>
          <div className="panel-h"><h3>Tujuan & Penentuan Kebutuhan Pakar (SA 620)</h3><div style={{ flex: 1 }} /></div>
          <div style={{ padding: 14 }}>
            <p style={{ margin: '0 0 12px', fontSize: 12.5, lineHeight: 1.55, color: 'var(--ink-2)' }}>
              Bila keahlian di bidang selain akuntansi atau audit diperlukan untuk memperoleh bukti audit yang cukup &
              tepat, auditor menentukan apakah akan menggunakan <b>pekerjaan pakar auditor</b>. Auditor wajib mengevaluasi
              <b> kompetensi, kapabilitas, dan objektivitas</b> pakar (¶9), memperoleh <b>pemahaman atas bidang keahlian</b>
              pakar (¶10), <b>menyepakati</b> lingkup pekerjaan (¶11), serta <b>mengevaluasi kecukupan</b> pekerjaan pakar
              untuk tujuan audit (¶12). Tanggung jawab atas opini audit <b>tidak berkurang</b> oleh penggunaan pakar.
            </p>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              {[
                { ic: 'expert', t: 'Evaluasi Pakar (¶9)', d: 'Kompetensi, kapabilitas & objektivitas pakar.' },
                { ic: 'book', t: 'Pemahaman & Kesepakatan (¶10–11)', d: 'Bidang keahlian, lingkup, peran & kerahasiaan.' },
                { ic: 'flask', t: 'Evaluasi Hasil (¶12)', d: 'Temuan, asumsi & metode, serta relevansi data sumber.' },
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

        <Panel noBody>
          <div className="panel-h"><h3>Pohon Keputusan Penggunaan Pakar</h3><div style={{ flex: 1 }} /><Badge kind="amber">Perlu tindak lanjut</Badge></div>
          <div style={{ padding: '6px 14px 14px' }}>
            {decision.map((d, i) => (
              <div key={i} className="row gap10" style={{ padding: '11px 0', alignItems: 'flex-start', borderBottom: i < decision.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
                <span style={{ flex: '0 0 auto', marginTop: 1, color: d.ok ? 'var(--green)' : 'var(--amber)' }}>
                  {d.ok ? <I.checkCircle size={17} /> : <I.alert size={17} />}
                </span>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 2 }}>{d.q}</div>
                  <div className="tiny muted" style={{ lineHeight: 1.4 }}>{d.a}</div>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel noBody>
          <div className="panel-h"><h3>Pakar Manajemen vs Pakar Auditor</h3><div style={{ flex: 1 }} /><span className="tiny muted">SA 500 ¶8 vs SA 620</span></div>
          <table className="dtbl">
            <thead><tr><th>Aspek</th><th>Pakar Manajemen (SA 500)</th><th>Pakar Auditor (SA 620)</th></tr></thead>
            <tbody>
              {[
                { a: 'Yang menunjuk & membayar', m: 'Manajemen entitas', d: 'Auditor / KAP' },
                { a: 'Tujuan pekerjaan', m: 'Membantu menyusun laporan keuangan', d: 'Membantu memperoleh bukti audit' },
                { a: 'Fokus evaluasi auditor', m: 'Kompetensi, kapabilitas, objektivitas + evaluasi bukti', d: 'Evaluasi penuh ¶9–¶12' },
                { a: 'Risiko objektivitas', m: 'Lebih tinggi — tidak independen dari entitas', d: 'Lebih rendah — independen, dikonfirmasi' },
              ].map((r, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{r.a}</td>
                  <td className="tiny" style={{ whiteSpace: 'normal', lineHeight: 1.4 }}>{r.m}</td>
                  <td className="tiny" style={{ whiteSpace: 'normal', lineHeight: 1.4 }}>{r.d}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>

      <div className="grid" style={{ gap: 12 }}>
        <Panel title="Pemicu Kebutuhan Pakar" sub="area pertimbangan khusus">
          <div style={{ display: 'grid', gap: 7 }}>
            {[
              'Valuasi aktuaria liabilitas imbalan kerja (PSAK 24)',
              'Penilaian nilai wajar aset tetap / properti (revaluasi)',
              'Valuasi instrumen keuangan kompleks (derivatif, Level 2/3)',
              'Estimasi cadangan, penurunan nilai & nilai terpulihkan',
              'Interpretasi kontrak, hukum, atau ketentuan regulasi teknis',
            ].map((t, i) => (
              <div key={i} className="row gap8" style={{ fontSize: 12, alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--blue)', flex: '0 0 auto', marginTop: 1 }}><I.arrowRight size={14} /></span>{t}
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Registrasi Pakar" sub={experts.length + ' pakar'}>
          <div style={{ display: 'grid', gap: 8 }}>
            {experts.map(e => (
              <div key={e.id} className="panel" style={{ padding: '9px 11px', boxShadow: 'none' }}>
                <div className="row ac jb">
                  <span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{e.id}</span>
                  <Badge kind={e.type === 'Pakar Auditor' ? 'purple' : 'blue'}>{e.type.replace('Pakar ', '')}</Badge>
                </div>
                <div style={{ fontWeight: 600, fontSize: 12, marginTop: 4 }}>{e.name}</div>
                <div className="tiny muted">{e.field}</div>
                <div className="row ac jb" style={{ marginTop: 6 }}>
                  <span className="mono tiny" style={{ fontWeight: 700, color: vColor(avgOf(e)) }}>{avgOf(e).toFixed(1)}/5</span>
                  <span className="mono tiny muted">WP {e.wp}</span>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ---------------- Tab: Evaluasi Pakar (¶9) ---------------- */
function ExpEvaluation({ exp, setV, avg, verdict }) {
  const [selF, setSelF] = useStateSP2('comp');
  const f = exp.factors.find(x => x.id === selF) || exp.factors[0];
  return (
    <div className="grid" style={{ gridTemplateColumns: '360px 1fr', gap: 12, alignItems: 'start' }}>
      <Panel title="Faktor Evaluasi Pakar" sub="SA 620 ¶9 · skala 1–5">
        {exp.factors.map(fc => (
          <div key={fc.id} onClick={() => setSelF(fc.id)}
            style={{ marginBottom: 12, padding: '10px 11px', borderRadius: 8, cursor: 'pointer',
              border: '1px solid ' + (fc.id === selF ? 'var(--blue)' : 'var(--line-soft)'),
              background: fc.id === selF ? 'var(--blue-050)' : 'transparent' }}>
            <div className="row jb ac" style={{ marginBottom: 6 }}>
              <span className="row ac gap6" style={{ fontSize: 12.5, fontWeight: 700 }}>{fc.k}<span className="mono tiny muted">{fc.ref}</span></span>
              <span className="mono" style={{ fontWeight: 700, color: vColor(fc.v) }}>{fc.v}/5</span>
            </div>
            <input type="range" min="1" max="5" value={fc.v} onClick={e => e.stopPropagation()} onChange={e => setV(exp.id, fc.id, +e.target.value)} style={{ width: '100%', accentColor: 'var(--blue)' }} />
            <div className="tiny muted" style={{ marginTop: 3, lineHeight: 1.35 }}>{fc.note}</div>
          </div>
        ))}
        <div className="divider" />
        <div className="panel" style={{ padding: '11px 12px', background: `var(--${verdict.k}-bg)`, borderColor: 'transparent' }}>
          <div className="row ac gap10">
            <span className="mono" style={{ fontSize: 22, fontWeight: 800, color: `var(--${verdict.k})` }}>{avg.toFixed(1)}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 12.5, color: `var(--${verdict.k})` }}>{verdict.label}</div>
              <div className="tiny" style={{ lineHeight: 1.4, marginTop: 2 }}>{verdict.t}</div>
            </div>
          </div>
        </div>
      </Panel>

      <Panel noBody>
        <div style={{ background: 'var(--surface-2)', padding: '11px 14px', borderBottom: '1px solid var(--line)' }}>
          <div className="row ac gap8"><span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{f.ref}</span><Badge kind={f.v >= 4 ? 'green' : f.v >= 3 ? 'amber' : 'red'}>{f.v}/5</Badge>
            <div style={{ flex: 1 }} /><span className="tiny muted">{exp.name} · {f.k}</span></div>
          <div style={{ fontWeight: 700, fontSize: 13.5, marginTop: 3 }}>{f.k}</div>
          <div className="tiny muted">{f.note}</div>
        </div>
        <table className="dtbl">
          <thead><tr><th>Sub-kriteria Penilaian</th><th style={{ width: 130 }}>Status</th></tr></thead>
          <tbody>
            {f.subs.map((s, i) => (
              <tr key={i}>
                <td style={{ whiteSpace: 'normal', lineHeight: 1.4 }}>
                  {s.t}
                  {s.note && <div className="tiny" style={{ color: 'var(--amber)', marginTop: 3 }}>{s.note}</div>}
                </td>
                <td>{s.ok
                  ? <span className="row ac gap6 tiny" style={{ color: 'var(--green)', fontWeight: 600 }}><I.check size={13} /> Terpenuhi</span>
                  : <span className="row ac gap6 tiny" style={{ color: 'var(--amber)', fontWeight: 600 }}><I.flag size={13} /> Perhatian</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="panel" style={{ margin: 12, padding: '10px 12px', background: 'var(--blue-050)', borderColor: 'var(--blue-100)' }}>
          <div className="row gap8" style={{ alignItems: 'flex-start' }}>
            <span style={{ color: 'var(--blue)', flex: '0 0 auto' }}><I.book size={15} /></span>
            <span style={{ fontSize: 11.5, lineHeight: 1.45 }}>
              {f.id === 'obj' && exp.type === 'Pakar Manajemen'
                ? <>Untuk <b>pakar manajemen</b>, objektivitas merupakan area perhatian utama (¶A21–A22): pakar ditunjuk & dibayar entitas. Auditor menerapkan pengaman berupa <b>pengujian independen atas asumsi & data sumber</b>.</>
                : <>Faktor <b>{f.k}</b> dievaluasi atas {f.subs.length} sub-kriteria. Catatan perhatian tidak otomatis meniadakan penggunaan, namun menambah prosedur evaluasi atas pekerjaan pakar (¶12).</>}
            </span>
          </div>
        </div>
      </Panel>
    </div>
  );
}

/* ---------------- Tab: Lingkup & Kesepakatan (¶10–11) ---------------- */
function ExpAgreement({ exp }) {
  const u = exp.understanding;
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 360px', gap: 12, alignItems: 'start' }}>
      <div className="grid" style={{ gap: 12 }}>
        <Panel noBody>
          <div className="panel-h"><h3>Pemahaman atas Bidang Keahlian Pakar</h3><div style={{ flex: 1 }} /><span className="tiny muted">SA 620 ¶10</span></div>
          <div style={{ padding: 14, display: 'grid', gap: 12 }}>
            <div>
              <div className="tiny muted upper" style={{ marginBottom: 4 }}>Sifat Pekerjaan Pakar</div>
              <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5 }}>{u.nature}</p>
            </div>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <KvBox label="Standar Profesional/Industri" v={u.standards} />
              <KvBox label="Metode yang Digunakan" v={u.methods} />
            </div>
            <div>
              <div className="tiny muted upper" style={{ marginBottom: 4 }}>Data Sumber yang Digunakan Pakar</div>
              <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: 'var(--ink-2)' }}>{u.data}</p>
            </div>
          </div>
        </Panel>

        <Panel noBody>
          <div className="panel-h"><h3>Kesepakatan dengan Pakar</h3><div style={{ flex: 1 }} /><Badge kind={exp.agreement.every(a => a.ok) ? 'green' : 'amber'}>{exp.agreement.filter(a => a.ok).length}/{exp.agreement.length} disepakati</Badge></div>
          <div style={{ padding: '6px 14px 14px' }}>
            <p className="tiny muted" style={{ margin: '4px 0 10px', lineHeight: 1.45 }}>
              Hal-hal yang disepakati secara tertulis dengan pakar bila perlu (SA 620 ¶11):
            </p>
            {exp.agreement.map((a, i) => (
              <div key={i} className="row gap10" style={{ padding: '10px 0', alignItems: 'flex-start', borderBottom: i < exp.agreement.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
                <span style={{ flex: '0 0 auto', marginTop: 1, color: a.ok ? 'var(--green)' : 'var(--amber)' }}>
                  {a.ok ? <I.checkCircle size={17} /> : <I.clock size={17} />}
                </span>
                <div style={{ flex: 1 }}>
                  <div className="row ac gap6"><span style={{ fontSize: 12.5, fontWeight: 600 }}>{a.dim}</span><span className="mono tiny muted">{a.ref}</span></div>
                  <div className="tiny" style={{ color: a.ok ? 'var(--green)' : 'var(--amber)', marginTop: 2, fontWeight: 600 }}>{a.ok ? 'Disepakati & terdokumentasi' : 'Menunggu finalisasi engagement letter'}</div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid" style={{ gap: 12 }}>
        <Panel title="Profil Pakar">
          <div style={{ display: 'grid', gap: 8 }}>
            <KvBox label="Pakar / Lembaga" v={exp.firm} />
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <KvBox label="Tipe" v={exp.type.replace('Pakar ', '')} accent={exp.type === 'Pakar Auditor' ? 'var(--purple)' : 'var(--blue)'} />
              <KvBox label="Kerangka" v={exp.frf} />
            </div>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <KvBox label="Akun Terdampak" v={exp.account} />
              <KvBox label="Nilai" v={exp.amount} />
            </div>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <KvBox label="Asersi" v={exp.assertion} />
              <KvBox label="Risiko" v={exp.risk} accent={exp.risk === 'Signifikan' ? 'var(--red)' : 'var(--amber)'} />
            </div>
          </div>
        </Panel>
        <Panel title="Komunikasi & Reviu">
          <div style={{ display: 'grid', gap: 7 }}>
            {[
              'Peroleh laporan/output pakar & dasar simpulan secara tertulis.',
              'Sepakati protokol pertanyaan & klarifikasi asumsi selama reviu.',
              'Selaraskan saat penyampaian temuan dengan jadwal pelaporan audit.',
            ].map((t, i) => (
              <div key={i} className="row gap8" style={{ fontSize: 12, alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--blue)', flex: '0 0 auto', marginTop: 1 }}><I.arrowRight size={14} /></span>{t}
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ---------------- Tab: Evaluasi Hasil (¶12) ---------------- */
function ExpWorkEval({ exp }) {
  const w = exp.workEval;
  const dims = [
    { id: 'findings', t: 'Relevansi & kewajaran temuan/simpulan', ref: '¶12(a)', d: w.findings },
    { id: 'methods', t: 'Asumsi & metode yang digunakan', ref: '¶12(b)', d: w.methods },
    { id: 'data', t: 'Relevansi, kelengkapan & akurasi data sumber', ref: '¶12(c)', d: w.data },
  ];
  const assessKind = a => a === 'Wajar' ? 'green' : a === 'Ditantang' ? 'amber' : a === 'Proses' ? 'blue' : 'red';
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 340px', gap: 12, alignItems: 'start' }}>
      <div className="grid" style={{ gap: 12 }}>
        <Panel noBody>
          <div className="panel-h"><h3>Evaluasi Kecukupan Pekerjaan Pakar</h3><div style={{ flex: 1 }} /><span className="tiny muted">SA 620 ¶12 · {exp.name}</span></div>
          <div style={{ padding: '4px 14px 14px' }}>
            {dims.map((dm, i) => (
              <div key={dm.id} className="row gap12" style={{ padding: '12px 0', alignItems: 'flex-start', borderBottom: i < dims.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
                <span style={{ flex: '0 0 auto', marginTop: 1, color: `var(--${statusKind(dm.d.status)})` }}>
                  {dm.d.status === 'Memadai' ? <I.checkCircle size={18} /> : dm.d.status === 'Proses' ? <I.clock size={18} /> : <I.alert size={18} />}
                </span>
                <div style={{ flex: 1 }}>
                  <div className="row ac gap6" style={{ marginBottom: 2 }}><span style={{ fontSize: 12.5, fontWeight: 700 }}>{dm.t}</span><span className="mono tiny muted">{dm.ref}</span>
                    <div style={{ flex: 1 }} /><Badge kind={statusKind(dm.d.status)}>{dm.d.status}</Badge></div>
                  <div className="tiny muted" style={{ lineHeight: 1.45 }}>{dm.d.note}</div>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel noBody>
          <div className="panel-h"><h3>Pengujian Asumsi & Metode Utama</h3><div style={{ flex: 1 }} /><span className="tiny muted">{w.assumptions.length} asumsi</span></div>
          <table className="dtbl">
            <thead><tr><th>Asumsi / Metode</th><th>Nilai Pakar</th><th>Tolok Ukur Auditor</th><th style={{ width: 110 }}>Penilaian</th></tr></thead>
            <tbody>
              {w.assumptions.map((a, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{a.key}</td>
                  <td className="mono tiny">{a.expertVal}</td>
                  <td className="tiny muted" style={{ whiteSpace: 'normal', lineHeight: 1.35 }}>{a.benchmark}</td>
                  <td><Badge kind={assessKind(a.assess)}>{a.assess}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
          {w.assumptions.some(a => a.assess === 'Ditantang') && (
            <div className="panel" style={{ margin: 12, padding: '10px 12px', background: 'var(--amber-bg)', borderColor: 'transparent' }}>
              <div className="row gap8" style={{ alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--amber)', flex: '0 0 auto' }}><I.flag size={15} /></span>
                <span style={{ fontSize: 11.5, lineHeight: 1.45 }}>
                  Asumsi <b>kenaikan gaji 7,0%</b> berada di atas rentang historis. Auditor menantang dasar asumsi & meminta
                  analisis sensitivitas; dampak ke liabilitas dievaluasi terhadap <b>materialitas pelaksanaan</b>.
                </span>
              </div>
            </div>
          )}
        </Panel>
      </div>

      <div className="grid" style={{ gap: 12 }}>
        <Panel title="Kesimpulan Kecukupan">
          <div className="panel" style={{ padding: '12px 13px', background: adqBg(w.adequacy), borderColor: 'transparent', marginBottom: 10 }}>
            <div className="tiny upper" style={{ color: `var(--${adqKind(w.adequacy)})`, fontWeight: 700, letterSpacing: '.04em' }}>Hasil Evaluasi (¶12)</div>
            <div style={{ fontWeight: 800, fontSize: 15, color: `var(--${adqKind(w.adequacy)})`, marginTop: 3 }}>{w.adequacy}</div>
          </div>
          <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.5, color: 'var(--ink-2)' }}>
            Bila pekerjaan pakar <b>tidak memadai</b> (¶13), auditor menyepakati prosedur lanjutan dengan pakar atau
            melaksanakan prosedur tambahan yang sesuai dengan keadaan.
          </p>
        </Panel>
        <Panel title="Tindak Lanjut">
          <div style={{ display: 'grid', gap: 7 }}>
            {(w.adequacy === 'Dalam Proses'
              ? ['Finalisasi engagement letter pakar auditor', 'Validasi kurva pasar ke sumber independen', 'Rekonsiliasi valuasi pakar vs entitas']
              : w.adequacy === 'Memadai dengan catatan'
              ? ['Peroleh analisis sensitivitas asumsi gaji', 'Dokumentasikan rekonsiliasi data sensus', 'Reviu partner atas asumsi signifikan']
              : ['Arsipkan laporan pakar & dasar simpulan', 'Tautkan ke kertas kerja akun terkait', 'Tutup poin reviu']
            ).map((t, i) => (
              <label key={i} className="row ac gap6" style={{ fontSize: 11.5 }}>
                <span style={{ width: 14, height: 14, borderRadius: 3, border: '1.5px solid var(--line-strong)', display: 'grid', placeItems: 'center', flex: '0 0 auto' }} />
                {t}
              </label>
            ))}
          </div>
          <div className="row gap8" style={{ marginTop: 12 }}><Btn sm variant="primary" style={{ flex: 1 }}><I.flask size={14} /> Buka WP {exp.wp}</Btn></div>
        </Panel>
      </div>
    </div>
  );
}

/* ---------------- Tab: Kesimpulan & Pelaporan (¶14–15) ---------------- */
function ExpConclusion({ experts, avgOf }) {
  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 340px', gap: 12, alignItems: 'start' }}>
      <div className="grid" style={{ gap: 12 }}>
        <Panel noBody>
          <div className="panel-h"><h3>Ringkasan Penggunaan Pakar & Dampak terhadap Bukti</h3><div style={{ flex: 1 }} /></div>
          <table className="dtbl">
            <thead><tr><th>Pakar</th><th>Akun</th><th className="num">Skor ¶9</th><th>Kecukupan ¶12</th><th style={{ width: 120 }}>Rujukan Laporan</th></tr></thead>
            <tbody>
              {experts.map(e => (
                <tr key={e.id}>
                  <td><div style={{ fontWeight: 600 }} className="truncate">{e.name}</div><div className="tiny muted">{e.field}</div></td>
                  <td className="tiny">{e.account}<div className="tiny muted mono">{e.amount}</div></td>
                  <td className="num mono" style={{ fontWeight: 700, color: vColor(avgOf(e)) }}>{avgOf(e).toFixed(1)}</td>
                  <td><Badge kind={adqKind(e.workEval.adequacy)}>{e.workEval.adequacy === 'Memadai dengan catatan' ? 'Catatan' : e.workEval.adequacy}</Badge></td>
                  <td><Badge kind="gray">Tidak dirujuk</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="panel" style={{ margin: 12, padding: '10px 12px', background: 'var(--blue-050)', borderColor: 'var(--blue-100)' }}>
            <div className="row gap8" style={{ alignItems: 'flex-start' }}>
              <span style={{ color: 'var(--blue)', flex: '0 0 auto' }}><I.book size={15} /></span>
              <span style={{ fontSize: 11.5, lineHeight: 1.45 }}>
                <b>Rujukan dalam laporan auditor (¶14–15):</b> auditor <b>tidak merujuk</b> pekerjaan pakar auditor dalam
                opini tanpa modifikasi. Rujukan hanya dibuat bila diwajibkan hukum/regulasi, atau relevan untuk memahami
                modifikasi opini — dan rujukan tersebut <b>tidak mengurangi tanggung jawab</b> auditor atas opini.
              </span>
            </div>
          </div>
        </Panel>

        <Panel title="Kesimpulan Auditor (SA 620)">
          <p style={{ margin: '0 0 10px', fontSize: 12.5, lineHeight: 1.6 }}>
            Auditor menggunakan pekerjaan <b>{experts.length} pakar</b> atas area yang memerlukan keahlian khusus.
            Kompetensi & kapabilitas seluruh pakar dinilai <b>memadai</b>; objektivitas <b>pakar manajemen</b> diimbangi
            dengan pengujian independen atas asumsi & data sumber. Pekerjaan pakar atas imbalan kerja & properti dinilai
            <b> memadai</b> (dengan catatan asumsi gaji yang ditantang), sementara valuasi derivatif <b>masih dalam proses</b>
            evaluasi. <b>Tanggung jawab auditor atas opini tidak berkurang</b> oleh penggunaan pekerjaan pakar.
          </p>
          <div className="panel" style={{ padding: '10px 12px', background: 'var(--amber-bg)', borderColor: 'transparent' }}>
            <div className="row ac gap8"><span style={{ color: 'var(--amber)' }}><I.clock size={16} /></span><span style={{ fontSize: 12, fontWeight: 600 }}>1 evaluasi pakar masih berjalan (EX-03) — selesaikan sebelum penandatanganan opini.</span></div>
          </div>
        </Panel>
      </div>

      <div className="grid" style={{ gap: 12 }}>
        <Panel title="Dokumentasi">
          <div style={{ display: 'grid', gap: 6 }}>
            {[
              { t: 'Evaluasi kompetensi/kapabilitas/objektivitas', wp: 'A-620.1' },
              { t: 'Pemahaman bidang & kesepakatan pakar', wp: 'A-620.2' },
              { t: 'Evaluasi kecukupan pekerjaan pakar', wp: 'A-620.3' },
              { t: 'Pengujian asumsi & data sumber', wp: 'A-620.4' },
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
              { role: 'Direview', who: 'Anindya Pramesti', when: '08 Mar', done: true },
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

/* Service Org (SA 402) lives in view_serviceorg.jsx — deep workpaper */
/* Opening Balance (SA 510) lives in view_opening.jsx — deep workpaper */

Object.assign(window, { UseOfExpert });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { UseOfExpert };
