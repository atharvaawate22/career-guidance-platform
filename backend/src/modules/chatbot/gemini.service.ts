/**
 * Grounded-generation adapter for the RAG path — mirrors the mock-mode
 * pattern in whatsapp.service.ts / email.service.ts: when GEMINI_API_KEY
 * isn't set, this logs and returns null instead of throwing, so the rest of
 * the pipeline (retrieval, confidence floor, defer/fallback) stays testable
 * without a live key. Once a key is set, generation actually runs.
 *
 * The hard grounding rule lives in the pipeline (retrieval confidence floor
 * in chatbot.service.ts + the strict systemInstruction below), not just in
 * the model's judgment. A safety-blocked or empty response is treated as a
 * failure to answer, never surfaced as an error — the caller falls back to
 * the same defer/fallback path as a below-floor retrieval.
 */
import logger from '../../utils/logger';
import { RagChunkMatch } from './chatbot.repository';

/**
 * Model name — deliberately NOT gemini-2.5-flash, despite that being what
 * CHATBOT_ARCHITECTURE.md originally named. Verified live against this
 * project's actual API key (2026-07-23): gemini-2.5-flash and
 * gemini-2.5-flash-lite both 404 with "no longer available to new users";
 * gemini-2.0-flash is deprecated (shuts down 2026-06-01) and 429s on this
 * key. gemini-3.5-flash is the one that actually returns 200, and Google's
 * pricing docs confirm it has a free tier (free input/output tokens, with
 * the same "may be used to improve products" caveat the architecture doc
 * already discloses for the Gemini free tier generally).
 */
const MODEL = 'gemini-3.5-flash';

const SYSTEM_INSTRUCTION =
  "You are Avani, a warm and genuinely helpful admissions guide for Maharashtra " +
  'MHT-CET engineering CAP (Centralized Admission Process). You\'re talking to a ' +
  'stressed-out 17-18 year old and their parents, so sound like a knowledgeable ' +
  "senior who's been through this, not a corporate FAQ bot — friendly, encouraging, " +
  'plain conversational language, contractions are fine. Answer the student\'s ' +
  'question using ONLY the context chunks provided in the user message below — ' +
  'never use your own outside knowledge of CAP or admissions. Never state a date, ' +
  'fee, or number unless it appears verbatim in the provided context. If the ' +
  "context doesn't contain enough to answer confidently, say so plainly and warmly " +
  'in one sentence and point the student to /updates for official notices or ' +
  'booking a free consultation at /book — do not guess, speculate, or fill gaps ' +
  'from general knowledge; a wrong number is worse than an honest "I\'m not sure". ' +
  'Keep the answer concise (2-5 sentences) and suitable for a WhatsApp or website ' +
  'chat reply.';

export function isGenerationConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

function buildUserPrompt(question: string, chunks: RagChunkMatch[]): string {
  const context = chunks
    .map((c) => `[${c.topicLabel}]\n${c.content}`)
    .join('\n\n');
  return `Context:\n${context}\n\nStudent question: ${question}`;
}

/**
 * Returns the grounded answer text, or null if generation is unconfigured,
 * fails, is safety-blocked, or comes back empty — the caller treats null as
 * "RAG couldn't answer" and falls through to defer/fallback.
 */
export async function generateGroundedAnswer(
  question: string,
  chunks: RagChunkMatch[],
): Promise<string | null> {
  if (!isGenerationConfigured()) {
    logger.warn('[gemini] GEMINI_API_KEY not set — skipping generation (RAG defers)');
    return null;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`;

  // A live test during implementation hung well past what's acceptable for a
  // chat reply (Gemini's free tier can be slow/overloaded — a 503 "high
  // demand" was observed in the same session). Bound it with an abort
  // timeout so a slow or hanging provider call can't stall the whole chatbot
  // request indefinitely; a timeout is treated the same as any other
  // generation failure — log and return null, caller falls through to defer.
  const GENERATION_TIMEOUT_MS = 10_000;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GENERATION_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
        contents: [{ role: 'user', parts: [{ text: buildUserPrompt(question, chunks) }] }],
        generationConfig: {
          // Low thinking budget: this is a short grounded answer over ~5
          // retrieved chunks, not a task that benefits from extended
          // reasoning.
          thinkingConfig: { thinkingBudget: 0 },
          temperature: 0.2,
          maxOutputTokens: 400,
        },
      }),
    });

    if (!res.ok) {
      logger.error('[gemini] generation request failed', {
        status: res.status,
        body: await res.text().catch(() => ''),
      });
      return null;
    }

    const data = await res.json();

    if (data.promptFeedback?.blockReason) {
      logger.warn('[gemini] prompt blocked by safety filter', {
        blockReason: data.promptFeedback.blockReason,
      });
      return null;
    }

    const candidate = data.candidates?.[0];
    if (!candidate) {
      logger.warn('[gemini] no candidates in response');
      return null;
    }
    if (candidate.finishReason && candidate.finishReason !== 'STOP') {
      logger.warn('[gemini] generation did not finish normally', {
        finishReason: candidate.finishReason,
      });
      return null;
    }

    const text = (candidate.content?.parts ?? [])
      .map((p: { text?: string }) => p.text ?? '')
      .join('')
      .trim();

    if (!text) {
      logger.warn('[gemini] empty generation response');
      return null;
    }

    return text;
  } catch (error) {
    if (controller.signal.aborted) {
      logger.error('[gemini] generation timed out', { timeoutMs: GENERATION_TIMEOUT_MS });
    } else {
      logger.error('[gemini] generation error', error);
    }
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
