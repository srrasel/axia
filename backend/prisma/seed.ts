import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const adminEmail = 'admin@seekapa.com'
  const demoEmail = 'mohammed.naser@example.com'

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: 'Platform Admin',
      initials: 'PA',
      passwordHash: await bcrypt.hash('admin123', 10),
      role: 'ADMIN',
      verified: true,
      funded: true,
      totalDeposited: 10000,
      questionnaireDone: true,
      referralCode: 'NITAJFX-ADMIN',
      kycStatus: 'approved',
    },
  })

  const demo = await prisma.user.upsert({
    where: { email: demoEmail },
    update: {},
    create: {
      email: demoEmail,
      name: 'Mohammed naser',
      initials: 'MN',
      nationality: 'Saudi Arabia',
      passwordHash: await bcrypt.hash('demo123', 10),
      role: 'USER',
      verified: true,
      funded: false,
      questionnaireDone: false,
      referralCode: 'NITAJFX-MN26',
      accounts: {
        create: [
          {
            number: '5611305',
            type: 'live',
            balance: 0,
            equity: 0,
            leverage: '1:400',
            platform: 'MT5',
            currency: 'USD',
          },
          {
            number: '6611306',
            type: 'demo',
            balance: 24767.36,
            equity: 24767.36,
            leverage: '1:400',
            platform: 'MT5',
            currency: 'USD',
          },
        ],
      },
      notifications: {
        create: [
          {
            title: 'Action Required',
            body: 'Fund your live account to unlock deposits and withdrawals.',
          },
          {
            title: 'Verification',
            body: 'Upload documents in Verification Center.',
          },
        ],
      },
    },
    include: { accounts: true },
  })

  const demoAccount = demo.accounts.find((a) => a.type === 'demo')
  if (demoAccount) {
    const existing = await prisma.trade.count({ where: { accountId: demoAccount.id } })
    if (existing === 0) {
      await prisma.trade.createMany({
        data: [
          {
            userId: demo.id,
            accountId: demoAccount.id,
            symbol: 'EURUSD',
            side: 'buy',
            volume: 1,
            openPrice: 1.14381,
            currentPrice: 1.1412,
            status: 'open',
            swap: -2.4,
            category: 'forex',
            source: 'self',
          },
          {
            userId: demo.id,
            accountId: demoAccount.id,
            symbol: 'EURUSD',
            side: 'buy',
            volume: 0.5,
            openPrice: 1.1452,
            currentPrice: 1.1412,
            status: 'open',
            swap: -1.1,
            category: 'forex',
            source: 'self',
          },
          {
            userId: demo.id,
            accountId: demoAccount.id,
            symbol: 'GBPUSD',
            side: 'sell',
            volume: 0.8,
            openPrice: 1.271,
            currentPrice: 1.2684,
            status: 'open',
            swap: 0.6,
            category: 'forex',
            source: 'self',
          },
          {
            userId: demo.id,
            accountId: demoAccount.id,
            symbol: 'TESLA',
            side: 'buy',
            volume: 1,
            openPrice: 255.2,
            currentPrice: 248.5,
            status: 'open',
            swap: -4.2,
            category: 'stock',
            source: 'self',
          },
        ],
      })
    }
  }

  await prisma.setting.upsert({
    where: { key: 'premium_threshold' },
    update: {},
    create: { key: 'premium_threshold', value: '5000' },
  })
  await prisma.setting.upsert({
    where: { key: 'platform_name' },
    update: { value: 'NitajFX' },
    create: { key: 'platform_name', value: 'NitajFX' },
  })
  await prisma.setting.upsert({
    where: { key: 'currency' },
    update: { value: 'USD' },
    create: { key: 'currency', value: 'USD' },
  })
  await prisma.account.updateMany({ data: { currency: 'USD' } })
  await prisma.setting.upsert({
    where: { key: 'trading_fee_per_lot' },
    update: {},
    create: { key: 'trading_fee_per_lot', value: '7' },
  })
  await prisma.setting.upsert({
    where: { key: 'deposit_fee_percent' },
    update: {},
    create: { key: 'deposit_fee_percent', value: '0' },
  })
  await prisma.setting.upsert({
    where: { key: 'withdraw_fee_percent' },
    update: {},
    create: { key: 'withdraw_fee_percent', value: '1.5' },
  })
  await prisma.setting.upsert({
    where: { key: 'referral_commission_percent' },
    update: {},
    create: { key: 'referral_commission_percent', value: '10' },
  })

  // sample platform earnings for admin demo
  const earningCount = await prisma.platformEarning.count()
  if (earningCount === 0) {
    await prisma.platformEarning.createMany({
      data: [
        { type: 'trading_fee', amount: 42.5, description: 'Seed trading fees' },
        { type: 'withdraw_fee', amount: 15, description: 'Seed withdraw fees' },
        { type: 'spread', amount: 28.75, description: 'Seed spread capture' },
      ],
    })
  }

  await seedStaff()

  console.log('Seed complete')
  console.log(`Admin:    ${admin.email} / admin123`)
  console.log(`Manager:  manager@seekapa.com / manager123`)
  console.log(`Employee: employee@seekapa.com / employee123`)
  console.log(`User:     ${demo.email} / demo123`)
}

async function seedStaff() {
  const manager = await prisma.user.upsert({
    where: { email: 'manager@seekapa.com' },
    update: { role: 'MANAGER' },
    create: {
      email: 'manager@seekapa.com',
      name: 'CRM Manager',
      initials: 'CM',
      passwordHash: await bcrypt.hash('manager123', 10),
      role: 'MANAGER',
      verified: true,
      funded: true,
      questionnaireDone: true,
      referralCode: 'NITAJFX-MGR',
      kycStatus: 'approved',
    },
  })

  await prisma.user.upsert({
    where: { email: 'employee@seekapa.com' },
    update: { role: 'EMPLOYEE' },
    create: {
      email: 'employee@seekapa.com',
      name: 'CRM Employee',
      initials: 'CE',
      passwordHash: await bcrypt.hash('employee123', 10),
      role: 'EMPLOYEE',
      verified: true,
      funded: true,
      questionnaireDone: true,
      referralCode: 'NITAJFX-EMP',
      kycStatus: 'approved',
    },
  })

  // Assign demo client to manager if unassigned
  const demoUser = await prisma.user.findUnique({ where: { email: 'mohammed.naser@example.com' } })
  if (demoUser && !demoUser.assignedToId) {
    await prisma.user.update({
      where: { id: demoUser.id },
      data: { assignedToId: manager.id, lastSeenAt: new Date() },
    })
  }

  // Seed country bank accounts (inline — Docker image has no /src)
  const bankCountries = [
    { countryCode: 'SA', label: 'Saudi Arabia', sortOrder: 1, contactOnly: false },
    { countryCode: 'AE', label: 'UAE', sortOrder: 2, contactOnly: false },
    { countryCode: 'QA', label: 'Qatar', sortOrder: 3, contactOnly: false },
    { countryCode: 'BH', label: 'Bahrain', sortOrder: 4, contactOnly: false },
    { countryCode: 'OM', label: 'Oman', sortOrder: 5, contactOnly: false },
    { countryCode: 'JO', label: 'Jordan', sortOrder: 6, contactOnly: false },
    { countryCode: 'KW', label: 'Kuwait', sortOrder: 7, contactOnly: false },
    { countryCode: 'INTL', label: 'International Transfer', sortOrder: 8, contactOnly: true },
  ] as const

  for (const def of bankCountries) {
    await prisma.bankAccount.upsert({
      where: { countryCode: def.countryCode },
      update: {},
      create: {
        countryCode: def.countryCode,
        label: def.label,
        sortOrder: def.sortOrder,
        contactOnly: def.contactOnly,
        bankName: def.contactOnly ? '' : 'NitajFX Partner Bank',
        accountName: def.contactOnly ? '' : 'NitajFX Trading Ltd',
        iban: def.contactOnly ? '' : 'AE070331234567890123456',
        swift: def.contactOnly ? '' : 'EBILAEAD',
        referenceHint: def.contactOnly
          ? 'Contact the Finance Department for international wire instructions.'
          : 'Use your registered email as payment reference',
      },
    })
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
