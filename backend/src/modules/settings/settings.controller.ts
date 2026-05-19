import { Request, Response, NextFunction } from 'express';
import * as settingsRepository from './settings.repository';
import { z } from 'zod';

// ── Validation schemas for each settings key ──────────────────────────────────

const bookingSlotsSchema = z.object({
  enabled: z.boolean(),
  slot_duration_minutes: z.number().int().min(15).max(120).optional().default(30),
  slots: z.array(z.string().regex(/^\d{2}:\d{2}$/)).min(1),
  working_days: z.array(z.number().int().min(0).max(6)).min(1),
  special_open_dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).default([]),
  special_closed_dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).default([]),
});

const announcementSchema = z.object({
  enabled: z.boolean(),
  text: z.string().max(500).default(''),
  type: z.enum(['info', 'warning', 'success']).default('info'),
});

const contactInfoSchema = z.object({
  email: z.string().max(200).default(''),
  phone: z.string().max(30).default(''),
});

const SETTINGS_SCHEMAS: Record<string, z.ZodSchema> = {
  booking_slots: bookingSlotsSchema,
  announcement: announcementSchema,
  contact_info: contactInfoSchema,
};

const ALLOWED_KEYS = Object.keys(SETTINGS_SCHEMAS);

// ── Public endpoints ──────────────────────────────────────────────────────────

export async function getPublicBookingSlots(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const setting = await settingsRepository.getSetting('booking_slots');
    res.json({
      success: true,
      data: setting?.value ?? {
        enabled: true,
        slots: ['10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30'],
        working_days: [1, 2, 3, 4, 5],
        special_open_dates: [],
        special_closed_dates: [],
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getPublicAnnouncement(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const setting = await settingsRepository.getSetting('announcement');
    res.json({
      success: true,
      data: setting?.value ?? { enabled: false, text: '', type: 'info' },
    });
  } catch (error) {
    next(error);
  }
}

// ── Admin endpoints ───────────────────────────────────────────────────────────

export async function getAllSettings(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const settings = await settingsRepository.getAllSettings();
    const settingsMap: Record<string, unknown> = {};
    for (const s of settings) {
      settingsMap[s.key] = s.value;
    }
    res.json({ success: true, data: settingsMap });
  } catch (error) {
    next(error);
  }
}

export async function updateSetting(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const key = String(req.params.key);

    if (!ALLOWED_KEYS.includes(key)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `Invalid setting key. Allowed: ${ALLOWED_KEYS.join(', ')}`,
        },
      });
      return;
    }

    const schema = SETTINGS_SCHEMAS[key] as z.ZodSchema;
    const parse = schema.safeParse(req.body);

    if (!parse.success) {
      const first = parse.error.issues[0];
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: first?.message ?? 'Invalid settings value',
          details: parse.error.issues.map((i: z.ZodIssue) => ({
            path: i.path.join('.'),
            message: i.message,
          })),
        },
      });
      return;
    }

    const updated = await settingsRepository.upsertSetting(
      key,
      parse.data as Record<string, unknown>,
    );

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

// ── Analytics endpoint ────────────────────────────────────────────────────────

export async function getAnalytics(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { query: dbQuery } = await import('../../config/database');

    // Run all analytics queries in parallel
    const [
      bookingStatusResult,
      bookingsPerDayResult,
      totalCountsResult,
      recentDownloadsResult,
    ] = await Promise.all([
      // Booking counts by status
      dbQuery(`
        SELECT booking_status, COUNT(*)::int as count
        FROM bookings
        GROUP BY booking_status
      `),
      // Bookings per day (last 14 days)
      dbQuery(`
        SELECT
          DATE(meeting_time AT TIME ZONE 'Asia/Kolkata') as date,
          COUNT(*)::int as count
        FROM bookings
        WHERE meeting_time >= NOW() - INTERVAL '14 days'
        GROUP BY DATE(meeting_time AT TIME ZONE 'Asia/Kolkata')
        ORDER BY date ASC
      `),
      // Total entity counts
      dbQuery(`
        SELECT
          (SELECT COUNT(*)::int FROM updates) as total_updates,
          (SELECT COUNT(*)::int FROM bookings) as total_bookings,
          (SELECT COUNT(*)::int FROM bookings WHERE booking_status IN ('scheduled', 'pending', 'confirmed') AND meeting_time > NOW()) as pending_bookings,
          (SELECT COUNT(*)::int FROM faqs WHERE is_active = true) as active_faqs,
          (SELECT COUNT(*)::int FROM faqs) as total_faqs,
          (SELECT COUNT(*)::int FROM resources WHERE is_active = true) as active_resources,
          (SELECT COUNT(*)::int FROM guides WHERE is_active = true) as active_guides,
          (SELECT COUNT(*)::int FROM guide_downloads) as total_downloads
      `),
      // Guide downloads in last 7 days
      dbQuery(`
        SELECT COUNT(*)::int as recent_downloads
        FROM guide_downloads
        WHERE downloaded_at >= NOW() - INTERVAL '7 days'
      `),
    ]);

    res.json({
      success: true,
      data: {
        booking_status_breakdown: bookingStatusResult.rows,
        bookings_per_day: bookingsPerDayResult.rows,
        counts: totalCountsResult.rows[0],
        recent_downloads: recentDownloadsResult.rows[0]?.recent_downloads ?? 0,
      },
    });
  } catch (error) {
    next(error);
  }
}
