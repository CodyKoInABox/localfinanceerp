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
import { Field, FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function MergeDialog({
  open,
  onOpenChange,
  title,
  description,
  options,
  emptyHint,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  options: { id: string; name: string }[]
  emptyHint: string
  onConfirm: (targetId: string) => Promise<void>
}) {
  const [targetId, setTargetId] = React.useState("")
  const [busy, setBusy] = React.useState(false)

  async function confirm() {
    if (!targetId) {
      toast.error("Escolha o cadastro que fica.")
      return
    }
    setBusy(true)
    try {
      await onConfirm(targetId)
      onOpenChange(false)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não deu para unificar."
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {options.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyHint}</p>
        ) : (
          <Field>
            <FieldLabel htmlFor="merge-target">Fica este</FieldLabel>
            <Select value={targetId || undefined} onValueChange={setTargetId}>
              <SelectTrigger id="merge-target" className="w-full">
                <SelectValue placeholder="Escolher" />
              </SelectTrigger>
              <SelectContent position="popper">
                {options.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
        <DialogFooter>
          <Button
            type="button"
            disabled={busy || options.length === 0}
            onClick={() => void confirm()}
          >
            Unificar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
