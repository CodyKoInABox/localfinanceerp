import {
  normalizeKey,
  normalizeName,
  parseCsv,
  parseFlag,
  parseFlexibleDate,
} from "@/lib/csv"
import { isCalendarDate, todayIso } from "@/lib/dates"
import { createId } from "@/lib/ids"
import { moneyToInput, parseMoneyInput } from "@/lib/money"

export type QuickKind = "payable" | "receivable"

export const QUICK_FIELDS = {
  payable: [
    "name",
    "amount",
    "invoice",
    "notes",
    "date",
    "party",
    "type",
    "bank",
    "settled",
  ],
  receivable: [
    "name",
    "amount",
    "notes",
    "date",
    "party",
    "type",
    "bank",
    "settled",
  ],
} as const

export type QuickField = (typeof QUICK_FIELDS)["payable"][number]

export type QuickDefaults = {
  date: string
  typeId: string
  bankId: string | null
  settled: boolean
}

export type QuickRow = {
  key: string
  name: string
  amount: string
  invoice: string
  notes: string
  date: string
  partyId: string | null
  typeId: string
  bankId: string | null
  settled: boolean
}

export type QuickPasteCell = { field: QuickField; raw: string }

const HEADER_FIELDS: Record<string, QuickField> = {
  nome: "name",
  name: "name",
  descricao: "name",
  valor: "amount",
  amount: "amount",
  nf: "invoice",
  nota_fiscal: "invoice",
  notafiscal: "invoice",
  invoice: "invoice",
  observacoes: "notes",
  obs: "notes",
  notes: "notes",
  dia: "date",
  data: "date",
  vencimento: "date",
  date: "date",
  fornecedor: "party",
  cliente: "party",
  remetente: "party",
  tipo: "type",
  banco: "bank",
  pago: "settled",
  recebido: "settled",
}

const START_ROWS = 12

export function isGridPaste(text: string): boolean {
  return /[\n\t]/.test(text)
}

export function parseQuickPaste(
  kind: QuickKind,
  text: string,
  startField: QuickField
): QuickPasteCell[][] {
  const records = parseCsv(text)
  if (records.length === 0) {
    return []
  }
  const header = headerMap(records[0]?.cells ?? [])
  const data = header ? records.slice(1) : records
  const fields: readonly QuickField[] = QUICK_FIELDS[kind]
  const start = Math.max(0, fields.indexOf(startField))
  return data.map((record) => {
    const cells: QuickPasteCell[] = []
    record.cells.forEach((raw, index) => {
      const field = header ? header[index] : fields[start + index]
      if (!field) {
        return
      }
      if (kind === "receivable" && field === "invoice") {
        return
      }
      cells.push({ field, raw })
    })
    return cells
  })
}

function headerMap(cells: string[]): (QuickField | null)[] | null {
  const mapped = cells.map((cell) => HEADER_FIELDS[normalizeKey(cell)] ?? null)
  if (mapped.filter((field) => field != null).length < 2) {
    return null
  }
  return mapped
}

export function formatQuickAmount(raw: string): string {
  const trimmed = raw.trim()
  if (trimmed === "") {
    return ""
  }
  const parsed = parseMoneyInput(trimmed)
  if (parsed == null) {
    return trimmed
  }
  return moneyToInput(parsed)
}

export function matchByName<T extends { id: string; name: string }>(
  items: T[],
  raw: string
): T | null {
  const key = normalizeName(raw)
  if (!key) {
    return null
  }
  return items.find((item) => normalizeName(item.name) === key) ?? null
}

export function blankRow(defaults: QuickDefaults): QuickRow {
  return {
    key: createId(),
    name: "",
    amount: "",
    invoice: "",
    notes: "",
    date: defaults.date,
    partyId: null,
    typeId: defaults.typeId,
    bankId: defaults.bankId,
    settled: defaults.settled,
  }
}

export function isRowBlank(row: QuickRow): boolean {
  return (
    row.name.trim() === "" &&
    row.amount.trim() === "" &&
    row.invoice.trim() === "" &&
    row.notes.trim() === "" &&
    row.partyId == null
  )
}

export function isPristine(row: QuickRow, defaults: QuickDefaults): boolean {
  return (
    isRowBlank(row) &&
    row.date === defaults.date &&
    row.typeId === defaults.typeId &&
    row.bankId === defaults.bankId &&
    row.settled === defaults.settled
  )
}

export function withTrailingBlank(
  rows: QuickRow[],
  defaults: QuickDefaults
): QuickRow[] {
  const last = rows[rows.length - 1]
  if (!last || !isRowBlank(last)) {
    return [...rows, blankRow(defaults)]
  }
  return rows
}

export function initialRows(
  defaults: QuickDefaults,
  count = START_ROWS
): QuickRow[] {
  return Array.from({ length: count }, () => blankRow(defaults))
}

export function renameRow(
  row: QuickRow,
  name: string,
  parties: { id: string; name: string }[]
): QuickRow {
  const current = parties.find((party) => party.id === row.partyId)
  const typedOver =
    current != null && normalizeName(row.name) === normalizeName(current.name)
  const match = matchByName(parties, name)
  let partyId = row.partyId
  if (match && (partyId == null || typedOver)) {
    partyId = match.id
  } else if (!match && typedOver) {
    partyId = null
  }
  return { ...row, name, partyId }
}

export function assignParty(
  row: QuickRow,
  partyId: string | null,
  parties: { id: string; name: string }[]
): QuickRow {
  const previous = parties.find((party) => party.id === row.partyId)?.name
  const nextName = parties.find((party) => party.id === partyId)?.name
  const replace = row.name.trim() === "" || row.name === previous
  return {
    ...row,
    partyId,
    name: replace && nextName ? nextName : row.name,
  }
}

export function applyPasteCells(
  row: QuickRow,
  cells: QuickPasteCell[],
  catalogs: {
    parties: { id: string; name: string }[]
    types: { id: string; name: string }[]
    banks: { id: string; name: string }[]
  }
): QuickRow {
  let next = { ...row }
  for (const cell of cells) {
    const raw = cell.raw.trim()
    if (cell.field === "name") {
      next = renameRow(next, cell.raw, catalogs.parties)
      continue
    }
    if (cell.field === "amount") {
      next.amount = formatQuickAmount(cell.raw)
      continue
    }
    if (cell.field === "invoice") {
      next.invoice = raw
      continue
    }
    if (cell.field === "notes") {
      next.notes = raw
      continue
    }
    if (cell.field === "date") {
      const parsed = raw === "" ? null : parseFlexibleDate(raw)
      if (parsed) {
        next.date = parsed
      }
      continue
    }
    if (cell.field === "party") {
      if (raw === "") {
        next.partyId = null
        continue
      }
      const match = matchByName(catalogs.parties, raw)
      if (!match) {
        if (next.name.trim() === "") {
          next.name = raw
        }
        continue
      }
      const currentName = catalogs.parties.find(
        (party) => party.id === next.partyId
      )?.name
      const follows =
        next.name.trim() === "" ||
        (currentName != null && next.name === currentName)
      next.partyId = match.id
      if (follows) {
        next.name = match.name
      }
      continue
    }
    if (cell.field === "type") {
      const match = matchByName(catalogs.types, raw)
      if (match) {
        next.typeId = match.id
      }
      continue
    }
    if (cell.field === "bank") {
      if (raw === "") {
        next.bankId = null
        continue
      }
      const match = matchByName(catalogs.banks, raw)
      if (match) {
        next.bankId = match.id
      }
      continue
    }
    next.settled = parseFlag(raw) ?? false
  }
  return next
}

export function quickEntryKey(kind: QuickKind): string {
  return `quick-entry-${kind}`
}

export function emptyDefaults(): QuickDefaults {
  return {
    date: todayIso(),
    typeId: "",
    bankId: null,
    settled: false,
  }
}

export function readQuickDraft(
  kind: QuickKind
): { defaults: QuickDefaults; rows: QuickRow[] } | null {
  try {
    const raw = sessionStorage.getItem(quickEntryKey(kind))
    if (!raw) {
      return null
    }
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object") {
      return null
    }
    const record = parsed as { defaults?: unknown; rows?: unknown }
    const defaults = readDefaults(record.defaults)
    const rows = Array.isArray(record.rows)
      ? record.rows.flatMap((row) => {
          const next = readRow(row)
          return next ? [next] : []
        })
      : []
    if (!defaults || rows.length === 0) {
      return null
    }
    return { defaults, rows }
  } catch {
    return null
  }
}

export function writeQuickDraft(
  kind: QuickKind,
  defaults: QuickDefaults,
  rows: QuickRow[]
): void {
  sessionStorage.setItem(
    quickEntryKey(kind),
    JSON.stringify({ defaults, rows })
  )
}

export function clearQuickDraft(kind: QuickKind): void {
  sessionStorage.removeItem(quickEntryKey(kind))
}

function readDefaults(value: unknown): QuickDefaults | null {
  if (!value || typeof value !== "object") {
    return null
  }
  const row = value as QuickDefaults
  if (!isCalendarDate(row.date) || typeof row.settled !== "boolean") {
    return null
  }
  return {
    date: row.date,
    typeId: typeof row.typeId === "string" ? row.typeId : "",
    bankId: typeof row.bankId === "string" ? row.bankId : null,
    settled: row.settled,
  }
}

function readRow(value: unknown): QuickRow | null {
  if (!value || typeof value !== "object") {
    return null
  }
  const row = value as QuickRow
  if (typeof row.key !== "string" || typeof row.name !== "string") {
    return null
  }
  if (!isCalendarDate(row.date)) {
    return null
  }
  return {
    key: row.key,
    name: row.name,
    amount: typeof row.amount === "string" ? row.amount : "",
    invoice: typeof row.invoice === "string" ? row.invoice : "",
    notes: typeof row.notes === "string" ? row.notes : "",
    date: row.date,
    partyId: typeof row.partyId === "string" ? row.partyId : null,
    typeId: typeof row.typeId === "string" ? row.typeId : "",
    bankId: typeof row.bankId === "string" ? row.bankId : null,
    settled: row.settled === true,
  }
}
