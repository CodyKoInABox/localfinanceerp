import { useLiveQuery } from "dexie-react-hooks"
import { LandmarkIcon } from "lucide-react"
import { Link } from "react-router"
import { toast } from "sonner"

import { MonthBars } from "@/components/charts"
import { EntityEmpty } from "@/components/entity-empty"
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
import { useCurrency } from "@/hooks/use-currency"
import { db } from "@/lib/db"
import {
  currentYear,
  formatCalendarDate,
  monthKey,
  todayIso,
} from "@/lib/dates"
import { labelOf } from "@/lib/lookups"
import { formatMoney, formatPercent } from "@/lib/money"
import { loadSampleData } from "@/lib/sample-data"
import {
  investmentPerformance,
  isOverdue,
  monthTotals,
  recentMonths,
  sumAmounts,
  totalsBy,
  type NamedTotal,
} from "@/lib/stats"
export function HomePage() {
  const currency = useCurrency()
  const payables = useLiveQuery(() => db.payables.toArray())
  const receivables = useLiveQuery(() => db.receivables.toArray())
  const parties = useLiveQuery(() => db.parties.toArray())
  const investments = useLiveQuery(() => db.investments.toArray())
  const valuations = useLiveQuery(() => db.valuations.toArray())
  const banks = useLiveQuery(() => db.banks.toArray())

  if (
    !payables ||
    !receivables ||
    !parties ||
    !investments ||
    !valuations ||
    !banks
  ) {
    return <PageSkeleton />
  }

  const today = todayIso()
  const month = monthKey(today)
  const year = currentYear()
  const openPayables = payables.filter((entry) => !entry.paid)
  const openReceivables = receivables.filter((entry) => !entry.received)
  const overduePayables = openPayables.filter((entry) =>
    isOverdue(entry.date, false, today)
  )
  const overdueReceivables = openReceivables.filter((entry) =>
    isOverdue(entry.date, false, today)
  )
  const paidMonth = payables.filter(
    (entry) => entry.paid && monthKey(entry.paidDate ?? entry.date) === month
  )
  const receivedMonth = receivables.filter(
    (entry) =>
      entry.received && monthKey(entry.receivedDate ?? entry.date) === month
  )
  const points = monthTotals(
    recentMonths(6, today),
    payables,
    receivables,
    "settled"
  )
  const bySupplier = totalsBy(
    payables
      .filter((entry) => entry.paid)
      .map((entry) => ({
        key: entry.partyId ?? `name:${entry.name.trim().toLowerCase()}`,
        name: entry.partyId
          ? labelOf(parties, entry.partyId, entry.name)
          : entry.name,
        amount: entry.amount,
      }))
  ).slice(0, 5)
  const byClient = totalsBy(
    receivables
      .filter((entry) => entry.received)
      .map((entry) => ({
        key: entry.partyId ?? `name:${entry.name.trim().toLowerCase()}`,
        name: entry.partyId
          ? labelOf(parties, entry.partyId, entry.name)
          : entry.name,
        amount: entry.amount,
      }))
  ).slice(0, 5)
  const performances = investments.map((investment) =>
    investmentPerformance(investment, valuations, year)
  )
  const portfolio = sumAmounts(performances.map((row) => row.latest ?? 0))
  const empty =
    payables.length === 0 &&
    receivables.length === 0 &&
    investments.length === 0 &&
    parties.length === 0 &&
    banks.length === 0

  const upcoming = [...openPayables]
    .filter((entry) => entry.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 6)

  return (
    <PageStack>
      <PageHeader
        title="Início"
        description="O que está em aberto, o que já passou no caixa e como estão as aplicações."
        actions={
          empty ? (
            <Button
              variant="outline"
              onClick={() => {
                void loadSampleData().then(() =>
                  toast.success("Exemplo carregado neste navegador.")
                )
              }}
            >
              Carregar exemplo
            </Button>
          ) : null
        }
      />
      {empty ? (
        <EntityEmpty
          icon={LandmarkIcon}
          title="Nada lançado neste navegador"
          description="Cadastre um banco, um fornecedor e a primeira conta. Os dados ficam só aqui até você exportar."
          actionLabel="Lançar conta a pagar"
          actionTo="/pagar"
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi
              label="A pagar em aberto"
              value={formatMoney(
                sumAmounts(openPayables.map((e) => e.amount)),
                currency
              )}
              hint={
                overduePayables.length
                  ? `${overduePayables.length} atrasada${overduePayables.length === 1 ? "" : "s"}`
                  : "Nada atrasado"
              }
              to="/pagar?status=open"
            />
            <Kpi
              label="A receber em aberto"
              value={formatMoney(
                sumAmounts(openReceivables.map((e) => e.amount)),
                currency
              )}
              hint={
                overdueReceivables.length
                  ? `${overdueReceivables.length} atrasada${overdueReceivables.length === 1 ? "" : "s"}`
                  : "Nada atrasado"
              }
              to="/receber?status=open"
            />
            <Kpi
              label="Saldo do mês"
              value={formatMoney(
                sumAmounts(receivedMonth.map((e) => e.amount)) -
                  sumAmounts(paidMonth.map((e) => e.amount)),
                currency
              )}
              hint={`Pago ${formatMoney(sumAmounts(paidMonth.map((e) => e.amount)), currency)} · recebido ${formatMoney(sumAmounts(receivedMonth.map((e) => e.amount)), currency)}`}
              to="/relatorios"
            />
            <Kpi
              label="Aplicações agora"
              value={formatMoney(portfolio, currency)}
              hint="Soma do último valor de cada uma"
              to="/investimentos"
            />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Caixa dos últimos 6 meses</CardTitle>
                <CardDescription>
                  Pelo dia em que foi pago ou recebido.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MonthBars points={points} currency={currency} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Próximos pagamentos</CardTitle>
                <CardDescription>
                  Contas em aberto a partir de hoje.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {upcoming.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhum vencimento futuro em aberto.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {upcoming.map((entry) => (
                      <li key={entry.id}>
                        <Link
                          to="/pagar?status=open"
                          className="flex items-center justify-between gap-3 text-sm hover:underline"
                        >
                          <span className="min-w-0 truncate">
                            {formatCalendarDate(entry.date)} · {entry.name}
                          </span>
                          <span className="shrink-0 tabular-nums">
                            {formatMoney(entry.amount, currency)}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
            <RankCard
              title="Gasto por fornecedor"
              description="Só o que já foi pago."
              rows={bySupplier}
              currency={currency}
              empty="Nenhum pagamento ainda."
            />
            <RankCard
              title="Entrada por cliente"
              description="Só o que já entrou."
              rows={byClient}
              currency={currency}
              empty="Nenhum recebimento ainda."
            />
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Aplicações</CardTitle>
              <CardDescription>
                Resultado contra o valor aplicado.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {performances.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma aplicação cadastrada.
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {performances.map((row) => (
                    <li key={row.investment.id}>
                      <Link
                        to={`/investimentos/${row.investment.id}`}
                        className="flex flex-wrap items-center justify-between gap-2 text-sm hover:underline"
                      >
                        <span className="font-medium">
                          {row.investment.name}
                        </span>
                        <span className="flex items-center gap-2 tabular-nums">
                          {row.latest == null
                            ? "Sem valor"
                            : formatMoney(row.latest, currency)}
                          {row.percent != null ? (
                            <Badge
                              variant={
                                row.percent >= 0 ? "secondary" : "destructive"
                              }
                            >
                              {formatPercent(row.percent)}
                            </Badge>
                          ) : null}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </PageStack>
  )
}

function Kpi({
  label,
  value,
  hint,
  to,
}: {
  label: string
  value: string
  hint: string
  to: string
}) {
  return (
    <Link
      to={to}
      className="block rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <Card className="h-full">
        <CardHeader>
          <CardDescription>{label}</CardDescription>
          <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          {hint}
        </CardContent>
      </Card>
    </Link>
  )
}

function RankCard({
  title,
  description,
  rows,
  currency,
  empty,
}: {
  title: string
  description: string
  rows: NamedTotal[]
  currency: string
  empty: string
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{empty}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {rows.map((row) => (
              <li
                key={row.id}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="min-w-0 truncate">
                  {row.name}{" "}
                  <span className="text-muted-foreground">({row.count})</span>
                </span>
                <span className="shrink-0 tabular-nums">
                  {formatMoney(row.total, currency)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
