/* eslint-disable react-refresh/only-export-components */
import * as React from "react"

import { BankFormDialog } from "@/components/bank-form-dialog"
import { EntryFormDialog } from "@/components/entry-form-dialog"
import { InvestmentFormDialog } from "@/components/investment-form-dialog"
import { PartyFormDialog } from "@/components/party-form-dialog"
import type { PartyRole } from "@/lib/schema"

export type CreateKind =
  "payable" | "receivable" | "supplier" | "client" | "bank" | "investment"

type CreateContextValue = {
  openCreate: (kind: CreateKind) => void
}

const CreateContext = React.createContext<CreateContextValue | null>(null)

export function useCreate(): CreateContextValue {
  const value = React.useContext(CreateContext)
  if (!value) {
    throw new Error("useCreate must be used within CreateProvider")
  }
  return value
}

export function CreateProvider({ children }: { children: React.ReactNode }) {
  const [kind, setKind] = React.useState<CreateKind | null>(null)
  const partyRole: PartyRole = kind === "client" ? "client" : "supplier"

  return (
    <CreateContext.Provider value={{ openCreate: setKind }}>
      {children}
      <EntryFormDialog
        open={kind === "payable"}
        kind="payable"
        onOpenChange={(open) => {
          if (!open) {
            setKind(null)
          }
        }}
      />
      <EntryFormDialog
        open={kind === "receivable"}
        kind="receivable"
        onOpenChange={(open) => {
          if (!open) {
            setKind(null)
          }
        }}
      />
      <PartyFormDialog
        open={kind === "supplier" || kind === "client"}
        role={partyRole}
        onOpenChange={(open) => {
          if (!open) {
            setKind(null)
          }
        }}
      />
      <BankFormDialog
        open={kind === "bank"}
        onOpenChange={(open) => {
          if (!open) {
            setKind(null)
          }
        }}
      />
      <InvestmentFormDialog
        open={kind === "investment"}
        onOpenChange={(open) => {
          if (!open) {
            setKind(null)
          }
        }}
      />
    </CreateContext.Provider>
  )
}
