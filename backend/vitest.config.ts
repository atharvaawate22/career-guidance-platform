import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globals: true,
    clearMocks: true,
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
    },
  },
});
