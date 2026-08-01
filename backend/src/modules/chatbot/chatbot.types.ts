/** The two delivery channels the shared decision service can be called from. */
export type ChatChannel = 'website' | 'whatsapp';

/**
 * A quick-reply option shown to the student — buttons on the web widget
 * (WhatsApp has no interactive-button rendering here, so these are website
 * only; a WhatsApp user reaches the same outcome by typing `value` as text).
 */
export interface ChatQuickReply {
  /** The text sent to getReply() when this option is picked — must independently route to the right intent, since the bot is otherwise stateless per-message. */
  value: string;
  /** What the button displays. */
  label: string;
}

/**
 * The channel-agnostic reply produced by chatbot.service.getReply(). Both the
 * website controller and the WhatsApp webhook render this into their own
 * output format — this shape itself carries no channel-specific concerns.
 */
export interface ChatReply {
  /** Plain-text reply body. WhatsApp sends this as-is; the web widget renders it as a message bubble. */
  text: string;
  /** Optional numbered quick replies to show alongside the text. */
  quickReplies?: ChatQuickReply[];
  /** True when the message matched a known intent; false when it fell through to the fallback (and was logged). */
  matched: boolean;
}

export interface ChatRequest {
  message: string;
  /** Per-channel contact identifier used only for unanswered-query logging (wa_id for WhatsApp, absent for the anonymous web widget). */
  contactIdentifier?: string;
}
