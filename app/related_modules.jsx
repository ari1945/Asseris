/* ============================================================
   NeoSuite AMS — Related-modules dock & SA linkback (komponen).
   Data graf (LINEAGE) & peta SA dipindah ke related_modules_data.js (W2),
   dimuat SEBELUM berkas ini; komponen membacanya via global/window.
   ============================================================ */

function ModuleLineage({ moduleId }) {
  const L = (typeof LINEAGE !== 'undefined' ? LINEAGE : window.LINEAGE || {})[moduleId];
  const nav = (typeof useNav === 'function') ? useNav() : (window.__amsNav || (() => {}));
  const [open, setOpen] = React.useState(true);
  if (!L) return null;

  const Chip = ({ m, color }) => {
    const Ic = (window.I && (window.I[m.ic] || window.I.doc));
    return (
      <button type="button" className="lin-chip" title={m.rel + ' — buka ' + m.lbl}
        onClick={() => nav(m.id, { from: moduleId })} style={{ borderLeftColor: color }}>
        <span className="lin-ic" style={{ color }}>{Ic ? <Ic size={14} /> : null}</span>
        <span className="lin-txt"><span className="lin-lbl">{m.lbl}</span><span className="lin-rel">{m.rel}</span></span>
        <span className="lin-go">{window.I ? <window.I.arrowRight size={12} /> : '→'}</span>
      </button>
    );
  };

  return (
    <div className={'lineage-dock' + (open ? '' : ' collapsed')}>
      <button type="button" className="lin-head" onClick={() => setOpen(o => !o)} title={open ? 'Sembunyikan' : 'Tampilkan keterkaitan'}>
        {window.I ? <window.I.link2 size={14} /> : null}
        <span className="lin-h-t">Keterkaitan Modul</span>
        <span className="lin-h-s">{L.std}</span>
        <span className="lin-h-c">lineage dua arah</span>
        {window.I ? <window.I.chevDown size={14} style={{ transform: open ? 'none' : 'rotate(180deg)', transition: '.15s', marginLeft: 'auto' }} /> : null}
      </button>
      {open && (
        <div className="lin-body">
          <div className="lin-col">
            <span className="lin-col-h up">↑ Hulu · sumber masukan</span>
            <div className="lin-chips">{L.up.map(m => <Chip key={'u' + m.id} m={m} color="var(--blue)" />)}</div>
          </div>
          <div className="lin-col">
            <span className="lin-col-h down">↓ Hilir · pengguna keluaran</span>
            <div className="lin-chips">{L.down.map(m => <Chip key={'d' + m.id} m={m} color="var(--green)" />)}</div>
          </div>
        </div>
      )}
    </div>
  );
}

function StandardLinkback({ moduleId }) {
  const meta = (window.MODULE_INDEX || {})[moduleId];
  const nav = (typeof useNav === 'function') ? useNav() : (() => {});
  /* default COLLAPSE — bar keterkaitan standar tampil terlipat di semua modul */
  const [open, setOpen] = React.useState(false);
  if (!meta) return null;

  const isSAPage = SA_GROUPS.has(meta.group);
  const saRefs = (window.RELATED_SA || {})[moduleId] || [];

  /* Standar dari peta keterkaitan modul (LINEAGE.std) — menjangkau modul
     fungsional yang punya basis standar tapi tidak terdaftar di RELATED_SA
     (mis. risk → SA 315). Hanya dipakai bila std diawali kode standar resmi
     agar entri sisi-firma (mis. "ERP Firma · General Ledger") tidak ikut. */
  const linStd = (window.LINEAGE && window.LINEAGE[moduleId] && window.LINEAGE[moduleId].std) || '';
  const linIsStd = /^(SA|PSAK|ISA|ISAE|ISQM|SPR|SPM|SPAP|SJAH|SAK)\b/.test(linStd);

  /* Tampil untuk: (a) halaman SA — telusur balik prosedur; atau
     (b) modul fungsional yang menerapkan/merujuk standar audit. */
  if (!isSAPage && !saRefs.length && !linIsStd) return null;

  /* Daftar standar untuk modul fungsional: utamakan RELATED_SA (terstruktur &
     dapat dibuka), bila kosong turunkan dari LINEAGE.std (kode → Matriks). */
  let stdRefs = saRefs;
  if (!isSAPage && !stdRefs.length && linIsStd) {
    const parts = linStd.split(' · ');
    stdRefs = [{ code: parts[0], title: parts.slice(1).join(' · ') || meta.label, phase: '' }];
  }

  /* Label di kepala bar (terlihat saat collapse): kode/uraian standar. */
  const stdLabel = isSAPage ? meta.label
    : (linIsStd ? linStd : (saRefs.length ? saRefs.map(r => r.code).join(' · ') : meta.label));

  const openSA = (r) => {
    if (window.__amsOpenSA) window.__amsOpenSA({ ...r, fromModule: moduleId });
    else nav('compmatrix', { from: moduleId });
  };

  const ProcChip = ({ p }) => {
    const m = (window.MODULE_INDEX || {})[p.module] || { label: p.module, icon: 'doc' };
    const Ic = window.I && (window.I[m.icon] || window.I.doc);
    return (
      <button type="button" className="lin-chip" title={p.note + ' — buka ' + m.label}
        onClick={() => nav(p.module, { from: moduleId })} style={{ borderLeftColor: 'var(--navy)' }}>
        <span className="lin-ic" style={{ color: 'var(--navy)' }}>{Ic ? <Ic size={14} /> : null}</span>
        <span className="lin-txt"><span className="lin-lbl">{m.label}</span><span className="lin-rel">{p.note}</span></span>
        <span className="lin-go">{window.I ? <window.I.arrowRight size={12} /> : '→'}</span>
      </button>
    );
  };
  const SibChip = ({ s }) => {
    const Ic = window.I && (window.I[s.icon] || window.I.doc);
    return (
      <button type="button" className="lin-chip sib" title={'Buka ' + s.label}
        onClick={() => nav(s.id, { from: moduleId })} style={{ borderLeftColor: 'var(--teal)' }}>
        <span className="lin-ic" style={{ color: 'var(--teal)' }}>{Ic ? <Ic size={14} /> : null}</span>
        <span className="lin-txt"><span className="lin-lbl">{s.label}</span></span>
      </button>
    );
  };
  const StdChip = ({ r }) => {
    const Ic = window.I && window.I.shield;
    return (
      <button type="button" className="lin-chip" title={r.code + ' · ' + r.title + (r.view ? ' — buka rujukan standar' : ' — lihat di Matriks Kepatuhan')}
        onClick={() => openSA(r)} style={{ borderLeftColor: 'var(--navy)' }}>
        <span className="lin-ic" style={{ color: 'var(--navy)' }}>{Ic ? <Ic size={14} /> : null}</span>
        <span className="lin-txt"><span className="lin-lbl">{r.code}</span><span className="lin-rel">{r.title}{r.phase ? ' · ' + r.phase : ''}</span></span>
        <span className="lin-go">{window.I ? <window.I.arrowRight size={12} /> : '→'}</span>
      </button>
    );
  };

  const Header = (
    <button type="button" className="lin-head" onClick={() => setOpen(o => !o)} title={open ? 'Sembunyikan' : 'Tampilkan keterkaitan standar'}>
      {window.I ? <window.I.shield size={14} /> : null}
      <span className="lin-h-t">Keterkaitan Standar</span>
      <span className="lin-h-s">{stdLabel}</span>
      <span className="lin-h-c">ketertelusuran</span>
      {window.I ? <window.I.chevDown size={14} style={{ transform: open ? 'none' : 'rotate(180deg)', transition: '.15s', marginLeft: 'auto' }} /> : null}
    </button>
  );

  /* ---- (a) Halaman SA: telusur balik prosedur yang memenuhinya + standar serumpun ---- */
  if (isSAPage) {
    const fulfilled = SA_REVERSE[moduleId] || SA_FULFILLED_BY[moduleId] || [];
    const grp = (window.MODULES || []).find(g => g.group === meta.group);
    const siblings = grp ? grp.items.filter(i => i.id !== moduleId) : [];
    return (
      <div className={'lineage-dock sa' + (open ? '' : ' collapsed')}>
        {Header}
        {open && (
          <div className="lin-body">
            <div className="lin-col">
              <span className="lin-col-h proc">↳ Dipenuhi oleh prosedur{fulfilled.length ? ' · ' + fulfilled.length : ''}</span>
              <div className="lin-chips">
                {fulfilled.length ? fulfilled.map(p => <ProcChip key={p.module} p={p} />)
                  : <span className="lin-empty">Belum ada prosedur yang dipetakan — lihat Matriks Kepatuhan.</span>}
              </div>
            </div>
            <div className="lin-col">
              <span className="lin-col-h sib">Standar serumpun · {meta.group.replace(/^SA · /, '')}</span>
              <div className="lin-chips">
                <button type="button" className="lin-cta" onClick={() => nav('compmatrix', { from: moduleId })}>
                  {window.I ? <window.I.table size={13} /> : null} Lihat di Matriks Kepatuhan
                </button>
                {siblings.map(s => <SibChip key={s.id} s={s} />)}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ---- (b) Modul fungsional: standar yang diterapkan/dirujuk + ketertelusuran kepatuhan ---- */
  return (
    <div className={'lineage-dock sa' + (open ? '' : ' collapsed')}>
      {Header}
      {open && (
        <div className="lin-body">
          <div className="lin-col">
            <span className="lin-col-h proc">↳ Menerapkan / merujuk standar · {stdRefs.length}</span>
            <div className="lin-chips">{stdRefs.map(r => <StdChip key={r.code} r={r} />)}</div>
          </div>
          <div className="lin-col">
            <span className="lin-col-h sib">Ketertelusuran kepatuhan</span>
            <div className="lin-chips">
              <button type="button" className="lin-cta" onClick={() => nav('compmatrix', { from: moduleId })}>
                {window.I ? <window.I.table size={13} /> : null} Lihat di Matriks Kepatuhan
              </button>
              <button type="button" className="lin-chip sib" title="Buka Basis Pengetahuan Standar (SA/PSAK)"
                onClick={() => nav('kb', { from: moduleId })} style={{ borderLeftColor: 'var(--teal)' }}>
                <span className="lin-ic" style={{ color: 'var(--teal)' }}>{window.I ? <window.I.book size={14} /> : null}</span>
                <span className="lin-txt"><span className="lin-lbl">Basis Pengetahuan</span></span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { ModuleLineage, StandardLinkback });
