/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { useNav } from './contexts';
import { I } from './icons';
import { SubBar } from './shell';
import { Badge, Panel, Stat } from './ui';
import { regrefCatalog } from './regref_catalog';
import { regrefFor, regrefIssues, regrefSpan } from './canon_regref';

/* ============================================================
   Asseris — Data Referensi Regulatori
   PRD `docs/prd-regulatory-reference-annual.md` · PR-4 · SC-8.

   Satu layar yang menjawab pertanyaan yang sesungguhnya ditanyakan setiap
   Januari: APA YANG HARUS SAYA PERBARUI, dan apa yang rusak bila tidak?

   Halaman ini merender `regrefCatalog()` — daftar yang SAMA dengan yang
   ditegakkan gerbang uji, supaya "yang tampil" dan "yang ditegakkan" tak
   dapat berbeda. Read-only pada Tahap A: mengubah tarif pajak lewat UI
   menuntut atestasi, RBAC, dan jejak audit (Tahap B, arc terpisah).
   ============================================================ */
const { useState: useRR } = React;

type Status = 'ok' | 'unverified' | 'no-coverage' | 'bad-date';

const STATUS_LABEL: Record<Status, string> = {
  'ok': 'Berlaku & dicocokkan',
  'unverified': 'Berlaku, belum dicocokkan',
  'no-coverage': 'Tak tercakup',
  'bad-date': 'Tanggal tak terbaca',
};
const STATUS_KIND: Record<Status, string> = {
  'ok': 'green', 'unverified': 'amber', 'no-coverage': 'red', 'bad-date': 'red',
};

function RegRefView() {
  const nav = useNav();
  const today = String(AMS.TODAY || '');
  const [asOf, setAsOf] = useRR(today);
  const uid = React.useId();
  const catalog = regrefCatalog();

  const looks = catalog.map((c) => ({
    c,
    look: regrefFor(c.sets, asOf, { label: c.label, enforcement: c.enforcement }),
    issues: regrefIssues(c.sets, c.label),
    span: regrefSpan(c.sets),
  }));
  const blocking = looks.filter((r) => r.look.blocked).length;
  const unverified = looks.filter((r) => r.look.status === 'unverified').length;
  const broken = looks.filter((r) => r.issues.length > 0).length;

  return (
    <>
      <SubBar moduleId="regref" right={<Badge kind={blocking ? 'red' : unverified ? 'amber' : 'green'}>
        {blocking ? blocking + ' menghentikan perhitungan' : unverified ? unverified + ' belum dicocokkan' : 'Seluruhnya berlaku'}
      </Badge>} />
      <div className="view-scroll"><div className="view-pad">

        <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={catalog.length} label="Set Data Regulatori" /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={blocking} label="Menghentikan Perhitungan" accent={blocking ? 'var(--red)' : 'var(--green)'} /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={unverified} label="Belum Dicocokkan" accent={unverified ? 'var(--amber)' : 'var(--green)'} /></div></Panel>
          <Panel><div style={{ padding: '15px 18px' }}><Stat value={broken} label="Registry Cacat" accent={broken ? 'var(--red)' : 'var(--green)'} /></div></Panel>
        </div>

        <Panel>
          <div style={{ padding: '12px 14px' }}>
            <p className="tiny" style={{ margin: '0 0 10px', lineHeight: 1.6, color: 'var(--ink-2)', maxWidth: 860 }}>
              Data di halaman ini berubah menurut <b>kalender</b>, bukan menurut kode. Yang menyangkut uang
              <b> menghentikan perhitungan</b> bila masanya tak tercakup — bukan menghitung dengan dasar tahun lain;
              yang tidak, dihitung dengan penanda. <b>Belum dicocokkan</b> berbeda dari <b>tak tercakup</b>: yang
              pertama tetap menghitung, yang kedua tidak.
            </p>
            <div className="row ac gap8">
              <label className="tiny muted" htmlFor={uid + '-asof'}>Tinjau untuk tanggal</label>
              <input
                id={uid + '-asof'} type="date" className="inp" style={{ width: 170 }}
                value={asOf} onChange={(e: { target: { value: string } }) => setAsOf(e.target.value)}
              />
              <button type="button" className="btn sm" onClick={() => setAsOf(today)}>Hari ini</button>
              <span className="tiny muted">Ubah tanggal untuk melihat apa yang berhenti — mis. 1 Januari tahun depan.</span>
            </div>
          </div>
        </Panel>

        <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
          {looks.map(({ c, look, issues, span }) => {
            const st = look.status as Status;
            const border = look.blocked ? 'var(--red)' : st === 'unverified' ? 'var(--amber)' : 'var(--green)';
            return (
              <Panel key={c.id}>
                <div style={{ padding: '12px 14px', borderLeft: '3px solid ' + border }}>
                  <div className="row jb ac" style={{ marginBottom: 6 }}>
                    <span className="row ac gap8">
                      <span style={{ fontSize: 13, fontWeight: 700 }}>{c.label}</span>
                      <Badge kind={STATUS_KIND[st]}>{STATUS_LABEL[st]}</Badge>
                      <Badge kind={c.enforcement === 'block' ? 'red' : 'blue'}>
                        {c.enforcement === 'block' ? 'Menghentikan perhitungan' : 'Memperingatkan'}
                      </Badge>
                    </span>
                    <button type="button" className="lin-cta" onClick={() => nav(c.module, { from: 'regref' })}>
                      <I.arrowRight size={12} /> Buka modul
                    </button>
                  </div>

                  <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 8 }}>
                    <div>
                      <div className="tiny muted upper" style={{ marginBottom: 2 }}>Masa berlaku terdaftar</div>
                      <div className="mono tiny" style={{ fontWeight: 700 }}>
                        {span ? span.from + ' – ' + (span.to || 'terbuka') : 'belum ada set'}
                        <span className="muted" style={{ fontWeight: 400 }}> · {c.sets.length} set</span>
                      </div>
                    </div>
                    <div>
                      <div className="tiny muted upper" style={{ marginBottom: 2 }}>Kadensi perubahan</div>
                      <div className="tiny">{c.cadence}</div>
                    </div>
                  </div>

                  {look.set && (
                    <div className="tiny muted" style={{ marginBottom: 6, lineHeight: 1.5 }}>
                      <b>Dasar:</b> {look.set.basis}
                      {look.set.sourceDoc
                        ? <> · <b>dicocokkan dengan</b> {look.set.sourceDoc}
                          {look.set.verifiedBy ? ' oleh ' + look.set.verifiedBy : ''}
                          {look.set.verifiedAt ? ' (' + look.set.verifiedAt + ')' : ''}</>
                        : <> · <b>belum ada dokumen sumber yang tercatat</b></>}
                    </div>
                  )}

                  {look.note && (
                    <div className="tiny" style={{ lineHeight: 1.55, color: look.blocked ? 'var(--red)' : 'var(--amber)', fontWeight: 600, marginBottom: 6 }}>
                      {look.note}
                    </div>
                  )}

                  <div className="panel" style={{ padding: '8px 10px', boxShadow: 'none', background: 'var(--surface-2)' }}>
                    <div className="tiny muted upper" style={{ marginBottom: 2 }}>Bila kedaluwarsa</div>
                    <div className="tiny" style={{ lineHeight: 1.55 }}>{c.breaksIfStale}</div>
                  </div>

                  {issues.length > 0 && (
                    <div className="tiny" style={{ marginTop: 6, color: 'var(--red)', lineHeight: 1.5 }}>
                      <b>Registry cacat:</b> {issues.join(' · ')}
                    </div>
                  )}
                </div>
              </Panel>
            );
          })}
        </div>
      </div></div>
    </>
  );
}

export { RegRefView };
