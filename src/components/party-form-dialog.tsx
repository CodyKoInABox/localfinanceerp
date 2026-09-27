import * as React from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { db } from "@/lib/db"
import { nowIso } from "@/lib/dates"
import { createId } from "@/lib/ids"
import type { Party, PartyRole } from "@/lib/schema"

type Draft = {
  name: string
  supplier: boolean
  client: boolean
  document: string
  email: string
  phone: string
  notes: string
}

function draftFrom(party: Party | null, role: PartyRole): Draft {
  return {
    name: party?.name ?? "",
    supplier: party ? party.roles.includes("supplier") : role === "supplier",
    client: party ? party.roles.includes("client") : role === "client",
    document: party?.document ?? "",
    email: party?.email ?? "",
    phone: party?.phone ?? "",
    notes: party?.notes ?? "",
  }
}

export function PartyFormDialog({
  open,
  onOpenChange,
  role,
  party = null,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  role: PartyRole
  party?: Party | null
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {open ? (
          <PartyForm
            key={party?.id ?? `new-${role}`}
            role={role}
            party={party}
            onOpenChange={onOpenChange}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function PartyForm({
  role,
  party,
  onOpenChange,
}: {
  role: PartyRole
  party: Party | null
  onOpenChange: (open: boolean) => void
}) {
  const [draft, setDraft] = React.useState(() => draftFrom(party, role))
  const title = party
    ? "Editar cadastro"
    : role === "supplier"
      ? "Novo fornecedor"
      : "Novo cliente"

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const name = draft.name.trim()
    const roles: PartyRole[] = [
      ...(draft.supplier ? (["supplier"] as const) : []),
      ...(draft.client ? (["client"] as const) : []),
    ]
    if (!name) {
      toast.error("Informe o nome.")
      return
    }
    if (roles.length === 0) {
      toast.error("Marque fornecedor, cliente ou os dois.")
      return
    }
    const now = nowIso()
    const next: Party = {
      id: party?.id ?? createId(),
      name,
      roles,
      document: draft.document.trim(),
      email: draft.email.trim(),
      phone: draft.phone.trim(),
      notes: draft.notes.trim(),
      createdAt: party?.createdAt ?? now,
      updatedAt: now,
    }
    await db.parties.put(next)
    toast.success(party ? "Cadastro atualizado." : "Cadastro salvo.")
    onOpenChange(false)
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)}>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>
          A mesma pessoa pode ser fornecedor e cliente.
        </DialogDescription>
      </DialogHeader>
      <FieldGroup className="py-4">
        <Field>
          <FieldLabel htmlFor="party-name">Nome</FieldLabel>
          <Input
            id="party-name"
            value={draft.name}
            onChange={(event) =>
              setDraft((current) => ({ ...current, name: event.target.value }))
            }
            required
          />
        </Field>
        <div className="flex flex-wrap gap-4">
          <Field orientation="horizontal" className="w-auto">
            <Checkbox
              id="party-supplier"
              checked={draft.supplier}
              onCheckedChange={(checked) =>
                setDraft((current) => ({
                  ...current,
                  supplier: checked === true,
                }))
              }
            />
            <FieldLabel htmlFor="party-supplier" className="font-normal">
              Fornecedor
            </FieldLabel>
          </Field>
          <Field orientation="horizontal" className="w-auto">
            <Checkbox
              id="party-client"
              checked={draft.client}
              onCheckedChange={(checked) =>
                setDraft((current) => ({
                  ...current,
                  client: checked === true,
                }))
              }
            />
            <FieldLabel htmlFor="party-client" className="font-normal">
              Cliente
            </FieldLabel>
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="party-doc">CPF / CNPJ</FieldLabel>
            <Input
              id="party-doc"
              value={draft.document}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  document: event.target.value,
                }))
              }
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="party-phone">Telefone</FieldLabel>
            <Input
              id="party-phone"
              value={draft.phone}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  phone: event.target.value,
                }))
              }
            />
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="party-email">E-mail</FieldLabel>
          <Input
            id="party-email"
            type="email"
            value={draft.email}
            onChange={(event) =>
              setDraft((current) => ({ ...current, email: event.target.value }))
            }
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="party-notes">Observações</FieldLabel>
          <Textarea
            id="party-notes"
            value={draft.notes}
            onChange={(event) =>
              setDraft((current) => ({ ...current, notes: event.target.value }))
            }
          />
        </Field>
      </FieldGroup>
      <DialogFooter>
        <Button type="submit">{party ? "Salvar" : "Cadastrar"}</Button>
      </DialogFooter>
    </form>
  )
}
