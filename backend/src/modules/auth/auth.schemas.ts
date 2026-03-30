import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().email('Please provide a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .max(200, 'Password is too long'),
});
