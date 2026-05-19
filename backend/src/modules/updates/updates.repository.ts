import { query } from '../../config/database';
import { Update } from './updates.types';

export class UpdatesRepository {
  async getAllUpdates(): Promise<Update[]> {
    const result = await query(
      'SELECT id, title, content, published_date, edited_at FROM updates ORDER BY published_date DESC',
    );
    return result.rows;
  }

  async createUpdate(update: Omit<Update, 'id'>): Promise<Update> {
    // If a custom published_date is provided, use it; otherwise default to NOW()
    if (update.published_date && update.published_date.trim() !== '') {
      const result = await query(
        'INSERT INTO updates (id, title, content, published_date) VALUES (gen_random_uuid(), $1, $2, $3) RETURNING id, title, content, published_date, edited_at',
        [update.title, update.content, update.published_date],
      );
      return result.rows[0];
    }

    const result = await query(
      'INSERT INTO updates (id, title, content, published_date) VALUES (gen_random_uuid(), $1, $2, NOW()) RETURNING id, title, content, published_date, edited_at',
      [update.title, update.content],
    );
    return result.rows[0];
  }

  async updateUpdate(
    id: string,
    update: Partial<Omit<Update, 'id'>>,
  ): Promise<Update | null | 'NO_FIELDS'> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramCount = 1;

    if (update.title !== undefined) {
      fields.push(`title = $${paramCount++}`);
      values.push(update.title);
    }
    if (update.content !== undefined) {
      fields.push(`content = $${paramCount++}`);
      values.push(update.content);
    }
    if (update.published_date !== undefined) {
      fields.push(`published_date = $${paramCount++}`);
      values.push(update.published_date);
    }

    if (fields.length === 0) {
      // Caller sent a valid request body but with no recognised update fields.
      // Return a sentinel so the controller can distinguish "id not found"
      // (null → 404) from "nothing to update" (this → 400).
      return 'NO_FIELDS';
    }

    // Always set edited_at when updating
    fields.push(`edited_at = NOW()`);

    values.push(id);
    const result = await query(
      `UPDATE updates SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING id, title, content, published_date, edited_at`,
      values,
    );
    return result.rows[0] || null;
  }

  async deleteUpdate(id: string): Promise<boolean> {
    const result = await query(
      'DELETE FROM updates WHERE id = $1 RETURNING id',
      [id],
    );
    return result.rows.length > 0;
  }
}
