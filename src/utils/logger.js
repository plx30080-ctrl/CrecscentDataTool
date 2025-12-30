// Simple gated logger that only emits in development (Vite's import.meta.env.DEV)
// Allows easy replacement / extension (send logs to telemetry in the future)

const isDev = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV;

const noop = () => {};

const logger = {
  log: isDev ? console.log.bind(console) : noop,
  info: isDev ? console.info.bind(console) : noop,
  warn: isDev ? console.warn.bind(console) : noop,
  error: isDev ? console.error.bind(console) : noop,
  debug: isDev ? console.debug ? console.debug.bind(console) : console.log.bind(console) : noop,
};

export default logger;
