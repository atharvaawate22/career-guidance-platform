import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  scoreFaqsMock,
  searchCollegesByNameMock,
  searchCollegesByTrigramMock,
  searchCollegesByCodeMock,
  searchCollegesByTokenSimilarityMock,
  getCutoffAnswerMock,
  getCapScheduleMock,
  getDocumentChecklistMock,
  getFeeScheduleMock,
  searchRagChunksMock,
  logUnansweredQueryMock,
  generateGroundedAnswerMock,
  getLatestUpdatesMock,
} = vi.hoisted(() => ({
  scoreFaqsMock: vi.fn(),
  searchCollegesByNameMock: vi.fn(),
  searchCollegesByTrigramMock: vi.fn(),
  searchCollegesByCodeMock: vi.fn(),
  searchCollegesByTokenSimilarityMock: vi.fn(),
  getCutoffAnswerMock: vi.fn(),
  getCapScheduleMock: vi.fn(),
  getDocumentChecklistMock: vi.fn(),
  getFeeScheduleMock: vi.fn(),
  searchRagChunksMock: vi.fn(),
  logUnansweredQueryMock: vi.fn(),
  generateGroundedAnswerMock: vi.fn(),
  getLatestUpdatesMock: vi.fn(),
}));

vi.mock('../src/modules/chatbot/chatbot.repository', () => ({
  scoreFaqs: scoreFaqsMock,
  searchCollegesByName: searchCollegesByNameMock,
  searchCollegesByTrigram: searchCollegesByTrigramMock,
  searchCollegesByCode: searchCollegesByCodeMock,
  searchCollegesByTokenSimilarity: searchCollegesByTokenSimilarityMock,
  getCutoffAnswer: getCutoffAnswerMock,
  getCapSchedule: getCapScheduleMock,
  getDocumentChecklist: getDocumentChecklistMock,
  getFeeSchedule: getFeeScheduleMock,
  searchRagChunks: searchRagChunksMock,
  logUnansweredQuery: logUnansweredQueryMock,
  getLatestUpdates: getLatestUpdatesMock,
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
  searchCollegesByCodeMock.mockResolvedValue([]);
  searchCollegesByTokenSimilarityMock.mockResolvedValue([]);
  getCutoffAnswerMock.mockResolvedValue([]);
  getCapScheduleMock.mockResolvedValue([]);
  getDocumentChecklistMock.mockResolvedValue([]);
  getFeeScheduleMock.mockResolvedValue([]);
  searchRagChunksMock.mockResolvedValue([]);
  logUnansweredQueryMock.mockResolvedValue(undefined);
  generateGroundedAnswerMock.mockResolvedValue(null);
  getLatestUpdatesMock.mockResolvedValue([]);
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

describe('college name resolution', () => {
  it('resolves by institute code before attempting any name match', async () => {
    searchCollegesByCodeMock.mockResolvedValue([
      { college_code: '06834', name: 'Dr.D.Y.Patil College Of Engineering & Innovation,Talegaon' },
    ]);
    getCutoffAnswerMock.mockResolvedValue([
      { college_name: 'Dr.D.Y.Patil College Of Engineering & Innovation,Talegaon', branch: 'Computer Engineering', cap_round: 1, percentile: 90.1 },
    ]);

    const reply = await getReply('06834 dy pati collengg innovation talegaon cutoff cs branch', 'website');

    expect(searchCollegesByCodeMock).toHaveBeenCalledWith('06834');
    expect(searchCollegesByNameMock).not.toHaveBeenCalled();
    expect(reply.text).toContain('90.1');
  });

  it('falls back to token-similarity fuzzy matching for a typo/partial college name', async () => {
    searchCollegesByNameMock.mockResolvedValue([]);
    searchCollegesByTokenSimilarityMock.mockResolvedValue([
      { college_code: '06756', name: 'Fabtech Technical Campus College of Engineering and Research, Sangola', score: 0.82 },
      { college_code: '06301', name: 'Some Other College of Engineering, Sangli', score: 0.4 },
    ]);
    getCutoffAnswerMock.mockResolvedValue([
      { college_name: 'Fabtech Technical Campus College of Engineering and Research, Sangola', branch: 'Computer Engineering', cap_round: 1, percentile: 78.4 },
    ]);

    const reply = await getReply('cutoff for fabtech engineering college of sangola computer', 'website');

    expect(reply.text).toContain('78.4');
  });

  it('does not guess when the fuzzy top match has no clear margin over the runner-up', async () => {
    searchCollegesByNameMock.mockResolvedValue([]);
    searchCollegesByTokenSimilarityMock.mockResolvedValue([
      { college_code: '01', name: 'A College of Engineering, Latur', score: 0.65 },
      { college_code: '02', name: 'B College of Engineering, Latur', score: 0.6 },
    ]);

    const reply = await getReply('cutoff for latur college computer', 'website');

    expect(getCutoffAnswerMock).not.toHaveBeenCalled();
    expect(reply.text).toMatch(/which college/i);
  });

  it('does not run the fuzzy fallback when nothing in the hint is distinguishing', async () => {
    searchCollegesByNameMock.mockResolvedValue([]);

    const reply = await getReply('cutoff for computer engineering', 'website');

    expect(searchCollegesByTokenSimilarityMock).not.toHaveBeenCalled();
    expect(searchCollegesByNameMock).not.toHaveBeenCalled();
    expect(reply.text).toMatch(/which college/i);
  });

  it('shows the full shortlist for a substring hint with a small number of real matches', async () => {
    searchCollegesByNameMock.mockResolvedValue([
      { college_code: '01', name: 'A College of Engineering, Latur' },
      { college_code: '02', name: 'B College of Engineering, Latur' },
      { college_code: '03', name: 'C College of Engineering, Latur' },
    ]);

    const reply = await getReply('cutoff for latur college computer', 'website');

    expect(reply.text).toContain('A College of Engineering, Latur');
    expect(reply.text).toContain('B College of Engineering, Latur');
    expect(reply.text).toContain('C College of Engineering, Latur');
  });

  it('asks for a more specific name instead of an arbitrary partial list when a substring hint is too broad', async () => {
    // Six rows back from a MAX_NAME_MATCHES(5)+1 fetch signals "more than 5
    // real matches exist" — a bare place name like "pune" alone, not a
    // genuinely short candidate set.
    searchCollegesByNameMock.mockResolvedValue([
      { college_code: '01', name: 'One College, Pune' },
      { college_code: '02', name: 'Two College, Pune' },
      { college_code: '03', name: 'Three College, Pune' },
      { college_code: '04', name: 'Four College, Pune' },
      { college_code: '05', name: 'Five College, Pune' },
      { college_code: '06', name: 'Six College, Pune' },
    ]);

    const reply = await getReply('cutoff for pune college computer', 'website');

    expect(getCutoffAnswerMock).not.toHaveBeenCalled();
    expect(searchCollegesByTokenSimilarityMock).not.toHaveBeenCalled();
    expect(reply.text).toMatch(/which college/i);
    expect(reply.text).not.toContain('College, Pune');
  });
});

describe('DY Patil (a genuinely ambiguous acronym across 8 colleges)', () => {
  it('resolves directly when the message names one distinguishing campus', async () => {
    searchCollegesByNameMock.mockResolvedValue([
      { college_code: '06272', name: "Dr. D. Y. Patil Pratishthan's D.Y.Patil College of Engineering Akurdi, Pune" },
    ]);
    getCutoffAnswerMock.mockResolvedValue([
      { college_name: "Dr. D. Y. Patil Pratishthan's D.Y.Patil College of Engineering Akurdi, Pune", branch: 'Computer Engineering', cap_round: 1, percentile: 91.2 },
    ]);

    const reply = await getReply('cutoff for dy patil akurdi computer', 'website');

    expect(reply.text).toContain('91.2');
  });

  it('prompts with all 8 campuses when nothing distinguishes one', async () => {
    const reply = await getReply('cutoff for dy patil', 'website');

    expect(reply.text).toMatch(/could mean a few different colleges/i);
    expect(reply.text).toContain('Akurdi');
    expect(reply.text).toContain('Talegaon');
    expect(getCutoffAnswerMock).not.toHaveBeenCalled();
  });

  it('prompts rather than guesses when two different campus keywords both appear', async () => {
    // Real message: "aissms mmcoe dy patil pimpari" — "pimpri"/"pimpari" and an
    // MMCOE mention together don't distinguish a single DY Patil campus.
    const reply = await getReply('cutoff for dyp akurdi pimpri computer', 'website');

    expect(reply.text).toMatch(/could mean a few different colleges/i);
    expect(getCutoffAnswerMock).not.toHaveBeenCalled();
  });

  it('resolves the "dyp" (no space) spelling the same way as "dy patil"', async () => {
    searchCollegesByNameMock.mockResolvedValue([
      { college_code: '06834', name: 'Dr.D.Y.Patil College Of Engineering & Innovation,Talegaon' },
    ]);
    getCutoffAnswerMock.mockResolvedValue([
      { college_name: 'Dr.D.Y.Patil College Of Engineering & Innovation,Talegaon', branch: 'Computer Engineering', cap_round: 1, percentile: 89.9 },
    ]);

    const reply = await getReply('cutoff for dyp innovation talegaon computer', 'website');

    expect(reply.text).toContain('89.9');
  });

  it('an explicit institute code wins over the ambiguous-acronym prompt', async () => {
    searchCollegesByCodeMock.mockResolvedValue([
      { college_code: '06991', name: 'Dr. D.Y. Patil Technical Campus, Varale, Talegaon, Pune' },
    ]);
    getCutoffAnswerMock.mockResolvedValue([
      { college_name: 'Dr. D.Y. Patil Technical Campus, Varale, Talegaon, Pune', branch: 'Computer Engineering', cap_round: 1, percentile: 84.3 },
    ]);

    const reply = await getReply('cutoff for 06991 dy patil pune computer', 'website');

    expect(reply.text).not.toMatch(/which one did you mean/i);
    expect(reply.text).toContain('84.3');
    expect(searchCollegesByNameMock).not.toHaveBeenCalled();
  });
});

describe('AISSMS (an acronym not spelled out in either college\'s name)', () => {
  it('prompts with both AISSMS colleges when nothing distinguishes one', async () => {
    const reply = await getReply('cutoff for aissms computer', 'website');

    expect(reply.text).toMatch(/could mean a few different colleges/i);
    expect(reply.text).toContain('AISSMS College of Engineering');
    expect(reply.text).toContain('AISSMS Institute of Information Technology');
    expect(getCutoffAnswerMock).not.toHaveBeenCalled();
  });

  it('resolves directly when the message names the Institute of Information Technology campus', async () => {
    searchCollegesByNameMock.mockResolvedValue([
      { college_code: '06282', name: "All India Shri Shivaji Memorial Society's Institute of Information Technology,Pune" },
    ]);
    getCutoffAnswerMock.mockResolvedValue([
      { college_name: "All India Shri Shivaji Memorial Society's Institute of Information Technology,Pune", branch: 'Information Technology', cap_round: 1, percentile: 85.6 },
    ]);

    const reply = await getReply('cutoff for aissms information technology computer', 'website');

    expect(reply.text).toContain('85.6');
  });
});

describe('Sinhgad (10 colleges, exceeding the substring tier\'s own shortlist cap)', () => {
  it('prompts with all 10 campuses when nothing distinguishes one', async () => {
    const reply = await getReply('cutoff for sinhgad computer', 'website');

    expect(reply.text).toMatch(/could mean a few different colleges/i);
    expect(reply.text).toContain('Kegaon');
    expect(reply.text).toContain('Kusgaon');
    expect(getCutoffAnswerMock).not.toHaveBeenCalled();
  });

  it('resolves directly when the message names one campus', async () => {
    searchCollegesByNameMock.mockResolvedValue([
      { college_code: '06178', name: "Sinhgad Technical Education Society's Smt. Kashibai Navale College of Engineering,Vadgaon,Pune" },
    ]);
    getCutoffAnswerMock.mockResolvedValue([
      { college_name: "Sinhgad Technical Education Society's Smt. Kashibai Navale College of Engineering,Vadgaon,Pune", branch: 'Computer Engineering', cap_round: 1, percentile: 94.7 },
    ]);

    const reply = await getReply('cutoff for sinhgad kashibai navale computer', 'website');

    expect(reply.text).toContain('94.7');
  });
});

describe('GECA alias', () => {
  it('resolves the renamed-city acronym to its one college', async () => {
    searchCollegesByNameMock.mockResolvedValue([
      { college_code: '02008', name: 'Government College of Engineering, Chhatrapati Sambhajinagar' },
    ]);
    getCutoffAnswerMock.mockResolvedValue([
      { college_name: 'Government College of Engineering, Chhatrapati Sambhajinagar', branch: 'Computer Engineering', cap_round: 1, percentile: 88.8 },
    ]);

    const reply = await getReply('cutoff for geca computer', 'website');

    expect(reply.text).toContain('88.8');
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

describe('cap schedule fallback logic', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('says the schedule hasn\'t been released if dates are unconfirmed and it is before September', async () => {
    vi.setSystemTime(new Date(2026, 6, 15));
    getCapScheduleMock.mockResolvedValue([
      { is_confirmed: false, cap_round: 1, event_name: 'Registration' },
    ]);

    const reply = await getReply('when is cap round 1', 'website');
    expect(reply.text).toContain('hasn\'t been released');
  });

  it('says the season has concluded if dates are unconfirmed and it is September or later', async () => {
    vi.setSystemTime(new Date(2026, 8, 15));
    getCapScheduleMock.mockResolvedValue([
      { is_confirmed: false, cap_round: 1, event_name: 'Registration' },
    ]);

    const reply = await getReply('when is cap round 1', 'website');
    expect(reply.text).toContain('season has concluded');
  });

  it('gives the final dates when every confirmed date is in the past', async () => {
    vi.setSystemTime(new Date(2026, 8, 19));
    getCapScheduleMock.mockResolvedValue([
      { is_confirmed: true, cap_round: 2, event_name: 'Seat Allotment Result', start_date: '2026-08-12', end_date: '2026-08-12' },
      { is_confirmed: true, cap_round: 2, event_name: 'Reporting & Fee Payment', start_date: '2026-08-13', end_date: '2026-08-18' },
    ]);

    const reply = await getReply('when is cap round 2', 'website');
    expect(reply.text).toContain('season has concluded');
    expect(reply.text).toContain('Round 2 — Seat Allotment Result: 12 Aug 2026');
    expect(reply.text).toContain('13 Aug 2026 to 18 Aug 2026');
  });

  it('does not claim the season concluded while confirmed dates are still ahead', async () => {
    vi.setSystemTime(new Date(2026, 7, 10));
    getCapScheduleMock.mockResolvedValue([
      { is_confirmed: true, cap_round: 3, event_name: 'Seat Allotment Result', start_date: '2026-08-24', end_date: '2026-08-24' },
    ]);

    const reply = await getReply('when is cap round 3', 'website');
    expect(reply.text).not.toContain('concluded');
    expect(reply.text).toContain('Round 3 — Seat Allotment Result: 24 Aug 2026');
  });
});

describe('score shared in chat is sent to the predictor', () => {
  it.each([
    '85.34% obc',
    '72 persentile, sebc category, home university pune',
    'rank 48971 obc entc',
    '82.71,general,cse',
  ])('%p points the candidate to /predictor', async (message) => {
    const reply = await getReply(message, 'website');
    expect(reply.text).toContain('/predictor');
    expect(getCutoffAnswerMock).not.toHaveBeenCalled();
  });

  it('leaves a cutoff lookup alone even when it mentions a percentile figure', async () => {
    const reply = await getReply('cutoff for coep cs 95 percentile', 'website');
    expect(reply.text).not.toContain('Thanks for sharing your score');
  });
});

describe('seat acceptance fee', () => {
  it('says the fee is paid once at the first acceptance when only one amount is confirmed', async () => {
    getFeeScheduleMock.mockResolvedValue([
      { seat_sequence: 1, label: '1st seat accepted', amount_inr: 1000, is_confirmed: true, source_url: 'https://example.test/notice' },
      { seat_sequence: 2, label: '2nd seat accepted', amount_inr: 2000, is_confirmed: false, source_url: null },
    ]);

    const reply = await getReply('what is the seat acceptance fee', 'website');
    expect(reply.text).toContain('₹1,000');
    expect(reply.text).toContain('once');
    expect(reply.text).not.toContain('₹2,000');
  });
});

describe('latest updates intent', () => {
  it('returns recent notices when requested', async () => {
    getLatestUpdatesMock.mockResolvedValue([
      { title: 'Notice 1', published_date: 'Sep 10, 2026' },
      { title: 'Notice 2', published_date: 'Sep 09, 2026' },
    ]);

    const reply = await getReply('what is the latest update', 'website');
    expect(reply.text).toContain('Notice 1');
    expect(reply.text).toContain('Notice 2');
    expect(getLatestUpdatesMock).toHaveBeenCalledWith(3);
  });

  it('returns a fallback message if no updates are found', async () => {
    getLatestUpdatesMock.mockResolvedValue([]);

    const reply = await getReply('what is the latest update', 'website');
    expect(reply.text).toContain('no recent updates');
  });
});

