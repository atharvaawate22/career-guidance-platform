/**
 * One-time (re-runnable) ingestion of the Phase 2 RAG corpus into
 * rag_chunks. Embeds all 10 chunks in a single batched call to the `embed`
 * Supabase Edge Function (gte-small, 384-dim) and upserts by topic_label, so
 * re-running after an edit to a chunk's text updates that row in place
 * instead of appending a duplicate.
 *
 * Source text: docs/rag-source-content.md (CAP 2026 Process Guide §3-4).
 * Chunk boundaries reviewed and approved against that source — see
 * CHATBOT_ARCHITECTURE.md §3.5 item 2.
 *
 * Run from backend/:  npx ts-node scripts/ingest_rag_chunks.ts
 */
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import { Pool } from 'pg';

interface ChunkSeed {
  topicLabel: string;
  sourceSection: string;
  content: string;
}

const CHUNKS: ChunkSeed[] = [
  {
    topicLabel: 'freeze',
    sourceSection: '§3',
    content:
      'Topic: Freeze (CAP option)\n' +
      "Freeze means the student is satisfied with the seat they've been allotted in this round and it is their final decision. Choosing Freeze exits the CAP process entirely — there are no further rounds for this student. The next step is to pay the seat acceptance fee and report to the allotted college to complete admission.",
  },
  {
    topicLabel: 'float',
    sourceSection: '§3',
    content:
      'Topic: Float (CAP option)\n' +
      'Float means the student accepts their currently allotted seat as a fallback but wants a better college-branch combination in a later round. Choosing Float keeps the student in the running for Round 2 (and beyond). If the system finds something better, the current seat is automatically cancelled and replaced with the upgrade. If nothing better comes through, the student keeps the seat they already had — floating never removes a seat that was already allotted, provided the seat acceptance fee has been paid.',
  },
  {
    topicLabel: 'slide',
    sourceSection: '§3',
    content:
      'Topic: Slide (CAP option)\n' +
      "Slide works the same way as Float, but it's scoped to a single college: the student is asking the system to try for a better branch within the same college they're already allotted to, rather than opening the search to other colleges too. As with Float, if no better branch comes through, the student keeps their current seat at that college.",
  },
  {
    topicLabel: 'seat-floor-guarantee',
    sourceSection: '§3',
    content:
      'Topic: Float/Slide seat-floor guarantee — do I lose my seat?\n' +
      "Choosing Float or Slide never risks losing the seat a student already has. If no upgrade is found in a later round, the student's original allotment stands exactly as it was — it is not cancelled or downgraded. The seat is only replaced if the system actually finds an eligible, better option; otherwise everything continues as already allotted. This protection depends on having paid the seat acceptance fee for that seat.",
  },
  {
    topicLabel: 'auto-freeze-trap',
    sourceSection: '§3',
    content:
      'Topic: The Auto-Freeze trap — why did I get locked into my #1 choice?\n' +
      'If a student lists a college and branch as their #1 preference on the option form and the system actually allots that #1 choice, CAP automatically freezes it — there is no floating or sliding option, and no choice in the matter at that point, even if the student would have preferred to keep trying for something else. Because of this, a preference should only be placed at #1 if the student is 100% certain they want it, even if it isn\'t their most ambitious "reach" choice. A common and costly mistake is ranking a dream-but-uncertain college/branch at #1 and getting auto-locked into it as soon as it\'s allotted.',
  },
  {
    topicLabel: 'choice-count-guidance',
    sourceSection: '§4',
    content:
      'Topic: How many choices to fill on the option form\n' +
      'Students can fill up to 300 choices on the CAP option form, though most students realistically fill somewhere between 20 and 60. The general guidance is to fill at least 15–20 choices as a minimum to maximize the chances of a good outcome across all rounds — under-filling the option form is one of the most common regrets students report after CAP.',
  },
  {
    topicLabel: 'order-is-priority',
    sourceSection: '§4',
    content:
      'Topic: Choice order means priority, not just best-to-worst by cutoff\n' +
      'The order in which choices are listed on the option form is the priority order the CAP algorithm follows — it is not simply a ranking of "best to worst" by cutoff. In each round, the algorithm processes the list from top to bottom and allots the highest-ranked choice on the list that the student is actually eligible for in that round. This is why the position of a choice on the list matters as much as which colleges/branches are on it.',
  },
  {
    topicLabel: 'more-choices-is-flexibility',
    sourceSection: '§4',
    content:
      'Topic: Filling more choices increases flexibility, not risk\n' +
      'Adding more choices to the option form does not increase risk — it only increases flexibility. A longer list does not lock a student into a worse outcome; it simply gives the CAP algorithm more options to try on the student\'s behalf. There is no downside to listing additional eligible choices further down the list, since the algorithm only ever allots the highest-ranked one the student qualifies for.',
  },
  {
    topicLabel: 'between-rounds-editing-eligibility',
    sourceSection: '§4',
    content:
      'Topic: Who can edit choices between CAP rounds\n' +
      'Between CAP rounds there is usually a limited window to modify the option form — but only for students who chose Float or Slide in the previous round. A student who chose Freeze cannot edit choices between rounds, because Freeze already exited them from CAP. A floating or sliding student can add choices, remove choices, or reorder the list during this window.',
  },
  {
    topicLabel: 'betterment-mechanics',
    sourceSection: '§4',
    content:
      'Topic: How between-rounds edits interact with betterment (float/slide upgrades)\n' +
      "When a floating or sliding student edits their option form between rounds, the point of the edit is betterment: new colleges/branches can be added ranked above the student's currently allotted choice, since that's what gives the system a chance to upgrade them. The system will only move the student to a new seat if it finds them eligible for something ranked higher than their current allotment. Any choice added below the current allotted rank is irrelevant to that student — the current seat already outranks it, so the algorithm would never move them down to it.",
  },
];

async function embedBatch(texts: string[]): Promise<number[][]> {
  const url = `${process.env.SUPABASE_URL}/functions/v1/embed`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ texts }),
  });
  if (!res.ok) {
    throw new Error(`embed function returned ${res.status}: ${await res.text()}`);
  }
  const { embeddings } = (await res.json()) as { embeddings: number[][] };
  return embeddings;
}

function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(',')}]`;
}

async function main() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY must be set in backend/.env');
  }
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL must be set in backend/.env');
  }

  console.log(`Embedding ${CHUNKS.length} chunks via the embed edge function...`);
  const embeddings = await embedBatch(CHUNKS.map((c) => c.content));
  if (embeddings.length !== CHUNKS.length) {
    throw new Error(`Expected ${CHUNKS.length} embeddings, got ${embeddings.length}`);
  }
  for (const e of embeddings) {
    if (e.length !== 384) {
      throw new Error(`Expected 384-dim embedding, got ${e.length}`);
    }
  }
  console.log('All embeddings received, 384-dim each.');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    for (let i = 0; i < CHUNKS.length; i++) {
      const chunk = CHUNKS[i];
      await pool.query(
        `INSERT INTO rag_chunks (topic_label, source_section, content, embedding, updated_at)
         VALUES ($1, $2, $3, $4::vector, NOW())
         ON CONFLICT (topic_label) DO UPDATE SET
           source_section = EXCLUDED.source_section,
           content = EXCLUDED.content,
           embedding = EXCLUDED.embedding,
           updated_at = NOW()`,
        [chunk.topicLabel, chunk.sourceSection, chunk.content, toVectorLiteral(embeddings[i])],
      );
      console.log(`Upserted: ${chunk.topicLabel}`);
    }

    const { rows } = await pool.query('SELECT count(*)::int AS count FROM rag_chunks');
    console.log(`rag_chunks now has ${rows[0].count} rows.`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Ingestion failed:', error);
  process.exit(1);
});
