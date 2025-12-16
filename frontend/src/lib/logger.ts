// logger aman untuk production

const isDev = process.env.NODE_ENV === 'development';

export const logger = {
  log: (...args: unknown[]) => {
    if (isDev) console.log(...args);
  },
  warn: (...args: unknown[]) => {
    if (isDev) console.warn(...args);
  },
  error: (...args: unknown[]) => {
    if (isDev) {
      console.error(...args);
    } else {
      const sanitized = args.map(arg => {
        if (arg instanceof Error) return arg.message;
        if (typeof arg === 'string') return arg.slice(0, 200);
        return '[Object]';
      });
      console.error('[Error]', ...sanitized);
    }
  },
  debug: (...args: unknown[]) => {
    if (isDev) console.debug(...args);
  }
};

export default logger;
