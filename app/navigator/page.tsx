'use client';

import { useState, useRef, useEffect, FormEvent } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const INITIAL_MESSAGE: Message = {
  role: 'assistant',
  content:
    'Welcome to Veritas Navigator. I\'m here to help you understand your situation and identify what documents and deadlines apply.\n\nWhat kind of paper or notice did you receive — does it have a court name on it, a case number, or is it a letter from a person, company, or agency?',
};

export default function NavigatorPage() {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;

    const userMessage: Message = { role: 'user', content: text };
    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    // Add an empty assistant message that will be filled by the stream
    const assistantPlaceholder: Message = { role: 'assistant', content: '' };
    setMessages([...updatedMessages, assistantPlaceholder]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedMessages }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`Request failed: ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        // Replace the last (placeholder) assistant message with accumulated text
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: 'assistant', content: accumulated },
        ]);
      }
    } catch (err) {
      console.error('Chat error:', err);
      setMessages((prev) => [
        ...prev.slice(0, -1),
        {
          role: 'assistant',
          content:
            'I encountered an error. Please try again. If the problem persists, refresh the page.',
        },
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
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
        <div className="max-w-3xl mx-auto">
          <h1 className="text-xl font-semibold tracking-tight">Veritas Navigator</h1>
          <p className="text-blue-200 text-sm mt-0.5">Michigan Civil Dispute Navigation</p>
        </div>
      </header>

      {/* Message thread */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
          {messages.map((msg, i) => (
            <MessageBubble key={i} message={msg} />
          ))}
          {isLoading && messages[messages.length - 1]?.content === '' && (
            <TypingIndicator />
          )}
          <div ref={bottomRef} />
        </div>
      </main>

      {/* Input area + disclosure footer */}
      <footer className="border-t border-gray-200 bg-white flex-shrink-0">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <form onSubmit={sendMessage} className="flex items-end gap-3">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe your situation or answer the question above…"
              rows={2}
              disabled={isLoading}
              className="flex-1 resize-none rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-veritas-teal focus:border-transparent disabled:opacity-50 disabled:bg-gray-50"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="rounded-lg bg-veritas-teal hover:bg-teal-700 text-white px-5 py-3 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
            >
              {isLoading ? 'Sending…' : 'Send'}
            </button>
          </form>

          {/* Tier 1 persistent disclosure — always visible, never generated by AI */}
          <p className="mt-2 text-center text-xs text-gray-400 leading-tight">
            Veritas Navigator is not a law firm and does not provide legal advice.
            This is a navigation and document-organization tool.
          </p>
        </div>
      </footer>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
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
      <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-white border border-gray-200 text-gray-800 px-4 py-3 text-sm leading-relaxed shadow-sm">
        {message.content ? (
          <Prose text={message.content} />
        ) : (
          <TypingDots />
        )}
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

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="rounded-2xl rounded-tl-sm bg-white border border-gray-200 px-4 py-3 shadow-sm">
        <TypingDots />
      </div>
    </div>
  );
}
