// Tahap 9 — PILOT: provisioning satu firma + SATU engagement risiko rendah.
//
// Berbeda dari `npm run seed` (demo FIRM-WHR dengan ~8 engagement) dan `npm run
// bootstrap` (hanya firma + Partner-admin). Perintah ini membuat PERSIS yang
// dijanjikan pilot: 1 firma, 1 klien berisiko rendah, 1 engagement berisiko
// rendah, 1 Partner-admin, tim minimal, WTB singkat, dan membership — lalu
// menulis state docs yang dibutuhkan aplikasi saat boot (scope user/firm).
//
// AMAN: menolak bila DB sudah punya firma apa pun (sama dengan bootstrapFirm),
// sehingga tak akan pernah menimpa firma/demo yang sudah ada. Arahkan ke DB
// pilot yang memang kosong (mis. `neosuite_pilot`).
//
//   PILOT_FIRM_NAME='KAP Pilot Andalan' PILOT_FIRM_SHORT=KAPA \
//   PILOT_ADMIN_NAME='Ari Widodo' PILOT_ADMIN_EMAIL=ari@kap-pilot.id \
//   PILOT_ADMIN_PASSWORD='<passphrase >= 12 karakter>' \
//   npm run pilot:provision
import './env'; // load .env/.env.local first (DATABASE_URL etc.)
import { prisma } from './db';
import { bootstrapFirm } from './bootstrapFirm';
import { assertProdConfig } from './prodConfig';
import { loadSecretsIntoEnv } from './secrets';
import { mutateStateDoc } from './stateMutation';

async function main(): Promise<void> {
  await loadSecretsIntoEnv();
  const env = process.env;

  assertProdConfig(env, {
    onProblem: (p) => console.error(`✗ config.invalid  ${p.key}: ${p.problem}`),
    onExit: (count) => {
      console.error(`✗ pilot ditolak: ${count} masalah konfigurasi produksi tidak aman.`);
      process.exit(1);
    },
  });

  const req = (k: string): string => {
    const v = env[k];
    if (!v) throw new Error(`env ${k} wajib diisi`);
    return v;
  };

  // 1) Firma + Partner-admin (menolak bila DB tidak kosong).
  const res = await bootstrapFirm(prisma, {
    firm: { id: env.PILOT_FIRM_ID, name: req('PILOT_FIRM_NAME'), short: req('PILOT_FIRM_SHORT') },
    admin: {
      id: env.PILOT_ADMIN_ID,
      name: req('PILOT_ADMIN_NAME'),
      email: req('PILOT_ADMIN_EMAIL'),
      password: req('PILOT_ADMIN_PASSWORD'),
      initials: env.PILOT_ADMIN_INITIALS,
    },
    enrolTotp: env.PILOT_TOTP !== '0',
  });
  const { firmId, userId } = res;

  // 2) Klien risiko rendah (SATU).
  const clientId = env.PILOT_CLIENT_ID ?? 'C-PLT-001';
  await prisma.client.create({
    data: {
      id: clientId,
      firmId,
      name: env.PILOT_CLIENT_NAME ?? 'PT Ritel Sejahtera Nusantara',
      industry: env.PILOT_CLIENT_INDUSTRY ?? 'Perdagangan & Distribusi',
      tier: 'Tier 3',
      risk: 'Low', // kunci pilot: risiko rendah
      npwp: '06.204.118.5-411.000',
      city: 'Yogyakarta, DIY',
      listed: false,
      since: 2021,
      partner: req('PILOT_ADMIN_NAME'),
      fee: 350_000_000,
      status: 'Active',
    },
  });

  // 3) Engagement risiko rendah (SATU).
  const engagementId = env.PILOT_ENGAGEMENT_ID ?? 'ENG-2026-PLT-001';
  const fy = env.PILOT_ENGAGEMENT_FY ?? 'FY2026';
  await prisma.engagement.create({
    data: {
      id: engagementId,
      firmId,
      clientId,
      type: 'Audit Laporan Keuangan',
      fy,
      standard: 'SA',
      status: 'Planning',
      phase: 'Perencanaan',
      progress: 12,
      partner: req('PILOT_ADMIN_NAME'),
      manager: req('PILOT_ADMIN_NAME'),
      deadline: '2027-03-31',
      budgetHrs: 820,
      actualHrs: 64,
      risk: 'Low', // kunci pilot: risiko rendah
      materiality: 900_000_000,
    },
  });

  // 4) Tim minimal + membership admin.
  await prisma.teamMember.createMany({
    data: [
      { firmId, name: req('PILOT_ADMIN_NAME'), role: 'Engagement Partner', util: 42 },
      { firmId, name: 'Andi Pratama', role: 'Senior Auditor', util: 38 },
      { firmId, name: 'Bella Kusuma', role: 'Junior Auditor', util: 31 },
    ],
  });
  await prisma.engagementMember.create({
    data: { engagementId, userId },
  });

  // 5) WTB singkat (neraca saldo berisiko rendah — perdagangan).
  const WTB_PILOT: Array<{ group: string; code: string; name: string; ly: number; unadj: number; aje: number; lead: string }> = [
    { group: 'Aset Lancar', code: '1-100', name: 'Kas & Bank', ly: 120_000_000, unadj: 132_000_000, aje: 0, lead: 'S' },
    { group: 'Aset Lancar', code: '1-110', name: 'Piutang Usaha', ly: 210_000_000, unadj: 224_000_000, aje: 0, lead: 'A' },
    { group: 'Aset Lancar', code: '1-120', name: 'Persediaan Barang Dagang', ly: 180_000_000, unadj: 195_000_000, aje: 0, lead: 'A' },
    { group: 'Aset Tidak Lancar', code: '1-200', name: 'Aset Tetap — Neto', ly: 260_000_000, unadj: 258_000_000, aje: 0, lead: 'A' },
    { group: 'Liabilitas', code: '2-100', name: 'Utang Usaha', ly: 95_000_000, unadj: 102_000_000, aje: 0, lead: 'S' },
    { group: 'Liabilitas', code: '2-110', name: 'Utang Pajak', ly: 28_000_000, unadj: 31_000_000, aje: 0, lead: 'S' },
    { group: 'Ekuitas', code: '3-100', name: 'Modal Disetor', ly: 400_000_000, unadj: 400_000_000, aje: 0, lead: 'S' },
    { group: 'Ekuitas', code: '3-200', name: 'Saldo Laba', ly: 247_000_000, unadj: 276_000_000, aje: 0, lead: 'S' },
    { group: 'Pendapatan', code: '4-100', name: 'Pendapatan Usaha', ly: 850_000_000, unadj: 912_000_000, aje: 0, lead: 'S' },
    { group: 'Beban', code: '5-100', name: 'Beban Pokok Penjualan', ly: 610_000_000, unadj: 654_000_000, aje: 0, lead: 'S' },
    { group: 'Beban', code: '5-200', name: 'Beban Usaha', ly: 148_000_000, unadj: 156_000_000, aje: 0, lead: 'S' },
    { group: 'Beban', code: '5-300', name: 'Beban Pajak Penghasilan', ly: 21_000_000, unadj: 23_000_000, aje: 0, lead: 'S' },
  ];
  let ord = 0;
  for (const w of WTB_PILOT) {
    await prisma.wtbRow.create({
      data: { engagementId, ord: ord++, group: w.group, code: w.code, name: w.name, ly: w.ly, unadj: w.unadj, aje: w.aje, lead: w.lead },
    });
  }

  // 6) State docs yang dibaca app saat boot (scope user + firm) — minimal:
  //    profil user & preferensi UI di scope 'user'; personal seed kosong di scope 'firm'.
  await mutateStateDoc({
    scope: 'user', scopeId: userId, key: 'profile',
    expectedVersion: 0, updatedBy: userId, actorUserId: userId,
    actorRole: 'system:pilot', action: 'STATE_SET',
    auditDetail: () => 'pilot-provision:v1',
    mutate: () => ({ value: { name: req('PILOT_ADMIN_NAME'), email: req('PILOT_ADMIN_EMAIL'), role: 'Engagement Partner' } }),
  });
  for (const key of ['payrollData', 'leaveReqs', 'perfPeople', 'independence', 'indepThreats', 'pc.ethics', 'pc.gifts']) {
    await mutateStateDoc({
      scope: 'firm', scopeId: firmId, key,
      expectedVersion: 0, updatedBy: userId, actorUserId: userId,
      actorRole: 'system:pilot', action: 'STATE_SET',
      auditDetail: () => 'pilot-provision:v1',
      mutate: () => ({ value: Array.isArray({}[key]) ? [] : {} }),
    }).catch(() => {/* idempoten: kunci boleh sudah ada */});
  }

  console.log('');
  console.log('✓ PILOT DIPROVISI — satu firma, satu engagement risiko rendah.');
  console.log(`  Firma       : ${firmId} — ${req('PILOT_FIRM_NAME')} (${req('PILOT_FIRM_SHORT')})`);
  console.log(`  Klien       : ${clientId} — ${env.PILOT_CLIENT_NAME ?? 'PT Ritel Sejahtera Nusantara'} (risiko Low)`);
  console.log(`  Engagement  : ${engagementId} — ${fy} (risiko Low · fase Perencanaan)`);
  console.log(`  Partner     : ${userId} — ${req('PILOT_ADMIN_EMAIL')}`);
  console.log(`  WTB         : ${WTB_PILOT.length} baris`);
  if (res.totp) {
    console.log('');
    console.log('⚠ 2FA (TOTP) DIAKTIFKAN — tambahkan ke authenticator SEKARANG sebelum login pertama:');
    console.log('  otpauth URL :', res.totp.otpauthUrl);
    console.log('  secret      :', res.totp.secret);
    console.log('  (jalankan dengan PILOT_TOTP=0 bila ingin login password-saja)');
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error('✗ pilot-provision gagal:', e instanceof Error ? e.message : e);
    await prisma.$disconnect();
    process.exit(1);
  });
