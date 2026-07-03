// PRD docs/prd-add-staff-user-cli.md — CLI entrypoint for adding ONE staff user to a firm that
// already exists. Mirrors bootstrap.ts's shape exactly (env-var config, no interactive prompt).
//   FIRM_ID=FIRM-WHR USER_NAME='Dimas Raharjo' USER_EMAIL=dimas.r@whr-cpa.id \
//   USER_PASSWORD='a-strong-passphrase' USER_ROLE='Senior Auditor' \
//   npm run add-user        (add ENROL_TOTP=0 to skip 2FA; USER_ID/USER_INITIALS to override)
//
// Reads config from the environment (headless/in-container friendly). The pure logic lives in
// addUser.ts; this just wires env → call → human-readable output.
import './env'; // load .env/.env.local first (DATABASE_URL etc.)
import { prisma } from './db';
import { addUser } from './addUser';
import { assertProdConfig } from './prodConfig';
import { loadSecretsIntoEnv } from './secrets';

async function main(): Promise<void> {
  // Opt-in (SECRETS_PROVIDER=aws-sm) — no-op otherwise. Same fail-closed reasoning as bootstrap.ts:
  // this CLI can write a TOTP secret, so it must see the SAME resolved secrets assertProdConfig
  // below is about to gate, regardless of .env vs Secrets Manager.
  await loadSecretsIntoEnv();

  const env = process.env;

  // Same guard as bootstrap.ts/server.ts, same fail-closed behavior, before any DB write happens —
  // this CLI writes a TOTP secret (encrypted via APP_ENCRYPTION_KEY) just like bootstrap does, so
  // it must go through the SAME M2 fail-fast gate (a prior gap in bootstrap.ts itself, found &
  // fixed pre-push in PR#43 — not repeating that class of bug here).
  assertProdConfig(env, {
    onProblem: (p) => console.error(`✗ config.invalid  ${p.key}: ${p.problem}`),
    onExit: (count) => {
      console.error(`✗ add-user ditolak: ${count} masalah konfigurasi produksi tidak aman. Perbaiki env lalu jalankan ulang.`);
      process.exit(1);
    },
  });

  const req = (k: string): string => {
    const v = env[k];
    if (!v) throw new Error(`env ${k} wajib diisi`);
    return v;
  };

  const firmId = req('FIRM_ID');
  const firm = await prisma.firm.findUnique({ where: { id: firmId } });
  // addUser() itself also refuses if the firm is missing — this early check just lets us print
  // the firm NAME (not just id) as a visual confirmation before writing, per Risks §8 of the PRD
  // (operator picking the wrong FIRM_ID on a box that somehow serves more than one firm).
  if (firm) console.log(`→ Menambah staf ke firma: ${firm.name} (${firm.id})`);

  const res = await addUser(prisma, {
    firmId,
    user: {
      id: env.USER_ID,
      name: req('USER_NAME'),
      email: req('USER_EMAIL'),
      password: req('USER_PASSWORD'),
      role: req('USER_ROLE'),
      initials: env.USER_INITIALS,
    },
    enrolTotp: env.ENROL_TOTP !== '0',
  });

  console.log('✓ Staf ditambahkan   :', res.userId, `(${req('USER_EMAIL')}, ${req('USER_ROLE')})`);
  if (res.totp) {
    console.log('');
    console.log('⚠ 2FA (TOTP) DIAKTIFKAN — tambahkan ke authenticator SEKARANG sebelum login pertama:');
    console.log('  otpauth URL :', res.totp.otpauthUrl);
    console.log('  secret      :', res.totp.secret);
    console.log('  (jalankan dengan ENROL_TOTP=0 bila ingin login password-saja)');
  }
  console.log('');
  console.log('Sarankan staf ganti password sementara ini saat login pertama (Ubah Kata Sandi).');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error('✗ add-user gagal:', e instanceof Error ? e.message : e);
    await prisma.$disconnect();
    process.exit(1);
  });
