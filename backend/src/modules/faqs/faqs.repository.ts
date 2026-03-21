import { query } from '../../config/database';
import { Faq, CreateFaqRequest, UpdateFaqRequest } from './faqs.types';

export async function getActiveFaqs(): Promise<Faq[]> {
  const result = await query(
    `SELECT id, question, answer, display_order, is_active, created_at
     FROM faqs
     WHERE is_active = true
     ORDER BY display_order ASC, created_at ASC`,
  );
  return result.rows;
}

export async function getAllFaqs(): Promise<Faq[]> {
  const result = await query(
    `SELECT id, question, answer, display_order, is_active, created_at
     FROM faqs
     ORDER BY display_order ASC, created_at ASC`,
  );
  return result.rows;
}

export async function createFaq(faq: CreateFaqRequest): Promise<Faq> {
  const result = await query(
    `INSERT INTO faqs (question, answer, display_order)
     VALUES ($1, $2, $3)
     RETURNING id, question, answer, display_order, is_active, created_at`,
    [faq.question, faq.answer, faq.display_order ?? 0],
  );
  return result.rows[0];
}

export async function updateFaq(
  id: string,
  faq: UpdateFaqRequest,
): Promise<Faq | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let paramCount = 1;

  if (faq.question !== undefined) {
    fields.push(`question = $${paramCount++}`);
    values.push(faq.question);
  }

  if (faq.answer !== undefined) {
    fields.push(`answer = $${paramCount++}`);
    values.push(faq.answer);
  }

  if (faq.display_order !== undefined) {
    fields.push(`display_order = $${paramCount++}`);
    values.push(faq.display_order);
  }

  if (fields.length === 0) {
    const existing = await query(
      `SELECT id, question, answer, display_order, is_active, created_at
       FROM faqs
       WHERE id = $1`,
      [id],
    );
    return existing.rows[0] || null;
  }

  values.push(id);

  const result = await query(
    `UPDATE faqs
     SET ${fields.join(', ')}
     WHERE id = $${paramCount}
     RETURNING id, question, answer, display_order, is_active, created_at`,
    values,
  );
  return result.rows[0] || null;
}

export async function deleteFaq(id: string): Promise<boolean> {
  const result = await query('DELETE FROM faqs WHERE id = $1 RETURNING id', [
    id,
  ]);
  return result.rowCount != null && result.rowCount > 0;
}

export async function toggleFaqActive(
  id: string,
  is_active: boolean,
): Promise<boolean> {
  const result = await query(
    'UPDATE faqs SET is_active = $1 WHERE id = $2 RETURNING id',
    [is_active, id],
  );
  return result.rowCount != null && result.rowCount > 0;
}
