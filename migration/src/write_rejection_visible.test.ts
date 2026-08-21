/* ============================================================
   PENOLAKAN SERVER HARUS TERLIHAT — gerbang atas `useServerState.flush()`.

   Cacat yang ditutup: `flush()` menangani SATU kegagalan (kalah balapan CAS,
   409) dan menjatuhkan sisanya ke cabang bertanda "other errors (offline):
   cache already holds the value". Penolakan otorisasi — 403 FORBIDDEN dari
   `capForWrite`, yang menggerbang antara lain keempat dokumen independensi
   (`independence` · `indepAppr` · `indepThreats` · `indepRotAck` → HR_MANAGE) —
   mendarat di sana juga. Akibatnya: nilai lokal dipertahankan, tak ada pesan,
   dan layar terus mengklaim perubahan yang server tak pernah simpan.

   Uji ini membaca SUMBER `contexts.tsx`. Yang dijaga bukan hasil hitung
   melainkan keberadaan jalur: klasifikasi → tarik-ulang nilai → beri tahu
   pengguna. Perilaku klasifikasinya sendiri diuji di `api.test.ts`
   (`writeFailureKind`). Komentar dibuang sebelum memindai — berkas sumber
   mengutip pola lama sebagai catatan sejarah.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const src = (): string => readFileSync(join(__dirname, 'contexts.tsx'), 'utf8');
const kode = (): string => src().replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('flush() memisahkan penolakan server dari "offline"', () => {
  it('mengklasifikasikan kegagalan lewat writeFailureKind, bukan hanya isConflict', () => {
    const k = kode();
    expect(k, 'writeFailureKind tak diimpor').toMatch(/import \{[^}]*writeFailureKind[^}]*\} from '\.\/api'/);
    expect(k, 'cabang penolakan tak ada').toMatch(/writeFailureKind\(err\)\s*===\s*'rejected'/);
  });

  it('nilai lokal DITARIK KEMBALI ke data server saat ditolak — bukan dipertahankan', () => {
    const k = kode();
    const i = k.indexOf("writeFailureKind(err) === 'rejected'");
    expect(i, 'cabang penolakan tak ada').toBeGreaterThan(-1);
    const cabang = k.slice(i, i + 700);
    expect(cabang, 'tak membaca ulang dokumen dari server').toContain('readTarget(t)');
    expect(cabang, 'tak mengembalikan nilai layar ke data server').toContain('setValRaw(res.value)');
  });

  it('penolakan DIUMUMKAN ke lapisan UI', () => {
    const k = kode();
    const i = k.indexOf("writeFailureKind(err) === 'rejected'");
    expect(k.slice(i, i + 900), 'penolakan tidak diumumkan').toContain('emitWriteRejected');
    expect(k, 'emitter tak mengirim event').toMatch(/emitWriteRejected[\s\S]{0,200}dispatchEvent[\s\S]{0,80}ams:write-rejected/);
  });
});

describe('ConflictToaster menampilkan penolakan sebagai penolakan', () => {
  it('mendengarkan event penolakan dan melepasnya saat unmount', () => {
    const k = kode();
    expect(k).toContain("addEventListener('ams:write-rejected'");
    expect(k).toContain("removeEventListener('ams:write-rejected'");
  });

  it('pesannya berbeda dari konflik dan TIDAK menawarkan "timpa dengan perubahan saya"', () => {
    const k = kode();
    expect(k, 'judul penolakan tak ada').toMatch(/Perubahan ditolak server/);
    expect(k, 'pesan tak menyebut sebab (kewenangan/sesi)').toMatch(/tidak berwenang menulis dokumen ini/);
    /* Tombol "timpa" pada penolakan otorisasi hanya akan ditolak lagi — ia harus
       tergantung pada jenis toast, bukan selalu dirender. */
    expect(k, 'aksi konflik tak dibatasi ke toast konflik').toMatch(/kind\s*!==\s*'rejected'\s*&&/);
  });
});
