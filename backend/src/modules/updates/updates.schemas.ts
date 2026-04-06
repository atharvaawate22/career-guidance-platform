import { z } from 'zod';

export const createUpdateSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
});

export const updateUpdateSchema = z
  .object({
    title: z.string().min(1, 'Title must not be empty').optional(),
    content: z.string().min(1, 'Content must not be empty').optional(),
    published_date: z.string().optional(),
  })
  .refine(
    (data) =>
      data.title !== undefined ||
      data.content !== undefined ||
      data.published_date !== undefined,
    { message: 'At least one field (title, content, or published_date) is required' },
  );
