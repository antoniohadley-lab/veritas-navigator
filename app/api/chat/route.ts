import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT } from '@/lib/system-prompt';
import { classifyInput, buildStructuredContext } from '@/lib/classifier';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(req: Request) {
  try {
    const { messages }: { messages: ChatMessage[] } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return Response.json({ error: 'messages array is required' }, { status: 400 });
    }

    // Find the last user message for H1 classifier
    let lastUserMsgIndex = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        lastUserMsgIndex = i;
        break;
      }
    }

    let messagesForModel: ChatMessage[] = messages;

    if (lastUserMsgIndex !== -1) {
      const lastUserMsg = messages[lastUserMsgIndex];

      // Only apply classifier to substantive inputs (> 20 chars).
      // Short answers to intake questions (e.g. "my landlord", "July 5th")
      // are factual enough to pass through directly.
      if (lastUserMsg.content.trim().length > 20) {
        const classifierResult = await classifyInput(lastUserMsg.content);

        if (classifierResult.blocked) {
          return Response.json(
            { error: classifierResult.blockMessage ?? 'Input could not be processed.' },
            { status: 400 }
          );
        }

        // Prepend structured context to the message sent to Navigator.
        // The original message stays in the UI; only the model sees the tokens.
        const structuredCtx = buildStructuredContext(classifierResult);
        if (structuredCtx) {
          messagesForModel = messages.map((msg, i) =>
            i === lastUserMsgIndex
              ? {
                  ...msg,
                  content: `${structuredCtx}\n\nUser statement: ${msg.content}`,
                }
              : msg
          );
        }
      }
    }

    const stream = client.messages.stream({
      model: process.env.ANTHROPIC_MODEL ?? 'claude-opus-4-8',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: messagesForModel,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === 'content_block_delta' &&
              event.delta.type === 'text_delta'
            ) {
              controller.enqueue(encoder.encode(event.delta.text));
            }
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (err) {
    console.error('[/api/chat] error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
