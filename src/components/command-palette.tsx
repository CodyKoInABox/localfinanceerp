import * as React from "react"
import { useLiveQuery } from "dexie-react-hooks"
import {
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  Building2Icon,
  HouseIcon,
  LandmarkIcon,
  PieChartIcon,
  PlusIcon,
  Rows3Icon,
  SettingsIcon,
  TrendingUpIcon,
  UsersIcon,
} from "lucide-react"
import { useNavigate } from "react-router"

import { useCreate, type CreateKind } from "@/components/create-provider"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { db } from "@/lib/db"

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const navigate = useNavigate()
  const { openCreate } = useCreate()
  const [search, setSearch] = React.useState("")
  const parties = useLiveQuery(() => db.parties.orderBy("name").toArray()) ?? []
  const banks = useLiveQuery(() => db.banks.orderBy("name").toArray()) ?? []
  const investments =
    useLiveQuery(() => db.investments.orderBy("name").toArray()) ?? []
  const payables = useLiveQuery(() => db.payables.toArray()) ?? []
  const receivables = useLiveQuery(() => db.receivables.toArray()) ?? []
  const needle = search.trim().toLowerCase()

  const go = React.useCallback(
    (to: string) => {
      navigate(to)
      onOpenChange(false)
    },
    [navigate, onOpenChange]
  )

  function create(kind: CreateKind) {
    onOpenChange(false)
    openCreate(kind)
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setSearch("")
        }
        onOpenChange(next)
      }}
      title="Busca"
      description="Ir para uma página ou lançamento."
    >
      <Command>
        <CommandInput
          placeholder="Páginas, contas, pessoas, bancos…"
          value={search}
          onValueChange={setSearch}
        />
        <CommandList className="max-h-[min(28rem,70vh)]">
          <CommandEmpty>Nada encontrado.</CommandEmpty>
          <CommandGroup heading="Ir">
            <CommandItem onSelect={() => go("/")}>
              <HouseIcon />
              Início
            </CommandItem>
            <CommandItem onSelect={() => go("/relatorios")}>
              <PieChartIcon />
              Relatórios
            </CommandItem>
            <CommandItem onSelect={() => go("/pagar")}>
              <ArrowUpRightIcon />A pagar
            </CommandItem>
            <CommandItem onSelect={() => go("/receber")}>
              <ArrowDownLeftIcon />A receber
            </CommandItem>
            <CommandItem onSelect={() => go("/investimentos")}>
              <TrendingUpIcon />
              Investimentos
            </CommandItem>
            <CommandItem onSelect={() => go("/configuracoes")}>
              <SettingsIcon />
              Configurações
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Criar">
            <CommandItem onSelect={() => create("payable")}>
              <PlusIcon />
              Conta a pagar
            </CommandItem>
            <CommandItem onSelect={() => go("/pagar/rapido")}>
              <Rows3Icon />
              Várias contas a pagar
            </CommandItem>
            <CommandItem onSelect={() => create("receivable")}>
              <PlusIcon />
              Conta a receber
            </CommandItem>
            <CommandItem onSelect={() => go("/receber/rapido")}>
              <Rows3Icon />
              Várias contas a receber
            </CommandItem>
            <CommandItem onSelect={() => create("investment")}>
              <PlusIcon />
              Investimento
            </CommandItem>
            <CommandItem onSelect={() => create("supplier")}>
              <PlusIcon />
              Fornecedor
            </CommandItem>
            <CommandItem onSelect={() => create("client")}>
              <PlusIcon />
              Cliente
            </CommandItem>
            <CommandItem onSelect={() => create("bank")}>
              <PlusIcon />
              Banco
            </CommandItem>
          </CommandGroup>
          {needle ? (
            <>
              <CommandSeparator />
              <CommandGroup heading="Contas a pagar">
                {payables
                  .filter((entry) => entry.name.toLowerCase().includes(needle))
                  .slice(0, 8)
                  .map((entry) => (
                    <CommandItem
                      key={entry.id}
                      onSelect={() =>
                        go(`/pagar?q=${encodeURIComponent(entry.name)}`)
                      }
                    >
                      <ArrowUpRightIcon />
                      {entry.name}
                    </CommandItem>
                  ))}
              </CommandGroup>
              <CommandGroup heading="Contas a receber">
                {receivables
                  .filter((entry) => entry.name.toLowerCase().includes(needle))
                  .slice(0, 8)
                  .map((entry) => (
                    <CommandItem
                      key={entry.id}
                      onSelect={() =>
                        go(`/receber?q=${encodeURIComponent(entry.name)}`)
                      }
                    >
                      <ArrowDownLeftIcon />
                      {entry.name}
                    </CommandItem>
                  ))}
              </CommandGroup>
              <CommandGroup heading="Pessoas">
                {parties
                  .filter((party) => party.name.toLowerCase().includes(needle))
                  .slice(0, 8)
                  .map((party) => (
                    <CommandItem
                      key={party.id}
                      onSelect={() =>
                        go(
                          party.roles.includes("supplier")
                            ? `/fornecedores`
                            : `/clientes`
                        )
                      }
                    >
                      {party.roles.includes("supplier") ? (
                        <Building2Icon />
                      ) : (
                        <UsersIcon />
                      )}
                      {party.name}
                    </CommandItem>
                  ))}
              </CommandGroup>
              <CommandGroup heading="Bancos">
                {banks
                  .filter((bank) => bank.name.toLowerCase().includes(needle))
                  .map((bank) => (
                    <CommandItem key={bank.id} onSelect={() => go("/bancos")}>
                      <LandmarkIcon />
                      {bank.name}
                    </CommandItem>
                  ))}
              </CommandGroup>
              <CommandGroup heading="Investimentos">
                {investments
                  .filter((investment) =>
                    investment.name.toLowerCase().includes(needle)
                  )
                  .map((investment) => (
                    <CommandItem
                      key={investment.id}
                      onSelect={() => go(`/investimentos/${investment.id}`)}
                    >
                      <TrendingUpIcon />
                      {investment.name}
                    </CommandItem>
                  ))}
              </CommandGroup>
            </>
          ) : null}
        </CommandList>
      </Command>
    </CommandDialog>
  )
}
