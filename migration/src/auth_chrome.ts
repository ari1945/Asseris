/* ============================================================
   B2 — gaya bersama layar PRA-LOGIN (masuk & setel password).

   Diekstrak saat layar kedua muncul, bukan sebelumnya. Alasannya bukan keindahan melainkan
   pemeliharaan: dua kartu pra-login yang menyalin nilai gaya satu sama lain akan menyimpang pada
   penyuntingan pertama, dan yang terlihat pengguna adalah dua "Asseris" yang tidak sama pada
   dua layar berurutan dalam satu alur.

   Ukuran font mematuhi skala tipografi mengikat (CLAUDE.md §5): hanya 11 · 12 · 13 · 15 · 19.
   Warna memakai token CSS dengan fallback, sama seperti view_login.tsx sebelumnya — layar ini
   dirender SEBELUM shell aplikasi mount, jadi fallback-nya benar-benar terpakai.
   ============================================================ */

export interface AuthCardStyles {
  wrap: Record<string, unknown>;
  card: Record<string, unknown>;
  logo: Record<string, unknown>;
  title: Record<string, unknown>;
  lead: Record<string, unknown>;
  who: Record<string, unknown>;
  label: Record<string, unknown>;
  input: Record<string, unknown>;
  otp: Record<string, unknown>;
  btn: Record<string, unknown>;
  linkBtn: Record<string, unknown>;
  errBox: Record<string, unknown>;
  okBox: Record<string, unknown>;
  hint: Record<string, unknown>;
}

export function authCard(busy = false): AuthCardStyles {
  const input = {
    width: '100%', height: 38, borderRadius: 8, border: '1px solid var(--line, #d7dce3)',
    padding: '0 11px', font: '15px inherit', boxSizing: 'border-box', marginBottom: 14,
    background: 'var(--surface, #fff)', color: 'inherit',
  };
  return {
    wrap: { minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--navy, #1f3a5f)', padding: 20 },
    card: {
      width: 380, maxWidth: '92vw', background: 'var(--surface, #fff)', borderRadius: 14,
      boxShadow: '0 24px 60px rgba(8,15,30,.38)', padding: '30px 30px 26px',
      font: '15px/1.5 Inter, system-ui, sans-serif', color: 'var(--ink, #1f2733)',
    },
    logo: {
      width: 46, height: 46, borderRadius: 11, background: 'var(--navy, #1f3a5f)', color: '#fff',
      display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 19, marginBottom: 14,
    },
    title: { fontSize: 19, fontWeight: 800, letterSpacing: -0.2 },
    lead: { fontSize: 12, color: 'var(--ink-2, #5a6675)', marginBottom: 22 },
    who: {
      fontSize: 12, fontWeight: 600, color: 'var(--ink-2, #5a6675)',
      background: 'var(--surface-2, #f7f8fa)', border: '1px solid var(--line, #d7dce3)',
      borderRadius: 8, padding: '7px 10px', marginBottom: 16,
    },
    label: { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-2, #5a6675)', marginBottom: 5 },
    input,
    otp: { ...input, letterSpacing: 4, fontFamily: 'JetBrains Mono, monospace' },
    btn: {
      width: '100%', height: 40, borderRadius: 8, border: 'none', background: 'var(--blue, #2563eb)',
      color: '#fff', fontWeight: 700, fontSize: 15, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.7 : 1,
    },
    // Tombol NATIVE yang tampil seperti tautan — bukan <span onClick> (CLAUDE.md §3.7):
    // ia harus dapat di-Tab dan dipicu Enter/Space seperti kontrol sungguhan.
    linkBtn: {
      background: 'none', border: 'none', padding: 0, marginTop: 12,
      color: 'var(--blue, #2563eb)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
      textDecoration: 'underline', font: 'inherit',
    },
    errBox: { background: 'var(--red-bg, #fde8e8)', color: 'var(--red, #c0392b)', borderRadius: 8, padding: '8px 11px', fontSize: 12, marginBottom: 14 },
    okBox: { background: 'var(--green-bg, #e8f3ec)', color: 'var(--green, #1f7a4d)', borderRadius: 8, padding: '8px 11px', fontSize: 12, marginBottom: 14 },
    hint: { fontSize: 11, color: 'var(--ink-3, #6b7684)', marginTop: -6, marginBottom: 14 },
  };
}
