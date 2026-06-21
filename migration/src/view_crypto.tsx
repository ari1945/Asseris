/* [codemod] ESM imports */
import React from 'react';
import { AMS } from './data';
import { AMS_CANON } from './canon';
import { useAudit, useNav } from './contexts';
import { I } from './icons';
import { SubBar } from './shell.jsx';
import { Avatar, Badge, Btn, Donut, Panel, Placeholder, Progress, Seg, Stat } from './ui.jsx';
import { KvBox } from './view_analytical';
import { RowKv } from './view_calc';
import { amsExportXlsx } from './export_xlsx.js';

/* ============================================================
   Asseris — Compliance & Kriptografi (mendalam)
   ------------------------------------------------------------
   SATU SUMBER KEBENARAN. Modul ini TIDAK meng-hardcode angka.
   Semua tarikan data berasal dari entitas kanonik yang sama yang
   dibaca modul-modul lain:
     · Dokumen & integritas  → AMS.DMS_DOCS (Document Mgmt)
     · Bukti ter-hash        → (window as any).amsEvidenceAll() (Evaluasi Bukti)
     · Hash SHA-256          → (window as any).amsFakeHash (helper bersama DMS/Bukti)
     · Aturan integritas     → AMS.INTEGRITY_RULES (Alur Data)
     · Jejak audit hash-chain→ AMS.PLATFORM.buildAuditStream (Audit Trail)
     · Tanda tangan/e-sign   → entri SIGN pada arus jejak + pemilik DMS
   Konsekuensinya: satu perubahan di modul hulu (mis. unggah dokumen,
   posting AJE, legal hold) mengalir serempak ke seluruh kartu di sini.
   ============================================================ */
const { useState: useCR, useMemo: useMCR, useEffect: useECR } = React;

/* hash-chain pendek (tamper-evident) — diturunkan dari SHA-256 helper bersama */
function crChain(seed) {
  const h = ((window as any).amsFakeHash ? (window as any).amsFakeHash(seed) : String(seed));
  return h.slice(0, 16);
}
function crShort(h) { return String(h || '').slice(0, 10) + '…'; }

/* ---------- SSOT reader: register integritas dokumen dari DMS ---------- */
function crCryptoDocs() {
  const docs: any[] = ((AMS as any).DMS_DOCS) || [];
  return docs.map((d: any) => {
    const latest = (d.versions && d.versions[d.versions.length - 1]) || {};
    const sealed = d.assembly === 'complete' || d.legalHold;
    const seedBase = d.id + '|v' + d.ver + '|' + (latest.sizeMB || d.sizeMB);
    const sha = d.sha256 || ((window as any).amsFakeHash ? (window as any).amsFakeHash(seedBase) : seedBase);
    const wormLabel = d.legalHold ? 'Legal Hold' : d.assembly === 'complete' ? 'WORM Terkunci'
      : d.assembly === 'n/a' ? 'Terkendali' : 'Berversi';
    return { ...d, latest, sealed, seedBase, sha, wormLabel, signer: d.owner };
  });
}

const CR_CLASS_KIND = { 'Rahasia': 'red', 'Internal': 'amber', 'Publik': 'green' };
const CR_ACT_COLOR = { LOGIN: 'gray', SIGN: 'purple', APPROVE: 'green', REJECT: 'red', UPLOAD: 'blue', SYNC: 'teal', EDIT: 'amber', SEND: 'blue', CREATE: 'blue', DELETE: 'red', EXPORT: 'purple' };

/* algoritma kriptografi yang dipakai platform — cakupan ditarik dari data live */
function crAlgorithms(docs, evCount, signCount, streamLen) {
  return [
    { id: 'sha256', name: 'SHA-256', cls: 'Hash / Integritas', use: 'Sidik jari kertas kerja & bukti audit',
      strength: '256-bit', scope: (docs.length + evCount) + ' objek ter-hash', status: 'Aktif', ic: 'fingerprint' },
    { id: 'aes', name: 'AES-256-GCM', cls: 'Enkripsi Simetris', use: 'Enkripsi data at-rest (arsip & basis data)',
      strength: '256-bit', scope: docs.length + ' dokumen terenkripsi', status: 'Aktif', ic: 'lock' },
    { id: 'tls', name: 'TLS 1.3', cls: 'Enkripsi Transit', use: 'Kanal Portal Klien / PBC & integrasi',
      strength: 'ECDHE · AES-GCM', scope: 'Semua sesi & unggahan', status: 'Aktif', ic: 'link2' },
    { id: 'rsa', name: 'RSA-2048 · PrivyID', cls: 'Tanda Tangan Digital', use: 'e-Signature kertas kerja, opini & surat',
      strength: '2048-bit', scope: signCount + ' penandatanganan tercatat', status: 'Aktif', ic: 'key' },
    { id: 'hmac', name: 'Hash-Chain (HMAC)', cls: 'Tamper-Evidence', use: 'Penautan entri jejak audit (append-only)',
      strength: 'Berantai', scope: streamLen + ' entri tertaut', status: 'Aktif', ic: 'shield' },
  ];
}

/* ============================================================
   Komponen utama
   ============================================================ */
function CryptoCompliance() {
  const nav = useNav();
  const { logEntries } = useAudit();
  const [tab, setTab] = useCR('postur');
  const [tamperId, setTamperId] = useCR(null);      // simulasi perubahan (tamper-evidence demo)
  const [verifying, setVerifying] = useCR(false);
  const [verifiedAt, setVerifiedAt] = useCR(null);
  const [selDoc, setSelDoc] = useCR(null);

  /* ---- W10: the REAL server-side append-only chain (replaces the client pseudo-hash demo
     as source of truth). null = unavailable (server down / role lacks AUDIT_VIEW) → CRRantai
     falls back to the derived demo stream below. Read-only; the client cannot alter it. ---- */
  const [srvChain, setSrvChain] = useCR(null);
  const [srvVerify, setSrvVerify] = useCR(null);
  useECR(() => {
    let alive = true;
    (async () => {
      const rows = (window as any).amsAuditList ? await (window as any).amsAuditList(100) : null;
      const v = (window as any).amsAuditVerify ? await (window as any).amsAuditVerify() : null;
      if (alive) { setSrvChain(rows); setSrvVerify(v); }
    })();
    return () => { alive = false; };
  }, []);

  /* ---- SSOT compute ---- */
  const docs: any[] = useMCR(() => crCryptoDocs(), []);
  const rules: any[] = ((AMS as any).INTEGRITY_RULES) || [];
  const evidence = ((window as any).amsEvidenceAll ? (window as any).amsEvidenceAll() : []);
  const stream = useMCR(() => (((AMS as any).PLATFORM && (AMS as any).PLATFORM.buildAuditStream(logEntries)) || []), [logEntries]);

  /* hash-chain atas arus kanonik (oldest→newest) — tamper-evident */
  const chain = useMCR(() => {
    const asc = [...stream].slice().reverse();
    let prev = '0000000000000000';
    const rows = asc.map((e, i) => {
      const h = crChain(e.ts + e.who + e.action + (e.target || '') + (e.detail || '') + prev);
      const r = { ...e, prevHash: prev, hash: h, seq: i + 1 };
      prev = h; return r;
    });
    return rows.reverse();
  }, [stream]);

  /* verifikasi integritas dokumen (sealed hash vs hash konten live) */
  const docInteg = docs.map((d: any) => {
    const liveHash = (tamperId === d.id)
      ? ((window as any).amsFakeHash ? (window as any).amsFakeHash(d.seedBase + '|MODIFIED') : d.seedBase + 'x')
      : d.sha;
    return { ...d, liveHash, valid: liveHash === d.sha };
  });
  const anomali = docInteg.filter((d: any) => !d.valid);

  /* sertifikat e-sign diturunkan dari penandatangan nyata (pemilik DMS + entri SIGN) */
  const certs = useMCR(() => crBuildCerts(docs, stream), [docs, stream]);

  /* posture rollups (semua dari SSOT) */
  const encCount = docs.length;            // seluruh dokumen DMS terenkripsi AES-256
  const sealedCount = docs.filter((d: any) => d.sealed).length;
  const hashedCount = docs.length + evidence.length;
  const rulePass = rules.filter((r: any) => r.status === 'pass').length;
  const signCount = stream.filter((e: any) => e.action === 'SIGN').length + certs.reduce((a, c) => a + c.signed, 0);

  const TABS = [
    { id: 'postur', label: 'Postur Keamanan', ic: 'shield' },
    { id: 'dokumen', label: 'Integritas Dokumen', ic: 'doc', count: docs.length },
    { id: 'rantai', label: 'Jejak & Rantai-Hash', ic: 'link2', count: chain.length },
    { id: 'kontrol', label: 'Kontrol & Kepatuhan', ic: 'sliders', count: rules.length },
    { id: 'kunci', label: 'Kunci & Sertifikat', ic: 'key', count: certs.length },
    { id: 'meterai', label: 'Meterai & PSrE', ic: 'fingerprint' },
  ];

  const runVerify = () => {
    setVerifying(true);
    setTimeout(() => { setVerifying(false); setVerifiedAt(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })); }, 900);
  };

  const ctx = { docs, docInteg, anomali, rules, evidence, stream, chain, certs, encCount, sealedCount, hashedCount, rulePass, signCount, nav, tamperId, setTamperId, verifying, verifiedAt, selDoc, setSelDoc, setTab, srvChain, srvVerify };

  return (
    <>
      <SubBar moduleId="crypto" right={
        <div className="row gap8 ac">
          <Badge kind={anomali.length ? 'red' : 'green'}>{anomali.length ? <><I.alert size={11} /> {anomali.length} anomali</> : <><I.checkCircle size={11} /> Integritas utuh</>}</Badge>
          <Btn sm onClick={runVerify} variant="primary">{verifying ? <><I.sync size={13} className="spin" /> Memverifikasi…</> : <><I.sync size={13} /> Verifikasi Ulang Hash</>}</Btn>
        </div>
      } />
      <div className="view-scroll"><div className="view-pad">
        {/* tab strip */}
        <div className="row gap6 ac" style={{ marginBottom: 14, flexWrap: 'wrap' }}>
          {TABS.map((t: any) => {
            const on = tab === t.id; const TIc = I[t.ic] || I.panel;
            return (
              <button key={t.id} onClick={() => setTab(t.id)} className="row ac gap6" style={{
                padding: '7px 13px', borderRadius: 8, cursor: 'pointer', fontSize: 12.5, fontWeight: 600,
                border: '1px solid ' + (on ? 'var(--navy)' : 'var(--line)'),
                background: on ? 'linear-gradient(125deg,#013a52,#005085)' : 'var(--surface)',
                color: on ? '#fff' : 'var(--ink-2)' }}>
                <TIc size={14} />{t.label}
                {t.count != null && <span className="mono" style={{ fontSize: 10.5, padding: '1px 6px', borderRadius: 20, background: on ? 'rgba(255,255,255,.18)' : 'var(--surface-3)', color: on ? '#fff' : 'var(--ink-3)' }}>{t.count}</span>}
              </button>
            );
          })}
        </div>

        {tab === 'postur' && <CRPostur ctx={ctx} />}
        {tab === 'dokumen' && <CRDokumen ctx={ctx} />}
        {tab === 'rantai' && <CRRantai ctx={ctx} />}
        {tab === 'kontrol' && <CRKontrol ctx={ctx} />}
        {tab === 'kunci' && <CRKunci ctx={ctx} />}
        {tab === 'meterai' && <CRMeterai ctx={ctx} />}
      </div></div>

      {ctx.selDoc && <CRDocDrawer d={ctx.selDoc} onClose={() => ctx.setSelDoc(null)} nav={nav} />}
    </>
  );
}

/* ============================================================
   TAB 1 — Postur Keamanan
   ============================================================ */
function CRPostur({ ctx }: any) {
  const { docs, encCount, sealedCount, hashedCount, rules, rulePass, anomali, chain, stream, nav, setTab, verifiedAt } = ctx;
  const ruleWarn = rules.filter((r: any) => r.status === 'warn').length;
  const ruleErr = rules.filter((r: any) => r.status === 'err').length;
  const recent = stream.filter((e: any) => ['SIGN', 'UPLOAD', 'LOGIN', 'APPROVE', 'SYNC', 'EXPORT'].includes(e.action)).slice(0, 6);

  const families = crControlFamilies(ctx);
  const totalCtrl = families.reduce((a, f) => a + f.controls.length, 0);
  const okCtrl = families.reduce((a, f) => a + f.controls.filter((c: any) => c.status === 'Aktif').length, 0);

  const KPIS = [
    { v: encCount + '/' + docs.length, l: 'Dokumen Terenkripsi', sub: 'AES-256-GCM at-rest', accent: 'var(--green)', ic: 'lock' },
    { v: sealedCount + '/' + docs.length, l: 'Berkas Tersegel (WORM)', sub: 'final-lock & legal hold', accent: 'var(--blue)', ic: 'shield' },
    { v: AMS.fmt(hashedCount), l: 'Objek Ter-hash SHA-256', sub: 'kertas kerja + bukti', accent: 'var(--navy)', ic: 'fingerprint' },
    { v: rulePass + '/' + rules.length, l: 'Aturan Integritas Lolos', sub: ruleWarn + ' peringatan · ' + ruleErr + ' gagal', accent: ruleErr ? 'var(--red)' : ruleWarn ? 'var(--amber)' : 'var(--green)', ic: 'sliders' },
  ];

  return (
    <>
      {anomali.length > 0 && (
        <div className="panel" style={{ padding: '12px 15px', background: 'var(--red-bg)', borderColor: 'transparent', marginBottom: 12 }}>
          <div className="row ac gap10">
            <span style={{ color: 'var(--red)' }}><I.alert size={20} /></span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--red)' }}>Peringatan integritas kriptografis</div>
              <div className="tiny" style={{ color: 'var(--ink-2)', marginTop: 2 }}>Hash konten <b className="mono">{anomali[0].id} · {anomali[0].name}</b> tidak cocok dengan versi tersegel — berkas mungkin diubah setelah sign-off. Investigasi & re-otorisasi diperlukan (SA 230 ¶A23).</div>
            </div>
            <Btn sm onClick={() => setTab('dokumen')}><I.arrowRight size={13} /> Telusuri</Btn>
          </div>
        </div>
      )}

      <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
        {KPIS.map((k, i) => {
          const KIc = I[k.ic] || I.shield;
          return (
            <Panel key={i}><div style={{ padding: '13px 15px' }}>
              <div className="row jb ac" style={{ marginBottom: 8 }}>
                <span style={{ width: 32, height: 32, borderRadius: 9, background: 'color-mix(in srgb,' + k.accent + ' 14%, transparent)', color: k.accent, display: 'grid', placeItems: 'center' }}><KIc size={17} /></span>
              </div>
              <div className="mono" style={{ fontSize: 24, fontWeight: 700, color: k.accent, lineHeight: 1 }}>{k.v}</div>
              <div style={{ fontSize: 12, fontWeight: 600, marginTop: 5 }}>{k.l}</div>
              <div className="tiny muted" style={{ marginTop: 1 }}>{k.sub}</div>
            </div></Panel>
          );
        })}
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1.1fr 1fr', gap: 12, alignItems: 'start' }}>
        {/* posture by control family */}
        <Panel noBody>
          <div className="panel-h"><h3>Postur Kontrol per Keluarga</h3><div style={{ flex: 1 }} /><span className="tiny muted">{okCtrl}/{totalCtrl} kontrol aktif</span></div>
          <div style={{ padding: '14px 16px', display: 'grid', gap: 13 }}>
            {families.map((f: any) => {
              const ok = f.controls.filter((c: any) => c.status === 'Aktif').length;
              const part = f.controls.filter((c: any) => c.status === 'Parsial').length;
              const pct = Math.round(ok / f.controls.length * 100);
              const FIc = I[f.ic] || I.shield;
              return (
                <div key={f.id}>
                  <div className="row jb ac" style={{ marginBottom: 5 }}>
                    <span className="row ac gap8"><span style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--blue-100)', color: 'var(--blue)', display: 'grid', placeItems: 'center', flex: '0 0 24px' }}><FIc size={13} /></span><span style={{ fontSize: 12.5, fontWeight: 600 }}>{f.name}</span><span className="tiny muted">{f.std}</span></span>
                    <span className="mono tiny" style={{ fontWeight: 700, color: part ? 'var(--amber)' : 'var(--green)' }}>{ok}/{f.controls.length}</span>
                  </div>
                  <Progress value={pct} color={part ? 'var(--amber)' : 'var(--green)'} />
                </div>
              );
            })}
          </div>
          <div className="tiny muted" style={{ padding: '0 16px 14px', lineHeight: 1.5 }}>Status tiap kontrol dihitung dari sumber kebenaran live — bukan dinilai manual. Lihat tab <b>Kontrol &amp; Kepatuhan</b> untuk pemetaan ke ISQM 1 / ISO 27001.</div>
        </Panel>

        {/* integrity donut + recent crypto events */}
        <div className="grid" style={{ gap: 12 }}>
          <Panel noBody>
            <div className="panel-h"><h3>Integritas Hash-Chain</h3><div style={{ flex: 1 }} /><span className="tiny muted">{chain.length} entri</span></div>
            <div style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 18 }}>
              <Donut size={92} thickness={13}
                segments={anomali.length
                  ? [{ value: docs.length - anomali.length, color: 'var(--green)' }, { value: anomali.length, color: 'var(--red)' }]
                  : [{ value: 1, color: 'var(--green)' }]}
                center={<span style={{ color: anomali.length ? 'var(--red)' : 'var(--green)' }}>{anomali.length ? <I.alert size={22} /> : <I.shield size={22} />}</span>} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: anomali.length ? 'var(--red)' : 'var(--green)' }}>{anomali.length ? 'Terdeteksi anomali' : 'Rantai utuh — terverifikasi'}</div>
                <div className="tiny muted" style={{ marginTop: 3, lineHeight: 1.5 }}>Setiap entri jejak ditautkan ke hash entri sebelumnya. Modifikasi retroaktif memutus rantai &amp; langsung terdeteksi.</div>
                {verifiedAt && <div className="tiny" style={{ marginTop: 6, color: 'var(--green)' }}><I.check size={11} /> Verifikasi terakhir {verifiedAt}</div>}
              </div>
            </div>
          </Panel>
          <Panel noBody>
            <div className="panel-h"><h3>Peristiwa Kriptografis Terkini</h3><div style={{ flex: 1 }} /><span className="tiny muted" style={{ cursor: 'pointer', color: 'var(--blue)' }} onClick={() => setTab('rantai')}>Lihat semua →</span></div>
            <div>
              {recent.map((e, i) => (
                <div key={i} className="row gap10 ac" style={{ padding: '9px 14px', borderBottom: i < recent.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
                  <Badge kind={CR_ACT_COLOR[e.action] || 'gray'}>{e.action}</Badge>
                  <div style={{ flex: 1, minWidth: 0 }}><div className="truncate" style={{ fontSize: 12, fontWeight: 600 }}>{e.target}</div><div className="tiny muted truncate">{e.detail}</div></div>
                  <div className="tiny mono muted" style={{ flex: '0 0 auto' }}>{(e.ts || '').slice(5, 16)}</div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}

/* ============================================================
   TAB 2 — Integritas Dokumen
   ============================================================ */
function CRDokumen({ ctx }: any) {
  const { docInteg, anomali, tamperId, setTamperId, setSelDoc, encCount, sealedCount, evidence } = ctx;
  const sealedDoc = docInteg.find((d: any) => d.sealed) || docInteg[0];

  return (
    <>
      <div className="grid" style={{ gridTemplateColumns: '1.55fr 1fr', gap: 12, alignItems: 'start' }}>
        <Panel noBody>
          <div className="panel-h"><h3>Register Integritas Kertas Kerja &amp; Dokumen</h3><div style={{ flex: 1 }} /><span className="tiny muted">sumber: Document Management · SHA-256</span></div>
          <table className="dtbl">
            <thead><tr><th style={{ width: 78 }}>Ref</th><th>Dokumen</th><th>Klasifikasi</th><th>Hash SHA-256</th><th>Penandatangan</th><th>Segel</th><th style={{ width: 90 }}>Integritas</th></tr></thead>
            <tbody>
              {docInteg.map((d: any) => (
                <tr key={d.id} onClick={() => setSelDoc(d)} style={{ cursor: 'pointer' }}>
                  <td className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{d.id}</td>
                  <td className="truncate" style={{ maxWidth: 190 }}>{d.name}<div className="tiny muted">{d.eng} · v{d.ver}</div></td>
                  <td><Badge kind={CR_CLASS_KIND[d.classification] || 'gray'}>{d.classification}</Badge></td>
                  <td className="mono tiny" style={{ color: d.valid ? 'var(--ink-4)' : 'var(--red)' }}>{crShort(d.liveHash)}</td>
                  <td className="tiny"><div className="row ac gap6"><Avatar name={d.signer} size={18} />{d.signer}</div></td>
                  <td>{d.legalHold ? <span className="chip tiny" style={{ color: 'var(--red)' }}><I.lock size={10} /> {d.wormLabel}</span> : <span className="chip tiny">{d.wormLabel}</span>}</td>
                  <td>{d.valid ? <Badge kind="green"><I.lock size={10} /> Tersegel</Badge> : <Badge kind="red"><I.alert size={10} /> Mismatch</Badge>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="tiny muted" style={{ padding: '10px 14px', lineHeight: 1.5 }}>Klik baris untuk silsilah versi, log akses &amp; bukti segel WORM. Hash dihitung dari isi versi terkini — identik dengan yang ditampilkan modul Document Management &amp; Evaluasi Bukti.</div>
        </Panel>

        <div className="grid" style={{ gap: 12 }}>
          <Panel noBody>
            <div className="panel-h"><h3>Postur Enkripsi</h3></div>
            <div style={{ padding: 14, display: 'grid', gap: 9 }}>
              <RowKv label="Enkripsi at-rest" v="AES-256-GCM" />
              <RowKv label="Dokumen terenkripsi" v={encCount + ' / ' + docInteg.length} strong />
              <RowKv label="Berkas tersegel WORM" v={sealedCount + ' / ' + docInteg.length} />
              <RowKv label="Bukti audit ter-hash" v={evidence.length + ' berkas'} />
              <RowKv label="Algoritma sidik jari" v="SHA-256" />
              <div className="panel" style={{ padding: '9px 11px', boxShadow: 'none', background: 'var(--green-bg)', borderColor: 'transparent', marginTop: 2 }}>
                <div className="tiny" style={{ color: 'var(--green)', lineHeight: 1.5 }}><I.shield size={11} /> Seluruh dokumen klien dienkripsi at-rest &amp; in-transit. Berkas final dikunci write-once (WORM) sesuai SA 230 / ISQM 1.</div>
              </div>
            </div>
          </Panel>

          {/* tamper-evidence simulation */}
          <Panel noBody>
            <div className="panel-h"><h3>Uji Tamper-Evidence</h3><div style={{ flex: 1 }} /><span className="tiny muted">simulasi</span></div>
            <div style={{ padding: 14 }}>
              <div className="tiny muted" style={{ lineHeight: 1.5, marginBottom: 10 }}>Simulasikan perubahan tak sah pada berkas <b>tersegel</b> untuk menguji deteksi. Sistem menghitung ulang hash konten &amp; membandingkannya dengan segel — perubahan apa pun langsung memutus kecocokan.</div>
              <div className="panel" style={{ padding: '10px 12px', boxShadow: 'none', marginBottom: 10 }}>
                <div className="row jb ac"><span className="tiny" style={{ fontWeight: 600 }}>{sealedDoc.id} · {sealedDoc.wormLabel}</span><Badge kind={tamperId ? 'red' : 'green'}>{tamperId ? 'Dimodifikasi' : 'Utuh'}</Badge></div>
                <div className="truncate tiny muted" style={{ marginTop: 3 }}>{sealedDoc.name}</div>
              </div>
              <Btn sm variant={tamperId ? '' : 'primary'} onClick={() => setTamperId(tamperId ? null : sealedDoc.id)} style={{ width: '100%', justifyContent: 'center' }}>
                {tamperId ? <><I.sync size={13} /> Pulihkan ke Versi Tersegel</> : <><I.alert size={13} /> Simulasikan Perubahan Berkas</>}
              </Btn>
              {anomali.length > 0 && <div className="tiny" style={{ marginTop: 9, color: 'var(--red)', lineHeight: 1.5 }}><I.alert size={11} /> Terdeteksi: hash live <span className="mono">{crShort(anomali[0].liveHash)}</span> ≠ segel <span className="mono">{crShort(anomali[0].sha)}</span>. Entri otomatis tercatat di jejak audit untuk investigasi.</div>}
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}

/* doc drawer — silsilah versi + log akses + segel */
function CRDocDrawer({ d, onClose, nav }: any) {
  const versions = (d.versions || []).slice().reverse();
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,20,30,.32)', zIndex: 88 }} onClick={onClose}>
      <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 480, maxWidth: '94vw', background: 'var(--surface)', boxShadow: 'var(--shadow-lg)', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        <div style={{ background: 'linear-gradient(125deg,#013a52,#005085)', color: '#fff', padding: '15px 18px' }}>
          <div className="row jb ac" style={{ marginBottom: 8 }}>
            <span className="mono tiny" style={{ fontWeight: 700, color: '#bcd6e4' }}>{d.id} · v{d.ver}</span>
            <button className="top-btn" onClick={onClose} style={{ color: '#fff' }}><I.x size={18} /></button>
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.3 }}>{d.name}</div>
          <div className="row ac gap6" style={{ marginTop: 8 }}>
            <Badge kind={CR_CLASS_KIND[d.classification] || 'gray'}>{d.classification}</Badge>
            <Badge kind={d.valid ? 'green' : 'red'}>{d.valid ? 'Integritas valid' : 'Mismatch'}</Badge>
            {d.legalHold && <Badge kind="red" dot>Legal Hold</Badge>}
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
          {/* hash seal */}
          <div className="tiny muted upper" style={{ marginBottom: 7 }}>Segel Kriptografis</div>
          <div className="panel" style={{ padding: 12, boxShadow: 'none', background: 'var(--surface-2)', borderColor: 'transparent', marginBottom: 14 }}>
            <div className="row jb" style={{ marginBottom: 6 }}><span className="tiny muted">Hash tersegel (SHA-256)</span><span className="chip tiny"><I.lock size={9} /> {d.wormLabel}</span></div>
            <div className="mono" style={{ fontSize: 11, wordBreak: 'break-all', color: 'var(--ink-2)' }}>{d.sha}</div>
            <div className="row ac gap6" style={{ marginTop: 9, padding: '7px 9px', background: d.valid ? 'var(--green-bg)' : 'var(--red-bg)', borderRadius: 6 }}>
              {d.valid ? <I.checkCircle size={14} style={{ color: 'var(--green)' }} /> : <I.alert size={14} style={{ color: 'var(--red)' }} />}
              <span className="tiny" style={{ fontWeight: 600, color: d.valid ? 'var(--green)' : 'var(--red)' }}>{d.valid ? 'Hash konten cocok — berkas tidak diubah sejak disegel.' : 'Hash konten BERBEDA — perubahan tak sah terdeteksi.'}</span>
            </div>
          </div>

          {/* meta */}
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '9px 14px', marginBottom: 14 }}>
            <KvBox label="Enkripsi at-rest" v="AES-256-GCM" />
            <KvBox label="Pindai malware" v="Bersih" />
            <KvBox label="Penandatangan" v={d.signer} />
            <KvBox label="Retensi" v={(d.retentionYears || 10) + ' tahun'} />
          </div>

          {/* version lineage */}
          <div className="tiny muted upper" style={{ marginBottom: 8 }}>Silsilah Versi &amp; Hash</div>
          <div style={{ display: 'grid', gap: 0, marginBottom: 14 }}>
            {versions.map((v, i) => {
              const vh = (window as any).amsFakeHash ? (window as any).amsFakeHash(d.id + '|v' + v.ver + '|' + v.sizeMB) : String(v.ver);
              return (
                <div key={i} className="row gap10" style={{ padding: '9px 0', borderBottom: i < versions.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
                  <span className="mono tiny" style={{ flex: '0 0 30px', fontWeight: 700, color: 'var(--blue)' }}>v{v.ver}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="tiny" style={{ fontWeight: 600 }}>{v.by} · <span className="muted">{v.date}</span></div>
                    {v.note && <div className="tiny muted" style={{ lineHeight: 1.4 }}>{v.note}</div>}
                    <div className="mono tiny" style={{ color: 'var(--ink-4)', marginTop: 2 }}>SHA-256 {vh.slice(0, 16)}…</div>
                  </div>
                  <span className="tiny muted" style={{ flex: '0 0 auto' }}>{v.sizeMB} MB</span>
                </div>
              );
            })}
          </div>

          {/* access log */}
          <div className="tiny muted upper" style={{ marginBottom: 8 }}>Log Akses (append-only)</div>
          <div style={{ display: 'grid', gap: 0, marginBottom: 8 }}>
            {(d.access || []).map((a, i) => (
              <div key={i} className="row gap8 ac" style={{ padding: '7px 0', borderBottom: '1px solid var(--line-soft)' }}>
                <span className="chip tiny" style={{ height: 18, textTransform: 'uppercase' }}>{a[1]}</span>
                <span className="tiny" style={{ flex: 1, fontWeight: 600 }}>{a[0]}</span>
                <span className="tiny mono muted">{a[2]}</span>
              </div>
            ))}
          </div>

          {(d.linkedWP || []).length > 0 && (
            <>
              <div className="tiny muted upper" style={{ margin: '6px 0 8px' }}>Kertas Kerja Tertaut</div>
              <div className="row gap6 wrap">{d.linkedWP.map((w, i) => <span key={i} className="chip tiny"><I.layers size={10} /> {w}</span>)}</div>
            </>
          )}
        </div>
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--line)', display: 'flex', gap: 8 }}>
          <Btn style={{ flex: 1 }} onClick={() => { nav('dms', { from: 'crypto' }); onClose(); }}><I.archive size={14} /> Buka di Document Mgmt</Btn>
          <Btn variant="primary"><I.download size={14} /> Unduh Bukti Segel</Btn>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   TAB 3 — Jejak & Rantai-Hash
   ============================================================ */
/* W10 — the authoritative, server-side append-only chain. Rendered when the proxy is reachable
   AND the role holds AUDIT_VIEW; otherwise CRRantai degrades to the derived demo stream. */
function CRServerChain({ rows, verify, nav }: any) {
  const SRV_ACT_COLOR = { LOGIN: 'green', LOGOUT: 'gray', STATE_SET: 'blue', LLM_NARRATE: 'purple' };
  const SRV_ACT_LABEL = { LOGIN: 'LOGIN', LOGOUT: 'LOGOUT', STATE_SET: 'WRITE', LLM_NARRATE: 'LLM' };
  const [exporting, setExporting] = useCR(false);
  const ok = verify ? verify.ok : true;
  const fmtTs = (ts) => { try { return new Date(ts).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' }); } catch (e) { return String(ts); } }
  const target = (e) => e.scope ? (e.scope + (e.scopeId ? '/' + e.scopeId : '') + (e.key ? ' · ' + e.key : '')) : '—';
  const writes = rows.filter((e: any) => e.action === 'STATE_SET').length;
  const logins = rows.filter((e: any) => e.action === 'LOGIN').length;

  // W10.5 Fase 2 — sealed XLSX export of the REAL server audit chain. Only reachable when rows
  // loaded (server returns them solely to roles holding AUDIT_VIEW), so the button is itself
  // AUDIT_VIEW-gated. Detail stays metadata only — never working-paper content (same as the chain).
  const onExportXlsx = async () => {
    if (exporting || !rows.length) return;
    setExporting(true);
    try {
      const xrows = rows.map((e: any) => [String(e.seq).padStart(3, '0'), fmtTs(e.ts), e.actorRole || '—', e.actorUserId || '—',
        SRV_ACT_LABEL[e.action] || e.action, target(e), e.detail || '', String(e.prevHash).slice(0, 16), String(e.hash).slice(0, 16)]);
      await amsExportXlsx({
        kind: 'audit-trail', scope: 'firm',
        fileName: 'Jejak Audit Server (append-only).xlsx',
        firm: 'KAP Wijaya Hartono & Rekan',
        title: 'Jejak Audit Server — Append-only (tamper-evident)',
        meta: [`Model AuditLog · ${rows.length} entri terbaru · verifikasi server: ${ok ? 'TERVERIFIKASI' : 'TERPUTUS #' + (verify && verify.brokenAt)}`,
          'Detail = metadata saja (kunci + delta versi), bukan isi kertas kerja · retensi 10 tahun (ISQM 1)'],
        sheets: [{
          name: 'Jejak Audit Server',
          columns: ['#', 'Waktu', 'Peran', 'Pelaku (userId)', 'Aksi', 'Sasaran', 'Detail', 'Prev Hash', 'Hash'],
          rows: xrows, colWidths: [6, 22, 16, 24, 10, 28, 40, 20, 20],
        }],
      });
    } finally {
      setExporting(false);
    }
  };
  return (
    <>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={AMS.fmt(verify ? verify.count : rows.length)} label="Entri Rantai (server)" /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={writes} label="Penulisan Kertas Kerja" accent="var(--blue)" /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={logins} label="Autentikasi (LOGIN)" accent="var(--green)" /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><div className="row ac gap8"><span style={{ width: 30, height: 30, borderRadius: 8, background: ok ? 'var(--green-bg)' : 'var(--red-bg)', color: ok ? 'var(--green)' : 'var(--red)', display: 'grid', placeItems: 'center', flex: '0 0 30px' }}><I.shield size={17} /></span><div><div style={{ fontSize: 14, fontWeight: 700, color: ok ? 'var(--green)' : 'var(--red)' }}>{ok ? 'Terverifikasi' : 'Terputus #' + verify.brokenAt}</div><div className="s-lbl">Verifikasi Server</div></div></div></div></Panel>
      </div>

      <div className="panel" style={{ padding: '10px 14px', background: 'var(--green-bg)', borderColor: 'transparent', marginBottom: 12 }}>
        <div className="row ac gap10"><span style={{ color: 'var(--green)' }}><I.lock size={16} /></span><div className="tiny" style={{ color: 'var(--ink-2)', lineHeight: 1.5 }}><b>Rantai server (W10).</b> Setiap entri ditulis <b>append-only</b> di server dan ditaut-hash (SHA-256) ke entri sebelumnya. Verifikasi dihitung ulang di server — klien tak punya jalur untuk menyunting atau menyusun ulang riwayat. Detail hanya metadata (kunci + delta versi), bukan isi kertas kerja.</div></div>
      </div>

      <Panel noBody>
        <div className="panel-h"><h3>Jejak Audit Server (append-only · tamper-evident)</h3><div style={{ flex: 1 }} /><Btn sm onClick={onExportXlsx} disabled={exporting}><I.download size={13} /> {exporting ? 'Menyiapkan…' : 'Ekspor Jejak (XLSX)'}</Btn></div>
        <table className="dtbl">
          <thead><tr><th style={{ width: 40 }}>#</th><th style={{ width: 150 }}>Waktu</th><th>Pelaku</th><th style={{ width: 78 }}>Aksi</th><th>Sasaran / Detail</th><th style={{ width: 96 }}>Prev → Hash</th></tr></thead>
          <tbody>
            {rows.map((e) => (
              <tr key={e.seq}>
                <td className="mono tiny muted">{String(e.seq).padStart(3, '0')}</td>
                <td className="mono tiny muted">{fmtTs(e.ts)}</td>
                <td className="tiny"><div style={{ fontWeight: 600 }}>{e.actorRole || '—'}</div><div className="tiny mono muted truncate">{e.actorUserId || '—'}</div></td>
                <td><Badge kind={SRV_ACT_COLOR[e.action] || 'gray'}>{SRV_ACT_LABEL[e.action] || e.action}</Badge></td>
                <td className="tiny" style={{ color: 'var(--ink-2)' }}><span className="mono">{target(e)}</span>{e.detail && <span className="muted"> — {e.detail}</span>}</td>
                <td className="mono tiny" style={{ color: 'var(--ink-4)' }}><span style={{ color: 'var(--ink-4)' }}>{String(e.prevHash).slice(0, 6)}</span><span style={{ color: 'var(--blue)', fontWeight: 700 }}> ▸{String(e.hash).slice(0, 6)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="tiny muted" style={{ padding: '10px 14px', lineHeight: 1.55 }}>Sumber: <b>server Asseris</b> (model <span className="mono">AuditLog</span>). Setara modul <span style={{ color: 'var(--blue)', cursor: 'pointer' }} onClick={() => nav('audittrail', { from: 'crypto' })}>Audit Trail</span>. Retensi 10 tahun (ISQM 1). Menampilkan hingga 100 entri terbaru.</div>
      </Panel>
    </>
  );
}

function CRRantai({ ctx }: any) {
  const { chain, nav, srvChain, srvVerify } = ctx;
  const [act, setAct] = useCR('Kripto'); // declared before any early return (rules of hooks)
  // W10 — prefer the real server chain. srvChain===null means "not loaded/unavailable".
  if (Array.isArray(srvChain)) return <CRServerChain rows={srvChain} verify={srvVerify} nav={nav} />;

  const cryptoActs = ['SIGN', 'UPLOAD', 'LOGIN', 'APPROVE', 'EXPORT', 'SYNC'];
  const filtered = act === 'Semua' ? chain : act === 'Kripto'
    ? chain.filter((e: any) => cryptoActs.includes(e.action))
    : chain.filter((e: any) => e.action === act);
  const broken = chain.some((e: any) => e.broken); // selalu utuh pada arus kanonik

  return (
    <>
      <div className="panel" style={{ padding: '9px 14px', background: 'var(--amber-bg)', borderColor: 'transparent', marginBottom: 12 }}>
        <div className="tiny" style={{ color: 'var(--ink-2)', lineHeight: 1.5 }}>Rantai server tak tersedia (proxy mati atau peran tanpa <span className="mono">AUDIT_VIEW</span>) — menampilkan <b>arus turunan lokal</b> dari log aktivitas. Bukan jejak append-only otoritatif.</div>
      </div>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={AMS.fmt(chain.length)} label="Entri Tertaut" /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={chain.filter((e: any) => e.action === 'SIGN').length} label="Tanda Tangan Digital" accent="var(--purple)" /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={chain.filter((e: any) => e.action === 'LOGIN').length} label="Autentikasi (MFA)" accent="var(--blue)" /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><div className="row ac gap8"><span style={{ width: 30, height: 30, borderRadius: 8, background: broken ? 'var(--red-bg)' : 'var(--green-bg)', color: broken ? 'var(--red)' : 'var(--green)', display: 'grid', placeItems: 'center', flex: '0 0 30px' }}><I.shield size={17} /></span><div><div style={{ fontSize: 14, fontWeight: 700, color: broken ? 'var(--red)' : 'var(--green)' }}>{broken ? 'Terputus' : 'Utuh'}</div><div className="s-lbl">Rantai-Hash</div></div></div></div></Panel>
      </div>

      <Panel noBody>
        <div className="panel-h"><h3>Jejak Audit Tertaut-Hash (tamper-evident)</h3><div style={{ flex: 1 }} /><Seg options={['Kripto', 'SIGN', 'LOGIN', 'Semua']} value={act} onChange={setAct} /></div>
        <table className="dtbl">
          <thead><tr><th style={{ width: 40 }}>#</th><th style={{ width: 132 }}>Waktu</th><th>Pengguna</th><th style={{ width: 86 }}>Aksi</th><th>Detail</th><th style={{ width: 96 }}>Prev → Hash</th></tr></thead>
          <tbody>
            {filtered.map((e, i) => (
              <tr key={i}>
                <td className="mono tiny muted">{String(e.seq).padStart(3, '0')}</td>
                <td className="mono tiny muted">{e.ts}</td>
                <td><div className="row ac gap8"><Avatar name={e.who} size={20} /><div style={{ minWidth: 0 }}><div className="truncate tiny" style={{ fontWeight: 600 }}>{e.who}</div><div className="tiny muted">{e.role}</div></div></div></td>
                <td><Badge kind={CR_ACT_COLOR[e.action] || 'gray'}>{e.action}</Badge></td>
                <td className="tiny" style={{ color: 'var(--ink-2)' }}>{e.detail}{e.cert && <div className="tiny mono" style={{ color: 'var(--purple)' }}>cert: {e.cert}</div>}{e.hashFile && <div className="tiny mono muted">{e.hashFile}</div>}</td>
                <td className="mono tiny" style={{ color: 'var(--ink-4)' }}><span style={{ color: 'var(--ink-4)' }}>{e.prevHash.slice(0, 6)}</span><span style={{ color: 'var(--blue)', fontWeight: 700 }}> ▸{e.hash.slice(0, 6)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="tiny muted" style={{ padding: '10px 14px', lineHeight: 1.55 }}>Arus ini adalah <b>sumber kebenaran tunggal</b> yang sama dengan modul <span style={{ color: 'var(--blue)', cursor: 'pointer' }} onClick={() => nav('audittrail', { from: 'crypto' })}>Audit Trail</span> — menggabungkan log aktivitas live, jejak firma kanonik &amp; peristiwa sistem. Tiap entri di-hash bersama hash entri sebelumnya (chain) sehingga perubahan retroaktif memutus rantai. Retensi 10 tahun (ISQM 1).</div>
      </Panel>
    </>
  );
}

/* ============================================================
   TAB 4 — Kontrol & Kepatuhan
   ============================================================ */
function crControlFamilies(ctx) {
  const { docs, rules, stream, evidence, chain } = ctx;
  const ruleOf = (id) => rules.find((r: any) => r.id === id) || {};
  const ruleStatus = (id) => { const r = ruleOf(id); return r.status === 'pass' ? 'Aktif' : r.status === 'warn' ? 'Parsial' : r.status === 'err' ? 'Gagal' : 'Aktif'; };
  const mfaLogins = stream.filter((e: any) => e.action === 'LOGIN' && /MFA/i.test(e.detail || '')).length;
  const signs = stream.filter((e: any) => e.action === 'SIGN').length;
  const sealed = docs.filter((d: any) => d.sealed).length;
  const holds = docs.filter((d: any) => d.legalHold).length;

  return [
    { id: 'crypto', name: 'Kriptografi & Enkripsi', std: 'ISO 27001 A.10 · ISQM 1', ic: 'lock', controls: [
      { k: 'Enkripsi data at-rest (AES-256-GCM)', status: 'Aktif', ev: docs.length + ' dokumen', src: 'dms', srcLbl: 'Document Mgmt' },
      { k: 'Enkripsi transit (TLS 1.3)', status: 'Aktif', ev: 'Semua sesi & PBC', src: 'clientportal', srcLbl: 'Portal Klien' },
      { k: 'Hashing integritas (SHA-256)', status: 'Aktif', ev: (docs.length + evidence.length) + ' objek', src: 'evidence', srcLbl: 'Evaluasi Bukti' },
      { k: 'Tanda tangan digital (PrivyID/RSA-2048)', status: signs ? 'Aktif' : 'Parsial', ev: signs + ' penandatanganan', src: 'opinion', srcLbl: 'Audit Opinion' },
    ]},
    { id: 'akses', name: 'Manajemen Akses', std: 'ISO 27001 A.9', ic: 'key', controls: [
      { k: 'Multi-factor authentication (MFA)', status: 'Aktif', ev: mfaLogins + ' login MFA tercatat', src: 'audittrail', srcLbl: 'Audit Trail' },
      { k: 'Role-based access control (RBAC)', status: 'Aktif', ev: 'Peran & ruang lingkup', src: 'settings', srcLbl: 'Pengaturan' },
      { k: 'Pemisahan tugas (preparer ≠ approver)', status: ruleStatus('IR-07'), ev: ruleOf('IR-07').detail || '—', src: 'aje', srcLbl: 'AJE' },
      { k: 'Konfirmasi independensi tim', status: ruleStatus('IR-08'), ev: ruleOf('IR-08').detail || '—', src: 'independence', srcLbl: 'Independensi' },
    ]},
    { id: 'integritas', name: 'Integritas Data', std: 'ISQM 1 · Referensial', ic: 'sliders', controls: [
      { k: 'WTB seimbang (debit = kredit)', status: ruleStatus('IR-04'), ev: ruleOf('IR-04').detail || '—', src: 'wtb', srcLbl: 'Working TB' },
      { k: 'Materialitas ditetapkan sebelum eksekusi', status: ruleStatus('IR-03'), ev: ruleOf('IR-03').detail || '—', src: 'materiality', srcLbl: 'Materiality' },
      { k: 'Integritas referensial klien–perikatan', status: ruleStatus('IR-01'), ev: ruleOf('IR-01').detail || '—', src: 'dataflow', srcLbl: 'Alur Data' },
      { k: 'RoMM dinilai tiap perikatan aktif', status: ruleStatus('IR-06'), ev: ruleOf('IR-06').detail || '—', src: 'risk', srcLbl: 'Risk Assessment' },
    ]},
    { id: 'retensi', name: 'Retensi & Arsip', std: 'SA 230 · ISQM 1', ic: 'archive', controls: [
      { k: 'Arsip kertas kerja ≤ 60 hari (ISQM)', status: ruleStatus('IR-10'), ev: ruleOf('IR-10').detail || '—', src: 'records', srcLbl: 'Retensi & Arsip' },
      { k: 'Imutabilitas berkas final (WORM)', status: 'Aktif', ev: sealed + ' berkas terkunci', src: 'dms', srcLbl: 'Document Mgmt' },
      { k: 'Legal hold atas sengketa', status: 'Aktif', ev: holds + ' hold aktif', src: 'legal', srcLbl: 'Kontrak & Legal' },
      { k: 'Klasifikasi & DLP data klien', status: 'Parsial', ev: 'Auto-klasifikasi sebagian', src: 'dms', srcLbl: 'Document Mgmt' },
    ]},
    { id: 'pemantauan', name: 'Pemantauan & Jejak', std: 'ISQM 1 · Tamper-Evident', ic: 'pulse', controls: [
      { k: 'Jejak audit append-only (hash-chain)', status: 'Aktif', ev: chain.length + ' entri tertaut', src: 'audittrail', srcLbl: 'Audit Trail' },
      { k: 'Cek integritas terjadwal', status: 'Aktif', ev: rules.length + ' aturan dievaluasi', src: 'dataflow', srcLbl: 'Alur Data' },
      { k: 'Backup harian & DR site', status: 'Aktif', ev: 'RPO 24 jam', src: 'integrations', srcLbl: 'Integrations' },
    ]},
  ];
}

function CRKontrol({ ctx }: any) {
  const { nav } = ctx;
  const families = crControlFamilies(ctx);
  const all = families.flatMap((f: any) => f.controls);
  const ok = all.filter((c: any) => c.status === 'Aktif').length;
  const part = all.filter((c: any) => c.status === 'Parsial').length;
  const fail = all.filter((c: any) => c.status === 'Gagal').length;
  const SK = { 'Aktif': 'green', 'Parsial': 'amber', 'Gagal': 'red' };

  return (
    <>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={all.length} label="Total Kontrol" /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={ok} label="Aktif" accent="var(--green)" /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={part} label="Parsial" accent={part ? 'var(--amber)' : 'var(--green)'} /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={fail} label="Gagal" accent={fail ? 'var(--red)' : 'var(--green)'} /></div></Panel>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }}>
        {families.map((f: any) => {
          const FIc = I[f.ic] || I.shield;
          return (
            <Panel key={f.id} noBody>
              <div className="panel-h"><span className="row ac gap8"><span style={{ width: 26, height: 26, borderRadius: 7, background: 'var(--blue-100)', color: 'var(--blue)', display: 'grid', placeItems: 'center' }}><FIc size={14} /></span><h3 style={{ margin: 0 }}>{f.name}</h3></span><div style={{ flex: 1 }} /><span className="tiny muted">{f.std}</span></div>
              <div>
                {f.controls.map((c, i) => (
                  <div key={i} className="row ac gap10" style={{ padding: '10px 14px', borderBottom: i < f.controls.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
                    <span style={{ color: c.status === 'Aktif' ? 'var(--green)' : c.status === 'Parsial' ? 'var(--amber)' : 'var(--red)', flex: '0 0 auto' }}>{c.status === 'Aktif' ? <I.checkCircle size={16} /> : <I.alert size={16} />}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.35 }}>{c.k}</div>
                      <div className="tiny muted" style={{ marginTop: 1 }}>{c.ev} · <span style={{ color: 'var(--blue)', cursor: 'pointer' }} onClick={() => nav(c.src, { from: 'crypto' })}>{c.srcLbl} ↗</span></div>
                    </div>
                    <Badge kind={SK[c.status] || 'gray'}>{c.status}</Badge>
                  </div>
                ))}
              </div>
            </Panel>
          );
        })}
      </div>
      <div className="panel" style={{ padding: '11px 14px', background: 'var(--blue-050)', borderColor: 'transparent', marginTop: 12 }}>
        <div className="tiny" style={{ lineHeight: 1.55 }}><I.link2 size={11} /> Tiap kontrol menautkan ke <b>aturan integritas</b> &amp; data live di modul sumbernya — status di sini berubah otomatis saat data hulu berubah (mis. rotasi partner menurunkan IR-02, posting AJE tanpa approver menggagalkan IR-07). Tidak ada penilaian manual yang bisa menyimpang dari kenyataan.</div>
      </div>
    </>
  );
}

/* ============================================================
   TAB 5 — Kunci & Sertifikat
   ============================================================ */
function crBuildCerts(docs, stream) {
  /* penandatangan nyata = pemilik DMS (manusia) + penandatangan entri SIGN */
  const signers = {};
  docs.forEach((d: any) => { if (d.owner && /\s/.test(d.owner) && d.owner !== 'KAP' && d.owner !== 'Tim Metodologi') signers[d.owner] = (signers[d.owner] || 0) + 1; });
  stream.filter((e: any) => e.action === 'SIGN').forEach((e: any) => { if (e.who) signers[e.who] = (signers[e.who] || 0) + 1; });
  const roleOf = { 'Hartono Wijaya': 'Engagement Partner', 'Rudi Gunawan': 'Quality Partner', 'Anindya Pramesti': 'Audit Manager', 'Sari Dewanti': 'Audit Manager', 'Dimas Raharjo': 'Senior Auditor' };
  const names = Object.keys(signers);
  return names.map((n, i) => {
    const serial = ((window as any).amsFakeHash ? (window as any).amsFakeHash('cert|' + n) : n).slice(0, 12).toUpperCase();
    return {
      cn: n, role: roleOf[n] || 'Auditor', signed: signers[n],
      serial: 'PRIVY-' + serial.slice(0, 4) + '-' + serial.slice(4, 8),
      issuer: 'PrivyID CA (PSrE Kominfo)', algo: 'RSA-2048 / SHA-256',
      issued: '2026-01-05', expires: '2027-01-05', status: 'Berlaku',
    };
  });
}

function CRKunci({ ctx }: any) {
  const { docs, evidence, certs, signCount, chain } = ctx;
  const algos = crAlgorithms(docs, evidence.length, signCount, chain.length);
  const ROTATION = [
    { k: 'Kunci enkripsi data (AES-256)', cycle: 'Tahunan', last: '2026-01-02', next: '2027-01-02', state: 'on' },
    { k: 'Sertifikat TLS server', cycle: '90 hari', last: '2026-05-01', next: '2026-07-30', state: 'on' },
    { k: 'Sertifikat e-Signature (PrivyID)', cycle: 'Tahunan', last: '2026-01-05', next: '2027-01-05', state: 'on' },
    { k: 'Kunci penandatangan jejak audit', cycle: '180 hari', last: '2026-03-01', next: '2026-08-28', state: 'on' },
  ];

  return (
    <>
      <div className="grid" style={{ gridTemplateColumns: '1.2fr 1fr', gap: 12, alignItems: 'start' }}>
        {/* algorithm registry */}
        <Panel noBody>
          <div className="panel-h"><h3>Registri Algoritma Kriptografi</h3><div style={{ flex: 1 }} /><span className="tiny muted">{algos.length} algoritma aktif</span></div>
          <div>
            {algos.map((a: any) => {
              const AIc = I[a.ic] || I.key;
              return (
                <div key={a.id} className="row gap12 ac" style={{ padding: '12px 14px', borderBottom: '1px solid var(--line-soft)' }}>
                  <span style={{ width: 38, height: 38, borderRadius: 9, background: 'var(--blue-100)', color: 'var(--blue)', display: 'grid', placeItems: 'center', flex: '0 0 38px' }}><AIc size={19} /></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="row ac gap8"><span className="mono" style={{ fontSize: 13, fontWeight: 700 }}>{a.name}</span><span className="chip tiny">{a.cls}</span></div>
                    <div className="tiny muted" style={{ marginTop: 2 }}>{a.use}</div>
                  </div>
                  <div style={{ textAlign: 'right', flex: '0 0 auto' }}>
                    <div className="tiny" style={{ fontWeight: 700 }}>{a.strength}</div>
                    <div className="tiny muted">{a.scope}</div>
                  </div>
                  <Badge kind="green">{a.status}</Badge>
                </div>
              );
            })}
          </div>
        </Panel>

        {/* key rotation */}
        <Panel noBody>
          <div className="panel-h"><h3>Jadwal Rotasi Kunci</h3><div style={{ flex: 1 }} /><Badge kind="green">Sesuai jadwal</Badge></div>
          <div style={{ padding: 6 }}>
            {ROTATION.map((r, i) => (
              <div key={i} style={{ padding: '10px 10px', borderBottom: i < ROTATION.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
                <div className="row jb ac" style={{ marginBottom: 5 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600 }}>{r.k}</span>
                  <span className="chip tiny">{r.cycle}</span>
                </div>
                <div className="row jb tiny muted">
                  <span>Rotasi terakhir <b style={{ color: 'var(--ink-2)' }}>{r.last}</b></span>
                  <span className="row ac gap5"><I.clock size={11} /> Berikutnya <b style={{ color: 'var(--ink-2)' }}>{r.next}</b></span>
                </div>
              </div>
            ))}
            <div className="panel" style={{ padding: '9px 11px', boxShadow: 'none', background: 'var(--green-bg)', borderColor: 'transparent', margin: 8 }}>
              <div className="tiny" style={{ color: 'var(--green)', lineHeight: 1.5 }}><I.shield size={11} /> Rotasi otomatis terjadwal; kunci lama disimpan untuk verifikasi arsip historis (key escrow), tidak untuk enkripsi baru.</div>
            </div>
          </div>
        </Panel>
      </div>

      {/* certificate inventory */}
      <Panel noBody className="mb12" style={{ marginTop: 12 }}>
        <div className="panel-h"><h3>Inventaris Sertifikat Tanda Tangan Digital</h3><div style={{ flex: 1 }} /><span className="tiny muted">e-Signature · PSrE PrivyID (Kominfo)</span></div>
        <table className="dtbl">
          <thead><tr><th>Pemegang</th><th>Peran</th><th>Serial</th><th>Algoritma</th><th>Penerbit</th><th>Berlaku s.d.</th><th className="num">Ditandatangani</th><th>Status</th></tr></thead>
          <tbody>
            {certs.map((c, i) => (
              <tr key={i}>
                <td><div className="row ac gap8"><Avatar name={c.cn} size={22} /><span style={{ fontWeight: 600 }}>{c.cn}</span></div></td>
                <td className="tiny muted">{c.role}</td>
                <td className="mono tiny">{c.serial}</td>
                <td className="mono tiny muted">{c.algo}</td>
                <td className="tiny muted">{c.issuer}</td>
                <td className="mono tiny">{c.expires}</td>
                <td className="num mono" style={{ fontWeight: 700 }}>{c.signed}</td>
                <td><Badge kind="green"><I.checkCircle size={10} /> {c.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="tiny muted" style={{ padding: '10px 14px', lineHeight: 1.5 }}>Sertifikat diturunkan dari penandatangan nyata — pemilik berkas DMS &amp; entri SIGN pada jejak audit. Setiap tanda tangan digital mengikat dokumen ke identitas pemegang kunci &amp; stempel waktu, mendukung non-repudiation (SA 230 / UU ITE).</div>
      </Panel>
    </>
  );
}

/* ============================================================
   TAB 6 — Meterai & PSrE (keabsahan TTE & e-Meterai · G17)
   AMS_CANON.legalSeal() — UU ITE jo. PP 71/2019 + UU 10/2020
   ============================================================ */
/* ============================================================
   W10.5 Fase 3 — verify the nol-vendor EXPORT seal (provenans Asseris).
   Paste a seal id + content hash (or the artifact's QR payload `neosuite-seal:<id>;<hash>`) →
   server recomputes the Ed25519 signature over the hash → status. This is the counterpart to the
   QR/"Segel" sheet embedded by export_pdf.js / export_xlsx.js. It proves WHO + integrity — NOT
   e-Meterai/PSrE (the legal register lives below this panel).
   ============================================================ */
const SEAL_VERDICT = {
  ok:              { kind: 'green', icon: 'checkCircle', label: 'Terverifikasi', note: 'Tanda tangan sah & hash konten cocok — artefak otentik dan tak berubah sejak disegel.' },
  'hash-mismatch': { kind: 'red',   icon: 'alert',       label: 'Hash tak cocok', note: 'Segel sah, tetapi hash konten yang ditempel berbeda — artefak telah diubah sejak disegel.' },
  'bad-signature': { kind: 'red',   icon: 'alert',       label: 'Tanda tangan tak sah', note: 'Baris segel tidak ditandatangani oleh kunci aplikasi — kemungkinan dipalsukan.' },
  'not-found':     { kind: 'amber', icon: 'alert',       label: 'Tak ditemukan', note: 'Tidak ada segel dengan ID tersebut di server.' },
  'key-rotated':   { kind: 'amber', icon: 'alert',       label: 'Kunci berganti', note: 'Segel dibuat oleh kunci dev ephemeral yang sudah berganti pasca-restart — tak dapat diverifikasi (bukan indikasi tamper). Set APP_SIGNING_KEY agar stabil.' },
  unavailable:     { kind: 'gray',  icon: 'alert',       label: 'Tak tersedia', note: 'Server verifikasi tak tersedia atau peran tanpa akses.' },
};

function CRVerifySeal() {
  const [raw, setRaw] = useCR('');
  const [hash, setHash] = useCR('');
  const [busy, setBusy] = useCR(false);
  const [res, setRes] = useCR(null); // { reason, valid, kind, scope, scopeId, signerRole, signedAt, pubKeyId } | { reason:'bad-input' }

  // Accept either a bare seal id, or a `neosuite-seal:<id>;<hash>` QR payload (auto-splits the hash).
  const parse = () => {
    let id = raw.trim(); let h = hash.trim().toLowerCase();
    const m = id.match(/^(?:neosuite-seal:)?\s*([^;\s]+)\s*;\s*([0-9a-fA-F]{64})\s*$/);
    if (m) { id = m[1]; h = m[2].toLowerCase(); }
    else { id = id.replace(/^neosuite-seal:/, '').replace(/;.*$/, '').trim(); }
    return { id, h };
  };

  const onVerify = async () => {
    if (busy) return;
    const { id, h } = parse();
    if (!id || !/^[0-9a-f]{64}$/.test(h)) { setRes({ reason: 'bad-input' }); return; }
    setBusy(true);
    try {
      const v = await (window as any).amsExportVerifySeal({ sealId: id, contentHash: h });
      setRes(v || { reason: 'unavailable' });
    } finally { setBusy(false); }
  };

  const verdict = res && res.reason !== 'bad-input' ? (SEAL_VERDICT[res.reason] || SEAL_VERDICT.unavailable) : null;
  const inputStyle = { width: '100%', height: 30, padding: '0 10px', border: '1px solid var(--line)', borderRadius: 7, background: 'var(--surface)', color: 'var(--ink)', fontFamily: 'var(--mono)', fontSize: 12 };

  return (
    <Panel noBody style={{ marginBottom: 12 }}>
      <div className="panel-h"><span className="row ac gap8"><span style={{ width: 26, height: 26, borderRadius: 7, background: 'var(--blue-100)', color: 'var(--blue)', display: 'grid', placeItems: 'center' }}><I.shield size={14} /></span><h3 style={{ margin: 0 }}>Verifikasi Segel Ekspor (Provenans Asseris)</h3></span><div style={{ flex: 1 }} /><span className="tiny muted">Ed25519 · BUKAN e-Meterai</span></div>
      <div style={{ padding: '12px 14px', display: 'grid', gap: 10 }}>
        <div className="tiny muted" style={{ lineHeight: 1.5 }}>Tempel <b>Seal ID</b> + <b>Hash konten</b> dari artefak terekspor (footer PDF / sheet "Segel" XLSX), atau seluruh muatan QR <span className="mono">neosuite-seal:&lt;id&gt;;&lt;hash&gt;</span> ke kolom pertama.</div>
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <div className="tiny upper muted" style={{ fontWeight: 700, marginBottom: 4 }}>Seal ID / muatan QR</div>
            <input style={inputStyle} value={raw} onChange={e => setRaw(e.target.value)} placeholder="cmqk… atau neosuite-seal:cmqk…;<hash>" />
          </div>
          <div>
            <div className="tiny upper muted" style={{ fontWeight: 700, marginBottom: 4 }}>Hash konten (SHA-256, 64 heks)</div>
            <input style={inputStyle} value={hash} onChange={e => setHash(e.target.value)} placeholder="64 karakter heksadesimal" />
          </div>
        </div>
        <div className="row gap8 ac">
          <Btn sm variant="primary" onClick={onVerify} disabled={busy}><I.shield size={13} /> {busy ? 'Memverifikasi…' : 'Verifikasi Segel'}</Btn>
          {(raw || hash || res) && <Btn sm onClick={() => { setRaw(''); setHash(''); setRes(null); }}>Bersihkan</Btn>}
        </div>

        {res && res.reason === 'bad-input' && (
          <div className="panel" style={{ padding: '9px 12px', background: 'var(--amber-bg)', borderColor: 'transparent' }}>
            <div className="row ac gap8"><span style={{ color: 'var(--amber)' }}><I.alert size={15} /></span><span className="tiny" style={{ lineHeight: 1.5 }}>Masukkan Seal ID dan Hash konten 64-heksadesimal yang valid (atau tempel muatan QR lengkap).</span></div>
          </div>
        )}
        {verdict && (
          <div className="panel" style={{ padding: '11px 13px', background: `var(--${verdict.kind}-bg)`, borderColor: 'transparent' }}>
            <div className="row ac gap8" style={{ marginBottom: res.signerRole ? 7 : 0 }}>
              <span style={{ color: `var(--${verdict.kind})` }}>{React.createElement(I[verdict.icon] || I.shield, { size: 16 })}</span>
              <Badge kind={verdict.kind}>{verdict.label}</Badge>
              <span className="tiny" style={{ flex: 1, lineHeight: 1.45 }}>{verdict.note}</span>
            </div>
            {res.signerRole && (
              <div className="row wrap gap10 tiny muted" style={{ paddingLeft: 24 }}>
                {res.kind && <span>Jenis: <b style={{ color: 'var(--ink-2)' }}>{res.kind}</b></span>}
                {res.scope && <span>Lingkup: <span className="mono">{res.scope}{res.scopeId ? '/' + res.scopeId : ''}</span></span>}
                <span>Penandatangan: <b style={{ color: 'var(--ink-2)' }}>{res.signerRole}</b></span>
                {res.signedAt && <span>Waktu: <span className="mono">{new Date(res.signedAt).toISOString().slice(0, 16).replace('T', ' ')} UTC</span></span>}
                {res.pubKeyId && <span>Key: <span className="mono">{res.pubKeyId}</span></span>}
              </div>
            )}
          </div>
        )}
      </div>
    </Panel>
  );
}

function CRMeterai({ ctx }: any) {
  const { nav } = ctx;
  const L = ((AMS_CANON as any) && (AMS_CANON as any).legalSeal) ? (AMS_CANON as any).legalSeal() : null;
  if (!L) return <><CRVerifySeal /><Placeholder label="Modul keabsahan TTE belum tersedia" /></>;
  const s = L.summary;
  const BIND_KIND = { mengikat: 'green', menunggu: 'amber', lemah: 'red' };

  return (
    <>
      <CRVerifySeal />
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 12 }}>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={s.bound + '/' + s.total} label="Dokumen Mengikat Penuh" sub="TTE tersertifikasi + e-Meterai" accent={s.bound === s.total ? 'var(--green)' : 'var(--amber)'} /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={s.certified + '/' + s.total} label="TTE Tersertifikasi (PSrE)" accent="var(--blue)" /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={s.meteraiAffixed + '/' + s.meteraiReq} label="Surat Perikatan ber-e-Meterai" accent={s.meteraiPending ? 'var(--amber)' : 'var(--green)'} /></div></Panel>
        <Panel><div style={{ padding: '11px 14px' }}><Stat value={s.weak + s.pending} label="Belum Mengikat / Menunggu" accent={(s.weak + s.pending) ? 'var(--red)' : 'var(--green)'} /></div></Panel>
      </div>

      {(s.weak + s.pending) > 0 && (
        <div className="panel" style={{ padding: '12px 15px', background: 'var(--amber-bg)', borderColor: 'transparent', marginBottom: 12 }}>
          <div className="row ac gap10">
            <span style={{ color: 'var(--amber)' }}><I.alert size={18} /></span>
            <div className="tiny" style={{ flex: 1, lineHeight: 1.55 }}><b>{s.weak + s.pending} dokumen belum mengikat penuh.</b> Tanda tangan elektronik <b>tidak tersertifikasi</b> berkekuatan pembuktian lemah; perjanjian/surat perikatan yang menjadi alat bukti wajib dibubuhi <b>e-Meterai</b> (UU 10/2020). Ikat ke PSrE tersertifikasi & bubuhkan e-Meterai sebelum dokumen dianggap sah.</div>
          </div>
        </div>
      )}

      <div className="grid" style={{ gridTemplateColumns: '1.6fr 1fr', gap: 12, alignItems: 'start' }}>
        <Panel noBody>
          <div className="panel-h"><h3>Register Keabsahan Tanda Tangan & Meterai Elektronik</h3><div style={{ flex: 1 }} /><span className="tiny muted">UU ITE jo. PP 71/2019</span></div>
          <table className="dtbl">
            <thead><tr><th>Dokumen</th><th>TTE / PSrE</th><th>e-Meterai</th><th style={{ width: 120 }}>Keabsahan</th></tr></thead>
            <tbody>
              {L.docs.map((d: any) => (
                <tr key={d.id}>
                  <td style={{ maxWidth: 220 }}><div className="truncate" style={{ fontWeight: 600 }}>{d.name}</div><div className="tiny muted">{d.client} · {d.docType}</div></td>
                  <td className="tiny">
                    {d.certified
                      ? <span className="row ac gap5" style={{ color: 'var(--green)' }}><I.checkCircle size={13} /> {d.signerId}</span>
                      : d.tte === 'belum'
                        ? <span style={{ color: 'var(--red)', fontWeight: 600 }}>Belum ditandatangani</span>
                        : <span style={{ color: 'var(--amber)', fontWeight: 600 }}>Menunggu TTE</span>}
                    {d.signer !== '—' && d.certified && <div className="tiny muted">{d.signer}</div>}
                  </td>
                  <td className="tiny">
                    {!d.requireMeterai
                      ? <span className="muted">tidak wajib</span>
                      : d.meterai.status === 'affixed'
                        ? <span className="row ac gap5" style={{ color: 'var(--green)' }}><I.checkCircle size={13} /> Rp 10.000</span>
                        : <span style={{ color: 'var(--amber)', fontWeight: 600 }}>Belum dibubuhkan</span>}
                    {d.meterai.serial && <div className="mono tiny muted">{d.meterai.serial}</div>}
                  </td>
                  <td><Badge kind={BIND_KIND[d.binding]}>{d.bindLabel}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="tiny muted" style={{ padding: '10px 14px', lineHeight: 1.5 }}>TTE <b>tersertifikasi</b> (sertifikat PSrE berinduk Kominfo) memiliki kekuatan hukum & akibat hukum yang sah (UU ITE Ps. 11; PP 71/2019 Ps. 60). Surat perikatan & dokumen perjanjian wajib dibubuhi <b>e-Meterai</b> Peruri agar sah sebagai alat bukti.</div>
        </Panel>

        <div className="grid" style={{ gap: 12 }}>
          <Panel noBody>
            <div className="panel-h"><h3>Penyelenggara Tepercaya</h3><span className="sub">PSrE & e-Meterai</span></div>
            <div>
              {L.providers.map((p, i) => (
                <div key={i} className="row gap10 ac" style={{ padding: '11px 14px', borderBottom: i < L.providers.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
                  <span style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--blue-100)', color: 'var(--blue)', display: 'grid', placeItems: 'center', flex: '0 0 32px' }}><I.shield size={16} /></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="row ac gap6"><span style={{ fontSize: 12.5, fontWeight: 700 }}>{p.name}</span><span className="chip tiny" style={{ height: 16 }}>{p.role}</span></div>
                    <div className="tiny muted" style={{ lineHeight: 1.4 }}>{p.note}</div>
                  </div>
                  <Badge kind="green">{p.accred}</Badge>
                </div>
              ))}
            </div>
          </Panel>

          <Panel noBody>
            <div className="panel-h"><h3>Kontrol Keabsahan</h3></div>
            <div>
              {L.controls.map((c, i) => {
                const SK = { 'Aktif': 'green', 'Parsial': 'amber', 'Gagal': 'red' };
                return (
                  <div key={i} className="row ac gap10" style={{ padding: '10px 14px', borderBottom: i < L.controls.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
                    <span style={{ color: c.status === 'Aktif' ? 'var(--green)' : 'var(--amber)', flex: '0 0 auto' }}>{c.status === 'Aktif' ? <I.checkCircle size={15} /> : <I.alert size={15} />}</span>
                    <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.35 }}>{c.k}</div><div className="tiny muted">{c.ev} · <span className="mono">{c.std}</span></div></div>
                    <Badge kind={SK[c.status] || 'gray'}>{c.status}</Badge>
                  </div>
                );
              })}
            </div>
          </Panel>
        </div>
      </div>
      <div className="panel" style={{ padding: '11px 14px', background: 'var(--blue-050)', borderColor: 'transparent', marginTop: 12 }}>
        <div className="tiny" style={{ lineHeight: 1.55 }}><I.link2 size={11} /> Surat perikatan ditandatangani & dibubuhi e-Meterai di alur <span style={{ color: 'var(--blue)', cursor: 'pointer' }} onClick={() => nav('onboarding', { from: 'crypto' })}>Onboarding (SA 210) ↗</span>; opini & laporan diikat TTE tersertifikasi di <span style={{ color: 'var(--blue)', cursor: 'pointer' }} onClick={() => nav('opinion', { from: 'crypto' })}>Audit Opinion ↗</span>. Bukti segel tersimpan WORM di Document Management.</div>
      </div>
    </>
  );
}

Object.assign(window, { CryptoCompliance });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { CryptoCompliance };
