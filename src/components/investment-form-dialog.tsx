import * as React from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { toast } from "sonner"

import { MoneyInput } from "@/components/money-input"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useCurrency } from "@/hooks/use-currency"
import { NONE } from "@/lib/constants"
import { db } from "@/lib/db"
import { isCalendarDate, nowIso, todayIso } from "@/lib/dates"
import { createId } from "@/lib/ids"
import { moneyToInput, parseMoneyInput } from "@/lib/money"
import type { Investment } from "@/lib/schema"

export function InvestmentFormDialog({
  open,
  onOpenChange,
  investment = null,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  investment?: Investment | null
}) {
  const types =
    useLiveQuery(() => db.investmentTypes.orderBy("order").toArray()) ?? []
  const banks = useLiveQuery(() => db.banks.orderBy("name").toArray()) ?? []
  const currency = useCurrency()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90vh,40rem)] overflow-y-auto sm:max-w-lg">
        {open ? (
          <InvestmentForm
            key={`${investment?.id ?? "new-investment"}-${types[0]?.id ?? "loading"}`}
            investment={investment}
            types={types}
            banks={banks}
            currency={currency}
            onOpenChange={onOpenChange}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function InvestmentForm({
  investment,
  types,
  banks,
  currency,
  onOpenChange,
}: {
  investment: Investment | null
  types: { id: string; name: string }[]
  banks: { id: string; name: string }[]
  currency: string
  onOpenChange: (open: boolean) => void
}) {
  const [name, setName] = React.useState(investment?.name ?? "")
  const [typeId, setTypeId] = React.useState(
    investment?.typeId ?? types[0]?.id ?? ""
  )
  const [bankId, setBankId] = React.useState<string | null>(
    investment?.bankId ?? null
  )
  const [contributed, setContributed] = React.useState(
    investment ? moneyToInput(investment.contributed) : ""
  )
  const [current, setCurrent] = React.useState(
    investment ? moneyToInput(investment.contributed) : ""
  )
  const [openedOn, setOpenedOn] = React.useState(
    investment?.openedOn ?? todayIso()
  )
  const [notes, setNotes] = React.useState(investment?.notes ?? "")

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const trimmed = name.trim()
    const applied = parseMoneyInput(contributed)
    const market = parseMoneyInput(current)
    if (!trimmed) {
      toast.error("Informe o nome da aplicação.")
      return
    }
    if (!typeId) {
      toast.error("Escolha o tipo.")
      return
    }
    if (applied == null || applied < 0) {
      toast.error("Informe o valor aplicado.")
      return
    }
    if (!investment && (market == null || market < 0)) {
      toast.error("Informe o valor atual.")
      return
    }
    if (!isCalendarDate(openedOn)) {
      toast.error("Informe a data.")
      return
    }
    const now = nowIso()
    const next: Investment = {
      id: investment?.id ?? createId(),
      name: trimmed,
      typeId,
      bankId,
      contributed: applied,
      openedOn,
      notes: notes.trim(),
      createdAt: investment?.createdAt ?? now,
      updatedAt: now,
    }
    if (investment) {
      await db.investments.put(next)
      toast.success("Aplicação atualizada.")
    } else {
      await db.transaction("rw", [db.investments, db.valuations], async () => {
        await db.investments.add(next)
        await db.valuations.add({
          id: createId(),
          investmentId: next.id,
          date: openedOn,
          amount: market ?? applied,
          notes: "",
          createdAt: now,
        })
      })
      toast.success("Aplicação cadastrada.")
    }
    onOpenChange(false)
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)}>
      <DialogHeader>
        <DialogTitle>
          {investment ? "Editar aplicação" : "Nova aplicação"}
        </DialogTitle>
        <DialogDescription>
          O valor de mercado entra no histórico. Depois é só atualizar a data e
          o saldo.
        </DialogDescription>
      </DialogHeader>
      <FieldGroup className="py-4">
        <Field>
          <FieldLabel htmlFor="inv-name">Nome</FieldLabel>
          <Input
            id="inv-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="inv-type">Tipo</FieldLabel>
            <Select value={typeId || undefined} onValueChange={setTypeId}>
              <SelectTrigger id="inv-type" className="w-full">
                <SelectValue placeholder="Escolher" />
              </SelectTrigger>
              <SelectContent position="popper">
                {types.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="inv-bank">Banco / corretora</FieldLabel>
            <Select
              value={bankId ?? NONE}
              onValueChange={(value) =>
                setBankId(value === NONE ? null : value)
              }
            >
              <SelectTrigger id="inv-bank" className="w-full">
                <SelectValue placeholder="Sem banco" />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectItem value={NONE}>Sem banco</SelectItem>
                {banks.map((bank) => (
                  <SelectItem key={bank.id} value={bank.id}>
                    {bank.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="inv-applied">Valor aplicado</FieldLabel>
            <MoneyInput
              id="inv-applied"
              currency={currency}
              value={contributed}
              onChange={setContributed}
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="inv-date">Desde</FieldLabel>
            <Input
              id="inv-date"
              type="date"
              value={openedOn}
              onChange={(event) => setOpenedOn(event.target.value)}
              required
            />
          </Field>
        </div>
        {!investment ? (
          <Field>
            <FieldLabel htmlFor="inv-current">Valor atual</FieldLabel>
            <MoneyInput
              id="inv-current"
              currency={currency}
              value={current}
              onChange={setCurrent}
              required
            />
          </Field>
        ) : null}
        <Field>
          <FieldLabel htmlFor="inv-notes">Observações</FieldLabel>
          <Textarea
            id="inv-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </Field>
      </FieldGroup>
      <DialogFooter>
        <Button type="submit">{investment ? "Salvar" : "Cadastrar"}</Button>
      </DialogFooter>
    </form>
  )
}
