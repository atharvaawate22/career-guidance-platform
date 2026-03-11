import { query } from '../../config/database';
import {
  Guide,
  GuideDownloadRequest,
  CreateGuideRequest,
} from './guides.types';

export async function getActiveGuides(): Promise<Guide[]> {
  const result = await query(
    'SELECT id, title, description, file_url, is_active, created_at FROM guides WHERE is_active = true ORDER BY created_at DESC',
  );
  return result.rows;
}

export async function getGuideById(guideId: string): Promise<Guide | null> {
  const result = await query(
    'SELECT id, title, description, file_url, is_active, created_at FROM guides WHERE id = $1',
    [guideId],
  );
  return result.rows[0] || null;
}

export async function recordDownload(
  downloadRequest: GuideDownloadRequest,
): Promise<void> {
  await query(
    'INSERT INTO guide_downloads (guide_id, name, email, percentile) VALUES ($1, $2, $3, $4)',
    [
      downloadRequest.guide_id,
      downloadRequest.name,
      downloadRequest.email,
      downloadRequest.percentile,
    ],
  );
}

export async function createGuide(guide: CreateGuideRequest): Promise<Guide> {
  const result = await query(
    'INSERT INTO guides (title, description, file_url) VALUES ($1, $2, $3) RETURNING id, title, description, file_url, is_active, created_at',
    [guide.title, guide.description, guide.file_url],
  );
  return result.rows[0];
}

export async function getAllGuides(): Promise<Guide[]> {
  const result = await query(
    'SELECT id, title, description, file_url, is_active, created_at FROM guides ORDER BY created_at DESC',
  );
  return result.rows;
}

export async function deleteGuide(guideId: string): Promise<boolean> {
  const result = await query('DELETE FROM guides WHERE id = $1', [guideId]);
  return (result.rowCount ?? 0) > 0;
}

export async function toggleGuide(
  guideId: string,
  isActive: boolean,
): Promise<Guide | null> {
  const result = await query(
    'UPDATE guides SET is_active = $1 WHERE id = $2 RETURNING id, title, description, file_url, is_active, created_at',
    [isActive, guideId],
  );
  return result.rows[0] || null;
}

export async function getDownloads(): Promise<object[]> {
  const result = await query(
    `SELECT gd.id, gd.name, gd.email, gd.percentile, gd.downloaded_at, g.title AS guide_title
     FROM guide_downloads gd
     JOIN guides g ON g.id = gd.guide_id
     ORDER BY gd.downloaded_at DESC`,
  );
  return result.rows;
}
