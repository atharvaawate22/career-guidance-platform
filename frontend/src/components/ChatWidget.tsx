"use client";

import { useEffect, useRef, useState } from "react";
import { API_BASE_URL } from "@/lib/apiBaseUrl";
import { buildWaMeLink } from "@/lib/whatsapp";

interface QuickReply {
  number: number;
  label: string;
}

interface ChatMessage {
  role: "bot" | "user";
  text: string;
  quickReplies?: QuickReply[];
}

function IconChat() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconWhatsApp() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.29-1.39a9.9 9.9 0 0 0 4.7 1.2h.01c5.46 0 9.9-4.45 9.9-9.9C21.96 6.45 17.5 2 12.04 2zm5.8 14.06c-.24.68-1.4 1.3-1.94 1.38-.5.08-1.12.11-1.8-.11-.42-.13-.96-.31-1.65-.6-2.9-1.25-4.8-4.17-4.94-4.36-.14-.19-1.18-1.57-1.18-3 0-1.42.75-2.12 1.01-2.41.27-.29.58-.36.78-.36l.56.01c.18 0 .42-.07.65.5.24.58.82 2 .89 2.15.07.15.12.32.02.51-.1.19-.15.31-.29.48-.15.17-.31.38-.44.51-.15.15-.3.31-.13.6.17.29.76 1.26 1.64 2.04 1.13 1 2.08 1.32 2.37 1.47.29.15.46.13.63-.08.17-.2.72-.84.92-1.13.19-.29.39-.24.65-.14.27.1 1.69.8 1.98.94.29.15.48.22.55.34.07.13.07.75-.17 1.43z" />
    </svg>
  );
}

async function sendChatMessage(message: string): Promise<{ text: string; quickReplies?: QuickReply[] }> {
  const r = await fetch(`${API_BASE_URL}/api/v1/chatbot/message`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  const d = await r.json();
  if (!d.success) throw new Error(d.error?.message || "Chat request failed");
  return { text: d.data.text, quickReplies: d.data.quickReplies };
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [waLink, setWaLink] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/v1/settings/contact-info`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data?.phone) {
          setWaLink(buildWaMeLink(d.data.phone, "Hi! I have a question about MHT-CET admissions."));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (open && !startedRef.current) {
      startedRef.current = true;
      setLoading(true);
      sendChatMessage("menu")
        .then((reply) => setMessages([{ role: "bot", text: reply.text, quickReplies: reply.quickReplies }]))
        .catch(() =>
          setMessages([{ role: "bot", text: "Sorry, I couldn't connect. Please try again in a moment." }]),
        )
        .finally(() => setLoading(false));
    }
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
    setInput("");
    setLoading(true);
    try {
      const reply = await sendChatMessage(trimmed);
      setMessages((prev) => [...prev, { role: "bot", text: reply.text, quickReplies: reply.quickReplies }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: "Sorry, something went wrong. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close chat" : "Open chat"}
        aria-expanded={open}
        className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full flex items-center justify-center text-white transition-all duration-200 hover:scale-105 active:scale-95"
        style={{
          background: "linear-gradient(135deg, var(--primary-600), var(--primary-700))",
          boxShadow: "0 4px 20px rgba(79,70,229,0.4)",
        }}
      >
        {open ? <IconClose /> : <IconChat />}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="CET Hub chat assistant"
          className="fixed bottom-24 right-5 z-50 w-[92vw] max-w-[380px] rounded-2xl flex flex-col overflow-hidden animate-scale-in"
          style={{
            height: "min(70vh, 560px)",
            background: "var(--bg-primary)",
            border: "1px solid var(--slate-200)",
            boxShadow: "0 12px 40px rgba(15,23,42,0.18)",
          }}
        >
          {/* Header */}
          <div
            className="px-4 py-3.5 flex items-center justify-between shrink-0"
            style={{ background: "linear-gradient(135deg, var(--primary-600), var(--primary-700))" }}
          >
            <div>
              <p className="text-sm font-semibold text-white">CET Hub Assistant</p>
              <p className="text-[11px] text-white/75">Cutoffs · CAP dates · documents</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="text-white/80 hover:text-white transition-colors"
            >
              <IconClose />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4 space-y-3" style={{ background: "var(--bg-secondary)" }}>
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className="max-w-[85%]">
                  <div
                    className="px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-line"
                    style={
                      m.role === "user"
                        ? { background: "var(--primary-600)", color: "#fff", borderBottomRightRadius: 4 }
                        : { background: "var(--bg-primary)", color: "var(--slate-800)", border: "1px solid var(--slate-200)", borderBottomLeftRadius: 4 }
                    }
                  >
                    {m.text}
                  </div>
                  {m.quickReplies && m.quickReplies.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {m.quickReplies.map((qr) => (
                        <button
                          key={qr.number}
                          onClick={() => handleSend(String(qr.number))}
                          disabled={loading}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                          style={{ background: "var(--primary-50)", color: "var(--primary-700)", border: "1px solid var(--primary-200)" }}
                        >
                          {qr.number}. {qr.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="px-3.5 py-2.5 rounded-2xl" style={{ background: "var(--bg-primary)", border: "1px solid var(--slate-200)" }}>
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "var(--slate-400)", animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "var(--slate-400)", animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "var(--slate-400)", animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* WhatsApp CTA — always visible, not part of the message list */}
          {waLink && (
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mx-3 mb-2 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold shrink-0 transition-colors"
              style={{ background: "#25D36615", color: "#128C7E", border: "1px solid #25D36640" }}
            >
              <IconWhatsApp />
              Continue on WhatsApp
            </a>
          )}

          {/* Input */}
          <form
            onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
            className="flex items-center gap-2 p-3 shrink-0"
            style={{ borderTop: "1px solid var(--slate-200)" }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your question..."
              maxLength={500}
              disabled={loading}
              className="flex-1 px-3.5 py-2.5 rounded-xl text-sm outline-none disabled:opacity-60"
              style={{ background: "var(--bg-secondary)", border: "1px solid var(--slate-200)", color: "var(--slate-900)" }}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label="Send"
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 disabled:opacity-50 transition-opacity"
              style={{ background: "var(--primary-600)" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          </form>
        </div>
      )}
    </>
  );
}
