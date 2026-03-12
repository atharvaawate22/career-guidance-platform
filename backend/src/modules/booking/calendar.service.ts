import logger from '../../utils/logger';
import { google } from 'googleapis';

interface CalendarEvent {
  summary: string;
  description: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  attendees: Array<{ email: string }>;
  conferenceData?: {
    createRequest: {
      requestId: string;
      conferenceSolutionKey: {
        type: string;
      };
    };
  };
}

/**
 * Generate a Google Meet link for a consultation booking
 *
 * Uses Google Calendar API with OAuth2 to create events with Google Meet links
 * Falls back to mock links if credentials are not configured
 *
 * Required env vars:
 * - GOOGLE_CLIENT_ID
 * - GOOGLE_CLIENT_SECRET
 * - GOOGLE_REDIRECT_URI
 * - GOOGLE_REFRESH_TOKEN
 * - GOOGLE_CALENDAR_ID
 */
export async function generateMeetLink(
  studentName: string,
  email: string,
  meetingTime: Date,
  percentile?: number,
  category?: string,
  branchPreference?: string,
): Promise<string> {
  try {
    // Check if Google Calendar OAuth2 credentials are configured
    const hasCredentials =
      process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_REFRESH_TOKEN;

    if (!hasCredentials) {
      logger.info('Google Calendar API not configured, using mock meet link');
      // Generate mock meet link for development
      const meetingId = generateMockMeetingId();
      return `https://meet.google.com/${meetingId}`;
    }

    // Use Google Calendar API to create event with Meet link
    // Format datetime as local IST (no Z suffix) so timeZone field is authoritative
    const toISTLocal = (date: Date) => {
      const offsetMs = 5.5 * 60 * 60 * 1000; // UTC+5:30
      return new Date(date.getTime() + offsetMs).toISOString().slice(0, 19); // YYYY-MM-DDTHH:MM:SS
    };

    const event: CalendarEvent = {
      summary: `Career Guidance Consultation - ${studentName}`,
      description: `MHT CET Admission Guidance Consultation\n\nStudent Details:\n• Name: ${studentName}\n• Percentile: ${percentile ?? 'N/A'}\n• Category: ${category ?? 'N/A'}\n• Branch Preference: ${branchPreference ?? 'N/A'}\n\nPlease join at the scheduled time using the Google Meet link.`,
      start: {
        dateTime: toISTLocal(meetingTime), // e.g. 2026-03-12T10:00:00 (no Z)
        timeZone: 'Asia/Kolkata',
      },
      end: {
        dateTime: toISTLocal(new Date(meetingTime.getTime() + 30 * 60000)),
        timeZone: 'Asia/Kolkata',
      },
      attendees: [{ email }],
      conferenceData: {
        createRequest: {
          requestId: `booking-${Date.now()}`,
          conferenceSolutionKey: {
            type: 'hangoutsMeet',
          },
        },
      },
    };

    const response = await createCalendarEvent(event);

    // hangoutLink is the top-level shorthand; fall back to conferenceData entryPoints
    const meetLink =
      response.hangoutLink ||
      response.conferenceData?.entryPoints?.find(
        (ep) => ep.entryPointType === 'video',
      )?.uri;

    if (!meetLink) {
      logger.warn(
        `Calendar event created but no Meet link found in response: ${JSON.stringify({ hangoutLink: response.hangoutLink, conferenceData: response.conferenceData })}`,
      );
      throw new Error('Failed to generate hangout link');
    }
    return meetLink;
  } catch (error) {
    logger.warn(
      `Google Calendar API failed, using mock meet link: ${(error as Error)?.message}`,
    );
    const meetingId = generateMockMeetingId();
    return `https://meet.google.com/${meetingId}`;
  }
}

/**
 * Generate a mock meeting ID for development
 */
function generateMockMeetingId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  let result = '';
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 4; j++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    if (i < 2) result += '-';
  }
  return result;
}

/**
 * Create a Google Calendar event with Meet link
 */
async function createCalendarEvent(event: CalendarEvent) {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  );
  auth.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  });
  const calendar = google.calendar({ version: 'v3', auth });
  const insertPromise = calendar.events.insert({
    calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
    conferenceDataVersion: 1,
    requestBody: event,
  });
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(
      () => reject(new Error('Calendar API timeout after 20s')),
      20000,
    ),
  );
  const response = await Promise.race([insertPromise, timeoutPromise]);
  return response.data;
}
