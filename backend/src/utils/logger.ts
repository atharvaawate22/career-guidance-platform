const getTimestamp = () => new Date().toISOString();

const logger = {
  info(message: string) {
    console.log(`[${getTimestamp()}] [INFO] ${message}`);
  },
  warn(message: string) {
    console.warn(`[${getTimestamp()}] [WARN] ${message}`);
  },
  error(message: string, meta?: unknown) {
    if (meta) {
      console.error(`[${getTimestamp()}] [ERROR] ${message}`, meta);
    } else {
      console.error(`[${getTimestamp()}] [ERROR] ${message}`);
    }
  },
};

export default logger;
