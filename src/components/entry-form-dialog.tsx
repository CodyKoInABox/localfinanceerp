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
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useCurrency } from "@/hooks/use-currency"
import { NONE, MAX_INSTALLMENTS } from "@/lib/constants"
import { db } from "@/lib/db"
import {
  formatCalendarDate,
  isCalendarDate,
  nowIso,
  todayIso,
} from "@/lib/dates"
import { payablePlan, receivablePlan, splitAmount } from "@/lib/installments"
import { formatMoney, moneyToInput, parseMoneyInput } from "@/lib/money"
import type { Payable, Receivable } from "@/lib/schema"

type Kind = "payable" | "receivable"

type Draft = {
  date: string
  name: string
  partyId: string | null
  amount: string
  invoiceNumber: string
  typeId: string
  bankId: string | null
  settled: boolean
  settledDate: string
  notes: string
  installments: string
}

function typeIdOf(kind: Kind, entry: Payable | Receivable | null): string {
  if (!entry) {
    return ""
  }
  return kind === "payable"
    ? (entry as Payable).paymentMethodId
    : (entry as Receivable).incomeTypeId
}

function settledOf(kind: Kind, entry: Payable | Receivable | null) {
  if (!entry) {
    return { settled: false, date: todayIso() }
  }
  if (kind === "payable") {
    const payable = entry as Payable
    return { settled: payable.paid, date: payable.paidDate ?? todayIso() }
  }
  const receivable = entry as Receivable
  return {
    settled: receivable.received,
    date: receivable.receivedDate ?? todayIso(),
  }
}

export function EntryFormDialog({
  open,
  onOpenChange,
  kind,
  entry = null,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  kind: Kind
  entry?: Payable | Receivable | null
}) {
  const banks = useLiveQuery(() => db.banks.orderBy("name").toArray()) ?? []
  const parties = useLiveQuery(() => db.parties.orderBy("name").toArray()) ?? []
  const paymentMethods =
    useLiveQuery(() => db.paymentMethods.orderBy("order").toArray()) ?? []
  const incomeTypes =
    useLiveQuery(() => db.incomeTypes.orderBy("order").toArray()) ?? []
  const currency = useCurrency()
  const types = kind === "payable" ? paymentMethods : incomeTypes
  const role = kind === "payable" ? "supplier" : "client"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90vh,44rem)] overflow-y-auto sm:max-w-xl">
        {open ? (
          <EntryForm
            key={`${entry?.id ?? `new-${kind}`}-${types[0]?.id ?? "loading"}`}
            kind={kind}
            entry={entry}
            banks={banks}
            parties={parties.filter(
              (party) =>
                party.roles.includes(role) || party.id === entry?.partyId
            )}
            types={types}
            currency={currency}
            onOpenChange={onOpenChange}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function EntryForm({
  kind,
  entry,
  banks,
  parties,
  types,
  currency,
  onOpenChange,
}: {
  kind: Kind
  entry: Payable | Receivable | null
  banks: { id: string; name: string }[]
  parties: { id: string; name: string }[]
  types: { id: string; name: string }[]
  currency: string
  onOpenChange: (open: boolean) => void
}) {
  const settled = settledOf(kind, entry)
  const [draft, setDraft] = React.useState<Draft>(() => ({
    date: entry?.date ?? todayIso(),
    name: entry?.name ?? "",
    partyId: entry?.partyId ?? null,
    amount: entry ? moneyToInput(entry.amount) : "",
    invoiceNumber:
      entry && kind === "payable" ? (entry as Payable).invoiceNumber : "",
    typeId: typeIdOf(kind, entry) || types[0]?.id || "",
    bankId: entry?.bankId ?? null,
    settled: settled.settled,
    settledDate: settled.date,
    notes: entry?.notes ?? "",
    installments: "1",
  }))

  const payable = kind === "payable"
  const count = entry ? 1 : Number(draft.installments)
  const parsedAmount = parseMoneyInput(draft.amount)
  const preview =
    !entry &&
    Number.isInteger(count) &&
    count > 1 &&
    count <= MAX_INSTALLMENTS &&
    parsedAmount != null &&
    parsedAmount > 0
      ? splitAmount(parsedAmount, count)
      : null

  function setParty(nextId: string | null) {
    setDraft((current) => {
      const previous = parties.find(
        (party) => party.id === current.partyId
      )?.name
      const next = parties.find((party) => party.id === nextId)?.name
      const replace = current.name.trim() === "" || current.name === previous
      return {
        ...current,
        partyId: nextId,
        name: replace && next ? next : current.name,
      }
    })
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const name = draft.name.trim()
    const amount = parseMoneyInput(draft.amount)
    const installments = entry ? 1 : Number(draft.installments)
    if (!name) {
      toast.error(
        payable
          ? "Informe o fornecedor ou o nome."
          : "Informe o remetente ou o cliente."
      )
      return
    }
    if (amount == null || amount <= 0) {
      toast.error("Informe um valor maior que zero.")
      return
    }
    if (!isCalendarDate(draft.date)) {
      toast.error("Informe o dia.")
      return
    }
    if (!draft.typeId) {
      toast.error(payable ? "Escolha o tipo de pagamento." : "Escolha o tipo.")
      return
    }
    if (
      !entry &&
      (!Number.isInteger(installments) ||
        installments < 1 ||
        installments > MAX_INSTALLMENTS)
    ) {
      toast.error(`Parcelas entre 1 e ${MAX_INSTALLMENTS}.`)
      return
    }
    if (
      draft.settled &&
      installments === 1 &&
      !isCalendarDate(draft.settledDate)
    ) {
      toast.error(
        payable
          ? "Informe o dia do pagamento."
          : "Informe o dia do recebimento."
      )
      return
    }

    const now = nowIso()
    const base = {
      date: draft.date,
      name,
      partyId: draft.partyId,
      amount,
      bankId: draft.bankId,
      notes: draft.notes.trim(),
      settled: installments === 1 ? draft.settled : false,
      settledDate:
        installments === 1 && draft.settled ? draft.settledDate : null,
    }

    if (entry && payable) {
      const current = entry as Payable
      await db.payables.update(current.id, {
        date: base.date,
        name: base.name,
        partyId: base.partyId,
        amount: base.amount,
        invoiceNumber: draft.invoiceNumber.trim(),
        paymentMethodId: draft.typeId,
        bankId: base.bankId,
        paid: base.settled,
        paidDate: base.settledDate,
        notes: base.notes,
        updatedAt: now,
      })
      toast.success("Conta a pagar atualizada.")
    } else if (entry) {
      const current = entry as Receivable
      await db.receivables.update(current.id, {
        date: base.date,
        name: base.name,
        partyId: base.partyId,
        amount: base.amount,
        incomeTypeId: draft.typeId,
        bankId: base.bankId,
        received: base.settled,
        receivedDate: base.settledDate,
        notes: base.notes,
        updatedAt: now,
      })
      toast.success("Conta a receber atualizada.")
    } else if (payable) {
      const rows = payablePlan(
        {
          ...base,
          invoiceNumber: draft.invoiceNumber.trim(),
          paymentMethodId: draft.typeId,
        },
        installments,
        now
      )
      await db.payables.bulkAdd(rows)
      toast.success(
        installments > 1
          ? `${installments} parcelas lançadas.`
          : "Conta a pagar lançada."
      )
    } else {
      const rows = receivablePlan(
        { ...base, incomeTypeId: draft.typeId },
        installments,
        now
      )
      await db.receivables.bulkAdd(rows)
      toast.success(
        installments > 1
          ? `${installments} parcelas lançadas.`
          : "Conta a receber lançada."
      )
    }
    onOpenChange(false)
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)}>
      <DialogHeader>
        <DialogTitle>
          {entry
            ? payable
              ? "Editar conta a pagar"
              : "Editar conta a receber"
            : payable
              ? "Nova conta a pagar"
              : "Nova conta a receber"}
        </DialogTitle>
        <DialogDescription>
          {payable
            ? "Dia, fornecedor, valor, NF, tipo, banco e se já foi pago."
            : "Dia, tipo, cliente, valor e o banco em que entrou."}
        </DialogDescription>
      </DialogHeader>
      <FieldGroup className="py-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="entry-date">Dia</FieldLabel>
            <Input
              id="entry-date"
              type="date"
              value={draft.date}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  date: event.target.value,
                }))
              }
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="entry-amount">Valor</FieldLabel>
            <MoneyInput
              id="entry-amount"
              currency={currency}
              value={draft.amount}
              onChange={(value) =>
                setDraft((current) => ({ ...current, amount: value }))
              }
              required
            />
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="entry-party">
            {payable ? "Fornecedor cadastrado" : "Cliente cadastrado"}
          </FieldLabel>
          <Select
            value={draft.partyId ?? NONE}
            onValueChange={(value) => setParty(value === NONE ? null : value)}
          >
            <SelectTrigger id="entry-party" className="w-full">
              <SelectValue placeholder="Sem cadastro" />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value={NONE}>Sem cadastro</SelectItem>
              {parties.map((party) => (
                <SelectItem key={party.id} value={party.id}>
                  {party.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor="entry-name">
            {payable ? "Fornecedor / nome" : "Remetente / cliente"}
          </FieldLabel>
          <Input
            id="entry-name"
            value={draft.name}
            onChange={(event) =>
              setDraft((current) => ({ ...current, name: event.target.value }))
            }
            placeholder={payable ? "Ex.: CEMIG ou Aluguel" : "Ex.: Ana Lima"}
            required
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="entry-type">
              {payable ? "Tipo" : "Tipo"}
            </FieldLabel>
            <Select
              value={draft.typeId || undefined}
              onValueChange={(value) =>
                setDraft((current) => ({ ...current, typeId: value }))
              }
            >
              <SelectTrigger id="entry-type" className="w-full">
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
            <FieldLabel htmlFor="entry-bank">
              {payable ? "Banco usado" : "Banco que entrou"}
            </FieldLabel>
            <Select
              value={draft.bankId ?? NONE}
              onValueChange={(value) =>
                setDraft((current) => ({
                  ...current,
                  bankId: value === NONE ? null : value,
                }))
              }
            >
              <SelectTrigger id="entry-bank" className="w-full">
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
        {payable ? (
          <Field>
            <FieldLabel htmlFor="entry-nf">NF</FieldLabel>
            <Input
              id="entry-nf"
              value={draft.invoiceNumber}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  invoiceNumber: event.target.value,
                }))
              }
            />
          </Field>
        ) : null}
        {!entry ? (
          <Field>
            <FieldLabel htmlFor="entry-installments">Parcelas</FieldLabel>
            <Input
              id="entry-installments"
              inputMode="numeric"
              value={draft.installments}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  installments: event.target.value.replace(/\D/g, ""),
                }))
              }
            />
            {preview ? (
              <p className="text-xs text-muted-foreground">
                {preview.length}x de {formatMoney(preview[0] ?? 0, currency)} a
                partir de {formatCalendarDate(draft.date)}
                {preview[0] !== preview[preview.length - 1]
                  ? ", com os centavos extras nas primeiras."
                  : "."}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                1 lança uma conta só. Mais que 1 divide o valor em meses.
              </p>
            )}
          </Field>
        ) : null}
        {(!preview || preview.length === 1) && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field orientation="horizontal">
              <Switch
                id="entry-settled"
                checked={draft.settled}
                onCheckedChange={(checked) =>
                  setDraft((current) => ({ ...current, settled: checked }))
                }
              />
              <FieldLabel htmlFor="entry-settled" className="font-normal">
                {payable ? "Pago" : "Recebido"}
              </FieldLabel>
            </Field>
            {draft.settled ? (
              <Field>
                <FieldLabel htmlFor="entry-settled-date">
                  {payable ? "Pago em" : "Recebido em"}
                </FieldLabel>
                <Input
                  id="entry-settled-date"
                  type="date"
                  value={draft.settledDate}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      settledDate: event.target.value,
                    }))
                  }
                />
              </Field>
            ) : null}
          </div>
        )}
        <Field>
          <FieldLabel htmlFor="entry-notes">Observações</FieldLabel>
          <Textarea
            id="entry-notes"
            value={draft.notes}
            onChange={(event) =>
              setDraft((current) => ({ ...current, notes: event.target.value }))
            }
          />
        </Field>
      </FieldGroup>
      <DialogFooter>
        <Button type="submit">{entry ? "Salvar" : "Lançar"}</Button>
      </DialogFooter>
    </form>
  )
}
