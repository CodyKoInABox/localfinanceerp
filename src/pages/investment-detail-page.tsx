import * as React from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { PlusIcon } from "lucide-react"
import { Link, useNavigate, useParams } from "react-router"
import { toast } from "sonner"

import { ValueLine } from "@/components/charts"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { InvestmentFormDialog } from "@/components/investment-form-dialog"
import { MoneyInput } from "@/components/money-input"
import { PageHeader, PageSkeleton, PageStack } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { useCurrency } from "@/hooks/use-currency"
import { db } from "@/lib/db"
import {
  currentYear,
  formatCalendarDate,
  isCalendarDate,
  nowIso,
  todayIso,
} from "@/lib/dates"
import { createId } from "@/lib/ids"
import { labelOf } from "@/lib/lookups"
import {
  formatMoney,
  formatPercent,
  moneyToInput,
  parseMoneyInput,
} from "@/lib/money"
import type { Valuation } from "@/lib/schema"
import { investmentPerformance } from "@/lib/stats"

export function InvestmentDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const currency = useCurrency()
  const investment = useLiveQuery(
    () => (id ? db.investments.get(id) : undefined),
    [id]
  )
  const valuations = useLiveQuery(
    () => (id ? db.valuations.where("investmentId").equals(id).toArray() : []),
    [id]
  )
  const types = useLiveQuery(() => db.investmentTypes.toArray()) ?? []
  const banks = useLiveQuery(() => db.banks.toArray()) ?? []
  const [editing, setEditing] = React.useState(false)
  const [valuation, setValuation] = React.useState<Valuation | null | "new">(
    null
  )
  const [wipe, setWipe] = React.useState(false)

  if (investment === undefined || valuations === undefined) {
    return <PageSkeleton />
  }
  if (!investment) {
    return (
      <PageStack>
        <PageHeader title="Aplicação não encontrada" />
        <Button variant="outline" asChild>
          <Link to="/investimentos">Voltar</Link>
        </Button>
      </PageStack>
    )
  }

  const performance = investmentPerformance(
    investment,
    valuations,
    currentYear()
  )
  const investmentId = investment.id

  async function removeValuation(row: Valuation) {
    await db.valuations.delete(row.id)
    toast.success("Valor removido do histórico.")
  }

  async function removeInvestment() {
    await db.transaction("rw", [db.investments, db.valuations], async () => {
      await db.valuations.where("investmentId").equals(investmentId).delete()
      await db.investments.delete(investmentId)
    })
    toast.success("Aplicação excluída.")
    navigate("/investimentos")
  }

  return (
    <PageStack>
      <PageHeader
        title={investment.name}
        description={`${labelOf(types, investment.typeId)} · ${labelOf(banks, investment.bankId, "Sem banco")} · desde ${formatCalendarDate(investment.openedOn)}`}
        actions={
          <>
            <Button variant="outline" onClick={() => setEditing(true)}>
              Editar
            </Button>
            <Button onClick={() => setValuation("new")}>
              <PlusIcon data-icon="inline-start" />
              Atualizar valor
            </Button>
          </>
        }
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Aplicado</CardDescription>
            <CardTitle className="tabular-nums">
              {formatMoney(investment.contributed, currency)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Valor atual</CardDescription>
            <CardTitle className="tabular-nums">
              {performance.latest == null
                ? "—"
                : formatMoney(performance.latest, currency)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {performance.latestDate
              ? formatCalendarDate(performance.latestDate)
              : "Nenhum valor lançado"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Resultado</CardDescription>
            <CardTitle className="flex items-center gap-2 tabular-nums">
              {performance.gain == null
                ? "—"
                : formatMoney(performance.gain, currency)}
              {performance.percent != null ? (
                <Badge
                  variant={
                    performance.percent >= 0 ? "secondary" : "destructive"
                  }
                >
                  {formatPercent(performance.percent)}
                </Badge>
              ) : null}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Histórico</CardTitle>
          <CardDescription>
            Cada atualização fica registrada. O resultado usa o último valor.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ValueLine values={performance.series.map((row) => row.amount)} />
          {investment.notes ? (
            <p className="text-sm text-muted-foreground">{investment.notes}</p>
          ) : null}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dia</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Observação</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...performance.series].reverse().map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{formatCalendarDate(row.date)}</TableCell>
                    <TableCell className="tabular-nums">
                      {formatMoney(row.amount, currency)}
                    </TableCell>
                    <TableCell>{row.notes || "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setValuation(row)}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void removeValuation(row)}
                      >
                        Excluir
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div>
            <Button variant="destructive" onClick={() => setWipe(true)}>
              Excluir aplicação
            </Button>
          </div>
        </CardContent>
      </Card>
      <InvestmentFormDialog
        open={editing}
        investment={investment}
        onOpenChange={setEditing}
      />
      <ValuationDialog
        open={valuation != null}
        valuation={valuation === "new" ? null : valuation}
        currency={currency}
        investmentId={investment.id}
        onOpenChange={(open) => {
          if (!open) {
            setValuation(null)
          }
        }}
      />
      <ConfirmDialog
        open={wipe}
        onOpenChange={setWipe}
        title="Excluir aplicação"
        description="O cadastro e todo o histórico de valores saem deste navegador."
        confirmLabel="Excluir"
        destructive
        onConfirm={() => void removeInvestment()}
      />
    </PageStack>
  )
}

function ValuationDialog({
  open,
  onOpenChange,
  valuation,
  investmentId,
  currency,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  valuation: Valuation | null
  investmentId: string
  currency: string
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {open ? (
          <ValuationForm
            key={valuation?.id ?? "new-valuation"}
            valuation={valuation}
            investmentId={investmentId}
            currency={currency}
            onOpenChange={onOpenChange}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function ValuationForm({
  valuation,
  investmentId,
  currency,
  onOpenChange,
}: {
  valuation: Valuation | null
  investmentId: string
  currency: string
  onOpenChange: (open: boolean) => void
}) {
  const [date, setDate] = React.useState(valuation?.date ?? todayIso())
  const [amount, setAmount] = React.useState(
    valuation ? moneyToInput(valuation.amount) : ""
  )
  const [notes, setNotes] = React.useState(valuation?.notes ?? "")

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const parsed = parseMoneyInput(amount)
    if (!isCalendarDate(date)) {
      toast.error("Informe o dia.")
      return
    }
    if (parsed == null || parsed < 0) {
      toast.error("Informe o valor.")
      return
    }
    const now = nowIso()
    await db.valuations.put({
      id: valuation?.id ?? createId(),
      investmentId,
      date,
      amount: parsed,
      notes: notes.trim(),
      createdAt: valuation?.createdAt ?? now,
    })
    await db.investments.update(investmentId, { updatedAt: now })
    toast.success(valuation ? "Valor atualizado." : "Valor lançado.")
    onOpenChange(false)
  }

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      className="flex flex-col gap-4"
    >
      <DialogHeader>
        <DialogTitle>
          {valuation ? "Editar valor" : "Atualizar valor"}
        </DialogTitle>
      </DialogHeader>
      <Field>
        <FieldLabel htmlFor="val-date">Dia</FieldLabel>
        <Input
          id="val-date"
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          required
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="val-amount">Valor de mercado</FieldLabel>
        <MoneyInput
          id="val-amount"
          currency={currency}
          value={amount}
          onChange={setAmount}
          required
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="val-notes">Observação</FieldLabel>
        <Textarea
          id="val-notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </Field>
      <DialogFooter>
        <Button type="submit">Salvar</Button>
      </DialogFooter>
    </form>
  )
}
