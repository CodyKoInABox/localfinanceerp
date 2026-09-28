export function formatMoney(
  amount: number,
  currency = "BRL",
  locale = "pt-BR"
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${currency} ${amount.toLocaleString(locale)}`
  }
}

export function formatPercent(value: number): string {
  const sign = value > 0 ? "+" : ""
  return `${sign}${value.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`
}

export function parseMoneyInput(raw: string): number | null {
  const trimmed = raw.trim().replace(/\s/g, "").replace(/^R\$/i, "")
  if (trimmed === "" || trimmed === "-" || trimmed === "," || trimmed === ".") {
    return null
  }
  const normalized = trimmed.includes(",")
    ? trimmed.replace(/\./g, "").replace(",", ".")
    : trimmed
  const value = Number(normalized)
  if (!Number.isFinite(value)) {
    return null
  }
  return Math.round(value * 100) / 100
}

export function moneyToInput(amount: number): string {
  return amount.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

const MAX_MONEY_DIGITS = 13

export function formatCentsDigits(digits: string): string {
  const cleaned = digits
    .replace(/\D/g, "")
    .replace(/^0+/, "")
    .slice(0, MAX_MONEY_DIGITS)
  if (!cleaned) {
    return ""
  }
  return (Number(cleaned) / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function moneyDigits(raw: string): string {
  if (raw.trim() === "") {
    return ""
  }
  const parsed = parseMoneyInput(raw)
  if (parsed == null || parsed <= 0) {
    return ""
  }
  return String(Math.round(parsed * 100))
}

export function pushMoneyDigit(
  current: string,
  digit: string,
  replace = false
): string {
  const base = replace ? "" : moneyDigits(current)
  return formatCentsDigits(`${base}${digit}`)
}

export function popMoneyDigit(current: string): string {
  return formatCentsDigits(moneyDigits(current).slice(0, -1))
}

export function moneyFromClipboard(text: string): string {
  const trimmed = text.trim()
  if (trimmed === "") {
    return ""
  }
  if (/[,.]/.test(trimmed) || /r\$/i.test(trimmed)) {
    const parsed = parseMoneyInput(trimmed)
    if (parsed == null || parsed < 0) {
      return ""
    }
    return formatCentsDigits(String(Math.round(parsed * 100)))
  }
  return formatCentsDigits(trimmed)
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

export function currencySymbol(currency: string): string {
  try {
    const parts = new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency,
    }).formatToParts(0)
    return parts.find((part) => part.type === "currency")?.value ?? currency
  } catch {
    return currency
  }
}
