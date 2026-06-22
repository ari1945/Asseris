/* [codemod] ESM imports */
import React from 'react';
import { api } from './api.js';
import { CAP } from './rbac.js';
import { useAuth, useNav } from './contexts';
import { I } from './icons';
import { Avatar, Badge, Btn, Panel, Seg, Stat } from './ui';

/* ============================================================
   Asseris — Pengaturan (full settings workspace)
   Tampilan · Profil · Notifikasi · Keamanan · Firma & Standar
   · Lokalisasi · Integrasi · Peran & Akses
   ============================================================ */
const { useState: useStateSet, useEffect: useEffectSet } = React;

/* ---- accent presets (override solid blue shades on :root) ---- */
const SETTINGS_ACCENTS = {
  biru:   { label: 'Biru KAP', swatch: '#005085', vars: null },
  teal:   { label: 'Teal', swatch: '#0a6b73', vars: { '--blue': '#0a6b73', '--blue-600': '#085960', '--blue-400': '#2f8a90' } },
  indigo: { label: 'Indigo', swatch: '#3a4fa3', vars: { '--blue': '#3a4fa3', '--blue-600': '#31448f', '--blue-400': '#5f72c4' } },
  plum:   { label: 'Plum', swatch: '#84426a', vars: { '--blue': '#84426a', '--blue-600': '#73385b', '--blue-400': '#a4658a' } },
};
function amsApplyPrefs(s) {
  s = s || {};
  const root = document.documentElement;
  ['--blue', '--blue-600', '--blue-400'].forEach(v => root.style.removeProperty(v));
  const acc = SETTINGS_ACCENTS[s.accent];
  if (acc && acc.vars) Object.entries(acc.vars).forEach(([k, v]: [string, any]) => root.style.setProperty(k, v));
  document.body.classList.toggle('reduce-motion', !!s.reduceMotion);
}
window.amsApplyPrefs = amsApplyPrefs;

const SETTINGS_DEFAULTS = {
  accent: 'biru', reduceMotion: false,
  profile: { name: 'Anindya Pramesti', title: 'Audit Manager', email: 'anindya.p@whr-cpa.id', phone: '+62 812-3456-7890', initials: 'AP' },
  notif: { email: true, app: true, push: false, reviewNotes: true, deadlines: true, approvals: true, eqr: true, mentions: true, digest: 'Harian', quietStart: '19:00', quietEnd: '07:00' },
  security: { twoFA: true, sessionTimeout: '30 menit', loginAlerts: true, ipAllowlist: false },
  firm: { defaultStandard: 'SA (ISA-converged)', fiscalYearEnd: '31 Desember', materialityBenchmark: '5% Laba Sebelum Pajak', retentionYears: '10 tahun', eqrThreshold: 'PIE + Risiko Tinggi', archiveWindow: '60 hari (SA 230)' },
  locale: { language: 'Bahasa Indonesia', dateFormat: 'DD/MM/YYYY', numberFormat: '1.234.567,89', currency: 'IDR (Rp)', timezone: 'WIB (GMT+7)', firstDay: 'Senin' },
  ai: { provider: 'anthropic', keys: {}, baseUrls: {}, share: true, temperature: 'Standar' },
  nav: { adaptive: true, mode: 'sorot', source: 'auto', manualPhase: 'Eksekusi', focusGroup: true, resumeCard: true, resumeCount: 3, markDone: true },
};

/* ---- shared controls ---- */
function SetToggle({ on, set, disabled }: any) {
  return (
    <span onClick={() => !disabled && set(!on)} role="switch" aria-checked={on}
      style={{ width: 38, height: 21, borderRadius: 11, background: on ? 'var(--blue)' : 'var(--line-strong)', position: 'relative', cursor: disabled ? 'not-allowed' : 'pointer', flex: '0 0 38px', opacity: disabled ? 0.5 : 1 }}>
      <span style={{ position: 'absolute', top: 2, left: on ? 19 : 2, width: 17, height: 17, borderRadius: '50%', background: '#fff', transition: 'left .15s', boxShadow: '0 1px 2px rgba(0,0,0,.2)' }} />
    </span>
  );
}
function SRow({ title, sub, children, last }: any) {
  return (
    <div className="row ac jb" style={{ padding: '12px 14px', borderBottom: last ? 0 : '1px solid var(--line-soft)', gap: 16 }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600 }}>{title}</div>
        {sub && <div className="tiny muted" style={{ marginTop: 2, lineHeight: 1.45, maxWidth: 460 }}>{sub}</div>}
      </div>
      <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 8 }}>{children}</div>
    </div>
  );
}
const SSelect = ({ value, onChange, options, w = 200 }: any) => (
  <select className="select" value={value} onChange={e => onChange(e.target.value)} style={{ width: w, height: 30 }}>
    {options.map(o => <option key={o}>{o}</option>)}
  </select>
);

/* ============================================================ */
function SettingsView() {
  const nav = useNav();
  const auth = useAuth();
  const { firm } = auth;
  const [settings, setSettings] = window.useAmsPersist('settings', SETTINGS_DEFAULTS);
  const [section, setSection] = window.useAmsPersist('settingsTab', 'tampilan');
  const [toast, setToast] = useStateSet(null);

  // ensure shape (merge defaults for any missing keys)
  const s = React.useMemo(() => ({
    ...SETTINGS_DEFAULTS, ...settings,
    profile: { ...SETTINGS_DEFAULTS.profile, ...(settings.profile || {}) },
    notif: { ...SETTINGS_DEFAULTS.notif, ...(settings.notif || {}) },
    security: { ...SETTINGS_DEFAULTS.security, ...(settings.security || {}) },
    firm: { ...SETTINGS_DEFAULTS.firm, ...(settings.firm || {}) },
    locale: { ...SETTINGS_DEFAULTS.locale, ...(settings.locale || {}) },
    ai: { ...SETTINGS_DEFAULTS.ai, ...(settings.ai || {}) },
    nav: { ...SETTINGS_DEFAULTS.nav, ...(settings.nav || {}) },
  }), [settings]);

  const setGroup = (grp, key, val) => setSettings(p => ({ ...p, [grp]: { ...(p[grp] || SETTINGS_DEFAULTS[grp]), [key]: val } }));
  const setTop = (key, val) => setSettings(p => ({ ...p, [key]: val }));
  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2200); };

  useEffectSet(() => { amsApplyPrefs(s); }, [s.accent, s.reduceMotion]);
  useEffectSet(() => { try { window.dispatchEvent(new Event('ams:navprefs')); } catch (e) {} }, [JSON.stringify(s.nav)]);

  // W7 — firm-methodology defaults need firm.admin (server-enforced); mirror with can().
  const isPartner = typeof auth.can === 'function' ? auth.can(CAP.FIRM_ADMIN) : auth.role === 'Engagement Partner';

  const SECTIONS = [
    { id: 'tampilan', icon: 'sliders', label: 'Tampilan', sub: 'Tema, kepadatan, warna' },
    { id: 'navigasi', icon: 'columns', label: 'Navigasi & Sidebar', sub: 'Adaptif & Lanjutkan' },
    { id: 'profil', icon: 'users', label: 'Profil & Akun', sub: 'Identitas & peran' },
    { id: 'notif', icon: 'bell', label: 'Notifikasi', sub: 'Saluran & ringkasan' },
    { id: 'keamanan', icon: 'lock', label: 'Keamanan', sub: '2FA, sesi, sandi' },
    { id: 'firma', icon: 'building', label: 'Firma & Standar', sub: 'Default metodologi' },
    { id: 'lokalisasi', icon: 'flag', label: 'Lokalisasi', sub: 'Bahasa, format, zona' },
    { id: 'integrasi', icon: 'link2', label: 'Integrasi', sub: 'Koneksi sistem' },
    { id: 'ai', icon: 'sparkle', label: 'AI & LLM', sub: 'Provider model & ekstraksi' },
    { id: 'akses', icon: 'shield', label: 'Peran & Akses', sub: 'RBAC & hak' },
  ];

  return (
    <>
      {/* custom subbar */}
      <div className="subbar">
        <div className="crumb"><span>Firm Platform</span><span className="sep"><I.chevron size={12} /></span><b>Pengaturan</b></div>
        <span className="chip tiny" style={{ marginLeft: 10, background: 'var(--blue-100)', color: 'var(--blue)' }}><I.settings size={11} /> {firm.short} · Enterprise</span>
        <div className="subbar-spacer" />
        <span className="tiny muted row ac gap6" style={{ marginRight: 10 }}><I.check size={12} style={{ color: 'var(--green)' }} /> Tersimpan otomatis</span>
        <Btn sm onClick={() => { setSettings(SETTINGS_DEFAULTS); amsApplyPrefs(SETTINGS_DEFAULTS); flash('Pengaturan dikembalikan ke default'); }}><I.sync size={13} /> Reset Default</Btn>
      </div>

      <div className="view-scroll"><div className="view-pad">
        <div className="grid" style={{ gridTemplateColumns: '232px 1fr', gap: 14, alignItems: 'start' }}>
          {/* left nav */}
          <div className="panel" style={{ padding: 6, position: 'sticky', top: 0 }}>
            {SECTIONS.map(sec => {
              const on = section === sec.id;
              return (
                <div key={sec.id} onClick={() => setSection(sec.id)}
                  className="row ac gap10" style={{ padding: '9px 10px', borderRadius: 8, cursor: 'pointer', background: on ? 'var(--blue-050)' : 'transparent', marginBottom: 2 }}>
                  <span style={{ width: 30, height: 30, borderRadius: 8, flex: '0 0 30px', display: 'grid', placeItems: 'center', background: on ? 'var(--blue)' : 'var(--surface-3)', color: on ? '#fff' : 'var(--ink-3)' }}>{React.createElement(I[sec.icon], { size: 15 })}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: on ? 700 : 600, color: on ? 'var(--blue)' : 'var(--ink)' }}>{sec.label}</div>
                    <div className="tiny muted truncate">{sec.sub}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* content */}
          <div style={{ minWidth: 0, display: 'grid', gap: 12 }}>
            {section === 'tampilan' && <SecTampilan s={s} setTop={setTop} />}
            {section === 'navigasi' && <SecNavigasi s={s} setGroup={setGroup} />}
            {section === 'profil' && <SecProfil auth={auth} flash={flash} />}
            {section === 'notif' && <SecNotif s={s} setGroup={setGroup} />}
            {section === 'keamanan' && <SecKeamanan s={s} setGroup={setGroup} flash={flash} />}
            {section === 'firma' && <SecFirma s={s} setGroup={setGroup} firm={firm} isPartner={isPartner} />}
            {section === 'lokalisasi' && <SecLokalisasi s={s} setGroup={setGroup} />}
            {section === 'integrasi' && <SecIntegrasi nav={nav} />}
            {section === 'ai' && <SecAI s={s} setGroup={setGroup} flash={flash} />}
            {section === 'akses' && <SecAkses auth={auth} />}
          </div>
        </div>
      </div></div>

      {toast && (
        <div style={{ position: 'fixed', bottom: 84, left: '50%', transform: 'translateX(-50%)', zIndex: 95, background: 'var(--navy)', color: '#fff', padding: '10px 16px', borderRadius: 8, fontSize: 12.5, fontWeight: 600, boxShadow: 'var(--shadow-lg)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <I.checkCircle size={15} style={{ color: '#5fd08a' }} /> {toast}
        </div>
      )}
    </>
  );
}

/* ---------------- Tampilan ---------------- */
function SecTampilan({ s, setTop }: any) {
  const [dark, setDark] = useStateSet(() => localStorage.getItem('ams.dark') === '1');
  const [dense, setDense] = useStateSet(() => localStorage.getItem('ams.dense') === '1');
  const [collapsed, setCollapsed] = useStateSet(() => localStorage.getItem('ams.sidebarCollapsed') === '1');
  useEffectSet(() => { document.body.classList.toggle('dark', dark); localStorage.setItem('ams.dark', dark ? '1' : '0'); }, [dark]);
  useEffectSet(() => { document.body.classList.toggle('dense', dense); localStorage.setItem('ams.dense', dense ? '1' : '0'); }, [dense]);
  const setSidebar = (v) => { setCollapsed(v); localStorage.setItem('ams.sidebarCollapsed', v ? '1' : '0'); if (window.__amsSetSidebar) window.__amsSetSidebar(v); };

  return (
    <>
      <Panel noBody>
        <div className="panel-h"><h3>Tema & Kepadatan</h3></div>
        <SRow title="Mode Gelap" sub="Tema gelap untuk lingkungan kerja minim cahaya.">
          <Seg options={[{ value: false, label: 'Terang' }, { value: true, label: 'Gelap' }]} value={dark} onChange={setDark} />
        </SRow>
        <SRow title="Kepadatan Antarmuka" sub="Padat memperkecil tinggi baris & padding untuk tabel besar.">
          <Seg options={[{ value: false, label: 'Nyaman' }, { value: true, label: 'Padat' }]} value={dense} onChange={setDense} />
        </SRow>
        <SRow title="Sidebar Default" sub="Status awal panel navigasi saat aplikasi dibuka." last>
          <Seg options={[{ value: false, label: 'Diperluas' }, { value: true, label: 'Diciutkan' }]} value={collapsed} onChange={setSidebar} />
        </SRow>
      </Panel>

      <Panel noBody>
        <div className="panel-h"><h3>Warna Aksen</h3></div>
        <div style={{ padding: 14 }}>
          <div className="row wrap gap10">
            {Object.entries(SETTINGS_ACCENTS).map(([id, a]) => {
              const on = s.accent === id;
              return (
                <button key={id} onClick={() => setTop('accent', id)}
                  className="row ac gap8" style={{ padding: '8px 12px', borderRadius: 9, cursor: 'pointer', border: '1.5px solid ' + (on ? a.swatch : 'var(--line)'), background: on ? 'var(--surface-2)' : 'var(--surface)' }}>
                  <span style={{ width: 20, height: 20, borderRadius: 6, background: a.swatch, boxShadow: on ? '0 0 0 2px #fff inset' : 'none' }} />
                  <span style={{ fontSize: 12.5, fontWeight: on ? 700 : 600 }}>{a.label}</span>
                  {on && <I.check size={14} style={{ color: a.swatch }} />}
                </button>
              );
            })}
          </div>
          <div className="tiny muted" style={{ marginTop: 10 }}>Warna aksen diterapkan ke tombol, tautan, dan elemen aktif di seluruh aplikasi.</div>
        </div>
      </Panel>

      <Panel noBody>
        <div className="panel-h"><h3>Aksesibilitas</h3></div>
        <SRow title="Kurangi Animasi" sub="Menonaktifkan transisi & animasi untuk kenyamanan visual." last>
          <SetToggle on={s.reduceMotion} set={v => setTop('reduceMotion', v)} />
        </SRow>
      </Panel>
    </>
  );
}

/* ---------------- Navigasi & Sidebar (sidebar adaptif) ---------------- */
function SecNavigasi({ s, setGroup }: any) {
  const n = s.nav;
  const set = (k, v) => setGroup('nav', k, v);
  const off = !n.adaptive;
  const dim = { opacity: off ? 0.45 : 1, pointerEvents: off ? 'none' : 'auto' };
  return (
    <>
      <Panel noBody>
        <div className="panel-h"><h3>Sidebar Adaptif</h3></div>
        <SRow title="Aktifkan sidebar adaptif" sub="Sidebar menyesuaikan urutan & penekanan modul dengan fase audit yang sedang berjalan. Saat dimatikan, sidebar kembali ke perilaku standar (semua grup setara).">
          <SetToggle on={n.adaptive} set={v => set('adaptive', v)} />
        </SRow>
        <div style={dim}>
          <SRow title="Mode penyesuaian" sub="Sorot — semua modul tetap tampil, yang tak relevan diredupkan. Ringkas — grup fase lain disembunyikan demi fokus maksimal.">
            <Seg options={[{ value: 'sorot', label: 'Sorot' }, { value: 'ringkas', label: 'Ringkas' }]} value={n.mode} onChange={v => set('mode', v)} />
          </SRow>
          <SRow title="Sumber fase aktif" sub="Otomatis membaca fase dari engagement aktif, atau pilih manual untuk mengunci fokus." last={n.source !== 'manual'}>
            <SSelect value={n.source === 'manual' ? 'Manual' : 'Otomatis dari engagement'} onChange={v => set('source', v === 'Manual' ? 'manual' : 'auto')} options={['Otomatis dari engagement', 'Manual']} w={210} />
          </SRow>
          {n.source === 'manual' && (
            <SRow title="Fase manual" sub="Fokus dikunci ke fase ini, terlepas dari status engagement aktif." last>
              <SSelect value={n.manualPhase} onChange={v => set('manualPhase', v)} options={['Perencanaan', 'Eksekusi', 'Finalisasi']} w={170} />
            </SRow>
          )}
        </div>
      </Panel>

      <div style={dim}>
        <Panel noBody>
          <div className="panel-h"><h3>Komponen Tersemat</h3></div>
          <SRow title="Grup “Fokus Fase”" sub="Mengangkat modul paling relevan untuk fase aktif ke puncak sidebar dalam satu grup tersorot.">
            <SetToggle on={n.focusGroup} set={v => set('focusGroup', v)} />
          </SRow>
          <SRow title="Kartu “Lanjutkan”" sub="Jalan cepat kembali ke modul yang terakhir dibuka.">
            <SetToggle on={n.resumeCard} set={v => set('resumeCard', v)} />
          </SRow>
          <SRow title="Jumlah item “Lanjutkan”" sub="Berapa modul terakhir yang ditampilkan.">
            <Seg options={[{ value: 2, label: '2' }, { value: 3, label: '3' }, { value: 5, label: '5' }]} value={n.resumeCount} onChange={v => set('resumeCount', v)} />
          </SRow>
          <SRow title="Tandai fase selesai" sub="Beri centang pada modul dari fase yang sudah rampung di pohon penuh." last>
            <SetToggle on={n.markDone} set={v => set('markDone', v)} />
          </SRow>
        </Panel>
      </div>

      <div className="panel" style={{ padding: '11px 14px', display: 'flex', gap: 10, alignItems: 'flex-start', background: 'var(--blue-050)', borderColor: 'transparent' }}>
        <span style={{ color: 'var(--blue)', flex: '0 0 auto', marginTop: 1 }}><I.shield size={16} /></span>
        <div className="tiny" style={{ lineHeight: 1.5, color: 'var(--ink-2)' }}>
          <b>Preferensi per-pengguna.</b> Tersimpan di profil Anda &amp; tidak memengaruhi rekan tim. Murni lapisan tampilan — tidak menyentuh data, perhitungan, atau hak akses. Hanya berlaku di ruang kerja <b>Perikatan</b> saat sidebar diperluas.
        </div>
      </div>
    </>
  );
}

/* ---------------- Profil & Akun ---------------- */
/* Hoisted out of SecProfil so inputs don't lose focus on every keystroke (stable identity). */
function ProfileField({ label, val, onChange, type = 'text', readOnly, hint, mono }: any) {
  return (
    <div className="field">
      <label>{label}</label>
      <input className={'input' + (mono ? ' mono' : '')} type={type} value={val || ''} readOnly={readOnly}
        onChange={readOnly ? undefined : (e => onChange(e.target.value))}
        style={{ height: 32, background: readOnly ? 'var(--surface-2)' : undefined, color: readOnly ? 'var(--ink-2)' : undefined, cursor: readOnly ? 'default' : undefined }} />
      {hint && <div className="tiny muted" style={{ marginTop: 3, lineHeight: 1.4 }}>{hint}</div>}
    </div>
  );
}
/* read an image file, downscale to <=max px, return a JPEG data URL (keeps localStorage small) */
function readAvatarFile(file, max, cb) {
  if (!file || !/^image\//.test(file.type)) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      cv.getContext('2d').drawImage(img, 0, 0, w, h);
      try { cb(cv.toDataURL('image/jpeg', 0.85)); } catch (err) { cb(e.target.result); }
    };
    img.onerror = () => cb(e.target.result);
    img.src = e.target.result as string;
  };
  reader.readAsDataURL(file);
}
function CredRow({ icon, label, value, mono }: any) {
  return (
    <div className="row ac gap10" style={{ padding: '10px 0', borderBottom: '1px solid var(--line-soft)' }}>
      <span style={{ width: 28, height: 28, borderRadius: 7, flex: '0 0 28px', display: 'grid', placeItems: 'center', background: 'var(--blue-050)', color: 'var(--blue)' }}>{React.createElement(I[icon] || I.panel, { size: 14 })}</span>
      <div className="tiny muted" style={{ flex: '0 0 152px' }}>{label}</div>
      <div style={{ flex: 1, fontSize: 12.5, fontWeight: 600, fontFamily: mono ? 'var(--mono)' : undefined }}>{value}</div>
    </div>
  );
}
function SecProfil({ auth, flash }: any) {
  const u = auth.user;
  const up = auth.updateProfile;
  const fileRef = React.useRef(null);
  const [drag, setDrag] = useStateSet(false);
  const onFile = (file) => readAvatarFile(file, 256, (data) => { up({ photo: data }); flash('Foto profil diperbarui'); });
  const today = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  const cpeTarget = u.cpeTarget || 40;
  const cpePct = Math.max(0, Math.min(100, Math.round(((u.cpeHours || 0) / cpeTarget) * 100)));
  const cpeOk = (u.cpeHours || 0) >= cpeTarget;

  return (
    <>
      <Panel noBody>
        <div className="panel-h"><h3>Profil Pengguna</h3><div style={{ flex: 1 }} /><span className="tiny muted row ac gap6"><I.check size={12} style={{ color: 'var(--green)' }} /> Sumber kebenaran tunggal identitas</span></div>
        <div style={{ padding: 16 }}>
          <div className="row gap16" style={{ marginBottom: 18, alignItems: 'flex-start' }}>
            {/* avatar + dropzone */}
            <div style={{ flex: '0 0 auto', textAlign: 'center' }}>
              <div
                onClick={() => fileRef.current && fileRef.current.click()}
                onDragOver={e => { e.preventDefault(); setDrag(true); }}
                onDragLeave={() => setDrag(false)}
                onDrop={e => { e.preventDefault(); setDrag(false); onFile(e.dataTransfer.files && e.dataTransfer.files[0]); }}
                title="Klik atau seret gambar untuk mengganti foto"
                style={{ position: 'relative', width: 92, height: 92, borderRadius: '50%', cursor: 'pointer', display: 'grid', placeItems: 'center', outline: drag ? '2px dashed var(--blue)' : 'none', outlineOffset: 3 }}>
                <Avatar name={u.name} size={92} photo={u.photo} />
                <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', display: 'grid', placeItems: 'center', background: drag ? 'rgba(0,80,133,.45)' : 'rgba(15,23,42,0)', color: '#fff', opacity: drag ? 1 : 0, transition: '.15s' }} className="avatar-overlay"><I.upload size={20} /></span>
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { onFile(e.target.files && e.target.files[0]); e.target.value = ''; }} />
              <div className="row jc gap6" style={{ marginTop: 10 }}>
                <Btn sm onClick={() => fileRef.current && fileRef.current.click()}><I.upload size={12} /> Unggah</Btn>
                {u.photo && <Btn sm onClick={() => { up({ photo: null }); flash('Foto dihapus'); }}><I.trash size={12} /> Hapus</Btn>}
              </div>
              <div className="tiny muted" style={{ marginTop: 6, maxWidth: 96, lineHeight: 1.35 }}>JPG/PNG, otomatis dipangkas 256px</div>
            </div>

            {/* identity summary + role chips */}
            <div style={{ flex: 1, minWidth: 0, paddingTop: 4 }}>
              <div style={{ fontSize: 17, fontWeight: 700 }}>{u.name}</div>
              <div className="tiny muted" style={{ marginTop: 1 }}>{u.title} · {auth.firm.name}</div>
              <div className="row wrap gap6" style={{ marginTop: 10 }}>
                <span className="chip tiny" style={{ background: 'var(--blue-050)', color: 'var(--blue)' }}><I.shield size={11} /> {auth.role}</span>
                <span className="chip tiny" style={{ background: 'var(--surface-3)', color: 'var(--ink-2)' }}><I.briefcase size={11} /> {u.department}</span>
                <span className="chip tiny" style={{ background: 'var(--surface-3)', color: 'var(--ink-2)' }} title="Nomor Register Akuntan Publik"><I.report size={11} /> {u.apNumber}</span>
              </div>
            </div>
          </div>

          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <ProfileField label="Nama Lengkap" val={u.name} onChange={v => up({ name: v })} />
            <ProfileField label="Jabatan (Job Title)" val={u.title} onChange={v => up({ title: v })} hint="Gelar fungsional di firma — terpisah dari Peran/RBAC." />
            <ProfileField label="Email Kerja" type="email" val={u.email} onChange={v => up({ email: v })} />
            <ProfileField label="Telepon" val={u.phone} onChange={v => up({ phone: v })} />
            <ProfileField label="Departemen / Lini Jasa" val={u.department} onChange={v => up({ department: v })} />
            <ProfileField label="Kantor" val={u.office} onChange={v => up({ office: v })} />
            <ProfileField label="ID Karyawan" val={u.employeeId} readOnly mono hint="Dikelola HR — hanya-baca." />
            <ProfileField label="Bahasa" val={u.languages} onChange={v => up({ languages: v })} />
          </div>
          <div className="row je ac gap10" style={{ marginTop: 14 }}>
            <span className="tiny muted row ac gap6"><I.sync size={12} /> Perubahan tersimpan & berlaku di seluruh aplikasi seketika</span>
            <Btn sm variant="primary" onClick={() => flash('Profil tersimpan')}><I.check size={13} /> Simpan Profil</Btn>
          </div>
        </div>
      </Panel>

      <Panel noBody>
        <div className="panel-h"><h3>Kredensial Profesi & Registrasi</h3><div style={{ flex: 1 }} /><Badge kind="green">Terverifikasi</Badge></div>
        <div style={{ padding: '4px 16px 14px' }}>
          <CredRow icon="report" label="No. Register AP" value={u.apNumber} mono />
          <CredRow icon="shield" label="STAN" value={u.stan} mono />
          <CredRow icon="users" label="Keanggotaan IAPI" value={u.iapiNumber} mono />
          <CredRow icon="check" label="Bersertifikat CPA sejak" value={u.cpaSince} />
          <CredRow icon="calendar" label="Bergabung" value={u.joinDate} />
          <div className="row ac gap10" style={{ padding: '10px 0' }}>
            <span style={{ width: 28, height: 28, borderRadius: 7, flex: '0 0 28px', display: 'grid', placeItems: 'center', background: 'var(--blue-050)', color: 'var(--blue)' }}><I.users size={14} /></span>
            <div className="tiny muted" style={{ flex: '0 0 152px' }}>Atasan Langsung</div>
            <div style={{ flex: 1, fontSize: 12.5, fontWeight: 600 }}>{u.reportsTo}</div>
          </div>
        </div>
        {/* CPE / PPL progress */}
        <div style={{ padding: '0 16px 16px' }}>
          <div className="panel" style={{ padding: 14, background: 'var(--surface-2)', borderColor: 'transparent' }}>
            <div className="row ac jb" style={{ marginBottom: 8 }}>
              <div className="row ac gap8"><I.calendar size={14} style={{ color: 'var(--blue)' }} /><span style={{ fontSize: 12.5, fontWeight: 700 }}>CPE / PPL — Tahun Berjalan</span></div>
              <span className="tiny" style={{ fontWeight: 700, color: cpeOk ? 'var(--green)' : 'var(--amber)' }}>{u.cpeHours || 0} / {cpeTarget} SKP</span>
            </div>
            <div style={{ height: 8, borderRadius: 5, background: 'var(--line)', overflow: 'hidden' }}>
              <div style={{ width: cpePct + '%', height: '100%', borderRadius: 5, background: cpeOk ? 'var(--green)' : 'var(--blue)', transition: 'width .4s' }} />
            </div>
            <div className="tiny muted" style={{ marginTop: 7 }}>{cpeOk ? 'Kewajiban PPL minimal terpenuhi.' : ((cpeTarget - (u.cpeHours || 0)) + ' SKP lagi untuk memenuhi minimum PPL tahunan (PMK & IAPI).')}</div>
          </div>
        </div>
      </Panel>

      <Panel noBody>
        <div className="panel-h"><h3>Peran & Tanda Tangan</h3></div>
        <SRow title="Peran Aktif (RBAC)" sub="Ditentukan oleh sesi login Anda — tak dapat diubah sendiri. Menentukan hak persetujuan, sign-off, dan akses modul (ditegakkan di server).">
          <span className="chip" style={{ background: 'var(--blue-050)', color: 'var(--blue)', fontWeight: 700, height: 30, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0 12px' }}><I.shield size={12} /> {auth.role}</span>
        </SRow>
        <SRow title="Inisial Tanda Tangan" sub="Dipakai pada sign-off kertas kerja & tickmark." last>
          <input className="input" value={u.initials} onChange={e => up({ initials: e.target.value.toUpperCase().slice(0, 3) })} style={{ width: 80, height: 30, textAlign: 'center', fontWeight: 700, letterSpacing: '.05em' }} />
        </SRow>
        <div style={{ padding: '0 16px 16px' }}>
          <div className="tiny muted upper" style={{ margin: '4px 0 8px', letterSpacing: '.05em' }}>Pratinjau Sign-off</div>
          <div className="row ac gap12" style={{ padding: 12, border: '1px dashed var(--line-strong)', borderRadius: 10, background: 'var(--surface-2)', maxWidth: 360 }}>
            <span style={{ width: 42, height: 42, borderRadius: 8, flex: '0 0 42px', display: 'grid', placeItems: 'center', background: 'var(--green)', color: '#fff', fontWeight: 800, letterSpacing: '.04em', fontSize: 15 }}>{u.initials}</span>
            <div style={{ minWidth: 0 }}>
              <div className="row ac gap6" style={{ fontSize: 12.5, fontWeight: 700 }}><I.checkCircle size={14} style={{ color: 'var(--green)' }} /> Direview oleh {u.name.split(' ')[0]}</div>
              <div className="tiny muted">{auth.role} · {u.initials} · {today}</div>
            </div>
          </div>
        </div>
      </Panel>
    </>
  );
}

/* ---------------- Notifikasi ---------------- */
function SecNotif({ s, setGroup }: any) {
  const n = s.notif;
  const cats = [
    ['reviewNotes', 'Catatan Review', 'Saat ada catatan baru atau ditugaskan ke Anda'],
    ['deadlines', 'Tenggat & Jadwal', 'Pengingat tenggat fieldwork, opini, & arsip'],
    ['approvals', 'Persetujuan', 'Permintaan persetujuan menunggu tindakan Anda'],
    ['eqr', 'EQR & Mutu', 'Status telaah pengendalian mutu perikatan'],
    ['mentions', 'Sebutan (@)', 'Saat Anda disebut dalam komentar atau memo'],
  ];
  return (
    <>
      <Panel noBody>
        <div className="panel-h"><h3>Saluran Notifikasi</h3></div>
        <SRow title="Email" sub="Kirim notifikasi ke alamat email kerja.">
          <SetToggle on={n.email} set={v => setGroup('notif', 'email', v)} />
        </SRow>
        <SRow title="Dalam Aplikasi" sub="Lonceng notifikasi & panel aktivitas.">
          <SetToggle on={n.app} set={v => setGroup('notif', 'app', v)} />
        </SRow>
        <SRow title="Push (Mobile)" sub="Notifikasi dorong ke aplikasi seluler Asseris." last>
          <SetToggle on={n.push} set={v => setGroup('notif', 'push', v)} />
        </SRow>
      </Panel>

      <Panel noBody>
        <div className="panel-h"><h3>Kategori</h3></div>
        {cats.map(([key, label, sub], i) => (
          <SRow key={key} title={label} sub={sub} last={i === cats.length - 1}>
            <SetToggle on={n[key]} set={v => setGroup('notif', key, v)} />
          </SRow>
        ))}
      </Panel>

      <Panel noBody>
        <div className="panel-h"><h3>Ringkasan & Waktu Tenang</h3></div>
        <SRow title="Frekuensi Ringkasan" sub="Email rangkuman aktivitas perikatan.">
          <SSelect value={n.digest} onChange={v => setGroup('notif', 'digest', v)} options={['Real-time', 'Harian', 'Mingguan', 'Nonaktif']} w={160} />
        </SRow>
        <SRow title="Waktu Tenang (Quiet Hours)" sub="Hentikan notifikasi non-kritis pada rentang waktu ini." last>
          <div className="row ac gap6">
            <input className="input mono" type="time" value={n.quietStart} onChange={e => setGroup('notif', 'quietStart', e.target.value)} style={{ width: 110, height: 30 }} />
            <span className="muted tiny">s/d</span>
            <input className="input mono" type="time" value={n.quietEnd} onChange={e => setGroup('notif', 'quietEnd', e.target.value)} style={{ width: 110, height: 30 }} />
          </div>
        </SRow>
      </Panel>
    </>
  );
}

/* ---------------- Keamanan ---------------- */
const AUTH_EVENT_LABEL = {
  LOGIN: 'Masuk', LOGIN_FAIL: 'Gagal masuk', LOGOUT: 'Keluar',
  PASSWORD_CHANGE: 'Ubah kata sandi', TOTP_ENROLL: 'Pendaftaran 2FA',
  TOTP_VERIFY: 'Aktivasi 2FA', LOCKOUT: 'Akun terkunci',
};
function fmtWhen(ts) {
  try { return new Date(ts).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); }
  catch (e) { return String(ts); }
}

function SecKeamanan({ s, setGroup, flash }: any) {
  const auth = useAuth();
  const sec = s.security;

  // Real 2FA enrolment flow (server: enrollTotp → verifyTotp).
  const [totpOn, setTotpOn] = useStateSet(!!auth.twoFactorEnabled);
  const [enroll, setEnroll] = useStateSet(null); // { secret, otpauthUrl }
  const [otp, setOtp] = useStateSet('');
  const [busy2fa, setBusy2fa] = useStateSet(false);
  // Real password change (server: changePassword).
  const [pw, setPw] = useStateSet({ old: '', n1: '', n2: '' });
  const [pwErr, setPwErr] = useStateSet('');
  const [pwBusy, setPwBusy] = useStateSet(false);
  // Real sessions + auth audit events.
  const [sessions, setSessions] = useStateSet([]);
  const [events, setEvents] = useStateSet([]);

  const refresh = React.useCallback(() => {
    (api as any).auth.sessions.query().then(setSessions).catch(() => {});
    (api as any).auth.events.query().then(setEvents).catch(() => {});
  }, []);
  useEffectSet(() => { refresh(); }, [refresh]);

  async function startEnroll() {
    setBusy2fa(true);
    try { setEnroll(await (api as any).auth.enrollTotp.mutate()); }
    catch (e) { flash('Gagal memulai 2FA'); }
    finally { setBusy2fa(false); }
  }
  async function confirmEnroll() {
    setBusy2fa(true);
    try { await (api as any).auth.verifyTotp.mutate({ token: otp.trim() }); setTotpOn(true); setEnroll(null); setOtp(''); flash('2FA diaktifkan'); refresh(); }
    catch (e) { flash('Kode 2FA salah'); }
    finally { setBusy2fa(false); }
  }
  async function changePw() {
    setPwErr('');
    if (pw.n1.length < 12) { setPwErr('Sandi baru minimal 12 karakter.'); return; }
    if (pw.n1 !== pw.n2) { setPwErr('Konfirmasi sandi tidak cocok.'); return; }
    setPwBusy(true);
    try { await (api as any).auth.changePassword.mutate({ oldPassword: pw.old, newPassword: pw.n1 }); setPw({ old: '', n1: '', n2: '' }); flash('Kata sandi diperbarui'); refresh(); }
    catch (e) { setPwErr('Sandi saat ini salah.'); }
    finally { setPwBusy(false); }
  }
  async function revokeOthers() {
    try { const r = await (api as any).auth.revokeOtherSessions.mutate(); flash(r.revoked ? (r.revoked + ' sesi lain dikeluarkan') : 'Tidak ada sesi lain'); refresh(); }
    catch (e) {}
  }

  return (
    <>
      <Panel noBody>
        <div className="panel-h"><h3>Autentikasi</h3></div>
        <SRow title="Autentikasi Dua Faktor (2FA)" sub="Berbasis TOTP (Google Authenticator, Authy, 1Password). Wajib untuk akses kertas kerja emiten (PIE).">
          {totpOn
            ? <Badge kind="green"><I.check size={11} /> Aktif</Badge>
            : (enroll
              ? <span className="tiny muted">Lihat di bawah</span>
              : <Btn sm variant="primary" onClick={startEnroll} disabled={busy2fa}><I.shield size={12} /> Aktifkan</Btn>)}
        </SRow>
        {!totpOn && enroll && (
          <div style={{ padding: '4px 14px 14px', display: 'grid', gap: 8, maxWidth: 460 }}>
            <div className="tiny muted">Tambahkan ke aplikasi authenticator (masukkan kunci ini), lalu masukkan kode 6 digit untuk mengaktifkan:</div>
            <div className="mono" style={{ padding: '8px 10px', background: 'var(--surface-2)', borderRadius: 7, fontSize: 12.5, wordBreak: 'break-all', userSelect: 'all' }}>{enroll.secret}</div>
            <div className="row ac gap8">
              <input className="input mono" inputMode="numeric" maxLength={6} value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))} placeholder="123456" style={{ width: 120, height: 32, letterSpacing: 3 }} />
              <Btn sm variant="primary" onClick={confirmEnroll} disabled={busy2fa || otp.length < 6}><I.check size={12} /> Verifikasi & Aktifkan</Btn>
              <Btn sm onClick={() => { setEnroll(null); setOtp(''); }}>Batal</Btn>
            </div>
          </div>
        )}
        <SRow title="Batas Waktu Sesi" sub="Berlaku di server (SESSION_TTL_HOURS); pilihan ini bersifat preferensi tampilan.">
          <SSelect value={sec.sessionTimeout} onChange={v => setGroup('security', 'sessionTimeout', v)} options={['15 menit', '30 menit', '1 jam', '4 jam']} w={140} />
        </SRow>
        <SRow title="Peringatan Login" sub="Email saat ada login dari perangkat/lokasi baru (rencana W10).">
          <SetToggle on={sec.loginAlerts} set={v => setGroup('security', 'loginAlerts', v)} />
        </SRow>
        <SRow title="Daftar Izin IP Kantor" sub="Batasi akses hanya dari jaringan kantor terdaftar (rencana W10)." last>
          <SetToggle on={sec.ipAllowlist} set={v => setGroup('security', 'ipAllowlist', v)} />
        </SRow>
      </Panel>

      <Panel noBody>
        <div className="panel-h"><h3>Ubah Kata Sandi</h3></div>
        <div style={{ padding: 14, display: 'grid', gap: 10, maxWidth: 420 }}>
          {pwErr && <div className="tiny" style={{ color: 'var(--red)', background: 'var(--red-bg, #fde8e8)', padding: '7px 10px', borderRadius: 7 }}>{pwErr}</div>}
          <div className="field"><label>Sandi Saat Ini</label><input className="input" type="password" autoComplete="current-password" value={pw.old} onChange={e => setPw(p => ({ ...p, old: e.target.value }))} placeholder="••••••••" style={{ height: 32 }} /></div>
          <div className="field"><label>Sandi Baru</label><input className="input" type="password" autoComplete="new-password" value={pw.n1} onChange={e => setPw(p => ({ ...p, n1: e.target.value }))} placeholder="Min. 12 karakter" style={{ height: 32 }} /></div>
          <div className="field"><label>Konfirmasi Sandi Baru</label><input className="input" type="password" autoComplete="new-password" value={pw.n2} onChange={e => setPw(p => ({ ...p, n2: e.target.value }))} style={{ height: 32 }} /></div>
          <div className="row je"><Btn sm variant="primary" onClick={changePw} disabled={pwBusy || !pw.old || !pw.n1}><I.lock size={13} /> Perbarui Sandi</Btn></div>
        </div>
      </Panel>

      <Panel noBody>
        <div className="panel-h"><h3>Sesi Aktif</h3><div style={{ flex: 1 }} /><Btn sm onClick={revokeOthers} disabled={sessions.length < 2}>Keluarkan Sesi Lain</Btn></div>
        <table className="dtbl">
          <thead><tr><th>Perangkat (User-Agent)</th><th>Alamat IP</th><th>Aktivitas Terakhir</th><th style={{ width: 90 }}></th></tr></thead>
          <tbody>
            {sessions.length === 0 && <tr><td colSpan={4} className="tiny muted" style={{ padding: 14 }}>Tidak ada sesi aktif.</td></tr>}
            {sessions.map((ss) => (
              <tr key={ss.id}>
                <td style={{ fontWeight: 600, maxWidth: 280 }} className="truncate" title={ss.userAgent || ''}>{ss.userAgent || 'Tidak diketahui'}</td>
                <td className="mono tiny muted">{ss.ip || '—'}</td>
                <td className="tiny muted">{fmtWhen(ss.lastSeenAt)}</td>
                <td>{ss.current ? <Badge kind="green">Sesi ini</Badge> : <span className="tiny muted">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel noBody>
        <div className="panel-h"><h3>Aktivitas Autentikasi</h3><div style={{ flex: 1 }} /><span className="tiny muted">Jejak nyata — bukan data contoh</span></div>
        <table className="dtbl">
          <thead><tr><th>Peristiwa</th><th>Alamat IP</th><th>Waktu</th></tr></thead>
          <tbody>
            {events.length === 0 && <tr><td colSpan={3} className="tiny muted" style={{ padding: 14 }}>Belum ada aktivitas.</td></tr>}
            {events.map((e, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 600 }}>{AUTH_EVENT_LABEL[e.kind] || e.kind}{e.detail ? <span className="tiny muted"> · {e.detail}</span> : null}</td>
                <td className="mono tiny muted">{e.ip || '—'}</td>
                <td className="tiny muted">{fmtWhen(e.ts)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </>
  );
}

/* ---------------- Firma & Standar ---------------- */
function SecFirma({ s, setGroup, firm, isPartner }: any) {
  const f = s.firm;
  return (
    <>
      {!isPartner && (
        <div className="panel" style={{ padding: '10px 14px', background: 'var(--amber-bg)', borderColor: 'transparent', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: 'var(--amber)' }}><I.lock size={16} /></span>
          <span style={{ fontSize: 12.5, fontWeight: 600 }}>Hanya <b>Engagement Partner</b> / Admin yang dapat mengubah default metodologi firma. Mode tampilan saja.</span>
        </div>
      )}
      <Panel noBody>
        <div className="panel-h"><h3>Identitas Firma</h3></div>
        <div style={{ padding: 14 }}>
          <div className="row ac gap12" style={{ marginBottom: 12 }}>
            <span style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--navy)', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 15 }}>{firm.short}</span>
            <div><div style={{ fontWeight: 700, fontSize: 14 }}>{firm.name}</div><div className="tiny muted mono">{firm.license}</div></div>
          </div>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
            <div className="panel" style={{ padding: '9px 12px' }}><Stat value={firm.partners} label="Rekan (Partner)" /></div>
            <div className="panel" style={{ padding: '9px 12px' }}><Stat value={firm.managers} label="Manajer" /></div>
            <div className="panel" style={{ padding: '9px 12px' }}><Stat value={firm.staff} label="Staf" /></div>
          </div>
        </div>
      </Panel>

      <Panel noBody>
        <div className="panel-h"><h3>Default Metodologi & Perikatan</h3></div>
        <SRow title="Standar Audit Default" sub="Standar yang diterapkan untuk perikatan baru.">
          <SSelect value={f.defaultStandard} onChange={v => isPartner && setGroup('firm', 'defaultStandard', v)} options={['SA (ISA-converged)', 'SA + PSAK 71', 'SA + PSAK 73', 'SPR 2400']} w={210} />
        </SRow>
        <SRow title="Akhir Tahun Buku" sub="Tanggal pelaporan keuangan default klien.">
          <SSelect value={f.fiscalYearEnd} onChange={v => isPartner && setGroup('firm', 'fiscalYearEnd', v)} options={['31 Desember', '31 Maret', '30 Juni', '30 September']} w={160} />
        </SRow>
        <SRow title="Benchmark Materialitas" sub="Dasar perhitungan overall materiality.">
          <SSelect value={f.materialityBenchmark} onChange={v => isPartner && setGroup('firm', 'materialityBenchmark', v)} options={['5% Laba Sebelum Pajak', '0,5% Pendapatan', '1% Total Aset', '1% Ekuitas']} w={210} />
        </SRow>
        <SRow title="Ambang EQR Wajib" sub="Kriteria perikatan yang memerlukan telaah mutu.">
          <SSelect value={f.eqrThreshold} onChange={v => isPartner && setGroup('firm', 'eqrThreshold', v)} options={['Semua PIE', 'PIE + Risiko Tinggi', 'Berbasis Risiko', 'Manual']} w={190} />
        </SRow>
        <SRow title="Periode Retensi Arsip" sub="Lama penyimpanan kertas kerja final.">
          <SSelect value={f.retentionYears} onChange={v => isPartner && setGroup('firm', 'retentionYears', v)} options={['5 tahun', '10 tahun', '15 tahun']} w={130} />
        </SRow>
        <SRow title="Jendela Perakitan Arsip" sub="Batas perakitan file final setelah tanggal laporan (SA 230)." last>
          <SSelect value={f.archiveWindow} onChange={v => isPartner && setGroup('firm', 'archiveWindow', v)} options={['45 hari', '60 hari (SA 230)', '90 hari']} w={170} />
        </SRow>
      </Panel>
    </>
  );
}

/* ---------------- Lokalisasi ---------------- */
function SecLokalisasi({ s, setGroup }: any) {
  const l = s.locale;
  return (
    <Panel noBody>
      <div className="panel-h"><h3>Bahasa & Format Regional</h3></div>
      <SRow title="Bahasa" sub="Bahasa antarmuka aplikasi.">
        <SSelect value={l.language} onChange={v => setGroup('locale', 'language', v)} options={['Bahasa Indonesia', 'English']} w={180} />
      </SRow>
      <SRow title="Format Tanggal">
        <SSelect value={l.dateFormat} onChange={v => setGroup('locale', 'dateFormat', v)} options={['DD/MM/YYYY', 'DD-MM-YYYY', 'YYYY-MM-DD', 'D MMMM YYYY']} w={170} />
      </SRow>
      <SRow title="Format Angka" sub="Pemisah ribuan & desimal.">
        <SSelect value={l.numberFormat} onChange={v => setGroup('locale', 'numberFormat', v)} options={['1.234.567,89', '1,234,567.89', '1 234 567,89']} w={170} />
      </SRow>
      <SRow title="Mata Uang Pelaporan">
        <SSelect value={l.currency} onChange={v => setGroup('locale', 'currency', v)} options={['IDR (Rp)', 'USD ($)', 'SGD (S$)', 'EUR (€)']} w={150} />
      </SRow>
      <SRow title="Zona Waktu">
        <SSelect value={l.timezone} onChange={v => setGroup('locale', 'timezone', v)} options={['WIB (GMT+7)', 'WITA (GMT+8)', 'WIT (GMT+9)']} w={170} />
      </SRow>
      <SRow title="Hari Pertama Pekan" last>
        <Seg options={['Senin', 'Minggu']} value={l.firstDay} onChange={v => setGroup('locale', 'firstDay', v)} />
      </SRow>
    </Panel>
  );
}

/* ---------------- Integrasi ---------------- */
function SecIntegrasi({ nav }: any) {
  const conns = [
    { icon: 'report', name: 'e-Faktur & Coretax DJP', desc: 'Sinkronisasi faktur pajak & status SPT.', status: 'Terhubung', kind: 'green' },
    { icon: 'coins', name: 'Bank Feed (BCA, Mandiri)', desc: 'Tarik mutasi rekening untuk rekonsiliasi.', status: 'Terhubung', kind: 'green' },
    { icon: 'mail', name: 'Microsoft 365', desc: 'Email, kalender, & SSO Azure AD.', status: 'Terhubung', kind: 'green' },
    { icon: 'layers', name: 'DMS / SharePoint', desc: 'Penyimpanan dokumen & arsip kertas kerja.', status: 'Terhubung', kind: 'green' },
    { icon: 'sparkle', name: 'AI Co-pilot (LLM)', desc: 'Asisten analitis & penyusunan memo.', status: 'Terhubung', kind: 'green' },
    { icon: 'building', name: 'OJK / IDX e-Reporting', desc: 'Pelaporan emiten & data pasar.', status: 'Belum', kind: 'gray' },
  ];
  return (
    <Panel noBody>
      <div className="panel-h"><h3>Koneksi Sistem</h3><div style={{ flex: 1 }} /><Btn sm onClick={() => nav('integrations')}>Kelola di Integrations <I.arrowRight size={13} /></Btn></div>
      <div>
        {conns.map((c, i) => (
          <div key={i} className="row ac gap12" style={{ padding: '12px 14px', borderBottom: i < conns.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
            <span style={{ width: 34, height: 34, borderRadius: 8, flex: '0 0 34px', display: 'grid', placeItems: 'center', background: 'var(--blue-050)', color: 'var(--blue)' }}>{React.createElement(I[c.icon], { size: 17 })}</span>
            <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12.5, fontWeight: 600 }}>{c.name}</div><div className="tiny muted">{c.desc}</div></div>
            <Badge kind={c.kind}>{c.status}</Badge>
            <Btn sm>{c.status === 'Terhubung' ? 'Kelola' : 'Hubungkan'}</Btn>
          </div>
        ))}
      </div>
    </Panel>
  );
}

/* ---------------- Peran & Akses ---------------- */
const ROLE_CAPS = {
  'Engagement Partner': { sign: 'Final + EQR clear', approve: 'Semua', edit: 'Semua modul', admin: true },
  'Audit Manager':      { sign: 'Review (Manager)', approve: 'AJE, WP, Anggaran', edit: 'Engagement & WP', admin: false },
  'Senior Auditor':     { sign: 'Preparer + Self-review', approve: '—', edit: 'WP ditugaskan', admin: false },
  'Junior Auditor':     { sign: 'Preparer', approve: '—', edit: 'WP ditugaskan (terbatas)', admin: false },
};
const PERM_MATRIX = [
  ['Kertas Kerja & Lead Schedule', ['edit', 'edit', 'edit', 'edit']],
  ['Sign-off Reviewer / Partner', ['edit', 'edit', 'view', 'view']],
  ['Jurnal Penyesuaian (AJE)', ['edit', 'edit', 'edit', 'view']],
  ['Persetujuan & Opini', ['edit', 'view', 'none', 'none']],
  ['Keuangan Firma (ERP)', ['edit', 'view', 'none', 'none']],
  ['Pengaturan Firma & RBAC', ['edit', 'none', 'none', 'none']],
];
function SecAkses({ auth }: any) {
  const roles = ['Engagement Partner', 'Audit Manager', 'Senior Auditor', 'Junior Auditor'];
  const ri = roles.indexOf(auth.role);
  const cap = ROLE_CAPS[auth.role] || ROLE_CAPS['Audit Manager'];
  const cell = (v) => v === 'edit'
    ? <span style={{ color: 'var(--green)' }} title="Ubah"><I.check size={15} /></span>
    : v === 'view'
      ? <span className="tiny" style={{ color: 'var(--blue)', fontWeight: 700 }} title="Lihat saja">Lihat</span>
      : <span className="muted" title="Tanpa akses">—</span>;
  return (
    <>
      <Panel noBody>
        <div className="panel-h"><h3>Peran Aktif</h3></div>
        <div style={{ padding: 14 }}>
          <div className="row ac jb" style={{ marginBottom: 12 }}>
            <div className="row ac gap10"><span style={{ width: 38, height: 38, borderRadius: 9, background: 'var(--blue)', color: '#fff', display: 'grid', placeItems: 'center' }}><I.shield size={19} /></span><div><div style={{ fontWeight: 700, fontSize: 13.5 }}>{auth.role}</div><div className="tiny muted">Kontrol akses berbasis peran (RBAC)</div></div></div>
            <span className="chip tiny" style={{ background: 'var(--green-050, var(--surface-3))', color: 'var(--green)' }} title="Peran berasal dari sesi login & ditegakkan di server"><I.lock size={11} /> Ditegakkan di server</span>
          </div>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
            <div className="panel" style={{ padding: '9px 12px' }}><div className="tiny muted upper" style={{ marginBottom: 2 }}>Hak Sign-off</div><div style={{ fontSize: 12.5, fontWeight: 600 }}>{cap.sign}</div></div>
            <div className="panel" style={{ padding: '9px 12px' }}><div className="tiny muted upper" style={{ marginBottom: 2 }}>Persetujuan</div><div style={{ fontSize: 12.5, fontWeight: 600 }}>{cap.approve}</div></div>
            <div className="panel" style={{ padding: '9px 12px' }}><div className="tiny muted upper" style={{ marginBottom: 2 }}>Hak Edit</div><div style={{ fontSize: 12.5, fontWeight: 600 }}>{cap.edit}</div></div>
            <div className="panel" style={{ padding: '9px 12px' }}><div className="tiny muted upper" style={{ marginBottom: 2 }}>Admin Firma</div><div style={{ fontSize: 12.5, fontWeight: 600 }}>{cap.admin ? <span style={{ color: 'var(--green)' }}>Ya</span> : 'Tidak'}</div></div>
          </div>
        </div>
      </Panel>

      <Panel noBody>
        <div className="panel-h"><h3>Matriks Hak Akses</h3><div style={{ flex: 1 }} /><span className="tiny muted">Kolom peran aktif disorot</span></div>
        <table className="dtbl">
          <thead><tr>
            <th>Kapabilitas</th>
            {roles.map((r, i) => <th key={r} style={{ textAlign: 'center', background: i === ri ? 'var(--blue-100)' : undefined, color: i === ri ? 'var(--blue)' : undefined }}>{r.replace('Engagement ', '').replace('Audit ', '').replace(' Auditor', '')}</th>)}
          </tr></thead>
          <tbody>
            {PERM_MATRIX.map(([cap2, vals]: [any, any]) => (
              <tr key={cap2}>
                <td style={{ fontWeight: 600 }}>{cap2}</td>
                {vals.map((v, i) => <td key={i} style={{ textAlign: 'center', background: i === ri ? 'var(--blue-050)' : undefined }}>{cell(v)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="tiny muted" style={{ padding: '10px 14px', lineHeight: 1.45 }}>
          <I.lock size={11} style={{ verticalAlign: '-1px' }} /> Hak <b>Ubah</b> ditegakkan di server dari peta kapabilitas bersama (<span className="mono">rbac.js</span>) — UI &amp; API memakai sumber yang sama. Tindakan terlarang ditolak server, bukan sekadar disembunyikan.
        </div>
      </Panel>
    </>
  );
}

/* ---------------- AI & LLM ---------------- */
const AI_TEMPS = ['Presisi (faktual)', 'Standar', 'Kreatif'];
function SecAI({ s, setGroup, flash }: any) {
  const ai = s.ai || {};
  const PROVIDERS = (window.AMS_LLM && window.AMS_LLM.PROVIDERS) || [];
  const active = PROVIDERS.find(p => p.id === ai.provider) || PROVIDERS[0] || {};
  const keys = ai.keys || {};
  const baseUrls = ai.baseUrls || {};
  const [test, setTest] = useStateSet(null);
  const [showKey, setShowKey] = useStateSet(false);
  // W8 — real proxy status from the server (key is server-held; this panel no longer simulates).
  const [srv, setSrv] = useStateSet({ state: 'loading' });
  useEffectSet(() => {
    let live = true;
    (window.amsLlmStatus ? window.amsLlmStatus() : Promise.resolve({ configured: false }))
      .then(st => { if (live) setSrv({ state: 'ready', ...st }); })
      .catch(() => { if (live) setSrv({ state: 'ready', configured: false }); });
    return () => { live = false; };
  }, []);

  const curKey = keys[active.id] || '';
  const curBase = baseUrls[active.id] || active.baseUrl || '';

  const setProvider = (pid) => { setGroup('ai', 'provider', pid); setTest(null); setShowKey(false); };
  const setKey = (val) => { setGroup('ai', 'keys', { ...keys, [active.id]: val }); setTest(null); };
  const setBase = (val) => setGroup('ai', 'baseUrls', { ...baseUrls, [active.id]: val });

  // W8 — "test" now re-reads the REAL server proxy status (no simulation, no client key check).
  const runTest = () => {
    setTest({ state: 'testing' });
    (window.amsLlmStatus ? window.amsLlmStatus() : Promise.resolve({ configured: false }))
      .then(st => {
        setSrv({ state: 'ready', ...st });
        if (st.configured) setTest({ state: 'ok', msg: 'Proxy server aktif · ' + (st.provider || '') + ' · ' + (st.model || '') + '.' });
        else setTest({ state: 'fail', msg: 'Proxy server belum dikonfigurasi (LLM_API_KEY belum di-set di server).' });
      })
      .catch(() => setTest({ state: 'fail', msg: 'Server tidak dapat dihubungi.' }));
  };

  const browserBadge = active.browser === 'proxy'
    ? { cls: 'amber', ic: 'shield', t: 'Wajib proxy server (CORS)' }
    : { cls: 'blue', ic: 'alert', t: 'Bisa dari browser · kunci terekspos' };

  return (
    <>
      {/* W8 — status proxy LLM NYATA dari server (bukan simulatif) */}
      {(() => {
        const up = srv.state === 'ready' && srv.configured;
        const bg = up ? 'var(--green-bg)' : 'var(--amber-bg)';
        const fg = up ? 'var(--green)' : 'var(--amber)';
        return (
          <div className="panel" style={{ padding: '11px 14px', display: 'flex', gap: 10, alignItems: 'flex-start', background: bg, borderColor: 'transparent' }}>
            <span style={{ color: fg, flex: '0 0 auto', marginTop: 1 }}><I.shield size={16} /></span>
            <div className="tiny" style={{ lineHeight: 1.5, color: 'var(--ink-2)' }}>
              {srv.state !== 'ready'
                ? <>Memeriksa status proxy LLM server…</>
                : up
                  ? <><b>Proxy LLM aktif di server</b> · {srv.provider} · <span className="mono">{srv.model}</span>. Panggilan AI (narasi diagnostik) lewat proxy terotentikasi — <b>kunci tersimpan di server</b> (env), tak pernah di browser. Egress di-redaksi ke teks temuan saja, di-rate-limit & dicatat (jejak audit).</>
                  : <><b>Proxy LLM belum dikonfigurasi</b> di server (<span className="mono">LLM_API_KEY</span> belum di-set). Fitur narasi AI nonaktif; diagnostik tetap berjalan <b>deterministik</b>. Lihat <span className="mono">BUILD.md</span> (W8).</>}
            </div>
          </div>
        );
      })()}

      {/* provider grid */}
      <Panel noBody>
        <div className="panel-h"><h3>Penyedia Model (LLM)</h3><div style={{ flex: 1 }} /><span className="tiny muted">Satu provider aktif</span></div>
        <div className="llms-grid">
          {PROVIDERS.map(p => {
            const on = p.id === active.id;
            const has = !!((keys[p.id] || '').trim());
            return (
              <button key={p.id} className={'llms-card' + (on ? ' on' : '')} onClick={() => setProvider(p.id)} style={on ? { borderColor: p.accent, boxShadow: '0 0 0 1px ' + p.accent } : {}}>
                <span className="llms-logo" style={{ background: p.accent }}>{p.initials}</span>
                <span className="llms-meta">
                  <span className="llms-name">{p.label}</span>
                  <span className="llms-model">{p.modelLabel}</span>
                </span>
                {has && <span className="llms-haskey" title="Kunci tersimpan"><I.check size={12} /></span>}
                {on && <span className="llms-on" style={{ background: p.accent }}><I.check size={11} /></span>}
              </button>
            );
          })}
        </div>
      </Panel>

      {/* active provider config */}
      <Panel noBody>
        <div className="panel-h">
          <span className="row ac gap8"><span className="llms-logo sm" style={{ background: active.accent }}>{active.initials}</span><h3 style={{ margin: 0 }}>{active.label}</h3></span>
          <div style={{ flex: 1 }} />
          <span className={'chip tiny llms-bbadge ' + browserBadge.cls}>{React.createElement(I[browserBadge.ic], { size: 11 })} {browserBadge.t}</span>
        </div>

        <div style={{ padding: '4px 0' }}>
          {/* model (default, satu per provider) */}
          <SRow title="Model" sub={'Kompatibilitas API: ' + (active.compat || '—') + ' · ' + (active.endpoint || '')}>
            <span className="chip tiny" style={{ background: 'var(--surface-3)', fontWeight: 700 }}>{active.modelLabel}</span>
          </SRow>

          {/* API key */}
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--line-soft)' }}>
            <div className="row ac jb" style={{ marginBottom: 6 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600 }}>Kunci API</div>
              <button className="btn sm" onClick={() => setShowKey(v => !v)} style={{ height: 24 }}>{showKey ? 'Sembunyikan' : 'Tampilkan'}</button>
            </div>
            <input className="input" type={showKey ? 'text' : 'password'} value={curKey} onChange={e => setKey(e.target.value)}
              placeholder={active.keyPlaceholder} autoComplete="off" spellCheck={false}
              style={{ width: '100%', height: 32, fontFamily: 'var(--mono)', fontSize: 12 }} />
            <div className="tiny muted" style={{ marginTop: 6, lineHeight: 1.45 }}><I.shield size={11} style={{ verticalAlign: '-2px', color: 'var(--blue)' }} /> <b>Proxy memakai kunci di server</b> (<span className="mono">LLM_API_KEY</span>) — kunci di sini hanya catatan konfigurasi klien dan <b>tidak dikirim</b> oleh proxy. {active.note}</div>
          </div>

          {/* base URL */}
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--line-soft)' }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>Base URL <span className="tiny muted" style={{ fontWeight: 400 }}>· endpoint kustom / proxy</span></div>
            <input className="input" value={curBase} onChange={e => setBase(e.target.value)} placeholder={active.baseUrl}
              style={{ width: '100%', height: 32, fontFamily: 'var(--mono)', fontSize: 12 }} />
          </div>

          {/* test */}
          <SRow title="Status proxy server" sub="Periksa apakah proxy LLM aktif di server (kunci, provider, model)." last>
            <div className="row ac gap8">
              {test && test.state !== 'testing' && (
                <span className={'tiny llms-test ' + test.state} style={{ maxWidth: 280 }}>{test.state === 'ok' ? <I.checkCircle size={12} /> : <I.alert size={12} />} {test.msg}</span>
              )}
              <Btn sm variant="primary" onClick={runTest} disabled={test && test.state === 'testing'}>
                {test && test.state === 'testing' ? <>Menguji…</> : <><I.sparkle size={13} /> Uji</>}
              </Btn>
            </div>
          </SRow>
        </div>
      </Panel>

      {/* behaviour */}
      <Panel noBody>
        <div className="panel-h"><h3>Perilaku AI</h3></div>
        <div style={{ padding: '4px 0' }}>
          <SRow title="Bagikan konteks perikatan" sub="Klien, perikatan aktif, materialitas & modul saat ini disertakan agar jawaban relevan. Matikan untuk pertanyaan umum/anonim.">
            <SetToggle on={ai.share !== false} set={v => setGroup('ai', 'share', v)} />
          </SRow>
          <SRow title="Gaya keluaran" sub="Presisi mengutamakan jawaban faktual & ringkas; Kreatif lebih eksploratif." last>
            <SSelect value={ai.temperature || 'Standar'} onChange={v => setGroup('ai', 'temperature', v)} options={AI_TEMPS} w={190} />
          </SRow>
        </div>
        <div style={{ padding: '10px 14px', borderTop: '1px solid var(--line)', background: 'var(--surface-2)' }}>
          <div className="tiny muted" style={{ lineHeight: 1.5 }}><I.shield size={12} style={{ verticalAlign: '-2px', color: 'var(--blue)' }} /> Tata kelola ISQM 1: keluaran AI bersifat asistif; ekstraksi dokumen tetap melewati persetujuan auditor (SA 230) sebelum masuk kertas kerja.</div>
        </div>
      </Panel>
    </>
  );
}

Object.assign(window, { SettingsView, amsApplyPrefs, SecAI });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { SecAI, SettingsView, amsApplyPrefs };
