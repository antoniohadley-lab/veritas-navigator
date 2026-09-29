/** STAND's Matter bridge wired to its Prisma database. */
import { prisma } from '@/lib/prisma'
import { stewardFromEnv } from './client'
import { MatterBridge, type MatterStore } from './matter'

export { mirror, MATTER_RULEBOOK } from './matter'

const caseSelect = {
  id: true, spineSessionId: true, spineProtocolSha256: true, spineHeadSha256: true,
  holderActorId: true, holderKeyId: true, holderLinkTokenHash: true,
} as const

export const prismaMatterStore: MatterStore = {
  getCase: (id) => prisma.case.findUnique({ where: { id }, select: caseSelect }),
  async updateCase(id, data) { await prisma.case.update({ where: { id }, data }) },
  async logEvent(r) {
    await prisma.verificationEvent.create({
      data: { caseId: r.caseId, actorId: r.actorId, roleType: r.roleType, eventType: r.eventType, payloadType: 'spine_event',
        spineEventSha: r.spineEventSha, evidenceHash: r.evidenceHash, notes: r.notes },
    })
  },
  async signedEventShas(caseId, actorId) {
    const rows = await prisma.verificationEvent.findMany({
      where: { caseId, actorId, spineEventSha: { not: null } }, select: { spineEventSha: true }, orderBy: { timestamp: 'asc' },
    })
    return rows.map((r) => r.spineEventSha!)
  },
}

let bridge: MatterBridge | null = null
export function matters(): MatterBridge {
  bridge ??= new MatterBridge(prismaMatterStore, stewardFromEnv())
  return bridge
}
