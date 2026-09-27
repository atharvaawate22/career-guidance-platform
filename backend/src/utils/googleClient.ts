/**
 * Lazily loads the `googleapis` client on first use instead of at startup.
 *
 * `googleapis` is by far the heaviest dependency in the backend (~196 MB,
 * ~1,800 files; importing it took ~1.2 s of the ~3 s it takes to load the
 * whole server locally). Only two code paths need it — creating a Calendar
 * event with a Meet link and sending mail through the Gmail API — and neither
 * runs at startup. A top-level import made every process pay for it anyway:
 *
 *  - Render cold starts on a 0.1-CPU instance, where every extra second of
 *    startup is time a sleeping backend keeps a visitor waiting;
 *  - every Vitest worker, because each test file that imports src/server.ts
 *    loads the full module graph in its own process. With ~16 such files
 *    loading in parallel on a busy Windows machine, the combined file I/O
 *    pushed some workers past the 60 s hookTimeout, failing them at random.
 *
 * The promise is cached so the module is loaded once per process; a failed
 * load is not cached, so the next call retries.
 */
type GoogleApis = typeof import('googleapis')['google'];

let googlePromise: Promise<GoogleApis> | null = null;

export function loadGoogle(): Promise<GoogleApis> {
  if (!googlePromise) {
    googlePromise = import('googleapis')
      .then((mod) => mod.google)
      .catch((error) => {
        googlePromise = null;
        throw error;
      });
  }
  return googlePromise;
}
