import * as React from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
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
  CSV_KINDS,
  CSV_SPECS,
  downloadText,
  templateCsv,
  type CsvKind,
} from "@/lib/csv"
import { importCsvText, type CsvImportResult } from "@/lib/csv-import"

export function CsvImportCard() {
  const [kind, setKind] = React.useState<CsvKind>("payables")
  const [result, setResult] = React.useState<CsvImportResult | null>(null)
  const fileRef = React.useRef<HTMLInputElement>(null)
  const spec = CSV_SPECS[kind]

  async function handleFile(file: File) {
    try {
      const text = await file.text()
      const imported = await importCsvText(kind, text)
      setResult(imported)
      const problem =
        imported.errors.length === 0
          ? ""
          : ` ${imported.errors.length} linha${imported.errors.length === 1 ? "" : "s"} com erro.`
      toast.success(
        `${imported.created} nova${imported.created === 1 ? "" : "s"}, ${imported.updated} atualizada${imported.updated === 1 ? "" : "s"}.${problem}`
      )
    } catch (error) {
      setResult(null)
      toast.error(
        error instanceof Error ? error.message : "Falha ao importar CSV."
      )
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Importar histórico (CSV)</CardTitle>
        <CardDescription>
          Planilha por tipo. Não apaga o que já está neste navegador. Com a
          coluna id, a mesma chave atualiza. Sem id, contas repetidas com o
          mesmo dia, nome, pessoa, valor, NF e parcela também atualizam.
          Fornecedor, cliente, banco e tipo que ainda não existem são criados.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={kind}
            onValueChange={(value) => {
              setKind(value as CsvKind)
              setResult(null)
            }}
          >
            <SelectTrigger className="w-full sm:w-72" aria-label="Tipo de CSV">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CSV_KINDS.map((item) => (
                <SelectItem key={item} value={item}>
                  {CSV_SPECS[item].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={() => downloadText(spec.filename, templateCsv(kind))}
          >
            Baixar modelo
          </Button>
          <Button onClick={() => fileRef.current?.click()}>Importar CSV</Button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv,text/plain"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ""
              if (file) {
                void handleFile(file)
              }
            }}
          />
        </div>
        <p className="text-sm text-muted-foreground">{spec.summary}</p>
        <ul className="flex flex-col gap-1 text-sm">
          {spec.columns.map((column) => (
            <li key={column.key}>
              <span className="font-medium">{column.header}</span>
              <span className="text-muted-foreground"> — {column.hint}</span>
            </li>
          ))}
        </ul>
        {result && result.errors.length > 0 ? (
          <ul className="flex flex-col gap-1 text-sm text-destructive">
            {result.errors.slice(0, 12).map((error) => (
              <li key={`${error.line}-${error.message}`}>
                Linha {error.line}: {error.message}
              </li>
            ))}
            {result.errors.length > 12 ? (
              <li>e mais {result.errors.length - 12}.</li>
            ) : null}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  )
}
