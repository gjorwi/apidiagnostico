import { pino } from 'pino';
import { env } from './env.js';

export const logger = pino({
  level: process.env.LOG_LEVEL || (env.nodeEnv === 'test' ? 'silent' : 'info'),
  base: undefined,
  timestamp: pino.stdTimeFunctions.isoTime,
});
