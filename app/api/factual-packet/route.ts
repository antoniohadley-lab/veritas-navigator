/**
 * POST /api/factual-packet
 * Factual Packet export endpoint — Section 4B.
 *
 * ⚠️  STUB — PDF rendering requires a library not yet installed.
 *     Install @react-pdf/renderer or pdfkit and wire it to
 *     lib/factual-packet.ts before shipping to users.
 *
 * ⚠️  COUNSEL REVIEW REQUIRED before enabling for users.
 *     Company branding on a party's court filing raises Michigan
 *     solicitation concerns. See lib/factual-packet.ts header.
 *
 * Input:  { caseId: string }
 * Output: application/pdf (once renderer is wired) | JSON preview (stub)
 */
import { buildFactualPacket, renderCoverPageText } from '@/lib/factual-packet';

export async function POST(req: Request) {
  try {
    const { caseId } = (await req.json()) as { caseId: string };

    if (!caseId) {
      return Response.json({ error: 'caseId is required' }, { status: 400 });
    }

    // TODO: query real events from DB once DATABASE_URL is wired:
    // const events = await prisma.verificationEvent.findMany({
    //   where: { caseId },
    //   orderBy: { timestamp: 'asc' },
    // });

    // Stub: return the packet structure as JSON for review
    const packet = buildFactualPacket(
      caseId,
      [], // replace with real events
      [], // replace with real exhibits
      process.env.NEXT_PUBLIC_BASE_URL ?? 'https://stand.veritassystems.com'
    );

    const coverText = renderCoverPageText(packet.coverPage);

    return Response.json({
      stub: true,
      message:
        'PDF rendering not yet enabled. Install @react-pdf/renderer or pdfkit and wire it here. Counsel review required before enabling — see lib/factual-packet.ts.',
      packetId: packet.coverPage.packetId,
      coverPreview: coverText,
      structure: packet,
    });
  } catch (err) {
    console.error('[/api/factual-packet] error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
