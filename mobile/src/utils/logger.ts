export const logger = {
  log: (...args: any[]) => {
    if (__DEV__) {
      console.log(...args);
    }
  },
  warn: (...args: any[]) => {
    if (__DEV__) {
      console.warn(...args);
    }
  },
  error: (...args: any[]) => {
    // Errors might be logged in production, but we can also route to an error tracker like Sentry here
    console.error(...args);
  },
  info: (...args: any[]) => {
    if (__DEV__) {
      console.info(...args);
    }
  }
};
