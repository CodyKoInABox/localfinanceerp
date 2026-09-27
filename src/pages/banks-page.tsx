import * as React from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { LandmarkIcon, PlusIcon } from "lucide-react"
import { toast } from "sonner"

import { BankFormDialog } from "@/components/bank-form-dialog"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { EntityEmpty } from "@/components/entity-empty"
import { PageHeader, PageSkeleton, PageStack } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { db } from "@/lib/db"
import type { Bank } from "@/lib/schema"

export function BanksPage() {
  const banks = useLiveQuery(() => db.banks.orderBy("name").toArray())
  const payables = useLiveQuery(() => db.payables.toArray()) ?? []
  const receivables = useLiveQuery(() => db.receivables.toArray()) ?? []
  const investments = useLiveQuery(() => db.investments.toArray()) ?? []
  const [editing, setEditing] = React.useState<Bank | null>(null)
  const [creating, setCreating] = React.useState(false)
  const [pending, setPending] = React.useState<Bank | null>(null)

  if (!banks) {
    return <PageSkeleton />
  }

  async function remove(bank: Bank) {
    const used =
      payables.some((entry) => entry.bankId === bank.id) ||
      receivables.some((entry) => entry.bankId === bank.id) ||
      investments.some((entry) => entry.bankId === bank.id)
    if (used) {
      toast.error("Tem lançamento ou aplicação neste banco.")
      return
    }
    await db.banks.delete(bank.id)
    toast.success("Banco excluído.")
  }

  return (
    <PageStack>
      <PageHeader
        title="Bancos"
        description="CEF, Santander e os outros que você usa para pagar e receber."
        actions={
          <Button onClick={() => setCreating(true)}>
            <PlusIcon data-icon="inline-start" />
            Novo
          </Button>
        }
      />
      {banks.length === 0 ? (
        <EntityEmpty
          icon={LandmarkIcon}
          title="Nenhum banco"
          description="O banco é opcional no lançamento. Cadastre para filtrar de onde saiu e onde entrou."
          actionLabel="Cadastrar banco"
          onAction={() => setCreating(true)}
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Pagamentos</TableHead>
                <TableHead>Recebimentos</TableHead>
                <TableHead>Aplicações</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {banks.map((bank) => (
                <TableRow key={bank.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{bank.name}</span>
                      {bank.notes ? (
                        <span className="text-xs text-muted-foreground">
                          {bank.notes}
                        </span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    {
                      payables.filter((entry) => entry.bankId === bank.id)
                        .length
                    }
                  </TableCell>
                  <TableCell>
                    {
                      receivables.filter((entry) => entry.bankId === bank.id)
                        .length
                    }
                  </TableCell>
                  <TableCell>
                    {
                      investments.filter((entry) => entry.bankId === bank.id)
                        .length
                    }
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditing(bank)}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPending(bank)}
                    >
                      Excluir
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <BankFormDialog
        open={creating || editing != null}
        bank={editing}
        onOpenChange={(open) => {
          if (!open) {
            setCreating(false)
            setEditing(null)
          }
        }}
      />
      <ConfirmDialog
        open={pending != null}
        onOpenChange={(open) => {
          if (!open) {
            setPending(null)
          }
        }}
        title="Excluir banco"
        description="Só exclui se nada estiver vinculado."
        confirmLabel="Excluir"
        destructive
        onConfirm={() => {
          if (pending) {
            void remove(pending)
          }
        }}
      />
    </PageStack>
  )
}
