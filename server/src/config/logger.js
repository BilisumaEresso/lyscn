const pino = require('pino');

const isProduction = process.env.NODE_ENV === 'production';

const logger = pino({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),

  // Human-readable output in development; raw JSON in production for log drains
  ...(!isProduction && {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'HH:MM:ss.l', ignore: 'pid,hostname' },
    },
  }),

  // Consistent field names across all log entries
  base: { service: 'layoscan-api' },

  // Redact sensitive fields if they appear in logged objects
  redact: ['req.headers.authorization', 'req.headers.cookie'],
});

module.exports = logger;
