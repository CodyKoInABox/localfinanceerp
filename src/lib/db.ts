import Dexie, { type Table } from "dexie"

import {
  DEFAULT_INCOME_TYPES,
  DEFAULT_INVESTMENT_TYPES,
  DEFAULT_PAYMENT_METHODS,
  DEFAULT_SETTINGS,
  SETTINGS_ID,
} from "@/lib/constants"
import type {
  Bank,
  CatalogItem,
  Investment,
  Party,
  Payable,
  Receivable,
  Settings,
  Valuation,
} from "@/lib/schema"

export class FinanceDatabase extends Dexie {
  banks!: Table<Bank, string>
  parties!: Table<Party, string>
  paymentMethods!: Table<CatalogItem, string>
  incomeTypes!: Table<CatalogItem, string>
  investmentTypes!: Table<CatalogItem, string>
  payables!: Table<Payable, string>
  receivables!: Table<Receivable, string>
  investments!: Table<Investment, string>
  valuations!: Table<Valuation, string>
  settings!: Table<Settings, string>

  constructor() {
    super("localfinanceerp")
    this.version(1).stores({
      banks: "id, name, updatedAt",
      parties: "id, name, updatedAt",
      paymentMethods: "id, order",
      incomeTypes: "id, order",
      investmentTypes: "id, order",
      payables:
        "id, date, partyId, bankId, paid, paidDate, installmentGroupId, updatedAt",
      receivables:
        "id, date, partyId, bankId, received, receivedDate, installmentGroupId, updatedAt",
      investments: "id, name, typeId, updatedAt",
      valuations: "id, investmentId, date",
      settings: "id",
    })
    this.on("populate", (trans) => {
      trans.table("paymentMethods").bulkAdd(DEFAULT_PAYMENT_METHODS)
      trans.table("incomeTypes").bulkAdd(DEFAULT_INCOME_TYPES)
      trans.table("investmentTypes").bulkAdd(DEFAULT_INVESTMENT_TYPES)
      trans.table("settings").add(DEFAULT_SETTINGS)
    })
  }
}

export const db = new FinanceDatabase()

export const DATA_TABLES = [
  db.banks,
  db.parties,
  db.paymentMethods,
  db.incomeTypes,
  db.investmentTypes,
  db.payables,
  db.receivables,
  db.investments,
  db.valuations,
  db.settings,
] as const

async function seedCatalogs(): Promise<void> {
  if ((await db.paymentMethods.count()) === 0) {
    await db.paymentMethods.bulkAdd(DEFAULT_PAYMENT_METHODS)
  }
  if ((await db.incomeTypes.count()) === 0) {
    await db.incomeTypes.bulkAdd(DEFAULT_INCOME_TYPES)
  }
  if ((await db.investmentTypes.count()) === 0) {
    await db.investmentTypes.bulkAdd(DEFAULT_INVESTMENT_TYPES)
  }
  const settings = await db.settings.get(SETTINGS_ID)
  if (!settings) {
    await db.settings.put(DEFAULT_SETTINGS)
  }
}

export async function ensureSeeded(): Promise<void> {
  await db.open()
  await seedCatalogs()
}

export async function wipeAllData(): Promise<void> {
  await db.transaction("rw", DATA_TABLES, async () => {
    await Promise.all(DATA_TABLES.map((table) => table.clear()))
    await db.paymentMethods.bulkAdd(DEFAULT_PAYMENT_METHODS)
    await db.incomeTypes.bulkAdd(DEFAULT_INCOME_TYPES)
    await db.investmentTypes.bulkAdd(DEFAULT_INVESTMENT_TYPES)
    await db.settings.put(DEFAULT_SETTINGS)
  })
}
