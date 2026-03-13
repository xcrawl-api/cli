import { ValidationError } from '../core/errors';

export function assertHttpUrl(value: string): void {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new ValidationError(
        `Unsupported URL protocol: ${url.protocol}`,
        'Use a URL that starts with http:// or https://.'
      );
    }
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }

    throw new ValidationError(`Invalid URL: ${value}`, 'Please verify the URL format.', error);
  }
}

export function parseHeaders(value: string | undefined): Record<string, string> | undefined {
  if (!value) {
    return undefined;
  }

  const result: Record<string, string> = {};
  const segments = value.split(',').map((item) => item.trim()).filter(Boolean);

  for (const segment of segments) {
    const [rawKey, ...rawValue] = segment.split(':');
    const key = rawKey?.trim();
    const headerValue = rawValue.join(':').trim();

    if (!key || !headerValue) {
      throw new ValidationError(
        `Invalid headers argument: ${segment}`,
        'Use the format "Key:Value,Key2:Value2".'
      );
    }

    result[key] = headerValue;
  }

  return result;
}

export function parsePositiveInt(input: string | undefined, fieldName: string): number | undefined {
  if (!input) {
    return undefined;
  }

  const value = Number.parseInt(input, 10);
  if (!Number.isFinite(value) || value <= 0) {
    throw new ValidationError(`${fieldName} must be a positive integer.`, `Pass an integer greater than 0 for ${fieldName}.`);
  }

  return value;
}
