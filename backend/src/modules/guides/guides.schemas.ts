import { z } from 'zod';

export const guideDownloadSchema = z.object({
  guide_id: z.string().trim().uuid('guide_id must be a valid UUID'),
});
