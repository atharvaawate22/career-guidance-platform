import { z } from 'zod';

export const guideDownloadSchema = z.object({
  guide_id: z.string().trim().uuid('guide_id must be a valid UUID'),
});

export const createGuideSchema = z.object({
  title: z
    .string({ required_error: 'Title is required' })
    .trim()
    .min(1, 'Title cannot be empty')
    .max(300, 'Title must be under 300 characters'),
  description: z
    .string({ required_error: 'Description is required' })
    .trim()
    .min(1, 'Description cannot be empty')
    .max(2000, 'Description must be under 2,000 characters'),
  file_url: z
    .string({ required_error: 'file_url is required' })
    .trim()
    .url('file_url must be a valid URL')
    .max(1000, 'file_url must be under 1,000 characters'),
});
