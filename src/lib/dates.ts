import { Temporal } from "@js-temporal/polyfill"

const CALENDAR_DATE = /^\d{4}-\d{2}-\d{2}$/

export function todayIso(): string {
  return Temporal.Now.plainDateISO().toString()
}

export function nowIso(): string {
  return Temporal.Now.instant().toString()
}

export function isCalendarDate(value: string): boolean {
  if (!CALENDAR_DATE.test(value)) {
    return false
  }
  try {
    Temporal.PlainDate.from(value)
    return true
  } catch {
    return false
  }
}

export function addMonths(iso: string, months: number): string {
  return Temporal.PlainDate.from(iso).add({ months }).toString()
}

export function addDays(iso: string, days: number): string {
  return Temporal.PlainDate.from(iso).add({ days }).toString()
}

export function compareCalendarDates(a: string, b: string): number {
  return Temporal.PlainDate.compare(
    Temporal.PlainDate.from(a),
    Temporal.PlainDate.from(b)
  )
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7)
}

export function yearOf(iso: string): number {
  return Temporal.PlainDate.from(iso).year
}

export function formatCalendarDate(iso: string): string {
  return Temporal.PlainDate.from(iso).toLocaleString("pt-BR", {
    dateStyle: "medium",
  })
}

export function formatMonthLabel(month: string): string {
  return Temporal.PlainDate.from(`${month}-01`).toLocaleString("pt-BR", {
    month: "short",
    year: "2-digit",
  })
}

export function currentYear(): number {
  return Temporal.Now.plainDateISO().year
}
