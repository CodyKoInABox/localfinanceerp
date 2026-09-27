import * as React from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { toast } from "sonner"

import { AppCredit } from "@/components/app-credit"
import { BrandMark } from "@/components/brand-mark"
import { CatalogEditor } from "@/components/catalog-editor"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { PageHeader, PageSkeleton, PageStack } from "@/components/page-header"
import { useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { APP_NAME } from "@/lib/brand"
import { CURRENCY_OPTIONS, SETTINGS_ID } from "@/lib/constants"
import { todayIso } from "@/lib/dates"
import { db, wipeAllData } from "@/lib/db"
import { createId } from "@/lib/ids"
import {
  buildExportPayload,
  downloadJson,
  importMerge,
  importReplace,
  parseExportPayload,
  readJsonFile,
} from "@/lib/import-export"
import { loadSampleData } from "@/lib/sample-data"
import type { CatalogItem } from "@/lib/schema"

export function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const settings = useLiveQuery(() => db.settings.get(SETTINGS_ID))
  const paymentMethods =
    useLiveQuery(() => db.paymentMethods.orderBy("order").toArray()) ?? []
  const incomeTypes =
    useLiveQuery(() => db.incomeTypes.orderBy("order").toArray()) ?? []
  const investmentTypes =
    useLiveQuery(() => db.investmentTypes.orderBy("order").toArray()) ?? []
  const payables = useLiveQuery(() => db.payables.toArray()) ?? []
  const receivables = useLiveQuery(() => db.receivables.toArray()) ?? []
  const investments = useLiveQuery(() => db.investments.toArray()) ?? []
  const [replaceOpen, setReplaceOpen] = React.useState(false)
  const [wipeOpen, setWipeOpen] = React.useState(false)
  const [sampleOpen, setSampleOpen] = React.useState(false)
  const [pendingReplace, setPendingReplace] = React.useState<File | null>(null)
  const replaceRef = React.useRef<HTMLInputElement>(null)
  const mergeRef = React.useRef<HTMLInputElement>(null)

  if (!settings) {
    return <PageSkeleton />
  }

  async function handleExport() {
    const payload = await buildExportPayload()
    downloadJson(`local-finance-${todayIso()}.json`, payload)
    toast.success("Exportação baixada.")
  }

  async function handleMerge(file: File) {
    try {
      const payload = parseExportPayload(await readJsonFile(file))
      await importMerge(payload)
      toast.success("Mesclado por id.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao importar.")
    }
  }

  async function handleReplace() {
    if (!pendingReplace) {
      return
    }
    try {
      const payload = parseExportPayload(await readJsonFile(pendingReplace))
      await importReplace(payload)
      toast.success("Base substituída.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao importar.")
    } finally {
      setPendingReplace(null)
    }
  }

  async function addCatalog(
    table: "paymentMethods" | "incomeTypes" | "investmentTypes",
    items: CatalogItem[],
    name: string
  ) {
    await db[table].add({ id: createId(), name, order: items.length })
  }

  async function renameCatalog(
    table: "paymentMethods" | "incomeTypes" | "investmentTypes",
    id: string,
    name: string
  ) {
    await db[table].update(id, { name })
  }

  async function deleteCatalog(
    table: "paymentMethods" | "incomeTypes" | "investmentTypes",
    items: CatalogItem[],
    id: string,
    used: boolean
  ) {
    if (items.length <= 1) {
      toast.error("Deixe pelo menos um tipo.")
      return
    }
    if (used) {
      toast.error("Esse tipo está em uso.")
      return
    }
    await db[table].delete(id)
  }

  return (
    <PageStack>
      <PageHeader
        title="Configurações"
        description="Moeda de exibição, tipos e a cópia dos dados entre navegadores."
      />
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <BrandMark />
            <div>
              <CardTitle>{APP_NAME}</CardTitle>
              <CardDescription>ERP financeiro neste navegador.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <AppCredit />
        </CardContent>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Moeda</CardTitle>
            <CardDescription>
              Só muda a exibição. Os valores ficam como número.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Field>
              <FieldLabel>Moeda padrão</FieldLabel>
              <Select
                value={settings.currency}
                onValueChange={(value) => {
                  void db.settings.put({ ...settings, currency: value })
                }}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {CURRENCY_OPTIONS.map((code) => (
                      <SelectItem key={code} value={code}>
                        {code}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Tema</CardTitle>
            <CardDescription>Começa no tema do sistema.</CardDescription>
          </CardHeader>
          <CardContent>
            <ToggleGroup
              type="single"
              value={theme}
              onValueChange={(value) => {
                if (
                  value === "light" ||
                  value === "dark" ||
                  value === "system"
                ) {
                  setTheme(value)
                }
              }}
            >
              <ToggleGroupItem value="system">Sistema</ToggleGroupItem>
              <ToggleGroupItem value="light">Claro</ToggleGroupItem>
              <ToggleGroupItem value="dark">Escuro</ToggleGroupItem>
            </ToggleGroup>
          </CardContent>
        </Card>
      </div>
      <CatalogEditor
        title="Tipos de pagamento"
        description="Boleto, PIX CNPJ, PIX QR Code e o que mais você usar nas contas a pagar."
        items={paymentMethods}
        onAdd={(name) => addCatalog("paymentMethods", paymentMethods, name)}
        onRename={(id, name) => renameCatalog("paymentMethods", id, name)}
        onDelete={(id) =>
          deleteCatalog(
            "paymentMethods",
            paymentMethods,
            id,
            payables.some((entry) => entry.paymentMethodId === id)
          )
        }
      />
      <CatalogEditor
        title="Tipos de entrada"
        description="Serviço, venda, salário — o tipo das contas a receber."
        items={incomeTypes}
        onAdd={(name) => addCatalog("incomeTypes", incomeTypes, name)}
        onRename={(id, name) => renameCatalog("incomeTypes", id, name)}
        onDelete={(id) =>
          deleteCatalog(
            "incomeTypes",
            incomeTypes,
            id,
            receivables.some((entry) => entry.incomeTypeId === id)
          )
        }
      />
      <CatalogEditor
        title="Tipos de investimento"
        description="Renda fixa, tesouro, fundo e os seus."
        items={investmentTypes}
        onAdd={(name) => addCatalog("investmentTypes", investmentTypes, name)}
        onRename={(id, name) => renameCatalog("investmentTypes", id, name)}
        onDelete={(id) =>
          deleteCatalog(
            "investmentTypes",
            investmentTypes,
            id,
            investments.some((entry) => entry.typeId === id)
          )
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>Dados</CardTitle>
          <CardDescription>
            Tudo fica no IndexedDB deste navegador. Exporte o JSON para levar a
            outro computador. Importar não envia nada para servidor.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button onClick={() => void handleExport()}>Exportar JSON</Button>
          <Button variant="outline" onClick={() => mergeRef.current?.click()}>
            Mesclar arquivo
          </Button>
          <Button variant="outline" onClick={() => replaceRef.current?.click()}>
            Substituir tudo
          </Button>
          <Button variant="outline" onClick={() => setSampleOpen(true)}>
            Carregar exemplo
          </Button>
          <Button variant="destructive" onClick={() => setWipeOpen(true)}>
            Apagar tudo
          </Button>
          <input
            ref={mergeRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ""
              if (file) {
                void handleMerge(file)
              }
            }}
          />
          <input
            ref={replaceRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ""
              if (file) {
                setPendingReplace(file)
                setReplaceOpen(true)
              }
            }}
          />
        </CardContent>
      </Card>
      <ConfirmDialog
        open={replaceOpen}
        onOpenChange={setReplaceOpen}
        title="Substituir a base"
        description="Apaga o que está neste navegador e carrega o arquivo."
        confirmLabel="Substituir"
        destructive
        onConfirm={() => void handleReplace()}
      />
      <ConfirmDialog
        open={wipeOpen}
        onOpenChange={setWipeOpen}
        title="Apagar tudo"
        description="Zera lançamentos, cadastros e histórico. Os tipos padrão voltam."
        confirmLabel="Apagar"
        destructive
        onConfirm={() => {
          void wipeAllData().then(() => toast.success("Base apagada."))
        }}
      />
      <ConfirmDialog
        open={sampleOpen}
        onOpenChange={setSampleOpen}
        title="Carregar exemplo"
        description="Grava bancos, pessoas, contas e aplicações de demonstração. Lançamentos seus com outro id continuam."
        confirmLabel="Carregar"
        onConfirm={() => {
          void loadSampleData().then(() => toast.success("Exemplo carregado."))
        }}
      />
    </PageStack>
  )
}
