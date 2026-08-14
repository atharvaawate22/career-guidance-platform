import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  scoreFaqsMock,
  searchCollegesByNameMock,
  searchCollegesByTrigramMock,
  getCutoffAnswerMock,
  getCapScheduleMock,
  getDocumentChecklistMock,
  getFeeScheduleMock,
  searchRagChunksMock,
  logUnansweredQueryMock,
  generateGroundedAnswerMock,
} = vi.hoisted(() => ({
  scoreFaqsMock: vi.fn(),
  searchCollegesByNameMock: vi.fn(),
  searchCollegesByTrigramMock: vi.fn(),
  getCutoffAnswerMock: vi.fn(),
  getCapScheduleMock: vi.fn(),
  getDocumentChecklistMock: vi.fn(),
  getFeeScheduleMock: vi.fn(),
  searchRagChunksMock: vi.fn(),
  logUnansweredQueryMock: vi.fn(),
  generateGroundedAnswerMock: vi.fn(),
}));

vi.mock('../src/modules/chatbot/chatbot.repository', () => ({
  scoreFaqs: scoreFaqsMock,
  searchCollegesByName: searchCollegesByNameMock,
  searchCollegesByTrigram: searchCollegesByTrigramMock,
  getCutoffAnswer: getCutoffAnswerMock,
  getCapSchedule: getCapScheduleMock,
  getDocumentChecklist: getDocumentChecklistMock,
  getFeeSchedule: getFeeScheduleMock,
  searchRagChunks: searchRagChunksMock,
  logUnansweredQuery: logUnansweredQueryMock,
}));

vi.mock('../src/modules/chatbot/gemini.service', () => ({
  generateGroundedAnswer: generateGroundedAnswerMock,
  isGenerationConfigured: () => false,
}));

import { getReply } from '../src/modules/chatbot/chatbot.service';

/**
 * The chatbot router carries roughly fifteen hard-won routing decisions, each
 * documented in chatbot.service.ts with the specific question that motivated
 * it — predictor-before-cutoff ordering, the raw/filtered FAQ agreement rule,
 * the word_similarity rescue for short queries, the bare-slot follow-up path.
 * Every one of those was tuned against real measured scores, and none of them
 * had a test. They are exactly the behaviours a future refactor breaks
 * silently, because nothing about the code makes the ordering look load-bearing.
 *
 * Each case below names the decision it pins rather than just asserting an
 * output, so a failure says which rule was violated.
 */

/** No FAQ matches at all — the default for tests about the keyword router. */
const noFaqMatch = () => [
  { question: 'Unrelated FAQ', answer: 'Unrelated answer', sim_raw: 0.01, sim_filtered: 0.01, wsim_filtered: 0.01 },
];

/** One FAQ that both the raw and filtered forms agree on, at a given score. */
const agreeingFaq = (question: string, answer: string, score: number) => [
  { question, answer, sim_raw: score, sim_filtered: score, wsim_filtered: score },
];

beforeEach(() => {
  vi.clearAllMocks();
  scoreFaqsMock.mockResolvedValue(noFaqMatch());
  searchCollegesByNameMock.mockResolvedValue([]);
  searchCollegesByTrigramMock.mockResolvedValue([]);
  getCutoffAnswerMock.mockResolvedValue([]);
  getCapScheduleMock.mockResolvedValue([]);
  getDocumentChecklistMock.mockResolvedValue([]);
  getFeeScheduleMock.mockResolvedValue([]);
  searchRagChunksMock.mockResolvedValue([]);
  logUnansweredQueryMock.mockResolvedValue(undefined);
  generateGroundedAnswerMock.mockResolvedValue(null);
});

describe('menu and numeric shortcuts', () => {
  it.each(['hi', 'hello', 'menu', 'help', 'start', 'options', ''])(
    '%p opens the root menu',
    async (message) => {
      const reply = await getReply(message, 'website');
      expect(reply.matched).toBe(true);
      expect(reply.quickReplies?.length).toBeGreaterThan(0);
    },
  );

  // The root menu numbers are globally fixed and never nested, which is what
  // lets a bare "1"-"6" be understood without remembering what was shown.
  it('routes a bare 4 to the predictor without touching the FAQ table', async () => {
    const reply = await getReply('4', 'website');
    expect(reply.text).toContain('/predictor');
    expect(scoreFaqsMock).not.toHaveBeenCalled();
  });

  it('routes a bare 3 to the document checklist', async () => {
    getDocumentChecklistMock.mockResolvedValue([
      { document_name: 'CET scorecard', description: null },
    ]);
    const reply = await getReply('3', 'website');
    expect(reply.text).toContain('CET scorecard');
  });
});

describe('keyword router ordering', () => {
  /**
   * PREDICTOR is checked before CUTOFF deliberately. This question contains
   * "percentile", which also trips the cutoff pattern; before the reorder it
   * dead-ended on "Which college?" despite being exactly what the predictor
   * answers.
   */
  it('sends "which college can I get with 95 percentile" to the predictor, not the cutoff lookup', async () => {
    const reply = await getReply('which college can i get with 95 percentile', 'website');

    expect(reply.text).toContain('/predictor');
    expect(getCutoffAnswerMock).not.toHaveBeenCalled();
  });

  it('still sends a genuine cutoff lookup to the cutoff path', async () => {
    searchCollegesByNameMock.mockResolvedValue([
      { college_code: '16006', name: 'COEP Technological University' },
    ]);
    getCutoffAnswerMock.mockResolvedValue([
      { college_name: 'COEP Technological University', branch: 'Computer Engineering', cap_round: 1, percentile: 99.5 },
    ]);

    const reply = await getReply('cutoff for coep computer', 'website');

    expect(getCutoffAnswerMock).toHaveBeenCalled();
    expect(reply.text).toContain('99.5');
  });

  it('asks which college when a cutoff question names none', async () => {
    const reply = await getReply('what is the cutoff', 'website');
    expect(reply.text).toMatch(/which college/i);
  });
});

describe('FAQ confidence rules', () => {
  /**
   * A confident FAQ overrides a matched keyword intent. "difference between
   * percentile and percentage" contains "percentile" and used to be answered
   * with a nonsensical "Which college?" despite having an exact FAQ entry.
   * FAQ_OVERRIDE_CONFIDENCE is 0.35.
   */
  it('lets a confident FAQ override a keyword intent', async () => {
    scoreFaqsMock.mockResolvedValue(
      agreeingFaq('What is the difference between percentile and percentage?', 'Percentile is a rank position.', 0.65),
    );

    const reply = await getReply('what is the difference between percentile and percentage', 'website');

    expect(reply.text).toBe('Percentile is a rank position.');
    expect(getCutoffAnswerMock).not.toHaveBeenCalled();
  });

  it('does NOT let a weak FAQ hijack a structured lookup', async () => {
    scoreFaqsMock.mockResolvedValue(
      agreeingFaq('Some loosely related FAQ', 'Loosely related answer', 0.2),
    );
    searchCollegesByNameMock.mockResolvedValue([
      { college_code: '03012', name: 'VJTI' },
    ]);

    const reply = await getReply('cutoff for vjti mechanical', 'website');

    expect(reply.text).not.toBe('Loosely related answer');
    expect(getCutoffAnswerMock).toHaveBeenCalled();
  });

  /**
   * When the raw and filtered forms disagree, trust the FILTERED one. Raw text
   * lets shared boilerplate dominate — that is how "difference between float
   * and freeze" landed on the e-Scrutiny FAQ (0.364) instead of the correct
   * Freeze/Float/Slide one (0.274). Taking max() across both forms would
   * reintroduce exactly that bug.
   */
  it('trusts the filtered form when raw and filtered disagree', async () => {
    scoreFaqsMock.mockResolvedValue([
      { question: 'What is e-Scrutiny?', answer: 'WRONG — e-scrutiny answer', sim_raw: 0.364, sim_filtered: 0.1, wsim_filtered: 0.2 },
      { question: 'What is Freeze, Float and Slide?', answer: 'RIGHT — float/freeze answer', sim_raw: 0.2, sim_filtered: 0.274, wsim_filtered: 0.3 },
    ]);

    const reply = await getReply('what is the difference between float and freeze', 'website');

    expect(reply.text).toBe('RIGHT — float/freeze answer');
  });

  /**
   * similarity() is length-normalised, so a short query is diluted by the long
   * FAQ question around it: "what is TFWS" scores only 0.125 against
   * "What is the Tuition Fee Waiver Scheme (TFWS)?" and falls through the
   * fallback despite being an exact hit. word_similarity() scores it 1.000.
   * WORD_SIM_RESCUE is 0.7.
   */
  it('rescues a short exact-ish query the length-normalised score misses', async () => {
    scoreFaqsMock.mockResolvedValue([
      { question: 'What is the Tuition Fee Waiver Scheme (TFWS)?', answer: 'TFWS waives tuition fees.', sim_raw: 0.125, sim_filtered: 0.125, wsim_filtered: 1.0 },
    ]);

    const reply = await getReply('what is tfws', 'website');

    expect(reply.text).toBe('TFWS waives tuition fees.');
  });

  /**
   * The rescue must not fire on a query made only of generic domain words —
   * word_similarity scores "college" at 1.000 against any FAQ mentioning it.
   */
  it('does not let the rescue fire on generic domain words alone', async () => {
    scoreFaqsMock.mockResolvedValue([
      { question: 'How reliable is the College Predictor?', answer: 'SHOULD NOT BE USED', sim_raw: 0.1, sim_filtered: 0.1, wsim_filtered: 1.0 },
    ]);

    const reply = await getReply('the college', 'website');

    expect(reply.text).not.toBe('SHOULD NOT BE USED');
  });

  /**
   * The rescue is consulted only when NO keyword intent matched — its
   * generosity would otherwise let a structured lookup match on a shared
   * substring and hijack the intent.
   */
  it('never consults the rescue when a keyword intent matched', async () => {
    scoreFaqsMock.mockResolvedValue([
      { question: 'Anything about cutoffs', answer: 'SHOULD NOT BE USED', sim_raw: 0.1, sim_filtered: 0.1, wsim_filtered: 1.0 },
    ]);
    searchCollegesByNameMock.mockResolvedValue([
      { college_code: '16006', name: 'COEP Technological University' },
    ]);

    const reply = await getReply('cutoff for coep computer', 'website');

    expect(reply.text).not.toBe('SHOULD NOT BE USED');
  });
});

describe('guardrails', () => {
  // Personalised recommendations are never answered from static content.
  it.each([
    'which branch is best for me',
    'should i pick cs or it',
    'can you recommend a college',
    'what is best college for my rank',
  ])('defers %p to the predictor', async (message) => {
    const reply = await getReply(message, 'website');
    expect(reply.text).toContain('/predictor');
  });

  // Narrow on purpose: this must NOT swallow a genuine mechanics question.
  it('does not treat "should i float or freeze" as a personalised recommendation', async () => {
    scoreFaqsMock.mockResolvedValue(
      agreeingFaq('What is Freeze, Float and Slide?', 'Freeze keeps your seat.', 0.5),
    );

    const reply = await getReply('should i float or freeze', 'website');

    expect(reply.text).toBe('Freeze keeps your seat.');
  });
});

describe('off-topic redirects', () => {
  it.each(['tell me a joke', 'know any jokes'])('redirects %p', async (message) => {
    const reply = await getReply(message, 'website');
    expect(reply.matched).toBe(true);
    expect(logUnansweredQueryMock).not.toHaveBeenCalled();
  });

  it('answers an identity question directly', async () => {
    const reply = await getReply('are you a bot', 'website');
    expect(reply.text).toContain('Avani');
  });

  /**
   * MATH_PATTERN deliberately excludes "-" as an operator so a year range like
   * "2024-2025" in a cutoff question cannot false-positive as subtraction.
   */
  it('redirects arithmetic but not a year range', async () => {
    const mathReply = await getReply('what is 2+2', 'website');
    expect(mathReply.text).toMatch(/arithmetic/i);

    searchCollegesByNameMock.mockResolvedValue([
      { college_code: '16006', name: 'COEP Technological University' },
    ]);
    const yearReply = await getReply('cutoff for coep computer 2024-2025', 'website');
    expect(yearReply.text).not.toMatch(/arithmetic/i);
  });
});

describe('fallback', () => {
  it('logs an unanswered query and returns the menu when nothing matches', async () => {
    const reply = await getReply('what is the capital of mongolia', 'website', 'user-1');

    expect(logUnansweredQueryMock).toHaveBeenCalledWith(
      'website',
      'what is the capital of mongolia',
      'user-1',
    );
    expect(reply.matched).toBe(false);
    expect(reply.quickReplies?.length).toBeGreaterThan(0);
  });

  // RAG is the last resort, and defers rather than guessing on a weak match:
  // RAG_CONFIDENCE_FLOOR is 0.85.
  it('does not generate from a below-floor retrieval', async () => {
    searchRagChunksMock.mockResolvedValue([
      { topicLabel: 'Seat mechanics', sourceSection: 's1', content: 'text', similarity: 0.7 },
    ]);

    const reply = await getReply('some uncovered conceptual question', 'website');

    expect(generateGroundedAnswerMock).not.toHaveBeenCalled();
    expect(reply.matched).toBe(false);
  });

  it('answers from RAG when retrieval clears the floor', async () => {
    searchRagChunksMock.mockResolvedValue([
      { topicLabel: 'Seat mechanics', sourceSection: 's1', content: 'text', similarity: 0.92 },
    ]);
    generateGroundedAnswerMock.mockResolvedValue('A grounded answer.');

    const reply = await getReply('some uncovered conceptual question', 'website');

    expect(reply.text).toBe('A grounded answer.');
    expect(reply.matched).toBe(true);
    expect(logUnansweredQueryMock).not.toHaveBeenCalled();
  });
});
