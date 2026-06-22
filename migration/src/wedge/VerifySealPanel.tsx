/* ============================================================
   VerifySealPanel — Wedge MVP G2 (verifikasi segel offline)
   ------------------------------------------------------------
   Untuk reviewer mutu / inspektur PPPK: tempel field dari sheet "Segel"
   pada berkas ekspor (kunci publik · hash konten · tanda tangan) → verdikt
   apakah tanda tangan Ed25519 SAH atas hash tsb. Membuktikan AUTENTISITAS
   (kunci firma menandatangani hash ini) + hash tak diubah.

   Batas jujur: verifikasi ini menegaskan tanda tangan atas HASH. Bahwa hash
   cocok dgn ISI kertas kerja dijamin oleh sifat deterministik (ekspor ulang
   dari sumber sama mereproduksi hash sama) — bukan e-Meterai/PSrE.
   ============================================================ */
import React from 'react';
import { verifySignatureHex, localPublicKeyHex } from './seal';

const { useState: useStateV } = React;
const card: any = { background: '#fff', border: '1px solid var(--line, #e3e7ee)', borderRadius: 10 };
const inp: any = { width: '100%', fontSize: 12, fontFamily: 'monospace', padding: '6px 9px', border: '1px solid var(--line, #e3e7ee)', borderRadius: 6, boxSizing: 'border-box' };

export function VerifySealPanel() {
  const [pub, setPub] = useStateV('');
  const [hash, setHash] = useStateV('');
  const [sig, setSig] = useStateV('');
  const [verdict, setVerdict] = useStateV(null);   // null | 'ok' | 'bad'
  const local = localPublicKeyHex();

  const verify = () => {
    setVerdict('checking');
    verifySignatureHex(hash.trim(), sig.trim(), pub.trim())
      .then((ok: any) => setVerdict(ok ? 'ok' : 'bad'))
      .catch(() => setVerdict('bad'));
  };

  const field = (label: any, val: any, set: any, ph: any) => (
    <label style={{ display: 'block', marginBottom: 8 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-2, #6b7280)' }}>{label}</span>
      <input value={val} onChange={(e: any) => { set(e.target.value); setVerdict(null); }} placeholder={ph} style={inp} />
    </label>
  );

  return (
    <details style={{ ...card, padding: '14px 16px', marginBottom: 20 }}>
      <summary style={{ fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Verifikasi segel kertas kerja (reviewer / inspektur PPPK)</summary>
      <div style={{ marginTop: 10 }}>
        <div style={{ fontSize: 12, color: 'var(--ink-2, #6b7280)', marginBottom: 10, lineHeight: 1.5 }}>
          Tempel tiga field dari sheet <strong>Segel</strong> pada berkas ekspor untuk memverifikasi keaslian tanda tangan.
        </div>
        {field('Kunci publik (hex)', pub, setPub, 'mis. 3a7f…')}
        {field('Hash konten (SHA-256)', hash, setHash, 'mis. 934f817e…')}
        {field('Tanda tangan (hex)', sig, setSig, 'mis. 1c0a…')}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 4 }}>
          <button onClick={verify} style={{ fontSize: 12, fontWeight: 600, background: 'var(--blue, #2a63d6)', color: '#fff', border: 0, borderRadius: 6, padding: '7px 14px', cursor: 'pointer' }}>Verifikasi</button>
          {verdict === 'checking' && <span style={{ fontSize: 12, color: 'var(--ink-2, #6b7280)' }}>Memeriksa…</span>}
          {verdict === 'ok' && <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--green, #1e8e5a)' }}>✓ Tanda tangan SAH atas hash ini</span>}
          {verdict === 'bad' && <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--red, #c0392b)' }}>✗ TIDAK SAH — segel/kunci/hash tak cocok</span>}
        </div>
        {local && (
          <div style={{ fontSize: 11, color: 'var(--ink-2, #9aa3b2)', marginTop: 10, wordBreak: 'break-all' }}>
            Kunci publik perangkat ini: <span style={{ fontFamily: 'monospace' }}>{local}</span> — bandingkan dengan kunci pada berkas untuk konfirmasi provenans firma.
          </div>
        )}
      </div>
    </details>
  );
}
