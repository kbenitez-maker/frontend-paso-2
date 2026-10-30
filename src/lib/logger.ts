import { createLogger, format, transports } from '@lafise/onyx-logger';

const SERVICE = 'dxb-portal-account-request';

// eslint-disable-next-line turbo/no-undeclared-env-vars
const isProduction = process.env.NODE_ENV === 'production';

/**
 * Production writes one JSON object per line to stdout: the container ships
 * stdout to CloudWatch, and Logs Insights indexes every field.
 */
const productionFormat = format.combine(
  format.errors({ stack: true }),
  format.timestamp(),
  format.json(),
);

/** Locally, a readable line that still shows the event fields. */
const developmentFormat = format.combine(
  format.errors({ stack: true }),
  format.timestamp({ format: 'HH:mm:ss.SSS' }),
  format.printf((info) => {
    const {
      timestamp,
      level,
      message,
      stack,
      service: _service,
      ...fields
    } = info;
    const details =
      Object.keys(fields).length > 0 ? JSON.stringify(fields) : '';
    const trace = typeof stack === 'string' ? `\n${stack}` : '';
    return `${String(timestamp)} ${level} ${String(message)} ${details}${trace}`;
  }),
);

/** No log files: the container filesystem is not writable. */
const logger = createLogger({
  enableFileLogging: false,
  defaultMeta: { service: SERVICE },
  transports: [
    new transports.Console({
      format: isProduction ? productionFormat : developmentFormat,
    }),
  ],
});

export { logger };
