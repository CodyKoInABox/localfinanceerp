import * as React from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { PlusIcon, XIcon } from "lucide-react"
import { useNavigate } from "react-router"
import { toast } from "sonner"

import { MoneyInput } from "@/components/money-input"
import { PageHeader, PageSkeleton, PageStack } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useCurrency } from "@/hooks/use-currency"
import { NONE } from "@/lib/constants"
import { db } from "@/lib/db"
import { isCalendarDate, nowIso } from "@/lib/dates"
import { payablePlan, receivablePlan } from "@/lib/installments"
import { formatMoney, parseMoneyInput } from "@/lib/money"
import {
  applyPasteCells,
  assignParty,
  blankRow,
  clearQuickDraft,
  emptyDefaults,
  formatQuickAmount,
  initialRows,
  isGridPaste,
  isPristine,
  isRowBlank,
  matchByName,
  parseQuickPaste,
  readQuickDraft,
  renameRow,
  withTrailingBlank,
  writeQuickDraft,
  type QuickDefaults,
  type QuickField,
  type QuickKind,
  type QuickRow,
} from "@/lib/quick-entry"
import { cn } from "@/lib/utils"

const cellClass =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"

function focusName(key: string) {
  requestAnimationFrame(() => {
    document
      .querySelector<HTMLElement>(
        `[data-quick="${CSS.escape(key)}"][data-field="name"]`
      )
      ?.focus()
  })
}

function seed(kind: QuickKind): { defaults: QuickDefaults; rows: QuickRow[] } {
  const stored = readQuickDraft(kind)
  if (stored) {
    return stored
  }
  const defaults = emptyDefaults()
  return { defaults, rows: initialRows(defaults) }
}

export function QuickEntryPage({ kind }: { kind: QuickKind }) {
  const navigate = useNavigate()
  const currency = useCurrency()
  const payable = kind === "payable"
  const role = payable ? "supplier" : "client"
  const seeded = React.useMemo(() => seed(kind), [kind])
  const [defaults, setDefaults] = React.useState(seeded.defaults)
  const [rows, setRows] = React.useState(seeded.rows)
  const [invalid, setInvalid] = React.useState<string[]>([])
  const [busy, setBusy] = React.useState(false)

  const parties = useLiveQuery(() => db.parties.orderBy("name").toArray()) ?? []
  const banks = useLiveQuery(() => db.banks.orderBy("name").toArray()) ?? []
  const paymentMethods = useLiveQuery(() =>
    db.paymentMethods.orderBy("order").toArray()
  )
  const incomeTypes = useLiveQuery(() =>
    db.incomeTypes.orderBy("order").toArray()
  )
  const types = (payable ? paymentMethods : incomeTypes) ?? []
  const visibleParties = parties.filter((party) => party.roles.includes(role))
  const fallbackTypeId = defaults.typeId || types[0]?.id || ""

  function commit(nextRows: QuickRow[], nextDefaults = defaults) {
    const filled = withTrailingBlank(nextRows, nextDefaults)
    writeQuickDraft(kind, nextDefaults, filled)
    setDefaults(nextDefaults)
    setRows(filled)
  }

  function patchRow(index: number, recipe: (row: QuickRow) => QuickRow) {
    const next = rows.map((row, rowIndex) =>
      rowIndex === index ? recipe(row) : row
    )
    setInvalid((current) => current.filter((key) => key !== next[index]?.key))
    commit(next)
  }

  function updateDefaults(patch: Partial<QuickDefaults>) {
    const current = defaults
    const next = { ...current, ...patch }
    const nextRows = rows.map((row) =>
      isPristine(row, current)
        ? {
            ...row,
            date: next.date,
            typeId: next.typeId,
            bankId: next.bankId,
            settled: next.settled,
          }
        : row
    )
    commit(nextRows, next)
  }

  function goNext(index: number) {
    let nextRows = rows
    if (index >= nextRows.length - 1) {
      nextRows = [...nextRows, blankRow(defaults)]
      commit(nextRows)
    }
    const target = nextRows[index + 1]
    if (target) {
      focusName(target.key)
    }
  }

  function onEnter(index: number) {
    return (event: React.KeyboardEvent) => {
      if (
        event.key !== "Enter" ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey
      ) {
        return
      }
      event.preventDefault()
      goNext(index)
    }
  }

  function catalogs() {
    return { parties: visibleParties, types, banks }
  }

  function applyGrid(index: number, field: QuickField, text: string): boolean {
    if (!isGridPaste(text)) {
      return false
    }
    let parsed: ReturnType<typeof parseQuickPaste>
    try {
      parsed = parseQuickPaste(kind, text, field)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Cola inválida.")
      return true
    }
    const useful = parsed.filter((cells) =>
      cells.some((cell) => cell.raw.trim() !== "")
    )
    if (useful.length === 0) {
      toast.error("Nada para colar.")
      return true
    }
    const next = [...rows]
    const base = defaults
    while (next.length < index + useful.length) {
      next.push(blankRow(base))
    }
    useful.forEach((cells, offset) => {
      const row = next[index + offset]
      if (!row) {
        return
      }
      next[index + offset] = applyPasteCells(row, cells, catalogs())
    })
    commit(next)
    const after = next[index + useful.length]
    if (after) {
      focusName(after.key)
    }
    return true
  }

  async function save() {
    const used = rows.flatMap((row, index) =>
      isRowBlank(row) ? [] : [{ row, index }]
    )
    if (used.length === 0) {
      toast.error("Nada para lançar.")
      return
    }
    const problems: string[] = []
    const badKeys: string[] = []
    const ready = used.flatMap(({ row, index }) => {
      const typeId = row.typeId || fallbackTypeId
      const linked =
        visibleParties.find((item) => item.id === row.partyId) ??
        matchByName(visibleParties, row.name)
      const name = row.name.trim() || linked?.name || ""
      const amount = parseMoneyInput(row.amount)
      const line = index + 1
      let bad = false
      if (!name) {
        problems.push(`Linha ${line}: falta o nome.`)
        bad = true
      }
      if (amount == null || amount <= 0) {
        problems.push(`Linha ${line}: valor maior que zero.`)
        bad = true
      }
      if (!isCalendarDate(row.date)) {
        problems.push(`Linha ${line}: dia inválido.`)
        bad = true
      }
      if (!typeId) {
        problems.push(`Linha ${line}: falta o tipo.`)
        bad = true
      }
      if (bad || amount == null) {
        badKeys.push(row.key)
        return []
      }
      return [
        {
          date: row.date,
          name,
          partyId: linked?.id ?? null,
          amount,
          bankId: row.bankId,
          notes: row.notes.trim(),
          settled: row.settled,
          settledDate: row.settled ? row.date : null,
          invoiceNumber: row.invoice.trim(),
          typeId,
        },
      ]
    })
    if (problems.length > 0) {
      setInvalid(badKeys)
      toast.error(problems.slice(0, 3).join(" "))
      return
    }
    setBusy(true)
    try {
      const now = nowIso()
      if (payable) {
        await db.payables.bulkAdd(
          ready.flatMap((row) =>
            payablePlan(
              {
                date: row.date,
                name: row.name,
                partyId: row.partyId,
                amount: row.amount,
                bankId: row.bankId,
                notes: row.notes,
                settled: row.settled,
                settledDate: row.settledDate,
                invoiceNumber: row.invoiceNumber,
                paymentMethodId: row.typeId,
              },
              1,
              now
            )
          )
        )
      } else {
        await db.receivables.bulkAdd(
          ready.flatMap((row) =>
            receivablePlan(
              {
                date: row.date,
                name: row.name,
                partyId: row.partyId,
                amount: row.amount,
                bankId: row.bankId,
                notes: row.notes,
                settled: row.settled,
                settledDate: row.settledDate,
                incomeTypeId: row.typeId,
              },
              1,
              now
            )
          )
        )
      }
      clearQuickDraft(kind)
      toast.success(
        ready.length === 1 ? "1 lançamento." : `${ready.length} lançamentos.`
      )
      navigate(payable ? "/pagar" : "/receber")
    } finally {
      setBusy(false)
    }
  }

  function onGridKeyDown(event: React.KeyboardEvent) {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault()
      void save()
    }
  }

  const filled = rows.filter((row) => !isRowBlank(row))
  const total = filled.reduce(
    (sum, row) => sum + (parseMoneyInput(row.amount) ?? 0),
    0
  )
  const listId = payable ? "quick-suppliers" : "quick-clients"

  if (!paymentMethods || !incomeTypes) {
    return <PageSkeleton />
  }

  return (
    <PageStack onKeyDown={onGridKeyDown}>
      <PageHeader
        title={payable ? "Várias contas a pagar" : "Várias contas a receber"}
        description="Tab muda de célula. Enter desce para o nome da próxima linha. Ctrl+Enter lança o lote. A grade fica neste navegador até lançar ou limpar."
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const next = initialRows(defaults)
                writeQuickDraft(kind, defaults, next)
                setRows(next)
                setInvalid([])
              }}
            >
              Limpar
            </Button>
            <Button type="button" disabled={busy} onClick={() => void save()}>
              {filled.length > 0 ? `Lançar ${filled.length}` : "Lançar"}
            </Button>
          </>
        }
      />
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Dia padrão
          <Input
            type="date"
            value={defaults.date}
            aria-label="Dia padrão"
            className="w-40"
            onChange={(event) => updateDefaults({ date: event.target.value })}
          />
        </label>
        <label className="flex min-w-40 flex-col gap-1 text-xs text-muted-foreground">
          Tipo padrão
          <Select
            value={fallbackTypeId || undefined}
            onValueChange={(value) => updateDefaults({ typeId: value })}
          >
            <SelectTrigger aria-label="Tipo padrão" className="w-44">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent position="popper">
              {types.map((type) => (
                <SelectItem key={type.id} value={type.id}>
                  {type.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label className="flex min-w-40 flex-col gap-1 text-xs text-muted-foreground">
          Banco padrão
          <Select
            value={defaults.bankId ?? NONE}
            onValueChange={(value) =>
              updateDefaults({ bankId: value === NONE ? null : value })
            }
          >
            <SelectTrigger aria-label="Banco padrão" className="w-44">
              <SelectValue />
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
        </label>
        <label className="flex h-8 items-center gap-2 text-sm">
          <Switch
            checked={defaults.settled}
            onCheckedChange={(checked) => updateDefaults({ settled: checked })}
            aria-label={payable ? "Pagar já marcado" : "Receber já marcado"}
          />
          {payable ? "Pago" : "Recebido"}
        </label>
        <p className="ml-auto text-sm tabular-nums">
          {filled.length} {filled.length === 1 ? "linha" : "linhas"} ·{" "}
          {formatMoney(total, currency)}
        </p>
      </div>
      <p className="text-xs text-muted-foreground">
        Colar na grade usa o valor cheio: 100 ou 100,00 viram 100,00. Digitar no
        valor é centavo, como no banco: 100 vira 1,00 e 10000 vira 100,00. Nome
        igual a um cadastro vincula sozinho.
      </p>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">#</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Valor</TableHead>
              {payable ? <TableHead>NF</TableHead> : null}
              <TableHead>Obs</TableHead>
              <TableHead>Dia</TableHead>
              <TableHead>{payable ? "Fornecedor" : "Cliente"}</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Banco</TableHead>
              <TableHead>{payable ? "Pago" : "Recebido"}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, index) => {
              const bad = invalid.includes(row.key)
              return (
                <TableRow
                  key={row.key}
                  className={cn(bad && "bg-destructive/5")}
                >
                  <TableCell className="text-muted-foreground tabular-nums">
                    {index + 1}
                  </TableCell>
                  <TableCell className="min-w-48">
                    <input
                      className={cellClass}
                      aria-label={`Nome ${index + 1}`}
                      data-quick={row.key}
                      data-field="name"
                      list={listId}
                      value={row.name}
                      autoComplete="off"
                      onChange={(event) =>
                        patchRow(index, (current) =>
                          renameRow(current, event.target.value, visibleParties)
                        )
                      }
                      onKeyDown={onEnter(index)}
                      onPaste={(event) => {
                        const text = event.clipboardData.getData("text")
                        if (applyGrid(index, "name", text)) {
                          event.preventDefault()
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell className="min-w-36">
                    <MoneyInput
                      id={`quick-amount-${row.key}`}
                      currency={currency}
                      value={row.amount}
                      className="w-36"
                      dataQuick={row.key}
                      dataField="amount"
                      invalid={bad && (parseMoneyInput(row.amount) ?? 0) <= 0}
                      onChange={(value) =>
                        patchRow(index, (current) => ({
                          ...current,
                          amount: value,
                        }))
                      }
                      onEnter={() => goNext(index)}
                      onPasteText={(text) => {
                        if (applyGrid(index, "amount", text)) {
                          return true
                        }
                        patchRow(index, (current) => ({
                          ...current,
                          amount: formatQuickAmount(text),
                        }))
                        return true
                      }}
                    />
                  </TableCell>
                  {payable ? (
                    <TableCell className="min-w-28">
                      <input
                        className={cellClass}
                        aria-label={`NF ${index + 1}`}
                        value={row.invoice}
                        onChange={(event) =>
                          patchRow(index, (current) => ({
                            ...current,
                            invoice: event.target.value,
                          }))
                        }
                        onKeyDown={onEnter(index)}
                        onPaste={(event) => {
                          const text = event.clipboardData.getData("text")
                          if (applyGrid(index, "invoice", text)) {
                            event.preventDefault()
                          }
                        }}
                      />
                    </TableCell>
                  ) : null}
                  <TableCell className="min-w-36">
                    <input
                      className={cellClass}
                      aria-label={`Observação ${index + 1}`}
                      value={row.notes}
                      onChange={(event) =>
                        patchRow(index, (current) => ({
                          ...current,
                          notes: event.target.value,
                        }))
                      }
                      onKeyDown={onEnter(index)}
                      onPaste={(event) => {
                        const text = event.clipboardData.getData("text")
                        if (applyGrid(index, "notes", text)) {
                          event.preventDefault()
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <input
                      type="date"
                      className={cn(cellClass, "w-36")}
                      aria-label={`Dia ${index + 1}`}
                      value={row.date}
                      onChange={(event) =>
                        patchRow(index, (current) => ({
                          ...current,
                          date: event.target.value,
                        }))
                      }
                      onKeyDown={onEnter(index)}
                    />
                  </TableCell>
                  <TableCell>
                    <select
                      className={cn(cellClass, "w-40")}
                      aria-label={`Cadastro ${index + 1}`}
                      value={row.partyId ?? ""}
                      onChange={(event) =>
                        patchRow(index, (current) =>
                          assignParty(
                            current,
                            event.target.value || null,
                            visibleParties
                          )
                        )
                      }
                      onKeyDown={onEnter(index)}
                    >
                      <option value="">—</option>
                      {visibleParties.map((party) => (
                        <option key={party.id} value={party.id}>
                          {party.name}
                        </option>
                      ))}
                    </select>
                  </TableCell>
                  <TableCell>
                    <select
                      className={cn(cellClass, "w-36")}
                      aria-label={`Tipo ${index + 1}`}
                      value={row.typeId || fallbackTypeId}
                      onChange={(event) =>
                        patchRow(index, (current) => ({
                          ...current,
                          typeId: event.target.value,
                        }))
                      }
                      onKeyDown={onEnter(index)}
                    >
                      {types.length === 0 ? <option value="">—</option> : null}
                      {types.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.name}
                        </option>
                      ))}
                    </select>
                  </TableCell>
                  <TableCell>
                    <select
                      className={cn(cellClass, "w-36")}
                      aria-label={`Banco ${index + 1}`}
                      value={row.bankId ?? ""}
                      onChange={(event) =>
                        patchRow(index, (current) => ({
                          ...current,
                          bankId: event.target.value || null,
                        }))
                      }
                      onKeyDown={onEnter(index)}
                    >
                      <option value="">—</option>
                      {banks.map((bank) => (
                        <option key={bank.id} value={bank.id}>
                          {bank.name}
                        </option>
                      ))}
                    </select>
                  </TableCell>
                  <TableCell>
                    <input
                      type="checkbox"
                      className="size-4 accent-primary"
                      aria-label={
                        payable ? `Pago ${index + 1}` : `Recebido ${index + 1}`
                      }
                      checked={row.settled}
                      onChange={(event) =>
                        patchRow(index, (current) => ({
                          ...current,
                          settled: event.target.checked,
                        }))
                      }
                      onKeyDown={onEnter(index)}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Remover linha ${index + 1}`}
                      onClick={() => {
                        const next =
                          rows.length === 1
                            ? [blankRow(defaults)]
                            : rows.filter((item) => item.key !== row.key)
                        commit(next)
                      }}
                    >
                      <XIcon />
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
      <div>
        <Button
          type="button"
          variant="outline"
          onClick={() => commit([...rows, ...initialRows(defaults, 10)])}
        >
          <PlusIcon data-icon="inline-start" />
          Mais linhas
        </Button>
      </div>
      <datalist id={listId}>
        {visibleParties.map((party) => (
          <option key={party.id} value={party.name} />
        ))}
      </datalist>
    </PageStack>
  )
}
