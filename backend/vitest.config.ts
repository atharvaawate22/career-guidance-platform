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
       * of writing (43.25 / 76.63 / 28.47 / 43.25) so the build fails on a
       * regression without failing today, and can be raised as coverage grows.
       *
       * Function coverage is much lower than branch coverage because most
       * repository functions are thin SQL wrappers that only a live database
       * would exercise; the logic that decides anything — the SQL condition
       * builders, the query schemas, the predictor tiering, the chatbot router
       * — is what the suite actually covers.
       */
      thresholds: {
        statements: 42,
        branches: 74,
        functions: 27,
        lines: 42,
      },
    },
  },
});
