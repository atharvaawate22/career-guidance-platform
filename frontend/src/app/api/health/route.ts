import { NextResponse } from 'next/server';

/**
 * Lightweight frontend health endpoint.
 *
 * Useful for uptime monitors, load-balancer probes, and deployment
 * pipelines that want to verify the Next.js app server is responding
 * without hitting a full SSR page render. Analogous to the backend's
 * /api/v1/health route in backend/src/server.ts.
 *
 * Returns 200 + JSON so monitors can parse the body, not just the status.
 */
export const dynamic = 'force-dynamic'; // Never cached — it's a live probe.

export function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      service: 'frontend',
      timestamp: new Date().toISOString(),
    },
    { status: 200 },
  );
}
