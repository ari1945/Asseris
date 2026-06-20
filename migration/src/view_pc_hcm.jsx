/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { useNav } from './contexts.jsx';
import { I } from './icons.jsx';
import { Avatar, Btn, Donut, Panel, Stat } from './ui.jsx';

/* ============================================================
   NeoSuite AMS — HCM deepening: 360° Profile drawer + Analytics
   (consumed by HCM in view_people.jsx)
   ============================================================ */
const { useState: usePChcm } = React;

/* default profile when an employee has no enriched record */
function profileOf(s) {
  const A = AMS;
  const base = (A.STAFF_PROFILE || {})[s.id] || {};
  return {
    phone: base.phone || '0811-•••-' + s.id.slice(-3),
    location: base.location || 'Jakarta (HQ)',
    birth: base.birth || '—',
    gender: base.gender || '—',
    empType: base.empType || 'Tetap',
    band: base.band || s.grade[0] + '1',
    salaryBand: base.salaryBand || '—',
    nik: base.nik || '3174••••••••',
    npwp: base.npwp || '—',
    bpjsKes: base.bpjsKes || 'Aktif',
    bpjsTk: base.bpjsTk || 'Aktif',
    emergency: base.emergency || { name: '—', rel: '—', phone: '—' },
    skills: base.skills || (A.COMPETENCY_ACTUAL[s.id] ? A.COMPETENCIES.map(c => [c.name, A.COMPETENCY_ACTUAL[s.id][c.id] || 2]) : [['Pengujian Substantif', 3], ['Kertas Kerja', 3], ['Komunikasi', 3]]),
    docs: base.docs || [['Sertifikat ' + (s.cert || 'CA'), 'Valid'], ['KTP & NPWP', 'Lengkap'], ['Kontrak Kerja', 'Aktif']],
    timeline: base.timeline || [[String(s.joined), 'Bergabung sebagai ' + s.role]],
  };
}

function Profile360Drawer({ s, onClose }) {
  const A = AMS, fmt = A.fmt;
  const nav = useNav();
  const p = profileOf(s);
  const tenure = 2026 - s.joined;
  const pay = (A.PAYROLL || {})[s.id];
  const lv = (A.LEAVE_BALANCE || {})[s.id];
  const lvTotal = lv ? lv.ent + lv.carry : 12;
  const lvLeft = lv ? lvTotal - lv.used : 12;
  const cpe = ((A.CPE_LOG || {})[s.id] || []).reduce((a, r) => a + r.skp, 0);
  const perf = (A.PERF_CYCLE.people || {})[s.id];
  const indep = (A.INDEPENDENCE || []).find(d => d.id === s.id);
  const ethics = (A.ETHICS_DECL || {})[s.id];
  const GC = A.GRADE_COLOR_PC;

  const Section = ({ title, children, action }) => (
    <div style={{ marginBottom: 16 }}>
      <div className="row ac jb" style={{ marginBottom: 8 }}><div className="tiny muted upper">{title}</div>{action}</div>
      {children}
    </div>
  );
  const Kv = ({ l, v, accent }) => (
    <div className="panel" style={{ padding: '7px 10px', boxShadow: 'none' }}>
      <div className="tiny muted upper" style={{ marginBottom: 2 }}>{l}</div>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: accent || 'var(--ink)' }}>{v}</div>
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,20,30,.4)', zIndex: 90, display: 'flex', justifyContent: 'flex-end' }} onClick={onClose}>
      <div className="panel" style={{ width: 540, maxWidth: '96vw', height: '100%', borderRadius: 0, display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-lg)' }} onClick={e => e.stopPropagation()}>
        <div style={{ background: 'linear-gradient(125deg,#013a52,#005085)', color: '#fff', padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 13, flex: '0 0 auto' }}>
          <Avatar name={s.name} size={50} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700 }} className="truncate">{s.name}</div>
            <div className="tiny" style={{ color: '#bcd6e4' }}>{s.role} · {s.id} · {p.location}</div>
            <div className="row gap6 ac" style={{ marginTop: 5 }}>
              <span className="badge" style={{ background: 'rgba(255,255,255,.16)', color: '#fff', fontSize: 10 }}>{s.grade} · Band {p.band}</span>
              <span className="badge" style={{ background: 'rgba(255,255,255,.16)', color: '#fff', fontSize: 10 }}>{s.cert}</span>
            </div>
          </div>
          <button className="top-btn" onClick={onClose}><I.x size={18} /></button>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: 18 }}>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 16 }}>
            <div className="panel" style={{ padding: '8px 10px', boxShadow: 'none', textAlign: 'center' }}><div className="mono" style={{ fontSize: 16, fontWeight: 800, color: 'var(--navy)' }}>{tenure}<span style={{ fontSize: 10, fontWeight: 600 }}>th</span></div><div className="tiny muted">Masa Kerja</div></div>
            <div className="panel" style={{ padding: '8px 10px', boxShadow: 'none', textAlign: 'center' }}><div className="mono" style={{ fontSize: 16, fontWeight: 800, color: s.util > 90 ? 'var(--red)' : 'var(--green)' }}>{s.util}%</div><div className="tiny muted">Utilisasi</div></div>
            <div className="panel" style={{ padding: '8px 10px', boxShadow: 'none', textAlign: 'center' }}><div className="mono" style={{ fontSize: 16, fontWeight: 800, color: 'var(--blue)' }}>{s.rating.toFixed(1)}</div><div className="tiny muted">Rating</div></div>
            <div className="panel" style={{ padding: '8px 10px', boxShadow: 'none', textAlign: 'center' }}><div className="mono" style={{ fontSize: 16, fontWeight: 800, color: cpe >= 40 ? 'var(--green)' : 'var(--amber)' }}>{cpe}</div><div className="tiny muted">SKP</div></div>
          </div>

          <Section title="Informasi Pribadi & Kepegawaian">
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <Kv l="Email" v={s.email || '—'} />
              <Kv l="Telepon" v={p.phone} />
              <Kv l="Status" v={s.status} accent={s.status === 'Aktif' ? 'var(--green)' : 'var(--amber)'} />
              <Kv l="Tipe" v={p.empType} />
              <Kv l="NIK" v={p.nik} />
              <Kv l="NPWP" v={p.npwp} />
              <Kv l="BPJS Kesehatan" v={p.bpjsKes} accent="var(--green)" />
              <Kv l="BPJS TK" v={p.bpjsTk} accent="var(--green)" />
            </div>
          </Section>

          <Section title="Keahlian & Kompetensi" action={<button className="btn sm" style={{ height: 22 }} onClick={() => { onClose(); nav('learning'); }}><I.arrowRight size={11} /> Matriks</button>}>
            <div style={{ display: 'grid', gap: 7 }}>
              {p.skills.slice(0, 6).map(([l, v], i) => (
                <div key={i}>
                  <div className="row jb tiny" style={{ marginBottom: 2 }}><span>{l}</span><span className="mono" style={{ fontWeight: 700 }}>{v}/5</span></div>
                  <div style={{ height: 5, borderRadius: 3, background: 'var(--surface-3)' }}><div style={{ width: (v / 5 * 100) + '%', height: '100%', borderRadius: 3, background: v >= 4 ? 'var(--green)' : v >= 3 ? 'var(--blue)' : 'var(--amber)' }} /></div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Kinerja & Karier" action={<button className="btn sm" style={{ height: 22 }} onClick={() => { onClose(); nav('performance'); }}><I.arrowRight size={11} /> Kinerja</button>}>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <Kv l="Skor Kinerja" v={perf ? perf.perf.toFixed(1) + ' / 5' : s.rating.toFixed(1) + ' / 5'} accent="var(--blue)" />
              <Kv l="Potensi (9-box)" v={perf ? perf.box : '—'} />
              <Kv l="Engagement Aktif" v={s.engagements} />
              <Kv l="Rekomendasi" v={perf && perf.promote !== '—' ? perf.promote : 'Pertahankan'} accent={perf && perf.promote !== '—' ? 'var(--purple)' : undefined} />
            </div>
          </Section>

          <Section title="Kompensasi & Cuti" action={<button className="btn sm" style={{ height: 22 }} onClick={() => { onClose(); nav('payroll'); }}><I.arrowRight size={11} /> Slip Gaji</button>}>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <Kv l="Band Gaji" v={p.salaryBand} />
              <Kv l="Penghasilan Bruto/bln" v={pay ? 'Rp ' + fmt((pay.gross + pay.allowance) / 1e6, 1) + ' jt' : '—'} />
              <Kv l="PTKP" v={pay ? pay.ptkp : '—'} />
              <Kv l="Sisa Cuti" v={lvLeft + ' / ' + lvTotal + ' hari'} accent={lvLeft <= 2 ? 'var(--amber)' : 'var(--green)'} />
            </div>
          </Section>

          <Section title="Kepatuhan & Etika">
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <Kv l="Deklarasi Etika" v={ethics ? (ethics.signed ? 'Ditandatangani' : 'Belum') : '—'} accent={ethics && ethics.signed ? 'var(--green)' : 'var(--amber)'} />
              <Kv l="Independensi" v={indep ? (indep.declared ? 'Diterima' : 'Belum') : '—'} accent={indep && indep.declared ? 'var(--green)' : 'var(--amber)'} />
              {indep && indep.rotationClient !== '—' && <Kv l="Rotasi Klien" v={indep.rotationClient.replace('PT ', '')} />}
              {indep && indep.rotationClient !== '—' && <Kv l="Masa Tugas" v={indep.tenure + ' / ' + indep.rotationLimit + ' th'} accent={indep.tenure >= indep.rotationLimit ? 'var(--red)' : indep.tenure >= indep.rotationLimit - 1 ? 'var(--amber)' : 'var(--green)'} />}
            </div>
          </Section>

          <Section title="Dokumen & Sertifikasi">
            <div style={{ display: 'grid', gap: 6 }}>
              {p.docs.map(([l, st], i) => (
                <div key={i} className="row ac jb" style={{ padding: '7px 11px', border: '1px solid var(--line-soft)', borderRadius: 7 }}>
                  <span className="row ac gap8 tiny" style={{ fontWeight: 500 }}><I.doc size={13} style={{ color: 'var(--ink-4)' }} />{l}</span>
                  <span className="chip tiny">{st}</span>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Linimasa Karier">
            <div style={{ display: 'grid', gap: 0 }}>
              {p.timeline.map((t, i) => (
                <div key={i} className="row gap8" style={{ paddingBottom: i < p.timeline.length - 1 ? 12 : 0 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: '0 0 auto' }}>
                    <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--blue)', marginTop: 3 }} />
                    {i < p.timeline.length - 1 && <span style={{ width: 1.5, flex: 1, background: 'var(--line)' }} />}
                  </div>
                  <div><span className="mono tiny muted" style={{ marginRight: 8 }}>{t[0]}</span><span style={{ fontSize: 12 }}>{t[1]}</span></div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Darurat (Emergency Contact)">
            <div className="panel" style={{ padding: '9px 12px', boxShadow: 'none', background: 'var(--surface-2)' }}>
              <div className="row ac jb"><span style={{ fontWeight: 600, fontSize: 12.5 }}>{p.emergency.name}</span><span className="tiny muted">{p.emergency.rel}</span></div>
              <div className="tiny mono muted" style={{ marginTop: 2 }}>{p.emergency.phone}</div>
            </div>
          </Section>
        </div>

        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--line)', display: 'flex', gap: 8, flex: '0 0 auto' }}>
          <Btn style={{ flex: 1 }} onClick={() => { onClose(); nav('orgchart'); }}><I.group size={13} /> Lihat di Org Chart</Btn>
          <Btn variant="primary" style={{ flex: 1 }}><I.download size={13} /> Ekspor Profil (PDF)</Btn>
        </div>
      </div>
    </div>
  );
}

/* ---------------- HCM Analytics (demografi · headcount · attrition) ---------------- */
function HCMAnalytics() {
  const A = AMS;
  const D = A.HCM_ANALYTICS;
  const GC = A.GRADE_COLOR_PC;
  const totalHC = D.gradeMix.reduce((s, g) => s + g.n, 0);
  const maxTrend = Math.max(...D.headcountTrend.map(t => t.total));

  const Bar = ({ rows, max, color }) => (
    <div style={{ display: 'grid', gap: 7 }}>
      {rows.map((r, i) => (
        <div key={i} className="row ac gap8">
          <span className="tiny" style={{ width: 76, flex: '0 0 76px', textAlign: 'right', color: 'var(--ink-2)' }}>{r.k || r.g}</span>
          <div style={{ flex: 1, height: 16, borderRadius: 4, background: 'var(--surface-3)', position: 'relative' }}><div style={{ width: (r.n != null ? r.n / max * 100 : r.rate) + '%', height: '100%', borderRadius: 4, background: typeof color === 'function' ? color(r) : color }} /></div>
          <span className="mono tiny" style={{ width: 34, fontWeight: 700, textAlign: 'right' }}>{r.n != null ? r.n : r.rate + '%'}</span>
        </div>
      ))}
    </div>
  );

  return (
    <div>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={totalHC} label="Headcount Aktif" /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={D.annualAttrition + '%'} label="Attrition Tahunan" accent={D.annualAttrition > 15 ? 'var(--amber)' : 'var(--green)'} delta={D.regrettable + '% regrettable'} deltaDir="down" /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={D.avgTenure + ' th'} label="Rata-rata Masa Kerja" /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={D.timeToFill + ' hari'} label="Time-to-Fill" accent="var(--blue)" /></div></Panel>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1.4fr 1fr', gap: 12, marginBottom: 12, alignItems: 'stretch' }}>
        <Panel noBody>
          <div className="panel-h"><h3>Tren Headcount & Pergerakan</h3><div style={{ flex: 1 }} /><span className="tiny muted">8 kuartal · hire vs exit</span></div>
          <div style={{ padding: 16 }}>
            <div className="row" style={{ gap: 10, alignItems: 'flex-end', height: 160 }}>
              {D.headcountTrend.map((t, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 3 }}>
                    <div title={'Hire ' + t.hires} style={{ width: 9, height: (t.hires / 8 * 100) + '%', minHeight: 4, background: 'var(--green)', borderRadius: '2px 2px 0 0' }} />
                    <div title={'Exit ' + t.exits} style={{ width: 9, height: (t.exits / 8 * 100) + '%', minHeight: 4, background: 'var(--red)', borderRadius: '2px 2px 0 0' }} />
                  </div>
                  <div className="mono tiny" style={{ fontWeight: 700, color: 'var(--navy)' }}>{t.total}</div>
                  <div className="tiny muted" style={{ fontSize: 9.5 }}>{t.q}</div>
                </div>
              ))}
            </div>
            <div className="row gap12 tiny muted" style={{ marginTop: 10, justifyContent: 'center' }}>
              <span className="row ac gap4"><span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--green)' }} /> Rekrutmen</span>
              <span className="row ac gap4"><span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--red)' }} /> Keluar</span>
              <span>· angka = total headcount akhir kuartal</span>
            </div>
          </div>
        </Panel>

        <Panel noBody>
          <div className="panel-h"><h3>Komposisi Jenjang</h3></div>
          <div style={{ padding: 16, display: 'flex', gap: 14, alignItems: 'center' }}>
            <Donut size={120} thickness={18} segments={D.gradeMix.map(g => ({ value: g.n, color: GC[g.g] }))} center={<><div className="mono" style={{ fontSize: 18, fontWeight: 800, color: 'var(--navy)' }}>{totalHC}</div><div className="tiny muted">SDM</div></>} />
            <div style={{ flex: 1, display: 'grid', gap: 8 }}>
              {D.gradeMix.map(g => (
                <div key={g.g} className="row ac jb">
                  <span className="row ac gap6 tiny"><span style={{ width: 10, height: 10, borderRadius: 2, background: GC[g.g] }} />{g.g}</span>
                  <span className="mono tiny" style={{ fontWeight: 700 }}>{g.n} <span className="muted">({Math.round(g.n / totalHC * 100)}%)</span></span>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(2,1fr)', gap: 12, marginBottom: 12 }}>
        <Panel noBody>
          <div className="panel-h"><h3>Attrition per Jenjang</h3><div style={{ flex: 1 }} /><span className="tiny muted">12 bulan</span></div>
          <div style={{ padding: 16 }}><Bar rows={D.attritionByGrade} max={30} color={(r) => r.rate >= 20 ? 'var(--red)' : r.rate >= 12 ? 'var(--amber)' : 'var(--green)'} /></div>
        </Panel>
        <Panel noBody>
          <div className="panel-h"><h3>Sertifikasi Profesi</h3></div>
          <div style={{ padding: 16 }}><Bar rows={D.certMix} max={Math.max(...D.certMix.map(c => c.n))} color="var(--navy)" /></div>
        </Panel>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
        <Panel noBody>
          <div className="panel-h"><h3>Gender</h3></div>
          <div style={{ padding: 16 }}><Bar rows={D.genderMix} max={Math.max(...D.genderMix.map(c => c.n))} color="#005085" /></div>
        </Panel>
        <Panel noBody>
          <div className="panel-h"><h3>Masa Kerja</h3></div>
          <div style={{ padding: 16 }}><Bar rows={D.tenureMix} max={Math.max(...D.tenureMix.map(c => c.n))} color="#0a6b73" /></div>
        </Panel>
        <Panel noBody>
          <div className="panel-h"><h3>Usia</h3></div>
          <div style={{ padding: 16 }}><Bar rows={D.ageMix} max={Math.max(...D.ageMix.map(c => c.n))} color="#5b3fa6" /></div>
        </Panel>
      </div>
    </div>
  );
}

Object.assign(window, { Profile360Drawer, HCMAnalytics, profileOf });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { HCMAnalytics, Profile360Drawer, profileOf };
