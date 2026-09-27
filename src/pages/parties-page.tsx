import * as React from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { PlusIcon, UsersIcon } from "lucide-react"
import { Link } from "react-router"
import { toast } from "sonner"

import { ConfirmDialog } from "@/components/confirm-dialog"
import { EntityEmpty } from "@/components/entity-empty"
import { PageHeader, PageSkeleton, PageStack } from "@/components/page-header"
import { PartyFormDialog } from "@/components/party-form-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { db } from "@/lib/db"
import type { Party, PartyRole } from "@/lib/schema"

export function PartiesPage({ role }: { role: PartyRole }) {
  const parties = useLiveQuery(() => db.parties.orderBy("name").toArray())
  const payables = useLiveQuery(() => db.payables.toArray()) ?? []
  const receivables = useLiveQuery(() => db.receivables.toArray()) ?? []
  const [query, setQuery] = React.useState("")
  const [editing, setEditing] = React.useState<Party | null>(null)
  const [creating, setCreating] = React.useState(false)
  const [pending, setPending] = React.useState<Party | null>(null)

  if (!parties) {
    return <PageSkeleton />
  }

  const supplier = role === "supplier"
  const visible = parties.filter((party) => {
    if (!party.roles.includes(role)) {
      return false
    }
    const needle = query.trim().toLowerCase()
    if (!needle) {
      return true
    }
    return [party.name, party.document, party.email, party.phone, party.notes]
      .join(" ")
      .toLowerCase()
      .includes(needle)
  })

  async function remove(party: Party) {
    const used =
      payables.some((entry) => entry.partyId === party.id) ||
      receivables.some((entry) => entry.partyId === party.id)
    if (used) {
      toast.error("Tem lançamento vinculado. Desvincule antes de excluir.")
      return
    }
    await db.parties.delete(party.id)
    toast.success("Cadastro excluído.")
  }

  return (
    <PageStack>
      <PageHeader
        title={supplier ? "Fornecedores" : "Clientes"}
        description={
          supplier
            ? "Quem recebe nas contas a pagar."
            : "Quem manda nas contas a receber."
        }
        actions={
          <Button onClick={() => setCreating(true)}>
            <PlusIcon data-icon="inline-start" />
            Novo
          </Button>
        }
      />
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscar"
        aria-label="Buscar"
        className="max-w-xs"
      />
      {parties.filter((party) => party.roles.includes(role)).length === 0 ? (
        <EntityEmpty
          icon={UsersIcon}
          title={supplier ? "Nenhum fornecedor" : "Nenhum cliente"}
          description="O vínculo é opcional no lançamento, mas o resumo por pessoa fica melhor com cadastro."
          actionLabel="Cadastrar"
          onAction={() => setCreating(true)}
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Lançamentos</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((party) => {
                const count = supplier
                  ? payables.filter((entry) => entry.partyId === party.id)
                      .length
                  : receivables.filter((entry) => entry.partyId === party.id)
                      .length
                return (
                  <TableRow key={party.id}>
                    <TableCell className="font-medium">{party.name}</TableCell>
                    <TableCell>{party.document || "—"}</TableCell>
                    <TableCell>
                      {[party.email, party.phone].filter(Boolean).join(" · ") ||
                        "—"}
                    </TableCell>
                    <TableCell>
                      <Link
                        className="hover:underline"
                        to={
                          supplier
                            ? `/pagar?pessoa=${party.id}`
                            : `/receber?pessoa=${party.id}`
                        }
                      >
                        {count}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditing(party)}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPending(party)}
                      >
                        Excluir
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
      <PartyFormDialog
        open={creating || editing != null}
        role={role}
        party={editing}
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
        title="Excluir cadastro"
        description="Só exclui se não houver conta vinculada."
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
