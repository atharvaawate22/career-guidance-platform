import pino from 'pino';

const baseLogger = pino({
  level:
    process.env.LOG_LEVEL ??
    (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  ...(process.env.NODE_ENV !== 'production' &&
    process.env.NODE_ENV !== 'test' && {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true },
    },
  }),
  redact: {
    paths: [
      'req.headers.authorization',
      'req.body.password',
      'req.body.email',
      'req.body.phone',
    ],
    censor: '[Filtered]',
  },
});

type CompatLogger = Omit<typeof baseLogger, 'info' | 'warn' | 'error'> & {
  info(message: string, meta?: unknown): void;
  warn(message: string, meta?: unknown): void;
  error(message: string, meta?: unknown): void;
};

const normalizeMeta = (meta: unknown) =>
  meta instanceof Error ? { err: meta } : { meta };

const writeInfo = baseLogger.info.bind(baseLogger);
const writeWarn = baseLogger.warn.bind(baseLogger);
const writeError = baseLogger.error.bind(baseLogger);

export const pinoLogger = baseLogger;

const logger: CompatLogger = {
  ...baseLogger,
  info(message: string, meta?: unknown) {
    if (meta === undefined) writeInfo(message);
    else writeInfo(normalizeMeta(meta), message);
  },
  warn(message: string, meta?: unknown) {
    if (meta === undefined) writeWarn(message);
    else writeWarn(normalizeMeta(meta), message);
  },
  error(message: string, meta?: unknown) {
    if (meta === undefined) writeError(message);
    else writeError(normalizeMeta(meta), message);
  },
};

export default logger;
