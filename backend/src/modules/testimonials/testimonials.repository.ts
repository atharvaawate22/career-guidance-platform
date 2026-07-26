import { query } from '../../config/database';
import { Testimonial, TestimonialWithEmail, CreateTestimonialRequest, UpdateTestimonialRequest } from './testimonials.types';

// Public list — deliberately never selects `email`, so it can't leak even
// if a future refactor forgets to strip it before responding.
export async function getPublicTestimonials(): Promise<Testimonial[]> {
  const result = await query(
    'SELECT id, name, rating, review_text, created_at FROM testimonials ORDER BY created_at DESC LIMIT 100',
  );
  return result.rows;
}

export async function getAllTestimonials(): Promise<TestimonialWithEmail[]> {
  const result = await query(
    'SELECT id, name, email, rating, review_text, created_at FROM testimonials ORDER BY created_at DESC',
  );
  return result.rows;
}

export async function createTestimonial(
  input: CreateTestimonialRequest,
): Promise<Testimonial> {
  const result = await query(
    'INSERT INTO testimonials (name, email, rating, review_text) VALUES ($1, $2, $3, $4) RETURNING id, name, rating, review_text, created_at',
    [input.name, input.email, input.rating, input.review_text],
  );
  return result.rows[0];
}

export async function updateTestimonial(
  id: string,
  updates: UpdateTestimonialRequest,
): Promise<Testimonial | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  if (updates.name !== undefined) { fields.push(`name = $${i++}`); values.push(updates.name); }
  if (updates.rating !== undefined) { fields.push(`rating = $${i++}`); values.push(updates.rating); }
  if (updates.review_text !== undefined) { fields.push(`review_text = $${i++}`); values.push(updates.review_text); }

  if (fields.length === 0) {
    const result = await query(
      'SELECT id, name, rating, review_text, created_at FROM testimonials WHERE id = $1',
      [id],
    );
    return result.rows[0] || null;
  }

  values.push(id);
  const result = await query(
    `UPDATE testimonials SET ${fields.join(', ')} WHERE id = $${i} RETURNING id, name, rating, review_text, created_at`,
    values,
  );
  return result.rows[0] || null;
}

export async function deleteTestimonial(id: string): Promise<boolean> {
  const result = await query('DELETE FROM testimonials WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
}
