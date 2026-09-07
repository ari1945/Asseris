// B2 — konfigurasi email transaksional.
//
// Pola persis LLM proxy (llm/config.ts): tanpa konfigurasi, readMailConfig() mengembalikan null
// dan setiap pemanggil melapor `not-configured` alih-alih gagal. Bedanya satu dan penting:
// narasi LLM yang mati hanya menghilangkan kenyamanan, sedangkan email yang mati MEMATIKAN reset
// password mandiri — jadi jalur mundurnya bukan "fitur hilang" melainkan "FIRM_ADMIN yang
// mereset lewat Manajemen Pengguna" (B1). Itu sebabnya undangan mengembalikan tautan sekali-pakai
// ke admin ketika email mati, bukan sekadar menolak.
//
// TRANSPOR = SMTP, BUKAN SDK vendor. Alasannya bukan selera:
//   1. Amazon SES tidak tersedia di ap-southeast-3 (Jakarta) — region hosting default produk ini
//      (docs/HOSTING-DATA-RESIDENCY-REVIEW.md). Mengunci ke SES berarti memaksa email yang berisi
//      nama + alamat email staf melintas ke region lain, yaitu persis kelas isu transfer
//      lintas-batas UU PDP Ps. 56 yang sudah ditandai terbuka untuk fitur LLM. SMTP membiarkan
//      firma memakai mail server sendiri di dalam negeri.
//   2. KAP umumnya ingin email keluar atas nama domainnya sendiri.
//   3. SES tetap bisa dipakai — lewat endpoint SMTP-nya — sehingga ini bukan penutupan pilihan,
//      melainkan pembukaan.
// Penamaan env sengaja mencerminkan ALERT_SMTP_* yang sudah dipakai uptime-alert workflow
// (docs/DEPLOY.md §16), supaya operator tak belajar dua konvensi.

export interface MailConfig {
  host: string;
  port: number;
  /** true → TLS langsung (465); false → STARTTLS (587). */
  secure: boolean;
  user: string | null;
  pass: string | null;
  from: string;
  /** Basis URL publik untuk merakit tautan di dalam email (mis. https://kap.asseris.id). */
  publicBaseUrl: string;
}

function firstNonEmpty(...vals: Array<string | undefined>): string {
  for (const v of vals) {
    const t = (v ?? '').trim();
    if (t) return t;
  }
  return '';
}

/**
 * Resolve konfigurasi email dari env. Mengembalikan null (sinyal `not-configured`) bila host,
 * alamat pengirim, ATAU basis URL publik tak diisi.
 *
 * publicBaseUrl ikut WAJIB dan itu disengaja: email reset tanpa tautan yang benar tidak berguna,
 * dan menebaknya dari header request adalah cara klasik memperkenalkan host-header injection —
 * penyerang yang mengendalikan Host akan membuat kita mengirim tautan reset ke domainnya sendiri.
 * Basis URL karena itu berasal dari konfigurasi server, tak pernah dari permintaan masuk.
 */
export function readMailConfig(env: NodeJS.ProcessEnv = process.env): MailConfig | null {
  const host = firstNonEmpty(env.MAIL_SMTP_HOST);
  const from = firstNonEmpty(env.MAIL_FROM);
  const publicBaseUrl = firstNonEmpty(env.PUBLIC_BASE_URL).replace(/\/+$/, '');
  if (!host || !from || !publicBaseUrl) return null;

  const port = Number(firstNonEmpty(env.MAIL_SMTP_PORT) || '587');
  if (!Number.isInteger(port) || port <= 0 || port > 65535) return null;

  return {
    host,
    port,
    // 465 = SMTPS implisit; selain itu STARTTLS. Dapat dipaksa lewat MAIL_SMTP_SECURE.
    secure: firstNonEmpty(env.MAIL_SMTP_SECURE) ? env.MAIL_SMTP_SECURE === '1' : port === 465,
    user: firstNonEmpty(env.MAIL_SMTP_USER) || null,
    pass: firstNonEmpty(env.MAIL_SMTP_PASS) || null,
    from,
    publicBaseUrl,
  };
}

/** True bila email transaksional dapat dikirim. Dipakai UI untuk memilih kalimat yang jujur. */
export function mailConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return readMailConfig(env) !== null;
}
