/* ============================================================
   B1 — Manajemen Pengguna (FIRM_ADMIN).

   Menutup gap yang membuat produk ini tak dapat berskala: sampai sekarang menambah satu staf
   berarti operator membuka shell di server dan menjalankan `npm run add-user`. Setiap firma
   karena itu bergantung pada vendor untuk hal paling rutin dalam hidup sebuah KAP — orang masuk,
   orang pindah peran, orang keluar.

   Server tetap otoritatif atas SEMUA aturannya (gate FIRM_ADMIN, batas lintas-firma, pagar
   "admin aktif terakhir"). Layar ini mencerminkan aturan itu supaya penggunanya tak perlu
   menabraknya untuk mengetahuinya — tetapi tak satu pun keputusan diambil di sini.
   ============================================================ */
import React from 'react';
import { Badge, Btn, Panel, Overlay } from './ui';
import { I } from './icons';
import { api } from './api';
import { errMessage, type PreventableEvent, type SelectableEvent, type ValueEvent } from './dom_events';
import { useAuth } from './contexts';
import { ROLES, CAP } from './rbac';

const {
  useState: useStateUS, useEffect: useEffectUS, useCallback: useCallbackUS, useMemo: useMemoUS,
} = React;

/** Balasan `users.invite` / `users.sendPasswordReset` — keduanya melaporkan hasil pengiriman
 *  dan, bila email mati, tautan sekali-pakai untuk diserahkan langsung. */
interface DeliveryResult {
  delivery: 'sent' | 'not-configured' | 'failed';
  link: string | null;
}
interface InviteResult extends DeliveryResult { userId: string; expiresInDays: number }
interface ResetResult extends DeliveryResult { expiresInMinutes: number }

interface Row {
  id: string; name: string; initials: string | null; role: string; email: string | null;
  totpEnabled: boolean; active: boolean; hasPassword: boolean; isAdmin: boolean;
  inviteExpiresAt: string | null;
}

const fmtDate = (v: string | null) => (v ? new Date(v).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

/** Pesan server → kalimat yang dapat ditindaklanjuti. Kode mentah tak pernah sampai ke layar. */
function humanError(msg: string): string {
  if (msg === 'email-taken') return 'Email itu sudah dipakai pengguna lain di firma ini.';
  if (msg === 'last-firm-admin') return 'Ditolak: firma harus selalu punya minimal satu admin aktif. Angkat admin lain lebih dulu.';
  if (msg === 'cannot-deactivate-self') return 'Anda tidak dapat menonaktifkan akun Anda sendiri.';
  if (msg === 'unknown-role') return 'Peran itu tidak dikenal.';
  if (msg === 'user-deactivated') return 'Pengguna ini nonaktif. Aktifkan kembali sebelum mengirim tautan.';
  if (msg.startsWith('requires:')) return 'Anda tidak punya kewenangan untuk tindakan ini.';
  if (msg === 'cross-firm-user') return 'Pengguna itu bukan milik firma Anda.';
  return 'Tindakan gagal. Coba lagi, atau muat ulang halaman bila berulang.';
}

/** Kotak tautan sekali-pakai — muncul HANYA ketika email tak terkirim. */
function LinkFallback({ link, note }: { link: string | null; note: string }) {
  const [copied, setCopied] = useStateUS(false);
  if (!link) {
    return (
      <div className="note-box" style={{ marginTop: 10 }}>
        Email belum dikonfigurasi pada instance ini, dan tautan tak dapat dirakit tanpa
        <code> PUBLIC_BASE_URL</code>. Minta operator menyetel email (lihat <code>docs/DEPLOY.md</code>)
        agar undangan dan reset kata sandi terkirim otomatis.
      </div>
    );
  }
  return (
    <div className="note-box" style={{ marginTop: 10 }}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>Email tidak terkirim — serahkan tautan ini secara langsung</div>
      <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-3)', marginBottom: 6 }}>{note}</div>
      <input readOnly value={link} onFocus={(e: SelectableEvent) => e.target.select()}
        style={{ width: '100%', fontFamily: 'var(--mono)', fontSize: 'var(--fs-xs)' }} aria-label="Tautan sekali pakai" />
      <Btn sm onClick={() => {
        try { navigator.clipboard.writeText(link); setCopied(true); } catch (e) { /* clipboard ditolak */ }
      }}>{copied ? 'Tersalin' : 'Salin tautan'}</Btn>
    </div>
  );
}

function InviteDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [name, setName] = useStateUS('');
  const [email, setEmail] = useStateUS('');
  const [role, setRole] = useStateUS('Junior Auditor');
  const [busy, setBusy] = useStateUS(false);
  const [err, setErr] = useStateUS('');
  const [result, setResult] = useStateUS(null as InviteResult | null);
  // id unik per instance (pola repo: view_aje/view_firm/overlay). id statis akan kembar bila
  // dialog ini pernah ter-mount dua kali, dan <label for> lalu menunjuk kontrol yang salah.
  const uid = React.useId();

  async function submit(e: PreventableEvent) {
    e.preventDefault();
    if (busy) return;
    setErr(''); setBusy(true);
    try {
      const r = await api.users.invite.mutate({ name: name.trim(), email: email.trim(), role });
      setResult(r);
      onDone();
    } catch (ex) {
      setErr(humanError(errMessage(ex)));
    }
    setBusy(false);
  }

  return (
    <Overlay title="Undang staf" onClose={onClose} size="md">
      {result ? (
        <div>
          <div className="ok-box">
            {result.delivery === 'sent'
              ? `Undangan terkirim. Tautannya berlaku ${result.expiresInDays} hari.`
              : 'Akun dibuat, tetapi email tidak terkirim.'}
          </div>
          {result.delivery !== 'sent' && (
            <LinkFallback link={result.link} note={`Berlaku ${result.expiresInDays} hari, sekali pakai.`} />
          )}
          <div style={{ marginTop: 14, textAlign: 'right' }}><Btn variant="primary" onClick={onClose}>Selesai</Btn></div>
        </div>
      ) : (
        <form onSubmit={submit}>
          <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-2)', marginTop: 0 }}>
            Staf akan menerima email berisi tautan untuk memilih kata sandinya sendiri.
            Anda tidak pernah mengetahui kata sandi siapa pun.
          </p>
          {err && <div className="err-box" role="alert">{err}</div>}

          <label className="fld-label" htmlFor={uid + "-name"}>Nama lengkap</label>
          <input id={uid + "-name"} className="fld" required autoFocus value={name}
            onChange={(e: ValueEvent) => setName(e.target.value)} placeholder="Dimas Raharjo" />

          <label className="fld-label" htmlFor={uid + "-email"}>Email</label>
          <input id={uid + "-email"} className="fld" type="email" required value={email}
            onChange={(e: ValueEvent) => setEmail(e.target.value)} placeholder="dimas.r@kap-anda.id" />

          <label className="fld-label" htmlFor={uid + "-role"}>Peran</label>
          <select id={uid + "-role"} className="fld" value={role} onChange={(e: ValueEvent) => setRole(e.target.value)}>
            {(ROLES as string[]).map((r: string) => <option key={r} value={r}>{r}</option>)}
          </select>

          <div style={{ marginTop: 14, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Btn onClick={onClose} type="button">Batal</Btn>
            <Btn variant="primary" type="submit" disabled={busy}>{busy ? 'Mengundang…' : 'Kirim undangan'}</Btn>
          </div>
        </form>
      )}
    </Overlay>
  );
}

export function UserManagement() {
  // useAuth() menerbitkan `user`, bukan `me` — dipagari uji firm_identity.test.ts, yang menolak
  // pembacaan kunci konteks yang tak pernah ada (ia akan selalu undefined, diam-diam).
  const { can, user } = useAuth() as { can: (c: string) => boolean; user: { id: string } | null };
  const [rows, setRows] = useStateUS([] as Row[]);
  const [loading, setLoading] = useStateUS(true);
  const [err, setErr] = useStateUS('');
  const [inviting, setInviting] = useStateUS(false);
  const [reset, setReset] = useStateUS(null as ResetResult | null);
  const [pendingId, setPendingId] = useStateUS('');

  const allowed = can && can(CAP.FIRM_ADMIN);

  const load = useCallbackUS(async () => {
    setLoading(true);
    try {
      setRows(await api.users.list.query());
      setErr('');
    } catch (ex) {
      setErr(humanError(errMessage(ex)));
    }
    setLoading(false);
  }, []);

  useEffectUS(() => { if (allowed) load(); else setLoading(false); }, [allowed, load]);

  /* Cermin klien dari pagar server `assertFirmKeepsAnAdmin`. Server tetap yang memutuskan; ini
     ada supaya tombolnya mati SEBELUM diklik, bukan supaya aturannya dipindahkan ke sini. */
  const activeAdmins = useMemoUS(() => rows.filter((r: Row) => r.isAdmin && r.active).length, [rows]);

  async function act(id: string, fn: () => Promise<unknown>) {
    setPendingId(id); setErr('');
    try { await fn(); await load(); } catch (ex) { setErr(humanError(errMessage(ex))); }
    setPendingId('');
  }

  if (!allowed) {
    return (
      <Panel title="Manajemen Pengguna">
        <div className="note-box">Halaman ini hanya untuk admin firma.</div>
      </Panel>
    );
  }

  return (
    <div className="view-wrap">
      <Panel
        title="Manajemen Pengguna"
        sub={`${rows.filter((r: Row) => r.active).length} aktif · ${rows.length} total`}
        actions={<Btn variant="primary" sm icon={I.plus && <I.plus />} onClick={() => setInviting(true)}>Undang staf</Btn>}
      >
        {err && <div className="err-box" role="alert">{err}</div>}
        {loading ? (
          <div className="muted">Memuat…</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th scope="col">Nama</th>
                  <th scope="col">Email</th>
                  <th scope="col">Peran</th>
                  <th scope="col">Status</th>
                  <th scope="col">2FA</th>
                  <th scope="col">Tindakan</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u: Row) => {
                  const busy = pendingId === u.id;
                  const isSelf = !!user && u.id === user.id;
                  const lastAdmin = u.isAdmin && u.active && activeAdmins <= 1;
                  return (
                    <tr key={u.id} style={{ opacity: u.active ? 1 : 0.6 }}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{u.name}{isSelf ? ' (Anda)' : ''}</div>
                        {!u.hasPassword && u.active && (
                          <Badge kind="amber">Undangan menunggu · s/d {fmtDate(u.inviteExpiresAt)}</Badge>
                        )}
                      </td>
                      <td style={{ fontFamily: 'var(--mono)', fontSize: 'var(--fs-xs)' }}>{u.email || '—'}</td>
                      <td>
                        <select
                          className="fld sm"
                          value={u.role}
                          disabled={busy || !u.active || lastAdmin}
                          title={lastAdmin ? 'Firma harus punya minimal satu admin aktif' : undefined}
                          aria-label={`Peran ${u.name}`}
                          onChange={(e: ValueEvent) => act(u.id, () => api.users.setRole.mutate({ userId: u.id, role: e.target.value }))}
                        >
                          {(ROLES as string[]).map((r: string) => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </td>
                      <td>
                        {u.active
                          ? <Badge kind="green">Aktif</Badge>
                          : <Badge kind="grey">Nonaktif</Badge>}
                      </td>
                      <td>{u.totpEnabled ? <Badge kind="blue">Aktif</Badge> : <span className="muted">—</span>}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {u.active && (
                            <Btn sm disabled={busy} title="Kirim tautan setel-ulang kata sandi"
                              onClick={() => act(u.id, async () => setReset(await api.users.sendPasswordReset.mutate({ userId: u.id })))}>
                              Reset sandi
                            </Btn>
                          )}
                          {u.totpEnabled && (
                            <Btn sm disabled={busy} title="Untuk staf yang kehilangan authenticator-nya"
                              onClick={() => act(u.id, () => api.users.clearTotp.mutate({ userId: u.id }))}>
                              Lepas 2FA
                            </Btn>
                          )}
                          <Btn
                            sm
                            disabled={busy || isSelf || lastAdmin}
                            title={isSelf ? 'Anda tidak dapat menonaktifkan diri sendiri'
                              : lastAdmin ? 'Firma harus punya minimal satu admin aktif' : undefined}
                            onClick={() => act(u.id, () => api.users.setActive.mutate({ userId: u.id, active: !u.active }))}
                          >
                            {u.active ? 'Nonaktifkan' : 'Aktifkan'}
                          </Btn>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {inviting && <InviteDialog onClose={() => setInviting(false)} onDone={load} />}

      {reset && (
        <Overlay title="Tautan setel-ulang kata sandi" onClose={() => setReset(null)} size="md">
          {reset.delivery === 'sent' ? (
            <div className="ok-box">
              Email terkirim. Tautannya berlaku {reset.expiresInMinutes} menit dan hanya dapat dipakai sekali.
            </div>
          ) : (
            <LinkFallback link={reset.link} note={`Berlaku ${reset.expiresInMinutes} menit, sekali pakai.`} />
          )}
          <div style={{ marginTop: 14, textAlign: 'right' }}><Btn variant="primary" onClick={() => setReset(null)}>Tutup</Btn></div>
        </Overlay>
      )}
    </div>
  );
}
