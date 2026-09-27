import { useLiveQuery } from "dexie-react-hooks"
import { PlusIcon, TrendingUpIcon } from "lucide-react"
import { Link } from "react-router"

import { useCreate } from "@/components/create-provider"
import { EntityEmpty } from "@/components/entity-empty"
import { PageHeader, PageSkeleton, PageStack } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import { currentYear } from "@/lib/dates"
import { labelOf } from "@/lib/lookups"
import { formatMoney, formatPercent } from "@/lib/money"
import { investmentPerformance, sumAmounts } from "@/lib/stats"

export function InvestmentsPage() {
  const currency = useCurrency()
  const { openCreate } = useCreate()
  const investments = useLiveQuery(() =>
    db.investments.orderBy("name").toArray()
  )
  const valuations = useLiveQuery(() => db.valuations.toArray())
  const types = useLiveQuery(() => db.investmentTypes.toArray()) ?? []
  const banks = useLiveQuery(() => db.banks.toArray()) ?? []

  if (!investments || !valuations) {
    return <PageSkeleton />
  }

  const year = currentYear()
  const rows = investments.map((investment) =>
    investmentPerformance(investment, valuations, year)
  )
  const total = sumAmounts(rows.map((row) => row.latest ?? 0))
  const applied = sumAmounts(rows.map((row) => row.investment.contributed))

  return (
    <PageStack>
      <PageHeader
        title="Investimentos"
        description="Cadastre a aplicação e vá atualizando o valor ao longo do tempo."
        actions={
          <Button onClick={() => openCreate("investment")}>
            <PlusIcon data-icon="inline-start" />
            Nova
          </Button>
        }
      />
      {investments.length === 0 ? (
        <EntityEmpty
          icon={TrendingUpIcon}
          title="Nenhuma aplicação"
          description="CDB, tesouro, fundo — o histórico de valor fica neste navegador."
          actionLabel="Cadastrar aplicação"
          onAction={() => openCreate("investment")}
        />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Aplicado {formatMoney(applied, currency)} · agora{" "}
            {formatMoney(total, currency)} · resultado{" "}
            {formatMoney(total - applied, currency)}
          </p>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Banco</TableHead>
                  <TableHead>Aplicado</TableHead>
                  <TableHead>Atual</TableHead>
                  <TableHead>Resultado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.investment.id}>
                    <TableCell>
                      <Link
                        to={`/investimentos/${row.investment.id}`}
                        className="font-medium hover:underline"
                      >
                        {row.investment.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {labelOf(types, row.investment.typeId)}
                    </TableCell>
                    <TableCell>
                      {labelOf(banks, row.investment.bankId, "—")}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {formatMoney(row.investment.contributed, currency)}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {row.latest == null
                        ? "—"
                        : formatMoney(row.latest, currency)}
                    </TableCell>
                    <TableCell>
                      {row.gain == null ? (
                        "—"
                      ) : (
                        <span className="inline-flex items-center gap-2 tabular-nums">
                          {formatMoney(row.gain, currency)}
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
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </PageStack>
  )
}
