/**
 * Logger condicional — só emite em desenvolvimento.
 * Em produção, suprime console.log/info/debug; mantém warn/error.
 *
 * Uso:
 *   import { logger } from '@/lib/logger';
 *   logger.log('debug info', data);  // só aparece em dev
 *   logger.warn('algo estranho');     // sempre aparece
 *   logger.error('falha real');       // sempre aparece
 */

const isDev = import.meta.env.DEV;

type LogFn = (...args: unknown[]) => void;
const noop: LogFn = () => {};

export const logger = {
  log: isDev ? console.log.bind(console) : noop,
  info: isDev ? console.info.bind(console) : noop,
  debug: isDev ? console.debug.bind(console) : noop,
  warn: console.warn.bind(console),
  error: console.error.bind(console),
} as const;
