/* ============================================================
   W7 Fase 2 — Login screen. Replaces the old `signedIn:true` mock with a real
   credentialled login against the server (auth.login). The session credential is
   cookie-only and never enters JavaScript; on success the public user is handed up.

   B2 — ditambah alur "Lupa kata sandi?". Gayanya kini datang dari auth_chrome.ts yang
   dipakai bersama layar setel-password, supaya dua layar dalam satu alur tak menyimpang.
   ============================================================ */
import React from 'react';
import { api } from './api';
import { errMessage, type PreventableEvent, type ValueEvent } from './dom_events';
import { authCard } from './auth_chrome';

const { useState: useStateLG } = React;

export function LoginScreen({ onLoggedIn }: { onLoggedIn: (user: unknown) => void }) {
  const [email, setEmail] = useStateLG('');
  const [password, setPassword] = useStateLG('');
  const [totp, setTotp] = useStateLG('');
  const [needTotp, setNeedTotp] = useStateLG(false);
  const [err, setErr] = useStateLG('');
  const [busy, setBusy] = useStateLG(false);
  const [forgot, setForgot] = useStateLG(false);
  const [sent, setSent] = useStateLG('');

  const s = authCard(busy);

  async function submit(e: PreventableEvent) {
    e.preventDefault();
    if (busy) return;
    setErr(''); setBusy(true);
    try {
      const r = await api.auth.login.mutate({ email: email.trim(), password, totp: totp.trim() || undefined });
      onLoggedIn(r.user);
    } catch (ex) {
      const msg = errMessage(ex);
      if (msg === 'totp-required') {
        // First time we learn 2FA is on: reveal the field. If it was already shown, the code was wrong.
        setErr(needTotp ? 'Kode autentikasi (2FA) salah. Coba lagi.' : 'Akun ini memakai 2FA — masukkan kode dari aplikasi authenticator.');
        setNeedTotp(true);
      } else if (msg === 'account-locked') {
        setErr('Akun terkunci sementara karena terlalu banyak percobaan gagal. Coba lagi dalam beberapa menit.');
      } else if (msg.startsWith('totp-rate-limited')) {
        setErr('Terlalu banyak kode 2FA yang salah. Verifikasi 2FA dikunci sementara; coba lagi nanti.');
      } else {
        setErr('Email atau kata sandi salah.');
      }
      setBusy(false);
    }
  }

  /* Permintaan reset. Balasan server SENGAJA sama untuk alamat dikenal maupun tidak, jadi layar
     ini pun tak boleh membedakannya — kalimat konfirmasinya identik apa pun kenyataannya. Satu
     hal yang boleh dibedakan: apakah instance ini memang punya email, karena itu properti server
     dan bukan properti akun. */
  async function requestReset(e: PreventableEvent) {
    e.preventDefault();
    if (busy) return;
    setErr(''); setBusy(true);
    try {
      const r = await api.auth.requestPasswordReset.mutate({ email: email.trim() });
      setSent(r && r.emailConfigured === false
        ? 'Instance ini belum dikonfigurasi mengirim email. Hubungi admin firma Anda untuk menyetel ulang kata sandi.'
        : 'Bila alamat itu terdaftar, tautan setel-ulang sudah dikirim. Periksa kotak masuk Anda — tautannya berlaku 30 menit.');
    } catch (ex) {
      setErr('Tidak dapat menghubungi server. Coba lagi.');
    }
    setBusy(false);
  }

  if (forgot) {
    return (
      <div style={s.wrap}>
        <form style={s.card} onSubmit={requestReset}>
          <div style={s.logo} aria-hidden="true">A</div>
          <div style={s.title}>Lupa kata sandi</div>
          <div style={s.lead}>Masukkan email akun Anda. Kami kirimkan tautan untuk menyetel kata sandi baru.</div>

          {err && <div style={s.errBox} role="alert">{err}</div>}
          {sent && <div style={s.okBox} role="status">{sent}</div>}

          <label style={s.label} htmlFor="fg-email">Email</label>
          <input id="fg-email" style={s.input} type="email" autoComplete="username" autoFocus required
            value={email} onChange={(e: ValueEvent) => setEmail(e.target.value)} placeholder="nama@kap-anda.id" />

          <button style={s.btn} type="submit" disabled={busy}>{busy ? 'Mengirim…' : 'Kirim tautan'}</button>
          <button style={s.linkBtn} type="button" onClick={() => { setForgot(false); setSent(''); setErr(''); }}>
            Kembali ke halaman masuk
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={s.wrap}>
      <form style={s.card} onSubmit={submit}>
        <div style={s.logo} aria-hidden="true">A</div>
        <div style={s.title}>Asseris</div>
        <div style={s.lead}>Audit Management System — masuk untuk melanjutkan</div>

        {err && <div style={s.errBox} role="alert">{err}</div>}

        <label style={s.label} htmlFor="lg-email">Email</label>
        <input id="lg-email" style={s.input} type="email" autoComplete="username" autoFocus required
          value={email} onChange={(e: ValueEvent) => setEmail(e.target.value)} placeholder="nama@whr-cpa.id" />

        <label style={s.label} htmlFor="lg-pw">Kata Sandi</label>
        <input id="lg-pw" style={s.input} type="password" autoComplete="current-password" required
          value={password} onChange={(e: ValueEvent) => setPassword(e.target.value)} placeholder="••••••••" />

        {needTotp && (
          <>
            <label style={s.label} htmlFor="lg-totp">Kode Autentikasi (2FA)</label>
            <input id="lg-totp" style={s.otp} inputMode="numeric"
              autoComplete="one-time-code" maxLength={6} value={totp} onChange={(e: ValueEvent) => setTotp(e.target.value.replace(/\D/g, ''))} placeholder="123456" />
          </>
        )}

        <button style={s.btn} type="submit" disabled={busy}>{busy ? 'Memeriksa…' : 'Masuk'}</button>
        <button style={s.linkBtn} type="button" onClick={() => { setForgot(true); setErr(''); }}>
          Lupa kata sandi?
        </button>
      </form>
    </div>
  );
}

(window as any).LoginScreen = LoginScreen;
