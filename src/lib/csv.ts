import { isCalendarDate } from "@/lib/dates"
import { parseMoneyInput } from "@/lib/money"
import type { PartyRole } from "@/lib/schema"

export const CSV_KINDS = [
  "suppliers",
  "clients",
  "parties",
  "banks",
  "payables",
  "receivables",
  "investments",
  "valuations",
] as const

export type CsvKind = (typeof CSV_KINDS)[number]

export type CsvColumn = {
  key: string
  header: string
  aliases: string[]
  hint: string
}

export type CsvSpec = {
  kind: CsvKind
  label: string
  filename: string
  summary: string
  columns: CsvColumn[]
  example: string[]
}

const partyColumns: CsvColumn[] = [
  {
    key: "id",
    header: "id",
    aliases: ["codigo", "chave"],
    hint: "Opcional. Se preencher, importar de novo atualiza essa pessoa.",
  },
  {
    key: "nome",
    header: "nome",
    aliases: ["name", "razao", "razao_social"],
    hint: "Obrigatório.",
  },
  {
    key: "papel",
    header: "papel",
    aliases: ["papeis", "tipo", "role"],
    hint: "fornecedor, cliente ou ambos. some no modelo de um papel só.",
  },
  {
    key: "documento",
    header: "documento",
    aliases: ["cpf", "cnpj", "doc"],
    hint: "Opcional.",
  },
  {
    key: "email",
    header: "email",
    aliases: ["e_mail"],
    hint: "Opcional.",
  },
  {
    key: "telefone",
    header: "telefone",
    aliases: ["fone", "celular", "phone"],
    hint: "Opcional.",
  },
  {
    key: "observacoes",
    header: "observacoes",
    aliases: ["obs", "notas", "notes"],
    hint: "Opcional. Vazio não apaga observação que já existe.",
  },
]

const bankColumns: CsvColumn[] = [
  {
    key: "id",
    header: "id",
    aliases: ["codigo", "chave"],
    hint: "Opcional. Sem id, o nome é a chave.",
  },
  {
    key: "nome",
    header: "nome",
    aliases: ["banco", "name"],
    hint: "Obrigatório. CEF e cef são o mesmo banco.",
  },
  {
    key: "observacoes",
    header: "observacoes",
    aliases: ["obs", "notas"],
    hint: "Opcional.",
  },
]

const payableColumns: CsvColumn[] = [
  {
    key: "id",
    header: "id",
    aliases: ["codigo", "chave"],
    hint: "Opcional. Use uma chave sua para reimportar sem duplicar.",
  },
  {
    key: "dia",
    header: "dia",
    aliases: ["data", "vencimento", "date"],
    hint: "Obrigatório. AAAA-MM-DD ou DD/MM/AAAA.",
  },
  {
    key: "nome",
    header: "nome",
    aliases: ["descricao", "historico"],
    hint: "Nome da conta. Se vazio, usa o fornecedor.",
  },
  {
    key: "fornecedor",
    header: "fornecedor",
    aliases: ["supplier"],
    hint: "Opcional. Cria o fornecedor se ainda não existir.",
  },
  {
    key: "valor",
    header: "valor",
    aliases: ["amount", "valor_total"],
    hint: "Obrigatório. 2800.00 ou 2.800,00.",
  },
  {
    key: "nf",
    header: "nf",
    aliases: ["nota", "nota_fiscal", "invoice"],
    hint: "Opcional.",
  },
  {
    key: "tipo",
    header: "tipo",
    aliases: ["forma", "meio", "payment_method"],
    hint: "Boleto, PIX CNPJ, PIX QR Code… Cria o tipo se não existir. Vazio vira Outro.",
  },
  {
    key: "banco",
    header: "banco",
    aliases: ["bank"],
    hint: "Opcional. Cria o banco se não existir.",
  },
  {
    key: "pago",
    header: "pago",
    aliases: ["quitado", "paid"],
    hint: "sim ou não. Vazio é não. Se pago_em vier preenchido e pago vazio, conta como pago.",
  },
  {
    key: "pago_em",
    header: "pago_em",
    aliases: ["data_pagamento", "pagamento"],
    hint: "Opcional. Mesmo formato do dia.",
  },
  {
    key: "observacoes",
    header: "observacoes",
    aliases: ["obs", "notas"],
    hint: "Opcional.",
  },
  {
    key: "grupo",
    header: "grupo",
    aliases: ["grupo_parcela", "serie"],
    hint: "Opcional. Mesma chave em cada parcela da compra.",
  },
  {
    key: "parcela",
    header: "parcela",
    aliases: ["n_parcela", "numero_parcela"],
    hint: "Número desta parcela, começando em 1.",
  },
  {
    key: "parcelas",
    header: "parcelas",
    aliases: ["qtd_parcelas", "total_parcelas"],
    hint: "Total da série. Cada linha do CSV é uma parcela, não o plano inteiro.",
  },
]

const receivableColumns: CsvColumn[] = [
  {
    key: "id",
    header: "id",
    aliases: ["codigo", "chave"],
    hint: "Opcional. Chave estável para reimportar.",
  },
  {
    key: "dia",
    header: "dia",
    aliases: ["data", "vencimento", "date"],
    hint: "Obrigatório. AAAA-MM-DD ou DD/MM/AAAA.",
  },
  {
    key: "nome",
    header: "nome",
    aliases: ["descricao", "historico"],
    hint: "Se vazio, usa o cliente.",
  },
  {
    key: "cliente",
    header: "cliente",
    aliases: ["remetente", "client"],
    hint: "Opcional. Cria o cliente se ainda não existir.",
  },
  {
    key: "valor",
    header: "valor",
    aliases: ["amount"],
    hint: "Obrigatório. 2800.00 ou 2.800,00.",
  },
  {
    key: "tipo",
    header: "tipo",
    aliases: ["categoria", "income_type"],
    hint: "Serviço, venda, salário… Cria o tipo se não existir. Vazio vira Outro.",
  },
  {
    key: "banco",
    header: "banco",
    aliases: ["bank"],
    hint: "Banco em que entrou. Opcional. Cria se não existir.",
  },
  {
    key: "recebido",
    header: "recebido",
    aliases: ["received"],
    hint: "sim ou não. Vazio é não.",
  },
  {
    key: "recebido_em",
    header: "recebido_em",
    aliases: ["data_recebimento", "recebimento"],
    hint: "Opcional.",
  },
  {
    key: "observacoes",
    header: "observacoes",
    aliases: ["obs", "notas"],
    hint: "Opcional.",
  },
  {
    key: "grupo",
    header: "grupo",
    aliases: ["grupo_parcela", "serie"],
    hint: "Opcional. Mesma chave em cada parcela da entrada.",
  },
  {
    key: "parcela",
    header: "parcela",
    aliases: ["n_parcela"],
    hint: "Número desta parcela, começando em 1.",
  },
  {
    key: "parcelas",
    header: "parcelas",
    aliases: ["qtd_parcelas", "total_parcelas"],
    hint: "Total da série.",
  },
]

const investmentColumns: CsvColumn[] = [
  {
    key: "id",
    header: "id",
    aliases: ["codigo", "chave"],
    hint: "Opcional. Sem id, o nome é a chave.",
  },
  {
    key: "nome",
    header: "nome",
    aliases: ["aplicacao", "name"],
    hint: "Obrigatório.",
  },
  {
    key: "tipo",
    header: "tipo",
    aliases: ["categoria"],
    hint: "Renda fixa, tesouro… Vazio vira Outro.",
  },
  {
    key: "banco",
    header: "banco",
    aliases: ["corretora", "bank"],
    hint: "Opcional.",
  },
  {
    key: "aplicado",
    header: "aplicado",
    aliases: ["valor_aplicado", "principal"],
    hint: "Obrigatório. Quanto foi aportado.",
  },
  {
    key: "desde",
    header: "desde",
    aliases: ["dia", "data", "abertura"],
    hint: "Obrigatório. Data de início.",
  },
  {
    key: "valor_atual",
    header: "valor_atual",
    aliases: ["atual", "mercado"],
    hint: "Opcional. Se vier, grava um ponto no histórico nessa data.",
  },
  {
    key: "observacoes",
    header: "observacoes",
    aliases: ["obs", "notas"],
    hint: "Opcional.",
  },
]

const valuationColumns: CsvColumn[] = [
  {
    key: "id",
    header: "id",
    aliases: ["codigo", "chave"],
    hint: "Opcional.",
  },
  {
    key: "aplicacao",
    header: "aplicacao",
    aliases: ["nome", "investimento"],
    hint: "Obrigatório. Cria a aplicação se ainda não existir.",
  },
  {
    key: "dia",
    header: "dia",
    aliases: ["data", "date"],
    hint: "Obrigatório.",
  },
  {
    key: "valor",
    header: "valor",
    aliases: ["amount", "valor_atual"],
    hint: "Obrigatório. Valor de mercado nesse dia.",
  },
  {
    key: "aplicado",
    header: "aplicado",
    aliases: ["valor_aplicado"],
    hint: "Opcional. Só usado se a aplicação for criada agora.",
  },
  {
    key: "tipo",
    header: "tipo",
    aliases: [],
    hint: "Opcional. Só usado se a aplicação for criada agora.",
  },
  {
    key: "banco",
    header: "banco",
    aliases: [],
    hint: "Opcional. Só usado se a aplicação for criada agora.",
  },
  {
    key: "observacoes",
    header: "observacoes",
    aliases: ["obs", "notas"],
    hint: "Opcional.",
  },
]

export const CSV_SPECS: Record<CsvKind, CsvSpec> = {
  suppliers: {
    kind: "suppliers",
    label: "Fornecedores",
    filename: "fornecedores.csv",
    summary:
      "Um fornecedor por linha. Sem a coluna papel, todo mundo entra como fornecedor.",
    columns: partyColumns.filter((column) => column.key !== "papel"),
    example: ["forn-cemig", "CEMIG", "", "", "", "Energia"],
  },
  clients: {
    kind: "clients",
    label: "Clientes",
    filename: "clientes.csv",
    summary:
      "Um cliente por linha. Sem a coluna papel, todo mundo entra como cliente.",
    columns: partyColumns.filter((column) => column.key !== "papel"),
    example: ["cli-ana", "Ana Lima", "", "ana@example.com", "", ""],
  },
  parties: {
    kind: "parties",
    label: "Pessoas (papel na planilha)",
    filename: "pessoas.csv",
    summary:
      "Fornecedores e clientes no mesmo arquivo. A coluna papel diz qual dos dois, ou ambos.",
    columns: partyColumns,
    example: ["", "Oficina Norte", "ambos", "", "", "", ""],
  },
  banks: {
    kind: "banks",
    label: "Bancos",
    filename: "bancos.csv",
    summary: "Um banco por linha.",
    columns: bankColumns,
    example: ["bank-cef", "CEF", ""],
  },
  payables: {
    kind: "payables",
    label: "Contas a pagar",
    filename: "contas-a-pagar.csv",
    summary:
      "Uma conta ou uma parcela por linha. Fornecedor, banco e tipo são criados se não existirem.",
    columns: payableColumns,
    example: [
      "pag-2024-001",
      "2024-03-10",
      "Aluguel",
      "Imobiliária Centro",
      "2800,00",
      "NF-12",
      "PIX CNPJ",
      "CEF",
      "sim",
      "2024-03-10",
      "",
      "aluguel-2024",
      "1",
      "12",
    ],
  },
  receivables: {
    kind: "receivables",
    label: "Contas a receber",
    filename: "contas-a-receber.csv",
    summary:
      "Uma entrada ou uma parcela por linha. Cliente, banco e tipo são criados se não existirem.",
    columns: receivableColumns,
    example: [
      "rec-2024-001",
      "2024-03-12",
      "Projeto site",
      "Ana Lima",
      "4500,00",
      "Serviço",
      "Nubank",
      "sim",
      "2024-03-12",
      "",
      "",
      "",
      "",
    ],
  },
  investments: {
    kind: "investments",
    label: "Investimentos",
    filename: "investimentos.csv",
    summary:
      "Uma aplicação por linha. valor_atual vira o primeiro ponto do histórico.",
    columns: investmentColumns,
    example: [
      "inv-cdb",
      "CDB liquidez diária",
      "Renda fixa",
      "CEF",
      "10000,00",
      "2024-01-02",
      "10440,00",
      "",
    ],
  },
  valuations: {
    kind: "valuations",
    label: "Valores das aplicações",
    filename: "valores-aplicacoes.csv",
    summary:
      "Um valor de mercado por linha. Sem id, a chave é aplicação + dia.",
    columns: valuationColumns,
    example: [
      "",
      "CDB liquidez diária",
      "2024-06-02",
      "10260,00",
      "",
      "",
      "",
      "",
    ],
  },
}

export function normalizeKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/[\s-]+/g, "_")
}

export function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
}

export type CsvRecord = { line: number; cells: string[] }

export function parseCsv(text: string): CsvRecord[] {
  const cleaned = text
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
  if (cleaned.trim() === "") {
    throw new Error("Arquivo vazio.")
  }
  const delimiter = detectDelimiter(cleaned)
  const rows: CsvRecord[] = []
  let row: string[] = []
  let cell = ""
  let quoted = false
  let line = 1
  let rowLine = 1
  const pushRow = () => {
    row.push(cell)
    if (row.some((value) => value.trim() !== "")) {
      rows.push({ line: rowLine, cells: row })
    }
    row = []
    cell = ""
    line += 1
    rowLine = line
  }
  for (let index = 0; index < cleaned.length; index += 1) {
    const char = cleaned[index] ?? ""
    if (quoted) {
      if (char === '"') {
        if (cleaned[index + 1] === '"') {
          cell += '"'
          index += 1
        } else {
          quoted = false
        }
      } else {
        if (char === "\n") {
          line += 1
        }
        cell += char
      }
      continue
    }
    if (char === '"') {
      quoted = true
      continue
    }
    if (char === delimiter) {
      row.push(cell)
      cell = ""
      continue
    }
    if (char === "\n") {
      pushRow()
      continue
    }
    cell += char
  }
  if (cell.length > 0 || row.length > 0) {
    pushRow()
  }
  return rows
}

function detectDelimiter(text: string): string {
  const first = text.split("\n")[0] ?? ""
  const counts = [
    { delimiter: ";", count: countDelimiter(first, ";") },
    { delimiter: ",", count: countDelimiter(first, ",") },
    { delimiter: "\t", count: countDelimiter(first, "\t") },
  ].sort((a, b) => b.count - a.count)
  if ((counts[0]?.count ?? 0) === 0) {
    return ","
  }
  return counts[0]?.delimiter ?? ","
}

function countDelimiter(line: string, delimiter: string): number {
  let count = 0
  let quoted = false
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        index += 1
      } else {
        quoted = !quoted
      }
      continue
    }
    if (!quoted && char === delimiter) {
      count += 1
    }
  }
  return count
}

export type HeaderMap = {
  indexes: Map<string, number>
  headers: string[]
}

export function mapHeaders(headers: string[], columns: CsvColumn[]): HeaderMap {
  const aliasToKey = new Map<string, string>()
  for (const column of columns) {
    aliasToKey.set(normalizeKey(column.header), column.key)
    for (const alias of column.aliases) {
      aliasToKey.set(normalizeKey(alias), column.key)
    }
  }
  const indexes = new Map<string, number>()
  headers.forEach((header, index) => {
    const key = aliasToKey.get(normalizeKey(header))
    if (!key) {
      return
    }
    if (indexes.has(key)) {
      throw new Error(`Coluna repetida: ${header}.`)
    }
    indexes.set(key, index)
  })
  if (indexes.size === 0) {
    throw new Error(
      `Cabeçalho não reconhecido. A primeira linha precisa ter: ${columns
        .map((column) => column.header)
        .join(", ")}.`
    )
  }
  return { indexes, headers }
}

export function cell(row: string[], headers: HeaderMap, key: string): string {
  const index = headers.indexes.get(key)
  if (index == null) {
    return ""
  }
  return (row[index] ?? "").trim()
}

export function requireColumns(headers: HeaderMap, keys: string[]): void {
  const missing = keys.filter((key) => !headers.indexes.has(key))
  if (missing.length > 0) {
    throw new Error(`Faltam colunas: ${missing.join(", ")}.`)
  }
}

export function parseFlexibleDate(raw: string): string | null {
  const value = raw.trim()
  if (value === "") {
    return null
  }
  if (isCalendarDate(value)) {
    return value
  }
  const match = /^(\d{1,2})[/.|-](\d{1,2})[/.|-](\d{2}|\d{4})$/.exec(value)
  if (!match) {
    return null
  }
  const day = match[1]?.padStart(2, "0") ?? ""
  const month = match[2]?.padStart(2, "0") ?? ""
  let year = match[3] ?? ""
  if (year.length === 2) {
    const short = Number(year)
    year = String(short >= 70 ? 1900 + short : 2000 + short)
  }
  const iso = `${year}-${month}-${day}`
  return isCalendarDate(iso) ? iso : null
}

export function parseFlag(raw: string): boolean | null {
  const value = normalizeKey(raw).replace(/_/g, "")
  if (value === "") {
    return null
  }
  if (
    [
      "sim",
      "s",
      "yes",
      "y",
      "true",
      "1",
      "pago",
      "paga",
      "recebido",
      "recebida",
      "x",
      "ok",
    ].includes(value)
  ) {
    return true
  }
  if (
    [
      "nao",
      "n",
      "no",
      "false",
      "0",
      "aberto",
      "aberta",
      "emaberto",
      "pendente",
    ].includes(value)
  ) {
    return false
  }
  return null
}

export function parseRoles(
  raw: string,
  fallback: PartyRole | null
): PartyRole[] | null {
  const text = raw.trim()
  if (text === "") {
    return fallback ? [fallback] : null
  }
  const tokens = text
    .split(/[/+,]| e /i)
    .map((token) => normalizeKey(token))
    .filter(Boolean)
  const roles = new Set<PartyRole>()
  for (const token of tokens) {
    if (
      ["ambos", "both", "fornecedor_cliente", "cliente_fornecedor"].includes(
        token
      )
    ) {
      roles.add("supplier")
      roles.add("client")
      continue
    }
    if (["fornecedor", "supplier", "pagar"].includes(token)) {
      roles.add("supplier")
      continue
    }
    if (["cliente", "client", "receber"].includes(token)) {
      roles.add("client")
      continue
    }
    return null
  }
  if (roles.size === 0) {
    return fallback ? [fallback] : null
  }
  return [...roles]
}

export function parseAmount(raw: string): number | null {
  return parseMoneyInput(raw)
}

export function templateCsv(kind: CsvKind): string {
  const spec = CSV_SPECS[kind]
  if (spec.example.length !== spec.columns.length) {
    throw new Error(`Modelo de ${spec.filename} desalinhado.`)
  }
  const lines = [
    spec.columns.map((column) => escapeCell(column.header)).join(";"),
    spec.example.map((value) => escapeCell(value)).join(";"),
  ]
  return `\uFEFF${lines.join("\n")}\n`
}

function escapeCell(value: string): string {
  if (/[;"\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`
  }
  return value
}

export function downloadText(filename: string, contents: string) {
  const blob = new Blob([contents], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

export function stableId(prefix: string, parts: string[]): string {
  const text = parts.join("\u001f")
  let h1 = 0x811c9dc5
  let h2 = 0x811c9dc5 ^ 0x01000193
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index)
    h1 = Math.imul(h1 ^ code, 0x01000193)
    h2 = Math.imul(h2 ^ code, 0x01000193)
  }
  const hex =
    (h1 >>> 0).toString(16).padStart(8, "0") +
    (h2 >>> 0).toString(16).padStart(8, "0")
  return `${prefix}-${hex}`
}
