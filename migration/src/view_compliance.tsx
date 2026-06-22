/* [codemod] ESM imports */
import React from 'react';
import { I, MODULE_INDEX } from './icons';
import { SubBar } from './shell';
import { Badge, Btn, Donut, Panel } from './ui';
import { RowKv } from './view_calc';

/* ============================================================
   Asseris — Shared Compliance Checklist (SA & PSAK)
   ============================================================ */
const { useState: useStateCO, useMemo: useMemoCO } = React;

const COMPLIANCE_CONFIG = {
  sa250: { obj: 'Mempertimbangkan peraturan perundang-undangan dalam audit atas laporan keuangan serta merespons ketidakpatuhan yang teridentifikasi.', sections: [
    { name: 'Pemahaman & Kepatuhan', items: [
      ['Peroleh pemahaman umum kerangka hukum & regulasi yang berlaku bagi entitas dan industrinya', '¶13'],
      ['Inspeksi korespondensi dengan otoritas perizinan/regulator terkait', '¶14'],
      ['Inquiry manajemen mengenai kepatuhan terhadap peraturan perundang-undangan', '¶12'],
      ['Peroleh representasi tertulis atas ketidakpatuhan yang diketahui manajemen', '¶16'],
    ]},
    { name: 'Respons atas Ketidakpatuhan', items: [
      ['Evaluasi dampak ketidakpatuhan teridentifikasi terhadap laporan keuangan', '¶21'],
      ['Komunikasikan ketidakpatuhan kepada pihak yang bertanggung jawab atas tata kelola', '¶23'],
    ]},
  ]},
  sa260: { obj: 'Mengomunikasikan hal-hal yang relevan dengan audit kepada pihak yang bertanggung jawab atas tata kelola (TCWG).', sections: [
    { name: 'Hal yang Dikomunikasikan', items: [
      ['Tanggung jawab auditor terkait audit atas laporan keuangan', '¶14'],
      ['Lingkup dan saat audit yang direncanakan (overview)', '¶15'],
      ['Temuan signifikan dari audit (kebijakan akuntansi, estimasi, kesulitan)', '¶16'],
      ['Pernyataan independensi auditor (untuk entitas terdaftar)', '¶17'],
      ['Defisiensi signifikan pengendalian internal (SA 265)', '¶16'],
    ]},
  ]},
  sa501: { obj: 'Memperoleh bukti audit yang cukup dan tepat atas unsur tertentu: persediaan, litigasi & klaim, serta informasi segmen.', sections: [
    { name: 'Persediaan', items: [
      ['Hadiri perhitungan fisik persediaan & evaluasi prosedur manajemen', '¶4'],
      ['Laksanakan prosedur atas catatan persediaan akhir', '¶4'],
    ]},
    { name: 'Litigasi & Klaim', items: [
      ['Inquiry manajemen & inspeksi korespondensi hukum/biaya legal', '¶9'],
      ['Komunikasi langsung dengan penasihat hukum eksternal entitas', '¶10'],
    ]},
    { name: 'Informasi Segmen', items: [
      ['Evaluasi penyajian & pengungkapan informasi segmen sesuai kerangka', '¶13'],
    ]},
  ]},
  sa520: { obj: 'Merancang dan melaksanakan prosedur analitis substantif serta prosedur analitis mendekati akhir audit.', sections: [
    { name: 'Prosedur Analitis Substantif', items: [
      ['Tentukan kesesuaian prosedur analitis untuk asersi tertentu', '¶5(a)'],
      ['Kembangkan ekspektasi & tentukan ambang selisih yang dapat diterima', '¶5(c)'],
      ['Bandingkan dengan nilai tercatat & investigasi selisih signifikan', '¶7'],
    ]},
    { name: 'Prosedur Analitis Penutup', items: [
      ['Lakukan prosedur analitis mendekati akhir audit untuk simpulan keseluruhan', '¶6'],
    ]},
  ]},
  sa530: { obj: 'Mendesain, memilih, dan mengevaluasi sampel audit yang representatif untuk menarik kesimpulan atas populasi.', sections: [
    { name: 'Desain & Seleksi Sampel', items: [
      ['Tentukan tujuan prosedur & karakteristik populasi', '¶6'],
      ['Tentukan ukuran sampel yang memadai (lihat Sampling Engine)', '¶7'],
      ['Pilih item sampel dengan metode yang tepat (MUS/acak/sistematis)', '¶8'],
    ]},
    { name: 'Evaluasi Hasil', items: [
      ['Proyeksikan salah saji dari sampel ke populasi', '¶14'],
      ['Evaluasi hasil sampel & kecukupan bukti audit', '¶15'],
    ]},
  ]},
  sa540: { obj: 'Mengaudit estimasi akuntansi, termasuk estimasi nilai wajar, dan pengungkapan terkait.', sections: [
    { name: 'Penilaian & Respons Risiko', items: [
      ['Identifikasi & nilai risiko salah saji material atas estimasi', '¶13'],
      ['Uji bagaimana manajemen membuat estimasi (metode, asumsi, data)', '¶18'],
      ['Evaluasi kewajaran asumsi signifikan & sensitivitasnya', '¶23'],
      ['Evaluasi indikator kemungkinan bias manajemen', '¶32'],
      ['Kembangkan estimasi atau rentang independen (bila relevan)', '¶21'],
    ]},
  ]},
  sa580: { obj: 'Memperoleh representasi tertulis dari manajemen sebagai bukti audit yang melengkapi.', sections: [
    { name: 'Representasi yang Diperoleh', items: [
      ['Tanggung jawab manajemen atas penyusunan laporan keuangan', '¶10'],
      ['Kelengkapan informasi & akses yang diberikan kepada auditor', '¶11'],
      ['Representasi spesifik: estimasi, pihak berelasi, peristiwa kemudian, fraud', '¶13'],
      ['Evaluasi keandalan; surat bertanggal & ditandatangani mendekati tgl laporan', '¶14'],
    ]},
  ]},
  sa710: { obj: 'Memperoleh bukti atas informasi komparatif dan menentukan dampaknya terhadap laporan auditor.', sections: [
    { name: 'Informasi Komparatif', items: [
      ['Tentukan apakah LK mencakup informasi komparatif yang disyaratkan kerangka', '¶7'],
      ['Evaluasi konsistensi kebijakan akuntansi antarperiode', '¶7'],
      ['Bila angka komparatif diaudit auditor lain — tambahkan paragraf Hal Lain', '¶13'],
    ]},
  ]},
  sa800: { obj: 'Pertimbangan khusus dalam audit laporan keuangan yang disusun sesuai kerangka bertujuan khusus.', sections: [
    { name: 'Pertimbangan Khusus', items: [
      ['Tentukan keberterimaan kerangka bertujuan khusus yang digunakan', '¶8'],
      ['Peroleh pemahaman atas tujuan penyusunan & pengguna yang dituju', '¶9'],
      ['Bentuk opini & tambahkan paragraf penekanan pembatasan distribusi/penggunaan', '¶14'],
    ]},
  ]},
  spr2400: { obj: 'Perikatan reviu atas laporan keuangan historis — memberikan keyakinan terbatas (limited assurance).', sections: [
    { name: 'Prosedur Reviu', items: [
      ['Laksanakan prosedur inquiry & analitis (bukan audit penuh)', '¶47'],
      ['Peroleh bukti yang memadai untuk simpulan keyakinan terbatas', '¶55'],
      ['Susun laporan reviu dalam bentuk keyakinan negatif', '¶86'],
    ]},
  ]},
  spr2410: { obj: 'Reviu atas informasi keuangan interim yang dilaksanakan oleh auditor independen entitas — keyakinan terbatas (negatif).', sections: [
    { name: 'Prosedur Reviu Interim', items: [
      ['Gunakan pemahaman entitas & pengendalian dari audit tahunan', '¶13'],
      ['Laksanakan inquiry & prosedur analitis atas informasi interim', '¶15'],
      ['Laksanakan prosedur tambahan bila terindikasi salah saji material', '¶22'],
      ['Susun laporan reviu interim dalam bentuk simpulan negatif', '¶43'],
    ]},
  ]},
  sjah3000: { obj: 'Perikatan asurans selain audit/reviu atas informasi keuangan historis (SJAH/ISAE 3000).', sections: [
    { name: 'Perikatan Asurans', items: [
      ['Tentukan jenis perikatan: keyakinan memadai atau terbatas', '¶12'],
      ['Identifikasi kriteria yang sesuai untuk hal pokok', '¶24'],
      ['Kumpulkan bukti memadai & bentuk simpulan asurans', '¶46'],
    ]},
  ]},
  sjah3400: { obj: 'Pemeriksaan informasi keuangan prospektif — prakiraan/proyeksi (SJAH/ISAE 3400).', sections: [
    { name: 'Penerimaan & Asumsi', items: [
      ['Tentukan jenis PFI: prakiraan (asumsi terbaik) vs proyeksi (asumsi hipotetis)', '¶6'],
      ['Pastikan periode tidak melampaui batas yang dapat diandalkan manajemen', '¶13'],
      ['Evaluasi kewajaran asumsi terbaik & konsistensi asumsi hipotetis dgn tujuan', '¶17'],
    ]},
    { name: 'Pemeriksaan & Pelaporan', items: [
      ['Uji konsistensi dasar penyusunan dengan PSAK & LK historis', '¶18'],
      ['Rekomputasi aritmetika model proyeksi', '¶19'],
      ['Rumuskan keyakinan negatif atas asumsi + opini penyusunan', '¶27'],
      ['Cantumkan paragraf peringatan (caveat) atas perbedaan realisasi', '¶27'],
    ]},
  ]},
  psak71: { obj: 'Audit atas klasifikasi, pengukuran, dan penurunan nilai instrumen keuangan sesuai PSAK 71.', sections: [
    { name: 'Klasifikasi & Pengukuran', items: [
      ['Evaluasi klasifikasi aset keuangan (uji SPPI & model bisnis)', 'PSAK 71.4'],
      ['Verifikasi pengukuran pada biaya perolehan diamortisasi / FVOCI / FVTPL', 'PSAK 71.4'],
    ]},
    { name: 'Penurunan Nilai (ECL)', items: [
      ['Uji penerapan model expected credit loss (lihat Kalkulator ECL)', 'PSAK 71.5'],
      ['Evaluasi staging (1/2/3) & kewajaran loss rate', 'PSAK 71.5'],
      ['Evaluasi pengungkapan risiko kredit terkait (PSAK 60)', 'PSAK 60'],
    ]},
  ]},
  sa240: { obj: 'Tanggung jawab auditor terkait kecurangan (fraud) dalam audit atas laporan keuangan — identifikasi, penilaian, dan respons risiko.', sections: [
    { name: 'Penilaian Risiko Fraud', items: [
      ['Diskusi tim perikatan (brainstorming) atas kerentanan LK terhadap fraud', '¶15'],
      ['Inquiry manajemen, TCWG & audit internal atas risiko serta dugaan fraud', '¶17'],
      ['Identifikasi faktor risiko fraud (tekanan, peluang, rasionalisasi)', '¶24'],
      ['Anggap risiko pada pengakuan pendapatan sebagai risiko signifikan', '¶26'],
    ]},
    { name: 'Respons atas Risiko Fraud', items: [
      ['Uji ketepatan jurnal & penyesuaian (lihat Journal Entry Testing)', '¶32'],
      ['Evaluasi unsur subjektivitas & indikasi bias dalam estimasi akuntansi', '¶32'],
      ['Terapkan unsur ketidakterdugaan (unpredictability) dalam prosedur', '¶29'],
      ['Peroleh representasi tertulis terkait fraud (SA 580)', '¶39'],
    ]},
  ]},
  sa265: { obj: 'Mengomunikasikan defisiensi pengendalian internal yang teridentifikasi kepada TCWG dan manajemen secara tepat waktu.', sections: [
    { name: 'Identifikasi & Evaluasi', items: [
      ['Tentukan apakah defisiensi pengendalian teridentifikasi dari prosedur audit', '¶7'],
      ['Evaluasi apakah defisiensi tergolong signifikan atau biasa', '¶8'],
    ]},
    { name: 'Komunikasi', items: [
      ['Komunikasikan defisiensi signifikan secara tertulis kepada TCWG', '¶9'],
      ['Komunikasikan defisiensi lain kepada manajemen pada level yang tepat', '¶10'],
      ['Sertakan deskripsi defisiensi & dampak potensialnya dalam komunikasi', '¶11'],
    ]},
  ]},
  sa701: { obj: 'Menentukan dan mengomunikasikan Hal Audit Utama (Key Audit Matters) dalam laporan auditor entitas terdaftar.', sections: [
    { name: 'Penentuan KAM', items: [
      ['Identifikasi hal yang memerlukan perhatian signifikan auditor', '¶9'],
      ['Pertimbangkan area risiko tinggi, estimasi signifikan & transaksi penting', '¶9'],
      ['Tentukan hal mana yang paling signifikan sebagai KAM', '¶10'],
    ]},
    { name: 'Komunikasi dalam Laporan', items: [
      ['Uraikan tiap KAM beserta alasan termasuknya sebagai hal audit utama', '¶13'],
      ['Jelaskan bagaimana KAM ditangani & rujuk pengungkapan LK terkait', '¶13'],
      ['Komunikasikan KAM kepada TCWG (SA 260)', '¶17'],
    ]},
  ]},
  sa705: { obj: 'Memodifikasi opini auditor (WDP / Tidak Wajar / TMP) serta menambahkan paragraf Penekanan Suatu Hal & Hal Lain (SA 706).', sections: [
    { name: 'Modifikasi Opini (SA 705)', items: [
      ['Tentukan jenis modifikasi: WDP, Tidak Wajar, atau Tidak Menyatakan Pendapat', '705 ¶2'],
      ['Evaluasi sifat (salah saji / pembatasan ruang lingkup) & pervasiveness', '705 ¶5'],
      ['Susun paragraf Basis Modifikasi & sesuaikan rumusan opini', '705 ¶16'],
      ['Komunikasikan modifikasi yang diharapkan kepada TCWG', '705 ¶30'],
    ]},
    { name: 'Penekanan & Hal Lain (SA 706)', items: [
      ['Pertimbangkan paragraf Penekanan Suatu Hal (Emphasis of Matter)', '706 ¶8'],
      ['Pertimbangkan paragraf Hal Lain (Other Matter) bila relevan', '706 ¶10'],
    ]},
  ]},
  sa720: { obj: 'Tanggung jawab auditor atas informasi lain dalam laporan tahunan yang memuat laporan keuangan auditan.', sections: [
    { name: 'Pertimbangan Informasi Lain', items: [
      ['Peroleh informasi lain (laporan tahunan/manajemen) sebelum tanggal laporan', '¶13'],
      ['Baca & pertimbangkan inkonsistensi material dengan LK / pengetahuan auditor', '¶14'],
      ['Tanggapi bila terdapat kesalahan penyajian material atas informasi lain', '¶16'],
      ['Cantumkan paragraf “Informasi Lain” dalam laporan auditor', '¶22'],
    ]},
  ]},
  psak72: { obj: 'Audit atas pengakuan pendapatan dari kontrak dengan pelanggan sesuai model lima langkah PSAK 72.', sections: [
    { name: 'Model Lima Langkah', items: [
      ['Identifikasi kontrak & kewajiban pelaksanaan (performance obligations)', 'PSAK 72.9'],
      ['Tentukan harga transaksi & alokasi ke tiap kewajiban pelaksanaan', 'PSAK 72.47'],
      ['Uji saat pengakuan: pada suatu waktu vs sepanjang waktu', 'PSAK 72.31'],
    ]},
    { name: 'Risiko & Pengungkapan', items: [
      ['Uji cut-off & perlakukan pengakuan pendapatan sebagai risiko fraud (SA 240)', 'PSAK 72'],
      ['Uji estimasi imbalan variabel & penerapan kendala (constraint)', 'PSAK 72.50'],
      ['Evaluasi kecukupan pengungkapan disagregasi pendapatan', 'PSAK 72.110'],
    ]},
  ]},
  sakep: { obj: 'Pertimbangan audit atas laporan keuangan yang disusun berdasarkan SAK Entitas Privat (efektif 1 Jan 2025, menggantikan SAK ETAP).', sections: [
    { name: 'Keberterimaan & Transisi', items: [
      ['Pastikan entitas memenuhi definisi entitas privat (tanpa akuntabilitas publik)', 'SAK EP Bab 1'],
      ['Evaluasi penerapan ketentuan transisi dari SAK ETAP ke SAK EP', 'SAK EP Bab 35'],
    ]},
    { name: 'Penerapan & Pelaporan', items: [
      ['Uji penyederhanaan pengukuran (mis. model biaya untuk aset tetap & takberwujud)', 'SAK EP'],
      ['Evaluasi kecukupan pengungkapan sesuai kerangka SAK EP', 'SAK EP Bab 3'],
      ['Pastikan rujukan kerangka pelaporan tepat dalam opini (SA 700/800)', 'SAK EP'],
    ]},
  ]},
};

const STD_META = {
  sa250: { mat: 'Hukum & Regulasi', risk: 'Medium' }, sa260: { mat: 'Komunikasi TCWG', risk: 'Low' },
  sa501: { mat: 'Bukti Spesifik', risk: 'High' }, sa520: { mat: 'Prosedur Analitis', risk: 'Medium' },
  sa530: { mat: 'Sampling Audit', risk: 'Medium' }, sa540: { mat: 'Estimasi Akuntansi', risk: 'High' },
  sa580: { mat: 'Representasi Tertulis', risk: 'Low' }, sa710: { mat: 'Komparatif', risk: 'Low' },
  sa800: { mat: 'Kerangka Khusus', risk: 'Medium' }, spr2400: { mat: 'Reviu', risk: 'Medium' },
  spr2410: { mat: 'Reviu Interim', risk: 'Medium' },
  sjah3000: { mat: 'Asurans', risk: 'Medium' }, psak71: { mat: 'Instrumen Keuangan', risk: 'High' },
  sjah3400: { mat: 'Info Prospektif', risk: 'Medium' },
  sjah3420: { mat: 'Info Proforma', risk: 'Medium' },
  sa240: { mat: 'Risiko Fraud', risk: 'High' }, sa265: { mat: 'Defisiensi Pengendalian', risk: 'Medium' },
  sa701: { mat: 'Hal Audit Utama', risk: 'Medium' }, sa705: { mat: 'Modifikasi Opini', risk: 'High' },
  sa720: { mat: 'Informasi Lain', risk: 'Low' }, psak72: { mat: 'Pendapatan', risk: 'High' },
  sakep: { mat: 'Kerangka Entitas Privat', risk: 'Medium' },
};

/* localStorage helpers shared with the Compliance Matrix */
function loadLS(k, d) { try { const s = localStorage.getItem(k); return s ? JSON.parse(s) : d; } catch (e) { return d; } }
function compliancePct(stdId) {
  const cfg = COMPLIANCE_CONFIG[stdId]; if (!cfg) return null;
  const status = loadLS('ams.comp.' + stdId + '.status', {});
  const counts = { done: 0, na: 0, pending: 0 }; let total = 0;
  cfg.sections.forEach((s, si) => s.items.forEach((it, ii) => { total++; const st = status[si + '-' + ii] || 'pending'; counts[st] = (counts[st] || 0) + 1; }));
  const applicable = total - counts.na;
  return { total, done: counts.done, na: counts.na, pending: counts.pending, pct: applicable ? Math.round(counts.done / applicable * 100) : 100 };
}

function ComplianceView({ stdId }) {
  const m = MODULE_INDEX[stdId] || { label: stdId };
  const cfg = COMPLIANCE_CONFIG[stdId];
  // flatten items with stable ids
  const flat = useMemoCO(() => cfg.sections.flatMap((s, si) => s.items.map((it, ii) => ({ sid: si, id: si + '-' + ii, text: it[0], ref: it[1] }))), [stdId]);
  const [status, setStatus] = useStateCO(() => loadLS('ams.comp.' + stdId + '.status', {}));
  const [openNote, setOpenNote] = useStateCO(null);
  const [notes, setNotes] = useStateCO(() => loadLS('ams.comp.' + stdId + '.notes', {}));
  React.useEffect(() => { setStatus(loadLS('ams.comp.' + stdId + '.status', {})); setNotes(loadLS('ams.comp.' + stdId + '.notes', {})); setOpenNote(null); }, [stdId]);
  React.useEffect(() => { try { localStorage.setItem('ams.comp.' + stdId + '.status', JSON.stringify(status)); } catch (e) {} }, [status, stdId]);
  React.useEffect(() => { try { localStorage.setItem('ams.comp.' + stdId + '.notes', JSON.stringify(notes)); } catch (e) {} }, [notes, stdId]);

  const cycle = (id) => setStatus(s => { const cur = s[id] || 'pending'; const next = cur === 'pending' ? 'done' : cur === 'done' ? 'na' : 'pending'; return { ...s, [id]: next }; });
  const markAllDone = () => setStatus(() => { const s = {}; flat.forEach(it => { s[it.id] = 'done'; }); return s; });
  const resetAll = () => { setStatus({}); setNotes({}); };
  const aiSuggest = () => setNotes(n => { const out = { ...n }; flat.forEach(it => { if (!out[it.id]) out[it.id] = 'Diuji — lihat WP terkait; tidak ada eksepsi teridentifikasi.'; }); return out; });
  const counts = flat.reduce((a, it) => { const st = status[it.id] || 'pending'; a[st] = (a[st] || 0) + 1; return a; }, {});
  const applicable = flat.length - (counts.na || 0);
  const done = counts.done || 0;
  const pct = applicable ? Math.round(done / applicable * 100) : 100;

  const meta = STD_META[stdId] || {};
  const stLabel = m.label;

  return (
    <>
      <SubBar moduleId={stdId} right={
        <div className="row gap8 ac">
          <Badge kind={pct === 100 ? 'green' : 'amber'}>{pct}% selesai</Badge>
          <Btn sm onClick={markAllDone}><I.check size={13} /> Tandai Semua</Btn>
          <Btn sm onClick={resetAll}><I.sync size={13} /> Reset</Btn>
          <Btn sm><I.download size={13} /> Export Kertas Kerja</Btn>
          <Btn sm variant="primary" onClick={aiSuggest}><I.sparkle size={14} /> AI Assist</Btn>
        </div>
      } />
      <div className="view-scroll">
        <div className="view-pad">
          <div className="grid" style={{ gridTemplateColumns: '300px 1fr', gap: 12, alignItems: 'start' }}>
            {/* meta + progress */}
            <div className="grid" style={{ gap: 12 }}>
              <Panel noBody>
                <div style={{ background: 'linear-gradient(125deg,#013a52,#005085)', color: '#fff', padding: '16px 16px 14px' }}>
                  <div className="row ac jb">
                    <Badge kind="blue" >{stLabel.split('·')[0].trim()}</Badge>
                    <Badge kind={meta.risk === 'High' ? 'red' : meta.risk === 'Medium' ? 'amber' : 'green'}>{meta.risk}</Badge>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, marginTop: 8 }}>{meta.mat || stLabel}</div>
                  <p style={{ margin: '6px 0 0', fontSize: 11.5, lineHeight: 1.5, color: '#bcd6e4' }}>{cfg.obj}</p>
                </div>
                <div style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
                  <Donut segments={[{ value: done, color: '#1f7a4d' }, { value: (counts.pending || 0), color: '#e7ebef' }, { value: (counts.na || 0), color: '#c3cad2' }]} size={84} thickness={12}
                    center={<div className="mono" style={{ fontSize: 17, fontWeight: 700, color: 'var(--navy)' }}>{pct}%</div>} />
                  <div style={{ flex: 1, display: 'grid', gap: 5 }}>
                    <div className="row jb tiny"><span className="row ac gap6"><span style={{ width: 8, height: 8, borderRadius: 2, background: '#1f7a4d' }} />Selesai</span><b className="mono">{done}</b></div>
                    <div className="row jb tiny"><span className="row ac gap6"><span style={{ width: 8, height: 8, borderRadius: 2, background: '#e7ebef' }} />Tertunda</span><b className="mono">{counts.pending || 0}</b></div>
                    <div className="row jb tiny"><span className="row ac gap6"><span style={{ width: 8, height: 8, borderRadius: 2, background: '#c3cad2' }} />N/A</span><b className="mono">{counts.na || 0}</b></div>
                  </div>
                </div>
              </Panel>
              <Panel title="Konteks Engagement">
                <div style={{ display: 'grid', gap: 8 }}>
                  <RowKv label="Klien" v="PT Sentosa Makmur" />
                  <RowKv label="Engagement" v="ENG-2025-014" />
                  <RowKv label="Total Prosedur" v={flat.length + ' item'} />
                  <RowKv label="Preparer" v="Dimas R." />
                </div>
              </Panel>
            </div>

            {/* checklist */}
            <div className="grid" style={{ gap: 12 }}>
              {cfg.sections.map((sec, si) => (
                <Panel key={si} noBody>
                  <div className="panel-h"><h3>{sec.name}</h3><div style={{ flex: 1 }} /><span className="tiny muted">{sec.items.length} prosedur</span></div>
                  <div>
                    {flat.filter(it => it.sid === si).map(it => {
                      const st = status[it.id] || 'pending';
                      return (
                        <div key={it.id} style={{ borderBottom: '1px solid var(--line-soft)' }}>
                          <div className="row gap10" style={{ padding: '10px 12px', alignItems: 'flex-start' }}>
                            <button onClick={() => cycle(it.id)} title="Klik untuk ubah status" style={{ flex: '0 0 20px', width: 20, height: 20, borderRadius: 5, marginTop: 1, border: '1.5px solid ' + (st === 'done' ? 'var(--green)' : st === 'na' ? 'var(--line-strong)' : 'var(--line-strong)'), background: st === 'done' ? 'var(--green)' : st === 'na' ? 'var(--surface-3)' : '#fff', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
                              {st === 'done' && <I.check size={13} style={{ color: '#fff' }} />}
                              {st === 'na' && <span className="tiny" style={{ fontSize: 8, fontWeight: 700, color: 'var(--ink-4)' }}>NA</span>}
                            </button>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 12.5, lineHeight: 1.45, color: st === 'na' ? 'var(--ink-4)' : 'var(--ink)', textDecoration: st === 'na' ? 'line-through' : 'none' }}>{it.text}</div>
                              {notes[it.id] && <div className="tiny muted" style={{ marginTop: 3, fontStyle: 'italic' }}>“{notes[it.id]}”</div>}
                            </div>
                            <span className="chip tiny" style={{ height: 18, fontFamily: 'var(--mono)' }}>{it.ref}</span>
                            <button className="p-act" onClick={() => setOpenNote(openNote === it.id ? null : it.id)} title="Catatan"><I.doc size={14} /></button>
                          </div>
                          {openNote === it.id && (
                            <div style={{ padding: '0 12px 10px 42px' }}>
                              <input className="input" style={{ width: '100%' }} placeholder="Tambah catatan / referensi WP…" value={notes[it.id] || ''} onChange={e => setNotes(n => ({ ...n, [it.id]: e.target.value }))} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Panel>
              ))}
              <div className="panel" style={{ padding: '11px 14px', background: pct === 100 ? 'var(--green-bg)' : 'var(--surface-2)', borderColor: 'transparent' }}>
                <div className="row ac gap8">
                  <span style={{ color: pct === 100 ? 'var(--green)' : 'var(--ink-3)' }}>{pct === 100 ? <I.checkCircle size={16} /> : <I.clock size={16} />}</span>
                  <span style={{ fontSize: 12.5, fontWeight: 600 }}>{pct === 100 ? 'Seluruh prosedur yang berlaku telah diselesaikan — siap untuk review.' : `${applicable - done} prosedur masih tertunda. Klik kotak untuk menandai Selesai / N/A.`}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { COMPLIANCE_CONFIG, STD_META, ComplianceView, loadLS, compliancePct });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { COMPLIANCE_CONFIG, ComplianceView, STD_META, compliancePct, loadLS };
