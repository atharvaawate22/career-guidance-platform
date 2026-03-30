const getTimestamp = () => new Date().toISOString();
const ERROR_WEBHOOK_URL = process.env.ERROR_WEBHOOK_URL?.trim();

const reportErrorWebhook = async (message: string, meta?: unknown) => {
  if (!ERROR_WEBHOOK_URL || process.env.DISABLE_ERROR_WEBHOOK === 'true') {
    return;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    const response = await fetch(ERROR_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: 'backend',
        level: 'error',
        timestamp: getTimestamp(),
        environment: process.env.NODE_ENV || 'unknown',
        message,
        meta,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.warn(
        `[${getTimestamp()}] [WARN] Failed to send error webhook (${response.status})`,
      );
    }
  } catch {
    // Keep logger non-blocking and never throw from error reporting.
  }
};

const formatMeta = (meta?: unknown): string => {
  if (meta === undefined) return '';

  try {
    return ` ${JSON.stringify(meta)}`;
  } catch {
    return ' [meta_unserializable]';
  }
};

const logger = {
  info(message: string, meta?: unknown) {
    console.log(`[${getTimestamp()}] [INFO] ${message}${formatMeta(meta)}`);
  },
  warn(message: string, meta?: unknown) {
    console.warn(`[${getTimestamp()}] [WARN] ${message}${formatMeta(meta)}`);
  },
  error(message: string, meta?: unknown) {
    console.error(`[${getTimestamp()}] [ERROR] ${message}${formatMeta(meta)}`);
    void reportErrorWebhook(message, meta);
  },
};

export default logger;
