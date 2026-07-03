/**
 * POST /api/extract-timeline
 * Haiku-powered factual event extractor for STAND Screen 1.
 *
 * Input:  { story: string }
 * Output: { events: TimelineEvent[] }
 *
 * Rules:
 * - Uses claude-haiku-4-5-20251001 for low-latency extraction
 * - Only extracts factual events — never adds legal conclusions or advice
 * - On parse failure, returns empty events array (never errors the client)
 */
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface TimelineEvent {
  id: string;
  text: string;
  date: string | null;
}

export interface ExtractTimelineResponse {
  events: TimelineEvent[];
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as { story?: string };
    const { story } = body;

    if (!story || story.trim().length < 20) {
      return Response.json({ events: [] });
    }

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: [
        'You are a factual event extractor.',
        'Your only job is to pull concrete events from the user\'s description and return them as a JSON array.',
        'Rules:',
        '- Return ONLY a JSON array, nothing before or after it.',
        '- Each item: { "id": "ev-1", "text": "<what happened>", "date": "<YYYY-MM-DD or null>" }',
        '- "text" must describe only what the user said happened — no interpretation, no legal labels, no advice.',
        '- "date" must be an ISO date string if one is mentioned; null if no date is clear.',
        '- If nothing event-like is in the text, return an empty array: []',
        '- Never add events the user did not describe.',
        '- Never recommend a course of action or describe legal significance.',
      ].join('\n'),
      messages: [
        {
          role: 'user',
          content: `Extract the factual timeline from this description:\n\n${story.trim()}`,
        },
      ],
    });

    const block = message.content[0];
    if (block.type !== 'text') {
      return Response.json({ events: [] });
    }

    // Extract JSON array from the response (tolerates leading/trailing whitespace)
    const jsonMatch = block.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return Response.json({ events: [] });
    }

    const raw = JSON.parse(jsonMatch[0]) as Array<{ id?: string; text?: string; date?: string | null }>;

    // Sanitize: ensure each event has required shape and auto-assign id if missing
    const events: TimelineEvent[] = raw
      .filter((item) => typeof item.text === 'string' && item.text.trim().length > 0)
      .map((item, idx) => ({
        id: typeof item.id === 'string' ? item.id : `ev-${idx + 1}`,
        text: item.text!.trim(),
        date: typeof item.date === 'string' && item.date ? item.date : null,
      }));

    return Response.json({ events });
  } catch (err) {
    console.error('[/api/extract-timeline] error:', err);
    // Return empty events — never surface a 500 to the onboarding flow
    return Response.json({ events: [] });
  }
}
