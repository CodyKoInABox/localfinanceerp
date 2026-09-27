import * as React from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
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
import type { Bank } from "@/lib/schema"

export function BankFormDialog({
  open,
  onOpenChange,
  bank = null,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  bank?: Bank | null
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {open ? (
          <BankForm
            key={bank?.id ?? "new-bank"}
            bank={bank}
            onOpenChange={onOpenChange}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function BankForm({
  bank,
  onOpenChange,
}: {
  bank: Bank | null
  onOpenChange: (open: boolean) => void
}) {
  const [name, setName] = React.useState(bank?.name ?? "")
  const [notes, setNotes] = React.useState(bank?.notes ?? "")

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      toast.error("Informe o nome do banco.")
      return
    }
    const now = nowIso()
    await db.banks.put({
      id: bank?.id ?? createId(),
      name: trimmed,
      notes: notes.trim(),
      createdAt: bank?.createdAt ?? now,
      updatedAt: now,
    })
    toast.success(bank ? "Banco atualizado." : "Banco cadastrado.")
    onOpenChange(false)
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)}>
      <DialogHeader>
        <DialogTitle>{bank ? "Editar banco" : "Novo banco"}</DialogTitle>
        <DialogDescription>
          CEF, Santander, Nubank — o que você usa para pagar e receber.
        </DialogDescription>
      </DialogHeader>
      <FieldGroup className="py-4">
        <Field>
          <FieldLabel htmlFor="bank-name">Nome</FieldLabel>
          <Input
            id="bank-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="bank-notes">Observações</FieldLabel>
          <Textarea
            id="bank-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </Field>
      </FieldGroup>
      <DialogFooter>
        <Button type="submit">{bank ? "Salvar" : "Cadastrar"}</Button>
      </DialogFooter>
    </form>
  )
}
