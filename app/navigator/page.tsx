'use client';

import { useState, useRef, useEffect, FormEvent } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// 'active'   — normal chat
// 'loading'  — waiting for first response bytes
// 'yellow'   — compliance hold, input paused (H2)
type ChatState = 'active' | 'loading' | 'yellow';

const INITIAL_MESSAGE: Message = {
  role: 'assistant',
  content:
    "Welcome to Veritas Navigator. I'm here to help you understand your situation and identify what documents and deadlines apply.\n\nWhat kind of paper or notice did you receive — does it have a court name on it, a case number, or is it a letter from a person, company, or agency?",
};

// Michigan legal aid resources shown during Yellow hold (H2)
const MICHIGAN_RESOURCES = [
  {
    name: 'Michigan Legal Help',
    href: 'https://michiganlegalhelp.org',
    desc: 'Free self-help legal information for Michigan residents',
  },
  {
    name: 'Legal Aid & Defender — Detroit metro',
    href: 'https://ladadetroit.org',
    desc: 'Free civil legal services',
  },
  {
    name: 'Michigan State Bar Lawyer Referral',
    href: 'tel:18009680738',
    desc: '800-968-0738',
  },
  {
    name: '211 Michigan',
    href: 'tel:211',
    desc: 'Dial 2-1-1 for county-level resources',
  },
];

export default function NavigatorPage() {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [chatState, setChatState] = useState<ChatState>('active');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const inputDisabled = chatState !== 'active';

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatState]);

  async function sendMessage(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || inputDisabled) return;

    const userMessage: Message = { role: 'user', content: text };
    const updatedMessages = [...messages, userMessage];

    // Add user message + empty assistant placeholder
    setMessages([...updatedMessages, { role: 'assistant', content: '' }]);
    setInput('');
    setChatState('loading');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedMessages }),
      });

      if (!res.ok || !res.body) {
        const errBody = await res.json().catch(() => ({})) as { error?: string };
        const errText = errBody.error ?? `Request failed (${res.status})`;
        setMessages([
          ...updatedMessages,
          { role: 'assistant', content: `Something went wrong: ${errText}` },
        ]);
        setChatState('active');
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';
      let classificationExtracted = false;
      let classification: 'green' | 'yellow' | 'red' = 'green';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        accumulated += decoder.decode(value, { stream: true });

        // Extract [GYR:X] prefix from the first bytes of the response
        if (!classificationExtracted) {
          const match = accumulated.match(/^\[GYR:([GYR])\]\n?/);
          if (match) {
            const code = match[1];
            classification =
              code === 'G' ? 'green' : code === 'Y' ? 'yellow' : 'red';
            classificationExtracted = true;
            accumulated = accumulated.replace(/^\[GYR:[GYR]\]\n?/, '');
          } else if (accumulated.length > 30) {
            // Fallback: no marker found after 30 chars, treat as green
            classificationExtracted = true;
          }
        }

        // Yellow: H2 state machine kicks in — cancel stream, show static block
        if (classificationExtracted && classification === 'yellow') {
          reader.cancel();
          // Remove the empty assistant placeholder, Yellow UI renders separately
          setMessages(updatedMessages);
          setChatState('yellow');
          return;
        }

        // Green or Red: stream content into the assistant bubble
        if (classificationExtracted) {
          setMessages([
            ...updatedMessages,
            { role: 'assistant', content: accumulated },
          ]);
        }
      }

      setChatState('active');
      inputRef.current?.focus();
    } catch (err) {
      console.error('Chat error:', err);
      setMessages([
        ...updatedMessages,
        { role: 'assistant', content: 'Something went wrong. Please try again.' },
      ]);
      setChatState('active');
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(e as unknown as FormEvent);
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-veritas-blue text-white px-6 py-4 shadow-md flex-shrink-0">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">STAND</h1>
            <p className="text-blue-200 text-sm mt-0.5">Michigan Civil Dispute Navigation</p>
          </div>
          <nav className="flex gap-4 text-sm">
            <a href="/pricing" className="text-blue-200 hover:text-white transition-colors">Pricing</a>
          </nav>
        </div>
      </header>

      {/* Message thread */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
          {messages.map((msg, i) => (
            <MessageBubble
              key={i}
              message={msg}
              isStreaming={
                chatState === 'loading' &&
                i === messages.length - 1 &&
                msg.role === 'assistant'
              }
            />
          ))}

          {/* H2 Yellow Tier State Machine block */}
          {chatState === 'yellow' && <YellowHold />}

          <div ref={bottomRef} />
        </div>
      </main>

      {/* Input area + Tier 1 persistent disclosure */}
      <footer className="border-t border-gray-200 bg-white flex-shrink-0">
        <div className="max-w-3xl mx-auto px-4 py-3">
          {chatState === 'yellow' ? (
            <p className="text-center text-sm text-amber-700 font-medium py-2">
              Chat is paused pending compliance review.
            </p>
          ) : (
            <form onSubmit={sendMessage} className="flex items-end gap-3">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe your situation or answer the question above…"
                rows={2}
                disabled={inputDisabled}
                className="flex-1 resize-none rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-veritas-teal focus:border-transparent disabled:opacity-50 disabled:bg-gray-50"
              />
              <button
                type="submit"
                disabled={inputDisabled || !input.trim()}
                className="rounded-lg bg-veritas-teal hover:bg-teal-700 text-white px-5 py-3 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
              >
                {chatState === 'loading' ? 'Sending…' : 'Send'}
              </button>
            </form>
          )}

          {/* Tier 1 persistent disclosure — structural UI element, never AI-generated */}
          <p className="mt-2 text-center text-xs text-gray-400 leading-tight">
            Veritas Navigator is not a law firm and does not provide legal advice.
            This is a navigation and document-organization tool.
          </p>
        </div>
      </footer>
    </div>
  );
}

// ─── Components ───────────────────────────────────────────────────────────────

function MessageBubble({
  message,
  isStreaming,
}: {
  message: Message;
  isStreaming: boolean;
}) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-veritas-blue text-white px-4 py-3 text-sm leading-relaxed shadow-sm">
          <Prose text={message.content} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-white border border-gray-200 text-gray-800 px-4 py-3 text-sm leading-relaxed shadow-sm min-h-[44px]">
        {message.content ? (
          <Prose text={message.content} />
        ) : isStreaming ? (
          <TypingDots />
        ) : null}
      </div>
    </div>
  );
}

// H2 Yellow Tier State Machine UI block — static, pre-written, not AI-generated
function YellowHold() {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center">
          <span className="text-white text-xs font-bold leading-none">!</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-amber-900 mb-1">
            Compliance Verification Required
          </p>
          <p className="text-sm text-amber-800 leading-relaxed">
            This matter includes a question that requires a standard compliance
            verification before we continue. You will be notified when it is
            ready, typically within 4 business hours.
          </p>
        </div>
      </div>

      <div className="mt-4 border-t border-amber-200 pt-4">
        <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-3">
          Free Resources While You Wait
        </p>
        <ul className="space-y-2">
          {MICHIGAN_RESOURCES.map((r) => (
            <li key={r.href} className="flex items-start gap-2">
              <span className="text-amber-400 mt-0.5 font-bold text-xs">›</span>
              <div>
                <a
                  href={r.href}
                  target={r.href.startsWith('http') ? '_blank' : undefined}
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-amber-900 hover:underline"
                >
                  {r.name}
                </a>
                <span className="text-xs text-amber-700 ml-1.5">— {r.desc}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Prose({ text }: { text: string }) {
  return (
    <>
      {text.split('\n').map((line, i) => (
        <p key={i} className={line === '' ? 'mt-2' : undefined}>
          {line}
        </p>
      ))}
    </>
  );
}

function TypingDots() {
  return (
    <span className="flex gap-1 items-center h-4">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.3s]" />
      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.15s]" />
      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" />
    </span>
  );
}
