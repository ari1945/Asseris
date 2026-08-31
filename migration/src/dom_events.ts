/* ============================================================
   Tipe event DOM minimal untuk handler JSX.

   Repo ini berjalan dengan `@types/react` yang PARSIAL (lihat CLAUDE.md § jebakan): namespace
   `React` tak mengekspor `ChangeEvent`/`FormEvent`, sehingga anotasi yang biasa dipakai tak
   tersedia. Selama ini jalan keluarnya `(e: any)`, dan itulah salah satu penyumbang terbesar
   baseline ratchet `no-explicit-any`.

   Berkas ini menyediakan alternatif yang jujur: bentuk yang BENAR-BENAR dipakai handler, tak
   lebih. Ia bukan tiruan tipe React yang lengkap — dan sengaja tidak berpura-pura menjadi itu.
   Nilainya sederhana: `e.targett.value` menjadi kesalahan kompilasi, sedangkan dengan `any` ia
   diam-diam menjadi `undefined` di layar pengguna.
   ============================================================ */

/** Event dari <input>/<select>/<textarea> yang membawa nilai. */
export interface ValueEvent<T = string> {
  target: { value: T };
}

/** Event <input type="checkbox"> — nilai boolean-nya di `checked`. */
export interface CheckedEvent {
  target: { checked: boolean };
}

/** Event submit/klik yang perlu dicegah perilaku bawaannya. */
export interface PreventableEvent {
  preventDefault: () => void;
}

/** Event fokus yang dipakai untuk menyorot isi input (mis. kotak "salin tautan"). */
export interface SelectableEvent {
  target: { select: () => void };
}

/** Pesan error yang aman ditampilkan, dari nilai `unknown` hasil catch. */
export function errMessage(e: unknown): string {
  if (e && typeof e === 'object' && 'message' in e) {
    const m = (e as { message?: unknown }).message;
    if (typeof m === 'string') return m;
  }
  return '';
}
