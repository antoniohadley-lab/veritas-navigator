/**
 * POST /api/matters/:caseId/statement {text, entrySource?}
 * Saves the words exactly as given (NarrativeEntry, never modified) and records them on the Matter.
 * STAND signs it as steward; the person can later confirm it from their own device.
 */
import { prisma } from '@/lib/prisma'
import { matters, mirror } from '@/lib/spine'
import { operatorDenied, fail } from '@/lib/spine/guard'

const SOURCES = ['typed_by_holder', 'spoken_by_holder', 'transcribed_by_steward'] as const
type Source = (typeof SOURCES)[number]

export async function POST(req: Request, { params }: { params: Promise<{ caseId: string }> }) {
  const denied = operatorDenied(req); if (denied) return denied
  const { caseId } = await params
  try {
    const { text, entrySource = 'typed_by_holder' } = (await req.json()) as { text?: string; entrySource?: Source }
    if (!text?.trim()) return fail(new Error('text is required'))
    if (!SOURCES.includes(entrySource)) return fail(new Error(`entrySource must be one of ${SOURCES.join(', ')}`))
    const entry = await prisma.narrativeEntry.create({ data: { caseId, rawText: text } })
    const recorded = await mirror('statement', () => matters().statement(caseId, text, entrySource))
    return Response.json({ narrativeEntryId: entry.id, spineEventSha: recorded?.event_sha256 ?? null })
  } catch (e) { return fail(e) }
}
