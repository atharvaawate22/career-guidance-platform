import { z } from 'zod';

export const createResourceSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  description: z.string().trim().min(1, 'Description is required').max(1000),
  file_url: z.string().trim().url('file_url must be a valid URL'),
  category: z.string().trim().min(1, 'Category is required').max(100),
});
