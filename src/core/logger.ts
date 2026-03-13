import chalk from 'chalk';

export interface Logger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
  success(message: string): void;
  debug(message: string): void;
}

interface LoggerOptions {
  stdout?: NodeJS.WritableStream;
  stderr?: NodeJS.WritableStream;
  debug?: boolean;
}

export function createLogger(options: LoggerOptions = {}): Logger {
  const stdout = options.stdout ?? process.stdout;
  const stderr = options.stderr ?? process.stderr;
  const debugEnabled = options.debug ?? false;

  return {
    info(message: string): void {
      stdout.write(`${message}\n`);
    },
    warn(message: string): void {
      stderr.write(`${chalk.yellow('WARN')} ${message}\n`);
    },
    error(message: string): void {
      stderr.write(`${chalk.red('ERROR')} ${message}\n`);
    },
    success(message: string): void {
      stdout.write(`${chalk.green('OK')} ${message}\n`);
    },
    debug(message: string): void {
      if (debugEnabled) {
        stderr.write(`${chalk.gray('DEBUG')} ${message}\n`);
      }
    }
  };
}
