/* ============================================================
   B2 — layar "setel password" PRA-LOGIN.

   Satu-satunya layar aplikasi yang berguna TANPA sesi. Ia menyelesaikan dua alur sekaligus,
   karena langkah akhirnya identik: undangan staf baru dan lupa-password.

   TOKEN DIBAWA DI HASH (`#/setel-password?token=…`), BUKAN query string. Itu disengaja:
   fragmen hash tak pernah dikirim ke server dalam permintaan HTTP, sehingga token tidak
   mendarat di access log, log reverse-proxy, maupun header Referer ke pihak ketiga. Satu-satunya
   yang mengirim token ke server adalah pemanggilan tRPC di bawah, yang memang harus.
   ============================================================ */
import React from 'react';
import { api } from './api';
import { errMessage, type PreventableEvent, type ValueEvent } from './dom_events';
import { authCard } from './auth_chrome';

const { useState: useStateSP, useEffect: useEffectSP } = React;

/* Bentuk balasan `auth.inspectCredentialToken`.

   SENGAJA satu interface ber-field opsional, BUKAN union berdiskriminan yang lebih rapi.
   Alasannya konkret: gerbang `typecheck:test` repo ini berjalan dengan `strictNullChecks:false`
   (lihat tsconfig.test.json), dan tanpa strict null checks TypeScript tak mempersempit union
   lewat diskriminan boolean — `r.reason` pada cabang else menjadi galat di gerbang itu meski
   benar di gerbang produksi. Tipe yang hanya benar pada salah satu dari dua konfigurasi bukan
   tipe yang benar. */
interface TokenInfo {
  valid: boolean;
  reason?: string;
  purpose?: 'reset' | 'invite';
  name?: string;
  email?: string | null;
  totpRequired?: boolean;
}

/** Baca token dari hash. Dipisah agar dapat diuji tanpa DOM. */
export function tokenFromHash(hash: string): string | null {
  const q = hash.indexOf('?');
  if (q < 0) return null;
  const token = new URLSearchParams(hash.slice(q + 1)).get('token');
  return token && token.trim() ? token : null;
}

/** Rute ini aktif? Dipakai boot gate di app.tsx sebelum sesi diperiksa. */
export function isSetPasswordRoute(hash: string): boolean {
  return /^#\/setel-password(\?|$)/.test(hash) && tokenFromHash(hash) !== null;
}

const REASON_TEXT: Record<string, string> = {
  'not-found': 'Tautan ini tidak dikenali. Mungkin sudah diganti oleh permintaan yang lebih baru.',
  expired: 'Tautan ini sudah kedaluwarsa. Mintalah tautan baru lewat "Lupa kata sandi?" di halaman masuk.',
  'already-used': 'Tautan ini sudah dipakai. Setiap tautan hanya berlaku sekali.',
};

export function SetPasswordScreen({ hash, onDone }: { hash: string; onDone?: () => void }) {
  const s = authCard();
  const token = tokenFromHash(hash || '');
  const [phase, setPhase] = useStateSP('checking'); // checking | invalid | form | done
  const [info, setInfo] = useStateSP(null);
  const [pw1, setPw1] = useStateSP('');
  const [pw2, setPw2] = useStateSP('');
  const [totp, setTotp] = useStateSP('');
  const [err, setErr] = useStateSP('');
  const [busy, setBusy] = useStateSP(false);
  const uid = React.useId(); // id unik per instance — lihat catatan yang sama di view_users.tsx

  useEffectSP(() => {
    let cancelled = false;
    if (!token) { setPhase('invalid'); setErr(REASON_TEXT['not-found']); return; }
    api.auth.inspectCredentialToken.query({ token })
      .then((r: TokenInfo) => {
        if (cancelled) return;
        if (r.valid) { setInfo(r); setPhase('form'); }
        else { setErr(REASON_TEXT[r.reason || 'not-found'] || REASON_TEXT['not-found']); setPhase('invalid'); }
      })
      .catch(() => {
        if (!cancelled) { setErr('Tidak dapat menghubungi server. Periksa koneksi lalu muat ulang halaman.'); setPhase('invalid'); }
      });
    return () => { cancelled = true; };
  }, [token]);

  async function submit(e: PreventableEvent) {
    e.preventDefault();
    if (busy) return;
    if (pw1.length < 12) { setErr('Kata sandi minimal 12 karakter.'); return; }
    if (pw1 !== pw2) { setErr('Kedua kata sandi belum sama.'); return; }
    setErr(''); setBusy(true);
    try {
      await api.auth.completeCredentialToken.mutate({
        token, newPassword: pw1, totp: totp.trim() || undefined,
      });
      setPhase('done');
    } catch (ex) {
      const msg = errMessage(ex);
      if (msg === 'totp-required') setErr('Masukkan kode 6 digit dari aplikasi authenticator Anda.');
      else if (msg === 'invalid-totp') setErr('Kode autentikasi salah. Coba lagi — tautan Anda masih berlaku.');
      else if (msg.startsWith('totp-rate-limited')) setErr('Terlalu banyak kode salah. Tunggu sebentar lalu coba lagi.');
      else if (msg.startsWith('token-')) { setErr(REASON_TEXT[msg.slice(6)] || REASON_TEXT['not-found']); setPhase('invalid'); }
      else setErr('Gagal menyimpan kata sandi. Coba lagi.');
      setBusy(false);
    }
  }

  const title = info?.purpose === 'invite' ? 'Selamat datang di Asseris' : 'Setel ulang kata sandi';
  const lead = info?.purpose === 'invite'
    ? 'Pilih kata sandi Anda sendiri untuk mulai memakai akun ini.'
    : 'Pilih kata sandi baru untuk akun Anda.';

  return (
    <div style={s.wrap}>
      <div style={s.card}>
        <div style={s.logo} aria-hidden="true">A</div>

        {phase === 'checking' && (
          <>
            <div style={s.title}>Memeriksa tautan…</div>
            <div style={s.lead}>Mohon tunggu sebentar.</div>
          </>
        )}

        {phase === 'invalid' && (
          <>
            <div style={s.title}>Tautan tidak berlaku</div>
            <div style={s.errBox} role="alert">{err}</div>
            <button style={s.btn} type="button" onClick={() => onDone && onDone()}>Ke halaman masuk</button>
          </>
        )}

        {phase === 'done' && (
          <>
            <div style={s.title}>Kata sandi tersimpan</div>
            <div style={s.lead}>
              Semua sesi lama Anda telah dikeluarkan. Silakan masuk dengan kata sandi baru.
            </div>
            <button style={s.btn} type="button" onClick={() => onDone && onDone()}>Masuk sekarang</button>
          </>
        )}

        {phase === 'form' && (
          <form onSubmit={submit}>
            <div style={s.title}>{title}</div>
            <div style={s.lead}>{lead}</div>
            <div style={s.who}>{info?.name}{info?.email ? ` · ${info.email}` : ''}</div>

            {err && <div style={s.errBox} role="alert">{err}</div>}

            <label style={s.label} htmlFor={uid + "-pw1"}>Kata sandi baru</label>
            <input id={uid + "-pw1"} style={s.input} type="password" autoComplete="new-password" autoFocus required
              value={pw1} onChange={(e: ValueEvent) => setPw1(e.target.value)} placeholder="minimal 12 karakter" />

            <label style={s.label} htmlFor={uid + "-pw2"}>Ulangi kata sandi</label>
            <input id={uid + "-pw2"} style={s.input} type="password" autoComplete="new-password" required
              value={pw2} onChange={(e: ValueEvent) => setPw2(e.target.value)} placeholder="ketik ulang" />

            {info?.totpRequired && (
              <>
                <label style={s.label} htmlFor={uid + "-totp"}>Kode Autentikasi (2FA)</label>
                <input id={uid + "-totp"} style={s.otp} inputMode="numeric" autoComplete="one-time-code" maxLength={6}
                  value={totp} onChange={(e: ValueEvent) => setTotp(e.target.value.replace(/\D/g, ''))} placeholder="123456" />
                <div style={s.hint}>
                  Akun Anda memakai 2FA. Menyetel ulang kata sandi tidak melewatinya.
                </div>
              </>
            )}

            <button style={s.btn} type="submit" disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan kata sandi'}</button>
          </form>
        )}
      </div>
    </div>
  );
}
