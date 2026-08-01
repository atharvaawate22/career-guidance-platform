"use client";

import { useEffect, useRef, useState } from "react";
import { API_BASE_URL } from "@/lib/apiBaseUrl";

interface QuickReply {
  value: string;
  label: string;
}

interface ChatMessage {
  role: "bot" | "user";
  text: string;
  quickReplies?: QuickReply[];
}

const TEASER_DELAY_MS = 2200;
const SESSION_ID_KEY = "avani_session_id";
const TEASER_DISMISSED_KEY = "avani_teaser_dismissed";
const OPENED_KEY = "avani_opened";

function IconChat() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

function IconClose({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

/**
 * Avani's avatar — the indigo→teal duotone (the site's own dual brand
 * palette, not a generic single-color widget accent) in the display serif
 * used for brand moments elsewhere on the site (hero heading, gradient-clip
 * text), so the mark reads as part of CET Hub rather than a bolted-on
 * plugin. See globals.css "Indigo + Teal Academic Theme".
 */
function Avatar({ size = 32 }: { size?: number }) {
  return (
    <div
      className="rounded-full flex items-center justify-center text-white shrink-0"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.44),
        fontFamily: "var(--font-display)",
        background: "linear-gradient(135deg, var(--primary-500), var(--accent-500))",
        boxShadow: "0 0 0 2px rgba(255,255,255,0.7), 0 2px 6px rgba(15,23,42,0.15)",
      }}
    >
      A
    </div>
  );
}

function getOrCreateSessionId(): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    let id = sessionStorage.getItem(SESSION_ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(SESSION_ID_KEY, id);
    }
    return id;
  } catch {
    return undefined;
  }
}

async function sendChatMessage(
  message: string,
  sessionId?: string,
): Promise<{ text: string; quickReplies?: QuickReply[] }> {
  const r = await fetch(`${API_BASE_URL}/api/v1/chatbot/message`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, ...(sessionId ? { sessionId } : {}) }),
  });
  const d = await r.json();
  if (!d.success) throw new Error(d.error?.message || "Chat request failed");
  return { text: d.data.text, quickReplies: d.data.quickReplies };
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [showTeaser, setShowTeaser] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState<string | undefined>(getOrCreateSessionId);
  // Drives the launcher's sonar-ping ring — a quiet "there's something new
  // here" cue, not a permanent decoration. Fades out the moment the visitor
  // engages (opens the chat or dismisses the teaser) so it never nags a
  // returning or already-chatting visitor.
  const [neverEngaged, setNeverEngaged] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    let alreadySeen = false;
    try {
      alreadySeen = sessionStorage.getItem(OPENED_KEY) === "1" || sessionStorage.getItem(TEASER_DISMISSED_KEY) === "1";
    } catch {
      alreadySeen = false;
    }
    if (alreadySeen) return;
    setNeverEngaged(true);
    const timer = setTimeout(() => setShowTeaser(true), TEASER_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  const markOpened = () => {
    try {
      sessionStorage.setItem(OPENED_KEY, "1");
    } catch {
      // Best-effort — not opening on repeat visits is a minor cosmetic gap, not worth failing over.
    }
  };

  const dismissTeaser = () => {
    setShowTeaser(false);
    setNeverEngaged(false);
    try {
      sessionStorage.setItem(TEASER_DISMISSED_KEY, "1");
    } catch {
      // See markOpened.
    }
  };

  const openFromTeaser = () => {
    setShowTeaser(false);
    setNeverEngaged(false);
    markOpened();
    setOpen(true);
  };

  const toggleOpen = () => {
    setShowTeaser(false);
    setNeverEngaged(false);
    if (!open) markOpened();
    setOpen((v) => !v);
  };

  useEffect(() => {
    if (open && !startedRef.current) {
      startedRef.current = true;
      setLoading(true);
      sendChatMessage("menu", sessionId)
        .then((reply) => setMessages([{ role: "bot", text: reply.text, quickReplies: reply.quickReplies }]))
        .catch(() =>
          setMessages([{ role: "bot", text: "Sorry, I couldn't connect. Please try again in a moment." }]),
        )
        .finally(() => setLoading(false));
    }
  }, [open, sessionId]);

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
      const reply = await sendChatMessage(trimmed, sessionId);
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
      {showTeaser && !open && (
        <div className="fixed bottom-24 right-5 z-50 max-w-[260px] animate-fade-up">
          <div
            role="button"
            tabIndex={0}
            onClick={openFromTeaser}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") openFromTeaser();
            }}
            className="relative overflow-hidden rounded-2xl rounded-br-sm px-4 py-3.5 pr-7 text-sm leading-relaxed cursor-pointer"
            style={{
              background: "var(--bg-primary)",
              border: "1px solid var(--slate-200)",
              boxShadow: "0 8px 28px rgba(15,23,42,0.16), 0 0 0 1px rgba(99,102,241,0.03)",
              color: "var(--slate-800)",
            }}
          >
            {/* Faint teal glow bleeding from the corner — the same "mesh orb"
                accent language the hero uses, scaled down to a card. */}
            <div
              aria-hidden
              className="absolute -top-10 -right-10 w-24 h-24 rounded-full pointer-events-none"
              style={{ background: "radial-gradient(circle, var(--accent-300), transparent 70%)", opacity: 0.35 }}
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                dismissTeaser();
              }}
              aria-label="Dismiss"
              className="absolute top-1.5 right-1.5 w-5 h-5 flex items-center justify-center rounded-full transition-colors z-10"
              style={{ color: "var(--slate-400)" }}
            >
              <IconClose size={12} />
            </button>
            <div className="relative flex items-center gap-2 mb-1.5">
              <Avatar size={22} />
              <span className="text-xs font-semibold tracking-wide" style={{ fontFamily: "var(--font-display)", color: "var(--primary-700)" }}>
                Avani
              </span>
            </div>
            <span className="relative">Hello, I&apos;m Avani. How can I help with your MHT-CET admission questions?</span>
          </div>
        </div>
      )}

      <div className="fixed bottom-5 right-5 z-50">
        {neverEngaged && !open && (
          <span
            aria-hidden
            className="absolute inset-0 rounded-full animate-ping-ring"
            style={{ background: "linear-gradient(135deg, var(--primary-500), var(--accent-500))" }}
          />
        )}
        <button
          onClick={toggleOpen}
          aria-label={open ? "Close chat" : "Open chat with Avani"}
          aria-expanded={open}
          className="relative w-14 h-14 rounded-full flex items-center justify-center text-white transition-all duration-200 hover:scale-105 active:scale-95"
          style={{
            background: "linear-gradient(135deg, var(--primary-500), var(--primary-700) 60%, var(--accent-600))",
            boxShadow: "0 4px 20px rgba(79,70,229,0.4), 0 0 0 1px rgba(255,255,255,0.08) inset",
          }}
        >
          {open ? <IconClose /> : <IconChat />}
        </button>
      </div>

      {open && (
        <div
          role="dialog"
          aria-label="Avani, CET Hub's admissions assistant"
          className="fixed bottom-24 right-5 z-50 w-[92vw] max-w-[380px] rounded-2xl flex flex-col overflow-hidden animate-scale-in"
          style={{
            height: "min(70vh, 560px)",
            background: "var(--bg-primary)",
            border: "1px solid var(--slate-200)",
            boxShadow: "0 12px 40px rgba(15,23,42,0.18)",
          }}
        >
          {/* Header — the hero's own dark indigo→slate gradient plus a
              corner mesh-orb glow and faint grid, scaled down, so the panel
              reads as a CET Hub surface rather than a generic widget shell. */}
          <div
            className="relative overflow-hidden px-4 py-3.5 flex items-center justify-between shrink-0"
            style={{ background: "linear-gradient(135deg, var(--primary-900), var(--slate-900) 65%, var(--primary-800))" }}
          >
            <div
              aria-hidden
              className="absolute -top-8 -right-6 w-28 h-28 rounded-full pointer-events-none"
              style={{ background: "radial-gradient(circle, var(--accent-500), transparent 70%)", opacity: 0.25 }}
            />
            <div
              aria-hidden
              className="absolute inset-0 pointer-events-none opacity-[0.05]"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)",
                backgroundSize: "18px 18px",
              }}
            />
            <div className="relative flex items-center gap-2.5">
              <div className="relative shrink-0">
                <Avatar size={36} />
                <span
                  className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full animate-pulse-dot"
                  style={{ background: "#22c55e", border: "2px solid var(--primary-900)", boxShadow: "0 0 6px rgba(34,197,94,0.6)" }}
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-white leading-tight" style={{ fontFamily: "var(--font-display)" }}>
                  Avani
                </p>
                <p className="text-[11px] text-white/70 leading-tight">Your MHT-CET admissions guide</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="relative text-white/80 hover:text-white transition-colors"
            >
              <IconClose />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4 space-y-3" style={{ background: "var(--bg-secondary)" }}>
            {messages.map((m, i) => (
              <div key={i} className={`flex items-end gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                {m.role === "bot" && <Avatar size={24} />}
                <div className="max-w-[80%]">
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
                          key={qr.value}
                          onClick={() => handleSend(qr.value)}
                          disabled={loading}
                          className="px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors disabled:opacity-50 hover:brightness-95"
                          style={{ background: "var(--accent-50)", color: "var(--accent-700)", border: "1px solid var(--accent-200)" }}
                        >
                          {qr.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-end gap-2 justify-start">
                <Avatar size={24} />
                <div className="px-3.5 py-2.5 rounded-2xl" style={{ background: "var(--bg-primary)", border: "1px solid var(--slate-200)", borderBottomLeftRadius: 4 }}>
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "var(--slate-400)", animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "var(--slate-400)", animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "var(--slate-400)", animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
          </div>

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
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 disabled:opacity-50 transition-all hover:brightness-105"
              style={{
                background: "linear-gradient(135deg, var(--primary-500), var(--primary-600))",
                boxShadow: "0 2px 8px rgba(79,70,229,0.35)",
              }}
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
