/* ============================================================
   W7 Fase 2 — Login screen. Replaces the old `signedIn:true` mock with a real
   credentialled login against the server (auth.login). Rendered by app.jsx's boot
   gate when there is no valid session; on success it stores the token and hands the
   user up so the app hydrates and mounts. Self-contained — no app context deps.
   ============================================================ */
import React from 'react';
import { api, setAuthToken } from './api';

const { useState: useStateLG } = React;

export function LoginScreen({ onLoggedIn }: any) {
  const [email, setEmail] = useStateLG('');
  const [password, setPassword] = useStateLG('');
  const [totp, setTotp] = useStateLG('');
  const [needTotp, setNeedTotp] = useStateLG(false);
  const [err, setErr] = useStateLG('');
  const [busy, setBusy] = useStateLG(false);

  async function submit(e: any) {
    e.preventDefault();
    if (busy) return;
    setErr(''); setBusy(true);
    try {
      const r = await (api as any).auth.login.mutate({ email: email.trim(), password, totp: totp.trim() || undefined });
      setAuthToken(r.token);
      onLoggedIn(r.user);
    } catch (ex) {
      const msg = (ex && ex.message) || '';
      if (msg === 'totp-required') {
        // First time we learn 2FA is on: reveal the field. If it was already shown, the code was wrong.
        setErr(needTotp ? 'Kode autentikasi (2FA) salah. Coba lagi.' : 'Akun ini memakai 2FA — masukkan kode dari aplikasi authenticator.');
        setNeedTotp(true);
      } else if (msg === 'account-locked') {
        setErr('Akun terkunci sementara karena terlalu banyak percobaan gagal. Coba lagi dalam beberapa menit.');
      } else {
        setErr('Email atau kata sandi salah.');
      }
      setBusy(false);
    }
  }

  const wrap = { minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--navy, #1f3a5f)', padding: 20 };
  const card = { width: 380, maxWidth: '92vw', background: 'var(--surface, #fff)', borderRadius: 14, boxShadow: '0 24px 60px rgba(8,15,30,.38)', padding: '30px 30px 26px', font: '14px/1.5 Inter, system-ui, sans-serif', color: 'var(--ink, #1f2733)' };
  const logo = { width: 46, height: 46, borderRadius: 11, background: 'var(--navy, #1f3a5f)', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 18, marginBottom: 14 };
  const label = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-2, #5a6675)', marginBottom: 5 };
  const input = { width: '100%', height: 38, borderRadius: 8, border: '1px solid var(--line, #d7dce3)', padding: '0 11px', font: '14px inherit', boxSizing: 'border-box', marginBottom: 14, background: '#fff', color: 'inherit' };
  const btn = { width: '100%', height: 40, borderRadius: 8, border: 'none', background: 'var(--blue, #2563eb)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.7 : 1 };
  const errBox = { background: 'var(--red-bg, #fde8e8)', color: 'var(--red, #c0392b)', borderRadius: 8, padding: '8px 11px', fontSize: 12.5, marginBottom: 14 };

  return (
    <div style={wrap}>
      <form style={card} onSubmit={submit}>
        <div style={logo}>A</div>
        <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.2 }}>Asseris</div>
        <div style={{ fontSize: 12.5, color: 'var(--ink-2, #5a6675)', marginBottom: 22 }}>Audit Management System — masuk untuk melanjutkan</div>

        {err && <div style={errBox} role="alert">{err}</div>}

        <label style={label} htmlFor="lg-email">Email</label>
        <input id="lg-email" style={input} type="email" autoComplete="username" autoFocus required
          value={email} onChange={(e: any) => setEmail(e.target.value)} placeholder="nama@whr-cpa.id" />

        <label style={label} htmlFor="lg-pw">Kata Sandi</label>
        <input id="lg-pw" style={input} type="password" autoComplete="current-password" required
          value={password} onChange={(e: any) => setPassword(e.target.value)} placeholder="••••••••" />

        {needTotp && (
          <>
            <label style={label} htmlFor="lg-totp">Kode Autentikasi (2FA)</label>
            <input id="lg-totp" style={{ ...input, letterSpacing: 4, fontFamily: 'JetBrains Mono, monospace' }} inputMode="numeric"
              autoComplete="one-time-code" maxLength={6} value={totp} onChange={(e: any) => setTotp(e.target.value.replace(/\D/g, ''))} placeholder="123456" />
          </>
        )}

        <button style={btn} type="submit" disabled={busy}>{busy ? 'Memeriksa…' : 'Masuk'}</button>
      </form>
    </div>
  );
}

(window as any).LoginScreen = LoginScreen;
