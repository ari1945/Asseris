/* [codemod] ESM imports */
import React from 'react';
import { I } from './icons.jsx';
import { Btn } from './ui.jsx';
import { BoBadge, boJt, boM } from './view_bo1.jsx';
import { PDrawer } from './view_docparts.jsx';
import { KV, SectionTitle } from './view_fpm_parts.jsx';
import { LEGAL } from './data_legal';

/* ============================================================
   NeoSuite AMS — Kontrak & Legal Firma (modul mendalam)
   Registri kontrak TERPADU yang ditarik dari satu sumber kebenaran
   (Engagement/CRM · Vendor · Lisensi · Asuransi) + rekonsiliasi
   lineage, kewajiban/tenggat, dan sengketa lintas-modul.
   Reuse: boJt, boM, BoBadge, BoTabPanel, BoStat (view_bo1);
          KV, SectionTitle (fpm_parts); PDrawer (docparts).
   ============================================================ */
const { useState: useStateLegal, useMemo: useMemoLegal } = React;

/* kategori → warna + ikon (konsisten dgn donut & badge) */
const LGL_CAT = {
  Perikatan: { c: '#005085', ic: 'briefcase', lbl: 'Surat Perikatan' },
  Sewa:      { c: '#0a6b73', ic: 'building',  lbl: 'Sewa & Fasilitas' },
  Lisensi:   { c: '#5b3fa6', ic: 'sliders',   lbl: 'Lisensi Software' },
  Asuransi:  { c: '#9a6a00', ic: 'umbrella',  lbl: 'Asuransi' },
  Layanan:   { c: '#2f7bb0', ic: 'cart',      lbl: 'Layanan / MoU' },
};
const lglDate = (d) => d || '—';

/* chip sumber kebenaran (klik → navigasi ke modul sumber) */
function LglSourceChip({ kind, id, onNav }) {
  const meta = LEGAL.SOURCE_META[kind];
  if (!meta) return <span className="tiny muted">—</span>;
  const Ic = I[meta.icon] || I.link2;
  return (
    <button type="button" className="chip tiny" title={'Sumber: ' + meta.label + ' · ' + id + ' — buka modul'}
      onClick={(e) => { e.stopPropagation(); onNav(meta.module, { from: 'legal' }); }}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, cursor: 'pointer', borderColor: 'var(--line)' }}>
      <Ic size={11} /><span style={{ fontWeight: 600 }}>{meta.label}</span>
      <span className="mono muted" style={{ fontSize: 10 }}>{id}</span>
    </button>
  );
}

/* badge status rekonsiliasi */
function ReconBadge({ state }) {
  if (state === 'ok') return <span className="badge b-green" style={{ textTransform: 'none' }}>✓ Konsisten</span>;
  if (state === 'drift') return <span className="badge b-amber" style={{ textTransform: 'none' }}>≠ Selisih</span>;
  return <span className="badge b-red" style={{ textTransform: 'none' }}>⚠ Orphan</span>;
}

/* ---------- obligasi turunan per kontrak (pembayaran/tenggat/deliverable) ---------- */
function lglObligations(c) {
  const out = [];
  if (c.category === 'Perikatan') {
    out.push({ jenis: 'Penerbitan laporan auditor', due: c.end, val: null, note: 'Tenggat pelaporan perikatan' });
    out.push({ jenis: 'Penagihan termin akhir', due: c.end, val: Math.round(c.value * 0.3), note: '30% saat laporan terbit' });
  } else if (c.category === 'Sewa') {
    out.push({ jenis: 'Sewa tahunan', due: c.end, val: c.value, note: 'Pembayaran tahunan di muka' });
    out.push({ jenis: 'Service charge', due: c.end, val: Math.round(c.value * 0.08), note: 'Perkiraan utilitas & pemeliharaan' });
  } else if (c.category === 'Lisensi') {
    out.push({ jenis: 'Perpanjangan lisensi', due: c.end, val: c.value, note: (c.meta.used || 0) + '/' + (c.meta.seats || 0) + ' seat terpakai' });
  } else if (c.category === 'Asuransi') {
    out.push({ jenis: 'Premi tahunan', due: c.end, val: c.value, note: 'Limit ' + LEGAL.moneyJt(c.meta.limit || 0).replace('Rp ', 'Rp ') });
  } else {
    out.push({ jenis: 'Tinjauan MoU', due: c.end, val: null, note: 'Evaluasi layanan berkala' });
  }
  return out;
}

/* ============================================================
   Drawer detail kontrak — fakta kunci, lineage sumber, klausul,
   kewajiban, dokumen tertaut.
   ============================================================ */
function LglContractDrawer({ c, onClose, onNav }) {
  if (!c) return null;
  const cat = LGL_CAT[c.category] || LGL_CAT.Layanan;
  const Ic = I[cat.ic] || I.doc;
  const d = LEGAL.daysTo(c.end);
  const clauses = LEGAL.CLAUSES[c.category] || [];
  const obligs = lglObligations(c);
  const okClause = clauses.filter(x => x.ok).length;
  return (
    <PDrawer open={!!c} onClose={onClose} width={600}>
      <div className="pdrawer-h">
        <span className="pdrawer-ico" style={{ background: cat.c + '1a', color: cat.c }}><Ic size={18} /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.3 }}>{c.party}</div>
          <div className="row ac gap8" style={{ marginTop: 4 }}>
            <span className="mono tiny" style={{ fontWeight: 700, color: cat.c }}>{c.id}</span>
            <span className="badge b-gray" style={{ textTransform: 'none' }}>{cat.lbl}</span>
            <BoBadge s={c.status} />
          </div>
        </div>
      </div>

      <div style={{ padding: '4px 16px 18px', flex: 1, overflow: 'auto', minHeight: 0 }}>
        {/* lineage sumber kebenaran */}
        <div className="panel" style={{ padding: '11px 13px', marginBottom: 14, background: 'var(--blue-050)', borderColor: 'var(--blue-100)' }}>
          <div className="row ac gap8" style={{ marginBottom: 8 }}>
            <I.link2 size={14} style={{ color: 'var(--blue)' }} />
            <b style={{ fontSize: 12 }}>Sumber Kebenaran (SSOT)</b>
            <div style={{ flex: 1 }} />
            <span className="tiny muted">nilai ditarik, bukan disalin</span>
          </div>
          <div className="row ac gap8" style={{ flexWrap: 'wrap' }}>
            <LglSourceChip kind={c.source.kind} id={c.source.id} onNav={onNav} />
            {c.source.feeKind && <LglSourceChip kind={c.source.feeKind} id={c.source.feeId} onNav={onNav} />}
          </div>
          <div className="tiny muted" style={{ marginTop: 8, lineHeight: 1.5 }}>
            {c.category === 'Perikatan'
              ? <>Nilai <b>{boJt(c.value)}</b> = fee klien tercatat di <b>CRM</b> dan dikunci di <b>Engagement Mgmt</b>. Perubahan fee mengalir otomatis ke kontrak ini & ke Billing.</>
              : <>Nilai <b>{boJt(c.value)}</b> ditarik langsung dari modul <b>{LEGAL.SOURCE_META[c.source.kind].label}</b>. Modul Kontrak tidak menyimpan salinan angka.</>}
          </div>
        </div>

        {/* fakta kunci */}
        <SectionTitle>Fakta Kunci</SectionTitle>
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
          <KV label="Nilai Kontrak" v={c.value === 0 ? 'MoU (tanpa nilai)' : boJt(c.value)} accent={cat.c} />
          <KV label="Owner / PIC" v={c.owner} />
          <KV label="Mulai" v={lglDate(c.start)} />
          <KV label="Berakhir" v={<span style={{ color: d < 30 ? 'var(--red)' : d < 120 ? 'var(--amber)' : 'inherit' }}>{lglDate(c.end)}{c.end ? ' · ' + d + 'h' : ''}</span>} />
          <KV label="Perpanjangan" v={c.renewal} />
          <KV label="Status" v={c.status} />
          {c.meta.standard && <KV label="Standar" v={c.meta.standard} />}
          {c.meta.manager && <KV label="Manajer" v={c.meta.manager} />}
          {c.meta.util != null && <KV label="Utilisasi Seat" v={c.meta.used + '/' + c.meta.seats + ' (' + c.meta.util + '%)'} accent={c.meta.util > 90 ? 'var(--amber)' : undefined} />}
          {c.meta.limit != null && <KV label="Limit Pertanggungan" v={boM(c.meta.limit, 0)} />}
        </div>

        {/* klausul */}
        <SectionTitle right={<span className="mono tiny muted">{okClause}/{clauses.length} klausul</span>}>Klausul & Kepatuhan</SectionTitle>
        <div style={{ display: 'grid', gap: 6, marginBottom: 14 }}>
          {clauses.map((cl, i) => (
            <div key={i} className="row ac gap8" style={{ fontSize: 12 }}>
              <span style={{ width: 16, height: 16, borderRadius: 4, display: 'grid', placeItems: 'center', flex: '0 0 16px', background: cl.ok ? 'var(--green-bg)' : 'var(--amber-bg)', color: cl.ok ? 'var(--green)' : 'var(--amber)' }}>
                {cl.ok ? <I.check size={11} /> : <I.alert size={11} />}
              </span>
              <span style={{ color: cl.ok ? 'var(--ink-1)' : 'var(--ink-2)' }}>{cl.k}</span>
              {!cl.ok && <span className="tiny" style={{ color: 'var(--amber)', marginLeft: 'auto', fontWeight: 600 }}>perlu reviu</span>}
            </div>
          ))}
        </div>

        {/* kewajiban */}
        <SectionTitle>Kewajiban & Tenggat</SectionTitle>
        <table className="dtbl" style={{ marginBottom: 14 }}>
          <thead><tr><th>Kewajiban</th><th>Jatuh Tempo</th><th className="num">Nilai</th></tr></thead>
          <tbody>
            {obligs.map((o, i) => (
              <tr key={i}>
                <td><div style={{ fontWeight: 600, fontSize: 11.5 }}>{o.jenis}</div><div className="tiny muted">{o.note}</div></td>
                <td className="tiny mono">{lglDate(o.due)}</td>
                <td className="num">{o.val == null ? '—' : boJt(o.val)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="row gap8">
          <Btn sm variant="primary"><I.doc size={13} /> Buka Dokumen (DMS)</Btn>
          <Btn sm onClick={() => onNav(LEGAL.SOURCE_META[c.source.kind].module, { from: 'legal' })}><I.arrowRight size={13} /> Ke Modul Sumber</Btn>
        </div>
      </div>
    </PDrawer>
  );
}
Object.assign(window, { LGL_CAT, LglSourceChip, ReconBadge, lglObligations, LglContractDrawer });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { LGL_CAT, LglContractDrawer, LglSourceChip, ReconBadge, lglObligations };
