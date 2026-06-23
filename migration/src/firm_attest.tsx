/* ============================================================
   Asseris — Atestasi Mutu Firma (level FIRMA)
   ------------------------------------------------------------
   Komponen BERSAMA agar artefak mutu level-firma (mis. evaluasi
   tahunan SOQM ISQM 1 ¶53–54, deklarasi independensi) menjadi
   AUDITABLE: kesimpulan tertulis + rantai tanda tangan otoritas
   (RBAC-gated) + tanggal + periode — tersimpan & bertahan reload.

   SUMBER KEBENARAN: persist via `useAmsPersist('firmAttest.<key>')`
   (default scope 'firm', server-backed pasca-W6) — BUKAN `wpState`
   (itu engagement-scoped). Berdampingan dgn rekomendasi mesin (mis.
   kesimpulan ¶54 yg diturunkan dari data), tidak menggantikannya.
   Lock LUNAK: boleh dibuka kembali selama belum dikunci.
   ============================================================ */
import React from 'react';
import { useAmsPersist, useAuth } from './contexts';
import { I } from './icons';
import { Badge, Btn } from './ui';

const { useState: useStateFA } = React;

export type FaSigner = { by: string; at: string };
export type FaRole = { id: string; label: string; cap?: string; needsPrev?: string };
export type FaState = { period: string; conclusion: string; engineLabel: string; chain: Record<string, FaSigner> };
type FaSetter = (updater: FaState | ((prev: FaState) => FaState)) => void;

function faToday(): string {
  try { return new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch (e) { return ''; }
}

/* ---- hook: state atestasi firma per-key ---- */
function useFirmAttest(attestKey: string, period: string) {
  const auth = useAuth();
  const me: string = (auth && auth.user && auth.user.name) || 'Auditor';
  const can = (cap?: string): boolean => !cap || !auth || typeof auth.can !== 'function' || auth.can(cap);
  const init: FaState = { period, conclusion: '', engineLabel: '', chain: {} };
  const [state, setState] = useAmsPersist('firmAttest.' + attestKey, () => init) as [FaState, FaSetter];

  const sign = (roleId: string, engineLabel?: string) =>
    setState((s) => ({ ...s, engineLabel: engineLabel != null ? engineLabel : s.engineLabel,
      chain: { ...s.chain, [roleId]: { by: me, at: faToday() } } }));
  const unsign = (roleId: string) =>
    setState((s) => { const c = { ...s.chain }; delete c[roleId]; return { ...s, chain: c }; });
  const saveConclusion = (text: string) => setState((s) => ({ ...s, conclusion: text }));

  return { state, me, can, sign, unsign, saveConclusion };
}

/* ---- Kartu atestasi: kesimpulan tertulis + rantai sign-off berlapis ----
   `roles` urut; `needsPrev` mengikat lapis berikut menunggu lapis sebelumnya
   (mis. partner approve setelah self-declare). `engineLabel`/`engineHint` =
   rekomendasi mesin yg ditampilkan sbg konteks. */
function FirmAttestCard({ attestKey, period, roles, title, engineLabel, engineHint, placeholder }: {
  attestKey: string; period: string; roles: FaRole[]; title?: string;
  engineLabel?: string; engineHint?: string; placeholder?: string;
}) {
  const { state, can, sign, unsign, saveConclusion } = useFirmAttest(attestKey, period);
  const base = state.conclusion || '';
  const [text, setText] = useStateFA(base);
  const dirty = text !== base;
  const hasConclusion = !!base.trim();

  const renderLine = (role: FaRole) => {
    const who = state.chain[role.id];
    const prevOk = !role.needsPrev || !!state.chain[role.needsPrev];
    const allowed = can(role.cap);
    return (
      <div key={role.id} className="row ac gap8" style={{ padding: '7px 0' }}>
        <span style={{ width: 24, height: 24, borderRadius: '50%', flex: '0 0 24px', display: 'grid', placeItems: 'center',
          background: who ? 'var(--green-bg)' : 'var(--surface-3)', color: who ? 'var(--green)' : 'var(--ink-4)' }}>
          {who ? <I.check size={12} /> : <I.users size={11} />}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="tiny" style={{ fontWeight: 700 }}>{role.label}</div>
          {who ? <div className="tiny muted">{who.by} · {who.at}</div>
            : <div className="tiny muted">{prevOk ? (allowed ? 'belum ditandatangani' : 'menunggu otoritas yang berwenang') : 'menunggu lapis sebelumnya'}</div>}
        </div>
        {who
          ? <button className="btn sm" disabled={!allowed} onClick={() => unsign(role.id)} title="Buka kembali (lock lunak)"><I.sync size={11} /> Buka</button>
          : <Btn sm variant={prevOk && allowed && hasConclusion ? 'primary' : ''} disabled={!prevOk || !allowed || !hasConclusion}
              onClick={() => sign(role.id, engineLabel)}><I.check size={12} /> Sign-off</Btn>}
      </div>
    );
  };

  return (
    <div className="panel" style={{ padding: 14, boxShadow: 'none' }}>
      <div className="row jb ac" style={{ marginBottom: 8 }}>
        <span className="tiny muted upper" style={{ fontWeight: 700 }}>{title || 'Atestasi & Tanda Tangan'}</span>
        <Badge kind="blue">{state.period || period}</Badge>
      </div>
      {engineLabel && (
        <div className="tiny muted" style={{ marginBottom: 8, lineHeight: 1.45 }}>
          <I.shield size={11} /> Rekomendasi mesin: <b style={{ color: 'var(--ink-2)' }}>{engineLabel}</b>{engineHint ? ' — ' + engineHint : ''}. Penilaian penandatangan berdampingan dengan rekomendasi ini.
        </div>
      )}
      <textarea className="input" value={text} onChange={(e: { target: { value: string } }) => setText(e.target.value)}
        placeholder={placeholder || 'Kesimpulan & dasar pertimbangan penandatangan…'}
        style={{ height: 76, padding: 9, resize: 'vertical', lineHeight: 1.5, fontFamily: 'var(--ui)', width: '100%', marginBottom: 8 }} />
      <div className="row ac jb" style={{ marginBottom: 6 }}>
        {hasConclusion ? <span className="tiny muted"><I.check size={11} /> Kesimpulan tersimpan</span>
          : <span className="tiny muted">Belum ada kesimpulan tertulis</span>}
        <Btn sm variant={dirty && text.trim() ? 'primary' : ''} disabled={!dirty || !text.trim()}
          onClick={() => saveConclusion(text.trim())}><I.check size={12} /> Simpan kesimpulan</Btn>
      </div>
      {!hasConclusion && (
        <div className="tiny" style={{ color: 'var(--amber)', fontWeight: 600, marginBottom: 4 }}>
          <I.alert size={11} /> Tanda tangan terkunci hingga kesimpulan tertulis disimpan (ISQM 1 ¶53 — dasar evaluasi terdokumentasi).
        </div>
      )}
      <div style={{ borderTop: '1px solid var(--line-soft)', margin: '4px 0 2px' }} />
      {roles.map((r) => renderLine(r))}
    </div>
  );
}

Object.assign(window, { useFirmAttest, FirmAttestCard });

export { useFirmAttest, FirmAttestCard };
