import { formatMonthLabel } from "@/lib/dates"
import { formatMoney } from "@/lib/money"
import type { MonthPoint } from "@/lib/stats"

export function MonthBars({
  points,
  currency,
}: {
  points: MonthPoint[]
  currency: string
}) {
  const max = Math.max(
    1,
    ...points.map((point) => Math.max(point.paid, point.received))
  )

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-end gap-2">
        {points.map((point) => (
          <div
            key={point.month}
            className="flex min-w-0 flex-1 flex-col items-center gap-1"
          >
            <div className="flex h-32 w-full items-end justify-center gap-1">
              <div
                className="w-2 rounded-sm bg-rose-500/80 sm:w-2.5"
                style={{ height: `${(point.paid / max) * 100}%` }}
                title={`Pago ${formatMoney(point.paid, currency)}`}
              />
              <div
                className="w-2 rounded-sm bg-emerald-500/80 sm:w-2.5"
                style={{ height: `${(point.received / max) * 100}%` }}
                title={`Recebido ${formatMoney(point.received, currency)}`}
              />
            </div>
            <span className="truncate text-[10px] text-muted-foreground">
              {formatMonthLabel(point.month).replace(".", "")}
            </span>
          </div>
        ))}
      </div>
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-sm bg-rose-500/80" />
          Pago
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-sm bg-emerald-500/80" />
          Recebido
        </span>
      </div>
    </div>
  )
}

export function ValueLine({ values }: { values: number[] }) {
  if (values.length < 2) {
    return (
      <p className="text-sm text-muted-foreground">
        Lance pelo menos dois valores para ver a curva.
      </p>
    )
  }
  const min = Math.min(...values)
  const max = Math.max(...values)
  const width = 320
  const height = 96
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width
      const y =
        max === min
          ? height / 2
          : height - 8 - ((value - min) / (max - min)) * (height - 16)
      return `${x},${y}`
    })
    .join(" ")
  const up = (values.at(-1) ?? 0) >= (values[0] ?? 0)

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-24 w-full"
      role="img"
      aria-label="Evolução do valor"
    >
      <polyline
        fill="none"
        stroke={up ? "#10b981" : "#f43f5e"}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points}
      />
    </svg>
  )
}
