// B2 — pengiriman email. Transportnya disuntikkan sehingga uji membuktikan PIPA-nya (siapa
// dikirimi apa, dan kapan TIDAK dikirim) tanpa pernah menyentuh SMTP sungguhan — pola yang sama
// dipakai integrations/sync.ts untuk provider-nya.
import { createTransport } from 'nodemailer';
import { readMailConfig, type MailConfig } from './config';
import type { MailBody } from './templates';
import { inc, log } from '../obs/log';

export interface OutgoingMail extends MailBody {
  to: string;
}

export type MailTransport = (mail: OutgoingMail, cfg: MailConfig) => Promise<void>;

export type SendResult = 'sent' | 'not-configured' | 'failed';

/** Transport SMTP sungguhan. Dibuat per pengiriman: volume email transaksional produk ini
 *  (undangan staf, lupa password) diukur dalam satuan per HARI, jadi menyatukan koneksi tak
 *  memberi apa pun dan hanya menambah keadaan yang bisa basi ketika kredensial dirotasi. */
const smtpTransport: MailTransport = async (mail, cfg) => {
  const transporter = createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: cfg.user && cfg.pass ? { user: cfg.user, pass: cfg.pass } : undefined,
  });
  await transporter.sendMail({
    from: cfg.from,
    to: mail.to,
    subject: mail.subject,
    text: mail.text,
  });
};

let transportOverride: MailTransport | null = null;

/** Uji memasang transport penangkap di sini; kembalikan null untuk memulihkan SMTP nyata. */
export function setMailTransport(t: MailTransport | null): void {
  transportOverride = t;
}

/**
 * Kirim satu email. TIDAK PERNAH melempar.
 *
 * Itu keputusan sadar, bukan penelanan error yang malas: satu-satunya pemanggil adalah alur
 * kredensial, dan di sana kegagalan pengiriman TIDAK BOLEH mengubah jawaban ke pemanggil.
 * Kalau `requestPasswordReset` gagal keras saat SMTP mati, selisih antara "email terkirim" dan
 * "error" menjadi oracle enumerasi: penyerang belajar alamat mana yang terdaftar hanya dari
 * bentuk respons. Kegagalan karena itu dicatat di log server (tempat operator melihatnya) dan
 * dikembalikan sebagai nilai, bukan dilemparkan.
 */
export async function sendMail(mail: OutgoingMail, env: NodeJS.ProcessEnv = process.env): Promise<SendResult> {
  const cfg = readMailConfig(env);
  if (!cfg) {
    inc('mail_not_configured_total');
    return 'not-configured';
  }
  const transport = transportOverride ?? smtpTransport;
  try {
    await transport(mail, cfg);
    inc('mail_sent_total');
    return 'sent';
  } catch (e) {
    inc('mail_failed_total');
    // Subjek AMAN dicatat (konstanta dari templates.ts); alamat penerima TIDAK — log server
    // dikirim off-box (docs/LOGGING.md) dan alamat email staf adalah data pribadi.
    log.error('mail.send.failed', { subject: mail.subject, error: e instanceof Error ? e.message : String(e) });
    return 'failed';
  }
}
