import winston from 'winston';

const isProduction = process.env.NODE_ENV === 'production';

const devFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.printf(
    ({ level, message, timestamp, stack }) => `${timestamp} ${level}: ${stack || message}`,
  ),
);

export const logger = winston.createLogger({
  level: isProduction ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    // Unwraps Error instances so stack traces survive into the output.
    winston.format.errors({ stack: true }),
    isProduction ? winston.format.json() : devFormat,
  ),
  transports: [new winston.transports.Console()],
});

export default logger;
