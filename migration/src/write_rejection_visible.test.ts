/* ============================================================
   PENOLAKAN SERVER HARUS TERLIHAT — gerbang atas `useServerState.flush()`.

   Cacat yang ditutup: `flush()` menangani SATU kegagalan (kalah balapan CAS,
   409) dan menjatuhkan sisanya ke cabang bertanda "other errors (offline):
   cache already holds the value". Penolakan otorisasi — 403 FORBIDDEN dari
   `capForWrite`, yang menggerbang antara lain keempat dokumen independensi
   (`independence` · `indepAppr` · `indepThreats` · `indepRotAck` → HR_MANAGE) —
   mendarat di sana juga. Akibatnya: nilai lokal dipertahankan, tak ada pesan,
   dan layar terus mengklaim perubahan yang server tak pernah simpan.

   CATATAN PENGGABUNGAN (2026-08-23). Dua arc menutup cacat ini secara terpisah:
   PR #276 (independensi) lewat `writeFailureKind(err) === 'rejected'` +
   `ams:write-rejected`, dan PR #284/#285 (tanda tangan kertas kerja) lewat
   `isRejected(err)` + `ams:rejected`. Yang mendarat lebih dulu di `master`
   adalah yang kedua, dan ia LEBIH LENGKAP: ia membaca kunci personal lewat
   `personal.get` (`state.get` menolaknya), memulihkan ke nilai awal bila
   dokumennya belum pernah ada di server, membawa KALIMAT penolakan dari server,
   dan SENGAJA mengecualikan 401 (sesi kedaluwarsa bersifat sementara; memulihkan
   nilai server di situ akan membuang suntingan yang masih sah). Gerbang ini
   karena itu diarahkan ke implementasi itu — propertinya sama, penjaganya satu.

   Perilaku klasifikasinya sendiri diuji di `wp_signature.test.ts` (`isRejected`
   / `rejectionMessage`) dan `api.test.ts` (`writeFailureKind`). Di sini yang
   dijaga adalah keberadaan JALUR di `contexts.tsx`: klasifikasi → tarik-ulang
   nilai dari server → beri tahu pengguna. Komentar dibuang sebelum memindai —
   berkas sumber mengutip pola lama sebagai catatan sejarah.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const src = (): string => readFileSync(join(__dirname, 'contexts.tsx'), 'utf8');
const kode = (): string => src().replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/** Awal cabang penolakan di dalam `flush()`. */
function cabangPenolakan(k: string): string {
  const i = k.indexOf('else if (isRejected(err))');
  expect(i, 'cabang penolakan tak ada di flush()').toBeGreaterThan(-1);
  return k.slice(i, i + 900);
}

describe('flush() memisahkan penolakan server dari "offline"', () => {
  it('mengklasifikasikan kegagalan lewat isRejected, bukan hanya isConflict', () => {
    const k = kode();
    expect(k, 'isRejected tak diimpor').toMatch(/import \{[^}]*isRejected[^}]*\} from '\.\/api'/);
    /* `else if` — bukan `if` berdiri sendiri: penolakan harus dipisahkan DARI
       cabang konflik dan MENDAHULUI jatuh-tempo ke "offline" di bawahnya.
       Cabang offline itu sendiri tak punya kode, hanya komentar, jadi ia tak
       dapat (dan tak perlu) dijaga di sini. */
    expect(k, 'cabang penolakan tak ada').toContain('else if (isRejected(err))');
  });

  it('nilai lokal DITARIK KEMBALI ke data server saat ditolak — bukan dipertahankan', () => {
    const cabang = cabangPenolakan(kode());
    expect(cabang, 'tak membaca ulang dokumen dari server').toMatch(/reader\.query\(|\.get\.query\(/);
    expect(cabang, 'tak mengembalikan nilai layar ke data server').toContain('setValRaw(');
    /* Kunci personal dibaca lewat `personal.get`; `state.get` menolaknya, jadi
       memakai satu pembaca untuk keduanya akan gagal DIAM pada kunci personal. */
    expect(cabang, 'pembaca kunci personal tak dibedakan').toMatch(/personal/);
  });

  it('penolakan DIUMUMKAN ke lapisan UI, dengan kalimat sebabnya', () => {
    const k = kode();
    expect(cabangPenolakan(k), 'penolakan tidak diumumkan').toContain('emitRejected');
    expect(k, 'emitter tak mengirim event').toMatch(/emitRejected[\s\S]{0,200}dispatchEvent[\s\S]{0,80}ams:rejected/);
    expect(k, 'kalimat penolakan server tak dibawa ke UI').toContain('rejectionMessage(err)');
  });
});

describe('ConflictToaster menampilkan penolakan sebagai penolakan', () => {
  it('mendengarkan event penolakan dan melepasnya saat unmount', () => {
    const k = kode();
    expect(k).toContain("addEventListener('ams:rejected'");
    expect(k).toContain("removeEventListener('ams:rejected'");
  });

  it('pesannya berbeda dari konflik dan TIDAK menawarkan "timpa dengan perubahan saya"', () => {
    const k = kode();
    expect(k, 'judul penolakan tak ada').toMatch(/Penyimpanan ditolak/);
    expect(k, 'kartu tak mengatakan layar sudah dikembalikan').toMatch(/dikembalikan ke nilai yang benar-benar tersimpan/);
    /* Tombol "timpa" pada penolakan hanya akan ditolak lagi — aksi konflik harus
       tergantung pada jenis toast, bukan selalu dirender. */
    const i = k.indexOf('Timpa dengan perubahan saya');
    expect(i, 'aksi konflik hilang').toBeGreaterThan(-1);
    const j = k.lastIndexOf('t.rejected ? (', i);
    expect(j, 'aksi konflik tak dibatasi ke toast konflik').toBeGreaterThan(-1);
  });
});
