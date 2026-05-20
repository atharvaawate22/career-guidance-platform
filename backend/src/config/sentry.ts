import dotenv from 'dotenv';
dotenv.config();

import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

export function initSentry() {
  if (!process.env.SENTRY_DSN) return;

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV ?? 'development',
    integrations: [
      Sentry.expressIntegration(),
      nodeProfilingIntegration(),
    ],
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    profilesSampleRate: 0.1,
    beforeSend(event) {
      // Scrub sensitive fields before sending to Sentry.
      if (event.request?.data && typeof event.request.data === 'object') {
        const data = event.request.data as Record<string, unknown>;
        ['password', 'email', 'phone', 'ADMIN_PASSWORD'].forEach((key) => {
          if (data[key]) data[key] = '[Filtered]';
        });
      }
      return event;
    },
  });
}

export { Sentry };
