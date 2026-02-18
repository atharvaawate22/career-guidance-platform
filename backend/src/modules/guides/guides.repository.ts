import { query } from '../../config/database';
import { Guide, GuideDownloadRequest, CreateGuideRequest } from './guides.types';

export async function getActiveGuides(): Promise<Guide[]> {
  const result = await query(
    'SELECT id, title, description, file_url, is_active, created_at FROM guides WHERE is_active = true ORDER BY created_at DESC'
  );
  return result.rows;
}

export async function getGuideById(guideId: string): Promise<Guide | null> {
  const result = await query(
    'SELECT id, title, description, file_url, is_active, created_at FROM guides WHERE id = $1',
    [guideId]
  );
  return result.rows[0] || null;
}

export async function recordDownload(downloadRequest: GuideDownloadRequest): Promise<void> {
  await query(
    'INSERT INTO guide_downloads (guide_id, name, email, percentile) VALUES ($1, $2, $3, $4)',
    [downloadRequest.guide_id, downloadRequest.name, downloadRequest.email, downloadRequest.percentile]
  );
}

export async function createGuide(guide: CreateGuideRequest): Promise<Guide> {
  const result = await query(
    'INSERT INTO guides (title, description, file_url) VALUES ($1, $2, $3) RETURNING id, title, description, file_url, is_active, created_at',
    [guide.title, guide.description, guide.file_url]
  );
  return result.rows[0];
}
