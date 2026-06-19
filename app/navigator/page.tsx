"use client";

import { useState, useRef, useEffect, FormEvent } from "react";
import Link from "next/link";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface DocumentReady {
  templateId: string;
  fields: Record<string, string>;
}

const WELCOME: Message = {
  role: "assistant",
  content:
    "Hello — I'm the Veritas Navigator. I'm here to help you understand your situation and prepare the right document.\n\nPlease tell me what's going on in your own words. There's no wrong way to start — just describe what's happening.",
};

function parseDocumentReady(text: string): DocumentReady | null {
  const match = text.match(/DOCUMENT_READY:(\{.*\})/s);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

function stripDocumentReady(text: string): string {
  return text.replace(/DOCUMENT_READY:\{.*\}/s, "").trim();
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  const displayText = isUser ? msg.content : stripDocumentReady(msg.content);

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-navy flex items-center justify-center text-gold text-xs font-black mr-2 mt-1 flex-shrink-0">
          V
        </div>
      )}
      <div
        className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? "bg-navy text-white rounded-tr-sm"
            : "bg-white border border-vborder text-vtext rounded-tl-sm ai-message"
        }`}
        dangerouslySetInnerHTML={{
          __html: isUser
            ? displayText
            : displayText
                .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                .replace(/\*(.*?)\*/g, "<em>$1</em>")
                .replace(/^- (.+)$/gm, "<li>$1</li>")
                .replace(/(<li>.*<\/li>)/s, "<ul>$1</ul>")
                .replace(/⚠️/g, '<span class="text-amber-600">⚠️</span>')
                .replace(/\n/g, "<br/>"),
        }}
      />
    </div>
  );
}

function DocumentReadyCard({
  doc,
  onDownload,
}: {
  doc: DocumentReady;
  onDownload: () => void;
}) {
  return (
    <div className="mx-auto max-w-sm my-4 bg-white border-2 border-gold rounded-xl p-5 text-center shadow-sm">
      <div className="text-3xl mb-2">📄</div>
      <div className="font-black text-navy text-sm mb-1">Document Ready</div>
      <div className="text-xs text-sub mb-4">
        Your document has been prepared and is ready to download.
      </div>
      <button
        onClick={onDownload}
        className="w-full bg-gold text-black font-bold text-sm py-2.5 rounded-lg hover:opacity-90 transition-opacity"
      >
        Download / Print PDF →
      </button>
      <p className="text-xs text-sub mt-3 italic">
        Not legal advice · Veritas Systems Group LLC
      </p>
    </div>
  );
}

export default function NavigatorPage() {
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [docReady, setDocReady] = useState<DocumentReady | null>(null);
  const [apiError, setApiError] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const newMessages: Message[] = [
      ...messages,
      { role: "user", content: text },
    ];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setApiError(false);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (res.status === 503) {
          setApiError(true);
        }
        throw new Error(err.error ?? "API error");
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "" },
      ]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        assistantText += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: assistantText,
          };
          return updated;
        });
      }

      const ready = parseDocumentReady(assistantText);
      if (ready) {
        setDocReady(ready);
      }
    } catch (err) {
      console.error(err);
      if (!apiError) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "I'm having trouble connecting right now. Please try again in a moment.",
          },
        ]);
      }
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(e as unknown as FormEvent);
    }
  }

  async function handleDownload() {
    if (!docReady) return;
    const res = await fetch("/api/documents/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(docReady),
    });
    const html = await res.text();
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  }

  return (
    <div className="flex flex-col h-screen bg-cream">
      {/* Header */}
      <header className="bg-navy px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-gold opacity-60 hover:opacity-100 text-xs">
            ← Home
          </Link>
          <div>
            <div className="text-gold font-black text-xs tracking-widest">VERITAS NAVIGATOR</div>
            <div className="text-white opacity-30 text-xs">Document Preparation Assistant</div>
          </div>
        </div>
        <div className="text-white opacity-20 text-xs hidden sm:block">
          Not legal advice · Michigan
        </div>
      </header>

      {/* API Key warning banner */}
      {apiError && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-800">
          ⚠️ <strong>API key not configured.</strong> Add your Anthropic API key to{" "}
          <code className="bg-amber-100 px-1 rounded">.env.local</code> to enable the AI.{" "}
          See <code>.env.local</code> for instructions.
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 chat-scroll">
        <div className="max-w-2xl mx-auto">
          {messages.map((msg, i) => (
            <MessageBubble key={i} msg={msg} />
          ))}

          {loading && (
            <div className="flex justify-start mb-4">
              <div className="w-7 h-7 rounded-full bg-navy flex items-center justify-center text-gold text-xs font-black mr-2 mt-1 flex-shrink-0">
                V
              </div>
              <div className="bg-white border border-vborder rounded-2xl rounded-tl-sm px-4 py-3">
                <span className="inline-flex gap-1">
                  <span className="w-1.5 h-1.5 bg-sub rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 bg-sub rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 bg-sub rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </span>
              </div>
            </div>
          )}

          {docReady && !loading && (
            <DocumentReadyCard doc={docReady} onDownload={handleDownload} />
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-vborder bg-white px-4 py-3">
        <div className="max-w-2xl mx-auto">
          <form onSubmit={sendMessage} className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe your situation..."
              rows={2}
              className="flex-1 resize-none border border-vborder rounded-xl px-4 py-3 text-sm text-vtext placeholder:text-sub focus:outline-none focus:border-navy transition-colors leading-relaxed"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="bg-navy text-white font-bold text-sm px-5 py-3 rounded-xl hover:bg-steel transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 self-end"
            >
              Send
            </button>
          </form>
          <p className="text-xs text-sub mt-2 text-center">
            Press Enter to send · Shift+Enter for new line · Not legal advice
          </p>
        </div>
      </div>
    </div>
  );
}
