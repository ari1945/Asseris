// Deploy-Readiness M5 — CLI entrypoint for non-destructive firm provisioning.
//   FIRM_NAME='WHR & Rekan' FIRM_SHORT=WHR \
//   ADMIN_NAME='Ari Widodo' ADMIN_EMAIL=ari@whr.id ADMIN_PASSWORD='a-strong-passphrase' \
//   npm run bootstrap        (add BOOTSTRAP_TOTP=0 to skip 2FA; FIRM_ID/ADMIN_ID to override ids)
//
// Reads config from the environment (no interactive prompt → works headless/in-container). The pure
// logic lives in bootstrapFirm.ts; this just wires env → call → human-readable output.
import './env'; // load .env/.env.local first (DATABASE_URL etc.)
import { prisma } from './db';
import { bootstrapFirm } from './bootstrapFirm';

async function main(): Promise<void> {
  const env = process.env;
  const req = (k: string): string => {
    const v = env[k];
    if (!v) throw new Error(`env ${k} wajib diisi`);
    return v;
  };

  const res = await bootstrapFirm(prisma, {
    firm: { id: env.FIRM_ID, name: req('FIRM_NAME'), short: req('FIRM_SHORT') },
    admin: {
      id: env.ADMIN_ID,
      name: req('ADMIN_NAME'),
      email: req('ADMIN_EMAIL'),
      password: req('ADMIN_PASSWORD'),
      initials: env.ADMIN_INITIALS,
    },
    enrolTotp: env.BOOTSTRAP_TOTP !== '0',
  });

  console.log('✓ Firm dibuat        :', res.firmId);
  console.log('✓ Partner-admin      :', res.userId, `(${req('ADMIN_EMAIL')})`);
  if (res.totp) {
    console.log('');
    console.log('⚠ 2FA (TOTP) DIAKTIFKAN — tambahkan ke authenticator SEKARANG sebelum login pertama:');
    console.log('  otpauth URL :', res.totp.otpauthUrl);
    console.log('  secret      :', res.totp.secret);
    console.log('  (jalankan dengan BOOTSTRAP_TOTP=0 bila ingin login password-saja)');
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error('✗ bootstrap-firm gagal:', e instanceof Error ? e.message : e);
    await prisma.$disconnect();
    process.exit(1);
  });
