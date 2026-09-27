import {
  cell,
  CSV_SPECS,
  mapHeaders,
  normalizeName,
  parseAmount,
  parseCsv,
  parseFlag,
  parseFlexibleDate,
  parseRoles,
  requireColumns,
  stableId,
  type CsvKind,
  type HeaderMap,
} from "@/lib/csv"
import { db } from "@/lib/db"
import { nowIso } from "@/lib/dates"
import { createId } from "@/lib/ids"
import type {
  Bank,
  CatalogItem,
  Investment,
  Party,
  PartyRole,
  Payable,
  Receivable,
  Valuation,
} from "@/lib/schema"

export type CsvRowError = { line: number; message: string }

export type CsvImportResult = {
  created: number
  updated: number
  errors: CsvRowError[]
}

type Bucket<T extends { id: string }> = {
  byId: Map<string, T>
  known: Set<string>
  dirty: Map<string, T>
}

function bucket<T extends { id: string }>(items: T[]): Bucket<T> {
  return {
    byId: new Map(items.map((item) => [item.id, item])),
    known: new Set(items.map((item) => item.id)),
    dirty: new Map(),
  }
}

function save<T extends { id: string }>(
  store: Bucket<T>,
  item: T
): "created" | "updated" {
  const status = store.known.has(item.id) ? "updated" : "created"
  store.known.add(item.id)
  store.byId.set(item.id, item)
  store.dirty.set(item.id, item)
  return status
}

function nameIndex(items: { id: string; name: string }[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const item of items) {
    map.set(normalizeName(item.name), item.id)
  }
  return map
}

function catalogId(
  store: Bucket<CatalogItem>,
  byName: Map<string, string>,
  name: string
): string {
  const key = normalizeName(name)
  const existing = byName.get(key)
  if (existing) {
    return existing
  }
  const order =
    [...store.byId.values()].reduce(
      (max, item) => Math.max(max, item.order),
      -1
    ) + 1
  const item: CatalogItem = { id: createId(), name: name.trim(), order }
  save(store, item)
  byName.set(key, item.id)
  return item.id
}

function bankId(
  store: Bucket<Bank>,
  byName: Map<string, string>,
  name: string,
  now: string
): string | null {
  const trimmed = name.trim()
  if (!trimmed) {
    return null
  }
  const key = normalizeName(trimmed)
  const existingId = byName.get(key)
  if (existingId) {
    return existingId
  }
  const bank: Bank = {
    id: createId(),
    name: trimmed,
    notes: "",
    createdAt: now,
    updatedAt: now,
  }
  save(store, bank)
  byName.set(key, bank.id)
  return bank.id
}

function partyIdForRole(
  store: Bucket<Party>,
  byName: Map<string, string>,
  name: string,
  role: PartyRole,
  now: string
): string | null {
  const trimmed = name.trim()
  if (!trimmed) {
    return null
  }
  const key = normalizeName(trimmed)
  const existingId = byName.get(key)
  if (existingId) {
    const current = store.byId.get(existingId)
    if (current && !current.roles.includes(role)) {
      save(store, {
        ...current,
        roles: [...current.roles, role],
        updatedAt: now,
      })
    }
    return existingId
  }
  const party: Party = {
    id: createId(),
    name: trimmed,
    roles: [role],
    document: "",
    email: "",
    phone: "",
    notes: "",
    createdAt: now,
    updatedAt: now,
  }
  save(store, party)
  byName.set(key, party.id)
  return party.id
}

function readInstallment(
  row: string[],
  headers: HeaderMap
):
  | { ok: true; group: string | null; index: number; count: number }
  | { ok: false; message: string } {
  const group = cell(row, headers, "grupo")
  const parcela = cell(row, headers, "parcela")
  const parcelas = cell(row, headers, "parcelas")
  if (group === "" && parcela === "" && parcelas === "") {
    return { ok: true, group: null, index: 1, count: 1 }
  }
  if (group === "" || parcela === "" || parcelas === "") {
    return {
      ok: false,
      message:
        "Preencha grupo, parcela e parcelas juntos, ou deixe os três vazios.",
    }
  }
  const index = Number(parcela)
  const count = Number(parcelas)
  if (
    !Number.isInteger(index) ||
    !Number.isInteger(count) ||
    index < 1 ||
    count < 1 ||
    index > count ||
    count > 120
  ) {
    return {
      ok: false,
      message: "Parcela inválida. Use inteiros, parcela ≤ parcelas, até 120.",
    }
  }
  return { ok: true, group, index, count }
}

function tally(
  counts: { created: number; updated: number },
  status: "created" | "updated"
) {
  counts[status] += 1
}

export async function importCsvText(
  kind: CsvKind,
  text: string
): Promise<CsvImportResult> {
  const spec = CSV_SPECS[kind]
  const table = parseCsv(text)
  const header = table[0]
  if (!header) {
    throw new Error("Arquivo vazio.")
  }
  const headers = mapHeaders(header.cells, spec.columns)
  const data = table.slice(1)
  if (data.length === 0) {
    throw new Error("Nenhuma linha de dados além do cabeçalho.")
  }
  assertHeaders(kind, headers)

  const errors: CsvRowError[] = []
  const counts = { created: 0, updated: 0 }
  const now = nowIso()

  await db.transaction(
    "rw",
    [
      db.banks,
      db.parties,
      db.paymentMethods,
      db.incomeTypes,
      db.investmentTypes,
      db.payables,
      db.receivables,
      db.investments,
      db.valuations,
    ],
    async () => {
      const banks = bucket(await db.banks.toArray())
      const parties = bucket(await db.parties.toArray())
      const methods = bucket(await db.paymentMethods.toArray())
      const income = bucket(await db.incomeTypes.toArray())
      const investmentTypes = bucket(await db.investmentTypes.toArray())
      const payables = bucket(await db.payables.toArray())
      const receivables = bucket(await db.receivables.toArray())
      const investments = bucket(await db.investments.toArray())
      const valuations = bucket(await db.valuations.toArray())
      const bankNames = nameIndex([...banks.byId.values()])
      const partyNames = nameIndex([...parties.byId.values()])
      const methodNames = nameIndex([...methods.byId.values()])
      const incomeNames = nameIndex([...income.byId.values()])
      const investmentTypeNames = nameIndex([...investmentTypes.byId.values()])
      const investmentNames = nameIndex([...investments.byId.values()])

      const look = {
        banks,
        parties,
        methods,
        income,
        investmentTypes,
        payables,
        receivables,
        investments,
        valuations,
        bankNames,
        partyNames,
        methodNames,
        incomeNames,
        investmentTypeNames,
        investmentNames,
        now,
      }

      for (const record of data) {
        try {
          const status = applyRow(kind, record.cells, headers, look)
          if (status) {
            tally(counts, status)
          }
        } catch (error) {
          errors.push({
            line: record.line,
            message: error instanceof Error ? error.message : "Linha inválida.",
          })
        }
      }

      await Promise.all([
        banks.dirty.size ? db.banks.bulkPut([...banks.dirty.values()]) : null,
        parties.dirty.size
          ? db.parties.bulkPut([...parties.dirty.values()])
          : null,
        methods.dirty.size
          ? db.paymentMethods.bulkPut([...methods.dirty.values()])
          : null,
        income.dirty.size
          ? db.incomeTypes.bulkPut([...income.dirty.values()])
          : null,
        investmentTypes.dirty.size
          ? db.investmentTypes.bulkPut([...investmentTypes.dirty.values()])
          : null,
        payables.dirty.size
          ? db.payables.bulkPut([...payables.dirty.values()])
          : null,
        receivables.dirty.size
          ? db.receivables.bulkPut([...receivables.dirty.values()])
          : null,
        investments.dirty.size
          ? db.investments.bulkPut([...investments.dirty.values()])
          : null,
        valuations.dirty.size
          ? db.valuations.bulkPut([...valuations.dirty.values()])
          : null,
      ])
    }
  )

  return { created: counts.created, updated: counts.updated, errors }
}

type Lookups = {
  banks: Bucket<Bank>
  parties: Bucket<Party>
  methods: Bucket<CatalogItem>
  income: Bucket<CatalogItem>
  investmentTypes: Bucket<CatalogItem>
  payables: Bucket<Payable>
  receivables: Bucket<Receivable>
  investments: Bucket<Investment>
  valuations: Bucket<Valuation>
  bankNames: Map<string, string>
  partyNames: Map<string, string>
  methodNames: Map<string, string>
  incomeNames: Map<string, string>
  investmentTypeNames: Map<string, string>
  investmentNames: Map<string, string>
  now: string
}

function assertHeaders(kind: CsvKind, headers: HeaderMap) {
  if (kind === "suppliers" || kind === "clients" || kind === "parties") {
    requireColumns(headers, ["nome"])
    if (kind === "parties") {
      requireColumns(headers, ["papel"])
    }
    return
  }
  if (kind === "banks") {
    requireColumns(headers, ["nome"])
    return
  }
  if (kind === "payables") {
    requireColumns(headers, ["dia", "valor"])
    if (!headers.indexes.has("nome") && !headers.indexes.has("fornecedor")) {
      throw new Error("Falta a coluna nome ou fornecedor.")
    }
    return
  }
  if (kind === "receivables") {
    requireColumns(headers, ["dia", "valor"])
    if (!headers.indexes.has("nome") && !headers.indexes.has("cliente")) {
      throw new Error("Falta a coluna nome ou cliente.")
    }
    return
  }
  if (kind === "investments") {
    requireColumns(headers, ["nome", "aplicado", "desde"])
    return
  }
  requireColumns(headers, ["aplicacao", "dia", "valor"])
}

function applyRow(
  kind: CsvKind,
  row: string[],
  headers: HeaderMap,
  look: Lookups
): "created" | "updated" | null {
  if (kind === "suppliers" || kind === "clients" || kind === "parties") {
    const fallback: PartyRole | null =
      kind === "suppliers" ? "supplier" : kind === "clients" ? "client" : null
    return applyParty(row, headers, look, fallback)
  }
  if (kind === "banks") {
    return applyBank(row, headers, look)
  }
  if (kind === "payables") {
    return applyPayable(row, headers, look)
  }
  if (kind === "receivables") {
    return applyReceivable(row, headers, look)
  }
  if (kind === "investments") {
    return applyInvestment(row, headers, look)
  }
  return applyValuation(row, headers, look)
}

function applyParty(
  row: string[],
  headers: HeaderMap,
  look: Lookups,
  fallback: PartyRole | null
): "created" | "updated" {
  const name = cell(row, headers, "nome")
  if (!name) {
    throw new Error("Informe o nome.")
  }
  const roles = parseRoles(cell(row, headers, "papel"), fallback)
  if (!roles) {
    throw new Error("Papel inválido. Use fornecedor, cliente ou ambos.")
  }
  const explicitId = cell(row, headers, "id")
  const id =
    explicitId || look.partyNames.get(normalizeName(name)) || createId()
  const previous = look.parties.byId.get(id)
  const party: Party = {
    id,
    name,
    roles: previous ? unionRoles(previous.roles, roles) : roles,
    document: filled(cell(row, headers, "documento"), previous?.document),
    email: filled(cell(row, headers, "email"), previous?.email),
    phone: filled(cell(row, headers, "telefone"), previous?.phone),
    notes: filled(cell(row, headers, "observacoes"), previous?.notes),
    createdAt: previous?.createdAt ?? look.now,
    updatedAt: look.now,
  }
  const status = save(look.parties, party)
  look.partyNames.set(normalizeName(name), party.id)
  return status
}

function applyBank(
  row: string[],
  headers: HeaderMap,
  look: Lookups
): "created" | "updated" {
  const name = cell(row, headers, "nome")
  if (!name) {
    throw new Error("Informe o nome.")
  }
  const explicitId = cell(row, headers, "id")
  const id = explicitId || look.bankNames.get(normalizeName(name)) || createId()
  const previous = look.banks.byId.get(id)
  const bank: Bank = {
    id,
    name,
    notes: filled(cell(row, headers, "observacoes"), previous?.notes),
    createdAt: previous?.createdAt ?? look.now,
    updatedAt: look.now,
  }
  const status = save(look.banks, bank)
  look.bankNames.set(normalizeName(name), bank.id)
  return status
}

function applyPayable(
  row: string[],
  headers: HeaderMap,
  look: Lookups
): "created" | "updated" {
  const date = requireDate(cell(row, headers, "dia"), "Dia")
  const supplier = cell(row, headers, "fornecedor")
  const name = cell(row, headers, "nome") || supplier
  if (!name) {
    throw new Error("Informe o nome ou o fornecedor.")
  }
  const amount = requireAmount(cell(row, headers, "valor"))
  const installment = readInstallment(row, headers)
  if (!installment.ok) {
    throw new Error(installment.message)
  }
  const paid = readSettled(
    cell(row, headers, "pago"),
    cell(row, headers, "pago_em"),
    "Pago em"
  )
  const explicitId = cell(row, headers, "id")
  const id =
    explicitId ||
    stableId("csv-pagar", [
      date,
      normalizeName(name),
      normalizeName(supplier),
      String(Math.round(amount * 100)),
      cell(row, headers, "nf").toLowerCase(),
      installment.group ?? "",
      String(installment.index),
    ])
  const previous = look.payables.byId.get(id)
  const linked = partyIdForRole(
    look.parties,
    look.partyNames,
    supplier,
    "supplier",
    look.now
  )
  const payable: Payable = {
    id,
    date,
    name,
    partyId: linked,
    amount,
    invoiceNumber: cell(row, headers, "nf"),
    paymentMethodId: catalogId(
      look.methods,
      look.methodNames,
      cell(row, headers, "tipo") || "Outro"
    ),
    bankId: bankId(
      look.banks,
      look.bankNames,
      cell(row, headers, "banco"),
      look.now
    ),
    paid: paid.settled,
    paidDate: paid.date,
    notes: cell(row, headers, "observacoes"),
    installmentGroupId: installment.group,
    installmentIndex: installment.index,
    installmentCount: installment.count,
    createdAt: previous?.createdAt ?? look.now,
    updatedAt: look.now,
  }
  return save(look.payables, payable)
}

function applyReceivable(
  row: string[],
  headers: HeaderMap,
  look: Lookups
): "created" | "updated" {
  const date = requireDate(cell(row, headers, "dia"), "Dia")
  const client = cell(row, headers, "cliente")
  const name = cell(row, headers, "nome") || client
  if (!name) {
    throw new Error("Informe o nome ou o cliente.")
  }
  const amount = requireAmount(cell(row, headers, "valor"))
  const installment = readInstallment(row, headers)
  if (!installment.ok) {
    throw new Error(installment.message)
  }
  const received = readSettled(
    cell(row, headers, "recebido"),
    cell(row, headers, "recebido_em"),
    "Recebido em"
  )
  const explicitId = cell(row, headers, "id")
  const id =
    explicitId ||
    stableId("csv-receber", [
      date,
      normalizeName(name),
      normalizeName(client),
      String(Math.round(amount * 100)),
      installment.group ?? "",
      String(installment.index),
    ])
  const previous = look.receivables.byId.get(id)
  const receivable: Receivable = {
    id,
    date,
    name,
    partyId: partyIdForRole(
      look.parties,
      look.partyNames,
      client,
      "client",
      look.now
    ),
    amount,
    incomeTypeId: catalogId(
      look.income,
      look.incomeNames,
      cell(row, headers, "tipo") || "Outro"
    ),
    bankId: bankId(
      look.banks,
      look.bankNames,
      cell(row, headers, "banco"),
      look.now
    ),
    received: received.settled,
    receivedDate: received.date,
    notes: cell(row, headers, "observacoes"),
    installmentGroupId: installment.group,
    installmentIndex: installment.index,
    installmentCount: installment.count,
    createdAt: previous?.createdAt ?? look.now,
    updatedAt: look.now,
  }
  return save(look.receivables, receivable)
}

function applyInvestment(
  row: string[],
  headers: HeaderMap,
  look: Lookups
): "created" | "updated" {
  const name = cell(row, headers, "nome")
  if (!name) {
    throw new Error("Informe o nome.")
  }
  const contributed = requireAmount(cell(row, headers, "aplicado"))
  const openedOn = requireDate(cell(row, headers, "desde"), "Desde")
  const explicitId = cell(row, headers, "id")
  const id =
    explicitId || look.investmentNames.get(normalizeName(name)) || createId()
  const previous = look.investments.byId.get(id)
  const typeName = cell(row, headers, "tipo")
  const bankName = cell(row, headers, "banco")
  const currentRaw = cell(row, headers, "valor_atual")
  const currentAmount = currentRaw === "" ? null : requireAmount(currentRaw)
  const investment: Investment = {
    id,
    name,
    typeId: typeName
      ? catalogId(look.investmentTypes, look.investmentTypeNames, typeName)
      : (previous?.typeId ??
        catalogId(look.investmentTypes, look.investmentTypeNames, "Outro")),
    bankId: bankName
      ? bankId(look.banks, look.bankNames, bankName, look.now)
      : (previous?.bankId ?? null),
    contributed,
    openedOn,
    notes: filled(cell(row, headers, "observacoes"), previous?.notes),
    createdAt: previous?.createdAt ?? look.now,
    updatedAt: look.now,
  }
  const status = save(look.investments, investment)
  look.investmentNames.set(normalizeName(name), investment.id)
  if (currentAmount != null) {
    writeValuation(
      look,
      "",
      name,
      openedOn,
      currentAmount,
      cell(row, headers, "observacoes")
    )
  }
  return status
}

function applyValuation(
  row: string[],
  headers: HeaderMap,
  look: Lookups
): "created" | "updated" {
  const name = cell(row, headers, "aplicacao")
  if (!name) {
    throw new Error("Informe a aplicação.")
  }
  const date = requireDate(cell(row, headers, "dia"), "Dia")
  const amount = requireAmount(cell(row, headers, "valor"))
  ensureInvestment(row, headers, look, name, date)
  return writeValuation(
    look,
    cell(row, headers, "id"),
    name,
    date,
    amount,
    cell(row, headers, "observacoes")
  )
}

function ensureInvestment(
  row: string[],
  headers: HeaderMap,
  look: Lookups,
  name: string,
  date: string
) {
  if (look.investmentNames.has(normalizeName(name))) {
    return
  }
  const appliedRaw = cell(row, headers, "aplicado")
  const contributed =
    appliedRaw === ""
      ? requireAmount(cell(row, headers, "valor"))
      : requireAmount(appliedRaw)
  const typeName = cell(row, headers, "tipo") || "Outro"
  const investment: Investment = {
    id: createId(),
    name,
    typeId: catalogId(look.investmentTypes, look.investmentTypeNames, typeName),
    bankId: bankId(
      look.banks,
      look.bankNames,
      cell(row, headers, "banco"),
      look.now
    ),
    contributed,
    openedOn: date,
    notes: "",
    createdAt: look.now,
    updatedAt: look.now,
  }
  save(look.investments, investment)
  look.investmentNames.set(normalizeName(name), investment.id)
}

function writeValuation(
  look: Lookups,
  explicitId: string,
  name: string,
  date: string,
  amount: number,
  notes: string
): "created" | "updated" {
  const investmentId = look.investmentNames.get(normalizeName(name))
  if (!investmentId) {
    throw new Error("Aplicação não encontrada.")
  }
  const id = explicitId || stableId("csv-valor", [normalizeName(name), date])
  const previous = look.valuations.byId.get(id)
  const valuation: Valuation = {
    id,
    investmentId,
    date,
    amount,
    notes,
    createdAt: previous?.createdAt ?? look.now,
  }
  return save(look.valuations, valuation)
}

function requireDate(raw: string, label: string): string {
  const date = parseFlexibleDate(raw)
  if (!date) {
    throw new Error(`${label} inválido. Use AAAA-MM-DD ou DD/MM/AAAA.`)
  }
  return date
}

function requireAmount(raw: string): number {
  const amount = parseAmount(raw)
  if (amount == null || amount < 0) {
    throw new Error("Valor inválido.")
  }
  return amount
}

function readSettled(flagRaw: string, dateRaw: string, label: string) {
  const flag = flagRaw === "" ? null : parseFlag(flagRaw)
  if (flagRaw !== "" && flag == null) {
    throw new Error("Use sim ou não.")
  }
  const date = dateRaw === "" ? null : parseFlexibleDate(dateRaw)
  if (dateRaw !== "" && !date) {
    throw new Error(`${label} inválido.`)
  }
  const settled = flag ?? date != null
  return { settled, date: settled ? date : null }
}

function filled(next: string, previous: string | undefined): string {
  return next || previous || ""
}

function unionRoles(current: PartyRole[], next: PartyRole[]): PartyRole[] {
  return [...new Set([...current, ...next])]
}
