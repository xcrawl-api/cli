export interface CliErrorShape {
  code: string;
  message: string;
  hint?: string;
  cause?: unknown;
}

export class CliError extends Error implements CliErrorShape {
  code: string;
  hint?: string;
  cause?: unknown;

  constructor(code: string, message: string, hint?: string, cause?: unknown) {
    super(message);
    this.code = code;
    this.hint = hint;
    this.cause = cause;
  }
}

export class ConfigError extends CliError {
  constructor(message: string, hint?: string, cause?: unknown) {
    super('CONFIG_ERROR', message, hint, cause);
  }
}

export class AuthError extends CliError {
  constructor(message: string, hint?: string, cause?: unknown) {
    super('AUTH_ERROR', message, hint, cause);
  }
}

export class ApiError extends CliError {
  status?: number;

  constructor(message: string, hint?: string, status?: number, cause?: unknown) {
    super('API_ERROR', message, hint, cause);
    this.status = status;
  }
}

export class ValidationError extends CliError {
  constructor(message: string, hint?: string, cause?: unknown) {
    super('VALIDATION_ERROR', message, hint, cause);
  }
}

export class OutputError extends CliError {
  constructor(message: string, hint?: string, cause?: unknown) {
    super('OUTPUT_ERROR', message, hint, cause);
  }
}

export class NetworkError extends CliError {
  constructor(message: string, hint?: string, cause?: unknown) {
    super('NETWORK_ERROR', message, hint, cause);
  }
}

export function toCliError(error: unknown): CliError {
  if (error instanceof CliError) {
    return error;
  }

  if (error instanceof Error) {
    return new CliError('UNKNOWN_ERROR', error.message, 'Please retry, or run with --debug for more details.', error);
  }

  return new CliError('UNKNOWN_ERROR', 'An unknown error occurred.', 'Please retry, or verify your input arguments.', error);
}

export function formatErrorForUser(error: unknown): string {
  const cliError = toCliError(error);
  const hintText = cliError.hint ? `\nHint: ${cliError.hint}` : '';
  return `[${cliError.code}] ${cliError.message}${hintText}`;
}
