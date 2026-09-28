import { db } from "@/lib/db"
import { nowIso } from "@/lib/dates"
import type { PartyRole } from "@/lib/schema"

function mergeText(primary: string, extra: string): string {
  if (!primary) {
    return extra
  }
  if (!extra || primary === extra) {
    return primary
  }
  return `${primary}\n${extra}`
}

export async function mergeParties(
  sourceId: string,
  targetId: string
): Promise<{ payables: number; receivables: number }> {
  if (sourceId === targetId) {
    throw new Error("Escolha outro cadastro.")
  }
  const now = nowIso()
  let payables = 0
  let receivables = 0
  await db.transaction(
    "rw",
    [db.parties, db.payables, db.receivables],
    async () => {
      const source = await db.parties.get(sourceId)
      const target = await db.parties.get(targetId)
      if (!source || !target) {
        throw new Error("Cadastro não encontrado.")
      }
      const roles = [...new Set<PartyRole>([...target.roles, ...source.roles])]
      await db.parties.update(targetId, {
        roles,
        document: target.document || source.document,
        email: target.email || source.email,
        phone: target.phone || source.phone,
        notes: mergeText(target.notes, source.notes),
        updatedAt: now,
      })
      const payableRows = await db.payables
        .where("partyId")
        .equals(sourceId)
        .toArray()
      payables = payableRows.length
      if (payableRows.length > 0) {
        await db.payables.bulkPut(
          payableRows.map((row) => ({
            ...row,
            partyId: targetId,
            updatedAt: now,
          }))
        )
      }
      const receivableRows = await db.receivables
        .where("partyId")
        .equals(sourceId)
        .toArray()
      receivables = receivableRows.length
      if (receivableRows.length > 0) {
        await db.receivables.bulkPut(
          receivableRows.map((row) => ({
            ...row,
            partyId: targetId,
            updatedAt: now,
          }))
        )
      }
      await db.parties.delete(sourceId)
    }
  )
  return { payables, receivables }
}

export async function mergeBanks(
  sourceId: string,
  targetId: string
): Promise<{ moved: number }> {
  if (sourceId === targetId) {
    throw new Error("Escolha outro banco.")
  }
  const now = nowIso()
  let moved = 0
  await db.transaction(
    "rw",
    [db.banks, db.payables, db.receivables, db.investments],
    async () => {
      const source = await db.banks.get(sourceId)
      const target = await db.banks.get(targetId)
      if (!source || !target) {
        throw new Error("Banco não encontrado.")
      }
      await db.banks.update(targetId, {
        notes: mergeText(target.notes, source.notes),
        updatedAt: now,
      })
      const payables = await db.payables
        .where("bankId")
        .equals(sourceId)
        .toArray()
      const receivables = await db.receivables
        .where("bankId")
        .equals(sourceId)
        .toArray()
      const investments = (await db.investments.toArray()).filter(
        (row) => row.bankId === sourceId
      )
      moved = payables.length + receivables.length + investments.length
      if (payables.length > 0) {
        await db.payables.bulkPut(
          payables.map((row) => ({ ...row, bankId: targetId, updatedAt: now }))
        )
      }
      if (receivables.length > 0) {
        await db.receivables.bulkPut(
          receivables.map((row) => ({
            ...row,
            bankId: targetId,
            updatedAt: now,
          }))
        )
      }
      if (investments.length > 0) {
        await db.investments.bulkPut(
          investments.map((row) => ({
            ...row,
            bankId: targetId,
            updatedAt: now,
          }))
        )
      }
      await db.banks.delete(sourceId)
    }
  )
  return { moved }
}
