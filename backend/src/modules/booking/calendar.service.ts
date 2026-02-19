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
    const event: CalendarEvent = {
      summary: `Career Guidance Consultation - ${studentName}`,
      description: `MHT CET admission guidance consultation\n\nStudent Details:\n- Name: ${studentName}\n- Percentile: ${percentile ?? 'N/A'}\n- Category: ${category ?? 'N/A'}\n- Branch Preference: ${branchPreference ?? 'N/A'}`,
      start: {
        dateTime: meetingTime.toISOString(),
        timeZone: 'Asia/Kolkata',
      },
      end: {
        dateTime: new Date(meetingTime.getTime() + 30 * 60000).toISOString(), // 30 min duration
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
    if (!response.hangoutLink) {
      throw new Error('Failed to generate hangout link');
    }
    return response.hangoutLink;
  } catch (error) {
    logger.error('Failed to generate meet link', error);
    throw new Error('Failed to generate Google Meet link');
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
  const response = await calendar.events.insert({
    calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
    conferenceDataVersion: 1,
    requestBody: event,
  });
  return response.data;
}
