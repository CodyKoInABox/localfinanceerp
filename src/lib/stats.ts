import {
  addMonths,
  compareCalendarDates,
  monthKey,
  todayIso,
} from "@/lib/dates"
import { roundMoney } from "@/lib/money"
import type { Investment, Payable, Receivable, Valuation } from "@/lib/schema"

export type NamedTotal = {
  id: string
  name: string
  total: number
  count: number
}

export type MonthPoint = {
  month: string
  paid: number
  received: number
}

export type Basis = "settled" | "competence"

export function recentMonths(count: number, from = todayIso()): string[] {
  const start = `${monthKey(from)}-01`
  return Array.from({ length: count }, (_, index) =>
    monthKey(addMonths(start, index - (count - 1)))
  )
}

export function monthsOfYear(year: number): string[] {
  return Array.from({ length: 12 }, (_, index) => {
    const month = String(index + 1).padStart(2, "0")
    return `${year}-${month}`
  })
}

export function isOverdue(
  date: string,
  settled: boolean,
  today = todayIso()
): boolean {
  return !settled && compareCalendarDates(date, today) < 0
}

export function payableWhen(entry: Payable, basis: Basis): string | null {
  if (basis === "competence") {
    return entry.date
  }
  if (!entry.paid) {
    return null
  }
  return entry.paidDate ?? entry.date
}

export function receivableWhen(entry: Receivable, basis: Basis): string | null {
  if (basis === "competence") {
    return entry.date
  }
  if (!entry.received) {
    return null
  }
  return entry.receivedDate ?? entry.date
}

export function monthTotals(
  months: string[],
  payables: Payable[],
  receivables: Receivable[],
  basis: Basis
): MonthPoint[] {
  const paid = new Map(months.map((month) => [month, 0]))
  const received = new Map(months.map((month) => [month, 0]))
  for (const entry of payables) {
    const when = payableWhen(entry, basis)
    if (!when) {
      continue
    }
    const month = monthKey(when)
    if (paid.has(month)) {
      paid.set(month, roundMoney((paid.get(month) ?? 0) + entry.amount))
    }
  }
  for (const entry of receivables) {
    const when = receivableWhen(entry, basis)
    if (!when) {
      continue
    }
    const month = monthKey(when)
    if (received.has(month)) {
      received.set(month, roundMoney((received.get(month) ?? 0) + entry.amount))
    }
  }
  return months.map((month) => ({
    month,
    paid: paid.get(month) ?? 0,
    received: received.get(month) ?? 0,
  }))
}

export function totalsBy(
  rows: { key: string; name: string; amount: number }[]
): NamedTotal[] {
  const map = new Map<string, NamedTotal>()
  for (const row of rows) {
    const current = map.get(row.key)
    if (current) {
      current.total = roundMoney(current.total + row.amount)
      current.count += 1
    } else {
      map.set(row.key, {
        id: row.key,
        name: row.name,
        total: row.amount,
        count: 1,
      })
    }
  }
  return [...map.values()].sort(
    (a, b) => b.total - a.total || a.name.localeCompare(b.name, "pt-BR")
  )
}

export function sumAmounts(values: number[]): number {
  return roundMoney(values.reduce((total, value) => total + value, 0))
}

export type InvestmentPerformance = {
  investment: Investment
  latest: number | null
  latestDate: string | null
  gain: number | null
  percent: number | null
  yearStart: number | null
  yearEnd: number | null
  yearChange: number | null
  series: Valuation[]
}

export function sortValuations(rows: Valuation[]): Valuation[] {
  return [...rows].sort((a, b) => {
    const byDate = compareCalendarDates(a.date, b.date)
    if (byDate !== 0) {
      return byDate
    }
    return a.createdAt.localeCompare(b.createdAt)
  })
}

export function valueAsOf(series: Valuation[], date: string): number | null {
  const sorted = sortValuations(series)
  let amount: number | null = null
  for (const row of sorted) {
    if (compareCalendarDates(row.date, date) <= 0) {
      amount = row.amount
    }
  }
  return amount
}

export function investmentPerformance(
  investment: Investment,
  valuations: Valuation[],
  year: number
): InvestmentPerformance {
  const series = sortValuations(
    valuations.filter((row) => row.investmentId === investment.id)
  )
  const latest = series.at(-1) ?? null
  const gain =
    latest == null ? null : roundMoney(latest.amount - investment.contributed)
  const percent =
    gain == null || investment.contributed <= 0
      ? null
      : (gain / investment.contributed) * 100
  const yearStartDate = `${year}-01-01`
  const yearEndDate = `${year}-12-31`
  const before = series.filter(
    (row) => compareCalendarDates(row.date, yearStartDate) < 0
  )
  const inside = series.filter((row) => {
    return (
      compareCalendarDates(row.date, yearStartDate) >= 0 &&
      compareCalendarDates(row.date, yearEndDate) <= 0
    )
  })
  const start = before.at(-1)?.amount ?? inside[0]?.amount ?? null
  const end = valueAsOf(series, yearEndDate)
  const yearEnd =
    end != null && inside.length > 0 ? end : (inside.at(-1)?.amount ?? null)
  const yearChange =
    start != null && yearEnd != null ? roundMoney(yearEnd - start) : null
  return {
    investment,
    latest: latest?.amount ?? null,
    latestDate: latest?.date ?? null,
    gain,
    percent,
    yearStart: start,
    yearEnd,
    yearChange,
    series,
  }
}
