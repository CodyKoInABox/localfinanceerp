import {
  DEFAULT_INCOME_TYPES,
  DEFAULT_INVESTMENT_TYPES,
  DEFAULT_PAYMENT_METHODS,
  DEFAULT_SETTINGS,
  SCHEMA_VERSION,
  SETTINGS_ID,
} from "@/lib/constants"
import { DATA_TABLES, db } from "@/lib/db"
import { nowIso } from "@/lib/dates"
import { exportPayloadSchema, type ExportPayload } from "@/lib/schema"

export async function buildExportPayload(): Promise<ExportPayload> {
  const [
    banks,
    parties,
    paymentMethods,
    incomeTypes,
    investmentTypes,
    payables,
    receivables,
    investments,
    valuations,
    settings,
  ] = await Promise.all([
    db.banks.toArray(),
    db.parties.toArray(),
    db.paymentMethods.toArray(),
    db.incomeTypes.toArray(),
    db.investmentTypes.toArray(),
    db.payables.toArray(),
    db.receivables.toArray(),
    db.investments.toArray(),
    db.valuations.toArray(),
    db.settings.get(SETTINGS_ID),
  ])

  return {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: nowIso(),
    settings: settings ?? DEFAULT_SETTINGS,
    banks,
    parties,
    paymentMethods:
      paymentMethods.length > 0 ? paymentMethods : DEFAULT_PAYMENT_METHODS,
    incomeTypes: incomeTypes.length > 0 ? incomeTypes : DEFAULT_INCOME_TYPES,
    investmentTypes:
      investmentTypes.length > 0 ? investmentTypes : DEFAULT_INVESTMENT_TYPES,
    payables,
    receivables,
    investments,
    valuations,
  }
}

export function parseExportPayload(raw: unknown): ExportPayload {
  const parsed = exportPayloadSchema.safeParse(raw)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    const path = first?.path.join(".") || "arquivo"
    throw new Error(
      `${path}: ${first?.message ?? "Arquivo de exportação inválido."}`
    )
  }
  return parsed.data
}

export async function importReplace(payload: ExportPayload): Promise<void> {
  await db.transaction("rw", DATA_TABLES, async () => {
    await Promise.all(DATA_TABLES.map((table) => table.clear()))
    await writeCollections(payload)
  })
}

export async function importMerge(payload: ExportPayload): Promise<void> {
  await db.transaction("rw", DATA_TABLES, async () => {
    await writeCollections(payload, { merge: true })
  })
}

async function writeCollections(
  payload: ExportPayload,
  options?: { merge?: boolean }
) {
  const paymentMethods =
    payload.paymentMethods.length > 0
      ? payload.paymentMethods
      : DEFAULT_PAYMENT_METHODS
  const incomeTypes =
    payload.incomeTypes.length > 0 ? payload.incomeTypes : DEFAULT_INCOME_TYPES
  const investmentTypes =
    payload.investmentTypes.length > 0
      ? payload.investmentTypes
      : DEFAULT_INVESTMENT_TYPES

  if (options?.merge) {
    await Promise.all([
      payload.banks.length
        ? db.banks.bulkPut(payload.banks)
        : Promise.resolve(),
      payload.parties.length
        ? db.parties.bulkPut(payload.parties)
        : Promise.resolve(),
      db.paymentMethods.bulkPut(paymentMethods),
      db.incomeTypes.bulkPut(incomeTypes),
      db.investmentTypes.bulkPut(investmentTypes),
      payload.payables.length
        ? db.payables.bulkPut(payload.payables)
        : Promise.resolve(),
      payload.receivables.length
        ? db.receivables.bulkPut(payload.receivables)
        : Promise.resolve(),
      payload.investments.length
        ? db.investments.bulkPut(payload.investments)
        : Promise.resolve(),
      payload.valuations.length
        ? db.valuations.bulkPut(payload.valuations)
        : Promise.resolve(),
      db.settings.put(payload.settings),
    ])
    return
  }

  await db.banks.bulkAdd(payload.banks)
  await db.parties.bulkAdd(payload.parties)
  await db.paymentMethods.bulkAdd(paymentMethods)
  await db.incomeTypes.bulkAdd(incomeTypes)
  await db.investmentTypes.bulkAdd(investmentTypes)
  await db.payables.bulkAdd(payload.payables)
  await db.receivables.bulkAdd(payload.receivables)
  await db.investments.bulkAdd(payload.investments)
  await db.valuations.bulkAdd(payload.valuations)
  await db.settings.put(payload.settings)
}

export function downloadJson(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

export async function readJsonFile(file: File): Promise<unknown> {
  const text = await file.text()
  return JSON.parse(text) as unknown
}
