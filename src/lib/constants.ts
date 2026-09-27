import type { CatalogItem, Settings } from "@/lib/schema"

export const SCHEMA_VERSION = 1 as const

export const SETTINGS_ID = "app" as const

export const NONE = "none" as const

export const CURRENCY_OPTIONS = [
  "BRL",
  "USD",
  "EUR",
  "GBP",
  "CAD",
  "AUD",
  "JPY",
  "MXN",
  "CHF",
] as const

export const DEFAULT_SETTINGS: Settings = {
  id: SETTINGS_ID,
  currency: "BRL",
}

export const DEFAULT_PAYMENT_METHODS: CatalogItem[] = [
  { id: "pm-boleto", name: "Boleto", order: 0 },
  { id: "pm-pix-cnpj", name: "PIX CNPJ", order: 1 },
  { id: "pm-pix-qr", name: "PIX QR Code", order: 2 },
  { id: "pm-pix-chave", name: "PIX chave", order: 3 },
  { id: "pm-ted", name: "TED", order: 4 },
  { id: "pm-debito", name: "Débito automático", order: 5 },
  { id: "pm-credito", name: "Cartão de crédito", order: 6 },
  { id: "pm-cartao-debito", name: "Cartão de débito", order: 7 },
  { id: "pm-dinheiro", name: "Dinheiro", order: 8 },
  { id: "pm-outro", name: "Outro", order: 9 },
]

export const DEFAULT_INCOME_TYPES: CatalogItem[] = [
  { id: "it-servico", name: "Serviço", order: 0 },
  { id: "it-venda", name: "Venda", order: 1 },
  { id: "it-salario", name: "Salário", order: 2 },
  { id: "it-reembolso", name: "Reembolso", order: 3 },
  { id: "it-aluguel", name: "Aluguel", order: 4 },
  { id: "it-rendimento", name: "Rendimento", order: 5 },
  { id: "it-outro", name: "Outro", order: 6 },
]

export const DEFAULT_INVESTMENT_TYPES: CatalogItem[] = [
  { id: "iv-rf", name: "Renda fixa", order: 0 },
  { id: "iv-rv", name: "Renda variável", order: 1 },
  { id: "iv-fundo", name: "Fundo", order: 2 },
  { id: "iv-tesouro", name: "Tesouro", order: 3 },
  { id: "iv-prev", name: "Previdência", order: 4 },
  { id: "iv-cripto", name: "Cripto", order: 5 },
  { id: "iv-outro", name: "Outro", order: 6 },
]

export const MAX_INSTALLMENTS = 120
