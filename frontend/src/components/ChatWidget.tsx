"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { publicPost } from "@/lib/api";
import { CUTOFF_YEAR } from "@/lib/dataYear";
import { useFocusOnOpen } from "@/hooks/useFocusManagement";

/**
 * Public routes Avani points people at. Rendering them as plain text meant a
 * reply like "Use the College Predictor at /predictor" ended in a dead end —
 * the student had to read the path and navigate by hand. Only this fixed set is
 * linkified, so nothing a model or an admin-authored FAQ emits can turn into an
 * arbitrary outbound link.
 *
 * /book is intentionally excluded: all booking slots are currently greyed out
 * (platform not accepting new meetings), so linking students there would set a
 * false expectation. Re-add it here once real booking is available.
 */
const LINKABLE_ROUTES = /(\/(?:cutoffs|predictor|updates|guides|resources))\b/g;
const isLinkableRoute = (part: string) =>
  /^\/(?:cutoffs|predictor|updates|guides|resources)$/.test(part);

function renderMessageText(text: string, onNavigate: () => void) {
  // split() with a capturing group keeps the delimiters, so the route tokens
  // come back as their own array entries and surrounding whitespace (which
  // whitespace-pre-line renders) is preserved exactly.
  return text.split(LINKABLE_ROUTES).map((part, i) =>
    isLinkableRoute(part) ? (
      <Link
        key={i}
        href={part}
        onClick={onNavigate}
        className="underline underline-offset-[3px] decoration-[1.5px] font-semibold"
        style={{ color: "var(--primary-700)" }}
      >
        {part}
      </Link>
    ) : (
      part
    ),
  );
}

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

function IconClose({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconSend() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 2L11 13" />
      <path d="M22 2L15 22l-4-9-9-4 20-7z" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function IconBook() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

/**
 * Avani's mark — the indigo→teal duotone (the site's own dual brand palette)
 * in the display serif used for brand moments elsewhere (hero heading,
 * gradient-clip text), so the mark reads as CET Hub rather than a bolted-on
 * plugin. See globals.css "Indigo + Teal Academic Theme".
 */
function Avatar({ size = 32 }: { size?: number }) {
  return (
    <div
      className="rounded-full flex items-center justify-center text-white shrink-0"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.42),
        fontFamily: "var(--font-display)",
        letterSpacing: "0.02em",
        background: "linear-gradient(145deg, var(--primary-500) 0%, var(--primary-700) 52%, var(--accent-600) 100%)",
        boxShadow: "0 0 0 1.5px rgba(255,255,255,0.85), 0 1px 2px rgba(15,23,42,0.12)",
      }}
      aria-hidden
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
  const r = await publicPost("/api/v1/chatbot/message", {
    message,
    ...(sessionId ? { sessionId } : {}),
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
  // Synchronous guard against double-submit. React state (`loading`) can't
  // prevent a race on rapid Enter/double-click because setLoading(true) only
  // takes effect after the re-render; a ref flip is synchronous and catches
  // the second submit before the first render cycle fires.
  const submittingRef = useRef(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Move focus into the message input when the panel opens and hand it back to
  // the launcher on close. Deliberately NOT a focus trap: the panel is
  // non-modal (no backdrop, page stays usable), so confining Tab to it would
  // strand a keyboard user inside a widget they can otherwise ignore. That is
  // also why there is no aria-modal here — claiming it would tell screen
  // readers the rest of the page is inert, which is false.
  useFocusOnOpen(open, panelRef, inputRef);

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

  const closePanel = useCallback(() => setOpen(false), []);

  // Escape closes the panel, matching every other dismissible surface on the
  // site (Modal, SlideOver, the select popups).
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePanel();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, closePanel]);

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
    if (!trimmed || loading || submittingRef.current) return;
    submittingRef.current = true;
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
      submittingRef.current = false;
    }
  };

  const initialLoad = loading && messages.length === 0;

  return (
    <>
      {showTeaser && !open && (
        <div
          className="fixed z-50 w-[min(92vw,320px)] animate-fade-up"
          style={{
            right: "max(1.25rem, env(safe-area-inset-right))",
            bottom: "calc(6.75rem + env(safe-area-inset-bottom, 0px))",
          }}
        >
          {/* The card itself is a plain container. The open and dismiss
              actions are SIBLING <button>s, not nested — this used to be a
              role="button" div wrapping a real <button>, which is invalid
              (interactive content inside an interactive element) and leaves
              assistive tech to guess which control it is looking at. */}
          <div
            className="relative overflow-hidden"
            style={{
              background: "var(--bg-primary)",
              border: "1px solid rgba(226,232,240,0.95)",
              borderRadius: "0.85rem",
              boxShadow: "0 18px 48px rgba(15,23,42,0.14), 0 2px 8px rgba(15,23,42,0.06)",
              color: "var(--slate-800)",
            }}
          >
            <div
              aria-hidden
              className="h-[3px] w-full"
              style={{ background: "linear-gradient(90deg, var(--primary-500), var(--accent-500))" }}
            />
            <button
              type="button"
              onClick={openFromTeaser}
              className="relative block w-full text-left px-4 pt-3.5 pb-4 pr-9 cursor-pointer"
            >
              <span className="flex items-center gap-2.5 mb-2.5">
                <Avatar size={28} />
                <span className="min-w-0">
                  <span className="block text-[13px] leading-none" style={{ fontFamily: "var(--font-display)", color: "var(--slate-900)" }}>
                    Avani
                  </span>
                  <span className="mt-1 block text-[10px] font-medium uppercase tracking-[0.12em]" style={{ color: "var(--slate-500)" }}>
                    CET Hub | Admissions
                  </span>
                </span>
              </span>
              <span className="block text-[13.5px] leading-relaxed" style={{ color: "var(--slate-700)" }}>
                Hello, I can help you read cutoffs, CAP dates, and document requirements with calm, evidence-led guidance.
              </span>
            </button>
            <button
              type="button"
              onClick={dismissTeaser}
              aria-label="Dismiss Avani's message"
              className="avani-icon-btn absolute top-3 right-2 z-10"
            >
              <IconClose size={13} />
            </button>
          </div>
        </div>
      )}

      <div
        className="fixed z-[60]"
        style={{
          right: "max(1.25rem, env(safe-area-inset-right))",
          bottom: "max(1.25rem, env(safe-area-inset-bottom))",
        }}
      >
        {neverEngaged && !open && (
          <span
            aria-hidden
            className="absolute left-1.5 top-1.5 w-11 h-11 rounded-full animate-ping-ring pointer-events-none"
            style={{ background: "linear-gradient(135deg, var(--primary-400), var(--accent-400))" }}
          />
        )}
        <button
          onClick={toggleOpen}
          aria-label={open ? "Close chat" : "Open chat with Avani"}
          aria-expanded={open}
          data-open={open ? "true" : "false"}
          className="avani-launcher relative"
        >
          {open ? (
            <span className="w-11 h-11 rounded-full flex items-center justify-center" style={{ color: "var(--slate-700)" }}>
              <IconClose size={18} />
            </span>
          ) : (
            <>
              <Avatar size={44} />
              <span className="hidden sm:flex flex-col items-start pr-1 py-0.5">
                <span className="text-[13px] font-semibold leading-tight tracking-tight" style={{ color: "var(--slate-900)" }}>
                  Ask Avani
                </span>
                <span className="text-[10.5px] leading-tight mt-0.5" style={{ color: "var(--slate-500)" }}>
                  CET admissions
                </span>
              </span>
            </>
          )}
        </button>
      </div>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Avani, CET Hub's admissions assistant"
          className="fixed z-50 w-[min(92vw,420px)] flex flex-col overflow-hidden animate-scale-in"
          style={{
            right: "max(1.25rem, env(safe-area-inset-right))",
            bottom: "calc(6.75rem + env(safe-area-inset-bottom, 0px))",
            height: "min(610px, calc(100dvh - 8rem - env(safe-area-inset-bottom, 0px)))",
            background: "var(--bg-primary)",
            border: "1px solid var(--slate-200)",
            borderRadius: "0.9rem",
            boxShadow: "0 28px 72px rgba(15,23,42,0.2), 0 0 0 1px rgba(15,23,42,0.03)",
          }}
        >
          <div
            aria-hidden
            className="h-[3px] shrink-0"
            style={{ background: "linear-gradient(90deg, var(--primary-500), var(--accent-500))" }}
          />

          <div className="relative shrink-0" style={{ background: "var(--bg-primary)", borderBottom: "1px solid var(--slate-100)" }}>
            <div className="px-4 py-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative shrink-0">
                  <Avatar size={42} />
                  <span
                    className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full"
                    style={{ background: "var(--success)", border: "2px solid #fff", boxShadow: "0 0 0 1px rgba(16,185,129,0.35)" }}
                    title="Available"
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-[15px] leading-none text-[var(--slate-900)]" style={{ fontFamily: "var(--font-display)" }}>
                    Avani
                  </p>
                  <p className="mt-1.5 text-[11.5px] leading-tight truncate" style={{ color: "var(--slate-500)" }}>
                    Academic admissions assistant
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="avani-trust-pill hidden sm:inline-flex">
                  <IconBook />
                  Official records
                </span>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close chat"
                  className="avani-icon-btn shrink-0"
                >
                  <IconClose />
                </button>
              </div>
            </div>
            <div className="px-4 pb-3">
              <div className="avani-context-strip">
                <span>MHT-CET</span>
                <span>CAP counselling</span>
                <span>{CUTOFF_YEAR} cutoffs</span>
              </div>
            </div>
          </div>

          {/* role="log" + aria-live make Avani's replies actually reach a
              screen reader. Without this the panel was silent: a blind user
              could type a question and get no indication an answer had
              arrived, because nothing announced the appended message.
              aria-relevant="additions" keeps it to new messages rather than
              re-reading the whole transcript on every render. */}
          <div
            ref={scrollRef}
            role="log"
            aria-live="polite"
            aria-relevant="additions"
            aria-label="Conversation with Avani"
            className="avani-thread flex-1 overflow-y-auto px-3.5 py-4 space-y-3.5"
          >
            {initialLoad && (
              <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center px-8">
                <Avatar size={52} />
                <p className="mt-4 text-lg leading-none" style={{ fontFamily: "var(--font-display)", color: "var(--slate-900)" }}>
                  Avani
                </p>
                <p className="mt-2 text-[13px] leading-relaxed max-w-[240px]" style={{ color: "var(--slate-500)" }}>
                  Preparing guidance from official {CUTOFF_YEAR} CAP records...
                </p>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`avani-msg-in flex items-end gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                {m.role === "bot" && <Avatar size={26} />}
                <div className="max-w-[82%]">
                  <div
                    className="px-3.5 py-2.5 text-[13.5px] leading-[1.55] whitespace-pre-line"
                    style={
                      m.role === "user"
                        ? {
                            background: "linear-gradient(160deg, var(--primary-600), var(--primary-800))",
                            color: "#fff",
                            borderRadius: "1rem 1rem 0.3rem 1rem",
                            boxShadow: "0 4px 12px rgba(67,56,202,0.2)",
                          }
                        : {
                            background: "var(--bg-primary)",
                            color: "var(--slate-800)",
                            border: "1px solid var(--slate-200)",
                            borderRadius: "1rem 1rem 1rem 0.3rem",
                            boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
                          }
                    }
                  >
                    {m.role === "bot" ? renderMessageText(m.text, closePanel) : m.text}
                  </div>
                  {m.quickReplies && m.quickReplies.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {m.quickReplies.map((qr) => (
                        <button
                          key={qr.value}
                          onClick={() => handleSend(qr.value)}
                          disabled={loading}
                          className="avani-chip"
                        >
                          {qr.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && messages.length > 0 && (
              <div className="flex items-end gap-2 justify-start" role="status" aria-label="Avani is typing">
                <Avatar size={26} />
                <div
                  className="px-3.5 py-3"
                  style={{
                    background: "var(--bg-primary)",
                    border: "1px solid var(--slate-200)",
                    borderRadius: "1rem 1rem 1rem 0.3rem",
                  }}
                >
                  <div className="flex gap-1 items-center h-3">
                    <span className="avani-dot" style={{ animationDelay: "0ms" }} />
                    <span className="avani-dot" style={{ animationDelay: "160ms" }} />
                    <span className="avani-dot" style={{ animationDelay: "320ms" }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
            className="shrink-0 px-3 pt-3 pb-2"
            style={{ borderTop: "1px solid var(--slate-100)", background: "var(--bg-primary)" }}
          >
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                aria-label="Type your question for Avani"
                placeholder="Ask about cutoffs, CAP dates, documents..."
                maxLength={500}
                // Deliberately NOT disabled while loading. The panel fires a
                // "menu" request the instant it opens, so a loading-disabled
                // input was unfocusable exactly when focus was being moved into
                // it — the greeting round trip silently swallowed the focus move
                // and left keyboard users stranded on the launcher. Letting
                // people compose while Avani is replying is also just better;
                // handleSend still guards against concurrent submits, and the
                // send button below stays disabled.
                className="avani-composer flex-1"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                aria-label="Send"
                className="avani-send"
              >
                <IconSend />
              </button>
            </div>
            <p className="flex items-center justify-center gap-1.5 mt-2 mb-0.5 text-[10.5px] leading-snug" style={{ color: "var(--slate-400)" }}>
              <span style={{ color: "var(--accent-600)" }}><IconShield /></span>
              Grounded in official {CUTOFF_YEAR} CAP records | guidance, not a guarantee
            </p>
          </form>
        </div>
      )}
    </>
  );
}
