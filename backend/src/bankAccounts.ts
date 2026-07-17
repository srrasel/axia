import { prisma } from './prisma.js'
import { loadSettings } from './settings.js'

export const BANK_COUNTRY_DEFS = [
  { countryCode: 'SA', label: 'Saudi Arabia', sortOrder: 1 },
  { countryCode: 'AE', label: 'UAE', sortOrder: 2 },
  { countryCode: 'QA', label: 'Qatar', sortOrder: 3 },
  { countryCode: 'BH', label: 'Bahrain', sortOrder: 4 },
  { countryCode: 'OM', label: 'Oman', sortOrder: 5 },
  { countryCode: 'JO', label: 'Jordan', sortOrder: 6 },
  { countryCode: 'KW', label: 'Kuwait', sortOrder: 7 },
  { countryCode: 'INTL', label: 'International Transfer', sortOrder: 8, contactOnly: true },
] as const

export type BankCountryCode = (typeof BANK_COUNTRY_DEFS)[number]['countryCode']

export const BANK_COUNTRY_CODES = BANK_COUNTRY_DEFS.map((d) => d.countryCode) as BankCountryCode[]

export type BankAccountDetails = {
  countryCode: string
  label: string
  bankName: string
  accountName: string
  iban: string
  swift: string
  referenceHint: string
  contactOnly: boolean
}

async function legacyBankDefaults() {
  const s = await loadSettings()
  return {
    bankName: s.bank_name || 'NitajFX Partner Bank',
    accountName: s.bank_account_name || 'NitajFX Trading Ltd',
    iban: s.bank_iban || '',
    swift: s.bank_swift || '',
    referenceHint: s.bank_reference_hint || 'Use your registered email as payment reference',
  }
}

export async function ensureBankAccounts() {
  const legacy = await legacyBankDefaults()
  for (const def of BANK_COUNTRY_DEFS) {
    const contactOnly = 'contactOnly' in def && def.contactOnly === true
    await prisma.bankAccount.upsert({
      where: { countryCode: def.countryCode },
      update: {},
      create: {
        countryCode: def.countryCode,
        label: def.label,
        sortOrder: def.sortOrder,
        contactOnly,
        bankName: contactOnly ? '' : legacy.bankName,
        accountName: contactOnly ? '' : legacy.accountName,
        iban: contactOnly ? '' : legacy.iban,
        swift: contactOnly ? '' : legacy.swift,
        referenceHint: contactOnly
          ? 'Contact the Finance Department for international wire instructions.'
          : legacy.referenceHint,
      },
    })
  }
}

export async function listActiveBankAccounts() {
  const rows = await prisma.bankAccount.findMany({
    where: { active: true },
    orderBy: { sortOrder: 'asc' },
  })
  return rows.map(toBankDetails)
}

export async function listAllBankAccounts() {
  const rows = await prisma.bankAccount.findMany({ orderBy: { sortOrder: 'asc' } })
  return rows
}

export async function getBankAccountByCode(countryCode: string) {
  const row = await prisma.bankAccount.findUnique({ where: { countryCode } })
  if (!row || !row.active) return null
  return toBankDetails(row)
}

function toBankDetails(row: {
  countryCode: string
  label: string
  bankName: string
  accountName: string
  iban: string
  swift: string
  referenceHint: string | null
  contactOnly: boolean
}): BankAccountDetails {
  return {
    countryCode: row.countryCode,
    label: row.label,
    bankName: row.bankName,
    accountName: row.accountName,
    iban: row.iban,
    swift: row.swift,
    referenceHint: row.referenceHint || 'Use your registered email as payment reference',
    contactOnly: row.contactOnly,
  }
}

export async function updateBankAccount(
  countryCode: string,
  data: {
    bankName?: string
    accountName?: string
    iban?: string
    swift?: string
    referenceHint?: string
    active?: boolean
  },
) {
  const existing = await prisma.bankAccount.findUnique({ where: { countryCode } })
  if (!existing) throw new Error('Country not found')
  return prisma.bankAccount.update({
    where: { countryCode },
    data: {
      bankName: data.bankName ?? existing.bankName,
      accountName: data.accountName ?? existing.accountName,
      iban: data.iban ?? existing.iban,
      swift: data.swift ?? existing.swift,
      referenceHint: data.referenceHint ?? existing.referenceHint,
      active: data.active ?? existing.active,
    },
  })
}

export async function getFinanceContact() {
  const s = await loadSettings()
  return {
    financeEmail: (s.finance_email || s.support_email || 'finance@nitajfx.online').trim(),
    supportEmail: (s.support_email || 'support@nitajfx.online').trim(),
  }
}
