import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globals: true,
    clearMocks: true,
    // Must run before any test file imports src/server.ts, since that pulls in
    // config/sentry.ts -> dotenv.config(). See tests/setup.ts.
    setupFiles: ['tests/setup.ts'],
    // Importing src/server.ts pulls in the whole route tree, and v8 coverage
    // instrumentation makes that materially slower. api.smoke.test.ts pinned
    // its own 30s beforeAll timeout, which passed on a plain run and
    // intermittently blew under --coverage — the file failed and its two tests
    // were reported as skipped. Set once here so every hook gets the same
    // headroom rather than each file guessing.
    hookTimeout: 60_000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      // Exclude pure type declarations and entry/bootstrap code that can only be
      // exercised by a live DB/network, which the unit suite does not provide.
      exclude: [
        'src/**/*.types.ts',
        'src/types/**',
        'src/server.ts',
        'src/config/seed.ts',
        'src/config/sentry.ts',
      ],
      /**
       * A ratchet, not a target. Set just below the measured values at the time
       * of writing (60.67 / 72.67 / 54.54 / 60.67, after admin/capSchedule/faqs/
       * guides/resources/settings/testimonials/updates route tests were added)
       * so the build fails on a regression without failing today, and can be
       * raised as coverage grows.
       *
       * Branch coverage rose in absolute terms but fell as a share of the
       * total (75.4% -> 72.67%) even though every new test file only adds
       * coverage: the previously-untested modules' repository/service layers
       * were already counted in the denominator (v8's default `all: true`
       * measures every file matching `include`, imported or not), and the new
       * route-level tests mock the repository boundary — same pattern as
       * admin.bookings.test.ts — so they exercise controller/schema branches
       * without touching the conditional SQL-building branches one layer
       * down. Function coverage is lower than branch/statement coverage for
       * the same reason: most repository functions are thin SQL wrappers that
       * only a live database would exercise.
       */
      thresholds: {
        statements: 60,
        branches: 72,
        functions: 54,
        lines: 60,
      },
    },
  },
});
