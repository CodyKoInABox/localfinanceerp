import { addMonths } from "@/lib/dates"
import { createId } from "@/lib/ids"
import { roundMoney } from "@/lib/money"
import type { Payable, Receivable } from "@/lib/schema"

export function splitAmount(total: number, count: number): number[] {
  const cents = Math.round(total * 100)
  const base = Math.floor(cents / count)
  let remainder = cents - base * count
  return Array.from({ length: count }, () => {
    const extra = remainder > 0 ? 1 : 0
    remainder -= extra
    return (base + extra) / 100
  })
}

export function installmentDates(first: string, count: number): string[] {
  return Array.from({ length: count }, (_, index) => addMonths(first, index))
}

type PlanBase = {
  date: string
  name: string
  partyId: string | null
  amount: number
  bankId: string | null
  notes: string
  settled: boolean
  settledDate: string | null
}

export function payablePlan(
  input: PlanBase & {
    invoiceNumber: string
    paymentMethodId: string
  },
  count: number,
  now: string
): Payable[] {
  return buildPlan(input, count).map((row) => ({
    id: row.id,
    date: row.date,
    name: input.name,
    partyId: input.partyId,
    amount: row.amount,
    invoiceNumber: input.invoiceNumber,
    paymentMethodId: input.paymentMethodId,
    bankId: input.bankId,
    paid: row.settled,
    paidDate: row.settledDate,
    notes: input.notes,
    installmentGroupId: row.installmentGroupId,
    installmentIndex: row.installmentIndex,
    installmentCount: row.installmentCount,
    createdAt: now,
    updatedAt: now,
  }))
}

export function receivablePlan(
  input: PlanBase & { incomeTypeId: string },
  count: number,
  now: string
): Receivable[] {
  return buildPlan(input, count).map((row) => ({
    id: row.id,
    date: row.date,
    name: input.name,
    partyId: input.partyId,
    amount: row.amount,
    incomeTypeId: input.incomeTypeId,
    bankId: input.bankId,
    received: row.settled,
    receivedDate: row.settledDate,
    notes: input.notes,
    installmentGroupId: row.installmentGroupId,
    installmentIndex: row.installmentIndex,
    installmentCount: row.installmentCount,
    createdAt: now,
    updatedAt: now,
  }))
}

function buildPlan(input: PlanBase, count: number) {
  const amounts = splitAmount(input.amount, count)
  const dates = installmentDates(input.date, count)
  const groupId = count > 1 ? createId() : null
  const single = count === 1
  return amounts.map((amount, index) => ({
    id: createId(),
    date: dates[index] ?? input.date,
    amount: roundMoney(amount),
    settled: single ? input.settled : false,
    settledDate: single && input.settled ? input.settledDate : null,
    installmentGroupId: groupId,
    installmentIndex: index + 1,
    installmentCount: count,
  }))
}
