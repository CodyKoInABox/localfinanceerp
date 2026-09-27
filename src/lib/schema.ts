import { z } from "zod"

import { isCalendarDate } from "@/lib/dates"
import { SCHEMA_VERSION, SETTINGS_ID } from "@/lib/constants"

const calendarDate = z.string().refine(isCalendarDate, {
  message: "Use uma data (AAAA-MM-DD).",
})

export const partyRoleSchema = z.enum(["supplier", "client"])

export const catalogItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  order: z.number().int(),
})

export const settingsSchema = z.object({
  id: z.literal(SETTINGS_ID),
  currency: z.string().min(1),
})

export const bankSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  notes: z.string(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
})

export const partySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  roles: z.array(partyRoleSchema).min(1),
  document: z.string(),
  email: z.string(),
  phone: z.string(),
  notes: z.string(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
})

const installmentFields = {
  installmentGroupId: z.string().min(1).nullable(),
  installmentIndex: z.number().int().positive(),
  installmentCount: z.number().int().positive(),
}

export const payableSchema = z.object({
  id: z.string().min(1),
  date: calendarDate,
  name: z.string().min(1),
  partyId: z.string().min(1).nullable(),
  amount: z.number().nonnegative(),
  invoiceNumber: z.string(),
  paymentMethodId: z.string().min(1),
  bankId: z.string().min(1).nullable(),
  paid: z.boolean(),
  paidDate: calendarDate.nullable(),
  notes: z.string(),
  ...installmentFields,
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
})

export const receivableSchema = z.object({
  id: z.string().min(1),
  date: calendarDate,
  name: z.string().min(1),
  partyId: z.string().min(1).nullable(),
  amount: z.number().nonnegative(),
  incomeTypeId: z.string().min(1),
  bankId: z.string().min(1).nullable(),
  received: z.boolean(),
  receivedDate: calendarDate.nullable(),
  notes: z.string(),
  ...installmentFields,
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
})

export const investmentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  typeId: z.string().min(1),
  bankId: z.string().min(1).nullable(),
  contributed: z.number().nonnegative(),
  openedOn: calendarDate,
  notes: z.string(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
})

export const valuationSchema = z.object({
  id: z.string().min(1),
  investmentId: z.string().min(1),
  date: calendarDate,
  amount: z.number().nonnegative(),
  notes: z.string(),
  createdAt: z.string().min(1),
})

export const exportPayloadSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  exportedAt: z.string().min(1),
  settings: settingsSchema,
  banks: z.array(bankSchema),
  parties: z.array(partySchema),
  paymentMethods: z.array(catalogItemSchema),
  incomeTypes: z.array(catalogItemSchema),
  investmentTypes: z.array(catalogItemSchema),
  payables: z.array(payableSchema),
  receivables: z.array(receivableSchema),
  investments: z.array(investmentSchema),
  valuations: z.array(valuationSchema),
})

export type PartyRole = z.infer<typeof partyRoleSchema>
export type CatalogItem = z.infer<typeof catalogItemSchema>
export type Settings = z.infer<typeof settingsSchema>
export type Bank = z.infer<typeof bankSchema>
export type Party = z.infer<typeof partySchema>
export type Payable = z.infer<typeof payableSchema>
export type Receivable = z.infer<typeof receivableSchema>
export type Investment = z.infer<typeof investmentSchema>
export type Valuation = z.infer<typeof valuationSchema>
export type ExportPayload = z.infer<typeof exportPayloadSchema>
