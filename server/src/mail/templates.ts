// B2 — isi email transaksional. Bahasa Indonesia, teks polos (bukan HTML).
//
// Teks polos disengaja: klien email KAP beragam dan sering korporat lawas, email HTML lebih sering
// masuk spam, dan tak ada satu pun di sini yang butuh tata letak. Yang dibutuhkan hanya satu
// tautan yang dapat disalin.
//
// TAK ADA data perikatan/klien yang boleh masuk ke sini. Email keluar dari perimeter aplikasi dan
// singgah di server mail pihak ketiga; isinya karena itu dibatasi pada nama penerima, nama firma,
// dan tautan sekali-pakai — cukup untuk dikenali, tak cukup untuk membocorkan pekerjaan audit.

export interface MailBody {
  subject: string;
  text: string;
}

function footer(firmName: string): string {
  return [
    '',
    'Bila Anda tidak meminta email ini, abaikan saja — tautan di atas akan kedaluwarsa dengan',
    'sendirinya dan password Anda tidak berubah.',
    '',
    `— Asseris, untuk ${firmName}`,
  ].join('\n');
}

/** Email lupa-password. `minutes` diambil dari TTL sesungguhnya, bukan angka yang ditulis tangan. */
export function passwordResetMail(p: {
  name: string;
  firmName: string;
  link: string;
  minutes: number;
}): MailBody {
  return {
    subject: 'Setel ulang password Asseris Anda',
    text: [
      `Halo ${p.name},`,
      '',
      'Kami menerima permintaan untuk menyetel ulang password akun Asseris Anda.',
      'Buka tautan berikut untuk memilih password baru:',
      '',
      p.link,
      '',
      `Tautan ini berlaku ${p.minutes} menit dan hanya dapat dipakai SEKALI.`,
      'Bila akun Anda memakai autentikasi dua faktor, kode dari aplikasi authenticator Anda',
      'tetap diminta — menyetel ulang password tidak melewatinya.',
      footer(p.firmName),
    ].join('\n'),
  };
}

/** Email undangan staf baru. TTL jauh lebih panjang: staf baru mungkin belum duduk di mejanya. */
export function inviteMail(p: {
  name: string;
  firmName: string;
  roleName: string;
  link: string;
  days: number;
}): MailBody {
  return {
    subject: `Akun Asseris Anda di ${p.firmName} sudah dibuat`,
    text: [
      `Halo ${p.name},`,
      '',
      `Akun Asseris Anda di ${p.firmName} sudah dibuat dengan peran ${p.roleName}.`,
      'Buka tautan berikut untuk memilih password Anda sendiri dan mulai masuk:',
      '',
      p.link,
      '',
      `Tautan ini berlaku ${p.days} hari dan hanya dapat dipakai SEKALI.`,
      'Pilih password yang belum pernah Anda pakai di layanan lain, minimal 12 karakter.',
      footer(p.firmName),
    ].join('\n'),
  };
}
