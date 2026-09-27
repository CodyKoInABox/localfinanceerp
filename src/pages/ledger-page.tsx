import * as React from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { MoreHorizontalIcon, PlusIcon } from "lucide-react"
import { useSearchParams } from "react-router"
import { toast } from "sonner"

import { useCreate } from "@/components/create-provider"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { EntryFormDialog } from "@/components/entry-form-dialog"
import { PageHeader, PageSkeleton, PageStack } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useCurrency } from "@/hooks/use-currency"
import { db } from "@/lib/db"
import {
  compareCalendarDates,
  formatCalendarDate,
  monthKey,
  nowIso,
  todayIso,
} from "@/lib/dates"
import { labelOf } from "@/lib/lookups"
import { formatMoney } from "@/lib/money"
import type { Payable, Receivable } from "@/lib/schema"
import { isOverdue, sumAmounts } from "@/lib/stats"

type Kind = "payable" | "receivable"
type Status = "all" | "open" | "settled" | "overdue"

function readStatus(value: string | null): Status {
  if (value === "open" || value === "settled" || value === "overdue") {
    return value
  }
  return "all"
}

function isPayableEntry(entry: Payable | Receivable): entry is Payable {
  return "paid" in entry
}

export function LedgerPage({ kind }: { kind: Kind }) {
  const currency = useCurrency()
  const { openCreate } = useCreate()
  const [params, setParams] = useSearchParams()
  const [editing, setEditing] = React.useState<Payable | Receivable | null>(
    null
  )
  const [pendingDelete, setPendingDelete] = React.useState<
    Payable | Receivable | null
  >(null)
  const [pendingGroup, setPendingGroup] = React.useState<string | null>(null)

  const payables = useLiveQuery(() => db.payables.toArray())
  const receivables = useLiveQuery(() => db.receivables.toArray())
  const parties = useLiveQuery(() => db.parties.toArray()) ?? []
  const banks = useLiveQuery(() => db.banks.toArray()) ?? []
  const paymentMethods = useLiveQuery(() => db.paymentMethods.toArray()) ?? []
  const incomeTypes = useLiveQuery(() => db.incomeTypes.toArray()) ?? []

  const rows = kind === "payable" ? payables : receivables
  if (!rows || (kind === "payable" ? !payables : !receivables)) {
    return <PageSkeleton />
  }

  const status = readStatus(params.get("status"))
  const month = params.get("mes") ?? ""
  const query = (params.get("q") ?? "").trim().toLowerCase()
  const group = params.get("grupo")
  const person = params.get("pessoa")
  const today = todayIso()

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(params)
    if (!value) {
      next.delete(key)
    } else {
      next.set(key, value)
    }
    setParams(next)
  }

  const filtered = rows.filter((entry) => {
    const settled = isPayableEntry(entry) ? entry.paid : entry.received
    if (status === "open" && settled) {
      return false
    }
    if (status === "settled" && !settled) {
      return false
    }
    if (status === "overdue" && !isOverdue(entry.date, settled, today)) {
      return false
    }
    if (month && monthKey(entry.date) !== month) {
      return false
    }
    if (group && entry.installmentGroupId !== group) {
      return false
    }
    if (person && entry.partyId !== person) {
      return false
    }
    if (!query) {
      return true
    }
    const typeName = isPayableEntry(entry)
      ? labelOf(paymentMethods, entry.paymentMethodId, "")
      : labelOf(incomeTypes, entry.incomeTypeId, "")
    const invoice = isPayableEntry(entry) ? entry.invoiceNumber : ""
    const haystack = [
      entry.name,
      entry.notes,
      invoice,
      labelOf(parties, entry.partyId, ""),
      labelOf(banks, entry.bankId, ""),
      typeName,
    ]
      .join(" ")
      .toLowerCase()
    return haystack.includes(query)
  })

  filtered.sort(
    (a, b) =>
      compareCalendarDates(b.date, a.date) ||
      a.name.localeCompare(b.name, "pt-BR")
  )

  const openTotal = sumAmounts(
    filtered
      .filter((entry) =>
        isPayableEntry(entry) ? !entry.paid : !entry.received
      )
      .map((entry) => entry.amount)
  )
  const allTotal = sumAmounts(filtered.map((entry) => entry.amount))

  async function toggleSettled(entry: Payable | Receivable) {
    const now = nowIso()
    if (isPayableEntry(entry)) {
      const paid = !entry.paid
      await db.payables.update(entry.id, {
        paid,
        paidDate: paid ? (entry.paidDate ?? today) : null,
        updatedAt: now,
      })
      return
    }
    const received = !entry.received
    await db.receivables.update(entry.id, {
      received,
      receivedDate: received ? (entry.receivedDate ?? today) : null,
      updatedAt: now,
    })
  }

  async function removeOne(entry: Payable | Receivable) {
    if (isPayableEntry(entry)) {
      await db.payables.delete(entry.id)
    } else {
      await db.receivables.delete(entry.id)
    }
    toast.success("Lançamento excluído.")
  }

  async function removeGroup(groupId: string) {
    if (kind === "payable") {
      await db.payables.where("installmentGroupId").equals(groupId).delete()
    } else {
      await db.receivables.where("installmentGroupId").equals(groupId).delete()
    }
    toast.success("Parcelas excluídas.")
    setParam("grupo", null)
  }

  const title = kind === "payable" ? "Contas a pagar" : "Contas a receber"
  const personName = person ? labelOf(parties, person, "") : ""

  return (
    <PageStack>
      <PageHeader
        title={title}
        description={
          kind === "payable"
            ? "Vencimento, fornecedor, NF, tipo, banco e o que já foi pago."
            : "Dia, tipo, cliente, valor e o banco em que o dinheiro entrou."
        }
        actions={
          <Button
            onClick={() =>
              openCreate(kind === "payable" ? "payable" : "receivable")
            }
          >
            <PlusIcon data-icon="inline-start" />
            Novo
          </Button>
        }
      />
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={params.get("q") ?? ""}
          onChange={(event) => setParam("q", event.target.value || null)}
          placeholder="Buscar nome, NF, observação"
          className="w-full sm:max-w-xs"
          aria-label="Buscar"
        />
        <Select
          value={status}
          onValueChange={(value) =>
            setParam("status", value === "all" ? null : value)
          }
        >
          <SelectTrigger className="w-36" aria-label="Situação">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="open">Em aberto</SelectItem>
            <SelectItem value="overdue">Atrasadas</SelectItem>
            <SelectItem value="settled">
              {kind === "payable" ? "Pagas" : "Recebidas"}
            </SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="month"
          value={month}
          aria-label="Mês do vencimento"
          onChange={(event) => setParam("mes", event.target.value || null)}
          className="w-40"
        />
        {group || person || month || query || status !== "all" ? (
          <Button
            variant="ghost"
            onClick={() => setParams(new URLSearchParams())}
          >
            Limpar filtros
          </Button>
        ) : null}
      </div>
      {group || personName ? (
        <p className="text-sm text-muted-foreground">
          {group ? "Mostrando uma série de parcelas. " : ""}
          {personName ? `Filtrado por ${personName}.` : ""}
        </p>
      ) : null}
      <p className="text-sm text-muted-foreground">
        {filtered.length} lançamento{filtered.length === 1 ? "" : "s"} ·{" "}
        {formatMoney(allTotal, currency)} · em aberto{" "}
        {formatMoney(openTotal, currency)}
      </p>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Dia</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Valor</TableHead>
              {kind === "payable" ? <TableHead>NF</TableHead> : null}
              <TableHead>Tipo</TableHead>
              <TableHead>Banco</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={kind === "payable" ? 8 : 7}>
                  <span className="text-sm text-muted-foreground">
                    Nenhum lançamento com esses filtros.
                  </span>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((entry) => {
                const settled = isPayableEntry(entry)
                  ? entry.paid
                  : entry.received
                const overdue = isOverdue(entry.date, settled, today)
                const settledDate = isPayableEntry(entry)
                  ? entry.paidDate
                  : entry.receivedDate
                const typeName = isPayableEntry(entry)
                  ? labelOf(paymentMethods, entry.paymentMethodId)
                  : labelOf(incomeTypes, entry.incomeTypeId)
                return (
                  <TableRow key={entry.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatCalendarDate(entry.date)}
                    </TableCell>
                    <TableCell>
                      <div className="flex min-w-40 flex-col gap-1">
                        <span className="font-medium">{entry.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {labelOf(parties, entry.partyId, "Sem cadastro")}
                          {entry.installmentCount > 1
                            ? ` · ${entry.installmentIndex}/${entry.installmentCount}`
                            : ""}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap tabular-nums">
                      {formatMoney(entry.amount, currency)}
                    </TableCell>
                    {isPayableEntry(entry) ? (
                      <TableCell>{entry.invoiceNumber || "—"}</TableCell>
                    ) : null}
                    <TableCell>{typeName}</TableCell>
                    <TableCell>{labelOf(banks, entry.bankId, "—")}</TableCell>
                    <TableCell>
                      {settled ? (
                        <Badge variant="secondary">
                          {kind === "payable" ? "Pago" : "Recebido"}
                          {settledDate
                            ? ` ${formatCalendarDate(settledDate)}`
                            : ""}
                        </Badge>
                      ) : overdue ? (
                        <Badge variant="destructive">Atrasado</Badge>
                      ) : (
                        <Badge variant="outline">Aberto</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Ações"
                          >
                            <MoreHorizontalIcon />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditing(entry)}>
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => void toggleSettled(entry)}
                          >
                            {settled
                              ? kind === "payable"
                                ? "Desmarcar pago"
                                : "Desmarcar recebido"
                              : kind === "payable"
                                ? "Marcar pago"
                                : "Marcar recebido"}
                          </DropdownMenuItem>
                          {entry.installmentGroupId ? (
                            <DropdownMenuItem
                              onClick={() =>
                                setParam("grupo", entry.installmentGroupId)
                              }
                            >
                              Ver parcelas
                            </DropdownMenuItem>
                          ) : null}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setPendingDelete(entry)}
                          >
                            Excluir
                          </DropdownMenuItem>
                          {entry.installmentGroupId ? (
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() =>
                                setPendingGroup(entry.installmentGroupId)
                              }
                            >
                              Excluir série
                            </DropdownMenuItem>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
      <EntryFormDialog
        open={editing != null}
        kind={kind}
        entry={editing}
        onOpenChange={(open) => {
          if (!open) {
            setEditing(null)
          }
        }}
      />
      <ConfirmDialog
        open={pendingDelete != null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDelete(null)
          }
        }}
        title="Excluir lançamento"
        description="Essa parcela ou conta sai só deste navegador."
        confirmLabel="Excluir"
        destructive
        onConfirm={() => {
          if (pendingDelete) {
            void removeOne(pendingDelete)
          }
        }}
      />
      <ConfirmDialog
        open={pendingGroup != null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingGroup(null)
          }
        }}
        title="Excluir todas as parcelas"
        description="Apaga a série inteira, pagas e em aberto."
        confirmLabel="Excluir série"
        destructive
        onConfirm={() => {
          if (pendingGroup) {
            void removeGroup(pendingGroup)
          }
        }}
      />
    </PageStack>
  )
}
