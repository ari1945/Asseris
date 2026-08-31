/* B2 — pencocokan rute setel-password.
   Diuji sebagai fungsi murni karena app.tsx memakainya SEBELUM sesi diperiksa: kesalahan di sini
   bukan salah render, melainkan layar publik yang muncul (atau tak muncul) pada alamat yang salah. */
import { describe, it, expect } from 'vitest';
import { tokenFromHash, isSetPasswordRoute } from './view_setpassword';

describe('tokenFromHash', () => {
  it('mengambil token dan men-decode-nya', () => {
    expect(tokenFromHash('#/setel-password?token=abc123')).toBe('abc123');
    expect(tokenFromHash('#/setel-password?token=a%2Bb%3Dc')).toBe('a+b=c');
  });
  it('mengabaikan parameter lain dan urutannya', () => {
    expect(tokenFromHash('#/setel-password?x=1&token=t2&y=3')).toBe('t2');
  });
  it('null bila token tak ada atau kosong', () => {
    expect(tokenFromHash('#/setel-password')).toBeNull();
    expect(tokenFromHash('#/setel-password?token=')).toBeNull();
    expect(tokenFromHash('#/setel-password?token=%20')).toBeNull();
    expect(tokenFromHash('')).toBeNull();
  });
});

describe('isSetPasswordRoute', () => {
  it('menerima HANYA rute setel-password yang benar-benar membawa token', () => {
    expect(isSetPasswordRoute('#/setel-password?token=abc')).toBe(true);
    expect(isSetPasswordRoute('#/setel-password')).toBe(false);
    expect(isSetPasswordRoute('#/setel-password?token=')).toBe(false);
  });
  it('menolak rute lain — termasuk yang berawalan mirip', () => {
    expect(isSetPasswordRoute('#/home')).toBe(false);
    expect(isSetPasswordRoute('#/setel-password-lain?token=abc')).toBe(false);
    expect(isSetPasswordRoute('#/users?token=abc')).toBe(false);
    expect(isSetPasswordRoute('')).toBe(false);
  });
});
