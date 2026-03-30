const getTimestamp = () => new Date().toISOString();

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
  },
};

export default logger;
