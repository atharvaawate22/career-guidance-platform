import { query } from '../../config/database';
import { Resource, CreateResourceRequest } from './resources.types';

export async function getActiveResources(category?: string): Promise<Resource[]> {
  if (category && category !== 'All') {
    const result = await query(
      'SELECT id, title, description, file_url, category, is_active, created_at FROM resources WHERE is_active = true AND category = $1 ORDER BY created_at DESC',
      [category],
    );
    return result.rows;
  }
  const result = await query(
    'SELECT id, title, description, file_url, category, is_active, created_at FROM resources WHERE is_active = true ORDER BY created_at DESC',
  );
  return result.rows;
}

export async function getResourceById(id: string): Promise<Resource | null> {
  const result = await query(
    'SELECT id, title, description, file_url, category, is_active, created_at FROM resources WHERE id = $1',
    [id],
  );
  return result.rows[0] || null;
}

export async function createResource(resource: CreateResourceRequest): Promise<Resource> {
  const result = await query(
    'INSERT INTO resources (title, description, file_url, category) VALUES ($1, $2, $3, $4) RETURNING id, title, description, file_url, category, is_active, created_at',
    [resource.title, resource.description, resource.file_url, resource.category],
  );
  return result.rows[0];
}

export async function deleteResource(id: string): Promise<boolean> {
  const result = await query('DELETE FROM resources WHERE id = $1 RETURNING id', [id]);
  return result.rowCount != null && result.rowCount > 0;
}

export async function toggleResourceActive(id: string, is_active: boolean): Promise<boolean> {
  const result = await query(
    'UPDATE resources SET is_active = $1 WHERE id = $2 RETURNING id',
    [is_active, id],
  );
  return result.rowCount != null && result.rowCount > 0;
}
