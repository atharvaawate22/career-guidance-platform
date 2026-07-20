/** The two delivery channels the shared decision service can be called from. */
export type ChatChannel = 'website' | 'whatsapp';

/** A quick-reply option shown to the student (numbered on WhatsApp, buttons on web). */
export interface ChatQuickReply {
  /** The digit the student can type/tap to select this option (matches MENU_OPTIONS order). */
  number: number;
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
