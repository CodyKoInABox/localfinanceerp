import * as React from "react"
import { useLiveQuery } from "dexie-react-hooks"

import { MonthBars } from "@/components/charts"
import { PageHeader, PageSkeleton, PageStack } from "@/components/page-header"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useCurrency } from "@/hooks/use-currency"
import { db } from "@/lib/db"
import { currentYear, formatMonthLabel, yearOf } from "@/lib/dates"
import { labelOf } from "@/lib/lookups"
import { formatMoney, formatPercent } from "@/lib/money"
import type { Payable, Receivable } from "@/lib/schema"
import {
  investmentPerformance,
  monthTotals,
  monthsOfYear,
  payableWhen,
  receivableWhen,
  totalsBy,
  type Basis,
  type NamedTotal,
} from "@/lib/stats"

export function ReportsPage() {
  const currency = useCurrency()
  const payables = useLiveQuery(() => db.payables.toArray())
  const receivables = useLiveQuery(() => db.receivables.toArray())
  const parties = useLiveQuery(() => db.parties.toArray())
  const banks = useLiveQuery(() => db.banks.toArray())
  const methods = useLiveQuery(() => db.paymentMethods.toArray())
  const incomeTypes = useLiveQuery(() => db.incomeTypes.toArray())
  const investments = useLiveQuery(() => db.investments.toArray())
  const valuations = useLiveQuery(() => db.valuations.toArray())
  const [basis, setBasis] = React.useState<Basis>("settled")
  const [year, setYear] = React.useState(String(currentYear()))

  if (
    !payables ||
    !receivables ||
    !parties ||
    !banks ||
    !methods ||
    !incomeTypes ||
    !investments ||
    !valuations
  ) {
    return <PageSkeleton />
  }

  const years = collectYears(payables, receivables)
  const selected = Number(year)
  const months = monthsOfYear(selected)
  const points = monthTotals(months, payables, receivables, basis)
  const inYear = (when: string | null) =>
    when != null && yearOf(when) === selected

  const paidRows = payables.flatMap((entry) => {
    const when = payableWhen(entry, basis)
    if (!inYear(when) || !when) {
      return []
    }
    return [
      {
        key: entry.partyId ?? `name:${entry.name.trim().toLowerCase()}`,
        name: entry.partyId
          ? labelOf(parties, entry.partyId, entry.name)
          : entry.name,
        amount: entry.amount,
        typeKey: entry.paymentMethodId,
        typeName: labelOf(methods, entry.paymentMethodId, "Sem tipo"),
        bankKey: entry.bankId ?? "none",
        bankName: labelOf(banks, entry.bankId, "Sem banco"),
      },
    ]
  })
  const receivedRows = receivables.flatMap((entry) => {
    const when = receivableWhen(entry, basis)
    if (!inYear(when) || !when) {
      return []
    }
    return [
      {
        key: entry.partyId ?? `name:${entry.name.trim().toLowerCase()}`,
        name: entry.partyId
          ? labelOf(parties, entry.partyId, entry.name)
          : entry.name,
        amount: entry.amount,
        typeKey: entry.incomeTypeId,
        typeName: labelOf(incomeTypes, entry.incomeTypeId, "Sem tipo"),
        bankKey: entry.bankId ?? "none",
        bankName: labelOf(banks, entry.bankId, "Sem banco"),
      },
    ]
  })

  const performances = investments.map((investment) =>
    investmentPerformance(investment, valuations, selected)
  )

  return (
    <PageStack>
      <PageHeader
        title="Relatórios"
        description="Gasto por mês e fornecedor, entrada por cliente e o rendimento das aplicações."
        actions={
          <>
            <ToggleGroup
              type="single"
              value={basis}
              onValueChange={(value) => {
                if (value === "settled" || value === "competence") {
                  setBasis(value)
                }
              }}
            >
              <ToggleGroupItem value="settled">Realizado</ToggleGroupItem>
              <ToggleGroupItem value="competence">Competência</ToggleGroupItem>
            </ToggleGroup>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="w-28" aria-label="Ano">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((item) => (
                  <SelectItem key={item} value={String(item)}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>Por mês</CardTitle>
          <CardDescription>
            {basis === "settled"
              ? "Usa a data de pagamento ou recebimento."
              : "Usa o dia do lançamento, pago ou não."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <MonthBars points={points} currency={currency} />
          <SimpleTable
            columns={["Mês", "Pago", "Recebido", "Saldo"]}
            rows={points.map((point) => ({
              id: point.month,
              cells: [
                formatMonthLabel(point.month),
                formatMoney(point.paid, currency),
                formatMoney(point.received, currency),
                formatMoney(point.received - point.paid, currency),
              ],
            }))}
          />
        </CardContent>
      </Card>
      <div className="grid gap-4 xl:grid-cols-2">
        <TotalCard
          title="Gasto por fornecedor"
          rows={totalsBy(paidRows)}
          currency={currency}
        />
        <TotalCard
          title="Entrada por cliente"
          rows={totalsBy(receivedRows)}
          currency={currency}
        />
        <TotalCard
          title="Gasto por tipo"
          rows={totalsBy(
            paidRows.map((row) => ({
              key: row.typeKey,
              name: row.typeName,
              amount: row.amount,
            }))
          )}
          currency={currency}
        />
        <TotalCard
          title="Entrada por tipo"
          rows={totalsBy(
            receivedRows.map((row) => ({
              key: row.typeKey,
              name: row.typeName,
              amount: row.amount,
            }))
          )}
          currency={currency}
        />
        <TotalCard
          title="Saídas por banco"
          description="Soma do que foi lançado, não o saldo da conta."
          rows={totalsBy(
            paidRows.map((row) => ({
              key: row.bankKey,
              name: row.bankName,
              amount: row.amount,
            }))
          )}
          currency={currency}
        />
        <TotalCard
          title="Entradas por banco"
          description="Soma do que foi lançado, não o saldo da conta."
          rows={totalsBy(
            receivedRows.map((row) => ({
              key: row.bankKey,
              name: row.bankName,
              amount: row.amount,
            }))
          )}
          currency={currency}
        />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Performance das aplicações</CardTitle>
          <CardDescription>
            Resultado é o valor atual menos o aplicado. A variação do ano
            compara o último valor do ano com o último de antes dele.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {performances.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma aplicação.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Aplicado</TableHead>
                    <TableHead>Atual</TableHead>
                    <TableHead>Resultado</TableHead>
                    <TableHead>%</TableHead>
                    <TableHead>No ano</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {performances.map((row) => (
                    <TableRow key={row.investment.id}>
                      <TableCell>{row.investment.name}</TableCell>
                      <TableCell className="tabular-nums">
                        {formatMoney(row.investment.contributed, currency)}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {row.latest == null
                          ? "—"
                          : formatMoney(row.latest, currency)}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {row.gain == null
                          ? "—"
                          : formatMoney(row.gain, currency)}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {row.percent == null ? "—" : formatPercent(row.percent)}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {row.yearChange == null
                          ? "—"
                          : formatMoney(row.yearChange, currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </PageStack>
  )
}

function collectYears(
  payables: Payable[],
  receivables: Receivable[]
): number[] {
  const years = new Set<number>([currentYear()])
  for (const entry of payables) {
    years.add(yearOf(entry.date))
    if (entry.paidDate) {
      years.add(yearOf(entry.paidDate))
    }
  }
  for (const entry of receivables) {
    years.add(yearOf(entry.date))
    if (entry.receivedDate) {
      years.add(yearOf(entry.receivedDate))
    }
  }
  return [...years].sort((a, b) => b - a)
}

function TotalCard({
  title,
  description,
  rows,
  currency,
}: {
  title: string
  description?: string
  rows: NamedTotal[]
  currency: string
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Sem movimento nesse ano.
          </p>
        ) : (
          <SimpleTable
            columns={["Nome", "Qtd", "Total"]}
            rows={rows.map((row) => ({
              id: row.id,
              cells: [
                row.name,
                String(row.count),
                formatMoney(row.total, currency),
              ],
            }))}
          />
        )}
      </CardContent>
    </Card>
  )
}

function SimpleTable({
  columns,
  rows,
}: {
  columns: string[]
  rows: { id: string; cells: string[] }[]
}) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column}>{column}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              {row.cells.map((cell, index) => (
                <TableCell key={`${row.id}-${index}`} className="tabular-nums">
                  {cell}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
