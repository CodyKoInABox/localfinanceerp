import { Temporal } from "@js-temporal/polyfill"

import { db } from "@/lib/db"
import { addMonths, monthKey, nowIso, todayIso } from "@/lib/dates"
import type {
  Bank,
  Investment,
  Party,
  Payable,
  Receivable,
  Valuation,
} from "@/lib/schema"

function dayIn(offset: number, day: number): string {
  const base = Temporal.PlainDate.from(
    addMonths(`${monthKey(todayIso())}-01`, offset)
  )
  return base.with({ day }).toString()
}

function stamp(iso: string): { createdAt: string; updatedAt: string } {
  return { createdAt: iso, updatedAt: iso }
}

export async function loadSampleData(): Promise<void> {
  const now = nowIso()
  const banks: Bank[] = [
    { id: "bank-cef", name: "CEF", notes: "", ...stamp(now) },
    { id: "bank-san", name: "Santander", notes: "", ...stamp(now) },
    { id: "bank-nu", name: "Nubank", notes: "", ...stamp(now) },
  ]
  const parties: Party[] = [
    {
      id: "party-imob",
      name: "Imobiliária Centro",
      roles: ["supplier"],
      document: "",
      email: "",
      phone: "",
      notes: "Aluguel da sala.",
      ...stamp(now),
    },
    {
      id: "party-cemig",
      name: "CEMIG",
      roles: ["supplier"],
      document: "",
      email: "",
      phone: "",
      notes: "",
      ...stamp(now),
    },
    {
      id: "party-vivo",
      name: "Vivo",
      roles: ["supplier"],
      document: "",
      email: "",
      phone: "",
      notes: "",
      ...stamp(now),
    },
    {
      id: "party-papel",
      name: "Papelaria Oficina",
      roles: ["supplier"],
      document: "",
      email: "",
      phone: "",
      notes: "Compra parcelada de equipamento.",
      ...stamp(now),
    },
    {
      id: "party-ana",
      name: "Ana Lima",
      roles: ["client"],
      document: "",
      email: "ana@example.com",
      phone: "",
      notes: "",
      ...stamp(now),
    },
    {
      id: "party-norte",
      name: "Oficina Norte",
      roles: ["client"],
      document: "",
      email: "",
      phone: "",
      notes: "",
      ...stamp(now),
    },
    {
      id: "party-pixel",
      name: "Studio Pixel",
      roles: ["client"],
      document: "",
      email: "",
      phone: "",
      notes: "",
      ...stamp(now),
    },
  ]

  const payables: Payable[] = []
  for (const offset of [-3, -2, -1, 0]) {
    const date = dayIn(offset, 10)
    const paid = offset <= 0
    payables.push({
      id: `sample-rent-${offset}`,
      date,
      name: "Aluguel",
      partyId: "party-imob",
      amount: 2800,
      invoiceNumber: "",
      paymentMethodId: "pm-pix-cnpj",
      bankId: "bank-cef",
      paid,
      paidDate: paid ? date : null,
      notes: "",
      installmentGroupId: null,
      installmentIndex: 1,
      installmentCount: 1,
      ...stamp(now),
    })
  }

  for (const offset of [-2, -1, 0]) {
    const date = dayIn(offset, 8)
    const paid = offset < 0
    payables.push({
      id: `sample-energy-${offset}`,
      date,
      name: "Energia",
      partyId: "party-cemig",
      amount: offset === 0 ? 486.9 : 420 + Math.abs(offset) * 15,
      invoiceNumber: paid ? `NF-E${Math.abs(offset)}` : "",
      paymentMethodId: "pm-boleto",
      bankId: paid ? "bank-san" : null,
      paid,
      paidDate: paid ? date : null,
      notes: "",
      installmentGroupId: null,
      installmentIndex: 1,
      installmentCount: 1,
      ...stamp(now),
    })
  }

  payables.push({
    id: "sample-vivo-0",
    date: dayIn(0, 28),
    name: "Internet e telefone",
    partyId: "party-vivo",
    amount: 189.9,
    invoiceNumber: "",
    paymentMethodId: "pm-debito",
    bankId: "bank-nu",
    paid: false,
    paidDate: null,
    notes: "",
    installmentGroupId: null,
    installmentIndex: 1,
    installmentCount: 1,
    ...stamp(now),
  })

  const groupId = "sample-papel-group"
  const amounts = [333.34, 333.33, 333.33, 333.33, 333.33, 333.34]
  amounts.forEach((amount, index) => {
    const offset = index - 4
    const date = dayIn(offset, 15)
    const paid = offset < 0
    payables.push({
      id: `sample-papel-${index + 1}`,
      date,
      name: "Notebook",
      partyId: "party-papel",
      amount,
      invoiceNumber: "NF-1044",
      paymentMethodId: "pm-boleto",
      bankId: "bank-san",
      paid,
      paidDate: paid ? date : null,
      notes: "Compra em 6x.",
      installmentGroupId: groupId,
      installmentIndex: index + 1,
      installmentCount: 6,
      ...stamp(now),
    })
  })

  const receivables: Receivable[] = [
    {
      id: "sample-ana-1",
      date: dayIn(-1, 12),
      name: "Projeto site",
      partyId: "party-ana",
      amount: 4500,
      incomeTypeId: "it-servico",
      bankId: "bank-nu",
      received: true,
      receivedDate: dayIn(-1, 12),
      notes: "",
      installmentGroupId: null,
      installmentIndex: 1,
      installmentCount: 1,
      ...stamp(now),
    },
    {
      id: "sample-pixel-0",
      date: dayIn(0, 5),
      name: "Mensalidade",
      partyId: "party-pixel",
      amount: 2200,
      incomeTypeId: "it-servico",
      bankId: "bank-cef",
      received: true,
      receivedDate: dayIn(0, 5),
      notes: "",
      installmentGroupId: null,
      installmentIndex: 1,
      installmentCount: 1,
      ...stamp(now),
    },
  ]

  const saleGroup = "sample-norte-group"
  ;[1800, 1800, 1800, 1800].forEach((amount, index) => {
    const offset = index - 1
    const date = dayIn(offset, 20)
    const received = offset < 0
    receivables.push({
      id: `sample-norte-${index + 1}`,
      date,
      name: "Contrato manutenção",
      partyId: "party-norte",
      amount,
      incomeTypeId: "it-servico",
      bankId: received ? "bank-san" : null,
      received,
      receivedDate: received ? date : null,
      notes: "Entrada em 4x.",
      installmentGroupId: saleGroup,
      installmentIndex: index + 1,
      installmentCount: 4,
      ...stamp(now),
    })
  })

  const investments: Investment[] = [
    {
      id: "sample-cdb",
      name: "CDB liquidez diária",
      typeId: "iv-rf",
      bankId: "bank-cef",
      contributed: 10000,
      openedOn: dayIn(-5, 2),
      notes: "",
      ...stamp(now),
    },
    {
      id: "sample-tesouro",
      name: "Tesouro Selic",
      typeId: "iv-tesouro",
      bankId: "bank-nu",
      contributed: 5000,
      openedOn: dayIn(-4, 2),
      notes: "",
      ...stamp(now),
    },
  ]

  const cdbValues = [10000, 10085, 10170, 10260, 10355, 10440]
  const valuations: Valuation[] = cdbValues.map((amount, index) => ({
    id: `sample-cdb-v-${index}`,
    investmentId: "sample-cdb",
    date: dayIn(index - 5, 2),
    amount,
    notes: "",
    createdAt: now,
  }))
  ;[5000, 5060, 5140, 5230].forEach((amount, index) => {
    valuations.push({
      id: `sample-tesouro-v-${index}`,
      investmentId: "sample-tesouro",
      date: dayIn(index - 4, 2),
      amount,
      notes: "",
      createdAt: now,
    })
  })

  await db.transaction(
    "rw",
    [
      db.banks,
      db.parties,
      db.payables,
      db.receivables,
      db.investments,
      db.valuations,
    ],
    async () => {
      await db.banks.bulkPut(banks)
      await db.parties.bulkPut(parties)
      await db.payables.bulkPut(payables)
      await db.receivables.bulkPut(receivables)
      await db.investments.bulkPut(investments)
      await db.valuations.bulkPut(valuations)
    }
  )
}
