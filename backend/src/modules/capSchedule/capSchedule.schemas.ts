import { z } from 'zod';

const statusEnum = z.enum(['upcoming', 'today', 'completed', 'postponed']);

/** '' from a cleared form field is treated the same as omitting the value. */
const emptyToNull = (v: unknown) => (v === '' ? null : v);

const dateField = z.preprocess(
  emptyToNull,
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .nullable(),
).optional();

const urlField = z.preprocess(
  emptyToNull,
  z.string().trim().url('result_url must be a valid URL').max(500).nullable(),
).optional();

const noteField = (max: number) =>
  z.preprocess(emptyToNull, z.string().trim().max(max).nullable()).optional();

export const createCapScheduleEventSchema = z.object({
  academic_year: z
    .number({ required_error: 'academic_year is required' })
    .int()
    .min(2020)
    .max(2100),
  round_label: z
    .string({ required_error: 'round_label is required' })
    .trim()
    .min(1, 'round_label is required')
    .max(100),
  event_label: z
    .string({ required_error: 'event_label is required' })
    .trim()
    .min(1, 'event_label is required')
    .max(200),
  display_order: z.number().int().min(0).optional(),
  planned_date: dateField,
  revised_date: dateField,
  status: statusEnum.optional(),
  result_url: urlField,
  result_note: noteField(500),
  notes: noteField(1000),
});

export const updateCapScheduleEventSchema = z
  .object({
    round_label: z.string().trim().min(1, 'round_label cannot be empty').max(100).optional(),
    event_label: z.string().trim().min(1, 'event_label cannot be empty').max(200).optional(),
    display_order: z.number().int().min(0).optional(),
    planned_date: dateField,
    revised_date: dateField,
    status: statusEnum.optional(),
    result_url: urlField,
    result_note: noteField(500),
    notes: noteField(1000),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  });

export const capScheduleYearQuerySchema = z.object({
  academic_year: z.coerce.number().int().min(2020).max(2100).optional(),
});
